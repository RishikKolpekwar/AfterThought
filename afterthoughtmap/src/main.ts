import { GridCaseViewer } from './gridcase-viewer.js';

const viewer = new GridCaseViewer(document.getElementById('app'), {
  webSceneId: 'b0c573e17aef4a4c86d42a1907c4e2fa',
  camera: {
    position: [
      -97.7431, // longitude
      30.2550,  // latitude (south of downtown looking north)
      800       // elevation in meters
    ],
    heading: 0,
    tilt: 70
  }
});

viewer.initialize().catch((err) => {
  console.error('GridCaseViewer failed to initialize:', err);
});

// Expose for console debugging
(window as any).viewer = viewer;
