/* ============ Number formatting (idle-game friendly) ============ */
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak'];

function fmt(n) {
  if (n === Infinity) return '∞';
  if (n < 1000) return (Math.floor(n * 10) / 10 % 1 === 0) ? Math.floor(n).toString() : (Math.floor(n * 10) / 10).toFixed(1);
  let tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIXES.length) tier = SUFFIXES.length - 1;
  const scaled = n / Math.pow(1000, tier);
  const str = scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
  return str + SUFFIXES[tier];
}

function fmtInt(n) { return Math.floor(n).toLocaleString('en-US'); }

function fmtTime(sec) {
  sec = Math.floor(sec);
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return d + 'd ' + (h % 24) + 'h';
  if (h > 0) return h + 'h ' + (m % 60) + 'm';
  return m + 'm ' + (sec % 60) + 's';
}
