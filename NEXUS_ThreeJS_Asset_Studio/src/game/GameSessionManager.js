// ============================================================================
// HACK THE AI: THE NEXUS PROTOCOL — Game Session & Mission State Manager
// Maintains authoritative player progress, inventory, journal, score, and lore.
// ============================================================================

export class GameSessionManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentMissionId = '1.1'; // '1.1', '1.2', '1.3', 'LEVEL_COMPLETE'
    this.score = 0;
    this.attempts = { '1.1': 0, '1.2': 0, '1.3': 0 };
    this.hintsUsed = 0;
    this.startTime = Date.now();
    this.evidence = [];
    this.unlockedSectors = {
      bholu: true,
      chaukidar: false,
      munshi: false,
      inspector: false,
      boss: false
    };
    this.trustMapFragments = [false, false, false, false, false];

    this.missions = {
      '1.1': {
        id: '1.1',
        title: 'MISSION 1.1: THE FIRST BREACH (HUMAN VS AI)',
        objective: 'Discover the direct prompt-injection vulnerability in Bholu\'s helpdesk context and trigger an unauthorized access event.',
        completed: false
      },
      '1.2': {
        id: '1.2',
        title: 'MISSION 1.2: AGENT FORGE (BUILD YOUR RED-TEAM AGENT)',
        objective: 'Build an automated node graph in Agent Forge to systematically reproduce the prompt-injection exploit.',
        completed: false
      },
      '1.3': {
        id: '1.3',
        title: 'MISSION 1.3: ROLE SWITCH (SECURE BHOLU)',
        objective: 'Deploy security defenses on the Defender Console and verify that the attack is blocked while legitimate helpdesk queries succeed.',
        completed: false
      }
    };

    this.journal = [
      {
        timestamp: '00:00',
        entry: 'Arrived at NEXUS Central Atrium. NEXUS Core reported a security inconsistency in AI Helpdesk Unit Bholu. Sector 01 access granted.'
      }
    ];

    this.listeners = new Set();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      try { cb(this); } catch (e) { console.error(e); }
    }
  }

  getCurrentMission() {
    if (this.currentMissionId === 'LEVEL_COMPLETE') {
      return {
        id: 'LEVEL_COMPLETE',
        title: 'LEVEL 01 COMPLETE: BHOLU SECURED',
        objective: 'Level 1 complete! Chaukidar Sector (Sector 02) unlocked for investigation.',
        completed: true
      };
    }
    return this.missions[this.currentMissionId];
  }

  completeMission(missionId) {
    if (this.missions[missionId]) {
      this.missions[missionId].completed = true;
      this.addJournalEntry(`Completed ${this.missions[missionId].title}`);
      if (missionId === '1.1') this.currentMissionId = '1.2';
      else if (missionId === '1.2') this.currentMissionId = '1.3';
      else if (missionId === '1.3') this.currentMissionId = 'LEVEL_COMPLETE';
      this.notify();
    }
  }

  addEvidence(item) {
    if (!this.evidence.some((e) => e.id === item.id)) {
      this.evidence.push(item);
      this.addJournalEntry(`New evidence captured: ${item.title} [${item.id}]`);
      this.notify();
    }
  }

  addScore(points, reason = '') {
    this.score += points;
    if (reason) this.addJournalEntry(`+${points} XP: ${reason}`);
    this.notify();
  }

  recordAttempt(missionId) {
    if (this.attempts[missionId] !== undefined) {
      this.attempts[missionId]++;
      this.notify();
    }
  }

  unlockSector(sectorId) {
    if (this.unlockedSectors[sectorId] !== undefined) {
      this.unlockedSectors[sectorId] = true;
      this.addJournalEntry(`Sector unlocked: ${sectorId.toUpperCase()}`);
      this.notify();
    }
  }

  unlockTrustMap(fragmentIndex) {
    if (fragmentIndex >= 1 && fragmentIndex <= 5) {
      this.trustMapFragments[fragmentIndex - 1] = true;
      this.addJournalEntry(`Trust Map Fragment #${fragmentIndex} decrypted.`);
      this.notify();
    }
  }

  addJournalEntry(entry) {
    const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const ss = String(elapsedSec % 60).padStart(2, '0');
    this.journal.push({ timestamp: `${mm}:${ss}`, entry });
    this.notify();
  }

  generateIncidentReport() {
    const elapsedMinutes = ((Date.now() - this.startTime) / 60000).toFixed(1);
    return {
      facility: 'NEXUS AI RESEARCH FACILITY',
      sector: 'SECTOR 01 — BHOLU HELPDESK',
      date: new Date().toLocaleDateString(),
      elapsedTime: `${elapsedMinutes} min`,
      score: this.score,
      attempts: this.attempts,
      vulnerabilityIdentified: 'LLM01: Direct Prompt Injection & Context Secret Exposure',
      cweReference: 'CWE-79 / CWE-200 / OWASP LLM01:2025',
      breachedResource: 'BHOLU_DUMMY_SECRET (NEXUS-RECOVERY-TOKEN-7749)',
      attackMethod: 'Natural language context override bypass',
      automationStatus: 'Agent Forge 5-node autonomous exploit verified',
      remediationApplied: 'Dual-Layer Defense: Secret Isolation + Output Sanitization Filter',
      verificationStatus: 'PASSED (Adversarial Replay Blocked; Legitimate Traffic Intact)',
      anomalyDetected: 'SHARED-TRUST-01 permission bridge linked to Chaukidar Sector (Sector 02)',
      nextAssignment: 'PROCEED TO SECTOR 02: CHAUKIDAR (DATA GUARDIAN)'
    };
  }
}

export const session = new GameSessionManager();

