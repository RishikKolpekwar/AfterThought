import { create } from 'zustand';
import { SimulationResult, ComparisonDelta, Scenario } from '../types/grid';
import { compareResults } from '../sim/engine';

type RunStatus = 'idle' | 'running' | 'done' | 'error';

interface SimulationStore {
  status: RunStatus;
  results: SimulationResult[];           // immutable run history
  currentResult: SimulationResult | null;
  baselineResult: SimulationResult | null;
  comparisonDelta: ComparisonDelta | null;

  // Timeline playback
  timelinePosition: number;             // current timestep (0 → scenario.durationHours)
  isPlaying: boolean;
  playbackSpeed: number;                // 1x, 2x, 4x

  // Drawer toggles
  showEventLog: boolean;
  showComparePanel: boolean;
  showExportModal: boolean;

  // Actions
  startRun: () => void;
  completeRun: (result: SimulationResult) => void;
  failRun: (error: string) => void;
  setCurrentResult: (result: SimulationResult) => void;
  setBaselineResult: (result: SimulationResult) => void;
  computeComparison: () => void;
  clearComparison: () => void;

  setTimelinePosition: (t: number) => void;
  setIsPlaying: (v: boolean) => void;
  setPlaybackSpeed: (v: number) => void;

  toggleEventLog: () => void;
  toggleComparePanel: () => void;
  toggleExportModal: () => void;

  // Timeline-aware event log
  visibleEvents: (scenario: Scenario) => SimulationResult['eventLog'];
  nodeStatusAtTime: (nodeId: string) => 'operational' | 'failed';
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  status: 'idle',
  results: [],
  currentResult: null,
  baselineResult: null,
  comparisonDelta: null,

  timelinePosition: 0,
  isPlaying: false,
  playbackSpeed: 1,

  showEventLog: false,
  showComparePanel: false,
  showExportModal: false,

  startRun: () => set({ status: 'running', timelinePosition: 0, isPlaying: false }),

  completeRun: (result) => {
    set((state) => ({
      status: 'done',
      currentResult: result,
      results: [...state.results, result],
      timelinePosition: 0,
    }));
  },

  failRun: (_error) => set({ status: 'error' }),

  setCurrentResult: (result) => set({ currentResult: result, timelinePosition: 0 }),

  setBaselineResult: (result) => {
    set({ baselineResult: result });
    get().computeComparison();
  },

  computeComparison: () => {
    const { baselineResult, currentResult } = get();
    if (!baselineResult || !currentResult) return;
    const delta = compareResults(baselineResult, currentResult);
    set({ comparisonDelta: delta });
  },

  clearComparison: () =>
    set({ baselineResult: null, comparisonDelta: null, showComparePanel: false }),

  setTimelinePosition: (t) => set({ timelinePosition: t }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setPlaybackSpeed: (v) => set({ playbackSpeed: v }),

  toggleEventLog: () => set((s) => ({ showEventLog: !s.showEventLog })),
  toggleComparePanel: () => set((s) => ({ showComparePanel: !s.showComparePanel })),
  toggleExportModal: () => set((s) => ({ showExportModal: !s.showExportModal })),

  visibleEvents: (_scenario) => {
    const { currentResult, timelinePosition } = get();
    if (!currentResult) return [];
    return currentResult.eventLog.filter((e) => e.timestep <= timelinePosition);
  },

  nodeStatusAtTime: (nodeId) => {
    const { currentResult, timelinePosition } = get();
    if (!currentResult) return 'operational';
    const history = currentResult.nodeStatusHistory[nodeId];
    if (!history) return 'operational';
    const idx = Math.min(timelinePosition, history.length - 1);
    return history[idx] ?? 'operational';
  },
}));
