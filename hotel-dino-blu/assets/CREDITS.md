# Créditos y procedencia de los assets — Hotel Dino Blu

Todos los recursos visuales y sonoros de este juego son **propios, generados por IA por
el estudio, de dominio público (CC0) o sintetizados por código**. No se incluye material
con copyright de terceros.

## Imágenes generadas por IA (propiedad de GlitchRushGG)

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

- `assets/models/*.glb` (plant, lamp, floorlamp, armchair, sofa, painting): de
  **Poly Pizza** (https://poly.pizza), licencia **CC0 / dominio público**.

## Audio

- Música ambiente y tarantela + efectos: **100 % sintetizados** con la Web Audio API en
  `game.js` (sin samples ni grabaciones de terceros).

## Ambientación

- **Hotel Dino Blu** es un establecimiento **de ficción**. Cualquier parecido con hoteles
  o personas reales es casual. La localización (Praia a Mare, Isola di Dino) usa topónimos
  y geografía reales, que no son apropiables.
