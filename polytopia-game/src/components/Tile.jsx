import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import {
  TILE_SPACING,
  TERRAIN,
  TERRAIN_COLORS,
  TERRAIN_HEIGHTS,
  PLAYER_COLORS,
} from '../core/constants.js';

// Offset decorations to back-left corner so units in center stay visible
const DECOR_DX = -0.25;
const DECOR_DZ = -0.25;

/* ─── Field with grass tufts and small flowers ─── */
function FieldDecor({ x, h, z }) {
  const tufts = useMemo(() => {
    const seed = Math.abs(Math.sin(x * 127.1 + z * 311.7)) * 10000;
    const count = 6 + Math.floor(seed % 5);
    return Array.from({ length: count }, (_, i) => {
      const s = Math.abs(Math.sin(seed + i * 73.3)) * 10000;
      return {
        dx: ((s % 100) / 100 - 0.5) * 0.7,
        dz: (((s * 7) % 100) / 100 - 0.5) * 0.7,
        scale: 0.7 + ((s * 3) % 100) / 200,
        isFlower: i < 2, // first 2 are small flowers
        flowerColor: i === 0 ? 0xffe066 : 0xffaacc,
      };
    });
  }, [x, z]);

  return (
    <group>
      {tufts.map((t, i) => (
        <group key={i}>
          <mesh position={[x + t.dx, h + 0.04 * t.scale, z + t.dz]} castShadow>
            <coneGeometry args={[0.025 * t.scale, 0.09 * t.scale, 4]} />
            <meshStandardMaterial color={0x7bc040} />
          </mesh>
          {t.isFlower && (
            <mesh position={[x + t.dx, h + 0.09 * t.scale, z + t.dz]}>
              <sphereGeometry args={[0.018 * t.scale, 5, 4]} />
              <meshStandardMaterial color={t.flowerColor} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function TreeDecor({ x, h, z }) {
  // Multiple cherry blossom trees with pink foliage
  const trees = useMemo(() => {
    const seed = Math.abs(Math.sin(x * 173.7 + z * 259.3)) * 10000;
    const count = 2 + Math.floor(seed % 3); // 2-4 trees
    return Array.from({ length: count }, (_, i) => {
      const s = Math.abs(Math.sin(seed + i * 91.1)) * 10000;
      return {
        dx: ((s % 100) / 100 - 0.5) * 0.55,
        dz: (((s * 7) % 100) / 100 - 0.5) * 0.55,
        scale: 0.7 + ((s * 3) % 100) / 250,
        pinkShade: Math.floor((s * 11) % 3), // 0, 1, or 2
      };
    });
  }, [x, z]);

  const pinks = [0xff85a2, 0xf7a8b8, 0xffb7c5]; // cherry blossom pink shades

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i}>
          {/* Trunk */}
          <mesh position={[x + t.dx, h + 0.1 * t.scale, z + t.dz]} castShadow>
            <cylinderGeometry args={[0.02 * t.scale, 0.04 * t.scale, 0.2 * t.scale, 5]} />
            <meshStandardMaterial color={0x5c3d1e} roughness={0.9} />
          </mesh>
          {/* Main pink canopy - rounded */}
          <mesh position={[x + t.dx, h + 0.28 * t.scale, z + t.dz]} castShadow>
            <sphereGeometry args={[0.14 * t.scale, 6, 5]} />
            <meshStandardMaterial color={pinks[t.pinkShade]} roughness={0.7} />
          </mesh>
          {/* Secondary canopy cluster */}
          <mesh position={[x + t.dx + 0.06 * t.scale, h + 0.34 * t.scale, z + t.dz - 0.04 * t.scale]} castShadow>
            <sphereGeometry args={[0.1 * t.scale, 5, 4]} />
            <meshStandardMaterial color={pinks[(t.pinkShade + 1) % 3]} roughness={0.65} />
          </mesh>
          {/* Small top cluster */}
          <mesh position={[x + t.dx - 0.03 * t.scale, h + 0.38 * t.scale, z + t.dz + 0.03 * t.scale]}>
            <sphereGeometry args={[0.07 * t.scale, 5, 4]} />
            <meshStandardMaterial color={pinks[(t.pinkShade + 2) % 3]} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── Mountain — dramatic with dark base, white body, ice peak ─── */
function MountainDecor({ x, h, z }) {
  return (
    <group>
      {/* Dark rock base */}
      <mesh position={[x, h + 0.12, z]} castShadow>
        <coneGeometry args={[0.4, 0.24, 6]} />
        <meshStandardMaterial color={0x4a4a4a} roughness={0.95} />
      </mesh>
      {/* Gray-white main body */}
      <mesh position={[x, h + 0.32, z]} castShadow>
        <coneGeometry args={[0.3, 0.4, 6]} />
        <meshStandardMaterial color={0xc0c0c0} roughness={0.8} />
      </mesh>
      {/* Snow layer */}
      <mesh position={[x, h + 0.5, z]} castShadow>
        <coneGeometry args={[0.18, 0.28, 6]} />
        <meshStandardMaterial color={0xf0f0f0} roughness={0.6} />
      </mesh>
      {/* Ice/crystal peak */}
      <mesh position={[x, h + 0.7, z]}>
        <coneGeometry args={[0.07, 0.2, 5]} />
        <meshStandardMaterial color={0x88ddff} roughness={0.2} metalness={0.3} />
      </mesh>
      {/* Small ice shard left */}
      <mesh position={[x - 0.12, h + 0.52, z + 0.05]} rotation={[0.15, 0, 0.3]}>
        <coneGeometry args={[0.03, 0.12, 4]} />
        <meshStandardMaterial color={0xaaeeff} roughness={0.2} metalness={0.2} transparent opacity={0.85} />
      </mesh>
      {/* Small ice shard right */}
      <mesh position={[x + 0.1, h + 0.48, z - 0.08]} rotation={[-0.1, 0, -0.25]}>
        <coneGeometry args={[0.025, 0.1, 4]} />
        <meshStandardMaterial color={0xaaeeff} roughness={0.2} metalness={0.2} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/* ─── Ancient Ruins ─── */
function RuinsDecor({ x, h, z }) {
  const pillars = useMemo(() => {
    const seed = Math.abs(Math.sin(x * 193.7 + z * 277.3)) * 10000;
    return Array.from({ length: 3 }, (_, i) => {
      const s = Math.abs(Math.sin(seed + i * 67.1)) * 10000;
      return {
        dx: ((s % 100) / 100 - 0.5) * 0.4,
        dz: (((s * 7) % 100) / 100 - 0.5) * 0.4,
        height: 0.15 + ((s * 3) % 100) / 500,
        broken: i > 0, // first pillar is tall, others are broken
      };
    });
  }, [x, z]);

  return (
    <group>
      {pillars.map((p, i) => (
        <group key={i}>
          {/* Stone pillar */}
          <mesh position={[x + p.dx, h + p.height / 2, z + p.dz]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, p.height, 5]} />
            <meshStandardMaterial color={0x8a7d6b} roughness={0.9} />
          </mesh>
          {!p.broken && (
            <>
              {/* Pillar cap */}
              <mesh position={[x + p.dx, h + p.height + 0.02, z + p.dz]}>
                <boxGeometry args={[0.1, 0.03, 0.1]} />
                <meshStandardMaterial color={0x9a8c7a} roughness={0.85} />
              </mesh>
              {/* Glowing star on top */}
              <mesh position={[x + p.dx, h + p.height + 0.06, z + p.dz]}>
                <sphereGeometry args={[0.025, 6, 6]} />
                <meshStandardMaterial color={0xffd700} emissive={0xffaa00} emissiveIntensity={0.8} />
              </mesh>
            </>
          )}
        </group>
      ))}
      {/* Scattered stone blocks */}
      <mesh position={[x + 0.15, h + 0.025, z - 0.1]} rotation={[0, 0.5, 0.1]}>
        <boxGeometry args={[0.08, 0.05, 0.06]} />
        <meshStandardMaterial color={0x7a6d5b} roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ─── Deep Ocean ─── */
function OceanDecor({ x, h, z }) {
  return (
    <group>
      {/* Dark water surface */}
      <mesh position={[x, h + 0.008, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 8]} />
        <meshStandardMaterial
          color={0x0d3d5c}
          transparent opacity={0.2}
          metalness={0.4} roughness={0.15}
        />
      </mesh>
    </group>
  );
}

/* ─── Water surface decorations ─── */
function WaterDecor({ x, h, z, isShallow }) {
  const waves = useMemo(() => {
    const seed = Math.abs(Math.sin(x * 91.3 + z * 187.1)) * 10000;
    return Array.from({ length: isShallow ? 3 : 4 }, (_, i) => {
      const s = Math.abs(Math.sin(seed + i * 47.7)) * 10000;
      return {
        dx: ((s % 100) / 100 - 0.5) * 0.55,
        dz: (((s * 11) % 100) / 100 - 0.5) * 0.55,
        size: 0.04 + ((s * 3) % 100) / 2000,
      };
    });
  }, [x, z, isShallow]);

  return (
    <group>
      {/* Wave rings */}
      {waves.map((w, i) => (
        <mesh key={i} position={[x + w.dx, h + 0.012, z + w.dz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[w.size, w.size + 0.02, 10]} />
          <meshStandardMaterial color={isShallow ? 0x7ec8ff : 0x4aa0e8} transparent opacity={0.35} />
        </mesh>
      ))}
      {/* Water surface sheen */}
      <mesh position={[x, h + 0.008, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 8]} />
        <meshStandardMaterial
          color={isShallow ? 0x6cc4f0 : 0x3a9ad9}
          transparent opacity={0.15}
          metalness={0.3} roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function CityDecor({ x, h, z, owner }) {
  const color = owner >= 0 ? PLAYER_COLORS[owner] : 0xcccccc;

  // House positions (4 corners around center tower)
  const houses = [
    { dx: -0.22, dz: -0.22 },
    { dx: 0.22, dz: -0.22 },
    { dx: -0.22, dz: 0.22 },
    { dx: 0.22, dz: 0.22 },
  ];

  // Torch positions (4 cardinal directions)
  const torches = [
    { dx: 0, dz: -0.32 },
    { dx: 0, dz: 0.32 },
    { dx: -0.32, dz: 0 },
    { dx: 0.32, dz: 0 },
  ];

  return (
    <group>
      {/* Central tower — tapered stone body */}
      <mesh position={[x, h + 0.22, z]} castShadow>
        <cylinderGeometry args={[0.06, 0.12, 0.44, 6]} />
        <meshStandardMaterial color={0x888888} roughness={0.85} />
      </mesh>
      {/* Tower top cap */}
      <mesh position={[x, h + 0.46, z]} castShadow>
        <coneGeometry args={[0.09, 0.08, 6]} />
        <meshStandardMaterial color={0x666666} roughness={0.8} />
      </mesh>
      {/* Golden crown / flame */}
      <mesh position={[x, h + 0.54, z]}>
        <coneGeometry args={[0.05, 0.1, 5]} />
        <meshStandardMaterial color={0xffd700} emissive={0xffa500} emissiveIntensity={0.6} />
      </mesh>

      {/* Surrounding houses */}
      {houses.map(({ dx, dz }, i) => (
        <group key={i}>
          {/* Walls */}
          <mesh position={[x + dx, h + 0.07, z + dz]} castShadow>
            <boxGeometry args={[0.14, 0.14, 0.14]} />
            <meshStandardMaterial color={0xf5f0e0} roughness={0.9} />
          </mesh>
          {/* Red roof */}
          <mesh position={[x + dx, h + 0.18, z + dz]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.12, 0.1, 4]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Torches */}
      {torches.map(({ dx, dz }, i) => (
        <group key={i}>
          {/* Post */}
          <mesh position={[x + dx, h + 0.08, z + dz]} castShadow>
            <cylinderGeometry args={[0.012, 0.015, 0.16, 4]} />
            <meshStandardMaterial color={0x5c3d1e} />
          </mesh>
          {/* Flame */}
          <mesh position={[x + dx, h + 0.19, z + dz]}>
            <sphereGeometry args={[0.03, 5, 5]} />
            <meshStandardMaterial color={0xffa500} emissive={0xff6600} emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function VillageDecor({ x, h, z }) {
  return (
    <group>
      {/* Hut base */}
      <mesh position={[x + DECOR_DX, h + 0.06, z + DECOR_DZ]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.18]} />
        <meshStandardMaterial color={0xd4a574} roughness={0.9} />
      </mesh>
      {/* Thatched roof */}
      <mesh position={[x + DECOR_DX, h + 0.16, z + DECOR_DZ]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.16, 0.12, 4]} />
        <meshStandardMaterial color={0x8b6914} roughness={0.95} />
      </mesh>
      {/* Door */}
      <mesh position={[x + DECOR_DX, h + 0.04, z + DECOR_DZ + 0.091]}>
        <boxGeometry args={[0.06, 0.08, 0.005]} />
        <meshStandardMaterial color={0x5c3d1e} />
      </mesh>
      {/* Smoke wisp (small sphere) */}
      <mesh position={[x + DECOR_DX + 0.02, h + 0.26, z + DECOR_DZ]}>
        <sphereGeometry args={[0.025, 5, 4]} />
        <meshStandardMaterial color={0xcccccc} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function ResourceMarker({ x, h, z, resource }) {
  if (resource === 'fruit') {
    return (
      <group>
        {/* Circular fruit cluster — round like Polytopia icons */}
        <mesh position={[x + 0.24, h + 0.005, z + 0.24]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 16]} />
          <meshStandardMaterial color={0xf6ca3f} transparent opacity={0.5} roughness={0.85} />
        </mesh>
        {[
          { dx: 0.24, dz: 0.18, s: 1.0 },
          { dx: 0.18, dz: 0.28, s: 0.9 },
          { dx: 0.30, dz: 0.30, s: 0.85 },
        ].map((f, i) => (
          <group key={i}>
            <mesh position={[x + f.dx, h + 0.06 * f.s, z + f.dz]} castShadow>
              <sphereGeometry args={[0.055 * f.s, 8, 6]} />
              <meshStandardMaterial color={0xff8f1f} roughness={0.4} metalness={0.05} />
            </mesh>
            {/* Leaf on top */}
            <mesh position={[x + f.dx, h + 0.11 * f.s, z + f.dz]}>
              <coneGeometry args={[0.015 * f.s, 0.025 * f.s, 4]} />
              <meshStandardMaterial color={0x2d8d2d} roughness={0.7} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (resource === 'crop') {
    return (
      <group>
        <mesh position={[x + 0.24, h + 0.065, z + 0.24]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color={0x9fe63f} roughness={0.45} />
        </mesh>
        <mesh position={[x + 0.35, h + 0.065, z + 0.14]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color={0x79d92e} roughness={0.45} />
        </mesh>
      </group>
    );
  }

  if (resource === 'fish') {
    return (
      <group>
        {/* Fish icon — small fish shapes */}
        <mesh position={[x + 0.1, h + 0.04, z + 0.1]} rotation={[0, 0.3, 0]} castShadow>
          <sphereGeometry args={[0.04, 6, 4]} />
          <meshStandardMaterial color={0x48cae4} roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Tail */}
        <mesh position={[x + 0.18, h + 0.04, z + 0.13]} rotation={[0, 0.3, 0]}>
          <coneGeometry args={[0.03, 0.04, 3]} />
          <meshStandardMaterial color={0x48cae4} roughness={0.3} />
        </mesh>
      </group>
    );
  }

  const colors = {
    animal: 0xd4a373,
    fish: 0x48cae4,
    mine: 0xadb5bd,
    forest_resource: 0x606c38,
  };
  const c = colors[resource] || 0xffffff;
  return (
    <mesh position={[x + 0.28, h + 0.11, z + 0.28]}>
      <sphereGeometry args={[0.06, 6, 6]} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.2} />
    </mesh>
  );
}

function ResourceGroundTint({ x, h, z, resource }) {
  let tint = null;
  if (resource === 'fruit') tint = 0xf6ca3f;
  if (resource === 'crop') tint = 0xe0c15e;
  if (!tint) return null;

  return (
    <group>
      <mesh position={[x + 0.22, h + 0.006, z + 0.22]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <circleGeometry args={[0.37, 20]} />
        <meshStandardMaterial color={tint} transparent opacity={0.5} roughness={0.85} />
      </mesh>
      <mesh position={[x + 0.22, h + 0.007, z + 0.22]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <circleGeometry args={[0.24, 16]} />
        <meshStandardMaterial color={tint} transparent opacity={0.35} roughness={0.9} />
      </mesh>
    </group>
  );
}

export default function Tile({ tile, mapOffset, onClick, fogged }) {
  const ref = useRef();
  const height = TERRAIN_HEIGHTS[tile.terrain];
  const color = fogged ? 0x1a1a2e : TERRAIN_COLORS[tile.terrain];
  const tilePad = fogged ? 0.05 : 0.02;
  const px = tile.x * TILE_SPACING - mapOffset + TILE_SPACING / 2;
  const pz = tile.z * TILE_SPACING - mapOffset + TILE_SPACING / 2;

  return (
    <group>
      {/* Base tile */}
      <mesh
        ref={ref}
        position={[px, (fogged ? 0.05 : height) / 2, pz]}
        castShadow={!fogged}
        receiveShadow
        onClick={(e) => { e.stopPropagation(); if (!fogged) onClick(tile.x, tile.z); }}
        onPointerOver={() => { if (!fogged) document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[TILE_SPACING - tilePad, fogged ? 0.05 : height, TILE_SPACING - tilePad]} />
        <meshStandardMaterial color={color} roughness={fogged ? 1 : 0.82} metalness={0.06} flatShading={!fogged} />
      </mesh>

      {!fogged && (
        <>
          {tile.resource && <ResourceGroundTint x={px} h={height} z={pz} resource={tile.resource} />}
          {/* Decorations */}
          {tile.terrain === TERRAIN.FIELD && <FieldDecor x={px} h={height} z={pz} />}
          {tile.terrain === TERRAIN.FOREST && <TreeDecor x={px} h={height} z={pz} />}
          {tile.terrain === TERRAIN.MOUNTAIN && <MountainDecor x={px} h={height} z={pz} />}
          {tile.terrain === TERRAIN.CITY && <CityDecor x={px} h={height} z={pz} owner={tile.owner} />}
          {tile.terrain === TERRAIN.VILLAGE && <VillageDecor x={px} h={height} z={pz} />}
          {tile.terrain === TERRAIN.RUINS && <RuinsDecor x={px} h={height} z={pz} />}
          {tile.terrain === TERRAIN.OCEAN && <OceanDecor x={px} h={height} z={pz} />}
          {(tile.terrain === TERRAIN.WATER || tile.terrain === TERRAIN.SHALLOW_WATER) && <WaterDecor x={px} h={height} z={pz} isShallow={tile.terrain === TERRAIN.SHALLOW_WATER} />}
          {tile.resource && <ResourceMarker x={px} h={height} z={pz} resource={tile.resource} />}
        </>
      )}
    </group>
  );
}
