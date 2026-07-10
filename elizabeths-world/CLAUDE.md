# CLAUDE.md — ELIZABETH'S WORLD

**Toca-Boca-style cozy sandbox** (Elizabeth's favourite genre — founder
commission): a digital dollhouse with **no goals, no score, no fail state**.
The player directs the story: drag the **canon family** (Elizabeth, Flofy,
Mamá, Papá, Cristian) around **4 rooms** (living room, kitchen, bedroom,
garden), **paint the walls** (10 colors × 4 patterns; the garden paints its
fence), **hang pictures** (drawer of 8 artworks — 3 crayon drawings + reused
studio canon; drag to hang, tap to swap art, drag off the wall to remove),
**move every piece of furniture and toy** (drag anywhere; short tap = its
reaction), **sit the family down** (sofa/armchair/rug/picnic/sandbox — tall
characters sit behind the backrest, small ones on the cushion), and play in
the **kitchen** (fridge opens with food, pan cooks bread→toast and egg→fried
egg, blender makes juice, the tap runs, feed anyone). Reactions everywhere:
TV/lamps glow, aquarium bubbles, cuckoo sings, radio plays, tree drops
apples, beds = 💤, swing swings, trampoline bounces, Flofy fits in the hutch.
**Everything persists** (walls, pictures, furniture positions, where each
family member is). English only. **NOT for CrazyGames** (child-directed =
rejection there) — this one is for glitchrushgg.com and for Elizabeth.

Part of the `glitchrushgg.com` monorepo — see root `CLAUDE.md`. IP rule: we
copy the *genre* (dollhouse sandbox — not protectable), never the "Toca"
name/art/trade dress.

## Run locally

Static site with ES modules — serve over HTTP, don't open `file://`:

```powershell
npx -y http-server -p 8080 -c-1 .   # from the repo root
# open http://localhost:8080/elizabeths-world/
```

## Architecture

**Phaser 3.88 via CDN**, ES modules, landscape **1280×720** `Scale.FIT`,
no physics engine (it's a dollhouse: drag & drop + tweens). No CrazyGames SDK.

- **`src/const.js`** — layout bands (wall/floor/char clamps), paint palette,
  patterns, artwork list.
- **`src/data/rooms.js`** — the whole house as data: furniture per room
  (position, size, `tap` reaction, `drop` behaviour incl. `sit` with per-seat
  height, `wall` flag), character start spots, foods (+cooked variants),
  fridge menu.
- **`src/scenes/BootScene.js`** — loads art with placeholder fallback,
  procedural textures (floors, wall patterns, window, frame, **rug**,
  particles), shared character scales, and composes the 8 framed artworks
  (`art-*`) via RenderTexture.
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
  positions, mute.
- **`assets/art/`** — 65 pieces, 8.4MB: family from the canon + ~55 props
  generated with nano-banana. `assets/art-src/` = masters (gitignored).
- **`tools/`** — `gen-art.mjs` (chroma-green batch, resumable, $6 cap),
  `gen-magenta.mjs` (green-foliage props on magenta — green-on-green lesson),
  `cut-chroma.mjs` (local keying), `compress-art.mjs` (canvas re-encode).

## Art pipeline lessons (hard-won)

1. **Green chroma** cuts clean EXCEPT green subjects (plant/tree leaves got
   eaten) → regenerate those on **magenta**.
2. Magenta despill: white/plush subjects pick up pink smudges → purge pass
   `r-g>20 && b-g>10` (keeps peach ears, kills magenta).
3. nano-banana sometimes adds a display pedestal — say "no floor, no shadow"
   and be ready to purge.
4. The rug never cut cleanly → procedural ellipses (also tintable).

## Status / pending

- **PUBLISHED** at `https://glitchrushgg.com/elizabeths-world/` (2026-07-10,
  founder-ordered deploy). glitchrushgg.com only; never CrazyGames.
- Wishlist (fase 2): dress-up wardrobe (fairy skin exists), ice-cream shop /
  pet-shop locations, planet-map hub, more reactions, PWA for tablet.

## Debugging

`window.__ew` = live HouseScene: `__ew.room`, `__ew._switchRoom(1)`,
`Save.get()` state, `__ew._spawnItem("cake", 640, 400)`. Reset:
`localStorage.removeItem("elizabethsWorld_v1")`. Audio starts on first tap.
