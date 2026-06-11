# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**"Don't Drown, Noah!"** — a mobile-first browser game built with [Phaser 3](https://phaser.io/) (loaded from CDN, no build step). The player jumps up procedurally-generated platforms to reach the Ark at the top while a flood rises from below, rescuing animals on the way.

`README.md` is **stale** — it describes an older "collect pairs of animals" design that no longer matches the code. Trust the source, not that README.

## Running / Developing

There is no build, bundler, lint, or test setup. The game uses native ES modules (`<script type="module">`), so it must be served over HTTP — opening `index.html` from `file://` will fail on module loading.

```bash
python -m http.server 8080      # from this folder, then open http://localhost:8080
# or:  npx serve .
```

Phaser is pinned to 3.88.0 via CDN in [index.html](index.html). Deployment is GitHub Pages with the custom domain `glitchrushgg.com`; the live URL is `https://glitchrushgg.com/noah/`.

**PWA:** the game is installable ([manifest.webmanifest](manifest.webmanifest)) and works offline via [sw.js](sw.js) (stale-while-revalidate). ⚠️ **When adding/renaming any game file or asset, add it to the `ASSETS` list in `sw.js` AND bump the `CACHE` version constant** — otherwise installed players keep the old version. App icons (`assets/icon-*.png`, `apple-touch-icon.png`) are generated from `ark.png`.

## Architecture

Phaser scene-based. Scenes are registered in [src/main.js](src/main.js) at a **fixed logical resolution of 390×844** (iPhone portrait) with `Scale.FIT`. All positions throughout the code are hard-coded against this 390×844 space — there is no responsive layout; CSS in `style.css` scales/centers the canvas.

### Scene flow
`Boot → Menu → Game (+ UI overlay) → Win / GameOver → back to Game or Menu`. Menu also branches to `Color` (a standalone coloring-book mini-game).

- **Boot** ([src/scenes/BootScene.js](src/scenes/BootScene.js)) — loads PNG assets from `assets/` and **procedurally generates** the remaining textures (8 animals, star, heart) via `Graphics.js` calls + `generateTexture`. Animal sprite keys: `elephant, giraffe, lion, zebra, monkey, rabbit, penguin, bear`.
- **Game** ([src/scenes/GameScene.js](src/scenes/GameScene.js)) — the core. See below.
- **UI** ([src/scenes/UIScene.js](src/scenes/UIScene.js)) — a HUD overlay launched in parallel (`scene.launch('UI', { gameScene })`). It does not own game state; it listens to events emitted on the GameScene's emitter (`levelUpdate`, `scoreUpdate`, `livesUpdate`, `heightUpdate`, `waterUpdate`) and unregisters them on `shutdown`.
- **Win / GameOver** ([src/scenes/WinScene.js](src/scenes/WinScene.js), [src/scenes/GameOverScene.js](src/scenes/GameOverScene.js)) — results screens; persist score and offer a shareable score card.
- **Color** ([src/scenes/ColorScene.js](src/scenes/ColorScene.js)) — independent coloring-book activity driven by the large `PAGES` data table (vector shapes per animal); not part of the platformer loop.

### GameScene specifics (read before touching gameplay)
- **State passed between levels via `init(data)`**: `{ level, score }`. Lives reset to 3 each scene start. `Win` advances with `level+1` and carried score; `GameOver` and Menu restart at `level 1, score 0`.
- **Difficulty** comes from the `LEVELS` table + `getLevelData(level)`, which extrapolates beyond level 8. Platform layout is **random per run** but constrained: gaps are capped so every jump is reachable given `JUMP_FORCE`/gravity (see the `MAX_HORIZ` / gap-cap comments — preserve these invariants when editing platform generation).
- **Platform types** are tinted and behave differently: static, moving (blue), crumble (orange), bounce (green), falling (purple). All are **one-way** — Noah passes up through them and only lands from above (the `_fromAbove` collider process callback).
- **Falling platforms are not driven by Phaser colliders.** They're moved by directly setting position each frame in `update()`, and "riding" is detected geometrically (feet-near-surface) rather than via collision callbacks — collision callbacks proved unreliable for position-moved bodies. Be careful editing this block.
- **Touch controls** are handled with **raw DOM `touch*` listeners on the canvas** (Set-based per-zone tracking), not Phaser pointer polling, for iOS Safari reliability. Listeners are torn down on `shutdown`. Keyboard cursor keys work in parallel.
- `_createGame()` is wrapped in try/catch that paints an on-screen error panel — gameplay crashes show in-game rather than only the console.

### Utilities ([src/utils/](src/utils/))
- **Graphics.js** — pure functions that draw each sprite with the Phaser Graphics API (`drawAnimal`, `drawCoin`, `drawHeart`). Adding an animal means adding a draw branch here + registering it in BootScene.
- **SoundManager.js** — all audio is **synthesized at runtime via the Web Audio API** (no audio files). One instance per GameScene; remember to `stopMusic()` on shutdown (GameScene already wires this).
- **Scores.js** — top-10 leaderboard in `localStorage` under key `noahsArkScores`; `addScore` returns the new entry's rank.
- **Share.js / ResultCard.js** — `ResultCard` renders a score card to an offscreen canvas; `Share`/`shareCard` use the native Web Share API with clipboard/download fallbacks.

## Conventions

- Private scene fields/methods are prefixed `_` (e.g. `_waterLevel`, `_createGame`).
- No framework, no TypeScript, no package.json — plain ES modules and Phaser globals (`Phaser.*` from the CDN script).
- Because everything is positioned against 390×844, when adding UI prefer reading existing magic numbers (control strip is the bottom 142px; depths are layered ~0 background → ~50+ HUD).
