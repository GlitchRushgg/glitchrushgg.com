/* ==================== CORE GAME LOGIC ==================== */
const Game = (function () {
  const SAVE_KEY = 'buildTheArk_save_v2'; // v2: explicit part-building

  const state = {
    wood: 0,
    lifetime: 0,        // total wood ever earned (for doves)
    tapBase: 1,
    gens: {},           // id -> count
    taps: {},           // id -> owned bool
    arkStage: 0,        // number of ark parts BUILT (0 = bare raft)
    doves: 0,
    blessings: {},      // id -> owned bool
    sound: true,
    music: true,
    lastSave: Date.now(),
    boostUntil: 0,      // timestamp of 2x ad-boost end
    frenzyUntil: 0,     // timestamp of golden-dove frenzy end (×7)
    lastDailyDay: '',   // 'YYYY-MM-DD' of last daily claim
    dailyStreak: 0,
  };

  DATA.generators.forEach(g => state.gens[g.id] = 0);

  /* ---------- DERIVED VALUES ---------- */
  function doveBoost() { return 1 + state.doves * DATA.dovePerBoost; }

  function blessingProdMult() {
    let m = 1;
    DATA.blessings.forEach(b => {
      if (state.blessings[b.id] && b.effect === 'prod') m *= (1 + b.val);
    });
    return m;
  }
  function blessingTapMult() {
    let m = 1;
    DATA.blessings.forEach(b => { if (state.blessings[b.id] && b.effect === 'tap') m *= b.val; });
    return m;
  }
  /* Multiplier of the LAST BUILT part (1 if nothing built yet). */
  function arkMult() {
    return state.arkStage > 0 ? DATA.arkStages[Math.min(state.arkStage, DATA.arkStages.length) - 1].mult : 1;
  }
  function boostMult() { return Date.now() < state.boostUntil ? 2 : 1; }
  function frenzyMult() { return Date.now() < state.frenzyUntil ? 7 : 1; }

  function globalMult() { return arkMult() * doveBoost() * blessingProdMult() * boostMult() * frenzyMult(); }

  function tapPower() {
    let base = state.tapBase;
    DATA.tapUpgrades.forEach(u => { if (state.taps[u.id]) base += u.add; });
    return base * blessingTapMult() * globalMult();
  }

  function baseProduction() { // wood/sec before global mult
    let p = 0;
    DATA.generators.forEach(g => p += state.gens[g.id] * g.rate);
    return p;
  }
  function production() { return baseProduction() * globalMult(); }

  /* ---------- COSTS ---------- */
  function genCost(g) { return Math.ceil(g.base * Math.pow(1.15, state.gens[g.id])); }
  function tapCost(u) { return u.base; }

  /* Total cost of the next n purchases of generator g (geometric series). */
  function genCostN(g, n) {
    let total = 0, owned = state.gens[g.id];
    for (let i = 0; i < n; i++) total += Math.ceil(g.base * Math.pow(1.15, owned + i));
    return total;
  }

  /* How many of g the player can afford right now (capped for perf). */
  function maxAffordable(g) {
    let n = 0, total = 0, owned = state.gens[g.id];
    while (n < 500) {
      const c = Math.ceil(g.base * Math.pow(1.15, owned + n));
      if (total + c > state.wood) break;
      total += c; n++;
    }
    return n;
  }

  /* ---------- ACTIONS ---------- */
  function chop() {
    const gain = tapPower();
    addWood(gain);
    return gain;
  }

  function addWood(n) {
    state.wood += n;
    state.lifetime += n;
  }

  /* Buy n of a generator (n = Infinity buys as many as affordable).
     Returns how many were actually bought. */
  function buyGen(id, n) {
    const g = DATA.generators.find(x => x.id === id);
    const want = (n === Infinity) ? maxAffordable(g) : (n || 1);
    let bought = 0;
    for (let i = 0; i < want; i++) {
      const cost = genCost(g);
      if (state.wood < cost) break;
      state.wood -= cost;
      state.gens[id]++;
      bought++;
    }
    return bought;
  }

  function buyTap(id) {
    const u = DATA.tapUpgrades.find(x => x.id === id);
    if (state.taps[id] || state.wood < u.base) return false;
    state.wood -= u.base;
    state.taps[id] = true;
    return true;
  }

  /* ---------- ARK CONSTRUCTION (explicit part-by-part) ---------- */
  let onArkComplete = null;

  /* The next part waiting to be built, or null when the Ark is finished. */
  function nextPart() {
    return state.arkStage < DATA.arkStages.length ? DATA.arkStages[state.arkStage] : null;
  }

  /* Player explicitly spends wood to raise the next part. */
  function buildPart() {
    const part = nextPart();
    if (!part || state.wood < part.cost) return null;
    state.wood -= part.cost;
    state.arkStage++;
    if (onArkComplete) onArkComplete(part, state.arkStage);
    return part;
  }

  /* Savings progress toward the next part (drives HUD bar + ghost part). */
  function arkProgress() {
    const part = nextPart();
    if (!part) return { pct: 1, have: 0, need: 0, maxed: true, part: null };
    return {
      pct: Math.max(0, Math.min(1, state.wood / part.cost)),
      have: state.wood, need: part.cost, maxed: false, part,
    };
  }

  /* ---------- PRESTIGE (Flood) ---------- */
  function totalDovesFromRun() {
    const eff = DATA.blessings.reduce((a, b) =>
      (state.blessings[b.id] && b.effect === 'dove') ? a * (1 + b.val) : a, 1);
    return Math.floor(Math.pow(state.lifetime / DATA.doveDivisor, DATA.dovePower) * eff);
  }
  function doveGain() { return Math.max(0, totalDovesFromRun() - state.doves); }

  function flood() {
    const gain = doveGain();
    if (gain <= 0) return 0;
    state.doves += gain;
    // reset run
    state.wood = 0;
    state.lifetime = 0;
    state.tapBase = 1;
    state.arkStage = 0;
    state.boostUntil = 0;
    DATA.generators.forEach(g => state.gens[g.id] = 0);
    DATA.tapUpgrades.forEach(u => state.taps[u.id] = false);
    return gain;
  }

  function buyBlessing(id) {
    const b = DATA.blessings.find(x => x.id === id);
    if (state.blessings[id] || state.doves < b.cost) return false;
    state.doves -= b.cost;
    state.blessings[id] = true;
    return true;
  }

  /* ---------- DAILY REWARD (streak-based, retention driver) ---------- */
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function yesterdayStr() {
    const d = new Date(Date.now() - 86400000);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  /* Returns {streak, amount} if a daily is claimable today, else null. */
  function dailyReward() {
    if (state.lastDailyDay === todayStr()) return null;
    const streak = (state.lastDailyDay === yesterdayStr()) ? state.dailyStreak + 1 : 1;
    const amount = Math.max(production() * 600, tapPower() * 100, 100) * (1 + (streak - 1) * 0.5);
    return { streak, amount };
  }
  function claimDaily() {
    const r = dailyReward();
    if (!r) return null;
    state.lastDailyDay = todayStr();
    state.dailyStreak = r.streak;
    addWood(r.amount);
    return r;
  }

  function offlineCap() {
    let cap = DATA.offlineBaseCap;
    DATA.blessings.forEach(b => { if (state.blessings[b.id] && b.effect === 'offline') cap += b.val; });
    return cap;
  }

  /* ---------- SAVE / LOAD ---------- */
  function save() {
    state.lastSave = Date.now();
    try { Ark.SDK.store.set(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function load() {
    try {
      const raw = Ark.SDK.store.get(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      Object.assign(state, s);
      // ensure new keys exist
      DATA.generators.forEach(g => { if (state.gens[g.id] == null) state.gens[g.id] = 0; });
      if (!state.blessings) state.blessings = {};
      if (!state.taps) state.taps = {};
      return s;
    } catch (e) { return null; }
  }

  /* Returns offline earnings info without applying, so UI can show modal. */
  function computeOffline() {
    const now = Date.now();
    const elapsed = Math.min((now - state.lastSave) / 1000, offlineCap());
    if (elapsed < 30) return null; // ignore short gaps
    const earned = production() * DATA.offlineRate * elapsed;
    if (earned <= 0) return null;
    return { seconds: elapsed, earned, cap: offlineCap() };
  }

  function reset() { Ark.SDK.store.remove(SAVE_KEY); }

  return {
    state, DATA,
    chop, addWood, buyGen, buyTap, buyBlessing, flood,
    genCost, genCostN, maxAffordable, tapCost, tapPower,
    production, baseProduction, globalMult,
    arkProgress, nextPart, buildPart, doveGain, doveBoost, offlineCap,
    computeOffline, save, load, reset,
    dailyReward, claimDaily,
    setBoost: (sec) => { state.boostUntil = Date.now() + sec * 1000; },
    boostActive: () => Date.now() < state.boostUntil,
    boostRemaining: () => Math.max(0, (state.boostUntil - Date.now()) / 1000),
    setFrenzy: (sec) => { state.frenzyUntil = Date.now() + sec * 1000; },
    frenzyActive: () => Date.now() < state.frenzyUntil,
    frenzyRemaining: () => Math.max(0, (state.frenzyUntil - Date.now()) / 1000),
    set onArkComplete(fn) { onArkComplete = fn; },
  };
})();
