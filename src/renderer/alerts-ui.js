// "Kairo calls you": settings section (setup steps), guard mode, alerts on the PC, phone "say on PC".
window.AlertsUI = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TRIG = [['security', 'shield', 'al.security'], ['guard', 'eye', 'al.guard'], ['mail', 'mail', 'al.mail'], ['update', 'refresh-cw', 'al.update'], ['disk', 'hard-drive', 'al.disk'], ['reminder', 'bell', 'al.reminder'], ['birthday', 'cake', 'al.birthday'], ['goal', 'goal', 'al.goal']];

  async function renderSettings(inner, S, save, rerender) {
    if (!inner) return;
    // "how should Kairo call you?" goes into the profile section
    const prof = inner.querySelector('.set-section');
    if (prof && !$('sTitle')) prof.querySelector('h2').insertAdjacentHTML('afterend', `<div class="set-row"><label>${t('al.callMe')}</label><input class="field" id="sTitle" value="${esc(S.userTitle || '')}" placeholder="${t('al.callMePh')}"></div>`);
    if ($('sTitle')) $('sTitle').onchange = e => save({ userTitle: e.target.value.trim() });

    const r = await window.kairo.alerts.get();
    const c = r.cfg;
    inner.insertAdjacentHTML('beforeend', `
      <section class="set-section al-sec" id="alSec">
        <h2>${ic('smartphone')} ${t('al.title')}</h2>
        <p class="muted small">${t('al.desc')}</p>
        <div class="set-row"><label>${t('al.on')}</label><label class="tog"><input type="checkbox" id="alOn" ${c.enabled ? 'checked' : ''}><span>${t('al.onDesc')}</span></label></div>

        <div class="al-steps">
          <div class="al-step"><span class="al-n">1</span><div>
            <b>${t('al.s1')}</b><p class="muted small">${t('al.s1d')}</p>
            <div class="al-topic"><code id="alTopic">${esc(c.ntfyTopic || '—')}</code><button class="btn" id="alNewTopic">${ic('refresh-cw')} ${t('al.newTopic')}</button></div>
            <div class="al-qr" id="alQr"></div>
            <div class="key-row"><button class="btn" id="alTestPush">${ic('bell')} ${t('al.testPush')}</button></div></div></div>
          <div class="al-step"><span class="al-n">2</span><div>
            <b>${t('al.s2')}</b><p class="muted small">${t('al.s2d')}</p>
            <div class="key-row"><input class="field" id="alTg" placeholder="@deinname" value="${esc(c.telegram || '')}"><button class="btn" id="alTgOpen">${ic('external-link')} @CallMeBot_txtbot</button></div>
            <div class="key-row"><button class="btn primary" id="alTestCall">${ic('smartphone')} ${t('al.testCall')}</button><span class="muted small" id="alCallRes"></span></div></div></div>
          <div class="al-step"><span class="al-n">3</span><div>
            <b>${t('al.s3')}</b>
            <div class="al-trig">${TRIG.map(([k, icon, label]) => { const tr = c.triggers[k] || {}; return `<div class="al-t" data-k="${k}"><label class="tog"><input type="checkbox" ${tr.on !== false ? 'checked' : ''}><span>${ic(icon)} ${t(label)}</span></label>
              <div class="seg sm">${['push', 'call'].map(l => `<button data-l="${l}" class="${(tr.level || 'push') === l ? 'active' : ''}">${t('al.' + l)}</button>`).join('')}</div></div>`; }).join('')}</div>
            <div class="set-row"><label>${t('al.mailN')}</label><input class="field" type="number" min="1" max="50" id="alMailN" value="${c.triggers.mail.threshold || 5}" style="max-width:90px"></div>
            <div class="set-row"><label>${t('al.quiet')}</label><div class="key-row"><input class="field" type="number" min="0" max="23" id="alQf" value="${c.quietFrom}" style="max-width:80px"><span>–</span><input class="field" type="number" min="0" max="23" id="alQt" value="${c.quietTo}" style="max-width:80px"><span class="muted small">${t('al.quietD')}</span></div></div>
            <div class="set-row"><label>${t('al.atPc')}</label><label class="tog"><input type="checkbox" id="alAtPc" ${c.callAtPc ? 'checked' : ''}><span>${t('al.atPcD')}</span></label></div></div></div>
        </div>
        <div class="al-guard"><div>${ic('eye')}<div><b>${t('al.guardT')}</b><small>${t('al.guardD')}</small></div></div><button class="btn ${r.guard ? 'primary' : ''}" id="alGuardBtn">${r.guard ? t('al.guardOff') : t('al.guardOn')}</button></div>
        <p class="muted small">${t('al.privacy')}</p>
      </section>`);
    const saveA = patch => save({ alerts: patch });
    const qr = async topic => { $('alQr').innerHTML = topic ? `<img alt="" src="${await window.kairo.alerts.qr('ntfy://ntfy.sh/' + topic)}"><small>${t('al.qr')}</small>` : ''; };
    if (!c.ntfyTopic) { const n = await window.kairo.alerts.newTopic(); c.ntfyTopic = n.topic; await saveA({ ntfyTopic: n.topic }); $('alTopic').textContent = n.topic; }
    qr(c.ntfyTopic);
    $('alOn').onchange = e => saveA({ enabled: e.target.checked });
    $('alNewTopic').onclick = async () => { const n = await window.kairo.alerts.newTopic(); await saveA({ ntfyTopic: n.topic }); $('alTopic').textContent = n.topic; qr(n.topic); };
    $('alTg').onchange = e => saveA({ telegram: e.target.value.trim() });
    $('alTgOpen').onclick = () => window.kairo.action({ type: 'open', url: 'https://t.me/CallMeBot_txtbot' });
    $('alTestPush').onclick = async () => { $('alTestPush').disabled = true; const r = await window.kairo.alerts.test('push'); $('alTestPush').disabled = false; window.toast(r.ok && r.alert?.sent?.push ? '✓ ' + t('al.pushOk') : '✕ ' + t('al.pushFail')); };
    $('alTestCall').onclick = async () => {
      await saveA({ telegram: $('alTg').value.trim() });
      $('alCallRes').textContent = t('al.calling'); $('alTestCall').disabled = true;
      const r = await window.kairo.alerts.test('call');
      $('alTestCall').disabled = false;
      const call = r.alert?.sent?.call;
      $('alCallRes').innerHTML = call?.ok ? '✓ ' + t('al.callOk') : '✕ ' + esc(call?.text || r.error?.message || '').slice(0, 300) + (/authori/i.test(call?.text || '') ? `<br><a href="#" id="alAuth">${t('al.auth')}</a>` : '');
      if ($('alAuth')) $('alAuth').onclick = e => { e.preventDefault(); window.kairo.action({ type: 'open', url: 'https://t.me/CallMeBot_txtbot' }); };
    };
    document.querySelectorAll('.al-t').forEach(row => {
      const k = row.dataset.k;
      row.querySelector('input').onchange = e => saveA({ triggers: { [k]: { on: e.target.checked } } });
      row.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { row.querySelectorAll('[data-l]').forEach(x => x.classList.toggle('active', x === b)); saveA({ triggers: { [k]: { level: b.dataset.l } } }); });
    });
    $('alMailN').onchange = e => saveA({ triggers: { mail: { threshold: Math.max(1, +e.target.value || 5) } } });
    $('alQf').onchange = e => saveA({ quietFrom: +e.target.value || 0 });
    $('alQt').onchange = e => saveA({ quietTo: +e.target.value || 0 });
    $('alAtPc').onchange = e => saveA({ callAtPc: e.target.checked });
    $('alGuardBtn').onclick = async () => { const on = !(await window.kairo.alerts.get()).guard; await setGuard(on); rerender(); };
  }

  async function setGuard(on) {
    const r = await window.kairo.alerts.guard(on);
    window.toast(on ? t('al.guardOnToast') : t('al.guardOffToast'));
    return r;
  }

  // alerts also show up on the PC as a desktop card
  window.kairo.alerts.onNew(a => {
    window.kairo.stage.show({ type: 'info', icon: { security: 'shield', guard: 'eye', mail: 'mail', update: 'refresh-cw', disk: 'hard-drive', goal: 'goal', birthday: 'cake', reminder: 'bell' }[a.trigger] || 'bell', kicker: t('al.kicker') + (a.level === 'call' ? ' · ' + t('al.call') : ''), title: a.title, lines: [a.message] });
  });
  window.kairo.alerts.onGuard(on => document.body.classList.toggle('guard-on', !!on));
  // the phone can make Kairo say something out loud on the PC
  window.kairo.alerts.onSay(text => { window.toast('📱 ' + text); Voice.speak(text, window.App.settings()); });

  return { renderSettings, setGuard };
})();
