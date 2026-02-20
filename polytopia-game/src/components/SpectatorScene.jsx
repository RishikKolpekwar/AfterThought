import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TILE_SPACING, MAP_SIZE, TERRAIN_HEIGHTS } from '../core/constants.js';
import { useSpectatorStore } from '../store/spectatorStore.js';
import Tile from './Tile.jsx';
import UnitModel from './UnitModel.jsx';

function Starfield({ count = 2000 }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 1] = (Math.random() - 0.3) * 80 - 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
    }
    return positions;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={points} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={0xffffff} size={0.15} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

/* ─── Polytopia-style low-poly triangulated cloud surface ─── */
function FogCloudSurface({ fogTiles, mapOffset }) {
  const geometry = useMemo(() => {
    if (fogTiles.length === 0) return null;

    const fogSet = new Set(fogTiles.map(t => `${t.x},${t.z}`));
    const verts = [];
    const indices = [];
    const colors = [];
    const vertMap = new Map();

    const hash = (x, z) => {
      let h = (x * 374761393 + z * 668265263) ^ 0x5bd1e995;
      h = Math.abs(h) / 2147483647;
      return h;
    };

    const addVert = (x, y, z, r, g, b) => {
      const key = `${x.toFixed(3)},${z.toFixed(3)}`;
      if (vertMap.has(key)) return vertMap.get(key);
      const idx = verts.length / 3;
      verts.push(x, y, z);
      colors.push(r, g, b);
      vertMap.set(key, idx);
      return idx;
    };

    const baseY = 0.25;

    for (const { x, z } of fogTiles) {
      const px = x * TILE_SPACING - mapOffset + TILE_SPACING / 2;
      const pz = z * TILE_SPACING - mapOffset + TILE_SPACING / 2;
      const half = TILE_SPACING / 2;

      const hCenter = baseY + hash(x, z) * 0.18 + 0.05;
      const hTL = baseY + hash(x - 1, z - 1) * 0.15;
      const hTR = baseY + hash(x + 1, z - 1) * 0.15;
      const hBL = baseY + hash(x - 1, z + 1) * 0.15;
      const hBR = baseY + hash(x + 1, z + 1) * 0.15;

      const cv = hash(x * 3, z * 7);
      const shade = 0.78 + cv * 0.22;
      const blueShift = cv * 0.06;
      const r = shade - blueShift * 0.5;
      const g = shade - blueShift * 0.3;
      const b = Math.min(1.0, shade + blueShift);

      const cv2 = hash(x * 7 + 3, z * 3 + 5);
      const shade2 = 0.72 + cv2 * 0.22;
      const r2 = shade2 - blueShift * 0.3;
      const g2 = shade2 - blueShift * 0.2;
      const b2 = Math.min(1.0, shade2 + blueShift * 1.2);

      const tl = addVert(px - half, hTL, pz - half, r2, g2, b2);
      const tr = addVert(px + half, hTR, pz - half, r, g, b);
      const bl = addVert(px - half, hBL, pz + half, r, g, b);
      const br = addVert(px + half, hBR, pz + half, r2, g2, b2);
      const ct = addVert(px, hCenter, pz, shade, shade, Math.min(1.0, shade + 0.04));

      indices.push(tl, tr, ct);
      indices.push(tr, br, ct);
      indices.push(br, bl, ct);
      indices.push(bl, tl, ct);
    }

    for (const { x, z } of fogTiles) {
      const px = x * TILE_SPACING - mapOffset + TILE_SPACING / 2;
      const pz = z * TILE_SPACING - mapOffset + TILE_SPACING / 2;
      const half = TILE_SPACING / 2;

      const dirs = [
        { dx: 0, dz: -1, corners: [[px - half, pz - half], [px + half, pz - half]] },
        { dx: 0, dz: 1, corners: [[px + half, pz + half], [px - half, pz + half]] },
        { dx: -1, dz: 0, corners: [[px - half, pz + half], [px - half, pz - half]] },
        { dx: 1, dz: 0, corners: [[px + half, pz - half], [px + half, pz + half]] },
      ];

      for (const { dx, dz, corners } of dirs) {
        const nx = x + dx;
        const nz = z + dz;
        if (!fogSet.has(`${nx},${nz}`)) {
          const [[ax, az], [bx, bz]] = corners;
          const topA = vertMap.get(`${ax.toFixed(3)},${az.toFixed(3)}`);
          const topB = vertMap.get(`${bx.toFixed(3)},${bz.toFixed(3)}`);
          if (topA !== undefined && topB !== undefined) {
            const dropY = -0.3;
            const midX = (ax + bx) / 2;
            const midZ = (az + bz) / 2;
            const cv = hash(nx * 5, nz * 11);
            const s = 0.65 + cv * 0.15;
            const botMid = addVert(midX + (dx * 0.15), dropY + cv * 0.1, midZ + (dz * 0.15), s, s, Math.min(1.0, s + 0.08));
            const botA = addVert(ax + (dx * 0.05), dropY + 0.08, az + (dz * 0.05), s * 0.95, s * 0.95, Math.min(1.0, s + 0.05));
            const botB = addVert(bx + (dx * 0.05), dropY + 0.08, bz + (dz * 0.05), s * 0.95, s * 0.95, Math.min(1.0, s + 0.05));
            indices.push(topA, topB, botMid);
            indices.push(topA, botMid, botA);
            indices.push(topB, botB, botMid);
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [fogTiles, mapOffset]);

  const meshRef = useRef();
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(Date.now() * 0.0005) * 0.02;
    }
  });

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        flatShading
        roughness={0.6}
        metalness={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ─── Territory Fences ─── */
const FENCE_COLOR = 0x8b4513;
const POST_COLOR = 0x6b3a1f;

function FenceSegment({ px, pz, tileHeight, axis }) {
  const half = TILE_SPACING / 2;
  const fenceH = 0.18;
  const baseY = tileHeight;
  const isX = axis === 'x';

  const railLen = TILE_SPACING - 0.02;
  const railArgs = isX ? [railLen, 0.03, 0.025] : [0.025, 0.03, railLen];

  const posts = isX
    ? [[-half + 0.03, 0], [0, 0], [half - 0.03, 0]]
    : [[0, -half + 0.03], [0, 0], [0, half - 0.03]];

  return (
    <group>
      <mesh position={[px, baseY + fenceH * 0.8, pz]} castShadow>
        <boxGeometry args={railArgs} />
        <meshStandardMaterial color={FENCE_COLOR} roughness={0.7} />
      </mesh>
      <mesh position={[px, baseY + fenceH * 0.35, pz]} castShadow>
        <boxGeometry args={railArgs} />
        <meshStandardMaterial color={FENCE_COLOR} roughness={0.7} />
      </mesh>
      {posts.map(([dx, dz], i) => (
        <mesh key={i} position={[px + dx, baseY + fenceH / 2, pz + dz]} castShadow>
          <boxGeometry args={[0.04, fenceH, 0.04]} />
          <meshStandardMaterial color={POST_COLOR} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function TerritoryFences({ tiles, gameState, visibility, mapOffset }) {
  const edges = useMemo(() => {
    const result = [];
    for (const tile of tiles) {
      if (tile.owner < 0) continue;
      if (!visibility.has(`${tile.x},${tile.z}`)) continue;

      const h = TERRAIN_HEIGHTS[tile.terrain] || 0.15;
      const px = tile.x * TILE_SPACING - mapOffset + TILE_SPACING / 2;
      const pz = tile.z * TILE_SPACING - mapOffset + TILE_SPACING / 2;
      const half = TILE_SPACING / 2;

      const dirs = [
        { dx: 0, dz: -1, edgePx: px, edgePz: pz - half, axis: 'x' },
        { dx: 0, dz: 1, edgePx: px, edgePz: pz + half, axis: 'x' },
        { dx: 1, dz: 0, edgePx: px + half, edgePz: pz, axis: 'z' },
        { dx: -1, dz: 0, edgePx: px - half, edgePz: pz, axis: 'z' },
      ];

      for (const { dx, dz, edgePx, edgePz, axis } of dirs) {
        const neighbor = gameState.getTile(tile.x + dx, tile.z + dz);
        if (!neighbor || neighbor.owner !== tile.owner) {
          result.push({ key: `${tile.x},${tile.z},${dx},${dz}`, px: edgePx, pz: edgePz, h, axis });
        }
      }
    }
    return result;
  }, [tiles, gameState, visibility, mapOffset]);

  return (
    <group>
      {edges.map(({ key, px, pz, h, axis }) => (
        <FenceSegment key={key} px={px} pz={pz} tileHeight={h} axis={axis} />
      ))}
    </group>
  );
}

const noop = () => {};

export default function SpectatorScene() {
  const tiles = useSpectatorStore(s => s.tiles);
  const units = useSpectatorStore(s => s.units);
  const visibility = useSpectatorStore(s => s.visibility);
  const gameState = useSpectatorStore(s => s.gameState);

  const mapOffset = (MAP_SIZE * TILE_SPACING) / 2;

  // Fogged tiles
  const fogTiles = useMemo(() => {
    const fogged = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      for (let z = 0; z < MAP_SIZE; z++) {
        if (!visibility.has(`${x},${z}`)) {
          fogged.push({ x, z });
        }
      }
    }
    return fogged;
  }, [visibility]);

  // All living visible units
  const visibleUnits = useMemo(() => {
    return units.filter(u => u.hp > 0 && visibility.has(`${u.x},${u.z}`));
  }, [units, visibility]);

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 15, 10]} intensity={1.2} color={0xfff4e0} castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15} shadow-camera-right={15}
        shadow-camera-top={15} shadow-camera-bottom={-15}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} color={0x8ecae6} />

      <Starfield />

      {tiles.map((tile) => (
        <Tile
          key={`${tile.x}-${tile.z}`}
          tile={tile}
          mapOffset={mapOffset}
          onClick={noop}
          fogged={!visibility.has(`${tile.x},${tile.z}`)}
        />
      ))}

      <TerritoryFences tiles={tiles} gameState={gameState} visibility={visibility} mapOffset={mapOffset} />

      <FogCloudSurface fogTiles={fogTiles} mapOffset={mapOffset} />

      {visibleUnits.map((unit) => (
        <UnitModel
          key={unit.id}
          unit={unit}
          mapOffset={mapOffset}
          isSelected={false}
          onClick={noop}
          gameState={gameState}
        />
      ))}
    </group>
  );
}
