// Game over v2 (portrait): restart instantáneo (tap/SPACE — "una más"),
// double-stars rewarded, misiones del día, share, midgame cada 3ª muerte.

import { W, H } from "../const.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { SDK } from "../utils/SDK.js";
import { getMissions } from "../missions.js";

const FONT = "'Segoe UI', system-ui, sans-serif";
let deathsSinceAd = 0;

export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }

  init(data) { this.res = data || { score: 0, meters: 0, stars: 0, time: 0, syncs: 0, multMax: 1 }; }

  create() {
    this.snd = new Sound();
    const isBest = Save.submitScore(this.res.score, this.res.meters);
    if (isBest) SDK.happyTime();
    const sv = Save.get();
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    const hero = this.add.image(W / 2, H / 2, "duo-hero");
    hero.setScale(Math.max(W / hero.width, H / hero.height)).setAlpha(0.3);
    this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.7);

    const panel = this.add.container(0, 30).setAlpha(0);
    panel.add(this.add.rectangle(W / 2, H / 2 - 10, 344, 600, 0x241a4a, 0.96).setStrokeStyle(3, 0xb9a6ff));

    // reacción del personaje
    const art = this.add.image(W / 2, H / 2 - 232, isBest ? "eliz-fairy" : "flofy-front");
    art.setScale(110 / art.height);
    panel.add(art);

    panel.add(this.add.text(W / 2, H / 2 - 158, isBest ? "★ NEW BEST! ★" : "SWEET DREAMS…", f("26px", { color: isBest ? "#ffd94e" : "#ff9ed2" })).setOrigin(0.5));
    panel.add(this.add.text(W / 2, H / 2 - 108, String(this.res.score), f("56px")).setOrigin(0.5));
    panel.add(this.add.text(W / 2, H / 2 - 62, `BEST ${sv.best} · ${this.res.time}s · ×${this.res.multMax} · ${this.res.syncs} syncs`, f("14px", { color: "#cbb7ff", fontStyle: "normal" })).setOrigin(0.5));

    this.starLine = this.add.text(W / 2, H / 2 - 30, `★ +${this.res.stars} stars`, f("18px", { color: "#ffd94e" })).setOrigin(0.5);
    panel.add(this.starLine);

    // double stars (rewarded) — solo si vale la pena
    let nextY = H / 2 + 10;
    if (this.res.stars >= 10) {
      this.x2Btn = this.add.text(W / 2, nextY, "▶ DOUBLE STARS (ad)", f("17px", { backgroundColor: "#8ef5c9", color: "#14351f" }))
        .setOrigin(0.5).setPadding(18, 9, 18, 9).setInteractive({ useHandCursor: true });
      this.x2Btn.on("pointerdown", () => {
        SDK.rewardedAd(() => {
          Save.addStars(this.res.stars);
          this.starLine.setText(`★ +${this.res.stars * 2} stars (doubled!)`);
          this.snd.fanfare();
          this.x2Btn.destroy();
        }, () => this.snd.deny());
      });
      panel.add(this.x2Btn);
      nextY += 52;
    }

    const retry = this.add.text(W / 2, nextY + 26, "▶  PLAY AGAIN", f("26px", { backgroundColor: "#ff9ed2", color: "#3a2260" }))
      .setOrigin(0.5).setPadding(34, 13, 34, 13).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: retry, scale: 1.04, duration: 520, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    retry.on("pointerdown", () => this._retry());
    panel.add(retry);

    // misiones del día (progreso vivo — razón para "una más")
    const ms = getMissions();
    let my = nextY + 84;
    panel.add(this.add.text(W / 2, my, "— TODAY'S MISSIONS —", f("12px", { color: "#cbb7ff" })).setOrigin(0.5));
    ms.forEach((m, i) => {
      const y = my + 24 + i * 24;
      panel.add(this.add.text(58, y, m.done ? "✅" : "⬜", { fontSize: "13px" }).setOrigin(0, 0.5));
      panel.add(this.add.text(84, y, m.label, f("12px", { color: m.done ? "#8ef5c9" : "#e8dcff", fontStyle: "normal" })).setOrigin(0, 0.5));
      panel.add(this.add.text(W - 56, y, m.done ? `★${m.reward}` : `${Math.min(m.progress, m.goal)}/${m.goal}`, f("12px", { color: "#ffd94e" })).setOrigin(1, 0.5));
    });

    const rowY = my + 118;
    const shop = this.add.text(W / 2 - 96, rowY, "★ SHOP", f("15px", { backgroundColor: "#3a2260", color: "#ffd94e" }))
      .setOrigin(0.5).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    shop.on("pointerdown", () => { this.snd.ui(); this.scene.start("Shop"); });
    panel.add(shop);
    const menu = this.add.text(W / 2, rowY, "MENU", f("15px", { backgroundColor: "#3a2260" }))
      .setOrigin(0.5).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });
    panel.add(menu);
    const share = this.add.text(W / 2 + 96, rowY, "SHARE", f("15px", { backgroundColor: "#3a2260", color: "#8ef5c9" }))
      .setOrigin(0.5).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    share.on("pointerdown", () => this._share());
    panel.add(share);

    this.tweens.add({ targets: panel, alpha: 1, y: 0, duration: 380, ease: "Back.out" });
    if (isBest) this._confetti();

    // "una más" instantáneo: SPACE/ENTER (con guarda anti-repeat)
    this.time.delayedCall(500, () => {
      this.input.keyboard.once("keydown-SPACE", () => this._retry());
      this.input.keyboard.once("keydown-ENTER", () => this._retry());
    });
  }

  _retry() {
    deathsSinceAd++;
    if (deathsSinceAd >= 3) { deathsSinceAd = 0; SDK.midgameAd(() => this.scene.start("Game")); }
    else this.scene.start("Game");
  }

  async _share() {
    const sv = Save.get();
    const text = `I scored ${sv.best} in DREAM DUO 🌙✨ — one brain, two worlds at the same time. Beat me!`;
    let url = location.href;
    const cg = await SDK.invite({ best: sv.best });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: "Dream Duo", text, url }); return; } } catch (e) {}
    try { await navigator.clipboard.writeText(text + " " + url); this.snd.ui(); } catch (e) {}
  }

  _confetti() {
    for (let i = 0; i < 50; i++) {
      const p = this.add.image(Phaser.Math.Between(0, W), -20 - Math.random() * 300, "confetti")
        .setScale(Phaser.Math.FloatBetween(0.5, 1)).setAngle(Math.random() * 360).setDepth(99);
      p.setCrop(Phaser.Math.Between(0, 4) * 12, 0, 9, 14);
      this.tweens.add({
        targets: p, y: H + 30, angle: p.angle + Phaser.Math.Between(-360, 360),
        x: p.x + Phaser.Math.Between(-60, 60),
        duration: Phaser.Math.Between(1800, 3200), delay: Math.random() * 500,
        onComplete: () => p.destroy(),
      });
    }
    this.snd.fanfare();
  }
}
