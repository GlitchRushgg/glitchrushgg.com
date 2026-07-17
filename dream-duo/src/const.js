// Shared constants — DREAM DUO v2 (portrait, two worlds side by side).
// Pivote validado por estudio de mercado jul-2026: fórmula Two Cars — un input
// binario por mano, estrellas OBLIGATORIAS, obstáculos prohibidos, endless.

export const W = 390;
export const H = 844;

// Dos columnas-mundo: parque (izquierda) y sueño (derecha), 2 carriles cada una.
export const DIV_X = W / 2;
export const LANES = [49, 146, 244, 341];   // abs: 0-1 = parque · 2-3 = sueño
export const CHAR_Y = 700;                  // línea de los personajes
export const HIT_WIN = 46;                  // ventana vertical de contacto (px)
export const SPAWN_Y = -90;
export const LERP_MS = 120;                 // cambio de carril (feel Two Cars)

// Velocidad: constante dentro de cada escalón (ley de fairness nº3) —
// +5% cada 8 s, tope ×2.4. Telegraph inicial ≈ 3.3 s de caída visible.
// REDISEÑO C4 (2026-07-17, "el juego no gusta"): arranque -15% y tope suave
// los 2 primeros minutos — el reto sube DESPUÉS de que el niño entienda
export const SPEED0 = 205;
export const RAMP_STEP = 0.05;
export const RAMP_EVERY = 8;
export const MAX_RAMP = 2.4;
export const EARLY_CAP = 1.8;               // tope de ramp en los 2 primeros min
export const EARLY_SECS = 120;
export const WAKE_STARS = 10;               // C2: estrellas para despertar a Flofy
export const PX_PER_M = 10;

// SYNC & FAIRY RUSH (la profundidad de skill que los clones no tienen)
export const SYNC_WINDOW = 0.9;             // s entre ambas estrellas del par
export const MAX_MULT = 5;
export const METER_MAX = 2;                 // C5: el FAIRY RUSH llega a 2 syncs
export const RUSH_SECS = 8;
export const SHIELD_SECS = 8;
export const REVIVE_STARS = 100;            // alternativa al rewarded (req. CG)

// Ciclo de ambiente por tinte (sin arte extra): día → atardecer → noche
export const TINTS = [
  { t: 0xffffff, name: "" },
  { t: 0xffc9a0, name: "GOLDEN HOUR" },
  { t: 0xa9b4e8, name: "STARLIGHT" },
];
export const TINT_EVERY = 40;               // s por fase
