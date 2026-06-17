// Récord personal en localStorage (puntuación = nº de glitches purificados).

const KEY = "efGlitchRushBest";

export function getBest() {
  const v = parseInt(localStorage.getItem(KEY) || "0", 10);
  return Number.isFinite(v) ? v : 0;
}

// Guarda el score si supera el récord. Devuelve true si fue récord nuevo.
export function saveScore(score) {
  if (score > getBest()) {
    localStorage.setItem(KEY, String(score));
    return true;
  }
  return false;
}
