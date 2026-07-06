// Fin de run: tiempo sobrevivido, bajas, nivel, monedas ganadas, récord y
// reintentar (ESPACIO, sin auto-repeat) / mejoras / menú / compartir.

import { W, H, PAL } from "../const.js";
import { t } from "../i18n.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  init(data) {
    this._secs = (data && data.secs) || 0;
    this._kills = (data && data.kills) || 0;
    this._level = (data && data.level) || 1;
    this._coins = (data && data.coins) || 0;
    this._caramb = (data && data.caramb) || 0;
  }

  create() {
    this.snd = new Sound();
    const isRecord = Save.saveBest(this._secs);

    const g = this.add.graphics();
    g.fillGradientStyle(PAL.bgTop, PAL.bgTop, PAL.bgBottom, PAL.bgBottom, 1);
    g.fillRect(0, 0, W, H);
    this.add.tileSprite(W / 2, H / 2, W, H, "grid").setTint(PAL.grid).setAlpha(0.2);

    const f = (size, extra = {}) => ({
      fontFamily: "'Consolas', 'Courier New', monospace",
      fontSize: size, color: "#ffffff", fontStyle: "bold", ...extra,
    });

    // Panel-tarjeta central.
    const PW = 620, PH = 480, PY = 388;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1208, 0.82); panel.fillRoundedRect(W / 2 - PW / 2, PY - PH / 2, PW, PH, 26);
    panel.lineStyle(3, PAL.player, 0.9); panel.strokeRoundedRect(W / 2 - PW / 2, PY - PH / 2, PW, PH, 26);

    const ttl = this.add.text(W / 2, 116, t("gameOver"), f("60px", { color: "#ff4e3a" })).setOrigin(0.5);
    this.time.addEvent({
      delay: 130, loop: true, callback: () => {
        ttl.x = W / 2 + Phaser.Math.Between(-3, 3);
        ttl.setAlpha(Phaser.Math.FloatBetween(0.85, 1));
      },
    });

    const m = Math.floor(this._secs / 60), s = this._secs % 60;
    this.add.text(W / 2, 202, t("survived"), f("20px", { color: "#e8cfa0", fontStyle: "normal" })).setOrigin(0.5);
    const timeTx = this.add.text(W / 2, 262, `${m}:${String(s).padStart(2, "0")}`, f("80px")).setOrigin(0.5);
    this.add.text(W / 2, 334,
      `☠ ${this._kills} ${t("kills")}   ·   🎱 ${this._caramb} ${t("carambs")}   ·   ${t("level")} ${this._level}`,
      f("21px", { color: "#e8cfa0", fontStyle: "normal" })).setOrigin(0.5);

    this.add.image(W / 2 - 70, 384, "coin").setTint(PAL.coin).setScale(1.3);
    this.add.text(W / 2 - 50, 384, t("earned", { n: this._coins }), f("24px", { color: "#ffd94e" })).setOrigin(0, 0.5);

    if (isRecord) {
      const rec = this.add.text(W / 2, 436, "🏆 " + t("newRecord"), f("28px", { color: "#7cff5e" })).setOrigin(0.5);
      this.tweens.add({ targets: rec, scale: 1.12, duration: 450, yoyo: true, repeat: -1 });
      this._confetti();
    } else {
      const b = Save.best(), bm = Math.floor(b / 60), bs = b % 60;
      this.add.text(W / 2, 436, `🏆 ${t("best")}: ${bm}:${String(bs).padStart(2, "0")}`,
        f("20px", { color: "#e8cfa0" })).setOrigin(0.5);
    }

    // Entrada animada.
    [ttl, timeTx].forEach((o, i) => {
      o.setAlpha(0).setScale(0.7);
      this.tweens.add({ targets: o, scale: 1, alpha: 1, duration: 320, delay: 70 * i, ease: "Back.out" });
    });

    // Volver a la web (solo si no es iframe/CrazyGames).
    if (window.self === window.top) {
      const home = this.add.text(24, 24, "🏠", f("24px", { backgroundColor: "#2a1f10cc" }))
        .setOrigin(0, 0).setPadding(14, 12, 14, 12).setInteractive({ useHandCursor: true });
      home.on("pointerdown", () => { window.location.href = "/"; });
    }

    const again = this.add.text(W / 2, 510, "▶  " + t("playAgain"), f("32px", {
      backgroundColor: "#ffc93e", color: "#241505",
    })).setOrigin(0.5).setPadding(40, 14, 40, 14).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: again, scale: 1.05, duration: 550, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    again.on("pointerdown", () => { this.snd.ui(); this.scene.start("Game"); });

    const shop = this.add.text(W / 2 - 130, 584, "⬆ " + t("shop"), f("20px", {
      backgroundColor: "#2a1f10", color: "#ffd94e",
    })).setOrigin(0.5).setPadding(22, 10, 22, 10).setInteractive({ useHandCursor: true });
    shop.on("pointerdown", () => { this.snd.ui(); this.scene.start("Shop"); });

    const menu = this.add.text(W / 2 + 130, 584, t("menu"), f("20px", {
      backgroundColor: "#241a0c",
    })).setOrigin(0.5).setPadding(22, 10, 22, 10).setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });

    const share = this.add.text(W / 2, 648, "🔗 " + t("share"), f("16px", { color: "#e8cfa0" }))
      .setOrigin(0.5).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    share.on("pointerdown", () => this._share());

    // Sin auto-repeat + carencia: morir con ESPACIO pulsado no salta la pantalla.
    const retry = (e) => {
      if (e.repeat || this.time.now - this._bornAt < 450) return;
      this.scene.start("Game");
    };
    this._bornAt = this.time.now;
    this.input.keyboard.on("keydown-SPACE", retry);
    this.input.keyboard.on("keydown-ENTER", retry);
  }

  _confetti() {
    const cols = [0xffc93e, 0xff4e3a, 0x7cff5e, 0xffd94e, 0xff5e8a];
    for (let i = 0; i < 55; i++) {
      const x = Phaser.Math.Between(0, W);
      const p = this.add.rectangle(x, -20, Phaser.Math.Between(6, 12), Phaser.Math.Between(6, 12),
        cols[i % cols.length]).setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: p, y: H + 30, angle: p.angle + Phaser.Math.Between(180, 540),
        x: x + Phaser.Math.Between(-60, 60), duration: Phaser.Math.Between(1400, 2600),
        delay: Phaser.Math.Between(0, 700), ease: "Quad.in", onComplete: () => p.destroy(),
      });
    }
  }

  async _share() {
    const m = Math.floor(this._secs / 60), s = this._secs % 60;
    const text = t("shareText", { t: `${m}:${String(s).padStart(2, "0")}`, k: this._kills, c: this._caramb });
    const url = "https://glitchrushgg.com/ricochet-rush/";
    try {
      if (navigator.share) await navigator.share({ title: t("title"), text, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(`${text} ${url}`);
    } catch (e) { /* cancelado por el usuario */ }
  }
}
