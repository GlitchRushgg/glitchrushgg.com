// Synth audio — single shared AudioContext (Safari/iOS limit), music sequencer
// with lookahead, one SFX per action, levelled volumes (market study rec #5).

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
    this._rush = false;
    this._timer = null;
    this._step = 0;
    this._nextT = 0;
  }

  setMuted(m) {
    this.muted = m;
    Save.get().mute = m; Save.persist();
    if (m) this.stopMusic();
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

  /* ---------------- SFX ---------------- */
  jumpE()   { this._osc("square", 300, 560, null, 0.14, 0.05); }
  hopF()    { this._osc("sine", 620, 940, null, 0.12, 0.05); }
  flutter() { this._osc("sine", 880, 1400, null, 0.1, 0.04); this._noise(null, 0.06, 0.015, 4000); }
  star(combo = 1) {
    const penta = [523, 587, 659, 784, 880];
    this._osc("triangle", penta[Math.min(combo - 1, 4)], null, null, 0.12, 0.06, false);
  }
  sync(combo = 1) {
    const c = ac().currentTime;
    [660, 830, 990].forEach((f, i) => this._osc("triangle", f * (1 + combo * 0.04), null, c + i * 0.05, 0.18, 0.06, false));
  }
  hit()   { this._noise(null, 0.22, 0.09); this._osc("sawtooth", 200, 70, null, 0.25, 0.08); }
  heart() { const c = ac().currentTime; [523, 659, 784].forEach((f, i) => this._osc("sine", f, null, c + i * 0.07, 0.25, 0.06, false)); }
  shield(){ this._osc("sine", 240, 720, null, 0.35, 0.06); }
  dash()  { this._osc("sawtooth", 180, 640, null, 0.4, 0.07); this._noise(null, 0.2, 0.03, 1500); }
  fanfare() {
    const c = ac().currentTime;
    [523, 659, 784, 1046, 1318].forEach((f, i) => this._osc("triangle", f, null, c + i * 0.08, 0.3, 0.07, false));
  }
  revive() { const c = ac().currentTime; [392, 523, 659, 784].forEach((f, i) => this._osc("sine", f, null, c + i * 0.09, 0.3, 0.06, false)); }
  ui()    { this._osc("square", 700, 900, null, 0.06, 0.035); }
  deny()  { this._osc("square", 220, 160, null, 0.15, 0.05); }
  gameOver() {
    const c = ac().currentTime;
    [660, 520, 392, 262].forEach((f, i) => this._osc("triangle", f, null, c + i * 0.14, 0.3, 0.07, false));
  }

  /* ---------------- MUSIC (lookahead sequencer) ---------------- */
  startMusic() {
    if (this._musicOn) return;
    this._musicOn = true;
    this._step = 0;
    this._nextT = ac().currentTime + 0.06;
    this._timer = setInterval(() => this._tick(), 90);
  }
  stopMusic() {
    this._musicOn = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }
  setRush(on) { this._rush = on; }

  _tick() {
    if (!this._musicOn || this.muted) return;
    const c = ac();
    const bpm = this._rush ? 150 : 112;
    const spb = 60 / bpm / 2; // 8th notes
    while (this._nextT < c.currentTime + 0.25) {
      this._schedule(this._step, this._nextT);
      this._nextT += spb;
      this._step = (this._step + 1) % 32;
    }
  }

  _schedule(step, t) {
    // Two-bar bouncy loop: C — Am — F — G. Kick on beats, hats on off-beats.
    const CH = [
      [261.6, 329.6, 392.0], [220.0, 261.6, 329.6],
      [174.6, 220.0, 261.6], [196.0, 246.9, 293.7],
    ];
    const bar = Math.floor(step / 8) % 4;
    const inBar = step % 8;
    const chord = CH[bar];
    const vol = this._rush ? 0.045 : 0.035;
    // bass on 0 and 4
    if (inBar === 0 || inBar === 4) this._osc("triangle", chord[0] / 2, null, t, 0.22, vol * 1.6, false);
    // arpeggio
    const arp = chord[[0, 1, 2, 1, 0, 2, 1, 2][inBar]];
    this._osc(this._rush ? "square" : "triangle", arp * 2, null, t, 0.12, vol, false);
    // sparkle lead during rush
    if (this._rush && (inBar === 2 || inBar === 6)) this._osc("sine", arp * 4, null, t, 0.1, 0.03, false);
    // kick + hat
    if (inBar === 0 || inBar === 4) this._osc("sine", 120, 45, t, 0.12, 0.09);
    if (inBar % 2 === 1) this._noise(t, 0.03, 0.012, 6000);
  }
}
