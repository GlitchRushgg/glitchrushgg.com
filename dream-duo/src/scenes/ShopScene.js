// Star Shop: Elizabeth skins (with perks) + Flofy trails. Stars = persistent
// currency (market study rec #4 — the reason to come back).

import { W, H } from "../const.js";
import { SKINS, TRAILS } from "../items.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

const FONT = "'Segoe UI', system-ui, sans-serif";

export class ShopScene extends Phaser.Scene {
  constructor() { super("Shop"); }

  create() {
    this.snd = new Sound();
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    this.add.rectangle(W / 2, H / 2, W, H, 0x1b1338);
    this.add.image(0, 0, "duo-hero").setOrigin(0).setDisplaySize(W, H).setAlpha(0.14);

    this.add.text(W / 2, 44, "★ STAR SHOP", f("44px", { color: "#ffd94e" })).setOrigin(0.5);
    this.starTxt = this.add.text(W / 2, 92, "", f("22px", { color: "#ffd94e" })).setOrigin(0.5);

    this.add.text(200, 136, "ELIZABETH SKINS", f("20px", { color: "#ff9ed2" }));
    this.add.text(200, 420, "FLOFY TRAILS", f("20px", { color: "#8ef5c9" }));

    this._cards = [];
    this._render();

    const back = this.add.text(W / 2, H - 44, "◀ BACK", f("22px", { backgroundColor: "#3a2260" }))
      .setOrigin(0.5).setPadding(26, 10, 26, 10).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Menu"));
  }

  _render() {
    const sv = Save.get();
    this.starTxt.setText(`You have ★ ${sv.stars}`);
    this._cards.forEach((c) => c.destroy(true));
    this._cards = [];
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    SKINS.forEach((s, i) => {
      const x = 320 + i * 320, y = 272;
      const c = this.add.container(0, 0);
      const owned = sv.skins.includes(s.id);
      const equipped = sv.skin === s.id;
      const box = this.add.rectangle(x, y, 290, 230, equipped ? 0x3a2a68 : 0x241a4a, 0.95)
        .setStrokeStyle(3, equipped ? 0xffd94e : 0xb9a6ff).setInteractive({ useHandCursor: true });
      c.add(box);
      const artKey = s.id === "fairy" ? "shop-fairy" : "eliz-run-a";
      const art = this.add.image(x - 88, y - 8, artKey);
      art.setScale(140 / art.height);
      if (s.id === "golden") art.setTint(0xffd57a);
      c.add(art);
      c.add(this.add.text(x + 24, y - 78, s.name, f("19px")).setOrigin(0.5, 0));
      c.add(this.add.text(x + 24, y - 44, s.desc, f("14px", { color: "#cbb7ff", fontStyle: "normal", wordWrap: { width: 170 }, align: "center" })).setOrigin(0.5, 0));
      const label = equipped ? "EQUIPPED" : owned ? "EQUIP" : `★ ${s.cost}`;
      const btnColor = equipped ? "#8ef5c9" : owned ? "#ffd6ec" : "#ffd94e";
      c.add(this.add.text(x + 24, y + 74, label, f("18px", { color: btnColor })).setOrigin(0.5));
      box.on("pointerdown", () => this._buySkin(s));
      this._cards.push(c);
    });

    TRAILS.forEach((t, i) => {
      const x = 260 + i * 250, y = 530;
      const c = this.add.container(0, 0);
      const owned = sv.trails.includes(t.id);
      const equipped = sv.trail === t.id;
      const box = this.add.rectangle(x, y, 220, 150, equipped ? 0x1f3d33 : 0x241a4a, 0.95)
        .setStrokeStyle(3, equipped ? 0x8ef5c9 : 0xb9a6ff).setInteractive({ useHandCursor: true });
      c.add(box);
      // trail preview: three sparkles
      for (let k = 0; k < 3; k++) {
        const tint = t.tint === -1 ? [0xff6b6b, 0xffd94e, 0x7fd4ff][k] : t.tint;
        c.add(this.add.image(x - 40 + k * 40, y - 30, "sparkle").setTint(tint).setScale(1.4 - k * 0.25));
      }
      c.add(this.add.text(x, y + 8, t.name, f("16px")).setOrigin(0.5));
      const label = equipped ? "EQUIPPED" : owned ? "EQUIP" : `★ ${t.cost}`;
      c.add(this.add.text(x, y + 44, label, f("16px", { color: equipped ? "#8ef5c9" : owned ? "#ffd6ec" : "#ffd94e" })).setOrigin(0.5));
      box.on("pointerdown", () => this._buyTrail(t));
      this._cards.push(c);
    });
  }

  _buySkin(s) {
    const sv = Save.get();
    if (sv.skins.includes(s.id)) { sv.skin = s.id; Save.persist(); this.snd.ui(); }
    else if (Save.spendStars(s.cost)) { sv.skins.push(s.id); sv.skin = s.id; Save.persist(); this.snd.fanfare(); }
    else this.snd.deny();
    this._render();
  }

  _buyTrail(t) {
    const sv = Save.get();
    if (sv.trails.includes(t.id)) { sv.trail = t.id; Save.persist(); this.snd.ui(); }
    else if (Save.spendStars(t.cost)) { sv.trails.push(t.id); sv.trail = t.id; Save.persist(); this.snd.fanfare(); }
    else this.snd.deny();
    this._render();
  }
}
