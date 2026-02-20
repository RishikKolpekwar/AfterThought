import { MAP_SIZE_BY_PLAYERS, TERRAIN, RESOURCE, UNIT_STATS, RELATION } from './constants.js';

export class GameState {
  constructor(numPlayers = 3, maxTurns = 30) {
    this.mapSize = MAP_SIZE_BY_PLAYERS[numPlayers] || 15;
    this.turn = 1;
    this.maxTurns = maxTurns;
    this.currentPlayer = 0;
    this.numPlayers = numPlayers;

    // Each player starts with a different T1 tech (unique branch)
    const startingTechs = [
      ['climbing'],       // P1 — mountain path
      ['hunting'],        // P2 — archery/forestry path
      ['riding'],         // P3 — roads/knight path
      ['organization'],   // P4 — farming/strategy path
    ];

    this.players = Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      stars: 10,
      starsPerTurn: 1,
      cities: [],
      units: [],
      technologies: [...(startingTechs[i] || [])],
      alive: true,
      combatStats: { wins: 0, losses: 0 },
    }));

    // 2D grid for O(1) tile lookups
    this.grid = [];
    this.tiles = [];
    this.units = [];
    this.cities = [];

    // Exploration: set of "x,z" strings per player
    this.exploredTiles = Array.from({ length: numPlayers }, () => new Set());

    // Diplomacy: pairwise relations
    this.diplomacy = {};
    for (let i = 0; i < numPlayers; i++) {
      this.diplomacy[i] = {};
      for (let j = 0; j < numPlayers; j++) {
        if (i !== j) {
          this.diplomacy[i][j] = {
            relation: RELATION.NEUTRAL,
            hasEmbassy: false,
            peaceOffered: false,
          };
        }
      }
    }

    this.generateMap();
    this.enforceVillageSpacing();
    this.placeStartingPositions();
    this.removeVillagesInCityTerritory();
    this.initExploredTiles();
  }

  generateMap() {
    this.grid = Array.from({ length: this.mapSize }, () =>
      Array.from({ length: this.mapSize }, () => null)
    );
    this.tiles = [];

    for (let x = 0; x < this.mapSize; x++) {
      for (let z = 0; z < this.mapSize; z++) {
        const tile = this.generateTile(x, z);
        this.grid[x][z] = tile;
        this.tiles.push(tile);
      }
    }
  }

  generateTile(x, z) {
    const distFromCenter = Math.sqrt(
      Math.pow(x - this.mapSize / 2, 2) + Math.pow(z - this.mapSize / 2, 2)
    );

    // Deep ocean at edges
    if (distFromCenter > this.mapSize * 0.48) {
      return { x, z, terrain: TERRAIN.OCEAN, resource: null, building: null, owner: -1 };
    }

    // Water ring
    if (distFromCenter > this.mapSize * 0.42) {
      return { x, z, terrain: TERRAIN.WATER, resource: null, building: null, owner: -1 };
    }

    // Shallow water band
    if (distFromCenter > this.mapSize * 0.38) {
      if (Math.random() < 0.5) {
        const fish = Math.random() < 0.2 ? RESOURCE.FISH : null;
        return { x, z, terrain: TERRAIN.SHALLOW_WATER, resource: fish, building: null, owner: -1 };
      }
      return { x, z, terrain: TERRAIN.WATER, resource: null, building: null, owner: -1 };
    }

    const r = Math.random();
    let terrain;
    if (r < 0.38) terrain = TERRAIN.FIELD;
    else if (r < 0.60) terrain = TERRAIN.FOREST;
    else if (r < 0.75) terrain = TERRAIN.MOUNTAIN;
    else if (r < 0.85) terrain = TERRAIN.VILLAGE;
    else if (r < 0.88) terrain = TERRAIN.RUINS;
    else terrain = TERRAIN.FIELD;

    let resource = null;
    if (terrain === TERRAIN.FIELD && Math.random() < 0.3) {
      resource = Math.random() < 0.5 ? RESOURCE.FRUIT : RESOURCE.CROP;
    } else if (terrain === TERRAIN.FOREST && Math.random() < 0.25) {
      resource = RESOURCE.ANIMAL;
    } else if (terrain === TERRAIN.MOUNTAIN && Math.random() < 0.3) {
      resource = RESOURCE.MINE;
    }

    return { x, z, terrain, resource, building: null, owner: -1 };
  }

  enforceVillageSpacing() {
    // Villages must be at least 2 tiles apart (radius-2 check)
    // Run multiple passes until no violations remain
    let changed = true;
    while (changed) {
      changed = false;
      for (let x = 0; x < this.mapSize; x++) {
        for (let z = 0; z < this.mapSize; z++) {
          const tile = this.grid[x][z];
          if (tile.terrain !== TERRAIN.VILLAGE) continue;

          let tooClose = false;
          for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
              if (dx === 0 && dz === 0) continue;
              const neighbor = this.getTile(x + dx, z + dz);
              if (neighbor && neighbor.terrain === TERRAIN.VILLAGE) {
                tooClose = true;
                break;
              }
            }
            if (tooClose) break;
          }

          if (tooClose) {
            tile.terrain = TERRAIN.FIELD;
            if (Math.random() < 0.3) {
              tile.resource = Math.random() < 0.5 ? RESOURCE.FRUIT : RESOURCE.CROP;
            }
            changed = true;
          }
        }
      }
    }
  }

  removeVillagesInCityTerritory() {
    // Convert any villages that ended up inside city territory to fields
    for (const city of this.cities) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const tile = this.getTile(city.x + dx, city.z + dz);
          if (tile && tile.terrain === TERRAIN.VILLAGE) {
            tile.terrain = TERRAIN.FIELD;
            if (Math.random() < 0.3) {
              tile.resource = Math.random() < 0.5 ? RESOURCE.FRUIT : RESOURCE.CROP;
            }
          }
        }
      }
    }
  }

  getTile(x, z) {
    if (x < 0 || x >= this.mapSize || z < 0 || z >= this.mapSize) return null;
    return this.grid[x][z];
  }

  placeStartingPositions() {
    let positions;
    if (this.numPlayers === 2) {
      positions = [
        { x: 2, z: 2 },
        { x: this.mapSize - 3, z: this.mapSize - 3 },
      ];
    } else if (this.numPlayers === 3) {
      // Equilateral triangle on 15x15
      const cx = Math.floor(this.mapSize / 2);
      const radius = Math.floor(this.mapSize * 0.3);
      positions = [
        { x: cx, z: cx - radius },                                                  // top center
        { x: cx - Math.round(radius * 0.866), z: cx + Math.round(radius * 0.5) },   // bottom-left
        { x: cx + Math.round(radius * 0.866), z: cx + Math.round(radius * 0.5) },   // bottom-right
      ];
    } else {
      positions = [
        { x: 2, z: 2 },
        { x: this.mapSize - 3, z: this.mapSize - 3 },
        { x: 2, z: this.mapSize - 3 },
        { x: this.mapSize - 3, z: 2 },
      ];
    }

    for (let i = 0; i < this.numPlayers; i++) {
      const pos = positions[i];

      // Clear area around start for fair play
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const tile = this.getTile(pos.x + dx, pos.z + dz);
          if (tile) {
            if (tile.terrain === TERRAIN.WATER || tile.terrain === TERRAIN.SHALLOW_WATER) {
              tile.terrain = TERRAIN.FIELD;
            }
            if (tile.terrain === TERRAIN.MOUNTAIN) {
              tile.terrain = TERRAIN.FIELD;
            }
            tile.owner = i;
          }
        }
      }

      const tile = this.getTile(pos.x, pos.z);
      tile.terrain = TERRAIN.CITY;
      tile.owner = i;
      tile.resource = null;

      this.cities.push({
        x: pos.x,
        z: pos.z,
        owner: i,
        level: 1,
        population: 0,
        maxPopulation: 2,
        isCapital: true,
        walls: false,
        workshop: false,
        park: false,
      });

      // Place warrior adjacent (z+1)
      let wx = pos.x, wz = pos.z + 1;
      const wTile = this.getTile(wx, wz);
      if (!wTile || wTile.terrain === TERRAIN.WATER) {
        wz = pos.z - 1;
      }

      this.units.push({
        id: `unit_${i}_0`,
        type: 'warrior',
        owner: i,
        x: wx,
        z: wz,
        hp: UNIT_STATS.warrior.hp,
        maxHp: UNIT_STATS.warrior.hp,
        moved: false,
        attacked: false,
        veteran: false,
        fortified: false,
        wasIdle: false,
        cityRef: { x: pos.x, z: pos.z },
      });

      // Place second warrior adjacent (x+1)
      let w2x = pos.x + 1, w2z = pos.z;
      const w2Tile = this.getTile(w2x, w2z);
      if (!w2Tile || w2Tile.terrain === TERRAIN.WATER) {
        w2x = pos.x - 1;
      }

      this.units.push({
        id: `unit_${i}_1`,
        type: 'warrior',
        owner: i,
        x: w2x,
        z: w2z,
        hp: UNIT_STATS.warrior.hp,
        maxHp: UNIT_STATS.warrior.hp,
        moved: false,
        attacked: false,
        veteran: false,
        fortified: false,
        wasIdle: false,
        cityRef: { x: pos.x, z: pos.z },
      });

      this.players[i].cities.push({ x: pos.x, z: pos.z });
    }
  }

  getCityUnitCapacity(city) {
    return city.level + 1;
  }

  getCitySupportedUnits(city) {
    return this.units.filter(u => u.cityRef && u.cityRef.x === city.x && u.cityRef.z === city.z && u.hp > 0);
  }

  getCityIncome(city) {
    let income = city.level;
    if (city.workshop) income += 1;
    if (city.park) income += 1;
    if (city.isCapital) income += 1;
    return income;
  }

  getUnitsAt(x, z) {
    return this.units.filter(u => u.x === x && u.z === z && u.hp > 0);
  }

  computeVisibility(playerId) {
    const visible = new Set();

    const reveal = (cx, cz, rad) => {
      for (let dx = -rad; dx <= rad; dx++) {
        for (let dz = -rad; dz <= rad; dz++) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx >= 0 && nx < this.mapSize && nz >= 0 && nz < this.mapSize) {
            visible.add(`${nx},${nz}`);
          }
        }
      }
    };

    // Reveal around owned tiles
    for (const tile of this.tiles) {
      if (tile.owner === playerId) {
        reveal(tile.x, tile.z, 1);
      }
    }

    // Reveal around units — explorers get radius 2
    for (const unit of this.units) {
      if (unit.owner === playerId && unit.hp > 0) {
        const radius = unit.type === 'explorer' ? 2 : 1;
        reveal(unit.x, unit.z, radius);
      }
    }

    return visible;
  }

  initExploredTiles() {
    for (let i = 0; i < this.numPlayers; i++) {
      const visible = this.computeVisibility(i);
      for (const key of visible) {
        this.exploredTiles[i].add(key);
      }
    }
  }

  markExplored(playerId, x, z) {
    const key = `${x},${z}`;
    if (this.exploredTiles[playerId].has(key)) return false;
    this.exploredTiles[playerId].add(key);
    return true; // was newly explored
  }

  getExploredCount(playerId) {
    return this.exploredTiles[playerId].size;
  }

  computeScore(playerId) {
    let score = 0;
    const p = this.players[playerId];
    score += this.cities.filter(c => c.owner === playerId).length * 100;
    score += this.units.filter(u => u.owner === playerId && u.hp > 0).length * 10;
    score += p.technologies.length * 20;
    score += p.stars;
    // Exploration bonus: 5 pts per unique tile explored
    score += this.exploredTiles[playerId].size * 5;
    return score;
  }

  // ─── Persistence ───

  serialize() {
    return {
      mapSize: this.mapSize,
      turn: this.turn,
      maxTurns: this.maxTurns,
      currentPlayer: this.currentPlayer,
      numPlayers: this.numPlayers,
      players: this.players.map(p => ({
        id: p.id,
        stars: p.stars,
        starsPerTurn: p.starsPerTurn,
        cities: [...p.cities],
        units: [...p.units],
        technologies: [...p.technologies],
        alive: p.alive,
        combatStats: { ...(p.combatStats || { wins: 0, losses: 0 }) },
      })),
      exploredTiles: this.exploredTiles.map(s => [...s]),
      diplomacy: JSON.parse(JSON.stringify(this.diplomacy)),
      tiles: this.tiles.map(t => ({
        x: t.x,
        z: t.z,
        terrain: t.terrain,
        resource: t.resource,
        building: t.building,
        owner: t.owner,
      })),
      units: this.units.map(u => ({
        id: u.id,
        type: u.type,
        owner: u.owner,
        x: u.x,
        z: u.z,
        hp: u.hp,
        maxHp: u.maxHp,
        moved: u.moved,
        attacked: u.attacked,
        veteran: u.veteran,
        fortified: u.fortified,
        wasIdle: u.wasIdle,
        cityRef: u.cityRef || null,
      })),
      cities: this.cities.map(c => ({
        x: c.x,
        z: c.z,
        owner: c.owner,
        level: c.level,
        population: c.population,
        maxPopulation: c.maxPopulation,
        isCapital: c.isCapital,
        walls: c.walls,
        workshop: c.workshop || false,
        park: c.park || false,
        pendingUpgrade: c.pendingUpgrade || null,
      })),
    };
  }

  static deserialize(data) {
    const gs = Object.create(GameState.prototype);

    gs.mapSize = data.mapSize;
    gs.turn = data.turn;
    gs.maxTurns = data.maxTurns;
    gs.currentPlayer = data.currentPlayer;
    gs.numPlayers = data.numPlayers;
    gs.players = data.players.map(p => ({
      ...p,
      combatStats: p.combatStats || { wins: 0, losses: 0 },
    }));
    gs.tiles = data.tiles;
    gs.units = data.units;
    gs.cities = data.cities;

    // Restore explored tiles
    gs.exploredTiles = (data.exploredTiles || []).map(arr => new Set(arr));
    if (gs.exploredTiles.length < gs.numPlayers) {
      while (gs.exploredTiles.length < gs.numPlayers) gs.exploredTiles.push(new Set());
    }

    // Restore diplomacy
    gs.diplomacy = data.diplomacy || {};
    for (let i = 0; i < gs.numPlayers; i++) {
      if (!gs.diplomacy[i]) gs.diplomacy[i] = {};
      for (let j = 0; j < gs.numPlayers; j++) {
        if (i !== j && !gs.diplomacy[i][j]) {
          gs.diplomacy[i][j] = { relation: 'neutral', hasEmbassy: false, peaceOffered: false };
        }
      }
    }

    // Rebuild grid[][] from tiles for O(1) lookups
    gs.grid = Array.from({ length: gs.mapSize }, () =>
      Array.from({ length: gs.mapSize }, () => null)
    );
    for (const tile of gs.tiles) {
      gs.grid[tile.x][tile.z] = tile;
    }

    return gs;
  }
}
