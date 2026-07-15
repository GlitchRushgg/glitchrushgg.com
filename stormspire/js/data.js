/* ============================================================
   STORMSPIRE — game data: enemies, perks, reactions, upgrades,
   workshop, research. The whole economy tunes from here.

   Balance law (do not hand-tune waves):
     enemy pressure compounds ~8.2%/wave,
     run income compounds ~7%/wave —
   the 1.2% deficit IS the treadmill.
   ============================================================ */
const DATA = {};

/* ---------- wave math ---------- */
DATA.hpW    = (w) => 8 * Math.pow(1.082, w);
DATA.dpsW   = (w) => 4 * Math.pow(1.045, w);
DATA.cashW  = (w) => 3 * Math.pow(1.05, w);
DATA.countW = (w) => Math.min(40, 8 + Math.floor(0.8 * w));
DATA.BOSS_EVERY = 10;
DATA.BOSS_HP = 18, DATA.BOSS_CASH = 25;

/* ---------- enemies (unlockWave gates variety) ---------- */
DATA.enemies = [
  { id: 'skiff',   name: 'Sky Skiff',   hp: 1,   spd: 1,    cash: 1,   w: 0,  hue: 265, r: 9  },
  { id: 'darter',  name: 'Darter',      hp: 0.4, spd: 2.2,  cash: 0.8, w: 4,  hue: 190, r: 7  },
  { id: 'bulwark', name: 'Bulwark',     hp: 4,   spd: 0.5,  cash: 2.2, w: 8,  hue: 30,  r: 12, dr: 0.4 },
  { id: 'gilded',  name: 'Gilded Skiff',hp: 1.5, spd: 1.6,  cash: 15,  w: 10, hue: 48,  r: 9,  flees: true, rare: true },
  { id: 'shrike',  name: 'Shrike',      hp: 0.8, spd: 1.2,  cash: 1.2, w: 12, hue: 320, r: 8,  splits: 3 },
  { id: 'zeppelin',name: 'Zeppelin',    hp: 2.2, spd: 0.8,  cash: 2.5, w: 16, hue: 0,   r: 13, ranged: 45 },
  { id: 'warden',  name: 'Warden',      hp: 3,   spd: 0.7,  cash: 3,   w: 20, hue: 210, r: 11, aura: 55 },
  { id: 'phase',   name: 'Phase Skiff', hp: 0.9, spd: 1,    cash: 1.6, w: 26, hue: 155, r: 8,  blink: 3 },
];

/* ---------- elements & reactions ---------- */
DATA.elements = {
  spark: { name: 'Spark', c: '#7fd4ff' },
  frost: { name: 'Frost', c: '#a8e8ff' },
  ember: { name: 'Ember', c: '#ff9d5c' },
  gale:  { name: 'Gale',  c: '#b8f2c8' },
};
DATA.reactions = [
  { a: 'spark', b: 'frost', id: 'shatter',  name: 'SHATTER',       c: '#d4f4ff' },
  { a: 'spark', b: 'ember', id: 'overload', name: 'OVERLOAD',      c: '#ffd45c' },
  { a: 'ember', b: 'gale',  id: 'firestorm',name: 'FIRESTORM',     c: '#ff7a3c' },
  { a: 'frost', b: 'gale',  id: 'hail',     name: 'HAIL',          c: '#c8f0ff' },
  { a: 'spark', b: 'gale',  id: 'stormcell',name: 'STORM CELL',    c: '#9fe8ff' },
  { a: 'ember', b: 'frost', id: 'thermal',  name: 'THERMAL SHOCK', c: '#ffc8a8' },
];

/* ---------- perk draft pool (every 5 waves, pick 1 of 3) ----------
   rar: 0 common / 1 rare / 2 epic / 3 legendary */
DATA.perks = [
  { id: 'infFrost', name: 'Frost Infusion',  desc: 'Your bolts also apply Frost (slows)', rar: 0, once: true },
  { id: 'infEmber', name: 'Ember Infusion',  desc: 'Your bolts also apply Ember (burns)', rar: 0, once: true },
  { id: 'infGale',  name: 'Gale Infusion',   desc: 'Your bolts also apply Gale (pushes)', rar: 0, once: true },
  { id: 'dmg25',    name: 'Charged Coils',   desc: '+25% damage', rar: 0 },
  { id: 'atk20',    name: 'Rapid Discharge', desc: '+20% attack speed', rar: 0 },
  { id: 'crit8',    name: 'Storm Eye',       desc: '+8% crit chance', rar: 0 },
  { id: 'range10',  name: 'Tall Conductor',  desc: '+10 range', rar: 0 },
  { id: 'cash20',   name: 'Scavenger Pact',  desc: '+20% cash per kill', rar: 0 },
  { id: 'ampSpark', name: 'Spark Amplifier', desc: 'Spark effects +40%', rar: 0 },
  { id: 'ampAll',   name: 'Elemental Tuning',desc: 'All element effects +25%', rar: 1 },
  { id: 'chain1',   name: 'Fork Lightning',  desc: '+1 chain jump', rar: 1 },
  { id: 'multi15',  name: 'Twin Bolts',      desc: '+15% multibolt chance', rar: 1 },
  { id: 'critd50',  name: 'Overvolt',        desc: '+50% crit damage', rar: 1 },
  { id: 'arcWide',  name: 'Broad Arc',       desc: 'Conductor Arc radius +40%', rar: 1 },
  { id: 'arcRegen', name: 'Deep Cells',      desc: 'Arc charge regen +40%', rar: 1 },
  { id: 'arcKill',  name: 'Soul Battery',    desc: '+2 Arc charge per kill', rar: 1 },
  { id: 'interest1',name: 'Storm Broker',    desc: '+1% interest on cash each wave', rar: 1 },
  { id: 'orbitEye', name: 'Orbiting Eye',    desc: 'A storm eye orbits, zapping 1/s', rar: 2 },
  { id: 'reactMast',name: 'Reaction Master', desc: 'Reactions deal +50%', rar: 2 },
  { id: 'aegis15',  name: 'Stone Ward',      desc: '+15% damage reduction', rar: 2 },
  { id: 'stormlord',name: 'STORMLORD',       desc: 'Infuse ALL elements at once', rar: 3, once: true },
  { id: 'godbolt',  name: 'GODBOLT',         desc: 'Every 10th bolt deals ×10', rar: 3, once: true },
];
DATA.perkRarP = [60, 28, 10, 2];
DATA.rarCol = ['#9fb4bd', '#5b9cf0', '#a06df0', '#f0c04d'];
DATA.rarName = ['Common', 'Rare', 'Epic', 'Legendary'];

