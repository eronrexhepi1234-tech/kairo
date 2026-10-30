// Kairo Builder: sketch -> app, voice coding, websites with a time budget, logo -> website, idea shop,
// plus "How does it work?" explainers with an animated SVG player and video export.
const $b = id => document.getElementById(id);
const escB = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// friendlier error texts
const bdErr = m => /NO_KEY|api key|API_KEY/i.test(String(m)) ? 'Kein KI-Schlüssel gefunden – trag ihn in Einstellungen → KI ein.' : /quota|429|rate/i.test(String(m)) ? 'Die KI ist gerade überlastet – in einer Minute nochmal versuchen.' : String(m);
// text -> decoded audio buffer with Kairo's voice (null if no voice)
async function ttsBuffer(ac, text) {
  try {
    const a = await window.kairo.voice.speak(text);
    if (!a.ok) return null;
    const url = /L16|pcm/i.test(a.mime) ? Voice.pcmToWavUrl(a.audio, +(a.mime.match(/rate=(\d+)/) || [])[1] || 24000) : `data:${a.mime};base64,${a.audio}`;
    return await ac.decodeAudioData(await (await fetch(url)).arrayBuffer());
  } catch { return null; }
}

// ================= Builder =================
window.Builder = (function () {
  let tab = 'sketch', cur = null, hist = [], hi = -1, busy = false, device = 'desk', brand = null, stopReq = false, frame = null;
  const SHOP = [
    ['game', 'Spiele', 'gamepad-2', '#ff7a45', [
      ['Neon-Snake mit Power-ups', 'Snake im Neon-Look mit Power-ups, Combo-Punkten und Highscore', 'app'],
      ['Weltraum-Shooter', 'Weltraum-Shooter: Raumschiff schiesst Asteroiden, Bosse alle 5 Level, Explosionen', 'app'],
      ['Penalty-Schiessen', 'Fussball-Penaltyschiessen gegen einen KI-Torwart, zielen mit der Maus, 5 Schüsse', 'app'],
      ['Reaktions-Test', 'Reaktions-Test: Bildschirm wird grün, so schnell wie möglich klicken, Bestzeit und Rangliste', 'app'],
      ['Jump & Run', 'Kleines Jump & Run mit Plattformen, Münzen, Gegnern und 3 Levels', 'app'],
      ['Memory Deluxe', 'Memory-Spiel mit animierten Karten, Timer, Zügen und 3 Schwierigkeiten', 'app']]],
    ['app', 'Apps', 'app-window', '#7a5cff', [
      ['Lern-Karteikarten', 'Karteikarten-App: Karten erstellen, umdrehen mit 3D-Animation, Lernstatistik', 'app'],
      ['Gewohnheits-Tracker', 'Gewohnheits-Tracker mit Streaks, Kalender-Heatmap und Konfetti bei 7 Tagen', 'app'],
      ['Taschengeld-Planer', 'Taschengeld-Planer: Einnahmen, Ausgaben, Sparziel mit Fortschrittsring', 'app'],
      ['Pomodoro-Timer', 'Wunderschöner Pomodoro-Timer mit animiertem Ring, Pausen und Statistik', 'app'],
      ['Wetter-Dashboard', 'Wetter-Dashboard-Design mit animierten Wetter-Icons und 7-Tage-Ansicht (Beispieldaten)', 'app'],
      ['Musik-Player-Design', 'Musik-Player mit Visualizer, der selbst erzeugte Töne abspielt (WebAudio), Playlist', 'app']]],
    ['site', 'Websites', 'globe', '#3ddc97', [
      ['Gaming-Clan', 'Website für einen Gaming-Clan mit Mitgliedern, Turnieren und Bewerbung', 'site', 'gaming'],
      ['YouTube-Kanal', 'Website für einen YouTube-Kanal über Technik mit neuesten Videos und Merch', 'site', 'dark'],
      ['Fussball-Verein', 'Website für einen Fussballverein: Spielplan, Team, Tabelle, Mitglied werden', 'site', 'bold'],
      ['Startup-Idee', 'Landingpage für eine App-Startup-Idee mit Features, Preisen und Warteliste', 'site', 'dark'],
      ['Portfolio', 'Persönliches Portfolio eines jungen Entwicklers mit Projekten und Skills', 'site', 'light'],
      ['Restaurant', 'Website für ein modernes Restaurant mit Speisekarte, Galerie und Reservierung', 'site', 'luxury']]],
    ['tool', 'Tools', 'wrench', '#4fc3ff', [
      ['Passwort-Generator', 'Sicherer Passwort-Generator mit Stärke-Anzeige und Kopieren-Knopf', 'app'],
      ['Einheiten-Umrechner', 'Einheiten-Umrechner (Länge, Gewicht, Temperatur, Zeit) mit schönen Animationen', 'app'],
      ['Notenrechner', 'Schul-Notenrechner: Noten eingeben, Durchschnitt pro Fach, was brauche ich für eine 5', 'app'],
      ['Zufalls-Entscheider', 'Glücksrad zum Entscheiden mit eigenen Optionen und Dreh-Animation', 'app'],
      ['Farbpaletten-Maker', 'Farbpaletten-Generator: Leertaste für neue Palette, sperren, Hex kopieren', 'app'],
      ['Turnier-Baum', 'Turnier-Baum-Generator für 4-16 Spieler mit Klick auf Gewinner', 'app']]]
  ];

  function overlay() {
    let el = $b('bdOverlay');
    if (el && el.dataset.closing) { el.remove(); el = null; }
    if (!el) { document.body.insertAdjacentHTML('beforeend', '<div class="xo bd" id="bdOverlay"></div>'); el = $b('bdOverlay'); }
    requestAnimationFrame(() => el.classList.add('on'));
    return el;
  }
  function close() {
    if (busy && !confirm('Kairo arbeitet noch. Trotzdem schliessen?')) return;
    stopReq = true;
    const el = $b('bdOverlay'); if (!el) return;
    el.dataset.closing = '1'; el.removeAttribute('id'); el.classList.remove('on'); setTimeout(() => el.remove(), 500);
  }

  function open(opts = {}) {
    const el = overlay();
    if (opts.brand) brand = opts.brand;
    if (opts.tab) tab = opts.tab;
    el.innerHTML = `<div class="bd-wrap">
      <aside class="bd-side">
        <div class="bd-head"><span class="bd-logo">${ic('hammer')}</span><div><small>Kairo Builder</small><b>Bauen mit KI</b></div><button class="fx-x" id="bdX">✕</button></div>
        <nav class="bd-tabs">${[['sketch', 'pencil-ruler', 'Skizze → App'], ['site', 'globe', 'Website'], ['shop', 'store', 'Ideen-Shop'], ['mine', 'folder-open', 'Projekte']].map(([k, i, l]) => `<button data-t="${k}">${ic(i)}<span>${l}</span></button>`).join('')}<i class="bd-ind"></i></nav>
        <div class="bd-panel" id="bdPanel"></div>
      </aside>
      <section class="bd-main">
        <div class="bd-bar"><div class="bd-dots"><i></i><i></i><i></i></div><div class="bd-url" id="bdUrl">${ic('lock')} <span>kairo.local/</span><b id="bdTitle">neues-projekt</b></div>
          <div class="bd-tools"><button id="bdBack" title="Rückgängig">${ic('undo-2')}</button><button id="bdFwd" title="Wiederholen">${ic('redo-2')}</button>
            <span class="bd-sep"></span><button id="bdDesk" class="on" title="Desktop">${ic('monitor')}</button><button id="bdPhone" title="Handy">${ic('smartphone')}</button>
            <span class="bd-sep"></span><button id="bdFull" title="Vollbild">${ic('maximize-2')}</button><button id="bdOpen" title="Im Browser öffnen">${ic('external-link')}</button><button id="bdDir" title="Ordner zeigen">${ic('folder-open')}</button></div></div>
        <div class="bd-stage" id="bdStage"></div>
        <form class="bd-voice" id="bdVoice"><button type="button" class="bd-mic" id="bdMic" title="Sprechen">${ic('mic')}</button><input id="bdChange" class="field" placeholder="Sag oder schreib, was sich ändern soll – z. B. „mach den Knopf rot“" autocomplete="off"><button class="btn primary" id="bdSend">${ic('wand-sparkles')} Ändern</button></form>
      </section></div>`;
    $b('bdX').onclick = close;
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => setTab(b.dataset.t));
    $b('bdBack').onclick = () => go(-1); $b('bdFwd').onclick = () => go(1);
    $b('bdDesk').onclick = () => setDevice('desk'); $b('bdPhone').onclick = () => setDevice('phone');
    $b('bdFull').onclick = () => { const on = $b('bdStage').classList.toggle('full'); $b('bdOverlay').classList.toggle('fullstage', on); };
    $b('bdOpen').onclick = () => cur?.file && window.kairo.bd.openExternal(cur.file);
    $b('bdDir').onclick = () => cur?.file && window.kairo.bd.reveal(cur.file);
    $b('bdVoice').onsubmit = e => { e.preventDefault(); const v = $b('bdChange').value.trim(); if (v) { $b('bdChange').value = ''; change(v); } };
    $b('bdMic').onclick = mic;
    document.addEventListener('keydown', esc);
    setTab(tab);
    if (cur) show(); else emptyStage();
    if (opts.idea) { if (tab === 'site') { $b('bdIdea').value = opts.idea; if (opts.style) pickChip('bdStyle', opts.style); if (opts.start) startSite(); } else buildApp(opts.idea, null); }
  }
  function esc(e) { if (e.key === 'Escape' && $b('bdOverlay')) { if ($b('bdStage')?.classList.contains('full')) { $b('bdStage').classList.remove('full'); $b('bdOverlay').classList.remove('fullstage'); } } if (!$b('bdOverlay')) document.removeEventListener('keydown', esc); }

  function setTab(k) {
    tab = k;
    const el = $b('bdOverlay'); if (!el) return;
    const btns = [...el.querySelectorAll('[data-t]')], b = btns.find(x => x.dataset.t === k);
    btns.forEach(x => x.classList.toggle('on', x === b));
    const ind = el.querySelector('.bd-ind'); ind.style.width = b.offsetWidth + 'px'; ind.style.transform = `translateX(${b.offsetLeft - 4}px)`;
    const p = $b('bdPanel'); p.classList.remove('in'); void p.offsetWidth; p.classList.add('in');
    ({ sketch: panelSketch, site: panelSite, shop: panelShop, mine: panelMine })[k]();
  }
  function emptyStage() {
    $b('bdStage').innerHTML = `<div class="bd-empty"><div class="bd-orbit"><i></i><i></i><i></i><span>${ic('sparkles')}</span></div><b>Hier entsteht dein Projekt</b><small>Male eine Skizze, beschreib eine Website oder wähle etwas im Ideen-Shop.</small></div>`;
  }

  // ---------- sketch tab ----------
  let pad = null;
  function panelSketch() {
    $b('bdPanel').innerHTML = `<p class="bd-lead">Male grob, wie deine App aussehen soll – Kästen, Knöpfe, Text. Kairo macht daraus eine echte, funktionierende App.</p>
      <button class="bd-card-btn" id="bdPadOpen">${ic('pencil-ruler')}<div><b>Skizzenblock öffnen</b><small>Mit der Maus zeichnen oder ein Foto deiner Papier-Skizze laden</small></div></button>
      <label class="bd-lbl">Was soll es sein?</label>
      <textarea class="field" id="bdAppIdea" rows="3" placeholder="z. B. Ein Quiz über Fussball mit 10 Fragen und Punkten"></textarea>
      <button class="btn primary bd-go" id="bdAppGo">${ic('wand-sparkles')} App bauen</button>
      <div class="bd-hint">${ic('lightbulb')}<span>Tipp: Schreib Wörter in die Skizze, z. B. „Start“ auf einen Knopf – Kairo liest sie mit.</span></div>`;
    $b('bdPadOpen').onclick = openPad;
    $b('bdAppGo').onclick = () => buildApp($b('bdAppIdea').value.trim(), pad?.hasInk ? pad.image() : null);
  }
  function openPad() {
    const st = $b('bdStage');
    st.innerHTML = `<div class="bd-pad"><div class="bd-padbar">
        ${[['pen', 'pen-line', 'Stift'], ['rect', 'square', 'Kasten'], ['text', 'type', 'Text'], ['erase', 'eraser', 'Radierer']].map(([k, i, l], n) => `<button data-tool="${k}" class="${n ? '' : 'on'}" title="${l}">${ic(i)}</button>`).join('')}
        <span class="bd-sep"></span>${['#1d2230', '#ff7a45', '#7a5cff', '#3ddc97'].map((c, n) => `<button data-col="${c}" class="col ${n ? '' : 'on'}" style="--c:${c}"></button>`).join('')}
        <span class="bd-sep"></span><button id="padUndo" title="Rückgängig">${ic('undo-2')}</button><button id="padClear" title="Alles löschen">${ic('trash-2')}</button>
        <label class="bd-upl" title="Foto laden">${ic('image-up')}<input type="file" accept="image/*" id="padFile" hidden></label>
        <span class="bd-grow"></span><button class="btn primary" id="padBuild">${ic('wand-sparkles')} Daraus bauen</button></div>
      <div class="bd-paper"><canvas id="padCv" width="1400" height="900"></canvas><div class="bd-padhint" id="padHint">${ic('pen-line')} Hier zeichnen</div></div></div>`;
    const cv = $b('padCv'), g = cv.getContext('2d');
    let tool = 'pen', col = '#1d2230', drawing = false, start = null, snap = null;
    const undo = [];
    const clear = () => { g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, cv.width, cv.height); };
    clear();
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    const save = () => { undo.push(g.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 30) undo.shift(); };
    pad = { hasInk: false, image: () => cv.toDataURL('image/png').split(',')[1] };
    const ink = () => { pad.hasInk = true; $b('padHint')?.remove(); };
    st.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { tool = b.dataset.tool; st.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x === b)); cv.style.cursor = tool === 'text' ? 'text' : 'crosshair'; });
    st.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { col = b.dataset.col; st.querySelectorAll('[data-col]').forEach(x => x.classList.toggle('on', x === b)); });
    $b('padUndo').onclick = () => { const d = undo.pop(); if (d) g.putImageData(d, 0, 0); };
    $b('padClear').onclick = () => { save(); clear(); pad.hasInk = false; };
    $b('padFile').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = URL.createObjectURL(f); });
      save(); clear(); const s = Math.min(cv.width / im.width, cv.height / im.height); g.drawImage(im, (cv.width - im.width * s) / 2, (cv.height - im.height * s) / 2, im.width * s, im.height * s); ink();
    };
    $b('padBuild').onclick = () => { if (!pad.hasInk) return window.toast('Zeichne zuerst etwas'); buildApp($b('bdAppIdea')?.value.trim() || '', pad.image()); };
    cv.onpointerdown = e => {
      const [x, y] = pos(e);
      if (tool === 'text') {
        const txt = prompt('Text für die Skizze:'); if (!txt) return;
        save(); g.fillStyle = col; g.font = '600 34px "Segoe UI", sans-serif'; g.textBaseline = 'middle'; g.fillText(txt, x, y); ink(); return;
      }
      cv.setPointerCapture(e.pointerId); drawing = true; save(); start = [x, y]; snap = g.getImageData(0, 0, cv.width, cv.height);
      g.beginPath(); g.moveTo(x, y);
    };
    cv.onpointermove = e => {
      if (!drawing) return;
      const [x, y] = pos(e);
      g.lineCap = g.lineJoin = 'round';
      if (tool === 'rect') { g.putImageData(snap, 0, 0); g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.roundRect(start[0], start[1], x - start[0], y - start[1], 14); g.stroke(); }
      else { g.strokeStyle = tool === 'erase' ? '#fbfaf7' : col; g.lineWidth = tool === 'erase' ? 40 : 5; g.lineTo(x, y); g.stroke(); }
      ink();
    };
    cv.onpointerup = () => { drawing = false; };
  }
  async function buildApp(idea, image) {
    if (busy) return;
    if (!idea && !image) return window.toast('Beschreib die App oder zeichne eine Skizze');
    busy = true;
    building(image ? 'Kairo liest deine Skizze…' : 'Kairo baut deine App…', idea || 'aus deiner Skizze', ['Skizze verstehen', 'Layout entwerfen', 'Logik programmieren', 'Design polieren']);
    const r = await window.kairo.bd.app({ idea, image });
    busy = false;
    if (!r.ok) return failStage(r.error.message);
    await setCur({ html: r.html, title: r.title, kind: 'app', logo: null }, 'Gebaut');
    celebrate('App fertig!');
  }

  // ---------- website tab ----------
  function chips(id, items, on) { return `<div class="bd-chips" id="${id}">${items.map(([v, l]) => `<button data-v="${v}" class="${v === on ? 'on' : ''}">${l}</button>`).join('')}</div>`; }
  function pickChip(id, v) { $b(id)?.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(v))); }
  const chipVal = id => $b(id)?.querySelector('button.on')?.dataset.v;
  function panelSite() {
    $b('bdPanel').innerHTML = `${brand ? `<div class="bd-brand"><div class="bd-brand-logo" style="background:${escB(brand.bg || '#111')}">${brand.svg}</div><div><small>Marke vom Logo-Macher</small><b>${escB(brand.name)}</b><div class="bd-brand-cols">${(brand.colors || []).map(c => `<i style="background:${escB(c)}"></i>`).join('')}</div></div><button class="bd-brand-x" id="bdBrandX" title="Entfernen">✕</button></div>` : ''}
      <label class="bd-lbl">Worum geht es?</label>
      <textarea class="field" id="bdIdea" rows="3" placeholder="z. B. Website für meinen Minecraft-Server mit Regeln, Team und Discord-Link">${brand ? escB(`Website für ${brand.name}${brand.tagline ? ' – ' + brand.tagline : ''}`) : ''}</textarea>
      <label class="bd-lbl">Stil</label>${chips('bdStyle', [['auto', 'Kairo wählt'], ['dark', 'Dunkel & edel'], ['light', 'Hell & clean'], ['bold', 'Bunt & laut'], ['gaming', 'Gaming'], ['luxury', 'Luxus']], 'auto')}
      <label class="bd-lbl">Wie lange soll Kairo daran arbeiten?</label>${chips('bdMin', [['1', '1 Min'], ['3', '3 Min'], ['5', '5 Min'], ['10', '10 Min'], ['20', '20 Min']], '5')}
      <div class="bd-meter" id="bdMeter"></div>
      <button class="btn primary bd-go" id="bdSiteGo">${ic('rocket')} Website bauen</button>
      <div class="bd-log" id="bdLog"></div>`;
    $b('bdBrandX')?.addEventListener('click', () => { brand = null; panelSite(); });
    ['bdStyle', 'bdMin'].forEach(id => $b(id).querySelectorAll('button').forEach(b => b.onclick = () => { pickChip(id, b.dataset.v); meter(); }));
    $b('bdSiteGo').onclick = () => busy ? (stopReq = true, window.toast('Kairo macht die laufende Runde fertig…')) : startSite();
    meter();
  }
  function meter() {
    const m = +chipVal('bdMin') || 5, rounds = Math.max(0, Math.round((m * 60 - 50) / 55));
    const q = Math.min(100, 30 + rounds * 9);
    const label = m <= 1 ? 'Schneller Entwurf' : m <= 3 ? 'Gut' : m <= 5 ? 'Sehr gut' : m <= 10 ? 'Profi' : 'Meisterwerk';
    $b('bdMeter').innerHTML = `<div class="bd-meter-top"><span>Qualität</span><b>${label}</b></div><div class="bd-meter-bar"><i style="width:${q}%"></i></div><small>${rounds ? `1 Entwurf + ~${rounds} Verbesserungs-Runden` : 'Erster Entwurf (+ 1 Runde, wenn Zeit bleibt)'}</small>`;
  }
  const ROUND_NAMES = { design: 'Design verfeinern', wow: 'Hero mit Wow-Effekt', motion: 'Animationen', content: 'Mehr Inhalt', mobile: 'Handy-Ansicht', interactive: 'Interaktive Elemente', polish: 'Fehler & Feinschliff', details: 'Details & Icons' };
  async function startSite() {
    const idea = $b('bdIdea').value.trim();
    if (!idea) return window.toast('Beschreib zuerst die Website');
    if (busy) return;
    busy = true; stopReq = false;
    const budget = (+chipVal('bdMin') || 5) * 60, style = chipVal('bdStyle'), t0 = Date.now();
    const go = $b('bdSiteGo'); go.classList.add('stop'); go.innerHTML = `${ic('square')} Jetzt fertig machen`;
    const log = $b('bdLog');
    log.innerHTML = `<div class="bd-timer"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19"/><circle cx="22" cy="22" r="19" id="bdRing" pathLength="100"/></svg><div><b id="bdClock">${fmtTime(budget)}</b><small>übrig</small></div></div><ol id="bdSteps"></ol>`;
    const tick = setInterval(() => {
      const left = Math.max(0, budget - (Date.now() - t0) / 1000);
      if ($b('bdClock')) { $b('bdClock').textContent = fmtTime(left); $b('bdRing').style.strokeDashoffset = 100 - left / budget * 100; }
    }, 250);
    const step = (name, state) => { const li = document.createElement('li'); li.className = state; li.innerHTML = `<i>${state === 'run' ? '<span class="bd-spin"></span>' : ic('check')}</i><span>${escB(name)}</span>`; $b('bdSteps')?.appendChild(li); li.scrollIntoView({ block: 'nearest' }); return li; };
    const done = (li, ok, extra) => { li.className = ok ? 'ok' : 'skip'; li.querySelector('i').innerHTML = ok ? ic('check') : ic('minus'); if (extra) li.querySelector('span').textContent += ' · ' + extra; };
    let li = step('Erster Entwurf', 'run');
    building('Kairo entwirft deine Website…', idea, ['Struktur planen', 'Texte schreiben', 'Design bauen', 'Animationen']);
    const r = await window.kairo.bd.site({ idea, style, brand: brand ? { name: brand.name, tagline: brand.tagline, colors: brand.colors } : null });
    if (!r.ok) { clearInterval(tick); busy = false; resetGo(); done(li, false, 'Fehler'); return failStage(r.error.message); }
    done(li, true);
    await setCur({ html: r.html, title: r.title, kind: 'site', logo: brand?.svg || null }, 'Erster Entwurf');
    let round = 0, last = 50;
    // start another round only if it will probably finish in time
    while (!stopReq && $b('bdOverlay') && (Date.now() - t0) / 1000 + last * 0.8 < budget) {
      const key = ['design', 'wow', 'motion', 'content', 'mobile', 'interactive', 'polish', 'details'][round % 8];
      li = step(`Runde ${round + 1}: ${ROUND_NAMES[key]}`, 'run');
      scanning(true, ROUND_NAMES[key]);
      const s0 = Date.now();
      const x = await window.kairo.bd.improve({ html: cur.html, round, brand: brand ? { name: brand.name } : null });
      last = (Date.now() - s0) / 1000;
      scanning(false);
      if (!$b('bdOverlay')) break;
      if (x.ok) { done(li, true); await setCur({ ...cur, html: x.html }, ROUND_NAMES[key]); flashChip(`${ic('sparkles')} ${ROUND_NAMES[key]}`); }
      else done(li, false, 'übersprungen');
      round++;
    }
    clearInterval(tick); busy = false; resetGo();
    if ($b('bdClock')) { $b('bdClock').textContent = 'Fertig'; $b('bdRing').style.strokeDashoffset = 0; }
    step(`Fertig nach ${fmtTime((Date.now() - t0) / 1000)} · ${round} Runden`, 'ok');
    celebrate('Website fertig!');
  }
  function resetGo() { const go = $b('bdSiteGo'); if (go) { go.classList.remove('stop'); go.innerHTML = `${ic('rocket')} Website bauen`; } }

  // ---------- idea shop ----------
  function panelShop() {
    $b('bdPanel').innerHTML = `<p class="bd-lead">Fertige Startideen. Ein Klick – Kairo legt los. Danach kannst du alles per Stimme ändern.</p>
      <button class="bd-surprise" id="bdSurprise">${ic('dices')}<div><b>Überrasch mich</b><small>Kairo wählt eine zufällige Idee</small></div></button>
      ${SHOP.map(([k, l, icon, c, items]) => `<div class="bd-shelf"><h4 style="--c:${c}">${ic(icon)} ${l}</h4><div class="bd-items">${items.map(([n, d, kind, st], i) => `<button class="bd-item" style="--c:${c};animation-delay:${i * 50}ms" data-d="${escB(d)}" data-k="${kind}" data-s="${st || ''}"><b>${escB(n)}</b><small>${kind === 'site' ? 'Website' : 'App'}</small></button>`).join('')}</div></div>`).join('')}`;
    const run = b => {
      if (b.dataset.k === 'site') { setTab('site'); $b('bdIdea').value = b.dataset.d; if (b.dataset.s) pickChip('bdStyle', b.dataset.s); pickChip('bdMin', '3'); meter(); window.toast('Wähle die Zeit und drück „Website bauen“'); }
      else buildApp(b.dataset.d, null);
    };
    $b('bdPanel').querySelectorAll('.bd-item').forEach(b => b.onclick = () => run(b));
    $b('bdSurprise').onclick = () => { const all = [...$b('bdPanel').querySelectorAll('.bd-item')]; const b = all[Math.floor(Math.random() * all.length)]; b.classList.add('pick'); setTimeout(() => run(b), 600); };
  }

  // ---------- my projects ----------
  async function panelMine() {
    $b('bdPanel').innerHTML = '<div class="bd-lead">Lädt…</div>';
    const r = await window.kairo.bd.list();
    if (!$b('bdPanel') || tab !== 'mine') return;
    const items = r.ok ? r.items : [];
    $b('bdPanel').innerHTML = items.length ? `<div class="bd-mine">${items.map((p, i) => `<button data-f="${escB(p.file)}" style="animation-delay:${i * 40}ms"><span class="${p.kind}">${ic(p.kind === 'site' ? 'globe' : 'app-window')}</span><div><b>${escB(p.name)}</b><small>${p.kind === 'site' ? 'Website' : 'App'} · ${new Date(p.at).toLocaleDateString()}</small></div></button>`).join('')}</div>`
      : `<div class="bd-lead">Noch keine Projekte. Bau deine erste App oder Website!</div>`;
    $b('bdPanel').querySelectorAll('[data-f]').forEach(b => b.onclick = async () => {
      const x = await window.kairo.bd.load(b.dataset.f);
      if (!x.ok) return window.toast('✕ ' + x.error.message);
      hist = []; hi = -1;
      await setCur({ html: x.html, title: x.title, kind: x.kind, logo: x.logo, file: b.dataset.f }, 'Geladen', true);
    });
  }

  // ---------- voice coding ----------
  async function mic() {
    const b = $b('bdMic');
    if (Voice.isListening()) {
      b.classList.remove('rec'); b.innerHTML = '<span class="bd-spin"></span>';
      const text = await Voice.stopListening();
      b.innerHTML = ic('mic');
      if (text) { $b('bdChange').value = text; change(text); }
      return;
    }
    try { await Voice.startListening(); b.classList.add('rec'); b.innerHTML = ic('square'); window.toast('Sprich jetzt – nochmal klicken zum Senden'); }
    catch (e) { window.toast('✕ ' + e.message); }
  }
  async function change(text) {
    if (!cur) return window.toast('Bau zuerst eine App oder Website');
    if (busy) return window.toast('Kairo arbeitet gerade – kurz warten');
    busy = true;
    scanning(true, text);
    const r = await window.kairo.bd.edit({ html: cur.html, change: text, kind: cur.kind });
    scanning(false); busy = false;
    if (!r.ok) return window.toast('✕ ' + bdErr(r.error.message));
    await setCur({ ...cur, html: r.html }, text);
    flashChip(`${ic('wand-sparkles')} ${escB(text)}`);
  }

  // ---------- versions + preview ----------
  async function setCur(p, label, noSave) {
    if (!noSave) {
      const sv = await window.kairo.bd.save({ html: p.html, title: p.title, kind: p.kind, logo: p.logo });
      if (sv.ok) p.file = sv.file;
    }
    cur = p;
    hist = hist.slice(0, hi + 1); hist.push({ ...p, label }); hi = hist.length - 1;
    show();
  }
  function go(d) {
    if (busy) return;
    const n = hi + d; if (n < 0 || n >= hist.length) return;
    hi = n; cur = { ...hist[hi] };
    window.kairo.bd.save({ html: cur.html, title: cur.title, kind: cur.kind, logo: cur.logo });
    show(); flashChip(`${ic(d < 0 ? 'undo-2' : 'redo-2')} ${escB(hist[hi].label || 'Version ' + (hi + 1))}`);
  }
  function show() {
    const st = $b('bdStage'); if (!st || !cur) return;
    $b('bdTitle').textContent = cur.title.toLowerCase().replace(/\s+/g, '-');
    $b('bdBack').disabled = hi <= 0; $b('bdFwd').disabled = hi >= hist.length - 1;
    let html = cur.html;
    if (cur.logo) html = html.split('{{LOGO}}').join('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cur.logo));
    const old = st.querySelector('.bd-view');
    st.querySelectorAll('.bd-empty, .bd-pad, .bd-build, .bd-fail').forEach(x => x.remove());
    st.insertAdjacentHTML('beforeend', `<div class="bd-view ${device}"><iframe sandbox="allow-scripts allow-pointer-lock allow-modals" src="game-host.html"></iframe></div>`);
    const view = st.lastElementChild; frame = view.querySelector('iframe');
    const send = e => { if (e.source === frame.contentWindow && e.data?.hostReady) { frame.contentWindow.postMessage({ html }, '*'); window.removeEventListener('message', send); setTimeout(() => { view.classList.add('in'); old?.classList.add('out'); setTimeout(() => old?.remove(), 600); }, 250); } };
    window.addEventListener('message', send);
  }
  function setDevice(d) {
    device = d;
    $b('bdDesk').classList.toggle('on', d === 'desk'); $b('bdPhone').classList.toggle('on', d === 'phone');
    $b('bdStage').querySelectorAll('.bd-view').forEach(v => { v.classList.toggle('phone', d === 'phone'); v.classList.toggle('desk', d === 'desk'); });
  }
  function building(title, sub, steps) {
    const st = $b('bdStage');
    st.querySelectorAll('.bd-empty, .bd-pad, .bd-build, .bd-fail, .bd-view').forEach(x => x.remove());
    st.insertAdjacentHTML('beforeend', `<div class="bd-build"><div class="bd-code">${Array.from({ length: 18 }, (_, i) => `<i style="--w:${18 + Math.random() * 70}%;--d:${i * 0.11}s;margin-left:${(i % 4) * 18}px"></i>`).join('')}</div>
      <div class="bd-build-txt"><b>${escB(title)}</b><small>${escB(sub)}</small><ul>${steps.map((s, i) => `<li style="--d:${i * 6 + 1}s">${ic('check')} ${escB(s)}</li>`).join('')}</ul></div></div>`);
  }
  function failStage(msg) {
    const st = $b('bdStage'); if (!st) return;
    st.querySelectorAll('.bd-build').forEach(x => x.remove());
    if (!st.querySelector('.bd-view')) st.insertAdjacentHTML('beforeend', `<div class="bd-fail">${ic('triangle-alert')}<b>Das hat nicht geklappt</b><small>${escB(bdErr(msg))}</small></div>`);
    window.toast('✕ ' + bdErr(msg));
  }
  function scanning(on, text) {
    const st = $b('bdStage'); if (!st) return;
    st.querySelector('.bd-scan')?.remove();
    if (on) st.insertAdjacentHTML('beforeend', `<div class="bd-scan"><i></i><div class="bd-scan-chip"><span class="bd-spin"></span> Kairo baut um: ${escB(String(text).slice(0, 70))}</div></div>`);
    $b('bdSend') && ($b('bdSend').disabled = on);
  }
  function flashChip(html) {
    const st = $b('bdStage'); if (!st) return;
    st.insertAdjacentHTML('beforeend', `<div class="bd-flash">${html}</div>`);
    const f = st.lastElementChild; setTimeout(() => f.remove(), 2600);
  }
  function celebrate(text) {
    const st = $b('bdStage'); if (!st) return;
    const colors = ['#ff7a45', '#7a5cff', '#3ddc97', '#ffd27a', '#4fc3ff', '#ff4f8b'];
    st.insertAdjacentHTML('beforeend', `<div class="bd-party"><b>${ic('circle-check')} ${escB(text)}</b>${Array.from({ length: 40 }, () => `<i style="--x:${(Math.random() - 0.5) * 900}px;--y:${-150 - Math.random() * 380}px;--r:${Math.random() * 720}deg;--c:${colors[Math.floor(Math.random() * 6)]};--d:${Math.random() * 0.2}s"></i>`).join('')}</div>`);
    const p = st.lastElementChild; setTimeout(() => p.remove(), 2600);
  }

  // Logo maker -> website
  function fromLogo(R, logo) {
    brand = { name: R.name, tagline: R.tagline, colors: logo.colors || [], svg: logo.svg, bg: logo.bg };
    open({ tab: 'site' });
  }
  return { open, buildApp, change, fromLogo, site: (idea, minutes, style) => { open({ tab: 'site' }); $b('bdIdea').value = idea; if (minutes) pickChip('bdMin', String([1, 3, 5, 10, 20].reduce((a, b) => Math.abs(b - minutes) < Math.abs(a - minutes) ? b : a))); if (style) pickChip('bdStyle', style); meter(); startSite(); }, current: () => cur, isBusy: () => busy };
})();

