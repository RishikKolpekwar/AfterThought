import { create } from 'zustand';
import { PlanVersion, Role, Project, Assumptions } from '../types/grid';
import { mockScenarios, defaultAssumptions, regulatorAssumptions, advocateAssumptions } from '../data/mockAustin';
import { applyProject, removeProject, getTotalCapex, getBudgetRemaining } from '../sim/engine';

const ROLE_ASSUMPTIONS: Record<Role, Assumptions> = {
  utility_planner: defaultAssumptions,
  regulator: regulatorAssumptions,
  advocate: advocateAssumptions,
};

function makePlanId(role: Role): string {
  return `plan_${role}_${Date.now().toString(36)}`;
}

function makeInitialPlan(role: Role): PlanVersion {
  return {
    id: makePlanId(role),
    name: `${role.replace('_', ' ')} — Base Plan`,
    role,
    projects: [],
    assumptions: { ...ROLE_ASSUMPTIONS[role] },
    createdAt: new Date().toISOString(),
  };
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface PlanStore {
  role: Role;
  currentPlan: PlanVersion;
  baselinePlan: PlanVersion | null;  // locked baseline for comparison
  selectedScenarioId: string;
  activeSeed: number;

  // Layer toggles for 3D viewport
  layerMode: 'outage' | 'income' | 'vulnerability' | 'infra-age';

  // Actions
  setRole: (role: Role) => void;
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
  setAssumption: <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => void;
  setScenario: (scenarioId: string) => void;
  setSeed: (seed: number) => void;
  lockBaseline: () => void;
  resetPlan: () => void;
  setLayerMode: (mode: PlanStore['layerMode']) => void;

  // Derived helpers (non-reactive — call inside components)
  totalCapex: () => number;
  budgetRemaining: () => number;
  overBudget: () => boolean;
  selectedScenario: () => (typeof mockScenarios)[0] | undefined;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePlanStore = create<PlanStore>((set, get) => ({
  role: 'utility_planner',
  currentPlan: makeInitialPlan('utility_planner'),
  baselinePlan: null,
  selectedScenarioId: mockScenarios[0].id,
  activeSeed: 42,
  layerMode: 'outage',

  setRole: (role) => {
    const plan = makeInitialPlan(role);
    set({ role, currentPlan: plan, baselinePlan: null });
  },

  addProject: (project) => {
    const { currentPlan } = get();
    if (getTotalCapex(currentPlan) + project.capexUSD > currentPlan.assumptions.budgetCapUSD) {
      // Over budget — still allow but flag via overBudget()
    }
    const updated = applyProject(currentPlan, project);
    set({ currentPlan: updated });
  },

  removeProject: (projectId) => {
    const { currentPlan } = get();
    const updated = removeProject(currentPlan, projectId);
    set({ currentPlan: updated });
  },

  setAssumption: (key, value) => {
    set((state) => ({
      currentPlan: {
        ...state.currentPlan,
        assumptions: { ...state.currentPlan.assumptions, [key]: value },
        createdAt: new Date().toISOString(),
      },
    }));
  },

  setScenario: (scenarioId) => set({ selectedScenarioId: scenarioId }),
  setSeed: (seed) => set({ activeSeed: seed }),

  lockBaseline: () => {
    const { currentPlan } = get();
    set({ baselinePlan: { ...currentPlan } });
  },

  resetPlan: () => {
    const { role } = get();
    set({ currentPlan: makeInitialPlan(role), baselinePlan: null });
  },

  setLayerMode: (mode) => set({ layerMode: mode }),

  totalCapex: () => getTotalCapex(get().currentPlan),
  budgetRemaining: () => getBudgetRemaining(get().currentPlan),
  overBudget: () => getBudgetRemaining(get().currentPlan) < 0,
  selectedScenario: () =>
    mockScenarios.find((s) => s.id === get().selectedScenarioId),
}));
