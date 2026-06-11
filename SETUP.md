# Puesta en marcha — GlitchRushGG (glitchrushgg.com)

Estado: el repo local ya está estructurado como **monorepo** (landing en la raíz + juego en `noah/` + `brand/` + `CNAME`). Falta lo de abajo.

## 1. Comprar el dominio (verificado DISPONIBLE el 2026-06-11)

1. Ve a [porkbun.com](https://porkbun.com) (alternativas: Namecheap, Cloudflare).
2. Busca y compra **`glitchrushgg.com`** (~$10/año). Crea la cuenta con `glitchrush.gg@gmail.com`.
3. **No compres extras** (hosting, SSL de pago, email premium) — GitHub Pages da hosting y SSL gratis.
4. En el panel DNS del dominio, borra los registros por defecto y añade:

| Tipo | Host | Valor |
|---|---|---|
| A | (apex/vacío) | `185.199.108.153` |
| A | (apex/vacío) | `185.199.109.153` |
| A | (apex/vacío) | `185.199.110.153` |
| A | (apex/vacío) | `185.199.111.153` |
| CNAME | `www` | `glitchrushgg.github.io` |

## 2. Subir el monorepo a GitHub (sin git instalado)

Este PC **no tiene git**, así que usa una de estas dos vías:

**Vía rápida (web):**
1. En GitHub crea un repo nuevo público llamado **`glitchrushgg.com`** (o `site`).
2. Entra al repo → **Add file → Upload files** → arrastra TODO el contenido de esta carpeta (`index.html`, `CNAME`, `noah/`, `brand/`, `.nojekyll`, etc.) → Commit.
   - GitHub web acepta carpetas arrastradas con su estructura.
3. **Settings → Pages** → Source: `main` / root → Save.
4. En la misma página → **Custom domain**: `glitchrushgg.com` → Save → espera y marca **Enforce HTTPS**.

**Vía recomendada a futuro:** instala [GitHub Desktop](https://desktop.github.com) — clonas, editas local y publicas con un clic. Evita los duplicados de subir a mano.

> El repo viejo `GlitchRushgg/noah` puede quedarse vivo un tiempo (la URL vieja sigue funcionando) y archivarse cuando el dominio esté operativo.

## 3. Conectar el formulario de email (MailerLite)

1. Cuenta gratis en [mailerlite.com](https://www.mailerlite.com) con `glitchrush.gg@gmail.com` (gratis hasta 1.000 suscriptores).
2. Crea un **grupo** (ej. "GlitchRushGG Newsletter") con **doble opt-in activado**.
3. **Forms → Embedded forms → Create form** → copia el **`action`** del `<form>` que te da.
4. En `index.html` busca `REEMPLAZAR_CON_ENDPOINT_MAILERLITE` y pégalo.

## 4. Privacidad / RGPD (antes de captar emails)

- Doble opt-in en MailerLite (obligatorio de facto en la UE).
- Página de **Política de privacidad** enlazada donde dice `RGPD` en el form (MailerLite tiene plantilla).
- No captar datos de menores de 16; el marketing apunta a adultos/creadores.

## 5. Enlaces sociales

En el `<footer>` de `index.html` quedan `href="#"` en TikTok, YouTube y Discord. TikTok ya existe: `https://www.tiktok.com/@glitchrush.gg`. Sustituye los demás cuando abras cada canal.

## 6. Analítica (recomendado, respetuoso con RGPD)

[Plausible](https://plausible.io) (sin cookies, sin banner) o GA4. Snippet en el `<head>` de `index.html`.

---

### Checklist rápido
- [ ] Comprar `glitchrushgg.com` + configurar los 5 registros DNS
- [ ] Crear repo nuevo y subir esta carpeta entera (web upload o GitHub Desktop)
- [ ] Activar Pages + custom domain + Enforce HTTPS
- [ ] Cuenta MailerLite + doble opt-in + pegar `action` en `index.html`
- [ ] Página de privacidad enlazada
- [ ] URL de TikTok en el footer (ya existe la cuenta)
- [ ] Analítica
