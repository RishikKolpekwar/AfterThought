import { UNIT_STATS } from '../core/constants.js';

export class CombatSystem {
  /**
   * Resolve an attack between two units.
   * Returns { attackerDamage, defenderDamage, attackerDied, defenderDied }
   */
  resolveAttack(attacker, defender, gameState) {
    const aStats = UNIT_STATS[attacker.type];
    const dStats = UNIT_STATS[defender.type];

    // Defence bonuses
    let defenceBonus = 0;
    const defTile = gameState.getTile(defender.x, defender.z);
    if (defTile) {
      // Wall bonus
      const city = gameState.cities.find(c => c.x === defender.x && c.z === defender.z);
      if (city && city.walls) defenceBonus += 4;
      // Forest bonus
      if (defTile.terrain === 'forest') defenceBonus += 1;
    }
    // Fortify bonus (defender hasn't moved)
    if (defender.fortified) defenceBonus += 1;

    // Veteran bonus
    const atkMultiplier = attacker.veteran ? 1.5 : 1;
    const defMultiplier = defender.veteran ? 1.5 : 1;

    // Damage to defender
    const baseAtk = (aStats.attack * atkMultiplier) - (dStats.defence * defMultiplier + defenceBonus);
    const rng1 = 0.8 + Math.random() * 0.4;
    const damageToDefender = Math.max(1, Math.round(baseAtk * rng1));

    defender.hp -= damageToDefender;
    const defenderDied = defender.hp <= 0;

    // Counterattack (melee only, defender must survive, attacker must be melee range)
    let damageToAttacker = 0;
    let attackerDied = false;

    if (!defenderDied && aStats.range <= 1 && dStats.range <= 1) {
      const baseDef = (dStats.attack * defMultiplier) - (aStats.defence * atkMultiplier);
      const rng2 = 0.8 + Math.random() * 0.4;
      damageToAttacker = Math.max(1, Math.round(baseDef * rng2));
      attacker.hp -= damageToAttacker;
      attackerDied = attacker.hp <= 0;
    }

    // Mark as having attacked
    attacker.attacked = true;
    attacker.moved = true;

    return {
      damageToDefender,
      damageToAttacker,
      defenderDied,
      attackerDied,
    };
  }

  /**
   * Get tiles an attacker can attack from their position.
   */
  getAttackTargets(unit, gameState) {
    const stats = UNIT_STATS[unit.type];
    const targets = [];
    const range = stats.range;

    for (let dx = -range; dx <= range; dx++) {
      for (let dz = -range; dz <= range; dz++) {
        if (dx === 0 && dz === 0) continue;
        const dist = Math.abs(dx) + Math.abs(dz);
        if (dist > range) continue;

        const tx = unit.x + dx;
        const tz = unit.z + dz;
        const enemies = gameState.units.filter(
          u => u.x === tx && u.z === tz && u.owner !== unit.owner && u.hp > 0
        );
        if (enemies.length > 0) {
          targets.push({ x: tx, z: tz, enemy: enemies[0] });
        }
      }
    }
    return targets;
  }
}
