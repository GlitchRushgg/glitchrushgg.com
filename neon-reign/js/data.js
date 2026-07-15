/* ============================================================
   NEONREIGN — game data: the court of rivals, upgrades,
   edicts, economy. Tune everything here.
   ============================================================ */
const DATA = {};

/* ---------- arena ---------- */
DATA.GRID = 40;          // cells per side
DATA.CS   = 40;          // px per cell
DATA.BOTS = 6;           // rivals on the map at once
DATA.SPEED = 132;        // base head speed (px/s)
DATA.TURN  = 7;          // max steering rate (rad/s)
DATA.RESPAWN = 2.6;      // s before a fallen rival is replaced

/* ---------- economy ---------- */
/* a captured cell pays more the more of the map you already own —
   greed is the difficulty curve */
DATA.cellValue = (ownedFrac) => 1.2 * (1 + ownedFrac * 4);
DATA.KILL_BOUNTY = 30;                 // base, × victim territory factor
DATA.bountyFor = (victimCells) => DATA.KILL_BOUNTY * (1 + victimCells / 60);
DATA.CONQUEST_MULT = 3;                // own 100% of the map → whole haul ×3
DATA.STREAK_WINDOW = 6;                // s between captures to keep the streak

/* ---------- the Court: 12 named rivals ----------
   agg 0..1 (hunts trails), loop = raid size in cells,
   spd = speed mult, rare rivals pay a bounty premium */
DATA.rivals = [
  { id: 'blitz',   name: 'Blitz',            hue: 320, agg: 0.55, loop: 4,  spd: 1.12, rare: 0, quip: 'Circles like a storm. Naps like a cat.' },
  { id: 'baron',   name: 'The Baron',        hue: 268, agg: 0.25, loop: 7,  spd: 0.95, rare: 0, quip: 'Owns the corner. Rents it to no one.' },
  { id: 'vex',     name: 'Duchess Vex',      hue: 300, agg: 0.7,  loop: 5,  spd: 1.05, rare: 0, quip: 'Collects trails like pressed flowers.' },
  { id: 'sirloop', name: 'Sir Loop',         hue: 130, agg: 0.3,  loop: 9,  spd: 1.0,  rare: 0, quip: 'Sworn to close every circle he opens.' },
  { id: 'mako',    name: 'Mako',             hue: 175, agg: 0.6,  loop: 4,  spd: 1.15, rare: 0, quip: 'Smells an open trail from across the map.' },
  { id: 'carto',   name: 'The Cartographer', hue: 215, agg: 0.2,  loop: 10, spd: 0.92, rare: 0, quip: 'Draws maps of land he will never keep.' },
  { id: 'halfpipe',name: 'Halfpipe',         hue: 25,  agg: 0.45, loop: 6,  spd: 1.08, rare: 0, quip: 'Only knows one turn. Uses it twice.' },
  { id: 'meridian',name: 'Queen Meridian',   hue: 255, agg: 0.5,  loop: 8,  spd: 1.0,  rare: 0, quip: 'Rules whatever the sun happens to cross.' },
  { id: 'patch',   name: 'Patch',            hue: 90,  agg: 0.35, loop: 5,  spd: 1.02, rare: 0, quip: 'Sews the map one square at a time.' },
  { id: 'recluse', name: 'The Recluse',      hue: 200, agg: 0.05, loop: 3,  spd: 0.9,  rare: 0, quip: 'Wants nothing. Defends it perfectly.' },
  { id: 'ember',   name: 'Emberlord',        hue: 8,   agg: 0.95, loop: 6,  spd: 1.1,  rare: 0, quip: 'Every border is an insult to him.' },
  { id: 'nullius', name: 'Nullius',          hue: 55,  agg: 0.8,  loop: 7,  spd: 1.18, rare: 1, quip: 'Claims nothing. Takes everything.' },
];
DATA.RARE_CHANCE = 0.15;   // chance the rare rival joins a round
DATA.RARE_BOUNTY = 5;      // × bounty on rare rivals

