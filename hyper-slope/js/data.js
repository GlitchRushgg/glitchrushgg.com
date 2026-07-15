/* ============================================================
   HYPERSLOPE — game data: physics, modes, balls, feats,
   economy. Tune everything here.
   ============================================================ */
const DATA = {};

/* ---------- core physics (3D ball runner) ---------- */
DATA.SEG   = 60;      // z-units per track segment
DATA.HALF_W = 100;    // track half-width (u)
DATA.BALL_R = 16;     // ball radius (u)
DATA.V0    = 240;     // starting speed (u/s)
DATA.VMAX  = 1500;    // terminal velocity (u/s)
DATA.ACCEL = 26;      // flat acceleration (u/s²)
DATA.DIVE_ACCEL = 130;// extra accel per unit of downhill grade
DATA.STEER = 1050;    // lateral acceleration (u/s²)
DATA.kmh   = (v) => Math.round(v / 4);   // display speed — teens flex km/h

/* ---------- modes ---------- */
DATA.dailySeed = () => {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
DATA.modes = [
  { id: 'endless', name: 'ENDLESS',      hue: 135, bpm: 132,
    desc: 'a fresh mountain every run · pure survival' },
  { id: 'daily',   name: 'DAILY SLOPE',  hue: 300, bpm: 140,
    desc: 'the whole world rolls the SAME slope today · flex your meters' },
];

/* ---------- economy ---------- */
DATA.SHARD_DIST = 0.06;   // shards per meter survived
DATA.pickupValue = 5;     // per collected shard diamond
DATA.GRAZE_BONUS = 4;     // near-miss pays × graze streak (capped) */
DATA.GRAZE_CAP  = 8;

/* ---------- balls: 10 skins + 4 trails (pure flex, zero pay-to-win) ---------- */
DATA.balls = [
  { id: 'og',     name: 'OG',        cost: 0,     c: '#5dff8a' },
  { id: 'cyan',   name: 'Ice',       cost: 200,   c: '#4de0ff' },
  { id: 'magma',  name: 'Magma',     cost: 450,   c: '#ff5c5c' },
  { id: 'gold',   name: 'Midas',     cost: 900,   c: '#ffd166' },
  { id: 'violet', name: 'Ultra',     cost: 1500,  c: '#b47aff' },
  { id: 'pink',   name: 'Bubble',    cost: 2400,  c: '#ff5db0' },
  { id: 'white',  name: 'Ghost',     cost: 3600,  c: '#eef6f4' },
  { id: 'toxic',  name: 'Toxic',     cost: 5000,  c: '#a8ff3e' },
  { id: 'void',   name: 'Void',      cost: 8000,  c: '#8a5cff' },
  { id: 'error',  name: '404',       cost: 12000, c: '#ff3860' },
];
DATA.trails = [
  { id: 'none', name: 'No Trail',  cost: 0,    c: null },
  { id: 'neon', name: 'Neon',      cost: 500,  c: '#5dff8a' },
  { id: 'fire', name: 'Afterburn', cost: 1500, c: '#ff8a5c' },
  { id: 'rgb',  name: 'RGB',       cost: 4000, c: 'rgb' },
];

/* ---------- feats: 12 screenshot-bait badges ---------- */
DATA.feats = [
  { id: 'first100', ico: '🎢', name: 'Baby Slope',      hint: 'Survive 100m.' },
  { id: 'dist500',  ico: '⛰️', name: 'Mountain Goat',   hint: 'Survive 500m.' },
  { id: 'dist1k',   ico: '🏔️', name: 'The Kilometer',   hint: 'Survive 1,000m.' },
  { id: 'dist2k',   ico: '🌌', name: 'Low Orbit',       hint: 'Survive 2,000m.' },
  { id: 'kmh200',   ico: '💨', name: 'Speed Demon',     hint: 'Hit 200 km/h.' },
  { id: 'kmh300',   ico: '🚀', name: 'Terminal',        hint: 'Hit 300 km/h.' },
  { id: 'graze8',   ico: '😤', name: 'Personal Space',  hint: '×8 near-miss streak.' },
  { id: 'edge',     ico: '🫣', name: 'Edge Lord',       hint: 'Skim the edge for 3 seconds straight.' },
  { id: 'daily1',   ico: '📅', name: 'Daily Driver',    hint: 'Roll 500m+ on a Daily Slope.' },
  { id: 'daily7',   ico: '🗓️', name: 'Slope Season',    hint: 'Play 7 different Daily Slopes.' },
  { id: 'shard500', ico: '💎', name: 'Shard Lord',      hint: 'Bank 500 shards in one run.' },
  { id: 'allballs', ico: '💅', name: 'Full Rack',       hint: 'Own every ball.' },
];
DATA.FEAT_DAILY_DIST = 500;

/* ---------- track generation tuning ---------- */
DATA.gen = {
  curveEvery: [8, 20],        // segments between curve retargets
  curveMax: 6,                // max lateral drift per segment (u)
  hillEvery: [10, 26],        // segments between grade retargets
  gradeBase: -0.5,            // average descent (y-units per z-unit) — feel the dive
  gradeVar: 0.45,             // oscillation around base
  diveChance: 0.06,           // chance of a -1.6 super-dive stretch
  obstFrom: 320,              // meters before obstacles start
  obstChance: (m) => Math.min(0.34, 0.07 + m * 0.00012),  // per segment
  narrowFrom: 800,            // meters before narrow sections appear
  shardEvery: 9,              // avg segments between shard arcs
};
