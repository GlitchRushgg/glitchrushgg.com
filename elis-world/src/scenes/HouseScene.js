// ELI'S WORLD — the house. A cozy dollhouse sandbox:
//   · 6 rooms (arrows; drag a toy onto an arrow to send it next door), the
//     last one a BALCONY looking over the city
//   · the HOUR of the day and the WEATHER are the player's to choose, and you
//     see them through the windows, over the garden and from the balcony
//   · PAINT the walls (the garden paints its fence, the balcony its deck)
//   · hang PICTURES, move every piece of furniture and toy
//   · KITCHEN: the oven and the drawers OPEN, utensils travel, the pan cooks,
//     the blender juices, and the table seats you for dinner
//   · BATHROOM: run the tub and the sink, bathe your toys, dry them with a towel
//   · GARDEN: dig the sandbox, bounce, pick fruit, water the plants
// Everything persists. No goals, no fail state — Eli directs the story.

import {
  W, H, WALL_TOP, WALL_BOT, FLOOR_Y, CHAR_MIN_Y, CHAR_MAX_Y,
  ROOM_ORDER, TIMES, WEATHERS, PAINTS, PATTERNS, ARTWORKS, ACCESSORIES,
} from "../const.js";
import { ROOMS, FOODS, FRIDGE_MENU, UTENSILS, COMBOS } from "../data/rooms.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

const FONT = "'Segoe UI', system-ui, sans-serif";
const ROOM_LABEL = {
  living: "LIVING ROOM", kitchen: "KITCHEN", bathroom: "BATHROOM",
  bedroom: "BEDROOM", garden: "GARDEN", balcony: "BALCONY",
};

// Hora del día: cómo se ve el mundo a cada hora.
const SKY = {
  day:    { ov: 0x203a6a, ovA: 0,    win: 0xbfe4ff, orb: "sun",  gTop: 0x9fd8ff, gBot: 0xdff2ff, city: 0xffffff },
  sunset: { ov: 0xff7a3c, ovA: 0.26, win: 0xffb27a, orb: "sun",  gTop: 0xff9a6a, gBot: 0xffd9a0, city: 0xffc7a0 },
  night:  { ov: 0x0a1a44, ovA: 0.46, win: 0x3a4f8a, orb: "moon", gTop: 0x1b2a5e, gBot: 0x46589e, city: 0x7a86c4 },
};
// El clima ensucia el cielo de la hora que sea.
const WEATHER_WASH = { clear: null, cloudy: [0x9aa8b8, 0.45], rain: [0x7f93a8, 0.55], snow: [0xd8e4f0, 0.45] };
const TIME_ICON = { day: "☀️", sunset: "🌅", night: "🌙" };
const WEATHER_ICON = { clear: "🌤️", rain: "🌧️", snow: "❄️", cloudy: "☁️" };

const mix = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};

export class HouseScene extends Phaser.Scene {
  constructor() { super("House"); }

  create() {
    window.__ew = this;
    this.snd = new Sound();
    this.snd.resume();
    this.snd.startMusic();
    this.events.once("shutdown", () => { this.snd.stopMusic(); this.snd.waterOff(); });

    this.room = "living";
    this.mode = "none";           // none | paint | frames | dress
    this.items = [];              // draggable foods/utensils in the CURRENT room
    this.paintSprites = [];       // hung pictures in the CURRENT room
    this.chars = {};              // Eli + toys present in the CURRENT room
    this._glowStates = {};
    this._shadowed = [];
    this._skyFx = [];
    this._weatherFx = [];

    this._buildStatic();
    this._buildRoom();
    this._buildHUD();
    this._bindDrag();

    Save.get().visits++; Save.persist();
  }

  /* ============================ ROOM BUILD ============================ */

  _buildStatic() {
    // layers that survive room switches
    this.layerWall = this.add.container(0, 0).setDepth(1);
    this.layerShadow = this.add.container(0, 0).setDepth(3);
    this.layerRoom = this.add.container(0, 0).setDepth(5);
    this.layerFx = this.add.container(0, 0).setDepth(40);
    // velo de la hora del día (cubre toda la casa; las estrellas van encima)
    this._skyOverlay = this.add.rectangle(W / 2, H / 2, W, H, SKY.day.ov, 0).setDepth(35);
  }

  _clearRoom() {
    this.snd.waterOff();
    // Matar los tweens ANTES de destruir (Phaser no los cancela al destruir el
    // objeto): el tween infinito de "sentarse" (repeat:-1) seguía vivo sobre el
    // sprite muerto → fuga de memoria/CPU en sesiones largas (bug QA B3).
    this.layerRoom.list.forEach((o) => { this.tweens.killTweensOf(o); this._closeExtras(o); });
    this.layerWall.removeAll(true);
    this.layerShadow.removeAll(true);
    this.layerRoom.removeAll(true);
    this.items.forEach((i) => { this.tweens.killTweensOf(i); i.destroy(); });
    this.items = [];
    this.paintSprites.forEach((p) => { this.tweens.killTweensOf(p); p.destroy(); });
    this.paintSprites = [];
    Object.values(this.chars).forEach((c) => {
      this.tweens.killTweensOf(c);
      (c._acc || []).forEach((a) => a.destroy()); // los accesorios NO están en layerRoom → destruir a mano
      c.destroy();
    });
    this.chars = {};
    this._skyFx.forEach((o) => o.destroy());
    this._skyFx = [];
    this._weatherFx.forEach((o) => o.destroy());
    this._weatherFx = [];
    this._shadowed = [];
    this._glowStates = {};
    this._dropZones = [];
    this._fridgeOpen = false;
    this._drawersOpen = false;
    this._ovenOpen = false;
    this._sinkOn = false;
    this._tubOn = false;
    this._hideWater(); // el chorro y su timer viven fuera de las capas
    this._winSky = null; this._winOrb = null; this._winFrame = null; this._winRect = null;
    this._cityImg = null; this._gardenSky = null; this._deckPaint = null;
  }

