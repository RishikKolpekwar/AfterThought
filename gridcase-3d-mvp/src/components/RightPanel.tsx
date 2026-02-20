import { useState } from 'react';
import { usePlanStore } from '../stores/planStore';
import { useSimulationStore } from '../stores/simulationStore';
import { mockProjectCatalog, mockScenarios } from '../data/mockAustin';
import { runSimulation } from '../sim/engine';
import { Project, Role, Assumptions } from '../types/grid';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #1e293b' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {title}
        <span style={{ fontSize: 10, opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '0 16px 12px' }}>{children}</div>}
    </div>
  );
}

// ─── Role Selector ────────────────────────────────────────────────────────────

function RoleSelector() {
  const { role, setRole } = usePlanStore();
  const roles: { key: Role; label: string; color: string }[] = [
    { key: 'utility_planner', label: 'Utility Planner', color: '#3b82f6' },
    { key: 'regulator', label: 'Regulator', color: '#a78bfa' },
    { key: 'advocate', label: 'Advocate', color: '#34d399' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {roles.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => setRole(key)}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: `1px solid ${role === key ? color : '#1e293b'}`,
            background: role === key ? `${color}22` : '#0f172a',
            color: role === key ? color : '#64748b',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Budget Meter ─────────────────────────────────────────────────────────────

function BudgetMeter() {
  const totalCapex = usePlanStore((s) => s.totalCapex());
  const budgetCap = usePlanStore((s) => s.currentPlan.assumptions.budgetCapUSD);
  const overBudget = usePlanStore((s) => s.overBudget());

  const pct = Math.min((totalCapex / budgetCap) * 100, 100);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#64748b' }}>Allocated</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: overBudget ? '#ef4444' : '#e2e8f0',
          }}
        >
          ${(totalCapex / 1_000_000).toFixed(0)}M / ${(budgetCap / 1_000_000).toFixed(0)}M
        </span>
      </div>
      <div style={{ height: 6, background: '#1e293b', borderRadius: 3 }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: overBudget ? '#ef4444' : pct > 80 ? '#f97316' : '#3b82f6',
            borderRadius: 3,
            transition: 'width 0.3s',
          }}
        />
      </div>
      {overBudget && (
        <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>
          ⚠ Over budget by ${((totalCapex - budgetCap) / 1_000_000).toFixed(0)}M
        </div>
      )}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, added, onToggle }: { project: Project; added: boolean; onToggle: () => void }) {
  const TYPE_ICON: Record<string, string> = {
    substation_upgrade: '⚡',
    solar_farm: '☀️',
    battery_storage: '🔋',
    grid_hardening: '🔩',
    ev_charging: '🚗',
    underground_cable: '🪱',
    smart_meter: '📊',
    transmission_upgrade: '🗼',
    community_microgrid: '🏘️',
    solar_storage: '🌞',
  };

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${added ? '#1d4ed8' : '#1e293b'}`,
        background: added ? '#0c1a3a' : '#0f172a',
        marginBottom: 8,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ padding: '8px 10px' }}>

        {/* Name + cost badge on same row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
            {TYPE_ICON[project.type] ?? '📦'} {project.name}
          </div>
          <div style={{
            flexShrink: 0,
            padding: '3px 8px',
            borderRadius: 5,
            background: added ? '#1e3a5f' : '#0f2a10',
            border: `1px solid ${added ? '#3b82f6' : '#166534'}`,
            fontSize: 12,
            fontWeight: 800,
            color: added ? '#60a5fa' : '#4ade80',
            letterSpacing: '-0.01em',
          }}>
            ${(project.capexUSD / 1_000_000).toFixed(0)}M
          </div>
        </div>

        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
          {project.description}
        </div>

        {/* Effect tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {project.effects.capacityBoostMW && (
            <span style={tagStyle('#1d4ed8')}>+{project.effects.capacityBoostMW} MW</span>
          )}
          {project.effects.vulnerabilityReduction && (
            <span style={tagStyle('#065f46')}>
              -{(project.effects.vulnerabilityReduction * 100).toFixed(0)}% vuln
            </span>
          )}
          {project.effects.cascadeResistance && (
            <span style={tagStyle('#78350f')}>
              +{(project.effects.cascadeResistance * 100).toFixed(0)}% cascade resist
            </span>
          )}
          {project.effects.demandReductionFactor && (
            <span style={tagStyle('#4c1d95')}>
              -{(project.effects.demandReductionFactor * 100).toFixed(0)}% demand
            </span>
          )}
          {project.effects.recoverySpeedBoost && (
            <span style={tagStyle('#1e3a5f')}>
              +{(project.effects.recoverySpeedBoost * 100).toFixed(0)}% recovery
            </span>
          )}
        </div>

        {/* Add / Remove button */}
        <button
          onClick={onToggle}
          style={{
            width: '100%',
            padding: '6px',
            borderRadius: 5,
            border: 'none',
            background: added ? '#7f1d1d' : '#1d4ed8',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {added ? 'Remove from Plan' : 'Add to Plan'}
        </button>

      </div>
    </div>
  );
}

function tagStyle(bg: string): React.CSSProperties {
  return {
    fontSize: 9,
    padding: '1px 5px',
    borderRadius: 4,
    background: bg,
    color: '#e2e8f0',
    fontWeight: 600,
  };
}

// ─── Scenario Picker ──────────────────────────────────────────────────────────

function ScenarioPicker() {
  const { selectedScenarioId, setScenario } = usePlanStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {mockScenarios.map((scenario) => (
        <button
          key={scenario.id}
          onClick={() => setScenario(scenario.id)}
          style={{
            padding: '9px 12px',
            borderRadius: 7,
            border: `1px solid ${selectedScenarioId === scenario.id ? scenario.color : '#1e293b'}`,
            background: selectedScenarioId === scenario.id ? `${scenario.color}22` : '#0f172a',
            color: selectedScenarioId === scenario.id ? scenario.color : '#64748b',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700 }}>{scenario.name}</div>
          <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>
            {scenario.durationHours}h · {scenario.description.slice(0, 60)}…
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Assumptions Panel ────────────────────────────────────────────────────────

function AssumptionsPanel() {
  const { currentPlan, setAssumption } = usePlanStore();
  const { assumptions } = currentPlan;

  function SliderField({
    label,
    field,
    min,
    max,
    step,
    format,
  }: {
    label: string;
    field: keyof Assumptions;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
  }) {
    const value = assumptions[field] as number;
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{format(value)}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setAssumption(field, Number(e.target.value) as Assumptions[typeof field])}
          style={{ width: '100%', accentColor: '#3b82f6' }}
        />
      </div>
    );
  }

  return (
    <div>
      <SliderField
        label="EV Adoption Rate"
        field="evAdoptionRate"
        min={0}
        max={0.8}
        step={0.01}
        format={(v) => `${(v * 100).toFixed(0)}%`}
      />
      <SliderField
        label="Population Growth"
        field="populationGrowthRate"
        min={0}
        max={8}
        step={0.1}
        format={(v) => `${v.toFixed(1)}% / yr`}
      />
      <SliderField
        label="Renewable Target"
        field="renewableTarget"
        min={0}
        max={1}
        step={0.01}
        format={(v) => `${(v * 100).toFixed(0)}%`}
      />
      <SliderField
        label="Budget Cap"
        field="budgetCapUSD"
        min={50_000_000}
        max={500_000_000}
        step={5_000_000}
        format={(v) => `$${(v / 1_000_000).toFixed(0)}M`}
      />
    </div>
  );
}

// ─── Run Controls ─────────────────────────────────────────────────────────────

function RunControls() {
  const { currentPlan, selectedScenarioId, activeSeed, setSeed, lockBaseline } = usePlanStore();
  const {
    startRun,
    completeRun,
    failRun,
    status,
    toggleComparePanel,
    showComparePanel,
    toggleExportModal,
    currentResult,
    results,
    setBaselineResult,
  } = useSimulationStore();

  const scenario = mockScenarios.find((s) => s.id === selectedScenarioId);

  const handleRun = async () => {
    if (!scenario || status === 'running') return;
    startRun();
    try {
      // Run in a microtask to allow UI to update
      await new Promise((r) => setTimeout(r, 0));
      const result = runSimulation(currentPlan, scenario, activeSeed);
      completeRun(result);
    } catch (e) {
      failRun(String(e));
    }
  };

  const handleLockBaseline = () => {
    if (!currentResult) return;
    setBaselineResult(currentResult);
    lockBaseline();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Seed input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>Seed:</label>
        <input
          type="number"
          value={activeSeed}
          onChange={(e) => setSeed(Number(e.target.value))}
          style={{
            flex: 1,
            padding: '4px 8px',
            borderRadius: 5,
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#e2e8f0',
            fontSize: 12,
          }}
        />
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={status === 'running' || !scenario}
        style={{
          width: '100%',
          padding: '11px',
          borderRadius: 8,
          border: 'none',
          background: status === 'running' ? '#1e3a5f' : '#1d4ed8',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: status === 'running' ? 'default' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {status === 'running' ? '⏳ Simulating…' : '▶ Run Simulation'}
      </button>

      {/* Secondary actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button
          onClick={handleLockBaseline}
          disabled={!currentResult}
          style={secondaryBtnStyle(!currentResult)}
          title="Lock current result as baseline for comparison"
        >
          📌 Lock Baseline
        </button>
        <button
          onClick={toggleComparePanel}
          disabled={results.length < 1}
          style={secondaryBtnStyle(results.length < 1, showComparePanel)}
        >
          ⚖️ Compare
        </button>
        <button
          onClick={toggleExportModal}
          disabled={!currentResult}
          style={secondaryBtnStyle(!currentResult)}
        >
          📄 Export
        </button>
        <button
          onClick={() => useSimulationStore.getState().toggleEventLog()}
          style={secondaryBtnStyle(false)}
        >
          📋 Events
        </button>
      </div>

      {/* Run history */}
      {results.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
            Run History
          </div>
          {results.slice(-5).reverse().map((r) => (
            <button
              key={r.id}
              onClick={() => useSimulationStore.getState().setCurrentResult(r)}
              style={{
                width: '100%',
                padding: '6px 8px',
                marginBottom: 4,
                borderRadius: 5,
                border: '1px solid #1e293b',
                background: '#0f172a',
                color: '#64748b',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 10,
              }}
            >
              <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{r.id}</span>
              {' · '}stab {(r.metrics.stabilityScore * 100).toFixed(0)}%
              {' · '}eq {(r.metrics.equityScore * 100).toFixed(0)}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function secondaryBtnStyle(disabled: boolean, active = false): React.CSSProperties {
  return {
    padding: '7px 8px',
    borderRadius: 6,
    border: `1px solid ${active ? '#3b82f6' : '#1e293b'}`,
    background: active ? '#1e3a5f' : disabled ? '#0a0f1e' : '#0f172a',
    color: disabled ? '#334155' : active ? '#60a5fa' : '#64748b',
    fontSize: 11,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
  };
}

// ─── Main RightPanel ──────────────────────────────────────────────────────────

export default function RightPanel() {
  const { currentPlan } = usePlanStore();
  const addedIds = new Set(currentPlan.projects.map((p) => p.id));
  const { addProject, removeProject } = usePlanStore();

  // Group projects by zone
  const [filterZone, setFilterZone] = useState<string | 'all'>('all');
  const zones = [...new Set(mockProjectCatalog.map((p) => p.zoneId))];

  const filteredProjects = filterZone === 'all'
    ? mockProjectCatalog
    : mockProjectCatalog.filter((p) => p.zoneId === filterZone);

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        background: '#0d1424',
        borderLeft: '1px solid #1e293b',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Section title="Role">
        <RoleSelector />
      </Section>

      <Section title="Budget">
        <BudgetMeter />
      </Section>

      <Section title="Scenario">
        <ScenarioPicker />
      </Section>

      <Section title="Assumptions">
        <AssumptionsPanel />
      </Section>

      <Section title="Run">
        <RunControls />
      </Section>

      <Section title="Project Catalog">
        {/* Zone filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          <button
            onClick={() => setFilterZone('all')}
            style={filterChip(filterZone === 'all')}
          >
            All
          </button>
          {zones.map((z) => {
            const name = mockProjectCatalog.find((p) => p.zoneId === z)?.zoneId.replace('z-', '') ?? z;
            return (
              <button
                key={z}
                onClick={() => setFilterZone(z === filterZone ? 'all' : z)}
                style={filterChip(filterZone === z)}
              >
                {name}
              </button>
            );
          })}
        </div>

        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            added={addedIds.has(project.id)}
            onToggle={() => {
              if (addedIds.has(project.id)) removeProject(project.id);
              else addProject(project);
            }}
          />
        ))}
      </Section>
    </div>
  );
}

function filterChip(active: boolean): React.CSSProperties {
  return {
    padding: '3px 8px',
    borderRadius: 12,
    border: 'none',
    background: active ? '#1d4ed8' : '#1e293b',
    color: active ? '#fff' : '#64748b',
    fontSize: 10,
    cursor: 'pointer',
    fontWeight: 600,
    textTransform: 'capitalize',
  };
}
