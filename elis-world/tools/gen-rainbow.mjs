import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { PNG } = require("pngjs");
const srcDir = join(here, "..", "assets", "art-src");
const token = process.env.REPLICATE_API_TOKEN;
const prompt = "A cute plush toy bunny standing upright, facing forward. Her fabric is a PINK AND CREAM CHECKERED / harlequin diamond pattern all over her body and ears. Big round glossy blue eyes with long eyelashes, tiny pink nose, small stitched smile, long floppy ears standing up, soft chubby body, short arms and legs. Sitting toy pose, whole body visible. STYLE: cute stylized 3D render of a soft plush toy, Pixar/Fortnite toy-like look, soft velvet fabric, warm friendly, kid-friendly. Centered with generous margin on a SOLID FLAT PURE BRIGHT GREEN chroma-key background (#00ff00). No floor, no shadow, no pedestal. AVOID: photorealism, text, watermark, green on the toy itself.";
const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
  body: JSON.stringify({ input: { prompt, aspect_ratio: "1:1", output_format: "png" } }),
});
const body = await res.json();
const url = Array.isArray(body.output) ? body.output[0] : body.output;
if (!url) { console.error(JSON.stringify(body).slice(0, 400)); process.exit(1); }
const img = await fetch(url);
writeFileSync(join(srcDir, "rainbow-g.png"), Buffer.from(await img.arrayBuffer()));
console.log("GEN rainbow-g");
// corte verde estándar (sin purga magenta: los cuadros rosas se conservan)
const png = PNG.sync.read(readFileSync(join(srcDir, "rainbow-g.png")));
const { width: W, height: Hh, data } = png;
const isG = (i) => { const r = data[i], g = data[i + 1], b = data[i + 2]; return g > 100 && g > r * 1.3 && g > b * 1.3; };
let a = W, b = Hh, c = 0, d = 0;
for (let p = 0; p < W * Hh; p++) {
  const i = p * 4;
  if (isG(i)) { data[i + 3] = 0; continue; }
  const x = p % W, y = (p - x) / W;
  if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y;
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
const m = 6; a = Math.max(0, a - m); b = Math.max(0, b - m); c = Math.min(W - 1, c + m); d = Math.min(Hh - 1, d + m);
const cw = c - a + 1, ch = d - b + 1, o = new PNG({ width: cw, height: ch });
for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
  const s = ((b + y) * W + (a + x)) * 4, e = (y * cw + x) * 4;
  o.data[e] = data[s]; o.data[e + 1] = data[s + 1]; o.data[e + 2] = data[s + 2]; o.data[e + 3] = data[s + 3];
}
writeFileSync(join(srcDir, "rainbow-cut.png"), PNG.sync.write(o));
console.log("CUT rainbow " + cw + "x" + ch);
