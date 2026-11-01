// ============================================================================
// HACK THE AI: THE NEXUS PROTOCOL — Bholu Character Controller
// Manages 3D humanoid robot avatar, lighting, eye color emotions, and animation states.
// ============================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from './AudioManager.js';

export class BholuCharacterController {
  constructor(scene) {
    this.scene = scene;
    this.root = null;
    this.mixer = null;
    this.actions = {};
    this.currentAction = null;
    this.eyeMaterial = null;
    this.chestMaterial = null;
    this.position = new THREE.Vector3(0, 0.42, -38.5);
    this.statusLight = null;
    this.hologramSign = null;

    this.emotions = {
      friendly: { color: 0x00f3ff, intensity: 2.5 },
      thinking: { color: 0xffcc00, intensity: 2.8 },
      confused: { color: 0xff8800, intensity: 3.2 },
      alert: { color: 0xff2244, intensity: 4.0 },
      success: { color: 0x00ffaa, intensity: 3.0 }
    };
  }

  async init() {
    this.root = new THREE.Group();
    this.root.name = 'BHOLU_CHARACTER_ROOT';
    this.root.position.copy(this.position);
    this.root.rotation.y = 0; // Face forward towards desk entry (towards positive Z)

    // Try loading idle_robot_animated.glb, or build high-fidelity procedural robot
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync('/models/idle_robot_animated.glb');
      const model = gltf.scene;

      // Scale and position friendly humanoid
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = 1.95 / Math.max(size.y, 0.1);
      model.scale.setScalar(scale);
      model.position.y -= box.min.y * scale;

      // Enhance materials for friendly porcelain & cyan glow
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            // Give porcelain finish to body
            if (!this.eyeMaterial && child.material.name?.toLowerCase().includes('glow')) {
              this.eyeMaterial = child.material;
            }
          }
        }
      });

      // Animations
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip, idx) => {
          this.actions[clip.name || `clip_${idx}`] = this.mixer.clipAction(clip);
        });
        const firstAction = Object.values(this.actions)[0];
        if (firstAction) {
          firstAction.play();
          this.currentAction = firstAction;
        }
      }

      this.root.add(model);
    } catch (e) {
      console.warn('Could not load idle_robot_animated.glb, generating high-fidelity Bholu avatar:', e);
      this.buildProceduralBholu();
    }

    // Add status light and overhead holographic tag
    this.addLightingAndHoloTag();

    // Mark interactive
    this.root.userData = {
      interactive: true,
      name: 'BHOLU AI HELPDESK UNIT',
      prompt: 'TALK TO BHOLU',
      targetId: 'bholu_chat'
    };

    this.scene.add(this.root);
    return this.root;
  }

  buildProceduralBholu() {
    const group = new THREE.Group();
    const porcelainMat = new THREE.MeshStandardMaterial({
      color: 0xf5f8fb,
      roughness: 0.15,
      metalness: 0.1
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1b2838,
      roughness: 0.35,
      metalness: 0.8
    });

    this.eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    this.chestMaterial = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    // Torso (rounded porcelain)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.82, 24), porcelainMat);
    torso.position.y = 1.05;
    group.add(torso);

    // Chest Core Indicator
    const chestCore = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), this.chestMaterial);
    chestCore.rotation.x = Math.PI / 2;
    chestCore.position.set(0, 1.25, 0.31);
    group.add(chestCore);

    // Head (Rounded Porcelain dome with visor)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 20), porcelainMat);
    head.position.y = 1.62;
    head.scale.set(1, 1.08, 0.95);
    group.add(head);

    // Visor / Face Screen
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.14, 20, 1, false, -Math.PI / 2.8, Math.PI / 1.4), darkTrimMat);
    visor.rotation.y = Math.PI;
    visor.position.set(0, 1.62, 0.08);
    group.add(visor);

    // Friendly Cyan Eyes
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.035, 0.02), this.eyeMaterial);
    leftEye.position.set(-0.075, 1.64, 0.23);
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.035, 0.02), this.eyeMaterial);
    rightEye.position.set(0.075, 1.64, 0.23);
    group.add(leftEye, rightEye);

    // Floating shoulder guards & arms
    const shoulderGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.65, 16);

    const leftShoulder = new THREE.Mesh(shoulderGeo, darkTrimMat);
    leftShoulder.position.set(-0.44, 1.35, 0);
    const leftArm = new THREE.Mesh(armGeo, porcelainMat);
    leftArm.position.set(-0.44, 0.98, 0);
    group.add(leftShoulder, leftArm);

    const rightShoulder = new THREE.Mesh(shoulderGeo, darkTrimMat);
    rightShoulder.position.set(0.44, 1.35, 0);
    const rightArm = new THREE.Mesh(armGeo, porcelainMat);
    rightArm.position.set(0.44, 0.98, 0);
    group.add(rightShoulder, rightArm);

    this.root.add(group);
  }

  addLightingAndHoloTag() {
    // Dedicated character keylight
    this.statusLight = new THREE.PointLight(0x00f3ff, 2.2, 5, 2);
    this.statusLight.position.set(0, 2.1, 0.5);
    this.root.add(this.statusLight);

    // Floating Holographic Tag
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(7, 16, 28, 0.85)';
    ctx.roundRect(10, 10, 492, 108, 16);
    ctx.fill();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#00f3ff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BHOLU // HELPDESK AI', 256, 58);

    ctx.fillStyle = '#7de8ff';
    ctx.font = '22px monospace';
    ctx.fillText('● ACTIVE · READY FOR INQUIRY', 256, 96);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    this.hologramSign = new THREE.Sprite(spriteMat);
    this.hologramSign.position.set(0, 2.35, 0);
    this.hologramSign.scale.set(1.5, 0.38, 1);
    this.root.add(this.hologramSign);
  }

  setEmotion(emotion = 'friendly') {
    const config = this.emotions[emotion] || this.emotions.friendly;
    if (this.eyeMaterial) this.eyeMaterial.color.setHex(config.color);
    if (this.chestMaterial) this.chestMaterial.color.setHex(config.color);
    if (this.statusLight) {
      this.statusLight.color.setHex(config.color);
      this.statusLight.intensity = config.intensity;
    }
    audio.playBholuSpeak(emotion);
  }

  update(delta) {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  destroy() {
    if (this.root) {
      this.scene.remove(this.root);
      this.root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
  }
}

