// GLITCH SHIFT — núcleo. Dos raíles (realidades); toca = shift, mantén = overclock
// (cámara lenta con energía). Obstáculos: bloques, muros, drones que cambian de
// carril y láseres telegrafiados. Bits = moneda persistente. 3 sectores de paleta
// y dificultad. Sin motor de físicas: movimiento y colisiones manuales (robusto
// a cualquier Hz de pantalla).

import { W, H, RAIL_Y, PLAYER_X, RAIL_COLORS, SECTORS } from "../const.js";
import { t } from "../i18n.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";
import { skinById, trailById } from "../items.js";

const PLAYER_R = 18;          // radio de colisión (generoso con el jugador)
const OC_DRAIN = 34;          // energía/s durante overclock
const OC_SCALE = 0.42;        // factor de cámara lenta

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.snd = new Sound();
    this.snd.startMusic();
    // once: el listener de shutdown no debe acumularse con cada retry.
    this.events.once("shutdown", () => this.snd.stopMusic());

    // Auto-pausa al perder el foco (clic fuera del iframe = muerte injusta).
    const onBlur = () => { if (!this.dead && !this.paused) this._togglePause(); };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once("shutdown", () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));

    // Estado.
    this.dead = false;
    this.paused = false;
    this.distPx = 0;
    this.speed = 380;
    this.worldT = 0;               // reloj del MUNDO (avanza al ritmo del timescale)
    this.rail = 1;                 // empieza abajo (magenta)
    this.ts = 1;                   // timescale actual (overclock lo baja)
    this.energy = 100;
    this.runBits = 0;
    this.shielded = false;
    this.invuln = 0;
    this.pressing = false;
    this.pressAt = 0;
    this._holdSources = new Set();   // dedos/teclas manteniendo (multitouch robusto)
    this._lastSwapRealAt = -9999;    // anti doble-swap por dos dedos en el mismo frame
    this.overclocking = false;
    this.lastSwapAt = -9999;
    this.lastSwapFrom = -1;
    this.sectorIx = 0;
    this.spawnGap = 500;           // px hasta el próximo patrón
    this._seenDrone = false;
    this._seenLaser = false;
    this.obstacles = [];
    this.pickups = [];
    this.lasers = [];
    this._trailT = 0;
    this._swaps = 0;

    this.skin = skinById(Save.skin());
    this.trailDef = trailById(Save.trail());

    this._buildBackground();
    this._buildRails();
    this._buildPlayer();
    this._buildHUD();
    this._buildInput();
    this._buildTutorial();

    if (typeof window !== "undefined") window.__gs = this; // hook de depuración
  }

  // ------------------------------------------------------------- construcción

  _buildBackground() {
    this.bgG = this.add.graphics().setDepth(0);
    this.gridFar = this.add.tileSprite(W / 2, H / 2, W, H, "grid").setAlpha(0.16).setDepth(1).setTileScale(0.6);
    this.gridNear = this.add.tileSprite(W / 2, H / 2, W, H, "grid").setAlpha(0.28).setDepth(1);
    this._applyPalette(SECTORS[0]);
  }

  _applyPalette(pal) {
    this.bgG.clear();
    this.bgG.fillGradientStyle(pal.top, pal.top, pal.bottom, pal.bottom, 1);
    this.bgG.fillRect(0, 0, W, H);
    this.gridFar.setTint(pal.grid);
    this.gridNear.setTint(pal.grid);
  }

  _buildRails() {
    this.railLines = RAIL_Y.map((y, i) => {
      const glow = this.add.rectangle(W / 2, y + 26, W, 10, RAIL_COLORS[i], 0.1).setDepth(2);
      const line = this.add.rectangle(W / 2, y + 26, W, 3, RAIL_COLORS[i], 0.9).setDepth(2);
      this.tweens.add({ targets: glow, alpha: 0.22, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      return line;
    });
    // Etiquetas sutiles de realidad.
    this.add.text(16, RAIL_Y[0] - 90, "▲", { fontSize: "16px", color: "#27e7ff" }).setAlpha(0.5).setDepth(2);
    this.add.text(16, RAIL_Y[1] - 90, "▼", { fontSize: "16px", color: "#ff3ea5" }).setAlpha(0.5).setDepth(2);
  }

  _buildPlayer() {
    this.orb = this.add.image(PLAYER_X, RAIL_Y[this.rail], this.skin.tex).setDepth(10);
    this.orbAura = this.add.image(PLAYER_X, RAIL_Y[this.rail], "glow").setDepth(9).setScale(1.6).setAlpha(0.5);
    this.shieldRing = this.add.image(PLAYER_X, RAIL_Y[this.rail], "shield-pu")
      .setDepth(11).setScale(1.5).setAlpha(0).setTint(0x7cffb2);
    this._tintPlayer();
  }

  _tintPlayer() {
    const c = this.skin.color === 0xffffff ? RAIL_COLORS[this.rail] : this.skin.color;
    this.orb.setTint(c);
    this.orbAura.setTint(RAIL_COLORS[this.rail]);
  }

  _buildHUD() {
    const f = (size, extra = {}) => ({
      fontFamily: "'Consolas', 'Courier New', monospace",
      fontSize: size, color: "#ffffff", fontStyle: "bold", ...extra,
    });
    this.hudScore = this.add.text(24, 18, "0 m", f("34px")).setDepth(20);
    this.hudBest = this.add.text(24, 58, `${t("best")} ${Save.best()} m`, f("16px", { color: "#9fb4ff" })).setDepth(20);

    this.add.image(W / 2 - 10, 34, "bit").setTint(0xffd94e).setDepth(20).setScale(1.1);
    this.hudBits = this.add.text(W / 2 + 6, 34, "0", f("22px", { color: "#ffd94e" })).setOrigin(0, 0.5).setDepth(20);

    // Barra de OVERCLOCK (abajo, centrada).
    this.add.text(W / 2, H - 44, t("overclock"), f("13px", { color: "#9fb4ff" })).setOrigin(0.5).setDepth(20);
    this.add.rectangle(W / 2, H - 24, 306, 14, 0x000000, 0.5).setDepth(20).setStrokeStyle(1, 0x9fb4ff, 0.6);
    this.energyFill = this.add.rectangle(W / 2 - 150, H - 24, 300, 8, 0x27e7ff, 1).setOrigin(0, 0.5).setDepth(21);

    // Botones pausa y mute (arriba derecha), tamaño táctil ≥44px — zona
    // excluida del input de juego en _hudHit.
    const mkBtn = (x, label, cb) => {
      const b = this.add.text(x, 14, label, f("26px", { backgroundColor: "#1a2a4acc" }))
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

  _hudHit(p) {
    // ¿El puntero cae sobre pausa/mute? (para no disparar un shift accidental)
    return p.y < 84 && p.x > W - 210;
  }

  _buildInput() {
    // Sin esto Phaser solo trackea 1 dedo: en un juego de tapping los taps
    // rápidos alternando pulgares se perdían ("presionas y no responde" →
    // no cambias de carril → "muere sin razón"). Con 3 punteros no se pierden.
    this.input.addPointer(2);

    this.input.on("pointerdown", (p) => {
      if (this._hudHit(p)) return;      // pausa/mute no cuentan como toque de juego
      this._pressFrom("p" + p.id);
    });
    // Cada dedo que se suelta libera SU fuente; el overclock sigue mientras
    // quede al menos un dedo de juego pulsado (release real solo al llegar a 0).
    const up = (p) => this._releaseFrom("p" + p.id);
    this.input.on("pointerup", up);
    this.input.on("pointerupoutside", up);

    ["SPACE", "UP", "W"].forEach((k) => {
      this.input.keyboard.on("keydown-" + k, (e) => { if (!e.repeat) this._pressFrom(k); });
      this.input.keyboard.on("keyup-" + k, () => this._releaseFrom(k));
    });
    this.input.keyboard.on("keydown-P", () => this._togglePause());
    this.input.keyboard.on("keydown-ESC", () => this._togglePause());
  }

  _buildTutorial() {
    this._tutorial = !Save.tutorialDone();
    if (!this._tutorial) return;
    const f = { fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "30px", color: "#ffffff", fontStyle: "bold", stroke: "#27e7ff", strokeThickness: 5 };
    this.tutText = this.add.text(W / 2, H / 2 - 30, t("hintShift"), f).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: this.tutText, scale: 1.12, duration: 420, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.tutText2 = this.add.text(W / 2, H / 2 + 18, t("hintHold"), {
      ...f, fontSize: "20px", stroke: "#ff3ea5", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(25).setAlpha(0.85);
  }

  // ------------------------------------------------------------------- input

  _pressFrom(id) {
    if (this.dead) return;
    if (this.paused) { this._togglePause(); return; }
    this._holdSources.add(id);
    this.pressing = true;
    this.pressAt = this.time.now;
    // Anti doble-swap: dos dedos que caen en el mismo frame (toque accidental
    // con dos dedos) no deben cancelarse mutuamente dejándote donde chocas.
    if (this.time.now - this._lastSwapRealAt < 60) return;
    this._lastSwapRealAt = this.time.now;
    this._swap();
  }

  _releaseFrom(id) {
    this._holdSources.delete(id);
    if (this._holdSources.size > 0) return; // aún hay un dedo pulsado
    this.pressing = false;
    if (this.overclocking) {
      this.overclocking = false;
      this.snd.overclockOff();
    }
  }

  _swap() {
    this.lastSwapFrom = this.rail;
    this.lastSwapAt = this.worldT; // reloj del mundo: el near-miss vale igual en overclock
    this.rail = 1 - this.rail;
    this._swaps++;
    this.snd.shift(this.rail);
    this._tintPlayer();

    // Efecto glitch: fantasmas cromáticos en la posición vieja + salto rápido.
    const oldY = RAIL_Y[this.lastSwapFrom], newY = RAIL_Y[this.rail];
    [[-6, 0x27e7ff], [6, 0xff3ea5]].forEach(([dx, c]) => {
      const gh = this.add.image(PLAYER_X + dx, oldY, this.skin.tex).setDepth(9).setTint(c).setAlpha(0.6);
      this.tweens.add({ targets: gh, alpha: 0, scale: 1.4, duration: 240, onComplete: () => gh.destroy() });
    });
    // Estela vertical entre los dos railes: el cambio de carril se LEE mucho mejor.
    const streak = this.add.rectangle(PLAYER_X, (oldY + newY) / 2, 14, Math.abs(newY - oldY), RAIL_COLORS[this.rail], 0.55)
      .setDepth(8);
    this.tweens.add({ targets: streak, alpha: 0, scaleX: 0.2, duration: 260, onComplete: () => streak.destroy() });
    // Salto un poco más marcado (120ms) + squash para dar peso al movimiento.
    this.tweens.add({ targets: [this.orb, this.orbAura, this.shieldRing], y: newY, duration: 120, ease: "Cubic.out" });
    this.tweens.add({ targets: this.orb, scaleX: 0.6, duration: 80, yoyo: true });

    if (this._tutorial && this._swaps >= 3) {
      this._tutorial = false;
      Save.setTutorialDone();
      [this.tutText, this.tutText2].forEach((tx) =>
        tx && this.tweens.add({ targets: tx, alpha: 0, duration: 500, onComplete: () => tx.destroy() }));
    }
  }

  _togglePause() {
    if (this.dead) return;
    this.paused = !this.paused;
    if (this.paused) {
      // Suelta cualquier dedo/tecla: tras pausa (o blur) el pointerup puede
      // perderse y dejaría el overclock pegado al reanudar.
      this._holdSources.clear();
      this.pressing = false;
      if (this.overclocking) { this.overclocking = false; this.snd.overclockOff(); }
      this.snd.stopMusic();
      this.pauseVeil = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.66).setDepth(30);
      this.pauseTxt = this.add.text(W / 2, H / 2 - 20, "⏸  " + t("paused"), {
        fontFamily: "'Consolas', monospace", fontSize: "48px", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5).setDepth(31);
      this.pauseTxt2 = this.add.text(W / 2, H / 2 + 40, t("resume"), {
        fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "20px", color: "#9fb4ff",
      }).setOrigin(0.5).setDepth(31);
    } else {
      this.snd.startMusic();
      [this.pauseVeil, this.pauseTxt, this.pauseTxt2].forEach((o) => o && o.destroy());
    }
  }

  // ----------------------------------------------------------------- spawner

  _spawnPattern() {
    const s = this.sectorIx;
    // [patrón, peso] — los sectores altos añaden tipos nuevos y suben el picante.
    const table = [
      ["block", 30], ["double", 16], ["wall", 14], ["bits", 20], ["shield", 3],
      ["drone", s >= 1 ? 16 : 0], ["laser", s >= 2 ? 14 : 0],
      ["triple", s >= 2 ? 10 : 0],
    ];
    const total = table.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total, kind = "block";
    for (const [k, w] of table) { r -= w; if (r <= 0) { kind = k; break; } }

    const rail = Phaser.Math.Between(0, 1);
    // Aviso anticipado del carril: un chevron parpadeante en el borde derecho
    // antes de que el obstáculo llegue (el láser ya trae su propio telégrafo).
    if (kind !== "bits" && kind !== "shield" && kind !== "laser") this._railWarn(rail);
    let extra = 0;
    switch (kind) {
      case "block":
        this._addBlock(W + 60, rail, 1);
        break;
      case "double": {
        // Dos bloques alternos: el desfase escala con la velocidad (siempre esquivable).
        const off = Math.max(210, this.speed * 0.36);
        this._addBlock(W + 60, rail, 1);
        this._addBlock(W + 60 + off, 1 - rail, 1);
        extra = off;
        break;
      }
      case "triple": {
        const off = Math.max(230, this.speed * 0.4);
        this._addBlock(W + 60, rail, 1);
        this._addBlock(W + 60 + off, 1 - rail, 1);
        this._addBlock(W + 60 + off * 2, rail, 1);
        extra = off * 2;
        break;
      }
      case "wall":
        this._addBlock(W + 60, rail, Phaser.Math.Between(4, 6)); // muro largo: quédate en el otro carril
        extra = 200;
        break;
      case "drone":
        this._addDrone(rail);
        break;
      case "laser":
        this._addLaser(rail);
        extra = this.speed * 1.4; // respiro: nada nuevo mientras el láser trabaja
        break;
      case "bits": {
        const n = Phaser.Math.Between(4, 7);
        for (let i = 0; i < n; i++) this._addPickup(W + 60 + i * 56, rail, "bit");
        extra = n * 56;
        break;
      }
      case "shield":
        this._addPickup(W + 60, rail, "shield");
        break;
    }
    this.spawnGap = 160 + this.speed * 0.62 + extra;
  }

  _addBlock(x, rail, wUnits) {
    // Los muros se componen de varios bloques en fila (escalar la textura
    // engorda los bordes y se ve mal).
    const sprs = [];
    for (let i = 0; i < wUnits; i++) {
      sprs.push(this.add.image(x + i * 40, RAIL_Y[rail], "block").setDepth(6).setTint(RAIL_COLORS[rail]));
    }
    const w = 40 * wUnits + 4;
    this.obstacles.push({
      sprs, x: x + (w - 44) / 2, type: "block", rail, w, passed: false, nearDone: false,
    });
  }

  _addDrone(rail) {
    const spr = this.add.image(W + 80, RAIL_Y[rail], "drone").setDepth(6).setTint(RAIL_COLORS[rail]);
    this.obstacles.push({
      sprs: [spr], x: W + 80, type: "drone", rail, w: 58, passed: false, nearDone: false,
      state: "cruise", blinkT: 0,
    });
    if (!this._seenDrone) { this._seenDrone = true; this._banner(t("hintDrone"), RAIL_COLORS[rail]); }
  }

  _addLaser(rail) {
    const y = RAIL_Y[rail];
    const nodeL = this.add.image(16, y, "laser-node").setDepth(6).setTint(0xff4e6a);
    const nodeR = this.add.image(W - 16, y, "laser-node").setDepth(6).setTint(0xff4e6a).setFlipX(true);
    const beam = this.add.rectangle(W / 2, y, W - 60, 6, 0xff4e6a, 0.35).setDepth(5);
    this.lasers.push({ rail, phase: "warn", tLeft: 1.05, beam, nodeL, nodeR, nearDone: false, wasOnRail: false });
    this.snd.near(); // aviso audible del telegrafiado
    if (!this._seenLaser) { this._seenLaser = true; this._banner(t("hintLaser"), 0xff4e6a); }
  }

  _addPickup(x, rail, type) {
    const spr = this.add.image(x, RAIL_Y[rail] - (type === "shield" ? 0 : 2),
      type === "bit" ? "bit" : "shield-pu").setDepth(6)
      .setTint(type === "bit" ? 0xffd94e : 0x7cffb2);
    this.tweens.add({ targets: spr, y: spr.y - 8, duration: 500, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.pickups.push({ spr, type, rail });
  }

  // ------------------------------------------------------------------ update

  update(timeNow, dms) {
    if (this.dead || this.paused) return;
    const dtRaw = Math.min(0.05, dms / 1000);

    // Overclock: mantener pulsado (tras el umbral) con energía.
    const wantOC = this.pressing && (this.time.now - this.pressAt) > 170 && this.energy > 0;
    if (wantOC && !this.overclocking) { this.overclocking = true; this.snd.overclockOn(); }
    if (!wantOC && this.overclocking) { this.overclocking = false; this.snd.overclockOff(); }
    if (this.overclocking) {
      this.energy = Math.max(0, this.energy - OC_DRAIN * dtRaw);
      if (this.energy <= 0) { this.overclocking = false; this.snd.overclockOff(); }
    } else {
      this.energy = Math.min(100, this.energy + 7 * dtRaw); // regeneración lenta
    }
    const target = this.overclocking ? OC_SCALE : 1;
    this.ts += (target - this.ts) * Math.min(1, 10 * dtRaw);
    const dt = dtRaw * this.ts;
    this.worldT += dt;

    // Velocidad y distancia.
    this.speed = Math.min(760, 380 + this.distPx * 0.011);
    this.distPx += this.speed * dt;
    const meters = Math.floor(this.distPx / 50);

    // Sectores.
    const next = SECTORS.findLast
      ? SECTORS.findLast((sc) => meters >= sc.at)
      : [...SECTORS].reverse().find((sc) => meters >= sc.at);
    const nextIx = SECTORS.indexOf(next);
    if (nextIx !== this.sectorIx) {
      this.sectorIx = nextIx;
      this._applyPalette(SECTORS[nextIx]);
      this._banner(t("sector", { n: nextIx + 1 }), SECTORS[nextIx].accent);
      this.snd.sector();
    }

    // Spawner por distancia.
    this.spawnGap -= this.speed * dt;
    if (this.spawnGap <= 0) this._spawnPattern();

    this._updateObstacles(dt);
    this._updateLasers(dt);
    this._updatePickups(dt);
    this._updatePlayerFx(dtRaw, timeNow);

    // Parallax.
    this.gridFar.tilePositionX += this.speed * 0.18 * dt;
    this.gridNear.tilePositionX += this.speed * 0.45 * dt;

    // Invulnerabilidad post-escudo.
    if (this.invuln > 0) {
      this.invuln -= dtRaw;
      this.orb.setAlpha(Math.sin(timeNow / 40) > 0 ? 1 : 0.35);
    } else this.orb.setAlpha(1);

    // HUD.
    this.hudScore.setText(`${meters} m`);
    this.hudBits.setText(`${this.runBits}`);
    this.energyFill.width = 3 * this.energy;
    this.energyFill.fillColor = this.energy > 40 ? 0x27e7ff : this.energy > 18 ? 0xffd94e : 0xff4e6a;
  }

  _updateObstacles(dt) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      const vx = o.type === "drone" ? this.speed * 1.08 : this.speed;
      o.x -= vx * dt;
      o.sprs.forEach((s) => (s.x -= vx * dt));

      // Dron: parpadea y cambia de carril cuando se acerca.
      if (o.type === "drone") {
        const spr = o.sprs[0];
        // El aviso salta a distancia proporcional a la velocidad: con 460 fijo,
        // a 760 px/s el cambio se consuma a 0.14s del jugador (irreaccionable).
        if (o.state === "cruise" && o.x < PLAYER_X + Math.max(500, this.speed * 0.92)) {
          o.state = "blink"; o.blinkT = 0.55;
        } else if (o.state === "blink") {
          o.blinkT -= dt;
          spr.setAlpha(Math.sin(this.time.now / 35) > 0 ? 1 : 0.3);
          if (o.blinkT <= 0) {
            o.state = "done";
            o.rail = 1 - o.rail;
            spr.setAlpha(1).setTint(RAIL_COLORS[o.rail]);
            this.tweens.add({ targets: spr, y: RAIL_Y[o.rail], duration: 130, ease: "Quad.in" });
          }
        }
      }

      // Colisión (mismo carril + solape en x).
      if (o.rail === this.rail && Math.abs(o.x - PLAYER_X) < o.w / 2 + PLAYER_R) {
        if (this.invuln <= 0) this._hit(o, i);
        continue;
      }

      // Near-miss: cruzó tu x justo después de un shift desde SU carril.
      if (!o.nearDone && o.x < PLAYER_X) {
        o.nearDone = true;
        if (o.rail === this.lastSwapFrom && this.worldT - this.lastSwapAt < 0.35) this._nearMiss(o.rail);
      }

      if (o.x < -80 - o.w) { o.sprs.forEach((s) => s.destroy()); this.obstacles.splice(i, 1); }
    }
  }

  _updateLasers(dt) {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const L = this.lasers[i];
      L.tLeft -= dt;
      if (L.phase === "warn") {
        if (L.rail === this.rail) L.wasOnRail = true; // hubo riesgo real durante el aviso
        L.beam.setAlpha(Math.sin(this.time.now / 50) > 0 ? 0.4 : 0.1);
        if (L.tLeft <= 0) {
          L.phase = "fire"; L.tLeft = 0.55;
          L.beam.setAlpha(1).setFillStyle(0xff4e6a, 1);
          L.beam.height = 18;
          this.snd._noise(0.12, 0.1); // chispazo de disparo
        }
      } else if (L.phase === "fire") {
        L.beam.setAlpha(Phaser.Math.FloatBetween(0.75, 1));
        if (L.rail === this.rail && this.invuln <= 0) { this._hit({ type: "laser", rail: L.rail, spr: L.beam }, -1); return; }
        if (L.tLeft <= 0) {
          L.phase = "off";
          // Premio solo si esquivaste de verdad (estuviste en su carril en el aviso);
          // si no, cada láser regalaría energía+bits sin riesgo.
          if (!L.nearDone && L.wasOnRail) { L.nearDone = true; this._nearMiss(L.rail); }
          [L.beam, L.nodeL, L.nodeR].forEach((s) =>
            this.tweens.add({ targets: s, alpha: 0, duration: 250, onComplete: () => s.destroy() }));
          this.lasers.splice(i, 1);
        }
      }
    }
  }

  _updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.spr.x -= this.speed * dt;
      if (p.rail === this.rail && Math.abs(p.spr.x - PLAYER_X) < 30) {
        if (p.type === "bit") {
          this.runBits++;
          this.energy = Math.min(100, this.energy + 6);
          this.snd.pick();
          this._burst(p.spr.x, p.spr.y, 5, 0xffd94e);
        } else {
          this.shielded = true;
          this.shieldRing.setAlpha(0.9);
          this.snd.shield();
          this._floatText(t("shieldOn"), 0x7cffb2);
        }
        this.tweens.killTweensOf(p.spr); // el tween de flotación es repeat:-1
        p.spr.destroy(); this.pickups.splice(i, 1);
        continue;
      }
      if (p.spr.x < -40) {
        this.tweens.killTweensOf(p.spr);
        p.spr.destroy(); this.pickups.splice(i, 1);
      }
    }
  }

  _updatePlayerFx(dtRaw, timeNow) {
    this.orbAura.setScale(1.5 + Math.sin(timeNow / 220) * 0.15);
    if (this.shielded) this.shieldRing.setScale(1.4 + Math.sin(timeNow / 150) * 0.12).setAngle(timeNow / 8);

    // Estela: copias que se desvanecen.
    this._trailT -= dtRaw;
    if (this._trailT <= 0) {
      this._trailT = 0.04;
      let color = this.trailDef.color;
      if (color === null) color = RAIL_COLORS[this.rail];
      else if (color === "rainbow") color = Phaser.Display.Color.HSVToRGB((timeNow / 900) % 1, 1, 1).color;
      const g = this.add.image(this.orb.x - 8, this.orb.y, this.skin.tex)
        .setDepth(8).setTint(color).setAlpha(0.4).setScale(0.85);
      this.tweens.add({
        targets: g, x: g.x - this.speed * 0.12, alpha: 0, scale: 0.3,
        duration: 260, onComplete: () => g.destroy(),
      });
    }
  }

  // ------------------------------------------------------------------ eventos

  _nearMiss(rail) {
    this.energy = Math.min(100, this.energy + 26);
    this.runBits += 3; // el riesgo paga: identidad del juego
    this.snd.near();
    this._floatText(t("closeCall"), RAIL_COLORS[rail]);
    this._burst(PLAYER_X, RAIL_Y[this.rail], 6, RAIL_COLORS[rail]);
  }

  _floatText(msg, color) {
    const tx = this.add.text(PLAYER_X + 30, RAIL_Y[this.rail] - 56, msg, {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "24px",
      color: "#" + color.toString(16).padStart(6, "0"), fontStyle: "bold",
      stroke: "#000000", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(24);
    this.tweens.add({ targets: tx, y: tx.y - 40, alpha: 0, duration: 700, onComplete: () => tx.destroy() });
  }

  _railWarn(rail) {
    const y = RAIL_Y[rail], c = RAIL_COLORS[rail];
    // Chevron con punta hacia el jugador, en el rail donde viene el obstáculo.
    const warn = this.add.triangle(W - 30, y, 26, -18, 26, 18, 0, 0, c).setDepth(15).setAlpha(0);
    this.tweens.add({ targets: warn, alpha: 0.95, duration: 150, yoyo: true, repeat: 3, onComplete: () => warn.destroy() });
    this.tweens.add({ targets: warn, x: W - 54, duration: 900, ease: "Quad.out" });
  }

  _banner(msg, color) {
    const tx = this.add.text(W / 2, H / 2 - 120, msg, {
      fontFamily: "'Consolas', monospace", fontSize: "54px",
      color: "#" + color.toString(16).padStart(6, "0"), fontStyle: "bold",
      stroke: "#000000", strokeThickness: 6,
    }).setOrigin(0.5).setDepth(24).setAlpha(0).setScale(0.7);
    this.tweens.add({ targets: tx, alpha: 1, scale: 1, duration: 260, ease: "Back.out" });
    this.tweens.add({ targets: tx, alpha: 0, delay: 1300, duration: 500, onComplete: () => tx.destroy() });
  }

  _burst(x, y, n, tint) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, "spark").setDepth(23).setTint(tint);
      const a = Math.random() * Math.PI * 2, d = 24 + Math.random() * 46;
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.2,
        duration: 380 + Math.random() * 240, onComplete: () => p.destroy(),
      });
    }
  }

  _hit(o, ix) {
    if (this.shielded) {
      // El escudo absorbe el golpe (y desintegra el obstáculo si es físico).
      this.shielded = false;
      this.shieldRing.setAlpha(0);
      this.invuln = 1.1;
      this.snd.shield();
      this.cameras.main.shake(140, 0.006);
      if (o.type !== "laser" && ix >= 0) {
        this._burst(o.x, RAIL_Y[o.rail], 12, 0x7cffb2);
        o.sprs.forEach((s) => s.destroy()); this.obstacles.splice(ix, 1);
      }
      return;
    }
    this._die();
  }

  _die() {
    if (this.dead) return;
    this.dead = true;
    this.snd.stopMusic();
    this.snd.death();
    this.pressing = false;
    this._holdSources.clear();

    Save.addBits(this.runBits);
    const meters = Math.floor(this.distPx / 50);

    // Impacto en el sitio, pero el orbe NO desaparece de golpe: se derriba y
    // CAE fuera de pantalla (Cristian: "visibly drops down and gets killed").
    this._burst(this.orb.x, this.orb.y, 16, 0xffffff);
    this.orbAura.setVisible(false); this.shieldRing.setVisible(false);
    this.cameras.main.shake(220, 0.013);
    this.tweens.killTweensOf(this.orb);
    this.orb.setDepth(12);
    this.tweens.add({
      targets: this.orb, y: H + 90, angle: 300, alpha: 0.12, scale: 0.55,
      duration: 800, ease: "Quad.in",
      onComplete: () => {
        this._burst(this.orb.x, this.orb.y, 18, RAIL_COLORS[this.rail]);
        this.orb.setVisible(false);
      },
    });
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0).setDepth(29);
    this.tweens.add({ targets: veil, alpha: 0.3, duration: 60, yoyo: true, repeat: 1 });

    this.time.delayedCall(1150, () =>
      this.scene.start("GameOver", { meters, bits: this.runBits, sector: this.sectorIx + 1 })
    );
  }
}
