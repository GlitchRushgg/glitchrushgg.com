// Menú principal: título, key art del dúo, récord, cómo jugar, selector de idioma.

import { W, H } from "../main.js";
import { t, getLang, toggleLang } from "../i18n.js";
import { getBest } from "../utils/Scores.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    this._buildBackground();

    // Key art del dúo, recortado en círculo no — solo escalado.
    const duo = this.add.image(W / 2, 250, "duo").setOrigin(0.5);
    const scale = Math.min(330 / duo.width, 240 / duo.height);
    duo.setScale(scale);

    // Título.
    this.add
      .text(W / 2, 430, "Elizabeth & Flofy", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "34px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#b14bd8",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 468, t("subtitle"), {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "26px",
        color: "#ffe27a",
        fontStyle: "bold",
        stroke: "#7a2ea0",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 502, t("tagline"), {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "15px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 320 },
      })
      .setOrigin(0.5);

    // Récord.
    this.add
      .text(W / 2, 540, `🏆 ${t("best")}: ${getBest()}`, {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Cómo jugar.
    const how = [t("howto1"), t("howto2"), t("howto3")];
    how.forEach((line, i) => {
      this.add
        .text(W / 2, 590 + i * 26, line, {
          fontFamily: "Fredoka, system-ui, sans-serif",
          fontSize: "14px",
          color: "#3a2a4a",
        })
        .setOrigin(0.5);
    });

    // Botón TOCA PARA JUGAR (pulsa).
    const btn = this.add
      .text(W / 2, 720, t("tapToPlay"), {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#e84aa0",
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: btn,
      scale: 1.06,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    btn.on("pointerdown", () => this.scene.start("Game"));

    // Selector de idioma (esquina superior derecha).
    this._langBtn = this.add
      .text(W - 14, 16, getLang().toUpperCase(), {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#7a2ea0",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this._langBtn.on("pointerdown", () => {
      toggleLang();
      this.scene.restart();
    });
  }

  _buildBackground() {
    // Cielo degradado dibujado a mano + suelo.
    const g = this.add.graphics();
    g.fillGradientStyle(0x9be0ff, 0x9be0ff, 0xd8b6f0, 0xd8b6f0, 1);
    g.fillRect(0, 0, W, H);
    // Suelo.
    g.fillStyle(0x8ad36b, 1);
    g.fillRect(0, H - 90, W, 90);
    g.fillStyle(0x6cbb50, 1);
    g.fillRect(0, H - 90, W, 10);
  }
}
