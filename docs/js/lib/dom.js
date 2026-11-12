// Tiny helper for building DOM nodes without innerHTML string-gluing.
// h('button', { class: 'primary', onclick: fn }, 'Play')
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value; // only ever used with our own static SVG strings
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value);
  }
  el.append(...children);
  return el;
}
