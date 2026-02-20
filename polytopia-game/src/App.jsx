import { useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GameScene from './components/GameScene.jsx';
import HUD from './components/HUD.jsx';
import { useGameStore } from './store/gameStore.js';

export default function App() {
  const endTurn = useGameStore(s => s.endTurn);
  const deselect = useGameStore(s => s.deselect);
  const toggleTechTree = useGameStore(s => s.toggleTechTree);
  const gameOver = useGameStore(s => s.gameOver);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver) return;
      if (e.code === 'Space') {
        e.preventDefault();
        endTurn();
      }
      if (e.code === 'Escape') {
        deselect();
      }
      if (e.code === 'KeyT') {
        toggleTechTree();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [endTurn, deselect, toggleTechTree, gameOver]);

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
        camera={{ position: [10, 16, 18], fov: 50, near: 0.1, far: 150 }}
        gl={{
          antialias: true,
          toneMapping: 4, // ACESFilmicToneMapping
          toneMappingExposure: 1.2,
        }}
        onPointerMissed={() => deselect()}
      >
        <color attach="background" args={['#050510']} />
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
        <OrbitControls
          target={[0, 0, 0]}
          enablePan
          enableZoom
          enableRotate
          minDistance={6}
          maxDistance={45}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={0.3}
          mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
          panSpeed={1.5}
          zoomSpeed={0.8}
        />
      </Canvas>
      <HUD />
    </div>
  );
}
