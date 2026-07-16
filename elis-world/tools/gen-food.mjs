// Comida nueva para el AJUSTE PROFUNDO (referencia Toca/Bluey de la fundadora):
// salchicha + hot dog + plato de desayuno. Mismo pipeline: nano-banana con
// chroma verde → cut-chroma.mjs local. Uso: node gen-food.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "..", "assets", "art-src");
mkdirSync(srcDir, { recursive: true });
const token = process.env.REPLICATE_API_TOKEN;
if (!token) { console.error("Falta REPLICATE_API_TOKEN"); process.exit(1); }

const STYLE = "STYLE: cute stylized 3D video game prop render, Fortnite/Pixar hybrid toy-like look, soft rounded shapes, vibrant saturated colors, kid-friendly, high detail, no photorealism, no text.";
const GREEN = "Single isolated object, fully visible with margin, centered, on a SOLID FLAT PURE BRIGHT GREEN chroma-key background (#00ff00), no floor, no shadow.";
const NEG = "AVOID: photorealism, dark, scary, text, letters, watermark, humans, green tint on the object itself.";

const P = {
  sausage:   "Two glossy juicy grilled sausages side by side, warm reddish-brown with cute diagonal grill marks, plump and toy-like.",
  hotdog:    "A cute cartoon hot dog: one grilled sausage inside a soft golden bun with a single wavy line of ketchup on top, side view.",
  breakfast: "A cheerful breakfast plate: two sunny-side-up fried eggs and two grilled sausages arranged on a round pastel-blue plate, slightly angled top view.",
};

for (const [name, prompt] of Object.entries(P)) {
  const out = join(srcDir, `${name}.png`);
  if (existsSync(out)) { console.log("skip", name); continue; }
  const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input: { prompt: `${prompt} ${GREEN} ${STYLE} ${NEG}`, aspect_ratio: "1:1", output_format: "png" } }),
  });
  const body = await res.json();
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!res.ok || !url || body.status === "failed") { console.error("FALLO", name, JSON.stringify(body).slice(0, 200)); continue; }
  const img = await fetch(url);
  writeFileSync(out, Buffer.from(await img.arrayBuffer()));
  console.log("GEN ok", name);
}
