// ELI'S WORLD — the house. A cozy dollhouse sandbox:
//   · move through 4 rooms (arrows; drag a family member onto an arrow to
//     send them next door)
//   · PAINT the walls (10 colors × 4 patterns; the garden paints its fence)
//   · hang PICTURES from the art drawer, move them, tap to change artwork,
//     drag them off the wall to remove
//   · KITCHEN play: open the fridge, cook on the pan (bread→toast, egg→fried
//     egg), blend fruit into juice, run the tap, feed everyone
// Everything persists (walls, pictures, where the family is standing).
// No goals, no fail state — Elizabeth directs the story.

import {
  W, H, WALL_TOP, WALL_BOT, FLOOR_Y, CHAR_MIN_Y, CHAR_MAX_Y,
  ROOM_ORDER, PAINTS, PATTERNS, ARTWORKS,
} from "../const.js";
import { ROOMS, CHAR_START, FOODS, FRIDGE_MENU } from "../data/rooms.js";
import { Save } from "../utils/Save.js";
import { Sound } from "../utils/Sound.js";

const FONT = "'Segoe UI', system-ui, sans-serif";
const ROOM_LABEL = { living: "LIVING ROOM", kitchen: "KITCHEN", bedroom: "BEDROOM", garden: "GARDEN" };

export class HouseScene extends Phaser.Scene {
  constructor() { super("House"); }

  create() {
    window.__ew = this;
    this.snd = new Sound();
    this.snd.resume();
    this.snd.startMusic();
    this.events.once("shutdown", () => { this.snd.stopMusic(); this.snd.waterOff(); });

    this.room = "living";
    this.mode = "none";           // none | paint | frames
    this.items = [];              // draggable foods/spawns in the CURRENT room
    this.paintSprites = [];       // hung pictures in the CURRENT room
    this.chars = {};              // char sprites present in the CURRENT room
    this._glowStates = {};

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
    this.layerRoom = this.add.container(0, 0).setDepth(5);
    this.layerFx = this.add.container(0, 0).setDepth(40);
  }

  _clearRoom() {
    this.snd.waterOff();
    // Matar los tweens ANTES de destruir (Phaser no los cancela al destruir el
    // objeto): el tween infinito de "sentarse" (repeat:-1) seguía vivo sobre el
    // sprite muerto → fuga de memoria/CPU en sesiones largas (bug QA B3).
    this.layerRoom.list.forEach((o) => this.tweens.killTweensOf(o));
    this.layerWall.removeAll(true);
    this.layerRoom.removeAll(true);
    this.items.forEach((i) => { this.tweens.killTweensOf(i); i.destroy(); });
    this.items = [];
    this.paintSprites.forEach((p) => { this.tweens.killTweensOf(p); p.destroy(); });
    this.paintSprites = [];
    Object.values(this.chars).forEach((c) => { this.tweens.killTweensOf(c); c.destroy(); });
    this.chars = {};
    this._glowStates = {};
    this._dropZones = [];
    this._fridgeOpen = false;
    this._sinkOn = false;
  }

