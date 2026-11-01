// Roblox Studio assistant: describe it -> Kairo plans parts + scripts -> 3D preview -> one click builds it in Studio.
window.RobloxUI = (function () {
  const $r = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PLANGS = [['de', 'DE'], ['en', 'EN'], ['sq', 'SQ'], ['fr', 'FR'], ['es', 'ES'], ['it', 'IT'], ['tr', 'TR']];
  const pLang = () => { try { return localStorage.getItem('kairo.promptLang') || (window.App?.settings?.()?.language || 'de'); } catch { return 'de'; } };
  const setPLang = l => { try { localStorage.setItem('kairo.promptLang', l); } catch {} };
  const IDEAS = ['Obby mit 10 Levels, Checkpoints und Lava', 'Kleines Haus mit Möbeln und Garten', 'Coins zum Einsammeln mit Punkte-Leaderboard', 'Tag-Nacht-Zyklus', 'Tür, die sich bei Berührung öffnet', 'Turm-Parkour mit Neon-Plattformen', 'Rennstrecke mit Startlinie', 'Shop-GUI mit Coins'];
  let P = null, mode = 'build', timer = 0, three = null;
  function open(prompt, opts = {}) {
    let el = $r('rbOverlay');
    if (!el) { document.body.insertAdjacentHTML('beforeend', '<div class="xo rbo" id="rbOverlay"></div>'); el = $r('rbOverlay'); }
    requestAnimationFrame(() => el.classList.add('on'));
    el.innerHTML = `<div class="rb-wrap"><button class="fx-x rb-x" id="rbX">✕</button>
      <aside class="rb-side"><div class="rb-head"><span>${ic('gamepad-2')}</span><div><small>Kairo ×</small><b>Roblox Studio</b></div></div>
        <div class="rb-status" id="rbStatus"><span class="rb-dot"></span><b>Prüfe Verbindung…</b></div>
        <div class="rb-install" id="rbInstall" hidden></div>
        <label class="rb-lbl">Was soll Kairo bauen?</label>
        <textarea class="field" id="rbQ" rows="3" placeholder="z. B. Ein Obby mit 10 Levels, Checkpoints und Lava, die tötet"></textarea>
        <div class="rb-modes" id="rbModes"><button data-m="build" class="on">${ic('pickaxe')} Bauen + Skripte</button><button data-m="script">${ic('terminal')} Nur Skript</button></div>
        <button class="btn primary rb-go" id="rbGo">${ic('wand-sparkles')} Bauplan erstellen</button>
        <label class="rb-lbl rb-plbl">Als KI-Prompt (für Claude, ChatGPT …)</label>
        <div class="rb-pmodes"><button class="btn rb-pbtn" id="rbRemake" title="Das gleiche Spiel nochmal bauen – gleiches Gameplay, gleiches Aussehen, neuer Name">${ic('copy')}<span><b>Remake</b><small>sieht gleich aus</small></span></button>
        <button class="btn rb-pbtn" id="rbPrompt" title="Ein eigenes Spiel im Stil dieses Spiels – gleiche Art von Mechaniken, aber neue Idee">${ic('sparkles')}<span><b>Im Stil von</b><small>eigenes Spiel</small></span></button></div>
        <div class="rb-langs" id="rbLangs" title="Sprache des Prompts"><span>Prompt-Sprache</span>${PLANGS.map(([k, n]) => `<button data-l="${k}" class="${k === pLang() ? 'on' : ''}">${n}</button>`).join('')}</div>
        <button class="btn rb-pbtn rb-ibtn" id="rbIdeas" title="Kairo erfindet 3 komplett neue Roblox-Spiele (optional mit deinem Wunsch im Feld oben)">${ic('lightbulb')} Eigene Spielidee erfinden</button>
        <button class="btn rb-pbtn rb-ibtn" id="rbTrends" title="Welche Roblox-Spiele gerade explodieren – echte Spielerzahlen">${ic('trending-up')} Trend-Radar</button>
        <button class="btn rb-pbtn" id="rbPaste" title="Antwort von ChatGPT oder Claude einfügen – Kairo legt alle Dateien in Studio an">${ic('clipboard-list')} KI-Antwort einfügen</button>
        <div class="rb-ideas">${IDEAS.map(i => `<button>${esc(i)}</button>`).join('')}</div></aside>
      <section class="rb-main" id="rbMain"><div class="rb-empty"><div class="rb-cubes">${'<i></i>'.repeat(9)}</div><b>Hier erscheint die 3D-Vorschau</b><small>Erst ansehen, dann mit einem Klick in Roblox Studio bauen. Alles geht mit Ctrl+Z rückgängig.</small></div></section></div>`;
    $r('rbX').onclick = close;
    $r('rbTrends').onclick = () => Power.trends();
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; el.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelectorAll('.rb-ideas button').forEach(b => b.onclick = () => { $r('rbQ').value = b.textContent; make(); });
    $r('rbGo').onclick = make;
    $r('rbPrompt').onclick = () => promptOnPage();
    $r('rbRemake').onclick = remakeName;
    $r('rbIdeas').onclick = () => ideasOnPage($r('rbQ').value.trim());
    $r('rbPaste').onclick = pasteOnly;
    $r('rbLangs').querySelectorAll('[data-l]').forEach(b => b.onclick = () => { setPLang(b.dataset.l); $r('rbLangs').querySelectorAll('[data-l]').forEach(x => x.classList.toggle('on', x === b)); });
    poll(); clearInterval(timer); timer = setInterval(poll, 2000);
    if (opts.ideas) { if (prompt) $r('rbQ').value = prompt; ideasOnPage(prompt || ''); }
    else if (prompt) { $r('rbQ').value = prompt; make(); }
  }
  function close() { clearInterval(timer); stop3d(); const el = $r('rbOverlay'); if (!el) return; el.classList.remove('on'); setTimeout(() => el.remove(), 400); }
  async function poll() {
    const r = await window.kairo.roblox.status(); if (!r.ok || !$r('rbStatus')) return;
    const st = $r('rbStatus');
    st.className = 'rb-status ' + (r.connected ? 'on' : r.installed ? 'wait' : 'off');
    st.innerHTML = `<span class="rb-dot"></span><div><b>${r.connected ? 'Mit Roblox Studio verbunden' : r.installed ? 'Warte auf Roblox Studio…' : 'Plugin noch nicht installiert'}</b><small>${r.connected ? 'Ort: ' + esc(r.studio?.place || '') + (r.studio?.selection?.length ? ' · ausgewählt: ' + esc(r.studio.selection.slice(0, 2).join(', ')) : '') : r.installed ? 'Studio öffnen (oder neu starten) und einen Ort öffnen' : 'Einmal installieren, dann Studio neu starten'}</small></div>`;
    const ins = $r('rbInstall');
    ins.hidden = r.connected;
    if (!r.connected) ins.innerHTML = `${r.installed ? '' : `<button class="btn primary" id="rbInst">${ic('download')} Plugin installieren</button>`}
      <ol><li>${r.installed ? '✓ Plugin ist installiert' : 'Auf „Plugin installieren“ klicken'}</li><li>Roblox Studio öffnen oder <b>neu starten</b></li><li>Oben im Tab <b>Plugins</b> ist der Knopf <b>Kairo</b> – er muss blau (an) sein</li><li>Beim ersten Mal fragt Studio, ob das Plugin auf <b>127.0.0.1</b> zugreifen und Skripte einfügen darf → <b>Erlauben</b></li></ol>`;
    $r('rbInst') && ($r('rbInst').onclick = async () => { const x = await window.kairo.roblox.install(); window.toast(x.ok ? 'Plugin installiert – jetzt Roblox Studio (neu) starten' : '✕ ' + x.error.message); poll(); });
    const b = $r('rbBuild'); if (b) b.disabled = !r.connected;
  }
  async function make() {
    const q = $r('rbQ').value.trim(); if (!q) return window.toast('Beschreib zuerst, was gebaut werden soll');
    stop3d();
    $r('rbMain').innerHTML = `<div class="rb-wait"><div class="rb-cubes spin">${'<i></i>'.repeat(9)}</div><b>Kairo plant deinen Bau…</b><small>${esc(q)}</small></div>`;
    $r('rbGo').disabled = true;
    const r = await window.kairo.roblox.plan({ prompt: q, mode });
    $r('rbGo').disabled = false;
    if (!$r('rbMain')) return;
    if (!r.ok) { $r('rbMain').innerHTML = `<div class="rb-wait"><b>✕ ${esc(r.error.message)}</b></div>`; return; }
    P = r.plan; show();
  }
  function show() {
    const conn = $r('rbStatus')?.classList.contains('on');
    $r('rbMain').innerHTML = `<div class="rb-top"><div><small>Bauplan</small><h2>${esc(P.title)}</h2><p>${esc(P.summary || '')}</p></div>
        <div class="rb-stats"><span>${ic('box')} ${P.parts.length} Teile</span><span>${ic('terminal')} ${P.scripts.length} Skripte</span></div></div>
      ${P.parts.length ? '<div class="rb-3d" id="rb3d"></div>' : ''}
      <div class="rb-act"><button class="btn primary" id="rbBuild" ${conn ? '' : 'disabled'}>${ic('pickaxe')} In Roblox Studio bauen</button><button class="btn" id="rbAgain">${ic('refresh-cw')} Neuer Plan</button><span class="rb-hint">${conn ? 'Wird vor deiner Kamera gebaut · Ctrl+Z macht es rückgängig' : 'Zuerst Roblox Studio verbinden'}</span></div><div id="rbLog"></div>
      ${P.scripts.length ? `<h3>Skripte</h3><div class="rb-scripts">${P.scripts.map((s, i) => `<details ${i === 0 ? 'open' : ''}><summary>${ic('file-text')}<b>${esc(s.name)}</b><small>${esc(s.type)} · ${esc(s.parent)}</small></summary><pre>${esc(s.source)}</pre></details>`).join('')}</div>` : ''}
      ${P.test?.length ? `<h3>So testest du es</h3><ol class="rb-test">${P.test.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}`;
    $r('rbAgain').onclick = make;
    $r('rbBuild').onclick = async () => {
      const b = $r('rbBuild'); b.disabled = true; b.innerHTML = `<span class="pro-spin"></span> Baue in Studio…`;
      const r = await window.kairo.roblox.build(P);
      b.disabled = false; b.innerHTML = `${ic('pickaxe')} Nochmal bauen`;
      const res = r.ok ? r.result : null;
      $r('rbLog').innerHTML = r.ok && res.ok ? `<div class="rb-ok">${ic('circle-check')}<div><b>In Roblox Studio gebaut!</b>${(res.log || []).map(l => `<small>${esc(l)}</small>`).join('')}</div></div>` : `<div class="rb-err">${ic('triangle-alert')}<div><b>Hat nicht geklappt</b><small>${esc(r.ok ? (res.log || []).join(' ') : r.error.message)}</small></div></div>`;
      if (r.ok && res.ok) window.Party?.fireworks?.('Gebaut!', P.title, 3500);
    };
    if (P.parts.length) preview();
  }
  // 3D preview of the parts with three.js, slowly rotating
  function preview() {
    const box = $r('rb3d'); if (!box || !window.THREE) return;
    const T = window.THREE, w = box.clientWidth, h = box.clientHeight;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(devicePixelRatio); renderer.setSize(w, h); box.appendChild(renderer.domElement);
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(45, w / h, 0.5, 5000);
    scene.add(new T.HemisphereLight(0xbfdfff, 0x30281e, 1.1)); const sun = new T.DirectionalLight(0xffffff, 1.1); sun.position.set(80, 160, 60); scene.add(sun);
    const group = new T.Group(); scene.add(group);
    const min = new T.Vector3(Infinity, Infinity, Infinity), max = new T.Vector3(-Infinity, -Infinity, -Infinity);
    P.parts.forEach((p, i) => {
      const s = (p.size || [4, 4, 4]).map(Number), pos = (p.pos || [0, 0, 0]).map(Number);
      const geo = p.shape === 'Ball' ? new T.SphereGeometry(s[0] / 2, 18, 14) : p.shape === 'Cylinder' ? new T.CylinderGeometry(s[1] / 2, s[1] / 2, s[0], 20) : new T.BoxGeometry(s[0], s[1], s[2]);
      const neon = /neon/i.test(p.material || '');
      const mat = new T.MeshStandardMaterial({ color: p.color || '#cccccc', roughness: /metal|foil/i.test(p.material || '') ? .3 : .8, metalness: /metal|foil/i.test(p.material || '') ? .6 : 0, emissive: neon ? (p.color || '#ffffff') : '#000000', emissiveIntensity: neon ? .8 : 0, transparent: (+p.transparency || 0) > 0 || /glass/i.test(p.material || ''), opacity: /glass/i.test(p.material || '') ? .45 : 1 - (+p.transparency || 0) });
      const m = new T.Mesh(geo, mat);
      m.position.set(pos[0], pos[1], pos[2]);
      if (p.shape === 'Cylinder') m.rotation.z = Math.PI / 2;
      if (p.rot) m.rotation.set(...(p.rot.map(x => (+x || 0) * Math.PI / 180)));
      m.scale.setScalar(0.001); m.userData.delay = i * 12;
      group.add(m);
      min.min(new T.Vector3(pos[0] - s[0] / 2, pos[1] - s[1] / 2, pos[2] - s[2] / 2)); max.max(new T.Vector3(pos[0] + s[0] / 2, pos[1] + s[1] / 2, pos[2] + s[2] / 2));
    });
    const c = min.clone().add(max).multiplyScalar(.5), size = max.clone().sub(min).length() || 50;
    group.position.sub(c); group.position.y += (max.y - min.y) / 2 - (c.y - min.y);
    const grid = new T.GridHelper(Math.max(100, size * 1.4), 24, 0x3a4152, 0x22262f); grid.position.y = -(c.y - min.y) + min.y - min.y; scene.add(grid);
    let t0 = performance.now(), raf = 0;
    const frame = now => {
      if (!document.body.contains(renderer.domElement)) { renderer.dispose(); return; }
      const el = (now - t0);
      group.children.forEach(m => { const k = Math.min(1, Math.max(0, (el - m.userData.delay) / 350)); m.scale.setScalar(k < 1 ? 1 - Math.pow(1 - k, 3) : 1); });
      const a = el / 9000; cam.position.set(Math.cos(a) * size * .95, size * .55, Math.sin(a) * size * .95); cam.lookAt(0, 0, 0);
      renderer.render(scene, cam); raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    three = { renderer, stop: () => cancelAnimationFrame(raf) };
  }
  function stop3d() { if (three) { three.stop(); three.renderer.dispose(); three = null; } }

  // ---------- big prompt for another AI ----------
  const AIS = [['claude', 'Claude'], ['chatgpt', 'ChatGPT'], ['gemini', 'Gemini']];
  // Kairo invents 3 original game ideas -> pick one -> big prompt or a prototype in Studio
  async function ideasOnPage(wish) {
    stop3d();
    $r('rbMain').innerHTML = `<div class="rb-wait"><div class="rb-cubes spin">${'<i></i>'.repeat(9)}</div><b>Kairo erfindet Spielideen…</b><small>schaut zuerst, was auf Roblox gerade beliebt ist</small></div>`;
    const r = await window.kairo.roblox.ideas({ wish: wish || '' });
    if (!$r('rbMain')) return;
    if (!r.ok) { $r('rbMain').innerHTML = `<div class="rb-wait"><b>✕ ${esc(r.error.message)}</b></div>`; return; }
    $r('rbMain').innerHTML = `<div class="rb-top"><div><small>Kairos eigene Ideen</small><h2>3 neue Roblox-Spiele</h2><p>Komplett neu erfunden – wähle eine aus.</p></div><button class="btn" id="rbMore">${ic('refresh-cw')} Neue Ideen</button></div>
      <div class="rb-ideas3">${r.ideas.map((x, i) => `<div class="rb-idea" style="--c:${esc(/^#[0-9a-f]{6}$/i.test(x.color) ? x.color : '#ff7a45')};animation-delay:${i * 120}ms">
        <small>${esc(x.genre)}</small><h3>${esc(x.name)}</h3><p class="rb-pitch">${esc(x.pitch)}</p>
        <div class="rb-ib"><b>So spielt man</b><p>${esc(x.loop)}</p></div>
        <div class="rb-ib"><b>Macht süchtig</b><ul>${(x.hooks || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>
        <div class="rb-ib twist"><b>${ic('sparkles')} Das gibt es sonst nirgends</b><p>${esc(x.twist)}</p></div>
        <div class="rb-ib"><b>Mit Freunden</b><p>${esc(x.social)}</p></div>
        <p class="rb-why">${ic('trending-up')} ${esc(x.why)}</p>
        <div class="rb-iact"><button class="btn primary" data-p="${i}">${ic('message-circle')} Grosser KI-Prompt</button><button class="btn" data-b="${i}">${ic('pickaxe')} Prototyp in Studio</button></div></div>`).join('')}</div>`;
    $r('rbMore').onclick = () => ideasOnPage(wish);
    $r('rbMain').querySelectorAll('[data-p]').forEach(b => b.onclick = () => promptOnPage(r.ideas[+b.dataset.p]));
    $r('rbMain').querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const x = r.ideas[+b.dataset.b]; $r('rbQ').value = `Prototyp für mein Spiel "${x.name}": ${x.pitch} ${x.loop} Baue die Start-Map und die wichtigste Mechanik.`; make(); });
  }
  // Remake: first choose the new name (examples or an own one)
  function remakeName() {
    const q = $r('rbQ').value.trim(); if (!q) return window.toast('Schreib den Namen des Spiels oder deine Idee');
    stop3d();
    const opts = [`${q} 2`, `${q}: The End`, `${q} Reborn`, `Super ${q}`, `${q} Remastered`, `${q} X`];
    $r('rbMain').innerHTML = `<div class="rb-names"><div class="rb-top"><div><small>Remake · ${esc(q)}</small><h2>Wie soll dein Remake heissen?</h2><p>Das Spiel wird gleich wie das Original – nur der Name ist neu. Wähl einen Vorschlag oder schreib einen eigenen.</p></div></div>
      <div class="rb-nopts">${opts.map((n, i) => `<button data-n="${esc(n)}" class="${i ? '' : 'on'}" style="animation-delay:${i * 60}ms">${esc(n)}</button>`).join('')}</div>
      <label class="rb-lbl">Eigener Name</label><input class="field" id="rbNName" maxlength="60" placeholder="z. B. Egg Heist Deluxe" value="${esc(opts[0])}">
      <button class="btn primary rb-go" id="rbNGo">${ic('wand-sparkles')} Remake-Prompt erstellen</button>
      <small class="rb-nhint">Tipp: Ein eigener Name ist am besten – Roblox mag keine Spiele, die so tun, als wären sie das Original.</small></div>`;
    const inp = $r('rbNName');
    $r('rbMain').querySelectorAll('[data-n]').forEach(b => b.onclick = () => { inp.value = b.dataset.n; $r('rbMain').querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', x === b)); });
    inp.oninput = () => $r('rbMain').querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', x.dataset.n === inp.value));
    const go = () => promptOnPage(null, { mode: 'remake', newName: inp.value.trim() || opts[0] });
    $r('rbNGo').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    inp.focus(); inp.select();
  }
  async function promptOnPage(idea, opt = {}) {
    if (idea instanceof Event) idea = null;
    const remake = opt.mode === 'remake';
    const q = idea ? idea.name : $r('rbQ').value.trim(); if (!q) return window.toast('Schreib den Namen des Spiels oder deine Idee');
    stop3d();
    $r('rbMain').innerHTML = `<div class="rb-wait"><div class="rb-cubes spin">${'<i></i>'.repeat(9)}</div><b id="rbPStep">${idea ? 'Schreibe den grossen Prompt…' : 'Recherchiere das Spiel…'}</b><small>${esc(q)}</small></div>`;
    const off = window.kairo.roblox.onPromptStep(s => { const el = $r('rbPStep'); if (el) el.textContent = s === 'write' || idea ? 'Schreibe den grossen Prompt…' : 'Recherchiere das Spiel…'; });
    const r = await window.kairo.roblox.prompt(idea ? { idea, lang: pLang() } : { game: q, lang: pLang(), mode: remake ? 'remake' : 'style', newName: opt.newName }); usedLang = pLang();
    off?.();
    if (!$r('rbMain')) return;
    if (!r.ok) { $r('rbMain').innerHTML = `<div class="rb-wait"><b>✕ ${esc(r.error.message)}</b></div>`; return; }
    $r('rbMain').innerHTML = `<div class="rb-top"><div><small>${remake ? 'Remake-Prompt' : 'KI-Prompt'} · ${esc(r.platform)}</small><h2>${esc(r.name || (idea ? q : 'Prompt für ' + q))}</h2><p>${idea ? 'Kairos eigene Spielidee.' : remake ? `Remake von „${esc(q)}“ – gleiches Spiel, neuer Name.` : `Inspiriert von „${esc(q)}“ – als eigenes Spiel.`} ${Math.round(r.chars / 1000)}k Zeichen · gespeichert in Dokumente → Kairo → Prompts</p></div></div>
      <div class="rb-act"><button class="btn primary" id="rbPCopy">${ic('copy')} Prompt kopieren</button>${AIS.map(([k, n]) => `<button class="btn" data-ai="${k}">${ic('external-link')} In ${n} öffnen</button>`).join('')}</div>
      ${r.research ? `<details class="rb-research"><summary>${ic('search')} Was Kairo über das Spiel herausgefunden hat</summary><div class="md">${window.renderMarkdown ? window.renderMarkdown(r.research) : esc(r.research)}</div></details>` : ''}
      ${howToBuild(r.prompt)}
      <h3>Der Prompt</h3><div class="rb-prompt md">${window.renderMarkdown ? window.renderMarkdown(r.prompt) : `<pre>${esc(r.prompt)}</pre>`}</div>`;
    bindHow(r.prompt);
    $r('rbPCopy').onclick = () => { navigator.clipboard.writeText(r.prompt); window.toast('Prompt kopiert – jetzt in eine KI einfügen (Ctrl+V)'); };
    $r('rbMain').querySelectorAll('[data-ai]').forEach(b => b.onclick = async () => { const x = await window.kairo.prompt.open(b.dataset.ai, r.prompt); window.toast(x.ok && x.prefilled ? `${x.target} ist offen – Prompt ist drin` : `${(x.ok && x.target) || 'KI'} ist offen – Prompt ist kopiert: Ctrl+V und Enter`); });
  }
  // ---------- "Wie willst du bauen?" ----------
  const ADD_CONNECTED = `\n\n## Arbeitsweise: Du bist direkt mit Roblox Studio verbunden\nDu hast über MCP (Roblox Studio MCP) direkten Zugriff auf mein geöffnetes Roblox Studio. Schreib den Code nicht nur in den Chat – lege alles selbst in Studio an:\n1. Lege zuerst die komplette Ordnerstruktur an (Folders in den richtigen Services).\n2. Erstelle jedes Skript als richtiges Objekt (Script, LocalScript oder ModuleScript) am richtigen Ort und setze den kompletten Code.\n3. Baue die Map und die nötigen Teile direkt im Workspace.\n4. Starte nach jeder Phase einen Playtest, lies die Output-Konsole und behebe alle Fehler, bevor du weitermachst.\n5. Fasse nach jeder Phase kurz zusammen, was du gebaut hast, und warte auf mein „weiter“.\nLösche oder ändere nichts, was schon vorher in meinem Spiel war, ohne mich zu fragen.`;
  const ADD_FORMAT = `\n\n## Ausgabeformat (sehr wichtig – meine App fügt deine Antwort automatisch in Roblox Studio ein)\nGib JEDE Datei einzeln so aus: zuerst eine Zeile \`-- Datei: <Pfad>\`, direkt danach genau ein \`\`\`lua Codeblock mit dem KOMPLETTEN Code der Datei.\nDer Pfad beginnt mit dem Roblox-Service und endet mit Skriptname + Endung: \`.server.lua\` = Script, \`.client.lua\` = LocalScript, \`.lua\` = ModuleScript.\nBeispiele: \`-- Datei: ServerScriptService/Services/DataService.lua\`, \`-- Datei: ServerScriptService/Main.server.lua\`, \`-- Datei: StarterPlayer/StarterPlayerScripts/UIController.client.lua\`.\nOrdner im Pfad werden automatisch angelegt. Teile und Map beschreibst du nicht als Code, sondern baust sie per Skript (z. B. ein MapBuilder.server.lua, das die Map beim Start erzeugt).`;
  const ADD_ASSISTANT = `\n\n## Arbeitsweise\nArbeite in kleinen Schritten: erledige immer nur EINE Phase, erstelle die Skripte direkt in Studio und warte dann auf „weiter“.`;
  let usedLang = 'de';
  const EN_ADD = {
    connected: `\n\n## How to work: you are connected directly to Roblox Studio\nYou have direct access to my open Roblox Studio through MCP (Roblox Studio MCP). Do not only write code in the chat – create everything in Studio yourself:\n1. First create the complete folder structure (Folders in the right services).\n2. Create every script as a real object (Script, LocalScript or ModuleScript) in the right place with its complete code.\n3. Build the map and needed parts directly in Workspace.\n4. After each phase start a playtest, read the Output console and fix every error before you continue.\n5. After each phase give a short summary and wait for my "continue".\nDo not delete or change anything that was already in my game without asking me.`,
    format: `\n\n## Output format (very important – my app inserts your answer into Roblox Studio automatically)\nOutput EVERY file separately: first a line \`-- File: <path>\`, directly followed by exactly one \`\`\`lua code block with the COMPLETE code of the file.\nThe path starts with the Roblox service and ends with the script name + extension: \`.server.lua\` = Script, \`.client.lua\` = LocalScript, \`.lua\` = ModuleScript.\nExamples: \`-- File: ServerScriptService/Services/DataService.lua\`, \`-- File: ServerScriptService/Main.server.lua\`, \`-- File: StarterPlayer/StarterPlayerScripts/UIController.client.lua\`.\nFolders in the path are created automatically. Build the map and parts with a script (e.g. MapBuilder.server.lua that creates the map on start).`,
    assistant: `\n\n## How to work\nWork in small steps: do only ONE phase at a time, create the scripts directly in Studio and then wait for "continue".`
  };
  const addOn = k => usedLang === 'de' ? { connected: ADD_CONNECTED, format: ADD_FORMAT, assistant: ADD_ASSISTANT }[k] : EN_ADD[k];
  function howToBuild(prompt) {
    return `<h3>Wie willst du bauen?</h3><div class="rb-how">
      <button data-how="connected"><span>${ic('zap')}</span><b>Meine KI ist mit Studio verbunden</b><small>Die KI legt alles selbst an, testet und repariert Fehler. Am stärksten.</small></button>
      <button data-how="paste"><span>${ic('wand-sparkles')}</span><b>KI-Antwort einfügen – Kairo baut es</b><small>Antwort von ChatGPT/Claude reinkopieren, Kairo legt alle Dateien in Studio an.</small></button>
      <button data-how="assistant"><span>${ic('sparkles')}</span><b>Roblox Assistant in Studio</b><small>Der eingebaute KI-Assistent von Roblox, Schritt für Schritt.</small></button>
      <button data-how="manual"><span>${ic('list-checks')}</span><b>Von Hand</b><small>Liste: welche Datei wohin, mit Kopieren-Knopf pro Datei.</small></button></div><div id="rbHow"></div>`;
  }
  function bindHow(prompt) {
    const root = $r('rbMain'); if (!root) return;
    const copyOpen = (text, note) => `<div class="rb-howbox">${note}<div class="rb-act"><button class="btn primary" data-cp>${ic('copy')} Prompt kopieren</button>${AIS.map(([k, n]) => `<button class="btn" data-op="${k}">${ic('external-link')} In ${n} öffnen</button>`).join('')}</div></div>`;
    const bindCO = text => { const box = $r('rbHow'); box.querySelector('[data-cp]').onclick = () => { navigator.clipboard.writeText(text); window.toast('Prompt kopiert'); }; box.querySelectorAll('[data-op]').forEach(b => b.onclick = async () => { const x = await window.kairo.prompt.open(b.dataset.op, text); window.toast(x.ok && x.prefilled ? `${x.target} ist offen – Prompt ist drin` : `${(x.ok && x.target) || 'KI'} ist offen – Ctrl+V und Enter`); }); };
    root.querySelectorAll('[data-how]').forEach(b => b.onclick = () => {
      root.querySelectorAll('[data-how]').forEach(x => x.classList.toggle('on', x === b));
      const how = b.dataset.how, box = $r('rbHow');
      if (how === 'connected') {
        const text = prompt + addOn('connected');
        box.innerHTML = copyOpen(text, `<p><b>So geht's:</b> Die KI muss über <b>Roblox Studio MCP</b> mit Studio verbunden sein, zum Beispiel <b>Claude Desktop</b>, <b>Claude Code</b> oder <b>Cursor</b> mit dem offiziellen Roblox-Studio-MCP (Anleitung: create.roblox.com → „Studio MCP“). Dann Studio mit deinem Spiel öffnen und den Prompt unten in diese KI geben. Der Prompt sagt ihr schon, dass sie alles selbst anlegen, testen und reparieren soll.</p><p class="rb-tipline">${ic('lightbulb')} Bei dir ist das in Claude Code schon eingerichtet – du kannst den Prompt auch einfach dort reinkopieren, während Studio offen ist.</p>`);
        bindCO(text);
      }
      if (how === 'assistant') {
        const text = prompt + addOn('assistant');
        box.innerHTML = copyOpen(text, `<p><b>So geht's:</b> In Roblox Studio oben auf <b>Assistant</b> klicken, Prompt einfügen, und nach jeder Phase „weiter“ schreiben. Der Assistant schafft kleine Schritte am besten – bei einem grossen Spiel ist Weg 1 oder 2 stärker.</p>`);
        bindCO(text);
      }
      if (how === 'paste' || how === 'manual') {
        const text = prompt + addOn('format');
        box.innerHTML = copyOpen(text, `<p><b>Schritt 1:</b> Diesen Prompt (mit Spezial-Format, damit Kairo die Dateien erkennt) in ChatGPT oder Claude geben.<br><b>Schritt 2:</b> Die <b>ganze Antwort</b> kopieren und unten einfügen.${how === 'paste' ? ' Kairo legt dann alle Dateien in Studio an.' : ' Kairo zeigt dir dann, welche Datei wohin gehört.'}</p>`) + pasteBox(how);
        bindCO(text); bindPaste(how);
      }
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  const pasteBox = how => `<div class="rb-paste"><label>${ic('clipboard-list')} Antwort der KI hier einfügen</label><textarea class="field" id="rbAns" rows="7" placeholder="Hier die komplette Antwort von ChatGPT / Claude einfügen (Ctrl+V) …"></textarea><button class="btn primary" id="rbParse">${ic('scan-search')} Dateien erkennen</button><div id="rbFiles"></div></div>`;
  function bindPaste(how) {
    $r('rbParse').onclick = () => {
      const files = parseFiles($r('rbAns').value);
      const out = $r('rbFiles');
      if (!files.length) { out.innerHTML = `<p class="rb-warn">${ic('triangle-alert')} Keine Dateien erkannt. Die Antwort braucht Zeilen wie <code>-- Datei: ServerScriptService/Main.server.lua</code> vor jedem Code-Block – nimm den Prompt von oben, der sagt der KI das Format.</p>`; return; }
      const conn = $r('rbStatus')?.classList.contains('on');
      out.innerHTML = `<div class="rb-flist-h"><b>${files.length} Dateien erkannt</b>${how === 'paste' ? `<button class="btn primary" id="rbInsertAll" ${conn ? '' : 'disabled'}>${ic('pickaxe')} Alle in Roblox Studio einfügen</button>` : ''}</div>
        ${how === 'paste' && !conn ? `<p class="rb-warn">${ic('triangle-alert')} Zuerst Roblox Studio verbinden (links oben siehst du den Status).</p>` : ''}
        <div class="rb-flist">${files.map((f, i) => `<div class="rb-file"><span class="rb-ft ${f.type}">${f.type === 'Script' ? 'S' : f.type === 'LocalScript' ? 'L' : 'M'}</span><div><b>${esc(f.name)}</b><small>${esc(f.path.join(' › '))} · ${esc(f.type)} · ${f.source.split('\n').length} ${f.source.split('\n').length === 1 ? 'Zeile' : 'Zeilen'}</small></div><button class="btn" data-cf="${i}" title="Code kopieren">${ic('copy')}</button></div>`).join('')}</div>
        ${how === 'manual' ? `<p class="rb-tipline">${ic('lightbulb')} In Studio im Explorer: Rechtsklick auf den Ordner → <b>Insert Object</b> → Script / LocalScript / ModuleScript, umbenennen, Code einfügen. Fehlende Ordner mit <b>Insert Object → Folder</b> anlegen.</p>` : ''}`;
      out.querySelectorAll('[data-cf]').forEach(b => b.onclick = () => { navigator.clipboard.writeText(files[+b.dataset.cf].source); window.toast(files[+b.dataset.cf].name + ' kopiert'); });
      $r('rbInsertAll') && ($r('rbInsertAll').onclick = async () => {
        const b = $r('rbInsertAll'); b.disabled = true; b.innerHTML = `<span class="pro-spin"></span> Füge ein…`;
        const r = await window.kairo.roblox.build({ title: 'KI-Antwort', parts: [], scripts: files.map(f => ({ name: f.name, type: f.type, path: f.path, source: f.source })) });
        b.disabled = false; b.innerHTML = `${ic('pickaxe')} Nochmal einfügen`;
        const res = r.ok ? r.result : null;
        out.insertAdjacentHTML('beforeend', r.ok && res.ok ? `<div class="rb-ok">${ic('circle-check')}<div><b>${files.length} Dateien in Studio eingefügt!</b><small>Mit Ctrl+Z in Studio rückgängig. Jetzt oben auf Play drücken und testen.</small></div></div>` : `<div class="rb-err">${ic('triangle-alert')}<div><b>Hat nicht geklappt</b><small>${esc(r.ok ? (res.log || []).join(' ') : r.error.message)}</small></div></div>`);
      });
    };
  }
  // reads "-- Datei: ServerScriptService/Services/DataService.lua" + ```lua … ``` from an AI answer
  const SERVICES = /(ServerScriptService|ServerStorage|ReplicatedStorage|ReplicatedFirst|StarterPlayer|StarterPlayerScripts|StarterCharacterScripts|StarterGui|StarterPack|Workspace|Lighting|SoundService)/;
  function parseFiles(text) {
    const files = [], rx = /```(?:lua|luau)?[^\n]*\n([\s\S]*?)```/gi;
    let m, last = 0;
    while ((m = rx.exec(text))) {
      const before = text.slice(Math.max(last, m.index - 400), m.index);
      let code = m[1].replace(/\s+$/, '');
      last = m.index + m[0].length;
      // path: in the lines before the block, or a "-- Datei:/File:" comment in the first line of the code
      const first = code.split('\n')[0];
      const cands = [...before.split('\n').reverse(), first].map(l => l.replace(/[*`#>]/g, ' ').trim());
      let raw = null;
      for (const l of cands) { const mm = l.match(/(?:game[./])?((?:ServerScriptService|ServerStorage|ReplicatedStorage|ReplicatedFirst|StarterPlayer|StarterGui|StarterPack|Workspace|Lighting|SoundService)[\w./\\ >-]*)/); if (mm) { raw = mm[1].trim(); break; } }
      if (!raw) continue;
      if (/^--\s*(datei|file)\s*:/i.test(first)) code = code.split('\n').slice(1).join('\n');
      let type = /\.server\.(lua|luau)$/i.test(raw) ? 'Script' : /\.client\.(lua|luau)$/i.test(raw) ? 'LocalScript' : null;
      raw = raw.replace(/\s*\((Script|LocalScript|ModuleScript)\)\s*$/i, (x, t) => { type = type || t; return ''; }).replace(/\.(server|client)?\.?(lua|luau)$/i, '').replace(/\.(lua|luau)$/i, '');
      let parts = /[\/\\>]/.test(raw) ? raw.split(/\s*[\/\\>]\s*/) : raw.split('.');
      parts = parts.map(x => x.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      const name = parts.pop();
      if (!type) {
        const near = before.slice(-160), where = parts.join('/'), returnsModule = /\breturn\s+[\w.{}]+\s*$/.test(code);
        if (/LocalScript/.test(near)) type = 'LocalScript';
        else if (/ModuleScript/.test(near)) type = 'ModuleScript';
        else if (/StarterPlayerScripts|StarterCharacterScripts|StarterGui|ReplicatedFirst/.test(where)) type = returnsModule ? 'ModuleScript' : 'LocalScript';
        else if (/^ServerScriptService/.test(where)) type = returnsModule ? 'ModuleScript' : 'Script';
        else type = 'ModuleScript'; // ReplicatedStorage, ServerStorage …
      }
      const i = files.findIndex(f => f.path.join('/') === parts.join('/') && f.name === name);
      const f = { name, path: parts, type, source: code };
      if (i >= 0) files[i] = f; else files.push(f); // the later version of a file wins
    }
    return files;
  }
  // also reachable from the side: paste an answer without making a prompt first
  function pasteOnly() {
    stop3d();
    $r('rbMain').innerHTML = `<div class="rb-top"><div><small>KI-Antwort einfügen</small><h2>Von ChatGPT / Claude nach Studio</h2><p>Füge die komplette Antwort der KI ein. Kairo erkennt alle Dateien und legt sie in Roblox Studio an.</p></div></div>${pasteBox('paste')}`;
    bindPaste('paste');
  }

  // voice: "Mach einen Prompt für Steal an Egg (in ChatGPT)" -> research, write, open the AI with it
  async function voicePrompt(game, target = 'claude', lang, opt = {}) {
    document.getElementById('gpCard')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="gp-card" id="gpCard"><div class="rb-cubes spin">${'<i></i>'.repeat(9)}</div><div><small>KI-Prompt für ${esc(AIS.find(a => a[0] === target)?.[1] || 'KI')}</small><b>${esc(game)}</b><span id="gpStep">Recherchiere das Spiel…</span></div></div>`);
    const off = window.kairo.roblox.onPromptStep(s => { const el = $r('gpStep'); if (el) el.textContent = s === 'write' ? 'Schreibe den grossen Prompt…' : 'Recherchiere das Spiel…'; });
    const r = await window.kairo.roblox.prompt({ game, lang: lang || pLang(), mode: opt.mode, newName: opt.newName });
    off?.();
    const card = $r('gpCard');
    if (!r.ok) { if (card) card.innerHTML = `<div><b>✕ Prompt fehlgeschlagen</b><span>${esc(r.error.message)}</span></div>`; setTimeout(() => card?.remove(), 6000); return null; }
    const x = await window.kairo.prompt.open(target, r.prompt);
    const filled = x.ok && x.prefilled;
    if (card) card.innerHTML = `<span class="gp-ok">${ic('circle-check')}</span><div><small>${esc(x.target || 'KI')} ist offen</small><b>${esc(r.name || game)}</b><span>${filled ? 'Der Prompt ist schon drin – nur noch Enter drücken.' : `Prompt (${Math.round(r.chars / 1000)}k Zeichen) ist kopiert: im Chatfeld <kbd>Ctrl</kbd>+<kbd>V</kbd> und Enter.`}</span></div><button class="gp-x" onclick="this.parentElement.remove()">✕</button>`;
    setTimeout(() => card?.remove(), 20000);
    return { ...r, opened: x.target, prefilled: filled };
  }
  return { open, promptOnPage, voicePrompt, parseFiles };
})();
