/* ============================================================
   Procedural WebAudio SFX — zero audio files.
   Each link in a chain plays the next step of a pentatonic
   scale, so long chains literally play a melody.
   ============================================================ */
VL.Audio = (function () {
  let ctx, enabled = true;
  const PENTA = [261.6, 293.7, 329.6, 392.0, 440.0,
                 523.3, 587.3, 659.3, 784.0, 880.0,
                 1046.5, 1174.7, 1318.5, 1568.0, 1760.0]; // C-pentatonic, 3 octaves

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
    /* rising note per link — i = chain index */
    link:  (i) => beep(PENTA[Math.min(PENTA.length - 1, i)], 0.09, 'sine', 0.06),
    unlink:() => beep(200, 0.05, 'sine', 0.03),
    merge: (len) => {
      beep(PENTA[Math.min(PENTA.length - 1, len)] * 1.5, 0.18, 'triangle', 0.07);
      noise(0.08, 0.05, 900);
    },
    orb:   () => [660, 880, 1320].forEach((f, i) =>
             setTimeout(() => beep(f, 0.2, 'sine', 0.06), i * 70)),
    surge: () => {
      noise(0.5, 0.25, 2400);                 // thunder crack
      beep(90, 0.9, 'sawtooth', 0.1, 30);     // rumble
      [1200, 900, 600].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'square', 0.04), i * 90));
    },
    land:  () => noise(0.04, 0.04, 500),
    best:  () => [523, 659, 784, 1046].forEach((f, i) =>
             setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
    over:  () => { beep(220, 0.6, 'sawtooth', 0.06, 60); noise(0.3, 0.08, 700); },
    hammer:() => { noise(0.1, 0.16, 1500); beep(150, 0.12, 'square', 0.06, 60); },
    revive:() => beep(200, 0.35, 'sine', 0.07, 900),
    click: () => beep(600, 0.05, 'square', 0.04),
    deny:  () => beep(140, 0.15, 'square', 0.05),
  };
})();
