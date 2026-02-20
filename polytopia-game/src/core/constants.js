// Map & grid
export const MAP_SIZE = 15;
export const MAP_SIZE_BY_PLAYERS = { 2: 11, 3: 15, 4: 17 };
export const TILE_SIZE = 1;
export const TILE_GAP = 0.05;
export const TILE_SPACING = TILE_SIZE + TILE_GAP;

// Terrain types
export const TERRAIN = {
  FIELD: 'field',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  WATER: 'water',
  SHALLOW_WATER: 'shallow_water',
  VILLAGE: 'village',
  CITY: 'city',
  RUINS: 'ruins',
  OCEAN: 'ocean',
};

// Terrain colors
export const TERRAIN_COLORS = {
  [TERRAIN.FIELD]: 0x7ec850,
  [TERRAIN.FOREST]: 0x4a8d3a,
  [TERRAIN.MOUNTAIN]: 0x8b8b8b,
  [TERRAIN.WATER]: 0x2e86de,
  [TERRAIN.SHALLOW_WATER]: 0x54a0ff,
  [TERRAIN.VILLAGE]: 0xc8a45c,
  [TERRAIN.CITY]: 0xe8c547,
  [TERRAIN.RUINS]: 0x9a8866,
  [TERRAIN.OCEAN]: 0x1a5276,
};

// Terrain heights
export const TERRAIN_HEIGHTS = {
  [TERRAIN.FIELD]: 0.15,
  [TERRAIN.FOREST]: 0.15,
  [TERRAIN.MOUNTAIN]: 0.5,
  [TERRAIN.WATER]: 0.05,
  [TERRAIN.SHALLOW_WATER]: 0.08,
  [TERRAIN.VILLAGE]: 0.15,
  [TERRAIN.CITY]: 0.2,
  [TERRAIN.RUINS]: 0.15,
  [TERRAIN.OCEAN]: 0.03,
};

// Terrain movement costs (Infinity = impassable)
export const TERRAIN_MOVE_COST = {
  [TERRAIN.FIELD]: 1,
  [TERRAIN.FOREST]: 2,
  [TERRAIN.MOUNTAIN]: Infinity, // passable with Climbing tech
  [TERRAIN.WATER]: Infinity,
  [TERRAIN.SHALLOW_WATER]: Infinity,
  [TERRAIN.VILLAGE]: 1,
  [TERRAIN.CITY]: 1,
  [TERRAIN.RUINS]: 1,
  [TERRAIN.OCEAN]: Infinity,
};

// Resources
export const RESOURCE = {
  FRUIT: 'fruit',
  ANIMAL: 'animal',
  FISH: 'fish',
  CROP: 'crop',
  MINE: 'mine',
  FOREST_RESOURCE: 'forest_resource',
};

// Unit types
export const UNIT = {
  WARRIOR: 'warrior',
  RIDER: 'rider',
  ARCHER: 'archer',
  DEFENDER: 'defender',
  SWORDSMAN: 'swordsman',
  CATAPULT: 'catapult',
  KNIGHT: 'knight',
  GIANT: 'giant',
  EXPLORER: 'explorer',
};

// Unit stats: { hp, attack, defence, movement, range, cost, techRequired }
export const UNIT_STATS = {
  [UNIT.WARRIOR]:   { hp: 10, attack: 2, defence: 2, movement: 1, range: 1, cost: 2, techRequired: null },
  [UNIT.RIDER]:     { hp: 10, attack: 2, defence: 1, movement: 2, range: 1, cost: 3, techRequired: 'riding' },
  [UNIT.ARCHER]:    { hp: 10, attack: 2, defence: 1, movement: 1, range: 2, cost: 3, techRequired: 'archery' },
  [UNIT.DEFENDER]:  { hp: 15, attack: 1, defence: 3, movement: 1, range: 1, cost: 3, techRequired: 'strategy' },
  [UNIT.SWORDSMAN]: { hp: 15, attack: 3, defence: 3, movement: 1, range: 1, cost: 5, techRequired: 'smithery' },
  [UNIT.CATAPULT]:  { hp: 10, attack: 4, defence: 0, movement: 1, range: 3, cost: 8, techRequired: 'mathematics' },
  [UNIT.KNIGHT]:    { hp: 15, attack: 3.5, defence: 1, movement: 3, range: 1, cost: 8, techRequired: 'chivalry' },
  [UNIT.GIANT]:     { hp: 40, attack: 5, defence: 4, movement: 1, range: 1, cost: 0, techRequired: null },
  [UNIT.EXPLORER]:  { hp: 5, attack: 0, defence: 1, movement: 3, range: 1, cost: 2, techRequired: null },
};

