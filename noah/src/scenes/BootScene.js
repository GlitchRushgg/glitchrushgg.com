import { drawAnimal, drawCoin, drawHeart } from '../utils/Graphics.js';

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

    const animals = ['elephant', 'giraffe', 'lion', 'zebra', 'monkey', 'rabbit', 'penguin', 'bear'];
    const colors = [0x888888, 0xf5c542, 0xd4a017, 0xeeeeee, 0xb5651d, 0xffffff, 0x2c3e50, 0x8b4513];
    animals.forEach((name, i) => {
      g.clear();
      drawAnimal(g, colors[i], name);
      g.generateTexture(name, 40, 40);
    });

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
