// Elizabeth & Flofy — Glitch Rush
// Arcade de un toque: purifica los glitches con Flofy antes de que se escapen.
// Resolución lógica fija 390×844 (retrato iPhone) con Scale.FIT, como Noah.

import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";

export const W = 390;
export const H = 844;

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: "game",
  backgroundColor: "#7ec8f0",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
