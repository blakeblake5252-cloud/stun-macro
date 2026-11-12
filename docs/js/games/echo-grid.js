// Echo Grid: watch the tiles light up, then tap them back in the same order.
// Built from real <button> elements, so it works with keyboard and screen readers.
import { h } from '../lib/dom.js';

const CELLS = 16;
// One note per tile, climbing a pentatonic scale so any sequence sounds pleasant.
const SCALE = [0, 2, 4, 7, 9];
const NOTES = Array.from({ length: CELLS }, (_, i) =>
  196 * 2 ** ((SCALE[i % 5] + 12 * Math.floor(i / 5)) / 12));

export default {
  id: 'echo-grid',
  title: 'Echo Grid',
  tagline: 'Watch the pattern. Play it back.',
  accent: '#5eead4',
  controls: 'Watch the tiles flash, then click or tap them in the same order. Each round adds one more.',
  thumb: `<svg viewBox="0 0 160 100" aria-hidden="true">
    <g fill="#262c58">
      <rect x="38" y="8" width="18" height="18" rx="4"/><rect x="82" y="8" width="18" height="18" rx="4"/><rect x="104" y="8" width="18" height="18" rx="4"/>
      <rect x="38" y="30" width="18" height="18" rx="4"/><rect x="60" y="30" width="18" height="18" rx="4"/><rect x="104" y="30" width="18" height="18" rx="4"/>
      <rect x="60" y="52" width="18" height="18" rx="4"/><rect x="82" y="52" width="18" height="18" rx="4"/><rect x="104" y="52" width="18" height="18" rx="4"/>
      <rect x="38" y="74" width="18" height="18" rx="4"/><rect x="60" y="74" width="18" height="18" rx="4"/><rect x="82" y="74" width="18" height="18" rx="4"/>
    </g>
    <g fill="#5eead4">
      <rect x="60" y="8" width="18" height="18" rx="4"/><rect x="82" y="30" width="18" height="18" rx="4"/>
      <rect x="38" y="52" width="18" height="18" rx="4"/><rect x="104" y="74" width="18" height="18" rx="4"/>
    </g>
  </svg>`,

  mount(stage, api) {
    const status = h('p', { class: 'echo-status', 'aria-live': 'polite' }, 'Ready?');
    const cells = Array.from({ length: CELLS }, (_, i) =>
      h('button', {
        class: 'echo-cell', type: 'button', disabled: '',
        'aria-label': `Tile ${i + 1}`,
        onclick: () => choose(i),
      }));
    const root = h('div', { class: 'echo' }, status, h('div', { class: 'echo-grid' }, ...cells));
    stage.append(root);

    let sequence = [];
    let position = 0;
    let round = 0;
    let accepting = false;
    let run = 0; // bumped on every start/destroy so stale timers know to stop
    const timers = new Set();

    const sleep = (ms) => new Promise((resolve) => {
      const id = setTimeout(() => { timers.delete(id); resolve(); }, ms);
      timers.add(id);
    });

    function setAccepting(value) {
      accepting = value;
      for (const cell of cells) cell.disabled = !value;
    }

    function flash(index, ms) {
      const cell = cells[index];
      cell.classList.add('lit');
      api.sfx.tone(NOTES[index], Math.max(0.12, ms / 1000), 'triangle', 0.09);
      const id = setTimeout(() => { timers.delete(id); cell.classList.remove('lit'); }, ms);
      timers.add(id);
    }

    async function playRound() {
      const mine = run;
      setAccepting(false);
      status.textContent = `Round ${round + 1}: watch`;

      // A fresh pattern each round, never lighting the same tile twice in a row.
      sequence = [];
      while (sequence.length < round + 3) {
        const next = Math.floor(Math.random() * CELLS);
        if (next !== sequence.at(-1)) sequence.push(next);
      }

      const onTime = Math.max(190, 420 - round * 25);
      await sleep(700);
      for (const index of sequence) {
        if (mine !== run) return;
        flash(index, onTime);
        await sleep(onTime + 130);
      }
      if (mine !== run) return;

      position = 0;
      setAccepting(true);
      status.textContent = 'Your turn';
    }

    async function choose(index) {
      if (!accepting) return;
      const mine = run;

      if (index !== sequence[position]) {
        setAccepting(false);
        cells[index].classList.add('wrong');
        cells[sequence[position]].classList.add('lit'); // show what it should have been
        status.textContent = 'Not quite';
        api.sfx.lose();
        await sleep(1000);
        if (mine === run) api.end(round);
        return;
      }

      flash(index, 170);
      position += 1;
      if (position === sequence.length) {
        round += 1;
        api.score(round);
        setAccepting(false);
        status.textContent = 'Nice!';
        await sleep(350);
        if (mine !== run) return;
        api.sfx.win();
        playRound();
      }
    }

    function stopTimers() {
      run += 1;
      timers.forEach(clearTimeout);
      timers.clear();
    }

    return {
      start() {
        stopTimers();
        round = 0;
        api.score(0);
        for (const cell of cells) cell.classList.remove('lit', 'wrong');
        playRound();
      },
      destroy() {
        stopTimers();
        root.remove();
      },
    };
  },
};
