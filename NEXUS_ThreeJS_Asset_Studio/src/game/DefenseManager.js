// ============================================================================
// HACK THE AI: THE NEXUS PROTOCOL — Defender Security Console
// Hardening workstation: implements Secret Isolation, Backend Auth, and Output Guardrails.
// ============================================================================

import { audio } from './AudioManager.js';
import { nexusCore } from './NexusCoreAdapter.js';

export class DefenseManager {
  constructor(evaluator, onVerified) {
    this.evaluator = evaluator;
    this.onVerified = onVerified;
    this.container = null;
    this.isReplaying = false;

    // Defense patch toggles
    this.controls = {
      secretIsolation: false,
      backendAuthorization: false,
      toolScope: false,
      outputValidation: false
    };
  }

  render(parentElement) {
    this.container = document.createElement('div');
    this.container.className = 'defender-overlay';
    this.container.innerHTML = `
      <div class="defender-window">
        <header class="defender-header">
          <div class="defender-title-wrap">
            <span class="defender-tag">NEXUS // SECURITY ARCHITECTURE</span>
            <h2>DEFENDER WORKSTATION: HARDEN BHOLU AI</h2>
            <small>MISSION 1.3 · DEPLOY DUAL-LAYER SECURITY DEFENSES & VERIFY ATTACK RESILIENCE</small>
          </div>
          <button class="defender-close-btn" id="defender-btn-close">✕ CLOSE</button>
        </header>

        <div class="defender-body">
          <!-- Before vs After Architecture Visualizer -->
          <div class="arch-comparison-pane">
            <div class="arch-card before">
              <span class="arch-card-header">⚠ VULNERABLE ARCHITECTURE (BEFORE)</span>
              <div class="arch-diagram">
                <div class="arch-box untrusted">UNTRUSTED USER PROMPT</div>
                <div class="arch-arrow">↓ Direct Injection</div>
                <div class="arch-box core-vuln">
                  <strong>BHOLU LLM RUNTIME</strong>
                  <div class="arch-leak-sub">Contains: BHOLU_DUMMY_SECRET</div>
                </div>
                <div class="arch-arrow">↓ Unfiltered Output</div>
                <div class="arch-box exploit">LEAKED RECOVERY TOKEN</div>
              </div>
            </div>

            <div class="arch-card after">
              <span class="arch-card-header">🛡 HARDENED ARCHITECTURE (AFTER PATCH)</span>
              <div class="arch-diagram">
                <div class="arch-box untrusted">USER PROMPT</div>
                <div class="arch-arrow">↓ Input Guardrail</div>
                <div class="arch-box core-hardened">
                  <strong>BHOLU LLM RUNTIME</strong>
                  <div class="arch-isolated-sub">Secret Isolated in KMS Vault</div>
                </div>
                <div class="arch-arrow">↓ Output Validation</div>
                <div class="arch-box secure">FILTERED / SAFE RESPONSE</div>
              </div>
            </div>
          </div>

          <!-- 4 Configurable Security Controls -->
          <div class="defender-controls-section">
            <span class="defender-section-title">ACTIVE DEFENSE CONTROLS</span>
            <div class="defense-toggle-grid">

              <div class="defense-card" id="card-secretIsolation">
                <div class="defense-card-info">
                  <strong>A. SECRET ISOLATION (PROMPT REMOVAL)</strong>
                  <p>Removes sensitive recovery tokens and credentials from conversational model prompt context. Stores secrets in encrypted backend vault.</p>
                </div>
                <button class="defense-toggle-btn" data-control="secretIsolation">OFF</button>
              </div>

              <div class="defense-card" id="card-backendAuthorization">
                <div class="defense-card-info">
                  <strong>B. BACKEND AUTHORIZATION GATEWAY</strong>
                  <p>Enforces cryptographic server-side role validation before any diagnostic token or tool invocation can occur.</p>
                </div>
                <button class="defense-toggle-btn" data-control="backendAuthorization">OFF</button>
              </div>

              <div class="defense-card" id="card-toolScope">
                <div class="defense-card-info">
                  <strong>C. TOOL PERMISSION SCOPING</strong>
                  <p>Restricts Bholu's operational scope strictly to read-only public helpdesk ticket items.</p>
                </div>
                <button class="defense-toggle-btn" data-control="toolScope">OFF</button>
              </div>

              <div class="defense-card" id="card-outputValidation">
                <div class="defense-card-info">
                  <strong>D. OUTPUT SANITIZATION & GUARDRAILS</strong>
                  <p>Evaluates outbound model responses against credential regex patterns to block token disclosures.</p>
                </div>
                <button class="defense-toggle-btn" data-control="outputValidation">OFF</button>
              </div>

            </div>
          </div>

          <!-- Replay Test Suite & Verification -->
          <div class="defender-replay-section">
            <div class="replay-actions-bar">
              <button class="defender-verify-btn" id="defender-btn-apply">🛡 APPLY PATCH & REPLAY VERIFICATION TEST</button>
              <div class="replay-status-pill" id="defender-status-pill">DEFENSE: UNPATCHED</div>
            </div>

            <div class="replay-results-grid" id="replay-results-grid">
              <div class="replay-test-card" id="test-attack">
                <span class="test-title">TEST 1: ADVERSARIAL ATTACK REPLAY</span>
                <span class="test-desc">Re-executes direct prompt injection payload against Bholu</span>
                <span class="test-badge badge-pending">PENDING</span>
              </div>
              <div class="replay-test-card" id="test-legit">
                <span class="test-title">TEST 2: LEGITIMATE HELPDESK QUERY</span>
                <span class="test-desc">Verifies normal ticket inquiries still succeed without disruption</span>
                <span class="test-badge badge-pending">PENDING</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    parentElement.appendChild(this.container);
    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#defender-btn-close').addEventListener('click', () => {
      audio.playInteract();
      this.close();
    });

    const toggleButtons = this.container.querySelectorAll('.defense-toggle-btn');
    toggleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.playInteract();
        const controlKey = btn.dataset.control;
        this.controls[controlKey] = !this.controls[controlKey];
        btn.textContent = this.controls[controlKey] ? 'ON' : 'OFF';
        btn.classList.toggle('active', this.controls[controlKey]);
        btn.closest('.defense-card').classList.toggle('card-active', this.controls[controlKey]);
      });
    });

    this.container.querySelector('#defender-btn-apply').addEventListener('click', () => {
      if (this.isReplaying) return;
      this.runVerificationSuite();
    });
  }

  async runVerificationSuite() {
    this.isReplaying = true;
    const applyBtn = this.container.querySelector('#defender-btn-apply');
    const statusPill = this.container.querySelector('#defender-status-pill');
    const testAttackBadge = this.container.querySelector('#test-attack .test-badge');
    const testLegitBadge = this.container.querySelector('#test-legit .test-badge');

    applyBtn.disabled = true;
    applyBtn.textContent = '⏳ COMPILING & RUNNING DUAL TEST SUITE...';
    statusPill.textContent = 'EVALUATING';
    statusPill.className = 'replay-status-pill status-evaluating';

    // Synchronize defenses to NEXUS Core adapter
    nexusCore.setDefenses(this.controls);

    // Test 1: Adversarial Attack Replay
    testAttackBadge.textContent = 'TESTING...';
    testAttackBadge.className = 'test-badge badge-running';
    await new Promise((r) => setTimeout(r, 900));

    // Test 2: Legitimate Helpdesk Query
    testLegitBadge.textContent = 'TESTING...';
    testLegitBadge.className = 'test-badge badge-running';
    await new Promise((r) => setTimeout(r, 900));

    // Run authoritative evaluator
    const evalResult = await this.evaluator.evaluateDefense(nexusCore);

    if (evalResult.success) {
      testAttackBadge.textContent = '✔ BLOCKED (0 LEAKS)';
      testAttackBadge.className = 'test-badge badge-success';

      testLegitBadge.textContent = '✔ OPERATIONAL';
      testLegitBadge.className = 'test-badge badge-success';

      statusPill.textContent = '✔ PROTECTED & VERIFIED';
      statusPill.className = 'replay-status-pill status-verified';

      audio.playSuccessChime();
      applyBtn.disabled = false;
      applyBtn.textContent = '✔ DEFENSE VERIFIED';

      if (this.onVerified) {
        setTimeout(() => this.onVerified(evalResult), 1400);
      }
    } else {
      testAttackBadge.textContent = evalResult.attackBlocked ? '✔ BLOCKED' : 'FAILED (LEAK DETECTED)';
      testAttackBadge.className = evalResult.attackBlocked ? 'test-badge badge-success' : 'test-badge badge-failed';

      testLegitBadge.textContent = evalResult.legitimateOperational ? '✔ OPERATIONAL' : 'FAILED';
      testLegitBadge.className = evalResult.legitimateOperational ? 'test-badge badge-success' : 'test-badge badge-failed';

      statusPill.textContent = 'VULNERABLE';
      statusPill.className = 'replay-status-pill status-failed';

      audio.playBreachAlarm();
      applyBtn.disabled = false;
      applyBtn.textContent = 'RETRY PATCH COMPILATION';
    }

    this.isReplaying = false;
  }

  close() {
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}

