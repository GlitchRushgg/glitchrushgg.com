# 👻 GhostLap

> **One button. A neon highway. And the ghost of your best run driving right beside you.**
> Built on the most proven one-button loop in web driving (Drift Boss's, millions of players since 2019) — in CrazyGames' Driving category, one of the biggest on the site — with the three systems the incumbent never shipped: a **ghost to race**, a **Garage collection**, and **prestige**. 100% procedural — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- **Hold** anywhere to steer right, **release** to steer left. (Space works on desktop.)
- Stay on the neon road. Off the edge = run over.
- Ride the **outer edge** to build the ×5 **DRIFT RUSH** coin multiplier.
- Crash → bank the haul → upgrade → drive further. Runs are 20–90 seconds.

**The pull:** the road is **seeded — the same every run** — so you *learn* it: 10 named corners at fixed distances (Deadman's Hairpin waits at 150m…) · 6 zones with their own palettes · your best run is recorded and **replayed as a translucent ghost car** — beat it for +40% · a **Garage of 10 unlockable cars** with perks · **The Legend Run** prestige draws a brand-new highway.

---

## 📊 The market research behind it

- **Driving is a core CrazyGames category** (hundreds of games; racing, drift, parking subcategories), and the portfolio had zero entries in it.
- **Drift Boss** (MarketJS, Dec 2019): the one-button drift evergreen with millions of players across CrazyGames, Coolmath and Math Playground — 6+ years at the top of its niche. Its meta is famously thin: three boosters and two upgrade tracks. No collection, no prestige, no reason to return tomorrow.
- The **ghost mechanic** converts a solo skill game into a self-competition loop ("one more try — I was 4m short") and is inherently shareable: *"my ghost is waiting for you."*
- One-button + single-pointer + procedural neon = premium mobile-first canvas art for free, and a natural rewarded-ad moment every ~45 seconds (run summary).

## 🎮 Systems

| System | Implementation |
|--------|----------------|
| **Run loop** | Hold = steer right, release = left; speed 17→46 m/s with distance; seeded road (identical every run) with corners that tighten as speed grows |
| **Ghost** | Best run's inputs recorded at 120Hz fixed-step and replayed deterministically as a translucent car; live +/−m chip; beat it → +40% payout |
| **Economy** | coin value = 0.6·dist^0.85 × upgrades × car perk × Drift Rush (×1→×5) × Golden Engine ×2 × Legend Stars × road rule |
| **8 upgrade tracks** | Racing Tires (grip), Stabilizers (forgiveness), Street Cred (income), Coin Magnet, Drift Sparks, Gold Rush (density), Ghost Fuel (offline), Insurance (crash forgiven) |
| **Named corners** | 10 at fixed distances (60m→5000m) paying ×12 golden coins; first-ever pass fires `happytime()` |
| **Garage** | 10 cars unlocked by milestones (distance, ghosts beaten, corners, stars…), each with a small perk; survives prestige |
| **Prestige** | The Legend Run (20K coins/cycle): Stars = ⌊√(cycle/20K)⌋, +3% income each forever; a NEW seeded road is drawn; unlocks rotating Road Rules (Midnight / Razor's Edge / Turbo Curfew) |
| **Return hooks** | Ghost Fuel offline earnings (8h cap) with ×2 ad · first run of the day ×3 · your ghost is always there to beat |

## 💰 Ad placements (CrazyGames SDK v3 — all doc-compliant)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Double the Haul** | Rewarded | Every run summary — the docs' #1 earner, ~every 45s |
| **×2 Ghost Fuel** | Rewarded | Welcome-back popup |
| **Golden Engine** | Rewarded | 60s ×2 coins + magnet, visible 3-min cooldown |
| **Second Wind** | Rewarded | Continue after a crash — once/run, past 60m only |
| **Between runs** | Midgame | Summary dismissal, suppressed for the first 3 runs (protects conversion) |
| `happytime()` | Signal | First-ever named corners, ghost beaten, prestige |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

## 🧪 Determinism law (read before touching physics)

The ghost replay is **exact** because physics runs at a fixed 1/120s step and nothing but recorded inputs steers a car. Two hard rules:

1. Road **geometry** and **coins** use two independent seeded RNG streams — coin-density upgrades must never consume geometry randomness.
2. Anything that teleports the player (Insurance, Second Wind) must be recorded as a snap event so the replay applies it at the same step.

The headless harness verifies px-exact reproducibility (same inputs twice → same crash distance to the pixel, ghost not re-recorded).

## 📁 Folder structure

```
GhostLap/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, sheet, garage, modals)
├── js/
│   ├── format.js     ← number/time formatting
│   ├── data.js       ← zones, corners, upgrades, cars, rules — TUNE HERE
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking)
│   ├── audio.js      ← procedural WebAudio (pentatonic coin combos, skids)
│   └── game.js       ← seeded road, fixed-step physics, ghost, render, UI
└── README.md
```

## 🚀 Publishing to CrazyGames

1. Test locally — drive a few runs, survive Deadman's Hairpin at 150m, beat your ghost once.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path ".\GhostLap\*" -DestinationPath ".\zips\GhostLap-submission.zip" -Force
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Tags: *driving, drift, one-button, arcade, casual, mobile*. Thumbnail suggestion: the neon car mid-drift with the translucent ghost one corner behind.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets.
