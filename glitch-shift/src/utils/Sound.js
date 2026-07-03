// Audio 100% sintetizado con Web Audio API (sin archivos): SFX + música synth
// con un secuenciador de lookahead. Mute persistente vía Save.

import { Save } from "./Save.js";

// Un ÚNICO AudioContext compartido entre todas las escenas: Safari/iOS limita a
// ~4 contextos por página y cada escena crea su propio Sound (fuga detectada en QA).
let sharedCtx = null;

export class Sound {
  constructor() {
    this.muted = Save.muted();
    this._musicTimer = null;
    this._step = 0;
    this._nextT = 0;
  }

  get ctx() {
    return sharedCtx;
  }

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

  // Bip básico. Con "when" (tiempo absoluto del ctx) se puede secuenciar.
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

  // Golpe de ruido blanco corto (hi-hat / zap).
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

  // Cambio de realidad: zap ascendente + chispa de ruido.
  shift(rail) {
    const base = rail === 0 ? 660 : 440; // arriba agudo, abajo grave
    this._beep(base, 0.07, "square", 0.1, 0, base * 2);
    this._noise(0.04, 0.06);
  }

  pick() {
    this._beep(1180, 0.06, "triangle", 0.14);
    this._beep(1560, 0.09, "sine", 0.1, this.ctx ? this.ctx.currentTime + 0.05 : 0);
  }

  near() {
    this._beep(320, 0.12, "sawtooth", 0.08, 0, 900);
    this._noise(0.08, 0.05);
  }

  shield() {
    this._beep(520, 0.12, "triangle", 0.16);
    this._beep(780, 0.16, "triangle", 0.14, this.ctx ? this.ctx.currentTime + 0.09 : 0);
  }

  overclockOn() { this._beep(220, 0.25, "sine", 0.1, 0, 110); }
  overclockOff() { this._beep(110, 0.15, "sine", 0.08, 0, 220); }

  sector() {
    [660, 880, 1320].forEach((f, i) =>
      this._beep(f, 0.14, "triangle", 0.14, this.ctx ? this.ctx.currentTime + i * 0.09 : 0)
    );
  }

  death() {
    this._noise(0.25, 0.18);
    [440, 330, 220, 110].forEach((f, i) =>
      this._beep(f, 0.2, "sawtooth", 0.14, this.ctx ? this.ctx.currentTime + i * 0.11 : 0)
    );
  }

  ui() { this._beep(880, 0.05, "square", 0.07); }

  // ---- Música (secuenciador synth con lookahead) ----

  startMusic() {
    const ctx = this._ensure();
    if (!ctx || this._musicTimer) return;
    this._step = 0;
    this._nextT = ctx.currentTime + 0.06;
    const BASS = [55, 0, 55, 82.4, 0, 55, 98, 73.4];   // La1 / Do2 / Sol1 / Re2
    const LEAD = [0, 0, 440, 0, 0, 523, 0, 587];
    const STEP = 0.135; // ~111 BPM en corcheas
    this._musicTimer = setInterval(() => {
      if (!this.ctx) return;
      while (this._nextT < this.ctx.currentTime + 0.15) {
        const s = this._step % 8;
        const bar = Math.floor(this._step / 8);
        const b = BASS[s];
        if (b) this._beep(b, STEP * 0.9, "sawtooth", 0.055, this._nextT);
        if (s % 2 === 1) this._noise(0.03, 0.028, this._nextT);          // hat a contratiempo
        if (bar % 4 === 3 && LEAD[s]) this._beep(LEAD[s], STEP * 0.8, "square", 0.03, this._nextT);
        this._nextT += STEP;
        this._step++;
      }
    }, 40);
  }

  stopMusic() {
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
  }
}
