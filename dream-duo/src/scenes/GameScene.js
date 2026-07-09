// DREAM DUO core — ONE world, the whole park on screen (founder feedback:
// the old split-worlds layout was confusing). Elizabeth runs the path with a
// natural 4-phase stride; Flofy, her magic plush bunny, floats BY HER SIDE.
// Left half / A / ← = Elizabeth jumps · right half / L / → = Flofy boosts up.
// LEVEL MODE (primary): seeded, learnable courses with a goal line where the
// family waits + 1-3 star rating. ENDLESS mode unlocks after 8 levels.
// FAIRY RUSH: 5 syncs and the whole world TRANSFORMS into Flofy's dream.
// No physics engine — manual dt-capped movement (consistent at any Hz).

import {
  W, H, PLAYER_X, FLOFY_X, GROUND, HOVER, HOVER_MIN, ELIZ, FLOFY,
  BASE_SPEED, MAX_RAMP, RAMP_DIST, PX_PER_M, BIOMES, ENDLESS_BIOME_AT,
  SYNC_WINDOW, MAX_MULT, METER_MAX, RUSH_SECS, SHIELD_SECS, DASH_SECS, REVIVE_STARS,
} from "../const.js";
import { LEVELS, buildCourse } from "../levels.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { SDK } from "../utils/SDK.js";
import { TRAILS } from "../items.js";

const FONT = "'Segoe UI', system-ui, sans-serif";
const RUN_FRAMES = ["eliz-r1", "eliz-r2", "eliz-r3", "eliz-r4"];

export class GameScene extends Phaser.Scene {
  constructor() { super("Game"); }

  init(data) {
    this.mode = data?.mode || "level";
    this.levelNum = data?.level || 1;              // 1-based
  }

  create() {
    window.__dd = this;
    this.snd = new Sound();
    this.snd.resume();

    const sv = Save.get();
    this.skin = sv.skin;
    this.trailTint = (TRAILS.find((t) => t.id === sv.trail) || TRAILS[0]).tint;

    // ---------- state ----------
    this.dist = 0;
    this.speed = 0;
    this.hearts = 3;
    this.score = 0;
    this.mult = 1;
    this.meter = 0;
    this.starsRun = 0;           // currency earned this run
    this.starsGot = 0;           // level rating counter
    this.rushT = 0;
    this.shieldT = 0;
    this.dashT = 0;
    this.invuln = 0;
    this.dead = false;
    this.paused = false;
    this.finishing = false;
    this.usedRevive = false;
    this.tt = 0;
    this._pairSeq = 0;

    this.obstacles = [];
    this.stars = [];
    this.pairs = new Map();
    this.pickups = [];
    this._trailT = 0;

    // ---------- mode setup ----------
    if (this.mode === "level") {
      const built = buildCourse(this.levelNum - 1, PX_PER_M);
      this.course = built.events;
      this.courseLen = built.lenPx;
      this.courseStars = built.starCount;
      this.levelDef = built.def;
      this.biome = built.def.biome;
      this._nextEvent = 0;
    } else {
      this.biome = 0;
      this._obClock = 900;
      this._starClock = 420;
      this._pickupClock = 4200;
      this._pickupIdx = 0;
      this._lastObDist = { ground: -9999, air: -9999 };
    }

    this._buildWorld();
    this._buildCharacters();
    this._buildHUD();
    this._bindInput();

    // level intro + first-level gesture hints
    if (this.mode === "level") {
      this._toast(`LEVEL ${this.levelNum} — ${this.levelDef.intro}`, 0xffd94e);
      if (this.levelNum === 1) this._hint("left");
      if (this.levelNum === 2) this._hint("right");
    }

    this.snd.startMusic();
    SDK.gameplayStart();

    this.events.on("shutdown", () => { this.snd.stopMusic(); this.snd.setRush(false); });
    this._onBlur = () => { if (!this.dead && !this.paused && !this.finishing) this._togglePause(true); };
    this.game.events.on(Phaser.Core.Events.BLUR, this._onBlur);
    this.events.once("shutdown", () => this.game.events.off(Phaser.Core.Events.BLUR, this._onBlur));
  }

  /* ================= WORLD ================= */
  _buildWorld() {
    const parkKey = BIOMES[this.biome].park;
    // park fills the WHOLE screen; second layer for endless biome crossfade
    this.bgA = this.add.tileSprite(0, 0, W, H, parkKey).setOrigin(0).setDepth(0);
    this.bgB = this.add.tileSprite(0, 0, W, H, parkKey).setOrigin(0).setDepth(1).setAlpha(0);
    this.bgFront = this.bgA;
    // dream layer — hidden until FAIRY RUSH transforms the world
    this.dreamBg = this.add.tileSprite(0, 0, W, H, BIOMES[this.biome].dream).setOrigin(0).setDepth(2).setAlpha(0);

    // subtle path line so the ground reads
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x2c1f0e, 0.22); g.fillRect(0, GROUND + 2, W, 3);

    this.rainbow = this.add.graphics().setDepth(4).setVisible(false);
    [0xff9ed2, 0xffd94e, 0x8ef5c9, 0x7fd4ff, 0xb9a6ff].forEach((c, i) => {
      this.rainbow.fillStyle(c, 0.08);
      this.rainbow.fillRect(0, 100 + i * 104, W, 104);
    });

