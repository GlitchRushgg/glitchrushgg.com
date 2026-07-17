// DREAM DUO v3 — "FLOFFY FLING" (pivote total 2026-07-17, visión fundadora:
// "un dúo como Mario y Cappy — como Cappy ayuda a Mario").
// UN solo mundo side-scroll portrait: Elizabeth corre sola; TAP = salta
// (altura variable, coyote+buffer de la v1); FLICK = lanza a FLOFFY, que
// vuela recto como bumerán blandito, recoge lo dorado, revienta lo oscuro
// y SIEMPRE vuelve a sus brazos. Golpe = tropiezo (2.5s de gracia), la
// estrella perdida jamás castiga. Niveles cortos con la familia en la meta.
// Sin motor de físicas — movimiento manual con dt acotado.

import { W, H } from "../const.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { SDK } from "../utils/SDK.js";

const FONT = "'Segoe UI', system-ui, sans-serif";
const GROUND_Y = 752;                 // línea de suelo en portrait (bg 720→844)
const ELIZ_X = 96;
// física heredada de la v1 (ya afinada): grav/jump/cut + coyote y buffer
const PH = { grav: 2600, jump: -1010, cut: -440, coyote: 0.09, buffer: 0.12 };
const FLING = { vx: 480, life: 0.9, back: 860, grab: 50 };
const LEVELS = [
  { speed: 300, len: 9500,  bg: "bg-park-day",    name: "SUNNY PARK" },
  { speed: 330, len: 11000, bg: "bg-park-sunset", name: "GOLDEN HOUR" },
  { speed: 360, len: 12500, bg: "bg-park-night",  name: "STARLIGHT" },
];
// tipos: saltables bajos vs. "Floffy-only" (altos o voladores)
const OB_JUMP = ["bench", "hedge", "birdbath"];
const OB_FLING = ["blocks", "top", "pigeon"];
const OB_H = { bench: 66, hedge: 70, birdbath: 78, blocks: 128, top: 92, pigeon: 56 };

