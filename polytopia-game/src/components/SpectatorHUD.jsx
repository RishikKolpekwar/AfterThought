import { useState, useCallback, useRef } from 'react';
import { useSpectatorStore } from '../store/spectatorStore.js';
import { PLAYER_COLORS, TECHS } from '../core/constants.js';

const FONT = "'Trebuchet MS', 'Avenir Next', 'Gill Sans', sans-serif";
const LABEL_FONT = "'Trebuchet MS', 'Gill Sans', sans-serif";

const playerColorHex = (idx) => {
  const c = PLAYER_COLORS[idx] || 0xffffff;
  return '#' + c.toString(16).padStart(6, '0');
};

const PERSPECTIVES = ['all', 0, 1];
const PERSPECTIVE_LABELS = { all: 'All', 0: 'Player 1', 1: 'Player 2' };

/* ─── Tech Tree Layout (same as HUD.jsx) ─── */
const TECH_TREE_LAYOUT = {
  climbing:     { angle: 225, dist: 1 },
  fishing:      { angle: 280, dist: 1 },
  hunting:      { angle: 150, dist: 1 },
  organization: { angle: 330, dist: 1 },
  riding:       { angle: 30, dist: 1 },
  archery:      { angle: 70, dist: 1.25 },
  shields:      { angle: 230, dist: 2 },
  mining:       { angle: 170, dist: 2 },
  roads:        { angle: 10, dist: 2 },
  smithing:     { angle: 200, dist: 3 },
  mathematics:  { angle: 350, dist: 3 },
  chivalry:     { angle: 50, dist: 3.5 },
  navigation:   { angle: 110, dist: 4.5 },
  construction: { angle: 320, dist: 3.5 },
};

const TECH_CONNECTIONS = [
  ['climbing', 'shields'],
  ['fishing', 'shields'],
  ['hunting', 'mining'],
  ['organization', 'mining'],
  ['riding', 'roads'],
  ['archery', 'roads'],
  ['shields', 'smithing'],
  ['mining', 'smithing'],
  ['mining', 'mathematics'],
  ['roads', 'mathematics'],
  ['smithing', 'chivalry'],
  ['riding', 'chivalry'],
  ['fishing', 'navigation'],
  ['smithing', 'navigation'],
  ['mathematics', 'construction'],
];

