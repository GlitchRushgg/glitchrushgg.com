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

    // Panel-tarjeta central.
    const PW = 560, PH = 470, PY = 380;
    const panel = this.add.graphics();
    panel.fillStyle(0x04101a, 0.72); panel.fillRoundedRect(W / 2 - PW / 2, PY - PH / 2, PW, PH, 26);
    panel.lineStyle(3, pal.accent, 0.9); panel.strokeRoundedRect(W / 2 - PW / 2, PY - PH / 2, PW, PH, 26);

    // Título glitcheado con fantasmas cromáticos.
    const mkT = (dx, col, a, d) => this.add.text(W / 2 + dx, 176, t("gameOver"), f("58px", { color: col })).setOrigin(0.5).setAlpha(a).setDepth(d);
    const gc = mkT(-4, "#27e7ff", 0.7, 4), gm = mkT(4, "#ff3ea5", 0.7, 4);
    const ttl = mkT(0, "#ff4e6a", 1, 5);
    this.time.addEvent({
      delay: 110, loop: true, callback: () => {
        const j = () => Phaser.Math.Between(-4, 4);
        gc.setPosition(W / 2 - 4 + j(), 176 + j() * 0.4);
        gm.setPosition(W / 2 + 4 + j(), 176 + j() * 0.4);
        ttl.setAlpha(Phaser.Math.FloatBetween(0.9, 1));
      },
    });

    // Distancia (métrica principal, dentro del panel).
    const distTx = this.add.text(W / 2, 268, `${this._meters} ${t("meters")}`, f("88px", { color: "#ffffff" })).setOrigin(0.5);

    // Bits ganados.
    this.add.image(W / 2 - 66, 356, "bit").setTint(0xffd94e).setScale(1.3);
    this.add.text(W / 2 - 46, 356, t("earned", { n: this._bits }), f("26px", { color: "#ffd94e" })).setOrigin(0, 0.5);

    if (isRecord) {
      const rec = this.add.text(W / 2, 408, "🏆 " + t("newRecord"), f("30px", { color: "#7cffb2" })).setOrigin(0.5);
      this.tweens.add({ targets: rec, scale: 1.12, duration: 450, yoyo: true, repeat: -1 });
      this._confetti(pal);
    } else {
      this.add.text(W / 2, 408, `🏆 ${t("best")}: ${Save.best()} ${t("meters")}`, f("22px", { color: "#9fb4ff" })).setOrigin(0.5);
    }

    // Entrada animada del título y la distancia.
    [ttl, gc, gm, distTx].forEach((o, i) => {
      o.setAlpha(o.alpha).setScale(0.7);
      this.tweens.add({ targets: o, scale: 1, duration: 300, delay: 60 * (i > 2 ? 1 : 0), ease: "Back.out" });
    });

    // Volver a la web propia (no en iframe/CrazyGames).
    if (window.self === window.top) {
      const home = this.add.text(24, 24, "🏠", f("24px", { backgroundColor: "#1a2a4acc" }))
        .setOrigin(0, 0).setPadding(14, 12, 14, 12).setDepth(20).setInteractive({ useHandCursor: true });
      home.on("pointerdown", () => { window.location.href = "/"; });
    }

    // Botones.
    const again = this.add.text(W / 2, 478, "▶  " + t("playAgain"), f("32px", {
      backgroundColor: "#27e7ff", color: "#04101a",
    })).setOrigin(0.5).setPadding(40, 14, 40, 14).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: again, scale: 1.05, duration: 550, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    again.on("pointerdown", () => { this.snd.ui(); this.scene.start("Game"); });

    const shop = this.add.text(W / 2 - 130, 560, "◆ " + t("shop"), f("20px", {
      backgroundColor: "#2a1846", color: "#ffd94e",
    })).setOrigin(0.5).setPadding(22, 10, 22, 10).setInteractive({ useHandCursor: true });
    shop.on("pointerdown", () => { this.snd.ui(); this.scene.start("Shop"); });

    const menu = this.add.text(W / 2 + 130, 560, t("menu"), f("20px", {
      backgroundColor: "#1a2a4a",
    })).setOrigin(0.5).setPadding(22, 10, 22, 10).setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });

    const share = this.add.text(W / 2, 636, "🔗 " + t("share"), f("16px", { color: "#9fb4ff" }))
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

  _confetti(pal) {
    const cols = [0x27e7ff, 0xffd94e, 0xff3ea5, 0x7cffb2, pal.accent];
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
    const text = t("shareText", { m: this._meters });
    const url = "https://glitchrushgg.com/glitch-shift/";
    try {
      if (navigator.share) await navigator.share({ title: t("title"), text, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(`${text} ${url}`);
    } catch (e) { /* cancelado por el usuario */ }
  }
}
