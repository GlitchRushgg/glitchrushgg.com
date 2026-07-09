// Shared constants (separate module to avoid circular imports).

export const W = 1280;
export const H = 720;

export const PLAYER_X = 280;

// Sectors by distance (meters): palette + which rooftop/skyline art new
// platforms use. Sky = gradient stops for the background graphics. `tint`
// recolours the reused art so late sectors feel distinct without new assets.
export const SECTORS = [
  { at: 0,    roof: "rooftop-day",    sky: "skyline-day",    tint: 0xffffff, name: "DAY" },
  { at: 250,  roof: "rooftop-sunset", sky: "skyline-sunset", tint: 0xffffff, name: "SUNSET" },
  // Entornos NUEVOS (feedback fundadora: "pasar de tejados a otra visión —
  // selva, playa, o la carretera estilo las calles italianas").
  { at: 500,  roof: "rooftop-beach",  sky: "skyline-beach",  tint: 0xffffff, name: "BEACH" },
  { at: 900,  roof: "rooftop-jungle", sky: "skyline-jungle", tint: 0xffffff, name: "JUNGLE" },
  { at: 1350, roof: "rooftop-italy",  sky: "skyline-italy",  tint: 0xffffff, name: "LITTLE ITALY" },
  { at: 1900, roof: "rooftop-night",  sky: "skyline-night",  tint: 0xffffff, name: "NIGHT" },
  { at: 2500, roof: "rooftop-night",  sky: "skyline-night",  tint: 0x88ffcc, name: "AURORA" },
];
