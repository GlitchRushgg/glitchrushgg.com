import { drawCoin, drawHeart } from '../utils/Graphics.js';

// All animals ship as hand-drawn pixel-art PNGs in assets/images/ (loaded in
// preload()). Keys match the animal names used in GameScene / WinScene.
const ANIMALS = ['elephant', 'giraffe', 'lion', 'zebra', 'monkey', 'rabbit', 'penguin', 'bear'];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('noah', 'assets/noah.png');
    this.load.image('ark', 'assets/ark.png');
    this.load.image('ark-open', 'assets/ark-open.png');
    this.load.image('platform', 'assets/platform.png');
    this.load.image('iceplatform', 'assets/iceplatform.png');
    this.load.image('water', 'assets/water.png');
    this.load.image('background', 'assets/background.png');
    this.load.image('raindrop', 'assets/raindrop.png');
    // islas flotantes decorativas (pack CC0 aportado por la fundadora)
    for (const n of [1, 2, 4, 5, 6]) this.load.image('island-' + n, `assets/island-${n}.png`);

    ANIMALS.forEach((name) => {
      this.load.image(name, `assets/images/${name}.png`);
    });
  }

  create() {
    this.generateTextures();
    this.scene.start('Menu');
  }

  generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // 'background' texture loaded from assets/background.png in preload()

    // 'water' texture loaded from assets/water.png in preload()

    // 'noah' texture loaded from assets/noah.png in preload()

    // 'ark' texture loaded from assets/ark.png in preload()

    // Animals loaded as PNGs from assets/images/ in preload()

    // 'raindrop' texture loaded from assets/raindrop.png in preload()

    g.clear();
    drawCoin(g);
    g.generateTexture('star', 28, 28);

    // 'platform' and 'iceplatform' loaded from assets/ in preload()

    // 'ark-open' loaded from assets/ark-open.png in preload()

    g.clear();
    drawHeart(g);
    g.generateTexture('heart', 24, 24);

    g.clear();
    g.destroy();
  }
}
