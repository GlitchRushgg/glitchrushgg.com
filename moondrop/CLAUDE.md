# CLAUDE.md — MOONDROP

Cosmic **container drop-merge** physics puzzle: aim with the pointer, release
to drop; two equal bodies merge up the 10-tier ladder (Stardust → … → Star →
Supernova); two Supernovas spawn a **BLACK HOLE** that devours the pile for
double points (+2,000). Pile above the dashed line for 2s = run over. Combo
chain ×1→×5 within 1.5s. Kawaii faces "wake up" when a same-tier body is
near (merge hint). English only (studio rule). Target: CrazyGames
"Puzzle & Merge". ⚠️ Never use "suika"/"watermelon" in tags or store copy
(third-party trademark — Aladdin X).

Part of the `glitchrushgg.com` monorepo — see root `CLAUDE.md`. Full design
rationale and CrazyGames submission notes in [README.md](README.md).

## Run locally

Plain static site (no modules, no build):

```powershell
npx -y http-server -p 8080 -c-1 .   # from the repo root
# open http://localhost:8080/moondrop/
```

## Architecture

No frameworks, no assets — procedural canvas + WebAudio (~56KB).
Plain scripts: `js/sdk.js` → `js/audio.js` → `js/game.js`.

- **`index.html`** — canvas + overlays (title/HUD/game-over) + conditional
  CrazyGames SDK loader (only on crazygames domains/localhost — GDPR: no
  third-party contact on glitchrushgg.com; load unconditionally in the CG zip).
- **`js/game.js`** — everything: custom circle-impulse solver (fixed 120Hz
  step + accumulator; gravity 1800, restitution 0.15, 5 iterations, mass ∝ r²),
  logical 480×720 board letterboxed to any screen, `TIERS` ladder at the top,
  black holes (`spawnBlackHole`), Second Chance / Mini Black Hole rewarded
  placements, save (`localStorage moondrop_v1`), home buttons 🏠 (hidden in
  iframe).
- **`js/sdk.js`** — `MD.SDK` wrapper (same graceful-fallback pattern).
- **`js/audio.js`** — pentatonic combo blips, procedural WebAudio.

## Status / pending

- **PUBLISHED** at `https://glitchrushgg.com/moondrop/` (2026-07-08,
  founder-ordered deploy).
- Pending: CrazyGames submission package (SDK unconditional in the zip).
- Design wishlist (game-director): make big combos the full-screen visual hero
  (the reliable clip — the Black Hole is top-1% aspirational); a reachable
  mid-game "collapse" event; bigger next-piece preview; discovery ladder as
  persistent meta on the title ("8/10 discovered").

## Debugging

Tuning knobs at the top of `js/game.js` (`GRAV`, `REST`, `X0/X1`, `LOSEY`,
`OVERFLOW_SECS`, `SPAWN_W`). Locally the CG SDK enters 'local' test mode;
on glitchrushgg.com it is not loaded → rewarded grants are instant.
