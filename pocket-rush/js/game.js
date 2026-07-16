/* ============================================================
   POCKETRUSH — neon single-player pool arcade.

   Pull back from the cue ball and let fly. Sink neon balls into
   6 pockets; sink them fast and the RUSH combo climbs ×1→cap.
   Clear a rack for a bonus + refunded shots and drop into the
   next, deeper rack. Runs end when your break budget runs out.

   • One-pointer slingshot aim with a predictive guide
   • Combo "rush" multiplier + golden balls at fixed racks
   • 8 upgrade tracks · The Rack trick-shot collection · prestige
   • Rewarded "Double the Break", offline Hustle, Golden Cue

   Pure canvas + WebAudio. Custom top-down circle physics.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = PR.Audio;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'pocketRush_v1';
  const save = {
    coins: 0, lifetimeEarned: 0, rep: 0, prestiges: 0,
    up: {}, tricks: {}, rule: 'straight',
    bestRun: 0, maxRack: 0, sound: true, runs: 0,
    lastSeen: Date.now(), lastDay: '', goldenCd: 0,
  };
  DATA.upgrades.forEach(u => save.up[u.id] = 0);
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    Object.assign(save, raw);
    save.up = Object.assign({}, save.up); DATA.upgrades.forEach(u => { if (save.up[u.id] == null) save.up[u.id] = 0; });
    save.tricks = save.tricks || {};
  } catch (e) {}
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
  const toLogical = (cx, cy) => ({ x: (cx - offX) / scale, y: (cy - offY) / scale });

  /* ================= TABLE GEOMETRY ================= */
  const OX0 = 34, OY0 = 152, OX1 = 446, OY1 = 636;   // outer table box
  const RAIL = 27;
  const CL = OX0 + RAIL, CR = OX1 - RAIL;             // cushion lines (ball-center bounds)
  const CT = OY0 + RAIL, CB = OY1 - RAIL;
  const MIDY = (CT + CB) / 2;
  const R = 11.5;                                     // ball radius
  const POCKETS = [
    { x: CL, y: CT }, { x: CR, y: CT },
    { x: CL, y: CB }, { x: CR, y: CB },
    { x: CL, y: MIDY }, { x: CR, y: MIDY },
  ];
  const POCKET_VIS = 18, CAP = 14, MOUTH = 26;
  const BREAK = { x: 240, y: CB - 66 };
  const DECEL = 300, REST = 0.94, WALLREST = 0.9, STOP = 7;
  const MAG_ACC = 950;
  const BALL_COLORS = ['#ff5db0', '#5b9cf0', '#5de08a', '#b47aff', '#ff8a5b', '#3fe0d0', '#ff5b6e', '#8ef0d0'];

  /* ================= STATE ================= */
  const ST = { SURFACE: 0, PLAY: 1 };
  let state = ST.SURFACE, phase = 'aim';
  let tt = 0, shake = 0;
  let balls = [], particles = [], floats = [];
  const cue = { x: BREAK.x, y: BREAK.y, vx: 0, vy: 0, r: R, isCue: true, sunk: false, banked: false, color: '#eaf6f4' };

  // run vars
  let rack = 0, shots = 0, runShotsMax = 0, runCoins = 0;
  let comboN = 0, comboT = 0, shotTime = 0;
  let sinksThisShot = 0, coinsThisShot = 0, scratchInRack = 0;
  let usedSecondWind = false, cueScratched = false;
  let runStats = { pocketed: 0, bestCombo: 0, golden: 0, racks: 0 };
  let firstBreakDay = false, pendingDoubled = false, runsSinceMid = 0;

  // aim
  let aiming = false, aimPtr = { x: 0, y: 0 };

  // buffs / offline
  let goldenCueUntil = 0, pendingHustle = 0;
  let bannerTxt = '', bannerT = 0;

  /* ================= DERIVED MULTIPLIERS ================= */
  const lvl = (id) => save.up[id] || 0;
  const ruleObj = () => DATA.houseRules.find(r => r.id === save.rule) || DATA.houseRules[0];
  const goldenCueActive = () => Date.now() < goldenCueUntil;
  function framesBonus() {
    let f = 0; DATA.tricks.forEach(t => f += DATA.frameOf(save.tricks[t.id] || 0));
    return 1 + 0.02 * f;
  }
  function incomeMult() {
    return DATA.pocketMult(lvl('value')) * (1 + DATA.REP_BONUS * save.rep) *
           framesBonus() * (goldenCueActive() ? 2 : 1);
  }
  const effMagnetR = () => DATA.magnetR(lvl('magnet')) + (goldenCueActive() ? 42 : 0);

  /* ================= RACK SETUP ================= */
  function spawnRack() {
    balls = [];
    const count = DATA.RACK_BALLS(rack);
    const S = R * 2 + 1.6;
    const apex = { x: 240, y: 300 };
    let placed = 0, row = 0;
    while (placed < count) {
      const y = apex.y - row * S * 0.87;
      const n = row + 1;
      const x0 = 240 - (n - 1) * S / 2;
      for (let i = 0; i < n && placed < count; i++) {
        balls.push({
          x: x0 + i * S + rand(-0.5, 0.5), y: y + rand(-0.5, 0.5),
          vx: 0, vy: 0, r: R, sunk: false, banked: false, golden: false,
          color: BALL_COLORS[placed % BALL_COLORS.length],
        });
        placed++;
      }
      row++;
    }
    if ((rack + 1) % DATA.GOLDEN_EVERY === 0 && balls.length) {
      balls[(Math.random() * balls.length) | 0].golden = true;
    }
    respotCue();
  }
  function respotCue() {
    cue.x = BREAK.x; cue.y = BREAK.y; cue.vx = cue.vy = 0; cue.sunk = false;
  }

  /* ================= RUN LIFECYCLE ================= */
  function startRun() {
    state = ST.PLAY; phase = 'aim';
    rack = 0; runCoins = 0; comboN = 0; comboT = 0;
    usedSecondWind = false; scratchInRack = 0; pendingDoubled = false;
    runStats = { pocketed: 0, bestCombo: 0, golden: 0, racks: 0 };
    shots = Math.max(1, DATA.startShots(lvl('shots')) + ruleObj().shots);
    runShotsMax = shots;
    spawnRack();
    hide('sheet'); show('runHud');
    save.runs++; persist();
    PR.SDK.gameplayStart();
    A.resume();
    banner('BREAK!');
    updateHUD();
  }

  function shoot(dir, power) {
    cue.vx = dir.x * power; cue.vy = dir.y * power;
    phase = 'moving'; shots--; shotTime = 0;
    sinksThisShot = 0; coinsThisShot = 0; cueScratched = false;
    for (const b of balls) b.banked = false;
    cue.banked = false;
    A.strike(Math.min(1, power / DATA.maxPower(lvl('power'))));
    updateHUD();
  }

  function resolveShot() {
    phase = 'aim';
    if (sinksThisShot >= 3) unlockTrick('triple');
    else if (sinksThisShot >= 2) unlockTrick('double');
    if (coinsThisShot >= 1000) unlockTrick('jackpot');
    if (cueScratched) respotCue();

    if (balls.filter(b => !b.sunk).length === 0) { rackClear(); return; }
    if (shots <= 0) { endOrSecondWind(); }
  }

  function rackClear() {
    unlockTrick('clear');
    if (scratchInRack === 0) unlockTrick('nomiss');
    const bonus = Math.round(DATA.clearCoins(lvl('refund')) * (rack + 1) * incomeMult());
    runCoins += bonus; runStats.racks++;
    floatText(240, CT + 34, 'RACK CLEAR  +' + fmt(bonus), '#5de08a');
    shots += DATA.clearShots(lvl('refund'));
    A.clear(); shake = 0.14;
    rack++; scratchInRack = 0;
    runShotsMax = Math.max(runShotsMax, shots);
    save.maxRack = Math.max(save.maxRack, rack + 1);
    if (rack >= 9) unlockTrick('longrun');
    spawnRack();
    banner('RACK ' + (rack + 1));
    updateHUD();
  }

  function endOrSecondWind() {
    if (!usedSecondWind) { show('swModal'); }
    else endRun();
  }

  function endRun() {
    hide('swModal');
    PR.SDK.gameplayStop();
    const today = new Date().toDateString();
    firstBreakDay = save.lastDay !== today;
    $('sumHaul').textContent = fmt(runCoins);
    $('sumRack').textContent = 'rack ' + (rack + 1);
    $('sumHot').classList.toggle('hidden', !firstBreakDay);
    $('btnDouble').classList.toggle('hidden', runCoins <= 0);
    $('sumList').innerHTML =
      row('Racks cleared', runStats.racks) +
      row('Best combo', '×' + runStats.bestCombo) +
      row('Balls pocketed', runStats.pocketed) +
      (runStats.golden ? row('Golden balls', runStats.golden) : '');
    show('sumModal');
  }
  const row = (k, v) => `<div class="sum-row"><span>${k}</span><b>${v}</b></div>`;

  function collectRun() {
    let haul = runCoins;
    if (firstBreakDay) { haul *= 3; save.lastDay = new Date().toDateString(); }
    save.coins += haul; save.lifetimeEarned += haul;
    save.bestRun = Math.max(save.bestRun, haul);
    runCoins = 0; pendingDoubled = false;
    hide('sumModal');
    state = ST.SURFACE; phase = 'aim';
    respotCue(); spawnRack();
    show('sheet'); renderSheet(curTab);
    persist(); updateHUD();
    // midgame between runs — suppressed for the first 3 runs (protects conversion)
    if (save.runs > 3 && runsSinceMid >= 1) { runsSinceMid = 0; PR.SDK.midgameAd(() => {}); }
    else runsSinceMid++;
  }

  /* ================= SCORING / SINKS ================= */
  function sink(b) {
    b.sunk = true;
    fxBurst(b.x, b.y, b.golden ? '#f0c04d' : b.color, b.golden ? 22 : 12);
    if (b.isCue) {                       // scratch
      cueScratched = true; scratchInRack++;
      comboN = 0; comboT = 0;
      A.scratch(); shake = 0.16;
      floatText(b.x, b.y, 'SCRATCH', '#ff5b6e');
      updateHUD();
      return;
    }
    sinksThisShot++; runStats.pocketed++;
    comboN = comboT > 0 ? comboN + 1 : 1;
    comboT = DATA.comboWindow(lvl('window')) * (ruleObj().fastCombo ? 0.7 : 1);
    const cap = DATA.comboCap(lvl('window'));
    const mult = Math.min(comboN, cap);
    runStats.bestCombo = Math.max(runStats.bestCombo, mult);
    if (mult >= 3) unlockTrick('combo3');
    if (mult >= 5) unlockTrick('combo5');
    if (b.banked) unlockTrick('bank');

    let val = DATA.baseValue(rack) * incomeMult() * mult * ruleObj().value;
    if (b.golden) { val *= DATA.GOLDEN_MULT * ruleObj().golden; runStats.golden++; unlockTrick('golden'); A.golden(); PR.SDK.happyTime(); }
    if (ruleObj().trickBonus && b.banked) val *= ruleObj().trickBonus;
    val = Math.round(val);
    runCoins += val; coinsThisShot += val;
    A.pocket(mult);
    floatText(b.x, b.y - 6, '+' + fmt(val) + (mult > 1 ? ' ×' + mult : ''), b.golden ? '#f0c04d' : '#fff');
    unlockTrick('sink');
    updateHUD();
  }

  /* ================= PHYSICS ================= */
  const HSTEP = 1 / 120;
  let acc = 0;
  function step(h) {
    const active = [cue, ...balls].filter(b => !b.sunk);
    // integrate + friction
    for (const b of active) {
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 0) { const nf = Math.max(0, sp - DECEL * h); const k = nf / sp; b.vx *= k; b.vy *= k; }
      b.x += b.vx * h; b.y += b.vy * h;
    }
    // pocket magnet (object balls only)
    const mr = effMagnetR();
    if (mr > 0) {
      for (const b of balls) {
        if (b.sunk) continue;
        for (const p of POCKETS) {
          const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
          if (d < mr + CAP && d > 1) { const f = MAG_ACC * (1 - d / (mr + CAP)); b.vx += dx / d * f * h; b.vy += dy / d * f * h; }
        }
      }
    }
    // cushions
    for (const b of active) wallCollide(b);
    // pairs
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      for (let j = i + 1; j < active.length; j++) pairCollide(a, active[j]);
    }
    // pockets
    for (const b of active) {
      for (const p of POCKETS) {
        if (Math.hypot(b.x - p.x, b.y - p.y) < CAP) { sink(b); break; }
      }
    }
    // rest clamp
    for (const b of active) if (Math.hypot(b.vx, b.vy) < STOP) { b.vx = 0; b.vy = 0; }
  }

  function wallCollide(b) {
    if (b.x < CL) { if (!nearPocket(b.x, b.y)) { b.x = CL; if (b.vx < 0) { b.vx = -b.vx * WALLREST; railHit(b); } } }
    else if (b.x > CR) { if (!nearPocket(b.x, b.y)) { b.x = CR; if (b.vx > 0) { b.vx = -b.vx * WALLREST; railHit(b); } } }
    if (b.y < CT) { if (!nearPocket(b.x, b.y)) { b.y = CT; if (b.vy < 0) { b.vy = -b.vy * WALLREST; railHit(b); } } }
    else if (b.y > CB) { if (!nearPocket(b.x, b.y)) { b.y = CB; if (b.vy > 0) { b.vy = -b.vy * WALLREST; railHit(b); } } }
  }
  function railHit(b) { b.banked = true; if (Math.hypot(b.vx, b.vy) > 55) A.rail(); }
  function nearPocket(x, y) {
    for (const p of POCKETS) if (Math.hypot(x - p.x, y - p.y) < MOUTH) return true;
    return false;
  }
  function pairCollide(a, c) {
    const dx = c.x - a.x, dy = c.y - a.y, rs = a.r + c.r, d2 = dx * dx + dy * dy;
    if (d2 >= rs * rs || d2 === 0) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, overlap = rs - d;
    a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
    c.x += nx * overlap / 2; c.y += ny * overlap / 2;
    const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
    if (vn < 0) {
      const imp = -(1 + REST) * vn / 2;
      a.vx -= imp * nx; a.vy -= imp * ny;
      c.vx += imp * nx; c.vy += imp * ny;
      if (-vn > 45) A.click(comboN);
    }
  }
  function atRest() {
    if (Math.hypot(cue.vx, cue.vy) >= STOP) return false;
    for (const b of balls) if (!b.sunk && Math.hypot(b.vx, b.vy) >= STOP) return false;
    return true;
  }

  /* ================= AIM (slingshot) ================= */
  function canAim() { return state === ST.PLAY && phase === 'aim' && shots > 0; }
  function aimVector() {
    const dx = cue.x - aimPtr.x, dy = cue.y - aimPtr.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return null;
    const dir = { x: dx / dist, y: dy / dist };
    const power = Math.min(DATA.maxPower(lvl('power')), dist * 5.2);
    return { dir, power, dist };
  }
  function rayContact(ox, oy, dx, dy) {
    let best = Infinity, kind = null, at = null;
    // object balls
    for (const b of balls) {
      if (b.sunk) continue;
      const t = rayCircle(ox, oy, dx, dy, b.x, b.y, R * 2);
      if (t != null && t < best) { best = t; kind = 'ball'; }
    }
    // cushions: nearest positive crossing that stays on the table span
    const tryWall = (t, onSpan, k) => { if (t != null && t > 0 && t < best && onSpan(ox + dx * t, oy + dy * t)) { best = t; kind = k; } };
    if (dx < 0) tryWall((CL - ox) / dx, (x, y) => y > CT && y < CB, 'vx');
    if (dx > 0) tryWall((CR - ox) / dx, (x, y) => y > CT && y < CB, 'vx');
    if (dy < 0) tryWall((CT - oy) / dy, (x, y) => x > CL && x < CR, 'vy');
    if (dy > 0) tryWall((CB - oy) / dy, (x, y) => x > CL && x < CR, 'vy');
    if (best === Infinity) return null;
    at = { x: ox + dx * best, y: oy + dy * best };
    return { t: best, kind, at };
  }
  function rayCircle(ox, oy, dx, dy, cx, cy, rad) {
    const fx = ox - cx, fy = oy - cy;
    const bq = 2 * (fx * dx + fy * dy), cq = fx * fx + fy * fy - rad * rad;
    const disc = bq * bq - 4 * cq;
    if (disc < 0) return null;
    const t = (-bq - Math.sqrt(disc)) / 2;
    return t > 0 ? t : null;
  }

  /* ================= FX ================= */
  function fxBurst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, sp = rand(60, 240);
      particles.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: rand(0.3, 0.6), size: rand(2, 4), c: color });
    }
  }
  function floatText(x, y, txt, c) { floats.push({ x, y, txt, c: c || '#fff', t: 1 }); }
  function banner(txt) { bannerTxt = txt; bannerT = 1.6; }
  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.y -= 34 * dt; f.t -= dt * 0.85; if (f.t <= 0) floats.splice(i, 1);
    }
  }

  /* ================= UPDATE ================= */
  function update(dt) {
    tt += dt;
    if (shake > 0) shake -= dt;
    if (bannerT > 0) bannerT -= dt;
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) { comboN = 0; updateHUD(); } }
    updateFx(dt);

    if (state === ST.PLAY && phase === 'moving') {
      shotTime += dt;
      acc += Math.min(dt, 0.05);
      while (acc >= HSTEP) { step(HSTEP); acc -= HSTEP; }
      balls = balls.filter(b => !b.sunk);
      if (shotTime > 14) { cue.vx = cue.vy = 0; for (const b of balls) { b.vx = b.vy = 0; } }
      if (atRest()) resolveShot();
    }
  }

  /* ================= RENDER ================= */
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // backdrop
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#08130f'); g.addColorStop(1, '#040a08');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offX, offY); ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);

    drawTable();
    // attract: la sheet tapa el rack real (ápex y=300) — en el menú mostramos
    // un rack decorativo en la franja visible sobre la sheet (auditoría)
    if (state === ST.SURFACE) {
      const S2 = R * 2 + 1.6;
      let k = 0;
      for (let row = 0; row < 3; row++) {
        const n = row + 1, ry = 233 - row * S2 * 0.87, x0 = 240 - (n - 1) * S2 / 2;
        for (let i = 0; i < n; i++, k++) {
          drawBall({ x: x0 + i * S2, y: ry, r: R, color: BALL_COLORS[k % BALL_COLORS.length] });
        }
      }
      drawBall({ x: 150, y: 224, r: R, isCue: true, color: '#eaf6f4' });
    }
    for (const b of balls) drawBall(b);
    if (!cue.sunk) drawBall(cue);
    if (aiming && canAim()) drawAim();

    // particles (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2.4);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // floats
    ctx.textAlign = 'center'; ctx.font = '800 18px "Rajdhani","Segoe UI", sans-serif';
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, f.t * 1.6);
      ctx.fillStyle = f.c; ctx.shadowColor = f.c; ctx.shadowBlur = 10;
      ctx.fillText(f.txt, f.x, f.y); ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    if (bannerT > 0) {
      const a = Math.min(1, bannerT, (1.6 - bannerT) * 4);
      ctx.globalAlpha = a; ctx.font = '800 34px "Rajdhani","Segoe UI", sans-serif';
      ctx.fillStyle = '#3fe0d0'; ctx.shadowColor = '#3fe0d0'; ctx.shadowBlur = 22;
      ctx.fillText(bannerTxt, 240, 130); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function roundRect(x0, y0, x1, y1, r) {
    ctx.beginPath();
    ctx.moveTo(x0 + r, y0);
    ctx.arcTo(x1, y0, x1, y1, r); ctx.arcTo(x1, y1, x0, y1, r);
    ctx.arcTo(x0, y1, x0, y0, r); ctx.arcTo(x0, y0, x1, y0, r);
    ctx.closePath();
  }
  function drawTable() {
    // wooden rail frame — con glow (la mesa era casi invisible: auditoría)
    roundRect(OX0, OY0, OX1, OY1, 26);
    ctx.fillStyle = '#1d332c'; ctx.fill();
    ctx.shadowColor = '#3fe0d0'; ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(63,224,208,.6)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.shadowBlur = 0;
    // felt — verde profundo VISIBLE (antes negro sobre negro)
    roundRect(CL - 12, CT - 12, CR + 12, CB + 12, 14);
    const fg = ctx.createLinearGradient(0, CT, 0, CB);
    fg.addColorStop(0, '#17614e'); fg.addColorStop(0.5, '#124f40'); fg.addColorStop(1, '#0e4234');
    ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = 'rgba(63,224,208,.3)'; ctx.lineWidth = 1.5; ctx.stroke();

    // head string + break spot
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(CL, BREAK.y - 12); ctx.lineTo(CR, BREAK.y - 12); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath(); ctx.arc(240, 300, 2.5, 0, 7); ctx.fill();

    // pockets
    for (const p of POCKETS) {
      ctx.fillStyle = '#02120e';
      ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_VIS, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(63,224,208,.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_VIS, 0, 7); ctx.stroke();
    }
  }

  function drawBall(b) {
    ctx.save(); ctx.translate(b.x, b.y);
    if (b.golden) { ctx.shadowColor = '#f0c04d'; ctx.shadowBlur = 18; }
    else if (b.isCue) { ctx.shadowColor = '#3fe0d0'; ctx.shadowBlur = 10; }
    const base = b.golden ? '#f0c04d' : b.color;
    const gr = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, b.r * 0.1, 0, 0, b.r);
    gr.addColorStop(0, lighten(base, 0.5)); gr.addColorStop(0.7, base); gr.addColorStop(1, darken(base, 0.35));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    if (b.isCue) { ctx.strokeStyle = 'rgba(63,224,208,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, b.r - 1, 0, 7); ctx.stroke(); }
    if (b.golden) {
      ctx.strokeStyle = `rgba(255,240,180,${0.5 + 0.4 * Math.sin(tt * 6)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, b.r + 2.5, 0, 7); ctx.stroke();
    }
    // specular
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.ellipse(-b.r * 0.32, -b.r * 0.4, b.r * 0.22, b.r * 0.13, -0.6, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawAim() {
    const av = aimVector();
    if (!av || av.dist < 10) return;
    const maxLen = Math.min(DATA.aimLen(lvl('aim')), av.power * 0.55 + 40);
    const hit = rayContact(cue.x, cue.y, av.dir.x, av.dir.y);
    let end = { x: cue.x + av.dir.x * maxLen, y: cue.y + av.dir.y * maxLen };
    let stopped = false;
    if (hit && hit.t < maxLen) { end = hit.at; stopped = true; }
    // power tint
    const pw = av.power / DATA.maxPower(lvl('power'));
    ctx.strokeStyle = `rgba(63,224,208,${0.35 + 0.5 * pw})`;
    ctx.lineWidth = 2; ctx.setLineDash([7, 7]);
    ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    ctx.setLineDash([]);
    // ghost / bank
    if (stopped) {
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(end.x, end.y, R, 0, 7); ctx.stroke();
      if (DATA.aimReflect(lvl('aim')) && hit.kind !== 'ball') {
        const rdx = hit.kind === 'vx' ? -av.dir.x : av.dir.x;
        const rdy = hit.kind === 'vy' ? -av.dir.y : av.dir.y;
        ctx.strokeStyle = 'rgba(63,224,208,.35)'; ctx.setLineDash([5, 8]);
        ctx.beginPath(); ctx.moveTo(end.x, end.y); ctx.lineTo(end.x + rdx * 55, end.y + rdy * 55); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // pull indicator behind the cue
    ctx.strokeStyle = `rgba(255,93,176,${0.4 + 0.4 * pw})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(cue.x - av.dir.x * 14 * pw * 2, cue.y - av.dir.y * 14 * pw * 2); ctx.stroke();
  }

  /* ---------- color utils ---------- */
  function hexRGB(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function lighten(h, f) { const [r, g, b] = hexRGB(h); return `rgb(${r + (255 - r) * f | 0},${g + (255 - g) * f | 0},${b + (255 - b) * f | 0})`; }
  function darken(h, f) { const [r, g, b] = hexRGB(h); return `rgb(${r * (1 - f) | 0},${g * (1 - f) | 0},${b * (1 - f) | 0})`; }

  /* ================= HUD ================= */
  function updateHUD() {
    const shown = save.coins + (state === ST.PLAY || runCoins > 0 ? runCoins : 0);
    $('coins').textContent = fmt(shown);
    $('repTag').textContent = save.rep > 0 ? ' ⭐' + save.rep : '';
    $('surfBest').textContent = fmt(save.bestRun);
    $('rackNum').textContent = rack + 1;
    // shot pips
    const pipN = Math.min(runShotsMax, 12);
    let html = '';
    for (let i = 0; i < pipN; i++) html += `<span class="pip ${i < shots ? 'live' : 'spent'}"></span>`;
    if (shots > 12) html += `<span class="pip live"></span>`;
    $('shotPips').innerHTML = html;
    // combo
    const cb = $('comboBadge');
    if (comboN > 1 && comboT > 0) { cb.classList.remove('hidden'); cb.textContent = '×' + Math.min(comboN, DATA.comboCap(lvl('window'))) + ' RUSH'; }
    else cb.classList.add('hidden');
    // golden cue button
    updateGoldenBtn();
  }
  function updateGoldenBtn() {
    const b = $('btnGolden');
    const now = Date.now();
    if (goldenCueActive()) { b.classList.add('on'); b.classList.remove('cooling'); b.innerHTML = '✦ GOLDEN CUE ON<small>' + Math.ceil((goldenCueUntil - now) / 1000) + 's · ×2 + magnet</small>'; }
    else if (now < save.goldenCd) { b.classList.add('cooling'); b.classList.remove('on'); b.innerHTML = '▶ GOLDEN CUE<small>ready in ' + Math.ceil((save.goldenCd - now) / 1000) + 's</small>'; }
    else { b.classList.remove('on', 'cooling'); b.innerHTML = '▶ GOLDEN CUE<small>watch ad · 60s ×2 + magnet</small>'; }
  }

  /* ================= SURFACE SHEET ================= */
  let curTab = 'shop';
  function renderSheet(tab) {
    curTab = tab;
    document.querySelectorAll('.stab').forEach(s => s.classList.toggle('active', s.dataset.tab === tab));
    const body = $('sheetBody');
    if (tab === 'shop') body.innerHTML = shopHTML();
    else if (tab === 'rack') body.innerHTML = rackHTML();
    else body.innerHTML = houseHTML();
    wireSheet(tab);
  }
  function shopHTML() {
    let h = `<div class="up-head">◉ <b>${fmt(save.coins)}</b> coins · income ×${(incomeMult()).toFixed(2)}</div>`;
    for (const u of DATA.upgrades) {
      const l = lvl(u.id), maxed = l >= u.max, cost = DATA.upCost(u, l), can = save.coins >= cost;
      h += `<div class="item ${!maxed && can ? 'can' : ''}">
        <div class="uic uic-${u.ic}"></div>
        <div class="mid"><div class="nm">${u.name} <i>L${l}</i></div><div class="ds">${u.desc}</div></div>
        ${maxed ? `<button class="buy maxed" disabled>MAX</button>`
                : `<button class="buy ${can ? '' : 'cant'}" data-buy="${u.id}">◉ ${fmt(cost)}<small>UPGRADE</small></button>`}
      </div>`;
    }
    return h;
  }
  function rackHTML() {
    const done = DATA.tricks.filter(t => (save.tricks[t.id] || 0) > 0).length;
    let h = `<div class="up-head">TRICK SHOTS <b>${done}/${DATA.tricks.length}</b> · frame bonus +${((framesBonus() - 1) * 100).toFixed(0)}%</div><div class="trick-grid">`;
    const ICON = { sink: '🎱', double: '✌️', triple: '🔥', bank: '↩️', combo3: '⚡', combo5: '💥', clear: '🧹', golden: '🟡', nomiss: '❄️', longrun: '🏃', jackpot: '💰', prestige: '⭐' };
    for (const t of DATA.tricks) {
      const c = save.tricks[t.id] || 0, fr = DATA.frameOf(c);
      const cls = c === 0 ? 'locked' : ['', 'bronze', 'silver', 'gold'][fr];
      h += `<div class="trick-card ${cls}">
        <div class="trick-ico">${c ? ICON[t.id] : '🔒'}</div>
        <div class="trick-name">${c ? t.name : '???'}</div>
        <div class="trick-sub">${c ? '×' + c : ''}</div>
        <div class="trick-hint">${t.hint}</div>
      </div>`;
    }
    return h + '</div>';
  }
  function houseHTML() {
    const canPrestige = save.lifetimeEarned >= DATA.PRESTIGE_LIFETIME;
    const gain = DATA.repFor(save.lifetimeEarned) - save.rep;
    let h = `<div class="house-page">
      <div class="house-title">RUN THE TABLE</div>
      <div class="house-stats"><span>Reputation <b>⭐${save.rep}</b></span><span>Income <b>+${(save.rep * DATA.REP_BONUS * 100).toFixed(0)}%</b></span><span>Prestiges <b>${save.prestiges}</b></span></div>`;
    if (canPrestige && gain > 0) {
      h += `<div class="house-text">Rack up and start fresh for <b>+${gain} ⭐</b> Reputation — <b>+${(gain * DATA.REP_BONUS * 100).toFixed(0)}%</b> income, forever. Your Rack collection stays.</div>
        <button class="release-btn ready" data-prestige>⭐ RUN THE TABLE<small>+${gain} Reputation</small></button>`;
    } else {
      const need = DATA.PRESTIGE_LIFETIME;
      h += `<div class="house-locked">Bank <b>${fmt(need)}</b> lifetime coins to run the table.<br>So far: <b>${fmt(save.lifetimeEarned)}</b></div>`;
    }
    // house rules (unlocked after first prestige)
    if (save.prestiges > 0) {
      h += `<div class="rules">`;
      for (const r of DATA.houseRules) {
        const on = save.rule === r.id;
        h += `<div class="rule ${on ? 'on' : ''}" data-rule="${r.id}">
          <div class="rule-mid"><div class="rule-nm">${r.name}</div><div class="rule-ds">${r.desc}</div></div>
          <div class="rule-pick">${on ? 'PLAYING' : 'PICK'}</div>
        </div>`;
      }
      h += `</div>`;
    }
    return h + '</div>';
  }
  function wireSheet(tab) {
    if (tab === 'shop') {
      $('sheetBody').querySelectorAll('[data-buy]').forEach(el =>
        el.addEventListener('click', () => buyUpgrade(el.dataset.buy)));
    } else if (tab === 'house') {
      const pb = $('sheetBody').querySelector('[data-prestige]');
      if (pb) pb.addEventListener('click', () => show('relModal'));
      $('sheetBody').querySelectorAll('[data-rule]').forEach(el =>
        el.addEventListener('click', () => { save.rule = el.dataset.rule; A.tap(); persist(); renderSheet('house'); }));
    }
  }
  function buyUpgrade(id) {
    const u = DATA.upgrades.find(x => x.id === id), l = lvl(id);
    if (l >= u.max) return;
    const cost = DATA.upCost(u, l);
    if (save.coins < cost) { A.deny(); return; }
    save.coins -= cost; save.up[id] = l + 1;
    A.tap(); persist(); renderSheet('shop'); updateHUD();
  }

  /* ================= TRICK UNLOCKS ================= */
  function unlockTrick(id) {
    const had = (save.tricks[id] || 0) > 0;
    save.tricks[id] = (save.tricks[id] || 0) + 1;
    if (!had) {
      const t = DATA.tricks.find(x => x.id === id);
      if (t) { banner('TRICK: ' + t.name); A.golden(); }
    }
  }

  /* ================= INPUT ================= */
  function overUI(e) { return e.target.closest('button, .sheet, .overlay, #topHud'); }
  window.addEventListener('pointerdown', (e) => {
    if (overUI(e)) return;
    A.resume();
    if (!canAim()) return;
    aiming = true; aimPtr = toLogical(e.clientX, e.clientY);
  });
  window.addEventListener('pointermove', (e) => { if (aiming) aimPtr = toLogical(e.clientX, e.clientY); });
  window.addEventListener('pointerup', (e) => {
    if (!aiming) return;
    aiming = false;
    if (!canAim()) return;
    aimPtr = toLogical(e.clientX, e.clientY);
    const av = aimVector();
    if (av && av.dist > 10) shoot(av.dir, av.power);
  });

  /* ================= BUTTONS ================= */
  $('btnBreak').addEventListener('click', () => { A.tap(); startRun(); });
  document.querySelectorAll('.stab').forEach(s => s.addEventListener('click', () => { A.tap(); renderSheet(s.dataset.tab); }));

  $('btnGolden').addEventListener('click', () => {
    if (goldenCueActive() || Date.now() < save.goldenCd) return;
    PR.SDK.rewardedAd(() => {
      goldenCueUntil = Date.now() + 60000;
      save.goldenCd = Date.now() + 180000;
      A.golden(); persist(); updateHUD();
    }, () => A.deny());
  });

  $('btnDouble').addEventListener('click', () => {
    if (pendingDoubled) return;
    PR.SDK.rewardedAd(() => {
      pendingDoubled = true; runCoins *= 2;
      $('sumHaul').textContent = fmt(runCoins);
      $('btnDouble').classList.add('hidden');
      A.cash();
    }, () => A.deny());
  });
  $('btnCollect').addEventListener('click', () => { A.cash(); collectRun(); });

  $('swTake').addEventListener('click', () => {
    PR.SDK.rewardedAd(() => {
      usedSecondWind = true; shots += 3; runShotsMax = Math.max(runShotsMax, shots);
      hide('swModal'); phase = 'aim'; A.clear(); updateHUD();
    }, () => A.deny());
  });
  $('swDecline').addEventListener('click', () => { A.tap(); endRun(); });

  $('relGo').addEventListener('click', doPrestige);
  $('relCancel').addEventListener('click', () => { A.tap(); hide('relModal'); });

  $('hustleCollect').addEventListener('click', () => bankHustle(1));
  $('hustleDouble').addEventListener('click', () => {
    PR.SDK.rewardedAd(() => bankHustle(2), () => A.deny());
  });

  $('btnSound').addEventListener('click', () => {
    save.sound = !save.sound; A.enabled = save.sound; persist();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇'; A.tap();
  });
  $('btnShare').addEventListener('click', share);

  function doPrestige() {
    const newRep = DATA.repFor(save.lifetimeEarned);
    save.rep = newRep; save.prestiges++;
    save.coins = 0; save.lifetimeEarned = 0;
    DATA.upgrades.forEach(u => save.up[u.id] = 0);
    unlockTrick('prestige');
    A.prestige(); PR.SDK.happyTime();
    hide('relModal');
    state = ST.SURFACE; rack = 0; runCoins = 0; respotCue(); spawnRack();
    persist(); renderSheet('house'); updateHUD();
    banner('RUN THE TABLE!');
  }

  function bankHustle(m) {
    const amt = pendingHustle * m;
    save.coins += amt; save.lifetimeEarned += amt;
    pendingHustle = 0; hide('hustleModal');
    A.cash(); persist(); updateHUD();
    if (curTab === 'house' || curTab === 'shop') renderSheet(curTab);
  }

  async function share() {
    A.tap();
    const text = `I ran ${save.maxRack} racks and banked ${fmt(save.bestRun)} in POCKETRUSH 🎱 — beat my break!`;
    let url = location.href;
    const cg = await PR.SDK.invite({ best: save.bestRun });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'PocketRush', text, url }); return; } } catch (e) {}
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      const el = $('shareToast'); el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1600);
    } catch (e) {}
  }

  /* ================= OFFLINE HUSTLE ================= */
  function computeHustle() {
    const away = (Date.now() - save.lastSeen) / 1000;
    const l = lvl('hustle');
    if (l <= 0 || away < 60 || save.bestRun <= 0) return;
    const perMin = DATA.hustleRate(l, save.bestRun);
    const mins = Math.min(away / 60, DATA.HUSTLE_CAP_H * 60);
    const amt = Math.round(perMin * mins);
    if (amt <= 0) return;
    pendingHustle = amt;
    $('hustleTime').textContent = fmtTime(away);
    $('hustleAmount').textContent = fmt(amt);
    show('hustleModal');
  }

  /* ================= HELPERS ================= */
  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= BOOT + LOOP ================= */
  (async function boot() {
    PR.SDK.loadingStart();
    // init del SDK en paralelo: bloqueaba el arranque (mesa congelada/negra)
    const sdkReady = PR.SDK.init();
    sdkReady.then(() => PR.SDK.loadingStop());
    if (save.prestiges === 0) save.rule = 'straight';
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    respotCue(); spawnRack();
    renderSheet('shop');
    updateHUD();
    computeHustle();
    let last = performance.now();
    requestAnimationFrame(function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      update(dt); render();
      requestAnimationFrame(loop);
    });
    setInterval(updateGoldenBtn, 1000); // refresh cooldown/timer text
  })();

  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
})();
