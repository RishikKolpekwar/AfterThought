import { UNIT_STATS, TERRAIN, HEAL_PER_TURN, TECHS, BUILDING_ACTIONS, EXPLORE_POINTS, EMBASSY_COST, RELATION } from '../core/constants.js';
import { MoveValidator } from './MoveValidator.js';
import { CombatSystem } from './CombatSystem.js';
import { TechTree } from './TechTree.js';

export class ActionHandler {
  constructor(gameState) {
    this.gameState = gameState;
    this.moveValidator = new MoveValidator();
    this.combatSystem = new CombatSystem();
    this.techTree = new TechTree();
    this.nextUnitId = 100;
    this.gameOver = false;
    this.winner = -1;
    this.lastExploreGain = 0;
    this.log = [];
    this.pendingNotifications = [];
  }

  addNotification(message, type = 'info') {
    this.pendingNotifications.push({ message, type });
  }

  addLog(msg) {
    this.log.push(msg);
    if (this.log.length > 50) this.log.shift();
    console.log(`[Game] ${msg}`);
  }

  // --- Unit Movement ---

  getValidMoves(unit) {
    return this.moveValidator.getValidMoves(unit, this.gameState);
  }

  moveUnit(unit, targetX, targetZ) {
    if (unit.moved) return false;
    if (!this.moveValidator.isValidMove(unit, targetX, targetZ, this.gameState)) return false;

    unit.x = targetX;
    unit.z = targetZ;
    unit.moved = true;
    unit.wasIdle = false;

    // Track newly explored tiles around destination
    let newlyExplored = 0;
    const exploreRadius = unit.type === 'explorer' ? 2 : 1;
    for (let dx = -exploreRadius; dx <= exploreRadius; dx++) {
      for (let dz = -exploreRadius; dz <= exploreRadius; dz++) {
        const nx = targetX + dx;
        const nz = targetZ + dz;
        if (nx >= 0 && nx < this.gameState.mapSize && nz >= 0 && nz < this.gameState.mapSize) {
          if (this.gameState.markExplored(unit.owner, nx, nz)) {
            newlyExplored++;
          }
        }
      }
    }

    if (newlyExplored > 0) {
      this.lastExploreGain = newlyExplored * EXPLORE_POINTS;
    } else {
      this.lastExploreGain = 0;
    }

    const tile = this.gameState.getTile(targetX, targetZ);

    // Discover ruins
    if (tile && tile.terrain === TERRAIN.RUINS) {
      this.discoverRuins(unit, tile);
    }

    // Auto-capture village
    if (tile && tile.terrain === TERRAIN.VILLAGE && tile.owner !== unit.owner) {
      this.captureVillage(unit, tile);
    }

    // Auto-capture enemy city
    if (tile && tile.terrain === TERRAIN.CITY && tile.owner !== unit.owner && tile.owner >= 0) {
      this.captureCity(unit, tile);
    }

    return true;
  }

  // --- Combat ---

  getAttackTargets(unit) {
    if (unit.attacked) return [];
    return this.combatSystem.getAttackTargets(unit, this.gameState);
  }

