# CLAUDE.md — GLITCH SHIFT

Arcade neón de **un toque** pensado para pasar la review de CrazyGames: dos
realidades paralelas (carril cian arriba, magenta abajo); **tocas para
*shiftear*** entre ellas y esquivar lo que venga por tu carril; **mantienes
pulsado para OVERCLOCK** (cámara lenta que gasta energía; los *near-miss* la
recargan). Bits = moneda persistente para la tienda de skins y estelas.
3 sectores con paleta y obstáculo nuevo cada uno (bloques/muros → drones que
cambian de carril → láseres telegrafiados).

Forma parte del monorepo `glitchrushgg.com` — ver `CLAUDE.md` raíz. El estudio
de mercado que fundamenta el diseño está en `docs/ESTUDIO-MERCADO.md`.

## Ejecutar en local

Sitio estático con módulos ES — debe servirse por HTTP, no abrirse con `file://`:

```powershell
npx -y http-server -p 8080 -c-1 .   # desde la raíz del repo
# abrir http://localhost:8080/glitch-shift/
# (python no está instalado en este PC; usar http-server)
```

URL en producción (tras aprobación + push a `main`): `https://glitchrushgg.com/glitch-shift/`.

## Arquitectura

Sin build ni dependencias. **Phaser 3.88 vía CDN**, módulos ES. Resolución
lógica fija **1280×720 (landscape)** con `Scale.FIT` — CrazyGames revisa primero
en desktop 16:9. **Sin motor de físicas**: movimiento y colisiones manuales con
`dt` acotado (consistente a cualquier Hz). **Arte 100% procedural** (texturas
generadas en BootScene, cero assets externos → build de ~40KB + Phaser).

- **`index.html`** — carga Phaser (CDN) y `src/main.js`.
- **`src/const.js`** — `W/H`, carriles (`RAIL_Y`), colores y paletas de sector.
  Módulo aparte para evitar el import circular main↔escenas (TDZ).
- **`src/i18n.js`** — bilingüe es/en (`t(clave, vars)`, localStorage `gs_lang`).
- **`src/items.js`** — catálogo de la tienda (6 skins + 4 estelas).
- **`src/scenes/`**
  - `BootScene.js` — genera todas las texturas (orbes-skin, bloque, dron, bit,
    escudo, láser, rejilla, glow).
  - `MenuScene.js` — título glitch, demo del orbe, JUGAR/TIENDA, idioma, mute.
  - `GameScene.js` — **núcleo**: raíles, `_swap()` (shift con fantasmas
    cromáticos), overclock por mantener (`ts` = timescale manual), spawner de
    patrones por pesos y sector (`_spawnPattern`), drones (`state` cruise→blink→
    swap), láseres (warn→fire), near-miss (recarga energía + bits), escudo,
    pausa (`_togglePause`, botón + P/ESC) y HUD con barra de OVERCLOCK.
  - `GameOverScene.js` — SIGNAL LOST, distancia, bits ganados, récord, retry
    (ESPACIO), tienda, menú, compartir (Web Share API).
  - `ShopScene.js` — tarjetas de skins/estelas: equipar/comprar con bits.
- **`src/utils/`**
  - `Sound.js` — SFX sintetizados + **música synth** (secuenciador con lookahead).
  - `Save.js` — localStorage: récord, bits, ítems, skin/estela, mute, tutorial.
- **`tools/smoketest.mjs`** — prueba headless (reutiliza el playwright-core ya
  instalado en `games/elizabeth-flofy/tools/node_modules` vía `NODE_PATH`).

## Estado / pendiente

- **PRIVADO**: no publicar (push a `main`) hasta aprobación de la fundadora.
- Pendiente al publicar: card en la landing raíz y entrada en el `CLAUDE.md` raíz.
- Para el envío a CrazyGames (build aparte, como Noah): Phaser **local** en
  `vendor/`, sin enlaces externos (quitar URL de compartir), portadas 3 tamaños
  sin capturas/UI, vídeos ≤20s. Reglas completas en la memoria
  `crazygames-noah-submission`.

## Depuración

`window.__gs` expone la GameScene activa. Para probar sectores altos:
`__gs.distPx = 30000` (sector 2) / `__gs.distPx = 50000` (sector 3). El audio
arranca con el primer gesto del usuario (política de autoplay).
