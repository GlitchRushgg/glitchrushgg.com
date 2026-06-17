// Pantalla de fin: resultado, récord, compartir y reintentar.

import { W, H } from "../main.js";
import { t } from "../i18n.js";
import { getBest, saveScore } from "../utils/Scores.js";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  init(data) {
    this._score = (data && data.score) || 0;
  }

  create() {
    const isRecord = saveScore(this._score);

    // Fondo.
    const g = this.add.graphics();
    g.fillGradientStyle(0x9be0ff, 0x9be0ff, 0xd8b6f0, 0xd8b6f0, 1);
    g.fillRect(0, 0, W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x2a1840, 0.45);

    const f = (size, extra = {}) => ({
      fontFamily: "Fredoka, system-ui, sans-serif",
      fontSize: size,
      color: "#ffffff",
      fontStyle: "bold",
      ...extra,
    });

    this.add.text(W / 2, 150, t("gameOver"), f("30px", { stroke: "#b14bd8", strokeThickness: 6 })).setOrigin(0.5);

    // Flofy ofendido / tierno.
    const flofy = this.add.image(W / 2, 280, "flofy").setOrigin(0.5);
    flofy.setScale(150 / flofy.height);
    this.tweens.add({ targets: flofy, angle: -4, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    this.add.text(W / 2, 400, t("glitchesPurified"), f("16px")).setOrigin(0.5);
    this.add
      .text(W / 2, 440, String(this._score), f("56px", { color: "#ffe27a", stroke: "#7a2ea0", strokeThickness: 7 }))
      .setOrigin(0.5);

    if (isRecord) {
      const rec = this.add.text(W / 2, 500, "🏆 " + t("newRecord"), f("20px", { color: "#ffe27a" })).setOrigin(0.5);
      this.tweens.add({ targets: rec, scale: 1.1, duration: 500, yoyo: true, repeat: -1 });
    } else {
      this.add.text(W / 2, 500, `🏆 ${t("best")}: ${getBest()}`, f("18px")).setOrigin(0.5);
    }

    // Botón reintentar.
    const again = this.add
      .text(W / 2, 600, t("playAgain"), f("24px", { backgroundColor: "#e84aa0" }))
      .setOrigin(0.5)
      .setPadding(26, 14, 26, 14)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: again, scale: 1.05, duration: 600, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    again.on("pointerdown", () => this.scene.start("Game"));

    // Botón compartir.
    const share = this.add
      .text(W / 2, 670, "🔗 " + t("tapShare"), f("18px", { backgroundColor: "#7a2ea0" }))
      .setOrigin(0.5)
      .setPadding(20, 10, 20, 10)
      .setInteractive({ useHandCursor: true });
    share.on("pointerdown", () => this._share());

    // Botón menú.
    const menu = this.add
      .text(W / 2, 730, t("menu"), f("16px", { color: "#ffffff" }))
      .setOrigin(0.5)
      .setPadding(16, 8, 16, 8)
      .setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => this.scene.start("Menu"));
  }

  async _share() {
    const text = t("shareText", { score: this._score });
    const url = "https://glitchrushgg.com/games/elizabeth-flofy/";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Elizabeth & Flofy", text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
    } catch (e) {
      /* el usuario canceló; sin acción */
    }
  }
}
