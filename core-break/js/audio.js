/* ============================================================
   Procedural WebAudio SFX — zero audio files.
   Rapid tile breaks climb a pentatonic pitch ladder (combo).
   ============================================================ */
CB.Audio = (function () {
  let ctx, enabled = true;
  const PENTA = [261.6, 293.7, 329.6, 392.0, 440.0,
                 523.3, 587.3, 659.3, 784.0, 880.0, 1046.5];
  let comboIdx = 0, lastBreak = 0, plinkGate = 0;

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
    /* tiny hit plink, rate-limited so 60 balls don't deafen */
    plink: () => {
      const now = Date.now();
      if (now - plinkGate < 45) return;
      plinkGate = now;
      beep(300 + Math.random() * 120, 0.04, 'triangle', 0.02);
    },
    /* tile destroyed — combo ladder */
    crumble: () => {
      const now = Date.now();
      comboIdx = (now - lastBreak < 900) ? Math.min(comboIdx + 1, PENTA.length - 1) : 0;
      lastBreak = now;
      beep(PENTA[comboIdx], 0.1, 'sine', 0.05);
      noise(0.06, 0.06, 700);
    },
    ore:    () => [660, 990].forEach((f, i) => setTimeout(() => beep(f, 0.12, 'sine', 0.06), i * 60)),
    boss:   () => { noise(0.35, 0.22, 500); beep(70, 0.6, 'sine', 0.14, 35); },
    bossDie:() => {
      noise(0.6, 0.28, 900);
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.16, 'sine', 0.07), i * 90));
    },
    coin:   () => beep(900, 0.05, 'square', 0.025),
    buy:    () => { beep(520, 0.06, 'square', 0.05); setTimeout(() => beep(760, 0.08, 'square', 0.05), 60); },
    biome:  () => [392, 523, 659].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'sine', 0.05), i * 110)),
    prestige:() => { beep(120, 1.1, 'sawtooth', 0.07, 900); noise(0.7, 0.1, 1200); },
    click:  () => beep(600, 0.05, 'square', 0.04),
    deny:   () => beep(140, 0.15, 'square', 0.05),
    best:   () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
  };
})();
