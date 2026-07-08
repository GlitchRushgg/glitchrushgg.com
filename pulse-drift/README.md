# ⚡ Pulse Drift

> **HOLD to rise · RELEASE to fall · GRAZE the obstacles to multiply your score.**
> A neon one-button arcade/skill game for **CrazyGames**, born from market research and built 100% procedurally — zero image/audio assets.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.
The whole game lives in **this one folder** — copy it anywhere and it works.

- **Hold** (touch / mouse / SPACE) → rise at 45°
- **Release** → fall at 45°
- Touch anything → death. **Skim close without touching** → the pulse meter charges and your multiplier climbs ×1 → ×5. Safe play survives; greedy play scores.

---

## 📊 The market research behind it

An agent researched the CrazyGames Arcade & Skill charts (mid-2026):

- **Space Waves** — a pure one-button wave-dodger — is the platform's flagship one-button title (~1.2M votes, 8.9/10). Proven demand for exactly this input scheme.
- Winning games share: single input, instant restart, endless ramping speed, deaths that feel fair.
- Best monetization for short-session skill games: **rewarded revive at the point of need** (game-over), score doubler when the run matters, midgame ads at natural breaks (CrazyGames caps to 1/3min).
- Visual trend: minimal geometry, gradient backgrounds, neon glow, heavy juice.

**Our differentiator (not a bare clone):** *graze scoring* — the risk/reward mechanic from Ikaruga/Luftrausers, absent from current CrazyGames wave games. It converts a survival game into a skill-expression leaderboard game.

---

## 📁 Folder structure

```
PulseDrift/
├── index.html        ← entry point
├── css/style.css     ← UI styles (menu, HUD, game over)
├── js/
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback)
│   ├── audio.js      ← procedural WebAudio SFX (incl. graze shimmer)
│   └── game.js       ← everything: physics, world gen, render, UI
├── assets/           ← empty (everything is drawn in canvas)
└── README.md
```

---

## 🎮 Design specs (as researched)

| System | Implementation |
|--------|----------------|
| **Input** | Hold/release — identical on touch, mouse, SPACE/W/↑ |
| **Difficulty** | Speed ramps smoothly to ×2.2; obstacle types unlock at 0m (spikes), 250m (moving blocks), 600m (rotating bars), 1000m (tunnels) |
| **Fairness** | Every generated pattern is validated to leave a survivable vertical gap (shrinks with distance, never below floor) |
| **Scoring** | Distance × graze multiplier. Graze halo ≈ 26px; 3s without grazing decays one tier |
| **Session** | First deaths in 10–20s; restart in one tap |
| **Sparks ✦** | Earned by grazing → buy trail skins (5, procedural) or a revive — the CrazyGames-required *alternative* to rewarded ads |
| **Juice** | Additive glow trail, graze sparks + time-slow (0.93×), death = 80-particle burst + shake + flash + slow-mo, tier-up chord + badge bump, background hue drifts every 500m |

## 💰 Monetization (CrazyGames SDK v3, wired in `js/sdk.js`)

| Placement | Type | Trigger |
|-----------|------|---------|
| **Revive (3s shield)** | Rewarded | Game-over, once per run — or pay 50 ✦ sparks |
| **Double score** | Rewarded | Game-over, only when score ≥ 80% of best |
| **Between runs** | Midgame | Every 3rd death, on Retry |
| `happytime()` | Signal | Every new best score |
| `gameplayStart/Stop` | Signal | Run start / death |

Off-platform (local/itch) all ad calls no-op and grant rewards instantly, so the game is always playable.

---

## 🚀 Publishing to CrazyGames

1. Test locally — open `index.html`, play a few runs.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path ".\pulse-drift\*" -DestinationPath "PulseDrift.zip"
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Suggested tags: *arcade, skill, one-button, reflex, neon*. Category: **Arcade & Skill**.

---

## 🛠️ Tuning

All knobs are constants at the top of `js/game.js`: `BASE_SPEED`, `MAX_RAMP`, `GRAZE_BAND`, `METER_RATE`, `DECAY_SECS`, `MAX_MULT`, plus skin prices in `SKINS`.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets.
