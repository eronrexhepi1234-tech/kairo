// Settings page, built from data so adding options stays easy.
window.SettingsUI = (function () {
  const THEMES = [
    { id: 'graphite', name: 'Graphite', c: ['#141517', '#222327', '#ececec'] },
    { id: 'paper', name: 'Paper', c: ['#f4f1ea', '#ffffff', '#22201c'] },
    { id: 'terminal', name: 'Terminal', c: ['#0a0c0a', '#151915', '#7dff9a'] },
    { id: 'ocean', name: 'Ocean', c: ['#0b1622', '#152536', '#dde8f3'] },
    { id: 'sand', name: 'Sand', c: ['#1d1a16', '#2c2721', '#efe5d6'] },
    { id: 'midnight', name: 'Midnight', c: ['#07070b', '#16161f', '#f1f1f6'] },
    { id: 'forest', name: 'Forest', c: ['#121813', '#1e2a21', '#e6efe4'] },
    { id: 'rose', name: 'Rose', c: ['#fbf3f2', '#ffffff', '#2b1f22'] }
  ];
  const ACCENTS = ['#ff7a45', '#f5c542', '#4ade80', '#2dd4bf', '#5aa9ff', '#a78bfa', '#f472b6', '#ef4444', '#e5e5e5'];
  const PROVIDERS = [
    { id: 'anthropic', name: 'Anthropic Claude', keyUrl: 'https://console.anthropic.com/settings/keys' },
    { id: 'openai', name: 'OpenAI GPT', keyUrl: 'https://platform.openai.com/api-keys' },
    { id: 'gemini', name: 'Google Gemini', keyUrl: 'https://aistudio.google.com/apikey' },
    { id: 'custom', name: 'Local / other', keyUrl: 'https://ollama.com/download' }
  ];
  const PERSONA_INFO = {
    normal: 'Friendly and natural', bro: 'Talks like your best friend', lockin: 'Focus mode, no small talk',
    mentor: 'Explains step by step', butler: 'Polite and formal', tutor: 'Teaches you a language', commentator: 'Sports commentator energy',
    pirate: 'Ahoi, Landratte!', robot: 'BEEP. Retro robot.'
  };
  const GEMINI_VOICES = [
    ['Kore', 'firm'], ['Puck', 'upbeat'], ['Zephyr', 'bright'], ['Charon', 'informative'], ['Fenrir', 'excitable'], ['Leda', 'youthful'],
    ['Orus', 'firm'], ['Aoede', 'breezy'], ['Callirrhoe', 'easy-going'], ['Enceladus', 'breathy'], ['Iapetus', 'clear'], ['Algieba', 'smooth'],
    ['Despina', 'smooth'], ['Achernar', 'soft'], ['Gacrux', 'mature'], ['Achird', 'friendly'], ['Zubenelgenubi', 'casual'], ['Sadachbia', 'lively'],
    ['Vindemiatrix', 'gentle'], ['Sulafat', 'warm']
  ];
  const OPENAI_VOICES =['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];

  let S = null, onChange = () => {}, viewProvider = null;
  const root = () => document.getElementById('settingsRoot');

  async function save(patch) {
    S = await window.kairo.settings.set(patch);
    onChange(S, patch);
    window.toast(t('set.saved'));
  }

  const opt = (v, label, sel) => `<option value="${escAttr(v)}" ${v === sel ? 'selected' : ''}>${escAttr(label)}</option>`;

  function render() {
    const p = viewProvider || S.provider;
    const voices = Voice.voices();
    root().innerHTML = `<div class="settings-inner">
      <section class="set-section">
        <h2>${t('set.profile')}</h2>
        <div class="set-row"><label>${t('set.name')}</label><input class="field" id="sName" value="${escAttr(S.name)}"></div>
        <div class="set-row"><label>${t('set.language')}</label>
          <select class="field" id="sLang">${Object.entries(I18N).map(([k, v]) => opt(k, v._name, S.language)).join('')}</select></div>
        <div class="set-row"><label>${t('set.city')}</label><input class="field" id="sCity" value="${escAttr(S.city || '')}" placeholder="Zürich"></div>
        <div class="set-row"><label>${t('set.learn')}</label>
          <select class="field" id="sLearn">${[['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['it', 'Italiano'], ['de', 'Deutsch'], ['sq', 'Shqip'], ['tr', 'Türkçe'], ['pt', 'Português'], ['ja', '日本語']].map(([v, l]) => opt(v, l, S.learnLanguage)).join('')}</select></div>
        <div class="set-row"><span></span><span class="hint">${t('set.learnHint')}</span></div>
        <div class="set-row"><label>News</label>
          <select class="field" id="sNews">${[['auto', 'Auto (language)'], ['ch', 'Schweiz'], ['de', 'Deutschland'], ['en', 'USA'], ['sq', 'Shqipëri'], ['fr', 'France'], ['es', 'España'], ['it', 'Italia'], ['tr', 'Türkiye']].map(([v, l]) => opt(v, l, S.newsRegion)).join('')}</select></div>
        <div class="set-row"><label>${t('set.persona')}</label>
          <div class="persona-cards">${Object.keys(PERSONA_INFO).map(id => `
            <button class="persona-card ${S.persona === id ? 'active' : ''}" data-persona="${id}"><b>${t('persona.' + id)}</b><small>${PERSONA_INFO[id]}</small></button>`).join('')}</div></div>
        <div class="set-row"><label>${t('set.custom')}</label><textarea class="field" id="sCustom" rows="3" placeholder="e.g. I live in Zürich. Call me Arben. Keep answers short.">${escAttr(S.customInstructions)}</textarea></div>
      </section>

      <section class="set-section">
        <h2>${t('set.ai')}</h2>
        <div class="set-row"><label>${t('set.provider')}</label>
          <div><div class="seg provider-tabs" id="sProv">${PROVIDERS.map(x => `<button data-p="${x.id}" class="${x.id === p ? 'active' : ''}">${x.name}${x.id === S.provider ? ' ●' : ''}</button>`).join('')}</div></div></div>
        <div class="set-row"><label>${t('set.key')}</label>
          <div class="key-row"><input class="field" type="password" id="sKey" placeholder="${S.keys[p] || (p === 'custom' ? 'optional' : 'sk-…')}" autocomplete="off">
          <button class="btn" id="sKeySave">OK</button><a href="${PROVIDERS.find(x => x.id === p).keyUrl}" data-ext>${t('set.getKey')} ↗</a></div></div>
        ${p === 'custom' ? `<div class="set-row"><label>${t('set.baseUrl')}</label><input class="field" id="sBase" value="${escAttr(S.customBaseUrl)}"></div>
          <div class="set-row"><span></span><span class="hint">Ollama: http://localhost:11434/v1 · LM Studio: http://localhost:1234/v1 · OpenRouter: https://openrouter.ai/api/v1 · Groq: https://api.groq.com/openai/v1 · Mistral: https://api.mistral.ai/v1 · xAI: https://api.x.ai/v1</span></div>` : ''}
        <div class="set-row"><label>${t('set.model')}</label>
          <div class="key-row"><input class="field" id="sModel" list="sModelList" value="${escAttr(S.models[p])}"><datalist id="sModelList"></datalist>
          <button class="btn" id="sLoadModels">${t('set.loadModels')}</button></div></div>
        <div class="set-row"><span></span><div><button class="btn primary" id="sUse" ${p === S.provider ? 'disabled' : ''}>Use ${PROVIDERS.find(x => x.id === p).name}</button></div></div>
      </section>

      <section class="set-section">
        <h2>${t('set.look')}</h2>
        <div class="set-row"><label>${t('set.theme')}</label>
          <div class="theme-cards">${THEMES.map(th => `
            <button class="theme-card ${S.theme === th.id ? 'active' : ''}" data-theme="${th.id}">
              <div class="tc-prev" style="background:${th.c[0]}"><i style="background:${th.c[1]}"></i><div><b style="background:${th.c[2]};width:70%"></b><b style="background:${S.accent};width:40%"></b><b style="background:${th.c[1]};width:85%"></b></div></div>
              <span>${th.name}</span></button>`).join('')}
            <button class="theme-card ${S.theme === 'custom' ? 'active' : ''}" id="sCustomTheme">
              <div class="tc-prev" style="background:${S.customTheme?.bg || '#2a2340'}"><i style="background:${S.customTheme?.panel || '#3b3157'}"></i><div><b style="background:${S.customTheme?.text || '#fff'};width:70%"></b><b style="background:${S.accent};width:40%"></b></div></div>
              <span>✏ ${t('tb.own')}</span></button></div></div>
        <div class="set-row ${S.theme === 'custom' ? '' : 'hidden-row'}" id="sTbRow"><label>${t('tb.colors')}</label>
          <div class="tb-pick">
            <label>${t('tb.bg')}<input type="color" id="tbBg" value="${S.customTheme?.bg || '#1b1726'}"></label>
            <label>${t('tb.panel')}<input type="color" id="tbPanel" value="${S.customTheme?.panel || '#262036'}"></label>
            <label>${t('tb.text')}<input type="color" id="tbText" value="${S.customTheme?.text || '#f2eefc'}"></label>
            <button class="btn sm" id="tbRandom">🎲 ${t('tb.random')}</button>
          </div></div>
        <div class="set-row"><label>${t('set.accent')}</label>
          <div class="swatches">${ACCENTS.map(a => `<button class="swatch ${a === S.accent ? 'active' : ''}" data-accent="${a}" style="background:${a};color:${a}"></button>`).join('')}
          <input type="color" id="sAccent" value="${S.accent}"></div></div>
        <div class="set-row"><label>${t('set.font')}</label>
          <div class="seg" id="sFont">${[['modern', 'Modern'], ['system', 'Segoe'], ['serif', 'Serif'], ['mono', 'Mono']].map(([v, l]) => `<button data-v="${v}" class="${S.font === v ? 'active' : ''}">${l}</button>`).join('')}</div></div>
        <div class="set-row"><label>${t('set.motion')}</label>
          <div class="seg" id="sMotion">${['off', 'subtle', 'full'].map(v => `<button data-v="${v}" class="${S.motion === v ? 'active' : ''}">${t('set.motion.' + v)}</button>`).join('')}</div></div>
        <div class="set-row"><label>${t('set.bg')}</label>
          <div class="seg wrap" id="sBg">${['none', 'stars', 'aurora', 'rain', 'waves'].map(v => `<button data-v="${v}" class="${(S.background || 'none') === v ? 'active' : ''}">${t('bg.' + v)}</button>`).join('')}</div></div>
        <div class="set-row"><label>${t('set.density')}</label>
          <div class="seg" id="sDensity">${[['comfortable', 'Comfortable'], ['compact', 'Compact']].map(([v, l]) => `<button data-v="${v}" class="${S.density === v ? 'active' : ''}">${l}</button>`).join('')}</div></div>
      </section>

      <section class="set-section">
        <h2>${t('set.voice')}</h2>
        <div class="set-row"><label>${t('set.geminiVoice')} (Gemini)</label>
          <div class="key-row"><select class="field" id="sGVoice">${GEMINI_VOICES.map(([v, d]) => opt(v, `${v} — ${d}`, S.voice.geminiVoice)).join('')}</select>
          <button class="btn primary" id="sTalk"><svg><use href="#i-mic"/></svg>${t('chat.voice')}</button></div></div>
        <div class="set-row"><label>${t('hf.label')}</label><label class="tog"><input type="checkbox" id="sHF" ${S.voice.handsFree ? 'checked' : ''}><span>${t('hf.desc')}</span></label></div>
        <div class="set-row"><label>„Hey ${escAttr(S.name)}"</label><label class="tog"><input type="checkbox" id="sWake" ${S.wakeWord ? 'checked' : ''}><span>${t('ww.desc')}</span></label></div>
        <div class="set-row"><label>${t('hf.sens')}</label>
          <div class="seg" id="sSens">${['low', 'medium', 'high'].map(v => `<button data-v="${v}" class="${S.voice.sensitivity === v ? 'active' : ''}">${t('hf.' + v)}</button>`).join('')}</div></div>
        <div class="set-row"><label>${t('set.orb')}</label>
          <div class="seg wrap" id="sOrb">${Orb.STYLES.map(s => `<button data-v="${s}" class="${S.voice.orbStyle === s ? 'active' : ''}">${t('orb.' + s)}</button>`).join('')}</div></div>
        <div class="set-row"><label>${t('set.orbColors')}</label>
          <div class="swatches">${Orb.PALETTES.map(p => { const [a, b] = Orb.preview(p); return `<button class="swatch ${S.voice.orbPalette === p ? 'active' : ''}" data-orbp="${p}" title="${p}" style="background:linear-gradient(135deg,${a},${b});color:${a}"></button>`; }).join('')}</div></div>
        <div class="set-row"><label>${t('set.voiceHotkey')}</label><input class="field" id="sVHotkey" value="${escAttr(S.voiceHotkey)}"></div>
        <div class="set-row"><label>${t('set.engine')}</label>
          <select class="field" id="sEngine">${[['auto', t('set.engine.auto')], ['gemini', t('set.engine.gemini')], ['openai', t('set.engine.openai')], ['system', t('set.engine.system')]].map(([v, l]) => opt(v, l, S.voice.engine)).join('')}</select></div>
        <div class="set-row"><span></span><span class="hint">${t('set.voiceHint')}</span></div>
        ${S.voice.engine === 'openai'
          ? `<div class="set-row"><label>Voice (OpenAI)</label><select class="field" id="sOVoice">${OPENAI_VOICES.map(v => opt(v, v[0].toUpperCase() + v.slice(1), S.voice.openaiVoice)).join('')}</select></div>`
          : S.voice.engine === 'system' ? `<div class="set-row"><label>Voice (Windows)</label><select class="field" id="sSVoice">${opt('', 'Auto', S.voice.systemVoice)}${voices.map(v => opt(v.name, `${v.name} (${v.lang})`, S.voice.systemVoice)).join('')}</select></div>` : ''}
        <div class="set-row"><label>${t('set.rate')}</label><input type="range" id="sRate" min="0.7" max="1.4" step="0.05" value="${S.voice.rate}"></div>
        <div class="set-row"><label>${t('set.autoSpeak')}</label><label class="tog"><input type="checkbox" id="sAuto" ${S.voice.autoSpeak ? 'checked' : ''}><span></span></label></div>
        <div class="set-row"><span></span><div><button class="btn" id="sTest"><svg><use href="#i-volume"/></svg>${t('set.test')}</button></div></div>
      </section>

      <section class="set-section">
        <h2>${t('set.privacy')}</h2>
        <div class="set-row"><label>${t('set.mini')}</label><label class="tog"><input type="checkbox" id="sMini" ${S.miniOrb ? 'checked' : ''}><span>${t('set.miniHint')}</span></label></div>
        <div class="set-row"><label>${t('set.autostart')}</label><label class="tog"><input type="checkbox" id="sAutostart" ${S.autostart ? 'checked' : ''}><span></span></label></div>
        <div class="set-row"><label>${t('set.tray')}</label><label class="tog"><input type="checkbox" id="sTray" ${S.closeToTray ? 'checked' : ''}><span></span></label></div>
        <div class="set-row"><label>${t('set.briefing')}</label><label class="tog"><input type="checkbox" id="sBrief" ${S.briefing.enabled ? 'checked' : ''}><span>${t('set.briefingSpeak')}</span></label></div>
        <div class="set-row"><label>${t('set.hide')}</label><label class="tog"><input type="checkbox" id="sHide" ${S.hideFromCapture ? 'checked' : ''}><span></span></label></div>
        <div class="set-row"><label>${t('set.hotkey')}</label><input class="field" id="sHotkey" value="${escAttr(S.hotkey)}"></div>
        <div class="set-row"><span></span><span class="hint">API keys are encrypted with Windows (DPAPI) and only sent to the provider you picked.</span></div>
      </section>

      <section class="set-section">
        <h2>Discord</h2>
        <div class="set-row"><span></span><div class="hint" style="margin:0">${t('dc.sub')}</div></div>
        <div class="set-row"><label>${t('dc.how')}</label><ol class="li-steps small-steps">
          <li>${t('dc.s1')} <a href="https://discord.com/developers/applications" data-ext>discord.com/developers ↗</a></li><li>${t('dc.s2')}</li><li>${t('dc.s3')}</li><li>${t('dc.s4')}</li></ol></div>
        <div class="set-row"><label>Bot-Token</label><div class="key-row"><input class="field" type="password" id="sDcTok" placeholder="${S.keys.discord || 'MTA…'}"><button class="btn" id="sDcSave">OK</button></div></div>
        <div class="set-row"><label>Status</label><div class="key-row" id="sDcStatus"><span class="muted small">…</span></div></div>
      </section>
    </div>`;
    wire(p);
    renderDiscord();
    window.Extras2?.renderSettings(root().querySelector('.settings-inner'), S, save, render);
  }

  async function renderDiscord() {
    const el = document.getElementById('sDcStatus'); if (!el) return;
    const st = await window.kairo.discord.status();
    el.innerHTML = st.running
      ? `<span class="li-dot on"></span><span>${t('dc.online')} <b>${escAttr(st.name)}</b> · ${st.guilds} ${t('dc.servers')}</span><a class="btn sm" href="${escAttr(st.invite)}" data-ext>➕ ${t('dc.invite')}</a><button class="btn sm" id="sDcStop">${t('li.goOffline')}</button>`
      : `<span class="li-dot"></span><span class="muted">${st.error ? escAttr(st.error === 'INTENTS' ? t('dc.intents') : st.error) : t('dc.offline')}</span><button class="btn sm primary" id="sDcStart" ${S.keys.discord ? '' : 'disabled'}>${t('li.goOnline')}</button>`;
    const go = document.getElementById('sDcStart'), stop = document.getElementById('sDcStop');
    if (go) go.onclick = async () => { go.disabled = true; go.textContent = '…'; const r = await window.kairo.discord.start(); if (!r.ok) toast(r.error.message); else await save({ discord: { enabled: true } }); renderDiscord(); };
    if (stop) stop.onclick = async () => { await window.kairo.discord.stop(); await save({ discord: { enabled: false } }); renderDiscord(); };
  }

  function wire(p) {
    const $ = id => document.getElementById(id);
    const r = root();
    $('sName').onchange = e => save({ name: e.target.value.trim() || 'Kairo' });
    $('sLang').onchange = e => save({ language: e.target.value }).then(render);
    $('sNews').onchange = e => save({ newsRegion: e.target.value });
    $('sCity').onchange = e => save({ city: e.target.value.trim() }).then(() => Today.refresh());
    $('sLearn').onchange = e => save({ learnLanguage: e.target.value });
    $('sAutostart').onchange = e => save({ autostart: e.target.checked });
    $('sMini').onchange = e => save({ miniOrb: e.target.checked });
    $('sDcSave').onclick = async () => { const v = $('sDcTok').value.trim(); if (!v) return; await save({ keys: { discord: v } }); render(); };
    $('sBg').querySelectorAll('button').forEach(b => b.onclick = () => save({ background: b.dataset.v }).then(() => { Extras.setBackground(b.dataset.v); render(); }));
    $('sTray').onchange = e => save({ closeToTray: e.target.checked });
    $('sBrief').onchange = e => save({ briefing: { enabled: e.target.checked } });
    $('sCustom').onchange =e => save({ customInstructions: e.target.value });
    r.querySelectorAll('[data-persona]').forEach(b => b.onclick = () => save({ persona: b.dataset.persona }).then(render));

    $('sProv').querySelectorAll('button').forEach(b => b.onclick = () => { viewProvider = b.dataset.p; render(); });
    $('sKeySave').onclick = () => { const v = $('sKey').value.trim(); if (v) save({ keys: { [p]: v } }).then(render); };
    $('sKey').onkeydown = e => { if (e.key === 'Enter') $('sKeySave').click(); };
    if ($('sBase')) $('sBase').onchange = e => save({ customBaseUrl: e.target.value.trim() });
    $('sModel').onchange = e => save({ models: { [p]: e.target.value.trim() } });
    $('sLoadModels').onclick = async () => {
      const b = $('sLoadModels'); b.disabled = true; b.textContent = '…';
      const res = await window.kairo.models(p);
      b.disabled = false; b.textContent = t('set.loadModels');
      if (!res.ok) return window.toast(res.error.message);
      $('sModelList').innerHTML = res.models.map(m => `<option value="${escAttr(m)}">`).join('');
      window.toast(`${res.models.length} models`);
      $('sModel').focus();
    };
    $('sUse').onclick = () => save({ provider: p }).then(render);

    r.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => save({ theme: b.dataset.theme }).then(render));
    // own theme: three colours, the rest is mixed from them
    const tb = () => ({ bg: $('tbBg').value, panel: $('tbPanel').value, text: $('tbText').value });
    $('sCustomTheme').onclick = () => save({ theme: 'custom', customTheme: S.customTheme || tb() }).then(render);
    for (const id of ['tbBg', 'tbPanel', 'tbText']) {
      $(id).oninput = () => window.App.previewTheme(tb());
      $(id).onchange = () => save({ theme: 'custom', customTheme: tb() });
    }
    $('tbRandom').onclick = () => {
      const h = Math.floor(Math.random() * 360), dark = Math.random() < 0.75;
      const hsl = (s, l) => { const a = s * Math.min(l, 1 - l) / 100, f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); };
      const th = dark ? { bg: hsl(30, 0.09), panel: hsl(28, 0.14), text: hsl(25, 0.94) } : { bg: hsl(35, 0.95), panel: hsl(30, 0.9), text: hsl(30, 0.14) };
      const acc = hsl(85, dark ? 0.62 : 0.48);
      save({ theme: 'custom', customTheme: th, accent: acc }).then(render);
    };
    r.querySelectorAll('[data-accent]').forEach(b => b.onclick = () => save({ accent: b.dataset.accent }).then(render));
    $('sAccent').onchange = e => save({ accent: e.target.value }).then(render);
    $('sAccent').oninput = e => window.App.applyAccent(e.target.value);
    const segSave = (id, key) => $(id).querySelectorAll('button').forEach(b => b.onclick = () => save({ [key]: b.dataset.v }).then(render));
    segSave('sFont', 'font'); segSave('sMotion', 'motion'); segSave('sDensity', 'density');

    $('sEngine').onchange = e => save({ voice: { engine: e.target.value } }).then(render);
    $('sGVoice').onchange = e => save({ voice: { geminiVoice: e.target.value } });
    $('sTalk').onclick = () => LiveVoice.start();
    $('sHF').onchange = e => save({ voice: { handsFree: e.target.checked } });
    $('sWake').onchange = e => save({ wakeWord: e.target.checked }).then(() => window.App.saveSettings({}));
    $('sSens').querySelectorAll('button').forEach(b => b.onclick = () => save({ voice: { sensitivity: b.dataset.v } }).then(render));
    $('sOrb').querySelectorAll('button').forEach(b => b.onclick = () => save({ voice: { orbStyle: b.dataset.v } }).then(render));
    root().querySelectorAll('[data-orbp]').forEach(b => b.onclick = () => save({ voice: { orbPalette: b.dataset.orbp } }).then(render));
    $('sVHotkey').onchange = e => save({ voiceHotkey: e.target.value.trim() });
    if ($('sOVoice')) $('sOVoice').onchange = e => save({ voice: { openaiVoice: e.target.value } });
    if ($('sSVoice')) $('sSVoice').onchange = e => save({ voice: { systemVoice: e.target.value } });
    $('sRate').onchange = e => save({ voice: { rate: +e.target.value } });
    $('sAuto').onchange = e => save({ voice: { autoSpeak: e.target.checked } });
    $('sTest').onclick = () => Voice.speak(t('chat.hello', { name: S.name }) + ' ' + t('chat.sub'), S);
    $('sHide').onchange = e => save({ hideFromCapture: e.target.checked });
    $('sHotkey').onchange = e => save({ hotkey: e.target.value.trim() });
  }

  function init(settings, changed) {
    S = settings; onChange = changed;
    speechSynthesis.onvoiceschanged = () => { if (document.getElementById('view-settings').classList.contains('active')) render(); };
  }

  return { init, render, set: s => { S = s; } };
})();
