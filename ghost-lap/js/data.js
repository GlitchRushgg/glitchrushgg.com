/* ============================================================
   GHOSTLAP — game data: zones, upgrades, garage, named corners,
   prestige, road rules. Tune the whole economy here.
   ============================================================ */
const DATA = {};

/* 10 px = 1 m. Distances below are in METERS. */

DATA.zones = [
  { name: 'Neon City',     from: 0,    bg0: '#0b0d1f', bg1: '#141033', glow: '#4de0ff', road: '#10141f' },
  { name: 'Sunset Bridge', from: 400,  bg0: '#1c0f26', bg1: '#2b1233', glow: '#ff8a5c', road: '#171021' },
  { name: 'The Tunnel',    from: 900,  bg0: '#060812', bg1: '#0b0f22', glow: '#b47aff', road: '#0c0f1c' },
  { name: 'Frost Pass',    from: 1600, bg0: '#0a1622', bg1: '#0f2233', glow: '#9fe8ff', road: '#101a26' },
  { name: 'Volcano Rim',   from: 2500, bg0: '#1c0a0a', bg1: '#2b0f0d', glow: '#ff5c5c', road: '#1a100f' },
  { name: 'The Void',      from: 3600, bg0: '#07050f', bg1: '#0d081c', glow: '#ff5db0', road: '#0b0813' },
];
DATA.zoneAt = (m) => {
  for (let i = DATA.zones.length - 1; i >= 0; i--)
    if (m >= DATA.zones[i].from) return i;
  return 0;
};

/* Named corners at fixed distances (m). Passing one pays a golden
   bonus and stamps the run. The session-one cliffhanger is
   Deadman's Hairpin at 150m. */
DATA.corners = [
  { id: 'first',    name: 'First Light Bend',    dist: 60   },
  { id: 'deadman',  name: "Deadman's Hairpin",   dist: 150  },
  { id: 'widow',    name: "The Widow Maker",     dist: 300  },
  { id: 'serpent',  name: 'Serpent Esses',       dist: 500  },
  { id: 'gasworks', name: 'Gasworks Elbow',      dist: 800  },
  { id: 'mirror',   name: 'Mirror Chicane',      dist: 1200 },
  { id: 'avalanche',name: 'Avalanche Sweep',     dist: 1800 },
  { id: 'caldera',  name: 'Caldera Drop',        dist: 2600 },
  { id: 'event',    name: 'The Event Horizon',   dist: 3800 },
  { id: 'last',     name: 'The Last Corner',     dist: 5000 },
];
DATA.CORNER_MULT = 12;              // golden corner coin pays base × this

/* coin value at distance (m) */
DATA.coinValue = (m) => Math.max(1, Math.round(0.6 * Math.pow(Math.max(2, m), 0.85)));

/* car speed (px/s) from distance travelled (px) — deterministic, no upgrades touch it */
DATA.speed = (distPx) => 170 + Math.min(290, distPx * 0.006);

/* ---------- upgrades: 8 tracks ---------- */
DATA.upgrades = [
  { id: 'tires',  name: 'Racing Tires', desc: '+4% steering grip',                base: 20,  curve: 1.42, max: 25, ic: 'tire'   },
  { id: 'stab',   name: 'Stabilizers',  desc: '+3% road forgiveness',             base: 30,  curve: 1.45, max: 20, ic: 'stab'   },
  { id: 'value',  name: 'Street Cred',  desc: '+10% all coin income',             base: 50,  curve: 1.60, max: 50, ic: 'coin'   },
  { id: 'magnet', name: 'Coin Magnet',  desc: '+6px coin pickup radius',          base: 40,  curve: 1.50, max: 20, ic: 'magnet' },
  { id: 'spark',  name: 'Drift Sparks', desc: '+12% Drift Rush bonus',            base: 45,  curve: 1.55, max: 25, ic: 'spark'  },
  { id: 'lucky',  name: 'Gold Rush',    desc: 'More coins on the road',           base: 80,  curve: 1.65, max: 15, ic: 'lucky'  },
  { id: 'fuel',   name: 'Ghost Fuel',   desc: 'Earn while away (+0.4%/min of best haul)', base: 100, curve: 1.70, max: 30, ic: 'fuel' },
  { id: 'ins',    name: 'Insurance',    desc: '+1 crash forgiven per run',        base: 500, curve: 3.00, max: 3,  ic: 'ins'    },
];
DATA.upCost = (u, lvl) => Math.ceil(u.base * Math.pow(u.curve, lvl));

