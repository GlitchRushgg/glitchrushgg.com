# Noah's Ark Adventure 🚢

A mobile-friendly children's browser game built with [Phaser 3](https://phaser.io/).

Help Noah collect **pairs of animals** and bring them to the Ark before the rain gets too heavy!

---

## Gameplay

| Action | Desktop | Mobile |
|---|---|---|
| Move left | ← Arrow key | Tap left zone |
| Move right | → Arrow key | Tap right zone |
| Jump | ↑ Arrow key | Tap jump zone (▲) |

1. Walk into an animal to **collect it**.
2. Walk into the **matching second animal** to complete a pair.
3. Walk up to the **Ark** (top-center) to **deliver** the pair.
4. Repeat for all **8 animal pairs** to win!
5. Collecting the wrong second animal drops your first pick — stay focused!

**Scoring:** +100 points per pair delivered.

---

## File Structure

```
noahs-ark/
├── index.html          # Entry point
├── style.css           # Mobile-first layout
├── src/
│   ├── main.js         # Phaser game config & scene list
│   ├── scenes/
│   │   ├── BootScene.js   # Generates all textures programmatically
│   │   ├── MenuScene.js   # Title / start screen
│   │   ├── GameScene.js   # Core gameplay
│   │   ├── UIScene.js     # HUD overlay (score, pairs)
│   │   └── WinScene.js    # Victory screen
│   └── utils/
│       ├── Graphics.js    # All procedural sprite drawing functions
│       └── SoundManager.js  # Web Audio API sound effects
└── README.md
```

> No external assets required — all graphics are drawn with Phaser's
> Graphics API and all sounds are generated with Web Audio API tones.

---

## Run Locally

Because the game uses ES modules (`type="module"`), you need a local HTTP server:

### Option A — Python (no install needed)
```bash
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

### Option B — Node.js / npx
```bash
npx serve .
# or
npx http-server . -p 8080
```

### Option C — VS Code Live Server
Install the **Live Server** extension and click **Go Live** in the status bar.

---

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to `Deploy from a branch` → branch `main` → folder `/ (root)`.
4. Click **Save**.
5. Your game will be live at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```

> The game loads Phaser from a CDN — no build step needed.

---

## Adding Real Sounds

Replace the `SoundManager` Web Audio tones with real audio files:

1. Add `.mp3` files to `assets/audio/`.
2. Load them in `BootScene.preload()`:
   ```js
   this.load.audio('collect', 'assets/audio/collect.mp3');
   ```
3. Play them in `GameScene`:
   ```js
   this.sound.play('collect');
   ```

---

## Tested On

- iPhone Safari (iOS 16+)
- Android Chrome
- Desktop Chrome / Firefox / Safari

---

## License

MIT — free for personal, educational, and commercial use.
