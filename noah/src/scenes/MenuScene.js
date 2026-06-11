import { getScores } from '../utils/Scores.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const W = 390, H = 844;

    this.add.image(W / 2, H / 2, 'background').setDisplaySize(W, H);

    // Ark + water decoration
    this.add.image(W / 2, H * 0.32, 'ark').setScale(2.0);
    this.add.image(W / 2, H * 0.46, 'water').setDisplaySize(W, 100);

    // Title panel
    this.add.rectangle(W / 2, H * 0.11, 360, 86, 0x000000, 0.35).setOrigin(0.5);
    this.add.text(W / 2, H * 0.087, "Don't Drown,", {
      fontSize: '34px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#ffe066', stroke: '#7a4200', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.143, 'Noah! 🌊', {
      fontSize: '40px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#7a4200', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.52, 'Jump up platforms to reach the Ark!', {
      fontSize: '16px', fontFamily: 'Arial',
      fill: '#ffffff', stroke: '#1a5a90', strokeThickness: 3,
      wordWrap: { width: 330 }, align: 'center',
    }).setOrigin(0.5);

    // ── High Score Rankings ──────────────────────────────────────────
    const scores = getScores();
    const panelTop = H * 0.575;
    const rowH     = 30;
    const rows     = Math.min(scores.length, 5);
    const panelH   = 32 + Math.max(rows, 1) * rowH + 8;

    this.add.rectangle(W / 2, panelTop + panelH / 2, 330, panelH, 0x000000, 0.48).setOrigin(0.5);
    this.add.text(W / 2, panelTop + 14, 'HIGH SCORES', {
      fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#aaddff',
    }).setOrigin(0.5);

    if (rows === 0) {
      this.add.text(W / 2, panelTop + 46, 'No scores yet — play to get on the board!', {
        fontSize: '13px', fontFamily: 'Arial', fill: '#667799',
        wordWrap: { width: 290 }, align: 'center',
      }).setOrigin(0.5);
    } else {
      const MEDAL = ['#ffd700', '#c0c0c0', '#cd7f32', '#99aabb', '#99aabb'];
      scores.slice(0, 5).forEach(({ score, level }, i) => {
        const y = panelTop + 32 + i * rowH + rowH / 2;
        const col = MEDAL[i];
        this.add.text(W / 2 - 140, y, `#${i + 1}`, {
          fontSize: '15px', fontFamily: 'Arial', fontStyle: 'bold', fill: col,
        }).setOrigin(0, 0.5);
        this.add.text(W / 2 + 60, y, `${score}`, {
          fontSize: '17px', fontFamily: 'Arial', fontStyle: 'bold', fill: col,
        }).setOrigin(1, 0.5);
        this.add.text(W / 2 + 90, y, `Lv.${level}`, {
          fontSize: '13px', fontFamily: 'Arial', fill: '#88aacc',
        }).setOrigin(0, 0.5);
      });
    }

    // ── Play button ───────────────────────────────────────────────────
    const btnY  = panelTop + panelH + 52;
    const btnBg = this.add.rectangle(W / 2, btnY, 220, 64, 0xff8c00)
      .setInteractive({ useHandCursor: true });
    const btnHL = this.add.rectangle(W / 2, btnY - 6, 210, 26, 0xffbb44, 0.4);
    this.add.text(W / 2, btnY, '▶  PLAY', {
      fontSize: '30px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#7a4200', strokeThickness: 4,
    }).setOrigin(0.5);

    btnBg.on('pointerdown', () => {
      this.tweens.add({
        targets: [btnBg, btnHL], scaleX: 0.95, scaleY: 0.95, duration: 80, yoyo: true,
        onComplete: () => this.scene.start('Game', { level: 1, score: 0 }),
      });
    });
    this.tweens.add({
      targets: btnBg, scaleX: 1.04, scaleY: 1.04,
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Colorear button
    const colorBtnY = btnY + 76;
    const colorBg = this.add.rectangle(W / 2, colorBtnY, 200, 48, 0x228833)
      .setInteractive({ useHandCursor: true });
    this.add.text(W / 2, colorBtnY, 'Coloring Book', {
      fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#115522', strokeThickness: 4,
    }).setOrigin(0.5);
    colorBg.on('pointerdown', () => this.scene.start('Color'));
  }
}
