/* ============================================================
   Procedural WebAudio SFX — zero audio files.
   Trick banks climb a pentatonic scale as the landing streak
   grows (the classic "cascade feels musical" trick). Landings
   and crashes are shaped filtered noise.
   ============================================================ */
FR.Audio = (function () {
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

  /* ---- music: the one binary asset in the portfolio ----
     "Power Drive Rock" by SoulProdMusic (Pixabay license: free
     for commercial use, no attribution required). Lazy-created
     on first play so it never delays the game boot. */
  let musicEl = null, musicOn = true;
  function musicPlay() {
    if (!musicOn) return;
    try {
      if (!musicEl) {
        musicEl = new Audio('audio/music.mp3');
        musicEl.loop = true;
        musicEl.volume = 0.32;
      }
      const p = musicEl.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  function musicPause() { try { musicEl && musicEl.pause(); } catch (e) {} }

  return {
    resume,
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; },
    musicPlay, musicPause,
    get musicOn() { return musicOn; },
    set musicOn(v) { musicOn = v; if (!v) musicPause(); },

    start:  () => { noise(0.12, 0.05, 900); beep(330, 0.12, 'sine', 0.04, 520); },
    hop:    () => { beep(240, 0.09, 'sine', 0.05, 460); noise(0.04, 0.03, 1400); },
    coin:   () => { beep(880, 0.06, 'sine', 0.045); beep(1318, 0.05, 'triangle', 0.02); },
    /* clean landing + trick bank — streak picks the pentatonic step */
    land:   (streak) => {
      noise(0.06, 0.08, 600);
      const i = Math.min(PENTA.length - 1, Math.max(0, (streak || 1) - 1));
      beep(PENTA[i], 0.12, 'sine', 0.05);
    },
    trick:  (streak, big) => {
      const i = Math.min(PENTA.length - 1, Math.max(0, (streak || 1) - 1));
      beep(PENTA[i], 0.14, 'sine', 0.07);
      beep(PENTA[i] * 2, 0.1, 'triangle', 0.03);
      if (big) [659, 880, 1046].forEach((f, k) => setTimeout(() => beep(f, 0.14, 'sine', 0.05), k * 60));
    },
    sketchy:() => noise(0.12, 0.06, 1100),
    crash:  () => { beep(200, 0.5, 'sawtooth', 0.07, 50); noise(0.4, 0.13, 700); },
    helmet: () => beep(330, 0.3, 'sine', 0.07, 990),
    revive: () => beep(200, 0.35, 'sine', 0.07, 900),
    feat:   () => [523, 659, 784, 1046].forEach((f, i) =>
                setTimeout(() => beep(f, 0.16, 'sine', 0.06), i * 80)),
    zone:   () => { beep(392, 0.2, 'sine', 0.05); setTimeout(() => beep(523, 0.25, 'sine', 0.05), 110); },
    cash:   () => { beep(880, 0.05, 'square', 0.03); setTimeout(() => beep(1174, 0.08, 'square', 0.03), 40); },
    best:   () => [523, 659, 784, 1046].forEach((f, i) =>
                setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
    prestige: () => {
      beep(60, 1.4, 'sine', 0.11, 30);
      [440, 587, 740, 880].forEach((f, i) => setTimeout(() => beep(f, 0.3, 'sine', 0.05), i * 150));
    },
    golden: () => [659, 880, 1046, 1318].forEach((f, i) =>
                setTimeout(() => beep(f, 0.18, 'sine', 0.07), i * 70)),
    tap:  () => beep(600, 0.05, 'square', 0.04),
    deny: () => beep(140, 0.15, 'square', 0.05),
  };
})();
