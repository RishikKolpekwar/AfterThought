import { usePlanStore } from '../stores/planStore';

interface LegendItem {
  color: string;
  label: string;
}

const LAYER_LEGENDS: Record<string, { title: string; items: LegendItem[] }> = {
  outage: {
    title: 'Outage Severity',
    items: [
      { color: '#1e3a5f', label: 'No outage' },
      { color: '#1d4ed8', label: 'Light (<20%)' },
      { color: '#f97316', label: 'Moderate (20–50%)' },
      { color: '#dc2626', label: 'Severe (>50%)' },
    ],
  },
  income: {
    title: 'Median Income',
    items: [
      { color: '#f472b6', label: 'Low  (<$45k)' },
      { color: '#a78bfa', label: 'Moderate ($45–65k)' },
      { color: '#60a5fa', label: 'Upper-mid ($65–90k)' },
      { color: '#22d3ee', label: 'High  (>$90k)' },
    ],
  },
  vulnerability: {
    title: 'Grid Vulnerability',
    items: [
      { color: '#22c55e', label: 'Low  (< 0.30)' },
      { color: '#eab308', label: 'Moderate (0.30–0.55)' },
      { color: '#f97316', label: 'High  (0.55–0.75)' },
      { color: '#ef4444', label: 'Critical  (> 0.75)' },
    ],
  },
  'infra-age': {
    title: 'Infrastructure Age',
    items: [
      { color: '#4ade80', label: 'Modern  (< 35%)' },
      { color: '#facc15', label: 'Aging  (35–60%)' },
      { color: '#fb923c', label: 'Old  (60–80%)' },
      { color: '#f87171', label: 'End-of-life (> 80%)' },
    ],
  },
};

const NODE_LEGEND: LegendItem[] = [
  { color: '#3b82f6', label: 'Substation — operational' },
  { color: '#f59e0b', label: 'Substation — critical node' },
  { color: '#ef4444', label: 'Substation — failed' },
];

const EDGE_LEGEND: LegendItem[] = [
  { color: '#3b82f6', label: 'Edge — active' },
  { color: '#f97316', label: 'Edge — partial failure' },
  { color: '#ef4444', label: 'Edge — failed' },
];

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 5px ${color}88`,
        }}
      />
      <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function NodeSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function EdgeSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
      <div
        style={{
          width: 18,
          height: 2,
          background: color,
          flexShrink: 0,
          borderRadius: 1,
          boxShadow: `0 0 4px ${color}`,
        }}
      />
      <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

export default function LayerLegend() {
  const layerMode = usePlanStore((s) => s.layerMode);
  const legend = LAYER_LEGENDS[layerMode];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        background: 'rgba(10, 15, 30, 0.88)',
        border: '1px solid #1e293b',
        borderRadius: 10,
        padding: '12px 14px',
        zIndex: 10,
        backdropFilter: 'blur(8px)',
        minWidth: 180,
      }}
    >
      {/* Zone color legend */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 7,
          }}
        >
          {legend.title}
        </div>
        {legend.items.map((item) => (
          <Swatch key={item.label} color={item.color} label={item.label} />
        ))}
      </div>

      <div style={{ height: 1, background: '#1e293b', marginBottom: 10 }} />

      {/* Node legend */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 7,
          }}
        >
          Substations
        </div>
        {NODE_LEGEND.map((item) => (
          <NodeSwatch key={item.label} color={item.color} label={item.label} />
        ))}
      </div>

      <div style={{ height: 1, background: '#1e293b', marginBottom: 10 }} />

      {/* Edge legend */}
      <div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 7,
          }}
        >
          Transmission Lines
        </div>
        {EDGE_LEGEND.map((item) => (
          <EdgeSwatch key={item.label} color={item.color} label={item.label} />
        ))}
      </div>
    </div>
  );
}
