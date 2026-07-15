/* ============================================================
   MERGE FORGE — Block Blast × Triple Town.

   Drag pieces of metal onto the 8×8 forge grid.
   • 3+ connected cells of the same metal SMELT into one cell
     of the next metal (freeing space, cascading).
   • Full rows/columns clear for big points.
   • Forge the ladder: Copper → Bronze → Iron → Silver → Gold
     → Crystal → STARMETAL (jackpot: clears its row + column).
   Run ends when none of the 3 tray pieces fits.

   Pure canvas + WebAudio. No assets, no frameworks.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = MF.Audio;

  /* ================= CONSTANTS ================= */
  const N = 8, CELL = 50;
  const LW = 480, LH = 720;
  const BX = 40, BY = 108;                 // board origin
  const TRAY_Y = 596;                      // tray slots center
  const TRAY_X = [100, 240, 380];
  const LIFT = 70;                         // ghost floats above the finger

  const TIERS = [null,
    { name: 'Copper',    c: '#c97a4a', d: '#8a4e2a' },
    { name: 'Bronze',    c: '#b0913e', d: '#7a6224' },
    { name: 'Iron',      c: '#8d9aa8', d: '#5c6773' },
    { name: 'Silver',    c: '#d7dee8', d: '#98a3b3' },
    { name: 'Gold',      c: '#f5c542', d: '#b58a1b' },
    { name: 'Crystal',   c: '#5fd6d0', d: '#2e8f8a' },
    { name: 'Starmetal', c: '#b47aff', d: '#7a3fe0' },
  ];
  const MAXTIER = 7;

  /* polyomino shapes: [dx,dy] cells; weight = spawn commonness */
  const SHAPES = [
    { cells: [[0,0]], w: 10 },
    { cells: [[0,0],[1,0]], w: 9 },
    { cells: [[0,0],[0,1]], w: 9 },
    { cells: [[0,0],[1,0],[2,0]], w: 7 },
    { cells: [[0,0],[0,1],[0,2]], w: 7 },
    { cells: [[0,0],[1,0],[0,1]], w: 7 },
    { cells: [[0,0],[1,0],[1,1]], w: 7 },
    { cells: [[0,0],[0,1],[1,1]], w: 7 },
    { cells: [[1,0],[0,1],[1,1]], w: 7 },
    { cells: [[0,0],[1,0],[0,1],[1,1]], w: 6 },
    { cells: [[0,0],[1,0],[2,0],[3,0]], w: 4 },
    { cells: [[0,0],[0,1],[0,2],[0,3]], w: 4 },
    { cells: [[0,0],[0,1],[0,2],[1,2]], w: 4 },
    { cells: [[1,0],[1,1],[1,2],[0,2]], w: 4 },
    { cells: [[0,0],[1,0],[2,0],[1,1]], w: 4 },
    { cells: [[1,0],[0,1],[1,1],[2,1]], w: 4 },
    { cells: [[0,0],[1,0],[1,1],[2,1]], w: 3 },
    { cells: [[1,0],[2,0],[0,1],[1,1]], w: 3 },
    { cells: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]], w: 2 },
    { cells: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], w: 1 },
    { cells: [[0,0],[1,0],[2,0],[3,0],[4,0]], w: 1.5 },
    { cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], w: 1.5 },
  ];
  SHAPES.forEach(s => {
    s.w0 = Math.max(...s.cells.map(c => c[0])) + 1;
    s.h0 = Math.max(...s.cells.map(c => c[1])) + 1;
  });

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'mergeForge_v1';
  const save = { best: 0, maxTier: 1, sound: true, plays: 0 };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  A.enabled = save.sound;

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
  const toL = (cx, cy) => ({ x: (cx - offX) / scale, y: (cy - offY) / scale });

  /* ================= STATE ================= */
  let grid = [];            // grid[r][c] = 0 | tier
  let tray = [];            // [{shape,tier,used}]
  let drag = null;          // {slot,x,y}
  let score = 0, streak = 0, cascade = 0;
  let resolveState = null;  // {phase,timer,changed:Set,placed:Set}
  let eventHappened = false;
  let over = false, usedRevive = false;
  let hammerArmed = false;
  let runMaxTier = 1;
  let tt = 0, shake = 0, heartbeat = 0;
  let bannerTxt = '', bannerT = 0, comboTxt = '', comboT = 0;
  const flyers = [], sparks = [], waves = [], floats = [], embers = [];
  const cellPop = {};       // "r,c" -> pop time

  const rand = (a, b) => a + Math.random() * (b - a);
  const key = (r, c) => r + ',' + c;

  /* ================= PIECES ================= */
  function fullness() {
    let n = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c]) n++;
    return n / (N * N);
  }
  function fitsAt(shape, ar, ac) {
    for (const [dx, dy] of shape.cells) {
      const r = ar + dy, c = ac + dx;
      if (r < 0 || r >= N || c < 0 || c >= N || grid[r][c]) return false;
    }
    return true;
  }
  function fitsAnywhere(shape) {
    for (let r = 0; r <= N - shape.h0; r++)
      for (let c = 0; c <= N - shape.w0; c++)
        if (fitsAt(shape, r, c)) return true;
    return false;
  }
  function pickWeighted(list, wOf) {
    const tot = list.reduce((a, x) => a + wOf(x), 0);
    let x = Math.random() * tot;
    for (const it of list) { x -= wOf(it); if (x <= 0) return it; }
    return list[list.length - 1];
  }
  /* tiers on the board that have an adjacent same-tier PAIR (pity targets) */
  function pairTiers() {
    const out = new Set();
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = grid[r][c];
      if (!t) continue;
      if (c + 1 < N && grid[r][c + 1] === t) out.add(t);
      if (r + 1 < N && grid[r + 1][c] === t) out.add(t);
    }
    return [...out];
  }
  function genPiece() {
    const full = fullness();
    let shape;
    if (full > 0.62) {
      // pity: prefer small shapes that actually fit
      const sorted = SHAPES.filter(s => s.cells.length <= 3).concat(SHAPES);
      shape = sorted.find(s => fitsAnywhere(s)) || SHAPES[0];
    } else {
      shape = pickWeighted(SHAPES, s => s.w);
    }
    // tier: 45% chance to offer a tier that completes an existing pair
    let tier;
    const pairs = pairTiers().filter(t => t < MAXTIER);
    if (pairs.length && Math.random() < 0.45) {
      tier = Math.min(pairs[(Math.random() * pairs.length) | 0], 4);
    } else {
      const tw = save.maxTier >= 6 ? [[1, 45], [2, 33], [3, 17], [4, 5]]
               : save.maxTier >= 5 ? [[1, 55], [2, 30], [3, 15]]
               : [[1, 70], [2, 22], [3, 8]];
      tier = pickWeighted(tw, x => x[1])[0];
    }
    return { shape, tier, used: false };
  }
  function refillTray() { tray = [genPiece(), genPiece(), genPiece()]; }

  /* ================= RUN ================= */
  function newRun() {
    grid = Array.from({ length: N }, () => new Array(N).fill(0));
    refillTray();
    score = 0; streak = 0; cascade = 0;
    over = false; usedRevive = false; hammerArmed = false;
    runMaxTier = 1;
    resolveState = null;
    flyers.length = 0; sparks.length = 0; waves.length = 0; floats.length = 0;
    save.plays++; persist();
    hide('overModal');
    updateHUD();
    MF.SDK.gameplayStart();
  }

  /* ================= PLACEMENT ================= */
  function anchorFromPointer(shape, px, py) {
    const gx = px - (shape.w0 * CELL) / 2;
    const gy = py - LIFT - (shape.h0 * CELL) / 2;
    return { ar: Math.round((gy - BY) / CELL), ac: Math.round((gx - BX) / CELL) };
  }

  function place(slot, ar, ac) {
    const p = tray[slot];
    const placed = new Set();
    for (const [dx, dy] of p.shape.cells) {
      grid[ar + dy][ac + dx] = p.tier;
      placed.add(key(ar + dy, ac + dx));
      cellPop[key(ar + dy, ac + dx)] = tt;
    }
    p.used = true;
    A.place();
    eventHappened = false;
    cascade = 0;
    resolveState = { timer: 0.12, changed: placed, placed };
  }

  /* ================= RESOLUTION (merges + lines) ================= */
  function findGroups() {
    const seen = new Set(), groups = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = grid[r][c];
      if (!t || seen.has(key(r, c))) continue;
      const stack = [[r, c]], group = [];
      seen.add(key(r, c));
      while (stack.length) {
        const [rr, cc] = stack.pop();
        group.push([rr, cc]);
        for (const [nr, nc] of [[rr - 1, cc], [rr + 1, cc], [rr, cc - 1], [rr, cc + 1]]) {
          if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
          if (grid[nr][nc] !== t || seen.has(key(nr, nc))) continue;
          seen.add(key(nr, nc));
          stack.push([nr, nc]);
        }
      }
      if (group.length >= 3) groups.push({ tier: t, cells: group });
    }
    return groups;
  }

  const streakMult = () => Math.min(4, 1 + 0.5 * Math.max(0, streak - 1));
  const cellCx = (c) => BX + c * CELL + CELL / 2;
  const cellCy = (r) => BY + r * CELL + CELL / 2;

  function runResolveStep() {
    const changed = resolveState.changed;

    /* ---- phase 1: smelt groups ---- */
    const groups = findGroups();
    if (groups.length) {
      const newChanged = new Set();
      for (const g of groups) {
        // target: prefer a just-changed cell inside the group
        let target = g.cells.find(([r, c]) => changed.has(key(r, c))) || g.cells[0];
        const [tr, tc] = target;
        const nt = g.tier + 1;
        for (const [r, c] of g.cells) {
          if (r === tr && c === tc) continue;
          flyers.push({ x0: cellCx(c), y0: cellCy(r), x1: cellCx(tc), y1: cellCy(tr), t: 0, tier: g.tier });
          grid[r][c] = 0;
        }
        grid[tr][tc] = nt;
        cellPop[key(tr, tc)] = tt + 0.18;
        newChanged.add(key(tr, tc));
        burst(cellCx(tc), cellCy(tr), 8 + nt * 3, TIERS[nt].c);

        const pts = Math.floor(15 * Math.pow(3, nt - 1) * streakMult());
        score += pts;
        addFloat(cellCx(tc), cellCy(tr) - 30, '+' + fmt(pts));
        A.smelt(nt);
        if (cascade > 0) A.chain(cascade);
        shake = Math.max(shake, 0.05 + nt * 0.03);

        if (nt > runMaxTier) runMaxTier = nt;
        if (nt > save.maxTier) {
          save.maxTier = nt; persist();
          banner(TIERS[nt].name.toUpperCase() + ' FORGED!');
        }

        /* Starmetal jackpot: clears its row + column */
        if (nt === MAXTIER) {
          const jack = Math.floor(5000 * streakMult());
          score += jack;
          banner('★ STARMETAL! +' + fmt(jack));
          A.star();
          MF.SDK.happyTime();
          shake = 0.5;
          for (let c = 0; c < N; c++) if (grid[tr][c] && c !== tc) { score += 5 * Math.pow(2, grid[tr][c]); burst(cellCx(c), cellCy(tr), 6, TIERS[grid[tr][c]].c); grid[tr][c] = 0; }
          for (let r = 0; r < N; r++) if (grid[r][tc] && r !== tr) { score += 5 * Math.pow(2, grid[r][tc]); burst(cellCx(tc), cellCy(r), 6, TIERS[grid[r][tc]].c); grid[r][tc] = 0; }
          waves.push({ row: tr, t: 0 }); waves.push({ col: tc, t: 0 });
        }
      }
      eventHappened = true;
      cascade++;
      if (cascade >= 2) { comboTxt = 'FORGE ×' + cascade; comboT = 1.2; }
      resolveState = { timer: 0.26, changed: newChanged, placed: resolveState.placed };
      return;
    }

    /* ---- phase 2: line clears ---- */
    const fullRows = [], fullCols = [];
    for (let r = 0; r < N; r++) if (grid[r].every(v => v > 0)) fullRows.push(r);
    for (let c = 0; c < N; c++) { let f = true; for (let r = 0; r < N; r++) if (!grid[r][c]) f = false; if (f) fullCols.push(c); }
    const nLines = fullRows.length + fullCols.length;
    if (nLines) {
      const lineMult = nLines >= 3 ? 8 : nLines === 2 ? 4 : 2;
      let pts = 0;
      const cleared = new Set();
      for (const r of fullRows) for (let c = 0; c < N; c++) cleared.add(key(r, c));
      for (const c of fullCols) for (let r = 0; r < N; r++) cleared.add(key(r, c));
      for (const k of cleared) {
        const [r, c] = k.split(',').map(Number);
        pts += 5 * Math.pow(2, grid[r][c]);
        burst(cellCx(c), cellCy(r), 4, TIERS[grid[r][c]] ? TIERS[grid[r][c]].c : '#fff');
        grid[r][c] = 0;
      }
      pts = Math.floor(pts * lineMult * streakMult());
      score += pts;
      addFloat(LW / 2, BY + 4 * CELL, '+' + fmt(pts) + (nLines > 1 ? '  ×' + lineMult : ''));
      for (const r of fullRows) waves.push({ row: r, t: 0 });
      for (const c of fullCols) waves.push({ col: c, t: 0 });
      A.line(nLines);
      shake = Math.max(shake, 0.12 + nLines * 0.06);
      eventHappened = true;
      resolveState = { timer: 0.26, changed: new Set(), placed: resolveState.placed };
      return;
    }

    /* ---- done ---- */
    resolveState = null;
    streak = eventHappened ? streak + 1 : 0;
    if (streak >= 2) { comboTxt = 'STREAK ×' + streak; comboT = 1.4; }
    if (tray.every(p => p.used)) refillTray();
    updateHUD();
    checkGameOver();
  }

  /* ================= GAME OVER / REVIVE ================= */
  function anyMoveLeft() {
    return tray.some(p => !p.used && fitsAnywhere(p.shape));
  }
  function checkGameOver() {
    if (anyMoveLeft()) return;
    over = true;
    A.over();
    MF.SDK.gameplayStop();
    const final = Math.floor(score);
    const isBest = final > save.best;
    if (isBest) { save.best = final; A.best(); MF.SDK.happyTime(); }
    persist();
    $('ovScore').textContent = fmt(final);
    $('ovBest').textContent = fmt(save.best);
    $('ovMetal').textContent = TIERS[runMaxTier].name;
    $('ovMetal').style.color = TIERS[runMaxTier].c;
    $('ovNewBest').classList.toggle('hidden', !isBest);
    $('btnRevive').classList.toggle('hidden', usedRevive);
    show('overModal');
  }
  function revive() {
    usedRevive = true;
    over = false;
    for (let r = N - 3; r < N; r++) for (let c = 0; c < N; c++) {
      if (grid[r][c]) burst(cellCx(c), cellCy(r), 3, TIERS[grid[r][c]].c);
      grid[r][c] = 0;
    }
    refillTray();
    hide('overModal');
    A.revive();
    shake = 0.25;
    updateHUD();
    MF.SDK.gameplayStart();
  }

  /* ================= FX ================= */
  function burst(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(50, 230);
      sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
                    life: rand(0.3, 0.65), size: rand(2, 4), col });
    }
  }
  function addFloat(x, y, txt) {
    if (floats.length > 10) floats.shift();
    floats.push({ x, y, txt, t: 1 });
  }
  function banner(txt) { bannerTxt = txt; bannerT = 2; }

  function updateFx(dt) {
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i];
      f.t += dt * 5.5;
      if (f.t >= 1) flyers.splice(i, 1);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.vy += 420 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) sparks.splice(i, 1);
    }
    for (let i = waves.length - 1; i >= 0; i--) {
      waves[i].t += dt * 2.4;
      if (waves[i].t >= 1) waves.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= 38 * dt; f.t -= dt * 0.85;
      if (f.t <= 0) floats.splice(i, 1);
    }
    // ambient embers
    if (embers.length < 26 && Math.random() < 0.3)
      embers.push({ x: rand(0, LW), y: LH + 10, v: rand(14, 40), s: rand(1.2, 3), o: rand(0, 6) });
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.y -= e.v * dt;
      if (e.y < -10) embers.splice(i, 1);
    }
    if (shake > 0) shake -= dt;
    if (bannerT > 0) bannerT -= dt;
    if (comboT > 0) comboT -= dt;
  }

  /* ================= UPDATE ================= */
  function update(dt) {
    tt += dt;
    updateFx(dt);
    if (resolveState) {
      resolveState.timer -= dt;
      if (resolveState.timer <= 0) runResolveStep();
    }
    const full = fullness();
    heartbeat = full > 0.75 ? Math.min(1, heartbeat + dt * 2) : Math.max(0, heartbeat - dt * 2);
  }

  /* ================= RENDER ================= */
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // forge background
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#17120e');
    g.addColorStop(0.75, '#241812');
    g.addColorStop(1, '#38200f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // bottom furnace glow
    const fg = ctx.createRadialGradient(W / 2, H + 60, 0, W / 2, H + 60, H * 0.55);
    fg.addColorStop(0, 'rgba(255,120,30,.22)');
    fg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 13, rand(-1, 1) * shake * 13);

    // embers
    for (const e of embers) {
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(tt * 3 + e.o);
      ctx.fillStyle = '#ff9d4d';
      ctx.beginPath(); ctx.arc(e.x + Math.sin(tt + e.o) * 8, e.y, e.s, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawBoard();
    drawTray();
    if (drag) drawDrag();

    // flyers (smelt suck-in)
    for (const f of flyers) {
      const t = f.t, x = f.x0 + (f.x1 - f.x0) * t, y = f.y0 + (f.y1 - f.y0) * t;
      const s = (1 - t) * 18 + 4;
      ctx.globalAlpha = 1 - t * 0.4;
      drawMetalRect(x - s / 2, y - s / 2, s, s, f.tier, 4);
      ctx.globalAlpha = 1;
    }

    // sparks
    ctx.globalCompositeOperation = 'lighter';
    for (const p of sparks) {
      ctx.globalAlpha = Math.min(1, p.life * 2.4);
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // molten line waves
    for (const w of waves) {
      const t = w.t;
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.fillStyle = '#ffca5f';
      ctx.shadowColor = '#ff9d4d'; ctx.shadowBlur = 18;
      if (w.row !== undefined) {
        const y = BY + w.row * CELL;
        ctx.fillRect(BX + (N * CELL) * t - 40, y + 4, 80, CELL - 8);
      } else {
        const x = BX + w.col * CELL;
        ctx.fillRect(x + 4, BY + (N * CELL) * t - 40, CELL - 8, 80);
      }
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // floats
    ctx.textAlign = 'center';
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, f.t * 1.5);
      ctx.font = '800 18px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd88a';
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 4;
      ctx.fillText(f.txt, f.x, f.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // combo text
    if (comboT > 0) {
      ctx.globalAlpha = Math.min(1, comboT * 2);
      ctx.font = '800 30px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ff9d4d';
      ctx.shadowColor = '#ff9d4d'; ctx.shadowBlur = 16;
      ctx.fillText(comboTxt, LW / 2, BY - 14);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    // banner
    if (bannerT > 0) {
      ctx.globalAlpha = Math.min(1, bannerT * 2, (2 - bannerT) * 3);
      ctx.font = '800 26px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd88a';
      ctx.shadowColor = '#ffd88a'; ctx.shadowBlur = 20;
      ctx.fillText(bannerTxt, LW / 2, BY + N * CELL + 40);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // near-death heartbeat vignette
    if (heartbeat > 0.02) {
      const pulse = 0.5 + 0.5 * Math.sin(tt * 5);
      ctx.strokeStyle = `rgba(255,60,40,${0.35 * heartbeat * pulse})`;
      ctx.lineWidth = 14;
      ctx.strokeRect(BX - 6, BY - 6, N * CELL + 12, N * CELL + 12);
    }

    ctx.restore();
  }

  function drawBoard() {
    // frame
    ctx.fillStyle = '#0f0c09';
    rrect(BX - 8, BY - 8, N * CELL + 16, N * CELL + 16, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,157,77,.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // slots
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const x = BX + c * CELL, y = BY + r * CELL;
      ctx.fillStyle = 'rgba(255,255,255,.035)';
      rrect(x + 2.5, y + 2.5, CELL - 5, CELL - 5, 7);
      ctx.fill();
      const t = grid[r][c];
      if (t) {
        const pop = cellPop[key(r, c)];
        let sc = 1;
        if (pop !== undefined) {
          const age = tt - pop;
          if (age < 0) sc = 0;
          else if (age < 0.22) sc = 0.55 + 0.45 * (age / 0.22) + 0.12 * Math.sin(age / 0.22 * Math.PI);
          else delete cellPop[key(r, c)];
        }
        if (sc > 0) {
          const pad = 3 + (1 - sc) * CELL * 0.5;
          drawMetalRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, t, 8);
        }
      }
    }
  }

  /* metallic cell: gradient + bevel + shine sweep on high tiers */
  function drawMetalRect(x, y, w, h, tier, rad) {
    const T = TIERS[tier];
    if (!T || w <= 0) return;
    if (tier >= 6) { ctx.shadowColor = T.c; ctx.shadowBlur = 12; }
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, T.c);
    g.addColorStop(1, T.d);
    ctx.fillStyle = g;
    rrect(x, y, w, h, rad);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // top bevel
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    rrect(x + 2, y + 2, w - 4, h * 0.28, rad * 0.7);
    ctx.fill();
    // shine sweep for precious metals
    if (tier >= 5 && w > 20) {
      const sw = ((tt * 60 + x + y) % 300) / 300 * (w + 40) - 20;
      ctx.save();
      rrect(x, y, w, h, rad); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.beginPath();
      ctx.moveTo(x + sw, y); ctx.lineTo(x + sw + 10, y);
      ctx.lineTo(x + sw - 8, y + h); ctx.lineTo(x + sw - 18, y + h);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // tier stamp
    if (w > 26) {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.font = '800 ' + Math.max(9, w * 0.24) + 'px "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tier, x + w / 2, y + h / 2 + 1);
    }
  }

  function drawTray() {
    for (let i = 0; i < 3; i++) {
      const p = tray[i];
      // slot base
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      rrect(TRAY_X[i] - 62, TRAY_Y - 56, 124, 112, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,157,77,.15)';
      ctx.lineWidth = 1.5; ctx.stroke();
      if (!p || p.used || (drag && drag.slot === i)) continue;
      drawPiece(p, TRAY_X[i], TRAY_Y, 0.52, 1);
      // can't-fit dim
      if (!fitsAnywhere(p.shape)) {
        ctx.fillStyle = 'rgba(20,10,5,.55)';
        rrect(TRAY_X[i] - 62, TRAY_Y - 56, 124, 112, 14);
        ctx.fill();
      }
    }
  }

  function drawPiece(p, cx2, cy2, s, alpha) {
    const w = p.shape.w0 * CELL * s, h = p.shape.h0 * CELL * s;
    ctx.globalAlpha = alpha;
    for (const [dx, dy] of p.shape.cells) {
      drawMetalRect(cx2 - w / 2 + dx * CELL * s + 2 * s, cy2 - h / 2 + dy * CELL * s + 2 * s,
                    CELL * s - 4 * s, CELL * s - 4 * s, p.tier, 7 * s);
    }
    ctx.globalAlpha = 1;
  }

  function drawDrag() {
    const p = tray[drag.slot];
    const { ar, ac } = anchorFromPointer(p.shape, drag.x, drag.y);
    const ok = fitsAt(p.shape, ar, ac);
    // ghost on board
    if (ar > -3 && ac > -3 && ar < N + 2 && ac < N + 2) {
      for (const [dx, dy] of p.shape.cells) {
        const r = ar + dy, c = ac + dx;
        if (r < 0 || r >= N || c < 0 || c >= N) continue;
        ctx.fillStyle = ok ? 'rgba(80,230,120,.3)' : 'rgba(255,70,60,.3)';
        rrect(BX + c * CELL + 3, BY + r * CELL + 3, CELL - 6, CELL - 6, 7);
        ctx.fill();
      }
    }
    // lifted piece
    drawPiece(p, drag.x, drag.y - LIFT, 1, 0.92);
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
  function updateHUD() {
    $('score').textContent = fmt(Math.floor(score));
    $('best').textContent = 'BEST ' + fmt(save.best);
    const sb = $('streakChip');
    if (streak >= 2) { sb.classList.remove('hidden'); sb.textContent = '🔥 ×' + streak; }
    else sb.classList.add('hidden');
    const mm = $('metalChip');
    mm.textContent = TIERS[Math.max(runMaxTier, 1)].name;
    mm.style.color = TIERS[Math.max(runMaxTier, 1)].c;
  }
  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= INPUT ================= */
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .panel')) return;
    A.resume();
    if (over) return;
    const p = toL(e.clientX, e.clientY);

    // hammer mode: smash a board cell
    if (hammerArmed) {
      const c = Math.floor((p.x - BX) / CELL), r = Math.floor((p.y - BY) / CELL);
      if (r >= 0 && r < N && c >= 0 && c < N && grid[r][c]) {
        burst(cellCx(c), cellCy(r), 12, TIERS[grid[r][c]].c);
        grid[r][c] = 0;
        hammerArmed = false;
        $('btnHammer').classList.remove('armed');
        A.hammer();
        shake = 0.15;
        checkGameOver();
      }
      return;
    }

    if (resolveState) return; // wait for the forge to settle
    // pick a tray piece
    for (let i = 0; i < 3; i++) {
      const pc = tray[i];
      if (!pc || pc.used) continue;
      if (Math.abs(p.x - TRAY_X[i]) < 62 && Math.abs(p.y - TRAY_Y) < 58) {
        drag = { slot: i, x: p.x, y: p.y };
        A.pick();
        return;
      }
    }
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toL(e.clientX, e.clientY);
    drag.x = p.x; drag.y = p.y;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const p = tray[drag.slot];
    const { ar, ac } = anchorFromPointer(p.shape, drag.x, drag.y);
    if (fitsAt(p.shape, ar, ac)) place(drag.slot, ar, ac);
    else if (drag.y < TRAY_Y - 80) A.invalid();
    drag = null;
  });
  window.addEventListener('pointercancel', () => drag = null);

  /* ================= BUTTONS ================= */
  $('btnReroll').addEventListener('click', () => {
    MF.SDK.rewardedAd(() => {
      tray = tray.map(p => (p && !p.used) ? genPiece() : p);
      if (tray.every(p => !p || p.used)) refillTray();
      A.revive();
      banner('FRESH METAL!');
      checkGameOver();
    }, () => A.deny());
  });
  $('btnHammer').addEventListener('click', () => {
    if (hammerArmed) { hammerArmed = false; $('btnHammer').classList.remove('armed'); return; }
    MF.SDK.rewardedAd(() => {
      hammerArmed = true;
      $('btnHammer').classList.add('armed');
      banner('TAP A CELL TO SMASH');
    }, () => A.deny());
  });
  $('btnRevive').addEventListener('click', () => {
    MF.SDK.rewardedAd(revive, () => A.deny());
  });
  $('btnAgain').addEventListener('click', () => {
    A.click();
    MF.SDK.midgameAd(newRun);
  });
  $('btnSound').addEventListener('click', () => {
    save.sound = !save.sound;
    A.enabled = save.sound;
    persist();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    A.click();
  });
  $('btnShare').addEventListener('click', share);
  $('btnShare2').addEventListener('click', share);
  async function share() {
    const text = `I forged ${TIERS[Math.max(runMaxTier, 1)].name.toUpperCase()} with ${fmt(save.best)} pts in MERGE FORGE 🔥 — place, smelt, clear. Beat it!`;
    let url = location.href;
    const cg = await MF.SDK.invite({ best: save.best });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'Merge Forge', text, url }); return; } } catch (e) {}
    try { await navigator.clipboard.writeText(text + ' ' + url); banner('COPIED — CHALLENGE A FRIEND!'); } catch (e) {}
  }

  /* ================= BOOT + LOOP ================= */
  let rawLast = performance.now();
  (function boot() {
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    newRun();
    requestAnimationFrame(loop);
    MF.SDK.init().then(() => MF.SDK.gameplayStart());
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
  window.addEventListener('error', (e) => {
    try { banner('⚠ ' + (e.message || 'error')); } catch (err) {}
  });
})();
