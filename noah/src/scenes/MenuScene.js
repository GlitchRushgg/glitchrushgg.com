import { getScores } from '../utils/Scores.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const W = 390, H = 844;

    this.add.image(W / 2, H / 2, 'background').setDisplaySize(W, H);

    // ── drifting clouds (procedural, for life) ───────────────────────────
    this.makeCloudTexture();
    for (let i = 0; i < 5; i++) {
      const cy = 60 + Math.random() * 720;
      const sc = 0.6 + Math.random() * 0.9;
      const cloud = this.add.image(-120, cy, 'cloudpuff').setScale(sc).setAlpha(0.85).setDepth(1);
      cloud.x = Math.random() * (W + 120) - 100;          // repartidas por la pantalla al inicio
      const speed = 0.010 + Math.random() * 0.008;        // px/ms
      this.cloudList = this.cloudList || [];
      this.cloudList.push({ img: cloud, speed });
    }

    // ── rising water at the bottom (the flood!) ──────────────────────────
    const water = this.add.image(W / 2, H - 22, 'water').setDisplaySize(W, 90).setDepth(2);
    this.tweens.add({ targets: water, y: H - 14, alpha: { from: 0.9, to: 1 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── TITLE (bounce in, then gentle bob) ───────────────────────────────
    this.roundPanel(W / 2, 96, 372, 96, 0x06243f, 0.42, 22).setDepth(5);
    const t1 = this.add.text(W / 2, 78, "DON'T DROWN,", {
      fontSize: '34px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#ffe066', stroke: '#7a4200', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(6);
    const t2 = this.add.text(W / 2, 122, 'NOAH! 🌊', {
      fontSize: '46px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#1a5a90', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(6);
    [t1, t2].forEach((t, i) => {
      const ty = t.y; t.y = -80;
      this.tweens.add({ targets: t, y: ty, duration: 760, delay: 120 + i * 120, ease: 'Bounce.easeOut' });
    });
    this.tweens.add({ targets: [t1, t2], y: '+=6', duration: 1700, yoyo: true, repeat: -1, delay: 1100, ease: 'Sine.easeInOut' });

    // ── DIORAMA: ark above, Noah + animals hopping on platforms ──────────
    const ark = this.add.image(W / 2, 238, 'ark').setScale(1.7).setDepth(4);
    this.tweens.add({ targets: ark, y: 230, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(W / 2, 300, '⛵ The Ark — safe & dry', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#ffffff', stroke: '#1a5a90', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5);

    const platY = 400;
    [95, 195, 295].forEach((x) => this.add.image(x, platY, 'platform').setScale(1.15).setDepth(4));

    // Noah hops on the middle platform
    const noah = this.add.image(195, platY - 52, 'noah').setScale(1.5).setDepth(6);
    this.tweens.add({ targets: noah, y: platY - 78, duration: 520, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });

    // friends to rescue
    this.placeAnimal('penguin',  95, platY, 56,   0);
    this.placeAnimal('elephant', 295, platY, 48, 260);

    // ── HOOK ─────────────────────────────────────────────────────────────
    this.add.text(W / 2, 470, 'Rescue the animals and reach the Ark\nbefore the flood swallows you! 🌊', {
      fontSize: '17px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#0d3a5c', strokeThickness: 4,
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5).setDepth(6);

    // ── HIGH SCORES (rounded panel) ──────────────────────────────────────
    const scores = getScores();
    const panelTop = 512;
    const rowH = 28;
    const rows = Math.min(scores.length, 3);
    const panelH = 34 + Math.max(rows, 1) * rowH + 10;

    this.roundPanel(W / 2, panelTop + panelH / 2, 320, panelH, 0x05203a, 0.56, 16).setDepth(5);
    this.add.text(W / 2, panelTop + 16, '🏆 HIGH SCORES', {
      fontSize: '15px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#ffe066',
    }).setOrigin(0.5).setDepth(6);

    if (rows === 0) {
      this.add.text(W / 2, panelTop + 48, 'No scores yet —\nplay to top the board!', {
        fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#bcd3e8',
        align: 'center', lineSpacing: 3,
      }).setOrigin(0.5).setDepth(6);
    } else {
      const MEDAL = ['#ffd700', '#c0c0c0', '#cd7f32'];
      scores.slice(0, 3).forEach(({ score, level }, i) => {
        const y = panelTop + 34 + i * rowH + rowH / 2;
        const col = MEDAL[i];
        this.add.text(W / 2 - 130, y, `#${i + 1}`, { fontSize: '15px', fontFamily: 'Arial', fontStyle: 'bold', fill: col }).setOrigin(0, 0.5).setDepth(6);
        this.add.text(W / 2 + 70, y, `${score}`, { fontSize: '18px', fontFamily: 'Arial', fontStyle: 'bold', fill: col }).setOrigin(1, 0.5).setDepth(6);
        this.add.text(W / 2 + 90, y, `Lv.${level}`, { fontSize: '13px', fontFamily: 'Arial', fill: '#88aacc' }).setOrigin(0, 0.5).setDepth(6);
      });
    }

    // ── PLAY button (glow + pulse + press) ───────────────────────────────
    const btnY = panelTop + panelH + 58;
    const glow = this.add.graphics().setDepth(5);
    glow.fillStyle(0xffb43d, 0.45); glow.fillRoundedRect(W / 2 - 138, btnY - 46, 276, 92, 26);
    this.tweens.add({ targets: glow, alpha: { from: 0.25, to: 0.7 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const btn = this.add.container(W / 2, btnY).setDepth(6);
    const bgfx = this.add.graphics();
    bgfx.fillStyle(0xe66a00, 1); bgfx.fillRoundedRect(-124, -36, 248, 74, 22);
    bgfx.fillStyle(0xff8c1a, 1); bgfx.fillRoundedRect(-124, -36, 248, 64, 22);
    bgfx.fillStyle(0xffb14d, 0.5); bgfx.fillRoundedRect(-114, -28, 228, 22, 12);
    const label = this.add.text(0, 0, '▶  PLAY', {
      fontSize: '34px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#7a3a00', strokeThickness: 5,
    }).setOrigin(0.5);
    btn.add([bgfx, label]);
    btn.setSize(248, 74);
    btn.setInteractive(new Phaser.Geom.Rectangle(-124, -37, 248, 74), Phaser.Geom.Rectangle.Contains);
    this.tweens.add({ targets: btn, scaleX: 1.05, scaleY: 1.05, duration: 720, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      this.scene.start('Game', { level: 1, score: 0 });
    };
    const press = () => {
      this.tweens.killTweensOf(btn);
      this.tweens.add({ targets: btn, scaleX: 0.92, scaleY: 0.92, duration: 90, yoyo: true, onComplete: start });
    };
    btn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    btn.on('pointerout', () => this.input.setDefaultCursor('default'));
    btn.on('pointerdown', press);

    // iOS Safari: Phaser's touch input is unreliable here (same reason GameScene
    // uses raw DOM touch listeners), so the PLAY button can silently fail to
    // respond to taps. Add a raw DOM touch fallback mapped to the button rect.
    const canvas = this.game.canvas;
    const onTouchEnd = (e) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const r = canvas.getBoundingClientRect();
      const gx = (t.clientX - r.left) * (390 / r.width);
      const gy = (t.clientY - r.top)  * (844 / r.height);
      if (Math.abs(gx - W / 2) <= 124 && Math.abs(gy - btnY) <= 37) press();
    };
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    this.events.once('shutdown', () => canvas.removeEventListener('touchend', onTouchEnd));

    this.add.text(W / 2, btnY + 56, 'Free · No download · Tap and play', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#e9f4ff', stroke: '#0d3a5c', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);
  }

  update(_time, delta) {
    if (!this.cloudList) return;
    for (const c of this.cloudList) {
      c.img.x += c.speed * delta;
      if (c.img.x > 390 + 120) c.img.x = -120;          // reaparece por la izquierda
    }
  }

  // scale an animal to a target on-screen height (keeps aspect) + gentle bob
  placeAnimal(key, x, platY, targetH, delay) {
    const tex = this.textures.get(key).getSourceImage();
    const sc = targetH / tex.height;
    const img = this.add.image(x, platY - 9 * 1.15 - (targetH / 2) + 4, key).setScale(sc).setDepth(6);
    this.tweens.add({ targets: img, y: img.y - 10, duration: 700, yoyo: true, repeat: -1, delay, ease: 'Sine.easeInOut' });
    return img;
  }

  roundPanel(cx, cy, w, h, color, alpha, radius) {
    const g = this.add.graphics();
    g.fillStyle(color, alpha);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, radius);
    return g;
  }

  makeCloudTexture() {
    if (this.textures.exists('cloudpuff')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    [[40, 30, 24], [62, 34, 18], [22, 35, 16], [48, 18, 18], [78, 36, 12]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.generateTexture('cloudpuff', 100, 56);
    g.destroy();
  }
}
