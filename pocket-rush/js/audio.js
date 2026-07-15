/* ============================================================
   Procedural WebAudio SFX — zero audio files.
   Pocket sinks climb a pentatonic scale as the combo grows
   (the classic "cascade feels musical" trick). Cue strikes and
   rail bounces are short filtered-noise clacks.
   ============================================================ */
PR.Audio = (function () {
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

    /* cue strike — power 0..1 sets punch */
    strike: (p) => { noise(0.05, 0.05 + 0.09 * p, 2600); beep(150 + 90 * p, 0.06, 'triangle', 0.05, 70); },
    /* ball-ball clack — pitched up slightly by combo depth */
    click:  (chain) => { noise(0.035, 0.06, 3400 + Math.min(6, chain || 0) * 300); },
    /* cushion bounce */
    rail:   () => { noise(0.04, 0.04, 1400); },
    /* pocket sink — pentatonic climb by combo index */
    pocket: (chain) => {
      const i = Math.min(PENTA.length - 1, Math.max(0, (chain || 1) - 1));
      beep(PENTA[i], 0.16, 'sine', 0.08);
      beep(PENTA[i] * 2, 0.12, 'triangle', 0.03);
      noise(0.05, 0.04, 900);
    },
    golden: () => [659, 880, 1046, 1318].forEach((f, i) =>
                setTimeout(() => beep(f, 0.18, 'sine', 0.07), i * 70)),
    scratch:() => { beep(180, 0.3, 'sawtooth', 0.06, 60); noise(0.18, 0.07, 500); },
    clear:  () => [523, 659, 784].forEach((f, i) =>
                setTimeout(() => beep(f, 0.16, 'sine', 0.07), i * 80)),
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
