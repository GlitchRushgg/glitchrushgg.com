/* ============================================================
   Procedural WebAudio SFX — zero audio files.
   Merge blips climb a pentatonic scale as the combo chain grows
   (the classic "cascade feels musical" trick).
   ============================================================ */
MD.Audio = (function () {
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
    /* merge blip — chain index picks the pentatonic step */
    merge: (chain, tier) => {
      const i = Math.min(PENTA.length - 1, (chain - 1));
      beep(PENTA[i] * (1 + tier * 0.02), 0.14, 'sine', 0.07);
      beep(PENTA[i] * 2, 0.1, 'triangle', 0.03);
    },
    land:  () => noise(0.06, 0.07, 500),
    drop:  () => beep(320, 0.05, 'square', 0.025),
    discover: () => [523, 659, 784].forEach((f, i) =>
                 setTimeout(() => beep(f, 0.16, 'sine', 0.06), i * 80)),
    best:  () => [523, 659, 784, 1046].forEach((f, i) =>
                 setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
    over:  () => { beep(220, 0.6, 'sawtooth', 0.06, 60); noise(0.35, 0.1, 800); },
    blackhole: () => {
      beep(60, 1.6, 'sine', 0.12, 30);           // bass swell
      noise(1.2, 0.06, 300);
      [880, 660, 440, 220].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'sine', 0.04), i * 160));
    },
    bhEnd: () => beep(80, 0.5, 'sine', 0.1, 500),
    click: () => beep(600, 0.05, 'square', 0.04),
    deny:  () => beep(140, 0.15, 'square', 0.05),
    revive:() => beep(200, 0.35, 'sine', 0.07, 900),
  };
})();
