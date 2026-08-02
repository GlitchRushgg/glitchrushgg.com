// Loads the Replicate-generated art, normalizes Cristian's animation frames
// onto same-size canvases (feet anchored bottom-center, so the run cycle
// doesn't jitter), and generates small procedural FX textures.

import { W, H } from "../const.js";

const ART = "assets/art/";

// Cristian frames → normalized boxes (w, h, drawn character height).
// Ciclo de carrera de 4 fases (contacto/recoil/paso/vuelo), regenerado con
// Replicate. El antiguo run-5 (recorte roto) se eliminó: no se usaba.
const FRAMES = {
  "cristian-run-1": [210, 190, 172],
  "cristian-run-2": [210, 190, 172],
  "cristian-run-3": [210, 190, 172],
  "cristian-run-4": [210, 190, 172],

  "cristian-jump": [210, 190, 168],
  "cristian-skate": [230, 190, 176],
  "cristian-guitar": [250, 190, 176],
  "cristian-hurt": [230, 190, 170],
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    const bar = this.add.rectangle(W / 2, H / 2, 0, 10, 0xffffff).setOrigin(0.5);
    this.add.rectangle(W / 2, H / 2, 320, 16).setStrokeStyle(2, 0xffffff);
    this.load.on("progress", (p) => (bar.width = 314 * p));

    for (const name of Object.keys(FRAMES)) this.load.image("raw-" + name, ART + name + "-cut.png");
    this.load.image("cristian-celebrate", ART + "cristian-celebrate-cut.png");

    for (const t of ["rooftop-day", "rooftop-sunset", "rooftop-night",
      "rooftop-beach", "rooftop-jungle", "rooftop-italy"]) this.load.image(t, ART + t + ".jpg");
    for (const t of ["skyline-day", "skyline-sunset", "skyline-night",
      "skyline-beach", "skyline-jungle", "skyline-italy", "skyline-aurora"]) this.load.image(t, ART + t + ".jpg");

    for (const t of ["fruit-apple", "fruit-banana", "fruit-orange", "fruit-melon",
      "animal-kitten", "animal-puppy", "animal-chick",
      "item-skateboard", "item-guitar", "obstacle-crate", "obstacle-pigeon"]) {
      this.load.image(t, ART + t + "-cut.png");
    }
    this.load.image("key-art", ART + "key-art.jpg");
    // Audio real (Pixabay, licencia libre): solo de guitarra normal + super rock.
    this.load.audio("guitarSolo", "assets/audio/guitar-solo.mp3");
    this.load.audio("superGuitar", "assets/audio/super-guitar.mp3");
  }

  create() {
    this._normalizeFrames();
    this._genSpark();
    this._genDust();
    this._genGlow();
    this._genBolt();
    this._genCloud();
    this._genHeart();
    this.scene.start("Menu");
  }

  // Corazón de CONTINUAR (sistema de vidas — feedback fundadora).
  _genHeart() {
    const g = this.add.graphics();
    g.fillStyle(0xff5e7a, 1);
    g.fillCircle(16, 15, 12);
    g.fillCircle(34, 15, 12);
    g.fillTriangle(5, 21, 45, 21, 25, 46);
    g.fillStyle(0xffb3c2, 1);
    g.fillCircle(13, 12, 4);
    g.generateTexture("heart", 50, 48);
    g.destroy();
  }

  // Draw each Cristian frame into a fixed-size canvas, scaled to a common
  // character height and anchored bottom-center. Los 4 frames de carrera se
  // anclan por su PIE MÁS BAJO real (no por el borde de la imagen): las fases
  // "paso" y "vuelo" traen los pies dibujados más arriba, así que anclar por
  // el borde los hacía FLOTAR ~20px una vez por ciclo (rebote tosco). Anclando
  // por el pie a una línea común (FEET_Y = base de la fase de contacto) el
  // corredor pisa el tejado de forma estable y el movimiento lo dan las piernas.
  _normalizeFrames() {
    const FEET_Y = 176; // línea de pies común (= base histórica del frame de contacto)
    for (const [name, [bw, bh, ch]] of Object.entries(FRAMES)) {
      const src = this.textures.get("raw-" + name).getSourceImage();
      const scale = ch / src.height;
      const dw = src.width * scale;
      const canvas = this.textures.createCanvas("p-" + name, bw, bh);
      const ctx = canvas.getContext();
      let top = bh - ch; // por defecto: borde inferior de la imagen al borde del canvas
      if (name.startsWith("cristian-run-")) {
        const ly = this._lowestOpaqueRow(src);      // fila del pie más bajo (en la fuente)
        top = FEET_Y - (ly + 1) * scale;            // ese pie cae en FEET_Y
      }
      ctx.drawImage(src, (bw - dw) / 2, top, dw, ch);
      canvas.refresh();
    }
  }

  // Fila (y) del píxel opaco más bajo de una imagen — para anclar por los pies.
  _lowestOpaqueRow(src) {
    const w = src.width, h = src.height;
    const tmp = document.createElement("canvas");
    tmp.width = w; tmp.height = h;
    const tc = tmp.getContext("2d");
    tc.drawImage(src, 0, 0);
    const data = tc.getImageData(0, 0, w, h).data;
    for (let y = h - 1; y >= 0; y--) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 30) return y;
      }
    }
    return h - 1;
  }

  _genSpark() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(5, 5, 5);
    g.generateTexture("spark", 10, 10);
    g.destroy();
  }

  _genDust() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(6, 6, 6);
    g.generateTexture("dust", 12, 12);
    g.destroy();
  }

  _genGlow() {
    const g = this.add.graphics();
    for (let r = 32; r > 0; r -= 2) {
      g.fillStyle(0xffffff, 0.05 + (32 - r) * 0.008);
      g.fillCircle(32, 32, r);
    }
    g.generateTexture("glow", 64, 64);
    g.destroy();
  }

  // Lightning bolt for the guitar-solo obstacle blasts.
  _genBolt() {
    const g = this.add.graphics();
    g.fillStyle(0xffe066, 1);
    g.fillPoints([
      { x: 26, y: 0 }, { x: 10, y: 34 }, { x: 20, y: 34 },
      { x: 6, y: 64 }, { x: 30, y: 26 }, { x: 20, y: 26 }, { x: 34, y: 0 },
    ], true);
    g.generateTexture("bolt", 40, 64);
    g.destroy();
  }

  _genCloud() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    [[30, 26, 24], [58, 30, 18], [18, 32, 15], [44, 16, 18], [74, 32, 13]]
      .forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.generateTexture("cloud", 94, 52);
    g.destroy();
  }
}
