/* ============================================================
   HYPERSLOPE — 3D neon ball-runner. Hand-rolled perspective on
   a 2D canvas: no engine, no assets, 60fps on a phone.

   Steer a ball down an endless procedural mountain of neon.
   Speed only ever goes UP. Red means death. The edge means
   death. Everything means death — that's the fun.

   • ENDLESS: a fresh slope every run
   • DAILY SLOPE: date-seeded — the whole world rolls the same
     mountain today; meters are the bragging currency
   • Near-miss GRAZE streaks pay shards; skins are pure flex
   • 12 feats built to be screenshotted

   3D pipeline: track = segment strips (x-center, height, width
   per z-step). Project → painter's algorithm far-to-near with
   distance fog. The ball never moves on screen; the world does.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = HS.Audio;

  /* ================= PERSISTENCE ================= */
  const SAVE_KEY = 'hyperSlope_v1';
  const save = {
    shards: 0, runs: 0, bestDist: 0, bestKmh: 0,
    dailyDate: '', dailyBest: 0, dailyDays: {},
    balls: { og: true }, ball: 'og', trails: { none: true }, trail: 'none',
    feats: {}, sel: 'endless', sound: true, lastSeen: Date.now(),
  };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
  if (!save.balls.og) save.balls.og = true;
  if (!save.trails.none) save.trails.none = true;
  function persist() {
    save.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  A.enabled = save.sound;
  const today = () => new Date().toDateString();
  if (save.dailyDate !== today()) { save.dailyDate = today(); save.dailyBest = 0; }

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

  /* ================= TRACK (seeded 3D ribbon) ================= */
  const SEG = DATA.SEG, HW = DATA.HALF_W, R = DATA.BALL_R;
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let segs = [], gen = null;
  function trackReset(seed) {
    segs = [];
    gen = {
      rng: mulberry32(seed),
      x: 0, y: 0, curve: 0, curveT: 0, curveLeft: 0,
      grade: DATA.gen.gradeBase, gradeT: DATA.gen.gradeBase, gradeLeft: 0,
      dive: 0, shardIn: 6,
    };
    segs.push({ x: 0, y: 0, hw: HW, obst: null, shards: null, grazed: false });
  }
  function pushSeg() {
    const G = DATA.gen, rng = gen.rng;
    const m = segs.length * SEG / 10;              // meters so far
    // curves retarget
    if (gen.curveLeft-- <= 0) {
      gen.curveT = (rng() * 2 - 1) * G.curveMax * Math.min(1, 0.3 + m * 0.0004);
      gen.curveLeft = G.curveEvery[0] + rng() * (G.curveEvery[1] - G.curveEvery[0]);
    }
    gen.curve += (gen.curveT - gen.curve) * 0.08;
    gen.x += gen.curve;
    // hills retarget (plus the occasional super-dive)
    if (gen.dive > 0) { gen.dive--; gen.gradeT = -1.7; }
    else if (gen.gradeLeft-- <= 0) {
      gen.gradeT = G.gradeBase + (rng() * 2 - 1) * G.gradeVar;
      gen.gradeLeft = G.hillEvery[0] + rng() * (G.hillEvery[1] - G.hillEvery[0]);
      if (rng() < G.diveChance) gen.dive = 10 + (rng() * 12) | 0;
    }
    gen.grade += (gen.gradeT - gen.grade) * 0.06;
    gen.y += gen.grade * SEG;
    // width: narrow squeezes late
    let hw = HW;
    if (m > G.narrowFrom && rng() < 0.05) hw = HW * 0.62;
    // obstacles: single blocks or gate rows with one gap — always passable
    let obst = null;
    if (m > G.obstFrom && rng() < G.obstChance(m)) {
      if (rng() < 0.65) {
        const w = 42 + rng() * 34;
        obst = [{ xo: (rng() * 2 - 1) * (hw - w / 2 - R * 2.4), w }];
      } else {
        const gapAt = (rng() * 2 - 1) * (hw * 0.55);
        const gapW = R * 5.2;
        obst = [
          { xo: (-hw + (gapAt - gapW / 2)) / 2, w: (gapAt - gapW / 2) + hw },
          { xo: (hw + (gapAt + gapW / 2)) / 2, w: hw - (gapAt + gapW / 2) },
        ].filter(o => o.w > 8);
      }
    }
    // shard diamonds
    let shards = null;
    if (gen.shardIn-- <= 0 && !obst) {
      gen.shardIn = 4 + (rng() * DATA.gen.shardEvery * 2) | 0;
      shards = { xo: (rng() * 2 - 1) * hw * 0.5, taken: false };
    }
    segs.push({ x: gen.x, y: gen.y, hw, obst, shards, grazed: false });
  }
  function ensure(idx) { while (segs.length <= idx) pushSeg(); }
  function trackAt(z) {
    const i = Math.max(0, Math.min(segs.length - 2, (z / SEG) | 0));
    const f = Math.max(0, Math.min(1, (z - i * SEG) / SEG));
    const a = segs[i], b = segs[i + 1];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f,
             hw: a.hw + (b.hw - a.hw) * f, i };
  }

  /* ================= STATE ================= */
  const ST = { SURFACE: 0, RUN: 1, DYING: 2, DEAD: 3 };
  let state = ST.SURFACE;
  let tt = 0, shake = 0;
  let steer = 0, pointerX = null;

  const HSTEP = 1 / 120;
  let acc = 0;

  let B = null;                 // ball {x, z, vx, v, yOff}
  let runShards = 0, runPickups = 0, topV = 0, grazeN = 0, grazeT = 0, edgeT = 0;
  let usedRevive = false, dieT = 0, deathBy = '';
  let goldenT = 0, goldenCd = 0, lastMidgame = 0, sessionRuns = 0;

  let particles = [], trailPts = [];
  let camX = 0, camY = 0, camZ = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const mode = () => DATA.modes.find(x => x.id === save.sel) || DATA.modes[0];
  const ballSkin = () => DATA.balls.find(x => x.id === save.ball) || DATA.balls[0];
  const trailSkin = () => DATA.trails.find(x => x.id === save.trail) || DATA.trails[0];
  const distM = () => B ? Math.floor(B.z / 10) : 0;

  /* ================= RUN LIFECYCLE ================= */
  function startRun() {
    const m = mode();
    trackReset(m.id === 'daily' ? DATA.dailySeed() : 1 + ((Math.random() * 1e9) | 0));
    ensure(140);
    B = { x: 0, z: SEG * 2, vx: 0, v: DATA.V0, yOff: 0 };
    runShards = 0; runPickups = 0; topV = 0;
    grazeN = 0; grazeT = 0; edgeT = 0;
    usedRevive = false;
    acc = 0;
    trailPts = [];
    if (m.id === 'daily' && !save.dailyDays[save.dailyDate]) {
      save.dailyDays[save.dailyDate] = 1;
      if (Object.keys(save.dailyDays).length >= 7) feat('daily7');
    }
    save.runs++; sessionRuns++;
    state = ST.RUN;
    A.resume();
    A.musicStart(m.bpm, m.id === 'daily' ? DATA.dailySeed() : ((Math.random() * 999) | 0));
    A.windStart();
    HS.SDK.gameplayStart();
    hide('sheet'); hide('deathModal'); show('runHud');
  }

  function feat(id) {
    if (save.feats[id]) return;
    save.feats[id] = 1;
    A.feat();
    HS.SDK.happyTime();
    banner('🏅 ' + DATA.feats.find(f => f.id === id).name.toUpperCase());
  }
  let bannerTxt = '', bannerT = 0;
  function banner(t) { bannerTxt = t; bannerT = 2.2; }

  function die(reason) {
    deathBy = reason;
    state = ST.DYING; dieT = reason === 'edge' ? 0.7 : 0.5;
    shake = 0.3;
    if (reason === 'edge') A.fall(); else A.death();
    A.windStop();
    boomFx();
  }

  function finishDeath() {
    state = ST.DEAD;
    A.musicStop();
    HS.SDK.gameplayStop();
    const m = distM();
    let gained = Math.floor(m * DATA.SHARD_DIST) + runPickups * DATA.pickupValue + runShards;
    if (goldenT > 0) gained *= 2;
    runShards = gained;
    save.shards += gained;
    const isDaily = mode().id === 'daily';
    if (isDaily) {
      save.dailyBest = Math.max(save.dailyBest, m);
      if (m >= DATA.FEAT_DAILY_DIST) feat('daily1');
    }
    if (m > save.bestDist) { save.bestDist = m; A.best(); }
    save.bestKmh = Math.max(save.bestKmh, DATA.kmh(topV));
    if (gained >= 500) feat('shard500');
    persist();

    $('dLabel').textContent = deathBy === 'edge' ? 'FELL OFF AT' : 'WIPED OUT AT';
    $('dDist').textContent = m + 'm';
    $('dKmh').textContent = DATA.kmh(topV) + ' km/h';
    $('dBest').textContent = (isDaily ? save.dailyBest : save.bestDist) + 'm';
    $('dShards').textContent = '◆ +' + fmt(gained) + ' banked';
    const rv = $('dRevive');
    if (!usedRevive && m > 100) rv.classList.remove('hidden');
    else rv.classList.add('hidden');
    hide('runHud'); show('deathModal');
    updateHUD();
  }

  function retry() {
    if (sessionRuns > 5 && tt - lastMidgame > 180) {
      lastMidgame = tt;
      HS.SDK.midgameAd(startRun);
      return;
    }
    startRun();
  }

  function revive() {
    usedRevive = true;
    // clear the next 900u of obstacles and set the ball safe on center
    const i0 = (B.z / SEG) | 0;
    for (let i = i0; i < Math.min(segs.length, i0 + 16); i++) segs[i].obst = null;
    B.x = trackAt(B.z).x; B.vx = 0; B.yOff = 0;
    B.v *= 0.6;
    state = ST.RUN;
    A.revive();
    A.musicStart(mode().bpm, 1);
    A.windStart();
    HS.SDK.gameplayStart();
    hide('deathModal'); show('runHud');
  }

  function toMenu() {
    state = ST.SURFACE;
    A.musicStop(); A.windStop();
    hide('deathModal'); hide('runHud'); show('sheet');
    renderSheet(); updateHUD();
  }

  /* ================= PHYSICS ================= */
  function stepPhysics() {
    ensure(((B.z / SEG) | 0) + 130);
    const t = trackAt(B.z), tNext = trackAt(B.z + SEG);
    const grade = (tNext.y - t.y) / SEG;

    // speed only goes up (the Slope law)
    B.v = Math.min(DATA.VMAX, B.v + (DATA.ACCEL + DATA.DIVE_ACCEL * Math.max(0, -grade)) * HSTEP);
    topV = Math.max(topV, B.v);

    // steering scales a little with speed (keeps high speed controllable)
    const sf = 1 + (B.v / DATA.VMAX) * 0.7;
    B.vx += steer * DATA.STEER * sf * HSTEP;
    B.vx *= 1 - 3.2 * HSTEP;
    B.x += B.vx * HSTEP;
    B.z += B.v * HSTEP;

    const off = B.x - t.x;

    // the edge
    if (Math.abs(off) > t.hw - R * 0.5) { die('edge'); return; }
    // edge-skim feat
    if (Math.abs(off) > t.hw - R * 2) {
      edgeT += HSTEP;
      if (edgeT >= 3) feat('edge');
    } else edgeT = 0;

    // obstacles on nearby segments
    const iBall = (B.z / SEG) | 0;
    for (let i = iBall; i <= iBall + 1 && i < segs.length; i++) {
      const s = segs[i];
      if (!s.obst) continue;
      const segZ = i * SEG;
      if (Math.abs(B.z - segZ) > SEG * 0.55 + R) continue;
      for (const o of s.obst) {
        const lat = off - o.xo;
        if (Math.abs(lat) < o.w / 2 + R * 0.75) { die('block'); return; }
      }
      // graze: passed close without dying
      if (!s.grazed && B.z > segZ) {
        for (const o of s.obst) {
          const lat = Math.abs(off - o.xo) - o.w / 2;
          if (lat < R * 2.6) {
            s.grazed = true;
            grazeN = Math.min(DATA.GRAZE_CAP, grazeN + 1);
            grazeT = 4;
            const bonus = DATA.GRAZE_BONUS * grazeN;
            runShards += bonus;
            A.graze(grazeN);
            if (grazeN >= 8) feat('graze8');
            break;
          }
        }
      }
    }

    // shard diamonds
    for (let i = iBall; i <= iBall + 1 && i < segs.length; i++) {
      const s = segs[i];
      if (!s.shards || s.shards.taken) continue;
      if (Math.abs(B.z - i * SEG) < SEG * 0.6 && Math.abs(off - s.shards.xo) < R * 2.6) {
        s.shards.taken = true;
        runPickups++;
        A.pickup();
      }
    }

    // speed/distance feats
    const kmh = DATA.kmh(B.v), m = distM();
    if (kmh >= 200) feat('kmh200');
    if (kmh >= 300) feat('kmh300');
    if (m >= 100) feat('first100');
    if (m >= 500) feat('dist500');
    if (m >= 1000) feat('dist1k');
    if (m >= 2000) feat('dist2k');
  }

  /* ================= FX ================= */
  function boomFx() {
    const p = project(B.x, trackAt(B.z).y + R + B.yOff, B.z);
    if (!p) return;
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(60, 300);
      particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                       life: rand(0.3, 0.7), size: rand(2, 5), c: ballSkin().c });
    }
  }
  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  /* ================= UPDATE ================= */
  let rawLast = performance.now();
  function update(dt) {
    tt += dt;
    if (shake > 0) shake -= dt;
    if (bannerT > 0) bannerT -= dt;
    if (goldenT > 0) goldenT -= dt;
    else if (goldenCd > 0) goldenCd -= dt;
    if (grazeT > 0) { grazeT -= dt; if (grazeT <= 0) grazeN = 0; }
    updateFx(dt);

    if (state === ST.RUN) {
      acc += Math.min(dt, 0.05);
      while (acc >= HSTEP && state === ST.RUN) { stepPhysics(); acc -= HSTEP; }
      A.windSet(B.v / DATA.VMAX);
      updateRunHUD();
    } else if (state === ST.DYING) {
      if (deathBy === 'edge') { B.yOff -= 600 * dt; B.z += B.v * dt * 0.4; }
      dieT -= dt;
      if (dieT <= 0) finishDeath();
    }

    // camera chase — far and high enough to read the track ahead
    if (B) {
      const t = trackAt(B.z);
      const ahead = trackAt(B.z + 400);
      camZ = B.z - 215;
      camY += ((t.y + 118) - camY) * Math.min(1, dt * 5);
      camX += ((B.x * 0.6 + t.x * 0.15 + ahead.x * 0.25) - camX) * Math.min(1, dt * 6);
    }

    if (state === ST.SURFACE) updateGoldenBtn();
  }

  /* ================= 3D PROJECTION + RENDER ================= */
  const FOV = 270;
  function project(x, y, z) {
    const dz = z - camZ;
    if (dz < 12) return null;
    const s = FOV / dz;
    return { x: LW / 2 + (x - camX) * s, y: LH * 0.42 + (camY - y) * s, s };
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hue = mode().hue;
    const pulse = state === ST.RUN ? A.beatPulse() : (Math.sin(tt * 2) * 0.5 + 0.5);

    // sky: abyss with a glowing horizon
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#04070a');
    g.addColorStop(0.42, `hsl(${hue},60%,${7 + 3 * (1 - pulse)}%)`);
    g.addColorStop(0.55, '#04070a');
    g.addColorStop(1, '#04070a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 16, rand(-1, 1) * shake * 16);

    // stars
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137 + 40) % LW, sy = (i * 89 + 20) % (LH * 0.36);
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }

    if (B) drawWorld(hue, pulse);

    // particles (screen space)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2.4);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // speed lines at high velocity
    if (state === ST.RUN && B.v > DATA.VMAX * 0.45) {
      const k = (B.v / DATA.VMAX - 0.45) * 1.6;
      ctx.strokeStyle = `rgba(255,255,255,${0.12 * k})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + tt * 3;
        const r0 = 260, r1 = r0 + 60 + 90 * k;
        ctx.beginPath();
        ctx.moveTo(LW / 2 + Math.cos(a) * r0, LH * 0.45 + Math.sin(a) * r0 * 0.8);
        ctx.lineTo(LW / 2 + Math.cos(a) * r1, LH * 0.45 + Math.sin(a) * r1 * 0.8);
        ctx.stroke();
      }
    }

    // banner
    if (bannerT > 0) {
      const a = Math.min(1, bannerT, (2.2 - bannerT) * 3);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = '800 22px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18;
      ctx.fillText(bannerTxt, LW / 2, 250);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawWorld(hue, pulse) {
    const iBall = (B.z / SEG) | 0;
    const from = Math.max(0, iBall - 2), to = Math.min(segs.length - 2, iBall + 140);
    const edgeC = `hsl(${hue},95%,${58 + 10 * (1 - pulse)}%)`;

    // cache projections of segment edges
    const P = [];
    for (let i = from; i <= to + 1; i++) {
      const s = segs[i], z = i * SEG;
      P[i] = {
        L: project(s.x - s.hw, s.y, z),
        R: project(s.x + s.hw, s.y, z),
      };
    }

    // painter: far → near
    for (let i = to; i >= from; i--) {
      const a = P[i], b = P[i + 1];
      if (!a || !b || !a.L || !b.L) continue;
      // draw distance ampliada (105→135 seg) y curva suavizada: la niebla
      // mataba la pista muy pronto (hallazgo de auditoría visual)
      const fog = Math.pow(Math.max(0, Math.min(1, 1 - (i * SEG - camZ) / (135 * SEG))), 0.72);
      if (fog <= 0.02) continue;

      // track surface
      ctx.globalAlpha = fog;
      ctx.fillStyle = i % 2 ? '#0a1014' : '#0c1318';
      ctx.beginPath();
      ctx.moveTo(a.L.x, a.L.y); ctx.lineTo(a.R.x, a.R.y);
      ctx.lineTo(b.R.x, b.R.y); ctx.lineTo(b.L.x, b.L.y);
      ctx.closePath(); ctx.fill();

      // guiones de carril cerca de cámara: la franja inferior era negro
      // plano sin sensación de velocidad (hallazgo de auditoría visual)
      if (i % 2 === 0 && a.L.s > 0.5) {
        const mA = { x: (a.L.x + a.R.x) / 2, y: (a.L.y + a.R.y) / 2 };
        const mB = { x: (b.L.x + b.R.x) / 2, y: (b.L.y + b.R.y) / 2 };
        ctx.strokeStyle = `hsla(${hue},70%,70%,.22)`;
        ctx.lineWidth = Math.max(1, 3 * a.L.s);
        ctx.beginPath();
        ctx.moveTo(mA.x + (mB.x - mA.x) * 0.22, mA.y + (mB.y - mA.y) * 0.22);
        ctx.lineTo(mA.x + (mB.x - mA.x) * 0.62, mA.y + (mB.y - mA.y) * 0.62);
        ctx.stroke();
      }

      // neon rails
      ctx.strokeStyle = edgeC;
      ctx.lineWidth = Math.max(1, 6 * a.L.s);
      ctx.beginPath(); ctx.moveTo(a.L.x, a.L.y); ctx.lineTo(b.L.x, b.L.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.R.x, a.R.y); ctx.lineTo(b.R.x, b.R.y); ctx.stroke();

      const s = segs[i], z = i * SEG;

      // obstacles: red slabs
      if (s.obst) {
        for (const o of s.obst) {
          const hgt = 40;
          const fl = project(s.x + o.xo - o.w / 2, s.y, z);
          const fr = project(s.x + o.xo + o.w / 2, s.y, z);
          const tl = project(s.x + o.xo - o.w / 2, s.y + hgt, z);
          const tr2 = project(s.x + o.xo + o.w / 2, s.y + hgt, z);
          if (fl && fr && tl && tr2) {
            ctx.fillStyle = '#ff3860';
            ctx.shadowColor = '#ff3860'; ctx.shadowBlur = 10 * fog;
            ctx.beginPath();
            ctx.moveTo(fl.x, fl.y); ctx.lineTo(fr.x, fr.y);
            ctx.lineTo(tr2.x, tr2.y); ctx.lineTo(tl.x, tl.y);
            ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // shard diamond
      if (s.shards && !s.shards.taken) {
        const p = project(s.x + s.shards.xo, s.y + 26 + Math.sin(tt * 4 + i) * 6, z);
        if (p) {
          const r = 34 * p.s;
          ctx.fillStyle = '#4de0ff';
          ctx.shadowColor = '#4de0ff'; ctx.shadowBlur = 8 * fog;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.PI / 4 + tt);
          ctx.fillRect(-r / 2, -r / 2, r, r);
          ctx.restore();
          ctx.shadowBlur = 0;
        }
      }
    }
    ctx.globalAlpha = 1;

    // ball trail
    const tr = trailSkin();
    if (tr.c && state === ST.RUN) {
      trailPts.push({ x: B.x, y: trackAt(B.z).y + R, z: B.z, t: 0.5 });
      if (trailPts.length > 22) trailPts.shift();
    }
    for (let i = 0; i < trailPts.length; i++) {
      const tp = trailPts[i];
      tp.t -= 1 / 60;
      if (tp.t <= 0) continue;
      const p = project(tp.x, tp.y, tp.z);
      if (!p) continue;
      const hues = ['#ff3860', '#5de08a', '#4de0ff'];
      ctx.fillStyle = tr.c === 'rgb' ? hues[i % 3] : tr.c;
      ctx.globalAlpha = tp.t * 0.8;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, R * 1.1 * p.s * tp.t), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // the ball
    if (state !== ST.DEAD) {
      const t = trackAt(B.z);
      const p = project(B.x, t.y + R + B.yOff, B.z);
      if (p) {
        // true projected size: R world-units through the same lens as the track
        const r = Math.max(7, R * 1.55 * p.s);
        const c = ballSkin().c;
        // ground shadow anchors the ball to the slope
        const sh = project(B.x, t.y, B.z);
        if (sh && B.yOff === 0) {
          ctx.fillStyle = 'rgba(0,0,0,.45)';
          ctx.beginPath();
          ctx.ellipse(sh.x, sh.y, r * 1.05, r * 0.32, 0, 0, 7);
          ctx.fill();
        }
        ctx.shadowColor = c; ctx.shadowBlur = 14;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
        // rolling seam
        ctx.strokeStyle = 'rgba(4,7,10,.55)';
        ctx.lineWidth = Math.max(1.5, r * 0.14);
        const roll = B.z * 0.05;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.62, roll, roll + Math.PI * 1.2); ctx.stroke();
        // specular
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath(); ctx.arc(p.x - r * 0.3, p.y - r * 0.35, r * 0.18, 0, 7); ctx.fill();
      }
    }
  }

  /* ================= HUD / SHEET ================= */
  function updateHUD() {
    $('shards').textContent = fmt(save.shards);
    $('surfBest').textContent = (save.sel === 'daily' ? save.dailyBest : save.bestDist) + 'm';
  }

  function updateRunHUD() {
    $('runKmh').innerHTML = DATA.kmh(B.v) + '<small> km/h</small>';
    $('runDist').innerHTML = '<b>' + distM() + '</b>m';
    $('runShards').innerHTML = '◆ <b>+' + fmt(Math.floor(
      distM() * DATA.SHARD_DIST) + runPickups * DATA.pickupValue + runShards) + '</b>';
    const gb = $('grazeBadge');
    if (grazeN > 1) {
      gb.classList.remove('hidden');
      gb.textContent = '×' + grazeN + ' GRAZE';
    } else gb.classList.add('hidden');
  }

  let goldenLbl = '';
  function updateGoldenBtn() {
    const b = $('btnGolden');
    let lbl;
    if (goldenT > 0) { lbl = '×2 ACTIVE · ' + Math.ceil(goldenT) + 's'; b.className = 'gold-btn on'; }
    else if (goldenCd > 0) { lbl = 'READY IN ' + fmtTime(goldenCd); b.className = 'gold-btn cooling'; }
    else { lbl = '▶ SHARD RUSH'; b.className = 'gold-btn'; }
    if (lbl !== goldenLbl) {
      goldenLbl = lbl;
      b.innerHTML = lbl + '<small>watch ad · ×2 shards for 60s</small>';
    }
  }

  let tab = 'modes';
  function renderSheet() {
    if (tab === 'modes') renderModes();
    else if (tab === 'balls') renderBalls();
    else renderFeats();
    $('btnPlay').innerHTML = '▶ ' + mode().name +
      '<small>drag or ◀ ▶ to steer · don\'t stop</small>';
  }

  function renderModes() {
    $('sheetBody').innerHTML = DATA.modes.map(m => {
      const best = m.id === 'daily' ? save.dailyBest : save.bestDist;
      return `<button class="mode ${save.sel === m.id ? 'sel' : ''} ${m.id === 'daily' ? 'daily' : ''}" data-action="sel:${m.id}">
        <div class="mode-ico">${m.id === 'daily' ? '🗓' : '🎢'}</div>
        <div class="mode-mid">
          <div class="mode-nm">${m.name}</div>
          <div class="mode-ds">${m.desc}</div>
        </div>
        <div class="mode-best">${best}m<small>${m.id === 'daily' ? 'TODAY' : 'BEST'}</small></div>
      </button>`;
    }).join('') +
    `<div class="up-head">top speed ever: <b>${save.bestKmh} km/h</b> · runs: <b>${fmtInt(save.runs)}</b></div>`;
  }

  function renderBalls() {
    $('sheetBody').innerHTML =
      `<div class="up-head">◆ <b>${fmt(save.shards)}</b> · pure flex, zero pay-to-win</div>` +
      '<div class="skin-grid">' + DATA.balls.map(c => {
        const owned = !!save.balls[c.id];
        const eq = save.ball === c.id;
        return `<button class="skin-card ${eq ? 'equip' : ''} ${owned ? '' : 'locked'}" data-action="ball:${c.id}">
          <div class="skin-dot" style="--c:${c.c}"></div>
          <div class="skin-name">${c.name}</div>
          <div class="skin-sub">${eq ? 'ON' : owned ? 'wear' : '◆ <b>' + fmt(c.cost) + '</b>'}</div>
        </button>`;
      }).join('') + '</div>' +
      '<div class="up-head" style="margin-top:6px;">TRAILS</div>' +
      '<div class="trail-row">' + DATA.trails.map(t => {
        const owned = !!save.trails[t.id];
        const eq = save.trail === t.id;
        return `<button class="skin-card ${eq ? 'equip' : ''} ${owned ? '' : 'locked'}" data-action="trail:${t.id}">
          <div class="skin-name">${t.name}</div>
          <div class="skin-sub">${eq ? 'ON' : owned ? 'wear' : '◆ <b>' + fmt(t.cost) + '</b>'}</div>
        </button>`;
      }).join('') + '</div>';
  }

  function renderFeats() {
    const done = DATA.feats.filter(f => save.feats[f.id]).length;
    $('sheetBody').innerHTML = '<div class="up-head">FEATS — <b>' + done + '/' +
      DATA.feats.length + '</b> · brag responsibly</div>' +
      '<div class="feat-grid">' + DATA.feats.map(f => {
        const got = !!save.feats[f.id];
        return `<div class="feat-card ${got ? 'done' : 'locked'}">
          <div class="feat-ico">${got ? f.ico : '❔'}</div>
          <div class="feat-name">${got ? f.name : '???'}</div>
          <div class="feat-hint">${f.hint}</div>
        </div>`;
      }).join('') + '</div>';
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ================= INPUT ================= */
  function steerFrom(e) {
    const x = (e.clientX - offX) / scale;
    steer = x < LW / 2 ? -1 : 1;
  }
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .sheet')) return;
    A.resume();
    if (state === ST.SURFACE) { startRun(); steerFrom(e); return; }
    if (state === ST.RUN) { steerFrom(e); return; }
    if (state === ST.DEAD) retry();
  });
  window.addEventListener('pointermove', (e) => {
    if (state === ST.RUN && e.buttons) steerFrom(e);
  });
  window.addEventListener('pointerup', () => { steer = 0; });
  window.addEventListener('pointercancel', () => { steer = 0; });
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && state === ST.DEAD) retry();
    if (e.code === 'Space' && state === ST.SURFACE) { A.resume(); startRun(); }
    updateKeySteer();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; updateKeySteer(); });
  function updateKeySteer() {
    const l = keys.ArrowLeft || keys.KeyA, r = keys.ArrowRight || keys.KeyD;
    steer = (r ? 1 : 0) - (l ? 1 : 0);
  }

  /* ================= BUTTONS ================= */
  $('btnPlay').addEventListener('click', () => { if (state === ST.SURFACE) { A.tap(); startRun(); } });

  $('btnGolden').addEventListener('click', () => {
    if (goldenT > 0 || goldenCd > 0) { A.deny(); return; }
    HS.SDK.rewardedAd(() => {
      goldenT = 60; goldenCd = 180;
      A.golden();
    }, () => A.deny());
  });

  $('dRetry').addEventListener('click', () => { if (state === ST.DEAD) retry(); });
  $('dMenu').addEventListener('click', toMenu);
  $('dDouble').addEventListener('click', () => {
    HS.SDK.rewardedAd(() => {
      save.shards += runShards;
      $('dShards').textContent = '◆ +' + fmt(runShards * 2) + ' banked';
      runShards = 0;
      persist(); updateHUD(); A.cash();
    }, () => A.deny());
  });
  $('dRevive').addEventListener('click', () => {
    if (usedRevive) return;
    HS.SDK.rewardedAd(revive, () => A.deny());
  });
  $('dShare').addEventListener('click', () => shareText(
    `🎢 ${$('dDist').textContent} at ${DATA.kmh(topV)} km/h on HYPERSLOPE${mode().id === 'daily' ? "'s DAILY" : ''} — beat that.`));

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
    if (act === 'sel') {
      save.sel = id; A.tap(); persist();
      renderSheet(); updateHUD();
    } else if (act === 'ball') {
      const c = DATA.balls.find(x => x.id === id);
      if (save.balls[id]) { save.ball = id; A.tap(); }
      else if (save.shards >= c.cost) {
        save.shards -= c.cost; save.balls[id] = true; save.ball = id;
        A.cash();
        if (DATA.balls.every(x => save.balls[x.id])) feat('allballs');
      } else { A.deny(); return; }
      persist(); renderBalls(); updateHUD();
    } else if (act === 'trail') {
      const t = DATA.trails.find(x => x.id === id);
      if (save.trails[id]) { save.trail = id; A.tap(); }
      else if (save.shards >= t.cost) {
        save.shards -= t.cost; save.trails[id] = true; save.trail = id;
        A.cash();
      } else { A.deny(); return; }
      persist(); renderBalls(); updateHUD();
    }
  });

  $('btnSound').addEventListener('click', () => {
    save.sound = !save.sound;
    A.enabled = save.sound;
    persist();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    A.tap();
  });

  $('btnShare').addEventListener('click', () => shareText(
    `🎢 my best on HYPERSLOPE is ${save.bestDist}m at ${save.bestKmh} km/h — beat that.`));
  async function shareText(text) {
    let url = location.href;
    const cg = await HS.SDK.invite({});
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: 'HyperSlope', text, url }); return; } } catch (e) {}
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      const el = $('shareToast');
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1600);
    } catch (e) {}
  }

  /* ================= BOOT + LOOP ================= */
  (async function boot() {
    HS.SDK.loadingStart();
    // init del SDK en paralelo: bloqueaba el arranque (attract congelado)
    const sdkReady = HS.SDK.init();
    $('btnSound').textContent = save.sound ? '🔊' : '🔇';
    trackReset(42);                 // attract slope behind the menu
    ensure(160);
    B = { x: 0, z: SEG * 2, vx: 0, v: 300, yOff: 0 };
    renderSheet(); updateHUD();
    requestAnimationFrame(loop);
    await sdkReady;
    HS.SDK.loadingStop();
  })();

  let menuDrift = 0;
  function loop(now) {
    const dt = Math.min((now - rawLast) / 1000, 0.05);
    rawLast = now;
    // attract mode: the ball rolls itself down the menu slope
    if (state === ST.SURFACE && B) {
      menuDrift += dt;
      B.z += 260 * dt;
      B.x = trackAt(B.z).x + Math.sin(menuDrift * 0.7) * 30;
      ensure(((B.z / SEG) | 0) + 130);
    }
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
})();
