# CLAUDE.md — Hotel Dino Blu

*"Hotel Dino Blu — Turno de Limpieza 3D"*: juego 3D en primera persona donde eres Sofía, camarera de pisos de un hotel de Praia a Mare (Calabria). Debes limpiar las 11 habitaciones ocupadas de tu piso (PARTENZA = cambio completo, FERMATA = repaso) antes de las 14:00, gestionando la lencería del carro y las inspecciones de la gobernanta.

## Ejecutar en local

Es un sitio estático con módulos ES — debe servirse por HTTP, no abrirse con `file://`:

```powershell
python -m http.server 8080   # desde la raíz del repo
# abrir http://localhost:8080/hotel-dino-blu/
```

URL en producción: `https://glitchrushgg.com/hotel-dino-blu/` (GitHub Pages, se despliega al hacer push a `main`).

## Arquitectura

Sin build ni dependencias externas: tres ficheros principales.

- **`index.html`** — pantalla de inicio (manual + parte de trabajo), HUD (reloj, habitaciones, puntuación, corazones, ritmo), controles táctiles (joystick + botón ✋), diálogos (toallas/ascensor) y pantalla de fin. Carga `game.js` como módulo ES con un importmap que resuelve `three` → `lib/three.module.js`. Los textos de la intro son contenedores vacíos que rellena `applyIntroTexts()` según el idioma.
- **`i18n.js`** — los tres idiomas del juego (es/en/it): diccionarios `DICTS` con strings y funciones parametrizadas. El idioma se elige con el selector de la pantalla de inicio (persistido en `localStorage['hg-lang']`, cambiar = `location.reload()` porque los carteles 3D se hornean en texturas Canvas al construir la escena) o se detecta de `navigator.language` con fallback a inglés. Los estados de habitación se localizan: ES SALIDA/ESTANCIA · EN CHECK-OUT/STAY-OVER · IT PARTENZA/FERMATA (su idioma original). Todos los usos pasan por `S.partenza`/`S.fermata` (no hay literales en `game.js`).
- **`game.js`** (~1.500 líneas) — todo el juego en un solo módulo, organizado por secciones comentadas:
  - **Constantes y estado global `G`** — reloj del turno (6:00→14:00, `TIME_RATE` 0.8 min de juego/seg ≈ 10 min reales), inventario del carro (`CART_MAX`/`CART_START`), definición de tareas (`TASK_DEFS`).
  - **Generación procedural** — `genRooms()` baraja 12 habitaciones (5 PARTENZA, 6 FERMATA, 1 LIBRE → 11 a limpiar); todo el edificio (4 plantas, recepción, lavandería en P-1, exterior con playa, mar e Isola di Dino) se construye con geometría básica de Three.js (r160, local en `lib/`).
  - **Colisiones** — AABBs por planta en `SOLID[f]` + límites `BOUNDS[f]`; movimiento FPS con yaw/pitch (pointer lock en escritorio, arrastre en móvil).
  - **Interacción** — array `HOTSPOTS` (tareas por habitación, ascensor, lavandería); tipos `press` (pulsar E) y `hold` (mantener E con barra de progreso). El cambio de planta es un teletransporte con fundido (`travelTo`).
  - **NPCs** — compañeras que patrullan cada planta y Lucía (gobernanta) que inspecciona habitaciones terminadas cada 45 min de juego; 3 amonestaciones = fin de partida.
  - **Sonido** — bips con Web Audio API (`beep`), sin assets de audio.
  - **Texturas** — todas generadas con Canvas (`canvasTex`/`textPlane`): carteles, tarjetas de puerta, nombres de NPC.
- **`style.css`** — HUD, paneles y controles táctiles.

## Depuración

`window.HG = { G, HOTSPOTS }` expone el estado global en la consola para pruebas (p. ej. `HG.G.time = 13*60` para saltar al final del turno).