    this.veilFlash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff).setDepth(50).setAlpha(0);
  }

  _swapBiomeEndless(idx) {
    this.biome = idx;
    const back = this.bgFront === this.bgA ? this.bgB : this.bgA;
    back.setTexture(BIOMES[idx].park);
    back.tilePositionX = this.bgFront.tilePositionX;
    this.tweens.add({ targets: back, alpha: 1, duration: 700 });
    const old = this.bgFront;
    this.tweens.add({ targets: old, alpha: 0, duration: 700, delay: 60 });
    back.setDepth(1); old.setDepth(0);
    this.bgFront = back;
    this.dreamBg.setTexture(BIOMES[idx].dream);
    this._toast(BIOMES[idx].name, 0xb9a6ff);
  }

  /* ================= CHARACTERS ================= */
  _buildCharacters() {
    const escale = this.registry.get("scale:eliz-r1") || 0.16;
    this.E = {
      spr: this.add.sprite(PLAYER_X, GROUND, "eliz-r1").setOrigin(0.5, 1).setDepth(10).setScale(escale),
      y: GROUND, vy: 0, grounded: true, coyote: 0, buffer: 0, holding: false,
      animT: 0, frame: 0, scale: escale,
    };
    if (this.skin === "golden") this.E.spr.setTint(0xffd57a);
    if (this.skin === "fairy") {
      const fs = this.registry.get("scale:eliz-fairy") || escale;
      this.E.spr.setTexture("eliz-fairy").setScale(fs);
      this.E.scale = fs;
      this.E.fairySkin = true;
    }

    const fscale = this.registry.get("scale:flofy-fall") || 0.45;
    this.F = {
      spr: this.add.sprite(FLOFY_X, HOVER, "flofy-fall").setOrigin(0.5, 0.5).setDepth(10).setScale(fscale),
      y: HOVER, vy: 0, scale: fscale,
    };

    this.shieldE = this.add.image(PLAYER_X, GROUND - 70, "shield").setDepth(11).setVisible(false).setScale(1.15);
    this.shieldF = this.add.image(FLOFY_X, HOVER, "shield").setDepth(11).setVisible(false).setScale(0.85);
  }

  /* ================= HUD ================= */
  _buildHUD() {
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    this.heartIcons = [];
    for (let i = 0; i < 3; i++) this.heartIcons.push(this.add.image(34 + i * 44, 34, "heart").setDepth(60).setScale(0.8));

    if (this.mode === "level") {
      // course progress bar with a little flag
      this.add.rectangle(W / 2, 30, 420, 16, 0xffffff, 0.16).setStrokeStyle(2, 0xb9a6ff, 0.8).setDepth(60);
      this.progFill = this.add.rectangle(W / 2 - 208, 30, 4, 10, 0xff9ed2).setOrigin(0, 0.5).setDepth(60);
      this.add.text(W / 2 + 218, 30, "🏁", f("20px")).setOrigin(0, 0.5).setDepth(60);
      this.levelTxt = this.add.text(W / 2 - 208, 48, `LEVEL ${this.levelNum}`, f("15px", { color: "#cbb7ff" })).setDepth(60);
      this.starTxt = this.add.text(W - 196, 22, `0/${this.courseStars}`, f("24px", { color: "#ffd94e" })).setDepth(60);
    } else {
      this.scoreTxt = this.add.text(W / 2, 14, "0", f("38px", { stroke: "#3a2260", strokeThickness: 6 })).setOrigin(0.5, 0).setDepth(60);
      this.starTxt = this.add.text(W - 196, 22, "0", f("24px", { color: "#ffd94e" })).setDepth(60);
    }
    this.starIcon = this.add.image(W - 220, 34, "star").setDepth(60).setScale(0.7);
    this.multTxt = this.add.text(W / 2 + 230, 20, "×1", f("24px", { color: "#ffd94e" })).setOrigin(0, 0).setDepth(60);

    this.meterSegs = [];
    for (let i = 0; i < METER_MAX; i++) {
      this.meterSegs.push(
        this.add.rectangle(W / 2 - 84 + i * 36, 66, 30, 10, 0xffffff, 0.18).setStrokeStyle(2, 0xb9a6ff, 0.7).setDepth(60)
      );
    }
    this.add.text(W / 2, 80, "DREAM METER", f("11px", { color: "#cbb7ff" })).setOrigin(0.5, 0).setDepth(60);

    this.pauseBtn = this.add.text(W - 66, 14, "⏸", f("34px", { backgroundColor: "#3a2260cc" }))
      .setPadding(14, 8, 14, 8).setDepth(60).setInteractive({ useHandCursor: true });
    this.pauseBtn.on("pointerdown", () => this._togglePause());
    this.muteBtn = this.add.text(W - 138, 14, this.snd.muted ? "🔇" : "🔊", f("28px", { backgroundColor: "#3a2260cc" }))
      .setPadding(12, 10, 12, 10).setDepth(60).setInteractive({ useHandCursor: true });
    this.muteBtn.on("pointerdown", () => {
      this.snd.setMuted(!this.snd.muted);
      if (!this.snd.muted) this.snd.startMusic();
      this.muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
    });

    this.toastTxt = this.add.text(W / 2, 126, "", f("26px", { stroke: "#3a2260", strokeThickness: 5 })).setOrigin(0.5).setDepth(60).setAlpha(0);
  }

  _toast(msg, color = 0xffffff) {
    this.toastTxt.setText(msg).setColor("#" + color.toString(16).padStart(6, "0")).setAlpha(1).setScale(0.7);
    this.tweens.add({ targets: this.toastTxt, scale: 1, duration: 180, ease: "Back.out" });
    this.tweens.add({ targets: this.toastTxt, alpha: 0, delay: 1600, duration: 400 });
  }

  _hint(side) {
    const f = { fontFamily: FONT, fontSize: "22px", color: "#fff", fontStyle: "bold", align: "center", stroke: "#3a2260", strokeThickness: 5 };
    const x = side === "left" ? W * 0.25 : W * 0.75;
    const txt = side === "left"
      ? "TAP HERE (or A)\nELIZABETH JUMPS"
      : "TAP HERE (or L)\nFLOFY BOOSTS UP";
    const t = this.add.text(x, H / 2 + 40, txt, f).setOrigin(0.5).setDepth(70);
    const hand = this.add.text(x, H / 2 + 110, "👆", { fontSize: "42px" }).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets: hand, y: H / 2 + 96, duration: 420, yoyo: true, repeat: -1 });
    this[`_hint_${side}`] = [t, hand];
  }
  _clearHint(side) {
    const h = this[`_hint_${side}`];
    if (h) { h.forEach((o) => o.destroy()); this[`_hint_${side}`] = null; }
  }

  /* ================= INPUT ================= */
  _bindInput() {
    this.input.on("pointerdown", (p) => {
      if (this.dead || this.paused || this.finishing) return;
      if (p.y < 110 && p.x > W - 220) return; // HUD buttons
      this.snd.resume();
      if (p.x < W / 2) { this._pressE(); p._ddSide = "E"; }
      else this._pressF();
    });
    this.input.on("pointerup", (p) => { if (p._ddSide === "E") this._releaseE(); });

    const kb = this.input.keyboard;
    kb.on("keydown-A", (e) => { if (!e.repeat) this._pressE(); });
    kb.on("keydown-LEFT", (e) => { if (!e.repeat) this._pressE(); });
    kb.on("keyup-A", () => this._releaseE());
    kb.on("keyup-LEFT", () => this._releaseE());
    kb.on("keydown-L", (e) => { if (!e.repeat) this._pressF(); });
    kb.on("keydown-RIGHT", (e) => { if (!e.repeat) this._pressF(); });
    kb.on("keydown-P", () => this._togglePause());
    kb.on("keydown-ESC", () => this._togglePause());
  }

  _pressE() {
    const E = this.E;
    E.holding = true;
    E.buffer = ELIZ.buffer;
    if (this.rushT > 0 || this.finishing) return;
    if (E.grounded || E.coyote > 0) {
      E.vy = ELIZ.jump;
      E.grounded = false; E.coyote = 0; E.buffer = 0;
      E.spr.setTexture(this.E.fairySkin ? "eliz-fairy" : "eliz-jump");
      this.snd.jumpE();
      this._dust(PLAYER_X, GROUND);
      this._clearHint("left");
    }
  }
  _releaseE() {
    const E = this.E;
    E.holding = false;
    if (!E.grounded && E.vy < ELIZ.cut) E.vy = ELIZ.cut;
  }
  _pressF() {
    if (this.rushT > 0 || this.finishing) return;
    const F = this.F;
    F.vy = Math.min(F.vy, 0) + FLOFY.boost * 0.62;
    this.snd.hopF();
    for (let i = 0; i < 5; i++) this._spark(FLOFY_X + Phaser.Math.Between(-14, 14), F.y + 30, 0xfff2b0);
    this._clearHint("right");
  }

  /* ================= PAUSE ================= */
  _togglePause(force) {
    if (this.dead || this.finishing) return;
    this.paused = force === true ? true : !this.paused;
    if (this.paused) {
      this.snd.stopMusic();
      this._pauseVeil = this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.72).setDepth(80).setInteractive();
      const f = (s, e = {}) => ({ fontFamily: FONT, fontSize: s, color: "#fff", fontStyle: "bold", ...e });
      this._pauseTxt = this.add.text(W / 2, H / 2 - 70, "PAUSED", f("52px")).setOrigin(0.5).setDepth(81);
      this._resumeBtn = this.add.text(W / 2, H / 2 + 20, "▶ RESUME", f("30px", { backgroundColor: "#ff9ed2", color: "#3a2260" }))
        .setOrigin(0.5).setPadding(30, 12, 30, 12).setDepth(81).setInteractive({ useHandCursor: true });
      this._resumeBtn.on("pointerdown", () => this._togglePause());
      this._menuBtn = this.add.text(W / 2, H / 2 + 96, "MENU", f("20px", { backgroundColor: "#3a2260" }))
        .setOrigin(0.5).setPadding(22, 9, 22, 9).setDepth(81).setInteractive({ useHandCursor: true });
      this._menuBtn.on("pointerdown", () => { this.dead = true; SDK.gameplayStop(); this.scene.start("Menu"); });
    } else {
      if (!this.snd.muted) this.snd.startMusic();
      [this._pauseVeil, this._pauseTxt, this._resumeBtn, this._menuBtn].forEach((o) => o && o.destroy());
    }
  }

  /* ================= SPAWNING ================= */
  _spawnFromCourse() {
    while (this._nextEvent < this.course.length && this.course[this._nextEvent].x < this.dist + W + 200) {
      const e = this.course[this._nextEvent++];
      const sx = e.x - this.dist + PLAYER_X; // world→screen
      if (e.kind === "ob") this._addObstacle(e.lane, e.type, sx);
      else if (e.kind === "pair") this._addPair(sx);
      else if (e.kind === "line") this._addLine(e.lane, sx);
      else if (e.kind === "pickup") this._addPickup(e.type, sx);
    }
  }

  _spawnEndless() {
    const m = this.dist / PX_PER_M;
    this._obClock -= this.speed * 0.016;
    // (endless uses px clocks driven in update; here for clarity)
  }

  _addObstacle(lane, type, x) {
    let spr, w, h, extraV = 0, bob = null, air = lane === "air", cy = null;
    const mk = (key, dispH, originY = 1) => {
      const s = this.add.image(x, GROUND, key).setOrigin(0.5, originY).setDepth(8);
      s.setScale(dispH / s.height);
      return s;
    };
    switch (type) {
      case "hedge": spr = mk("ob-hedge", 92); w = spr.displayWidth * 0.72; h = 88; break;
      case "bench": spr = mk("ob-bench", 96); w = spr.displayWidth * 0.8; h = 90; break;
      case "birdbath": spr = mk("ob-birdbath", 134); w = spr.displayWidth * 0.55; h = 130; break;
      case "blocks": spr = mk("ob-blocks", 162); w = spr.displayWidth * 0.62; h = 158; break;
      case "top": {
        spr = mk("ob-top", 84); w = spr.displayWidth * 0.6; h = 80; extraV = 150;
        this.tweens.add({ targets: spr, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: -1 });
        break;
      }
      case "pigeon": {
        cy = HOVER + 6; // right on Flofy's hover line → BOOST to dodge
        spr = this.add.image(x, cy, "ob-pigeon").setDepth(8);
        spr.setScale(74 / spr.height);
        w = spr.displayWidth * 0.6; h = 54; extraV = 170;
        this.tweens.add({ targets: spr, y: cy - 12, duration: 380, yoyo: true, repeat: -1, ease: "Sine.inOut" });
        break;
      }
      case "cloud": {
        cy = HOVER - 168; // up high → DON'T boost into it
        spr = this.add.image(x, cy, "ob-cloud").setDepth(8);
        spr.setScale(86 / spr.height);
        w = spr.displayWidth * 0.72; h = 76;
        break;
      }
      case "bubble": {
        cy = HOVER - 60;
        spr = this.add.image(x, cy, "ob-bubble").setDepth(8).setScale(0.95);
        w = 76; h = 76; bob = { base: cy, amp: 84, ph: Math.random() * 6, sp: 1.6 };
        break;
      }
    }
    this.obstacles.push({ spr, lane, type, w, h, extraV, bob, air, cy });
  }

  _addPair(x) {
    const id = ++this._pairSeq;
    this._addStar("ground", x, GROUND - 152, id);
    this._addStar("air", x, HOVER - 96, id);
    this.pairs.set(id, { got: 0, timer: 0, active: false });
  }

  _addLine(lane, x) {
    for (let i = 0; i < 3; i++) {
      const y = lane === "ground" ? GROUND - (i === 1 ? 190 : 140) : HOVER - (i === 1 ? 60 : 10);
      this._addStar(lane, x + i * 88, y, 0);
    }
  }

  _addStar(lane, x, y, pairId) {
    const spr = this.add.image(x, y, "star").setDepth(7).setScale(0.9);
    this.tweens.add({ targets: spr, angle: 360, duration: 2600, repeat: -1 });
    if (pairId) {
      spr.setScale(1.05);
      const glow = this.add.image(x, y, "glow").setDepth(6).setScale(1.1).setTint(0xffd94e);
      this.tweens.add({ targets: glow, alpha: { from: 0.9, to: 0.4 }, duration: 500, yoyo: true, repeat: -1 });
      spr._glow = glow;
    }
    this.stars.push({ spr, lane, pairId });
  }

  _addPickup(kind, x) {
    const y = GROUND - 130;
    const glow = this.add.image(x, y, "glow").setDepth(6).setScale(1.6).setTint(0xfff2b0);
    const spr = this.add.image(x, y, `pw-${kind}`).setDepth(7);
    spr.setScale((this.registry.get(`scale:pw-${kind}`) || 0.12) * 0.72);
    this.tweens.add({ targets: [spr, glow], y: y - 14, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.pickups.push({ spr, glow, kind });
  }

  /* ---- endless spawners (px clocks) ---- */
  _endlessSpawn(dt) {
    const m = this.dist / PX_PER_M;
    this._obClock -= this.speed * dt;
    if (this._obClock <= 0) {
      const ground = ["hedge", "bench"];
      if (m > 150) ground.push("birdbath");
      if (m > 300) ground.push("top");
      if (m > 500) ground.push("blocks");
      const airPool = [];
      if (m > 80) airPool.push("bubble");
      if (m > 220) airPool.push("pigeon");
      if (m > 420) airPool.push("cloud");
      const roll = Math.random();
      const gapOK = (lane) => this.dist - this._lastObDist[lane] > this.speed * 0.85 + 300;
      if (roll < 0.62 && gapOK("ground")) {
        this._addObstacle("ground", ground[(Math.random() * ground.length) | 0], W + 100);
        this._lastObDist.ground = this.dist;
      } else if (airPool.length && gapOK("air")) {
        this._addObstacle("air", airPool[(Math.random() * airPool.length) | 0], W + 100);
        this._lastObDist.air = this.dist;
      }
      this._obClock = this.speed * 0.45 + Math.max(300, 620 - m * 0.35) + Math.random() * 260;
    }
    this._starClock -= this.speed * dt;
    if (this._starClock <= 0) {
      const roll = Math.random();
      if (roll < 0.5 && m > 25) this._addPair(W + 80);
      else this._addLine(roll < 0.75 ? "ground" : "air", W + 80);
      this._starClock = 520 + Math.random() * 420;
    }
    this._pickupClock -= this.speed * dt;
    if (this._pickupClock <= 0) {
      const kinds = ["mama", "papa", "cristian"];
      this._addPickup(kinds[this._pickupIdx++ % 3], W + 90);
      this._pickupClock = 4200 + Math.random() * 1600;
    }
  }

  /* ================= UPDATE ================= */
  update(_, dms) {
    if (this.dead || this.paused) return;
    const dt = Math.min(dms / 1000, 0.05);
    this.tt += dt;

    // speed
    if (this.mode === "level") {
      this.speed = BASE_SPEED * this.levelDef.speed * (this.dashT > 0 ? 1.5 : 1) * (this.rushT > 0 ? 1.12 : 1);
    } else {
      const ramp = Math.min(MAX_RAMP, 1 + this.dist / RAMP_DIST);
      this.speed = BASE_SPEED * ramp * (this.dashT > 0 ? 1.55 : 1) * (this.rushT > 0 ? 1.15 : 1);
      const m = this.dist / PX_PER_M;
      const bi = ENDLESS_BIOME_AT.length - 1 - [...ENDLESS_BIOME_AT].reverse().findIndex((at) => m >= at);
      if (bi !== this.biome) this._swapBiomeEndless(bi);
    }
    if (this.finishing) this.speed = Math.max(0, this.speed - 900 * dt * 3);
    this.dist += this.speed * dt;

    // parallax
    this.bgA.tilePositionX += this.speed * dt * 0.32;
    this.bgB.tilePositionX += this.speed * dt * 0.32;
    this.dreamBg.tilePositionX += this.speed * dt * 0.4;

    this._updateE(dt);
    this._updateF(dt);
    this._updateRush(dt);
    if (this.shieldT > 0) this._updateShield(dt);
    if (this.dashT > 0) this.dashT -= dt;
    if (this.invuln > 0) {
      this.invuln -= dt;
      const blink = Math.sin(this.tt * 24) > 0 ? 1 : 0.35;
      this.E.spr.setAlpha(blink); this.F.spr.setAlpha(blink);
      if (this.invuln <= 0) { this.E.spr.setAlpha(1); this.F.spr.setAlpha(1); }
    }

    // spawning + goal
    if (this.mode === "level") {
      this._spawnFromCourse();
      const prog = Math.min(1, this.dist / this.courseLen);
      this.progFill.width = 4 + prog * 412;
      if (!this.finishing && this.dist >= this.courseLen) this._reachGoal();
    } else {
      this._endlessSpawn(dt);
      this.score += this.speed * dt * 0.012 * this.mult;
      this.scoreTxt.setText(String(Math.floor(this.score)));
    }

    this._moveWorld(dt);
    if (!this.finishing) this._collide();
    this._updatePairs(dt);
    this._trail(dt);
  }

  _updateE(dt) {
    const E = this.E;
    if (this.rushT > 0) return;
    if (E.buffer > 0) {
      E.buffer -= dt;
      if (E.grounded) { E.buffer = 0; this._pressE(); }
    }
    if (!E.grounded) {
      E.vy += ELIZ.grav * dt;
      E.y += E.vy * dt;
      if (E.y >= GROUND) {
        E.y = GROUND; E.vy = 0; E.grounded = true; E.coyote = ELIZ.coyote;
        this._dust(PLAYER_X, GROUND);
        E.spr.setScale(E.scale * 1.06, E.scale * 0.94); // landing squash
        this.time.delayedCall(90, () => { if (!this.dead) E.spr.setScale(E.scale); });
      }
    } else {
      E.coyote = ELIZ.coyote;
      // natural 4-phase stride, cadence tied to ground speed
      E.animT += dt * (this.speed / 34);
      const fr = Math.floor(E.animT) % 4;
      if (fr !== E.frame && !E.fairySkin) {
        E.frame = fr;
        E.spr.setTexture(RUN_FRAMES[fr]);
      }
      // gentle run bob
      E.spr.y = E.y - Math.abs(Math.sin(E.animT * Math.PI)) * 5;
    }
    if (!E.grounded) { E.coyote -= dt; E.spr.y = E.y; }
    E.spr.rotation = E.grounded ? 0.02 : Phaser.Math.Clamp(E.vy / 4600, -0.14, 0.2);
  }

  _updateF(dt) {
    const F = this.F;
    if (this.rushT > 0) return;
    // spring-hover: his magic pulls him back to the hover line
    F.vy += (HOVER - F.y) * FLOFY.spring * dt;
    F.vy -= F.vy * FLOFY.damp * dt;
    if (F.vy > FLOFY.maxFall) F.vy = FLOFY.maxFall;
    F.y += F.vy * dt;
    if (F.y < HOVER_MIN) { F.y = HOVER_MIN; F.vy = Math.max(F.vy, 0); }
    if (F.y > GROUND - 60) { F.y = GROUND - 60; F.vy = Math.min(F.vy, 0); }
    F.spr.setTexture(F.vy < -40 ? "flofy-hop" : "flofy-fall");
    F.spr.y = F.y + Math.sin(this.tt * 2.6) * 6; // idle float
    F.spr.rotation = Phaser.Math.Clamp(F.vy / 2600, -0.18, 0.18);
  }

  /* ================= FAIRY RUSH — the world becomes the dream ================= */
  _startRush() {
    this.rushT = RUSH_SECS;
    this.meter = 0;
    this.snd.fanfare();
    this.snd.setRush(true);
    this._toast("✨ FAIRY RUSH — THE DREAM TAKES OVER! ✨", 0xffd94e);
    this.veilFlash.setAlpha(0.9);
    this.tweens.add({ targets: this.veilFlash, alpha: 0, duration: 550 });
    this.dreamBg.setTexture(BIOMES[this.biome].dream);
    this.tweens.add({ targets: this.dreamBg, alpha: 1, duration: 900 });
    this.rainbow.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.rainbow, alpha: 1, duration: 900 });
    // Elizabeth sprouts fairy wings and flies up BESIDE Flofy
    this.E.spr.setTexture("eliz-fairy");
    const fs = this.registry.get("scale:eliz-fairy") || this.E.scale;
    this.E.spr.setScale(fs).setRotation(0);
    this.tweens.add({ targets: this.E, y: HOVER + 60, duration: 900, ease: "Sine.inOut", onUpdate: () => { this.E.spr.y = this.E.y; } });
    this.cameras.main.shake(240, 0.004);
    SDK.happyTime();
  }

  _updateRush(dt) {
    if (this.rushT <= 0) return;
    this.rushT -= dt;
    const bob = Math.sin(this.tt * 3.2) * 30;
    this.E.y = HOVER + 70 + bob; this.E.spr.y = this.E.y; this.E.spr.x = PLAYER_X;
    this.F.y = HOVER - 40 + bob; this.F.spr.y = this.F.y;
    if (Math.random() < 0.5) this._spark(PLAYER_X - 20 + Phaser.Math.Between(-14, 14), this.E.y - 40 + Phaser.Math.Between(-20, 20), 0xffd94e);
    // star magnet
    for (const s of this.stars) {
      const dx = s.spr.x - (PLAYER_X + 70), dy = s.spr.y - HOVER;
      const d = Math.hypot(dx, dy);
      if (d < 340) {
        s.spr.x -= dx * 0.14; s.spr.y -= dy * 0.14;
        if (s.spr._glow) { s.spr._glow.x = s.spr.x; s.spr._glow.y = s.spr.y; }
      }
    }
    for (const o of this.obstacles) {
      if (o.spr.x < PLAYER_X + 340 && !o._popped) { o._popped = true; this._popObstacle(o, true); }
    }
    if (this.rushT <= 0) this._endRush();
  }

  _endRush() {
    this.snd.setRush(false);
    this.tweens.add({ targets: [this.dreamBg, this.rainbow], alpha: 0, duration: 900, onComplete: () => this.rainbow.setVisible(false) });
    if (!this.E.fairySkin) {
      this.time.delayedCall(860, () => {
        if (!this.dead) {
          this.E.spr.setTexture("eliz-r1").setScale(this.E.scale);
          if (this.skin === "golden") this.E.spr.setTint(0xffd57a);
        }
      });
    }
    this.tweens.add({ targets: this.E, y: GROUND, duration: 850, ease: "Sine.in", onUpdate: () => { this.E.spr.y = this.E.y; }, onComplete: () => { this.E.grounded = true; this.E.vy = 0; } });
    this.invuln = Math.max(this.invuln, 1.2);
  }

  /* ================= WORLD MOVEMENT + COLLISIONS ================= */
  _moveWorld(dt) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (o._gone) { this.obstacles.splice(i, 1); continue; }
      o.spr.x -= (this.speed + o.extraV) * dt;
      if (o.bob) o.spr.y = o.bob.base + Math.sin(this.tt * o.bob.sp + o.bob.ph) * o.bob.amp;
      if (o.spr.x < -240 && !o._popped) { o.spr.destroy(); this.obstacles.splice(i, 1); }
    }
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      s.spr.x -= this.speed * dt;
      if (s.spr._glow) { s.spr._glow.x = s.spr.x; s.spr._glow.y = s.spr.y; }
      if (s.spr.x < -80) this._removeStar(i);
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.spr.x -= this.speed * dt; p.glow.x = p.spr.x;
      if (p.spr.x < -120) { p.spr.destroy(); p.glow.destroy(); this.pickups.splice(i, 1); }
    }
    if (this.finish) {
      this.finish.list.forEach(() => {});
      this.finish.x -= this.speed * dt;
    }
  }

  _rectE() {
    const h = this.E.spr.displayHeight * 0.8;
    return new Phaser.Geom.Rectangle(PLAYER_X - 26, this.E.y - h, 52, h);
  }
  _rectF() {
    return new Phaser.Geom.Rectangle(FLOFY_X - 28, this.F.y - 34, 56, 68);
  }
  _obRect(o) {
    if (o.air) return new Phaser.Geom.Rectangle(o.spr.x - o.w / 2, o.spr.y - o.h / 2, o.w, o.h);
    return new Phaser.Geom.Rectangle(o.spr.x - o.w / 2, GROUND - o.h, o.w, o.h);
  }

  _collide() {
    if (this.rushT > 0) return;
    const rE = this._rectE(), rF = this._rectF();
    if (this.invuln <= 0) {
      for (const o of this.obstacles) {
        if (o._popped) continue;
        const px = o.air ? FLOFY_X : PLAYER_X;
        if (o.spr.x > px + 220 || o.spr.x < px - 220) continue;
        const r = o.air ? rF : rE;
        if (Phaser.Geom.Rectangle.Overlaps(r, this._obRect(o))) { this._hit(o); break; }
      }
    }
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      const px = s.lane === "ground" ? PLAYER_X : FLOFY_X;
      if (Math.abs(s.spr.x - px) > 74) continue;
      const r = s.lane === "ground" ? rE : rF;
      if (Phaser.Geom.Rectangle.ContainsPoint(Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(r), 28, 28), { x: s.spr.x, y: s.spr.y })) {
        this._collectStar(i);
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.abs(p.spr.x - PLAYER_X) > 84) continue;
      if (Phaser.Geom.Rectangle.Overlaps(rE, new Phaser.Geom.Rectangle(p.spr.x - 42, p.spr.y - 64, 84, 128))) {
        this._applyPickup(p.kind);
        p.spr.destroy(); p.glow.destroy(); this.pickups.splice(i, 1);
      }
    }
  }

  _collectStar(i) {
    const s = this.stars[i];
    const golden = this.skin === "golden";
    this.starsRun += 1 + (golden && Math.random() < 0.1 ? 1 : 0);
    this.starsGot++;
    this.score += 15 * this.mult;
    this.snd.star(this.mult);
    this._burst(s.spr.x, s.spr.y, 0xffd94e, 7);
    if (s.pairId) {
      const pair = this.pairs.get(s.pairId);
      if (pair) {
        pair.got++;
        if (pair.got === 1) { pair.active = true; pair.timer = SYNC_WINDOW; }
        else if (pair.got >= 2 && pair.active) this._sync(s.spr.x);
      }
    }
    this._refreshStarTxt();
    this._removeStar(i);
  }

  _refreshStarTxt() {
    this.starTxt.setText(this.mode === "level" ? `${this.starsGot}/${this.courseStars}` : String(this.starsRun));
  }

  _removeStar(i) {
    const s = this.stars[i];
    if (s.spr._glow) s.spr._glow.destroy();
    s.spr.destroy();
    this.stars.splice(i, 1);
  }

  _sync(x) {
    this.mult = Math.min(this.mult + 1, MAX_MULT);
    const fill = this.skin === "fairy" ? 1.2 : 1;
    this.meter = Math.min(METER_MAX, this.meter + fill);
    this.snd.sync(this.mult);
    this._toast(`SYNC ×${this.mult}!`, 0x8ef5c9);
    // beam connecting Elizabeth and Flofy — their hearts in sync
    const beam = this.add.rectangle(x, (GROUND - 150 + HOVER - 90) / 2, 6, GROUND - HOVER - 40, 0xfff2b0, 0.9).setDepth(9);
    this.tweens.add({ targets: beam, alpha: 0, scaleX: 3, duration: 360, onComplete: () => beam.destroy() });
    this._burst(x, GROUND - 152, 0x8ef5c9, 10);
    this._burst(x, HOVER - 96, 0x8ef5c9, 10);
    this.cameras.main.shake(120, 0.0022);
    this._refreshMeter();
    if (this.meter >= METER_MAX && this.rushT <= 0) this._startRush();
  }

  _updatePairs(dt) {
    for (const [id, pair] of this.pairs) {
      if (pair.active && pair.got === 1) {
        pair.timer -= dt;
        if (pair.timer <= 0) { pair.active = false; this.pairs.delete(id); }
      } else if (pair.got >= 2) this.pairs.delete(id);
    }
    this._refreshMeter();
  }

  _refreshMeter() {
    this.meterSegs.forEach((seg, i) => {
      seg.fillColor = i < this.meter ? 0xb9a6ff : 0xffffff;
      seg.fillAlpha = i < this.meter ? 0.95 : 0.18;
    });
    this.multTxt.setText("×" + this.mult).setColor(["#ffffff", "#ffd94e", "#8ef5c9", "#7fd4ff", "#ff9ed2"][this.mult - 1] || "#fff");
  }

  /* ================= FAMILY POWER-UPS ================= */
  _applyPickup(kind) {
    if (kind === "mama") {
      if (this.hearts < 3) { this.hearts++; this._refreshHearts(); }
      else this.score += 150;
      this.snd.heart();
      this._toast("MOM'S HUG! ♥", 0xff9ed2);
      this._burst(PLAYER_X, GROUND - 120, 0xff9ed2, 14);
    } else if (kind === "papa") {
      this.shieldT = SHIELD_SECS;
      this.snd.shield();
      this._toast("DAD'S SHIELD!", 0x7fd4ff);
      this.shieldE.setVisible(true); this.shieldF.setVisible(true);
    } else {
      this.dashT = DASH_SECS;
      this.snd.dash();
      this._toast("CRISTIAN'S DASH!", 0xffd94e);
      const c = this.add.image(-80, GROUND, "pw-cristian").setOrigin(0.5, 1).setDepth(12);
      c.setScale(this.registry.get("scale:pw-cristian") || 0.12);
      this.tweens.add({ targets: c, x: W + 140, duration: 1100, ease: "Quad.in", onComplete: () => c.destroy() });
      this.time.delayedCall(200, () => {
        for (const o of this.obstacles) if (!o._popped && o.spr.x < W) { o._popped = true; this._popObstacle(o, true); }
      });
    }
  }

  _updateShield(dt) {
    this.shieldT -= dt;
    this.shieldE.setPosition(PLAYER_X, this.E.y - this.E.spr.displayHeight * 0.45);
    this.shieldF.setPosition(FLOFY_X, this.F.y);
    const blink = this.shieldT < 2 ? (Math.sin(this.tt * 16) > 0 ? 0.9 : 0.3) : 0.9;
    this.shieldE.setAlpha(blink); this.shieldF.setAlpha(blink);
    if (this.shieldT <= 0) { this.shieldE.setVisible(false); this.shieldF.setVisible(false); }
  }

  /* ================= DAMAGE / DEATH ================= */
  _hit(o) {
    if (this.shieldT > 0) {
      o._popped = true; this._popObstacle(o, true);
      this.shieldT = Math.min(this.shieldT, 1.2);
      this.snd.shield();
      return;
    }
    this.hearts--;
    this._refreshHearts();
    this.mult = 1;
    this.meter = Math.max(0, this.meter - 1);
    this._refreshMeter();
    this.invuln = 1.4;
    o._popped = true; this._popObstacle(o, false);
    this.snd.hit();
    this.cameras.main.shake(200, 0.006);
    this.veilFlash.setFillStyle(0xff5e8a).setAlpha(0.35);
    this.tweens.add({ targets: this.veilFlash, alpha: 0, duration: 350, onComplete: () => this.veilFlash.setFillStyle(0xffffff) });
    if (this.hearts <= 0) this._die();
  }

  _refreshHearts() {
    this.heartIcons.forEach((h, i) => h.setAlpha(i < this.hearts ? 1 : 0.22));
  }

  _popObstacle(o, joyful) {
    this._burst(o.spr.x, o.air ? o.spr.y : GROUND - o.h / 2, joyful ? 0xffd94e : 0xffffff, joyful ? 12 : 8);
    if (joyful) this.score += 5;
    this.tweens.add({ targets: o.spr, alpha: 0, scale: o.spr.scale * 1.3, duration: 220, onComplete: () => { o.spr.destroy(); o._gone = true; } });
  }

  _die() {
    this.dead = true;
    SDK.gameplayStop();
    this.snd.stopMusic();
    this.snd.gameOver();
    this.E.spr.setTexture(this.E.fairySkin ? "eliz-fairy" : "eliz-jump");
    this.tweens.add({ targets: [this.E.spr, this.F.spr], angle: 10, duration: 400 });
    if (!this.usedRevive && (SDK.available || Save.get().stars + this.starsRun >= REVIVE_STARS)) {
      this._reviveOffer();
    } else {
      this.time.delayedCall(700, () => this._gameOver());
    }
  }

  _reviveOffer() {
    const f = (s, e = {}) => ({ fontFamily: FONT, fontSize: s, color: "#fff", fontStyle: "bold", ...e });
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.66).setDepth(90).setInteractive();
    const box = this.add.container(0, 0).setDepth(91);
    box.add(this.add.text(W / 2, H / 2 - 110, "SAVE THE DUO?", f("42px")).setOrigin(0.5));
    let countdown = 4;
    const cd = this.add.text(W / 2, H / 2 - 58, "4", f("24px", { color: "#cbb7ff" })).setOrigin(0.5);
    box.add(cd);
    const done = (revived) => {
      this.time.removeAllEvents();
      veil.destroy(); box.destroy(true);
      if (revived) this._doRevive();
      else this._gameOver();
    };
    if (SDK.available) {
      const b = this.add.text(W / 2, H / 2 + 6, "▶ REVIVE  (watch ad)", f("26px", { backgroundColor: "#8ef5c9", color: "#14351f" }))
        .setOrigin(0.5).setPadding(26, 12, 26, 12).setInteractive({ useHandCursor: true });
      b.on("pointerdown", () => SDK.rewardedAd(() => done(true), () => done(false)));
      box.add(b);
    }
    const total = Save.get().stars + this.starsRun;
    if (total >= REVIVE_STARS) {
      const b2 = this.add.text(W / 2, H / 2 + 78, `★ REVIVE  (${REVIVE_STARS} stars)`, f("22px", { backgroundColor: "#ffd94e", color: "#3a2600" }))
        .setOrigin(0.5).setPadding(22, 10, 22, 10).setInteractive({ useHandCursor: true });
      b2.on("pointerdown", () => {
        if (this.starsRun >= REVIVE_STARS) this.starsRun -= REVIVE_STARS;
        else { const rest = REVIVE_STARS - this.starsRun; this.starsRun = 0; Save.spendStars(rest); }
        this._refreshStarTxt();
        done(true);
      });
      box.add(b2);
    }
    const skip = this.add.text(W / 2, H / 2 + 148, "NO THANKS", f("18px", { color: "#cbb7ff" }))
      .setOrigin(0.5).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    skip.on("pointerdown", () => done(false));
    box.add(skip);
    this.time.addEvent({
      delay: 1000, repeat: 3,
      callback: () => { countdown--; cd.setText(String(countdown)); if (countdown <= 0) done(false); },
    });
  }

  _doRevive() {
    this.usedRevive = true;
    this.dead = false;
    this.hearts = 1;
    this._refreshHearts();
    this.invuln = 2.5;
    this.mult = 1; this._refreshMeter();
    this.E.spr.setAngle(0); this.F.spr.setAngle(0);
    if (!this.E.fairySkin) {
      this.E.spr.setTexture("eliz-r1").setScale(this.E.scale);
      if (this.skin === "golden") this.E.spr.setTint(0xffd57a);
    }
    for (const o of this.obstacles) if (!o._popped) { o._popped = true; this._popObstacle(o, true); }
    this.snd.revive();
    if (!this.snd.muted) this.snd.startMusic();
    SDK.gameplayStart();
    this._toast("BACK ON TRACK!", 0x8ef5c9);
  }

  _gameOver() {
    Save.addStars(this.starsRun);
    this.scene.start("GameOver", {
      mode: this.mode,
      level: this.levelNum,
      score: Math.floor(this.score),
      meters: Math.floor(this.dist / PX_PER_M),
      stars: this.starsRun,
    });
  }

  /* ================= LEVEL GOAL ================= */
  _reachGoal() {
    this.finishing = true;
    this.invuln = 99;
    SDK.gameplayStop();
    // the family waits at the finish line
    this.finish = this.add.container(W + 200, 0).setDepth(9);
    const flag = this.add.text(0, GROUND + 4, "🏁", { fontSize: "64px" }).setOrigin(0.5, 1);
    this.finish.add(flag);
    ["pw-mama", "pw-papa", "pw-cristian"].forEach((k, i) => {
      const s = this.add.image(90 + i * 95, GROUND, k).setOrigin(0.5, 1);
      s.setScale((this.registry.get(`scale:${k}`) || 0.12) * 0.95);
      this.finish.add(s);
      this.tweens.add({ targets: s, y: GROUND - 12, duration: 420, yoyo: true, repeat: -1, delay: i * 130, ease: "Sine.inOut" });
    });
    this.snd.fanfare();
    this.time.delayedCall(1400, () => this._levelComplete());
  }

  _levelComplete() {
    this.dead = true; // freeze world updates
    this.snd.stopMusic();
    const pct = this.courseStars ? this.starsGot / this.courseStars : 1;
    const rating = pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : 1;
    Save.completeLevel(this.levelNum, rating);
    Save.addStars(this.starsRun);
    SDK.happyTime();

    const f = (s, e = {}) => ({ fontFamily: FONT, fontSize: s, color: "#fff", fontStyle: "bold", ...e });
    this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.6).setDepth(90).setInteractive();
    const box = this.add.container(0, 30).setDepth(91).setAlpha(0);
    box.add(this.add.rectangle(W / 2, H / 2, 600, 470, 0x241a4a, 0.97).setStrokeStyle(3, 0xffd94e));
    const art = this.add.image(W / 2 - 200, H / 2 - 90, "eliz-run-a");
    art.setScale(140 / art.height);
    box.add(art);
    box.add(this.add.text(W / 2 + 40, H / 2 - 160, "LEVEL COMPLETE!", f("36px", { color: "#ffd94e" })).setOrigin(0.5));
    // star rating
    for (let i = 0; i < 3; i++) {
      const st = this.add.image(W / 2 - 30 + i * 70, H / 2 - 84, "star").setScale(i < rating ? 1.3 : 1.1).setDepth(92);
      if (i >= rating) st.setTint(0x555577).setAlpha(0.5);
      box.add(st);
      if (i < rating) this.tweens.add({ targets: st, scale: { from: 0.2, to: 1.3 }, delay: 300 + i * 220, duration: 320, ease: "Back.out" });
    }
    box.add(this.add.text(W / 2 + 40, H / 2 - 20, `Stars collected: ${this.starsGot}/${this.courseStars}   ·   ★ +${this.starsRun}`, f("18px", { color: "#cbb7ff" })).setOrigin(0.5));

    const hasNext = this.levelNum < LEVELS.length;
    const next = this.add.text(W / 2, H / 2 + 58, hasNext ? "▶  NEXT LEVEL" : "★  ALL LEVELS DONE!", f("28px", { backgroundColor: "#ff9ed2", color: "#3a2260" }))
      .setOrigin(0.5).setPadding(36, 13, 36, 13).setInteractive({ useHandCursor: true });
    next.on("pointerdown", () => {
      if (!hasNext) { this.scene.start("LevelSelect"); return; }
      const go = () => this.scene.start("Game", { mode: "level", level: this.levelNum + 1 });
      if (this.levelNum % 3 === 0) SDK.midgameAd(go); else go();
    });
    box.add(next);

    const replay = this.add.text(W / 2 - 110, H / 2 + 140, "↻ REPLAY", f("19px", { backgroundColor: "#3a2260" }))
      .setOrigin(0.5).setPadding(18, 9, 18, 9).setInteractive({ useHandCursor: true });
    replay.on("pointerdown", () => this.scene.start("Game", { mode: "level", level: this.levelNum }));
    box.add(replay);
    const map = this.add.text(W / 2 + 90, H / 2 + 140, "LEVELS", f("19px", { backgroundColor: "#3a2260", color: "#ffd94e" }))
      .setOrigin(0.5).setPadding(18, 9, 18, 9).setInteractive({ useHandCursor: true });
    map.on("pointerdown", () => this.scene.start("LevelSelect"));
    box.add(map);

    this.tweens.add({ targets: box, alpha: 1, y: 0, duration: 380, ease: "Back.out" });
    this._confettiBurst();
    this.snd.fanfare();
  }

  _confettiBurst() {
    for (let i = 0; i < 50; i++) {
      const p = this.add.image(Phaser.Math.Between(0, W), -20 - Math.random() * 240, "confetti")
        .setScale(Phaser.Math.FloatBetween(0.5, 1)).setAngle(Math.random() * 360).setDepth(99);
      p.setCrop(Phaser.Math.Between(0, 4) * 12, 0, 9, 14);
      this.tweens.add({
        targets: p, y: H + 30, angle: p.angle + Phaser.Math.Between(-360, 360),
        x: p.x + Phaser.Math.Between(-80, 80),
        duration: Phaser.Math.Between(1800, 3000), delay: Math.random() * 400,
        onComplete: () => p.destroy(),
      });
    }
  }

  /* ================= FX ================= */
  _dust(x, y, tint = 0xd8c9a8) {
    for (let i = 0; i < 5; i++) {
      const p = this.add.image(x + Phaser.Math.Between(-14, 14), y - 4, "px").setDepth(9).setTint(tint).setScale(Phaser.Math.FloatBetween(1, 2.4));
      this.tweens.add({ targets: p, y: y - Phaser.Math.Between(10, 26), alpha: 0, duration: 320, onComplete: () => p.destroy() });
    }
  }
  _spark(x, y, tint) {
    const p = this.add.image(x, y, "sparkle").setDepth(9).setTint(tint).setScale(Phaser.Math.FloatBetween(0.6, 1.2));
    this.tweens.add({ targets: p, y: y - 24, alpha: 0, angle: 90, duration: 480, onComplete: () => p.destroy() });
  }
  _burst(x, y, tint, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = Phaser.Math.Between(60, 220);
      const p = this.add.image(x, y, "sparkle").setDepth(9).setTint(tint).setScale(Phaser.Math.FloatBetween(0.5, 1.3));
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * sp * 0.6, y: y + Math.sin(a) * sp * 0.6 - 20,
        alpha: 0, duration: Phaser.Math.Between(280, 520), onComplete: () => p.destroy(),
      });
    }
  }
  _trail(dt) {
    this._trailT -= dt;
    if (this._trailT > 0) return;
    this._trailT = 0.05;
    let tint = this.trailTint;
    if (tint === -1) tint = Phaser.Display.Color.HSLToColor((this.tt * 0.35) % 1, 0.9, 0.7).color;
    const p = this.add.image(FLOFY_X - 34, this.F.y + 6, "sparkle").setDepth(6).setTint(tint).setScale(0.8);
    this.tweens.add({ targets: p, x: p.x - 50, alpha: 0, duration: 420, onComplete: () => p.destroy() });
  }
}
