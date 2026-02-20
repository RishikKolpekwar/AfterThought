import { create } from 'zustand';
import { GameState } from '../core/GameState.js';
import { ActionHandler } from '../game/ActionHandler.js';
import { INTERACTION } from '../core/constants.js';
import { supabase } from '../lib/supabase.js';

const DEFAULT_PLAYERS = 3;
const gameState = new GameState(DEFAULT_PLAYERS);
const actionHandler = new ActionHandler(gameState);
for (let i = 0; i < DEFAULT_PLAYERS; i++) {
  actionHandler.recalcStarsPerTurn(i);
}

export const useGameStore = create((set, get) => ({
  // Core game references
  gameState,
  actions: actionHandler,

  // Reactive state (triggers re-renders)
  turn: gameState.turn,
  currentPlayer: gameState.currentPlayer,
  players: [...gameState.players],
  tiles: [...gameState.tiles],
  units: [...gameState.units],
  cities: [...gameState.cities],
  log: [],
  gameOver: false,
  winner: -1,
  visibility: gameState.computeVisibility(0),
  score: gameState.computeScore(0),

  // Interaction state
  interactionMode: INTERACTION.IDLE,
  selectedUnit: null,
  selectedTile: null,
  selectedCity: null,
  validMoves: [],
  attackTargets: [],
  openMenu: null,
  turnFlash: null,
  techTreeOpen: false,

  // Diplomacy
  diplomacyTarget: null, // player index to show diplomacy modal for

  // Notifications
  notifications: [],
  _notifId: 0,

  // Exploration feedback
  lastExploreGain: 0,

  // Persistence
  currentGameId: null,

  addNotification(message, type = 'info') {
    const id = ++get()._notifId;
    set({ _notifId: id });
    const notif = { id, message, type, timestamp: Date.now() };
    set({ notifications: [...get().notifications, notif] });
    setTimeout(() => {
      set({ notifications: get().notifications.filter(n => n.id !== id) });
    }, 3000);
  },

  _flushNotifications() {
    const ah = get().actions;
    if (ah.pendingNotifications.length > 0) {
      const pending = [...ah.pendingNotifications];
      ah.pendingNotifications = [];
      for (const { message, type } of pending) {
        get().addNotification(message, type);
      }
    }
  },

  // Sync from gameState into reactive state
  sync() {
    const gs = get().gameState;
    const ah = get().actions;
    set({
      turn: gs.turn,
      currentPlayer: gs.currentPlayer,
      players: gs.players.map(p => ({ ...p })),
      tiles: [...gs.tiles],
      units: [...gs.units],
      cities: [...gs.cities],
      log: [...ah.log],
      gameOver: ah.gameOver,
      winner: ah.winner,
      visibility: gs.computeVisibility(gs.currentPlayer),
      score: gs.computeScore(gs.currentPlayer),
      lastExploreGain: ah.lastExploreGain || 0,
    });
    get()._flushNotifications();
  },

  // ─── Persistence ───

  async saveGame(gameId = null) {
    const { gameState: gs, actions: ah } = get();

    const payload = {
      gameState: gs.serialize(),
      actionHandler: {
        gameOver: ah.gameOver,
        winner: ah.winner,
        log: [...ah.log],
        nextUnitId: ah.nextUnitId,
      },
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[Save] No authenticated user, skipping save');
      return null;
    }

    const row = {
      player_id: user.id,
      state: payload,
      turn: gs.turn,
      current_player: gs.currentPlayer,
      game_over: ah.gameOver,
      winner: ah.winner >= 0 ? ah.winner : null,
    };

    if (gameId) {
      row.id = gameId;
    }

    const { data, error } = await supabase
      .from('game_states')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[Save] Error:', error);
      return null;
    }

    set({ currentGameId: data.id });
    console.log(`[Save] Game saved: ${data.id} (turn ${gs.turn})`);
    return data.id;
  },

  async loadGame(gameId) {
    const { data, error } = await supabase
      .from('game_states')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error || !data) {
      console.error('[Load] Error:', error);
      return false;
    }

    const { gameState: gsData, actionHandler: ahData } = data.state;

    // Reconstruct GameState (rebuilds grid[][] internally)
    const newGs = GameState.deserialize(gsData);

    // Construct fresh ActionHandler, then restore state fields
    const newAh = new ActionHandler(newGs);
    newAh.gameOver = ahData.gameOver;
    newAh.winner = ahData.winner;
    newAh.log = ahData.log;
    newAh.nextUnitId = ahData.nextUnitId;

    // Recalc stars per turn for all players
    for (let i = 0; i < newGs.numPlayers; i++) {
      newAh.recalcStarsPerTurn(i);
    }

    set({
      gameState: newGs,
      actions: newAh,
      currentGameId: gameId,
    });

    get().sync();
    console.log(`[Load] Game loaded: ${gameId} (turn ${newGs.turn})`);
    return true;
  },

  // ─── Query RPCs (per-player, fog-of-war filtered) ───
  // Pass api_token (from profiles) for auth. External tools use this.

  async queryPlayerView(apiToken, gameId, playerIndex) {
    const { data, error } = await supabase.rpc('get_player_view', {
      token: apiToken,
      game_id: gameId,
      player_idx: playerIndex,
    });
    if (error) { console.error('[Query] player view error:', error); return null; }
    return data;
  },

  async queryPlayerUnits(apiToken, gameId, playerIndex) {
    const { data, error } = await supabase.rpc('get_player_units', {
      token: apiToken,
      game_id: gameId,
      player_idx: playerIndex,
    });
    if (error) { console.error('[Query] player units error:', error); return null; }
    return data;
  },

  async queryPlayerTechs(apiToken, gameId, playerIndex) {
    const { data, error } = await supabase.rpc('get_player_techs', {
      token: apiToken,
      game_id: gameId,
      player_idx: playerIndex,
    });
    if (error) { console.error('[Query] player techs error:', error); return null; }
    return data;
  },

  newGame(numPlayers = 3) {
    const newGs = new GameState(numPlayers);
    const newAh = new ActionHandler(newGs);
    for (let i = 0; i < numPlayers; i++) {
      newAh.recalcStarsPerTurn(i);
    }

    set({
      gameState: newGs,
      actions: newAh,
      currentGameId: null,
      notifications: [],
    });

    get().sync();
    get().deselect();
    console.log(`[Game] New ${numPlayers}-player game started`);
  },

  // --- Actions ---

  selectTile(x, z) {
    const gs = get().gameState;
    const ah = get().actions;
    const tile = gs.getTile(x, z);
    if (!tile) return;

    const units = gs.getUnitsAt(x, z);
    const city = gs.cities.find(c => c.x === x && c.z === z);
    const ownUnit = units.find(u => u.owner === gs.currentPlayer);

    if (ownUnit) {
      const moves = ah.getValidMoves(ownUnit);
      const targets = ah.getAttackTargets(ownUnit);
      set({
        selectedTile: { x, z },
        selectedUnit: ownUnit,
        selectedCity: city && city.owner === gs.currentPlayer ? city : null,
        validMoves: moves,
        attackTargets: targets,
        interactionMode: INTERACTION.UNIT_SELECTED,
        openMenu: null,
      });
    } else {
      const ownCity = city && city.owner === gs.currentPlayer ? city : null;
      const cityEmpty = ownCity && !gs.units.some(u => u.x === x && u.z === z && u.hp > 0);
      set({
        selectedTile: { x, z },
        selectedUnit: null,
        selectedCity: ownCity,
        validMoves: [],
        attackTargets: [],
        interactionMode: INTERACTION.IDLE,
        openMenu: cityEmpty ? 'train' : null,
      });
    }
  },

  deselect() {
    set({
      selectedTile: null,
      selectedUnit: null,
      selectedCity: null,
      validMoves: [],
      attackTargets: [],
      interactionMode: INTERACTION.IDLE,
      openMenu: null,
      diplomacyTarget: null,
    });
  },

  moveUnit(x, z) {
    const { selectedUnit, actions: ah } = get();
    if (!selectedUnit) return;

    const success = ah.moveUnit(selectedUnit, x, z);
    if (!success) return;

    // After move, check if unit can still attack
    const targets = ah.getAttackTargets(selectedUnit);
    if (targets.length > 0 && !selectedUnit.attacked) {
      get().sync();
      const exploreGain = ah.lastExploreGain || 0;
      if (exploreGain > 0) {
        set({ lastExploreGain: exploreGain });
        setTimeout(() => set({ lastExploreGain: 0 }), 1500);
      }
      set({
        validMoves: [],
        attackTargets: targets,
        interactionMode: INTERACTION.ATTACKING,
      });
    } else {
      get().sync();
      const exploreGain = ah.lastExploreGain || 0;
      if (exploreGain > 0) {
        set({ lastExploreGain: exploreGain });
        setTimeout(() => set({ lastExploreGain: 0 }), 1500);
      }
      get().deselect();
    }
    get().saveGame(get().currentGameId);
  },

  attackTarget(x, z) {
    const { selectedUnit, actions: ah } = get();
    if (!selectedUnit) return;

    ah.attackUnit(selectedUnit, x, z);
    get().sync();
    get().deselect();
    get().saveGame(get().currentGameId);
  },

  trainUnit(unitType) {
    const { selectedCity, gameState: gs, actions: ah } = get();
    let city = selectedCity;
    if (!city || city.owner !== gs.currentPlayer) {
      city = gs.cities.find(c => {
        if (c.owner !== gs.currentPlayer) return false;
        return !gs.units.some(u => u.x === c.x && u.z === c.z && u.hp > 0);
      });
    }
    if (!city) return;
    ah.trainUnit(city, unitType);
    get().sync();
    set({ openMenu: null });
    get().saveGame(get().currentGameId);
  },

  researchTech(techKey) {
    const { gameState: gs, actions: ah } = get();
    ah.researchTech(gs.currentPlayer, techKey);
    get().sync();
    set({ openMenu: null });
    get().saveGame(get().currentGameId);
  },

  harvestResource() {
    const { selectedTile, gameState: gs, actions: ah } = get();
    if (!selectedTile) return;
    ah.harvestResource(selectedTile.x, selectedTile.z, gs.currentPlayer);
    get().sync();
    get().saveGame(get().currentGameId);
  },

  chooseCityUpgrade(cityX, cityZ, rewardId) {
    const { gameState: gs, actions: ah } = get();
    const city = gs.cities.find(c => c.x === cityX && c.z === cityZ);
    if (!city || !city.pendingUpgrade) return;
    ah.applyCityUpgrade(city, rewardId, city.owner);
    city.pendingUpgrade = null;
    get().sync();
    get().saveGame(get().currentGameId);
  },

  endTurn() {
    const { actions: ah, gameState: gs } = get();
    if (ah.gameOver) return;

    get().deselect();
    const continueGame = ah.endTurn();
    get().sync();

    if (ah.gameOver || !continueGame) {
      set({ gameOver: true, winner: ah.winner });
      get().saveGame(get().currentGameId);
      return;
    }

    // Flash turn transition
    set({ turnFlash: gs.currentPlayer });
    setTimeout(() => set({ turnFlash: null }), 1200);
    get().saveGame(get().currentGameId);
  },

  setOpenMenu(menu) {
    set({ openMenu: get().openMenu === menu ? null : menu });
  },

  toggleTechTree() {
    set({ techTreeOpen: !get().techTreeOpen, openMenu: null });
  },

  buildOnTile(buildingKey) {
    const { selectedTile, gameState: gs, actions: ah } = get();
    if (!selectedTile) return;
    ah.buildOnTile(selectedTile.x, selectedTile.z, buildingKey, gs.currentPlayer);
    get().sync();
    set({ openMenu: null });
    get().saveGame(get().currentGameId);
  },

  openDiplomacy(playerIndex) {
    set({ diplomacyTarget: playerIndex });
  },

  closeDiplomacy() {
    set({ diplomacyTarget: null });
  },

  offerPeace(toPlayer) {
    const { actions: ah, gameState: gs } = get();
    ah.offerPeace(gs.currentPlayer, toPlayer);
    get().sync();
    get().saveGame(get().currentGameId);
  },

  acceptPeace(fromPlayer) {
    const { actions: ah, gameState: gs } = get();
    ah.acceptPeace(fromPlayer, gs.currentPlayer);
    get().sync();
    get().saveGame(get().currentGameId);
  },

  establishEmbassy(toPlayer) {
    const { actions: ah, gameState: gs } = get();
    ah.establishEmbassy(gs.currentPlayer, toPlayer);
    get().sync();
    get().saveGame(get().currentGameId);
  },
}));
