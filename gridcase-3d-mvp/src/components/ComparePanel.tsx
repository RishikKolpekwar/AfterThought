import { useSimulationStore } from '../stores/simulationStore';
import { mockZones } from '../data/mockAustin';

function DeltaBadge({ value, unit, invert = false }: { value: number; unit: string; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0;
  const color = Math.abs(value) < 0.005 ? '#64748b' : positive ? '#22c55e' : '#ef4444';
  const sign = value > 0 ? '+' : '';
  return (
    <span style={{ color, fontWeight: 700, fontSize: 14 }}>
      {sign}{typeof value === 'number' ? value.toFixed(2) : value}
      <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 2, color: '#64748b' }}>{unit}</span>
    </span>
  );
}

export default function ComparePanel() {
  const {
    showComparePanel,
    toggleComparePanel,
    baselineResult,
    currentResult,
    comparisonDelta,
    setBaselineResult,
    results,
  } = useSimulationStore();

  if (!showComparePanel) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 480,
        background: 'rgba(10,15,30,0.97)',
        borderLeft: '1px solid #1e293b',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          borderBottom: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
          ⚖️ Counterfactual Compare
        </span>
        <button
          onClick={toggleComparePanel}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {/* Baseline picker */}
        {!baselineResult && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
              Select a baseline run from history:
            </div>
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => setBaselineResult(r)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  marginBottom: 6,
                  borderRadius: 6,
                  border: '1px solid #1e293b',
                  background: '#0f172a',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                <strong style={{ color: '#e2e8f0' }}>{r.id}</strong>
                <br />
                Stability: {(r.metrics.stabilityScore * 100).toFixed(0)}% | Equity:{' '}
                {(r.metrics.equityScore * 100).toFixed(0)}% | Outage: {r.metrics.totalOutageHours.toFixed(0)}h
              </button>
            ))}
            {results.length === 0 && (
              <div style={{ color: '#475569', fontSize: 12 }}>No run history yet. Run a simulation first.</div>
            )}
          </div>
        )}

        {baselineResult && currentResult && comparisonDelta && (
          <>
            {/* Run IDs */}
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 12 }}>
              <strong style={{ color: '#64748b' }}>BASELINE</strong>{' '}
              <code style={{ color: '#60a5fa' }}>{baselineResult.id}</code>
              <br />
              <strong style={{ color: '#64748b' }}>AMENDED</strong>{' '}
              <code style={{ color: '#a78bfa' }}>{currentResult.id}</code>
            </div>

            {/* Metric deltas */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
                Metric Deltas
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                {[
                  { key: 'stabilityScore', label: 'Stability', unit: 'pts', val: comparisonDelta.metricDeltas.stabilityScore },
                  { key: 'equityScore', label: 'Equity', unit: 'pts', val: comparisonDelta.metricDeltas.equityScore },
                  { key: 'costEfficiency', label: 'Cost Eff.', unit: 'ratio', val: comparisonDelta.metricDeltas.costEfficiency },
                  { key: 'totalOutageHours', label: 'Outage Hours', unit: 'zone·h', val: comparisonDelta.metricDeltas.totalOutageHours, invert: true },
                ].map(({ label, unit, val, invert }) => (
                  <div
                    key={label}
                    style={{
                      background: '#0f172a',
                      borderRadius: 8,
                      padding: '10px 12px',
                      border: '1px solid #1e293b',
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{label}</div>
                    <DeltaBadge value={val} unit={unit} invert={invert} />
                  </div>
                ))}
              </div>
            </div>

            {/* Zone-level outage delta */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
                Zone Outage Δ (zone·hours)
              </div>
              {mockZones.map((zone) => {
                const delta = comparisonDelta.outageByZoneDelta[zone.id] ?? 0;
                const improved = comparisonDelta.improvedZones.includes(zone.id);
                const worsened = comparisonDelta.worsenedZones.includes(zone.id);
                const barColor = improved ? '#22c55e' : worsened ? '#ef4444' : '#334155';
                const maxDelta = Math.max(
                  1,
                  ...Object.values(comparisonDelta.outageByZoneDelta).map(Math.abs),
                );
                const barPct = (Math.abs(delta) / maxDelta) * 100;

                return (
                  <div key={zone.id} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{zone.name}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: improved ? '#22c55e' : worsened ? '#ef4444' : '#64748b',
                        }}
                      >
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}h
                      </span>
                    </div>
                    <div style={{ height: 4, background: '#1e293b', borderRadius: 2 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${barPct}%`,
                          background: barColor,
                          borderRadius: 2,
                          marginLeft: delta < 0 ? `${100 - barPct}%` : 0,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => useSimulationStore.getState().clearComparison()}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '8px',
                borderRadius: 6,
                border: '1px solid #334155',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Clear Baseline
            </button>
          </>
        )}
      </div>
    </div>
  );
}
