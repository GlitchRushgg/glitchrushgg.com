// Fin de run: SIGNAL LOST, distancia, bits ganados, récord, reintentar/tienda/menú.
// ESPACIO = reintentar (loop de rejugar sin fricción).

import { W, H, SECTORS } from "../const.js";
import { t } from "../i18n.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  init(data) {
    this._meters = (data && data.meters) || 0;
    this._bits = (data && data.bits) || 0;
    this._sector = (data && data.sector) || 1;
  }

  create() {
    this.snd = new Sound();
    const isRecord = Save.saveBest(this._meters);
    const pal = SECTORS[Math.min(this._sector - 1, SECTORS.length - 1)];

    const g = this.add.graphics();
    g.fillGradientStyle(pal.top, pal.top, pal.bottom, pal.bottom, 1);
    g.fillRect(0, 0, W, H);
    this.add.tileSprite(W / 2, H / 2, W, H, "grid").setTint(pal.grid).setAlpha(0.2);

    const f = (size, extra = {}) => ({
      fontFamily: "'Consolas', 'Courier New', monospace",
      fontSize: size, color: "#ffffff", fontStyle: "bold", ...extra,
    });

    // Título glitcheado.
    const ttl = this.add.text(W / 2, 120, t("gameOver"), f("64px", { color: "#ff4e6a" })).setOrigin(0.5);
    this.time.addEvent({
      delay: 120, loop: true, callback: () => {
        ttl.x = W / 2 + Phaser.Math.Between(-3, 3);
        ttl.setAlpha(Phaser.Math.FloatBetween(0.85, 1));
      },
    });

    // Distancia (métrica principal).
    this.add.text(W / 2, 240, `${this._meters} ${t("meters")}`, f("96px", { color: "#ffffff" })).setOrigin(0.5);

    // Bits ganados + total.
    this.add.image(W / 2 - 60, 330, "bit").setTint(0xffd94e).setScale(1.3);
    this.add.text(W / 2 - 40, 330, t("earned", { n: this._bits }), f("26px", { color: "#ffd94e" })).setOrigin(0, 0.5);

    if (isRecord) {
      const rec = this.add.text(W / 2, 388, "🏆 " + t("newRecord"), f("30px", { color: "#7cffb2" })).setOrigin(0.5);
      this.tweens.add({ targets: rec, scale: 1.12, duration: 450, yoyo: true, repeat: -1 });
    } else {
      this.add.text(W / 2, 388, `🏆 ${t("best")}: ${Save.best()} ${t("meters")}`, f("22px", { color: "#9fb4ff" })).setOrigin(0.5);
    }

    // Botones.
    const again = this.add.text(W / 2, 480, "▶  " + t("playAgain"), f("32px", {
      backgroundColor: "#27e7ff", color: "#04101a",
    })).setOrigin(0.5).setPadding(40, 14, 40, 14).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: again, scale: 1.05, duration: 550, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    again.on("pointerdown", () => { this.snd.ui(); this.scene.start("Game"); });

    const shop = this.add.text(W / 2 - 130, 570, "◆ " + t("shop"), f("20px", {
      backgroundColor: "#2a1846", color: "#ffd94e",
    })).setOrigin(0.5).setPadding(22, 10, 22, 10).setInteractive({ useHandCursor: true });
    shop.on("pointerdown", () => { this.snd.ui(); this.scene.start("Shop"); });

    const menu = this.add.text(W / 2 + 130, 570, t("menu"), f("20px", {
      backgroundColor: "#1a2a4a",
    })).setOrigin(0.5).setPadding(22, 10, 22, 10).setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });

    const share = this.add.text(W / 2, 646, "🔗 " + t("share"), f("16px", { color: "#9fb4ff" }))
      .setOrigin(0.5).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    share.on("pointerdown", () => this._share());

    // Carencia + sin auto-repeat: si mueres con ESPACIO mantenido (overclock por
    // teclado), el repeat reiniciaba la run sin dejarte ver la puntuación.
    const retry = (e) => {
      if (e.repeat || this.time.now - this._bornAt < 450) return;
      this.scene.start("Game");
    };
    this._bornAt = this.time.now;
    this.input.keyboard.on("keydown-SPACE", retry);
    this.input.keyboard.on("keydown-ENTER", retry);
  }

  async _share() {
    const text = t("shareText", { m: this._meters });
    const url = "https://glitchrushgg.com/glitch-shift/";
    try {
      if (navigator.share) await navigator.share({ title: t("title"), text, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(`${text} ${url}`);
    } catch (e) { /* cancelado por el usuario */ }
  }
}
