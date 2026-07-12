# DREAM DUO v2 — Elizabeth & Flofy · Diseño

**Rework jul-2026** (la fundadora rechazó el v1 por calidad; pivote respaldado
por el estudio de mercado del game-director del 2026-07-12): fórmula **Two
Cars** con la piel Elizabeth & Flofy. Datos que sostienen el pivote: Two Button
Bounce 4.2★/305k votos en Poki; hueco real en CrazyGames (ningún Two Cars-like
pulido); los clones vagos puntúan 3.1–3.4 por falta de encanto/meta — nuestras
tres diferencias ya pagadas: IP canon con historia, SYNC/RUSH como skill, y
tienda+misiones.

**El twist:** la pantalla se parte A PROPÓSITO.
> *"One brain, two worlds. Elizabeth runs the park, Flofy hops the dream —
> you guide both at the same time."*

## Layout (portrait 390×844, mobile-first)

- **Columna izquierda = el parque** (sendero vertical). **Columna derecha =
  el sueño** (camino de nubes). Divisor de luz en el centro.
- 2 carriles por columna. Los personajes corren "hacia arriba" (retro-vista);
  el mundo baja hacia ellos (telegraph ≈ 3.3s a velocidad base).
- Desktop: pillarbox con el arte del sueño desenfocado (CG acepta portrait).

## Controles (un input binario por mano — ley nº1 del género)

Tap mitad izquierda / `A` / `←` = Elizabeth cambia de carril.
Tap mitad derecha / `L` / `→` = Flofy cambia de carril.
Lerp 120ms + squash&stretch. Sin física de salto: cambio de estado discreto.

## Reglas (legibles en un pantallazo)

- **Estrellas OBLIGATORIAS**: fallar una = combo roto + 1 corazón (la mano
  "vaga" del v1 se acabó — ley nº2: must-collect). GRACIA: los primeros 10s
  un fallo solo enseña ("Catch EVERY star!"), no castiga.
- **Obstáculos prohibidos**: parque (seto/banco/bebedero/paloma) · sueño
  (nube/bloques/peonza/burbuja). Paloma y burbuja CRUZAN de carril (fase 3+).
- **3 corazones compartidos**, invulnerabilidad breve, slow-mo 0.3s + resalte
  rojo de QUÉ te golpeó + marca fantasma 💤 donde moriste la run anterior
  (la lección de la pintura de Duet).

## Fases de una run (30–90s objetivo)

0–6s solo estrellas + manos-guía (tutorial sin texto, saltable jugando) →
6–20s obstáculos sueltos → 20–40s eventos simultáneos asimétricos (estrella
izq + obstáculo dcha) → 40s+ movers, fintas y pares cruzados. Velocidad:
+5% cada 8s, tope ×2.4, SIEMPRE constante dentro del escalón. Fairness del
spawner: nunca dos acciones exigidas a la misma mano en <0.55s.

## SYNC · FAIRY RUSH · ambiente

- **SYNC**: par de estrellas a la misma altura en ambos mundos (espejadas
  hasta fase 3; cruzadas después). Ambas en <0.9s = rayo que cruza el divisor,
  mult ×1→×5. Pares cada ~7s desde el segundo 8.
- **FAIRY RUSH (3 syncs)**: el divisor SE DISUELVE, el parque se vuelve sueño,
  Elizabeth despliega alas (canon fairy), imán de estrellas, invencible, música
  a doble tiempo, 8s. El momento TikTok — alcanzable en la primera sesión.
- Ambiente por tinte sin arte extra: día → GOLDEN HOUR (40s) → STARLIGHT (80s).

## Meta y monetización (R7 CrazyGames)

- **Misiones diarias** (3/día, seed por fecha, recompensa ★ al instante):
  syncs por run, tiempo, estrellas del día, ×5, rush, syncs del día.
- **Tienda** (se conserva del v1): 3 skins con perk + 4 estelas.
- **Rewarded**: revive 1×run (o 100★ — alternativa obligatoria CG) + double
  stars en game over (si ≥10★) + midgame cada 3ª muerte.
- Restart instantáneo (tap/SPACE) — "una más".

## Verificación (bot de playtest en tools/bot-playtest.mjs)

Bot competente: 59.8s, score 1560, 79★, 5 syncs, rush disparado, 3 misiones
completadas, 0 pageerrors, 61 fps. Muertes repartidas en fase 3 (movers).

## Arte v2 (Replicate, $0.26; total juego $1.42)

Nuevo: retro-vistas (eliz-back-a/b, flofy-back-a/b) + 2 columnas verticales
(bg-col-park, bg-col-dream) con **tileado espejo** (elimina la costura que en
v1 parecía "pantalla partida rota"). Se conserva: obstáculos, familia, fairy,
duo-hero, procedurales. El arte side-view y los fondos 16:9 del v1 siguen en
assets/art/ (los usa el pillarbox y el shop).
