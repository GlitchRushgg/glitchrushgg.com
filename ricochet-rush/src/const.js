// Constantes compartidas (módulo aparte para evitar imports circulares con main.js).

export const W = 1280;
export const H = 720;

// Paleta: ámbar/acid sobre oscuro cálido (hermana neón de GLITCH SHIFT, tono propio).
export const PAL = {
  bgTop: 0x0d0a06,
  bgBottom: 0x1a1208,
  grid: 0x5a4a22,
  player: 0xffc93e,
  bullet: 0xffe89a,
  xp: 0x7cff5e,
  coin: 0xffd94e,
  hurt: 0xff4e3a,
  ui: 0xffe6b0,
};

// Tipos de enemigo: forma, tamaño, HP, velocidad, XP, desde qué segundo aparecen.
export const ENEMIES = {
  chaser: { tex: "en-chaser", r: 20, hp: 10, speed: 95, xp: 1, from: 0, tint: 0xff5e8a },
  speeder: { tex: "en-speeder", r: 13, hp: 6, speed: 175, xp: 1, from: 45, tint: 0x5ecbff },
  tank: { tex: "en-tank", r: 32, hp: 60, speed: 55, xp: 5, from: 90, tint: 0xb05eff },
  splitter: { tex: "en-splitter", r: 24, hp: 20, speed: 85, xp: 3, from: 150, tint: 0x5eff9a },
  mini: { tex: "en-speeder", r: 10, hp: 4, speed: 145, xp: 1, from: 99999, tint: 0x5eff9a },
};
