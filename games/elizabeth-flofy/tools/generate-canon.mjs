// Genera las imágenes canon de Elizabeth & Flofy vía Replicate (google/nano-banana).
// Uso:  node generate-canon.mjs <nombre>   (p.ej. elizabeth-front)
//       node generate-canon.mjs --list
// El token se lee SIEMPRE de la variable de entorno REPLICATE_API_TOKEN.
// Las URLs de salida de las imágenes madre se guardan en .state.json (no commitear)
// para usarlas como image_input en las imágenes hijas.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const canonDir = join(here, "..", "assets", "canon");
const stateFile = join(here, ".state.json");

const STYLE =
  "STYLE: stylized 3D video game character render, Fortnite/Pixar hybrid style, " +
  "clean game-engine look, soft rim lighting, vibrant saturated colors, simple " +
  "neutral studio background, full body visible, high detail, no photorealism";

// nano-banana no tiene campo negative_prompt: se incluye como instrucción en el texto.
const NEGATIVE =
  "NEGATIVE PROMPT (strictly avoid): photorealistic, realistic skin, real child, " +
  "uncanny, dark, scary, extra fingers, deformed hands, text, watermark";

const ELIZABETH =
  "A heroic 7-year-old girl video game character: light golden-brown hair in two " +
  "braided pigtails with small pink hair ties, big warm brown eyes, light freckles " +
  "on her cheeks, huge confident gap-toothed grin. Adventurer outfit: pink hoodie " +
  "with a white bunny emblem on the chest, yellow t-shirt underneath, dark leggings, " +
  "chunky pink-and-white sneakers, small tan explorer backpack.";

// Para la skin Caramelo el bloque sustituye el outfit (el resto idéntico).
const ELIZABETH_CANDY =
  "A heroic 7-year-old girl video game character: light golden-brown hair in two " +
  "braided pigtails with small pink hair ties, big warm brown eyes, light freckles " +
  "on her cheeks, huge confident gap-toothed grin. Candy adventurer outfit: pastel " +
  "candy-armor chest plate with a white bunny emblem made of frosting, lollipop staff " +
  "in one hand, same braided pigtails, same face. Standing in A-pose facing camera.";

const FLOFY =
  'Flofy, a white plush bunny video game companion: cream-white shaggy soft fur, ' +
  "long floppy ears, a grey embroidered oval nose, small black bead eyes, slightly " +
  'squished huggable body of a well-loved stuffed animal, faint golden "legendary ' +
  'item" glow with tiny sparkle particles around him.';

// Mamá de Elizabeth — personaje nuevo (no estaba en el doc; pedido por la fundadora).
// Venezolana, cabello castaño, ojos marrones, piel blanca, con lentes; outfit de
// aventurera a juego con Elizabeth (versión adulta). Mismo STYLE/NEGATIVE que el canon.
const MAMA =
  "Elizabeth's mother, a warm caring Venezuelan woman in her early thirties: " +
  "medium-length wavy chestnut brown hair, big warm brown eyes, fair light skin, " +
  "round eyeglasses, gentle confident smile. Adventurer outfit matching her daughter: " +
  "warm-toned explorer jacket over a yellow t-shirt, practical dark pants, sturdy " +
  "boots, a tan explorer backpack.";

const SAME = "Same exact character as the reference image. ";

