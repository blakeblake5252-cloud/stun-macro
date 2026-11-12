// Block Hop: a one-button runner. Hold the jump longer to go higher.
import { makeCanvas, loop, listen, rand } from '../lib/engine.js';

const W = 800;
const H = 500;
const GROUND = 410;
const SIZE = 34;
const GRAVITY = 2400;
const JUMP_SPEED = 820;
const JUMP_KEYS = new Set([' ', 'ArrowUp', 'w', 'W']);

export default {
  id: 'block-hop',
  title: 'Block Hop',
  tagline: 'One button. It only gets faster.',
  accent: '#fbbf24',
  controls: 'Press Space, the up arrow, or tap to jump. Hold for a higher jump.',
  thumb: `<svg viewBox="0 0 160 100" aria-hidden="true">
    <rect x="0" y="78" width="160" height="4" fill="#f3efe6"/>
    <rect x="34" y="30" width="26" height="26" rx="6" fill="#fbbf24" transform="rotate(-18 47 43)"/>
    <rect x="92" y="50" width="18" height="28" rx="4" fill="#8b93ff"/>
    <rect x="132" y="38" width="16" height="40" rx="4" fill="#8b93ff"/>
    <path d="M14 70 Q 30 30 47 43" fill="none" stroke="#f3efe6" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round"/>
  </svg>`,

  mount(stage, api) {
    const { canvas, ctx } = makeCanvas(stage, W, H);

    let alive = false;
    let started = false;
    let distance = 0;
    let speed = 340;
    let shownScore = -1;
    let nextGap = 0;
    let obstacles = [];
    let player = { x: 120, y: GROUND - SIZE, vy: 0, grounded: true, angle: 0 };

    function press() {
      if (!alive || !player.grounded) return;
      player.vy = -JUMP_SPEED;
      player.grounded = false;
      api.sfx.jump();
    }

    // Letting go early cuts the jump short, which gives precise control.
    function release() {
      if (player.vy < -300) player.vy = -300;
    }

    function update(dt) {
      if (!alive) return;

      speed = Math.min(760, speed + 8 * dt);
      distance += speed * dt;

      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y >= GROUND - SIZE) {
        player.y = GROUND - SIZE;
        player.vy = 0;
        player.grounded = true;
        player.angle = 0;
      } else {
        player.angle += 5.4 * dt;
      }

      nextGap -= speed * dt;
      if (nextGap <= 0) {
        obstacles.push({ x: W + 20, w: rand(22, 56), h: rand(30, 82) });
        nextGap = speed * rand(0.95, 1.6); // spacing scales with speed so it stays fair
      }

      for (const block of obstacles) {
        block.x -= speed * dt;
        // Shrink the hit box a little so near misses feel fair.
        const hit =
          player.x + SIZE - 5 > block.x &&
          player.x + 5 < block.x + block.w &&
          player.y + SIZE - 3 > GROUND - block.h;
        if (hit) {
          alive = false;
          api.sfx.lose();
          api.end(Math.floor(distance / 10));
          return;
        }
      }
      obstacles = obstacles.filter((block) => block.x + block.w > -10);

      const score = Math.floor(distance / 10);
      if (score !== shownScore) { shownScore = score; api.score(score); }
    }

    function draw() {
      ctx.fillStyle = '#12152b';
      ctx.fillRect(0, 0, W, H);

      // Far hills scroll slowly for a sense of depth (parallax).
      ctx.fillStyle = '#1a1e3d';
      for (let i = -1; i < 5; i++) {
        const x = i * 260 - ((distance * 0.2) % 260);
        ctx.beginPath();
        ctx.moveTo(x, GROUND);
        ctx.quadraticCurveTo(x + 130, GROUND - 190, x + 260, GROUND);
        ctx.fill();
      }

      ctx.fillStyle = '#f3efe6';
      ctx.fillRect(0, GROUND, W, 4);
      ctx.fillStyle = '#3a4070';
      for (let i = 0; i < 12; i++) {
        const x = i * 80 - (distance % 80);
        ctx.fillRect(x, GROUND + 16, 34, 4);
      }

      ctx.fillStyle = '#8b93ff';
      for (const block of obstacles) {
        ctx.beginPath();
        ctx.roundRect(block.x, GROUND - block.h, block.w, block.h, [6, 6, 0, 0]);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(player.x + SIZE / 2, player.y + SIZE / 2);
      ctx.rotate(player.angle);
      ctx.fillStyle = alive || !started ? '#fbbf24' : '#ff6b5e';
      ctx.beginPath();
      ctx.roundRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 7);
      ctx.fill();
      ctx.fillStyle = '#12152b';
      ctx.fillRect(4, -8, 7, 9); // eye
      ctx.restore();
    }

    const cleanup = [
      loop((dt) => { update(dt); draw(); }),
      listen(window, 'keydown', (event) => {
        if (!JUMP_KEYS.has(event.key) || !alive) return;
        event.preventDefault(); // stop Space scrolling the page mid-game
        if (!event.repeat) press();
      }),
      listen(window, 'keyup', (event) => { if (JUMP_KEYS.has(event.key)) release(); }),
      listen(canvas, 'pointerdown', press),
      listen(canvas, 'pointerup', release),
      listen(canvas, 'pointercancel', release),
    ];

    return {
      start() {
        alive = true; started = true;
        distance = 0; speed = 340; shownScore = -1;
        nextGap = 500;
        obstacles = [];
        player = { x: 120, y: GROUND - SIZE, vy: 0, grounded: true, angle: 0 };
        api.score(0);
      },
      destroy() {
        cleanup.forEach((stop) => stop());
        canvas.remove();
      },
    };
  },
};
