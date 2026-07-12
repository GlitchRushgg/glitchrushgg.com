// localStorage persistence with try/catch (blocked storage in some iframes).
// v2: misma KEY que v1 → los jugadores conservan estrellas, skins y estelas.
// Los campos de niveles de v1 (levelsUnlocked/levelStars) quedan ignorados.

const KEY = "dreamDuo_v1";

const data = {
  best: 0,               // high score endless
  bestMeters: 0,
  stars: 0,
  plays: 0,
  mute: false,
  tutorialSeen: false,
  skins: ["classic"],
  trails: ["sparkle"],
  skin: "classic",
  trail: "sparkle",
  missions: null,        // { date, list: [{id, progress, done}] }
  lastDeath: null,       // { dist, lane } — marca fantasma tipo Duet
};
try { Object.assign(data, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}

export const Save = {
  get: () => data,
  persist,
  addStars(n) { data.stars += n; persist(); },
  spendStars(n) {
    if (data.stars < n) return false;
    data.stars -= n; persist(); return true;
  },
  submitScore(s, meters) {
    const isBest = s > data.best;
    if (isBest) data.best = s;
    if (meters > (data.bestMeters || 0)) data.bestMeters = meters;
    data.plays++;
    persist();
    return isBest;
  },
};
