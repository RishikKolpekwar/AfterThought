import { useState, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { PLAYER_COLORS, UNIT_STATS, TECHS, MAP_SIZE_BY_PLAYERS, CITY_UPGRADE_REWARDS, BUILDING_ACTIONS, EMBASSY_COST, RELATION, EXPLORE_POINTS, TERRAIN_COLORS } from '../core/constants.js';

// Inject CSS animation for explore popup and notification toasts
if (typeof document !== 'undefined' && !document.getElementById('hud-animations')) {
  const style = document.createElement('style');
  style.id = 'hud-animations';
  style.textContent = `
    @keyframes exploreFloat {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 0.8; transform: translate(-50%, -70%) scale(1.1); }
      100% { opacity: 0; transform: translate(-50%, -90%) scale(0.9); }
    }
    @keyframes toastSlideIn {
      0% { opacity: 0; transform: translateX(80px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes toastFadeOut {
      0% { opacity: 1; }
      100% { opacity: 0; transform: translateX(40px); }
    }
  `;
  document.head.appendChild(style);
}

const FONT = "'Trebuchet MS', 'Avenir Next', 'Gill Sans', sans-serif";
const LABEL_FONT = "'Trebuchet MS', 'Gill Sans', sans-serif";

function colorToCSS(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

/* ─── Top Center Bar (Score / Stars / Turn) — 2x size ─── */
function TopBar() {
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const players = useGameStore(s => s.players);
  const turn = useGameStore(s => s.turn);
  const gameState = useGameStore(s => s.gameState);
  const score = useGameStore(s => s.score);

  const p = players[currentPlayer];
  const pColor = colorToCSS(PLAYER_COLORS[currentPlayer]);

  return (
    <div style={{
      position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: FONT, pointerEvents: 'none', zIndex: 50,
      textShadow: '0 2px 8px rgba(0,0,0,0.75)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 34 }}>
        <div style={{ minWidth: 132, textAlign: 'center' }}>
          <div style={{
            color: '#d2d2d2',
            fontFamily: LABEL_FONT,
            fontSize: 17,
            fontStyle: 'italic',
            letterSpacing: 0.5,
          }}>
            Score
          </div>
          <div style={{ color: '#ffffff', fontSize: 56, lineHeight: 1, fontWeight: 500 }}>{score}</div>
        </div>

        <div style={{ minWidth: 160, textAlign: 'center' }}>
          <div style={{
            color: '#d2d2d2',
            fontFamily: LABEL_FONT,
            fontSize: 17,
            fontStyle: 'italic',
            letterSpacing: 0.5,
          }}>
            Stars (+{p?.starsPerTurn})
          </div>
          <div style={{ color: '#ffffff', fontSize: 56, lineHeight: 1, fontWeight: 500 }}>
            <span style={{ color: '#ffd84b', fontSize: 40, marginRight: 8 }}>&#9733;</span>
            {p?.stars}
          </div>
        </div>

        <div style={{ minWidth: 132, textAlign: 'center' }}>
          <div style={{
            color: '#d2d2d2',
            fontFamily: LABEL_FONT,
            fontSize: 17,
            fontStyle: 'italic',
            letterSpacing: 0.5,
          }}>
            Turn
          </div>
          <div style={{ color: pColor, fontSize: 56, lineHeight: 1, fontWeight: 500 }}>{turn}/{gameState.maxTurns}</div>
        </div>
      </div>

      {/* All player scores */}
      <div style={{
        marginTop: 8, display: 'flex', gap: 16,
      }}>
        {players.map((pl, i) => {
          const c = colorToCSS(PLAYER_COLORS[i]);
          const s = gameState.computeScore(i);
          const isCurrent = i === currentPlayer;
          return (
            <div key={i}
              onClick={() => !isCurrent && useGameStore.getState().openDiplomacy(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: isCurrent ? 1 : 0.5,
                fontSize: 14, color: c,
                fontFamily: FONT,
                cursor: isCurrent ? 'default' : 'pointer',
                pointerEvents: 'auto',
              }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: c, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 9, color: '#fff',
                fontWeight: 700,
              }}>
                {i + 1}
              </div>
              <span style={{ fontWeight: 600 }}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Player indicator (top-left) ─── */
function PlayerBadge() {
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const pColor = colorToCSS(PLAYER_COLORS[currentPlayer]);
  return (
    <div style={{
      position: 'absolute', top: 18, left: 20, display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: FONT, pointerEvents: 'none',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: pColor,
        border: '2px solid rgba(255,255,255,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#fff',
        boxShadow: '0 0 0 3px rgba(0,0,0,0.5)',
      }}>
        P{currentPlayer + 1}
      </div>
    </div>
  );
}

/* ─── Terrain & Resource icon maps ─── */
const TERRAIN_ICONS = {
  field: '\u{1F33E}', forest: '\u{1F332}', mountain: '\u26F0\uFE0F', water: '\u{1F30A}',
  shallow_water: '\u{1F30A}', village: '\u{1F3D8}\uFE0F', city: '\u{1F3D9}\uFE0F',
  ruins: '\u{1F3DB}\uFE0F', ocean: '\u{1F30A}',
};
const RESOURCE_ICONS = {
  fruit: '\u{1F34A}', animal: '\u{1F98C}', crop: '\u{1F33D}', mine: '\u26CF\uFE0F', fish: '\u{1F41F}',
  forest_resource: '\u{1FAB5}',
};

/* ─── Tile info (bottom-left) ─── */
function TileInfoPanel() {
  const selectedTile = useGameStore(s => s.selectedTile);
  const gameState = useGameStore(s => s.gameState);
  const cities = useGameStore(s => s.cities);
  const units = useGameStore(s => s.units);

  if (!selectedTile) return null;
  const tile = gameState.getTile(selectedTile.x, selectedTile.z);
  if (!tile) return null;

  const city = cities.find(c => c.x === tile.x && c.z === tile.z);
  const tileUnits = units.filter(u => u.x === tile.x && u.z === tile.z && u.hp > 0);
  const ownerColor = tile.owner >= 0 ? colorToCSS(PLAYER_COLORS[tile.owner]) : '#888';
  const terrainColor = TERRAIN_COLORS[tile.terrain] ? colorToCSS(TERRAIN_COLORS[tile.terrain]) : '#e0e0e0';
  const terrainIcon = TERRAIN_ICONS[tile.terrain] || '';
  const resourceIcon = tile.resource ? (RESOURCE_ICONS[tile.resource] || '') : '';

  // City details
  let cityIncome = 0;
  let cityCapacity = 0;
  let citySupportedCount = 0;
  if (city) {
    cityIncome = city.level + (city.workshop ? 1 : 0) + (city.park ? 1 : 0) + (city.isCapital ? 1 : 0);
    cityCapacity = city.level + 1;
    citySupportedCount = units.filter(u => u.cityRef && u.cityRef.x === city.x && u.cityRef.z === city.z && u.hp > 0).length;
  }

  return (
    <div style={{
      position: 'absolute', bottom: 170, left: 16, color: '#e0e0e0',
      background: 'rgba(0,0,0,0.82)', padding: '14px 18px', borderRadius: 12,
      fontSize: 14, maxWidth: 320, fontFamily: FONT, pointerEvents: 'none',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{terrainIcon}</span>
        <b style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 15, color: terrainColor }}>{tile.terrain}</b>
        <span style={{ opacity: 0.4, fontSize: 12 }}>({tile.x}, {tile.z})</span>
        {tile.owner >= 0 && (
          <span style={{
            fontSize: 11, color: ownerColor, fontWeight: 600,
            background: 'rgba(255,255,255,0.08)', padding: '1px 8px', borderRadius: 6,
          }}>P{tile.owner + 1}</span>
        )}
      </div>
      {tile.resource && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ffd700', fontSize: 13, marginBottom: 4 }}>
          <span style={{ fontSize: 16 }}>{resourceIcon}</span>
          <span style={{ textTransform: 'capitalize' }}>{tile.resource}</span>
        </div>
      )}
      {tile.building && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#fff',
            background: 'rgba(80,160,255,0.35)', padding: '2px 10px', borderRadius: 6,
            border: '1px solid rgba(80,160,255,0.5)',
          }}>{BUILDING_ACTIONS[tile.building]?.name || tile.building}</span>
        </div>
      )}

      {/* City details */}
      {city && (
        <div style={{
          marginTop: 6, padding: '8px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${ownerColor}33`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {city.isCapital && <span style={{ fontSize: 14 }}>&#128081;</span>}
            <span style={{ fontWeight: 700, fontSize: 15, color: ownerColor }}>
              Level {city.level} {city.isCapital ? 'Capital' : 'City'}
            </span>
          </div>

          {/* Population bar */}
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            Population: {city.population}/{city.maxPopulation}
          </div>
          <div style={{ width: '100%', height: 6, background: '#222', borderRadius: 3, marginBottom: 6 }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${Math.min(100, (city.population / city.maxPopulation) * 100)}%`,
              background: 'linear-gradient(90deg, #4488ff, #66aaff)',
              transition: 'width 0.3s',
            }} />
          </div>

          {/* Unit capacity */}
          <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ opacity: 0.7 }}>Unit Capacity</span>
            <span style={{ color: citySupportedCount >= cityCapacity ? '#ff6666' : '#aaa' }}>
              {citySupportedCount}/{cityCapacity}
            </span>
          </div>

          {/* Income */}
          <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ opacity: 0.7 }}>Income</span>
            <span style={{ color: '#ffd700' }}>+{cityIncome} &#9733;/turn</span>
          </div>

          {/* Buildings */}
          {(city.walls || city.workshop || city.park) && (
            <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {city.walls && <span style={{
                background: 'rgba(140,180,220,0.2)', padding: '2px 8px', borderRadius: 5,
                border: '1px solid rgba(140,180,220,0.3)', color: '#aaccee',
              }}>{'\u{1F6E1}\uFE0F'} Walls</span>}
              {city.workshop && <span style={{
                background: 'rgba(255,200,50,0.15)', padding: '2px 8px', borderRadius: 5,
                border: '1px solid rgba(255,200,50,0.3)', color: '#ffd700',
              }}>{'\u2699\uFE0F'} Workshop</span>}
              {city.park && <span style={{
                background: 'rgba(100,255,100,0.15)', padding: '2px 8px', borderRadius: 5,
                border: '1px solid rgba(100,255,100,0.3)', color: '#88ff88',
              }}>{'\u{1F333}'} Park</span>}
            </div>
          )}

          {/* Pending upgrade indicator */}
          {city.pendingUpgrade && (
            <div style={{ fontSize: 12, marginTop: 6, color: '#ffaa00', fontWeight: 600 }}>
              Upgrade available!
            </div>
          )}
        </div>
      )}

      {/* Units on tile */}
      {tileUnits.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {tileUnits.map(u => (
            <div key={u.id} style={{ fontSize: 13, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ textTransform: 'capitalize' }}>{u.type}</span>
              <span style={{ opacity: 0.6 }}>HP: {u.hp}/{u.maxHp}{u.veteran ? ' [Vet]' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Unit panel (bottom-right) ─── */
function UnitPanel() {
  const selectedUnit = useGameStore(s => s.selectedUnit);
  const currentPlayer = useGameStore(s => s.currentPlayer);

  if (!selectedUnit) return null;
  const stats = UNIT_STATS[selectedUnit.type];
  const isOwn = selectedUnit.owner === currentPlayer;
  const hpPct = (selectedUnit.hp / selectedUnit.maxHp) * 100;
  const pColor = colorToCSS(PLAYER_COLORS[selectedUnit.owner]);

  return (
    <div style={{
      position: 'absolute', bottom: 170, right: 16, background: 'rgba(0,0,0,0.8)',
      color: '#e0e0e0', padding: '14px 20px', borderRadius: 12, minWidth: 220,
      fontSize: 15, fontFamily: FONT, border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, textTransform: 'capitalize', color: pColor, marginBottom: 6 }}>
        {selectedUnit.type} (P{selectedUnit.owner + 1})
      </div>
      <div style={{ width: '100%', height: 8, background: '#222', borderRadius: 4, margin: '8px 0' }}>
        <div style={{
          height: '100%', borderRadius: 4, width: `${hpPct}%`,
          background: hpPct > 50 ? '#44ff44' : hpPct > 25 ? '#ffaa00' : '#ff4444',
          transition: 'width 0.3s',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>HP</span><span>{selectedUnit.hp}/{selectedUnit.maxHp}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ATK</span><span>{stats.attack}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>DEF</span><span>{stats.defence}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Move</span><span>{stats.movement}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Range</span><span>{stats.range}</span></div>
      {isOwn && (
        <div style={{ fontSize: 12, marginTop: 8, opacity: 0.5 }}>
          {selectedUnit.moved ? 'Moved' : 'Ready'}{' · '}{selectedUnit.attacked ? 'Attacked' : 'Can attack'}
        </div>
      )}
    </div>
  );
}

/* ─── Game log ─── */
function GameLog() {
  const log = useGameStore(s => s.log);
  return (
    <div style={{
      position: 'absolute', top: 60, left: 20, color: '#888', fontSize: 13,
      maxWidth: 280, maxHeight: 160, overflowY: 'auto', pointerEvents: 'none',
      fontFamily: FONT,
    }}>
      {log.slice(-6).map((l, i) => (
        <div key={i} style={{ marginBottom: 3, opacity: 0.6 }}>{l}</div>
      ))}
    </div>
  );
}

/* ─── Train menu popup ─── */
function TrainMenu() {
  const openMenu = useGameStore(s => s.openMenu);
  const actions = useGameStore(s => s.actions);
  const gameState = useGameStore(s => s.gameState);
  const trainUnit = useGameStore(s => s.trainUnit);

  if (openMenu !== 'train') return null;
  const trainable = actions.getTrainableUnits(gameState.currentPlayer);

  return (
    <div style={{
      position: 'absolute', bottom: 165, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(10,10,25,0.95)', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 12, padding: '8px 0', minWidth: 260, maxHeight: 340, overflowY: 'auto', zIndex: 100,
      fontFamily: FONT,
    }}>
      {trainable.map((t) => (
        <div
          key={t.type}
          style={{
            padding: '10px 20px', cursor: t.canAfford ? 'pointer' : 'not-allowed',
            fontSize: 15, color: '#e0e0e0', display: 'flex', justifyContent: 'space-between',
            opacity: t.canAfford ? 1 : 0.35, textTransform: 'capitalize',
          }}
          onMouseOver={(e) => t.canAfford && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          onClick={() => t.canAfford && trainUnit(t.type)}
        >
          <span>{t.type}</span>
          <span style={{ color: '#ffd700', fontWeight: 600, fontSize: 14 }}>{t.cost}&#9733;</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Visual Tech Tree Modal — Radial Circular Green Nodes ─── */

// 5-branch radial layout — each branch at 72° intervals
const TECH_TREE_LAYOUT = {
  // Branch: Climbing (top, 270°)
  climbing:     { angle: 270, dist: 1.1 },
  mining:       { angle: 255, dist: 2.1 },
  meditation:   { angle: 285, dist: 2.1 },
  smithery:     { angle: 250, dist: 3.2 },
  philosophy:   { angle: 290, dist: 3.2 },
  // Branch: Fishing (upper-right, 342°)
  fishing:      { angle: 342, dist: 1.1 },
  sailing:      { angle: 327, dist: 2.1 },
  ramming:      { angle: 357, dist: 2.1 },
  navigation:   { angle: 322, dist: 3.2 },
  aquatism:     { angle: 2, dist: 3.2 },
  // Branch: Hunting (lower-right, 54°)
  hunting:      { angle: 54, dist: 1.1 },
  archery:      { angle: 39, dist: 2.1 },
  forestry:     { angle: 69, dist: 2.1 },
  spiritualism: { angle: 34, dist: 3.2 },
  mathematics:  { angle: 74, dist: 3.2 },
  // Branch: Organization (lower-left, 126°)
  organization: { angle: 126, dist: 1.1 },
  farming:      { angle: 111, dist: 2.1 },
  strategy:     { angle: 141, dist: 2.1 },
  construction: { angle: 106, dist: 3.2 },
  diplomacy:    { angle: 146, dist: 3.2 },
  // Branch: Riding (left, 198°)
  riding:       { angle: 198, dist: 1.1 },
  roads:        { angle: 183, dist: 2.1 },
  free_spirit:  { angle: 213, dist: 2.1 },
  trade:        { angle: 178, dist: 3.2 },
  chivalry:     { angle: 218, dist: 3.2 },
};

// Auto-generate connections from tech prerequisites
const TECH_CONNECTIONS = Object.entries(TECHS)
  .filter(([_, t]) => t.requires)
  .map(([key, t]) => [t.requires, key]);

// Lines from center hub to each T1 tech
const CENTER_CONNECTIONS = Object.entries(TECHS)
  .filter(([_, t]) => t.tier === 1)
  .map(([key]) => key);

function TechTreeModal() {
  const techTreeOpen = useGameStore(s => s.techTreeOpen);
  const toggleTechTree = useGameStore(s => s.toggleTechTree);
  const actions = useGameStore(s => s.actions);
  const gameState = useGameStore(s => s.gameState);
  const researchTech = useGameStore(s => s.researchTech);
  const players = useGameStore(s => s.players);
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const score = useGameStore(s => s.score);
  const turn = useGameStore(s => s.turn);

  // Drag-pan + zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hoveredTech, setHoveredTech] = useState(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
  const panLimit = 600;

  const handleMouseDown = useCallback((e) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const newX = Math.max(-panLimit, Math.min(panLimit, dragRef.current.startPanX + dx));
    const newY = Math.max(-panLimit, Math.min(panLimit, dragRef.current.startPanY + dy));
    setPan({ x: newX, y: newY });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(2, z - e.deltaY * 0.001)));
  }, []);

  if (!techTreeOpen) return null;

  const playerTechs = players[currentPlayer]?.technologies || [];
  const availableTechs = actions.getAvailableTechs(gameState.currentPlayer);
  const availableKeys = new Set(availableTechs.map(t => t.key));
  const p = players[currentPlayer];

  const centerX = 550;
  const centerY = 550;
  const ringSpacing = 150;
  const nodeR = 42;

  const getNodePos = (key) => {
    const layout = TECH_TREE_LAYOUT[key];
    if (!layout) return { x: centerX, y: centerY };
    const rad = (layout.angle * Math.PI) / 180;
    return {
      x: centerX + Math.cos(rad) * layout.dist * ringSpacing,
      y: centerY + Math.sin(rad) * layout.dist * ringSpacing,
    };
  };

  const handleResearch = (key) => {
    const tech = availableTechs.find(t => t.key === key);
    if (tech && tech.canAfford) {
      researchTech(key);
    }
  };

  const svgW = 1100;
  const svgH = 1100;

  return (
    <div
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: '#050510', zIndex: 250,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        fontFamily: FONT, overflow: 'hidden', cursor: dragRef.current.dragging ? 'grabbing' : 'default',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Starfield background */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 120 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: Math.random() < 0.3 ? 2 : 1,
            height: Math.random() < 0.3 ? 2 : 1,
            background: '#fff',
            borderRadius: '50%',
            opacity: 0.3 + Math.random() * 0.5,
          }} />
        ))}
      </div>

      {/* Back button */}
      <div
        onClick={toggleTechTree}
        style={{
          position: 'absolute', top: 20, left: 24,
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 24, color: '#fff', zIndex: 10,
        }}
      >
        &#8249;
      </div>

      {/* Top stats bar */}
      <div style={{
        marginTop: 18, display: 'flex', gap: 40, alignItems: 'baseline',
        color: '#ccc', fontSize: 16, zIndex: 5,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.6 }}>Score</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{score}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.6 }}>Stars (+{p?.starsPerTurn})</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ffd700', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 22 }}>&#9733;</span>{p?.stars}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.6 }}>Turn</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{turn}</div>
        </div>
      </div>

      {/* Tech Tree — draggable + zoomable area */}
      <div
        style={{
          position: 'relative', width: svgW, height: svgH, marginTop: 10,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center top',
          cursor: dragRef.current.dragging ? 'grabbing' : 'grab',
          transition: dragRef.current.dragging ? 'none' : 'transform 0.1s ease-out',
        }}
        onMouseDown={handleMouseDown}
      >
        <svg width={svgW} height={svgH} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Center hub to T1 lines */}
          {CENTER_CONNECTIONS.map((key, i) => {
            const b = getNodePos(key);
            const researched = playerTechs.includes(key);
            return (
              <line key={`hub-${i}`} x1={centerX} y1={centerY} x2={b.x} y2={b.y}
                stroke={researched ? '#33bb66' : 'rgba(255,255,255,0.25)'}
                strokeWidth={researched ? 3 : 2} />
            );
          })}
          {/* Connection lines — green=researched, red=available path, gray=locked */}
          {TECH_CONNECTIONS.map(([from, to], i) => {
            const a = getNodePos(from);
            const b = getNodePos(to);
            const bothResearched = playerTechs.includes(from) && playerTechs.includes(to);
            const fromResearched = playerTechs.includes(from);
            const toResearched = playerTechs.includes(to);
            const oneResearched = fromResearched || toResearched;

            let stroke, strokeW;
            if (bothResearched) {
              stroke = '#33bb66'; strokeW = 3;
            } else if (oneResearched) {
              stroke = '#cc4444'; strokeW = 3;
            } else {
              stroke = 'rgba(255,255,255,0.3)'; strokeW = 2;
            }
            return (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={stroke} strokeWidth={strokeW} />
            );
          })}
        </svg>

        {/* Center city icon */}
        <div style={{
          position: 'absolute',
          left: centerX - 30, top: centerY - 30,
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6b4f2a 0%, #8b6c3a 100%)',
          border: '3px solid #c9a84c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, zIndex: 2,
        }}>
          &#127984;
        </div>

        {/* Tech nodes */}
        {Object.entries(TECHS).map(([key, tech]) => {
          const pos = getNodePos(key);
          const researched = playerTechs.includes(key);
          const available = availableKeys.has(key);
          const canAfford = availableTechs.find(t => t.key === key)?.canAfford;

          let bg, borderColor, textColor, opac, shadow;
          if (researched) {
            bg = 'radial-gradient(circle at 30% 25%, #7aff9a 0%, #3cc85c 40%, #1a8a38 100%)';
            borderColor = '#5eff80';
            textColor = '#fff';
            opac = 1;
            shadow = '0 0 20px rgba(60,220,100,0.5), inset 0 -4px 12px rgba(0,0,0,0.3), inset 0 2px 6px rgba(255,255,255,0.25)';
          } else if (available && canAfford) {
            bg = 'radial-gradient(circle at 30% 25%, #8cc8ff 0%, #4a90e2 40%, #2260b0 100%)';
            borderColor = '#cc4444';
            textColor = '#fff';
            opac = 1;
            shadow = '0 0 18px rgba(70,140,255,0.4), inset 0 -4px 12px rgba(0,0,0,0.3), inset 0 2px 6px rgba(255,255,255,0.2)';
          } else if (available) {
            bg = 'radial-gradient(circle at 30% 25%, #666 0%, #444 40%, #2a2a2a 100%)';
            borderColor = '#cc4444';
            textColor = '#bbb';
            opac = 0.8;
            shadow = 'inset 0 -4px 10px rgba(0,0,0,0.4), inset 0 2px 6px rgba(255,255,255,0.08)';
          } else {
            bg = 'none';
            borderColor = '#555';
            textColor = '#777';
            opac = 0.7;
            shadow = 'none';
          }

          return (
            <div
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                if (available && canAfford) handleResearch(key);
              }}
              style={{
                position: 'absolute',
                left: pos.x - nodeR, top: pos.y - nodeR,
                width: nodeR * 2, height: nodeR * 2,
                borderRadius: '50%',
                background: bg,
                border: `3px solid ${borderColor}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: available && canAfford ? 'pointer' : 'default',
                opacity: opac, transition: 'all 0.25s ease',
                color: textColor, zIndex: 3,
                boxShadow: shadow,
              }}
              onMouseOver={(e) => {
                setHoveredTech(key);
                if (available && canAfford) {
                  e.currentTarget.style.transform = 'scale(1.15)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(80,160,255,0.6), inset 0 -4px 12px rgba(0,0,0,0.3), inset 0 2px 6px rgba(255,255,255,0.3)';
                }
              }}
              onMouseOut={(e) => {
                setHoveredTech(null);
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = shadow;
              }}
            >
              {(researched || (available && canAfford)) && (
                <div style={{
                  position: 'absolute', top: 4, left: '18%', right: '18%', height: '35%',
                  borderRadius: '50%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)',
                  pointerEvents: 'none',
                }} />
              )}
              <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.15, zIndex: 1 }}>
                {tech.name}
              </div>
              {!researched && (
                <div style={{ fontSize: 11, color: '#ffd700', marginTop: 3, fontWeight: 600, zIndex: 1 }}>
                  {availableTechs.find(t => t.key === key)?.cost
                    ?? actions.techTree.computeCost(players[currentPlayer], key)}&#9733;
                </div>
              )}
              {researched && (
                <div style={{ fontSize: 14, color: '#fff', marginTop: 2, zIndex: 1 }}>&#10003;</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tech info tooltip */}
      {hoveredTech && TECHS[hoveredTech] && (() => {
        const ht = TECHS[hoveredTech];
        const htPos = getNodePos(hoveredTech);
        const isResearched = playerTechs.includes(hoveredTech);
        const htCost = isResearched ? null : (availableTechs.find(t => t.key === hoveredTech)?.cost
          ?? actions.techTree.computeCost(players[currentPlayer], hoveredTech));
        const unlocksList = ht.unlocks && ht.unlocks.length > 0
          ? ht.unlocks.map(u => u.charAt(0).toUpperCase() + u.slice(1)).join(', ')
          : null;
        // Position tooltip to the right of the node, or left if near right edge
        const tooltipLeft = htPos.x + nodeR + 12 + pan.x > svgW - 200
          ? htPos.x - nodeR - 220
          : htPos.x + nodeR + 12;
        return (
          <div style={{
            position: 'absolute',
            left: tooltipLeft + pan.x * (1 / zoom),
            top: htPos.y - 30 + pan.y * (1 / zoom),
            width: 200, padding: '12px 14px',
            background: 'rgba(10,10,30,0.95)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10, color: '#e0e0e0',
            fontSize: 13, fontFamily: FONT,
            zIndex: 20, pointerEvents: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            transform: `scale(${1 / zoom})`,
            transformOrigin: 'top left',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: isResearched ? '#5eff80' : '#fff' }}>
              {ht.name}
              <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 6 }}>Tier {ht.tier}</span>
            </div>
            <div style={{ opacity: 0.8, lineHeight: 1.4 }}>{ht.description}</div>
            {unlocksList && (
              <div style={{ marginTop: 6, color: '#ffd700', fontSize: 12 }}>
                Unlocks: {unlocksList}
              </div>
            )}
            {ht.requires && (
              <div style={{ marginTop: 4, fontSize: 11, opacity: 0.5 }}>
                Requires: {TECHS[ht.requires]?.name}
              </div>
            )}
            {!isResearched && htCost !== null && (
              <div style={{ marginTop: 6, fontSize: 13, color: '#ffd700', fontWeight: 600 }}>
                Cost: {htCost} &#9733;
              </div>
            )}
            {isResearched && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#5eff80' }}>Researched &#10003;</div>
            )}
          </div>
        );
      })()}

      {/* Footer hint */}
      <div style={{ color: '#555', fontSize: 13, position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', zIndex: 5 }}>
        Tech costs increase for each city in your empire. Hover nodes for details.
      </div>
    </div>
  );
}

/* ─── Settings Menu ─── */
function SettingsMenu() {
  const openMenu = useGameStore(s => s.openMenu);
  const setOpenMenu = useGameStore(s => s.setOpenMenu);
  const newGame = useGameStore(s => s.newGame);
  const [playerCount, setPlayerCount] = useState(3);

  if (openMenu !== 'settings') return null;

  const mapSize = MAP_SIZE_BY_PLAYERS[playerCount] || 15;

  return (
    <div style={{
      position: 'absolute', bottom: 100, left: 16,
      background: 'rgba(10,10,25,0.95)', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 12, padding: '8px 0', minWidth: 280, zIndex: 100,
      fontFamily: FONT,
    }}>
      <div style={{
        padding: '12px 20px', fontSize: 16, fontWeight: 700,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        color: '#fff', letterSpacing: 0.5,
      }}>
        Settings
      </div>

      {/* Player count selector */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', fontSize: 15, color: '#e0e0e0',
      }}>
        <span>Players</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[2, 3, 4].map(n => (
            <div
              key={n}
              onClick={() => setPlayerCount(n)}
              style={{
                width: 36, height: 36, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: playerCount === n ? 'rgba(80,160,255,0.5)' : 'rgba(255,255,255,0.08)',
                border: playerCount === n ? '2px solid #4a90e2' : '2px solid rgba(255,255,255,0.15)',
                cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#fff',
              }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>

      {/* Map size display */}
      <div style={{ padding: '4px 20px 8px', fontSize: 13, color: '#888' }}>
        Map: {mapSize}x{mapSize}
      </div>

      {/* New Game button */}
      <div
        style={{
          padding: '12px 20px', cursor: 'pointer', fontSize: 15,
          color: '#4aff4a', fontWeight: 600,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        onClick={() => { newGame(playerCount); setOpenMenu(null); }}
      >
        New Game
      </div>

      {/* Controls info */}
      <div style={{ padding: '8px 20px', fontSize: 13, color: '#777', opacity: 0.6,
        borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        Controls: Orbit = Drag, Zoom = Scroll
      </div>
      <div style={{ padding: '4px 20px 12px', fontSize: 13, color: '#777', opacity: 0.6 }}>
        Keyboard: T = Tech, Space = End Turn, Esc = Deselect
      </div>
    </div>
  );
}

/* ─── Game Stats Panel ─── */
function GameStatsPanel() {
  const openMenu = useGameStore(s => s.openMenu);
  const players = useGameStore(s => s.players);
  const cities = useGameStore(s => s.cities);
  const units = useGameStore(s => s.units);
  const gameState = useGameStore(s => s.gameState);
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const turn = useGameStore(s => s.turn);
  const openDiplomacy = useGameStore(s => s.openDiplomacy);

  if (openMenu !== 'stats') return null;

  const p = players[currentPlayer];
  const pColor = colorToCSS(PLAYER_COLORS[currentPlayer]);
  const totalTiles = gameState.mapSize * gameState.mapSize;
  const explored = gameState.getExploredCount(currentPlayer);
  const explorePercent = Math.round((explored / totalTiles) * 100);
  const wins = p?.combatStats?.wins || 0;
  const losses = p?.combatStats?.losses || 0;
  const battlePercent = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const destroyedCount = players.filter((pl, i) => i !== currentPlayer && !pl.alive).length;
  const destroyedTotal = players.length - 1;

  // Sorted scores
  const standings = players
    .map((pl, i) => ({
      i,
      score: gameState.computeScore(i),
      numCities: cities.filter(c => c.owner === i).length,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5,5,16,0.95)', zIndex: 250,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: FONT, overflowY: 'auto',
    }}>
      {/* Top stats */}
      <div style={{ marginTop: 60, display: 'flex', gap: 40, alignItems: 'baseline', color: '#ccc', fontSize: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.6 }}>Score</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{gameState.computeScore(currentPlayer)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.6 }}>Stars (+{p?.starsPerTurn})</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ffd700' }}>&#9733; {p?.stars}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.6 }}>Turn</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{turn}/{gameState.maxTurns}</div>
        </div>
      </div>

      {/* Skill bars */}
      <div style={{ width: 400, marginTop: 30 }}>
        {/* Exploration */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <span style={{ fontSize: 16, color: '#e0e0e0', fontWeight: 600 }}>Exploration</span>
            <div style={{ fontSize: 12, color: '#888' }}>{explored}/{totalTiles} tiles</div>
          </div>
          <span style={{ fontSize: 18, color: '#fff', fontWeight: 700 }}>{explorePercent}%</span>
        </div>
        <div style={{ width: '100%', height: 8, background: '#222', borderRadius: 4, marginBottom: 20 }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${explorePercent}%`, background: 'linear-gradient(90deg, #4488ff, #66aaff)', transition: 'width 0.3s' }} />
        </div>

        {/* Battle skills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <span style={{ fontSize: 16, color: '#e0e0e0', fontWeight: 600 }}>Battle skills</span>
            <div style={{ fontSize: 12, color: '#888' }}>{wins} won, {losses} lost</div>
          </div>
          <span style={{ fontSize: 18, color: '#fff', fontWeight: 700 }}>{battlePercent}%</span>
        </div>
        <div style={{ width: '100%', height: 8, background: '#222', borderRadius: 4, marginBottom: 20 }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${battlePercent}%`, background: 'linear-gradient(90deg, #ff6644, #ff8866)', transition: 'width 0.3s' }} />
        </div>

        {/* Tribes destroyed */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <span style={{ fontSize: 16, color: '#e0e0e0', fontWeight: 600 }}>Tribes destroyed</span>
            <div style={{ fontSize: 12, color: '#888' }}>{destroyedCount}/{destroyedTotal}</div>
          </div>
          <span style={{ fontSize: 18, color: '#fff', fontWeight: 700 }}>{destroyedTotal > 0 ? Math.round((destroyedCount / destroyedTotal) * 100) : 0}%</span>
        </div>
        <div style={{ width: '100%', height: 8, background: '#222', borderRadius: 4, marginBottom: 20 }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${destroyedTotal > 0 ? (destroyedCount / destroyedTotal) * 100 : 0}%`, background: 'linear-gradient(90deg, #ff4444, #ff6666)', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Scores leaderboard */}
      <div style={{ width: 420, marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#ccc', textAlign: 'center', marginBottom: 16, letterSpacing: 1 }}>
          Scores
        </div>
        {standings.map((s, idx) => {
          const sColor = colorToCSS(PLAYER_COLORS[s.i]);
          const isMe = s.i === currentPlayer;
          return (
            <div
              key={s.i}
              onClick={() => s.i !== currentPlayer && openDiplomacy(s.i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', marginBottom: 4, borderRadius: 10,
                background: isMe ? `${sColor}33` : 'rgba(255,255,255,0.03)',
                border: isMe ? `2px solid ${sColor}` : '2px solid transparent',
                cursor: s.i !== currentPlayer ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
              onMouseOver={(e) => !isMe && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseOut={(e) => !isMe && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: sColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                P{s.i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: sColor }}>
                  Player {s.i + 1}
                  {isMe && <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>(You)</span>}
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, color: '#aaa' }}>
                  {s.numCities} {s.numCities === 1 ? 'city' : 'cities'}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                {s.score.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Back button */}
      <div
        onClick={() => useGameStore.getState().setOpenMenu(null)}
        style={{
          position: 'absolute', top: 20, left: 24,
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 24, color: '#fff', zIndex: 10,
        }}
      >
        &#8249;
      </div>
    </div>
  );
}

/* ─── Diplomacy Modal ─── */
function DiplomacyModal() {
  const diplomacyTarget = useGameStore(s => s.diplomacyTarget);
  const closeDiplomacy = useGameStore(s => s.closeDiplomacy);
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const players = useGameStore(s => s.players);
  const gameState = useGameStore(s => s.gameState);
  const actions = useGameStore(s => s.actions);
  const offerPeace = useGameStore(s => s.offerPeace);
  const establishEmbassy = useGameStore(s => s.establishEmbassy);

  if (diplomacyTarget === null || diplomacyTarget === undefined) return null;

  const targetPlayer = players[diplomacyTarget];
  if (!targetPlayer) return null;

  const targetColor = colorToCSS(PLAYER_COLORS[diplomacyTarget]);
  const rel = gameState.diplomacy[currentPlayer]?.[diplomacyTarget];
  if (!rel) return null;

  const traits = actions.getRelationTraits(currentPlayer, diplomacyTarget);
  const myStars = players[currentPlayer]?.stars || 0;
  const canAffordEmbassy = myStars >= EMBASSY_COST;

  // Relation bar: hostile=0, unfriendly=25, neutral=50, friendly=75, allied=100
  const relationValues = { hostile: 0, unfriendly: 25, neutral: 50, friendly: 75, allied: 100 };
  const relValue = relationValues[rel.relation] ?? 50;
  const relLabel = rel.relation.charAt(0).toUpperCase() + rel.relation.slice(1);

  // Relation bar colors: gradient from red to green
  const relBarGradient = 'linear-gradient(90deg, #ff4444 0%, #ff8844 25%, #ffcc44 50%, #88cc44 75%, #44cc44 100%)';

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', zIndex: 260,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontFamily: FONT,
    }} onClick={closeDiplomacy}>
      <div style={{
        background: 'rgba(10,10,30,0.97)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 20, padding: '28px 36px', minWidth: 360, maxWidth: 440,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: targetColor }}>
            Player {diplomacyTarget + 1}
          </div>
          <div style={{
            display: 'inline-block', marginTop: 6, padding: '2px 14px',
            borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: rel.relation === 'hostile' ? 'rgba(255,68,68,0.2)' :
                       rel.relation === 'friendly' ? 'rgba(68,204,68,0.2)' :
                       rel.relation === 'allied' ? 'rgba(68,204,68,0.3)' :
                       'rgba(255,255,255,0.08)',
            color: rel.relation === 'hostile' ? '#ff6666' :
                   rel.relation === 'friendly' ? '#66cc66' :
                   rel.relation === 'allied' ? '#44ff44' :
                   '#aaa',
          }}>
            {relLabel}
          </div>
        </div>

        {/* Relation bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 6 }}>
            Relation: <span style={{
              color: relValue >= 75 ? '#44cc44' : relValue >= 50 ? '#cccc44' : relValue >= 25 ? '#cc8844' : '#ff4444',
              fontWeight: 600, fontStyle: 'italic',
            }}>{relLabel}</span>
          </div>
          <div style={{ width: '100%', height: 12, borderRadius: 6, background: '#222', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: relBarGradient, opacity: 0.3 }} />
            <div style={{
              position: 'absolute', left: `${relValue}%`, top: '50%', transform: 'translate(-50%, -50%)',
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              border: '2px solid #333', boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }} />
          </div>
        </div>

        {/* Traits */}
        {traits.length > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: '#888' }}>They think you are </span>
            {traits.map((t, i) => (
              <span key={i}>
                <span style={{
                  background: `${t.color}33`, color: t.color, padding: '2px 8px',
                  borderRadius: 6, fontSize: 13, fontWeight: 600, fontStyle: 'italic',
                }}>{t.text}</span>
                {i < traits.length - 1 && <span style={{ color: '#888', fontSize: 13 }}>{i === traits.length - 2 ? ' and ' : ', '}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {/* Offer Peace */}
          <div
            onClick={() => {
              offerPeace(diplomacyTarget);
              closeDiplomacy();
            }}
            style={{
              width: 100, textAlign: 'center', cursor: 'pointer',
              padding: '16px 8px', borderRadius: 14,
              background: 'rgba(68,136,255,0.12)', border: '2px solid rgba(68,136,255,0.3)',
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(68,136,255,0.25)'; e.currentTarget.style.border = '2px solid rgba(68,136,255,0.6)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(68,136,255,0.12)'; e.currentTarget.style.border = '2px solid rgba(68,136,255,0.3)'; }}
          >
            <div style={{ fontSize: 36, marginBottom: 6 }}>&#9774;</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#88bbff' }}>Offer Peace</div>
          </div>

          {/* Establish Embassy */}
          <div
            onClick={() => {
              if (canAffordEmbassy && !rel.hasEmbassy) {
                establishEmbassy(diplomacyTarget);
                closeDiplomacy();
              }
            }}
            style={{
              width: 100, textAlign: 'center',
              cursor: canAffordEmbassy && !rel.hasEmbassy ? 'pointer' : 'not-allowed',
              padding: '16px 8px', borderRadius: 14,
              background: 'rgba(255,200,50,0.1)', border: '2px solid rgba(255,200,50,0.3)',
              opacity: canAffordEmbassy && !rel.hasEmbassy ? 1 : 0.4,
              transition: 'all 0.15s', position: 'relative',
            }}
            onMouseOver={(e) => { if (canAffordEmbassy && !rel.hasEmbassy) { e.currentTarget.style.background = 'rgba(255,200,50,0.25)'; e.currentTarget.style.border = '2px solid rgba(255,200,50,0.6)'; } }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,200,50,0.1)'; e.currentTarget.style.border = '2px solid rgba(255,200,50,0.3)'; }}
          >
            <div style={{ fontSize: 36, marginBottom: 6 }}>&#127963;</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ffcc44' }}>
              {rel.hasEmbassy ? 'Embassy Built' : 'Establish Embassy'}
            </div>
            {!rel.hasEmbassy && (
              <div style={{
                position: 'absolute', top: -8, right: -8, fontSize: 12, fontWeight: 700,
                background: '#0b8ee8', color: '#fff', borderRadius: 8,
                padding: '1px 8px', border: '1px solid rgba(255,255,255,0.8)',
              }}>
                &#9733;{EMBASSY_COST}
              </div>
            )}
          </div>
        </div>

        {/* Close button */}
        <div
          onClick={closeDiplomacy}
          style={{
            marginTop: 16, textAlign: 'center', fontSize: 13, color: '#888',
            cursor: 'pointer', padding: '8px 0',
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
          onMouseOut={(e) => e.currentTarget.style.color = '#888'}
        >
          Close
        </div>
      </div>
    </div>
  );
}

/* ─── Unified Tile Action Popup (Harvest + Build) with collapse caret ─── */
function TileActionPopup() {
  const selectedTile = useGameStore(s => s.selectedTile);
  const gameState = useGameStore(s => s.gameState);
  const actions = useGameStore(s => s.actions);
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const units = useGameStore(s => s.units);
  const harvestResource = useGameStore(s => s.harvestResource);
  const buildOnTile = useGameStore(s => s.buildOnTile);
  const deselect = useGameStore(s => s.deselect);

  if (!selectedTile) return null;
  const tile = gameState.getTile(selectedTile.x, selectedTile.z);
  if (!tile) return null;

  // --- Harvest info ---
  let canHarvest = false;
  let harvestTechNeeded = null;
  let resourceName = null;
  const hasUnitOnTile = units.some(
    u => u.x === selectedTile.x && u.z === selectedTile.z && u.owner === currentPlayer && u.hp > 0
  );
  if (tile.resource && (tile.owner === currentPlayer || hasUnitOnTile)) {
    resourceName = tile.resource;
    const techs = gameState.players[currentPlayer].technologies;
    const techMap = { animal: 'hunting', fish: 'fishing', mine: 'mining', crop: 'organization' };
    const required = techMap[tile.resource];
    if (!required || techs.includes(required)) {
      canHarvest = true;
    } else {
      harvestTechNeeded = required;
    }
  }

  // --- Build info ---
  let buildable = [];
  if (tile.owner === currentPlayer && !tile.building) {
    buildable = actions.getBuildableActions(selectedTile.x, selectedTile.z, currentPlayer);
  }

  // Nothing to show
  if (!resourceName && buildable.length === 0) return null;

  const resIcon = resourceName ? (RESOURCE_ICONS[resourceName] || '\u{1F33F}') : '';

  return (
    <div style={{
      position: 'absolute', bottom: 170, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(10,10,25,0.96)', border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 14, minWidth: 260, maxWidth: 320, maxHeight: 360, overflowY: 'auto',
      zIndex: 90, fontFamily: FONT,
      boxShadow: '0 6px 28px rgba(0,0,0,0.6)',
    }}>
      {/* Collapse caret header */}
      <div
        onClick={deselect}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '6px 0 4px', cursor: 'pointer',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: 18, color: '#888', lineHeight: 1, transition: 'color 0.15s' }}>{'\u25BC'}</span>
      </div>

      {/* Harvest card */}
      {resourceName && (
        <div
          onClick={() => canHarvest && harvestResource()}
          style={{
            padding: '12px 16px', cursor: canHarvest ? 'pointer' : 'default',
            borderBottom: buildable.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}
          onMouseOver={(e) => canHarvest && (e.currentTarget.style.background = 'rgba(80,180,80,0.12)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{resIcon}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 15, fontWeight: 700, color: canHarvest ? '#88ff88' : '#999',
                textTransform: 'capitalize',
              }}>
                Harvest {resourceName}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {canHarvest ? '+1 population to nearest city' : `Requires ${harvestTechNeeded}`}
              </div>
            </div>
            {canHarvest && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#fff',
                background: 'rgba(80,180,80,0.5)', padding: '3px 10px', borderRadius: 8,
              }}>FREE</span>
            )}
            {!canHarvest && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#ff8888',
                background: 'rgba(255,80,80,0.15)', padding: '3px 10px', borderRadius: 8,
              }}>LOCKED</span>
            )}
          </div>
        </div>
      )}

      {/* Build section */}
      {buildable.length > 0 && (
        <>
          <div style={{
            padding: '6px 16px 4px', fontSize: 11, fontWeight: 700, color: '#666',
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            Build
          </div>
          {buildable.map(b => (
            <div
              key={b.key}
              onClick={() => b.canAfford && buildOnTile(b.key)}
              style={{
                padding: '10px 16px', cursor: b.canAfford ? 'pointer' : 'not-allowed',
                fontSize: 14, color: '#e0e0e0', display: 'flex', alignItems: 'center',
                gap: 10, opacity: b.canAfford ? 1 : 0.35,
              }}
              onMouseOver={(e) => b.canAfford && (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{b.description}</div>
              </div>
              <span style={{
                color: '#ffd700', fontWeight: 700, fontSize: 13,
                background: 'rgba(255,215,0,0.1)', padding: '3px 10px', borderRadius: 8,
                whiteSpace: 'nowrap',
              }}>{b.cost}&#9733;</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ─── City Upgrade Modal ─── */
function CityUpgradeModal() {
  const cities = useGameStore(s => s.cities);
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const chooseCityUpgrade = useGameStore(s => s.chooseCityUpgrade);

  // Find first city with pending upgrade for current player
  const pendingCity = cities.find(c => c.owner === currentPlayer && c.pendingUpgrade);
  if (!pendingCity) return null;

  const rewardLevel = Math.min(pendingCity.pendingUpgrade, 5);
  const rewards = CITY_UPGRADE_REWARDS[rewardLevel] || CITY_UPGRADE_REWARDS[5];
  const pColor = colorToCSS(PLAYER_COLORS[currentPlayer]);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 200, fontFamily: FONT,
    }}>
      <div style={{
        background: 'rgba(10,10,30,0.97)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 16, padding: '24px 32px', minWidth: 340, maxWidth: 400,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: pColor }}>
            City Upgraded to Level {pendingCity.level}!
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            ({pendingCity.x}, {pendingCity.z}){pendingCity.isCapital ? ' — Capital' : ''}
          </div>
          <div style={{ fontSize: 14, color: '#ccc', marginTop: 8 }}>
            Choose a reward:
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {rewards.map(r => (
            <div
              key={r.id}
              onClick={() => chooseCityUpgrade(pendingCity.x, pendingCity.z, r.id)}
              style={{
                flex: 1, padding: '16px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '2px solid rgba(255,255,255,0.15)',
                borderRadius: 12, cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.border = `2px solid ${pColor}`;
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.border = '2px solid rgba(255,255,255,0.15)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {r.name}
              </div>
              <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.4 }}>
                {r.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Explore Points Popup ─── */
function ExplorePopup() {
  const lastExploreGain = useGameStore(s => s.lastExploreGain);
  if (!lastExploreGain) return null;

  return (
    <div style={{
      position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
      fontSize: 32, fontWeight: 700, color: '#4aff4a',
      textShadow: '0 0 20px rgba(74,255,74,0.6), 0 2px 10px rgba(0,0,0,0.8)',
      fontFamily: FONT, pointerEvents: 'none', zIndex: 150,
      animation: 'exploreFloat 1.5s ease-out forwards',
    }}>
      +{lastExploreGain} pts
      <div style={{ fontSize: 14, color: '#88ff88', textAlign: 'center', marginTop: 4 }}>
        New territory explored!
      </div>
    </div>
  );
}

/* ─── Bottom Action Bar — Polytopia style ─── */
function ActionBar() {
  const openMenu = useGameStore(s => s.openMenu);
  const setOpenMenu = useGameStore(s => s.setOpenMenu);
  const endTurn = useGameStore(s => s.endTurn);
  const toggleTechTree = useGameStore(s => s.toggleTechTree);
  const players = useGameStore(s => s.players);
  const gameState = useGameStore(s => s.gameState);
  const currentPlayer = useGameStore(s => s.currentPlayer);

  const standings = players
    .map((_, i) => ({ i, score: gameState.computeScore(i) }))
    .sort((a, b) => b.score - a.score);
  const rank = Math.max(1, standings.findIndex((s) => s.i === currentPlayer) + 1);

  const BarBtn = ({ icon, label, active, onClick, highlight = false, badge = null }) => (
    <div
      onClick={onClick}
      style={{
        width: highlight ? 114 : 98, height: highlight ? 114 : 98,
        borderRadius: '50%',
        background: highlight
          ? 'rgba(0,0,0,0.72)'
          : active ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.58)',
        border: highlight
          ? '5px solid rgba(255,255,255,0.96)'
          : '4px solid rgba(255,255,255,0.92)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: '#f0f0f0', fontSize: highlight ? 56 : 42,
        boxShadow: active ? '0 0 24px rgba(255,255,255,0.2)' : '0 10px 20px rgba(0,0,0,0.35)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        fontFamily: LABEL_FONT,
        position: 'relative',
      }}
      title={label}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <span style={{ lineHeight: 1 }}>{icon}</span>
      {badge ? (
        <div style={{
          position: 'absolute',
          top: -8,
          right: -4,
          fontSize: 20,
          fontWeight: 700,
          background: '#0b8ee8',
          color: '#ffffff',
          borderRadius: 8,
          padding: '0 9px 2px',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.45)',
        }}>
          {badge}
        </div>
      ) : null}
      <span style={{
        position: 'absolute',
        bottom: -42,
        fontSize: 17,
        fontFamily: LABEL_FONT,
        fontStyle: 'italic',
        color: '#e8e8e8',
        textShadow: '0 2px 8px rgba(0,0,0,0.85)',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{
      position: 'absolute', bottom: 22, left: 0, right: 0, height: 140,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26,
      fontFamily: FONT, pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30, pointerEvents: 'auto' }}>
        <BarBtn
          icon="☰"
          label="Settings"
          active={openMenu === 'settings'}
          onClick={() => setOpenMenu('settings')}
        />

        <BarBtn
          icon="◎"
          label="Game Stats"
          active={openMenu === 'stats'}
          onClick={() => setOpenMenu('stats')}
          badge={ordinal(rank)}
        />

        <BarBtn
          icon="✦"
          label="Tech Tree"
          onClick={toggleTechTree}
        />

        <BarBtn icon="✓" label="End Turn" onClick={endTurn} highlight />
      </div>
    </div>
  );
}

/* ─── Turn flash overlay ─── */
function TurnOverlay() {
  const turnFlash = useGameStore(s => s.turnFlash);
  if (turnFlash === null) return null;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      justifyContent: 'center', alignItems: 'center',
      fontSize: 36, fontWeight: 700,
      color: colorToCSS(PLAYER_COLORS[turnFlash]),
      zIndex: 200, pointerEvents: 'none', fontFamily: FONT,
    }}>
      Player {turnFlash + 1}'s Turn
    </div>
  );
}

/* ─── Game Over ─── */
function GameOverOverlay() {
  const gameOver = useGameStore(s => s.gameOver);
  const winner = useGameStore(s => s.winner);
  const newGame = useGameStore(s => s.newGame);
  if (!gameOver) return null;

  const winnerColor = colorToCSS(PLAYER_COLORS[winner]);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.88)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
      zIndex: 300, fontFamily: FONT,
    }}>
      <h2 style={{ fontSize: 44, color: winnerColor, marginBottom: 16 }}>
        Player {winner + 1} Wins!
      </h2>
      <div
        onClick={() => newGame()}
        style={{
          marginTop: 16, padding: '14px 40px', fontSize: 20, fontWeight: 600,
          color: '#fff', background: 'rgba(80,160,255,0.4)',
          border: '2px solid rgba(80,160,255,0.7)', borderRadius: 12,
          cursor: 'pointer',
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(80,160,255,0.6)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(80,160,255,0.4)'}
      >
        New Game
      </div>
    </div>
  );
}

/* ─── Notification Toasts ─── */
const NOTIF_COLORS = {
  combat: '#ff4444',
  diplomacy: '#4488ff',
  discovery: '#ffd700',
  capture: '#ff8800',
  info: '#ffffff',
};

function NotificationToasts() {
  const notifications = useGameStore(s => s.notifications);
  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 120, right: 20,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 180, pointerEvents: 'none', maxWidth: 340,
    }}>
      {notifications.map((n) => {
        const color = NOTIF_COLORS[n.type] || '#ffffff';
        const age = Date.now() - n.timestamp;
        const isFading = age > 2400;
        return (
          <div key={n.id} style={{
            background: 'rgba(10,10,25,0.92)',
            border: `1px solid ${color}55`,
            borderLeft: `4px solid ${color}`,
            borderRadius: 8,
            padding: '10px 16px',
            color: '#e0e0e0',
            fontSize: 14,
            fontFamily: FONT,
            boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 8px ${color}22`,
            animation: isFading ? 'toastFadeOut 0.6s ease-out forwards' : 'toastSlideIn 0.3s ease-out',
          }}>
            {n.message}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Root HUD ─── */
export default function HUD() {
  return (
    <>
      <TopBar />
      <PlayerBadge />
      <TileInfoPanel />
      <UnitPanel />
      <GameLog />
      <TileActionPopup />
      <ActionBar />
      <TrainMenu />
      <CityUpgradeModal />
      <TechTreeModal />
      <GameStatsPanel />
      <DiplomacyModal />
      <NotificationToasts />
      <ExplorePopup />
      <TurnOverlay />
      <GameOverOverlay />
    </>
  );
}
