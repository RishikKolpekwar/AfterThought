import * as THREE from 'three';
import {
  TILE_SPACING,
  TERRAIN,
  TERRAIN_COLORS,
  TERRAIN_HEIGHTS,
  PLAYER_COLORS,
} from '../core/constants.js';

export class MapRenderer {
  constructor(scene) {
    this.scene = scene;
    this.tileGroup = new THREE.Group();
    this.overlayGroup = new THREE.Group();
    this.unitGroup = new THREE.Group();
    this.tileMeshes = [];
    this.unitMeshes = [];
    this.overlayMeshes = [];
    this.scene.add(this.tileGroup);
    this.scene.add(this.overlayGroup);
    this.scene.add(this.unitGroup);

    this.highlightMesh = null;
    this.selectMesh = null;
    this.mapOffset = 0;
  }

  buildMap(gameState) {
    while (this.tileGroup.children.length) this.tileGroup.remove(this.tileGroup.children[0]);
    this.tileMeshes = [];
    this.mapOffset = (gameState.mapSize * TILE_SPACING) / 2;

    for (const tile of gameState.tiles) {
      this.createTileMesh(tile);
    }

    this.updateUnits(gameState);
  }

  worldPos(tileX, tileZ) {
    return {
      x: tileX * TILE_SPACING - this.mapOffset + TILE_SPACING / 2,
      z: tileZ * TILE_SPACING - this.mapOffset + TILE_SPACING / 2,
    };
  }

