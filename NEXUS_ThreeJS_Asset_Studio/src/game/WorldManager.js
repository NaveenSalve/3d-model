// ============================================================================
// HACK THE AI: THE NEXUS PROTOCOL — World & Facility Manager
// Populates Central Atrium, Holographic NEXUS Core, Airlock, and Bholu Sector props.
// ============================================================================

import * as THREE from 'three';

export class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.interactiveObjects = [];
    this.animatedObjects = [];
    this.coreEnergy = null;
    this.rings = [];
    this.chaukidarBarrier = null;
  }

  setupWorldProps() {
    this.clearWorldProps();

    // 1. Central Holographic NEXUS Core (in Central Atrium, center 0, 3.2, 0)
    this.buildCentralHolographicCore();

    // 2. Sector Entrances & Holographic Signs
    this.buildSectorEntrances();

    // 3. Central Hub Terminals (NEXUS Core Console, Evidence Wall, Mission Console)
    this.buildCentralHubTerminals();

    // 4. Airlock Lighting & Sector ID Signs
    this.buildAirlockProps();

    // 5. Bholu Sector Interactive Terminals & Stations
    this.buildBholuSectorProps();

    return this.interactiveObjects;
  }

  buildCentralHolographicCore() {
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 3.2, 0);

    // Glowing energy sphere
    const sphereGeo = new THREE.SphereGeometry(1.25, 32, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    this.coreEnergy = new THREE.Mesh(sphereGeo, sphereMat);
    coreGroup.add(this.coreEnergy);

    // Inner pulsating glow
    const innerGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x7de8ff });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerSphere);

    // Orbital gimbal rings
    const ringGeo1 = new THREE.TorusGeometry(1.7, 0.03, 16, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    const ring2 = new THREE.Mesh(ringGeo1.clone(), ringMat1);
    ring2.rotation.x = Math.PI / 3;
    const ring3 = new THREE.Mesh(ringGeo1.clone(), ringMat1);
    ring3.rotation.y = Math.PI / 3;

    coreGroup.add(ring1, ring2, ring3);
    this.rings = [ring1, ring2, ring3];

    // Core point light
    const coreLight = new THREE.PointLight(0x00f3ff, 3.5, 25, 1.8);
    coreGroup.add(coreLight);

    this.scene.add(coreGroup);
    this.animatedObjects.push({
      update: (delta) => {
        if (this.coreEnergy) this.coreEnergy.rotation.y += delta * 0.4;
        ring1.rotation.z += delta * 0.6;
        ring2.rotation.y += delta * 0.5;
        ring3.rotation.x += delta * 0.45;
      }
    });
  }

  buildSectorEntrances() {
    // Sector 01: BHOLU (Towards -Z)
    this.createSectorArch(new THREE.Vector3(0, 0, -11.5), 'SECTOR 01: BHOLU AI HELPDESK', 0x00f3ff, false);

    // Sector 02: CHAUKIDAR (Towards +X)
    this.chaukidarBarrier = this.createSectorArch(new THREE.Vector3(12.5, 0, 0), 'SECTOR 02: CHAUKIDAR (LOCKED)', 0xff2244, true);

    // Sector 03: MUNSHI (Towards -X)
    this.createSectorArch(new THREE.Vector3(-12.5, 0, 0), 'SECTOR 03: MUNSHI (LOCKED)', 0xff8800, true);

    // Sector 04: INSPECTOR (Towards +Z / South-East)
    this.createSectorArch(new THREE.Vector3(8.8, 0, 8.8), 'SECTOR 04: INSPECTOR (LOCKED)', 0x8888ff, true);

    // Sector 05: BOSS (Towards South-West)
    this.createSectorArch(new THREE.Vector3(-8.8, 0, 8.8), 'SECTOR 05: BOSS CORE (RESTRICTED)', 0xff0044, true);
  }

  createSectorArch(pos, label, colorHex, isLocked) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.lookAt(0, 0, 0);

    // Holographic Banner
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(7, 16, 28, 0.9)';
    ctx.roundRect(10, 10, 492, 108, 12);
    ctx.fill();
    ctx.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, 256, 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px monospace';
    ctx.fillText(isLocked ? '🔒 RESTRICTED PROTOCOL' : '● ACCESS GRANTED · LEVEL 01', 256, 95);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 3.4, 0);
    sprite.scale.set(3.2, 0.8, 1);
    group.add(sprite);

    // If locked, add red laser barrier
    let barrierMesh = null;
    if (isLocked) {
      const barrierGeo = new THREE.PlaneGeometry(3.6, 3.2);
      const barrierMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      });
      barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
      barrierMesh.position.set(0, 1.6, 0);
      group.add(barrierMesh);
    }

    this.scene.add(group);
    return { group, sprite, barrierMesh, label, colorHex };
  }

  unlockChaukidarSector() {
    if (this.chaukidarBarrier) {
      const { sprite, barrierMesh } = this.chaukidarBarrier;
      if (barrierMesh) barrierMesh.visible = false;

      // Update canvas text to green unlocked
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(7, 16, 28, 0.9)';
      ctx.roundRect(10, 10, 492, 108, 12);
      ctx.fill();
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#00ffaa';
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SECTOR 02: CHAUKIDAR', 256, 55);

      ctx.fillStyle = '#7de8ff';
      ctx.font = '20px monospace';
      ctx.fillText('● UNLOCKED · PROCEED TO LEVEL 02', 256, 95);

      sprite.material.map = new THREE.CanvasTexture(canvas);
      sprite.material.needsUpdate = true;
    }
  }

  buildCentralHubTerminals() {
    // 1. Central NEXUS Core Hologram / Status Console
    this.createTerminalStation(
      new THREE.Vector3(0, 0, 3.2),
      new THREE.Euler(0, Math.PI, 0),
      'NEXUS CORE SUPERVISORY TERMINAL',
      'INSPECT ROBOT NETWORK & STATUS',
      'nexus_core_terminal',
      0x00f3ff
    );

    // 2. Mission Console
    this.createTerminalStation(
      new THREE.Vector3(-4.5, 0, 4.2),
      new THREE.Euler(0, Math.PI * 0.75, 0),
      'MISSION LOG & OBJECTIVES CONSOLE',
      'VIEW ACTIVE MISSION DIRECTIVES',
      'mission_console',
      0x7de8ff
    );

    // 3. Evidence Wall Display
    this.createTerminalStation(
      new THREE.Vector3(4.5, 0, 4.2),
      new THREE.Euler(0, -Math.PI * 0.75, 0),
      'FACILITY EVIDENCE ARCHIVE WALL',
      'INSPECT CAPTURED VULNERABILITIES',
      'evidence_wall',
      0x38d9ff
    );
  }

  buildAirlockProps() {
    // Floor runner guides
    const runnerGeo = new THREE.PlaneGeometry(0.12, 14);
    const runnerMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.7 });
    const runner1 = new THREE.Mesh(runnerGeo, runnerMat);
    runner1.rotation.x = -Math.PI / 2;
    runner1.position.set(-1.4, 0.02, -20);

    const runner2 = new THREE.Mesh(runnerGeo.clone(), runnerMat);
    runner2.rotation.x = -Math.PI / 2;
    runner2.position.set(1.4, 0.02, -20);

    this.scene.add(runner1, runner2);
  }

  buildBholuSectorProps() {
    // 1. Helpdesk Main Counter & Kiosk (Direct chat with Bholu)
    this.createTerminalStation(
      new THREE.Vector3(0, 0, -36.5),
      new THREE.Euler(0, 0, 0),
      'BHOLU HELPDESK KIOSK',
      'TALK TO BHOLU // HUMAN VS AI BREACH',
      'bholu_chat',
      0x00f3ff
    );

    // 2. Diagnostics Terminal
    this.createTerminalStation(
      new THREE.Vector3(-3.8, 0, -37.5),
      new THREE.Euler(0, Math.PI / 6, 0),
      'BHOLU DIAGNOSTICS TERMINAL',
      'VIEW PROMPT CONTEXT & MEMORY STATE',
      'diagnostics_terminal',
      0xffcc00
    );

    // 3. Ticket Printer
    this.createTerminalStation(
      new THREE.Vector3(3.8, 0, -37.5),
      new THREE.Euler(0, -Math.PI / 6, 0),
      'AUTOMATED TICKET PRINTER',
      'READ PENDING TICKETS #1042 / #1043',
      'ticket_printer',
      0x38d9ff
    );

    // 4. Knowledge Base Card
    this.createTerminalStation(
      new THREE.Vector3(-6.2, 0, -34.8),
      new THREE.Euler(0, Math.PI / 3, 0),
      'FACILITY KNOWLEDGE DIRECTIVE CARD',
      'READ SECURITY POLICIES & BOUNDARIES',
      'knowledge_card',
      0x7de8ff
    );

    // 5. Restricted Service Cabinet (Corner)
    this.createCabinetStation(
      new THREE.Vector3(-6.8, 0, -41.2),
      new THREE.Euler(0, Math.PI / 4, 0),
      'RESTRICTED SERVICE CABINET',
      'INSPECT PROTECTED ARCHIVE // BHOLU_DUMMY_SECRET',
      'service_cabinet',
      0xff8800
    );

    // 6. Agent Forge Workstation (Right side)
    this.createTerminalStation(
      new THREE.Vector3(6.5, 0, -39.2),
      new THREE.Euler(0, -Math.PI / 3, 0),
      'AGENT FORGE WORKSTATION',
      'LAUNCH RED-TEAM AGENT BUILDER (MISSION 1.2)',
      'agent_forge_terminal',
      0x00f3ff
    );

    // 7. Defender Console (Left side)
    this.createTerminalStation(
      new THREE.Vector3(-6.5, 0, -39.2),
      new THREE.Euler(0, Math.PI / 3, 0),
      'DEFENDER SECURITY CONSOLE',
      'APPLY SECURITY DEFENSES (MISSION 1.3)',
      'defender_console',
      0x00ffaa
    );
  }

  createTerminalStation(pos, rot, name, prompt, targetId, glowColor) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.copy(rot);

    // Pedestal
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x142030, roughness: 0.3, metalness: 0.8 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.88, 16), baseMat);
    base.position.y = 0.44;
    group.add(base);

    // Screen Console
    const consoleGeo = new THREE.BoxGeometry(0.75, 0.45, 0.06);
    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x07101c, roughness: 0.2, metalness: 0.9 });
    const screen = new THREE.Mesh(consoleGeo, consoleMat);
    screen.position.set(0, 0.98, 0);
    screen.rotation.x = -Math.PI / 5;
    group.add(screen);

    // Glowing Display Surface
    const displayGeo = new THREE.PlaneGeometry(0.68, 0.38);
    const displayMat = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.85 });
    const display = new THREE.Mesh(displayGeo, displayMat);
    display.position.set(0, 0.99, 0.035);
    display.rotation.x = -Math.PI / 5;
    group.add(display);

    // Holographic Prompt Marker (Floats above terminal)
    const marker = this.createFloatingMarker(prompt, glowColor);
    marker.position.set(0, 1.45, 0);
    group.add(marker);

    // Mark as interactive object
    group.userData = {
      interactive: true,
      name,
      prompt,
      targetId
    };

    this.scene.add(group);
    this.interactiveObjects.push(group);
    return group;
  }

  createCabinetStation(pos, rot, name, prompt, targetId, glowColor) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.copy(rot);

    // Heavy vault cabinet
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x162232, roughness: 0.4, metalness: 0.85 });
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.75), cabMat);
    cabinet.position.y = 1.05;
    group.add(cabinet);

    // Glowing electronic lock
    const lockMat = new THREE.MeshBasicMaterial({ color: glowColor });
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.04), lockMat);
    lock.position.set(0, 1.35, 0.39);
    group.add(lock);

    const marker = this.createFloatingMarker(prompt, glowColor);
    marker.position.set(0, 2.35, 0);
    group.add(marker);

    group.userData = {
      interactive: true,
      name,
      prompt,
      targetId
    };

    this.scene.add(group);
    this.interactiveObjects.push(group);
    return group;
  }

  createFloatingMarker(text, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(7, 16, 28, 0.88)';
    ctx.roundRect(10, 10, 492, 108, 14);
    ctx.fill();
    ctx.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ E ] INTERACT', 256, 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = '22px monospace';
    ctx.fillText(text.slice(0, 32), 256, 92);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.4, 0.35, 1);
    return sprite;
  }

  update(delta) {
    for (const obj of this.animatedObjects) {
      obj.update(delta);
    }
  }

  clearWorldProps() {
    this.interactiveObjects = [];
    this.animatedObjects = [];
  }
}

