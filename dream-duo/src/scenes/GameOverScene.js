// Game over: panel + confetti on new best, double-stars rewarded ad,
// retry (SPACE, no auto-repeat), shop, menu, share, midgame every 3rd retry.

import { W, H } from "../const.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { SDK } from "../utils/SDK.js";

const FONT = "'Segoe UI', system-ui, sans-serif";
let deathsSinceAd = 0;

export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }

  init(data) { this.res = data || { mode: "endless", level: 1, score: 0, meters: 0, stars: 0 }; }

  create() {
    this.snd = new Sound();
    const isLevel = this.res.mode === "level";
    const isBest = isLevel ? false : Save.submitScore(this.res.score);
    if (isBest) SDK.happyTime();
    const sv = Save.get();
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    this.add.image(0, 0, "duo-hero").setOrigin(0).setDisplaySize(W, H).setAlpha(0.35);
    this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.66);

    const panel = this.add.container(0, 40).setAlpha(0);
    const box = this.add.rectangle(W / 2, H / 2, 620, 560, 0x241a4a, 0.96).setStrokeStyle(3, 0xb9a6ff);
    panel.add(box);

    // character reaction: celebrating on new best, offended plush otherwise
    const artKey = isBest ? "eliz-fairy" : "flofy-front";
    const art = this.add.image(W / 2 - 220, H / 2 - 130, artKey);
    art.setScale(150 / art.height);
    panel.add(art);

    if (isLevel) {
      panel.add(this.add.text(W / 2 + 40, H / 2 - 200, "SWEET DREAMS…", f("34px", { color: "#ff9ed2" })).setOrigin(0.5));
      panel.add(this.add.text(W / 2 + 40, H / 2 - 130, `LEVEL ${this.res.level}`, f("58px")).setOrigin(0.5));
      panel.add(this.add.text(W / 2 + 40, H / 2 - 70, "So close — try it again!", f("20px", { color: "#cbb7ff" })).setOrigin(0.5));
    } else {
      panel.add(this.add.text(W / 2 + 40, H / 2 - 200, isBest ? "★ NEW BEST! ★" : "SWEET DREAMS…", f("34px", { color: isBest ? "#ffd94e" : "#ff9ed2" })).setOrigin(0.5));
      panel.add(this.add.text(W / 2 + 40, H / 2 - 130, String(this.res.score), f("74px")).setOrigin(0.5));
      panel.add(this.add.text(W / 2 + 40, H / 2 - 70, `BEST ${sv.best}   ·   ${this.res.meters}m`, f("20px", { color: "#cbb7ff" })).setOrigin(0.5));
    }

    this.starLine = this.add.text(W / 2 + 40, H / 2 - 30, `★ +${this.res.stars} stars`, f("22px", { color: "#ffd94e" })).setOrigin(0.5);
    panel.add(this.starLine);

    // double stars (rewarded) — only when it's worth something
    if (this.res.stars >= 10) {
      this.x2Btn = this.add.text(W / 2, H / 2 + 30, "▶ DOUBLE STARS  (watch ad)", f("21px", { backgroundColor: "#8ef5c9", color: "#14351f" }))
        .setOrigin(0.5).setPadding(24, 10, 24, 10).setInteractive({ useHandCursor: true });
      this.x2Btn.on("pointerdown", () => {
        SDK.rewardedAd(() => {
          Save.addStars(this.res.stars);
          this.starLine.setText(`★ +${this.res.stars * 2} stars (doubled!)`);
          this.snd.fanfare();
          this.x2Btn.destroy();
        }, () => this.snd.deny());
      });
      panel.add(this.x2Btn);
    }

    const retry = this.add.text(W / 2, H / 2 + 106, isLevel ? "↻  TRY AGAIN" : "▶  PLAY AGAIN", f("32px", { backgroundColor: "#ff9ed2", color: "#3a2260" }))
      .setOrigin(0.5).setPadding(40, 14, 40, 14).setInteractive({ useHandCursor: true });
    retry.on("pointerdown", () => this._retry());
    panel.add(retry);

    const shop = this.add.text(W / 2 - 110, H / 2 + 190, "★ SHOP", f("20px", { backgroundColor: "#3a2260", color: "#ffd94e" }))
      .setOrigin(0.5).setPadding(20, 9, 20, 9).setInteractive({ useHandCursor: true });
    shop.on("pointerdown", () => { this.snd.ui(); this.scene.start("Shop"); });
    panel.add(shop);

    const menu = this.add.text(W / 2 + 30, H / 2 + 190, isLevel ? "LEVELS" : "MENU", f("20px", { backgroundColor: "#3a2260" }))
      .setOrigin(0.5).setPadding(20, 9, 20, 9).setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => { this.snd.ui(); this.scene.start(isLevel ? "LevelSelect" : "Menu"); });
    panel.add(menu);

    const share = this.add.text(W / 2 + 160, H / 2 + 190, "SHARE", f("20px", { backgroundColor: "#3a2260", color: "#8ef5c9" }))
      .setOrigin(0.5).setPadding(20, 9, 20, 9).setInteractive({ useHandCursor: true });
    share.on("pointerdown", () => this._share());
    panel.add(share);

    if (window.self === window.top) {
      const home = this.add.text(24, 20, "🏠", f("22px", { backgroundColor: "#3a2260cc" }))
        .setPadding(14, 10, 14, 10).setInteractive({ useHandCursor: true });
      home.on("pointerdown", () => { window.location.href = "/"; });
    }

    this.tweens.add({ targets: panel, alpha: 1, y: 0, duration: 380, ease: "Back.out" });

    if (isBest) this._confetti();

    // retry with SPACE — guard against auto-repeat / held key from the run
    this.time.delayedCall(600, () => {
      this.input.keyboard.once("keydown-SPACE", () => this._retry());
      this.input.keyboard.once("keydown-ENTER", () => this._retry());
    });
  }

  _retry() {
    const data = this.res.mode === "level" ? { mode: "level", level: this.res.level } : { mode: "endless" };
    deathsSinceAd++;
    if (deathsSinceAd >= 3) { deathsSinceAd = 0; SDK.midgameAd(() => this.scene.start("Game", data)); }
    else this.scene.start("Game", data);
  }

  async _share() {
    const text = `I scored ${Save.get().best} in DREAM DUO 🌙✨ — one brain, two worlds at the same time. Beat me!`;
    let url = location.href;
    const cg = await SDK.invite({ best: Save.get().best });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: "Dream Duo", text, url }); return; } } catch (e) {}
    try { await navigator.clipboard.writeText(text + " " + url); this.snd.ui(); } catch (e) {}
  }

  _confetti() {
    for (let i = 0; i < 60; i++) {
      const p = this.add.image(Phaser.Math.Between(0, W), -20 - Math.random() * 300, "confetti")
        .setScale(Phaser.Math.FloatBetween(0.5, 1)).setAngle(Math.random() * 360).setDepth(99);
      p.setCrop(Phaser.Math.Between(0, 4) * 12, 0, 9, 14);
      this.tweens.add({
        targets: p, y: H + 30, angle: p.angle + Phaser.Math.Between(-360, 360),
        x: p.x + Phaser.Math.Between(-80, 80),
        duration: Phaser.Math.Between(1800, 3200), delay: Math.random() * 500,
        onComplete: () => p.destroy(),
      });
    }
    this.snd.fanfare();
  }
}
