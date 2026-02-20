import { useState, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Zone, GridNode, GridEdge } from '../types/grid';
import { mockZones, mockNodes, mockEdges } from '../data/mockAustin';
import { usePlanStore } from '../stores/planStore';
import { useSimulationStore } from '../stores/simulationStore';
import LayerLegend from './LayerLegend';

// ─── Zone building heights (district density / built environment) ──────────────
const ZONE_HEIGHTS: Record<string, number> = {
  'z-downtown':      4.5,
  'z-mueller':       3.0,
  'z-south':         2.4,
  'z-east':          2.0,
  'z-north':         1.8,
  'z-cedar-park':    1.6,
  'z-pflugerville':  1.5,
  'z-westlake':      1.4,
  'z-buda':          1.4,
  'z-hyde-park':     1.2,
  'z-bee-cave':      1.2,
  'z-manor':         1.0,
  'z-rundberg':      0.9,
  'z-montopolis':    0.85,
  'z-sunset-valley': 0.8,
};

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

// ─── Tower layout — deterministic golden-angle spiral within zone bounds ──────
interface TowerSpec {
  pos: [number, number, number];
  dims: [number, number, number];
}

function getTowerSpecs(zone: Zone, zoneHeight: number): TowerSpec[] {
  const xs = zone.polygon2D.map(([x]) => x);
  const zs = zone.polygon2D.map(([, z]) => z);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const w  = (maxX - minX) * 0.68;
  const d  = (maxZ - minZ) * 0.68;

  const count = zoneHeight >= 4 ? 7 : zoneHeight >= 2.5 ? 5 : zoneHeight >= 1.5 ? 4 : 2;
  const GOLDEN = 1.6180339887;

  return Array.from({ length: count }, (_, i) => {
    const angle  = i * GOLDEN * Math.PI * 2;
    const r      = 0.12 + (i / count) * 0.42;
    const px     = cx + Math.cos(angle) * r * w;
    const pz     = cz + Math.sin(angle) * r * d;
    const tH     = zoneHeight * (0.55 + (i % 3) * 0.35);
    const tW     = 0.24 + (i % 3) * 0.14;
    return {
      pos:  [px, zoneHeight + tH / 2, pz] as [number, number, number],
      dims: [tW, tH, tW]               as [number, number, number],
    };
  });
}

// ─── Individual building towers scattered on top of a zone ───────────────────
function BuildingTowers({
  zone, zoneHeight, isInOutage, isInfoLayer,
}: { zone: Zone; zoneHeight: number; isInOutage: boolean; isInfoLayer: boolean }) {
  const specs     = useMemo(() => getTowerSpecs(zone, zoneHeight), [zone, zoneHeight]);
  const meshRefs  = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    meshRefs.current.forEach((m) => {
      if (!m) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (isInOutage) {
        mat.emissiveIntensity = 0.04 + Math.sin(clock.elapsedTime * 3.5) * 0.03;
      } else if (!isInfoLayer) {
        // Subtle window flicker
        mat.emissiveIntensity = 0.16 + Math.sin(clock.elapsedTime * 0.9 + zone.id.length * 0.3) * 0.05;
      }
    });
  });

  return (
    <>
      {specs.map((s, i) => (
        <mesh key={i} ref={(el) => { meshRefs.current[i] = el; }} position={s.pos}>
          <boxGeometry args={s.dims} />
          <meshStandardMaterial
            color={isInOutage ? '#110505' : isInfoLayer ? '#1a2540' : '#0d1f3c'}
            emissive={isInOutage ? '#600000' : '#f59e0b'}
            emissiveIntensity={isInOutage ? 0.04 : 0.16}
            roughness={0.28}
            metalness={0.55}
          />
        </mesh>
      ))}
    </>
  );
}

// ─── Zone Mesh ────────────────────────────────────────────────────────────────
interface ZoneMeshProps {
  zone: Zone;
  baseColor: string;
  zoneHeight: number;
  isInOutage: boolean;
  isInfoLayer: boolean;
  onClick: () => void;
  isSelected: boolean;
}

