import { SceneManager } from './rendering/SceneManager.js';
import { MapRenderer } from './rendering/MapRenderer.js';
import { GameState } from './core/GameState.js';
import { ActionHandler } from './game/ActionHandler.js';
import { TERRAIN, UNIT_STATS, PLAYER_COLORS, INTERACTION } from './core/constants.js';

// --- Init ---
const sceneManager = new SceneManager();
const mapRenderer = new MapRenderer(sceneManager.scene);
const gameState = new GameState(2);
const actions = new ActionHandler(gameState);

mapRenderer.buildMap(gameState);

// --- DOM refs ---
const $ = (id) => document.getElementById(id);
const playerName = $('player-name');
const playerDot = $('player-dot');
const turnDisplay = $('turn-display');
const starsDisplay = $('stars-display');
const countsDisplay = $('counts-display');
const tileInfo = $('tile-info');
const unitPanel = $('unit-panel');
const unitNameEl = $('unit-name');
const unitHpBar = $('unit-hp-bar');
const unitStatsList = $('unit-stats-list');
const unitActions = $('unit-actions');
const gameLog = $('game-log');
const btnTrain = $('btn-train');
const btnTech = $('btn-tech');
const btnHarvest = $('btn-harvest');
const btnEndTurn = $('btn-end-turn');
const trainMenu = $('train-menu');
const techMenu = $('tech-menu');
const turnOverlay = $('turn-overlay');
const gameOverEl = $('game-over');
const winnerText = $('winner-text');

// --- State ---
let interactionState = INTERACTION.IDLE;
let selectedUnit = null;
let selectedCity = null;
let openMenu = null;

// --- Helpers ---

