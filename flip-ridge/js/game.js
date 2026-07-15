/* ============================================================
   FLIPRIDGE — procedural downhill BMX where the tricks pay.

   Hold to pedal (and to spin backward in the air); release to
   coast (and drift level). Every mountain is freshly generated
   and gets gnarlier with every meter: rollers, chutes, kickers,
   cliff drops. Flips banked on a clean landing are the economy;
   sketchy landings kill the streak; bad ones end the run.

   • 6 biomes + 10 named features at fixed distances
   • Trick Book: 12 feats with bronze/silver/gold frames (+2%)
   • 8 upgrade tracks, Second Wind, Action Cam ad buff
   • Sponsors offline earnings, first drop of the day ×3
   • Prestige: The Podium → Medals + Lines (Gnar/Moon/Rocket)

   Physics: two verlet wheels joined by a rigid rod. Drive is a
   tangential impulse on the grounded rear wheel; air spin is an
   opposed impulse pair around the center. The rider's head is a
   hard kill-point — keep it out of the mountain.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = FR.Audio;

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'flipRidge_v1';
  const save = {
    coins: 0, lifetime: 0, cycleLife: 0, medals: 0, prestiges: 0,
    runs: 0, best: 0, bestHaul: 0,
    up: {}, book: {}, line: 'none', featsSeen: {},
    lastSeen: Date.now(), lastDay: '', sound: true, music: true,
  };
  DATA.upgrades.forEach(u => save.up[u.id] = 0);
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  DATA.upgrades.forEach(u => { if (!(u.id in save.up)) save.up[u.id] = 0; });
  function persist() {
    save.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  A.enabled = save.sound;

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

  /* ================= EFFECTIVE STATS ================= */
  const line = () => DATA.lines.find(l => l.id === save.line) || DATA.lines[0];
  const frameBonus = () => {
    let b = 0;
    for (const t of DATA.tricks) b += DATA.frameOf(save.book[t.id] || 0) * DATA.FRAME_BONUS;
    return b;
  };
  const incomeMult = () =>
    DATA.coinMult(save.up.value) * (1 + save.medals * DATA.MEDAL_BONUS)
    * (1 + frameBonus()) * line().value * (goldenT > 0 ? 2 : 1);

  /* ================= TERRAIN =================
     Heightfield sampled every T px; segments of flow rollers,
     steep chutes, kicker lips and cliff drops, gnarlier with
     distance. Coins ride the terrain and arc over the kickers. */
  const T = 8;
  let pts = [], coins = [], gen = null;
  function terrainReset() {
    pts = []; coins = [];
    gen = { y: 0, d: 0, slope: 0.14, seg: null, left: 0, phase: Math.random() * 9,
            sinceCoin: 0, drop: 0, feature: 0 };
    pts.push(0);
  }
  function grade() { return (0.13 + Math.min(0.42, gen.d * 0.000016)) * line().gnar; }
  function pickSeg() {
    const d = gen.d, r = Math.random();
    const kickerW = 0.16 + Math.min(0.22, d * 0.00003);
    if (r < 0.42) return { t: 'flow', left: 420 + Math.random() * 380 };
    if (r < 0.42 + kickerW) return { t: 'kicker', left: 64 };
    if (r < 0.72 + kickerW * 0.5) return { t: 'chute', left: 200 + Math.random() * 220 };
    return { t: 'runout', left: 140 + Math.random() * 160 };
  }
  function pushPt() {
    if (!gen.seg || gen.left <= 0) {
      if (gen.seg && gen.seg.t === 'kicker') {
        // the lip ends in a cliff drop
        gen.drop = (60 + Math.random() * 110 + Math.min(130, gen.d * 0.003)) * line().gnar;
        coinArc();
      }
      gen.seg = pickSeg();
      gen.left = gen.seg.left;
    }
    const g = grade();
    const amp = (0.22 + Math.min(0.4, gen.d * 0.00002)) * line().gnar;
    if (gen.drop > 0) {                       // cliff face
      const fall = Math.min(gen.drop, 34);
      gen.y += fall; gen.drop -= fall;
    } else {
      // fairness law: slopes EASE toward their target (no cruel kinks),
      // and uphill grades are capped so the mountain is always rideable
      let tgt;
      if (gen.seg.t === 'flow')        tgt = g + Math.sin(gen.d * 0.008 + gen.phase) * amp;
      else if (gen.seg.t === 'chute')  tgt = g * 2.0;
      else if (gen.seg.t === 'runout') tgt = g * 0.35;
      else                             tgt = -0.48;            // kicker lip
      const rate = gen.seg.t === 'kicker' ? 0.12 : 0.045;
      gen.slope += Math.max(-rate, Math.min(rate, tgt - gen.slope));
      gen.slope = Math.max(gen.seg.t === 'kicker' ? -0.52 : -0.32, gen.slope);
    }
    if (gen.drop <= 0) gen.y += gen.slope * T;
    gen.d += T; gen.left -= T;
    pts.push(gen.y);
    // trail coins
    gen.sinceCoin += T;
    if (gen.sinceCoin > 460 / DATA.density(save.up.lucky) && gen.seg.t !== 'kicker' && Math.random() < 0.8) {
      gen.sinceCoin = 0;
      // ride-through height: the bike's center rolls ~10px above terrain
      for (let i = 0; i < 5; i++)
        coins.push({ x: gen.d + i * 26, yOff: -14 - Math.sin(i / 4 * Math.PI) * 10, taken: false });
    }
  }
  function coinArc() {                        // over the drop after a kicker lip
    for (let i = 0; i < 6; i++)
      coins.push({ x: gen.d + 40 + i * 34, yOff: -46 - Math.sin(i / 5 * Math.PI) * 55, taken: false });
  }
  function ensure(untilX) { while (gen.d < untilX) pushPt(); }
  function terrainY(x) {
    const i = Math.max(0, Math.min(pts.length - 2, (x / T) | 0));
    const f = Math.max(0, Math.min(1, (x - i * T) / T));
    return pts[i] + (pts[i + 1] - pts[i]) * f;
  }
  function slopeAt(x) {
    const i = Math.max(0, Math.min(pts.length - 2, (x / T) | 0));
    return (pts[i + 1] - pts[i]) / T;
  }

  /* ================= BIKE (two verlet wheels + rod) ================= */
  const WB = 44, WR = 9, HSTEP = 1 / 120;
  let wheels, grounded, airTime, rot, prevTh, takeoff;
  let acc = 0;

  function placeBike(x) {
    const y0 = terrainY(x), y1 = terrainY(x + WB);
    wheels = [
      { x, y: y0 - WR, px: x, py: y0 - WR },
      { x: x + WB, y: y1 - WR, px: x + WB, py: y1 - WR },
    ];
    grounded = [true, true];
    airTime = 0; rot = 0; prevTh = th();
    takeoff = null;
  }
  const th = () => Math.atan2(wheels[1].y - wheels[0].y, wheels[1].x - wheels[0].x);
  const cx = () => (wheels[0].x + wheels[1].x) / 2;
  const cy = () => (wheels[0].y + wheels[1].y) / 2;
  const speedX = () => ((wheels[0].x - wheels[0].px) + (wheels[1].x - wheels[1].px)) / 2 / HSTEP;

  /* ================= STATE ================= */
  const ST = { SURFACE: 0, RUN: 1, DYING: 2, SW: 3, OVER: 4 };
  let state = ST.SURFACE;
  let tt = 0, shake = 0, dieT = 0;
  let held = false;

  let runHaul = 0, trickCoins = 0, trailCoins = 0;
  let streak = 0, bestTrick = 0, flipsRun = 0;
  let helmetLeft = 0, swUsed = false, isDaily = false, invuln = 0;
  let nextFeature = 0, curZone = 0, coinPtr = 0, stallT = 0;
  let pendingSummary = null;

  let goldenT = 0, goldenCd = 0, runsSinceAd = 0;

  let particles = [], floats = [];
  let bannerTxt = '', bannerT = 0;
  let camX = 0, camY = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const norm = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  /* ================= RUN LIFECYCLE ================= */
  function startRun() {
    terrainReset();
    ensure(2400);
    placeBike(90);
    runHaul = 0; trickCoins = 0; trailCoins = 0;
    streak = 0; bestTrick = 0; flipsRun = 0;
    helmetLeft = DATA.helmets(save.up.helmet);
    swUsed = false; invuln = 1;
    nextFeature = 0; curZone = 0; coinPtr = 0; stallT = 0; runFar = false;
    isDaily = save.lastDay !== new Date().toDateString();
    acc = 0;
    camX = cx(); camY = cy();
    state = ST.RUN;
    A.resume(); A.start();
    A.musicPlay();                 // the descent has a soundtrack
    FR.SDK.gameplayStart();
    hide('sheet'); show('runHud');
  }

  function crash() {
    if (invuln > 0) return;
    if (helmetLeft > 0) {
      helmetLeft--;
      const x = cx();
      placeBike(x + 10);
      invuln = 1.2;
      banner('🪖 FULL-FACE SAVED YOU! ' + helmetLeft + ' left');
      A.helmet();
      return;
    }
    state = ST.DYING; dieT = 0.8;
    shake = 0.35;
    A.crash();
    boomFx(cx(), cy());
    FR.SDK.gameplayStop();
  }

  function resolveCrash() {
    const m = Math.floor(cx() / 10);
    if (!swUsed && m > 30) { state = ST.SW; show('swModal'); return; }
    endRun();
  }

  function secondWind() {
    swUsed = true;
    placeBike(cx() + 60);
    invuln = 1.5;
    state = ST.RUN;
    hide('swModal');
    banner('SECOND WIND!');
    A.revive();
    A.musicPlay();
    FR.SDK.gameplayStart();
  }

  function endRun() {
    state = ST.OVER;
    const m = Math.floor(cx() / 10);
    let final = runHaul;
    const rows = [];
    if (trickCoins > 0) rows.push(['Tricks (' + flipsRun + ' flips)', trickCoins]);
    if (trailCoins > 0) rows.push(['Coins on the line', trailCoins]);
    if (isDaily) { rows.push(['First drop of the day ×3', final * 2]); final *= 3; }
    final = Math.floor(final);
    pendingSummary = { final, m };
    $('sumHaul').textContent = fmt(final);
    $('sumDist').textContent = m + 'm' + (m > save.best ? ' — NEW BEST!' : '');
    $('sumHot').classList.toggle('hidden', !isDaily);
    $('sumList').innerHTML = rows.map(r =>
      `<div class="sum-row"><span>${r[0]}</span><b>+${fmt(Math.floor(r[1]))}</b></div>`).join('') ||
      '<div class="sum-row empty">The mountain keeps what it takes.</div>';
    hide('runHud'); show('sumModal');
    A.musicPause();
  }

  function bank(mult) {
    const s = pendingSummary; if (!s) return;
    pendingSummary = null;
    const gain = Math.floor(s.final * (mult || 1));
    save.coins += gain; save.lifetime += gain; save.cycleLife += gain;
    save.bestHaul = Math.max(save.bestHaul, gain);
    save.runs++;
    save.lastDay = new Date().toDateString();
    if (s.m > save.best) { save.best = s.m; A.best(); }
    persist();
    A.cash();
    hide('sumModal'); show('sheet');
    state = ST.SURFACE;
    renderSheet(); updateHUD();
    runsSinceAd++;
    if (runsSinceAd >= 2 && save.runs > 3) { runsSinceAd = 0; FR.SDK.midgameAd(() => {}); }
  }

  /* ================= TRICK BOOK ================= */
  function credit(id) {
    save.book[id] = (save.book[id] || 0) + 1;
    const t = DATA.tricks.find(x => x.id === id);
    if (save.book[id] === 1) {
      banner('📖 NEW TRICK: ' + t.name.toUpperCase());
      A.feat();
      FR.SDK.happyTime();
    }
  }

  /* ================= PHYSICS ================= */
  function stepPhysics() {
    const L = line();
    const grav = 1500 * L.grav * HSTEP * HSTEP;
    ensure(cx() + 1400);

    const axisX = Math.cos(th()), axisY = Math.sin(th());
    const inAir = !grounded[0] && !grounded[1];

    for (let i = 0; i < 2; i++) {
      const w = wheels[i];
      let vx = w.x - w.px, vy = w.y - w.py;
      let ax = 0, ay = grav;
      // drive: rear wheel, grounded, holding
      if (i === 0 && held && grounded[0]) {
        const s = slopeAt(w.x);
        const inv = 1 / Math.hypot(1, s);
        const p = 190 * DATA.power(save.up.pedal) * L.power * HSTEP * HSTEP;
        if (speedX() < 620) { ax += inv * p; ay += s * inv * p; }
      }
      // air spin: opposed impulse pair (hold = backflip, release = slow forward)
      if (inAir) {
        const spin = 420 * DATA.spin(save.up.tuck) * HSTEP * HSTEP * (held ? 1 : -0.5);
        const dirI = i === 0 ? 1 : -1;
        ax += -axisY * spin * dirI;
        ay += axisX * spin * dirI;
      }
      w.px = w.x; w.py = w.y;
      w.x += vx + ax; w.y += vy + ay;
    }

    // rod constraint
    for (let k = 0; k < 3; k++) {
      const dx = wheels[1].x - wheels[0].x, dy = wheels[1].y - wheels[0].y;
      const d = Math.hypot(dx, dy) || 1;
      const off = (d - WB) / d * 0.5;
      wheels[0].x += dx * off; wheels[0].y += dy * off;
      wheels[1].x -= dx * off; wheels[1].y -= dy * off;
    }

    // terrain collision
    for (let i = 0; i < 2; i++) {
      const w = wheels[i];
      const gy = terrainY(w.x);
      if (w.y > gy - WR) {
        const wasAir = !grounded[i];
        w.y = gy - WR;
        const vy = w.y - w.py;
        if (vy > 0) w.py = w.y + vy * 0.14;         // damp the bounce
        w.px = w.x - (w.x - w.px) * 0.995;           // rolling friction
        grounded[i] = true;
        if (wasAir && airTime > 0.3) landing();
      } else {
        grounded[i] = w.y > gy - WR - 2;
      }
    }

    // rotation bookkeeping
    const t2 = th();
    const dth = norm(t2 - prevTh);
    prevTh = t2;
    const airNow = !grounded[0] && !grounded[1];
    if (airNow) {
      if (airTime === 0) takeoff = { x: cx(), y: cy() };
      airTime += HSTEP;
      rot += dth;
    }

    // the head is a hard kill-point
    const hx = cx() + (-axisY) * -16, hy = cy() + (axisX) * -16 - 6;
    if (hy > terrainY(hx) && invuln <= 0) { crash(); return; }

    // stall rescue: nudge a stuck bike forward
    if (!airNow && Math.abs(speedX()) < 10 && state === ST.RUN) {
      stallT += HSTEP;
      if (stallT > 2) { placeBike(cx() + 14); stallT = 0; }
    } else stallT = 0;

    collectCoins();
    checkMilestones();
  }

  function landing() {
    airTime = Math.max(airTime, 0.01);
    const m = cx() / 10;
    const sl = Math.atan(slopeAt(cx()));
    const diff = Math.abs(norm(th() - sl));
    const tol = DATA.landTol(save.up.susp);
    const flips = Math.floor((Math.abs(rot) + 1.15) / (Math.PI * 2));
    const drop = takeoff ? cy() - takeoff.y : 0;
    const jump = takeoff ? cx() - takeoff.x : 0;

    if (diff > DATA.CRASH_TOL && invuln <= 0) { rot = 0; airTime = 0; crash(); return; }
    if (diff > tol) {
      streak = 0;
      addFloat(cx(), cy() - 30, 'SKETCHY!');
      A.sketchy();
    } else if (flips > 0 || airTime > 1.2) {
      streak = Math.min(9, streak + 1);
      let val = DATA.trickBase(m) * (flips > 0 ? DATA.flipMult(flips) : 0.5)
              + DATA.trickBase(m) * DATA.AIRTIME_BONUS * airTime;
      val = Math.floor(val * incomeMult() * streak);
      runHaul += val; trickCoins += val; flipsRun += flips;
      bestTrick = Math.max(bestTrick, val);
      const back = rot < 0;
      const label = flips === 0 ? 'BIG AIR'
        : (flips >= 3 ? 'TRIPLE ' : flips === 2 ? 'DOUBLE ' : '') + (back ? 'BACKFLIP' : 'FRONTFLIP');
      addFloat(cx(), cy() - 34, label + ' +' + fmt(val) + (streak > 1 ? ' ×' + streak : ''));
      A.trick(streak, flips >= 2);
      if (flips > 0) credit(back ? (flips >= 3 ? 'back3' : flips === 2 ? 'back2' : 'back1')
                                 : (flips >= 2 ? 'front2' : 'front1'));
      if (airTime >= 2.5) credit('superman');
      if (drop >= 140) credit('cliff');
      if (jump >= 600) credit('longair');
      if (streak === 5) credit('streak5');
      if (val >= 1000) credit('rich');
    } else {
      streak = Math.min(9, streak + 1);
      A.land(streak);
    }
    rot = 0; airTime = 0; takeoff = null;
  }

  function collectCoins() {
    const x = cx(), y = cy();
    while (coinPtr < coins.length && coins[coinPtr].x < x - 300) coinPtr++;
    const r = DATA.magnetR(save.up.magnet) + (goldenT > 0 ? 30 : 0);
    for (let i = coinPtr; i < coins.length; i++) {
      const c = coins[i];
      if (c.x > x + 300) break;
      if (c.taken) continue;
      const cyy = terrainY(c.x) + c.yOff;
      const dx = c.x - x, dy = cyy - y;
      if (dx * dx + dy * dy > r * r) continue;
      c.taken = true;
      const val = Math.max(1, Math.floor(DATA.coinValue(c.x / 10) * incomeMult()));
      runHaul += val; trailCoins += val;
      addFloat(c.x, cyy - 12, '+' + fmt(val));
      A.coin();
    }
  }

  function checkMilestones() {
    const m = cx() / 10;
    if (nextFeature < DATA.features.length && m >= DATA.features[nextFeature].dist) {
      const f = DATA.features[nextFeature];
      banner(f.name.toUpperCase() + ' ✓');
      A.zone();
      if (!save.featsSeen[f.id]) { save.featsSeen[f.id] = 1; FR.SDK.happyTime(); }
      nextFeature++;
    }
    const z = DATA.zoneAt(m);
    if (z !== curZone) {
      curZone = z;
      banner('— ' + DATA.zones[z].name.toUpperCase() + ' —');
      A.zone();
      if (z === DATA.zones.length - 1) credit('cornice');
    }
    if (m >= 1000 && !runFar) { runFar = true; credit('far'); }
  }
  let runFar = false;

  /* ================= FX ================= */
  function boomFx(x, y) {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(60, 280);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
                       life: rand(0.4, 0.9), size: rand(2, 5), c: i % 2 ? '#ff8a5c' : '#ffd166' });
    }
  }
  function dustFx() {
    if (Math.random() > 0.4) return;
    particles.push({ x: wheels[0].x - 6, y: wheels[0].y + WR - 2,
                     vx: -rand(20, 90), vy: -rand(8, 40),
                     life: rand(0.25, 0.5), size: rand(1.5, 3.5), c: 'rgba(200,220,230,.5)' });
  }
  function addFloat(x, y, txt) { floats.push({ x, y, txt, t: 1 }); }
  function banner(txt) { bannerTxt = txt; bannerT = 2.2; }
  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 300 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.t -= dt * 0.8;
      if (f.t <= 0) floats.splice(i, 1);
    }
  }

  /* ================= UPDATE ================= */
  let rawLast = performance.now();
  function update(dt) {
    tt += dt;
    if (shake > 0) shake -= dt;
    if (bannerT > 0) bannerT -= dt;
    if (invuln > 0) invuln -= dt;
    if (goldenT > 0) goldenT -= dt;
    else if (goldenCd > 0) goldenCd -= dt;
    updateFx(dt);

    if (state === ST.RUN) {
      acc += Math.min(dt, 0.05);
      while (acc >= HSTEP && state === ST.RUN) { stepPhysics(); acc -= HSTEP; }
      if ((grounded[0] || grounded[1]) && Math.abs(speedX()) > 140) dustFx();
      updateRunHUD();
    } else if (state === ST.DYING) {
      dieT -= dt;
      if (dieT <= 0) resolveCrash();
    }

    // camera
    if (state >= ST.RUN && wheels) {
      const tx = cx() + Math.max(-40, Math.min(140, speedX() * 0.28));
      const ty = cy();
      camX += (tx - camX) * Math.min(1, dt * 6);
      camY += (ty - camY) * Math.min(1, dt * 4);
    } else if (wheels) {
      camX = cx(); camY = cy();
    }

    if (state === ST.SURFACE) updateGoldenBtn();
  }

  /* ================= RENDER ================= */
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const zone = DATA.zones[state >= ST.RUN && wheels ? DATA.zoneAt(cx() / 10) : 0];

    // sky
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, zone.sky0); g.addColorStop(1, zone.sky1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // parallax ridgelines (screen space, offset by camera) — reforzadas
    // (el fondo se perdía: hallazgo de auditoría visual)
    for (let l = 0; l < 2; l++) {
      const par = l === 0 ? 0.15 : 0.32;
      const base = H * (0.42 + l * 0.13);
      ctx.fillStyle = l === 0 ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.14)';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 24) {
        const wx = (x + camX * par * scale);
        ctx.lineTo(x, base + Math.sin(wx * 0.006 + l * 5) * 42 + Math.sin(wx * 0.0017 + l) * 70);
      }
      ctx.lineTo(W, H);
      ctx.fill();
    }

    ctx.save();
    // encuadre subido ~40px: había mucho espacio muerto bajo el rider
    ctx.translate(offX + LW * 0.38 * scale, offY + LH * 0.52 * scale);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 16, rand(-1, 1) * shake * 16);
    ctx.translate(-camX, -camY);

    // terrain
    const from = Math.max(0, ((camX - LW * 0.6) / T) | 0);
    const to = Math.min(pts.length - 1, ((camX + LW) / T) | 0);
    if (to > from) {
      ctx.beginPath();
      ctx.moveTo(from * T, pts[from]);
      for (let i = from + 1; i <= to; i++) ctx.lineTo(i * T, pts[i]);
      ctx.lineTo(to * T, camY + LH);
      ctx.lineTo(from * T, camY + LH);
      ctx.closePath();
      ctx.fillStyle = zone.ground;
      ctx.fill();
      // detalle de la montaña: gradiente que oscurece hacia abajo + estratos
      // + motas (era una masa plana sin textura — hallazgo de auditoría)
      ctx.save();
      ctx.clip(); // la silueta del terreno sigue en el path actual
      const dg = ctx.createLinearGradient(0, camY - LH * 0.1, 0, camY + LH);
      dg.addColorStop(0, 'rgba(0,0,0,0)');
      dg.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.fillStyle = dg;
      ctx.fillRect(from * T, camY - LH, (to - from) * T, LH * 2.2);
      ctx.strokeStyle = 'rgba(0,0,0,.13)';
      ctx.lineWidth = 2;
      for (const depth of [26, 58, 96]) {
        ctx.beginPath();
        ctx.moveTo(from * T, pts[from] + depth);
        for (let i = from + 1; i <= to; i++) ctx.lineTo(i * T, pts[i] + depth + Math.sin(i * 1.7) * 4);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,.1)';
      for (let i = from; i <= to; i += 5) {
        const sy = pts[i] + 34 + ((i * 37) % 80);
        ctx.beginPath(); ctx.arc(i * T + (i % 3) * 7, sy, 2 + (i % 3), 0, 7); ctx.fill();
      }
      ctx.restore();

      // glowing edge
      ctx.beginPath();
      ctx.moveTo(from * T, pts[from]);
      for (let i = from + 1; i <= to; i++) ctx.lineTo(i * T, pts[i]);
      ctx.strokeStyle = zone.edge;
      ctx.lineWidth = 3;
      ctx.shadowColor = zone.edge; ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // coins
    for (let i = Math.max(0, coinPtr - 4); i < coins.length; i++) {
      const c = coins[i];
      if (c.x > camX + LW) break;
      if (c.taken || c.x < camX - LW * 0.6) continue;
      const cyy = terrainY(c.x) + c.yOff + Math.sin(tt * 4 + c.x) * 2;
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(c.x, cyy, 5.5, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // bike + rider
    if (wheels && !(state === ST.DYING || state === ST.OVER)) drawBike();

    // particles
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2.2);
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
      ctx.fillText(f.txt, f.x, f.y - (1 - f.t) * 44);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // banner
    if (bannerT > 0) {
      const a = Math.min(1, bannerT, (2.2 - bannerT) * 3);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = '800 24px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 20;
      ctx.fillText(bannerTxt, offX + LW / 2 * scale, offY + 300 * scale);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  function drawBike() {
    const a = th(), ca = Math.cos(a), sa = Math.sin(a);
    const mx = cx(), my = cy();
    const upx = sa, upy = -ca;                    // rider's up
    if (invuln > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(tt * 14);

    // wheels
    for (let i = 0; i < 2; i++) {
      const w = wheels[i];
      ctx.strokeStyle = '#dfe9ee';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(w.x, w.y, WR, 0, 7); ctx.stroke();
      const spin = w.x / WR;
      ctx.strokeStyle = 'rgba(223,233,238,.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w.x - Math.cos(spin) * WR, w.y - Math.sin(spin) * WR);
      ctx.lineTo(w.x + Math.cos(spin) * WR, w.y + Math.sin(spin) * WR);
      ctx.stroke();
    }
    // frame
    ctx.strokeStyle = '#5de08a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const seatX = mx - ca * 8 + upx * 10, seatY = my - sa * 8 + upy * 10;
    const barX = mx + ca * 14 + upx * 12, barY = my + sa * 14 + upy * 12;
    ctx.beginPath();
    ctx.moveTo(wheels[0].x, wheels[0].y); ctx.lineTo(seatX, seatY);
    ctx.lineTo(barX, barY); ctx.lineTo(wheels[1].x, wheels[1].y);
    ctx.moveTo(seatX, seatY); ctx.lineTo(mx + ca * 2, my + sa * 2);
    ctx.moveTo(barX, barY); ctx.lineTo(mx + ca * 10, my + sa * 10);
    ctx.stroke();
    // rider: legs → torso → arms → head
    const hipX = seatX + upx * 3, hipY = seatY + upy * 3;
    const headX = mx + upx * 24 + ca * 3, headY = my + upy * 24 + sa * 3;
    ctx.strokeStyle = '#eef6f4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx, my); ctx.lineTo(hipX, hipY);                      // leg
    ctx.moveTo(hipX, hipY); ctx.lineTo(headX - upx * 6, headY - upy * 6); // torso
    ctx.lineTo(barX, barY);                                          // arms
    ctx.stroke();
    // head (full-face helmet)
    ctx.fillStyle = '#4de0ff';
    ctx.beginPath(); ctx.arc(headX, headY, 6.5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(10,20,30,.8)';
    ctx.fillRect(headX + ca * 2 - 3, headY + sa * 2 - 2, 6, 3);
    ctx.globalAlpha = 1;
  }

  /* ================= HUD / SHEET ================= */
  function updateHUD() {
    $('coins').textContent = fmt(save.coins);
    $('medalTag').textContent = save.medals > 0 ? ' 🏅' + save.medals : '';
    $('surfBest').textContent = save.best + 'm';
  }

  function updateRunHUD() {
    $('runDist').textContent = Math.floor(cx() / 10) + 'm';
    $('runCoins').textContent = '+' + fmt(Math.floor(runHaul));
    const ab = $('airBadge');
    if (airTime > 0.25) {
      ab.classList.remove('hidden');
      const flips = Math.floor((Math.abs(rot) + 1.15) / (Math.PI * 2));
      ab.textContent = (flips > 0 ? flips + ' FLIP' + (flips > 1 ? 'S' : '') + ' · ' : 'AIR ') + airTime.toFixed(1) + 's';
    } else ab.classList.add('hidden');
    const sb = $('streakBadge');
    if (streak > 1) {
      sb.classList.remove('hidden');
      sb.textContent = '×' + streak + ' FLOW';
    } else sb.classList.add('hidden');
  }

  let goldenLbl = '';
  function updateGoldenBtn() {
    const b = $('btnGolden');
    let lbl;
    if (goldenT > 0) { lbl = '×2 ACTIVE · ' + Math.ceil(goldenT) + 's'; b.className = 'gold-btn on'; }
    else if (goldenCd > 0) { lbl = 'READY IN ' + fmtTime(goldenCd); b.className = 'gold-btn cooling'; }
    else { lbl = '▶ ACTION CAM'; b.className = 'gold-btn'; }
    if (lbl !== goldenLbl) {
      goldenLbl = lbl;
      b.innerHTML = lbl + '<small>watch ad · 60s ×2 + magnet</small>';
    }
  }

  /* ---------- sheet tabs ---------- */
  let tab = 'shop';
  function renderSheet() {
    if (tab === 'shop') renderShop();
    else if (tab === 'book') renderBook();
    else renderPodium();
  }

  function renderShop() {
    $('sheetBody').innerHTML =
      `<div class="up-head">◉ <b>${fmt(save.coins)}</b>${save.line !== 'none' ? ` · <span class="line-tag">${line().name}</span>` : ''}</div>` +
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

  function renderBook() {
    const done = DATA.tricks.filter(t => (save.book[t.id] || 0) > 0).length;
    $('sheetBody').innerHTML = '<div class="up-head">THE TRICK BOOK — <b>' + done + '/' +
      DATA.tricks.length + '</b> · frames pay <b>+2%</b> each</div>' +
      '<div class="book-grid">' + DATA.tricks.map(t => {
        const n = save.book[t.id] || 0;
        const f = DATA.frameOf(n);
        const cls = ['locked', 'bronze', 'silver', 'goldf'][f];
        return `<div class="book-card ${cls}">
          <div class="book-ico">${n ? t.ico : '❔'}</div>
          <div class="book-name">${n ? t.name : '???'}</div>
          <div class="book-sub">${n ? '×' + fmtInt(n) : ''}</div>
          <div class="book-hint">${t.hint}</div>
        </div>`;
      }).join('') + '</div>';
  }

  function renderPodium() {
    const gain = DATA.medalsFor(save.cycleLife);
    const ready = gain >= 1;
    let html = `<div class="podium-page">
      <div class="podium-title">🏅 THE PODIUM</div>
      <div class="podium-stats">
        <span>Medals <b>${save.medals}</b></span>
        <span>This career <b>${fmt(save.cycleLife)}</b></span>
        <span>Retirements <b>${save.prestiges}</b></span>
      </div>
      <p class="podium-text">Retire a legend. Coins &amp; upgrades reset — but every Medal pays <b>+3% income, forever</b>. Your Trick Book is yours for life.</p>`;
    if (ready) {
      html += `<button class="release-btn ready" data-action="release">TAKE THE PODIUM<small>+${gain} 🏅 Medal${gain > 1 ? 's' : ''}</small></button>`;
    } else {
      html += `<div class="podium-locked">Earn <b>${fmt(DATA.PRESTIGE_LIFETIME)}</b> coins this career to go pro.<br>Progress: <b>${Math.min(100, Math.floor(save.cycleLife / DATA.PRESTIGE_LIFETIME * 100))}%</b></div>`;
    }
    if (save.prestiges > 0) {
      html += `<div class="lines">` + DATA.lines.map(l =>
        `<button class="line ${save.line === l.id ? 'on' : ''}" data-action="line:${l.id}">
          <div class="line-mid"><div class="line-nm">${l.name}</div><div class="line-ds">${l.desc}</div></div>
          <div class="line-pick">${save.line === l.id ? '● ACTIVE' : 'PICK'}</div>
        </button>`).join('') + `</div>`;
    } else {
      html += `<div class="podium-text" style="margin-top:10px;">Medals also unlock <b>Lines</b> — crueler mountains that pay more.</div>`;
    }
    html += '</div>';
    $('sheetBody').innerHTML = html;
  }

  /* ---------- prestige ---------- */
  function doPrestige() {
    const gain = DATA.medalsFor(save.cycleLife);
    if (gain < 1) return;
    save.medals += gain;
    save.prestiges++;
    save.coins = 0; save.cycleLife = 0;
    DATA.upgrades.forEach(u => save.up[u.id] = 0);
    persist();
    A.prestige();
    FR.SDK.happyTime();
    hide('relModal');
    renderSheet(); updateHUD();
    banner('🏅 A LEGEND RETIRES. A ROOKIE DROPS IN.');
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= INPUT ================= */
  /* Hold = pedal / spin. A quick TAP (≤0.18s) on the ground = bunny hop —
     the way over rocks, kinks and anything the mountain puts in the way. */
  let pressAt = -1;
  function press() {
    A.resume();
    if (state === ST.SURFACE) { startRun(); held = true; pressAt = tt; return; }
    if (state === ST.RUN) { held = true; pressAt = tt; }
  }
  function lift() {
    if (held && state === ST.RUN && tt - pressAt < 0.18 &&
        wheels && (grounded[0] || grounded[1])) hop();
    held = false;
  }
  function hop() {
    for (const w of wheels) w.py += 310 * HSTEP;   // upward kick ≈ 310 px/s
    A.hop();
    for (let i = 0; i < 6; i++)
      particles.push({ x: cx() + rand(-10, 10), y: cy() + 8,
                       vx: rand(-40, 40), vy: rand(10, 60),
                       life: rand(0.2, 0.4), size: rand(1.5, 3), c: 'rgba(200,220,230,.6)' });
  }
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .sheet, .modal, .overlay')) return;
    press();
  });
  window.addEventListener('pointerup', lift);
  window.addEventListener('pointercancel', () => { held = false; });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
    if (e.repeat) return;
    press();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') lift();
  });

  /* ================= BUTTONS ================= */
  $('btnDrop').addEventListener('click', () => { if (state === ST.SURFACE) { A.tap(); startRun(); } });

  $('btnGolden').addEventListener('click', () => {
    if (goldenT > 0 || goldenCd > 0) { A.deny(); return; }
    FR.SDK.rewardedAd(() => {
      goldenT = 60; goldenCd = 180;
      A.golden();
      banner('📸 ACTION CAM — ×2 FOR 60s');
    }, () => A.deny());
  });

  $('btnDouble').addEventListener('click', () => {
    FR.SDK.rewardedAd(() => { A.golden(); bank(2); }, () => A.deny());
  });
  $('btnCollect').addEventListener('click', () => bank(1));

  $('swTake').addEventListener('click', () => {
    FR.SDK.rewardedAd(secondWind, () => { A.deny(); hide('swModal'); endRun(); });
  });
  $('swDecline').addEventListener('click', () => { hide('swModal'); endRun(); });

  $('relGo').addEventListener('click', doPrestige);
  $('relCancel').addEventListener('click', () => hide('relModal'));

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
      A.cash(); persist();
      renderShop(); updateHUD();
    } else if (act === 'line') {
      save.line = id; A.tap(); persist(); renderPodium();
    } else if (act === 'release') {
      $('relGain').textContent = '+' + DATA.medalsFor(save.cycleLife) + ' 🏅';
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

  $('btnMusic').addEventListener('click', () => {
    save.music = !save.music;
    A.musicOn = save.music;
    if (save.music && state === ST.RUN) A.musicPlay();
    persist();
    $('btnMusic').textContent = save.music ? '🎵' : '🚫';
    A.tap();
  });

  $('btnShare').addEventListener('click', share);
  async function share() {
    const text = `I rode ${save.best}m down the mountain in FLIPRIDGE 🏔️ — think you can out-flip me?`;
    let url = location.href;
    const cg = await FR.SDK.invite({ best: save.best });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'FlipRidge', text, url }); return; } } catch (e) {}
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      const el = $('shareToast');
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1600);
    } catch (e) {}
  }

  /* ================= SPONSORS (offline) ================= */
  let sponPending = 0;
  function offlineCheck() {
    const lvl = save.up.sponsor;
    const awaySec = (Date.now() - save.lastSeen) / 1000;
    if (lvl <= 0 || awaySec < 120 || save.bestHaul <= 0) return;
    const mins = Math.min(awaySec / 60, DATA.SPONSOR_CAP_H * 60);
    const amount = Math.floor(DATA.sponsorRate(lvl, save.bestHaul) * mins * (1 + save.medals * DATA.MEDAL_BONUS));
    if (amount < 1) return;
    sponPending = amount;
    $('sponTime').textContent = fmtTime(awaySec);
    $('sponAmount').textContent = fmt(amount);
    show('sponModal');
  }
  function sponCollect(mult) {
    save.coins += sponPending * mult;
    save.lifetime += sponPending * mult;
    save.cycleLife += sponPending * mult;
    sponPending = 0;
    persist();
    A.cash();
    hide('sponModal');
    renderSheet(); updateHUD();
  }
  $('sponCollect').addEventListener('click', () => sponCollect(1));
  $('sponDouble').addEventListener('click', () => {
    FR.SDK.rewardedAd(() => sponCollect(2), () => A.deny());
  });

  /* ================= BOOT + LOOP ================= */
  (async function boot() {
    FR.SDK.loadingStart();
    // init del SDK en paralelo: bloqueaba el arranque (attract congelado)
    const sdkReady = FR.SDK.init();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    A.musicOn = save.music;
    $('btnMusic').textContent = save.music ? '🎵' : '🚫';
    terrainReset();
    ensure(1200);
    placeBike(90);
    camX = cx(); camY = cy();
    renderSheet(); updateHUD();
    offlineCheck();
    requestAnimationFrame(loop);
    await sdkReady;
    FR.SDK.loadingStop();
  })();

  function loop(now) {
    const dt = Math.min((now - rawLast) / 1000, 0.05);
    rawLast = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { persist(); A.musicPause(); }
    else if (state === ST.RUN) A.musicPlay();
  });
})();
