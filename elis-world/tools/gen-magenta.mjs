// Re-genera los props con FOLLAJE VERDE sobre fondo MAGENTA (el chroma verde
// se comía las hojas) y los recorta con key magenta. ~$0.20.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { PNG } = require("pngjs");
const dir = join(here, "..", "assets", "art-src");
const token = process.env.REPLICATE_API_TOKEN;

const STYLE = "STYLE: cute stylized 3D video game prop render, Fortnite/Pixar hybrid toy-like look, soft rounded shapes, vibrant saturated colors, kid-friendly, high detail, no photorealism, no text.";
const MAG = "Single isolated object, fully visible with margin, centered, on a SOLID FLAT PURE MAGENTA chroma-key background (#ff00ff), no floor, no shadow.";
const NEG = "AVOID: photorealism, dark, scary, text, watermark, humans, magenta or pink tint on the object itself.";

const JOBS = {
  "plant":     "A happy potted plant with big round green leaves in a terracotta pot, front view.",
  "flowerbed": "A small flower bed with colorful daisies and tulips and green leaves, front view.",
  "tree":      "A friendly round garden tree with lush green foliage and a few red apples, front view.",
  "rug":       "A soft oval kids rug with pastel PINK, CREAM and LILAC rings (no green), seen at a slight angle so it reads as lying on the floor.",
  "picnic":    "An open picnic basket on a small red-and-white checkered blanket with sandwiches, front view.",
};

function magentaCut(name) {
  const png = PNG.sync.read(readFileSync(join(dir, `${name}.png`)));
  const { width: W, height: Hh, data } = png;
  const isMag = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r > 110 && b > 110 && g < r * 0.55 && g < b * 0.55;
  };
  let minX = W, minY = Hh, maxX = 0, maxY = 0;
  for (let p = 0; p < W * Hh; p++) {
    const i = p * 4;
    if (isMag(i)) { data[i + 3] = 0; continue; }
    const x = p % W, y = (p - x) / W;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4;
    if (!data[i + 3]) continue;
    const near = [i - 4, i + 4, i - W * 4, i + W * 4].some((j) => data[j + 3] === 0);
    if (near) {
      // despill magenta: recorta rojo/azul al nivel del verde
      const cap = Math.round(data[i + 1] * 1.4);
      if (data[i] > cap && data[i + 2] > cap) { data[i] = cap; data[i + 2] = cap; }
      data[i + 3] = Math.min(data[i + 3], 200);
    }
  }
  const m = 6;
  minX = Math.max(0, minX - m); minY = Math.max(0, minY - m);
  maxX = Math.min(W - 1, maxX + m); maxY = Math.min(Hh - 1, maxY + m);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const s = ((minY + y) * W + (minX + x)) * 4, d = (y * cw + x) * 4;
    out.data[d] = data[s]; out.data[d + 1] = data[s + 1]; out.data[d + 2] = data[s + 2]; out.data[d + 3] = data[s + 3];
  }
  writeFileSync(join(dir, `${name}-cut.png`), PNG.sync.write(out));
  console.log(`CUT ok ${name} (${cw}x${ch})`);
}

for (const [name, desc] of Object.entries(JOBS)) {
  const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input: { prompt: `${desc} ${MAG} ${STYLE} ${NEG}`, aspect_ratio: "1:1", output_format: "png" } }),
  });
  const body = await res.json();
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!res.ok || !url || body.status === "failed") { console.error(`GEN fallo ${name}`); continue; }
  const img = await fetch(url);
  writeFileSync(join(dir, `${name}.png`), Buffer.from(await img.arrayBuffer()));
  console.log(`GEN ok ${name}`);
  magentaCut(name);
}
console.log("HECHO");
