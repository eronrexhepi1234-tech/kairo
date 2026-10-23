// Character voices (settings), inbox (settings + Today card + new-mail toast), countdowns and "on this day".
window.Extras2 = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lang = () => (window.APP_LANG || 'de').slice(0, 2);
  let roles = null, sampleAudio = null;

  // ---------- character voices ----------
  async function rolesHtml(S) {
    roles ||= await window.kairo.extras2.roles();
    const L = lang() === 'de' ? 'de' : 'en';
    return Object.entries(roles).map(([id, r]) => `
      <div class="role-card ${(S.voice.role || 'normal') === id ? 'active' : ''}" data-role="${id}" tabindex="0">
        <div class="role-emoji">${r.emoji}</div>
        <div class="role-txt"><b>${esc(r[L][0])}</b><small>${esc(r[L][1])}</small></div>
        <button class="role-play" data-play="${id}" title="${t('role.preview')}"><span class="rp-icon">▶</span><span class="rp-eq"><i></i><i></i><i></i><i></i></span><svg class="rp-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16"/></svg></button>
      </div>`).join('');
  }
  function stopSample() { if (sampleAudio) { sampleAudio.pause(); sampleAudio = null; } document.querySelectorAll('.role-card.playing,.role-card.loading').forEach(c => c.classList.remove('playing', 'loading')); }
  async function playSample(card, id) {
    const wasPlaying = card.classList.contains('playing');
    stopSample();
    if (wasPlaying) return;
    card.classList.add('loading');
    const r = await window.kairo.extras2.sample(id, lang());
    card.classList.remove('loading');
    if (!r.ok) return window.toast(r.error.code === 'NO_KEY' ? t('voice.needGemini') : '✕ ' + r.error.message);
    sampleAudio = new Audio(/L16|pcm/i.test(r.mime) ? Voice.pcmToWavUrl(r.audio, +(r.mime.match(/rate=(\d+)/) || [])[1] || 24000) : `data:${r.mime};base64,${r.audio}`);
    card.classList.add('playing');
    sampleAudio.onended = () => card.classList.remove('playing');
    sampleAudio.play();
  }
  async function setRole(id, S) {
    const s = await window.App.saveSettings({ voice: { role: id } });
    document.querySelectorAll('.role-card').forEach(c => c.classList.toggle('active', c.dataset.role === id));
    if (window.LiveVoice?.isActive()) window.LiveVoice.reconnect?.();
    return s;
  }

  // ---------- settings sections ----------
  const PROVIDERS = [['gmail', 'Gmail'], ['outlook', 'Outlook / Hotmail'], ['gmx', 'GMX'], ['bluewin', 'Bluewin'], ['icloud', 'iCloud'], ['yahoo', 'Yahoo'], ['webde', 'WEB.DE'], ['infomaniak', 'Infomaniak'], ['custom', t('mail.custom')]];
  async function renderSettings(inner, S, save, rerender) {
    if (!inner) return;
    const m = S.mail || {};
    const voiceSec = [...inner.querySelectorAll('.set-section')].find(s => s.querySelector('#sGVoice'));
    const roleHtml = `<div class="set-row role-row"><label>${t('role.title')}<small class="muted">${t('role.desc')}</small></label><div class="role-grid" id="roleGrid">${await rolesHtml(S)}</div></div>`;
    if (voiceSec) voiceSec.querySelector('h2').insertAdjacentHTML('afterend', roleHtml);
    inner.insertAdjacentHTML('beforeend', `
      <section class="set-section" id="mailSec">
        <h2>✉ ${t('mail.title')}</h2>
        <p class="muted small">${t('mail.desc')}</p>
        <div class="set-row"><label>${t('mail.provider')}</label><select class="field" id="mProv">${PROVIDERS.map(([v, l]) => `<option value="${v}" ${m.provider === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="set-row" id="mHostRow" ${m.provider === 'custom' ? '' : 'hidden'}><label>IMAP-Server</label><div class="key-row"><input class="field" id="mHost" value="${esc(m.host)}" placeholder="imap.example.com"><input class="field" id="mPort" value="${m.port || 993}" style="max-width:90px"></div></div>
        <div class="set-row"><label>${t('mail.address')}</label><input class="field" id="mUser" value="${esc(m.user)}" placeholder="name@gmail.com" autocomplete="off"></div>
        <div class="set-row"><label>${t('mail.pass')}<small class="muted">${t('mail.passHint')}</small></label><input class="field" type="password" id="mPass" placeholder="${S.keys.mail || '••••'}" autocomplete="new-password"></div>
        <div class="set-row"><label></label><div class="mail-help" id="mHelp"></div></div>
        <div class="set-row"><label>${t('mail.notify')}</label><label class="tog"><input type="checkbox" id="mNotify" ${m.notify !== false ? 'checked' : ''}><span>${t('mail.notifyDesc')}</span></label></div>
        <div class="set-row"><label></label><div class="key-row"><button class="btn primary" id="mSave">${t('mail.connect')}</button>${m.enabled ? `<button class="btn" id="mOff">${t('mail.off')}</button>` : ''}<span class="muted small" id="mStatus">${m.enabled ? '✓ ' + t('mail.on') : ''}</span></div></div>
      </section>`);
    const help = () => {
      const p = $('mProv').value;
      $('mHostRow').hidden = p !== 'custom';
      $('mHelp').innerHTML = t('mail.help.' + p) !== 'mail.help.' + p ? t('mail.help.' + p) : t('mail.help.default');
    };
    $('mProv').onchange = help; help();
    $('mNotify').onchange = e => save({ mail: { notify: e.target.checked } });
    if ($('mOff')) $('mOff').onclick = async () => { await save({ mail: { enabled: false } }); rerender(); };
    $('mSave').onclick = async () => {
      const cfg = { provider: $('mProv').value, user: $('mUser').value.trim(), host: $('mHost').value.trim(), port: +$('mPort').value || 993 };
      const pass = $('mPass').value;
      $('mStatus').textContent = t('mail.testing'); $('mSave').disabled = true;
      const r = await window.kairo.extras2.mail.test({ ...cfg, ...(pass ? { pass } : {}) });
      $('mSave').disabled = false;
      if (!r.ok) { $('mStatus').innerHTML = `<span style="color:var(--danger,#ff5d5d)">✕ ${esc(/auth|login|credentials|invalid/i.test(r.error.message) ? t('mail.badLogin') : r.error.message)}</span>`; return; }
      await save({ mail: { ...cfg, enabled: true }, ...(pass ? { keys: { mail: pass } } : {}) });
      $('mStatus').textContent = `✓ ${t('mail.ok')} · ${r.unseen} ${t('mail.unread')}`;
      renderToday();
    };
    $('roleGrid').querySelectorAll('.role-card').forEach(c => {
      c.onclick = e => { if (e.target.closest('[data-play]')) return; setRole(c.dataset.role, S); playSample(c, c.dataset.role); };
      c.querySelector('[data-play]').onclick = e => { e.stopPropagation(); playSample(c, c.dataset.role); };
    });
  }

  // ---------- Today cards ----------
  function ensureCards() {
    const grid = document.querySelector('#view-today .today-grid');
    if (!grid || $('tcMail')) return grid;
    grid.insertAdjacentHTML('beforeend', `
      <div class="tcard" id="tcMail"><div class="tcard-h"><b>✉ ${t('mail.inbox')}</b><span class="muted small" id="tcMailCount"></span><button class="icon-btn" id="tcMailRefresh" title="↻">↻</button></div><div id="tcMailBody"></div></div>
      <div class="tcard" id="tcCount"><div class="tcard-h"><b>⏳ ${t('cd.title')}</b></div><div id="tcCountBody"></div>
        <form class="cd-add" id="cdAdd"><input class="field" id="cdName" placeholder="${t('cd.name')}"><input class="field" type="date" id="cdDate"><button class="btn">+</button></form></div>
      <div class="tcard" id="tcClock"><div class="tcard-h"><b>🕐 ${t('wc.title')}</b></div><div id="tcClockBody"></div></div>
      <div class="tcard" id="tcSky"><div class="tcard-h"><b>🌌 ${t('sky.title')}</b></div><div id="tcSkyBody"></div></div>
      <div class="tcard" id="tcHist"><div class="tcard-h"><b>📜 ${t('hist.title')}</b><button class="icon-btn" id="tcHistNext" title="↻">↻</button></div><div id="tcHistBody"></div></div>`);
    $('tcMailRefresh').onclick = () => renderMail(true);
    $('cdAdd').onsubmit = async e => {
      e.preventDefault();
      const r = await window.kairo.extras2.countdowns.add({ name: $('cdName').value.trim(), date: $('cdDate').value });
      if (!r.ok) return window.toast('✕ ' + r.error.message);
      $('cdName').value = ''; renderCountdowns(r.list);
    };
    $('tcHistNext').onclick = () => { histIdx += 3; renderHistory(); };
    return grid;
  }

  async function renderMail(force) {
    const body = $('tcMailBody'); if (!body) return;
    const S = window.App.settings();
    if (!S.mail?.enabled) {
      body.innerHTML = `<div class="muted small">${t('mail.setup')}</div><button class="btn" id="tcMailSetup">${t('mail.setupBtn')}</button>`;
      $('tcMailSetup').onclick = () => { window.App.go('settings'); setTimeout(() => $('mailSec')?.scrollIntoView({ behavior: 'smooth' }), 400); };
      $('tcMailCount').textContent = ''; return;
    }
    if (!body.children.length) body.innerHTML = `<div class="muted small">${t('earth.loading')}</div>`;
    const r = await window.kairo.extras2.mail.check(force);
    if (!r.ok) { body.innerHTML = `<div class="muted small">✕ ${esc(r.error.message)}</div>`; return; }
    $('tcMailCount').textContent = r.unseen ? `${r.unseen} ${t('mail.unread')}` : '';
    const time = d => { const x = new Date(d); return x.toDateString() === new Date().toDateString() ? x.toTimeString().slice(0, 5) : x.toLocaleDateString(lang(), { day: 'numeric', month: 'short' }); };
    body.innerHTML = `<div class="mail-list">${r.list.slice(0, 5).map((m, i) => `<div class="mail-item ${m.seen ? '' : 'unread'}" style="animation-delay:${i * 60}ms"><i></i><div><b>${esc(m.from)}</b><small>${esc(m.subject)}</small></div><span>${time(m.date)}</span></div>`).join('') || `<div class="muted small">${t('mail.empty')}</div>`}</div>
      <div class="key-row"><button class="btn" id="tcMailSum">✨ ${t('mail.summary')}</button>${r.web ? `<button class="btn" id="tcMailOpen">↗</button>` : ''}</div>`;
    $('tcMailSum').onclick = () => window.App.askInChat(t('mail.summaryAsk'));
    if ($('tcMailOpen')) $('tcMailOpen').onclick = () => window.kairo.action({ type: 'open', url: r.web });
  }

  // flip-style countdown tiles
  let cdTimer = 0;
  function renderCountdowns(list) {
    const body = $('tcCountBody'); if (!body) return;
    clearInterval(cdTimer);
    if (!list.length) { body.innerHTML = `<div class="muted small">${t('cd.empty')}</div>`; return; }
    body.innerHTML = list.slice(0, 4).map(c => `<div class="cd-item" data-date="${esc(c.date)}"><div class="cd-name">${esc(c.emoji)} ${esc(c.name)}<button class="cd-x" data-id="${c.id}">✕</button></div><div class="cd-tiles"></div></div>`).join('');
    body.querySelectorAll('.cd-x').forEach(b => b.onclick = async () => renderCountdowns((await window.kairo.extras2.countdowns.remove(b.dataset.id)).list));
    const tick = () => body.querySelectorAll('.cd-item').forEach(it => {
      const target = new Date(it.dataset.date.length === 10 ? it.dataset.date + 'T00:00' : it.dataset.date).getTime();
      let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const parts = [[Math.floor(s / 86400), t('cd.d')], [Math.floor(s % 86400 / 3600), t('cd.h')], [Math.floor(s % 3600 / 60), t('cd.m')], [s % 60, t('cd.s')]];
      const tiles = it.querySelector('.cd-tiles');
      if (!tiles.children.length) tiles.innerHTML = parts.map(([, l]) => `<div class="cd-tile"><b></b><small>${l}</small></div>`).join('');
      [...tiles.children].forEach((tile, i) => {
        const b = tile.querySelector('b'), v = String(parts[i][0]).padStart(2, '0');
        if (b.textContent !== v) { b.textContent = v; tile.classList.remove('flip'); void tile.offsetWidth; tile.classList.add('flip'); }
      });
      it.classList.toggle('done', s === 0);
    });
    tick(); cdTimer = setInterval(tick, 1000);
  }

  let hist = [], histIdx = 0;
  async function renderHistory() {
    const body = $('tcHistBody'); if (!body) return;
    if (!hist.length) {
      const r = await window.kairo.extras2.history();
      if (!r.ok || !r.items.length) { body.innerHTML = `<div class="muted small">–</div>`; return; }
      hist = r.items;
    }
    if (histIdx >= hist.length) histIdx = 0;
    const now = new Date().getFullYear();
    body.innerHTML = hist.slice(histIdx, histIdx + 3).map((e, i) => `<div class="hist-item" style="animation-delay:${i * 90}ms">
      <div class="hist-year"><b>${e.year}</b><small>${t('hist.ago', { n: now - e.year })}</small></div><p>${esc(e.text)}</p></div>`).join('');
  }

  async function renderToday() {
    if (!ensureCards()) return;
    renderMail(false);
    const r = await window.kairo.extras2.countdowns.list();
    renderCountdowns(r.ok ? r.list : []);
    renderHistory();
    WorldClock.render($('tcClockBody'));
    if (!$('tcSkyBody').dataset.done) { $('tcSkyBody').dataset.done = 1; Sky.render($('tcSkyBody')); }
  }

  // new mail while the app is open -> toast with a small slide-in card
  window.kairo.extras2.mail.onNew(list => {
    const box = document.createElement('div');
    box.className = 'mail-toast';
    box.innerHTML = `<div class="mt-icon">✉</div><div><b>${list.length === 1 ? esc(list[0].from) : list.length + ' ' + t('mail.new')}</b><small>${esc(list.map(m => m.subject).join(' · ')).slice(0, 120)}</small></div>`;
    box.onclick = () => { box.remove(); window.App.askInChat(t('mail.summaryAsk')); };
    document.body.appendChild(box);
    requestAnimationFrame(() => box.classList.add('on'));
    setTimeout(() => { box.classList.remove('on'); setTimeout(() => box.remove(), 500); }, 9000);
    if ($('tcMailBody')) renderMail(true);
  });

  return { renderSettings, renderToday, setRole, rolesList: () => roles };
})();
