import { useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SpectatorScene from './components/SpectatorScene.jsx';
import SpectatorHUD from './components/SpectatorHUD.jsx';
import { useSpectatorStore } from './store/spectatorStore.js';

export default function SpectatorApp({ matchId, apiToken, supabaseUrl, anonKey }) {
  const startPolling = useSpectatorStore(s => s.startPolling);
  const stopPolling = useSpectatorStore(s => s.stopPolling);

  useEffect(() => {
    if (!matchId || !apiToken || !supabaseUrl || !anonKey) return;
    startPolling(matchId, apiToken, supabaseUrl, anonKey, 2000);
    return () => stopPolling();
  }, [matchId, apiToken, supabaseUrl, anonKey, startPolling, stopPolling]);

  if (!matchId || !apiToken) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#050510',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace', color: '#666', fontSize: 14,
      }}>
        Missing match_id or api_token in URL hash params
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(circle at 50% -20%, #22314f 0%, #080b16 38%, #020206 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(1px 1px at 12% 24%, rgba(255,255,255,0.82), transparent), radial-gradient(1px 1px at 42% 78%, rgba(255,255,255,0.75), transparent), radial-gradient(1.5px 1.5px at 70% 34%, rgba(255,255,255,0.9), transparent), radial-gradient(1.2px 1.2px at 86% 62%, rgba(255,255,255,0.65), transparent), radial-gradient(1px 1px at 25% 58%, rgba(255,255,255,0.55), transparent)',
        opacity: 0.5,
        pointerEvents: 'none',
      }} />
      <Canvas
        shadows
        camera={{ position: [8, 12, 14], fov: 50, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          toneMapping: 4,
          toneMappingExposure: 1.2,
        }}
      >
        <color attach="background" args={['#050510']} />
        <Suspense fallback={null}>
          <SpectatorScene />
        </Suspense>
        <OrbitControls
          target={[0, 0, 0]}
          enablePan
          enableZoom
          enableRotate
          minDistance={6}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={0.3}
          mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
          panSpeed={1.5}
          zoomSpeed={0.8}
        />
      </Canvas>
      <SpectatorHUD />
    </div>
  );
}
