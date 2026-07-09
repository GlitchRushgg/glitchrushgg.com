# CLAUDE.md — DREAM DUO (Elizabeth & Flofy)

**LEVEL-BASED duo runner** built for CrazyGames (reworked 2026-07-08 on
founder feedback: natural running, ONE understandable world, and LEVELS —
not an endless-only runner). **Elizabeth runs through a full-screen park**
with a natural 4-phase stride (contact→passing→contact→kick-back frames,
cadence tied to speed) while **Flofy, her magic plush bunny, floats BY HER
SIDE** (spring-hover; boosts kick him up). Left half / `A` / `←` = Elizabeth
jumps · right half / `L` / `→` = Flofy boosts. **12 seeded, learnable levels**
(fixed courses, goal line where the family waits, 1-3 star rating by stars
collected) + **Endless Dream** mode unlocked after 8 levels. **SYNC star
pairs** (ground + air within 0.7s) build ×1→×5 and fill the Dream Meter;
5 syncs = **FAIRY RUSH** — the whole world TRANSFORMS into Flofy's dream
(dream bg takeover), Elizabeth sprouts fairy wings and they fly together,
invincible with a star magnet (the TikTok moment). **Family power-ups**:
Mamá (+1 heart), Papá (8s shield), Cristian (dash — Hop & Run crossover).
3 hearts, 8 obstacle types (5 ground for Elizabeth, 3 air for Flofy),
3 biomes. Stars → **Star Shop** (3 skins with perks + 4 trails). English
only (studio rule). Design: [docs/DISENO.md](docs/DISENO.md), grounded in
`../glitch-shift/docs/ESTUDIO-MERCADO.md`.

Part of the `glitchrushgg.com` monorepo — see root `CLAUDE.md`.

## Run locally

Static site with ES modules — serve over HTTP, don't open `file://`:

```powershell
npx -y http-server -p 8080 -c-1 .   # from the repo root
# open http://localhost:8080/dream-duo/
```

## Architecture

**Phaser 3.88 via CDN**, ES modules, landscape **1280×720** `Scale.FIT`,
**no physics engine** — manual dt-capped movement (consistent at any Hz,
CG requirement). `input.activePointers: 3` (two thumbs — multitouch lesson
from Hop & Run). CrazyGames SDK v3 loads **conditionally by hostname**
(crazygames domains + localhost only — no third-party contact on
glitchrushgg.com; the CG submission zip may load it unconditionally).

- **`src/const.js`** — lanes (`DREAM`/`PARK`), physics (`ELIZ`/`FLOFY`),
  speed ramp, `BIOMES`, sync/meter/rush tunables.
- **`src/items.js`** — shop catalogue (skins with perks + trails).
- **`src/scenes/`**
  - `BootScene.js` — loads `assets/art/`, procedural textures (star, heart,
    bubble, shield, confetti, ribbon), **per-character shared frame scale**
    (poses keep relative size), placeholder fallback for any missing file.
  - `MenuScene.js` — duo-hero key art, PLAY (1 click to gameplay), shop,
    share, mute, home 🏠 (hidden inside the CrazyGames iframe).
  - `GameScene.js` — **core**: dual-lane spawner with fairness gaps
    (`_spawnObstacles`: mirror/stagger/solo patterns, 8 types gated by
    distance), sync pairs (`_sync`), FAIRY RUSH (`_startRush`), family
    pickups (`_applyPickup`), revive offer (rewarded ad OR 100★ — the CG
    alternative), gesture tutorial (first run, skippable), pause
    (P/ESC/button + auto-pause on blur), biome crossfade (`_swapBiome`).
  - `GameOverScene.js` — panel + confetti on best, double-stars rewarded,
    retry (SPACE), shop/menu/share/home, midgame ad every 3rd retry.
  - `ShopScene.js` — skins/trails: equip/buy with stars.
- **`src/utils/`** — `Sound.js` (WebAudio synth: bouncy music sequencer,
  double-time during rush, one SFX per action), `Save.js` (localStorage
  `dreamDuo_v1`), `SDK.js` (CrazyGames wrapper, graceful fallback).
- **`assets/art/`** — Replicate art, compressed **2.1MB total** (study
  rec: ≤20MB). Sprites PNG (side-view frames of both characters, family
  cameos, obstacles), backgrounds JPG 1280×720 **edge-blended for seamless
  tiling**. `assets/art-src/` = uncompressed masters (gitignored).
- **`tools/`** — `generate-art.mjs` (nano-banana pipeline, resumable,
  $10 hard budget cap; spent **$1.16**), `gen-green.mjs` (white/pale
  subjects on green chroma + local chroma key), `cutbg.mjs` (grey-studio
  flood-fill cut), `compress-art.mjs` (canvas re-encode via headless
  Chrome, seamless edge blend), `smoketest.mjs`, `stress.mjs`, `shots.mjs`.

## Status / pending

- **PUBLISHED** at `https://glitchrushgg.com/dream-duo/` (2026-07-08,
  founder-ordered deploy).
- Pending: CrazyGames package — vendor Phaser, unconditional SDK, no share
  URL, 3 covers + videos (pipeline in `C:\Users\Rosselyn\Documents\crazygames\`).
- Verified: smoketest clean (desktop+mobile), stress test 60fps / 0 errors /
  12MB heap, pause/resume, revive both paths, shop buy/equip, save persists.

## Debugging

`window.__dd` exposes the live GameScene: `__dd.dist = 10000` (biome jump),
`__dd.meter = 4; __dd._sync(600)` (instant FAIRY RUSH), `__dd.hearts = 1`,
`__dd._spawnPickup()`, `__dd._showTutorial(4)` (skip tutorial). Audio starts
on first gesture (autoplay policy). Art regen: `node tools/generate-art.mjs`
(skips existing; ledger in `tools/.ledger.json`).
