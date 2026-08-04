/* ============================================================
   LANTERN BAY — game data: depth zones, fish, named catches,
   upgrades, tide modifiers. Tune the whole economy here.
   ============================================================ */
const DATA = {};

/* 10 px = 1 m. Depth values below are in METERS. */

DATA.zones = [
  { name: 'The Shallows',   from: 0,    density: 5, speed: 22, bg0: '#101d22', bg1: '#132830', wall: '#1d3a42', glow: '#4dd6c8' },
  { name: 'Kelp Forest',    from: 50,   density: 6, speed: 30, bg0: '#0d1626', bg1: '#101f38', wall: '#1b3050', glow: '#5b9cf0' },
  { name: 'Coral Reef',     from: 150,  density: 7, speed: 40, bg0: '#150f26', bg1: '#1d1438', wall: '#312050', glow: '#a06df0' },
  { name: 'The Trench',     from: 400,  density: 7, speed: 52, bg0: '#1f120a', bg1: '#2c1810', wall: '#48281a', glow: '#f09a4d' },
  { name: 'Sunken Wreck',   from: 800,  density: 8, speed: 62, bg0: '#0a1c14', bg1: '#0e2a1c', wall: '#1c4430', glow: '#5df0a0' },
  { name: 'The Abyss',      from: 1500, density: 8, speed: 74, bg0: '#1c0a0e', bg1: '#2a0d12', wall: '#48141c', glow: '#f04d5b' },
];
DATA.zoneAt = (depth) => {
  for (let i = DATA.zones.length - 1; i >= 0; i--)
    if (depth >= DATA.zones[i].from) return i;
  return 0;
};

/* rarity: mult on value; roll: cumulative % */
DATA.rarities = [
  { id: 'common',    name: 'Common',    mult: 1,    p: 70,   c: '#9fb4bd' },
  { id: 'uncommon',  name: 'Uncommon',  mult: 3,    p: 20,   c: '#5de08a' },
  { id: 'rare',      name: 'Rare',      mult: 10,   p: 7,    c: '#5b9cf0' },
  { id: 'epic',      name: 'Epic',      mult: 40,   p: 2.5,  c: '#a06df0' },
  { id: 'legendary', name: 'Legendary', mult: 200,  p: 0.45, c: '#f0c04d' },
  { id: 'mythic',    name: 'Mythic',    mult: 1000, p: 0.05, c: '#f04d5b' },
];

/* fish: 3 per zone. pattern: drift|sine|zigzag|swarm|pursuit
   look: eyes (count), acc (feature: none|fin|stripes|spikes|whisker|shell|crown), size (body mult) */
