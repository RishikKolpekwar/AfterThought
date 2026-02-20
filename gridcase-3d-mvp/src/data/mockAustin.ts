import { Zone, GridNode, GridEdge, Project, Scenario, Assumptions } from '../types/grid';

// ─── Zones (Austin-like neighborhoods in grid-unit space) ─────────────────────
// Coordinate system: X = east-west, Z = north-south, Y = height (up)
// polygon2D uses [x, z] pairs for ground-plane footprint
export const mockZones: Zone[] = [
  {
    id: 'z-downtown',
    name: 'Downtown',
    polygon2D: [[-2.5, -1.5], [2.5, -1.5], [2.5, 1.5], [-2.5, 1.5]],
    population: 42000,
    medianIncome: 78000,
    infraAgeIndex: 0.65,
    baseLoadMW: 85,
    vulnerability: 0.35,
  },
  {
    id: 'z-east',
    name: 'East Austin',
    polygon2D: [[2.5, -2], [6.5, -2], [6.5, 2], [2.5, 2]],
    population: 55000,
    medianIncome: 52000,
    infraAgeIndex: 0.78,
    baseLoadMW: 70,
    vulnerability: 0.62,
  },
  {
    id: 'z-south',
    name: 'South Congress',
    polygon2D: [[-2.5, -4.5], [2.5, -4.5], [2.5, -1.5], [-2.5, -1.5]],
    population: 38000,
    medianIncome: 68000,
    infraAgeIndex: 0.55,
    baseLoadMW: 60,
    vulnerability: 0.30,
  },
  {
    id: 'z-north',
    name: 'North Loop',
    polygon2D: [[-2.5, 1.5], [2.5, 1.5], [2.5, 4.5], [-2.5, 4.5]],
    population: 47000,
    medianIncome: 61000,
    infraAgeIndex: 0.60,
    baseLoadMW: 65,
    vulnerability: 0.40,
  },
  {
    id: 'z-westlake',
    name: 'Westlake',
    polygon2D: [[-8, -2], [-4.5, -2], [-4.5, 2], [-8, 2]],
    population: 28000,
    medianIncome: 120000,
    infraAgeIndex: 0.35,
    baseLoadMW: 75,
    vulnerability: 0.18,
  },
  {
    id: 'z-mueller',
    name: 'Mueller',
    polygon2D: [[2.5, 2], [6.5, 2], [6.5, 5.5], [2.5, 5.5]],
    population: 33000,
    medianIncome: 72000,
    infraAgeIndex: 0.30,
    baseLoadMW: 45,
    vulnerability: 0.22,
  },
  {
    id: 'z-hyde-park',
    name: 'Hyde Park',
    polygon2D: [[-2.5, 4.5], [2.5, 4.5], [2.5, 7.5], [-2.5, 7.5]],
    population: 29000,
    medianIncome: 85000,
    infraAgeIndex: 0.70,
    baseLoadMW: 40,
    vulnerability: 0.28,
  },
  {
    id: 'z-rundberg',
    name: 'Rundberg',
    polygon2D: [[-2.5, 7.5], [2.5, 7.5], [2.5, 10.5], [-2.5, 10.5]],
    population: 41000,
    medianIncome: 38000,
    infraAgeIndex: 0.85,
    baseLoadMW: 55,
    vulnerability: 0.82,
  },
  {
    id: 'z-montopolis',
    name: 'Montopolis',
    polygon2D: [[2.5, -5.5], [6.5, -5.5], [6.5, -2], [2.5, -2]],
    population: 31000,
    medianIncome: 41000,
    infraAgeIndex: 0.80,
    baseLoadMW: 48,
    vulnerability: 0.75,
  },
  {
    id: 'z-buda',
    name: 'Buda / Kyle',
    polygon2D: [[-2.5, -7.5], [2.5, -7.5], [2.5, -4.5], [-2.5, -4.5]],
    population: 52000,
    medianIncome: 58000,
    infraAgeIndex: 0.40,
    baseLoadMW: 72,
    vulnerability: 0.35,
  },
  {
    id: 'z-cedar-park',
    name: 'Cedar Park',
    polygon2D: [[-8, 2], [-4.5, 2], [-4.5, 5.5], [-8, 5.5]],
    population: 44000,
    medianIncome: 88000,
    infraAgeIndex: 0.32,
    baseLoadMW: 58,
    vulnerability: 0.20,
  },
  {
    id: 'z-pflugerville',
    name: 'Pflugerville',
    polygon2D: [[6.5, 2], [10.5, 2], [10.5, 5.5], [6.5, 5.5]],
    population: 60000,
    medianIncome: 64000,
    infraAgeIndex: 0.45,
    baseLoadMW: 80,
    vulnerability: 0.42,
  },
  {
    id: 'z-manor',
    name: 'Manor',
    polygon2D: [[6.5, -2], [10.5, -2], [10.5, 2], [6.5, 2]],
    population: 24000,
    medianIncome: 45000,
    infraAgeIndex: 0.72,
    baseLoadMW: 36,
    vulnerability: 0.65,
  },
  {
    id: 'z-bee-cave',
    name: 'Bee Cave',
    polygon2D: [[-8, -5.5], [-4.5, -5.5], [-4.5, -2], [-8, -2]],
    population: 20000,
    medianIncome: 135000,
    infraAgeIndex: 0.28,
    baseLoadMW: 55,
    vulnerability: 0.15,
  },
  {
    id: 'z-sunset-valley',
    name: 'Sunset Valley',
    polygon2D: [[-5.5, -7.5], [-2.5, -7.5], [-2.5, -4.5], [-5.5, -4.5]],
    population: 18000,
    medianIncome: 95000,
    infraAgeIndex: 0.42,
    baseLoadMW: 30,
    vulnerability: 0.22,
  },
];

