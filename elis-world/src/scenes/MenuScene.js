// Title: warm and simple — one tap and you're home.

import { W, H } from "../const.js";
import { Sound } from "../utils/Sound.js";

const FONT = "'Segoe UI', system-ui, sans-serif";

export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }

  create() {
    this.snd = new Sound();

    // soft sky
    const g = this.add.graphics();
    g.fillGradientStyle(0xbfe4ff, 0xbfe4ff, 0xffeef5, 0xffeef5, 1);
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) {
      const c = this.add.image(Phaser.Math.Between(60, W - 60), Phaser.Math.Between(40, 240), "puff")
        .setScale(Phaser.Math.FloatBetween(2.5, 4.5)).setAlpha(0.85);
      this.tweens.add({ targets: c, x: c.x + Phaser.Math.Between(-40, 40), duration: 6000, yoyo: true, repeat: -1 });
    }

    // Elizabeth celebrating
    if (this.textures.exists("celebrating")) {
      const e = this.add.image(W / 2 - 330, H / 2 + 110, "celebrating");
      e.setScale(400 / e.height);
      this.tweens.add({ targets: e, y: e.y - 14, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    this.add.text(W / 2 + 60, 170, "ELI'S", {
      fontFamily: FONT, fontSize: "58px", color: "#ff6b96", fontStyle: "bold", stroke: "#ffffff", strokeThickness: 10,
    }).setOrigin(0.5);
    this.add.text(W / 2 + 60, 248, "WORLD", {
      fontFamily: FONT, fontSize: "96px", color: "#a05a78", fontStyle: "bold", stroke: "#ffffff", strokeThickness: 12,
    }).setOrigin(0.5);
    this.add.text(W / 2 + 60, 330, "Your house. Your stories. 🏠", {
      fontFamily: FONT, fontSize: "24px", color: "#a05a78",
    }).setOrigin(0.5);

    const play = this.add.text(W / 2 + 60, 460, "▶  PLAY", {
      fontFamily: FONT, fontSize: "46px", color: "#ffffff", fontStyle: "bold", backgroundColor: "#ff6b96",
    }).setOrigin(0.5).setPadding(60, 20, 60, 20).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: play, scale: 1.06, duration: 600, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    play.on("pointerdown", () => {
      this.snd.resume(); this.snd.ui();
      this.scene.start("House");
    });

    this.add.text(W / 2 + 60, 570, "Paint the walls · hang pictures · cook · play with the family", {
      fontFamily: FONT, fontSize: "18px", color: "#b98aa0",
    }).setOrigin(0.5);

    this._muteBtn = this.add.text(W - 24, 20, this.snd.muted ? "🔇" : "🔊", {
      fontFamily: FONT, fontSize: "24px", backgroundColor: "#ffffffaa",
    }).setOrigin(1, 0).setPadding(14, 10, 14, 10).setInteractive({ useHandCursor: true });
    this._muteBtn.on("pointerdown", () => {
      this.snd.setMuted(!this.snd.muted);
      this._muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
    });

    if (window.self === window.top) {
      const home = this.add.text(24, 20, "🏠", {
        fontFamily: FONT, fontSize: "24px", backgroundColor: "#ffffffaa",
      }).setPadding(14, 10, 14, 10).setInteractive({ useHandCursor: true });
      home.on("pointerdown", () => { window.location.href = "/"; });
    }

    this.input.keyboard.on("keydown-SPACE", () => this.scene.start("House"));
    this.input.keyboard.on("keydown-ENTER", () => this.scene.start("House"));
  }
}
