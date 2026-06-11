const GAME_URL = 'https://glitchrushgg.com/noah/';

// Shares via the native share sheet when available (mobile),
// falls back to copying the text + link to the clipboard.
// Returns 'shared', 'copied', or 'none' so the caller can show feedback.
export function shareScore(text) {
  const full = `${text}\n${GAME_URL}`;
  if (navigator.share) {
    navigator.share({ text: full }).catch(() => {});
    return 'shared';
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(full).catch(() => {});
    return 'copied';
  }
  return 'none';
}
