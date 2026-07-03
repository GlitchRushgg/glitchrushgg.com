// Genera TODO el arte de Hop & Run vía Replicate (google/nano-banana) y recorta
// el fondo (851-labs/background-remover) de sprites e ítems.
// Uso:  node generate-art.mjs           → genera lo que falte y recorta
//       node generate-art.mjs --list    → lista las piezas
// Token SIEMPRE de env REPLICATE_API_TOKEN. Reanudable: salta archivos existentes.
// PRESUPUESTO: contador de coste con tope duro (~20€); nano-banana ≈ $0.039/img.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const artDir = join(here, "..", "assets", "art");
const refsDir = join(here, "..", "assets", "refs");
const stateFile = join(here, ".state.json");

const COST_PER_GEN = 0.039;     // USD, google/nano-banana
const COST_PER_CUT = 0.005;     // USD aprox, background-remover (margen alto)
const BUDGET_USD = 21.0;        // tope duro ≈ 20€
let spent = 0;

const token = process.env.REPLICATE_API_TOKEN;
if (!token) { console.error("Falta REPLICATE_API_TOKEN"); process.exit(1); }

const STYLE =
  "STYLE: stylized 3D video game asset render, Fortnite/Pixar hybrid style, clean " +
  "game-engine look, soft rim lighting, vibrant saturated colors, plain flat light-grey " +
  "studio background for easy cutout, high detail, no photorealism.";

const NEGATIVE =
  "NEGATIVE PROMPT (strictly avoid): photorealistic, realistic skin, uncanny, dark, " +
  "scary, extra fingers, deformed hands, text, watermark, logo, frame, border.";

// Cristian ahora tiene 15 años (orden de la fundadora 2026-07-04).
const CRISTIAN =
  "Cristian, a friendly 15-year-old teenage boy video game hero. Same exact character " +
  "as the reference images: very tall and lanky, long legs, warm light-tan Latino skin, " +
  "tousled wavy medium-length dark-brown hair, big bright confident smile, bright GREEN " +
  "eyes, modern eyeglasses. Outfit: navy-blue explorer hoodie over a yellow t-shirt, " +
  "wide knee-length hiking cargo shorts with big side pockets, sturdy sneakers, small " +
  "tan explorer backpack. Cool skater-teen vibe.";

const SIDE = "FULL SIDE VIEW facing RIGHT, full body visible head to toe, 2D platformer " +
  "game sprite framing, feet clearly visible";

const ITEM = "Single video game item, centered, floating on a plain flat light-grey " +
  "studio background, no shadows on the ground, collectible-icon framing";

