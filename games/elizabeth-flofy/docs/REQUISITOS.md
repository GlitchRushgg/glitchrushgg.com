# Elizabeth & Flofy — Requisitos del proyecto

Resumen de todo lo necesario para (1) generar las imágenes canon del avatar y
(2) montar el juego dentro del monorepo `glitchrushgg.com`.

---

## 1. Generación de las 10 imágenes canon

Los prompts completos, el bloque de estilo, el negative prompt y el checklist
de validación están en **`prompts-imagenes-canon.md`** (en esta misma carpeta).
Los guiones de los vídeos que usarán estas imágenes están en
**`guiones-videos-virales.md`**.

### Qué se necesita

- **Token de Replicate** en la variable de entorno `REPLICATE_API_TOKEN`
  (nunca guardarlo en el repo).
- **Acceso de red** a `api.replicate.com` (API) y `replicate.delivery`
  (descarga de resultados). En sesiones de Claude Code en la web hay que
  añadir ambos hosts a la *network policy* del entorno en code.claude.com.
- **Modelo**: `google/nano-banana` (admite `image_input` con imágenes de
  referencia, clave para la consistencia del personaje). Alternativa
  text-to-image para la imagen madre: `black-forest-labs/flux-1.1-pro`.
- Endpoint síncrono:
  `POST https://api.replicate.com/v1/models/google/nano-banana/predictions`
  con header `Prefer: wait` y body
  `{"input": {"prompt": "...", "image_input": ["<url imagen madre>"], "aspect_ratio": "3:4", "output_format": "png"}}`.

### Flujo de generación

1. Generar `elizabeth-front.png` (imagen madre) y validarla con el checklist.
2. Usar su URL de salida como `image_input` en las otras 5 de Elizabeth.
3. Repetir con Flofy: `flofy-front.png` como madre de las imágenes 8 y 9.
4. Generar `duo-hero.png` pasando ambas imágenes madre como referencia.
5. Validar CADA imagen con el checklist antes de darla por canon.
6. Guardar las 10 en `games/elizabeth-flofy/assets/canon/` con estos nombres:

| # | Archivo | Descripción |
|---|---|---|
| 1 | `elizabeth-front.png` | A-pose de frente (imagen madre) |
| 2 | `elizabeth-profile.png` | Perfil completo |
| 3 | `elizabeth-running.png` | Corriendo hacia cámara |
| 4 | `elizabeth-celebrating.png` | Celebración con confeti |
| 5 | `elizabeth-surprised.png` | Sorprendida ("vi un glitch") |
| 6 | `elizabeth-skin-fairy.png` | Skin Hada (100 Días) |
| 7 | `flofy-front.png` | Flofy de frente (imagen madre) |
| 8 | `flofy-jumping.png` | Salto del abrazo purificador |
| 9 | `flofy-offended.png` | Pose meme ofendido |
| 10 | `duo-hero.png` | Key art del dúo (portada/miniaturas) |
| 11 | `mama-front.png` | Mamá de Elizabeth de frente (imagen madre) |
| 12 | `mama-profile.png` | Mamá de Elizabeth de perfil |
| 13 | `mama-running.png` | Mamá de Elizabeth corriendo |

7. Commit + push y enviar las imágenes para aprobación antes de usarlas.

### Checklist de validación (resumen)

- Trenzas: dos, con gomas rosas, mismo largo en todas.
- Cara: pecas + sonrisa con diente faltante visibles.
- Emblema de conejo blanco en el pecho del hoodie.
- Flofy: nariz gris ovalada bordada (no rosa, no negra) y orejas caídas.
- Brillo dorado de Flofy presente pero sutil.
- Nada fotorrealista — si parece una niña real, descartar y regenerar.

---

## 2. Lo que requiere el juego en el monorepo

Según las convenciones de `glitchrushgg.com` (ver `CLAUDE.md` raíz):

- **Carpeta autocontenida** `games/elizabeth-flofy/` — sin build system ni
  dependencias compartidas con otros juegos; nombre en minúsculas (las URLs
  de GitHub Pages distinguen mayúsculas).
- **HTML5 mobile-first** servido como módulos ES estáticos (sin build step);
  debe servirse por HTTP, no abrirse desde `file://`. Motor de referencia en
  el estudio: Phaser 3 (como `noah/`).
- **`CLAUDE.md` propio** documentando arquitectura y cómo ejecutarlo.
- **`.nojekyll`** dentro de la carpeta del juego (requisito de GitHub Pages).
- **Entrada en la lista "Games"** del `CLAUDE.md` raíz.
- **Card en la landing page** (`index.html` raíz).
- **Assets**: las 10 imágenes canon en `assets/canon/` como referencia maestra
  del avatar (sprites del juego y material de vídeo se derivan de ellas).
- Deploy automático: push a `main` publica en `https://glitchrushgg.com`.

### Estructura objetivo

```
games/elizabeth-flofy/
├── CLAUDE.md            (pendiente)
├── .nojekyll            (pendiente)
├── index.html           (pendiente)
├── assets/
│   └── canon/           (pendiente: las 10 imágenes)
├── docs/
│   ├── REQUISITOS.md    (este archivo)
│   ├── prompts-imagenes-canon.md
│   └── guiones-videos-virales.md
└── src/                 (pendiente)
```
