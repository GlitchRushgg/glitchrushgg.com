// Shared constants (separate module to avoid circular imports).

export const W = 1280;
export const H = 720;

export const PLAYER_X = 280;

// Sectors by distance (meters): palette + which rooftop/skyline art new
// platforms use. Sky = CSS-style gradient stops for the background graphics.
export const SECTORS = [
  { at: 0,    roof: "rooftop-day",    sky: "skyline-day",    top: 0x7ec8f7, bottom: 0xcfeaff, name: "DAY" },
  { at: 500,  roof: "rooftop-sunset", sky: "skyline-sunset", top: 0xffb36b, bottom: 0xff7ea0, name: "SUNSET" },
  { at: 1100, roof: "rooftop-night",  sky: "skyline-night",  top: 0x1a2350, bottom: 0x3b2a68, name: "NIGHT" },
];
