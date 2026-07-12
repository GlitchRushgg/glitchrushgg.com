// DREAM DUO v2 core — la pantalla SE PARTE A PROPÓSITO en dos mundos:
// columna izquierda = el parque de Elizabeth · columna derecha = el sueño de
// Flofy. Un input binario por mano (fórmula Two Cars, validada en el estudio
// de mercado jul-2026): tap izquierda = Elizabeth cambia de carril · tap
// derecha = Flofy cambia de carril. Estrellas OBLIGATORIAS (fallarlas cuesta
// corazón), obstáculos prohibidos. SYNC (par simultáneo) sube el multiplicador
// y llena el Dream Meter → FAIRY RUSH: el divisor se disuelve y los dos mundos
// se funden. Endless con ramp por escalones + misiones diarias.
// Sin motor de físicas — movimiento manual con dt acotado.

import {
  W, H, DIV_X, LANES, CHAR_Y, HIT_WIN, SPAWN_Y, LERP_MS,
  SPEED0, RAMP_STEP, RAMP_EVERY, MAX_RAMP, PX_PER_M,
  SYNC_WINDOW, MAX_MULT, METER_MAX, RUSH_SECS, SHIELD_SECS, REVIVE_STARS,
  TINTS, TINT_EVERY,
} from "../const.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { SDK } from "../utils/SDK.js";
import { TRAILS } from "../items.js";
import { startRun, report } from "../missions.js";

const FONT = "'Segoe UI', system-ui, sans-serif";
const PARK_OBS = ["hedge", "bench", "birdbath", "pigeon"];
const DREAM_OBS = ["cloud", "blocks", "top", "bubble"];
const OB_SIZE = { hedge: 64, bench: 62, birdbath: 74, pigeon: 52, cloud: 60, blocks: 76, top: 54, bubble: 58 };

export class GameScene extends Phaser.Scene {
  constructor() { super("Game"); }

  create() {
    window.__dd = this;
    this.snd = new Sound();
    this.snd.resume();

    const sv = Save.get();
    this.skin = sv.skin;
    this.trailTint = (TRAILS.find((t) => t.id === sv.trail) || TRAILS[0]).tint;

    // ---------- state ----------
    this.time_ = 0;
    this.dist = 0;
    this.speed = SPEED0;
    this.hearts = 3;
    this.score = 0;
    this.mult = 1;
    this.multMax = 1;
    this.meter = 0;
    this.starsRun = 0;
    this.syncsRun = 0;
    this.rushT = 0;
    this.shieldT = 0;
    this.sweepT = 0;           // Cristian: sin obstáculos unos segundos
    this.invuln = 0;
    this.slowmo = 0;
    this.dead = false;
    this.paused = false;
    this.usedRevive = false;
    this.tt = 0;
    this._pairSeq = 0;
    this._tintIdx = 0;
    this._missionClock = 0;

    this.objs = [];            // stars / obs / pickups / ghost
    this.pairs = new Map();
    this._trailT = 0;

    // spawner clocks (por columna) + globales
    this._colT = [1.2, 2.0];   // primer evento de cada mundo
    this._lastLane = [0, 0];
    this._laneRepeat = [0, 0];
    this._syncT = 8;
    this._pwT = 35;
    this._pwIdx = 0;
    this._feint = [null, null];

    this._buildWorld();
    this._buildCharacters();
    this._buildHUD();
    this._bindInput();
    this._ghostSetup(sv);

    startRun();

    // tutorial en gameplay, sin texto: manos pulsantes (saltable jugando)
    this._hands = [];
    if (!sv.tutorialSeen) { this._hand(0); this._hand(1); }

    this.snd.startMusic();
    SDK.gameplayStart();

    this.events.on("shutdown", () => { this.snd.stopMusic(); this.snd.setRush(false); });
    this._onBlur = () => { if (!this.dead && !this.paused) this._togglePause(true); };
    this.game.events.on(Phaser.Core.Events.BLUR, this._onBlur);
    this.events.once("shutdown", () => this.game.events.off(Phaser.Core.Events.BLUR, this._onBlur));
  }

