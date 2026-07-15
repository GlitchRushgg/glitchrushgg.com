/* ============================================================
   POCKETRUSH — game data: economy, upgrades, trick-shot
   collection, prestige, house rules. Tune everything here.
   ============================================================ */
const DATA = {};

/* ---------- economy ---------- */
/* A "rack" is one break; racks get more balls and pay more the
   deeper a run goes, so long streaks are worth chasing. */
DATA.RACK_BALLS  = (rack) => Math.min(12, 4 + Math.floor(rack * 0.7));   // balls in this rack
DATA.baseValue   = (rack) => Math.max(1, Math.round(3 * Math.pow(1.16, rack))); // coins/ball
DATA.GOLDEN_EVERY = 4;   // every Nth rack seeds one golden ball
DATA.GOLDEN_MULT  = 8;   // golden ball payout multiplier

/* ---------- upgrades: 8 tracks ---------- */
DATA.upgrades = [
  { id: 'power',  name: 'Cue Power',    desc: '+7% maximum break power',         base: 22,  curve: 1.42, max: 30, ic: 'power'  },
  { id: 'aim',    name: 'Aim Line',     desc: 'Longer guide; L6 predicts a bank', base: 30,  curve: 1.46, max: 14, ic: 'aim'    },
  { id: 'value',  name: 'Pocket Value', desc: '+9% coins from every ball',        base: 50,  curve: 1.58, max: 60, ic: 'coin'   },
  { id: 'window', name: 'Combo Window',  desc: '+0.18s combo timer; +1 cap / 8 lvl', base: 45,  curve: 1.55, max: 32, ic: 'combo'  },
  { id: 'shots',  name: 'Break Budget', desc: '+1 shot to start every run',       base: 60,  curve: 1.62, max: 20, ic: 'shot'   },
  { id: 'magnet', name: 'Pocket Magnet', desc: 'Pockets pull nearby balls in',     base: 40,  curve: 1.5,  max: 22, ic: 'magnet' },
  { id: 'refund', name: 'House Rules',  desc: '+coins & +shots when you clear a rack', base: 90, curve: 1.7, max: 25, ic: 'star' },
  { id: 'hustle', name: 'The Hustle',   desc: 'Earn coins while away (offline)',   base: 120, curve: 1.72, max: 30, ic: 'clock'  },
];
DATA.upCost = (u, lvl) => Math.ceil(u.base * Math.pow(u.curve, lvl));

/* ---------- derived stats from upgrade levels ---------- */
DATA.startShots  = (lvl) => 5 + lvl;                       // shots per run
DATA.maxPower    = (lvl) => 560 * Math.pow(1.07, lvl);     // break velocity cap (px/s)
DATA.comboWindow = (lvl) => 2.0 + 0.18 * lvl;              // seconds to keep a combo alive
DATA.comboCap    = (lvl) => 5 + Math.floor(lvl / 8);       // max combo multiplier
DATA.pocketMult  = (lvl) => 1 + 0.09 * lvl;                // income multiplier
DATA.magnetR     = (lvl) => lvl === 0 ? 0 : 10 + 3.5 * lvl; // extra pocket attraction radius
DATA.clearCoins  = (lvl) => 10 + 6 * lvl;                  // flat bonus × rack when cleared
DATA.clearShots  = (lvl) => 1 + Math.floor(lvl / 6);       // shots refunded on rack clear
DATA.aimLen      = (lvl) => 120 + 26 * lvl;                // guide length in px
DATA.aimReflect  = (lvl) => lvl >= 6;                      // show first bank bounce
/* offline: a slow drip based on best single-run haul */
DATA.hustleRate  = (lvl, bestRun) => lvl === 0 ? 0 : bestRun * (0.003 * lvl); // coins / minute
DATA.HUSTLE_CAP_H = 8;                                     // offline hours capped

/* ---------- trick-shot collection ("The Rack") ---------- */
/* Bronze / Silver / Gold frames at these catch counts (+2% income each). */
DATA.FRAMES = [1, 25, 100];
DATA.tricks = [
  { id: 'sink',    name: 'Clean Sink',   hint: 'Pocket any ball.' },
  { id: 'double',  name: 'Double Down',  hint: 'Sink 2 balls in one shot.' },
  { id: 'triple',  name: 'Triple Threat', hint: 'Sink 3+ balls in one shot.' },
  { id: 'bank',    name: 'Bank Shot',    hint: 'Sink a ball after it kisses a rail.' },
  { id: 'combo3',  name: 'On a Roll',    hint: 'Reach a ×3 combo.' },
  { id: 'combo5',  name: 'Rush Hour',    hint: 'Reach a ×5 combo.' },
  { id: 'clear',   name: 'Run the Rack', hint: 'Clear every ball in a rack.' },
  { id: 'golden',  name: 'Gold Fever',   hint: 'Sink a golden ball.' },
  { id: 'nomiss',  name: 'Ice Cold',     hint: 'Clear a rack with no scratch.' },
  { id: 'longrun', name: 'Table Runner', hint: 'Reach rack 10 in a single run.' },
  { id: 'jackpot', name: 'Jackpot',      hint: 'Bank 1,000 coins from one shot.' },
  { id: 'prestige',name: 'Hall of Fame', hint: 'Run the Table (prestige) once.' },
];
DATA.frameOf = (count) => {
  let f = 0;
  for (let i = 0; i < DATA.FRAMES.length; i++) if (count >= DATA.FRAMES[i]) f = i + 1;
  return f; // 0 none, 1 bronze, 2 silver, 3 gold
};

/* ---------- prestige: Run the Table ---------- */
DATA.PRESTIGE_LIFETIME = 250000;                          // unlock threshold
DATA.repFor = (lifetime) => Math.floor(Math.sqrt(lifetime / 25000)); // Reputation stars
DATA.REP_BONUS = 0.03;                                    // +3% income per star, forever

/* Rotating "house rules" unlocked by prestige — pick one per run. */
DATA.houseRules = [
  { id: 'straight', name: 'Straight Pool',  desc: 'The table as it always plays.',              value: 1,   golden: 1, shots: 0 },
  { id: 'neon',     name: 'Neon Night',     desc: 'Golden balls ×2 — but you start with 2 fewer shots.', value: 1, golden: 2, shots: -2 },
  { id: 'hustle',   name: 'Hustler\'s Table', desc: 'Every ball worth +40% — combos decay 30% faster.', value: 1.4, golden: 1, shots: 0, fastCombo: true },
  { id: 'trick',    name: 'Trick Night',    desc: 'Bank & multi-sinks pay double — pockets shrink.',    value: 1, golden: 1, shots: 0, tightPockets: true, trickBonus: 2 },
];
