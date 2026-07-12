// Star Shop v2 (portrait): Elizabeth skins (con perk) + Flofy trails.
// Las estrellas son la moneda persistente — la razón de volver.

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
    const hero = this.add.image(W / 2, H / 2, "duo-hero");
    hero.setScale(Math.max(W / hero.width, H / hero.height)).setAlpha(0.12);

    this.add.text(W / 2, 40, "★ STAR SHOP", f("32px", { color: "#ffd94e" })).setOrigin(0.5);
    this.starTxt = this.add.text(W / 2, 78, "", f("17px", { color: "#ffd94e" })).setOrigin(0.5);

    this._cards = [];
    this._render();

    const back = this.add.text(W / 2, H - 40, "◀ BACK", f("19px", { backgroundColor: "#3a2260" }))
      .setOrigin(0.5).setPadding(24, 10, 24, 10).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Menu"));
  }

  _render() {
    const sv = Save.get();
    this.starTxt.setText(`You have ★ ${sv.stars}`);
    this._cards.forEach((c) => c.destroy(true));
    this._cards = [];
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    this.add.text(30, 108, "ELIZABETH SKINS", f("15px", { color: "#ff9ed2" }));
    SKINS.forEach((s, i) => {
      const y = 190 + i * 118;
      const c = this.add.container(0, 0);
      const owned = sv.skins.includes(s.id);
      const equipped = sv.skin === s.id;
      const box = this.add.rectangle(W / 2, y, 340, 106, equipped ? 0x3a2a68 : 0x241a4a, 0.95)
        .setStrokeStyle(3, equipped ? 0xffd94e : 0xb9a6ff).setInteractive({ useHandCursor: true });
      c.add(box);
      const artKey = s.id === "fairy" ? "shop-fairy" : "eliz-back-a";
      const art = this.add.image(72, y, artKey);
      art.setScale(88 / art.height);
      if (s.id === "golden") art.setTint(0xffd57a);
      c.add(art);
      c.add(this.add.text(120, y - 34, s.name, f("16px")).setOrigin(0, 0));
      c.add(this.add.text(120, y - 8, s.desc, f("12.5px", { color: "#cbb7ff", fontStyle: "normal", wordWrap: { width: 165 } })).setOrigin(0, 0));
      const label = equipped ? "EQUIPPED" : owned ? "EQUIP" : `★ ${s.cost}`;
      const btnColor = equipped ? "#8ef5c9" : owned ? "#ffd6ec" : "#ffd94e";
      c.add(this.add.text(W - 42, y, label, f("14px", { color: btnColor })).setOrigin(1, 0.5));
      box.on("pointerdown", () => this._buySkin(s));
      this._cards.push(c);
    });

    this.add.text(30, 548, "FLOFY TRAILS", f("15px", { color: "#8ef5c9" }));
    TRAILS.forEach((t, i) => {
      const x = i % 2 === 0 ? W / 2 - 88 : W / 2 + 88;
      const y = 616 + Math.floor(i / 2) * 92;
      const c = this.add.container(0, 0);
      const owned = sv.trails.includes(t.id);
      const equipped = sv.trail === t.id;
      const box = this.add.rectangle(x, y, 164, 80, equipped ? 0x1f3d33 : 0x241a4a, 0.95)
        .setStrokeStyle(3, equipped ? 0x8ef5c9 : 0xb9a6ff).setInteractive({ useHandCursor: true });
      c.add(box);
      for (let k = 0; k < 3; k++) {
        const tint = t.tint === -1 ? [0xff6b6b, 0xffd94e, 0x7fd4ff][k] : t.tint;
        c.add(this.add.image(x - 28 + k * 28, y - 16, "sparkle").setTint(tint).setScale(1.2 - k * 0.2));
      }
      c.add(this.add.text(x, y + 4, t.name, f("12.5px")).setOrigin(0.5, 0));
      const label = equipped ? "EQUIPPED" : owned ? "EQUIP" : `★ ${t.cost}`;
      c.add(this.add.text(x, y + 24, label, f("12px", { color: equipped ? "#8ef5c9" : owned ? "#ffd6ec" : "#ffd94e" })).setOrigin(0.5, 0));
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
