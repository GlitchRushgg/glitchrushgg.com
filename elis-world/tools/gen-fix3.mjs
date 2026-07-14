import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { PNG } = require("pngjs");
const srcDir = join(here, "..", "assets", "art-src");
const token = process.env.REPLICATE_API_TOKEN;
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
const call = async (name, input) => {
  const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input }),
  });
  const body = await res.json();
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!url) { console.error("FALLO " + name + " " + JSON.stringify(body).slice(0, 300)); process.exit(1); }
  const img = await fetch(url);
  writeFileSync(join(srcDir, name + ".png"), Buffer.from(await img.arrayBuffer()));
  console.log("GEN " + name); cut(name);
};
// SIN NADA VERDE en el mueble: el chroma verde se come cualquier verde (lección del pipeline)
const PAL = "Colours: warm honey wood, cream white and soft pink ONLY. NOTHING green or mint anywhere on the cabinet.";
const BG = "Centered with generous margin on a SOLID FLAT PURE BRIGHT GREEN chroma-key background (#00ff00). No floor, no ground shadow, no text.";
const ST = "STYLE: cute stylized 3D video game prop render, Fortnite/Pixar toy-like look, matte colors, kid-friendly. AVOID: photorealism, halloween, dark, text, watermark, green or mint on the cabinet.";
await call("drawers2", { prompt: `A cute kitchen cabinet with THREE closed drawers and a light wood countertop on top, small round knobs. ${PAL} Seen straight from the front. ${BG} ${ST}`, aspect_ratio: "1:1", output_format: "png" });
const ref = "data:image/png;base64," + readFileSync(join(srcDir, "drawers2.png")).toString("base64");
await call("drawers2-open", { prompt: `Same kitchen cabinet as the reference image — same colours, same size, same camera angle, same position in frame — but the THREE DRAWERS ARE PULLED OPEN toward the viewer, each a little further out than the one above, showing kitchen utensils inside (a wooden spoon, a whisk, a small pot). ${PAL} Brown shadow inside each open drawer. ${BG} ${ST}`, image_input: [ref], aspect_ratio: "1:1", output_format: "png" });
