// Star Dodge: steer a ship through falling rocks and grab energy cells.
import { makeCanvas, loop, listen, rand } from '../lib/engine.js';

const W = 800;
const H = 500;
const MOVE_KEYS = {
  ArrowLeft: [-1, 0], a: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0],
  ArrowUp: [0, -1], w: [0, -1],
  ArrowDown: [0, 1], s: [0, 1],
};

export default {
  id: 'star-dodge',
  title: 'Star Dodge',
  tagline: 'Thread a ship through a rock storm.',
  accent: '#ff6b5e',
  controls: 'Move with the mouse, a finger, or arrow keys / WASD. Green cells are worth 50.',
  thumb: `<svg viewBox="0 0 160 100" aria-hidden="true">
    <circle cx="20" cy="18" r="1.5" fill="#f3efe6"/><circle cx="120" cy="30" r="1.5" fill="#f3efe6"/>
    <circle cx="70" cy="12" r="1" fill="#f3efe6"/><circle cx="145" cy="70" r="1" fill="#f3efe6"/>
    <polygon points="38,22 56,28 60,46 44,56 28,44" fill="none" stroke="#ff6b5e" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="112,40 128,46 126,62 110,66 102,52" fill="none" stroke="#ff6b5e" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="92,14 100,22 92,30 84,22" fill="#5eead4"/>
    <polygon points="80,62 94,90 80,84 66,90" fill="#f3efe6"/>
  </svg>`,

  mount(stage, api) {
    const { canvas, ctx, toLocal } = makeCanvas(stage, W, H);
    const keys = new Set();
    const stars = Array.from({ length: 70 }, () => ({
      x: rand(0, W), y: rand(0, H), speed: rand(15, 70), size: rand(0.6, 1.8),
    }));

    let alive = false;
    let time = 0;
    let bonus = 0;
    let shownScore = -1;
    let rockTimer = 0;
    let cellTimer = 0;
    let pointer = null; // where the ship is trying to go, or null when using keys
    let ship = { x: W / 2, y: H - 80, r: 14 };
    let rocks = [];
    let cells = [];
    let sparks = [];

    function spawnRock() {
      const r = rand(14, 34);
      const points = Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = r * rand(0.75, 1.1);
        return [Math.cos(angle) * radius, Math.sin(angle) * radius];
      });
      rocks.push({
        x: rand(r, W - r), y: -r, r, points,
        vx: rand(-40, 40), vy: rand(140, 260) + time * 4,
        angle: 0, spin: rand(-1.5, 1.5),
      });
    }

    function update(dt) {
      for (const star of stars) {
        star.y += star.speed * dt;
        if (star.y > H) { star.y = 0; star.x = rand(0, W); }
      }
      for (const spark of sparks) {
        spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.life -= dt;
      }
      sparks = sparks.filter((spark) => spark.life > 0);
      if (!alive) return;

      time += dt;

      // Steering: keys move at a fixed speed, a pointer is followed smoothly.
      let dx = 0;
      let dy = 0;
      for (const key of keys) { dx += MOVE_KEYS[key][0]; dy += MOVE_KEYS[key][1]; }
      if (dx || dy) {
        pointer = null;
        const length = Math.hypot(dx, dy);
        ship.x += (dx / length) * 430 * dt;
        ship.y += (dy / length) * 430 * dt;
      } else if (pointer) {
        const ease = Math.min(1, dt * 14);
        ship.x += (pointer.x - ship.x) * ease;
        ship.y += (pointer.y - ship.y) * ease;
      }
      ship.x = Math.max(ship.r, Math.min(W - ship.r, ship.x));
      ship.y = Math.max(ship.r, Math.min(H - ship.r, ship.y));

      // Spawning gets faster the longer you survive.
      rockTimer -= dt;
      if (rockTimer <= 0) { spawnRock(); rockTimer = Math.max(0.16, 0.7 - time * 0.012); }
      cellTimer -= dt;
      if (cellTimer <= 0) { cells.push({ x: rand(30, W - 30), y: -12, r: 11 }); cellTimer = rand(3, 5); }

      for (const rock of rocks) {
        rock.x += rock.vx * dt; rock.y += rock.vy * dt; rock.angle += rock.spin * dt;
        if (Math.hypot(rock.x - ship.x, rock.y - ship.y) < rock.r * 0.85 + ship.r * 0.7) return crash();
      }
      rocks = rocks.filter((rock) => rock.y < H + rock.r);

      for (const cell of cells) {
        cell.y += 130 * dt;
        if (Math.hypot(cell.x - ship.x, cell.y - ship.y) < cell.r + ship.r) {
          cell.taken = true;
          bonus += 50;
          api.sfx.pickup();
        }
      }
      cells = cells.filter((cell) => !cell.taken && cell.y < H + 20);

      const score = Math.floor(time * 10) + bonus;
      if (score !== shownScore) { shownScore = score; api.score(score); }
    }

    function crash() {
      alive = false;
      for (let i = 0; i < 26; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(60, 320);
        sparks.push({ x: ship.x, y: ship.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: rand(0.3, 0.9) });
      }
      api.sfx.lose();
      api.end(Math.floor(time * 10) + bonus);
    }

    function draw() {
      ctx.fillStyle = '#0b0e1f';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#f3efe6';
      for (const star of stars) {
        ctx.globalAlpha = 0.25 + star.size * 0.3;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#5eead4';
      for (const cell of cells) {
        ctx.beginPath();
        ctx.moveTo(cell.x, cell.y - cell.r); ctx.lineTo(cell.x + cell.r, cell.y);
        ctx.lineTo(cell.x, cell.y + cell.r); ctx.lineTo(cell.x - cell.r, cell.y);
        ctx.fill();
      }

      ctx.strokeStyle = '#ff6b5e';
      ctx.fillStyle = '#231a2e';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      for (const rock of rocks) {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        ctx.rotate(rock.angle);
        ctx.beginPath();
        rock.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (alive || time === 0) {
        ctx.fillStyle = '#f3efe6';
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y - 18); ctx.lineTo(ship.x + 14, ship.y + 14);
        ctx.lineTo(ship.x, ship.y + 7); ctx.lineTo(ship.x - 14, ship.y + 14);
        ctx.fill();
        ctx.fillStyle = '#fbbf24'; // engine flicker
        ctx.fillRect(ship.x - 3, ship.y + 11, 6, 5 + Math.random() * 7);
      }

      ctx.fillStyle = '#fbbf24';
      for (const spark of sparks) {
        ctx.globalAlpha = Math.min(1, spark.life * 2);
        ctx.fillRect(spark.x - 2, spark.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
    }

    const cleanup = [
      loop((dt) => { update(dt); draw(); }),
      listen(window, 'keydown', (event) => {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (!(key in MOVE_KEYS) || !alive) return;
        keys.add(key);
        event.preventDefault(); // stop arrow keys scrolling the page mid-game
      }),
      listen(window, 'keyup', (event) => {
        keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      }),
      listen(window, 'blur', () => keys.clear()),
      listen(canvas, 'pointermove', (event) => {
        pointer = toLocal(event);
        if (event.pointerType === 'touch') pointer.y -= 50; // keep the ship visible above the finger
      }),
      listen(canvas, 'pointerdown', (event) => {
        pointer = toLocal(event);
        if (event.pointerType === 'touch') pointer.y -= 50;
      }),
    ];

    return {
      start() {
        alive = true;
        time = 0; bonus = 0; shownScore = -1;
        rockTimer = 0.6; cellTimer = 2.5;
        rocks = []; cells = []; sparks = [];
        pointer = null;
        keys.clear();
        ship = { x: W / 2, y: H - 80, r: 14 };
        api.score(0);
      },
      destroy() {
        cleanup.forEach((stop) => stop());
        canvas.remove();
      },
    };
  },
};
