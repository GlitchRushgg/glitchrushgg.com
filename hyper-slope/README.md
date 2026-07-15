# 🎢 HyperSlope

> **A 3D neon mountain. A ball that only speeds up. Everything kills you.**
> Built on the archetypal teen 3D browser game — **Slope** (Y8, 2014), one of the most-played browser games on the internet and the king of the school-break "unblocked" phenomenon — with the meta its thousand clones never ship: a global Daily, graze streaks, flex skins and screenshot-bait feats. The 3D is a **hand-rolled perspective pipeline on canvas 2D** — no engine, no WebGL, no assets, 60fps on a phone.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.

- **Drag** (or ◀ ▶ / A-D) to steer. The ball **never slows down**.
- Red slabs kill you. The edge kills you. Speed is the spectacle — watch the km/h climb.
- **ENDLESS**: a fresh slope every run. **DAILY SLOPE**: date-seeded — the whole world rolls the *same* mountain today.
- Die → distance in your face → tap → instantly rolling again.

**The teen-viral levers, deliberately:** km/h counter as flex currency ("hit 300?") · **GRAZE streaks** — shaving past a red slab pays shards ×8 · Daily Slope meters to compare in the group chat · balls & trails are **pure flex, zero pay-to-win** · feats like *Edge Lord* (skim the edge 3s) and *Low Orbit* (2km) built to be screenshotted · speed-pitched wind + beat-synced bass that rises with the adrenaline.

---

## 📊 The market research behind it

- **Slope** (Rob Kay / Y8 Studio, Sept 2014): "one of the most-played browser games on the internet — and it hasn't slowed down since." The "slope unblocked" search ecosystem is a teen phenomenon of its own: dozens of mirror sites exist purely to serve it in schools.
- The niche is **clone-saturated but meta-starved**: no daily shared level, no collection, no near-miss economy — just the raw loop. HyperSlope ships the loop *plus* the retention layer (the SpiritReel playbook, 14 games strong).
- 3D reads as premium on portals, and the name keeps "Slope" for search discovery.
- Portfolio gap: first 3D game in the catalog.

## 🎮 Systems

| System | Implementation |
|--------|----------------|
| **3D pipeline** | Track = ribbon of segments (center-x, height, width per 60u of z); perspective projection + painter's far→near with distance fog; the ball stays put, the world rushes at you |
| **Physics** | Speed only increases (base accel + dive bonus on steep grades, 240→1500 u/s ≈ 60→375 km/h); steering authority scales with speed; fixed 1/120s step — daily runs are deterministic |
| **Generation** | Seeded: curves retarget every 8–20 segs, hills oscillate around a -0.5 grade with 6% super-dives, obstacles from 320m (singles + gap-gates, always passable), narrow squeezes from 800m |
| **Graze economy** | Passing within 2.6 radii of a red slab pays 4×streak shards (×8 cap) — risk is literally money |
| **Modes** | ENDLESS (random) · DAILY SLOPE (UTC date seed, separate best, feats for 500m+ and 7 distinct days) |
| **Skins** | 10 balls + 4 trails, shard-priced 200→12K — cosmetics only, the skill stays sacred |
| **Feats** | 12 badges: Speed Demon (200km/h), Terminal (300), Edge Lord, Personal Space (×8 graze), Low Orbit (2km)… |

## 💰 Ad placements (CrazyGames SDK v3 — all doc-compliant)

| Placement | Type | Trigger |
|-----------|------|---------|
| **×2 shards** | Rewarded | On the death panel |
| **Keep Rolling** | Rewarded | Revive once per run (100m+), obstacles cleared briefly |
| **Shard Rush** | Rewarded | 60s ×2 shards, visible 3-min cooldown |
| **Between runs** | Midgame | Rate-limited: 5+ session runs AND 3+ minutes since last |
| `happytime()` | Signal | Feats |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

## 📁 Folder structure

```
HyperSlope/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, sheet, death panel)
├── js/
│   ├── format.js     ← number/time formatting
│   ├── data.js       ← physics, modes, balls, feats, gen tuning — TUNE HERE
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking)
│   ├── audio.js      ← procedural SFX + beat sequencer + speed-pitched wind
│   └── game.js       ← 3D projection, seeded track, ball physics, render, UI
└── README.md
```

## 🚀 Publishing to CrazyGames

1. Test locally — hit 200 km/h, graze a slab on purpose, roll today's Daily.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path ".\HyperSlope\*" -DestinationPath ".\zips\HyperSlope-submission.zip" -Force
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Tags: *slope, 3d, ball, running, arcade, casual, mobile*. Thumbnail suggestion: the neon ball mid-dive between two red slabs, speed lines blazing.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets — the 3D is math.
