// Carga las imágenes canon (personajes) y genera texturas procedurales
// (partícula de confeti, anillo) antes de arrancar el menú.

import { W, H } from "../main.js";

const CANON = "assets/canon/";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Barra de carga mínima.
    const bar = this.add.rectangle(W / 2, H / 2, 0, 8, 0xffffff).setOrigin(0.5);
    const frame = this.add.rectangle(W / 2, H / 2, 220, 12).setStrokeStyle(2, 0xffffff);
    frame.setFillStyle();
    this.load.on("progress", (p) => (bar.width = 216 * p));

    // Personajes canon (se escalan en juego).
    this.load.image("flofy", CANON + "flofy-front.png");
    this.load.image("flofy-jump", CANON + "flofy-jumping.png");
    this.load.image("elizabeth", CANON + "elizabeth-front.png");
    this.load.image("mama", CANON + "mama-front.png");
    this.load.image("papa", CANON + "papa-front.png");
    this.load.image("cristian", CANON + "cristian-front.png");
    this.load.image("duo", CANON + "duo-hero.png");
  }

  create() {
    // Partícula de confeti (cuadradito blanco que luego se tiñe).
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 8);
    g.generateTexture("confetti", 8, 8);
    g.clear();

    // Chispa (estrella sencilla) para Flofy.
    g.fillStyle(0xffe27a, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture("spark", 12, 12);
    g.destroy();

    this.scene.start("Menu");
  }
}
