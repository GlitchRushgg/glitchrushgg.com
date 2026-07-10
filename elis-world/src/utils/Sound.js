// Gentle synth audio — music-box loop + one soft SFX per interaction.
// Single shared AudioContext.

import { Save } from "./Save.js";

let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export class Sound {
  constructor() {
    this.muted = Save.get().mute;
    this._musicOn = false;
    this._timer = null;
    this._step = 0;
    this._nextT = 0;
    this._water = null;
  }

  setMuted(m) {
    this.muted = m;
    Save.get().mute = m; Save.persist();
    if (m) { this.stopMusic(); this.waterOff(); }
  }
  resume() { try { ac().resume(); } catch (e) {} }

  _osc(type, f0, f1, t0, dur, vol, slide = true) {
    if (this.muted) return;
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = type;
      const start = t0 ?? c.currentTime;
      o.frequency.setValueAtTime(f0, start);
      if (f1 && slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), start + dur);
      g.gain.setValueAtTime(vol, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g); g.connect(c.destination);
      o.start(start); o.stop(start + dur + 0.02);
    } catch (e) {}
  }
  _noise(t0, dur, vol, hp = 0) {
    if (this.muted) return;
    try {
      const c = ac(), start = t0 ?? c.currentTime;
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = c.createBufferSource(); s.buffer = buf;
      const g = c.createGain(); g.gain.value = vol;
      let node = s;
      if (hp) { const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; s.connect(f); node = f; }
      node.connect(g); g.connect(c.destination);
      s.start(start);
    } catch (e) {}
  }

  /* ---------- SFX ---------- */
  pick()   { this._osc("sine", 500, 760, null, 0.09, 0.05); }
  drop()   { this._osc("sine", 420, 300, null, 0.12, 0.05); }
  giggle() {
    const c = ac().currentTime;
    const base = 620 + Math.random() * 200;
    [0, 1, 2].forEach((i) => this._osc("triangle", base + i * 120, null, c + i * 0.07, 0.1, 0.055, false));
  }
  munch()  { this._noise(null, 0.08, 0.05, 900); this._osc("triangle", 240, 160, null, 0.1, 0.05); }
  sizzle() { this._noise(null, 0.5, 0.035, 3200); }
  splash() { this._noise(null, 0.16, 0.05, 1400); this._osc("sine", 800, 350, null, 0.16, 0.035); }
  hang()   { this._osc("triangle", 660, null, null, 0.16, 0.05, false); this._osc("triangle", 990, null, null, 0.2, 0.03, false); }
  swoosh() { this._noise(null, 0.22, 0.04, 500); }
  boing()  { this._osc("sine", 240, 720, null, 0.24, 0.06); }
  cuckoo() {
    const c = ac().currentTime;
    this._osc("square", 740, null, c, 0.14, 0.045, false);
    this._osc("square", 590, null, c + 0.18, 0.18, 0.045, false);
  }
  whirr()  { this._osc("sawtooth", 90, 240, null, 0.5, 0.04); this._noise(null, 0.45, 0.02, 2000); }
  chime()  { const c = ac().currentTime; [880, 1174, 1568].forEach((f, i) => this._osc("sine", f, null, c + i * 0.09, 0.4, 0.035, false)); }
  fanfare(){ const c = ac().currentTime; [523, 659, 784, 1046].forEach((f, i) => this._osc("triangle", f, null, c + i * 0.09, 0.3, 0.055, false)); }
  zzz()    { const c = ac().currentTime; [520, 470, 420].forEach((f, i) => this._osc("sine", f, null, c + i * 0.24, 0.3, 0.03, false)); }
  ui()     { this._osc("sine", 700, 880, null, 0.07, 0.04); }

  waterOn() {
    if (this.muted || this._water) return;
    try {
      const c = ac();
      const len = c.sampleRate * 1;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 0.6;
      const g = c.createGain(); g.gain.value = 0.035;
      s.connect(f); f.connect(g); g.connect(c.destination);
      s.start();
      this._water = s;
    } catch (e) {}
  }
  waterOff() {
    if (this._water) { try { this._water.stop(); } catch (e) {} this._water = null; }
  }

  /* ---------- music box ---------- */
  startMusic() {
    if (this._musicOn) return;
    this._musicOn = true;
    this._step = 0;
    this._nextT = ac().currentTime + 0.1;
    this._timer = setInterval(() => this._tick(), 120);
  }
  stopMusic() {
    this._musicOn = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }
  _tick() {
    if (!this._musicOn || this.muted) return;
    const c = ac();
    const spb = 60 / 84 / 2; // 84 bpm, corcheas — tranquilo, de cajita de música
    while (this._nextT < c.currentTime + 0.3) {
      this._schedule(this._step, this._nextT);
      this._nextT += spb;
      this._step = (this._step + 1) % 32;
    }
  }
  _schedule(step, t) {
    // C — G/B — Am — F, arpegio dulce de "music box" (senos con armónico).
    const CH = [
      [261.6, 329.6, 392.0], [246.9, 293.7, 392.0],
      [220.0, 261.6, 329.6], [174.6, 220.0, 261.6],
    ];
    const bar = Math.floor(step / 8) % 4;
    const inBar = step % 8;
    const chord = CH[bar];
    const seq = [0, 2, 1, 2, 0, 2, 1, 2];
    const note = chord[seq[inBar]] * 2;
    this._osc("sine", note, null, t, 0.5, 0.028, false);
    this._osc("sine", note * 2, null, t, 0.28, 0.012, false);
    if (inBar === 0) this._osc("sine", chord[0], null, t, 0.9, 0.02, false);
  }
}