// ─── Grid Nodes (substations) ─────────────────────────────────────────────────
export const mockNodes: GridNode[] = [
  {
    id: 'n-downtown-core',
    label: 'Downtown Core',
    zoneId: 'z-downtown',
    position: [0, 0.5, 0],
    capacityMW: 150,
    critical: true,
    status: 'operational',
  },
  {
    id: 'n-east-sub',
    label: 'East Substation',
    zoneId: 'z-east',
    position: [4.5, 0.5, 0],
    capacityMW: 90,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-south-sub',
    label: 'South Congress Sub',
    zoneId: 'z-south',
    position: [0, 0.5, -3],
    capacityMW: 80,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-north-sub',
    label: 'North Loop Sub',
    zoneId: 'z-north',
    position: [0, 0.5, 3],
    capacityMW: 85,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-westlake-sub',
    label: 'Westlake Sub',
    zoneId: 'z-westlake',
    position: [-6, 0.5, 0],
    capacityMW: 110,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-mueller-sub',
    label: 'Mueller Sub',
    zoneId: 'z-mueller',
    position: [4.5, 0.5, 3.8],
    capacityMW: 70,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-hyde-park-sub',
    label: 'Hyde Park Sub',
    zoneId: 'z-hyde-park',
    position: [0, 0.5, 6],
    capacityMW: 60,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-rundberg-sub',
    label: 'Rundberg Sub',
    zoneId: 'z-rundberg',
    position: [0, 0.5, 9],
    capacityMW: 55,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-montopolis-sub',
    label: 'Montopolis Sub',
    zoneId: 'z-montopolis',
    position: [4.5, 0.5, -3.8],
    capacityMW: 60,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-buda-sub',
    label: 'Buda Sub',
    zoneId: 'z-buda',
    position: [0, 0.5, -6],
    capacityMW: 90,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-cedar-park-sub',
    label: 'Cedar Park Sub',
    zoneId: 'z-cedar-park',
    position: [-6, 0.5, 3.8],
    capacityMW: 80,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-pflugerville-sub',
    label: 'Pflugerville Sub',
    zoneId: 'z-pflugerville',
    position: [8.5, 0.5, 3.8],
    capacityMW: 100,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-manor-sub',
    label: 'Manor Sub',
    zoneId: 'z-manor',
    position: [8.5, 0.5, 0],
    capacityMW: 55,
    critical: false,
    status: 'operational',
  },
  {
    id: 'n-bee-cave-sub',
    label: 'Bee Cave Sub',
    zoneId: 'z-bee-cave',
    position: [-6, 0.5, -3.8],
    capacityMW: 75,
    critical: false,
    status: 'operational',
  },
];

