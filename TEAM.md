# Equipo GlitchRushGG — Consejo de Agentes IA

GlitchRushGG es un estudio unipersonal: una fundadora + un consejo ejecutivo de agentes de IA definidos en [`.claude/agents/`](.claude/agents/). Cada agente tiene su rol, el contexto del estudio precargado y reglas de honestidad (nada de humo, recursos limitados, cadencias sostenibles).

## Organigrama

```
                        ┌─────────────────────────┐
                        │       FUNDADORA          │
                        │  (decisiones finales)    │
                        └───────────┬─────────────┘
                                    │
                        ┌───────────┴─────────────┐
                        │   CLAUDE CODE (COO/IA)   │
                        │  orquesta a los agentes  │
                        │  y ejecuta el código     │
                        └───────────┬─────────────┘
          ┌──────────────┬──────────┼──────────────┬───────────────┐
          │              │          │              │               │
   ┌──────┴─────┐ ┌──────┴───────┐ ┌┴────────────┐ ┌┴────────────┐ ┌┴──────────────┐
   │    CEO     │ │ GAME         │ │ CRECIMIENTO │ │ PLATAFORMA  │ │ SOPORTE        │
   │ estrategia │ │ DIRECTOR     │ │             │ │             │ │                │
   │ roadmap    │ │ diseño+lore  │ ├─────────────┤ ├─────────────┤ ├────────────────┤
   │ KPIs       │ │ de Noah      │ │ tiktok-     │ │ web-        │ │ cfo-           │
   └────────────┘ └──────────────┘ │ director    │ │ architect   │ │ monetization   │
                                   ├─────────────┤ ├─────────────┤ ├────────────────┤
                                   │ youtube-    │ │ automation- │ │ legal-         │
                                   │ director    │ │ engineer    │ │ director       │
                                   ├─────────────┤ └─────────────┘ └────────────────┘
                                   │ community-  │
                                   │ director    │
                                   ├─────────────┤
                                   │ brand-      │
                                   │ director    │
                                   └─────────────┘
```

## Los 9 directores

| Agente | Rol | Cuándo invocarlo |
|---|---|---|
| `ceo` | Estrategia, roadmap, KPIs, prioridades | "¿Qué hacemos ahora?", objetivos trimestrales |
| `game-director` | Diseño de juego + dirección creativa (mecánicas, balance, lore) | Nuevas mecánicas, retención, narrativa de Noah |
| `tiktok-director` | Crecimiento TikTok: ideas, guiones, hooks, calendarios | Contenido diario/semanal para @glitchrush.gg |
| `youtube-director` | Devlogs, SEO, títulos, miniaturas | Planificar/guionizar episodios |
| `community-director` | Embudo de comunidad, Discord (futuro), betas, eventos | Feedback, embajadores, retos |
| `brand-director` | Identidad visual, tono de voz, consistencia | Nuevos assets, posicionamiento |
| `web-architect` | glitchrushgg.com: SEO, conversión, nuevas páginas | Mejoras de la web |
| `cfo-monetization` | Ingresos, costes, ROI, escenarios financieros | Evaluar cualquier iniciativa con dinero |
| `legal-director` | GDPR, IP, marca, menores (deriva a profesionales) | Antes de captar datos o monetizar |

## Cómo se trabaja

- La fundadora pide algo en Claude Code; Claude (COO) decide si lo resuelve directamente o invoca al director adecuado con la tarea.
- Se pueden convocar varios directores a la vez para "reuniones de consejo" (ej. CEO + CFO + TikTok para el plan trimestral).
- Las decisiones tomadas se guardan en la memoria del proyecto para que ningún agente las re-litigue.

## Decisiones de estructura

- **12 roles del brief original → 9 agentes:** Monetización+CFO fusionados, Game Design+Creative fusionados, y "AI Automation Director" es el propio Claude Code orquestando (con `automation-engineer` para construir herramientas).
- Los agentes piensan y proponen; **el código lo ejecuta Claude Code** en la sesión principal, y **las decisiones las toma la fundadora**.
