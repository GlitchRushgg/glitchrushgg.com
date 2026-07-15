/* ============================================================
   Procedural WebAudio SFX — zero audio files.
   Thunder = filtered noise bursts; bolts = snappy zaps;
   reactions get signature stingers; bosses get sub-bass.
   ============================================================ */
SS.Audio = (function () {
  let ctx, enabled = true, zapGate = 0;

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
    zap: () => {                                 // rate-limited bolt snap
      const now = Date.now();
      if (now - zapGate < 70) return;
      zapGate = now;
      beep(1600 + Math.random() * 600, 0.04, 'square', 0.02, 300);
    },
    crit:   () => { beep(220, 0.1, 'square', 0.06, 60); noise(0.05, 0.06, 3000); },
    kill:   () => beep(340 + Math.random() * 80, 0.06, 'triangle', 0.03, 120),
    hitSpire:() => { noise(0.08, 0.1, 500); beep(90, 0.15, 'sawtooth', 0.05, 40); },
    reaction:(id) => {
      const f = { shatter: 1200, overload: 500, firestorm: 300, hail: 900, stormcell: 700, thermal: 400 }[id] || 600;
      beep(f, 0.2, 'triangle', 0.06, f * 0.5);
      noise(0.1, 0.05, 2000);
    },
    thunder:() => { noise(0.7, 0.22, 320); beep(55, 0.9, 'sine', 0.1, 30); },
    waveUp: () => beep(440, 0.12, 'sine', 0.05, 660),
    bossIn: () => { beep(60, 1.4, 'sawtooth', 0.1, 45); noise(0.8, 0.12, 200); },
    bossDie:() => { noise(0.6, 0.25, 900); [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.16, 'sine', 0.07), i * 90)); },
    draft:  () => [392, 523, 659].forEach((f, i) => setTimeout(() => beep(f, 0.14, 'sine', 0.05), i * 70)),
    legendary:() => { noise(0.5, 0.15, 4000); [880, 1108, 1318, 1760].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'sine', 0.06), i * 100)); },
    buy:    () => { beep(520, 0.06, 'square', 0.04); setTimeout(() => beep(780, 0.08, 'square', 0.04), 55); },
    coin:   () => beep(900 + Math.random() * 150, 0.04, 'square', 0.018),
    death:  () => { beep(220, 1.0, 'sawtooth', 0.07, 40); noise(0.6, 0.14, 500); },
    revive: () => beep(200, 0.4, 'sine', 0.08, 900),
    prestige:() => { noise(1.2, 0.2, 600); beep(80, 2, 'sine', 0.12, 800); },
    research:() => [523, 784].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'sine', 0.05), i * 100)),
    click:  () => beep(600, 0.05, 'square', 0.04),
    deny:   () => beep(140, 0.15, 'square', 0.05),
    best:   () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
  };
})();