  /* ================= WORLD ================= */
  _buildWorld() {
    const colW = DIV_X;
    const ts = colW / 512; // el arte de columna es 512 de ancho
    this.bgPark = this.add.tileSprite(0, 0, colW, H, "bg-col-park").setOrigin(0).setDepth(0).setTileScale(ts);
    this.bgDream = this.add.tileSprite(colW, 0, colW, H, "bg-col-dream").setOrigin(0).setDepth(0).setTileScale(ts);
    // capa-sueño sobre el parque, solo visible durante el FAIRY RUSH
    this.bgParkDream = this.add.tileSprite(0, 0, colW, H, "bg-col-dream").setOrigin(0).setDepth(1).setTileScale(ts).setAlpha(0);

    // vignette lateral suave para que el ojo se centre
    const vg = this.add.graphics().setDepth(2);
    vg.fillGradientStyle(0x14102b, 0x14102b, 0x14102b, 0x14102b, 0.35, 0, 0.35, 0);
    vg.fillRect(0, 0, 14, H);
    vg.fillGradientStyle(0x14102b, 0x14102b, 0x14102b, 0x14102b, 0, 0.35, 0, 0.35);
    vg.fillRect(W - 14, 0, 14, H);

    // divisor entre mundos — cinta de luz (se disuelve en el RUSH)
    this.divider = this.add.tileSprite(DIV_X, H / 2, 24, H, "ribbonV").setDepth(5).setAlpha(0.95);
    this.divGlow = this.add.image(DIV_X, H / 2, "glow").setDepth(4).setScale(1.9, 9.2).setAlpha(0.32).setTint(0xb9a6ff);

    this.rainbow = this.add.graphics().setDepth(3).setVisible(false);
    [0xff9ed2, 0xffd94e, 0x8ef5c9, 0x7fd4ff, 0xb9a6ff].forEach((c, i) => {
      this.rainbow.fillStyle(c, 0.09);
      this.rainbow.fillRect(0, 120 + i * 130, W, 130);
    });

    this.veilFlash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff).setDepth(50).setAlpha(0);
  }

  /* ================= CHARACTERS ================= */
  _buildCharacters() {
    const mk = (keys, laneAbs, scaleKey) => {
      const sc = this.registry.get(`scale:${keys[0]}`) || 0.14;
      const shadow = this.add.image(LANES[laneAbs], CHAR_Y + 6, "charShadow").setDepth(9);
      const spr = this.add.sprite(LANES[laneAbs], CHAR_Y, keys[0]).setOrigin(0.5, 1).setDepth(10).setScale(sc);
      return { spr, shadow, keys, lane: 0, x: LANES[laneAbs], animT: 0, frame: 0, scale: sc, switchT: 0 };
    };
    this.E = mk(["eliz-back-a", "eliz-back-b"], 0);
    this.F = mk(["flofy-back-a", "flofy-back-b"], 2);
    if (this.skin === "golden") this.E.spr.setTint(0xffd57a);

    this.shieldE = this.add.image(LANES[0], CHAR_Y - 55, "shield").setDepth(11).setVisible(false).setScale(0.95);
    this.shieldF = this.add.image(LANES[2], CHAR_Y - 45, "shield").setDepth(11).setVisible(false).setScale(0.8);

    // hilo mágico: una mente, dos mundos (se lee por encima del divisor)
    this.tether = this.add.graphics().setDepth(8);

    // chevrons de carril: pista sutil de que el tap alterna
    this.chevs = [0, 1].map((side) => {
      const cx = side === 0 ? DIV_X / 2 : DIV_X + DIV_X / 2;
      return this.add.text(cx, CHAR_Y + 58, "◂ tap ▸", {
        fontFamily: FONT, fontSize: "13px", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5).setAlpha(0.4).setDepth(9);
    });
    this.time.delayedCall(6000, () => this.chevs.forEach((c) => this.tweens.add({ targets: c, alpha: 0, duration: 800 })));
  }

  _charX(who) { return LANES[(who === this.E ? 0 : 2) + who.lane]; }

  _switch(who) {
    if (this.dead || this.paused) return;
    who.lane = 1 - who.lane;
    who.switchT = LERP_MS / 1000;
    who.fromX = who.x;
    // squash & stretch del cambio (respetando la escala del skin hada en el rush)
    const base = this.rushT > 0 && who === this.E
      ? (this.registry.get("scale:eliz-fairy") || who.scale) : who.scale;
    who.spr.setScale(base * 1.12, base * 0.9);
    this.time.delayedCall(110, () => {
      if (this.dead) return;
      const b = this.rushT > 0 && who === this.E
        ? (this.registry.get("scale:eliz-fairy") || who.scale) : who.scale;
      who.spr.setScale(b);
    });
    if (who === this.E) this.snd.jumpE(); else this.snd.hopF();
    this._spark(who.x, CHAR_Y - 30, who === this.E ? 0xff9ed2 : 0xfff2b0);
    // tutorial: la mano de ese lado desaparece al primer input
    const side = who === this.E ? 0 : 1;
    if (this._hands[side]) { this._hands[side].forEach((o) => o.destroy()); this._hands[side] = null; }
    if (!this._hands[0] && !this._hands[1] && !Save.get().tutorialSeen) { Save.get().tutorialSeen = true; Save.persist(); }
  }

  /* ================= HUD ================= */
  _buildHUD() {
    const f = (size, extra = {}) => ({ fontFamily: FONT, fontSize: size, color: "#fff", fontStyle: "bold", ...extra });

    this.hudBack = this.add.rectangle(W / 2, 44, W, 88, 0x14102b, 0.35).setDepth(59);

    this.heartIcons = [];
    for (let i = 0; i < 3; i++) this.heartIcons.push(this.add.image(26 + i * 34, 28, "heart").setDepth(60).setScale(0.62));

    this.scoreTxt = this.add.text(W / 2, 12, "0", f("34px", { stroke: "#3a2260", strokeThickness: 6 })).setOrigin(0.5, 0).setDepth(60);
    this.multTxt = this.add.text(W / 2 + 64, 20, "×1", f("20px", { color: "#ffd94e" })).setOrigin(0, 0).setDepth(60);

    this.meterSegs = [];
    for (let i = 0; i < METER_MAX; i++) {
      this.meterSegs.push(
        this.add.rectangle(W / 2 - 51 + i * 34, 62, 28, 9, 0xffffff, 0.18).setStrokeStyle(2, 0xb9a6ff, 0.7).setDepth(60)
      );
    }

    this.add.image(20, 62, "star").setDepth(60).setScale(0.42);
    this.starTxt = this.add.text(36, 62, "0", f("16px", { color: "#ffd94e" })).setOrigin(0, 0.5).setDepth(60);

    this.pauseBtn = this.add.text(W - 14, 10, "⏸", f("22px", { backgroundColor: "#3a2260cc" }))
      .setOrigin(1, 0).setPadding(10, 6, 10, 6).setDepth(60).setInteractive({ useHandCursor: true });
    this.pauseBtn.on("pointerdown", () => this._togglePause());
    this.muteBtn = this.add.text(W - 64, 10, this.snd.muted ? "🔇" : "🔊", f("18px", { backgroundColor: "#3a2260cc" }))
      .setOrigin(1, 0).setPadding(9, 8, 9, 8).setDepth(60).setInteractive({ useHandCursor: true });
    this.muteBtn.on("pointerdown", () => {
      this.snd.setMuted(!this.snd.muted);
      if (!this.snd.muted) this.snd.startMusic();
      this.muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
    });

    this.toastTxt = this.add.text(W / 2, 118, "", f("19px", { stroke: "#3a2260", strokeThickness: 5, align: "center" }))
      .setOrigin(0.5).setDepth(60).setAlpha(0);
  }

  _toast(msg, color = 0xffffff) {
    this.toastTxt.setText(msg).setColor("#" + color.toString(16).padStart(6, "0")).setAlpha(1).setScale(0.7);
    this.tweens.add({ targets: this.toastTxt, scale: 1, duration: 180, ease: "Back.out" });
    this.tweens.add({ targets: this.toastTxt, alpha: 0, delay: 1500, duration: 400 });
  }

  _hand(side) {
    const cx = side === 0 ? DIV_X / 2 : DIV_X + DIV_X / 2;
    const hand = this.add.text(cx, CHAR_Y - 170, "👆", { fontSize: "40px" }).setOrigin(0.5).setDepth(70);
    const ring = this.add.image(cx, CHAR_Y - 160, "glow").setDepth(69).setScale(1.3).setTint(side === 0 ? 0xff9ed2 : 0xb9a6ff);
    this.tweens.add({ targets: hand, y: CHAR_Y - 152, duration: 420, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: ring, alpha: { from: 0.8, to: 0.3 }, duration: 420, yoyo: true, repeat: -1 });
    this._hands[side] = [hand, ring];
  }

  /* ================= INPUT ================= */
  _bindInput() {
    this.input.on("pointerdown", (p) => {
      if (this.dead || this.paused) return;
      if (p.y < 88) return; // HUD
      this.snd.resume();
      this._switch(p.x < DIV_X ? this.E : this.F);
    });
    const kb = this.input.keyboard;
    kb.on("keydown-A", (e) => { if (!e.repeat) this._switch(this.E); });
    kb.on("keydown-LEFT", (e) => { if (!e.repeat) this._switch(this.E); });
    kb.on("keydown-L", (e) => { if (!e.repeat) this._switch(this.F); });
    kb.on("keydown-RIGHT", (e) => { if (!e.repeat) this._switch(this.F); });
    kb.on("keydown-P", () => this._togglePause());
    kb.on("keydown-ESC", () => this._togglePause());
  }

  /* ================= PAUSE ================= */
  _togglePause(force) {
    if (this.dead) return;
    this.paused = force === true ? true : !this.paused;
    if (this.paused) {
      this.snd.stopMusic();
      this._pauseVeil = this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.72).setDepth(80).setInteractive();
      const f = (s, e = {}) => ({ fontFamily: FONT, fontSize: s, color: "#fff", fontStyle: "bold", ...e });
      this._pauseTxt = this.add.text(W / 2, H / 2 - 80, "PAUSED", f("42px")).setOrigin(0.5).setDepth(81);
      this._resumeBtn = this.add.text(W / 2, H / 2, "▶ RESUME", f("26px", { backgroundColor: "#ff9ed2", color: "#3a2260" }))
        .setOrigin(0.5).setPadding(28, 12, 28, 12).setDepth(81).setInteractive({ useHandCursor: true });
      this._resumeBtn.on("pointerdown", () => this._togglePause());
      this._menuBtn = this.add.text(W / 2, H / 2 + 76, "MENU", f("18px", { backgroundColor: "#3a2260" }))
        .setOrigin(0.5).setPadding(20, 9, 20, 9).setDepth(81).setInteractive({ useHandCursor: true });
      this._menuBtn.on("pointerdown", () => { this.dead = true; SDK.gameplayStop(); this.scene.start("Menu"); });
    } else {
      if (!this.snd.muted) this.snd.startMusic();
      [this._pauseVeil, this._pauseTxt, this._resumeBtn, this._menuBtn].forEach((o) => o && o.destroy());
    }
  }

  /* ================= SPAWNING =================
     Fases: 0 (0-6s solo estrellas · tutorial) → 1 (obstáculos sueltos)
     → 2 (20s eventos simultáneos asimétricos) → 3 (40s movers y fintas).
     Fairness: por columna, nunca dos acciones exigidas en <0.55s. */
  _phase() { return this.time_ < 6 ? 0 : this.time_ < 20 ? 1 : this.time_ < 40 ? 2 : 3; }

  _spawner(dt) {
    const ph = this._phase();

    for (let col = 0; col < 2; col++) {
      this._colT[col] -= dt;
      // finta programada (obstáculo tras estrella en el mismo carril)
      const feint = this._feint[col];
      if (feint) {
        feint.t -= dt;
        if (feint.t <= 0) { this._addOb(col, feint.lane, this._obType(col)); this._feint[col] = null; }
      }
      if (this._colT[col] > 0) continue;

      // elegir carril con variedad (no repetir el mismo 3+ veces)
      let lane = Math.random() < 0.5 ? 0 : 1;
      if (lane === this._lastLane[col] && this._laneRepeat[col] >= 2) lane = 1 - lane;
      this._laneRepeat[col] = lane === this._lastLane[col] ? this._laneRepeat[col] + 1 : 1;
      this._lastLane[col] = lane;

      if (ph === 0) {
        this._addStar(col, lane);
      } else if (this.rushT > 0) {
        this._addStar(col, lane); // en el rush solo llueven estrellas
      } else {
        const roll = Math.random();
        if (roll < 0.62 || this.sweepT > 0) {
          this._addStar(col, lane);
          // finta: solo fase 3, con margen justo para recoger y cambiar
          if (ph === 3 && Math.random() < 0.15) this._feint[col] = { lane, t: 0.65 };
        } else {
          this._addOb(col, lane, this._obType(col));
        }
      }

      // cadencia: constante por escalón de velocidad; min 0.55s por mano
      const base = ph === 0 ? 1.5 : Math.max(0.62, 1.18 - this.time_ * 0.004);
      this._colT[col] = Math.max(0.55, base + Math.random() * 0.35);
      // fase 2+: a veces evento simultáneo en la otra columna (asimétrico)
      if (ph >= 2 && this.rushT <= 0 && Math.random() < 0.22) {
        const other = 1 - col;
        if (this._colT[other] > 0.55) {
          const oLane = Math.random() < 0.5 ? 0 : 1;
          if (Math.random() < 0.5) this._addStar(other, oLane);
          else this._addOb(other, oLane, this._obType(other));
          this._colT[other] = Math.max(this._colT[other], 0.7);
        }
      }
    }

    // SYNC pairs — frecuentes: el FAIRY RUSH debe verse en la primera sesión
    if (this.time_ > 8 && this.rushT <= 0) {
      this._syncT -= dt;
      if (this._syncT <= 0) {
        this._addPair();
        this._syncT = (this._phase() >= 3 ? 5.5 : 7) + Math.random() * 1.5;
        this._colT[0] = Math.max(this._colT[0], 0.75);
        this._colT[1] = Math.max(this._colT[1], 0.75);
      }
    }

    // power-ups de la familia
    if (this.time_ > 20 && this.rushT <= 0) {
      this._pwT -= dt;
      if (this._pwT <= 0) {
        const kinds = ["mama", "papa", "cristian"];
        this._addPickup(kinds[this._pwIdx++ % 3]);
        this._pwT = 19 + Math.random() * 7;
      }
    }
  }

  _obType(col) {
    const pool = col === 0 ? PARK_OBS : DREAM_OBS;
    const ph = this._phase();
    const n = ph >= 3 ? pool.length : 3; // movers (pigeon/bubble al final del pool) desde fase 3
    return pool[(Math.random() * n) | 0];
  }

  _laneX(col, lane) { return LANES[col * 2 + lane]; }

  _addStar(col, lane, pairId = 0, yOff = 0) {
    const x = this._laneX(col, lane);
    const spr = this.add.image(x, SPAWN_Y + yOff, "star").setDepth(7).setScale(0.82);
    this.tweens.add({ targets: spr, angle: 360, duration: 2600, repeat: -1 });
    let glow = null;
    if (pairId) {
      spr.setScale(0.95);
      glow = this.add.image(x, SPAWN_Y + yOff, "glow").setDepth(6).setScale(1).setTint(0xffd94e);
      this.tweens.add({ targets: glow, alpha: { from: 0.9, to: 0.4 }, duration: 460, yoyo: true, repeat: -1 });
    }
    this.objs.push({ kind: "star", spr, glow, col, lane, y: SPAWN_Y + yOff, pairId, taken: false });
  }

  _addPair() {
    const id = ++this._pairSeq;
    // Espejados hasta la fase 3 ("¡los dos a la izquierda!" = una sola idea);
    // cruzados después — ahí vive la dificultad "pat your head, rub your belly".
    const l0 = Math.random() < 0.5 ? 0 : 1;
    const l1 = this._phase() >= 3 && Math.random() < 0.5 ? 1 - l0 : l0;
    this._addStar(0, l0, id);
    this._addStar(1, l1, id);
    this.pairs.set(id, { got: 0, timer: 0 });
  }

  _addOb(col, lane, type) {
    const x = this._laneX(col, lane);
    const key = `ob-${type}`;
    const spr = this.add.image(x, SPAWN_Y, key).setDepth(8);
    spr.setScale(OB_SIZE[type] / spr.height);
    const o = { kind: "ob", spr, col, lane, y: SPAWN_Y, type, taken: false };
    if (type === "top") this.tweens.add({ targets: spr, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: -1 });
    if (type === "pigeon" || type === "bubble") {
      o.mover = { from: lane, t: 0, dur: 1.6 + Math.random() * 0.6 }; // cruza al otro carril
    }
    this.objs.push(o);
  }

  _addPickup(kind) {
    const col = Math.random() < 0.5 ? 0 : 1;
    const lane = Math.random() < 0.5 ? 0 : 1;
    const x = this._laneX(col, lane);
    const glow = this.add.image(x, SPAWN_Y, "glow").setDepth(6).setScale(1.3).setTint(0xfff2b0);
    const spr = this.add.image(x, SPAWN_Y, `pw-${kind}`).setDepth(7);
    spr.setScale((this.registry.get(`scale:pw-${kind}`) || 0.1) * 0.8);
    this.objs.push({ kind: "pw", spr, glow, col, lane, y: SPAWN_Y, type: kind, taken: false });
  }

  _ghostSetup(sv) {
    // marca fantasma donde moriste la última vez (la lección de Duet)
    this._ghost = sv.lastDeath && sv.lastDeath.dist > 400 ? { ...sv.lastDeath, spawned: false } : null;
  }

  /* ================= UPDATE ================= */
  update(_, dms) {
    if (this.dead || this.paused) return;
    let dt = Math.min(dms / 1000, 0.05);
    this.tt += dt;
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.35; }

    this.time_ += dt;
    // velocidad por escalones (+5% cada 8s, constante dentro del escalón)
    const steps = Math.floor(this.time_ / RAMP_EVERY);
    this.speed = SPEED0 * Math.min(MAX_RAMP, 1 + RAMP_STEP * steps) * (this.rushT > 0 ? 1.15 : 1);
    this.dist += this.speed * dt;

    // scroll de mundos (el tile es 512 de ancho escalado)
    const ts = DIV_X / 512;
    this.bgPark.tilePositionY -= (this.speed * dt) / ts;
    this.bgDream.tilePositionY -= (this.speed * dt * 1.12) / ts; // el sueño flota un pelín más rápido
    this.bgParkDream.tilePositionY = this.bgDream.tilePositionY;
    this.divider.tilePositionY -= (this.speed * dt) * 0.8;

    // ambiente día → atardecer → noche
    const tintIdx = Math.min(TINTS.length - 1, Math.floor(this.time_ / TINT_EVERY));
    if (tintIdx !== this._tintIdx) {
      this._tintIdx = tintIdx;
      const t = TINTS[tintIdx];
      [this.bgPark, this.bgDream].forEach((bg) => bg.setTint(t.t));
      if (t.name) this._toast(t.name, 0xb9a6ff);
    }

    this._spawner(dt);
    this._moveObjs(dt);
    this._chars(dt);
    this._updateRush(dt);
    if (this.shieldT > 0) this._updateShield(dt);
    if (this.sweepT > 0) this.sweepT -= dt;
    if (this.invuln > 0) {
      this.invuln -= dt;
      const blink = Math.sin(this.tt * 24) > 0 ? 1 : 0.35;
      this.E.spr.setAlpha(blink); this.F.spr.setAlpha(blink);
      if (this.invuln <= 0) { this.E.spr.setAlpha(1); this.F.spr.setAlpha(1); }
    }

    // pairs: ventana de SYNC
    for (const [id, p] of this.pairs) {
      if (p.got === 1) {
        p.timer += dt;
        if (p.timer > SYNC_WINDOW) { this.pairs.delete(id); } // se perdió el sync (las estrellas siguen contando solas)
      }
    }

    // ghost de la muerte anterior
    if (this._ghost && !this._ghost.spawned && this.dist >= this._ghost.dist - (CHAR_Y - SPAWN_Y)) {
      this._ghost.spawned = true;
      const x = LANES[this._ghost.lane];
      const g = this.add.text(x, SPAWN_Y, "💤", { fontSize: "26px" }).setOrigin(0.5).setDepth(6).setAlpha(0.4);
      this.objs.push({ kind: "ghost", spr: g, col: this._ghost.lane < 2 ? 0 : 1, lane: this._ghost.lane % 2, y: SPAWN_Y, taken: true });
    }

    // misiones: tiempo 1/s
    this._missionClock += dt;
    if (this._missionClock >= 1) {
      this._missionClock -= 1;
      this._missionToast(report("time", 1));
    }

    this._tether();
    this._trail(dt);
    this.scoreTxt.setText(String(Math.floor(this.score)));
  }

  _chars(dt) {
    for (const who of [this.E, this.F]) {
      const target = this._charX(who);
      if (who.switchT > 0) {
        who.switchT -= dt;
        const k = 1 - Math.max(0, who.switchT) / (LERP_MS / 1000);
        who.x = Phaser.Math.Linear(who.fromX, target, Phaser.Math.Easing.Cubic.Out(Math.min(1, k)));
      } else who.x = target;
      // trote/bote en el sitio
      who.animT += dt * (this.speed / 44);
      const fr = Math.floor(who.animT) % 2;
      if (fr !== who.frame) { who.frame = fr; if (this.rushT <= 0 || who === this.F) who.spr.setTexture(who.keys[fr]); }
      const bob = Math.abs(Math.sin(who.animT * Math.PI)) * (who === this.E ? 5 : 9);
      who.spr.x = who.x; who.spr.y = CHAR_Y - bob - (this.rushT > 0 && who === this.E ? 26 : 0);
      who.shadow.x = who.x; who.shadow.setScale(1 - bob * 0.02);
    }
    this.shieldE.setPosition(this.E.x, CHAR_Y - 55);
    this.shieldF.setPosition(this.F.x, CHAR_Y - 45);
  }

  _moveObjs(dt) {
    const kill = [];
    for (const o of this.objs) {
      o.y += this.speed * dt * (o.kind === "pw" ? 0.92 : 1);
      // movers: cruzan de carril dentro de su columna (telegraph con la propia trayectoria)
      if (o.mover) {
        o.mover.t += dt;
        const k = Math.min(1, o.mover.t / o.mover.dur);
        const a = this._laneX(o.col, o.mover.from), b = this._laneX(o.col, 1 - o.mover.from);
        o.spr.x = Phaser.Math.Linear(a, b, Phaser.Math.Easing.Sine.InOut(k));
        o.lane = k > 0.5 ? 1 - o.mover.from : o.mover.from;
      }
      o.spr.y = o.y;
      if (o.glow) { o.glow.y = o.y; o.glow.x = o.spr.x; }

      if (!o.taken) {
        const contact = Math.abs(o.y - CHAR_Y + 34) <= HIT_WIN;
        const who = o.col === 0 ? this.E : this.F;
        if (contact && who.lane === o.lane) {
          if (o.kind === "star") this._collectStar(o);
          else if (o.kind === "ob") this._hitOb(o);
          else if (o.kind === "pw") this._collectPickup(o);
        } else if (o.kind === "star" && o.y > CHAR_Y + HIT_WIN && !o.missed) {
          o.missed = true;
          this._missStar(o);
        }
        // imán del FAIRY RUSH
        if (this.rushT > 0 && o.kind === "star" && o.y > CHAR_Y - 300) {
          o.spr.x = Phaser.Math.Linear(o.spr.x, who.x, dt * 8);
          if (Math.abs(o.y - CHAR_Y + 34) < 90 && Math.abs(o.spr.x - who.x) < 50) this._collectStar(o);
        }
      }
      if (o.y > H + 80) kill.push(o);
    }
    for (const o of kill) {
      o.spr.destroy(); if (o.glow) o.glow.destroy();
      this.objs.splice(this.objs.indexOf(o), 1);
    }
  }

  /* ================= CONTACTOS ================= */
  _collectStar(o) {
    if (o.taken) return;
    o.taken = true;
    const bonus = this.skin === "golden" ? 11 : 10;
    this.score += bonus * this.mult;
    this.starsRun++;
    Save.addStars(1);
    this.starTxt.setText(String(this.starsRun));
    this.snd.star(this.mult);
    for (let i = 0; i < 6; i++) this._spark(o.spr.x, o.y, 0xffd94e);
    this.tweens.add({ targets: [o.spr, o.glow].filter(Boolean), scale: 0, alpha: 0, duration: 160, onComplete: () => { o.spr.destroy(); if (o.glow) o.glow.destroy(); } });
    this._missionToast(report("stars", 1));

    if (o.pairId) {
      const p = this.pairs.get(o.pairId);
      if (p) {
        p.got++;
        if (p.got === 1) p.timer = 0;
        else if (p.timer <= SYNC_WINDOW) this._sync(o);
        if (p.got >= 2) this.pairs.delete(o.pairId);
      }
    }
  }

  _sync(o) {
    this.syncsRun++;
    this.mult = Math.min(MAX_MULT, this.mult + 1);
    this.multMax = Math.max(this.multMax, this.mult);
    this.multTxt.setText(`×${this.mult}`).setScale(1.5);
    this.tweens.add({ targets: this.multTxt, scale: 1, duration: 220, ease: "Back.out" });
    this.snd.sync(this.mult);
    // rayo que CRUZA el divisor: los dos mundos se tocan
    const bolt = this.add.graphics().setDepth(30);
    bolt.lineStyle(4, 0xffd94e, 0.95);
    bolt.beginPath();
    bolt.moveTo(this.E.x, CHAR_Y - 60);
    bolt.lineTo(DIV_X, CHAR_Y - 100 + Math.random() * 60 - 30);
    bolt.lineTo(this.F.x, CHAR_Y - 55);
    bolt.strokePath();
    this.tweens.add({ targets: bolt, alpha: 0, duration: 340, onComplete: () => bolt.destroy() });
    this._toast(`SYNC! ×${this.mult}`, 0xffd94e);

    const fill = this.skin === "fairy" ? 1.2 : 1;
    this.meter = Math.min(METER_MAX, this.meter + fill);
    this.meterSegs.forEach((s, i) => s.setFillStyle(i < this.meter ? 0xff9ed2 : 0xffffff, i < this.meter ? 0.95 : 0.18));
    this._missionToast(report("syncs", 1));
    this._missionToast(report("mult", this.mult));
    if (this.meter >= METER_MAX && this.rushT <= 0) this._startRush();
  }

  _missStar(o) {
    if (this.rushT > 0 || this.shieldT > 0) return;             // el rush/escudo perdona
    if (o.pairId) this.pairs.delete(o.pairId);
    this.mult = 1;
    this.multTxt.setText("×1");
    this.snd.deny();
    // GRACIA de onboarding: los primeros 10s un fallo no cuesta corazón,
    // solo enseña la regla (trip-not-death para la primera partida).
    if (this.time_ < 10) {
      if (!this._graceShown) { this._graceShown = true; this._toast("⭐ Catch EVERY star!", 0xffd94e); }
      const miss = this.add.text(o.spr.x, CHAR_Y - 90, "MISS", { fontFamily: FONT, fontSize: "17px", color: "#ff9d8a", fontStyle: "bold", stroke: "#3a2260", strokeThickness: 4 }).setOrigin(0.5).setDepth(35);
      this.tweens.add({ targets: miss, y: miss.y - 34, alpha: 0, duration: 700, onComplete: () => miss.destroy() });
      o.spr.setTint(0x8b93a3);
      this.tweens.add({ targets: o.spr, alpha: 0, y: o.y + 40, angle: 90, duration: 380 });
      return;
    }
    // la estrella se rompe con pena (feedback cálido, castigo real)
    o.spr.setTint(0x8b93a3);
    this.tweens.add({ targets: o.spr, alpha: 0, y: o.y + 40, angle: 90, duration: 380 });
    const miss = this.add.text(o.spr.x, CHAR_Y - 90, "MISS", { fontFamily: FONT, fontSize: "17px", color: "#ff9d8a", fontStyle: "bold", stroke: "#3a2260", strokeThickness: 4 }).setOrigin(0.5).setDepth(35);
    this.tweens.add({ targets: miss, y: miss.y - 34, alpha: 0, duration: 700, onComplete: () => miss.destroy() });
    this._loseHeart(o, "miss");
  }

  _hitOb(o) {
    if (o.taken || this.invuln > 0 || this.rushT > 0) return;
    o.taken = true;
    if (this.shieldT > 0) {
      this.shieldT = 0.01; // el escudo absorbe el golpe
      this.snd.shield();
      this._spark(o.spr.x, o.y, 0x7fd4ff);
      this.tweens.add({ targets: o.spr, alpha: 0.25, duration: 150 });
      return;
    }
    this.mult = 1;
    this.multTxt.setText("×1");
    this.snd.hit();
    this.cameras.main.shake(160, 0.012);
    // resalta QUÉ te golpeó (la lección de la pintura de Duet)
    const ring = this.add.image(o.spr.x, o.y, "glow").setDepth(31).setScale(1.4).setTint(0xff5e5e);
    this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
    o.spr.setTint(0xff8080);
    this.slowmo = 0.3;
    this._loseHeart(o, "hit");
  }

  _loseHeart(o, why) {
    // log ligero de balance (leído por los bots de playtest)
    (window.__ddLoss = window.__ddLoss || []).push({ t: +this.time_.toFixed(1), why, type: o?.type || "star", col: o?.col });
    this.hearts--;
    this.heartIcons.forEach((h, i) => h.setAlpha(i < this.hearts ? 1 : 0.22));
    this.invuln = 1.2;
    if (this.hearts <= 0) this._death(o, why);
  }

  _collectPickup(o) {
    if (o.taken) return;
    o.taken = true;
    this.tweens.add({ targets: [o.spr, o.glow], scale: 0, alpha: 0, duration: 200, onComplete: () => { o.spr.destroy(); o.glow.destroy(); } });
    if (o.type === "mama") {
      if (this.hearts < 3) { this.hearts++; this.heartIcons.forEach((h, i) => h.setAlpha(i < this.hearts ? 1 : 0.22)); }
      this.snd.heart();
      this._toast("💛 Mamá: +1 heart!", 0xffd94e);
    } else if (o.type === "papa") {
      this.shieldT = SHIELD_SECS;
      this.shieldE.setVisible(true); this.shieldF.setVisible(true);
      this.snd.shield();
      this._toast("🛡 Papá: shield!", 0x7fd4ff);
    } else {
      this.sweepT = 5;
      // Cristian barre los obstáculos en pantalla
      for (const x of this.objs) if (x.kind === "ob" && !x.taken) {
        x.taken = true;
        this.tweens.add({ targets: x.spr, x: x.spr.x + (x.col === 0 ? -240 : 240), angle: 60, alpha: 0, duration: 420 });
      }
      this.snd.dash();
      this._toast("🛹 Cristian clears the way!", 0x8ef5c9);
    }
  }

  _updateShield(dt) {
    this.shieldT -= dt;
    const blink = this.shieldT < 2 ? (Math.sin(this.tt * 16) > 0 ? 0.9 : 0.3) : 0.9;
    this.shieldE.setAlpha(blink); this.shieldF.setAlpha(blink);
    if (this.shieldT <= 0) { this.shieldE.setVisible(false); this.shieldF.setVisible(false); }
  }

  /* ================= FAIRY RUSH ================= */
  _startRush() {
    this.rushT = RUSH_SECS;
    this.meter = 0;
    this.snd.fanfare();
    this.snd.setRush(true);
    SDK.happyTime();
    this._toast("✨ FAIRY RUSH!\nTHE WORLDS BECOME ONE ✨", 0xffd94e);
    this.veilFlash.setAlpha(0.9);
    this.tweens.add({ targets: this.veilFlash, alpha: 0, duration: 600 });
    // el divisor se disuelve: un solo mundo de sueño
    this.tweens.add({ targets: [this.divider, this.divGlow], alpha: 0.12, duration: 500 });
    this.tweens.add({ targets: this.bgParkDream, alpha: 1, duration: 700 });
    this.rainbow.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.rainbow, alpha: 1, duration: 700 });
    // Elizabeth despliega las alas (canon fairy)
    const fs = this.registry.get("scale:eliz-fairy") || this.E.scale;
    this.E.spr.setTexture("eliz-fairy").setScale(fs);
    this._missionToast(report("rush", 1));
    this._rushBaseMeterSegs();
  }

  _rushBaseMeterSegs() {
    this.meterSegs.forEach((s) => s.setFillStyle(0xffffff, 0.18));
  }

  _updateRush(dt) {
    if (this.rushT <= 0) return;
    this.rushT -= dt;
    if (Math.random() < 0.3) this._spark(Phaser.Math.Between(0, W), Phaser.Math.Between(100, H - 100), 0xffd94e);
    if (this.rushT <= 0) {
      this.snd.setRush(false);
      this.tweens.add({ targets: [this.divider, this.divGlow], alpha: 1, duration: 500 });
      this.tweens.add({ targets: this.bgParkDream, alpha: 0, duration: 600 });
      this.tweens.add({ targets: this.rainbow, alpha: 0, duration: 500, onComplete: () => this.rainbow.setVisible(false) });
      this.E.spr.setTexture(this.E.keys[0]).setScale(this.E.scale);
      this.invuln = Math.max(this.invuln, 0.8); // aterrizaje amable
    }
  }

  /* ================= MUERTE / REVIVE ================= */
  _death(o, why) {
    this.dead = true;
    this.snd.stopMusic();
    SDK.gameplayStop();
    const sv = Save.get();
    sv.lastDeath = { dist: this.dist, lane: (o ? o.col * 2 + o.lane : 0) };
    Save.persist();

    // rewarded revive 1×run (o 100★) — requisito CG, siempre con alternativa
    if (!this.usedRevive && (SDK.available || sv.stars >= REVIVE_STARS)) this._reviveOffer(sv);
    else this._gameOver();
  }

  _reviveOffer(sv) {
    const f = (s, e = {}) => ({ fontFamily: FONT, fontSize: s, color: "#fff", fontStyle: "bold", ...e });
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.7).setDepth(90).setInteractive();
    const box = this.add.rectangle(W / 2, H / 2, 320, 300, 0x241a4a, 0.97).setStrokeStyle(3, 0xb9a6ff).setDepth(91);
    const title = this.add.text(W / 2, H / 2 - 108, "KEEP DREAMING?", f("26px", { color: "#ff9ed2" })).setOrigin(0.5).setDepth(92);
    const els = [veil, box, title];

    let t = 4.0;
    const count = this.add.text(W / 2, H / 2 - 66, "4", f("20px", { color: "#cbb7ff" })).setOrigin(0.5).setDepth(92);
    els.push(count);

    const done = (revived) => {
      this._reviveTimer.remove();
      els.forEach((e) => e.destroy());
      if (revived) this._doRevive();
      else this._gameOver();
    };

    if (SDK.available) {
      const ad = this.add.text(W / 2, H / 2 - 10, "▶  REVIVE — watch ad", f("20px", { backgroundColor: "#8ef5c9", color: "#14351f" }))
        .setOrigin(0.5).setPadding(22, 12, 22, 12).setDepth(92).setInteractive({ useHandCursor: true });
      ad.on("pointerdown", () => SDK.rewardedAd(() => done(true), () => this.snd.deny()));
      els.push(ad);
    }
    if (sv.stars >= REVIVE_STARS) {
      const st = this.add.text(W / 2, H / 2 + 58, `★ REVIVE — ${REVIVE_STARS} stars`, f("18px", { backgroundColor: "#ffd94e", color: "#3a2260" }))
        .setOrigin(0.5).setPadding(20, 10, 20, 10).setDepth(92).setInteractive({ useHandCursor: true });
      st.on("pointerdown", () => { if (Save.spendStars(REVIVE_STARS)) done(true); });
      els.push(st);
    }
    const skip = this.add.text(W / 2, H / 2 + 118, "no, sweet dreams…", f("15px", { color: "#8b93a3" }))
      .setOrigin(0.5).setPadding(10, 6, 10, 6).setDepth(92).setInteractive({ useHandCursor: true });
    skip.on("pointerdown", () => done(false));
    els.push(skip);

    this._reviveTimer = this.time.addEvent({
      delay: 100, loop: true, callback: () => {
        t -= 0.1;
        count.setText(t > 0 ? t.toFixed(1) : "0");
        if (t <= 0) done(false);
      },
    });
  }

  _doRevive() {
    this.usedRevive = true;
    this.dead = false;
    this.hearts = 3;
    this.heartIcons.forEach((h) => h.setAlpha(1));
    this.invuln = 2;
    this.snd.revive();
    this.snd.startMusic();
    SDK.gameplayStart();
    // limpia peligros cercanos
    for (const o of this.objs) if (o.kind === "ob" && !o.taken && o.y > 100) {
      o.taken = true;
      this.tweens.add({ targets: o.spr, alpha: 0, scale: 0, duration: 260 });
    }
    this.veilFlash.setAlpha(0.7);
    this.tweens.add({ targets: this.veilFlash, alpha: 0, duration: 500 });
  }

  _gameOver() {
    this.snd.gameOver();
    this.scene.start("GameOver", {
      score: Math.floor(this.score),
      meters: Math.floor(this.dist / PX_PER_M),
      stars: this.starsRun,
      time: Math.floor(this.time_),
      syncs: this.syncsRun,
      multMax: this.multMax,
    });
  }

  /* ================= FX ================= */
  _missionToast(completed) {
    if (!completed || !completed.length) return;
    for (const m of completed) {
      this._toast(`🏅 MISSION DONE!\n${m.label}  +★${m.reward}`, 0x8ef5c9);
      this.snd.fanfare();
    }
  }

  _tether() {
    this.tether.clear();
    if (this.rushT > 0) return;
    const ex = this.E.x, ey = CHAR_Y - 70;
    const fx = this.F.x, fy = CHAR_Y - 58;
    const cx = (ex + fx) / 2, cy = Math.min(ey, fy) - 30 + Math.sin(this.tt * 3) * 4;
    this.tether.lineStyle(2, 0xfff2b0, 0.3);
    this.tether.beginPath();
    this.tether.moveTo(ex, ey);
    for (let i = 1; i <= 10; i++) {
      const t = i / 10, u = 1 - t;
      this.tether.lineTo(u * u * ex + 2 * u * t * cx + t * t * fx, u * u * ey + 2 * u * t * cy + t * t * fy);
    }
    this.tether.strokePath();
  }

  _trail(dt) {
    this._trailT -= dt;
    if (this._trailT > 0) return;
    this._trailT = 0.05;
    for (const who of [this.E, this.F]) {
      let tint = this.trailTint;
      if (tint === -1) tint = Phaser.Display.Color.HSLToColor((this.tt * 0.4) % 1, 0.8, 0.65).color;
      const p = this.add.image(who.x + Phaser.Math.Between(-8, 8), CHAR_Y - 20 + Phaser.Math.Between(-6, 6), "sparkle")
        .setDepth(7).setTint(tint).setScale(Phaser.Math.FloatBetween(0.5, 1));
      this.tweens.add({ targets: p, y: p.y + 40, alpha: 0, duration: 420, onComplete: () => p.destroy() });
    }
  }

  _spark(x, y, tint) {
    const p = this.add.image(x, y, "sparkle").setDepth(30).setTint(tint).setScale(Phaser.Math.FloatBetween(0.7, 1.3));
    this.tweens.add({
      targets: p, x: x + Phaser.Math.Between(-30, 30), y: y + Phaser.Math.Between(-40, 10),
      alpha: 0, duration: 400, onComplete: () => p.destroy(),
    });
  }
}
