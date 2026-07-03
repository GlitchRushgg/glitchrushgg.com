# CLAUDE.md — RICOCHET RUSH

**Survivor-arena** pensado para CrazyGames: te mueves (WASD/flechas/mantener
puntero o dedo), el cañón dispara solo al enemigo más cercano y **todas las
balas rebotan en las paredes** (el twist): **cada rebote CARGA la bala (+45%
daño acumulativo**, más grande y blanca — fallar es estrategia). Dos **prismas
rebotadores** fijos en la arena carambolean balas sin gastar rebotes; matar con
una bala de ≥2 rebotes = **¡CARAMBOLA!** (slow-mo + contador, la stat viral del
share). Enjambre creciente (chaser/speeder/tank/splitter + élites), gemas de
XP → **cartas de mejora** al subir de nivel (8 tipos: daño, cadencia, +rebote,
multidisparo, perforación…), y **monedas persistentes** → tienda de 4 perks
permanentes ×3 niveles. Puntuación = tiempo sobrevivido.

Forma parte del monorepo `glitchrushgg.com` — ver `CLAUDE.md` raíz. Diseño y
encaje de mercado en `docs/DISENO.md` (el estudio de mercado completo vive en
`../glitch-shift/docs/ESTUDIO-MERCADO.md`).

## Ejecutar en local

Sitio estático con módulos ES — debe servirse por HTTP, no abrirse con `file://`:

```powershell
npx -y http-server -p 8080 -c-1 .   # desde la raíz del repo
# abrir http://localhost:8080/ricochet-rush/
# (python no está instalado en este PC; usar http-server)
```

URL en producción (tras aprobación + push a `main`): `https://glitchrushgg.com/ricochet-rush/`.

## Arquitectura

Sin build ni dependencias. **Phaser 3.88 vía CDN**, módulos ES. Resolución
lógica fija **1280×720 (landscape)** con `Scale.FIT`. **Sin motor de físicas**:
movimiento, rebotes y colisiones círculo-círculo manuales con `dt` acotado.
**Arte y audio 100% procedurales** (~50KB + Phaser).

- **`src/const.js`** — `W/H`, paleta `PAL` (ámbar/acid) y tabla `ENEMIES`
  (HP/velocidad/XP/desde qué segundo aparece cada tipo).
- **`src/i18n.js`** — bilingüe es/en (`t(clave, vars)`, localStorage `rr_lang`).
- **`src/items.js`** — `UPGRADES` (cartas de partida, con `apply(stats)`) y
  `PERKS` (permanentes, precios por nivel).
- **`src/scenes/`**
  - `BootScene.js` — texturas procedurales (jugador, 4 enemigos, bala, gema,
    moneda, corazón, glow, grid).
  - `MenuScene.js` — título, mini-demo de balas rebotando, JUGAR/MEJORAS.
  - `GameScene.js` — **núcleo**: `stats` del jugador (semilla = perks de la
    tienda), `_autofire` (multishot en abanico), `_updateBullets` (rebotes en
    `WALL`, `hitIds` para no golpear 2 veces, perforación), `_spawnEnemies`
    (cadencia y tandas escalan con `elapsed`; élites >210s), `_openChoice`
    (level-up congela el mundo, 3 cartas, teclas 1/2/3), drops con imán,
    pausa (P/ESC/botón + auto-pausa al perder foco), HUD (crono, corazones,
    XP, monedas).
  - `GameOverScene.js` — tiempo/bajas/nivel/monedas, récord, retry (ESPACIO
    sin auto-repeat), tienda, menú, compartir.
  - `ShopScene.js` — 4 perks permanentes con pips de nivel.
- **`src/utils/`** — `Sound.js` (SFX + música synth, **AudioContext único
  compartido** — límite de Safari/iOS) y `Save.js` (récord, monedas, perks,
  mute, tutorial; try/catch para iframes sin localStorage).
- **`tools/smoketest.mjs`** — prueba headless (playwright-core reutilizado de
  `games/elizabeth-flofy/tools/node_modules` vía `NODE_PATH`).

## Estado / pendiente

- **PRIVADO**: no publicar (push a `main`) hasta aprobación de la fundadora.
- Pendiente al publicar: card en la landing raíz y entrada en el `CLAUDE.md` raíz.
- Paquete CrazyGames (build aparte): Phaser local en `vendor/`, quitar la URL
  de compartir, portadas 3 tamaños sin capturas/UI, vídeos ≤20s.

## Depuración

`window.__rr` expone la GameScene activa. Trucos: `__rr.stats.dmg = 999`,
`__rr.elapsed = 200` (adelanta los tipos de enemigo), `__rr.invuln = 999`,
`__rr.xp = 99` y recoger una gema (fuerza level-up). El audio arranca con el
primer gesto (política de autoplay).
