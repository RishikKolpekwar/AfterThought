import { callAI, ChatMessage } from "@/lib/ai-client";
import { DEFAULT_SKILLS_MD } from "@/lib/agent-config";

export type AgentTurnInput = {
  matchId: string;
  apiToken: string;
  model: string;
  apiKey: string;
  skillsMd?: string;
  supabaseUrl?: string;
  anonKey?: string;
};

// ---------------------------------------------------------------------------
// Turn memory – persists across turns within a match so the AI can recall
// what happened previously (like the OpenClaw / chat approach).
// ---------------------------------------------------------------------------

type TurnRecord = {
  turn: number;
  stateSummary: string;
  movesPlanned: string;
  moveResults: string;
};

type MatchMemory = {
  history: ChatMessage[];
  turns: TurnRecord[];
};

const MAX_HISTORY_TURNS = 8;

declare global {
  // eslint-disable-next-line no-var
  var __moltArenaTurnMemory: Map<string, MatchMemory> | undefined;
}

function memoryStore(): Map<string, MatchMemory> {
  if (!global.__moltArenaTurnMemory) {
    global.__moltArenaTurnMemory = new Map();
  }
  return global.__moltArenaTurnMemory;
}

function getMatchMemory(matchId: string): MatchMemory {
  const store = memoryStore();
  let mem = store.get(matchId);
  if (!mem) {
    mem = { history: [], turns: [] };
    store.set(matchId, mem);
  }
  return mem;
}

function summarizeState(state: any): string {
  const parts: string[] = [];
  parts.push(`Turn ${state.turn ?? "?"}`);

  const p = state.my_player;
  if (p) {
    parts.push(`Stars: ${p.stars ?? "?"}(+${p.starsPerTurn ?? "?"}/turn)`);
    if (Array.isArray(p.technologies) && p.technologies.length > 0) {
      parts.push(`Techs: ${p.technologies.join(", ")}`);
    }
  }

  const cities = state.visible_cities;
  if (Array.isArray(cities)) {
    const myCities = cities.filter((c: any) => c.owner === state.your_player_index);
    parts.push(`My cities: ${myCities.length}`);
  }

  const units = state.visible_units;
  if (Array.isArray(units)) {
    const myUnits = units.filter((u: any) => u.owner === state.your_player_index);
    const enemyUnits = units.filter((u: any) => u.owner !== state.your_player_index);
    parts.push(`My units: ${myUnits.length}, Enemy visible: ${enemyUnits.length}`);
  }

  return parts.join(" | ");
}

function summarizeMoves(moves: any[]): string {
  return moves
    .filter((m: any) => m?.type && m.type !== "end_turn")
    .map((m: any) => {
      switch (m.type) {
        case "move_unit": return `move ${m.unit_id}→(${m.to_x},${m.to_z})`;
        case "attack": return `attack ${m.attacker_id}→(${m.target_x},${m.target_z})`;
        case "train_unit": return `train ${m.unit_type}@(${m.city_x},${m.city_z})`;
        case "research_tech": return `research ${m.tech_name}`;
        case "harvest": return `harvest(${m.x},${m.z})`;
        default: return m.type;
      }
    })
    .join("; ") || "no actions";
}

function summarizeResults(results: any[]): string {
  const successes = results.filter((r: any) => r.success && r.move !== "ai_plan" && r.move !== "fallback_plan" && r.move !== "end_turn");
  const failures = results.filter((r: any) => !r.success && r.move !== "ai_plan" && r.move !== "fallback_plan");
  const parts: string[] = [];
  if (successes.length > 0) parts.push(`${successes.length} succeeded`);
  if (failures.length > 0) parts.push(`${failures.length} failed: ${failures.map((f: any) => `${f.move}(${f.error || "err"})`).join(", ")}`);
  return parts.join("; ") || "ok";
}