  attackUnit(attacker, targetX, targetZ) {
    if (attacker.attacked) return null;

    const defender = this.gameState.units.find(
      u => u.x === targetX && u.z === targetZ && u.owner !== attacker.owner && u.hp > 0
    );
    if (!defender) return null;

    const result = this.combatSystem.resolveAttack(attacker, defender, this.gameState);

    this.addLog(
      `P${attacker.owner + 1} ${attacker.type} attacks P${defender.owner + 1} ${defender.type}: ${result.damageToDefender} dmg` +
      (result.damageToAttacker > 0 ? `, ${result.damageToAttacker} counter` : '')
    );

    // Track combat stats
    if (result.defenderDied) {
      this.gameState.players[attacker.owner].combatStats.wins++;
      this.gameState.players[defender.owner].combatStats.losses++;
    }
    if (result.attackerDied) {
      this.gameState.players[defender.owner].combatStats.wins++;
      this.gameState.players[attacker.owner].combatStats.losses++;
    }

    // Combat worsens relations
    const gs = this.gameState;
    if (gs.diplomacy[attacker.owner] && gs.diplomacy[attacker.owner][defender.owner]) {
      const rel = gs.diplomacy[attacker.owner][defender.owner];
      if (rel.relation !== RELATION.HOSTILE) {
        rel.relation = RELATION.HOSTILE;
      }
      const reverseRel = gs.diplomacy[defender.owner][attacker.owner];
      if (reverseRel && reverseRel.relation !== RELATION.HOSTILE) {
        reverseRel.relation = RELATION.HOSTILE;
      }
    }

    if (result.defenderDied) {
      this.removeUnit(defender);
      this.addLog(`P${defender.owner + 1} ${defender.type} destroyed!`);
    }
    if (result.attackerDied) {
      this.removeUnit(attacker);
      this.addLog(`P${attacker.owner + 1} ${attacker.type} destroyed!`);
    }

    return result;
  }

  removeUnit(unit) {
    const idx = this.gameState.units.indexOf(unit);
    if (idx >= 0) this.gameState.units.splice(idx, 1);
  }

  // --- Training ---

  getTrainableUnits(playerId) {
    const player = this.gameState.players[playerId];
    const trainable = [];
    for (const [type, stats] of Object.entries(UNIT_STATS)) {
      if (type === 'giant') continue;
      if (stats.techRequired && !player.technologies.includes(stats.techRequired)) continue;
      const cost = player.technologies.includes('organization') ? Math.max(1, stats.cost - 1) : stats.cost;
      trainable.push({ type, ...stats, cost, canAfford: player.stars >= cost });
    }
    return trainable;
  }

  trainUnit(city, unitType) {
    const player = this.gameState.players[city.owner];
    const stats = UNIT_STATS[unitType];
    if (!stats) return false;
    if (unitType === 'giant') return false;
    if (stats.techRequired && !player.technologies.includes(stats.techRequired)) return false;

    const cost = player.technologies.includes('organization') ? Math.max(1, stats.cost - 1) : stats.cost;
    if (player.stars < cost) return false;

    // Check no unit already on city tile
    const existing = this.gameState.units.find(u => u.x === city.x && u.z === city.z && u.hp > 0);
    if (existing) return false;

    // Check unit capacity
    const cityUnits = this.gameState.units.filter(
      u => u.cityRef && u.cityRef.x === city.x && u.cityRef.z === city.z && u.hp > 0
    );
    const capacity = city.level + 1;
    if (cityUnits.length >= capacity) return false;

    player.stars -= cost;
    const unit = {
      id: `unit_${city.owner}_${this.nextUnitId++}`,
      type: unitType,
      owner: city.owner,
      x: city.x,
      z: city.z,
      hp: stats.hp,
      maxHp: stats.hp,
      moved: true, // can't move on spawn turn
      attacked: true,
      veteran: false,
      fortified: false,
      wasIdle: false,
      cityRef: { x: city.x, z: city.z },
    };
    this.gameState.units.push(unit);
    this.addLog(`P${city.owner + 1} trains ${unitType} at (${city.x},${city.z})`);
    return unit;
  }

  // --- Tech Research ---

  getAvailableTechs(playerId) {
    return this.techTree.getAvailableTechs(this.gameState.players[playerId]);
  }

  researchTech(playerId, techKey) {
    const player = this.gameState.players[playerId];
    const result = this.techTree.research(player, techKey);
    if (result) {
      this.addLog(`P${playerId + 1} researches ${TECHS[techKey].name}`);
      this.addNotification(`Player ${playerId + 1} researched ${TECHS[techKey].name}`, 'info');
    }
    return result;
  }

  // --- Resource Harvesting ---

