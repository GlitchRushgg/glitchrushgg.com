/* ============================================================
   FLIPRIDGE — game data: zones, named features, upgrades,
   trick book, prestige, lines. Tune the whole economy here.
   ============================================================ */
const DATA = {};

/* 10 px = 1 m. Distances below are in METERS. */

DATA.zones = [
  { name: 'Alpine Meadow', from: 0,    sky0: '#12203a', sky1: '#1c3a55', ground: '#16281c', edge: '#5de08a' },
  { name: 'The Pines',     from: 300,  sky0: '#101c30', sky1: '#173048', ground: '#122419', edge: '#3fd6a0' },
  { name: 'Boulder Field', from: 700,  sky0: '#181428', sky1: '#2a2140', ground: '#221c2c', edge: '#b47aff' },
  { name: 'Scree Chutes',  from: 1200, sky0: '#1c1220', sky1: '#331a2e', ground: '#2a1a22', edge: '#ff8a5c' },
  { name: 'The Glacier',   from: 1800, sky0: '#0c1a2e', sky1: '#14304e', ground: '#14283a', edge: '#9fe8ff' },
  { name: 'The Cornice',   from: 2600, sky0: '#0a0716', sky1: '#180f2e', ground: '#130c22', edge: '#ff5db0' },
];
DATA.zoneAt = (m) => {
  for (let i = DATA.zones.length - 1; i >= 0; i--)
    if (m >= DATA.zones[i].from) return i;
  return 0;
};

/* Named features at fixed distances (m) — banner + happytime on
   the first-ever visit. The session-one cliffhanger is the
   Sheep's Jaw drop at 200m. */
DATA.features = [
  { id: 'first',   name: 'The Bunny Slope',   dist: 80   },
  { id: 'jaw',     name: "The Sheep's Jaw",   dist: 200  },
  { id: 'molars',  name: 'The Molars',        dist: 400  },
  { id: 'organ',   name: 'Organ Pipes',       dist: 650  },
  { id: 'anvil',   name: 'The Anvil',         dist: 950  },
  { id: 'ribcage', name: 'The Ribcage',       dist: 1350 },
  { id: 'serac',   name: 'Serac Alley',       dist: 1750 },
  { id: 'blue',    name: 'The Blue Room',     dist: 2200 },
  { id: 'maw',     name: 'The Maw',           dist: 2800 },
  { id: 'summit',  name: "The Widowmaker",    dist: 3500 },
];

/* ---------- economy ---------- */
DATA.coinValue = (m) => Math.max(1, Math.round(0.8 + m * 0.02));   // trail coins
DATA.trickBase = (m) => Math.max(5, 5 + m * 0.09);                 // per flip, at distance
/* multi-flips pay superlinearly: 1×, 3.2×, 7.2×, 12.8×… */
DATA.flipMult  = (flips) => flips === 1 ? 1 : flips * flips * 0.8;
DATA.AIRTIME_BONUS = 0.35;   // × trickBase per second of air, added to flip payouts

/* ---------- upgrades: 8 tracks ---------- */
DATA.upgrades = [
  { id: 'pedal',  name: 'Pedal Power',  desc: '+4% drive power',                   base: 20,  curve: 1.42, max: 25, ic: 'pedal'  },
  { id: 'susp',   name: 'Suspension',   desc: 'Softer landings (+tolerance)',      base: 30,  curve: 1.45, max: 20, ic: 'susp'   },
  { id: 'tuck',   name: 'Air Tuck',     desc: '+5% spin control in the air',       base: 25,  curve: 1.45, max: 20, ic: 'tuck'   },
  { id: 'value',  name: 'Fan Base',     desc: '+10% all coin income',              base: 50,  curve: 1.60, max: 50, ic: 'coin'   },
  { id: 'magnet', name: 'Coin Magnet',  desc: '+6px coin pickup radius',           base: 40,  curve: 1.50, max: 20, ic: 'magnet' },
  { id: 'lucky',  name: 'Line Scout',   desc: 'More coins on the mountain',        base: 80,  curve: 1.65, max: 15, ic: 'lucky'  },
  { id: 'sponsor',name: 'Sponsors',     desc: 'Earn while away (+0.4%/min of best haul)', base: 100, curve: 1.70, max: 30, ic: 'clock' },
  { id: 'helmet', name: 'Full-Face',    desc: '+1 crash forgiven per run',         base: 500, curve: 3.00, max: 3,  ic: 'helmet' },
];
DATA.upCost = (u, lvl) => Math.ceil(u.base * Math.pow(u.curve, lvl));