/* ─── Spectator Tech Tree Modal ─── */
function SpectatorTechTree({ onClose, p0Techs, p1Techs }) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
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

  const p0Set = new Set(p0Techs);
  const p1Set = new Set(p1Techs);

  const centerX = 480;
  const centerY = 400;
  const ringSpacing = 130;
  const nodeR = 48;
  const svgW = 960;
  const svgH = 1100;

  const getNodePos = (key) => {
    const layout = TECH_TREE_LAYOUT[key];
    if (!layout) return { x: centerX, y: centerY };
    const rad = (layout.angle * Math.PI) / 180;
    return {
      x: centerX + Math.cos(rad) * layout.dist * ringSpacing,
      y: centerY + Math.sin(rad) * layout.dist * ringSpacing,
    };
  };

  const p0Color = playerColorHex(0);
  const p1Color = playerColorHex(1);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
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
            left: `${(i * 37 + 13) % 100}%`,
            top: `${(i * 53 + 7) % 100}%`,
            width: i % 3 === 0 ? 2 : 1,
            height: i % 3 === 0 ? 2 : 1,
            background: '#fff',
            borderRadius: '50%',
            opacity: 0.3 + (i % 5) * 0.1,
          }} />
        ))}
      </div>

      {/* Back button */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, left: 24,
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 24, color: '#fff', zIndex: 10, pointerEvents: 'auto',
        }}
      >
        &#8249;
      </div>

      {/* Title */}
      <div style={{ marginTop: 18, zIndex: 5, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>
          Tech Tree
        </div>
        <div style={{ display: 'flex', gap: 30, marginTop: 10, justifyContent: 'center', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: p0Color, border: '2px solid rgba(255,255,255,0.3)' }} />
            <span style={{ color: p0Color, fontWeight: 600 }}>P1 ({p0Techs.length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: p1Color, border: '2px solid rgba(255,255,255,0.3)' }} />
            <span style={{ color: p1Color, fontWeight: 600 }}>P2 ({p1Techs.length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg, ' + p0Color + ' 50%, ' + p1Color + ' 50%)', border: '2px solid rgba(255,255,255,0.3)' }} />
            <span style={{ color: '#ccc', fontWeight: 600 }}>Both</span>
          </div>
        </div>
      </div>

      {/* Tech Tree — draggable + zoomable */}
      <div
        style={{
          position: 'relative', width: svgW, height: svgH, marginTop: 10,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center top',
          cursor: dragRef.current.dragging ? 'grabbing' : 'grab',
          transition: dragRef.current.dragging ? 'none' : 'transform 0.1s ease-out',
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDown}
      >
        <svg width={svgW} height={svgH} style={{ position: 'absolute', top: 0, left: 0 }}>
          {TECH_CONNECTIONS.map(([from, to], i) => {
            const a = getNodePos(from);
            const b = getNodePos(to);
            const bothP0 = p0Set.has(from) && p0Set.has(to);
            const bothP1 = p1Set.has(from) && p1Set.has(to);
            const anyResearched = p0Set.has(from) || p0Set.has(to) || p1Set.has(from) || p1Set.has(to);

            let stroke, strokeW;
            if (bothP0 && bothP1) {
              stroke = '#aaa'; strokeW = 3;
            } else if (bothP0) {
              stroke = p0Color; strokeW = 3;
            } else if (bothP1) {
              stroke = p1Color; strokeW = 3;
            } else if (anyResearched) {
              stroke = 'rgba(255,255,255,0.25)'; strokeW = 2;
            } else {
              stroke = 'rgba(255,255,255,0.1)'; strokeW = 1.5;
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
          const hasP0 = p0Set.has(key);
          const hasP1 = p1Set.has(key);
          const hasBoth = hasP0 && hasP1;
          const hasEither = hasP0 || hasP1;

          let bg, borderColor, textColor, opac, shadow;
          if (hasBoth) {
            // Both players: split gradient
            bg = `linear-gradient(135deg, ${p0Color} 0%, ${p0Color} 45%, ${p1Color} 55%, ${p1Color} 100%)`;
            borderColor = '#fff';
            textColor = '#fff';
            opac = 1;
            shadow = '0 0 20px rgba(255,255,255,0.3), inset 0 -4px 12px rgba(0,0,0,0.3)';
          } else if (hasP0) {
            bg = `radial-gradient(circle at 30% 25%, ${p0Color}cc 0%, ${p0Color}88 60%, ${p0Color}44 100%)`;
            borderColor = p0Color;
            textColor = '#fff';
            opac = 1;
            shadow = `0 0 18px ${p0Color}66, inset 0 -4px 12px rgba(0,0,0,0.3)`;
          } else if (hasP1) {
            bg = `radial-gradient(circle at 30% 25%, ${p1Color}cc 0%, ${p1Color}88 60%, ${p1Color}44 100%)`;
            borderColor = p1Color;
            textColor = '#fff';
            opac = 1;
            shadow = `0 0 18px ${p1Color}66, inset 0 -4px 12px rgba(0,0,0,0.3)`;
          } else {
            bg = 'radial-gradient(circle at 30% 25%, #333 0%, #222 40%, #111 100%)';
            borderColor = '#555';
            textColor = '#777';
            opac = 0.7;
            shadow = 'none';
          }

          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                left: pos.x - nodeR, top: pos.y - nodeR,
                width: nodeR * 2, height: nodeR * 2,
                borderRadius: '50%',
                background: bg,
                border: `3px solid ${borderColor}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                opacity: opac, transition: 'all 0.25s ease',
                color: textColor, zIndex: 3,
                boxShadow: shadow,
              }}
            >
              {hasEither && (
                <div style={{
                  position: 'absolute', top: 4, left: '18%', right: '18%', height: '35%',
                  borderRadius: '50%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)',
                  pointerEvents: 'none',
                }} />
              )}
              <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.15, zIndex: 1 }}>
                {tech.name}
              </div>
              {!hasEither && (
                <div style={{ fontSize: 10, color: '#ffd700', marginTop: 3, fontWeight: 600, zIndex: 1 }}>
                  {tech.cost}&#9733;
                </div>
              )}
              {hasEither && (
                <div style={{ fontSize: 12, marginTop: 2, zIndex: 1 }}>&#10003;</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Spectator HUD ─── */
export default function SpectatorHUD() {
  const turn = useSpectatorStore(s => s.turn);
  const currentPlayer = useSpectatorStore(s => s.currentPlayer);
  const players = useSpectatorStore(s => s.players);
  const gameOver = useSpectatorStore(s => s.gameOver);
  const winner = useSpectatorStore(s => s.winner);
  const loading = useSpectatorStore(s => s.loading);
  const error = useSpectatorStore(s => s.error);
  const connected = useSpectatorStore(s => s.connected);
  const scores = useSpectatorStore(s => s.scores);
  const stakeAmount = useSpectatorStore(s => s.stakeAmount);
  const maxTurns = useSpectatorStore(s => s.maxTurns);
  const matchId = useSpectatorStore(s => s.matchId);
  const spectatingAs = useSpectatorStore(s => s.spectatingAs);
  const yourPlayerIndex = useSpectatorStore(s => s.yourPlayerIndex);
  const setPerspective = useSpectatorStore(s => s.setPerspective);

  const [techTreeOpen, setTechTreeOpen] = useState(false);

  if (loading && !connected) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', fontFamily: FONT,
      }}>
        <div style={{ color: '#fff', fontSize: 14, opacity: 0.5 }}>
          {error ? `Error: ${error}` : 'Connecting to match...'}
        </div>
      </div>
    );
  }

  const p0 = players[0] || {};
  const p1 = players[1] || {};
  const p0Score = scores?.[0] ?? 0;
  const p1Score = scores?.[1] ?? 0;

  const currentIdx = PERSPECTIVES.indexOf(spectatingAs);
  const cyclePerspective = (dir) => {
    const next = (currentIdx + dir + PERSPECTIVES.length) % PERSPECTIVES.length;
    setPerspective(PERSPECTIVES[next]);
  };

  const arrowBtn = {
    pointerEvents: 'auto',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 18,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'background 0.15s',
  };

  const youLabel = (idx) =>
    yourPlayerIndex === idx ? (
      <span style={{ color: '#67d18a', fontSize: 11, fontWeight: 400, marginLeft: 6 }}>(You)</span>
    ) : null;

  if (techTreeOpen) {
    return (
      <SpectatorTechTree
        onClose={() => setTechTreeOpen(false)}
        p0Techs={p0.technologies || []}
        p1Techs={p1.technologies || []}
      />
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', fontFamily: FONT, zIndex: 10 }}>
      {/* Top bar: P1 Score | Turn | P2 Score */}
      <div style={{
        position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'flex-start', gap: 34,
        textShadow: '0 2px 8px rgba(0,0,0,0.75)',
      }}>
        <div style={{ minWidth: 132, textAlign: 'center' }}>
          <div style={{ color: '#d2d2d2', fontFamily: LABEL_FONT, fontSize: 16, fontStyle: 'italic' }}>P1 Score</div>
          <div style={{ color: playerColorHex(0), fontSize: 46, lineHeight: 1, fontWeight: 600 }}>{p0Score}</div>
        </div>

        <div style={{ minWidth: 140, textAlign: 'center' }}>
          <div style={{ color: '#d2d2d2', fontFamily: LABEL_FONT, fontSize: 16, fontStyle: 'italic' }}>Turn</div>
          <div style={{ color: '#ffffff', fontSize: 46, lineHeight: 1, fontWeight: 600 }}>{turn}<span style={{ fontSize: 22, color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>/{maxTurns}</span></div>
        </div>

        <div style={{ minWidth: 132, textAlign: 'center' }}>
          <div style={{ color: '#d2d2d2', fontFamily: LABEL_FONT, fontSize: 16, fontStyle: 'italic' }}>P2 Score</div>
          <div style={{ color: playerColorHex(1), fontSize: 46, lineHeight: 1, fontWeight: 600 }}>{p1Score}</div>
        </div>
      </div>

      {/* Top left: Perspective toggle */}
      <div style={{
        position: 'absolute', top: 18, left: 18,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div
          style={arrowBtn}
          onClick={() => cyclePerspective(-1)}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >&#9664;</div>
        <div style={{
          padding: '6px 14px',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.58)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: spectatingAs === 'all' ? '#fff' : playerColorHex(spectatingAs),
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.5,
          minWidth: 100,
          textAlign: 'center',
          textTransform: 'uppercase',
        }}>
          Spectating: {PERSPECTIVE_LABELS[spectatingAs]}
          {spectatingAs !== 'all' && youLabel(spectatingAs)}
        </div>
        <div
          style={arrowBtn}
          onClick={() => cyclePerspective(1)}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >&#9654;</div>
      </div>

      {/* Top right: status + match ID */}
      <div style={{ position: 'absolute', top: 18, right: 18, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div style={{
          padding: '8px 14px',
          borderRadius: 999,
          background: 'rgba(0,0,0,0.58)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: gameOver ? '#bdbdbd' : connected ? '#67d18a' : '#ff8f8f',
          fontSize: 13,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}>
          {gameOver ? 'Finished' : connected ? 'Live' : 'Reconnecting'}
        </div>
        {stakeAmount > 0 && (
          <div style={{
            padding: '6px 14px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, rgba(255,170,0,0.25) 0%, rgba(255,215,0,0.15) 100%)',
            border: '1px solid rgba(255,215,0,0.4)',
            color: '#ffd700',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}>
            {stakeAmount} SOL
          </div>
        )}
        {matchId && (
          <div style={{
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 10,
            fontFamily: 'monospace',
            letterSpacing: 0.3,
          }}>
            {matchId}
          </div>
        )}
      </div>

      {/* Bottom left: Player 1 stats */}
      <div style={{
        position: 'absolute', bottom: 24, left: 20,
        background: 'rgba(0,0,0,0.6)',
        border: `2px solid ${currentPlayer === 0 && !gameOver ? playerColorHex(0) : 'rgba(255,255,255,0.35)'}`,
        borderRadius: 18,
        padding: '12px 16px', minWidth: 206,
        boxShadow: '0 12px 26px rgba(0,0,0,0.35)',
      }}>
        <div style={{ fontSize: 14, color: playerColorHex(0), fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Player 1 {currentPlayer === 0 && !gameOver ? '(Active)' : ''}{youLabel(0)}
        </div>
        <div style={{ fontSize: 12, color: '#d8d8d8' }}>
          Cities: {p0.cities ?? 0} | Units: {p0.units ?? 0}
        </div>
        <div style={{ fontSize: 12, color: '#FFC700', marginTop: 2 }}>
          Stars: {p0.stars ?? 0} (+{p0.starsPerTurn ?? 0}/turn)
        </div>
        <div
          onClick={() => setTechTreeOpen(true)}
          style={{
            fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4,
            cursor: 'pointer', pointerEvents: 'auto',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#67d18a'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          Techs: {p0.technologies?.length ?? 0} &#9656;
        </div>
      </div>

      {/* Bottom right: Player 2 stats */}
      <div style={{
        position: 'absolute', bottom: 24, right: 20,
        background: 'rgba(0,0,0,0.6)',
        border: `2px solid ${currentPlayer === 1 && !gameOver ? playerColorHex(1) : 'rgba(255,255,255,0.35)'}`,
        borderRadius: 18,
        padding: '12px 16px', minWidth: 206,
        boxShadow: '0 12px 26px rgba(0,0,0,0.35)',
      }}>
        <div style={{ fontSize: 14, color: playerColorHex(1), fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Player 2 {currentPlayer === 1 && !gameOver ? '(Active)' : ''}{youLabel(1)}
        </div>
        <div style={{ fontSize: 12, color: '#d8d8d8' }}>
          Cities: {p1.cities ?? 0} | Units: {p1.units ?? 0}
        </div>
        <div style={{ fontSize: 12, color: '#FFC700', marginTop: 2 }}>
          Stars: {p1.stars ?? 0} (+{p1.starsPerTurn ?? 0}/turn)
        </div>
        <div
          onClick={() => setTechTreeOpen(true)}
          style={{
            fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4,
            cursor: 'pointer', pointerEvents: 'auto',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#67d18a'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          Techs: {p1.technologies?.length ?? 0} &#9656;
        </div>
      </div>

      {/* Winner banner */}
      {gameOver && winner >= 0 ? (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: 28,
          transform: 'translateX(-50%)',
          fontSize: 26,
          fontWeight: 700,
          color: playerColorHex(winner),
          textShadow: '0 2px 14px rgba(0,0,0,0.8)',
        }}>
          Player {winner + 1} Wins
        </div>
      ) : null}
    </div>
  );
}
