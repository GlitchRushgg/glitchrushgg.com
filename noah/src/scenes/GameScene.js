import SoundManager from '../utils/SoundManager.js';

const WORLD_H    = 2800;
const NOAH_SPEED = 220;
const JUMP_FORCE = -560;
const ARK_Y      = 100;

// Max safe horizontal offset between consecutive platforms.
// With gravity=680 and jump=-560, max height=230px.
// At height 182px (worst-case gap) Noah has 200px horizontal reach — safe at ±100.
const MAX_HORIZ = 100;

const LEVELS = [
  { platCount: 20, minW: 88, maxW: 110, movingCount: 0,  crumbleCount: 0, bounceCount: 0, fallingCount: 0, gapMin: 100, gapMax: 130 },
  { platCount: 18, minW: 74, maxW: 100, movingCount: 4,  crumbleCount: 0, bounceCount: 2, fallingCount: 3, gapMin: 110, gapMax: 145 },
  { platCount: 16, minW: 62, maxW: 90,  movingCount: 6,  crumbleCount: 3, bounceCount: 3, fallingCount: 4, gapMin: 120, gapMax: 158 },
  { platCount: 14, minW: 54, maxW: 80,  movingCount: 8,  crumbleCount: 5, bounceCount: 4, fallingCount: 5, gapMin: 132, gapMax: 170 },
  { platCount: 12, minW: 48, maxW: 68,  movingCount: 10, crumbleCount: 7, bounceCount: 5, fallingCount: 6, gapMin: 144, gapMax: 182 },
  { platCount: 11, minW: 44, maxW: 62,  movingCount: 12, crumbleCount: 8, bounceCount: 5, fallingCount: 7, gapMin: 150, gapMax: 190 },
  { platCount: 10, minW: 40, maxW: 56,  movingCount: 14, crumbleCount: 9, bounceCount: 6, fallingCount: 7, gapMin: 156, gapMax: 196 },
  { platCount: 9,  minW: 38, maxW: 52,  movingCount: 16, crumbleCount:10, bounceCount: 7, fallingCount: 8, gapMin: 162, gapMax: 202 },
];

const ANIMALS = ['elephant', 'giraffe', 'lion', 'zebra', 'monkey', 'rabbit', 'penguin', 'bear'];

