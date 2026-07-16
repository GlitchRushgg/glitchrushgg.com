/* ============================================================
   COREBREAK: IDLE BALL MINING
   Bouncy balls trapped in a mine shaft pulverize rock, the
   world scrolls down, and DEPTH (m) is the score. Biomes shift
   every 50 m; bedrock boss plates guard each biome; ore veins
   pay multipliers. Prestige melts your run into Core Fragments
   (+10% damage & coins each, forever).

   Idle Breakout's watchable active/passive engine + an infinite
   legible metric. Pure canvas + WebAudio, zero assets.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = CB.Audio;

  /* ================= BALANCE ================= */
  const COLS = 8;
  const LW = 480;                 // logical width (u = width/480)
  const TW = 55, TH = 36;         // tile size in logical units
  const SX0 = 20;                 // shaft left wall
  const BOSS_EVERY = 50;
  const MAX_BALLS = 60;

  const tileHP    = (row) => 10 * Math.pow(1.17, row);
  const tileCoins = (row) => 4 * Math.pow(1.14, row);
  const fragsFor  = (depth) => Math.floor(Math.pow(depth / 50, 1.5));

  const BALLS = [
    { id: 'basic',   name: 'Steel Ball',  dmg: 1,  speed: 250, cost: 50,     hue: 200, desc: 'Honest bouncing rock-breaker' },
    { id: 'heavy',   name: 'Wrecker',     dmg: 8,  speed: 160, cost: 500,    hue: 25,  desc: 'Slow, hits like a truck' },
    { id: 'splash',  name: 'Bomber',      dmg: 3,  speed: 230, cost: 3000,   hue: 110, desc: 'Splash damage to neighbors' },
    { id: 'driller', name: 'Driller',     dmg: 4,  speed: 210, cost: 20000,  hue: 45,  desc: '×3 damage straight down' },
    { id: 'gold',    name: 'Gold Ball',   dmg: 2,  speed: 260, cost: 100000, hue: 50,  desc: '×3 coins from its kills' },
    { id: 'plasma',  name: 'Plasma Orb',  dmg: 12, speed: 330, cost: 1e6,   hue: 185, desc: 'Chain-zaps nearby tiles' },
  ];

  const BIOMES = [
    { name: 'Topsoil',       face: '#8a5f36', dark: '#5c3d1e', edge: '#a97d4b', bg0: '#241a10', bg1: '#3a2a18' },
    { name: 'Stone Depths',  face: '#7d8794', dark: '#525a66', edge: '#9aa5b3', bg0: '#171b21', bg1: '#262c35' },
    { name: 'Crystal Caves', face: '#5fb8b0', dark: '#35706e', edge: '#8ee6dd', bg0: '#0e2226', bg1: '#173a3e' },
    { name: 'Magma Core',    face: '#b0533a', dark: '#6e2c1c', edge: '#e8794f', bg0: '#230f0a', bg1: '#3d1a10' },
    { name: 'The Void',      face: '#5b4a8a', dark: '#332757', edge: '#8f79d6', bg0: '#0d0a1a', bg1: '#1c1433' },
  ];
  const biomeOf = (row) => BIOMES[Math.min(BIOMES.length - 1, Math.floor(row / BOSS_EVERY))];

  const META = [
    { id: 'startballs', name: 'Starting Crew',  desc: '+1 Steel Ball at run start', costs: [1, 3, 8, 15] },
    { id: 'headstart',  name: 'Head Start',     desc: 'Begin runs 25m deeper each rank', costs: [10, 40, 150] },
    { id: 'offline',    name: 'Night Shift',    desc: 'Offline cap 8h → 12h → 24h', costs: [5, 25, 100] },
    { id: 'orerate',    name: 'Prospector',     desc: '+2% ore vein chance per rank', costs: [8, 8, 8, 8, 8] },
    { id: 'autobuy',    name: 'Auto-Foreman',   desc: 'Auto-buys Steel Balls for you', costs: [50] },
  ];

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'coreBreak_v1';
  const save = {
    coins: 0, fragsTotal: 0, fragsSpend: 0,
    balls: {}, power: {},                       // per ball type
    upTap: 0, upSpeed: 0, upCoin: 0,
    meta: {},                                   // metaId -> rank
    depth: 0, bestDepth: 0,
    cps: 0, lastSeen: Date.now(),
    boostUntil: 0, boostChain: 0,
    sound: true, plays: 0,
  };
  BALLS.forEach(b => { save.balls[b.id] = 0; save.power[b.id] = 0; });
  META.forEach(m => { save.meta[m.id] = 0; });
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  function persist() {
    save.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  A.enabled = save.sound;

  /* ================= DERIVED STATS ================= */
  const prestigeMult = () => 1 + 0.10 * save.fragsTotal;
  const boostMult    = () => Date.now() < save.boostUntil ? 2 : 1;
  const tapDmg   = () => 2 * Math.pow(1.5, save.upTap) * prestigeMult();
  const coinMult = () => (1 + 0.15 * save.upCoin) * prestigeMult() * boostMult();
  const speedMult = () => 1 + 0.08 * save.upSpeed;
  const ballDmg  = (t) => t.dmg * Math.pow(1.5, save.power[t.id]) * prestigeMult();
  const oreChance = () => 0.08 + 0.02 * save.meta.orerate;
  const offlineCapH = () => [8, 12, 24, 24][save.meta.offline] || 8;
  const totalBalls = () => Object.values(save.balls).reduce((a, b) => a + b, 0);

  const ballCost = (t) => Math.ceil(t.cost * Math.pow(1.45, save.balls[t.id]));
  const powerCost = (t) => Math.ceil(t.cost * 0.8 * Math.pow(1.6, save.power[t.id]));
  const tapCost  = () => Math.ceil(20 * Math.pow(1.7, save.upTap));
  const speedCost = () => Math.ceil(200 * Math.pow(1.8, save.upSpeed));
  const coinCost = () => Math.ceil(500 * Math.pow(1.75, save.upCoin));

  /* ================= CANVAS ================= */
  const cv = $('game'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, u = 1;
  function resize() {
    const r = cv.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    u = W / LW;
  }

  /* ================= WORLD ================= */
  let rows = {};          // row -> boss {boss,hp,max} | array of COLS tiles/null
  let topIntact = 0;      // first row with anything alive = depth in meters
  let deepestDig = 0;     // deepest row where a tile was destroyed
  let genTo = -1;
  let camY = 0;           // world y of viewport top (logical units)
  let balls = [];
  let particles = [], floats = [];
  let shake = 0, bannerTxt = '', bannerT = 0, lastBiome = -1;
  let bossOnScreen = null, bossSince = 0;
  let tt = 0;
  let coinsThisSec = 0, cpsTimer = 0;
  let tapping = false, tapPos = { x: 0, y: 0 }, tapCd = 0;
  let autoTimer = 0;

  const rowY = (r) => r * TH; // world y of row top
  const rand = (a, b) => a + Math.random() * (b - a);

  function genRow(r) {
    if (r % BOSS_EVERY === 0 && r > 0) {
      rows[r] = { boss: true, hp: tileHP(r) * 20, max: tileHP(r) * 20 };
      return;
    }
    const arr = [];
    for (let c = 0; c < COLS; c++) {
      let ore = null;
      const roll = Math.random();
      if (r >= 150 && roll < 0.015) ore = 'void';
      else if (r >= 75 && roll < 0.03 + 0.015) ore = 'ruby';
      else if (roll < oreChance()) ore = 'gold';
      arr.push({ hp: tileHP(r), max: tileHP(r), ore });
    }
    rows[r] = arr;
  }
  function ensureRows(to) {
    while (genTo < to) { genTo++; genRow(genTo); }
  }
  function rowCleared(r) {
    const row = rows[r];
    if (!row) return true;
    if (row.boss) return row.hp <= 0;
    return row.every(t => !t || t.hp <= 0);
  }
  function advanceDepth() {
    let moved = false;
    while (rowCleared(topIntact)) {
      delete rows[topIntact - 6]; // keep a small buffer behind
      topIntact++;
      moved = true;
    }
    if (moved) {
      save.depth = topIntact;
      if (topIntact > save.bestDepth) save.bestDepth = topIntact;
      const b = Math.min(BIOMES.length - 1, Math.floor(topIntact / BOSS_EVERY));
      if (b !== lastBiome) {
        lastBiome = b;
        banner(BIOMES[b].name.toUpperCase() + ' — ' + topIntact + 'm');
        A.biome();
      } else if (topIntact % 25 === 0) banner(topIntact + 'm!');
      updateHUD();
    }
  }

  /* ================= BALLS ================= */
  function spawnBall(typeId) {
    const t = BALLS.find(b => b.id === typeId);
    const a = rand(0.6, 2.5);
    balls.push({
      t, x: rand(SX0 + 20, LW - SX0 - 20), y: camY + rand(30, 90),
      vx: Math.cos(a), vy: Math.sin(a), trail: [],
    });
  }
  function syncBalls() {
    balls = [];
    for (const b of BALLS) {
      const n = Math.min(save.balls[b.id], MAX_BALLS);
      for (let i = 0; i < n; i++) spawnBall(b.id);
    }
  }

  /* ================= DAMAGE / ECONOMY ================= */
  function earn(amount, x, y, big) {
    save.coins += amount;
    coinsThisSec += amount;
    if (x !== undefined) addFloat(x, y, '+' + fmt(amount), big);
  }

  function damageTile(r, c, dmg, fromGold) {
    const row = rows[r];
    if (!row) return false;
    if (row.boss) {
      if (row.hp <= 0) return false;
      row.hp -= dmg;
      A.plink();
      if (row.hp <= 0) {
        // BOSS CHEST
        const reward = tileCoins(r) * 60 * coinMult();
        earn(reward, LW / 2, rowY(r) - camY, true);
        save.fragsTotal++; save.fragsSpend++;
        addFloat(LW / 2, rowY(r) - camY - 26, '+1 ◆ FRAGMENT', true);
        burst(LW / 2, rowY(r) + TH / 2 - camY, 40, 50);
        shake = 0.4;
        banner('BEDROCK SHATTERED!');
        A.bossDie();
        CB.SDK.happyTime();
        advanceDepth();
        renderPanel();
      } else if (Math.random() < 0.1) A.boss();
      return true;
    }
    const t = row[c];
    if (!t || t.hp <= 0) return false;
    t.hp -= dmg;
    A.plink();
    if (t.hp <= 0) {
      deepestDig = Math.max(deepestDig, r);
      let coins = tileCoins(r) * coinMult();
      if (t.ore === 'gold') coins *= 10;
      else if (t.ore === 'ruby') coins *= 25;
      else if (t.ore === 'void') coins *= 100;
      if (fromGold) coins *= 3;
      const bio = biomeOf(r);
      burstTile(c, r, bio, t.ore);
      earn(coins, SX0 + c * TW + TW / 2, rowY(r) - camY, !!t.ore);
      if (t.ore) A.ore(); else A.crumble();
      advanceDepth();
      return true;
    }
    return true;
  }

  /* ================= PHYSICS ================= */
  function updateBalls(dt) {
    const ceil = camY + 2;
    for (const b of balls) {
      const sp = b.t.speed * speedMult();
      b.x += b.vx * sp * dt;
      b.y += b.vy * sp * dt;

      // walls
      if (b.x < SX0 + 7) { b.x = SX0 + 7; b.vx = Math.abs(b.vx); }
      if (b.x > LW - SX0 - 7) { b.x = LW - SX0 - 7; b.vx = -Math.abs(b.vx); }
      if (b.y < ceil + 7) { b.y = ceil + 7; b.vy = Math.abs(b.vy); }
      // safety: fell far below view → recycle above terrain
      if (b.y > camY + H / u + 200) { b.y = camY + 40; b.x = rand(SX0 + 20, LW - SX0 - 20); }

      // tile collisions (check neighborhood)
      const r0 = Math.max(topIntact, Math.floor((b.y - 10) / TH));
      const r1 = Math.floor((b.y + 10) / TH) + 1;
      for (let r = r0; r <= r1; r++) {
        const row = rows[r];
        if (!row) continue;
        if (row.boss) {
          if (row.hp <= 0) continue;
          const ty = rowY(r);
          if (b.y + 7 > ty && b.y - 7 < ty + TH) {
            // hit the plate from above/below
            b.vy = b.y < ty + TH / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
            b.y = b.y < ty + TH / 2 ? ty - 7 : ty + TH + 7;
            damageTile(r, 0, ballDmg(b.t));
            hitFx(b);
          }
          continue;
        }
        const c0 = Math.max(0, Math.floor((b.x - SX0 - 10) / TW));
        const c1 = Math.min(COLS - 1, Math.floor((b.x - SX0 + 10) / TW));
        for (let c = c0; c <= c1; c++) {
          const t = row[c];
          if (!t || t.hp <= 0) continue;
          const tx = SX0 + c * TW, ty = rowY(r);
          // circle vs AABB
          const nx = Math.max(tx, Math.min(b.x, tx + TW));
          const ny = Math.max(ty, Math.min(b.y, ty + TH));
          const dx = b.x - nx, dy = b.y - ny;
          if (dx * dx + dy * dy > 49) continue;

          // resolve: push out along dominant axis
          if (Math.abs(dx) > Math.abs(dy)) {
            b.vx = dx >= 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
            b.x = nx + (dx >= 0 ? 7.2 : -7.2);
          } else {
            b.vy = dy >= 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
            b.y = ny + (dy >= 0 ? 7.2 : -7.2);
          }

          let dmg = ballDmg(b.t);
          if (b.t.id === 'driller' && dy < 0) dmg *= 3; // smashing downward
          damageTile(r, c, dmg, b.t.id === 'gold');
          hitFx(b);

          // specials
          if (b.t.id === 'splash') {
            for (const [oc, or] of [[c - 1, r], [c + 1, r], [c, r + 1]])
              if (oc >= 0 && oc < COLS) damageTile(or, oc, dmg * 0.5, false);
          }
          if (b.t.id === 'plasma') {
            for (let z = 0; z < 2; z++) {
              const zr = r + ((Math.random() * 2) | 0), zc = (Math.random() * COLS) | 0;
              damageTile(zr, zc, dmg * 0.5, false);
              zapFx(b.x, b.y - camY, SX0 + zc * TW + TW / 2, rowY(zr) + TH / 2 - camY);
            }
          }
          break;
        }
      }

      // normalize direction (keep constant speed, avoid flat/vertical loops)
      const m = Math.hypot(b.vx, b.vy) || 1;
      b.vx /= m; b.vy /= m;
      if (Math.abs(b.vy) < 0.25) b.vy += (b.vy >= 0 ? 0.12 : -0.12);
      if (Math.abs(b.vx) < 0.2) b.vx += (Math.random() < 0.5 ? -0.25 : 0.25);

      // trail
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 7) b.trail.shift();
    }
  }

  /* ================= TAP ================= */
  function doTap() {
    const wx = tapPos.x, wy = tapPos.y + camY;
    // pickaxe chews the 3 nearest living tiles — holding one spot keeps digging
    const cands = [];
    const r0 = Math.max(topIntact, Math.floor((wy - 110) / TH));
    const r1 = Math.floor((wy + 110) / TH);
    for (let r = r0; r <= r1; r++) {
      const row = rows[r];
      if (!row) continue;
      if (row.boss) {
        if (row.hp > 0) cands.push({ r, c: 0, d: Math.abs(rowY(r) + TH / 2 - wy) });
        continue;
      }
      for (let c = 0; c < COLS; c++) {
        const t = row[c];
        if (!t || t.hp <= 0) continue;
        const d = Math.hypot(SX0 + c * TW + TW / 2 - wx, rowY(r) + TH / 2 - wy);
        if (d < 110) cands.push({ r, c, d });
      }
    }
    if (!cands.length) return;
    cands.sort((a, b) => a.d - b.d);
    for (const k of cands.slice(0, 3)) damageTile(k.r, k.c, tapDmg());
    pickFx(tapPos.x, tapPos.y);
    shake = Math.max(shake, 0.03);
  }

  /* ================= RUN / PRESTIGE ================= */
  function initRun(fresh) {
    rows = {}; genTo = -1;
    topIntact = fresh ? save.meta.headstart * 25 : save.depth;
    deepestDig = topIntact;
    save.depth = topIntact;
    ensureRows(topIntact + 40);
    camY = rowY(topIntact) - (H / u) * 0.42;
    lastBiome = Math.min(BIOMES.length - 1, Math.floor(topIntact / BOSS_EVERY));
    syncBalls();
    particles = []; floats = [];
  }

  function pendingFrags() { return fragsFor(save.depth); }

  function doPrestige() {
    const gain = pendingFrags();
    save.fragsTotal += gain;
    save.fragsSpend += gain;
    save.coins = 0;
    BALLS.forEach(b => { save.balls[b.id] = 0; save.power[b.id] = 0; });
    save.balls.basic = 1 + save.meta.startballs;
    save.upTap = 0; save.upSpeed = 0; save.upCoin = 0;
    save.depth = 0;
    A.prestige();
    CB.SDK.happyTime();
    initRun(true);
    persist();
    updateHUD(); renderPanel();
    banner('CORE SHATTERED  +' + gain + ' ◆');
    burst(LW / 2, 200, 60, 265);
    shake = 0.5;
  }

  /* ================= OFFLINE ================= */
  function checkOffline() {
    const away = (Date.now() - save.lastSeen) / 1000;
    if (away < 90 || save.cps <= 0) return;
    const capped = Math.min(away, offlineCapH() * 3600);
    const gain = save.cps * 0.6 * capped;
    if (gain < 1) return;
    pendingOffline = gain;
    $('offTime').textContent = fmtTime(capped) + (capped < away ? ' (max)' : '');
    $('offCoins').textContent = fmt(gain);
    show('offlineModal');
  }
  let pendingOffline = 0;

  /* ================= FX ================= */
  function burstTile(c, r, bio, ore) {
    const x = SX0 + c * TW + TW / 2, y = rowY(r) + TH / 2 - camY;
    const col = ore === 'gold' ? '#ffd24a' : ore === 'ruby' ? '#ff5a7a' : ore === 'void' ? '#b47aff' : bio.edge;
    for (let i = 0; i < (ore ? 14 : 7); i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(40, 190);
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
                       life: rand(0.3, 0.6), size: rand(2, 4.5), col });
    }
  }
  function burst(x, y, n, hue) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(60, 300);
      particles.push({ x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
                       life: rand(0.5, 1), size: rand(2.5, 5), col: `hsl(${hue + rand(-20, 20)},90%,62%)` });
    }
  }
  function hitFx(b) {
    if (Math.random() > 0.35) return;
    particles.push({ x: b.x, y: b.y - camY, vx: rand(-50, 50), vy: rand(-60, 10),
                     life: 0.25, size: 2, col: `hsl(${b.t.hue},90%,70%)` });
  }
  function pickFx(x, y) {
    for (let i = 0; i < 5; i++)
      particles.push({ x, y, vx: rand(-90, 90), vy: rand(-120, -20),
                       life: 0.3, size: 2.5, col: '#fff' });
  }
  const zaps = [];
  function zapFx(x1, y1, x2, y2) { zaps.push({ x1, y1, x2, y2, t: 0.15 }); }
  function addFloat(x, y, txt, big) {
    if (floats.length > 14) floats.shift();
    floats.push({ x, y, txt, t: 1, big });
  }
  function banner(txt) { bannerTxt = txt; bannerT = 2.2; }

  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 380 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= 34 * dt; f.t -= dt * 0.9;
      if (f.t <= 0) floats.splice(i, 1);
    }
    for (let i = zaps.length - 1; i >= 0; i--) {
      zaps[i].t -= dt;
      if (zaps[i].t <= 0) zaps.splice(i, 1);
    }
    if (shake > 0) shake -= dt;
    if (bannerT > 0) bannerT -= dt;
  }

  /* ================= UPDATE ================= */
  function update(dt) {
    tt += dt;
    ensureRows(topIntact + Math.ceil(H / u / TH) + 10);

    // camera follows the dig front (kept close so balls return fast)
    const target = rowY(topIntact) - (H / u) * 0.30;
    camY += (target - camY) * Math.min(1, dt * 2.2);

    updateBalls(dt);
    updateFx(dt);

    // debris erosion: straggler tiles above the deepest dig crumble on
    // their own (~1s), so the dig front never gets stuck on edge tiles
    for (let r = topIntact; r < deepestDig; r++) {
      const row = rows[r];
      if (!row || row.boss) continue;
      for (let c = 0; c < COLS; c++) {
        const t = row[c];
        if (t && t.hp > 0) damageTile(r, c, t.max * 1.5 * dt);
      }
    }

    // hold-to-smash
    if (tapping) {
      tapCd -= dt;
      if (tapCd <= 0) { tapCd = 0.15; doTap(); }
    }

    // cps EMA (drives offline earnings)
    cpsTimer += dt;
    if (cpsTimer >= 1) {
      cpsTimer = 0;
      save.cps = save.cps * 0.9 + coinsThisSec * 0.1;
      coinsThisSec = 0;
      updateHUD();
    }

    // auto-foreman
    if (save.meta.autobuy) {
      autoTimer += dt;
      if (autoTimer > 2) {
        autoTimer = 0;
        const t = BALLS[0];
        if (totalBalls() < MAX_BALLS && save.coins >= ballCost(t)) {
          save.coins -= ballCost(t);
          save.balls.basic++;
          spawnBall('basic');
          renderPanel();
        }
      }
    }

    // boss watch (for the skip-ad button)
    bossOnScreen = null;
    for (let r = topIntact; r < topIntact + 3; r++) {
      const row = rows[r];
      if (row && row.boss && row.hp > 0) { bossOnScreen = r; break; }
    }
    if (bossOnScreen !== null) bossSince += dt; else bossSince = 0;
    $('btnSkipBoss').classList.toggle('hidden', !(bossOnScreen !== null && bossSince > 45));
  }

  /* ================= RENDER ================= */
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bio = BIOMES[Math.min(BIOMES.length - 1, Math.floor(topIntact / BOSS_EVERY))];

    // cave background
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, bio.bg0); g.addColorStop(1, bio.bg1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.scale(u, u);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);

    // shaft walls
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, 0, SX0, H / u);
    ctx.fillRect(LW - SX0, 0, SX0, H / u);
    ctx.strokeStyle = bio.edge + '55';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(SX0, 0); ctx.lineTo(SX0, H / u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(LW - SX0, 0); ctx.lineTo(LW - SX0, H / u); ctx.stroke();
    // depth ruler ticks on walls
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.font = '700 9px "Rajdhani","Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    for (let r = Math.floor(camY / TH); r < (camY + H / u) / TH + 1; r++) {
      if (r % 10 !== 0 || r < 0) continue;
      const y = rowY(r) - camY;
      ctx.fillRect(SX0 - 8, y, 8, 1.5);
      ctx.fillText(r + 'm', 2, y + 3);
    }

    // tiles
    const rStart = Math.max(0, Math.floor(camY / TH) - 1);
    const rEnd = Math.floor((camY + H / u) / TH) + 1;
    for (let r = rStart; r <= rEnd; r++) {
      const row = rows[r];
      if (!row) continue;
      const y = rowY(r) - camY;
      const b = biomeOf(r);
      if (row.boss) {
        if (row.hp <= 0) continue;
        drawBoss(row, y, b);
        continue;
      }
      for (let c = 0; c < COLS; c++) {
        const t = row[c];
        if (!t || t.hp <= 0) continue;
        drawTile(t, SX0 + c * TW, y, b, r);
      }
    }

    // zaps
    for (const z of zaps) {
      ctx.strokeStyle = `rgba(120,240,255,${z.t * 6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(z.x1, z.y1);
      ctx.lineTo((z.x1 + z.x2) / 2 + rand(-8, 8), (z.y1 + z.y2) / 2 + rand(-8, 8));
      ctx.lineTo(z.x2, z.y2);
      ctx.stroke();
    }

    // balls
    for (const b of balls) drawBall(b);

    // particles
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2.4);
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // floats
    ctx.textAlign = 'center';
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, f.t * 1.5);
      ctx.font = '800 ' + (f.big ? 19 : 14) + 'px "Rajdhani","Segoe UI", sans-serif';
      ctx.fillStyle = f.big ? '#ffd24a' : '#fff';
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 4;
      ctx.fillText(f.txt, f.x, f.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // banner
    if (bannerT > 0) {
      ctx.globalAlpha = Math.min(1, bannerT * 2, (2.2 - bannerT) * 3);
      ctx.font = '800 26px "Rajdhani","Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd24a';
      ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 18;
      ctx.fillText(bannerTxt, LW / 2, 118);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawTile(t, x, y, bio, r) {
    const f = t.hp / t.max;
    ctx.fillStyle = bio.face;
    ctx.fillRect(x + 1, y + 1, TW - 2, TH - 2);
    // bevel
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.fillRect(x + 1, y + 1, TW - 2, 4);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(x + 1, y + TH - 6, TW - 2, 5);
    // ore vein
    if (t.ore) {
      const oc = t.ore === 'gold' ? '#ffd24a' : t.ore === 'ruby' ? '#ff5a7a' : '#b47aff';
      ctx.fillStyle = oc;
      ctx.shadowColor = oc; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x + TW * 0.32, y + TH * 0.45, 4, 0, 7);
      ctx.arc(x + TW * 0.62, y + TH * 0.6, 3, 0, 7);
      ctx.arc(x + TW * 0.55, y + TH * 0.3, 2.5, 0, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // damage cracks
    if (f < 0.7) {
      ctx.strokeStyle = `rgba(0,0,0,${0.5 * (1 - f)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + TW * 0.2, y + 4); ctx.lineTo(x + TW * 0.45, y + TH * 0.5); ctx.lineTo(x + TW * 0.3, y + TH - 5);
      if (f < 0.35) { ctx.moveTo(x + TW * 0.75, y + 3); ctx.lineTo(x + TW * 0.6, y + TH * 0.55); ctx.lineTo(x + TW * 0.8, y + TH - 4); }
      ctx.stroke();
    }
  }

  function drawBoss(row, y, bio) {
    const f = row.hp / row.max;
    const x = SX0;
    ctx.fillStyle = bio.dark;
    ctx.fillRect(x, y + 1, LW - SX0 * 2, TH - 2);
    // rivet studs
    ctx.fillStyle = bio.edge;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.arc(x + 34 + i * 62, y + TH / 2, 4, 0, 7); ctx.fill();
    }
    // crack stages
    ctx.strokeStyle = `rgba(255,220,120,${(1 - f) * 0.9})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (f < 0.75) { ctx.moveTo(x + 60, y + 3); ctx.lineTo(x + 100, y + TH - 4); }
    if (f < 0.5) { ctx.moveTo(x + 210, y + 2); ctx.lineTo(x + 180, y + TH - 3); ctx.lineTo(x + 240, y + TH - 6); }
    if (f < 0.25) { ctx.moveTo(x + 330, y + 4); ctx.lineTo(x + 370, y + TH - 4); ctx.moveTo(x + 300, y + TH / 2); ctx.lineTo(x + 420, y + TH / 2 + 6); }
    ctx.stroke();
    // hp bar
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(x + 60, y - 10, LW - SX0 * 2 - 120, 6);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(x + 60, y - 10, (LW - SX0 * 2 - 120) * f, 6);
    ctx.fillStyle = '#ffd24a';
    ctx.font = '800 10px "Rajdhani","Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⛏ BEDROCK PLATE', LW / 2, y - 14);
  }

  function drawBall(b) {
    const y = b.y - camY;
    // trail
    for (let i = 1; i < b.trail.length; i++) {
      const a = i / b.trail.length;
      ctx.globalAlpha = a * 0.3;
      ctx.fillStyle = `hsl(${b.t.hue},90%,65%)`;
      ctx.beginPath(); ctx.arc(b.trail[i].x, b.trail[i].y - camY, 7 * a, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // body
    const grad = ctx.createRadialGradient(b.x - 2.5, y - 2.5, 1, b.x, y, 7.5);
    grad.addColorStop(0, `hsl(${b.t.hue},95%,78%)`);
    grad.addColorStop(1, `hsl(${b.t.hue},85%,40%)`);
    if (b.t.id === 'gold' || b.t.id === 'plasma') {
      ctx.shadowColor = `hsl(${b.t.hue},95%,60%)`; ctx.shadowBlur = 10;
    }
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(b.x, y, 7, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    // type mark
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    if (b.t.id === 'heavy') { ctx.fillRect(b.x - 3, y - 1, 6, 2); }
    if (b.t.id === 'driller') { ctx.beginPath(); ctx.moveTo(b.x - 3, y - 2); ctx.lineTo(b.x + 3, y - 2); ctx.lineTo(b.x, y + 4); ctx.fill(); }
  }

  /* ================= HUD / PANEL (DOM) ================= */
  function updateHUD() {
    $('depth').textContent = save.depth + 'm';
    $('bestDepth').textContent = 'BEST ' + save.bestDepth + 'm';
    $('coins').textContent = fmt(save.coins);
    $('frags').textContent = save.fragsSpend;
    $('cps').textContent = fmt(save.cps) + '/s';
    // boost button
    const bb = $('btnBoost');
    const active = Date.now() < save.boostUntil;
    if (active) {
      bb.classList.add('on');
      bb.querySelector('small').textContent = fmtTime((save.boostUntil - Date.now()) / 1000) +
        (save.boostChain < 3 ? ' · extend' : ' · max');
    } else {
      save.boostChain = 0;
      bb.classList.remove('on');
      bb.querySelector('small').textContent = 'watch ad · 4 min';
    }
    $('boostPips').innerHTML = '●'.repeat(save.boostChain) + '○'.repeat(3 - save.boostChain);
  }

  let activeTab = 'balls';
  function renderPanel() {
    if (activeTab === 'balls') renderBalls();
    else if (activeTab === 'up') renderUpgrades();
    else renderCore();
  }

  function renderBalls() {
    let html = '';
    let prevOwned = true;
    for (const t of BALLS) {
      const owned = save.balls[t.id];
      if (!prevOwned && owned === 0) { html += lockedRow(t); break; }
      prevOwned = owned > 0 || t.id === 'basic';
      const bc = ballCost(t), pc = powerCost(t);
      const capped = totalBalls() >= MAX_BALLS;
      html += `<div class="item">
        <span class="dot" style="--h:${t.hue}"></span>
        <div class="mid">
          <div class="nm">${t.name} ${owned > 0 ? `<i>×${owned}</i>` : ''}</div>
          <div class="ds">${t.desc} · ${fmt(ballDmg(t))} dmg</div>
        </div>
        <button class="buy ${save.coins >= bc ? '' : 'cant'}" data-ball="${t.id}">
          🪙 ${fmt(bc)}<small>${capped ? '+PWR' : 'BUY'}</small></button>
        ${owned > 0 ? `<button class="buy pwr ${save.coins >= pc ? '' : 'cant'}" data-pwr="${t.id}">
          🪙 ${fmt(pc)}<small>PWR ${save.power[t.id] + 1}</small></button>` : ''}
      </div>`;
    }
    $('panelBody').innerHTML = html;
  }
  function lockedRow(t) {
    return `<div class="item locked">
      <span class="dot" style="--h:0;filter:grayscale(1)"></span>
      <div class="mid"><div class="nm">???</div><div class="ds">Own the previous ball to reveal</div></div>
      <button class="buy cant">🪙 ${fmt(t.cost)}</button>
    </div>`;
  }

  function renderUpgrades() {
    const rows2 = [
      { id: 'tap',   name: 'Pickaxe Power', desc: 'Tap damage ×1.5', lvl: save.upTap, cost: tapCost() },
      { id: 'speed', name: 'Ball Velocity', desc: '+8% ball speed', lvl: save.upSpeed, cost: speedCost(), cap: 12 },
      { id: 'coin',  name: 'Coin Polish',   desc: '+15% coin value', lvl: save.upCoin, cost: coinCost() },
    ];
    $('panelBody').innerHTML = rows2.map(r => {
      const capped = r.cap && r.lvl >= r.cap;
      return `<div class="item">
        <span class="dot up">▲</span>
        <div class="mid"><div class="nm">${r.name} <i>lv${r.lvl}</i></div><div class="ds">${r.desc}</div></div>
        <button class="buy ${capped ? 'cant' : save.coins >= r.cost ? '' : 'cant'}" data-up="${r.id}">
          ${capped ? 'MAX' : '🪙 ' + fmt(r.cost)}<small>${capped ? '' : 'UPGRADE'}</small></button>
      </div>`;
    }).join('');
  }

  function renderCore() {
    const pend = pendingFrags();
    let html = `<div class="core-head">
      <div class="core-title">◆ CORE FRAGMENTS</div>
      <div class="core-sub">Each fragment = <b>+10% damage & coins, forever</b>.<br>
      Prestige resets depth, coins & balls.</div>
      <button id="btnPrestige" class="prestige-btn ${pend > 0 ? 'ready' : 'cant'}">
        SHATTER THE CORE<small>${pend > 0 ? '+' + pend + ' ◆ fragments' : 'reach 50m+ to earn (deeper = more)'}</small>
      </button>
    </div>`;
    html += META.map(m => {
      const rank = save.meta[m.id];
      const maxed = rank >= m.costs.length;
      const cost = maxed ? 0 : m.costs[rank];
      return `<div class="item">
        <span class="dot frag">◆</span>
        <div class="mid"><div class="nm">${m.name} <i>${rank}/${m.costs.length}</i></div><div class="ds">${m.desc}</div></div>
        <button class="buy ${maxed ? 'cant' : save.fragsSpend >= cost ? 'frag-buy' : 'cant'}" data-meta="${m.id}">
          ${maxed ? 'MAX' : '◆ ' + cost}<small>${maxed ? '' : 'UNLOCK'}</small></button>
      </div>`;
    }).join('');
    $('panelBody').innerHTML = html;
    const pb = $('btnPrestige');
    if (pb) pb.addEventListener('click', () => {
      if (pendingFrags() <= 0) { A.deny(); return; }
      $('prestigeGain').textContent = '+' + pendingFrags() + ' ◆';
      show('prestigeModal');
    });
  }

  /* ================= INPUT ================= */
  cv.addEventListener('pointerdown', (e) => {
    A.resume();
    const r = cv.getBoundingClientRect();
    tapPos = { x: (e.clientX - r.left) / u, y: (e.clientY - r.top) / u };
    tapping = true; tapCd = 0;
  });
  window.addEventListener('pointermove', (e) => {
    if (!tapping) return;
    const r = cv.getBoundingClientRect();
    tapPos = { x: (e.clientX - r.left) / u, y: (e.clientY - r.top) / u };
  });
  window.addEventListener('pointerup', () => tapping = false);
  window.addEventListener('pointercancel', () => tapping = false);

  /* panel delegation */
  $('panelBody').addEventListener('click', (e) => {
    const bb = e.target.closest('[data-ball]');
    const bp = e.target.closest('[data-pwr]');
    const bu = e.target.closest('[data-up]');
    const bm = e.target.closest('[data-meta]');
    if (bb) {
      const t = BALLS.find(x => x.id === bb.dataset.ball);
      const cost = ballCost(t);
      if (save.coins < cost) { A.deny(); return; }
      save.coins -= cost;
      if (totalBalls() >= MAX_BALLS) { save.power[t.id]++; toastBanner('Ball cap — converted to POWER!'); }
      else { save.balls[t.id]++; spawnBall(t.id); }
      A.buy(); renderPanel(); updateHUD();
    } else if (bp) {
      const t = BALLS.find(x => x.id === bp.dataset.pwr);
      const cost = powerCost(t);
      if (save.coins < cost) { A.deny(); return; }
      save.coins -= cost; save.power[t.id]++;
      A.buy(); renderPanel(); updateHUD();
    } else if (bu) {
      const id = bu.dataset.up;
      const cost = id === 'tap' ? tapCost() : id === 'speed' ? speedCost() : coinCost();
      if (id === 'speed' && save.upSpeed >= 12) return;
      if (save.coins < cost) { A.deny(); return; }
      save.coins -= cost;
      if (id === 'tap') save.upTap++; else if (id === 'speed') save.upSpeed++; else save.upCoin++;
      A.buy(); renderPanel(); updateHUD();
    } else if (bm) {
      const m = META.find(x => x.id === bm.dataset.meta);
      const rank = save.meta[m.id];
      if (rank >= m.costs.length) return;
      const cost = m.costs[rank];
      if (save.fragsSpend < cost) { A.deny(); return; }
      save.fragsSpend -= cost;
      save.meta[m.id]++;
      if (m.id === 'startballs') { save.balls.basic++; spawnBall('basic'); }
      A.buy(); persist(); renderPanel(); updateHUD();
    }
  });
  function toastBanner(t) { banner(t); }

  /* tabs */
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      activeTab = t.dataset.tab;
      renderPanel();
      A.click();
    });
  });

  /* ================= BUTTONS ================= */
  $('btnBoost').addEventListener('click', () => {
    if (Date.now() < save.boostUntil && save.boostChain >= 3) { A.deny(); return; }
    CB.SDK.rewardedAd(() => {
      const base = Math.max(Date.now(), save.boostUntil);
      save.boostUntil = base + 4 * 60 * 1000;
      save.boostChain = Math.min(3, save.boostChain + 1);
      banner('2× COINS ACTIVE!');
      A.best(); updateHUD(); persist();
    }, () => A.deny());
  });
  $('btnSkipBoss').addEventListener('click', () => {
    CB.SDK.rewardedAd(() => {
      if (bossOnScreen !== null && rows[bossOnScreen] && rows[bossOnScreen].boss) {
        rows[bossOnScreen].hp = 0;
        const r = bossOnScreen;
        earn(tileCoins(r) * 60 * coinMult(), LW / 2, rowY(r) - camY, true);
        save.fragsTotal++; save.fragsSpend++;
        burst(LW / 2, rowY(r) + TH / 2 - camY, 40, 50);
        A.bossDie(); shake = 0.4;
        advanceDepth(); renderPanel(); updateHUD();
      }
    }, () => A.deny());
  });
  $('offClaim').addEventListener('click', () => {
    earn(pendingOffline); hide('offlineModal'); A.buy(); updateHUD();
  });
  $('offDouble').addEventListener('click', () => {
    CB.SDK.rewardedAd(() => {
      earn(pendingOffline * 2); hide('offlineModal'); A.best(); updateHUD();
    }, () => { earn(pendingOffline); hide('offlineModal'); updateHUD(); });
  });
  $('prestigeCancel').addEventListener('click', () => hide('prestigeModal'));
  $('prestigeGo').addEventListener('click', () => {
    hide('prestigeModal');
    CB.SDK.midgameAd(doPrestige);
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
    const text = `I dug ${save.bestDepth}m deep in COREBREAK ⛏ — my balls never stop mining. How deep can you go?`;
    let url = location.href;
    const cg = await CB.SDK.invite({ depth: save.bestDepth });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'CoreBreak', text, url }); return; } } catch (e) {}
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      banner('COPIED — CHALLENGE A FRIEND!');
    } catch (e) {}
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= BOOT + LOOP ================= */
  let rawLast = performance.now();
  (function boot() {
    resize();
    new ResizeObserver(resize).observe(cv.parentElement);
    window.addEventListener('resize', resize);
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';

    // first ball is free and already bouncing (0-second honeymoon)
    if (totalBalls() === 0) save.balls.basic = 1 + save.meta.startballs;
    save.plays++;
    initRun(false);
    checkOffline();
    updateHUD(); renderPanel();
    requestAnimationFrame(loop);
    CB.SDK.init().then(() => CB.SDK.gameplayStart());
  })();

  function loop(now) {
    const dt = Math.min((now - rawLast) / 1000, 0.05);
    rawLast = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  let saveAcc = 0;
  setInterval(() => { saveAcc++; persist(); }, 15000);
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

  // surface unexpected errors on screen (debug aid)
  window.addEventListener('error', (e) => {
    try { banner('⚠ ' + (e.message || 'error')); } catch (err) {}
  });
})();
