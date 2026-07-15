# ⛏ CoreBreak: Idle Ball Mining

> **Bouncy balls that never stop digging. How deep can you go?**
> An idle/breakout hybrid for **CrazyGames**, born from market research and built 100% procedurally — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- Your balls bounce in a mine shaft and pulverize rock automatically — **even while you're away**.
- **Hold anywhere** to swing your pickaxe (chews the 3 nearest tiles).
- **DEPTH (m)** is the score. Biomes change every 50 m: Topsoil → Stone → Crystal Caves → Magma → The Void.
- Every 50 m a **Bedrock Plate** (boss, 20× HP) blocks the shaft — crack it for a chest + **◆ Core Fragment**.
- **Ore veins** pay ×10 (gold), ×25 (ruby), ×100 (void crystal).
- **Prestige** ("Shatter the Core"): reset the run for Core Fragments — each one is **+10% damage & coins forever** — and spend them on the meta tree (starting balls, head start, offline cap, ore rate, auto-buyer).

---

## 📊 The market research behind it

An agent researched CrazyGames' idle charts (excluding tap-resource builders — we already ship BuildTheArk):

- **Idle Breakout** is one of the most-played games on CrazyGames ever: idle + physics hybrids retain because the screen is *always in motion* — every purchase visibly changes the simulation.
- Ball-physics idles are the hottest current lane, but **plinko is saturated** (5 near-identical titles in ~12 months).
- Mining themes are proven demand (Doge Miner, Merge Miner 9.2, Idle Mining Empire).
- A *scrolling-depth ball digger* — Idle Breakout's engine + Tiny Fishing's legible depth metric — did not exist prominently on the portal. That's the whitespace this game fills.

---

## 📁 Folder structure

```
CoreBreak/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, panel, modals)
├── js/
│   ├── format.js     ← number/time formatting (K, M, B, T…)
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking init)
│   ├── audio.js      ← procedural WebAudio (combo pitch ladder, boss thumps)
│   └── game.js       ← physics, terrain gen, economy, prestige, render, UI
├── assets/           ← empty (everything is drawn in canvas)
└── README.md
```

---

## 🎮 Design specs

| System | Implementation |
|--------|----------------|
| **Terrain** | 8-column infinite shaft; `HP(row) = 10 × 1.17^row`, `coins(row) = 4 × 1.14^row` (income grows slower than HP → the wall) |
| **Balls (6)** | Steel 50 · Wrecker 500 · Bomber (splash) 3K · Driller (×3 down) 20K · Gold Ball (×3 coins) 100K · Plasma (chain zap) 1M — repurchase ×1.45, per-type Power ×1.6, 60-ball cap (extra buys convert to Power) |
| **Debris erosion** | Straggler tiles above the deepest dig crumble on their own — the dig front never gets stuck |
| **Prestige** | `fragments = floor((depth/50)^1.5)` + 1 per boss; each = +10% damage & coins forever; 5-branch meta tree |
| **Offline** | 60% of your live coins/sec, cap 8h → 12h → 24h (meta); "your balls kept digging" modal with ad-double |
| **Juice** | Biome-tinted particle bursts, ball trails, combo pitch ladder (pentatonic), boss crack stages + HP bar, depth ruler on the walls, screen shake, milestone banners |

## 💰 Monetization (CrazyGames SDK v3)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Double offline earnings** | Rewarded | On return — the highest-converting idle placement |
| **2× coins (4 min)** | Rewarded | Persistent button; chains up to 3 (12 min) with progress pips |
| **Blast the Plate** | Rewarded | Appears if a boss survives 45s — point-of-need skip |
| **Prestige confirm** | Midgame | Natural break, SDK-paced |
| `happytime()` | Signal | Boss kills + prestige |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

---

## 🚀 Publishing to CrazyGames

1. Test locally — open `index.html`, dig to the first boss (50 m), try a prestige.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path "C:\Users\Norman Bermudez\CoreBreak\*" -DestinationPath "CoreBreak.zip"
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Suggested tags: *idle, clicker, mining, breakout, incremental*. Category: **Idle**.

---

## 🛠️ Tuning

Balance knobs at the top of `js/game.js`: `tileHP`/`tileCoins` curves, `fragsFor` prestige formula, `BALLS` table, `META` tree costs, `BOSS_EVERY`, `MAX_BALLS`.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets.
