// Constantes compartidas (módulo aparte para evitar imports circulares con main.js).

export const W = 1280;
export const H = 720;

// Tres carriles/realidades: 0 = arriba (cian), 1 = medio (ámbar), 2 = abajo (magenta).
export const RAIL_Y = [200, 380, 560];
export const PLAYER_X = 300;

export const RAIL_COLORS = [0x27e7ff, 0xffd94e, 0xff3ea5];

// Paleta por sector (fondo degradado + rejilla + acento).
// Umbrales cercanos a propósito: el jugador medio (runs de 30-60s) debe ver los
// 3 sectores — el contenido escondido "no existe" para la review de CrazyGames.
export const SECTORS = [
  { at: 0,    top: 0x070a1a, bottom: 0x14082e, grid: 0x2a3a7a, accent: 0x27e7ff },
  { at: 250,  top: 0x120620, bottom: 0x2e0818, grid: 0x6a2a5a, accent: 0xff3ea5 },
  { at: 550,  top: 0x041410, bottom: 0x0a2e28, grid: 0x1a6a52, accent: 0x7cffb2 },
];