// ================= How does it work? =================
window.HowItWorks = (function () {
  let EX = null, i = 0, playing = true, ac = null, src = null, bufs = [], recBusy = false, token = 0;
  const SUGG = ['ein schwarzes Loch', 'das Internet', 'ein Flugzeug', 'ein Handy-Akku', 'eine Rakete', 'das Herz', 'WLAN', 'ein Elektroauto', 'KI wie Kairo', 'ein Vulkan'];
  function overlay() {
    let el = $b('hwOverlay');
    if (el && el.dataset.closing) { el.remove(); el = null; }
    if (!el) { document.body.insertAdjacentHTML('beforeend', '<div class="xo hw" id="hwOverlay"></div>'); el = $b('hwOverlay'); }
    requestAnimationFrame(() => el.classList.add('on'));
    return el;
  }
  function close() {
    if (recBusy) return window.toast('Video wird noch aufgenommen…');
    token++; stopAudio(); ac?.close(); ac = null;
    const el = $b('hwOverlay'); if (!el) return;
    el.dataset.closing = '1'; el.removeAttribute('id'); el.classList.remove('on'); setTimeout(() => el.remove(), 500);
  }
  function open(topic, depth) {
    const el = overlay();
    if (topic) return load(topic, depth || 'normal');
    el.innerHTML = `<div class="hw-ask"><button class="fx-x" data-x>✕</button><div class="hw-atom"><i></i><i></i><i></i><b></b></div><small>Kairo erklärt</small><h2>Wie funktioniert …?</h2><p>Kairo zeichnet es Schritt für Schritt – mit Stimme. Danach kannst du ein Erklärvideo daraus machen.</p>
      <form id="hwForm"><input class="field" id="hwIn" placeholder="z. B. ein Kühlschrank" autocomplete="off"><button class="btn primary">${ic('play')} Erklären</button></form>
      <div class="hw-depth" id="hwDepth">${[['short', 'Kurz', '4 Schritte'], ['normal', 'Normal', '6 Schritte'], ['long', 'Ausführlich', '9 Schritte']].map(([k, l, s], n) => `<button data-d="${k}" class="${n === 1 ? 'on' : ''}"><b>${l}</b><small>${s}</small></button>`).join('')}</div>
      <div class="qs-sugg">${SUGG.map(s => `<button>${escB(s)}</button>`).join('')}</div></div>`;
    el.querySelector('[data-x]').onclick = close;
    let d = 'normal';
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { d = b.dataset.d; el.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('on', x === b)); });
    $b('hwForm').onsubmit = e => { e.preventDefault(); const v = $b('hwIn').value.trim(); if (v) load(v, d); };
    el.querySelectorAll('.qs-sugg button').forEach(b => b.onclick = () => load(b.textContent, d));
    setTimeout(() => $b('hwIn')?.focus(), 200);
  }
  async function load(topic, depth) {
    const el = overlay(), my = ++token;
    el.innerHTML = `<div class="hw-load"><div class="hw-atom big"><i></i><i></i><i></i><b></b></div><b>Kairo zeichnet die Erklärung…</b><small>${escB(topic)}</small><div class="hw-sk">${'<i></i>'.repeat(5)}</div><button class="btn" data-x>Abbrechen</button></div>`;
    el.querySelector('[data-x]').onclick = close;
    const r = await window.kairo.bd.explain({ topic, depth });
    if (my !== token || !$b('hwOverlay')) return;
    if (!r.ok) { el.innerHTML = `<div class="hw-ask"><button class="fx-x" data-x>✕</button><h2>✕</h2><p>${escB(bdErr(r.error.message))}</p><button class="btn primary" id="hwRetry">Nochmal</button></div>`; el.querySelector('[data-x]').onclick = close; $b('hwRetry').onclick = () => load(topic, depth); return null; }
    EX = r.ex; EX.topic = topic;
    EX.steps = EX.steps.map(s => ({ ...s, svg: cleanSvg(s.svg) }));
    i = -1; playing = true; bufs = [];
    ac?.close(); ac = new AudioContext();
    player();
    // voice for all steps in the background (intro first)
    const lines = [EX.intro || EX.title, ...EX.steps.map(s => s.say || s.text), EX.summary || ''];
    bufs = lines.map(() => null);
    const jobs = lines.map((t, n) => ttsBuffer(ac, t).then(b => { bufs[n] = b || false; }));
    intro();
    await jobs[0];
    if (my === token) setTimeout(() => my === token && i === -1 && next(), Math.max(1200, (bufs[0]?.duration || 2.5) * 1000 + 600));
    return EX;
  }
  function player() {
    const el = $b('hwOverlay');
    el.innerHTML = `<div class="hw-play"><div class="hw-grid"></div>
      <header class="hw-top"><div><small>Wie funktioniert</small><b>${escB(EX.title)}</b></div><div class="hw-top-r"><button class="btn" id="hwVid">${ic('clapperboard')} Erklärvideo machen</button><button class="fx-x" data-x>✕</button></div></header>
      <div class="hw-scene"><div class="hw-board" id="hwBoard"></div><div class="hw-cap" id="hwCap"></div></div>
      <footer class="hw-ctl"><button id="hwPrev">${ic('skip-back')}</button><button id="hwPause" class="big">${ic('pause')}</button><button id="hwNext">${ic('skip-forward')}</button>
        <div class="hw-dots">${EX.steps.map((s, n) => `<button data-n="${n}" title="${escB(s.title)}"><i></i></button>`).join('')}</div></footer></div>`;
    el.querySelector('[data-x]').onclick = close;
    $b('hwPrev').onclick = () => goTo(Math.max(0, i - 1));
    $b('hwNext').onclick = () => next();
    $b('hwPause').onclick = () => { playing = !playing; $b('hwPause').innerHTML = ic(playing ? 'pause' : 'play'); if (!playing) stopAudio(); else if (i >= EX.steps.length) outro(); else goTo(Math.max(0, i)); };
    el.querySelectorAll('.hw-dots [data-n]').forEach(b => b.onclick = () => goTo(+b.dataset.n));
    $b('hwVid').onclick = videoAsk;
  }
  function intro() {
    $b('hwBoard').innerHTML = `<div class="hw-intro"><small>${escB(EX.topic)}</small><h1>${escB(EX.title)}</h1><p>${escB(EX.intro || '')}</p></div>`;
    $b('hwCap').innerHTML = '';
    play(0);
  }
  function stopAudio() { try { src?.stop(); } catch {} src = null; }
  async function play(n, onEnd) {
    stopAudio();
    const my = token;
    let b = bufs[n];
    for (let k = 0; b == null && k < 60 && my === token; k++) { await new Promise(r => setTimeout(r, 250)); b = bufs[n]; }
    if (my !== token || !b || !playing) { if (my === token && playing) setTimeout(() => onEnd?.(), 4500); return; }
    if (ac.state === 'suspended') await ac.resume();
    const s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination);
    s.onended = () => { if (src === s) { src = null; onEnd?.(); } };
    src = s; s.start();
  }
  function next() { if (i + 1 < EX.steps.length) goTo(i + 1); else outro(); }
  function goTo(n) {
    token++; const my = token;
    i = n; const s = EX.steps[n];
    $b('hwOverlay')?.querySelectorAll('.hw-dots [data-n]').forEach((b, k) => { b.classList.toggle('on', k === n); b.classList.toggle('done', k < n); });
    const board = $b('hwBoard');
    board.innerHTML = `<div class="hw-svg">${s.svg || ''}</div><div class="hw-num">${String(n + 1).padStart(2, '0')}</div>`;
    drawOn(board.querySelector('svg'), Math.max(2.4, Math.min(6, (bufs[n + 1]?.duration || 8) * 0.6)));
    $b('hwCap').innerHTML = `<small>Schritt ${n + 1} von ${EX.steps.length}</small><h2>${escB(s.title)}</h2><p>${escB(s.text)}</p>${s.fact ? `<div class="hw-fact">${ic('lightbulb')}<span>${escB(s.fact)}</span></div>` : ''}`;
    $b('hwCap').classList.remove('in'); void $b('hwCap').offsetWidth; $b('hwCap').classList.add('in');
    play(n + 1, () => { if (my === token && playing) setTimeout(() => my === token && playing && next(), 900); });
  }
  function outro() {
    token++; i = EX.steps.length;
    $b('hwOverlay')?.querySelectorAll('.hw-dots [data-n]').forEach(b => { b.classList.remove('on'); b.classList.add('done'); });
    $b('hwBoard').innerHTML = `<div class="hw-intro end"><div class="hw-atom big"><i></i><i></i><i></i><b></b></div><h1>Verstanden?</h1><p>${escB(EX.summary || '')}</p><div class="hw-end-btns"><button class="btn" id="hwAgain">${ic('rotate-ccw')} Nochmal</button><button class="btn primary" id="hwVid2">${ic('clapperboard')} Erklärvideo machen</button><button class="btn" id="hwNew">${ic('search')} Neues Thema</button></div></div>`;
    $b('hwCap').innerHTML = '';
    $b('hwAgain').onclick = () => goTo(0); $b('hwVid2').onclick = videoAsk; $b('hwNew').onclick = () => { token++; stopAudio(); open(); };
    play(EX.steps.length + 1);
  }
  // elements appear one after another: strokes draw themselves, fills fade in, labels slide in
  function drawOn(svg, total) {
    if (!svg) return;
    const els = [...svg.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon, text')];
    const per = total / Math.max(1, els.length);
    els.forEach((e, k) => {
      const delay = k * per * 1000;
      if (e.tagName === 'text') { e.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay, fill: 'both', easing: 'cubic-bezier(.16,1,.3,1)' }); return; }
      let len = 0; try { len = e.getTotalLength(); } catch {}
      const hasStroke = getComputedStyle(e).stroke !== 'none' && len > 0;
      if (hasStroke) {
        e.style.strokeDasharray = len; e.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: Math.min(1400, 300 + len * 1.5), delay, fill: 'both', easing: 'ease-in-out' });
        e.animate([{ fillOpacity: 0 }, { fillOpacity: getComputedStyle(e).fillOpacity || 1 }], { duration: 600, delay: delay + 400, fill: 'both' });
      } else {
        e.style.transformBox = 'fill-box'; e.style.transformOrigin = 'center';
        e.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay, fill: 'both', easing: 'cubic-bezier(.34,1.56,.64,1)' });
      }
    });
  }

  // ---------- video export ----------
  function videoAsk() {
    if (recBusy) return;
    token++; stopAudio(); playing = false;
    const el = $b('hwOverlay');
    el.insertAdjacentHTML('beforeend', `<div class="hw-modal" id="hwModal"><div class="hw-modal-box"><button class="fx-x" data-mx>✕</button><small>Erklärvideo</small><h2>Welches Format?</h2>
      <div class="hw-fmt"><button data-f="wide">${ic('monitor-play')}<b>YouTube</b><small>16:9 · 1920×1080</small></button><button data-f="tall">${ic('smartphone')}<b>TikTok / Shorts</b><small>9:16 · 1080×1920</small></button></div>
      <p class="muted small">Das Video wird in Echtzeit aufgenommen – so lange wie die Erklärung dauert. Hochladen machst du selbst.</p></div></div>`);
    el.querySelector('[data-mx]').onclick = () => $b('hwModal').remove();
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { $b('hwModal').remove(); recordVideo(b.dataset.f); });
  }
  // all steps as pictures: k = how many elements are visible so far (canvas cannot animate an SVG by itself)
  async function frames(svg) {
    if (!svg) return [];
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    root.querySelectorAll('text').forEach(t => t.setAttribute('stroke', 'none'));
    const els = [...root.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon, text')];
    const out = [];
    const step = Math.max(1, Math.ceil(els.length / 14));
    for (let k = 0; k <= els.length; k += step) {
      els.forEach((e, n) => e.setAttribute('opacity', n < k ? '1' : '0'));
      out.push(await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(root))));
    }
    els.forEach(e => e.setAttribute('opacity', '1'));
    out.push(await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(root))));
    return out.filter(Boolean);
  }
  async function recordVideo(fmt) {
    recBusy = true;
    const el = $b('hwOverlay');
    const W = fmt === 'tall' ? 1080 : 1920, H = fmt === 'tall' ? 1920 : 1080;
    el.insertAdjacentHTML('beforeend', `<div class="hw-rec" id="hwRec"><div class="hw-rec-box"><div class="hw-rec-prev ${fmt}"><canvas id="hwCv" width="${W}" height="${H}"></canvas></div><div class="hw-rec-info"><b id="hwRecT"><span class="hw-recdot"></span> Bereite vor…</b><div class="hw-rec-bar"><i id="hwRecBar"></i></div><small id="hwRecS">Stimme und Bilder werden geladen</small></div></div></div>`);
    try {
      const vac = new AudioContext();
      const lines = [EX.intro || EX.title, ...EX.steps.map(s => s.say || s.text), EX.summary || ''];
      const vb = await Promise.all(lines.map(t => ttsBuffer(vac, t)));
      const pics = [];
      for (const s of EX.steps) pics.push(await frames(s.svg));
      const logo = await loadImg('assets/icon.png');
      const file = await renderVideo(fmt, W, H, vac, vb, pics, logo);
      $b('hwRec')?.remove();
      if (file) {
        el.insertAdjacentHTML('beforeend', `<div class="hw-modal" id="hwModal"><div class="hw-modal-box"><button class="fx-x" data-mx>✕</button><div class="hw-ok">${ic('circle-check')}</div><h2>Erklärvideo fertig!</h2><p class="muted">Gespeichert in Videos → Kairo → Erklärvideos</p>
          <div class="hw-end-btns"><button class="btn primary" id="hwShow">${ic('folder-open')} Video zeigen</button><button class="btn" id="hwYt">${ic('external-link')} YouTube Studio</button><button class="btn" id="hwTk">${ic('external-link')} TikTok</button></div></div></div>`);
        el.querySelector('[data-mx]').onclick = () => $b('hwModal').remove();
        $b('hwShow').onclick = () => window.kairo.bd.reveal(file);
        $b('hwYt').onclick = () => { navigator.clipboard.writeText(`${EX.title} – einfach erklärt\n\n${EX.intro || ''}\n\n#erklärt #wissen #lernen`); window.toast('Titel & Text kopiert'); window.kairo.action({ type: 'open', url: 'https://studio.youtube.com' }); window.kairo.bd.reveal(file); };
        $b('hwTk').onclick = () => { navigator.clipboard.writeText(`${EX.title} in ${Math.round(lines.length * 12)} Sekunden #wissen #lernenmittiktok #erklärt`); window.toast('Text kopiert'); window.kairo.action({ type: 'open', url: 'https://www.tiktok.com/upload' }); window.kairo.bd.reveal(file); };
      }
    } catch (e) { $b('hwRec')?.remove(); window.toast('✕ ' + e.message); }
    recBusy = false;
  }
  function renderVideo(fmt, W, H, vac, vb, pics, logo) {
    return new Promise(resolve => {
      const cv = $b('hwCv'), g = cv.getContext('2d'), tall = fmt === 'tall';
      const C = ['#ff7a45', '#7a5cff', '#3ddc97', '#4fc3ff', '#ffd27a', '#ff4f8b'];
      const parts = [{ type: 'intro' }, ...EX.steps.map((s, n) => ({ type: 'step', s, n, pics: pics[n] })), { type: 'outro' }];
      parts.forEach((p, n) => { p.dur = Math.max(p.type === 'step' ? 4.5 : 3, (vb[n]?.duration || 3.5) + 0.8); });
      let t = 0; parts.forEach(p => { p.start = t; t += p.dur; });
      const total = t + 0.5;
      const dest = vac.createMediaStreamDestination();
      // soft background hum so the video never has dead silence
      const pad = vac.createGain(); pad.gain.value = 0.025; pad.connect(dest);
      [110, 164.8, 220].forEach(f => { const o = vac.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(pad); o.start(); o.stop(vac.currentTime + total + 1); });
      const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5e6 });
      const chunks = []; rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: mime.split(';')[0] });
        const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => { const u = String(fr.result); r(u.slice(u.indexOf('base64,') + 7)); }; fr.readAsDataURL(blob); });
        vac.close();
        if (b64.length < 1000) { window.toast('✕ Video leer – bitte nochmal'); return resolve(null); }
        const sv = await window.kairo.bd.saveVideo(b64, mime.includes('mp4') ? 'mp4' : 'webm', EX.title);
        resolve(sv.ok ? sv.path : null);
      };
      const t0 = vac.currentTime + 0.3;
      parts.forEach((p, n) => { if (vb[n]) { const s = vac.createBufferSource(); s.buffer = vb[n]; s.connect(dest); s.start(t0 + p.start + 0.3); } });
      rec.start();
      const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
      const wrap = (txt, maxW, font) => { g.font = font; const words = String(txt || '').split(' '), out = []; let line = ''; for (const w of words) { const tl = line ? line + ' ' + w : w; if (g.measureText(tl).width > maxW && line) { out.push(line); line = w; } else line = tl; } if (line) out.push(line); return out; };
      const frame = () => {
        const now = vac.currentTime - t0;
        if (now > total) { rec.stop(); return; }
        if ($b('hwRecBar')) { $b('hwRecBar').style.width = Math.min(100, now / total * 100) + '%'; $b('hwRecT').innerHTML = `<span class="hw-recdot"></span> Nimmt auf · ${fmtTime(Math.max(0, now))} / ${fmtTime(total)}`; $b('hwRecS').textContent = 'Nicht schliessen – das Video entsteht gerade'; }
        // background: deep blue with a moving glow and a blueprint grid
        g.fillStyle = '#070a14'; g.fillRect(0, 0, W, H);
        for (let k = 0; k < 2; k++) { const x = W * (0.3 + 0.4 * Math.sin(now * 0.2 + k * 3)), y = H * (0.3 + 0.4 * Math.cos(now * 0.17 + k)); const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.6); gr.addColorStop(0, k ? 'rgba(122,92,255,.20)' : 'rgba(79,195,255,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
        g.strokeStyle = 'rgba(120,160,255,.06)'; g.lineWidth = 1; g.beginPath(); for (let x = 0; x < W; x += 60) { g.moveTo(x, 0); g.lineTo(x, H); } for (let y = 0; y < H; y += 60) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke();
        const p = parts.find(q => now >= q.start && now < q.start + q.dur) || parts[parts.length - 1], lt = now - p.start, a = ease(lt / 0.6), out = Math.min(1, Math.max(0, (p.start + p.dur - now) / 0.35));
        g.globalAlpha = out; g.textBaseline = 'alphabetic';
        if (p.type !== 'step') {
          g.textAlign = 'center';
          for (let k = 0; k < 3; k++) { g.save(); g.translate(W / 2, H * 0.32); g.rotate(now * (0.6 + k * 0.3) + k); g.strokeStyle = C[k]; g.lineWidth = 6; g.globalAlpha = out * 0.9; g.beginPath(); g.ellipse(0, 0, 150, 52, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
          g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, H * 0.32, 22, 0, Math.PI * 2); g.fill();
          g.globalAlpha = out * a;
          g.font = `700 ${tall ? 40 : 30}px 'JetBrains Mono Var', monospace`; g.fillStyle = '#4fc3ff'; g.fillText(p.type === 'intro' ? 'WIE FUNKTIONIERT' : 'ZUSAMMENGEFASST', W / 2, H * 0.5);
          g.fillStyle = '#fff'; wrap(p.type === 'intro' ? EX.title : 'Verstanden?', W - 200, `800 ${tall ? 104 : 96}px 'Space Grotesk Var', Arial`).forEach((l, k) => g.fillText(l, W / 2, H * 0.5 + (tall ? 130 : 110) + k * (tall ? 116 : 104) - (1 - a) * 40));
          g.fillStyle = '#b9c3d8'; wrap(p.type === 'intro' ? EX.intro : EX.summary, W - (tall ? 160 : 500), `500 ${tall ? 50 : 40}px 'Inter Var', Arial`).forEach((l, k) => { g.globalAlpha = out * ease((lt - 0.4) / 0.6); g.fillText(l, W / 2, H * (tall ? 0.72 : 0.78) + k * (tall ? 66 : 54)); });
          if (p.type === 'outro' && logo) { g.globalAlpha = out * a; g.drawImage(logo, W / 2 - 160, H - (tall ? 230 : 130), 56, 56); g.font = `700 ${tall ? 40 : 32}px 'Inter Var', Arial`; g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText('Erklärt von Kairo', W / 2 - 90, H - (tall ? 190 : 92)); }
        } else {
          // the diagram builds up element by element
          const box = tall ? { x: 40, y: 330, w: W - 80, h: (W - 80) * 450 / 800 } : { x: 70, y: 150, w: 1150, h: 1150 * 450 / 800 };
          g.fillStyle = 'rgba(255,255,255,.035)'; g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; g.beginPath(); g.roundRect(box.x - 20, box.y - 20, box.w + 40, box.h + 40, 34); g.fill(); g.stroke();
          const pc = p.pics || [];
          if (pc.length) {
            const prog = Math.min(1, lt / Math.max(2.4, p.dur * 0.6)) * (pc.length - 1), k = Math.floor(prog), f = prog - k;
            g.globalAlpha = out; g.drawImage(pc[k], box.x, box.y, box.w, box.h);
            if (pc[k + 1]) { g.globalAlpha = out * f; g.drawImage(pc[k + 1], box.x, box.y, box.w, box.h); }
          }
          g.globalAlpha = out * 0.12; g.font = `800 ${tall ? 300 : 260}px 'Space Grotesk Var', Arial`; g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(String(p.n + 1).padStart(2, '0'), tall ? W - 30 : box.x + box.w + 10, tall ? 300 : box.y + box.h + 10);
          // text panel
          g.textAlign = 'left'; g.globalAlpha = out * a;
          const tx = tall ? 70 : 1290, tw = tall ? W - 140 : W - 1290 - 70; let ty = tall ? box.y + box.h + 130 : 230;
          g.font = `700 ${tall ? 38 : 26}px 'JetBrains Mono Var', monospace`; g.fillStyle = C[p.n % C.length]; g.fillText(`SCHRITT ${p.n + 1} / ${EX.steps.length}`, tx, ty); ty += tall ? 90 : 70;
          g.fillStyle = '#fff'; wrap(p.s.title, tw, `800 ${tall ? 80 : 54}px 'Space Grotesk Var', Arial`).forEach(l => { g.fillText(l, tx, ty - (1 - a) * 30); ty += tall ? 92 : 64; }); ty += tall ? 20 : 14;
          g.fillStyle = '#c3cbe0'; g.globalAlpha = out * ease((lt - 0.3) / 0.6); wrap(p.s.text, tw, `500 ${tall ? 46 : 32}px 'Inter Var', Arial`).forEach(l => { g.fillText(l, tx, ty); ty += tall ? 62 : 46; });
          if (p.s.fact) { ty += 30; g.globalAlpha = out * ease((lt - 1.2) / 0.6); const lines = wrap(p.s.fact, tw - 60, `600 ${tall ? 40 : 27}px 'Inter Var', Arial`); const bh = lines.length * (tall ? 54 : 38) + 40; g.fillStyle = 'rgba(255,210,122,.1)'; g.strokeStyle = 'rgba(255,210,122,.4)'; g.beginPath(); g.roundRect(tx, ty, tw, bh, 22); g.fill(); g.stroke(); g.fillStyle = '#ffd27a'; lines.forEach((l, k) => g.fillText(l, tx + 30, ty + (tall ? 56 : 44) + k * (tall ? 54 : 38))); }
        }
        g.globalAlpha = 1;
        // progress + watermark
        g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, H - 8, W, 8); g.fillStyle = '#4fc3ff'; g.fillRect(0, H - 8, W * Math.min(1, now / total), 8);
        g.textAlign = 'left'; g.font = `700 ${tall ? 36 : 26}px 'Inter Var', Arial`; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('Kairo AI', tall ? 60 : 70, tall ? 140 : 80);
        requestAnimationFrame(frame);
      };
      frame();
    });
  }
  return { open };
})();
