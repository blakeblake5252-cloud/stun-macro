// App shell: a tiny hash router with two views.
//   #/               -> the game list
//   #/play/<game-id> -> one game, with score, best score and start/retry overlay
// Each game is an ES module that exports { id, title, ..., mount(stage, api) }.
import { h } from './lib/dom.js';
import { sfx, isMuted, toggleMuted } from './lib/audio.js';
import { getBest, submitScore } from './lib/store.js';
import starDodge from './games/star-dodge.js';
import blockHop from './games/block-hop.js';
import echoGrid from './games/echo-grid.js';

const games = [starDodge, blockHop, echoGrid];
const app = document.getElementById('app');
let activeView = null; // the mounted game view, so we can clean it up when leaving

function renderHub() {
  document.title = 'Recess — a tiny arcade';
  const cards = games.map((game) => {
    const best = getBest(game.id);
    const card = h('a', { class: 'card', href: `#/play/${game.id}` },
      h('div', { class: 'card-art', html: game.thumb }),
      h('div', { class: 'card-body' },
        h('h2', {}, game.title),
        h('p', {}, game.tagline),
        h('p', { class: 'card-best' }, best ? `Best ${best}` : 'Not played yet'),
      ),
    );
    card.style.setProperty('--accent', game.accent);
    return card;
  });

  app.replaceChildren(
    h('section', { class: 'hero' },
      h('h1', {}, 'Pick a game.'),
      h('p', {}, 'Three quick ones, each a minute or two. Your best scores are saved on this device.'),
    ),
    h('section', { class: 'cards', 'aria-label': 'Games' }, ...cards),
  );
}

function renderPlay(game) {
  document.title = `${game.title} — Recess`;

  const scoreEl = h('strong', {}, '0');
  const bestEl = h('strong', {}, String(getBest(game.id)));
  const stage = h('div', { class: 'stage' });
  const heading = h('h2', {}, game.title);
  const detail = h('p', {}, game.tagline);
  const button = h('button', { class: 'primary', type: 'button' }, 'Start');
  const overlay = h('div', { class: 'overlay' }, heading, detail, button);
  let enableTimer = 0;

  const instance = game.mount(stage, {
    sfx,
    score(value) { scoreEl.textContent = String(value); },
    end(finalScore) {
      const isBest = submitScore(game.id, finalScore);
      bestEl.textContent = String(getBest(game.id));
      heading.textContent = isBest ? 'New best!' : 'Game over';
      detail.textContent = `You scored ${finalScore}.`;
      button.textContent = 'Play again';
      overlay.hidden = false;
      // Brief pause before the button is live, so a jump key mashed at the
      // moment of losing doesn't instantly restart the game.
      button.disabled = true;
      enableTimer = setTimeout(() => { button.disabled = false; button.focus(); }, 450);
    },
  });
  stage.append(overlay);

  button.addEventListener('click', () => {
    overlay.hidden = true;
    button.blur();
    instance.start();
  });

  const view = h('section', { class: 'play' },
    h('div', { class: 'play-head' },
      h('a', { class: 'back', href: '#/' }, '← All games'),
      h('h1', {}, game.title),
      h('dl', { class: 'hud' },
        h('div', {}, h('dt', {}, 'Score'), h('dd', {}, scoreEl)),
        h('div', {}, h('dt', {}, 'Best'), h('dd', {}, bestEl)),
      ),
    ),
    stage,
    h('p', { class: 'controls' }, game.controls),
  );
  view.style.setProperty('--accent', game.accent);
  app.replaceChildren(view);
  button.focus();

  return {
    destroy() {
      clearTimeout(enableTimer);
      instance.destroy();
    },
  };
}

function route() {
  activeView?.destroy();
  activeView = null;
  const match = location.hash.match(/^#\/play\/([\w-]+)$/);
  const game = match && games.find((g) => g.id === match[1]);
  if (game) activeView = renderPlay(game);
  else renderHub();
  window.scrollTo(0, 0);
}

// Sound toggle (remembered between visits).
const muteButton = document.getElementById('mute');
function paintMute() {
  muteButton.textContent = isMuted() ? 'Sound off' : 'Sound on';
  muteButton.setAttribute('aria-pressed', String(isMuted()));
}
muteButton.addEventListener('click', () => { toggleMuted(); paintMute(); });
paintMute();

window.addEventListener('hashchange', route);
route();

// Offline support. Service workers only run on https:// or localhost.
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is optional */ });
}
