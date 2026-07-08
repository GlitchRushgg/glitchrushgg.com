// DREAM DUO core: two stacked worlds scrolling in sync.
// Bottom = the park (Elizabeth, classic gravity jump).
// Top = the dream (Flofy, floaty physics + flutter double-hop).
// Left half / A / ← controls Elizabeth · right half / L / → controls Flofy.
// SYNC star pairs build the multiplier; 5 syncs = FAIRY RUSH (worlds merge).
// No physics engine — manual dt-capped movement (consistent at any Hz).

import {
  W, H, PLAYER_X, DREAM, PARK, DIVIDER_Y, ELIZ, FLOFY,
  BASE_SPEED, MAX_RAMP, RAMP_DIST, PX_PER_M, BIOMES,
  SYNC_WINDOW, MAX_MULT, METER_MAX, RUSH_SECS, SHIELD_SECS, DASH_SECS, REVIVE_STARS,
} from "../const.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { SDK } from "../utils/SDK.js";
import { TRAILS } from "../items.js";

const FONT = "'Segoe UI', system-ui, sans-serif";

export class GameScene extends Phaser.Scene {
  constructor() { super("Game"); }

  create() {
    window.__dd = this; // debug hook
    this.snd = new Sound();
    this.snd.resume();

    const sv = Save.get();
    this.skin = sv.skin;
    this.trailTint = (TRAILS.find((t) => t.id === sv.trail) || TRAILS[0]).tint;

    // ---------- state ----------
    this.dist = 0;
    this.speed = 0;
    this.ts = 1;                    // tutorial slow-mo timescale
    this.hearts = 3;
    this.score = 0;
    this.mult = 1;
    this.meter = 0;
    this.starsRun = 0;
    this.rushT = 0;
    this.shieldT = 0;
    this.dashT = 0;
    this.invuln = 0;
    this.dead = false;
    this.paused = false;
    this.usedRevive = false;
    this.tt = 0;
    this.biome = 0;
    this._obClock = 900;            // px until first obstacle (breathing room)
    this._starClock = 420;
    this._pickupClock = 4200;       // px (~420m? no: px → 420m=4200px) first family pickup
    this._pickupIdx = 0;
    this._lastObDist = { park: -9999, dream: -9999 };
    this._pairSeq = 0;

    this.obstacles = [];
    this.stars = [];
    this.pairs = new Map();
    this.pickups = [];
    this._trailT = 0;

    this._buildWorld();
    this._buildCharacters();
    this._buildHUD();
    this._bindInput();

    // tutorial (first run only): gesture overlays, skippable (study rec #2)
    this.tutorial = Save.get().tutorialSeen ? 0 : 1;
    if (this.tutorial) this._showTutorial(1);

    this.snd.startMusic();
    SDK.gameplayStart();

    this.events.on("shutdown", () => {
      this.snd.stopMusic();
      this.snd.setRush(false);
    });
    // auto-pause on blur (CG requirement)
    this._onBlur = () => { if (!this.dead && !this.paused) this._togglePause(true); };
    this.game.events.on(Phaser.Core.Events.BLUR, this._onBlur);
    this.events.once("shutdown", () => this.game.events.off(Phaser.Core.Events.BLUR, this._onBlur));
  }

  /* ================= WORLD ================= */
  _buildWorld() {
    // two bg layers per world for biome crossfade
    this.bg = {};
    for (const world of ["dream", "park"]) {
      const y = world === "dream" ? DREAM.bgY : PARK.bgY;
      const key = BIOMES[0][world];
      const a = this.add.tileSprite(0, y, W, 360, key).setOrigin(0, 0).setDepth(0);
      const b = this.add.tileSprite(0, y, W, 360, key).setOrigin(0, 0).setDepth(1).setAlpha(0);
      // the art is 1280x720 → show the lane-appropriate half via tilePositionY
      a.setTileScale(1, 0.72); b.setTileScale(1, 0.72);
      if (world === "park") { a.tilePositionY = 200; b.tilePositionY = 200; }
      this.bg[world] = { a, b, front: a };
    }

    // ground lines
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0xffffff, 0.35); g.fillRect(0, DREAM.ground, W, 3);
    g.fillStyle(0x2c1f0e, 0.35); g.fillRect(0, PARK.ground, W, 3);

