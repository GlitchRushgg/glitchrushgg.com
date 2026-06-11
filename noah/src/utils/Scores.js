const KEY = 'noahsArkScores';

export function getScores() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

// Adds a run, keeps top 10 sorted by score desc.
// Returns the 1-based rank of the new entry (null if outside top 10).
export function addScore(score, level) {
  const list = getScores();
  const entry = { score, level, _new: true };
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 10);
  const rank = top.findIndex(s => s._new);
  localStorage.setItem(KEY, JSON.stringify(top.map(({ score, level }) => ({ score, level }))));
  return rank >= 0 ? rank + 1 : null;
}
