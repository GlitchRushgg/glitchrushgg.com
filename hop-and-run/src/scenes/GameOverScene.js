// Run over: distance + animals rescued, record, retry (SPACE, no auto-repeat).

import { W, H } from "../const.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  init(data) {
    this._meters = (data && data.meters) || 0;
    this._animals = (data && data.animals) || 0;
    this._reason = (data && data.reason) || "fall";
  }

  create() {
    this.snd = new Sound();
    const isRecord = Save.saveBest(this._meters);
    Save.saveAnimals(this._animals);
    const prevTotal = Save.totalAnimals();
    const total = Save.addAnimals(this._animals);
    const next = Save.nextMilestone(total);
    // ¿Cruzó un hito en esta run?
    const hitMilestone = Save.nextMilestone(prevTotal) !== next && prevTotal !== total;

    // Fondo con la MISMA calidad que el menú (feedback fundadora): el key-art
    // hero al fondo + velo oscuro, en vez del gradiente plano.
    const bg = this.add.image(W / 2, H / 2, "key-art");
    const cover = Math.max(W / bg.width, H / bg.height);
    bg.setScale(cover * 1.04);
    this.tweens.add({ targets: bg, scale: cover * 1.09, duration: 6000, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.add.rectangle(W / 2, H / 2, W, H, 0x0b1220, 0.62);
    // Rayos suaves de fondo para dar profundidad.
    for (let i = 0; i < 5; i++) {
      this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), "cloud")
        .setAlpha(0.06).setScale(Phaser.Math.FloatBetween(1.5, 3)).setTint(0x8fd6ff);
    }

    const f = (size, extra = {}) => ({
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: size, color: "#ffffff", fontStyle: "bold", ...extra,
    });

    // Panel-tarjeta central.
    const PX = W / 2 + 70, PW = 620, PH = 470, PY = 384;
    const panel = this.add.graphics();
    panel.fillStyle(0x0e1830, 0.82); panel.fillRoundedRect(PX - PW / 2, PY - PH / 2, PW, PH, 26);
    panel.lineStyle(3, 0xe8622c, 0.9); panel.strokeRoundedRect(PX - PW / 2, PY - PH / 2, PW, PH, 26);

    const title = this._reason === "energy" ? "OUT OF ENERGY!" : "YOU FELL!";
    const hint = this._reason === "energy" ? "Grab more fruit next time 🍎" : "Watch those gaps!";
    const titleTx = this.add.text(W / 2, 88, title, f("58px", { color: "#ff8a5e", stroke: "#0b1220", strokeThickness: 8 })).setOrigin(0.5);
    this.add.text(W / 2, 142, hint, f("20px", { color: "#cfe4ff", fontStyle: "normal" })).setOrigin(0.5);

    // Cristian celebrating (it's still a great run!) — con glow y entrada.
    const cGlow = this.add.image(W / 2 - 340, H / 2 + 80, "glow").setScale(7).setTint(0xffe066).setAlpha(0.35);
    const c = this.add.image(W / 2 - 340, H / 2 + 70, "cristian-celebrate");
    c.setScale(340 / c.height).setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, x: c.x + 14, duration: 400, ease: "Back.out" });
    this.tweens.add({ targets: c, y: c.y - 16, angle: 3, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.tweens.add({ targets: cGlow, alpha: 0.15, duration: 900, yoyo: true, repeat: -1 });

    // Distancia (métrica principal, dentro del panel).
    this.add.text(PX, 208, "DISTANCE", f("20px", { color: "#9fb8d8", fontStyle: "normal" })).setOrigin(0.5);
    const distTx = this.add.text(PX, 268, `${this._meters} m`, f("82px", { color: "#ffe066" })).setOrigin(0.5);
    // Fila de stats: animales + insignia.
    this.add.text(PX, 344, `🐾 ${this._animals} rescued`, f("24px")).setOrigin(0.5);

    if (hitMilestone) {
      const mi = this.add.text(PX, 388, `🎖 MILESTONE! ${total} saved!`, f("22px", { color: "#ffe066" })).setOrigin(0.5);
      this.tweens.add({ targets: mi, scale: 1.08, duration: 420, yoyo: true, repeat: -1 });
      this._confetti();
    } else if (next) {
      this.add.text(PX, 388, `🎖 ${total}/${next} to next badge`, f("18px", { color: "#9fb8d8", fontStyle: "normal" })).setOrigin(0.5);
    } else {
      this.add.text(PX, 388, `🎖 ${total} saved — all badges!`, f("18px", { color: "#ffe066", fontStyle: "normal" })).setOrigin(0.5);
    }

    if (isRecord) {
      const rec = this.add.text(PX, 432, "🏆 NEW RECORD!", f("26px", { color: "#7cd94e" })).setOrigin(0.5);
      this.tweens.add({ targets: rec, scale: 1.12, duration: 480, yoyo: true, repeat: -1 });
      this._confetti();
    } else {
      this.add.text(PX, 432, `🏆 Best: ${Save.best()} m`, f("20px", { color: "#9fb8d8" })).setOrigin(0.5);
    }

    // Botones.
    const again = this.add.text(PX, 502, "▶  RETRY", f("30px", { backgroundColor: "#e8622c" }))
      .setOrigin(0.5).setPadding(44, 15, 44, 15).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: again, scale: 1.05, duration: 560, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    again.on("pointerdown", () => { this.snd.ui(); this.scene.start("Game"); });

    const menu = this.add.text(PX - 70, 572, "MENU", f("19px", { backgroundColor: "#24344e" }))
      .setOrigin(0.5).setPadding(22, 10, 22, 10).setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });

    const share = this.add.text(PX + 70, 572, "🔗 SHARE", f("19px", { backgroundColor: "#1aa84f" }))
      .setOrigin(0.5).setPadding(22, 10, 22, 10).setInteractive({ useHandCursor: true });
    share.on("pointerdown", () => this._share());

    // Botón "volver a la web" — solo en la web propia (no en iframe/CrazyGames).
    if (window.self === window.top) {
      const home = this.add.text(24, 24, "🏠", f("24px", { backgroundColor: "#23324acc" }))
        .setOrigin(0, 0).setPadding(14, 12, 14, 12).setInteractive({ useHandCursor: true });
      home.on("pointerdown", () => { window.location.href = "/"; });
    }

    // Entrada animada: título y distancia aparecen con un pop.
    [titleTx, distTx].forEach((o, i) => {
      o.setAlpha(0).setScale(0.6);
      this.tweens.add({ targets: o, scale: 1, alpha: 1, duration: 320, delay: 80 * i, ease: "Back.out" });
    });

    // Grace period + no auto-repeat: dying with SPACE held must not skip this screen.
    const retry = (e) => {
      if (e.repeat || this.time.now - this._bornAt < 450) return;
      this.scene.start("Game");
    };
    this._bornAt = this.time.now;
    this.input.keyboard.on("keydown-SPACE", retry);
    this.input.keyboard.on("keydown-ENTER", retry);
  }

  _confetti() {
    if (this._confettiDone) return;   // una sola lluvia aunque haya récord + hito
    this._confettiDone = true;
    const cols = [0xffe066, 0xff8a5e, 0x7cd94e, 0x8fd6ff, 0xff8fb0];
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(W / 2, W);
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
    const text = `I ran ${this._meters} m and rescued ${this._animals} animals in Hop & Run! 🎸🐾 Can you beat me?`;
    const url = "https://glitchrushgg.com/hop-and-run/";
    try {
      if (navigator.share) await navigator.share({ title: "Hop & Run", text, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(`${text} ${url}`);
    } catch (e) { /* user cancelled */ }
  }
}
