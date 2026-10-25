// Super-Search (Alt+Space): files, folders, programs, Windows settings, calculator, or hand a question to Kairo.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = window.kairo.search;
  const IC = {
    app: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    setting: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M16 14v4M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>',
    ask: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>'
  };
  const icon = t => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[t] || IC.file}</svg>`;
  const GROUP = { calc: 'Rechner (Enter = kopieren)', app: 'Programme', setting: 'Einstellungen', folder: 'Ordner', file: 'Dateien', ask: 'Kairo' };
  let items = [], sel = 0, timer = 0, seq = 0;
  const QUESTION = /^(was|wo|wann|welche|welcher|wer|wie|zeig|find|hatte|wann hatte|what|where|which|when)\b|\?$/i;

  function render() {
    const q = $('q').value.trim();
    if (!q) { $('list').innerHTML = '<div class="empty">Dateien, Programme, Einstellungen, Verlauf – oder rechne einfach: 12*7</div>'; return; }
    let html = '', g = null;
    items.forEach((r, i) => {
      if (r.type !== g) { g = r.type; html += `<div class="grp">${GROUP[g] || g}</div>`; }
      html += `<div class="r t-${r.type} ${i === sel ? 'sel' : ''}" data-i="${i}" style="animation-delay:${Math.min(i, 12) * 18}ms"><span class="ic">${icon(r.type)}</span><div><b>${esc(r.title)}</b><small>${esc(r.sub || '')}</small></div><span class="hint">Enter ↵</span></div>`;
    });
    $('list').innerHTML = html || '<div class="empty">Nichts gefunden – drück Tab, dann sucht Kairo für dich.</div>';
    $('list').querySelectorAll('.r').forEach(el => { el.onclick = () => { sel = +el.dataset.i; go(); }; el.onmousemove = () => { if (sel !== +el.dataset.i) { sel = +el.dataset.i; mark(); } }; });
  }
  const mark = () => $('list').querySelectorAll('.r').forEach(el => el.classList.toggle('sel', +el.dataset.i === sel));

  async function query() {
    const q = $('q').value.trim(), my = ++seq;
    if (!q) { items = []; render(); return; }
    const r = await S.query(q);
    if (my !== seq) return;
    items = r.ok ? r.results : [];
    const askItem = { type: 'ask', title: 'Kairo fragen: „' + q + '“', sub: 'Im Kairo-Chat beantworten' };
    items = QUESTION.test(q) ? [askItem, ...items] : [...items, askItem];
    sel = 0; render();
  }

  const ask = () => { const q = $('q').value.trim(); if (q) S.toKairo(q); };

  function go(reveal) {
    const r = items[sel]; if (!r) return;
    if (r.type === 'ask') return ask();
    if (r.type === 'calc') { navigator.clipboard.writeText(r.raw || r.title); S.hide(); return; }
    if (reveal && r.path) return S.reveal(r.path);
    S.open(r);
  }

  $('q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(query, 110); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { S.hide(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); mark(); $('list').querySelector('.sel')?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); $('list').querySelector('.sel')?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter') { e.preventDefault(); go(e.shiftKey); }
    if (e.key === 'Tab') { e.preventDefault(); ask(); }
  });
  S.onOpen(() => { $('q').value = ''; items = []; render(); setTimeout(() => $('q').focus(), 30); });
  setTimeout(() => $('q').focus(), 50);
})();
