# CLAUDE.md — DREAM DUO v2 (Elizabeth & Flofy)

**Endless dual-lane arcade** (rework jul-2026, fórmula Two Cars — ver
[docs/DISENO.md](docs/DISENO.md)). La pantalla se parte a propósito:
**columna izquierda = el parque de Elizabeth, columna derecha = el sueño de
Flofy**, 2 carriles por columna, retro-vista, PORTRAIT 390×844. Tap izquierda
/ `A` / `←` = Elizabeth cambia de carril · tap derecha / `L` / `→` = Flofy.
**Estrellas obligatorias** (fallar = corazón, con gracia los primeros 10s),
obstáculos prohibidos, 3 corazones. **SYNC** (par simultáneo <0.9s) sube
×1→×5 y llena el Dream Meter; **3 syncs = FAIRY RUSH** (el divisor se
disuelve, todo se vuelve sueño, Elizabeth hada, imán, 8s — el momento TikTok).
**Misiones diarias** (3/día, seed fecha) + Star Shop (skins con perk +
estelas) + power-ups de la familia (Mamá +❤ · Papá escudo · Cristian barre).
Rewarded: revive (o 100★), double-stars, midgame cada 3ª muerte. English only.

Part of the `glitchrushgg.com` monorepo — see root `CLAUDE.md`.

## Run locally

Static site with ES modules — serve over HTTP, don't open `file://`:

```powershell
npx -y http-server -p 8080 -c-1 .   # from the repo root
# open http://localhost:8080/dream-duo/
```

## Architecture

**Phaser 3.88 via CDN**, ES modules, **portrait 390×844** `Scale.FIT`
(desktop = pillarbox con arte desenfocado vía CSS en index.html), **no
physics engine** — manual dt-capped movement. `input.activePointers: 3`.
CrazyGames SDK v3 loads **conditionally by hostname** (crazygames domains +
localhost; no third-party contact on glitchrushgg.com).

- **`src/const.js`** — lanes/columnas, velocidad por escalones, sync/meter/
  rush, tintes de ambiente.
- **`src/missions.js`** — misiones diarias (pool de 6, 3/día por seed de
  fecha; per-run vs acumuladas; recompensa auto).
- **`src/items.js`** — shop catalogue (skins con perk + trails).
- **`src/scenes/`**
  - `BootScene.js` — carga `assets/art/`, texturas procedurales (star, heart,
    bubble, shield, confetti, ribbonV, charShadow), escala compartida por
    personaje, placeholders si falta un archivo.
  - `MenuScene.js` — key art, PLAY, misiones del día, how-to, shop, share,
    mute, home 🏠 (oculto en el iframe de CG).
  - `GameScene.js` — **core**: spawner por fases con fairness (min 0.55s por
    mano; movers desde fase 3; fintas; pares espejados→cruzados), estrellas
    must-collect con gracia de onboarding, SYNC (`_sync`) + FAIRY RUSH
    (`_startRush`), power-ups (`_collectPickup`), revive (ad o 100★),
    fantasma 💤 de la muerte anterior, slow-mo + resalte del culpable,
    tutorial de manos sin texto, pausa (P/ESC/botón + blur), tinte de
    ambiente 40s/80s.
  - `GameOverScene.js` — panel portrait + confetti en récord, double-stars
    rewarded, misiones con progreso, retry (tap/SPACE), midgame cada 3ª.
  - `ShopScene.js` — skins/trails en layout vertical.
- **`src/utils/`** — `Sound.js` (synth: música + double-time en rush),
  `Save.js` (localStorage `dreamDuo_v1` — los jugadores v1 CONSERVAN
  estrellas/skins; campos de niveles ignorados), `SDK.js` (CG wrapper).
- **`assets/art/`** — sprites PNG + columnas `bg-col-*.jpg` 512×2048 con
  **tileado espejo** (sin costura). `assets/art-src/` = masters (gitignored).
- **`tools/`** — `gen-v2.mjs` (arte v2 nano-banana), `cut-v2.mjs` (rembg con
  fallback de modelos), `compress-v2.mjs` (re-encode + espejo vertical),
  `bot-playtest.mjs` (bot competente: esquiva-primero, persigue estrellas,
  verifica sync/rush/misiones), más el pipeline v1 (`generate-art.mjs`, etc.).

## Status / pending

- v2 EN RAMA `claude/dream-duo-v2` — pendiente de aprobación de la fundadora
  (regla: ella juega antes de cualquier deploy).
- Verificado (bot + manual headless): 61fps, 0 pageerrors, rush + revive +
  misiones + tienda funcionando; run de referencia 59.8s / score 1560.
- Pendiente tras aprobación: paquete CrazyGames (vendor Phaser, SDK
  incondicional, portadas/vídeos), auditoría legal pre-portal.

## Debugging

`window.__dd` expone la GameScene viva: `__dd.meter = 3` + coger un par =
FAIRY RUSH instantáneo; `__dd.hearts = 1`; `window.__ddLoss` = log de
corazones perdidos {t, why, type, col}. Bot: `node tools/bot-playtest.mjs`
(server en :8123). Arte: `node tools/gen-v2.mjs` → `cut-v2.mjs` →
`compress-v2.mjs` (ledger compartido en `tools/.ledger.json`).
