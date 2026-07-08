/* ============================================================
   Scene — canvas game world (sea-and-ship presentation).
   Your ship sits center-sea. Driftwood floats by — TAP it to
   collect. Survivors drift past on barrels — TAP to rescue.
   Built parts appear on the ship; the next part shows as a
   ghost blueprint that solidifies as you save wood.
   Rain + lightning during frenzy.
   ============================================================ */
const Scene = (function () {
  let cv, ctx, W = 0, H = 0, dpr = 1;
  let cb = {};
  let t = 0, last = 0;

  /* dynamic state (set from game) */
  let built = 0, ghostProg = 0;
  let frenzy = false;
  let hintTaps = 0;

  /* entities */
  const woods = [];      // floating collectible wood
  const chips = [];      // pop particles
  const ripples = [];
  const sparks = [];     // build celebration
  const clouds = [];
  const birds = [];
  const rain = [];
  let flash = 0;
  let survivor = null;
  let woodSpawnT = 0;

  /* ---------------- setup ---------------- */
  function init(canvas, callbacks) {
    cv = canvas; ctx = cv.getContext('2d');
    cb = callbacks || {};
    for (let i = 0; i < 4; i++) clouds.push({ x: Math.random(), y: 0.05 + Math.random() * 0.15, s: 0.7 + Math.random() * 0.8, v: 0.006 + Math.random() * 0.008 });
    for (let i = 0; i < 90; i++) rain.push({ x: Math.random(), y: Math.random() });
    resize();
    new ResizeObserver(resize).observe(cv.parentElement);
    window.addEventListener('resize', resize);
    cv.addEventListener('pointerdown', onPointer);
    // a few planks waiting on first load
    for (let i = 0; i < 3; i++) spawnWood(Math.random() * 0.8 + 0.1);
    requestAnimationFrame(frame);
  }

  function resize() {
    const r = cv.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }

  /* ---------------- layout anchors ---------------- */
  const horizonY = () => H * 0.46;
  const shipX = () => W * 0.5, shipY = () => horizonY() + H * 0.13;
  const shipS = () => Math.min(W / 430, H / 430);

  /* ---------------- input ---------------- */
  function onPointer(e) {
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;

    // survivors first (rarer, higher value)
    if (survivor) {
      const dx = x - survivor.x, dy = y - survivor.y;
      if (dx * dx + dy * dy < 52 * 52) {
        splashAt(survivor.x, survivor.y);
        survivor = null;
        cb.onSurvivor && cb.onSurvivor(e);
        return;
      }
    }
    // floating wood (generous radius for mobile thumbs)
    for (let i = woods.length - 1; i >= 0; i--) {
      const w = woods[i];
      const dx = x - w.x, dy = y - w.y;
      if (dx * dx + dy * dy < 46 * 46) {
        popWood(i);
        hintTaps++;
        cb.onWood && cb.onWood(e);
        return;
      }
    }
    // missed: just a ripple (no reward — aim for the wood!)
    ripples.push({ x, y, r: 6, a: 0.5 });
  }

  function popWood(i) {
    const w = woods[i];
    splashAt(w.x, w.y);
    for (let k = 0; k < 5; k++) {
      chips.push({
        x: w.x, y: w.y,
        vx: (Math.random() - 0.5) * 180, vy: -120 - Math.random() * 140,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, life: 1,
      });
    }
    woods.splice(i, 1);
  }

  function splashAt(x, y) {
    ripples.push({ x, y, r: 4, a: 0.7 });
    ripples.push({ x, y, r: 12, a: 0.45 });
  }

  /* ---------------- spawning ---------------- */
  function spawnWood(atFrac) {
    if (woods.length >= 7) return;
    const fromLeft = Math.random() < 0.5;
    const laneY = horizonY() + H * (0.18 + Math.random() * 0.3);
    woods.push({
      x: atFrac != null ? W * atFrac : (fromLeft ? -40 : W + 40),
      y: laneY,
      vx: (fromLeft ? 1 : -1) * (16 + Math.random() * 14),
      rot: Math.random() * Math.PI,
      phase: Math.random() * 6,
      size: 0.85 + Math.random() * 0.5,
      plank: Math.random() < 0.35,
    });
  }

  function spawnSurvivor() {
    if (survivor) return false;
    const fromLeft = Math.random() < 0.5;
    survivor = {
      x: fromLeft ? -60 : W + 60,
      y: horizonY() + H * (0.22 + Math.random() * 0.22),
      vx: (fromLeft ? 1 : -1) * (24 + Math.random() * 10),
      phase: Math.random() * 6,
    };
    return true;
  }

  /* ---------------- public setters ---------------- */
  function setBuild(b, prog) { built = b; ghostProg = prog; }
  function setWeather(f) { frenzy = f; }
  function hasSurvivor() { return !!survivor; }
  function buildFx() {
    for (let k = 0; k < 22; k++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
      sparks.push({
        x: shipX() + (Math.random() - 0.5) * 120 * shipS(),
        y: shipY() - 60 * shipS() + (Math.random() - 0.5) * 80 * shipS(),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0.9 + Math.random() * 0.4,
      });
    }
  }

  /* ---------------- helpers ---------------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------------- sky / sea ---------------- */
  function drawSky() {
    const hy = horizonY();
    const g = ctx.createLinearGradient(0, 0, 0, hy);
    if (frenzy) { g.addColorStop(0, '#3d4f66'); g.addColorStop(1, '#71879b'); }
    else { g.addColorStop(0, '#5aa7d6'); g.addColorStop(0.7, '#a5d5ee'); g.addColorStop(1, '#d7eef8'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hy + 2);

    if (!frenzy) {
      const sx = W * 0.85, sy = H * 0.11, sr = Math.min(W, H) * 0.05;
      const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 4);
      rg.addColorStop(0, 'rgba(255,236,170,.85)');
      rg.addColorStop(0.35, 'rgba(255,215,107,.28)');
      rg.addColorStop(1, 'rgba(255,215,107,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
      ctx.fillStyle = '#ffe9a6';
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
    }

    ctx.fillStyle = frenzy ? 'rgba(210,220,230,.5)' : 'rgba(255,255,255,.85)';
    clouds.forEach(c => {
      const cx = ((c.x + t * c.v) % 1.3 - 0.15) * W, cy = c.y * H, s = c.s * Math.min(W, H) * 0.055;
      ctx.beginPath();
      ctx.arc(cx, cy, s, 0, 7);
      ctx.arc(cx + s * 1.1, cy + s * 0.25, s * 0.75, 0, 7);
      ctx.arc(cx - s * 1.1, cy + s * 0.28, s * 0.7, 0, 7);
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(30,60,80,.55)'; ctx.lineWidth = 1.6;
    birds.forEach(b => {
      const bx = b.x, by = b.y + Math.sin(t * 3 + b.o) * 3, w = 7 * b.s, f = Math.sin(t * 9 + b.o) * 3 * b.s;
      ctx.beginPath();
      ctx.moveTo(bx - w, by + f); ctx.quadraticCurveTo(bx - w * 0.3, by - 2 * b.s, bx, by);
      ctx.quadraticCurveTo(bx + w * 0.3, by - 2 * b.s, bx + w, by + f);
      ctx.stroke();
    });
  }

  function drawSea() {
    const hy = horizonY();
    const g = ctx.createLinearGradient(0, hy, 0, H);
    if (frenzy) { g.addColorStop(0, '#28536e'); g.addColorStop(1, '#0d2436'); }
    else { g.addColorStop(0, '#3f96c4'); g.addColorStop(0.4, '#1f6d9c'); g.addColorStop(1, '#0d3c5e'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, hy, W, H - hy);

    for (let i = 0; i < 3; i++) {
      const baseY = hy + (H - hy) * (0.22 + i * 0.26);
      const amp = 5 + i * 3, wl = 130 + i * 60, speed = (i % 2 ? -1 : 1) * (18 + i * 8);
      ctx.beginPath();
      ctx.moveTo(-10, H + 10);
      for (let x = -10; x <= W + 10; x += 8) {
        ctx.lineTo(x, baseY + Math.sin((x + t * speed) / wl * Math.PI * 2) * amp);
      }
      ctx.lineTo(W + 10, H + 10);
      ctx.closePath();
      ctx.fillStyle = frenzy
        ? ['rgba(38,80,106,.65)', 'rgba(26,60,84,.7)', 'rgba(16,42,62,.8)'][i]
        : ['rgba(66,152,192,.55)', 'rgba(40,116,158,.65)', 'rgba(22,82,120,.75)'][i];
      ctx.fill();
      ctx.beginPath();
      for (let x = -10; x <= W + 10; x += 8) {
        const y = baseY + Math.sin((x + t * speed) / wl * Math.PI * 2) * amp;
        x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.22 - i * 0.05) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /* ---------------- the ship ---------------- */
  /* Part i: solid if i < built; ghost blueprint if i === built,
     with opacity following savings progress. */
  function partAlpha(i) {
    if (i < built) return 1;
    if (i === built) return 0.12 + ghostProg * 0.3;
    return 0;
  }
  function isGhost(i) { return i === built; }

  function drawShip() {
    const cx = shipX(), cy = shipY() + Math.sin(t * 1.1) * 4;
    const s = shipS();
    const w = 290 * s, hh = 72 * s;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 0.9) * 0.012);

    // water shadow
    ctx.fillStyle = 'rgba(5,25,40,.35)';
    ctx.beginPath(); ctx.ellipse(0, hh * 0.75, w * 0.52, 12 * s, 0, 0, 7); ctx.fill();

    // ---- base raft (always present — where you start) ----
    ctx.fillStyle = '#8a5a28';
    rr(-w * 0.28, hh * 0.28, w * 0.56, 14 * s, 5 * s); ctx.fill();
    ctx.strokeStyle = '#5d3a14'; ctx.lineWidth = 1.6 * s; ctx.stroke();
    for (let i = -2; i <= 2; i++) { // raft logs
      ctx.beginPath(); ctx.moveTo(i * w * 0.11, hh * 0.28); ctx.lineTo(i * w * 0.11, hh * 0.28 + 14 * s); ctx.stroke();
    }
    // barrel on the raft
    ctx.fillStyle = '#a5682a';
    rr(w * 0.19, hh * 0.05, 18 * s, 24 * s, 5 * s); ctx.fill();
    ctx.strokeStyle = '#5d3a14'; ctx.lineWidth = 1.4 * s; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.19, hh * 0.13); ctx.lineTo(w * 0.19 + 18 * s, hh * 0.13); ctx.stroke();

    const wood = ctx.createLinearGradient(0, -hh, 0, hh);
    wood.addColorStop(0, '#b07a3e'); wood.addColorStop(1, '#6e4519');

    const ghostStyle = (i) => {
      if (isGhost(i)) { ctx.setLineDash([6 * s, 5 * s]); ctx.strokeStyle = '#dff2ff'; }
      else ctx.setLineDash([]);
    };

    /* 0 — keel + ribs */
    let a = partAlpha(0);
    if (a > 0) {
      ctx.globalAlpha = a;
      ghostStyle(0);
      if (!isGhost(0)) ctx.strokeStyle = '#8a5a28';
      ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w * 0.46, -hh * 0.1);
      ctx.quadraticCurveTo(0, hh * 0.9, w * 0.46, -hh * 0.1);
      ctx.stroke();
      ctx.lineWidth = 3.5 * s;
      for (let i = -3; i <= 3; i++) {
        const rx = i * w * 0.115, ry = hh * (0.62 - Math.abs(i) * 0.09);
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx * 1.06, -hh * 0.35); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    /* 1 — hull with planks */
    a = partAlpha(1);
    if (a > 0) {
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, -hh * 0.35);
      ctx.quadraticCurveTo(-w * 0.52, hh * 0.15, -w * 0.36, hh * 0.5);
      ctx.quadraticCurveTo(0, hh * 0.95, w * 0.36, hh * 0.5);
      ctx.quadraticCurveTo(w * 0.52, hh * 0.15, w * 0.5, -hh * 0.35);
      ctx.closePath();
      if (!isGhost(1)) {
        ctx.fillStyle = wood; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.strokeStyle = 'rgba(60,35,10,.5)'; ctx.lineWidth = 1.4 * s;
        for (let i = 1; i <= 4; i++) {
          const y = -hh * 0.35 + i * hh * 0.26;
          ctx.beginPath(); ctx.moveTo(-w * 0.55, y); ctx.lineTo(w * 0.55, y); ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = '#4d2f0f'; ctx.lineWidth = 2.5 * s; ctx.stroke();
      } else { ghostStyle(1); ctx.lineWidth = 2.5 * s; ctx.stroke(); ctx.setLineDash([]); }
    }

    /* 2 — deck */
    a = partAlpha(2);
    if (a > 0) {
      ctx.globalAlpha = a;
      rr(-w * 0.47, -hh * 0.46, w * 0.94, hh * 0.16, 5 * s);
      if (!isGhost(2)) {
        ctx.fillStyle = '#c68f4e'; ctx.fill();
        ctx.strokeStyle = '#5d3a14'; ctx.lineWidth = 1.6 * s; ctx.stroke();
      } else { ghostStyle(2); ctx.lineWidth = 2 * s; ctx.stroke(); ctx.setLineDash([]); }
    }

    /* 3 — cabin */
    a = partAlpha(3);
    const cabW = w * 0.4, cabH = hh * 0.62, cabX = -cabW / 2, cabY = -hh * 0.46 - cabH;
    if (a > 0) {
      ctx.globalAlpha = a;
      rr(cabX, cabY, cabW, cabH, 4 * s);
      if (!isGhost(3)) {
        ctx.fillStyle = '#a5682a'; ctx.fill();
        ctx.strokeStyle = '#4d2f0f'; ctx.lineWidth = 2 * s; ctx.stroke();
        ctx.fillStyle = '#ffe9a6';
        ctx.beginPath(); ctx.arc(cabX + cabW * 0.72, cabY + cabH * 0.45, 6.5 * s, 0, 7); ctx.fill();
        ctx.strokeStyle = '#5d3a14'; ctx.lineWidth = 1.5 * s; ctx.stroke();
        ctx.fillStyle = '#6e4519';
        rr(cabX + cabW * 0.16, cabY + cabH * 0.3, cabW * 0.2, cabH * 0.7, 3 * s); ctx.fill();
      } else { ghostStyle(3); ctx.lineWidth = 2 * s; ctx.stroke(); ctx.setLineDash([]); }
    }

    /* 4 — mast */
    a = partAlpha(4);
    const mastTop = cabY - hh * 1.5;
    if (a > 0) {
      ctx.globalAlpha = a;
      ghostStyle(4);
      if (!isGhost(4)) ctx.strokeStyle = '#5d3a14';
      ctx.lineWidth = 4.5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -hh * 0.46); ctx.lineTo(0, mastTop); ctx.stroke();
      ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(-w * 0.17, mastTop + hh * 0.22); ctx.lineTo(w * 0.17, mastTop + hh * 0.22); ctx.stroke();
      ctx.setLineDash([]);
    }

    /* 5 — sail */
    a = partAlpha(5);
    if (a > 0) {
      ctx.globalAlpha = a;
      const sw = w * 0.16, topY = mastTop + hh * 0.25, botY = cabY - hh * 0.15;
      const billow = 10 * s + Math.sin(t * 1.6) * 3 * s;
      ctx.beginPath();
      ctx.moveTo(-sw, topY);
      ctx.lineTo(sw, topY);
      ctx.quadraticCurveTo(sw + billow, (topY + botY) / 2, sw, botY);
      ctx.lineTo(-sw, botY);
      ctx.quadraticCurveTo(-sw + billow, (topY + botY) / 2, -sw, topY);
      if (!isGhost(5)) {
        ctx.fillStyle = '#f6efdd'; ctx.fill();
        ctx.strokeStyle = '#c9b98f'; ctx.lineWidth = 1.6 * s; ctx.stroke();
      } else { ghostStyle(5); ctx.lineWidth = 2 * s; ctx.stroke(); ctx.setLineDash([]); }
    }

    /* 6 — ramp */
    a = partAlpha(6);
    if (a > 0) {
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(-w * 0.42, -hh * 0.34);
      ctx.lineTo(-w * 0.72, hh * 0.55);
      ctx.lineTo(-w * 0.62, hh * 0.62);
      ctx.lineTo(-w * 0.34, -hh * 0.28);
      ctx.closePath();
      if (!isGhost(6)) {
        ctx.fillStyle = '#8a5a28'; ctx.fill();
        ctx.strokeStyle = '#4d2f0f'; ctx.lineWidth = 1.6 * s; ctx.stroke();
      } else { ghostStyle(6); ctx.lineWidth = 2 * s; ctx.stroke(); ctx.setLineDash([]); }
    }

    /* 7 — stalls (deck fencing) */
    a = partAlpha(7);
    if (a > 0) {
      ctx.globalAlpha = a;
      ghostStyle(7);
      if (!isGhost(7)) ctx.strokeStyle = '#5d3a14';
      ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const x0 = side * w * 0.26, x1 = side * w * 0.44;
        ctx.beginPath(); ctx.moveTo(x0, -hh * 0.66); ctx.lineTo(x1, -hh * 0.62); ctx.stroke();
        for (let i = 0; i <= 2; i++) {
          const px = x0 + (x1 - x0) * (i / 2);
          ctx.beginPath(); ctx.moveTo(px, -hh * 0.64); ctx.lineTo(px, -hh * 0.44); ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }

    /* 8 — animals */
    a = partAlpha(8);
    if (a > 0 && !isGhost(8)) {
      ctx.globalAlpha = a;
      ctx.fillStyle = '#3c2712';
      const gx = w * 0.33, gy = -hh * 0.62;
      ctx.beginPath(); ctx.ellipse(gx, gy, 9 * s, 6 * s, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#3c2712'; ctx.lineWidth = 3.4 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(gx + 6 * s, gy - 3 * s); ctx.lineTo(gx + 13 * s, gy - 26 * s); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(gx + 14.5 * s, gy - 28 * s, 4.5 * s, 3 * s, 0.5, 0, 7); ctx.fill();
      const ex = -w * 0.34, ey = -hh * 0.6;
      ctx.beginPath(); ctx.ellipse(ex, ey, 11 * s, 8 * s, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 10 * s, ey - 5 * s, 5.5 * s, 0, 7); ctx.fill();
      ctx.lineWidth = 2.6 * s;
      ctx.beginPath(); ctx.moveTo(ex + 14 * s, ey - 3 * s);
      ctx.quadraticCurveTo(ex + 19 * s, ey + 3 * s, ex + 16 * s, ey + 8 * s); ctx.stroke();
    }

    /* 9 — roof */
    a = partAlpha(9);
    if (a > 0) {
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(cabX - 8 * s, cabY);
      ctx.lineTo(0, cabY - hh * 0.4);
      ctx.lineTo(cabX + cabW + 8 * s, cabY);
      ctx.closePath();
      if (!isGhost(9)) {
        ctx.fillStyle = '#8a3b22'; ctx.fill();
        ctx.strokeStyle = '#5a2413'; ctx.lineWidth = 2 * s; ctx.stroke();
      } else { ghostStyle(9); ctx.lineWidth = 2 * s; ctx.stroke(); ctx.setLineDash([]); }
    }

    /* 10 — figurehead + flag + completion aura */
    a = partAlpha(10);
    if (a > 0 && !isGhost(10)) {
      ctx.globalAlpha = a;
      // dove figurehead at bow
      ctx.fillStyle = '#f6efdd';
      ctx.beginPath(); ctx.ellipse(w * 0.5, -hh * 0.42, 10 * s, 6 * s, -0.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.54, -hh * 0.52, 4.5 * s, 0, 7); ctx.fill();
      // flag
      ctx.strokeStyle = '#5d3a14'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(0, mastTop); ctx.lineTo(0, mastTop - 18 * s); ctx.stroke();
      const fw = 22 * s, flap = Math.sin(t * 5) * 3 * s;
      ctx.beginPath();
      ctx.moveTo(0, mastTop - 18 * s);
      ctx.lineTo(fw, mastTop - 13 * s + flap);
      ctx.lineTo(0, mastTop - 8 * s);
      ctx.closePath();
      ctx.fillStyle = '#ffb938'; ctx.fill();
      if (built >= 11) {
        ctx.globalAlpha = 0.25 + Math.sin(t * 2) * 0.1;
        const rg = ctx.createRadialGradient(0, -hh * 0.4, 0, 0, -hh * 0.4, w * 0.7);
        rg.addColorStop(0, 'rgba(255,215,107,.5)'); rg.addColorStop(1, 'rgba(255,215,107,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(-w, -hh * 3, w * 2, hh * 4);
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------------- floating wood ---------------- */
  function drawWoods(dt) {
    for (let i = woods.length - 1; i >= 0; i--) {
      const w = woods[i];
      w.x += w.vx * dt;
      w.phase += dt * 2;
      if (w.x < -60 || w.x > W + 60) { woods.splice(i, 1); continue; }
      const bobY = w.y + Math.sin(w.phase) * 3;
      const s = w.size * Math.min(W / 420, 1.15);

      ctx.save();
      ctx.translate(w.x, bobY);
      ctx.rotate(Math.sin(w.phase * 0.7) * 0.08 + (w.plank ? 0.25 : 0));
      // shadow in the water
      ctx.fillStyle = 'rgba(5,25,40,.3)';
      ctx.beginPath(); ctx.ellipse(0, 10 * s, 26 * s, 5 * s, 0, 0, 7); ctx.fill();
      if (w.plank) {
        ctx.fillStyle = '#c68f4e';
        rr(-24 * s, -6 * s, 48 * s, 12 * s, 3 * s); ctx.fill();
        ctx.strokeStyle = '#5d3a14'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.strokeStyle = 'rgba(60,35,10,.4)';
        ctx.beginPath(); ctx.moveTo(-14 * s, -6 * s); ctx.lineTo(-14 * s, 6 * s);
        ctx.moveTo(4 * s, -6 * s); ctx.lineTo(4 * s, 6 * s); ctx.stroke();
      } else {
        const lg = ctx.createLinearGradient(0, -9 * s, 0, 9 * s);
        lg.addColorStop(0, '#a5682a'); lg.addColorStop(1, '#6e4519');
        ctx.fillStyle = lg;
        rr(-26 * s, -9 * s, 52 * s, 18 * s, 8 * s); ctx.fill();
        ctx.strokeStyle = '#4d2f0f'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = '#d9a969';
        ctx.beginPath(); ctx.ellipse(20 * s, 0, 6 * s, 8.4 * s, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#8a5a28'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(20 * s, 0, 3 * s, 4.5 * s, 0, 0, 7); ctx.stroke();
      }
      ctx.restore();

      // sparkle ring on the nearest few, teaching "tap the wood"
      if (hintTaps < 6) {
        const pr = (t + i) % 1.3 / 1.3;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - pr)) + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(w.x, bobY, (30 + pr * 16) * s, 0, 7); ctx.stroke();
      }
    }

    // hint label
    if (hintTaps < 6) {
      const label = 'TAP THE FLOATING WOOD!';
      ctx.font = '800 ' + Math.max(12, Math.min(15, W / 30)) + 'px "Segoe UI", sans-serif';
      const tw = ctx.measureText(label).width;
      const lx = W / 2, ly = H * 0.9;
      ctx.fillStyle = 'rgba(8,28,42,.72)';
      rr(lx - tw / 2 - 14, ly - 14, tw + 28, 28, 14); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
    }
  }

  /* ---------------- survivor on a barrel ---------------- */
  function drawSurvivor(dt) {
    if (!survivor) return;
    survivor.x += survivor.vx * dt;
    survivor.phase += dt * 2.2;
    if (survivor.x < -80 || survivor.x > W + 80) { survivor = null; cb.onSurvivorGone && cb.onSurvivorGone(); return; }
    const x = survivor.x, y = survivor.y + Math.sin(survivor.phase) * 4;

    ctx.save();
    // shadow
    ctx.fillStyle = 'rgba(5,25,40,.3)';
    ctx.beginPath(); ctx.ellipse(x, y + 18, 26, 6, 0, 0, 7); ctx.fill();
    // barrel
    ctx.fillStyle = '#a5682a';
    rr(x - 15, y - 4, 30, 22, 6); ctx.fill();
    ctx.strokeStyle = '#5d3a14'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 15, y + 4); ctx.lineTo(x + 15, y + 4);
    ctx.moveTo(x - 15, y + 11); ctx.lineTo(x + 15, y + 11); ctx.stroke();
    // survivor: head + waving arm
    ctx.fillStyle = '#f2c49b';
    ctx.beginPath(); ctx.arc(x, y - 14, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#c0392b'; // shirt
    rr(x - 8, y - 8, 16, 8, 3); ctx.fill();
    const wave = Math.sin(t * 6) * 0.5;
    ctx.strokeStyle = '#f2c49b'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 7, y - 6);
    ctx.lineTo(x + 14 + wave * 3, y - 20 - Math.abs(wave) * 5); ctx.stroke();
    // HELP! bubble
    const bob = Math.sin(t * 3) * 2;
    ctx.fillStyle = '#fff';
    rr(x + 14, y - 42 + bob, 46, 20, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 20, y - 24 + bob); ctx.lineTo(x + 16, y - 18 + bob); ctx.lineTo(x + 28, y - 23 + bob); ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.font = '800 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('HELP!', x + 37, y - 32 + bob);
    // attention ring
    const pr = (t % 1) / 1;
    ctx.strokeStyle = 'rgba(255,185,56,' + (0.9 * (1 - pr)) + ')';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y - 6, 30 + pr * 20, 0, 7); ctx.stroke();
    ctx.restore();
  }

  /* ---------------- particles ---------------- */
  function drawChips(dt) {
    for (let i = chips.length - 1; i >= 0; i--) {
      const c = chips[i];
      c.vy += 620 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      c.rot += c.vr * dt; c.life -= dt * 1.2;
      if (c.life <= 0) { chips.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.globalAlpha = Math.min(1, c.life * 2);
      ctx.fillStyle = '#9a6630';
      rr(-5, -2.5, 10, 5, 2); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawRipples(dt) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += dt * 60; r.a -= dt * 1.3;
      if (r.a <= 0) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(255,255,255,' + r.a + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.45, 0, 0, 7); ctx.stroke();
    }
  }

  function drawSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 1.6);
      ctx.fillStyle = '#ffd76b';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRain(dt) {
    if (!frenzy) return;
    ctx.strokeStyle = 'rgba(190,220,240,.5)'; ctx.lineWidth = 1.4;
    rain.forEach(d => {
      d.y += dt * 1.3; d.x += dt * 0.06;
      if (d.y > 1) { d.y -= 1; d.x = Math.random(); }
      const x = d.x * W, y = d.y * H;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12); ctx.stroke();
    });
    if (Math.random() < 0.004) flash = 0.55;
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + flash + ')';
      ctx.fillRect(0, 0, W, H);
      flash -= dt * 2.4;
    }
  }

  /* ---------------- frame ---------------- */
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
    last = now; t += dt;

    // wood spawner (faster during frenzy — the storm churns up debris)
    woodSpawnT -= dt;
    if (woodSpawnT <= 0) {
      spawnWood();
      woodSpawnT = (frenzy ? 0.7 : 1.5) + Math.random() * (frenzy ? 0.6 : 1.3);
    }

    if (Math.random() < 0.002 && birds.length < 3) {
      birds.push({ x: -20, y: 30 + Math.random() * H * 0.18, s: 0.7 + Math.random() * 0.6, o: Math.random() * 6, v: 26 + Math.random() * 18 });
    }
    for (let i = birds.length - 1; i >= 0; i--) {
      birds[i].x += birds[i].v * dt;
      if (birds[i].x > W + 30) birds.splice(i, 1);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawSea();
    drawShip();
    drawWoods(dt);
    drawSurvivor(dt);
    drawChips(dt);
    drawRipples(dt);
    drawSparks(dt);
    drawRain(dt);
    requestAnimationFrame(frame);
  }

  return { init, setBuild, setWeather, spawnSurvivor, hasSurvivor, buildFx };
})();
