// "Today" page: clock, weather, morning briefing, reminders & alarms, memory, music DJ, PC controls, tools.
// Also: the reminder/alarm pop-up and the tidy-up preview.
window.Today = (function () {
  const $ = id => document.getElementById(id);
  let S = () => ({});
  let djSource = 'spotify';
  const DJ = [
    ['gaming', '🎮', 'gaming music mix'], ['study', '📚', 'lofi study beats'], ['chill', '🌊', 'chill vibes'],
    ['party', '🎉', 'party hits'], ['focus', '🎯', 'deep focus music'], ['workout', '💪', 'workout motivation'],
    ['sleep', '🌙', 'sleep music'], ['albanian', '🇦🇱', 'shqip hits'], ['rap', '🎤', 'deutschrap hits']
  ];

  // ---------- modal ----------
  function modal(html) {
    $('modalBox').innerHTML = html;
    $('modal').hidden = false;
    requestAnimationFrame(() => $('modal').classList.add('open'));
  }
  function closeModal() { $('modal').classList.remove('open'); setTimeout(() => { $('modal').hidden = true; }, 220); }

  // ---------- clock ----------
  function tickClock() {
    const d = new Date();
    const lang = window.APP_LANG === 'sq' ? 'sq-AL' : window.APP_LANG === 'de' ? 'de-CH' : window.APP_LANG || 'en';
    $('tdClock').textContent = d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    $('tdDate').textContent = d.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ---------- weather ----------
  async function loadWeather() {
    const el = $('tdWeather');
    if (!S().city) {
      el.innerHTML = `<form class="city-form" id="cityForm"><span>🌤</span><input class="field" id="cityInput" placeholder="${t('today.cityPh')}"><button class="btn sm">OK</button></form>`;
      $('cityForm').onsubmit = async e => {
        e.preventDefault();
        const c = $('cityInput').value.trim(); if (!c) return;
        await window.App.saveSettings({ city: c });
        loadWeather();
      };
      return;
    }
    el.innerHTML = `<div class="muted">${t('earth.loading')}</div>`;
    const r = await window.kairo.weather();
    if (!r.ok) { el.innerHTML = `<div class="muted">${escAttr(r.error.message)}</div>`; return; }
    // the animated weather card; click it to see the big version with the 24-hour curve
    el.innerHTML = '';
    WeatherFX.card(el, r, { compact: true });
    el.onclick = () => WeatherFX.show(r);
  }

  // ---------- briefing ----------
  async function briefing(speak = true) {
    const el = $('tdBrief');
    el.innerHTML = `<div class="msg-status">${t('today.briefMaking')}</div>`;
    const r = await window.kairo.briefing.make();
    if (!r.ok) { el.innerHTML = `<p class="msg error">${r.error.code === 'NO_KEY' ? t('err.nokey') : escAttr(r.error.message)}</p>`; return; }
    el.innerHTML = renderMarkdown(r.text) + (r.news?.length ? `<div class="sources">${r.news.map(n => `<a class="source" href="${escAttr(n.link)}" data-ext title="${escAttr(n.title)}">${escAttr(n.source)}</a>`).join('')}</div>` : '');
    if (speak && S().briefing?.speak) Voice.speak(r.text, S());
  }

  // ---------- reminders ----------
  const fmtWhen = at => {
    const d = new Date(at), now = new Date();
    const time = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    const sameDay = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString();
    return sameDay ? time : tomorrow ? t('today.tomorrow') + ' ' + time : d.toLocaleDateString('de-CH', { day: 'numeric', month: 'short' }) + ' ' + time;
  };
  async function loadReminders() {
    const list = await window.kairo.reminders.list();
    $('tdRemList').innerHTML = list.length ? list.map(r => `<li><span class="rem-time">${r.kind === 'alarm' ? '⏰' : '🔔'} ${fmtWhen(r.at)}${r.repeat ? ' ↻' : ''}</span><span class="rem-text">${escAttr(r.text)}</span><button class="x" data-id="${r.id}">✕</button></li>`).join('')
      : `<li class="muted empty">${t('today.noReminders')}</li>`;
  }

  // ---------- memory ----------
  async function loadMemory() {
    const list = await window.kairo.memory.list();
    $('tdMemList').innerHTML = list.length ? list.map(m => `<span class="mem-chip">${escAttr(m.text)}<button data-id="${m.id}">✕</button></span>`).join('')
      : `<p class="muted small">${t('today.noMemory')}</p>`;
  }

  // ---------- alarm sound (generated, no file needed) ----------
  let alarmCtx = null, alarmTimer = null;
  function beep(times = 1) {
    alarmCtx ||= new AudioContext();
    const now = alarmCtx.currentTime;
    for (let i = 0; i < times; i++) {
      for (const [f, d] of [[880, 0], [1175, 0.16]]) {
        const o = alarmCtx.createOscillator(), g = alarmCtx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, now + i * 0.6 + d); g.gain.linearRampToValueAtTime(0.25, now + i * 0.6 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.6 + d + 0.3);
        o.connect(g); g.connect(alarmCtx.destination); o.start(now + i * 0.6 + d); o.stop(now + i * 0.6 + d + 0.35);
      }
    }
  }
  function stopAlarm() { clearInterval(alarmTimer); alarmTimer = null; }

  function showAlert(r) {
    const box = $('alertBox');
    box.innerHTML = `<div class="alert-card ${r.kind}">
      <div class="alert-ring">${r.kind === 'alarm' ? '⏰' : '🔔'}</div>
      <small>${r.kind === 'alarm' ? t('today.alarm') : t('today.reminder')} · ${new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</small>
      <h2>${escAttr(r.text)}</h2>
      <div class="row"><button class="btn" id="alSnooze">💤 ${t('today.snooze')}</button><button class="btn primary" id="alDone">${t('today.done')}</button></div>
    </div>`;
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('open'));
    const close = () => { stopAlarm(); box.classList.remove('open'); setTimeout(() => { box.hidden = true; }, 250); loadReminders(); };
    $('alDone').onclick = close;
    $('alSnooze').onclick = async () => { await window.kairo.reminders.snooze(r, 5); close(); };
    if (r.kind === 'alarm') { beep(3); alarmTimer = setInterval(() => beep(3), 2400); setTimeout(stopAlarm, 5 * 60000); }
    else beep(1);
    setTimeout(() => Voice.speak((r.kind === 'alarm' ? t('today.alarmSay') : t('today.reminderSay')) + ' ' + r.text, S()), r.kind === 'alarm' ? 1800 : 700);
  }

  // ---------- tidy ----------
  async function tidy() {
    modal(`<h2>🧹 ${t('today.tidy')}</h2><div class="msg-status">${t('earth.loading')}</div>`);
    const p = await window.kairo.tidy.plan();
    const canUndo = await window.kairo.tidy.canUndo();
    if (!p.ok) { modal(`<h2>🧹 ${t('today.tidy')}</h2><p class="msg error">${escAttr(p.error.message)}</p><div class="row"><button class="btn" data-close>OK</button></div>`); wireClose(); return; }
    const groups = Object.entries(p.summary);
    modal(`<h2>🧹 ${t('today.tidy')}</h2>
      <p class="muted">${escAttr(p.dir)}</p>
      ${p.total ? `<p>${t('today.tidyPlan', { n: p.total })}</p>
      <div class="tidy-groups">${groups.map(([g, n]) => `<div><b>${n}</b><span>${escAttr(g)}</span></div>`).join('')}</div>
      <details><summary>${t('today.tidyFiles')}</summary><ul class="tidy-files">${p.moves.slice(0, 200).map(m => `<li>${escAttr(m.name)} → <b>${escAttr(m.group)}</b></li>`).join('')}</ul></details>`
        : `<p>${t('today.tidyNothing')}</p>`}
      <div class="row">${canUndo ? `<button class="btn" id="tdUndo">↶ ${t('today.undo')}</button>` : ''}<span style="flex:1"></span>
        <button class="btn" data-close>${t('today.cancel')}</button>${p.total ? `<button class="btn primary" id="tdTidyGo">${t('today.tidyGo')}</button>` : ''}</div>`);
    wireClose();
    if ($('tdTidyGo')) $('tdTidyGo').onclick = async () => { const r = await window.kairo.tidy.run(p); closeModal(); toast(r.ok ? t('today.tidyDone', { n: r.moved }) : r.error.message); };
    if ($('tdUndo')) $('tdUndo').onclick = async () => { const r = await window.kairo.tidy.undo(); closeModal(); toast(r.ok ? t('today.undoDone', { n: r.restored }) : r.error.message); };
  }
  function wireClose() { $('modalBox').querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal); }

  // ---------- DJ ----------
  function renderDj() {
    $('tdDj').innerHTML = DJ.map(([k, ico]) => `<button class="dj-btn" data-k="${k}"><span>${ico}</span>${t('dj.' + k)}</button>`).join('');
  }
  function playMood(k) {
    const q = (DJ.find(d => d[0] === k) || DJ[0])[2];
    const url = djSource === 'spotify' ? 'spotify:search:' + encodeURIComponent(q) : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
    window.kairo.action({ type: 'open', url });
    toast('🎵 ' + t('dj.' + k));
  }

  async function pc(action, value) {
    const r = await window.kairo.pc(action, value);
    toast(r.ok ? '✓ ' + r.result : r.error.message);
    return r;
  }

  // ---------- screen time ----------
  const CAT_ICON = { games: '🎮', video: '📺', study: '📚', chat: '💬', web: '🌐', music: '🎵', other: '🧩' };
  async function loadFocus() {
    const el = $('tdFocus'); if (!el || !window.kairo.focus) return;
    const s = await window.kairo.focus.today();
    const fmt = m => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
    const cats = Object.entries(s.cats || {}).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...cats.map(c => c[1]));
    el.innerHTML = cats.length ? `
      <div class="focus-cats">${cats.map(([c, m]) => `<div class="fc-row"><span>${CAT_ICON[c] || '•'} ${t('focus.' + c)}</span><div class="fc-bar"><i style="width:${m / max * 100}%" class="c-${c}"></i></div><b>${fmt(m)}</b></div>`).join('')}</div>
      <div class="focus-apps">${s.apps.slice(0, 6).map(a => `<span>${CAT_ICON[a.cat] || ''} ${escAttr(a.name)} · ${fmt(a.min)}</span>`).join('')}</div>`
      : `<p class="muted small">${t('focus.empty')}</p>`;
  }

  function refresh() { loadFocus(); tickClock(); loadWeather(); loadReminders(); loadMemory(); renderDj(); $('tdShutdown').options[0].textContent = '⏻ ' + t('today.shutdown'); }

  function init(getS) {
    S = getS;
    setInterval(tickClock, 10000);
    $('tdBriefBtn').onclick = () => briefing(true);
    $('tdRemForm').onsubmit = async e => {
      e.preventDefault();
      const when = $('tdRemWhen').value.trim(), text = $('tdRemText').value.trim();
      if (!when) return $('tdRemWhen').focus();
      const r = await window.kairo.reminders.add({ at: /^\d+$/.test(when) ? +when : when, text, kind: $('tdRemAlarm').checked ? 'alarm' : 'reminder' });
      if (!r.ok) return toast(t('today.badTime'));
      $('tdRemWhen').value = $('tdRemText').value = ''; loadReminders(); toast('✓ ' + fmtWhen(r.item.at));
    };
    $('tdRemList').onclick = async e => { const b = e.target.closest('.x'); if (b) { await window.kairo.reminders.remove(b.dataset.id); loadReminders(); } };
    $('tdMemForm').onsubmit = async e => { e.preventDefault(); const v = $('tdMemText').value.trim(); if (v) { await window.kairo.memory.add(v); $('tdMemText').value = ''; loadMemory(); } };
    $('tdMemList').onclick = async e => { const b = e.target.closest('button'); if (b) { await window.kairo.memory.remove(b.dataset.id); loadMemory(); } };
    $('tdDj').onclick = e => { const b = e.target.closest('.dj-btn'); if (b) playMood(b.dataset.k); };
    $('tdDjSrc').querySelectorAll('button').forEach(b => b.onclick = () => { djSource = b.dataset.v; $('tdDjSrc').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); });
    document.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => pc(b.dataset.pc, 3));
    $('tdBright').onchange = e => pc('brightness', +e.target.value);
    $('tdShutdown').onchange = e => { if (e.target.value) { pc('shutdown', +e.target.value); e.target.value = ''; } };
    $('tdClip').onclick = () => window.kairo.clip.open();
    $('tdTidy').onclick = tidy;
    $('tdQuiz').onclick = () => { window.App.go('games'); Games.showGame('quiz'); };
    $('modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
    window.kairo.reminders.onFire(r => { (window.Today?.showAlert || showAlert)(r); loadReminders(); });
    refresh();
  }

  return { init, refresh, briefing, tidy, loadReminders, loadMemory, playMood, pc, showAlert, modal, closeModal };
})();
