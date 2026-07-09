// Shared constants (separate module to avoid circular imports).

export const W = 1280;
export const H = 720;

export const PLAYER_X = 250;   // Elizabeth
export const FLOFY_X = 400;    // Flofy floats just ahead of her, same world

// ONE world: the park fills the whole screen (founder feedback — the split
// worlds read as confusing; now Flofy visibly floats BY HER SIDE).
export const GROUND = 642;     // Elizabeth's path
export const HOVER = 330;      // Flofy's hover baseline (his magic keeps him afloat)
export const HOVER_MIN = 90;   // how high a boost can carry him
export const SKY_TOP = 40;

// Physics — two hands, two different feels.
export const ELIZ = { grav: 2600, jump: -1010, cut: -440, coyote: 0.09, buffer: 0.12 };
// Flofy: spring-hover — boosts kick him up, his magic floats him back down.
export const FLOFY = { boost: -520, spring: 14, damp: 4.2, maxFall: 420 };

// Speed & score
export const BASE_SPEED = 340;      // px/s (× level speed multiplier)
export const MAX_RAMP = 2.2;        // endless mode only
export const RAMP_DIST = 15000;
export const PX_PER_M = 10;

// Biomes (level `biome` index / endless crossfades): park bg full-screen,
// dream bg takes over ONLY during FAIRY RUSH (the world transforms).
export const BIOMES = [
  { park: "bg-park-day",    dream: "bg-dream-day",    name: "SUNNY PARK" },
  { park: "bg-park-sunset", dream: "bg-dream-sunset", name: "GOLDEN HOUR" },
  { park: "bg-park-night",  dream: "bg-dream-night",  name: "STARLIGHT" },
];
export const ENDLESS_BIOME_AT = [0, 400, 900]; // meters

export const SYNC_WINDOW = 0.7;
export const MAX_MULT = 5;
export const METER_MAX = 5;
export const RUSH_SECS = 8;
export const SHIELD_SECS = 8;
export const DASH_SECS = 4;

export const REVIVE_STARS = 100;
