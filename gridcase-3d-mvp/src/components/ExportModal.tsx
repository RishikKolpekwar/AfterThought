import { useMemo } from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { usePlanStore } from '../stores/planStore';
import { exportSnapshot } from '../sim/engine';
import { mockScenarios } from '../data/mockAustin';

export default function ExportModal() {
  const { showExportModal, toggleExportModal, currentResult, comparisonDelta } =
    useSimulationStore();
  const { currentPlan, selectedScenarioId } = usePlanStore();

  const scenario = mockScenarios.find((s) => s.id === selectedScenarioId);

  const snapshot = useMemo(() => {
    if (!currentResult || !scenario) return null;
    return exportSnapshot(currentPlan, scenario, currentResult, comparisonDelta ?? undefined);
  }, [currentPlan, scenario, currentResult, comparisonDelta]);

  const jsonString = useMemo(
    () => (snapshot ? JSON.stringify(snapshot, null, 2) : ''),
    [snapshot],
  );

  const handleDownload = () => {
    if (!jsonString || !snapshot) return;
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gridcase-filing-${snapshot.snapshotId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!showExportModal) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) toggleExportModal(); }}
    >
      <div
        style={{
          width: 680,
          maxHeight: '85vh',
          background: '#0f172a',
          borderRadius: 12,
          border: '1px solid #1e293b',
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
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
              📄 Export Filing Snapshot
            </div>
            {snapshot && (
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                ID: <code style={{ color: '#60a5fa' }}>{snapshot.snapshotId}</code> · Run:{' '}
                <code style={{ color: '#a78bfa' }}>{snapshot.auditTrail.runId}</code>
              </div>
            )}
          </div>
          <button
            onClick={toggleExportModal}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}
          >
            ✕
          </button>
        </div>

        {/* Audit summary */}
        {snapshot && (
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid #1e293b',
              flexShrink: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            {[
              { label: 'Plan Version', value: snapshot.planVersion.name },
              { label: 'Scenario', value: snapshot.scenario.name },
              { label: 'Seed', value: `${snapshot.auditTrail.seed}` },
              { label: 'Stability', value: `${(snapshot.result.metrics.stabilityScore * 100).toFixed(1)}%` },
              { label: 'Equity', value: `${(snapshot.result.metrics.equityScore * 100).toFixed(1)}%` },
              { label: 'CapEx', value: `$${(snapshot.planVersion.projects.reduce((s, p) => s + p.capexUSD, 0) / 1e6).toFixed(0)}M` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#1e293b', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* JSON preview */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
          {!snapshot ? (
            <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
              Run a simulation first to generate a snapshot.
            </div>
          ) : (
            <pre
              style={{
                fontSize: 10,
                color: '#94a3b8',
                lineHeight: 1.5,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0,
              }}
            >
              {jsonString}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleDownload}
            disabled={!snapshot}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 8,
              border: 'none',
              background: snapshot ? '#1d4ed8' : '#1e293b',
              color: snapshot ? '#fff' : '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: snapshot ? 'pointer' : 'default',
            }}
          >
            ⬇ Download JSON
          </button>
          <button
            onClick={() => {
              if (jsonString) navigator.clipboard.writeText(jsonString);
            }}
            disabled={!snapshot}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: 'transparent',
              color: snapshot ? '#94a3b8' : '#475569',
              fontSize: 13,
              cursor: snapshot ? 'pointer' : 'default',
            }}
          >
            Copy
          </button>
          <button
            onClick={toggleExportModal}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: 'transparent',
              color: '#64748b',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
