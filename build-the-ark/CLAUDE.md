# CLAUDE.md — BUILD THE ARK

Nautical **idle-builder**: tap driftwood floating on the sea to collect wood,
then choose — **BUILD** the next Ark part (11 stages, each a permanent global
multiplier, drawn part-by-part on the canvas ship as a ghost blueprint that
solidifies) or hire **crew** (10 idle generator tiers, Cookie-Clicker ×1.15
cost curve). Survivors float by on barrels (tap to rescue → crew member or
×7 Frenzy). Offline earnings (2h cap), daily streak reward, prestige
("The Flood" → Doves of Faith → 7 permanent blessings). English only (studio
rule). Target: CrazyGames idle/clicker.

Part of the `glitchrushgg.com` monorepo — see root `CLAUDE.md`. Full design
rationale and CrazyGames submission notes in [README.md](README.md).

**Brand note:** the prestige was renamed from "The Flood" to **"Set Sail"**
(founder-approved, 2026-07-08) so the same symbol doesn't mean *death* in
*Don't Drown, Noah!* and *reward* here. Internal ids/functions still say
`flood` (`data-tab="flood"`, `Game.flood()`) — only user-facing strings
changed. Wishlist: paired named animals as the emotional core.

## Run locally

Plain static site (no modules, no build):

```powershell
npx -y http-server -p 8080 -c-1 .   # from the repo root
# open http://localhost:8080/build-the-ark/
```

## Architecture

No frameworks, no image assets — canvas world + SVG line icons + WebAudio.
Plain scripts, load order matters: `format.js` → `icons.js` → `sdk.js` →
`data.js` → `game.js` → `scene.js` → `ui.js` → `main.js`.

- **`index.html`** — loader, canvas stage + DOM HUD/shops/modals, conditional
  CrazyGames SDK loader (only on crazygames domains/localhost — GDPR: no
  third-party contact on glitchrushgg.com; load unconditionally in the CG zip).
- **`js/data.js`** — ALL balance/economy (generators, tap upgrades, 11
  `arkStages`, blessings, offline caps, dove formula). Tune here.
- **`js/game.js`** — pure logic: state, costs, buy/build/flood/daily,
  offline compute, save/load (`buildTheArk_save_v2` via SDK store →
  localStorage fallback).
- **`js/scene.js`** — canvas world: sea/sky/ship (part-by-part with ghost
  blueprint), floating wood, survivor events, frenzy storm.
- **`js/ui.js`** — DOM rendering (HUD, shops, FX, toasts); re-render guarded
  by an affordability signature + panel-busy flag (no churn while scrolling).
- **`js/main.js`** — boot (awaits SDK init before loading signals), loop
  (production + throttled UI + autosave 15s), ad placements (2× wood, free
  chest, double offline, flood midgame), share, home button 🏠 (hidden in
  iframe; also in Settings).

## Status / pending

- **PUBLISHED** at `https://glitchrushgg.com/build-the-ark/` (2026-07-08,
  founder-ordered deploy).
- Pending: CrazyGames submission package (SDK unconditional in the zip,
  covers, videos — pipeline in `C:\Users\Rosselyn\Documents\crazygames\`).
- Design wishlist: compress the early game (first 3-4 parts fast), named
  animals boarding two-by-two, `sdk.banner` passive ads, local brag stats.

## Debugging

`Game` is a global: `Game.addWood(1e6)`, `Game.state.arkStage = 5` +
`Scene.setBuild(5, 0)`, `Game.setFrenzy(30)`, `Game.reset()`. Locally the CG
SDK enters 'local' test mode; on glitchrushgg.com it is not loaded → rewarded
grants are instant.
