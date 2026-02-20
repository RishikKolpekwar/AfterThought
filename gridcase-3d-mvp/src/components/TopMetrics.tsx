import { useSimulationStore } from '../stores/simulationStore';
import { usePlanStore } from '../stores/planStore';

function ScoreGauge({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg viewBox="0 0 56 56" style={{ width: '100%', height: '100%' }}>
          <circle cx={28} cy={28} r={22} fill="none" stroke="#1e293b" strokeWidth={5} />
          <circle
            cx={28}
            cy={28}
            r={22}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeDasharray={`${(pct / 100) * 138.2} 138.2`}
            strokeLinecap="round"
            transform="rotate(-90 28 28)"
          />
        </svg>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: '#e2e8f0',
          }}
        >
          {pct}
        </span>
      </div>
    </div>
  );
}

function MetricBadge({ label, value, unit, warn }: { label: string; value: string; unit: string; warn?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '6px 14px',
        background: '#0f172a',
        borderRadius: 8,
        border: `1px solid ${warn ? '#f97316' : '#1e293b'}`,
      }}
    >
      <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: warn ? '#f97316' : '#e2e8f0' }}>
        {value}
        <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginLeft: 3 }}>{unit}</span>
      </span>
    </div>
  );
}

export default function TopMetrics() {
  const { status, currentResult } = useSimulationStore();
  const overBudget = usePlanStore((s) => s.overBudget());
  const totalCapex = usePlanStore((s) => s.totalCapex());
  const budgetCap = usePlanStore((s) => s.currentPlan.assumptions.budgetCapUSD);
  const role = usePlanStore((s) => s.role);

  const roleLabel: Record<string, string> = {
    utility_planner: 'Utility Planner',
    regulator: 'Regulator',
    advocate: 'Community Advocate',
  };

  const metrics = currentResult?.metrics;
  const hasResult = status === 'done' && metrics;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 20px',
        height: '100%',
        overflowX: 'auto',
      }}
    >
      {/* Brand */}
      <div style={{ marginRight: 8, flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.02em' }}>
          AfterThought
        </div>
        <div style={{ fontSize: 10, color: '#475569', marginTop: -2 }}>Grid Planning</div>
      </div>

      <div style={{ width: 1, height: 40, background: '#1e293b', flexShrink: 0 }} />

      {/* Role badge */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 20,
          background: '#1e3a5f',
          color: '#38bdf8',
          flexShrink: 0,
        }}
      >
        {roleLabel[role]}
      </div>

      <div style={{ width: 1, height: 40, background: '#1e293b', flexShrink: 0 }} />

      {/* Budget */}
      <MetricBadge
        label="CapEx Allocated"
        value={`$${(totalCapex / 1_000_000).toFixed(0)}M`}
        unit={`/ $${(budgetCap / 1_000_000).toFixed(0)}M`}
        warn={overBudget}
      />

      {hasResult ? (
        <>
          <div style={{ width: 1, height: 40, background: '#1e293b', flexShrink: 0 }} />
          <ScoreGauge
            label="Stability"
            value={metrics.stabilityScore}
            color={metrics.stabilityScore > 0.7 ? '#22c55e' : metrics.stabilityScore > 0.45 ? '#eab308' : '#ef4444'}
          />
          <ScoreGauge
            label="Equity"
            value={metrics.equityScore}
            color={metrics.equityScore > 0.7 ? '#22c55e' : metrics.equityScore > 0.45 ? '#eab308' : '#ef4444'}
          />
          <ScoreGauge
            label="Efficiency"
            value={Math.min(metrics.costEfficiency / 10, 1)}
            color="#60a5fa"
          />
          <MetricBadge
            label="Outage Hours (total)"
            value={`${metrics.totalOutageHours.toFixed(0)}`}
            unit="zone·h"
            warn={metrics.totalOutageHours > 50}
          />
          <MetricBadge
            label="Cascades"
            value={`${metrics.cascadeCount}`}
            unit="events"
            warn={metrics.cascadeCount > 3}
          />
        </>
      ) : (
        <div style={{ fontSize: 12, color: '#475569', flexShrink: 0 }}>
          {status === 'running' ? '⏳ Simulating…' : 'No simulation run yet — configure and run a scenario.'}
        </div>
      )}
    </div>
  );
}
