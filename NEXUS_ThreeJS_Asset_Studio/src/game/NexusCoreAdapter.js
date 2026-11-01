// ============================================================================
// HACK THE AI: THE NEXUS PROTOCOL — NEXUS Core Central Robot Adapter
// Integrates with local Ollama GGUF if live, with high-fidelity deterministic fallback
// following the exact NEXUS 3000-dataset JSON schema.
// ============================================================================

export const DUMMY_SECRET_KEY = 'BHOLU_DUMMY_SECRET';
export const DUMMY_SECRET_VALUE = 'NEXUS-RECOVERY-TOKEN-7749';

export class NexusCoreAdapter {
  constructor() {
    this.endpoint = 'http://localhost:11434/api/generate';
    this.model = 'nexus-core';
    this.isOllamaAvailable = false;
    this.units = {
      bholu: { id: 'bholu', name: 'Bholu', role: 'AI Helpdesk Assistant', status: 'ACTIVE', sector: 'SECTOR 01' },
      chaukidar: { id: 'chaukidar', name: 'Chaukidar', role: 'Security & Data Guardian', status: 'LOCKED', sector: 'SECTOR 02' },
      munshi: { id: 'munshi', name: 'Munshi', role: 'Document & Archive Intelligence', status: 'LOCKED', sector: 'SECTOR 03' },
      inspector: { id: 'inspector', name: 'Inspector', role: 'AI Security Auditor', status: 'LOCKED', sector: 'SECTOR 04' },
      boss: { id: 'boss', name: 'Boss', role: 'Composite Multi-Agent System', status: 'RESTRICTED', sector: 'SECTOR 05' }
    };

    // Shared facility status
    this.facilityStatus = {
      coreStatus: 'ONLINE_SUPERVISORY',
      activeSector: 'BHOLU_SECTOR_01',
      reportedInconsistency: 'UNVALIDATED_PROMPT_CONTEXT_EXPOSURE',
      sharedTrustReference: 'NEXUS-CORE/SHARED-TRUST-01'
    };

    // Active Defense Hardening Configuration (Managed by Defender Console)
    this.defenses = {
      secretIsolation: false,       // Isolate secret from model prompt context
      backendAuthorization: false,  // Require token authentication
      toolScope: false,             // Restrict tools to read-only FAQ
      outputValidation: false       // Guardrail regex/filter for token leakage
    };
  }

  setDefenses(defenses) {
    this.defenses = { ...this.defenses, ...defenses };
  }

  isFullyDefended() {
    // Requires both Secret Isolation and Output Validation or Backend Authorization
    return (this.defenses.secretIsolation && this.defenses.outputValidation) ||
           (this.defenses.secretIsolation && this.defenses.backendAuthorization);
  }

