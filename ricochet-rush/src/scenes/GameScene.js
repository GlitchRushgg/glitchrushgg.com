// RICOCHET RUSH — núcleo. Arena única: te mueves (WASD/flechas/puntero), el
// cañón dispara solo al enemigo más cercano y TODAS las balas rebotan en las
// paredes. Enjambre creciente, gemas de XP → cartas de mejora, monedas
// persistentes. Sin motor de físicas: todo manual (robusto a cualquier Hz).

import { W, H, PAL, ENEMIES } from "../const.js";
import { t } from "../i18n.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { UPGRADES, HEAL_CARD } from "../items.js";

const WALL = 26;              // grosor visual del marco de la arena
const PLAYER_R = 16;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.snd = new Sound();
    this.snd.startMusic();
    this.events.once("shutdown", () => this.snd.stopMusic());

    const onBlur = () => { if (!this.dead && !this.paused && !this.choosing) this._togglePause(); };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once("shutdown", () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));

    // Estado del jugador (los perks permanentes de la tienda entran aquí).
    this.stats = {
      maxHp: 3 + Save.perkLevel("vit"),
      hp: 3 + Save.perkLevel("vit"),
      dmg: 10 * (1 + 0.1 * Save.perkLevel("pow")),
      fireRate: 2,
      bounces: 2,
      multishot: 1,
      pierce: 0,
      moveSpeed: 240 * (1 + 0.08 * Save.perkLevel("agi")),
      bulletSpeed: 480,
      magnet: 90,
    };
    this.luck = Save.perkLevel("luck");

    this.dead = false;
    this.paused = false;
    this.choosing = false;      // congela el mundo durante la elección de carta
    this.elapsed = 0;
    this.kills = 0;
    this.caramb = 0;            // bajas con bala de ≥2 rebotes (la stat viral)
    this._slowT = 0;            // cámara lenta breve de la carambola
    this._lastCarambAt = -9999;
    this.runCoins = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = 8;
    this.invuln = 0;
    this._fireT = 0;
    this._spawnT = 0.9;
    this._eid = 0;
    this.upTaken = {};          // id → veces cogida

    this.bullets = [];
    this.enemies = [];
    this.drops = [];            // gemas y monedas

    this._buildArena();
    this._buildPlayer();
    this._buildHUD();
    this._buildInput();
    this._buildTutorial();

    if (typeof window !== "undefined") window.__rr = this; // hook de depuración
  }

  // ------------------------------------------------------------ construcción

  _buildArena() {
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(PAL.bgTop, PAL.bgTop, PAL.bgBottom, PAL.bgBottom, 1);
    g.fillRect(0, 0, W, H);
    this.add.tileSprite(W / 2, H / 2, W, H, "grid").setTint(PAL.grid).setAlpha(0.22).setDepth(1);
    // Marco neón de la arena (las balas rebotan aquí).
    const frame = this.add.graphics().setDepth(2);
    frame.lineStyle(4, PAL.player, 0.55);
    frame.strokeRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
    frame.lineStyle(10, PAL.player, 0.1);
    frame.strokeRect(WALL, WALL, W - WALL * 2, H - WALL * 2);

    // Prismas rebotadores: mobiliario fijo que rebota BALAS (los enemigos
    // pasan por debajo). Hacen visible el twist desde el segundo 1.
    this.prisms = [
      { x: W * 0.3, y: H / 2, r: 44 },
      { x: W * 0.7, y: H / 2, r: 44 },
    ];
    this.prisms.forEach((p) => {
      this.add.image(p.x, p.y, "glow").setDepth(2).setScale(2.2).setAlpha(0.25).setTint(PAL.player);
      const spr = this.add.image(p.x, p.y, "prism").setDepth(3).setTint(PAL.player).setAlpha(0.9);
      this.tweens.add({ targets: spr, alpha: 0.6, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    });
  }

  _buildPlayer() {
    this.px = W / 2;
    this.py = H / 2;
    this.orbAura = this.add.image(this.px, this.py, "glow").setDepth(9).setScale(1.7)
      .setAlpha(0.5).setTint(PAL.player);
    this.orb = this.add.image(this.px, this.py, "player").setDepth(10).setTint(PAL.player);
  }

  _buildHUD() {
    const f = (size, extra = {}) => ({
      fontFamily: "'Consolas', 'Courier New', monospace",
      fontSize: size, color: "#ffe6b0", fontStyle: "bold", ...extra,
    });
    // Cronómetro (la puntuación) arriba al centro.
    this.hudTime = this.add.text(W / 2, 34, "0:00", f("36px", { color: "#ffffff" }))
      .setOrigin(0.5).setDepth(20);
    this.hudKills = this.add.text(W / 2, 66, "", f("15px")).setOrigin(0.5).setDepth(20);

    // Barra de XP (borde superior) + nivel.
    this.xpBar = this.add.rectangle(0, 3, 0, 6, PAL.xp, 1).setOrigin(0, 0.5).setDepth(21);
    this.hudLevel = this.add.text(24, 18, "", f("18px", { color: "#7cff5e" })).setDepth(20);

    // Corazones (debajo del nivel).
    this.hearts = [];
    this._refreshHearts();

    // Monedas.
    this.add.image(24, 96, "coin").setOrigin(0, 0.5).setTint(PAL.coin).setDepth(20);
    this.hudCoins = this.add.text(50, 96, "0", f("18px", { color: "#ffd94e" })).setOrigin(0, 0.5).setDepth(20);

    // Pausa y mute (táctil ≥44px), zona excluida del movimiento en _hudHit.
    const mkBtn = (x, label, cb) => {
      const b = this.add.text(x, 14, label, f("26px", { backgroundColor: "#2a1f10cc" }))
        .setOrigin(1, 0).setPadding(16, 12, 16, 12).setDepth(22).setInteractive({ useHandCursor: true });
      b.on("pointerdown", cb);
      return b;
    };
    this.muteBtn = mkBtn(W - 106, this.snd.muted ? "🔇" : "🔊", () => {
      this.snd.setMuted(!this.snd.muted);
      this.muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
    });
    this.pauseBtn = mkBtn(W - 24, "⏸", () => this._togglePause());
  }

  _refreshHearts() {
    this.hearts.forEach((h) => h.destroy());
    this.hearts = [];
    for (let i = 0; i < this.stats.maxHp; i++) {
      const filled = i < this.stats.hp;
      this.hearts.push(
        this.add.image(32 + i * 28, 58, "heart").setDepth(20)
          .setTint(filled ? PAL.hurt : 0x3a2a1a).setAlpha(filled ? 1 : 0.6)
      );
    }
  }

  _hudHit(p) {
    return p.y < 84 && p.x > W - 210;
  }

  _buildInput() {
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");
    this.input.keyboard.on("keydown-P", () => this._togglePause());
    this.input.keyboard.on("keydown-ESC", () => this._togglePause());
    this.input.on("pointerdown", (p) => {
      if (this.paused && !this._hudHit(p)) this._togglePause();
    });
  }

  _buildTutorial() {
    if (Save.tutorialDone()) return;
    const f = {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "24px",
      color: "#ffffff", fontStyle: "bold", stroke: "#8a5a00", strokeThickness: 5,
    };
    const t1 = this.add.text(W / 2, H / 2 - 90, t("howtoMove"), f).setOrigin(0.5).setDepth(25);
    const t2 = this.add.text(W / 2, H / 2 + 90, t("howtoShoot"), { ...f, fontSize: "19px" })
      .setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t1, scale: 1.08, duration: 480, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.time.delayedCall(6500, () => {
      [t1, t2].forEach((x) => this.tweens.add({ targets: x, alpha: 0, duration: 600, onComplete: () => x.destroy() }));
      Save.setTutorialDone();
    });
  }

  // ------------------------------------------------------------------- pausa

  _togglePause() {
    if (this.dead || this.choosing) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.snd.stopMusic();
      this.pauseVeil = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.66).setDepth(30);
      this.pauseTxt = this.add.text(W / 2, H / 2 - 20, "⏸  " + t("paused"), {
        fontFamily: "'Consolas', monospace", fontSize: "48px", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5).setDepth(31);
      this.pauseTxt2 = this.add.text(W / 2, H / 2 + 40, t("resume"), {
        fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "20px", color: "#ffe6b0",
      }).setOrigin(0.5).setDepth(31);
    } else {
      this.snd.startMusic();
      [this.pauseVeil, this.pauseTxt, this.pauseTxt2].forEach((o) => o && o.destroy());
    }
  }

  // ------------------------------------------------------------------ update

  update(timeNow, dms) {
    if (this.dead || this.paused || this.choosing) return;
    const dtRaw = Math.min(0.05, dms / 1000);
    // Slow-mo breve de la carambola (el mundo al 30%; el reloj real sigue).
    if (this._slowT > 0) this._slowT -= dtRaw;
    const dt = this._slowT > 0 ? dtRaw * 0.3 : dtRaw;
    this.elapsed += dt;

    this._movePlayer(dt);
    this._autofire(dt);
    this._updateBullets(dt);
    this._spawnEnemies(dt);
    this._updateEnemies(dt);
    this._updateDrops(dt);

    // Invulnerabilidad (parpadeo).
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.orb.setAlpha(Math.sin(timeNow / 40) > 0 ? 1 : 0.35);
    } else this.orb.setAlpha(1);

    this.orbAura.setScale(1.6 + Math.sin(timeNow / 200) * 0.15);

    // HUD.
    const m = Math.floor(this.elapsed / 60), s = Math.floor(this.elapsed % 60);
    this.hudTime.setText(`${m}:${String(s).padStart(2, "0")}`);
    this.hudKills.setText(`☠ ${this.kills} ${t("kills")}`);
    this.hudLevel.setText(`${t("level")} ${this.level}`);
    this.hudCoins.setText(`${this.runCoins}`);
    this.xpBar.width = (this.xp / this.xpNeed) * W;
  }

  _movePlayer(dt) {
    let dx = 0, dy = 0;
    const k = this.keys;
    if (k.A.isDown || k.LEFT.isDown) dx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) dx += 1;
    if (k.W.isDown || k.UP.isDown) dy -= 1;
    if (k.S.isDown || k.DOWN.isDown) dy += 1;

    const p = this.input.activePointer;
    if (dx === 0 && dy === 0 && p.isDown && !this._hudHit(p)) {
      const wx = p.worldX, wy = p.worldY;
      const ddx = wx - this.px, ddy = wy - this.py;
      const d = Math.hypot(ddx, ddy);
      if (d > 14) { dx = ddx / d; dy = ddy / d; }
    }

    if (dx || dy) {
      const n = Math.hypot(dx, dy);
      this.px += (dx / n) * this.stats.moveSpeed * dt;
      this.py += (dy / n) * this.stats.moveSpeed * dt;
      this.px = Phaser.Math.Clamp(this.px, WALL + PLAYER_R + 4, W - WALL - PLAYER_R - 4);
      this.py = Phaser.Math.Clamp(this.py, WALL + PLAYER_R + 4, H - WALL - PLAYER_R - 4);
    }
    this.orb.setPosition(this.px, this.py);
    this.orbAura.setPosition(this.px, this.py);

    // El cañón apunta al objetivo actual.
    const tgt = this._nearestEnemy();
    if (tgt) this.orb.setRotation(Math.atan2(tgt.y - this.py, tgt.x - this.px) + Math.PI / 2);
  }

  _nearestEnemy() {
    let best = null, bd = Infinity;
    for (const e of this.enemies) {
      const d = (e.x - this.px) ** 2 + (e.y - this.py) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ------------------------------------------------------------------ balas

  _autofire(dt) {
    this._fireT -= dt;
    if (this._fireT > 0) return;
    const tgt = this._nearestEnemy();
    if (!tgt) return;
    this._fireT = 1 / this.stats.fireRate;
    const base = Math.atan2(tgt.y - this.py, tgt.x - this.px);
    const n = this.stats.multishot;
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (i - (n - 1) / 2) * 0.16;
      const a = base + off;
      const spr = this.add.image(this.px, this.py, "bullet").setDepth(7).setTint(PAL.bullet);
      this.bullets.push({
        spr, x: this.px, y: this.py,
        vx: Math.cos(a) * this.stats.bulletSpeed, vy: Math.sin(a) * this.stats.bulletSpeed,
        bounces: this.stats.bounces, pierce: this.stats.pierce,
        dmg: this.stats.dmg, life: 6, hitIds: new Set(),
        charge: 0, trailT: 0,   // rebotes acumulados (cargan daño) + reloj de estela
      });
    }
    this.snd.shoot();
  }

  _updateBullets(dt) {
    const L = WALL + 7, R = W - WALL - 7, T = WALL + 7, B = H - WALL - 7;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Rebote en las paredes de la arena.
      let bounced = false;
      if (b.x < L) { b.x = L; b.vx = Math.abs(b.vx); bounced = true; }
      else if (b.x > R) { b.x = R; b.vx = -Math.abs(b.vx); bounced = true; }
      if (b.y < T) { b.y = T; b.vy = Math.abs(b.vy); bounced = true; }
      else if (b.y > B) { b.y = B; b.vy = -Math.abs(b.vy); bounced = true; }
      if (bounced) {
        b.bounces -= 1;
        if (b.bounces < 0) { this._killBullet(i); continue; }
        this._chargeBullet(b);
        this.snd.bounce();
        this._burst(b.x, b.y, 3, PAL.bullet);
      }

      // Prismas: rebotan la bala (sin gastar sus rebotes — son la recompensa).
      for (const pz of this.prisms) {
        const rr = pz.r + 7;
        const ddx = b.x - pz.x, ddy = b.y - pz.y;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 1;
          const nx = ddx / d, ny = ddy / d;
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {                       // solo si entra hacia el prisma
            b.vx -= 2 * dot * nx;
            b.vy -= 2 * dot * ny;
            b.x = pz.x + nx * rr;
            b.y = pz.y + ny * rr;
            this._chargeBullet(b);
            this.snd.bounce();
            this._burst(b.x, b.y, 4, PAL.player);
          }
        }
      }

      // Estela solo en balas cargadas (se leen como "veteranas" y no cuesta
      // rendimiento con multishot alto).
      if (b.charge > 0) {
        b.trailT -= dt;
        if (b.trailT <= 0) {
          b.trailT = 0.045;
          const gh = this.add.image(b.x, b.y, "bullet").setDepth(6)
            .setTint(0xffffff).setAlpha(0.35).setScale(b.spr.scaleX);
          this.tweens.add({ targets: gh, alpha: 0, scale: 0.2, duration: 220, onComplete: () => gh.destroy() });
        }
      }

      // Impactos.
      let dead = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (b.hitIds.has(e.id)) continue;
        const rr = e.r + 7;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < rr * rr) {
          b.hitIds.add(e.id);
          this._damageEnemy(e, j, b.dmg, b);
          if (b.pierce > 0) b.pierce -= 1;
          else { dead = true; break; }
        }
      }
      if (dead || b.life <= 0) { this._killBullet(i); continue; }
      b.spr.setPosition(b.x, b.y);
    }
  }

  _killBullet(i) {
    this.bullets[i].spr.destroy();
    this.bullets.splice(i, 1);
  }

  // Cada rebote CARGA la bala: +45% daño acumulativo, más grande y más blanca.
  // Fallar a propósito (o carambolear en un prisma) es estrategia.
  _chargeBullet(b) {
    if (b.charge >= 6) return;                 // tope de carga (×9.3 daño)
    b.charge += 1;
    b.dmg *= 1.45;
    b.spr.setScale(1 + b.charge * 0.15);
    b.spr.setTint(b.charge >= 2 ? 0xffffff : 0xfff2c8);
  }

  // --------------------------------------------------------------- enemigos

  _spawnEnemies(dt) {
    this._spawnT -= dt;
    if (this._spawnT > 0) return;
    // Arranque caliente (1.25s) → suelo 0.5s; tandas cada 90s para que el
    // doblete "tanda×2 + tanks" no caiga junto (muro de t=75-90 del informe).
    const tSec = this.elapsed;
    this._spawnT = Math.max(0.5, 1.25 - tSec * 0.0037);
    const batch = 1 + Math.floor(tSec / 90);

    const pool = Object.entries(ENEMIES).filter(([, d]) => tSec >= d.from);
    for (let i = 0; i < batch; i++) {
      const [kind, def] = pool[Phaser.Math.Between(0, pool.length - 1)];
      this._spawnEnemy(kind, def, tSec);
    }
  }

  _spawnEnemy(kind, def, tSec, at) {
    // Nace pegado a un borde aleatorio, dentro de la arena.
    let x, y;
    if (at) { x = at.x; y = at.y; }
    else {
      const side = Phaser.Math.Between(0, 3);
      const m = WALL + 30;
      if (side === 0) { x = Phaser.Math.Between(m, W - m); y = m; }
      else if (side === 1) { x = Phaser.Math.Between(m, W - m); y = H - m; }
      else if (side === 2) { x = m; y = Phaser.Math.Between(m, H - m); }
      else { x = W - m; y = Phaser.Math.Between(m, H - m); }
    }

    const scale = 1 + tSec / 120;              // el enjambre se endurece con el tiempo
    const elite = tSec > 210 && kind !== "mini" && Math.random() < 0.15;
    const spr = this.add.image(x, y, def.tex).setDepth(6)
      .setTint(elite ? 0xffd94e : def.tint);
    if (elite) spr.setScale(1.35);
    const e = {
      id: this._eid++, kind, spr, x, y, r: def.r * (elite ? 1.35 : 1),
      hp: def.hp * scale * (elite ? 3.5 : 1),
      maxHp: def.hp * scale * (elite ? 3.5 : 1),
      speed: def.speed * (elite ? 0.9 : 1),
      xp: def.xp * (elite ? 4 : 1),
      elite,
    };
    this.enemies.push(e);
    // Aviso de aparición (fade-in) para que no muerda de la nada.
    spr.setAlpha(0);
    this.tweens.add({ targets: spr, alpha: 1, duration: 350 });
    if (elite) {
      this.snd.elite();
      this._floatText(e.x, e.y - 40, t("eliteWarn"), 0xffd94e);
    }
  }

  _updateEnemies(dt) {
    for (const e of this.enemies) {
      const dx = this.px - e.x, dy = this.py - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
      e.spr.setPosition(e.x, e.y);
      e.spr.setRotation(Math.atan2(dy, dx) + Math.PI / 2);

      // Contacto con el jugador.
      const rr = e.r + PLAYER_R;
      if (this.invuln <= 0 && (e.x - this.px) ** 2 + (e.y - this.py) ** 2 < rr * rr) {
        this._hurtPlayer(e);
      }
    }
  }

  _damageEnemy(e, ix, dmg, bullet) {
    e.hp -= dmg;
    this.snd.hitEnemy();
    e.spr.setTintFill(0xffffff);
    this.time.delayedCall(45, () => e.spr && e.spr.setTint(e.elite ? 0xffd94e : ENEMIES[e.kind].tint));
    if (e.hp <= 0) this._killEnemy(e, ix, bullet);
  }

  _killEnemy(e, ix, bullet) {
    this.kills += 1;
    this.snd.kill();

    // ¡CARAMBOLA!: baja con bala de ≥2 rebotes — la stat viral del juego.
    if (bullet && bullet.charge >= 2) {
      this.caramb += 1;
      if (this.time.now - this._lastCarambAt > 8000) {
        this._lastCarambAt = this.time.now;
        this._slowT = 0.25;
        this._floatText(e.x, e.y - 44, "🎱 " + t("caramb"), 0xffffff);
        this.cameras.main.zoomTo(1.06, 120, "Linear", true);
        this.time.delayedCall(280, () => this.cameras.main.zoomTo(1, 180, "Linear", true));
      }
    }
    this._burst(e.x, e.y, e.elite ? 14 : 7, e.elite ? 0xffd94e : ENEMIES[e.kind].tint);

    // Drops: gema de XP siempre; moneda a veces (élite: 3 seguras).
    this._addDrop(e.x, e.y, "gem", e.xp);
    const coinChance = 0.08 * (1 + this.luck * 0.5);
    if (e.elite) for (let c = 0; c < 3; c++) this._addDrop(e.x + Phaser.Math.Between(-18, 18), e.y + Phaser.Math.Between(-18, 18), "coin", 1);
    else if (Math.random() < coinChance) this._addDrop(e.x, e.y, "coin", 1);

    // Splitter: se parte en 2 minis.
    if (e.kind === "splitter") {
      const def = ENEMIES.mini;
      this._spawnEnemy("mini", def, this.elapsed, { x: e.x - 16, y: e.y });
      this._spawnEnemy("mini", def, this.elapsed, { x: e.x + 16, y: e.y });
    }

    e.spr.destroy();
    this.enemies.splice(ix, 1);
  }

  _hurtPlayer(e) {
    this.stats.hp -= 1;
    this.invuln = 1.2;
    this.snd.hurt();
    this.cameras.main.shake(180, 0.01);
    this._refreshHearts();
    // Empujón al enemigo que muerde (para que no te encadene).
    const dx = e.x - this.px, dy = e.y - this.py;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * 70;
    e.y += (dy / d) * 70;
    if (this.stats.hp <= 0) this._die();
  }

  // ------------------------------------------------------------------ drops

  _addDrop(x, y, type, value) {
    const spr = this.add.image(x, y, type === "gem" ? "gem" : "coin").setDepth(5)
      .setTint(type === "gem" ? PAL.xp : PAL.coin);
    this.tweens.add({ targets: spr, scale: { from: 0.4, to: 1 }, duration: 200, ease: "Back.out" });
    this.drops.push({ spr, x, y, type, value, vx: 0, vy: 0 });
  }

  _updateDrops(dt) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      const dx = this.px - d.x, dy = this.py - d.y;
      const dist = Math.hypot(dx, dy) || 1;
      // Imán.
      if (dist < this.stats.magnet) {
        const pull = 420 * (1 - dist / this.stats.magnet) + 120;
        d.x += (dx / dist) * pull * dt;
        d.y += (dy / dist) * pull * dt;
        d.spr.setPosition(d.x, d.y);
      }
      // Recogida.
      if (dist < PLAYER_R + 12) {
        if (d.type === "gem") { this.xp += d.value; this.snd.gem(); this._checkLevel(); }
        else { this.runCoins += d.value; this.snd.coin(); }
        this.tweens.killTweensOf(d.spr);
        d.spr.destroy();
        this.drops.splice(i, 1);
      }
    }
  }

  // --------------------------------------------------------------- niveles

  _checkLevel() {
    if (this.xp < this.xpNeed) return;
    this.xp -= this.xpNeed;
    this.level += 1;
    this.xpNeed = 8 + (this.level - 1) * 6;
    this.snd.levelUp();
    this._openChoice();
  }

  _openChoice() {
    this.choosing = true;
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setDepth(40);
    const title = this.add.text(W / 2, 150, t("levelUp", { n: this.level }), {
      fontFamily: "'Consolas', monospace", fontSize: "52px", color: "#7cff5e", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(41);
    const sub = this.add.text(W / 2, 208, t("choosePerk"), {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "20px", color: "#ffe6b0",
    }).setOrigin(0.5).setDepth(41);
    const ui = [veil, title, sub];

    // 3 cartas aleatorias del pool no maxeado.
    const avail = UPGRADES.filter((u) => (this.upTaken[u.id] || 0) < u.max);
    Phaser.Utils.Array.Shuffle(avail);
    const picks = avail.slice(0, 3);
    if (picks.length === 0) picks.push(HEAL_CARD); // todo maxeado: cura SIN subir maxHp

    const close = () => { ui.forEach((o) => o.destroy()); this.choosing = false; };
    picks.forEach((u, i) => {
      const x = W / 2 + (i - (picks.length - 1) / 2) * 300;
      const y = 400;
      const panel = this.add.rectangle(x, y, 260, 240, 0x1f1608, 0.97)
        .setStrokeStyle(3, PAL.player, 0.9).setDepth(41).setInteractive({ useHandCursor: true });
      const key = this.add.text(x - 110, y - 100, `${i + 1}`, {
        fontFamily: "'Consolas', monospace", fontSize: "20px", color: "#8a6a30", fontStyle: "bold",
      }).setDepth(42);
      const name = this.add.text(x, y - 50, t("up_" + u.id), {
        fontFamily: "'Consolas', monospace", fontSize: "26px", color: "#ffc93e", fontStyle: "bold",
      }).setOrigin(0.5).setDepth(42);
      const desc = this.add.text(x, y + 10, t("up_" + u.id + "_d"), {
        fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "18px", color: "#ffffff",
        align: "center", wordWrap: { width: 220 },
      }).setOrigin(0.5).setDepth(42);
      const taken = this.upTaken[u.id] || 0;
      const lvl = this.add.text(x, y + 82, `${taken}/${u.max}`, {
        fontFamily: "'Consolas', monospace", fontSize: "15px", color: "#8a6a30",
      }).setOrigin(0.5).setDepth(42);
      ui.push(panel, key, name, desc, lvl);

      const pick = () => {
        u.apply(this.stats);
        this.upTaken[u.id] = (this.upTaken[u.id] || 0) + 1;
        if (u.id === "hp" || u.id === "heal") this._refreshHearts();
        this.snd.pick();
        this._burst(this.px, this.py, 10, PAL.xp);
        close();
      };
      panel.on("pointerdown", pick);
      panel.on("pointerover", () => panel.setScale(1.05));
      panel.on("pointerout", () => panel.setScale(1));
      this.input.keyboard.once("keydown-" + ["ONE", "TWO", "THREE"][i], () => {
        if (this.choosing) pick();
      });
    });
  }

  // ------------------------------------------------------------------- misc

  _floatText(x, y, msg, color) {
    const tx = this.add.text(x, y, msg, {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "22px",
      color: "#" + color.toString(16).padStart(6, "0"), fontStyle: "bold",
      stroke: "#000000", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(24);
    this.tweens.add({ targets: tx, y: y - 40, alpha: 0, duration: 800, onComplete: () => tx.destroy() });
  }

  _burst(x, y, n, tint) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, "spark").setDepth(23).setTint(tint);
      const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 42;
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.2,
        duration: 360 + Math.random() * 220, onComplete: () => p.destroy(),
      });
    }
  }

  _die() {
    if (this.dead) return;
    this.dead = true;
    this.snd.stopMusic();
    this.snd.death();

    Save.addCoins(this.runCoins); // la Fortuna ya se aplicó en los drops

    this._burst(this.px, this.py, 26, PAL.player);
    this._burst(this.px, this.py, 12, 0xffffff);
    this.orb.setVisible(false);
    this.orbAura.setVisible(false);
    this.cameras.main.shake(340, 0.015);
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0xff4e3a, 0).setDepth(29);
    this.tweens.add({ targets: veil, alpha: 0.25, duration: 80, yoyo: true, repeat: 2 });

    const secs = Math.floor(this.elapsed);
    this.time.delayedCall(1000, () =>
      this.scene.start("GameOver", {
        secs, kills: this.kills, level: this.level, coins: this.runCoins, caramb: this.caramb,
      })
    );
  }
}
