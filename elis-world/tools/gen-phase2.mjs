// ELI'S WORLD fase 2: props de BAÑO (chroma verde) + accesorios de DISFRAZ
// (alas de hada sobre magenta por translúcidas; resto verde). Resumible.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { PNG } = require("pngjs");
const srcDir = join(here, "..", "assets", "art-src");
const token = process.env.REPLICATE_API_TOKEN;
if (!token) { console.error("Falta REPLICATE_API_TOKEN"); process.exit(1); }

const STYLE = "STYLE: cute stylized 3D video game prop render, Fortnite/Pixar hybrid toy-like look, soft rounded shapes, vibrant saturated colors, kid-friendly, high detail, no photorealism, no text.";
const GREEN = "Single isolated object, fully visible with margin, centered, on a SOLID FLAT PURE BRIGHT GREEN chroma-key background (#00ff00), no floor, no shadow.";
const MAG = "Single isolated object, fully visible with margin, centered, on a SOLID FLAT PURE MAGENTA background (#ff00ff), no floor, no shadow.";
const NEG = "AVOID: photorealism, dark, scary, text, watermark, humans, chroma tint on the object itself.";

// key → [prompt, "green"|"magenta"]
const JOBS = {
  "bathtub":    ["A cute kids bathtub full of white foamy bubbles, pastel blue tub with little feet, front view.", "green"],
  "toilet":     ["A cute clean white toilet, cartoon toy-like, front view.", "green"],
  "bathsink":   ["A cute bathroom sink unit with a round mirror above it and a tiny soap, mint cabinet, front view.", "green"],
  "duck":       ["A classic yellow rubber duck bath toy, front view.", "green"],
  "towelrack":  ["A wooden towel rack with a folded fluffy pink towel hanging, front view.", "green"],
  "acc-crown":  ["A small cute golden princess crown with pink gems, front view.", "green"],
  "acc-hat":    ["A small cute striped party hat cone with a pompom on top and confetti pattern, front view.", "green"],
  "acc-bow":    ["A small cute red hair bow ribbon, front view.", "green"],
  "acc-wings":  ["A pair of small glittering translucent pastel pink-and-lilac fairy wings, spread, front view.", "magenta"],
};

const cut = (name, mode) => {
  const png = PNG.sync.read(readFileSync(join(srcDir, `${name}.png`)));
  const { width: W, height: Hh, data } = png;
  const isBg = mode === "magenta"
    ? (i) => { const r = data[i], g = data[i + 1], b = data[i + 2]; return r > 110 && b > 110 && g < r * 0.55 && g < b * 0.55; }
    : (i) => { const r = data[i], g = data[i + 1], b = data[i + 2]; return g > 100 && g > r * 1.3 && g > b * 1.3; };
  let minX = W, minY = Hh, maxX = 0, maxY = 0;
  for (let p = 0; p < W * Hh; p++) {
    const i = p * 4;
    if (isBg(i)) { data[i + 3] = 0; continue; }
    const x = p % W, y = (p - x) / W;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4;
    if (!data[i + 3]) continue;
    if ([i - 4, i + 4, i - W * 4, i + W * 4].some((j) => data[j + 3] === 0)) {
      if (mode === "magenta") { const cap = Math.round(data[i + 1] * 1.4); if (data[i] > cap && data[i + 2] > cap) { data[i] = cap; data[i + 2] = cap; } }
      else { const cap = Math.round((data[i] + data[i + 2]) / 2); if (data[i + 1] > cap) data[i + 1] = cap; }
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
  writeFileSync(join(srcDir, `${name}-cut.png`), PNG.sync.write(out));
  console.log(`CUT ok ${name} (${cw}x${ch})`);
};

for (const [name, [desc, mode]] of Object.entries(JOBS)) {
  if (existsSync(join(srcDir, `${name}-cut.png`))) { console.log(`skip ${name}`); continue; }
  const bg = mode === "magenta" ? MAG : GREEN;
  const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input: { prompt: `${desc} ${bg} ${STYLE} ${NEG}`, aspect_ratio: "1:1", output_format: "png" } }),
  });
  const body = await res.json();
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!res.ok || !url || body.status === "failed") { console.error(`GEN fallo ${name}: ${JSON.stringify(body).slice(0, 160)}`); continue; }
  const img = await fetch(url);
  writeFileSync(join(srcDir, `${name}.png`), Buffer.from(await img.arrayBuffer()));
  console.log(`GEN ok ${name}`);
  cut(name, mode);
}
console.log("HECHO");
