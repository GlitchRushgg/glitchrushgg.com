// Persistencia en localStorage: récord, bits (moneda), ítems comprados,
// skin/estela equipadas y mute. Todo con try/catch (iframes sin storage).

const K = {
  best: "gsBest",
  bits: "gsBits",
  owned: "gsOwned",
  skin: "gsSkin",
  trail: "gsTrail",
  mute: "gsMute",
  tut: "gsTutorialDone",
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
  // Devuelve true si es récord nuevo.
  saveBest(m) {
    if (m > this.best()) { set(K.best, m); return true; }
    return false;
  },

  bits() { return parseInt(get(K.bits, "0"), 10) || 0; },
  addBits(n) { set(K.bits, this.bits() + n); },
  spend(n) {
    if (this.bits() < n) return false;
    set(K.bits, this.bits() - n);
    return true;
  },

  owned(id) { return this._ownedList().includes(id); },
  own(id) {
    const list = this._ownedList();
    if (!list.includes(id)) { list.push(id); set(K.owned, JSON.stringify(list)); }
  },
  _ownedList() {
    try { return JSON.parse(get(K.owned, "[]")) || []; } catch (e) { return []; }
  },

  skin() { return get(K.skin, "pulse"); },
  setSkin(id) { set(K.skin, id); },
  trail() { return get(K.trail, "sync"); },
  setTrail(id) { set(K.trail, id); },

  muted() { return get(K.mute, "0") === "1"; },
  setMuted(b) { set(K.mute, b ? "1" : "0"); },

  tutorialDone() { return get(K.tut, "0") === "1"; },
  setTutorialDone() { set(K.tut, "1"); },
};
