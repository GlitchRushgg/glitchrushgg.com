import { W, H } from "./const.js";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { ShopScene } from "./scenes/ShopScene.js";
import { SDK } from "./utils/SDK.js";

SDK.loadingStart();
SDK.init();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,                     // v2: PORTRAIT 390×844 (mobile-first; CG acepta portrait)
  backgroundColor: "#14102b",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },  // dos pulgares + uno extra
  scene: [BootScene, MenuScene, GameScene, GameOverScene, ShopScene],
});
