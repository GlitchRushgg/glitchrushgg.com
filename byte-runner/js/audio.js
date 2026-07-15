/* ============================================================
   Hybrid audio: a Pixabay SFX pack (audio/*.mp3, lazy-loaded,
   ~350KB) for the signature sounds — jump, swoosh, whoosh,
   glitch-death, UI button, drone loop — with the procedural
   WebAudio synth as instant fallback if a file is missing or
   still loading. Music stays fully synthesized (beat sequencer).
   ============================================================ */
BR.Audio = (function () {
  let ctx, enabled = true;

  /* ---------------- sample pack (with synth fallback) ---------------- */
  const SFX = {
    jump: 'audio/jump.mp3', lane: 'audio/swoosh.mp3', slide: 'audio/whoosh.mp3',
    death: 'audio/glitch.mp3', tap: 'audio/button.mp3',
  };
  const pool = {};
  function sample(name, vol) {
    if (!enabled) return true;                 // muted counts as handled
    try {
      let arr = pool[name];
      if (!arr) {
        arr = pool[name] = [0, 0, 0].map(() => {
          const a = new Audio(SFX[name]);
          a.preload = 'auto';
          return a;
        });
      }
      const el = arr.find(a => a.paused) || arr[0];
      if (el.readyState < 2) return false;     // not ready → synth this time
      el.volume = vol;
      el.currentTime = 0;
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
      return true;
    } catch (e) { return false; }
  }

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

  /* ---------------- drone hum (heat-scaled) ----------------
     The real drone-noise recording on loop, pitched up as the
     heat rises; detuned-sawtooth fallback if the file fails. */
  let drone = null, droneEl = null;
  function droneStart() {
    if (!enabled) return;
    try {
      if (!droneEl) {
        droneEl = new Audio('audio/drone.mp3');
        droneEl.loop = true;
        droneEl.preload = 'auto';
      }
      droneEl.volume = 0;
      const p = droneEl.play();
      if (p && p.catch) p.catch(() => {});
      return;
    } catch (e) {}
    if (drone) return;                          // synth fallback
    try {
      const c = ac();
      const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = 55;
      o2.type = 'sawtooth'; o2.frequency.value = 55.7;
      g.gain.value = 0;
      o.connect(g); o2.connect(g); g.connect(c.destination);
      o.start(); o2.start();
      drone = { o, o2, g };
    } catch (e) {}
  }
  function droneSet(t) {         // 0 = safe, 1 = breathing down your neck
    try {
      if (droneEl && !droneEl.paused) {
        droneEl.volume = 0.06 + t * 0.5;
        droneEl.playbackRate = 0.85 + t * 0.5;
        return;
      }
    } catch (e) {}
    if (!drone) return;
    try {
      drone.g.gain.value = t * 0.05;
      drone.o.frequency.value = 55 + t * 40;
      drone.o2.frequency.value = 55.7 + t * 42;
    } catch (e) {}
  }
  function droneStop() {
    try { droneEl && droneEl.pause(); } catch (e) {}
    if (!drone) return;
    try { drone.o.stop(); drone.o2.stop(); } catch (e) {}
    drone = null;
  }

  /* ---------------- beat sequencer ---------------- */
  const BASS = [55, 65.4, 73.4, 82.4, 98];
  let seqOn = false, seqTimer = null, bpm = 128, nextBeat = 0, beatIdx = 0, patt = [];

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
    set enabled(v) { enabled = v; if (!v) { musicStop(); droneStop(); } },
    musicStart, musicStop, beatPulse, droneStart, droneSet, droneStop,

    jump:   () => { if (!sample('jump', 0.5)) beep(300, 0.1, 'square', 0.04, 560); },
    slide:  () => { if (!sample('slide', 0.45)) noise(0.12, 0.06, 1200); },
    lane:   () => { if (!sample('lane', 0.4)) beep(500, 0.05, 'square', 0.025); },
    bit:    () => { beep(1046, 0.05, 'sine', 0.045); beep(1568, 0.04, 'triangle', 0.02); },
    power:  (kind) => {
      const f = kind === 'shield' ? 523 : kind === 'x2' ? 659 : 784;
      [f, f * 1.5].forEach((x, i) => setTimeout(() => beep(x, 0.14, 'sine', 0.06), i * 60));
    },
    near:   (n) => beep(600 + n * 80, 0.07, 'square', 0.04),
    stumble:() => { noise(0.2, 0.12, 800); beep(180, 0.3, 'sawtooth', 0.07, 70); },
    caught: () => {
      if (!sample('death', 0.65)) { beep(220, 0.5, 'sawtooth', 0.09, 40); noise(0.4, 0.16, 700); }
    },
    mission:() => [523, 659, 784, 1046].forEach((f, i) =>
                setTimeout(() => beep(f, 0.16, 'sine', 0.06), i * 80)),
    feat:   () => [659, 784, 1046, 1318].forEach((f, i) =>
                setTimeout(() => beep(f, 0.16, 'sine', 0.06), i * 80)),
    cash:   () => { beep(880, 0.05, 'square', 0.03); setTimeout(() => beep(1174, 0.08, 'square', 0.03), 40); },
    best:   () => [523, 659, 784, 1046].forEach((f, i) =>
                setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
    golden: () => [659, 880, 1046, 1318].forEach((f, i) =>
                setTimeout(() => beep(f, 0.18, 'sine', 0.07), i * 70)),
    revive: () => beep(200, 0.35, 'sine', 0.07, 900),
    tap:  () => { if (!sample('tap', 0.5)) beep(600, 0.05, 'square', 0.04); },
    deny: () => beep(140, 0.15, 'square', 0.05),
  };
})();
