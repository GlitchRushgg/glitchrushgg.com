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

    // progress + stars
    const done = Object.keys(sv.levelStars).length;
    this.add.text(W / 2 - 90, 258, `🏁 ${done}/12 LEVELS`, f("22px")).setOrigin(0.5);
    this.add.image(W / 2 + 66, 258, "star").setScale(0.55);
    this.add.text(W / 2 + 86, 258, `${sv.stars}`, f("22px", { color: "#ffd94e" })).setOrigin(0, 0.5);

    // PLAY → next uncompleted level
    const nextLevel = Math.min(sv.levelsUnlocked, 12);
    const startNext = () => { this.snd.resume(); this.snd.ui(); this.scene.start("Game", { mode: "level", level: nextLevel }); };
    const play = this.add.text(W / 2, 372, done >= 12 ? "▶  PLAY" : `▶  PLAY — LEVEL ${nextLevel}`, f("40px", { backgroundColor: "#ff9ed2", color: "#3a2260" }))
      .setOrigin(0.5).setPadding(52, 17, 52, 17).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: play, scale: 1.05, duration: 550, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    play.on("pointerdown", startNext);

    // LEVELS + SHOP
    const lvls = this.add.text(W / 2 - 118, 462, "🗺 LEVELS", f("23px", { backgroundColor: "#3a2260", color: "#cbb7ff" }))
      .setOrigin(0.5).setPadding(28, 12, 28, 12).setInteractive({ useHandCursor: true });
    lvls.on("pointerdown", () => { this.snd.ui(); this.scene.start("LevelSelect"); });
    const shop = this.add.text(W / 2 + 118, 462, "★ STAR SHOP", f("23px", { backgroundColor: "#3a2260", color: "#ffd94e" }))
      .setOrigin(0.5).setPadding(28, 12, 28, 12).setInteractive({ useHandCursor: true });
    shop.on("pointerdown", () => { this.snd.ui(); this.scene.start("Shop"); });

    // how to play
    [
      "LEFT side / A — Elizabeth jumps",
      "RIGHT side / L — Flofy (flying by her side!) boosts up",
      "Grab BOTH stars together = SYNC → fill the meter → FAIRY RUSH!",
    ].forEach((line, i) => {
      this.add.text(W / 2, 552 + i * 30, line, f("17px", {
        color: i === 2 ? "#8ef5c9" : "#e8dcff", fontStyle: "normal",
      })).setOrigin(0.5);
    });
    this.add.text(W / 2, 660, "Can your brain guide them both at once?", f("18px", { color: "#ffd94e" })).setOrigin(0.5);

    this.input.keyboard.on("keydown-SPACE", startNext);
    this.input.keyboard.on("keydown-ENTER", startNext);

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
