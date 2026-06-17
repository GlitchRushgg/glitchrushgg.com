// Núcleo de Glitch Rush.
// Aparecen objetos glitcheados con un anillo de tiempo; al tocarlos, Flofy salta y
// los purifica (+1, combo, chispa). Si uno se agota, pierdes un corazón. Al llenar
// las chispas, tocas a Flofy para el ABRAZO TOTAL (purifica todo). La familia aparece
// como power-up (mamá cura, Norman escuda, Cristian limpia los de arriba).

import { W, H } from "../main.js";
import { t } from "../i18n.js";
import { Sound } from "../utils/Sound.js";

const PLAY = { xMin: 44, xMax: W - 44, yMin: 120, yMax: 690 };
const MEGA_MAX = 12; // chispas para el Abrazo Total
const COMBO_WINDOW = 1600; // ms para mantener combo
const GLITCH_EMOJIS = ["📬", "💡", "🗑️", "🚲", "🌳", "🚦", "📦", "🪧", "🛹", "⛲"];
const FAMILY = ["mama", "papa", "cristian"];

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.sound2 = new Sound();
    this._glitches = [];
    this._powerups = [];
    this._score = 0;
    this._lives = 3;
    this._combo = 0;
    this._comboTimer = 0;
    this._sparks = 0;
    this._megaReady = false;
    this._shield = false;
    this._elapsed = 0;
    this._spawnAcc = 0;
    this._over = false;

    this._buildBackground();
    this._buildFlofy();
    this._buildHUD();

    // Pequeña espera antes del primer spawn.
    this._spawnAcc = -600;
  }

  // ---------- Fondo ----------
  _buildBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x9be0ff, 0x9be0ff, 0xd8b6f0, 0xd8b6f0, 1);
    g.fillRect(0, 0, W, H);
    // Acera + suelo.
    g.fillStyle(0x8ad36b, 1);
    g.fillRect(0, H - 120, W, 120);
    g.fillStyle(0xc9c4cf, 1);
    g.fillRect(0, H - 120, W, 26);
    // Casitas de fondo (decorativas).
    const colors = [0xffd1a8, 0xffb3c8, 0xc8e0ff, 0xfff3a8];
    for (let i = 0; i < 4; i++) {
      const x = 20 + i * 95;
      g.fillStyle(colors[i], 1);
      g.fillRect(x, H - 200, 70, 90);
      g.fillStyle(0xb14bd8, 1);
      g.fillTriangle(x - 6, H - 200, x + 35, H - 240, x + 76, H - 200);
    }
    // Capa de flash para daño (oculta).
    this._flash = this.add.rectangle(W / 2, H / 2, W, H, 0xff2a55, 0).setDepth(60);

    // Partículas de confeti reutilizables.
    this._confetti = this.add.particles(0, 0, "confetti", {
      lifespan: 700,
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      gravityY: 420,
      emitting: false,
      tint: [0xff5ea0, 0xb14bd8, 0xffe27a, 0x6cd0ff, 0x8ad36b],
    });
    this._confetti.setDepth(40);
  }

  // ---------- Flofy (mascota / botón de Abrazo Total) ----------
  _buildFlofy() {
    this._flofy = this.add.image(W / 2, H - 66, "flofy").setDepth(30);
    this._flofy.setScale(110 / this._flofy.height);
    this._flofyHome = { x: W / 2, y: H - 66 };
    this._flofy.setInteractive({ useHandCursor: true });
    this._flofy.on("pointerdown", () => this._tryMega());

    // Latido suave.
    this.tweens.add({
      targets: this._flofy,
      scaleX: this._flofy.scaleX * 1.04,
      scaleY: this._flofy.scaleY * 0.96,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  // ---------- HUD ----------
  _buildHUD() {
    const f = (size, extra = {}) => ({
      fontFamily: "Fredoka, system-ui, sans-serif",
      fontSize: size,
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#7a2ea0",
      strokeThickness: 4,
      ...extra,
    });

    this._heartsText = this.add.text(14, 12, "❤️❤️❤️", { fontSize: "22px" }).setDepth(50);
    this._scoreText = this.add.text(W / 2, 16, "0", f("30px")).setOrigin(0.5, 0).setDepth(50);
    this._comboText = this.add
      .text(W / 2, 52, "", f("16px", { color: "#ffe27a" }))
      .setOrigin(0.5, 0)
      .setDepth(50);

    // Barra de chispas (encima de Flofy).
    const barW = 180;
    this._barX = W / 2 - barW / 2;
    this._barY = H - 132;
    this._barW = barW;
    this.add
      .text(W / 2, this._barY - 16, "✨ " + t("sparks"), f("13px"))
      .setOrigin(0.5)
      .setDepth(50);
    this.add
      .rectangle(W / 2, this._barY, barW, 16, 0x3a2a4a, 0.55)
      .setOrigin(0.5)
      .setDepth(49);
    this._sparkBar = this.add
      .rectangle(this._barX, this._barY, 0, 16, 0xffe27a)
      .setOrigin(0, 0.5)
      .setDepth(50);

    // Aviso de mensajes flotantes (power-ups, mega).
    this._toast = this.add
      .text(W / 2, 90, "", f("18px", { color: "#ffffff", backgroundColor: "#e84aa0" }))
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setDepth(55)
      .setAlpha(0);
  }

  _toastMsg(msg, color = "#e84aa0") {
    this._toast.setText(msg).setBackgroundColor(color).setAlpha(1).setScale(0.8);
    this.tweens.killTweensOf(this._toast);
    this.tweens.add({ targets: this._toast, scale: 1, duration: 180, ease: "Back.out" });
    this.tweens.add({ targets: this._toast, alpha: 0, delay: 900, duration: 350 });
  }

  // ---------- Dificultad (escala con el tiempo) ----------
  _diff() {
    const s = this._elapsed / 1000;
    return {
      spawnEvery: Math.max(480, 1150 - s * 9), // ms entre apariciones
      life: Math.max(1150, 2600 - s * 16), // ms de vida de cada glitch
      maxOnScreen: Math.min(6, 3 + Math.floor(s / 25)),
    };
  }

  // ---------- Bucle ----------
  update(_time, delta) {
    if (this._over) return;
    this._elapsed += delta;
    const d = this._diff();

    // Combo decae.
    if (this._combo > 0) {
      this._comboTimer -= delta;
      if (this._comboTimer <= 0) {
        this._combo = 0;
        this._comboText.setText("");
      }
    }

    // Spawns.
    this._spawnAcc += delta;
    if (this._spawnAcc >= d.spawnEvery && this._glitches.length < d.maxOnScreen) {
      this._spawnAcc = 0;
      // ~1 de cada 9 apariciones es un power-up de la familia.
      if (Math.random() < 0.11) this._spawnPowerup();
      else this._spawnGlitch(d.life);
    }

    // Actualiza glitches (anillo + jitter + caducidad).
    for (let i = this._glitches.length - 1; i >= 0; i--) {
      const gl = this._glitches[i];
      if (gl.dead) continue;
      gl.life -= delta;
      // Jitter glitchy.
      gl.emoji.x = (Math.random() - 0.5) * 3;
      gl.emoji.y = (Math.random() - 0.5) * 3;
      gl.bg.fillColor = Math.random() < 0.5 ? 0xb14bd8 : 0xe84aa0;
      // Anillo de tiempo.
      const frac = Phaser.Math.Clamp(gl.life / gl.maxLife, 0, 1);
      gl.ring.clear();
      gl.ring.lineStyle(5, frac > 0.35 ? 0xffffff : 0xff3b3b, 1);
      gl.ring.beginPath();
      gl.ring.arc(0, 0, 34, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
      gl.ring.strokePath();
      if (gl.life <= 0) this._glitchEscaped(gl);
    }

    // Power-ups caducan sin penalización.
    for (let i = this._powerups.length - 1; i >= 0; i--) {
      const p = this._powerups[i];
      p.life -= delta;
      if (p.life <= 0) this._removePowerup(p);
    }

    // Barra de chispas.
    this._sparkBar.width = (this._sparks / MEGA_MAX) * this._barW;
    if (this._megaReady) this._sparkBar.fillColor = 0xff5ea0;
  }

  // ---------- Glitches ----------
  _spawnGlitch(life) {
    const x = Phaser.Math.Between(PLAY.xMin, PLAY.xMax);
    const y = Phaser.Math.Between(PLAY.yMin, PLAY.yMax);
    const c = this.add.container(x, y).setDepth(20);

    const bg = this.add.circle(0, 0, 32, 0xb14bd8, 0.9).setStrokeStyle(3, 0xffffff);
    const emoji = this.add
      .text(0, 0, Phaser.Utils.Array.GetRandom(GLITCH_EMOJIS), { fontSize: "34px" })
      .setOrigin(0.5);
    const ring = this.add.graphics();
    c.add([bg, emoji, ring]);

    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 160, ease: "Back.out" });

    c.setInteractive(new Phaser.Geom.Circle(0, 0, 38), Phaser.Geom.Circle.Contains);
    const gl = { c, bg, emoji, ring, x, y, life, maxLife: life, dead: false, high: y < 360 };
    c.on("pointerdown", () => this._purify(gl));
    this._glitches.push(gl);
    this.sound2.glitchSpawn();
  }

  _purify(gl, silent = false) {
    if (gl.dead || this._over) return;
    gl.dead = true;
    Phaser.Utils.Array.Remove(this._glitches, gl);

    // Combo.
    this._combo += 1;
    this._comboTimer = COMBO_WINDOW;
    if (this._combo >= 2) this._comboText.setText(`${t("combo")} x${this._combo}`);

    // Puntos (+combo en bonus visual, score = 1 por glitch).
    this._score += 1;
    this._scoreText.setText(String(this._score));
    this._popScore(gl.x, gl.y);

    // Chispas.
    this._addSpark();

    // Flofy salta a abrazar.
    if (!silent) this._flofyHugAt(gl.x, gl.y);
    this._confetti.emitParticleAt(gl.x, gl.y, 14);
    if (!silent) this.sound2.purify(this._combo);

    // Salida del glitch.
    this.tweens.add({
      targets: gl.c,
      scale: 1.4,
      alpha: 0,
      duration: 160,
      onComplete: () => gl.c.destroy(),
    });
  }

  _glitchEscaped(gl) {
    gl.dead = true;
    Phaser.Utils.Array.Remove(this._glitches, gl);
    gl.c.destroy();
    this._combo = 0;
    this._comboText.setText("");

    if (this._shield) {
      this._shield = false;
      this._toastMsg("🛡️", "#3aa0e8");
      this.sound2.powerup();
      return;
    }
    this._loseLife();
  }

  _loseLife() {
    this._lives -= 1;
    this._heartsText.setText("❤️".repeat(Math.max(0, this._lives)));
    this.sound2.hurt();
    this.cameras.main.shake(160, 0.012);
    this._flash.setAlpha(0.5);
    this.tweens.add({ targets: this._flash, alpha: 0, duration: 300 });
    if (this._lives <= 0) this._gameOver();
  }

  // ---------- Chispas / Abrazo Total ----------
  _addSpark() {
    if (this._megaReady) return;
    this._sparks = Math.min(MEGA_MAX, this._sparks + 1);
    if (this._sparks >= MEGA_MAX) {
      this._megaReady = true;
      this._toastMsg(t("megaReady"), "#ff5ea0");
      this.tweens.add({
        targets: this._flofy,
        scale: this._flofy.scaleX * 1.15,
        duration: 300,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  _tryMega() {
    if (!this._megaReady || this._over) return;
    this._megaReady = false;
    this._sparks = 0;
    this._sparkBar.fillColor = 0xffe27a;
    this.tweens.killTweensOf(this._flofy);
    this._flofy.setScale(110 / this._flofy.height);
    this._toastMsg(t("megaHug"), "#b14bd8");
    this.sound2.mega();
    this.cameras.main.flash(220, 255, 230, 160);
    // Purifica todos los glitches activos.
    [...this._glitches].forEach((gl, i) => {
      this.time.delayedCall(i * 60, () => this._purify(gl, true));
    });
    this._confetti.emitParticleAt(W / 2, H / 2, 40);
  }

  // ---------- Power-ups de la familia ----------
  _spawnPowerup() {
    const key = Phaser.Utils.Array.GetRandom(FAMILY);
    const x = Phaser.Math.Between(PLAY.xMin, PLAY.xMax);
    const y = Phaser.Math.Between(PLAY.yMin, PLAY.yMax - 40);
    const img = this.add.image(x, y, key).setDepth(25);
    img.setScale(96 / img.height);
    const halo = this.add.circle(x, y, 50, 0xffe27a, 0.35).setDepth(24);
    this.tweens.add({ targets: halo, scale: 1.2, alpha: 0.15, duration: 600, yoyo: true, repeat: -1 });

    const p = { img, halo, key, life: 2600 };
    img.setInteractive({ useHandCursor: true });
    img.on("pointerdown", () => {
      this._applyPowerup(key, x, y);
      this._removePowerup(p);
    });
    this._powerups.push(p);
  }

  _applyPowerup(key, x, y) {
    this.sound2.powerup();
    this._confetti.emitParticleAt(x, y, 20);
    if (key === "mama") {
      this._lives = Math.min(3, this._lives + 1);
      this._heartsText.setText("❤️".repeat(this._lives));
      this._toastMsg(t("puMama"), "#e84aa0");
    } else if (key === "papa") {
      this._shield = true;
      this._toastMsg(t("puPapa"), "#3aa0e8");
    } else {
      // Cristian: purifica los glitches "altos" (parte de arriba).
      this._toastMsg(t("puCristian"), "#7a2ea0");
      [...this._glitches].filter((g) => g.high).forEach((g, i) =>
        this.time.delayedCall(i * 80, () => this._purify(g, true))
      );
    }
  }

  _removePowerup(p) {
    Phaser.Utils.Array.Remove(this._powerups, p);
    p.img.destroy();
    p.halo.destroy();
  }

  // ---------- Animaciones ----------
  _flofyHugAt(x, y) {
    this._flofy.setTexture("flofy-jump");
    this.tweens.killTweensOf(this._flofy);
    this.tweens.add({
      targets: this._flofy,
      x,
      y,
      duration: 130,
      ease: "Quad.out",
      yoyo: true,
      hold: 40,
      onYoyo: () => {},
      onComplete: () => {
        this._flofy.setTexture("flofy");
        this._flofy.x = this._flofyHome.x;
        this._flofy.y = this._flofyHome.y;
        this._flofy.setScale(110 / this._flofy.height);
      },
    });
  }

  _popScore(x, y) {
    const txt = this.add
      .text(x, y - 20, "+1", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#7a2ea0",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(45);
    this.tweens.add({
      targets: txt,
      y: y - 60,
      alpha: 0,
      duration: 600,
      onComplete: () => txt.destroy(),
    });
  }

  // ---------- Fin ----------
  _gameOver() {
    this._over = true;
    this.sound2.gameOver();
    // Limpia glitches activos.
    this._glitches.forEach((g) => g.c.destroy());
    this._glitches = [];
    this.time.delayedCall(700, () =>
      this.scene.start("GameOver", { score: this._score })
    );
  }
}