/* ---------- derived stats ---------- */
DATA.power     = (lvl) => 1 + 0.04 * lvl;                 // drive force mult
DATA.landTol   = (lvl) => 0.62 + 0.022 * lvl;             // rad: clean-landing window
DATA.CRASH_TOL = 1.25;                                    // rad: beyond this on landing = crash
DATA.spin      = (lvl) => 1 + 0.05 * lvl;                 // air torque mult
DATA.coinMult  = (lvl) => 1 + 0.10 * lvl;
DATA.magnetR   = (lvl) => 24 + 6 * lvl;                   // px
DATA.density   = (lvl) => 1 + 0.08 * lvl;                 // coin arc frequency
DATA.sponsorRate = (lvl, bestHaul) => lvl === 0 ? 0 : bestHaul * 0.004 * lvl; // coins/min
DATA.SPONSOR_CAP_H = 8;
DATA.helmets   = (lvl) => lvl;

/* ---------- the Trick Book: 12 feats ---------- */
/* Bronze / Silver / Gold frames at these counts (+2% income each). */
DATA.FRAMES = [1, 10, 50];
DATA.frameOf = (count) => {
  let f = 0;
  for (let i = 0; i < DATA.FRAMES.length; i++) if (count >= DATA.FRAMES[i]) f = i + 1;
  return f; // 0 none, 1 bronze, 2 silver, 3 gold
};
DATA.FRAME_BONUS = 0.02;
DATA.tricks = [
  { id: 'back1',   ico: '🔄', name: 'Backflip',      hint: 'Land one full backflip.' },
  { id: 'back2',   ico: '🌀', name: 'Double Back',   hint: 'Two backflips in one air.' },
  { id: 'back3',   ico: '💫', name: 'Triple Back',   hint: 'Three. In one air. Sure.' },
  { id: 'front1',  ico: '⤵️', name: 'Frontflip',     hint: 'Land one full frontflip.' },
  { id: 'front2',  ico: '🎢', name: 'Double Front',  hint: 'Two frontflips in one air.' },
  { id: 'superman',ico: '🦸', name: 'Superman',      hint: 'Stay airborne 2.5 seconds.' },
  { id: 'cliff',   ico: '🪂', name: 'Cliff Hucker',  hint: 'Drop 14m in a single air.' },
  { id: 'longair', ico: '🛫', name: 'Frequent Flyer',hint: 'Fly 60m in a single jump.' },
  { id: 'streak5', ico: '🔥', name: 'Flow State',    hint: 'Chain 5 clean landings.' },
  { id: 'rich',    ico: '💰', name: 'Payday',        hint: 'Bank 1,000 coins in one trick.' },
  { id: 'far',     ico: '🏔️', name: 'Send It',       hint: 'Ride 1,000m down one mountain.' },
  { id: 'cornice', ico: '👑', name: 'The Cornice',   hint: 'Reach the final zone (2,600m).' },
];

/* ---------- prestige: The Podium ---------- */
DATA.PRESTIGE_LIFETIME = 20000;                            // cycle coins for the first medal
DATA.medalsFor = (cycleLife) => Math.floor(Math.sqrt(cycleLife / 20000));
DATA.MEDAL_BONUS = 0.03;                                   // +3% income per medal, forever

/* Lines unlocked by prestige — pick one, applies to every run. */
DATA.lines = [
  { id: 'none',   name: 'The Groomer',   desc: 'The mountain as it always was.',                     value: 1,   gnar: 1,   grav: 1,   power: 1    },
  { id: 'gnar',   name: 'The Gnar Line', desc: 'Steeper, rougher, meaner — coins ×2.',               value: 2,   gnar: 1.35,grav: 1,   power: 1    },
  { id: 'moon',   name: 'Moon Air',      desc: '60% gravity. Spin forever — coins ×1.3.',            value: 1.3, gnar: 1,   grav: 0.6, power: 1    },
  { id: 'rocket', name: 'Rocket Run',    desc: '+25% pedal power, everything faster — coins ×1.5.',  value: 1.5, gnar: 1,   grav: 1,   power: 1.25 },
];
