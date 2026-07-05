// Shared constants (separate module to avoid circular imports).

export const W = 1280;
export const H = 720;

export const PLAYER_X = 280;

// Sectors by distance (meters): palette + which rooftop/skyline art new
// platforms use. Sky = gradient stops for the background graphics. `tint`
// recolours the reused art so late sectors feel distinct without new assets.
export const SECTORS = [
  { at: 0,    roof: "rooftop-day",    sky: "skyline-day",    tint: 0xffffff, top: 0x7ec8f7, bottom: 0xcfeaff, name: "DAY" },
  { at: 500,  roof: "rooftop-sunset", sky: "skyline-sunset", tint: 0xffffff, top: 0xffb36b, bottom: 0xff7ea0, name: "SUNSET" },
  { at: 1100, roof: "rooftop-night",  sky: "skyline-night",  tint: 0xffffff, top: 0x1a2350, bottom: 0x3b2a68, name: "NIGHT" },
  { at: 1700, roof: "rooftop-sunset", sky: "skyline-sunset", tint: 0xd6a8ea, top: 0x4a2a72, bottom: 0xf0a6c8, name: "DAWN" },
  { at: 2400, roof: "rooftop-night",  sky: "skyline-night",  tint: 0x88ffcc, top: 0x081a30, bottom: 0x1c5248, name: "AURORA" },
];
