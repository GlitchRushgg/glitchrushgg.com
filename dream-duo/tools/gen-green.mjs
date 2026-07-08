// Regenera los sprites de sujetos claros (Flofy blanco, paloma gris, hadas con
// alas translúcidas) sobre VERDE CHROMA y los recorta por chroma key local.
// El flood-fill del gris se los comía. Coste ~6×$0.039. Token env REPLICATE_API_TOKEN.
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

const GREEN = "Single isolated subject, full subject visible with margin, centered, on a SOLID FLAT PURE BRIGHT GREEN chroma-key background (like #00ff00 greenscreen), no floor, no shadow on the background.";
const STYLE = "STYLE: stylized 3D video game render, Fortnite/Pixar hybrid style, clean game-engine look, soft rim lighting, vibrant saturated colors, high detail, no photorealism.";
const NEG = "NEGATIVE PROMPT (strictly avoid): photorealistic, uncanny, dark, scary, extra fingers, deformed, text, letters, watermark, green tint on the subject.";

const FLOFY = "the same white plush bunny from the reference image: cream-white shaggy fur, long floppy ears, grey embroidered nose, black bead eyes, huggable stuffed-animal body, faint golden sparkles";
const FAIRY = "the same fairy girl from the reference image: 6-year-old, golden-blonde braided pigtails, freckles, pastel sparkly PINK-and-lilac fairy dress with white bunny emblem, large OPAQUE glittering pink-lilac fairy wings, star-tipped wand, golden glitter";

const JOBS = {
  "flofy-hop":  { p: `${FLOFY}. Full SIDE VIEW facing RIGHT, mid-air bouncy hop with tiny paws tucked, ears flying up, cheerful determined face, small golden sparkle trail. ${GREEN}`, refs: [join(canonDir, "flofy-jumping.png"), join(canonDir, "flofy-front.png")] },
  "flofy-fall": { p: `${FLOFY}. Full SIDE VIEW facing RIGHT, floating gently downward like a parachute, ears spread wide upward catching the air, calm happy face, golden sparkles. ${GREEN}`, refs: [join(canonDir, "flofy-jumping.png"), join(canonDir, "flofy-front.png")] },
  "flofy-front": { p: `${FLOFY}. Sitting facing the camera like a cute item-shop display, ears relaxed, innocent happy expression. ${GREEN}`, refs: [join(canonDir, "flofy-front.png")] },
  "ob-pigeon":  { p: `A plump grey-blue city pigeon flying with wings spread mid-flap, video game obstacle sprite, side view facing LEFT. ${GREEN}`, refs: [] },
  "eliz-fairy-fly": { p: `${FAIRY}. Full SIDE VIEW facing RIGHT, flying horizontally with wings spread wide, one arm forward holding the star wand leaving a sparkle trail, legs trailing behind, joyful heroic expression. ${GREEN}`, refs: [join(canonDir, "elizabeth-skin-fairy.png")] },
  "elizabeth-skin-fairy": { p: `${FAIRY}. Standing straight facing the camera in a relaxed A-pose, friendly smile, character-select-screen framing. ${GREEN}`, refs: [join(canonDir, "elizabeth-skin-fairy.png")] },
};

const toUri = (p) => "data:image/png;base64," + readFileSync(p).toString("base64");

function chromaCut(name) {
  const png = PNG.sync.read(readFileSync(join(srcDir, `${name}.png`)));
  const { width: W, height: Hh, data } = png;
  const isGreen = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return g > 100 && g > r * 1.30 && g > b * 1.30;
  };
  let minX = W, minY = Hh, maxX = 0, maxY = 0;
  for (let p = 0; p < W * Hh; p++) {
    const i = p * 4;
    if (isGreen(i)) { data[i + 3] = 0; continue; }
    const x = p % W, y = (p - x) / W;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  // despill: bajar el verde en los bordes conservados
  for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4;
    if (!data[i + 3]) continue;
    const near = [i - 4, i + 4, i - W * 4, i + W * 4].some((j) => data[j + 3] === 0);
    if (near) {
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
  writeFileSync(join(srcDir, `${name}-cut.png`), PNG.sync.write(out));
  console.log(`CUT ok ${name}-cut.png (${cw}x${ch})`);
}

for (const [name, job] of Object.entries(JOBS)) {
  const genPath = join(srcDir, `${name}.png`);
  const force = process.argv.includes("--force");
  if (!existsSync(genPath) || force || true) { // siempre regenerar estos (los grises están rotos)
    const input = { prompt: `${job.p} ${STYLE} ${NEG}`, aspect_ratio: "3:4", output_format: "png" };
    if (job.refs.length) input.image_input = job.refs.map(toUri);
    const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
      body: JSON.stringify({ input }),
    });
    const body = await res.json();
    const url = Array.isArray(body.output) ? body.output[0] : body.output;
    if (!res.ok || !url || body.status === "failed") {
      console.error(`GEN fallo ${name}: ${JSON.stringify(body).slice(0, 240)}`);
      continue;
    }
    const img = await fetch(url);
    writeFileSync(genPath, Buffer.from(await img.arrayBuffer()));
    console.log(`GEN ok ${name}`);
  }
  chromaCut(name);
}
console.log("HECHO");
