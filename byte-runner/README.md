# 🏃 ByteRunner

> **Three lanes. One drone. The city never ends.**
> The Subway Surfers formula — the most-played browser game genre on earth (the original: 4B+ mobile downloads, perennial #1 on Poki) — rebuilt as a neon cyber-chase in **hand-rolled 3D on canvas 2D**, with the two systems that make runners immortal: **the stumble-chase forgiveness loop** and **missions that feed a permanent score multiplier**. No engine, no assets, 60fps on a phone.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.

- **Swipe** left/right to change lanes · **up** (or tap) to jump · **down** to slide. Arrows/WASD on desktop.
- **Every obstacle wears its verb**: 🟠 orange = JUMP · 🔵 cyan = SLIDE · 🩷 magenta = DODGE. No memorizing, no cheap deaths.
- Clip something while lane-changing = **STUMBLE** — the drone closes in. Two stumbles in 8s and it has you. Clean running shakes it off.
- **THE GRID**: fresh city every run · **DAILY HEIST**: the whole world runs the same city today.

**The retention engine:** 9 tiered **missions** (collect N bits, near-miss N trucks, survive N stumbles…) — every 3 completed = **+0.5 permanent score multiplier** (×10 cap). Score = meters × multiplier, so yesterday's grinding makes today's flex bigger. Powerups (🧲 Magnet, ✖️ Double, 🛡️ Shield), 8 runner skins (pure flex), 12 feats.

---

## 📊 The market research behind it

- **Subway Surfers** is the most-downloaded mobile game of all time (4B+) and has sat at #1 of Poki's rankings for years — the lane-runner is the single most teen-proven loop in existence.
- Web-portal runner clones almost universally skip the two things that made the original immortal: the **guard-chase stumble system** (forgiveness that creates tension instead of frustration) and **missions→multiplier** (the meta that compounds sessions). ByteRunner ships both.
- Portfolio synergy: reuses the HyperSlope 3D pipeline — second 3D title, zero new tech risk.

## 🎮 Systems

| System | Implementation |
|--------|----------------|
| **3D pipeline** | Segment strips projected far→near with fog (HyperSlope math); parallax skyline with lit windows; theme hue shifts every 500m |
| **Runner** | 3 lanes (74u), jump 0.58s/62u parabola, slide 0.62s, lane lerp 0.14s; speed 340→980 u/s on a long honest ramp; fixed 1/120s step — dailies are deterministic |
| **The chase** | Full-on hit = death; hit while lane-changing = stumble + bounce-back to the previous lane; 2 stumbles in 8s = the drone gets you; drone renders closer as heat rises, with a bass hum that swells |
| **Generation** | Seeded patterns: single-verb, two-blocked-one-free, full-width jump walls, full-width slide ceilings, 3-segment trucks; spacing shrinks with distance; bit-lines mark the safe lane, bit-arcs teach jumping |
| **Missions** | 9 templates × 4 tiers; rewards 60–240 bits; every 3 completions = +0.5 permanent multiplier (×10 cap) — the compound-interest meta |
| **Economy** | bits from pickups (×2 powerup, ×2 Overclock buff); runners 300→11K — cosmetics only |
| **Feats** | 12 badges: Clean Getaway (1km, zero stumbles), Houdini (3 stumbles, still escaped), Personal Space (10 near-misses)… |

## 💰 Ad placements (CrazyGames SDK v3 — all doc-compliant)

| Placement | Type | Trigger |
|-----------|------|---------|
| **×2 bits** | Rewarded | On the death panel |
| **Reboot** | Rewarded | Revive once per run (80m+), obstacles cleared briefly, shield granted |
| **Overclock** | Rewarded | 60s ×2 bits, visible 3-min cooldown |
| **Between runs** | Midgame | Rate-limited: 5+ session runs AND 3+ minutes since last |
| `happytime()` | Signal | Multiplier-ups, feats |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

## 📁 Folder structure

```
ByteRunner/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, sheet, missions, death panel)
├── js/
│   ├── format.js     ← number/time formatting
│   ├── data.js       ← physics, patterns, missions, runners, feats — TUNE HERE
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking)
│   ├── audio.js      ← procedural SFX + beat sequencer + heat-scaled drone hum
│   └── game.js       ← 3D projection, lane physics, chase, missions, render, UI
└── README.md
```

## 🚀 Publishing to CrazyGames

1. Test locally — stumble once on purpose and listen to the drone, complete a mission, run today's Daily Heist.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path ".\ByteRunner\*" -DestinationPath ".\zips\ByteRunner-submission.zip" -Force
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Tags: *running, 3d, endless runner, subway, arcade, casual, mobile*. Thumbnail suggestion: the runner mid-jump over an orange wall, drone searchlight behind, city glowing.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets — the 3D is math.