const ART = {
  // ---- Cristian: ciclo de carrera de 4 frames (¡las piernas se mueven!) ----
  "cristian-run-1": { refs: ["cristian-front.png", "cristian-profile.png"], cut: true,
    prompt: `${CRISTIAN} ${SIDE}. RUN CYCLE FRAME 1 of 4 — CONTACT POSE: right leg planted forward on the ground taking his weight, left leg trailing far behind with bent knee, left arm swinging forward, right arm back, torso leaning slightly forward, mid-run energy.` },
  "cristian-run-2": { refs: ["cristian-front.png", "cristian-profile.png"], cut: true,
    prompt: `${CRISTIAN} ${SIDE}. RUN CYCLE FRAME 2 of 4 — PASSING POSE: both legs passing under the body, right leg straight under hips, left knee lifting and crossing past it, arms close to the torso mid-swing, bouncing upward slightly.` },
  "cristian-run-3": { refs: ["cristian-front.png", "cristian-profile.png"], cut: true,
    prompt: `${CRISTIAN} ${SIDE}. RUN CYCLE FRAME 3 of 4 — CONTACT POSE MIRRORED: left leg planted forward on the ground taking his weight, right leg trailing far behind with bent knee, right arm swinging forward, left arm back, torso leaning slightly forward.` },
  "cristian-run-4": { refs: ["cristian-front.png", "cristian-profile.png"], cut: true,
    prompt: `${CRISTIAN} ${SIDE}. RUN CYCLE FRAME 4 of 4 — FLIGHT POSE: both feet OFF the ground mid-stride, left leg reaching forward, right leg pushed back, hair and hoodie bouncing, airborne running moment.` },
  "cristian-jump": { refs: ["cristian-front.png", "cristian-profile.png"], cut: true,
    prompt: `${CRISTIAN} ${SIDE}. JUMP POSE: leaping high mid-air, both knees tucked up toward the chest, arms raised for balance, hoodie and hair flying up, joyful determined face.` },
  "cristian-skate": { refs: ["cristian-front.png", "cristian-profile.png"], cut: true,
    prompt: `${CRISTIAN} ${SIDE}. Riding a cool cyan-and-orange SKATEBOARD at high speed: knees bent in surf stance on the board, arms out for balance, hair blown back, confident grin, small speed lines behind him.` },
  "cristian-guitar": { refs: ["cristian-front.png", "cristian-profile.png"], cut: true,
    prompt: `${CRISTIAN} ${SIDE}. ROCKSTAR POWER POSE: shredding an electric guitar (cherry-red rock guitar), leaning back with one leg kicked forward, lightning-bolt energy sparks flying from the guitar, epic super-power moment, mouth open shouting with joy.` },
  "cristian-hurt": { refs: ["cristian-front.png", "cristian-profile.png"], cut: true,
    prompt: `${CRISTIAN} ${SIDE}. STUMBLE POSE: tripping forward comically, arms windmilling, one leg up behind him, glasses slightly askew, wide surprised eyes, cartoon dizzy stars around his head.` },
  "cristian-celebrate": { refs: ["cristian-front.png", "cristian-profile.png"], cut: true,
    prompt: `${CRISTIAN} Victory celebration: both fists raised to the sky, jumping with knees bent, eyes closed with a huge grin, confetti particles around him. Facing camera at a slight angle, full body.` },

  // ---- Mundo: tejados (plataformas) y skylines por sector ----
  "rooftop-day": { aspect: "16:9",
    prompt: `SEAMLESS TEXTURE that fills the ENTIRE image edge to edge with NO background visible and NO empty margins: the top 25% of the image is a horizontal band of warm terracotta roof tiles seen from the side (a flat rooftop surface a game character runs on), the remaining 75% below is weathered cream stucco wall with exposed brick patches and one small blue shuttered window. Flat orthographic 2D side view, video game platform texture, bright daylight colors, crops off at all four edges. ${STYLE.replace("plain flat light-grey studio background for easy cutout, ", "")}` },
  "rooftop-sunset": { aspect: "16:9",
    prompt: `SEAMLESS TEXTURE that fills the ENTIRE image edge to edge with NO background visible and NO empty margins: the top 25% of the image is a horizontal band of orange-pink sunset-lit terracotta roof tiles seen from the side (a flat rooftop surface a game character runs on), the remaining 75% below is warm purple-shaded stucco wall with brick patches and one small round window. Flat orthographic 2D side view, video game platform texture, golden hour glow, crops off at all four edges. ${STYLE.replace("plain flat light-grey studio background for easy cutout, ", "")}` },
  "rooftop-night": { aspect: "16:9",
    prompt: `SEAMLESS TEXTURE that fills the ENTIRE image edge to edge with NO background visible and NO empty margins: the top 25% of the image is a horizontal band of moonlit blue terracotta roof tiles seen from the side (a flat rooftop surface a game character runs on), the remaining 75% below is dark indigo stucco wall with brick patches and one small warm glowing window. Flat orthographic 2D side view, video game platform texture, cozy night mood, crops off at all four edges. ${STYLE.replace("plain flat light-grey studio background for easy cutout, ", "")}` },
  "skyline-day": { aspect: "16:9",
    prompt: `Wide 2D parallax BACKGROUND layer for a platformer: a charming Mediterranean city skyline of colorful houses, domes and towers on the horizon under a bright blue sky with puffy clouds, soft simple shapes, no foreground elements, painterly clean game background, no characters. ${STYLE.replace("plain flat light-grey studio background for easy cutout, ", "")}` },
  "skyline-sunset": { aspect: "16:9",
    prompt: `Wide 2D parallax BACKGROUND layer for a platformer: a Mediterranean city skyline silhouetted against a dramatic orange-pink sunset sky with streaks of golden clouds, warm purple building shapes, no foreground elements, painterly clean game background, no characters. ${STYLE.replace("plain flat light-grey studio background for easy cutout, ", "")}` },
  "skyline-night": { aspect: "16:9",
    prompt: `Wide 2D parallax BACKGROUND layer for a platformer: a Mediterranean city skyline at night, deep indigo sky with a big glowing full moon and stars, buildings with tiny warm lit windows, no foreground elements, painterly clean game background, no characters. ${STYLE.replace("plain flat light-grey studio background for easy cutout, ", "")}` },

  // ---- Frutas (energía, estilo Adventure Island) ----
  "fruit-apple": { cut: true, prompt: `${ITEM}: a shiny red apple with a green leaf, juicy and appetizing cartoon style. ${STYLE}` },
  "fruit-banana": { cut: true, prompt: `${ITEM}: a bright yellow banana, slightly curved, cartoon juicy style. ${STYLE}` },
  "fruit-orange": { cut: true, prompt: `${ITEM}: a bright orange with a green leaf, cartoon juicy style. ${STYLE}` },
  "fruit-melon": { cut: true, prompt: `${ITEM}: a juicy watermelon slice with red flesh and black seeds, cartoon style. ${STYLE}` },

  // ---- Animalitos a rescatar ----
  "animal-kitten": { cut: true, prompt: `${ITEM}: an adorable tiny orange tabby kitten sitting and looking up with huge hopeful eyes, cute video game companion. ${STYLE}` },
  "animal-puppy": { cut: true, prompt: `${ITEM}: an adorable tiny beagle puppy sitting with floppy ears and huge hopeful eyes, cute video game companion. ${STYLE}` },
  "animal-chick": { cut: true, prompt: `${ITEM}: an adorable fluffy yellow baby chick standing with tiny wings, huge hopeful eyes, cute video game companion. ${STYLE}` },

  // ---- Power-ups ----
  "item-skateboard": { cut: true, prompt: `${ITEM}: a cool cyan-and-orange skateboard with flame decals, floating at a slight angle, glowing power-up aura. ${STYLE}` },
  "item-guitar": { cut: true, prompt: `${ITEM}: a cherry-red electric rock guitar with lightning-bolt decals, floating at a slight angle, glowing golden power-up aura with tiny sparks. ${STYLE}` },

  // ---- Obstáculos ----
  "obstacle-crate": { cut: true, prompt: `${ITEM}: a weathered wooden crate with metal corner braces, chunky cartoon proportions, platformer obstacle. ${STYLE}` },
  "obstacle-pigeon": { cut: true, prompt: `${ITEM}: a chunky grumpy grey pigeon flying with spread wings, FULL SIDE VIEW facing LEFT, cartoon style platformer obstacle. ${STYLE}` },

  // ---- Key art ----
  "key-art": { aspect: "16:9", refs: ["cristian-front.png"],
    prompt: `Epic video game key art: ${CRISTIAN} leaping between sunlit Mediterranean rooftops with an electric guitar slung on his back, fruits and a tiny kitten visible on the rooftop ahead, dramatic sunset sky, dynamic action composition, no text, no logo. ${STYLE.replace("plain flat light-grey studio background for easy cutout, ", "")}` },
};

