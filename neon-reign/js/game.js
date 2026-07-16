/* ============================================================
   NEONREIGN — .io territory capture vs a court of named rivals.

   Drag to steer. Leave your turf and you paint a trail; close
   the loop back home and everything inside is yours — including
   other kingdoms. Any head that crosses a trail kills its owner.

   • 12 named rivals with real AI personalities (the Court)
   • Takedowns earn bounties + bronze/silver/gold frames (+2% each)
   • 8 upgrade tracks, capture streaks ×5, Trail Armor
   • Tribute offline earnings, Golden Crown ad buff
   • Prestige: A New Reign → Crowns + arena Edicts
   • 100% of the map = TOTAL CONQUEST, whole haul ×3

   All simulation is continuous-time on a cell grid; captures
   are a border flood-fill (anything unreachable from the map
   edge becomes yours). Bots never die to their own trail —
   only the player can suicide.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = NR.Audio;

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'neonReign_v1';
  const save = {
    coins: 0, lifetime: 0, cycleLife: 0, crowns: 0, prestiges: 0,
    rounds: 0, bestPct: 0, bestHaul: 0,
    up: {}, court: {}, edict: 'none',
    lastSeen: Date.now(), lastDay: '', sound: true,
  };
  DATA.upgrades.forEach(u => save.up[u.id] = 0);
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  DATA.upgrades.forEach(u => { if (!(u.id in save.up)) save.up[u.id] = 0; });
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

  /* ================= EFFECTIVE STATS ================= */
  const edict = () => DATA.edicts.find(e => e.id === save.edict) || DATA.edicts[0];
  const frameBonus = () => {
    let b = 0;
    for (const r of DATA.rivals) b += DATA.frameOf(save.court[r.id] || 0) * DATA.FRAME_BONUS;
    return b;
  };
  const incomeMult = () =>
    DATA.greedMult(save.up.greed) * (1 + save.crowns * DATA.CROWN_BONUS)
    * (1 + frameBonus()) * edict().value * (goldenT > 0 ? 2 : 1);

  /* ================= ARENA STATE ================= */
  const CS = DATA.CS;
  let G = DATA.GRID, TOT = G * G, WORLD = G * CS;
  let own, trailG;                 // Int16Array: -1 neutral, else entity slot
  let counts = [];                 // territory cells per slot
  let ents = [];                   // 0 = player, 1..BOTS = rivals
  let onMap = new Set();           // rival ids currently on the map

  const ST = { SURFACE: 0, RUN: 1, DYING: 2, SC: 3, OVER: 4 };
  let state = ST.SURFACE;
  let tt = 0, shake = 0, dieT = 0;

  // round state
  let runHaul = 0, terrCoins = 0, bountyCoins = 0, kills = 0;
  let streak = 0, streakT = 0, peakPct = 0;
  let armorLeft = 0, scUsed = false, isDaily = false, invuln = 0;
  let conquest = false, pendingSummary = null;

  // buffs / ads
  let goldenT = 0, goldenCd = 0, roundsSinceAd = 0;

  // input
  let pointer = null;              // {x,y} logical screen coords

  // fx
  let particles = [], floats = [];
  let bannerTxt = '', bannerT = 0;
  let camX = 0, camY = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const cellOf = (x, y) => {
    const cx = Math.max(0, Math.min(G - 1, (x / CS) | 0));
    const cy = Math.max(0, Math.min(G - 1, (y / CS) | 0));
    return cy * G + cx;
  };
  const rivalColor = (r) => `hsl(${r.hue},85%,62%)`;
  const PLAYER_C = '#4de0ff';
  const colorOf = (slot) => slot === 0 ? PLAYER_C : rivalColor(ents[slot].rival);

  /* ================= SETUP ================= */
  function seedTerritory(slot, cx, cy, r) {
    for (let y = Math.max(0, cy - Math.ceil(r)); y <= Math.min(G - 1, cy + Math.ceil(r)); y++)
      for (let x = Math.max(0, cx - Math.ceil(r)); x <= Math.min(G - 1, cx + Math.ceil(r)); x++)
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) claim(y * G + x, slot);
  }
  function claim(c, slot) {
    if (own[c] === slot) return;
    if (own[c] !== -1) counts[own[c]]--;
    own[c] = slot;
    counts[slot]++;
  }
  function release(c) {
    if (own[c] === -1) return;
    counts[own[c]]--;
    own[c] = -1;
  }

  function pickRival() {
    const avail = DATA.rivals.filter(r => !onMap.has(r.id));
    const rare = avail.filter(r => r.rare), norm = avail.filter(r => !r.rare);
    const r = (rare.length && Math.random() < DATA.RARE_CHANCE) ? rare[0]
            : norm[(Math.random() * norm.length) | 0] || avail[0] || DATA.rivals[0];
    onMap.add(r.id);
    return r;
  }

  function spawnSpot(minPlayerDist) {
    for (let tries = 0; tries < 60; tries++) {
      const cx = 4 + ((Math.random() * (G - 8)) | 0);
      const cy = 4 + ((Math.random() * (G - 8)) | 0);
      const x = (cx + 0.5) * CS, y = (cy + 0.5) * CS;
      if (own[cy * G + cx] !== -1) continue;
      if (ents[0] && ents[0].alive &&
          Math.hypot(x - ents[0].x, y - ents[0].y) < minPlayerDist * CS) continue;
      return { cx, cy, x, y };
    }
    return { cx: G >> 1, cy: G >> 1, x: WORLD / 2, y: WORLD / 2 };
  }

  function mkBot(slot) {
    const s = spawnSpot(9);
    const rival = pickRival();
    const b = {
      slot, alive: true, rival,
      x: s.x, y: s.y, dir: rand(0, Math.PI * 2), cell: -1,
      trail: [], state: 'home', target: null, wps: [],
      decideT: rand(0, 0.2), patience: rand(0.5, 2), respawnT: 0,
    };
    seedTerritory(slot, s.cx, s.cy, 2.5);
    b.cell = cellOf(b.x, b.y);
    return b;
  }

  function newArena(withPlayer) {
    G = edict().grid; TOT = G * G; WORLD = G * CS;
    own = new Int16Array(TOT).fill(-1);
    trailG = new Int16Array(TOT).fill(-1);
    counts = new Array(DATA.BOTS + 1).fill(0);
    onMap = new Set();
    ents = [];
    // player slot 0
    const p = { slot: 0, alive: withPlayer, rival: null,
                x: WORLD / 2, y: WORLD / 2, dir: -Math.PI / 2, cell: -1, trail: [] };
    ents.push(p);
    if (withPlayer) {
      const s = spawnSpot(0);
      p.x = s.x; p.y = s.y;
      seedTerritory(0, s.cx, s.cy, DATA.homeR(save.up.homeland));
      p.cell = cellOf(p.x, p.y);
    }
    for (let i = 1; i <= DATA.BOTS; i++) ents.push(mkBot(i));
    camX = p.x; camY = p.y;
  }

  /* ================= ROUND LIFECYCLE ================= */
  function startRound() {
    newArena(true);
    runHaul = 0; terrCoins = 0; bountyCoins = 0; kills = 0;
    streak = 0; streakT = 0; peakPct = 0;
    armorLeft = DATA.armorFor(save.up.armor) + (goldenT > 0 ? 1 : 0);
    scUsed = false; conquest = false; invuln = 1;
    isDaily = save.lastDay !== new Date().toDateString();
    state = ST.RUN;
    pointer = null;
    A.resume(); A.start();
    NR.SDK.gameplayStart();
    hide('sheet'); show('runHud');
    updateRunHUD();
  }

  function playerDeath(killerName) {
    // trail armor: survive the cut, lose the trail
    if (armorLeft > 0) {
      armorLeft--;
      clearTrail(0);
      banner('🛡 ARMOR! ' + armorLeft + ' left');
      A.armor();
      invuln = 1.2;
      return;
    }
    state = ST.DYING; dieT = 0.7;
    shake = 0.35;
    A.death();
    boomFx(ents[0].x, ents[0].y, PLAYER_C);
    clearTrail(0);
    ents[0].alive = false;
    NR.SDK.gameplayStop();
    $('scKiller').textContent = killerName
      ? killerName.toUpperCase() + ' CUT YOUR TRAIL…' : 'YOUR TRAIL WAS CUT…';
  }

  function resolveDeath() {
    if (!scUsed && counts[0] > 0) { state = ST.SC; show('scModal'); return; }
    endRound();
  }

  function secondChance() {
    scUsed = true;
    const p = ents[0];
    // rise again inside whatever kingdom remains
    let home = -1;
    for (let c = 0; c < TOT; c++) if (own[c] === 0) { home = c; break; }
    if (home === -1) { const s = spawnSpot(0); seedTerritory(0, s.cx, s.cy, 2); home = s.cy * G + s.cx; }
    p.x = ((home % G) + 0.5) * CS; p.y = (((home / G) | 0) + 0.5) * CS;
    p.cell = home; p.alive = true;
    invuln = 2;
    state = ST.RUN;
    hide('scModal');
    banner('LONG LIVE THE KING!');
    A.revive();
    NR.SDK.gameplayStart();
  }

  function totalConquest() {
    conquest = true;
    banner('👑 TOTAL CONQUEST!');
    A.conquest();
    NR.SDK.happyTime();
    state = ST.DYING; dieT = 1.4;  // victory lap pause, then the spoils
  }

  function endRound() {
    state = ST.OVER;
    const pct = Math.round(peakPct * 100);
    let final = runHaul;
    const rows = [
      ['Territory claimed', terrCoins],
      ['Bounties (' + kills + ' takedowns)', bountyCoins],
    ];
    if (conquest) { rows.push(['TOTAL CONQUEST ×3', final * (DATA.CONQUEST_MULT - 1)]); final *= DATA.CONQUEST_MULT; }
    if (isDaily) { rows.push(['First round of the day ×3', final * 2]); final *= 3; }
    final = Math.floor(final);
    pendingSummary = { final, pct };
    $('sumHaul').textContent = fmt(final);
    $('sumPct').textContent = pct + '%' + (pct > save.bestPct ? ' — NEW BEST!' : '');
    $('sumHot').classList.toggle('hidden', !isDaily);
    $('sumConq').classList.toggle('hidden', !conquest);
    $('sumList').innerHTML = rows.filter(r => r[1] > 0).map(r =>
      `<div class="sum-row"><span>${r[0]}</span><b>+${fmt(Math.floor(r[1]))}</b></div>`).join('') ||
      '<div class="sum-row empty">The realm remembers nothing.</div>';
    hide('runHud'); show('sumModal');
  }

  function bank(mult) {
    const s = pendingSummary; if (!s) return;
    pendingSummary = null;
    const gain = Math.floor(s.final * (mult || 1));
    save.coins += gain; save.lifetime += gain; save.cycleLife += gain;
    save.bestHaul = Math.max(save.bestHaul, gain);
    save.rounds++;
    save.lastDay = new Date().toDateString();
    if (s.pct > save.bestPct) { save.bestPct = s.pct; A.best(); }
    persist();
    A.cash();
    hide('sumModal'); show('sheet');
    state = ST.SURFACE;
    newArena(false);               // attract mode: the court plays on
    renderSheet(); updateHUD();
    roundsSinceAd++;
    if (roundsSinceAd >= 2 && save.rounds > 3) { roundsSinceAd = 0; NR.SDK.midgameAd(() => {}); }
  }

  /* ================= TRAILS / CAPTURE / KILLS ================= */
  function clearTrail(slot) {
    for (const c of ents[slot].trail) if (trailG[c] === slot) trailG[c] = -1;
    ents[slot].trail = [];
  }

  function enterCell(ent, c) {
    ent.cell = c;
    const t = trailG[c];
    if (t !== -1 && ents[t].alive) {
      if (t === ent.slot) {
        // own trail: only the player can suicide on it
        if (ent.slot === 0 && invuln <= 0) { playerDeath(null); return; }
      } else {
        killEntity(t, ent.slot);
        if (state !== ST.RUN && state !== ST.SURFACE) return;
      }
    }
    if (own[c] === ent.slot) {
      if (ent.trail.length) capture(ent);
      return;
    }
    if (trailG[c] === -1) {
      trailG[c] = ent.slot;
      ent.trail.push(c);
    }
  }

  function capture(ent) {
    const slot = ent.slot;
    let gained = 0;
    for (const c of ent.trail) {
      if (trailG[c] === slot) trailG[c] = -1;
      if (own[c] !== slot) { claim(c, slot); gained++; }
    }
    ent.trail = [];
    // border flood-fill: everything the outside can't reach becomes ours
    const seen = new Uint8Array(TOT);
    const q = [];
    for (let i = 0; i < G; i++) {
      for (const c of [i, (G - 1) * G + i, i * G, i * G + G - 1])
        if (!seen[c] && own[c] !== slot) { seen[c] = 1; q.push(c); }
    }
    while (q.length) {
      const c = q.pop();
      const x = c % G, y = (c / G) | 0;
      if (x > 0)     { const n = c - 1; if (!seen[n] && own[n] !== slot) { seen[n] = 1; q.push(n); } }
      if (x < G - 1) { const n = c + 1; if (!seen[n] && own[n] !== slot) { seen[n] = 1; q.push(n); } }
      if (y > 0)     { const n = c - G; if (!seen[n] && own[n] !== slot) { seen[n] = 1; q.push(n); } }
      if (y < G - 1) { const n = c + G; if (!seen[n] && own[n] !== slot) { seen[n] = 1; q.push(n); } }
    }
    for (let c = 0; c < TOT; c++)
      if (!seen[c] && own[c] !== slot) { claim(c, slot); gained++; }

    // rivals swallowed whole are eliminated
    for (let i = 1; i <= DATA.BOTS; i++)
      if (i !== slot && ents[i].alive && counts[i] === 0)
        killEntity(i, slot, true);

    if (slot === 0 && gained > 0) {
      streak = (streakT > 0) ? Math.min(5, streak + 1) : 1;
      streakT = DATA.streakWin(save.up.momentum);
      const frac = counts[0] / TOT;
      const val = Math.floor(gained * DATA.cellValue(frac) * incomeMult() * streak);
      runHaul += val; terrCoins += val;
      addFloat(ent.x, ent.y - 24, '+' + fmt(val) + (streak > 1 ? ' ×' + streak : ''));
      A.capture(streak, gained > 25);
      peakPct = Math.max(peakPct, frac);
      if (counts[0] >= TOT) totalConquest();
      updateRunHUD();
    }
  }

  function killEntity(slot, killerSlot, swallowed) {
    const e = ents[slot];
    if (!e.alive) return;
    if (slot === 0) { playerDeath(killerSlot > 0 ? ents[killerSlot].rival.name : null); return; }
    e.alive = false;
    e.respawnT = DATA.RESPAWN;
    onMap.delete(e.rival.id);
    boomFx(e.x, e.y, rivalColor(e.rival));
    clearTrail(slot);
    const terr = counts[slot];          // measured before the kingdom dissolves
    for (let c = 0; c < TOT; c++) if (own[c] === slot) release(c);
    // the player gets paid + court credit
    if (killerSlot === 0 && state === ST.RUN) {
      kills++;
      const huntMult = edict().id === 'hunt' ? 2 : 1;
      let b = DATA.bountyFor(terr + 8) * DATA.bountyMult(save.up.bounty)
              * (1 + save.crowns * DATA.CROWN_BONUS) * (1 + frameBonus()) * huntMult;
      if (e.rival.rare) b *= DATA.RARE_BOUNTY;
      b = Math.floor(b * (goldenT > 0 ? 2 : 1));
      runHaul += b; bountyCoins += b;
      const n = (save.court[e.rival.id] || 0) + 1;
      save.court[e.rival.id] = n;
      addFloat(e.x, e.y, '+' + fmt(b));
      if (n === 1) {
        banner('⚔ FIRST TAKEDOWN: ' + e.rival.name.toUpperCase());
        A.bigkill();
        NR.SDK.happyTime();
      } else {
        banner(swallowed ? '👑 ' + e.rival.name.toUpperCase() + ' SWALLOWED WHOLE'
                         : '⚔ ' + e.rival.name.toUpperCase() + ' FALLS');
        A.kill();
      }
      updateRunHUD();
    }
  }

  /* ================= BOT AI ================= */
  function nearestOwnCell(slot, x, y) {
    let best = -1, bd = 1e12;
    for (let c = 0; c < TOT; c++) {
      if (own[c] !== slot) continue;
      const dx = (c % G + 0.5) * CS - x, dy = (((c / G) | 0) + 0.5) * CS - y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  function botDecide(b, dt) {
    b.decideT -= dt;
    if (b.decideT > 0) return;
    b.decideT = 0.18;
    const r = b.rival;
    const heads = ents.filter(e => e.alive && e.slot !== b.slot);

    // trail in danger → run home
    if (b.trail.length > 2) {
      for (const h of heads) {
        for (let i = 0; i < b.trail.length; i += 3) {
          const c = b.trail[i];
          const dx = (c % G + 0.5) * CS - h.x, dy = (((c / G) | 0) + 0.5) * CS - h.y;
          if (dx * dx + dy * dy < 130 * 130) {
            const home = nearestOwnCell(b.slot, b.x, b.y);
            if (home !== -1) { b.state = 'return'; b.wps = [cellPt(home)]; return; }
          }
        }
      }
    }
    // fear the player's swagger
    const p = ents[0];
    if (p.alive && b.trail.length === 0 && state === ST.RUN) {
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < DATA.fearR(save.up.swagger)) {
        b.state = 'flee';
        b.wps = [clampPt({ x: b.x + (b.x - p.x) * 2, y: b.y + (b.y - p.y) * 2 })];
        return;
      }
    }
    // hunt the player's trail
    const hunts = edict().hunt || Math.random() < r.agg * 0.35;
    if (hunts && p.alive && p.trail.length > 2 && state === ST.RUN) {
      let best = null, bd = 260 * 260;
      for (let i = 0; i < p.trail.length; i += 2) {
        const pt = cellPt(p.trail[i]);
        const d = (pt.x - b.x) ** 2 + (pt.y - b.y) ** 2;
        if (d < bd) { bd = d; best = pt; }
      }
      if (best) { b.state = 'hunt'; b.wps = [best]; return; }
    }
    // routine: raid loops out of home territory
    if (b.state === 'home' || b.wps.length === 0) {
      b.patience -= 0.18;
      if (b.patience <= 0) {
        const a = rand(0, Math.PI * 2), L = r.loop * CS;
        const p1 = clampPt({ x: b.x + Math.cos(a) * L, y: b.y + Math.sin(a) * L });
        const p2 = clampPt({ x: p1.x + Math.cos(a + Math.PI / 2) * L * 0.75,
                             y: p1.y + Math.sin(a + Math.PI / 2) * L * 0.75 });
        b.state = 'raid';
        b.wps = [p1, p2, null];    // null = "nearest own cell", resolved on arrival
        b.patience = rand(0.6, 2.4);
      }
    }
  }
  const cellPt = (c) => ({ x: (c % G + 0.5) * CS, y: (((c / G) | 0) + 0.5) * CS });
  const clampPt = (p) => ({ x: Math.max(CS, Math.min(WORLD - CS, p.x)),
                            y: Math.max(CS, Math.min(WORLD - CS, p.y)) });

  function botSteer(b, dt) {
    if (!b.wps.length) return;
    let t = b.wps[0];
    if (t === null) {
      const home = nearestOwnCell(b.slot, b.x, b.y);
      t = b.wps[0] = home !== -1 ? cellPt(home) : { x: WORLD / 2, y: WORLD / 2 };
    }
    const want = Math.atan2(t.y - b.y, t.x - b.x);
    steer(b, want, dt);
    if ((t.x - b.x) ** 2 + (t.y - b.y) ** 2 < 30 * 30) {
      b.wps.shift();
      if (!b.wps.length) b.state = 'home';
    }
  }

  function steer(e, want, dt) {
    let d = want - e.dir;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const mx = DATA.TURN * dt;
    e.dir += Math.max(-mx, Math.min(mx, d));
  }

  /* ================= SIMULATION ================= */
  function moveEnt(e, v, dt) {
    e.x += Math.cos(e.dir) * v * dt;
    e.y += Math.sin(e.dir) * v * dt;
    const m = CS * 0.3;
    e.x = Math.max(m, Math.min(WORLD - m, e.x));
    e.y = Math.max(m, Math.min(WORLD - m, e.y));
    const c = cellOf(e.x, e.y);
    if (c !== e.cell) enterCell(e, c);
  }

  function simulate(dt) {
    const sp = edict().speed;
    // player
    const p = ents[0];
    if (p.alive && state === ST.RUN) {
      if (pointer) {
        const wx = camX + (pointer.x - LW / 2), wy = camY + (pointer.y - LH * 0.5);
        if ((wx - p.x) ** 2 + (wy - p.y) ** 2 > 14 * 14)
          steer(p, Math.atan2(wy - p.y, wx - p.x), dt);
      }
      moveEnt(p, DATA.SPEED * DATA.speedMult(save.up.speed) * sp, dt);
    }
    // rivals (they also play the attract screen)
    for (let i = 1; i <= DATA.BOTS; i++) {
      const b = ents[i];
      if (!b.alive) {
        b.respawnT -= dt;
        if (b.respawnT <= 0) ents[i] = mkBot(i);
        continue;
      }
      botDecide(b, dt);
      botSteer(b, dt);
      moveEnt(b, DATA.SPEED * b.rival.spd * sp, dt);
      if (state !== ST.RUN && state !== ST.SURFACE) return; // a kill ended the round
    }
  }

  /* ================= FX ================= */
  function boomFx(x, y, color) {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(50, 260);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                       life: rand(0.35, 0.8), size: rand(2, 5), c: color });
    }
  }
  function addFloat(x, y, txt) { floats.push({ x, y, txt, t: 1 }); }
  function banner(txt) { bannerTxt = txt; bannerT = 2.2; }
  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.t -= dt * 0.85;
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
    if (streakT > 0) { streakT -= dt; if (streakT <= 0) { streak = 0; updateRunHUD(); } }
    updateFx(dt);

    if (state === ST.RUN || state === ST.SURFACE) simulate(dt);
    else if (state === ST.DYING) {
      dieT -= dt;
      if (dieT <= 0) (conquest ? endRound() : resolveDeath());
    }
    if (state === ST.RUN) updateRunHUD();   // % shifts as rivals raid too

    // camera: chase the player, or drift over the attract-mode court
    let tx, ty;
    if (state === ST.SURFACE) {
      tx = WORLD / 2 + Math.cos(tt * 0.13) * WORLD * 0.22;
      ty = WORLD / 2 + Math.sin(tt * 0.09) * WORLD * 0.22;
    } else { tx = ents[0].x; ty = ents[0].y; }
    camX += (tx - camX) * Math.min(1, dt * 5);
    camY += (ty - camY) * Math.min(1, dt * 5);

    if (state === ST.SURFACE) updateGoldenBtn();
  }

  /* ================= RENDER ================= */
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0c0a20'); g.addColorStop(1, '#151038');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offX + LW / 2 * scale, offY + LH * 0.5 * scale);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 16, rand(-1, 1) * shake * 16);
    ctx.translate(-camX, -camY);

    // arena floor + border
    ctx.fillStyle = 'rgba(255,255,255,.025)';
    ctx.fillRect(0, 0, WORLD, WORLD);
    ctx.strokeStyle = 'rgba(199,155,255,.6)';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#c79bff'; ctx.shadowBlur = 16;
    ctx.strokeRect(-3, -3, WORLD + 6, WORLD + 6);
    ctx.shadowBlur = 0;

    // visible cell range
    const x0 = Math.max(0, ((camX - LW / 2) / CS | 0) - 1), x1 = Math.min(G - 1, ((camX + LW / 2) / CS | 0) + 1);
    const y0 = Math.max(0, ((camY - LH / 2) / CS | 0) - 1), y1 = Math.min(G - 1, ((camY + LH / 2) / CS | 0) + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const c = y * G + x;
        if (own[c] !== -1) {
          ctx.fillStyle = colorOf(own[c]);
          // el turf del JUGADOR debe ser lo que más brille (antes .36 apagado
          // frente a rivales llamativos — énfasis invertido, auditoría visual)
          ctx.globalAlpha = own[c] === 0 ? 0.55 : 0.27;
          ctx.fillRect(x * CS, y * CS, CS - 1, CS - 1);
        }
        if (trailG[c] !== -1 && ents[trailG[c]].alive) {
          ctx.fillStyle = colorOf(trailG[c]);
          ctx.globalAlpha = 0.62;
          ctx.fillRect(x * CS + 5, y * CS + 5, CS - 10, CS - 10);
        }
      }
    }
    ctx.globalAlpha = 1;

    // frontera del reino del jugador: borde con glow (solo lados que dan
    // a celdas ajenas), para que su territorio se lea al instante
    ctx.strokeStyle = colorOf(0);
    ctx.lineWidth = 2;
    ctx.shadowColor = colorOf(0); ctx.shadowBlur = 9;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const c = y * G + x;
        if (own[c] !== 0) continue;
        const px = x * CS, py2 = y * CS;
        if (y === 0 || own[c - G] !== 0) { ctx.moveTo(px, py2); ctx.lineTo(px + CS, py2); }
        if (y === G - 1 || own[c + G] !== 0) { ctx.moveTo(px, py2 + CS); ctx.lineTo(px + CS, py2 + CS); }
        if (x === 0 || own[c - 1] !== 0) { ctx.moveTo(px, py2); ctx.lineTo(px, py2 + CS); }
        if (x === G - 1 || own[c + 1] !== 0) { ctx.moveTo(px + CS, py2); ctx.lineTo(px + CS, py2 + CS); }
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // heads
    for (const e of ents) {
      if (!e.alive) continue;
      if (e.slot === 0 && state === ST.SURFACE) continue;
      drawHead(e);
    }

    // particles (additive)
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
    ctx.font = '800 16px "Rajdhani","Segoe UI", sans-serif';
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, f.t * 1.6);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 8;
      ctx.fillText(f.txt, f.x, f.y - (1 - f.t) * 42);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // minimap (during runs)
    if (state !== ST.SURFACE) drawMinimap();

    // banner
    if (bannerT > 0) {
      const a = Math.min(1, bannerT, (2.2 - bannerT) * 3);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = '800 24px "Rajdhani","Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 20;
      ctx.fillText(bannerTxt, offX + LW / 2 * scale, offY + 292 * scale);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  function drawHead(e) {
    const color = colorOf(e.slot);
    const r = 13;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.slot === 0 && invuln > 0) ctx.globalAlpha = 0.5 + 0.5 * Math.sin(tt * 14);
    ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
    // eyes toward heading
    const ex = Math.cos(e.dir) * 4, ey = Math.sin(e.dir) * 4;
    ctx.fillStyle = 'rgba(10,8,24,.9)';
    ctx.beginPath(); ctx.arc(ex - 3.4, ey - 1, 2.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 3.4, ey - 1, 2.4, 0, 7); ctx.fill();
    // crown on the current territory leader
    let lead = 0, li = -1;
    for (let i = 0; i <= DATA.BOTS; i++) if (counts[i] > lead) { lead = counts[i]; li = i; }
    if (li === e.slot && lead > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(-8, -r - 3); ctx.lineTo(-5, -r - 10); ctx.lineTo(-1.5, -r - 4);
      ctx.lineTo(1.5, -r - 11); ctx.lineTo(4.5, -r - 4); ctx.lineTo(8, -r - 10);
      ctx.lineTo(8, -r - 3);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // name tags on rivals
    if (e.slot !== 0) {
      ctx.textAlign = 'center';
      ctx.font = '700 10px "Rajdhani","Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.fillText(e.rival.name, e.x, e.y - 22);
    }
  }

  function drawMinimap() {
    const S = 88, px = 2.2 * (40 / G);
    const mx = offX + (LW - S - 10) * scale, my = offY + 96 * scale;
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(7,6,20,.8)';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(199,155,255,.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, S, S);
    const k = S / G;
    for (let c = 0; c < TOT; c++) {
      if (own[c] === -1) continue;
      ctx.fillStyle = colorOf(own[c]);
      ctx.globalAlpha = own[c] === 0 ? 0.95 : 0.55;
      ctx.fillRect((c % G) * k, ((c / G) | 0) * k, k + 0.5, k + 0.5);
    }
    ctx.globalAlpha = 1;
    const p = ents[0];
    if (p.alive) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x / WORLD * S, p.y / WORLD * S, 2.4, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  /* ================= HUD / SHEET ================= */
  function updateHUD() {
    $('coins').textContent = fmt(save.coins);
    $('crownTag').textContent = save.crowns > 0 ? ' 👑' + save.crowns : '';
    $('surfBest').textContent = save.bestPct + '%';
  }

  function updateRunHUD() {
    // con arenas grandes el asentamiento inicial redondeaba a "0%" aunque
    // hubiera territorio (hallazgo de auditoría) → decimales bajo el 10%
    const pct = counts[0] / TOT * 100;
    $('runPct').textContent = (pct > 0 && pct < 9.95 ? pct.toFixed(1) : Math.round(pct)) + '%';
    $('runCoins').textContent = '+' + fmt(Math.floor(runHaul));
    $('runKills').textContent = kills + ' takedown' + (kills === 1 ? '' : 's');
    const sb = $('streakBadge');
    if (streak > 1) {
      sb.classList.remove('hidden');
      sb.textContent = '×' + streak + ' STREAK';
    } else sb.classList.add('hidden');
  }

  let goldenLbl = '';
  function updateGoldenBtn() {
    const b = $('btnGolden');
    let lbl;
    if (goldenT > 0) { lbl = '×2 ACTIVE · ' + Math.ceil(goldenT) + 's'; b.className = 'gold-btn on'; }
    else if (goldenCd > 0) { lbl = 'READY IN ' + fmtTime(goldenCd); b.className = 'gold-btn cooling'; }
    else { lbl = '▶ GOLDEN CROWN'; b.className = 'gold-btn'; }
    if (lbl !== goldenLbl) {
      goldenLbl = lbl;
      b.innerHTML = lbl + '<small>watch ad · 60s ×2 + armor</small>';
    }
  }

  /* ---------- sheet tabs ---------- */
  let tab = 'shop';
  function renderSheet() {
    if (tab === 'shop') renderShop();
    else if (tab === 'court') renderCourt();
    else renderReign();
  }

  function renderShop() {
    $('sheetBody').innerHTML =
      `<div class="up-head">◉ <b>${fmt(save.coins)}</b>${save.edict !== 'none' ? ` · <span class="edict-tag">${edict().name}</span>` : ''}</div>` +
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

  function renderCourt() {
    const body = $('sheetBody');
    const known = DATA.rivals.filter(r => (save.court[r.id] || 0) > 0).length;
    body.innerHTML = '<div class="up-head">THE COURT — <b>' + known + '/' + DATA.rivals.length +
      '</b> rivals humbled · frames pay <b>+2%</b> each</div>' +
      '<div class="court-grid">' + DATA.rivals.map(r => {
        const n = save.court[r.id] || 0;
        const f = DATA.frameOf(n);
        const cls = ['', 'bronze', 'silver', 'goldf'][f];
        return `<div class="court-card ${n ? cls : 'unknown'} ${r.rare ? 'rare' : ''}">
          <canvas class="court-canvas" data-rival="${r.id}" width="128" height="128"></canvas>
          <div class="court-name">${n ? r.name : '???'}</div>
          <div class="court-sub">${n ? n + ' takedown' + (n === 1 ? '' : 's') : (r.rare ? 'RARE · ×5 bounty' : 'undefeated')}</div>
          <div class="court-quip">${n ? r.quip : ''}</div>
        </div>`;
      }).join('') + '</div>';
    body.querySelectorAll('canvas[data-rival]').forEach(el => {
      const r = DATA.rivals.find(x => x.id === el.dataset.rival);
      const n = save.court[r.id] || 0;
      const g2 = el.getContext('2d');
      g2.clearRect(0, 0, 128, 128);
      g2.save();
      g2.translate(64, 66);
      const col = n ? rivalColor(r) : '#2a2f50';
      g2.fillStyle = col;
      g2.beginPath(); g2.arc(0, 0, 34, 0, 7); g2.fill();
      g2.strokeStyle = 'rgba(255,255,255,.7)'; g2.lineWidth = 4;
      g2.beginPath(); g2.arc(0, 0, 34, 0, 7); g2.stroke();
      g2.fillStyle = 'rgba(10,8,24,.9)';
      g2.beginPath(); g2.arc(-10, -4, 6, 0, 7); g2.fill();
      g2.beginPath(); g2.arc(10, -4, 6, 0, 7); g2.fill();
      if (n) {
        g2.fillStyle = '#ffd166';
        g2.beginPath();
        g2.moveTo(-20, -38); g2.lineTo(-13, -56); g2.lineTo(-4, -42);
        g2.lineTo(4, -58); g2.lineTo(12, -42); g2.lineTo(20, -56); g2.lineTo(20, -38);
        g2.closePath(); g2.fill();
      }
      g2.restore();
    });
  }

  function renderReign() {
    const body = $('sheetBody');
    const gain = DATA.crownsFor(save.cycleLife);
    const ready = gain >= 1;
    let html = `<div class="reign-page">
      <div class="reign-title">👑 A NEW REIGN</div>
      <div class="reign-stats">
        <span>Crowns <b>${save.crowns}</b></span>
        <span>This reign <b>${fmt(save.cycleLife)}</b></span>
        <span>Abdications <b>${save.prestiges}</b></span>
      </div>
      <p class="reign-text">Abdicate the throne. Coins &amp; upgrades reset — but every Crown pays <b>+3% income, forever</b>. The Court remembers its defeats.</p>`;
    if (ready) {
      html += `<button class="release-btn ready" data-action="release">ABDICATE<small>+${gain} 👑 Crown${gain > 1 ? 's' : ''}</small></button>`;
    } else {
      html += `<div class="reign-locked">Earn <b>${fmt(DATA.PRESTIGE_LIFETIME)}</b> coins this reign to abdicate.<br>Progress: <b>${Math.min(100, Math.floor(save.cycleLife / DATA.PRESTIGE_LIFETIME * 100))}%</b></div>`;
    }
    if (save.prestiges > 0) {
      html += `<div class="edicts">` + DATA.edicts.map(e =>
        `<button class="edict ${save.edict === e.id ? 'on' : ''}" data-action="edict:${e.id}">
          <div class="edict-mid"><div class="edict-nm">${e.name}</div><div class="edict-ds">${e.desc}</div></div>
          <div class="edict-pick">${save.edict === e.id ? '● ACTIVE' : 'PICK'}</div>
        </button>`).join('') + `</div>`;
    } else {
      html += `<div class="reign-text" style="margin-top:10px;">Crowns also unlock <b>Edicts</b> — crueler arenas that pay more.</div>`;
    }
    html += '</div>';
    body.innerHTML = html;
  }

  /* ---------- prestige ---------- */
  function doPrestige() {
    const gain = DATA.crownsFor(save.cycleLife);
    if (gain < 1) return;
    save.crowns += gain;
    save.prestiges++;
    save.coins = 0; save.cycleLife = 0;
    DATA.upgrades.forEach(u => save.up[u.id] = 0);
    persist();
    newArena(false);
    A.prestige();
    NR.SDK.happyTime();
    hide('relModal');
    renderSheet(); updateHUD();
    banner('👑 A NEW REIGN BEGINS');
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= INPUT ================= */
  function logicalPt(e) {
    return { x: (e.clientX - offX) / scale, y: (e.clientY - offY) / scale };
  }
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .sheet, .modal, .overlay')) return;
    A.resume();
    if (state === ST.SURFACE) { startRound(); pointer = logicalPt(e); return; }
    if (state === ST.RUN) pointer = logicalPt(e);
  });
  window.addEventListener('pointermove', (e) => {
    if (pointer && state === ST.RUN) pointer = logicalPt(e);
  });
  window.addEventListener('pointerup', () => { pointer = null; });
  window.addEventListener('pointercancel', () => { pointer = null; });
  // desktop QoL: arrow keys steer directly
  window.addEventListener('keydown', (e) => {
    const dirs = { ArrowUp: -Math.PI / 2, ArrowDown: Math.PI / 2, ArrowLeft: Math.PI, ArrowRight: 0 };
    if (!(e.code in dirs)) return;
    A.resume();
    if (state === ST.SURFACE) { startRound(); return; }
    if (state === ST.RUN) ents[0].dir = dirs[e.code];
  });

  /* ================= BUTTONS ================= */
  $('btnPlay').addEventListener('click', () => { if (state === ST.SURFACE) { A.tap(); startRound(); } });

  $('btnGolden').addEventListener('click', () => {
    if (goldenT > 0 || goldenCd > 0) { A.deny(); return; }
    NR.SDK.rewardedAd(() => {
      goldenT = 60; goldenCd = 180;
      A.golden();
      banner('👑 GOLDEN CROWN — ×2 FOR 60s');
    }, () => A.deny());
  });

  $('btnDouble').addEventListener('click', () => {
    NR.SDK.rewardedAd(() => { A.golden(); bank(2); }, () => A.deny());
  });
  $('btnCollect').addEventListener('click', () => bank(1));

  $('scTake').addEventListener('click', () => {
    NR.SDK.rewardedAd(secondChance, () => { A.deny(); hide('scModal'); endRound(); });
  });
  $('scDecline').addEventListener('click', () => { hide('scModal'); endRound(); });

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
    } else if (act === 'edict') {
      save.edict = id; A.tap(); persist();
      newArena(false);             // rebuild the attract arena at the new size
      renderReign();
    } else if (act === 'release') {
      $('relGain').textContent = '+' + DATA.crownsFor(save.cycleLife) + ' 👑';
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
    const text = `I claimed ${save.bestPct}% of the map in NEONREIGN 👑 — come take my turf.`;
    let url = location.href;
    const cg = await NR.SDK.invite({ best: save.bestPct });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'NeonReign', text, url }); return; } } catch (e) {}
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      const el = $('shareToast');
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1600);
    } catch (e) {}
  }

  /* ================= TRIBUTE (offline) ================= */
  let tribPending = 0;
  function offlineCheck() {
    const lvl = save.up.tribute;
    const awaySec = (Date.now() - save.lastSeen) / 1000;
    if (lvl <= 0 || awaySec < 120 || save.bestHaul <= 0) return;
    const mins = Math.min(awaySec / 60, DATA.TRIBUTE_CAP_H * 60);
    const amount = Math.floor(DATA.tributeRate(lvl, save.bestHaul) * mins * (1 + save.crowns * DATA.CROWN_BONUS));
    if (amount < 1) return;
    tribPending = amount;
    $('tribTime').textContent = fmtTime(awaySec);
    $('tribAmount').textContent = fmt(amount);
    show('tribModal');
  }
  function tribCollect(mult) {
    save.coins += tribPending * mult;
    save.lifetime += tribPending * mult;
    save.cycleLife += tribPending * mult;
    tribPending = 0;
    persist();
    A.cash();
    hide('tribModal');
    renderSheet(); updateHUD();
  }
  $('tribCollect').addEventListener('click', () => tribCollect(1));
  $('tribDouble').addEventListener('click', () => {
    NR.SDK.rewardedAd(() => tribCollect(2), () => A.deny());
  });

  /* ================= BOOT + LOOP ================= */
  (async function boot() {
    NR.SDK.loadingStart();
    // init del SDK en paralelo: bloqueaba el arranque (attract congelado)
    const sdkReady = NR.SDK.init();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    newArena(false);
    renderSheet(); updateHUD();
    offlineCheck();
    requestAnimationFrame(loop);
    await sdkReady;
    NR.SDK.loadingStop();
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
