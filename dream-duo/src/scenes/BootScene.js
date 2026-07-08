// Loads the Replicate art, normalizes character frames (shared scale per
// character so poses keep their relative size; origin bottom-center) and
// builds every procedural texture. Missing files fall back to placeholders
// so the game NEVER breaks on a lost asset.

import { W, H } from "../const.js";
import { SDK } from "../utils/SDK.js";

const ART = [
  "eliz-run-a", "eliz-run-b", "eliz-jump", "eliz-fairy",
  "flofy-hop", "flofy-fall", "flofy-front",
  "ob-hedge", "ob-bench", "ob-birdbath", "ob-pigeon",
  "ob-cloud", "ob-blocks", "ob-top",
  "pw-mama", "pw-papa", "pw-cristian", "shop-fairy",
];
const BGS = [
  "bg-park-day", "bg-park-sunset", "bg-park-night",
  "bg-dream-day", "bg-dream-sunset", "bg-dream-night", "duo-hero",
];

export class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }

  preload() {
    this._missing = new Set();
    this.load.on("loaderror", (file) => this._missing.add(file.key));

    const bar = this.add.rectangle(W / 2, H / 2, 10, 14, 0xff9ed2).setOrigin(0, 0.5).setX(W / 2 - 220);
    this.add.rectangle(W / 2, H / 2, 448, 22).setStrokeStyle(2, 0xb9a6ff);
    this.add.text(W / 2, H / 2 - 46, "DREAM DUO", {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "40px", color: "#ffd6ec", fontStyle: "bold",
    }).setOrigin(0.5);
    this.load.on("progress", (p) => { bar.width = 440 * p; });

    for (const k of ART) this.load.image(k, `assets/art/${k}.png`);
    for (const k of BGS) this.load.image(k, `assets/art/${k}.jpg`);
  }

  create() {
    // ---- placeholders for anything missing (game must never crash) ----
    for (const k of [...ART, ...BGS]) {
      if (!this.textures.exists(k) || this._missing.has(k)) this._placeholder(k);
    }

    this._procedural();
    SDK.loadingStop();
    this.scene.start("Menu");
  }

  _placeholder(k) {
    const g = this.make.graphics({ add: false });
    const isBg = k.startsWith("bg-") || k === "duo-hero";
    const w = isBg ? 1280 : 140, h = isBg ? 720 : 160;
    g.fillStyle(k.includes("dream") ? 0x8f7bd8 : 0x63b46a, 1);
    g.fillRoundedRect(0, 0, w, h, isBg ? 0 : 24);
    g.generateTexture(k, w, h);
    g.destroy();
  }

  _procedural() {
    const g = () => this.make.graphics({ add: false });

    // white pixel (particles / flashes / tint quads)
    let t = g(); t.fillStyle(0xffffff, 1); t.fillRect(0, 0, 4, 4); t.generateTexture("px", 4, 4); t.destroy();

    // golden star (currency + sync pickups)
    t = g();
    t.fillStyle(0xffd94e, 1);
    this._starPath(t, 26, 26, 24, 11, 5); t.fillPath();
    t.lineStyle(3, 0xfff6c9, 1); this._starPath(t, 26, 26, 24, 11, 5); t.strokePath();
    t.generateTexture("star", 52, 52); t.destroy();

    // heart
    t = g();
    t.fillStyle(0xff5e8a, 1);
    t.fillCircle(16, 14, 12); t.fillCircle(34, 14, 12);
    t.fillTriangle(4, 20, 46, 20, 25, 46);
    t.generateTexture("heart", 50, 48); t.destroy();

    // soft glow disc
    t = g();
    for (let i = 8; i >= 1; i--) {
      t.fillStyle(0xffffff, 0.05 + (8 - i) * 0.02);
      t.fillCircle(48, 48, i * 6);
    }
    t.generateTexture("glow", 96, 96); t.destroy();

    // sparkle
    t = g();
    t.fillStyle(0xffffff, 1);
    t.fillCircle(7, 7, 3);
    t.fillRect(6, 0, 2, 14); t.fillRect(0, 6, 14, 2);
    t.generateTexture("sparkle", 14, 14); t.destroy();

    // soap bubble obstacle (procedural beats the AI cut for translucency)
    t = g();
    t.fillStyle(0xbfeaff, 0.28); t.fillCircle(55, 55, 52);
    t.lineStyle(3, 0xe6f8ff, 0.9); t.strokeCircle(55, 55, 52);
    t.lineStyle(2, 0xffd1f0, 0.5); t.strokeCircle(55, 55, 46);
    t.fillStyle(0xffffff, 0.85); t.fillEllipse(36, 32, 22, 12);
    t.generateTexture("ob-bubble", 110, 110); t.destroy();

    // shield bubble (papá power-up)
    t = g();
    t.fillStyle(0x7fd4ff, 0.16); t.fillCircle(70, 70, 66);
    t.lineStyle(4, 0x9fe5ff, 0.85); t.strokeCircle(70, 70, 66);
    t.generateTexture("shield", 140, 140); t.destroy();

    // confetti
    t = g();
    [0xff9ed2, 0xb9a6ff, 0xffd94e, 0x8ef5c9, 0x7fd4ff].forEach((c, i) => {
      t.fillStyle(c, 1); t.fillRect(i * 12, 0, 9, 14);
    });
    t.generateTexture("confetti", 60, 14); t.destroy();

    // dream ribbon (divider between worlds)
    t = g();
    for (let x = 0; x < 128; x++) {
      const a = 0.25 + 0.2 * Math.sin(x / 9);
      t.fillStyle(0xcbb7ff, a);
      t.fillRect(x, 6 + Math.sin(x / 7) * 3, 1, 10);
    }
    t.generateTexture("ribbon", 128, 24); t.destroy();

    // ---- normalize character frame scales (shared per character) ----
    const norm = (keys, targetH) => {
      let maxH = 0;
      keys.forEach((k) => { if (this.textures.exists(k)) maxH = Math.max(maxH, this.textures.get(k).getSourceImage().height); });
      const s = maxH ? targetH / maxH : 1;
      keys.forEach((k) => this.registry.set(`scale:${k}`, s));
    };
    norm(["eliz-run-a", "eliz-run-b", "eliz-jump"], 158);
    norm(["eliz-fairy"], 150);
    norm(["flofy-hop", "flofy-fall"], 102);
    norm(["pw-mama", "pw-papa", "pw-cristian"], 132);
  }

  _starPath(t, cx, cy, R, r, n) {
    t.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 === 0 ? R : r;
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      i === 0 ? t.moveTo(x, y) : t.lineTo(x, y);
    }
    t.closePath();
  }
}
