// School page (homework, exams, study plans, presentations), Today cards (football, money, diary) and routines.
window.Life = (function () {
  const $ = id => document.getElementById(id);
  const S = () => window.App.settings();
  const L = window.kairo.life;
  const today = () => new Date().toLocaleDateString('sv');
  const daysUntil = d => Math.round((Date.parse(d + 'T12:00') - Date.parse(today() + 'T12:00')) / 86400000);
  const SUBJECT_COLORS = ['#ff7a45', '#5aa9ff', '#4ade80', '#f472b6', '#a78bfa', '#f5c542', '#2dd4bf', '#ef4444'];
  const subjColor = s => SUBJECT_COLORS[[...String(s || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % SUBJECT_COLORS.length];
  const fmtDay = d => { const n = daysUntil(d); return n === 0 ? t('sc.today') : n === 1 ? t('sc.tomorrow') : n === -1 ? t('sc.yesterday') : new Date(d + 'T12:00').toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' }); };

  // ================= School =================
  async function renderSchool() {
    const [hw, ex] = await Promise.all([L.list('homework'), L.list('exams')]);
    const open = hw.filter(h => !h.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
    const done = hw.filter(h => h.done).slice(-5).reverse();
    const exams = ex.filter(e => !e.date || daysUntil(e.date) >= -1).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
    $('schoolRoot').innerHTML = `
      <div class="home-head"><div><h2>${t('nav.school')}</h2><p class="muted">${t('sc.sub')}</p></div>
        <div class="row"><button class="btn" id="scScan">📸 ${t('sc.scan')}</button><button class="btn primary" id="scPptx">📊 ${t('sc.pptx')}</button></div></div>
      <div class="school-grid">
        <div class="tcard">
          <div class="tcard-h"><b>📚 ${t('sc.homework')}</b><span class="muted small">${open.length}</span></div>
          <form class="hw-add" id="hwForm"><input class="field" id="hwSubj" placeholder="${t('sc.subject')}"><input class="field" id="hwTask" placeholder="${t('sc.task')}"><input class="field" id="hwDue" type="date"><button class="btn sm">+</button></form>
          <ul class="hw-list">${open.map(h => `<li data-id="${h.id}" class="${h.due && daysUntil(h.due) < 0 ? 'late' : h.due && daysUntil(h.due) <= 1 ? 'soon' : ''}">
            <button class="hw-check" data-act="done" title="✓"></button><span class="subj" style="--c:${subjColor(h.subject)}">${escAttr(h.subject || '–')}</span>
            <span class="hw-task">${escAttr(h.task)}</span><span class="hw-due">${h.due ? fmtDay(h.due) : ''}</span><button class="x" data-act="del">✕</button></li>`).join('') || `<li class="muted empty">${t('sc.noHomework')}</li>`}
            ${done.map(h => `<li class="done" data-id="${h.id}"><button class="hw-check on" data-act="undo"></button><span class="hw-task">${escAttr(h.task)}</span><button class="x" data-act="del">✕</button></li>`).join('')}</ul>
        </div>
        <div class="tcard">
          <div class="tcard-h"><b>📝 ${t('sc.exams')}</b></div>
          <form class="hw-add" id="exForm"><input class="field" id="exSubj" placeholder="${t('sc.subject')}"><input class="field" id="exTopic" placeholder="${t('sc.topic')}"><input class="field" id="exDate" type="date"><button class="btn sm">+</button></form>
          <div class="ex-list">${exams.map(e => { const n = e.date ? daysUntil(e.date) : null; return `<div class="exam" data-id="${e.id}">
            <div class="ex-count ${n != null && n <= 3 ? 'hot' : ''}"><b>${n == null ? '?' : n <= 0 ? '!' : n}</b><small>${n == null ? '' : n <= 0 ? t('sc.today') : n === 1 ? t('sc.day') : t('sc.days')}</small></div>
            <div class="ex-info"><b style="color:${subjColor(e.subject)}">${escAttr(e.subject)}</b><small>${e.date ? fmtDay(e.date) : ''}${e.topic ? ' · ' + escAttr(e.topic) : ''}</small>
              ${e.plan ? `<details><summary>${t('sc.plan')}</summary><div class="md">${renderMarkdown(e.plan)}</div></details>` : ''}</div>
            <div class="ex-btns"><button class="btn sm" data-act="plan">🗓 ${t('sc.makePlan')}</button><button class="btn sm" data-act="cards">🗂</button><button class="x" data-act="del">✕</button></div></div>`; }).join('') || `<p class="muted small">${t('sc.noExams')}</p>`}</div>
        </div>
      </div>`;
    wireSchool();
  }

  function wireSchool() {
    $('hwForm').onsubmit = async e => {
      e.preventDefault();
      const task = $('hwTask').value.trim(); if (!task) return $('hwTask').focus();
      await addHomework({ subject: $('hwSubj').value.trim(), task, due: $('hwDue').value || '' });
      renderSchool();
    };
    $('exForm').onsubmit = async e => {
      e.preventDefault();
      const subject = $('exSubj').value.trim(); if (!subject) return $('exSubj').focus();
      await addExam({ subject, topic: $('exTopic').value.trim(), date: $('exDate').value || '' });
      renderSchool();
    };
    document.querySelectorAll('.hw-list li[data-id]').forEach(li => li.onclick = async e => {
      const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
      const id = li.dataset.id;
      if (act === 'done') { li.classList.add('ticked'); await L.update('homework', id, { done: true, doneAt: Date.now() }); setTimeout(renderSchool, 350); }
      if (act === 'undo') { await L.update('homework', id, { done: false }); renderSchool(); }
      if (act === 'del') { await L.remove('homework', id); renderSchool(); }
    });
    document.querySelectorAll('.exam').forEach(el => el.onclick = async e => {
      const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
      const ex = (await L.list('exams')).find(x => x.id === el.dataset.id);
      if (act === 'del') { await L.remove('exams', ex.id); renderSchool(); }
      if (act === 'plan') makePlan(ex, e.target.closest('button'));
      if (act === 'cards') { window.App.go('games'); Games.showGame('cards'); Extras.makeDeck({ text: `${ex.subject}: ${ex.topic || ex.subject}` }); }
    });
    $('scScan').onclick = scanSheet;
    $('scPptx').onclick = pptxDialog;
  }

  async function addHomework(h) {
    const item = await L.add('homework', { ...h, done: false });
    // reminder the afternoon before it is due
    if (h.due && daysUntil(h.due) >= 1) {
      const d = new Date(h.due + 'T17:00'); d.setDate(d.getDate() - 1);
      if (d.getTime() > Date.now()) await window.kairo.reminders.add({ at: d.toISOString(), text: `${t('sc.dueTomorrow')}: ${h.subject ? h.subject + ' – ' : ''}${h.task}` });
    }
    return item;
  }
  async function addExam(e) {
    const item = await L.add('exams', e);
    if (e.date && daysUntil(e.date) >= 2) {
      const d = new Date(e.date + 'T17:00'); d.setDate(d.getDate() - 2);
      if (d.getTime() > Date.now()) await window.kairo.reminders.add({ at: d.toISOString(), text: `${t('sc.examIn2')}: ${e.subject}` });
    }
    return item;
  }

  async function makePlan(ex, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    const n = ex.date ? Math.max(1, daysUntil(ex.date)) : 7;
    const r = await window.kairo.complete({
      text: `Make a realistic study plan for a school exam. Subject: ${ex.subject}. Topics: ${ex.topic || 'not given'}. Days left: ${n} (today is ${today()}).
One line per day ("**Mon 26.10.** – what to do, 20-45 min"), the last day only light review. Add 3 short tips at the end. Use the user's language, Markdown, short.`,
      extraSystem: 'You are a friendly study coach for a teenager.'
    });
    if (!r.ok) { toast(r.error.message); return renderSchool(); }
    await L.update('exams', ex.id, { plan: r.text });
    await renderSchool();
    document.querySelector(`.exam[data-id="${ex.id}"] details`)?.setAttribute('open', '');
  }

  // photo/screenshot/text of the homework sheet -> homework entries
  function scanSheet() {
    Today.modal(`<h2>📸 ${t('sc.scan')}</h2><p class="muted">${t('sc.scanHow')}</p>
      <div class="row"><button class="btn" id="scImg">🖼 ${t('sc.fromImage')}</button><button class="btn" id="scShot">🖥 ${t('fc.fromScreen')}</button><button class="btn" id="scClip">📋 ${t('fc.fromClip')}</button></div>
      <div id="scOut"></div><div class="row"><span style="flex:1"></span><button class="btn" data-close>${t('today.cancel')}</button></div>`);
    document.querySelector('#modalBox [data-close]').onclick = Today.closeModal;
    const run = async (text, images) => {
      $('scOut').innerHTML = `<div class="msg-status">${t('sc.reading')}</div>`;
      const r = await window.kairo.complete({
        text: (text ? 'Homework text:\n' + text + '\n\n' : 'The image shows a homework sheet / school planner.\n') +
          `Extract every homework task and every exam/test. Today is ${today()}; resolve weekdays like "Mittwoch" to the next date. Reply ONLY JSON: {"homework":[{"subject":"","task":"","due":"YYYY-MM-DD or empty"}],"exams":[{"subject":"","date":"YYYY-MM-DD","topic":""}]}`,
        extraSystem: 'You extract school tasks precisely. Output strictly valid JSON.', json: true, images
      });
      try {
        if (!r.ok) throw new Error(r.error.message);
        const j = parseJsonLoose(r.text);
        for (const h of j.homework || []) if (h.task) await addHomework(h);
        for (const e of j.exams || []) if (e.subject) await addExam(e);
        Today.closeModal(); toast(`📚 ${(j.homework || []).length} ${t('sc.homework')} · 📝 ${(j.exams || []).length} ${t('sc.exams')}`); renderSchool();
      } catch (e) { $('scOut').innerHTML = `<p class="msg error">${escAttr(e.message || t('quiz.fail'))}</p>`; }
    };
    $('scShot').onclick = async () => run(null, [await window.kairo.screen()]);
    $('scClip').onclick = async () => { const c = await window.kairo.clip.read(); if (c) run(c); else toast(t('fc.clipEmpty')); };
    $('scImg').onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => { const f = inp.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = () => run(null, [{ mime: f.type || 'image/jpeg', data: String(fr.result).split(',')[1] }]); fr.readAsDataURL(f); };
      inp.click();
    };
  }

  function pptxDialog(prefill = '') {
    Today.modal(`<h2>📊 ${t('sc.pptx')}</h2><p class="muted">${t('sc.pptxHow')}</p>
      <input class="field" id="ppTopic" placeholder="${t('sc.pptxPh')}" value="${escAttr(prefill)}">
      <div class="row"><label class="chess-level">${t('sc.slides')} <input type="range" id="ppN" min="5" max="14" value="8"><span id="ppNv">8</span></label><span style="flex:1"></span>
        <button class="btn" data-close>${t('today.cancel')}</button><button class="btn primary" id="ppGo">✨ ${t('sc.create')}</button></div><div id="ppOut"></div>`);
    document.querySelector('#modalBox [data-close]').onclick = Today.closeModal;
    $('ppN').oninput = e => { $('ppNv').textContent = e.target.value; };
    $('ppGo').onclick = async () => {
      const topic = $('ppTopic').value.trim(); if (!topic) return $('ppTopic').focus();
      $('ppGo').disabled = true; $('ppOut').innerHTML = `<div class="msg-status">${t('sc.making')}</div>`;
      const r = await window.kairo.create.pptx(topic, { slides: +$('ppN').value });
      if (!r.ok) { $('ppGo').disabled = false; $('ppOut').innerHTML = `<p class="msg error">${escAttr(r.error.message)}</p>`; return; }
      $('ppOut').innerHTML = `<div class="file-card"><div class="fc-icon">PPTX</div><div class="fc-info"><b>${escAttr(r.title)}</b><small>${r.slides} ${t('sc.slides')} · ${escAttr(r.path)}</small></div>
        <button class="btn" id="ppOpen">${t('files.open')}</button></div><p class="muted small">${t('sc.notesHint')}</p>`;
      $('ppOpen').onclick = () => window.kairo.action({ type: 'openfile', path: r.path });
    };
  }

  // ================= Today cards =================
  // --- football ---
  async function renderFootball() {
    const el = $('tdFoot'); if (!el) return;
    const fav = S().football || {};
    if (!fav.team) {
      const leagues = await window.kairo.football.leagues();
      el.innerHTML = `<p class="muted small">${t('ft.pick')}</p><div class="row"><select class="field" id="ftLeague">${Object.entries(leagues).map(([k, v]) => `<option value="${k}" ${k === (fav.league || 'sui.1') ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select class="field" id="ftTeam"><option>…</option></select></div>`;
      const loadTeams = async () => { const r = await window.kairo.football.teams($('ftLeague').value); $('ftTeam').innerHTML = `<option value="">${t('ft.team')}</option>` + (r.ok ? r.teams.map(x => `<option value="${x.id}">${escAttr(x.name)}</option>`).join('') : ''); };
      $('ftLeague').onchange = loadTeams; loadTeams();
      $('ftTeam').onchange = async e => { if (!e.target.value) return; await window.App.saveSettings({ football: { league: $('ftLeague').value, team: { id: e.target.value, name: e.target.selectedOptions[0].text } } }); renderFootball(); };
      return;
    }
    el.innerHTML = `<div class="msg-status">${t('earth.loading')}</div>`;
    const r = await window.kairo.football.matches(fav.league, fav.team.id);
    if (!r.ok) { el.innerHTML = `<p class="muted small">${escAttr(r.error.message)}</p>`; return; }
    if (r.stale) {
      // no live data for this league: let the AI look it up on the web
      el.innerHTML = `<div class="msg-status">${t('ft.searching')}</div>`;
      const today = new Date().toLocaleDateString('sv');
      const a = await window.kairo.complete({ text: `Today is ${today}. ${fav.team.name}: the most recent match result (played before today) and the next match (after today: date, time, opponent) of the CURRENT season. Very short, 2 lines, in the user's language. Never show matches from earlier years.`, webSearch: true, plain: true, extraSystem: `Use Google Search. Today is ${today}. Only facts you found for the current season; if you cannot find current data, say so in one short sentence.` });
      el.innerHTML = (a.ok ? `<div class="md small">${renderMarkdown(a.text)}</div>` : `<p class="muted small">${escAttr(a.error.message)}</p>`) +
        `<div class="row"><span class="muted small">${escAttr(fav.team.name)} · ${t('ft.web')}</span><span style="flex:1"></span><button class="btn sm" id="ftChange">${t('ft.change')}</button></div>`;
      $('ftChange').onclick = async () => { await window.App.saveSettings({ football: { team: null } }); renderFootball(); };
      return;
    }
    const live = r.events.find(e => e.state === 'in');
    const last = [...r.events].reverse().find(e => e.state === 'post');
    const next = r.events.find(e => e.state === 'pre');
    const row = (e, label) => !e ? '' : `<div class="match ${e.state === 'in' ? 'live' : ''}"><small>${label}</small>
      <div class="mt"><span>${escAttr(e.home.name)}</span><b>${e.state === 'pre' ? new Date(e.date).toLocaleString('de-CH', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : `${e.home.score} : ${e.away.score}`}</b><span>${escAttr(e.away.name)}</span></div>
      ${e.state === 'in' ? `<small class="live-badge">● LIVE ${escAttr(e.clock || '')}</small>` : ''}</div>`;
    el.innerHTML = row(live, '🔴 ' + t('ft.live')) + row(last, t('ft.last')) + row(next, t('ft.next')) +
      `<div class="row"><span class="muted small">${escAttr(fav.team.name)} · ${escAttr(r.league)}</span><span style="flex:1"></span><button class="btn sm" id="ftChange">${t('ft.change')}</button></div>`;
    $('ftChange').onclick = async () => { await window.App.saveSettings({ football: { team: null } }); renderFootball(); };
  }

  // --- money ---
  async function renderMoney() {
    const el = $('tdMoney'); if (!el) return;
    const list = (await L.list('money')).sort((a, b) => b.created - a.created);
    const total = list.reduce((s, m) => s + (+m.amount || 0), 0);
    const month = new Date().toISOString().slice(0, 7);
    const spent = list.filter(m => m.amount < 0 && new Date(m.created).toISOString().startsWith(month)).reduce((s, m) => s - m.amount, 0);
    el.innerHTML = `<div class="money-top"><b class="${total < 0 ? 'neg' : ''}">${total.toFixed(2)} CHF</b><small>${t('mn.spentMonth')}: ${spent.toFixed(2)}</small></div>
      <form class="hw-add" id="mnForm"><select class="field" id="mnSign" style="width:auto"><option value="-">− ${t('mn.out')}</option><option value="+">+ ${t('mn.in')}</option></select>
        <input class="field" id="mnAmt" type="number" step="0.05" min="0" placeholder="0.00" style="width:90px"><input class="field" id="mnNote" placeholder="${t('mn.what')}"><button class="btn sm">+</button></form>
      <ul class="money-list">${list.slice(0, 6).map(m => `<li><span class="${m.amount < 0 ? 'neg' : 'pos'}">${m.amount > 0 ? '+' : ''}${(+m.amount).toFixed(2)}</span><span>${escAttr(m.note || '')}</span><small>${new Date(m.created).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })}</small><button class="x" data-id="${m.id}">✕</button></li>`).join('')}</ul>`;
    $('mnForm').onsubmit = async e => {
      e.preventDefault();
      const a = +$('mnAmt').value; if (!a) return $('mnAmt').focus();
      await L.add('money', { amount: $('mnSign').value === '-' ? -a : a, note: $('mnNote').value.trim() });
      renderMoney();
    };
    el.querySelectorAll('.x').forEach(b => b.onclick = async () => { await L.remove('money', b.dataset.id); renderMoney(); });
  }

  // --- diary ---
  const MOODS = ['😄', '🙂', '😐', '😕', '😢', '😡', '🥳', '😴'];
  async function renderDiary() {
    const el = $('tdDiary'); if (!el) return;
    const list = (await L.list('diary')).sort((a, b) => b.created - a.created);
    const todays = list.find(d => d.date === today());
    el.innerHTML = todays ? `<div class="diary-today"><span>${todays.mood}</span><p>${escAttr(todays.text)}</p></div>` : `
      <p class="small">${t('dy.ask')}</p>
      <div class="moods" id="dyMoods">${MOODS.map(m => `<button data-m="${m}">${m}</button>`).join('')}</div>
      <textarea class="field" id="dyText" rows="2" placeholder="${t('dy.ph')}"></textarea><div class="row"><span style="flex:1"></span><button class="btn sm primary" id="dySave">${t('dy.save')}</button></div>`;
    el.insertAdjacentHTML('beforeend', `<div class="diary-list">${list.filter(d => d !== todays).slice(0, 4).map(d => `<div><span>${d.mood}</span><small>${new Date(d.date + 'T12:00').toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' })}</small><p>${escAttr(d.text).slice(0, 90)}</p></div>`).join('')}</div>`);
    if (!todays) {
      let mood = '🙂';
      el.querySelectorAll('#dyMoods button').forEach(b => b.onclick = () => { mood = b.dataset.m; el.querySelectorAll('#dyMoods button').forEach(x => x.classList.toggle('on', x === b)); });
      $('dySave').onclick = async () => { const text = $('dyText').value.trim(); if (!text) return $('dyText').focus(); await L.add('diary', { date: today(), mood, text }); renderDiary(); };
    }
  }

  // ================= Routines =================
  const STEP_TYPES = ['say', 'open', 'app', 'pc', 'music', 'remind', 'persona', 'focus', 'briefing', 'wait'];
  const TEMPLATES = [
    { name: 'Gute Nacht', phrase: 'gute nacht', steps: [{ type: 'say', value: 'Gute Nacht! Schlaf gut.' }, { type: 'remind', value: '07:00 | Guten Morgen! Aufstehen ⏰', alarm: true }, { type: 'pc', value: 'shutdown 30' }] },
    { name: 'Gaming-Modus', phrase: 'gaming modus', steps: [{ type: 'app', value: 'discord' }, { type: 'app', value: 'steam' }, { type: 'music', value: 'gaming' }, { type: 'persona', value: 'bro' }, { type: 'say', value: 'Gaming-Modus an. Viel Spass!' }] },
    { name: 'Lernmodus', phrase: 'lernmodus', steps: [{ type: 'persona', value: 'lockin' }, { type: 'music', value: 'study' }, { type: 'focus', value: '' }, { type: 'say', value: 'Lernmodus an. 25 Minuten Fokus, los gehts.' }] },
    { name: 'Guten Morgen', phrase: 'guten morgen', steps: [{ type: 'briefing', value: '' }] }
  ];

  async function runRoutine(nameOrPhrase) {
    const all = await L.list('routines');
    const q = String(nameOrPhrase || '').toLowerCase().trim();
    const r = all.find(x => x.name.toLowerCase() === q || (x.phrase && x.phrase.toLowerCase() === q)) || all.find(x => x.name.toLowerCase().includes(q));
    if (!r) return { ok: false, error: t('rt.notFound') };
    toast('⚡ ' + r.name);
    for (const s of r.steps || []) {
      try {
        if (s.type === 'say') await Voice.speak(s.value, S());
        if (s.type === 'open') await window.kairo.action({ type: 'open', url: s.value });
        if (s.type === 'app') await window.kairo.action({ type: 'app', name: s.value });
        if (s.type === 'pc') { const [a, v] = s.value.split(/\s+/); await window.kairo.pc(a, v); }
        if (s.type === 'music') Today.playMood(s.value || 'chill');
        if (s.type === 'remind') { const [when, text] = s.value.split('|').map(x => x.trim()); await window.kairo.reminders.add({ at: when, text: text || r.name, kind: s.alarm ? 'alarm' : 'reminder' }); Today.loadReminders(); }
        if (s.type === 'persona') await window.App.saveSettings({ persona: s.value });
        if (s.type === 'focus') document.getElementById('ftToggle')?.click();
        if (s.type === 'briefing') { window.App.go('today'); await Today.briefing(true); }
        if (s.type === 'wait') await new Promise(res => setTimeout(res, (+s.value || 1) * 1000));
      } catch (e) { toast(e.message); }
    }
    return { ok: true, name: r.name };
  }

  async function matchPhrase(text) {
    const q = text.toLowerCase().replace(/[!.?]/g, '').trim();
    const all = await L.list('routines');
    return all.find(r => r.phrase && r.phrase.toLowerCase() === q) || null;
  }

  async function routinesDialog() {
    let all = await L.list('routines');
    if (!all.length) { await L.addMany('routines', TEMPLATES); all = await L.list('routines'); }
    Today.modal(`<h2>⚡ ${t('rt.title')}</h2><p class="muted">${t('rt.how')}</p>
      <div class="routines">${all.map(r => `<div class="routine" data-id="${r.id}"><div><b>${escAttr(r.name)}</b><small>${r.phrase ? '🎙 „' + escAttr(r.phrase) + '"' : ''} · ${(r.steps || []).length} ${t('rt.steps')}</small></div>
        <button class="btn sm primary" data-act="run">▶</button><button class="btn sm" data-act="edit">✎</button><button class="x" data-act="del">✕</button></div>`).join('')}</div>
      <div class="row"><button class="btn" id="rtNew">+ ${t('rt.new')}</button><span style="flex:1"></span><button class="btn" data-close>${t('home.close') || 'OK'}</button></div>`);
    document.querySelector('#modalBox [data-close]').onclick = Today.closeModal;
    $('rtNew').onclick = () => editRoutine(null);
    document.querySelectorAll('.routine').forEach(el => el.onclick = async e => {
      const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
      const r = all.find(x => x.id === el.dataset.id);
      if (act === 'run') { Today.closeModal(); runRoutine(r.name); }
      if (act === 'edit') editRoutine(r);
      if (act === 'del') { await L.remove('routines', r.id); routinesDialog(); }
    });
  }

  function editRoutine(r) {
    const steps = r ? JSON.parse(JSON.stringify(r.steps || [])) : [{ type: 'say', value: '' }];
    const draw = () => {
      $('rtSteps').innerHTML = steps.map((s, i) => `<div class="rt-step" data-i="${i}"><select class="field" data-k="type">${STEP_TYPES.map(tp => `<option value="${tp}" ${tp === s.type ? 'selected' : ''}>${t('rt.t.' + tp)}</option>`).join('')}</select>
        <input class="field" data-k="value" value="${escAttr(s.value || '')}" placeholder="${t('rt.ph.' + s.type)}"><button class="x" data-k="del">✕</button></div>`).join('');
      $('rtSteps').querySelectorAll('.rt-step').forEach(row => {
        const i = +row.dataset.i;
        row.querySelector('[data-k=type]').onchange = e => { steps[i].type = e.target.value; draw(); };
        row.querySelector('[data-k=value]').oninput = e => { steps[i].value = e.target.value; };
        row.querySelector('[data-k=del]').onclick = () => { steps.splice(i, 1); draw(); };
      });
    };
    Today.modal(`<h2>⚡ ${r ? escAttr(r.name) : t('rt.new')}</h2>
      <input class="field" id="rtName" placeholder="${t('rt.name')}" value="${escAttr(r?.name || '')}">
      <input class="field" id="rtPhrase" placeholder="${t('rt.phrase')}" value="${escAttr(r?.phrase || '')}">
      <div id="rtSteps" class="rt-steps"></div>
      <div class="row"><button class="btn sm" id="rtAdd">+ ${t('rt.addStep')}</button><span style="flex:1"></span><button class="btn" id="rtBack">←</button><button class="btn primary" id="rtSave">${t('dy.save')}</button></div>`);
    draw();
    $('rtAdd').onclick = () => { steps.push({ type: 'say', value: '' }); draw(); };
    $('rtBack').onclick = routinesDialog;
    $('rtSave').onclick = async () => {
      const name = $('rtName').value.trim(); if (!name) return $('rtName').focus();
      const data = { name, phrase: $('rtPhrase').value.trim(), steps: steps.filter(s => s.type === 'focus' || s.type === 'briefing' || s.value) };
      if (r) await L.update('routines', r.id, data); else await L.add('routines', data);
      routinesDialog();
    };
  }

  function refreshToday() { renderFootball(); renderMoney(); renderDiary(); }

  // ================= Image + YouTube tools =================
  function imageDialog(prefill = '') {
    Today.modal(`<h2>🎨 ${t('im.title')}</h2><p class="muted">${t('im.how')}</p>
      <textarea class="field" id="imPrompt" rows="3" placeholder="${t('im.ph')}">${escAttr(prefill)}</textarea>
      <div class="row"><span class="muted small">${t('im.note')}</span><span style="flex:1"></span><button class="btn primary" id="imGo">✨ ${t('sc.create')}</button></div><div id="imOut"></div>`);
    $('imGo').onclick = async () => {
      const p = $('imPrompt').value.trim(); if (!p) return $('imPrompt').focus();
      $('imGo').disabled = true; $('imOut').innerHTML = `<div class="paint"><span>${t('im.making')}</span></div>`;
      // let the AI turn the idea into a good English prompt first
      const better = await window.kairo.complete({ text: `Turn this picture idea into one detailed English image-generation prompt (style, lighting, composition). Only output the prompt.\nIdea: ${p}` });
      const r = await window.kairo.create.image(better.ok ? better.text.trim() : p);
      $('imGo').disabled = false;
      $('imOut').innerHTML = r.ok ? `<figure class="gen-img"><img src="file:///${escAttr(r.path.replace(/\\/g, '/'))}"><figcaption>${escAttr(r.source)} · <a href="#" id="imOpen">${t('files.open')}</a></figcaption></figure>` : `<p class="msg error">${escAttr(r.error.message)}</p>`;
      if (r.ok) $('imOpen').onclick = e => { e.preventDefault(); window.kairo.action({ type: 'openfile', path: r.path }); };
    };
  }
  function youtubeDialog() {
    Today.modal(`<h2>▶️ ${t('yt.title')}</h2><p class="muted">${t('yt.how')}</p>
      <input class="field" id="ytUrl" placeholder="https://www.youtube.com/watch?v=…">
      <input class="field" id="ytQ" placeholder="${t('yt.q')}">
      <div class="row"><button class="btn" id="ytClip">📋 ${t('yt.paste')}</button><span style="flex:1"></span><button class="btn primary" id="ytGo">${t('yt.go')}</button></div><div id="ytOut" class="md"></div>`);
    $('ytClip').onclick = async () => { $('ytUrl').value = (await window.kairo.clip.read()).trim(); };
    $('ytGo').onclick = async () => {
      const u = $('ytUrl').value.trim(); if (!/youtu/.test(u)) return $('ytUrl').focus();
      $('ytGo').disabled = true; $('ytOut').innerHTML = `<div class="msg-status">${t('yt.watching')}</div>`;
      const r = await window.kairo.create.youtube(u, $('ytQ').value.trim() || undefined);
      $('ytGo').disabled = false;
      $('ytOut').innerHTML = r.ok ? renderMarkdown(r.text) + `<div class="row"><button class="btn sm" id="ytRead">🔊 ${t('chat.speak')}</button></div>` : `<p class="msg error">${escAttr(r.error.message)}</p>`;
      if (r.ok) $('ytRead').onclick = () => Voice.speak(r.text, S());
    };
  }

  function init() {
    $('tdRoutines').onclick = routinesDialog;
    $('tdImage').onclick = () => imageDialog();
    $('tdYoutube').onclick = youtubeDialog;
    window.kairo.football.onGoal(g => { toast(g.text); Voice.speak(t('ft.goal') + ' ' + g.text.replace('⚽', ''), S()); });
    // gentle diary nudge at 20:00 while Kairo is open
    setInterval(async () => {
      const h = new Date().getHours();
      if (h === 20 && !sessionStorage.getItem('dy-asked') && !(await L.list('diary')).some(d => d.date === today())) { sessionStorage.setItem('dy-asked', '1'); toast('📔 ' + t('dy.ask')); }
    }, 10 * 60000);
  }

  return { init, imageDialog, youtubeDialog, renderSchool, refreshToday, renderFootball, renderMoney, renderDiary, runRoutine, matchPhrase, routinesDialog, addHomework, addExam, pptxDialog };
})();