/* ---------- derived stats from upgrade levels ---------- */
DATA.turnRate  = (lvl) => 2.7 * (1 + 0.04 * lvl);        // rad/s
DATA.forgive   = (lvl) => 1 + 0.03 * lvl;                // × half-width tolerance
DATA.coinMult  = (lvl) => 1 + 0.10 * lvl;
DATA.magnetR   = (lvl) => 16 + 6 * lvl;                  // px
DATA.sparkMult = (lvl) => 1 + 0.12 * lvl;                // × Drift Rush bonus
DATA.density   = (lvl) => 1 + 0.08 * lvl;                // coin spawn density
DATA.fuelRate  = (lvl, bestHaul) => lvl === 0 ? 0 : bestHaul * 0.004 * lvl; // coins/min
DATA.FUEL_CAP_H = 8;                                     // offline hours capped
DATA.insurance = (lvl) => lvl;                           // crashes forgiven / run

DATA.GHOST_BONUS = 0.4;   // +40% run payout for beating your ghost
DATA.ROAD_W = 92;         // road width (px) before modifiers

/* ---------- the Garage: 10 cars, small perks, unlock conditions ---------- */
/* unlock: { stat, n } vs stats {bestEver, lifetime, ghosts, corners, runs, stars} */
DATA.cars = [
  { id: 'hatch',   name: 'The Hatch',      c: '#4de0ff', unlock: { stat: 'runs',     n: 0    }, perk: { stat: 'none',   v: 0,    desc: 'Where every legend starts.' } },
  { id: 'sedan',   name: 'Night Sedan',    c: '#8ea6f5', unlock: { stat: 'bestEver', n: 200  }, perk: { stat: 'coins',  v: 0.05, desc: '+5% coins' } },
  { id: 'kart',    name: 'Alley Kart',     c: '#5de08a', unlock: { stat: 'runs',     n: 15   }, perk: { stat: 'grip',   v: 0.05, desc: '+5% grip' } },
  { id: 'wagon',   name: 'Ghost Wagon',    c: '#c9d2dc', unlock: { stat: 'ghosts',   n: 3    }, perk: { stat: 'spark',  v: 0.15, desc: '+15% Drift Rush' } },
  { id: 'lowrider',name: 'Low Rider',      c: '#ffd166', unlock: { stat: 'lifetime', n: 5000 }, perk: { stat: 'magnet', v: 12,   desc: '+12px magnet' } },
  { id: 'muscle',  name: 'Muscle 71',      c: '#ff8a5c', unlock: { stat: 'bestEver', n: 800  }, perk: { stat: 'coins',  v: 0.10, desc: '+10% coins' } },
  { id: 'wedge',   name: 'The Wedge',      c: '#b47aff', unlock: { stat: 'corners',  n: 25   }, perk: { stat: 'grip',   v: 0.08, desc: '+8% grip' } },
  { id: 'phantom', name: 'Phantom GT',     c: '#eef6f4', unlock: { stat: 'ghosts',   n: 15   }, perk: { stat: 'forgive',v: 0.06, desc: '+6% forgiveness' } },
  { id: 'inferno', name: 'Inferno X',      c: '#ff5c5c', unlock: { stat: 'bestEver', n: 2500 }, perk: { stat: 'coins',  v: 0.15, desc: '+15% coins' } },
  { id: 'void',    name: 'Void Runner',    c: '#ff5db0', unlock: { stat: 'stars',    n: 1    }, perk: { stat: 'coins',  v: 0.20, desc: '+20% coins' } },
];

/* ---------- prestige: The Legend Run ---------- */
DATA.PRESTIGE_LIFETIME = 20000;                            // cycle coins for the first star
DATA.starsFor = (cycleLife) => Math.floor(Math.sqrt(cycleLife / 20000));
DATA.STAR_BONUS = 0.03;                                    // +3% income per star, forever

/* Rotating road rules unlocked by prestige — pick one, applies to every run. */
DATA.rules = [
  { id: 'none',    name: 'The Open Road',   desc: 'The highway as it always was.',                 value: 1,   speed: 1,    width: 1    },
  { id: 'midnight',name: 'Midnight Rule',   desc: 'Coins ×1.5 — but the road runs 15% faster.',    value: 1.5, speed: 1.15, width: 1    },
  { id: 'narrow',  name: 'Razor\'s Edge',   desc: 'Coins ×2 — on a road 15% narrower.',            value: 2,   speed: 1,    width: 0.85 },
  { id: 'turbo',   name: 'Turbo Curfew',    desc: 'Everything 25% faster — coins ×1.6.',           value: 1.6, speed: 1.25, width: 1    },
];
