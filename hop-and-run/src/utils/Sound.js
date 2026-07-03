// 100% synthesized Web Audio: SFX + upbeat music loop + GUITAR SOLO power riff.
// Single shared AudioContext (Safari/iOS caps ~4 per page).

import { Save } from "./Save.js";

let sharedCtx = null;

export class Sound {
  constructor() {
    this.muted = Save.muted();
    this._musicTimer = null;
    this._step = 0;
    this._nextT = 0;
    this._solo = false;
  }

  get ctx() { return sharedCtx; }

  setMuted(b) {
    this.muted = b;
    Save.setMuted(b);
  }

  _ensure() {
    if (!sharedCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) sharedCtx = new AC();
    }
    if (sharedCtx && sharedCtx.state === "suspended") sharedCtx.resume();
    return sharedCtx;
  }

  _beep(freq, dur = 0.1, type = "sine", gain = 0.15, when = 0, slideTo = 0) {
    if (this.muted) return;
    const ctx = this._ensure();
    if (!ctx) return;
    const t0 = when || ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Distorted "electric guitar" note: stacked detuned saws through a soft clip.
  _guitar(freq, dur = 0.22, gain = 0.09, when = 0) {
    if (this.muted) return;
    const ctx = this._ensure();
    if (!ctx) return;
    const t0 = when || ctx.currentTime;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(3.2 * x);
    }
    shaper.curve = curve;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    shaper.connect(g).connect(ctx.destination);
    [0, 6, -6].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(freq, t0);
      o.detune.setValueAtTime(cents, t0);
      o.connect(shaper);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    });
  }

  _noise(dur = 0.05, gain = 0.08, when = 0) {
    if (this.muted) return;
    const ctx = this._ensure();
    if (!ctx) return;
    const t0 = when || ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g).connect(ctx.destination);
    src.start(t0);
  }

  // ---- SFX ----

  jump() { this._beep(430, 0.09, "sine", 0.15, 0, 700); }
  land() { this._beep(220, 0.05, "sine", 0.08); }
  fruit() {
    this._beep(980, 0.06, "triangle", 0.16);
    this._beep(1470, 0.1, "sine", 0.12, this.ctx ? this.ctx.currentTime + 0.05 : 0);
  }
  animal(combo = 1) {
    const base = 620 + Math.min(combo, 10) * 40;
    this._beep(base, 0.08, "triangle", 0.18);
    this._beep(base * 1.33, 0.1, "triangle", 0.15, this.ctx ? this.ctx.currentTime + 0.06 : 0);
    this._beep(base * 1.66, 0.14, "sine", 0.13, this.ctx ? this.ctx.currentTime + 0.12 : 0);
  }
  trip() {
    this._beep(190, 0.2, "sawtooth", 0.18, 0, 80);
    this._noise(0.12, 0.1);
  }
  skate() {
    this._beep(520, 0.1, "square", 0.13);
    this._beep(780, 0.14, "square", 0.11, this.ctx ? this.ctx.currentTime + 0.09 : 0);
  }
  soloStart() {
    // Power chord fanfare: E5 chord crunch.
    const t = this.ctx ? this.ctx.currentTime : 0;
    this._guitar(82.4, 0.5, 0.12, t);
    this._guitar(123.5, 0.5, 0.1, t);
    this._guitar(164.8, 0.45, 0.09, t + 0.02);
    this._noise(0.2, 0.1, t);
  }
  lowEnergy() { this._beep(300, 0.1, "square", 0.07); }
  gameOver() {
    [523, 392, 311, 196].forEach((f, i) =>
      this._beep(f, 0.24, "triangle", 0.18, this.ctx ? this.ctx.currentTime + i * 0.15 : 0));
  }
  ui() { this._beep(880, 0.05, "square", 0.07); }

  // ---- Music: upbeat rooftop-runner loop; guitar riff during the solo ----

  setSolo(on) { this._solo = on; }

  startMusic() {
    const ctx = this._ensure();
    if (!ctx || this._musicTimer) return;
    this._step = 0;
    this._nextT = ctx.currentTime + 0.06;
    const BASS = [98, 0, 130.8, 98, 146.8, 0, 130.8, 98];        // G2 C3 D3 walk
    const LEAD = [392, 0, 523.3, 0, 587.3, 523.3, 0, 392];       // cheerful pentatonic
    const RIFF = [164.8, 164.8, 196, 164.8, 220, 196, 164.8, 246.9]; // E-riff for solo
    const STEP = 0.125; // 120 BPM eighths
    this._musicTimer = setInterval(() => {
      if (!sharedCtx) return;
      while (this._nextT < sharedCtx.currentTime + 0.15) {
        const s = this._step % 8;
        const bar = Math.floor(this._step / 8);
        if (this._solo) {
          const r = RIFF[s];
          if (r) this._guitar(r, STEP * 0.95, 0.085, this._nextT);
          if (s % 2 === 0) this._noise(0.03, 0.05, this._nextT);
        } else {
          const b = BASS[s];
          if (b) this._beep(b, STEP * 0.9, "triangle", 0.07, this._nextT);
          if (s % 2 === 1) this._noise(0.025, 0.022, this._nextT);
          if (bar % 2 === 1 && LEAD[s]) this._beep(LEAD[s], STEP * 0.7, "square", 0.028, this._nextT);
        }
        this._nextT += STEP;
        this._step++;
      }
    }, 40);
  }

  stopMusic() {
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
    this._solo = false;
  }
}
