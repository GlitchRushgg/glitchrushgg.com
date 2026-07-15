# ⚡ Voltlink

> **Drag chains of equal-or-double numbers. Forge Volt Orbs. Fire the Surge.**
> An electric chain-merge score chaser (2248-style) for **CrazyGames**, born from market research and built 100% procedurally — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- **Drag** through adjacent nodes (8 directions). First link must be an **equal** number; after that, each link can be **equal or double** the current value.
- Release (2+ nodes) → they merge into the **largest power of 2 ≤ the chain sum**. Columns collapse, new nodes fall in.
- **6+ chains** forge a **⚡ Volt Orb** — a wildcard that links to anything and doubles the chain score.
- Every link charges the **Surge meter** — when full, your next merge fires lightning that vaporizes every lowest-tier node (double points).
- After 5,000 points, **static cells** creep in. When no valid link remains, the run ends.
- **Daily Circuit:** everyone gets the same seeded board each day — share your score on today's circuit.

---

## 📊 The market research behind it

An agent researched CrazyGames' Puzzle & Merge charts (excluding Suika-likes — we already ship Moondrop):

- Number **drop**-merge (Drop & Merge the Numbers, 9.0/10) is strong but has 4+ near-identical clones on the portal — and it's another "drop" verb, adjacent to our Suika game.
- Classic 2048 swipe is a saturated commodity; Block Blast-likes are the most-cloned board on CrazyGames.
- **Chain-connect merge (2248-style)** has hundreds of millions of installs on mobile yet is **under-represented on CrazyGames' top merge charts** — the best whitespace found. Inherently one-pointer, inherently juicy, trivially procedural.

**Our differentiators:** the Volt Orb (6+ chain reward), the Surge meter (spectacle + difficulty relief valve), static cells (turns 2248's "can't lose" flaw into a real 4–8 min run arc), and the Daily Circuit seeded leaderboard-by-screenshot.

---

## 📁 Folder structure

```
Voltlink/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, title, game over)
├── js/
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback)
│   ├── audio.js      ← procedural WebAudio (chains play a melody)
│   └── game.js       ← grid, chains, merging, surge, render, UI
├── assets/           ← empty (everything is drawn in canvas)
└── README.md
```

---

## 🎮 Design specs

| System | Implementation |
|--------|----------------|
| **Board** | 5×7 grid, logical 480×720 letterboxed; glowing rounded tiles, hue per tier |
| **Merge rule** | 2248 standard: equal first link, then equal-or-double; result = largest 2ⁿ ≤ sum |
| **Scoring** | sum × length mult (3→×1, 4→×1.5, 5→×2, 6+→×3) × orb ×2 × streak (back-to-back 5+ chains, +25% each, cap ×3) |
| **Surge** | 32 links arm it; next merge vaporizes all lowest-tier nodes for double their value |
| **Lose arc** | Static cells spawn after 5,000 pts (up to 16% of refills); game over when no link exists |
| **Daily** | Seeded RNG from the date (mulberry32) — same tile sequence for every player |
| **Juice** | Glowing drag trail + live result preview bubble, per-link pentatonic notes, squash on landing, lightning bolts on Surge, screen shake, confetti on new best, `navigator.vibrate` per link |

## 💰 Monetization (CrazyGames SDK v3)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Recharge (revive)** | Rewarded | Game over, once per run — clears static + lowest tier |
| **Extra hammer** | Rewarded | When the free hammer is spent |
| **Undo chain** | Rewarded | Max 2 per run |
| **Between runs** | Midgame | On "Play Again" (separate break from the revive — CG rule) |
| `happytime()` | Signal | New best, Surge, 256+ tiles |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

---

## 🚀 Publishing to CrazyGames

1. Test locally — open `index.html`, play a few runs (try the Daily).
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path "C:\Users\Norman Bermudez\Voltlink\*" -DestinationPath "Voltlink.zip"
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Suggested tags: *merge, puzzle, numbers, 2048, chain*. Category: **Puzzle & Merge**.

---

## 🛠️ Tuning

Constants at the top of `js/game.js`: board size (`COLS/ROWS`), `SURGE_CAP`, `STATIC_SCORE`, spawn weights in `spawnTile()`, multipliers in `releaseChain()`.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets.
