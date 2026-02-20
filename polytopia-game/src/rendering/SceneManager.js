import * as THREE from 'three';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 35);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(8, 12, 14);
    this.camera.lookAt(5.5, 0, 5.5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.body.appendChild(this.renderer.domElement);

    // Lights
    this.setupLighting();

    // Raycaster for picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Camera control state
    this.cameraTarget = new THREE.Vector3(5.5, 0, 5.5);
    this.cameraAngle = Math.PI / 4;
    this.cameraDistance = 16;
    this.cameraPitch = 0.8;
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };

    this.setupControls();
    this.setupResize();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(10, 15, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8ecae6, 0.3);
    fill.position.set(-5, 5, -5);
    this.scene.add(fill);
  }

  setupControls() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2 || e.button === 1) {
        this.isDragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      // Update mouse for raycasting
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.isDragging) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.cameraAngle -= dx * 0.005;
        this.cameraPitch = Math.max(0.3, Math.min(1.4, this.cameraPitch + dy * 0.005));
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mouseup', () => { this.isDragging = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('wheel', (e) => {
      this.cameraDistance = Math.max(6, Math.min(30, this.cameraDistance + e.deltaY * 0.01));
    });

    // Keyboard pan
    this.keys = {};
    window.addEventListener('keydown', (e) => { this.keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
  }

  setupResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  updateCamera() {
    // Keyboard panning
    const panSpeed = 0.15;
    const forward = new THREE.Vector3(-Math.sin(this.cameraAngle), 0, -Math.cos(this.cameraAngle));
    const right = new THREE.Vector3(Math.cos(this.cameraAngle), 0, -Math.sin(this.cameraAngle));

    if (this.keys['w'] || this.keys['ArrowUp']) this.cameraTarget.add(forward.clone().multiplyScalar(panSpeed));
    if (this.keys['s'] || this.keys['ArrowDown']) this.cameraTarget.add(forward.clone().multiplyScalar(-panSpeed));
    if (this.keys['a'] || this.keys['ArrowLeft']) this.cameraTarget.add(right.clone().multiplyScalar(-panSpeed));
    if (this.keys['d'] || this.keys['ArrowRight']) this.cameraTarget.add(right.clone().multiplyScalar(panSpeed));

    // Position camera on orbit
    this.camera.position.x = this.cameraTarget.x + Math.sin(this.cameraAngle) * Math.cos(this.cameraPitch) * this.cameraDistance;
    this.camera.position.y = this.cameraTarget.y + Math.sin(this.cameraPitch) * this.cameraDistance;
    this.camera.position.z = this.cameraTarget.z + Math.cos(this.cameraAngle) * Math.cos(this.cameraPitch) * this.cameraDistance;
    this.camera.lookAt(this.cameraTarget);
  }

  render() {
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  raycast(meshes) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(meshes, false);
  }
}
