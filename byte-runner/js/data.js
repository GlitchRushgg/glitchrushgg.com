/* ============================================================
   BYTERUNNER — game data: physics, obstacle vocabulary,
   missions, runners, feats, themes. Tune everything here.
   ============================================================ */
const DATA = {};

/* ---------- core physics (3-lane runner) ---------- */
DATA.SEG    = 60;     // z-units per strip
DATA.LANE_W = 74;     // lane width (u); lanes at x = -74, 0, +74
DATA.V0     = 430;    // starting speed (u/s) — fast from second one
DATA.VMAX   = 1180;   // top speed (u/s)
DATA.ACCEL  = 16;     // u/s²
DATA.SPEEDUP_EVERY = 300;  // m — hard +45 u/s kick with a banner (escalation ritual)
DATA.JUMP_T = 0.58;   // airtime (s)
DATA.JUMP_H = 62;     // apex height (u)
DATA.SLIDE_T= 0.62;   // slide duration (s)
DATA.LANE_T = 0.14;   // lane-change time (s)

/* ---------- the chase ---------- */
/* Grazing an obstacle's side = STUMBLE: the drone closes in.
   Stumble twice within HEAT_T seconds = caught. Clean running
   cools the heat back down. The forgiveness IS the tension. */
DATA.HEAT_T = 8;

/* ---------- readability law (20 years of runner corpses) ----------
   Every obstacle wears its verb as a color:
   AMBER = JUMP · CYAN = SLIDE · RED = DODGE (change lane). */
DATA.COL_JUMP  = '#ffb52d';
DATA.COL_SLIDE = '#35f0ff';
DATA.COL_DODGE = '#ff2d4d';

