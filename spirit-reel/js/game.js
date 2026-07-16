/* ============================================================
   SPIRIT REEL — lower your lantern into a bottomless haunted
   well. Dodge spirits on the way down; catch them on the way
   up; sell your haul; upgrade; go deeper.

   • 6 zones, 18 species, 10 named Legendaries at fixed depths
   • Spirit Museum collection with catch-count frames
   • Séance offline earnings, daily Wanted Ghost, first-run ×3
   • Prestige: The Great Release → permanent Blessings
   • Tiny-Fishing-proven loop; all art procedural canvas

   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = SR.Audio;

  /* ================= CONSTANTS ================= */
  const LW = 480, LH = 720;
  const PXM = 10;                    // px per meter
  const WALL = 42;                   // wall thickness
  const LR = 13;                     // lantern radius

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'spiritReel_v1';
  const save = {
    coins: 0, lifetime: 0,
    up: {},                          // upgrade id -> level
    mus: {},                         // species id -> {n, rad, best}
    named: {},                       // named id -> catch count
    blessings: 0, releases: 0, modifier: 'none',
    bestDepth: 0, bestHaul: 0,
    lastSeen: Date.now(), lastDay: '', wantedDone: 0,
    goldenUntil: 0, goldenCd: 0,
    sound: true, runs: 0,
  };
  DATA.upgrades.forEach(u => save.up[u.id] = 0);
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  function persist() {
    save.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  A.enabled = save.sound;

  const dayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  };
  const dayNum = () => Math.floor(Date.now() / 86400000);

  /* ================= DERIVED ================= */
  const mod = () => DATA.modifiers.find(m => m.id === save.modifier) || DATA.modifiers[0];
  const maxDepthM = () => DATA.maxDepth(save.up.rope);
  const capacity = () => Math.max(1, Math.round(DATA.capacity(save.up.cap) / (mod().id === 'whisper' ? 2 : 1)));
  const sinkSpeed = (depth) => Math.min(130, 60 * Math.pow(1.04, DATA.zoneAt(depth))) * PXM / 10;
  const reelMult = () => 1.5 + 0.06 * save.up.reel;
  const magnetR = () => 8 * save.up.sense;
  const goldenActive = () => Date.now() < save.goldenUntil;

  function frameLvl(n) { return n >= 250 ? 3 : n >= 50 ? 2 : n >= 10 ? 1 : 0; }
  function zoneComplete(z) {
    return DATA.species.filter(s => s.zone === z).every(s => save.mus[s.id] && save.mus[s.id].n > 0);
  }
  function globalZoneBonus() {
    let b = 1;
    for (let z = 0; z < DATA.zones.length; z++) if (zoneComplete(z)) b += 0.10;
    return b;
  }
  function valueMult(speciesId) {
    let m = (1 + 0.10 * save.up.value) * (1 + 0.02 * save.blessings) * globalZoneBonus() * mod().value;
    if (speciesId && save.mus[speciesId]) m *= 1 + 0.05 * frameLvl(save.mus[speciesId].n);
    if (goldenActive()) m *= 2;
    return m;
  }
  function rarityRoll() {
    const shift = save.up.incense * 0.5 * mod().rare; // % moved from common to rarer
    let roll = Math.random() * 100;
    roll += shift;                                    // pushes past common band
    let acc = 0;
    for (let i = 0; i < DATA.rarities.length; i++) {
      acc += DATA.rarities[i].p * (i >= 2 ? mod().rare : 1);
      if (roll < acc || i === DATA.rarities.length - 1) return i;
    }
    return 0;
  }

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
  const toL = (cx, cy) => ({ x: (cx - offX) / scale, y: (cy - offY) / scale });

  /* ================= RUN STATE ================= */
  const ST = { SURFACE: 0, DESCEND: 1, ASCEND: 2, SUMMARY: 3, PAUSED: 4 };
  let state = ST.SURFACE;
  let tt = 0, timeScale = 1;
  let lx = LW / 2, ly = 0;           // lantern pos (world px; ly 0 = well mouth)
  let steerX = LW / 2, pointerHeld = false;
  let ghosts = [], caught = [], spawnedTo = 0;
  let combo = 0, wardsLeft = 0, usedSW = false, offeredSW = false;
  let runValue = 0, runByKind = {};  // id -> {name,n,val,rar}
  let newBestShown = false, lastZone = -1;
  let shake = 0, slowmoT = 0, flashA = 0;
  let bannerTxt = '', bannerT = 0, bannerCol = '#ffd88a';
  const particles = [], floats = [];
  let pendingHaul = 0, firstRunToday = false;
  let wantedId = null, wantedCaught = 0;
  let sessionRuns = 0;

  const rand = (a, b) => a + Math.random() * (b - a);

  /* ================= SPAWNING ================= */
  function speciesOfZone(z) {
    const pool = DATA.species.filter(s => s.zone === z);
    return pool[(Math.random() * pool.length) | 0];
  }
  function spawnBand(fromPx, toPx) {
    const m = mod();
    for (let y = fromPx; y < toPx; y += 100) {
      const depthM = y / PXM;
      const z = DATA.zoneAt(depthM);
      const zone = DATA.zones[z];
      const n = Math.round(zone.density * m.density * rand(0.8, 1.2));
      for (let i = 0; i < n; i++) {
        const sp = speciesOfZone(z);
        const rar = rarityRoll();
        ghosts.push({
          sp, rar, radiant: Math.random() < 0.01,
          baseX: rand(WALL + 30, LW - WALL - 30),
          y: y + rand(0, 100), x: 0,
          ph: rand(0, 6), amp: rand(24, 70),
          spd: zone.speed * m.speed * rand(0.8, 1.25) / 40,
          size: sp.size * rand(0.9, 1.15),
          named: null, scared: 0,
        });
      }
      // named legendary in this band?
      for (const nd of DATA.named) {
        const ndPx = nd.depth * PXM;
        if (ndPx >= y && ndPx < y + 100) {
          const caughtBefore = (save.named[nd.id] || 0) > 0;
          if (!caughtBefore || Math.random() < 0.25) {
            ghosts.push({
              sp: null, named: nd, rar: 4, radiant: false,
              baseX: LW / 2, y: ndPx, x: 0,
              ph: rand(0, 6), amp: 90, spd: 0.6,
              size: nd.size, scared: 0,
            });
          }
        }
      }
    }
  }

  /* ================= RUN FLOW ================= */
  function startRun() {
    if (state !== ST.SURFACE) return;
    state = ST.DESCEND;
    ly = 10; lx = LW / 2; steerX = LW / 2;
    ghosts = []; caught = []; spawnedTo = 0;
    combo = 0; runValue = 0; runByKind = {};
    runMaxY = 0;
    wardsLeft = save.up.ward; offeredSW = false;
    newBestShown = false; lastZone = 0;
    spawnBand(40, 900); // spirits from 4m so the very first 12m rope catches
    spawnedTo = 900;
    hide('sheet');
    show('runHud');
    A.resume(); A.turn();
    SR.SDK.gameplayStart();
  }

  function beginAscent() {
    if (state !== ST.DESCEND) return;
    state = ST.ASCEND;
    A.turn();
  }

  /* Touching a spirit on descent HOOKS it (Tiny-Fishing rule):
     it's caught, and the ascent begins. Warding phases through it
     instead; Second Wind releases it and keeps you sinking. */
  let pendingBump = null;
  function bump(g, idx) {
    if (wardsLeft > 0) {
      wardsLeft--;
      g.scared = 1;
      puff(g); A.bump();
      banner('WARDED — kept sinking! ' + wardsLeft + ' left', '#5de08a');
      return;
    }
    if (!usedSW && !offeredSW && ly / PXM > maxDepthM() * 0.5 && sessionRuns > 1) {
      offeredSW = true;
      pendingBump = g;
      state = ST.PAUSED;
      show('swModal');
      return;
    }
    hookAndTurn(g, idx);
  }
  function hookAndTurn(g, idx) {
    if (idx === undefined || ghosts[idx] !== g) idx = ghosts.indexOf(g);
    if (idx >= 0) catchGhost(g, idx);
    shake = Math.max(shake, 0.12);
    beginAscent();
  }

  function catchGhost(g, idx) {
    ghosts.splice(idx, 1);
    combo++;
    const depthM = g.y / PXM;
    let val, kindId, kindName, rarIdx = g.rar;
    if (g.named) {
      val = Math.round(DATA.baseValue(g.named.depth) * 200 * g.named.bonus * valueMult(null));
      kindId = 'N:' + g.named.id; kindName = g.named.name;
      const first = !(save.named[g.named.id] > 0);
      save.named[g.named.id] = (save.named[g.named.id] || 0) + 1;
      A.named();
      slowmoT = 0.8; shake = 0.4; flashA = 0.5;
      banner(first ? '★ ' + g.named.name.toUpperCase() + ' CAPTURED! ★' : g.named.name + ' returns…', '#f0c04d');
      if (first) { A.best(); SR.SDK.happyTime(); }
    } else {
      const R = DATA.rarities[g.rar];
      val = Math.round(DATA.baseValue(depthM) * R.mult * (g.radiant ? 10 : 1) * valueMult(g.sp.id));
      kindId = g.sp.id; kindName = g.sp.name;
      // wanted bounty
      if (wantedId === g.sp.id) {
        val *= 5;
        wantedCaught++;
        if (wantedCaught === 3 && !save.wantedDone) {
          save.wantedDone = dayNum();
          const bounty = 200 * Math.pow(g.sp.zone + 1, 2) * Math.round(valueMult(null));
          runValue += bounty;
          banner('WANTED BOUNTY +' + fmt(bounty) + '!', '#f0c04d');
          A.best();
        }
        updateWantedChip();
      }
      // museum
      const mrec = save.mus[g.sp.id] || (save.mus[g.sp.id] = { n: 0, rad: 0, best: 0 });
      const wasNew = mrec.n === 0;
      const oldFrame = frameLvl(mrec.n);
      mrec.n++;
      if (g.radiant) { mrec.rad++; A.radiant(); banner('✦ RADIANT ' + kindName.toUpperCase() + '! ✦', '#fff'); flashA = 0.5; }
      mrec.best = Math.max(mrec.best, Math.round(depthM));
      if (wasNew) {
        A.card();
        banner('NEW SPIRIT: ' + kindName, DATA.rarities[g.rar].c);
        if (zoneComplete(g.sp.zone)) { banner(DATA.zones[g.sp.zone].name.toUpperCase() + ' COMPLETE! +10%', '#5de08a'); A.best(); }
      } else if (frameLvl(mrec.n) > oldFrame) {
        banner(kindName + ' — ' + ['', 'BRONZE', 'SILVER', 'GOLD'][frameLvl(mrec.n)] + ' FRAME! +5%', '#f0c04d');
        A.card();
      }
      if (g.rar >= 3) { A.rare(); slowmoT = 0.4; }
      A.catch(combo, g.rar);
    }
    runValue += val;
    const rec = runByKind[kindId] || (runByKind[kindId] = { name: kindName, n: 0, val: 0, rar: rarIdx });
    rec.n++; rec.val += val;
    caught.push(g);
    wisps(lx, ly, g.named ? 14 : 6, g.named ? g.named.hue : g.sp.hue);
    addFloat(lx, ly - 30, '+' + fmt(val));
  }

  function surface() {
    state = ST.SUMMARY;
    sessionRuns++; save.runs++;
    // first run of the day ×3
    firstRunToday = save.lastDay !== dayStr();
    if (firstRunToday) save.lastDay = dayStr();
    let total = Math.round(runValue * (firstRunToday ? 3 : 1));
    pendingHaul = total;
    const depthReached = Math.round(Math.max(save.bestDepth, ly / PXM)); // ly is max? track separately
    A.haul(total > save.bestHaul);
    if (total > save.bestHaul) save.bestHaul = total;
    persist();
    // fill summary modal
    $('sumHaul').textContent = fmt(total);
    $('sumX3').classList.toggle('hidden', !firstRunToday);
    $('sumDepth').textContent = Math.round(runMaxY / PXM) + 'm';
    const kinds = Object.values(runByKind).sort((a, b) => b.val - a.val).slice(0, 5);
    $('sumList').innerHTML = kinds.map(k =>
      `<div class="sum-row"><span style="color:${DATA.rarities[k.rar] ? DATA.rarities[k.rar].c : '#f0c04d'}">${k.name} ×${k.n}</span><b>+${fmt(k.val)}</b></div>`
    ).join('') || '<div class="sum-row empty">The well was quiet…</div>';
    $('btnDouble').classList.toggle('hidden', total <= 0);
    show('sumModal');
    hide('runHud');
    SR.SDK.gameplayStop();
  }

  function collectHaul() {
    save.coins += pendingHaul;
    save.lifetime += pendingHaul;
    pendingHaul = 0;
    hide('sumModal');
    // midgame at the natural break (guarded for the first runs of a session)
    if (sessionRuns > 3) SR.SDK.midgameAd(backToSurface);
    else backToSurface();
  }
  function backToSurface() {
    state = ST.SURFACE;
    ly = 0; caught = []; ghosts = [];
    show('sheet');
    renderShop(); updateHUD();
    persist();
  }

  /* ================= UPDATE ================= */
  let runMaxY = 0;
  function update(rdt) {
    tt += rdt;
    timeScale = slowmoT > 0 ? 0.45 : 1;
    if (slowmoT > 0) slowmoT -= rdt;
    const dt = rdt * timeScale;
    if (shake > 0) shake -= rdt;
    if (flashA > 0) flashA -= rdt * 2;
    if (bannerT > 0) bannerT -= rdt;
    updateFx(dt);

    if (state === ST.DESCEND || state === ST.ASCEND) {
      const depthM = ly / PXM;
      // steering
      const targetX = Math.max(WALL + LR + 4, Math.min(LW - WALL - LR - 4, steerX));
      const dx = targetX - lx;
      lx += Math.max(-320 * dt, Math.min(320 * dt, dx * 8 * dt));

      if (state === ST.DESCEND) {
        ly += sinkSpeed(depthM) * dt;
        runMaxY = Math.max(runMaxY, ly);
        if (ly >= maxDepthM() * PXM) { ly = maxDepthM() * PXM; beginAscent(); }
        // spawn ahead
        if (spawnedTo < ly + 900) { spawnBand(spawnedTo, ly + 900); spawnedTo = ly + 900; }
        // zone banner
        const z = DATA.zoneAt(depthM);
        if (z !== lastZone) { lastZone = z; banner(DATA.zones[z].name.toUpperCase(), DATA.zones[z].glow); A.zone(); }
        // new best
        if (!newBestShown && depthM > save.bestDepth && save.bestDepth > 0) {
          newBestShown = true;
          banner('NEW BEST DEPTH!', '#fff'); A.best();
        }
        save.bestDepth = Math.max(save.bestDepth, Math.round(depthM));
      } else {
        ly -= sinkSpeed(depthM) * reelMult() * dt;
        if (ly <= 0) { ly = 0; surface(); return; }
      }

      // ghosts update + collision
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const g = ghosts[i];
        if (g.scared > 0) { g.scared -= dt * 2; if (g.scared <= 0) { ghosts.splice(i, 1); continue; } }
        if (Math.abs(g.y - ly) > LH) { // off-screen: cheap update
          g.x = g.baseX + Math.sin(tt * g.spd + g.ph) * g.amp;
          continue;
        }
        const sp = g.named ? { pattern: 'sine' } : g.sp;
        if (sp.pattern === 'zigzag') {
          const s = Math.sin(tt * g.spd * 1.6 + g.ph);
          g.x = g.baseX + (s > 0 ? 1 : -1) * Math.min(Math.abs(s) * 2, 1) * g.amp;
        } else if (sp.pattern === 'pursuit') {
          g.baseX += Math.max(-30 * dt, Math.min(30 * dt, (lx - g.baseX) * 0.4 * dt));
          g.x = g.baseX + Math.sin(tt * g.spd + g.ph) * g.amp * 0.4;
        } else if (sp.pattern === 'swarm') {
          g.x = g.baseX + Math.sin(tt * g.spd * 1.4 + g.ph) * g.amp * 0.7;
          g.y += Math.sin(tt * 2.2 + g.ph) * 12 * dt;
        } else {
          g.x = g.baseX + Math.sin(tt * g.spd + g.ph) * g.amp * (sp.pattern === 'drift' ? 0.5 : 1);
        }
        if (g.scared > 0) continue;
        const rr2 = (LR + g.size + (state === ST.ASCEND ? magnetR() + (goldenActive() ? 26 : 0) : 0));
        const ddx = g.x - lx, ddy = g.y - ly;
        if (ddx * ddx + ddy * ddy < rr2 * rr2) {
          if (state === ST.DESCEND) { bump(g, i); if (state !== ST.DESCEND) break; }
          else if (caught.length < capacity()) catchGhost(g, i);
        }
      }
    }
  }

  /* ================= FX ================= */
  function wisps(x, y, n, hue) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(30, 140);
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
                       life: rand(0.4, 0.8), size: rand(2, 4), hue });
    }
  }
  function puff(g) { wisps(g.x, g.y, 10, g.named ? g.named.hue : g.sp.hue); }
  function addFloat(x, y, txt) {
    if (floats.length > 10) floats.shift();
    floats.push({ x, y, txt, t: 1 });
  }
  function banner(txt, col) { bannerTxt = txt; bannerT = 2; bannerCol = col || '#ffd88a'; }
  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy -= 30 * dt; // wisps float up
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= 40 * dt; f.t -= dt * 0.9;
      if (f.t <= 0) floats.splice(i, 1);
    }
  }

  /* ================= RENDER ================= */
  function hexLerp(h1, h2, t) {
    const a = [1, 3, 5].map(i => parseInt(h1.slice(i, i + 2), 16));
    const b = [1, 3, 5].map(i => parseInt(h2.slice(i, i + 2), 16));
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  }
  function zoneBlend(depthM) {
    const zi = DATA.zoneAt(depthM);
    const z = DATA.zones[zi], nz = DATA.zones[Math.min(zi + 1, DATA.zones.length - 1)];
    const span = (nz.from - z.from) || 1;
    const t = Math.max(0, Math.min(1, (depthM - z.from) / span));
    return {
      bg0: hexLerp(z.bg0, nz.bg0, t), bg1: hexLerp(z.bg1, nz.bg1, t),
      wall: hexLerp(z.wall, nz.wall, t), glow: z.glow,
    };
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const depthM = ly / PXM;
    const zb = zoneBlend(depthM);

    // full-window background
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, zb.bg0); g.addColorStop(1, zb.bg1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 13, rand(-1, 1) * shake * 13);

    const camY = ly - LH * 0.38;

    drawWalls(camY, zb);
    if (camY < 120) drawSurfaceScene(camY);
    drawBestDepthLine(camY);

    // ghosts
    for (const gh of ghosts) {
      const sy = gh.y - camY;
      if (sy < -80 || sy > LH + 80) continue;
      const hue = gh.named ? gh.named.hue : gh.sp.hue;
      const acc = gh.named ? gh.named.acc : gh.sp.acc;
      const eyes = gh.named ? 2 : gh.sp.eyes;
      drawGhost(ctx, gh.x, sy + Math.sin(tt * 2 + gh.ph) * 4, gh.size, hue,
                { acc, eyes, radiant: gh.radiant, rar: gh.rar, named: !!gh.named, alpha: gh.scared > 0 ? gh.scared : 1 });
    }

    drawRope(camY);
    drawCaughtChain(camY);
    drawLantern(lx, ly - camY);

    // particles (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = `hsl(${p.hue},90%,70%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y - camY, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // floats
    ctx.textAlign = 'center';
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, f.t * 1.5);
      ctx.font = '800 17px "Rajdhani","Segoe UI", sans-serif';
      ctx.fillStyle = '#ffe9b0';
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 4;
      ctx.fillText(f.txt, f.x, f.y - camY);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // banner
    if (bannerT > 0) {
      ctx.globalAlpha = Math.min(1, bannerT * 2, (2 - bannerT) * 3);
      ctx.font = '800 24px "Rajdhani","Segoe UI", sans-serif';
      ctx.fillStyle = bannerCol;
      ctx.shadowColor = bannerCol; ctx.shadowBlur = 18;
      ctx.fillText(bannerTxt, LW / 2, 150);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // white flash
    if (flashA > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, flashA)})`;
      ctx.fillRect(-30, -30, LW + 60, LH + 60);
    }

    ctx.restore();
  }

  function drawWalls(camY, zb) {
    ctx.fillStyle = zb.wall;
    ctx.fillRect(0, 0, WALL, LH);
    ctx.fillRect(LW - WALL, 0, WALL, LH);
    // brick seams
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 2;
    const bh = 46, off = ((-camY) % bh + bh) % bh;
    for (let y = off - bh; y < LH; y += bh) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WALL, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(LW - WALL, y + bh / 2); ctx.lineTo(LW, y + bh / 2); ctx.stroke();
    }
    // inner edge glow
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(WALL, 0, 8, LH);
    ctx.fillRect(LW - WALL - 8, 0, 8, LH);
    // depth ruler
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.font = '700 10px "Rajdhani","Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    const step = 25 * PXM;
    for (let wy = Math.floor(camY / step) * step; wy < camY + LH + step; wy += step) {
      if (wy <= 0) continue;
      const sy = wy - camY;
      ctx.fillRect(WALL, sy, 7, 1.5);
      ctx.fillText((wy / PXM) + 'm', 4, sy + 4);
    }
  }

  function drawSurfaceScene(camY) {
    const horizon = -camY;
    // night sky above the well mouth
    const sky = ctx.createLinearGradient(0, horizon - 260, 0, horizon);
    sky.addColorStop(0, '#0a1030'); sky.addColorStop(1, '#141d3d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, horizon - 300, LW, 300);
    // moon
    ctx.fillStyle = '#f4ecd8';
    ctx.shadowColor = '#f4ecd8'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(LW * 0.78, horizon - 190, 26, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    ctx.beginPath(); ctx.arc(LW * 0.80, horizon - 196, 7, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(LW * 0.74, horizon - 180, 5, 0, 7); ctx.fill();
    // stars
    for (let i = 0; i < 24; i++) {
      const sx = (i * 97 % LW), sy2 = horizon - 40 - (i * 53 % 220);
      ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(tt * 1.2 + i));
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx, sy2, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    // stone rim
    ctx.fillStyle = '#3a4152';
    ctx.fillRect(0, horizon - 22, WALL + 26, 22);
    ctx.fillRect(LW - WALL - 26, horizon - 22, WALL + 26, 22);
    ctx.fillStyle = '#2c3242';
    ctx.fillRect(0, horizon - 6, WALL + 26, 6);
    ctx.fillRect(LW - WALL - 26, horizon - 6, WALL + 26, 6);
    // gallows arm holding the rope
    ctx.strokeStyle = '#4a3826';
    ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(LW / 2 - 130, horizon - 8);
    ctx.lineTo(LW / 2 - 130, horizon - 150);
    ctx.lineTo(LW / 2, horizon - 150);
    ctx.stroke();
  }

  function drawBestDepthLine(camY) {
    if (save.bestDepth < 5) return;
    const wy = save.bestDepth * PXM - camY;
    if (wy < 0 || wy > LH) return;
    ctx.strokeStyle = 'rgba(240,192,77,.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(WALL, wy); ctx.lineTo(LW - WALL, wy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(240,192,77,.6)';
    ctx.font = '700 10px "Rajdhani","Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BEST ' + save.bestDepth + 'm', LW - WALL - 6, wy - 5);
  }

  function drawRope(camY) {
    const topY = Math.max(-camY - 150, -20);
    ctx.strokeStyle = '#8a7351';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(LW / 2, topY);
    ctx.quadraticCurveTo(LW / 2, (topY + ly - camY) / 2, lx, ly - camY - LR - 4);
    ctx.stroke();
  }

  function drawCaughtChain(camY) {
    const show = Math.min(caught.length, 18);
    for (let i = 0; i < show; i++) {
      const g = caught[i];
      const t = (i + 1) / (show + 1);
      const cy2 = ly - camY - 30 - i * 24;
      const cx2 = lx + Math.sin(tt * 3 + i * 0.9) * (8 + i * 1.5);
      if (cy2 < -40) break;
      const hue = g.named ? g.named.hue : g.sp.hue;
      drawGhost(ctx, cx2, cy2, (g.named ? g.named.size : g.sp.size) * 0.6, hue,
                { acc: 'none', eyes: 2, radiant: g.radiant, rar: g.rar, named: !!g.named, alpha: 0.8, happy: true });
    }
    if (caught.length > show) {
      ctx.fillStyle = '#fff';
      ctx.font = '800 13px "Rajdhani","Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+' + (caught.length - show), lx, ly - camY - 30 - show * 24);
    }
  }

  /* ---------- the ghost painter (shared with museum cards) ---------- */
  function drawGhost(c, x, y, r, hue, o) {
    o = o || {};
    const light = o.radiant ? 88 : 68;
    const sat = o.radiant ? 55 : 75;
    c.save();
    c.globalAlpha = (o.alpha !== undefined ? o.alpha : 1) * 0.95;
    c.translate(x, y);
    // aura
    c.shadowColor = o.radiant ? '#fff2c0' : `hsl(${hue},90%,65%)`;
    c.shadowBlur = o.named ? 30 : (o.rar >= 3 ? 20 : 12);
    // body: dome + wavy hem
    const grad = c.createRadialGradient(0, -r * 0.3, r * 0.15, 0, 0, r * 1.5);
    grad.addColorStop(0, `hsla(${hue},${sat}%,${light + 8}%,.95)`);
    grad.addColorStop(0.7, `hsla(${hue},${sat}%,${light - 14}%,.75)`);
    grad.addColorStop(1, `hsla(${hue},${sat}%,${light - 24}%,.15)`);
    c.fillStyle = grad;
    c.beginPath();
    c.arc(0, -r * 0.15, r, Math.PI, 0);
    const hem = r * 0.85, waves = 3;
    for (let i = 0; i <= waves; i++) {
      const x1 = r - (i + 0.5) * (2 * r / waves) + r / waves * 0.5;
      const xEnd = r - (i + 1) * (2 * r / waves);
      c.quadraticCurveTo(x1, hem + (i % 2 ? -r * 0.12 : r * 0.28), xEnd, hem * 0.75);
    }
    c.closePath();
    c.fill();
    c.shadowBlur = 0;
    // eyes
    c.fillStyle = 'rgba(10,10,25,.9)';
    const n = o.eyes || 2, ey = -r * 0.25;
    for (let i = 0; i < n; i++) {
      const ex = (i - (n - 1) / 2) * r * 0.42;
      c.beginPath();
      c.ellipse(ex, ey, r * 0.13, o.happy ? r * 0.06 : r * 0.18, 0, 0, 7);
      c.fill();
    }
    if (o.happy) { // closed happy mouth
      c.strokeStyle = 'rgba(10,10,25,.8)'; c.lineWidth = Math.max(1, r * 0.08); c.lineCap = 'round';
      c.beginPath(); c.arc(0, r * 0.08, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    } else {
      c.beginPath(); c.ellipse(0, r * 0.18, r * 0.1, r * 0.16, 0, 0, 7); c.fill();
    }
    // accessories
    c.lineWidth = Math.max(1.5, r * 0.1);
    if (o.acc === 'hood') {
      c.strokeStyle = `hsla(${hue},60%,25%,.9)`;
      c.beginPath(); c.arc(0, -r * 0.15, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    } else if (o.acc === 'crown') {
      c.fillStyle = '#f0c04d';
      c.beginPath();
      c.moveTo(-r * 0.5, -r * 1.0);
      for (let i = 0; i < 3; i++) {
        c.lineTo(-r * 0.5 + (i * 2 + 1) * r / 3, -r * 1.45);
        c.lineTo(-r * 0.5 + (i + 1) * r / 1.5, -r * 1.0);
      }
      c.closePath(); c.fill();
    } else if (o.acc === 'halo') {
      c.strokeStyle = 'rgba(240,220,120,.85)';
      c.beginPath(); c.ellipse(0, -r * 1.35, r * 0.55, r * 0.16, 0, 0, 7); c.stroke();
    } else if (o.acc === 'chains') {
      c.strokeStyle = 'rgba(160,170,185,.8)';
      c.beginPath(); c.arc(-r * 0.7, r * 0.5, r * 0.3, 0, Math.PI); c.stroke();
      c.beginPath(); c.arc(r * 0.6, r * 0.6, r * 0.25, 0, Math.PI); c.stroke();
    } else if (o.acc === 'bell') {
      c.fillStyle = '#d8b23c';
      c.beginPath(); c.moveTo(0, -r * 1.5); c.lineTo(0, -r * 1.15); c.stroke();
      c.arc(0, -r * 1.05, r * 0.22, 0, 7); c.fill();
    } else if (o.acc === 'beak') {
      c.fillStyle = `hsla(${hue},50%,35%,.95)`;
      c.beginPath(); c.moveTo(0, -r * 0.1); c.lineTo(r * 0.55, r * 0.15); c.lineTo(0, r * 0.3); c.closePath(); c.fill();
    }
    // radiant sparkles
    if (o.radiant) {
      c.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        const a = tt * 2 + i * 2.1;
        c.globalAlpha = 0.5 + 0.5 * Math.sin(a * 3);
        c.beginPath(); c.arc(Math.cos(a) * r * 0.9, -r * 0.2 + Math.sin(a) * r * 0.7, r * 0.08, 0, 7); c.fill();
      }
    }
    c.restore();
  }

  function drawLantern(x, y) {
    // glow
    const gl = ctx.createRadialGradient(x, y, 2, x, y, goldenActive() ? 120 : 80);
    gl.addColorStop(0, goldenActive() ? 'rgba(255,220,110,.5)' : 'rgba(255,200,110,.35)');
    gl.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x - 130, y - 130, 260, 260);
    // cage
    ctx.fillStyle = '#2c2620';
    ctx.strokeStyle = goldenActive() ? '#f0c04d' : '#8a7351';
    ctx.lineWidth = 2;
    const w = 20, h = 26;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h / 2 + 4);
    ctx.quadraticCurveTo(x, y - h / 2 - 6, x + w / 2, y - h / 2 + 4);
    ctx.lineTo(x + w / 2 - 3, y + h / 2);
    ctx.lineTo(x - w / 2 + 3, y + h / 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // flame
    const fl = 1 + Math.sin(tt * 11) * 0.15;
    ctx.fillStyle = '#ffdf94';
    ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x, y - 7 * fl);
    ctx.quadraticCurveTo(x + 5, y, x, y + 6);
    ctx.quadraticCurveTo(x - 5, y, x, y - 7 * fl);
    ctx.fill();
    ctx.shadowBlur = 0;
    // hook ring
    ctx.strokeStyle = '#8a7351';
    ctx.beginPath(); ctx.arc(x, y - h / 2 - 6, 4, 0, 7); ctx.stroke();
  }

  /* ================= HUD / DOM ================= */
  function updateHUD() {
    $('coins').textContent = fmt(save.coins);
    $('blessTag').textContent = save.blessings > 0 ? '☩ ' + save.blessings : '';
    $('surfBest').textContent = save.bestDepth + 'm';
    // golden lantern button
    const gb = $('btnGolden');
    const cdLeft = Math.max(0, save.goldenCd - Date.now());
    if (goldenActive()) {
      gb.classList.add('on');
      gb.querySelector('small').textContent = Math.ceil((save.goldenUntil - Date.now()) / 1000) + 's active';
    } else if (cdLeft > 0) {
      gb.classList.remove('on');
      gb.querySelector('small').textContent = 'ready in ' + Math.ceil(cdLeft / 1000) + 's';
    } else {
      gb.classList.remove('on');
      gb.querySelector('small').textContent = 'watch ad · 60s ×2 + magnet';
    }
    gb.classList.toggle('cooling', !goldenActive() && cdLeft > 0);
    updateWantedChip();
  }
  function runHudTick() {
    $('runDepth').textContent = Math.round(ly / PXM) + 'm';
    $('runCage').textContent = caught.length + '/' + capacity();
    $('runValue').textContent = '+' + fmt(runValue);
    $('runCage').parentElement.classList.toggle('full', caught.length >= capacity());
  }

  function updateWantedChip() {
    const chip = $('wantedChip');
    if (!wantedId) { chip.classList.add('hidden'); return; }
    const sp = DATA.species.find(s => s.id === wantedId);
    const done = save.wantedDone === dayNum();
    chip.classList.remove('hidden');
    chip.innerHTML = done
      ? '✓ Bounty claimed'
      : 'WANTED: <b>' + sp.name + '</b> ×' + Math.max(0, 3 - wantedCaught) + ' <i>×5 coins</i>';
    chip.classList.toggle('done', done);
  }
  function rollWanted() {
    // among species of zones the player can reach
    const reach = DATA.zoneAt(Math.max(20, maxDepthM()));
    const pool = DATA.species.filter(s => s.zone <= reach);
    wantedId = pool[dayNum() % pool.length].id;
    if (save.wantedDone !== dayNum()) wantedCaught = 0;
    updateWantedChip();
  }

  /* ---------- shop sheet ---------- */
  let sheetTab = 'shop';
  function renderShop() {
    if (sheetTab === 'shop') renderUpgrades();
    else if (sheetTab === 'museum') renderMuseum();
    else renderWell();
  }
  function renderUpgrades() {
    $('sheetBody').innerHTML = '<div class="up-head">Depth <b>' + maxDepthM() + 'm</b> · Cage <b>' + capacity() + '</b> · ' +
      (mod().id !== 'none' ? '<span class="mod-tag">' + mod().name + '</span>' : 'The Still Well') + '</div>' +
      DATA.upgrades.map(u => {
        const lvl = save.up[u.id];
        const maxed = lvl >= u.max;
        const cost = maxed ? 0 : DATA.upCost(u, lvl);
        const can = !maxed && save.coins >= cost;
        return `<div class="item ${can ? 'can' : ''}">
          <span class="uic uic-${u.ic}"></span>
          <div class="mid">
            <div class="nm">${u.name} <i>lv${lvl}${maxed ? ' MAX' : ''}</i></div>
            <div class="ds">${u.desc}</div>
          </div>
          <button class="buy ${can ? '' : 'cant'}" data-up="${u.id}">
            ${maxed ? 'MAX' : '◉ ' + fmt(cost)}<small>${maxed ? '' : 'UPGRADE'}</small>
          </button>
        </div>`;
      }).join('');
  }
  function renderMuseum() {
    const cards = [];
    for (const sp of DATA.species) {
      const rec = save.mus[sp.id];
      cards.push(museumCard(sp.id, sp.name, sp.hue, sp.size, sp, rec, false));
    }
    for (const nd of DATA.named) {
      const cnt = save.named[nd.id] || 0;
      cards.push(museumCard(nd.id, nd.name, nd.hue, nd.size, nd, cnt > 0 ? { n: cnt, best: nd.depth } : null, true));
    }
    $('sheetBody').innerHTML =
      '<div class="up-head">Spirit Museum · <b>' + museumCount() + '/' + (DATA.species.length + DATA.named.length) + '</b> souls carded</div>' +
      '<div class="mus-grid">' + cards.join('') + '</div>';
    // paint portraits
    document.querySelectorAll('.mus-canvas').forEach(cnv => {
      const id = cnv.dataset.id, named = cnv.dataset.named === '1';
      const def = named ? DATA.named.find(n => n.id === id) : DATA.species.find(s => s.id === id);
      const known = named ? (save.named[id] || 0) > 0 : !!save.mus[id];
      const c2 = cnv.getContext('2d');
      c2.clearRect(0, 0, 72, 72);
      if (known) drawGhost(c2, 36, 40, Math.min(20, def.size * 1.1), def.hue, { acc: def.acc, eyes: def.eyes || 2, named, rar: named ? 4 : 0 });
      else {
        c2.fillStyle = 'rgba(255,255,255,.06)';
        c2.beginPath(); c2.arc(36, 38, 20, 0, 7); c2.fill();
        c2.fillStyle = 'rgba(255,255,255,.3)';
        c2.font = '800 22px sans-serif'; c2.textAlign = 'center';
        c2.fillText('?', 36, 46);
      }
    });
  }
  function museumCount() {
    let n = 0;
    for (const sp of DATA.species) if (save.mus[sp.id] && save.mus[sp.id].n > 0) n++;
    for (const nd of DATA.named) if ((save.named[nd.id] || 0) > 0) n++;
    return n;
  }
  function museumCard(id, name, hue, size, def, rec, named) {
    const known = !!rec && (rec.n > 0);
    const fl = known && !named ? frameLvl(rec.n) : 0;
    const frameCls = ['', 'bronze', 'silver', 'goldf'][fl];
    return `<div class="mus-card ${known ? '' : 'unknown'} ${named ? 'named' : ''} ${frameCls}">
      <canvas class="mus-canvas" width="72" height="72" data-id="${id}" data-named="${named ? 1 : 0}"></canvas>
      <div class="mus-name">${known ? name : '???'}</div>
      <div class="mus-sub">${known ? (named ? 'Legendary · ' + def.depth + 'm' : '×' + rec.n + (rec.rad ? ' ✦' + rec.rad : '')) : (named ? def.depth + 'm' : DATA.zones[def.zone].name)}</div>
      ${known ? `<div class="mus-epi">${def.epitaph}</div>` : ''}
    </div>`;
  }
  function renderWell() {
    const unlocked = save.bestDepth >= DATA.PRESTIGE_DEPTH || save.blessings > 0;
    const pend = Math.max(0, DATA.blessingsFor(save.lifetime) - save.blessings);
    $('sheetBody').innerHTML = `<div class="well-page">
      <div class="well-title">☩ THE GREAT RELEASE</div>
      <p class="well-text">Release every captured soul back into the well.<br>
      Coins and upgrades reset — but each <b>Blessing</b> grants <b>+2% income forever</b>,
      and your Museum records are eternal.</p>
      <div class="well-stats">
        <span>Blessings <b>${save.blessings}</b></span>
        <span>Lifetime souls-worth <b>${fmt(save.lifetime)}</b></span>
      </div>
      ${unlocked
        ? `<button id="btnRelease" class="release-btn ${pend > 0 ? 'ready' : 'cant'}">
             RELEASE THE SOULS<small>${pend > 0 ? '+' + pend + ' ☩ Blessings' : 'earn more lifetime coins for the next Blessing'}</small></button>`
        : `<div class="well-locked">Reach <b>${DATA.PRESTIGE_DEPTH}m</b> to open the way.<br>Best: ${save.bestDepth}m</div>`}
      ${save.releases > 0 ? `<div class="well-mod">Current well: <b>${mod().name}</b><br><i>${mod().desc}</i></div>` : ''}
    </div>`;
    const rb = $('btnRelease');
    if (rb) rb.addEventListener('click', () => {
      if (pend <= 0) { A.deny(); return; }
      $('relGain').textContent = '+' + pend + ' ☩';
      show('relModal');
    });
  }

  /* ================= OFFLINE / SÉANCE ================= */
  let pendingSeance = 0;
  function checkSeance() {
    if (save.up.seance <= 0 || save.bestHaul <= 0) return;
    const mins = (Date.now() - save.lastSeen) / 60000;
    if (mins < 3) return;
    const capped = Math.min(mins, 480);
    const gain = Math.round(save.bestHaul * 0.004 * save.up.seance * capped);
    if (gain < 1) return;
    pendingSeance = gain;
    $('seaAmount').textContent = fmt(gain);
    $('seaTime').textContent = fmtTime(capped * 60);
    show('seaModal');
  }

  /* ================= INPUT ================= */
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .sheet, .modal, .overlay')) return;
    A.resume();
    const p = toL(e.clientX, e.clientY);
    pointerHeld = true;
    steerX = p.x;
    if (state === ST.SURFACE) startRun();
  });
  window.addEventListener('pointermove', (e) => {
    if (!pointerHeld) return;
    steerX = toL(e.clientX, e.clientY).x;
  });
  window.addEventListener('pointerup', () => pointerHeld = false);
  window.addEventListener('pointercancel', () => pointerHeld = false);

  /* ================= BUTTONS ================= */
  document.querySelectorAll('.stab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.stab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      sheetTab = t.dataset.tab;
      renderShop();
      A.click();
    });
  });
  $('sheetBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-up]');
    if (!b) return;
    const u = DATA.upgrades.find(x => x.id === b.dataset.up);
    const lvl = save.up[u.id];
    if (lvl >= u.max) return;
    const cost = DATA.upCost(u, lvl);
    if (save.coins < cost) { A.deny(); return; }
    save.coins -= cost;
    save.up[u.id]++;
    A.buy();
    persist();
    renderShop(); updateHUD();
  });
  $('btnDive').addEventListener('click', () => { A.click(); startRun(); });
  $('btnDouble').addEventListener('click', () => {
    SR.SDK.rewardedAd(() => {
      pendingHaul *= 2;
      $('sumHaul').textContent = fmt(pendingHaul);
      $('btnDouble').classList.add('hidden');
      A.best();
      if (pendingHaul > save.bestHaul) save.bestHaul = pendingHaul;
    }, () => A.deny());
  });
  $('btnCollect').addEventListener('click', () => { A.click(); collectHaul(); });
  $('btnGolden').addEventListener('click', () => {
    if (goldenActive() || Date.now() < save.goldenCd) { A.deny(); return; }
    SR.SDK.rewardedAd(() => {
      save.goldenUntil = Date.now() + 60000;
      save.goldenCd = Date.now() + 240000; // 60s buff + 3min cooldown
      banner('GOLDEN LANTERN! ×2 + MAGNET', '#f0c04d');
      A.best(); updateHUD(); persist();
    }, () => A.deny());
  });
  $('seaDouble').addEventListener('click', () => {
    SR.SDK.rewardedAd(() => {
      save.coins += pendingSeance * 2; save.lifetime += pendingSeance * 2;
      hide('seaModal'); A.best(); updateHUD(); persist();
    }, () => { save.coins += pendingSeance; save.lifetime += pendingSeance; hide('seaModal'); updateHUD(); });
  });
  $('seaCollect').addEventListener('click', () => {
    save.coins += pendingSeance; save.lifetime += pendingSeance;
    hide('seaModal'); A.buy(); updateHUD(); persist();
  });
  $('swTake').addEventListener('click', () => {
    SR.SDK.rewardedAd(() => {
      usedSW = true;
      hide('swModal');
      if (pendingBump) { pendingBump.scared = 1; puff(pendingBump); pendingBump = null; }
      state = ST.DESCEND;
      slowmoT = 0.5;
      banner('SECOND WIND — KEEP SINKING!', '#5de08a');
      A.best();
    }, () => { hide('swModal'); declineSW(); });
  });
  $('swDecline').addEventListener('click', () => { hide('swModal'); declineSW(); });
  function declineSW() {
    state = ST.DESCEND;
    if (pendingBump) { hookAndTurn(pendingBump); pendingBump = null; }
    else beginAscent();
  }
  $('relGo').addEventListener('click', () => {
    hide('relModal');
    SR.SDK.midgameAd(doRelease);
  });
  $('relCancel').addEventListener('click', () => hide('relModal'));
  function doRelease() {
    const pend = Math.max(0, DATA.blessingsFor(save.lifetime) - save.blessings);
    save.blessings += pend;
    save.releases++;
    save.coins = 0;
    DATA.upgrades.forEach(u => save.up[u.id] = 0);
    save.bestDepth = 0; save.bestHaul = 0;
    save.modifier = DATA.modifiers[1 + (save.releases % (DATA.modifiers.length - 1))].id;
    A.blessing();
    SR.SDK.happyTime();
    banner('☩ ' + pend + ' BLESSINGS EARNED', '#f0c04d');
    flashA = 0.7;
    persist();
    rollWanted();
    renderShop(); updateHUD();
  }
  $('btnSound').addEventListener('click', () => {
    save.sound = !save.sound;
    A.enabled = save.sound;
    persist();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    A.click();
  });
  $('btnShare').addEventListener('click', share);
  async function share() {
    const namedCount = DATA.named.filter(n => (save.named[n.id] || 0) > 0).length;
    const text = `I've reached ${save.bestDepth}m in the haunted well and captured ${namedCount}/10 named spirits in SPIRIT REEL 🏮 How deep can you go?`;
    let url = location.href;
    const cg = await SR.SDK.invite({ depth: save.bestDepth });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'Spirit Reel', text, url }); return; } } catch (e) {}
    try { await navigator.clipboard.writeText(text + ' ' + url); banner('COPIED — CHALLENGE A FRIEND!', '#fff'); } catch (e) {}
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= BOOT + LOOP ================= */
  let rawLast = performance.now();
  (function boot() {
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    rollWanted();
    checkSeance();
    renderShop(); updateHUD();
    requestAnimationFrame(loop);
    SR.SDK.init().then(() => SR.SDK.gameplayStart());
  })();

  let hudAcc = 0;
  function loop(now) {
    const rdt = Math.min((now - rawLast) / 1000, 0.05);
    rawLast = now;
    update(rdt);
    render();
    hudAcc += rdt;
    if (hudAcc > 0.12) {
      hudAcc = 0;
      if (state === ST.DESCEND || state === ST.ASCEND) runHudTick();
      else if (state === ST.SURFACE) updateHUD();
    }
    requestAnimationFrame(loop);
  }

  setInterval(persist, 15000);
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  window.addEventListener('error', (e) => {
    try { banner('⚠ ' + (e.message || 'error'), '#f04d5b'); } catch (err) {}
  });
})();
