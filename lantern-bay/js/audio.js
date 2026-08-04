/* ============================================================
   Procedural WebAudio SFX — zero audio files.
   Each catch chimes one semitone higher than the last (combo
   arpeggio); legendaries get a deep bell; hauls get a fanfare.
   ============================================================ */
SR.Audio = (function () {
  let ctx, enabled = true;

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
  /* deep bell: two inharmonic partials, long decay */
  function bell(f, dur, vol) {
    if (!enabled) return;
    try {
      const c = ac(), g = c.createGain();
      g.gain.value = vol;
      g.connect(c.destination);
      [1, 2.76].forEach(m => {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * m;
        o.connect(g);
        o.start(); o.stop(c.currentTime + dur);
      });
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    } catch (e) {}
  }

  const SEMITONE = Math.pow(2, 1 / 12);
  return {
    resume,
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; },
    /* catch chime: rises a semitone per combo step */
    catch: (combo, rarity) => {
      const f = 440 * Math.pow(SEMITONE, Math.min(combo, 24));
      beep(f, 0.14, 'sine', 0.06);
      if (rarity >= 2) beep(f * 2, 0.2, 'triangle', 0.04);
    },
    rare:   () => { bell(330, 1.0, 0.07); beep(660, 0.4, 'sine', 0.04); },
    named:  () => { bell(165, 2.2, 0.11); noise(0.5, 0.05, 400); },
    radiant:() => [880, 1108, 1318, 1760].forEach((f, i) =>
              setTimeout(() => beep(f, 0.25, 'sine', 0.05), i * 90)),
    bump:   () => { noise(0.15, 0.14, 800); beep(160, 0.25, 'sawtooth', 0.06, 60); },
    turn:   () => beep(240, 0.15, 'sine', 0.04, 480),
    haul:   (big) => {
      [523, 659, 784].concat(big ? [1046, 1318] : [1046]).forEach((f, i) =>
        setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90));
      noise(0.15, 0.06, 2500);
    },
    coin:   () => beep(900 + Math.random() * 200, 0.05, 'square', 0.02),
    buy:    () => { beep(520, 0.06, 'square', 0.05); setTimeout(() => beep(780, 0.09, 'square', 0.05), 60); },
    card:   () => { noise(0.06, 0.05, 3000); beep(660, 0.15, 'triangle', 0.05, 990); },
    zone:   () => bell(220, 1.4, 0.06),
    blessing:() => { bell(110, 2.5, 0.1); [440,554,659,880].forEach((f,i)=>setTimeout(()=>beep(f,0.3,'sine',0.05), 300+i*140)); },
    click:  () => beep(600, 0.05, 'square', 0.04),
    deny:   () => beep(140, 0.15, 'square', 0.05),
    best:   () => [523, 659, 784, 1046].forEach((f, i) =>
              setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
  };
})();
