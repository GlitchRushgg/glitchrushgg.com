/* ==================== GAME DATA / BALANCE ==================== */
const DATA = {};

/* Passive producers ("Crew"). cost grows *1.15 each buy (Cookie-Clicker curve).
   `ico` = icon name from js/icons.js */
DATA.generators = [
  { id:'lumberjack', ico:'axe',     name:'Raft Hand',    desc:'Fishes wood from the sea', base:15,        rate:0.2 },
  { id:'sawmill',    ico:'factory', name:'Sawyer',       desc:'Cuts planks fast',         base:110,       rate:1.4 },
  { id:'carpenter',  ico:'hammer',  name:'Carpenter',    desc:'Shapes the beams',         base:1300,      rate:8 },
  { id:'ox',         ico:'ox',      name:'Ox & Raft',    desc:'Hauls timber rafts',       base:15000,     rate:47 },
  { id:'crane',      ico:'crane',   name:'Crane Crew',   desc:'Lifts heavy logs',         base:180000,    rate:260 },
  { id:'shipwright', ico:'anchor',  name:'Shipwright',   desc:'Master builders',          base:2.2e6,     rate:1400 },
  { id:'forest',     ico:'tree',    name:'Sacred Grove', desc:'Endless driftwood',        base:2.6e7,     rate:7800 },
  { id:'angel',      ico:'star4',   name:'Angel Crew',   desc:'Divine carpenters',        base:3.1e8,     rate:44000 },
  { id:'leviathan',  ico:'whale',   name:'Leviathan',    desc:'Drags whole forests',      base:3.6e9,     rate:260000 },
  { id:'storm',      ico:'bolt',    name:'Storm Spirit', desc:'Bends nature to build',    base:4.5e10,    rate:1.6e6 },
];

/* Tap upgrades ("Build" tab): boost chop power. */
DATA.tapUpgrades = [
  { id:'axe1', ico:'axe',   name:'Iron Axe',     desc:'+2 per tap',       base:60,     add:2 },
  { id:'axe2', ico:'hammer',name:'Double Axe',   desc:'+8 per tap',       base:1200,   add:8 },
  { id:'axe3', ico:'flame', name:'Blazing Axe',  desc:'+40 per tap',      base:40000,  add:40 },
  { id:'axe4', ico:'bolt',  name:'Thunder Axe',  desc:'+250 per tap',     base:1.5e6,  add:250 },
  { id:'axe5', ico:'star',  name:'Divine Axe',   desc:'+1,500 per tap',   base:6e7,    add:1500 },
  { id:'axe6', ico:'star4', name:'Celestial Axe',desc:'+10,000 per tap',  base:3e9,    add:10000 },
];

/* Ark parts — explicit construction: the player SAVES
   wood and taps BUILD to raise the next part. Each built part appears
   on the canvas ship (js/scene.js, index = component) and grants a
   permanent global wood multiplier. Cost is the strategic tension:
   build the ship vs. hire more crew. */
DATA.arkStages = [
  { name:'The Keel',    cost:50,      mult:1.2 },
  { name:'The Hull',    cost:450,     mult:1.5 },
  { name:'The Deck',    cost:3200,    mult:1.9 },
  { name:'The Cabin',   cost:22000,   mult:2.4 },
  { name:'The Mast',    cost:160000,  mult:3.0 },
  { name:'The Sails',   cost:1.2e6,   mult:3.8 },
  { name:'The Ramp',    cost:9e6,     mult:4.8 },
  { name:'The Stalls',  cost:7e7,     mult:6.0 },
  { name:'The Animals', cost:5.5e8,   mult:7.5 },
  { name:'The Roof',    cost:4.5e9,   mult:9.5 },
  { name:'The Figurehead', cost:3.8e10, mult:12.0 },
];

/* Prestige blessings: bought with Doves, permanent across floods. */
DATA.blessings = [
  { id:'b1', ico:'wind',  name:'Fair Winds',    desc:'+25% all wood',        cost:1,   effect:'prod', val:0.25 },
  { id:'b2', ico:'axe',   name:'Blessed Hands',  desc:'×3 tap power',         cost:2,   effect:'tap',  val:3 },
  { id:'b3', ico:'wave',  name:'Swift Current',  desc:'+50% all wood',        cost:5,   effect:'prod', val:0.5 },
  { id:'b4', ico:'moon',  name:'Night Crew',     desc:'+2h offline cap',      cost:8,   effect:'offline', val:7200 },
  { id:'b5', ico:'dove',  name:'Twin Doves',     desc:'+35% Doves earned',    cost:15,  effect:'dove', val:0.35 },
  { id:'b6', ico:'sun',   name:'Divine Favor',   desc:'×2 all wood',          cost:40,  effect:'prod', val:1.0 },
  { id:'b7', ico:'crown', name:'Noah\'s Crown',   desc:'×3 all wood',          cost:120, effect:'prod', val:2.0 },
];

/* Offline earning: base cap 2 hours; blessings can extend. */
DATA.offlineBaseCap = 7200;      // seconds
DATA.offlineRate = 0.5;          // earn 50% of production rate while away

/* Doves formula: total lifetime wood -> doves. */
DATA.doveDivisor = 1e6;          // 1 dove per ~1M lifetime wood (scaled)
DATA.dovePower = 0.5;            // sqrt-style curve
DATA.dovePerBoost = 0.02;        // each dove gives +2% wood
