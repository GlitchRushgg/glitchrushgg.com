# 🏮 Lantern Bay

> **Lower your glowing lantern into the dark night water. Reel up fish. Sell your catch. Go deeper.**
> A cozy night deep-sea fishing idle game — built on the single most proven revenue loop in web-portal history (Tiny Fishing's), in CrazyGames' least-contested high-demand category, with the two systems the 5-year incumbent never shipped: a **collection meta** and **prestige**. 100% procedural — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- **Tap the water** to lower the lantern. **Hold/drag to steer.**
- On the way **down**, steer *around* fish — touching one hooks it and the reel-up begins.
- On the way **up**, touch everything: every fish is reeled in (up to your Catch Basket).
- Surface → sell the catch → upgrade → fish deeper. Runs are 20–90 seconds.

**The pull:** 6 depth zones with their own palettes and fish · 18 fish + **10 named catches at fixed depths** (Old Whiskers waits at 60m…) · Radiant variants (1/100, ×10) · an **Aquarium** with catch-count frames · **New Season** prestige at 1000m.

---

## 📊 The market research behind it

- CrazyGames' own launch metrics bar: 10+ min avg playtime, 10–15% D1 retention, 80% conversion. Their docs name **"Double Coins" post-run and offline-earnings multipliers as the top rewarded placements**.
- **Tiny Fishing**: 9.2/10 and the uncontested #1 of its category for 5.5 years across CrazyGames/Poki/Coolmath. Its dodge-down/catch-up/upgrade loop produces a natural rewarded-ad moment every ~45 seconds — the densest compliant ad profile of any genre.
- The CrazyGames fishing tag holds only **~22 games** — demand massively exceeds quality supply, and no competitor ships a collection meta or prestige.
- Glowing fish on dark water = premium procedural canvas art for free; named catches ("I finally landed Old Whiskers!") are inherently shareable.

## 🎮 Systems

| System | Implementation |
|--------|----------------|
| **Run loop** | Sink 6 m/s (+4%/zone), steer with one pointer; hook-on-touch turns the run; ascent 1.5×→3× with Reel upgrades |
| **Economy** | value = 0.15·depth^1.25 × rarity (×1/×3/×10/×40/×200/×1000) × Radiant ×10 × frames × zone bonuses × Pearls |
| **8 upgrade tracks** | Line Length (+16% depth, →~3900m), Catch Basket, Reel Speed, Catch Value, Night Trawl (offline), Fish Finder (magnet), Slack Line (bite forgiveness), Fresh Bait (rarity) |
| **Aquarium** | 28 cards with fun facts; Bronze/Silver/Gold frames at 10/50/250 catches (+5% each); zone completion +10% global; survives prestige |
| **Named catches** | 10 uniques at 60m→3000m; first-catch celebration + 25% respawns; the session-one cliffhanger is Old Whiskers at 60m |
| **Prestige** | New Season (1000m): Pearls = ⌊√(lifetime/50k)⌋, +2% income each, forever; unlocks rotating Tide Modifiers (Moonlit Tide / Cold Current / Feeding Frenzy) |
| **Return hooks** | Night Trawl offline earnings (8h cap) with ×2 ad · first dive of the day ×3 · daily Today's Catch bounty (×5 + jackpot) |

## 💰 Ad placements (CrazyGames SDK v3 — all doc-compliant)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Double Haul** | Rewarded | Every run summary — the docs' #1 earner, ~every 45s |
| **×2 Night Trawl** | Rewarded | Welcome-back popup |
| **Golden Lantern** | Rewarded | 60s ×2 + magnet buff, visible 3-min cooldown timer |
| **Reel Again** | Rewarded | Slip a hooked fish and keep sinking — once/session, deep runs only |
| **Between runs** | Midgame | Summary dismissal, suppressed for the first 3 runs (protects conversion) |
| `happytime()` | Signal | Named catches + prestige |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

---

## 📁 Folder structure

```
lantern-bay/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, sheet, aquarium, modals)
├── js/
│   ├── format.js     ← number/time formatting
│   ├── data.js       ← zones, fish, named catches, upgrades, tides — TUNE HERE
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking)
│   ├── audio.js      ← procedural WebAudio (semitone catch combos, bells)
│   └── game.js       ← run loop, spawning, aquarium, prestige, render, UI
├── assets/           ← vendored display font only (everything else drawn in canvas)
└── README.md
```

## 🚀 Publishing to CrazyGames

1. Test locally — fish a few runs, land Old Whiskers at 60m.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path "lantern-bay\*" -DestinationPath "LanternBay.zip"
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Tags: *fishing, incremental, idle, arcade, casual, mobile*. Thumbnail suggestion: the lantern with a chain of glowing fish on dark water.

---

Built from scratch · plain HTML/CSS/JS, no frameworks, no external assets.
