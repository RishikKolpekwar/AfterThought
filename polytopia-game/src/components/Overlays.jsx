import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { TILE_SPACING, TERRAIN_HEIGHTS } from '../core/constants.js';

function OverlayTile({ x, z, mapOffset, color, opacity, onClick, type, terrainHeight }) {
  const ref = useRef();
  const px = x * TILE_SPACING - mapOffset + TILE_SPACING / 2;
  const pz = z * TILE_SPACING - mapOffset + TILE_SPACING / 2;
  const baseY = (terrainHeight || 0.15) + 0.12;

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 2 + x + z) * 0.015;
    }
  });

  return (
    <mesh
      ref={ref}
      position={[px, baseY, pz]}
      onClick={(e) => { e.stopPropagation(); onClick(x, z, type); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <boxGeometry args={[TILE_SPACING - 0.08, 0.03, TILE_SPACING - 0.08]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

export default function Overlays({ validMoves, attackTargets, mapOffset, onMoveClick, onAttackClick, gameState }) {
  return (
    <group>
      {validMoves.map((m) => {
        const tile = gameState?.getTile?.(m.x, m.z);
        const th = tile ? (TERRAIN_HEIGHTS[tile.terrain] || 0.15) : 0.15;
        return (
          <OverlayTile
            key={`move-${m.x}-${m.z}`}
            x={m.x}
            z={m.z}
            mapOffset={mapOffset}
            color={0x4488ff}
            opacity={0.4}
            onClick={(x, z) => onMoveClick(x, z)}
            type="move"
            terrainHeight={th}
          />
        );
      })}
      {attackTargets.map((t) => {
        const tile = gameState?.getTile?.(t.x, t.z);
        const th = tile ? (TERRAIN_HEIGHTS[tile.terrain] || 0.15) : 0.15;
        return (
          <OverlayTile
            key={`atk-${t.x}-${t.z}`}
            x={t.x}
            z={t.z}
            mapOffset={mapOffset}
            color={0xff4444}
            opacity={0.5}
            onClick={(x, z) => onAttackClick(x, z)}
            type="attack"
            terrainHeight={th}
          />
        );
      })}
    </group>
  );
}
