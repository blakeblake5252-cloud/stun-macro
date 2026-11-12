# Recess — a tiny arcade

Three small original browser games behind one menu page, built for a coding
class with nothing but modern web-platform features. There is no build step
and no framework: open the folder with any static web server and it runs.

| Game | Genre | Built with |
| --- | --- | --- |
| Star Dodge | Arcade survival | Canvas 2D, pointer + keyboard input |
| Block Hop | One-button runner | Canvas 2D, simple physics, parallax |
| Echo Grid | Pattern memory | DOM buttons, `async`/`await` timing |

## Running it

```
cd docs
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Opening `index.html` straight from the
file system will not work, because browsers only load JavaScript modules over
http/https.)

## Publishing it with GitHub Pages

1. Merge this folder into the repository's default branch.
2. On GitHub: **Settings → Pages → Build and deployment → Deploy from a
   branch**, pick the branch, and choose the **/docs** folder.
3. The site appears at `https://<username>.github.io/<repository>/`.

All paths in the site are relative, so it works from that sub-path.

## The technology, and where to find it

| Feature | What it does here | File |
| --- | --- | --- |
| ES modules | Every game is its own `import`-ed module | `js/main.js`, `js/games/*` |
| Canvas 2D + `requestAnimationFrame` | Game loop with delta time, sharp on high-DPI screens | `js/lib/engine.js` |
| Pointer Events | One code path for mouse, touch and pen | `js/games/star-dodge.js` |
| Web Audio API | Sound effects are synthesised, so there are no audio files | `js/lib/audio.js` |
| `localStorage` | Best scores and the sound setting stay on the device | `js/lib/store.js` |
| Service worker + web manifest | Works offline after the first visit; installable | `sw.js`, `manifest.webmanifest` |
| Hash routing | `#/` is the menu, `#/play/<id>` is a game | `js/main.js` |
| CSS custom properties, grid, `aspect-ratio`, `clamp()` | Responsive layout from phone to desktop | `css/style.css` |

## Security and privacy

- A **Content Security Policy** in `index.html` only allows code, styles and
  images from the site itself. Inline scripts and third-party hosts are blocked.
- **No third-party requests at all**: no CDNs, fonts, analytics, ads or embeds.
  Everything the page needs is in this folder.
- **No personal data.** The only thing stored is best scores and the sound
  setting, in the browser's own `localStorage`.
- The DOM is built with `createElement`/`textContent`, not by pasting strings
  into `innerHTML` (the one exception is the games' own hard-coded SVG artwork).
- Serve it over **HTTPS** (GitHub Pages does this automatically).

## Adding a game

Create `js/games/my-game.js` that default-exports an object like this, then
add it to the `games` array in `js/main.js` and to `ASSETS` in `sw.js`:

```js
export default {
  id: 'my-game',            // used in the URL
  title: 'My Game',
  tagline: 'One line for the menu card.',
  accent: '#8b93ff',        // theme colour
  controls: 'How to play.',
  thumb: '<svg viewBox="0 0 160 100">…</svg>',
  mount(stage, api) {
    // Build your game inside `stage`.
    // api.score(n) updates the score display; api.end(n) finishes the round.
    // api.sfx has tone(), pickup(), jump(), win() and lose().
    return {
      start() { /* begin or restart a round */ },
      destroy() { /* remove listeners, timers and elements */ },
    };
  },
};
```
