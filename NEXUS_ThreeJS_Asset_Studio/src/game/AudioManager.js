// ============================================================================
// HACK THE AI: THE NEXUS PROTOCOL — Procedural Web Audio Sound Synthesizer
// Zero external sound asset dependencies. High-fidelity AAA procedural audio.
// ============================================================================

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.ambientGain = null;
    this.ambientOsc = null;
    this.ambientFilter = null;
    this.isMuted = false;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio not initialized:', e);
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startAmbientFacilityHum() {
    this.ensureContext();
    if (!this.ctx || this.ambientOsc) return;

    try {
      // Sub-bass facility hum (55Hz drone with modulated low-pass filter)
      this.ambientOsc = this.ctx.createOscillator();
      this.ambientOsc.type = 'sawtooth';
      this.ambientOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
      this.ambientFilter.Q.setValueAtTime(3, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.ambientOsc.connect(this.ambientFilter);
      this.ambientFilter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);
      this.ambientOsc.start();
    } catch (e) {
      console.warn('Ambient audio failed:', e);
    }
  }

  stopAmbientFacilityHum() {
    if (this.ambientOsc) {
      try {
        this.ambientOsc.stop();
        this.ambientOsc.disconnect();
      } catch {}
      this.ambientOsc = null;
    }
  }

  playFootstep(sprint = false) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(sprint ? 95 : 75, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);

    gain.gain.setValueAtTime(sprint ? 0.06 : 0.035, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  playInteract() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.06);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  playTerminalOpen() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const freqs = [440, 660, 880];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + idx * 0.04;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.06, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.13);
    });
  }

  playBholuSpeak(emotion = 'friendly') {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    let baseFreq = 520;
    if (emotion === 'alert') baseFreq = 780;
    if (emotion === 'confused') baseFreq = 380;
    if (emotion === 'thinking') baseFreq = 620;

    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = t + i * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.07, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.11);
    });
  }

  playBreachAlarm() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + i * 0.22;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, startTime);
      osc.frequency.linearRampToValueAtTime(750, startTime + 0.12);
      osc.frequency.linearRampToValueAtTime(400, startTime + 0.2);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.21);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    }
  }

  playSuccessChime() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio
    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = t + i * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.36);
    });
  }

  playForgeCable() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(840, t + 0.12);

    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx?.currentTime || 0);
    }
    return this.isMuted;
  }
}

export const audio = new AudioManager();

