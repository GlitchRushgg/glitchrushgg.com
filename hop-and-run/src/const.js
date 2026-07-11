// Shared constants (separate module to avoid circular imports).

export const W = 1280;
export const H = 720;

export const PLAYER_X = 280;

// Sectors by distance (meters): palette + which rooftop/skyline art new
// platforms use. Sky = gradient stops for the background graphics. `tint`
// recolours the reused art so late sectors feel distinct without new assets.
export const SECTORS = [
  // Umbrales ACERCADOS (auditoría game-director: con récord ~700m casi nadie
  // veía playa/selva/Italia a 500-1350m) → ahora se disfrutan de verdad.
  { at: 0,    roof: "rooftop-day",    sky: "skyline-day",    tint: 0xffffff, name: "DAY" },
  { at: 200,  roof: "rooftop-sunset", sky: "skyline-sunset", tint: 0xffffff, name: "SUNSET" },
  { at: 350,  roof: "rooftop-beach",  sky: "skyline-beach",  tint: 0xffffff, name: "BEACH" },
  { at: 650,  roof: "rooftop-jungle", sky: "skyline-jungle", tint: 0xffffff, name: "JUNGLE" },
  { at: 1000, roof: "rooftop-italy",  sky: "skyline-italy",  tint: 0xffffff, name: "LITTLE ITALY" },
  { at: 1400, roof: "rooftop-night",  sky: "skyline-night",  tint: 0xffffff, name: "NIGHT" },
  // AURORA con cielo PROPIO (ya no clona la noche con un tinte).
  { at: 1900, roof: "rooftop-night",  sky: "skyline-aurora", tint: 0xffffff, name: "AURORA" },
];
