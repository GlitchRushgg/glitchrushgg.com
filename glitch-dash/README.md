# 💀 GlitchDash

> **Tap. Jump. Die at 98%. Scream. One more try.**
> The studio's namesake game — built on the loop having a massive teen resurgence right now (Geometry Dash: 103K concurrent Steam players in 2026, 1.2M daily players, TikTok rage-clip fuel) while the web supply is decade-old Lite clones. One-tap rhythm rage runner with fixed-seed levels — **identical for every player on earth** — because "I died at 91% on MALWARE" only slaps if your friends play the same MALWARE. 100% procedural — zero assets, the soundtrack is synthesized on the beat grid the obstacles sit on.

---

## ▶️ How to play / preview

**Just open `index.html` in a browser.** No build step, no server, no dependencies.

- **Tap** to jump. **Hold** to keep jumping. The cube never stops.
- Spikes, blocks, pits, **gravity portals** (ride the ceiling).
- Die → your **%** in your face → **tap → instantly back in**. That's the whole drug.
- **7 Sectors** with fixed seeds + the **DAILY GLITCH** (date-seeded — the whole world plays the same level today).

**The teen-viral levers, deliberately:** attempt counter worn like a badge (in-world, GD-style) · death % as bragging currency · shareable one-liners ("💀 died at 87% on KERNEL PANIC, attempt 142 — beat that") · **skins are pure flex, zero pay-to-win** (the skill stays sacred) · feats like *The 99% Club* and *Speedrun to Death* built to be screenshotted.

---

## 📊 The market research behind it

- **Geometry Dash is in full viral resurgence (2025–2026)**: record 103K concurrent on Steam (beating Call of Duty), 17.4M monthly / 1.2M daily players, driven by TikTok/YouTube teen culture. Rage games go viral off meme reaction clips.
- The **official GD isn't on web portals** — only ancient Lite builds and clones; CrazyGames has no proper tag page for the niche. Demand massively exceeds quality supply.
- Portfolio gap: nothing in the auto-runner/rage lane (PulseDrift is dodge-graze; different loop).
- **Fixed seeds = shared experience = conversation.** Procedural games usually can't do "we all grinded the same level" — seeding the generator gives hand-crafted-feeling levels with zero level-design cost, plus a global Daily.

## 🎮 Systems

| System | Implementation |
|--------|----------------|
| **Runner** | 340px/s auto-run, one-tap jump (hold = auto-jump on landing), gravity portals with ceiling corridors; fixed 1/120s step — fully deterministic per seed |
| **Generation** | Pattern vocabulary (spikes ×1–3, blocks, towers, pits, spike-on-block, flip corridors, breathers) placed on the beat grid, difficulty-gated by sector gnar; every pattern closes its own portals so checkpoint respawns are always safe |
| **Rage loop** | Death banks shards instantly → big red %, attempt count, best % → tap = instant retry; deaths feel fair (kill boxes smaller than visuals) |
| **Music** | WebAudio step-sequencer: kick on quarters, hats on eighths, seeded bass arpeggio per sector — obstacles and song share the grid, background pulses on the beat |
| **Economy** | shards = progress % + risky pickups; sector clear pays 250 (first time ×4, daily ×3); skins 150→12K, trails to 3.5K — **cosmetics only** |
| **Feats** | 12 screenshot-bait badges: The 99% Club, Speedrun to Death, Dedication (100 attempts), Week of Pain (7 dailies), Upside Down (10 flips one run)… |
| **Daily Glitch** | Date-seeded level, resets at UTC midnight, tracked separately (attempts/best), clear pays ×3 — the daily return hook |

## 💰 Ad placements (CrazyGames SDK v3 — all doc-compliant)

| Placement | Type | Trigger |
|-----------|------|---------|
| **×2 shards** | Rewarded | On the death panel — every death is an inventory moment |
| **Continue from checkpoint** | Rewarded | Death past 25/50/75% — once per run ("CONTINUE FROM 50%") |
| **Shard Rush** | Rewarded | 60s ×2 shards, visible 3-min cooldown |
| **Double clear bonus** | Rewarded | On the sector-clear screen |
| **Between attempts** | Midgame | Hard rate-limited: 8+ session attempts AND 3+ minutes since last — attempts are seconds long, respect the loop |
| `happytime()` | Signal | Feats, sector clears |

Off-platform all ad calls no-op and grant rewards instantly, so the game is always playable.

## 📁 Folder structure

```
GlitchDash/
├── index.html        ← entry point
├── css/style.css     ← UI styles (HUD, sheet, death/clear panels)
├── js/
│   ├── format.js     ← number/time formatting
│   ├── data.js       ← sectors, patterns, skins, feats, economy — TUNE HERE
│   ├── sdk.js        ← CrazyGames SDK v3 wrapper (+ local fallback, non-blocking)
│   ├── audio.js      ← procedural SFX + beat sequencer (the level IS the song)
│   └── game.js       ← seeded gen, fixed-step physics, rage loop, render, UI
└── README.md
```

## 🚀 Publishing to CrazyGames

1. Test locally — die at 99% at least once (feat included), clear TUTORIAL IS A LIE, check the Daily.
2. Zip the folder contents (`index.html` at zip root):
   ```powershell
   Compress-Archive -Path ".\GlitchDash\*" -DestinationPath ".\zips\GlitchDash-submission.zip" -Force
   ```
3. Upload at **https://developer.crazygames.com** → Submit game.
4. Tags: *geometry dash, one-button, platformer, rage, arcade, casual, mobile*. Thumbnail suggestion: the cube mid-jump over a triple spike, "ATTEMPT 247" glowing behind it.

---

Built from scratch · v1.0 · plain HTML/CSS/JS, no frameworks, no external assets.
