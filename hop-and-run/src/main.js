// Hop & Run — Phaser config and scene registry.
// Landscape 1280×720, Scale.FIT. Arcade physics for gravity/platforms.

import { W, H } from "./const.js";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#7ec8f7",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
};

new Phaser.Game(config);
