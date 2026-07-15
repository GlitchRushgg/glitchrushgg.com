/* ============================================================
   Procedural WebAudio SFX — zero audio files.
   Coin pickups climb a pentatonic scale as the Drift Rush
   multiplier grows (the classic "cascade feels musical" trick).
   Skids and crashes are shaped filtered noise.
   ============================================================ */
GL.Audio = (function () {
  let ctx, enabled = true;
  const PENTA = [261.6, 293.7, 329.6, 392.0, 440.0,
                 523.3, 587.3, 659.3, 784.0, 880.0]; // C-pentatonic, 2 octaves

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function resume() { try { ac().resume(); } catch (e) {} }

  function beep(f, dur, type, vol, slideTo) {
    if (!enabled) return;
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.value = f;
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
      g.gain.value = vol || 0.05;
      o.connect(g); g.connect(c.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.stop(c.currentTime + dur);
    } catch (e) {}
  }

  function noise(dur, vol, lp) {
    if (!enabled) return;
    try {
      const c = ac(), n = (c.sampleRate * dur) | 0;
      const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(); s.buffer = buf;
      const g = c.createGain(); g.gain.value = vol || 0.12;
      if (lp) {
        const f = c.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = lp;
        s.connect(f); f.connect(g);
      } else s.connect(g);
      g.connect(c.destination); s.start();
    } catch (e) {}
  }

  return {
    resume,
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; },

    /* ignition — every run starts with a little vroom */
    start:  () => { noise(0.25, 0.06, 400); beep(70, 0.5, 'sawtooth', 0.05, 220); },
    /* coin pickup — rush multiplier picks the pentatonic step */
    coin:   (rush) => {
      const i = Math.min(PENTA.length - 1, Math.max(0, (rush || 1) - 1) * 2);
      beep(PENTA[i], 0.09, 'sine', 0.06);
      beep(PENTA[i] * 2, 0.06, 'triangle', 0.025);
    },
    /* short skid tick while drifting on the edge */
    spark:  () => noise(0.05, 0.03, 2200),
    corner: () => [659, 880, 1046].forEach((f, i) =>
                setTimeout(() => beep(f, 0.15, 'sine', 0.07), i * 70)),
    zone:   () => { beep(392, 0.2, 'sine', 0.05); setTimeout(() => beep(523, 0.25, 'sine', 0.05), 110); },
    crash:  () => { beep(200, 0.5, 'sawtooth', 0.07, 50); noise(0.35, 0.12, 700); },
    insurance: () => beep(330, 0.3, 'sine', 0.07, 990),
    ghostBeat: () => [523, 659, 784, 1046, 1318].forEach((f, i) =>
                setTimeout(() => beep(f, 0.16, 'sine', 0.06), i * 80)),
    golden: () => [659, 880, 1046, 1318].forEach((f, i) =>
                setTimeout(() => beep(f, 0.18, 'sine', 0.07), i * 70)),
    cash:   () => { beep(880, 0.05, 'square', 0.03); setTimeout(() => beep(1174, 0.08, 'square', 0.03), 40); },
    best:   () => [523, 659, 784, 1046].forEach((f, i) =>
                setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
    prestige: () => {
      beep(60, 1.4, 'sine', 0.11, 30);
      [440, 587, 740, 880].forEach((f, i) => setTimeout(() => beep(f, 0.3, 'sine', 0.05), i * 150));
    },
    tap:  () => beep(600, 0.05, 'square', 0.04),
    deny: () => beep(140, 0.15, 'square', 0.05),
  };
})();
