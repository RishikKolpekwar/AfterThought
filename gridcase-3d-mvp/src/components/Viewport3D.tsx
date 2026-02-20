import { useState, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Zone, GridNode, GridEdge } from '../types/grid';
import { mockZones, mockNodes, mockEdges } from '../data/mockAustin';
import { usePlanStore } from '../stores/planStore';
import { useSimulationStore } from '../stores/simulationStore';
import LayerLegend from './LayerLegend';

// ─── Color helpers ────────────────────────────────────────────────────────────
function vulnerabilityColor(v: number): string {
  if (v < 0.3)  return '#22c55e';
  if (v < 0.55) return '#eab308';
  if (v < 0.75) return '#f97316';
  return '#ef4444';
}
function incomeColor(income: number): string {
  const norm = Math.min(income / 130000, 1);
  if (norm > 0.7)  return '#22d3ee';
  if (norm > 0.45) return '#60a5fa';
  if (norm > 0.25) return '#a78bfa';
  return '#f472b6';
}
function infraAgeColor(age: number): string {
  if (age < 0.35) return '#4ade80';
  if (age < 0.60) return '#facc15';
  if (age < 0.80) return '#fb923c';
  return '#f87171';
}
function outageBaseColor(outageRatio: number): string {
  if (outageRatio <= 0)   return '#1e3a5f';
  if (outageRatio < 0.2)  return '#1d4ed8';
  if (outageRatio < 0.5)  return '#f97316';
  return '#dc2626';
}

// ─── Zone Mesh (flat tile) ────────────────────────────────────────────────────
interface ZoneMeshProps {
  zone: Zone;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

function ZoneMesh({ zone, color, isSelected, onClick }: ZoneMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    zone.polygon2D.forEach(([x, z], i) => {
      if (i === 0) s.moveTo(x, z);
      else s.lineTo(x, z);
    });
    s.lineTo(zone.polygon2D[0][0], zone.polygon2D[0][1]);
    return s;
  }, [zone]);

  const geometry = useMemo(
    () => new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }),
    [shape],
  );

  const centroid = useMemo<[number, number, number]>(() => {
    const ax = zone.polygon2D.reduce((s, [x]) => s + x, 0) / zone.polygon2D.length;
    const az = zone.polygon2D.reduce((s, [, z]) => s + z, 0) / zone.polygon2D.length;
    return [ax, 0.4, az];
  }, [zone]);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.color.set(color);
    mat.emissive.set(isSelected ? '#ffffff' : '#000000');
    mat.emissiveIntensity = isSelected ? 0.15 : 0;
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        receiveShadow
      >
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Border */}
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <meshBasicMaterial
          color={isSelected ? '#ffffff' : '#334155'}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Label */}
      <Html position={centroid} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#e2e8f0',
          fontSize: '9px',
          fontWeight: 700,
          textShadow: '0 0 6px #000',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}>
          {zone.name}
        </div>
      </Html>
    </group>
  );
}

