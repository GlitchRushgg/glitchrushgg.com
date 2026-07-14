# CLAUDE.md — ELI'S WORLD

*(folder `elis-world/`; renamed from "Elizabeth's World" 2026-07-10 on founder
request — the internal localStorage key stays `elizabethsWorld_v1` so no saved
house is wiped.)*

**Cozy dollhouse sandbox** (Elizabeth's favourite genre — founder
commission): a digital dollhouse with **no goals, no score, no fail state**.
It is **Eli's house and Eli's toys** — she plays alone with **Flofy**,
**Rainbow** (her pink-and-cream checkered plush bunny) and a **puppy**
(the founder had Mamá/Papá/Cristian removed: "deja solo a Eli para que juegue
con sus juguetes").

**6 rooms** — living room, kitchen, bathroom, bedroom, garden and a
**BALCONY** over a pastel toy city. The player owns the **hour** (☀️ day /
🌅 sunset / 🌙 night) and the **weather** (🌤️ clear / 🌧️ rain / ❄️ snow /
☁️ cloudy), and both show **through the windows, over the garden and from the
balcony**: the sky tints, the sun swaps for the moon, stars come out (only on
a clear night), rain and snow fall over the outdoor rooms and *inside the
window frame* indoors.

Play: **paint the walls** (10 colors × 4 patterns; the garden paints its
fence, the balcony its deck), **hang pictures** (drawer of 8 artworks),
**move every piece of furniture and toy** (drag anywhere; short tap = its
reaction, with a 10px tap-vs-drag threshold for small fingers), **sit down**
(sofa/armchair/rug/picnic/sandbox — and the kitchen table is a **dining
spot**), **dress up** (👗 crown / party-hat / bow / fairy-wings), **jump /
crouch / wave** (tap a character to cycle), **eat** (drop food on anyone →
it flies to the mouth + 😋).
- **KITCHEN**: the fridge, the **oven** (tap → the door swings down, the
  cavity glows, drop food inside to bake) and the **drawers** (tap → they
  open and hand you the pot and the pan) all open; the pan cooks bread→toast
  and egg→fried egg; the blender makes juice; the tap runs.
- **BATHROOM**: run the **tub** (it fills with water) and the sink, **bathe a
  toy** (small ones peek out of the bubbles), **dry it with the towel rack**,
  and move the soap / toothbrush / cream around.
- **GARDEN**: dig the sandbox, bounce on the trampoline, shake apples off the
  tree, and **water the plants** (tap the watering can → everything green
  nearby blooms 🌸).
- **BIRTHDAY**: drop cake/cupcake on a table → 🎂 + everyone gathers +
  confetti + fanfare.

Plus **ambient surprises** (butterflies, birds, falling apples — they stay in
when it rains). A soft **RESET** lives in the dress-up bar. **Everything
persists**: walls, pictures, furniture, worn outfits, hour, weather, where
everyone is, and **every bit of food or cookware, in whatever room she left
it** (drag an item onto a room arrow to carry it next door). English only.
**NOT for CrazyGames** (child-directed = rejection there) — for glitchrushgg.com
and for Elizabeth.

Part of the `glitchrushgg.com` monorepo — see root `CLAUDE.md`. IP rule: we
copy the *genre* (dollhouse sandbox — not protectable), never any competitor's
name/art/trade dress; our 3D family-canon look is our own.

## Run locally

Static site with ES modules — serve over HTTP, don't open `file://`:

```powershell
npx -y http-server -p 8080 -c-1 .   # from the repo root
# open http://localhost:8080/elis-world/
```

## Architecture

**Phaser 3.88 via CDN**, ES modules, landscape **1280×720** `Scale.FIT`,
no physics engine (it's a dollhouse: drag & drop + tweens). No CrazyGames SDK.

- **`src/const.js`** — layout bands (wall/floor/char clamps), room order,
  `TIMES`/`WEATHERS`, paint palette, patterns, artwork list.
- **`src/data/rooms.js`** — the whole house as data: furniture per room
  (position, size, `tap` reaction, `drop` behaviour incl. `sit` with per-seat
  height, `wall`/`flat` flags, room `outdoor`/`bg` flags), character start
  spots, foods (+cooked variants), fridge menu, drawer utensils.
- **`src/scenes/BootScene.js`** — loads art with placeholder fallback,
  procedural textures (**perspective floors**, wall patterns, two-piece
  window, rug, shadow, rain/snow/cloud, sun/moon, particles), shared character
  scales, and composes the 8 framed artworks (`art-*`) via RenderTexture.
- **`src/scenes/HouseScene.js`** — **core**: room build/teardown from data,
  room nav (arrows + dots; drag a character onto an arrow to send them next
  door), universal drag system (`_bindDrag`: furniture / characters / foods /
  drawer artworks — short-tap vs drag threshold), furniture taps
  (`_tapFurniture`), kitchen logic (`_dropItem`: cook/blend/table/feed),
  character drops (`_dropChar`: sit/lay/swing/bounce/hide + room transfer),
  paint mode + frames drawer, persistence on every change.
- **`src/utils/Sound.js`** — music-box loop (84bpm sine arpeggio) + soft SFX
  per interaction (giggle, munch, sizzle, water loop, cuckoo, boing…).
- **`src/utils/Save.js`** — localStorage `elizabethsWorld_v1`: wall
  color/pattern + moved furniture per room, hung paintings, character
  positions/poses, worn outfits, loose items, `sky`, `weather`, mute. Migrates
  old saves (drops the removed family, `night: true` → `sky: "night"`).
- **`assets/art/`** — 86 pieces, 11MB: Eli + toys + ~70 props generated with
  nano-banana. `assets/art-src/` = masters (gitignored).
- **`tools/`** — `gen-art.mjs` (chroma-green batch, resumable, $6 cap),
  `gen-magenta.mjs` (green-foliage props on magenta — green-on-green lesson),
  `cut-chroma.mjs` (local keying), `compress-art.mjs` (canvas re-encode),
  `qa-shots.mjs` / `qa-play.mjs` / `qa-leak.mjs` (headless room shots,
  interaction drive, leak check — need `http-server` on :8127).

## Art pipeline lessons (hard-won)

1. **Green chroma** cuts clean EXCEPT green subjects — plant/tree leaves got
   eaten, and a *mint* drawer front got eaten mid-cabinet. Either regenerate on
   **magenta**, or just tell the prompt to use no green on the object at all
   (cheaper and safer for props).
2. Magenta despill: white/plush subjects pick up pink smudges → purge pass
   `r-g>20 && b-g>10`. But it eats genuinely pink subjects: Rainbow's
   pink-and-cream checks came back full of holes → she went back to **green**
   chroma, which never touches pink or cream.
3. nano-banana sometimes adds a display pedestal — say "no floor, no shadow"
   and be ready to purge.
4. The rug never cut cleanly → procedural ellipses (also tintable).
5. For an open/closed pair (fridge, drawers), pass the closed render as
   `image_input` and ask for "same object, same angle, same position in frame,
   but open" — identity holds.

## Why the floor stopped looking tilted

The founder's words: *"a los espacios que creaste les falta profundidad,
parece que el piso estuviese inclinado"*. The floors were **flat tiling
textures** — straight planks and a square tile grid repeated across the band,
which the eye reads as a *wall lying down*, not a floor. Three fixes, all in
`BootScene._perspectiveFloor` + `HouseScene._addShadow`:

1. **One 1280×200 floor image drawn with a vanishing point** instead of a
   tileSprite: plank/grout lines converge toward the back (`_px`), rows space
   out as `1/d` toward the viewer (`_rows`). `BACK = D0/D1` keeps both axes
   shrinking at the same rate, so tiles still read as square.
2. Baked-in **light falloff** to the back plus a **contact shadow** at the
   wall junction.
3. A soft **elliptical shadow under every character and piece of furniture**
   (`layerShadow`, depth 3). This is what actually glues things down — lift a
   piece and its shadow stays on the floor and fades.

Because the floor is one wide image, it is drawn from x −1300 to 2580: at the
back everything compresses ×1/3 toward the centre, so a floor that only
covered 0..1280 would leave the back corners empty.

## Status / pending

- **PUBLISHED** at `https://glitchrushgg.com/elis-world/` (2026-07-10,
  founder-ordered deploy). glitchrushgg.com only; never CrazyGames.
- Wishlist: ice-cream shop / pet-shop locations, planet-map hub, PWA for
  tablet, more of Eli's own drawings in the picture drawer.

## Two traps to remember

- **Draw order is `layerRoom.sort("y")`**, i.e. by *bottom* y. Anything small
  placed "on" a shelf or a rim gets a low y and therefore renders *behind* the
  furniture it is sitting on. The bathroom soap/toothbrush/cream are on the
  front floor for exactly this reason.
- **Items are scaled to fit a box** (`min(74/h, 150/w)`), not to height alone:
  the frying pan is 713×189, so height-only scaling made it 279px wide.

## Debugging

`window.__ew` = live HouseScene: `__ew.room`, `__ew._switchRoom(1)`,
`Save.get()` state, `__ew._spawnItem("cake", 640, 400)`. Reset:
`localStorage.removeItem("elizabethsWorld_v1")`. Audio starts on first tap.
