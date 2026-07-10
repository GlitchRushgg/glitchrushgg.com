// Hop & Run — core. One-button rooftop runner starring Cristian (15), with the
// Adventure Island recipe adapted: ENERGY drains over time and FRUIT refills it,
// varied obstacles (crates to hop, pigeons at jump height, gaps), a SKATEBOARD
// speed power-up that smashes through, and the GUITAR SOLO super power
// (invincible rock-out + magnet + lightning blasts). Rescue animals for score.

import { W, H, PLAYER_X, SECTORS } from "../const.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

const GRAVITY = 2100;
const JUMP = -840;
const PLAT_H = 300;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.snd = new Sound();
    this.snd.startMusic();
    this.events.once("shutdown", () => { this.snd.stopMusic(); this._stopSoloAudio(); });

    const onBlur = () => { if (!this.dead && !this.paused) this._togglePause(); };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once("shutdown", () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));

    // State.
    this.dead = false;
    this.paused = false;
    this.dist = 0;
    this.speed = 300;
    this.speedPenalty = 0;
    this.energy = 60;   // arranca a medias: la primera línea de fruta ya importa
    this.animals = 0;
    this.combo = 0;
    this.comboT = 0;
    this.invuln = 0;
    this.skateT = 0;
    this.soloT = 0;
    this.holding = false;
    this._coyote = 0;
    this._jumpBuffer = 0;
    this._wasAir = false;
    this._lowBeepT = 0;
    this._hurtT = 0;
    this._barFlashT = 0;
    this.sectorIx = 0;
    this._nextSkateAt = 220;   // monopatín más pronto y más seguido (feedback fundadora)
    this._nextGuitarAt = 60;   // guitarra AÚN más cerca del inicio (~9s)
    this._nextSuperAt = 300;   // SUPER GUITARRA alcanzable (antes 900m — con récord de ~700m nunca salía)
    this.lives = 0;            // corazones guardados para CONTINUAR tras caer (feedback fundadora)
    this._nextLifeAt = 250;    // primer corazón a los 250m
    this.superSolo = false;
    this.sound.mute = this.snd.muted;   // sincroniza el mute de Phaser (audio real) con el del juego

    this.physics.world.gravity.y = GRAVITY;

    this._buildBackground();

    this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    this.hazards = this.physics.add.group({ allowGravity: false, immovable: true });

    this._buildPlayer();

    // Long starting rooftop.
    this._spawnPlatform(-40, 520, 640);
    this.lastRight = 600;
    this.lastTop = 520;
    for (let i = 0; i < 6; i++) this._spawnNext();

    this.physics.add.collider(this.player, this.platforms, null, (pl, plat) => {
      return pl.body.velocity.y >= 0 && (pl.body.bottom - 18) <= plat.body.top;
    });
    this.physics.add.overlap(this.player, this.pickups, this._collect, null, this);
    this.physics.add.overlap(this.player, this.hazards, this._hitHazard, null, this);

    this._buildHUD();
    this._buildInput();
    this._buildTutorial();

    if (typeof window !== "undefined") window.__hr = this; // debug hook
  }

  // ------------------------------------------------------------ construction

  _buildBackground() {
    const pal = SECTORS[0];
    // Two side-by-side skyline images scrolling left (the art includes the sky).
    this.bgA = this.add.image(0, 0, pal.sky).setOrigin(0, 0).setDepth(0).setTint(pal.tint);
    this.bgB = this.add.image(0, 0, pal.sky).setOrigin(0, 0).setDepth(0).setTint(pal.tint);
    const sc = Math.max(W / this.bgA.width, H / this.bgA.height);
    [this.bgA, this.bgB].forEach((b) => b.setScale(sc));
    this.bgB.setFlipX(true); // espejo: los bordes casan y no hay costura
    this.bgW = this.bgA.displayWidth;
    this.bgB.x = this.bgW;
    // Clouds drift on top of the skyline art for extra depth.
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      const c = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(40, 260), "cloud")
        .setDepth(1).setAlpha(0.75).setScale(Phaser.Math.FloatBetween(0.8, 1.7));
      this.clouds.push(c);
    }
  }

  _swapBackground(pal) {
    // Crossfade to the new sector's skyline.
    const oldA = this.bgA, oldB = this.bgB;
    this.bgA = this.add.image(0, 0, pal.sky).setOrigin(0, 0).setDepth(0).setAlpha(0).setTint(pal.tint);
    this.bgB = this.add.image(0, 0, pal.sky).setOrigin(0, 0).setDepth(0).setAlpha(0).setTint(pal.tint);
    const sc = Math.max(W / this.bgA.width, H / this.bgA.height);
    [this.bgA, this.bgB].forEach((b) => b.setScale(sc));
    this.bgB.setFlipX(true);
    this.bgW = this.bgA.displayWidth;
    // BUG (banda de cielo vacía): las x del arte viejo no valen para el nuevo si
    // cambia el ancho — se re-derivan envolviendo la x vieja al ancho nuevo para
    // que las dos copias SIEMPRE cubran la pantalla completa sin hueco.
    let x0 = ((oldA.x % this.bgW) + this.bgW) % this.bgW;
    if (x0 > 0) x0 -= this.bgW;
    this.bgA.x = x0;
    this.bgB.x = x0 + this.bgW;
    this.tweens.add({ targets: [this.bgA, this.bgB], alpha: 1, duration: 1200 });
    this.tweens.add({ targets: [oldA, oldB], alpha: 0, duration: 1200,
      onComplete: () => { oldA.destroy(); oldB.destroy(); } });
  }

  _buildPlayer() {
    if (!this.anims.exists("run")) {
      // Ciclo NATURAL de 4 fases (feedback fundadora: "lo más natural posible").
      // Antes: 1→2→3→4 repetía la misma zancada (el frame 3 duplica al 1) →
      // parecía que arrastraba los pies. Ahora: zancada dcha → paso (rodilla
      // media) → zancada izq → paso (rodilla alta) = alternancia real de piernas.
      this.anims.create({
        key: "run",
        frames: [1, 2, 4, 5].map((i) => ({ key: `p-cristian-run-${i}` })),
        frameRate: 13,
        repeat: -1,
      });
    }
    this._baseScale = 1.15;
    this.player = this.physics.add.sprite(PLAYER_X, 300, "p-cristian-run-1");
    this.player.setOrigin(0.5, 1);
    this.player.setScale(this._baseScale);
    this.player.body.setSize(70, 150);
    this.player.body.setOffset((this.player.width - 70) / 2, this.player.height - 155);
    this.player.setDepth(10);
    this.player.play("run");
    // Contact shadow.
    this.shadow = this.add.ellipse(PLAYER_X, 520, 90, 18, 0x1a2a3a, 0.28).setDepth(5);
    this._groundY = 520;
    // Golden aura shown during the guitar solo.
    this.aura = this.add.image(PLAYER_X, 400, "glow").setDepth(9).setScale(3.4)
      .setTint(0xffe066).setAlpha(0);
  }

  // Squash & stretch: da peso al salto/aterrizaje (yoyo vuelve a la escala base).
  _squash(sy, sx, dur) {
    this.tweens.killTweensOf(this.player);
    this.player.setScale(this._baseScale);
    this.tweens.add({
      targets: this.player, scaleY: this._baseScale * sy, scaleX: this._baseScale * sx,
      duration: dur, yoyo: true, ease: "Quad.out",
    });
  }

  _buildHUD() {
    const f = (size, extra = {}) => ({
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: size, color: "#ffffff", fontStyle: "bold",
      stroke: "#23324a", strokeThickness: 5, ...extra,
    });
    this.hudDist = this.add.text(24, 16, "0 m", f("34px")).setDepth(20);

    // Vidas guardadas (corazones para CONTINUAR tras caer).
    this.hudLives = [];
    for (let i = 0; i < 2; i++) {
      this.hudLives.push(this.add.image(196 + i * 40, 34, "heart").setDepth(20).setScale(0.7).setAlpha(0.18));
    }

    // Energy bar (the Adventure Island heart of the game).
    this.add.image(34, 78, "fruit-apple").setDisplaySize(34, 34).setDepth(20);
    this.add.rectangle(60, 78, 224, 20, 0x000000, 0.45).setOrigin(0, 0.5).setDepth(20)
      .setStrokeStyle(2, 0xffffff, 0.8);
    this.energyFill = this.add.rectangle(62, 78, 220, 14, 0x7cd94e, 1).setOrigin(0, 0.5).setDepth(21);

    this.hudAnimals = this.add.text(W / 2, 18, "", f("26px", { color: "#ffe066" })).setOrigin(0.5, 0).setDepth(20);
    this.hudCombo = this.add.text(W / 2, 54, "", f("20px", { color: "#ff8fb0" })).setOrigin(0.5, 0).setDepth(20);
    this.hudPower = this.add.text(W / 2, H - 46, "", f("26px", { color: "#ffe066" })).setOrigin(0.5).setDepth(20);

    const mkBtn = (x, label, cb) => {
      const b = this.add.text(x, 14, label, {
        fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "26px", color: "#ffffff",
        backgroundColor: "#23324acc",
      }).setOrigin(1, 0).setPadding(16, 12, 16, 12).setDepth(22).setInteractive({ useHandCursor: true });
      b.on("pointerdown", cb);
      return b;
    };
    this.muteBtn = mkBtn(W - 106, this.snd.muted ? "🔇" : "🔊", () => {
      this.snd.setMuted(!this.snd.muted);
      this.sound.mute = this.snd.muted;   // silencia también el audio real del solo
      this.muteBtn.setText(this.snd.muted ? "🔇" : "🔊");
    });
    this.pauseBtn = mkBtn(W - 24, "⏸", () => this._togglePause());
  }

  _hudHit(p) {
    return p.y < 104 && p.x > W - 250;
  }

  _buildInput() {
    // Multitouch robusto (mismo patrón que GLITCH SHIFT): sin addPointer, Phaser
    // trackea 1 dedo y pierde toques rápidos en móvil.
    this.input.addPointer(2);
    this._holdSrc = new Set();

    this.input.on("pointerdown", (p) => {
      if (this._hudHit(p)) return;
      this._pressFrom("p" + p.id);
    });
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
    if (Save.tutorialDone()) return;
    const f = {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "28px",
      color: "#ffffff", fontStyle: "bold", stroke: "#e8622c", strokeThickness: 6,
    };
    const t1 = this.add.text(W / 2, H / 2 - 60, "TAP TO JUMP · HOLD = HIGHER", f).setOrigin(0.5).setDepth(25);
    const t2 = this.add.text(W / 2, H / 2 - 14, "Fruit = energy. Don't run dry! 🍎", { ...f, fontSize: "22px", stroke: "#3a7d2c" })
      .setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t1, scale: 1.08, duration: 460, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.time.delayedCall(6000, () => {
      [t1, t2].forEach((x) => this.tweens.add({ targets: x, alpha: 0, duration: 600, onComplete: () => x.destroy() }));
      Save.setTutorialDone();
    });
  }

  // ------------------------------------------------------------------- input

  _pressFrom(id) {
    if (this.dead || this.cutscene) return;
    if (this.paused) { this._togglePause(); return; }
    this._holdSrc.add(id);
    this.holding = true;
    this._jumpBuffer = 0.12;
  }

  _releaseFrom(id) {
    this._holdSrc.delete(id);
    if (this._holdSrc.size === 0) this.holding = false; // el hold sigue si queda otro dedo
  }

  _togglePause() {
    // Durante el cut-in de la guitarra la física ya está pausada y se reanuda
    // sola al terminar; permitir pausar aquí dejaba la física corriendo bajo el
    // overlay → Cristian caía y moría injustamente (bug QA B1, confirmado).
    if (this.dead || this.cutscene) return;
    this.paused = !this.paused;
    if (this.paused) {
      this._holdSrc.clear(); this.holding = false; // el pointerup puede perderse tras pausa/blur
      this.physics.pause();
      this.anims.pauseAll();
      this.snd.stopMusic();
      if (this._soloAudio) this._soloAudio.pause();
      this.pauseUI = [
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.62).setDepth(30),
        this.add.text(W / 2, H / 2 - 40, "⏸  PAUSED", {
          fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "48px", color: "#ffffff", fontStyle: "bold",
        }).setOrigin(0.5).setDepth(31),
        this.add.text(W / 2, H / 2 + 20, "TAP TO RESUME", {
          fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "20px", color: "#cfe4ff",
        }).setOrigin(0.5).setDepth(31),
      ];
      const menuBtn = this.add.text(W / 2, H / 2 + 100, "MENU", {
        fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "22px", color: "#ffffff",
        fontStyle: "bold", backgroundColor: "#23324a",
      }).setOrigin(0.5).setPadding(26, 12, 26, 12).setDepth(31).setInteractive({ useHandCursor: true });
      menuBtn.on("pointerdown", () => {
        this.dead = true;             // blocks the tap-resume and update
        this.snd.stopMusic();
        this.scene.start("Menu");
      });
      this.pauseUI.push(menuBtn);
    } else {
      this.physics.resume();
      this.anims.resumeAll();
      if (this.soloT > 0 && this._soloAudio) this._soloAudio.resume(); // reanuda el solo
      else this.snd.startMusic();
      this.pauseUI.forEach((o) => o.destroy());
    }
  }

  // ----------------------------------------------------------------- spawner

  _roofTexture() {
    return SECTORS[this.sectorIx].roof;
  }

  _mixTint(a, b) {   // multiplica canales (como tint sobre tint)
    const r = (((a >> 16) & 255) * ((b >> 16) & 255) / 255) | 0;
    const g = (((a >> 8) & 255) * ((b >> 8) & 255) / 255) | 0;
    const c = ((a & 255) * (b & 255) / 255) | 0;
    return (r << 16) | (g << 8) | c;
  }

  _spawnPlatform(left, top, width) {
    // Altura dinámica: el tejado llega SIEMPRE hasta pasar el fondo de pantalla
    // (feedback de Cristian: "los edificios parecen flotar"). Con PLAT_H fijo,
    // un tejado alto (top=400) terminaba en y=700 dejando aire hasta H=720.
    const h = H + 80 - top;
    const t = this.add.tileSprite(left + width / 2, top + h / 2, width, h, this._roofTexture());
    const src = this.textures.get(this._roofTexture()).getSourceImage();
    const s = PLAT_H / src.height;   // tileScale de referencia constante (consistencia visual)
    t.setTileScale(s, s);
    // Variedad: cada edificio recibe un matiz propio (cálido/frío/rosado…) además
    // del tinte del sector, para que "no sea siempre lo mismo" (feedback fundadora).
    const BUILDING = [0xffffff, 0xffe6cc, 0xd6e4ff, 0xffd6e0, 0xd8f2d8, 0xfff0cc, 0xe8d8ff, 0xcfeeee];
    const bt = BUILDING[Phaser.Math.Between(0, BUILDING.length - 1)];
    t.setTint(this._mixTint(SECTORS[this.sectorIx].tint, bt));
    t.setDepth(4);
    this.platforms.add(t);
    t.body.setAllowGravity(false);
    t.body.setImmovable(true);
    t.body.setVelocityX(-this._speedNow());
    return t;
  }

  _spawnNext() {
    const width = Phaser.Math.Between(280, 540);
    // El hueco se genera con la velocidad BASE (sin el ×1.38 del skate ni la
    // ralentización del tropiezo): un hueco creado durante el skate se cruza
    // después a velocidad normal y sería una trampa mortal.
    const base = Math.min(640, 300 + this.dist * 0.01);
    const dy = Phaser.Math.Between(-70, 80);   // subidas menos bruscas = huecos más saltables
    // Huecos más conservadores (feedback fundadora: "veo unos muy lejos"): con
    // estos topes el salto SIEMPRE llega con margen, incluso subiendo a tope de vel.
    const gapMax = dy < -40 ? 100 + base * 0.32 : 120 + base * 0.46;
    const gap = Phaser.Math.Between(100, Math.round(gapMax));
    const left = this.lastRight + gap;
    const top = Phaser.Math.Clamp(this.lastTop + dy, 400, 610);
    this._spawnPlatform(left, top, width);

    const meters = this.dist / 50;

    // Fruit: lines on the roof or arcs over the gap (Adventure Island fuel).
    if (Math.random() < 0.68) {
      const n = Phaser.Math.Between(2, 4);
      const overGap = Math.random() < 0.35 && gap > 150;
      for (let i = 0; i < n; i++) {
        const fx = overGap ? left - gap / 2 - ((n - 1) / 2 - i) * 54 : left + 60 + i * 58;
        const fy = overGap ? this.lastTop - 150 - Math.sin((i / (n - 1 || 1)) * Math.PI) * 40
          : top - 46;
        this._addPickup(fx, fy, ["fruit-apple", "fruit-banana", "fruit-orange", "fruit-melon"][Phaser.Math.Between(0, 3)], "fruit", 44);
      }
    }

    // Animal to rescue, sitting on the roof.
    if (Math.random() < 0.34 && width > 320) {
      this._addPickup(left + width - 90, top - 40,
        ["animal-kitten", "animal-puppy", "animal-chick"][Phaser.Math.Between(0, 2)], "animal", 66);
    }

    // FAIRNESS (feedback fundadora: "los obstáculos están mal ubicados, es
    // imposible esquivar algunos"). Reglas: (1) NUNCA caja en la zona de
    // aterrizaje tras el hueco — margen proporcional a la velocidad para que
    // dé tiempo a reaccionar y saltar; (2) la caja deja salida antes del borde
    // derecho (saltarla no te tira al siguiente hueco); (3) caja y paloma
    // NUNCA en la misma plataforma (una pide saltar y la otra NO saltar =
    // órdenes contradictorias); (4) la paloma nace al 80% del ancho: como
    // vuela 1.22× más rápido que el scroll, cruza el interior de la plataforma
    // cuando ya corres por ella — jamás sobre la zona donde aterrizas ni sobre
    // el borde donde estás obligado a saltar.
    let hasCrate = false;
    if (meters > 150 && Math.random() < Math.min(0.5, 0.22 + meters * 0.0004) && width > 380) {
      const minX = left + Math.max(210, this._speedNow() * 0.35); // zona segura tras aterrizar
      const maxX = left + width - 140;                            // salida antes del borde
      if (maxX > minX + 40) {
        const c = this.hazards.create(Phaser.Math.Between(Math.round(minX), Math.round(maxX)), top - 40, "obstacle-crate");
        c.setDisplaySize(80, 80).setDepth(6);
        c.body.setVelocityX(-this._speedNow());
        c.setData("kind", "crate");
        hasCrate = true;
      }
    }

    // Pigeon overhead — from 350 m. A top−210 pasa con holgura si NO saltas y
    // te golpea si saltas: regla legible para un juego de un botón.
    if (!hasCrate && meters > 350 && Math.random() < 0.3 && width > 380) {
      const p = this.hazards.create(left + width * 0.8, top - 210, "obstacle-pigeon");
      p.setDisplaySize(72, 56).setDepth(6);
      p.body.setVelocityX(-this._speedNow() * 1.22);
      p.setData("kind", "pigeon");
      this.tweens.add({ targets: p, y: p.y - 16, duration: 420, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    // Power-ups on a distance schedule.
    if (meters >= this._nextSkateAt) {
      this._nextSkateAt += 280;   // más seguido (antes 420)
      this._addPickup(left + width / 2, top - 130, "item-skateboard", "skate", 64);
    }
    if (meters >= this._nextSuperAt) {
      this._nextSuperAt += 800;   // antes 1200 — que se vea varias veces por buena run
      this._addPickup(left + width / 2, top - 155, "item-guitar", "super-guitar", 90);
    }
    if (meters >= this._nextGuitarAt) {
      this._nextGuitarAt += 400;   // guitarra mucho más frecuente (feedback fundadora)
      this._addPickup(left + width / 2 - 80, top - 140, "item-guitar", "guitar", 72);
    }
    // Corazón de CONTINUAR: guárdalo y al caer sigues la partida (máx 2).
    if (meters >= this._nextLifeAt && this.lives < 2) {
      this._nextLifeAt = meters + 450;
      this._addPickup(left + width * 0.3, top - 135, "heart", "life", 54);
    }

    this.lastRight = left + width;
    this.lastTop = top;
  }

  _addPickup(x, y, tex, kind, size) {
    const p = this.pickups.create(x, y, tex);
    const sc = size / p.height;
    p.setScale(sc).setDepth(6);
    p.body.setVelocityX(-this._speedNow());
    p.setData("kind", kind);
    if (kind === "super-guitar") p.setTint(0xff77aa);   // guitarra especial roja/rosa
    if (kind === "skate" || kind === "guitar" || kind === "super-guitar") {
      const sup = kind === "super-guitar";
      const glow = this.add.image(x, y, "glow").setDepth(5).setScale(sup ? 2.5 : 1.8)
        .setTint(sup ? 0xff4488 : 0xffe066).setAlpha(0.78);
      p.setData("glow", glow);
      this.tweens.add({ targets: glow, alpha: 0.3, duration: sup ? 380 : 500, yoyo: true, repeat: -1 });
    }
    this.tweens.add({ targets: p, y: y - 10, duration: 620, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    return p;
  }

  // ------------------------------------------------------------------ pickup

  _collect(player, p) {
    if (!p.active) return;
    const kind = p.getData("kind");
    if (kind === "fruit") {
      this.energy = Math.min(100, this.energy + 14);
      this.snd.fruit();
      this._burst(p.x, p.y, 6, 0xffe066);
      this._float(p.x, p.y, "+14", "#7cd94e");
      this._barFlashT = 0.16;   // flash de la barra: conecta fruta → energía
    } else if (kind === "animal") {
      this.animals += 1;
      this.combo += 1;
      this.comboT = 4;
      this.energy = Math.min(100, this.energy + 6);
      this.snd.animal(this.combo);
      this._burst(p.x, p.y, 10, 0xff8fb0);
      this._float(p.x, p.y, this.combo >= 2 ? `RESCUED! x${this.combo}` : "RESCUED!", "#ffe066");
    } else if (kind === "life") {
      this.lives = Math.min(2, this.lives + 1);
      this.snd.animal(1);
      this._burst(p.x, p.y, 10, 0xff5e7a);
      this._float(p.x, p.y, "+1 LIFE!", "#ff8fb0");
      this._refreshLives();
    } else if (kind === "skate") {
      this.skateT = 9;
      this.snd.skate();
      this._float(p.x, p.y, "SKATEBOARD!", "#3ec8e8");
    } else if (kind === "guitar") {
      this._startSolo();
    } else if (kind === "super-guitar") {
      this._startSuperSolo();
    }
    const glow = p.getData("glow");
    if (glow) { this.tweens.killTweensOf(glow); glow.destroy(); }
    this.tweens.killTweensOf(p);
    p.destroy();
  }

  _startSolo() {
    this.soloT = 9;   // más largo (feedback de la fundadora): el poder dura más
    this.superSolo = false;
    this.snd.soloStart();
    this._playSoloAudio("guitarSolo", 0.8);   // solo de guitarra REAL (Pixabay)
    this._soloCutIn(false);
  }

  _startSuperSolo() {
    this.soloT = 14;   // la super guitarra dura MÁS (feedback de la fundadora)
    this.superSolo = true;
    this.snd.soloStart();
    this._playSoloAudio("superGuitar", 0.85);   // rock potente (Pixabay)
    this._soloCutIn(true);
  }

  // CUT-IN cinemático (feedback fundadora: "una pantalla como la inicial donde
  // salga Cristian empezando a tocar"): el mundo se congela ~1.1s, entra el
  // arte grande de Cristian con la guitarra + rayos de velocidad + título,
  // y al salir sigue corriendo ya con el poder encima.
  _soloCutIn(sup) {
    this.cutscene = true;
    this.physics.pause();
    this.anims.pauseAll();
    this._holdSrc.clear(); this.holding = false;

    const col = sup ? 0xff4488 : 0xffe066;
    const ui = [];
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x0c1420, 0).setDepth(40);
    ui.push(veil);
    this.tweens.add({ targets: veil, fillAlpha: 0.8, duration: 160 });
    // rayos de velocidad estilo anime
    const rays = this.add.graphics().setDepth(41).setAlpha(0);
    for (let i = 0; i < 16; i++) {
      rays.fillStyle(col, 0.16 + Math.random() * 0.3);
      rays.fillRect(0, Math.random() * H, W, 2 + Math.random() * 4);
    }
    ui.push(rays);
    this.tweens.add({ targets: rays, alpha: 1, duration: 200 });
    // Cristian rockeando, gigante, entrando desde la izquierda
    const art = this.add.image(W * 0.12, H / 2 + 34, "raw-cristian-guitar").setDepth(42).setAlpha(0);
    art.setScale((H * 0.74) / art.height);
    ui.push(art);
    this.tweens.add({ targets: art, x: W * 0.3, alpha: 1, duration: 280, ease: "Back.out" });
    // título
    const f = {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontStyle: "bold",
      color: sup ? "#ff8fb0" : "#ffe066", stroke: "#0c1420", strokeThickness: 10,
    };
    const t1 = this.add.text(W * 0.66, H / 2 - 64, sup ? "SUPER GUITAR!!" : "GUITAR SOLO!", { ...f, fontSize: sup ? "78px" : "72px" })
      .setOrigin(0.5).setDepth(42).setScale(0.3).setAlpha(0).setAngle(-4);
    const t2 = this.add.text(W * 0.66, H / 2 + 16, sup ? "🔥 UNSTOPPABLE 🔥" : "Rock through everything!", { ...f, fontSize: "28px", color: "#ffffff" })
      .setOrigin(0.5).setDepth(42).setAlpha(0);
    ui.push(t1, t2);
    this.tweens.add({ targets: t1, scale: 1, alpha: 1, duration: 260, delay: 120, ease: "Back.out" });
    this.tweens.add({ targets: t2, alpha: 1, duration: 240, delay: 320 });
    // chispas alrededor de la guitarra
    for (let i = 0; i < 12; i++) {
      this.time.delayedCall(120 + i * 70, () => {
        if (this.dead) return;
        this._burst(W * 0.3 + Phaser.Math.Between(-90, 110), H / 2 + Phaser.Math.Between(-160, 120), 3, col);
      });
    }
    this.cameras.main.flash(sup ? 380 : 260, 255, sup ? 90 : 224, sup ? 150 : 102);
    if (sup) this.cameras.main.shake(320, 0.007);

    this.time.delayedCall(1150, () => {
      ui.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); });
      if (this.dead) return;
      this.cutscene = false;
      // Solo reanudar si NO quedó en pausa: si no, la física corría bajo el
      // overlay de pausa (bug QA B1). Al salir de pausa, _togglePause reanuda.
      if (!this.paused) { this.physics.resume(); this.anims.resumeAll(); }
      this._afterCutIn(sup);
    });
  }

  _afterCutIn(sup) {
    this.aura.setAlpha(sup ? 1 : 0.85).setTint(sup ? 0xff4488 : 0xffe066);
    this._float(this.player.x, this.player.y - 190, sup ? "🎸 SUPER POWER! 🔥" : "🎸 LET'S ROCK!", sup ? "#ff5ea0" : "#ffe066");
    this._soloPose(sup ? 650 : 550);
    this.hazards.children.iterate((h) => { if (h && h.x < W + 40) this._smash(h, true); });
  }

  _soloPose(back) {
    this.player.anims.stop();
    this.player.setTexture("p-cristian-guitar");
    this.time.delayedCall(back, () => { if (!this.dead && this.player.body.blocked.down) this.player.play("run"); });
  }

  // Audio real del solo (Phaser sound, aparte del synth): silencia la música
  // synth de fondo mientras suena, respeta el mute del juego.
  _playSoloAudio(key, vol) {
    this.snd.stopMusic();
    this._stopSoloAudio();
    this.sound.mute = this.snd.muted;
    try {
      this._soloAudio = this.sound.add(key, { volume: vol });
      this._soloAudio.play();
    } catch (e) { this.snd.setSolo(true); /* fallback al riff synth si el audio falla */ }
  }

  _stopSoloAudio() {
    if (this._soloAudio) { this._soloAudio.stop(); this._soloAudio.destroy(); this._soloAudio = null; }
    this.snd.setSolo(false);
  }

  // ----------------------------------------------------------------- hazards

  _hitHazard(player, h) {
    if (!h.active) return;
    if (this.skateT > 0 || this.soloT > 0) { this._smash(h, this.soloT > 0); return; }
    if (this.invuln > 0) return;
    // Trip: lose energy + slow down (Adventure Island rock hit), not instant death.
    this.invuln = 1.4;
    this.energy = Math.max(0, this.energy - 16);
    this.combo = 0;
    this.speedPenalty = 1;
    this.snd.trip();
    this.cameras.main.shake(160, 0.008);
    this._hurtT = 0.5;
    this.player.anims.stop();
    this.player.setTexture("p-cristian-hurt");
    this._burst(h.x, h.y, 8, 0xffffff);
    this.tweens.killTweensOf(h);
    h.destroy();
    if (this.energy <= 0) this._die("energy");
  }

  _smash(h, withBolt) {
    if (!h.active) return;
    this._burst(h.x, h.y, 12, withBolt ? 0xffe066 : 0x3ec8e8);
    if (withBolt) {
      const b = this.add.image(h.x, h.y - 30, "bolt").setDepth(23).setScale(1.2);
      this.tweens.add({ targets: b, y: b.y - 40, alpha: 0, duration: 350, onComplete: () => b.destroy() });
    }
    this.snd.trip(); // crunchy impact
    this.tweens.killTweensOf(h);
    h.destroy();
  }

  // ------------------------------------------------------------------ update

  _speedNow() {
    const base = Math.min(640, 300 + this.dist * 0.01);
    const skate = this.skateT > 0 ? 1.38 : 1;
    // Con la guitarra se CORRE más rápido (feedback fundadora: "que se vea que
    // está agarrando poder para saltar más rápido y pasar obstáculos").
    const solo = this.soloT > 0 ? (this.superSolo ? 1.22 : 1.12) : 1;
    const pen = 1 - 0.35 * this.speedPenalty;
    return base * Math.max(skate, solo) * pen;
  }

  update(timeNow, dms) {
    if (this.dead || this.paused || this.cutscene) return;
    const dt = Math.min(0.05, dms / 1000);

    this.speedPenalty = Math.max(0, this.speedPenalty - dt / 1.2);
    this.speed = this._speedNow();
    this.dist += this.speed * dt;
    const meters = Math.floor(this.dist / 50);

    // Energy drain — the clock that keeps you hungry. Proporcional a la
    // velocidad (4.5/s a 300 → 9.6/s a 640): a más velocidad pasan más
    // plataformas (más fruta/s), así la presión no se invierte en el late game.
    this.energy -= 0.015 * this.speed * dt;
    if (this.energy <= 25) {
      this._lowBeepT -= dt;
      if (this._lowBeepT <= 0) { this._lowBeepT = 1.6; this.snd.lowEnergy(); }
    }
    if (this.energy <= 0) { this._die("energy"); return; }

    // Timers.
    if (this.skateT > 0) this.skateT -= dt;
    if (this.soloT > 0) {
      this.soloT -= dt;
      this.aura.setAlpha(0.55 + Math.sin(timeNow / 90) * 0.3);
      // Estela de poder detrás de Cristian: se VE que va cargado.
      this._soloTrailT = (this._soloTrailT || 0) - dt;
      if (this._soloTrailT <= 0) {
        this._soloTrailT = 0.055;
        const tr = this.add.image(this.player.x - 34, this.player.y - Phaser.Math.Between(30, 130), "spark")
          .setDepth(9).setTint(this.superSolo ? 0xff77aa : 0xffe066).setScale(Phaser.Math.FloatBetween(0.7, 1.4));
        this.tweens.add({ targets: tr, x: tr.x - 90, alpha: 0, scale: 0.2, duration: 420, onComplete: () => tr.destroy() });
      }
      if (this.soloT <= 0) {
        this._stopSoloAudio();
        this.snd.startMusic();
        this.aura.setAlpha(0).setTint(0xffe066);
        this.superSolo = false;
      }
    }
    if (this._hurtT > 0) {
      this._hurtT -= dt;
      if (this._hurtT <= 0 && this.player.body.blocked.down) this.player.play("run");
    }
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    // Keep world scrolling at current speed.
    const vx = -this.speed;
    this.platforms.children.iterate((p) => p && p.body && p.body.setVelocityX(vx));
    this.pickups.children.iterate((p) => {
      if (!p || !p.body) return;
      p.body.setVelocityX(vx);
      const glow = p.getData("glow");
      if (glow) { glow.x = p.x; glow.y = p.y; }
    });
    this.hazards.children.iterate((h) => {
      if (!h || !h.body) return;
      h.body.setVelocityX(h.getData("kind") === "pigeon" ? vx * 1.22 : vx);
    });

    // Guitar-solo magnet.
    if (this.soloT > 0) {
      this.pickups.children.iterate((p) => {
        if (!p || !p.body) return;
        const kind = p.getData("kind");
        if (kind !== "fruit" && kind !== "animal") return;
        const dx = this.player.x - p.x, dy = (this.player.y - 80) - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 300) { p.x += (dx / d) * 560 * dt; p.y += (dy / d) * 560 * dt; }
      });
    }

    // Recycle + refill.
    this.platforms.children.iterate((p) => { if (p && p.x + p.width / 2 < -40) p.destroy(); });
    this.pickups.children.iterate((p) => {
      if (p && p.x < -60) {
        const glow = p.getData("glow");
        if (glow) { this.tweens.killTweensOf(glow); glow.destroy(); }
        this.tweens.killTweensOf(p); p.destroy();
      }
    });
    this.hazards.children.iterate((h) => { if (h && h.x < -60) { this.tweens.killTweensOf(h); h.destroy(); } });
    // BUG CRÍTICO (feedback de Cristian: "a los ~20 pasos no hay más edificios y
    // caes"): lastRight es la x-mundo del borde de la última plataforma, pero las
    // plataformas se desplazan por physics y lastRight NO seguía el scroll → tras
    // los spawns iniciales quedaba en ~4000 y el while no volvía a generar nunca.
    this.lastRight -= this.speed * dt;
    while (this.lastRight < W + 400) this._spawnNext();

    // Jump: coyote + buffer + variable height (release cuts the rise).
    const grounded = this.player.body.blocked.down || this.player.body.touching.down;
    if (grounded) { this._coyote = 0.1; this._groundY = this.player.body.bottom; }
    else this._coyote = Math.max(0, this._coyote - dt);
    if (grounded && this._wasAir) {
      this.snd.land();
      if (this._hurtT <= 0) this.player.play("run");
      this._squash(0.82, 1.16, 110);   // aplasta al aterrizar (juiciness)
      for (let i = 0; i < 4; i++) {
        const d = this.add.image(PLAYER_X + Phaser.Math.Between(-16, 16), this.player.body.bottom, "dust")
          .setDepth(5).setAlpha(0.8).setScale(Phaser.Math.FloatBetween(0.5, 1.1));
        this.tweens.add({ targets: d, x: d.x - 30, y: d.y - Phaser.Math.Between(4, 16), alpha: 0, duration: 360, onComplete: () => d.destroy() });
      }
    }
    this._wasAir = !grounded;
    if (this._jumpBuffer > 0) this._jumpBuffer -= dt;
    if (this._jumpBuffer > 0 && this._coyote > 0) {
      // Con la guitarra, Cristian salta MÁS ALTO (feedback fundadora); la super
      // guitarra, aún más.
      const jumpMul = this.soloT > 0 ? (this.superSolo ? 1.42 : 1.26) : 1;
      this.player.body.velocity.y = JUMP * jumpMul;
      this._jumpBuffer = 0;
      this._coyote = 0;
      this.snd.jump();
      this._squash(1.18, 0.86, 130);   // estira al despegar
    }
    // El corte del salto variable también sube durante el solo (para no cortar el salto alto).
    const cut = this.soloT > 0 ? -440 : -320;
    if (!this.holding && this.player.body.velocity.y < cut) this.player.body.velocity.y = cut;

    // Textures per state.
    if (!grounded && this._hurtT <= 0 && this.soloT <= 0) {
      this.player.anims.stop();
      this.player.setTexture("p-cristian-jump");
    } else if (grounded && this.skateT > 0 && this._hurtT <= 0) {
      this.player.anims.stop();
      this.player.setTexture("p-cristian-skate");
    } else if (grounded && this._hurtT <= 0 && !this.player.anims.isPlaying) {
      this.player.play("run");
    }
    // Legs pump faster as the world speeds up.
    if (this.player.anims.isPlaying) this.player.anims.timeScale = 0.8 + this.speed / 500;

    this.player.x = PLAYER_X;
    this.player.body.velocity.x = 0;

    // Invulnerability blink.
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.player.setAlpha(Math.sin(timeNow / 45) > 0 ? 1 : 0.35);
    } else this.player.setAlpha(1);

    // Contact shadow + aura follow.
    const airH = Phaser.Math.Clamp(this._groundY - this.player.body.bottom, 0, 320);
    this.shadow.setPosition(PLAYER_X, this._groundY - 2);
    this.shadow.setScale(Phaser.Math.Clamp(1 - airH / 400, 0.35, 1));
    this.shadow.setAlpha(Phaser.Math.Clamp(0.28 - airH / 1500, 0.06, 0.28));
    this.aura.setPosition(this.player.x, this.player.y - 84);

    // Parallax background.
    const bgv = this.speed * 0.14 * dt;
    this.bgA.x -= bgv; this.bgB.x -= bgv;
    if (this.bgA.x + this.bgW < 0) this.bgA.x = this.bgB.x + this.bgW;
    if (this.bgB.x + this.bgW < 0) this.bgB.x = this.bgA.x + this.bgW;
    this.clouds.forEach((c) => {
      c.x -= this.speed * 0.05 * dt;
      if (c.x < -80) { c.x = W + 80; c.y = Phaser.Math.Between(40, 260); }
    });

    // Sector change.
    const next = [...SECTORS].reverse().find((s) => meters >= s.at);
    const ix = SECTORS.indexOf(next);
    if (ix !== this.sectorIx) {
      this.sectorIx = ix;
      this._swapBackground(SECTORS[ix]);
      this._banner(SECTORS[ix].name);
      this.snd.skate();
    }

    // HUD.
    this.hudDist.setText(`${meters} m`);
    this.hudAnimals.setText(`🐾 ${this.animals}`);
    this.hudCombo.setText(this.combo >= 2 ? `COMBO x${this.combo}` : "");
    this.energyFill.width = 2.2 * Math.max(0, this.energy);
    if (this._barFlashT > 0) {
      this._barFlashT -= dt;
      this.energyFill.fillColor = 0xd6ffb0;
    } else {
      this.energyFill.fillColor = this.energy > 45 ? 0x7cd94e : this.energy > 22 ? 0xffe066 : 0xff5e5e;
    }
    if (this.soloT > 0) this.hudPower.setText(`${this.superSolo ? "🎸🔥 SUPER GUITAR" : "🎸 GUITAR SOLO"} ${this.soloT.toFixed(1)}s`);
    else if (this.skateT > 0) this.hudPower.setText(`🛹 ${this.skateT.toFixed(1)}s`);
    else this.hudPower.setText("");

    // Fell off the roofs.
    if (this.player.y > H + 80) this._die("fall");
  }

  // ------------------------------------------------------------------- misc

  _float(x, y, msg, color) {
    const tx = this.add.text(x, y - 30, msg, {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "24px",
      color, fontStyle: "bold", stroke: "#23324a", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(24);
    this.tweens.add({ targets: tx, y: tx.y - 46, alpha: 0, duration: 750, onComplete: () => tx.destroy() });
  }

  _banner(msg) {
    const tx = this.add.text(W / 2, 170, msg, {
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "58px",
      color: "#ffffff", fontStyle: "bold", stroke: "#23324a", strokeThickness: 8,
    }).setOrigin(0.5).setDepth(24).setAlpha(0).setScale(0.7);
    this.tweens.add({ targets: tx, alpha: 1, scale: 1, duration: 280, ease: "Back.out" });
    this.tweens.add({ targets: tx, alpha: 0, delay: 1400, duration: 500, onComplete: () => tx.destroy() });
  }

  _burst(x, y, n, tint) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, "spark").setDepth(23).setTint(tint);
      const a = Math.random() * Math.PI * 2, d = 22 + Math.random() * 46;
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.2,
        duration: 380 + Math.random() * 240, onComplete: () => p.destroy(),
      });
    }
  }

  _refreshLives() {
    this.hudLives.forEach((h, i) => h.setAlpha(i < this.lives ? 1 : 0.18));
  }

  // Con un corazón guardado, la caída/energía no termina la partida: Cristian
  // CONTINÚA en una plataforma de rescate (feedback fundadora).
  _useLife(reason) {
    this.lives--;
    this._refreshLives();
    this._stopSoloAudio();
    this.soloT = 0; this.superSolo = false; this.skateT = 0;
    this.aura.setAlpha(0);
    this.speedPenalty = 1;
    // plataforma de rescate justo debajo
    const top = 520;
    this._spawnPlatform(PLAYER_X - 240, top, 600);
    this.player.setPosition(PLAYER_X, top - 12);
    this.player.body.setVelocity(0, 0);
    this.energy = Math.max(this.energy, 60);
    this.invuln = 2.5;
    this._hurtT = 0;
    this.player.play("run");
    this.snd.skate();
    this.cameras.main.flash(320, 255, 143, 176);
    this._float(PLAYER_X, 380, "CONTINUE! ❤", "#ff8fb0");
    if (!this.snd.muted) this.snd.startMusic();
  }

  _die(reason) {
    if (this.dead) return;
    if (this.lives > 0) { this._useLife(reason); return; }
    this.dead = true;
    this.snd.stopMusic();
    this._stopSoloAudio();
    this.snd.gameOver();
    this.physics.pause();
    this.player.anims.stop();
    this.player.setTexture("p-cristian-hurt");
    this.aura.setAlpha(0);
    this.cameras.main.shake(240, 0.012);
    const meters = Math.floor(this.dist / 50);
    this.time.delayedCall(850, () =>
      this.scene.start("GameOver", { meters, animals: this.animals, reason })
    );
  }
}