function recordTurn(
  matchId: string,
  state: any,
  moves: any[],
  aiResponse: string,
  results: any[]
) {
  const mem = getMatchMemory(matchId);
  const turn: TurnRecord = {
    turn: state.turn ?? mem.turns.length + 1,
    stateSummary: summarizeState(state),
    movesPlanned: summarizeMoves(moves),
    moveResults: summarizeResults(results),
  };
  mem.turns.push(turn);

  // Add the user message + assistant response to conversation history
  mem.history.push({ role: "user", content: `Turn ${turn.turn} state summary: ${turn.stateSummary}` });
  mem.history.push({ role: "assistant", content: aiResponse });

  // Trim to keep only last N turns (2 messages per turn)
  while (mem.history.length > MAX_HISTORY_TURNS * 2) {
    mem.history.shift();
  }
  while (mem.turns.length > MAX_HISTORY_TURNS) {
    mem.turns.shift();
  }
}

function buildTurnContext(matchId: string): string {
  const mem = getMatchMemory(matchId);
  if (mem.turns.length === 0) return "";

  const lines = ["## Previous Turns"];
  for (const t of mem.turns) {
    lines.push(`Turn ${t.turn}: ${t.stateSummary} | Actions: ${t.movesPlanned} | Result: ${t.moveResults}`);
  }
  return lines.join("\n");
}

function getConversationHistory(matchId: string): ChatMessage[] {
  return getMatchMemory(matchId).history;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export function buildSystemPrompt(skillsMd?: string) {
  return `${skillsMd || DEFAULT_SKILLS_MD}

CRITICAL INSTRUCTIONS FOR YOUR RESPONSE:
- Think step-by-step about the best strategic moves before responding
- Consider: What should I attack? What should I capture? How do I defend my capital?
- Prioritize: Attack enemies > Harvest resources > Expand (capture villages) > Train units > Research tech > Move toward objectives
- Do NOT just move units randomly — move them TOWARD enemy cities, uncaptured villages, or defensive positions
- You MUST respond with ONLY a valid JSON array of moves
- Each move is an object with a "type" field and required parameters
- Always include {"type": "end_turn"} as the LAST item in your array
- Do NOT include any text, explanation, or markdown outside the JSON array
- Analyze available_actions carefully to determine legal moves
- Use ALL of your available actions each turn — don't waste moves

Move format examples:
- {"type": "move_unit", "unit_id": "u0", "to_x": 3, "to_z": 2}
- {"type": "attack", "attacker_id": "u0", "target_x": 3, "target_z": 2}
- {"type": "train_unit", "city_x": 2, "city_z": 2, "unit_type": "warrior"}
- {"type": "research_tech", "tech_name": "riding"}
- {"type": "harvest", "x": 3, "z": 4}
- {"type": "end_turn"}`;
}

// ---------------------------------------------------------------------------
// JSON parsing helpers
// ---------------------------------------------------------------------------

function tryParseMovesCandidate(candidate: string): any[] | null {
  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).moves)) {
      return (parsed as any).moves;
    }
    return null;
  } catch {
    return null;
  }
}

function extractCodeFenceBlocks(text: string) {
  const blocks: string[] = [];
  const regex = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) blocks.push(match[1].trim());
  }
  return blocks;
}

function extractTopLevelJsonArrays(text: string, maxCandidates = 24) {
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaping = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (ch === "\\") {
        escaping = true;
        continue;
      }
      if (ch === "\"") inString = false;
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "[") {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }

    if (ch === "]" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        candidates.push(text.slice(start, i + 1));
        start = -1;
        if (candidates.length >= maxCandidates) break;
      }
    }
  }

  return candidates;
}

