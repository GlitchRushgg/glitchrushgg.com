# ⚡ Stormspire — Idle Storm Defense Roguelite

> **You are the last lightning spire. Your finger is a weapon.**
> The portfolio's second flagship — built in the highest-revenue idle lane there is (The Tower earns ~$1M/month on mobile; the pattern holds CrazyGames' #1 idle slot), with two differentiators no incumbent ships: the **Conductor's Arc** and **elemental reactions**. 100% procedural — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- Your spire **auto-fires** chain lightning at the armadas closing in from the rim.
- **HOLD ANYWHERE** to sweep the **Conductor's Arc** — a continuous beam at your fingertip (≈3× your tower's DPS, drains the charge bar).
- Buy in-run upgrades with cash (3 tabs, 12 tracks). Every 5 waves, **draft 1 of 3 storm perks**.
- Elements combine into **reactions**: Spark+Frost=SHATTER, Spark+Ember=OVERLOAD, Ember+Gale=FIRESTORM, Frost+Gale=HAIL, Spark+Gale=STORM CELL, Ember+Frost=THERMAL SHOCK.
- Death is inevitable (that's the law) — bank coins, buy the **Workshop**, go further. Boss every 10 waves.

---

## 📊 The market research behind it

- **The Tower – Idle TD**: ~$1M/month on ~70k monthly downloads — elite ARPDAU from marathon sessions.
- On CrazyGames, idle-TD is the hottest demand signal: Mage Castle (8.9, #1 idle tag), Stickman TD Idle (9.3), Evil Tower (9.1) — the tag keeps absorbing new 9.0+ entrants, and its #1 slot has turned over twice in 12 months. The throne is winnable.
- Every incumbent is watch-and-buy. **Stormspire gives the pointer agency from minute one** — and lightning/rain/glow is procedural-canvas-native art.

## 🎮 Systems

| System | Implementation |
|--------|----------------|
| **Balance law** | Enemy pressure ×1.082/wave vs income ×1.05–1.07/wave — the deficit IS the treadmill; each Workshop level buys back waves. First idle death targeted at waves 8–35 (validated by an auto-player harness) |
| **Enemies (8+boss)** | Skiff, Darter, Bulwark (armored), Gilded Skiff (5× cash, flees — Arc bait), Shrike (splits), Zeppelin (shells from range), Warden (shield aura), Phase Skiff (blinks), Dreadnought boss every 10 |
| **Roguelite draft** | 22-perk pool, Common→Legendary (STORMLORD, GODBOLT), element infusions build your rotation |
| **In-run economy** | 12 upgrade tracks, cost ×1.22/level; interest perks; free-buy odds from Workshop |
| **Workshop (12 tracks)** | Permanent: damage/HP/coins/cash/free-buys/interest/arc/offline/range/crit/recovery/draft luck |
| **Research Lab** | Real-time timers (30m–6h): Auto-Buy, 4-choice drafts, 16h offline cap — the return-visit engine; finish-now via rewarded ad |
| **Prestige** | Eye of the Storm (wave 60+): Cores = (lifetime/10k)^0.6, each +5% damage & coins forever |
| **Juice** | Jittered glow bolts with afterimage, reaction stingers + discovery banners, boss telegraphs + sub-bass, rain scales with wave, low-HP heartbeat vignette, draft cards with legendary glow, damage numbers, screen shake |

## 💰 Ad placements (CrazyGames-compliant)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Storm Salvage** | Rewarded | Results screen — ×2 coins banked |
| **Revive** | Rewarded | Death at wave 10+, once/run (alt: 300 coins) |
| **Overcharge** | Rewarded | In-run: 5 min ×2 damage, max 3/run |
| **Storm Harvest ×2** | Rewarded | Offline coins on return |
| **Finish research** | Rewarded | Lab timer skip |
| **Between runs** | Midgame | On Launch (after the first run of a session) |
| `happytime()` | Signal | Boss kills + prestige |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

---

## 📁 Folder structure

```
Stormspire/
├── index.html        ← entry point
├── css/style.css     ← UI (HUD, run shop, base sheet, draft, modals)
├── js/
│   ├── format.js     ← number/time formatting
│   ├── data.js       ← wave math, enemies, perks, reactions, economy — TUNE HERE
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking)
│   ├── audio.js      ← procedural WebAudio (thunder, zaps, reaction stingers)
│   └── game.js       ← combat sim, draft, workshop, lab, prestige, render
├── assets/           ← empty (everything is drawn in canvas)
└── README.md
```

## 🚀 Publishing to CrazyGames

1. Test locally — survive to the wave-10 boss, trigger a reaction, die, buy Workshop.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path "C:\Users\Norman Bermudez\Stormspire\*" -DestinationPath "Stormspire.zip"
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Tags: *idle, tower-defense, defense, incremental, strategy*. Thumbnail: black storm sky, one glowing spire, one fat bolt.

---

Built from scratch · v1.0 flagship · plain HTML/CSS/JS, no frameworks, no external assets.
