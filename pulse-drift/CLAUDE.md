# CLAUDE.md — PULSE DRIFT

Neon **one-button wave-dodger** with **graze scoring**: HOLD (touch/mouse/
SPACE/W/↑) to rise at 45°, RELEASE to fall; touching anything = death, but
**skimming close** charges the pulse meter and multiplies the score ×1→×5
(3s without grazing decays a tier). Sparks ✦ earned by grazing buy 5 trail
skins or a revive (the CrazyGames-required alternative to rewarded ads).
English only (studio rule). Target: CrazyGames "Arcade & Skill".

Part of the `glitchrushgg.com` monorepo — see root `CLAUDE.md`. Full design
rationale and CrazyGames submission notes in [README.md](README.md).

## Run locally

Plain static site (no modules, no build) — works from `file://`, but serve
over HTTP for storage/audio parity:

```powershell
npx -y http-server -p 8080 -c-1 .   # from the repo root
# open http://localhost:8080/pulse-drift/
```

## Architecture

No frameworks, no assets — 100% procedural canvas + WebAudio (~60KB).
Plain scripts (not ES modules): `js/sdk.js` → `js/audio.js` → `js/game.js`.

- **`index.html`** — canvas + DOM overlays (menu/HUD/game-over) + conditional
  CrazyGames SDK loader (only on crazygames domains/localhost — GDPR: no
  third-party contact on glitchrushgg.com; load unconditionally in the CG zip).
- **`js/sdk.js`** — `PD.SDK` wrapper: rewarded/midgame ads, gameplay signals,
  invite link; off-platform it no-ops and grants rewards instantly.
- **`js/game.js`** — everything: world gen (`spawnPattern` validates every
  pattern leaves a survivable gap ≥ `minGap()`), geometric collision + graze
  band (26px), tunables at the top (`BASE_SPEED`, `GRAZE_BAND`, `MAX_MULT`…),
  skins, save (`localStorage pulseDrift_v1`), home button 🏠 (hidden in iframe).
- **`js/audio.js`** — procedural WebAudio SFX incl. graze shimmer.

## Status / pending

- **PUBLISHED** at `https://glitchrushgg.com/pulse-drift/` (2026-07-08,
  founder-ordered deploy).
- Pending: CrazyGames submission package (SDK unconditional in the zip).
- Design wishlist (game-director): graze tutorial on first obstacle; make ×5
  a full-screen spectacle (the TikTok clip); "CLOSE CALLS ×N" counter;
  differentiate palette from GLITCH SHIFT; global leaderboard (needs backend).

## Debugging

Locally the CG SDK enters 'local' test mode (rewarded ads may not grant);
on glitchrushgg.com it is not loaded at all → instant grants. Audio starts
on first gesture (autoplay policy).
