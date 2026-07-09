// Ciclo de carrera NATURAL de Elizabeth: 4 fases laterales (contacto dcha →
// paso → contacto izq → paso) con encuadre idéntico para animar sin jitter.
// Referencia = eliz-run-a ya generado (side view). Coste ~4×$0.039.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "..", "assets", "art-src");
const token = process.env.REPLICATE_API_TOKEN;
if (!token) { console.error("Falta REPLICATE_API_TOKEN"); process.exit(1); }

const STYLE = "STYLE: stylized 3D video game character render, Fortnite/Pixar hybrid style, clean game-engine look, soft rim lighting, vibrant saturated colors, high detail, no photorealism.";
const NEG = "NEGATIVE PROMPT (strictly avoid): photorealistic, real child, uncanny, dark, scary, extra fingers, deformed, text, watermark.";
const FRAME = "IDENTICAL camera framing and character scale as the reference image: full body, strict SIDE VIEW facing RIGHT, character fills the frame vertically with small margin, feet near the bottom edge. Single isolated subject on a plain flat light-grey studio background, no floor shadow.";
const ELIZ = "The same exact 6-year-old girl as the reference image (golden-blonde braided pigtails with pink ties, freckles, pink bunny hoodie, yellow shirt, dark leggings, pink-white sneakers, tan backpack)";

const FRAMES = {
  "run-c1": `${ELIZ}, natural running cycle CONTACT pose: RIGHT leg extended forward with heel striking the ground, LEFT leg bent trailing behind, LEFT arm swung forward and right arm back, body leaning slightly forward, braids flowing back. ${FRAME}`,
  "run-c2": `${ELIZ}, natural running cycle PASSING pose: legs crossing under the body (left knee lifting past the planted right leg), body at its tallest, arms passing at her sides, braids mid-bounce. ${FRAME}`,
  "run-c3": `${ELIZ}, natural running cycle CONTACT pose: LEFT leg extended forward with heel striking the ground, RIGHT leg bent trailing behind, RIGHT arm swung forward and left arm back, body leaning slightly forward, braids flowing back. ${FRAME}`,
  "run-c4": `${ELIZ}, natural running cycle PASSING pose: legs crossing under the body (right knee lifting past the planted left leg), body at its tallest, arms passing at her sides, braids mid-bounce high. ${FRAME}`,
};

const ref = "data:image/png;base64," + readFileSync(join(srcDir, "eliz-run-a.png")).toString("base64");

for (const [name, prompt] of Object.entries(FRAMES)) {
  const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input: { prompt: `${prompt} ${STYLE} ${NEG}`, aspect_ratio: "3:4", output_format: "png", image_input: [ref] } }),
  });
  const body = await res.json();
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!res.ok || !url || body.status === "failed") {
    console.error(`GEN fallo ${name}: ${JSON.stringify(body).slice(0, 240)}`);
    continue;
  }
  const img = await fetch(url);
  writeFileSync(join(srcDir, `eliz-${name}.png`), Buffer.from(await img.arrayBuffer()));
  console.log(`GEN ok eliz-${name}`);
}
console.log("HECHO");
