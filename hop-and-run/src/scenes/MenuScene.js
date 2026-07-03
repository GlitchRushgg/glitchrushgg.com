// Menu: key art hero, title, best, PLAY (one click to gameplay), mute.

import { W, H } from "../const.js";
import { Save, MILESTONES } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    this.snd = new Sound();

    // Key art fills the screen, darkened at the bottom for legibility.
    const art = this.add.image(W / 2, H / 2, "key-art");
    const sc = Math.max(W / art.width, H / art.height);
    art.setScale(sc);
    const g = this.add.graphics();
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.72, 0.72);
    g.fillRect(0, H * 0.45, W, H * 0.55);

    const f = (size, extra = {}) => ({
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: size, color: "#ffffff", fontStyle: "bold", ...extra,
    });

    this.add.text(W / 2, H - 250, "HOP & RUN", f("74px", {
      stroke: "#e8622c", strokeThickness: 10,
    })).setOrigin(0.5);
    this.add.text(W / 2, H - 186, "Fruit is fuel. Animals need you. How far can you run?", f("22px", {
      color: "#ffe066", stroke: "#23324a", strokeThickness: 4, fontStyle: "normal",
    })).setOrigin(0.5);

    const best = Save.best();
    if (best > 0) {
      const total = Save.totalAnimals();
      const badges = MILESTONES.filter((m) => total >= m).length;
      const badgeTxt = badges > 0 ? ` · 🎖 ${"★".repeat(badges)}` : "";
      this.add.text(W / 2, H - 148,
        `🏆 Best: ${best} m · 🐾 ${total} saved${badgeTxt}`, f("20px")).setOrigin(0.5);
    }

    const play = this.add.text(W / 2, H - 84, "▶  PLAY", f("34px", {
      backgroundColor: "#e8622c",
    })).setOrigin(0.5).setPadding(46, 14, 46, 14).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: play, scale: 1.05, duration: 560, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    play.on("pointerdown", () => { this.snd.ui(); this.scene.start("Game"); });

    this.add.text(24, H - 40, "TAP / SPACE = jump · hold = higher · 🎸 = GUITAR SOLO", f("16px", {
      color: "#cfe4ff", fontStyle: "normal",
    }));

    this._muteBtn = this.add.text(W - 24, 20, this.snd.muted ? "🔇" : "🔊", f("26px", {
      backgroundColor: "#23324acc",
    })).setOrigin(1, 0).setPadding(16, 12, 16, 12).setInteractive({ useHandCursor: true });
    this._muteBtn.on("pointerdown", () => {
      this.snd.setMuted(!this.snd.muted);
      this._muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
      this.snd.ui();
    });

    this.input.keyboard.on("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard.on("keydown-ENTER", () => this.scene.start("Game"));
  }
}
