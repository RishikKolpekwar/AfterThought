import { TERRAIN, TERRAIN_MOVE_COST, UNIT_STATS } from '../core/constants.js';

export class MoveValidator {
  /**
   * BFS to find all reachable tiles for a unit.
   * Units can path THROUGH friendly units but NOT end on them.
   *
   * Polytopia movement rule: a unit can ALWAYS enter any adjacent passable
   * tile as its first step, even if the tile's cost exceeds remaining movement.
   * This means warriors (movement 1) can enter forests (cost 2) and mountains
   * with climbing (cost 2). Multi-tile movers (riders, knights) check cost
   * normally for steps beyond the first.
   */
  getValidMoves(unit, gameState) {
    if (unit.moved) return [];

    const stats = UNIT_STATS[unit.type];
    const maxMove = stats.movement;
    const player = gameState.players[unit.owner];
    const hasClimbing = player.technologies.includes('climbing');

    const visited = new Map();
    const queue = [{ x: unit.x, z: unit.z, cost: 0 }];
    visited.set(`${unit.x},${unit.z}`, 0);

    const validMoves = [];

    while (queue.length > 0) {
      const current = queue.shift();

      const neighbors = [
        { x: current.x - 1, z: current.z },
        { x: current.x + 1, z: current.z },
        { x: current.x, z: current.z - 1 },
        { x: current.x, z: current.z + 1 },
        { x: current.x - 1, z: current.z - 1 },
        { x: current.x + 1, z: current.z - 1 },
        { x: current.x - 1, z: current.z + 1 },
        { x: current.x + 1, z: current.z + 1 },
      ];

      for (const next of neighbors) {
        const tile = gameState.getTile(next.x, next.z);
        if (!tile) continue;

        // Check terrain passability
        let moveCost = TERRAIN_MOVE_COST[tile.terrain];
        if (tile.terrain === TERRAIN.MOUNTAIN && hasClimbing) {
          moveCost = 2; // mountains with climbing cost heavy but are passable
        }
        // Explorers can traverse shallow water
        if (tile.terrain === TERRAIN.SHALLOW_WATER && unit.type === 'explorer') {
          moveCost = 2;
        }
        if (moveCost === Infinity) continue;

        let totalCost = current.cost + moveCost;

        // Polytopia rule: first step always allowed to any passable tile.
        // Clamp cost to at least maxMove so the unit stops after entering.
        if (current.cost === 0 && totalCost > maxMove) {
          totalCost = maxMove; // uses all movement
        } else if (totalCost > maxMove) {
          continue; // subsequent steps must fit within remaining movement
        }

        const key = `${next.x},${next.z}`;
        if (visited.has(key) && visited.get(key) <= totalCost) continue;
        visited.set(key, totalCost);

        // Can't move through enemy units
        const enemyOnTile = gameState.units.find(
          u => u.x === next.x && u.z === next.z && u.owner !== unit.owner && u.hp > 0
        );
        if (enemyOnTile) continue;

        // Always add to queue (can path through friendly units)
        queue.push({ x: next.x, z: next.z, cost: totalCost });

        // But can't end on friendly units
        const friendlyOnTile = gameState.units.find(
          u => u.x === next.x && u.z === next.z && u.owner === unit.owner && u.id !== unit.id && u.hp > 0
        );
        if (!friendlyOnTile) {
          validMoves.push({ x: next.x, z: next.z });
        }
      }
    }

    return validMoves;
  }

  /**
   * Check if a specific move is valid.
   */
  isValidMove(unit, targetX, targetZ, gameState) {
    const moves = this.getValidMoves(unit, gameState);
    return moves.some(m => m.x === targetX && m.z === targetZ);
  }
}