/* ---------- in-run upgrades (cash) cost = base × 1.22^lvl ---------- */
DATA.runUps = [
  { id: 'dmg',    tab: 0, name: 'Damage',      base: 8,  eff: '+5% damage' },
  { id: 'atk',    tab: 0, name: 'Attack Speed',base: 12, eff: '+6% speed', cap: 34 },
  { id: 'crit',   tab: 0, name: 'Crit Chance', base: 15, eff: '+1.2%', cap: 50 },
  { id: 'critd',  tab: 0, name: 'Crit Damage', base: 20, eff: '+8%' },
  { id: 'range',  tab: 0, name: 'Range',       base: 14, eff: '+2', cap: 20 },
  { id: 'multi',  tab: 0, name: 'Multibolt',   base: 30, eff: '+2% extra bolt', cap: 50 },
  { id: 'chain',  tab: 0, name: 'Chain',       base: 40, eff: '+12% chain dmg', cap: 15 },
  { id: 'hp',     tab: 1, name: 'Spire HP',    base: 10, eff: '+6% max HP' },
  { id: 'regen',  tab: 1, name: 'Regen',       base: 18, eff: '+0.5 HP/s' },
  { id: 'aegis',  tab: 1, name: 'Aegis',       base: 25, eff: '+1.5% reduction', cap: 30 },
  { id: 'cashk',  tab: 2, name: 'Cash / Kill', base: 22, eff: '+5% cash' },
  { id: 'charge', tab: 2, name: 'Charge Rate', base: 26, eff: '+4% Arc regen' },
];
DATA.runUpCost = (u, lvl) => Math.ceil(u.base * Math.pow(1.22, lvl));

/* ---------- workshop (coins, permanent) ---------- */
DATA.workshop = [
  { id: 'wdmg',    name: 'Starting Damage', base: 50,  g: 1.32, eff: '+2% damage', cap: 200 },
  { id: 'whp',     name: 'Starting HP',     base: 50,  g: 1.32, eff: '+2% HP', cap: 200 },
  { id: 'wcoin',   name: 'Coin Gain',       base: 100, g: 1.38, eff: '+2% coins', cap: 150 },
  { id: 'wcash',   name: 'Starting Cash',   base: 75,  g: 1.35, eff: '+10 cash', cap: 100 },
  { id: 'wfree',   name: 'Free Upgrades',   base: 400, g: 1.42, eff: '+0.5% free-buy odds', cap: 60 },
  { id: 'wint',    name: 'Interest',        base: 600, g: 1.40, eff: '+0.25%/wave on cash', cap: 20 },
  { id: 'warc',    name: 'Arc Capacity',    base: 150, g: 1.35, eff: '+4 max charge', cap: 100 },
  { id: 'woff',    name: 'Storm Harvest',   base: 200, g: 1.36, eff: '+3% offline coins', cap: 100 },
  { id: 'wrange',  name: 'Starting Range',  base: 250, g: 1.38, eff: '+1 range', cap: 40 },
  { id: 'wcrit',   name: 'Starting Crit',   base: 300, g: 1.38, eff: '+0.5% crit', cap: 40 },
  { id: 'wrecov',  name: 'Recovery',        base: 350, g: 1.40, eff: '+2% HP on boss kill', cap: 50 },
  { id: 'wluck',   name: 'Draft Luck',      base: 800, g: 1.45, eff: '+0.4% rare+ perk odds', cap: 50 },
];
DATA.wsCost = (w, lvl) => Math.ceil(w.base * Math.pow(w.g, lvl));

/* ---------- research lab (real-time timers; the return hook) ---------- */
DATA.research = [
  { id: 'autobuy',  name: 'Auto-Buy',        mins: 30,  desc: 'Cheapest run upgrade buys itself' },
  { id: 'draftplus',name: 'Wide Forecast',   mins: 240, desc: 'Drafts offer 4 choices' },
  { id: 'offcap',   name: 'Deep Reserves',   mins: 360, desc: 'Offline cap 8h → 16h' },
  { id: 'waveskip', name: 'Storm Reader',    mins: 120, desc: 'Every 10th wave auto-resolves (avg rewards)' },
];

/* ---------- prestige ---------- */
DATA.coresFor = (lifetimeCoins) => Math.floor(Math.pow(lifetimeCoins / 10000, 0.6));
DATA.PRESTIGE_WAVE = 60;
