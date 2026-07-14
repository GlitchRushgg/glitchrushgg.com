import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { PNG } = require("pngjs");
const srcDir = join(here, "..", "assets", "art-src");
const token = process.env.REPLICATE_API_TOKEN;
const STYLE = "STYLE: cute stylized 3D video game prop render, Fortnite/Pixar toy-like look, soft rounded shapes, matte vibrant colors, kid-friendly, no photorealism.";
const BG = "Single object, centered with generous margin, on a SOLID FLAT PURE BRIGHT GREEN chroma-key background (#00ff00). No floor, no shadow, no pedestal, no text.";
const NEG = "AVOID: photorealism, halloween, pumpkin, spooky, dark, text, watermark, green tint on the object.";

const cut = (name) => {
  const png = PNG.sync.read(readFileSync(join(srcDir, name + ".png")));
  const { width: W, height: Hh, data } = png;
  const isG = (i) => { const r = data[i], g = data[i+1], b = data[i+2]; return g > 100 && g > r*1.3 && g > b*1.3; };
  let a = W, b = Hh, c = 0, d = 0;
  for (let p = 0; p < W*Hh; p++) { const i = p*4; if (isG(i)) { data[i+3] = 0; continue; } const x = p%W, y = (p-x)/W; if (x<a)a=x; if (x>c)c=x; if (y<b)b=y; if (y>d)d=y; }
  for (let y = 1; y < Hh-1; y++) for (let x = 1; x < W-1; x++) { const i = (y*W+x)*4; if (!data[i+3]) continue;
    if ([i-4,i+4,i-W*4,i+W*4].some(j => data[j+3] === 0)) { const cap = Math.round((data[i]+data[i+2])/2); if (data[i+1] > cap) data[i+1] = cap; data[i+3] = Math.min(data[i+3], 200); } }
  const m = 6; a = Math.max(0,a-m); b = Math.max(0,b-m); c = Math.min(W-1,c+m); d = Math.min(Hh-1,d+m);
  const cw = c-a+1, ch = d-b+1, o = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const s = ((b+y)*W+(a+x))*4, e = (y*cw+x)*4; o.data[e]=data[s]; o.data[e+1]=data[s+1]; o.data[e+2]=data[s+2]; o.data[e+3]=data[s+3]; }
  writeFileSync(join(srcDir, name + "-cut.png"), PNG.sync.write(o));
  console.log("CUT " + name + " " + cw + "x" + ch);
};

const gen = async (name, prompt, ratio = "1:1", refs = null) => {
  if (existsSync(join(srcDir, name + "-cut.png"))) { console.log("skip " + name); return; }
  const input = { prompt, aspect_ratio: ratio, output_format: "png" };
  if (refs) input.image_input = refs;
  const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input }),
  });
  const body = await res.json();
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!url) { console.error("FALLO " + name + " " + JSON.stringify(body).slice(0, 200)); return; }
  const img = await fetch(url);
  writeFileSync(join(srcDir, name + ".png"), Buffer.from(await img.arrayBuffer()));
  console.log("GEN " + name);
  cut(name);
};

// 1) LÁMPARA: la actual es una calabaza de Halloween (la fundadora: "no me gusta halloween")
await gen("lamp2", `A cute floor lamp for a little girl's living room: a slim wooden tripod stand and a rounded soft pink fabric lampshade, warm glowing light inside, a tiny white bow on the shade. Standing upright, full lamp visible. ${BG} ${STYLE} ${NEG}`, "9:16");
// 2) GAVETAS de cocina, cerradas y abiertas (misma identidad)
await gen("drawers2", `A cute kitchen cabinet with THREE closed drawers, cream and mint colours, rounded wooden body, a light wood countertop on top, small yellow round knobs. Seen straight from the front, slightly above. ${BG} ${STYLE} ${NEG}`, "1:1");
