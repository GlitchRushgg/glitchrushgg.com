// GLITCH SHIFT — config de Phaser y registro de escenas.
// Landscape 1280×720 con Scale.FIT (CrazyGames revisa desktop 16:9 primero).
// Las constantes compartidas viven en const.js para evitar imports circulares.

import { W, H } from "./const.js";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { ShopScene } from "./scenes/ShopScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#070a1a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, MenuScene, GameScene, GameOverScene, ShopScene],
};

new Phaser.Game(config);