const IMAGES = {
  "elizabeth-front": {
    prompt: `${ELIZABETH} Standing straight facing the camera in a relaxed A-pose, arms slightly away from her body, friendly smile, character-select-screen framing.`,
    refs: [],
  },
  "elizabeth-profile": {
    prompt: `${SAME}${ELIZABETH} Full side profile view facing right, standing straight, braided pigtail and backpack clearly visible from the side.`,
    refs: ["elizabeth-front"],
  },
  "elizabeth-running": {
    prompt: `${SAME}${ELIZABETH} Dynamic running pose mid-stride toward the camera at a slight angle, braids flying behind her, determined adventurous expression, motion energy.`,
    refs: ["elizabeth-front"],
  },
  "elizabeth-celebrating": {
    prompt: `${SAME}${ELIZABETH} Victory celebration pose: both fists raised to the sky, jumping with knees bent, eyes closed with pure joy, confetti particles around her.`,
    refs: ["elizabeth-front"],
  },
  "elizabeth-surprised": {
    prompt: `${SAME}${ELIZABETH} Frozen mid-step with wide eyes and mouth open in an "oh!" of surprise, hands slightly raised, leaning back a little, comic exaggerated expression.`,
    refs: ["elizabeth-front"],
  },
  "elizabeth-skin-candy": {
    prompt: `${SAME}${ELIZABETH_CANDY}`,
    refs: ["elizabeth-front"],
  },
  "flofy-front": {
    prompt: `${FLOFY} Sitting facing the camera like an item-shop display, ears relaxed, innocent expression.`,
    refs: [],
  },
  "flofy-jumping": {
    prompt: `${SAME}${FLOFY} Mid-air heroic leap with front paws stretched forward ready to hug, ears flying upward, golden sparkle trail behind him, determined cute face.`,
    refs: ["flofy-front"],
  },
  "flofy-offended": {
    prompt: `${SAME}${FLOFY} Sitting with his back half-turned to the camera, looking over his shoulder with narrowed bead eyes and one ear bent, classic offended-plushie meme pose.`,
    refs: ["flofy-front"],
  },
  "duo-hero": {
    prompt: `Same two characters as the reference images: ${ELIZABETH} and ${FLOFY} Elizabeth kneels on one knee with a confident grin while Flofy sits on her shoulder striking a tiny hero pose; behind them a colorful game world horizon and a subtle pink-purple glitch effect in one corner of the sky. Epic but adorable key-art composition.`,
    refs: ["elizabeth-front", "flofy-front"],
    aspect: "16:9", // key art horizontal para portada de canal / miniaturas
  },
  "mama-front": {
    prompt: `${MAMA} Standing straight facing the camera in a relaxed A-pose, arms slightly away from her body, friendly smile, character-select-screen framing.`,
    refs: [],
  },
  "mama-profile": {
    prompt: `${SAME}${MAMA} Full side profile view facing right, standing straight, eyeglasses and backpack clearly visible from the side.`,
    refs: ["mama-front"],
  },
  "mama-running": {
    prompt: `${SAME}${MAMA} Dynamic running pose mid-stride toward the camera at a slight angle, hair flowing, determined caring expression, motion energy.`,
    refs: ["mama-front"],
  },
};

const name = process.argv[2];
if (!name || name === "--list") {
  console.log(Object.keys(IMAGES).join("\n"));
  process.exit(0);
}
const spec = IMAGES[name];
if (!spec) {
  console.error(`Imagen desconocida: ${name}`);
  process.exit(1);
}

const token = process.env.REPLICATE_API_TOKEN;
if (!token) {
  console.error("Falta REPLICATE_API_TOKEN en el entorno.");
  process.exit(1);
}

const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {};
const imageInput = spec.refs.map((r) => {
  if (!state[r]) {
    console.error(`Falta la URL de la imagen madre "${r}" en .state.json — genérala primero.`);
    process.exit(1);
  }
  return state[r];
});

const input = {
  prompt: `${spec.prompt} ${STYLE} ${NEGATIVE}`,
  aspect_ratio: spec.aspect ?? "3:4",
  output_format: "png",
};
if (imageInput.length) input.image_input = imageInput;

console.log(`Generando ${name} (refs: ${spec.refs.join(", ") || "ninguna"})...`);
const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "wait",
  },
  body: JSON.stringify({ input }),
});
const body = await res.json();
if (!res.ok || body.error || body.status === "failed") {
  console.error(`Error de Replicate (HTTP ${res.status}):`, JSON.stringify(body, null, 2));
  process.exit(1);
}
const url = Array.isArray(body.output) ? body.output[0] : body.output;
if (!url) {
  console.error("La predicción no devolvió output:", JSON.stringify(body, null, 2));
  process.exit(1);
}

mkdirSync(canonDir, { recursive: true });
const img = await fetch(url);
if (!img.ok) {
  console.error(`No se pudo descargar ${url} (HTTP ${img.status})`);
  process.exit(1);
}
const file = join(canonDir, `${name}.png`);
writeFileSync(file, Buffer.from(await img.arrayBuffer()));

state[name] = url;
writeFileSync(stateFile, JSON.stringify(state, null, 2));
console.log(`OK -> ${file}`);
console.log(`URL: ${url}`);
