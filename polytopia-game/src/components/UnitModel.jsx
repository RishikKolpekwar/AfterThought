import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Billboard } from '@react-three/drei';
import {
  TILE_SPACING,
  TERRAIN_HEIGHTS,
  PLAYER_COLORS,
  UNIT_STATS,
} from '../core/constants.js';

// Player index to color prefix for sprites
const PLAYER_COLOR_PREFIX = ['red', 'blue', 'green', 'orange'];

// Unit types that have sprites available
const SPRITE_TYPES = new Set(['warrior', 'rider', 'archer']);

function getSpritePath(unitType, ownerIndex) {
  if (!SPRITE_TYPES.has(unitType)) return null;
  const colorPrefix = PLAYER_COLOR_PREFIX[ownerIndex] || 'red';
  return `/units/${colorPrefix}-${unitType}.png`;
}

function SpriteUnit({ texturePath }) {
  const texture = useLoader(THREE.TextureLoader, texturePath);
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <Billboard follow lockX={false} lockY={false} lockZ={false}>
      <mesh position={[0, 0.3, 0]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  );
}

function DefenderModel({ color }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.25, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[-0.14, 0.2, 0]}>
        <boxGeometry args={[0.04, 0.2, 0.22]} />
        <meshStandardMaterial color={0x666666} metalness={0.6} />
      </mesh>
    </group>
  );
}

function SwordsmanModel({ color }) {
  return (
    <group>
      <mesh position={[0, 0.24, 0]}>
        <capsuleGeometry args={[0.12, 0.22, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0.15, 0.25, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.03, 0.25, 0.03]} />
        <meshStandardMaterial color={0xcccccc} metalness={0.8} />
      </mesh>
    </group>
  );
}

function CatapultModel({ color }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.28, 0.08, 0.22]} />
        <meshStandardMaterial color={0x333333} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.04, 0.22, 0.04]} />
        <meshStandardMaterial color={0x8b4513} />
      </mesh>
      <mesh position={[0.08, 0.32, 0]}>
        <sphereGeometry args={[0.05, 4, 4]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

function KnightModel({ color }) {
  return (
    <group>
      <mesh position={[0, 0.28, 0]}>
        <capsuleGeometry args={[0.1, 0.2, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.14, 0.14, 0.32]} />
        <meshStandardMaterial color={0x555555} metalness={0.5} />
      </mesh>
      <mesh position={[0.15, 0.28, 0.1]} rotation={[Math.PI / 6, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.35, 4]} />
        <meshStandardMaterial color={0xcccccc} metalness={0.7} />
      </mesh>
    </group>
  );
}

function GiantModel({ color }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

// Geometric fallbacks for unit types without sprites
const GEOMETRIC_MAP = {
  defender: DefenderModel,
  swordsman: SwordsmanModel,
  catapult: CatapultModel,
  knight: KnightModel,
  giant: GiantModel,
};

export default function UnitModel({ unit, mapOffset, isSelected, onClick, gameState }) {
  const groupRef = useRef();
  const color = PLAYER_COLORS[unit.owner];
  const px = unit.x * TILE_SPACING - mapOffset + TILE_SPACING / 2;
  const pz = unit.z * TILE_SPACING - mapOffset + TILE_SPACING / 2;
  const tile = gameState?.getTile?.(unit.x, unit.z);
  const baseHeight = tile ? (TERRAIN_HEIGHTS[tile.terrain] || TERRAIN_HEIGHTS.field) : TERRAIN_HEIGHTS.field;

  const hpRatio = unit.hp / unit.maxHp;
  const spritePath = getSpritePath(unit.type, unit.owner);
  const GeometricModel = GEOMETRIC_MAP[unit.type];

  // Gentle bob for selected unit
  useFrame((state) => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 3) * 0.03;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[px, baseHeight, pz]}
      onClick={(e) => { e.stopPropagation(); onClick(unit); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      {/* Render sprite if available, otherwise geometric fallback */}
      {spritePath ? (
        <SpriteUnit texturePath={spritePath} />
      ) : GeometricModel ? (
        <GeometricModel color={color} />
      ) : (
        /* Ultimate fallback: simple colored capsule */
        <mesh position={[0, 0.22, 0]}>
          <capsuleGeometry args={[0.1, 0.2, 4, 8]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
        </mesh>
      )}

      {/* Player color indicator ring under the unit */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.28, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Veteran crown */}
      {unit.veteran && (
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.05, 5]} />
          <meshStandardMaterial color={0xffd700} metalness={0.8} />
        </mesh>
      )}

      {/* HP bar */}
      {hpRatio < 1 && (
        <group position={[0, 0.68, 0]}>
          <Billboard>
            <mesh>
              <planeGeometry args={[0.4, 0.04]} />
              <meshBasicMaterial color={0x333333} />
            </mesh>
            <mesh position={[(0.38 * hpRatio - 0.38) / 2, 0, 0.001]}>
              <planeGeometry args={[0.38 * hpRatio, 0.05]} />
              <meshBasicMaterial color={hpRatio > 0.5 ? 0x44ff44 : hpRatio > 0.25 ? 0xffaa00 : 0xff4444} />
            </mesh>
          </Billboard>
        </group>
      )}

      {/* Exhausted overlay */}
      {unit.moved && unit.attacked && (
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[TILE_SPACING - 0.1, 0.01, TILE_SPACING - 0.1]} />
          <meshBasicMaterial color={0x000000} transparent opacity={0.3} />
        </mesh>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.45, 16]} />
          <meshBasicMaterial color={0xffd700} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
