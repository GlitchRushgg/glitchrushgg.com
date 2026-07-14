// Shared constants.

export const W = 1280;
export const H = 720;

// Room vertical layout: wall band, baseboard, floor band.
export const WALL_TOP = 0;
export const WALL_BOT = 520;
export const FLOOR_Y = 520;          // top of the floor
export const CHAR_MIN_Y = 560;       // characters stand between these
export const CHAR_MAX_Y = 700;

export const ROOM_ORDER = ["living", "kitchen", "bathroom", "bedroom", "garden", "balcony"];

// Hora del día + clima (el jugador los cambia; se ven por ventanas/balcón/patio).
export const TIMES = ["day", "sunset", "night"];
export const WEATHERS = ["clear", "rain", "snow", "cloudy"];

// Accesorios de disfraz que se enganchan a un personaje (arrastrar y soltar
// encima). offX/offY = posición relativa a la cabeza; h = altura de dibujo.
export const ACCESSORIES = {
  "acc-crown": { name: "crown", offY: -0.02, h: 46 },
  "acc-hat":   { name: "hat",   offY: 0.0,  h: 64 },
  "acc-bow":   { name: "bow",   offY: 0.04, offX: 0.18, h: 34 },
  "acc-wings": { name: "wings", offY: 0.42, h: 120, back: true },
};

// Paint palette (kid-friendly, 10 colors) + wall patterns.
export const PAINTS = [
  0xffe7c2, 0xffd1dc, 0xcfe8ff, 0xd8f2d8, 0xf3e2ff,
  0xfff3b0, 0xffc9a3, 0xbfe6e2, 0xe8d8c3, 0xf6f6f6,
];
export const PATTERNS = ["none", "stripes", "dots", "stars"];

// Artworks available for the picture frames (reuses studio canon + crayon art).
export const ARTWORKS = [
  "art-crayon-family", "art-crayon-rainbow", "art-crayon-bunny",
  "art-flofy", "art-celebrating", "art-beach", "art-dream", "art-italy",
];
