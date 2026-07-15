# 🔥 Merge Forge

> **Place the metal. Smelt the metal. Clear the lines. Forge STARMETAL.**
> A Block Blast × Triple Town hybrid for **CrazyGames**, born from market research and built 100% procedurally — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- **Drag** the 3 tray pieces onto the 8×8 forge grid (the piece floats above your finger with a green/red ghost).
- **3+ connected cells of the same metal SMELT** into one cell of the next metal — freeing space and cascading.
- **Full rows/columns clear** for big points (×2/×4/×8 for simultaneous lines).
- The ladder: Copper → Bronze → Iron → Silver → Gold → Crystal → **STARMETAL** (jackpot +5,000 and clears its row + column).
- Run ends when none of the 3 pieces fits. Streaks of merging placements multiply everything.

---

## 📊 The market research behind it

An agent researched the Puzzle & Merge space (we already ship a Suika-like and a chain-connect — this had to be different):

- **Block Blast is the #1 mobile game on Earth** — top downloads 2024–2026, ~70M DAU, **$127M in ad revenue in Jan–May 2026 alone**, essentially 100% ads. The single most valuable casual mechanic right now.
- CrazyGames is flooded with **bare** Block Blast clones — but the successful platform entries are all *twists* (Blockudoku), and **no polished Block Blast + merge hybrid exists on the portal**. That's the gap.
- Platform merge appetite is proven: Number Blast 2048 (9.1), Drop & Merge the Numbers (9.0).
- Triple Town's build-merge rule folded in as the twist gives a second brag axis — **max metal forged** — that no bare clone can match.

---

## 📁 Folder structure

```
MergeForge/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, game over)
├── js/
│   ├── format.js     ← number formatting (K, M, B…)
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking init)
│   ├── audio.js      ← procedural WebAudio (metallic clangs pitched by tier)
│   └── game.js       ← grid, pieces, smelting, line clears, render, UI
├── assets/           ← empty (everything is drawn in canvas)
└── README.md
```

---

## 🎮 Design specs

| System | Implementation |
|--------|----------------|
| **Board** | 8×8, logical 480×720 letterboxed; 22 curated polyominoes (1–9 cells), each piece a uniform metal tier |
| **Spawn table** | T1 70% / T2 22% / T3 8%; upgrades as your lifetime max tier rises; **pity system**: 45% of pieces offer a tier that completes an existing pair, and when the board is >62% full the tray biases toward small pieces that fit |
| **Merge rule** | After placement and every cascade step: any orthogonal group of 3+ same tier smelts into ONE cell of tier+1 at the trigger cell |
| **Scoring** | Smelt = 15×3^(tier−1); line clear = Σ(5×2^tier) × lines mult (×2/×4/×8) × streak mult (up to ×4) |
| **Starmetal** | +5,000×streak, clears its row+column, `happytime()` |
| **Lose** | No tray piece fits; pulsing red-heat vignette when board >75% full |
| **Juice** | Smelt suck-in flyers + sparks + shake scaled by tier, molten wave sweeps on line clears, shine sweeps on Gold+, ember particles rising from the furnace, combo/streak text, metallic WebAudio clangs pitched by tier, cascade arpeggios |

## 💰 Monetization (CrazyGames SDK v3 — Block Blast's proven ad-only model)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Relight the Forge (revive)** | Rewarded | Game over, once per run — clears 3 bottom rows |
| **Reroll tray** | Rewarded | Persistent booster button |
| **Hammer (smash 1 cell)** | Rewarded | Persistent booster button |
| **Between runs** | Midgame | On "Play Again" (SDK auto-paces) |
| `happytime()` | Signal | Starmetal forges + new best |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

---

## 🚀 Publishing to CrazyGames

1. Test locally — open `index.html`, forge a few metals, reach game over.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path "C:\Users\Norman Bermudez\MergeForge\*" -DestinationPath "MergeForge.zip"
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Suggested tags: *block, puzzle, merge, blast, brain*. Category: **Puzzle & Merge**.

---

## 🛠️ Tuning

Knobs at the top of `js/game.js`: `SHAPES` (pieces + weights), `TIERS` (colors), spawn tables + pity thresholds in `genPiece()`, scoring in `runResolveStep()`.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets.
