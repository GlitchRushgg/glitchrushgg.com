/* ============================================================
   GHOSTLAP — one-button neon drift, and your best run haunts
   the highway.

   Hold to steer right, release to steer left. The road is a
   seeded endless ribbon — the SAME road every run — so mastery
   is real: learn Deadman's Hairpin, then beat the translucent
   ghost of your own best run driving beside you (+40% payout).

   • 6 zones with their own neon palettes
   • 10 named corners at fixed distances (golden bonus coins)
   • 8 upgrade tracks, Garage of 10 unlockable cars
   • Ghost Fuel offline earnings, Golden Engine ad buff
   • Prestige: The Legend Run → Legend Stars + road rules

   Determinism law: physics is a fixed 1/120s step and nothing
   but recorded inputs steers a car, so the ghost replay is
   exact. Anything that moves the player (insurance, second
   wind) must be recorded as a snap event.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = GL.Audio;

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'ghostLap_v1';
  const save = {
    coins: 0, lifetime: 0, cycleLife: 0, stars: 0, prestiges: 0,
    runs: 0, best: 0, bestEver: 0, bestHaul: 0, bestDistPx: 0,
    up: {}, cars: { hatch: true }, car: 'hatch', rule: 'none',
    ghost: null, roadSeed: 0,
    ghostsBeaten: 0, cornersPassed: 0, cornersSeen: {},
    lastSeen: Date.now(), lastDay: '', sound: true,
  };
  DATA.upgrades.forEach(u => save.up[u.id] = 0);
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  DATA.upgrades.forEach(u => { if (!(u.id in save.up)) save.up[u.id] = 0; });
  if (!save.cars.hatch) save.cars.hatch = true;
  if (!save.roadSeed) save.roadSeed = 1 + ((Math.random() * 1e9) | 0);
  function persist() {
    save.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  A.enabled = save.sound;

  /* ================= CANVAS / LETTERBOX =================
     Logical space is 480×720; scaled + centered to any screen. */
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

  /* ================= SEEDED ROAD =================
     The centerline is sampled every STEP px into pts[]; it is
     generated lazily but append-only, so a given seed always
     produces the identical road (ghost replays depend on it). */
  const STEP = 6;
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let pts = [], coins = [], gen = null;
  function roadReset() {
    pts = []; coins = [];
    gen = {
      // two independent streams: geometry must stay identical no matter
      // how coin density changes, or ghost replays would desync
      rng: mulberry32(save.roadSeed),
      crng: mulberry32(save.roadSeed ^ 0x9e3779b9),
      x: 0, y: 0, h: -Math.PI / 2, d: 0,
      sinceCoin: 0, cluster: 0, corner: 0,
    };
    pts.push({ x: 0, y: 0, d: 0 });
  }
  function pushPt() {
    gen.x += Math.cos(gen.h) * STEP;
    gen.y += Math.sin(gen.h) * STEP;
    gen.d += STEP;
    pts.push({ x: gen.x, y: gen.y, d: gen.d });
    // named-corner golden coins at fixed distances
    if (gen.corner < DATA.corners.length && gen.d >= DATA.corners[gen.corner].dist * 10) {
      coins.push({ x: gen.x, y: gen.y, d: gen.d, idx: pts.length - 1, golden: true, taken: false });
      gen.corner++;
      gen.sinceCoin = 0;
      return;
    }
    // coin clusters along the centerline — dense early so even a 15m
    // first run pays for the first upgrade, settling to the real gap
    gen.sinceCoin += STEP;
    const gap = (140 + Math.min(200, gen.d * 0.04)) / DATA.density(save.up.lucky);
    if (gen.cluster > 0) {
      if (gen.sinceCoin >= 14) {
        gen.sinceCoin = 0; gen.cluster--;
        const lat = Math.sin(gen.d * 0.02) * DATA.ROAD_W * 0.3;
        coins.push({
          x: gen.x + Math.cos(gen.h + Math.PI / 2) * lat,
          y: gen.y + Math.sin(gen.h + Math.PI / 2) * lat,
          d: gen.d, idx: pts.length - 1, golden: false, taken: false,
        });
      }
    } else if (gen.sinceCoin >= gap && gen.crng() < 0.85) {
      gen.sinceCoin = 0; gen.cluster = 4 + ((gen.crng() * 3) | 0);
    }
  }
  function genSegment() {
    const rng = gen.rng;
    // straight, shrinking with distance
    let len = Math.max(60, 190 - gen.d * 0.003) + rng() * 90;
    for (let i = 0; i < len / STEP; i++) pushPt();
    // arc: radius keeps pace with speed so the road stays driveable
    const v = DATA.speed(gen.d);
    const radius = v * 0.42 + rng() * 70;
    const maxA = (85 + Math.min(65, gen.d * 0.002)) * Math.PI / 180;
    const ang = (40 * Math.PI / 180) + rng() * (maxA - 40 * Math.PI / 180);
    const sign = rng() < 0.5 ? 1 : -1;
    const steps = Math.ceil((ang * radius) / STEP);
    const dh = (ang / steps) * sign;
    for (let i = 0; i < steps; i++) { gen.h += dh; pushPt(); }
  }
  function ensureRoad(untilD) {
    while (gen.d < untilD) genSegment();
  }

  /* ================= EFFECTIVE STATS ================= */
  const car = () => DATA.cars.find(c => c.id === save.car) || DATA.cars[0];
  const perk = (stat) => { const p = car().perk; return p.stat === stat ? p.v : 0; };
  const rule = () => DATA.rules.find(r => r.id === save.rule) || DATA.rules[0];
  const effTurn    = () => DATA.turnRate(save.up.tires) * (1 + perk('grip'));
  const effForgive = () => DATA.forgive(save.up.stab) * (1 + perk('forgive'));
  const effMagnet  = () => DATA.magnetR(save.up.magnet) + perk('magnet');
  const effSpark   = () => DATA.sparkMult(save.up.spark) + perk('spark');
  const effCoin    = () => DATA.coinMult(save.up.value) * (1 + perk('coins'))
                           * (1 + save.stars * DATA.STAR_BONUS) * rule().value;
  const halfW      = () => (DATA.ROAD_W * rule().width) / 2;

  /* ================= STATE ================= */
  const ST = { SURFACE: 0, RUN: 1, CRASHED: 2, SW: 3, OVER: 4 };
  let state = ST.SURFACE;

  // Encuadre del attract: el coche parqueado vive en pts[2] pero la cámara
  // miraba a pts[30] → composición vacía (hallazgo de auditoría). La cámara
  // proyecta su objetivo a LH*0.55 y la sheet tapa el ~60% inferior, así que
  // subimos el objetivo para que coche + tramo con curva queden en la franja
  // visible superior.
  function attractCam() {
    camX = (pts[2].x + pts[10].x) / 2;
    camY = (pts[2].y + pts[10].y) / 2 + LH * 0.27;
  }
  let tt = 0, shake = 0;
  let held = false;

  const HSTEP = 1 / 120;
  let acc = 0;

  // player run state
  let P = null;             // {x,y,h,d,idx}
  let grace = 0, invuln = 0;
  let runHaul = 0, rushT = 0, rushGrace = 0, rushMult = 1;
  let insLeft = 0, swUsed = false, crashT = 0;
  let nextCorner = 0, curZone = 0, coinPtr = 0;
  let ghostBeaten = false, isDaily = false;
  let stepIdx = 0, recToggles = [], recSnaps = [], recHeld = false;
  let lastSparkSfx = 0;

  // ghost replay state
  let G = null;             // {x,y,h,d,idx,step,tPtr,sPtr,held,done,tr,sp,n,distPx}

  // buffs
  let goldenT = 0, goldenCd = 0;
  let runsSinceAd = 0, pendingSummary = null;

  // fx
  let particles = [], floats = [], trail = [];
  let bannerTxt = '', bannerT = 0;
  let camX = 0, camY = 0;

  const rand = (a, b) => a + Math.random() * (b - a);

  /* ================= RUN LIFECYCLE ================= */
  function tangent(i) {
    const a = pts[Math.max(0, i)], b = pts[Math.min(pts.length - 1, i + 1)];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  function startRun() {
    ensureRoad(3000);
    P = { x: pts[2].x, y: pts[2].y, h: tangent(2), d: pts[2].d, idx: 2 };
    grace = 1.0; invuln = 0;
    runHaul = 0; rushT = 0; rushGrace = 0; rushMult = 1;
    insLeft = DATA.insurance(save.up.ins); swUsed = false;
    nextCorner = 0; curZone = 0; coinPtr = 0;
    ghostBeaten = false;
    isDaily = save.lastDay !== new Date().toDateString();
    stepIdx = 0; recToggles = []; recSnaps = []; recHeld = false;
    acc = 0; lastSparkSfx = 0;   // every run starts on a clean step boundary
    for (const c of coins) c.taken = false;
    trail = [];
    // spin up the ghost of the best run
    G = null;
    if (save.ghost && save.ghost.n > 0) {
      G = { x: pts[2].x, y: pts[2].y, h: tangent(2), d: pts[2].d, idx: 2,
            step: 0, tPtr: 0, sPtr: 0, held: false, done: false,
            tr: save.ghost.tr, sp: save.ghost.sp, n: save.ghost.n, distPx: save.ghost.dist };
    }
    camX = P.x; camY = P.y;
    state = ST.RUN;
    A.resume(); A.start();
    GL.SDK.gameplayStart();
    hide('sheet'); show('runHud');
    $('ghostChip').classList.toggle('hidden', !G);
    $('sparkBadge').classList.add('hidden');
  }

  function snap(body, i, record) {
    i = Math.min(pts.length - 2, i);
    body.x = pts[i].x; body.y = pts[i].y;
    body.h = tangent(i); body.idx = i; body.d = pts[i].d;
    if (record) recSnaps.push({ s: stepIdx, i });
  }

  function crash() {
    if (insLeft > 0) {
      insLeft--;
      snap(P, P.idx + 8, true);
      invuln = 1.2;
      banner('INSURANCE! ' + insLeft + ' left');
      A.insurance();
      return;
    }
    state = ST.CRASHED;
    crashT = 0.7;
    shake = 0.35;
    A.crash();
    boomFx(P.x, P.y);
    GL.SDK.gameplayStop();
  }

  function resolveCrash() {
    if (!swUsed && P.d > 600) { state = ST.SW; show('swModal'); return; }
    endRun();
  }

  function secondWind() {
    swUsed = true;
    snap(P, P.idx + 10, true);
    invuln = 1.5;
    state = ST.RUN;
    hide('swModal');
    banner('SECOND WIND!');
    A.insurance();
    GL.SDK.gameplayStart();
  }

  function endRun() {
    state = ST.OVER;
    const m = Math.floor(P.d / 10);
    let final = runHaul;
    const rows = [['Coins on the road', runHaul]];
    if (ghostBeaten) { final *= 1 + DATA.GHOST_BONUS; rows.push(['Ghost beaten +40%', final - runHaul]); }
    if (isDaily) { rows.push(['First run of the day ×3', final * 2]); final *= 3; }
    final = Math.floor(final);
    pendingSummary = { final, m };
    $('sumHaul').textContent = fmt(final);
    $('sumDist').textContent = m + 'm' + (m > save.best ? ' — NEW BEST!' : '');
    $('sumHot').classList.toggle('hidden', !isDaily);
    $('sumGhost').classList.toggle('hidden', !ghostBeaten);
    $('sumList').innerHTML = rows.map(r =>
      `<div class="sum-row"><span>${r[0]}</span><b>+${fmt(Math.floor(r[1]))}</b></div>`).join('') ||
      '<div class="sum-row empty">The road gave nothing tonight.</div>';
    hide('runHud'); show('sumModal');
  }

  function bank(mult) {
    const s = pendingSummary; if (!s) return;
    pendingSummary = null;
    const gain = s.final * (mult || 1);
    save.coins += gain; save.lifetime += gain; save.cycleLife += gain;
    save.bestHaul = Math.max(save.bestHaul, gain);
    save.runs++;
    save.lastDay = new Date().toDateString();
    if (s.m > save.best) { save.best = s.m; A.best(); }
    if (s.m > save.bestEver) save.bestEver = s.m;
    // record the ghost if this run went furthest on this road
    if (P.d > (save.bestDistPx || 0)) {
      save.bestDistPx = P.d;
      save.ghost = { t: recToggles, s: recSnaps, n: stepIdx, dist: P.d,
                     tr: effTurn(), sp: rule().speed };
    }
    checkUnlocks();
    persist();
    A.cash();
    hide('sumModal'); show('sheet');
    state = ST.SURFACE;
    P = null; G = null; trail = [];
    attractCam();
    renderSheet(); updateHUD();
    runsSinceAd++;
    if (runsSinceAd >= 2 && save.runs > 3) { runsSinceAd = 0; GL.SDK.midgameAd(() => {}); }
  }

  /* ================= PHYSICS (fixed step, deterministic) ================= */
  function advanceIdx(body) {
    let i = body.idx;
    const d2 = (j) => {
      const p = pts[j], dx = p.x - body.x, dy = p.y - body.y;
      return dx * dx + dy * dy;
    };
    let best = d2(i);
    for (let k = 0; k < 8 && i + 1 < pts.length; k++) {
      const nd = d2(i + 1);
      if (nd <= best) { best = nd; i++; } else break;
    }
    if (i > 0 && d2(i - 1) < best) { best = d2(i - 1); i--; }
    body.idx = i;
    body.d = pts[i].d;
    return Math.sqrt(best);
  }

  function stepGhost() {
    if (!G || G.done) return;
    const gh = save.ghost;
    while (G.tPtr < gh.t.length && gh.t[G.tPtr] === G.step) { G.held = !G.held; G.tPtr++; }
    while (G.sPtr < (gh.s || []).length && gh.s[G.sPtr].s === G.step) {
      const i = Math.min(pts.length - 2, gh.s[G.sPtr].i);
      G.x = pts[i].x; G.y = pts[i].y; G.h = tangent(i); G.idx = i; G.d = pts[i].d;
      G.sPtr++;
    }
    G.h += (G.held ? 1 : -1) * G.tr * HSTEP;
    const v = DATA.speed(G.d) * G.sp;
    G.x += Math.cos(G.h) * v * HSTEP;
    G.y += Math.sin(G.h) * v * HSTEP;
    advanceIdx(G);
    G.step++;
    if (G.step >= G.n) G.done = true;
  }

  function stepPhysics() {
    ensureRoad(Math.max(P.d, G && !G.done ? G.d : 0) + 2600);

    // record player input as toggles (the ghost of the future)
    if (held !== recHeld) { recToggles.push(stepIdx); recHeld = held; }

    P.h += (held ? 1 : -1) * effTurn() * HSTEP;
    const v = DATA.speed(P.d) * rule().speed;
    P.x += Math.cos(P.h) * v * HSTEP;
    P.y += Math.sin(P.h) * v * HSTEP;
    const off = advanceIdx(P);

    if (grace > 0) grace -= HSTEP;
    if (invuln > 0) invuln -= HSTEP;

    // drift rush: ride the outer band to build the multiplier
    const hw = halfW();
    if (off > hw * 0.55 && off < hw + 20) {
      rushT += HSTEP; rushGrace = 0.8;
      if (tt - lastSparkSfx > 0.15) { lastSparkSfx = tt; A.spark(); }
      sparkFx();
    } else {
      rushGrace -= HSTEP;
      if (rushGrace <= 0) rushT = Math.max(0, rushT - HSTEP * 6);
    }
    rushMult = Math.min(5, 1 + Math.floor(rushT / 1.2));

    // off the edge?
    if (off > hw * effForgive() + 4 && grace <= 0 && invuln <= 0) { crash(); return; }

    collectCoins();
    checkMilestones();

    stepGhost();
    stepIdx++;
    if (stepIdx > 90000) { crash(); } // 12.5 min cap keeps ghosts storable
  }

  function collectCoins() {
    while (coinPtr < coins.length && coins[coinPtr].d < P.d - 400) coinPtr++;
    const baseR = effMagnet() + (goldenT > 0 ? 30 : 0);
    for (let i = coinPtr; i < coins.length; i++) {
      const c = coins[i];
      if (c.d > P.d + 300) break;
      if (c.taken) continue;
      const r = baseR + (c.golden ? 14 : 0);
      const dx = c.x - P.x, dy = c.y - P.y;
      if (dx * dx + dy * dy > r * r) continue;
      c.taken = true;
      const m = Math.max(1, c.d / 10);
      let val = DATA.coinValue(m) * (c.golden ? DATA.CORNER_MULT : 1) * effCoin();
      val *= 1 + (rushMult - 1) * effSpark() * 0.25;       // Drift Rush bonus
      if (goldenT > 0) val *= 2;                            // Golden Engine
      val = Math.max(1, Math.floor(val));
      runHaul += val;
      addFloat(c.x, c.y, '+' + fmt(val) + (rushMult > 1 ? ' ×' + rushMult : ''));
      if (c.golden) A.golden(); else A.coin(rushMult);
    }
  }

  function checkMilestones() {
    const m = P.d / 10;
    // named corners
    if (nextCorner < DATA.corners.length && m >= DATA.corners[nextCorner].dist) {
      const c = DATA.corners[nextCorner];
      banner(c.name.toUpperCase() + ' ✓');
      A.corner();
      save.cornersPassed++;
      if (!save.cornersSeen[c.id]) { save.cornersSeen[c.id] = 1; GL.SDK.happyTime(); }
      nextCorner++;
    }
    // zones
    const z = DATA.zoneAt(m);
    if (z !== curZone) { curZone = z; banner('— ' + DATA.zones[z].name.toUpperCase() + ' —'); A.zone(); }
    // ghost beaten
    if (G && G.done && !ghostBeaten && P.d > G.distPx) {
      ghostBeaten = true;
      save.ghostsBeaten++;
      banner('👻 GHOST BEATEN! +40%');
      A.ghostBeat();
      GL.SDK.happyTime();
    }
  }

  /* ================= FX ================= */
  function sparkFx() {
    if (Math.random() > 0.5) return;
    const back = P.h + Math.PI;
    particles.push({
      x: P.x + Math.cos(back) * 12, y: P.y + Math.sin(back) * 12,
      vx: Math.cos(back + rand(-0.6, 0.6)) * rand(40, 140),
      vy: Math.sin(back + rand(-0.6, 0.6)) * rand(40, 140),
      life: rand(0.2, 0.45), size: rand(1.5, 3), c: rushMult > 1 ? '#ff5db0' : '#ffd166',
    });
  }
  function boomFx(x, y) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(60, 300);
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                       life: rand(0.4, 0.9), size: rand(2, 5), c: i % 2 ? '#ff5c5c' : '#ffd166' });
    }
  }
  function addFloat(x, y, txt) { floats.push({ x, y, txt, t: 1 }); }
  function banner(txt) { bannerTxt = txt; bannerT = 2; }
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
    if (bannerT > 0) bannerT -= dt;
    if (goldenT > 0) goldenT -= dt;
    else if (goldenCd > 0) goldenCd -= dt;
    updateFx(dt);

    if (state === ST.RUN) {
      acc += Math.min(dt, 0.05);
      while (acc >= HSTEP && state === ST.RUN) { stepPhysics(); acc -= HSTEP; }
      trail.push({ x: P.x, y: P.y, t: 0.5 });
      if (trail.length > 30) trail.shift();
      updateRunHUD();
    } else if (state === ST.CRASHED) {
      crashT -= dt;
      if (crashT <= 0) resolveCrash();
    }
    for (const t of trail) t.t -= dt * 0.8;

    // camera chase (also drifts gently on the surface screen)
    // attract: encuadrar coche parqueado (pts[2]) + tramo con curva en la
    // franja visible SOBRE la sheet (la cámara proyecta su objetivo a LH*0.55
    // y la sheet tapa el ~60% inferior) — hallazgo de auditoría visual
    const tgt = state >= ST.RUN && P
      ? { x: P.x + Math.cos(P.h) * 70, y: P.y + Math.sin(P.h) * 70 }
      : { x: (pts[2].x + pts[10].x) / 2, y: (pts[2].y + pts[10].y) / 2 + LH * 0.27 };
    camX += (tgt.x - camX) * Math.min(1, dt * 5);
    camY += (tgt.y - camY) * Math.min(1, dt * 5);

    if (state === ST.SURFACE) updateGoldenBtn();
  }

  /* ================= RENDER ================= */
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const zone = DATA.zones[state >= ST.RUN && P ? DATA.zoneAt(P.d / 10) : 0];

    // background gradient + synthwave grid
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, zone.bg0); g.addColorStop(1, zone.bg1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offX + LW / 2 * scale, offY + LH * 0.55 * scale);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 18, rand(-1, 1) * shake * 18);
    ctx.translate(-camX, -camY);

    // grid floor
    ctx.strokeStyle = 'rgba(255,255,255,.045)';
    ctx.lineWidth = 1;
    const gs = 80;
    const x0 = Math.floor((camX - LW) / gs) * gs, x1 = camX + LW;
    const y0 = Math.floor((camY - LH) / gs) * gs, y1 = camY + LH;
    ctx.beginPath();
    for (let x = x0; x < x1; x += gs) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = y0; y < y1; y += gs) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.stroke();

    drawRoad(zone);

    // coins
    const fromI = P ? Math.max(0, coinPtr - 4) : 0;
    for (let i = fromI; i < coins.length; i++) {
      const c = coins[i];
      if (c.taken) continue;
      if (P && c.d > P.d + 1600) break;
      if (!P && c.d > 1400) break;
      const r = c.golden ? 9 : 5.5;
      const bob = Math.sin(tt * 4 + c.d) * 1.5;
      ctx.fillStyle = c.golden ? '#ffd166' : '#ffe9a8';
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = c.golden ? 18 : 7;
      ctx.beginPath(); ctx.arc(c.x, c.y + bob, r, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      if (c.golden) {
        ctx.fillStyle = 'rgba(58,40,0,.8)';
        ctx.font = '800 9px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', c.x, c.y + bob + 3);
      }
    }

    // trail
    if (trail.length > 1) {
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = Math.max(0, trail[i].t);
        if (a <= 0) continue;
        ctx.strokeStyle = rushMult > 1 ? `rgba(255,93,176,${a * 0.5})` : `rgba(77,224,255,${a * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
    }

    // ghost car
    if (G && !G.done && state >= ST.RUN) drawCar(G.x, G.y, G.h, '#cdb4f6', 0.38, true);

    // player car (parked on the surface screen)
    if (state >= ST.RUN && P) {
      if (!(state === ST.CRASHED || state === ST.OVER)) drawCar(P.x, P.y, P.h, car().c, 1, false);
    } else {
      drawCar(pts[2].x, pts[2].y + Math.sin(tt * 2) * 1.2, tangent(2), car().c, 1, false);
    }

    // particles (additive)
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
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 8;
      ctx.fillText(f.txt, f.x, f.y - (1 - f.t) * 40);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // banner (screen space)
    if (bannerT > 0) {
      const a = Math.min(1, bannerT, (2 - bannerT) * 3);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = '800 26px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 22;
      ctx.fillText(bannerTxt, offX + LW / 2 * scale, offY + 300 * scale);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  function drawRoad(zone) {
    const ci = P ? P.idx : 30;
    const from = Math.max(0, ci - 130), to = Math.min(pts.length - 1, ci + 260);
    if (to - from < 2) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(pts[from].x, pts[from].y);
      for (let i = from + 1; i <= to; i += 2) ctx.lineTo(pts[i].x, pts[i].y);
    };
    const wRoad = DATA.ROAD_W * rule().width;
    path(); ctx.strokeStyle = hexA(zone.glow, 0.16); ctx.lineWidth = wRoad + 20; ctx.stroke();
    path(); ctx.strokeStyle = zone.glow;             ctx.lineWidth = wRoad + 7;  ctx.stroke();
    path(); ctx.strokeStyle = zone.road;             ctx.lineWidth = wRoad;      ctx.stroke();
    path(); ctx.strokeStyle = hexA(zone.glow, 0.35); ctx.lineWidth = 2;
    ctx.setLineDash([12, 16]); ctx.stroke(); ctx.setLineDash([]);
  }

  function drawCar(x, y, h, color, alpha, isGhost) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(h);
    ctx.globalAlpha = alpha;
    if (isGhost) { ctx.shadowColor = '#cdb4f6'; ctx.shadowBlur = 14; }
    // body
    ctx.fillStyle = color;
    rr(-13, -8, 26, 16, 5); ctx.fill();
    // nose stripe
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    rr(6, -6, 5, 12, 2); ctx.fill();
    // cockpit
    ctx.fillStyle = 'rgba(8,10,20,.75)';
    rr(-4, -5, 9, 10, 3); ctx.fill();
    // tail lights
    ctx.shadowBlur = 0;
    ctx.fillStyle = isGhost ? 'rgba(205,180,246,.9)' : '#ff5c5c';
    ctx.fillRect(-14, -6, 2.5, 3.5);
    ctx.fillRect(-14, 2.5, 2.5, 3.5);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function rr(x, y, w, h2, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h2, r);
    ctx.arcTo(x + w, y + h2, x, y + h2, r);
    ctx.arcTo(x, y + h2, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16), g2 = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g2},${b},${a})`;
  }

  /* ================= HUD / SHEET ================= */
  function updateHUD() {
    $('coins').textContent = fmt(save.coins);
    $('starTag').textContent = save.stars > 0 ? ' ⭐' + save.stars : '';
    $('surfBest').textContent = save.best + 'm';
  }

  function updateRunHUD() {
    $('runDist').textContent = Math.floor(P.d / 10) + 'm';
    $('runCoins').textContent = '+' + fmt(Math.floor(runHaul));
    const sb = $('sparkBadge');
    if (rushMult > 1) {
      sb.classList.remove('hidden');
      sb.textContent = '×' + rushMult + ' DRIFT RUSH';
    } else sb.classList.add('hidden');
    const gc = $('ghostChip');
    if (G) {
      gc.classList.remove('hidden');
      const delta = Math.round(((G.done ? G.distPx : G.d) - P.d) / 10);
      if (ghostBeaten) { gc.classList.add('lead'); gc.innerHTML = '👻 <b>GHOST BEATEN</b>'; }
      else if (delta >= 0) { gc.classList.remove('lead'); gc.innerHTML = '👻 ghost <b>+' + delta + 'm</b>'; }
      else { gc.classList.add('lead'); gc.innerHTML = '👻 you lead <b>+' + (-delta) + 'm</b>'; }
    }
  }

  let goldenLbl = '';
  function updateGoldenBtn() {
    const b = $('btnGolden');
    let lbl;
    if (goldenT > 0) { lbl = '×2 ACTIVE · ' + Math.ceil(goldenT) + 's'; b.className = 'gold-btn on'; }
    else if (goldenCd > 0) { lbl = 'READY IN ' + fmtTime(goldenCd); b.className = 'gold-btn cooling'; }
    else { lbl = '▶ GOLDEN ENGINE'; b.className = 'gold-btn'; }
    if (lbl !== goldenLbl) {
      goldenLbl = lbl;
      b.innerHTML = lbl + '<small>watch ad · 60s ×2 + magnet</small>';
    }
  }

  /* ---------- sheet tabs ---------- */
  let tab = 'shop';
  function renderSheet() {
    if (tab === 'shop') renderShop();
    else if (tab === 'garage') renderGarage();
    else renderLegend();
  }

  function renderShop() {
    const body = $('sheetBody');
    body.innerHTML =
      `<div class="up-head">◉ <b>${fmt(save.coins)}</b>${save.rule !== 'none' ? ` · <span class="rule-tag">${rule().name}</span>` : ''}</div>` +
      DATA.upgrades.map(u => {
        const lvl = save.up[u.id];
        const maxed = lvl >= u.max;
        const cost = maxed ? 0 : DATA.upCost(u, lvl);
        const can = !maxed && save.coins >= cost;
        return `<div class="item ${can ? 'can' : ''}">
          <div class="uic uic-${u.ic}"></div>
          <div class="mid"><div class="nm">${u.name}<i>L${lvl}</i></div><div class="ds">${u.desc}</div></div>
          <button class="buy ${maxed ? 'maxed' : can ? '' : 'cant'}" data-action="buy:${u.id}">
            ${maxed ? 'MAX' : '◉ ' + fmt(cost)}<small>${maxed ? '' : 'LEVEL ' + (lvl + 1)}</small>
          </button>
        </div>`;
      }).join('');
  }

  function unlockText(u) {
    switch (u.stat) {
      case 'bestEver': return 'Reach ' + u.n + 'm';
      case 'lifetime': return fmt(u.n) + ' lifetime coins';
      case 'ghosts':   return 'Beat your ghost ' + u.n + '×';
      case 'corners':  return 'Pass ' + u.n + ' named corners';
      case 'runs':     return u.n + ' runs';
      case 'stars':    return u.n + ' Legend Star' + (u.n > 1 ? 's' : '');
    }
    return '';
  }

  function renderGarage() {
    const body = $('sheetBody');
    body.innerHTML = '<div class="up-head">THE GARAGE — <b>' +
      Object.keys(save.cars).length + '/' + DATA.cars.length + '</b> cars</div>' +
      '<div class="gar-grid">' + DATA.cars.map(c => {
        const owned = !!save.cars[c.id];
        const eq = save.car === c.id;
        return `<button class="gar-card ${owned ? '' : 'locked'} ${eq ? 'equip' : ''}" data-action="car:${c.id}">
          <canvas class="gar-canvas" data-car="${c.id}" width="144" height="88"></canvas>
          <div class="gar-name">${owned ? c.name : '???'}</div>
          <div class="gar-sub">${owned ? (eq ? 'DRIVING' : 'TAP TO DRIVE') : unlockText(c.unlock)}</div>
          <div class="gar-perk">${owned ? (c.perk.desc || '') : ''}</div>
        </button>`;
      }).join('') + '</div>';
    body.querySelectorAll('canvas[data-car]').forEach(el => {
      const c = DATA.cars.find(x => x.id === el.dataset.car);
      const g2 = el.getContext('2d');
      g2.clearRect(0, 0, 144, 88);
      g2.save();
      g2.translate(72, 44);
      g2.scale(2.4, 2.4);
      g2.rotate(-Math.PI / 2);
      const owned = !!save.cars[c.id];
      // mini car sprite
      g2.fillStyle = owned ? c.c : '#2a3350';
      g2.beginPath();
      g2.moveTo(-10, -7); g2.lineTo(10, -7);
      g2.quadraticCurveTo(14, 0, 10, 7);
      g2.lineTo(-10, 7);
      g2.quadraticCurveTo(-14, 0, -10, -7);
      g2.fill();
      g2.fillStyle = owned ? 'rgba(8,10,20,.75)' : 'rgba(8,10,20,.4)';
      g2.fillRect(-4, -4, 8, 8);
      g2.restore();
    });
  }

  function renderLegend() {
    const body = $('sheetBody');
    const gain = DATA.starsFor(save.cycleLife);
    const ready = gain >= 1;
    let html = `<div class="legend-page">
      <div class="legend-title">⭐ THE LEGEND RUN</div>
      <div class="legend-stats">
        <span>Stars <b>${save.stars}</b></span>
        <span>This road <b>${fmt(save.cycleLife)}</b></span>
        <span>Legend runs <b>${save.prestiges}</b></span>
      </div>
      <p class="legend-text">Retire the highway. Coins &amp; upgrades reset and a <b>brand-new road</b> is drawn — but every Legend Star pays <b>+3% income, forever</b>. Your Garage survives.</p>`;
    if (ready) {
      html += `<button class="release-btn ready" data-action="release">BECOME LEGEND<small>+${gain} ⭐ Legend Star${gain > 1 ? 's' : ''}</small></button>`;
    } else {
      html += `<div class="legend-locked">Earn <b>${fmt(DATA.PRESTIGE_LIFETIME)}</b> coins on this road to go legend.<br>Progress: <b>${Math.min(100, Math.floor(save.cycleLife / DATA.PRESTIGE_LIFETIME * 100))}%</b></div>`;
    }
    if (save.prestiges > 0) {
      html += `<div class="rules">` + DATA.rules.map(r =>
        `<button class="rule ${save.rule === r.id ? 'on' : ''}" data-action="rule:${r.id}">
          <div class="rule-mid"><div class="rule-nm">${r.name}</div><div class="rule-ds">${r.desc}</div></div>
          <div class="rule-pick">${save.rule === r.id ? '● ACTIVE' : 'PICK'}</div>
        </button>`).join('') + `</div>`;
    } else {
      html += `<div class="legend-text" style="margin-top:10px;">Legend Stars also unlock <b>Road Rules</b> — riskier highways that pay more.</div>`;
    }
    html += '</div>';
    body.innerHTML = html;
  }

  function checkUnlocks() {
    const stats = {
      bestEver: save.bestEver, lifetime: save.lifetime, ghosts: save.ghostsBeaten,
      corners: save.cornersPassed, runs: save.runs, stars: save.stars,
    };
    for (const c of DATA.cars) {
      if (save.cars[c.id]) continue;
      if (stats[c.unlock.stat] >= c.unlock.n) {
        save.cars[c.id] = true;
        banner('🔑 NEW CAR: ' + c.name.toUpperCase());
        A.ghostBeat();
      }
    }
  }

  /* ---------- prestige ---------- */
  function doPrestige() {
    const gain = DATA.starsFor(save.cycleLife);
    if (gain < 1) return;
    save.stars += gain;
    save.prestiges++;
    save.coins = 0; save.cycleLife = 0;
    DATA.upgrades.forEach(u => save.up[u.id] = 0);
    save.ghost = null; save.bestDistPx = 0; save.best = 0;
    save.roadSeed = 1 + ((Math.random() * 1e9) | 0);
    checkUnlocks();
    persist();
    roadReset(); ensureRoad(1600);
    attractCam();
    A.prestige();
    GL.SDK.happyTime();
    hide('relModal');
    renderSheet(); updateHUD();
    banner('⭐ A NEW ROAD IS DRAWN');
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= INPUT ================= */
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .sheet, .modal, .overlay')) return;
    A.resume();
    if (state === ST.SURFACE) { startRun(); held = true; return; }
    if (state === ST.RUN) held = true;
  });
  window.addEventListener('pointerup', () => { held = false; });
  window.addEventListener('pointercancel', () => { held = false; });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'ArrowRight') return;
    A.resume();
    if (state === ST.SURFACE) { startRun(); held = true; return; }
    if (state === ST.RUN) held = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowRight') held = false;
  });

  /* ================= BUTTONS ================= */
  $('btnDrive').addEventListener('click', () => { if (state === ST.SURFACE) { A.tap(); startRun(); } });

  $('btnGolden').addEventListener('click', () => {
    if (goldenT > 0 || goldenCd > 0) { A.deny(); return; }
    GL.SDK.rewardedAd(() => {
      goldenT = 60; goldenCd = 180;
      A.golden();
      banner('🔥 GOLDEN ENGINE — ×2 FOR 60s');
    }, () => A.deny());
  });

  $('btnDouble').addEventListener('click', () => {
    GL.SDK.rewardedAd(() => { A.golden(); bank(2); }, () => A.deny());
  });
  $('btnCollect').addEventListener('click', () => bank(1));

  $('swTake').addEventListener('click', () => {
    GL.SDK.rewardedAd(secondWind, () => { A.deny(); hide('swModal'); endRun(); });
  });
  $('swDecline').addEventListener('click', () => { hide('swModal'); endRun(); });

  $('relGo').addEventListener('click', doPrestige);
  $('relCancel').addEventListener('click', () => hide('relModal'));

  // sheet: tabs + delegated actions (buy / car / rule / release)
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
    if (act === 'buy') {
      const u = DATA.upgrades.find(x => x.id === id);
      const lvl = save.up[id];
      if (lvl >= u.max) { A.deny(); return; }
      const cost = DATA.upCost(u, lvl);
      if (save.coins < cost) { A.deny(); return; }
      save.coins -= cost; save.up[id]++;
      // denser coins mean regenerating the coin layer (geometry is
      // stream-isolated, so the road itself doesn't change)
      if (id === 'lucky') { roadReset(); ensureRoad(1600); attractCam(); }
      A.cash(); persist();
      renderShop(); updateHUD();
    } else if (act === 'car') {
      if (!save.cars[id]) { A.deny(); return; }
      save.car = id; A.tap(); persist(); renderGarage();
    } else if (act === 'rule') {
      save.rule = id; A.tap(); persist(); renderLegend();
    } else if (act === 'release') {
      $('relGain').textContent = '+' + DATA.starsFor(save.cycleLife) + ' ⭐';
      show('relModal');
    }
  });

  $('btnSound').addEventListener('click', () => {
    save.sound = !save.sound;
    A.enabled = save.sound;
    persist();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    A.tap();
  });

  $('btnShare').addEventListener('click', share);
  async function share() {
    const text = `I ran ${save.best}m in GHOSTLAP 👻🏁 — my ghost is on the road waiting for you.`;
    let url = location.href;
    const cg = await GL.SDK.invite({ best: save.best });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'GhostLap', text, url }); return; } } catch (e) {}
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      const el = $('shareToast');
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1600);
    } catch (e) {}
  }

  /* ================= GHOST FUEL (offline) ================= */
  let fuelPending = 0;
  function offlineCheck() {
    const lvl = save.up.fuel;
    const awaySec = (Date.now() - save.lastSeen) / 1000;
    if (lvl <= 0 || awaySec < 120 || save.bestHaul <= 0) return;
    const mins = Math.min(awaySec / 60, DATA.FUEL_CAP_H * 60);
    const amount = Math.floor(DATA.fuelRate(lvl, save.bestHaul) * mins * (1 + save.stars * DATA.STAR_BONUS));
    if (amount < 1) return;
    fuelPending = amount;
    $('fuelTime').textContent = fmtTime(awaySec);
    $('fuelAmount').textContent = fmt(amount);
    show('fuelModal');
  }
  function fuelCollect(mult) {
    save.coins += fuelPending * mult;
    save.lifetime += fuelPending * mult;
    save.cycleLife += fuelPending * mult;
    fuelPending = 0;
    persist();
    A.cash();
    hide('fuelModal');
    renderSheet(); updateHUD();
  }
  $('fuelCollect').addEventListener('click', () => fuelCollect(1));
  $('fuelDouble').addEventListener('click', () => {
    GL.SDK.rewardedAd(() => fuelCollect(2), () => A.deny());
  });

  /* ================= BOOT + LOOP ================= */
  (async function boot() {
    GL.SDK.loadingStart();
    // init del SDK en paralelo: bloqueaba el arranque y se comía los primeros
    // taps (el "click no arranca el run" de la auditoría)
    const sdkReady = GL.SDK.init();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    roadReset();
    ensureRoad(1600);
    attractCam();
    renderSheet(); updateHUD();
    offlineCheck();
    requestAnimationFrame(loop);
    await sdkReady;
    GL.SDK.loadingStop();
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