function getLevelData(level) {
  if (level <= 8) return LEVELS[level - 1];
  const base = Object.assign({}, LEVELS[7]);
  const extra = level - 8;
  base.movingCount  = LEVELS[7].movingCount  + extra * 2;
  base.crumbleCount = LEVELS[7].crumbleCount + extra;
  base.bounceCount  = LEVELS[7].bounceCount  + extra;
  base.fallingCount = LEVELS[7].fallingCount + extra;
  base.gapMin = LEVELS[7].gapMin + extra * 6;
  base.gapMax = LEVELS[7].gapMax + extra * 6;
  return base;
}

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.level = data.level || 1;
    this.score = data.score || 0;
    this.lives = 3;
    this._won   = false;
    this._dying = false;
    this._combo       = 0;
    this._lastCollect = -1e9;
    this.sound = new SoundManager();
  }

  create() {
    try {
      this._createGame();
    } catch (e) {
      this.cameras.main.setBackgroundColor('#000033');
      this.add.rectangle(195, 300, 370, 400, 0x220000, 0.95)
        .setScrollFactor(0).setDepth(100);
      const msg = 'GAME ERROR:\n' + e.message + '\n\n' + (e.stack || '').slice(0, 300);
      this.add.text(195, 300, msg, {
        fontSize: '13px', fill: '#ff6666', fontFamily: 'monospace',
        wordWrap: { width: 350 }, align: 'left',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);
      console.error('GameScene crash:', e);
    }
  }

  _createGame() {
    this.physics.world.setBounds(0, 0, 390, WORLD_H);
    // Extend camera bounds 142px below world so Noah clears the control buttons
    this.cameras.main.setBounds(0, 0, 390, WORLD_H + 142);
    this.cameras.main.setBackgroundColor('#87CEEB');
    for (let i = 0; i < 4; i++) {
      this.add.image(195, 422 + i * 844, 'background').setDepth(0);
    }

    this._animalsCollected = 0;

    // Ark near top
    this.arkImage = this.add.image(195, ARK_Y, 'ark').setScale(1.6).setDepth(3);

    // Platform groups
    this.staticPlatGroup  = this.physics.add.staticGroup();
    this.movingPlatGroup  = this.physics.add.group();
    this.crumblePlatGroup = this.physics.add.staticGroup();
    this.bouncePlatGroup  = this.physics.add.staticGroup();
    this.fallingPlatGroup = this.physics.add.group();
    this._fallingActive = []; // platforms currently falling
    this._ridingFalling = false;
    this._fallJumpUntil = -1000; // grace window after jumping off a falling platform

    this._generatePlatforms();
    this._spawnAnimals();

    // Rising water — starts just below the screen so it's visible from the first second
    this._waterLevel  = WORLD_H + 40;
    this._waterPaused = false;
    this._waterSpeed  = 22 + this.level * 5; // px/s; lvl1=27, lvl5=47, lvl8=62
    const waterBlockH = 2400;
    this._waterGfx    = this.add.rectangle(195, this._waterLevel + waterBlockH / 2, 390, waterBlockH, 0x0d47a1, 0.82).setDepth(6);
    this._waterSurface = this.add.tileSprite(195, this._waterLevel + 60, 390, 120, 'water').setDepth(7);

    // Noah
    this.noah = this.physics.add.sprite(195, WORLD_H - 120, 'noah').setDepth(5);
    this.noah.setGravityY(680);
    this.noah.setCollideWorldBounds(true);

    // Colliders
    // One-way platforms: Noah passes through from below, only lands from above
    const _fromAbove = (noah) => noah.body.velocity.y >= 0;
    this.physics.add.collider(this.noah, this.staticPlatGroup,  null,                      _fromAbove, this);
    this.physics.add.collider(this.noah, this.movingPlatGroup,  null,                      _fromAbove, this);
    this.physics.add.collider(this.noah, this.crumblePlatGroup, this._onCrumbleCollide,    _fromAbove, this);
    this.physics.add.collider(this.noah, this.bouncePlatGroup,  this._onBounceCollide,     _fromAbove, this);
    this.physics.add.collider(this.noah, this.fallingPlatGroup, this._onFallingCollide,    _fromAbove, this);

    // Animal collection
    this.physics.add.overlap(this.noah, this.animalGroup, this._onCollectAnimal, null, this);

    // Camera — start high enough so Noah is above the control buttons (bottom 142px)
    this.camMinScrollY = WORLD_H - 702;

    // Rain: intensity upgrades every 2-4 levels (deterministic per tier)
    let _rainTier = 0, _rainNext = 0;
    while (_rainNext + ((_rainTier * 5 + 2) % 3 + 2) <= this.level) {
      _rainNext += (_rainTier * 5 + 2) % 3 + 2;
      _rainTier++;
    }
    this._rainTier = _rainTier;
    this.rainGroup = this.add.group();
    this.time.addEvent({
      delay: Math.max(30, 130 - _rainTier * 22),
      callback: this._spawnRain,
      callbackScope: this,
      loop: true,
    });

    this.sound.startMusic();
    this.events.once('shutdown', () => this.sound.stopMusic(), this);

    this._setupControls();
    this.scene.launch('UI', { gameScene: this });

    this.events.emit('levelUpdate', this.level);
    this.events.emit('livesUpdate', this.lives);
    this.events.emit('scoreUpdate',  this.score);
    this.events.emit('heightUpdate', 0);
    this.events.emit('waterUpdate',  0);
  } // end _createGame

  // ── Clouds ──────────────────────────────────────────────────────────
  _addClouds() {
    const positions = [
      [60,2650],[300,2500],[130,2300],[280,2100],[70,1900],[330,1750],
      [150,1550],[260,1350],[90,1150],[310,980],[60,780],[280,620],
      [160,420],[330,280],[80,180],[240,2700],[180,1700],[50,1100],
    ];
    positions.forEach(([cx, cy]) => {
      const r = Phaser.Math.Between(18, 34);
      this.add.circle(cx,      cy,     r,       0xffffff, 0.7);
      this.add.circle(cx + 28, cy - 8, r * 0.75, 0xffffff, 0.65);
      this.add.circle(cx + 52, cy,     r * 0.85, 0xffffff, 0.7);
    });
  }

  // ── Platform generation ─────────────────────────────────────────────
  _generatePlatforms() {
    const ld     = getLevelData(this.level);
    const texKey = this.level >= 3 ? 'iceplatform' : 'platform';
    const platData = [];

    // Wide ground platform
    platData.push({ x: 195, y: WORLD_H - 60, w: 300, type: 'static' });

    let prevY = WORLD_H - 60;

    // Gap is capped at 115 px so every step is within Noah's max jump height (~230 px).
    // We loop until we reach the Ark instead of stopping at platCount — that was
    // leaving an unreachable gap in the upper half of the world.
    const gMin = Math.min(ld.gapMin - 10, 100);
    const gMax = Math.min(ld.gapMax - 10, 115);

    // Two-column layout: left lane (x≈55-145) + right lane (x≈245-335)
    while (true) {
      const gap = Phaser.Math.Between(gMin, gMax);
      const y   = prevY - gap;
      if (y < ARK_Y + 120) break;

      const w = Phaser.Math.Between(ld.minW + 10, ld.maxW + 10);

      platData.push({ x: Phaser.Math.Between(55, 140), y, w, type: 'static' });
      platData.push({
        x: Phaser.Math.Between(248, 335),
        y: y + Phaser.Math.Between(-22, 22),
        w,
        type: 'static',
      });

      prevY = y;
    }

    // Top platform under Ark
    platData.push({ x: 195, y: ARK_Y + 80, w: 180, type: 'static' });

    // Assign types — guarantee at least 5 moving platforms from level 1
    const eligible = [];
    for (let i = 1; i < platData.length - 1; i++) eligible.push(i);
    const shuffled     = [...eligible].sort(() => Math.random() - 0.5);
    const movingCount  = Math.max(ld.movingCount, 5);
    const crumbleCount = ld.crumbleCount;
    const bounceCount  = ld.bounceCount  || 0;
    const fallingCount = ld.fallingCount || 0;
    let   offset       = 0;
    const movingSet  = new Set(shuffled.slice(offset, offset += movingCount));
    const crumbleSet = new Set(shuffled.slice(offset, offset += crumbleCount));
    const bounceSet  = new Set(shuffled.slice(offset, offset += bounceCount));
    const fallingSet = new Set(shuffled.slice(offset, offset += fallingCount));

    platData.forEach((p, idx) => {
      if (movingSet.has(idx))        p.type = 'moving';
      else if (crumbleSet.has(idx))  p.type = 'crumble';
      else if (bounceSet.has(idx))   p.type = 'bounce';
      else if (fallingSet.has(idx))  p.type = 'falling';
    });

    this._movingPlats = [];

    platData.forEach((p) => {
      if (p.type === 'static') {
        this.staticPlatGroup.create(p.x, p.y, texKey)
          .setDisplaySize(p.w, 18).refreshBody();

      } else if (p.type === 'crumble') {
        const img = this.crumblePlatGroup.create(p.x, p.y, texKey);
        img.setDisplaySize(p.w, 18).refreshBody();
        img.setTint(0xff9966); // orange-red = crumbles
        img.crumbleState = 'normal';

      } else if (p.type === 'bounce') {
        this.bouncePlatGroup.create(p.x, p.y, texKey)
          .setDisplaySize(p.w, 18).refreshBody()
          .setTint(0x44ff88); // green = bouncy

      } else if (p.type === 'falling') {
        const img = this.physics.add.image(p.x, p.y, texKey)
          .setDisplaySize(p.w, 18);
        img.setImmovable(true);
        img.body.allowGravity = false;
        img.setTint(0xdd88ff); // purple = falls when stepped on
        img.triggered = false;
        img._fallSpeed = 0;
        this.fallingPlatGroup.add(img);

      } else if (p.type === 'moving') {
        const img = this.physics.add.image(p.x, p.y, texKey)
          .setDisplaySize(p.w, 18);
        img.setImmovable(true);
        img.body.allowGravity = false;
        img.setTint(0x66ccff); // blue tint = moves
        const spd = Phaser.Math.Between(55, 105) * (Math.random() < 0.5 ? 1 : -1);
        img.setVelocityX(spd);
        img.minX = Math.max(45,  p.x - 90);
        img.maxX = Math.min(345, p.x + 90);
        this.movingPlatGroup.add(img);
        this._movingPlats.push(img);
      }
    });
  }

  // ── Animals on platforms ────────────────────────────────────────────
  _spawnAnimals() {
    this.animalGroup = this.physics.add.group();

    // Place one animal on every 3rd static platform (skip bottom/top)
    const statics = this.staticPlatGroup.getChildren();
    statics.forEach((plat, i) => {
      if (i === 0 || i === statics.length - 1) return;
      if (i % 3 !== 1) return;
      this._placeAnimalOn(plat.x, plat.y);
    });

    // One animal on every other moving platform
    this._movingPlats.forEach((plat, i) => {
      if (i % 2 !== 0) return;
      this._placeAnimalOn(plat.x, plat.y);
    });
  }

  _placeAnimalOn(px, py) {
    const type   = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const animal = this.animalGroup.create(px, py - 30, type);
    animal.setScale(0.78).setDepth(4);
    animal.body.allowGravity = false;
    animal.body.immovable = true;
    this.tweens.add({
      targets: animal,
      y: animal.y - 7,
      duration: 750 + Phaser.Math.Between(0, 300),
      yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _onCollectAnimal(noah, animal) {
    const ax = animal.x, ay = animal.y;
    animal.destroy();

    // Combo: chaining rescues within 4s multiplies the points
    const now = this.time.now;
    this._combo = (now - this._lastCollect < 4000) ? this._combo + 1 : 1;
    this._lastCollect = now;
    const pts = 25 * this._combo;
    this.score += pts;
    this._animalsCollected++;

    this.sound.collect(this._combo);
    const comboCols = ['#ffe066', '#ffb347', '#ff7eb6', '#ff5252', '#e040fb'];
    const col = comboCols[Math.min(this._combo - 1, comboCols.length - 1)];
    this._showFloatText(ax, ay - 28, this._combo > 1 ? `+${pts}  x${this._combo} COMBO!` : '+25', col);
    if (this._combo >= 3) this.cameras.main.shake(90, 0.004);
    this._showCollectEffect(ax, ay);
    this.events.emit('scoreUpdate', this.score);
  }

  _showCollectEffect(x, y) {
    const cols = [0xffd700, 0xff69b4, 0x00ff88, 0xff6622, 0x44eeff, 0xffffff];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist  = Phaser.Math.Between(38, 85);
      const star  = this.add.image(x, y, 'star')
        .setScale(0.55).setDepth(22).setTint(cols[i % cols.length]);
      this.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        scaleX: 0, scaleY: 0, alpha: 0,
        duration: 520, ease: 'Power2',
        onComplete: () => star.destroy(),
      });
    }
  }

  // ── Bounce logic ─────────────────────────────────────────────────────
  _onBounceCollide(noah, plat) {
    if (!noah.body.blocked.down) return;
    noah.setVelocityY(-780);
    this.sound.bounce();
    this._showFloatText(noah.x, noah.y - 32, 'BOING!', '#44ffaa');
    this.cameras.main.shake(80, 0.006);
  }

  // ── Crumble logic ────────────────────────────────────────────────────
  _onCrumbleCollide(noah, plat) {
    if (!noah.body.blocked.down) return;
    if (plat.crumbleState !== 'normal') return;
    plat.crumbleState = 'crumbling';
    this.tweens.add({
      targets: plat,
      alpha: 0.25,
      duration: 90,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        plat.setVisible(false);
        plat.body.enable = false;
      },
    });
  }

  // ── Falling platform logic ───────────────────────────────────────────
  _onFallingCollide(noah, plat) {
    if (!noah.body.blocked.down) return;
    if (plat.triggered) return; // shake already running — don't restart it
    plat.triggered = true;

    // Shake sideways for ~450ms, then drop
    this.tweens.add({
      targets: plat,
      x: plat.x + 5,
      duration: 75,
      yoyo: true,
      repeat: 5,
      ease: 'Linear',
      onComplete: () => {
        if (!plat.active) return;
        plat._fallSpeed = 70;
        this._fallingActive.push(plat);
      },
    });
  }

  // ── Rain ─────────────────────────────────────────────────────────────
  _spawnRain() {
    const tier  = this._rainTier || 0;
    const count = 1 + Math.floor(tier / 2); // extra drops at higher tiers
    for (let i = 0; i < count; i++) {
      const x    = Phaser.Math.Between(0, 390);
      const drop = this.add.image(x, this.cameras.main.scrollY - 10, 'raindrop')
        .setDepth(1).setAlpha(0.45 + tier * 0.06)
        .setScale(1 + tier * 0.12);
      this.rainGroup.add(drop);
    }
  }

  // ── Float text ───────────────────────────────────────────────────────
  _showFloatText(x, y, msg, color = '#fff') {
    const t = this.add.text(x, y, msg, {
      fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: color, stroke: '#222', strokeThickness: 3,
    }).setDepth(20).setOrigin(0.5);
    this.tweens.add({
      targets: t, y: y - 55, alpha: 0, duration: 950,
      ease: 'Power2', onComplete: () => t.destroy(),
    });
  }

  // ── Controls ─────────────────────────────────────────────────────────
  _setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();

    const W = 390, H = 844, BY = H - 72;
    this._ctrlTop = H - 142;
    this._jumpLastPressed = -1000;

    // Track active touch IDs per zone using DOM events.
    // More reliable on iOS Safari than Phaser's pointer polling — survives
    // multi-touch edge cases and doesn't lose state across many interactions.
    this._leftTouchIds  = new Set();
    this._rightTouchIds = new Set();
    this._jumpTouchIds  = new Set();

    const canvas = this.game.canvas;

    const coords = (touch) => {
      const r = canvas.getBoundingClientRect();
      return {
        gx: (touch.clientX - r.left) * (390 / r.width),
        gy: (touch.clientY - r.top)  * (844 / r.height),
      };
    };

    const onStart = (e) => {
      for (const t of e.changedTouches) {
        const { gx, gy } = coords(t);
        if (gy < this._ctrlTop) continue;
        if      (gx < 130) this._leftTouchIds.add(t.identifier);
        else if (gx < 258) this._rightTouchIds.add(t.identifier);
        else {
          this._jumpTouchIds.add(t.identifier);
          this._jumpLastPressed = this.time.now;
        }
      }
    };

    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        this._leftTouchIds.delete(t.identifier);
        this._rightTouchIds.delete(t.identifier);
        this._jumpTouchIds.delete(t.identifier);
      }
    };

    // On cancel (system interrupt, notification, swipe-up) changedTouches may be
    // incomplete — clear everything so no IDs get stranded in the Sets.
    const onCancel = () => {
      this._leftTouchIds.clear();
      this._rightTouchIds.clear();
      this._jumpTouchIds.clear();
    };

    canvas.addEventListener('touchstart',  onStart,   { passive: true });
    canvas.addEventListener('touchend',    onEnd,     { passive: true });
    canvas.addEventListener('touchcancel', onCancel,  { passive: true });
    // Also clear when the page loses focus (tab switch, home button on iOS)
    window.addEventListener('blur', onCancel);

    this.events.once('shutdown', () => {
      canvas.removeEventListener('touchstart',  onStart);
      canvas.removeEventListener('touchend',    onEnd);
      canvas.removeEventListener('touchcancel', onCancel);
      window.removeEventListener('blur', onCancel);
      this._leftTouchIds.clear();
      this._rightTouchIds.clear();
      this._jumpTouchIds.clear();
    });

    // ── Dark translucent strip
    this.add.rectangle(W / 2, H - 70, W, 142, 0x000000, 0.44)
      .setScrollFactor(0).setDepth(29);

    const g = this.add.graphics().setScrollFactor(0).setDepth(30);
    const drawBtn = (cx, cy, r, col) => {
      g.fillStyle(0x000000, 0.38); g.fillCircle(cx + 3, cy + 5, r);
      g.fillStyle(col, 0.92);      g.fillCircle(cx, cy, r);
      g.fillStyle(0xffffff, 0.24); g.fillEllipse(cx - r * 0.18, cy - r * 0.28, r * 1.1, r * 0.52);
      g.fillStyle(0x000000, 0.16); g.fillEllipse(cx, cy + r * 0.44, r * 1.55, r * 0.48);
    };
    drawBtn( 68, BY, 50, 0x1a3a88);
    drawBtn(182, BY, 50, 0x1a3a88);
    drawBtn(316, BY, 62, 0xcc4200);

    const ico = (x, y, t, sz) => this.add.text(x, y, t, {
      fontSize: sz || '42px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(32);
    ico( 68, BY - 1, '←');
    ico(182, BY - 1, '→');
    ico(316, BY - 6, '↑', '48px');
    this.add.text(316, BY + 32, 'JUMP', {
      fontSize: '12px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: 'rgba(255,215,130,0.85)',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(32);

    const mkOvl = (cx, cy, r) => {
      const og = this.add.graphics().setScrollFactor(0).setDepth(33);
      og.fillStyle(0x000000, 0.34); og.fillCircle(cx, cy, r);
      return og.setAlpha(0);
    };
    this._lOvl = mkOvl( 68, BY, 50);
    this._rOvl = mkOvl(182, BY, 50);
    this._jOvl = mkOvl(316, BY, 62);
  }

  // ── Death / Win ───────────────────────────────────────────────────────
  handleDeath() {
    if (this._dying) return;
    this._dying = true;
    this.lives--;
    this.events.emit('livesUpdate', this.lives);
    this.cameras.main.shake(300, 0.012);
    this.sound.loseLife();

    if (this.lives <= 0) {
      this.sound.stopMusic();
      this.time.delayedCall(900, () => {
        this.scene.stop('UI');
        this.scene.start('GameOver', { score: this.score, level: this.level, animalsCollected: this._animalsCollected });
      });
    } else {
      this._waterPaused = true; // freeze water while respawning
      this.time.delayedCall(600, () => {
        this._dying = false;
        this._combo = 0;
        this._lastCollect = -1e9;
        this._jumpLastPressed = -1000;
        this.noah.setPosition(195, WORLD_H - 120);
        this.noah.setVelocity(0, 0);
        this.camMinScrollY = WORLD_H - 702;
        // Push water back 320px and give a 3s grace pause
        this._waterLevel = Math.min(this._waterLevel + 320, WORLD_H + 40);
        this.time.delayedCall(3000, () => { this._waterPaused = false; });
      });
    }
  }

  handleWin() {
    if (this._won) return;
    this._won = true;
    this._waterSpeed = 0; // flood stops!
    this.score += 100 + this.lives * 50;
    this.sound.stopMusic();
    this.sound.win();

    // Open the ark door
    this.arkImage.setTexture('ark-open');

    // Disable physics so we can freely tween Noah into the ark
    this.noah.body.enable = false;
    this.tweens.add({
      targets: this.noah,
      x: 195, y: ARK_Y + 22,
      duration: 700,
      ease: 'Power2',
      onComplete: () => {
        this.noah.setVisible(false);
        // Ark bounces in celebration
        this.tweens.add({
          targets: this.arkImage,
          y: ARK_Y - 12,
          duration: 130,
          yoyo: true,
          repeat: 5,
          onComplete: () => {
            this.time.delayedCall(350, () => {
              this.scene.stop('UI');
              this.scene.start('Win', {
                level: this.level,
                score: this.score,
                animalsCollected: this._animalsCollected,
              });
            });
          },
        });
      },
    });
  }

  // ── Main loop ─────────────────────────────────────────────────────────
  update(time, delta) {
    if (!this.noah || !this._movingPlats || !this._fallingActive) return; // guard: _createGame() failed
    const noah = this.noah;
    const dt   = delta / 1000;

    // Read touch state from DOM Set-based tracking (set in _setupControls).
    this.leftHeld  = !!(this._leftTouchIds  && this._leftTouchIds.size  > 0);
    this.rightHeld = !!(this._rightTouchIds && this._rightTouchIds.size > 0);
    let jTouched   = !!(this._jumpTouchIds  && this._jumpTouchIds.size  > 0);
    if (this._lOvl) this._lOvl.setAlpha(this.leftHeld  ? 1 : 0);
    if (this._rOvl) this._rOvl.setAlpha(this.rightHeld ? 1 : 0);
    if (this._jOvl) this._jOvl.setAlpha(jTouched ? 1 : 0);

    // Horizontal movement
    noah.setVelocityX(0);
    if (this.cursors.left.isDown  || this.leftHeld)  { noah.setVelocityX(-NOAH_SPEED); noah.setFlipX(true);  }
    else if (this.cursors.right.isDown || this.rightHeld) { noah.setVelocityX(NOAH_SPEED); noah.setFlipX(false); }

    // Falling platform carry — must run before jump check.
    // Riding is detected geometrically (feet near the surface, within the
    // platform's width) instead of via collision callbacks, which proved
    // unreliable for bodies moved by position each frame.
    noah.body.gravity.y = 680;
    this._ridingFalling = false;
    for (let i = this._fallingActive.length - 1; i >= 0; i--) {
      const fp = this._fallingActive[i];
      if (!fp.active) {
        this._fallingActive.splice(i, 1);
        continue;
      }

      // Move platform directly — no velocity, avoids physics conflicts
      fp._fallSpeed = Math.min(fp._fallSpeed + 280 * dt, 480);
      const dy = fp._fallSpeed * dt;
      fp.y += dy;
      fp.body.position.y = fp.y - fp.body.halfHeight;

      const platTop  = fp.body.position.y;
      const noahFeet = noah.body.position.y + noah.body.height;
      const onPlatX  = Math.abs(noah.x - fp.x) < fp.displayWidth / 2 + 16;

      if (time > this._fallJumpUntil &&
          noah.body.velocity.y >= 0 &&
          onPlatX &&
          noahFeet > platTop - 10 && noahFeet < platTop + 36) {
        // Ride: match the platform's speed plus a small correction that
        // keeps Noah's feet pinned to the surface without teleporting him.
        const correction = Phaser.Math.Clamp((platTop - noahFeet) * 12, -120, 120);
        noah.body.velocity.y = fp._fallSpeed + correction;
        noah.body.gravity.y  = 0;
        this._ridingFalling  = true;
      }

      if (fp.y > this._waterLevel + 300) {
        this._fallingActive.splice(i, 1);
        fp.destroy();
      }
    }

    // Jump — held finger auto-jumps on landing; quick tap gives 300 ms buffer
    const jumpReady = this.cursors.up.isDown || jTouched || (time - this._jumpLastPressed < 1500);
    if (jumpReady && (noah.body.blocked.down || this._ridingFalling)) {
      noah.setVelocityY(JUMP_FORCE);
      noah.body.gravity.y   = 680;
      this._jumpLastPressed = -1000;
      this._ridingFalling   = false;
      this._fallJumpUntil   = time + 250; // ride logic won't re-grab Noah mid-ascent
      // Stretch on takeoff
      if (this._scaleTween) this._scaleTween.stop();
      noah.setScale(0.82, 1.18);
      this._scaleTween = this.tweens.add({
        targets: noah, scaleX: 1, scaleY: 1, duration: 220, ease: 'Quad.easeOut',
      });
      this.sound.jump();
    }

    // Squash on landing
    const grounded = noah.body.blocked.down || this._ridingFalling;
    if (grounded && this._wasAirborne) {
      if (this._scaleTween) this._scaleTween.stop();
      noah.setScale(1.18, 0.84);
      this._scaleTween = this.tweens.add({
        targets: noah, scaleX: 1, scaleY: 1, duration: 160, ease: 'Quad.easeOut',
      });
    }
    this._wasAirborne = !grounded;

    // Carry player on moving platforms
    if (noah.body.blocked.down) {
      this._movingPlats.forEach((plat) => {
        if (!plat.active) return;
        const hw = plat.displayWidth / 2;
        const hh = plat.displayHeight / 2;
        if (
          Math.abs((noah.y + noah.displayHeight / 2) - (plat.y - hh)) < 12 &&
          noah.x >= plat.x - hw - 4 &&
          noah.x <= plat.x + hw + 4
        ) {
          noah.x += plat.body.velocity.x * dt;
        }
      });
    }

    // Move and reverse moving platforms
    this._movingPlats.forEach((plat) => {
      if (!plat.active) return;
      if (plat.x <= plat.minX && plat.body.velocity.x < 0) plat.setVelocityX( Math.abs(plat.body.velocity.x));
      if (plat.x >= plat.maxX && plat.body.velocity.x > 0) plat.setVelocityX(-Math.abs(plat.body.velocity.x));
    });

    // Rising water — paused during respawn grace period
    if (!this._waterPaused) this._waterLevel -= this._waterSpeed * dt;
    const waterBlockH = 2400;
    this._waterGfx.setPosition(195, this._waterLevel + waterBlockH / 2);
    this._waterSurface.setPosition(195, this._waterLevel + 60);

    // Death from water
    if (!this._dying && noah.y + 20 >= this._waterLevel) {
      this.handleDeath();
    }

    // Camera — ratchet up when Noah climbs; safety follow when Noah falls near controls
    const targetY = noah.y - 580;
    if (targetY < this.camMinScrollY) this.camMinScrollY = targetY;
    // If Noah falls to screen-y > 600 (near control strip), let camera follow down
    const safetyY = noah.y - 600;
    if (safetyY > this.camMinScrollY) {
      this.camMinScrollY = Phaser.Math.Clamp(safetyY, 0, WORLD_H - 702);
    }
    this.cameras.main.scrollY += (this.camMinScrollY - this.cameras.main.scrollY) * 0.06;
    this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY, 0, WORLD_H - 702);

    // Rain cleanup
    // Snapshot the array first — destroying during live iteration skips elements
    [...this.rainGroup.getChildren()].forEach((drop) => {
      drop.y += 7;
      if (drop.y > this.cameras.main.scrollY + 900) drop.destroy();
    });

    // Fall below camera
    if (noah.y > this.cameras.main.scrollY + 844 + 80) this.handleDeath();

    // Win — only when Noah is standing on the top platform (blocked + close to ark)
    if (!this._won && !this._dying && noah.y < ARK_Y + 110 && noah.body.blocked.down) this.handleWin();

    // UI updates
    const progress = Phaser.Math.Clamp((WORLD_H - noah.y) / (WORLD_H - ARK_Y), 0, 1);
    this.events.emit('heightUpdate', progress);

    const waterDist = this._waterLevel - noah.y;
    const danger    = Phaser.Math.Clamp(1 - waterDist / 280, 0, 1);
    this.events.emit('waterUpdate', danger);
  }
}
