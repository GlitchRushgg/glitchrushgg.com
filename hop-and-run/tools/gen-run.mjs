// Focused regenerator for Cristian's RUN CYCLE (fixes stiff run: old frames
// 1/3/4 were the same "leg forward" pose). Generates 4 clearly distinct run
// PHASES via nano-banana with reference images for character consistency, then
// cuts the background. Writes to assets/art/_try/<pose>-<n>.png (+ -cut.png) so
// each roll is inspectable and we never clobber a good frame.
//
// Usage:  node gen-run.mjs <pose> <n>     e.g.  node gen-run.mjs contact 1
//         node gen-run.mjs all 1          (all four poses, attempt 1)
// Token from env REPLICATE_API_TOKEN. Same budget discipline as generate-art.mjs.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const artDir = join(here, "..", "assets", "art");
const tryDir = join(artDir, "_try");
const refsDir = join(here, "..", "assets", "refs");
mkdirSync(tryDir, { recursive: true });

const token = process.env.REPLICATE_API_TOKEN;
if (!token) { console.error("Falta REPLICATE_API_TOKEN"); process.exit(1); }

const STYLE =
  "STYLE: stylized 3D video game asset render, Fortnite/Pixar hybrid style, clean " +
  "game-engine look, soft rim lighting, vibrant saturated colors, plain flat light-grey " +
  "studio background for easy cutout, high detail, no photorealism.";
const NEGATIVE =
  "NEGATIVE PROMPT (strictly avoid): photorealistic, realistic skin, uncanny, dark, scary, " +
  "extra fingers, deformed hands, text, watermark, logo, frame, border, motion blur, " +
  "different character, white shirt, torn clothes, cropped feet, cut-off legs.";
const CRISTIAN =
  "Cristian, a friendly 15-year-old teenage boy video game hero. EXACTLY the same character " +
  "as the reference images: very tall and lanky, long legs, warm light-tan Latino skin, " +
  "tousled wavy medium-length dark-brown hair, big bright confident smile, bright GREEN eyes, " +
  "modern eyeglasses. Outfit (keep identical every frame): NAVY-BLUE explorer hoodie over a " +
  "YELLOW t-shirt, wide knee-length brown hiking cargo shorts with big side pockets, sturdy " +
  "sneakers, small tan explorer backpack.";
const SIDE =
  "FULL SIDE PROFILE VIEW, his body faces and moves to the RIGHT the whole time. Full body " +
  "head-to-toe, both feet in frame, centered, generous margin above the hair and below the " +
  "shoes so nothing is cropped. 2D platformer running-sprite framing.";

// Four DISTINCT phases of one running stride. Same lead leg each loop (a clean
// stylized side-run) but four very different body heights & leg configs so the
// cycle actually reads as running instead of a repeated single pose.
const POSES = {
  contact: `${CRISTIAN} ${SIDE} RUN CYCLE — PHASE 1 of 4, GROUND CONTACT: his right foot has just planted flat on the ground directly under his hips taking his full weight, right leg nearly straight, LEFT leg swung back behind him with the knee bent and the heel lifted off the ground. Torso upright with a slight forward lean. LEFT arm bent and swung forward, RIGHT arm bent and swung back. Body at normal standing height. Happy determined face. ${STYLE} ${NEGATIVE}`,
  recoil: `${CRISTIAN} ${SIDE} RUN CYCLE — PHASE 2 of 4, RECOIL / LOWEST POINT: the moment right after landing, his right support leg is BENT deeply absorbing the impact so his whole body is at its LOWEST crouched height, hips dropped, LEFT leg folded up starting to swing forward with a bent knee, both arms mid-swing close to the torso, compressed springy energy. ${STYLE} ${NEGATIVE}`,
  passing: `${CRISTIAN} ${SIDE} RUN CYCLE — PHASE 3 of 4, PASSING: his body rises and passes straight over the vertical right support leg (right leg straight under the hips), his LEFT knee driving UP HIGH in front of him, thigh near horizontal, body at mid height and lifting, arms swinging in strong opposition. ${STYLE} ${NEGATIVE}`,
  flight: `${CRISTIAN} ${SIDE} RUN CYCLE — PHASE 4 of 4, FLIGHT / HIGHEST POINT: push-off, BOTH FEET clearly OFF the ground, airborne at the highest point of the stride, RIGHT leg extended back and up behind him after pushing off, LEFT leg reaching forward with a bent knee, hair and hoodie lifted upward by the leap, joyful. ${STYLE} ${NEGATIVE}`,
};

const REFS = ["cristian-running.png", "cristian-profile.png", "cristian-front.png"]
  .filter((r) => existsSync(join(refsDir, r)));
const dataUri = (rel) => "data:image/png;base64," + readFileSync(join(refsDir, rel)).toString("base64");

async function fetchRetry(url, opts, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try { return await fetch(url, opts); }
    catch (e) {
      if (i === tries) throw e;
      console.error(`  red caída (${e.cause?.code || e.message}), reintento ${i}...`);
      await new Promise((r) => setTimeout(r, 4000 * i));
    }
  }
}

async function genOne(pose, n) {
  const prompt = POSES[pose];
  if (!prompt) { console.error(`pose desconocida: ${pose}`); return; }
  const raw = join(tryDir, `${pose}-${n}.png`);
  const cut = join(tryDir, `${pose}-${n}-cut.png`);
  if (existsSync(raw)) { console.log(`(existe ${pose}-${n}, salto gen)`); }
  else {
    const res = await fetchRetry("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
      body: JSON.stringify({ input: {
        prompt, aspect_ratio: "3:4", output_format: "png",
        image_input: REFS.map(dataUri),
      } }),
    });
    const body = await res.json();
    if (!res.ok || body.error || body.status === "failed") {
      console.error(`FALLO gen ${pose}-${n} (HTTP ${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
      return;
    }
    const url = Array.isArray(body.output) ? body.output[0] : body.output;
    if (!url) { console.error(`Sin output ${pose}-${n}`); return; }
    writeFileSync(raw, Buffer.from(await (await fetchRetry(url)).arrayBuffer()));
    console.log(`GEN ok ${pose}-${n}`);
  }
  // Cut background.
  if (!existsSync(cut)) {
    const res = await fetchRetry("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
      body: JSON.stringify({
        version: "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
        input: { image: "data:image/png;base64," + readFileSync(raw).toString("base64"), format: "png" },
      }),
    });
    const body = await res.json();
    if (!res.ok || body.error || body.status === "failed") {
      console.error(`FALLO cut ${pose}-${n}: ${JSON.stringify(body).slice(0, 300)}`);
      return;
    }
    const url = Array.isArray(body.output) ? body.output[0] : body.output;
    writeFileSync(cut, Buffer.from(await (await fetchRetry(url)).arrayBuffer()));
    console.log(`CUT ok ${pose}-${n}`);
  }
}

const pose = process.argv[2];
const n = process.argv[3] || "1";
if (!pose) { console.error("uso: node gen-run.mjs <contact|recoil|passing|flight|all> <n>"); process.exit(1); }
const list = pose === "all" ? Object.keys(POSES) : [pose];
for (const p of list) await genOne(p, n);
console.log(`refs usadas: ${REFS.join(", ")}`);
console.log("LISTO");
