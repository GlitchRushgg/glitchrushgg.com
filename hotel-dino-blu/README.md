# 🧹 Hotel Dino Blu — Turno de Limpieza 3D

Juego 3D en primera persona ambientado en el **Hotel Dino Blu** de **Praia a Mare**
(Calabria, Italia), frente a la **Isola di Dino**. Inspirado en el trabajo real de
las camareras de piso de un hotel.

**Jugar:** `https://glitchrushgg.com/hotel-dino-blu/`

**Idiomas:** español · english · italiano (selector en la pantalla de inicio; se
detecta el idioma del navegador automáticamente).

---

## La historia

Eres **Sofía**, camarera de pisos del **2º piso**. Tu jornada va de las **6:00** a las
**14:00** (hora de entrada de los nuevos huéspedes): la gobernanta **Lucía** acaba de
repartir el parte de trabajo y tienes que dejar perfectas las **11 habitaciones** ocupadas de tu piso.

El hotel tiene **4 pisos de habitaciones** y un equipo de **5 empleadas de limpieza
más la gobernanta**:

| Quién | Dónde |
|---|---|
| **Sofía** (tú) | 2º piso |
| **Anna** | 1º piso |
| **Giulia** | 3º piso |
| **Martina** | 4º piso |
| **Carmela** | Lavandería (5 lavadoras + 2 secadoras) |
| **Lucía** | Gobernanta — inspecciona tu trabajo |

## Reglas del oficio (como en un hotel real)

- 🔴 **SALIDA** (it. *partenza* · en. *check-out*) — el huésped se marcha: cambio
  **completo** (retirar toda la ropa, sábanas nuevas, baño a fondo, toallas, suelo,
  papelera y cortesías).
- 🔵 **ESTANCIA** (it. *fermata* · en. *stay-over*) — el huésped se queda: repaso
  diario. Las **sábanas se cambian cada 3 noches** de estancia.
- 🧺 **Toallas por habitación**: por cada huésped **1 grande + 1 de bidet +
  1 pequeña**, más **1 alfombrín** para el suelo del baño.
- 👜 El carro lleva una cantidad limitada de lencería: baja en el ascensor a la
  **lavandería (P-1)** para entregar la ropa sucia y reponer la limpia
  (¡cargar más de 20 piezas de ropa sucia te hace caminar más despacio!).
- 👩‍💼 Lucía inspecciona las habitaciones terminadas: si dejaste mal las toallas,
  amonestación. **Tres amonestaciones y se acabó la jornada.**

## Controles

| Acción | Escritorio | Móvil |
|---|---|---|
| Mirar | Ratón | Arrastrar la pantalla |
| Moverse | `W A S D` / flechas | Joystick izquierdo |
| Correr | `Shift` | — |
| Realizar tarea | Mantener `E` | Mantener el botón ✋ |
| Ascensor / toallas | Pulsar `E` | Tocar el botón ✋ |

## Puntuación

- +10 por tarea · +100 por habitación ESTANCIA · +125 por SALIDA
- +30 por juego de toallas exacto · +30 por inspección superada
- Bono de tiempo si terminas antes de las 14:00 · −60 por amonestación
- De 0 a 5 ⭐ al final del turno

## Técnica

- [Three.js](https://threejs.org/) r160 (incluido en `lib/`, sin build ni CDN)
- Todo el hotel (4 pisos × 12 habitaciones, recepción, lavandería, playa, mar e
  Isola di Dino) se genera proceduralmente con geometría básica
- Sonidos con Web Audio API · texturas de texto con Canvas
- La lavandería está modelada a partir de fotos reales del hotel: lavadoras
  industriales con ojo de buey, secadoras negras, mesa central de plancha,
  estanterías de lencería y detergentes

## Ejecutar en local

```bash
python3 -m http.server 8080
# abrir http://localhost:8080/hotel-dino-blu/
```
