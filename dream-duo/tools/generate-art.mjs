// DREAM DUO — pipeline de arte vía Replicate.
// nano-banana (~$0.039/img) para generar + 851-labs/background-remover (~$0.007)
// para recortar sprites. Resumible: salta lo que ya existe en assets/art-src/.
// Tope duro de gasto: $10 (presupuesto de la fundadora). Token de env REPLICATE_API_TOKEN.
// Uso: node generate-art.mjs [--only nombre] [--list]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "..", "assets", "art-src");   // maestros sin comprimir (gitignored)
const canonDir = join(here, "..", "..", "games", "elizabeth-flofy", "assets", "canon");
mkdirSync(srcDir, { recursive: true });

const token = process.env.REPLICATE_API_TOKEN;
if (!token) { console.error("Falta REPLICATE_API_TOKEN"); process.exit(1); }

const COST_GEN = 0.039, COST_CUT = 0.007, BUDGET = 10.0;
let spent = 0;
const ledgerFile = join(here, ".ledger.json");
if (existsSync(ledgerFile)) spent = JSON.parse(readFileSync(ledgerFile, "utf8")).spent || 0;
function charge(c) {
  spent += c;
  writeFileSync(ledgerFile, JSON.stringify({ spent: +spent.toFixed(3) }));
  if (spent > BUDGET) { console.error(`TOPE DE PRESUPUESTO ($${BUDGET}) alcanzado: $${spent.toFixed(2)}`); process.exit(2); }
}

const STYLE =
  "STYLE: stylized 3D video game render, Fortnite/Pixar hybrid style, clean game-engine look, " +
  "soft rim lighting, vibrant saturated colors, high detail, no photorealism.";
const NEG =
  "NEGATIVE PROMPT (strictly avoid): photorealistic, realistic skin, real child, uncanny, dark, " +
  "scary, extra fingers, deformed hands, text, letters, watermark, logo.";
const ISO = "Single isolated subject, full subject visible with margin, centered, on a plain flat light-grey studio background, no floor shadow.";

const ELIZ = "the same 6-year-old girl from the reference image: golden-blonde yellow hair in two braided pigtails with pink hair ties, brown eyes, freckles, pink hoodie with white bunny emblem, yellow t-shirt, dark leggings, pink-and-white sneakers, small tan backpack";
const FLOFY = "the same white plush bunny from the reference image: cream-white shaggy fur, long floppy ears, grey embroidered nose, black bead eyes, huggable stuffed-animal body, faint golden sparkles";
const FAIRY = "the same fairy girl from the reference image: 6-year-old, golden-blonde braided pigtails, freckles, pastel sparkly fairy dress with white bunny emblem, large glittering translucent fairy wings, star-tipped wand, golden glitter";

// ref: nombres de archivo del canon existente (se mandan como data-URI)
const IMAGES = {
  // --- Elizabeth side-view (carril del parque) ---
  "eliz-run-a":   { p: `${ELIZ}. Full SIDE VIEW facing RIGHT, dynamic running stride, RIGHT leg forward and left leg trailing back, arms pumping, braids flying behind, determined happy expression. ${ISO}`, refs: ["elizabeth-running.png", "elizabeth-front.png"], cut: true },
  "eliz-run-b":   { p: `${ELIZ}. Full SIDE VIEW facing RIGHT, dynamic running stride, LEFT leg forward and right leg trailing back, opposite arm swing, braids flying behind, determined happy expression. ${ISO}`, refs: ["elizabeth-running.png", "elizabeth-front.png"], cut: true },
  "eliz-jump":    { p: `${ELIZ}. Full SIDE VIEW facing RIGHT, mid-air jump with knees tucked up, arms raised for balance, braids floating upward, joyful brave expression. ${ISO}`, refs: ["elizabeth-running.png", "elizabeth-front.png"], cut: true },
  "eliz-fairy-fly": { p: `${FAIRY}. Full SIDE VIEW facing RIGHT, flying horizontally with wings spread wide, one arm forward holding the star wand leaving a sparkle trail, legs trailing behind, joyful heroic expression. ${ISO}`, refs: ["elizabeth-skin-fairy.png"], cut: true },
  // --- Flofy side-view (carril del sueño) ---
  "flofy-hop":    { p: `${FLOFY}. Full SIDE VIEW facing RIGHT, mid-air bouncy hop with tiny paws tucked, ears flying up, cheerful determined face, small golden sparkle trail. ${ISO}`, refs: ["flofy-jumping.png", "flofy-front.png"], cut: true },
  "flofy-fall":   { p: `${FLOFY}. Full SIDE VIEW facing RIGHT, floating gently downward like a parachute, ears spread wide upward catching the air, calm happy face, golden sparkles. ${ISO}`, refs: ["flofy-jumping.png", "flofy-front.png"], cut: true },
  // --- Obstáculos del parque ---
  "ob-hedge":     { p: `A neat rectangular trimmed garden hedge bush, bright green leaves, video game obstacle prop, side view. ${ISO}`, refs: [], cut: true },
  "ob-bench":     { p: `A wooden park bench with green cast-iron legs, video game obstacle prop, perfect side view. ${ISO}`, refs: [], cut: true },
  "ob-birdbath":  { p: `A tall stone garden birdbath fountain with a little water, video game obstacle prop, side view. ${ISO}`, refs: [], cut: true },
  "ob-pigeon":    { p: `A plump grey city pigeon flying with wings spread mid-flap, video game obstacle sprite, side view facing LEFT. ${ISO}`, refs: [], cut: true },
  // --- Obstáculos del sueño ---
  "ob-cloud":     { p: `A grumpy little pastel-purple storm cloud with an annoyed cartoon face and tiny lightning spark below, cute video game obstacle sprite. ${ISO}`, refs: [], cut: true },
  "ob-blocks":    { p: `A tall wobbly tower of three stacked wooden toy alphabet blocks (no letters, just colorful shapes), cute video game obstacle prop. ${ISO}`, refs: [], cut: true },
  "ob-top":       { p: `A colorful striped wooden spinning top toy, spinning fast with motion tilt, cute video game obstacle sprite, side view. ${ISO}`, refs: [], cut: true },
  "ob-bubble":    { p: `A big translucent iridescent soap bubble with a soft rainbow sheen, round, cute video game obstacle sprite. ${ISO}`, refs: [], cut: true },
  // --- Fondos 16:9 (franja por mundo y bioma) ---
  "bg-park-day":    { p: `Wide seamless side-scrolling video game background strip: a sunny city park at midday, green lawns, colorful flower beds, distant trees and a playground silhouette, path in the foreground, clear blue sky with puffy clouds. Soft depth, no characters. ${STYLE}`, refs: [], aspect: "16:9" },
  "bg-park-sunset": { p: `Wide seamless side-scrolling video game background strip: the same city park at golden sunset, warm orange-pink sky, long shadows, glowing lamp posts turning on, distant trees. No characters. ${STYLE}`, refs: [], aspect: "16:9" },
  "bg-park-night":  { p: `Wide seamless side-scrolling video game background strip: the same city park at night, deep blue sky with stars and a big full moon, glowing lamp posts, fireflies. Cozy not scary. No characters. ${STYLE}`, refs: [], aspect: "16:9" },
  "bg-dream-day":   { p: `Wide seamless side-scrolling video game background strip: a pastel dreamland in the sky, fluffy pink and mint cotton-candy clouds, floating toy islands, soft rainbows, gentle sparkles. No characters. ${STYLE}`, refs: [], aspect: "16:9" },
  "bg-dream-sunset":{ p: `Wide seamless side-scrolling video game background strip: a golden dreamland in the sky at sunset, amber and honey clouds, floating toy balloons and kites glowing warm, sparkles. No characters. ${STYLE}`, refs: [], aspect: "16:9" },
  "bg-dream-night": { p: `Wide seamless side-scrolling video game background strip: a starry dreamland at night, deep indigo sky full of big glittering stars, glowing crescent moons, floating glowing toy islands, aurora ribbons. Magical not scary. No characters. ${STYLE}`, refs: [], aspect: "16:9" },
};

