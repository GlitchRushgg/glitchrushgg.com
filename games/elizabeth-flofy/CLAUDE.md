# CLAUDE.md — Elizabeth & Flofy: Glitch Rush

Arcade móvil de **un toque**: un GLITCH rosa-púrpura corrompe objetos del mundo; tocas
cada objeto glitcheado y **Flofy salta a purificarlo con un abrazo** antes de que el
anillo de tiempo se agote. Si uno se escapa, pierdes un corazón (3 en total). Encadena
purificaciones para **combo**, llena las **chispas** de Flofy para el **ABRAZO TOTAL**
(purifica todo en pantalla) y aprovecha los **power-ups de la familia** (mamá cura,
Norman escuda, Cristian limpia los glitches altos).

Forma parte del monorepo `glitchrushgg.com` — ver `CLAUDE.md` raíz para convenciones.

## Ejecutar en local

Sitio estático con módulos ES — debe servirse por HTTP, no abrirse con `file://`:

```powershell
npx -y http-server -p 8080 -c-1 .   # desde la raíz del repo
# abrir http://localhost:8080/games/elizabeth-flofy/
# (python no está instalado en este PC; usar http-server)
```

URL en producción (tras aprobación + push a `main`): `https://glitchrushgg.com/games/elizabeth-flofy/`.

## Arquitectura

Sin build ni dependencias propias. **Phaser 3.88 vía CDN** (como Noah), módulos ES.
Resolución lógica fija **390×844** (retrato) con `Scale.FIT`; todas las posiciones
están cableadas a ese espacio.

- **`index.html`** — carga Phaser (CDN), la fuente Fredoka y `src/main.js`.
- **`src/main.js`** — config de Phaser y registro de escenas. Exporta `W`/`H` (390×844).
- **`src/i18n.js`** — **bilingüe es/en**. `t(clave, vars)` para todo texto visible;
  idioma por defecto = navegador con respaldo a español; elección en `localStorage`
  (`ef_lang`). Selector ES/EN en el menú.
- **`src/scenes/`**
  - `BootScene.js` — carga las imágenes canon de `assets/canon/` y genera texturas
    procedurales (`confetti`, `spark`).
  - `MenuScene.js` — portada (key art `duo-hero`), récord, cómo jugar, selector idioma.
  - `GameScene.js` — **el núcleo**. Spawns con dificultad creciente (`_diff()`),
    glitches con anillo de tiempo + jitter, `_purify()` / `_glitchEscaped()`, combo,
    chispas/Abrazo Total (`MEGA_MAX`), power-ups de la familia (`_spawnPowerup`).
  - `GameOverScene.js` — resultado, récord nuevo, compartir (Web Share API) y reintentar.
- **`src/utils/`**
  - `Sound.js` — audio **sintetizado** con Web Audio API (sin archivos).
  - `Scores.js` — récord personal en `localStorage` (`efGlitchRushBest`).
- **`assets/canon/`** — imágenes maestras del avatar (familia + Flofy + key art),
  generadas con Replicate. Se usan como sprites: `flofy`, `flofy-jump`, `elizabeth`,
  `mama`, `papa`, `cristian`, `duo`.
- **`assets/refs/`** — fotos reales de referencia (gitignored, NO subir: incluyen a un
  menor). Ver `.gitignore`.
- **`tools/generate-canon.mjs`** — pipeline de generación de las imágenes canon
  (Replicate `google/nano-banana`, token en env `REPLICATE_API_TOKEN`).
- **`docs/`** — requisitos, prompts canon y guiones de vídeos virales.

## Estado / pendiente

- **PRIVADO**: no publicar (push a `main`) hasta aprobación de la fundadora.
- Pendiente al publicar: card en la landing raíz (`index.html`) y entrada en la lista
  Games del `CLAUDE.md` raíz.
- Posibles mejoras: PWA (manifest + sw como Noah), tarjeta de resultado compartible
  con imagen, más tipos de glitch/jefes, skins de Elizabeth (hada).

## Depuración

Las escenas Phaser se registran en `src/main.js`. Para saltar al fin de partida, baja
`this._lives` en `GameScene`. El audio requiere un gesto del usuario para arrancar
(política de autoplay): el primer toque desbloquea el contexto.
