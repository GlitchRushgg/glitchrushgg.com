// Menu v2 (portrait): key art, PLAY (1 click — CG time-to-fun), misiones del
// día, best score, SHOP, mute, share, home (oculto dentro del iframe de CG).

import { W, H } from "../const.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { SDK } from "../utils/SDK.js";
import { getMissions } from "../missions.js";

const FONT = "'Segoe UI', system-ui, sans-serif";

export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }

  create() {
    this.snd = new Sound();
    const sv = Save.get();
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    // key art a cover (el arte es 16:9 → se recorta con gracia)
    const hero = this.add.image(W / 2, H / 2, "duo-hero");
    const s = Math.max(W / hero.width, H / hero.height);
    hero.setScale(s);
    this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.5);

    // title
    this.add.text(W / 2 + 3, 96, "DREAM DUO", f("42px", { color: "#3a2260" })).setOrigin(0.5).setAlpha(0.6);
    this.add.text(W / 2, 92, "DREAM DUO", f("42px", { color: "#ffd6ec", stroke: "#3a2260", strokeThickness: 7 })).setOrigin(0.5);
    this.add.text(W / 2, 138, "Elizabeth & Flofy", f("20px", { color: "#cbb7ff" })).setOrigin(0.5);
    this.add.text(W / 2, 172, "One brain. Two worlds.", f("16px", { color: "#ffe6b0", fontStyle: "normal" })).setOrigin(0.5);

    // best + stars
    this.add.text(W / 2 - 60, 214, sv.best > 0 ? `BEST ${sv.best}` : "NEW GAME", f("17px")).setOrigin(0.5);
    this.add.image(W / 2 + 34, 214, "star").setScale(0.45);
    this.add.text(W / 2 + 50, 214, `${sv.stars}`, f("17px", { color: "#ffd94e" })).setOrigin(0, 0.5);

    // PLAY
    const start = () => { this.snd.resume(); this.snd.ui(); this.scene.start("Game"); };
    const play = this.add.text(W / 2, 300, "▶  PLAY", f("34px", { backgroundColor: "#ff9ed2", color: "#3a2260" }))
      .setOrigin(0.5).setPadding(46, 16, 46, 16).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: play, scale: 1.05, duration: 550, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    play.on("pointerdown", start);
    this.input.keyboard.on("keydown-SPACE", start);
    this.input.keyboard.on("keydown-ENTER", start);

    // C8: DUO CHALLENGE — el modo dos-mundos-desde-el-segundo-0 se DESBLOQUEA
    // (el juego base empieza con una columna y Flofy despierta)
    if (sv.duoUnlocked) {
      const duo = this.add.text(W / 2, 366, "⚡ DUO CHALLENGE", f("17px", { backgroundColor: "#241a4a", color: "#8ef5c9" }))
        .setOrigin(0.5).setPadding(22, 9, 22, 9).setInteractive({ useHandCursor: true });
      duo.on("pointerdown", () => { this.snd.resume(); this.snd.ui(); this.scene.start("Game", { duo: true }); });
    }

    // cómo se juega — dos mundos, un tap por mano
    const how = this.add.container(0, 0);
    how.add(this.add.rectangle(W / 2, 405, 330, 84, 0x241a4a, 0.82).setStrokeStyle(2, 0xb9a6ff, 0.7));
    how.add(this.add.text(W / 4 + 10, 382, "🌳 LEFT tap", f("15px", { color: "#8ef5c9" })).setOrigin(0.5));
    how.add(this.add.text(W / 4 + 10, 408, "Elizabeth\nswitches path", f("13px", { color: "#e8dcff", align: "center", fontStyle: "normal" })).setOrigin(0.5, 0));
    how.add(this.add.text((3 * W) / 4 - 10, 382, "RIGHT tap 🌙", f("15px", { color: "#b9a6ff" })).setOrigin(0.5));
    how.add(this.add.text((3 * W) / 4 - 10, 408, "Flofy\nswitches cloud", f("13px", { color: "#e8dcff", align: "center", fontStyle: "normal" })).setOrigin(0.5, 0));
    this.add.text(W / 2, 462, "Catch EVERY star · dodge everything else", f("14px", { color: "#ffd94e", fontStyle: "normal" })).setOrigin(0.5);

    // misiones del día
    const ms = getMissions();
    this.add.text(W / 2, 505, "— TODAY'S MISSIONS —", f("14px", { color: "#cbb7ff" })).setOrigin(0.5);
    ms.forEach((m, i) => {
      const done = m.done;
      const y = 535 + i * 30;
      this.add.text(46, y, done ? "✅" : "⬜", { fontSize: "15px" }).setOrigin(0, 0.5);
      this.add.text(76, y, m.label, f("14px", { color: done ? "#8ef5c9" : "#e8dcff", fontStyle: "normal" })).setOrigin(0, 0.5);
      this.add.text(W - 44, y, done ? `★${m.reward}` : `${Math.min(m.progress, m.goal)}/${m.goal}`, f("13px", { color: "#ffd94e" })).setOrigin(1, 0.5);
    });

    // SHOP
    const shop = this.add.text(W / 2, 668, "★ STAR SHOP", f("19px", { backgroundColor: "#3a2260", color: "#ffd94e" }))
      .setOrigin(0.5).setPadding(24, 11, 24, 11).setInteractive({ useHandCursor: true });
    shop.on("pointerdown", () => { this.snd.ui(); this.scene.start("Shop"); });

    this.add.text(W / 2, 730, "Can your brain run two worlds at once?", f("14px", { color: "#ffd94e", fontStyle: "normal" })).setOrigin(0.5);

    // mute / share / home
    this._muteBtn = this.add.text(W - 14, 12, this.snd.muted ? "🔇" : "🔊", f("18px", { backgroundColor: "#3a2260cc" }))
      .setOrigin(1, 0).setPadding(11, 8, 11, 8).setInteractive({ useHandCursor: true });
    this._muteBtn.on("pointerdown", () => {
      this.snd.setMuted(!this.snd.muted);
      this._muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
    });
    // (P2 QA: antes en y=62 pisaba la "O" del título)
    const share = this.add.text(W - 14, H - 14, "SHARE", f("13px", { backgroundColor: "#3a2260cc", color: "#cbb7ff" }))
      .setOrigin(1, 1).setPadding(11, 7, 11, 7).setInteractive({ useHandCursor: true });
    share.on("pointerdown", () => this._share());
    if (window.self === window.top) {
      const home = this.add.text(14, 12, "🏠", f("18px", { backgroundColor: "#3a2260cc" }))
        .setOrigin(0, 0).setPadding(11, 8, 11, 8).setInteractive({ useHandCursor: true });
      home.on("pointerdown", () => { window.location.href = "/"; });
    }
  }

  async _share() {
    const sv = Save.get();
    const brag = sv.best > 0 ? `I scored ${sv.best}` : `I'm playing`;
    const text = `${brag} in DREAM DUO 🌙✨ — one brain, two worlds at the same time. Can you beat me?`;
    let url = location.href;
    const cg = await SDK.invite({ best: sv.best });
    if (cg) url = cg;
    try { if (navigator.share) { await navigator.share({ title: "Dream Duo", text, url }); return; } } catch (e) {}
    try { await navigator.clipboard.writeText(text + " " + url); this.snd.ui(); } catch (e) {}
  }
}
