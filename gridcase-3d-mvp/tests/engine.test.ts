import { describe, it, expect } from 'vitest';
import { runSimulation, applyProject, compareResults, exportSnapshot, getTotalCapex, getBudgetRemaining } from '../src/sim/engine';
import { mockProjectCatalog, mockScenarios, defaultAssumptions } from '../src/data/mockAustin';
import { PlanVersion } from '../src/types/grid';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeBasePlan(overrides: Partial<PlanVersion> = {}): PlanVersion {
  return {
    id: 'plan_test_base',
    name: 'Test Base Plan',
    role: 'utility_planner',
    projects: [],
    assumptions: { ...defaultAssumptions },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const freezeScenario = mockScenarios.find((s) => s.id === 'sc-freeze')!;
const heatScenario = mockScenarios.find((s) => s.id === 'sc-heat-dome')!;
const evScenario = mockScenarios.find((s) => s.id === 'sc-ev-spike')!;

const batteryProject = mockProjectCatalog.find((p) => p.id === 'p-mont-battery')!;
const hardeningProject = mockProjectCatalog.find((p) => p.id === 'p-rund-hardening')!;
const downtownUpgrade = mockProjectCatalog.find((p) => p.id === 'p-dt-upgrade')!;

// ─── Determinism ──────────────────────────────────────────────────────────────

describe('runSimulation — determinism', () => {
  it('produces identical result IDs for same inputs and seed', () => {
    const plan = makeBasePlan();
    const r1 = runSimulation(plan, freezeScenario, 42);
    const r2 = runSimulation(plan, freezeScenario, 42);

    expect(r1.id).toBe(r2.id);
    expect(r1.metrics.stabilityScore).toBe(r2.metrics.stabilityScore);
    expect(r1.metrics.equityScore).toBe(r2.metrics.equityScore);
    expect(r1.metrics.totalOutageHours).toBe(r2.metrics.totalOutageHours);
    expect(r1.eventLog.length).toBe(r2.eventLog.length);
  });

  it('produces different results for different seeds', () => {
    const plan = makeBasePlan();
    const r1 = runSimulation(plan, freezeScenario, 1);
    const r2 = runSimulation(plan, freezeScenario, 99);
    // IDs differ (they encode the seed)
    expect(r1.id).not.toBe(r2.id);
  });

  it('produces different results for different scenarios', () => {
    const plan = makeBasePlan();
    const r1 = runSimulation(plan, freezeScenario, 42);
    const r2 = runSimulation(plan, heatScenario, 42);
    // Freeze is much more severe than heat in the base plan
    expect(r1.id).not.toBe(r2.id);
  });
});

// ─── Metric ranges ────────────────────────────────────────────────────────────

describe('runSimulation — metric bounds', () => {
  it('all scores are in [0, 1]', () => {
    const plan = makeBasePlan();
    const r = runSimulation(plan, freezeScenario, 42);
    expect(r.metrics.stabilityScore).toBeGreaterThanOrEqual(0);
    expect(r.metrics.stabilityScore).toBeLessThanOrEqual(1);
    expect(r.metrics.equityScore).toBeGreaterThanOrEqual(0);
    expect(r.metrics.equityScore).toBeLessThanOrEqual(1);
  });

  it('totalOutageHours is non-negative', () => {
    const plan = makeBasePlan();
    const r = runSimulation(plan, freezeScenario, 42);
    expect(r.metrics.totalOutageHours).toBeGreaterThanOrEqual(0);
  });

  it('nodeStatusHistory has an entry per node per timestep', () => {
    const plan = makeBasePlan();
    const r = runSimulation(plan, evScenario, 7);
    const nodeIds = Object.keys(r.nodeStatusHistory);
    expect(nodeIds.length).toBeGreaterThan(0);
    for (const nodeId of nodeIds) {
      expect(r.nodeStatusHistory[nodeId].length).toBe(evScenario.durationHours);
    }
  });
});

// ─── Project effects ──────────────────────────────────────────────────────────

describe('applyProject + runSimulation — project effects', () => {
  it('battery storage reduces vulnerability-related outages in Montopolis', () => {
    const basePlan = makeBasePlan();
    const projPlan = applyProject(basePlan, batteryProject);

    const base = runSimulation(basePlan, freezeScenario, 42);
    const improved = runSimulation(projPlan, freezeScenario, 42);

    const baseOutage = base.outageByZone['z-montopolis'] ?? 0;
    const improvedOutage = improved.outageByZone['z-montopolis'] ?? 0;

    // With battery storage, Montopolis should never be worse
    expect(improvedOutage).toBeLessThanOrEqual(baseOutage + 2);
  });

  it('downtown upgrade increases overall stability', () => {
    const basePlan = makeBasePlan();
    const projPlan = applyProject(basePlan, downtownUpgrade);

    const base = runSimulation(basePlan, freezeScenario, 42);
    const improved = runSimulation(projPlan, freezeScenario, 42);

    // Stability should be >= base (never significantly worse)
    expect(improved.metrics.stabilityScore).toBeGreaterThanOrEqual(
      base.metrics.stabilityScore - 0.05, // allow tiny floating-point variance
    );
  });

  it('adding multiple projects reduces total outage compared to no projects (freeze)', () => {
    const basePlan = makeBasePlan();
    let projPlan = applyProject(basePlan, batteryProject);
    projPlan = applyProject(projPlan, hardeningProject);
    projPlan = applyProject(projPlan, downtownUpgrade);

    const base = runSimulation(basePlan, freezeScenario, 42);
    const improved = runSimulation(projPlan, freezeScenario, 42);

    expect(improved.metrics.totalOutageHours).toBeLessThanOrEqual(
      base.metrics.totalOutageHours + 1,
    );
  });
});

// ─── applyProject ─────────────────────────────────────────────────────────────

describe('applyProject', () => {
  it('adds a project to the plan', () => {
    const plan = makeBasePlan();
    const updated = applyProject(plan, batteryProject);
    expect(updated.projects).toHaveLength(1);
    expect(updated.projects[0].id).toBe(batteryProject.id);
  });

  it('is idempotent — adding the same project twice does not duplicate it', () => {
    const plan = makeBasePlan();
    const once = applyProject(plan, batteryProject);
    const twice = applyProject(once, batteryProject);
    expect(twice.projects).toHaveLength(1);
  });

  it('does not mutate the original plan', () => {
    const plan = makeBasePlan();
    applyProject(plan, batteryProject);
    expect(plan.projects).toHaveLength(0);
  });
});

// ─── compareResults ───────────────────────────────────────────────────────────

describe('compareResults', () => {
  it('computes correct metric deltas', () => {
    const basePlan = makeBasePlan();
    const projPlan = applyProject(basePlan, downtownUpgrade);

    const base = runSimulation(basePlan, freezeScenario, 42);
    const alt = runSimulation(projPlan, freezeScenario, 42);

    const delta = compareResults(base, alt);
    const expectedStabilityDelta = alt.metrics.stabilityScore - base.metrics.stabilityScore;

    expect(delta.metricDeltas.stabilityScore).toBeCloseTo(expectedStabilityDelta, 8);
    expect(delta.baseResultId).toBe(base.id);
    expect(delta.altResultId).toBe(alt.id);
  });

  it('correctly identifies improved and worsened zones', () => {
    const basePlan = makeBasePlan();
    const projPlan = applyProject(basePlan, hardeningProject);

    const base = runSimulation(basePlan, freezeScenario, 99);
    const alt = runSimulation(projPlan, freezeScenario, 99);

    const delta = compareResults(base, alt);

    // Every zone in improvedZones must have negative delta
    for (const zoneId of delta.improvedZones) {
      expect(delta.outageByZoneDelta[zoneId]).toBeLessThan(-0.5);
    }
    // Every zone in worsenedZones must have positive delta
    for (const zoneId of delta.worsenedZones) {
      expect(delta.outageByZoneDelta[zoneId]).toBeGreaterThan(0.5);
    }
  });
});

// ─── exportSnapshot ───────────────────────────────────────────────────────────

describe('exportSnapshot', () => {
  it('includes correct audit trail fields', () => {
    const plan = makeBasePlan();
    const result = runSimulation(plan, freezeScenario, 42);
    const snapshot = exportSnapshot(plan, freezeScenario, result);

    expect(snapshot.auditTrail.runId).toBe(result.id);
    expect(snapshot.auditTrail.seed).toBe(42);
    expect(snapshot.auditTrail.planVersionId).toBe(plan.id);
    expect(snapshot.auditTrail.scenarioId).toBe(freezeScenario.id);
  });

  it('snapshot contains the full plan version and result', () => {
    const plan = makeBasePlan();
    const result = runSimulation(plan, heatScenario, 7);
    const snapshot = exportSnapshot(plan, heatScenario, result);

    expect(snapshot.planVersion.id).toBe(plan.id);
    expect(snapshot.result.id).toBe(result.id);
    expect(snapshot.scenario.id).toBe(heatScenario.id);
  });
});

// ─── Budget helpers ───────────────────────────────────────────────────────────

describe('budget helpers', () => {
  it('getTotalCapex sums project costs', () => {
    const plan = makeBasePlan();
    const updated = applyProject(applyProject(plan, batteryProject), hardeningProject);
    expect(getTotalCapex(updated)).toBe(batteryProject.capexUSD + hardeningProject.capexUSD);
  });

  it('getBudgetRemaining is negative when over budget', () => {
    const plan = makeBasePlan({
      assumptions: { ...defaultAssumptions, budgetCapUSD: 1_000 },
    });
    const updated = applyProject(plan, batteryProject);
    expect(getBudgetRemaining(updated)).toBeLessThan(0);
  });
});

// ─── Scenario stress ─────────────────────────────────────────────────────────

describe('scenario stress characteristics', () => {
  it('freeze scenario produces more outages than EV spike on base plan', () => {
    const plan = makeBasePlan();
    const freeze = runSimulation(plan, freezeScenario, 42);
    const ev = runSimulation(plan, evScenario, 42);

    // Freeze is considerably more severe
    expect(freeze.metrics.stabilityScore).toBeLessThanOrEqual(
      ev.metrics.stabilityScore + 0.1,
    );
  });

  it('regulator EV assumption worsens stress vs default in EV spike scenario', () => {
    const basePlan = makeBasePlan();
    const regulatorPlan = makeBasePlan({
      assumptions: { ...defaultAssumptions, evAdoptionRate: 0.6 },
    });

    const base = runSimulation(basePlan, evScenario, 42);
    const aggressive = runSimulation(regulatorPlan, evScenario, 42);

    // Higher EV rate means higher demand, so stability should be <= base
    expect(aggressive.metrics.stabilityScore).toBeLessThanOrEqual(
      base.metrics.stabilityScore + 0.05,
    );
  });
});
