// ─── Core ID types ───────────────────────────────────────────────────────────
export type ZoneId = string;
export type NodeId = string;
export type EdgeId = string;
export type ProjectId = string;
export type ScenarioId = string;
export type PlanVersionId = string;
export type SimulationResultId = string;

// ─── Domain entities ─────────────────────────────────────────────────────────

export interface Zone {
  id: ZoneId;
  name: string;
  /** Ordered [x, z] pairs in grid-unit space (y is height/up). */
  polygon2D: [number, number][];
  population: number;
  medianIncome: number;
  /** 0–1, where 1 = oldest / most degraded infrastructure */
  infraAgeIndex: number;
  /** Baseline megawatt load in normal conditions */
  baseLoadMW: number;
  /** 0–1, where 1 = most vulnerable to cascading outages */
  vulnerability: number;
}

export interface GridNode {
  id: NodeId;
  label: string;
  zoneId: ZoneId;
  /** [x, y, z] in 3D grid space */
  position: [number, number, number];
  capacityMW: number;
  critical: boolean;
  status: 'operational' | 'failed' | 'degraded';
}

export interface GridEdge {
  id: EdgeId;
  fromNodeId: NodeId;
  toNodeId: NodeId;
  maxFlowMW: number;
  status: 'operational' | 'failed';
}

export type ProjectType =
  | 'substation_upgrade'
  | 'solar_farm'
  | 'battery_storage'
  | 'grid_hardening'
  | 'ev_charging'
  | 'underground_cable'
  | 'smart_meter'
  | 'transmission_upgrade'
  | 'community_microgrid'
  | 'solar_storage';

export interface ProjectEffect {
  capacityBoostMW?: number;
  vulnerabilityReduction?: number;
  demandReductionFactor?: number;
  cascadeResistance?: number;
  recoverySpeedBoost?: number;
}

export interface Project {
  id: ProjectId;
  name: string;
  type: ProjectType;
  zoneId: ZoneId;
  nodeId?: NodeId;
  capexUSD: number;
  effects: ProjectEffect;
  description: string;
}

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  durationHours: number;
  /** Demand multiplier per hour (length === durationHours) */
  demandCurve: number[];
  /** 0–1 weather stress per hour, reduces effective capacity */
  weatherStressCurve: number[];
  color: string;
}

export type Role = 'utility_planner' | 'regulator' | 'advocate';

export interface Assumptions {
  evAdoptionRate: number;          // 0–1
  populationGrowthRate: number;    // annual %
  renewableTarget: number;         // 0–1 fraction of generation
  budgetCapUSD: number;
}

export interface PlanVersion {
  id: PlanVersionId;
  name: string;
  role: Role;
  projects: Project[];
  assumptions: Assumptions;
  createdAt: string;
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export interface EventLogEntry {
  timestep: number;
  type:
    | 'NODE_FAIL'
    | 'NODE_RECOVER'
    | 'CASCADE_FAIL'
    | 'ZONE_OUTAGE'
    | 'ZONE_RESTORE'
    | 'OVERLOAD_WARNING';
  nodeId?: NodeId;
  zoneId?: ZoneId;
  fromNodeId?: NodeId;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface SimulationMetrics {
  stabilityScore: number;     // 0–1
  equityScore: number;        // 0–1
  costEfficiency: number;     // higher = better (avoided outage per $ spent)
  totalOutageHours: number;
  peakStressLevel: number;    // 0–1
  nodesFailedCount: number;
  cascadeCount: number;
}

export interface SimulationResult {
  id: SimulationResultId;
  planVersionId: PlanVersionId;
  scenarioId: ScenarioId;
  seed: number;
  metrics: SimulationMetrics;
  /** Hours of outage per zone over the full run */
  outageByZone: Record<ZoneId, number>;
  /** Per-timestep status for each node */
  nodeStatusHistory: Record<NodeId, ('operational' | 'failed')[]>;
  eventLog: EventLogEntry[];
  createdAt: string;
}

export interface ComparisonDelta {
  baseResultId: SimulationResultId;
  altResultId: SimulationResultId;
  metricDeltas: {
    stabilityScore: number;
    equityScore: number;
    costEfficiency: number;
    totalOutageHours: number;
  };
  outageByZoneDelta: Record<ZoneId, number>;
  improvedZones: ZoneId[];
  worsenedZones: ZoneId[];
}

export interface FilingSnapshot {
  snapshotId: string;
  generatedAt: string;
  planVersion: PlanVersion;
  scenario: Scenario;
  result: SimulationResult;
  delta?: ComparisonDelta;
  auditTrail: {
    runId: SimulationResultId;
    seed: number;
    planVersionId: PlanVersionId;
    scenarioId: ScenarioId;
    toolVersion: string;
  };
}
