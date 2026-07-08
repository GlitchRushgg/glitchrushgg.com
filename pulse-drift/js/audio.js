/* ============================================================
   Procedural WebAudio SFX — zero audio files.
   Includes a continuous "graze shimmer" whose pitch rises with
   the multiplier tier (the audio half of the risk/reward loop).
   ============================================================ */
PD.Audio = (function () {
  let ctx, enabled = true;
  let grazeOsc = null, grazeGain = null;

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

  function noise(dur, vol) {
    if (!enabled) return;
    try {
      const c = ac(), n = (c.sampleRate * dur) | 0;
      const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(); s.buffer = buf;
      const g = c.createGain(); g.gain.value = vol || 0.15;
      s.connect(g); g.connect(c.destination); s.start();
    } catch (e) {}
  }

  /* continuous shimmer while grazing; pitch follows multiplier tier */
  function grazeOn(tier) {
    if (!enabled) return;
    try {
      const c = ac();
      if (!grazeOsc) {
        grazeOsc = c.createOscillator(); grazeGain = c.createGain();
        grazeOsc.type = 'sawtooth';
        grazeGain.gain.value = 0;
        grazeOsc.connect(grazeGain); grazeGain.connect(c.destination);
        grazeOsc.start();
      }
      grazeOsc.frequency.setTargetAtTime(300 + tier * 130, c.currentTime, 0.05);
      grazeGain.gain.setTargetAtTime(0.022, c.currentTime, 0.05);
    } catch (e) {}
  }
  function grazeOff() {
    try { if (grazeGain) grazeGain.gain.setTargetAtTime(0, ac().currentTime, 0.08); } catch (e) {}
  }

  return {
    resume,
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; if (!v) grazeOff(); },
    flip:   () => beep(240, 0.045, 'square', 0.028),
    tierUp: (t) => [440, 554, 659].forEach((f, i) =>
              setTimeout(() => beep(f * (1 + t * 0.12), 0.12, 'sine', 0.06), i * 70)),
    tierDown: () => beep(300, 0.12, 'sine', 0.04, 180),
    death:  () => { noise(0.4, 0.22); beep(220, 0.5, 'sawtooth', 0.08, 40); },
    click:  () => beep(600, 0.05, 'square', 0.04),
    best:   () => [523, 659, 784, 1046].forEach((f, i) =>
              setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 90)),
    revive: () => beep(200, 0.35, 'sine', 0.07, 900),
    coin:   () => beep(880, 0.06, 'square', 0.035),
    deny:   () => beep(140, 0.15, 'square', 0.05),
    grazeOn, grazeOff,
  };
})();
