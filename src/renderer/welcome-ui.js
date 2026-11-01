// Welcome setup for new users: language, name, choose an AI, get + check the key, done.
// Shown on the first start when no AI key is set. Can be opened again from the finder ("Einrichtung").
window.Welcome = (function () {
  const $w = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = () => window.App.settings();
  const save = p => window.App.saveSettings(p);
  let step = 0, ai = 'gemini', de = true;
  const T = (d, e) => de ? d : e;
  const LANGS = [['de', 'Deutsch'], ['en', 'English'], ['sq', 'Shqip'], ['fr', 'Français'], ['es', 'Español'], ['it', 'Italiano'], ['tr', 'Türkçe']];
  const AIS = {
    gemini: { name: 'Google Gemini', tag: () => T('Gratis · empfohlen', 'Free · recommended'), info: () => T('Kostenlos mit Google-Konto. Auch nötig für das freihändige Sprechen.', 'Free with a Google account. Also needed for hands-free voice.'), url: 'https://aistudio.google.com/apikey', rx: /^AIza[0-9A-Za-z_-]{30,}$/,
      steps: () => [T('Mit deinem Google-Konto anmelden', 'Sign in with your Google account'), T('Auf „Create API key“ klicken', 'Click “Create API key”'), T('Den Schlüssel kopieren (beginnt mit AIza…)', 'Copy the key (starts with AIza…)')] },
    anthropic: { name: 'Claude', tag: () => T('Sehr klug · kostet', 'Very smart · paid'), info: () => T('Von Anthropic. Braucht ein Konto mit Guthaben.', 'By Anthropic. Needs an account with credit.'), url: 'https://console.anthropic.com/settings/keys', rx: /^sk-ant-[0-9A-Za-z_-]{20,}$/,
      steps: () => [T('Bei Anthropic anmelden und Guthaben aufladen', 'Sign in at Anthropic and add credit'), T('„Create Key“ klicken', 'Click “Create Key”'), T('Den Schlüssel kopieren (beginnt mit sk-ant-…)', 'Copy the key (starts with sk-ant-…)')] },
    openai: { name: 'ChatGPT', tag: () => T('Bekannt · kostet', 'Popular · paid'), info: () => T('Von OpenAI. Braucht ein Konto mit Guthaben.', 'By OpenAI. Needs an account with credit.'), url: 'https://platform.openai.com/api-keys', rx: /^sk-[0-9A-Za-z_-]{20,}$/,
      steps: () => [T('Bei OpenAI anmelden und Guthaben aufladen', 'Sign in at OpenAI and add credit'), T('„Create new secret key“ klicken', 'Click “Create new secret key”'), T('Den Schlüssel kopieren (beginnt mit sk-…)', 'Copy the key (starts with sk-…)')] },
    custom: { name: 'Ollama', tag: () => T('Gratis · offline', 'Free · offline'), info: () => T('Läuft komplett auf deinem PC. Braucht einen starken PC.', 'Runs fully on your PC. Needs a strong PC.'), url: 'https://ollama.com/download', steps: () => [T('Ollama herunterladen und installieren', 'Download and install Ollama'), T('Im Terminal: ollama pull llama3.2', 'In a terminal: ollama pull llama3.2'), T('Ollama laufen lassen und hier auf „Prüfen“ klicken', 'Keep Ollama running and click “Check” here')] }
  };

  function needed() {
    const s = S(); if (!s) return false;
    if (s.setupDone) return false;
    return !['anthropic', 'openai', 'gemini'].some(k => s.keys?.[k]) && s.provider !== 'custom';
  }
  function open(force) {
    if (!force && !needed()) return;
    de = (S()?.language || 'de') === 'de';
    step = 0;
    document.getElementById('wlc')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div id="wlc" class="wlc"><div class="wlc-bg"><i></i><i></i><i></i></div><div class="wlc-box"><div class="wlc-dots" id="wlcDots"></div><div class="wlc-stage" id="wlcStage"></div></div><button class="wlc-skip" id="wlcSkip"></button></div>`);
    $w('wlcSkip').onclick = () => { save({ setupDone: true }); close(); };
    requestAnimationFrame(() => $w('wlc').classList.add('on'));
    show(0);
  }
  function close() { const el = $w('wlc'); if (!el) return; el.classList.remove('on'); setTimeout(() => el.remove(), 600); }
  function show(n, back) {
    step = n;
    $w('wlcSkip').textContent = T('Später einrichten', 'Set up later');
    $w('wlcSkip').hidden = n === 4;
    $w('wlcDots').innerHTML = [0, 1, 2, 3, 4].map(i => `<i class="${i < n ? 'done' : i === n ? 'on' : ''}"></i>`).join('');
    const st = $w('wlcStage');
    st.classList.remove('in', 'back'); void st.offsetWidth; st.classList.add('in'); if (back) st.classList.add('back');
    [hello, who, pick, key, done][n](st);
  }
  const nav = (backTo, nextLabel) => `<div class="wlc-nav">${backTo != null ? `<button class="wlc-back" data-back="${backTo}">${T('Zurück', 'Back')}</button>` : '<span></span>'}<button class="wlc-next" id="wlcNext">${nextLabel || T('Weiter', 'Next')} →</button></div>`;
  const bindBack = st => st.querySelectorAll('[data-back]').forEach(b => b.onclick = () => show(+b.dataset.back, true));

  function hello(st) {
    st.innerHTML = `<div class="wlc-orb"><b></b><i></i><i></i><i></i></div>
      <h1>${T('Hallo! Ich bin <em>Kairo</em>.', 'Hi! I am <em>Kairo</em>.')}</h1><p>${T('Dein KI-Assistent für den PC. In 2 Minuten bin ich startklar – ich zeige dir alles.', 'Your AI assistant for the PC. I am ready in 2 minutes – I will show you everything.')}</p>
      <div class="wlc-langs">${LANGS.map(([k, n]) => `<button data-l="${k}" class="${k === (S()?.language || 'de') ? 'on' : ''}">${n}</button>`).join('')}</div>${nav(null, T('Los geht’s', 'Let’s go'))}`;
    st.querySelectorAll('[data-l]').forEach(b => b.onclick = async () => { await save({ language: b.dataset.l }); de = b.dataset.l === 'de'; show(0); });
    $w('wlcNext').onclick = () => show(1);
  }
  function who(st) {
    const s = S();
    st.innerHTML = `<div class="wlc-ic">${ic('hand')}</div><h2>${T('Wie soll ich dich nennen?', 'What should I call you?')}</h2><p>${T('So spreche ich dich an. Die Stadt brauche ich für das Wetter.', 'This is how I will talk to you. The city is for the weather.')}</p>
      <div class="wlc-fields"><label>${T('Dein Name oder Spitzname', 'Your name or nickname')}<input id="wlcName" value="${esc(s.userTitle || '')}" placeholder="${T('z. B. Alex oder Chef', 'e.g. Alex or Boss')}" autocomplete="off"></label>
      <label>${T('Deine Stadt (optional)', 'Your city (optional)')}<input id="wlcCity" value="${esc(s.city || '')}" placeholder="${T('z. B. Zürich', 'e.g. London')}" autocomplete="off"></label></div>${nav(0)}`;
    bindBack(st); setTimeout(() => $w('wlcName')?.focus(), 300);
    $w('wlcNext').onclick = async () => { await save({ userTitle: $w('wlcName').value.trim(), city: $w('wlcCity').value.trim() }); show(2); };
  }
  function pick(st) {
    st.innerHTML = `<h2>${T('Welche KI soll mein Gehirn sein?', 'Which AI should be my brain?')}</h2><p>${T('Du kannst das später jederzeit ändern.', 'You can change this any time.')}</p>
      <div class="wlc-ais">${Object.entries(AIS).map(([k, a]) => `<button data-ai="${k}" class="${k === ai ? 'on' : ''}"><span class="wlc-ai-${k}"></span><div><b>${a.name}</b><small>${a.info()}</small></div><em>${a.tag()}</em></button>`).join('')}</div>${nav(1)}`;
    bindBack(st);
    st.querySelectorAll('[data-ai]').forEach(b => b.onclick = () => { ai = b.dataset.ai; st.querySelectorAll('[data-ai]').forEach(x => x.classList.toggle('on', x === b)); });
    $w('wlcNext').onclick = () => show(3);
  }
  function key(st) {
    const a = AIS[ai], local = ai === 'custom';
    st.innerHTML = `<h2>${local ? T('Ollama verbinden', 'Connect Ollama') : T(`Dein ${a.name}-Schlüssel`, `Your ${a.name} key`)}</h2>
      <p>${local ? T('Die KI läuft dann direkt auf deinem PC.', 'The AI then runs right on your PC.') : T('Ein Schlüssel ist wie ein Passwort für die KI. Er bleibt verschlüsselt auf deinem PC.', 'A key is like a password for the AI. It stays encrypted on your PC.')}</p>
      <button class="wlc-get" id="wlcGet">${local ? T('Ollama herunterladen', 'Download Ollama') : T('Schlüssel holen', 'Get my key')} ↗</button>
      <ol class="wlc-steps">${a.steps().map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      ${local ? '' : `<div class="wlc-key"><input id="wlcKey" type="password" placeholder="${T('Schlüssel hier einfügen', 'Paste the key here')}" autocomplete="off" spellcheck="false"><button id="wlcPaste">${T('Einfügen', 'Paste')}</button></div>`}
      <div class="wlc-msg" id="wlcMsg"></div>${nav(2, local ? T('Prüfen', 'Check') : T('Prüfen & speichern', 'Check & save'))}`;
    bindBack(st);
    $w('wlcGet').onclick = () => window.kairo.action({ type: 'open', url: a.url });
    $w('wlcPaste') && ($w('wlcPaste').onclick = async () => { try { $w('wlcKey').value = (await navigator.clipboard.readText()).trim(); } catch {} });
    const msg = (t, cls) => { $w('wlcMsg').className = 'wlc-msg ' + (cls || ''); $w('wlcMsg').innerHTML = t; };
    $w('wlcNext').onclick = async () => {
      const b = $w('wlcNext');
      if (!local) {
        const v = $w('wlcKey').value.trim();
        if (!v) return msg(T('Füge zuerst den Schlüssel ein.', 'Paste the key first.'), 'err');
        if (a.rx && !a.rx.test(v)) msg(T('Hmm, der Schlüssel sieht ungewöhnlich aus – ich probiere es trotzdem.', 'Hmm, this key looks unusual – I will try anyway.'), 'warn');
        b.disabled = true; b.textContent = T('Prüfe …', 'Checking …');
        await save({ provider: ai, keys: { [ai]: v } });
      } else {
        b.disabled = true; b.textContent = T('Prüfe …', 'Checking …');
        await save({ provider: 'custom', customBaseUrl: S().customBaseUrl || 'http://localhost:11434/v1' });
      }
      const r = await window.kairo.models(ai);
      b.disabled = false; b.textContent = local ? T('Prüfen', 'Check') : T('Prüfen & speichern', 'Check & save');
      if (r.ok && r.models?.length) {
        if (local && !S().models?.custom) await save({ models: { custom: r.models[0] } });
        msg('✓ ' + T('Funktioniert! Die KI ist verbunden.', 'It works! The AI is connected.'), 'ok');
        setTimeout(() => show(4), 900);
      } else {
        const e = String(r.error?.message || '');
        if (!local) await save({ keys: { [ai]: null } }); // a key that does not work is not kept
        msg(/401|403|invalid|API key|permission/i.test(e) ? T('Der Schlüssel wurde nicht angenommen. Bitte nochmal kopieren und einfügen.', 'The key was not accepted. Please copy and paste it again.')
          : /fetch|network|ENOTFOUND|ECONNREFUSED/i.test(e) ? (local ? T('Ollama läuft nicht. Starte Ollama und versuch es nochmal.', 'Ollama is not running. Start it and try again.') : T('Keine Internetverbindung. Bitte prüfen.', 'No internet connection. Please check.'))
          : T('Das hat nicht geklappt: ', 'That did not work: ') + esc(e.slice(0, 120)), 'err');
      }
    };
  }
  function done(st) {
    save({ setupDone: true });
    const name = S()?.userTitle;
    st.innerHTML = `<div class="wlc-done">${ic('check')}</div><h1>${T('Alles bereit', 'All set')}${name ? ', ' + esc(name) : ''}!</h1><p>${T('Drei Tipps zum Start:', 'Three tips to start:')}</p>
      <div class="wlc-tips"><div><b>${ic('mic')}</b><span>${T('Klick auf den Orb oder das Mikrofon und <b>sprich einfach</b>.', 'Click the orb or the mic and <b>just talk</b>.')}</span></div>
      <div><b>${ic('search')}</b><span>${T('<b>Ctrl + K</b> findet jede Funktion.', '<b>Ctrl + K</b> finds every feature.')}</span></div>
      <div><b>${ic('scan-search')}</b><span>${T('Sag <b>„Jarvis-Modus an“</b> – und schau, was passiert.', 'Say <b>“Jarvis mode on”</b> – and watch.')}</span></div></div>
      <div class="wlc-nav"><span></span><button class="wlc-next" id="wlcNext">${T('Kairo starten', 'Start Kairo')} →</button></div>`;
    const colors = ['#ff7a45', '#8b5cff', '#3ddc97', '#ffd27a', '#4fc3ff'];
    st.insertAdjacentHTML('beforeend', `<div class="wlc-conf">${Array.from({ length: 50 }, () => `<i style="--x:${(Math.random() - .5) * 900}px;--y:${-200 - Math.random() * 400}px;--r:${Math.random() * 720}deg;--c:${colors[Math.floor(Math.random() * 5)]};--d:${Math.random() * .25}s"></i>`).join('')}</div>`);
    $w('wlcNext').onclick = () => { close(); setTimeout(() => window.App.go?.('chat'), 300); };
  }

  // first start: wait until the app has its settings
  window.addEventListener('load', () => setTimeout(() => { try { open(false); } catch {} }, 1200));
  return { open: () => open(true), needed };
})();
