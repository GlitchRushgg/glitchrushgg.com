// Generates simple tones using the Web Audio API as placeholders
// for happy, kid-friendly sound effects.
export default class SoundManager {
  constructor() {
    this._ctx = null;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  _beep(frequency, duration, type = 'sine', volume = 0.3) {
    try {
      const ctx = this._getCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (_) {
      // Audio not available — silent fallback
    }
  }

  _melody(notes, noteLen = 0.12) {
    try {
      const ctx = this._getCtx();
      notes.forEach(([freq, offset]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + noteLen);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + noteLen + 0.02);
      });
    } catch (_) {}
  }

  // Bright happy collect sound — pitch rises with the combo multiplier
  collect(combo = 1) {
    const m = 1 + 0.12 * Math.min(combo - 1, 6);
    this._melody([
      [523 * m, 0],
      [659 * m, 0.1],
      [784 * m, 0.2],
    ]);
  }

  // Soft jump blip
  jump() {
    this._beep(290, 0.09, 'triangle', 0.14);
    this._beep(440, 0.07, 'sine', 0.1);
  }

  // Pair matched — cheerful ding-dong
  pairMatched() {
    this._melody([
      [659, 0],
      [784, 0.12],
      [1047, 0.24],
      [1319, 0.36],
    ], 0.15);
  }

  // Animal delivered to ark
  deliver() {
    this._melody([
      [392, 0],
      [523, 0.1],
      [659, 0.2],
      [784, 0.3],
      [1047, 0.42],
    ], 0.18);
  }

  // Wrong match / missed
  wrong() {
    this._beep(220, 0.25, 'sawtooth', 0.2);
    setTimeout(() => this._beep(180, 0.2, 'sawtooth', 0.15), 200);
  }

  // Lost a life — descending chromatic jingle + low thud
  loseLife() {
    this._melody([
      [440, 0], [392, 0.13], [349, 0.26],
      [311, 0.40], [277, 0.55], [247, 0.72],
    ], 0.18);
    this._beep(85, 0.6, 'sawtooth', 0.30);
  }

  // Victory fanfare
  win() {
    this._melody([
      [523, 0], [659, 0.15], [784, 0.3],
      [1047, 0.45], [784, 0.65], [1047, 0.8],
      [1319, 0.95], [1047, 1.15], [1319, 1.3],
    ], 0.2);
  }

  // Bouncy platform — spring boing
  bounce() {
    this._melody([[349, 0], [523, 0.09], [784, 0.18], [1047, 0.27]], 0.12);
  }

  // Button tap
  tap() {
    this._beep(880, 0.06, 'sine', 0.15);
  }

  // ── Background music ────────────────────────────────────────────────
  startMusic() {
    if (this._musicOn) return;
    this._musicOn = true;
    try {
      const ctx  = this._getCtx();
      // Happy pentatonic loop: G A C D E C D G
      const seq  = [392, 440, 523, 587, 659, 523, 587, 392, 440, 523, 659, 784, 659, 523, 440, 392];
      const step = 0.26; // seconds per note
      const loopDur = seq.length * step;
      let next = ctx.currentTime + 0.05;

      const schedLoop = () => {
        if (!this._musicOn) return;
        seq.forEach((freq, i) => {
          const t = next + i * step;
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.07, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.8);
          o.start(t); o.stop(t + step);
        });
        next += loopDur;
        this._musicTimer = setTimeout(schedLoop, (loopDur - 0.15) * 1000);
      };
      schedLoop();
    } catch (_) {}
  }

  stopMusic() {
    this._musicOn = false;
    clearTimeout(this._musicTimer);
  }
}