const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {};
mkdirSync(artDir, { recursive: true });

// fetch con reintentos (la red flaquea a veces: UND_ERR_CONNECT_TIMEOUT).
async function fetchRetry(url, opts, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fetch(url, opts);
    } catch (e) {
      if (i === tries) throw e;
      console.error(`  red caída (${e.cause?.code || e.message}), reintento ${i}/${tries - 1}...`);
      await new Promise((r) => setTimeout(r, 4000 * i));
    }
  }
}

function dataUri(rel) {
  return "data:image/png;base64," + readFileSync(join(refsDir, rel)).toString("base64");
}

async function generate(name, spec) {
  const outFile = join(artDir, `${name}.png`);
  if (existsSync(outFile)) return true;
  if (spent + COST_PER_GEN > BUDGET_USD) { console.error("TOPE DE PRESUPUESTO alcanzado"); process.exit(2); }
  const input = {
    prompt: `${spec.prompt} ${NEGATIVE}`,
    aspect_ratio: spec.aspect ?? "3:4",
    output_format: "png",
  };
  if (spec.refs?.length) input.image_input = spec.refs.map(dataUri);
  const res = await fetchRetry("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input }),
  });
  const body = await res.json();
  spent += COST_PER_GEN;
  if (!res.ok || body.error || body.status === "failed") {
    console.error(`FALLO gen ${name} (HTTP ${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
    return false;
  }
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!url) { console.error(`Sin output: ${name}`); return false; }
  const img = await fetchRetry(url);
  writeFileSync(outFile, Buffer.from(await img.arrayBuffer()));
  state[name] = url;
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
  console.log(`GEN ok ${name} (gastado ~$${spent.toFixed(2)})`);
  return true;
}

async function cut(name) {
  const src = join(artDir, `${name}.png`);
  const outFile = join(artDir, `${name}-cut.png`);
  if (!existsSync(src) || existsSync(outFile)) return;
  if (spent + COST_PER_CUT > BUDGET_USD) { console.error("TOPE DE PRESUPUESTO alcanzado"); process.exit(2); }
  // El endpoint por-modelo devuelve 404 para modelos community (jul 2026):
  // hay que usar /v1/predictions con la version pinneada.
  const res = await fetchRetry("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({
      version: "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
      input: { image: "data:image/png;base64," + readFileSync(src).toString("base64"), format: "png" },
    }),
  });
  const body = await res.json();
  spent += COST_PER_CUT;
  if (!res.ok || body.error || body.status === "failed") {
    console.error(`FALLO cut ${name}: ${JSON.stringify(body).slice(0, 300)}`);
    return;
  }
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  const img = await fetchRetry(url);
  writeFileSync(outFile, Buffer.from(await img.arrayBuffer()));
  console.log(`CUT ok ${name} (gastado ~$${spent.toFixed(2)})`);
}

if (process.argv[2] === "--list") {
  console.log(Object.keys(ART).join("\n"));
  process.exit(0);
}

for (const [name, spec] of Object.entries(ART)) {
  const ok = await generate(name, spec);
  if (ok && spec.cut) await cut(name);
}
console.log(`LISTO. Gasto total estimado: ~$${spent.toFixed(2)}`);