// ─── Grid Edges ───────────────────────────────────────────────────────────────
export const mockEdges: GridEdge[] = [
  { id: 'e-01', fromNodeId: 'n-downtown-core', toNodeId: 'n-east-sub',         maxFlowMW: 120, status: 'operational' },
  { id: 'e-02', fromNodeId: 'n-downtown-core', toNodeId: 'n-south-sub',        maxFlowMW: 100, status: 'operational' },
  { id: 'e-03', fromNodeId: 'n-downtown-core', toNodeId: 'n-north-sub',        maxFlowMW: 100, status: 'operational' },
  { id: 'e-04', fromNodeId: 'n-downtown-core', toNodeId: 'n-westlake-sub',     maxFlowMW: 130, status: 'operational' },
  { id: 'e-05', fromNodeId: 'n-east-sub',      toNodeId: 'n-mueller-sub',      maxFlowMW: 80,  status: 'operational' },
  { id: 'e-06', fromNodeId: 'n-east-sub',      toNodeId: 'n-montopolis-sub',   maxFlowMW: 70,  status: 'operational' },
  { id: 'e-07', fromNodeId: 'n-east-sub',      toNodeId: 'n-manor-sub',        maxFlowMW: 60,  status: 'operational' },
  { id: 'e-08', fromNodeId: 'n-north-sub',     toNodeId: 'n-hyde-park-sub',    maxFlowMW: 75,  status: 'operational' },
  { id: 'e-09', fromNodeId: 'n-north-sub',     toNodeId: 'n-mueller-sub',      maxFlowMW: 70,  status: 'operational' },
  { id: 'e-10', fromNodeId: 'n-hyde-park-sub', toNodeId: 'n-rundberg-sub',     maxFlowMW: 60,  status: 'operational' },
  { id: 'e-11', fromNodeId: 'n-hyde-park-sub', toNodeId: 'n-cedar-park-sub',   maxFlowMW: 65,  status: 'operational' },
  { id: 'e-12', fromNodeId: 'n-cedar-park-sub',toNodeId: 'n-westlake-sub',     maxFlowMW: 85,  status: 'operational' },
  { id: 'e-13', fromNodeId: 'n-westlake-sub',  toNodeId: 'n-bee-cave-sub',     maxFlowMW: 80,  status: 'operational' },
  { id: 'e-14', fromNodeId: 'n-south-sub',     toNodeId: 'n-buda-sub',         maxFlowMW: 90,  status: 'operational' },
  { id: 'e-15', fromNodeId: 'n-south-sub',     toNodeId: 'n-montopolis-sub',   maxFlowMW: 65,  status: 'operational' },
  { id: 'e-16', fromNodeId: 'n-mueller-sub',   toNodeId: 'n-pflugerville-sub', maxFlowMW: 90,  status: 'operational' },
  { id: 'e-17', fromNodeId: 'n-manor-sub',     toNodeId: 'n-pflugerville-sub', maxFlowMW: 75,  status: 'operational' },
  { id: 'e-18', fromNodeId: 'n-montopolis-sub',toNodeId: 'n-buda-sub',         maxFlowMW: 55,  status: 'operational' },
  { id: 'e-19', fromNodeId: 'n-bee-cave-sub',  toNodeId: 'n-south-sub',        maxFlowMW: 60,  status: 'operational' },
  { id: 'e-20', fromNodeId: 'n-rundberg-sub',  toNodeId: 'n-pflugerville-sub', maxFlowMW: 50,  status: 'operational' },
];

