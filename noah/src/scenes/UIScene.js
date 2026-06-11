export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UI', active: false });
  }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Top HUD panel
    this.add.rectangle(width / 2, 28, width, 56, 0x000000, 0.45).setDepth(50);

    // Level label — read directly from gameScene so level 2+ shows the right number
    this.levelLabel = this.add.text(16, 14, `Level ${this.gameScene.level}`, {
      fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#ffe066', stroke: '#333', strokeThickness: 3,
    }).setDepth(51);

    // Score — read directly from gameScene so a carried-over score shows correctly
    this.scoreLabel = this.add.text(16, 38, `Score: ${this.gameScene.score}`, {
      fontSize: '15px', fontFamily: 'Arial',
      fill: '#aaffaa', stroke: '#222', strokeThickness: 2,
    }).setDepth(51);

    // Hearts — top right
    this.hearts = [];
    for (let i = 0; i < 3; i++) {
      this.hearts.push(
        this.add.image(width - 20 - i * 32, 28, 'heart').setScale(1.1).setDepth(51)
      );
    }

    // Height progress bar — thin bar on left edge
    const barX = 6, barTop = 60, barBottom = height - 175;
    const barH = barBottom - barTop;
    this.add.rectangle(barX, barTop + barH / 2, 8, barH, 0x000000, 0.3).setDepth(50).setOrigin(0.5);
    this.progressBar = this.add.rectangle(barX, barBottom, 6, 0, 0x00ff88, 0.85)
      .setDepth(51).setOrigin(0.5, 1);
    this._barH      = barH;
    this._barBottom = barBottom;

    // Ark icon at top of progress bar
    this.add.image(barX, barTop - 12, 'ark').setScale(0.38).setDepth(51);

    // Instruction (fades out)
    const inst = this.add.text(width / 2, 80, 'Jump up to reach the Ark!', {
      fontSize: '15px', fontFamily: 'Arial',
      fill: '#fffde7', stroke: '#1a5a90', strokeThickness: 3,
      wordWrap: { width: 360 }, align: 'center',
    }).setDepth(51).setOrigin(0.5);
    this.tweens.add({ targets: inst, alpha: 0, delay: 4000, duration: 1500 });

    // Water warning — bottom of screen, hidden by default
    this.waterWarning = this.add.text(width / 2, height - 170, '~ WATER RISING! ~', {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#00e5ff', stroke: '#003060', strokeThickness: 4,
    }).setDepth(55).setOrigin(0.5).setAlpha(0);

    // ── Event listeners ──────────────────────────────────────────────

    this.gameScene.events.on('levelUpdate', (lvl) => {
      this.levelLabel.setText(`Level ${lvl}`);
    });

    this.gameScene.events.on('scoreUpdate', (score) => {
      this.scoreLabel.setText(`Score: ${score}`);
      this.tweens.add({ targets: this.scoreLabel, scaleX: 1.2, scaleY: 1.2, duration: 100, yoyo: true });
    });

    this.gameScene.events.on('livesUpdate', (lives) => {
      this.hearts.forEach((h, i) => h.setAlpha(i < lives ? 1.0 : 0.25));
      if (lives > 0) {
        this.tweens.add({ targets: this.hearts[lives - 1], scaleX: 1.4, scaleY: 1.4, duration: 120, yoyo: true });
      }
    });

    this.gameScene.events.on('heightUpdate', (progress) => {
      this.progressBar.height = this._barH * progress;
    });

    this._lastDanger = 0;
    this.gameScene.events.on('waterUpdate', (danger) => {
      if (danger > 0.3) {
        this.waterWarning.setAlpha(Phaser.Math.Clamp((danger - 0.3) / 0.7, 0, 1));
        // Pulse warning once each time danger crosses 0.5 threshold
        if (danger > 0.5 && this._lastDanger <= 0.5) {
          this.tweens.add({
            targets: this.waterWarning,
            scaleX: 1.15, scaleY: 1.15,
            duration: 180, yoyo: true,
          });
        }
      } else {
        this.waterWarning.setAlpha(0);
      }
      this._lastDanger = danger;
    });

    this.events.once('shutdown', () => {
      ['levelUpdate', 'scoreUpdate', 'livesUpdate', 'heightUpdate', 'waterUpdate']
        .forEach(evt => this.gameScene.events.off(evt));
    });
  }
}
