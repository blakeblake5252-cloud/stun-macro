// Sound effects are synthesised with the Web Audio API, so there are no audio
// files to download. Browsers only allow audio after a user gesture, which is
// why the context is created lazily on the first tone().
import { getMuted, setMuted } from './store.js';

let ctx = null;
let muted = getMuted();

export const isMuted = () => muted;

export function toggleMuted() {
  muted = !muted;
  setMuted(muted);
  return muted;
}

export function tone(freq, duration = 0.1, type = 'square', volume = 0.05, delay = 0) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  } catch {
    /* audio is a nice-to-have; never let it break a game */
  }
}

// A few ready-made effects shared by the games.
export const sfx = {
  tone,
  pickup: () => { tone(660, 0.07, 'triangle', 0.08); tone(990, 0.1, 'triangle', 0.08, 0.06); },
  jump: () => tone(420, 0.09, 'square', 0.04),
  win: () => [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.07, i * 0.08)),
  lose: () => { tone(220, 0.18, 'sawtooth', 0.06); tone(130, 0.3, 'sawtooth', 0.06, 0.14); },
};
