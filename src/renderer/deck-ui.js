// Stream Deck editor on the PC: the same buttons as on the phone, shown in a phone frame. Click = test, edit mode = change.
window.DeckUI = (function () {
  const $d = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // phone icon names -> Kairo (lucide) icons
  const ICON = { scan: 'scan-search', 'scan-off': 'scan-search', party: 'party-popper', cat: 'cat', music: 'music', radio: 'radio', cloud: 'cloud-rain', orbit: 'orbit', mic: 'mic', captions: 'message-circle', play: 'play', next: 'skip-forward', prev: 'skip-back', volup: 'volume-2', voldown: 'volume-1', mute: 'volume-x', app: 'app-window', lock: 'lock', camera: 'camera', speaker: 'volume-2', zap: 'zap' };
  let D = { buttons: [], catalog: [] }, editing = false;
  async function open() {
    let el = $d('dkOverlay');
    if (!el) { document.body.insertAdjacentHTML('beforeend', '<div class="xo dko" id="dkOverlay"></div>'); el = $d('dkOverlay'); }
    requestAnimationFrame(() => el.classList.add('on'));
    const r = await window.kairo.deck.get(); if (r.ok) D = r;
    el.innerHTML = `<div class="dko-wrap"><button class="fx-x dko-x" id="dkoX">✕</button>
      <aside class="dko-side"><small>Kairo</small><h2>Stream Deck</h2><p>Grosse Knöpfe auf deinem Handy, die Sachen auf dem PC machen. Öffne die Handy-App → Tab <b>Deck</b>.</p>
        <div class="dko-steps"><div><span>1</span>Handy-App öffnen (Seite <b>Handy</b> → QR-Code)</div><div><span>2</span>Unten auf <b>Deck</b> tippen</div><div><span>3</span>Knopf drücken – der PC macht es sofort</div></div>
        <button class="btn" id="dkoEdit">${ic('pencil')} Bearbeiten</button><button class="btn" id="dkoPhone">${ic('smartphone')} Handy-Seite öffnen</button>
        <div class="dko-add" id="dkoAdd" hidden><h4>Hinzufügen</h4><div id="dkoCat"></div><div class="dko-cmd"><input class="field" id="dkoCmd" placeholder="Eigener Kairo-Befehl, z. B. Mach eine Doku über Haie"><input class="field" id="dkoLbl" placeholder="Name auf dem Knopf"><button class="btn primary" id="dkoCmdAdd">${ic('plus')} Hinzufügen</button></div></div></aside>
      <section class="dko-stage"><div class="dko-phone"><div class="dko-notch"></div><div class="dko-ph"><b>Stream Deck</b><small id="dkoHint">Klick = jetzt testen</small></div><div class="dko-grid" id="dkoGrid"></div></div></section></div>`;
    $d('dkoX').onclick = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
    $d('dkoPhone').onclick = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); window.App.go('phone'); };
    $d('dkoEdit').onclick = () => { editing = !editing; $d('dkoEdit').innerHTML = editing ? `${ic('check')} Fertig` : `${ic('pencil')} Bearbeiten`; $d('dkoAdd').hidden = !editing; $d('dkoHint').textContent = editing ? '✕ löschen · Pfeile verschieben' : 'Klick = jetzt testen'; draw(); };
    $d('dkoCat').innerHTML = D.catalog.map(([g, items]) => `<h5>${esc(g)}</h5><div class="dko-cat">${items.map((it, i) => `<button data-g="${esc(g)}" data-i="${i}" style="--c:${esc(it[4])}">${ic(ICON[it[3]] || 'zap')}<span>${esc(it[2])}</span></button>`).join('')}</div>`).join('');
    $d('dkoCat').querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const it = D.catalog.find(c => c[0] === b.dataset.g)[1][+b.dataset.i]; add({ type: it[0], value: it[1], label: it[2], icon: it[3], color: it[4] }); });
    $d('dkoCmdAdd').onclick = () => { const c = $d('dkoCmd').value.trim(); if (!c) return; const cols = ['#ff7a45', '#7a5cff', '#3ddc97', '#ff4f8b', '#6ea8ff', '#ffd27a']; add({ type: 'kairo', value: c, label: $d('dkoLbl').value.trim() || c.slice(0, 18), icon: 'zap', color: cols[D.buttons.length % cols.length] }); $d('dkoCmd').value = ''; $d('dkoLbl').value = ''; };
    draw();
  }
  async function save() { const r = await window.kairo.deck.save(D.buttons); if (r.ok) D.buttons = r.buttons; }
  function add(b) { D.buttons.push({ id: 'b' + Date.now().toString(36), ...b }); draw(); save(); }
  function draw() {
    const g = $d('dkoGrid'); if (!g) return; g.classList.toggle('editing', editing);
    g.innerHTML = D.buttons.map((b, i) => `<div class="dko-b" data-i="${i}" style="--c:${esc(b.color)};animation-delay:${i * 30}ms">${ic(ICON[b.icon] || 'zap')}<b>${esc(b.label)}</b>${editing ? `<span class="dko-del" data-del="${i}">✕</span><span class="dko-mv"><span data-mv="${i}" data-d="-1">◀</span><span data-mv="${i}" data-d="1">▶</span></span>` : ''}</div>`).join('');
    g.querySelectorAll('.dko-b').forEach(el => el.onclick = async e => {
      const del = e.target.closest('[data-del]'), mv = e.target.closest('[data-mv]');
      if (del) { D.buttons.splice(+del.dataset.del, 1); draw(); save(); return; }
      if (mv) { const i = +mv.dataset.mv, j = i + +mv.dataset.d; if (j >= 0 && j < D.buttons.length) { [D.buttons[i], D.buttons[j]] = [D.buttons[j], D.buttons[i]]; draw(); save(); } return; }
      if (editing) return;
      el.classList.remove('fire'); void el.offsetWidth; el.classList.add('fire');
      const r = await window.kairo.deck.run(D.buttons[+el.dataset.i].id);
      if (!r.ok) window.toast('✕ ' + r.error.message);
    });
  }
  return { open };
})();
