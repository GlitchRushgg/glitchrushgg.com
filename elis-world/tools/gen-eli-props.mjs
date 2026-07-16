// Chimenea (off/on) + invernadero para el AJUSTE de Eli's World (encargo
// fundadora 2026-07-16, referencias ztasel-fireplace / openclipart-greenhouse
// de su carpeta). Pipeline canon: nano-banana chroma verde → cut-chroma.
// La versión encendida usa image_input para conservar la identidad (lección
// del par fridge/fridge-open). Uso: node gen-eli-props.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
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

async function gen(name, prompt, imageInput = null) {
  const out = join(srcDir, `${name}.png`);
  if (existsSync(out)) { console.log("skip", name); return out; }
  const input = { prompt: `${prompt} ${GREEN} ${STYLE} ${NEG}`, aspect_ratio: "1:1", output_format: "png" };
  if (imageInput) input.image_input = [imageInput];
  const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input }),
  });
  const body = await res.json();
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!res.ok || !url || body.status === "failed") { console.error("FALLO", name, JSON.stringify(body).slice(0, 200)); process.exit(1); }
  const img = await fetch(url);
  writeFileSync(out, Buffer.from(await img.arrayBuffer()));
  console.log("GEN ok", name);
  return out;
}

// data URI del png para image_input
const toDataUri = (p) => "data:image/png;base64," + readFileSync(p).toString("base64");

const fp = await gen("fireplace",
  "A cozy toy-like home fireplace: rounded cream-white stone mantel with soft pink trim, arched firebox with neat stacked firewood logs inside, NO fire, unlit, a tiny potted plant on the mantel shelf.");
await gen("fireplace-fire",
  "The EXACT same fireplace, same angle, same position in frame, same colors and details, but now LIT: warm cheerful orange-yellow cartoon flames burning on the logs with a soft warm glow.",
  toDataUri(fp));
await gen("greenhouse",
  "A cute small garden greenhouse: rounded white frame with pastel mint trim, glass panels with soft sky-blue reflection, a closed little door, tiny colorful potted flowers visible inside through the glass, toy-like proportions.");