// ─── Node Sphere ──────────────────────────────────────────────────────────────
function NodeSphere({
  node, status, onClick,
}: { node: GridNode; status: 'operational' | 'failed'; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = status === 'failed' ? '#ef4444' : node.critical ? '#f59e0b' : '#3b82f6';
  const [x, , z] = node.position;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = status === 'failed'
      ? 0.5 + Math.sin(clock.elapsedTime * 5) * 0.4
      : 0.2;
  });

  return (
    <mesh ref={meshRef} position={[x, 0.5, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <sphereGeometry args={[node.critical ? 0.28 : 0.2, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.2} metalness={0.4} />
    </mesh>
  );
}

// ─── Grid Edge Line ───────────────────────────────────────────────────────────
function GridEdgeLine({
  edge, fromNode, toNode, fromStatus, toStatus,
}: {
  edge: GridEdge; fromNode: GridNode; toNode: GridNode;
  fromStatus: 'operational' | 'failed'; toStatus: 'operational' | 'failed';
}) {
  const bothFailed = fromStatus === 'failed' && toStatus === 'failed';
  const anyFailed  = fromStatus === 'failed' || toStatus === 'failed';
  const color = edge.status === 'failed' || bothFailed ? '#ef4444' : anyFailed ? '#f97316' : '#3b82f6';
  const [fx, , fz] = fromNode.position;
  const [tx, , tz] = toNode.position;

  const points = useMemo(
    () => [new THREE.Vector3(fx, 0.5, fz), new THREE.Vector3(tx, 0.5, tz)],
    [fx, fz, tx, tz],
  );

  return (
    <Line points={points} color={color} lineWidth={anyFailed ? 1 : 1.5} transparent opacity={anyFailed ? 0.5 : 0.8} />
  );
}

// ─── Scene Contents ───────────────────────────────────────────────────────────
function SceneContents({
  selectedZoneId, setSelectedZoneId,
}: { selectedZoneId: string | null; setSelectedZoneId: (id: string | null) => void }) {
  const { layerMode } = usePlanStore();
  const { nodeStatusAtTime, currentResult, timelinePosition } = useSimulationStore();

  const maxOutageHours = useMemo(
    () => (!currentResult ? 1 : Math.max(1, ...Object.values(currentResult.outageByZone))),
    [currentResult],
  );

  const getColor = useCallback(
    (zone: Zone) => {
      switch (layerMode) {
        case 'income':        return incomeColor(zone.medianIncome);
        case 'vulnerability': return vulnerabilityColor(zone.vulnerability);
        case 'infra-age':     return infraAgeColor(zone.infraAgeIndex);
        default:              return outageBaseColor((currentResult?.outageByZone[zone.id] ?? 0) / maxOutageHours);
      }
    },
    [layerMode, currentResult, maxOutageHours],
  );

  const getNodeStatus = useCallback(
    (node: GridNode): 'operational' | 'failed' => {
      if (!currentResult) return node.status === 'failed' ? 'failed' : 'operational';
      return nodeStatusAtTime(node.id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentResult, nodeStatusAtTime, timelinePosition],
  );

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} color="#60a5fa" />
      <gridHelper args={[30, 30, '#1e293b', '#0f172a']} position={[0, -0.05, 0]} />

      {mockZones.map((zone) => (
        <ZoneMesh
          key={zone.id}
          zone={zone}
          color={getColor(zone)}
          isSelected={zone.id === selectedZoneId}
          onClick={() => setSelectedZoneId(zone.id === selectedZoneId ? null : zone.id)}
        />
      ))}

      {mockNodes.map((node) => (
        <NodeSphere
          key={node.id}
          node={node}
          status={getNodeStatus(node)}
          onClick={() => setSelectedZoneId(node.zoneId === selectedZoneId ? null : node.zoneId)}
        />
      ))}

      {mockEdges.map((edge) => {
        const from = mockNodes.find((n) => n.id === edge.fromNodeId);
        const to   = mockNodes.find((n) => n.id === edge.toNodeId);
        if (!from || !to) return null;
        return (
          <GridEdgeLine
            key={edge.id}
            edge={edge}
            fromNode={from}
            toNode={to}
            fromStatus={getNodeStatus(from)}
            toStatus={getNodeStatus(to)}
          />
        );
      })}
    </>
  );
}

// ─── Layer toggle bar ─────────────────────────────────────────────────────────
function LayerToggleBar() {
  const { layerMode, setLayerMode } = usePlanStore();
  const modes: { key: typeof layerMode; label: string }[] = [
    { key: 'outage',        label: 'Outage' },
    { key: 'income',        label: 'Income' },
    { key: 'vulnerability', label: 'Vulnerability' },
    { key: 'infra-age',     label: 'Infra Age' },
  ];

  return (
    <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, zIndex: 10 }}>
      {modes.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setLayerMode(key)}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            border: `1px solid ${layerMode === key ? '#3b82f6' : '#1e293b'}`,
            background: layerMode === key ? '#1d4ed8' : 'rgba(10,15,30,0.82)',
            color: layerMode === key ? '#fff' : '#64748b',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.15s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Viewport3D() {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const timelinePosition = useSimulationStore((s) => s.timelinePosition);
  void timelinePosition;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <LayerToggleBar />
      <Canvas
        camera={{ position: [0, 22, 18], fov: 40, near: 0.1, far: 500 }}
        shadows
        style={{ background: '#0a0f1e' }}
      >
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.2}
          minDistance={5}
          maxDistance={60}
          enablePan
          panSpeed={0.8}
          zoomSpeed={0.8}
        />
        <SceneContents selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId} />
      </Canvas>
      <LayerLegend />
    </div>
  );
}
