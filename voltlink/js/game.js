/* ============================================================
   VOLTLINK — electric chain-merge score chaser (2248-style).

   Drag a path through adjacent nodes: equal value first, then
   equal-or-double as you go. Release to merge the chain into
   the largest power of 2 ≤ the chain sum.

   Twists:
   • 6+ chains forge a VOLT ORB — wildcard, ×2 chain score.
   • Every link charges the SURGE meter — when full, the next
     merge fires lightning that vaporizes all lowest-tier nodes.
   • Static (dead) cells creep in as score grows — run ends when
     no valid link remains.
   • DAILY CIRCUIT — same seeded board for everyone, share your
     score on today's circuit.

   Pure canvas + DOM HUD + WebAudio. No assets.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = VL.Audio;

  /* ================= CONSTANTS ================= */
  const COLS = 5, ROWS = 7;
  const LW = 480, LH = 720;
  const PITCH = 80, TILE = 70;
  const BX = (LW - COLS * PITCH) / 2;   // board left
  const BY = 150;                        // board top
  const SURGE_CAP = 32;                  // links to arm a surge
  const STATIC_SCORE = 5000;             // static cells start here

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'voltlink_v1';
  const save = { best: 0, sound: true, plays: 0, dailyDay: '', dailyBest: 0, maxTile: 0 };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  A.enabled = save.sound;

  /* ---------- daily seed ---------- */
  function dayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayNum() {
    return Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 86400000) + 1;
  }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ================= CANVAS / LETTERBOX ================= */
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
  const cellX = (c) => BX + c * PITCH + PITCH / 2;
  const cellY = (r) => BY + r * PITCH + PITCH / 2;

  /* ================= STATE ================= */
  const ST = { TITLE: 0, PLAY: 1, OVER: 2 };
  let state = ST.TITLE;
  let mode = 'endless'; // 'endless' | 'daily'
  let rng = Math.random;
  let tt = 0;
  let grid = [];        // grid[c][r] = tile | null
  let chain = [];       // [{c,r}]
  let dragging = false;
  let pointerL = { x: 0, y: 0 };
  let score = 0, meter = 0, surgeArmed = false;
  let streak = 0, lastBigT = -99;
  let hammers = 1, hammerArmed = false;
  let undosLeft = 2, snapshot = null;
  let usedRevive = false;
  let pendingOrb = false;
  let animating = 0;    // tiles still falling
  let particles = [], floats = [], bolts = [], flashA = 0, shake = 0;
  let bannerTxt = '', bannerT = 0;
  let runMaxTile = 0;

  const rand = (a, b) => a + Math.random() * (b - a);

  /* ================= TILES ================= */
  function tileHue(exp) { return (185 + (exp - 1) * 38) % 360; }
  function mkTile(exp) {
    return { v: Math.pow(2, exp), exp, orb: false, static: false, dy: 0, sq: 0 };
  }
  function mkStatic() { return { v: 0, exp: 0, orb: false, static: true, dy: 0, sq: 0 }; }
  function mkOrb() { return { v: 0, exp: 0, orb: true, static: false, dy: 0, sq: 0 }; }

  function minExpOnBoard() {
    let m = 99;
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const t = grid[c][r];
      if (t && !t.static && !t.orb) m = Math.min(m, t.exp);
    }
    return m === 99 ? 1 : m;
  }

  function spawnTile() {
    if (pendingOrb) { pendingOrb = false; return mkOrb(); }
    if (score >= STATIC_SCORE) {
      const p = Math.min(0.16, 0.04 + (score - STATIC_SCORE) / 90000);
      if (rng() < p) return mkStatic();
    }
    const base = minExpOnBoard();
    const w = [4, 3, 2, 2, 1];
    let x = rng() * 12, i = 0;
    for (; i < w.length; i++) { x -= w[i]; if (x <= 0) break; }
    return mkTile(base + Math.min(i, w.length - 1));
  }

  /* ================= RUN LIFECYCLE ================= */
  function startRun(m) {
    mode = m;
    rng = (mode === 'daily') ? mulberry32(parseInt(dayStr().replace(/-/g, ''), 10)) : Math.random;
    grid = [];
    for (let c = 0; c < COLS; c++) {
      grid[c] = [];
      for (let r = 0; r < ROWS; r++) {
        const w = [4, 3, 2, 1];
        let x = rng() * 10, i = 0;
        for (; i < w.length; i++) { x -= w[i]; if (x <= 0) break; }
        const t = mkTile(1 + Math.min(i, 3));
        t.dy = -(PITCH * (ROWS - r) + 80 + r * 14);
        grid[c][r] = t;
      }
    }
    chain = []; dragging = false;
    score = 0; meter = 0; surgeArmed = false;
    streak = 0; lastBigT = -99;
    hammers = 1; hammerArmed = false;
    undosLeft = 2; snapshot = null;
    usedRevive = false; pendingOrb = false;
    particles = []; floats = []; bolts = [];
    runMaxTile = 0;
    state = ST.PLAY;
    save.plays++; persist();
    hide('title'); hide('over'); show('hud');
    updateHUD();
    VL.SDK.gameplayStart();
    A.resume();
  }

  function gameOver() {
    state = ST.OVER;
    A.over();
    VL.SDK.gameplayStop();
    shake = 0.3;
    const final = Math.floor(score);
    let isBest;
    if (mode === 'daily') {
      if (save.dailyDay !== dayStr()) { save.dailyDay = dayStr(); save.dailyBest = 0; }
      isBest = final > save.dailyBest;
      if (isBest) save.dailyBest = final;
    } else {
      isBest = final > save.best;
      if (isBest) save.best = final;
    }
    if (isBest) { A.best(); VL.SDK.happyTime(); confetti(); }
    persist();
    $('overScore').textContent = fmtNum(final);
    $('overBest').textContent = fmtNum(mode === 'daily' ? save.dailyBest : save.best);
    $('overTile').textContent = runMaxTile >= 2 ? fmtNum(runMaxTile) : '—';
    $('overMode').textContent = mode === 'daily' ? 'DAILY CIRCUIT #' + dayNum() : 'ENDLESS';
    $('overNewBest').classList.toggle('hidden', !isBest);
    $('btnRevive').classList.toggle('hidden', usedRevive);
    show('over'); hide('hud');
  }

  /* Revive: clear all static cells + all lowest-tier tiles. */
  function revive() {
    usedRevive = true;
    const low = minExpOnBoard();
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const t = grid[c][r];
      if (t && (t.static || (!t.orb && t.exp === low))) {
        popFx(cellX(c), cellY(r), tileHue(t.exp || 1), 6);
        grid[c][r] = null;
      }
    }
    collapseAndRefill();
    state = ST.PLAY;
    A.revive();
    hide('over'); show('hud');
    VL.SDK.gameplayStart();
    updateHUD();
  }

  function playAgain() {
    VL.SDK.midgameAd(() => startRun(mode));
  }

  /* ================= CHAIN LOGIC ================= */
  function cellFromPointer(px, py) {
    const c = Math.floor((px - BX) / PITCH);
    const r = Math.floor((py - BY) / PITCH);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    // require being reasonably inside the cell (forgiving diagonal drags)
    const dx = px - cellX(c), dy = py - cellY(r);
    if (dx * dx + dy * dy > (PITCH * 0.48) * (PITCH * 0.48)) return null;
    return { c, r };
  }
  const inChain = (c, r) => chain.some(k => k.c === c && k.r === r);
  const adjacent = (a, b) => Math.abs(a.c - b.c) <= 1 && Math.abs(a.r - b.r) <= 1 && !(a.c === b.c && a.r === b.r);

  /* effective value of the chain head (orbs copy the previous value) */
  function headValue() {
    for (let i = chain.length - 1; i >= 0; i--) {
      const t = grid[chain[i].c][chain[i].r];
      if (!t.orb) return t.v;
    }
    return 0; // chain is all orbs (only possible via orb start — disallowed)
  }

  function canLink(cell) {
    const t = grid[cell.c][cell.r];
    if (!t || t.static) return false;
    if (inChain(cell.c, cell.r)) return false;
    const last = chain[chain.length - 1];
    if (!adjacent(last, cell)) return false;
    if (t.orb) return true;
    const hv = headValue();
    if (chain.length === 1) return t.v === hv;
    return t.v === hv || t.v === hv * 2;
  }

  function tryStartChain(cell) {
    const t = grid[cell.c][cell.r];
    if (!t || t.static || t.orb) return;
    chain = [cell];
    dragging = true;
    A.link(0);
    vibrate(8);
  }

  function tryExtend(cell) {
    if (!cell) return;
    // backtrack
    if (chain.length >= 2) {
      const prev = chain[chain.length - 2];
      if (prev.c === cell.c && prev.r === cell.r) {
        chain.pop();
        A.unlink();
        return;
      }
    }
    if (canLink(cell)) {
      chain.push(cell);
      A.link(chain.length - 1);
      vibrate(8);
      if (chain.length >= 6) shake = Math.max(shake, 0.03);
    }
  }

  /* ================= MERGE ================= */
  function releaseChain() {
    dragging = false;
    if (chain.length < 2) { chain = []; return; }

    // snapshot for undo (1-deep)
    snapshot = {
      grid: grid.map(col => col.map(t => t ? { ...t } : null)),
      score, meter, surgeArmed, streak, lastBigT, runMaxTile,
    };

    const len = chain.length;
    let sum = 0, orbUsed = false;
    let lastNonOrbV = 0;
    for (const k of chain) {
      const t = grid[k.c][k.r];
      if (t.orb) { orbUsed = true; sum += lastNonOrbV; }
      else { sum += t.v; lastNonOrbV = t.v; }
    }
    const resultExp = Math.max(1, Math.floor(Math.log2(sum)));
    const resultV = Math.pow(2, resultExp);

    // multipliers
    const lenMult = len >= 6 ? 3 : len === 5 ? 2 : len === 4 ? 1.5 : 1;
    if (len >= 5) {
      streak = (tt - lastBigT < 4) ? streak + 1 : 1;
      lastBigT = tt;
    } else streak = 0;
    const streakMult = Math.min(3, 1 + 0.25 * Math.max(0, streak - 1));
    const orbMult = orbUsed ? 2 : 1;
    const pts = Math.floor(sum * lenMult * streakMult * orbMult);
    score += pts;

    // vaporize all but last cell
    const last = chain[chain.length - 1];
    for (let i = 0; i < chain.length - 1; i++) {
      const k = chain[i];
      const t = grid[k.c][k.r];
      popFx(cellX(k.c), cellY(k.r), t.orb ? 55 : tileHue(t.exp), 5);
      grid[k.c][k.r] = null;
    }
    const nt = mkTile(resultExp);
    nt.sq = 0.6;
    grid[last.c][last.r] = nt;
    runMaxTile = Math.max(runMaxTile, resultV);
    if (resultV > save.maxTile) {
      save.maxTile = resultV; persist();
      if (resultV >= 256) { banner(fmtNum(resultV) + '!'); VL.SDK.happyTime(); }
    }

    addFloat(cellX(last.c), cellY(last.r) - 44,
      '+' + fmtNum(pts) + (streakMult > 1 ? ' ×' + streakMult.toFixed(2).replace(/\.?0+$/, '') : ''));
    A.merge(len);
    if (len >= 6) { shake = Math.max(shake, 0.18); flashA = Math.max(flashA, 0.15); }

    // Volt Orb forging
    if (len >= 6) {
      pendingOrb = true;
      banner('⚡ VOLT ORB FORGED!');
      A.orb();
      flashA = Math.max(flashA, 0.3);
    }

    // surge meter
    if (surgeArmed) {
      doSurge();
      surgeArmed = false;
      meter = 0;
    } else {
      meter += len;
      if (meter >= SURGE_CAP) { meter = SURGE_CAP; surgeArmed = true; banner('SURGE ARMED — next merge!'); }
    }

    chain = [];
    collapseAndRefill();
    updateHUD();
    checkMoves();
  }

  /* Surge: lightning vaporizes every lowest-tier node. */
  function doSurge() {
    const low = minExpOnBoard();
    let gained = 0;
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const t = grid[c][r];
      if (t && !t.static && !t.orb && t.exp === low) {
        gained += t.v;
        bolts.push({ x: cellX(c), y: cellY(r), t: 0.35 });
        popFx(cellX(c), cellY(r), tileHue(t.exp), 8);
        grid[c][r] = null;
      }
    }
    score += gained * 2;
    addFloat(LW / 2, BY - 20, 'SURGE! +' + fmtNum(gained * 2));
    banner('⚡ SURGE! ⚡');
    A.surge();
    VL.SDK.happyTime();
    shake = 0.35; flashA = 0.5;
  }

  /* ================= GRAVITY / REFILL ================= */
  function collapseAndRefill() {
    for (let c = 0; c < COLS; c++) {
      const kept = []; // surviving tiles with their old rows, bottom-first
      for (let r = ROWS - 1; r >= 0; r--) if (grid[c][r]) kept.push({ t: grid[c][r], oldR: r });
      const col = new Array(ROWS).fill(null);
      for (let i = 0; i < kept.length; i++) {
        const r = ROWS - 1 - i;
        const { t, oldR } = kept[i];
        // keep visual continuity: offset relative to the new cell
        if (r !== oldR) t.dy = t.dy - (r - oldR) * PITCH;
        col[r] = t;
      }
      let spawnIdx = 0;
      for (let r = 0; r < ROWS; r++) {
        if (!col[r]) {
          const t = spawnTile();
          t.dy = -(PITCH * (r + 1) + 90 + spawnIdx * 16);
          col[r] = t;
          spawnIdx++;
          if (t.orb) addFloat(cellX(c), cellY(r), '⚡ORB');
        }
      }
      grid[c] = col;
    }
  }

  /* ================= MOVE CHECK ================= */
  function hasMove() {
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const t = grid[c][r];
      if (!t || t.static) continue;
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue;
        const c2 = c + dc, r2 = r + dr;
        if (c2 < 0 || c2 >= COLS || r2 < 0 || r2 >= ROWS) continue;
        const n = grid[c2][r2];
        if (!n || n.static) continue;
        if (t.orb || n.orb) return true;
        if (t.v === n.v) return true;
      }
    }
    return false;
  }
  function checkMoves() {
    if (!hasMove()) setTimeout(gameOver, 450);
  }

  /* ================= BOOSTERS ================= */
  function useHammer(cell) {
    const t = grid[cell.c][cell.r];
    if (!t) return;
    hammers--;
    hammerArmed = false;
    A.hammer();
    popFx(cellX(cell.c), cellY(cell.r), t.static ? 0 : tileHue(t.exp || 1), 12);
    shake = 0.15;
    grid[cell.c][cell.r] = null;
    collapseAndRefill();
    updateHUD();
    checkMoves();
  }

  function doUndo() {
    if (!snapshot || undosLeft <= 0) { A.deny(); return; }
    grid = snapshot.grid.map(col => col.map(t => t ? { ...t } : null));
    score = snapshot.score; meter = snapshot.meter;
    surgeArmed = snapshot.surgeArmed; streak = snapshot.streak;
    lastBigT = snapshot.lastBigT; runMaxTile = snapshot.runMaxTile;
    snapshot = null;
    undosLeft--;
    A.revive();
    updateHUD();
  }

  /* ================= FX ================= */
  function popFx(x, y, hue, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(60, 240);
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
                       life: rand(0.3, 0.6), size: rand(2, 4), hue });
    }
  }
  function confetti() {
    for (let i = 0; i < 60; i++) {
      particles.push({ x: rand(0, LW), y: -10, vx: rand(-40, 40), vy: rand(60, 220),
                       life: rand(1, 2), size: rand(2.5, 5), hue: rand(0, 360) });
    }
  }
  function addFloat(x, y, txt) { floats.push({ x, y, txt, t: 1 }); }
  function banner(txt) { bannerTxt = txt; bannerT = 1.8; }
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

  function updateFx(dt) {
    animating = 0;
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const t = grid[c][r];
      if (!t) continue;
      if (t.dy < 0) {
        t.fallV = (t.fallV || 0) + 3400 * dt;
        t.dy += t.fallV * dt;
        if (t.dy >= 0) { t.dy = 0; t.fallV = 0; t.sq = 0.5; if (Math.random() < 0.3) A.land(); }
        else animating++;
      }
      if (t.sq > 0) t.sq = Math.max(0, t.sq - dt * 4);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 420 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= 44 * dt; f.t -= dt * 0.8;
      if (f.t <= 0) floats.splice(i, 1);
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      bolts[i].t -= dt;
      if (bolts[i].t <= 0) bolts.splice(i, 1);
    }
    if (flashA > 0) flashA -= dt * 2;
    if (shake > 0) shake -= dt;
    if (bannerT > 0) bannerT -= dt;
  }

  /* ================= RENDER ================= */
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // background — dark circuit board
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#070b14');
    g.addColorStop(1, '#0c1322');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // faint pcb traces
    ctx.strokeStyle = 'rgba(56,232,255,.05)';
    ctx.lineWidth = 1.5;
    const tr = 70;
    for (let x = (tt * 6) % tr; x < W; x += tr) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += tr) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);

    // board slots
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      rrect(cellX(c) - TILE / 2, cellY(r) - TILE / 2, TILE, TILE, 14);
      ctx.fillStyle = 'rgba(255,255,255,.035)';
      ctx.fill();
    }

    // chain trail (under tiles)
    if (chain.length > 0) drawTrail();

    // tiles
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const t = grid[c][r];
      if (t) drawTile(t, cellX(c), cellY(r) + t.dy, inChain(c, r));
    }

    // surge bolts
    for (const b of bolts) drawBolt(b);

    // particles (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2.4);
      ctx.fillStyle = `hsl(${p.hue},95%,65%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // floats
    ctx.textAlign = 'center';
    ctx.font = '800 21px "Segoe UI", sans-serif';
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, f.t * 1.6);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#38e8ff'; ctx.shadowBlur = 12;
      ctx.fillText(f.txt, f.x, f.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // banner
    if (bannerT > 0) {
      ctx.globalAlpha = Math.min(1, bannerT * 2, (1.8 - bannerT) * 4);
      ctx.font = '800 28px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd93b';
      ctx.shadowColor = '#ffd93b'; ctx.shadowBlur = 20;
      ctx.fillText(bannerTxt, LW / 2, BY - 26);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // white flash (full screen)
    if (flashA > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, flashA)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawTile(t, x, y, linked) {
    ctx.save();
    ctx.translate(x, y);
    const s = 1 + (linked ? 0.06 : 0) - 0.1 * t.sq;
    ctx.scale(s, 1 - 0.14 * t.sq + (linked ? 0.06 : 0));

    if (t.static) {
      rrect(-TILE / 2, -TILE / 2, TILE, TILE, 14);
      ctx.fillStyle = '#2a3040';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 2; ctx.stroke();
      // cracks
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -18); ctx.lineTo(2, -2); ctx.lineTo(-8, 14);
      ctx.moveTo(12, -10); ctx.lineTo(6, 4); ctx.lineTo(18, 16);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (t.orb) {
      const pulse = 1 + 0.06 * Math.sin(tt * 6);
      ctx.shadowColor = '#ffd93b'; ctx.shadowBlur = 26;
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, TILE * 0.42 * pulse);
      g.addColorStop(0, '#fffbe0');
      g.addColorStop(0.55, '#ffd93b');
      g.addColorStop(1, '#e8930c');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, TILE * 0.42 * pulse, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#7a4a00';
      ctx.font = '800 26px "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 0, 2);
      ctx.restore();
      return;
    }

    const hue = tileHue(t.exp);
    if (t.exp >= 7 || linked) { ctx.shadowColor = `hsl(${hue},95%,60%)`; ctx.shadowBlur = linked ? 22 : 14; }
    rrect(-TILE / 2, -TILE / 2, TILE, TILE, 14);
    const g = ctx.createLinearGradient(0, -TILE / 2, 0, TILE / 2);
    g.addColorStop(0, `hsl(${hue},95%,66%)`);
    g.addColorStop(1, `hsl(${hue},90%,42%)`);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `hsla(${hue},100%,80%,${linked ? 0.95 : 0.35})`;
    ctx.lineWidth = linked ? 3 : 2;
    ctx.stroke();
    // gloss
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    rrect(-TILE / 2 + 5, -TILE / 2 + 4, TILE - 10, TILE * 0.32, 9);
    ctx.fill();
    // value
    ctx.fillStyle = '#fff';
    const fs = t.v >= 10000 ? 19 : t.v >= 1000 ? 22 : 26;
    ctx.font = '800 ' + fs + 'px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 4;
    ctx.fillText(fmtNum(t.v), 0, 1);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawTrail() {
    const pts = chain.map(k => ({ x: cellX(k.c), y: cellY(k.r) }));
    if (dragging) pts.push(pointerL);
    const hv = headValue();
    const hue = hv ? tileHue(Math.log2(hv)) : 55;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, a] of [[16, 0.12], [8, 0.3], [3.5, 0.9]]) {
      ctx.strokeStyle = `hsla(${hue},100%,65%,${a})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // chain sum bubble at pointer
    if (dragging && chain.length >= 2) {
      let sum = 0, lastV = 0;
      for (const k of chain) {
        const t = grid[k.c][k.r];
        if (t.orb) sum += lastV; else { sum += t.v; lastV = t.v; }
      }
      const res = Math.pow(2, Math.max(1, Math.floor(Math.log2(sum))));
      ctx.font = '800 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      const tx = pointerL.x, ty = pointerL.y - 42;
      ctx.fillStyle = 'rgba(7,11,20,.85)';
      const w = ctx.measureText('→ ' + fmtNum(res)).width + 22;
      rrect(tx - w / 2, ty - 15, w, 28, 14);
      ctx.fill();
      ctx.strokeStyle = `hsl(${hue},95%,60%)`;
      ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText('→ ' + fmtNum(res), tx, ty + 5);
    }
  }

  function drawBolt(b) {
    ctx.strokeStyle = `rgba(255,240,140,${Math.min(1, b.t * 4)})`;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#ffd93b'; ctx.shadowBlur = 16;
    ctx.beginPath();
    let x = b.x, y = 0;
    ctx.moveTo(x, y);
    while (y < b.y - 14) {
      y += rand(18, 36);
      x = b.x + rand(-16, 16);
      ctx.lineTo(x, Math.min(y, b.y));
    }
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
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

  /* ================= HUD ================= */
  function fmtNum(n) { return Math.floor(n).toLocaleString('en-US'); }
  function updateHUD() {
    $('score').textContent = fmtNum(score);
    $('best').textContent = fmtNum(mode === 'daily' ? save.dailyBest : save.best);
    $('modeTag').textContent = mode === 'daily' ? 'DAILY #' + dayNum() : 'ENDLESS';
    const pct = (meter / SURGE_CAP * 100).toFixed(0);
    $('surgeFill').style.width = pct + '%';
    $('surgeBar').classList.toggle('armed', surgeArmed);
    $('surgeLabel').textContent = surgeArmed ? 'SURGE READY!' : 'SURGE';
    $('btnHammer').querySelector('b').textContent = '×' + hammers;
    $('btnHammer').classList.toggle('armed', hammerArmed);
    $('btnUndo').querySelector('b').textContent = '×' + undosLeft;
    const sb = $('streakBadge');
    if (streak > 1) {
      sb.classList.remove('hidden');
      sb.textContent = '🔥 STREAK ' + streak;
    } else sb.classList.add('hidden');
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= INPUT ================= */
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .panel')) return;
    A.resume();
    if (state !== ST.PLAY) return;
    const p = toLogical(e.clientX, e.clientY);
    pointerL = p;
    const cell = cellFromPointer(p.x, p.y);
    if (!cell) return;
    if (hammerArmed) { useHammer(cell); return; }
    if (animating > 0) return;
    tryStartChain(cell);
  });
  window.addEventListener('pointermove', (e) => {
    if (state !== ST.PLAY || !dragging) return;
    const p = toLogical(e.clientX, e.clientY);
    pointerL = p;
    tryExtend(cellFromPointer(p.x, p.y));
  });
  window.addEventListener('pointerup', () => {
    if (state !== ST.PLAY) return;
    if (dragging) releaseChain();
  });
  window.addEventListener('pointercancel', () => { dragging = false; chain = []; });

  /* ================= BUTTONS ================= */
  $('btnEndless').addEventListener('click', () => { A.click(); startRun('endless'); });
  $('btnDaily').addEventListener('click', () => { A.click(); startRun('daily'); });
  $('btnRetry').addEventListener('click', () => { A.click(); playAgain(); });
  $('btnHome').addEventListener('click', () => {
    A.click(); hide('over'); show('title'); state = ST.TITLE; refreshTitle();
  });
  $('btnRevive').addEventListener('click', () => {
    VL.SDK.rewardedAd(revive, () => A.deny());
  });
  $('btnHammer').addEventListener('click', () => {
    if (hammers > 0) {
      hammerArmed = !hammerArmed;
      A.click();
      updateHUD();
    } else {
      VL.SDK.rewardedAd(() => { hammers++; hammerArmed = true; updateHUD(); }, () => A.deny());
    }
  });
  $('btnUndo').addEventListener('click', () => {
    if (undosLeft <= 0 || !snapshot) { A.deny(); return; }
    VL.SDK.rewardedAd(doUndo, () => A.deny());
  });
  $('btnSound').addEventListener('click', () => {
    save.sound = !save.sound;
    A.enabled = save.sound;
    persist();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    A.click();
  });
  $('btnShare').addEventListener('click', share);
  async function share() {
    const text = mode === 'daily'
      ? `Daily Circuit #${dayNum()} — ${fmtNum(save.dailyBest)} ⚡ in VOLTLINK. Same board, beat my score!`
      : `I scored ${fmtNum(save.best)} ⚡ in VOLTLINK — chain the current, forge the Volt Orb!`;
    let url = location.href;
    const cg = await VL.SDK.invite({ best: save.best });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'Voltlink', text, url }); return; } } catch (e) {}
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      const el = $('shareToast');
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1600);
    } catch (e) {}
  }

  function refreshTitle() {
    $('titleBest').textContent = fmtNum(save.best);
    $('btnDaily').querySelector('small').textContent =
      'CIRCUIT #' + dayNum() + (save.dailyDay === dayStr() && save.dailyBest > 0
        ? ' · best ' + fmtNum(save.dailyBest) : ' · not played');
  }

  /* ================= BOOT + LOOP ================= */
  let rawLast = performance.now();
  (function boot() {
    // start the game immediately — SDK init runs in the background
    // and must NEVER block gameplay (it can hang on file:// pages)
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    refreshTitle();
    // decorative board behind the title
    rng = Math.random;
    grid = [];
    for (let c = 0; c < COLS; c++) {
      grid[c] = [];
      for (let r = 0; r < ROWS; r++) grid[c][r] = mkTile(1 + ((Math.random() * 4) | 0));
    }
    requestAnimationFrame(loop);
    VL.SDK.init();
  })();

  function loop(now) {
    const dt = Math.min((now - rawLast) / 1000, 0.05);
    rawLast = now;
    tt += dt;
    updateFx(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

  // surface any unexpected runtime error on screen (debug aid)
  window.addEventListener('error', (e) => {
    try {
      const el = $('shareToast');
      el.textContent = '⚠ ' + (e.message || 'unknown error');
      el.classList.add('show');
    } catch (err) {}
  });
})();