/* Bronze / Silver / Gold frames at these takedown counts (+2% income each). */
DATA.FRAMES = [1, 5, 25];
DATA.frameOf = (count) => {
  let f = 0;
  for (let i = 0; i < DATA.FRAMES.length; i++) if (count >= DATA.FRAMES[i]) f = i + 1;
  return f; // 0 none, 1 bronze, 2 silver, 3 gold
};
DATA.FRAME_BONUS = 0.02;

/* ---------- upgrades: 8 tracks ---------- */
DATA.upgrades = [
  { id: 'speed',   name: 'Neon Boots',   desc: '+3% movement speed',                base: 25,  curve: 1.45, max: 15, ic: 'speed'  },
  { id: 'greed',   name: 'Greed',        desc: '+10% coins per cell',               base: 50,  curve: 1.60, max: 50, ic: 'coin'   },
  { id: 'bounty',  name: 'Headhunter',   desc: '+15% takedown bounties',            base: 45,  curve: 1.55, max: 25, ic: 'bounty' },
  { id: 'homeland',name: 'Homeland',     desc: 'Bigger starting territory',         base: 30,  curve: 1.48, max: 10, ic: 'home'   },
  { id: 'momentum',name: 'Momentum',     desc: '+0.5s streak window',               base: 45,  curve: 1.55, max: 12, ic: 'streak' },
  { id: 'swagger', name: 'Swagger',      desc: 'Rivals flee you sooner',            base: 60,  curve: 1.58, max: 20, ic: 'fear'   },
  { id: 'tribute', name: 'Tribute',      desc: 'Earn while away (+0.4%/min of best haul)', base: 100, curve: 1.70, max: 30, ic: 'clock' },
  { id: 'armor',   name: 'Trail Armor',  desc: '+1 trail cut survived per round',   base: 500, curve: 3.00, max: 3,  ic: 'armor'  },
];
DATA.upCost = (u, lvl) => Math.ceil(u.base * Math.pow(u.curve, lvl));

/* ---------- derived stats ---------- */
DATA.speedMult  = (lvl) => 1 + 0.03 * lvl;
DATA.greedMult  = (lvl) => 1 + 0.10 * lvl;
DATA.bountyMult = (lvl) => 1 + 0.15 * lvl;
DATA.homeR      = (lvl) => 2 + lvl * 0.35;              // starting territory radius (cells)
DATA.streakWin  = (lvl) => DATA.STREAK_WINDOW + 0.5 * lvl;
DATA.fearR      = (lvl) => 60 + 14 * lvl;               // px at which rivals flee the player
DATA.tributeRate= (lvl, bestHaul) => lvl === 0 ? 0 : bestHaul * 0.004 * lvl; // coins/min
DATA.TRIBUTE_CAP_H = 8;
DATA.armorFor   = (lvl) => lvl;

/* ---------- prestige: A New Reign ---------- */
DATA.PRESTIGE_LIFETIME = 20000;                          // cycle coins for the first crown
DATA.crownsFor = (cycleLife) => Math.floor(Math.sqrt(cycleLife / 20000));
DATA.CROWN_BONUS = 0.03;                                 // +3% income per crown, forever

/* Arena edicts unlocked by prestige — pick one, applies to every round. */
DATA.edicts = [
  { id: 'none',   name: 'The Open Court', desc: 'The arena as it always was.',                        value: 1,   grid: 40, speed: 1,    hunt: 0 },
  { id: 'small',  name: 'Pocket Kingdom', desc: 'A 30×30 arena — coins ×1.8. Nowhere to hide.',       value: 1.8, grid: 30, speed: 1,    hunt: 0 },
  { id: 'frenzy', name: 'The Frenzy',     desc: 'Everyone moves 25% faster — coins ×1.5.',            value: 1.5, grid: 40, speed: 1.25, hunt: 0 },
  { id: 'hunt',   name: 'Royal Hunt',     desc: 'Every rival hunts YOUR trail — bounties ×2.',        value: 1,   grid: 40, speed: 1,    hunt: 1 },
];