// RNG con semilla (cursos fijos y aprendibles)
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class GameScene extends Phaser.Scene {
  constructor() { super("Game"); }

  create(data) {
    window.__dd = this;
    this.snd = new Sound();
    this.snd.resume();
    const sv = Save.get();
    this.level = (data && data.level) || sv.ffLevel || 1;
    const L = LEVELS[(this.level - 1) % LEVELS.length];
    this.speed0 = L.speed;
    this.len = L.len;

    // ---------- estado ----------
    this.tt = 0; this.dist = 0; this.hearts = 3; this.starsRun = 0;
    this.starsTotal = 0; this.invuln = 0; this.rubberT = 0; this.slowmo = 0;
    this.dead = false; this.won = false;
    this.objs = [];                       // {kind:"star"|"ob", d, y, spr, ...}
    this._course = this._makeCourse();
    this._ci = 0;                         // próximo evento del curso

    // ---------- mundo ----------
    this.bg = this.add.tileSprite(W / 2, H / 2, W, H, L.bg);
    this.bg.setTileScale(H / 720);
    // suelo de refuerzo (franja bajo la línea, por si el bg no llega)
    this.add.rectangle(W / 2, (GROUND_Y + H) / 2 + 26, W, H - GROUND_Y, 0x2e7d4f, 0).setDepth(1);

    // ---------- Elizabeth ----------
    this.E = { y: GROUND_Y, vy: 0, grounded: true, coyote: 0, buffer: 0, animT: 0, frame: 0 };
    this.eliz = this.add.image(ELIZ_X, GROUND_Y, "eliz-r1").setOrigin(0.5, 1).setDepth(10);
    this._elizScale = 150 / this.eliz.height;
    this.eliz.setScale(this._elizScale);
    this.shadowE = this.add.ellipse(ELIZ_X, GROUND_Y + 6, 74, 16, 0x1a1030, 0.28).setDepth(9);

    // ---------- FLOFFY ----------
    // state: 0 = en brazos · 1 = volando · 2 = volviendo (bumerán homing)
    this.F = { state: 0, x: 0, y: 0, t: 0 };
    this.flofy = this.add.image(ELIZ_X + 26, GROUND_Y - 74, "flofy-front").setOrigin(0.5, 0.5).setDepth(11);
    this._flofyScale = 62 / this.flofy.height;
    this.flofy.setScale(this._flofyScale);

    // ceño enfadado para los obstáculos (C3: lo malo se ve malo)
    if (!this.textures.exists("angry-eyes")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff); g.fillEllipse(15, 14, 20, 15); g.fillEllipse(37, 14, 20, 15);
      g.fillStyle(0x1a1030); g.fillEllipse(17, 15, 9, 10); g.fillEllipse(35, 15, 9, 10);
      g.lineStyle(5, 0xd83a5e);
      g.beginPath(); g.moveTo(3, 3); g.lineTo(25, 10); g.strokePath();
      g.beginPath(); g.moveTo(49, 3); g.lineTo(27, 10); g.strokePath();
      g.generateTexture("angry-eyes", 52, 26); g.destroy();
    }

    this._buildHUD();
    this._bindInput();
    this._banner(`LEVEL ${this.level}\n${L.name}`);
    this.snd.startMusic();
    this.events.once("shutdown", () => this.snd.stopMusic());
    if (SDK.gameplayStart) SDK.gameplayStart();
  }

  /* ================= CURSO (con semilla) ================= */
  _makeCourse() {
    const r = rng(1234 + this.level * 77);
    const ev = [];
    let d = 900;
    const lvl = this.level;
    while (d < this.len - 900) {
      const roll = r();
      if (roll < 0.38) {
        // hilera de estrellas (a pecho o en arquito de salto)
        const n = 3 + ((r() * 3) | 0);
        const arc = r() < 0.4;
        for (let i = 0; i < n; i++) {
          const yy = arc ? GROUND_Y - 90 - Math.sin((i / (n - 1)) * Math.PI) * 130 : GROUND_Y - 84;
          ev.push({ kind: "star", d: d + i * 64, y: yy });
        }
        this.starsTotal = (this.starsTotal || 0) + n;
        d += n * 64 + 260 + r() * 160;
      } else if (roll < 0.72 || lvl < 2) {
        // obstáculo saltable
        const t = OB_JUMP[(r() * OB_JUMP.length) | 0];
        ev.push({ kind: "ob", d, y: GROUND_Y, type: t });
        d += 300 + r() * 200;
      } else {
        // obstáculo para FLOFFY (torre alta o paloma) — desde el nivel 2
        const t = OB_FLING[(r() * OB_FLING.length) | 0];
        ev.push({ kind: "ob", d, y: t === "pigeon" ? GROUND_Y - 120 : GROUND_Y, type: t });
        d += 380 + r() * 240;
      }
    }
    ev.sort((a, b) => a.d - b.d);
    return ev;
  }

  /* ================= HUD ================= */
  _buildHUD() {
    this.heartIcons = [0, 1, 2].map((i) => this.add.image(26 + i * 30, 30, "heart").setScale(0.8).setDepth(40));
    this.add.image(W - 92, 30, "star").setScale(0.5).setDepth(40);
    this.starTxt = this.add.text(W - 74, 30, "0", { fontFamily: FONT, fontSize: "19px", color: "#ffd94e", fontStyle: "bold" }).setOrigin(0, 0.5).setDepth(40);
    // barra de progreso del nivel
    this.add.rectangle(W / 2, 62, 250, 8, 0x241a4a, 0.85).setDepth(40);
    this.progFill = this.add.rectangle(W / 2 - 125, 62, 1, 8, 0x8ef5c9).setOrigin(0, 0.5).setDepth(41);
    // icono de Floffy: gris mientras está fuera (el cooldown ES su viaje)
    this.flofyIcon = this.add.image(W - 30, 30, "flofy-front").setDepth(40);
    this.flofyIcon.setScale(34 / this.flofyIcon.height);
  }

  /* ================= INPUT: tap = salto · flick = FLING ================= */
  _bindInput() {
    this.input.on("pointerdown", (p) => { this._pd = { x: p.x, y: p.y, t: this.tt, used: false }; });
    this.input.on("pointermove", (p) => {
      const d = this._pd;
      if (d && !d.used && Math.hypot(p.x - d.x, p.y - d.y) > 18) { d.used = true; this._fling(); }
    });
    this.input.on("pointerup", () => {
      const d = this._pd;
      if (d && !d.used) { d.used = true; this._jumpPress(); }
      if (this.E.vy < PH.cut) this.E.vy = PH.cut;   // soltar = salto corto
      this._pd = null;
    });
    this.input.keyboard.on("keydown-SPACE", () => this._jumpPress());
    this.input.keyboard.on("keydown-F", () => this._fling());
  }

  _jumpPress() {
    if (this.dead || this.won) return;
    this.E.buffer = PH.buffer;
  }

  _fling() {
    if (this.dead || this.won || this.F.state !== 0) return;
    if (this.E.grounded) {
      // lanzamiento a la altura del pecho, recto hacia delante
      this.F.state = 1; this.F.t = 0;
      this.F.x = ELIZ_X + 30; this.F.y = this.E.y - 92;
    } else {
      // FLING AÉREO: trampolín bajo los pies → rebote + Floffy sigue volando
      this.E.vy = PH.jump * 0.86;
      this.F.state = 1; this.F.t = 0;
      this.F.x = ELIZ_X + 16; this.F.y = this.E.y + 8;
      const tramp = this.add.image(ELIZ_X, this.E.y + 12, "flofy-hop").setDepth(9).setAlpha(0.85);
      tramp.setScale(56 / tramp.height);
      this.tweens.add({ targets: tramp, alpha: 0, scale: tramp.scale * 1.4, duration: 260, onComplete: () => tramp.destroy() });
      this.snd.hopF();
    }
    this.flofy.setTexture("flofy-hop");
    this.flofy.setScale(56 / this.flofy.height);
    this.snd.flutter();
    this.flofyIcon.setTint(0x777788);
    if (!this._flingShown) { this._flingShown = true; }
  }

  /* ================= UPDATE ================= */
  update(_, dms) {
    if (this.dead || this.won) return;
    let dt = Math.min(dms / 1000, 0.05);
    this.tt += dt;
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.4; }
    if (this.rubberT > 0) this.rubberT -= dt;
    if (this.invuln > 0) this.invuln -= dt;

    const speed = this.speed0 * (this.rubberT > 0 ? 0.88 : 1);
    this.dist += speed * dt;
    // parallax 0.4: el parque fluye suave y la costura del tile (1280px)
    // aparece 2.5× menos — vista en los PNG de verificación
    this.bg.tilePositionX += (speed * dt * 0.4) / this.bg.tileScaleX;
    this.progFill.width = Math.max(1, 250 * Math.min(1, this.dist / this.len));

    this._updateEliz(dt);
    this._updateFloffy(dt, speed);
    this._spawnFromCourse();
    this._moveObjs(dt, speed);
    this._tutorial();

    if (this.dist >= this.len && !this._goalSpawned) this._spawnGoal();
    if (this._goal) {
      this._goal.x -= speed * dt;
      if (this._goal.x <= ELIZ_X + 60) this._win();
    }
  }

  _updateEliz(dt) {
    const E = this.E;
    E.coyote = E.grounded ? PH.coyote : Math.max(0, E.coyote - dt);
    E.buffer = Math.max(0, E.buffer - dt);
    if (E.buffer > 0 && E.coyote > 0) {
      E.vy = PH.jump; E.grounded = false; E.coyote = 0; E.buffer = 0;
      this.snd.jumpE();
    }
    if (!E.grounded) {
      E.vy += PH.grav * dt;
      E.y += E.vy * dt;
      if (E.y >= GROUND_Y) { E.y = GROUND_Y; E.vy = 0; E.grounded = true; }
    }
    // sprite: zancada de 4 fases en suelo, pose de salto en el aire
    if (E.grounded) {
      E.animT += dt * (this.speed0 / 26);
      const frames = ["eliz-r1", "eliz-r2", "eliz-r3", "eliz-r4"];
      const fr = Math.floor(E.animT) % 4;
      if (fr !== E.frame) { E.frame = fr; this.eliz.setTexture(frames[fr]); this.eliz.setScale(this._elizScale); }
    } else if (this.eliz.texture.key !== "eliz-jump") {
      this.eliz.setTexture("eliz-jump"); this.eliz.setScale(this._elizScale);
    }
    this.eliz.y = E.y;
    this.shadowE.setScale(Math.max(0.4, 1 - (GROUND_Y - E.y) / 400), 1);
    this.eliz.setAlpha(this.invuln > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(this.tt * 14)) : 1);
  }

  _updateFloffy(dt, speed) {
    const F = this.F;
    if (F.state === 0) {
      // en brazos: pegadito a ella, con bobbing
      this.flofy.x = ELIZ_X + 26;
      this.flofy.y = this.E.y - 74 + Math.sin(this.tt * 9) * 3;
      if (this.flofy.texture.key !== "flofy-front") { this.flofy.setTexture("flofy-front"); this.flofy.setScale(this._flofyScale); }
      this.flofy.rotation = 0;
      return;
    }
    if (F.state === 1) {
      F.t += dt;
      F.x += FLING.vx * dt;
      this.flofy.rotation += dt * 14;             // bolita girando
      if (F.t > FLING.life || F.x > W + 30) F.state = 2;
    } else {
      // bumerán homing de vuelta a los brazos — NUNCA se pierde
      const tx = ELIZ_X + 26, ty = this.E.y - 74;
      const dx = tx - F.x, dy = ty - F.y;
      const dd = Math.hypot(dx, dy);
      if (dd < 34) {
        F.state = 0;
        this.snd.hopF();
        this.flofyIcon.clearTint();
      } else {
        F.x += (dx / dd) * FLING.back * dt;
        F.y += (dy / dd) * FLING.back * dt - 60 * dt; // arquito por arriba
        this.flofy.rotation += dt * 10;
      }
    }
    this.flofy.x = F.x; this.flofy.y = F.y;

    // Floffy en vuelo: recoge lo dorado, revienta lo oscuro
    if (F.state === 1) {
      for (const o of this.objs) {
        if (o.taken) continue;
        const dx = Math.abs(o.spr.x - F.x), dy = Math.abs((o.kind === "ob" ? o.spr.y - o.spr.displayHeight / 2 : o.spr.y) - F.y);
        if (o.kind === "star" && dx < FLING.grab && dy < FLING.grab) this._collectStar(o);
        else if (o.kind === "ob" && OB_FLING.includes(o.type) && dx < 54 && dy < 90) this._smash(o);
      }
    }
  }

  _spawnFromCourse() {
    while (this._ci < this._course.length && this._course[this._ci].d < this.dist + W + 120) {
      const ev = this._course[this._ci++];
      const sx = ev.d - this.dist + ELIZ_X;
      if (ev.kind === "star") {
        const spr = this.add.image(sx, ev.y, "star").setDepth(7).setScale(0.85);
        this.tweens.add({ targets: spr, angle: 360, duration: 2600, repeat: -1 });
        this.objs.push({ kind: "star", d: ev.d, y: ev.y, spr, taken: false });
      } else {
        const spr = this.add.image(sx, ev.y, `ob-${ev.type}`).setOrigin(0.5, 1).setDepth(8);
        spr.setScale(OB_H[ev.type] / spr.height);
        // C3: lo malo SE VE malo — silueta ensombrecida + ceño
        spr.setTint(0x9a86b0);
        const eyes = this.add.image(sx, ev.y - spr.displayHeight * 0.75, "angry-eyes").setDepth(9);
        eyes.setScale(Math.min(1, spr.displayWidth / 70));
        this.objs.push({ kind: "ob", d: ev.d, y: ev.y, type: ev.type, spr, eyes, taken: false });
      }
    }
  }

  _moveObjs(dt, speed) {
    const kill = [];
    for (const o of this.objs) {
      o.spr.x = o.d - this.dist + ELIZ_X;
      if (o.eyes) { o.eyes.x = o.spr.x; o.eyes.y = o.spr.y - o.spr.displayHeight * 0.75; }
      if (!o.taken) {
        // contacto con Elizabeth
        const ex = ELIZ_X, ey = this.E.y;
        if (o.kind === "star") {
          if (Math.abs(o.spr.x - ex) < 42 && Math.abs(o.spr.y - (ey - 70)) < 66) this._collectStar(o);
        } else {
          const top = o.spr.y - o.spr.displayHeight;
          const overX = Math.abs(o.spr.x - ex) < (o.spr.displayWidth + 44) / 2 - 10;
          const overY = ey > top + 12;
          if (overX && overY) this._trip(o);
        }
      }
      if (o.spr.x < -80) kill.push(o);
    }
    for (const o of kill) {
      o.spr.destroy(); if (o.eyes) o.eyes.destroy();
      this.objs.splice(this.objs.indexOf(o), 1);
    }
  }

  /* ================= CONTACTOS ================= */
  _collectStar(o) {
    if (o.taken) return;
    o.taken = true;
    this.starsRun++;
    Save.addStars(1);
    this.starTxt.setText(String(this.starsRun));
    this.snd.star(1);
    const pop = this.add.text(o.spr.x, o.spr.y - 22, "+1", { fontFamily: FONT, fontSize: "17px", color: "#ffd94e", fontStyle: "bold", stroke: "#3a2260", strokeThickness: 4 }).setOrigin(0.5).setDepth(35);
    this.tweens.add({ targets: pop, y: pop.y - 36, alpha: 0, duration: 560, onComplete: () => pop.destroy() });
    this.tweens.add({ targets: o.spr, scale: 0, alpha: 0, duration: 150, onComplete: () => o.spr.destroy() });
  }

  _smash(o) {
    if (o.taken) return;
    o.taken = true;
    this.snd.dash();
    this.cameras.main.shake(90, 0.006);
    for (let i = 0; i < 10; i++) {
      const c = this.add.rectangle(o.spr.x, o.spr.y - o.spr.displayHeight / 2, 7, 7, [0xffd94e, 0xff9ed2, 0x8ef5c9][i % 3]).setDepth(30);
      this.tweens.add({ targets: c, x: c.x + (Math.random() * 160 - 80), y: c.y + (Math.random() * -140), alpha: 0, angle: 300, duration: 520, onComplete: () => c.destroy() });
    }
    // premio por reventar: 2 estrellas
    this.starsRun += 2; Save.addStars(2);
    this.starTxt.setText(String(this.starsRun));
    const pop = this.add.text(o.spr.x, o.spr.y - o.spr.displayHeight, "+2 ⭐", { fontFamily: FONT, fontSize: "19px", color: "#ffd94e", fontStyle: "bold", stroke: "#3a2260", strokeThickness: 4 }).setOrigin(0.5).setDepth(35);
    this.tweens.add({ targets: pop, y: pop.y - 40, alpha: 0, duration: 620, onComplete: () => pop.destroy() });
    this.tweens.add({ targets: [o.spr, o.eyes], alpha: 0, scale: 0.1, duration: 200 });
    this.F.state = 2;                       // el golpe contundente lo hace volver
  }

  _trip(o) {
    if (this.invuln > 0 || o.taken) return;
    o.taken = true;
    this.hearts--;
    this.heartIcons.forEach((h, i) => h.setAlpha(i < this.hearts ? 1 : 0.22));
    this.snd.hit();
    this.cameras.main.shake(150, 0.01);
    this.slowmo = 0.28;
    this.invuln = 2.5;                      // gracia generosa (lección C4)
    this.rubberT = 3.5;
    o.spr.setTint(0xff8080);
    // Floffy corre a abrazarla (el perdón vestido de ternura)
    const hug = this.add.text(ELIZ_X, this.E.y - 130, "💛", { fontSize: "26px" }).setDepth(35);
    this.tweens.add({ targets: hug, y: hug.y - 40, alpha: 0, duration: 900, onComplete: () => hug.destroy() });
    if (this.hearts <= 0) this._death();
  }

  /* ================= META / MUERTE ================= */
  _spawnGoal() {
    this._goalSpawned = true;
    const g = this.add.container(W + 120, 0).setDepth(12);
    for (const [k, dx] of [["pw-mama", -46], ["pw-papa", 46], ["pw-cristian", 0]]) {
      const s = this.add.image(dx, GROUND_Y, k).setOrigin(0.5, 1);
      s.setScale(120 / s.height);
      g.add(s);
    }
    g.add(this.add.text(0, GROUND_Y - 190, "🏁", { fontSize: "42px" }).setOrigin(0.5));
    this._goal = g;
  }

  _win() {
    if (this.won) return;
    this.won = true;
    this.snd.fanfare();
    if (SDK.gameplayStop) SDK.gameplayStop();
    for (let i = 0; i < 26; i++) {
      const c = this.add.rectangle(Math.random() * W, -20 - Math.random() * 200, 9, 9, [0xffd94e, 0xff9ed2, 0x8ef5c9, 0xb9a6ff][i % 4]).setDepth(45);
      this.tweens.add({ targets: c, y: H + 40, angle: 400, duration: 1600 + Math.random() * 900, onComplete: () => c.destroy() });
    }
    const pct = this.starsTotal > 0 ? this.starsRun / this.starsTotal : 1;
    const stars = 1 + (pct >= 0.8 ? 1 : 0);   // la 3ª ⭐ llega con la campana (F2)
    const sv = Save.get();
    sv.ffBest = sv.ffBest || {};
    sv.ffBest[this.level] = Math.max(sv.ffBest[this.level] || 0, stars);
    sv.ffLevel = Math.max(sv.ffLevel || 1, this.level + 1);
    Save.persist();

    this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.55).setDepth(50);
    const p = this.add.container(W / 2, H / 2 - 40).setDepth(51);
    p.add(this.add.rectangle(0, 0, 320, 300, 0x241a4a, 0.96).setStrokeStyle(3, 0xb9a6ff));
    p.add(this.add.text(0, -110, "LEVEL CLEAR!", { fontFamily: FONT, fontSize: "30px", color: "#8ef5c9", fontStyle: "bold" }).setOrigin(0.5));
    p.add(this.add.text(0, -64, "⭐".repeat(stars) + "☆".repeat(3 - stars), { fontSize: "34px" }).setOrigin(0.5));
    p.add(this.add.text(0, -14, `${this.starsRun} stars with Floffy's help!`, { fontFamily: FONT, fontSize: "16px", color: "#e8dcff" }).setOrigin(0.5));
    const next = this.add.text(0, 48, "▶  NEXT LEVEL", { fontFamily: FONT, fontSize: "22px", color: "#3a2260", fontStyle: "bold", backgroundColor: "#8ef5c9" }).setOrigin(0.5).setPadding(26, 12, 26, 12).setInteractive({ useHandCursor: true });
    next.on("pointerdown", () => this.scene.restart({ level: this.level + 1 }));
    p.add(next);
    const menu = this.add.text(0, 112, "MENU", { fontFamily: FONT, fontSize: "15px", color: "#cbb7ff" }).setOrigin(0.5).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => this.scene.start("Menu"));
    p.add(menu);
  }

  _death() {
    this.dead = true;
    this.snd.gameOver();
    if (SDK.gameplayStop) SDK.gameplayStop();
    // Floffy la recoge con suavidad → retry INSTANTÁNEO (un tap)
    this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.55).setDepth(50);
    const p = this.add.container(W / 2, H / 2 - 30).setDepth(51);
    p.add(this.add.rectangle(0, 0, 320, 260, 0x241a4a, 0.96).setStrokeStyle(3, 0xb9a6ff));
    p.add(this.add.text(0, -88, "Floffy catches you! 🐰", { fontFamily: FONT, fontSize: "21px", color: "#ffd6ec", fontStyle: "bold" }).setOrigin(0.5));
    p.add(this.add.text(0, -44, `You saved ${this.starsRun} stars ⭐`, { fontFamily: FONT, fontSize: "16px", color: "#ffd94e" }).setOrigin(0.5));
    const retry = this.add.text(0, 22, "▶  TRY AGAIN", { fontFamily: FONT, fontSize: "24px", color: "#3a2260", fontStyle: "bold", backgroundColor: "#ff9ed2" }).setOrigin(0.5).setPadding(30, 14, 30, 14).setInteractive({ useHandCursor: true });
    retry.on("pointerdown", () => this.scene.restart({ level: this.level }));
    p.add(retry);
    const menu = this.add.text(0, 88, "MENU", { fontFamily: FONT, fontSize: "15px", color: "#cbb7ff" }).setOrigin(0.5).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => this.scene.start("Menu"));
    p.add(menu);
    const sv = Save.get(); sv.plays = (sv.plays || 0) + 1; Save.persist();
    this.input.keyboard.once("keydown-SPACE", () => this.scene.restart({ level: this.level }));
  }

  /* ================= AYUDAS ================= */
  _tutorial() {
    // uno a uno, en contexto (F1-lite): saltar, luego lanzar
    if (!this._tut1 && this.dist > 500) {
      this._tut1 = true;
      this._toast("👆 TAP to jump!", 0x8ef5c9);
    }
    if (!this._tut2 && this.dist > 1400) {
      this._tut2 = true;
      this.slowmo = Math.max(this.slowmo, 0.5);
      this._toast("👉 FLICK to throw Floffy!\nHe grabs stars & smashes grumps", 0xb9a6ff);
    }
  }

  _banner(txt) {
    const b = this.add.text(W / 2, 220, txt, { fontFamily: FONT, fontSize: "30px", color: "#ffffff", fontStyle: "bold", stroke: "#3a2260", strokeThickness: 7, align: "center" }).setOrigin(0.5).setDepth(45);
    this.tweens.add({ targets: b, alpha: 0, y: 190, delay: 1400, duration: 600, onComplete: () => b.destroy() });
  }

  _toast(txt, color = 0xffffff) {
    if (this._toastObj) this._toastObj.destroy();
    const t = this.add.text(W / 2, 150, txt, { fontFamily: FONT, fontSize: "18px", color: "#fff", fontStyle: "bold", stroke: "#3a2260", strokeThickness: 5, align: "center", backgroundColor: "#241a4acc" }).setOrigin(0.5).setPadding(16, 10, 16, 10).setDepth(46);
    this._toastObj = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 2100, duration: 500, onComplete: () => { if (this._toastObj === t) this._toastObj = null; t.destroy(); } });
  }
}
