// ELIZABETH'S WORLD — muebles y comidas vía Replicate (nano-banana) sobre
// VERDE CHROMA (recorte local limpio, sin API de rembg). Resumible.
// Tope de gasto $6. Token env REPLICATE_API_TOKEN.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "..", "assets", "art-src");
mkdirSync(srcDir, { recursive: true });
const token = process.env.REPLICATE_API_TOKEN;
if (!token) { console.error("Falta REPLICATE_API_TOKEN"); process.exit(1); }

const COST = 0.039, BUDGET = 6.0;
let spent = 0;
const ledger = join(here, ".ledger.json");
if (existsSync(ledger)) spent = JSON.parse(readFileSync(ledger, "utf8")).spent || 0;

const STYLE = "STYLE: cute stylized 3D video game prop render, Fortnite/Pixar hybrid toy-like look, soft rounded shapes, vibrant saturated colors, kid-friendly, high detail, no photorealism, no text.";
const GREEN = "Single isolated object, fully visible with margin, centered, on a SOLID FLAT PURE BRIGHT GREEN chroma-key background (#00ff00), no floor, no shadow.";
const NEG = "AVOID: photorealism, dark, scary, text, letters, watermark, humans, green tint on the object itself.";

const P = {
  // --- salón ---
  "sofa":      "A cozy rounded family sofa, warm coral-pink fabric with yellow cushions, front view.",
  "tv":        "A cute retro-modern TV on a low wooden media stand, screen showing a soft blue glow, front view.",
  "lamp":      "A friendly floor lamp with a warm glowing shade, slim wooden leg, front view.",
  "plant":     "A happy potted plant with big round leaves in a terracotta pot, front view.",
  "bookshelf": "A small colorful bookshelf with toy-like books and a tiny plush on top, front view.",
  "toybox":    "An open wooden toy box overflowing with colorful toys (ball, blocks, teddy arm peeking), front view.",
  "rug":       "A soft oval rug with pastel rainbow rings, seen at a slight angle so it reads as lying on the floor.",
  // --- cocina ---
  "fridge":       "A cute mint-green retro refrigerator, CLOSED door with silver handle, front view.",
  "fridge-open":  "The same cute mint-green retro refrigerator with the door WIDE OPEN showing bright empty shelves inside, front view.",
  "stove":        "A cheerful little kitchen stove, cream and red, with an empty frying pan on top, front view.",
  "sink":         "A cute kitchen sink counter unit with a tall silver faucet and light blue cabinet doors, front view.",
  "ktable":       "A small round wooden kitchen table with a red-and-white checkered tablecloth, front view.",
  "fruitbowl":    "A bowl with colorful fruit (apple, banana, orange) on it, front view.",
  // --- dormitorio ---
  "bed":       "A cozy kids bed with a pink blanket with a white bunny emblem and yellow pillow, front-side view.",
  "wardrobe":  "A cute lavender wardrobe with round knobs and a heart detail, front view.",
  "desk":      "A small study desk with crayons and paper on it, warm wood, front view.",
  "teddy":     "A soft brown teddy bear sitting, front view.",
  "starlamp":  "A kids night lamp shaped like a glowing golden star on a little base, front view.",
  // --- jardín ---
  "swing":     "A cheerful garden swing with wooden seat hanging from a red A-frame, front view.",
  "tree":      "A friendly round garden tree with lush green foliage and a few red apples, front view.",
  "flowerbed": "A small flower bed with colorful daisies and tulips, front view.",
  "doghouse":  "A cute red doghouse with a bone sign above the round door (no text), front view.",
  "bbq":       "A small cute garden barbecue grill, front view.",
  // --- comidas (pequeñas) ---
  "cake":      "A slice of strawberry cake on a tiny plate.",
  "bread":     "A slice of raw white bread.",
  "toast":     "A golden toasted bread slice with happy warmth.",
  "cookie":    "A chocolate chip cookie.",
  "egg":       "A raw egg, whole in its shell.",
  "friedegg":  "A sunny-side-up fried egg with a golden yolk.",
  "carrot":    "A bright orange carrot with a green top.",
  "milk":      "A cute small milk carton (no text, just a white and blue carton with a cow spot pattern).",
  // --- AMPLIACIÓN (pedido fundadora: más unidades) ---
  // salón+
  "armchair":    "A comfy rounded armchair, teal fabric with a yellow cushion, front view.",
  "coffeetable": "A low round wooden coffee table with a tiny succulent on top, front view.",
  "radio":       "A cute retro radio, cream and orange with round dials, front view.",
  "aquarium":    "A small aquarium tank on a stand with two happy goldfish and bubbles, front view.",
  "cuckoo":      "A charming wooden cuckoo wall clock with a tiny bird door, front view.",
  // cocina+
  "blender":     "A cute countertop blender with a pink smoothie inside, front view.",
  "pot":         "A red cooking pot with steam and a wooden spoon, front view.",
  "pancakes":    "A stack of fluffy pancakes with syrup and a butter square on a plate.",
  "juice":       "A glass of orange juice with a striped straw.",
  "teapot":      "A cute mint teapot with tiny flower details, front view.",
  "cupcake":     "A pink frosted cupcake with rainbow sprinkles.",
  "pizza":       "A whole happy pizza with tomato, cheese and basil on a wooden board.",
  // dormitorio+
  "slippers":    "A pair of fluffy white bunny slippers with pink ears, front view.",
  "rockinghorse":"A cute wooden rocking horse, pastel painted, side view.",
  "dollhouse":   "A tiny toy dollhouse, pink roof and open front showing little rooms, front view.",
  "moonmobile":  "A kids ceiling mobile with a smiling moon and hanging stars, front view.",
  // jardín+
  "trampoline":  "A small round garden trampoline with a safety-free joyful look, front-side view.",
  "sandbox":     "A wooden sandbox with golden sand, a red bucket and a little shovel, front view.",
  "wateringcan": "A cheerful turquoise watering can, side view.",
  "picnic":      "An open picnic basket on a small checkered blanket with sandwiches, front view.",
  "ball":        "A classic red-and-yellow beach ball.",
  "hutch":       "A cozy small bunny hutch, wood with a heart-shaped door and a tiny carrot sign (no text), front view.",
  // dibujos infantiles para los cuadros (además del arte canon reutilizado)
  "crayon-family":  "A child's crayon drawing on white paper: a happy family of stick figures (mom, dad, teen boy, little girl with yellow braids) and a white bunny under a smiling sun.",
  "crayon-rainbow": "A child's crayon drawing on white paper: a big rainbow over a little house with a garden.",
  "crayon-bunny":   "A child's crayon drawing on white paper: a white bunny with long ears holding a golden star.",
};

for (const [name, desc] of Object.entries(P)) {
  const out = join(srcDir, `${name}.png`);
  if (existsSync(out)) { console.log(`skip ${name}`); continue; }
  if (spent + COST > BUDGET) { console.error("TOPE de presupuesto"); process.exit(2); }
  const res = await fetch("https://api.replicate.com/v1/models/google/nano-banana/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input: { prompt: `${desc} ${GREEN} ${STYLE} ${NEG}`, aspect_ratio: "1:1", output_format: "png" } }),
  });
  const body = await res.json();
  spent += COST;
  writeFileSync(ledger, JSON.stringify({ spent: +spent.toFixed(3) }));
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!res.ok || !url || body.status === "failed") {
    console.error(`GEN fallo ${name}: ${JSON.stringify(body).slice(0, 200)}`);
    continue;
  }
  const img = await fetch(url);
  writeFileSync(out, Buffer.from(await img.arrayBuffer()));
  console.log(`GEN ok ${name} ($${spent.toFixed(2)})`);
}
console.log(`HECHO. Gastado $${spent.toFixed(2)}`);