  _buildRoom() {
    this._clearRoom();
    const def = ROOMS[this.room];
    const cfg = Save.get().rooms[this.room];
    const garden = this.room === "garden";

    // ---- wall / sky ----
    if (garden) {
      const sky = this.add.graphics();
      sky.fillGradientStyle(0x9fd8ff, 0x9fd8ff, 0xdff2ff, 0xdff2ff, 1);
      sky.fillRect(0, 0, W, 340);
      this.layerWall.add(sky);
      const sun = this.add.image(1120, 90, "glowdisc").setScale(2.2).setTint(0xffe27a);
      this.layerWall.add(sun);
      // paintable fence
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
      // baseboard + window
      const base = this.add.rectangle(W / 2, WALL_BOT - 8, W, 16, 0xffffff, 0.55);
      this.layerWall.add(base);
      const win = this.add.image(this.room === "kitchen" ? 260 : 1080, 250, "window").setScale(1.35);
      this.layerWall.add(win);
    }

    // ---- floor ----
    const floorKey = { wood: "floor-wood", tiles: "floor-tiles", grass: "floor-grass" }[def.floor];
    const floor = this.add.tileSprite(W / 2, (FLOOR_Y + H) / 2, W, H - FLOOR_Y, floorKey);
    this.layerWall.add(floor);

    // ---- furniture (TODO se puede mover — encargo fundadora) ----
    const moved = Save.get().rooms[this.room].moved || {};
    for (const f of def.furniture) {
      const pos = moved[f.key] || { x: f.x, y: f.y };
      const spr = this.add.image(pos.x, pos.y, f.key).setOrigin(0.5, 1);
      spr.setScale(f.h / spr.height);
      this.layerRoom.add(spr);
      spr._furn = f;
      spr.setInteractive({ useHandCursor: true, draggable: true });
      if (f.drop) this._dropZones.push({ spr, f });
      if (f.key === "fridge") this._fridgeSpr = spr;
    }
    this.layerRoom.sort("y");

    // ---- hung pictures ----
    for (const p of Save.get().paintings.filter((p) => p.room === this.room)) this._hangPainting(p, false);

    // ---- family in this room ----
    for (const [name, st] of Object.entries(Save.get().chars)) {
      if (st.room === this.room) this._spawnChar(name, st.x, st.y || CHAR_MAX_Y - 20);
    }

    // room label (small, fades)
    const label = this.add.text(W / 2, 548, ROOM_LABEL[this.room], {
      fontFamily: FONT, fontSize: "20px", color: "#ffffff", fontStyle: "bold", stroke: "#a05a78", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(45);
    this.tweens.add({ targets: label, alpha: 0, delay: 1400, duration: 500, onComplete: () => label.destroy() });

    if (this.mode === "paint") this._refreshPaintUI();
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

  /* ============================ CHARACTERS ============================ */

  _spawnChar(name, x, y) {
    const spr = this.add.image(x, Phaser.Math.Clamp(y, CHAR_MIN_Y, CHAR_MAX_Y), name).setOrigin(0.5, 1);
    spr.setScale(this.registry.get(`scale:${name}`) || 0.2);
    spr.setDepth(14);
    spr.setInteractive({ useHandCursor: true, draggable: true });
    spr._char = name;
    spr._baseScale = spr.scale;
    this.chars[name] = spr;
    return spr;
  }

  _charTap(spr) {
    this.snd.giggle();
    this.tweens.add({ targets: spr, y: spr.y - 46, duration: 190, yoyo: true, ease: "Quad.out" });
    for (let i = 0; i < 4; i++) {
      const h = this.add.image(spr.x + Phaser.Math.Between(-30, 30), spr.y - spr.displayHeight - 8, "heart")
        .setDepth(41).setScale(0.8);
      this.tweens.add({ targets: h, y: h.y - 50, alpha: 0, duration: 700, delay: i * 90, onComplete: () => h.destroy() });
    }
  }

  _sendCharTo(name, dir) {
    const st = Save.get().chars[name];
    const ix = ROOM_ORDER.indexOf(this.room);
    const next = ROOM_ORDER[Phaser.Math.Wrap(ix + dir, 0, ROOM_ORDER.length)];
    st.room = next;
    st.x = dir > 0 ? 140 : W - 140;
    st.y = CHAR_MAX_Y - 20;
    Save.persist();
    const spr = this.chars[name];
    if (spr) {
      this.snd.swoosh();
      this.tweens.add({
        targets: spr, x: dir > 0 ? W + 90 : -90, duration: 240, ease: "Quad.in",
        onComplete: () => { spr.destroy(); delete this.chars[name]; },
      });
    }
  }

  /* ============================ FURNITURE TAPS ============================ */

  _tapFurniture(spr, f, p) {
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
        this.snd.fanfare();
        for (let i = 0; i < 5; i++) {
          const n = this.add.text(spr.x + Phaser.Math.Between(-20, 20), spr.y - spr.displayHeight, ["♪", "♫"][i % 2], {
            fontFamily: FONT, fontSize: "26px", color: "#ff6b96",
          }).setDepth(41);
          this.tweens.add({ targets: n, y: n.y - 80, alpha: 0, duration: 900, delay: i * 120, onComplete: () => n.destroy() });
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
          const kind = Phaser.Math.RND.pick(["apple", "banana", "orange"]);
          const it = this._spawnItem(kind, spr.x + Phaser.Math.Between(-20, 20), spr.y - spr.displayHeight - 8);
          this.tweens.add({ targets: it, y: it.y - 26, duration: 160, yoyo: true, ease: "Quad.out" });
        }
        break;
      }
      case "toybox": {
        this.snd.boing();
        const t = this.add.image(spr.x, spr.y - spr.displayHeight * 0.7, "teddy").setDepth(13);
        t.setScale(70 / t.height);
        this.tweens.add({ targets: t, y: t.y - 80, duration: 260, yoyo: true, ease: "Quad.out", onComplete: () => t.destroy() });
        this._sparkle(spr.x, spr.y - spr.displayHeight, 8);
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
      case "sink": {
        this._sinkOn = !this._sinkOn;
        if (this._sinkOn) { this.snd.waterOn(); this._waterSpr = spr; }
        else this.snd.waterOff();
        break;
      }
    }
  }

  /* ============================ ITEMS (foods) ============================ */

  _spawnItem(kind, x, y) {
    const spr = this.add.image(x, y, kind).setDepth(16);
    spr.setScale(74 / spr.height);
    spr.setInteractive({ useHandCursor: true, draggable: true });
    spr._item = kind;
    spr._baseScale = spr.scale;
    this.items.push(spr);
    this.snd.pick();
    return spr;
  }

  _removeItem(spr, poof = true) {
    if (poof) this._sparkle(spr.x, spr.y, 5);
    this.items = this.items.filter((i) => i !== spr);
    spr.destroy();
  }

  _dropItem(spr, x, y) {
    // on a character → feed
    for (const [name, c] of Object.entries(this.chars)) {
      const r = new Phaser.Geom.Rectangle(c.x - c.displayWidth / 2, c.y - c.displayHeight, c.displayWidth, c.displayHeight);
      if (r.contains(x, y)) {
        this.snd.munch();
        this._charTap(c);
        this.tweens.add({ targets: spr, scale: 0, alpha: 0, duration: 200, onComplete: () => this._removeItem(spr, false) });
        return;
      }
    }
    // on a drop-zone
    for (const { spr: z, f } of this._dropZones) {
      const r = new Phaser.Geom.Rectangle(z.x - z.displayWidth / 2, z.y - z.displayHeight, z.displayWidth, z.displayHeight);
      if (!r.contains(x, y)) continue;
      if (f.drop === "cook") {
        const cooked = FOODS[spr._item]?.cooked;
        this.snd.sizzle();
        this._steam(z.x, z.y - z.displayHeight * 0.8, 5);
        spr.x = z.x; spr.y = z.y - z.displayHeight * 0.72;
        if (cooked) {
          this.time.delayedCall(900, () => {
            if (!spr.active) return;
            spr.setTexture(cooked);
            spr._item = cooked;
            spr.setScale(74 / spr.height);
            this._sparkle(spr.x, spr.y, 6);
            this.snd.chime();
          });
        }
        return;
      }
      if (f.drop === "blend") {
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
        return;
      }
    }
    // default: settle on the floor band
    spr.y = Phaser.Math.Clamp(y, CHAR_MIN_Y - 20, CHAR_MAX_Y);
    this.snd.drop();
  }

  _dropChar(spr, x, y) {
    const name = spr._char;
    // arrows → next room
    if (x < 80) { this._sendCharTo(name, -1); return; }
    if (x > W - 80) { this._sendCharTo(name, 1); return; }
    // furniture reactions
    for (const { spr: z, f } of this._dropZones) {
      const r = new Phaser.Geom.Rectangle(z.x - z.displayWidth / 2, z.y - z.displayHeight, z.displayWidth, z.displayHeight);
      if (!r.contains(x, y)) continue;
      if (f.drop === "lay") {
        spr.x = z.x; spr.y = z.y - z.displayHeight * 0.34;
        spr.setAngle(-84);
        this.snd.zzz();
        this._floatEmoji(z.x, z.y - z.displayHeight - 16, "💤");
        this._persistChar(name, spr);
        return;
      }
      if (f.drop === "swing") {
        spr.x = z.x; spr.y = z.y - z.displayHeight * 0.16;
        this.snd.boing();
        this.tweens.add({ targets: spr, angle: { from: -10, to: 10 }, duration: 700, yoyo: true, repeat: 4, ease: "Sine.inOut", onComplete: () => spr.setAngle(0) });
        this._persistChar(name, spr);
        return;
      }
      if (f.drop === "bounce") {
        spr.x = z.x; spr.y = z.y - z.displayHeight * 0.6;
        this.snd.boing();
        this.tweens.add({ targets: spr, y: spr.y - 120, duration: 320, yoyo: true, repeat: 3, ease: "Quad.out", onComplete: () => { spr.y = z.y - z.displayHeight * 0.6; this._persistChar(name, spr); } });
        return;
      }
      if (f.drop === "hide" && name === "flofy") {
        spr.x = z.x; spr.y = z.y - 14;
        this.snd.giggle();
        this._floatEmoji(z.x, z.y - z.displayHeight - 10, "❤");
        this._persistChar(name, spr);
        return;
      }
      if (f.drop === "sit") {
        // SENTARSE (encargo fundadora): el personaje queda sentado en el
        // asiento, con las piernas ocultas tras el mueble (se mete en el
        // contenedor justo debajo del asiento para el orden de dibujo).
        const seatY = z.y - z.displayHeight * (f.seat ?? 0.4);
        spr.x = Phaser.Math.Clamp(x, z.x - z.displayWidth * 0.32, z.x + z.displayWidth * 0.32);
        spr.setAngle(0);
        // Los altos se sientan DETRÁS del respaldo (piernas ocultas); los
        // bajitos (Flofy) delante, sobre el cojín, para que se les vea.
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
        this._persistChar(name, spr);
        return;
      }
    }
    spr.setAngle(0);
    spr.y = Phaser.Math.Clamp(y, CHAR_MIN_Y, CHAR_MAX_Y);
    this.snd.drop();
    this._dust(spr.x, spr.y);
    this._persistChar(name, spr);
  }

  _persistChar(name, spr) {
    const st = Save.get().chars[name];
    st.room = this.room; st.x = Math.round(spr.x); st.y = Math.round(spr.y);
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
    const wallLimit = this.room === "garden" ? 470 : WALL_BOT - 40;
    if (y < wallLimit && y > 70) {
      d.x = Math.round(x); d.y = Math.round(y); d.room = this.room;
      this.snd.hang();
      Save.persist();
    } else {
      // off the wall → remove
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
    if (window.self === window.top) { mkIcon(x, "🏠", () => { window.location.href = "/"; }); x += 100; }
    this._paintBtn = mkIcon(x, "🖌️", () => this._toggleMode("paint")); x += 100;
    this._frameBtn = mkIcon(x, "🖼️", () => this._toggleMode("frames")); x += 100;
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
  }

  _refreshPaintUI() {
    if (this._modeUI) this._modeUI.destroy(true);
    const c = this.add.container(0, 0).setDepth(70);
    this._modeUI = c;
    const bar = this.add.rectangle(W / 2, H - 74, 900, 116, 0xffffff, 0.94).setStrokeStyle(4, 0xffb3cd);
    c.add(bar);
    // colors
    PAINTS.forEach((col, i) => {
      const b = this.add.circle(W / 2 - 350 + i * 62, H - 92, 24, col).setStrokeStyle(3, 0xa05a78, 0.6)
        .setInteractive({ useHandCursor: true });
      b.on("pointerdown", () => this._applyPaint(col, null));
      c.add(b);
    });
    // patterns (not for the garden fence)
    if (this.room !== "garden") {
      PATTERNS.forEach((pat, i) => {
        const x = W / 2 - 330 + i * 180;
        const bg = this.add.rectangle(x, H - 40, 150, 34, 0xffeef5).setStrokeStyle(2, 0xffb3cd)
          .setInteractive({ useHandCursor: true });
        const label = this.add.text(x, H - 40, pat === "none" ? "PLAIN" : pat.toUpperCase(), {
          fontFamily: FONT, fontSize: "16px", color: "#a05a78", fontStyle: "bold",
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
    if (this.room === "garden") this.wallRect.setTint(cfg.wall);
    else {
      this.wallRect.setFillStyle(cfg.wall);
      this.patternSpr.setVisible(cfg.pattern !== "none");
      if (cfg.pattern !== "none") this.patternSpr.setTexture("pat-" + cfg.pattern);
    }
    // splash of paint drops
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

  /* ============================ DRAG WIRING ============================ */

  _bindDrag() {
    this.input.on("dragstart", (p, obj) => {
      obj._dragMoved = false;
      obj._downX = p.x; obj._downY = p.y; // para el umbral tap-vs-arrastre
      if (obj._furn) {
        if (this.mode !== "none") { obj._noDrag = true; return; }
        obj._noDrag = false;
        obj._baseScale = obj._baseScale || obj.scale;
        this.snd.pick();
        this.layerRoom.bringToTop(obj);
        this.tweens.add({ targets: obj, scale: obj._baseScale * 1.04, duration: 110 });
      } else if (obj._char || obj._item) {
        this.snd.pick();
        this.tweens.killTweensOf(obj);
        obj._sitting = false;
        if (obj.parentContainer) { obj.parentContainer.remove(obj); this.add.existing(obj); }
        obj.setDepth(34);
        this.tweens.add({ targets: obj, angle: obj._char ? 4 : 8, scale: obj._baseScale * 1.06, duration: 120 });
      } else if (obj._drawerArt) {
        // pull a fresh painting out of the drawer
        const data = { room: this.room, x: p.worldX, y: p.worldY, art: obj._drawerArt };
        Save.get().paintings.push(data);
        obj._spawned = this._hangPainting(data, false);
        obj._spawned.setDepth(75);
        this.snd.pick();
      } else if (obj._painting) {
        obj.setDepth(75);
      }
    });
    this.input.on("drag", (p, obj, dx, dy) => {
      if (obj._noDrag) return;
      // Umbral de 10px (bug QA #1): dedos de niña dan micro-movimiento; sin esto
      // un TOQUE para que la tele brille se leía como arrastre de 2px y no
      // disparaba la reacción. Por debajo del umbral = sigue siendo un tap.
      if (!obj._dragMoved && Math.hypot(p.x - obj._downX, p.y - obj._downY) < 10) return;
      obj._dragMoved = true;
      if (obj._drawerArt && obj._spawned) { obj._spawned.x = dx; obj._spawned.y = dy; return; }
      obj.x = dx; obj.y = dy;
      if (obj._furn && obj._glow) { obj._glow.x = dx; obj._glow.y = dy - obj.displayHeight * 0.72; }
    });
    this.input.on("dragend", (p, obj) => {
      if (obj._furn) {
        if (obj._noDrag) return;
        const f = obj._furn;
        this.tweens.add({ targets: obj, scale: obj._baseScale, duration: 110 });
        if (!obj._dragMoved) { if (f.tap) this._tapFurniture(obj, f); return; }
        // asentar: los de pared en la pared, el resto en la banda del suelo
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

  update() {
    // running tap water
    if (this._sinkOn && this._waterSpr && Math.random() < 0.5) {
      const z = this._waterSpr;
      const wx = z.x + z.displayWidth * 0.16, wy = z.y - z.displayHeight * 0.62;
      const d = this.add.image(wx + Phaser.Math.Between(-3, 3), wy, "px").setDepth(15).setTint(0x7fd4ff).setScale(2);
      this.tweens.add({ targets: d, y: wy + 70, alpha: 0.2, duration: 300, onComplete: () => d.destroy() });
    }
  }
}
