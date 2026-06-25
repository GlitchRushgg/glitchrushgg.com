# Créditos y procedencia de los assets — Hotel Dino Blu

Todos los recursos visuales y sonoros de este juego son **generados por IA por el estudio,
de dominio público (CC0) o sintetizados por código**. No se incluye material con copyright
de terceros.

> Nota sobre titularidad: las imágenes generadas íntegramente por IA probablemente **no son
> protegibles por copyright** en la UE/Italia (falta de autoría humana). El estudio tiene
> **derecho a usarlas comercialmente** conforme a los términos de los modelos, pero no
> reclama un copyright exclusivo sobre ellas.

## Imágenes generadas por IA (uso comercial conforme a los términos de los modelos)

Generadas por el estudio con **Replicate** (cuenta `glitchrushgg`), uso comercial permitido
por los términos de los modelos:

- **Texturas** — `assets/tex/*.jpg` (marble, carpet, parquet, tile, cotto, bedspread,
  sea, sand, grass, paving): generadas con `black-forest-labs/flux-schnell` como texturas
  planas/tileables (prompts de "seamless tileable material swatch, top-down").
  `marble.jpg` y `carpet.jpg` regeneradas el 2026-06-17 como texturas sin costuras.
- **Avatares del personal** — `assets/housekeper/*.png` (sofia, anna, giulia, marco,
  carmela, lucia, + sus `*-cut.png` recortados): figuras estilizadas de ficción,
  generadas con `black-forest-labs/flux-1.1-pro` y `google/nano-banana`; recortes de
  fondo con `cjwbw/rembg`. No representan a personas reales.
- **Portada** — `assets/cover.jpg`: generada con Replicate (Flux).

## Modelos 3D (dominio público — CC0)

- `assets/models/char-woman.glb`: modelo **"Woman"** de **Quaternius**
  (https://quaternius.com, vía Poly Pizza), licencia **CC0 / dominio público**.
  Quaternius publica todos sus packs como CC0.
- Muebles del **Furniture Kit** de **Kenney** (https://kenney.nl/assets/furniture-kit,
  también en Poly Pizza https://poly.pizza/bundle/Furniture-Kit-NoG1sEUD1z), todos
  **CC0 / dominio público** (sin atribución obligatoria). Cada `.glb` del juego es una
  copia renombrada del modelo correspondiente del kit:
  - `assets/models/sofa.glb` → `loungeSofa.glb` (sofá) — Kenney, CC0.
  - `assets/models/armchair.glb` → `loungeChair.glb` (sillón) — Kenney, CC0.
  - `assets/models/floorlamp.glb` → `lampRoundFloor.glb` (lámpara de pie) — Kenney, CC0.
  - `assets/models/lamp.glb` → `lampRoundTable.glb` (lámpara de mesa) — Kenney, CC0.
  - `assets/models/plant.glb` → `pottedPlant.glb` (planta en maceta) — Kenney, CC0.

  Origen: Furniture Kit de Kenney (kenney.nl), licencia **CC0** verificada (todo el
  catálogo de Kenney es de dominio público). El juego normaliza escala/orientación de
  cada modelo en tiempo de carga (`loadDecorModels`), por lo que no se modificaron los
  `.glb` salvo el renombrado.

## Audio

- Música ambiente y tarantela + efectos: **100 % sintetizados** con la Web Audio API en
  `game.js` (sin samples ni grabaciones de terceros).

## Ambientación

- **Hotel Dino Blu** es un establecimiento **de ficción**. Cualquier parecido con hoteles
  o personas reales es casual. La localización (Praia a Mare, Isola di Dino) usa topónimos
  y geografía reales, que no son apropiables.
