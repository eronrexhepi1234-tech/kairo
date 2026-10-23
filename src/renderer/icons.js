// Clean line icons (Lucide) instead of emojis in the interface.
// ic('name') returns an <svg>; emojis in the UI are swapped for icons automatically.
// Chat messages, diary moods, chess pieces, medals and form fields keep their characters.
(function () {
  const SVG = window.ICON_SVG || {}, MAP = window.ICON_EMOJI || {};
  window.ic = (name, cls = '') => SVG[name]
    ? `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[name]}</svg>`
    : '';

  // longest emoji sequences first (e.g. pirate flag before flag)
  const keys = Object.keys(MAP).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const RX = new RegExp('(' + keys.join('|') + ')[\\uFE0F\\u200D]*', 'gu');
  const SKIP = '.msg, .moods, .diary-today, .diary-list, .no-ic, .chess-board, .board, .lb, .medal, input, textarea, select, option, script, style, svg, code, pre, .md';

  function swapText(node) {
    const txt = node.nodeValue;
    RX.lastIndex = 0;
    if (!RX.test(txt)) return;
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) return;
    RX.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, m;
    while ((m = RX.exec(txt))) {
      if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
      const span = document.createElement('span');
      span.className = 'ic-wrap';
      span.innerHTML = window.ic(MAP[m[1]]) || m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
    node.replaceWith(frag);
  }
  function walk(root) {
    if (root.nodeType === 3) return swapText(root);
    if (root.nodeType !== 1 || root.closest?.(SKIP)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; let n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(swapText);
  }
  // titles and button labels set via attributes keep their text; only visible text nodes change
  let queued = new Set(), timer = 0;
  const flush = () => { timer = 0; const list = [...queued]; queued.clear(); list.forEach(n => n.isConnected && walk(n)); };
  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') queued.add(m.target);
      else m.addedNodes.forEach(n => queued.add(n));
    }
    if (!timer) timer = requestAnimationFrame(flush);
  });
  const start = () => { walk(document.body); obs.observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

// soft spotlight that follows the mouse over cards
document.addEventListener('pointermove', e => {
  const c = e.target.closest?.('.tcard');
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  c.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });
