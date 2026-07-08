// Menu: duo-hero key art, PLAY (1 click to gameplay — CG time-to-fun), SHOP,
// best score, mute, share, home (hidden inside the CrazyGames iframe).

import { W, H } from "../const.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { SDK } from "../utils/SDK.js";

const FONT = "'Segoe UI', system-ui, sans-serif";

export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }

  create() {
    this.snd = new Sound();
    const sv = Save.get();
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    this.add.image(0, 0, "duo-hero").setOrigin(0).setDisplaySize(W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.42);

    // title
    this.add.text(W / 2 + 4, 96, "DREAM DUO", f("84px", { color: "#3a2260" })).setOrigin(0.5).setAlpha(0.6);
    this.add.text(W / 2, 92, "DREAM DUO", f("84px", { color: "#ffd6ec", stroke: "#3a2260", strokeThickness: 8 })).setOrigin(0.5);
    this.add.text(W / 2, 158, "Elizabeth & Flofy", f("28px", { color: "#cbb7ff" })).setOrigin(0.5);
    this.add.text(W / 2, 208, "One brain. Two worlds. At the same time.", f("21px", { color: "#ffe6b0", fontStyle: "normal" })).setOrigin(0.5);

    // best + stars
    this.add.text(W / 2 - 80, 258, `🏆 BEST ${sv.best}`, f("22px")).setOrigin(0.5);
    this.add.image(W / 2 + 56, 258, "star").setScale(0.55);
    this.add.text(W / 2 + 76, 258, `${sv.stars}`, f("22px", { color: "#ffd94e" })).setOrigin(0, 0.5);

    // PLAY
    const play = this.add.text(W / 2, 380, "▶  PLAY", f("42px", { backgroundColor: "#ff9ed2", color: "#3a2260" }))
      .setOrigin(0.5).setPadding(56, 18, 56, 18).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: play, scale: 1.05, duration: 550, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    play.on("pointerdown", () => { this.snd.resume(); this.snd.ui(); this.scene.start("Game"); });

    // SHOP
    const shop = this.add.text(W / 2, 480, "★  STAR SHOP", f("24px", { backgroundColor: "#3a2260", color: "#ffd94e" }))
      .setOrigin(0.5).setPadding(34, 12, 34, 12).setInteractive({ useHandCursor: true });
    shop.on("pointerdown", () => { this.snd.ui(); this.scene.start("Shop"); });

    // how to play
    [
      "LEFT side / A — Elizabeth jumps in the park",
      "RIGHT side / L — Flofy hops in the dream (tap twice = flutter)",
      "Grab BOTH stars together = SYNC → fill the meter → FAIRY RUSH!",
    ].forEach((line, i) => {
      this.add.text(W / 2, 560 + i * 30, line, f("17px", {
        color: i === 2 ? "#8ef5c9" : "#e8dcff", fontStyle: "normal",
      })).setOrigin(0.5);
    });
    this.add.text(W / 2, 664, "Can your brain run two worlds at once?", f("18px", { color: "#ffd94e" })).setOrigin(0.5);

    this.input.keyboard.on("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard.on("keydown-ENTER", () => this.scene.start("Game"));

    // mute
    this._muteBtn = this.add.text(W - 24, 20, this.snd.muted ? "🔇" : "🔊", f("22px", { backgroundColor: "#3a2260cc" }))
      .setOrigin(1, 0).setPadding(14, 10, 14, 10).setInteractive({ useHandCursor: true });
    this._muteBtn.on("pointerdown", () => {
      this.snd.setMuted(!this.snd.muted);
      this._muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
    });

    // share
    const share = this.add.text(W - 24, 84, "SHARE", f("16px", { backgroundColor: "#3a2260cc", color: "#cbb7ff" }))
      .setOrigin(1, 0).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    share.on("pointerdown", () => this._share());

    // home — only on the studio site, never inside the CrazyGames iframe
    if (window.self === window.top) {
      const home = this.add.text(24, 20, "🏠", f("22px", { backgroundColor: "#3a2260cc" }))
        .setOrigin(0, 0).setPadding(14, 10, 14, 10).setInteractive({ useHandCursor: true });
      home.on("pointerdown", () => { window.location.href = "/"; });
    }
  }

  async _share() {
    const sv = Save.get();
    const text = `I scored ${sv.best} in DREAM DUO 🌙✨ — one brain, two worlds at the same time. Can you beat me?`;
    let url = location.href;
    const cg = await SDK.invite({ best: sv.best });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: "Dream Duo", text, url }); return; } } catch (e) {}
    try { await navigator.clipboard.writeText(text + " " + url); } catch (e) {}
  }
}