export function parseMovesFromAIResponse(aiResponse: string): any[] | null {
  const trimmed = aiResponse.trim();
  if (!trimmed) return null;

  const candidates = [
    trimmed,
    ...extractCodeFenceBlocks(trimmed),
    ...extractTopLevelJsonArrays(trimmed),
  ];

  const seen = new Set<string>();
  for (const rawCandidate of candidates) {
    const candidate = rawCandidate.trim();
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);

    const moves = tryParseMovesCandidate(candidate);
    if (moves) return moves;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Coordinate & action helpers
// ---------------------------------------------------------------------------

function parseCoord(coord: any): { x: number; z: number } | null {
  if (Array.isArray(coord) && coord.length >= 2) {
    const x = Number(coord[0]);
    const z = Number(coord[1]);
    if (Number.isFinite(x) && Number.isFinite(z)) {
      return { x: Math.trunc(x), z: Math.trunc(z) };
    }
    return null;
  }

  if (coord && typeof coord === "object") {
    const rawX = (coord as any).x ?? (coord as any).to_x;
    const rawZ = (coord as any).z ?? (coord as any).to_z;
    const x = Number(rawX);
    const z = Number(rawZ);
    if (Number.isFinite(x) && Number.isFinite(z)) {
      return { x: Math.trunc(x), z: Math.trunc(z) };
    }
  }

  return null;
}

function extractAttackCoords(canAttack: any): Array<{ x: number; z: number }> {
  if (!Array.isArray(canAttack)) return [];

  const coords: Array<{ x: number; z: number }> = [];
  for (const item of canAttack) {
    const parsed = parseCoord(item);
    if (parsed) coords.push(parsed);
  }
  return coords;
}

function extractMoveCoords(canMove: any): Array<{ x: number; z: number }> {
  if (!Array.isArray(canMove)) return [];

  const coords: Array<{ x: number; z: number }> = [];
  for (const item of canMove) {
    const parsed = parseCoord(item);
    if (parsed) coords.push(parsed);
  }
  return coords;
}

export function hasNonEndTurnMove(moves: any[]) {
  return moves.some((m: any) => m?.type && m.type !== "end_turn");
}

export function sanitizeMoves(moves: any[]): any[] {
  return moves.filter(
    (move: any) =>
      move &&
      typeof move === "object" &&
      typeof move.type === "string" &&
      move.type.length > 0
  );
}

// ---------------------------------------------------------------------------
// Improved heuristic fallback – smarter than "pick first coordinate"
// ---------------------------------------------------------------------------

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

function findStrategicTarget(state: any): { x: number; z: number } {
  // Priority 1: Move toward enemy cities
  const cities = Array.isArray(state.visible_cities) ? state.visible_cities : [];
  const enemyCities = cities.filter((c: any) => c.owner !== state.your_player_index && c.owner !== null && c.owner !== undefined);
  if (enemyCities.length > 0) {
    // Target the enemy capital first, then nearest enemy city
    const capital = enemyCities.find((c: any) => c.isCapital);
    if (capital) return { x: capital.x, z: capital.z };
    return { x: enemyCities[0].x, z: enemyCities[0].z };
  }

  // Priority 2: Move toward uncaptured villages (neutral cities)
  const neutralCities = cities.filter((c: any) => c.owner === null || c.owner === undefined);
  if (neutralCities.length > 0) {
    return { x: neutralCities[0].x, z: neutralCities[0].z };
  }

  // Priority 3: Explore toward center of map
  return { x: 5, z: 5 };
}

function pickBestMoveCoord(
  unitPos: { x: number; z: number } | null,
  candidates: Array<{ x: number; z: number }>,
  target: { x: number; z: number }
): { x: number; z: number } | null {
  if (candidates.length === 0) return null;

  // Sort by distance to strategic target (closer = better)
  const sorted = [...candidates].sort((a, b) => dist(a, target) - dist(b, target));
  return sorted[0];
}

function getUnitPosition(state: any, unitId: string): { x: number; z: number } | null {
  const units = Array.isArray(state.visible_units) ? state.visible_units : [];
  const unit = units.find((u: any) => u.id === unitId);
  if (unit) return { x: unit.x, z: unit.z };
  return null;
}

export function buildHeuristicFallbackMoves(state: any, maxMoves = 10): any[] {
  const actions = state?.available_actions;
  if (!actions || typeof actions !== "object") return [];

  const moves: any[] = [];
  const units =
    actions.units && typeof actions.units === "object"
      ? Object.entries(actions.units as Record<string, any>)
      : [];

  const target = findStrategicTarget(state);

  // 1. Attack with every unit that can attack
  for (const [unitId, unitActions] of units) {
    if (moves.length >= maxMoves) break;
    const targets = extractAttackCoords((unitActions as any)?.can_attack);
    if (targets.length > 0) {
      moves.push({ type: "attack", attacker_id: unitId, target_x: targets[0].x, target_z: targets[0].z });
    }
  }

  // 2. Harvest all available resources
  const harvestable = Array.isArray(actions.harvestable) ? actions.harvestable : [];
  for (const entry of harvestable) {
    if (moves.length >= maxMoves) break;
    const coord = parseCoord((entry as any)?.tile ?? (entry as any)?.position ?? entry);
    if (coord) {
      moves.push({ type: "harvest", x: coord.x, z: coord.z });
    }
  }

  // 3. Train units at all cities that can train (prefer riders > warriors > archers)
  const trainable = Array.isArray(actions.trainable) ? actions.trainable : [];
  const unitPriority: Record<string, number> = {
    rider: 1,
    warrior: 2,
    archer: 3,
    defender: 4,
    swordsman: 5,
    knight: 6,
    catapult: 7,
  };

  for (const cityEntry of trainable) {
    if (moves.length >= maxMoves) break;
    const city = parseCoord((cityEntry as any)?.city ?? cityEntry);
    const unitOptions = Array.isArray((cityEntry as any)?.units) ? (cityEntry as any).units : [];

    // Pick best affordable unit type
    const myStars = state?.my_player?.stars ?? 0;
    const spentStars = moves.reduce((sum: number, m: any) => {
      if (m.type === "train_unit") {
        const cost = unitOptions.find((u: any) => u.type === m.unit_type)?.cost ?? 0;
        return sum + cost;
      }
      return sum;
    }, 0);
    const availableStars = myStars - spentStars;

    const affordable = unitOptions
      .filter((u: any) => typeof u?.type === "string" && (u.cost ?? 999) <= availableStars)
      .sort((a: any, b: any) => (unitPriority[a.type] ?? 99) - (unitPriority[b.type] ?? 99));

    if (city && affordable.length > 0) {
      moves.push({
        type: "train_unit",
        city_x: city.x,
        city_z: city.z,
        unit_type: affordable[0].type,
      });
    }
  }

  // 4. Research tech (prefer expansion/military techs)
  const availableTechs = Array.isArray(actions.available_techs) ? actions.available_techs : [];
  const techPriority: Record<string, number> = {
    riding: 1,
    hunting: 2,
    organization: 3,
    archery: 4,
    climbing: 5,
    fishing: 6,
    shields: 7,
    mining: 8,
    roads: 9,
    smithing: 10,
    mathematics: 11,
    chivalry: 12,
    navigation: 13,
    construction: 14,
  };

  const myStarsForTech = (state?.my_player?.stars ?? 0) -
    moves.reduce((sum: number, m: any) => {
      if (m.type === "train_unit") {
        const trainEntry = trainable.find((t: any) => {
          const c = parseCoord((t as any)?.city ?? t);
          return c?.x === m.city_x && c?.z === m.city_z;
        });
        const unitOpts = Array.isArray((trainEntry as any)?.units) ? (trainEntry as any).units : [];
        return sum + (unitOpts.find((u: any) => u.type === m.unit_type)?.cost ?? 0);
      }
      if (m.type === "research_tech") {
        return sum + (availableTechs.find((t: any) => t.name === m.tech_name)?.cost ?? 0);
      }
      return sum;
    }, 0);

  const affordableTech = availableTechs
    .filter((t: any) => typeof t?.name === "string" && (t.cost ?? 999) <= myStarsForTech)
    .sort((a: any, b: any) => (techPriority[a.name] ?? 99) - (techPriority[b.name] ?? 99));

  if (affordableTech.length > 0 && moves.length < maxMoves) {
    moves.push({ type: "research_tech", tech_name: affordableTech[0].name });
  }

  // 5. Move units strategically — toward the target, not just candidates[0]
  for (const [unitId, unitActions] of units) {
    if (moves.length >= maxMoves) break;
    // Skip units that already attacked (they might not be able to move)
    const alreadyActed = moves.some(
      (m: any) => (m.type === "attack" && m.attacker_id === unitId) ||
                  (m.type === "move_unit" && m.unit_id === unitId)
    );
    if (alreadyActed) continue;

    const candidates = extractMoveCoords((unitActions as any)?.can_move);
    if (candidates.length > 0) {
      const unitPos = getUnitPosition(state, unitId);
      const best = pickBestMoveCoord(unitPos, candidates, target);
      if (best) {
        moves.push({
          type: "move_unit",
          unit_id: unitId,
          to_x: best.x,
          to_z: best.z,
        });
      }
    }
  }

  return sanitizeMoves(moves).slice(0, maxMoves);
}

// ---------------------------------------------------------------------------
// Network & execution
// ---------------------------------------------------------------------------

const TURN_DEADLINE_MS = 35_000;       // 35s total – leaves 25s headroom before Vercel's 60s limit
const STATE_FETCH_TIMEOUT_MS = 5_000;  // 5s to fetch game state
const MOVE_FETCH_TIMEOUT_MS = 3_000;   // 3s per move execution
const AI_CALL_TIMEOUT_MS = 15_000;     // 15s max for AI – fall back to heuristic if slower
const DEADLINE_BUFFER_MS = 2_000;

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return await res.json();
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeAgentTurn(input: AgentTurnInput) {
  const startedAtMs = Date.now();
  const deadlineMs = startedAtMs + TURN_DEADLINE_MS;

  const {
    matchId,
    apiToken,
    model,
    apiKey,
    skillsMd,
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  } = input;

  if (!matchId || !apiToken || !model || !apiKey) {
    throw new Error("Missing required fields: matchId, apiToken, model, apiKey");
  }

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const gameHeaders = {
    "Content-Type": "application/json",
    "x-api-token": apiToken,
    Authorization: `Bearer ${anonKey}`,
  };

  const state = await fetchJsonWithTimeout(
    `${supabaseUrl}/functions/v1/get-match-state?match_id=${matchId}`,
    { headers: gameHeaders },
    STATE_FETCH_TIMEOUT_MS
  );

  if (state.error) {
    return { status: "error", error: state.error };
  }

  if (state.status === "finished") {
    return { status: "game_over", winner: state.winner_idx };
  }

  if (state.status === "waiting") {
    return { status: "waiting" };
  }

  if (!state.is_your_turn) {
    return { status: "not_your_turn" };
  }

  // Build prompt with turn history context
  const usedCustomSkills = typeof skillsMd === "string" && skillsMd.trim().length > 0;
  const systemPrompt = buildSystemPrompt(skillsMd);

  // Trim state to reduce token count – keep only what the AI needs to decide moves
  const trimmedState: any = {
    turn: state.turn,
    max_turns: state.max_turns,
    your_player_index: state.your_player_index,
    my_player: state.my_player,
    visible_cities: state.visible_cities,
    visible_units: state.visible_units,
    available_actions: state.available_actions,
  };

  const turnContext = buildTurnContext(matchId);
  const userMessage = `${turnContext ? turnContext + "\n\n" : ""}Current game state:\n${JSON.stringify(trimmedState)}\n\nRespond with ONLY a JSON array of moves. Use ALL available actions. Always end with {"type":"end_turn"}.`;

  const conversationHistory = getConversationHistory(matchId);
  const heuristicFallbackMoves = buildHeuristicFallbackMoves(state);

  const results: any[] = [];
  let moves: any[] = [];
  let fallbackUsed = false;
  let aiResponse = "";

  try {
    const remaining = Math.min(AI_CALL_TIMEOUT_MS, Math.max(6_000, deadlineMs - Date.now() - 12_000));
    aiResponse = await callAI(model, apiKey, systemPrompt, userMessage, {
      timeoutMs: remaining,
      maxOutputTokens: 2048,
      messages: conversationHistory,
    });
    const parsedMoves = parseMovesFromAIResponse(aiResponse);
    if (parsedMoves) {
      moves = parsedMoves;
    } else {
      fallbackUsed = true;
      results.push({
        move: "ai_plan",
        success: false,
        error: "AI did not return parseable JSON moves. Applying heuristic fallback where possible.",
      });
    }
  } catch (err: any) {
    fallbackUsed = true;
    results.push({
      move: "ai_plan",
      success: false,
      error: err?.message || "AI planning failed. Applying heuristic fallback where possible.",
    });
  }

  if (!Array.isArray(moves)) moves = [];
  moves = sanitizeMoves(moves);

  if (!hasNonEndTurnMove(moves) && heuristicFallbackMoves.length > 0) {
    fallbackUsed = true;
    const reason = moves.length === 0
      ? "AI returned no actionable moves."
      : "AI returned end_turn-only moves.";
    results.push({
      move: "fallback_plan",
      success: true,
      reason: `${reason} Using heuristic legal moves before end_turn.`,
    });
    moves = heuristicFallbackMoves;
  }

  if (!moves.some((m: any) => m.type === "end_turn")) {
    moves.push({ type: "end_turn" });
  }
  if (moves.length === 0) {
    moves = [{ type: "end_turn" }];
  }

  let endTurnExecuted = false;
  for (const move of moves) {
    if (Date.now() >= deadlineMs - DEADLINE_BUFFER_MS) {
      results.push({ move: move?.type || "unknown", success: false, skipped: true, reason: "turn_deadline_guard" });
      continue;
    }

    try {
      const moveResult = await fetchJsonWithTimeout(
        `${supabaseUrl}/functions/v1/execute-move`,
        {
          method: "POST",
          headers: gameHeaders,
          body: JSON.stringify({ match_id: matchId, move }),
        },
        MOVE_FETCH_TIMEOUT_MS
      );
      results.push({ move: move.type, success: !moveResult.error, detail: moveResult });
      if (move.type === "end_turn" && !moveResult.error) {
        endTurnExecuted = true;
      }
    } catch (err: any) {
      results.push({ move: move.type, success: false, error: err.message });
    }
  }

  if (!endTurnExecuted && Date.now() < deadlineMs - 500) {
    try {
      const moveResult = await fetchJsonWithTimeout(
        `${supabaseUrl}/functions/v1/execute-move`,
        {
          method: "POST",
          headers: gameHeaders,
          body: JSON.stringify({ match_id: matchId, move: { type: "end_turn" } }),
        },
        MOVE_FETCH_TIMEOUT_MS
      );
      results.push({ move: "end_turn", success: !moveResult.error, detail: moveResult, forced: true });
      if (!moveResult.error) endTurnExecuted = true;
    } catch (err: any) {
      results.push({ move: "end_turn", success: false, error: err.message, forced: true });
    }
  }

  // Record this turn in memory for next turn's context
  recordTurn(matchId, state, moves, aiResponse || summarizeMoves(moves), results);

  return {
    status: "ok",
    usedCustomSkills,
    movesExecuted: results.filter((r: any) => r.move !== "ai_plan" && r.move !== "fallback_plan").length,
    fallbackUsed,
    endTurnExecuted,
    elapsedMs: Date.now() - startedAtMs,
    results,
  };
}
