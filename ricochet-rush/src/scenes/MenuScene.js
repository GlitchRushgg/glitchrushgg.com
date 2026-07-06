// Menú: título, demo de balas rebotando, récord + monedas, JUGAR / MEJORAS,
// cómo jugar, idioma y mute. Un clic te pone a jugar.

import { W, H, PAL } from "../const.js";
import { t, getLang, toggleLang } from "../i18n.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    this.snd = new Sound();
    this._buildBackground();

    const f = (size, extra = {}) => ({
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: size, color: "#ffffff", fontStyle: "bold", ...extra,
    });

    // Título con eco cálido.
    this.add.text(W / 2 + 3, 133, t("title"), f("78px", {
      color: "#ff5e2a", fontFamily: "'Consolas', monospace",
    })).setOrigin(0.5).setAlpha(0.55);
    this.add.text(W / 2, 130, t("title"), f("78px", {
      color: "#ffc93e", fontFamily: "'Consolas', monospace",
    })).setOrigin(0.5);

    this.add.text(W / 2, 205, t("tagline"), f("21px", {
      color: "#e8cfa0", align: "center", fontStyle: "normal",
    })).setOrigin(0.5);

    // Récord y monedas.
    const best = Save.best();
    const bm = Math.floor(best / 60), bs = best % 60;
    this.add.text(W / 2 - 90, 268, `🏆 ${t("best")}: ${bm}:${String(bs).padStart(2, "0")}`, f("20px")).setOrigin(0.5);
    this.add.image(W / 2 + 62, 268, "coin").setTint(PAL.coin).setScale(1.1);
    this.add.text(W / 2 + 78, 268, `${Save.coins()}`, f("20px", { color: "#ffd94e" })).setOrigin(0, 0.5);

    // JUGAR.
    const play = this.add.text(W / 2, 400, "▶  " + t("play"), f("36px", {
      backgroundColor: "#ffc93e", color: "#241505",
    })).setOrigin(0.5).setPadding(46, 16, 46, 16).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: play, scale: 1.05, duration: 550, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    play.on("pointerdown", () => { this.snd.ui(); this.scene.start("Game"); });

    // MEJORAS (tienda de perks).
    const shop = this.add.text(W / 2, 486, "⬆  " + t("shop"), f("22px", {
      backgroundColor: "#2a1f10", color: "#ffd94e",
    })).setOrigin(0.5).setPadding(30, 10, 30, 10).setInteractive({ useHandCursor: true });
    shop.on("pointerdown", () => { this.snd.ui(); this.scene.start("Shop"); });

    // Cómo jugar.
    [t("howtoMove"), t("howtoShoot"), t("howtoXP")].forEach((line, i) => {
      this.add.text(W / 2, 570 + i * 30, line, f("18px", {
        color: i === 0 ? "#ffc93e" : i === 1 ? "#ffe89a" : "#7cff5e", fontStyle: "normal",
      })).setOrigin(0.5);
    });

    this.input.keyboard.on("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard.on("keydown-ENTER", () => this.scene.start("Game"));

    // Idioma y mute.
    const lang = this.add.text(W - 24, 20, getLang().toUpperCase(), f("18px", {
      backgroundColor: "#2a1f10",
    })).setOrigin(1, 0).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    lang.on("pointerdown", () => { toggleLang(); this.snd.ui(); this.scene.restart(); });

    this._muteBtn = this.add.text(W - 96, 20, this.snd.muted ? "🔇" : "🔊", f("18px", {
      backgroundColor: "#2a1f10",
    })).setOrigin(1, 0).setPadding(12, 8, 12, 8).setInteractive({ useHandCursor: true });
    this._muteBtn.on("pointerdown", () => {
      this.snd.setMuted(!this.snd.muted);
      this._muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
      this.snd.ui();
    });

    // Volver a glitchrushgg.com — solo en la web propia (no en iframe/CrazyGames).
    if (window.self === window.top) {
      const home = this.add.text(24, 20, "🏠", f("18px", { backgroundColor: "#2a1f10" }))
        .setOrigin(0, 0).setPadding(12, 8, 12, 8).setInteractive({ useHandCursor: true });
      home.on("pointerdown", () => { window.location.href = "/"; });
    }
  }

  // Fondo + demo: balas rebotando dentro de un marco pequeño.
  _buildBackground() {
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(PAL.bgTop, PAL.bgTop, PAL.bgBottom, PAL.bgBottom, 1);
    g.fillRect(0, 0, W, H);
    this.add.tileSprite(W / 2, H / 2, W, H, "grid").setTint(PAL.grid).setAlpha(0.2).setDepth(1);

    // Mini-arena de demo (entre el récord y PLAY; balas que rebotan solas).
    const bx = W / 2, by = 326, bw = 360, bh = 58;
    const frame = this.add.graphics().setDepth(2);
    frame.lineStyle(2, PAL.player, 0.5);
    frame.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);
    this._demo = [];
    for (let i = 0; i < 3; i++) {
      const spr = this.add.image(bx + Phaser.Math.Between(-100, 100), by, "bullet")
        .setDepth(3).setTint(PAL.bullet);
      this._demo.push({
        spr, x: spr.x, y: spr.y,
        vx: Phaser.Math.Between(120, 220) * (Math.random() < 0.5 ? -1 : 1),
        vy: Phaser.Math.Between(60, 120) * (Math.random() < 0.5 ? -1 : 1),
        L: bx - bw / 2 + 7, R: bx + bw / 2 - 7, T: by - bh / 2 + 7, B: by + bh / 2 - 7,
      });
    }
  }

  update(timeNow, dms) {
    const dt = Math.min(0.05, dms / 1000);
    for (const b of this._demo) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < b.L) { b.x = b.L; b.vx = Math.abs(b.vx); }
      else if (b.x > b.R) { b.x = b.R; b.vx = -Math.abs(b.vx); }
      if (b.y < b.T) { b.y = b.T; b.vy = Math.abs(b.vy); }
      else if (b.y > b.B) { b.y = b.B; b.vy = -Math.abs(b.vy); }
      b.spr.setPosition(b.x, b.y);
    }
  }
}