// Recortes extra de canon ya existente (solo rembg, sin generación)
const CANON_CUTS = ["mama-running", "papa-running", "cristian-running", "elizabeth-skin-fairy", "flofy-front"];

const toDataUri = (p) => "data:image/png;base64," + readFileSync(p).toString("base64");

async function nano(name, spec) {
  const out = join(srcDir, `${name}.png`);
  if (existsSync(out)) { console.log(`skip ${name} (ya existe)`); return true; }
  const input = {
    prompt: `${spec.p} ${STYLE} ${NEG}`,
    aspect_ratio: spec.aspect ?? "3:4",
    output_format: "png",
  };
  const refs = (spec.refs || []).map((f) => toDataUri(join(canonDir, f)));
  if (refs.length) input.image_input = refs;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
      body: JSON.stringify({ input }),
    });
    const body = await res.json();
    charge(COST_GEN);
    const url = Array.isArray(body.output) ? body.output[0] : body.output;
    if (res.ok && url && body.status !== "failed") {
      const img = await fetch(url);
      writeFileSync(out, Buffer.from(await img.arrayBuffer()));
      console.log(`GEN ok ${name} ($${spent.toFixed(2)})`);
      return true;
    }
    console.error(`GEN fallo ${name} intento ${attempt}: HTTP ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  return false;
}

async function cut(srcPath, outPath, label) {
  if (existsSync(outPath)) { console.log(`skip cut ${label}`); return true; }
  const res = await fetch("https://api.replicate.com/v1/models/851-labs/background-remover/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input: { image: toDataUri(srcPath), format: "png" } }),
  });
  const body = await res.json();
  charge(COST_CUT);
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!res.ok || !url || body.status === "failed") {
    console.error(`CUT fallo ${label}: ${JSON.stringify(body).slice(0, 300)}`);
    return false;
  }
  const img = await fetch(url);
  writeFileSync(outPath, Buffer.from(await img.arrayBuffer()));
  console.log(`CUT ok ${label} ($${spent.toFixed(2)})`);
  return true;
}

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
if (process.argv.includes("--list")) { console.log(Object.keys(IMAGES).join("\n")); process.exit(0); }

let fails = 0;
for (const [name, spec] of Object.entries(IMAGES)) {
  if (only && name !== only) continue;
  const ok = await nano(name, spec);
  if (!ok) { fails++; continue; }
  if (spec.cut) {
    const ok2 = await cut(join(srcDir, `${name}.png`), join(srcDir, `${name}-cut.png`), name);
    if (!ok2) fails++;
  }
}
if (!only) {
  for (const c of CANON_CUTS) {
    const src = join(canonDir, `${c}.png`);
    const pre = join(canonDir, `${c}-cut.png`); // quizá ya recortado en canon
    const out = join(srcDir, `${c}-cut.png`);
    if (existsSync(pre) && !existsSync(out)) {
      writeFileSync(out, readFileSync(pre));
      console.log(`copy ${c}-cut (canon ya lo tenía)`);
    } else if (!existsSync(out)) {
      const ok = await cut(src, out, c);
      if (!ok) fails++;
    } else console.log(`skip cut ${c}`);
  }
}
console.log(`\nHECHO. Gastado: $${spent.toFixed(2)} / $${BUDGET}. Fallos: ${fails}`);
process.exit(fails ? 1 : 0);