/* ---------- modes ---------- */
DATA.dailySeed = () => {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
DATA.modes = [
  { id: 'endless', name: 'THE GRID',    bpm: 128, desc: 'a fresh city every run · outrun the drone' },
  { id: 'daily',   name: 'DAILY HEIST', bpm: 136, desc: 'the whole world runs the SAME heist today' },
];

/* ---------- economy ---------- */
DATA.BIT_VALUE   = 1;
DATA.SCORE_RATE  = 1;      // score per meter × multiplier
DATA.MULT_BASE   = 1;
DATA.MULT_CAP    = 10;
DATA.MULT_STEP   = 0.5;    // per mission set completed

/* ---------- powerups ---------- */
DATA.POWER_T = 8;          // seconds of Magnet / ×2
DATA.powerups = [
  { id: 'magnet', ico: '🧲', c: '#4de0ff' },
  { id: 'x2',     ico: '✖️', c: '#ffd166' },
  { id: 'shield', ico: '🛡️', c: '#5de08a' },
];

/* ---------- runners: 8 skins (pure flex, zero pay-to-win) ---------- */
DATA.runners = [
  { id: 'og',    name: 'Kid Zero',  cost: 0,     c: '#ff2d95', vis: '#d4ff3c' },
  { id: 'ember', name: 'Ember',     cost: 300,   c: '#ff6b35', vis: '#ffd166' },
  { id: 'minty', name: 'Minty',     cost: 700,   c: '#3cff9e', vis: '#eaffea' },
  { id: 'vex',   name: 'Vex',       cost: 1400,  c: '#b44dff', vis: '#ff2d95' },
  { id: 'gold',  name: 'Goldie',    cost: 2500,  c: '#ffd166', vis: '#fff7d6' },
  { id: 'ghost', name: 'Ghost',     cost: 4200,  c: '#f4eaff', vis: '#b44dff' },
  { id: 'void',  name: 'Voidling',  cost: 7000,  c: '#6b2dff', vis: '#d4ff3c' },
  { id: 'error', name: '404',       cost: 11000, c: '#ff2d4d', vis: '#ffffff' },
];

/* ---------- missions: 3 concurrent, tiered — the retention engine.
   Completing all 3 = a SET → permanent score multiplier +0.5. */
DATA.missions = [
  { id: 'bits1',   name: 'Collect {n} bits in one run',    tiers: [80, 200, 450, 900],  stat: 'runBits'   },
  { id: 'bitsAll', name: 'Collect {n} bits total',         tiers: [500, 1500, 4000, 9000], stat: 'lifeBits' },
  { id: 'dist1',   name: 'Run {n}m in one run',            tiers: [300, 700, 1400, 2500], stat: 'runDist'  },
  { id: 'jumps',   name: 'Jump {n} times in one run',      tiers: [15, 30, 50, 80],     stat: 'runJumps'  },
  { id: 'slides',  name: 'Slide {n} times in one run',     tiers: [10, 25, 40, 65],     stat: 'runSlides' },
  { id: 'near',    name: 'Near-miss {n} trucks in one run',tiers: [3, 8, 15, 25],       stat: 'runNears'  },
  { id: 'stumble', name: 'Survive {n} stumbles in one run',tiers: [1, 2, 3, 4],         stat: 'runStumbles' },
  { id: 'power',   name: 'Grab {n} powerups in one run',   tiers: [2, 4, 6, 9],         stat: 'runPowers' },
  { id: 'runs',    name: 'Finish {n} runs',                tiers: [5, 15, 40, 100],     stat: 'lifeRuns'  },
];

/* ---------- feats: 12 screenshot-bait badges ---------- */
DATA.feats = [
  { id: 'first500', ico: '🏃', name: 'Warmed Up',       hint: 'Run 500m.' },
  { id: 'dist1k',   ico: '🌆', name: 'District One',    hint: 'Run 1,000m.' },
  { id: 'dist2k',   ico: '🌃', name: 'Ghost of the Grid', hint: 'Run 2,500m.' },
  { id: 'mult5',    ico: '📈', name: 'Compound Interest', hint: 'Reach ×5 multiplier.' },
  { id: 'mult10',   ico: '💹', name: 'To the Moon',     hint: 'Reach ×10 multiplier.' },
  { id: 'near10',   ico: '😤', name: 'Personal Space',  hint: '10 near-misses in one run.' },
  { id: 'noheat',   ico: '🧊', name: 'Clean Getaway',   hint: '1,000m with zero stumbles.' },
  { id: 'houdini',  ico: '🎩', name: 'Houdini',         hint: 'Stumble 3 times in a run and still escape 500m+.' },
  { id: 'daily1',   ico: '📅', name: 'Day Job',         hint: 'Run 500m+ on a Daily Heist.' },
  { id: 'daily7',   ico: '🗓️', name: 'Full Week',       hint: 'Play 7 different Daily Heists.' },
  { id: 'rich',     ico: '💰', name: 'Payload',         hint: 'Bank 1,000 bits in one run.' },
  { id: 'allskins', ico: '💅', name: 'Wardrobe',        hint: 'Own every runner.' },
];
DATA.FEAT_DAILY_DIST = 500;

/* ---------- generation tuning ---------- */
DATA.gen = {
  obstFrom: 40,                 // meters before obstacles start — no dead first minute
  gapSegs: (v) => Math.max(7, Math.round(18 - v * 0.011)),  // spacing shrinks with speed
  truckLen: 3,                  // trucks span 3 segments
  powerEvery: [140, 280],       // meters between powerup spawns
  bitRunLen: 10,                // bits per line
  themes: [                     // city hue shifts every 500m — violet city first
    { from: 0,    hue: 285 }, { from: 500,  hue: 320 }, { from: 1000, hue: 25  },
    { from: 1500, hue: 195 }, { from: 2200, hue: 340 }, { from: 3000, hue: 55  },
  ],
};
DATA.themeAt = (m) => {
  let t = DATA.gen.themes[0];
  for (const th of DATA.gen.themes) if (m >= th.from) t = th;
  return t;
};
