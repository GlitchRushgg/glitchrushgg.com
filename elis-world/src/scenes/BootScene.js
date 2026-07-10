// Loads all house art with graceful placeholders (a missing prop must never
// break Elizabeth's game), normalizes character heights, and builds the
// procedural textures: floors, wall patterns, frames, particles.

import { W, H, PAINTS } from "../const.js";
import { ROOMS } from "../data/rooms.js";
import { FOODS } from "../data/rooms.js";

const CHARS = ["elizabeth", "flofy", "mama", "papa", "cristian"];

export class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }

  preload() {
    this._missing = new Set();
    this.load.on("loaderror", (file) => this._missing.add(file.key));

    this.add.rectangle(W / 2, H / 2 + 40, 448, 22).setStrokeStyle(3, 0xff9ed2);
    const bar = this.add.rectangle(W / 2 - 220, H / 2 + 40, 8, 14, 0xff9ed2).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2 - 40, "ELI'S WORLD", {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "44px", color: "#a05a78", fontStyle: "bold",
    }).setOrigin(0.5);
    this.load.on("progress", (p) => { bar.width = 440 * p; });

    // family
    for (const c of CHARS) this.load.image(c, `assets/art/${c}.png`);
    this.load.image("celebrating", "assets/art/celebrating.png");
    // furniture (every key used across rooms)
    const keys = new Set();
    Object.values(ROOMS).forEach((r) => r.furniture.forEach((f) => keys.add(f.key)));
    keys.add("fridge-open");
    keys.delete("rug"); // procedural (BootScene._procedural)
    for (const k of keys) this.load.image(k, `assets/art/${k}.png`);
    // foods (+ cooked variants)
    for (const [k, v] of Object.entries(FOODS)) {
      this.load.image(k, `assets/art/${k}.png`);
      if (v.cooked) this.load.image(v.cooked, `assets/art/${v.cooked}.png`);
    }
    // crayon artworks for frames
    for (const a of ["crayon-family", "crayon-rainbow", "crayon-bunny"]) this.load.image(a, `assets/art/${a}.png`);
    // artwork backgrounds (copied local — self-contained, bug QA #3)
    this.load.image("reuse-beach", "assets/art/reuse-beach.jpg");
    this.load.image("reuse-italy", "assets/art/reuse-italy.jpg");
    this.load.image("reuse-dream", "assets/art/reuse-dream.jpg");
  }

  create() {
    // placeholders for anything missing
    const all = this.load.list;
    for (const k of this._missing) this._placeholder(k);

    this._procedural();
    this._normalize();
    this._buildArtworks();
    this.scene.start("Menu");
  }

  _placeholder(k) {
    if (this.textures.exists(k)) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffc9dd, 1);
    g.fillRoundedRect(0, 0, 120, 120, 20);
    g.fillStyle(0xa05a78, 1);
    g.fillCircle(45, 55, 8); g.fillCircle(75, 55, 8);
    g.generateTexture(k, 120, 120);
    g.destroy();
  }

  _procedural() {
    const g = () => this.make.graphics({ add: false });
    let t;

    // alfombra procedural (la IA no la recortaba limpia): elipses pastel
    if (this.textures.exists("rug")) this.textures.remove("rug");
    t = g();
    [[0xfff3e0, 150, 60], [0xd8c3f0, 126, 50], [0xffd1dc, 102, 40], [0xfff3e0, 78, 30], [0xffb3cd, 52, 20]]
      .forEach(([col, rx, ry]) => { t.fillStyle(col, 1); t.fillEllipse(155, 66, rx * 2, ry * 2); });
    t.generateTexture("rug", 310, 132);
    t.destroy();

    // pixel + sparkle + heart + bubble + steam puff
    t = g(); t.fillStyle(0xffffff, 1); t.fillRect(0, 0, 4, 4); t.generateTexture("px", 4, 4); t.destroy();
    t = g();
    t.fillStyle(0xffffff, 1); t.fillCircle(7, 7, 3);
    t.fillRect(6, 0, 2, 14); t.fillRect(0, 6, 14, 2);
    t.generateTexture("sparkle", 14, 14); t.destroy();
    t = g();
    t.fillStyle(0xff6b96, 1);
    t.fillCircle(9, 8, 7); t.fillCircle(19, 8, 7); t.fillTriangle(2, 11, 26, 11, 14, 26);
    t.generateTexture("heart", 28, 27); t.destroy();
    t = g();
    t.fillStyle(0xbfeaff, 0.4); t.fillCircle(10, 10, 9);
    t.lineStyle(2, 0xe6f8ff, 0.9); t.strokeCircle(10, 10, 9);
    t.generateTexture("bubble", 20, 20); t.destroy();
    t = g();
    t.fillStyle(0xffffff, 0.8);
    [[10, 14, 8], [20, 10, 9], [30, 14, 8]].forEach(([x, y, r]) => t.fillCircle(x, y, r));
    t.generateTexture("puff", 40, 24); t.destroy();

    // glow disc
    t = g();
    for (let i = 8; i >= 1; i--) { t.fillStyle(0xfff2b0, 0.05 + (8 - i) * 0.02); t.fillCircle(40, 40, i * 5); }
    t.generateTexture("glowdisc", 80, 80); t.destroy();

    // floors
    t = g(); // wood
    for (let i = 0; i < 8; i++) {
      t.fillStyle(i % 2 ? 0xd8a468 : 0xcf9a5c, 1);
      t.fillRect(0, i * 25, 200, 25);
      t.fillStyle(0xb9834a, 0.5); t.fillRect(0, i * 25 + 23, 200, 2);
      t.fillStyle(0xb9834a, 0.35); t.fillRect(((i * 73) % 200), i * 25 + 4, 2, 17);
    }
    t.generateTexture("floor-wood", 200, 200); t.destroy();
    t = g(); // tiles
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      t.fillStyle((x + y) % 2 ? 0xeef6f8 : 0xcfe8ea, 1);
      t.fillRect(x * 50, y * 50, 50, 50);
    }
    t.lineStyle(2, 0xb9d4d8, 0.6);
    for (let i = 0; i <= 4; i++) { t.lineBetween(i * 50, 0, i * 50, 200); t.lineBetween(0, i * 50, 200, i * 50); }
    t.generateTexture("floor-tiles", 200, 200); t.destroy();
    t = g(); // grass
    t.fillStyle(0x8fce6a, 1); t.fillRect(0, 0, 200, 200);
    for (let i = 0; i < 60; i++) {
      t.fillStyle(i % 2 ? 0x7dbd58 : 0xa2dd7e, 0.8);
      const x = (i * 37) % 200, y = (i * 53) % 200;
      t.fillTriangle(x, y + 8, x + 3, y, x + 6, y + 8);
    }
    t.generateTexture("floor-grass", 200, 200); t.destroy();

    // fence (paintable, garden's "wall")
    t = g();
    t.fillStyle(0xffffff, 1);
    for (let i = 0; i < 4; i++) {
      t.fillRoundedRect(i * 50 + 6, 0, 38, 180, 8);
    }
    t.fillRect(0, 30, 200, 18); t.fillRect(0, 110, 200, 18);
    t.generateTexture("fence", 200, 180); t.destroy();

    // wall patterns (white overlays, tinted wall shows through)
    t = g();
    t.fillStyle(0xffffff, 0.35);
    for (let i = 0; i < 4; i++) t.fillRect(i * 50, 0, 22, 100);
    t.generateTexture("pat-stripes", 200, 100); t.destroy();
    t = g();
    t.fillStyle(0xffffff, 0.4);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) t.fillCircle(x * 50 + (y % 2 ? 25 : 0) + 12, y * 34 + 16, 7);
    t.generateTexture("pat-dots", 200, 100); t.destroy();
    t = g();
    t.fillStyle(0xffffff, 0.45);
    const star = (cx, cy, R, r) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? R : r, a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
      }
      t.fillPoints(pts, true);
    };
    for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) star(x * 66 + (y % 2 ? 33 : 16) + 10, y * 50 + 24, 10, 4);
    t.generateTexture("pat-stars", 200, 100); t.destroy();

    // window (sky + frame)
    t = g();
    t.fillStyle(0xbfe4ff, 1); t.fillRoundedRect(0, 0, 150, 120, 10);
    t.fillStyle(0xfff6c9, 1); t.fillCircle(38, 32, 14);
    t.fillStyle(0xffffff, 0.9); t.fillCircle(95, 40, 13); t.fillCircle(112, 44, 10); t.fillCircle(80, 44, 10);
    t.lineStyle(8, 0xa5713f, 1); t.strokeRoundedRect(4, 4, 142, 112, 8);
    t.lineBetween(75, 4, 75, 116);
    t.generateTexture("window", 150, 120); t.destroy();

    // painting frame (empty, artwork drawn inside via container)
    t = g();
    t.fillStyle(0xa5713f, 1); t.fillRoundedRect(0, 0, 120, 96, 6);
    t.fillStyle(0xfff8ea, 1); t.fillRect(10, 10, 100, 76);
    t.generateTexture("frame", 120, 96); t.destroy();

    // paint roller icon + frame icon + big soft button
    t = g();
    t.fillStyle(0xffffff, 1); t.fillRoundedRect(0, 0, 84, 84, 22);
    t.lineStyle(4, 0xffb3cd, 1); t.strokeRoundedRect(2, 2, 80, 80, 20);
    t.generateTexture("btn", 84, 84); t.destroy();
  }

  _normalize() {
    // shared display heights for the family (stored as scale in registry)
    const target = { elizabeth: 215, flofy: 150, mama: 265, papa: 260, cristian: 268 };
    for (const [k, h] of Object.entries(target)) {
      if (!this.textures.exists(k)) continue;
      const src = this.textures.get(k).getSourceImage();
      this.registry.set(`scale:${k}`, h / src.height);
    }
  }

  // Compose each artwork inside the wooden frame → single texture "art-*".
  _buildArtworks() {
    const jobs = [
      ["art-crayon-family", "crayon-family"], ["art-crayon-rainbow", "crayon-rainbow"],
      ["art-crayon-bunny", "crayon-bunny"],
      ["art-flofy", "flofy"], ["art-celebrating", "celebrating"],
      ["art-beach", "reuse-beach"], ["art-dream", "reuse-dream"], ["art-italy", "reuse-italy"],
    ];
    for (const [out, srcKey] of jobs) {
      if (this.textures.exists(out)) continue;
      const rt = this.make.renderTexture({ width: 120, height: 96, add: false });
      rt.draw("frame", 0, 0);
      if (this.textures.exists(srcKey)) {
        const src = this.textures.get(srcKey).getSourceImage();
        const img = this.make.image({ key: srcKey, add: false });
        const s = Math.max(100 / src.width, 76 / src.height);
        img.setScale(s).setOrigin(0.5);
        // crop-fit into the 100×76 opening
        rt.draw(img, 60, 48);
        // redraw frame edges over overflow
        const g = this.make.graphics({ add: false });
        g.fillStyle(0xa5713f, 1);
        g.fillRect(0, 0, 120, 10); g.fillRect(0, 86, 120, 10);
        g.fillRect(0, 0, 10, 96); g.fillRect(110, 0, 10, 96);
        rt.draw(g, 0, 0);
        g.destroy();
        img.destroy();
      }
      rt.saveTexture(out);
    }
  }
}
