/* ============================================================
   Procedural WebAudio — zero audio files.
   SFX plus the beat sequencer (kick/hats/seeded bass arp) and a
   speed-pitched wind drone: the faster you roll, the higher it
   howls. Pure adrenaline engineering.
   ============================================================ */
HS.Audio = (function () {
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

  /* ---------------- wind drone (speed-pitched) ---------------- */
  let wind = null;
  function windStart() {
    if (!enabled || wind) return;
    try {
      const c = ac();
      const n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource();
      s.buffer = buf; s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 300; f.Q.value = 0.8;
      const g = c.createGain(); g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(c.destination);
      s.start();
      wind = { s, f, g };
    } catch (e) {}
  }
  function windSet(t) {          // t = 0..1 speed fraction
    if (!wind) return;
    try {
      wind.g.gain.value = 0.015 + t * 0.075;
      wind.f.frequency.value = 220 + t * 1400;
    } catch (e) {}
  }
  function windStop() {
    if (!wind) return;
    try { wind.s.stop(); } catch (e) {}
    wind = null;
  }

  /* ---------------- beat sequencer ---------------- */
  const BASS = [55, 65.4, 73.4, 82.4, 98];
  let seqOn = false, seqTimer = null, bpm = 132, nextBeat = 0, beatIdx = 0, patt = [];

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
        const q = beatIdx % 2 === 0;
        if (q) beep(120, 0.12, 'sine', 0.09, 40, nextBeat);
        noise(0.03, q ? 0.015 : 0.03, 6000, nextBeat);
        const note = BASS[patt[(beatIdx >> 1) % patt.length]];
        if (q) beep(note, spb * 0.9, 'sawtooth', 0.035, note, nextBeat);
        if (beatIdx % 8 === 4) beep(note * 4, 0.1, 'square', 0.02, note * 2, nextBeat);
        nextBeat += spb / 2;
        beatIdx++;
      }
    } catch (e) {}
  }
  function musicStop() {
    seqOn = false;
    if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
  }
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
    set enabled(v) { enabled = v; if (!v) { musicStop(); windStop(); } },
    musicStart, musicStop, beatPulse, windStart, windSet, windStop,

    pickup: () => { beep(1046, 0.06, 'sine', 0.05); beep(1568, 0.05, 'triangle', 0.025); },
    graze:  (n) => beep(600 + n * 90, 0.07, 'square', 0.04),
    death:  () => { beep(220, 0.45, 'sawtooth', 0.08, 40); noise(0.35, 0.15, 900); },
    fall:   () => beep(500, 0.7, 'sine', 0.07, 60),
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
