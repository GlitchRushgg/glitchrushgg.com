// Constantes compartidas (módulo aparte para evitar imports circulares con main.js).

export const W = 1280;
export const H = 720;

// Los dos carriles/realidades: 0 = arriba (cian), 1 = abajo (magenta).
export const RAIL_Y = [240, 480];
export const PLAYER_X = 300;

export const RAIL_COLORS = [0x27e7ff, 0xff3ea5];

// Paleta por sector (fondo degradado + rejilla + acento).
export const SECTORS = [
  { at: 0,    top: 0x070a1a, bottom: 0x14082e, grid: 0x2a3a7a, accent: 0x27e7ff },
  { at: 400,  top: 0x120620, bottom: 0x2e0818, grid: 0x6a2a5a, accent: 0xff3ea5 },
  { at: 900,  top: 0x041410, bottom: 0x0a2e28, grid: 0x1a6a52, accent: 0x7cffb2 },
];
