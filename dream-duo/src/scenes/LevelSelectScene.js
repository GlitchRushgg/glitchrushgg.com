// Level map: 12 levels in a grid with star ratings; Endless Dream unlocks
// after 8 completed levels.

import { W, H } from "../const.js";
import { LEVELS, ENDLESS_UNLOCK } from "../levels.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

const FONT = "'Segoe UI', system-ui, sans-serif";

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super("LevelSelect"); }

  create() {
    this.snd = new Sound();
    const sv = Save.get();
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    this.add.rectangle(W / 2, H / 2, W, H, 0x1b1338);
    this.add.image(0, 0, "duo-hero").setOrigin(0).setDisplaySize(W, H).setAlpha(0.16);
    this.add.text(W / 2, 52, "CHOOSE A LEVEL", f("42px", { color: "#ffd6ec" })).setOrigin(0.5);
    const done = Object.keys(sv.levelStars).length;
    this.add.text(W / 2, 100, `${done}/${LEVELS.length} completed`, f("18px", { color: "#cbb7ff" })).setOrigin(0.5);

    const cols = 6, bw = 150, bh = 150, gx = 32, gy = 40;
    const x0 = W / 2 - ((cols * bw + (cols - 1) * gx) / 2) + bw / 2;
    const y0 = 210;

    LEVELS.forEach((L, i) => {
      const n = i + 1;
      const col = i % cols, row = Math.floor(i / cols);
      const x = x0 + col * (bw + gx), y = y0 + row * (bh + gy);
      const unlocked = n <= sv.levelsUnlocked;
      const rating = sv.levelStars[n] || 0;

      const box = this.add.rectangle(x, y, bw, bh, unlocked ? 0x2f2358 : 0x1d1738, 0.95)
        .setStrokeStyle(3, unlocked ? (rating ? 0xffd94e : 0xb9a6ff) : 0x3a3358);
      this.add.text(x, y - 26, unlocked ? String(n) : "🔒", f(unlocked ? "44px" : "34px", { color: unlocked ? "#fff" : "#6b639a" })).setOrigin(0.5);
      for (let s = 0; s < 3; s++) {
        const st = this.add.image(x - 34 + s * 34, y + 34, "star").setScale(0.5);
        if (s >= rating) st.setTint(0x555577).setAlpha(unlocked ? 0.4 : 0.15);
      }
      if (unlocked) {
        box.setInteractive({ useHandCursor: true });
        box.on("pointerdown", () => {
          this.snd.ui();
          this.scene.start("Game", { mode: "level", level: n });
        });
      }
    });

    // Endless Dream
    const endlessOpen = done >= ENDLESS_UNLOCK;
    const ey = y0 + 2 * (bh + gy) + 26;
    const eb = this.add.text(W / 2, ey, endlessOpen ? "🌙  ENDLESS DREAM" : `🔒 ENDLESS DREAM — finish ${ENDLESS_UNLOCK} levels`,
      f("24px", { backgroundColor: endlessOpen ? "#3a2260" : "#242043", color: endlessOpen ? "#ffd94e" : "#6b639a" }))
      .setOrigin(0.5).setPadding(30, 12, 30, 12);
    if (endlessOpen) {
      eb.setInteractive({ useHandCursor: true });
      eb.on("pointerdown", () => { this.snd.ui(); this.scene.start("Game", { mode: "endless" }); });
      this.add.text(W / 2, ey + 46, `Best: ${sv.best}`, f("16px", { color: "#cbb7ff" })).setOrigin(0.5);
    }

    const back = this.add.text(24, 20, "◀ MENU", f("20px", { backgroundColor: "#3a2260" }))
      .setPadding(18, 9, 18, 9).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Menu"));
  }
}
