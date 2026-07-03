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

    const g = this.add.graphics();
    g.fillGradientStyle(0x23324a, 0x23324a, 0x0e1626, 0x0e1626, 1);
    g.fillRect(0, 0, W, H);

    const f = (size, extra = {}) => ({
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: size, color: "#ffffff", fontStyle: "bold", ...extra,
    });

    const title = this._reason === "energy" ? "OUT OF ENERGY!" : "YOU FELL!";
    const hint = this._reason === "energy" ? "Grab more fruit next time 🍎" : "Watch those gaps!";
    this.add.text(W / 2, 96, title, f("56px", { color: "#ff8a5e", stroke: "#0e1626", strokeThickness: 8 })).setOrigin(0.5);
    this.add.text(W / 2, 150, hint, f("20px", { color: "#cfe4ff", fontStyle: "normal" })).setOrigin(0.5);

    // Cristian celebrating (it's still a great run!).
    const c = this.add.image(W / 2 - 300, H / 2 + 60, "cristian-celebrate");
    c.setScale(300 / c.height);
    this.tweens.add({ targets: c, angle: 3, duration: 800, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    this.add.text(W / 2 + 60, 250, "DISTANCE", f("20px", { color: "#cfe4ff" })).setOrigin(0.5);
    this.add.text(W / 2 + 60, 310, `${this._meters} m`, f("76px", { color: "#ffe066" })).setOrigin(0.5);
    this.add.text(W / 2 + 60, 380, `🐾 ${this._animals} animals rescued`, f("26px")).setOrigin(0.5);

    // Progreso de por vida: cada run —buena o mala— acerca a la siguiente insignia.
    if (hitMilestone) {
      const mi = this.add.text(W / 2 + 60, 418, `🎖 MILESTONE! ${total} animals saved!`, f("22px", { color: "#ffe066" })).setOrigin(0.5);
      this.tweens.add({ targets: mi, scale: 1.08, duration: 420, yoyo: true, repeat: -1 });
    } else if (next) {
      this.add.text(W / 2 + 60, 418, `🎖 ${total}/${next} to next badge`, f("18px", { color: "#cfe4ff", fontStyle: "normal" })).setOrigin(0.5);
    } else {
      this.add.text(W / 2 + 60, 418, `🎖 ${total} animals saved — all badges earned!`, f("18px", { color: "#ffe066", fontStyle: "normal" })).setOrigin(0.5);
    }

    if (isRecord) {
      const rec = this.add.text(W / 2 + 60, 458, "🏆 NEW RECORD!", f("26px", { color: "#7cd94e" })).setOrigin(0.5);
      this.tweens.add({ targets: rec, scale: 1.1, duration: 480, yoyo: true, repeat: -1 });
    } else {
      this.add.text(W / 2 + 60, 458, `🏆 Best: ${Save.best()} m`, f("20px", { color: "#cfe4ff" })).setOrigin(0.5);
    }

    const again = this.add.text(W / 2 + 60, 512, "▶  RETRY", f("30px", {
      backgroundColor: "#e8622c",
    })).setOrigin(0.5).setPadding(40, 14, 40, 14).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: again, scale: 1.05, duration: 560, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    again.on("pointerdown", () => { this.snd.ui(); this.scene.start("Game"); });

    const menu = this.add.text(W / 2 + 60, 584, "MENU", f("20px", { backgroundColor: "#23324a" }))
      .setOrigin(0.5).setPadding(24, 10, 24, 10).setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });

    const share = this.add.text(W / 2 + 60, 648, "🔗 SHARE", f("16px", { color: "#cfe4ff" }))
      .setOrigin(0.5).setPadding(14, 8, 14, 8).setInteractive({ useHandCursor: true });
    share.on("pointerdown", () => this._share());

    // Grace period + no auto-repeat: dying with SPACE held must not skip this screen.
    const retry = (e) => {
      if (e.repeat || this.time.now - this._bornAt < 450) return;
      this.scene.start("Game");
    };
    this._bornAt = this.time.now;
    this.input.keyboard.on("keydown-SPACE", retry);
    this.input.keyboard.on("keydown-ENTER", retry);
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
