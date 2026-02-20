import { useRef, useEffect } from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { usePlanStore } from '../stores/planStore';
import { EventLogEntry } from '../types/grid';

function EventRow({ entry }: { entry: EventLogEntry }) {
  const icon =
    entry.severity === 'critical' ? '🔴' : entry.severity === 'warning' ? '🟡' : 'ℹ️';
  const color =
    entry.severity === 'critical'
      ? '#fca5a5'
      : entry.severity === 'warning'
      ? '#fcd34d'
      : '#94a3b8';

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '5px 12px',
        borderBottom: '1px solid #1e293b',
        alignItems: 'flex-start',
      }}
    >
      <span style={{ flexShrink: 0, fontSize: 12 }}>{icon}</span>
      <span style={{ fontSize: 10, color: '#475569', flexShrink: 0, paddingTop: 1 }}>
        T+{entry.timestep}h
      </span>
      <span style={{ fontSize: 11, color, lineHeight: 1.4 }}>{entry.message}</span>
    </div>
  );
}

export default function EventLogDrawer() {
  const { showEventLog, toggleEventLog, visibleEvents, currentResult } = useSimulationStore();
  const selectedScenario = usePlanStore((s) => s.selectedScenario());
  const scrollRef = useRef<HTMLDivElement>(null);

  const events = currentResult ? visibleEvents(selectedScenario ?? ({} as never)) : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  if (!showEventLog) {
    return (
      <button
        onClick={toggleEventLog}
        style={{
          position: 'absolute',
          bottom: 8,
          left: 12,
          padding: '5px 12px',
          borderRadius: 6,
          border: 'none',
          background: '#1e293b',
          color: '#94a3b8',
          fontSize: 11,
          cursor: 'pointer',
          fontWeight: 600,
          zIndex: 20,
        }}
      >
        📋 Event Log ({events.length})
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 380,
        maxHeight: '45%',
        background: 'rgba(10,15,30,0.95)',
        borderTop: '1px solid #1e293b',
        borderRight: '1px solid #1e293b',
        borderRadius: '0 8px 0 0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
          Event Log — {events.length} events
        </span>
        <button
          onClick={toggleEventLog}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 14,
            padding: 2,
          }}
        >
          ✕
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, padding: '6px 12px', flexShrink: 0 }}>
        {['critical', 'warning', 'info'].map((sev) => {
          const count = events.filter((e) => e.severity === sev).length;
          const color =
            sev === 'critical' ? '#ef4444' : sev === 'warning' ? '#f97316' : '#64748b';
          return (
            <span
              key={sev}
              style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 12,
                background: '#1e293b',
                color,
                fontWeight: 600,
              }}
            >
              {sev}: {count}
            </span>
          );
        })}
      </div>

      {/* Scrollable event list */}
      <div
        ref={scrollRef}
        style={{ overflowY: 'auto', flex: 1 }}
      >
        {events.length === 0 ? (
          <div style={{ padding: '20px 12px', color: '#475569', fontSize: 12, textAlign: 'center' }}>
            No events at current timeline position
          </div>
        ) : (
          [...events].reverse().map((e, i) => <EventRow key={i} entry={e} />)
        )}
      </div>
    </div>
  );
}
