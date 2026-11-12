// Best scores and settings live in localStorage, which never leaves this browser.
// Storage can be unavailable (private windows, locked-down devices), so every
// access is wrapped and the games still work without it.
const PREFIX = 'recess:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore: nothing we can do, and the game should keep running */
  }
}

export const getBest = (gameId) => {
  const n = Number(read(`best:${gameId}`, 0));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/** Saves the score if it beats the old best. Returns true when it is a new best. */
export function submitScore(gameId, score) {
  if (score <= getBest(gameId)) return false;
  write(`best:${gameId}`, score);
  return true;
}

export const getMuted = () => read('muted', false) === true;
export const setMuted = (muted) => write('muted', Boolean(muted));
