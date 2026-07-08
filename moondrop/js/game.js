/* ============================================================
   MOONDROP — cosmic container drop-merge with physics.

   Drop celestial bodies into the well. Equal bodies merge into
   the next tier: Stardust → … → Supernova. Merge two Supernovas
   and a BLACK HOLE forms — it devours the pile for bonus score.
   Overflow the dashed line for 2s and the run ends.

   Pure canvas + WebAudio. Custom circle-impulse physics.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = MD.Audio;

  /* ================= TIERS ================= */
  const TIERS = [
    { name: 'Stardust',     r: 14,  c: '#cdb4f6', pts: 2    },
    { name: 'Pebble',       r: 20,  c: '#8ea6f5', pts: 5    },
    { name: 'Meteor',       r: 27,  c: '#54d6c8', pts: 10   },
    { name: 'Comet',        r: 36,  c: '#7ce3a1', pts: 20   },
    { name: 'Moon',         r: 46,  c: '#f2e7c9', pts: 40   },
    { name: 'Planet',       r: 58,  c: '#ff9d76', pts: 80   },
    { name: 'Gas Giant',    r: 72,  c: '#ff7096', pts: 150  },
    { name: 'Ringed Giant', r: 88,  c: '#ffd166', pts: 300  },
    { name: 'Star',         r: 106, c: '#fff3d6', pts: 600  },
    { name: 'Supernova',    r: 126, c: '#ff9df5', pts: 1200 },
  ];
  const SPAWN_W = [5, 3, 2, 1]; // spawn weights for tiers 0-3

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'moondrop_v1';
  const save = { best: 0, sound: true, plays: 0, maxTier: 0 };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
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
  const toLogical = (cx, cy) => ({ x: (cx - offX) / scale, y: (cy - offY) / scale });

  /* ================= WORLD CONSTANTS ================= */
  const X0 = 22, X1 = LW - 22;       // container walls
  const FLOOR = LH - 18;             // container floor
  const CTOP = 148;                  // container visual top
  const LOSEY = 218;                 // dashed lose line
  const HOLDY = 108;                 // held body y
  const GRAV = 1800, REST = 0.15, ITER = 5, HSTEP = 1 / 120;
  const OVERFLOW_SECS = 2;

  /* ================= STATE ================= */
  const ST = { TITLE: 0, PLAY: 1, OVER: 2 };
  let state = ST.TITLE;
  let tt = 0;
  let bodies = [], particles = [], floats = [], rings = [], bhs = [];
  let heldTier = 0, nextTier = 0, aimX = LW / 2, dropCd = 0, canHold = true;
  let score = 0, comboN = 0, comboT = 0;
  let overflowT = 0, danger = 0;
  let shake = 0, freeze = 0;
  let usedSecond = false, usedMiniBH = false, miniBHReady = false;
  let discovered = save.maxTier; // highest tier ever seen (for ladder UI)
  let runMaxTier = 0;
  let bannerT = 0, bannerTxt = '';
  let gamesSinceAd = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const mass = (r) => r * r;

  function randSpawnTier() {
    const tot = SPAWN_W.reduce((a, b) => a + b, 0);
    let x = Math.random() * tot;
    for (let i = 0; i < SPAWN_W.length; i++) { x -= SPAWN_W[i]; if (x <= 0) return i; }
    return 0;
  }

  function mkBody(tier, x, y, vx, vy) {
    return { tier, x, y, vx: vx || 0, vy: vy || 0, r: TIERS[tier].r,
             touched: false, sq: 0, excited: false, dead: false, born: tt };
  }

  /* ================= RUN LIFECYCLE ================= */
  function resetRun() {
    bodies = []; particles = []; floats = []; rings = []; bhs = [];
    score = 0; comboN = 0; comboT = 0;
    overflowT = 0; danger = 0; shake = 0; freeze = 0;
    usedSecond = false; usedMiniBH = false; miniBHReady = false;
    runMaxTier = 0; dropCd = 0; canHold = true;
    heldTier = randSpawnTier(); nextTier = randSpawnTier();
    updateHUD(); renderLadder();
    $('btnMiniBH').classList.add('hidden');
  }

  function startRun() {
    resetRun();
    state = ST.PLAY;
    save.plays++; persist();
    hide('title'); hide('over'); show('hud');
    MD.SDK.gameplayStart();
    A.resume();
  }

  function gameOver() {
    state = ST.OVER;
    A.over();
    MD.SDK.gameplayStop();
    shake = 0.35;
    const final = Math.floor(score);
    const isBest = final > save.best;
    if (isBest) { save.best = final; A.best(); MD.SDK.happyTime(); }
    persist();
    $('overScore').textContent = fmtNum(final);
    $('overBest').textContent = fmtNum(save.best);
    $('overTier').textContent = TIERS[runMaxTier].name;
    $('overNewBest').classList.toggle('hidden', !isBest);
    $('btnSecond').classList.toggle('hidden', usedSecond);
    show('over'); hide('hud');
    gamesSinceAd++;
  }

  /* Second Chance: vaporize the top third of the pile and resume. */
  function secondChance() {
    usedSecond = true;
    const settled = bodies.filter(b => b.touched).sort((a, b) => a.y - b.y);
    const n = Math.max(1, Math.floor(settled.length / 3));
    for (let i = 0; i < n; i++) {
      const b = settled[i];
      b.dead = true;
      popFx(b.x, b.y, b.r, TIERS[b.tier].c, 10);
    }
    bodies = bodies.filter(b => !b.dead);
    overflowT = 0;
    state = ST.PLAY;
    A.revive();
    hide('over'); show('hud');
    MD.SDK.gameplayStart();
  }

  function retry() {
    if (gamesSinceAd >= 2) { gamesSinceAd = 0; MD.SDK.midgameAd(startRun); }
    else startRun();
  }

  /* ================= PHYSICS ================= */
  function physStep(h) {
    // integrate
    for (const b of bodies) {
      b.vy += GRAV * h;
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.excited = false;
    }

    for (let it = 0; it < ITER; it++) {
      // walls + floor
      for (const b of bodies) {
        if (b.x - b.r < X0) { b.x = X0 + b.r; if (b.vx < 0) b.vx *= -REST; touch(b, Math.abs(b.vx)); }
        if (b.x + b.r > X1) { b.x = X1 - b.r; if (b.vx > 0) b.vx *= -REST; touch(b, Math.abs(b.vx)); }
        if (b.y + b.r > FLOOR) {
          b.y = FLOOR - b.r;
          if (b.vy > 0) { touch(b, b.vy); b.vy *= -REST; }
          b.vx *= 0.96; // ground friction
        }
      }
      // pairs
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i];
        if (a.dead) continue;
        for (let j = i + 1; j < bodies.length; j++) {
          const c = bodies[j];
          if (c.dead) continue;
          const dx = c.x - a.x, dy = c.y - a.y;
          const rs = a.r + c.r;
          const d2 = dx * dx + dy * dy;
          // "about to merge" tease for faces
          if (a.tier === c.tier && d2 < rs * rs * 2.2) { a.excited = c.excited = true; }
          if (d2 >= rs * rs || d2 === 0) continue;

          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          const overlap = rs - d;

          // same tier overlapping → merge (once per frame per pair)
          if (a.tier === c.tier && overlap > 1.5 && it === 0 && tt - a.born > 0.08 && tt - c.born > 0.08) {
            mergePair(a, c);
            continue;
          }

          // positional correction weighted by mass
          const ma = mass(a.r), mc = mass(c.r), tm = ma + mc;
          a.x -= nx * overlap * (mc / tm);
          a.y -= ny * overlap * (mc / tm);
          c.x += nx * overlap * (ma / tm);
          c.y += ny * overlap * (ma / tm);

          // impulse
          const rvx = c.vx - a.vx, rvy = c.vy - a.vy;
          const vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            const imp = -(1 + REST) * vn / (1 / ma + 1 / mc);
            a.vx -= imp * nx / ma; a.vy -= imp * ny / ma;
            c.vx += imp * nx / mc; c.vy += imp * ny / mc;
            touch(a, -vn); touch(c, -vn);
            // slight tangential damping (friction)
            a.vx *= 0.999; c.vx *= 0.999;
          }
        }
      }
    }
    bodies = bodies.filter(b => !b.dead);
  }

  function touch(b, impact) {
    if (!b.touched) { b.touched = true; if (impact > 240) A.land(); }
    if (impact > 320) b.sq = Math.min(1, impact / 900);
  }

  /* ================= MERGING ================= */
  function mergePair(a, c) {
    a.dead = c.dead = true;
    const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
    const tier = a.tier;

    // combo chain (merges within 1.5s of each other)
    comboN = (comboT > 0) ? comboN + 1 : 1;
    comboT = 1.5;
    const mult = Math.min(comboN, 5);

    if (tier === TIERS.length - 1) {
      // SUPERNOVA + SUPERNOVA → BLACK HOLE
      spawnBlackHole(mx, my, 190, 4, false);
      return;
    }

    const nt = tier + 1;
    const nb = mkBody(nt, mx, my, (a.vx + c.vx) / 4, -160);
    nb.touched = true;
    nb.sq = 0.6;
    bodies.push(nb);

    const pts = TIERS[nt].pts * mult;
    score += pts;
    runMaxTier = Math.max(runMaxTier, nt);
    A.merge(comboN, nt);
    popFx(mx, my, TIERS[nt].r, TIERS[nt].c, 8 + nt * 2);
    addFloat(mx, my - TIERS[nt].r, '+' + fmtNum(pts) + (mult > 1 ? '  ×' + mult : ''));
    shake = Math.max(shake, 0.04 + nt * 0.02);
    if (nt >= 7) freeze = Math.max(freeze, 0.03);

    // discovery
    if (nt > discovered) {
      discovered = nt;
      save.maxTier = Math.max(save.maxTier, nt); persist();
      banner('NEW: ' + TIERS[nt].name + '!');
      A.discover();
      renderLadder();
    }
    updateHUD();
  }

  /* ================= BLACK HOLES ================= */
  function spawnBlackHole(x, y, radius, secs, mini) {
    bhs.push({ x, y, pull: radius, t: secs, max: secs, mini });
    A.blackhole();
    MD.SDK.happyTime();
    shake = Math.max(shake, 0.3);
    freeze = Math.max(freeze, 0.05);
    banner(mini ? 'MINI BLACK HOLE!' : '🕳 BLACK HOLE!');
    if (!mini) { score += 2000; addFloat(x, y, '+2,000'); }
    updateHUD();
  }

  function updateBHs(dt) {
    for (let i = bhs.length - 1; i >= 0; i--) {
      const bh = bhs[i];
      bh.t -= dt;
      for (const b of bodies) {
        const dx = bh.x - b.x, dy = bh.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < bh.pull) {
          const f = 4200 * (1 - d / bh.pull) + 600;
          b.vx += (dx / d) * f * dt;
          b.vy += (dy / d) * f * dt;
          if (d < 30 + b.r * 0.4) {
            b.dead = true;
            const pts = TIERS[b.tier].pts * 2;
            score += pts;
            popFx(b.x, b.y, b.r, TIERS[b.tier].c, 8);
            addFloat(b.x, b.y, '+' + fmtNum(pts));
          }
        }
      }
      bodies = bodies.filter(b => !b.dead);
      if (bh.t <= 0) {
        popFx(bh.x, bh.y, 60, '#c9b6ff', 26);
        A.bhEnd();
        shake = Math.max(shake, 0.2);
        bhs.splice(i, 1);
        updateHUD();
      }
    }
  }

  /* ================= FX ================= */
  function popFx(x, y, r, color, n) {
    rings.push({ x, y, r: r * 0.6, max: r * 2.2, a: 0.8 });
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, sp = rand(60, 260);
      particles.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40,
                       life: rand(0.35, 0.7), size: rand(2, 4.5), c: color });
    }
  }
  function addFloat(x, y, txt) { floats.push({ x, y, txt, t: 1 }); }
  function banner(txt) { bannerTxt = txt; bannerT = 2; }

  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 500 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += (r.max - r.r) * dt * 9;
      r.a -= dt * 2.2;
      if (r.a <= 0) rings.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= 46 * dt; f.t -= dt * 0.85;
      if (f.t <= 0) floats.splice(i, 1);
    }
  }

  /* ================= UPDATE ================= */
  let acc = 0, rawLast = performance.now();
  function update(rawDt) {
    tt += rawDt;
    if (shake > 0) shake -= rawDt;
    if (freeze > 0) { freeze -= rawDt; return; }
    if (bannerT > 0) bannerT -= rawDt;
    if (comboT > 0) { comboT -= rawDt; if (comboT <= 0) comboN = 0; }
    updateFx(rawDt);

    if (state !== ST.PLAY) return;

    if (dropCd > 0) { dropCd -= rawDt; if (dropCd <= 0) canHold = true; }

    acc += Math.min(rawDt, 0.05);
    while (acc >= HSTEP) { physStep(HSTEP); acc -= HSTEP; }

    updateBHs(rawDt);

    for (const b of bodies) if (b.sq > 0) b.sq = Math.max(0, b.sq - rawDt * 4);

    // overflow / lose
    let over = false, high = false;
    for (const b of bodies) {
      if (!b.touched) continue;
      if (b.y - b.r * 0.3 < LOSEY) over = true;
      if (b.y - b.r < LOSEY + 140) high = true;
    }
    overflowT = over ? overflowT + rawDt : 0;
    danger += ((over ? 1 : (high ? 0.45 : 0)) - danger) * rawDt * 5;
    if (overflowT >= OVERFLOW_SECS) return gameOver();

    // mini black hole offer when the pile is high (once per run)
    if (high && !usedMiniBH && !miniBHReady) {
      miniBHReady = true;
      $('btnMiniBH').classList.remove('hidden');
    }

    updateHUD();
  }

  /* ================= RENDER ================= */
  const stars = [];
  for (let i = 0; i < 70; i++)
    stars.push({ x: Math.random(), y: Math.random(), s: rand(0.6, 2), ph: rand(0, 6), sp: rand(0.5, 2) });

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ---- full-window space background ----
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0a1f');
    g.addColorStop(0.6, '#141034');
    g.addColorStop(1, '#1d1040');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // nebula blobs
    const ng = ctx.createRadialGradient(W * 0.25, H * 0.3, 0, W * 0.25, H * 0.3, W * 0.5);
    ng.addColorStop(0, 'rgba(120,80,220,.10)'); ng.addColorStop(1, 'rgba(120,80,220,0)');
    ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
    const ng2 = ctx.createRadialGradient(W * 0.8, H * 0.7, 0, W * 0.8, H * 0.7, W * 0.45);
    ng2.addColorStop(0, 'rgba(255,110,160,.07)'); ng2.addColorStop(1, 'rgba(255,110,160,0)');
    ctx.fillStyle = ng2; ctx.fillRect(0, 0, W, H);
    // twinkling stars
    for (const s of stars) {
      const a = 0.3 + 0.6 * Math.abs(Math.sin(tt * s.sp + s.ph));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(s.x * W, s.y * H, s.s, s.s);
    }

    // ---- world (letterboxed) ----
    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 16, rand(-1, 1) * shake * 16);

    drawContainer();
    for (const bh of bhs) drawBH(bh);
    for (const b of bodies) drawBody(b);
    if (state === ST.PLAY) drawHeld();

    // rings + particles (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const r of rings) {
      ctx.globalAlpha = Math.max(0, r.a);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2.4);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // score floats
    ctx.textAlign = 'center';
    ctx.font = '800 20px "Segoe UI", sans-serif';
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, f.t * 1.6);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 10;
      ctx.fillText(f.txt, f.x, f.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // banner
    if (bannerT > 0) {
      const a = Math.min(1, bannerT, (2 - bannerT) * 3);
      ctx.globalAlpha = a;
      ctx.font = '800 30px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 22;
      ctx.fillText(bannerTxt, LW / 2, 330);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // danger vignette
    if (danger > 0.02) {
      const vg = ctx.createLinearGradient(0, CTOP - 40, 0, LOSEY + 80);
      vg.addColorStop(0, `rgba(255,60,80,${0.22 * danger * (0.7 + 0.3 * Math.sin(tt * 6))})`);
      vg.addColorStop(1, 'rgba(255,60,80,0)');
      ctx.fillStyle = vg;
      ctx.fillRect(X0 - 10, CTOP - 40, X1 - X0 + 20, LOSEY + 120 - CTOP);
    }

    ctx.restore();
  }

  function drawContainer() {
    // glass walls
    ctx.strokeStyle = 'rgba(167,139,250,.55)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(X0 - 2, CTOP); ctx.lineTo(X0 - 2, FLOOR + 2); ctx.lineTo(X1 + 2, FLOOR + 2); ctx.lineTo(X1 + 2, CTOP);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // faint inner glass
    ctx.fillStyle = 'rgba(167,139,250,.04)';
    ctx.fillRect(X0, LOSEY, X1 - X0, FLOOR - LOSEY);

    // lose line
    const pulse = overflowT > 0 ? (0.5 + 0.5 * Math.sin(tt * 10)) : 0;
    ctx.strokeStyle = overflowT > 0
      ? `rgba(255,80,90,${0.65 + pulse * 0.35})`
      : 'rgba(255,255,255,.28)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(X0, LOSEY); ctx.lineTo(X1, LOSEY); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBody(b) {
    const T = TIERS[b.tier];
    const sy = 1 - 0.18 * b.sq, sx = 1 + 0.12 * b.sq;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(sx, sy);

    // glow for high tiers
    if (b.tier >= 7) { ctx.shadowColor = T.c; ctx.shadowBlur = 26; }

    // body gradient
    const g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, b.r * 0.1, 0, 0, b.r);
    g.addColorStop(0, lighten(T.c, 0.45));
    g.addColorStop(0.65, T.c);
    g.addColorStop(1, darken(T.c, 0.3));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;

    // tier decorations
    if (b.tier === 4) { // moon craters
      ctx.fillStyle = 'rgba(0,0,0,.09)';
      ctx.beginPath(); ctx.arc(-b.r * 0.35, b.r * 0.15, b.r * 0.16, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(b.r * 0.3, -b.r * 0.3, b.r * 0.12, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(b.r * 0.12, b.r * 0.42, b.r * 0.1, 0, 7); ctx.fill();
    }
    if (b.tier === 6) { // gas bands
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.13)';
      ctx.fillRect(-b.r, -b.r * 0.35, b.r * 2, b.r * 0.2);
      ctx.fillRect(-b.r, b.r * 0.15, b.r * 2, b.r * 0.16);
      ctx.restore();
    }
    if (b.tier === 7) { // ring
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = b.r * 0.1;
      ctx.beginPath(); ctx.ellipse(0, b.r * 0.08, b.r * 1.45, b.r * 0.4, -0.28, 0, 7); ctx.stroke();
    }
    if (b.tier === 8) { // star corona
      ctx.strokeStyle = 'rgba(255,200,90,.55)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + tt * 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * b.r * 1.05, Math.sin(a) * b.r * 1.05);
        ctx.lineTo(Math.cos(a) * b.r * (1.2 + 0.06 * Math.sin(tt * 4 + i)), Math.sin(a) * b.r * (1.2 + 0.06 * Math.sin(tt * 4 + i)));
        ctx.stroke();
      }
    }
    if (b.tier === 9) { // supernova pulse
      ctx.strokeStyle = `rgba(255,157,245,${0.4 + 0.3 * Math.sin(tt * 5)})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, b.r * (1.06 + 0.03 * Math.sin(tt * 5)), 0, 7); ctx.stroke();
    }

    // specular highlight
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.ellipse(-b.r * 0.34, -b.r * 0.42, b.r * 0.2, b.r * 0.12, -0.6, 0, 7);
    ctx.fill();

    // kawaii face
    drawFace(b);
    ctx.restore();
  }

  function drawFace(b) {
    const r = b.r;
    const ex = r * 0.3, ey = -r * 0.08;
    const dark = 'rgba(30,20,50,.85)';
    ctx.fillStyle = dark;
    if (b.excited) {
      // wide-awake eyes
      ctx.beginPath(); ctx.arc(-ex, ey, r * 0.1, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.1, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-ex + r * 0.03, ey - r * 0.03, r * 0.035, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + r * 0.03, ey - r * 0.03, r * 0.035, 0, 7); ctx.fill();
      // open smile
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(0, ey + r * 0.28, r * 0.13, 0, Math.PI); ctx.fill();
    } else {
      // sleepy closed eyes (arcs)
      ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-ex, ey, r * 0.1, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.1, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      // small smile
      ctx.beginPath(); ctx.arc(0, ey + r * 0.22, r * 0.1, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
  }

  function drawBH(bh) {
    const prog = bh.t / bh.max;
    const R = 30 + 14 * Math.sin(tt * 7);
    // accretion swirl
    ctx.save();
    ctx.translate(bh.x, bh.y);
    ctx.rotate(tt * 4);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(180,140,255,${0.5 * prog})`;
      ctx.lineWidth = 5 - i;
      ctx.beginPath();
      ctx.ellipse(0, 0, R + 16 + i * 14, (R + 16 + i * 14) * 0.42, i * 1.1, 0, 5.2);
      ctx.stroke();
    }
    // event horizon
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, '#000');
    g.addColorStop(0.75, '#0a0018');
    g.addColorStop(1, 'rgba(160,110,255,.9)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawHeld() {
    const T = TIERS[heldTier];
    const x = Math.max(X0 + T.r + 2, Math.min(X1 - T.r - 2, aimX));
    // aim guide
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 10]);
    ctx.beginPath(); ctx.moveTo(x, HOLDY + T.r); ctx.lineTo(x, FLOOR); ctx.stroke();
    ctx.setLineDash([]);
    // held body (slight bob)
    const fake = { tier: heldTier, x, y: HOLDY + Math.sin(tt * 3) * 3, r: T.r, sq: 0, excited: false };
    ctx.globalAlpha = canHold ? 1 : 0.35;
    drawBody(fake);
    ctx.globalAlpha = 1;
  }

  /* ---------- color utils ---------- */
  function hexRGB(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function lighten(h, f) {
    const [r, g, b] = hexRGB(h);
    return `rgb(${r + (255 - r) * f | 0},${g + (255 - g) * f | 0},${b + (255 - b) * f | 0})`;
  }
  function darken(h, f) {
    const [r, g, b] = hexRGB(h);
    return `rgb(${r * (1 - f) | 0},${g * (1 - f) | 0},${b * (1 - f) | 0})`;
  }

  /* ================= HUD / DOM ================= */
  function fmtNum(n) {
    n = Math.floor(n);
    return n.toLocaleString('en-US');
  }
  function updateHUD() {
    $('score').textContent = fmtNum(score);
    $('best').textContent = fmtNum(save.best);
    const cb = $('comboBadge');
    if (comboN > 1) {
      cb.classList.remove('hidden');
      cb.textContent = '×' + Math.min(comboN, 5) + ' COMBO';
    } else cb.classList.add('hidden');
    // next preview dot
    const nx = $('nextDot');
    nx.style.background = TIERS[nextTier].c;
    nx.style.width = nx.style.height = Math.min(26, TIERS[nextTier].r) + 'px';
  }
  function renderLadder() {
    $('ladder').innerHTML = TIERS.map((t, i) =>
      `<span class="lad ${i <= discovered ? '' : 'locked'}" style="--c:${t.c}" title="${t.name}"></span>`
    ).join('');
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= INPUT ================= */
  function aimFrom(e) {
    const p = toLogical(e.clientX, e.clientY);
    aimX = p.x;
  }
  window.addEventListener('pointermove', (e) => { if (state === ST.PLAY) aimFrom(e); });
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .panel')) return;
    A.resume();
    if (state === ST.TITLE) { startRun(); aimFrom(e); return; }
    if (state === ST.PLAY) aimFrom(e);
  });
  window.addEventListener('pointerup', (e) => {
    if (e.target.closest('button, .panel')) return;
    if (state === ST.PLAY) { aimFrom(e); dropHeld(); }
  });

  function dropHeld() {
    if (!canHold) return;
    const T = TIERS[heldTier];
    const x = Math.max(X0 + T.r + 2, Math.min(X1 - T.r - 2, aimX));
    bodies.push(mkBody(heldTier, x, HOLDY, 0, 60));
    A.drop();
    heldTier = nextTier;
    nextTier = randSpawnTier();
    canHold = false;
    dropCd = 0.45;
    updateHUD();
  }

  /* ================= BUTTONS ================= */
  $('btnRetry').addEventListener('click', () => { A.click(); retry(); });
  $('btnSecond').addEventListener('click', () => {
    MD.SDK.rewardedAd(secondChance, () => A.deny());
  });
  $('btnMiniBH').addEventListener('click', () => {
    if (usedMiniBH) return;
    MD.SDK.rewardedAd(() => {
      usedMiniBH = true;
      $('btnMiniBH').classList.add('hidden');
      // place at the highest point of the pile
      let hx = LW / 2, hy = LOSEY + 80;
      for (const b of bodies) if (b.touched && b.y < hy + 60) { hx = b.x; hy = Math.max(LOSEY + 40, b.y); }
      spawnBlackHole(hx, hy, 130, 2.5, true);
    }, () => A.deny());
  });
  $('btnSound').addEventListener('click', () => {
    save.sound = !save.sound;
    A.enabled = save.sound;
    persist();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    A.click();
  });
  // Back to glitchrushgg.com — hidden inside the CrazyGames iframe.
  for (const id of ['btnHome', 'btnHome2']) {
    const b = $(id);
    if (window.self === window.top) b.addEventListener('click', () => { location.href = '/'; });
    else b.classList.add('hidden');
  }
  $('btnShare').addEventListener('click', share);
  async function share() {
    const text = `I reached ${TIERS[Math.max(runMaxTier, discovered)].name} with ${fmtNum(save.best)} pts in MOONDROP 🌙 — can you make the Black Hole?`;
    let url = location.href;
    const cg = await MD.SDK.invite({ best: save.best });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'Moondrop', text, url }); return; } } catch (e) {}
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      const el = $('shareToast');
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1600);
    } catch (e) {}
  }

  /* ================= BOOT + LOOP ================= */
  (async function boot() {
    MD.SDK.loadingStart();
    await MD.SDK.init();
    MD.SDK.loadingStop();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    $('titleBest').textContent = fmtNum(save.best);
    renderLadder();
    updateHUD();
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
})();
