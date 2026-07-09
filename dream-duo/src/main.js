import { W, H } from "./const.js";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { ShopScene } from "./scenes/ShopScene.js";
import { LevelSelectScene } from "./scenes/LevelSelectScene.js";
import { SDK } from "./utils/SDK.js";

SDK.loadingStart();
SDK.init();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#14102b",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 }, // two thumbs + one extra (multitouch lesson from Hop & Run)
  scene: [BootScene, MenuScene, LevelSelectScene, GameScene, GameOverScene, ShopScene],
});
