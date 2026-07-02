// Menú: título con efecto glitch, récord + bits, JUGAR / TIENDA, cómo jugar,
// selector de idioma y mute. Un clic te pone a jugar (time-to-fun < 10s).

import { W, H, RAIL_COLORS, SECTORS } from "../const.js";
import { t, getLang, toggleLang } from "../i18n.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { skinById } from "../items.js";

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

    // Título con "fantasmas" cromáticos (cian/magenta) que tiemblan.
    const mkTitle = (dx, dy, color, alpha, depth) =>
      this.add.text(W / 2 + dx, 150 + dy, t("title"), f("84px", {
        color, fontFamily: "'Consolas', 'Courier New', monospace",
      })).setOrigin(0.5).setAlpha(alpha).setDepth(depth);
    const gCyan = mkTitle(-4, -3, "#27e7ff", 0.7, 4);
    const gMag = mkTitle(4, 3, "#ff3ea5", 0.7, 4);
    mkTitle(0, 0, "#ffffff", 1, 5);
    this.time.addEvent({
      delay: 90, loop: true, callback: () => {
        const j = () => Phaser.Math.Between(-5, 5);
        gCyan.setPosition(W / 2 - 4 + j(), 147 + j() * 0.4);
        gMag.setPosition(W / 2 + 4 + j(), 153 + j() * 0.4);
      },
    });

    this.add.text(W / 2, 232, t("tagline"), f("22px", {
      color: "#9fb4ff", align: "center", fontStyle: "normal",
    })).setOrigin(0.5);

    // Demo del orbe saltando entre dos mini-raíles.
    this._buildDemo();

    // Récord y bits.
    this.add.text(W / 2 - 90, 332, `🏆 ${t("best")}: ${Save.best()} ${t("meters")}`, f("20px")).setOrigin(0.5);
    this.add.image(W / 2 + 60, 332, "bit").setTint(0xffd94e).setScale(1.1);
    this.add.text(W / 2 + 76, 332, `${Save.bits()}`, f("20px", { color: "#ffd94e" })).setOrigin(0, 0.5);

    // Botón JUGAR.
    const play = this.add.text(W / 2, 430, "▶  " + t("play"), f("36px", {
      backgroundColor: "#27e7ff", color: "#04101a",
    })).setOrigin(0.5).setPadding(46, 16, 46, 16).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: play, scale: 1.05, duration: 550, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    play.on("pointerdown", () => { this.snd.ui(); this.scene.start("Game"); });

    // Botón TIENDA.
    const shop = this.add.text(W / 2, 512, "◆  " + t("shop"), f("22px", {
      backgroundColor: "#2a1846", color: "#ffd94e",
    })).setOrigin(0.5).setPadding(30, 10, 30, 10).setInteractive({ useHandCursor: true });
    shop.on("pointerdown", () => { this.snd.ui(); this.scene.start("Shop"); });

    // Cómo jugar (3 líneas).
    [t("howto1"), t("howto2"), t("howto3")].forEach((line, i) => {
      this.add.text(W / 2, 590 + i * 30, line, f("18px", {
        color: i === 0 ? "#27e7ff" : i === 1 ? "#ff3ea5" : "#9fb4ff", fontStyle: "normal",
      })).setOrigin(0.5);
    });

    // Teclado: espacio/enter = jugar.
    this.input.keyboard.on("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard.on("keydown-ENTER", () => this.scene.start("Game"));

    // Idioma (arriba derecha) y mute.
    const lang = this.add.text(W - 24, 20, getLang().toUpperCase(), f("18px", {
      backgroundColor: "#1a2a4a",
    })).setOrigin(1, 0).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    lang.on("pointerdown", () => { toggleLang(); this.snd.ui(); this.scene.restart(); });

    this._muteBtn = this.add.text(W - 96, 20, this.snd.muted ? "🔇" : "🔊", f("18px", {
      backgroundColor: "#1a2a4a",
    })).setOrigin(1, 0).setPadding(12, 8, 12, 8).setInteractive({ useHandCursor: true });
    this._muteBtn.on("pointerdown", () => {
      this.snd.setMuted(!this.snd.muted);
      this._muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
      this.snd.ui();
    });
  }

  // Orbe de demo que alterna entre dos raíles cortos, con la skin equipada.
  _buildDemo() {
    const y0 = 292, y1 = 316, x0 = W / 2 - 70, x1 = W / 2 + 70;
    this.add.rectangle(W / 2, y0, 140, 3, RAIL_COLORS[0], 0.8);
    this.add.rectangle(W / 2, y1, 140, 3, RAIL_COLORS[1], 0.8);
    const skin = skinById(Save.skin());
    const orb = this.add.image(x0, y0, skin.tex).setScale(0.55)
      .setTint(skin.color === 0xffffff ? RAIL_COLORS[0] : skin.color);
    let onTop = true;
    this.time.addEvent({
      delay: 900, loop: true, callback: () => {
        onTop = !onTop;
        this.tweens.add({ targets: orb, y: onTop ? y0 : y1, duration: 110, ease: "Quad.out" });
        if (skin.color === 0xffffff) orb.setTint(RAIL_COLORS[onTop ? 0 : 1]);
      },
    });
    this.tweens.add({ targets: orb, x: x1, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  _buildBackground() {
    const pal = SECTORS[0];
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(pal.top, pal.top, pal.bottom, pal.bottom, 1);
    g.fillRect(0, 0, W, H);
    this.add.tileSprite(W / 2, H / 2, W, H, "grid").setTint(pal.grid).setAlpha(0.25).setDepth(1);
    // Partículas flotantes.
    for (let i = 0; i < 14; i++) {
      const p = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), "spark")
        .setDepth(1).setAlpha(Phaser.Math.FloatBetween(0.08, 0.3))
        .setTint(i % 2 ? 0x27e7ff : 0xff3ea5).setScale(Phaser.Math.FloatBetween(0.4, 1));
      this.tweens.add({
        targets: p, y: p.y - Phaser.Math.Between(30, 90), duration: Phaser.Math.Between(3000, 7000),
        yoyo: true, repeat: -1, ease: "Sine.inOut",
      });
    }
  }
}
