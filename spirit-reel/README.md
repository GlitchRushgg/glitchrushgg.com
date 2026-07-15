# 🏮 Spirit Reel

> **Lower your lantern into a bottomless haunted well. Catch ghosts. Sell your haul. Go deeper.**
> The portfolio flagship — built on the single most proven revenue loop in web-portal history (Tiny Fishing's), in CrazyGames' least-contested high-demand category, with the two systems the 5-year incumbent never shipped: a **collection meta** and **prestige**. 100% procedural — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- **Tap the well** to lower the lantern. **Hold/drag to steer.**
- On the way **down**, steer *around* spirits — touching one hooks it and the reel-up begins.
- On the way **up**, touch everything: every spirit is caught (up to your Lantern Cage).
- Surface → sell the haul → upgrade → dive deeper. Runs are 20–90 seconds.

**The pull:** 6 zones with their own palettes and spirits · 18 species + **10 named Legendaries at fixed depths** (The Weeper waits at 60m…) · Radiant variants (1/100, ×10) · a **Spirit Museum** with catch-count frames · **The Great Release** prestige at 1000m.

---

## 📊 The market research behind it (flagship-grade)

- CrazyGames' own launch metrics bar: 10+ min avg playtime, 10–15% D1 retention, 80% conversion. Their docs name **"Double Coins" post-run and offline-earnings multipliers as the top rewarded placements**.
- **Tiny Fishing**: 9.2/10 and the uncontested #1 of its category for 5.5 years across CrazyGames/Poki/Coolmath. Its dodge-down/catch-up/upgrade loop produces a natural rewarded-ad moment every ~45 seconds — the densest compliant ad profile of any genre.
- The CrazyGames fishing tag holds only **~22 games** — demand massively exceeds quality supply, and no competitor ships a collection meta or prestige.
- Glowing ghosts on darkness = premium procedural canvas art for free; named spirits ("I finally caught The Weeper!") are inherently shareable.

## 🎮 Systems

| System | Implementation |
|--------|----------------|
| **Run loop** | Sink 6 m/s (+4%/zone), steer with one pointer; hook-on-touch turns the run; ascent 1.5×→3× with Reel upgrades |
| **Economy** | value = 0.15·depth^1.25 × rarity (×1/×3/×10/×40/×200/×1000) × Radiant ×10 × frames × zone bonuses × Blessings |
| **8 upgrade tracks** | Rope (+16% depth, →~3900m), Cage, Reel, Soul Value, Séance (offline), Ghost Sense (magnet), Warding (bump forgiveness), Incense (rarity) |
| **Spirit Museum** | 28 cards with epitaphs; Bronze/Silver/Gold frames at 10/50/250 catches (+5% each); zone completion +10% global; survives prestige |
| **Named Legendaries** | 10 uniques at 60m→3000m; first-capture celebration + 25% respawns; the session-one cliffhanger is The Weeper at 60m |
| **Prestige** | The Great Release (1000m): Blessings = ⌊√(lifetime/50k)⌋, +2% income each, forever; unlocks rotating Well Modifiers (Blood Moon / Frozen / Whispering) |
| **Return hooks** | Séance offline earnings (8h cap) with ×2 ad · first dive of the day ×3 · daily WANTED ghost bounty (×5 + jackpot) |

## 💰 Ad placements (CrazyGames SDK v3 — all doc-compliant)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Double Haul** | Rewarded | Every run summary — the docs' #1 earner, ~every 45s |
| **×2 Séance** | Rewarded | Welcome-back popup |
| **Golden Lantern** | Rewarded | 60s ×2 + magnet buff, visible 3-min cooldown timer |
| **Second Wind** | Rewarded | Release a hooked spirit and keep sinking — once/session, deep runs only |
| **Between runs** | Midgame | Summary dismissal, suppressed for the first 3 runs (protects conversion) |
| `happytime()` | Signal | Named captures + prestige |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

---

## 📁 Folder structure

```
SpiritReel/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, sheet, museum, modals)
├── js/
│   ├── format.js     ← number/time formatting
│   ├── data.js       ← zones, species, legendaries, upgrades, modifiers — TUNE HERE
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking)
│   ├── audio.js      ← procedural WebAudio (semitone catch combos, bells)
│   └── game.js       ← run loop, spawning, museum, prestige, render, UI
├── assets/           ← empty (everything is drawn in canvas)
└── README.md
```

## 🚀 Publishing to CrazyGames

1. Test locally — dive a few runs, catch The Weeper at 60m.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path "C:\Users\Norman Bermudez\SpiritReel\*" -DestinationPath "SpiritReel.zip"
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Tags: *fishing, incremental, idle, arcade, casual, mobile*. Thumbnail suggestion: the lantern with a chain of glowing ghosts on black.

---

Built from scratch · v1.0 flagship · plain HTML/CSS/JS, no frameworks, no external assets.
