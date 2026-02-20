"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useHederaWallet } from "@/components/wallet-provider";
import { createClient } from "@/lib/supabase";
import { AI_MODELS, DEFAULT_SKILLS_MD } from "@/lib/agent-config";
import {
  linkWallet,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getProfileData,
  updateProfile,
  getMatches,
} from "@/lib/auth";
import { Logo } from "@/components/logo";

// ─── Helper components ───

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="border border-[#424242] bg-[#0a0a0a] p-6 flex flex-col gap-2">
      <span className="text-xs font-mono uppercase tracking-wider text-white/40">{label}</span>
      <span className={`text-3xl font-mono font-bold ${accent ? "text-[#FFC700]" : "text-white"}`}>{value}</span>
      {sub && <span className="text-xs font-mono text-white/30">{sub}</span>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center">
      <p className="font-mono text-white/30 text-sm">{message}</p>
    </div>
  );
}

const NETWORK_LABEL = process.env.NEXT_PUBLIC_HEDERA_NETWORK || "testnet";
const TREASURY_ACCOUNT = process.env.NEXT_PUBLIC_TREASURY_ACCOUNT || "0.0.7974713";
const MIRROR_URL = process.env.NEXT_PUBLIC_HEDERA_MIRROR_URL || "https://testnet.mirrornode.hedera.com";

// Proxy helper: try local proxy first (avoids browser connection issues), fall back to direct
async function mirrorFetch(path: string): Promise<any> {
  try {
    const proxyRes = await fetch(`/api/hedera-proxy?path=${encodeURIComponent(path)}`);
    if (proxyRes.ok) return await proxyRes.json();
  } catch { /* proxy unavailable, fall through */ }
  const directRes = await fetch(`${MIRROR_URL}${path}`);
  return await directRes.json();
}
const POLYTOPIA_URL_CANDIDATES = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_POLYTOPIA_URL,
      "http://localhost:3001",
      "http://localhost:5173",
      "http://localhost:3000",
    ].filter((url): url is string => Boolean(url))
  )
);
const AGENT_SETTINGS_VERSION = 1;

// ─── Main component ───

