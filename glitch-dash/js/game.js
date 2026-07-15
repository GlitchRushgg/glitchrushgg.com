/* ============================================================
   GLITCHDASH — one-tap rhythm rage runner. The studio game.

   Tap to jump. Hold to keep jumping. The cube never stops.
   7 fixed-seed Sectors (identical for every player on earth —
   "I died at 91% on MALWARE" means the same thing everywhere)
   plus the date-seeded DAILY GLITCH. Obstacles sit on the beat
   grid of a procedural soundtrack, so the level IS the song.

   Death is the loop: instant retry, attempt counter worn like
   a badge, progress % as bragging currency. Shards buy skins —
   pure flex, zero pay-to-win, the skill stays sacred.

   Generation law: every pattern is self-contained and closes
   its own gravity portals; pattern boundaries are always flat,
   normal-gravity ground — that's what makes checkpoints safe.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = GD.Audio;

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'glitchDash_v1';
  const save = {
    shards: 0, totalAttempts: 0, sel: 's1',
    best: {}, att: {}, crowns: {},
    cubes: { og: true }, cube: 'og', trails: { none: true }, trail: 'none',
    feats: {}, dailyClears: 0, dailyDate: '', dailyBest: 0, dailyAtt: 0,
    sound: true, lastSeen: Date.now(),
  };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  if (!save.cubes.og) save.cubes.og = true;
  if (!save.trails.none) save.trails.none = true;
  function persist() {
    save.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  A.enabled = save.sound;

  // daily state resets when the date rolls over
  const today = () => new Date().toDateString();
  if (save.dailyDate !== today()) { save.dailyDate = today(); save.dailyBest = 0; save.dailyAtt = 0; }

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

  /* ================= LEVEL GENERATION ================= */
  const U = DATA.UNIT, CUBE = DATA.CUBE;
  const GY = 0;                 // floor top (world y; camera handles placement)
  const CY = -240;              // corridor ceiling inside flip zones
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let level = null;             // {len, spikes, blocks, pits, portals, pickups, flips, cps, sector}
  function sectorById(id) {
    return id === 'daily' ? DATA.daily() : DATA.sectors.find(s => s.id === id);
  }

  function generate(sec) {
    const rng = mulberry32(sec.seed);
    const L = { len: sec.len, spikes: [], blocks: [], pits: [], portals: [],
                pickups: [], flips: [], cps: [], sector: sec };
    const spike = (x, y, flip) => L.spikes.push({ x, y, flip: !!flip });
    const block = (x, y, w, h) => L.blocks.push({ x, y, w, h });
    const pick  = (x, y) => L.pickups.push({ x, y, taken: false });

    let u = 10;                                    // flat runway to start
    const bound = [];                              // pattern boundaries (safe spots)
    while (u * U < sec.len - 14 * U) {
      bound.push(u * U);
      // breathe more on easier sectors
      if (rng() > sec.density) {
        for (let i = 1; i < 4; i++) pick((u + i) * U, GY - 40 - (i % 2) * 22);
        u += 5;
        continue;
      }
      const opts = DATA.patterns.filter(p => p.gnar <= sec.gnar);
      let tot = 0; for (const p of opts) tot += p.w;
      let r = rng() * tot, pat = opts[0];
      for (const p of opts) { r -= p.w; if (r <= 0) { pat = p; break; } }

      const x = u * U;
      switch (pat.id) {
        case 'spike1': spike(x + 3 * U, GY); pick(x + 3 * U, GY - 100); break;
        case 'spike2': spike(x + 3 * U, GY); spike(x + 3.9 * U, GY); pick(x + 3.4 * U, GY - 110); break;
        case 'spike3':
          spike(x + 3 * U, GY); spike(x + 3.9 * U, GY); spike(x + 4.8 * U, GY);
          pick(x + 3.9 * U, GY - 120);
          break;
        case 'block': block(x + 3 * U, GY - U, 2 * U, U); pick(x + 3.5 * U, GY - U - 40); break;
        case 'blockGap':
          block(x + 2.5 * U, GY - U, 2 * U, U);
          L.pits.push({ x0: x + 5 * U, x1: x + 6.8 * U });
          break;
        case 'tower':
          block(x + 2.5 * U, GY - U, 2 * U, U);
          block(x + 5.2 * U, GY - 2 * U, 2 * U, 2 * U);
          pick(x + 6 * U, GY - 2 * U - 40);
          break;
        case 'pit': L.pits.push({ x0: x + 2.5 * U, x1: x + 4.6 * U }); pick(x + 3.5 * U, GY - 70); break;
        case 'pitSpike':
          L.pits.push({ x0: x + 2.5 * U, x1: x + 4.3 * U });
          spike(x + 5.4 * U, GY);
          break;
        case 'spikeOnBlock':
          block(x + 3 * U, GY - U, 3 * U, U);
          spike(x + 4 * U, GY - U);
          pick(x + 4 * U, GY - U - 90);
          break;
        case 'flip': {
          const zx0 = x + 2 * U, zx1 = x + (pat.units + 6) * U;
          L.portals.push({ x: zx0, dir: -1 });
          L.portals.push({ x: zx1, dir: 1 });
          L.flips.push({ x0: zx0 - U, x1: zx1 + U });
          spike(x + 5 * U, CY, true);
          if (sec.gnar >= 2) spike(x + 8 * U, CY, true);
          if (sec.gnar >= 4) spike(x + 8.9 * U, CY, true);
          for (let i = 0; i < 3; i++) pick(x + (6 + i) * U, CY + 60);
          u += 6;                                  // flip pattern is longer
          break;
        }
        case 'breather':
          for (let i = 1; i < 4; i++) pick((u + i) * U, GY - 40 - (i % 2) * 22);
          break;
      }
      u += pat.units;
    }
    // checkpoints: nearest safe boundary to each fraction
    for (const f of DATA.CHECKPOINTS) {
      const target = sec.len * f;
      let best = bound[0] || 10 * U;
      for (const b of bound) if (Math.abs(b - target) < Math.abs(best - target)) best = b;
      L.cps.push(best);
    }
    return L;
  }

  /* ================= STATE ================= */
  const ST = { SURFACE: 0, RUN: 1, DEAD: 2, CLEAR: 3 };
  let state = ST.SURFACE;
  let tt = 0, shake = 0, glitchT = 0;
  let held = false;

  const HSTEP = 1 / 120;
  let acc = 0;

  let P = null;                 // {x,y,vy,g,ground,rot}
  let runShards = 0, runPickups = 0, flipsRun = 0, usedRevive = false, startPct = 0;
  let lastPct = 0;
  let goldenT = 0, goldenCd = 0;
  let lastMidgame = 0, sessionAtts = 0;

  let particles = [], floats = [];
  let camY = -140;

  const rand = (a, b) => a + Math.random() * (b - a);
  const cube = () => DATA.cubes.find(c => c.id === save.cube) || DATA.cubes[0];
  const trail = () => DATA.trails.find(t => t.id === save.trail) || DATA.trails[0];
  let trailPts = [];

  /* ================= RUN LIFECYCLE ================= */
  function attempt(fromX) {
    const sec = level.sector;
    for (const c of level.pickups) c.taken = false;
    P = { x: fromX || 10, y: GY - CUBE / 2, vy: 0, g: 1, ground: true, rot: 0 };
    startPct = (fromX || 0) / level.len;
    runShards = 0; runPickups = 0; flipsRun = 0;
    if (!fromX) usedRevive = false;
    trailPts = [];
    acc = 0;
    if (sec.id === 'daily') save.dailyAtt++;
    else save.att[sec.id] = (save.att[sec.id] || 0) + 1;
    save.totalAttempts++;
    sessionAtts++;
    state = ST.RUN;
    A.resume();
    A.musicStart(sec.bpm, sec.seed);
    GD.SDK.gameplayStart();
    hide('sheet'); hide('deathModal'); hide('clearModal'); show('runHud');
  }

  function startRun() {
    level = generate(sectorById(save.sel));
    attempt(0);
  }

  const attsOf = (sec) => sec.id === 'daily' ? save.dailyAtt : (save.att[sec.id] || 0);
  const bestOf = (sec) => sec.id === 'daily' ? save.dailyBest : (save.best[sec.id] || 0);
  function setBest(sec, pct) {
    if (sec.id === 'daily') save.dailyBest = Math.max(save.dailyBest, pct);
    else save.best[sec.id] = Math.max(save.best[sec.id] || 0, pct);
  }

  function feat(id) {
    if (save.feats[id]) return;
    save.feats[id] = 1;
    const f = DATA.feats.find(x => x.id === id);
    addFloat(P ? P.x : 0, GY - 160, '🏅 ' + f.name.toUpperCase());
    A.feat();
    GD.SDK.happyTime();
  }

  function die() {
    const sec = level.sector;
    const pct = Math.min(99, Math.floor(P.x / level.len * 100));
    A.death(); A.musicStop();
    GD.SDK.gameplayStop();
    shake = 0.3; glitchT = 0.35;
    boomFx(P.x, P.y);
    state = ST.DEAD;

    // bank the attempt
    let gained = Math.floor(Math.max(0, pct - startPct * 100) * DATA.SHARD_RUN_RATE)
               + runPickups * DATA.pickupValue;
    if (goldenT > 0) gained *= 2;
    runShards = gained;
    save.shards += gained;
    setBest(sec, pct);

    // feats
    if (pct < 5 && startPct === 0) feat('firstblood');
    if (pct === 99) feat('pain99');
    if (attsOf(sec) >= 100) feat('att100');
    if (attsOf(sec) === 1 && pct >= 50) feat('noflip');
    if (flipsRun >= 10) feat('gravity');
    if (gained >= 500) feat('shard500');
    persist();

    // death panel
    $('dLabel').textContent = 'CRASHED AT';
    $('dPct').textContent = pct + '%';
    $('dAtt').textContent = fmtInt(attsOf(sec));
    $('dBest').textContent = bestOf(sec) + '%';
    $('dShards').textContent = '◆ +' + fmt(gained) + ' banked';
    // revive offer: once per run, only past the first checkpoint
    const cpIdx = highestCp(P.x);
    const rv = $('dRevive');
    if (!usedRevive && cpIdx >= 0) {
      rv.classList.remove('hidden');
      $('dCp').textContent = Math.round(level.cps[cpIdx] / level.len * 100) + '%';
    } else rv.classList.add('hidden');
    hide('runHud'); show('deathModal');
    updateHUD();
  }

  function highestCp(x) {
    let idx = -1;
    for (let i = 0; i < level.cps.length; i++) if (level.cps[i] < x - U * 2) idx = i;
    return idx;
  }

  function clearSector() {
    const sec = level.sector;
    A.musicStop(); A.clear();
    GD.SDK.gameplayStop();
    GD.SDK.happyTime();
    state = ST.CLEAR;
    setBest(sec, 100);
    const firstTime = sec.id === 'daily'
      ? false /* dailies always pay the daily multiplier */
      : !save.crowns[sec.id];
    let bonus = DATA.CLEAR_BONUS * (firstTime ? 4 : 1);
    if (sec.id === 'daily') {
      bonus = DATA.CLEAR_BONUS * DATA.DAILY_CLEAR_X;
      save.dailyClears++;
      feat('daily1');
      if (save.dailyClears >= 7) feat('daily7');
    } else if (firstTime) {
      save.crowns[sec.id] = attsOf(sec);
    }
    let gained = bonus + Math.floor(100 * DATA.SHARD_RUN_RATE) + runPickups * DATA.pickupValue;
    if (goldenT > 0) gained *= 2;
    runShards = gained;
    save.shards += gained;

    const crowns = Object.keys(save.crowns).length;
    feat('clear1');
    if (crowns >= 3) feat('clear3');
    if (crowns >= 7) feat('clear7');
    persist();

    $('cName').textContent = sec.name;
    $('cAtt').textContent = fmtInt(attsOf(sec));
    $('cShards').textContent = '◆ +' + fmt(gained);
    hide('runHud'); show('clearModal');
    updateHUD();
  }

  function retry() {
    // midgame between attempts: rate-limited hard (attempts are seconds long)
    if (sessionAtts > 8 && tt - lastMidgame > 180) {
      lastMidgame = tt;
      GD.SDK.midgameAd(() => attempt(0));
      return;
    }
    attempt(0);
  }

  function toMenu() {
    state = ST.SURFACE;
    A.musicStop();
    hide('deathModal'); hide('clearModal'); hide('runHud'); show('sheet');
    renderSheet(); updateHUD();
  }

  /* ================= PHYSICS ================= */
  function inPit(x) {
    for (const p of level.pits) if (x > p.x0 && x < p.x1) return true;
    return false;
  }
  function inFlipZone(x) {
    for (const z of level.flips) if (x > z.x0 && x < z.x1) return true;
    return false;
  }

  function stepPhysics() {
    const half = CUBE / 2;
    P.x += DATA.SPEED * HSTEP;
    P.vy += DATA.GRAV * P.g * HSTEP;
    P.y += P.vy * HSTEP;

    // jump (hold = auto-jump on landing, the GD way)
    if (held && P.ground) {
      P.vy = -DATA.JUMP_V * P.g;
      P.ground = false;
      A.jump();
    }

    // portals
    for (const po of level.portals) {
      if (!po.hit && P.x > po.x) {
        po.hit = true;                       // reset per attempt in attemptReset below
        P.g = po.dir;
        P.vy *= 0.35;
        flipsRun++;
        A.flip();
        ringFx(P.x, P.y);
      }
    }

    // ground / ceiling
    P.ground = false;
    if (P.g === 1) {
      if (!inPit(P.x) && P.y + half >= GY && P.vy >= 0) {
        P.y = GY - half; P.vy = 0; P.ground = true;
      }
    } else {
      if (inFlipZone(P.x) && P.y - half <= CY && P.vy <= 0) {
        P.y = CY + half; P.vy = 0; P.ground = true;
      }
      if (!inFlipZone(P.x)) P.g = 1;         // zone ended without portal (safety)
    }

    // blocks: land on top, die on the face
    for (const b of level.blocks) {
      if (P.x + half * 0.8 < b.x || P.x - half * 0.8 > b.x + b.w) continue;
      const top = b.y;
      if (P.g === 1 && P.vy >= 0 && P.y + half >= top && P.y + half < top + 26 &&
          P.x > b.x - half * 0.4) {
        P.y = top - half; P.vy = 0; P.ground = true;
      } else if (P.y + half > top + 10 && P.y - half < b.y + b.h) {
        return die();
      }
    }

    // spikes — kill box SMALLER than the visual (rage must feel fair)
    for (const s of level.spikes) {
      if (Math.abs(P.x - s.x) > U * 0.28 + half * 0.45) continue;
      if (s.flip) { if (P.y - half < s.y + 20) return die(); }
      else if (P.y + half > s.y - 20) return die();
    }

    // pit fall
    if (P.g === 1 && P.y - half > GY + 60) return die();
    if (P.g === -1 && P.y + half < CY - 80) return die();

    // pickups
    for (const c of level.pickups) {
      if (c.taken) continue;
      if (Math.abs(c.x - P.x) < 26 && Math.abs(c.y - P.y) < 30) {
        c.taken = true;
        runPickups++;
        addFloat(c.x, c.y - 10, '◆');
        A.pickup();
      }
    }

    // spin in the air
    if (!P.ground) P.rot += 5.4 * HSTEP * P.g;
    else P.rot = Math.round(P.rot / (Math.PI / 2)) * (Math.PI / 2);

    // the finish line
    if (P.x >= level.len) return clearSector();
  }

  /* ================= FX ================= */
  function boomFx(x, y) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(80, 320);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                       life: rand(0.3, 0.7), size: rand(2, 5), c: cube().c });
    }
  }
  function ringFx(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({ x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120,
                       life: 0.35, size: 2.5, c: '#c79bff' });
    }
  }
  function addFloat(x, y, txt) { floats.push({ x, y, txt, t: 1 }); }
  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.t -= dt * 0.9;
      if (f.t <= 0) floats.splice(i, 1);
    }
  }

  /* ================= UPDATE ================= */
  let rawLast = performance.now();
  function update(dt) {
    tt += dt;
    if (shake > 0) shake -= dt;
    if (glitchT > 0) glitchT -= dt;
    if (goldenT > 0) goldenT -= dt;
    else if (goldenCd > 0) goldenCd -= dt;
    updateFx(dt);

    if (state === ST.RUN) {
      acc += Math.min(dt, 0.05);
      while (acc >= HSTEP && state === ST.RUN) { stepPhysics(); acc -= HSTEP; }
      if (state === ST.RUN) {
        trailPts.push({ x: P.x, y: P.y, t: 0.4 });
        if (trailPts.length > 26) trailPts.shift();
        updateRunHUD();
      }
    }
    for (const t of trailPts) t.t -= dt;

    // camera vertical: follow between floor and ceiling worlds
    const targetY = P && state !== ST.SURFACE ? (P.y - 90) : -140;
    camY += (targetY - camY) * Math.min(1, dt * 6);

    if (state === ST.SURFACE) updateGoldenBtn();
  }

  /* ================= RENDER ================= */
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sec = level ? level.sector : sectorById(save.sel);
    const hue = sec.hue;
    const pulse = state === ST.RUN ? A.beatPulse() : (Math.sin(tt * 2) * 0.5 + 0.5);
    const glow = 0.06 + 0.05 * (1 - pulse);

    // bg
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#070812');
    g.addColorStop(1, `hsl(${hue},45%,10%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const camX = P && state !== ST.SURFACE ? P.x - LW * 0.3 : tt * 40 % 1000;

    // beat-pulsing grid
    ctx.strokeStyle = `hsla(${hue},80%,60%,${glow})`;
    ctx.lineWidth = 1;
    const gs = 60;
    ctx.beginPath();
    for (let x = -(camX % gs) * scale + offX; x < W; x += gs * scale) {
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
    }
    for (let y = offY + ((-camY % gs) + gs) % gs * scale; y < H; y += gs * scale) {
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
    ctx.stroke();
    // atenuar el grid lejano (arriba) — daba un plano uniforme sin
    // profundidad (hallazgo de auditoría visual)
    const gv = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    gv.addColorStop(0, 'rgba(7,8,18,.75)');
    gv.addColorStop(1, 'rgba(7,8,18,0)');
    ctx.fillStyle = gv;
    ctx.fillRect(0, 0, W, H * 0.55);

    ctx.save();
    ctx.translate(offX + LW * 0.3 * scale, offY + LH * 0.52 * scale);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 18, rand(-1, 1) * shake * 18);
    ctx.translate(-camX, -camY - 90);

    if (level) drawLevel(camX, hue);
    if (P && state !== ST.SURFACE && state !== ST.DEAD) drawCube();

    // particles
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2.4);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // floats
    ctx.textAlign = 'center';
    ctx.font = '800 15px "Segoe UI", sans-serif';
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, f.t * 1.6);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#4de0ff'; ctx.shadowBlur = 8;
      ctx.fillText(f.txt, f.x, f.y - (1 - f.t) * 36);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // death glitch bars
    if (glitchT > 0) {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `hsla(${rand(0, 360)},90%,60%,${glitchT * rand(0.2, 0.6)})`;
        ctx.fillRect(0, rand(0, H), W, rand(2, 12));
      }
    }
  }

  function drawLevel(camX, hue) {
    const x0 = camX - LW * 0.4, x1 = camX + LW;
    const col = `hsl(${hue},85%,60%)`;

    // floor with pits
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = col; ctx.shadowBlur = 12;
    ctx.beginPath();
    let x = x0;
    const pits = level.pits.filter(p => p.x1 > x0 && p.x0 < x1).sort((a, b) => a.x0 - b.x0);
    for (const p of pits) {
      ctx.moveTo(x, GY); ctx.lineTo(p.x0, GY);
      x = p.x1;
    }
    ctx.moveTo(x, GY); ctx.lineTo(x1, GY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // ground fill — glow del sector que se desvanece bajo la línea del suelo
    // (antes: rect plano gigante — hallazgo de auditoría visual)
    const gg = ctx.createLinearGradient(0, GY, 0, GY + 400);
    gg.addColorStop(0, `hsla(${hue},75%,45%,.34)`);
    gg.addColorStop(0.25, `hsla(${hue},65%,28%,.18)`);
    gg.addColorStop(1, `hsla(${hue},60%,12%,.02)`);
    ctx.fillStyle = gg;
    ctx.fillRect(x0, GY, x1 - x0, 400);

    // flip corridors
    for (const z of level.flips) {
      if (z.x1 < x0 || z.x0 > x1) continue;
      ctx.strokeStyle = '#c79bff';
      ctx.shadowColor = '#c79bff'; ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Math.max(x0, z.x0), CY); ctx.lineTo(Math.min(x1, z.x1), CY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // portals
    for (const po of level.portals) {
      if (po.x < x0 || po.x > x1) continue;
      ctx.strokeStyle = '#c79bff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#c79bff'; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(po.x, (GY + CY) / 2, 12, (GY - CY) / 2 + 20, 0, 0, 7);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // blocks
    for (const b of level.blocks) {
      if (b.x + b.w < x0 || b.x > x1) continue;
      ctx.fillStyle = `hsla(${hue},70%,30%,.75)`;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }

    // spikes
    ctx.fillStyle = `hsl(${(hue + 40) % 360},90%,62%)`;
    for (const s of level.spikes) {
      if (s.x < x0 || s.x > x1) continue;
      ctx.beginPath();
      if (s.flip) {
        ctx.moveTo(s.x - U * 0.45, s.y); ctx.lineTo(s.x + U * 0.45, s.y); ctx.lineTo(s.x, s.y + 26);
      } else {
        ctx.moveTo(s.x - U * 0.45, s.y); ctx.lineTo(s.x + U * 0.45, s.y); ctx.lineTo(s.x, s.y - 26);
      }
      ctx.closePath(); ctx.fill();
    }

    // pickups
    for (const c of level.pickups) {
      if (c.taken || c.x < x0 || c.x > x1) continue;
      const bob = Math.sin(tt * 4 + c.x * 0.05) * 2;
      ctx.fillStyle = '#4de0ff';
      ctx.shadowColor = '#4de0ff'; ctx.shadowBlur = 8;
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    // attempt tag in the world (the GD signature)
    if (state !== ST.SURFACE) {
      ctx.textAlign = 'left';
      ctx.font = '800 26px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillText('ATTEMPT ' + fmtInt(attsOf(level.sector)), startPct * level.len + 40, GY - 120);
    }

    // finish line
    if (level.len < x1) {
      ctx.strokeStyle = '#5de08a';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#5de08a'; ctx.shadowBlur = 16;
      ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(level.len, GY - 300); ctx.lineTo(level.len, GY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }
  }

  function drawCube() {
    const c = cube();
    // trail
    const tr = trail();
    if (tr.c && trailPts.length > 1) {
      for (let i = 1; i < trailPts.length; i++) {
        const a = Math.max(0, trailPts[i].t) * 2;
        if (a <= 0) continue;
        if (tr.c === 'rgb') {
          const hues = ['#ff3860', '#5de08a', '#4de0ff'];
          ctx.fillStyle = hues[i % 3];
        } else ctx.fillStyle = tr.c;
        ctx.globalAlpha = Math.min(0.5, a * 0.4);
        const s = 6 + (i / trailPts.length) * 8;
        ctx.fillRect(trailPts[i].x - s / 2, trailPts[i].y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(P.x, P.y);
    ctx.rotate(P.rot);
    ctx.shadowColor = c.c; ctx.shadowBlur = 16;
    ctx.fillStyle = c.c;
    const h = CUBE / 2;
    ctx.fillRect(-h, -h, CUBE, CUBE);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-h, -h, CUBE, CUBE);
    drawFace(c.face, h);
    ctx.restore();
  }

  function drawFace(face, h) {
    const d = 'rgba(7,8,18,.9)';
    ctx.fillStyle = d;
    if (face === 'pixel') {
      ctx.fillRect(-9, -6, 5, 5); ctx.fillRect(4, -6, 5, 5);
      ctx.fillRect(-6, 5, 12, 3);
    } else if (face === 'void') {
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill();
    } else if (face === 'glitch') {
      ctx.fillRect(-10, -7, 6, 3); ctx.fillRect(3, -8, 7, 5);
      ctx.fillRect(-7, 4, 5, 4); ctx.fillRect(2, 5, 8, 2);
    } else if (face === 'king') {
      ctx.fillRect(-9, -4, 5, 6); ctx.fillRect(4, -4, 5, 6);
      ctx.fillStyle = '#3a2800';
      ctx.beginPath(); ctx.moveTo(-8, -h + 2); ctx.lineTo(-4, -h - 6); ctx.lineTo(0, -h + 1);
      ctx.lineTo(4, -h - 6); ctx.lineTo(8, -h + 2); ctx.closePath(); ctx.fill();
    } else {
      // eyes
      ctx.fillRect(-9, -6, 5, face === 'angry' ? 8 : 6);
      ctx.fillRect(4, -6, 5, face === 'angry' ? 8 : 6);
      // mouth
      if (face === 'happy') ctx.fillRect(-5, 5, 10, 3);
      else if (face === 'smug') ctx.fillRect(0, 5, 8, 3);
      else if (face === 'uwu') { ctx.fillRect(-6, 5, 4, 3); ctx.fillRect(2, 5, 4, 3); }
      else if (face === 'dizzy') ctx.fillRect(-7, 6, 14, 2);
      else if (face === 'cool') ctx.fillRect(-10, -6, 20, 4);
      else if (face === 'ninja') ctx.fillRect(-10, -5, 20, 5);
    }
  }

  /* ================= HUD / SHEET ================= */
  function updateHUD() {
    $('shards').textContent = fmt(save.shards);
    const crowns = Object.keys(save.crowns).length;
    $('crownTag').textContent = crowns > 0 ? ' 👑' + crowns : '';
    $('surfBest').textContent = bestOf(sectorById(save.sel)) + '%';
  }

  function updateRunHUD() {
    const pct = Math.min(100, P.x / level.len * 100);
    if ((pct | 0) !== lastPct) {
      lastPct = pct | 0;
      $('runPct').textContent = (pct | 0) + '%';
      $('progBar').style.width = pct + '%';
    }
    $('runShards').innerHTML = '◆ <b>+' + fmt(Math.floor(
      Math.max(0, pct - startPct * 100) * DATA.SHARD_RUN_RATE) + runPickups * DATA.pickupValue) + '</b>';
  }

  let goldenLbl = '';
  function updateGoldenBtn() {
    const b = $('btnGolden');
    let lbl;
    if (goldenT > 0) { lbl = '×2 ACTIVE · ' + Math.ceil(goldenT) + 's'; b.className = 'gold-btn on'; }
    else if (goldenCd > 0) { lbl = 'READY IN ' + fmtTime(goldenCd); b.className = 'gold-btn cooling'; }
    else { lbl = '▶ SHARD RUSH'; b.className = 'gold-btn'; }
    if (lbl !== goldenLbl) {
      goldenLbl = lbl;
      b.innerHTML = lbl + '<small>watch ad · ×2 shards for 60s</small>';
    }
  }

  /* ---------- sheet tabs ---------- */
  let tab = 'sectors';
  function renderSheet() {
    if (tab === 'sectors') renderSectors();
    else if (tab === 'skins') renderSkins();
    else renderFeats();
    const sec = sectorById(save.sel);
    $('btnPlay').innerHTML = '▶ ' + sec.name +
      '<small>one tap to jump · hold to keep jumping</small>';
  }

  function renderSectors() {
    const daily = DATA.daily();
    const list = [daily, ...DATA.sectors];
    $('sheetBody').innerHTML = list.map((s, i) => {
      const best = bestOf(s);
      const crowned = s.id !== 'daily' && !!save.crowns[s.id];
      const sel = save.sel === s.id;
      return `<button class="sector ${sel ? 'sel' : ''} ${s.id === 'daily' ? 'daily' : ''}" data-action="sel:${s.id}">
        <div class="sec-hue" style="--c:hsl(${s.hue},85%,60%)">${s.id === 'daily' ? '🗓' : i}</div>
        <div class="sec-mid">
          <div class="sec-nm">${s.name}</div>
          <div class="sec-sub">${s.id === 'daily'
            ? 'everyone plays the SAME level today · clear pays ×' + DATA.DAILY_CLEAR_X
            : 'best <b>' + best + '%</b> · ' + fmtInt(save.att[s.id] || 0) + ' attempts'}</div>
          <div class="sec-bar"><div class="sec-fill" style="width:${best}%"></div></div>
        </div>
        <div class="sec-crown">${crowned ? '👑' : ''}</div>
      </button>`;
    }).join('');
  }

  function renderSkins() {
    const body = $('sheetBody');
    body.innerHTML =
      `<div class="up-head">◆ <b>${fmt(save.shards)}</b> · pure flex, zero pay-to-win</div>` +
      '<div class="skin-grid">' + DATA.cubes.map(c => {
        const owned = !!save.cubes[c.id];
        const eq = save.cube === c.id;
        return `<button class="skin-card ${eq ? 'equip' : ''} ${owned ? '' : 'locked'}" data-action="cube:${c.id}">
          <canvas class="skin-canvas" data-cube="${c.id}" width="88" height="88"></canvas>
          <div class="skin-name">${c.name}</div>
          <div class="skin-sub">${eq ? 'ON' : owned ? 'tap to wear' : '◆ <b>' + fmt(c.cost) + '</b>'}</div>
        </button>`;
      }).join('') + '</div>' +
      '<div class="up-head" style="margin-top:6px;">TRAILS</div>' +
      '<div class="trail-row">' + DATA.trails.map(t => {
        const owned = !!save.trails[t.id];
        const eq = save.trail === t.id;
        return `<button class="skin-card ${eq ? 'equip' : ''} ${owned ? '' : 'locked'}" data-action="trail:${t.id}">
          <div class="skin-name">${t.name}</div>
          <div class="skin-sub">${eq ? 'ON' : owned ? 'tap to wear' : '◆ <b>' + fmt(t.cost) + '</b>'}</div>
        </button>`;
      }).join('') + '</div>';
    body.querySelectorAll('canvas[data-cube]').forEach(el => {
      const c = DATA.cubes.find(x => x.id === el.dataset.cube);
      const g2 = el.getContext('2d');
      g2.clearRect(0, 0, 88, 88);
      g2.save();
      g2.translate(44, 44);
      g2.fillStyle = save.cubes[c.id] ? c.c : '#232a42';
      g2.fillRect(-22, -22, 44, 44);
      g2.strokeStyle = 'rgba(255,255,255,.8)';
      g2.lineWidth = 2.5;
      g2.strokeRect(-22, -22, 44, 44);
      // simplified face preview at 1.5× scale
      g2.scale(1.5, 1.5);
      try { drawFaceOn(g2, c.face); } catch (e) {}
      g2.restore();
    });
  }
  function drawFaceOn(g2, face) {
    g2.fillStyle = 'rgba(7,8,18,.9)';
    if (face === 'void') { g2.beginPath(); g2.arc(0, 0, 7, 0, 7); g2.fill(); return; }
    g2.fillRect(-9, -6, 5, 6); g2.fillRect(4, -6, 5, 6);
    if (face !== 'ninja' && face !== 'cool') g2.fillRect(-5, 5, 10, 3);
  }

  function renderFeats() {
    const done = DATA.feats.filter(f => save.feats[f.id]).length;
    $('sheetBody').innerHTML = '<div class="up-head">FEATS — <b>' + done + '/' +
      DATA.feats.length + '</b> · brag responsibly</div>' +
      '<div class="feat-grid">' + DATA.feats.map(f => {
        const got = !!save.feats[f.id];
        return `<div class="feat-card ${got ? 'done' : 'locked'}">
          <div class="feat-ico">${got ? f.ico : '❔'}</div>
          <div class="feat-name">${got ? f.name : '???'}</div>
          <div class="feat-hint">${f.hint}</div>
        </div>`;
      }).join('') + '</div>';
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= INPUT ================= */
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .sheet')) return;
    A.resume();
    if (state === ST.SURFACE) { startRun(); held = true; return; }
    if (state === ST.RUN) { held = true; return; }
    if (state === ST.DEAD) { retryFromModal(); return; }
    if (state === ST.CLEAR) { /* buttons only */ }
  });
  window.addEventListener('pointerup', () => { held = false; });
  window.addEventListener('pointercancel', () => { held = false; });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
    if (e.repeat) return;
    A.resume();
    if (state === ST.SURFACE) { startRun(); held = true; return; }
    if (state === ST.RUN) { held = true; return; }
    if (state === ST.DEAD) retryFromModal();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') held = false;
  });

  function retryFromModal() {
    if (state !== ST.DEAD) return;
    // reset portal hit flags for the fresh attempt
    for (const po of level.portals) po.hit = false;
    retry();
  }

  /* ================= BUTTONS ================= */
  $('btnPlay').addEventListener('click', () => { if (state === ST.SURFACE) { A.tap(); startRun(); } });

  $('btnGolden').addEventListener('click', () => {
    if (goldenT > 0 || goldenCd > 0) { A.deny(); return; }
    GD.SDK.rewardedAd(() => {
      goldenT = 60; goldenCd = 180;
      A.golden();
    }, () => A.deny());
  });

  $('dRetry').addEventListener('click', retryFromModal);
  $('dMenu').addEventListener('click', toMenu);
  $('dDouble').addEventListener('click', () => {
    GD.SDK.rewardedAd(() => {
      save.shards += runShards;             // double = grant it again
      $('dShards').textContent = '◆ +' + fmt(runShards * 2) + ' banked';
      runShards = 0;                        // guard double-double
      persist(); updateHUD(); A.cash();
    }, () => A.deny());
  });
  $('dRevive').addEventListener('click', () => {
    GD.SDK.rewardedAd(() => {
      usedRevive = true;
      const cp = level.cps[highestCp(P.x)];
      for (const po of level.portals) po.hit = po.x < cp;
      A.revive();
      A.checkpoint();
      attemptRevive(cp);
    }, () => A.deny());
  });
  function attemptRevive(cp) {
    P = { x: cp, y: GY - CUBE / 2, vy: 0, g: 1, ground: true, rot: 0 };
    startPct = cp / level.len;
    runPickups = 0;
    trailPts = [];
    acc = 0;
    state = ST.RUN;
    A.musicStart(level.sector.bpm, level.sector.seed);
    GD.SDK.gameplayStart();
    hide('deathModal'); show('runHud');
  }

  $('cMenu').addEventListener('click', toMenu);
  $('cShare').addEventListener('click', () => shareText(
    `👑 just 100%'d ${level.sector.name} in ${fmtInt(attsOf(level.sector))} attempts — GLITCHDASH. beat that.`));
  $('cDouble').addEventListener('click', () => {
    GD.SDK.rewardedAd(() => {
      save.shards += runShards;
      $('cShards').textContent = '◆ +' + fmt(runShards * 2);
      runShards = 0;
      persist(); updateHUD(); A.cash();
    }, () => A.deny());
  });

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
    } else if (act === 'cube') {
      const c = DATA.cubes.find(x => x.id === id);
      if (save.cubes[id]) { save.cube = id; A.tap(); }
      else if (save.shards >= c.cost) {
        save.shards -= c.cost; save.cubes[id] = true; save.cube = id;
        A.cash();
        if (DATA.cubes.every(x => save.cubes[x.id])) feat('allskins');
      } else { A.deny(); return; }
      persist(); renderSkins(); updateHUD();
    } else if (act === 'trail') {
      const t = DATA.trails.find(x => x.id === id);
      if (save.trails[id]) { save.trail = id; A.tap(); }
      else if (save.shards >= t.cost) {
        save.shards -= t.cost; save.trails[id] = true; save.trail = id;
        A.cash();
      } else { A.deny(); return; }
      persist(); renderSkins(); updateHUD();
    }
  });

  $('btnSound').addEventListener('click', () => {
    save.sound = !save.sound;
    A.enabled = save.sound;
    persist();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    A.tap();
  });

  $('btnShare').addEventListener('click', () => {
    const sec = sectorById(save.sel);
    shareText(`💀 my best on ${sec.name} is ${bestOf(sec)}% after ${fmtInt(attsOf(sec))} attempts — GLITCHDASH. beat that.`);
  });
  async function shareText(text) {
    let url = location.href;
    const cg = await GD.SDK.invite({});
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'GlitchDash', text, url }); return; } } catch (e) {}
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      const el = $('shareToast');
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1600);
    } catch (e) {}
  }

  /* ================= BOOT + LOOP ================= */
  (async function boot() {
    GD.SDK.loadingStart();
    // init del SDK en paralelo: bloqueaba el arranque (attract congelado)
    const sdkReady = GD.SDK.init();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    level = generate(sectorById(save.sel));
    renderSheet(); updateHUD();
    requestAnimationFrame(loop);
    await sdkReady;
    GD.SDK.loadingStop();
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
