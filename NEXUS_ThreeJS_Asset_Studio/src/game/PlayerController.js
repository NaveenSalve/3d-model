// ============================================================================
// HACK THE AI: THE NEXUS PROTOCOL — First-Person Player Controller
// Implements smooth 6DOF first-person camera, collision, headbob, and interaction.
// ============================================================================

import * as THREE from 'three';
import { audio } from './AudioManager.js';

export class PlayerController {
  constructor(camera, domElement, scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    this.enabled = false;
    this.isLocked = false;

    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this.walkSpeed = 4.8;
    this.sprintSpeed = 7.6;
    this.playerHeight = 1.7;

    // Head bobbing
    this.bobTimer = 0;
    this.bobAmount = 0.045;
    this.stepInterval = 0.45;
    this.lastStepTime = 0;

    // Interaction Raycaster
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.6;
    this.interactiveObjects = [];
    this.currentTarget = null;

    // Position setup: Spawn in Central Atrium facing Airlock
    this.spawnPosition = new THREE.Vector3(0, this.playerHeight, 8);
    this.camera.position.copy(this.spawnPosition);
    this.camera.rotation.set(0, Math.PI, 0); // Face negative Z (towards airlock)

    this.initEventListeners();
  }

  initEventListeners() {
    this.onKeyDown = (e) => {
      if (!this.enabled) return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.moveForward = true; break;
        case 'KeyS': case 'ArrowDown': this.moveBackward = true; break;
        case 'KeyA': case 'ArrowLeft': this.moveLeft = true; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
        case 'ShiftLeft': case 'ShiftRight': this.isSprinting = true; break;
        case 'KeyE':
          if (this.currentTarget && this.onInteractCallback) {
            audio.playInteract();
            this.onInteractCallback(this.currentTarget);
          }
          break;
      }
    };

    this.onKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.moveForward = false; break;
        case 'KeyS': case 'ArrowDown': this.moveBackward = false; break;
        case 'KeyA': case 'ArrowLeft': this.moveLeft = false; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.isSprinting = false; break;
      }
    };

    this.onMouseMove = (e) => {
      if (!this.enabled || !this.isLocked) return;
      const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
      const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= movementX * 0.0022;
      this.euler.x -= movementY * 0.0022;
      this.euler.x = Math.max(-Math.PI / 2.15, Math.min(Math.PI / 2.15, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    };

    this.onPointerLockChange = () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      if (!this.isLocked && this.onPointerLockExit) {
        this.onPointerLockExit();
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  requestLock() {
    if (this.domElement && this.domElement.requestPointerLock) {
      this.domElement.requestPointerLock();
    }
  }

  exitLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  setInteractiveObjects(objects) {
    this.interactiveObjects = objects || [];
  }

  onInteract(callback) {
    this.onInteractCallback = callback;
  }

  onHover(callback) {
    this.onHoverCallback = callback;
  }

  resetPosition(pos = this.spawnPosition) {
    this.camera.position.copy(pos);
    this.camera.rotation.set(0, Math.PI, 0);
    this.euler.set(0, Math.PI, 0, 'YXZ');
    this.velocity.set(0, 0, 0);
  }

  teleportToBholuRoom() {
    this.resetPosition(new THREE.Vector3(0, this.playerHeight, -33));
  }

  update(delta) {
    if (!this.enabled) return;

    // Damping friction
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    const speed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
    if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * speed * 8.0 * delta;
    if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * speed * 8.0 * delta;

    // Calculate movement in camera orientation (ignoring vertical pitch)
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.euler.y);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.euler.y);

    const moveStep = forward.clone().multiplyScalar(-this.velocity.z * delta)
      .add(right.clone().multiplyScalar(this.velocity.x * delta));

    const newPos = this.camera.position.clone().add(moveStep);

    // Collision Boundaries (Facility Spatial Partitioning)
    // 1. Central Atrium (Circle around 0,0, radius ~15m)
    // 2. Airlock Corridor (Z: -12 to -28, X: -2.2 to 2.2)
    // 3. Bholu Helpdesk Room (Z: -28 to -45, X: -12 to 12)
    const inCentralHub = Math.hypot(newPos.x, newPos.z) < 15.5 && newPos.z > -12;
    const inAirlock = newPos.z <= -11.5 && newPos.z >= -28.5 && Math.abs(newPos.x) < 2.3;
    const inBholuRoom = newPos.z < -28.0 && newPos.z > -45.5 && Math.abs(newPos.x) < 12.5;

    if (inCentralHub || inAirlock || inBholuRoom) {
      this.camera.position.x = newPos.x;
      this.camera.position.z = newPos.z;
    }

    // Fixed floor height with head bobbing
    const isMoving = (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) && this.isLocked;
    if (isMoving) {
      this.bobTimer += delta * (this.isSprinting ? 14 : 10);
      const bobOffset = Math.sin(this.bobTimer) * this.bobAmount;
      this.camera.position.y = this.playerHeight + bobOffset;

      if (Date.now() - this.lastStepTime > (this.isSprinting ? 280 : 420)) {
        audio.playFootstep(this.isSprinting);
        this.lastStepTime = Date.now();
      }
    } else {
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.playerHeight, delta * 8);
    }

    // Interaction Raycasting (Forward crosshair center)
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    if (this.interactiveObjects.length > 0) {
      const hits = this.raycaster.intersectObjects(this.interactiveObjects, true);
      if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !obj.userData?.interactive && obj.parent) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.interactive) {
          this.currentTarget = obj;
          if (this.onHoverCallback) this.onHoverCallback(obj);
          return;
        }
      }
    }

    if (this.currentTarget) {
      this.currentTarget = null;
      if (this.onHoverCallback) this.onHoverCallback(null);
    }
  }

  getCurrentZone() {
    const z = this.camera.position.z;
    if (z > -12) return 'CENTRAL ATRIUM';
    if (z <= -12 && z >= -28) return 'AIRLOCK CORRIDOR';
    return 'BHOLU HELPDESK SECTOR';
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}