// ─── Project Catalog ──────────────────────────────────────────────────────────
export const mockProjectCatalog: Project[] = [
  {
    id: 'p-dt-upgrade',
    name: 'Downtown Substation Upgrade',
    type: 'substation_upgrade',
    zoneId: 'z-downtown',
    nodeId: 'n-downtown-core',
    capexUSD: 45_000_000,
    effects: { capacityBoostMW: 60, cascadeResistance: 0.3 },
    description: 'Expand transformer capacity and add redundant switching at downtown core hub.',
  },
  {
    id: 'p-east-solar',
    name: 'East Austin Solar Farm',
    type: 'solar_farm',
    zoneId: 'z-east',
    nodeId: 'n-east-sub',
    capexUSD: 28_000_000,
    effects: { capacityBoostMW: 35, vulnerabilityReduction: 0.15 },
    description: '20 MW AC solar array with local injection at East Substation.',
  },
  {
    id: 'p-mont-battery',
    name: 'Montopolis Battery Storage',
    type: 'battery_storage',
    zoneId: 'z-montopolis',
    nodeId: 'n-montopolis-sub',
    capexUSD: 22_000_000,
    effects: { capacityBoostMW: 25, recoverySpeedBoost: 0.4, vulnerabilityReduction: 0.2 },
    description: '4-hour 25 MW battery system to buffer outages in this high-vulnerability corridor.',
  },
  {
    id: 'p-rund-hardening',
    name: 'Rundberg Grid Hardening',
    type: 'grid_hardening',
    zoneId: 'z-rundberg',
    nodeId: 'n-rundberg-sub',
    capexUSD: 18_000_000,
    effects: { cascadeResistance: 0.45, vulnerabilityReduction: 0.30 },
    description: 'Reconductoring aging feeders and adding sectionalizing switches in the Rundberg corridor.',
  },
  {
    id: 'p-mueller-ev',
    name: 'Mueller EV Smart Charging Hub',
    type: 'ev_charging',
    zoneId: 'z-mueller',
    nodeId: 'n-mueller-sub',
    capexUSD: 12_000_000,
    effects: { demandReductionFactor: 0.08, capacityBoostMW: 10 },
    description: 'Managed EV charging with V2G capability to shift load during peak stress.',
  },
  {
    id: 'p-west-cable',
    name: 'Westlake Underground Cable',
    type: 'underground_cable',
    zoneId: 'z-westlake',
    nodeId: 'n-westlake-sub',
    capexUSD: 35_000_000,
    effects: { cascadeResistance: 0.5, vulnerabilityReduction: 0.12 },
    description: 'Replace overhead transmission with underground cable to eliminate weather-related outages.',
  },
  {
    id: 'p-east-smart',
    name: 'East Austin Smart Meters',
    type: 'smart_meter',
    zoneId: 'z-east',
    capexUSD: 8_000_000,
    effects: { demandReductionFactor: 0.12 },
    description: 'Advanced metering infrastructure with demand-response automation for 18,000 customers.',
  },
  {
    id: 'p-manor-tx',
    name: 'Manor–Pflugerville Transmission',
    type: 'transmission_upgrade',
    zoneId: 'z-manor',
    nodeId: 'n-manor-sub',
    capexUSD: 30_000_000,
    effects: { capacityBoostMW: 45, cascadeResistance: 0.2 },
    description: 'Upgrade 138 kV line to 345 kV between Manor and Pflugerville to relieve eastern congestion.',
  },
  {
    id: 'p-mont-microgrid',
    name: 'Montopolis Community Microgrid',
    type: 'community_microgrid',
    zoneId: 'z-montopolis',
    capexUSD: 16_000_000,
    effects: { vulnerabilityReduction: 0.35, recoverySpeedBoost: 0.5, cascadeResistance: 0.25 },
    description: 'Islanding-capable microgrid serving 3,200 low-income households with 72-hour backup.',
  },
  {
    id: 'p-buda-solar-storage',
    name: 'Buda Solar + Storage Campus',
    type: 'solar_storage',
    zoneId: 'z-buda',
    nodeId: 'n-buda-sub',
    capexUSD: 40_000_000,
    effects: { capacityBoostMW: 50, vulnerabilityReduction: 0.18, cascadeResistance: 0.15 },
    description: '30 MW solar paired with 6-hour battery storage to support southern growth corridor.',
  },
  {
    id: 'p-cedar-upgrade',
    name: 'Cedar Park Substation Upgrade',
    type: 'substation_upgrade',
    zoneId: 'z-cedar-park',
    nodeId: 'n-cedar-park-sub',
    capexUSD: 25_000_000,
    effects: { capacityBoostMW: 30, cascadeResistance: 0.2 },
    description: 'Add second transformer bank at Cedar Park to eliminate N-1 vulnerability.',
  },
  {
    id: 'p-pflug-solar',
    name: 'Pflugerville Solar Farm',
    type: 'solar_farm',
    zoneId: 'z-pflugerville',
    nodeId: 'n-pflugerville-sub',
    capexUSD: 32_000_000,
    effects: { capacityBoostMW: 40, vulnerabilityReduction: 0.12 },
    description: '25 MW AC solar farm on I-130 corridor to serve fast-growing northeast load.',
  },
];