DATA.species = [
  // Zone 1 — The Shallows
  { id: 'wisp',     zone: 0, name: 'Minnow',      hue: 174, size: 10, pattern: 'drift',  eyes: 2, acc: 'none',    fact: 'Minnows swim in huge schools to confuse hungry predators.' },
  { id: 'sprite',   zone: 0, name: 'Clownfish',   hue: 190, size: 12, pattern: 'sine',   eyes: 2, acc: 'stripes', fact: 'A clownfish never gets stung by the anemone it calls home.' },
  { id: 'angel',    zone: 0, name: 'Angelfish',   hue: 205, size: 14, pattern: 'drift',  eyes: 2, acc: 'fin',     fact: 'Angelfish pair up and defend a shared patch of reef.' },
  // Zone 2 — Kelp Forest
  { id: 'mackerel', zone: 1, name: 'Mackerel',    hue: 215, size: 14, pattern: 'sine',   eyes: 2, acc: 'none',    fact: 'Mackerel dart through the kelp in shimmering silver bursts.' },
  { id: 'rattler',  zone: 1, name: 'Zebrafish',   hue: 226, size: 12, pattern: 'zigzag', eyes: 2, acc: 'stripes', fact: 'A zebrafish can regrow a damaged fin all on its own.' },
  { id: 'palemaid', zone: 1, name: 'Moonfish',    hue: 200, size: 15, pattern: 'sine',   eyes: 2, acc: 'none',    fact: 'The moonfish is the only fully warm-blooded fish in the sea.' },
  // Zone 3 — Coral Reef
  { id: 'puffer',   zone: 2, name: 'Pufferfish',  hue: 268, size: 13, pattern: 'sine',   eyes: 1, acc: 'spikes',  fact: 'A startled pufferfish gulps water to puff up like a balloon.' },
  { id: 'lion',     zone: 2, name: 'Lionfish',    hue: 280, size: 15, pattern: 'zigzag', eyes: 2, acc: 'spikes',  fact: 'A lionfish fans out its striped spines like a peacock.' },
  { id: 'bonechoir',zone: 2, name: 'Sardines',    hue: 255, size: 9,  pattern: 'swarm',  eyes: 2, acc: 'none',    fact: 'A sardine school moves as one shimmering silver wall.' },
  // Zone 4 — The Trench
  { id: 'ashbride', zone: 3, name: 'Goldfish',    hue: 20,  size: 15, pattern: 'zigzag', eyes: 2, acc: 'fin',     fact: 'Goldfish can remember things they learned months ago.' },
  { id: 'grouper',  zone: 3, name: 'Grouper',     hue: 33,  size: 16, pattern: 'sine',   eyes: 1, acc: 'none',    fact: 'A giant grouper can swallow its meal in one enormous gulp.' },
  { id: 'howler',   zone: 3, name: 'Red Snapper', hue: 10,  size: 12, pattern: 'swarm',  eyes: 3, acc: 'none',    fact: 'Red snapper can live for more than fifty years on the reef.' },
  // Zone 5 — Sunken Wreck
  { id: 'choirmstr',zone: 4, name: 'Sea Turtle',  hue: 150, size: 16, pattern: 'sine',   eyes: 2, acc: 'shell',   fact: 'A resting sea turtle can hold its breath for hours.' },
  { id: 'saint',    zone: 4, name: 'Manta Ray',   hue: 160, size: 14, pattern: 'drift',  eyes: 2, acc: 'fin',     fact: 'A manta ray can glide with a wingspan of seven meters.' },
  { id: 'lostlight',zone: 4, name: 'Lanternfish', hue: 140, size: 10, pattern: 'swarm',  eyes: 1, acc: 'none',    fact: 'Lanternfish glow with living light to find each other.' },
  // Zone 6 — The Abyss
  { id: 'nameless', zone: 5, name: 'Giant Squid', hue: 350, size: 16, pattern: 'pursuit',eyes: 3, acc: 'none',    fact: 'A giant squid has eyes the size of dinner plates.' },
  { id: 'congreg',  zone: 5, name: 'Jellyfish',   hue: 340, size: 12, pattern: 'swarm',  eyes: 2, acc: 'none',    fact: 'A jellyfish drifts along with no brain, heart, or bones.' },
  { id: 'voidmaw',  zone: 5, name: 'Anglerfish',  hue: 330, size: 18, pattern: 'drift',  eyes: 4, acc: 'whisker', fact: 'The anglerfish dangles a glowing lure to bait its dinner.' },
];

/* Named catches at fixed depths (m). One-time landing events,
   25% respawn per run afterwards. Values use the legendary curve ×bonus. */
