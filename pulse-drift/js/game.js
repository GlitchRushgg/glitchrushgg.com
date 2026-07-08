/* ============================================================
   PULSE DRIFT — neon one-button wave-dodger with graze scoring.

   HOLD  = rise at 45°     RELEASE = fall at 45°
   Skim close to obstacles WITHOUT touching to charge the pulse
   meter and multiply your score (×1 → ×5). Touch = death.

   All rendering is procedural canvas; all audio is WebAudio.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = PD.Audio;

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'pulseDrift_v1';
  const save = { best: 0, sparks: 0, skin: 'cyan', owned: ['cyan'], sound: true, plays: 0 };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  A.enabled = save.sound;

  const SKINS = [
    { id: 'cyan',    name: 'Neon Spark',  cost: 0,    hue: 185 },
    { id: 'magenta', name: 'Pink Pulse',  cost: 150,  hue: 320 },
    { id: 'lime',    name: 'Acid Drift',  cost: 400,  hue: 100 },
    { id: 'gold',    name: 'Solar Flare', cost: 900,  hue: 45  },
    { id: 'prism',   name: 'Prism',       cost: 2000, hue: -1  }, // cycles hue
  ];
  const skinHue = () => {
    const s = SKINS.find(k => k.id === save.skin) || SKINS[0];
    return s.hue < 0 ? (tt * 70) % 360 : s.hue;
  };

  /* ================= CANVAS ================= */
  const cv = $('game'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, u = 1; // u: unit scale (design height 640)
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    u = H / 640;
  }
  window.addEventListener('resize', resize);
  resize();

  /* ================= TUNABLES ================= */
  const BASE_SPEED = 275;          // px/s at u=1
  const MAX_RAMP   = 2.2;          // speed cap multiplier
  const RAMP_DIST  = 16000;        // px(u) to reach cap (~smooth +4%/10s feel)
  const PX_PER_M   = 6;            // score meters
  const PLAYER_R   = 7;            // collision radius (u)
  const GRAZE_BAND = 26;           // graze halo beyond collision (u)
  const METER_RATE = 0.55;         // meter fill per second grazing
  const DECAY_SECS = 3;            // no-graze seconds before a tier drops
  const MAX_MULT   = 5;
  const TOPY = () => 34 * u, BOTY = () => H - 34 * u;
  const PXS  = () => W * 0.30;     // player screen x

  /* ================= STATE ================= */
  const ST = { MENU: 0, PLAY: 1, DYING: 2, DEAD: 3 };
  let state = ST.MENU;
  let tt = 0;                       // global time
  let holding = false;
  let py = 0, dist = 0, camX = 0, speed = 0;
  let score = 0, mult = 1, meter = 0, grazeTimer = 0, grazing = false;
  let sparksRun = 0, sparkAcc = 0;
  let usedRevive = false, usedX2 = false, shield = 0;
  let deathsSinceAd = 0;
  let obstacles = [], particles = [], trail = [];
  let genX = 0;
  let slowmo = 0, shake = 0, flashA = 0, flipT = 0, dieT = 0;
  let bestBanner = 0, isNewBest = false;

  const rand = (a, b) => a + Math.random() * (b - a);

  /* ================= WORLD GENERATION =================
     Every pattern is validated: any vertical passage it creates
     is >= minGap (which shrinks with distance but never below
     a survivable floor), so deaths always feel fair. */
  const meters = () => dist / (PX_PER_M * u);
  const minGap = () => Math.max(120, 190 - meters() * 0.03) * u;

  function spawnPattern(x) {
    const m = meters();
    const pool = ['spikes', 'block', 'block'];
    if (m > 250)  pool.push('mover');
    if (m > 600)  pool.push('bar', 'spikes');
    if (m > 1000) pool.push('tunnel', 'mover');
    const t = pool[(Math.random() * pool.length) | 0];
    let width = 0;

    if (t === 'spikes') {
      const top = Math.random() < 0.5;
      const n = 2 + (Math.random() * 3 | 0), w = 44 * u;
      const hh = Math.min(rand(60, 115) * u, (BOTY() - TOPY()) - minGap()); // always leaves a gap
      for (let i = 0; i < n; i++)
        obstacles.push({ type: 'spike', x: x + i * w, w, h: hh, top });
      width = n * w;
    } else if (t === 'block' || t === 'mover') {
      const w = rand(42, 70) * u, h = rand(80, 150) * u;
      const amp = t === 'mover' ? rand(50, 110) * u : 0;
      const lo = TOPY() + h / 2 + amp + minGap();
      const hi = BOTY() - h / 2 - amp - minGap();
      if (hi > lo) {
        obstacles.push({ type: 'block', x, w, h, cy: rand(lo, hi), amp, om: rand(1.2, 2.2), ph: rand(0, 6) });
      }
      width = w;
    } else if (t === 'bar') {
      const len = rand(140, 210) * u;
      const lo = TOPY() + len / 2 + minGap() * 0.7;
      const hi = BOTY() - len / 2 - minGap() * 0.7;
      if (hi > lo) {
        obstacles.push({ type: 'bar', x, len, th: 12 * u, cy: rand(lo, hi),
                         om: rand(0.9, 1.6) * (Math.random() < 0.5 ? -1 : 1), ph: rand(0, 6) });
      }
      width = len;
    } else { // tunnel
      const gap = Math.max(minGap() * 1.25, 150 * u);
      const cy = rand(TOPY() + gap, BOTY() - gap);
      const len = rand(280, 460) * u;
      obstacles.push({ type: 'tunnel', x, len, cy, gap });
      width = len;
    }
    return width;
  }

  function genAhead() {
    while (genX < camX + W * 1.7) {
      const w = spawnPattern(genX);
      const spacing = Math.max(200, 360 - meters() * 0.04) * u;
      genX += w + spacing * rand(0.85, 1.25);
    }
    while (obstacles.length && obstacles[0].x + 700 * u < camX) obstacles.shift();
  }

  /* ================= GEOMETRY ================= */
  function rectDist(px_, py_, rx, ry, rw, rh) {
    const dx = Math.max(rx - px_, 0, px_ - (rx + rw));
    const dy = Math.max(ry - py_, 0, py_ - (ry + rh));
    if (dx === 0 && dy === 0) return -1; // inside
    return Math.hypot(dx, dy);
  }
  function segDist(px_, py_, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const L2 = dx * dx + dy * dy || 1;
    let t = ((px_ - x1) * dx + (py_ - y1) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px_ - (x1 + t * dx), py_ - (y1 + t * dy));
  }
  function triDist(px_, py_, ax, ay, bx, by, cx2, cy2) {
    const s1 = (bx - ax) * (py_ - ay) - (by - ay) * (px_ - ax);
    const s2 = (cx2 - bx) * (py_ - by) - (cy2 - by) * (px_ - bx);
    const s3 = (ax - cx2) * (py_ - cy2) - (ay - cy2) * (px_ - cx2);
    const hasNeg = (s1 < 0) || (s2 < 0) || (s3 < 0);
    const hasPos = (s1 > 0) || (s2 > 0) || (s3 > 0);
    if (!(hasNeg && hasPos)) return -1; // inside
    return Math.min(
      segDist(px_, py_, ax, ay, bx, by),
      segDist(px_, py_, bx, by, cx2, cy2),
      segDist(px_, py_, cx2, cy2, ax, ay));
  }

  /* Distance from player to an obstacle's surface (-1 = inside). */
  function obDist(o, sx) {
    const px_ = PXS(), py_ = py;
    switch (o.type) {
      case 'spike': {
        const base = o.top ? TOPY() : BOTY();
        const tip = o.top ? base + o.h : base - o.h;
        return triDist(px_, py_, sx, base, sx + o.w, base, sx + o.w / 2, tip);
      }
      case 'block': {
        const cy = o.cy + (o.amp ? Math.sin(tt * o.om + o.ph) * o.amp : 0);
        return rectDist(px_, py_, sx, cy - o.h / 2, o.w, o.h);
      }
      case 'bar': {
        const rot = tt * o.om + o.ph;
        const cx2 = sx, cy2 = o.cy;
        const cos = Math.cos(-rot), sin = Math.sin(-rot);
        const lx = (px_ - cx2) * cos - (py_ - cy2) * sin;
        const ly = (px_ - cx2) * sin + (py_ - cy2) * cos;
        const dx = Math.max(Math.abs(lx) - o.len / 2, 0);
        const dy = Math.max(Math.abs(ly) - o.th / 2, 0);
        if (dx === 0 && dy === 0) return -1;
        return Math.hypot(dx, dy);
      }
      case 'tunnel': {
        const topH = (o.cy - o.gap / 2) - TOPY();
        const botY = o.cy + o.gap / 2;
        const d1 = topH > 0 ? rectDist(px_, py_, sx, TOPY(), o.len, topH) : 1e9;
        const d2 = (BOTY() - botY) > 0 ? rectDist(px_, py_, sx, botY, o.len, BOTY() - botY) : 1e9;
        const m1 = d1 < 0 ? -1 : d1, m2 = d2 < 0 ? -1 : d2;
        return Math.min(m1, m2);
      }
    }
    return 1e9;
  }

  /* ================= RUN LIFECYCLE ================= */
  function resetRun() {
    dist = 0; camX = 0; py = H / 2; holding = false;
    score = 0; mult = 1; meter = 0; grazeTimer = 0; grazing = false;
    sparksRun = 0; sparkAcc = 0;
    usedRevive = false; usedX2 = false; shield = 0;
    obstacles = []; particles = []; trail = [];
    genX = 700 * u;
    slowmo = 0; shake = 0; flashA = 0; dieT = 0;
    isNewBest = false; bestBanner = 0;
    genAhead();
  }

  function startRun() {
    resetRun();
    state = ST.PLAY;
    save.plays++;
    persist();
    hide('menu'); hide('dead');
    show('hud');
    PD.SDK.gameplayStart();
    A.resume();
  }

  function die() {
    if (shield > 0) return;
    state = ST.DYING;
    dieT = 0;
    slowmo = 0.45; shake = 0.3; flashA = 0.7;
    A.grazeOff(); A.death();
    burst(PXS(), py, 80);
    PD.SDK.gameplayStop();
    holding = false;
  }

  function showDead() {
    state = ST.DEAD;
    deathsSinceAd++;
    // best & currency
    const final = Math.floor(score);
    isNewBest = final > save.best;
    if (isNewBest) {
      save.best = final;
      A.best();
      PD.SDK.happyTime();
    }
    persist();
    // fill panel
    $('deadScore').textContent = fmtNum(final);
    $('deadBest').textContent = fmtNum(save.best);
    $('deadDist').textContent = Math.floor(meters()) + 'm';
    $('deadSparks').textContent = '+' + sparksRun;
    $('newBest').classList.toggle('hidden', !isNewBest);
    // revive: once per run, ad OR 50 sparks (alternative required by CG)
    const canRevive = !usedRevive;
    $('btnRevive').classList.toggle('hidden', !canRevive);
    $('btnReviveSparks').classList.toggle('hidden', !canRevive || save.sparks < 50);
    // x2: only when the score matters (>= 80% of best) and not used
    $('btnX2').classList.toggle('hidden', usedX2 || final < save.best * 0.8 || final === 0);
    updateSparksUI();
    show('dead');
    hide('hud');
  }

  function revive() {
    usedRevive = true;
    shield = 3;
    state = ST.PLAY;
    A.revive();
    hide('dead'); show('hud');
    PD.SDK.gameplayStart();
  }

  function restart() {
    // midgame ad at a natural break, respecting pacing (SDK also caps)
    if (deathsSinceAd >= 3) {
      deathsSinceAd = 0;
      PD.SDK.midgameAd(startRun);
    } else startRun();
  }

  /* ================= UPDATE ================= */
  let rawLast = performance.now();
  function update(rawDt) {
    tt += rawDt;
    if (flipT > 0) flipT -= rawDt * 6;
    if (shake > 0) shake -= rawDt;
    if (flashA > 0) flashA -= rawDt * 2.2;
    if (bestBanner > 0) bestBanner -= rawDt;

    if (state === ST.DYING) {
      dieT += rawDt;
      updateParticles(rawDt * 0.4);
      if (dieT > 0.55) showDead();
      return;
    }
    if (state !== ST.PLAY) { updateParticles(rawDt); return; }

    const ts = slowmo > 0 ? 0.35 : (grazing ? 0.93 : 1);
    if (slowmo > 0) slowmo -= rawDt;
    const dt = rawDt * ts;

    speed = BASE_SPEED * u * Math.min(MAX_RAMP, 1 + dist / (RAMP_DIST * u));
    dist += speed * dt;
    camX = dist;
    py += (holding ? -1 : 1) * speed * dt;

    // floor / ceiling
    if (py < TOPY() + PLAYER_R * u || py > BOTY() - PLAYER_R * u) {
      py = Math.max(TOPY() + PLAYER_R * u, Math.min(BOTY() - PLAYER_R * u, py));
      return die();
    }

    trail.push({ x: dist, y: py });
    if (trail.length > 80) trail.shift();

    genAhead();

    // collision + graze in one pass
    let minD = 1e9;
    for (const o of obstacles) {
      const sx = o.x - camX + PXS();
      const span = (o.len || o.w || 100) + 300 * u;
      if (sx < -span || sx > W + span) continue;
      const d = obDist(o, sx);
      if (d < minD) minD = d;
      if (minD < 0) break;
    }

    if (minD < PLAYER_R * u) { if (shield <= 0) return die(); }

    const wasGrazing = grazing;
    grazing = minD >= 0 && minD < (PLAYER_R + GRAZE_BAND) * u && shield <= 0;

    if (grazing) {
      grazeTimer = 0;
      meter += dt * METER_RATE;
      if (meter >= 1) {
        if (mult < MAX_MULT) { mult++; meter = 0; tierUpFx(); }
        else meter = 1;
      }
      A.grazeOn(mult);
      // spark currency + particles while skimming
      sparkAcc += dt;
      if (sparkAcc > 0.22) {
        sparkAcc = 0; sparksRun++; save.sparks++; updateSparksUI();
        particles.push(mkSpark(PXS(), py));
      }
      if (Math.random() < 0.5) particles.push(mkSpark(PXS(), py));
    } else {
      if (wasGrazing) A.grazeOff();
      grazeTimer += dt;
      if (grazeTimer > DECAY_SECS && mult > 1) {
        mult--; grazeTimer = 0; meter = 0.5; A.tierDown();
      }
    }

    score += (speed * dt / (PX_PER_M * u)) * mult;
    if (shield > 0) shield -= dt;

    updateParticles(dt);
    updateHUD();
  }

  function tierUpFx() {
    A.tierUp(mult);
    flashA = Math.max(flashA, 0.25);
    shake = Math.max(shake, 0.12);
    burst(PXS(), py, 22);
    const b = $('multBadge');
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  }

  /* ================= PARTICLES ================= */
  function mkSpark(x, y) {
    return { x, y, vx: rand(-140, -40), vy: rand(-90, 90),
             life: rand(0.3, 0.6), size: rand(1.5, 3.5), hue: skinHue() };
  }
  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(60, 380);
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                       life: rand(0.4, 0.9), size: rand(2, 5), hue: skinHue() });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= (1 - dt * 1.5); p.vy *= (1 - dt * 1.5);
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  /* ================= RENDER ================= */
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // screen shake
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);

    // background: hue drifts every ~500m
    const bgHue = (215 + meters() / 500 * 42) % 360;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `hsl(${bgHue},55%,8%)`);
    g.addColorStop(1, `hsl(${(bgHue + 45) % 360},60%,14%)`);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // parallax grid
    ctx.strokeStyle = `hsla(${bgHue},70%,55%,.07)`;
    ctx.lineWidth = 1;
    const gs = 84 * u, off = (camX * 0.35) % gs;
    for (let x = -off; x < W; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = TOPY(); y < BOTY(); y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // corridor edges (kill zones)
    const edge = `hsl(${bgHue},85%,62%)`;
    ctx.shadowColor = edge; ctx.shadowBlur = 16 * u;
    ctx.fillStyle = edge;
    ctx.fillRect(0, TOPY() - 4 * u, W, 4 * u);
    ctx.fillRect(0, BOTY(), W, 4 * u);
    ctx.shadowBlur = 0;
    // hazard teeth on edges
    ctx.fillStyle = `hsla(${bgHue},85%,62%,.35)`;
    const tw = 26 * u, toff = (camX * 0.9) % tw;
    for (let x = -toff; x < W; x += tw) {
      ctx.beginPath();
      ctx.moveTo(x, TOPY()); ctx.lineTo(x + tw / 2, TOPY() + 9 * u); ctx.lineTo(x + tw, TOPY()); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, BOTY()); ctx.lineTo(x + tw / 2, BOTY() - 9 * u); ctx.lineTo(x + tw, BOTY()); ctx.fill();
    }

    // obstacles — neon outline style
    const obHue = (bgHue + 180) % 360;
    ctx.lineWidth = 2.5 * u;
    for (const o of obstacles) {
      const sx = o.x - camX + PXS();
      const span = (o.len || o.w || 100) + 60 * u;
      if (sx < -span || sx > W + span) continue;
      ctx.strokeStyle = `hsl(${obHue},95%,66%)`;
      ctx.fillStyle = `hsla(${obHue},95%,60%,.14)`;
      ctx.shadowColor = `hsl(${obHue},95%,66%)`;
      ctx.shadowBlur = 14 * u;
      drawOb(o, sx);
    }
    ctx.shadowBlur = 0;

    // trail (additive glow)
    if (trail.length > 1) {
      ctx.globalCompositeOperation = 'lighter';
      const hue = skinHue();
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length;
        const p0 = trail[i - 1], p1 = trail[i];
        ctx.strokeStyle = `hsla(${hue},100%,${45 + a * 25}%,${a * 0.55})`;
        ctx.lineWidth = (1 + a * 5) * u;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0.x - camX + PXS(), p0.y);
        ctx.lineTo(p1.x - camX + PXS(), p1.y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // particles
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2.2);
      ctx.fillStyle = `hsl(${p.hue},100%,65%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * u, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // player
    if (state === ST.PLAY || state === ST.MENU) drawPlayer();

    // shield ring
    if (shield > 0 && state === ST.PLAY) {
      ctx.strokeStyle = `hsla(${skinHue()},100%,75%,${0.4 + Math.sin(tt * 12) * 0.3})`;
      ctx.lineWidth = 2.5 * u;
      ctx.beginPath(); ctx.arc(PXS(), py, 20 * u, 0, 7); ctx.stroke();
    }

    // white flash
    if (flashA > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.75, flashA)})`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
  }

  function drawOb(o, sx) {
    switch (o.type) {
      case 'spike': {
        const base = o.top ? TOPY() : BOTY();
        const tip = o.top ? base + o.h : base - o.h;
        ctx.beginPath();
        ctx.moveTo(sx, base); ctx.lineTo(sx + o.w, base); ctx.lineTo(sx + o.w / 2, tip);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'block': {
        const cy = o.cy + (o.amp ? Math.sin(tt * o.om + o.ph) * o.amp : 0);
        rrect(sx, cy - o.h / 2, o.w, o.h, 5 * u); ctx.fill(); ctx.stroke();
        break;
      }
      case 'bar': {
        ctx.save();
        ctx.translate(sx, o.cy);
        ctx.rotate(tt * o.om + o.ph);
        rrect(-o.len / 2, -o.th / 2, o.len, o.th, o.th / 2); ctx.fill(); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'tunnel': {
        const topH = (o.cy - o.gap / 2) - TOPY();
        const botY = o.cy + o.gap / 2;
        if (topH > 0) { rrect(sx, TOPY(), o.len, topH, 5 * u); ctx.fill(); ctx.stroke(); }
        if (BOTY() - botY > 0) { rrect(sx, botY, o.len, BOTY() - botY, 5 * u); ctx.fill(); ctx.stroke(); }
        break;
      }
    }
  }

  function drawPlayer() {
    const x = PXS(), y = state === ST.MENU ? H / 2 + Math.sin(tt * 2) * 14 * u : py;
    const ang = state === ST.MENU ? 0 : (holding ? -Math.PI / 4 : Math.PI / 4);
    const squash = 1 - Math.max(0, flipT) * 0.3;
    const hue = skinHue();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(1, squash);
    ctx.shadowColor = `hsl(${hue},100%,65%)`;
    ctx.shadowBlur = 22 * u;
    ctx.fillStyle = `hsl(${hue},100%,72%)`;
    const s = 11 * u;
    ctx.beginPath();
    ctx.moveTo(s * 1.4, 0); ctx.lineTo(-s, -s * 0.8); ctx.lineTo(-s * 0.4, 0); ctx.lineTo(-s, s * 0.8);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s * 0.2, 0, 2.6 * u, 0, 7); ctx.fill();
    ctx.restore();
  }

  function rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ================= HUD / UI ================= */
  function fmtNum(n) {
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }
  function updateHUD() {
    $('score').textContent = fmtNum(score);
    const b = $('multBadge');
    b.textContent = '×' + mult;
    b.dataset.tier = mult;
    $('meterFill').style.width = (meter * 100).toFixed(1) + '%';
  }
  function updateSparksUI() {
    document.querySelectorAll('.sparksVal').forEach(el => el.textContent = fmtNum(save.sparks));
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ---------- skins ---------- */
  function renderSkins() {
    $('skinRow').innerHTML = SKINS.map(s => {
      const owned = save.owned.includes(s.id);
      const sel = save.skin === s.id;
      const hue = s.hue < 0 ? null : s.hue;
      const bg = hue === null
        ? 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'
        : `hsl(${hue},100%,60%)`;
      return `<button class="skin ${sel ? 'sel' : ''}" data-skin="${s.id}" title="${s.name}">
        <span class="skin-dot" style="background:${bg}"></span>
        ${owned ? '' : `<span class="skin-cost">✦${s.cost}</span>`}
      </button>`;
    }).join('');
  }
  $('skinRow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-skin]');
    if (!b) return;
    const s = SKINS.find(k => k.id === b.dataset.skin);
    if (save.owned.includes(s.id)) {
      save.skin = s.id; A.click();
    } else if (save.sparks >= s.cost) {
      save.sparks -= s.cost;
      save.owned.push(s.id);
      save.skin = s.id;
      A.best();
    } else { A.deny(); return; }
    persist(); renderSkins(); updateSparksUI();
  });

  /* ================= INPUT ================= */
  function press(e) {
    if (e && e.target && e.target.closest('button, .panel')) return; // UI clicks
    A.resume();
    if (state === ST.MENU) { startRun(); holding = true; flipT = 1; return; }
    if (state === ST.PLAY && !holding) { holding = true; flipT = 1; A.flip(); }
  }
  function release() {
    if (state === ST.PLAY && holding) { holding = false; flipT = 1; A.flip(); }
  }
  window.addEventListener('pointerdown', press);
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); press(null); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') release();
  });
  window.addEventListener('blur', release);

  /* ================= BUTTONS ================= */
  $('btnRestart').addEventListener('click', () => { A.click(); restart(); });
  $('btnMenu').addEventListener('click', () => {
    A.click(); hide('dead'); show('menu'); state = ST.MENU;
    $('menuBest').textContent = fmtNum(save.best);
    renderSkins(); updateSparksUI();
  });
  $('btnRevive').addEventListener('click', () => {
    PD.SDK.rewardedAd(revive, () => { A.deny(); });
  });
  $('btnReviveSparks').addEventListener('click', () => {
    if (save.sparks < 50) { A.deny(); return; }
    save.sparks -= 50; persist(); updateSparksUI();
    revive();
  });
  $('btnX2').addEventListener('click', () => {
    PD.SDK.rewardedAd(() => {
      usedX2 = true;
      score *= 2;
      const final = Math.floor(score);
      $('deadScore').textContent = fmtNum(final);
      if (final > save.best) {
        save.best = final; isNewBest = true;
        $('deadBest').textContent = fmtNum(save.best);
        $('newBest').classList.remove('hidden');
        A.best(); PD.SDK.happyTime();
      }
      persist();
      $('btnX2').classList.add('hidden');
    }, () => A.deny());
  });
  $('btnSound').addEventListener('click', () => {
    save.sound = !save.sound;
    A.enabled = save.sound;
    persist();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    A.click();
  });
  $('btnShare').addEventListener('click', share);
  // Back to glitchrushgg.com — hidden inside the CrazyGames iframe.
  if (window.self === window.top) $('btnHome').addEventListener('click', () => { location.href = '/'; });
  else $('btnHome').classList.add('hidden');
  async function share() {
    const text = `I scored ${fmtNum(save.best)} in PULSE DRIFT ⚡ — hold to rise, graze to multiply. Beat me!`;
    let url = location.href;
    const cg = await PD.SDK.invite({ best: save.best });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'Pulse Drift', text, url }); return; } } catch (e) {}
    try { await navigator.clipboard.writeText(text + ' ' + url); toastShare(); } catch (e) {}
  }
  let shareT;
  function toastShare() {
    const el = $('shareToast');
    el.classList.add('show');
    clearTimeout(shareT);
    shareT = setTimeout(() => el.classList.remove('show'), 1600);
  }

  /* ================= BOOT + LOOP ================= */
  (async function boot() {
    PD.SDK.loadingStart();
    await PD.SDK.init();
    PD.SDK.loadingStop();
    $('menuBest').textContent = fmtNum(save.best);
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    renderSkins(); updateSparksUI();
    resetRun(); // pre-gen world visible behind menu
    state = ST.MENU;
    requestAnimationFrame(loop);
  })();

  function loop(now) {
    const rawDt = Math.min((now - rawLast) / 1000, 0.05);
    rawLast = now;
    update(rawDt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { persist(); release(); }
  });
})();