// ─── Scenarios ────────────────────────────────────────────────────────────────
function buildDemandCurve(hours: number, shape: 'freeze' | 'heat' | 'ev-spike'): number[] {
  return Array.from({ length: hours }, (_, h) => {
    if (shape === 'freeze') {
      // Sustained high demand from hour 0–72, slight evening peaks
      const base = 1.7 + Math.sin((h % 24) * Math.PI / 12) * 0.15;
      return h < 72 ? base : base * 0.9;
    }
    if (shape === 'heat') {
      // High afternoon peaks (hour 12–18 each day)
      const hour = h % 24;
      const peak = hour >= 12 && hour <= 18 ? 1.6 + (hour - 12) * 0.05 : 1.2;
      return peak;
    }
    if (shape === 'ev-spike') {
      // Evening EV return-home spike (hour 17–21 each day)
      const hour = h % 24;
      return (hour >= 17 && hour <= 21) ? 1.45 + (hour - 17) * 0.08 : 1.1;
    }
    return 1.0;
  });
}

function buildStressCurve(hours: number, shape: 'freeze' | 'heat' | 'ev-spike'): number[] {
  return Array.from({ length: hours }, (_, h) => {
    if (shape === 'freeze') {
      // Ice accumulation peaks mid-event
      return Math.min(0.9, 0.4 + h * 0.008);
    }
    if (shape === 'heat') {
      // Thermal stress peaks mid-afternoon
      const hour = h % 24;
      return hour >= 13 && hour <= 17 ? 0.55 : 0.2;
    }
    if (shape === 'ev-spike') {
      return 0.1; // Low weather stress, purely demand-side
    }
    return 0;
  });
}

export const mockScenarios: Scenario[] = [
  {
    id: 'sc-freeze',
    name: 'Winter Freeze',
    description: 'Extended Arctic freeze with ice accumulation (Feb 2021 analogue). Sustained demand surge with cascading infrastructure failures.',
    durationHours: 96,
    demandCurve: buildDemandCurve(96, 'freeze'),
    weatherStressCurve: buildStressCurve(96, 'freeze'),
    color: '#60a5fa',
  },
  {
    id: 'sc-heat-dome',
    name: 'Summer Heat Dome',
    description: 'Prolonged high-pressure heat dome with temperatures exceeding 110°F for 5 days. Cooling loads spike at afternoon peak.',
    durationHours: 120,
    demandCurve: buildDemandCurve(120, 'heat'),
    weatherStressCurve: buildStressCurve(120, 'heat'),
    color: '#f97316',
  },
  {
    id: 'sc-ev-spike',
    name: 'EV Adoption Surge',
    description: 'Rapid EV adoption causes severe evening demand spikes in residential zones. Low weather stress but concentrated load growth.',
    durationHours: 72,
    demandCurve: buildDemandCurve(72, 'ev-spike'),
    weatherStressCurve: buildStressCurve(72, 'ev-spike'),
    color: '#a78bfa',
  },
];

// ─── Default Assumptions ──────────────────────────────────────────────────────
export const defaultAssumptions: Assumptions = {
  evAdoptionRate: 0.15,
  populationGrowthRate: 3.2,
  renewableTarget: 0.30,
  budgetCapUSD: 150_000_000,
};

export const regulatorAssumptions: Assumptions = {
  evAdoptionRate: 0.35,
  populationGrowthRate: 4.0,
  renewableTarget: 0.50,
  budgetCapUSD: 200_000_000,
};

export const advocateAssumptions: Assumptions = {
  evAdoptionRate: 0.25,
  populationGrowthRate: 3.5,
  renewableTarget: 0.60,
  budgetCapUSD: 250_000_000,
};