// Tech tree — 5 branches × 3 tiers (Polytopia-style)
// Costs are dynamic: (tier × numCities) + 4
export const TECHS = {
  // ── Tier 1 (Starting techs) ──
  climbing:     { name: 'Climbing',     tier: 1, requires: null, unlocks: [], description: 'Cross mountains, reveals metal' },
  fishing:      { name: 'Fishing',      tier: 1, requires: null, unlocks: [], description: 'Harvest fish, water movement' },
  hunting:      { name: 'Hunting',      tier: 1, requires: null, unlocks: [], description: 'Harvest animals from forests' },
  organization: { name: 'Organization', tier: 1, requires: null, unlocks: [], description: 'Harvest fruit & crops, -1 unit cost' },
  riding:       { name: 'Riding',       tier: 1, requires: null, unlocks: ['rider'], description: 'Train Riders' },

  // ── Tier 2 (From Climbing) ──
  mining:       { name: 'Mining',       tier: 2, requires: 'climbing', unlocks: [], description: 'Build mines on mountains' },
  meditation:   { name: 'Meditation',   tier: 2, requires: 'climbing', unlocks: [], description: 'Build mountain temples' },
  // ── Tier 2 (From Fishing) ──
  sailing:      { name: 'Sailing',      tier: 2, requires: 'fishing', unlocks: [], description: 'Scout unit, ocean movement' },
  ramming:      { name: 'Ramming',      tier: 2, requires: 'fishing', unlocks: [], description: 'Rammer unit (water combat)' },
  // ── Tier 2 (From Hunting) ──
  archery:      { name: 'Archery',      tier: 2, requires: 'hunting', unlocks: ['archer'], description: 'Train Archers, forest defense' },
  forestry:     { name: 'Forestry',     tier: 2, requires: 'hunting', unlocks: [], description: 'Lumber huts, clear forest' },
  // ── Tier 2 (From Organization) ──
  farming:      { name: 'Farming',      tier: 2, requires: 'organization', unlocks: [], description: 'Build farms on fields' },
  strategy:     { name: 'Strategy',     tier: 2, requires: 'organization', unlocks: ['defender'], description: 'Train Defenders' },
  // ── Tier 2 (From Riding) ──
  roads:        { name: 'Roads',        tier: 2, requires: 'riding', unlocks: [], description: 'Build roads, city connections' },
  free_spirit:  { name: 'Free Spirit',  tier: 2, requires: 'riding', unlocks: [], description: 'Build temples, disband units' },

  // ── Tier 3 (From Mining) ──
  smithery:     { name: 'Smithery',     tier: 3, requires: 'mining', unlocks: ['swordsman'], description: 'Forge, train Swordsmen' },
  // ── Tier 3 (From Meditation) ──
  philosophy:   { name: 'Philosophy',   tier: 3, requires: 'meditation', unlocks: [], description: 'Literacy: 33% tech cost reduction' },
  // ── Tier 3 (From Sailing) ──
  navigation:   { name: 'Navigation',   tier: 3, requires: 'sailing', unlocks: [], description: 'Bomber unit, ocean control' },
  // ── Tier 3 (From Ramming) ──
  aquatism:     { name: 'Aquatism',     tier: 3, requires: 'ramming', unlocks: [], description: 'Water temples, ocean defense' },
  // ── Tier 3 (From Archery) ──
  spiritualism: { name: 'Spiritualism', tier: 3, requires: 'archery', unlocks: [], description: 'Forest temples, grow forest' },
  // ── Tier 3 (From Forestry) ──
  mathematics:  { name: 'Mathematics',  tier: 3, requires: 'forestry', unlocks: ['catapult'], description: 'Train Catapults, sawmills' },
  // ── Tier 3 (From Farming) ──
  construction: { name: 'Construction', tier: 3, requires: 'farming', unlocks: [], description: 'Windmills, burn forest' },
  // ── Tier 3 (From Strategy) ──
  diplomacy:    { name: 'Diplomacy',    tier: 3, requires: 'strategy', unlocks: [], description: 'Cloak unit, embassies' },
  // ── Tier 3 (From Roads) ──
  trade:        { name: 'Trade',        tier: 3, requires: 'roads', unlocks: [], description: 'Markets, wealth generation' },
  // ── Tier 3 (From Free Spirit) ──
  chivalry:     { name: 'Chivalry',     tier: 3, requires: 'free_spirit', unlocks: ['knight'], description: 'Train Knights' },
};