function ZoneMesh({ zone, baseColor, zoneHeight, isInOutage, isInfoLayer, onClick, isSelected }: ZoneMeshProps) {
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
    () => new THREE.ExtrudeGeometry(shape, { depth: zoneHeight, bevelEnabled: false }),
    [shape, zoneHeight],
  );

  const centroid = useMemo<[number, number, number]>(() => {
    const ax = zone.polygon2D.reduce((s, [x]) => s + x, 0) / zone.polygon2D.length;
    const az = zone.polygon2D.reduce((s, [, z]) => s + z, 0) / zone.polygon2D.length;
    return [ax, zoneHeight + 0.4, az];
  }, [zone, zoneHeight]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    if (isSelected) {
      mat.emissive.set('#ffffff');
      mat.emissiveIntensity = 0.18;
      return;
    }
    if (isInOutage) {
      mat.color.set('#0e0404');
      mat.emissive.set('#6b0000');
      mat.emissiveIntensity = 0.07 + Math.sin(clock.elapsedTime * 2.5) * 0.05;
    } else if (isInfoLayer) {
      mat.color.set(baseColor);
      mat.emissive.set('#000000');
      mat.emissiveIntensity = 0;
    } else {
      // Lit city — warm amber window glow varies per zone
      mat.color.set(baseColor);
      mat.emissive.set('#b06010');
      mat.emissiveIntensity = 0.1 + Math.sin(clock.elapsedTime * 0.6 + zone.id.length) * 0.04;
    }
  });

  return (
    <group>
      {/* Main extruded block — lies flat via -90° X rotation */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={baseColor}
          roughness={0.45}
          metalness={0.25}
          emissive="#b06010"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Faint outline */}
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <meshBasicMaterial
          color={isSelected ? '#ffffff' : isInOutage ? '#4a0000' : '#0f2040'}
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Floating label */}
      <Html position={centroid} center distanceFactor={24} style={{ pointerEvents: 'none' }}>
        <div style={{
          color: isInOutage ? '#fca5a5' : '#cbd5e1',
          fontSize: '8.5px',
          fontWeight: 700,
          textShadow: '0 0 8px #000, 0 0 16px #000',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          letterSpacing: '0.03em',
        }}>
          {zone.name}
        </div>
      </Html>

      {/* Towers */}
      <BuildingTowers zone={zone} zoneHeight={zoneHeight} isInOutage={isInOutage} isInfoLayer={isInfoLayer} />
    </group>
  );
}

// ─── Node Sphere ──────────────────────────────────────────────────────────────
function NodeSphere({
  node, status, yPos, onClick,
}: { node: GridNode; status: 'operational' | 'failed'; yPos: number; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color   = status === 'failed' ? '#ef4444' : node.critical ? '#f59e0b' : '#3b82f6';
  const [x, , z] = node.position;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = status === 'failed'
      ? 0.5 + Math.sin(clock.elapsedTime * 5) * 0.4
      : 0.25 + Math.sin(clock.elapsedTime * 1.2 + x) * 0.12;
  });

  return (
    <group>
      <mesh ref={meshRef} position={[x, yPos, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[node.critical ? 0.34 : 0.24, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.15} metalness={0.6} />
      </mesh>
      {/* Ground glow ring */}
      <mesh position={[x, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.44, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} />
      </mesh>
    </group>
  );
}

// ─── Grid Edge Line ───────────────────────────────────────────────────────────
function GridEdgeLine({
  edge, fromNode, toNode, fromY, toY, fromStatus, toStatus,
}: {
  edge: GridEdge; fromNode: GridNode; toNode: GridNode;
  fromY: number; toY: number;
  fromStatus: 'operational' | 'failed'; toStatus: 'operational' | 'failed';
}) {
  const bothFailed = fromStatus === 'failed' && toStatus === 'failed';
  const anyFailed  = fromStatus === 'failed' || toStatus === 'failed';
  const color      = edge.status === 'failed' || bothFailed ? '#ef4444' : anyFailed ? '#f97316' : '#3b82f6';

  const [fx, , fz] = fromNode.position;
  const [tx, , tz] = toNode.position;
  const points = useMemo(
    () => [new THREE.Vector3(fx, fromY, fz), new THREE.Vector3(tx, toY, tz)],
    [fx, fz, fromY, tx, tz, toY],
  );

  return (
    <Line points={points} color={color} lineWidth={anyFailed ? 1 : 2} transparent opacity={anyFailed ? 0.45 : 0.7} />
  );
}

// ─── Ground ───────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#050c18" roughness={0.92} metalness={0.04} />
      </mesh>
      <gridHelper args={[60, 60, '#0c1a2e', '#0a1525']} position={[0, -0.02, 0]} />
    </>
  );
}

