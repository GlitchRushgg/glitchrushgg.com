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
    this.add.rectangle(W / 2, H / 2, W, H, 0x0b1220, 0.66);
    // Rayos suaves de fondo para dar profundidad.
    for (let i = 0; i < 5; i++) {
      this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), "cloud")
        .setAlpha(0.06).setScale(Phaser.Math.FloatBetween(1.5, 3)).setTint(0x8fd6ff);
    }

    const f = (size, extra = {}) => ({
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: size, color: "#ffffff", fontStyle: "bold", ...extra,
    });

    // ---- Tarjeta central (SÓLIDA: antes el panel translúcido dejaba ver el
    // key-art detrás de las cifras y restaba legibilidad). ----
    const PX = 722, CW = 648, CH = 496, CY = 404;
    const cx0 = PX - CW / 2, cy0 = CY - CH / 2;
    const scrim = this.add.rectangle(PX, CY, CW + 40, CH + 40, 0x0b1220, 0.5); // difumina el fondo tras la tarjeta
    scrim.setBlendMode(Phaser.BlendModes.MULTIPLY);
    const panel = this.add.graphics();
    panel.fillStyle(0x0e1a33, 0.94); panel.fillRoundedRect(cx0, cy0, CW, CH, 28);
    panel.lineStyle(3, 0xe8622c, 0.95); panel.strokeRoundedRect(cx0, cy0, CW, CH, 28);
    panel.fillStyle(0xffffff, 0.06); panel.fillRoundedRect(cx0 + 6, cy0 + 6, CW - 12, 46, 22); // brillo superior

    const title = this._reason === "energy" ? "OUT OF ENERGY!" : "YOU FELL!";
    const hint = this._reason === "energy" ? "Grab more fruit next time 🍎" : "Mind the gaps — you'll go further!";
    const titleTx = this.add.text(PX, 98, title, f("54px", { color: "#ff8a5e", stroke: "#0b1220", strokeThickness: 8 })).setOrigin(0.5);
    this.add.text(PX, 138, hint, f("19px", { color: "#cfe4ff", fontStyle: "normal" })).setOrigin(0.5);

    // Cristian celebrating (it's still a great run!) — con glow y entrada.
    const cGlow = this.add.image(300, H / 2 + 80, "glow").setScale(7).setTint(0xffe066).setAlpha(0.35);
    const c = this.add.image(300, H / 2 + 70, "cristian-celebrate");
    c.setScale(340 / c.height).setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, x: c.x + 14, duration: 400, ease: "Back.out" });
    this.tweens.add({ targets: c, y: c.y - 16, angle: 3, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.tweens.add({ targets: cGlow, alpha: 0.15, duration: 900, yoyo: true, repeat: -1 });

    // ---- Distancia: métrica HÉROE con conteo animado (juego = recompensa). ----
    this.add.text(PX, 206, "DISTANCE", f("19px", { color: "#9fb8d8", fontStyle: "normal", letterSpacing: 3 })).setOrigin(0.5);
    const distTx = this.add.text(PX, 270, "0 m", f("78px", { color: "#ffe066", stroke: "#0b1220", strokeThickness: 6 })).setOrigin(0.5);
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter, v: this._meters, duration: 700, delay: 220, ease: "Cubic.out",
      onUpdate: () => distTx.setText(`${Math.round(counter.v)} m`),
      onComplete: () => {
        distTx.setText(`${this._meters} m`);
        this.tweens.add({ targets: distTx, scale: 1.1, duration: 150, yoyo: true, ease: "Quad.out" });
      },
    });

    // Divisor.
    this.add.rectangle(PX, 322, CW - 120, 2, 0xffffff, 0.12);

    // ---- Dos "tiles" de stats: animales rescatados | récord/mejor. ----
    const tile = (tx, valueStr, valueColor, label, labelColor) => {
      this.add.text(tx, 362, valueStr, f("30px", { color: valueColor })).setOrigin(0.5);
      this.add.text(tx, 392, label, f("13px", { color: labelColor, fontStyle: "normal", letterSpacing: 2 })).setOrigin(0.5);
    };
    tile(PX - 150, `🐾 ${this._animals}`, "#ffffff", "RESCUED", "#9fb8d8");
    if (isRecord) {
      tile(PX + 150, "🏆 NEW!", "#7cd94e", "RECORD!", "#7cd94e");
      this._confetti();
    } else {
      tile(PX + 150, `🏆 ${Save.best()} m`, "#ffffff", "BEST", "#9fb8d8");
    }

    // ---- Insignias: barra de progreso (más clara y jugosa que texto suelto). ----
    const badgeLabel = hitMilestone
      ? `🎖  MILESTONE!  ${total} animals saved`
      : next
        ? `🎖  ${total} / ${next} to next badge`
        : `🎖  ${total} saved — all badges!`;
    const badgeColor = (hitMilestone || !next) ? "#ffe066" : "#cfe4ff";
    const bl = this.add.text(PX, 438, badgeLabel, f("17px", { color: badgeColor, fontStyle: hitMilestone ? "bold" : "normal" })).setOrigin(0.5);
    if (hitMilestone) this.tweens.add({ targets: bl, scale: 1.06, duration: 440, yoyo: true, repeat: -1 });
    // barra
    const barW = 430, barH = 14, by = 468;
    this.add.rectangle(PX, by, barW, barH, 0x0a1424, 0.9).setStrokeStyle(2, 0xffffff, 0.22);
    const frac = next ? Phaser.Math.Clamp(total / next, 0, 1) : 1;
    const fillCol = (hitMilestone || !next) ? 0xffe066 : 0x8fd6ff;
    const fill = this.add.rectangle(PX - barW / 2 + 3, by, 2, barH - 4, fillCol).setOrigin(0, 0.5);
    this.tweens.add({ targets: fill, width: (barW - 6) * frac, duration: 750, delay: 300, ease: "Cubic.out" });
    if (hitMilestone) this._confetti();

    // ---- Botones. ----
    const again = this.add.text(PX, 528, "▶  RETRY", f("30px", { backgroundColor: "#e8622c" }))
      .setOrigin(0.5).setPadding(48, 16, 48, 16).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: again, scale: 1.05, duration: 560, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    again.on("pointerover", () => again.setStyle({ backgroundColor: "#ff7a3d" }));
    again.on("pointerout", () => again.setStyle({ backgroundColor: "#e8622c" }));
    again.on("pointerdown", () => { this.snd.ui(); this.scene.start("Game"); });

    const menu = this.add.text(PX - 96, 596, "MENU", f("19px", { backgroundColor: "#24344e" }))
      .setOrigin(0.5).setPadding(26, 11, 26, 11).setInteractive({ useHandCursor: true });
    menu.on("pointerover", () => menu.setStyle({ backgroundColor: "#33486b" }));
    menu.on("pointerout", () => menu.setStyle({ backgroundColor: "#24344e" }));
    menu.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });

    const share = this.add.text(PX + 96, 596, "🔗 SHARE", f("19px", { backgroundColor: "#1aa84f" }))
      .setOrigin(0.5).setPadding(26, 11, 26, 11).setInteractive({ useHandCursor: true });
    share.on("pointerover", () => share.setStyle({ backgroundColor: "#22c460" }));
    share.on("pointerout", () => share.setStyle({ backgroundColor: "#1aa84f" }));
    share.on("pointerdown", () => this._share());

    // Botón "volver a la web" — solo en la web propia (no en iframe/CrazyGames).
    if (window.self === window.top) {
      const home = this.add.text(24, 24, "🏠", f("24px", { backgroundColor: "#23324acc" }))
        .setOrigin(0, 0).setPadding(14, 12, 14, 12).setInteractive({ useHandCursor: true });
      home.on("pointerdown", () => { window.location.href = "/"; });
    }

    // Entrada animada: título con pop.
    titleTx.setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: titleTx, scale: 1, alpha: 1, duration: 320, ease: "Back.out" });

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
