// Shared plumbing for the canvas games.

/**
 * Creates a canvas with a fixed logical size (width x height). The backing
 * store is scaled by the device pixel ratio so it stays sharp on high-DPI
 * screens, while CSS stretches it to fit the stage.
 */
export function makeCanvas(stage, width, height) {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.className = 'game-canvas';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  stage.append(canvas);

  // Convert a pointer event into logical game coordinates.
  const toLocal = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  };
  return { canvas, ctx, toLocal };
}

/**
 * Runs frame(dt) once per animation frame, where dt is seconds since the last
 * frame. dt is capped so a background tab doesn't cause one giant time step.
 * Returns a function that stops the loop.
 */
export function loop(frame) {
  let id = 0;
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame(dt);
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}

/** addEventListener that returns its own "remove" function, for easy cleanup. */
export function listen(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

export const rand = (min, max) => min + Math.random() * (max - min);
