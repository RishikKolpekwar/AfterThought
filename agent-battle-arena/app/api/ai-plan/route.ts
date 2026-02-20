import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai-client";
import {
  buildSystemPrompt,
  parseMovesFromAIResponse,
  buildHeuristicFallbackMoves,
  sanitizeMoves,
  hasNonEndTurnMove,
} from "@/lib/agent-turn";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { state, model, apiKey, skillsMd, conversationHistory } =
      await req.json();

    if (!state || !model || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields: state, model, apiKey" },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(skillsMd);

    // Trim state — only send what the AI needs to decide moves
    const trimmedState: any = {
      turn: state.turn,
      max_turns: state.max_turns,
      your_player_index: state.your_player_index,
      my_player: state.my_player,
      visible_cities: state.visible_cities,
      visible_units: state.visible_units,
      available_actions: state.available_actions,
    };

    const userMessage = `Current game state:\n${JSON.stringify(trimmedState)}\n\nRespond with ONLY a JSON array of moves. Use ALL available actions. Always end with {"type":"end_turn"}.`;

    const heuristicMoves = buildHeuristicFallbackMoves(state);

    let moves: any[] = [];
    let fallbackUsed = false;
    let aiResponse = "";

    try {
      aiResponse = await callAI(model, apiKey, systemPrompt, userMessage, {
        timeoutMs: 20_000,
        maxOutputTokens: 2048,
        messages: conversationHistory || [],
      });

      const parsed = parseMovesFromAIResponse(aiResponse);
      if (parsed) {
        moves = sanitizeMoves(parsed);
      }
    } catch {
      // AI failed — will fall back to heuristic below
    }

    if (!hasNonEndTurnMove(moves) && heuristicMoves.length > 0) {
      fallbackUsed = true;
      moves = heuristicMoves;
    }

    if (!moves.some((m: any) => m.type === "end_turn")) {
      moves.push({ type: "end_turn" });
    }

    return NextResponse.json({ moves, fallbackUsed, aiResponse });
  } catch (err: any) {
    console.error("[ai-plan] Error:", err);
    return NextResponse.json(
      { error: err?.message || "AI plan failed" },
      { status: 500 }
    );
  }
}
