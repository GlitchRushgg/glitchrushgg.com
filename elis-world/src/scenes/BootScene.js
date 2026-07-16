// Loads all house art with graceful placeholders (a missing prop must never
// break Eli's game), normalizes character heights, and builds the procedural
// textures: PERSPECTIVE floors, wall patterns, window, frames, particles.

import { W, H, PAINTS, ACCESSORIES } from "../const.js";
import { ROOMS, FOODS, UTENSILS } from "../data/rooms.js";

// Solo Eli y sus juguetes (encargo fundadora: mamá/papá/Cristian fuera).
const CHARS = ["elizabeth", "flofy", "rainbow"];

// Banda de suelo: de FLOOR_Y (520) al fondo (720).
const FLOOR_H = 200;

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

    // Eli + juguetes
    for (const c of CHARS) this.load.image(c, `assets/art/${c}.png`);
    this.load.image("celebrating", "assets/art/celebrating.png");
    this.load.image("pet", "assets/art/pet-puppy.png");
    // dress-up accessories
    for (const a of Object.keys(ACCESSORIES)) this.load.image(a, `assets/art/${a}.png`);
    // furniture (every key used across rooms)
    const keys = new Set();
    Object.values(ROOMS).forEach((r) => r.furniture.forEach((f) => keys.add(f.key)));
    keys.add("fridge-open");
    keys.add("drawers-open");
    keys.add("fireplace-fire");
    keys.delete("rug"); // procedural (_procedural)
    for (const k of keys) this.load.image(k, `assets/art/${k}.png`);
    // utensilios de las gavetas
    for (const u of UTENSILS) this.load.image(u, `assets/art/${u}.png`);
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
    // vista del balcón
    this.load.image("city", "assets/art/city.jpg");
  }

  create() {
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

  /* =================== SUELOS EN PERSPECTIVA ===================
     Feedback fundadora: "a los espacios les falta profundidad, parece que el
     piso estuviese inclinado". Causa: el suelo era una textura plana repetida
     (tablas y baldosas rectas) → se leía como PARED tumbada. Solución: dibujar
     el suelo UNA vez a 1280×200 con punto de fuga: las juntas convergen hacia
     el fondo y las filas se separan hacia el jugador. Además se oscurece el
     fondo y se añade la sombra de contacto contra la pared. */

  // Cámara: el frente del suelo está a profundidad D0, el fondo a D1. Todo lo
  // que se ve encoge con 1/d, así que ancho y separación de filas salen de ahí
  // (y por eso BACK = D0/D1: los dos ejes encogen lo mismo y las baldosas
  // siguen pareciendo cuadradas).
  _px(x, t) {
    const VPX = W / 2, BACK = 1 / 3;
    return VPX + (x - VPX) * (BACK + (1 - BACK) * t);
  }
  // filas a 1/d: juntas apretadas al FONDO (t≈0), abiertas al frente (t=1).
  _rows(n) {
    const D0 = 1, D1 = 3, a = 1 / D1, b = 1 / D0;
    const out = [];
    for (let i = 0; i <= n; i++) {
      const d = D1 - (i / n) * (D1 - D0);
      const t = (1 / d - a) / (b - a);
      out.push({ t, y: t * FLOOR_H });
    }
    return out;
  }
  _quad(g, x0, x1, r0, r1) {
    g.fillPoints([
      { x: this._px(x0, r0.t), y: r0.y }, { x: this._px(x1, r0.t), y: r0.y },
      { x: this._px(x1, r1.t), y: r1.y }, { x: this._px(x0, r1.t), y: r1.y },
    ], true);
  }

  _perspectiveFloor(key, kind) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const g = this.make.graphics({ add: false });
    const rows = this._rows(9);
    const back = { t: 0, y: 0 }, front = { t: 1, y: FLOOR_H };

    // El suelo se dibuja MUCHO más ancho que la pantalla: al fondo todo se
    // comprime ×1/3 hacia el punto de fuga, así que si solo cubriera 0..1280
    // las esquinas del fondo quedarían vacías.
    const X0 = -1300, X1 = 2580;

    if (kind === "wood") {
      // tablas que HUYEN del jugador (convergen al fondo) = el golpe de
      // profundidad más barato que existe
      const N = 32, step = (X1 - X0) / N;
      for (let i = 0; i < N; i++) {
        g.fillStyle(i % 2 ? 0xd8a468 : 0xcf9a5c, 1);
        this._quad(g, X0 + i * step, X0 + (i + 1) * step, back, front);
        g.fillStyle(0xb9834a, 0.55);
        this._quad(g, X0 + (i + 1) * step - 4, X0 + (i + 1) * step, back, front);
      }
      // juntas de cabeza (las tablas no son infinitas)
      g.fillStyle(0xb9834a, 0.3);
      rows.slice(1, -1).forEach((r, i) => { if (i % 3 === 1) g.fillRect(0, r.y - 1, W, 2); });
    } else if (kind === "tiles") {
      const N = 32, step = (X1 - X0) / N;
      for (let ri = 0; ri < rows.length - 1; ri++) {
        for (let i = 0; i < N; i++) {
          g.fillStyle((i + ri) % 2 ? 0xeef6f8 : 0xcfe8ea, 1);
          this._quad(g, X0 + i * step, X0 + (i + 1) * step, rows[ri], rows[ri + 1]);
        }
      }
      g.fillStyle(0xb9d4d8, 0.5); // lechada
      for (let i = 0; i <= N; i++) this._quad(g, X0 + i * step - 3, X0 + i * step + 3, back, front);
      rows.forEach((r) => g.fillRect(0, r.y - 1, W, 2));
    } else { // grass
      g.fillStyle(0x8fce6a, 1); g.fillRect(0, 0, W, FLOOR_H);
      for (let i = 0; i < 260; i++) {
        const t = Math.pow(Math.random(), 0.6);      // más denso al fondo
        const y = t * FLOOR_H, s = 3 + t * 7;        // más grandes al frente
        g.fillStyle(i % 2 ? 0x7dbd58 : 0xa2dd7e, 0.85);
        const x = Math.random() * W;
        g.fillTriangle(x, y + s, x + s * 0.4, y, x + s * 0.8, y + s);
      }
    }

    // luz: el fondo se apaga, el frente recibe la luz de la sala
    for (let i = 0; i < 26; i++) {
      g.fillStyle(0x2a1c10, 0.1 * (1 - i / 26));
      g.fillRect(0, i * 2, W, 2);
    }
    // sombra de contacto contra la pared (lo que "pega" el suelo a la pared)
    for (let i = 0; i < 14; i++) {
      g.fillStyle(0x000000, 0.16 * (1 - i / 14));
      g.fillRect(0, i, W, 1);
    }
    g.generateTexture(key, W, FLOOR_H);
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

    // SOMBRA de contacto bajo cada mueble/personaje: sin esto todo "flota" y
    // el suelo se lee inclinado (feedback fundadora)
    t = g();
    for (let i = 12; i >= 1; i--) { t.fillStyle(0x1a1030, 0.055); t.fillEllipse(64, 24, i * 10.6, i * 4); }
    t.generateTexture("shadow", 128, 48); t.destroy();

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
    // gota de lluvia + copo (clima)
    t = g(); t.fillStyle(0xffffff, 1); t.fillRoundedRect(0, 0, 3, 14, 1.5); t.generateTexture("raindrop", 3, 14); t.destroy();
    t = g();
    t.fillStyle(0xffffff, 1); t.fillCircle(6, 6, 4);
    t.fillStyle(0xffffff, 0.55); t.fillRect(5, 0, 2, 12); t.fillRect(0, 5, 12, 2);
    t.generateTexture("snowflake", 12, 12); t.destroy();
    // nube (cielo nublado)
    t = g();
    t.fillStyle(0xffffff, 1);
    [[40, 42, 26], [80, 34, 32], [124, 44, 24], [62, 48, 22], [102, 50, 20]].forEach(([x, y, r]) => t.fillCircle(x, y, r));
    t.fillRect(30, 42, 100, 22);
    t.generateTexture("cloud", 160, 70); t.destroy();

    // glow disc
    t = g();
    for (let i = 8; i >= 1; i--) { t.fillStyle(0xfff2b0, 0.05 + (8 - i) * 0.02); t.fillCircle(40, 40, i * 5); }
    t.generateTexture("glowdisc", 80, 80); t.destroy();

    // suelos EN PERSPECTIVA (una imagen 1280×200, no un tileSprite plano)
    this._perspectiveFloor("floor-wood", "wood");
    this._perspectiveFloor("floor-tiles", "tiles");
    this._perspectiveFloor("floor-grass", "grass");

    // fence (paintable, garden's "wall")
    t = g();
    t.fillStyle(0xffffff, 1);
    for (let i = 0; i < 4; i++) t.fillRoundedRect(i * 50 + 6, 0, 38, 180, 8);
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

    // VENTANA en dos piezas: el cielo se tinta con la hora y el clima cae
    // dentro; el marco va encima y nunca se tiñe.
    // el cielo casi blanco + nubes en blanco puro: al teñirlo con la hora, las
    // nubes siempre quedan un punto más claras que el cielo (naranjas al
    // atardecer, azul oscuro de noche)
    t = g();
    t.fillStyle(0xe8f2fa, 1); t.fillRoundedRect(0, 0, 150, 120, 10);
    t.fillStyle(0xffffff, 1);
    [[38, 34, 13], [52, 38, 10], [26, 40, 9], [104, 28, 11], [117, 32, 8], [93, 33, 8]]
      .forEach(([x, y, r]) => t.fillCircle(x, y, r));
    t.generateTexture("window-sky", 150, 120); t.destroy();
    t = g();
    t.lineStyle(8, 0xa5713f, 1); t.strokeRoundedRect(4, 4, 142, 112, 8);
    t.lineBetween(75, 4, 75, 116);
    t.generateTexture("window-frame", 150, 120); t.destroy();
    // sol y luna (cielo y ventana)
    t = g();
    t.fillStyle(0xffe27a, 1); t.fillCircle(30, 30, 20);
    t.fillStyle(0xfff6c9, 0.9); t.fillCircle(30, 30, 14);
    t.generateTexture("sun", 60, 60); t.destroy();
    t = g();
    t.fillStyle(0xfff6d8, 1); t.fillCircle(30, 30, 20);
    t.fillStyle(0xe8dcc0, 0.5); t.fillCircle(38, 24, 5); t.fillCircle(24, 36, 4); t.fillCircle(34, 40, 3);
    t.generateTexture("moon", 60, 60); t.destroy();

    // painting frame (empty, artwork drawn inside via container)
    t = g();
    t.fillStyle(0xa5713f, 1); t.fillRoundedRect(0, 0, 120, 96, 6);
    t.fillStyle(0xfff8ea, 1); t.fillRect(10, 10, 100, 76);
    t.generateTexture("frame", 120, 96); t.destroy();

    // big soft button
    t = g();
    t.fillStyle(0xffffff, 1); t.fillRoundedRect(0, 0, 84, 84, 22);
    t.lineStyle(4, 0xffb3cd, 1); t.strokeRoundedRect(2, 2, 80, 80, 20);
    t.generateTexture("btn", 84, 84); t.destroy();
  }

  _normalize() {
    // shared display heights for Eli + her toys (stored as scale in registry)
    const target = { elizabeth: 215, flofy: 150, rainbow: 150, pet: 96 };
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
        rt.draw(img, 60, 48);
        const g2 = this.make.graphics({ add: false });
        g2.fillStyle(0xa5713f, 1);
        g2.fillRect(0, 0, 120, 10); g2.fillRect(0, 86, 120, 10);
        g2.fillRect(0, 0, 10, 96); g2.fillRect(110, 0, 10, 96);
        rt.draw(g2, 0, 0);
        g2.destroy();
        img.destroy();
      }
      rt.saveTexture(out);
    }
  }
}
