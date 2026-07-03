// Persistencia en localStorage: récord (segundos), monedas, niveles de perks
// permanentes, mute y tutorial. Con try/catch (iframes sin storage).

const K = {
  best: "rrBest",
  coins: "rrCoins",
  perks: "rrPerks",
  mute: "rrMute",
  tut: "rrTutorialDone",
};

function get(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : v;
  } catch (e) { return def; }
}

function set(key, val) {
  try { localStorage.setItem(key, String(val)); } catch (e) { /* sin storage */ }
}

export const Save = {
  best() { return parseInt(get(K.best, "0"), 10) || 0; },
  saveBest(secs) {
    if (secs > this.best()) { set(K.best, secs); return true; }
    return false;
  },

  coins() { return parseInt(get(K.coins, "0"), 10) || 0; },
  addCoins(n) { set(K.coins, this.coins() + n); },
  spend(n) {
    if (this.coins() < n) return false;
    set(K.coins, this.coins() - n);
    return true;
  },

  // Perks permanentes: { vit: 0-3, pow: 0-3, agi: 0-3, luck: 0-3 }
  perkLevel(id) { return this._perks()[id] || 0; },
  upPerk(id) {
    const p = this._perks();
    p[id] = (p[id] || 0) + 1;
    set(K.perks, JSON.stringify(p));
  },
  _perks() {
    try { return JSON.parse(get(K.perks, "{}")) || {}; } catch (e) { return {}; }
  },

  muted() { return get(K.mute, "0") === "1"; },
  setMuted(b) { set(K.mute, b ? "1" : "0"); },

  tutorialDone() { return get(K.tut, "0") === "1"; },
  setTutorialDone() { set(K.tut, "1"); },
};