// ─── Lighting ─────────────────────────────────────────────────────────────────
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.15} color="#7aabcc" />
      <directionalLight position={[12, 28, 10]} intensity={0.5} color="#fff8ee" castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-8, 10, -14]} intensity={0.2} color="#3b6abf" />
      {/* City-centre warm glow */}
      <pointLight position={[0, 7, 0]}   intensity={3}   color="#ff9a3c" distance={20} decay={2} />
      <pointLight position={[4, 3, 2]}   intensity={1.4} color="#ff6820" distance={14} decay={2} />
      <pointLight position={[-3, 3, 4]}  intensity={1.0} color="#ffa040" distance={12} decay={2} />
      {/* Substation blue */}
      <pointLight position={[0, 2, 0]}   intensity={1.8} color="#2563eb" distance={16} decay={2} />
    </>
  );
}

// ─── Scene Contents ───────────────────────────────────────────────────────────
function SceneContents({
  selectedZoneId, setSelectedZoneId,
}: { selectedZoneId: string | null; setSelectedZoneId: (id: string | null) => void }) {
  const { layerMode } = usePlanStore();
  const { nodeStatusAtTime, currentResult, timelinePosition } = useSimulationStore();
  const isInfoLayer = layerMode !== 'outage';

  const maxOutageHours = useMemo(
    () => (!currentResult ? 1 : Math.max(1, ...Object.values(currentResult.outageByZone))),
    [currentResult],
  );

  const getBaseColor = useCallback(
    (zone: Zone) => {
      switch (layerMode) {
        case 'income':        return incomeColor(zone.medianIncome);
        case 'vulnerability': return vulnerabilityColor(zone.vulnerability);
        case 'infra-age':     return infraAgeColor(zone.infraAgeIndex);
        default: return outageBaseColor((currentResult?.outageByZone[zone.id] ?? 0) / maxOutageHours);
      }
    },
    [layerMode, currentResult, maxOutageHours],
  );

  const isZoneInOutage = useCallback(
    (zone: Zone) =>
      layerMode === 'outage' && !!currentResult &&
      (currentResult.outageByZone[zone.id] ?? 0) / maxOutageHours > 0.25,
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

  const getNodeY = useCallback(
    (node: GridNode) => (ZONE_HEIGHTS[node.zoneId] ?? 1.0) + 0.5,
    [],
  );

  return (
    <>
      <SceneLighting />
      <Ground />

      {mockZones.map((zone) => (
        <ZoneMesh
          key={zone.id}
          zone={zone}
          baseColor={getBaseColor(zone)}
          zoneHeight={ZONE_HEIGHTS[zone.id] ?? 1.0}
          isInOutage={isZoneInOutage(zone)}
          isInfoLayer={isInfoLayer}
          onClick={() => setSelectedZoneId(zone.id === selectedZoneId ? null : zone.id)}
          isSelected={zone.id === selectedZoneId}
        />
      ))}

      {mockNodes.map((node) => (
        <NodeSphere
          key={node.id}
          node={node}
          status={getNodeStatus(node)}
          yPos={getNodeY(node)}
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
            fromY={getNodeY(from)}
            toY={getNodeY(to)}
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
            background: layerMode === key ? '#1d4ed8' : 'rgba(6,12,26,0.82)',
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
        camera={{ position: [10, 14, 22], fov: 42, near: 0.1, far: 500 }}
        shadows
        style={{ background: '#060c1a' }}
      >
        <fog attach="fog" args={['#060c1a', 38, 80]} />
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.05}
          minDistance={6}
          maxDistance={55}
          enablePan
          panSpeed={0.7}
          zoomSpeed={0.8}
          target={[0, 2, 0]}
        />
        <SceneContents selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId} />
      </Canvas>

      <LayerLegend />
    </div>
  );
}
