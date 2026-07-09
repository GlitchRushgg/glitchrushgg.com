// localStorage persistence with try/catch (blocked storage in some iframes).

const KEY = "dreamDuo_v1";

const data = {
  best: 0,               // endless mode high score
  stars: 0,
  plays: 0,
  mute: false,
  tutorialSeen: false,
  skins: ["classic"],
  trails: ["sparkle"],
  skin: "classic",
  trail: "sparkle",
  levelsUnlocked: 1,     // highest playable level (1-based)
  levelStars: {},        // levelIdx(1-based) -> 1..3 stars
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
  submitScore(s) {
    const isBest = s > data.best;
    if (isBest) data.best = s;
    data.plays++;
    persist();
    return isBest;
  },
  completeLevel(levelNum, stars) {
    const prev = data.levelStars[levelNum] || 0;
    if (stars > prev) data.levelStars[levelNum] = stars;
    if (levelNum + 1 > data.levelsUnlocked) data.levelsUnlocked = levelNum + 1;
    data.plays++;
    persist();
  },
};