DATA.named = [
  { id: 'weeper',    name: 'Old Whiskers',      depth: 60,   hue: 195, size: 26, acc: 'whisker', bonus: 1,  fact: 'Some catfish grow whiskers longer than your whole arm.' },
  { id: 'twins',     name: 'The Twin Dolphins', depth: 120,  hue: 215, size: 24, acc: 'fin',     bonus: 1.2,fact: 'Dolphins call each other by name with special whistles.' },
  { id: 'warden',    name: 'The Reef Guardian', depth: 180,  hue: 260, size: 28, acc: 'fin',     bonus: 1.5,fact: 'Old groupers guard the same reef nook for decades.' },
  { id: 'bellringer',name: 'The Bell Jelly',    depth: 300,  hue: 275, size: 27, acc: 'none',    bonus: 2,  fact: 'The bell jelly pulses like a tiny gently ringing dome.' },
  { id: 'mothersup', name: 'The Great Turtle',  depth: 500,  hue: 25,  size: 30, acc: 'shell',   bonus: 2.5,fact: 'Sea turtles return to the very beach where they hatched.' },
  { id: 'ferryman',  name: 'The Wandering Ray', depth: 700,  hue: 35,  size: 30, acc: 'fin',     bonus: 3,  fact: 'Manta rays glide thousands of kilometers on the currents.' },
  { id: 'coralking', name:'The Coral King',    depth: 1000, hue: 155, size: 34, acc: 'crown',   bonus: 4,  fact: 'A coral reef is built by tiny animals over thousands of years.' },
  { id: 'choireternal',name:'The Moon Jelly',   depth: 1500, hue: 145, size: 32, acc: 'none',    bonus: 5,  fact: 'Moon jellies drift together in glowing blooms miles wide.' },
  { id: 'heartwell', name: 'The Pearl Whale',   depth: 2200, hue: 345, size: 36, acc: 'none',    bonus: 7,  fact: 'A blue whale\'s heart is nearly the size of a small car.' },
  { id: 'firstfish', name: 'The First Fish',    depth: 3000, hue: 55,  size: 40, acc: 'crown',   bonus: 10, fact: 'Fish have swum Earth\'s oceans for over 500 million years.' },
];

/* value of a catch at depth (m): base × rarity mult × modifiers */
DATA.baseValue = (depth) => Math.max(1, Math.round(0.15 * Math.pow(Math.max(2, depth), 1.25)));

/* ---------- upgrades: 8 tracks ---------- */
DATA.upgrades = [
  { id: 'rope',   name: 'Line Length',   desc: '+16% max depth',            base: 20,  curve: 1.42, max: 40, ic: 'rope' },
  { id: 'cap',    name: 'Catch Basket',  desc: '+1 catch capacity',         base: 30,  curve: 1.40, max: 45, ic: 'cage' },
  { id: 'reel',   name: 'Reel Speed',    desc: '+6% ascent speed',          base: 25,  curve: 1.50, max: 25, ic: 'reel' },
  { id: 'value',  name: 'Catch Value',   desc: '+10% all coin income',      base: 50,  curve: 1.60, max: 50, ic: 'coin' },
  { id: 'trawl',  name: 'Night Trawl',   desc: 'Earn while away (+0.4%/min of best haul)', base: 100, curve: 1.70, max: 30, ic: 'trawl' },
  { id: 'sense',  name: 'Fish Finder',   desc: '+8px catch magnet',         base: 40,  curve: 1.55, max: 20, ic: 'sonar' },
  { id: 'ward',   name: 'Slack Line',    desc: '+1 early bite forgiven',    base: 500, curve: 3.00, max: 5,  ic: 'guard' },
  { id: 'incense',name: 'Fresh Bait',    desc: 'Rarer fish appear',         base: 80,  curve: 1.80, max: 15, ic: 'bait' },
];
DATA.upCost = (u, lvl) => Math.ceil(u.base * Math.pow(u.curve, lvl));

/* rope: base 12m, +16%/lvl */
DATA.maxDepth = (ropeLvl) => Math.round(12 * Math.pow(1.16, ropeLvl));
DATA.capacity = (capLvl) => 3 + capLvl + Math.max(0, capLvl - 30); // +2 past L30

/* ---------- prestige: New Season ---------- */
DATA.blessingsFor = (lifetime) => Math.floor(Math.sqrt(lifetime / 50000));
DATA.PRESTIGE_DEPTH = 1000;

DATA.modifiers = [
  { id: 'none',    name: 'Calm Waters',    desc: 'The bay on a still, quiet night.', rare: 1, speed: 1, value: 1, density: 1 },
  { id: 'blood',   name: 'Moonlit Tide',   desc: 'Rare fish ×2 — but the current runs 30% faster.', rare: 2, speed: 1.3, value: 1, density: 1 },
  { id: 'frozen',  name: 'Cold Current',   desc: 'Fish drift slowly — but sell for half.', rare: 1, speed: 0.55, value: 0.5, density: 1 },
  { id: 'whisper', name: 'Feeding Frenzy',  desc: 'Twice the fish — half your basket.', rare: 1, speed: 1, value: 1, density: 2 },
];
