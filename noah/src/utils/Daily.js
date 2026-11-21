// Daily Ark: one seeded run per UTC day — the whole world plays the same levels today.
// Only the LEVEL LAYOUT is seeded (platforms, platform types, animals, golden animals);
// cosmetic randomness (rain, stars, confetti) stays free.

const KEY = 'noah_daily_v1';
const EPOCH = Date.UTC(2026, 10, 21);          // Daily Ark #1 = 2026-11-21 (UTC)
const DAY = 86400000;

export function todayUTC(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);       // 'YYYY-MM-DD' in UTC
}

export function dailyNumber(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH) / DAY) + 1;
}

// ms until the next UTC midnight (when a new Daily Ark appears)
export function msToNextDaily(now = Date.now()) {
  return DAY - (now % DAY);
}

export function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// xmur3 string hash -> 32-bit seed
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

// mulberry32 PRNG in [0, 1)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Run fn() with Math.random replaced by a PRNG seeded from `key` (Phaser.Math.Between
// and friends use Math.random, so the whole level generator becomes deterministic).
// Always restores the real Math.random, even if fn throws.
export function withSeed(key, fn) {
  const real = Math.random;
  Math.random = mulberry32(hashSeed(key));
  try { return fn(); } finally { Math.random = real; }
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && typeof d === 'object') return d;
  } catch (_) {}
  return null;
}

// Today's personal stats: { date, attempts, best: { animals, score, level } | null }
export function getDailyStats(date = todayUTC()) {
  const d = load();
  if (!d || d.date !== date) return { date, attempts: 0, best: null };
  return { date, attempts: d.attempts || 0, best: d.best || null };
}

// Count an attempt when a Daily Ark run starts (attempt counter = flex metric).
export function startDailyAttempt(date) {
  const s = getDailyStats(date);
  const next = { date, attempts: s.attempts + 1, best: s.best };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) {}
  return next.attempts;
}

// Record a finished run; returns { stats, isBest }. Best = most animals, then score.
export function recordDailyResult(date, animals, score, level) {
  // A run that started before UTC midnight must not overwrite the new day's record
  const stored = load();
  if (stored && stored.date && stored.date > date) {
    return { stats: { date, attempts: 1, best: { animals, score, level } }, isBest: false };
  }
  const s = getDailyStats(date);
  const b = s.best;
  const isBest = !b || animals > b.animals || (animals === b.animals && score > b.score);
  const best = isBest ? { animals, score, level } : b;
  const next = { date, attempts: Math.max(1, s.attempts), best };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) {}
  return { stats: next, isBest };
}