function colorToCSS(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function updateUI() {
  const p = gameState.players[gameState.currentPlayer];
  const pColor = PLAYER_COLORS[gameState.currentPlayer];

  playerName.textContent = `Player ${gameState.currentPlayer + 1}`;
  playerDot.style.background = colorToCSS(pColor);
  turnDisplay.textContent = `Turn ${gameState.turn}/${gameState.maxTurns}`;
  starsDisplay.textContent = `${p.stars} Stars (+${p.starsPerTurn}/turn)`;

  const cityCount = gameState.cities.filter(c => c.owner === gameState.currentPlayer).length;
  const unitCount = gameState.units.filter(u => u.owner === gameState.currentPlayer && u.hp > 0).length;
  countsDisplay.textContent = `Cities: ${cityCount} | Units: ${unitCount}`;

  // Train button: enabled if current player has a city with no unit on it
  const canTrain = gameState.cities.some(c => {
    if (c.owner !== gameState.currentPlayer) return false;
    return !gameState.units.some(u => u.x === c.x && u.z === c.z && u.hp > 0);
  });
  btnTrain.disabled = !canTrain;

  // Harvest button enabled if a selected tile has a harvestable resource
  btnHarvest.disabled = true;

  // Update log
  gameLog.innerHTML = actions.log.slice(-8).map(l => `<div class="log-entry">${l}</div>`).join('');
  gameLog.scrollTop = gameLog.scrollHeight;
}

function showUnitPanel(unit) {
  const stats = UNIT_STATS[unit.type];
  unitPanel.style.display = 'block';
  unitNameEl.textContent = `${unit.type} (P${unit.owner + 1})`;
  unitNameEl.style.color = colorToCSS(PLAYER_COLORS[unit.owner]);

  const hpPct = (unit.hp / unit.maxHp) * 100;
  unitHpBar.style.width = `${hpPct}%`;
  unitHpBar.style.background = hpPct > 50 ? '#44ff44' : hpPct > 25 ? '#ffaa00' : '#ff4444';

  unitStatsList.innerHTML = `
    <div class="unit-stat"><span>HP</span><span>${unit.hp}/${unit.maxHp}</span></div>
    <div class="unit-stat"><span>ATK</span><span>${stats.attack}</span></div>
    <div class="unit-stat"><span>DEF</span><span>${stats.defence}</span></div>
    <div class="unit-stat"><span>Move</span><span>${stats.movement}</span></div>
    <div class="unit-stat"><span>Range</span><span>${stats.range}</span></div>
  `;

  // Action buttons
  const isOwn = unit.owner === gameState.currentPlayer;
  unitActions.innerHTML = '';

  if (isOwn) {
    if (!unit.moved) {
      const moveBtn = document.createElement('button');
      moveBtn.className = 'action-btn';
      moveBtn.textContent = 'Move';
      moveBtn.onclick = () => enterMoveMode(unit);
      unitActions.appendChild(moveBtn);
    }
    if (!unit.attacked) {
      const atkBtn = document.createElement('button');
      atkBtn.className = 'action-btn';
      atkBtn.textContent = 'Attack';
      atkBtn.onclick = () => enterAttackMode(unit);
      unitActions.appendChild(atkBtn);
    }
  }
}

function hideUnitPanel() {
  unitPanel.style.display = 'none';
}

function closeMenus() {
  trainMenu.style.display = 'none';
  techMenu.style.display = 'none';
  openMenu = null;
}

function refreshScene() {
  mapRenderer.buildMap(gameState);
  updateUI();
}

// --- Interaction modes ---

function enterMoveMode(unit) {
  interactionState = INTERACTION.MOVING;
  selectedUnit = unit;
  const moves = actions.getValidMoves(unit);
  mapRenderer.clearOverlays();
  mapRenderer.showMoveOverlay(moves, gameState.mapSize);

  // Also show attack targets
  const targets = actions.getAttackTargets(unit);
  if (targets.length > 0) {
    mapRenderer.showAttackOverlay(targets);
  }
}

function enterAttackMode(unit) {
  interactionState = INTERACTION.ATTACKING;
  selectedUnit = unit;
  const targets = actions.getAttackTargets(unit);
  mapRenderer.clearOverlays();
  mapRenderer.showAttackOverlay(targets);
}

function deselect() {
  interactionState = INTERACTION.IDLE;
  selectedUnit = null;
  selectedCity = null;
  mapRenderer.clearSelection();
  hideUnitPanel();
  tileInfo.style.display = 'none';
  closeMenus();
}

// --- Click handler ---

sceneManager.renderer.domElement.addEventListener('click', (e) => {
  if (e.button !== 0) return;
  if (actions.gameOver) return;

  closeMenus();

  // Check overlays first (move/attack tiles)
  const overlayHits = sceneManager.raycast(mapRenderer.overlayMeshes);
  if (overlayHits.length > 0 && selectedUnit) {
    const data = overlayHits[0].object.userData;
    if (data.overlayType === 'move' && interactionState === INTERACTION.MOVING) {
      actions.moveUnit(selectedUnit, data.tileX, data.tileZ);
      refreshScene();
      // Re-select unit at new position if it can still attack
      if (selectedUnit.hp > 0 && !selectedUnit.attacked) {
        const targets = actions.getAttackTargets(selectedUnit);
        if (targets.length > 0) {
          mapRenderer.selectTile(selectedUnit.x, selectedUnit.z);
          showUnitPanel(selectedUnit);
          enterAttackMode(selectedUnit);
          return;
        }
      }
      deselect();
      return;
    }
    if (data.overlayType === 'attack' && (interactionState === INTERACTION.ATTACKING || interactionState === INTERACTION.MOVING)) {
      actions.attackUnit(selectedUnit, data.tileX, data.tileZ);
      refreshScene();
      deselect();
      return;
    }
  }

  // Check tile hits
  const tileHits = sceneManager.raycast(mapRenderer.tileMeshes);
  if (tileHits.length > 0) {
    const { tileX, tileZ } = tileHits[0].object.userData;
    const tile = gameState.getTile(tileX, tileZ);
    if (!tile) return;

    mapRenderer.clearOverlays();
    mapRenderer.selectTile(tileX, tileZ);

    // Show tile info
    const units = gameState.getUnitsAt(tileX, tileZ);
    let info = `<b>${tile.terrain.toUpperCase()}</b> (${tileX}, ${tileZ})`;
    if (tile.resource) info += ` | Resource: ${tile.resource}`;
    if (tile.owner >= 0) info += ` | Player ${tile.owner + 1}`;
    const city = gameState.cities.find(c => c.x === tileX && c.z === tileZ);
    if (city) info += `<br>City Lv${city.level} (Pop: ${city.population}/${city.maxPopulation})`;
    if (units.length > 0) info += `<br>Unit: ${units[0].type} (HP: ${units[0].hp}/${units[0].maxHp})`;
    tileInfo.innerHTML = info;
    tileInfo.style.display = 'block';

    // Check if there's a harvestable resource on an owned tile
    if (tile.resource && tile.owner === gameState.currentPlayer) {
      btnHarvest.disabled = false;
      btnHarvest.onclick = () => {
        actions.harvestResource(tileX, tileZ, gameState.currentPlayer);
        refreshScene();
        btnHarvest.disabled = true;
      };
    } else {
      btnHarvest.disabled = true;
    }

    // Select unit if present and owned
    if (units.length > 0 && units[0].owner === gameState.currentPlayer) {
      const unit = units[0];
      selectedUnit = unit;
      interactionState = INTERACTION.UNIT_SELECTED;
      showUnitPanel(unit);

      // Auto show moves + attacks
      const moves = actions.getValidMoves(unit);
      const targets = actions.getAttackTargets(unit);
      if (moves.length > 0) mapRenderer.showMoveOverlay(moves, gameState.mapSize);
      if (targets.length > 0) mapRenderer.showAttackOverlay(targets);
      interactionState = INTERACTION.MOVING; // ready for move or attack click
    } else {
      selectedUnit = null;
      hideUnitPanel();
      interactionState = INTERACTION.IDLE;
    }

    // Track selected city for training
    selectedCity = city && city.owner === gameState.currentPlayer ? city : null;
  } else {
    deselect();
  }
});

// Hover
sceneManager.renderer.domElement.addEventListener('mousemove', () => {
  const hits = sceneManager.raycast([...mapRenderer.tileMeshes, ...mapRenderer.overlayMeshes]);
  if (hits.length > 0) {
    const data = hits[0].object.userData;
    if (data.tileX !== undefined) {
      mapRenderer.highlightTile(data.tileX, data.tileZ);
    }
    sceneManager.renderer.domElement.style.cursor = 'pointer';
  } else {
    sceneManager.renderer.domElement.style.cursor = 'default';
  }
});

// --- Train menu ---

btnTrain.addEventListener('click', (e) => {
  e.stopPropagation();
  if (openMenu === 'train') { closeMenus(); return; }
  closeMenus();

  // Find available city (prefer selected, else first empty one)
  let city = selectedCity;
  if (!city || city.owner !== gameState.currentPlayer) {
    city = gameState.cities.find(c => {
      if (c.owner !== gameState.currentPlayer) return false;
      return !gameState.units.some(u => u.x === c.x && u.z === c.z && u.hp > 0);
    });
  }
  if (!city) return;

  // Check city tile is free
  const occupied = gameState.units.some(u => u.x === city.x && u.z === city.z && u.hp > 0);
  if (occupied) return;

  const trainable = actions.getTrainableUnits(gameState.currentPlayer);
  trainMenu.innerHTML = '';
  for (const t of trainable) {
    const item = document.createElement('div');
    item.className = `dropdown-item${t.canAfford ? '' : ' disabled'}`;
    item.innerHTML = `<span>${t.type}</span><span class="cost">${t.cost} stars</span>`;
    if (t.canAfford) {
      item.onclick = () => {
        actions.trainUnit(city, t.type);
        closeMenus();
        refreshScene();
      };
    }
    trainMenu.appendChild(item);
  }

  const rect = btnTrain.getBoundingClientRect();
  trainMenu.style.left = `${rect.left}px`;
  trainMenu.style.display = 'block';
  openMenu = 'train';
});

// --- Tech menu ---

btnTech.addEventListener('click', (e) => {
  e.stopPropagation();
  if (openMenu === 'tech') { closeMenus(); return; }
  closeMenus();

  const techs = actions.getAvailableTechs(gameState.currentPlayer);
  techMenu.innerHTML = '';

  if (techs.length === 0) {
    techMenu.innerHTML = '<div class="dropdown-item disabled"><span>All researched!</span></div>';
  }

  for (const t of techs) {
    const item = document.createElement('div');
    item.className = `dropdown-item${t.canAfford ? '' : ' disabled'}`;
    item.innerHTML = `<span>${t.name} <small style="opacity:0.5">${t.description}</small></span><span class="cost">${t.cost} stars</span>`;
    if (t.canAfford) {
      item.onclick = () => {
        actions.researchTech(gameState.currentPlayer, t.key);
        closeMenus();
        refreshScene();
      };
    }
    techMenu.appendChild(item);
  }

  const rect = btnTech.getBoundingClientRect();
  techMenu.style.left = `${rect.left}px`;
  techMenu.style.display = 'block';
  openMenu = 'tech';
});

// --- End Turn ---

function doEndTurn() {
  if (actions.gameOver) return;

  closeMenus();
  deselect();

  const continueGame = actions.endTurn();

  if (actions.gameOver) {
    gameOverEl.style.display = 'flex';
    winnerText.textContent = `Player ${actions.winner + 1} Wins!`;
    refreshScene();
    return;
  }

  if (!continueGame) {
    gameOverEl.style.display = 'flex';
    winnerText.textContent = `Player ${actions.winner + 1} Wins!`;
    refreshScene();
    return;
  }

  // Turn transition flash
  turnOverlay.textContent = `Player ${gameState.currentPlayer + 1}'s Turn`;
  turnOverlay.style.color = colorToCSS(PLAYER_COLORS[gameState.currentPlayer]);
  turnOverlay.style.display = 'flex';
  setTimeout(() => { turnOverlay.style.display = 'none'; }, 1200);

  refreshScene();
}

btnEndTurn.addEventListener('click', doEndTurn);

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); doEndTurn(); }
  if (e.code === 'Escape') { deselect(); }
});

// Close menus on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown-menu') && !e.target.closest('.action-btn')) {
    closeMenus();
  }
});

// --- Init ---
actions.recalcStarsPerTurn(0);
actions.recalcStarsPerTurn(1);
updateUI();

function animate() {
  requestAnimationFrame(animate);
  sceneManager.render();
}
animate();

console.log('MoltArena Polytopia Engine v0.2 initialized');
console.log('Controls: WASD/Arrows=pan, RightDrag=orbit, Scroll=zoom, Click=select, Space=end turn');
