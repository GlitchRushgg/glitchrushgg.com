// Audio 100% sintetizado con Web Audio API. Un ÚNICO AudioContext compartido
// entre escenas (Safari/iOS limita ~4 por página). SFX + música con lookahead.

import { Save } from "./Save.js";

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

  shoot() { this._beep(760, 0.045, "square", 0.045, 0, 500); }
  bounce() { this._beep(1150, 0.04, "triangle", 0.06); }
  hitEnemy() { this._noise(0.03, 0.05); }
  kill() {
    this._beep(300, 0.09, "sawtooth", 0.1, 0, 120);
    this._noise(0.06, 0.07);
  }
  gem() { this._beep(1320, 0.05, "triangle", 0.08); }
  coin() {
    this._beep(1180, 0.06, "square", 0.09);
    this._beep(1760, 0.1, "square", 0.07, this.ctx ? this.ctx.currentTime + 0.06 : 0);
  }
  hurt() {
    this._beep(180, 0.22, "sawtooth", 0.2, 0, 70);
    this._noise(0.15, 0.12);
  }
  levelUp() {
    [520, 660, 880, 1100].forEach((f, i) =>
      this._beep(f, 0.13, "triangle", 0.16, this.ctx ? this.ctx.currentTime + i * 0.08 : 0));
  }
  pick() { this._beep(880, 0.1, "sine", 0.14, 0, 1320); }
  elite() {
    this._beep(140, 0.3, "sawtooth", 0.16, 0, 90);
    this._beep(140, 0.3, "sawtooth", 0.14, this.ctx ? this.ctx.currentTime + 0.18 : 0, 90);
  }
  death() {
    this._noise(0.3, 0.18);
    [392, 311, 233, 116].forEach((f, i) =>
      this._beep(f, 0.24, "sawtooth", 0.15, this.ctx ? this.ctx.currentTime + i * 0.13 : 0));
  }
  ui() { this._beep(880, 0.05, "square", 0.07); }

  // ---- Música: pulso oscuro con hats, sube de intensidad con el minutero ----

  startMusic() {
    const ctx = this._ensure();
    if (!ctx || this._musicTimer) return;
    this._step = 0;
    this._nextT = ctx.currentTime + 0.06;
    const BASS = [43.7, 0, 43.7, 0, 65.4, 0, 43.7, 58.3];   // Fa1/Do2/Sib1
    const STEP = 0.125; // 120 BPM en corcheas
    this._musicTimer = setInterval(() => {
      if (!sharedCtx) return;
      while (this._nextT < sharedCtx.currentTime + 0.15) {
        const s = this._step % 8;
        const bar = Math.floor(this._step / 8);
        const b = BASS[s];
        if (b) this._beep(b, STEP * 0.95, "sawtooth", 0.05, this._nextT);
        if (s % 2 === 1) this._noise(0.025, 0.024, this._nextT);
        if (bar % 2 === 1 && (s === 3 || s === 7)) this._beep(174.6, STEP * 0.6, "square", 0.02, this._nextT);
        this._nextT += STEP;
        this._step++;
      }
    }, 40);
  }

  stopMusic() {
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
  }
}
