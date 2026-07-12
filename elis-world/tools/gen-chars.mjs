// Regenera la familia de ELI'S WORLD en estilo CHIBI DE JUGUETE, acorde a los
// muebles tiernos de la casa (feedback fundadora: los personajes canon
// realistas desentonan). Usa el canon front como referencia de identidad,
// pero restiliza a figurita chibi. Verde chroma → recorte local.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { PNG } = require("pngjs");
const srcDir = join(here, "..", "assets", "art-src");
const canonDir = join(here, "..", "..", "games", "elizabeth-flofy", "assets", "canon");
const token = process.env.REPLICATE_API_TOKEN;
if (!token) { console.error("Falta REPLICATE_API_TOKEN"); process.exit(1); }

const STYLE =
  "STYLE: adorable CHIBI toy figurine, BIG round head, small chubby body, " +
  "super-deformed cute proportions (head about 1/3 of the height), soft matte " +
  "rounded 3D like a collectible vinyl toy, simple shapes, kid-friendly, " +
  "vibrant colors, matching a cozy pastel toy dollhouse world, high detail. " +
  "Standing straight facing the camera, feet together, relaxed happy pose, arms " +
  "slightly out. Full body visible with margin.";
const GREEN = "Single isolated character, fully visible with margin, centered, on a SOLID FLAT PURE BRIGHT GREEN chroma-key background (#00ff00), no floor, no shadow.";
const NEG = "AVOID: photorealism, realistic adult proportions, tall thin body, real child, uncanny, scary, extra fingers, deformed hands, text, watermark, green tint on the character.";

const CHARS = {
  elizabeth: {
    ref: "elizabeth-front.png",
    who: "A cute 6-year-old girl: golden-blonde hair in two braided pigtails with small pink hair ties, big warm brown eyes, freckles across her cheeks and nose, huge happy smile. Pink hoodie with a white bunny emblem on the chest, yellow t-shirt, dark leggings, chunky pink-and-white sneakers, tiny tan backpack.",
  },
  mama: {
    ref: "mama-front.png",
    who: "A warm Venezuelan mom: medium wavy chestnut-brown hair, round eyeglasses, big brown eyes, gentle happy smile. Warm-toned explorer jacket over a yellow t-shirt, practical dark pants, little boots.",
  },
  papa: {
    ref: "papa-front.png",
    who: "A friendly dad: shaved/bald head under a navy-blue cap, short trimmed BLOND beard, light freckles, bright GREEN eyes, big warm smile. Warm-toned explorer vest over a yellow t-shirt, cargo pants, boots.",
  },
  cristian: {
    ref: "cristian-front.png",
    who: "A friendly teen big brother: tousled wavy dark-brown hair, modern eyeglasses, bright GREEN eyes, big smile. Navy-blue hoodie over a yellow t-shirt, knee-length cargo shorts, sneakers, tiny tan backpack. (Chibi so NOT tall — same cute short toy proportions as the rest.)",
  },
};

function chromaCut(name) {
  const png = PNG.sync.read(readFileSync(join(srcDir, `${name}-toy.png`)));
  const { width: W, height: Hh, data } = png;
  const isGreen = (i) => { const r = data[i], g = data[i + 1], b = data[i + 2]; return g > 100 && g > r * 1.3 && g > b * 1.3; };
  let minX = W, minY = Hh, maxX = 0, maxY = 0;
  for (let p = 0; p < W * Hh; p++) {
    const i = p * 4;
    if (isGreen(i)) { data[i + 3] = 0; continue; }
    const x = p % W, y = (p - x) / W;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4;
    if (!data[i + 3]) continue;
    if ([i - 4, i + 4, i - W * 4, i + W * 4].some((j) => data[j + 3] === 0)) {
      const cap = Math.round((data[i] + data[i + 2]) / 2);
      if (data[i + 1] > cap) data[i + 1] = cap;
      data[i + 3] = Math.min(data[i + 3], 200);
    }
  }
  const m = 8;
  minX = Math.max(0, minX - m); minY = Math.max(0, minY - m);
  maxX = Math.min(W - 1, maxX + m); maxY = Math.min(Hh - 1, maxY + m);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const s = ((minY + y) * W + (minX + x)) * 4, d = (y * cw + x) * 4;
    out.data[d] = data[s]; out.data[d + 1] = data[s + 1]; out.data[d + 2] = data[s + 2]; out.data[d + 3] = data[s + 3];
  }
  writeFileSync(join(srcDir, `${name}-toy-cut.png`), PNG.sync.write(out));
  console.log(`CUT ok ${name}-toy (${cw}x${ch})`);
}

for (const [name, spec] of Object.entries(CHARS)) {
  const gen = join(srcDir, `${name}-toy.png`);
  if (!existsSync(gen)) {
    const ref = "data:image/png;base64," + readFileSync(join(canonDir, spec.ref)).toString("base64");
    const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
      body: JSON.stringify({ input: { prompt: `Same character identity as the reference image (same face, hair, colors, outfit), redrawn as: ${spec.who} ${STYLE} ${GREEN} ${NEG}`, aspect_ratio: "3:4", output_format: "png", image_input: [ref] } }),
    });
    const body = await res.json();
    const url = Array.isArray(body.output) ? body.output[0] : body.output;
    if (!res.ok || !url || body.status === "failed") { console.error(`GEN fallo ${name}: ${JSON.stringify(body).slice(0, 200)}`); continue; }
    const img = await fetch(url);
    writeFileSync(gen, Buffer.from(await img.arrayBuffer()));
    console.log(`GEN ok ${name}-toy`);
  }
  chromaCut(name);
}
console.log("HECHO");
