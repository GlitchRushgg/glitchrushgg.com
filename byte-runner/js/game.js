/* ============================================================
   BYTERUNNER — 3-lane 3D endless runner. Data thief vs drone.

   Swipe to dodge, up to jump, down to slide. The city never
   ends and the security drone never files paperwork.

   Design laws (learned the hard way, one dead clone at a time):
   • Every obstacle WEARS its verb: orange = jump, cyan = slide,
     magenta = dodge. No memorizing, no cheap deaths.
   • Kills telegraph ≥1.2s at current speed — spacing scales.
   • A clean hit while lane-changing is a STUMBLE, not a death:
     the drone closes in. Two stumbles in 8s and it has you.
     The forgiveness IS the tension (thanks, Subway Surfers).
   • Missions tick up a PERMANENT score multiplier — the meta
     that turns "one run" into "one more week".
   • The rage loop is sacred: death → tap → running again.

   3D pipeline: segment strips projected far→near with fog,
   same math as HyperSlope. No engine. No assets.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = BR.Audio;

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'byteRunner_v1';
  const save = {
    bits: 0, lifeBits: 0, lifeRuns: 0, mult: 1, completions: 0, tiers: {},
    bestScore: 0, bestDist: 0,
    dailyDate: '', dailyBest: 0, dailyDays: {},
    runners: { og: true }, runner: 'og',
    feats: {}, sel: 'endless', sound: true, lastSeen: Date.now(),
  };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  if (!save.runners.og) save.runners.og = true;
  function persist() {
    save.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  A.enabled = save.sound;
  const today = () => new Date().toDateString();
  if (save.dailyDate !== today()) { save.dailyDate = today(); save.dailyBest = 0; }

  /* ================= CANVAS / LETTERBOX ================= */
  const LW = 480, LH = 720;
  const cv = $('game'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, scale = 1, offX = 0, offY = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    scale = Math.min(W / LW, H / LH);
    offX = (W - LW * scale) / 2;
    offY = (H - LH * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  /* ================= TRACK (seeded 3-lane city) ================= */
  const SEG = DATA.SEG, LANE = DATA.LANE_W;
  const ROAD_HW = LANE * 1.5 + 20;
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let segs = [], gen = null;
  function laneX(l) { return (l - 1) * LANE; }

  function trackReset(seed) {
    segs = [];
    gen = { rng: mulberry32(seed), x: 0, curve: 0, curveT: 0, curveLeft: 0,
            nextPat: 20, powerAt: 200 + mulberry32(seed + 7)() * 200 };
    segs.push({ x: 0, obst: null, bits: null, power: null });
  }
  function pushSeg() {
    const rng = gen.rng;
    const i = segs.length, m = i * SEG / 10;
    // gentle S-curves (cosmetic + read-ahead skill)
    if (gen.curveLeft-- <= 0) {
      gen.curveT = (rng() * 2 - 1) * 3.2;
      gen.curveLeft = 20 + rng() * 30;
    }
    gen.curve += (gen.curveT - gen.curve) * 0.05;
    gen.x += gen.curve;
    const s = { x: gen.x, obst: null, bits: null, power: null };
    segs.push(s);

    // powerups
    if (m >= gen.powerAt) {
      gen.powerAt = m + DATA.gen.powerEvery[0] + rng() * (DATA.gen.powerEvery[1] - DATA.gen.powerEvery[0]);
      s.power = { lane: (rng() * 3) | 0, kind: DATA.powerups[(rng() * 3) | 0].id, taken: false };
      return;
    }

    // obstacle patterns on a spacing that scales with distance
    if (m > DATA.gen.obstFrom && i >= gen.nextPat) {
      gen.nextPat = i + Math.max(5, Math.round(12 - m * 0.003)) + (rng() * 3) | 0;
      const hard = Math.min(1, 0.15 + m * 0.001);
      const r = rng();
      const put = (idx, lane, type) => {
        ensureRaw(idx);
        if (!segs[idx].obst) segs[idx].obst = [];
        segs[idx].obst.push({ lane, type, grazed: false, neared: false });
      };
      if (r < 0.3) {                                    // single verb, one lane
        const lane = (rng() * 3) | 0;
        const type = ['jump', 'slide', 'truck'][(rng() * 3) | 0];
        if (type === 'truck') for (let k = 0; k < DATA.gen.truckLen; k++) put(i + k, lane, 'truck');
        else put(i, lane, type);
        bitLine(i + 3, (lane + 1 + ((rng() * 2) | 0)) % 3);
      } else if (r < 0.3 + 0.25 + hard * 0.15) {        // two lanes blocked, one free
        const free = (rng() * 3) | 0;
        for (let l = 0; l < 3; l++) {
          if (l === free) continue;
          const type = rng() < 0.5 ? 'truck' : (rng() < 0.5 ? 'jump' : 'slide');
          if (type === 'truck') for (let k = 0; k < DATA.gen.truckLen; k++) put(i + k, l, 'truck');
          else put(i, l, type);
        }
        bitLine(i, free);
      } else if (r < 0.72) {                             // full-width JUMP wall
        for (let l = 0; l < 3; l++) put(i, l, 'jump');
        bitArc(i, (rng() * 3) | 0);
      } else {                                           // full-width SLIDE ceiling
        for (let l = 0; l < 3; l++) put(i, l, 'slide');
        bitLine(i + 2, (rng() * 3) | 0);
      }
    } else if (m > 12 && rng() < 0.16) {
      bitLine(i, (rng() * 3) | 0);       // constant dopamine drip between patterns
    }
  }
  function ensureRaw(idx) { while (segs.length <= idx) pushSegPlain(); }
  function pushSegPlain() {
    if (gen.curveLeft-- <= 0) {
      gen.curveT = (gen.rng() * 2 - 1) * 3.2;
      gen.curveLeft = 20 + gen.rng() * 30;
    }
    gen.curve += (gen.curveT - gen.curve) * 0.05;
    gen.x += gen.curve;
    segs.push({ x: gen.x, obst: null, bits: null, power: null });
  }
  function bitLine(idx, lane) {
    for (let k = 0; k < DATA.gen.bitRunLen; k++) {
      ensureRaw(idx + k);
      segs[idx + k].bits = { lane, y: 24, taken: false };
    }
  }
  function bitArc(idx, lane) {
    for (let k = 0; k < 7; k++) {
      ensureRaw(idx - 3 + k);
      segs[idx - 3 + k].bits = { lane, y: 24 + Math.sin(k / 6 * Math.PI) * 52, taken: false };
    }
  }
  function ensure(idx) { while (segs.length <= idx) pushSeg(); }

  /* ================= STATE ================= */
  const ST = { SURFACE: 0, RUN: 1, DYING: 2, DEAD: 3 };
  let state = ST.SURFACE;
  let tt = 0, shake = 0, dieT = 0, deathBy = '';

  const HSTEP = 1 / 120;
  let acc = 0;

  let P = null;   // {z, v, lane, x, jumpT, slideT, y}
  let heat = 0, lastStumble = -99, shield = false, magnetT = 0, x2T = 0;
  let RS = null;  // run stats {bits, jumps, slides, nears, stumbles, powers}
  let usedRevive = false;
  let goldenT = 0, goldenCd = 0, lastMidgame = 0, sessionRuns = 0;

  let particles = [], floats = [];
  let bannerTxt = '', bannerT = 0;
  let camX = 0, camZ = 0;
  let missionDone = [];
  let nextSpeedup = 300, curTheme = 0;
  // the drone comes and goes: 'away' → 'patrol' (side of the track,
  // sweeping its light) → 'chase' (heat > 0). Presence = tension.
  let droneMode = 'away', droneT = 6, droneSide = 1, droneAlpha = 0;
  function addFloat(txt) { floats.push({ txt, t: 1 }); }

  const rand = (a, b) => a + Math.random() * (b - a);
  const mode = () => DATA.modes.find(x => x.id === save.sel) || DATA.modes[0];
  const runnerSkin = () => DATA.runners.find(x => x.id === save.runner) || DATA.runners[0];
  const distM = () => P ? Math.floor(P.z / 10) : 0;
  const score = () => Math.floor(distM() * DATA.SCORE_RATE * save.mult);
  function banner(t) { bannerTxt = t; bannerT = 2.2; }

  /* ================= MISSIONS ================= */
  function statValue(stat) {
    switch (stat) {
      case 'runBits': return RS.bits;
      case 'lifeBits': return save.lifeBits + RS.bits;
      case 'runDist': return distM();
      case 'runJumps': return RS.jumps;
      case 'runSlides': return RS.slides;
      case 'runNears': return RS.nears;
      case 'runStumbles': return RS.stumbles;
      case 'runPowers': return RS.powers;
      case 'lifeRuns': return save.lifeRuns;
    }
    return 0;
  }
  function checkMissions(announce) {
    if (!RS) return;
    for (const ms of DATA.missions) {
      const tier = save.tiers[ms.id] || 0;
      if (tier >= ms.tiers.length) continue;
      if (statValue(ms.stat) >= ms.tiers[tier]) {
        save.tiers[ms.id] = tier + 1;
        save.completions++;
        const reward = 60 * (tier + 1);
        save.bits += reward; save.lifeBits += reward;
        missionDone.push(ms.name.replace('{n}', ms.tiers[tier]));
        if (announce) banner('🎯 MISSION: +' + reward + ' ⬡');
        A.mission();
        if (save.completions % 3 === 0 && save.mult < DATA.MULT_CAP) {
          save.mult = Math.min(DATA.MULT_CAP, save.mult + DATA.MULT_STEP);
          banner('📈 MULTIPLIER UP — ×' + save.mult);
          BR.SDK.happyTime();
        }
        if (save.mult >= 5) feat('mult5');
        if (save.mult >= 10) feat('mult10');
      }
    }
  }

  function feat(id) {
    if (save.feats[id]) return;
    save.feats[id] = 1;
    A.feat();
    BR.SDK.happyTime();
    banner('🏅 ' + DATA.feats.find(f => f.id === id).name.toUpperCase());
  }

  /* ================= RUN LIFECYCLE ================= */
  function startRun() {
    const m = mode();
    trackReset(m.id === 'daily' ? DATA.dailySeed() : 1 + ((Math.random() * 1e9) | 0));
    ensure(140);
    P = { z: SEG * 2, v: DATA.V0, lane: 1, x: 0, jumpT: 0, slideT: 0, y: 0 };
    heat = 0; lastStumble = -99; shield = false; magnetT = 0; x2T = 0;
    RS = { bits: 0, jumps: 0, slides: 0, nears: 0, stumbles: 0, powers: 0 };
    usedRevive = false; missionDone = [];
    nextSpeedup = DATA.SPEEDUP_EVERY; curTheme = 0; floats = [];
    droneMode = 'away'; droneT = rand(5, 9); droneAlpha = 0;
    acc = 0;
    if (m.id === 'daily' && !save.dailyDays[save.dailyDate]) {
      save.dailyDays[save.dailyDate] = 1;
      if (Object.keys(save.dailyDays).length >= 7) feat('daily7');
    }
    sessionRuns++;
    state = ST.RUN;
    A.resume();
    A.musicStart(m.bpm, m.id === 'daily' ? DATA.dailySeed() : ((Math.random() * 999) | 0));
    A.droneStart();
    BR.SDK.gameplayStart();
    hide('sheet'); hide('deathModal'); show('runHud');
  }

  function stumble() {
    if (shield) { shield = false; banner('🛡️ SHIELD ATE IT'); A.power('shield'); return; }
    RS.stumbles++;
    if (tt - lastStumble < DATA.HEAT_T && heat >= 1) { die('drone'); return; }
    heat = 1; lastStumble = tt;
    // bounce back to the lane you came from — a stumble must never
    // dump you INSIDE the thing you clipped
    P.lane = prevLane;
    shake = 0.25;
    A.stumble();
    banner('⚠ THE DRONE SEES YOU');
  }

  function die(reason) {
    deathBy = reason;
    state = ST.DYING; dieT = 0.6;
    shake = 0.35;
    A.caught();
    A.droneStop();
    boomFx();
  }

  function finishDeath() {
    state = ST.DEAD;
    A.musicStop();
    BR.SDK.gameplayStop();
    const m = distM(), sc = score();
    save.lifeRuns++;
    checkMissions(false);
    let gained = RS.bits;
    if (goldenT > 0) gained *= 2;
    save.bits += gained; save.lifeBits += gained;
    const isDaily = mode().id === 'daily';
    if (isDaily) {
      save.dailyBest = Math.max(save.dailyBest, sc);
      if (m >= DATA.FEAT_DAILY_DIST) feat('daily1');
    }
    if (sc > save.bestScore) { save.bestScore = sc; A.best(); }
    save.bestDist = Math.max(save.bestDist, m);
    if (m >= 500) feat('first500');
    if (m >= 1000) feat('dist1k');
    if (m >= 2500) feat('dist2k');
    if (m >= 1000 && RS.stumbles === 0) feat('noheat');
    if (RS.stumbles >= 3 && m >= 500) feat('houdini');
    if (RS.nears >= 10) feat('near10');
    if (gained >= 1000) feat('rich');
    persist();

    $('dLabel').textContent = deathBy === 'drone' ? 'THE DRONE GOT YOU' : 'BUSTED';
    $('dScore').textContent = fmtInt(sc);
    $('dDist').textContent = m + 'm';
    $('dMult').textContent = save.mult;
    $('dBest').textContent = fmtInt(isDaily ? save.dailyBest : save.bestScore);
    $('dBits').textContent = '⬡ +' + fmt(gained) + ' banked';
    const dm = $('dMission');
    if (missionDone.length) {
      dm.classList.remove('hidden');
      dm.textContent = '🎯 ' + missionDone.join(' · ');
    } else dm.classList.add('hidden');
    const rv = $('dRevive');
    if (!usedRevive && m > 80) rv.classList.remove('hidden');
    else rv.classList.add('hidden');
    hide('runHud'); show('deathModal');
    updateHUD();
  }

  function retry() {
    if (sessionRuns > 5 && tt - lastMidgame > 180) {
      lastMidgame = tt;
      BR.SDK.midgameAd(startRun);
      return;
    }
    startRun();
  }

  function revive() {
    usedRevive = true;
    const i0 = (P.z / SEG) | 0;
    for (let i = i0; i < Math.min(segs.length, i0 + 18); i++) segs[i].obst = null;
    heat = 0; shield = true;
    P.jumpT = 0; P.slideT = 0;
    state = ST.RUN;
    A.revive();
    A.musicStart(mode().bpm, 1);
    A.droneStart();
    BR.SDK.gameplayStart();
    hide('deathModal'); show('runHud');
  }

  function toMenu() {
    state = ST.SURFACE;
    A.musicStop(); A.droneStop();
    hide('deathModal'); hide('runHud'); show('sheet');
    renderSheet(); updateHUD();
  }

  /* ================= PHYSICS ================= */
  function stepPhysics() {
    ensure(((P.z / SEG) | 0) + 130);
    P.v = Math.min(DATA.VMAX, P.v + DATA.ACCEL * HSTEP);
    P.z += P.v * HSTEP;

    // lane lerp
    const targetX = laneX(P.lane);
    P.x += (targetX - P.x) * Math.min(1, HSTEP / DATA.LANE_T * 2.2);

    // jump / slide clocks
    if (P.jumpT > 0) {
      P.jumpT -= HSTEP;
      const f = 1 - P.jumpT / DATA.JUMP_T;
      P.y = DATA.JUMP_H * 4 * f * (1 - f);
      if (P.jumpT <= 0) P.y = 0;
    }
    if (P.slideT > 0) P.slideT -= HSTEP;

    // heat cooldown
    if (heat > 0 && tt - lastStumble > DATA.HEAT_T) heat = 0;
    if (magnetT > 0) magnetT -= HSTEP;
    if (x2T > 0) x2T -= HSTEP;

    const iP = (P.z / SEG) | 0;
    const roadX = segs[iP].x;
    const rel = P.x;                        // lateral relative to road center
    const changing = Math.abs(P.x - laneX(P.lane)) > LANE * 0.3;

    // obstacles
    for (let i = iP; i <= iP + 1 && i < segs.length; i++) {
      const s = segs[i];
      if (!s.obst) continue;
      const segZ = i * SEG;
      if (Math.abs(P.z - segZ) > SEG * 0.5) continue;
      for (const o of s.obst) {
        const ox = laneX(o.lane);
        const lat = Math.abs(rel - ox);
        if (o.type === 'truck' && !o.neared && lat > LANE * 0.55 && lat < LANE * 1.05) {
          o.neared = true;
          RS.nears++;
          A.near(Math.min(6, RS.nears));
        }
        if (lat > LANE * 0.52) continue;    // not in this lane
        if (o.grazed) continue;
        if (o.type === 'jump') {
          if (P.y > 26) {                   // cleared it — using the verb PAYS
            if (!o.cleared) { o.cleared = true; RS.bits += 2; addFloat('+2 ⬡'); A.bit(); }
            continue;
          }
          o.grazed = true;
          if (changing) stumble(); else if (shield) { shield = false; banner('🛡️ SHIELD ATE IT'); }
          else { die('crash'); return; }
        } else if (o.type === 'slide') {
          if (P.slideT > 0 && P.y === 0) {
            if (!o.cleared) { o.cleared = true; RS.bits += 2; addFloat('+2 ⬡'); A.bit(); }
            continue;
          }
          o.grazed = true;
          if (changing) stumble(); else if (shield) { shield = false; banner('🛡️ SHIELD ATE IT'); }
          else { die('crash'); return; }
        } else {                             // truck
          if (P.y > 74) continue;            // (not reachable by jump — trucks are DODGE)
          o.grazed = true;
          if (changing && lat > LANE * 0.34) stumble();
          else if (shield) { shield = false; banner('🛡️ SHIELD ATE IT'); }
          else { die('crash'); return; }
        }
        if (state !== ST.RUN) return;
      }
    }

    // bits
    for (let i = iP; i <= iP + 1 && i < segs.length; i++) {
      const s = segs[i];
      if (!s.bits || s.bits.taken) continue;
      const segZ = i * SEG;
      if (Math.abs(P.z - segZ) > SEG * 0.6) continue;
      const bx = laneX(s.bits.lane);
      const magnet = magnetT > 0 ? LANE * 1.6 : LANE * 0.55;
      if (Math.abs(rel - bx) < magnet && Math.abs(P.y - (s.bits.y - 24)) < 60) {
        s.bits.taken = true;
        const v = (x2T > 0 ? 2 : 1) * DATA.BIT_VALUE;
        RS.bits += v;
        A.bit();
      }
    }

    // powerups
    for (let i = iP; i <= iP + 1 && i < segs.length; i++) {
      const s = segs[i];
      if (!s.power || s.power.taken) continue;
      if (Math.abs(P.z - i * SEG) > SEG * 0.6) continue;
      if (Math.abs(rel - laneX(s.power.lane)) < LANE * 0.6) {
        s.power.taken = true;
        RS.powers++;
        A.power(s.power.kind);
        if (s.power.kind === 'magnet') { magnetT = DATA.POWER_T; banner('🧲 MAGNET'); }
        else if (s.power.kind === 'x2') { x2T = DATA.POWER_T; banner('✖️ DOUBLE BITS'); }
        else { shield = true; banner('🛡️ SHIELD'); }
      }
    }

    // escalation rituals
    const m = distM();
    if (m >= nextSpeedup) {
      nextSpeedup += DATA.SPEEDUP_EVERY;
      P.v = Math.min(DATA.VMAX, P.v + 45);
      banner('⚡ SPEED UP');
      A.golden();
      shake = Math.max(shake, 0.12);
    }
    const thIdx = DATA.gen.themes.indexOf(DATA.themeAt(m));
    if (thIdx !== curTheme) {
      curTheme = thIdx;
      banner('— DISTRICT ' + (thIdx + 1) + ' —');
      A.power('x2');
    }

    checkMissions(true);
  }

  /* ================= INPUT (swipe + keys) ================= */
  let prevLane = 1;
  function goLane(d) {
    if (state !== ST.RUN) return;
    const n = Math.max(0, Math.min(2, P.lane + d));
    if (n !== P.lane) { prevLane = P.lane; P.lane = n; A.lane(); }
  }
  function doJump() {
    if (state !== ST.RUN) return;
    if (P.y === 0 && P.jumpT <= 0) { P.jumpT = DATA.JUMP_T; P.slideT = 0; RS.jumps++; A.jump(); }
  }
  function doSlide() {
    if (state !== ST.RUN) return;
    if (P.slideT <= 0) { P.slideT = DATA.SLIDE_T; P.jumpT = 0; P.y = 0; RS.slides++; A.slide(); }
  }

  let swipe = null;
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .sheet')) return;
    A.resume();
    if (state === ST.SURFACE) { startRun(); return; }
    if (state === ST.DEAD) { retry(); return; }
    swipe = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', (e) => {
    if (!swipe || state !== ST.RUN) { swipe = null; return; }
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) { doJump(); return; }  // tap = jump
    if (Math.abs(dx) > Math.abs(dy)) goLane(dx > 0 ? 1 : -1);
    else if (dy < 0) doJump();
    else doSlide();
  });
  window.addEventListener('keydown', (e) => {
    const k = e.code;
    if (state === ST.SURFACE && (k === 'Space' || k === 'ArrowUp')) { A.resume(); startRun(); return; }
    if (state === ST.DEAD && k === 'Space') { retry(); return; }
    if (k === 'ArrowLeft' || k === 'KeyA') goLane(-1);
    else if (k === 'ArrowRight' || k === 'KeyD') goLane(1);
    else if (k === 'ArrowUp' || k === 'KeyW' || k === 'Space') doJump();
    else if (k === 'ArrowDown' || k === 'KeyS') doSlide();
  });

  /* ================= FX ================= */
  function boomFx() {
    const p = project(segs[(P.z / SEG) | 0].x + P.x, P.y + 30, P.z);
    if (!p) return;
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(60, 300);
      particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                       life: rand(0.3, 0.7), size: rand(2, 5), c: runnerSkin().c });
    }
  }
  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  /* ================= UPDATE ================= */
  let rawLast = performance.now();
  function update(dt) {
    tt += dt;
    if (shake > 0) shake -= dt;
    if (bannerT > 0) bannerT -= dt;
    if (goldenT > 0) goldenT -= dt;
    else if (goldenCd > 0) goldenCd -= dt;
    updateFx(dt);

    if (state === ST.RUN) {
      acc += Math.min(dt, 0.05);
      while (acc >= HSTEP && state === ST.RUN) { stepPhysics(); acc -= HSTEP; }
      // drone episodes: away → patrol visits → chase while the heat is on
      if (heat > 0) droneMode = 'chase';
      else if (droneMode === 'chase') { droneMode = 'patrol'; droneT = 2.5; }
      if (droneMode === 'away') {
        droneT -= dt;
        if (droneT <= 0) { droneMode = 'patrol'; droneT = rand(6, 10); droneSide = Math.random() < 0.5 ? -1 : 1; }
      } else if (droneMode === 'patrol') {
        droneT -= dt;
        if (droneT <= 0) { droneMode = 'away'; droneT = rand(12, 24); }
      }
      const closeness = heat > 0 ? Math.max(0, 1 - (tt - lastStumble) / DATA.HEAT_T) : 0;
      A.droneSet(droneMode === 'chase' ? 0.5 + 0.5 * closeness
               : droneMode === 'patrol' ? 0.2 : 0);
      updateRunHUD();
    } else if (state === ST.DYING) {
      dieT -= dt;
      if (dieT <= 0) finishDeath();
      if (deathBy === 'drone') { droneMode = 'chase'; droneAlpha = 1; }
    } else if (state === ST.SURFACE) {
      // attract: the empty city scrolls behind the menu
      if (P) { P.z += 300 * dt; ensure(((P.z / SEG) | 0) + 130); }
      updateGoldenBtn();
    }

    if (P) {
      const iP = (P.z / SEG) | 0;
      camZ = P.z - 205;
      camX += ((segs[iP].x + P.x * 0.72) - camX) * Math.min(1, dt * 7);
      fov = 265 - (P.v / DATA.VMAX) * 48;    // perspective stretches with speed
    }
    droneAlpha += ((droneMode === 'away' ? 0 : 1) - droneAlpha) * Math.min(1, dt * 2.5);
    for (const f of floats) f.t -= dt * 1.1;
    while (floats.length && floats[0].t <= 0) floats.shift();
  }

  /* ================= 3D PROJECTION + RENDER ================= */
  const CAM_H = 108, HORIZON = 0.4;
  let fov = 265;                 // shrinks with speed — the world RUSHES
  function project(x, y, z) {
    const dz = z - camZ;
    if (dz < 14) return null;
    const s = fov / dz;
    return { x: LW / 2 + (x - camX) * s, y: LH * HORIZON + (CAM_H - y) * s, s };
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const th = DATA.themeAt(distM());
    const pulse = state === ST.RUN ? A.beatPulse() : (Math.sin(tt * 2) * 0.5 + 0.5);

    // sky
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0c0518');
    g.addColorStop(HORIZON, `hsl(${th.hue},62%,${11 + 4 * (1 - pulse)}%)`);
    g.addColorStop(HORIZON + 0.1, '#0d0720');
    g.addColorStop(1, '#080412');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 16, rand(-1, 1) * shake * 16);

    // skyline silhouettes (two parallax rows)
    for (let row = 0; row < 2; row++) {
      const par = row === 0 ? 0.02 : 0.05;
      const base = LH * HORIZON;
      // contraste subido: 14%/9% eran invisibles sobre el fondo (~11%)
      ctx.fillStyle = row === 0 ? `hsla(${th.hue},40%,22%,.8)` : `hsla(${th.hue},45%,16%,.9)`;
      for (let i = 0; i < 14; i++) {
        const bw = 34 + (i * 53 % 40);
        const bh = 30 + ((i * 97 + row * 41) % 80) + row * 14;
        const bx = ((i * 73 - camZ * par - camX * par * 2) % (LW + 80) + LW + 80) % (LW + 80) - 40;
        ctx.fillRect(bx, base - bh, bw, bh);
        // lit windows
        ctx.fillStyle = `hsla(${th.hue},80%,60%,${0.3 + 0.06 * pulse})`;
        for (let wy = 0; wy < 3; wy++)
          ctx.fillRect(bx + 6 + (wy * 29 % 14), base - bh + 8 + wy * 18, 4, 6);
        ctx.fillStyle = row === 0 ? `hsla(${th.hue},40%,22%,.8)` : `hsla(${th.hue},45%,16%,.9)`;
      }
    }

    if (P) drawWorld(th, pulse);

    // particles
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2.4);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // speed lines
    if (state === ST.RUN && P.v > DATA.VMAX * 0.5) {
      const k = (P.v / DATA.VMAX - 0.5) * 2;
      ctx.strokeStyle = `rgba(255,255,255,${0.1 * k})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + tt * 3;
        ctx.beginPath();
        ctx.moveTo(LW / 2 + Math.cos(a) * 250, LH * 0.45 + Math.sin(a) * 210);
        ctx.lineTo(LW / 2 + Math.cos(a) * (330 + 60 * k), LH * 0.45 + Math.sin(a) * (280 + 60 * k));
        ctx.stroke();
      }
    }

    // tension vignette while the drone is around (heavier on a chase)
    if (droneAlpha > 0.02 && (state === ST.RUN || state === ST.DYING)) {
      const chase = droneMode === 'chase';
      const throb = 0.5 + 0.5 * Math.sin(tt * (chase ? 7 : 3));
      const vg = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.32, LW / 2, LH / 2, LH * 0.72);
      vg.addColorStop(0, 'rgba(255,45,77,0)');
      vg.addColorStop(1, `rgba(255,45,77,${droneAlpha * (chase ? 0.16 : 0.06) * (0.6 + 0.4 * throb)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, LW, LH);
    }

    // banner
    if (bannerT > 0) {
      const a = Math.min(1, bannerT, (2.2 - bannerT) * 3);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = '800 22px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18;
      ctx.fillText(bannerTxt, LW / 2, 236);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawWorld(th, pulse) {
    const iP = (P.z / SEG) | 0;
    const from = Math.max(0, iP - 2), to = Math.min(segs.length - 2, iP + 100);
    const railC = `hsl(${th.hue},90%,${55 + 12 * (1 - pulse)}%)`;

    const PR = [];
    for (let i = from; i <= to + 1; i++) {
      const s = segs[i], z = i * SEG;
      PR[i] = { L: project(s.x - ROAD_HW, 0, z), R: project(s.x + ROAD_HW, 0, z) };
    }

    for (let i = to; i >= from; i--) {
      const a = PR[i], b = PR[i + 1];
      if (!a || !b || !a.L || !b.L) continue;
      const fog = Math.max(0, Math.min(1, 1 - (i * SEG - camZ) / (95 * SEG)));
      if (fog <= 0.02) continue;
      const s = segs[i], z = i * SEG;

      // road
      ctx.globalAlpha = fog;
      ctx.fillStyle = i % 2 ? '#150a24' : '#180c2a';
      ctx.beginPath();
      ctx.moveTo(a.L.x, a.L.y); ctx.lineTo(a.R.x, a.R.y);
      ctx.lineTo(b.R.x, b.R.y); ctx.lineTo(b.L.x, b.L.y);
      ctx.closePath(); ctx.fill();
      // rails
      ctx.strokeStyle = railC;
      ctx.lineWidth = Math.max(1, 5 * a.L.s);
      ctx.beginPath(); ctx.moveTo(a.L.x, a.L.y); ctx.lineTo(b.L.x, b.L.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.R.x, a.R.y); ctx.lineTo(b.R.x, b.R.y); ctx.stroke();
      // lane dividers (dashed: even segments only)
      if (i % 2 === 0) {
        ctx.strokeStyle = `hsla(${th.hue},70%,55%,.35)`;
        ctx.lineWidth = Math.max(1, 2.4 * a.L.s);
        for (const lx of [-LANE / 2, LANE / 2]) {
          const p1 = project(s.x + lx, 0, z), p2 = project(segs[i + 1].x + lx, 0, z + SEG);
          if (p1 && p2) { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
        }
      }

      // obstacles
      if (s.obst) for (const o of s.obst) drawObstacle(s, o, z, fog);

      // bits — acid green, unmissable on violet
      if (s.bits && !s.bits.taken) {
        const p = project(s.x + laneX(s.bits.lane), s.bits.y + Math.sin(tt * 4 + i) * 3, z);
        if (p) {
          const r = 16 * p.s;
          ctx.fillStyle = '#d4ff3c';
          ctx.shadowColor = '#d4ff3c'; ctx.shadowBlur = 7 * fog;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(tt * 2);
          ctx.fillRect(-r / 2, -r / 2, r, r);
          ctx.restore();
          ctx.shadowBlur = 0;
        }
      }
      // powerups
      if (s.power && !s.power.taken) {
        const p = project(s.x + laneX(s.power.lane), 34 + Math.sin(tt * 3 + i) * 6, z);
        if (p) {
          const pu = DATA.powerups.find(x => x.id === s.power.kind);
          const r = Math.max(6, 30 * p.s);
          ctx.fillStyle = pu.c;
          ctx.globalAlpha = fog * 0.9;
          ctx.shadowColor = pu.c; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = fog;
          ctx.font = '800 ' + Math.max(8, r * 1.1) + 'px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(pu.ico, p.x, p.y + r * 0.4);
        }
      }
    }
    ctx.globalAlpha = 1;

    drawRunner(iP);
    if ((state === ST.RUN || state === ST.DYING) && droneAlpha > 0.02) drawDrone(iP);

    // floating rewards above the runner
    if (floats.length) {
      ctx.textAlign = 'center';
      ctx.font = '800 16px "Segoe UI", sans-serif';
      for (let i = 0; i < floats.length; i++) {
        const f = floats[i];
        ctx.globalAlpha = Math.min(1, f.t * 1.8);
        ctx.fillStyle = '#d4ff3c';
        ctx.shadowColor = '#d4ff3c'; ctx.shadowBlur = 8;
        ctx.fillText(f.txt, LW / 2, LH * 0.56 - (1 - f.t) * 46 - i * 18);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawObstacle(s, o, z, fog) {
    const ox = s.x + laneX(o.lane);
    const hw = LANE * 0.46;
    ctx.globalAlpha = fog;
    if (o.type === 'jump') {
      const bl = project(ox - hw, 0, z), br2 = project(ox + hw, 0, z);
      const tl = project(ox - hw, 26, z), tr2 = project(ox + hw, 26, z);
      if (bl && tl) {
        ctx.fillStyle = DATA.COL_JUMP;
        ctx.shadowColor = DATA.COL_JUMP; ctx.shadowBlur = 8 * fog;
        ctx.beginPath();
        ctx.moveTo(bl.x, bl.y); ctx.lineTo(br2.x, br2.y);
        ctx.lineTo(tr2.x, tr2.y); ctx.lineTo(tl.x, tl.y);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else if (o.type === 'slide') {
      const bl = project(ox - hw, 40, z), br2 = project(ox + hw, 40, z);
      const tl = project(ox - hw, 86, z), tr2 = project(ox + hw, 86, z);
      if (bl && tl) {
        ctx.fillStyle = DATA.COL_SLIDE;
        ctx.shadowColor = DATA.COL_SLIDE; ctx.shadowBlur = 8 * fog;
        ctx.beginPath();
        ctx.moveTo(bl.x, bl.y); ctx.lineTo(br2.x, br2.y);
        ctx.lineTo(tr2.x, tr2.y); ctx.lineTo(tl.x, tl.y);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        // posts
        const pl = project(ox - hw, 0, z), pr2 = project(ox + hw, 0, z);
        if (pl && pr2) {
          ctx.strokeStyle = DATA.COL_SLIDE;
          ctx.lineWidth = Math.max(1, 2.5 * bl.s);
          ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(bl.x, bl.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(pr2.x, pr2.y); ctx.lineTo(br2.x, br2.y); ctx.stroke();
        }
      }
    } else {          // truck: tall box
      const bl = project(ox - hw, 0, z), br2 = project(ox + hw, 0, z);
      const tl = project(ox - hw, 70, z), tr2 = project(ox + hw, 70, z);
      const bl2 = project(ox - hw, 70, z + SEG * DATA.gen.truckLen);
      if (bl && tl) {
        ctx.fillStyle = DATA.COL_DODGE;
        ctx.shadowColor = DATA.COL_DODGE; ctx.shadowBlur = 10 * fog;
        ctx.beginPath();
        ctx.moveTo(bl.x, bl.y); ctx.lineTo(br2.x, br2.y);
        ctx.lineTo(tr2.x, tr2.y); ctx.lineTo(tl.x, tl.y);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        // roof hint
        if (bl2) {
          ctx.fillStyle = 'rgba(255,93,176,.4)';
          ctx.beginPath();
          ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr2.x, tr2.y);
          ctx.lineTo(tr2.x, bl2.y); ctx.lineTo(tl.x, bl2.y);
          ctx.closePath(); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawRunner(iP) {
    if (state === ST.DEAD) return;
    /* The hooded courier, seen from behind: the glowing data-pack
       IS the character. Hood + jacket in skin color, pack core in
       the skin's visor color, pulsing with the beat. */
    const rx = segs[iP].x + P.x;
    const base = project(rx, P.y, P.z);
    if (!base) return;
    const c = runnerSkin();
    const u = base.s;
    // shadow
    const sh = project(rx, 0, P.z);
    if (sh) {
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath();
      ctx.ellipse(sh.x, sh.y, 17 * u, 5 * u, 0, 0, 7);
      ctx.fill();
    }
    const crouch = P.slideT > 0 ? 0.48 : 1;
    const air = P.y > 4;
    const bx = base.x, by = base.y;
    const ph = air ? 0.4 : Math.sin(P.z * 0.05);   // run cycle (tucked in air)
    const lean = (P.x - laneX(P.lane)) * -0.012;   // bank into lane changes

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(lean);

    // legs — violeta medio: visible contra la carretera oscura (antes #1a0f2e
    // se fundía con el asfalto y las zapatillas quedaban flotando)
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5a3d85';
    ctx.lineWidth = Math.max(2.5, 5.5 * u);
    ctx.beginPath();
    ctx.moveTo(-3 * u, -16 * u * crouch); ctx.lineTo(-8 * u * ph, air ? -7 * u : 0);
    ctx.moveTo(3 * u, -16 * u * crouch);  ctx.lineTo(8 * u * ph, air ? -7 * u : 0);
    ctx.stroke();
    ctx.fillStyle = c.vis;
    ctx.beginPath(); ctx.arc(-8 * u * ph, air ? -7 * u : 0, 2.6 * u, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(8 * u * ph, air ? -7 * u : 0, 2.6 * u, 0, 7); ctx.fill();

    // jacket (torso, slightly flared at the bottom)
    const torsoH = 30 * crouch, torsoY = -(16 * crouch + torsoH) * u;
    ctx.shadowColor = c.c; ctx.shadowBlur = 10;
    ctx.fillStyle = c.c;
    ctx.beginPath();
    ctx.moveTo(-8 * u, torsoY);
    ctx.lineTo(8 * u, torsoY);
    ctx.lineTo(10.5 * u, torsoY + torsoH * u);
    ctx.lineTo(-10.5 * u, torsoY + torsoH * u);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // arms swinging opposite the legs
    ctx.strokeStyle = c.c;
    ctx.lineWidth = Math.max(2, 4.4 * u);
    ctx.beginPath();
    ctx.moveTo(-8 * u, torsoY + 5 * u); ctx.lineTo(-11 * u, torsoY + (14 + 7 * ph) * u);
    ctx.moveTo(8 * u, torsoY + 5 * u);  ctx.lineTo(11 * u, torsoY + (14 - 7 * ph) * u);
    ctx.stroke();

    // the DATA PACK — the soul of the silhouette, pulsing with the beat
    const packW = 13 * u, packH = 17 * u * crouch;
    const packY = torsoY + 4 * u;
    ctx.fillStyle = '#12081f';
    rr(-packW / 2, packY, packW, packH, 3 * u);
    ctx.fill();
    const glow = 0.65 + 0.35 * (state === ST.RUN ? A.beatPulse() : Math.sin(tt * 3) * 0.5 + 0.5);
    ctx.fillStyle = c.vis;
    ctx.globalAlpha = glow;
    ctx.shadowColor = c.vis; ctx.shadowBlur = 14;
    rr(-packW * 0.28, packY + packH * 0.2, packW * 0.56, packH * 0.6, 2 * u);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // hood (from behind: a rounded dome with a darker rim)
    const hoodY = torsoY - 6.5 * u;
    ctx.fillStyle = c.c;
    ctx.beginPath(); ctx.arc(0, hoodY, 8.5 * u, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(10,4,20,.5)';
    ctx.beginPath(); ctx.arc(0, hoodY - 1 * u, 5.5 * u, 0, 7); ctx.fill();

    ctx.restore();

    // shield aura
    if (shield) {
      ctx.strokeStyle = 'rgba(93,224,138,.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(bx, by - 26 * u, 30 * u, 0, 7); ctx.stroke();
    }
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawDrone(iP) {
    // Flies BESIDE the track (never blocking the view): out wide on
    // patrol, tighter to the rail and slightly ahead on a chase.
    // Drawn as a real quadcopter: X-frame arms, prop-blur rotors,
    // two-tone shell, landing skids, camera gimbal, cycling lights.
    const chase = droneMode === 'chase' || deathBy === 'drone';
    const closeness = deathBy === 'drone' ? 1
      : heat > 0 ? Math.max(0, 1 - (tt - lastStumble) / DATA.HEAT_T) : 0;
    const roadX = segs[iP].x;
    const rx = roadX + droneSide * (ROAD_HW + (chase ? 46 : 96) - closeness * 18)
             + Math.sin(tt * 1.3) * 10;
    const wz = P.z + (chase ? 26 : 64);           // beside/ahead, never on your tail
    const bob = Math.sin(tt * 5.5) * 3;
    const p = project(rx, 84 + bob, wz);
    if (!p) return;
    const u = p.s;

    // cycling light color — shifts every 2.5s (patrol) / strobes (chase)
    const CYCLE = ['#ff2d4d', '#2d8cff', '#ffb52d', '#3cff9e'];
    const lightC = chase
      ? (Math.sin(tt * 12) > 0 ? '#ff2d4d' : '#2d8cff')       // police strobe
      : CYCLE[(tt / 2.5 | 0) % CYCLE.length];

    ctx.save();
    ctx.globalAlpha = droneAlpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.sin(tt * 2.3) * 0.05 + droneSide * -0.06); // banked toward the track

    // searchlight: sweeps the track on patrol, locks on you in a chase
    const sweep = chase ? (P.x - rx) * 0.02 : Math.sin(tt * 1.6) * 0.8;
    const reach = 70 * u;
    ctx.fillStyle = chase ? `rgba(255,45,77,${0.12 + closeness * 0.1})`
                          : `rgba(${lightC === '#2d8cff' ? '45,140,255' : '255,180,60'},0.09)`;
    ctx.beginPath();
    ctx.moveTo(-3 * u, 6 * u); ctx.lineTo(3 * u, 6 * u);
    ctx.lineTo((sweep * 60 - droneSide * 40) * u + 18 * u, reach);
    ctx.lineTo((sweep * 60 - droneSide * 40) * u - 18 * u, reach);
    ctx.closePath(); ctx.fill();

    // X-frame: rear pair big and low, front pair smaller and high
    const hubs = [
      { x: -20, y: -6, r: 11 }, { x: 20, y: -6, r: 11 },
      { x: -13, y: -13, r: 8 }, { x: 13, y: -13, r: 8 },
    ];
    ctx.strokeStyle = '#232833';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, 3.4 * u);
    for (const h of hubs) {
      ctx.beginPath(); ctx.moveTo(0, -6 * u); ctx.lineTo(h.x * u, h.y * u); ctx.stroke();
    }
    // rotors: translucent blur disc + a spinning blade line + hub cap
    for (let i = 0; i < hubs.length; i++) {
      const h = hubs[i];
      ctx.fillStyle = 'rgba(200,210,225,.13)';
      ctx.beginPath(); ctx.ellipse(h.x * u, h.y * u, h.r * u, h.r * 0.32 * u, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(220,228,240,.55)';
      ctx.lineWidth = Math.max(1, 1.6 * u);
      const a = tt * (26 + i * 3);
      ctx.beginPath();
      ctx.moveTo(h.x * u - Math.cos(a) * h.r * u, h.y * u - Math.sin(a) * h.r * 0.32 * u);
      ctx.lineTo(h.x * u + Math.cos(a) * h.r * u, h.y * u + Math.sin(a) * h.r * 0.32 * u);
      ctx.stroke();
      ctx.fillStyle = '#39424e';
      ctx.beginPath(); ctx.arc(h.x * u, h.y * u, 2.2 * u, 0, 7); ctx.fill();
    }
    // body shell, two-tone
    ctx.fillStyle = '#39424e';
    rr(-9 * u, -10 * u, 18 * u, 12 * u, 3 * u); ctx.fill();
    ctx.fillStyle = '#4a5568';
    rr(-9 * u, -10 * u, 18 * u, 5 * u, 3 * u); ctx.fill();
    // landing skids
    ctx.strokeStyle = '#232833';
    ctx.lineWidth = Math.max(1, 2 * u);
    ctx.beginPath();
    ctx.moveTo(-7 * u, 2 * u); ctx.lineTo(-8 * u, 6 * u);
    ctx.moveTo(7 * u, 2 * u); ctx.lineTo(8 * u, 6 * u);
    ctx.moveTo(-11 * u, 6 * u); ctx.lineTo(-5 * u, 6 * u);
    ctx.moveTo(5 * u, 6 * u); ctx.lineTo(11 * u, 6 * u);
    ctx.stroke();
    // camera gimbal — the eye takes the cycling light color
    ctx.fillStyle = '#232833';
    ctx.beginPath(); ctx.arc(0, 3.4 * u, 3.4 * u, 0, 7); ctx.fill();
    ctx.fillStyle = lightC;
    ctx.shadowColor = lightC; ctx.shadowBlur = 10 + closeness * 10;
    ctx.beginPath(); ctx.arc(0, 3.4 * u, (1.7 + 0.5 * Math.sin(tt * 9)) * u, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    // beacon LEDs on the arms — cycling color, blinking
    const blink = Math.sin(tt * 7) > 0 ? 1 : 0.3;
    ctx.globalAlpha = droneAlpha * blink;
    ctx.fillStyle = lightC;
    ctx.shadowColor = lightC; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(-20 * u, -4 * u, 1.5 * u, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(20 * u, -4 * u, 1.5 * u, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-13 * u, -11.5 * u, 1.2 * u, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(13 * u, -11.5 * u, 1.2 * u, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ================= HUD / SHEET ================= */
  function updateHUD() {
    $('bits').textContent = fmt(save.bits);
    $('multTag').textContent = '×' + save.mult;
    $('surfBest').textContent = fmt(save.sel === 'daily' ? save.dailyBest : save.bestScore);
  }

  function updateRunHUD() {
    $('runScore').textContent = fmtInt(score());
    $('runSub').innerHTML = '⬡ <b>+' + fmt(RS.bits) + '</b> · <i>×' + save.mult + '</i> · <span>' + distM() + 'm</span>';
    // la barra de heat solo se muestra con heat activo (HUD limpio)
    if (heat > 0) {
      $('heatWrap').classList.remove('hidden');
      $('heatBar').style.width = Math.max(0, 1 - (tt - lastStumble) / DATA.HEAT_T) * 100 + '%';
    } else {
      $('heatWrap').classList.add('hidden');
      $('heatBar').style.width = '0%';
    }
    const pt = $('powerTag');
    if (magnetT > 0) { pt.classList.remove('hidden'); pt.textContent = '🧲 MAGNET ' + Math.ceil(magnetT) + 's'; }
    else if (x2T > 0) { pt.classList.remove('hidden'); pt.textContent = '✖️ DOUBLE ' + Math.ceil(x2T) + 's'; }
    else if (shield) { pt.classList.remove('hidden'); pt.textContent = '🛡️ SHIELD'; }
    else pt.classList.add('hidden');
  }

  let goldenLbl = '';
  function updateGoldenBtn() {
    const b = $('btnGolden');
    let lbl;
    if (goldenT > 0) { lbl = '×2 ACTIVE · ' + Math.ceil(goldenT) + 's'; b.className = 'gold-btn on'; }
    else if (goldenCd > 0) { lbl = 'READY IN ' + fmtTime(goldenCd); b.className = 'gold-btn cooling'; }
    else { lbl = '▶ OVERCLOCK'; b.className = 'gold-btn'; }
    if (lbl !== goldenLbl) {
      goldenLbl = lbl;
      b.innerHTML = lbl + '<small>watch ad · ×2 bits for 60s</small>';
    }
  }

  let tab = 'modes';
  function renderSheet() {
    if (tab === 'modes') renderModes();
    else if (tab === 'missions') renderMissions();
    else renderRunners();
    $('btnPlay').innerHTML = '▶ ' + mode().name +
      '<small>swipe to dodge · up = jump · down = slide</small>';
  }

  function renderModes() {
    $('sheetBody').innerHTML = DATA.modes.map(m => {
      const best = m.id === 'daily' ? save.dailyBest : save.bestScore;
      return `<button class="mode ${save.sel === m.id ? 'sel' : ''} ${m.id === 'daily' ? 'daily' : ''}" data-action="sel:${m.id}">
        <div class="mode-ico">${m.id === 'daily' ? '🗓' : '🏙'}</div>
        <div class="mode-mid">
          <div class="mode-nm">${m.name}</div>
          <div class="mode-ds">${m.desc}</div>
        </div>
        <div class="mode-best">${fmt(best)}<small>${m.id === 'daily' ? 'TODAY' : 'BEST'}</small></div>
      </button>`;
    }).join('') +
    `<div class="up-head">multiplier <b>×${save.mult}</b> · best distance <b>${save.bestDist}m</b> · runs <b>${fmtInt(save.lifeRuns)}</b></div>` +
    `<div class="feat-grid">` + DATA.feats.map(f => {
      const got = !!save.feats[f.id];
      return `<div class="feat-card ${got ? 'done' : 'locked'}">
        <div class="feat-ico">${got ? f.ico : '❔'}</div>
        <div class="feat-name">${got ? f.name : '???'}</div>
        <div class="feat-hint">${f.hint}</div>
      </div>`;
    }).join('') + '</div>';
  }

  function renderMissions() {
    $('sheetBody').innerHTML =
      `<div class="up-head">every 3 missions → <b>+${DATA.MULT_STEP} PERMANENT multiplier</b> (now ×${save.mult})</div>` +
      DATA.missions.map(ms => {
        const tier = save.tiers[ms.id] || 0;
        const maxed = tier >= ms.tiers.length;
        const target = maxed ? ms.tiers[ms.tiers.length - 1] : ms.tiers[tier];
        return `<div class="mission ${maxed ? 'done' : ''}">
          <div class="mis-ico">${maxed ? '✅' : '🎯'}</div>
          <div class="mis-mid">
            <div class="mis-nm">${ms.name.replace('{n}', fmtInt(target))}</div>
            ${maxed ? '<div class="mis-sub">MAXED — legend behavior</div>'
                    : `<div class="mis-sub">tier <b>${tier + 1}</b>/${ms.tiers.length} · reward <b>+${60 * (tier + 1)} ⬡</b></div>`}
          </div>
        </div>`;
      }).join('');
  }

  function renderRunners() {
    $('sheetBody').innerHTML =
      `<div class="up-head">⬡ <b>${fmt(save.bits)}</b> · pure flex, zero pay-to-win</div>` +
      '<div class="skin-grid">' + DATA.runners.map(c => {
        const owned = !!save.runners[c.id];
        const eq = save.runner === c.id;
        return `<button class="skin-card ${eq ? 'equip' : ''} ${owned ? '' : 'locked'}" data-action="runner:${c.id}">
          <div class="skin-dot" style="--c:${c.c}"></div>
          <div class="skin-name">${c.name}</div>
          <div class="skin-sub">${eq ? 'ON' : owned ? 'wear' : '⬡ <b>' + fmt(c.cost) + '</b>'}</div>
        </button>`;
      }).join('') + '</div>';
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= BUTTONS ================= */
  $('btnPlay').addEventListener('click', () => { if (state === ST.SURFACE) { A.tap(); startRun(); } });

  $('btnGolden').addEventListener('click', () => {
    if (goldenT > 0 || goldenCd > 0) { A.deny(); return; }
    BR.SDK.rewardedAd(() => {
      goldenT = 60; goldenCd = 180;
      A.golden();
    }, () => A.deny());
  });

  $('dRetry').addEventListener('click', () => { if (state === ST.DEAD) retry(); });
  $('dMenu').addEventListener('click', toMenu);
  $('dDouble').addEventListener('click', () => {
    BR.SDK.rewardedAd(() => {
      const extra = RS ? RS.bits : 0;
      save.bits += extra; save.lifeBits += extra;
      $('dBits').textContent = '⬡ +' + fmt(extra * 2) + ' banked';
      if (RS) RS.bits = 0;
      persist(); updateHUD(); A.cash();
    }, () => A.deny());
  });
  $('dRevive').addEventListener('click', () => {
    if (usedRevive) return;
    BR.SDK.rewardedAd(revive, () => A.deny());
  });
  $('dShare').addEventListener('click', () => shareText(
    `🏃 scored ${$('dScore').textContent} (${$('dDist').textContent} ×${save.mult}) on BYTERUNNER${mode().id === 'daily' ? "'s DAILY HEIST" : ''} — beat that.`));

  document.querySelectorAll('.stab').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.stab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      tab = b.dataset.tab;
      A.tap();
      renderSheet();
    });
  });
  $('sheetBody').addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const [act, id] = el.dataset.action.split(':');
    if (act === 'sel') {
      save.sel = id; A.tap(); persist();
      renderSheet(); updateHUD();
    } else if (act === 'runner') {
      const c = DATA.runners.find(x => x.id === id);
      if (save.runners[id]) { save.runner = id; A.tap(); }
      else if (save.bits >= c.cost) {
        save.bits -= c.cost; save.runners[id] = true; save.runner = id;
        A.cash();
        if (DATA.runners.every(x => save.runners[x.id])) feat('allskins');
      } else { A.deny(); return; }
      persist(); renderRunners(); updateHUD();
    }
  });

  $('btnSound').addEventListener('click', () => {
    save.sound = !save.sound;
    A.enabled = save.sound;
    persist();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    A.tap();
  });

  $('btnShare').addEventListener('click', () => shareText(
    `🏃 my best on BYTERUNNER is ${fmtInt(save.bestScore)} (×${save.mult} multiplier) — beat that.`));
  async function shareText(text) {
    let url = location.href;
    const cg = await BR.SDK.invite({});
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'ByteRunner', text, url }); return; } } catch (e) {}
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      const el = $('shareToast');
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1600);
    } catch (e) {}
  }

  /* ================= BOOT + LOOP ================= */
  (async function boot() {
    BR.SDK.loadingStart();
    // init del SDK en paralelo: fuera de CrazyGames tarda hasta 3s (timeout) y
    // bloqueaba el arranque → menú NEGRO los primeros segundos. El attract
    // arranca ya; el SDK se engancha cuando esté.
    const sdkReady = BR.SDK.init();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    trackReset(7);                 // attract city behind the menu
    ensure(160);
    P = { z: SEG * 2, v: 300, lane: 1, x: 0, jumpT: 0, slideT: 0, y: 0 };
    renderSheet(); updateHUD();
    requestAnimationFrame(loop);
    await sdkReady;
    BR.SDK.loadingStop();
  })();

  function loop(now) {
    const dt = Math.min((now - rawLast) / 1000, 0.05);
    rawLast = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
})();
