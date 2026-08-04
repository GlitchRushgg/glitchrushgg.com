/* ============================================================
   SHARDLINE — game data: sectors, generation vocabulary,
   skins, trails, feats, economy. Tune everything here.
   ============================================================ */
const DATA = {};

/* ---------- core physics (one-tap runner) ---------- */
DATA.SPEED   = 340;    // px/s ground speed
DATA.JUMP_V  = 640;    // px/s jump impulse
DATA.GRAV    = 2200;   // px/s²
DATA.CUBE    = 30;     // cube size px
DATA.UNIT    = 34;     // level grid unit px
/* derived: airtime ≈ 0.58s → jump covers ≈ 198px ≈ 5.8 units */

/* ---------- the 7 Sectors: fixed seeds = the SAME level for
   every player on earth. That's the shared-experience hook —
   "I died at 91% on MALWARE" means the same thing to everyone. */
DATA.sectors = [
  { id: 's1', name: 'TUTORIAL IS A LIE', seed: 101, bpm: 120, density: 0.45, gnar: 0, len: 14000, hue: 150 },
  { id: 's2', name: 'SUGAR RUSH',        seed: 202, bpm: 128, density: 0.55, gnar: 1, len: 16000, hue: 320 },
  { id: 's3', name: 'MALWARE',           seed: 303, bpm: 134, density: 0.62, gnar: 2, len: 18000, hue: 0   },
  { id: 's4', name: 'STACK OVERFLOW',    seed: 404, bpm: 140, density: 0.68, gnar: 3, len: 20000, hue: 40  },
  { id: 's5', name: 'KERNEL PANIC',      seed: 505, bpm: 145, density: 0.74, gnar: 4, len: 22000, hue: 200 },
  { id: 's6', name: 'BLUE SCREEN',       seed: 606, bpm: 150, density: 0.8,  gnar: 5, len: 24000, hue: 220 },
  { id: 's7', name: 'SINGULARITY',       seed: 707, bpm: 155, density: 0.86, gnar: 6, len: 26000, hue: 275 },
];
/* The Daily Glitch: date-seeded, mid difficulty, same for everyone today. */
DATA.dailySeed = () => {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
DATA.daily = () => ({
  id: 'daily', name: 'DAILY GLITCH', seed: DATA.dailySeed(), bpm: 138,
  density: 0.66, gnar: 3, len: 19000, hue: (DATA.dailySeed() * 7) % 360,
});

/* ---------- economy ---------- */
DATA.SHARD_RUN_RATE = 0.9;     // shards per % of progress reached (per attempt)
DATA.CLEAR_BONUS   = 250;      // shards for 100%-ing a sector (first time ×4)
DATA.DAILY_CLEAR_X = 3;        // daily first-clear multiplier
DATA.pickupValue   = 5;        // shards per collected pickup (risky spots)

/* ---------- skins: 12 cubes + 4 trails (pure flex, zero pay-to-win) ---------- */
DATA.cubes = [
  { id: 'og',      name: 'OG',           cost: 0,    c: '#4de0ff', face: 'happy'  },
  { id: 'mint',    name: 'Minty',        cost: 150,  c: '#5de08a', face: 'happy'  },
  { id: 'lava',    name: 'Lava',         cost: 300,  c: '#ff5c5c', face: 'angry'  },
  { id: 'gold',    name: 'Goldie',       cost: 600,  c: '#ffd166', face: 'smug'   },
  { id: 'void',    name: 'Voidling',     cost: 1000, c: '#8a5cff', face: 'void'   },
  { id: 'pixel',   name: 'Pixelated',    cost: 1500, c: '#5de08a', face: 'pixel'  },
  { id: 'stealth', name: 'Stealth',      cost: 2200, c: '#39424e', face: 'ninja'  },
  { id: 'bubble',  name: 'Bubblegum',    cost: 3000, c: '#ff5db0', face: 'uwu'    },
  { id: 'toxic',   name: 'Toxic',        cost: 4200, c: '#a8ff3e', face: 'dizzy'  },
  { id: 'frost',   name: 'Frostbyte',    cost: 5500, c: '#9fe8ff', face: 'cool'   },
  { id: 'error',   name: '404',          cost: 8000, c: '#ff3860', face: 'glitch' },
  { id: 'king',    name: 'The Crown',    cost: 12000,c: '#ffd166', face: 'king'   },
];
DATA.trails = [
  { id: 'none',  name: 'No Trail',   cost: 0,    c: null },
  { id: 'neon',  name: 'Neon Line',  cost: 400,  c: '#4de0ff' },
  { id: 'fire',  name: 'Afterburn',  cost: 1200, c: '#ff8a5c' },
  { id: 'rgb',   name: 'RGB Split',  cost: 3500, c: 'rgb' },
];

/* ---------- feats: 12 shareable badges ---------- */
DATA.feats = [
  { id: 'firstblood', ico: '💀', name: 'Speedrun to Death', hint: 'Die before 5%.' },
  { id: 'pain99',     ico: '😱', name: 'The 99% Club',      hint: 'Die at 99%. It will happen.' },
  { id: 'att100',     ico: '🔁', name: 'Dedication',        hint: '100 attempts on one sector.' },
  { id: 'clear1',     ico: '👑', name: 'First Crown',       hint: '100% any sector.' },
  { id: 'clear3',     ico: '🏆', name: 'Hat Trick',         hint: 'Crown 3 sectors.' },
  { id: 'clear7',     ico: '🌌', name: 'Singularity',       hint: 'Crown all 7 sectors.' },
  { id: 'daily1',     ico: '📅', name: 'Glitch of the Day', hint: 'Clear a Daily Glitch.' },
  { id: 'daily7',     ico: '🗓️', name: 'Week of Pain',      hint: 'Clear 7 Daily Glitches.' },
  { id: 'shard500',   ico: '💎', name: 'Shard Lord',        hint: 'Bank 500 shards in one run.' },
  { id: 'gravity',    ico: '🙃', name: 'Upside Down',       hint: 'Survive 10 gravity flips in one run.' },
  { id: 'noflip',     ico: '🧊', name: 'Ice in the Veins',  hint: 'Reach 50% of a sector on attempt #1.' },
  { id: 'allskins',   ico: '💅', name: 'Full Closet',       hint: 'Own every cube.' },
];

/* ---------- level generation vocabulary ----------
   Patterns are placed on the beat grid; each declares how many
   grid units it spans and its minimum gnar (difficulty gate).
   The generator guarantees jumpable spacing between hazards. */
DATA.patterns = [
  { id: 'spike1',   units: 6, gnar: 0, w: 10 },  // single spike
  { id: 'spike2',   units: 7, gnar: 1, w: 7  },  // double spike
  { id: 'spike3',   units: 8, gnar: 3, w: 4  },  // triple spike — the scream generator
  { id: 'block',    units: 7, gnar: 0, w: 8  },  // step-up block
  { id: 'blockGap', units: 9, gnar: 1, w: 6  },  // block, then a gap
  { id: 'tower',    units: 9, gnar: 2, w: 5  },  // two-high tower, jump from block
  { id: 'pit',      units: 7, gnar: 1, w: 7  },  // floor gap
  { id: 'pitSpike', units: 9, gnar: 2, w: 5  },  // gap with a spike on the far lip
  { id: 'spikeOnBlock', units: 8, gnar: 2, w: 5 },
  { id: 'flip',     units: 10, gnar: 1, w: 4 },  // gravity portal + ceiling section
  { id: 'breather', units: 5, gnar: 0, w: 6  },  // pickups, no hazards
];

DATA.CHECKPOINTS = [0.25, 0.5, 0.75];  // Second Wind revive points
