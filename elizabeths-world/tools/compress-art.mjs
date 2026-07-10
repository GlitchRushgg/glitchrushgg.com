// art-src/*-cut.png → assets/art/<nombre>.png a tamaño de juego (~2× display).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { chromium } = require("playwright-core");
const srcDir = join(here, "..", "assets", "art-src");
const outDir = join(here, "..", "assets", "art");
mkdirSync(outDir, { recursive: true });

// [src-cut, salida, altura]
const MAP = [
  // familia
  ["elizabeth-front-cut", "elizabeth", 430], ["flofy-front-cut", "flofy", 300],
  ["mama-front-cut", "mama", 530], ["papa-front-cut", "papa", 520],
  ["cristian-front-cut", "cristian", 540], ["elizabeth-celebrating-cut", "celebrating", 480],
  // salón
  ["sofa-cut", "sofa", 460], ["tv-cut", "tv", 440], ["lamp-cut", "lamp", 600],
  ["plant-cut", "plant", 380], ["bookshelf-cut", "bookshelf", 420], ["toybox-cut", "toybox", 260],
  ["armchair-cut", "armchair", 380], ["coffeetable-cut", "coffeetable", 240], // rug = procedural (BootScene)
  ["radio-cut", "radio", 150], ["aquarium-cut", "aquarium", 340], ["cuckoo-cut", "cuckoo", 300],
  // cocina
  ["fridge-cut", "fridge", 660], ["fridge-open-cut", "fridge-open", 660], ["stove-cut", "stove", 500],
  ["sink-cut", "sink", 480], ["ktable-cut", "ktable", 440], ["fruitbowl-cut", "fruitbowl", 160],
  ["blender-cut", "blender", 240], ["pot-cut", "pot", 200], ["teapot-cut", "teapot", 165],
  // dormitorio
  ["bed-cut", "bed", 520], ["wardrobe-cut", "wardrobe", 660], ["desk-cut", "desk", 420],
  ["teddy-cut", "teddy", 240], ["starlamp-cut", "starlamp", 260], ["slippers-cut", "slippers", 120],
  ["rockinghorse-cut", "rockinghorse", 360], ["dollhouse-cut", "dollhouse", 400], ["moonmobile-cut", "moonmobile", 340],
  // jardín
  ["swing-cut", "swing", 580], ["tree-cut", "tree", 860], ["flowerbed-cut", "flowerbed", 220],
  ["doghouse-cut", "doghouse", 340], ["trampoline-cut", "trampoline", 340], ["sandbox-cut", "sandbox", 240],
  ["wateringcan-cut", "wateringcan", 180], ["picnic-cut", "picnic", 220], ["ball-cut", "ball", 160],
  ["hutch-cut", "hutch", 400], ["bbq-cut", "bbq", 360],
  // comidas
  ["cake-cut", "cake", 150], ["bread-cut", "bread", 150], ["toast-cut", "toast", 150],
  ["cookie-cut", "cookie", 150], ["egg-cut", "egg", 150], ["friedegg-cut", "friedegg", 150],
  ["carrot-cut", "carrot", 150], ["milk-cut", "milk", 150], ["juice-cut", "juice", 150],
  ["cupcake-cut", "cupcake", 150], ["pizza-cut", "pizza", 150], ["pancakes-cut", "pancakes", 150],
  // frutas reutilizadas de hop-and-run (ya recortadas allí)
  ["../../hop-and-run/assets/art/fruit-apple-cut", "apple", 150],
  ["../../hop-and-run/assets/art/fruit-banana-cut", "banana", 150],
  ["../../hop-and-run/assets/art/fruit-orange-cut", "orange", 150],
  ["../../hop-and-run/assets/art/fruit-melon-cut", "melon", 150],
  // dibujos crayon
  ["crayon-family-cut", "crayon-family", 260], ["crayon-rainbow-cut", "crayon-rainbow", 260],
  ["crayon-bunny-cut", "crayon-bunny", 260],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext()).newPage();
let total = 0, fails = 0;
for (const [src, out, h] of MAP) {
  const p = src.startsWith("..") ? join(here, src + ".png") : join(srcDir, `${src}.png`);
  if (!existsSync(p)) { console.error(`FALTA ${src}`); fails++; continue; }
  const b64 = await page.evaluate(async ({ dataUri, h }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
    const hh = Math.min(h, img.height);
    const w = Math.round(img.width * (hh / img.height));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = hh;
    const cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high";
    cx.drawImage(img, 0, 0, w, hh);
    return cv.toDataURL("image/png").split(",")[1];
  }, { dataUri: "data:image/png;base64," + readFileSync(p).toString("base64"), h });
  const f = join(outDir, `${out}.png`);
  writeFileSync(f, Buffer.from(b64, "base64"));
  total += statSync(f).size;
}
await browser.close();
console.log(`OK ${MAP.length - fails}/${MAP.length} · TOTAL assets/art: ${(total / 1048576).toFixed(2)}MB · fallos: ${fails}`);