    // dream ribbon divider
    this.ribbon = this.add.tileSprite(0, DIVIDER_Y, W, 24, "ribbon").setOrigin(0, 0.5).setDepth(3).setAlpha(0.9);
    this.add.rectangle(W / 2, DIVIDER_Y - 14, W, 6, 0x14102b, 0.5).setDepth(3);
    this.add.rectangle(W / 2, DIVIDER_Y + 14, W, 6, 0x14102b, 0.5).setDepth(3);
    this.add.text(10, DIVIDER_Y, "", { fontSize: "10px" }); // keeps depth ordering stable

    // rush rainbow overlay (hidden)
    this.rainbow = this.add.graphics().setDepth(4).setVisible(false);
    const cols = [0xff9ed2, 0xffd94e, 0x8ef5c9, 0x7fd4ff, 0xb9a6ff];
    cols.forEach((c, i) => {
      this.rainbow.fillStyle(c, 0.10);
      this.rainbow.fillRect(0, 120 + i * 96, W, 96);
    });

    this.veilFlash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff).setDepth(50).setAlpha(0);
  }

  _swapBiome(idx) {
    this.biome = idx;
    for (const world of ["dream", "park"]) {
      const layer = this.bg[world];
      const back = layer.front === layer.a ? layer.b : layer.a;
      back.setTexture(BIOMES[idx][world]);
      back.tilePositionX = layer.front.tilePositionX;
      this.tweens.add({ targets: back, alpha: 1, duration: 700 });
      const old = layer.front;
      this.tweens.add({ targets: old, alpha: 0, duration: 700, delay: 60 });
      back.setDepth(1); old.setDepth(0);
      layer.front = back;
    }
    this._toast(BIOMES[idx].name, 0xb9a6ff);
  }

  /* ================= CHARACTERS ================= */
  _buildCharacters() {
    const escale = this.registry.get("scale:eliz-run-a") || 0.16;
    const fscale = this.registry.get("scale:flofy-hop") || 0.45;

    this.E = {
      spr: this.add.sprite(PLAYER_X, PARK.ground, "eliz-run-a").setOrigin(0.5, 1).setDepth(10).setScale(escale),
      y: PARK.ground, vy: 0, grounded: true, coyote: 0, buffer: 0, holding: false, animT: 0,
      scale: escale,
    };
    if (this.skin === "golden") this.E.spr.setTint(0xffd57a);
    if (this.skin === "fairy") {
      const fs = this.registry.get("scale:eliz-fairy") || escale;
      this.E.spr.setTexture("eliz-fairy").setScale(fs);
      this.E.scale = fs;
      this.E.fairySkin = true;
    }

    this.F = {
      spr: this.add.sprite(PLAYER_X, DREAM.ground, "flofy-hop").setOrigin(0.5, 1).setDepth(10).setScale(fscale),
      y: DREAM.ground, vy: 0, grounded: true, hops: 0, scale: fscale,
    };

    // shields (papá)
    this.shieldE = this.add.image(PLAYER_X, PARK.ground - 70, "shield").setDepth(11).setVisible(false).setScale(1.15);
    this.shieldF = this.add.image(PLAYER_X, DREAM.ground - 50, "shield").setDepth(11).setVisible(false).setScale(0.9);
  }

  /* ================= HUD ================= */
  _buildHUD() {
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    this.heartIcons = [];
    for (let i = 0; i < 3; i++) {
      this.heartIcons.push(this.add.image(34 + i * 44, 34, "heart").setDepth(60).setScale(0.8));
    }

    this.scoreTxt = this.add.text(W / 2, 16, "0", f("40px", { stroke: "#3a2260", strokeThickness: 6 })).setOrigin(0.5, 0).setDepth(60);
    this.multTxt = this.add.text(W / 2 + 120, 26, "×1", f("26px", { color: "#ffd94e" })).setOrigin(0, 0).setDepth(60);

    // dream meter (5 segments)
    this.meterSegs = [];
    for (let i = 0; i < METER_MAX; i++) {
      const r = this.add.rectangle(W / 2 - 90 + i * 38, 74, 32, 12, 0xffffff, 0.18)
        .setStrokeStyle(2, 0xb9a6ff, 0.7).setDepth(60);
      this.meterSegs.push(r);
    }
    this.meterLabel = this.add.text(W / 2, 92, "DREAM METER", f("12px", { color: "#cbb7ff" })).setOrigin(0.5, 0).setDepth(60);

    this.starIcon = this.add.image(W - 220, 34, "star").setDepth(60).setScale(0.7);
    this.starTxt = this.add.text(W - 196, 22, "0", f("26px", { color: "#ffd94e" })).setDepth(60);

    // pause + mute (≥64px touch targets)
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

    // world labels (fade out quickly)
    const l1 = this.add.text(14, DREAM.top + 6, "FLOFY'S DREAM", f("15px", { color: "#cbb7ff" })).setDepth(60).setAlpha(0.9);
    const l2 = this.add.text(14, PARK.top + 6, "ELIZABETH'S PARK", f("15px", { color: "#ffe6b0" })).setDepth(60).setAlpha(0.9);
    this.tweens.add({ targets: [l1, l2], alpha: 0, delay: 3500, duration: 900 });

    this.toastTxt = this.add.text(W / 2, 128, "", f("26px", { stroke: "#3a2260", strokeThickness: 5 })).setOrigin(0.5).setDepth(60).setAlpha(0);
  }

  _toast(msg, color = 0xffffff) {
    this.toastTxt.setText(msg).setColor("#" + color.toString(16).padStart(6, "0")).setAlpha(1).setScale(0.7);
    this.tweens.add({ targets: this.toastTxt, scale: 1, duration: 180, ease: "Back.out" });
    this.tweens.add({ targets: this.toastTxt, alpha: 0, delay: 1300, duration: 400 });
  }

  /* ================= INPUT ================= */
  _bindInput() {
    this.input.on("pointerdown", (p) => {
      if (this.dead || this.paused) return;
      if (p.y < 120 && p.x > W - 220) return; // HUD buttons
      this.snd.resume();
      if (p.x < W / 2) this._pressE(); else this._pressF();
      p._ddSide = p.x < W / 2 ? "E" : "F";
    });
    this.input.on("pointerup", (p) => {
      if (p._ddSide === "E") this._releaseE();
    });

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
    if (this.rushT > 0) return;
    if (E.grounded || E.coyote > 0) {
      E.vy = ELIZ.jump;
      E.grounded = false; E.coyote = 0; E.buffer = 0;
      E.spr.setTexture(this.E.fairySkin ? "eliz-fairy" : "eliz-jump");
      this.snd.jumpE();
      this._dust(PLAYER_X, PARK.ground);
      if (this.tutorial === 1) this._showTutorial(2);
    }
  }
  _releaseE() {
    const E = this.E;
    E.holding = false;
    if (!E.grounded && E.vy < ELIZ.cut) E.vy = ELIZ.cut;
  }
  _pressF() {
    const F = this.F;
    if (this.rushT > 0) return;
    if (F.grounded) {
      F.vy = FLOFY.hop; F.grounded = false; F.hops = 1;
      F.spr.setTexture("flofy-hop");
      this.snd.hopF();
      this._dust(PLAYER_X, DREAM.ground, 0xcbb7ff);
      if (this.tutorial === 2) this._showTutorial(3);
    } else if (F.hops < 2) {
      F.vy = FLOFY.flutter; F.hops = 2;
      this.snd.flutter();
      for (let i = 0; i < 6; i++) this._spark(PLAYER_X + Phaser.Math.Between(-16, 16), F.y - 30 + Phaser.Math.Between(-10, 10), 0xfff2b0);
      if (this.tutorial === 2) this._showTutorial(3);
    }
  }

  /* ================= TUTORIAL ================= */
  _showTutorial(step) {
    if (this._tutGroup) this._tutGroup.destroy(true);
    this.tutorial = step;
    if (step > 3) { Save.get().tutorialSeen = true; Save.persist(); this.ts = 1; return; }
    this.ts = 0.55;
    const f = { fontFamily: FONT, fontSize: "24px", color: "#fff", fontStyle: "bold", align: "center", stroke: "#3a2260", strokeThickness: 5 };
    this._tutGroup = this.add.container(0, 0).setDepth(70);
    let txt, x, y;
    if (step === 1) { txt = "TAP LEFT SIDE\n(or A / ←)\nElizabeth JUMPS"; x = W * 0.25; y = PARK.top + 80; }
    else if (step === 2) { txt = "TAP RIGHT SIDE\n(or L / →)\nFlofy HOPS — tap twice to FLUTTER!"; x = W * 0.75; y = DREAM.top + 90; }
    else { txt = "Grab BOTH stars together = SYNC ×!\nFill the meter → FAIRY RUSH"; x = W / 2; y = H / 2 - 30; }
    const t = this.add.text(x, y, txt, f).setOrigin(0.5);
    this._tutGroup.add(t);
    this.tweens.add({ targets: t, scale: { from: 0.92, to: 1.04 }, duration: 500, yoyo: true, repeat: -1 });
    const skip = this.add.text(W / 2, H - 40, "SKIP TUTORIAL", { fontFamily: FONT, fontSize: "17px", color: "#cbb7ff", backgroundColor: "#3a226088" })
      .setOrigin(0.5).setPadding(12, 6, 12, 6).setInteractive({ useHandCursor: true });
    skip.on("pointerdown", () => this._showTutorial(4));
    this._tutGroup.add(skip);
    if (step === 3) this.time.delayedCall(3200, () => { if (this.tutorial === 3) this._showTutorial(4); });
  }

  /* ================= PAUSE ================= */
  _togglePause(force) {
    if (this.dead) return;
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
  _spawnObstacles() {
    const m = this.dist / PX_PER_M;
    // pattern pool grows with distance (8 obstacle types, study rec #3)
    const park = ["hedge", "bench"];
    if (m > 150) park.push("birdbath");
    if (m > 350) park.push("pigeon");
    const dream = ["top", "cloud"];
    if (m > 250) dream.push("blocks");
    if (m > 500) dream.push("bubble");

    const roll = Math.random();
    let mode;
    if (m < 60) mode = roll < 0.5 ? "solo-park" : "solo-dream";
    else if (roll < 0.30) mode = "mirror";
    else if (roll < 0.55) mode = "stagger";
    else if (roll < 0.78) mode = "solo-park";
    else mode = "solo-dream";

    const gapOK = (lane) => this.dist - this._lastObDist[lane] > this.speed * 0.85 + 300;
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];

    if ((mode === "mirror" || mode === "stagger" || mode === "solo-park") && gapOK("park")) {
      this._addObstacle("park", pick(park), W + 100);
      this._lastObDist.park = this.dist;
    }
    if ((mode === "mirror" || mode === "solo-dream") && gapOK("dream")) {
      this._addObstacle("dream", pick(dream), W + 100);
      this._lastObDist.dream = this.dist;
    } else if (mode === "stagger" && gapOK("dream")) {
      this._addObstacle("dream", pick(dream), W + 360);
      this._lastObDist.dream = this.dist + 260;
    }

    const base = Math.max(300, 620 - m * 0.35);
    this._obClock = this.speed * 0.45 + base + Math.random() * 260;
  }

  _addObstacle(lane, type, x) {
    const ground = lane === "park" ? PARK.ground : DREAM.ground;
    let spr, w, h, extraV = 0, bob = null, cy = null;
    const mk = (key, dispH, originY = 1) => {
      const s = this.add.image(x, ground, key).setOrigin(0.5, originY).setDepth(8);
      s.setScale(dispH / s.height);
      return s;
    };
    switch (type) {
      case "hedge": spr = mk("ob-hedge", 92); w = spr.displayWidth * 0.72; h = 88; break;
      case "bench": spr = mk("ob-bench", 96); w = spr.displayWidth * 0.8; h = 90; break;
      case "birdbath": spr = mk("ob-birdbath", 132); w = spr.displayWidth * 0.55; h = 128; break;
      case "pigeon": {
        cy = ground - 205;
        spr = this.add.image(x, cy, "ob-pigeon").setDepth(8);
        spr.setScale(72 / spr.height);
        w = spr.displayWidth * 0.6; h = 52; extraV = 170;
        this.tweens.add({ targets: spr, y: cy - 12, duration: 380, yoyo: true, repeat: -1, ease: "Sine.inOut" });
        break;
      }
      case "cloud": {
        cy = ground - 152;
        spr = this.add.image(x, cy, "ob-cloud").setDepth(8);
        spr.setScale(84 / spr.height);
        w = spr.displayWidth * 0.72; h = 74;
        break;
      }
      case "blocks": spr = mk("ob-blocks", 168); w = spr.displayWidth * 0.62; h = 164; break;
      case "top": {
        spr = mk("ob-top", 84); w = spr.displayWidth * 0.6; h = 80; extraV = 150;
        this.tweens.add({ targets: spr, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: -1 });
        break;
      }
      case "bubble": {
        cy = ground - 120;
        spr = this.add.image(x, cy, "ob-bubble").setDepth(8).setScale(0.95);
        w = 76; h = 76; bob = { base: cy, amp: 66, ph: Math.random() * 6, sp: 1.7 };
        break;
      }
    }
    this.obstacles.push({ spr, lane, type, w, h, extraV, bob, air: cy !== null, cy });
  }

  _spawnStars() {
    const m = this.dist / PX_PER_M;
    const roll = Math.random();
    const x = W + 80;
    if (roll < 0.55 && m > 25) {
      // SYNC PAIR — the heart of the scoring
      const id = ++this._pairSeq;
      this._addStar("park", x, PARK.ground - 150, id);
      this._addStar("dream", x, DREAM.ground - 130, id);
      this.pairs.set(id, { got: 0, timer: 0, active: false });
    } else if (roll < 0.8) {
      for (let i = 0; i < 3; i++) this._addStar("park", x + i * 90, PARK.ground - (i === 1 ? 190 : 140), 0);
    } else {
      for (let i = 0; i < 3; i++) this._addStar("dream", x + i * 90, DREAM.ground - (i === 1 ? 200 : 130), 0);
    }
    this._starClock = 520 + Math.random() * 420;
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
    this.stars.push({ spr, lane, pairId, y });
  }

  _spawnPickup() {
    const kinds = ["mama", "papa", "cristian"];
    const kind = kinds[this._pickupIdx++ % 3];
    const lane = Math.random() < 0.5 ? "park" : "dream";
    const ground = lane === "park" ? PARK.ground : DREAM.ground;
    const y = ground - 120;
    const glow = this.add.image(W + 80, y, "glow").setDepth(6).setScale(1.6).setTint(0xfff2b0);
    const spr = this.add.image(W + 80, y, `pw-${kind}`).setDepth(7);
    spr.setScale((this.registry.get(`scale:pw-${kind}`) || 0.12) * 0.72);
    this.tweens.add({ targets: [spr, glow], y: y - 14, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.pickups.push({ spr, glow, kind, lane });
    this._pickupClock = 4200 + Math.random() * 1600;
  }

  /* ================= UPDATE ================= */
  update(_, dms) {
    if (this.dead || this.paused) return;
    const dtRaw = Math.min(dms / 1000, 0.05);
    this.tt += dtRaw;
    const dt = dtRaw * this.ts;

    // speed ramp (+ Cristian dash boost)
    const ramp = Math.min(MAX_RAMP, 1 + this.dist / RAMP_DIST);
    this.speed = BASE_SPEED * ramp * (this.dashT > 0 ? 1.55 : 1) * (this.rushT > 0 ? 1.15 : 1);
    this.dist += this.speed * dt;

    // biome crossfade
    const m = this.dist / PX_PER_M;
    const bi = BIOMES.length - 1 - [...BIOMES].reverse().findIndex((b) => m >= b.at);
    if (bi !== this.biome) this._swapBiome(bi);

    // parallax
    for (const world of ["dream", "park"]) {
      this.bg[world].a.tilePositionX += this.speed * dt * 0.35;
      this.bg[world].b.tilePositionX += this.speed * dt * 0.35;
    }
    this.ribbon.tilePositionX += this.speed * dt * 0.8;

    this._updateE(dt);
    this._updateF(dt);
    this._updateRush(dtRaw);
    if (this.shieldT > 0) this._updateShield(dtRaw);
    if (this.dashT > 0) this.dashT -= dtRaw;
    if (this.invuln > 0) {
      this.invuln -= dtRaw;
      const blink = Math.sin(this.tt * 24) > 0 ? 1 : 0.35;
      this.E.spr.setAlpha(blink); this.F.spr.setAlpha(blink);
      if (this.invuln <= 0) { this.E.spr.setAlpha(1); this.F.spr.setAlpha(1); }
    }

    // spawners (px-based clocks)
    this._obClock -= this.speed * dt;
    if (this._obClock <= 0) this._spawnObstacles();
    this._starClock -= this.speed * dt;
    if (this._starClock <= 0) this._spawnStars();
    this._pickupClock -= this.speed * dt;
    if (this._pickupClock <= 0) this._spawnPickup();

    this._moveWorld(dt, dtRaw);
    this._collide();
    this._updatePairs(dtRaw);
    this._trail(dtRaw);

    // score: distance × mult
    this.score += this.speed * dt * 0.012 * this.mult;
    this.scoreTxt.setText(String(Math.floor(this.score)));
  }

  _updateE(dt) {
    const E = this.E;
    if (this.rushT > 0) return; // rush controls E
    if (E.buffer > 0) {
      E.buffer -= dt;
      if (E.grounded) { E.buffer = 0; this._pressE(); }
    }
    if (!E.grounded) {
      E.vy += ELIZ.grav * dt;
      E.y += E.vy * dt;
      if (E.y >= PARK.ground) {
        E.y = PARK.ground; E.vy = 0; E.grounded = true; E.coyote = ELIZ.coyote;
        this._dust(PLAYER_X, PARK.ground);
      }
    } else {
      E.coyote = ELIZ.coyote;
      E.animT += dt * (this.speed / 340);
      if (!E.fairySkin) E.spr.setTexture(Math.floor(E.animT * 7) % 2 === 0 ? "eliz-run-a" : "eliz-run-b");
    }
    if (!E.grounded) E.coyote -= dt;
    E.spr.y = E.y;
    E.spr.rotation = E.grounded ? 0 : Phaser.Math.Clamp(E.vy / 4200, -0.16, 0.22);
  }

  _updateF(dt) {
    const F = this.F;
    if (this.rushT > 0) return;
    if (!F.grounded) {
      F.vy += FLOFY.grav * dt;
      if (F.vy > FLOFY.maxFall) F.vy = FLOFY.maxFall;
      F.y += F.vy * dt;
      F.spr.setTexture(F.vy < 0 ? "flofy-hop" : "flofy-fall");
      if (F.y <= DREAM.top + 60) { F.y = DREAM.top + 60; F.vy = Math.max(F.vy, 0); }
      if (F.y >= DREAM.ground) {
        F.y = DREAM.ground; F.vy = 0; F.grounded = true; F.hops = 0;
        F.spr.setTexture("flofy-hop");
        this._dust(PLAYER_X, DREAM.ground, 0xcbb7ff);
      }
    } else {
      // idle bounce while grounded (plush bunnies don't stand still)
      F.spr.setScale(F.scale * (1 + Math.sin(this.tt * 9) * 0.03), F.scale * (1 - Math.sin(this.tt * 9) * 0.03));
    }
    F.spr.y = F.y;
  }

  /* ================= FAIRY RUSH ================= */
  _startRush() {
    this.rushT = RUSH_SECS;
    this.meter = 0;
    this.snd.fanfare();
    this.snd.setRush(true);
    this._toast("✨ FAIRY RUSH! ✨", 0xffd94e);
    this.veilFlash.setAlpha(0.85);
    this.tweens.add({ targets: this.veilFlash, alpha: 0, duration: 500 });
    this.rainbow.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.rainbow, alpha: 1, duration: 600 });
    // Elizabeth sprouts wings and flies up NEXT TO Flofy (side by side)
    this.E.spr.setTexture("eliz-fairy");
    const fs = this.registry.get("scale:eliz-fairy") || this.E.scale;
    this.E.spr.setScale(fs);
    this.E.spr.setRotation(0);
    this.tweens.add({ targets: this.E.spr, x: PLAYER_X + 105, duration: 900, ease: "Sine.inOut" });
    this.tweens.add({ targets: this.E, y: DREAM.ground - 40, duration: 900, ease: "Sine.inOut", onUpdate: () => { this.E.spr.y = this.E.y; } });
    this.tweens.add({ targets: this.F, y: DREAM.ground - 130, duration: 900, ease: "Sine.inOut", onUpdate: () => { this.F.spr.y = this.F.y; } });
    this.cameras.main.shake(240, 0.004);
    SDK.happyTime();
  }

  _updateRush(dtRaw) {
    if (this.rushT <= 0) return;
    this.rushT -= dtRaw;
    // gentle synchronized flight bob
    const bob = Math.sin(this.tt * 3.2) * 34;
    this.E.y = DREAM.ground - 60 + bob; this.E.spr.y = this.E.y;
    this.F.y = DREAM.ground - 150 + bob; this.F.spr.y = this.F.y;
    this.E.spr.rotation = 0;
    // sparkle wake
    if (Math.random() < 0.5) this._spark(PLAYER_X - 30 + Phaser.Math.Between(-10, 10), this.E.y - 60 + Phaser.Math.Between(-20, 20), 0xffd94e);
    // magnet stars
    for (const s of this.stars) {
      const dx = s.spr.x - PLAYER_X, dy = s.spr.y - (DREAM.ground - 100);
      const d = Math.hypot(dx, dy);
      if (d < 320) { s.spr.x -= dx * 0.14; s.spr.y -= dy * 0.14; if (s.spr._glow) { s.spr._glow.x = s.spr.x; s.spr._glow.y = s.spr.y; } }
    }
    // pop obstacles as they arrive (both worlds merge into joy)
    for (const o of this.obstacles) {
      if (o.spr.x < PLAYER_X + 320 && !o._popped) { o._popped = true; this._popObstacle(o, true); }
    }
    if (this.rushT <= 0) this._endRush();
  }

  _endRush() {
    this.snd.setRush(false);
    this.tweens.add({ targets: this.rainbow, alpha: 0, duration: 700, onComplete: () => this.rainbow.setVisible(false) });
    // Elizabeth glides back down to her park
    this.tweens.add({ targets: this.E.spr, x: PLAYER_X, duration: 850, ease: "Sine.in" });
    if (!this.E.fairySkin) {
      this.time.delayedCall(880, () => {
        if (!this.dead) { this.E.spr.setTexture("eliz-run-a").setScale(this.E.scale); if (this.skin === "golden") this.E.spr.setTint(0xffd57a); }
      });
    }
    this.tweens.add({ targets: this.E, y: PARK.ground, duration: 850, ease: "Sine.in", onUpdate: () => { this.E.spr.y = this.E.y; }, onComplete: () => { this.E.grounded = true; this.E.vy = 0; } });
    this.tweens.add({ targets: this.F, y: DREAM.ground, duration: 700, ease: "Sine.in", onUpdate: () => { this.F.spr.y = this.F.y; }, onComplete: () => { this.F.grounded = true; this.F.vy = 0; this.F.hops = 0; } });
    this.invuln = Math.max(this.invuln, 1.2);
  }

  /* ================= WORLD MOVEMENT + COLLISIONS ================= */
  _moveWorld(dt, dtRaw) {
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
      if (s.spr.x < -80) this._removeStar(i, false);
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.spr.x -= this.speed * dt; p.glow.x = p.spr.x;
      if (p.spr.x < -120) { p.spr.destroy(); p.glow.destroy(); this.pickups.splice(i, 1); }
    }
  }

  _charRect(who) {
    if (who === "E") {
      const h = this.E.spr.displayHeight * 0.8;
      return new Phaser.Geom.Rectangle(PLAYER_X - 26, this.E.y - h, 52, h);
    }
    const h = this.F.spr.displayHeight * 0.82;
    return new Phaser.Geom.Rectangle(PLAYER_X - 26, this.F.y - h, 52, h);
  }

  _obRect(o) {
    if (o.air) return new Phaser.Geom.Rectangle(o.spr.x - o.w / 2, o.spr.y - o.h / 2, o.w, o.h);
    const ground = o.lane === "park" ? PARK.ground : DREAM.ground;
    return new Phaser.Geom.Rectangle(o.spr.x - o.w / 2, ground - o.h, o.w, o.h);
  }

  _collide() {
    if (this.rushT > 0) return;
    const rE = this._charRect("E"), rF = this._charRect("F");
    // obstacles
    if (this.invuln <= 0) {
      for (const o of this.obstacles) {
        if (o._popped) continue;
        if (o.spr.x > PLAYER_X + 200 || o.spr.x < PLAYER_X - 200) continue;
        const r = o.lane === "park" ? rE : rF;
        if (Phaser.Geom.Rectangle.Overlaps(r, this._obRect(o))) { this._hit(o); break; }
      }
    }
    // stars
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      if (Math.abs(s.spr.x - PLAYER_X) > 70) continue;
      const r = s.lane === "park" ? rE : rF;
      if (Phaser.Geom.Rectangle.ContainsPoint(Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(r), 26, 26), { x: s.spr.x, y: s.spr.y })) {
        this._collectStar(i);
      }
    }
    // family pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.abs(p.spr.x - PLAYER_X) > 80) continue;
      const r = p.lane === "park" ? rE : rF;
      if (Phaser.Geom.Rectangle.Overlaps(r, new Phaser.Geom.Rectangle(p.spr.x - 40, p.spr.y - 60, 80, 120))) {
        this._applyPickup(p.kind);
        p.spr.destroy(); p.glow.destroy(); this.pickups.splice(i, 1);
      }
    }
  }

  _collectStar(i) {
    const s = this.stars[i];
    const golden = this.skin === "golden";
    const gain = 1 + (golden && Math.random() < 0.1 ? 1 : 0);
    this.starsRun += gain;
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
    this.starTxt.setText(String(this.starsRun));
    this._removeStar(i, true);
  }

  _removeStar(i, collected) {
    const s = this.stars[i];
    if (s.spr._glow) s.spr._glow.destroy();
    s.spr.destroy();
    this.stars.splice(i, 1);
  }

  _sync(x) {
    this.mult = Math.min(this.mult + 1, MAX_MULT);
    const fill = this.E.fairySkin || this.skin === "fairy" ? 1.2 : 1;
    this.meter = Math.min(METER_MAX, this.meter + fill);
    this.snd.sync(this.mult);
    this._toast(`SYNC ×${this.mult}!`, 0x8ef5c9);
    // lightning line connecting the two worlds — the signature visual
    const line = this.add.rectangle(x, H / 2, 6, H - 80, 0xfff2b0, 0.9).setDepth(9);
    this.tweens.add({ targets: line, alpha: 0, scaleX: 3, duration: 360, onComplete: () => line.destroy() });
    this._burst(x, PARK.ground - 150, 0x8ef5c9, 10);
    this._burst(x, DREAM.ground - 130, 0x8ef5c9, 10);
    this.cameras.main.shake(120, 0.0022);
    this._refreshMeter();
    if (this.meter >= METER_MAX && this.rushT <= 0) this._startRush();
  }

  _updatePairs(dtRaw) {
    for (const [id, pair] of this.pairs) {
      if (pair.active && pair.got === 1) {
        pair.timer -= dtRaw;
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
      this._burst(PLAYER_X, H / 2, 0xff9ed2, 14);
    } else if (kind === "papa") {
      this.shieldT = SHIELD_SECS;
      this.snd.shield();
      this._toast("DAD'S SHIELD!", 0x7fd4ff);
      this.shieldE.setVisible(true); this.shieldF.setVisible(true);
    } else {
      this.dashT = DASH_SECS;
      this.snd.dash();
      this._toast("CRISTIAN'S DASH!", 0xffd94e);
      // Cristian skates across both worlds clearing the way (Hop & Run crossover)
      const c = this.add.image(-80, PARK.ground, "pw-cristian").setOrigin(0.5, 1).setDepth(12);
      c.setScale((this.registry.get("scale:pw-cristian") || 0.12));
      this.tweens.add({ targets: c, x: W + 140, duration: 1100, ease: "Quad.in", onComplete: () => c.destroy() });
      this.time.delayedCall(200, () => { for (const o of this.obstacles) if (!o._popped && o.spr.x < W) { o._popped = true; this._popObstacle(o, true); } });
    }
  }

  _updateShield(dtRaw) {
    this.shieldT -= dtRaw;
    this.shieldE.setPosition(PLAYER_X, this.E.y - this.E.spr.displayHeight * 0.45);
    this.shieldF.setPosition(PLAYER_X, this.F.y - this.F.spr.displayHeight * 0.45);
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
    this._burst(o.spr.x, o.air ? o.spr.y : (o.lane === "park" ? PARK.ground : DREAM.ground) - o.h / 2, joyful ? 0xffd94e : 0xffffff, joyful ? 12 : 8);
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
    // revive offer — once per run (rewarded ad OR stars, the CG-required alternative)
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
        this.starTxt.setText(String(this.starsRun));
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
    if (!this.E.fairySkin) { this.E.spr.setTexture("eliz-run-a").setScale(this.E.scale); if (this.skin === "golden") this.E.spr.setTint(0xffd57a); }
    for (const o of this.obstacles) if (!o._popped) { o._popped = true; this._popObstacle(o, true); }
    this.snd.revive();
    if (!this.snd.muted) this.snd.startMusic();
    SDK.gameplayStart();
    this._toast("BACK IN THE DREAM!", 0x8ef5c9);
  }

  _gameOver() {
    Save.addStars(this.starsRun);
    this.scene.start("GameOver", {
      score: Math.floor(this.score),
      meters: Math.floor(this.dist / PX_PER_M),
      stars: this.starsRun,
      maxMult: this.mult,
    });
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
  _trail(dtRaw) {
    this._trailT -= dtRaw;
    if (this._trailT > 0) return;
    this._trailT = 0.05;
    let tint = this.trailTint;
    if (tint === -1) tint = Phaser.Display.Color.HSLToColor((this.tt * 0.35) % 1, 0.9, 0.7).color;
    const p = this.add.image(PLAYER_X - 26, this.F.y - this.F.spr.displayHeight * 0.4, "sparkle").setDepth(6).setTint(tint).setScale(0.8);
    this.tweens.add({ targets: p, x: p.x - 50, alpha: 0, duration: 420, onComplete: () => p.destroy() });
  }
}
