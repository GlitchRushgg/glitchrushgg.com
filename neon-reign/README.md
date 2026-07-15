# 👑 NeonReign

> **Claim turf. Cut trails. Humble a court of named rivals — and reign.**
> Built on the biggest territory-capture formula in hyper-casual history (Paper.io 2's, 100M+ installs) — in CrazyGames' marquee **.io category** — with the meta the incumbent never shipped: **named rivals with personalities, a collection gallery, upgrades and prestige**. Fully offline bots: always playable, no servers. 100% procedural — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- **Drag** anywhere to steer (arrow keys on desktop). You never stop moving.
- Leave your turf and you paint a **trail**; return home to **capture everything you enclosed** — including other kingdoms.
- Any head that crosses a trail **kills its owner**. Yes, yours too.
- Die → bank the spoils → upgrade → go again. Rounds are 30–120 seconds.

**The pull:** 12 **named rivals** with real AI personalities (Emberlord hunts trails; The Recluse defends a perfect little square; **Nullius** is rare and pays ×5) · every takedown fills **The Court** with bronze/silver/gold frames (+2% income each) · capture **streaks ×5** · own **100% of the map** for TOTAL CONQUEST ×3 · prestige (**A New Reign**) mints Crowns and unlocks crueler arena **Edicts**.

---

## 📊 The market research behind it

- **.io is CrazyGames' identity category** — their own listings put ".io & battle arena" first among popular categories, and the demand side (Paper.io 2: 100–500M installs across platforms, ~13M/month still) dwarfs the quality supply of territory-capture on web.
- Most of the category's supply is **FPS/battle-royale needing real multiplayer**; territory capture plays perfectly against bots — which means **zero servers, zero latency, always playable** (and portals other than CrazyGames get the identical experience).
- Paper.io 2's meta is **skins only**. No upgrades, no collection with flavor, no prestige, no named opponents. NeonReign ships all four — the exact SpiritReel playbook that turned Tiny Fishing's loop into a flagship.
- Named rivals make deaths *narrative* ("Emberlord cut my trail!") and takedowns shareable — the kill feed is the marketing.

## 🎮 Systems

| System | Implementation |
|--------|----------------|
| **Arena** | 40×40 cell grid (30×30 under Pocket Kingdom edict); border flood-fill capture — anything the map edge can't reach becomes yours, enemy land included |
| **The Court** | 12 rivals with AI params (aggression, raid size, speed); state machine: raid loops / flee home when their trail is threatened / hunt YOUR trail / fear your Swagger. Swallow a rival's whole kingdom and they fall without a fight |
| **Economy** | cell value = 1.2 × (1 + owned% × 4) × Greed × frames × Crowns × edict × streak (×1→×5) · bounty = 30 × (1 + victim cells/60), rare ×5 |
| **8 upgrade tracks** | Neon Boots (speed), Greed, Headhunter (bounties), Homeland (start size), Momentum (streak window), Swagger (fear radius), Tribute (offline), Trail Armor (survive a cut) |
| **Frames** | Bronze/Silver/Gold at 1/5/25 takedowns per rival, +2% income each — 72% at a full golden Court; survives prestige |
| **Prestige** | A New Reign (20K coins/cycle): Crowns = ⌊√(cycle/20K)⌋, +3% each forever; unlocks Edicts (Pocket Kingdom ×1.8 / The Frenzy ×1.5 / Royal Hunt — every rival hunts you, bounties ×2) |
| **Return hooks** | Tribute offline earnings (8h cap) with ×2 ad · first round of the day ×3 · undefeated rivals listed in the Court |

## 💰 Ad placements (CrazyGames SDK v3 — all doc-compliant)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Double the Spoils** | Rewarded | Every round summary — the docs' #1 earner, ~every 60s |
| **×2 Tribute** | Rewarded | Welcome-back popup |
| **Golden Crown** | Rewarded | 60s ×2 coins + 1 armor charge, visible 3-min cooldown |
| **Second Chance** | Rewarded | Keep your entire kingdom after death — once/round |
| **Between rounds** | Midgame | Summary dismissal, suppressed for the first 3 rounds (protects conversion) |
| `happytime()` | Signal | First-ever takedowns, Total Conquest, prestige |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

## 📁 Folder structure

```
NeonReign/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, sheet, court, modals)
├── js/
│   ├── format.js     ← number/time formatting
│   ├── data.js       ← rivals, upgrades, edicts, economy — TUNE HERE
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking)
│   ├── audio.js      ← procedural WebAudio (pentatonic capture streaks)
│   └── game.js       ← grid sim, flood-fill capture, rival AI, render, UI
└── README.md
```

## 🚀 Publishing to CrazyGames

1. Test locally — claim some turf, take down a named rival, try to swallow The Recluse whole.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path ".\NeonReign\*" -DestinationPath ".\zips\NeonReign-submission.zip" -Force
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Tags: *io, territory, snake, arena, casual, mobile*. Thumbnail suggestion: the cyan head mid-loop, trail glowing, three rival kingdoms closing in.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets.
