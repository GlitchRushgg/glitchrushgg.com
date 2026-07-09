// Nuevos entornos de Hop & Run (feedback fundadora): PLAYA, SELVA y CALLE
// ITALIANA. Por entorno: skyline 16:9 (fondo con parallax) + textura de
// plataforma (material tileable donde corre Cristian). ~6×$0.039.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "..", "assets", "art-src");
const token = process.env.REPLICATE_API_TOKEN;
if (!token) { console.error("Falta REPLICATE_API_TOKEN"); process.exit(1); }

const STYLE = "STYLE: stylized 3D video game environment render, Fortnite/Pixar hybrid look, vibrant saturated colors, clean shapes, no photorealism, no characters, no text.";
const REF_NOTE = "Matches the art direction of the reference image (same rendering style, same level of detail).";

const IMAGES = {
  // La referencia de estilo es el skyline diurno ya existente.
  "skyline-beach": { p: `Wide side-scrolling video game background: a sunny tropical BEACH seen from a wooden boardwalk — turquoise sea horizon, gentle waves, palm trees, beach umbrellas and a distant pier, puffy clouds. Lower half fairly simple so gameplay reads on top. ${REF_NOTE}`, aspect: "16:9", ref: "skyline-day" },
  "rooftop-beach": { p: `Seamless tileable game platform texture, viewed straight-on from the side: sun-bleached wooden BOARDWALK planks with a sandy edge on top, warm honey tones, simple and clean. Flat frontal texture, no perspective. ${REF_NOTE}`, aspect: "1:1", ref: "rooftop-day" },
  "skyline-jungle": { p: `Wide side-scrolling video game background: a lush green JUNGLE canopy with layered misty trees, hanging vines, colorful tropical flowers and a distant waterfall, soft god rays. Lower half fairly simple so gameplay reads on top. ${REF_NOTE}`, aspect: "16:9", ref: "skyline-day" },
  "rooftop-jungle": { p: `Seamless tileable game platform texture, viewed straight-on from the side: an ancient mossy STONE ledge with jungle roots and small leaves on top edge, greens and warm greys, simple and clean. Flat frontal texture, no perspective. ${REF_NOTE}`, aspect: "1:1", ref: "rooftop-day" },
  "skyline-italy": { p: `Wide side-scrolling video game background: a charming ITALIAN old-town street scene — colorful terracotta and ochre facades with green shutters, laundry lines with hanging clothes between buildings, a distant bell tower and cypress hills, warm Mediterranean afternoon light. Lower half fairly simple so gameplay reads on top. ${REF_NOTE}`, aspect: "16:9", ref: "skyline-day" },
  "rooftop-italy": { p: `Seamless tileable game platform texture, viewed straight-on from the side: an Italian COBBLESTONE street surface with a low stone curb on the top edge, warm grey and terracotta tones, simple and clean. Flat frontal texture, no perspective. ${REF_NOTE}`, aspect: "1:1", ref: "rooftop-day" },
};

const toUri = (p) => "data:image/jpeg;base64," + readFileSync(p).toString("base64");

for (const [name, spec] of Object.entries(IMAGES)) {
  const out = join(srcDir, `${name}.png`);
  if (existsSync(out)) { console.log(`skip ${name}`); continue; }
  const input = {
    prompt: `${spec.p} ${STYLE}`,
    aspect_ratio: spec.aspect,
    output_format: "png",
    image_input: [toUri(join(here, "..", "assets", "art", `${spec.ref}.jpg`))],
  };
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
  writeFileSync(out, Buffer.from(await img.arrayBuffer()));
  console.log(`GEN ok ${name}`);
}
console.log("HECHO");
