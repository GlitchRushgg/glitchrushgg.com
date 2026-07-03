// localStorage persistence (best distance, animals record, mute, tutorial).
// Every access is try/catch'd: portals (CrazyGames) may block storage in iframes.

const K = {
  best: "harBest",
  animals: "harAnimals",
  mute: "harMute",
  tutorial: "harTutorial",
};

function get(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch (e) { return fallback; }
}

function set(key, value) {
  try { localStorage.setItem(key, String(value)); } catch (e) { /* blocked */ }
}

export const Save = {
  best() { return parseInt(get(K.best, "0"), 10) || 0; },
  saveBest(m) {
    if (m > this.best()) { set(K.best, m); return true; }
    return false;
  },
  bestAnimals() { return parseInt(get(K.animals, "0"), 10) || 0; },
  saveAnimals(n) { if (n > this.bestAnimals()) set(K.animals, n); },
  muted() { return get(K.mute, "0") === "1"; },
  setMuted(b) { set(K.mute, b ? "1" : "0"); },
  tutorialDone() { return get(K.tutorial, "0") === "1"; },
  setTutorialDone() { set(K.tutorial, "1"); },
};
