// Tienda: skins (forma+color del orbe) y estelas, compradas con bits.
// Tocar una tarjeta: equipa si es tuya, compra si te llegan los bits.

import { W, H, SECTORS, RAIL_COLORS } from "../const.js";
import { t, getLang } from "../i18n.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { SKINS, TRAILS } from "../items.js";

export class ShopScene extends Phaser.Scene {
  constructor() {
    super("Shop");
  }

  create() {
    this.snd = new Sound();
    const pal = SECTORS[0];
    const g = this.add.graphics();
    g.fillGradientStyle(pal.top, pal.top, pal.bottom, pal.bottom, 1);
    g.fillRect(0, 0, W, H);
    this.add.tileSprite(W / 2, H / 2, W, H, "grid").setTint(pal.grid).setAlpha(0.18);

    const f = (size, extra = {}) => ({
      fontFamily: "'Consolas', 'Courier New', monospace",
      fontSize: size, color: "#ffffff", fontStyle: "bold", ...extra,
    });

    this.add.text(W / 2, 44, "◆  " + t("shop"), f("40px", { color: "#ffd94e" })).setOrigin(0.5);
    this.add.image(W / 2 - 40, 92, "bit").setTint(0xffd94e).setScale(1.2);
    this.balance = this.add.text(W / 2 - 22, 92, `${Save.bits()} ${t("bits")}`, f("22px", { color: "#ffd94e" })).setOrigin(0, 0.5);

    this.add.text(40, 128, t("skins"), f("20px", { color: "#27e7ff" }));
    SKINS.forEach((item, i) => this._card(item, "skin", 120 + (i % 6) * 180, 254));

    this.add.text(40, 388, t("trails"), f("20px", { color: "#ff3ea5" }));
    TRAILS.forEach((item, i) => this._card(item, "trail", 120 + (i % 6) * 180, 514));

    const back = this.add.text(W / 2, H - 56, "←  " + t("back"), f("24px", { backgroundColor: "#1a2a4a" }))
      .setOrigin(0.5).setPadding(26, 12, 26, 12).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => { this.snd.ui(); this.scene.start("Menu"); });
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Menu"));
  }

  _card(item, kind, x, y) {
    const owned = item.price === 0 || Save.owned(item.id);
    const equipped = (kind === "skin" ? Save.skin() : Save.trail()) === item.id;

    const panel = this.add.rectangle(x, y, 160, 190, 0x101a36, 0.9)
      .setStrokeStyle(2, equipped ? 0x7cffb2 : 0x2a3a7a)
      .setInteractive({ useHandCursor: true });

    // Icono.
    if (kind === "skin") {
      const tint = item.color === 0xffffff ? RAIL_COLORS[0] : item.color;
      this.add.image(x, y - 40, item.tex).setScale(1.1).setTint(tint);
    } else {
      // Estela: tira de chispas del color (arcoíris = 3 colores).
      const cols = item.color === "rainbow" ? [0xff4e6a, 0xffd94e, 0x27e7ff]
        : [item.color === null ? RAIL_COLORS[0] : item.color];
      cols.forEach((c, i) =>
        [0, 1, 2, 3].forEach((j) =>
          this.add.image(x - 28 + j * 18, y - 40 + (i - (cols.length - 1) / 2) * 14, "spark")
            .setTint(c).setAlpha(0.3 + j * 0.22).setScale(0.7 + j * 0.18)));
    }

    const name = item.name[getLang()] || item.name.en;
    this.add.text(x, y + 22, name, {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "18px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);

    const label = equipped ? t("equipped") : owned ? t("equip") : t("buy", { n: item.price });
    const color = equipped ? "#7cffb2" : owned ? "#27e7ff" : "#ffd94e";
    const action = this.add.text(x, y + 62, label, {
      fontFamily: "'Consolas', monospace", fontSize: "16px", color, fontStyle: "bold",
    }).setOrigin(0.5);

    panel.on("pointerdown", () => {
      if (equipped) return;
      if (owned) {
        kind === "skin" ? Save.setSkin(item.id) : Save.setTrail(item.id);
        this.snd.ui();
        this.scene.restart();
      } else if (Save.spend(item.price)) {
        Save.own(item.id);
        kind === "skin" ? Save.setSkin(item.id) : Save.setTrail(item.id);
        this.snd.shield();
        this.scene.restart();
      } else {
        this.snd.near();
        action.setText(t("notEnough")).setColor("#ff4e6a");
        this.tweens.add({ targets: panel, x: x + 6, duration: 50, yoyo: true, repeat: 3 });
        this.time.delayedCall(1100, () => action.setText(label).setColor(color));
      }
    });
  }
}
