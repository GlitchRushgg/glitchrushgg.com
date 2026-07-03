# CLAUDE.md — Hop & Run

One-button rooftop runner starring **Cristian (15)**, with the **Adventure
Island recipe** adapted: an **energy bar drains over time and fruit refills
it**; varied obstacles (crates to hop, pigeons at jump height, roof gaps);
a **skateboard** power-up (speed + smashes through); and the **GUITAR SOLO**
super power (electric guitar pickup → 6.5s invincible rock-out: lightning
blasts every obstacle, magnet pulls fruit/animals, music switches to a riff).
Rescue animals (kitten/puppy/chick) for score+combo. 3 sectors by distance
(day → sunset → night, art swap). Score = distance + animals. English only
(studio rule). Target: CrazyGames (monetize + viral clips — the guitar solo
IS the TikTok moment).

Part of the `glitchrushgg.com` monorepo — see root `CLAUDE.md`. Market-fit
checklist lives in `../glitch-shift/docs/ESTUDIO-MERCADO.md`.

## Run locally

Static site with ES modules — serve over HTTP, don't open `file://`:

```powershell
npx -y http-server -p 8080 -c-1 .   # from the repo root
# open http://localhost:8080/hop-and-run/
```

Production URL (after founder approval + push to `main`): `https://glitchrushgg.com/hop-and-run/`.

## Architecture

No build step. **Phaser 3.88 via CDN**, ES modules, landscape **1280×720**
`Scale.FIT`, arcade physics (gravity + one-way platform collider).

- **`src/const.js`** — `W/H`, `SECTORS` (distance thresholds → rooftop/skyline art).
- **`src/scenes/`**
  - `BootScene.js` — loads `assets/art/`, **normalizes Cristian's frames onto
    fixed-size canvases** (feet anchored bottom-center → the 4-frame run cycle
    doesn't jitter), procedural FX (spark/dust/glow/bolt/cloud).
  - `MenuScene.js` — key-art hero, PLAY (1 click to gameplay), mute.
  - `GameScene.js` — **core**: energy drain/refill (`_collect`), spawner per
    platform (fruit lines/arcs, animals, crates from 150m, pigeons from 350m,
    skateboard every ~420m, guitar every ~780m), trip-not-death on obstacle
    hit (energy −16 + slowdown + invuln), `_startSolo()` (freeze-frame pose,
    blasts hazards with bolts, magnet, riff via `Sound.setSolo`), jump with
    coyote/buffer/variable height, sector crossfade (`_swapBackground`),
    pause (P/ESC/⏸ + MENU + auto-pause on blur), HUD with energy bar.
  - `GameOverScene.js` — distance/animals/record, retry (SPACE, no
    auto-repeat), share.
- **`src/utils/`** — `Sound.js` (synth SFX + music loop + **distorted guitar
  riff** via WaveShaper during the solo; single shared AudioContext) and
  `Save.js` (best/mute/tutorial; try/catch for blocked storage).
- **`assets/art/`** — Replicate-generated art, compressed (~1.5MB total).
  Sprites/items are `-cut.png` (transparent); backgrounds `.jpg`.
- **`tools/`**
  - `generate-art.mjs` — full art pipeline (nano-banana + background-remover,
    resumable, budget cap; token from env `REPLICATE_API_TOKEN`).
  - `compress-art.cjs` — resize/re-encode (originals → `assets/art-src/`,
    gitignored).
  - `smoketest.mjs` — headless check (playwright-core reused from
    `games/elizabeth-flofy/tools/node_modules` via `NODE_PATH`).

## Status / pending

- **PRIVATE**: don't publish (push to `main`) until the founder approves.
- On publish: landing card + root `CLAUDE.md` entry.
- CrazyGames package: vendor Phaser, strip share URL, 3 covers + 2 videos
  (pipeline in `C:\Users\Rosselyn\Documents\crazygames\tools\`).
- Pending idea (checklist): light meta-progression (coins → skins) before
  the CrazyGames submission.

## Debugging

`window.__hr` exposes the live GameScene. Tricks: `__hr.energy = 100`,
`__hr.dist = 30000` (sector jump), `__hr.soloT = 99`, `__hr.invuln = 999`.
Audio starts on first user gesture (autoplay policy).
