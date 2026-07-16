// Cucurucho de helado para el carrito del jardín (orden fundadora 2026-07-16:
// "me gusta la idea de lo del jardín"). Pipeline canon: nano-banana chroma
// verde → cut-chroma.mjs. Uso: node gen-icecream.mjs
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
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
const prompt = "A cheerful ice cream cone: one waffle cone with two scoops (strawberry pink and vanilla cream) topped with a tiny red cherry, upright, plump and toy-like.";

const out = join(srcDir, "icecream.png");
if (existsSync(out)) { console.log("skip icecream (ya existe)"); process.exit(0); }
const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
  body: JSON.stringify({ input: { prompt: `${prompt} ${GREEN} ${STYLE} ${NEG}`, aspect_ratio: "1:1", output_format: "png" } }),
});
const body = await res.json();
const url = Array.isArray(body.output) ? body.output[0] : body.output;
if (!res.ok || !url || body.status === "failed") { console.error("FALLO", JSON.stringify(body).slice(0, 200)); process.exit(1); }
const img = await fetch(url);
writeFileSync(out, Buffer.from(await img.arrayBuffer()));
console.log("GEN ok icecream");
