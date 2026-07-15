# 🏔️ FlipRidge

> **Drop in. Send the kickers. Get paid per flip — if you land it.**
> Built on the most proven physics-bike loop on web portals (Moto X3M's, ~a decade at #1 of the bike tag) crossed with Descenders' procedural-downhill identity — plus the meta the whole category never ships: **a trick economy, a Trick Book collection, upgrades and prestige**. One binary asset (the soundtrack); everything else 100% procedural.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- **Hold** to pedal — and to **spin backward** in the air. **Release** to coast and level out.
- **Quick tap** on the ground = **bunny hop** — your way over rocks, kinks and ugly ground.
- Every mountain is freshly generated: rollers, chutes, kicker lips, cliff drops — gnarlier every meter.
- **Flips banked on a clean landing are the money.** Sketchy landings kill your streak. Bad ones end the run.
- Crash → bank the bag → upgrade → drop in again. Runs are 30–90 seconds.

**The pull:** 6 biomes with their own palettes · 10 named features at fixed distances (The Sheep's Jaw waits at 200m…) · a **Trick Book** of 12 feats with bronze/silver/gold frames (+2% income each) · landing streaks ×9 · **The Podium** prestige mints Medals and unlocks crueler **Lines** (The Gnar Line / Moon Air / Rocket Run).

---

## 📊 The market research behind it

- **Moto X3M** (MadPuffers, 2015): 4–5M upvotes on Poki alone, anchor of CrazyGames' bike tag for ~a decade — the physics-bike-with-flips loop is one of the most proven in web history.
- The entire bike category is **level-based trials with no progression meta** — no upgrades economy, no collection, no prestige, no reason to return tomorrow. FlipRidge ships all of it (the SpiritReel playbook).
- **Descenders** proved procedurally-generated downhill + high-risk runs is a premium identity; in 2D it costs nothing and reads instantly.
- Flips-as-currency makes every jump a bet: hold for one more rotation or bail and keep the streak — the strongest moment-to-moment decision loop in the genre, and a natural rewarded-ad rhythm (~every 60s).

## 🎮 Systems

| System | Implementation |
|--------|----------------|
| **Physics** | Two verlet wheels + rigid rod; tangential drive on the grounded rear wheel; opposed impulse pair for air spin; the rider's head is a hard kill-point |
| **Mountain** | Heightfield segments — flow rollers, chutes, kicker lips ending in cliff drops, runouts — amplitude/steepness/drop-height all ramp with distance (× Line gnar) |
| **Trick economy** | flip value = trickBase(m) × flips²·0.8 (superlinear) + airtime bonus, × streak (×9 cap) × upgrades × frames × Medals × Line; sketchy landing = streak reset; > 72° off-slope = crash |
| **Trick Book** | 12 feats (Backflip → Triple, Superman, Cliff Hucker, Flow State…) with frames at 1/10/50 (+2% each); survives prestige |
| **8 upgrade tracks** | Pedal Power, Suspension (landing window), Air Tuck (spin), Fan Base (income), Coin Magnet, Line Scout (coin density), Sponsors (offline), Full-Face (crash forgiven) |
| **Prestige** | The Podium (20K coins/career): Medals = ⌊√(career/20K)⌋, +3% each forever; unlocks Lines — Gnar (×2 coins, meaner mountain), Moon Air (60% gravity), Rocket Run (+25% power, ×1.5) |
| **Return hooks** | Sponsors offline earnings (8h cap) with ×2 ad · first drop of the day ×3 · undone feats visible in the Book |

## 🎵 Music (the one binary asset)

`audio/music.mp3` — **"Power Drive Rock" by SoulProdMusic** (Pixabay license: free for commercial use, no attribution required). It is **lazy-loaded on the first run** so boot stays instant, loops during descents, pauses on the summary, and has its own 🎵 toggle persisted in the save. If the file is missing or fails to load, the game plays on silently — every other sound is synthesized WebAudio.

## 💰 Ad placements (CrazyGames SDK v3 — all doc-compliant)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Double the Bag** | Rewarded | Every run summary — the docs' #1 earner |
| **×2 Sponsors** | Rewarded | Welcome-back popup |
| **Action Cam** | Rewarded | 60s ×2 coins + magnet, visible 3-min cooldown |
| **Second Wind** | Rewarded | Keep riding the same line after a crash — once/run, past 30m |
| **Between runs** | Midgame | Summary dismissal, suppressed for the first 3 runs (protects conversion) |
| `happytime()` | Signal | First-ever feats & named features, prestige |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

## 📁 Folder structure

```
FlipRidge/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, sheet, trick book, modals)
├── audio/music.mp3   ← the soundtrack (lazy-loaded; Pixabay license)
├── js/
│   ├── format.js     ← number/time formatting
│   ├── data.js       ← zones, features, upgrades, tricks, lines — TUNE HERE
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking)
│   ├── audio.js      ← procedural WebAudio SFX + music player
│   └── game.js       ← terrain gen, verlet bike, trick detection, render, UI
└── README.md
```

## 🚀 Publishing to CrazyGames

1. Test locally — clear The Sheep's Jaw at 200m, land a double, check the music toggle.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path ".\FlipRidge\*" -DestinationPath ".\zips\FlipRidge-submission.zip" -Force
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Tags: *bike, bmx, stunts, driving, one-button, casual, mobile*. Thumbnail suggestion: the rider mid-backflip over a cliff drop, mountain glowing below.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks · music: SoulProdMusic via Pixabay.
