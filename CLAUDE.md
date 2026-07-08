# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo

`glitchrush.gg` is a collection of independent, mobile-first HTML5 browser games plus the GlitchRushGG studio landing page (`index.html` at root). Each game lives in its own top-level folder, is self-contained (no shared build system or dependencies between games), and is deployed under its own path on GitHub Pages with the custom domain `glitchrushgg.com` (see `CNAME`).

When working on a specific game, read that game's own `CLAUDE.md` for its architecture and run instructions.

## Games

- **[noah/](noah/)** — *"Don't Drown, Noah!"* A Phaser 3 vertical platformer: jump up procedurally-generated platforms to reach the Ark before a rising flood catches you. See [noah/CLAUDE.md](noah/CLAUDE.md).
- **[hotel-dino-blu/](hotel-dino-blu/)** — *"Hotel Dino Blu"*. A 3D mobile-first housekeeping simulator set in an Italian beach hotel. See [hotel-dino-blu/CLAUDE.md](hotel-dino-blu/CLAUDE.md).
- **[glitch-shift/](glitch-shift/)** — *"GLITCH SHIFT"*. A one-tap neon arcade: shift between two parallel realities (cyan/magenta lanes) to dodge blocks, drones and lasers; hold to overclock time. Phaser 3, 100% procedural art/audio. See [glitch-shift/CLAUDE.md](glitch-shift/CLAUDE.md).
- **[ricochet-rush/](ricochet-rush/)** — *"RICOCHET RUSH"*. A survivor-arena where every bullet ricochets and charges up with each bounce; level-up cards, permanent perks shop. Phaser 3, 100% procedural art/audio. See [ricochet-rush/CLAUDE.md](ricochet-rush/CLAUDE.md).
- **[hop-and-run/](hop-and-run/)** — *"Hop & Run"*. A one-button rooftop runner starring Cristian: energy drains and fruit refills it (Adventure Island recipe), rescue animals, skateboard power-up and the GUITAR SOLO super power. Phaser 3, Replicate-generated art. See [hop-and-run/CLAUDE.md](hop-and-run/CLAUDE.md).
- **[pulse-drift/](pulse-drift/)** — *"PULSE DRIFT"*. A neon one-button wave-dodger with graze scoring: hold to rise, release to fall, skim obstacles without touching to multiply the score ×1→×5. Plain canvas + WebAudio, 100% procedural, CrazyGames SDK wired. See [pulse-drift/CLAUDE.md](pulse-drift/CLAUDE.md).
- **[moondrop/](moondrop/)** — *"MOONDROP"*. A cosmic container drop-merge physics puzzle: merge celestial bodies up a 10-tier ladder to the Black Hole endgame. Custom circle physics, plain canvas, 100% procedural, CrazyGames SDK wired. See [moondrop/CLAUDE.md](moondrop/CLAUDE.md).
- **[build-the-ark/](build-the-ark/)** — *"Build the Ark"*. A nautical idle-builder: tap driftwood, hire crew, raise the Ark part by part; offline earnings, daily streak and "Set Sail" prestige (Doves of Faith). Plain canvas + SVG icons, CrazyGames SDK wired. See [build-the-ark/CLAUDE.md](build-the-ark/CLAUDE.md).
- **[dream-duo/](dream-duo/)** — *"DREAM DUO — Elizabeth & Flofy"*. A one-brain-two-worlds runner: Elizabeth runs the park below while her magic plush bunny hops the dream above — you control both at once. SYNC star pairs → ×5 multiplier → FAIRY RUSH; family power-ups; star shop with skins. Phaser 3, Replicate art from the family canon. See [dream-duo/CLAUDE.md](dream-duo/CLAUDE.md).

## Other top-level content

- `index.html` — studio landing page (email capture via MailerLite, embedded game, public roadmap). Setup steps in `SETUP.md`.
- `brand/` — brand kit: avatar/logo/banner SVGs, PNG exporter (`export.html`), brand guide (`BRAND.md`).

## Conventions for adding a new game

- Create a new top-level folder for the game (lowercase name — GitHub Pages URLs are case-sensitive); keep it self-contained.
- Add its own `CLAUDE.md` documenting how to run it and its architecture.
- Add an entry to the **Games** list above and a card on the landing page.
- These are static sites (no build step) served as ES modules — they must be served over HTTP, not opened from `file://`. Deployment is GitHub Pages from the repo root (`.nojekyll` present in game folders).

## Environment note

Git is installed **per-user** at `C:\Users\Rosselyn\AppData\Local\Programs\Git\cmd` — if `git` isn't found in a shell, append that to `$env:Path` first. Remote: `https://github.com/GlitchRushgg/glitchrushgg.com` (branch `main`). GitHub Pages serves this repo at `https://glitchrushgg.com` (CNAME at root); pushing to `main` deploys the live site.
