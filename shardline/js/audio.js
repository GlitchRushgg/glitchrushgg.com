/* ============================================================
   Procedural WebAudio — zero audio files.
   SFX plus a tiny beat sequencer: kick on quarters, hats on
   eighths, a seeded bass arpeggio per sector. Obstacles are
   placed on the same beat grid, so the level IS the song.
   ============================================================ */
GD.Audio = (function () {
  let ctx, enabled = true;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function resume() { try { ac().resume(); } catch (e) {} }

  function beep(f, dur, type, vol, slideTo, at) {
    if (!enabled) return;
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      const t0 = at || c.currentTime;
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(vol || 0.05, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur);
    } catch (e) {}
  }

  function noise(dur, vol, lp, at) {
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
      g.connect(c.destination);
      s.start(at || c.currentTime);
    } catch (e) {}
  }

  /* ---------------- beat sequencer ---------------- */
  /* Minor-pentatonic bass notes; the pattern is seeded per level. */
  const BASS = [55, 65.4, 73.4, 82.4, 98];
  let seqOn = false, seqTimer = null, bpm = 130, nextBeat = 0, beatIdx = 0, patt = [];

  function musicStart(theBpm, seed) {
    musicStop();
    bpm = theBpm;
    let a = seed | 0;
    patt = [];
    for (let i = 0; i < 8; i++) { a = (a * 1103515245 + 12345) & 0x7fffffff; patt.push(a % BASS.length); }
    try {
      const c = ac();
      nextBeat = c.currentTime + 0.06;
      beatIdx = 0;
      seqOn = true;
      seqTimer = setInterval(schedule, 90);
    } catch (e) {}
  }
  function schedule() {
    if (!seqOn || !enabled) return;
    try {
      const c = ac(), spb = 60 / bpm;
      while (nextBeat < c.currentTime + 0.22) {
        const q = beatIdx % 2 === 0;            // eighth grid; even = quarter
        if (q) {                                 // kick
          beep(120, 0.12, 'sine', 0.09, 40, nextBeat);
        }
        noise(0.03, q ? 0.015 : 0.03, 6000, nextBeat);   // hats
        const note = BASS[patt[(beatIdx >> 1) % patt.length]];
        if (q) beep(note, spb * 0.9, 'sawtooth', 0.035, note, nextBeat);
        if (beatIdx % 8 === 4) beep(note * 4, 0.1, 'square', 0.02, note * 2, nextBeat); // sparkle
        nextBeat += spb / 2;
        beatIdx++;
      }
    } catch (e) {}
  }
  function musicStop() {
    seqOn = false;
    if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
  }
  /* 0..1 phase of the current beat, for pulsing visuals */
  function beatPulse() {
    try {
      if (!seqOn) return 0;
      const c = ac(), spb = 60 / bpm;
      return 1 - ((nextBeat - c.currentTime) / (spb / 2)) % 1;
    } catch (e) { return 0; }
  }

  return {
    resume,
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; if (!v) musicStop(); },
    musicStart, musicStop, beatPulse,

    jump:   () => beep(300, 0.08, 'square', 0.035, 520),
    pickup: () => { beep(1046, 0.06, 'sine', 0.05); beep(1568, 0.05, 'triangle', 0.025); },
    flip:   () => beep(400, 0.15, 'sine', 0.06, 900),
    death:  () => { beep(220, 0.4, 'sawtooth', 0.08, 40); noise(0.3, 0.14, 900); },
    checkpoint: () => beep(660, 0.12, 'sine', 0.05, 990),
    clear:  () => [523, 659, 784, 1046, 1318].forEach((f, i) =>
                setTimeout(() => beep(f, 0.2, 'sine', 0.07), i * 100)),
    feat:   () => [523, 659, 784, 1046].forEach((f, i) =>
                setTimeout(() => beep(f, 0.16, 'sine', 0.06), i * 80)),
    cash:   () => { beep(880, 0.05, 'square', 0.03); setTimeout(() => beep(1174, 0.08, 'square', 0.03), 40); },
    best:   () => [523, 659, 784, 1046].forEach((f, i) =>
                setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
    golden: () => [659, 880, 1046, 1318].forEach((f, i) =>
                setTimeout(() => beep(f, 0.18, 'sine', 0.07), i * 70)),
    revive: () => beep(200, 0.35, 'sine', 0.07, 900),
    tap:  () => beep(600, 0.05, 'square', 0.04),
    deny: () => beep(140, 0.15, 'square', 0.05),
  };
})();