  _buildRoom() {
    this._clearRoom();
    const def = ROOMS[this.room];
    const cfg = Save.get().rooms[this.room];

    // ---- fondo: ciudad (balcón) / cielo+valla (jardín) / pared+ventana ----
    if (def.bg === "city") {
      // BALCÓN (encargo fundadora): la vista ya trae baranda y tablas con
      // perspectiva; pintar aquí tiñe el suelo de la terraza.
      this._cityImg = this.add.image(W / 2, H / 2, "city");
      this._cityImg.setDisplaySize(W, H);
      this.layerWall.add(this._cityImg);
      this._deckPaint = this.add.rectangle(W / 2, 660, W, 128, cfg.wall, 0.34);
      this.layerWall.add(this._deckPaint);
      this.wallRect = null; this.patternSpr = null;
    } else if (def.outdoor) {
      this._gardenSky = this.add.graphics();
      this.layerWall.add(this._gardenSky);
      this.wallRect = this.add.tileSprite(W / 2, 425, W, 185, "fence").setTint(cfg.wall);
      this.layerWall.add(this.wallRect);
      this.patternSpr = null;
    } else {
      this.wallRect = this.add.rectangle(W / 2, (WALL_TOP + WALL_BOT) / 2, W, WALL_BOT - WALL_TOP, cfg.wall);
      this.layerWall.add(this.wallRect);
      this.patternSpr = this.add.tileSprite(W / 2, (WALL_TOP + WALL_BOT) / 2, W, WALL_BOT - WALL_TOP, "pat-stripes")
        .setVisible(cfg.pattern !== "none");
      if (cfg.pattern !== "none") this.patternSpr.setTexture("pat-" + cfg.pattern);
      this.layerWall.add(this.patternSpr);
      const base = this.add.rectangle(W / 2, WALL_BOT - 8, W, 16, 0xffffff, 0.55);
      this.layerWall.add(base);
      this._buildWindow(this.room === "kitchen" ? 260 : 1080, 250);
    }

    // ---- suelo EN PERSPECTIVA (el balcón ya lo trae dibujado) ----
    if (def.floor !== "deck") {
      const floorKey = { wood: "floor-wood", tiles: "floor-tiles", grass: "floor-grass" }[def.floor];
      const floor = this.add.image(W / 2, (FLOOR_Y + H) / 2, floorKey);
      this.layerWall.add(floor);
    }

    // ---- furniture: FIJOS como en una casa de verdad (ajuste profundo,
    // referencia Toca Life World — orden fundadora 2026-07-16). Solo las
    // cositas pequeñas con `movable: true` se arrastran; el resto FUNCIONA
    // con tap/drop, que es donde vive el juego. ----
    const moved = Save.get().rooms[this.room].moved || {};
    for (const f of def.furniture) {
      const pos = f.movable ? (moved[f.key] || { x: f.x, y: f.y }) : { x: f.x, y: f.y };
      const spr = this.add.image(pos.x, pos.y, f.key).setOrigin(0.5, 1);
      spr.setScale(f.h / spr.height);
      this.layerRoom.add(spr);
      spr._furn = f;
      // draggable SIEMPRE: el tap se detecta en dragend (umbral 10px). Los
      // fijos simplemente no se desplazan en el handler de "drag".
      spr.setInteractive({ useHandCursor: true, draggable: true });
      if (f.drop) this._dropZones.push({ spr, f });
      if (!f.wall && !f.flat) this._addShadow(spr);
    }
    this.layerRoom.sort("y");

    // ---- hung pictures ----
    for (const p of Save.get().paintings.filter((p) => p.room === this.room)) this._hangPainting(p, false);

    // ---- lo que la niña dejó por aquí (comida, cacharros) ----
    for (const d of Save.get().items.filter((i) => i.room === this.room)) {
      if (!this.textures.exists(d.kind)) continue;
      this._spawnItem(d.kind, d.x, d.y, d);
    }

    // ---- Eli + sus juguetes ----
    for (const [name, st] of Object.entries(Save.get().chars)) {
      if (st.room === this.room) this._spawnChar(name, st.x, st.y || CHAR_MAX_Y - 20);
    }

    this._applySky(false);
    this._applyWeather();

    const label = this.add.text(W / 2, 548, ROOM_LABEL[this.room], {
      fontFamily: FONT, fontSize: "20px", color: "#ffffff", fontStyle: "bold", stroke: "#a05a78", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(45);
    this.tweens.add({ targets: label, alpha: 0, delay: 1400, duration: 500, onComplete: () => label.destroy() });

    if (this.mode === "paint") this._refreshPaintUI();
  }

  // Ventana en dos piezas: el cielo se tiñe con la hora y el clima cae DENTRO;
  // el marco va encima y nunca se tiñe.
  _buildWindow(x, y) {
    const S = 1.35;
    this._winSky = this.add.image(x, y, "window-sky").setScale(S);
    this._winOrb = this.add.image(x - 36, y - 30, "sun").setScale(0.78);
    this._winFrame = this.add.image(x, y, "window-frame").setScale(S);
    this.layerWall.add(this._winSky); this.layerWall.add(this._winOrb); this.layerWall.add(this._winFrame);
    this._winRect = new Phaser.Geom.Rectangle(x - (150 * S) / 2 + 8, y - (120 * S) / 2 + 8, 150 * S - 16, 120 * S - 16);
  }

  _switchRoom(dir) {
    const ix = ROOM_ORDER.indexOf(this.room);
    const next = ROOM_ORDER[Phaser.Math.Wrap(ix + dir, 0, ROOM_ORDER.length)];
    this.snd.swoosh();
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff).setDepth(90).setAlpha(0);
    this.tweens.add({
      targets: veil, alpha: 1, duration: 130, yoyo: true,
      onYoyo: () => { this.room = next; this._buildRoom(); this._refreshDots(); },
      onComplete: () => veil.destroy(),
    });
  }

  /* ================= PROFUNDIDAD: sombras de contacto =================
     Feedback fundadora: "parece que el piso estuviese inclinado". Además del
     suelo en perspectiva (BootScene), cada mueble y cada personaje proyecta
     una sombra blanda a sus pies: es lo que los PEGA al suelo. */

  _addShadow(spr, wide = 0.84) {
    const sh = this.add.image(spr.x, spr.y, "shadow");
    sh.displayWidth = Math.max(44, spr.displayWidth * wide);
    sh.displayHeight = Math.max(15, spr.displayWidth * wide * 0.3);
    sh.setAlpha(0.3);
    this.layerShadow.add(sh);
    spr._shadow = sh;
    spr._groundY = spr.y;
    this._shadowed.push(spr);
    return sh;
  }

  _syncShadows() {
    for (const spr of this._shadowed) {
      const sh = spr._shadow;
      if (!sh || !sh.active) continue;
      if (!spr.active || spr._noShadow) { sh.setVisible(false); continue; }
      sh.setVisible(true);
      sh.x = spr.x;
      const gy = spr._furn ? spr.y : (spr._groundY ?? spr.y);
      sh.y = gy;
      // al saltar (o al levantar un mueble) la sombra se queda abajo y se abre
      const dy = Math.max(0, gy - spr.y);
      sh.setAlpha(0.3 * Math.max(0.2, 1 - dy / 220));
    }
  }

  /* ============================ CHARACTERS ============================ */

  _spawnChar(name, x, y) {
    const st = Save.get().chars[name] || {};
    const spr = this.add.image(x, Phaser.Math.Clamp(y, CHAR_MIN_Y, CHAR_MAX_Y), name).setOrigin(0.5, 1);
    spr.setScale(this.registry.get(`scale:${name}`) || 0.2);
    spr.setDepth(14);
    spr.setInteractive({ useHandCursor: true, draggable: true });
    spr._char = name;
    spr._baseScale = spr.scale;
    spr._acc = [];
    this.chars[name] = spr;
    this._addShadow(spr, 0.7);
    // re-apply a saved "sitting" pose (bug QA #4: antes aparecía de pie)
    if (st.sitting) {
      spr.y = Phaser.Math.Clamp(st.y || y, CHAR_MIN_Y, CHAR_MAX_Y);
      spr._sitting = true;
      spr._noShadow = true;
      this.tweens.add({ targets: spr, y: spr.y - 5, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }
    this._drawAccessories(spr);
    return spr;
  }

  // Dress-up: draw the accessories this character wears, following the sprite.
  _drawAccessories(spr) {
    (spr._acc || []).forEach((a) => a.destroy());
    spr._acc = [];
    const worn = Save.get().worn[spr._char] || [];
    for (const key of worn) {
      const def = ACCESSORIES[key];
      if (!def || !this.textures.exists(key)) continue;
      const img = this.add.image(0, 0, key).setDepth(def.back ? spr.depth - 1 : spr.depth + 1);
      img.setScale((def.h / img.height) * (spr.scale / spr._baseScale || 1));
      img._accKey = key; img._def = def;
      spr._acc.push(img);
    }
    this._posAccessories(spr);
  }
  _posAccessories(spr) {
    const headY = spr.y - spr.displayHeight;
    for (const img of spr._acc) {
      const d = img._def;
      img.x = spr.x + spr.displayWidth * (d.offX || 0);
      img.y = headY + spr.displayHeight * (d.offY || 0);
    }
  }

  // Tocar a un personaje = ACCIÓN (feedback fundadora: deben poder saltar,
  // agacharse...). El tap alterna saltar → agacharse → saludar para que la
  // niña vea todo lo que saben hacer. Sentado = botecito en el sitio.
  _charTap(spr) {
    this.snd.giggle();
    this._emote(spr);
    if (spr._acting) return; // no encadenar acciones
    if (spr._sitting) {
      spr._acting = true;
      this.tweens.add({ targets: spr, scaleY: spr._baseScale * 0.9, duration: 120, yoyo: true, onUpdate: () => this._posAccessories(spr), onComplete: () => { spr._acting = false; } });
      return;
    }
    spr._actIx = ((spr._actIx || 0) + 1) % 3;
    [this._jump, this._crouch, this._wave][spr._actIx].call(this, spr);
  }

  _jump(spr) {
    spr._acting = true;
    const bs = spr._baseScale;
    this.tweens.add({ targets: spr, scaleX: bs * 1.12, scaleY: bs * 0.9, duration: 90, yoyo: true, ease: "Quad.out", onUpdate: () => this._posAccessories(spr) });
    this._dust(spr.x, spr.y);
    this.tweens.add({ targets: spr, y: spr.y - 92, duration: 260, yoyo: true, delay: 60, ease: "Quad.out", onUpdate: () => this._posAccessories(spr), onComplete: () => { spr._acting = false; } });
  }

  _crouch(spr) {
    spr._acting = true;
    const bs = spr._baseScale;
    // origen (0.5,1) → escalar Y abajo mantiene los pies en el suelo = agacharse
    this.tweens.add({ targets: spr, scaleY: bs * 0.58, scaleX: bs * 1.14, duration: 200, hold: 320, yoyo: true, ease: "Quad.out", onUpdate: () => this._posAccessories(spr), onComplete: () => { spr._acting = false; } });
  }

  _wave(spr) {
    spr._acting = true;
    this.tweens.add({ targets: spr, angle: { from: -9, to: 9 }, duration: 130, yoyo: true, repeat: 3, ease: "Sine.inOut", onUpdate: () => this._posAccessories(spr), onComplete: () => { spr.setAngle(0); spr._acting = false; } });
  }

  _emote(spr) {
    const moods = ["😆", "🎵", "😍", "⭐"];
    const mood = Math.random() < 0.55 ? "heart" : Phaser.Utils.Array.GetRandom(moods);
    for (let i = 0; i < 4; i++) {
      const x = spr.x + Phaser.Math.Between(-30, 30), y = spr.y - spr.displayHeight - 8;
      const o = mood === "heart"
        ? this.add.image(x, y, "heart").setDepth(41).setScale(0.8)
        : this.add.text(x, y, mood, { fontSize: "26px" }).setOrigin(0.5).setDepth(41);
      this.tweens.add({ targets: o, y: y - 50, alpha: 0, duration: 700, delay: i * 90, onComplete: () => o.destroy() });
    }
  }

  // Comer: la comida vuela a la boca, se encoge y el personaje mastica (😋).
  _eat(c, food) {
    const mouthX = c.x, mouthY = c.y - c.displayHeight * 0.8;
    this.tweens.killTweensOf(food);
    food.disableInteractive();
    this.tweens.add({
      targets: food, x: mouthX, y: mouthY, scale: (food._baseScale || food.scale) * 0.45, duration: 280, ease: "Quad.in",
      onComplete: () => {
        this._removeItem(food, false);
        this.snd.munch();
        const bs = c._baseScale;
        if (!c._sitting) this.tweens.add({ targets: c, scaleX: bs * 1.06, scaleY: bs * 0.94, duration: 100, yoyo: true, repeat: 2, onUpdate: () => this._posAccessories(c) });
        this._floatEmoji(c.x, c.y - c.displayHeight - 6, "😋");
      },
    });
  }

  _sendCharTo(name, dir) {
    const st = Save.get().chars[name];
    const ix = ROOM_ORDER.indexOf(this.room);
    const next = ROOM_ORDER[Phaser.Math.Wrap(ix + dir, 0, ROOM_ORDER.length)];
    st.room = next;
    st.x = dir > 0 ? 140 : W - 140;
    st.y = CHAR_MAX_Y - 20;
    st.sitting = false;
    Save.persist();
    const spr = this.chars[name];
    if (spr) {
      this.snd.swoosh();
      spr._noShadow = true;
      this.tweens.add({
        targets: spr, x: dir > 0 ? W + 90 : -90, duration: 240, ease: "Quad.in",
        onComplete: () => { spr.destroy(); delete this.chars[name]; },
      });
    }
  }

  /* ============================ FURNITURE TAPS ============================ */

  _tapFurniture(spr, f) {
    switch (f.tap) {
      case "wiggle":
      case "rock": {
        this.snd.ui();
        this.tweens.add({ targets: spr, angle: f.tap === "rock" ? 14 : 5, duration: 110, yoyo: true, repeat: 2, onComplete: () => spr.setAngle(0) });
        this._sparkle(spr.x, spr.y - spr.displayHeight / 2, 4);
        break;
      }
      case "glow": {
        const on = (this._glowStates[f.key] = !this._glowStates[f.key]);
        this.snd.chime();
        if (on) {
          const g = this.add.image(spr.x, spr.y - spr.displayHeight * 0.72, "glowdisc").setScale(2.6).setDepth(13);
          spr._glow = g;
          this.layerRoom.add(g);
        } else if (spr._glow) { spr._glow.destroy(); spr._glow = null; }
        break;
      }
      case "fish": {
        this.snd.ui();
        for (let i = 0; i < 6; i++) {
          const b = this.add.image(spr.x + Phaser.Math.Between(-30, 30), spr.y - spr.displayHeight * 0.6, "bubble").setDepth(41);
          this.tweens.add({ targets: b, y: b.y - 70, alpha: 0, duration: 800, delay: i * 80, onComplete: () => b.destroy() });
        }
        break;
      }
      case "cuckoo": {
        this.snd.cuckoo();
        this.tweens.add({ targets: spr, scaleX: spr.scaleX * 1.08, duration: 120, yoyo: true, repeat: 1 });
        break;
      }
      case "radio": {
        // MÚSICA DE VERDAD (ajuste profundo): la radio ENCIENDE/APAGA la
        // cajita de música — el personaje "escucha música si desea".
        this._radioOn = !this._radioOn;
        if (this._radioOn) {
          this.snd.startMusic();
          this._radioNotes = this.time.addEvent({
            delay: 620, loop: true, callback: () => {
              // la música suena por toda la casa, pero las notas solo brotan
              // de la radio: en otra sala el sprite no existe y no se dibujan
              const r = this.layerRoom.list.find((o) => o._furn?.key === "radio");
              if (!r || !r.active) return;
              const n = this.add.text(r.x + Phaser.Math.Between(-20, 20), r.y - r.displayHeight, ["♪", "♫"][Phaser.Math.Between(0, 1)], {
                fontFamily: FONT, fontSize: "26px", color: "#ff6b96",
              }).setDepth(41);
              this.tweens.add({ targets: n, y: n.y - 80, alpha: 0, duration: 900, onComplete: () => n.destroy() });
            },
          });
          if (!this._radioHooked) {
            this._radioHooked = true;
            this.events.once("shutdown", () => { if (this._radioOn) this.snd.stopMusic(); });
          }
        } else {
          this.snd.stopMusic();
          if (this._radioNotes) { this._radioNotes.remove(); this._radioNotes = null; }
        }
        break;
      }
      case "tree": {
        this.snd.boing();
        this.tweens.add({ targets: spr, angle: 2, duration: 90, yoyo: true, repeat: 3, onComplete: () => spr.setAngle(0) });
        if (this.items.length < 12) {
          const a = this._spawnItem("apple", spr.x + Phaser.Math.Between(-90, 90), spr.y - spr.displayHeight * 0.62);
          this.tweens.add({ targets: a, y: CHAR_MAX_Y - 6, duration: 420, ease: "Bounce.out" });
        }
        break;
      }
      case "fruit": {
        this.snd.pick();
        if (this.items.length < 12) {
          const kind = Phaser.Math.RND.pick(["apple", "banana", "orange", "strawberry", "mango"]);
          const it = this._spawnItem(kind, spr.x + Phaser.Math.Between(-20, 20), spr.y - spr.displayHeight - 8);
          this.tweens.add({ targets: it, y: it.y - 26, duration: 160, yoyo: true, ease: "Quad.out" });
        }
        break;
      }
      case "fridge": {
        this._fridgeOpen = !this._fridgeOpen;
        this.snd.pick();
        spr.setTexture(this._fridgeOpen ? "fridge-open" : "fridge");
        spr.setScale(f.h / spr.height);
        if (this._fridgeOpen) {
          const menu = Phaser.Utils.Array.Shuffle([...FRIDGE_MENU]).slice(0, 4);
          menu.forEach((kind, i) => {
            if (this.items.length >= 12) return;
            const it = this._spawnItem(kind, spr.x - 40 + (i % 2) * 80, spr.y - spr.displayHeight * (i < 2 ? 0.62 : 0.3));
            it.setDepth(15);
          });
        }
        break;
      }
      // GAVETAS (encargo fundadora): abren y dan los cacharros para llevar
      case "drawers": {
        this._drawersOpen = !this._drawersOpen;
        this.snd.pick();
        spr.setTexture(this._drawersOpen ? "drawers-open" : "drawers");
        spr.setScale(f.h / spr.height);
        if (this._drawersOpen) {
          UTENSILS.forEach((u, i) => {
            if (this.items.length >= 12) return;
            const it = this._spawnItem(u, spr.x - 34 + i * 68, spr.y - spr.displayHeight - 10);
            this.tweens.add({ targets: it, y: it.y - 22, duration: 180, yoyo: true, ease: "Quad.out" });
          });
        }
        break;
      }
      // HORNO (encargo fundadora): la puerta se abre y dentro se hornea
      case "oven": {
        this._ovenOpen = !this._ovenOpen;
        this.snd.pick();
        this._drawOven(spr);
        break;
      }
      case "sink": {
        this._sinkOn = !this._sinkOn;
        if (this._sinkOn) { this.snd.waterOn(); this._waterSpr = spr; this._showWater(spr); }
        else { this.snd.waterOff(); this._hideWater(); }
        break;
      }
      // TINA (encargo fundadora): el agua corre si ella la enciende
      case "tub": {
        this._tubOn = !this._tubOn;
        if (this._tubOn) { this.snd.waterOn(); this._fillTub(spr); }
        else { this.snd.waterOff(); this._drainTub(spr); }
        break;
      }
      // TOALLAS: seca a quien esté en la tina y lo deja sequito al lado
      case "towel": {
        this.snd.ui();
        this.tweens.add({ targets: spr, angle: 4, duration: 100, yoyo: true, repeat: 1, onComplete: () => spr.setAngle(0) });
        this._dryOff(spr);
        break;
      }
      case "soap": {
        this.snd.splash();
        this.tweens.add({ targets: spr, angle: 12, duration: 90, yoyo: true, repeat: 2, onComplete: () => spr.setAngle(0) });
        for (let i = 0; i < 8; i++) {
          const b = this.add.image(spr.x + Phaser.Math.Between(-16, 16), spr.y - 10, "bubble").setDepth(41)
            .setScale(Phaser.Math.FloatBetween(0.6, 1.4));
          this.tweens.add({ targets: b, y: b.y - Phaser.Math.Between(50, 110), x: b.x + Phaser.Math.Between(-30, 30), alpha: 0, duration: 1100, delay: i * 70, onComplete: () => b.destroy() });
        }
        break;
      }
      case "brush": {
        this.snd.ui();
        this.tweens.add({ targets: spr, x: spr.x + 8, angle: -10, duration: 80, yoyo: true, repeat: 4, onComplete: () => { spr.setAngle(0); } });
        this._sparkle(spr.x, spr.y - spr.displayHeight, 6);
        this._floatEmoji(spr.x, spr.y - spr.displayHeight - 14, "✨");
        break;
      }
      case "sand": {
        this.snd.pick();
        for (let i = 0; i < 10; i++) {
          const d = this.add.image(spr.x + Phaser.Math.Between(-40, 40), spr.y - spr.displayHeight * 0.5, "px")
            .setDepth(41).setTint(0xf0d8a0).setScale(Phaser.Math.FloatBetween(1.5, 3));
          this.tweens.add({ targets: d, y: d.y - Phaser.Math.Between(20, 60), x: d.x + Phaser.Math.Between(-25, 25), alpha: 0, duration: 600, delay: i * 40, onComplete: () => d.destroy() });
        }
        this._floatEmoji(spr.x, spr.y - spr.displayHeight - 10, Phaser.Math.RND.pick(["🏰", "🪣", "⛱️"]));
        break;
      }
      // REGAR (encargo fundadora): la regadera se inclina y lo verde de al lado florece
      case "water": {
        this.snd.waterOn();
        this.time.delayedCall(1200, () => this.snd.waterOff());
        this.tweens.add({ targets: spr, angle: -34, duration: 260, yoyo: true, hold: 900, ease: "Sine.inOut", onComplete: () => spr.setAngle(0) });
        const sx = spr.x + spr.displayWidth * 0.55, sy = spr.y - spr.displayHeight * 0.55;
        for (let i = 0; i < 16; i++) {
          this.time.delayedCall(260 + i * 60, () => {
            const d = this.add.image(sx + Phaser.Math.Between(-14, 14), sy, "px").setDepth(41).setTint(0x7fd4ff).setScale(2);
            this.tweens.add({ targets: d, y: CHAR_MAX_Y - 10, alpha: 0.2, duration: 380, onComplete: () => d.destroy() });
          });
        }
        // lo verde a menos de 220px florece
        this.time.delayedCall(700, () => {
          for (const o of this.layerRoom.list) {
            if (!["flowerbed", "plant", "tree"].includes(o._furn?.key)) continue;
            if (Math.abs(o.x - spr.x) > 220) continue;
            this.snd.chime();
            this.tweens.add({ targets: o, scaleY: o.scaleY * 1.08, duration: 260, yoyo: true, ease: "Sine.out" });
            for (let i = 0; i < 5; i++) {
              this._floatEmoji(o.x + Phaser.Math.Between(-40, 40), o.y - o.displayHeight * Phaser.Math.FloatBetween(0.3, 0.8), Phaser.Math.RND.pick(["🌸", "🌼", "🌺"]));
            }
          }
        });
        break;
      }
      case "ball": {
        this.snd.boing();
        this.tweens.add({ targets: spr, y: spr.y - 130, duration: 300, yoyo: true, ease: "Quad.out" });
        this.tweens.add({ targets: spr, angle: spr.angle + 360, duration: 600 });
        break;
      }
      case "dollhouse": {
        this.snd.chime();
        this.tweens.add({ targets: spr, scaleX: spr.scaleX * 1.05, scaleY: spr.scaleY * 0.96, duration: 130, yoyo: true, repeat: 1 });
        this._sparkle(spr.x, spr.y - spr.displayHeight * 0.7, 10);
        this._floatEmoji(spr.x, spr.y - spr.displayHeight - 10, "🏠");
        break;
      }
      case "duck": {
        this.snd.boing();
        this.tweens.add({ targets: spr, scaleY: spr.scaleY * 0.7, duration: 90, yoyo: true });
        for (let i = 0; i < 4; i++) {
          const b = this.add.image(spr.x + Phaser.Math.Between(-14, 14), spr.y - spr.displayHeight * 0.6, "bubble").setDepth(41);
          this.tweens.add({ targets: b, y: b.y - 50, alpha: 0, duration: 700, delay: i * 90, onComplete: () => b.destroy() });
        }
        break;
      }
    }
  }

  /* ============================ HORNO / TINA ============================ */

  _drawOven(spr) {
    if (spr._extra) { spr._extra.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); }); spr._extra = null; }
    if (!this._ovenOpen) return;
    const dw = spr.displayWidth, dh = spr.displayHeight;
    const w = dw * 0.58, hh = dh * 0.28;
    const cx = spr.x, cy = spr.y - dh * 0.28;   // donde el arte del horno tiene su ventanita
    const cavity = this.add.rectangle(cx, cy, w, hh, 0x3a2418).setDepth(6);
    const rack = this.add.rectangle(cx, cy + hh * 0.3, w * 0.8, 3, 0x8a7460).setDepth(7);
    const glow = this.add.image(cx, cy, "glowdisc").setScale(w / 44).setTint(0xffa54a).setAlpha(0).setDepth(7);
    // La puerta se abate HACIA el jugador: no es un rectángulo que baja, es un
    // panel en escorzo (más ancho por delante que por detrás).
    const y0 = spr.y - dh * 0.13, pd = dh * 0.16;
    const pts = [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }, { x: w * 0.58, y: pd }, { x: -w * 0.58, y: pd }];
    const door = this.add.graphics().setDepth(8);
    door.fillStyle(0xe8e4dc, 1); door.fillPoints(pts, true);
    door.lineStyle(2, 0xb0a89c, 1); door.strokePoints(pts, true, true);
    door.fillStyle(0x6a5a4a, 0.5); door.fillRect(-w * 0.3, pd * 0.3, w * 0.6, pd * 0.4); // el cristal, tumbado
    door.setPosition(cx, y0).setScale(1, 0);
    spr._extra = [cavity, rack, glow, door];
    this.tweens.add({ targets: door, scaleY: 1, duration: 260, ease: "Back.out" });
    this.tweens.add({ targets: glow, alpha: 0.5, duration: 400 });
    this._ovenZone = new Phaser.Geom.Rectangle(cx - w / 2, cy - hh / 2, w, hh);
  }

  _fillTub(spr) {
    if (spr._extra) { spr._extra.forEach((o) => o.destroy()); spr._extra = null; }
    const w = spr.displayWidth * 0.76, full = spr.displayHeight * 0.3;
    const water = this.add.image(spr.x, spr.y - spr.displayHeight * 0.12, "px").setOrigin(0.5, 1)
      .setTint(0x6ec8ff).setAlpha(0.55).setDepth(6);
    water.displayWidth = w; water.displayHeight = 2;
    spr._extra = [water];
    this.tweens.add({ targets: water, displayHeight: full, duration: 2600, ease: "Sine.inOut" });
    // chorro + burbujas mientras se llena
    for (let i = 0; i < 14; i++) {
      this.time.delayedCall(i * 180, () => {
        if (!this._tubOn || !water.active) return;
        const b = this.add.image(spr.x + Phaser.Math.Between(-50, 50), spr.y - spr.displayHeight * 0.36, "bubble").setDepth(41);
        this.tweens.add({ targets: b, y: b.y - Phaser.Math.Between(30, 70), alpha: 0, duration: 800, onComplete: () => b.destroy() });
      });
    }
  }

  _drainTub(spr) {
    if (!spr._extra) return;
    const [water] = spr._extra;
    spr._extra = null;
    this.tweens.add({ targets: water, displayHeight: 1, alpha: 0, duration: 900, onComplete: () => water.destroy() });
  }

  // La toalla saca de la tina a quien se esté bañando y lo deja seco al lado.
  _dryOff(rack) {
    const bather = Object.values(this.chars).find((c) => c._bathing);
    if (!bather) { this._floatEmoji(rack.x, rack.y - rack.displayHeight - 10, "🧺"); return; }
    const tub = this.layerRoom.list.find((s) => s._furn?.key === "bathtub");
    bather._bathing = false;
    bather._noShadow = false;
    if (bather.parentContainer) { bather.parentContainer.remove(bather); this.add.existing(bather); }
    bather.setDepth(14).setAngle(0);
    bather.x = Phaser.Math.Clamp((tub ? tub.x + tub.displayWidth * 0.66 : rack.x), 90, W - 90);
    bather.y = CHAR_MAX_Y - 20;
    bather._groundY = bather.y;
    this.snd.chime();
    this._sparkle(bather.x, bather.y - bather.displayHeight * 0.6, 10);
    this._floatEmoji(bather.x, bather.y - bather.displayHeight - 8, "✨");
    this.tweens.add({ targets: bather, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => bather.setAngle(0) });
    this._persistChar(bather._char, bather);
  }

  // Al arrastrar un mueble, lo que le colgaba (horno abierto, agua) se cierra.
  _closeExtras(spr) {
    if (!spr._extra) return;
    spr._extra.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); });
    spr._extra = null;
    if (spr._furn?.key === "stove") this._ovenOpen = false;
    if (spr._furn?.key === "bathtub") { this._tubOn = false; this.snd.waterOff(); }
  }

  /* ============================ AGUA VISIBLE ============================ */
  // El agua SE VE correr (ajuste profundo — "el agua corre para lavarse las
  // manos"): chorro desde el grifo + gotitas que salpican mientras esté abierto.
  _showWater(spr) {
    this._hideWater();
    // offsets afinados MIRANDO los PNG: el chorro nace en la boca del grifo
    // de cada modelo (baño: grifo a la derecha del lavabo, más bajo)
    const isBath = spr._furn?.key === "bathsink";
    const fx = spr.x + spr.displayWidth * (isBath ? 0.13 : 0.15);
    const top = spr.y - spr.displayHeight * (isBath ? 0.5 : 0.68);
    const len = spr.displayHeight * (isBath ? 0.16 : 0.3);
    const g = this.add.graphics().setDepth(40);
    g.fillStyle(0x9fd8ff, 0.85);
    g.fillRoundedRect(fx - 5, top, 10, len, 5);
    g.fillStyle(0xffffff, 0.55);
    g.fillRoundedRect(fx - 1.5, top, 3, len, 1.5);
    this._waterG = g;
    this._waterDrops = this.time.addEvent({
      delay: 150, loop: true, callback: () => {
        const d = this.add.circle(fx + Phaser.Math.Between(-9, 9), top + len, 3, 0x9fd8ff, 0.9).setDepth(40);
        this.tweens.add({ targets: d, y: d.y + 12, alpha: 0, scaleX: 1.7, duration: 260, onComplete: () => d.destroy() });
      },
    });
  }
  _hideWater() {
    if (this._waterG) { this._waterG.destroy(); this._waterG = null; }
    if (this._waterDrops) { this._waterDrops.remove(); this._waterDrops = null; }
  }

  /* ============================ ITEMS (foods + utensils) ============================ */

  // `data` = la entrada guardada (al reconstruir la sala); si no viene, es un
  // objeto nuevo y se apunta en la casa.
  _spawnItem(kind, x, y, data = null) {
    const spr = this.add.image(x, y, kind).setDepth(16);
    // caber en una caja: solo por altura, una sartén (muy ancha) salía enorme
    spr.setScale(Math.min(74 / spr.height, 150 / spr.width));
    spr.setInteractive({ useHandCursor: true, draggable: true });
    spr._item = kind;
    spr._utensil = UTENSILS.includes(kind); // los cacharros no se comen
    spr._baseScale = spr.scale;
    if (!data) {
      data = { room: this.room, kind, x: Math.round(x), y: Math.round(y) };
      Save.get().items.push(data);
      Save.persist();
    }
    spr._data = data;
    this.items.push(spr);
    this.snd.pick();
    return spr;
  }

  // Todo lo que la niña deja por la casa se queda donde lo dejó.
  _persistItem(spr) {
    const d = spr._data;
    if (!d) return;
    d.room = this.room; d.kind = spr._item;
    d.x = Math.round(spr.x); d.y = Math.round(spr.y);
    Save.persist();
  }

  _removeItem(spr, poof = true) {
    if (poof) this._sparkle(spr.x, spr.y, 5);
    this.items = this.items.filter((i) => i !== spr);
    if (spr._data) {
      Save.get().items = Save.get().items.filter((d) => d !== spr._data);
      Save.persist();
    }
    spr.destroy();
  }

  // Llevarse la merienda a otra habitación: igual que con los personajes,
  // arrastra el objeto a la flecha (encargo fundadora: "trasladar utensilios y
  // cosas... también comida de un lado para otro").
  _sendItemTo(spr, dir) {
    const d = spr._data;
    const ix = ROOM_ORDER.indexOf(this.room);
    if (d) {
      d.room = ROOM_ORDER[Phaser.Math.Wrap(ix + dir, 0, ROOM_ORDER.length)];
      d.x = dir > 0 ? 150 : W - 150;
      d.y = CHAR_MAX_Y - 40;
      Save.persist();
    }
    this.items = this.items.filter((i) => i !== spr);
    this.snd.swoosh();
    this.tweens.add({
      targets: spr, x: dir > 0 ? W + 70 : -70, duration: 240, ease: "Quad.in",
      onComplete: () => spr.destroy(),
    });
  }

  _dropItem(spr, x, y) {
    // flechas → se lo lleva a la sala de al lado
    if (x < 80) { this._sendItemTo(spr, -1); return; }
    if (x > W - 80) { this._sendItemTo(spr, 1); return; }
    // on a character → EAT (la comida vuela a la boca + mastica + 😋).
    // Vale para todos: en una casa de muñecas dar de comer al peluche o al
    // cachorro también es juego. Los utensilios NO se comen.
    if (!spr._utensil) {
      for (const c of Object.values(this.chars)) {
        const r = new Phaser.Geom.Rectangle(c.x - c.displayWidth / 2, c.y - c.displayHeight, c.displayWidth, c.displayHeight);
        if (r.contains(x, y)) { this._eat(c, spr); return; }
      }
      // RECETAS (ajuste profundo, referencia Bluey/Toca — orden fundadora):
      // junta dos comidas y SE FORMA EL PLATO — huevos + salchichas = desayuno,
      // pan + salchicha = hot dog.
      for (const other of this.items) {
        if (other === spr || other._utensil || !other.active) continue;
        const r = other.getBounds();
        if (!r.contains(x, y)) continue;
        const combo = COMBOS[[spr._item, other._item].sort().join("+")];
        if (!combo) continue;
        const cx2 = other.x, cy2 = other.y;
        this._removeItem(other, false);
        this._removeItem(spr, false);
        const it = this._spawnItem(combo.result, cx2, cy2);
        const base = it.scale;
        it.setScale(base * 0.2);
        this.tweens.add({ targets: it, scale: base, duration: 280, ease: "Back.out" });
        this._sparkle(cx2, cy2 - 24, 10);
        this.snd.chime();
        const t = this.add.text(cx2, cy2 - 74, combo.label, {
          fontFamily: FONT, fontSize: "30px", color: "#ff6b96", stroke: "#ffffff", strokeThickness: 5,
        }).setOrigin(0.5).setDepth(45);
        this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
        return;
      }
    }
    // on a drop-zone
    for (const { spr: z, f } of this._dropZones) {
      const r = new Phaser.Geom.Rectangle(z.x - z.displayWidth / 2, z.y - z.displayHeight, z.displayWidth, z.displayHeight);
      if (!r.contains(x, y)) continue;
      if (f.drop === "cook") {
        // ¿dentro del horno abierto? → se hornea ahí dentro
        if (this._ovenOpen && this._ovenZone && this._ovenZone.contains(x, y)) { this._bake(spr); return; }
        if (spr._utensil) { // una olla/sartén encima del fuego: solo se posa
          spr.x = z.x; spr.y = z.y - z.displayHeight * 0.74;
          this.snd.drop();
          this._persistItem(spr);
          return;
        }
        const cooked = FOODS[spr._item]?.cooked;
        this.snd.sizzle();
        this._steam(z.x, z.y - z.displayHeight * 0.8, 5);
        spr.x = z.x; spr.y = z.y - z.displayHeight * 0.72;
        this._persistItem(spr);
        if (cooked) {
          this.time.delayedCall(900, () => {
            if (!spr.active) return;
            spr.setTexture(cooked);
            spr._item = cooked;
            spr.setScale(Math.min(74 / spr.height, 150 / spr.width));
            this._persistItem(spr);
            this._sparkle(spr.x, spr.y, 6);
            this.snd.chime();
          });
        }
        return;
      }
      if (f.drop === "blend") {
        if (spr._utensil) break;
        this.snd.whirr();
        this.tweens.add({ targets: z, angle: 4, duration: 70, yoyo: true, repeat: 5, onComplete: () => z.setAngle(0) });
        this._removeItem(spr, false);
        this.time.delayedCall(600, () => {
          if (!z.active) return; // guarda (bug QA #2): si cambió de sala, no spawnear el zumo en la sala nueva
          const j = this._spawnItem("juice", z.x, z.y - z.displayHeight - 10);
          this.tweens.add({ targets: j, y: j.y - 20, duration: 150, yoyo: true });
          this.snd.chime();
        });
        return;
      }
      if (f.drop === "table") {
        spr.x = Phaser.Math.Clamp(x, z.x - z.displayWidth * 0.3, z.x + z.displayWidth * 0.3);
        spr.y = z.y - z.displayHeight * 0.82;
        this.snd.drop();
        this._persistItem(spr);
        // CUMPLEAÑOS (game-director #4): tarta/cupcake en la mesa → velas +
        // quien esté en la sala se acerca + confeti + fanfarria.
        if (spr._item === "cake" || spr._item === "cupcake") this._birthday(spr.x, spr.y);
        return;
      }
      if (f.drop === "bathe" && !spr._utensil) {
        // un juguete/comida en la tina: chapuzón
        spr.x = z.x + Phaser.Math.Between(-30, 30); spr.y = z.y - z.displayHeight * 0.3;
        this.snd.splash();
        this._persistItem(spr);
        return;
      }
    }
    // default: settle on the floor band
    spr.y = Phaser.Math.Clamp(y, CHAR_MIN_Y - 20, CHAR_MAX_Y);
    this.snd.drop();
    this._persistItem(spr);
  }

  _bake(spr) {
    const z = this._ovenZone;
    spr.x = z.centerX + Phaser.Math.Between(-20, 20);
    spr.y = z.centerY + 6;
    spr.setDepth(7);
    this._persistItem(spr);
    this.snd.sizzle();
    const cooked = FOODS[spr._item]?.cooked;
    this._steam(z.centerX, z.top, 4);
    this.time.delayedCall(1400, () => {
      if (!spr.active) return;
      if (cooked) { spr.setTexture(cooked); spr._item = cooked; spr.setScale(Math.min(74 / spr.height, 150 / spr.width)); }
      this._persistItem(spr);
      this._sparkle(spr.x, spr.y, 6);
      this.snd.chime();
      this._floatEmoji(spr.x, z.top - 10, "😋");
    });
  }

  _dropChar(spr, x, y) {
    const name = spr._char;
    // arrows → next room
    if (x < 80) { this._sendCharTo(name, -1); return; }
    if (x > W - 80) { this._sendCharTo(name, 1); return; }
    spr._bathing = false;
    // furniture reactions
    for (const { spr: z, f } of this._dropZones) {
      const r = new Phaser.Geom.Rectangle(z.x - z.displayWidth / 2, z.y - z.displayHeight, z.displayWidth, z.displayHeight);
      if (!r.contains(x, y)) continue;
      if (f.drop === "lay") {
        spr.x = z.x; spr.y = z.y - z.displayHeight * 0.34;
        spr.setAngle(-84);
        spr._noShadow = true;
        this.snd.zzz();
        this._floatEmoji(z.x, z.y - z.displayHeight - 16, "💤");
        this._persistChar(name, spr);
        return;
      }
      if (f.drop === "swing") {
        spr.x = z.x; spr.y = z.y - z.displayHeight * 0.16;
        spr._noShadow = true;
        this.snd.boing();
        this.tweens.add({ targets: spr, angle: { from: -10, to: 10 }, duration: 700, yoyo: true, repeat: 4, ease: "Sine.inOut", onComplete: () => spr.setAngle(0) });
        this._persistChar(name, spr);
        return;
      }
      if (f.drop === "bounce") {
        spr.x = z.x; spr.y = z.y - z.displayHeight * 0.6;
        spr._groundY = spr.y; spr._noShadow = false;
        this.snd.boing();
        this.tweens.add({ targets: spr, y: spr.y - 120, duration: 320, yoyo: true, repeat: 3, ease: "Quad.out", onComplete: () => { spr.y = z.y - z.displayHeight * 0.6; this._persistChar(name, spr); } });
        return;
      }
      if (f.drop === "hide" && (name === "flofy" || name === "pet" || name === "rainbow")) {
        spr.x = z.x; spr.y = z.y - 14;
        spr._noShadow = true;
        this.snd.giggle();
        this._floatEmoji(z.x, z.y - z.displayHeight - 10, "❤");
        this._persistChar(name, spr);
        return;
      }
      if (f.drop === "bathe") {
        // BAÑO: el personaje se mete en la tina, tras el frente de la bañera
        // (piernas ocultas). Los juguetes pequeños (Flofy, Rainbow, el
        // cachorro) van MÁS ALTOS o la tina se los tragaba enteros: así asoman
        // de la espuma de cintura para arriba, como un peluche en su baño.
        const small = spr.displayHeight <= z.displayHeight * 0.8;
        spr.x = z.x; spr.y = z.y - z.displayHeight * (small ? 0.68 : 0.42);
        spr.setAngle(0);
        spr._bathing = true;
        spr._noShadow = true;
        this.layerRoom.add(spr);
        this.layerRoom.moveTo(spr, Math.max(0, this.layerRoom.getIndex(z)));
        this.snd.splash();
        this._floatEmoji(z.x, z.y - z.displayHeight - 10, "🛁");
        for (let i = 0; i < 8; i++) {
          const b = this.add.image(z.x + Phaser.Math.Between(-40, 40), z.y - z.displayHeight * 0.4, "bubble").setDepth(41);
          this.tweens.add({ targets: b, y: b.y - Phaser.Math.Between(40, 90), alpha: 0, duration: 900, delay: i * 80, onComplete: () => b.destroy() });
        }
        this._persistChar(name, spr);
        return;
      }
      // "sit" = sofá/alfombra/picnic/arenero · "table" = COMEDOR (encargo
      // fundadora: "que haya un comedor donde se puedan sentar")
      if (f.drop === "sit" || f.drop === "table") {
        this._sitAt(spr, z, f.drop === "table" ? 0.54 : (f.seat ?? 0.4), x);
        return;
      }
      // LAVARSE LAS MANOS (ajuste profundo): suéltalo junto al lavamanos —
      // el agua corre de verdad, frota con burbujas y queda limpio y feliz.
      if (f.drop === "wash") {
        spr.x = z.x - z.displayWidth * 0.46;
        spr.y = CHAR_MAX_Y - 4;
        spr.setAngle(0); spr._groundY = spr.y; spr._noShadow = false;
        const wasOn = this._sinkOn;
        if (!wasOn) { this._sinkOn = true; this.snd.waterOn(); this._waterSpr = z; this._showWater(z); }
        const hx = z.x - z.displayWidth * 0.12, hy = z.y - z.displayHeight * 0.42;
        for (let i = 0; i < 10; i++) {
          const b = this.add.image(hx + Phaser.Math.Between(-16, 16), hy + Phaser.Math.Between(-8, 8), "bubble").setDepth(41).setScale(0.55);
          this.tweens.add({ targets: b, y: b.y - Phaser.Math.Between(24, 60), alpha: 0, duration: 800, delay: i * 90, onComplete: () => b.destroy() });
        }
        this.tweens.add({ targets: spr, angle: 4, duration: 140, yoyo: true, repeat: 5, onComplete: () => spr.setAngle(0) });
        this.snd.splash();
        this._floatEmoji(z.x, z.y - z.displayHeight - 10, "🧼");
        this.time.delayedCall(1700, () => {
          if (!spr.active) return;
          this._sparkle(spr.x, spr.y - spr.displayHeight * 0.6, 6);
          if (!wasOn && this._sinkOn) { this._sinkOn = false; this.snd.waterOff(); this._hideWater(); }
        });
        this._persistChar(name, spr);
        return;
      }
    }
    spr.setAngle(0);
    spr.y = Phaser.Math.Clamp(y, CHAR_MIN_Y, CHAR_MAX_Y);
    spr._groundY = spr.y;
    spr._noShadow = false;
    this.snd.drop();
    this._dust(spr.x, spr.y);
    this._persistChar(name, spr);
  }

  // SENTARSE: el personaje queda en el asiento con las piernas ocultas tras el
  // mueble (se mete en el contenedor justo debajo del asiento para el orden de
  // dibujo). Los bajitos (Flofy, Rainbow) delante, sobre el cojín, para verlos.
  _sitAt(spr, z, seat, x) {
    const seatY = z.y - z.displayHeight * seat;
    spr.x = Phaser.Math.Clamp(x, z.x - z.displayWidth * 0.32, z.x + z.displayWidth * 0.32);
    spr.setAngle(0);
    if (spr.displayHeight > z.displayHeight * 0.8) {
      spr.y = seatY + spr.displayHeight * 0.06;
      this.layerRoom.add(spr);
      this.layerRoom.moveTo(spr, Math.max(0, this.layerRoom.getIndex(z)));
    } else {
      spr.y = seatY + spr.displayHeight * 0.02;
    }
    this.snd.giggle();
    this._floatEmoji(spr.x, seatY - spr.displayHeight * 0.9, "🙂");
    this.tweens.add({ targets: spr, y: spr.y - 5, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    spr._sitting = true;
    spr._noShadow = true;
    this._persistChar(spr._char, spr);
  }

  _persistChar(name, spr) {
    const st = Save.get().chars[name];
    if (!st) return;
    st.room = this.room; st.x = Math.round(spr.x); st.y = Math.round(spr.y);
    st.sitting = !!spr._sitting; // pose sentado persiste (bug QA #4)
    Save.persist();
  }

  /* ============================ PICTURES ============================ */

  _hangPainting(data, sound = true) {
    const spr = this.add.image(data.x, data.y, data.art).setDepth(6).setScale(1.15);
    spr.setInteractive({ useHandCursor: true, draggable: true });
    spr._painting = data;
    this.paintSprites.push(spr);
    if (sound) { this.snd.hang(); this._sparkle(data.x, data.y, 6); }
    return spr;
  }

  _cycleArt(spr) {
    const d = spr._painting;
    const ix = ARTWORKS.indexOf(d.art);
    d.art = ARTWORKS[(ix + 1) % ARTWORKS.length];
    spr.setTexture(d.art);
    this.snd.pick();
    this.tweens.add({ targets: spr, scale: { from: 0.9, to: 1.15 }, duration: 170, ease: "Back.out" });
    Save.persist();
  }

  _dropPainting(spr, x, y) {
    const d = spr._painting;
    const wallLimit = ROOMS[this.room].outdoor ? 470 : WALL_BOT - 40;
    if (y < wallLimit && y > 70) {
      d.x = Math.round(x); d.y = Math.round(y); d.room = this.room;
      this.snd.hang();
      Save.persist();
    } else {
      Save.get().paintings = Save.get().paintings.filter((p) => p !== d);
      Save.persist();
      this._sparkle(x, y, 8);
      this.snd.splash();
      this.paintSprites = this.paintSprites.filter((p) => p !== spr);
      spr.destroy();
    }
  }

  /* ============================ HUD + MODES ============================ */

  _buildHUD() {
    const mkIcon = (x, emoji, cb) => {
      const btn = this.add.image(x, 54, "btn").setDepth(60).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, 54, emoji, { fontSize: "38px" }).setOrigin(0.5).setDepth(61);
      btn.on("pointerdown", cb);
      return { btn, t };
    };
    let x = 60;
    if (window.self === window.top) { mkIcon(x, "🏠", () => { window.location.href = "/"; }); x += 92; }
    this._paintBtn = mkIcon(x, "🖌️", () => this._toggleMode("paint")); x += 92;
    this._frameBtn = mkIcon(x, "🖼️", () => this._toggleMode("frames")); x += 92;
    this._dressBtn = mkIcon(x, "👗", () => this._toggleMode("dress")); x += 92;
    // HORA y CLIMA (encargo fundadora): se ven por las ventanas, el balcón y
    // el patio. Cada botón va pasando por sus opciones.
    this._timeBtn = mkIcon(x, TIME_ICON[Save.get().sky], () => this._cycleSky()); x += 92;
    this._weatherBtn = mkIcon(x, WEATHER_ICON[Save.get().weather], () => this._cycleWeather()); x += 92;
    const mute = mkIcon(W - 60, this.snd.muted ? "🔇" : "🔊", () => {
      this.snd.setMuted(!this.snd.muted);
      if (!this.snd.muted) this.snd.startMusic();
      mute.t.setText(this.snd.muted ? "🔇" : "🔊");
    });

    // room arrows
    const mkArrow = (x, dir, ch) => {
      const a = this.add.text(x, H / 2, ch, {
        fontFamily: FONT, fontSize: "64px", color: "#ffffff", fontStyle: "bold", stroke: "#a05a78", strokeThickness: 8,
      }).setOrigin(0.5).setDepth(60).setAlpha(0.85).setInteractive({ useHandCursor: true });
      a.on("pointerdown", () => this._switchRoom(dir));
      this.tweens.add({ targets: a, x: x + dir * 6, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    };
    mkArrow(38, -1, "‹");
    mkArrow(W - 38, 1, "›");

    // room dots
    this._dots = ROOM_ORDER.map((r, i) =>
      this.add.circle(W / 2 - (ROOM_ORDER.length - 1) * 14 + i * 28, H - 24, 7, 0xffffff, 0.95)
        .setStrokeStyle(2, 0xa05a78).setDepth(60)
    );
    this._refreshDots();
  }

  _refreshDots() {
    const ix = ROOM_ORDER.indexOf(this.room);
    this._dots.forEach((d, i) => d.setFillStyle(i === ix ? 0xff6b96 : 0xffffff, 0.95));
  }

  _toggleMode(mode) {
    this.mode = this.mode === mode ? "none" : mode;
    this.snd.ui();
    if (this._modeUI) { this._modeUI.destroy(true); this._modeUI = null; }
    if (this.mode === "paint") this._refreshPaintUI();
    if (this.mode === "frames") this._buildFramesUI();
    if (this.mode === "dress") this._buildDressUI();
  }

  /* ==================== HORA DEL DÍA + CLIMA ====================
     Encargo fundadora: "que por las ventanas, por el balcón y por el patio se
     puedan ver los cambios de las horas del día y el clima que pueda cambiar
     el jugador". */

  _cycleSky() {
    const sv = Save.get();
    sv.sky = TIMES[(TIMES.indexOf(sv.sky) + 1) % TIMES.length];
    Save.persist();
    this.snd.chime();
    this._timeBtn.t.setText(TIME_ICON[sv.sky]);
    this._applySky(true);
  }

  _cycleWeather() {
    const sv = Save.get();
    sv.weather = WEATHERS[(WEATHERS.indexOf(sv.weather) + 1) % WEATHERS.length];
    Save.persist();
    this.snd.chime();
    this._weatherBtn.t.setText(WEATHER_ICON[sv.weather]);
    this._applySky(true);
    this._applyWeather();
  }

  // Colores de la hora, "lavados" por el clima que haga.
  _skyColors() {
    const sv = Save.get();
    const s = { ...(SKY[sv.sky] || SKY.day) };
    const wash = WEATHER_WASH[sv.weather];
    if (wash) {
      const [col, t] = wash;
      s.win = mix(s.win, col, t);
      s.gTop = mix(s.gTop, col, t);
      s.gBot = mix(s.gBot, col, t);
      s.city = mix(s.city, col, t * 0.7);
      s.hideOrb = true; // con nubes no se ve ni el sol ni la luna
    }
    return s;
  }

  _applySky(animate = true) {
    const s = this._skyColors();
    const night = Save.get().sky === "night";

    this._skyOverlay.setFillStyle(s.ov, this._skyOverlay.fillAlpha);
    this.tweens.add({ targets: this._skyOverlay, fillAlpha: s.ovA, duration: animate ? 600 : 0 });

    if (this._winSky) {
      this._winSky.setTint(s.win);
      this._winOrb.setTexture(s.orb).setVisible(!s.hideOrb);
    }
    if (this._gardenSky) {
      this._gardenSky.clear();
      this._gardenSky.fillGradientStyle(s.gTop, s.gTop, s.gBot, s.gBot, 1);
      this._gardenSky.fillRect(0, 0, W, 340);
    }
    if (this._cityImg) this._cityImg.setTint(s.city);

    // sol/luna + estrellas: solo fuera (dentro se ven por la ventana)
    this._skyFx.forEach((o) => o.destroy());
    this._skyFx = [];
    if (!ROOMS[this.room].outdoor) return;
    if (!s.hideOrb) {
      // fuera del rincón del botón de sonido (arriba a la derecha)
      const orb = this.add.image(1000, 118, s.orb).setDepth(2).setScale(1.5);
      const halo = this.add.image(1000, 118, "glowdisc").setDepth(2).setScale(2.2)
        .setTint(night ? 0xdfe8ff : 0xffe27a).setAlpha(0.75);
      this._skyFx.push(halo, orb);
    }
    if (night && !s.hideOrb) { // con nubes/lluvia/nieve no se ven las estrellas
      for (let i = 0; i < 26; i++) {
        const st = this.add.image(Phaser.Math.Between(30, W - 30), Phaser.Math.Between(30, 380), "sparkle")
          .setDepth(36).setTint(0xfff2b0).setScale(Phaser.Math.FloatBetween(0.4, 0.9));
        this.tweens.add({ targets: st, alpha: { from: 0.3, to: 0.9 }, duration: Phaser.Math.Between(800, 1600), yoyo: true, repeat: -1 });
        this._skyFx.push(st);
      }
    }
  }

  _applyWeather() {
    this._weatherFx.forEach((o) => o.destroy());
    this._weatherFx = [];
    const w = Save.get().weather;
    if (w === "clear") return;
    const outdoor = ROOMS[this.room].outdoor;
    // fuera: cae sobre toda la pantalla. Dentro: SOLO dentro de la ventana
    // (sin recorte: la vida de cada gota se calcula para morir en el marco).
    const zone = outdoor ? new Phaser.Geom.Rectangle(-40, -30, W + 80, H) : this._winRect;
    if (!zone) return;
    const depth = outdoor ? 30 : 1;

    if (w === "cloudy") {
      if (!outdoor) return; // dentro basta con el cielo gris de la ventana
      for (let i = 0; i < 4; i++) {
        const c = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(50, 180), "cloud")
          .setDepth(2).setScale(Phaser.Math.FloatBetween(0.7, 1.3)).setAlpha(0.9).setTint(0xdfe6ee);
        this.tweens.add({
          targets: c, x: c.x + Phaser.Math.Between(120, 260), duration: Phaser.Math.Between(16000, 26000),
          yoyo: true, repeat: -1, ease: "Sine.inOut",
        });
        this._weatherFx.push(c);
      }
      return;
    }

    const cfg = w === "rain"
      ? {
        key: "raindrop", tint: 0xbfe8ff,
        speedY: { min: 560, max: 780 }, speedX: { min: -70, max: -20 },
        scaleX: outdoor ? 1 : 0.6, scaleY: outdoor ? { min: 1, max: 2 } : 0.7,
        alpha: { start: 0.8, end: 0.3 },
        // dentro no hay recorte: cada gota vive lo justo para morir en el marco
        lifespan: outdoor ? 1300 : (zone.height / 780) * 1000,
        frequency: outdoor ? 24 : 90, quantity: outdoor ? 3 : 1,
      }
      : {
        key: "snowflake", tint: 0xffffff,
        speedY: { min: 45, max: 95 }, speedX: { min: -30, max: 30 },
        scale: outdoor ? { min: 0.5, max: 1.1 } : { min: 0.3, max: 0.6 },
        alpha: { start: 0.95, end: 0.7 },
        lifespan: outdoor ? 8000 : (zone.height / 95) * 1000,
        frequency: outdoor ? 60 : 260, quantity: 1,
      };

    const em = this.add.particles(0, 0, cfg.key, {
      x: { min: zone.x, max: zone.x + zone.width },
      y: zone.y,
      lifespan: cfg.lifespan,
      speedX: cfg.speedX, speedY: cfg.speedY,
      scale: cfg.scale, scaleX: cfg.scaleX, scaleY: cfg.scaleY,
      alpha: cfg.alpha, tint: cfg.tint,
      frequency: cfg.frequency, quantity: cfg.quantity,
      blendMode: "NORMAL",
    });
    if (outdoor) em.setDepth(depth);
    else this.layerWall.addAt(em, this.layerWall.getIndex(this._winFrame)); // bajo el marco
    this._weatherFx.push(em);
  }

  _refreshPaintUI() {
    if (this._modeUI) this._modeUI.destroy(true);
    const c = this.add.container(0, 0).setDepth(70);
    this._modeUI = c;
    const bar = this.add.rectangle(W / 2, H - 74, 900, 116, 0xffffff, 0.94).setStrokeStyle(4, 0xffb3cd);
    c.add(bar);
    PAINTS.forEach((col, i) => {
      const b = this.add.circle(W / 2 - 350 + i * 62, H - 92, 24, col).setStrokeStyle(3, 0xa05a78, 0.6)
        .setInteractive({ useHandCursor: true });
      b.on("pointerdown", () => this._applyPaint(col, null));
      c.add(b);
    });
    // patrones: solo en paredes de verdad (la valla y la terraza son lisas)
    if (this.wallRect && this.patternSpr) {
      PATTERNS.forEach((pat, i) => {
        const x = W / 2 - 330 + i * 180;
        const bg = this.add.rectangle(x, H - 38, 158, 50, 0xffeef5).setStrokeStyle(2, 0xffb3cd)
          .setInteractive({ useHandCursor: true });
        const label = this.add.text(x, H - 38, pat === "none" ? "PLAIN" : pat.toUpperCase(), {
          fontFamily: FONT, fontSize: "17px", color: "#a05a78", fontStyle: "bold",
        }).setOrigin(0.5);
        bg.on("pointerdown", () => this._applyPaint(null, pat));
        c.add(bg); c.add(label);
      });
    }
  }

  _applyPaint(color, pattern) {
    const cfg = Save.get().rooms[this.room];
    if (color !== null) cfg.wall = color;
    if (pattern !== null) cfg.pattern = pattern;
    Save.persist();
    this.snd.splash();
    if (this._deckPaint) this._deckPaint.setFillStyle(cfg.wall, 0.34);
    else if (ROOMS[this.room].outdoor) this.wallRect.setTint(cfg.wall);
    else {
      this.wallRect.setFillStyle(cfg.wall);
      this.patternSpr.setVisible(cfg.pattern !== "none");
      if (cfg.pattern !== "none") this.patternSpr.setTexture("pat-" + cfg.pattern);
    }
    for (let i = 0; i < 10; i++) {
      const p = this.add.image(Phaser.Math.Between(200, W - 200), Phaser.Math.Between(60, 420), "px")
        .setDepth(41).setTint(color ?? cfg.wall).setScale(Phaser.Math.FloatBetween(2, 5));
      this.tweens.add({ targets: p, y: p.y + 40, alpha: 0, duration: 500, delay: i * 30, onComplete: () => p.destroy() });
    }
  }

  _buildFramesUI() {
    const c = this.add.container(0, 0).setDepth(70);
    this._modeUI = c;
    const bar = this.add.rectangle(W / 2, H - 84, 1150, 140, 0xffffff, 0.94).setStrokeStyle(4, 0xffb3cd);
    c.add(bar);
    c.add(this.add.text(W / 2, H - 144, "Drag a picture to the wall · tap a hung one to change it", {
      fontFamily: FONT, fontSize: "15px", color: "#b98aa0",
    }).setOrigin(0.5));
    ARTWORKS.forEach((art, i) => {
      const thumb = this.add.image(W / 2 - 490 + i * 140, H - 78, art).setScale(0.95)
        .setInteractive({ useHandCursor: true, draggable: true });
      thumb._drawerArt = art;
      c.add(thumb);
    });
  }

  // Vestidor: arrastra un accesorio sobre alguien para ponérselo; el mismo
  // accesorio otra vez se lo quita. + botón reset.
  _buildDressUI() {
    const c = this.add.container(0, 0).setDepth(70);
    this._modeUI = c;
    const bar = this.add.rectangle(W / 2, H - 84, 1000, 140, 0xffffff, 0.94).setStrokeStyle(4, 0xffb3cd);
    c.add(bar);
    c.add(this.add.text(W / 2, H - 144, "Drag an accessory onto anyone · drag it off to remove", {
      fontFamily: FONT, fontSize: "15px", color: "#b98aa0",
    }).setOrigin(0.5));
    const keys = Object.keys(ACCESSORIES);
    keys.forEach((key, i) => {
      const img = this.add.image(W / 2 - 330 + i * 150, H - 78, key)
        .setInteractive({ useHandCursor: true, draggable: true });
      img.setScale(Math.min(1, 90 / img.height));
      img._drawerAcc = key;
      c.add(img);
    });
    const reset = this.add.text(W - 150, H - 84, "↺ RESET", {
      fontFamily: FONT, fontSize: "18px", color: "#ffffff", fontStyle: "bold", backgroundColor: "#e08aa8",
    }).setOrigin(0.5).setPadding(16, 10, 16, 10).setInteractive({ useHandCursor: true });
    reset.on("pointerdown", () => this._confirmReset());
    c.add(reset);
  }

  _confirmReset() {
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x14102b, 0.6).setDepth(95).setInteractive();
    const box = this.add.container(0, 0).setDepth(96);
    box.add(this.add.text(W / 2, H / 2 - 40, "Start the house fresh?", { fontFamily: FONT, fontSize: "30px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5));
    const yes = this.add.text(W / 2 - 90, H / 2 + 30, "YES", { fontFamily: FONT, fontSize: "24px", color: "#fff", fontStyle: "bold", backgroundColor: "#e08aa8" }).setOrigin(0.5).setPadding(26, 12, 26, 12).setInteractive({ useHandCursor: true });
    const no = this.add.text(W / 2 + 90, H / 2 + 30, "NO", { fontFamily: FONT, fontSize: "24px", color: "#a05a78", fontStyle: "bold", backgroundColor: "#ffffff" }).setOrigin(0.5).setPadding(26, 12, 26, 12).setInteractive({ useHandCursor: true });
    yes.on("pointerdown", () => { Save.reset(); this.scene.restart(); });
    no.on("pointerdown", () => { veil.destroy(); box.destroy(true); });
    box.add(yes); box.add(no);
  }

  /* ============================ DRESS-UP / BIRTHDAY ============================ */

  _equipAccessory(key, x, y) {
    for (const [name, spr] of Object.entries(this.chars)) {
      const r = new Phaser.Geom.Rectangle(spr.x - spr.displayWidth / 2, spr.y - spr.displayHeight, spr.displayWidth, spr.displayHeight);
      if (!r.contains(x, y)) continue;
      const worn = Save.get().worn[name] || (Save.get().worn[name] = []);
      const i = worn.indexOf(key);
      if (i >= 0) worn.splice(i, 1); else worn.push(key);
      Save.persist();
      this._drawAccessories(spr);
      this.snd.pick();
      this._sparkle(spr.x, spr.y - spr.displayHeight, 6);
      return;
    }
    this.snd.drop();
  }

  _birthday(x, y) {
    this.snd.fanfare();
    const cake = this.add.text(x, y - 34, "🎂", { fontSize: "40px" }).setOrigin(0.5).setDepth(42);
    this.tweens.add({ targets: cake, y: cake.y - 10, scale: 1.15, duration: 500, yoyo: true, repeat: 2 });
    this.time.delayedCall(1900, () => cake.destroy());
    this._floatEmoji(x, y - 90, "🎉");
    Object.values(this.chars).slice(0, 3).forEach((c, i) => {
      if (c._sitting || c._bathing) return;
      this.tweens.add({
        targets: c, x: Phaser.Math.Clamp(x + (i - 1) * 130, 90, W - 90), duration: 550, ease: "Sine.inOut",
        onComplete: () => { this._charTap(c); this._persistChar(c._char, c); },
      });
    });
    this._confetti();
  }

  _confetti() {
    for (let i = 0; i < 44; i++) {
      const p = this.add.image(Phaser.Math.Between(0, W), -20, "px").setDepth(43)
        .setTint(Phaser.Math.RND.pick([0xff6b96, 0xffd94e, 0x7fd4ff, 0xa2dd7e, 0xd8c3f0]))
        .setScale(Phaser.Math.FloatBetween(2, 4)).setAngle(Math.random() * 360);
      this.tweens.add({
        targets: p, y: H + 30, x: p.x + Phaser.Math.Between(-80, 80), angle: p.angle + Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(1600, 2800), delay: Math.random() * 400, onComplete: () => p.destroy(),
      });
    }
  }

  /* ============================ DRAG WIRING ============================ */

  _bindDrag() {
    this.input.on("dragstart", (p, obj) => {
      obj._dragMoved = false;
      obj._downX = p.x; obj._downY = p.y; // para el umbral tap-vs-arrastre
      if (obj._furn) {
        if (this.mode !== "none") { obj._noDrag = true; return; }
        obj._noDrag = false;
        obj._baseScale = obj._baseScale || obj.scale;
        // MUEBLES FIJOS (ajuste profundo): no se levantan ni suben de plano —
        // el gesto solo puede acabar en tap.
        if (!obj._furn.movable) return;
        this.snd.pick();
        this.layerRoom.bringToTop(obj);
        this.tweens.add({ targets: obj, scale: obj._baseScale * 1.04, duration: 110 });
      } else if (obj._char || obj._item) {
        this.snd.pick();
        this.tweens.killTweensOf(obj);
        obj._sitting = false;
        obj._noShadow = false;
        if (obj.parentContainer) { obj.parentContainer.remove(obj); this.add.existing(obj); }
        obj.setDepth(34);
        this.tweens.add({ targets: obj, angle: obj._char ? 4 : 8, scale: obj._baseScale * 1.06, duration: 120 });
      } else if (obj._drawerArt) {
        const data = { room: this.room, x: p.worldX, y: p.worldY, art: obj._drawerArt };
        Save.get().paintings.push(data);
        obj._spawned = this._hangPainting(data, false);
        obj._spawned.setDepth(75);
        this.snd.pick();
      } else if (obj._drawerAcc) {
        obj._accGhost = this.add.image(p.x, p.y, obj._drawerAcc).setDepth(80);
        obj._accGhost.setScale(Math.min(1.1, 100 / obj._accGhost.height));
        this.snd.pick();
      } else if (obj._painting) {
        obj.setDepth(75);
      }
    });
    this.input.on("drag", (p, obj, dx, dy) => {
      if (obj._noDrag) return;
      // los muebles fijos NO se mueven (una cocina no se arrastra por la casa)
      if (obj._furn && !obj._furn.movable) return;
      // Umbral de 10px (bug QA #1): dedos de niña dan micro-movimiento; sin esto
      // un TOQUE para que la tele brille se leía como arrastre de 2px y no
      // disparaba la reacción. Por debajo del umbral = sigue siendo un tap.
      if (!obj._dragMoved && Math.hypot(p.x - obj._downX, p.y - obj._downY) < 10) return;
      if (!obj._dragMoved && obj._furn) this._closeExtras(obj); // mover el horno/la tina lo cierra
      obj._dragMoved = true;
      if (obj._drawerArt && obj._spawned) { obj._spawned.x = dx; obj._spawned.y = dy; return; }
      if (obj._drawerAcc && obj._accGhost) { obj._accGhost.x = p.x; obj._accGhost.y = p.y; return; }
      obj.x = dx; obj.y = dy;
      if (obj._furn && obj._glow) { obj._glow.x = dx; obj._glow.y = dy - obj.displayHeight * 0.72; }
    });
    this.input.on("dragend", (p, obj) => {
      if (obj._furn) {
        if (obj._noDrag) return;
        const f = obj._furn;
        this.tweens.add({ targets: obj, scale: obj._baseScale, duration: 110 });
        if (!obj._dragMoved) { if (f.tap) this._tapFurniture(obj, f); return; }
        obj.x = Phaser.Math.Clamp(obj.x, 40, W - 40);
        if (f.wall) obj.y = Phaser.Math.Clamp(obj.y, 150, WALL_BOT - 10);
        else obj.y = Phaser.Math.Clamp(obj.y, FLOOR_Y + 24, H - 6);
        if (obj._glow) { obj._glow.x = obj.x; obj._glow.y = obj.y - obj.displayHeight * 0.72; }
        if (f.key === "ball") { this.snd.boing(); this.tweens.add({ targets: obj, y: obj.y - 60, duration: 240, yoyo: true, ease: "Quad.out" }); }
        else this.snd.drop();
        this._dust(obj.x, obj.y);
        const cfg = Save.get().rooms[this.room];
        cfg.moved[f.key] = { x: Math.round(obj.x), y: Math.round(obj.y) };
        Save.persist();
        this.layerRoom.sort("y");
        return;
      }
      if (obj._drawerArt && obj._spawned) {
        const s = obj._spawned;
        obj._spawned = null;
        s.setDepth(6);
        this._dropPainting(s, s.x, s.y);
        return;
      }
      if (obj._drawerAcc && obj._accGhost) {
        const gx = obj._accGhost.x, gy = obj._accGhost.y;
        obj._accGhost.destroy(); obj._accGhost = null;
        if (obj._dragMoved) this._equipAccessory(obj._drawerAcc, gx, gy);
        return;
      }
      if (obj._char) {
        this.tweens.add({ targets: obj, scale: obj._baseScale, duration: 120 });
        obj.setDepth(14);
        if (!obj._dragMoved) { this._charTap(obj); obj.setAngle(0); return; }
        obj.setAngle(0);
        this._dropChar(obj, obj.x, obj.y);
        return;
      }
      if (obj._item) {
        this.tweens.add({ targets: obj, scale: obj._baseScale, angle: 0, duration: 120 });
        obj.setDepth(16);
        this._dropItem(obj, obj.x, obj.y);
        return;
      }
      if (obj._painting) {
        obj.setDepth(6);
        if (!obj._dragMoved) { this._cycleArt(obj); return; }
        this._dropPainting(obj, obj.x, obj.y);
      }
    });
  }

  /* ============================ FX ============================ */

  _sparkle(x, y, n) {
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x + Phaser.Math.Between(-26, 26), y + Phaser.Math.Between(-20, 20), "sparkle")
        .setDepth(41).setTint(0xffd94e).setScale(Phaser.Math.FloatBetween(0.7, 1.3));
      this.tweens.add({ targets: s, y: s.y - 30, alpha: 0, angle: 90, duration: 500, delay: i * 40, onComplete: () => s.destroy() });
    }
  }
  _dust(x, y) {
    for (let i = 0; i < 4; i++) {
      const d = this.add.image(x + Phaser.Math.Between(-18, 18), y - 4, "px").setDepth(41).setTint(0xd8c9a8).setScale(2);
      this.tweens.add({ targets: d, y: d.y - 16, alpha: 0, duration: 300, onComplete: () => d.destroy() });
    }
  }
  _steam(x, y, n) {
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x + Phaser.Math.Between(-14, 14), y, "puff").setDepth(41).setAlpha(0.8).setScale(0.8);
      this.tweens.add({ targets: s, y: y - 70, alpha: 0, scale: 1.4, duration: 900, delay: i * 140, onComplete: () => s.destroy() });
    }
  }
  _floatEmoji(x, y, ch) {
    const t = this.add.text(x, y, ch, { fontSize: "30px" }).setOrigin(0.5).setDepth(41);
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  update(_, dms) {
    // los accesorios de disfraz siguen a su personaje cada frame
    for (const c of Object.values(this.chars)) if (c._acc && c._acc.length) this._posAccessories(c);
    this._syncShadows();

    // (el agua del grifo ahora la pinta _showWater: chorro + gotas propias)

    // eventos ambientales (game-director #7): el mundo se siente vivo al volver
    this._ambientT = (this._ambientT || 6) - (dms || 16) / 1000;
    if (this._ambientT <= 0) { this._ambientT = 7 + Math.random() * 8; this._ambientEvent(); }
  }

  _ambientEvent() {
    if (this.mode !== "none") return;
    const outdoor = ROOMS[this.room].outdoor;
    const bad = Save.get().weather === "rain" || Save.get().weather === "snow";
    if (outdoor && bad) return; // con lluvia/nieve los bichos no salen
    const kind = outdoor
      ? Phaser.Utils.Array.GetRandom(["butterfly", "bird", "apple"])
      : Phaser.Utils.Array.GetRandom(["butterfly", "note", "sparkle"]);
    if (kind === "butterfly" || kind === "bird") {
      const fromL = Math.random() < 0.5, y = Phaser.Math.Between(140, 420);
      const e = this.add.text(fromL ? -30 : W + 30, y, kind === "bird" ? "🐦" : "🦋", { fontSize: "30px" }).setOrigin(0.5).setDepth(42);
      this.tweens.add({ targets: e, x: fromL ? W + 40 : -40, y: y + Phaser.Math.Between(-40, 40), duration: 4200, ease: "Sine.inOut", onComplete: () => e.destroy() });
      if (kind === "bird") this.snd.giggle();
    } else if (kind === "apple") {
      const tree = this.layerRoom.list.find((s) => s._furn?.key === "tree");
      if (tree) {
        const a = this.add.image(tree.x + Phaser.Math.Between(-60, 60), tree.y - tree.displayHeight * 0.5, "apple").setDepth(16).setScale(0.5);
        this.tweens.add({ targets: a, y: CHAR_MAX_Y, duration: 500, ease: "Bounce.out", onComplete: () => this.time.delayedCall(2500, () => a.destroy()) });
      }
    } else {
      this._sparkle(Phaser.Math.Between(200, W - 200), Phaser.Math.Between(120, 360), 5);
    }
  }
}
