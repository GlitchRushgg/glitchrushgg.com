/* ============================================================
   STORMSPIRE — idle storm-defense roguelite.

   You are the last lightning spire. Armadas close in from the
   rim; your spire auto-fires, and YOUR FINGER is a weapon:
   hold anywhere to sweep the Conductor's Arc across the swarm.

   • 8 enemy types + bosses every 10 waves
   • 4 elements → 6 reactions (draft perks every 5 waves)
   • 12 in-run upgrades / 12 permanent Workshop tracks
   • Research Lab timers, offline Storm Harvest
   • Prestige: Eye of the Storm → Tempest Cores

   Wave-balance law: enemy pressure ~8.2%/wave vs income
   ~7%/wave — deaths are inevitable; the Workshop buys waves.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = SS.Audio;

  /* ================= CONSTANTS ================= */
  const LW = 480, LH = 720;
  const CX = 240, CY = 272, R = 205;    // arena
  const U = R / 100;                     // px per arena-unit
  const SPIRE_R = 22;

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'stormspire_v1';
  const save = {
    coins: 0, lifetime: 0, cores: 0, coresEarned: 0, releases: 0,
    ws: {}, resDone: {}, research: null,
    bestWave: 0, offRate: 0, lastSeen: Date.now(),
    reactionsSeen: {}, sound: true, runs: 0,
  };
  DATA.workshop.forEach(w => save.ws[w.id] = 0);
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  function persist() {
    save.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  A.enabled = save.sound;

  /* ================= CANVAS ================= */
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
  const toL = (cx2, cy2) => ({ x: (cx2 - offX) / scale, y: (cy2 - offY) / scale });

  /* ================= STATE ================= */
  const ST = { BASE: 0, RUN: 1, DRAFT: 2, RESULTS: 3, PAUSED: 4 };
  let state = ST.BASE;
  let tt = 0;
  let wave = 0, waveT = 0, spawnQ = [], gapT = 0, bossAlive = false;
  let enemies = [], bolts = [], cells = [], particles = [], floats = [];
  let run = {}, perks = {}, rotation = [], rotIdx = 0;
  let cash = 0, cashEarned = 0, interest = 0;
  let spireHp = 100, fireT = 0, boltCount = 0;
  let arc = 100, arcHeld = false, ptr = { x: CX, y: CY - 80 }, arcTick = 0;
  let orbitA = 0, hasOrbit = false;
  let usedRevive = false, overchargeUntil = 0, overUsed = 0;
  let shake = 0, flashA = 0, hitFlash = 0;
  let bannerTxt = '', bannerT = 0, bannerCol = '#ffd88a';
  let runStart = 0, sessionRuns = 0;
  let autoBuyT = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

  /* ================= DERIVED STATS ================= */
  const pk = (id) => perks[id] || 0;
  const coreMult = () => 1 + 0.05 * save.cores;
  const over = () => Date.now() < overchargeUntil ? 2 : 1;
  const baseDmg = () =>
    5 * (1 + 0.02 * save.ws.wdmg) * (1 + 0.05 * run.dmg) *
    Math.pow(1.25, pk('dmg25')) * coreMult() * over();
  const atkRate = () => Math.min(5, 2 * Math.pow(1.06, run.atk) * Math.pow(1.2, pk('atk20')));
  const critC = () => Math.min(0.6, 0.012 * run.crit + 0.005 * save.ws.wcrit + 0.08 * pk('crit8'));
  const critD = () => 1.5 + 0.08 * run.critd + 0.5 * pk('critd50');
  const rangeU = () => 30 + 2 * run.range + save.ws.wrange + 10 * pk('range10');
  const multiC = () => 0.02 * run.multi + 0.15 * pk('multi15');
  const chainJ = () => Math.min(5, pk('chain1'));
  const chainRet = () => Math.min(0.95, 0.4 + 0.12 * run.chain);
  const maxHp = () => 140 * (1 + 0.02 * save.ws.whp) * Math.pow(1.06, run.hp);
  const regen = () => 0.5 * run.regen;
  const dr = () => Math.min(0.7, 0.015 * run.aegis + 0.15 * pk('aegis15'));
  const cashMult = () => (1 + 0.05 * run.cashk) * Math.pow(1.2, pk('cash20'));
  const arcMax = () => 100 + 4 * save.ws.warc;
  const arcRegen = () => 8 * (1 + 0.04 * run.charge) * Math.pow(1.4, pk('arcRegen')) * over();
  const arcRadius = () => 8 * U * Math.pow(1.4, pk('arcWide'));
  const elemAmp = () => (1 + 0.25 * pk('ampAll'));
  const reactMult = () => (1 + 0.5 * pk('reactMast')) * elemAmp();

  /* ================= RUN LIFECYCLE ================= */
  function newRun() {
    run = {}; DATA.runUps.forEach(u => run[u.id] = 0);
    perks = {}; rotation = ['spark']; rotIdx = 0;
    cash = 10 * save.ws.wcash; cashEarned = 0;
    wave = 0; waveT = 0; spawnQ = []; gapT = 1.5; bossAlive = false;
    enemies = []; bolts = []; cells = []; particles = []; floats = [];
    spireHp = maxHp(); fireT = 0; boltCount = 0;
    arc = arcMax(); arcHeld = false;
    hasOrbit = false; usedRevive = false;
    overchargeUntil = 0; overUsed = 0;
    runStart = tt;
    state = ST.RUN;
    sessionRuns++; save.runs++;
    hide('baseSheet'); hide('resModal'); show('runUI');
    renderRunShop();
    SS.SDK.gameplayStart();
    A.resume();
  }

  function startWave() {
    wave++;
    waveT = 0;
    const boss = wave % DATA.BOSS_EVERY === 0;
    spawnQ = [];
    if (boss) {
      spawnQ.push({ t: 1.5, boss: true });
      banner('⚠ BOSS INCOMING ⚠', '#ff5b6e');
      A.bossIn();
    } else {
      const n = DATA.countW(wave);
      for (let i = 0; i < n; i++) spawnQ.push({ t: (i / n) * 18, boss: false });
      if (wave > 1) A.waveUp();
      // interest on unspent cash
      const int = 0.01 * pk('interest1') + 0.0025 * save.ws.wint;
      if (int > 0 && cash > 0) earnCash(Math.floor(cash * int), null, null);
    }
    updateRunHud();
    // draft every 5 waves (pauses before the wave spawns)
    if (wave % 5 === 0) openDraft();
  }

  function pickEnemyDef() {
    const pool = DATA.enemies.filter(e => wave >= e.w && !e.rare);
    // rare gilded skiff
    if (wave >= 10 && Math.random() < 0.04) return DATA.enemies.find(e => e.id === 'gilded');
    return pool[(Math.random() * pool.length) | 0];
  }

  function spawnEnemy(isBoss) {
    const a = rand(0, Math.PI * 2);
    const x = CX + Math.cos(a) * (R - 6), y = CY + Math.sin(a) * (R - 6);
    if (isBoss) {
      enemies.push({
        def: { id: 'boss', name: 'Dreadnought', hue: 0, r: 24, dr: 0.15 },
        boss: true, x, y, hp: DATA.hpW(wave) * DATA.BOSS_HP, maxHp: DATA.hpW(wave) * DATA.BOSS_HP,
        spd: 6.5 * 0.55 * U, cash: DATA.cashW(wave) * DATA.BOSS_CASH,
        elems: {}, slowT: 0, burnT: 0, shieldOffT: 0, blinkT: 0, born: tt, ph: rand(0, 6), fleeT: 0, shotT: 0,
      });
      bossAlive = true;
      return;
    }
    const def = pickEnemyDef();
    enemies.push({
      def, x, y,
      hp: DATA.hpW(wave) * def.hp, maxHp: DATA.hpW(wave) * def.hp,
      spd: 6.5 * def.spd * U, cash: DATA.cashW(wave) * def.cash,
      elems: {}, slowT: 0, burnT: 0, shieldOffT: 0, blinkT: def.blink || 0,
      born: tt, ph: rand(0, 6), fleeT: 0, shotT: 0,
    });
  }

  function die() {
    if (!usedRevive && wave >= 10) {
      state = ST.PAUSED;
      $('revAlt').textContent = save.coins >= 300 ? 'or pay 300 coins' : '(need 300 coins for the free path)';
      show('revModal');
      return;
    }
    endRun();
  }
  function endRun() {
    state = ST.RESULTS;
    A.death();
    SS.SDK.gameplayStop();
    shake = 0.4; flashA = 0.5;
    hide('runUI');
    const dur = Math.max(30, tt - runStart);
    let coinsGain = Math.max(wave >= 2 ? 1 : 0,
      Math.floor(cashEarned * 0.03 * (1 + 0.02 * save.ws.wcoin) * coreMult()));
    pendingCoins = coinsGain;
    save.offRate = Math.max(save.offRate, coinsGain / (dur / 60)); // coins per minute
    const isBest = wave > save.bestWave;
    if (isBest) { save.bestWave = wave; A.best(); SS.SDK.happyTime(); }
    persist();
    $('resWave').textContent = wave;
    $('resBest').classList.toggle('hidden', !isBest);
    $('resCash').textContent = fmt(cashEarned);
    $('resCoins').textContent = fmt(coinsGain);
    $('btnSalvage').classList.toggle('hidden', coinsGain <= 0);
    show('resModal');
  }
  let pendingCoins = 0;
  function collectResults() {
    save.coins += pendingCoins;
    save.lifetime += pendingCoins;
    pendingCoins = 0;
    hide('resModal');
    state = ST.BASE;
    show('baseSheet');
    renderBase();
    persist();
  }

  /* ================= ECONOMY ================= */
  function earnCash(n, x, y) {
    cash += n; cashEarned += n;
    if (x !== null && x !== undefined) addFloat(x, y, '+' + fmt(n), '#ffd45c');
  }

  /* ================= ELEMENTS & REACTIONS ================= */
  function applyElement(e, el) {
    const amp = elemAmp();
    // pair check → reaction
    for (const other in e.elems) {
      if (other !== el && e.elems[other] > 0) {
        delete e.elems[other];
        triggerReaction(e, el, other);
        return;
      }
    }
    e.elems[el] = 3;
    if (el === 'frost') e.slowT = Math.max(e.slowT, 2 * amp);
    else if (el === 'ember') { e.burnT = Math.max(e.burnT, 3); e.burnDps = e.maxHp * 0.02 * amp; }
    else if (el === 'gale') {
      const d = Math.hypot(e.x - CX, e.y - CY) || 1;
      e.x += (e.x - CX) / d * 6 * U * amp;
      e.y += (e.y - CY) / d * 6 * U * amp;
    }
  }

  function triggerReaction(e, a, b) {
    const rx = DATA.reactions.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
    if (!rx) return;
    const m = reactMult();
    A.reaction(rx.id);
    addFloat(e.x, e.y - 20, rx.name, rx.c);
    burst(e.x, e.y, 10, rx.c);
    if (!save.reactionsSeen[rx.id]) {
      save.reactionsSeen[rx.id] = 1;
      banner(rx.name + ' DISCOVERED!', rx.c);
      persist();
    }
    switch (rx.id) {
      case 'shatter': hurt(e, e.maxHp * 0.25 * m, false, rx.c); break;
      case 'overload':
        for (const o of enemies) if (dist2(o.x, o.y, e.x, e.y) < (12 * U) ** 2) hurt(o, baseDmg() * 2 * m, false, rx.c);
        shake = Math.max(shake, 0.12);
        break;
      case 'firestorm':
        for (const o of enemies) if (dist2(o.x, o.y, e.x, e.y) < (10 * U) ** 2) { o.burnT = Math.max(o.burnT, 5); o.burnDps = o.maxHp * 0.04 * m; }
        break;
      case 'hail':
        for (const o of enemies) o.slowT = Math.max(o.slowT, 3);
        break;
      case 'stormcell':
        cells.push({ x: e.x, y: e.y, t: 10, zap: 0 });
        break;
      case 'thermal':
        e.thermalT = 5; e.shieldOffT = 5;
        break;
    }
  }

  /* ================= DAMAGE ================= */
  function wardShield(e) {
    if (e.def.id === 'warden' || e.shieldOffT > 0) return 1;
    for (const o of enemies) {
      if (o.def.aura && o.shieldOffT <= 0 && dist2(o.x, o.y, e.x, e.y) < (28 * U) ** 2) return 0.6;
    }
    return 1;
  }
  function hurt(e, dmg, canCrit, col) {
    if (e.hp <= 0) return;
    let d = dmg * wardShield(e);
    const edr = e.thermalT > 0 ? 0 : (e.def.dr || 0);
    d *= (1 - edr);
    let crit = false;
    if (canCrit && Math.random() < critC()) { d *= critD(); crit = true; A.crit(); }
    e.hp -= d;
    addFloat(e.x + rand(-8, 8), e.y - e.def.r - 6, (crit ? '✦' : '') + fmt(Math.ceil(d)), crit ? '#ffd45c' : (col || '#cfe8ff'), crit);
    if (e.hp <= 0) killEnemy(e);
  }
  function killEnemy(e) {
    e.dead = true;
    const c = Math.ceil(e.cash * cashMult());
    earnCash(c, e.x, e.y);
    A.kill();
    burst(e.x, e.y, e.boss ? 30 : 8, `hsl(${e.def.hue},85%,65%)`);
    if (pk('arcKill')) arc = Math.min(arcMax(), arc + 2 * pk('arcKill'));
    if (e.def.splits) {
      for (let i = 0; i < e.def.splits; i++) {
        enemies.push({
          def: DATA.enemies[0], x: e.x + rand(-10, 10), y: e.y + rand(-10, 10),
          hp: DATA.hpW(wave) * 0.25, maxHp: DATA.hpW(wave) * 0.25,
          spd: 6.5 * 1.4 * U, cash: DATA.cashW(wave) * 0.4,
          elems: {}, slowT: 0, burnT: 0, shieldOffT: 0, blinkT: 0, born: tt, ph: rand(0, 6), fleeT: 0, shotT: 0,
        });
      }
    }
    if (e.boss) {
      bossAlive = false;
      A.bossDie();
      SS.SDK.happyTime();
      shake = 0.4; flashA = 0.4;
      banner('DREADNOUGHT DOWN!', '#ffd45c');
      spireHp = Math.min(maxHp(), spireHp + maxHp() * 0.02 * save.ws.wrecov);
    }
  }

  /* ================= FIRING ================= */
  function fireBolt() {
    const rng = rangeU() * U;
    // nearest target
    let best = null, bd = rng * rng;
    for (const e of enemies) {
      const d = dist2(e.x, e.y, CX, CY);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return;
    boltCount++;
    let dmg = baseDmg();
    if (pk('godbolt') && boltCount % 10 === 0) { dmg *= 10; shake = Math.max(shake, 0.1); }
    shootChain(CX, CY - 40, best, dmg, 0);
    // multibolt
    let mc = multiC();
    while (mc > 0) {
      if (Math.random() < mc) {
        const others = enemies.filter(e => e !== best && dist2(e.x, e.y, CX, CY) < rng * rng);
        if (others.length) shootChain(CX, CY - 40, others[(Math.random() * others.length) | 0], dmg, 0);
      }
      mc -= 1;
    }
  }
  function shootChain(fx, fy, e, dmg, depth) {
    boltFx(fx, fy, e.x, e.y, depth === 0 ? '#bfe9ff' : '#9fd4ff', depth === 0 ? 2.5 : 1.8);
    A.zap();
    // element application (rotation)
    if (rotation.length) {
      const el = rotation[rotIdx % rotation.length];
      rotIdx++;
      applyElement(e, el);
    }
    hurt(e, dmg, true);
    if (depth < chainJ()) {
      let nxt = null, nd = (40 * U) ** 2;
      for (const o of enemies) {
        if (o === e || o.dead) continue;
        const d = dist2(o.x, o.y, e.x, e.y);
        if (d < nd) { nd = d; nxt = o; }
      }
      if (nxt) shootChain(e.x, e.y, nxt, dmg * chainRet(), depth + 1);
    }
  }

  /* ================= UPDATE ================= */
  function update(dt) {
    tt += dt;
    if (shake > 0) shake -= dt;
    if (flashA > 0) flashA -= dt * 2;
    if (hitFlash > 0) hitFlash -= dt * 3;
    if (bannerT > 0) bannerT -= dt;
    updateFx(dt);

    if (state !== ST.RUN) return;

    /* waves */
    if (spawnQ.length === 0 && enemies.length === 0) {
      gapT -= dt;
      if (gapT <= 0) { gapT = 4; startWave(); }
    } else {
      waveT += dt;
      while (spawnQ.length && spawnQ[0].t <= waveT) {
        spawnEnemy(spawnQ.shift().boss);
      }
    }

    /* spire fire */
    fireT -= dt;
    if (fireT <= 0) { fireT = 1 / atkRate(); fireBolt(); }

    /* regen */
    spireHp = Math.min(maxHp(), spireHp + regen() * dt);

    /* Conductor's Arc */
    if (arcHeld && arc > 0) {
      arc -= 25 * dt;
      arcTick -= dt;
      if (arcTick <= 0) {
        arcTick = 0.15;
        const dps = baseDmg() * atkRate() * 3;
        const rr2 = arcRadius();
        let el = null;
        if (rotation.length) { el = rotation[rotIdx % rotation.length]; rotIdx++; }
        for (const e of enemies) {
          if (dist2(e.x, e.y, ptr.x, ptr.y) < rr2 * rr2) {
            if (el) applyElement(e, el);
            hurt(e, dps * 0.15, true);
          }
        }
      }
    } else {
      arc = Math.min(arcMax(), arc + arcRegen() * dt);
    }

    /* orbit eye */
    if (hasOrbit) {
      orbitA += dt * 1.6;
      const ox = CX + Math.cos(orbitA) * 60 * U * 0.55, oy = CY + Math.sin(orbitA) * 60 * U * 0.55;
      if ((tt % 1) < dt) {
        let best = null, bd = (30 * U) ** 2;
        for (const e of enemies) {
          const d = dist2(e.x, e.y, ox, oy);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) { boltFx(ox, oy, best.x, best.y, '#d4bfff', 1.6); hurt(best, baseDmg() * 0.8, true); }
      }
    }

    /* storm cells */
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i];
      c.t -= dt; c.zap -= dt;
      if (c.zap <= 0) {
        c.zap = 1;
        let best = null, bd = (20 * U) ** 2;
        for (const e of enemies) {
          const d = dist2(e.x, e.y, c.x, c.y);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) { boltFx(c.x, c.y, best.x, best.y, '#9fe8ff', 1.6); hurt(best, baseDmg() * reactMult(), false); }
      }
      if (c.t <= 0) cells.splice(i, 1);
    }

    /* enemies */
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.dead) { enemies.splice(i, 1); continue; }
      if (e.slowT > 0) e.slowT -= dt;
      if (e.shieldOffT > 0) e.shieldOffT -= dt;
      if (e.thermalT > 0) e.thermalT -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.hp -= (e.burnDps || 0) * dt;
        if (Math.random() < 0.15) particles.push({ x: e.x + rand(-6, 6), y: e.y, vx: 0, vy: -30, life: 0.4, size: 2, col: '#ff9d5c' });
        if (e.hp <= 0) { killEnemy(e); enemies.splice(i, 1); continue; }
      }
      // element tag decay
      for (const el in e.elems) { e.elems[el] -= dt; if (e.elems[el] <= 0) delete e.elems[el]; }

      const dx = CX - e.x, dy = CY - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const slow = e.slowT > 0 ? 0.7 : 0;
      let sp = e.spd * (1 - slow * 0.5) * (e.slowT > 0 ? 0.8 : 1);

      // gilded flees after 3s
      if (e.def.flees && tt - e.born > 3) e.fleeT = 1;
      if (e.fleeT) {
        e.x -= dx / d * sp * 1.4 * dt;
        e.y -= dy / d * sp * 1.4 * dt;
        if (d > R + 30) enemies.splice(i, 1);
        continue;
      }
      // phase blink
      if (e.def.blink) {
        e.blinkT -= dt;
        if (e.blinkT <= 0) {
          e.blinkT = 3;
          e.x += dx / d * 10 * U;
          e.y += dy / d * 10 * U;
          burst(e.x, e.y, 4, '#5df0a0');
        }
      }
      // zeppelin holds range and shells
      if (e.def.ranged && d < e.def.ranged * U) {
        e.shotT -= dt;
        if (e.shotT <= 0) {
          e.shotT = 2;
          boltFx(e.x, e.y, CX + rand(-8, 8), CY + rand(-8, 8), '#ff8a8a', 1.6);
          damageSpire(DATA.dpsW(wave) * 1.6);
        }
      } else if (d > SPIRE_R + e.def.r + 2) {
        e.x += dx / d * sp * dt;
        e.y += dy / d * sp * dt;
      } else {
        // contact damage
        damageSpire(DATA.dpsW(wave) * dt);
      }
    }

    if (spireHp <= 0) { spireHp = 0; die(); return; }

    /* auto-buy research */
    if (save.resDone.autobuy) {
      autoBuyT -= dt;
      if (autoBuyT <= 0) {
        autoBuyT = 1.2;
        let cheapest = null, cc = Infinity;
        for (const u of DATA.runUps) {
          if (u.cap && run[u.id] >= u.cap) continue;
          const c = DATA.runUpCost(u, run[u.id]);
          if (c < cc) { cc = c; cheapest = u; }
        }
        if (cheapest && cash >= cc) { cash -= cc; run[cheapest.id]++; renderRunShop(); }
      }
    }
  }

  function damageSpire(raw) {
    const d = raw * (1 - dr());
    spireHp -= d;
    hitFlash = Math.max(hitFlash, 0.4);
    if (Math.random() < 0.2) A.hitSpire();
  }

  /* ================= DRAFT ================= */
  let draftChoices = [];
  function rollRarity() {
    const luck = save.ws.wluck * 0.4;
    let roll = Math.random() * 100 + luck;
    let acc = 0;
    const p = DATA.perkRarP;
    for (let i = 0; i < 4; i++) {
      acc += p[i];
      if (roll < acc) return i;
    }
    return 3;
  }
  function openDraft() {
    state = ST.DRAFT;
    const n = save.resDone.draftplus ? 4 : 3;
    draftChoices = [];
    const used = new Set();
    let guard = 0;
    while (draftChoices.length < n && guard++ < 200) {
      const rar = rollRarity();
      const pool = DATA.perks.filter(p => {
        const effRar = Math.min(p.rar, rar);
        return p.rar <= rar && !used.has(p.id) && !(p.once && pk(p.id));
      });
      if (!pool.length) continue;
      const pick = pool[(Math.random() * pool.length) | 0];
      used.add(pick.id);
      draftChoices.push(pick);
    }
    $('draftCards').innerHTML = draftChoices.map((p, i) =>
      `<button class="draft-card r${p.rar}" data-pick="${i}">
        <span class="dc-rar">${DATA.rarName[p.rar]}</span>
        <span class="dc-name">${p.name}</span>
        <span class="dc-desc">${p.desc}</span>
      </button>`).join('');
    show('draftModal');
    A.draft();
    if (draftChoices.some(p => p.rar === 3)) A.legendary();
  }
  $('draftCards').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    const p = draftChoices[+b.dataset.pick];
    perks[p.id] = (perks[p.id] || 0) + 1;
    if (p.id === 'infFrost') rotation.push('frost');
    if (p.id === 'infEmber') rotation.push('ember');
    if (p.id === 'infGale') rotation.push('gale');
    if (p.id === 'stormlord') { for (const el of ['frost', 'ember', 'gale']) if (!rotation.includes(el)) rotation.push(el); }
    if (p.id === 'orbitEye') hasOrbit = true;
    hide('draftModal');
    state = ST.RUN;
    banner(p.name + '!', DATA.rarCol[p.rar]);
    A.buy();
  });

  /* ================= FX ================= */
  function boltFx(x1, y1, x2, y2, col, w) {
    const pts = [[x1, y1]];
    const segs = Math.max(3, (Math.hypot(x2 - x1, y2 - y1) / 22) | 0);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push([x1 + (x2 - x1) * t + rand(-7, 7), y1 + (y2 - y1) * t + rand(-7, 7)]);
    }
    pts.push([x2, y2]);
    bolts.push({ pts, t: 0.13, col, w });
  }
  function burst(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(40, 200);
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.6), size: rand(1.5, 3.5), col });
    }
  }
  function addFloat(x, y, txt, col, big) {
    if (floats.length > 22) floats.shift();
    floats.push({ x, y, txt, col: col || '#fff', t: 1, big });
  }
  function banner(txt, col) { bannerTxt = txt; bannerT = 2; bannerCol = col || '#ffd88a'; }
  function updateFx(dt) {
    for (let i = bolts.length - 1; i >= 0; i--) { bolts[i].t -= dt; if (bolts[i].t <= 0) bolts.splice(i, 1); }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= (1 - dt * 2); p.vy *= (1 - dt * 2);
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= 30 * dt; f.t -= dt * 1.1;
      if (f.t <= 0) floats.splice(i, 1);
    }
  }

  /* ================= RENDER ================= */
  const rainDrops = [];
  for (let i = 0; i < 70; i++) rainDrops.push({ x: Math.random(), y: Math.random() });

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sky: darkens with wave
    const wv = Math.min(1, wave / 80);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${18 + 20 * wv | 0},${16 - 6 * wv | 0},${44 - 10 * wv | 0})`);
    g.addColorStop(1, `rgb(${30 + 26 * wv | 0},${22 - 6 * wv | 0},${58 - 20 * wv | 0})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);

    // rain (intensity with wave)
    const rainN = Math.min(70, 12 + wave);
    ctx.strokeStyle = 'rgba(160,190,230,.25)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < rainN; i++) {
      const d = rainDrops[i];
      d.y += 0.017; d.x += 0.0015;
      if (d.y > 1) { d.y -= 1; d.x = Math.random(); }
      const x = d.x * LW, y = d.y * LH;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 13); ctx.stroke();
    }

    // island / arena
    const ig = ctx.createRadialGradient(CX, CY, 30, CX, CY, R);
    ig.addColorStop(0, '#232438');
    ig.addColorStop(0.85, '#1a1a2c');
    ig.addColorStop(1, '#141322');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(127,212,255,.3)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // faint range ring
    ctx.strokeStyle = 'rgba(127,212,255,.1)';
    ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.arc(CX, CY, rangeU() * U, 0, 7); ctx.stroke();
    ctx.setLineDash([]);

    // textura interior sutil: anillos concéntricos + grid radial + motas
    // (la arena era un disco vacío — hallazgo de auditoría visual)
    ctx.strokeStyle = 'rgba(127,212,255,.05)';
    ctx.lineWidth = 1;
    for (let rr = 0.25; rr < 1; rr += 0.25) {
      ctx.beginPath(); ctx.arc(CX, CY, R * rr, 0, 7); ctx.stroke();
    }
    for (let a = 0; a < 12; a++) {
      const an = a * Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(an) * 34, CY + Math.sin(an) * 34);
      ctx.lineTo(CX + Math.cos(an) * (R - 6), CY + Math.sin(an) * (R - 6));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(159,232,255,.045)';
    for (let i = 0; i < 26; i++) {
      const an = i * 2.399, rr = 40 + (i * 53 % (R - 60));
      ctx.beginPath();
      ctx.arc(CX + Math.cos(an) * rr, CY + Math.sin(an) * rr, 2 + (i % 3), 0, 7);
      ctx.fill();
    }

    // storm cells
    for (const c of cells) {
      ctx.fillStyle = `rgba(159,232,255,${0.15 + 0.1 * Math.sin(tt * 6)})`;
      ctx.beginPath(); ctx.arc(c.x, c.y - 16, 16, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(c.x + 10, c.y - 12, 11, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(c.x - 10, c.y - 12, 11, 0, 7); ctx.fill();
    }

    // enemies
    for (const e of enemies) drawEnemy(e);

    // spire
    drawSpire();

    // orbit eye
    if (hasOrbit) {
      const ox = CX + Math.cos(orbitA) * 60 * U * 0.55, oy = CY + Math.sin(orbitA) * 60 * U * 0.55;
      ctx.fillStyle = '#d4bfff';
      ctx.shadowColor = '#a06df0'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(ox, oy, 6, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // bolts (double pass glow)
    for (const b of bolts) {
      ctx.globalAlpha = Math.min(1, b.t * 9);
      for (const [lw, al] of [[b.w * 3, 0.25], [b.w, 1]]) {
        ctx.strokeStyle = b.col;
        ctx.globalAlpha = Math.min(1, b.t * 9) * al;
        ctx.lineWidth = lw;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(b.pts[0][0], b.pts[0][1]);
        for (let i = 1; i < b.pts.length; i++) ctx.lineTo(b.pts[i][0], b.pts[i][1]);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Conductor's Arc beam
    if (state === ST.RUN && arcHeld && arc > 0) {
      boltFx(CX, CY - 40, ptr.x, ptr.y, '#eaf7ff', 3);
      ctx.strokeStyle = 'rgba(234,247,255,.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(ptr.x, ptr.y, arcRadius(), 0, 7); ctx.stroke();
    }

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
      ctx.globalAlpha = Math.min(1, f.t * 1.6);
      ctx.font = '800 ' + (f.big ? 16 : 12) + 'px "Rajdhani","Segoe UI", sans-serif';
      ctx.fillStyle = f.col;
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // banner
    if (bannerT > 0) {
      ctx.globalAlpha = Math.min(1, bannerT * 2, (2 - bannerT) * 3);
      ctx.font = '800 24px "Rajdhani","Segoe UI", sans-serif';
      ctx.fillStyle = bannerCol;
      ctx.shadowColor = bannerCol; ctx.shadowBlur = 18;
      ctx.fillText(bannerTxt, LW / 2, 106);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // low HP vignette
    const hpFrac = spireHp / maxHp();
    if (state === ST.RUN && hpFrac < 0.35) {
      const pulse = 0.5 + 0.5 * Math.sin(tt * 6);
      ctx.strokeStyle = `rgba(255,60,70,${(0.4 - hpFrac) * pulse})`;
      ctx.lineWidth = 22;
      ctx.strokeRect(-11, -11, LW + 22, LH + 22);
    }
    if (hitFlash > 0) {
      ctx.fillStyle = `rgba(255,70,70,${hitFlash * 0.12})`;
      ctx.fillRect(0, 0, LW, LH);
    }
    if (flashA > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.65, flashA)})`;
      ctx.fillRect(0, 0, LW, LH);
    }
    ctx.restore();
  }

  function drawSpire() {
    // más alto y protagonista (auditoría: el spire se perdía en la arena)
    const topY = CY - 80;
    // tower body
    const g = ctx.createLinearGradient(CX, topY, CX, CY + 20);
    g.addColorStop(0, '#42466a');
    g.addColorStop(1, '#20223a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(CX - 18, CY + 18);
    ctx.lineTo(CX - 8, topY + 10);
    ctx.lineTo(CX + 8, topY + 10);
    ctx.lineTo(CX + 18, CY + 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(127,212,255,.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // crystal tip — brilla con el color del ELEMENTO ACTIVO de la rotación
    const elCols = { frost: '#7fd4ff', ember: '#ff9d5c', gale: '#8ef5c9' };
    const activeEl = rotation.length ? rotation[rotIdx % rotation.length] : null;
    const tipCol = elCols[activeEl] || '#7fd4ff';
    const pulse = 1 + 0.12 * Math.sin(tt * 4);
    ctx.fillStyle = '#dff3ff';
    ctx.shadowColor = tipCol; ctx.shadowBlur = 30 * pulse;
    ctx.beginPath();
    ctx.moveTo(CX, topY - 18 * pulse);
    ctx.lineTo(CX + 8, topY + 6);
    ctx.lineTo(CX, topY + 13);
    ctx.lineTo(CX - 8, topY + 6);
    ctx.closePath();
    ctx.fill();
    // halo del elemento
    ctx.strokeStyle = tipCol;
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(tt * 4);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CX, topY - 2, 16 * pulse, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // HP ring
    const frac = Math.max(0, spireHp / maxHp());
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(CX, CY, SPIRE_R + 8, 0, 7); ctx.stroke();
    ctx.strokeStyle = frac > 0.5 ? '#5de08a' : frac > 0.25 ? '#ffd45c' : '#ff5b6e';
    ctx.beginPath(); ctx.arc(CX, CY, SPIRE_R + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
  }

  function drawEnemy(e) {
    const hue = e.def.hue;
    ctx.save();
    ctx.translate(e.x, e.y);
    const ang = Math.atan2(CY - e.y, CX - e.x);
    ctx.rotate(ang + Math.PI / 2);
    const r = e.def.r;
    const alpha = e.def.blink ? 0.55 + 0.45 * Math.abs(Math.sin(tt * 3 + e.ph)) : 1;
    ctx.globalAlpha = alpha;
    const fill = `hsl(${hue},70%,${e.boss ? 45 : 55}%)`;
    ctx.fillStyle = fill;
    ctx.strokeStyle = `hsl(${hue},85%,72%)`;
    ctx.lineWidth = 1.6;
    if (e.boss) ctx.shadowColor = fill, ctx.shadowBlur = 18;
    ctx.beginPath();
    switch (e.def.id) {
      case 'bulwark':
      case 'boss':
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2;
          i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        break;
      case 'zeppelin':
        ctx.ellipse(0, 0, r * 0.8, r * 1.2, 0, 0, 7);
        break;
      case 'shrike':
      case 'darter':
        ctx.moveTo(0, -r * 1.3); ctx.lineTo(r * 0.7, r); ctx.lineTo(0, r * 0.5); ctx.lineTo(-r * 0.7, r);
        break;
      case 'warden':
        ctx.arc(0, 0, r, 0, 7);
        break;
      default: // skiff, gilded, phase
        ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * 0.9, r * 0.8); ctx.lineTo(-r * 0.9, r * 0.8);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    // warden aura ring
    if (e.def.aura && e.shieldOffT <= 0) {
      ctx.strokeStyle = `hsla(${hue},85%,72%,.35)`;
      ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.arc(0, 0, 28 * U * 0.5, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
    }
    // gilded sparkle
    if (e.def.id === 'gilded') {
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(tt * 8 + e.ph);
      ctx.beginPath(); ctx.arc(0, -r * 0.3, 2, 0, 7); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // HP bar (only when hurt)
    if (e.hp < e.maxHp) {
      const w = e.def.r * 2.4, frac = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(e.x - w / 2, e.y - e.def.r - 8, w, 3);
      ctx.fillStyle = e.boss ? '#ff5b6e' : '#5de08a';
      ctx.fillRect(e.x - w / 2, e.y - e.def.r - 8, w * frac, 3);
    }
    // element tags
    let ti = 0;
    for (const el in e.elems) {
      ctx.fillStyle = DATA.elements[el].c;
      ctx.beginPath(); ctx.arc(e.x - 8 + ti * 8, e.y - e.def.r - 14, 3, 0, 7); ctx.fill();
      ti++;
    }
    // frost tint
    if (e.slowT > 0) {
      ctx.fillStyle = 'rgba(168,232,255,.25)';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.def.r + 2, 0, 7); ctx.fill();
    }
  }

  /* ================= HUD / DOM ================= */
  function updateRunHud() {
    $('hudWave').textContent = 'WAVE ' + wave;
    $('hudCash').textContent = fmt(Math.floor(cash));
    const frac = Math.max(0, Math.min(1, arc / arcMax()));
    $('arcFill').style.width = (frac * 100).toFixed(1) + '%';
    $('arcBar').classList.toggle('empty', arc < 5);
    const ov = $('btnOver');
    if (Date.now() < overchargeUntil) {
      ov.classList.add('on');
      ov.querySelector('small').textContent = Math.ceil((overchargeUntil - Date.now()) / 1000) + 's ×2';
    } else {
      ov.classList.remove('on');
      ov.querySelector('small').textContent = overUsed >= 3 ? 'used up' : 'watch ad · 5min ×2 dmg';
    }
  }

  let runTab = 0;
  function renderRunShop() {
    const rows = DATA.runUps.filter(u => u.tab === runTab);
    $('runShop').innerHTML = rows.map(u => {
      const lvl = run[u.id] || 0;
      const capped = u.cap && lvl >= u.cap;
      const cost = capped ? 0 : DATA.runUpCost(u, lvl);
      const can = !capped && cash >= cost;
      return `<button class="ru ${can ? 'can' : ''}" data-run="${u.id}">
        <span class="ru-n">${u.name} <i>${lvl}</i></span>
        <span class="ru-e">${u.eff}</span>
        <span class="ru-c">${capped ? 'MAX' : fmt(cost)}</span>
      </button>`;
    }).join('');
  }
  $('runShop').addEventListener('click', (e) => {
    const b = e.target.closest('[data-run]');
    if (!b) return;
    const u = DATA.runUps.find(x => x.id === b.dataset.run);
    const lvl = run[u.id] || 0;
    if (u.cap && lvl >= u.cap) return;
    const cost = DATA.runUpCost(u, lvl);
    if (cash < cost) { A.deny(); return; }
    const free = Math.random() < 0.005 * save.ws.wfree;
    if (!free) cash -= cost;
    run[u.id]++;
    if (u.id === 'hp') spireHp += maxHp() * 0.06 / 1.06; // top up proportionally
    if (free) addFloat(CX, CY - 60, 'FREE UPGRADE!', '#5de08a', true);
    A.buy();
    renderRunShop(); updateRunHud();
  });
  document.querySelectorAll('.rtab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.rtab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      runTab = +t.dataset.tab;
      renderRunShop();
      A.click();
    });
  });

  /* ---------- base (between runs) ---------- */
  let baseTab = 'ws';
  function renderBase() {
    $('baseCoins').textContent = fmt(save.coins);
    $('baseBest').textContent = save.bestWave;
    $('baseCores').textContent = save.cores;
    if (baseTab === 'ws') renderWorkshop();
    else if (baseTab === 'lab') renderLab();
    else renderTempest();
  }
  function renderWorkshop() {
    $('baseBody').innerHTML = DATA.workshop.map(w => {
      const lvl = save.ws[w.id];
      const capped = lvl >= w.cap;
      const cost = capped ? 0 : DATA.wsCost(w, lvl);
      const can = !capped && save.coins >= cost;
      return `<div class="item ${can ? 'can' : ''}">
        <div class="mid"><div class="nm">${w.name} <i>lv${lvl}</i></div><div class="ds">${w.eff}</div></div>
        <button class="buy ${can ? '' : 'cant'}" data-ws="${w.id}">${capped ? 'MAX' : '⬡ ' + fmt(cost)}<small>${capped ? '' : 'UPGRADE'}</small></button>
      </div>`;
    }).join('');
  }
  function renderLab() {
    const r = save.research;
    let html = '';
    if (r) {
      const left = Math.max(0, r.endsAt - Date.now());
      html += `<div class="lab-active">
        <div class="nm">${DATA.research.find(x => x.id === r.id).name}</div>
        <div class="ds">${left > 0 ? 'Ready in ' + fmtTime(left / 1000) : 'COMPLETE!'}</div>
        ${left > 0 ? '<button class="buy ad-buy" id="btnFinish">▶ FINISH NOW<small>watch ad</small></button>'
                   : '<button class="buy" id="btnClaimRes">CLAIM<small>research done</small></button>'}
      </div>`;
    }
    html += DATA.research.map(x => {
      const done = save.resDone[x.id];
      const busy = !!save.research;
      return `<div class="item ${done ? 'done' : ''}">
        <div class="mid"><div class="nm">${x.name} ${done ? '<i>DONE</i>' : ''}</div><div class="ds">${x.desc} · ${x.mins >= 60 ? (x.mins / 60) + 'h' : x.mins + 'm'}</div></div>
        ${done ? '' : `<button class="buy ${busy ? 'cant' : ''}" data-res="${x.id}">START<small>${x.mins >= 60 ? (x.mins / 60) + ' hours' : x.mins + ' min'}</small></button>`}
      </div>`;
    }).join('');
    $('baseBody').innerHTML = html;
    const bf = $('btnFinish');
    if (bf) bf.addEventListener('click', () => {
      SS.SDK.rewardedAd(() => { save.research.endsAt = Date.now(); renderLab(); A.research(); persist(); }, () => A.deny());
    });
    const bc = $('btnClaimRes');
    if (bc) bc.addEventListener('click', () => {
      save.resDone[save.research.id] = 1;
      banner(DATA.research.find(x => x.id === save.research.id).name + ' RESEARCHED!', '#5de08a');
      save.research = null;
      A.research(); persist(); renderLab();
    });
  }
  function renderTempest() {
    const unlocked = save.bestWave >= DATA.PRESTIGE_WAVE || save.cores > 0;
    const pend = Math.max(0, DATA.coresFor(save.lifetime) - save.coresEarned);
    $('baseBody').innerHTML = `<div class="well-page">
      <div class="well-title">◈ EYE OF THE STORM</div>
      <p class="well-text">Ride the storm's eye and begin anew.<br>
      Coins & Workshop reset — each <b>Tempest Core</b> grants
      <b>+5% damage and +5% coins, forever</b>.</p>
      <div class="well-stats"><span>Cores <b>${save.cores}</b></span><span>Lifetime coins <b>${fmt(save.lifetime)}</b></span></div>
      ${unlocked
        ? `<button id="btnPrestige" class="release-btn ${pend > 0 ? 'ready' : 'cant'}">
             ENTER THE EYE<small>${pend > 0 ? '+' + pend + ' ◈ Tempest Cores' : 'earn more lifetime coins first'}</small></button>`
        : `<div class="well-locked">Die at <b>wave ${DATA.PRESTIGE_WAVE}+</b> to see the Eye.<br>Best: wave ${save.bestWave}</div>`}
    </div>`;
    const pb = $('btnPrestige');
    if (pb) pb.addEventListener('click', () => {
      if (pend <= 0) { A.deny(); return; }
      $('preGain').textContent = '+' + pend + ' ◈';
      show('preModal');
    });
  }
  $('baseBody').addEventListener('click', (e) => {
    const bw = e.target.closest('[data-ws]');
    const br = e.target.closest('[data-res]');
    if (bw) {
      const w = DATA.workshop.find(x => x.id === bw.dataset.ws);
      const lvl = save.ws[w.id];
      if (lvl >= w.cap) return;
      const cost = DATA.wsCost(w, lvl);
      if (save.coins < cost) { A.deny(); return; }
      save.coins -= cost;
      save.ws[w.id]++;
      A.buy(); persist(); renderBase();
    } else if (br) {
      if (save.research) { A.deny(); return; }
      const x = DATA.research.find(z => z.id === br.dataset.res);
      save.research = { id: x.id, endsAt: Date.now() + x.mins * 60000 };
      A.research(); persist(); renderLab();
    }
  });
  document.querySelectorAll('.btab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.btab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      baseTab = t.dataset.tab;
      renderBase();
      A.click();
    });
  });

  /* ================= INPUT (the Arc) ================= */
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .sheet, .modal, .overlay, .runsheet')) return;
    A.resume();
    if (state !== ST.RUN) return;
    arcHeld = true;
    ptr = toL(e.clientX, e.clientY);
  });
  window.addEventListener('pointermove', (e) => {
    if (!arcHeld) return;
    ptr = toL(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', () => arcHeld = false);
  window.addEventListener('pointercancel', () => arcHeld = false);

  /* ================= BUTTONS ================= */
  $('btnLaunch').addEventListener('click', () => {
    A.click();
    if (sessionRuns >= 1) SS.SDK.midgameAd(newRun);
    else newRun();
  });
  $('btnSalvage').addEventListener('click', () => {
    SS.SDK.rewardedAd(() => {
      pendingCoins *= 2;
      $('resCoins').textContent = fmt(pendingCoins);
      $('btnSalvage').classList.add('hidden');
      A.best();
    }, () => A.deny());
  });
  $('btnResCollect').addEventListener('click', () => { A.click(); collectResults(); });
  $('btnOver').addEventListener('click', () => {
    if (Date.now() < overchargeUntil || overUsed >= 3) { A.deny(); return; }
    SS.SDK.rewardedAd(() => {
      overUsed++;
      overchargeUntil = Date.now() + 5 * 60000;
      banner('OVERCHARGE! ×2 DAMAGE', '#ffd45c');
      A.best();
    }, () => A.deny());
  });
  $('revAd').addEventListener('click', () => {
    SS.SDK.rewardedAd(() => doRevive(), () => A.deny());
  });
  $('revCoins').addEventListener('click', () => {
    if (save.coins < 300) { A.deny(); return; }
    save.coins -= 300; persist();
    doRevive();
  });
  $('revDecline').addEventListener('click', () => { hide('revModal'); endRun(); });
  function doRevive() {
    usedRevive = true;
    hide('revModal');
    spireHp = maxHp() * 0.5;
    // blast nearby enemies away
    for (const e of enemies) {
      if (dist2(e.x, e.y, CX, CY) < (40 * U) ** 2) { e.hp = 0; killEnemy(e); }
    }
    enemies = enemies.filter(e => !e.dead);
    state = ST.RUN;
    flashA = 0.6; shake = 0.3;
    banner('THE SPIRE ENDURES!', '#5de08a');
    A.revive();
  }
  $('preGo').addEventListener('click', () => {
    hide('preModal');
    SS.SDK.midgameAd(doPrestige);
  });
  $('preCancel').addEventListener('click', () => hide('preModal'));
  function doPrestige() {
    const pend = Math.max(0, DATA.coresFor(save.lifetime) - save.coresEarned);
    save.cores += pend;
    save.coresEarned += pend;
    save.releases++;
    save.coins = Math.floor(save.coins * 0.1); // 10% refund
    DATA.workshop.forEach(w => save.ws[w.id] = 0);
    save.bestWave = 0; save.offRate = 0;
    A.prestige();
    SS.SDK.happyTime();
    flashA = 0.8;
    banner('◈ ' + pend + ' TEMPEST CORES', '#d4bfff');
    persist();
    renderBase();
  }
  /* offline harvest */
  let pendingOff = 0;
  function checkOffline() {
    if (save.offRate <= 0) return;
    const mins = (Date.now() - save.lastSeen) / 60000;
    if (mins < 5) return;
    const capMin = save.resDone.offcap ? 960 : 480;
    const gain = Math.floor(save.offRate * 0.4 * (1 + 0.03 * save.ws.woff) * Math.min(mins, capMin));
    if (gain < 1) return;
    pendingOff = gain;
    $('offAmount').textContent = fmt(gain);
    $('offTime').textContent = fmtTime(Math.min(mins, capMin) * 60);
    show('offModal');
  }
  $('offDouble').addEventListener('click', () => {
    SS.SDK.rewardedAd(() => {
      save.coins += pendingOff * 2; save.lifetime += pendingOff * 2;
      hide('offModal'); A.best(); renderBase(); persist();
    }, () => { save.coins += pendingOff; save.lifetime += pendingOff; hide('offModal'); renderBase(); });
  });
  $('offCollect').addEventListener('click', () => {
    save.coins += pendingOff; save.lifetime += pendingOff;
    hide('offModal'); A.buy(); renderBase(); persist();
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
    const text = `My spire survived to WAVE ${save.bestWave} in STORMSPIRE ⚡ — sweep the storm with your finger. Can you outlast me?`;
    let url = location.href;
    const cg = await SS.SDK.invite({ wave: save.bestWave });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'Stormspire', text, url }); return; } } catch (e) {}
    try { await navigator.clipboard.writeText(text + ' ' + url); banner('COPIED — CHALLENGE A FRIEND!', '#fff'); } catch (e) {}
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= BOOT + LOOP ================= */
  let rawLast = performance.now();
  (function boot() {
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    checkOffline();
    renderBase();
    requestAnimationFrame(loop);
    SS.SDK.init().then(() => SS.SDK.gameplayStart());
  })();

  let hudAcc = 0;
  function loop(now) {
    const dt = Math.min((now - rawLast) / 1000, 0.05);
    rawLast = now;
    update(dt);
    render();
    hudAcc += dt;
    if (hudAcc > 0.12) {
      hudAcc = 0;
      if (state === ST.RUN) { updateRunHud(); refreshRunShopAfford(); }
    }
    requestAnimationFrame(loop);
  }
  let lastAfford = '';
  function refreshRunShopAfford() {
    const sig = Math.floor(Math.log2(cash + 2)) + '|' + runTab;
    if (sig === lastAfford) return;
    lastAfford = sig;
    renderRunShop();
  }

  setInterval(persist, 15000);
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  window.addEventListener('error', (e) => {
    try { banner('⚠ ' + (e.message || 'error'), '#ff5b6e'); } catch (err) {}
  });
})();