export default function DashboardPage() {
  const { accountId: hederaAccountId, connected, disconnect: walletDisconnect, connect: hederaConnect } = useHederaWallet();

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  // Profile / onboarding
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);

  // Dashboard data
  const [matches, setMatches] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [hbarBalance, setHbarBalance] = useState<number | null>(null);
  const [tab, setTab] = useState<"arena" | "leaderboard" | "agent">("arena");

  // Arena state
  const [arenaMatches, setArenaMatches] = useState<any[]>([]);
  const [myArenaMatches, setMyArenaMatches] = useState<any[]>([]);
  const [arenaLoading, setArenaLoading] = useState(false);
  const [arenaAction, setArenaAction] = useState<string | null>(null);
  const [spectatingMatch, setSpectatingMatch] = useState<string | null>(null);
  const [spectatorFullscreen, setSpectatorFullscreen] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("all");
  const [maxTurns, setMaxTurns] = useState("all");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [agentModel, setAgentModel] = useState<string>(AI_MODELS[0].id);
  const [agentApiKey, setAgentApiKey] = useState("");
  const [agentSkillsMd, setAgentSkillsMd] = useState(DEFAULT_SKILLS_MD);
  const [agentSettingsLoaded, setAgentSettingsLoaded] = useState(false);
  const [agentSaveMessage, setAgentSaveMessage] = useState<string | null>(null);
  const [agentSaveError, setAgentSaveError] = useState<string | null>(null);
  const [agentWakeLoading, setAgentWakeLoading] = useState(false);
  const [agentWakeMessage, setAgentWakeMessage] = useState<string | null>(null);
  const [agentWakeError, setAgentWakeError] = useState<string | null>(null);
  const [agentWakeMatchId, setAgentWakeMatchId] = useState("");
  const [agentRunnerStatus, setAgentRunnerStatus] = useState<any>(null);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const agentLogsRef = useRef<HTMLDivElement>(null);
  const [spectatorUrlIndex, setSpectatorUrlIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const [hcsMessages, setHcsMessages] = useState<any[]>([]);
  const [hcsLoading, setHcsLoading] = useState(false);
  const [hcsTopicId, setHcsTopicId] = useState("");

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const fetchHcsMessages = useCallback(async (topicId: string) => {
    if (!topicId.trim()) return;
    setHcsLoading(true);
    try {
      const data = await mirrorFetch(`/api/v1/topics/${topicId.trim()}/messages?limit=25&order=desc`);
      setHcsMessages(data.messages || []);
    } catch (err) {
      console.error("HCS fetch error:", err);
      setHcsMessages([]);
    } finally {
      setHcsLoading(false);
    }
  }, []);

  const walletAddress = hederaAccountId || null;
  const shortAddress = walletAddress || null;
  const settingsStorageKey = profile?.id ? `moltarena-agent-settings:${profile.id}` : null;
  const hasAgentSettings = !!agentApiKey.trim() && !!agentModel.trim();
  const spectatorBaseUrl =
    POLYTOPIA_URL_CANDIDATES[Math.min(spectatorUrlIndex, POLYTOPIA_URL_CANDIDATES.length - 1)] ||
    "http://localhost:3001";

  // ─── Auth effects ───

  // Check existing session on mount (must complete before wallet auth fires)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user);
    }).finally(() => {
      setSessionChecked(true);
    });
  }, []);

  // Link wallet to profile when Hedera wallet connects (user already authed)
  const [walletLinking, setWalletLinking] = useState(false);
  useEffect(() => {
    if (!user || !walletAddress || !profile) return;
    if (profile.wallet_address === walletAddress) return;
    let cancelled = false;
    async function link() {
      setWalletLinking(true);
      try {
        const updated = await linkWallet(walletAddress!);
        if (!cancelled) setProfile(updated);
      } catch (err) {
        console.error("Wallet link error:", err);
      } finally {
        if (!cancelled) setWalletLinking(false);
      }
    }
    link();
    return () => { cancelled = true; };
  }, [user, walletAddress, profile]);

  // Fetch profile when user is set
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let cancelled = false;
    async function load() {
      setProfileLoading(true);
      try {
        const p = await getProfileData();
        if (!cancelled) setProfile(p);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  // Load per-user local agent settings
  useEffect(() => {
    if (!settingsStorageKey) {
      setAgentSettingsLoaded(false);
      return;
    }

    try {
      const raw = localStorage.getItem(settingsStorageKey);
      if (!raw) {
        setAgentModel(AI_MODELS[0].id);
        setAgentApiKey("");
        setAgentSkillsMd(DEFAULT_SKILLS_MD);
        setAgentSettingsLoaded(true);
        return;
      }

      const parsed = JSON.parse(raw);
      if (parsed?.version === AGENT_SETTINGS_VERSION) {
        setAgentModel(typeof parsed.model === "string" ? parsed.model : AI_MODELS[0].id);
        setAgentApiKey(typeof parsed.apiKey === "string" ? parsed.apiKey : "");
        setAgentSkillsMd(typeof parsed.skillsMd === "string" ? parsed.skillsMd : DEFAULT_SKILLS_MD);
      } else {
        setAgentModel(AI_MODELS[0].id);
        setAgentApiKey("");
        setAgentSkillsMd(DEFAULT_SKILLS_MD);
      }
    } catch (err) {
      console.error("Failed to load agent settings:", err);
      setAgentModel(AI_MODELS[0].id);
      setAgentApiKey("");
      setAgentSkillsMd(DEFAULT_SKILLS_MD);
    } finally {
      setAgentSettingsLoaded(true);
    }
  }, [settingsStorageKey]);

  // Fetch dashboard data when profile is loaded and has display_name
  useEffect(() => {
    if (!profile?.display_name) return;
    let cancelled = false;
    async function loadData() {
      setDataLoading(true);
      try {
        const m = await getMatches();
        if (!cancelled) {
          setMatches(m);
        }
      } catch (err) {
        console.error("Data fetch error:", err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [profile?.display_name]);

  // Fetch HBAR balance via Hedera Mirror Node
  useEffect(() => {
    if (!hederaAccountId) return;
    let cancelled = false;
    async function fetchBalance() {
      try {
        const data = await mirrorFetch(`/api/v1/accounts/${hederaAccountId}`);
        // Balance is in tinybars (1 HBAR = 100,000,000 tinybars)
        if (!cancelled && data.balance) {
          setHbarBalance(data.balance.balance / 100_000_000);
        }
      } catch (err) {
        console.error("Balance fetch error:", err);
      }
    }
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [hederaAccountId]);

  // ─── Handlers ───

  const handleConnectWallet = useCallback(() => {
    hederaConnect();
  }, [hederaConnect]);

  const handleEmailAuth = useCallback(async () => {
    if (!emailInput || !passwordInput) {
      setAuthError("Email and password are required");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === "signup") {
        const data = await signUpWithEmail(emailInput, passwordInput);
        if (data?.user?.identities?.length === 0) {
          setAuthError("Account already exists. Try signing in.");
        } else if (data?.user && !data.session) {
          setAuthError("Check your email for a confirmation link!");
        } else {
          setUser(data?.user || null);
        }
      } else {
        const data = await signInWithEmail(emailInput, passwordInput);
        setUser(data?.user || null);
      }
    } catch (err: any) {
      const msg = err?.message || "Authentication failed";
      if (msg.toLowerCase().includes("rate limit")) {
        setAuthError("Too many attempts. Please wait a minute and try again.");
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  }, [emailInput, passwordInput, authMode]);

  const handleOnboardingSubmit = useCallback(async () => {
    if (!displayNameInput.trim()) return;
    setOnboardingSaving(true);
    try {
      const updated = await updateProfile(displayNameInput.trim());
      setProfile(updated);
    } catch (err: any) {
      console.error("Onboarding error:", err);
    } finally {
      setOnboardingSaving(false);
    }
  }, [displayNameInput]);

  const handleDisconnect = useCallback(async () => {
    try {
      walletDisconnect();
      await signOut();
      setUser(null);
      setProfile(null);
      setHbarBalance(null);
      setMatches([]);
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  }, [walletDisconnect]);

  const handleSaveAgentSettings = useCallback(() => {
    if (!settingsStorageKey) {
      setAgentSaveError("Profile not loaded");
      return;
    }
    if (!agentApiKey.trim() || !agentModel.trim()) {
      setAgentSaveError("Model and API key are required");
      return;
    }

    try {
      localStorage.setItem(
        settingsStorageKey,
        JSON.stringify({
          version: AGENT_SETTINGS_VERSION,
          model: agentModel.trim(),
          apiKey: agentApiKey.trim(),
          skillsMd: agentSkillsMd.trim(),
          updatedAt: new Date().toISOString(),
        })
      );
      setAgentSaveError(null);
      setAgentSaveMessage("Agent settings saved.");
    } catch (err) {
      console.error("Failed to save agent settings:", err);
      setAgentSaveError("Failed to save settings locally");
      setAgentSaveMessage(null);
    }
  }, [settingsStorageKey, agentApiKey, agentSkillsMd, agentModel]);

  // Client-side orchestrated agent loop — 3 fast steps per turn:
  //   1. Fetch state from Supabase directly (no serverless function)
  //   2. Call /api/ai-plan to get moves (serverless, AI-only, ~15s max)
  //   3. Execute moves against Supabase directly (no serverless function)
  // This avoids the old monolithic serverless function that could timeout.
  const agentPollingRef = React.useRef<NodeJS.Timeout | null>(null);
  const agentStoppedRef = React.useRef(false);
  const agentHistoryRef = React.useRef<Array<{ role: string; content: string }>>([]);

  const stopAgentRunner = useCallback(async (matchId: string) => {
    agentStoppedRef.current = true;
    if (agentPollingRef.current) {
      clearInterval(agentPollingRef.current);
      agentPollingRef.current = null;
    }
    setAgentRunnerStatus((prev: any) => prev ? { ...prev, status: "stopped", running: false } : null);
    setAgentWakeMessage(`Agent stopped for match ${matchId.slice(0, 8)}...`);
  }, []);

  const startAgentPolling = useCallback((matchId: string) => {
    if (agentPollingRef.current) {
      clearInterval(agentPollingRef.current);
    }
    agentStoppedRef.current = false;
    agentHistoryRef.current = [];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const apiToken = profile?.api_token;
    const model = agentModel.trim();
    const apiKey = agentApiKey.trim();
    const skillsMd = agentSkillsMd.trim() || undefined;

    if (!supabaseUrl || !anonKey || !apiToken || !model || !apiKey) return;

    const gameHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-token": apiToken,
      Authorization: `Bearer ${anonKey}`,
    };

    let consecutiveErrors = 0;
    let inFlight = false;

    const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const addLogs = (lines: string[]) => setAgentLogs(prev => [...prev, ...lines].slice(-150));

    const tick = async () => {
      if (agentStoppedRef.current || inFlight) return;
      inFlight = true;
      const tickLogs: string[] = [];

      try {
        // --- Step 1: Fetch state from Supabase directly ---
        console.log("[agent] Step 1: Fetching game state...");
        const stateRes = await fetch(
          `${supabaseUrl}/functions/v1/get-match-state?match_id=${matchId}`,
          { headers: gameHeaders }
        );
        const state = await stateRes.json();
        console.log("[agent] Step 1 done:", state.status, state.is_your_turn ? "YOUR TURN" : "waiting", "turn:", state.turn);

        if (agentStoppedRef.current) return;

        if (state.error) {
          console.error("[agent] State error:", state.error);
          setAgentRunnerStatus((prev: any) => ({
            ...prev, matchId, lastError: state.error,
          }));
          consecutiveErrors += 1;
          if (consecutiveErrors >= 5) {
            agentStoppedRef.current = true;
            if (agentPollingRef.current) { clearInterval(agentPollingRef.current); agentPollingRef.current = null; }
            setAgentRunnerStatus((prev: any) => prev ? { ...prev, status: "error", running: false } : null);
          }
          return;
        }

        if (state.status === "finished") {
          agentStoppedRef.current = true;
          if (agentPollingRef.current) { clearInterval(agentPollingRef.current); agentPollingRef.current = null; }
          setAgentRunnerStatus({ matchId, status: "finished", running: false, lastResult: state, lastError: null });
          setAgentWakeMessage(`Game over for match ${matchId.slice(0, 8)}...`);
          return;
        }

        if (state.status === "waiting" || !state.is_your_turn) {
          setAgentRunnerStatus((prev: any) => ({
            ...prev, matchId, status: "running", running: true,
            lastResult: { status: state.status === "waiting" ? "waiting" : "not_your_turn" },
            lastError: null,
          }));
          consecutiveErrors = 0;
          return;
        }

        tickLogs.push(`[${ts()}] Turn ${state.turn} — P${(state.current_player ?? 0) + 1}'s turn (our move)`);

        // --- Step 2: Get AI move plan (only serverless call — AI only, no Supabase) ---
        console.log("[agent] Step 2: Calling AI plan...");
        const planRes = await fetch("/api/ai-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state,
            model,
            apiKey,
            skillsMd,
            conversationHistory: agentHistoryRef.current,
          }),
        });
        const plan = await planRes.json();

        if (agentStoppedRef.current) return;

        console.log("[agent] Step 2 done:", plan.error ? `ERROR: ${plan.error}` : `${plan.moves?.length ?? 0} moves, fallback=${plan.fallbackUsed}`);

        if (plan.error) {
          consecutiveErrors += 1;
          setAgentRunnerStatus((prev: any) => ({
            ...prev, matchId, lastError: plan.error,
          }));
          return;
        }

        const moves: any[] = plan.moves || [{ type: "end_turn" }];
        const moveNames = moves.map((m: any) => m.type).join(", ");
        tickLogs.push(`[${ts()}] AI planned ${moves.length} moves: ${moveNames}${plan.fallbackUsed ? " (fallback)" : ""}`);

        // --- Step 3: Execute ALL moves in one batch request ---
        console.log("[agent] Step 3: Executing", moves.length, "moves (batch)...");
        // Ensure end_turn is included
        const hasEndTurn = moves.some((m: any) => m.type === "end_turn");
        const batchMoves = hasEndTurn ? moves : [...moves, { type: "end_turn" }];

        let results: any[] = [];
        let endTurnExecuted = false;
        try {
          const batchRes = await fetch(
            `${supabaseUrl}/functions/v1/execute-move`,
            {
              method: "POST",
              headers: gameHeaders,
              body: JSON.stringify({ match_id: matchId, moves: batchMoves }),
            }
          );
          const batchResult = await batchRes.json();
          if (batchResult.error) {
            tickLogs.push(`[${ts()}]  ✗ batch error: ${batchResult.error}`);
            results = [{ move: "batch", success: false, error: batchResult.error }];
          } else {
            const batchResults = batchResult.results || [];
            for (const r of batchResults) {
              const icon = r.error ? "✗" : "✓";
              tickLogs.push(`[${ts()}]  ${icon} ${r.type}${r.error ? ` — ${r.error}` : ""}`);
              results.push({ move: r.type, success: !r.error });
              if (r.type === "end_turn" && !r.error) endTurnExecuted = true;
            }
            if (batchResult.log && Array.isArray(batchResult.log)) {
              for (const l of batchResult.log) tickLogs.push(`[${ts()}]    ${l}`);
            }
          }
        } catch (err: any) {
          tickLogs.push(`[${ts()}]  ✗ batch failed: ${err.message}`);
          results = [{ move: "batch", success: false, error: err.message }];
        }

        // --- Update client-side turn memory ---
        const turnSummary = `Turn ${state.turn ?? "?"}: ${results.filter((r: any) => r.success).length} succeeded, ${results.filter((r: any) => !r.success).length} failed`;
        if (plan.aiResponse) {
          agentHistoryRef.current.push(
            { role: "user", content: `Turn ${state.turn} state summary: ${turnSummary}` },
            { role: "assistant", content: plan.aiResponse }
          );
          // Keep last 8 turns (16 messages)
          while (agentHistoryRef.current.length > 16) {
            agentHistoryRef.current.shift();
          }
        }

        console.log("[agent] Step 3 done:", results.filter((r: any) => r.success).length, "succeeded,", results.filter((r: any) => !r.success).length, "failed, endTurn:", endTurnExecuted);

        tickLogs.push(`[${ts()}] Turn complete: ${results.filter((r: any) => r.success).length}/${results.length} succeeded`);
        addLogs(tickLogs);

        setAgentRunnerStatus({
          matchId,
          status: "running",
          running: true,
          lastResult: { status: "ok", movesExecuted: results.length, fallbackUsed: plan.fallbackUsed, endTurnExecuted, results },
          lastError: null,
        });
        consecutiveErrors = 0;
      } catch (err: any) {
        console.error("[agent] Tick error:", err);
        tickLogs.push(`[${ts()}] ✗ Error: ${err.message}`);
        addLogs(tickLogs);
        consecutiveErrors += 1;
        if (consecutiveErrors >= 5) {
          agentStoppedRef.current = true;
          if (agentPollingRef.current) { clearInterval(agentPollingRef.current); agentPollingRef.current = null; }
          setAgentRunnerStatus((prev: any) => prev ? { ...prev, status: "error", running: false } : null);
        }
      } finally {
        inFlight = false;
      }
    };

    agentPollingRef.current = setInterval(tick, 1000);
    tick();
  }, [profile?.api_token, agentModel, agentApiKey, agentSkillsMd]);

  const wakeAgentForMatch = useCallback(async (matchId: string) => {
    if (!profile?.api_token) throw new Error("Missing API token");
    if (!hasAgentSettings) throw new Error("Configure agent model and API key first");

    setAgentWakeLoading(true);
    setAgentWakeError(null);
    setAgentWakeMessage(null);

    try {
      // Wake endpoint just joins the match (no turn execution)
      const wakeRes = await fetch("/api/moltarena/wake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          apiToken: profile.api_token,
        }),
      });
      const wakeData = await wakeRes.json();
      if (!wakeRes.ok || wakeData.error) {
        throw new Error(wakeData.error || "Failed to wake agent");
      }

      setAgentWakeMatchId(matchId);
      setAgentWakeMessage(`Agent running for match ${matchId.slice(0, 8)}...`);
      setAgentRunnerStatus({
        matchId,
        status: "running",
        running: true,
        lastResult: null,
        lastError: null,
      });

      // Client-side polling handles ALL turns (including first)
      startAgentPolling(matchId);

      return wakeData;
    } catch (err: any) {
      setAgentWakeError(err.message || "Failed to wake agent");
      throw err;
    } finally {
      setAgentWakeLoading(false);
    }
  }, [profile?.api_token, hasAgentSettings, agentModel, agentApiKey, agentSkillsMd, startAgentPolling]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (agentPollingRef.current) {
        clearInterval(agentPollingRef.current);
      }
    };
  }, []);

  // Auto-scroll agent logs to bottom
  useEffect(() => {
    if (agentLogsRef.current) {
      agentLogsRef.current.scrollTop = agentLogsRef.current.scrollHeight;
    }
  }, [agentLogs]);

  // Fetch arena matches
  const loadArenaMatches = useCallback(async () => {
    if (!profile?.id) return;
    setArenaLoading(true);
    try {
      const supabase = createClient();
      // Open matches (waiting, not created by me)
      const { data: open } = await supabase
        .from("arena_matches")
        .select("*, arena_players(profile_id, player_index), profiles:created_by(display_name)")
        .eq("status", "waiting")
        .neq("created_by", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setArenaMatches(open || []);

      // My matches (active or waiting that I created, or finished recently)
      const { data: myPlayers } = await supabase
        .from("arena_players")
        .select("match_id, player_index")
        .eq("profile_id", profile.id);

      if (myPlayers && myPlayers.length > 0) {
        const matchIds = myPlayers.map((p: any) => p.match_id);
        const { data: myMatches } = await supabase
          .from("arena_matches")
          .select("*, profiles:created_by(display_name)")
          .in("id", matchIds)
          .order("created_at", { ascending: false })
          .limit(20);

        // Fetch all players for these matches to get opponent names
        const { data: allPlayers } = await supabase
          .from("arena_players")
          .select("match_id, player_index, profile_id, profiles(display_name)")
          .in("match_id", matchIds);

        // Attach player_index and opponent name to each match
        const enriched = (myMatches || []).map((m: any) => {
          const pl = myPlayers.find((p: any) => p.match_id === m.id);
          const opponent = (allPlayers || []).find(
            (p: any) => p.match_id === m.id && p.profile_id !== profile.id
          );
          return {
            ...m,
            my_player_index: pl?.player_index,
            opponent_name: (opponent as any)?.profiles?.display_name || null,
          };
        });
        setMyArenaMatches(enriched);
      } else {
        setMyArenaMatches([]);
      }
    } catch (err) {
      console.error("Arena fetch error:", err);
    } finally {
      setArenaLoading(false);
    }
  }, [profile?.id]);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/leaderboard`,
        { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((tab === "arena" || tab === "agent") && profile?.id) loadArenaMatches();
    if (tab === "leaderboard") loadLeaderboard();
  }, [tab, profile?.id, loadArenaMatches, loadLeaderboard]);

  useEffect(() => {
    if (!spectatingMatch) return;
    setSpectatorUrlIndex(0);
    // Auto-populate HCS viewer with match topic ID
    const match = myArenaMatches.find((m: any) => m.id === spectatingMatch);
    if (match?.hedera_topic_id) {
      setHcsTopicId(match.hedera_topic_id);
      fetchHcsMessages(match.hedera_topic_id);
    }
  }, [spectatingMatch, myArenaMatches, fetchHcsMessages]);


  // Tick every second for turn timer countdown
  useEffect(() => {
    if (tab !== "arena") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [tab]);

  const handleFindMatch = useCallback(async () => {
    if (!profile?.api_token) return;
    if (!hasAgentSettings) {
      setTab("agent");
      alert("Configure your Agent settings (model and API key) before finding a match.");
      return;
    }
    const stake = stakeAmount === "all" ? 0 : (parseFloat(stakeAmount) || 0);
    const turns = maxTurns === "all" ? 30 : (parseInt(maxTurns) || 30);
    const VALID_STAKES = [0, 0.1, 0.25, 0.5, 1];
    if (!VALID_STAKES.includes(stake)) { alert("Invalid stake. Choose: Free, 0.1, 0.25, 0.5, or 1 HBAR"); return; }
    setArenaAction("finding");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/find-match`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-token": profile.api_token,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ stake_amount: stake, max_turns: turns }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.match_id) {
        try {
          await wakeAgentForMatch(data.match_id);
        } catch (wakeErr: any) {
          console.error("Wake error after find-match:", wakeErr);
          alert(`Match found, but wake failed: ${wakeErr?.message || "Unknown error"}`);
        }
      }
      await loadArenaMatches();
      // Refresh profile to get updated balance
      const updatedProfile = await getProfileData();
      if (updatedProfile) setProfile(updatedProfile);
    } catch (err: any) {
      console.error("Find match error:", err);
      alert(err.message || "Failed to find match");
    } finally {
      setArenaAction(null);
    }
  }, [profile?.api_token, stakeAmount, maxTurns, loadArenaMatches, hasAgentSettings, wakeAgentForMatch]);

  const handleCancelMatch = useCallback(async (matchId: string) => {
    if (!profile?.api_token) return;
    setArenaAction(matchId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cancel-match`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-token": profile.api_token,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ match_id: matchId }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadArenaMatches();
      const updatedProfile = await getProfileData();
      if (updatedProfile) setProfile(updatedProfile);
    } catch (err: any) {
      console.error("Cancel match error:", err);
      alert(err.message || "Failed to cancel match");
    } finally {
      setArenaAction(null);
    }
  }, [profile?.api_token, loadArenaMatches]);

  const handleJoinArenaMatch = useCallback(async (matchId: string) => {
    if (!profile?.api_token) return;
    if (!hasAgentSettings) {
      setTab("agent");
      alert("Configure your Agent settings (model and API key) before joining a match.");
      return;
    }
    setArenaAction(matchId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/join-match`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-token": profile.api_token,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ match_id: matchId }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      try {
        await wakeAgentForMatch(matchId);
      } catch (wakeErr: any) {
        console.error("Wake error after join-match:", wakeErr);
        alert(`Joined match, but wake failed: ${wakeErr?.message || "Unknown error"}`);
      }
      await loadArenaMatches();
      const updatedProfile = await getProfileData();
      if (updatedProfile) setProfile(updatedProfile);
    } catch (err: any) {
      console.error("Join match error:", err);
      alert(err.message || "Failed to join match");
    } finally {
      setArenaAction(null);
    }
  }, [profile?.api_token, loadArenaMatches, hasAgentSettings, wakeAgentForMatch]);

  const isAuthed = !!user;

  // ─── Wait for session check before rendering auth screen ───

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="font-mono text-white/40 text-sm">Loading...</p>
      </div>
    );
  }

  // ─── STATE A: Not authenticated ───

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <Logo className="w-[180px] mb-10 opacity-60" />
        <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-3 text-center">
          Sign In to MoltArena
        </h1>
        <p className="text-white/40 font-mono text-sm mb-8 text-center max-w-md">
          Sign in to access the dashboard, manage agents, and track winnings.
        </p>

        {authError && (
          <div className="mb-6 px-6 py-3 border border-red-500/30 bg-red-500/10 max-w-sm w-full text-center">
            <p className="font-mono text-xs text-red-400">{authError}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Email"
            className="w-full bg-[#0a0a0a] border border-[#424242] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#FFC700]/50 placeholder:text-white/20"
          />
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
            className="w-full bg-[#0a0a0a] border border-[#424242] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#FFC700]/50 placeholder:text-white/20"
          />
          <button
            onClick={handleEmailAuth}
            disabled={authLoading}
            className="w-full font-mono uppercase text-sm tracking-wider px-6 py-3 border border-[#FFC700]/50 text-[#FFC700] hover:bg-[#FFC700]/10 transition-all duration-200 disabled:opacity-50"
          >
            {authLoading ? "..." : authMode === "login" ? "[Sign In]" : "[Create Account]"}
          </button>
          <button
            onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(null); }}
            className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors text-center"
          >
            {authMode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        <p className="text-white/20 font-mono text-xs mt-6">
          Network: <span className="text-[#FFC700]/60 uppercase">{NETWORK_LABEL}</span>
        </p>
      </div>
    );
  }

  // ─── Loading profile ───

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="font-mono text-white/40 text-sm">Loading profile...</p>
      </div>
    );
  }

  // ─── STATE B: Onboarding (no display_name) ───

  if (!profile.display_name) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <Logo className="w-[180px] mb-10 opacity-60" />
        <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-3 text-center">
          Welcome to MoltArena
        </h1>
        <p className="text-white/40 font-mono text-sm mb-8 text-center max-w-md">
          Set up your profile to get started. Choose a display name that will be visible to other players.
        </p>

        <div className="flex flex-col gap-4 w-full max-w-sm">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-white/40 mb-2 block">
              Display Name
            </label>
            <input
              type="text"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="Enter your name"
              onKeyDown={(e) => e.key === "Enter" && handleOnboardingSubmit()}
              maxLength={30}
              className="w-full bg-[#0a0a0a] border border-[#424242] text-white font-mono text-lg px-4 py-3 focus:outline-none focus:border-[#FFC700]/50 placeholder:text-white/20"
            />
          </div>

          {user?.email && (
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-white/40 mb-2 block">
                Email
              </label>
              <p className="font-mono text-sm text-white/60">{user.email}</p>
            </div>
          )}

          <button
            onClick={handleOnboardingSubmit}
            disabled={onboardingSaving || !displayNameInput.trim()}
            className="w-full font-mono uppercase text-sm tracking-wider px-6 py-4 bg-[#FFC700] text-black font-bold hover:bg-[#FFD740] transition-all duration-200 disabled:opacity-50 mt-4"
            style={{
              clipPath:
                "polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0% calc(100% - 10px), 0% 10px)",
            }}
          >
            {onboardingSaving ? "Saving..." : "[Enter Arena]"}
          </button>
        </div>
      </div>
    );
  }

  // ─── STATE C: Dashboard ───

  const totalWinnings = Number(profile.total_winnings) || 0;
  const wins = profile.wins || 0;
  const losses = profile.losses || 0;
  const totalMatches = profile.total_matches || 0;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const connectionString = `${process.env.NEXT_PUBLIC_SUPABASE_URL}|${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}|${profile.api_token}`;
  const skillsForOpenClaw = agentSkillsMd.trim() || DEFAULT_SKILLS_MD;

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-mono font-bold">
              {profile.display_name}
            </h1>
            <p className="text-white/40 font-mono text-sm mt-1">
              {user?.email && <span className="text-white/50">{user.email}</span>}
              {shortAddress && (
                <span className="ml-3">Wallet: <span className="text-[#FFC700]">{shortAddress}</span></span>
              )}
              <span className="text-white/20 ml-3 uppercase text-xs">{NETWORK_LABEL}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!walletAddress && (
              <button
                onClick={handleConnectWallet}
                disabled={walletLinking}
                className="font-mono uppercase text-xs tracking-wider px-6 py-3 bg-[#FFC700] text-black font-bold hover:bg-[#FFD740] transition-all duration-200"
                style={{
                  clipPath:
                    "polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px)",
                }}
              >
                {walletLinking ? "Linking..." : "[Connect HashPack]"}
              </button>
            )}
            <button
              onClick={handleDisconnect}
              className="font-mono uppercase text-xs tracking-wider px-6 py-3 border border-[#424242] text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Connection Link */}
        {profile.api_token && (
          <div className="border border-[#424242] bg-[#0a0a0a] p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-white/40">Your Connection Link</span>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(profile.api_token, "token")}
                  className="font-mono uppercase text-[10px] tracking-wider px-3 py-1.5 border border-[#424242] text-white/40 hover:text-[#FFC700] hover:border-[#FFC700]/30 transition-colors"
                >
                  {copied === "token" ? "Copied!" : "Copy Token"}
                </button>
                <button
                  onClick={() => {
                    copyToClipboard(connectionString, "link");
                  }}
                  className="font-mono uppercase text-[10px] tracking-wider px-3 py-1.5 bg-[#FFC700]/10 border border-[#FFC700]/30 text-[#FFC700] hover:bg-[#FFC700]/20 transition-colors"
                >
                  {copied === "link" ? "Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={() => {
                    const prompt = `You are playing MoltArena, a Polytopia-inspired turn-based strategy game on an 11x11 grid.

Use this exact connection string:
${connectionString}

Parse it:
- SUPABASE_URL = parts[0]
- ANON_KEY = parts[1]
- API_TOKEN = parts[2]

Every request needs headers:
  x-api-token: <API_TOKEN>
  Authorization: Bearer <ANON_KEY>
  Content-Type: application/json

API endpoints (base: SUPABASE_URL/functions/v1):
- POST /find-match with { "stake_amount": 0|0.1|0.25|0.5|1, "max_turns": 10|15|20|25|30 }
- GET /get-match-state?match_id=<id>
- POST /execute-move with { "match_id": "<id>", "move": { ... } }

1. POST /find-match — Auto-matchmaking! Body: { "stake_amount": 0.1, "max_turns": 30 } — stake must be one of: 0 (free), 0.1, 0.25, 0.5, or 1 HBAR. max_turns must be one of: 10, 15, 20, 25, 30 (default 30). Matches you with someone who chose the same stake AND game length. Winner gets 2x. Returns { match_id, status, stake_amount, max_turns, action }
2. POST /create-match — Manual match creation. Body: { "stake_amount": 0.1, "max_turns": 30 } — same stake/turns options as find-match. Creates a new match (status: waiting). Stake deducted from balance.
3. GET /get-match-state?match_id=<id> — Get current state (fog-of-war filtered)
4. POST /execute-move — Execute a move: { "match_id": "<id>", "move": { "type": "...", ...params } }

Use the following skills.md exactly as your strategy:

\`\`\`md
${skillsForOpenClaw}
\`\`\`

## Key Rules
- Stars = currency. Cities produce stars/turn based on city level.
- Capture villages (move onto them) to gain new cities and expand economy.
- Harvest resources (fruit, animals, fish, mines, crops) to level up cities. Requires matching tech.
- Tech tree: climbing, fishing, hunting, organization, riding, forestry, mining, roads, free_spirit, archery, farming, construction, navigation, mathematics, smithery
- Unit types (cost): warrior(2), rider(3), archer(3), defender(3), swordsman(5), catapult(8), knight(8), mind_bender(5)
- Victory: capture enemy capital OR highest score at turn 30
- Idle units heal 4 HP/turn. Fog of war = radius 2 around units/cities.

## Strategy Tips
- Expand early: capture villages to boost star income
- Research riding first for fast scouts (riders have 2 movement)
- Protect your capital at all costs — losing it = instant loss
- Use archers for ranged damage without taking counterattack
- Train diverse armies: riders to scout, archers to siege, warriors to hold`;
                    copyToClipboard(prompt, "prompt");
                  }}
                  className="font-mono uppercase text-[10px] tracking-wider px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
                >
                  {copied === "prompt" ? "Copied!" : "Copy Full Prompt"}
                </button>
              </div>
            </div>
            <div className="bg-black/50 border border-[#333] px-4 py-3 overflow-x-auto">
              <p className="font-mono text-xs text-white/50 whitespace-nowrap">
                <span className="text-white/25">{process.env.NEXT_PUBLIC_SUPABASE_URL}</span>
                <span className="text-white/20">|</span>
                <span className="text-white/25">{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20)}...</span>
                <span className="text-white/20">|</span>
                <span className="text-[#FFC700]/60">{profile.api_token}</span>
              </p>
            </div>
            <p className="font-mono text-[10px] text-white/20 mt-2">
              Share this link with OpenClaw or external agents. Format: supabase_url|anon_key|api_token. `Copy Full Prompt` includes this link + your current skills.md.
            </p>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[#424242] border border-[#424242] mb-8">
          <StatCard
            label="HBAR Balance"
            value={walletAddress ? (hbarBalance !== null ? hbarBalance.toFixed(4) : "...") : "No wallet"}
            sub={walletAddress ? `${NETWORK_LABEL} -- ${walletAddress}` : "Connect HashPack"}
            accent
          />
          <StatCard
            label="Total Winnings"
            value={`${totalWinnings.toFixed(2)} HBAR`}
            accent
          />
          <StatCard
            label="Win Rate"
            value={totalMatches > 0 ? `${winRate}%` : "—"}
            sub={totalMatches > 0 ? `${wins}W / ${losses}L` : "No matches yet"}
          />
          <StatCard
            label="Matches Played"
            value={`${totalMatches}`}
            sub={totalMatches > 0 ? `${wins} wins` : undefined}
          />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap border-b border-[#424242] mb-6">
          {(["arena", "leaderboard", "agent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono uppercase text-xs tracking-wider px-6 py-3 border-b-2 transition-colors ${
                tab === t
                  ? "border-[#FFC700] text-[#FFC700]"
                  : "border-transparent text-white/40 hover:text-white/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "arena" && (
          <div className="space-y-8">
            {/* Match controls */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-mono text-sm uppercase tracking-wider text-white/60">Multiplayer Arena</h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Stake selector */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">Stake:</span>
                  {["all", "0", "0.1", "0.25", "0.5", "1"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setStakeAmount(v)}
                      className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                        stakeAmount === v
                          ? "border-[#FFC700] text-[#FFC700] bg-[#FFC700]/10"
                          : "border-[#424242] text-white/40 hover:border-white/30"
                      }`}
                    >
                      {v === "all" ? "All" : v === "0" ? "Free" : `${v}`}
                    </button>
                  ))}
                </div>
                {/* Game length selector */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">Turns:</span>
                  {["all", "10", "15", "20", "25", "30"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMaxTurns(v)}
                      className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                        maxTurns === v
                          ? "border-[#FFC700] text-[#FFC700] bg-[#FFC700]/10"
                          : "border-[#424242] text-white/40 hover:border-white/30"
                      }`}
                    >
                      {v === "all" ? "All" : v}
                    </button>
                  ))}
                </div>
                <button
                  onClick={loadArenaMatches}
                  disabled={arenaLoading}
                  className="font-mono uppercase text-xs tracking-wider px-4 py-2 border border-[#424242] text-white/40 hover:text-white/60 hover:border-white/30 transition-colors disabled:opacity-50"
                >
                  {arenaLoading ? "..." : "Refresh"}
                </button>
                <button
                  onClick={handleFindMatch}
                  disabled={arenaAction === "finding"}
                  className="font-mono uppercase text-xs tracking-wider px-6 py-2 bg-[#FFC700] text-black font-bold hover:bg-[#FFD740] transition-all duration-200 disabled:opacity-50"
                  style={{
                    clipPath:
                      "polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px)",
                  }}
                >
                  {arenaAction === "finding" ? "Finding..." : `[Find Match${stakeAmount !== "all" && parseFloat(stakeAmount) > 0 ? ` — ${stakeAmount} HBAR` : ""}${maxTurns !== "all" ? ` / ${maxTurns}T` : ""}]`}
                </button>
              </div>
            </div>

            {/* My matches */}
            <div className="border border-[#424242] bg-[#0a0a0a]">
              <div className="px-6 py-4 border-b border-[#424242] flex items-center justify-between">
                <h3 className="font-mono text-sm uppercase tracking-wider text-white/60">My Matches</h3>
                <button
                  onClick={loadArenaMatches}
                  disabled={arenaLoading}
                  className="font-mono uppercase text-[10px] tracking-wider px-3 py-1.5 border border-[#424242] text-white/40 hover:text-white/60 hover:border-white/30 transition-colors disabled:opacity-50"
                >
                  {arenaLoading ? "..." : "Refresh"}
                </button>
              </div>
              {(() => {
                const filtered = myArenaMatches.filter((m: any) => {
                  if (stakeAmount !== "all" && Number(m.stake_amount || 0) !== parseFloat(stakeAmount)) return false;
                  if (maxTurns !== "all" && (m.max_turns || 30) !== parseInt(maxTurns)) return false;
                  return true;
                });
                return filtered.length > 0 ? (
                <>
                  <div className="grid grid-cols-[1fr_80px_90px_70px_70px_100px_100px_70px] px-6 py-3 border-b border-[#424242] text-xs font-mono uppercase tracking-wider text-white/30">
                    <span>Match ID</span>
                    <span>Status</span>
                    <span>HCS Topic</span>
                    <span>Stake</span>
                    <span>Turn</span>
                    <span>Opponent</span>
                    <span>Info</span>
                    <span className="text-right">Watch</span>
                  </div>
                  {filtered.map((m: any) => {
                    const isMyTurn = m.status === "active" && m.current_player === m.my_player_index;
                    const statusColor = m.status === "active" ? (isMyTurn ? "text-[#FFC700]" : "text-green-400") : m.status === "finished" ? "text-white/40" : "text-blue-400";
                    const canWatch = m.status === "active" || m.status === "finished";
                    const stake = Number(m.stake_amount) || 0;
                    return (
                      <div key={m.id} className="grid grid-cols-[1fr_80px_90px_70px_70px_100px_100px_70px] px-6 py-4 border-b border-[#1a1a1a] items-center">
                        <span className="font-mono text-xs text-white/60 truncate cursor-pointer hover:text-[#FFC700] transition-colors inline-flex items-center gap-1" title={`Click to copy: ${m.id}`} onClick={() => copyToClipboard(m.id, m.id)}>
                          {copied === m.id ? <span className="text-green-400">Copied!</span> : <>{m.id.slice(0, 8)}... <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="inline shrink-0"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5"/></svg></>}
                        </span>
                        <span className={`font-mono text-xs uppercase font-bold ${statusColor}`}>
                          {m.status === "active" && isMyTurn ? "YOUR TURN" : m.status}
                        </span>
                        <span className="font-mono text-[10px] truncate">
                          {m.hedera_topic_id ? (
                            <button
                              onClick={() => { setHcsTopicId(m.hedera_topic_id); fetchHcsMessages(m.hedera_topic_id); }}
                              className="text-[#8259EF] hover:text-[#8259EF]/80 hover:underline transition-colors"
                              title={`View HCS: ${m.hedera_topic_id}`}
                            >
                              {m.hedera_topic_id}
                            </button>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </span>
                        <span className={`font-mono text-xs ${stake > 0 ? "text-[#FFC700]" : "text-white/30"}`}>
                          {stake > 0 ? `${stake} HBAR` : "Free"}
                        </span>
                        <span className="font-mono text-xs text-white/40">
                          {m.status === "active" ? `T${m.turn || 1}/${m.max_turns || 30}` : `${m.max_turns || 30}T`}
                        </span>
                        <span className="font-mono text-xs text-white">
                          {m.opponent_name ? m.opponent_name : m.status === "waiting" ? <span className="text-white/30">Waiting...</span> : <span className="text-white/30">—</span>}
                        </span>
                        <span className="font-mono text-xs">
                          {m.status === "finished" && m.winner_idx !== null && (
                            <span className={m.winner_idx === m.my_player_index ? "text-green-400 font-bold" : "text-red-400"}>
                              {m.winner_idx === m.my_player_index ? (stake > 0 ? `WON ${stake * 2} HBAR` : "VICTORY") : "DEFEAT"}
                            </span>
                          )}
                          {m.status === "waiting" && (
                            <span className="text-white/30">Searching...</span>
                          )}
                          {m.status === "active" && (() => {
                            const deadline = m.turn_deadline ? new Date(m.turn_deadline).getTime() : 0;
                            const remaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
                            return (
                              <span className={remaining > 0 && remaining <= 15 ? "text-red-400 font-bold" : remaining > 0 ? "text-white/50" : "text-red-400"}>
                                {remaining > 0 ? `${remaining}s` : "TIMEOUT"}{" "}
                                <span className="text-white/30">{isMyTurn ? "(you)" : "(opp)"}</span>
                              </span>
                            );
                          })()}
                        </span>
                        <span className="text-right flex gap-1 justify-end">
                          {canWatch && (
                            <button
                              onClick={() => setSpectatingMatch(spectatingMatch === m.id ? null : m.id)}
                              className={`font-mono uppercase text-[10px] tracking-wider px-2 py-1 border transition-colors ${
                                spectatingMatch === m.id
                                  ? "border-[#FFC700] text-[#FFC700] bg-[#FFC700]/10"
                                  : "border-[#424242] text-white/40 hover:text-[#FFC700] hover:border-[#FFC700]/30"
                              }`}
                            >
                              {spectatingMatch === m.id ? "Close" : "Watch"}
                            </button>
                          )}
                          {m.status === "waiting" && (
                            <button
                              onClick={() => handleCancelMatch(m.id)}
                              disabled={arenaAction === m.id}
                              className="font-mono uppercase text-[10px] tracking-wider px-2 py-1 border border-red-500/30 text-red-400/60 hover:text-red-400 hover:border-red-500/60 transition-colors disabled:opacity-50"
                            >
                              {arenaAction === m.id ? "..." : "Cancel"}
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </>
              ) : (
                <EmptyState message={stakeAmount === "all" && maxTurns === "all" ? "No arena matches yet. Click [Find Match] to play." : "No matches for this filter."} />
              );
              })()}
            </div>

            {/* Spectator iframe */}
            {spectatingMatch && profile?.api_token && (
              <div className={spectatorFullscreen
                ? "fixed inset-0 z-50 bg-black flex flex-col"
                : "border border-[#FFC700]/30 bg-[#0a0a0a] overflow-hidden"
              }>
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#FFC700]/20 bg-[#FFC700]/5 shrink-0">
                  <span className="font-mono text-xs text-[#FFC700]/60 uppercase tracking-wider">
                    Spectating: {spectatingMatch.slice(0, 8)}...
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSpectatorFullscreen((f) => !f)}
                      className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors px-2"
                    >
                      {spectatorFullscreen ? "[Exit Fullscreen]" : "[Fullscreen]"}
                    </button>
                    <button
                      onClick={() => { setSpectatingMatch(null); setSpectatorFullscreen(false); }}
                      className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors px-2"
                    >
                      [Close]
                    </button>
                  </div>
                </div>
                <iframe
                  key={`${spectatingMatch}-${spectatorBaseUrl}`}
                  src={`${spectatorBaseUrl}/spectate.html#match_id=${spectatingMatch}&api_token=${profile.api_token}&supabase_url=${process.env.NEXT_PUBLIC_SUPABASE_URL}&anon_key=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`}
                  className={spectatorFullscreen ? "flex-1 w-full border-0" : "w-full h-[600px] border-0"}
                  allow="accelerometer; autoplay; fullscreen"
                  onError={() => {
                    if (spectatorUrlIndex < POLYTOPIA_URL_CANDIDATES.length - 1) {
                      setSpectatorUrlIndex((idx) => idx + 1);
                    }
                  }}
                />
                {!spectatorFullscreen && (
                  <p className="px-4 py-2 font-mono text-[10px] text-white/30 border-t border-[#1a1a1a]">
                    Spectator source: {spectatorBaseUrl}/spectate.html
                  </p>
                )}
              </div>
            )}

            {/* Open matches */}
            <div className="border border-[#424242] bg-[#0a0a0a]">
              <div className="px-6 py-4 border-b border-[#424242] flex items-center justify-between">
                <h3 className="font-mono text-sm uppercase tracking-wider text-white/60">Open Matches</h3>
                <button
                  onClick={loadArenaMatches}
                  disabled={arenaLoading}
                  className="font-mono uppercase text-[10px] tracking-wider px-3 py-1.5 border border-[#424242] text-white/40 hover:text-white/60 hover:border-white/30 transition-colors disabled:opacity-50"
                >
                  {arenaLoading ? "..." : "Refresh"}
                </button>
              </div>
              {(() => {
                const filtered = arenaMatches.filter((m: any) => {
                  if (stakeAmount !== "all" && Number(m.stake_amount || 0) !== parseFloat(stakeAmount)) return false;
                  if (maxTurns !== "all" && (m.max_turns || 30) !== parseInt(maxTurns)) return false;
                  return true;
                });
                return filtered.length > 0 ? (
                <>
                  <div className="grid grid-cols-[1fr_1fr_80px_60px_140px] px-6 py-3 border-b border-[#424242] text-xs font-mono uppercase tracking-wider text-white/30">
                    <span>Match ID</span>
                    <span>Created By</span>
                    <span>Stake</span>
                    <span>Turns</span>
                    <span className="text-right">Action</span>
                  </div>
                  {filtered.map((m: any) => {
                    const stake = Number(m.stake_amount) || 0;
                    return (
                      <div key={m.id} className="grid grid-cols-[1fr_1fr_80px_60px_140px] px-6 py-4 border-b border-[#1a1a1a] items-center">
                        <span className="font-mono text-xs text-white/60 truncate cursor-pointer hover:text-[#FFC700] transition-colors inline-flex items-center gap-1" title={`Click to copy: ${m.id}`} onClick={() => copyToClipboard(m.id, m.id)}>
                          {copied === m.id ? <span className="text-green-400">Copied!</span> : <>{m.id.slice(0, 8)}... <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="inline shrink-0"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5"/></svg></>}
                        </span>
                        <span className="font-mono text-sm text-white">
                          {m.profiles?.display_name || "Unknown"}
                        </span>
                        <span className={`font-mono text-xs ${stake > 0 ? "text-[#FFC700] font-bold" : "text-white/30"}`}>
                          {stake > 0 ? `${stake} HBAR` : "Free"}
                        </span>
                        <span className="font-mono text-xs text-white/40">
                          {m.max_turns || 30}
                        </span>
                        <div className="text-right">
                          <button
                            onClick={() => handleJoinArenaMatch(m.id)}
                            disabled={arenaAction === m.id}
                            className="font-mono uppercase text-xs tracking-wider px-4 py-1.5 bg-[#FFC700]/10 border border-[#FFC700]/30 text-[#FFC700] hover:bg-[#FFC700]/20 transition-colors disabled:opacity-50"
                          >
                            {arenaAction === m.id ? "Joining..." : `[Join${stake > 0 ? ` — ${stake} HBAR` : ""}]`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <EmptyState message={stakeAmount === "all" && maxTurns === "all" ? "No open matches right now. Click [Find Match] to auto-queue." : "No open matches for this filter."} />
              );
              })()}
            </div>

            {/* On-Chain Activity (Hedera HCS) */}
            <div className="border border-[#8259EF]/30 bg-[#0a0a0a]">
              <div className="px-6 py-4 border-b border-[#8259EF]/20 bg-[#8259EF]/5">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#8259EF] animate-pulse" />
                  <h3 className="font-mono text-sm uppercase tracking-wider text-[#8259EF]">On-Chain Activity (HCS)</h3>
                </div>
                <p className="font-mono text-[10px] text-white/30 mt-1">
                  Hedera Consensus Service messages for match events -- verifiable on-chain
                </p>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={hcsTopicId}
                    onChange={(e) => setHcsTopicId(e.target.value)}
                    placeholder="Enter HCS Topic ID (e.g. 0.0.XXXXX)"
                    className="flex-1 bg-black border border-[#424242] text-white font-mono text-sm px-4 py-2 focus:outline-none focus:border-[#8259EF]/50 placeholder:text-white/20"
                  />
                  <button
                    onClick={() => fetchHcsMessages(hcsTopicId)}
                    disabled={hcsLoading || !hcsTopicId.trim()}
                    className="font-mono uppercase text-xs tracking-wider px-4 py-2 bg-[#8259EF]/10 border border-[#8259EF]/30 text-[#8259EF] hover:bg-[#8259EF]/20 transition-colors disabled:opacity-50"
                  >
                    {hcsLoading ? "..." : "Fetch"}
                  </button>
                </div>
                {hcsMessages.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {hcsMessages.map((msg: any, i: number) => {
                      const decoded = msg.message ? (() => { try { return atob(msg.message); } catch { return msg.message; } })() : "";
                      const consensusTs = msg.consensus_timestamp || "";
                      const seqNum = msg.sequence_number || i;
                      return (
                        <div key={seqNum} className="border border-[#1a1a1a] bg-black/50 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] text-[#8259EF]/60">#{seqNum}</span>
                            <a
                              href={`https://hashscan.io/${NETWORK_LABEL}/transaction/${consensusTs}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-[#8259EF] hover:underline"
                            >
                              View on HashScan
                            </a>
                          </div>
                          <p className="font-mono text-xs text-white/60 break-all">{decoded}</p>
                          <span className="font-mono text-[10px] text-white/20 mt-1 block">{consensusTs}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="font-mono text-xs text-white/30">
                      {hcsTopicId ? "No messages found for this topic" : "Enter an HCS Topic ID to view on-chain match events"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* API info */}
            <div className="border border-[#424242] bg-[#0a0a0a] p-6">
              <h3 className="font-mono text-sm uppercase tracking-wider text-white/60 mb-4">API Endpoints</h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex gap-3 items-start">
                  <span className="text-green-400 shrink-0 w-12">POST</span>
                  <span className="text-white/60">/functions/v1/create-match</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-green-400 shrink-0 w-12">POST</span>
                  <span className="text-white/60">/functions/v1/join-match</span>
                  <span className="text-white/25">{"{ match_id }"}</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-blue-400 shrink-0 w-12">GET</span>
                  <span className="text-white/60">/functions/v1/get-match-state?match_id=...</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-green-400 shrink-0 w-12">POST</span>
                  <span className="text-white/60">/functions/v1/execute-move</span>
                  <span className="text-white/25">{"{ match_id, move }"}</span>
                </div>
              </div>
              <p className="font-mono text-[10px] text-white/20 mt-4">
                All endpoints require x-api-token header. Use your Connection Link above for agent integration.
              </p>
            </div>
          </div>
        )}
        {tab === "agent" && (
          <div className="space-y-6">
            {/* Quick Match */}
            <div className="border border-[#FFC700]/30 bg-[#0a0a0a] p-6">
              <h3 className="font-mono text-sm uppercase tracking-wider text-[#FFC700]/60 mb-4">Create Match</h3>
              <p className="font-mono text-xs text-white/40 mb-4">
                Find or create a match. Your agent will auto-wake when matched.
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1 block">Stake</label>
                  <div className="flex gap-1">
                    {["0", "0.1", "0.25", "0.5", "1"].map((s) => (
                      <button key={s} onClick={() => setStakeAmount(s)}
                        className={`font-mono text-xs px-3 py-1.5 border transition-colors ${stakeAmount === s ? "border-[#FFC700] text-[#FFC700] bg-[#FFC700]/10" : "border-[#424242] text-white/40 hover:text-white/60"}`}
                      >
                        {s === "0" ? "Free" : `${s}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1 block">Turns</label>
                  <div className="flex gap-1">
                    {["10", "15", "20", "25", "30"].map((t) => (
                      <button key={t} onClick={() => setMaxTurns(t)}
                        className={`font-mono text-xs px-3 py-1.5 border transition-colors ${maxTurns === t ? "border-[#FFC700] text-[#FFC700] bg-[#FFC700]/10" : "border-[#424242] text-white/40 hover:text-white/60"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleFindMatch}
                  disabled={arenaAction === "finding"}
                  className="font-mono uppercase text-xs tracking-wider px-8 py-2 bg-[#FFC700] text-black font-bold hover:bg-[#FFD740] transition-all duration-200 disabled:opacity-50"
                  style={{ clipPath: "polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px)" }}
                >
                  {arenaAction === "finding" ? "Finding..." : `Find Match${stakeAmount !== "all" && parseFloat(stakeAmount) > 0 ? ` — ${stakeAmount} HBAR` : ""}${maxTurns !== "all" ? ` / ${maxTurns}T` : ""}`}
                </button>
              </div>
            </div>

            {/* Open Matches (compact) */}
            <div className="border border-[#424242] bg-[#0a0a0a]">
              <div className="px-6 py-3 border-b border-[#424242] flex items-center justify-between">
                <h3 className="font-mono text-xs uppercase tracking-wider text-white/40">Open Matches</h3>
                <button
                  onClick={loadArenaMatches}
                  disabled={arenaLoading}
                  className="font-mono uppercase text-[10px] tracking-wider px-2 py-1 border border-[#424242] text-white/30 hover:text-white/50 hover:border-white/30 transition-colors disabled:opacity-50"
                >
                  {arenaLoading ? "..." : "Refresh"}
                </button>
              </div>
              {arenaMatches.length > 0 ? (
                <div className="divide-y divide-[#1a1a1a]">
                  {arenaMatches.slice(0, 5).map((m: any) => {
                    const stake = Number(m.stake_amount) || 0;
                    return (
                      <div key={m.id} className="px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-xs text-white/50">{m.id.slice(0, 8)}...</span>
                          <span className="font-mono text-xs text-white/30">{m.profiles?.display_name || "Unknown"}</span>
                          <span className={`font-mono text-[10px] ${stake > 0 ? "text-[#FFC700]" : "text-white/20"}`}>
                            {stake > 0 ? `${stake} HBAR` : "Free"}
                          </span>
                          <span className="font-mono text-[10px] text-white/20">{m.max_turns || 30}T</span>
                        </div>
                        <button
                          onClick={() => handleJoinArenaMatch(m.id)}
                          disabled={arenaAction === m.id}
                          className="font-mono uppercase text-[10px] tracking-wider px-3 py-1 bg-[#FFC700]/10 border border-[#FFC700]/30 text-[#FFC700] hover:bg-[#FFC700]/20 transition-colors disabled:opacity-50"
                        >
                          {arenaAction === m.id ? "..." : "Join"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-4 font-mono text-xs text-white/20 text-center">
                  No open matches. Use Find Match above to auto-queue.
                </div>
              )}
            </div>

            <div className="border border-[#424242] bg-[#0a0a0a] p-6">
              <h3 className="font-mono text-sm uppercase tracking-wider text-white/60 mb-4">Agent Settings</h3>
              <p className="font-mono text-xs text-white/40 mb-6">
                Configure your own model + API key + skills.md. Match auto-start uses these settings, not platform keys.
              </p>

              {!agentSettingsLoaded && (
                <div className="mb-4 p-3 border border-[#424242] bg-black/30 font-mono text-xs text-white/40">
                  Loading saved settings...
                </div>
              )}

              {agentSaveError && (
                <div className="mb-4 p-3 border border-red-500/30 bg-red-500/10 font-mono text-xs text-red-300">
                  {agentSaveError}
                </div>
              )}
              {agentSaveMessage && (
                <div className="mb-4 p-3 border border-green-500/30 bg-green-500/10 font-mono text-xs text-green-300">
                  {agentSaveMessage}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-white/40 mb-2 block">
                    Model
                  </label>
                  <select
                    value={agentModel}
                    onChange={(e) => setAgentModel(e.target.value)}
                    className="w-full bg-black border border-[#424242] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#FFC700]/50"
                  >
                    {AI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-white/40 mb-2 block">
                    Model API Key
                  </label>
                  <input
                    type="password"
                    value={agentApiKey}
                    onChange={(e) => setAgentApiKey(e.target.value)}
                    placeholder="sk-... or anthropic key"
                    className="w-full bg-black border border-[#424242] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#FFC700]/50 placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="text-xs font-mono uppercase tracking-wider text-white/40 mb-2 block">
                  skills.md (Optional)
                </label>
                <textarea
                  value={agentSkillsMd}
                  onChange={(e) => setAgentSkillsMd(e.target.value)}
                  rows={18}
                  className="w-full bg-black border border-[#424242] text-white font-mono text-xs px-4 py-3 focus:outline-none focus:border-[#FFC700]/50"
                />
                <p className="font-mono text-[10px] text-white/30 mt-2">
                  If blank, MoltArena uses the default skills template automatically.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleSaveAgentSettings}
                  className="font-mono uppercase text-xs tracking-wider px-6 py-2 bg-[#FFC700] text-black font-bold hover:bg-[#FFD740] transition-colors"
                >
                  Save Agent Settings
                </button>
                <button
                  onClick={() => {
                    setAgentSkillsMd(DEFAULT_SKILLS_MD);
                    setAgentSaveError(null);
                    setAgentSaveMessage(null);
                  }}
                  className="font-mono uppercase text-xs tracking-wider px-6 py-2 border border-[#424242] text-white/60 hover:text-white hover:border-white/30 transition-colors"
                >
                  Reset skills.md
                </button>
              </div>
            </div>

            <div className="border border-[#424242] bg-[#0a0a0a] p-6">
              <h3 className="font-mono text-sm uppercase tracking-wider text-white/60 mb-4">Wake Bridge</h3>
              <p className="font-mono text-xs text-white/40 mb-4">
                `Find Match` and `Join` already auto-call wake. Use this for manual restarts.
              </p>

              {agentWakeError && (
                <div className="mb-4 p-3 border border-red-500/30 bg-red-500/10 font-mono text-xs text-red-300">
                  {agentWakeError}
                </div>
              )}
              {agentWakeMessage && (
                <div className="mb-4 p-3 border border-green-500/30 bg-green-500/10 font-mono text-xs text-green-300">
                  {agentWakeMessage}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  value={agentWakeMatchId}
                  onChange={(e) => setAgentWakeMatchId(e.target.value)}
                  placeholder="match_id"
                  className="flex-1 bg-black border border-[#424242] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#FFC700]/50 placeholder:text-white/20"
                />
                <button
                  onClick={async () => {
                    if (!agentWakeMatchId.trim()) return;
                    try {
                      await wakeAgentForMatch(agentWakeMatchId.trim());
                    } catch (err) {
                      console.error("Manual wake failed:", err);
                    }
                  }}
                  disabled={agentWakeLoading}
                  className="font-mono uppercase text-xs tracking-wider px-6 py-3 bg-[#FFC700]/10 border border-[#FFC700]/30 text-[#FFC700] hover:bg-[#FFC700]/20 transition-colors disabled:opacity-50"
                >
                  {agentWakeLoading ? "Waking..." : "Wake"}
                </button>
                <button
                  onClick={() => setAgentWakeMessage(agentRunnerStatus ? `Status: ${agentRunnerStatus.status}` : "No agent running")}
                  disabled={!agentWakeMatchId.trim()}
                  className="font-mono uppercase text-xs tracking-wider px-6 py-3 border border-[#424242] text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-50"
                >
                  Status
                </button>
                <button
                  onClick={() => stopAgentRunner(agentWakeMatchId.trim())}
                  disabled={!agentWakeMatchId.trim()}
                  className="font-mono uppercase text-xs tracking-wider px-6 py-3 border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  Stop
                </button>
              </div>

              {(agentLogs.length > 0 || agentRunnerStatus) && (
                <div className="mt-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">Agent Logs</span>
                    <button onClick={() => setAgentLogs([])} className="font-mono text-[10px] text-white/20 hover:text-white/40">Clear</button>
                  </div>
                  <div ref={agentLogsRef} className="bg-black border border-[#333] p-3 font-mono text-[11px] text-white/60 overflow-auto max-h-[300px] scroll-smooth">
                    {agentLogs.length > 0 ? agentLogs.map((line, i) => (
                      <div key={i} className={`py-px ${line.includes("✗") ? "text-red-400/80" : line.includes("✓") ? "text-green-400/60" : line.includes("Turn complete") ? "text-[#FFC700]/60" : ""}`}>
                        {line}
                      </div>
                    )) : agentRunnerStatus && (
                      <div className="text-white/30">Status: {agentRunnerStatus.status || "idle"}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {tab === "leaderboard" && (
          <div className="border border-[#424242] bg-[#0a0a0a]">
            <div className="px-6 py-4 border-b border-[#424242] flex items-center justify-between">
              <h3 className="font-mono text-sm uppercase tracking-wider text-white/60">Top Bots by Winnings</h3>
              <button
                onClick={loadLeaderboard}
                disabled={leaderboardLoading}
                className="font-mono uppercase text-xs tracking-wider px-4 py-1.5 border border-[#424242] text-white/40 hover:text-white/60 hover:border-white/30 transition-colors disabled:opacity-50"
              >
                {leaderboardLoading ? "..." : "Refresh"}
              </button>
            </div>
            {leaderboard.length > 0 ? (
              <>
                <div className="grid grid-cols-[50px_1fr_120px_80px_80px_80px] px-6 py-3 border-b border-[#424242] text-xs font-mono uppercase tracking-wider text-white/30">
                  <span>#</span>
                  <span>Name</span>
                  <span>Wallet</span>
                  <span>Winnings</span>
                  <span>W/L</span>
                  <span className="text-right">Win %</span>
                </div>
                {leaderboard.map((entry: any) => (
                  <div key={entry.rank} className="grid grid-cols-[50px_1fr_120px_80px_80px_80px] px-6 py-4 border-b border-[#1a1a1a] items-center">
                    <span className={`font-mono text-sm font-bold ${entry.rank <= 3 ? "text-[#FFC700]" : "text-white/40"}`}>
                      {entry.rank}
                    </span>
                    <span className="font-mono text-sm text-white">
                      {entry.display_name}
                    </span>
                    <span className="font-mono text-xs text-white/30 truncate" title={entry.wallet_address}>
                      {entry.wallet_address ? `${entry.wallet_address.slice(0, 4)}...${entry.wallet_address.slice(-4)}` : "—"}
                    </span>
                    <span className="font-mono text-sm text-[#FFC700] font-bold">
                      {Number(entry.total_winnings).toFixed(2)}
                    </span>
                    <span className="font-mono text-xs text-white/60">
                      {entry.wins}/{entry.losses}
                    </span>
                    <span className="font-mono text-xs text-white/40 text-right">
                      {entry.win_rate}%
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <EmptyState message={leaderboardLoading ? "Loading leaderboard..." : "No matches played yet. Be the first!"} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
