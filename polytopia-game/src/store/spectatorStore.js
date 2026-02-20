import { create } from 'zustand';
import { MAP_SIZE } from '../core/constants.js';

function allVisible() {
  const visible = new Set();
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let z = 0; z < MAP_SIZE; z++) {
      visible.add(`${x},${z}`);
    }
  }
  return visible;
}

function buildMockGameState(tiles, mapSize) {
  const grid = Array.from({ length: mapSize }, () =>
    Array.from({ length: mapSize }, () => null)
  );
  for (const tile of tiles) {
    if (tile.x >= 0 && tile.x < mapSize && tile.z >= 0 && tile.z < mapSize) {
      grid[tile.x][tile.z] = tile;
    }
  }
  return {
    mapSize,
    getTile(x, z) {
      if (x < 0 || x >= mapSize || z < 0 || z >= mapSize) return null;
      return grid[x][z];
    },
  };
}

export const useSpectatorStore = create((set, get) => ({
  tiles: [],
  units: [],
  cities: [],
  players: [],
  visibility: allVisible(),
  turn: 0,
  currentPlayer: 0,
  gameOver: false,
  winner: -1,
  matchStatus: null,
  matchId: null,
  scores: [0, 0],
  stakeAmount: 0,
  maxTurns: 30,

  // Perspective: 0 = P1 fog, 1 = P2 fog, 'all' = no fog
  spectatingAs: 'all',
  yourPlayerIndex: -1,

  gameState: { mapSize: MAP_SIZE, getTile: () => null },

  selectedUnit: null,
  selectedTile: null,
  validMoves: [],
  attackTargets: [],

  loading: true,
  error: null,
  connected: false,

  _intervalId: null,
  _matchId: null,
  _apiToken: null,
  _supabaseUrl: null,
  _anonKey: null,

  setPerspective(perspective) {
    set({ spectatingAs: perspective });
    // Re-fetch immediately with new perspective
    const { _matchId, _apiToken, _supabaseUrl, _anonKey } = get();
    if (_matchId) get().fetchState(_matchId, _apiToken, _supabaseUrl, _anonKey);
  },

  async fetchState(matchId, apiToken, supabaseUrl, anonKey) {
    try {
      const { spectatingAs } = get();
      const perspectiveParam = spectatingAs === 'all' ? 'all' : String(spectatingAs);
      const res = await fetch(
        `${supabaseUrl}/functions/v1/get-match-state?match_id=${matchId}&perspective=${perspectiveParam}`,
        {
          headers: {
            'x-api-token': apiToken,
            'Authorization': `Bearer ${anonKey}`,
          },
        }
      );
      const data = await res.json();
      if (data.error) {
        set({ error: data.error, loading: false });
        return;
      }

      const tiles = data.visible_tiles || [];
      const units = (data.visible_units || []).filter(u => u.hp > 0);
      const cities = data.visible_cities || [];
      const players = data.all_players || (data.my_player ? [data.my_player] : []);

      const vis = new Set();
      for (const t of tiles) vis.add(`${t.x},${t.z}`);

      set({
        tiles,
        units,
        cities,
        players,
        visibility: vis,
        turn: data.turn || 0,
        currentPlayer: data.current_player || 0,
        gameOver: data.status === 'finished',
        winner: data.winner_idx ?? -1,
        matchStatus: data.status,
        matchId: data.match_id || get().matchId,
        scores: data.scores || [0, 0],
        stakeAmount: data.stake_amount || 0,
        maxTurns: data.max_turns || 30,
        yourPlayerIndex: data.your_player_index ?? -1,
        gameState: buildMockGameState(tiles, MAP_SIZE),
        loading: false,
        error: null,
        connected: true,
      });
    } catch (err) {
      set({ error: err.message, loading: false, connected: false });
    }
  },

  startPolling(matchId, apiToken, supabaseUrl, anonKey, interval = 2000) {
    set({ _matchId: matchId, _apiToken: apiToken, _supabaseUrl: supabaseUrl, _anonKey: anonKey });
    get().fetchState(matchId, apiToken, supabaseUrl, anonKey);
    const id = setInterval(() => {
      get().fetchState(matchId, apiToken, supabaseUrl, anonKey);
    }, interval);
    set({ _intervalId: id });
  },

  stopPolling() {
    const id = get()._intervalId;
    if (id) clearInterval(id);
    set({ _intervalId: null });
  },
}));
