// "Aufgeräumt" mode: fewer buttons on screen, nothing removed.
// 1 all-features finder (Ctrl+K), 2 favourites + category cards on Today, 3 persona + attachments folded into two buttons,
// 4 smart suggestions while typing, 5 previews on the left rail. Switch it off any time (finder footer).
window.Tidy = (function () {
  const $t = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const has = n => typeof window[n] !== 'undefined';
  const ask = (q, fn) => { const v = prompt(q); if (v && v.trim()) fn(v.trim()); };

  const CATS = [
    ['create', 'Erstellen', 'wand-sparkles', '#ff7a45', 'Apps, Websites, Logos, Videos'],
    ['know', 'Wissen & Recherche', 'telescope', '#6ea8ff', 'Recherche, Erklärungen, Dokus'],
    ['learn', 'Lernen', 'graduation-cap', '#3ddc97', 'Prüfungen, Lernpfade, Sprachen'],
    ['work', 'Schreiben & Arbeiten', 'file-text', '#ffd27a', 'Dokumente, Projekte, Code'],
    ['show', 'Show & Spass', 'party-popper', '#ff4f8b', 'Jarvis, Spiele, Musik, Party'],
    ['tools', 'Werkzeuge', 'wrench', '#a37bff', 'Suche, PC, Flüge, Wetter']
  ];
  // id, name, icon, category, keywords (for search + suggestions), action, needs (global)
  const F = [
    ['bsite', 'Website-Bauer', 'globe', 'create', 'website webseite homepage seite landingpage', () => Builder.open({ tab: 'site' }), 'Builder'],
    ['bapp', 'Skizze → App', 'pencil-ruler', 'create', 'app skizze zeichnen programm tool bauen', () => Builder.open({ tab: 'sketch' }), 'Builder'],
    ['bshop', 'Ideen-Shop', 'store', 'create', 'ideen shop vorlagen startideen', () => Builder.open({ tab: 'shop' }), 'Builder'],
    ['game', 'Spiel-Macher', 'gamepad-2', 'create', 'spiel game programmieren bauen', () => GameMaker.open(), 'GameMaker'],
    ['logo', 'Logo-Macher', 'palette', 'create', 'logo banner profilbild kanal', () => LogoMaker.open(), 'LogoMaker'],
    ['brand', 'Marken-Kit', 'palette', 'create', 'marke branding farben schrift visitenkarte', () => Pro.open('brand'), 'Pro'],
    ['social', 'Social Studio', 'clapperboard', 'create', 'tiktok youtube video shorts reels', () => SocialStudio.open(), 'SocialStudio'],
    ['roblox', 'Roblox Studio', 'gamepad-2', 'create', 'roblox studio obby spiel luau skript', () => RobloxUI.open(), 'RobloxUI'],
    ['mc', 'Minecraft-Bau', 'pickaxe', 'create', 'minecraft bauen burg haus', () => McBuilder.open(), 'McBuilder'],
    ['inv', 'Erfinder-Modus', 'lightbulb', 'create', 'erfinder idee erfindung geschäftsidee startup', () => Inventor.open(), 'Inventor'],
    ['image', 'Bild erstellen', 'image', 'create', 'bild foto zeichnung generieren', () => window.App.askInChat('Erstelle ein Bild von '), 'App'],
    ['research', 'Deep Research', 'telescope', 'know', 'recherche recherchieren research bericht analyse', () => Pro.open('research'), 'Pro'],
    ['sources', 'Quellen-Finder', 'library-big', 'know', 'quellen literatur zitat zitieren', () => Pro.open('sources'), 'Pro'],
    ['how', 'Wie funktioniert …?', 'atom', 'know', 'wie funktioniert erklären erklärvideo', () => HowItWorks.open(), 'HowItWorks'],
    ['doc', 'Doku', 'clapperboard', 'know', 'doku dokumentation film geschichte', () => ask('Worüber soll die Doku sein?', t => StoryPlayer.doc(t)), 'StoryPlayer'],
    ['whatif', 'Was wäre wenn', 'sparkles', 'know', 'was wäre wenn fantasie', () => ask('Was wäre, wenn …?', t => StoryPlayer.whatIf('Was wäre, wenn ' + t)), 'StoryPlayer'],
    ['solar', 'Sonnensystem', 'orbit', 'know', 'sonnensystem planeten mars weltraum', () => SolarSystem.open(), 'SolarSystem'],
    ['earth', '3D-Erde', 'earth', 'know', 'erde globus karte land reise ort', () => window.App.go('earth'), 'App'],
    ['dash', 'Dashboard', 'layout-dashboard', 'know', 'dashboard bitcoin kurs wetter daten', () => Pro.open('dash'), 'Pro'],
    ['exam', 'Prüfungs-Simulator', 'graduation-cap', 'learn', 'prüfung test probe note üben', () => Pro.open('exam'), 'Pro'],
    ['path', 'Lernpfad', 'route', 'learn', 'lernen lernpfad lernplan beibringen kurs', () => Pro.open('path'), 'Pro'],
    ['lang', 'Sprachlehrer', 'speech', 'learn', 'englisch französisch sprache sprechen üben', () => Pro.open('lang'), 'Pro'],
    ['school', 'Schule', 'graduation-cap', 'learn', 'schule hausaufgaben karteikarten', () => window.App.go('school'), 'App'],
    ['present', 'Präsentation & Training', 'presentation', 'learn', 'präsentation vortrag powerpoint folien referat', () => Pro.open('present'), 'Pro'],
    ['document', 'Profi-Dokumente', 'file-text', 'work', 'bewerbung lebenslauf brief bericht protokoll dokument word pdf', () => Pro.open('document'), 'Pro'],
    ['coach', 'Schreib-Coach', 'notebook-pen', 'work', 'text verbessern korrigieren aufsatz grammatik', () => Pro.open('coach'), 'Pro'],
    ['translate', 'Dokument-Übersetzer', 'languages', 'work', 'übersetzen übersetzer dokument', () => Pro.open('translate'), 'Pro'],
    ['projects', 'Projekt-Manager', 'kanban', 'work', 'projekt ziel plan meilenstein aufgaben', () => Pro.open('projects'), 'Pro'],
    ['code', 'Code-Assistent', 'terminal', 'work', 'code programmieren fehler projekt analysieren', () => Pro.open('code'), 'Pro'],
    ['agent', 'Agent-Modus', 'bot', 'work', 'agent erledigen vorbereiten alles automatisch', () => Pro.open('agent'), 'Pro'],
    ['memory', 'Gedächtnis', 'brain', 'work', 'gedächtnis erinnerung weisst über mich', () => Pro.open('memory'), 'Pro'],
    ['files', 'Dateien', 'folder-open', 'work', 'dateien ordner datei', () => window.App.go('files'), 'App'],
    ['jarvis', 'Jarvis-Modus', 'scan-search', 'show', 'jarvis hud iron man', () => Jarvis.set(), 'Jarvis'],
    ['pet', 'Haustier', 'cat', 'show', 'haustier drache pet', () => Pet.set(!Pet.isOn()), 'Pet'],
    ['games', 'Spiele', 'gamepad-2', 'show', 'spiele schach geoguessr quiz rätsel', () => window.App.go('games'), 'App'],
    ['radio', 'Radio-Show', 'radio', 'show', 'radio morgenshow moderatoren', () => RadioShow.open(), 'RadioShow'],
    ['quiz', 'Musik-Quiz', 'music-2', 'show', 'musik quiz song charts', () => MusicQuiz.open(), 'MusicQuiz'],
    ['tv', 'Welt-TV', 'tv', 'show', 'webcam welt tv live', () => WorldTV.open(), 'WorldTV'],
    ['party', 'Party!', 'party-popper', 'show', 'party feuerwerk feiern', () => Party.party(), 'Party'],
    ['viz', 'Musik-Visualizer', 'audio-lines', 'show', 'musik visualizer tanzen', () => MusicViz.open(), 'MusicViz'],
    ['comment', 'Kommentator', 'mic', 'show', 'kommentator gaming kommentar', () => Commentator.set(), 'Commentator'],
    ['dweather', 'Wetter auf Desktop', 'cloud-rain', 'show', 'wetter desktop regen schnee', () => DesktopWeather.set(!DesktopWeather.isOn()), 'DesktopWeather'],
    ['search', 'Super-Suche', 'search', 'tools', 'suche finden datei programm', () => window.kairo.search.toggle(), 'kairo'],
    ['subs', 'Live-Untertitel', 'message-circle', 'tools', 'untertitel übersetzen video live', () => Subtitles.toggle(), 'Subtitles'],
    ['flight', 'Flug verfolgen', 'plane', 'tools', 'flug flugzeug flugnummer verfolgen', () => ask('Flugnummer, z. B. LX8', f => Flight.track(f)), 'Flight'],
    ['song', 'Song erkennen', 'music', 'tools', 'song erkennen welches lied', () => SongFinder.open(), 'SongFinder'],
    ['pccheck', 'PC-Check', 'cpu', 'tools', 'pc langsam check leistung computer', () => PcCheck.open(), 'PcCheck'],
    ['today', 'Heute', 'sun', 'tools', 'heute wetter erinnerung wecker countdown geburtstag', () => window.App.go('today'), 'App'],
    ['deck', 'Stream Deck', 'layout-dashboard', 'tools', 'stream deck knöpfe handy fernbedienung', () => DeckUI.open(), 'DeckUI'],
    ['phone', 'Handy-App', 'smartphone', 'tools', 'handy app telefon anruf qr', () => window.App.go('phone'), 'App'],
    ['welcome', 'Einrichtung (Willkommen)', 'sparkles', 'tools', 'einrichtung setup start willkommen schlüssel key', () => Welcome.open(), 'Welcome'],
    ['settings', 'Einstellungen', 'settings', 'tools', 'einstellungen stimme ki schlüssel sprache', () => window.App.go('settings'), 'App']
  ];
  const feats = () => F.filter(f => !f[6] || has(f[6])).map(([id, name, icon, cat, kw, run]) => ({ id, name, icon, cat, kw, run }));
  const DEF_FAV = ['research', 'bsite', 'document', 'how', 'jarvis', 'exam'];
  const favs = () => ls.get('kairo.favs', DEF_FAV);
  const recent = () => ls.get('kairo.recent', []);
  function run(f) {
    ls.set('kairo.recent', [f.id, ...recent().filter(x => x !== f.id)].slice(0, 6));
    closeFinder();
    setTimeout(() => { try { f.run(); } catch (e) { window.toast?.('✕ ' + e.message); } }, 120);
  }
  const score = (f, q) => {
    q = q.toLowerCase().trim(); if (!q) return 0;
    const name = f.name.toLowerCase(), words = (f.kw + ' ' + name).split(/\s+/);
    let s = 0;
    if (name.startsWith(q)) s += 10; else if (name.includes(q)) s += 6;
    q.split(/\s+/).filter(w => w.length > 1).forEach(w => { if (words.some(x => x.startsWith(w))) s += 4; else if (words.some(x => x.includes(w))) s += 2; });
    return s;
  };

  // ================= 1 finder =================
  let sel = 0, list = [];
  function openFinder(q = '') {
    let el = $t('tdFinder');
    if (!el) {
      document.body.insertAdjacentHTML('beforeend', `<div class="tf" id="tdFinder"><div class="tf-box"><div class="tf-in">${ic('search')}<input id="tfQ" placeholder="Was willst du machen? z. B. „Website“, „Prüfung“, „Jarvis“ …" autocomplete="off"><kbd>Esc</kbd></div><div class="tf-list" id="tfList"></div>
        <div class="tf-foot"><span><kbd>↑</kbd><kbd>↓</kbd> wählen <kbd>Enter</kbd> öffnen <kbd>Ctrl</kbd>+<kbd>K</kbd> überall</span><label class="tf-sw"><input type="checkbox" id="tfTidy" ${on() ? 'checked' : ''}><i></i>Aufgeräumter Modus</label></div></div></div>`);
      el = $t('tdFinder');
      el.onclick = e => { if (e.target === el) closeFinder(); };
      $t('tfQ').oninput = () => { sel = 0; draw(); };
      $t('tfQ').onkeydown = e => {
        if (e.key === 'ArrowDown') { sel = Math.min(list.length - 1, sel + 1); draw(true); e.preventDefault(); }
        if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(true); e.preventDefault(); }
        if (e.key === 'Enter') { e.preventDefault(); const f = list[sel]; if (f?.ask) { closeFinder(); window.App.askInChat(f.ask); } else if (f) run(f); }
        if (e.key === 'Escape') closeFinder();
      };
      $t('tfTidy').onchange = e => set(e.target.checked);
    }
    requestAnimationFrame(() => el.classList.add('on'));
    $t('tfQ').value = q; sel = 0; draw();
    setTimeout(() => $t('tfQ')?.focus(), 30);
  }
  function closeFinder() { const el = $t('tdFinder'); if (!el) return; el.classList.remove('on'); setTimeout(() => el.remove(), 250); }
  function draw(keepScroll) {
    const q = $t('tfQ').value, all = feats(), box = $t('tfList');
    const item = (f, i) => `<button class="tf-it ${i === sel ? 'sel' : ''}" data-i="${i}" style="--c:${CATS.find(c => c[0] === f.cat)?.[3] || '#888'}"><span class="tf-ic">${ic(f.icon)}</span><b>${esc(f.name)}</b><small>${esc(CATS.find(c => c[0] === f.cat)?.[1] || '')}</small><span class="tf-star ${favs().includes(f.id) ? 'on' : ''}" data-star="${f.id}" title="Favorit">${ic('star')}</span></button>`;
    if (q.trim()) {
      list = all.map(f => ({ f, s: score(f, q) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.f).slice(0, 8);
      list.push({ ask: q, name: `Kairo fragen: „${q}“`, icon: 'message-circle', cat: '' });
      box.innerHTML = list.map((f, i) => f.ask ? `<button class="tf-it ask ${i === sel ? 'sel' : ''}" data-i="${i}"><span class="tf-ic">${ic('message-circle')}</span><b>${esc(f.name)}</b><small>Chat</small></button>` : item(f, i)).join('');
    } else {
      const rec = recent().map(id => all.find(f => f.id === id)).filter(Boolean).slice(0, 4);
      list = [...rec, ...CATS.flatMap(c => all.filter(f => f.cat === c[0]))];
      let i = 0;
      box.innerHTML = (rec.length ? `<h6>Zuletzt benutzt</h6>${rec.map(f => item(f, i++)).join('')}` : '') + CATS.map(c => `<h6 style="color:${c[3]}">${c[1]}</h6>${all.filter(f => f.cat === c[0]).map(f => item(f, i++)).join('')}`).join('');
    }
    box.querySelectorAll('[data-i]').forEach(b => b.onclick = e => { if (e.target.closest('[data-star]')) return; const f = list[+b.dataset.i]; if (f.ask) { closeFinder(); window.App.askInChat(f.ask); } else run(f); });
    box.querySelectorAll('[data-star]').forEach(b => b.onclick = e => { e.stopPropagation(); toggleFav(b.dataset.star); draw(true); });
    const s = box.querySelector('.sel'); if (s && keepScroll) s.scrollIntoView({ block: 'nearest' });
  }
  function toggleFav(id) { const f = favs(); ls.set('kairo.favs', f.includes(id) ? f.filter(x => x !== id) : [...f, id].slice(-8)); mountToday(); }
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $t('tdFinder') ? closeFinder() : openFinder(); } });

  // ================= 2 Today: favourites + categories =================
  function mountToday() {
    const grid = document.querySelector('#view-today .today-grid'); if (!grid) return;
    $t('tdFav')?.remove();
    if (!on()) return;
    const all = feats(), fv = favs().map(id => all.find(f => f.id === id)).filter(Boolean);
    grid.insertAdjacentHTML('afterbegin', `<div class="tcard td-fav" id="tdFav">
      <div class="td-fav-h"><div><b>Deine Favoriten</b><small>Stern im Alles-Finder setzen, um sie zu ändern</small></div><button class="td-all" id="tdAll">${ic('search')} Alle Funktionen <kbd>Ctrl K</kbd></button></div>
      <div class="td-favs">${fv.map((f, i) => `<button data-f="${f.id}" style="--c:${CATS.find(c => c[0] === f.cat)[3]};animation-delay:${i * 50}ms"><span>${ic(f.icon)}</span><b>${esc(f.name)}</b></button>`).join('')}</div>
      <div class="td-cats">${CATS.map(([k, n, i, c, sub], x) => `<div class="td-cat" data-cat="${k}" style="--c:${c};animation-delay:${x * 60}ms"><button class="td-cat-h"><span>${ic(i)}</span><div><b>${n}</b><small>${sub}</small></div><em>${all.filter(f => f.cat === k).length}</em>${ic('chevron-right')}</button><div class="td-cat-b"><div>${all.filter(f => f.cat === k).map(f => `<button data-f="${f.id}">${ic(f.icon)}<span>${esc(f.name)}</span></button>`).join('')}</div></div></div>`).join('')}</div></div>`);
    const card = $t('tdFav');
    card.querySelectorAll('[data-f]').forEach(b => b.onclick = () => run(all.find(f => f.id === b.dataset.f)));
    card.querySelectorAll('.td-cat-h').forEach(b => b.onclick = () => { const c = b.parentElement, open = !c.classList.contains('open'); card.querySelectorAll('.td-cat.open').forEach(x => x.classList.remove('open')); c.classList.toggle('open', open); });
    $t('tdAll').onclick = () => openFinder();
  }

  // ================= 3 composer: persona + attachments in two buttons =================
  function mountComposer() {
    const top = document.querySelector('.composer-top'), bottom = document.querySelector('.composer-bottom');
    if (!top || !bottom || $t('tdPersona')) return;
    top.insertAdjacentHTML('afterbegin', `<button class="td-pbtn" id="tdPersona">${ic('sparkles')}<span id="tdPName"></span>${ic('chevron-right')}</button>`);
    bottom.insertAdjacentHTML('afterbegin', `<div class="td-plus-w"><button class="td-plus" id="tdPlus" title="Anhängen">${ic('plus')}</button><div class="td-tags" id="tdTags"></div></div>`);
    const pname = () => { const a = document.querySelector('#personaSwitch button.active'); $t('tdPName').textContent = a ? a.textContent : 'Normal'; };
    pname(); new MutationObserver(pname).observe($t('personaSwitch'), { subtree: true, attributes: true, childList: true });
    $t('tdPersona').onclick = e => { e.stopPropagation(); pop($t('tdPersona'), [...document.querySelectorAll('#personaSwitch button')].map(b => ({ label: b.textContent, active: b.classList.contains('active'), run: () => b.click() })), 'Persönlichkeit'); };
    const chips = [['chipScreen', 'screen', 'Bildschirm mitschicken'], ['chipNews', 'news', 'Aktuelle News'], ['chipFile', 'paperclip', 'Datei anhängen'], ['chipFolder', 'folder-open', 'Ordner öffnen']];
    $t('tdPlus').onclick = e => { e.stopPropagation(); pop($t('tdPlus'), chips.map(([id, icn, label]) => ({ label, icon: icn, active: $t(id)?.getAttribute('aria-pressed') === 'true', run: () => $t(id).click() })), 'Anhängen', true); };
    const tags = () => { const box = $t('tdTags'); if (!box) return; box.innerHTML = chips.filter(([id]) => $t(id)?.getAttribute('aria-pressed') === 'true').map(([id, , label]) => `<button data-c="${id}">${esc(($t(id).querySelector('span')?.textContent) || label)} ✕</button>`).join(''); box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => $t(b.dataset.c).click()); };
    chips.forEach(([id]) => $t(id) && new MutationObserver(tags).observe($t(id), { attributes: true, subtree: true, characterData: true, childList: true }));
    tags();
  }
  function pop(anchor, items, title, up) {
    document.querySelector('.td-pop')?.remove();
    const r = anchor.getBoundingClientRect();
    document.body.insertAdjacentHTML('beforeend', `<div class="td-pop"><h6>${esc(title)}</h6>${items.map((it, i) => `<button data-i="${i}" class="${it.active ? 'on' : ''}">${it.icon ? ic(it.icon === 'screen' ? 'monitor' : it.icon === 'news' ? 'newspaper' : it.icon) : ''}<span>${esc(it.label)}</span>${it.active ? ic('check') : ''}</button>`).join('')}</div>`);
    const p = document.querySelector('.td-pop');
    p.style.left = Math.min(innerWidth - p.offsetWidth - 10, r.left) + 'px';
    p.style.top = (up ? r.top - p.offsetHeight - 8 : r.bottom + 8) + 'px';
    if (up && r.top - p.offsetHeight - 8 < 10) p.style.top = (r.bottom + 8) + 'px';
    if (!up && r.bottom + 8 + p.offsetHeight > innerHeight) p.style.top = (r.top - p.offsetHeight - 8) + 'px';
    p.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { items[+b.dataset.i].run(); p.remove(); });
    setTimeout(() => document.addEventListener('click', function off(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('click', off); } }), 0);
  }

  // ================= 4 smart suggestions while typing =================
  let sugTimer = 0;
  function mountSuggest() {
    const input = $t('input'); if (!input || input.dataset.tdSug) return; input.dataset.tdSug = '1';
    document.querySelector('.composer-wrap')?.insertAdjacentHTML('afterbegin', '<div class="td-sug" id="tdSug"></div>');
    input.addEventListener('input', () => { clearTimeout(sugTimer); sugTimer = setTimeout(suggest, 250); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) setTimeout(() => { $t('tdSug').classList.remove('on'); }, 50); });
  }
  function suggest() {
    const box = $t('tdSug'); if (!box) return;
    const q = $t('input').value.toLowerCase();
    if (!on() || q.trim().length < 4) { box.classList.remove('on'); return; }
    const STOP = new Set(['morgen', 'heute', 'gestern', 'schreiben', 'machen', 'bitte', 'kannst', 'einen', 'einer', 'meine', 'meinen', 'muss', 'möchte', 'will', 'über', 'wieder', 'noch', 'auch', 'aber', 'oder', 'dann', 'jetzt', 'schnell', 'alles']);
    const words = q.split(/[^a-zäöüß0-9-]+/).filter(w => w.length > 3 && !STOP.has(w));
    // a word matches a keyword if it starts with it ("bewerbungen" -> "bewerbung"), or is almost the whole keyword
    const hit = (w, k) => k.length > 3 && (w.startsWith(k) || (k.startsWith(w) && w.length >= k.length * 0.75));
    const best = feats().map(f => { const kw = f.kw.split(' '); return { f, s: words.filter(w => kw.some(k => hit(w, k))).length }; }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 2);
    if (!best.length) { box.classList.remove('on'); return; }
    box.innerHTML = `<span>${ic('sparkles')} Passt dazu:</span>` + best.map(({ f }) => `<button data-f="${f.id}">${ic(f.icon)} ${esc(f.name)} öffnen ${ic('chevron-right')}</button>`).join('') + '<button class="x" data-x>✕</button>';
    box.classList.add('on');
    box.querySelectorAll('[data-f]').forEach(b => b.onclick = () => run(feats().find(f => f.id === b.dataset.f)));
    box.querySelector('[data-x]').onclick = () => box.classList.remove('on');
  }

  // ================= 5 rail: finder button + page previews =================
  const PAGES = { chat: ['Chat', 'Schreib oder sprich mit Kairo'], today: ['Heute', 'Wetter, Favoriten, alle Funktionen, Erinnerungen'], school: ['Schule', 'Hausaufgaben, Prüfungen, Karteikarten'], earth: ['3D-Erde', 'Flüge, Wetter-Radar, Weltreisen, Länder'], games: ['Spiele', 'Schach, GeoGuessr, Quiz, Rätsel'], files: ['Dateien', 'Ordner öffnen und Kairo dazu fragen'], phone: ['Handy', 'Handy-App verbinden, Anrufe, Alarme'], settings: ['Einstellungen', 'KI, Stimme, Aussehen, Profil'] };
  function mountRail() {
    const rail = document.querySelector('.rail'); if (!rail || $t('tdFind')) return;
    rail.insertAdjacentHTML('afterbegin', `<button class="td-find" id="tdFind" title="Alle Funktionen (Ctrl+K)">${ic('search')}<span>Alles</span></button>`);
    $t('tdFind').onclick = () => openFinder();
    document.body.insertAdjacentHTML('beforeend', '<div class="td-tip" id="tdTip"></div>');
    rail.querySelectorAll('.rail-btn[data-view]').forEach(b => {
      b.addEventListener('mouseenter', () => { if (!on()) return; const p = PAGES[b.dataset.view]; if (!p) return; const tip = $t('tdTip'), r = b.getBoundingClientRect(); tip.innerHTML = `<b>${p[0]}</b><small>${p[1]}</small>`; tip.style.top = (r.top + r.height / 2) + 'px'; tip.style.left = (r.right + 10) + 'px'; tip.classList.add('on'); });
      b.addEventListener('mouseleave', () => $t('tdTip')?.classList.remove('on'));
    });
  }

  // ================= on / off =================
  function on() { return ls.get('kairo.tidy', true); }
  function set(v) {
    ls.set('kairo.tidy', !!v);
    document.body.classList.toggle('tidy', !!v);
    mountToday();
    window.toast?.(v ? 'Aufgeräumter Modus an' : 'Aufgeräumter Modus aus – alle Buttons wie vorher');
  }
  function init() {
    document.body.classList.toggle('tidy', on());
    mountRail(); mountComposer(); mountSuggest();
    // Today is drawn later by other modules: add our card once it exists, and again when it is redrawn
    const tryToday = () => { if (document.querySelector('#view-today .today-grid') && !$t('tdFav')) mountToday(); };
    tryToday(); setInterval(tryToday, 1500);
  }
  setTimeout(init, 600);
  return { open: openFinder, set, isOn: on };
})();
