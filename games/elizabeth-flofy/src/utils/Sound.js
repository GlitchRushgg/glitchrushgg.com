// Sonido sintetizado con Web Audio API (sin archivos de audio), estilo Noah.
// Una instancia por GameScene. Silencio si el navegador bloquea el contexto.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  // Un bip simple. type: 'sine'|'square'|'triangle'|'sawtooth'
  _beep(freq, dur = 0.1, type = "sine", gain = 0.18) {
    if (this.muted) return;
    const ctx = this._ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  // Purificación: arpegio ascendente alegre.
  purify(combo = 1) {
    const base = 520 + Math.min(combo, 12) * 30;
    this._beep(base, 0.08, "triangle", 0.2);
    setTimeout(() => this._beep(base * 1.25, 0.09, "triangle", 0.18), 50);
    setTimeout(() => this._beep(base * 1.5, 0.12, "sine", 0.16), 110);
  }

  // El glitch aparece: bip disonante corto.
  glitchSpawn() {
    this._beep(180, 0.06, "square", 0.08);
  }

  // Un glitch se escapa / pierdes corazón.
  hurt() {
    this._beep(200, 0.18, "sawtooth", 0.2);
    setTimeout(() => this._beep(120, 0.22, "sawtooth", 0.2), 90);
  }

  // Abrazo total (mega).
  mega() {
    [0, 90, 180, 270].forEach((d, i) =>
      setTimeout(() => this._beep(440 + i * 160, 0.16, "triangle", 0.22), d)
    );
  }

  // Power-up de la familia.
  powerup() {
    this._beep(660, 0.1, "sine", 0.2);
    setTimeout(() => this._beep(990, 0.16, "sine", 0.18), 90);
  }

  gameOver() {
    [660, 520, 392, 262].forEach((f, i) =>
      setTimeout(() => this._beep(f, 0.22, "triangle", 0.2), i * 160)
    );
  }
}
