import { executeAgentTurn } from "@/lib/agent-turn";

type RunnerInput = {
  matchId: string;
  apiToken: string;
  model: string;
  apiKey: string;
  skillsMd?: string;
};

type RunnerStatus = "running" | "finished" | "stopped" | "error";

type RunnerState = {
  matchId: string;
  status: RunnerStatus;
  model: string;
  startedAt: string;
  updatedAt: string;
  lastResult: unknown;
  lastError: string | null;
  consecutiveErrors: number;
  intervalId?: NodeJS.Timeout;
  inFlight: boolean;
};

type RunnerStore = Map<string, RunnerState>;

declare global {
  // eslint-disable-next-line no-var
  var __moltArenaRunnerStore: RunnerStore | undefined;
}

function store(): RunnerStore {
  if (!global.__moltArenaRunnerStore) {
    global.__moltArenaRunnerStore = new Map<string, RunnerState>();
  }
  return global.__moltArenaRunnerStore;
}

function snapshot(state: RunnerState) {
  return {
    matchId: state.matchId,
    status: state.status,
    model: state.model,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
    lastResult: state.lastResult,
    lastError: state.lastError,
    consecutiveErrors: state.consecutiveErrors,
    running: !!state.intervalId,
  };
}

export function getRunnerStatus(matchId: string) {
  const st = store().get(matchId);
  if (!st) return null;
  return snapshot(st);
}

export function getAllRunnerStatuses() {
  return Array.from(store().values()).map(snapshot);
}

export function stopRunner(matchId: string) {
  const st = store().get(matchId);
  if (!st) return { stopped: false, reason: "not_found" };

  if (st.intervalId) {
    clearInterval(st.intervalId);
    st.intervalId = undefined;
  }

  st.status = "stopped";
  st.updatedAt = new Date().toISOString();
  st.lastError = st.lastError || null;

  return { stopped: true };
}

export async function startRunner(input: RunnerInput) {
  const { matchId, apiToken, model, apiKey, skillsMd } = input;

  if (!matchId || !apiToken || !model || !apiKey) {
    throw new Error("Missing required fields: matchId, apiToken, model, apiKey");
  }

  stopRunner(matchId);

  const initial: RunnerState = {
    matchId,
    model,
    status: "running",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastResult: { status: "booting" },
    lastError: null,
    consecutiveErrors: 0,
    inFlight: false,
  };

  const runners = store();
  runners.set(matchId, initial);

  const tick = async () => {
    const st = runners.get(matchId);
    if (!st || st.status !== "running" || st.inFlight) return;

    st.inFlight = true;
    st.updatedAt = new Date().toISOString();

    try {
      const result = await executeAgentTurn({
        matchId,
        apiToken,
        model,
        apiKey,
        skillsMd,
      });

      st.lastResult = result;
      st.updatedAt = new Date().toISOString();

      if (result.status === "game_over") {
        st.status = "finished";
        if (st.intervalId) {
          clearInterval(st.intervalId);
          st.intervalId = undefined;
        }
      }

      if (result.status === "error") {
        st.lastError = typeof result.error === "string" ? result.error : "Unknown runner error";
        st.consecutiveErrors += 1;

        if (st.consecutiveErrors >= 5) {
          st.status = "error";
          if (st.intervalId) {
            clearInterval(st.intervalId);
            st.intervalId = undefined;
          }
        }
      } else {
        st.lastError = null;
        st.consecutiveErrors = 0;
      }
    } catch (err: any) {
      st.lastError = err?.message || "Runner tick failed";
      st.lastResult = { status: "error", error: st.lastError };
      st.updatedAt = new Date().toISOString();
      st.consecutiveErrors += 1;

      if (st.consecutiveErrors >= 5) {
        st.status = "error";
        if (st.intervalId) {
          clearInterval(st.intervalId);
          st.intervalId = undefined;
        }
      }
    } finally {
      const latest = runners.get(matchId);
      if (latest) latest.inFlight = false;
    }
  };

  initial.intervalId = setInterval(tick, 4000);
  await tick();

  return snapshot(initial);
}
