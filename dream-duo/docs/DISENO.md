# DREAM DUO — Elizabeth & Flofy · Diseño

**Twist nombrable (recomendación #1 del estudio):**
> *"One brain, two worlds — run Elizabeth through the park and her magic
> plush bunny through the dream above… at the same time."*

Fundamentado en `../../glitch-shift/docs/ESTUDIO-MERCADO.md` (listón CrazyGames
jul-2026). Género: arcade/skill de reflejos con control dual — el linaje
probado de *Two Cars / Duet / Fireboy & Watergirl solo-mode* (controlar 2
entidades con un cerebro), que NO está saturado en runners y da la
"singularidad" que CrazyGames exige.

## El loop (sesión de 1-3 min, high-score)

Dos carriles horizontales apilados (landscape 1280×720):

- **Abajo — el parque (mundo real):** Elizabeth corre. Salto clásico con
  gravedad (coyote + buffer + altura variable).
- **Arriba — el sueño (mundo de los juguetes):** Flofy bota. Física FLOTANTE
  (gravedad 45%, doble-brinco con aleteo de chispas). Dos manos, dos físicas
  distintas = la dificultad viral tipo "pat your head, rub your belly".

**Controles:** mitad izquierda de pantalla / `A` / `←` = Elizabeth ·
mitad derecha / `L` / `→` = Flofy. Touch + ratón + teclado (requisito CG).
Tutorial = overlays de gesto en la primera run, saltable (time-to-fun <10s).

**Corazones compartidos (3):** golpe = −1 corazón + invulnerabilidad breve
(trip-not-death, validado en Hop & Run). 0 = fin. Kid-friendly sin ser fácil.

## Sistemas (contenido "no-prototipo", rec. #3)

- **SYNC STARS:** pares de estrellas aparecen alineados en ambos mundos;
  recoger AMBAS en <0.7s = SYNC (rayo que conecta los dos mundos) → multiplica
  la puntuación ×1→×5. Es el *graze scoring* de esta casa: expresión de
  habilidad + profundidad de leaderboard.
- **DREAM METER → FAIRY RUSH (el momento TikTok):** 5 syncs llenan el medidor
  → Elizabeth despliega ALAS DE HADA (canon `elizabeth-skin-fairy`), vuela al
  mundo del sueño con Flofy y durante ~8s los dos mundos SE FUNDEN: invencibles,
  imán de estrellas, arcoíris, música a doble tiempo.
- **Power-ups de la familia** (rotan cada ~400m):
  - **Mamá** 💛 — +1 corazón y anima desde el fondo.
  - **Papá** 🛡 — burbuja escudo 8s para los dos.
  - **Cristian** 🛹 — pasa en monopatín (crossover Hop & Run) y limpia los
    obstáculos de los próximos ~300m.
- **8 tipos de obstáculo** en 2 mundos: parque (seto, banco, bebedero de
  pájaros, paloma que cruza volando — se esquiva NO saltando) · sueño (nube
  gruñona, torre de bloques — pide doble-brinco, peonza que embiste, burbuja
  que sube y baja).
- **3 biomas** con crossfade y paleta (día/pastel → atardecer/dorado →
  noche/estrellado) a 400/900/1500m — pronto, para que se vean en la 1ª sesión.
- **Meta-progresión (rec. #4):** estrellas = moneda persistente → TIENDA:
  skins de Elizabeth (Clásica, HADA — sinergia: con el skin hada el Dream
  Meter llena +20% —, Dorada) y estelas de Flofy (4 colores). 7 ítems.

## Anti-child-directed (rec. #9)

Arte adorable PERO dificultad arcade real: velocidad ×2.2 a los 1500m,
patrones asimétricos crecientes, copy retador en inglés
(*"Can your brain run two worlds at once?"*). High-score como métrica única.

## Técnica (rec. #6, #7, #10)

Phaser 3.88 CDN, módulos ES, sin motor de físicas (dt manual acotado →
consistente a 60/120Hz), 1280×720 `Scale.FIT`, arte Replicate comprimido
≤20MB (portada móvil), audio synth completo (música + SFX nivelados + mute +
pausa), SDK CrazyGames v3 con carga condicional por hostname (GDPR en dominio
propio), botón 🏠 oculto en iframe, rewarded revive 1×run (o 100 estrellas —
la alternativa requerida) + double-score + midgame cada 3ª muerte,
`gameplayStart/Stop` + `happytime`. Inglés only (regla del estudio).

## Presupuesto de arte (≤€10 Replicate)

~19 generaciones nano-banana (~$0.75) + ~17 recortes background-remover
(~$0.12): frames side-view de Elizabeth (run×2/jump/fairy-fly) y Flofy
(hop/fall), 7 obstáculos, 6 fondos 16:9 por bioma y mundo. Los cameos de la
familia y el key-art reutilizan el canon existente de
`games/elizabeth-flofy/assets/canon/`. Tope duro $10 en el script.
