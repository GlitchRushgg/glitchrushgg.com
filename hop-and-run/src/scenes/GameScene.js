// Hop & Run — core. One-button rooftop runner starring Cristian (15), with the
// Adventure Island recipe adapted: ENERGY drains over time and FRUIT refills it,
// varied obstacles (crates to hop, pigeons at jump height, gaps), a SKATEBOARD
// speed power-up that smashes through, and the GUITAR SOLO super power
// (invincible rock-out + magnet + lightning blasts). Rescue animals for score.

import { W, H, PLAYER_X, SECTORS } from "../const.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

const GRAVITY = 2100;
const JUMP = -840;
const PLAT_H = 300;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.snd = new Sound();
    this.snd.startMusic();
    this.events.once("shutdown", () => this.snd.stopMusic());

    const onBlur = () => { if (!this.dead && !this.paused) this._togglePause(); };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once("shutdown", () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));

    // State.
    this.dead = false;
    this.paused = false;
    this.dist = 0;
    this.speed = 300;
    this.speedPenalty = 0;
    this.energy = 100;
    this.animals = 0;
    this.combo = 0;
    this.comboT = 0;
    this.invuln = 0;
    this.skateT = 0;
    this.soloT = 0;
    this.holding = false;
    this._coyote = 0;
    this._jumpBuffer = 0;
    this._wasAir = false;
    this._lowBeepT = 0;
    this._hurtT = 0;
    this.sectorIx = 0;
    this._nextSkateAt = 380;   // meters
    this._nextGuitarAt = 650;

    this.physics.world.gravity.y = GRAVITY;

    this._buildBackground();

    this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    this.hazards = this.physics.add.group({ allowGravity: false, immovable: true });

    this._buildPlayer();

    // Long starting rooftop.
    this._spawnPlatform(-40, 520, 640);
    this.lastRight = 600;
    this.lastTop = 520;
    for (let i = 0; i < 6; i++) this._spawnNext();

    this.physics.add.collider(this.player, this.platforms, null, (pl, plat) => {
      return pl.body.velocity.y >= 0 && (pl.body.bottom - 18) <= plat.body.top;
    });
    this.physics.add.overlap(this.player, this.pickups, this._collect, null, this);
    this.physics.add.overlap(this.player, this.hazards, this._hitHazard, null, this);

    this._buildHUD();
    this._buildInput();
    this._buildTutorial();

    if (typeof window !== "undefined") window.__hr = this; // debug hook
  }

  // ------------------------------------------------------------ construction

  _buildBackground() {
    const pal = SECTORS[0];
    // Two side-by-side skyline images scrolling left (the art includes the sky).
    this.bgA = this.add.image(0, 0, pal.sky).setOrigin(0, 0).setDepth(0);
    this.bgB = this.add.image(0, 0, pal.sky).setOrigin(0, 0).setDepth(0);
    const sc = Math.max(W / this.bgA.width, H / this.bgA.height);
    [this.bgA, this.bgB].forEach((b) => b.setScale(sc));
    this.bgB.setFlipX(true); // espejo: los bordes casan y no hay costura
    this.bgW = this.bgA.displayWidth;
    this.bgB.x = this.bgW;
    // Clouds drift on top of the skyline art for extra depth.
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      const c = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(40, 260), "cloud")
        .setDepth(1).setAlpha(0.75).setScale(Phaser.Math.FloatBetween(0.8, 1.7));
      this.clouds.push(c);
    }
  }

  _swapBackground(pal) {
    // Crossfade to the new sector's skyline.
    const oldA = this.bgA, oldB = this.bgB;
    this.bgA = this.add.image(oldA.x, 0, pal.sky).setOrigin(0, 0).setDepth(0).setAlpha(0);
    this.bgB = this.add.image(oldB.x, 0, pal.sky).setOrigin(0, 0).setDepth(0).setAlpha(0);
    const sc = Math.max(W / this.bgA.width, H / this.bgA.height);
    [this.bgA, this.bgB].forEach((b) => b.setScale(sc));
    this.bgB.setFlipX(true);
    this.bgW = this.bgA.displayWidth;
    this.tweens.add({ targets: [this.bgA, this.bgB], alpha: 1, duration: 1200 });
    this.tweens.add({ targets: [oldA, oldB], alpha: 0, duration: 1200,
      onComplete: () => { oldA.destroy(); oldB.destroy(); } });
  }

  _buildPlayer() {
    if (!this.anims.exists("run")) {
      this.anims.create({
        key: "run",
        frames: [1, 2, 3, 4].map((i) => ({ key: `p-cristian-run-${i}` })),
        frameRate: 10,
        repeat: -1,
      });
    }
    this.player = this.physics.add.sprite(PLAYER_X, 300, "p-cristian-run-1");
    this.player.setOrigin(0.5, 1);
    this.player.setScale(1.15);
    this.player.body.setSize(70, 150);
    this.player.body.setOffset((this.player.width - 70) / 2, this.player.height - 155);
    this.player.setDepth(10);
    this.player.play("run");
    // Contact shadow.
    this.shadow = this.add.ellipse(PLAYER_X, 520, 90, 18, 0x1a2a3a, 0.28).setDepth(5);
    this._groundY = 520;
    // Golden aura shown during the guitar solo.
    this.aura = this.add.image(PLAYER_X, 400, "glow").setDepth(9).setScale(3.4)
      .setTint(0xffe066).setAlpha(0);
  }

  _buildHUD() {
    const f = (size, extra = {}) => ({
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: size, color: "#ffffff", fontStyle: "bold",
      stroke: "#23324a", strokeThickness: 5, ...extra,
    });
    this.hudDist = this.add.text(24, 16, "0 m", f("34px")).setDepth(20);

    // Energy bar (the Adventure Island heart of the game).
    this.add.image(34, 78, "fruit-apple").setDisplaySize(34, 34).setDepth(20);
    this.add.rectangle(60, 78, 224, 20, 0x000000, 0.45).setOrigin(0, 0.5).setDepth(20)
      .setStrokeStyle(2, 0xffffff, 0.8);
    this.energyFill = this.add.rectangle(62, 78, 220, 14, 0x7cd94e, 1).setOrigin(0, 0.5).setDepth(21);

    this.hudAnimals = this.add.text(W / 2, 18, "", f("26px", { color: "#ffe066" })).setOrigin(0.5, 0).setDepth(20);
    this.hudCombo = this.add.text(W / 2, 54, "", f("20px", { color: "#ff8fb0" })).setOrigin(0.5, 0).setDepth(20);
    this.hudPower = this.add.text(W / 2, H - 46, "", f("26px", { color: "#ffe066" })).setOrigin(0.5).setDepth(20);

    const mkBtn = (x, label, cb) => {
      const b = this.add.text(x, 14, label, {
        fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "26px", color: "#ffffff",
        backgroundColor: "#23324acc",
      }).setOrigin(1, 0).setPadding(16, 12, 16, 12).setDepth(22).setInteractive({ useHandCursor: true });
      b.on("pointerdown", cb);
      return b;
    };
    this.muteBtn = mkBtn(W - 106, this.snd.muted ? "🔇" : "🔊", () => {
      this.snd.setMuted(!this.snd.muted);
      this.muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
    });
    this.pauseBtn = mkBtn(W - 24, "⏸", () => this._togglePause());
  }

  _hudHit(p) {
    return p.y < 104 && p.x > W - 250;
  }

  _buildInput() {
    this.input.on("pointerdown", (p) => {
      if (this._hudHit(p)) return;
      this._press();
    });
    this.input.on("pointerup", () => (this.holding = false));
    this.input.keyboard.on("keydown-SPACE", (e) => { if (!e.repeat) this._press(); });
    this.input.keyboard.on("keyup-SPACE", () => (this.holding = false));
    this.input.keyboard.on("keydown-UP", (e) => { if (!e.repeat) this._press(); });
    this.input.keyboard.on("keyup-UP", () => (this.holding = false));
    this.input.keyboard.on("keydown-P", () => this._togglePause());
    this.input.keyboard.on("keydown-ESC", () => this._togglePause());
  }

  _buildTutorial() {
    if (Save.tutorialDone()) return;
    const f = {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "28px",
      color: "#ffffff", fontStyle: "bold", stroke: "#e8622c", strokeThickness: 6,
    };
    const t1 = this.add.text(W / 2, H / 2 - 60, "TAP TO JUMP · HOLD = HIGHER", f).setOrigin(0.5).setDepth(25);
    const t2 = this.add.text(W / 2, H / 2 - 14, "Fruit = energy. Don't run dry! 🍎", { ...f, fontSize: "22px", stroke: "#3a7d2c" })
      .setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t1, scale: 1.08, duration: 460, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.time.delayedCall(6000, () => {
      [t1, t2].forEach((x) => this.tweens.add({ targets: x, alpha: 0, duration: 600, onComplete: () => x.destroy() }));
      Save.setTutorialDone();
    });
  }

  // ------------------------------------------------------------------- input

  _press() {
    if (this.dead) return;
    if (this.paused) { this._togglePause(); return; }
    this.holding = true;
    this._jumpBuffer = 0.12;
  }

  _togglePause() {
    if (this.dead) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.pause();
      this.anims.pauseAll();
      this.snd.stopMusic();
      this.pauseUI = [
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.62).setDepth(30),
        this.add.text(W / 2, H / 2 - 40, "⏸  PAUSED", {
          fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "48px", color: "#ffffff", fontStyle: "bold",
        }).setOrigin(0.5).setDepth(31),
        this.add.text(W / 2, H / 2 + 20, "TAP TO RESUME", {
          fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "20px", color: "#cfe4ff",
        }).setOrigin(0.5).setDepth(31),
      ];
      const menuBtn = this.add.text(W / 2, H / 2 + 100, "MENU", {
        fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "22px", color: "#ffffff",
        fontStyle: "bold", backgroundColor: "#23324a",
      }).setOrigin(0.5).setPadding(26, 12, 26, 12).setDepth(31).setInteractive({ useHandCursor: true });
      menuBtn.on("pointerdown", () => {
        this.dead = true;             // blocks the tap-resume and update
        this.snd.stopMusic();
        this.scene.start("Menu");
      });
      this.pauseUI.push(menuBtn);
    } else {
      this.physics.resume();
      this.anims.resumeAll();
      this.snd.startMusic();
      this.snd.setSolo(this.soloT > 0);
      this.pauseUI.forEach((o) => o.destroy());
    }
  }

  // ----------------------------------------------------------------- spawner

  _roofTexture() {
    return SECTORS[this.sectorIx].roof;
  }

  _spawnPlatform(left, top, width) {
    const t = this.add.tileSprite(left + width / 2, top + PLAT_H / 2, width, PLAT_H, this._roofTexture());
    const src = this.textures.get(this._roofTexture()).getSourceImage();
    const s = PLAT_H / src.height;
    t.setTileScale(s, s);
    t.setDepth(4);
    this.platforms.add(t);
    t.body.setAllowGravity(false);
    t.body.setImmovable(true);
    t.body.setVelocityX(-this._speedNow());
    return t;
  }

  _spawnNext() {
    const width = Phaser.Math.Between(280, 540);
    const gap = Phaser.Math.Between(100, Math.round(120 + this._speedNow() * 0.55));
    const left = this.lastRight + gap;
    const dy = Phaser.Math.Between(-90, 80);
    const top = Phaser.Math.Clamp(this.lastTop + dy, 400, 610);
    this._spawnPlatform(left, top, width);

    const meters = this.dist / 50;

    // Fruit: lines on the roof or arcs over the gap (Adventure Island fuel).
    if (Math.random() < 0.68) {
      const n = Phaser.Math.Between(2, 4);
      const overGap = Math.random() < 0.35 && gap > 150;
      for (let i = 0; i < n; i++) {
        const fx = overGap ? left - gap / 2 - ((n - 1) / 2 - i) * 54 : left + 60 + i * 58;
        const fy = overGap ? this.lastTop - 150 - Math.sin((i / (n - 1 || 1)) * Math.PI) * 40
          : top - 46;
        this._addPickup(fx, fy, ["fruit-apple", "fruit-banana", "fruit-orange", "fruit-melon"][Phaser.Math.Between(0, 3)], "fruit", 44);
      }
    }

    // Animal to rescue, sitting on the roof.
    if (Math.random() < 0.34 && width > 320) {
      this._addPickup(left + width - 90, top - 40,
        ["animal-kitten", "animal-puppy", "animal-chick"][Phaser.Math.Between(0, 2)], "animal", 66);
    }

    // Crate obstacle (hop it!) — from 150 m.
    if (meters > 150 && Math.random() < Math.min(0.5, 0.22 + meters * 0.0004) && width > 340) {
      const c = this.hazards.create(left + width * Phaser.Math.FloatBetween(0.35, 0.7), top - 40, "obstacle-crate");
      c.setDisplaySize(80, 80).setDepth(6);
      c.body.setVelocityX(-this._speedNow());
      c.setData("kind", "crate");
    }

    // Pigeon at jump-arc height — from 350 m.
    if (meters > 350 && Math.random() < 0.3) {
      const p = this.hazards.create(left + width / 2, top - 165, "obstacle-pigeon");
      p.setDisplaySize(72, 56).setDepth(6);
      p.body.setVelocityX(-this._speedNow() * 1.22);
      p.setData("kind", "pigeon");
      this.tweens.add({ targets: p, y: p.y - 16, duration: 420, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    // Power-ups on a distance schedule.
    if (meters >= this._nextSkateAt) {
      this._nextSkateAt += 420;
      this._addPickup(left + width / 2, top - 130, "item-skateboard", "skate", 64);
    }
    if (meters >= this._nextGuitarAt) {
      this._nextGuitarAt += 780;
      this._addPickup(left + width / 2 - 80, top - 140, "item-guitar", "guitar", 72);
    }

    this.lastRight = left + width;
    this.lastTop = top;
  }

  _addPickup(x, y, tex, kind, size) {
    const p = this.pickups.create(x, y, tex);
    const sc = size / p.height;
    p.setScale(sc).setDepth(6);
    p.body.setVelocityX(-this._speedNow());
    p.setData("kind", kind);
    if (kind === "skate" || kind === "guitar") {
      const glow = this.add.image(x, y, "glow").setDepth(5).setScale(1.8).setTint(0xffe066).setAlpha(0.7);
      p.setData("glow", glow);
      this.tweens.add({ targets: glow, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    }
    this.tweens.add({ targets: p, y: y - 10, duration: 620, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    return p;
  }

  // ------------------------------------------------------------------ pickup

  _collect(player, p) {
    if (!p.active) return;
    const kind = p.getData("kind");
    if (kind === "fruit") {
      this.energy = Math.min(100, this.energy + 22);
      this.snd.fruit();
      this._burst(p.x, p.y, 6, 0xffe066);
      this._float(p.x, p.y, "+ENERGY", "#7cd94e");
    } else if (kind === "animal") {
      this.animals += 1;
      this.combo += 1;
      this.comboT = 4;
      this.energy = Math.min(100, this.energy + 6);
      this.snd.animal(this.combo);
      this._burst(p.x, p.y, 10, 0xff8fb0);
      this._float(p.x, p.y, this.combo >= 2 ? `RESCUED! x${this.combo}` : "RESCUED!", "#ffe066");
    } else if (kind === "skate") {
      this.skateT = 9;
      this.snd.skate();
      this._float(p.x, p.y, "SKATEBOARD!", "#3ec8e8");
    } else if (kind === "guitar") {
      this._startSolo();
    }
    const glow = p.getData("glow");
    if (glow) { this.tweens.killTweensOf(glow); glow.destroy(); }
    this.tweens.killTweensOf(p);
    p.destroy();
  }

  _startSolo() {
    this.soloT = 6.5;
    this.snd.soloStart();
    this.snd.setSolo(true);
    this.aura.setAlpha(0.85);
    this.cameras.main.flash(280, 255, 224, 102);
    this._float(this.player.x, this.player.y - 190, "GUITAR SOLO!!", "#ffe066");
    // Freeze-frame rock pose.
    this.player.anims.stop();
    this.player.setTexture("p-cristian-guitar");
    this.time.delayedCall(600, () => { if (!this.dead && this.player.body.blocked.down) this.player.play("run"); });
    // Blast every hazard currently on screen.
    this.hazards.children.iterate((h) => { if (h && h.x < W + 40) this._smash(h, true); });
  }

  // ----------------------------------------------------------------- hazards

  _hitHazard(player, h) {
    if (!h.active) return;
    if (this.skateT > 0 || this.soloT > 0) { this._smash(h, this.soloT > 0); return; }
    if (this.invuln > 0) return;
    // Trip: lose energy + slow down (Adventure Island rock hit), not instant death.
    this.invuln = 1.4;
    this.energy = Math.max(0, this.energy - 16);
    this.combo = 0;
    this.speedPenalty = 1;
    this.snd.trip();
    this.cameras.main.shake(160, 0.008);
    this._hurtT = 0.5;
    this.player.anims.stop();
    this.player.setTexture("p-cristian-hurt");
    this._burst(h.x, h.y, 8, 0xffffff);
    this.tweens.killTweensOf(h);
    h.destroy();
    if (this.energy <= 0) this._die("energy");
  }

  _smash(h, withBolt) {
    if (!h.active) return;
    this._burst(h.x, h.y, 12, withBolt ? 0xffe066 : 0x3ec8e8);
    if (withBolt) {
      const b = this.add.image(h.x, h.y - 30, "bolt").setDepth(23).setScale(1.2);
      this.tweens.add({ targets: b, y: b.y - 40, alpha: 0, duration: 350, onComplete: () => b.destroy() });
    }
    this.snd.trip(); // crunchy impact
    this.tweens.killTweensOf(h);
    h.destroy();
  }

  // ------------------------------------------------------------------ update

  _speedNow() {
    const base = Math.min(640, 300 + this.dist * 0.01);
    const skate = this.skateT > 0 ? 1.38 : 1;
    const pen = 1 - 0.35 * this.speedPenalty;
    return base * skate * pen;
  }

  update(timeNow, dms) {
    if (this.dead || this.paused) return;
    const dt = Math.min(0.05, dms / 1000);

    this.speedPenalty = Math.max(0, this.speedPenalty - dt / 1.2);
    this.speed = this._speedNow();
    this.dist += this.speed * dt;
    const meters = Math.floor(this.dist / 50);

    // Energy drain — the clock that keeps you hungry.
    this.energy -= 4.5 * dt;
    if (this.energy <= 25) {
      this._lowBeepT -= dt;
      if (this._lowBeepT <= 0) { this._lowBeepT = 1.6; this.snd.lowEnergy(); }
    }
    if (this.energy <= 0) { this._die("energy"); return; }

    // Timers.
    if (this.skateT > 0) this.skateT -= dt;
    if (this.soloT > 0) {
      this.soloT -= dt;
      this.aura.setAlpha(0.55 + Math.sin(timeNow / 90) * 0.3);
      if (this.soloT <= 0) { this.snd.setSolo(false); this.aura.setAlpha(0); }
    }
    if (this._hurtT > 0) {
      this._hurtT -= dt;
      if (this._hurtT <= 0 && this.player.body.blocked.down) this.player.play("run");
    }
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    // Keep world scrolling at current speed.
    const vx = -this.speed;
    this.platforms.children.iterate((p) => p && p.body && p.body.setVelocityX(vx));
    this.pickups.children.iterate((p) => {
      if (!p || !p.body) return;
      p.body.setVelocityX(vx);
      const glow = p.getData("glow");
      if (glow) { glow.x = p.x; glow.y = p.y; }
    });
    this.hazards.children.iterate((h) => {
      if (!h || !h.body) return;
      h.body.setVelocityX(h.getData("kind") === "pigeon" ? vx * 1.22 : vx);
    });

    // Guitar-solo magnet.
    if (this.soloT > 0) {
      this.pickups.children.iterate((p) => {
        if (!p || !p.body) return;
        const kind = p.getData("kind");
        if (kind !== "fruit" && kind !== "animal") return;
        const dx = this.player.x - p.x, dy = (this.player.y - 80) - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 300) { p.x += (dx / d) * 560 * dt; p.y += (dy / d) * 560 * dt; }
      });
    }

    // Recycle + refill.
    this.platforms.children.iterate((p) => { if (p && p.x + p.width / 2 < -40) p.destroy(); });
    this.pickups.children.iterate((p) => {
      if (p && p.x < -60) {
        const glow = p.getData("glow");
        if (glow) { this.tweens.killTweensOf(glow); glow.destroy(); }
        this.tweens.killTweensOf(p); p.destroy();
      }
    });
    this.hazards.children.iterate((h) => { if (h && h.x < -60) { this.tweens.killTweensOf(h); h.destroy(); } });
    while (this.lastRight < W + 400) this._spawnNext();

    // Jump: coyote + buffer + variable height (release cuts the rise).
    const grounded = this.player.body.blocked.down || this.player.body.touching.down;
    if (grounded) { this._coyote = 0.1; this._groundY = this.player.body.bottom; }
    else this._coyote = Math.max(0, this._coyote - dt);
    if (grounded && this._wasAir) {
      this.snd.land();
      if (this._hurtT <= 0) this.player.play("run");
      for (let i = 0; i < 4; i++) {
        const d = this.add.image(PLAYER_X + Phaser.Math.Between(-16, 16), this.player.body.bottom, "dust")
          .setDepth(5).setAlpha(0.8).setScale(Phaser.Math.FloatBetween(0.5, 1.1));
        this.tweens.add({ targets: d, x: d.x - 30, y: d.y - Phaser.Math.Between(4, 16), alpha: 0, duration: 360, onComplete: () => d.destroy() });
      }
    }
    this._wasAir = !grounded;
    if (this._jumpBuffer > 0) this._jumpBuffer -= dt;
    if (this._jumpBuffer > 0 && this._coyote > 0) {
      this.player.body.velocity.y = JUMP;
      this._jumpBuffer = 0;
      this._coyote = 0;
      this.snd.jump();
    }
    if (!this.holding && this.player.body.velocity.y < -320) this.player.body.velocity.y = -320;

    // Textures per state.
    if (!grounded && this._hurtT <= 0 && this.soloT <= 0) {
      this.player.anims.stop();
      this.player.setTexture("p-cristian-jump");
    } else if (grounded && this.skateT > 0 && this._hurtT <= 0) {
      this.player.anims.stop();
      this.player.setTexture("p-cristian-skate");
    } else if (grounded && this._hurtT <= 0 && !this.player.anims.isPlaying) {
      this.player.play("run");
    }
    // Legs pump faster as the world speeds up.
    if (this.player.anims.isPlaying) this.player.anims.timeScale = 0.8 + this.speed / 500;

    this.player.x = PLAYER_X;
    this.player.body.velocity.x = 0;

    // Invulnerability blink.
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.player.setAlpha(Math.sin(timeNow / 45) > 0 ? 1 : 0.35);
    } else this.player.setAlpha(1);

    // Contact shadow + aura follow.
    const airH = Phaser.Math.Clamp(this._groundY - this.player.body.bottom, 0, 320);
    this.shadow.setPosition(PLAYER_X, this._groundY - 2);
    this.shadow.setScale(Phaser.Math.Clamp(1 - airH / 400, 0.35, 1));
    this.shadow.setAlpha(Phaser.Math.Clamp(0.28 - airH / 1500, 0.06, 0.28));
    this.aura.setPosition(this.player.x, this.player.y - 84);

    // Parallax background.
    const bgv = this.speed * 0.14 * dt;
    this.bgA.x -= bgv; this.bgB.x -= bgv;
    if (this.bgA.x + this.bgW < 0) this.bgA.x = this.bgB.x + this.bgW;
    if (this.bgB.x + this.bgW < 0) this.bgB.x = this.bgA.x + this.bgW;
    this.clouds.forEach((c) => {
      c.x -= this.speed * 0.05 * dt;
      if (c.x < -80) { c.x = W + 80; c.y = Phaser.Math.Between(40, 260); }
    });

    // Sector change.
    const next = [...SECTORS].reverse().find((s) => meters >= s.at);
    const ix = SECTORS.indexOf(next);
    if (ix !== this.sectorIx) {
      this.sectorIx = ix;
      this._swapBackground(SECTORS[ix]);
      this._banner(SECTORS[ix].name);
      this.snd.skate();
    }

    // HUD.
    this.hudDist.setText(`${meters} m`);
    this.hudAnimals.setText(`🐾 ${this.animals}`);
    this.hudCombo.setText(this.combo >= 2 ? `COMBO x${this.combo}` : "");
    this.energyFill.width = 2.2 * Math.max(0, this.energy);
    this.energyFill.fillColor = this.energy > 45 ? 0x7cd94e : this.energy > 22 ? 0xffe066 : 0xff5e5e;
    if (this.soloT > 0) this.hudPower.setText(`🎸 GUITAR SOLO ${this.soloT.toFixed(1)}s`);
    else if (this.skateT > 0) this.hudPower.setText(`🛹 ${this.skateT.toFixed(1)}s`);
    else this.hudPower.setText("");

    // Fell off the roofs.
    if (this.player.y > H + 80) this._die("fall");
  }

  // ------------------------------------------------------------------- misc

  _float(x, y, msg, color) {
    const tx = this.add.text(x, y - 30, msg, {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "24px",
      color, fontStyle: "bold", stroke: "#23324a", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(24);
    this.tweens.add({ targets: tx, y: tx.y - 46, alpha: 0, duration: 750, onComplete: () => tx.destroy() });
  }

  _banner(msg) {
    const tx = this.add.text(W / 2, 170, msg, {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "58px",
      color: "#ffffff", fontStyle: "bold", stroke: "#23324a", strokeThickness: 8,
    }).setOrigin(0.5).setDepth(24).setAlpha(0).setScale(0.7);
    this.tweens.add({ targets: tx, alpha: 1, scale: 1, duration: 280, ease: "Back.out" });
    this.tweens.add({ targets: tx, alpha: 0, delay: 1400, duration: 500, onComplete: () => tx.destroy() });
  }

  _burst(x, y, n, tint) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, "spark").setDepth(23).setTint(tint);
      const a = Math.random() * Math.PI * 2, d = 22 + Math.random() * 46;
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.2,
        duration: 380 + Math.random() * 240, onComplete: () => p.destroy(),
      });
    }
  }

  _die(reason) {
    if (this.dead) return;
    this.dead = true;
    this.snd.stopMusic();
    this.snd.gameOver();
    this.physics.pause();
    this.player.anims.stop();
    this.player.setTexture("p-cristian-hurt");
    this.aura.setAlpha(0);
    this.cameras.main.shake(240, 0.012);
    const meters = Math.floor(this.dist / 50);
    this.time.delayedCall(850, () =>
      this.scene.start("GameOver", { meters, animals: this.animals, reason })
    );
  }
}
