# 🎱 PocketRush

> **Pull back from the cue ball, let it rip, and sink the neon. Sink fast to build the RUSH combo, clear the rack, and drop into the next one.**
> A single-player pool arcade built on the most proven evergreen in web-game history (8 Ball Pool's break-and-sink loop), aimed at CrazyGames' most-played Sports subcategory — with the three systems the multiplayer incumbents never ship: an **arcade combo**, a **trick-shot collection**, and **prestige**. 100% procedural — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- **Drag back from the cue ball** like a slingshot — pull further for more power — and **release** to fire.
- A **predictive guide** shows your line and where it first makes contact (an upgrade adds the bank-off-the-rail preview).
- Sink balls into the 6 pockets. Sink several in quick succession and the **RUSH** multiplier climbs.
- **Clear a rack** for a bonus + refunded shots, then break the next (bigger, richer) rack. Runs last ~30–60s.
- Out of shots? Take a **Second Wind** or bank your break and spend the coins on upgrades.

**The pull:** golden balls at fixed racks (×8) · a 12-slot **Trick-Shot Rack** (Bank Shot, Double Down, Rush Hour…) with Bronze/Silver/Gold frames · **Run the Table** prestige for permanent Reputation · rotating House Rules after your first prestige.

---

## 📊 The market research behind it

- **Sports is a top-tier CrazyGames category, and Pool/Billiards is its single most popular subcategory** — three 8-Ball titles sit in the sports top-10. It's anchored by the biggest evergreen in web-game history (Miniclip's *8 Ball Pool*).
- That supply is almost entirely **multiplayer 8-ball clones**. Quality **single-player pool with an incremental, rewarded-ad meta is a genuine gap** — the same thesis that made SpiritReel a flagship (proven #1 formula + thin quality supply + the meta the incumbents never shipped).
- Pool is a perfect fit for the portfolio's constraints: pure geometry + circles, **one-pointer** aim (mobile-first), and **zero assets** — the whole table, balls, and glow are drawn on canvas.
- Deliberate aim + a combo timer produces a natural rewarded-ad moment every rack (~45s) — the densest compliant ad profile, exactly like the fishing loop.

## 🎮 Systems

| System | Implementation |
|--------|----------------|
| **Run loop** | Slingshot aim (pull back, release); custom top-down circle physics with friction, elastic ball-ball collisions, rail rebounds, and pocket capture. Runs are a shot budget; clearing a rack refunds shots. |
| **RUSH combo** | Sinks within the combo window chain ×1→cap; the multiplier scales every payout and drives the "one more shot" pull. |
| **Economy** | value = baseValue(rack) × Pocket Value × combo × golden(×8) × House Rule × Reputation × frame bonuses. Deeper racks pay exponentially more. |
| **8 upgrade tracks** | Cue Power, Aim Line (L6 predicts a bank), Pocket Value, Combo Window (timer + cap), Break Budget, Pocket Magnet, House Rules (clear bonus/refund), The Hustle (offline). |
| **Trick-Shot Rack** | 12 trick shots (Bank, Double/Triple, Rush Hour, Ice Cold, Jackpot…) with epitaph-style hints and Bronze/Silver/Gold frames at 1/25/100 (+2% income each); survives prestige. |
| **Golden balls** | One golden ball seeded every 4th rack (×8 payout); sinking one fires `happytime()` and unlocks Gold Fever. |
| **Prestige** | Run the Table (250k lifetime): Reputation = ⌊√(lifetime/25k)⌋, +3% income each, forever; unlocks rotating House Rules (Neon Night / Hustler's Table / Trick Night). |
| **Return hooks** | The Hustle offline earnings (8h cap) with ×2 ad · first break of the day ×3 · Golden Cue 60s ×2 + magnet on a visible cooldown. |

## 💰 Ad placements (CrazyGames SDK v3 — all doc-compliant)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Double the Break** | Rewarded | Every run summary — the docs' #1 earner, ~every 45s |
| **×2 The Hustle** | Rewarded | Welcome-back offline popup |
| **Golden Cue** | Rewarded | 60s ×2 income + pocket magnet, visible 3-min cooldown timer |
| **Second Wind** | Rewarded | +3 shots when your break budget runs out — once per run |
| **Between runs** | Midgame | Summary dismissal, suppressed for the first 3 runs (protects conversion) |
| `happytime()` | Signal | Golden balls + prestige |

Off-platform every ad call no-ops and grants the reward instantly, so the game is always fully playable.

---

## 📁 Folder structure

```
PocketRush/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, sheet, trick grid, modals)
├── js/
│   ├── format.js     ← number/time formatting
│   ├── data.js       ← economy, upgrades, tricks, prestige, House Rules — TUNE HERE
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking)
│   ├── audio.js      ← procedural WebAudio (pentatonic sinks, cue/rail clacks)
│   └── game.js       ← physics, aim, combo, render, collection, prestige, UI
└── README.md
```

## 🚀 Publishing to CrazyGames

1. Test locally — break a few racks, chain a Rush Hour (×5) combo, sink a golden ball.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path ".\PocketRush\*" -DestinationPath ".\zips\PocketRush-submission.zip" -Force
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Tags: *pool, billiards, sports, arcade, casual, idle, mobile*. Thumbnail suggestion: the cue ball with a bright neon guide line into a cluster of glowing balls on green felt.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets. Verified with a headless harness that actually plays it.
