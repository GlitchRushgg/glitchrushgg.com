# 🌙 Moondrop

> **Drop celestial bodies. Merge them up the cosmic ladder. Reach the BLACK HOLE.**
> A container drop-merge physics puzzle for **CrazyGames**, born from market research and built 100% procedurally — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- **Move** your pointer to aim, **release/tap** to drop.
- Two equal bodies **merge into the next tier**: Stardust → Pebble → Meteor → Comet → Moon → Planet → Gas Giant → Ringed Giant → Star → **Supernova**.
- Merge two Supernovas → a **BLACK HOLE** forms, devours the pile for double points, then collapses (+2,000).
- If the pile stays above the dashed line for 2 seconds, the run ends.

---

## 📊 The market research behind it

An agent researched CrazyGames' Puzzle & Merge charts:

- The **Suika Game** phenomenon (13M+ downloads, #1 Switch eShop) proved the container-drop-merge loop: one input + physics = emergent depth, near-miss psychology, streamable cascades. Clones pull millions of plays on web portals.
- The market is saturated with **literal fruit reskins** — a fruit clone gets buried, but the mechanic still converts.
- Number-drop merge games (Drop & Merge the Numbers, 9.0/10) rate high but are even more crowded with polished Unity ports.

**Our differentiators:**
1. **Cosmic theme** — glowing gradients, starfield, nebulae: procedural canvas art that reads premium and escapes the fruit wall. Dark background makes glow pop far better than Suika's cream box.
2. **The Black Hole endgame** — Suika's watermelon merge is famously anticlimactic. Here, the final merge spawns a black hole that visibly sucks in and destroys the pile (double points), giving the game a spectacular, shareable climax and a natural rewarded-ad product.
3. **Kawaii faces that "wake up"** when a same-tier body is near — charm + a subtle merge-hint system.

---

## 📁 Folder structure

```
Moondrop/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, title, game over)
├── js/
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback)
│   ├── audio.js      ← procedural WebAudio (pentatonic combo blips)
│   └── game.js       ← physics, merging, black holes, render, UI
├── assets/           ← empty (everything is drawn in canvas)
└── README.md
```

---

## 🎮 Design specs

| System | Implementation |
|--------|----------------|
| **Physics** | Custom circle impulse solver: gravity 1800, restitution 0.15, 5 correction iterations @120Hz fixed step. Mass ∝ r² |
| **Board** | Logical 480×720 letterboxed to any screen; container ~436 wide; lose line with 2s grace timer |
| **Spawning** | Tiers 1–4 only, weighted 5:3:2:1 toward small (genre-standard); current + next preview |
| **Combo** | Merges within 1.5s chain a ×1→×5 multiplier with rising pentatonic blips |
| **Collection** | Ladder strip shows all 10 tiers; undiscovered ones grayed — the "one more run" tease |
| **Juice** | Squash on landing, merge = flash ring + particles + score float + freeze-frame on big tiers, screen shake scaled to tier, danger vignette + pulsing lose line, twinkling starfield |

## 💰 Monetization (CrazyGames SDK v3)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Second Chance** | Rewarded | Game over, once per run — vaporizes the top ⅓ of the pile |
| **Mini Black Hole** | Rewarded | Offered once per run when the pile nears the line — clears the peak |
| **Between runs** | Midgame | Every ~2nd retry |
| `happytime()` | Signal | New best + every Black Hole event |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

---

## 🚀 Publishing to CrazyGames

1. Test locally — open `index.html`, play a few runs.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path ".\moondrop\*" -DestinationPath "Moondrop.zip"
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Suggested tags: *merge, puzzle, physics, cosmic, space*. Category: **Puzzle & Merge**.
   (Never use third-party trademarks — e.g. "suika"/"watermelon" — in tags or store copy.)

---

## 🛠️ Tuning

- Merge ladder (sizes, colors, points): `TIERS` array at the top of `js/game.js`.
- Physics feel: `GRAV`, `REST`, `ITER` constants.
- Difficulty: container width (`X0/X1`), `LOSEY`, `OVERFLOW_SECS`, spawn weights `SPAWN_W`.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets.
