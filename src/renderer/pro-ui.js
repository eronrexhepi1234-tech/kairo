// Kairo Pro: one studio for the professional tools (research, sources, documents, writing coach, translator,
// presentation trainer, code assistant, dashboard, projects, exam simulator, language teacher, learning paths,
// brand kit, agent mode, memory center).
window.Pro = (function () {
  // dates and numbers in the app's language (Swiss German format for German)
  const LOC = () => { const l = window.App?.settings?.()?.language || window.APP_LANG || 'de'; return l === 'de' ? 'de-CH' : l === 'en' ? 'en-GB' : l; };
  const $p = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = s => (window.renderMarkdown ? window.renderMarkdown(String(s || '')) : esc(s));
  const K = () => window.kairo.pro;
  const err = m => (/NO_KEY/.test(m) ? 'Kein KI-Schlüssel – trag ihn in Einstellungen → KI ein.' : m);
  const toast = m => window.toast?.(m);
  const openUrl = u => window.kairo.action({ type: 'open', url: u });
  let tool = null, jobSeq = 0;
  const listeners = {};
  window.kairo.pro.onProgress(p => listeners[p.job]?.(p));
  const job = fn => { const id = 'j' + (++jobSeq); listeners[id] = fn; return id; };

  const TOOLS = [
    ['Recherche', [['research', 'telescope', 'Deep Research', 'Bericht mit Quellen'], ['sources', 'library-big', 'Quellen-Finder', 'Zitate & Literatur']]],
    ['Schreiben', [['document', 'file-text', 'Profi-Dokumente', 'Bewerbung, CV, Bericht'], ['coach', 'notebook-pen', 'Schreib-Coach', 'Text verbessern'], ['translate', 'languages', 'Dokument-Übersetzer', 'Word, PowerPoint, PDF'], ['present', 'presentation', 'Präsentation & Training', 'Folien + Vortrag üben']]],
    ['Arbeiten', [['code', 'terminal', 'Code-Assistent', 'Projekt verstehen'], ['dash', 'layout-dashboard', 'Dashboard', 'Live-Daten'], ['projects', 'kanban', 'Projekt-Manager', 'Ziele planen']]],
    ['Lernen', [['exam', 'graduation-cap', 'Prüfungs-Simulator', 'Mit Note & Plan'], ['lang', 'speech', 'Sprachlehrer', 'Gespräch üben'], ['path', 'route', 'Lernpfad', 'Tag für Tag']]],
    ['Kairo', [['brand', 'palette', 'Marken-Kit', 'Logo, Farben, Fonts'], ['agent', 'bot', 'Agent-Modus', 'Erledigt ganze Aufgaben'], ['memory', 'brain', 'Gedächtnis', 'Was Kairo weiss']]]
  ];
  const ALL = TOOLS.flatMap(g => g[1]);

  const ALIAS = { presentation: 'present', praesentation: 'present', learnpath: 'path', lernpfad: 'path', dashboard: 'dash', project: 'projects', projekt: 'projects', language: 'lang', sprache: 'lang', docs: 'document', dokument: 'document', quellen: 'sources', gedächtnis: 'memory', marke: 'brand', prüfung: 'exam' };
  function open(id, arg) {
    if (id) id = ALIAS[String(id).toLowerCase()] || String(id).toLowerCase();
    if (id && !ALL.some(x => x[0] === id)) id = 'research';
    let el = $p('proOverlay');
    if (el && el.dataset.closing) { el.remove(); el = null; }
    if (!el) {
      document.body.insertAdjacentHTML('beforeend', `<div class="xo pro" id="proOverlay"><div class="pro-wrap">
        <aside class="pro-side"><div class="pro-brand"><span>${ic('sparkles')}</span><div><small>Kairo</small><b>Pro Studio</b></div></div>
          <nav>${TOOLS.map(([g, items]) => `<h6>${g}</h6>${items.map(([k, i, n, s]) => `<button data-tool="${k}">${ic(i)}<div><b>${n}</b><small>${s}</small></div></button>`).join('')}`).join('')}</nav></aside>
        <main class="pro-main"><button class="fx-x pro-x" id="proX">✕</button><div id="proMain" class="pro-body"></div></main></div></div>`);
      el = $p('proOverlay');
      el.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => show(b.dataset.tool));
      $p('proX').onclick = close;
    }
    requestAnimationFrame(() => el.classList.add('on'));
    show(id || tool || 'research', arg);
  }
  function close() { const el = $p('proOverlay'); if (!el) return; el.dataset.closing = '1'; el.removeAttribute('id'); el.classList.remove('on'); setTimeout(() => el.remove(), 500); stopDash(); }
  function show(id, arg) {
    tool = id; stopDash();
    $p('proOverlay')?.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === id));
    const m = $p('proMain'); m.classList.remove('in'); void m.offsetWidth; m.classList.add('in'); m.scrollTop = 0;
    const t = ALL.find(x => x[0] === id);
    ({ research, sources, document: docs, coach, translate, present, code, dash, projects, exam, lang, path: lpath, brand, agent, memory })[id](m, arg, t);
  }
  const head = (t, sub) => `<header class="pro-head"><span class="pro-ic">${ic(t[1])}</span><div><h1>${esc(t[2])}</h1><p>${esc(sub)}</p></div></header>`;
  const wait = (title, sub) => `<div class="pro-wait"><div class="pro-rings"><i></i><i></i><i></i></div><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const fail = (m, retry) => { const x = `<div class="pro-fail">${ic('triangle-alert')}<b>Das hat nicht geklappt</b><small>${esc(err(m))}</small>${retry ? '<button class="btn" data-retry>Nochmal</button>' : ''}</div>`; return x; };
  const chips = (id, list, on) => `<div class="pro-chips" id="${id}">${list.map(([v, l]) => `<button data-v="${esc(v)}" class="${v === on ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  const chipVal = id => $p(id)?.querySelector('.on')?.dataset.v;
  const bindChips = (root = document) => root.querySelectorAll('.pro-chips').forEach(c => c.querySelectorAll('button').forEach(b => b.onclick = () => { c.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }));
  const fileBtns = p => `<div class="pro-out">${ic('circle-check')}<span>${esc(p.split(/[\\/]/).pop())}</span><button class="btn" data-open="${esc(p)}">${ic('external-link')} Öffnen</button><button class="btn" data-reveal="${esc(p)}">${ic('folder-open')} Ordner</button></div>`;
  const bindFiles = root => { root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => K().openPath(b.dataset.open)); root.querySelectorAll('[data-reveal]').forEach(b => b.onclick = () => K().reveal(b.dataset.reveal)); };
  async function exportBlocks(o, box) {
    box.innerHTML = '<div class="pro-mini"><span class="pro-spin"></span> Exportiere…</div>';
    const r = await K().export(o);
    box.innerHTML = r.ok ? fileBtns(r.path) : fail(r.error.message); bindFiles(box);
  }
  function blocksHtml(blocks) {
    return (blocks || []).map(b => {
      if (b.type === 'h1' || b.type === 'h2') return `<h2>${esc(b.text)}</h2>`;
      if (b.type === 'h3') return `<h3>${esc(b.text)}</h3>`;
      if (b.type === 'bullets') return `<ul>${(b.items || []).map(i => `<li>${md(i)}</li>`).join('')}</ul>`;
      if (b.type === 'numbers') return `<ol>${(b.items || []).map(i => `<li>${md(i)}</li>`).join('')}</ol>`;
      if (b.type === 'quote') return `<blockquote>${md(b.text)}</blockquote>`;
      if (b.type === 'kv') return `<dl>${(b.items || []).map(i => `<dt>${esc(i[0])}</dt><dd>${md(i[1])}</dd>`).join('')}</dl>`;
      if (b.type === 'table' && b.rows?.length) return `<table><thead><tr>${b.rows[0].map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.slice(1).map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      return b.text ? `<p>${md(b.text)}</p>` : '';
    }).join('');
  }
  const bars = (items, unit) => { const max = Math.max(...items.map(i => +i.value || 0), 1); return `<div class="pro-bars">${items.map((i, n) => `<div class="pro-bar" style="--w:${(+i.value || 0) / max * 100}%;--d:${n * 90}ms"><span>${esc(i.label)}</span><i></i><b>${esc(Number(i.value).toLocaleString(LOC()))} ${esc(unit || '')}</b></div>`).join('')}</div>`; };
  const spark = (series, w = 220, h = 56) => { if (!series?.length) return ''; const mn = Math.min(...series), mx = Math.max(...series), r = mx - mn || 1; const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - 4 - (v - mn) / r * (h - 8)}`).join(' '); const up = series[series.length - 1] >= series[0]; return `<svg class="pro-spark ${up ? 'up' : 'down'}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}"/><polygon points="0,${h} ${pts} ${w},${h}"/></svg>`; };
  const ring = (v, label) => `<div class="pro-ring" style="--v:${Math.max(0, Math.min(100, v))}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9"/><circle cx="18" cy="18" r="15.9" pathLength="100"/></svg><b>${Math.round(v)}</b><small>${esc(label)}</small></div>`;
  async function recordVoice(btn) {
    if (Voice.isListening()) { btn.classList.remove('rec'); btn.innerHTML = '<span class="pro-spin"></span>'; const t = await Voice.stopListening(); btn.innerHTML = ic('mic'); return t; }
    await Voice.startListening(); btn.classList.add('rec'); btn.innerHTML = ic('square'); return null;
  }
  async function speak(text) {
    try { const a = await window.kairo.voice.speak(text); if (!a.ok) return; const url = /L16|pcm/i.test(a.mime) ? Voice.pcmToWavUrl(a.audio, +(a.mime.match(/rate=(\d+)/) || [])[1] || 24000) : `data:${a.mime};base64,${a.audio}`; const au = new Audio(url); await au.play(); return au; } catch {}
  }

  // ================= 1 Deep research =================
  async function research(m, arg, t) {
    const hist = await K().researchList();
    m.innerHTML = `${head(t, 'Kairo durchsucht das Web zu deiner Frage, liest dutzende Quellen und schreibt einen Bericht mit Zahlen, Diagramm und Quellenangaben.')}
      <form class="pro-ask" id="rsForm"><textarea class="field" id="rsQ" rows="2" placeholder="z. B. Wie wird KI die Arbeitswelt bis 2035 verändern?"></textarea>
        <div class="pro-row">${chips('rsDepth', [['quick', 'Schnell · 4 Teilfragen'], ['deep', 'Gründlich · 7 Teilfragen']], 'deep')}<button class="btn primary pro-go">${ic('telescope')} Recherchieren</button></div></form>
      <div class="pro-sugg">${['Wie funktioniert die Energiewende in der Schweiz?', 'Welche Smartphone-Marke ist 2026 am besten?', 'Warum ist Japan so sicher?', 'Lohnt sich ein Elektroauto?'].map(s => `<button>${esc(s)}</button>`).join('')}</div>
      ${hist.items?.length ? `<h4 class="pro-h4">Frühere Recherchen</h4><div class="pro-list">${hist.items.slice(0, 8).map(h => `<button data-rid="${h.id}">${ic('file-text')}<div><b>${esc(h.title)}</b><small>${new Date(h.date).toLocaleDateString(LOC())} · ${esc(h.question)}</small></div></button>`).join('')}</div>` : ''}`;
    bindChips(m);
    $p('rsForm').onsubmit = e => { e.preventDefault(); const q = $p('rsQ').value.trim(); if (q) runResearch(m, q, chipVal('rsDepth')); };
    m.querySelectorAll('.pro-sugg button').forEach(b => b.onclick = () => runResearch(m, b.textContent, chipVal('rsDepth')));
    m.querySelectorAll('[data-rid]').forEach(b => b.onclick = async () => { const r = await K().researchGet(b.dataset.rid); if (r.report) showReport(m, r.report); });
    if (arg) runResearch(m, arg, 'deep');
  }
  async function runResearch(m, q, depth) {
    m.innerHTML = `<div class="rs-live"><small class="pro-kick">Deep Research läuft</small><h2>${esc(q)}</h2><div class="rs-steps" id="rsSteps"><div class="rs-step run"><i><span class="pro-spin"></span></i><span>Plane die Recherche…</span></div></div><div class="rs-src" id="rsSrc"></div></div>`;
    let srcCount = 0;
    const id = job(p => {
      const st = $p('rsSteps'); if (!st) return;
      if (p.step === 'questions') { st.innerHTML = `<div class="rs-step ok"><i>${ic('check')}</i><span>Recherche geplant · ${p.questions.length} Teilfragen</span></div>` + p.questions.map((x, i) => `<div class="rs-step" id="rsq${i}" style="animation-delay:${i * 80}ms"><i>${i + 1}</i><span>${esc(x)}</span><em></em></div>`).join(''); }
      if (p.step === 'search') $p('rsq' + p.i)?.classList.add('run');
      if (p.step === 'found') { const r = $p('rsq' + p.i); if (r) { r.classList.remove('run'); r.classList.add('ok'); r.querySelector('i').innerHTML = ic('check'); r.querySelector('em').textContent = p.sources + ' Quellen'; } srcCount += p.sources || 0; $p('rsSrc').innerHTML = `${ic('globe')} <b>${srcCount}</b> Quellen gelesen`; }
      if (p.step === 'write') st.insertAdjacentHTML('beforeend', `<div class="rs-step run"><i><span class="pro-spin"></span></i><span>Schreibe den Bericht…</span></div>`);
    });
    const r = await K().research({ question: q, depth }, id);
    delete listeners[id];
    if (tool !== 'research') return;
    if (!r.ok) { m.innerHTML = fail(r.error.message, true); m.querySelector('[data-retry]').onclick = () => runResearch(m, q, depth); return; }
    showReport(m, r.report);
  }
  function showReport(m, r) {
    const cite = s => md(s).replace(/\[(\d+)\]/g, (x, n) => r.sources?.[n - 1] ? `<sup><a href="${esc(r.sources[n - 1].url)}" data-ext title="${esc(r.sources[n - 1].title)}">${n}</a></sup>` : x);
    m.innerHTML = `<article class="rs-report">
      <div class="rs-top"><small class="pro-kick">Recherche-Bericht · ${new Date(r.date || Date.now()).toLocaleDateString(LOC())}</small><h1>${esc(r.title)}</h1><p class="rs-q">${esc(r.question)}</p>
        <div class="pro-actions"><button class="btn primary" data-x="pdf">${ic('file-down')} PDF</button><button class="btn" data-x="docx">${ic('file-text')} Word</button><button class="btn" id="rsNew">${ic('search')} Neue Recherche</button></div><div id="rsOut"></div></div>
      <div class="rs-summary">${ic('sparkles')}<p>${cite(r.summary)}</p></div>
      <div class="rs-keys">${(r.keyPoints || []).map((k, i) => `<div style="animation-delay:${i * 70}ms"><b>${String(i + 1).padStart(2, '0')}</b><p>${cite(k)}</p></div>`).join('')}</div>
      ${r.chart?.items?.length ? `<section class="rs-chart"><h3>${esc(r.chart.title)}</h3>${bars(r.chart.items, r.chart.unit)}</section>` : ''}
      ${(r.sections || []).map(s => `<section><h2>${esc(s.heading)}</h2>${cite(s.text)}</section>`).join('')}
      ${r.table?.rows?.length ? `<section><h3>${esc(r.table.title || '')}</h3>${blocksHtml([{ type: 'table', rows: r.table.rows }])}</section>` : ''}
      <section class="rs-concl"><h2>Fazit</h2>${cite(r.conclusion)}${r.openQuestions?.length ? `<h4>Noch offen</h4><ul>${r.openQuestions.map(q => `<li>${esc(q)}</li>`).join('')}</ul>` : ''}</section>
      ${r.sources?.length ? `<section class="rs-sources"><h2>Quellen (${r.sources.length})</h2><ol>${r.sources.map(s => `<li><a href="${esc(s.url)}" data-ext>${esc(s.title || s.url)}</a><small>${esc(s.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</small></li>`).join('')}</ol></section>` : '<p class="pro-note">Ohne Gemini gibt es keine Web-Quellen – der Bericht stammt dann aus dem Wissen der KI.</p>'}
    </article>`;
    m.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => { $p('rsOut').innerHTML = '<div class="pro-mini"><span class="pro-spin"></span> Exportiere…</div>'; const x = await K().reportExport(r, b.dataset.x); $p('rsOut').innerHTML = x.ok ? fileBtns(x.path) : fail(x.error.message); bindFiles($p('rsOut')); });
    $p('rsNew').onclick = () => show('research');
  }

  // ================= 8 Sources =================
  function sources(m, arg, t) {
    m.innerHTML = `${head(t, 'Seriöse Quellen für Vorträge und Aufsätze – mit Vertrauens-Bewertung und fertigem Literaturverzeichnis.')}
      <form class="pro-ask" id="soForm"><input class="field" id="soQ" placeholder="Thema, z. B. Klimawandel in den Alpen">
        <div class="pro-row">${chips('soStyle', [['apa', 'APA 7'], ['mla', 'MLA']], 'apa')}<button class="btn primary pro-go">${ic('library-big')} Quellen finden</button></div></form><div id="soRes"></div>`;
    bindChips(m);
    const run = async q => {
      const res = $p('soRes'); res.innerHTML = wait('Suche seriöse Quellen…', q);
      const id = job(p => { const w = res.querySelector('.pro-wait b'); if (w && p.text) w.textContent = p.text; });
      const r = await K().sources({ topic: q, style: chipVal('soStyle') }, id); delete listeners[id];
      if (!r.ok) { res.innerHTML = fail(r.error.message); return; }
      const list = r.sources;
      res.innerHTML = `<div class="pro-actions"><button class="btn primary" id="soCopy">${ic('copy')} Literaturverzeichnis kopieren</button><button class="btn" id="soPdf">${ic('file-down')} Als PDF</button><button class="btn" id="soDocx">${ic('file-text')} Als Word</button></div><div id="soOut"></div>
        <div class="so-cards">${list.map((s, i) => `<div class="so-card" style="animation-delay:${i * 60}ms"><div class="so-top"><span class="so-type">${esc(s.type || 'Quelle')}</span><span class="so-trust" title="Vertrauen">${'<i class="on"></i>'.repeat(s.trust || 3)}${'<i></i>'.repeat(5 - (s.trust || 3))}</span></div>
          <b>${esc(s.title)}</b><small>${esc(s.publisher || '')}</small><p>${esc(s.why || '')}</p><div class="so-cite"><code>${esc(s.citation)}</code><button data-c="${i}" title="Kopieren">${ic('copy')}</button></div><a href="${esc(s.url)}" data-ext>${ic('external-link')} Öffnen</a></div>`).join('')}</div>`;
      const bib = list.map(s => s.citation).sort().join('\n');
      $p('soCopy').onclick = () => { navigator.clipboard.writeText(bib); toast('Literaturverzeichnis kopiert'); };
      res.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { navigator.clipboard.writeText(list[b.dataset.c].citation); toast('Zitat kopiert'); });
      const ex = f => exportBlocks({ title: 'Quellen: ' + q, blocks: [{ type: 'h2', text: 'Literaturverzeichnis' }, { type: 'bullets', items: list.map(s => s.citation).sort() }, { type: 'h2', text: 'Wofür welche Quelle?' }, { type: 'table', rows: [['Quelle', 'Art', 'Nützlich für'], ...list.map(s => [s.title, s.type || '', s.why || ''])] }], format: f, folder: 'Quellen' }, $p('soOut'));
      $p('soPdf').onclick = () => ex('pdf'); $p('soDocx').onclick = () => ex('docx');
    };
    $p('soForm').onsubmit = e => { e.preventDefault(); const q = $p('soQ').value.trim(); if (q) run(q); };
    if (arg) { $p('soQ').value = arg; run(arg); }
  }

  // ================= 9 Documents =================
  const KINDS = [['bewerbung', 'mail', 'Bewerbung', 'Name, Stelle/Lehre, Firma, deine Stärken, Schule…'], ['lebenslauf', 'user', 'Lebenslauf', 'Name, Geburtsdatum, Schulen, Praktika, Sprachen, Hobbys…'], ['bericht', 'chart-column', 'Bericht', 'Thema, Zweck, wichtigste Punkte, Ergebnisse…'], ['anleitung', 'list-checks', 'Anleitung', 'Was soll erklärt werden, für wen…'], ['brief', 'mail', 'Formeller Brief', 'An wen, worum geht es, was willst du erreichen…'], ['protokoll', 'clipboard-list', 'Protokoll', 'Sitzung, Teilnehmer, Themen, Entscheidungen…'], ['referat', 'graduation-cap', 'Referat-Handout', 'Thema, Klasse, wichtigste Punkte…'], ['angebot', 'receipt', 'Angebot', 'Was bietest du an, für wen, Preise…']];
  function docs(m, arg, t) {
    let kind = 'bewerbung';
    m.innerHTML = `${head(t, 'Fertige Profi-Dokumente mit Design – als PDF und Word. Fehlende Angaben setzt Kairo als [Platzhalter], nichts wird erfunden.')}
      <div class="dc-kinds">${KINDS.map(([k, i, n], x) => `<button data-k="${k}" class="${x ? '' : 'on'}">${ic(i)}<b>${n}</b></button>`).join('')}</div>
      <form class="pro-ask" id="dcForm"><textarea class="field" id="dcD" rows="5" placeholder="${esc(KINDS[0][3])}"></textarea><div class="pro-row"><span class="pro-hint">${ic('lock')} Deine Daten gehen nur an deine gewählte KI.</span><button class="btn primary pro-go">${ic('wand-sparkles')} Dokument erstellen</button></div></form><div id="dcRes"></div>`;
    m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { kind = b.dataset.k; m.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x === b)); $p('dcD').placeholder = KINDS.find(k => k[0] === kind)[3]; });
    $p('dcForm').onsubmit = async e => {
      e.preventDefault(); const d = $p('dcD').value.trim(); if (!d) return toast('Schreib ein paar Angaben');
      const res = $p('dcRes'); res.innerHTML = wait('Kairo schreibt dein Dokument…');
      const r = await K().document({ kind, details: d });
      if (!r.ok) { res.innerHTML = fail(r.error.message); return; }
      const doc = r.doc;
      res.innerHTML = `<div class="dc-wrap"><div class="dc-paper"><h1>${esc(doc.title)}</h1>${blocksHtml(doc.blocks)}</div>
        <aside class="dc-side"><div class="pro-actions col"><button class="btn primary" data-f="pdf">${ic('file-down')} Als PDF</button><button class="btn" data-f="docx">${ic('file-text')} Als Word</button></div><div id="dcOut"></div>
        ${doc.tips?.length ? `<h4>${ic('lightbulb')} Noch besser machen</h4><ul>${doc.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</aside></div>`;
      res.querySelectorAll('[data-f]').forEach(b => b.onclick = () => exportBlocks({ title: doc.title, blocks: doc.blocks, format: b.dataset.f, folder: 'Dokumente' }, $p('dcOut')));
      res.scrollIntoView({ behavior: 'smooth' });
    };
    if (arg) { const k = KINDS.find(x => arg.toLowerCase().includes(x[0]) || arg.toLowerCase().includes(x[2].toLowerCase())); if (k) m.querySelector(`[data-k="${k[0]}"]`).click(); $p('dcD').value = arg; }
  }

  // ================= 10 Writing coach =================
  function coach(m, arg, t) {
    m.innerHTML = `${head(t, 'Kairo verbessert deinen Text und erklärt jede Änderung – so wirst du selbst besser.')}
      <form class="pro-ask" id="ccForm"><textarea class="field" id="ccT" rows="8" placeholder="Füge hier deinen Text ein…"></textarea>
        <div class="pro-row">${chips('ccGoal', [['Schulaufsatz', 'Aufsatz'], ['Bewerbung, professionell', 'Bewerbung'], ['E-Mail, freundlich und klar', 'E-Mail'], ['Social Media, packend', 'Social Media'], ['kurz und klar', 'Kurz & klar']], 'Schulaufsatz')}<button class="btn primary pro-go">${ic('notebook-pen')} Verbessern</button></div></form><div id="ccRes"></div>`;
    bindChips(m);
    if (arg) $p('ccT').value = arg;
    $p('ccForm').onsubmit = async e => {
      e.preventDefault(); const text = $p('ccT').value.trim(); if (text.length < 20) return toast('Der Text ist zu kurz');
      const res = $p('ccRes'); res.innerHTML = wait('Kairo liest deinen Text…');
      const r = await K().coach({ text, goal: chipVal('ccGoal') });
      if (!r.ok) { res.innerHTML = fail(r.error.message); return; }
      const x = r.result, cats = ['grammatik', 'stil', 'aufbau', 'klarheit'];
      let marked = esc(text);
      (x.changes || []).forEach((c, i) => { const b = esc(c.before || ''); if (b && marked.includes(b)) marked = marked.replace(b, `<mark data-i="${i}" class="t-${esc((c.type || '').toLowerCase())}">${b}</mark>`); });
      res.innerHTML = `<div class="cc-scores">${cats.map(c => `<div class="cc-score"><small>${c[0].toUpperCase() + c.slice(1)}</small><div class="cc-sb"><i style="width:${x.scores?.[c] || 0}%"></i><i class="after" style="width:${x.scoresAfter?.[c] || 0}%"></i></div><b>${x.scores?.[c] || 0} → ${x.scoresAfter?.[c] || 0}</b></div>`).join('')}</div>
        <div class="cc-grid"><div class="cc-col"><h4>Dein Text</h4><div class="cc-text">${marked.replace(/\n/g, '<br>')}</div></div>
          <div class="cc-col"><h4>Änderungen (${(x.changes || []).length})</h4><div class="cc-changes">${(x.changes || []).map((c, i) => `<div class="cc-ch" data-i="${i}"><span class="cc-type">${esc(c.type)}</span><div><del>${esc(c.before)}</del> → <ins>${esc(c.after)}</ins></div><small>${esc(c.why)}</small></div>`).join('')}</div></div></div>
        <div class="cc-improved"><div class="pro-row"><h4>${ic('sparkles')} Verbesserte Version</h4><button class="btn primary" id="ccCopy">${ic('copy')} Kopieren</button></div><div class="cc-text">${esc(x.improved).replace(/\n/g, '<br>')}</div></div>
        <div class="cc-tips"><div><h4>Schon gut</h4><ul>${(x.strengths || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></div><div><h4>Tipps fürs nächste Mal</h4><ul>${(x.tips || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></div></div>`;
      $p('ccCopy').onclick = () => { navigator.clipboard.writeText(x.improved); toast('Verbesserter Text kopiert'); };
      res.querySelectorAll('[data-i]').forEach(el => el.onmouseenter = () => res.querySelectorAll(`[data-i="${el.dataset.i}"]`).forEach(z => z.classList.add('hl')));
      res.querySelectorAll('[data-i]').forEach(el => el.onmouseleave = () => res.querySelectorAll('.hl').forEach(z => z.classList.remove('hl')));
      res.scrollIntoView({ behavior: 'smooth' });
    };
  }

  // ================= 12 Translator =================
  function translate(m, arg, t) {
    let file = null;
    m.innerHTML = `${head(t, 'Ganze Dokumente übersetzen. Word und PowerPoint behalten ihr Layout – Schriften, Farben, Bilder bleiben.')}
      <button class="tr-drop" id="trPick">${ic('upload')}<b>Datei wählen</b><small>.docx · .pptx · .pdf · .txt · .md</small></button>
      <label class="pro-lbl">Übersetzen nach</label>${chips('trLang', [['English', 'Englisch'], ['German', 'Deutsch'], ['French', 'Französisch'], ['Italian', 'Italienisch'], ['Spanish', 'Spanisch'], ['Albanian', 'Albanisch'], ['Turkish', 'Türkisch'], ['Portuguese', 'Portugiesisch']], 'English')}
      <button class="btn primary pro-go wide" id="trGo" disabled>${ic('languages')} Übersetzen</button><div id="trRes"></div>`;
    bindChips(m);
    $p('trPick').onclick = async () => {
      const r = await K().pickFile([{ name: 'Dokumente', extensions: ['docx', 'pptx', 'pdf', 'txt', 'md'] }]);
      if (!r.file) return; file = r.file;
      $p('trPick').classList.add('has'); $p('trPick').innerHTML = `${ic('file-text')}<b>${esc(file.split(/[\\/]/).pop())}</b><small>Andere Datei wählen</small>`; $p('trGo').disabled = false;
    };
    $p('trGo').onclick = async () => {
      if (!file) return; const res = $p('trRes'); $p('trGo').disabled = true;
      res.innerHTML = `<div class="tr-prog"><b id="trTxt">Lese das Dokument…</b><div class="pro-pbar"><i id="trBar"></i></div></div>`;
      const id = job(p => { if (p.step === 'found') $p('trTxt').textContent = `${p.total} Absätze gefunden – übersetze…`; if (p.step === 'translate' && p.total) { $p('trBar').style.width = (p.done / p.total * 100) + '%'; $p('trTxt').textContent = `Übersetze… ${p.done} / ${p.total}`; } });
      const r = await K().translate({ file, target: chipVal('trLang') }, id); delete listeners[id]; $p('trGo').disabled = false;
      res.innerHTML = r.ok ? `${fileBtns(r.path)}${r.note ? `<p class="pro-note">${esc(r.note)}</p>` : ''}` : fail(r.error.message); bindFiles(res);
    };
  }

  // ================= 13 Presentation + trainer =================
  function present(m, arg, t) {
    m.innerHTML = `${head(t, 'Kairo baut eine PowerPoint mit Sprechernotizen – danach übst du deinen Vortrag Folie für Folie und bekommst Feedback.')}
      <form class="pro-ask" id="prForm"><input class="field" id="prT" placeholder="Thema, z. B. Die Geschichte von Apple">
        <div class="pro-row"><label class="pr-n">Folien <input type="range" id="prN" min="6" max="15" value="10"><b id="prNv">10</b></label><button class="btn primary pro-go">${ic('presentation')} Präsentation erstellen</button></div></form><div id="prRes"></div>`;
    $p('prN').oninput = () => { $p('prNv').textContent = $p('prN').value; };
    $p('prForm').onsubmit = async e => {
      e.preventDefault(); const topic = $p('prT').value.trim(); if (!topic) return;
      const res = $p('prRes'); res.innerHTML = wait('Kairo baut deine Präsentation…', `${$p('prN').value} Folien`);
      const r = await K().presentation({ topic, slides: $p('prN').value });
      if (!r.ok) { res.innerHTML = fail(r.error.message); return; }
      const slides = r.data?.slides || [];
      res.innerHTML = `${fileBtns(r.path)}<div class="pr-slides">${slides.map((s, i) => `<div class="pr-slide" style="animation-delay:${i * 50}ms"><small>${i + 2}</small><b>${esc(s.title)}</b><ul>${(s.bullets || []).slice(0, 3).map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>`).join('')}</div>
        <button class="btn primary pro-go wide" id="prTrain">${ic('mic')} Vortrag üben</button>`;
      bindFiles(res);
      $p('prTrain').onclick = () => trainer(m, r.data);
    };
    if (arg) { $p('prT').value = arg; }
  }
  function trainer(m, data) {
    let i = 0, t0 = 0; const scores = [];
    const slide = () => {
      const s = data.slides[i];
      m.innerHTML = `<div class="tn-wrap"><div class="tn-top"><small class="pro-kick">Vortrag üben · Folie ${i + 1} von ${data.slides.length}</small><div class="tn-dots">${data.slides.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('')}</div></div>
        <div class="tn-slide"><h2>${esc(s.title)}</h2><ul>${(s.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>
        <details class="tn-notes"><summary>Sprechernotizen anzeigen</summary><p>${esc(s.notes || '')}</p></details>
        <div class="tn-ctl"><button class="tn-mic" id="tnMic">${ic('mic')}</button><div><b id="tnState">Drück auf das Mikrofon und erkläre die Folie</b><small id="tnTime"></small></div><button class="btn" id="tnSkip">Überspringen ${ic('chevron-right')}</button></div><div id="tnFb"></div></div>`;
      let timer = 0;
      $p('tnMic').onclick = async () => {
        const btn = $p('tnMic');
        if (!Voice.isListening()) { try { await recordVoice(btn); t0 = Date.now(); $p('tnState').textContent = 'Kairo hört zu… nochmal drücken, wenn du fertig bist'; timer = setInterval(() => { $p('tnTime') && ($p('tnTime').textContent = Math.round((Date.now() - t0) / 1000) + ' s'); }, 500); } catch (e) { toast(e.message); } return; }
        clearInterval(timer); const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
        $p('tnState').textContent = 'Werte aus…';
        const text = await recordVoice(btn);
        const fb = await K().talkFeedback({ slide: s, transcript: text || '', seconds: secs });
        if (!fb.ok) { $p('tnFb').innerHTML = fail(fb.error.message); return; }
        const f = fb.feedback; scores[i] = f.score;
        $p('tnState').textContent = 'Feedback';
        $p('tnFb').innerHTML = `<div class="tn-fb">${ring(f.score, 'Punkte')}<div class="tn-fb-main"><div class="tn-meta"><span>${ic('timer')} ${secs} s</span><span>${ic('audio-lines')} ${f.wpm} Wörter/Min ${f.wpm > 165 ? '· etwas schnell' : f.wpm && f.wpm < 100 ? '· etwas langsam' : '· gut'}</span>${f.fillers?.length ? `<span>${ic('message-circle')} Füllwörter: ${esc(f.fillers.join(', '))}</span>` : ''}</div>
          <p class="tn-good">${ic('circle-check')} ${esc(f.good)}</p>${f.missed?.length ? `<p class="tn-miss">${ic('triangle-alert')} Vergessen: ${esc(f.missed.join(' · '))}</p>` : ''}<p class="tn-tip">${ic('lightbulb')} ${esc(f.tip)}</p><blockquote>${esc(f.better)}</blockquote>
          <div class="pro-actions"><button class="btn" id="tnAgain">${ic('rotate-ccw')} Nochmal</button><button class="btn primary" id="tnNext">${i + 1 < data.slides.length ? 'Nächste Folie' : 'Auswertung'} ${ic('chevron-right')}</button></div></div></div>`;
        $p('tnAgain').onclick = slide; $p('tnNext').onclick = next;
      };
      $p('tnSkip').onclick = next;
    };
    const next = () => { i++; if (i < data.slides.length) slide(); else end(); };
    const end = () => {
      const got = scores.filter(x => x != null), avg = got.length ? got.reduce((a, b) => a + b, 0) / got.length : 0;
      m.innerHTML = `<div class="tn-end">${ring(avg, 'Durchschnitt')}<h2>${avg >= 80 ? 'Stark! Du bist bereit.' : avg >= 60 ? 'Gut – noch ein Durchgang und es sitzt.' : 'Übung macht den Meister.'}</h2>
        <div class="tn-list">${data.slides.map((s, k) => `<div><span>${esc(s.title)}</span><b>${scores[k] != null ? scores[k] : '–'}</b></div>`).join('')}</div><div class="pro-actions"><button class="btn primary" id="tnRe">${ic('rotate-ccw')} Nochmal üben</button></div></div>`;
      $p('tnRe').onclick = () => { i = 0; scores.length = 0; slide(); };
    };
    slide();
  }

  // ================= 15 Code assistant =================
  let codeHist = [];
  function code(m, arg, t) {
    m.innerHTML = `${head(t, 'Öffne einen Projekt-Ordner: Kairo versteht das ganze Projekt, findet Fehler und beantwortet Fragen. Kairo liest nur – es ändert nie deine Dateien.')}
      <button class="tr-drop" id="cdOpen">${ic('folder-open')}<b>Projekt-Ordner öffnen</b><small>JavaScript, Python, C#, Lua, HTML, Java, …</small></button><div id="cdRes"></div>`;
    $p('cdOpen').onclick = async () => {
      const r = await K().codeOpen(); if (!r.ok) return toast(err(r.error.message)); if (r.canceled) return;
      codeHist = [];
      m.innerHTML = `<div class="cd-wrap"><aside class="cd-tree"><div class="cd-proj">${ic('folder-open')}<b>${esc(r.name)}</b><small>${r.files.length} Dateien</small></div><input class="field" id="cdFilter" placeholder="Datei suchen…"><div class="cd-files" id="cdFiles"></div></aside>
        <section class="cd-main"><div class="cd-tabs"><button class="on" data-ct="review">${ic('scan-search')} Analyse</button><button data-ct="chat">${ic('message-circle')} Fragen</button><button data-ct="file" id="cdFileTab" hidden>${ic('file-text')} <span></span></button></div>
          <div class="cd-pane" id="cdReview">${wait('Kairo liest das Projekt…', 'Struktur, Fehler, Verbesserungen')}</div>
          <div class="cd-pane" id="cdChat" hidden><div class="cd-msgs" id="cdMsgs"><div class="cd-msg ai">Frag mich alles zu <b>${esc(r.name)}</b> – z. B. „Wie funktioniert der Login?“, „Wo ist der Fehler bei …?“ oder „Wie baue ich Feature X ein?“</div></div><form class="cd-ask" id="cdAsk"><input class="field" id="cdQ" placeholder="Frage zum Code…"><button class="btn primary">${ic('send')}</button></form></div>
          <div class="cd-pane" id="cdFile" hidden></div></section></div>`;
      const files = r.files;
      const renderFiles = q => { $p('cdFiles').innerHTML = files.filter(f => !q || f.rel.toLowerCase().includes(q)).slice(0, 300).map(f => `<button data-f="${esc(f.rel)}" style="padding-left:${8 + (f.rel.split('/').length - 1) * 10}px">${esc(f.rel.split('/').pop())}<small>${esc(f.rel.split('/').slice(0, -1).join('/'))}</small></button>`).join(''); $p('cdFiles').querySelectorAll('[data-f]').forEach(b => b.onclick = () => openFile(b.dataset.f)); };
      renderFiles(''); $p('cdFilter').oninput = e => renderFiles(e.target.value.toLowerCase());
      const tab = k => { m.querySelectorAll('[data-ct]').forEach(b => b.classList.toggle('on', b.dataset.ct === k)); ['review', 'chat', 'file'].forEach(x => { $p('cd' + x[0].toUpperCase() + x.slice(1)).hidden = x !== k; }); };
      m.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => tab(b.dataset.ct));
      const openFile = async rel => { const x = await K().codeFile(rel); $p('cdFileTab').hidden = false; $p('cdFileTab').querySelector('span').textContent = rel.split('/').pop(); $p('cdFile').innerHTML = `<div class="cd-fhead">${esc(rel)}<button class="btn" id="cdAskFile">${ic('message-circle')} Erklär mir diese Datei</button></div><pre class="cd-code">${(x.text || '').split('\n').map((l, n) => `<span><i>${n + 1}</i>${esc(l)}</span>`).join('\n')}</pre>`; tab('file'); $p('cdAskFile').onclick = () => { tab('chat'); askCode(`Erkläre mir die Datei ${rel}: was sie macht, wie sie aufgebaut ist und was man verbessern könnte.`); }; };
      const askCode = async q => {
        const box = $p('cdMsgs'); box.insertAdjacentHTML('beforeend', `<div class="cd-msg me">${esc(q)}</div><div class="cd-msg ai" id="cdPend"><span class="pro-spin"></span> Kairo liest den Code…</div>`); box.scrollTop = box.scrollHeight;
        const x = await K().codeAsk({ question: q, history: codeHist }); $p('cdPend')?.remove();
        const a = x.ok ? x.answer : '✕ ' + err(x.error.message); codeHist.push({ role: 'user', text: q }, { role: 'ai', text: a });
        box.insertAdjacentHTML('beforeend', `<div class="cd-msg ai md">${md(a)}</div>`); box.scrollTop = box.scrollHeight;
      };
      $p('cdAsk').onsubmit = e => { e.preventDefault(); const q = $p('cdQ').value.trim(); if (q) { $p('cdQ').value = ''; askCode(q); } };
      const rv = await K().codeAnalyze();
      if (!rv.ok) { $p('cdReview').innerHTML = fail(rv.error.message); return; }
      const v = rv.review, sc = v.score || {};
      $p('cdReview').innerHTML = `<div class="cd-hero"><div><h2>${esc(v.name || r.name)}</h2><p>${esc(v.what)}</p><div class="cd-stack">${(v.stack || []).map(s => `<span>${esc(s)}</span>`).join('')}</div></div><div class="cd-rings">${ring(sc.code || 0, 'Code')}${ring(sc.structure || 0, 'Struktur')}${ring(sc.security || 0, 'Sicherheit')}${ring(sc.docs || 0, 'Doku')}</div></div>
        <h3>Gefundene Probleme</h3><div class="cd-issues">${(v.issues || []).map((x, k) => `<div class="cd-issue sev-${esc(x.severity)}" style="animation-delay:${k * 60}ms"><div class="cd-it"><span>${esc(x.severity)}</span><button class="cd-link" data-f="${esc(x.file)}">${esc(x.file)}${x.line ? ':' + x.line : ''}</button></div><b>${esc(x.problem)}</b><div class="md">${md(x.fix)}</div></div>`).join('')}</div>
        <div class="cd-two"><div><h3>Aufbau</h3><div class="cd-struct">${(v.structure || []).map(s => `<div><code>${esc(s.path)}</code><span>${esc(s.role)}</span></div>`).join('')}</div></div><div><h3>Verbesserungen</h3><ul>${(v.improvements || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul><h3>Nächste Schritte</h3><ol>${(v.nextSteps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol></div></div>`;
      $p('cdReview').querySelectorAll('.cd-link').forEach(b => b.onclick = () => files.some(f => f.rel === b.dataset.f) && openFile(b.dataset.f));
    };
  }

  // ================= 23 Dashboard =================
  let dashTimer = 0, clockTimer = 0;
  function stopDash() { clearInterval(dashTimer); clearInterval(clockTimer); }
  const DEF_DASH = () => [{ type: 'clock', title: 'Zeit' }, { type: 'weather', title: 'Wetter', city: window.App?.settings()?.city || 'Zürich' }, { type: 'crypto', title: 'Bitcoin', coin: 'bitcoin', currency: 'chf' }, { type: 'fx', title: 'Euro → Franken', from: 'EUR', to: 'CHF' }, { type: 'projects', title: 'Projekte' }, { type: 'learn', title: 'Lernpfade' }, { type: 'wiki', title: 'Heute in der Geschichte' }];
  const WMO = c => c === 0 ? ['sun', 'Sonnig'] : c < 3 ? ['cloud-sun', 'Leicht bewölkt'] : c < 50 ? ['cloud', 'Bewölkt'] : c < 70 ? ['cloud-rain', 'Regen'] : c < 80 ? ['snowflake', 'Schnee'] : c < 90 ? ['cloud-rain', 'Schauer'] : ['zap', 'Gewitter'];
  async function dash(m, arg, t) {
    let widgets = (await K().dashGet()).widgets || DEF_DASH();
    m.innerHTML = `${head(t, 'Deine Live-Daten auf einen Blick. Aktualisiert sich alle 5 Minuten.')}
      <form class="pro-ask slim" id="dbForm"><input class="field" id="dbQ" placeholder="Beschreib dein Dashboard, z. B. „Ethereum in Franken, Wetter in Tirana und Dollar zu Franken“"><button class="btn primary">${ic('wand-sparkles')} Bauen</button></form>
      <div class="db-grid" id="dbGrid"></div><div class="pro-actions"><button class="btn" id="dbReset">${ic('rotate-ccw')} Standard</button><button class="btn" id="dbRef">${ic('refresh-cw')} Aktualisieren</button></div>`;
    const save = () => K().dashSave(widgets);
    const render = () => {
      $p('dbGrid').innerHTML = widgets.map((w, i) => `<div class="db-w db-${w.type}" data-i="${i}" style="animation-delay:${i * 60}ms"><div class="db-h"><b>${esc(w.title || w.type)}</b><button data-del="${i}" title="Entfernen">✕</button></div><div class="db-b" id="dbw${i}"><span class="pro-spin"></span></div></div>`).join('');
      $p('dbGrid').querySelectorAll('[data-del]').forEach(b => b.onclick = () => { widgets.splice(+b.dataset.del, 1); save(); render(); });
      widgets.forEach((w, i) => fill(w, i));
      clearInterval(clockTimer); clockTimer = setInterval(() => widgets.forEach((w, i) => (w.type === 'clock' || w.type === 'countdown') && fill(w, i)), 1000);
    };
    const fill = async (w, i) => {
      const box = $p('dbw' + i); if (!box) return;
      if (w.type === 'clock') { const d = new Date(); const tz = w.tz; const time = d.toLocaleTimeString(LOC(), { timeZone: tz || undefined, hour: '2-digit', minute: '2-digit', second: '2-digit' }); box.innerHTML = `<div class="db-big mono">${time}</div><small>${esc(w.city || d.toLocaleDateString(LOC(), { weekday: 'long', day: 'numeric', month: 'long' }))}</small>`; return; }
      if (w.type === 'countdown') { const ms = new Date(w.date) - Date.now(); const dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4); box.innerHTML = ms > 0 ? `<div class="db-big">${dd}<small>T</small> ${hh}<small>h</small> ${mm}<small>m</small></div><small>bis ${esc(new Date(w.date).toLocaleDateString(LOC()))}</small>` : '<div class="db-big">Heute!</div>'; return; }
      if (w.type === 'note') { box.innerHTML = `<p>${esc(w.text)}</p>`; return; }
      const r = await K().dashData(w);
      if (!r.ok) { box.innerHTML = `<small class="db-err">${esc(r.error.message)}</small>`; return; }
      const d = r.data;
      if (w.type === 'weather') { const [icn, txt] = WMO(d.now.weather_code); box.innerHTML = `<div class="db-wx">${ic(icn)}<div class="db-big">${Math.round(d.now.temperature_2m)}°</div><div><b>${esc(d.place)}</b><small>${txt} · Wind ${Math.round(d.now.wind_speed_10m)} km/h</small></div></div>${spark(d.hourly)}<div class="db-days">${d.daily.time.slice(1, 6).map((x, k) => `<span><small>${new Date(x).toLocaleDateString(LOC(), { weekday: 'short' })}</small>${ic(WMO(d.daily.weather_code[k + 1])[0])}<b>${Math.round(d.daily.temperature_2m_max[k + 1])}°</b></span>`).join('')}</div>`; }
      if (w.type === 'crypto') box.innerHTML = `<div class="db-big">${Number(d.price).toLocaleString(LOC(), { maximumFractionDigits: 2 })} <small>${d.currency}</small></div><span class="db-ch ${d.change >= 0 ? 'up' : 'down'}">${d.change >= 0 ? '▲' : '▼'} ${Math.abs(d.change || 0).toFixed(2)} % · 24 h</span>${spark(d.series)}<small>7 Tage</small>`;
      if (w.type === 'fx') box.innerHTML = `<div class="db-big">${Number(d.rate).toFixed(4)}</div><small>1 ${d.from} = ${Number(d.rate).toFixed(4)} ${d.to}</small>${spark(d.series)}<small>30 Tage</small>`;
      if (w.type === 'projects') box.innerHTML = d.projects.length ? d.projects.slice(0, 4).map(p => `<div class="db-prog"><span>${esc(p.name)}</span><div><i style="width:${p.total ? p.done / p.total * 100 : 0}%"></i></div><b>${p.done}/${p.total}</b></div>`).join('') : '<small>Noch keine Projekte – starte eins im Projekt-Manager.</small>';
      if (w.type === 'learn') box.innerHTML = d.paths.length ? d.paths.slice(0, 4).map(p => `<div class="db-prog"><span>${esc(p.title)}</span><div><i style="width:${p.total ? p.done / p.total * 100 : 0}%"></i></div><b>Tag ${p.done}/${p.total}</b></div>`).join('') : '<small>Noch kein Lernpfad.</small>';
      if (w.type === 'wiki') box.innerHTML = d.items.map(x => `<div class="db-hist"><b>${x.year}</b><span>${esc(x.text)}</span></div>`).join('');
    };
    render();
    dashTimer = setInterval(() => widgets.forEach((w, i) => !['clock', 'countdown', 'note'].includes(w.type) && fill(w, i)), 5 * 60e3);
    $p('dbRef').onclick = () => widgets.forEach((w, i) => fill(w, i));
    $p('dbReset').onclick = () => { widgets = DEF_DASH(); save(); render(); };
    $p('dbForm').onsubmit = async e => { e.preventDefault(); const q = $p('dbQ').value.trim(); if (!q) return; const b = e.target.querySelector('button'); b.disabled = true; const r = await K().dashFromText(q); b.disabled = false; if (!r.ok || !r.widgets?.length) return toast('✕ ' + err(r.error?.message || 'Nichts verstanden')); widgets = [...r.widgets, ...widgets.filter(w => w.type === 'clock')].slice(0, 12); $p('dbQ').value = ''; save(); render(); };
    if (arg) { $p('dbQ').value = arg; $p('dbForm').requestSubmit(); }
  }

  // ================= 26 Projects =================
  async function projects(m, arg, t, openId) {
    const r = await K().projects(); const list = r.items || [];
    m.innerHTML = `${head(t, 'Grosses Ziel → Meilensteine, Aufgaben, Fortschritt. Kairo coacht dich bis zum Ziel.')}
      <form class="pro-ask" id="pjForm"><input class="field" id="pjG" placeholder="Dein Ziel, z. B. Einen YouTube-Kanal mit 1000 Abos aufbauen"><div class="pro-row"><label class="pro-date">Bis wann? <input type="date" id="pjD" class="field"></label><button class="btn primary pro-go">${ic('kanban')} Plan erstellen</button></div></form>
      <div id="pjRes">${list.length ? `<div class="pj-cards">${list.map(p => { const all = p.milestones.flatMap(x => x.tasks), d = all.filter(x => x.done).length; return `<button class="pj-card" data-p="${p.id}">${ring(all.length ? d / all.length * 100 : 0, '%')}<div><b>${esc(p.name)}</b><small>${d}/${all.length} Aufgaben${p.deadline ? ' · bis ' + new Date(p.deadline).toLocaleDateString(LOC()) : ''}</small></div></button>`; }).join('')}</div>` : ''}</div>`;
    $p('pjForm').onsubmit = async e => { e.preventDefault(); const g = $p('pjG').value.trim(); if (!g) return; $p('pjRes').innerHTML = wait('Kairo plant dein Projekt…'); const x = await K().projectNew({ goal: g, deadline: $p('pjD').value }); if (!x.ok) { $p('pjRes').innerHTML = fail(x.error.message); return; } board(m, x.project); };
    m.querySelectorAll('[data-p]').forEach(b => b.onclick = () => board(m, list.find(p => p.id === b.dataset.p)));
    if (arg) { $p('pjG').value = arg; $p('pjForm').requestSubmit(); }
  }
  function board(m, p) {
    const all = () => p.milestones.flatMap(x => x.tasks);
    const pct = () => { const a = all(); return a.length ? a.filter(x => x.done).length / a.length * 100 : 0; };
    m.innerHTML = `<div class="pj-top"><button class="btn" id="pjBack">${ic('chevron-left')} Alle Projekte</button><div class="pro-actions"><button class="btn" id="pjCoach">${ic('sparkles')} Coach fragen</button><button class="btn" id="pjDel">${ic('trash-2')}</button></div></div>
      <div class="pj-hero"><div id="pjRing">${ring(pct(), '%')}</div><div><h1>${esc(p.name)}</h1><p>${esc(p.why || p.goal)}</p>${p.firstStep ? `<div class="pj-first">${ic('zap')}<span><b>Heute in 15 Min:</b> ${esc(p.firstStep)}</span></div>` : ''}</div></div><div id="pjCoachBox"></div>
      <div class="pj-road">${p.milestones.map((ms, mi) => `<div class="pj-ms" style="animation-delay:${mi * 80}ms"><div class="pj-dot"></div><div class="pj-mh"><b>${esc(ms.title)}</b><small>${ms.due ? new Date(ms.due).toLocaleDateString(LOC()) : ''}</small></div>
        ${ms.tasks.map(tk => `<label class="pj-task ${tk.done ? 'done' : ''}"><input type="checkbox" data-t="${tk.id}" ${tk.done ? 'checked' : ''}><span>${esc(tk.title)}</span><small>${tk.min ? tk.min + ' Min' : ''}</small></label>`).join('')}</div>`).join('')}</div>
      ${p.risks?.length ? `<div class="pj-risk"><h4>${ic('triangle-alert')} Risiken</h4><ul>${p.risks.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}`;
    $p('pjBack').onclick = () => show('projects');
    $p('pjDel').onclick = async () => { if (!confirm('Projekt löschen?')) return; await K().projectDelete(p.id); show('projects'); };
    $p('pjCoach').onclick = async () => { $p('pjCoachBox').innerHTML = '<div class="pro-mini"><span class="pro-spin"></span> Coach denkt nach…</div>'; const x = await K().projectCoach(p.id); $p('pjCoachBox').innerHTML = `<div class="pj-coach md">${x.ok ? md(x.text) : esc(err(x.error.message))}</div>`; };
    m.querySelectorAll('[data-t]').forEach(c => c.onchange = () => {
      const tk = all().find(x => x.id === c.dataset.t); tk.done = c.checked; c.closest('.pj-task').classList.toggle('done', c.checked);
      $p('pjRing').innerHTML = ring(pct(), '%'); K().projectSave(p);
      if (c.checked && pct() === 100) { window.Party?.fireworks?.('Projekt geschafft!', p.name, 6000); }
    });
  }

  // ================= 32 Exam simulator =================
  async function exam(m, arg, t) {
    const h = await K().examHistory();
    m.innerHTML = `${head(t, 'Eine echte Prüfung mit Zeitlimit. Kairo korrigiert, gibt dir eine Note (1–6) und sagt dir genau, was du üben musst.')}
      <form class="pro-ask" id="exForm"><div class="ex-row"><input class="field" id="exS" placeholder="Fach, z. B. Mathe"><input class="field" id="exT" placeholder="Thema, z. B. Lineare Funktionen"></div>
        <div class="pro-row">${chips('exL', [['Primarschule', 'Primar'], ['Sekundarstufe 1', 'Sek'], ['Gymnasium', 'Gymi'], ['Berufsschule', 'Berufsschule']], 'Sekundarstufe 1')}${chips('exN', [['6', '6 Fragen'], ['10', '10 Fragen'], ['15', '15 Fragen']], '10')}<button class="btn primary pro-go">${ic('graduation-cap')} Prüfung starten</button></div></form>
      ${h.items?.length ? `<h4 class="pro-h4">Deine Prüfungen</h4><div class="ex-hist">${h.items.slice(0, 8).map(x => `<div><b class="g${Math.floor(x.grade)}">${x.grade.toFixed(2).replace(/0$/, '')}</b><span>${esc(x.title)}</span><small>${new Date(x.date).toLocaleDateString(LOC())} · ${x.got}/${x.max} P.</small></div>`).join('')}</div>` : ''}`;
    bindChips(m);
    $p('exForm').onsubmit = async e => {
      e.preventDefault(); const s = $p('exS').value.trim(), tp = $p('exT').value.trim(); if (!s || !tp) return toast('Fach und Thema eingeben');
      m.innerHTML = wait('Kairo erstellt deine Prüfung…', `${s} · ${tp}`);
      const r = await K().examMake({ subject: s, topic: tp, level: chipVal('exL') || 'Sekundarstufe 1', count: chipVal('exN') || 10 });
      if (!r.ok) { m.innerHTML = fail(r.error.message); return; }
      runExam(m, r.exam);
    };
    if (arg) {
      // "Übungsprüfung Mathe über Brüche" -> Fach: Mathe, Thema: Brüche
      const SUBJ = ['Mathe', 'Mathematik', 'Deutsch', 'Englisch', 'Französisch', 'Italienisch', 'Spanisch', 'Geschichte', 'Geografie', 'Geographie', 'Biologie', 'Chemie', 'Physik', 'NMG', 'Informatik', 'Wirtschaft', 'Musik', 'Religion', 'Ethik', 'Latein'];
      const subj = SUBJ.find(x => new RegExp('(^|[^\\p{L}])' + x + '($|[^\\p{L}])', 'iu').test(arg));
      let topic = (arg.match(/(?:über|zum thema|zu|thema)\s+(.+?)[?.!]*$/i) || [])[1] || arg.replace(/übungsprüfung|probeprüfung|prüfung|probetest|übungstest|\btest\b|mach(e)?|mir|eine?n?|bitte|in|simulier(en)?|starte?n?|kairo,?/gi, ' ');
      if (subj) { $p('exS').value = subj; topic = topic.replace(new RegExp(subj, 'i'), ' '); }
      $p('exT').value = topic.replace(/\s+/g, ' ').trim();
    }
  }
  function runExam(m, ex) {
    const answers = {}; let left = ex.minutes * 60;
    const max = ex.questions.reduce((a, q) => a + q.points, 0);
    m.innerHTML = `<div class="ex-bar"><div><small class="pro-kick">${esc(ex.subject)} · ${max} Punkte</small><b>${esc(ex.title)}</b></div><div class="ex-time" id="exTime">${fmt(left)}</div><button class="btn primary" id="exDone">Abgeben</button></div>
      <div class="ex-qs">${ex.questions.map((q, i) => `<div class="ex-q" style="animation-delay:${i * 50}ms"><div class="ex-qh"><span>${i + 1}</span><small>${q.points} P. · ${esc(q.topic || '')}</small></div><p>${md(q.q)}</p>
        ${q.type === 'mc' ? `<div class="ex-opts">${(q.options || []).map((o, k) => `<label><input type="radio" name="q${i}" value="${k}"><span>${'ABCD'[k]}</span>${esc(o)}</label>`).join('')}</div>` : `<textarea class="field" data-q="${i}" rows="${q.type === 'calc' ? 4 : 2}" placeholder="${q.type === 'calc' ? 'Rechenweg und Ergebnis…' : 'Deine Antwort…'}"></textarea>`}</div>`).join('')}</div>`;
    m.querySelectorAll('input[type=radio]').forEach(r => r.onchange = () => { answers[+r.name.slice(1)] = +r.value; });
    m.querySelectorAll('textarea[data-q]').forEach(tx => tx.oninput = () => { answers[+tx.dataset.q] = tx.value; });
    const timer = setInterval(() => { left--; const el = $p('exTime'); if (!el) return clearInterval(timer); el.textContent = fmt(left); el.classList.toggle('low', left < 60); if (left <= 0) { clearInterval(timer); toast('Zeit ist um!'); submit(); } }, 1000);
    const submit = async () => {
      clearInterval(timer);
      m.innerHTML = wait('Kairo korrigiert…');
      const r = await K().examGrade({ exam: ex, answers });
      if (!r.ok) { m.innerHTML = fail(r.error.message); return; }
      const g = r.grade;
      m.innerHTML = `<div class="ex-result"><div class="ex-grade g${Math.floor(g)}"><small>Note</small><b>${g.toFixed(2).replace(/0$/, '')}</b><span>${r.got} / ${r.max} Punkte</span></div><div><h2>${g >= 5.5 ? 'Hervorragend!' : g >= 4.5 ? 'Gut gemacht!' : g >= 4 ? 'Bestanden.' : 'Noch nicht ganz – du schaffst das.'}</h2>${r.plan ? `<div class="ex-plan md"><h4>${ic('target')} Dein Übungsplan</h4>${md(r.plan)}</div>` : ''}</div></div>
        <div class="ex-qs">${ex.questions.map((q, i) => { const x = r.results[i]; return `<div class="ex-q ${x.ok ? 'ok' : 'bad'}"><div class="ex-qh"><span>${i + 1}</span><small>${x.points}/${x.max} P.</small></div><p>${md(q.q)}</p><div class="ex-yours"><small>Deine Antwort</small>${q.type === 'mc' ? esc(q.options?.[answers[i]] ?? '–') : esc(answers[i] || '–')}</div><div class="ex-fb">${esc(x.feedback || '')}</div><details><summary>Musterlösung</summary>${md(q.answer || '')}</details></div>`; }).join('')}</div>
        <div class="pro-actions"><button class="btn primary" id="exAgain">${ic('rotate-ccw')} Neue Prüfung</button></div>`;
      $p('exAgain').onclick = () => show('exam');
    };
    $p('exDone').onclick = () => { if (Object.keys(answers).length < ex.questions.length && !confirm('Noch nicht alle Fragen beantwortet. Trotzdem abgeben?')) return; submit(); };
  }
  const fmt = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

  // ================= 33 Language teacher =================
  function lang(m, arg, t) {
    m.innerHTML = `${head(t, 'Sprich mit deinem KI-Lehrer. Er antwortet mit Stimme, korrigiert deine Fehler und passt sich deinem Niveau an.')}
      <label class="pro-lbl">Sprache</label>${chips('lgL', [['English', 'Englisch'], ['French', 'Französisch'], ['Spanish', 'Spanisch'], ['Italian', 'Italienisch'], ['German', 'Deutsch'], ['Albanian', 'Albanisch'], ['Japanese', 'Japanisch']], 'English')}
      <label class="pro-lbl">Niveau</label>${chips('lgN', [['A1', 'A1 Anfänger'], ['A2', 'A2'], ['B1', 'B1'], ['B2', 'B2'], ['C1', 'C1 Profi']], 'A2')}
      <label class="pro-lbl">Situation</label>${chips('lgS', [['free conversation about hobbies and everyday life', 'Smalltalk'], ['ordering in a restaurant', 'Restaurant'], ['travelling: airport, hotel, asking for directions', 'Reisen'], ['shopping for clothes', 'Shopping'], ['job interview for an apprenticeship', 'Vorstellungsgespräch'], ['talking about video games and sports', 'Gaming & Sport']], 'free conversation about hobbies and everyday life')}
      <button class="btn primary pro-go wide" id="lgGo">${ic('speech')} Gespräch starten</button>`;
    bindChips(m);
    $p('lgGo').onclick = () => talk(m, { language: chipVal('lgL'), level: chipVal('lgN'), scenario: chipVal('lgS') });
    if (arg) { const l = [['englisch', 'English'], ['franz', 'French'], ['spanisch', 'Spanish'], ['italien', 'Italian'], ['japan', 'Japanese'], ['albanisch', 'Albanian']].find(x => arg.toLowerCase().includes(x[0])); if (l) { $p('lgL').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === l[1])); } }
  }
  function talk(m, cfg) {
    const history = []; let audio = null, mute = false;
    m.innerHTML = `<div class="lg-wrap"><div class="lg-top"><div><small class="pro-kick">${esc(cfg.language)} · ${esc(cfg.level)}</small><b>Sprachlehrer</b></div><div class="pro-actions"><button class="btn" id="lgMute">${ic('volume-2')}</button><button class="btn" id="lgEnd">Beenden</button></div></div>
      <div class="lg-msgs" id="lgMsgs"></div><div class="lg-words" id="lgWords"></div>
      <form class="lg-in" id="lgIn"><button type="button" class="tn-mic" id="lgMic">${ic('mic')}</button><input class="field" id="lgT" placeholder="Sprich oder schreib auf ${esc(cfg.language)}…"><button class="btn primary">${ic('send')}</button></form></div>`;
    const words = new Map();
    const say = async text => {
      const box = $p('lgMsgs');
      if (text) { history.push({ role: 'user', text }); box.insertAdjacentHTML('beforeend', `<div class="lg-msg me" id="lgLast"><p>${esc(text)}</p></div>`); }
      box.insertAdjacentHTML('beforeend', '<div class="lg-msg ai" id="lgPend"><span class="pro-spin"></span></div>'); box.scrollTop = box.scrollHeight;
      const r = await K().langTalk({ ...cfg, history, text }); $p('lgPend')?.remove();
      if (!r.ok) { box.insertAdjacentHTML('beforeend', `<div class="lg-msg ai">✕ ${esc(err(r.error.message))}</div>`); return; }
      const x = r.turn; history.push({ role: 'ai', text: x.reply });
      const last = $p('lgLast'); if (last) { last.removeAttribute('id'); if (x.correction?.right && x.correction.right !== x.correction.wrong) last.insertAdjacentHTML('beforeend', `<div class="lg-corr"><del>${esc(x.correction.wrong)}</del><ins>${esc(x.correction.right)}</ins><small>${esc(x.correction.why)}</small></div>`); else if (x.praise) last.insertAdjacentHTML('beforeend', `<div class="lg-praise">${ic('circle-check')} ${esc(x.praise)}</div>`); }
      box.insertAdjacentHTML('beforeend', `<div class="lg-msg ai"><p>${esc(x.reply)}</p><button class="lg-play" title="Nochmal anhören">${ic('volume-2')}</button></div>`);
      box.lastElementChild.querySelector('.lg-play').onclick = async () => { audio?.pause(); audio = await speak(x.reply); };
      box.scrollTop = box.scrollHeight;
      (x.words || []).forEach(w => words.set(w.word, w.meaning));
      $p('lgWords').innerHTML = [...words].slice(-12).map(([w, mn]) => `<span title="${esc(mn)}"><b>${esc(w)}</b> ${esc(mn)}</span>`).join('');
      if (!mute) { audio?.pause(); audio = await speak(x.reply); }
    };
    $p('lgIn').onsubmit = e => { e.preventDefault(); const v = $p('lgT').value.trim(); if (v) { $p('lgT').value = ''; say(v); } };
    $p('lgMic').onclick = async () => { try { audio?.pause(); const txt = await recordVoice($p('lgMic')); if (txt) say(txt); } catch (e) { toast(e.message); } };
    $p('lgMute').onclick = () => { mute = !mute; audio?.pause(); $p('lgMute').innerHTML = ic(mute ? 'volume-x' : 'volume-2'); };
    $p('lgEnd').onclick = () => { audio?.pause(); show('lang'); };
    say('');
  }

  // ================= 34 Learning path =================
  async function lpath(m, arg, t) {
    const r = await K().paths(); const list = r.items || [];
    m.innerHTML = `${head(t, 'Sag, was du lernen willst – Kairo baut einen Plan mit täglichen Lektionen, Übungen und Tests.')}
      <form class="pro-ask" id="lpForm"><input class="field" id="lpG" placeholder="z. B. Programmieren mit Python, Gitarre, Finanzen verstehen">
        <div class="pro-row">${chips('lpD', [['14', '14 Tage'], ['30', '30 Tage'], ['60', '60 Tage']], '30')}${chips('lpM', [['15', '15 Min/Tag'], ['30', '30 Min/Tag'], ['60', '60 Min/Tag']], '30')}<button class="btn primary pro-go">${ic('route')} Lernpfad bauen</button></div></form>
      <div id="lpRes">${list.length ? `<div class="pj-cards">${list.map(p => `<button class="pj-card" data-p="${p.id}">${ring((p.done || []).length / p.days.length * 100, '%')}<div><b>${esc(p.title)}</b><small>Tag ${(p.done || []).length} von ${p.days.length} · ${p.minutes} Min/Tag</small></div></button>`).join('')}</div>` : ''}</div>`;
    bindChips(m);
    $p('lpForm').onsubmit = async e => { e.preventDefault(); const g = $p('lpG').value.trim(); if (!g) return; $p('lpRes').innerHTML = wait('Kairo plant deinen Lernpfad…', 'Das dauert etwa eine Minute'); const x = await K().pathNew({ goal: g, days: chipVal('lpD'), minutes: chipVal('lpM') }); if (!x.ok) { $p('lpRes').innerHTML = fail(x.error.message); return; } pathView(m, x.path); };
    m.querySelectorAll('[data-p]').forEach(b => b.onclick = () => pathView(m, list.find(p => p.id === b.dataset.p)));
    if (arg) { $p('lpG').value = arg; }
  }
  function pathView(m, p) {
    p.done = p.done || [];
    const next = (p.days.find(d => !p.done.includes(d.day)) || p.days[0]).day;
    m.innerHTML = `<div class="pj-top"><button class="btn" id="lpBack">${ic('chevron-left')} Alle Lernpfade</button><button class="btn" id="lpDel">${ic('trash-2')}</button></div>
      <div class="pj-hero">${ring(p.done.length / p.days.length * 100, '%')}<div><h1>${esc(p.title)}</h1><p>${esc(p.why || p.goal)}</p><button class="btn primary" id="lpNext">${ic('play')} Weiter mit Tag ${next}</button></div></div>
      <div class="lp-days">${p.days.map(d => `<button class="lp-day ${p.done.includes(d.day) ? 'done' : ''} ${d.day === next ? 'next' : ''}" data-d="${d.day}"><small>Tag ${d.day}</small><b>${esc(d.title)}</b></button>`).join('')}</div>`;
    $p('lpBack').onclick = () => show('path');
    $p('lpDel').onclick = async () => { if (!confirm('Lernpfad löschen?')) return; await K().pathDelete(p.id); show('path'); };
    $p('lpNext').onclick = () => lesson(m, p, next);
    m.querySelectorAll('[data-d]').forEach(b => b.onclick = () => lesson(m, p, +b.dataset.d));
  }
  async function lesson(m, p, day) {
    const d = p.days.find(x => x.day === day);
    m.innerHTML = wait(`Tag ${day}: ${d.title}`, 'Kairo bereitet die Lektion vor…');
    const r = await K().pathLesson({ id: p.id, day });
    if (!r.ok) { m.innerHTML = fail(r.error.message); return; }
    const L = r.lesson;
    m.innerHTML = `<div class="pj-top"><button class="btn" id="lsBack">${ic('chevron-left')} Übersicht</button><small class="pro-kick">${esc(p.title)}</small></div>
      <article class="ls"><small class="pro-kick">Tag ${day} von ${p.days.length}</small><h1>${esc(d.title)}</h1><p class="ls-goal">${ic('target')} ${esc(d.goal)}</p><p class="ls-intro">${md(L.intro)}</p>
        ${(L.sections || []).map(s => `<section><h2>${esc(s.heading)}</h2><div class="md">${md(s.text)}</div></section>`).join('')}
        ${L.example ? `<section class="ls-ex"><h3>${ic('lightbulb')} Beispiel</h3><div class="md">${md(L.example)}</div></section>` : ''}
        <section><h2>Übungen</h2>${(L.exercises || []).map((x, i) => `<div class="ls-q"><b>${i + 1}. ${md(x.q)}</b><details><summary>Lösung zeigen</summary><div class="md">${md(x.answer)}</div></details></div>`).join('')}</section>
        ${L.summary ? `<section class="ls-sum"><h3>Zusammenfassung</h3><div class="md">${md(L.summary)}</div></section>` : ''}
        <div class="ls-check"><b>${ic('circle-help')} Mini-Test:</b> ${esc(d.check || '')}</div>
        <button class="btn primary pro-go wide" id="lsDone">${p.done.includes(day) ? ic('check') + ' Erledigt' : ic('check') + ' Tag ' + day + ' abschliessen'}</button></article>`;
    $p('lsBack').onclick = () => pathView(m, p);
    $p('lsDone').onclick = async () => { if (!p.done.includes(day)) p.done.push(day); await K().pathSave(p); if (p.done.length === p.days.length) window.Party?.fireworks?.('Lernpfad geschafft!', p.title, 6000); else toast(`Tag ${day} geschafft!`); pathView(m, p); };
  }

  // ================= 36 Brand kit =================
  function brand(m, arg, t) {
    m.innerHTML = `${head(t, 'Eine komplette Marke aus einer Idee: Name, Logo, Farben, Schriften, Slogans, Visitenkarte, Social-Media-Posts – und eine Website dazu.')}
      <form class="pro-ask" id="bkForm"><input class="field" id="bkQ" placeholder="z. B. Mein Gaming-Kanal über Strategiespiele, cool und modern"><div class="pro-row"><span></span><button class="btn primary pro-go">${ic('palette')} Marke erstellen</button></div></form><div id="bkRes"></div>`;
    $p('bkForm').onsubmit = async e => {
      e.preventDefault(); const q = $p('bkQ').value.trim(); if (!q) return;
      const res = $p('bkRes'); res.innerHTML = wait('Kairo entwickelt deine Marke…', 'Name, Farben, Logos – etwa eine Minute');
      const r = await K().brandKit({ idea: q });
      if (!r.ok) { res.innerHTML = fail(r.error.message); return; }
      kitView(res, r.kit);
    };
    if (arg) { $p('bkQ').value = arg; $p('bkForm').requestSubmit(); }
  }
  function kitView(res, k) {
    const col = u => (k.colors || []).find(c => c.use === u)?.hex || (k.colors || [])[0]?.hex || '#ff7a45';
    const P = col('primary'), S = col('secondary'), A = col('accent'), D = col('dark'), L = col('light');
    const ff = f => `'${f}', 'Segoe UI', sans-serif`;
    const logos = (k.logos || []).map(l => ({ ...l, svg: cleanSvg(l.svg) })).filter(l => l.svg);
    let pick = 0;
    res.innerHTML = `<div class="bk" style="--p:${P};--s:${S};--a:${A};--d:${D};--l:${L};--hf:${ff(k.fonts?.heading || 'Space Grotesk')};--bf:${ff(k.fonts?.body || 'Inter')}">
      <div class="bk-hero"><div class="bk-logo" id="bkLogo">${logos[0]?.svg || ''}</div><div><h1>${esc(k.name)}</h1><p>${esc(k.tagline)}</p></div></div>
      <div class="bk-sec"><h3>Logo-Varianten</h3><div class="bk-logos">${logos.map((l, i) => `<button class="${i ? '' : 'on'}" data-l="${i}" style="background:${esc(l.bg || D)}">${l.svg}</button>`).join('')}</div></div>
      <div class="bk-sec"><h3>Farben</h3><div class="bk-pal">${(k.colors || []).map(c => `<button data-hex="${esc(c.hex)}" style="--c:${esc(c.hex)}"><i></i><b>${esc(c.name)}</b><small>${esc(c.hex)} · ${esc(c.use)}</small></button>`).join('')}</div></div>
      <div class="bk-two"><div class="bk-sec"><h3>Schriften</h3><div class="bk-font"><div style="font-family:var(--hf)">Aa ${esc(k.fonts?.heading)}</div><p style="font-family:var(--bf)">${esc(k.fonts?.body)} – ${esc(k.story)}</p></div></div>
        <div class="bk-sec"><h3>Persönlichkeit</h3><div class="bk-tags">${[...(k.values || []), ...(k.tone || [])].map(x => `<span>${esc(x)}</span>`).join('')}</div><p class="bk-aud"><b>Zielgruppe:</b> ${esc(k.audience)}</p></div></div>
      <div class="bk-sec"><h3>Visitenkarte & Posts</h3><div class="bk-mock"><div class="bk-card"><div class="bk-card-l" id="bkCardLogo">${logos[0]?.svg || ''}</div><div><b>${esc(k.name)}</b><small>${esc(k.tagline)}</small></div></div>
        ${(k.posts || []).slice(0, 3).map((p, i) => `<div class="bk-post p${i}"><span class="bk-post-logo">${logos[0]?.svg || ''}</span><p>${esc(p)}</p><small>@${esc(String(k.name).toLowerCase().replace(/[^a-z0-9]/g, ''))}</small></div>`).join('')}</div></div>
      <div class="bk-two"><div class="bk-sec"><h3>Slogans</h3><ul>${(k.slogans || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></div><div class="bk-sec"><h3>Social-Bio</h3><div class="bk-bio">${esc(k.bio)}<button class="btn" id="bkBio">${ic('copy')}</button></div></div></div>
      <div class="pro-actions"><button class="btn primary" id="bkSave">${ic('download')} Logos als PNG speichern</button><button class="btn" id="bkPdf">${ic('file-down')} Brand-Guide PDF</button><button class="btn" id="bkWeb">${ic('globe')} Website daraus bauen</button></div><div id="bkOut"></div></div>`;
    const setLogo = i => { pick = i; res.querySelectorAll('[data-l]').forEach(b => b.classList.toggle('on', +b.dataset.l === i)); ['bkLogo', 'bkCardLogo'].forEach(id => { $p(id).innerHTML = logos[i].svg; }); res.querySelectorAll('.bk-post-logo').forEach(x => { x.innerHTML = logos[i].svg; }); };
    res.querySelectorAll('[data-l]').forEach(b => b.onclick = () => setLogo(+b.dataset.l));
    res.querySelectorAll('[data-hex]').forEach(b => b.onclick = () => { navigator.clipboard.writeText(b.dataset.hex); toast(b.dataset.hex + ' kopiert'); });
    $p('bkBio').onclick = () => { navigator.clipboard.writeText(k.bio || ''); toast('Bio kopiert'); };
    $p('bkWeb').onclick = () => { const l = logos[pick] || {}; close(); setTimeout(() => Builder.fromLogo({ name: k.name, tagline: k.tagline }, { svg: l.svg, colors: (k.colors || []).map(c => c.hex), bg: l.bg }), 400); };
    $p('bkPdf').onclick = () => exportBlocks({ title: `${k.name} – Brand Guide`, accent: P, folder: 'Marken', blocks: [{ type: 'quote', text: k.tagline }, { type: 'h2', text: 'Geschichte' }, { type: 'p', text: k.story }, { type: 'h2', text: 'Werte & Ton' }, { type: 'bullets', items: [...(k.values || []), ...(k.tone || []).map(x => 'Ton: ' + x)] }, { type: 'p', text: '**Zielgruppe:** ' + (k.audience || '') }, { type: 'h2', text: 'Farben' }, { type: 'table', rows: [['Name', 'Hex', 'Einsatz'], ...(k.colors || []).map(c => [c.name, c.hex, c.use])] }, { type: 'h2', text: 'Schriften' }, { type: 'kv', items: [['Überschriften', k.fonts?.heading || ''], ['Text', k.fonts?.body || '']] }, { type: 'h2', text: 'Slogans' }, { type: 'bullets', items: k.slogans || [] }, { type: 'h2', text: 'Social Media' }, { type: 'p', text: '**Bio:** ' + (k.bio || '') }, { type: 'bullets', items: k.posts || [] }], format: 'pdf' }, $p('bkOut'));
    $p('bkSave').onclick = async () => {
      const files = [];
      for (const [i, l] of logos.entries()) { const im = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(l.svg)); if (!im) continue; const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 1024, 1024); files.push({ name: `${k.name} Logo ${i + 1}.png`, data: c.toDataURL('image/png').split(',')[1] }); g.fillStyle = l.bg || D; g.fillRect(0, 0, 1024, 1024); g.drawImage(im, 112, 112, 800, 800); files.push({ name: `${k.name} Logo ${i + 1} mit Hintergrund.png`, data: c.toDataURL('image/png').split(',')[1] }); }
      const r = await K().saveImages({ folder: ['Marken', k.name], files });
      $p('bkOut').innerHTML = r.ok ? fileBtns(r.paths[0]) : fail(r.error.message); bindFiles($p('bkOut'));
    };
  }

  // ================= 46 Agent mode =================
  const AG_ICON = { research: 'telescope', sources: 'library-big', document: 'file-text', presentation: 'presentation', website: 'globe', app: 'app-window', explain: 'atom', project: 'kanban', learnpath: 'route', exam: 'graduation-cap', brand: 'palette' };
  function agent(m, arg, t) {
    m.innerHTML = `${head(t, 'Gib Kairo eine grosse Aufgabe. Es plant die Schritte, du gibst sie frei, und Kairo erledigt alles nacheinander – du siehst live zu.')}
      <form class="pro-ask" id="agForm"><textarea class="field" id="agQ" rows="3" placeholder="z. B. Bereite meinen Vortrag über erneuerbare Energien vor: recherchieren, Präsentation und Handout"></textarea><div class="pro-row"><span class="pro-hint">${ic('shield')} Kairo erstellt nur Dateien in deinem Kairo-Ordner. Es sendet, kauft oder löscht nichts.</span><button class="btn primary pro-go">${ic('bot')} Plan erstellen</button></div></form>
      <div class="pro-sugg">${['Bereite meinen Vortrag über Japan vor: Recherche, Präsentation, Quellen', 'Ich will eine Lehre als Informatiker: Bewerbung, Lebenslauf und Projektplan', 'Starte meinen YouTube-Kanal über Gaming: Marke, Website, Projektplan', 'Ich habe nächste Woche eine Prüfung über den Zweiten Weltkrieg: Lernpfad und Übungsprüfung'].map(s => `<button>${esc(s)}</button>`).join('')}</div><div id="agRes"></div>`;
    const plan = async q => {
      const res = $p('agRes'); res.innerHTML = wait('Kairo plant die Schritte…');
      const r = await K().agentPlan({ task: q });
      if (!r.ok) { res.innerHTML = fail(r.error.message); return; }
      const P = r.plan; P.steps = (P.steps || []).filter(s => AG_ICON[s.tool]).slice(0, 6);
      res.innerHTML = `<div class="ag-plan"><h2>${esc(P.title)}</h2><p>${esc(P.summary)}</p><div class="ag-steps">${P.steps.map((s, i) => `<div class="ag-step" id="ags${i}" style="animation-delay:${i * 80}ms"><span class="ag-n">${ic(AG_ICON[s.tool])}</span><div><b>${esc(s.title)}</b><small>${esc(s.why)}</small><div class="ag-out" id="ago${i}"></div></div><em id="agst${i}">bereit</em></div>`).join('')}</div>
        <div class="pro-actions"><button class="btn primary" id="agGo">${ic('play')} Los – alles erledigen</button><button class="btn" id="agNew">Anderer Plan</button></div></div>`;
      $p('agNew').onclick = () => plan(q);
      $p('agGo').onclick = () => runAgent(P, q);
    };
    $p('agForm').onsubmit = e => { e.preventDefault(); const q = $p('agQ').value.trim(); if (q) plan(q); };
    m.querySelectorAll('.pro-sugg button').forEach(b => b.onclick = () => { $p('agQ').value = b.textContent; plan(b.textContent); });
    if (arg) { $p('agQ').value = arg; plan(arg); }
  }
  async function runAgent(P, task) {
    $p('agGo').disabled = true; $p('agNew').disabled = true; $p('agGo').innerHTML = '<span class="pro-spin"></span> Kairo arbeitet…';
    let notes = '';
    const outs = [];
    for (const [i, s] of P.steps.entries()) {
      if (!$p('ags' + i)) return;
      const row = $p('ags' + i), st = $p('agst' + i), out = $p('ago' + i);
      row.classList.add('run'); st.innerHTML = '<span class="pro-spin"></span>';
      const [main, extra] = String(s.input || task).split('|').map(x => x.trim());
      try {
        let res = null;
        if (s.tool === 'research') { const r = await K().research({ question: main, depth: 'quick' }, job(p => { if (p.text) st.textContent = p.step === 'search' ? 'sucht…' : p.text.slice(0, 30); })); if (!r.ok) throw new Error(r.error.message); const e = await K().reportExport(r.report, 'pdf'); notes += `\nResearch "${r.report.title}": ${r.report.summary}\n${(r.report.keyPoints || []).join('\n')}`; res = { file: e.path, label: 'Bericht (PDF)', open: () => { show('research'); setTimeout(() => showReport($p('proMain'), r.report), 50); } }; }
        else if (s.tool === 'sources') { const r = await K().sources({ topic: main, style: 'apa' }, job(() => {})); if (!r.ok) throw new Error(r.error.message); const e = await K().export({ title: 'Quellen: ' + main, blocks: [{ type: 'bullets', items: r.sources.map(x => x.citation) }], format: 'pdf', folder: 'Quellen' }); res = { file: e.path, label: `${r.sources.length} Quellen (PDF)` }; }
        else if (s.tool === 'document') { const kind = (main.match(/^(bewerbung|lebenslauf|bericht|anleitung|brief|protokoll|referat|angebot)/i) || [])[1]?.toLowerCase() || 'bericht'; const ctx = notes ? (await K().agentContext({ notes })).text || '' : ''; const r = await K().document({ kind, details: `${extra || main}\nTask: ${task}\n${ctx ? 'Use these research notes:\n' + ctx : ''}` }); if (!r.ok) throw new Error(r.error.message); const e1 = await K().export({ title: r.doc.title, blocks: r.doc.blocks, format: 'pdf' }), e2 = await K().export({ title: r.doc.title, blocks: r.doc.blocks, format: 'docx' }); res = { file: e1.path, file2: e2.path, label: r.doc.title + ' (PDF + Word)' }; }
        else if (s.tool === 'presentation') { const r = await K().presentation({ topic: main, slides: +extra || 10 }); if (!r.ok) throw new Error(r.error.message); res = { file: r.path, label: `${r.title} (${r.slides} Folien)`, open: () => { show('present'); } }; }
        else if (s.tool === 'website') { const r = await window.kairo.bd.site({ idea: main, style: 'auto' }); if (!r.ok) throw new Error(r.error.message); let html = r.html; st.textContent = 'verbessert…'; const x = await window.kairo.bd.improve({ html, round: 0 }); if (x.ok) html = x.html; const sv = await window.kairo.bd.save({ html, title: r.title, kind: 'site' }); res = { file: sv.file, label: 'Website: ' + r.title, open: () => { close(); setTimeout(() => Builder.open({ tab: 'mine' }), 400); } }; }
        else if (s.tool === 'app') { const r = await window.kairo.bd.app({ idea: main }); if (!r.ok) throw new Error(r.error.message); const sv = await window.kairo.bd.save({ html: r.html, title: r.title, kind: 'app' }); res = { file: sv.file, label: 'App: ' + r.title, open: () => { close(); setTimeout(() => Builder.open({ tab: 'mine' }), 400); } }; }
        else if (s.tool === 'explain') { res = { label: 'Erklärung: ' + main, open: () => { close(); setTimeout(() => HowItWorks.open(main), 400); } }; }
        else if (s.tool === 'project') { const r = await K().projectNew({ goal: main }); if (!r.ok) throw new Error(r.error.message); res = { label: 'Projekt: ' + r.project.name, open: () => { show('projects'); setTimeout(() => board($p('proMain'), r.project), 50); } }; }
        else if (s.tool === 'learnpath') { const r = await K().pathNew({ goal: main, days: +extra || 14, minutes: 30 }); if (!r.ok) throw new Error(r.error.message); res = { label: 'Lernpfad: ' + r.path.title, open: () => { show('path'); setTimeout(() => pathView($p('proMain'), r.path), 50); } }; }
        else if (s.tool === 'exam') { const r = await K().examMake({ subject: main, topic: extra || main, level: 'Sekundarstufe 1', count: 8 }); if (!r.ok) throw new Error(r.error.message); res = { label: 'Übungsprüfung: ' + r.exam.title, open: () => runExam($p('proMain'), r.exam) }; }
        else if (s.tool === 'brand') { const r = await K().brandKit({ idea: main }); if (!r.ok) throw new Error(r.error.message); res = { label: 'Marke: ' + r.kit.name, open: () => { show('brand'); setTimeout(() => kitView($p('bkRes'), r.kit), 50); } }; }
        row.classList.remove('run'); row.classList.add('ok'); st.innerHTML = ic('check');
        outs.push(res);
        out.innerHTML = `<div class="ag-res">${res.open ? `<button class="btn" data-o="${outs.length - 1}">${ic('eye')} Ansehen</button>` : ''}${res.file ? `<button class="btn" data-open="${esc(res.file)}">${ic('external-link')} Öffnen</button><button class="btn" data-reveal="${esc(res.file)}">${ic('folder-open')}</button>` : ''}<span>${esc(res.label)}</span></div>`;
        bindFiles(out); out.querySelector('[data-o]')?.addEventListener('click', () => res.open());
      } catch (e) { row.classList.remove('run'); row.classList.add('bad'); st.innerHTML = ic('x'); out.innerHTML = `<small class="db-err">${esc(err(e.message))}</small>`; }
    }
    if ($p('agGo')) { $p('agGo').innerHTML = `${ic('circle-check')} Fertig`; $p('agNew').disabled = false; window.Party?.fireworks?.('Auftrag erledigt!', P.title, 5000); }
  }

  // ================= 48 Memory center =================
  async function memory(m, arg, t) {
    const r = await K().memList(); let items = r.items || [];
    const draw = q => {
      const f = items.filter(x => !q || x.text.toLowerCase().includes(q));
      const groups = {}; f.forEach(x => { (groups[x.cat || 'Unsortiert'] = groups[x.cat || 'Unsortiert'] || []).push(x); });
      $p('mmList').innerHTML = f.length ? Object.entries(groups).map(([g, l]) => `<div class="mm-group"><h4>${esc(g)} <small>${l.length}</small></h4>${l.map(x => `<div class="mm-item" data-id="${x.id}"><p contenteditable="true" spellcheck="false">${esc(x.text)}</p><small>${new Date(x.date).toLocaleDateString(LOC())}</small><button data-del="${x.id}" title="Vergessen">${ic('trash-2')}</button></div>`).join('')}</div>`).join('') : '<div class="pro-note">Kairo hat sich noch nichts gemerkt.</div>';
      $p('mmList').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await window.kairo.memory.remove(b.dataset.del); items = items.filter(x => x.id !== b.dataset.del); b.closest('.mm-item').classList.add('gone'); setTimeout(() => draw($p('mmQ').value.toLowerCase()), 300); upd(); });
      $p('mmList').querySelectorAll('.mm-item p').forEach(p => p.onblur = async () => { const id = p.closest('.mm-item').dataset.id, v = p.textContent.trim(), it = items.find(x => x.id === id); if (!it || v === it.text) return; if (!v) return; const x = await K().memUpdate({ id, text: v }); if (x.ok) { it.text = v; toast('Gespeichert'); } });
    };
    const upd = () => { $p('mmCount').textContent = items.length; };
    m.innerHTML = `${head(t, 'Alles, was Kairo über dich weiss – transparent. Du kannst jeden Eintrag ändern oder löschen. Gespeichert nur auf deinem PC.')}
      <div class="mm-stats"><div><b id="mmCount">${items.length}</b><small>Erinnerungen</small></div><div><b>${new Set(items.map(x => x.cat).filter(Boolean)).size}</b><small>Kategorien</small></div><div>${ic('lock')}<small>nur lokal</small></div></div>
      <div class="pro-row mm-tools"><input class="field" id="mmQ" placeholder="Suchen…"><button class="btn" id="mmSort">${ic('sparkles')} Automatisch sortieren</button><button class="btn" id="mmClear">${ic('trash-2')} Alles vergessen</button></div>
      <form class="pro-ask slim" id="mmAdd"><input class="field" id="mmNew" placeholder="Etwas, das Kairo sich merken soll, z. B. „Ich spiele Fussball beim FC Basel“"><button class="btn primary">${ic('plus')} Merken</button></form><div id="mmList"></div>`;
    draw('');
    $p('mmQ').oninput = e => draw(e.target.value.toLowerCase());
    $p('mmAdd').onsubmit = async e => { e.preventDefault(); const v = $p('mmNew').value.trim(); if (!v) return; await window.kairo.memory.add(v); $p('mmNew').value = ''; items = (await K().memList()).items || []; draw(''); upd(); };
    $p('mmSort').onclick = async () => { const b = $p('mmSort'); b.disabled = true; b.innerHTML = '<span class="pro-spin"></span> Sortiere…'; const x = await K().memSort(); b.disabled = false; b.innerHTML = `${ic('sparkles')} Automatisch sortieren`; if (x.ok) { items = x.items; draw(''); } else toast('✕ ' + err(x.error.message)); };
    $p('mmClear').onclick = async () => { if (!confirm('Wirklich ALLES vergessen, was Kairo über dich weiss?')) return; if (!confirm('Sicher? Das kann nicht rückgängig gemacht werden.')) return; await K().memClear(); items = []; draw(''); upd(); toast('Kairo hat alles vergessen'); };
  }

  return { open, close, show };
})();
