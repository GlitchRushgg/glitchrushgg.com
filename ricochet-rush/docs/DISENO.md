# RICOCHET RUSH — diseño y encaje de mercado

Segundo juego del plan CrazyGames (jul 2026). Se apoya en el estudio de mercado
de `../../glitch-shift/docs/ESTUDIO-MERCADO.md` (guías oficiales CrazyGames 2026,
causas de rechazo, checklist aceptado-vs-rechazado). Este doc solo recoge cómo
lo aplica RICOCHET RUSH y las decisiones propias.

## Concepto

**Survivor-arena de un solo escenario:** disparas automáticamente al enemigo más
cercano; tú solo te mueves (WASD / flechas / mantener puntero o dedo). El twist
nombrable: **todas las balas rebotan en las paredes de la arena** — cada mejora
(más rebotes, multidisparo, perforación) convierte la pantalla en una tormenta
de ricochetes. Sobrevive al enjambre el máximo tiempo posible.

> Pitch de una frase: *"Every bullet ricochets — flood the arena."*

## Encaje con el estudio de mercado

- **Género de máxima demanda** en portales 2025-26 (Survivor.io-likes, hordas):
  sesiones 3-8 min, alto replay-rate — lo que CrazyGames premia y licencia mejor.
- **Twist nombrable** (rebotes) → esquiva el rechazo por "clon/unoriginal".
- **3+ capas de contenido**: 4 tipos de enemigo + élites escalados, 9 mejoras
  de partida (cartas al subir de nivel), tienda de 4 perks permanentes ×3
  niveles con monedas persistentes.
- **Time-to-fun <10s**: Play → ya estás disparando; tutorial = 2 hints en la
  primera run.
- **Anti child-directed**: hordas crecientes, high-score, copy "how long can
  you survive?". Estética neón abstracta (sin sangre — apto PEGI 12).
- **Viral/TikTok**: el clímax visual (pantalla llena de balas rebotando +
  enjambre rodeándote) es un clip natural; los builds ("me salió multishot×3 +
  rebote×4") generan conversación.
- **Técnica**: landscape 1280×720 FIT, arte y audio 100% procedurales (~50KB),
  sin físicas de motor (todo manual, robusto a cualquier Hz), teclado + ratón +
  touch, pausa/mute, es/en.

## Sistemas

- **Jugador**: HP en corazones (base 3), invulnerabilidad 1.2s al ser tocado,
  velocidad base 240 px/s.
- **Disparo automático**: al enemigo más cercano; base 2 disparos/s, daño 10,
  balas con **2 rebotes** de serie.
- **Enemigos** (aparecen por los bordes, persiguen): chaser (triángulo, 10 HP),
  speeder (pequeño rápido, 6 HP, desde 45s), tank (grande lento, 60 HP, desde
  90s), splitter (se parte en 2 minis al morir, 20 HP, desde 150s). Élites
  (×3 HP, +tamaño, tinte dorado, sueltan monedas) desde 210s. El HP escala
  ×(1 + t/120) y la cadencia de spawn baja de 1.6s a 0.5s.
- **XP**: gemas al morir el enemigo, imán a corta distancia; subir de nivel
  congela el mundo y ofrece **3 cartas** aleatorias de un pool de 9: +daño,
  +cadencia, +1 rebote, +1 multidisparo, +1 perforación, +velocidad, +imán,
  +1 corazón (y cura), +velocidad de bala.
- **Monedas** (persistentes): ~8% de drop al matar (élites siempre) →
  **tienda de perks permanentes**: Vitalidad (+1 corazón/nivel), Potencia
  (+10% daño), Agilidad (+8% velocidad), Fortuna (+drop de monedas). 3 niveles
  cada uno, precios 25-200.
- **Puntuación**: tiempo sobrevivido (mm:ss) + bajas. Récord en localStorage.

## Reglas de estudio aplicables

- PRIVADO hasta aprobación de la fundadora (no push a main).
- Auditoría qa-auditor + game-director + legal antes de publicar.
- Para el paquete CrazyGames: Phaser local en vendor/, sin enlaces externos,
  portadas sin capturas/UI, vídeos ≤20s (reglas en memoria del estudio).
