// Genera TODAS las texturas del juego proceduralmente (cero assets externos):
// orbes (skins), bloques, dron, láser, bits, escudo, rejilla de fondo y partículas.
// Todo se dibuja en blanco para poder tintarlo en tiempo real.

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    this._genOrbs();
    this._genBlock();
    this._genDrone();
    this._genBit();
    this._genShield();
    this._genLaserNode();
    this._genGrid();
    this._genGlow();
    this._genSpark();
    this.scene.start("Menu");
  }

  // Halo suave reutilizable (auras, explosiones, pulso del beam).
  _genGlow() {
    const g = this.add.graphics();
    for (let r = 32; r > 0; r -= 2) {
      g.fillStyle(0xffffff, 0.05 + (32 - r) * 0.008);
      g.fillCircle(32, 32, r);
    }
    g.generateTexture("glow", 64, 64);
    g.destroy();
  }

  _genSpark() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark", 8, 8);
    g.destroy();
  }

  // Orbes-skin: cada forma con núcleo brillante + borde. 56×56, blancas.
  _genOrbs() {
    const S = 56, c = S / 2;
    const mk = (key, draw) => {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.18); g.fillCircle(c, c, 26);  // aura
      draw(g);
      g.generateTexture(key, S, S);
      g.destroy();
    };
    mk("orb", (g) => {
      g.fillStyle(0xffffff, 1); g.fillCircle(c, c, 16);
      g.fillStyle(0xffffff, 0.5); g.fillCircle(c, c, 21);
    });
    mk("orb-tri", (g) => {
      g.fillStyle(0xffffff, 0.5); g.fillTriangle(c, 6, 6, S - 8, S - 6, S - 8);
      g.fillStyle(0xffffff, 1); g.fillTriangle(c, 14, 14, S - 12, S - 14, S - 12);
    });
    mk("orb-square", (g) => {
      g.fillStyle(0xffffff, 0.5); g.fillRect(c - 19, c - 19, 38, 38);
      g.fillStyle(0xffffff, 1); g.fillRect(c - 13, c - 13, 26, 26);
    });
    mk("orb-diamond", (g) => {
      const d = (r, a) => {
        g.fillStyle(0xffffff, a);
        g.fillPoints([{ x: c, y: c - r }, { x: c + r, y: c }, { x: c, y: c + r }, { x: c - r, y: c }], true);
      };
      d(21, 0.5); d(14, 1);
    });
    mk("orb-ring", (g) => {
      g.lineStyle(7, 0xffffff, 1); g.strokeCircle(c, c, 15);
      g.fillStyle(0xffffff, 1); g.fillCircle(c, c, 5);
    });
    mk("orb-star", (g) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 21 : 9;
        pts.push({ x: c + Math.cos(a) * r, y: c + Math.sin(a) * r });
      }
      g.fillStyle(0xffffff, 1); g.fillPoints(pts, true);
    });
  }

  // Bloque neón vertical (obstáculo base): marco brillante + relleno translúcido.
  _genBlock() {
    const w = 44, h = 96;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.28); g.fillRoundedRect(2, 2, w - 4, h - 4, 8);
    g.lineStyle(4, 0xffffff, 1); g.strokeRoundedRect(2, 2, w - 4, h - 4, 8);
    g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(10, 10, w - 20, 8, 3);   // brillo superior
    g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(10, h - 18, w - 20, 8, 3);
    g.generateTexture("block", w, h);
    g.destroy();
  }

  // Dron: rombo con ojo central y aletas (cambia de carril tras parpadear).
  _genDrone() {
    const w = 58, h = 40, cx = w / 2, cy = h / 2;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.35);
    g.fillPoints([{ x: cx, y: 0 }, { x: w, y: cy }, { x: cx, y: h }, { x: 0, y: cy }], true);
    g.lineStyle(3, 0xffffff, 1);
    g.strokePoints([{ x: cx, y: 0 }, { x: w, y: cy }, { x: cx, y: h }, { x: 0, y: cy }], true, true);
    g.fillStyle(0xffffff, 1); g.fillCircle(cx, cy, 7);              // ojo
    g.fillStyle(0xffffff, 0.8); g.fillRect(cx - 22, cy - 2, 8, 4); g.fillRect(cx + 14, cy - 2, 8, 4);
    g.generateTexture("drone", w, h);
    g.destroy();
  }

  // Bit (moneda): rombo pequeño con destello.
  _genBit() {
    const s = 20, c = s / 2;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.5);
    g.fillPoints([{ x: c, y: 0 }, { x: s, y: c }, { x: c, y: s }, { x: 0, y: c }], true);
    g.fillStyle(0xffffff, 1);
    g.fillPoints([{ x: c, y: 3 }, { x: s - 3, y: c }, { x: c, y: s - 3 }, { x: 3, y: c }], true);
    g.generateTexture("bit", s, s);
    g.destroy();
  }

  // Power-up escudo: hexágono con anillo interior.
  _genShield() {
    const s = 44, c = s / 2;
    const g = this.add.graphics();
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      pts.push({ x: c + Math.cos(a) * 19, y: c + Math.sin(a) * 19 });
    }
    g.fillStyle(0xffffff, 0.3); g.fillPoints(pts, true);
    g.lineStyle(3, 0xffffff, 1); g.strokePoints(pts, true, true);
    g.lineStyle(3, 0xffffff, 1); g.strokeCircle(c, c, 8);
    g.generateTexture("shield-pu", s, s);
    g.destroy();
  }

  // Emisor del láser (caja en el borde de pantalla).
  _genLaserNode() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(0, 0, 26, 56, 6);
    g.fillStyle(0x000000, 0.5); g.fillRect(4, 22, 18, 12);
    g.generateTexture("laser-node", 26, 56);
    g.destroy();
  }

  // Tile de rejilla para el parallax de fondo.
  _genGrid() {
    const s = 128;
    const g = this.add.graphics();
    g.lineStyle(1, 0xffffff, 0.5);
    g.lineBetween(0, 0, s, 0);
    g.lineBetween(0, 0, 0, s);
    g.lineStyle(1, 0xffffff, 0.18);
    g.lineBetween(0, s / 2, s, s / 2);
    g.lineBetween(s / 2, 0, s / 2, s);
    g.generateTexture("grid", s, s);
    g.destroy();
  }
}
