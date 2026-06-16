import BootScene     from './scenes/BootScene.js';
import MenuScene     from './scenes/MenuScene.js';
import GameScene     from './scenes/GameScene.js';
import UIScene       from './scenes/UIScene.js';
import WinScene      from './scenes/WinScene.js';
import GameOverScene from './scenes/GameOverScene.js';

const config = {
  type: Phaser.CANVAS,
  parent: 'game-container',
  width: 390,
  height: 844,
  backgroundColor: '#87CEEB',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER, // CSS transform handles centering
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, WinScene, GameOverScene],
};

const game = new Phaser.Game(config);
export default game;
