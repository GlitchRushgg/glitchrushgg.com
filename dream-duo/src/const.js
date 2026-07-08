// Shared constants (separate module to avoid circular imports).

export const W = 1280;
export const H = 720;

export const PLAYER_X = 250;

// Two stacked worlds: dream on top, park below.
export const DREAM = {
  top: 26,          // ceiling for Flofy
  ground: 306,      // Flofy's floor (cloud line)
  bgY: 0,           // background strip position
};
export const PARK = {
  top: 392,
  ground: 668,      // Elizabeth's floor (path line)
  bgY: 360,
};
export const DIVIDER_Y = 348;  // the "dream ribbon" between worlds

// Physics — two hands, two different feels.
export const ELIZ = { grav: 2600, jump: -960, cut: -420, coyote: 0.09, buffer: 0.12 };
export const FLOFY = { grav: 1080, hop: -580, flutter: -460, maxFall: 520 };

// Speed & score
export const BASE_SPEED = 345;      // px/s
export const MAX_RAMP = 2.2;        // reached by RAMP_DIST
export const RAMP_DIST = 15000;     // px
export const PX_PER_M = 10;

// Biomes: crossfade backgrounds per world at these meters (early, per founder feedback pattern).
export const BIOMES = [
  { at: 0,    park: "bg-park-day",    dream: "bg-dream-day",    name: "DAYDREAM" },
  { at: 400,  park: "bg-park-sunset", dream: "bg-dream-sunset", name: "GOLDEN HOUR" },
  { at: 900,  park: "bg-park-night",  dream: "bg-dream-night",  name: "STARLIGHT" },
];

export const SYNC_WINDOW = 0.7;   // s to collect both stars of a pair
export const MAX_MULT = 5;
export const METER_MAX = 5;       // syncs to trigger FAIRY RUSH
export const RUSH_SECS = 8;
export const SHIELD_SECS = 8;
export const DASH_SECS = 4;

export const REVIVE_STARS = 100;  // alternative to the rewarded ad (CG requirement)
