import { Suspense } from 'react';
import Viewport3D from './components/Viewport3D';
import RightPanel from './components/RightPanel';
import TimelineBar from './components/TimelineBar';
import TopMetrics from './components/TopMetrics';
import EventLogDrawer from './components/EventLogDrawer';
import ComparePanel from './components/ComparePanel';
import ExportModal from './components/ExportModal';

function LoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#475569',
        fontSize: 14,
      }}
    >
      Loading 3D viewport…
    </div>
  );
}

export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#0a0f1e',
      }}
    >
      {/* Top metrics bar */}
      <header
        style={{
          height: 64,
          flexShrink: 0,
          background: '#0d1424',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <TopMetrics />
      </header>

      {/* Main content area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* 3D viewport + overlays */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Suspense fallback={<LoadingFallback />}>
            <Viewport3D />
          </Suspense>
          <EventLogDrawer />
        </div>

        {/* Right control panel */}
        <RightPanel />
      </main>

      {/* Timeline bar */}
      <footer
        style={{
          height: 72,
          flexShrink: 0,
          background: '#0d1424',
          borderTop: '1px solid #1e293b',
        }}
      >
        <TimelineBar />
      </footer>

      {/* Overlays / modals */}
      <ComparePanel />
      <ExportModal />
    </div>
  );
}