  harvestResource(tileX, tileZ, playerId) {
    const tile = this.gameState.getTile(tileX, tileZ);
    if (!tile || !tile.resource) return false;
    // Allow harvest if tile is owned OR a friendly unit is on it
    const hasUnit = this.gameState.units.some(
      u => u.x === tileX && u.z === tileZ && u.owner === playerId && u.hp > 0
    );
    if (tile.owner !== playerId && !hasUnit) return false;

    const player = this.gameState.players[playerId];

    // Check tech requirements
    if (tile.resource === 'animal' && !player.technologies.includes('hunting')) return false;
    if (tile.resource === 'fish' && !player.technologies.includes('fishing')) return false;
    if (tile.resource === 'mine' && !player.technologies.includes('mining')) return false;
    if (tile.resource === 'crop' && !player.technologies.includes('organization')) return false;

    // Find nearest owned city (any distance — resource benefits closest city)
    let city = null;
    let bestDist = Infinity;
    for (const c of this.gameState.cities) {
      if (c.owner !== playerId) continue;
      const dist = Math.abs(c.x - tileX) + Math.abs(c.z - tileZ);
      if (dist < bestDist) {
        bestDist = dist;
        city = c;
      }
    }

    if (city) {
      city.population++;
      if (city.population >= city.maxPopulation) {
        city.level++;
        city.maxPopulation = city.level + 1;
        city.population = 0;
        city.pendingUpgrade = Math.min(city.level, 5); // cap at 5 for rewards
        this.addLog(`P${playerId + 1}'s city at (${city.x},${city.z}) leveled up to ${city.level}!`);
        // Recalc stars per turn
        this.recalcStarsPerTurn(playerId);
      }
    }

    tile.resource = null;
    this.addLog(`P${playerId + 1} harvests resource at (${tileX},${tileZ})`);
    return true;
  }

  // --- Village & City Capture ---

