// Tienda de perks PERMANENTES (monedas): Vitalidad, Potencia, Agilidad,
// Fortuna — 3 niveles cada uno. La zanahoria de replay del juego.

import { W, H, PAL } from "../const.js";
import { t } from "../i18n.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { PERKS } from "../items.js";

const ICONS = { vit: "heart", pow: "bullet", agi: "player", luck: "coin" };

export class ShopScene extends Phaser.Scene {
  constructor() {
    super("Shop");
  }

  create() {
    this.snd = new Sound();
    const g = this.add.graphics();
    g.fillGradientStyle(PAL.bgTop, PAL.bgTop, PAL.bgBottom, PAL.bgBottom, 1);
    g.fillRect(0, 0, W, H);
    this.add.tileSprite(W / 2, H / 2, W, H, "grid").setTint(PAL.grid).setAlpha(0.18);

    const f = (size, extra = {}) => ({
      fontFamily: "'Consolas', 'Courier New', monospace",
      fontSize: size, color: "#ffffff", fontStyle: "bold", ...extra,
    });

    this.add.text(W / 2, 60, "⬆  " + t("shop"), f("40px", { color: "#ffd94e" })).setOrigin(0.5);
    this.add.image(W / 2 - 46, 116, "coin").setTint(PAL.coin).setScale(1.2);
    this.add.text(W / 2 - 28, 116, `${Save.coins()} ${t("coins")}`, f("22px", { color: "#ffd94e" })).setOrigin(0, 0.5);

    PERKS.forEach((perk, i) => this._card(perk, 205 + i * 292, 380));

    const back = this.add.text(W / 2, H - 66, "←  " + t("back"), f("24px", { backgroundColor: "#241a0c" }))
      .setOrigin(0.5).setPadding(26, 12, 26, 12).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Menu"));
  }

  _card(perk, x, y) {
    const lvl = Save.perkLevel(perk.id);
    const maxed = lvl >= perk.prices.length;
    const price = maxed ? 0 : perk.prices[lvl];

    const panel = this.add.rectangle(x, y, 250, 300, 0x1f1608, 0.95)
      .setStrokeStyle(2, maxed ? 0x7cff5e : 0x5a4a22)
      .setInteractive({ useHandCursor: true });

    this.add.image(x, y - 90, ICONS[perk.id]).setScale(1.8)
      .setTint(perk.id === "vit" ? PAL.hurt : perk.id === "luck" ? PAL.coin : PAL.player);

    this.add.text(x, y - 28, t("pk_" + perk.id), {
      fontFamily: "'Consolas', monospace", fontSize: "24px", color: "#ffc93e", fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(x, y + 8, t("pk_" + perk.id + "_d"), {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "17px", color: "#ffffff",
      align: "center", wordWrap: { width: 210 },
    }).setOrigin(0.5);

    // Pips de nivel.
    for (let i = 0; i < perk.prices.length; i++) {
      this.add.rectangle(x - 30 + i * 30, y + 52, 22, 8, i < lvl ? 0x7cff5e : 0x3a2f18, 1);
    }
    this.add.text(x, y + 76, t("lvlTag", { n: lvl }), {
      fontFamily: "'Consolas', monospace", fontSize: "14px", color: "#8a6a30",
    }).setOrigin(0.5);

    const label = maxed ? t("maxed") : t("buyFor", { n: price });
    const color = maxed ? "#7cff5e" : "#ffd94e";
    const action = this.add.text(x, y + 116, label, {
      fontFamily: "'Consolas', monospace", fontSize: "18px", color, fontStyle: "bold",
    }).setOrigin(0.5);

    panel.on("pointerdown", () => {
      if (maxed) return;
      if (Save.spend(price)) {
        Save.upPerk(perk.id);
        this.snd.levelUp();
        this.scene.restart();
      } else {
        this.snd.hurt();
        action.setText(t("notEnough")).setColor("#ff4e3a");
        this.tweens.add({ targets: panel, x: x + 6, duration: 50, yoyo: true, repeat: 3 });
        this.time.delayedCall(1100, () => action.setText(label).setColor(color));
      }
    });
  }
}
