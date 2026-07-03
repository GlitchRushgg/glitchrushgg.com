// Genera TODAS las texturas proceduralmente (cero assets externos), en blanco
// para tintarlas en tiempo real: jugador, enemigos, bala, gema, moneda,
// corazón, glow, chispa y rejilla de fondo.

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    this._genPlayer();
    this._genEnemies();
    this._genBullet();
    this._genGem();
    this._genCoin();
    this._genHeart();
    this._genGlow();
    this._genSpark();
    this._genGrid();
    this.scene.start("Menu");
  }

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

  // Jugador: cañón circular con mira (rota hacia el objetivo).
  _genPlayer() {
    const s = 56, c = s / 2;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.2); g.fillCircle(c, c, 25);
    g.fillStyle(0xffffff, 1); g.fillCircle(c, c, 15);
    g.fillStyle(0xffffff, 0.9); g.fillRect(c - 4, 2, 8, 16);   // cañón (apunta arriba)
    g.fillStyle(0x000000, 0.35); g.fillCircle(c, c, 6);
    g.generateTexture("player", s, s);
    g.destroy();
  }

  _genEnemies() {
    // Chaser: triángulo agresivo.
    let g = this.add.graphics();
    g.fillStyle(0xffffff, 0.35); g.fillTriangle(22, 2, 2, 42, 42, 42);
    g.lineStyle(3, 0xffffff, 1); g.strokeTriangle(22, 2, 2, 42, 42, 42);
    g.fillStyle(0xffffff, 1); g.fillCircle(22, 30, 4);
    g.generateTexture("en-chaser", 44, 46);
    g.destroy();

    // Speeder: dardo pequeño.
    g = this.add.graphics();
    g.fillStyle(0xffffff, 0.5);
    g.fillPoints([{ x: 14, y: 0 }, { x: 28, y: 14 }, { x: 14, y: 28 }, { x: 0, y: 14 }], true);
    g.lineStyle(2, 0xffffff, 1);
    g.strokePoints([{ x: 14, y: 0 }, { x: 28, y: 14 }, { x: 14, y: 28 }, { x: 0, y: 14 }], true, true);
    g.generateTexture("en-speeder", 28, 28);
    g.destroy();

    // Tank: hexágono gordo.
    g = this.add.graphics();
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      pts.push({ x: 34 + Math.cos(a) * 31, y: 34 + Math.sin(a) * 31 });
    }
    g.fillStyle(0xffffff, 0.35); g.fillPoints(pts, true);
    g.lineStyle(4, 0xffffff, 1); g.strokePoints(pts, true, true);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(34, 34, 9);
    g.generateTexture("en-tank", 68, 68);
    g.destroy();

    // Splitter: círculo con núcleo doble (pista de que se parte).
    g = this.add.graphics();
    g.fillStyle(0xffffff, 0.35); g.fillCircle(25, 25, 23);
    g.lineStyle(3, 0xffffff, 1); g.strokeCircle(25, 25, 23);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(17, 25, 6); g.fillCircle(33, 25, 6);
    g.generateTexture("en-splitter", 50, 50);
    g.destroy();
  }

  _genBullet() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.4); g.fillCircle(7, 7, 7);
    g.fillStyle(0xffffff, 1); g.fillCircle(7, 7, 4);
    g.generateTexture("bullet", 14, 14);
    g.destroy();
  }

  _genGem() {
    const s = 18, c = s / 2;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.5);
    g.fillPoints([{ x: c, y: 0 }, { x: s, y: c }, { x: c, y: s }, { x: 0, y: c }], true);
    g.fillStyle(0xffffff, 1);
    g.fillPoints([{ x: c, y: 3 }, { x: s - 3, y: c }, { x: c, y: s - 3 }, { x: 3, y: c }], true);
    g.generateTexture("gem", s, s);
    g.destroy();
  }

  _genCoin() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1); g.fillCircle(10, 10, 9);
    g.fillStyle(0x000000, 0.25); g.fillCircle(10, 10, 5.5);
    g.fillStyle(0xffffff, 1); g.fillCircle(10, 10, 3);
    g.generateTexture("coin", 20, 20);
    g.destroy();
  }

  _genHeart() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(7, 7, 6);
    g.fillCircle(17, 7, 6);
    g.fillTriangle(1.5, 10, 22.5, 10, 12, 22);
    g.generateTexture("heart", 24, 24);
    g.destroy();
  }

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