  createTileMesh(tile) {
    const height = TERRAIN_HEIGHTS[tile.terrain];
    const color = TERRAIN_COLORS[tile.terrain];
    const geo = new THREE.BoxGeometry(TILE_SPACING - 0.04, height, TILE_SPACING - 0.04);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    const pos = this.worldPos(tile.x, tile.z);
    mesh.position.set(pos.x, height / 2, pos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { tileX: tile.x, tileZ: tile.z };
    this.tileGroup.add(mesh);
    this.tileMeshes.push(mesh);

    // Territory border
    if (tile.owner >= 0) {
      const bGeo = new THREE.BoxGeometry(TILE_SPACING - 0.02, 0.02, TILE_SPACING - 0.02);
      const bMat = new THREE.MeshStandardMaterial({
        color: PLAYER_COLORS[tile.owner], transparent: true, opacity: 0.35, roughness: 0.5,
      });
      const border = new THREE.Mesh(bGeo, bMat);
      border.position.set(pos.x, height + 0.01, pos.z);
      this.tileGroup.add(border);
    }

    // Decorations
    if (tile.terrain === TERRAIN.FOREST) this.addTree(pos.x, height, pos.z);
    else if (tile.terrain === TERRAIN.MOUNTAIN) this.addMountainPeak(pos.x, height, pos.z);
    else if (tile.terrain === TERRAIN.CITY) this.addCityMarker(pos.x, height, pos.z, tile.owner);
    else if (tile.terrain === TERRAIN.VILLAGE) this.addVillageMarker(pos.x, height, pos.z);

    if (tile.resource) this.addResourceMarker(pos.x, height, pos.z, tile.resource);
  }

  addTree(x, h, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.3, 6),
      new THREE.MeshStandardMaterial({ color: 0x5c3d1e })
    );
    trunk.position.set(x, h + 0.15, z);
    trunk.castShadow = true;
    this.tileGroup.add(trunk);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.4, 5),
      new THREE.MeshStandardMaterial({ color: 0x2d6a1e })
    );
    canopy.position.set(x, h + 0.45, z);
    canopy.castShadow = true;
    this.tileGroup.add(canopy);
  }

  addMountainPeak(x, h, z) {
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.5, 5),
      new THREE.MeshStandardMaterial({ color: 0xa0a0a0, roughness: 0.9 })
    );
    peak.position.set(x, h + 0.25, z);
    peak.castShadow = true;
    this.tileGroup.add(peak);

    const snow = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.15, 5),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    snow.position.set(x, h + 0.55, z);
    this.tileGroup.add(snow);
  }

  addCityMarker(x, h, z, owner) {
    const color = owner >= 0 ? PLAYER_COLORS[owner] : 0xcccccc;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.35, 0.3),
      new THREE.MeshStandardMaterial({ color })
    );
    building.position.set(x, h + 0.175, z);
    building.castShadow = true;
    this.tileGroup.add(building);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.2, 4),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    roof.position.set(x, h + 0.45, z);
    roof.rotation.y = Math.PI / 4;
    this.tileGroup.add(roof);
  }

  addVillageMarker(x, h, z) {
    const hut = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.15, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xb8860b })
    );
    hut.position.set(x, h + 0.075, z);
    hut.castShadow = true;
    this.tileGroup.add(hut);
  }

  addResourceMarker(x, h, z, resource) {
    const colors = {
      fruit: 0xff6b6b, animal: 0xd4a373, fish: 0x48cae4,
      crop: 0xffd166, mine: 0xadb5bd, forest_resource: 0x606c38,
    };
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshStandardMaterial({
        color: colors[resource] || 0xffffff,
        emissive: colors[resource] || 0xffffff,
        emissiveIntensity: 0.3,
      })
    );
    sphere.position.set(x + 0.25, h + 0.15, z + 0.25);
    this.tileGroup.add(sphere);
  }

  // --- Unit rendering with distinct shapes ---

  updateUnits(gameState) {
    while (this.unitGroup.children.length) this.unitGroup.remove(this.unitGroup.children[0]);
    this.unitMeshes = [];

    for (const unit of gameState.units) {
      if (unit.hp <= 0) continue;
      const tile = gameState.getTile(unit.x, unit.z);
      if (!tile) continue;

      const baseHeight = TERRAIN_HEIGHTS[tile.terrain];
      const color = PLAYER_COLORS[unit.owner];
      const pos = this.worldPos(unit.x, unit.z);
      const group = new THREE.Group();
      group.position.set(pos.x, baseHeight, pos.z);
      group.userData = { unitId: unit.id, tileX: unit.x, tileZ: unit.z };

      this.createUnitModel(group, unit.type, color, unit);
      this.unitGroup.add(group);
      this.unitMeshes.push(group);

      // HP bar
      const hpRatio = unit.hp / unit.maxHp;
      if (hpRatio < 1) {
        // Background
        const bgBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.03, 0.06),
          new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        bgBar.position.set(0, 0.55, 0);
        group.add(bgBar);

        // HP fill
        const hpBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.38 * hpRatio, 0.035, 0.065),
          new THREE.MeshBasicMaterial({
            color: hpRatio > 0.5 ? 0x44ff44 : hpRatio > 0.25 ? 0xffaa00 : 0xff4444,
          })
        );
        hpBar.position.set((0.38 * hpRatio - 0.38) / 2, 0.55, 0);
        group.add(hpBar);
      }

      // Moved/acted indicator
      if (unit.moved && unit.attacked) {
        const dim = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SPACING - 0.1, 0.01, TILE_SPACING - 0.1),
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
        );
        dim.position.set(0, 0.01, 0);
        group.add(dim);
      }
    }
  }

  createUnitModel(group, type, color, unit) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });

    switch (type) {
      case 'warrior': {
        // Capsule body
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 4, 8), mat);
        body.position.y = 0.22;
        group.add(body);
        // Shield (small box)
        const shield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.02), darkMat);
        shield.position.set(-0.12, 0.2, 0);
        group.add(shield);
        break;
      }
      case 'rider': {
        // Lower, wider body
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.12, 4, 8), mat);
        body.position.y = 0.18;
        group.add(body);
        // Horse (elongated box)
        const horse = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.1, 0.28),
          new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.7 })
        );
        horse.position.y = 0.08;
        group.add(horse);
        break;
      }
      case 'archer': {
        // Thin tall body
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.25, 4, 8), mat);
        body.position.y = 0.25;
        group.add(body);
        // Bow (torus arc)
        const bow = new THREE.Mesh(
          new THREE.TorusGeometry(0.1, 0.015, 4, 8, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        bow.position.set(0.12, 0.28, 0);
        bow.rotation.z = -Math.PI / 6;
        group.add(bow);
        break;
      }
      case 'defender': {
        // Stocky box
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.18), mat);
        body.position.y = 0.2;
        group.add(body);
        // Big shield
        const shield = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.2, 0.22),
          new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6 })
        );
        shield.position.set(-0.14, 0.2, 0);
        group.add(shield);
        break;
      }
      case 'swordsman': {
        // Big capsule
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.22, 4, 8), mat);
        body.position.y = 0.24;
        group.add(body);
        // Sword
        const sword = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.25, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 })
        );
        sword.position.set(0.15, 0.25, 0);
        sword.rotation.z = -0.3;
        group.add(sword);
        break;
      }
      case 'catapult': {
        // Flat platform
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.22), darkMat);
        base.position.y = 0.08;
        group.add(base);
        // Arm
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.22, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        arm.position.set(0, 0.2, 0);
        arm.rotation.z = 0.4;
        group.add(arm);
        // Accent
        const bucket = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), mat);
        bucket.position.set(0.08, 0.32, 0);
        group.add(bucket);
        break;
      }
      case 'knight': {
        // Tall rider
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 4, 8), mat);
        body.position.y = 0.28;
        group.add(body);
        // Armored horse
        const horse = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.14, 0.32),
          new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5 })
        );
        horse.position.y = 0.1;
        group.add(horse);
        // Lance
        const lance = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7 })
        );
        lance.position.set(0.15, 0.28, 0.1);
        lance.rotation.x = Math.PI / 6;
        group.add(lance);
        break;
      }
      case 'giant': {
        // Huge sphere body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), mat);
        body.position.y = 0.35;
        group.add(body);
        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mat);
        head.position.y = 0.6;
        group.add(head);
        break;
      }
      default: {
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 4, 8), mat);
        body.position.y = 0.22;
        group.add(body);
      }
    }

    // Veteran crown
    if (unit.veteran) {
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 0.05, 5),
        new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 })
      );
      crown.position.y = 0.52;
      group.add(crown);
    }
  }

  // --- Overlays for move/attack ---

  showMoveOverlay(validMoves, mapSize) {
    this.clearOverlays();
    for (const move of validMoves) {
      const pos = this.worldPos(move.x, move.z);
      const geo = new THREE.BoxGeometry(TILE_SPACING - 0.08, 0.03, TILE_SPACING - 0.08);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x4488ff, transparent: true, opacity: 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, 0.25, pos.z);
      mesh.userData = { overlayType: 'move', tileX: move.x, tileZ: move.z };
      this.overlayGroup.add(mesh);
      this.overlayMeshes.push(mesh);
    }
  }

  showAttackOverlay(targets) {
    for (const target of targets) {
      const pos = this.worldPos(target.x, target.z);
      const geo = new THREE.BoxGeometry(TILE_SPACING - 0.08, 0.03, TILE_SPACING - 0.08);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff4444, transparent: true, opacity: 0.45,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, 0.26, pos.z);
      mesh.userData = { overlayType: 'attack', tileX: target.x, tileZ: target.z };
      this.overlayGroup.add(mesh);
      this.overlayMeshes.push(mesh);
    }
  }

  clearOverlays() {
    while (this.overlayGroup.children.length) this.overlayGroup.remove(this.overlayGroup.children[0]);
    this.overlayMeshes = [];
  }

  // --- Selection ---

  highlightTile(tileX, tileZ) {
    if (this.highlightMesh) this.tileGroup.remove(this.highlightMesh);
    const pos = this.worldPos(tileX, tileZ);
    const geo = new THREE.RingGeometry(0.4, 0.48, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    this.highlightMesh = new THREE.Mesh(geo, mat);
    this.highlightMesh.rotation.x = -Math.PI / 2;
    this.highlightMesh.rotation.z = Math.PI / 4;
    this.highlightMesh.position.set(pos.x, 0.8, pos.z);
    this.tileGroup.add(this.highlightMesh);
  }

  selectTile(tileX, tileZ) {
    if (this.selectMesh) this.tileGroup.remove(this.selectMesh);
    const pos = this.worldPos(tileX, tileZ);
    const geo = new THREE.RingGeometry(0.42, 0.5, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    this.selectMesh = new THREE.Mesh(geo, mat);
    this.selectMesh.rotation.x = -Math.PI / 2;
    this.selectMesh.rotation.z = Math.PI / 4;
    this.selectMesh.position.set(pos.x, 0.82, pos.z);
    this.tileGroup.add(this.selectMesh);
  }

  clearSelection() {
    if (this.selectMesh) { this.tileGroup.remove(this.selectMesh); this.selectMesh = null; }
    this.clearOverlays();
  }
}
