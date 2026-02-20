import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { usePlanStore } from '../stores/planStore';

export default function TimelineBar() {
  const {
    currentResult,
    timelinePosition,
    setTimelinePosition,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    status,
    visibleEvents,
  } = useSimulationStore();

  const selectedScenario = usePlanStore((s) => s.selectedScenario());
  const duration = currentResult
    ? currentResult.eventLog.length > 0
      ? (selectedScenario?.durationHours ?? 96)
      : 0
    : selectedScenario?.durationHours ?? 96;

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || status !== 'done') return;

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const dt = (now - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = now;

      const currentPos = useSimulationStore.getState().timelinePosition;
      const next = currentPos + dt * playbackSpeed * 2; // 2 sim-hours per real second at 1x
      if (next >= duration) {
        setTimelinePosition(duration);
        setIsPlaying(false);
        return;
      }
      setTimelinePosition(next);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, [isPlaying, playbackSpeed, duration, status]);

  const events = currentResult ? visibleEvents(selectedScenario ?? {} as never) : [];
  const lastEvent = events[events.length - 1];

  const pct = duration > 0 ? (timelinePosition / duration) * 100 : 0;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 20px',
        gap: 6,
      }}
    >
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          disabled={status !== 'done'}
          onClick={() => {
            if (timelinePosition >= duration) setTimelinePosition(0);
            setIsPlaying(!isPlaying);
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: status === 'done' ? '#3b82f6' : '#1e293b',
            color: '#fff',
            fontSize: 14,
            cursor: status === 'done' ? 'pointer' : 'default',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          disabled={status !== 'done'}
          onClick={() => { setIsPlaying(false); setTimelinePosition(0); }}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: '#1e293b',
            color: '#94a3b8',
            fontSize: 12,
            cursor: status === 'done' ? 'pointer' : 'default',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ⏮
        </button>

        {/* Speed */}
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => setPlaybackSpeed(s)}
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              border: 'none',
              background: playbackSpeed === s ? '#1d4ed8' : '#1e293b',
              color: playbackSpeed === s ? '#fff' : '#64748b',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {s}×
          </button>
        ))}

        <span
          style={{
            fontSize: 11,
            color: '#64748b',
            minWidth: 100,
            flexShrink: 0,
          }}
        >
          T+{Math.floor(timelinePosition)}h / {duration}h
        </span>

        {/* Latest event */}
        {lastEvent && (
          <span
            style={{
              fontSize: 11,
              color:
                lastEvent.severity === 'critical'
                  ? '#ef4444'
                  : lastEvent.severity === 'warning'
                  ? '#f97316'
                  : '#94a3b8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 280,
            }}
          >
            {lastEvent.severity === 'critical' ? '🔴' : lastEvent.severity === 'warning' ? '🟡' : 'ℹ️'}{' '}
            {lastEvent.message}
          </span>
        )}
      </div>

      {/* Scrubber */}
      <div style={{ position: 'relative', height: 14 }}>
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: 0,
            right: 0,
            height: 4,
            background: '#1e293b',
            borderRadius: 2,
          }}
        />
        {/* Filled track */}
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: 0,
            width: `${pct}%`,
            height: 4,
            background: '#3b82f6',
            borderRadius: 2,
            transition: 'width 0.05s linear',
          }}
        />

        {/* Event markers */}
        {currentResult?.eventLog
          .filter((e) => e.severity === 'critical')
          .slice(0, 50)
          .map((e, i) => (
            <div
              key={i}
              title={e.message}
              style={{
                position: 'absolute',
                top: 3,
                left: `${(e.timestep / duration) * 100}%`,
                width: 2,
                height: 8,
                background: '#ef4444',
                borderRadius: 1,
                transform: 'translateX(-1px)',
                cursor: 'pointer',
              }}
              onClick={() => setTimelinePosition(e.timestep)}
            />
          ))}

        {/* Thumb */}
        <input
          type="range"
          min={0}
          max={duration}
          step={0.5}
          value={timelinePosition}
          onChange={(e) => {
            setIsPlaying(false);
            setTimelinePosition(Number(e.target.value));
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
      </div>
    </div>
  );
}
