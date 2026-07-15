/* ============================================================
   Procedural WebAudio SFX — zero audio files.
   Metallic clangs pitched by metal tier; cascades play a
   rising arpeggio. All synthesized.
   ============================================================ */
MF.Audio = (function () {
  let ctx, enabled = true;
  const PENTA = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0, 880.0];

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

  /* two detuned oscillators = metallic ring */
  function clangTone(f, dur, vol) {
    if (!enabled) return;
    try {
      const c = ac(), g = c.createGain();
      g.gain.value = vol;
      g.connect(c.destination);
      [1, 1.508].forEach(mul => {          // inharmonic partial = bell/metal
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f * mul;
        o.connect(g);
        o.start();
        o.stop(c.currentTime + dur);
      });
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
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
    place:  () => { noise(0.05, 0.08, 600); beep(140, 0.06, 'square', 0.03); },
    /* smelt clang — pitch rises with the forged tier */
    smelt:  (tier) => { clangTone(220 + tier * 70, 0.35, 0.06); noise(0.08, 0.05, 1400); },
    /* cascade arpeggio step */
    chain:  (step) => beep(PENTA[Math.min(PENTA.length - 1, step + 2)], 0.12, 'sine', 0.05),
    line:   (n) => {
      noise(0.18, 0.12, 2000);
      [523, 659, 784].slice(0, Math.min(3, n + 1)).forEach((f, i) =>
        setTimeout(() => beep(f, 0.14, 'sine', 0.06), i * 70));
    },
    star:   () => {                       // Starmetal jackpot
      clangTone(880, 0.8, 0.08);
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        setTimeout(() => beep(f, 0.2, 'sine', 0.06), i * 100));
      noise(0.5, 0.1, 3000);
    },
    invalid:() => beep(140, 0.1, 'square', 0.04),
    pick:   () => beep(400, 0.04, 'square', 0.03),
    over:   () => { beep(220, 0.7, 'sawtooth', 0.06, 55); noise(0.4, 0.1, 600); },
    best:   () => [523, 659, 784, 1046].forEach((f, i) =>
              setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
    hammer: () => { noise(0.12, 0.18, 1200); clangTone(160, 0.25, 0.07); },
    revive: () => beep(200, 0.4, 'sine', 0.07, 900),
    click:  () => beep(600, 0.05, 'square', 0.04),
    deny:   () => beep(140, 0.15, 'square', 0.05),
  };
})();