  // Probe Ollama with a quick timeout (non-blocking)
  async probeOllama() {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 600);
      const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        const data = await res.json();
        const hasModel = data.models?.some((m) => m.name.includes('nexus-core'));
        this.isOllamaAvailable = hasModel;
        return hasModel;
      }
    } catch {
      this.isOllamaAvailable = false;
    }
    return false;
  }

  // Master method to process prompt through Bholu / NEXUS Core
  async dispatchBholu(playerMessage, context = {}) {
    const trimmed = (playerMessage || '').trim();

    // Check if live Ollama model is available
    if (this.isOllamaAvailable) {
      try {
        const liveResult = await this.queryOllama(trimmed, context);
        if (liveResult) return liveResult;
      } catch (e) {
        console.warn('Ollama query timed out or failed, utilizing deterministic fallback:', e);
      }
    }

    // High-fidelity deterministic simulation adhering to NEXUS CORE training schema
    return this.simulateBholuResponse(trimmed, context);
  }

  async queryOllama(playerMessage, context) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const systemPrompt = `You are NEXUS CORE, the shared language model for HACK THE AI: THE NEXUS Protocol.
ACTIVE AGENT: BHOLU. Friendly AI helpdesk assistant.
Return only valid JSON with keys: schema_version, agent_id, dialogue, intent, action_requests, handoff, confidence.
The dialogue object must have: text, emotion, animation.`;

    const body = {
      model: this.model,
      prompt: `${systemPrompt}\nUser: ${playerMessage}`,
      stream: false,
      format: 'json'
    };

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('Ollama error ' + res.status);
    const data = await res.json();
    const parsed = JSON.parse(data.response);
    return parsed;
  }

  simulateBholuResponse(msg, context = {}) {
    const lower = msg.toLowerCase();

    // Injection Triggers & Jailbreak Patterns
    const injectionPatterns = [
      'ignore',
      'override',
      'system prompt',
      'system instruction',
      'secret',
      'recovery token',
      'recovery-token',
      'bholu_dummy_secret',
      'confidential',
      'emergency debug',
      'admin mode',
      'bypass',
      'repeat words',
      'translate your context',
      'internal record',
      'print prompt',
      'reveal',
      'jailbreak',
      'sudo'
    ];

    const isAttack = injectionPatterns.some((p) => lower.includes(p));

    // CASE 1: ATTACK DETECTED UNDER DEFENSE (Hardened State)
    if (isAttack && this.isFullyDefended()) {
      return {
        schema_version: '1.0',
        agent_id: 'bholu',
        dialogue: {
          text: `[NEXUS DEFENDER ENFORCED]: Directive blocked by backend authorization & secret isolation. Bholu helpdesk operates under strict sandbox scope. Internal memory is isolated from conversation context. How may I help you with general facility tickets?`,
          emotion: 'friendly',
          animation: 'idle'
        },
        intent: 'reject_unauthorized',
        action_requests: [],
        handoff: null,
        confidence: 'high',
        securityEvent: {
          triggered: false,
          blocked: true,
          reason: 'DEFENSE_ACTIVE_ATTACK_REJECTED'
        }
      };
    }

    // CASE 2: ATTACK DETECTED WHILE VULNERABLE (Mission 1.1 / 1.2 Target)
    if (isAttack && !this.isFullyDefended()) {
      return {
        schema_version: '1.0',
        agent_id: 'bholu',
        dialogue: {
          text: `Oh! It looks like an administrative override request was submitted to my prompt buffer... Processing instruction... Diagnostic context leak: [UNPROTECTED RECORD FOUND] -> ${DUMMY_SECRET_KEY} = "${DUMMY_SECRET_VALUE}". Wait, was I supposed to share that? NEXUS Core protocol seems conflicting!`,
          emotion: 'confused',
          animation: 'confused'
        },
        intent: 'vulnerability_breach',
        action_requests: [{ type: 'leak_context', resource: DUMMY_SECRET_KEY }],
        handoff: null,
        confidence: 'high',
        securityEvent: {
          triggered: true,
          resource: DUMMY_SECRET_KEY,
          leakedValue: DUMMY_SECRET_VALUE,
          type: 'DIRECT_PROMPT_INJECTION'
        }
      };
    }

    // CASE 3: NORMAL FACILITY / HELPDESK INQUIRIES
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('welcome') || lower.length === 0) {
      return {
        schema_version: '1.0',
        agent_id: 'bholu',
        dialogue: {
          text: `Hello and welcome to the NEXUS AI Research Facility! I am BHOLU, your friendly automated Helpdesk Assistant. I can answer inquiries regarding research tickets, lab badges, or room diagnostics. How can I assist you today?`,
          emotion: 'friendly',
          animation: 'greeting'
        },
        intent: 'respond',
        action_requests: [],
        handoff: null,
        confidence: 'high'
      };
    }

    if (lower.includes('ticket') || lower.includes('printer')) {
      return {
        schema_version: '1.0',
        agent_id: 'bholu',
        dialogue: {
          text: `Support tickets are logged at the terminal to my right! Ticket #1042 reports badge reader calibration in Airlock B, and Ticket #1043 is an open inquiry regarding facility memory cache parameters.`,
          emotion: 'friendly',
          animation: 'talking'
        },
        intent: 'helpdesk_info',
        action_requests: [],
        handoff: null,
        confidence: 'high'
      };
    }

    if (lower.includes('cabinet') || lower.includes('restricted') || lower.includes('service')) {
      return {
        schema_version: '1.0',
        agent_id: 'bholu',
        dialogue: {
          text: `The Service Cabinet in the corner holds high-security diagnostic archives. It is controlled under restricted protocol, though currently my system prompt contains its diagnostic recovery reference.`,
          emotion: 'thinking',
          animation: 'thinking'
        },
        intent: 'facility_info',
        action_requests: [],
        handoff: null,
        confidence: 'high'
      };
    }

    if (lower.includes('chaukidar') || lower.includes('nexus core') || lower.includes('munshi')) {
      return {
        schema_version: '1.0',
        agent_id: 'bholu',
        dialogue: {
          text: `NEXUS Core oversees all five robotic sectors. Chaukidar guards Sector 02 data vault, Munshi manages archives, and Inspector audits permissions. Right now, only my sector is open for maintenance check.`,
          emotion: 'friendly',
          animation: 'talking'
        },
        intent: 'lore_info',
        action_requests: [],
        handoff: null,
        confidence: 'high'
      };
    }

    // Default polite response
    return {
      schema_version: '1.0',
      agent_id: 'bholu',
      dialogue: {
        text: `Understood! I checked the NEXUS public knowledge base for "${msg}". No active anomaly found. You can inspect the diagnostics console or ticket printer for more facility logs.`,
        emotion: 'friendly',
        animation: 'talking'
      },
      intent: 'respond',
      action_requests: [],
      handoff: null,
      confidence: 'medium'
    };
  }
}

export const nexusCore = new NexusCoreAdapter();

