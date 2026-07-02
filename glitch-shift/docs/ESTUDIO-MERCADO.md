# Estudio de mercado — listón de CrazyGames (julio 2026)

Informe del agente CEO (fuentes web reales, 2025-2026) que fundamenta el diseño de
**GLITCH SHIFT**. Contexto: "Don't Drown, Noah!" fue rechazado por CrazyGames
(jun 2026) con el motivo genérico "overall quality does not meet expectations".

## 1. Qué runners/arcade de un toque triunfan hoy en CrazyGames

Dominan la categoría [Running](https://www.crazygames.com/t/running) y
[Arcade](https://www.crazygames.com/c/arcade): **Subway Surfers, Slope, Count
Masters, Man Runner 2048, Draw Climber, Run 3, Om Nom: Run**.

Qué tienen en común:

- **Sesiones cortas medidas en high-score**, no en progresión larga: una run
  completa y satisfactoria en 1-3 minutos.
- **Un gancho de mecánica visible en 3 segundos.** No basta "salta y esquiva":
  los aprobados recientes llevan un *twist* nombrable en una frase.
- **Meta-progresión ligera**: monedas → personajes/skins desbloqueables. El
  replay-rate alto es lo que las plataformas premian.
- **Juiciness constante**: feedback inmediato a cada input, gráficos vibrantes,
  audio completo. ~70% del tráfico de juegos web populares es móvil.

## 2. El listón real de CrazyGames en 2026

De las guías oficiales ([Quality](https://docs.crazygames.com/requirements/quality/),
[Gameplay](https://docs.crazygames.com/requirements/gameplay/),
[Technical](https://docs.crazygames.com/requirements/technical/),
[FAQ](https://docs.crazygames.com/faq/)):

**Obligatorio (te rechazan si falta):**

- El QA **juega el juego a mano** (~15 min) y evalúa "que funcione suave, cumpla
  estándares y sea divertido". Cualquier freeze/bug = rechazo directo.
- Aterrizar en gameplay **inmediatamente o con máx. 1 clic**.
- Descarga inicial ≤50MB (**≤20MB para portada móvil**), ≤20s hasta jugabilidad.
- Física consistente a distintos Hz, texto legible en iframe 16:9 con dPR:1,
  inglés, touch+ratón+teclado, fluido en Chromebook de 4GB.
- PEGI 12 y — clave — el FAQ lista como causa de rechazo el "**contenido dirigido
  específicamente a menores**" (child-directed) y el "contenido no original
  (clones/asset flips)".

**Calidad (donde cayó Noah):** estilo visual coherente, audio a niveles
consistentes con música complementaria, onboarding visual saltable dentro del
juego, objetivos claros, respuesta rápida al input, y **singularidad**.

**Experiencias de devs:** rechazos genéricos y rápidos (a veces en 2h); la causa
real más citada es "parece un prototipo: le falta contenido y pulido" o
"demasiado similar a títulos existentes". Reenviar está permitido si hay
"mejoras significativas".

## 3. Aceptado vs. rechazado — checklist diferencial

| Feature | Aceptado | Rechazado típico |
|---|---|---|
| Time-to-fun | <10s, tutorial visual in-game saltable | Menús, texto, pantallas previas |
| Contenido | 3+ "capas" (biomas, power-ups, desbloqueables) | Un loop desnudo → "prototipo" |
| Audio | Música + SFX por acción, volúmenes nivelados | Silencio parcial o desigual |
| Twist | Mecánica nombrable en una frase | "Otro runner más" → "unoriginal" |
| Técnica | ≤20MB inicial, 60fps en gama baja, 0 bugs en 15 min | Cualquier freeze/glitch |
| Meta | Monedas + tienda de skins (razón de volver) | Solo high-score sin persistencia |
| UI | Pausa, mute, botones grandes touch, legible en 16:9 | UI de escritorio encajada en móvil |

## 4. ¿Runner de un toque: demanda o saturación?

**Ambas.** El género pasó su punto de saturación pero sigue en el top-10 casual
por engagement en 2025-2026. La demanda existe; lo saturado es el runner
*genérico*. En CrazyGames el desktop es landscape: el QA revisa primero ahí.

**Riesgo a vigilar:** estética muy infantil puede leerse como *child-directed*,
causa explícita de rechazo. La solución: desafío, velocidad y copy de arcade
retante ("how far can you…?"), thumbnail con acción.

## 5. TOP-10 recomendaciones por impacto para pasar la review

1. **Twist mecánico nombrable como corazón visible del juego** — mata el rechazo
   por "unoriginal/prototipo".
2. **Time-to-fun <10s**: Play → jugando; tutorial = overlays de gesto durante la
   primera run, saltables.
3. **Presupuesto de contenido "no-prototipo"**: mínimo 3 biomas, 6-8 tipos de
   obstáculo, 3 power-ups antes de enviar.
4. **Meta-progresión con monedas + tienda** (skins) — replay-rate es lo que la
   plataforma mide y premia.
5. **Audio completo y nivelado**: música + SFX por acción, con mute.
6. **≤20MB de descarga inicial** — habilita la portada móvil.
7. **Desktop digno**: landscape nativo + controles de teclado.
8. **Juiciness sistemático**: squash & stretch, partículas, screen-shake suave,
   racha/combo visible.
9. **Posicionamiento anti-child-directed**: dificultad que escala rápido, copy
   arcade en inglés.
10. **QA propia estilo CrazyGames antes de enviar**: 15 min en Chrome/Edge/móvil
    real, física a 60/120Hz, cero errores de consola, legible en iframe 16:9.

**Veredicto CEO:** el formato tiene demanda real; el rechazo de Noah fue por
listón de "contenido y pulido", no por el género. Se pasa la review entrando
con un juego que parece *terminado*, no una demo bonita.

## Cómo lo aplica GLITCH SHIFT

- Twist nombrable: *"One tap to shift between two glitched realities; hold to
  overclock time."* (recomendación #1)
- Landscape 1280×720 nativo + teclado (#7), arte procedural neón = build de
  <1MB (#6), sin assets de terceros (#2 de la guía de originalidad).
- 3 sectores con paleta y obstáculo nuevo cada uno + escudo + overclock (#3).
- Bits → tienda de skins y estelas, persistente (#4).
- Música synth + SFX por acción + mute + pausa (#5, #10 UI).
- Dificultad que escala agresivo + copy high-score (#9).

---

**Fuentes:**

- https://docs.crazygames.com/requirements/quality/
- https://docs.crazygames.com/requirements/gameplay/
- https://docs.crazygames.com/requirements/technical/
- https://docs.crazygames.com/faq/
- https://www.crazygames.com/t/running · https://www.crazygames.com/c/arcade
- https://www.linkedin.com/pulse/my-game-got-rejected-just-2-hours-dmitrii-rigin
- http://genieee.com/blogs/the-state-of-html5-game-licensing-in-2025-trends-rates-and-marketplaces/
- https://turbogeek.org/why-endless-runner-games-are-still-addictive-in-2026/
- https://ejaw.net/what-is-an-endless-runner-game/
- https://supersonic.com/learn/blog/the-past-present-and-future-of-hyper-casual-runner-games/
- https://www.pocketgamer.com/android/best-auto-runner-games/
- https://www.juegostudio.com/blog/emerging-trends-for-modern-html5-game-development-in-2025