// Buildings
export const BUILDING = {
  SAWMILL: 'sawmill',
  WINDMILL: 'windmill',
  MINE_BUILDING: 'mine_building',
  PORT: 'port',
  WALLS: 'walls',
};

// City upgrade rewards (Polytopia-style)
export const CITY_UPGRADE_REWARDS = {
  2: [
    { id: 'workshop', name: 'Workshop', description: '+1 star/turn for this city' },
    { id: 'explorer', name: 'Explorer', description: 'Free warrior unit' },
  ],
  3: [
    { id: 'city_wall', name: 'City Wall', description: 'Defence bonus for units in city' },
    { id: 'resources', name: 'Resources', description: '+5 stars immediately' },
  ],
  4: [
    { id: 'pop_growth', name: 'Pop. Growth', description: '+3 population to this city' },
    { id: 'border_growth', name: 'Border Growth', description: 'Expand territory around city' },
  ],
  5: [
    { id: 'park', name: 'Park', description: '+1 star/turn for this city' },
    { id: 'super_unit', name: 'Super Unit', description: 'Spawn a Giant unit' },
  ],
};

// Building actions for tiles
export const BUILDING_ACTIONS = {
  farm:        { name: 'Farm',       cost: 5, terrain: 'field',         techRequired: 'farming',      population: 2, description: '+2 population to nearest city' },
  lumber_hut:  { name: 'Lumber Hut', cost: 2, terrain: 'forest',        techRequired: 'forestry',     population: 1, description: '+1 population to nearest city' },
  mine_building:{ name: 'Mine',      cost: 5, terrain: 'mountain',      techRequired: 'mining',       population: 2, description: '+2 population to nearest city' },
  port:        { name: 'Port',       cost: 10, terrain: 'shallow_water', techRequired: 'sailing',      population: 2, description: '+2 pop, connects water routes' },
  sawmill:     { name: 'Sawmill',    cost: 5, terrain: 'field',         techRequired: 'construction',  population: 1, description: '+1 pop per adj lumber hut' },
  windmill:    { name: 'Windmill',   cost: 5, terrain: 'field',         techRequired: 'construction',  population: 1, description: '+1 pop per adj farm' },
  temple:      { name: 'Temple',     cost: 15, terrain: null,           techRequired: 'free_spirit',   population: 0, description: 'Provides culture points' },
};

// Diplomacy
export const EMBASSY_COST = 5;
export const RELATION = {
  HOSTILE: 'hostile',
  UNFRIENDLY: 'unfriendly',
  NEUTRAL: 'neutral',
  FRIENDLY: 'friendly',
  ALLIED: 'allied',
};

// Exploration
export const EXPLORE_POINTS = 5;

// Player colors
export const PLAYER_COLORS = [
  0xff4444, // red
  0x4488ff, // blue
  0x44cc44, // green
  0xffaa00, // orange
];

// Interaction states
export const INTERACTION = {
  IDLE: 'idle',
  UNIT_SELECTED: 'unit_selected',
  MOVING: 'moving',
  ATTACKING: 'attacking',
};

// Heal amount per idle turn
export const HEAL_PER_TURN = 4;
