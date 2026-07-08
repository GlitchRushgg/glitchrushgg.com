// Quita el fondo gris de estudio por flood-fill desde los bordes (local, sin red).
// Adaptado del cutbg.mjs de elizabeth-flofy. Recorta al bounding box.
// Uso: node cutbg.mjs <dir> <nombre> [<nombre>...]   (dir relativo a dream-duo/)
// Requiere pngjs — se ejecuta con NODE_PATH o desde un dir con node_modules.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "games", "elizabeth-flofy", "tools", "package.json"
));
const { PNG } = require("pngjs");

const here = dirname(fileURLToPath(import.meta.url));
const baseDir = join(here, "..", process.argv[2] || "assets/art-src");

const SAT_TOL = 36;
const BRIGHT_MIN = 60;

function isBg(d, i) {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return (mx - mn) <= SAT_TOL && mx >= BRIGHT_MIN;
}

function cut(name) {
  const png = PNG.sync.read(readFileSync(join(baseDir, `${name}.png`)));
  const { width: W, height: Hh, data } = png;
  const bg = new Uint8Array(W * Hh);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= Hh) return;
    const p = y * W + x;
    if (bg[p]) return;
    if (isBg(data, p * 4)) { bg[p] = 1; stack.push(p); }
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, Hh - 1); }
  for (let y = 0; y < Hh; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const p = stack.pop(), x = p % W, y = (p - x) / W;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  let minX = W, minY = Hh, maxX = 0, maxY = 0;
  for (let p = 0; p < W * Hh; p++) {
    if (bg[p]) { data[p * 4 + 3] = 0; continue; }
    const x = p % W, y = (p - x) / W;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x; if (bg[p]) continue;
    if (isBg(data, p * 4) && (bg[p - 1] || bg[p + 1] || bg[p - W] || bg[p + W])) data[p * 4 + 3] = 90;
  }
  const m = 8;
  minX = Math.max(0, minX - m); minY = Math.max(0, minY - m);
  maxX = Math.min(W - 1, maxX + m); maxY = Math.min(Hh - 1, maxY + m);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const s = ((minY + y) * W + (minX + x)) * 4, dst = (y * cw + x) * 4;
    out.data[dst] = data[s]; out.data[dst + 1] = data[s + 1];
    out.data[dst + 2] = data[s + 2]; out.data[dst + 3] = data[s + 3];
  }
  writeFileSync(join(baseDir, `${name}-cut.png`), PNG.sync.write(out));
  console.log(`OK ${name}-cut.png (${cw}x${ch})`);
}

for (const n of process.argv.slice(3)) {
  try { cut(n); } catch (e) { console.error(`FALLO ${n}: ${e.message}`); }
}