  captureVillage(unit, tile) {
    tile.terrain = TERRAIN.CITY;
    tile.owner = unit.owner;

    const newCity = {
      x: tile.x,
      z: tile.z,
      owner: unit.owner,
      level: 1,
      population: 0,
      maxPopulation: 2,
      isCapital: false,
      walls: false,
      workshop: false,
      park: false,
    };
    this.gameState.cities.push(newCity);
    this.gameState.players[unit.owner].cities.push({ x: tile.x, z: tile.z });

    // Transfer the capturing unit's cityRef to this new city
    unit.cityRef = { x: tile.x, z: tile.z };

    // Claim surrounding tiles and convert any nearby villages to fields
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        const neighbor = this.gameState.getTile(tile.x + dx, tile.z + dz);
        if (!neighbor) continue;
        if (neighbor.terrain !== TERRAIN.WATER && neighbor.terrain !== TERRAIN.OCEAN && neighbor.owner < 0) {
          neighbor.owner = unit.owner;
        }
        // Convert nearby villages inside new city territory to fields
        if (neighbor.terrain === TERRAIN.VILLAGE) {
          neighbor.terrain = TERRAIN.FIELD;
          neighbor.resource = null;
        }
      }
    }

    this.recalcStarsPerTurn(unit.owner);
    this.addLog(`P${unit.owner + 1} captures village at (${tile.x},${tile.z})!`);
    this.addNotification(`Player ${unit.owner + 1} captured a village!`, 'capture');
  }

  captureCity(unit, tile) {
    const oldOwner = tile.owner;
    const city = this.gameState.cities.find(c => c.x === tile.x && c.z === tile.z);
    if (!city) return;

    // Transfer city ownership
    city.owner = unit.owner;
    tile.owner = unit.owner;

    // Remove from old player's cities
    const oldPlayer = this.gameState.players[oldOwner];
    oldPlayer.cities = oldPlayer.cities.filter(c => !(c.x === tile.x && c.z === tile.z));

    // Add to new player's cities
    this.gameState.players[unit.owner].cities.push({ x: tile.x, z: tile.z });

    // Transfer surrounding tiles
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const neighbor = this.gameState.getTile(tile.x + dx, tile.z + dz);
        if (neighbor && neighbor.owner === oldOwner) {
          neighbor.owner = unit.owner;
        }
      }
    }

    this.recalcStarsPerTurn(unit.owner);
    this.recalcStarsPerTurn(oldOwner);

    this.addLog(`P${unit.owner + 1} captures P${oldOwner + 1}'s city at (${tile.x},${tile.z})!`);
    this.addNotification(`Player ${unit.owner + 1} captured Player ${oldOwner + 1}'s city!`, 'capture');

    // Check if capital was captured
    if (city.isCapital) {
      this.addLog(`P${oldOwner + 1}'s CAPITAL has been captured!`);
      this.addNotification(`Player ${oldOwner + 1}'s CAPITAL has fallen!`, 'combat');
      this.checkVictory();
    }
  }

  // --- Star Production ---

  recalcStarsPerTurn(playerId) {
    const player = this.gameState.players[playerId];
    let total = 0;
    for (const cityRef of player.cities) {
      const city = this.gameState.cities.find(c => c.x === cityRef.x && c.z === cityRef.z && c.owner === playerId);
      if (city) {
        total += city.level;
        if (city.workshop) total += 1;
        if (city.park) total += 1;
        if (city.isCapital) total += 1;
      }
    }
    player.starsPerTurn = Math.max(1, total);
  }

  // --- City Upgrades ---

  getPendingUpgrade(city) {
    // Returns the upgrade level that needs a choice, or null
    if (!city.pendingUpgrade) return null;
    return city.pendingUpgrade;
  }

  applyCityUpgrade(city, rewardId, playerId) {
    const player = this.gameState.players[playerId];
    switch (rewardId) {
      case 'workshop':
        city.workshop = true;
        this.recalcStarsPerTurn(playerId);
        this.addLog(`P${playerId + 1} builds Workshop at (${city.x},${city.z})`);
        break;
      case 'explorer':
        // Spawn free warrior at city
        if (!this.gameState.units.some(u => u.x === city.x && u.z === city.z && u.hp > 0)) {
          const stats = UNIT_STATS.warrior;
          this.gameState.units.push({
            id: `unit_${playerId}_${this.nextUnitId++}`,
            type: 'warrior', owner: playerId,
            x: city.x, z: city.z,
            hp: stats.hp, maxHp: stats.hp,
            moved: true, attacked: true,
            veteran: false, fortified: false, wasIdle: false,
            cityRef: { x: city.x, z: city.z },
          });
          this.addLog(`P${playerId + 1} receives free Explorer at (${city.x},${city.z})`);
        } else {
          // If city is occupied, give 2 stars instead
          player.stars += 2;
          this.addLog(`P${playerId + 1} receives 2 stars (city occupied)`);
        }
        break;
      case 'city_wall':
        city.walls = true;
        this.addLog(`P${playerId + 1} builds City Wall at (${city.x},${city.z})`);
        break;
      case 'resources':
        player.stars += 5;
        this.addLog(`P${playerId + 1} receives 5 stars from Resources`);
        break;
      case 'pop_growth':
        city.population += 3;
        // Check for another level up
        while (city.population >= city.maxPopulation) {
          city.level++;
          city.population -= city.maxPopulation;
          city.maxPopulation = city.level + 1;
          this.recalcStarsPerTurn(playerId);
        }
        this.addLog(`P${playerId + 1} gains Population Growth at (${city.x},${city.z})`);
        break;
      case 'border_growth':
        // Expand territory in radius 2 around city
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const t = this.gameState.getTile(city.x + dx, city.z + dz);
            if (t && t.owner < 0 && t.terrain !== TERRAIN.WATER) {
              t.owner = playerId;
            }
          }
        }
        this.addLog(`P${playerId + 1} expands borders at (${city.x},${city.z})`);
        break;
      case 'park':
        city.park = true;
        this.recalcStarsPerTurn(playerId);
        this.addLog(`P${playerId + 1} builds Park at (${city.x},${city.z})`);
        break;
      case 'super_unit':
        if (!this.gameState.units.some(u => u.x === city.x && u.z === city.z && u.hp > 0)) {
          const gStats = UNIT_STATS.giant;
          this.gameState.units.push({
            id: `unit_${playerId}_${this.nextUnitId++}`,
            type: 'giant', owner: playerId,
            x: city.x, z: city.z,
            hp: gStats.hp, maxHp: gStats.hp,
            moved: true, attacked: true,
            veteran: false, fortified: false, wasIdle: false,
            cityRef: { x: city.x, z: city.z },
          });
          this.addLog(`P${playerId + 1} spawns Giant at (${city.x},${city.z})`);
        } else {
          player.stars += 5;
          this.addLog(`P${playerId + 1} receives 5 stars (city occupied)`);
        }
        break;
    }
    // Clear the pending upgrade
    city.pendingUpgrade = null;
  }

  // --- Building Actions ---

  getBuildableActions(tileX, tileZ, playerId) {
    const tile = this.gameState.getTile(tileX, tileZ);
    if (!tile) return [];
    if (tile.owner !== playerId) return [];
    if (tile.building) return []; // already has a building

    const player = this.gameState.players[playerId];
    const actions = [];

    for (const [key, info] of Object.entries(BUILDING_ACTIONS)) {
      // Check terrain match (null terrain = any land)
      if (info.terrain && tile.terrain !== info.terrain) continue;
      if (!info.terrain && (tile.terrain === TERRAIN.WATER || tile.terrain === TERRAIN.SHALLOW_WATER)) continue;
      // Check tech requirement
      if (info.techRequired && !player.technologies.includes(info.techRequired)) continue;
      // Can afford
      const canAfford = player.stars >= info.cost;
      actions.push({ key, ...info, canAfford });
    }

    return actions;
  }

  buildOnTile(tileX, tileZ, buildingKey, playerId) {
    const tile = this.gameState.getTile(tileX, tileZ);
    if (!tile || tile.owner !== playerId || tile.building) return false;

    const info = BUILDING_ACTIONS[buildingKey];
    if (!info) return false;

    const player = this.gameState.players[playerId];
    if (info.techRequired && !player.technologies.includes(info.techRequired)) return false;
    if (player.stars < info.cost) return false;

    // Terrain check
    if (info.terrain && tile.terrain !== info.terrain) return false;

    player.stars -= info.cost;
    tile.building = buildingKey;
    tile.resource = null; // building replaces resource

    // Add population to nearest city
    if (info.population > 0) {
      let city = null;
      let bestDist = Infinity;
      for (const c of this.gameState.cities) {
        if (c.owner !== playerId) continue;
        const dist = Math.abs(c.x - tileX) + Math.abs(c.z - tileZ);
        if (dist < bestDist) { bestDist = dist; city = c; }
      }
      if (city) {
        // Sawmill/windmill get bonus population per adjacent matching building
        let popGain = info.population;
        if (buildingKey === 'sawmill') {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              if (dx === 0 && dz === 0) continue;
              const adj = this.gameState.getTile(tileX + dx, tileZ + dz);
              if (adj && adj.building === 'lumber_hut') popGain++;
            }
          }
        }
        if (buildingKey === 'windmill') {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              if (dx === 0 && dz === 0) continue;
              const adj = this.gameState.getTile(tileX + dx, tileZ + dz);
              if (adj && adj.building === 'farm') popGain++;
            }
          }
        }

        city.population += popGain;
        if (city.population >= city.maxPopulation) {
          city.level++;
          city.maxPopulation = city.level + 1;
          city.population = 0;
          city.pendingUpgrade = Math.min(city.level, 5);
          this.recalcStarsPerTurn(playerId);
          this.addLog(`P${playerId + 1}'s city at (${city.x},${city.z}) leveled up to ${city.level}!`);
        }
      }
    }

    this.addLog(`P${playerId + 1} builds ${info.name} at (${tileX},${tileZ})`);
    return true;
  }

  // --- Diplomacy ---

  getRelation(playerA, playerB) {
    if (playerA === playerB) return null;
    return this.gameState.diplomacy[playerA]?.[playerB] || null;
  }

  offerPeace(fromPlayer, toPlayer) {
    const rel = this.gameState.diplomacy[fromPlayer]?.[toPlayer];
    if (!rel) return false;
    rel.peaceOffered = true;
    this.addLog(`P${fromPlayer + 1} offers peace to P${toPlayer + 1}`);
    this.addNotification(`Player ${fromPlayer + 1} offers peace to Player ${toPlayer + 1}`, 'diplomacy');
    return true;
  }

  acceptPeace(fromPlayer, toPlayer) {
    const relA = this.gameState.diplomacy[fromPlayer]?.[toPlayer];
    const relB = this.gameState.diplomacy[toPlayer]?.[fromPlayer];
    if (!relA || !relB) return false;
    relA.relation = RELATION.FRIENDLY;
    relB.relation = RELATION.FRIENDLY;
    relA.peaceOffered = false;
    relB.peaceOffered = false;
    this.addLog(`P${fromPlayer + 1} and P${toPlayer + 1} are now at peace!`);
    this.addNotification(`Player ${fromPlayer + 1} and Player ${toPlayer + 1} are now at peace!`, 'diplomacy');
    return true;
  }

  establishEmbassy(fromPlayer, toPlayer) {
    const player = this.gameState.players[fromPlayer];
    if (player.stars < EMBASSY_COST) return false;
    const rel = this.gameState.diplomacy[fromPlayer]?.[toPlayer];
    if (!rel || rel.hasEmbassy) return false;
    player.stars -= EMBASSY_COST;
    rel.hasEmbassy = true;
    // Improve relations
    if (rel.relation === RELATION.HOSTILE) rel.relation = RELATION.UNFRIENDLY;
    else if (rel.relation === RELATION.UNFRIENDLY) rel.relation = RELATION.NEUTRAL;
    else if (rel.relation === RELATION.NEUTRAL) rel.relation = RELATION.FRIENDLY;
    this.addLog(`P${fromPlayer + 1} establishes embassy with P${toPlayer + 1}`);
    return true;
  }

  getRelationTraits(fromPlayer, toPlayer) {
    const gs = this.gameState;
    const traits = [];
    const rel = gs.diplomacy[fromPlayer]?.[toPlayer];
    if (!rel) return traits;

    // Check if they have more cities
    const myCities = gs.cities.filter(c => c.owner === fromPlayer).length;
    const theirCities = gs.cities.filter(c => c.owner === toPlayer).length;

    // Check military strength
    const myUnits = gs.units.filter(u => u.owner === fromPlayer && u.hp > 0).length;
    const theirUnits = gs.units.filter(u => u.owner === toPlayer && u.hp > 0).length;

    if (rel.hasEmbassy) traits.push({ text: 'diplomatic', color: '#4488ff' });
    if (rel.relation === RELATION.FRIENDLY || rel.relation === RELATION.ALLIED) traits.push({ text: 'peaceful', color: '#44cc44' });
    if (theirUnits > myUnits * 1.5) traits.push({ text: 'threatening', color: '#ff4444' });
    if (theirCities < myCities) traits.push({ text: 'weaker', color: '#ffaa00' });
    if (theirCities > myCities) traits.push({ text: 'powerful', color: '#ff6644' });
    if (gs.players[toPlayer].combatStats.wins > 3) traits.push({ text: 'aggressive', color: '#ff4444' });

    return traits;
  }

  // --- Ruins Discovery ---

  discoverRuins(unit, tile) {
    const player = this.gameState.players[unit.owner];

    // 50% chance: discover tech, 50% chance: get 10 stars
    if (Math.random() < 0.5) {
      // Try to give a random unresearched tech
      const unresearched = Object.keys(TECHS).filter(k => !player.technologies.includes(k));
      if (unresearched.length > 0) {
        const randomTech = unresearched[Math.floor(Math.random() * unresearched.length)];
        player.technologies.push(randomTech);
        this.addLog(`P${unit.owner + 1} discovers ${TECHS[randomTech].name} from ancient ruins!`);
        this.addNotification(`Player ${unit.owner + 1} discovered ${TECHS[randomTech].name} in ruins!`, 'discovery');
      } else {
        player.stars += 10;
        this.addLog(`P${unit.owner + 1} finds 10 stars in ancient ruins!`);
        this.addNotification(`Player ${unit.owner + 1} found 10 stars in ruins!`, 'discovery');
      }
    } else {
      player.stars += 10;
      this.addLog(`P${unit.owner + 1} finds 10 stars in ancient ruins!`);
      this.addNotification(`Player ${unit.owner + 1} found 10 stars in ruins!`, 'discovery');
    }

    // Convert ruins to field after discovery
    tile.terrain = TERRAIN.FIELD;
    tile.resource = null;
  }

  // --- End Turn ---

  endTurn() {
    const gs = this.gameState;
    const playerId = gs.currentPlayer;

    // Mark units that didn't act as idle (for healing)
    gs.units
      .filter(u => u.owner === playerId)
      .forEach(u => {
        u.wasIdle = !u.moved && !u.attacked;
      });

    // Switch to next player
    gs.currentPlayer = (gs.currentPlayer + 1) % gs.numPlayers;

    if (gs.currentPlayer === 0) {
      gs.turn++;
    }

    const nextPlayer = gs.currentPlayer;

    // Start of next player's turn: collect stars
    const player = gs.players[nextPlayer];
    this.recalcStarsPerTurn(nextPlayer);
    player.stars += player.starsPerTurn;

    // Heal idle units
    gs.units
      .filter(u => u.owner === nextPlayer && u.wasIdle && u.hp < u.maxHp)
      .forEach(u => {
        u.hp = Math.min(u.maxHp, u.hp + HEAL_PER_TURN);
      });

    // Reset unit actions
    gs.units
      .filter(u => u.owner === nextPlayer)
      .forEach(u => {
        u.moved = false;
        u.attacked = false;
      });

    // Update explored tiles with current visibility
    const currentVisibility = gs.computeVisibility(nextPlayer);
    for (const key of currentVisibility) {
      gs.exploredTiles[nextPlayer].add(key);
    }

    // Check game over
    if (gs.turn > gs.maxTurns) {
      this.endGameByScore();
      return false;
    }

    this.addLog(`--- Player ${nextPlayer + 1}'s turn (Turn ${gs.turn}) ---`);
    return true;
  }

  // --- Victory ---

  checkVictory() {
    // Domination: check if any player has lost all capitals
    for (const player of this.gameState.players) {
      if (!player.alive) continue;
      const hasCapital = this.gameState.cities.some(
        c => c.isCapital && c.owner === player.id
      );
      if (!hasCapital) {
        player.alive = false;
        this.addLog(`Player ${player.id + 1} has been eliminated!`);
        this.addNotification(`Player ${player.id + 1} has been eliminated!`, 'combat');
      }
    }

    const alivePlayers = this.gameState.players.filter(p => p.alive);
    if (alivePlayers.length === 1) {
      this.gameOver = true;
      this.winner = alivePlayers[0].id;
      this.addLog(`=== PLAYER ${this.winner + 1} WINS BY DOMINATION! ===`);
    }
  }

  endGameByScore() {
    let bestScore = -1;
    let bestPlayer = -1;
    for (const player of this.gameState.players) {
      const score = this.gameState.computeScore(player.id);
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = player.id;
      }
    }
    this.gameOver = true;
    this.winner = bestPlayer;
    this.addLog(`=== PLAYER ${this.winner + 1} WINS BY SCORE (${bestScore})! ===`);
  }
}
