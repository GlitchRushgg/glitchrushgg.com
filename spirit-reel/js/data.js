/* ============================================================
   SPIRIT REEL — game data: zones, spirits, named legendaries,
   upgrades, well modifiers. Tune the whole economy here.
   ============================================================ */
const DATA = {};

/* 10 px = 1 m. Depth values below are in METERS. */

DATA.zones = [
  { name: 'The Well Mouth',     from: 0,    density: 5, speed: 22, bg0: '#101d22', bg1: '#132830', wall: '#1d3a42', glow: '#4dd6c8' },
  { name: 'The Flooded Cellar', from: 50,   density: 6, speed: 30, bg0: '#0d1626', bg1: '#101f38', wall: '#1b3050', glow: '#5b9cf0' },
  { name: 'The Catacombs',      from: 150,  density: 7, speed: 40, bg0: '#150f26', bg1: '#1d1438', wall: '#312050', glow: '#a06df0' },
  { name: 'The Ossuary',        from: 400,  density: 7, speed: 52, bg0: '#1f120a', bg1: '#2c1810', wall: '#48281a', glow: '#f09a4d' },
  { name: 'Drowned Cathedral',  from: 800,  density: 8, speed: 62, bg0: '#0a1c14', bg1: '#0e2a1c', wall: '#1c4430', glow: '#5df0a0' },
  { name: 'The Hollow',         from: 1500, density: 8, speed: 74, bg0: '#1c0a0e', bg1: '#2a0d12', wall: '#48141c', glow: '#f04d5b' },
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

/* species: 3 per zone. pattern: drift|sine|zigzag|swarm|pursuit
   look: eyes (count), acc (accessory: none|hood|crown|halo|chains|bell), wid (body width mult) */
DATA.species = [
  // Zone 1 — The Well Mouth
  { id: 'wisp',     zone: 0, name: 'Wisp',          hue: 174, size: 10, pattern: 'drift',  eyes: 2, acc: 'none',   epitaph: 'It barely remembers being a candle.' },
  { id: 'sprite',   zone: 0, name: 'Well Sprite',   hue: 190, size: 12, pattern: 'sine',   eyes: 2, acc: 'none',   epitaph: 'Giggles echo up the stones at night.' },
  { id: 'shade',    zone: 0, name: 'Shade',         hue: 205, size: 14, pattern: 'drift',  eyes: 2, acc: 'hood',   epitaph: 'Follows you home, politely.' },
  // Zone 2 — The Flooded Cellar
  { id: 'drowned',  zone: 1, name: 'Drowned One',   hue: 215, size: 14, pattern: 'sine',   eyes: 2, acc: 'none',   epitaph: 'Still looking for the last step.' },
  { id: 'rattler',  zone: 1, name: 'Chain Rattler', hue: 226, size: 12, pattern: 'zigzag', eyes: 2, acc: 'chains', epitaph: 'The chains are a fashion choice now.' },
  { id: 'palemaid', zone: 1, name: 'Pale Maid',     hue: 200, size: 15, pattern: 'sine',   eyes: 2, acc: 'none',   epitaph: 'Sets a table no one will ever reach.' },
  // Zone 3 — The Catacombs
  { id: 'monk',     zone: 2, name: 'Hollow Monk',   hue: 268, size: 13, pattern: 'sine',   eyes: 1, acc: 'hood',   epitaph: 'Took a vow of silence. Kept it too well.' },
  { id: 'plague',   zone: 2, name: 'Plague Doctor', hue: 280, size: 15, pattern: 'zigzag', eyes: 2, acc: 'beak',   epitaph: 'His cure worked. Eventually.' },
  { id: 'bonechoir',zone: 2, name: 'Bone Choir',    hue: 255, size: 9,  pattern: 'swarm',  eyes: 2, acc: 'none',   epitaph: 'They only know one song.' },
  // Zone 4 — The Ossuary
  { id: 'ashbride', zone: 3, name: 'Ash Bride',     hue: 20,  size: 15, pattern: 'zigzag', eyes: 2, acc: 'halo',   epitaph: 'The wedding is still on, technically.' },
  { id: 'gravekeep',zone: 3, name: 'Gravekeeper',   hue: 33,  size: 16, pattern: 'sine',   eyes: 1, acc: 'hood',   epitaph: 'Keeps digging. Nobody asked.' },
  { id: 'howler',   zone: 3, name: 'Howler',        hue: 10,  size: 12, pattern: 'swarm',  eyes: 3, acc: 'none',   epitaph: 'You will hear it before you see it.' },
  // Zone 5 — Drowned Cathedral
  { id: 'choirmstr',zone: 4, name: 'Choirmaster',   hue: 150, size: 16, pattern: 'sine',   eyes: 2, acc: 'halo',   epitaph: 'Raises drowned hymns from the deep.' },
  { id: 'saint',    zone: 4, name: 'Sunken Saint',  hue: 160, size: 14, pattern: 'drift',  eyes: 2, acc: 'halo',   epitaph: 'Blesses the water that took him.' },
  { id: 'lostlight',zone: 4, name: 'Lost Light',    hue: 140, size: 10, pattern: 'swarm',  eyes: 1, acc: 'none',   epitaph: 'A lighthouse\'s final flicker.' },
  // Zone 6 — The Hollow
  { id: 'nameless', zone: 5, name: 'The Nameless',  hue: 350, size: 16, pattern: 'pursuit',eyes: 3, acc: 'none',   epitaph: 'Erased from every record but this one.' },
  { id: 'congreg',  zone: 5, name: 'Congregation',  hue: 340, size: 12, pattern: 'swarm',  eyes: 2, acc: 'hood',   epitaph: 'They meet at midnight. All of them.' },
  { id: 'voidmaw',  zone: 5, name: 'Voidmaw',       hue: 330, size: 18, pattern: 'drift',  eyes: 4, acc: 'none',   epitaph: 'Do not shake hands with it.' },
];

/* Named legendaries at fixed depths (m). One-time capture events,
   25% respawn per run afterwards. Values use the legendary curve ×bonus. */
DATA.named = [
  { id: 'weeper',    name: 'The Weeper',       depth: 60,   hue: 195, size: 26, acc: 'none',  bonus: 1,  epitaph: 'Her tears refill the well.' },
  { id: 'twins',     name: 'The Twin Sisters', depth: 120,  hue: 215, size: 24, acc: 'none',  bonus: 1.2,epitaph: 'They finish each other\'s hauntings.' },
  { id: 'warden',    name: 'The Warden',       depth: 180,  hue: 260, size: 28, acc: 'chains',bonus: 1.5,epitaph: 'The keys rusted. He did not.' },
  { id: 'bellringer',name: 'Bell Ringer',      depth: 300,  hue: 275, size: 27, acc: 'bell',  bonus: 2,  epitaph: 'Rings once for each new visitor.' },
  { id: 'mothersup', name: 'Mother Superior',  depth: 500,  hue: 25,  size: 30, acc: 'hood',  bonus: 2.5,epitaph: 'Still taking attendance.' },
  { id: 'ferryman',  name: 'The Ferryman',     depth: 700,  hue: 35,  size: 30, acc: 'hood',  bonus: 3,  epitaph: 'Exact change only.' },
  { id: 'drownedking',name:'The Drowned King', depth: 1000, hue: 155, size: 34, acc: 'crown', bonus: 4,  epitaph: 'His kingdom for a breath.' },
  { id: 'choireternal',name:'The Choir Eternal',depth:1500, hue: 145, size: 32, acc: 'halo',  bonus: 5,  epitaph: 'The final hymn never ends.' },
  { id: 'heartwell', name: 'Heart of the Well',depth: 2200, hue: 345, size: 36, acc: 'none',  bonus: 7,  epitaph: 'It beats. The well breathes.' },
  { id: 'firstsoul', name: 'The First Soul',   depth: 3000, hue: 55,  size: 40, acc: 'crown', bonus: 10, epitaph: 'It dug the well from the inside.' },
];

/* value of a catch at depth (m): base × rarity mult × modifiers */
DATA.baseValue = (depth) => Math.max(1, Math.round(0.15 * Math.pow(Math.max(2, depth), 1.25)));

/* ---------- upgrades: 8 tracks ---------- */
DATA.upgrades = [
  { id: 'rope',   name: 'Rope Length',   desc: '+16% max depth',            base: 20,  curve: 1.42, max: 40, ic: 'rope' },
  { id: 'cap',    name: 'Lantern Cage',  desc: '+1 spirit capacity',        base: 30,  curve: 1.40, max: 45, ic: 'cage' },
  { id: 'reel',   name: 'Reel Speed',    desc: '+6% ascent speed',          base: 25,  curve: 1.50, max: 25, ic: 'reel' },
  { id: 'value',  name: 'Soul Value',    desc: '+10% all coin income',      base: 50,  curve: 1.60, max: 50, ic: 'coin' },
  { id: 'seance', name: 'Séance',        desc: 'Earn while away (+0.4%/min of best haul)', base: 100, curve: 1.70, max: 30, ic: 'candle' },
  { id: 'sense',  name: 'Ghost Sense',   desc: '+8px catch magnet',         base: 40,  curve: 1.55, max: 20, ic: 'eye' },
  { id: 'ward',   name: 'Warding',       desc: '+1 descent bump forgiven',  base: 500, curve: 3.00, max: 5,  ic: 'ward' },
  { id: 'incense',name: 'Incense',       desc: 'Rarer spirits appear',      base: 80,  curve: 1.80, max: 15, ic: 'incense' },
];
DATA.upCost = (u, lvl) => Math.ceil(u.base * Math.pow(u.curve, lvl));

/* rope: base 12m, +16%/lvl */
DATA.maxDepth = (ropeLvl) => Math.round(12 * Math.pow(1.16, ropeLvl));
DATA.capacity = (capLvl) => 3 + capLvl + Math.max(0, capLvl - 30); // +2 past L30

/* ---------- prestige: The Great Release ---------- */
DATA.blessingsFor = (lifetime) => Math.floor(Math.sqrt(lifetime / 50000));
DATA.PRESTIGE_DEPTH = 1000;

DATA.modifiers = [
  { id: 'none',    name: 'The Still Well',      desc: 'The well as it always was.', rare: 1, speed: 1, value: 1, density: 1 },
  { id: 'blood',   name: 'Blood Moon Well',     desc: 'Rare spirits ×2 — but everything moves 30% faster.', rare: 2, speed: 1.3, value: 1, density: 1 },
  { id: 'frozen',  name: 'The Frozen Well',     desc: 'Spirits drift slowly — but are worth half.', rare: 1, speed: 0.55, value: 0.5, density: 1 },
  { id: 'whisper', name: 'The Whispering Well', desc: 'Twice the spirits — half the lantern cage.', rare: 1, speed: 1, value: 1, density: 2 },
];
