const KEY = 'noahsArkScores';

export function getScores() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

// The headline result of a run is ANIMALS SAVED (the game's viral question:
// "how many animals did you save?"); points break ties. Older entries saved
// before this change have no `animals` field and count as 0.
const byAnimalsThenScore = (a, b) => (b.animals || 0) - (a.animals || 0) || b.score - a.score;

// Adds a run, keeps the top 10. Returns the 1-based rank of the new entry
// (null if outside the top 10).
export function addScore(score, level, animals = 0) {
  const list = getScores();
  const entry = { score, level, animals, _new: true };
  list.push(entry);
  list.sort(byAnimalsThenScore);
  const top = list.slice(0, 10);
  const rank = top.findIndex(s => s._new);
  try {
    localStorage.setItem(KEY, JSON.stringify(top.map(({ score, level, animals }) => ({ score, level, animals: animals || 0 }))));
  } catch { /* storage blocked: the run still shows its result */ }
  return rank >= 0 ? rank + 1 : null;
}
