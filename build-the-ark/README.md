# 🛶 Build the Ark

> **Tap the driftwood, rescue survivors, and raise the Ark part by part — it keeps growing even while you're away.**
> A self-contained HTML5 nautical idle-builder, built for virality and monetization on **CrazyGames**. The whole world is canvas-rendered — zero image assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.

- Double-click `index.html`, **or**
- For best results (so audio + storage behave like production), serve the folder:
  ```powershell
  # from inside the BuildTheArk folder
  python -m http.server 8080
  # then open http://localhost:8080
  ```

The whole game lives in **this one folder** — copy/paste it anywhere and it works.

---

## 📁 Folder structure (everything needed, nothing else)

```
BuildTheArk/
├── index.html          ← entry point
├── css/style.css       ← all styling + adaptive layouts
├── js/
│   ├── format.js       ← number/time formatting (K, M, B, T…)
│   ├── icons.js        ← consistent SVG line-icon set (no emoji, no files)
│   ├── sdk.js          ← CrazyGames SDK v3 wrapper (+ local fallback)
│   ├── data.js         ← game balance / economy (tweak here!)
│   ├── game.js         ← core logic, save/load, offline, prestige
│   ├── scene.js        ← canvas world: sea, ship, driftwood, survivors
│   ├── ui.js           ← rendering (HUD, shops, FX, modals)
│   └── main.js         ← boot, game loop, events, ads, sound, share
├── assets/             ← (empty — everything is drawn in canvas/SVG)
└── README.md
```

---

## 🎮 Game design (the loop)

A proven idle-builder loop, tuned for visible progress:

| Layer | What it does | Why it's sticky |
|-------|--------------|-----------------|
| **Tap driftwood** | Wood floats by on the waves — tap it to collect | Active aiming beats a static button |
| **BUILD the ship** | Save wood, press BUILD → the part physically appears on the canvas ship (ghost blueprint solidifies as you save) | Visible progress is the #1 idle-builder hook |
| **Build vs. hire tension** | Same wood buys ship parts *or* crew | Real decisions every session |
| **Crew (idle)** | 10 worker tiers produce wood/sec automatically | "Watch it grow while away" |
| **Survivors** | Every 40–100s someone floats by on a barrel yelling HELP — tap to rescue → they join your crew or trigger ×7 Frenzy | The "golden cookie" + emotional hook |
| **Offline earnings** | Earn up to 2h (more with blessings) while closed | Reason to come back daily |
| **Set Sail (prestige)** | The Ark sails away; reset for **Doves of Faith** = permanent boost | Long-term depth, replayability |
| **Blessings** | 7 permanent prestige upgrades | Meta-progression |
| **Daily Blessing** | Streak-based daily reward (+50% per consecutive day) | Daily return habit |
| **Buy ×1/×10/MAX** | Bulk-buy toggle in the Crew shop | Late-game QoL every idle player expects |

**Tune the economy** entirely from [`js/data.js`](js/data.js) — costs, rates, thresholds, prestige curve.

---

## 💰 Monetization (CrazyGames-ready)

All ad calls go through the SDK wrapper in [`js/sdk.js`](js/sdk.js). They **degrade gracefully** — off-platform (local, itch), rewards are granted instantly so the game is always playable.

| Placement | Ad type | Trigger |
|-----------|---------|---------|
| **2× Wood (60s)** | Rewarded | Player taps the "2× Wood" button |
| **Free Chest** | Rewarded | Player taps "Free Chest" (grants ~2 min of production) |
| **Double offline** | Rewarded | "Double it" on the offline modal |
| **Set Sail** | Midgame/Interstitial | Fired on prestige (a natural break) |

Also wired: `gameplayStart/Stop`, `sdkGameLoadingStart/Stop`, and `happytime()` on milestones — all signals CrazyGames uses for better ad fill & discovery.

---

## 🔥 Virality hooks

- **Share button** (native share → CrazyGames invite link → clipboard fallback) with a bragging-rights message showing your Ark stage + wood.
- **Milestone modals** with a Share CTA at each of the 11 sections.
- **Offline "while you were away"** reward → daily return habit.
- Short session, instant restart, endless prestige — classic viral idle structure.

---

## 🚀 Publishing to CrazyGames

1. **Test locally** — open the game, play through a few sections and a Set Sail.
2. **Zip the folder** — select *contents* of the game folder (with `index.html` at the zip root) and compress.
   ```powershell
   Compress-Archive -Path ".\build-the-ark\*" -DestinationPath "BuildTheArk.zip"
   ```
3. Go to **https://developer.crazygames.com** → *Submit game* → upload the zip.
4. The CrazyGames SDK `<script>` is already in `index.html` — ads activate automatically once approved on their domain.
5. Fill in a thumbnail + description; suggested tags: *idle, clicker, incremental, casual, building*.

> The SDK only loads real ads on `crazygames.com`. Everywhere else it silently no-ops and grants rewards, so you can demo it anywhere.

---

## 🛠️ Tweaking tips

- Make early game faster → lower `base` values in `DATA.generators` and `cost` in `DATA.arkStages` (`data.js`).
- More prestige reward → raise `dovePerBoost` (currently +2%/dove) or lower `doveDivisor`.
- Longer offline → raise `offlineBaseCap`.
- Re-theme: color vars at the top of `css/style.css`; world colors in `js/scene.js`; icons in `js/icons.js`.

---

Built from scratch · v2.0 (explicit part-by-part construction) · plain HTML/CSS/JS, no frameworks, no external assets.
