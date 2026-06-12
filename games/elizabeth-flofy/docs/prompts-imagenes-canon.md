# Imágenes canon de Elizabeth & Flofy — Prompts listos para generar

Estas 10 imágenes son la **referencia maestra** del avatar. Se generan UNA vez y luego
se usan como imagen inicial / referencia de personaje en cada clip de video
(Veo 3/Flow: "ingredients" o primer frame; Kling/Hailuo: image-to-video).

## Cómo usarlos para máxima consistencia

1. **Genera primero la imagen #1** (Elizabeth de frente). Esa es la imagen madre.
2. En Midjourney usa `--cref <URL de la imagen #1> --cw 100` en todas las demás.
   En Gemini/Imagen o ChatGPT: adjunta la imagen #1 y escribe "same exact character as
   this reference image" al inicio del prompt.
3. Genera 4 variantes de cada una y elige la más fiel. Guarda las elegidas en
   `assets/canon/` con los nombres indicados.
4. Repite el proceso con Flofy partiendo de la imagen #7.

**Bloque de estilo** (va al final de TODOS los prompts):

> `STYLE: stylized 3D video game character render, Fortnite/Pixar hybrid style,
> clean game-engine look, soft rim lighting, vibrant saturated colors, simple
> neutral studio background, full body visible, high detail, no photorealism`

**Negative prompt** (donde la herramienta lo permita):

> `photorealistic, realistic skin, real child, uncanny, dark, scary, extra fingers,
> deformed hands, text, watermark`

---

## ELIZABETH (imágenes 1-6)

**Bloque de personaje** (idéntico en las 6 — NO cambiar ni una palabra):

> A heroic 7-year-old girl video game character: light golden-brown hair in two
> braided pigtails with small pink hair ties, big warm brown eyes, light freckles
> on her cheeks, huge confident gap-toothed grin. Adventurer outfit: pink hoodie
> with a white bunny emblem on the chest, yellow t-shirt underneath, dark leggings,
> chunky pink-and-white sneakers, small tan explorer backpack.

### 1. `elizabeth-front.png` — pose T de frente (imagen madre)
```
[BLOQUE DE PERSONAJE] Standing straight facing the camera in a relaxed A-pose,
arms slightly away from her body, friendly smile, character-select-screen framing.
[STYLE] [NEGATIVE]
```

### 2. `elizabeth-profile.png` — perfil
```
[BLOQUE DE PERSONAJE] Full side profile view facing right, standing straight,
braided pigtail and backpack clearly visible from the side. [STYLE] [NEGATIVE]
```

### 3. `elizabeth-running.png` — corriendo
```
[BLOQUE DE PERSONAJE] Dynamic running pose mid-stride toward the camera at a slight
angle, braids flying behind her, determined adventurous expression, motion energy.
[STYLE] [NEGATIVE]
```

### 4. `elizabeth-celebrating.png` — celebrando
```
[BLOQUE DE PERSONAJE] Victory celebration pose: both fists raised to the sky,
jumping with knees bent, eyes closed with pure joy, confetti particles around her.
[STYLE] [NEGATIVE]
```

### 5. `elizabeth-surprised.png` — sorprendida (cara de "vi un glitch")
```
[BLOQUE DE PERSONAJE] Frozen mid-step with wide eyes and mouth open in an "oh!"
of surprise, hands slightly raised, leaning back a little, comic exaggerated
expression. [STYLE] [NEGATIVE]
```

### 6. `elizabeth-skin-candy.png` — skin Caramelo (para los 100 Días)
```
[BLOQUE DE PERSONAJE, sustituyendo el outfit por:] Candy adventurer outfit: pastel
candy-armor chest plate with a white bunny emblem made of frosting, lollipop staff
in one hand, same braided pigtails, same face. Standing in A-pose facing camera.
[STYLE] [NEGATIVE]
```

---

## FLOFY (imágenes 7-9)

**Bloque de personaje** (idéntico en las 3):

> Flofy, a white plush bunny video game companion: cream-white shaggy soft fur,
> long floppy ears, a grey embroidered oval nose, small black bead eyes, slightly
> squished huggable body of a well-loved stuffed animal, faint golden "legendary
> item" glow with tiny sparkle particles around him.

### 7. `flofy-front.png` — de frente (imagen madre de Flofy)
```
[BLOQUE DE FLOFY] Sitting facing the camera like an item-shop display, ears
relaxed, innocent expression. [STYLE] [NEGATIVE]
```

### 8. `flofy-jumping.png` — saltando (pose del abrazo purificador)
```
[BLOQUE DE FLOFY] Mid-air heroic leap with front paws stretched forward ready to
hug, ears flying upward, golden sparkle trail behind him, determined cute face.
[STYLE] [NEGATIVE]
```

### 9. `flofy-offended.png` — ofendido (pose meme para los Shorts)
```
[BLOQUE DE FLOFY] Sitting with his back half-turned to the camera, looking over
his shoulder with narrowed bead eyes and one ear bent, classic offended-plushie
meme pose. [STYLE] [NEGATIVE]
```

---

## DÚO (imagen 10)

### 10. `duo-hero.png` — portada del canal / miniaturas
```
Same two characters as the reference images: [BLOQUE DE PERSONAJE de Elizabeth] and
[BLOQUE DE FLOFY]. Elizabeth kneels on one knee with a confident grin while Flofy
sits on her shoulder striking a tiny hero pose; behind them a colorful game world
horizon and a subtle pink-purple glitch effect in one corner of the sky. Epic but
adorable key-art composition. [STYLE] [NEGATIVE]
```

---

## Checklist de validación (antes de dar una imagen por "canon")

- [ ] Trenzas: dos, con gomas rosas, mismo largo en todas
- [ ] Cara: pecas + sonrisa con diente faltante visibles
- [ ] Emblema de conejo blanco en el pecho del hoodie
- [ ] Flofy: nariz gris ovalada bordada (no rosa, no negra) y orejas caídas
- [ ] Brillo dorado de Flofy presente pero sutil
- [ ] Nada fotorrealista — si parece una niña real, descartar y regenerar

---

## Nota técnica para generar vía API de Replicate (sesión de Claude Code)

- Modelo recomendado: `google/nano-banana` (Gemini image en Replicate) — admite
  `image_input` con imágenes de referencia, ideal para consistencia de personaje.
  Alternativa text-to-image para la imagen madre: `black-forest-labs/flux-1.1-pro`.
- Endpoint síncrono:
  `POST https://api.replicate.com/v1/models/google/nano-banana/predictions`
  con header `Prefer: wait` y body `{"input": {"prompt": "...", "image_input": ["<url imagen madre>"], "aspect_ratio": "3:4", "output_format": "png"}}`.
- El token se pasa en `Authorization: Bearer $REPLICATE_API_TOKEN` (pedirlo al
  usuario o leerlo de la variable de entorno; NUNCA guardarlo en el repo).
- Flujo: generar `elizabeth-front` → validar con el checklist → usar su URL de
  salida como `image_input` en las otras 5 de Elizabeth → igual con Flofy desde
  `flofy-front` → el dúo con ambas referencias → descargar todas a `assets/canon/`
  → commit + push → enviar al usuario para aprobación.
