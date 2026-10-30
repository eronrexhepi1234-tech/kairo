// Show centre: Jarvis mode, desktop pet, game maker, music quiz, world TV, live subtitles, game commentator,
// flight tracker, radio morning show, wake-up show, weather on the desktop, fireworks & party.
const $s = id => document.getElementById(id);
const escS = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const toWavUrl = a => (/L16|pcm/i.test(a.mime) ? Voice.pcmToWavUrl(a.audio, +(a.mime.match(/rate=(\d+)/) || [])[1] || 24000) : `data:${a.mime};base64,${a.audio}`);

// ================= Jarvis =================
window.Jarvis = (function () {
  let on = false;
  function set(v = !on, quiet) { on = !!v; window.kairo.stage.show({ type: 'jarvis', on }); if (on && !quiet) Voice.speak(t('jv.hello', { name: window.App.settings().userTitle || '' }), window.App.settings()); window.Show?.refresh(); return on; }
  window.kairo.show.onJarvis(() => set());
  return { set, isOn: () => on };
})();

// ================= desktop pet =================
window.Pet = { set: async v => { await window.kairo.pet.show(!!v); window.Show?.refresh(); return v; }, isOn: () => !!window.App.settings().pet };

// ================= game maker =================
window.GameMaker = (function () {
  let cur = null, frame = null;
  const IDEAS = 'Ein Drache weicht Meteoriten aus|Flappy-Bird mit einer Rakete im Weltraum|Fussball-Penaltyschiessen gegen einen Torwart|Snake mit Neon-Look und Power-ups|Ninja springt über Dächer|Autorennen von oben mit Nitro';
  function ui() {
    let el = $s('gmOverlay');
    if (!el) { document.body.insertAdjacentHTML('beforeend', '<div class="fx-ov gm" id="gmOverlay"></div>'); el = $s('gmOverlay'); }
    requestAnimationFrame(() => el.classList.add('on'));
    return el;
  }
  async function open(idea) {
    const el = ui();
    const games = await window.kairo.show.games();
    el.innerHTML = `<div class="gm-wrap">
      <aside class="gm-side"><div class="gm-head"><span>${ic('gamepad-2')}</span><div><small>${t('gm.kicker')}</small><b>${t('gm.title')}</b></div><button class="fx-x" id="gmX">${ic('x')}</button></div>
        <form id="gmForm"><textarea class="field" id="gmIdea" rows="3" placeholder="${t('gm.ph')}"></textarea><button class="btn primary">${ic('wand-sparkles')} ${t('gm.make')}</button></form>
        <div class="gm-ideas">${IDEAS.split('|').map(i => `<button>${escS(i)}</button>`).join('')}</div>
        <h4>${t('gm.mine')}</h4><div class="gm-list">${games.map(g => `<button data-f="${escS(g.file)}">${ic('gamepad-2')} ${escS(g.name)}</button>`).join('') || `<small class="muted">${t('gm.none')}</small>`}</div></aside>
      <section class="gm-stage"><div class="gm-screen" id="gmScreen"><div class="gm-empty">${ic('gamepad-2')}<b>${t('gm.empty')}</b></div></div>
        <form class="gm-change" id="gmChange" hidden><input class="field" id="gmEdit" placeholder="${t('gm.changePh')}"><button class="btn">${ic('wand-sparkles')} ${t('gm.change')}</button><button type="button" class="btn" id="gmFull">${ic('external-link')}</button></form></section></div>`;
    $s('gmX').onclick = () => { el.classList.remove('on'); setTimeout(() => { el.innerHTML = ''; }, 400); };
    $s('gmForm').onsubmit = e => { e.preventDefault(); const v = $s('gmIdea').value.trim(); if (v) make(v); };
    el.querySelectorAll('.gm-ideas button').forEach(b => b.onclick = () => { $s('gmIdea').value = b.textContent; make(b.textContent); });
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = async () => { const html = await window.kairo.show.gameFile(b.dataset.f); cur = { html, file: b.dataset.f, title: b.textContent.trim() }; play(); });
    $s('gmChange').onsubmit = e => { e.preventDefault(); const v = $s('gmEdit').value.trim(); if (v && cur) { $s('gmEdit').value = ''; make(v, cur.html); } };
    $s('gmFull').onclick = () => cur && window.kairo.action({ type: 'openfile', path: cur.file });
    if (idea) { $s('gmIdea').value = idea; make(idea); }
  }
  async function make(idea, prev) {
    const scr = $s('gmScreen');
    scr.innerHTML = `<div class="gm-building"><div class="gm-code">${Array.from({ length: 14 }, (_, i) => `<i style="width:${20 + Math.random() * 70}%;animation-delay:${i * .12}s"></i>`).join('')}</div><b>${prev ? t('gm.changing') : t('gm.building')}</b><small>${escS(idea)}</small></div>`;
    const r = await window.kairo.show.game(idea, prev || null);
    if (!r.ok) { scr.innerHTML = `<div class="gm-empty"><b>✕ ${escS(r.error.message)}</b></div>`; return null; }
    cur = r; play();
    return r;
  }
  function play() {
    const scr = $s('gmScreen');
    scr.innerHTML = `<iframe sandbox="allow-scripts allow-pointer-lock" src="game-host.html" id="gmFrame"></iframe><div class="gm-title">${ic('gamepad-2')} ${escS(cur.title)}</div>`;
    frame = $s('gmFrame');
    $s('gmChange').hidden = false;
    const send = e => { if (e.source === frame.contentWindow && e.data?.hostReady) { frame.contentWindow.postMessage({ html: cur.html }, '*'); window.removeEventListener('message', send); setTimeout(() => frame.focus(), 300); } };
    window.addEventListener('message', send);
  }
  return { open, make };
})();

// ================= music quiz =================
window.MusicQuiz = (function () {
  let rounds = [], i = 0, score = 0, audio = null, timer = 0;
  async function open() {
    const el = overlay('mqOverlay', 'mq');
    el.innerHTML = `<div class="mq-box"><button class="fx-x" data-close>${ic('x')}</button><div class="mq-stage" id="mqStage"><div class="mq-load"><div class="mq-eq">${'<i></i>'.repeat(5)}</div><b>${t('mq.loading')}</b></div></div></div>`;
    el.querySelector('[data-close]').onclick = close;
    const r = await window.kairo.show.musicQuiz(8);
    if (!r.ok) { $s('mqStage').innerHTML = `<b>✕ ${escS(r.error.message)}</b>`; return; }
    rounds = r.rounds; i = 0; score = 0;
    round();
  }
  function round() {
    clearInterval(timer); audio?.pause();
    if (i >= rounds.length) return end();
    const q = rounds[i];
    $s('mqStage').innerHTML = `<div class="mq-top"><span>${t('mq.round')} ${i + 1}/${rounds.length}</span><b id="mqScore">${score}</b></div>
      <div class="mq-disc" id="mqDisc"><div class="mq-eq big">${'<i></i>'.repeat(7)}</div></div>
      <div class="mq-time"><i id="mqBar"></i></div>
      <div class="mq-choices">${q.choices.map((c, j) => `<button data-c="${escS(c)}" style="animation-delay:${j * 80}ms">${escS(c)}</button>`).join('')}</div>`;
    audio = new Audio(q.preview); audio.volume = .85; audio.currentTime = 0; audio.play().catch(() => {});
    const t0 = Date.now(), MAX = 15000;
    timer = setInterval(() => { const p = Math.max(0, 1 - (Date.now() - t0) / MAX); if ($s('mqBar')) $s('mqBar').style.width = p * 100 + '%'; if (p <= 0) answer(null); }, 100);
    document.querySelectorAll('.mq-choices button').forEach(b => b.onclick = () => answer(b, Date.now() - t0));
  }
  function answer(btn, ms) {
    clearInterval(timer);
    const q = rounds[i], right = `${q.title} – ${q.artist}`;
    document.querySelectorAll('.mq-choices button').forEach(b => { b.disabled = true; if (b.dataset.c === right) b.classList.add('right'); });
    if (btn && btn.dataset.c === right) { const pts = Math.round(100 + 900 * Math.max(0, 1 - ms / 15000)); score += pts; $s('mqScore').textContent = score; $s('mqScore').classList.add('pop'); }
    else if (btn) btn.classList.add('wrong');
    $s('mqDisc').innerHTML = `<img src="${escS(q.cover)}" alt="">`; $s('mqDisc').classList.add('reveal');
    setTimeout(() => { i++; round(); }, 2800);
  }
  function end() {
    audio?.pause();
    let best = 0; try { best = +localStorage.getItem('kairo.mqBest') || 0; if (score > best) localStorage.setItem('kairo.mqBest', score); } catch {}
    $s('mqStage').innerHTML = `<div class="mq-end">${ic('trophy')}<small>${t('mq.end')}</small><b>${score}</b><span>${score > best ? t('geo.record') : t('geo.best') + ' ' + best}</span><button class="btn primary" id="mqAgain">${ic('refresh-cw')} ${t('geo.again')}</button></div>`;
    $s('mqAgain').onclick = open;
    if (score > best) confettiAt($s('mqStage'));
  }
  function close() { clearInterval(timer); audio?.pause(); closeOverlay('mqOverlay'); }
  return { open, close };
})();

// ================= world TV =================
window.WorldTV = (function () {
  const PLACES = ['Times Square New York', 'Shibuya Crossing Tokyo', 'Venedig Canal Grande', 'Zermatt Matterhorn', 'Niagara Falls', 'Copacabana Rio', 'Hawaii Waikiki Beach', 'Santorini', 'Dubai Marina', 'Amsterdam', 'Prag Altstadt', 'Jackson Hole', 'Lofoten Norwegen', 'Sydney Harbour', 'Interlaken'];
  let ch = 0, timer = 0, list = [];
  async function open() {
    list = [...PLACES].sort(() => Math.random() - .5);
    const el = overlay('tvOverlay', 'tv');
    el.innerHTML = `<div class="tv-box"><div class="tv-screen" id="tvScreen"></div><div class="tv-lower" id="tvLower"></div>
      <div class="tv-logo"><b>KAIRO</b> WORLD TV <i></i> LIVE</div>
      <div class="tv-ctl"><button id="tvPrev">${ic('skip-back')}</button><button id="tvNext">${ic('skip-forward')}</button><button data-close>${ic('x')}</button></div></div>`;
    el.querySelector('[data-close]').onclick = close;
    $s('tvPrev').onclick = () => go(ch - 1); $s('tvNext').onclick = () => go(ch + 1);
    go(0);
  }
  async function go(n) {
    clearTimeout(timer);
    ch = (n + list.length) % list.length;
    const place = list[ch];
    const scr = $s('tvScreen'); if (!scr) return;
    scr.innerHTML = '<div class="cam-static"></div>'; $s('tvLower').classList.remove('on');
    const r = await window.kairo.earth2.webcams(place);
    if (!$s('tvScreen')) return;
    const cam = r.ok && r.list[0];
    if (!cam) { timer = setTimeout(() => go(ch + 1), 1500); return; }
    scr.classList.remove('tv-on'); void scr.offsetWidth; scr.classList.add('tv-on');
    scr.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${cam.id}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1" allow="autoplay; encrypted-media"></iframe>`;
    $s('tvLower').innerHTML = `<small>${t('tv.ch')} ${ch + 1}</small><b>${escS(place)}</b><span>${new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} · ${escS(cam.title).slice(0, 70)}</span>`;
    setTimeout(() => $s('tvLower')?.classList.add('on'), 1200);
    timer = setTimeout(() => go(ch + 1), 75000);
  }
  function close() { clearTimeout(timer); closeOverlay('tvOverlay'); }
  return { open, close };
})();

// ================= live subtitles (what plays on the PC) =================
window.Subtitles = (function () {
  let stream = null, rec = null, on = false, lang = null;
  async function start(target) {
    if (on) return true;
    lang = target || window.App.settings().language;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: 'desktop' } }, video: { mandatory: { chromeMediaSource: 'desktop', maxWidth: 32, maxHeight: 32, maxFrameRate: 1 } } });
      stream.getVideoTracks().forEach(t => t.stop());
    } catch { window.toast('✕ ' + t('mv.noAudio')); return false; }
    on = true; window.kairo.stage.show({ type: 'subtitle', text: '' });
    loop(); window.Show?.refresh();
    return true;
  }
  function loop() {
    if (!on) return;
    const chunks = [];
    rec = new MediaRecorder(new MediaStream(stream.getAudioTracks()), { mimeType: 'audio/webm;codecs=opus' });
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = async () => {
      if (on) loop(); // next piece starts right away
      const blob = new Blob(chunks, { type: 'audio/webm' });
      if (blob.size < 2500) return;
      const r = await window.kairo.show.subtitle(await blobToB64(blob), 'audio/webm', lang);
      if (r.ok && r.text) window.kairo.stage.show({ type: 'subtitle', text: r.text });
    };
    rec.start();
    setTimeout(() => rec?.state === 'recording' && rec.stop(), 7000);
  }
  function stop() { on = false; try { rec?.state === 'recording' && rec.stop(); } catch {} stream?.getTracks().forEach(t => t.stop()); stream = null; window.kairo.stage.show({ type: 'subtitle', off: true }); window.Show?.refresh(); }
  return { start, stop, isOn: () => on, toggle: () => (on ? (stop(), false) : start()) };
})();

// ================= game commentator =================
window.Commentator = (function () {
  let on = false, timer = 0, busy = false;
  async function once() {
    if (busy || !on) return; busy = true;
    const r = await window.kairo.show.comment();
    busy = false;
    if (!r.ok || !on) return;
    window.kairo.stage.show({ type: 'caption', who: 'ai', text: '🎙 ' + r.text, done: true });
    if (r.audio) { const a = new Audio(toWavUrl(r.audio)); a.volume = .9; a.play().catch(() => {}); }
  }
  function set(v = !on) { on = !!v; clearInterval(timer); if (on) { once(); timer = setInterval(once, 28000); window.toast('🎙 ' + t('cm.on')); } window.Show?.refresh(); return on; }
  return { set, isOn: () => on };
})();

// ================= flight tracker (on the Earth) =================
window.Flight = (function () {
  let timer = 0, code = null, first = true;
  const PLANE = '<svg viewBox="0 0 24 24"><path d="M12 2c.8 0 1.3.9 1.3 2v5.2l7.7 4.4v2l-7.7-2.3v4.4l2.2 1.7v1.6L12 20l-3.5 1v-1.6l2.2-1.7v-4.4L3 15.6v-2l7.7-4.4V4c0-1.1.5-2 1.3-2z"/></svg>';
  async function track(q) {
    code = q; first = true; clearInterval(timer);
    window.App.go('earth'); Earth.init();
    const ok = await update();
    if (ok) timer = setInterval(update, 15000);
    return ok;
  }
  async function update() {
    const r = await window.kairo.show.flight(code);
    if (!r.ok) { window.toast('✕ ' + r.error.message); stop(); return null; }
    const f = r.flight, p = f.pos, rt = f.route;
    const el = document.createElement('div'); el.className = 'fl-plane'; el.innerHTML = PLANE; el.style.setProperty('--h', (p?.track || 0) + 'deg');
    Earth.setLayer('flight', {
      html: p ? [{ lat: p.lat, lng: p.lng, alt: 0.012, el }] : [],
      paths: rt?.from && rt?.to ? [{ pts: [[rt.from.lat, rt.from.lng, 0.001], ...(p ? [[p.lat, p.lng, 0.012]] : []), [rt.to.lat, rt.to.lng, 0.001]], color: ['rgba(255,170,90,.95)', 'rgba(111,211,255,.8)'], stroke: 2.2, dash: 0.03, gap: 0.008, anim: 3000 }] : [],
      rings: rt?.to ? [{ lat: rt.to.lat, lng: rt.to.lng, maxR: 2.5, period: 1200 }] : []
    });
    if (first && p) { first = false; Earth.globe().pointOfView({ lat: p.lat, lng: p.lng, altitude: 0.9 }, 2400); }
    panel(f);
    return f;
  }
  function panel(f) {
    const pn = Earth.panel(); pn.classList.add('open');
    $s('epCoords').textContent = f.pos ? `${f.pos.lat.toFixed(2)}° · ${f.pos.lng.toFixed(2)}°` : '';
    $s('epPlace').textContent = '✈ ' + (f.route?.flight || f.code);
    $s('epWhat').disabled = $s('epAsk').disabled = true;
    const rt = f.route, p = f.pos;
    $s('epBody').innerHTML = `${rt?.from && rt?.to ? `<div class="lay-route"><div><b>${escS(rt.from.code)}</b><small>${escS(rt.from.city || '')}</small></div><div class="lay-line"><i style="left:calc(${(f.progress ?? .5) * 100}% - 14px);animation:none;opacity:1">✈</i></div><div><b>${escS(rt.to.code)}</b><small>${escS(rt.to.city || '')}</small></div></div>
      <div class="fl-prog"><i style="width:${(f.progress ?? 0) * 100}%"></i></div>` : ''}
      <div class="muted small">${escS(rt?.airline || '')} ${p?.type ? '· ' + escS(p.type) : ''} ${p?.reg ? '· ' + escS(p.reg) : ''}</div>
      ${p ? `<div class="lay-facts"><div><small>${t('lay.altitude')}</small><b>${p.alt.toLocaleString('de-CH')} m</b></div><div><small>${t('lay.speed')}</small><b>${p.speed} km/h</b></div><div><small>${t('fl.left')}</small><b>${f.leftKm != null ? f.leftKm.toLocaleString('de-CH') + ' km' : '–'}</b></div></div>
        ${f.etaMin != null ? `<div class="fl-eta">${ic('clock')} ${t('fl.eta')} <b>${new Date(Date.now() + f.etaMin * 60000).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</b> <small>(${t('fl.in')} ${Math.floor(f.etaMin / 60) ? Math.floor(f.etaMin / 60) + ' h ' : ''}${f.etaMin % 60} min)</small></div>` : ''}` : `<div class="muted small">${t('fl.notAir')}</div>`}
      <button class="btn" id="flStop">${ic('x')} ${t('fl.stop')}</button>`;
    $s('flStop').onclick = stop;
  }
  function stop() { clearInterval(timer); Earth.setLayer('flight', { html: [], paths: [], rings: [] }); }
  const looksLike = q => /^[a-z]{2,3}\s?\d{1,4}[a-z]?$/i.test(String(q).trim());
  return { track, stop, looksLike };
})();

// ================= radio morning show =================
window.RadioShow = (function () {
  let audio = null;
  function jingle() {
    try {
      const c = new AudioContext(), now = c.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, now + i * .14); g.gain.exponentialRampToValueAtTime(.25, now + i * .14 + .03); g.gain.exponentialRampToValueAtTime(.0001, now + i * .14 + .5); o.connect(g); g.connect(c.destination); o.start(now + i * .14); o.stop(now + i * .14 + .55); });
      setTimeout(() => c.close(), 1500);
    } catch {}
  }
  async function open() {
    const el = overlay('rsOverlay', 'rs');
    el.innerHTML = `<div class="rs-box"><button class="fx-x" data-close>${ic('x')}</button>
      <div class="rs-onair" id="rsOn">ON AIR</div><h2>Radio Kairo</h2><small>${t('rs.morning')}</small>
      <div class="rs-hosts"><div class="rs-host" id="rsK"><span>K</span><b>Kairo</b></div><div class="rs-wave" id="rsWave">${'<i></i>'.repeat(24)}</div><div class="rs-host" id="rsL"><span>L</span><b>Lina</b></div></div>
      <p class="rs-line" id="rsLine">${t('rs.prep')}</p></div>`;
    el.querySelector('[data-close]').onclick = close;
    const r = await window.kairo.show.radio();
    if (!$s('rsLine')) return;
    if (!r.ok || !r.audio) { $s('rsLine').textContent = '✕ ' + (r.error?.message || t('rs.fail')); return; }
    const lines = r.script.split('\n').map(l => ({ who: l.split(':')[0].trim(), text: l.slice(l.indexOf(':') + 1).trim() }));
    jingle();
    await new Promise(res => setTimeout(res, 1100));
    audio = new Audio(toWavUrl(r.audio));
    $s('rsOn').classList.add('live');
    audio.play();
    // captions roughly in time with the voices (by text length)
    const total = lines.reduce((s, l) => s + l.text.length, 0);
    audio.onloadedmetadata = () => {
      let acc = 0;
      lines.forEach(l => {
        const at = acc / total * audio.duration * 1000; acc += l.text.length;
        setTimeout(() => { if (!$s('rsLine')) return; $s('rsLine').innerHTML = `<b>${escS(l.who)}:</b> ${escS(l.text)}`; $s('rsK').classList.toggle('talk', /kairo/i.test(l.who)); $s('rsL').classList.toggle('talk', /lina/i.test(l.who)); }, at);
      });
    };
    audio.onended = () => { $s('rsOn')?.classList.remove('live'); setTimeout(close, 2500); };
  }
  function close() { audio?.pause(); closeOverlay('rsOverlay'); }
  return { open, close };
})();

// ================= wake-up show (replaces the plain alarm pop-up) =================
window.WakeShow = (function () {
  let ctx = null, timer = 0;
  function music() {
    // soft rising chords instead of a harsh beep
    ctx = new AudioContext(); const now = ctx.currentTime; const master = ctx.createGain(); master.gain.setValueAtTime(.0001, now); master.gain.exponentialRampToValueAtTime(.35, now + 20); master.connect(ctx.destination);
    const chords = [[261, 329, 392], [220, 277, 329], [174, 220, 261], [196, 246, 293]];
    let i = 0;
    const play = () => { const t0 = ctx.currentTime; chords[i++ % 4].forEach(f => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.2, t0 + .4); g.gain.exponentialRampToValueAtTime(.0001, t0 + 2.3); o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 2.4); }); };
    play(); timer = setInterval(play, 2400);
  }
  async function run(r) {
    const el = overlay('wkOverlay', 'wk');
    const S = window.App.settings();
    el.innerHTML = `<div class="wk-sky"><div class="wk-sun"></div><div class="wk-hills"></div></div>
      <div class="wk-content"><small>${t('wk.morning')}</small><h1 id="wkTime">${new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</h1><h2>${t('wk.hello', { name: S.userTitle || '' })}</h2><p>${escS(r.text || '')}</p>
      <div class="wk-wx" id="wkWx"></div>
      <div class="wk-btns"><button class="btn" id="wkSnooze">${ic('moon-star')} ${t('today.snooze')}</button><button class="btn primary" id="wkUp">${ic('sun')} ${t('wk.up')}</button><button class="btn" id="wkRadio">${ic('radio')} Radio Kairo</button></div></div>`;
    music();
    const w = await window.kairo.weather().catch(() => null);
    if (w?.ok && $s('wkWx')) WeatherFX.card($s('wkWx'), w, { compact: true });
    setTimeout(() => Voice.speak(t('wk.say', { name: S.userTitle || '', time: new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) }) + (w?.ok ? ` ${w.now.temp} Grad, ${w.now.text}.` : '') + ' ' + (r.text || ''), S), 3500);
    const close = () => { clearInterval(timer); ctx?.close(); closeOverlay('wkOverlay'); Today.loadReminders(); };
    $s('wkUp').onclick = close;
    $s('wkSnooze').onclick = async () => { await window.kairo.reminders.snooze(r, 5); close(); };
    $s('wkRadio').onclick = () => { close(); RadioShow.open(); };
    setTimeout(() => { clearInterval(timer); }, 10 * 60000);
  }
  // take over alarms (reminders keep the normal pop-up)
  // (today.js loads after this file, so hook in once everything is there)
  const hook = () => { if (!window.Today || window.Today.__wake) return; const orig = window.Today.showAlert; window.Today.showAlert = r => (r.kind === 'alarm' && window.App.settings().wakeShow !== false ? run(r) : orig(r)); window.Today.__wake = true; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else setTimeout(hook, 0);
  return { run };
})();

// ================= weather on the desktop =================
window.DesktopWeather = (function () {
  let timer = 0;
  async function apply() {
    const w = await window.kairo.weather();
    if (!w.ok) { window.toast(t('sky.noCity')); return; }
    const kind = WeatherFX.kind(w.now.code, w.now.isDay);
    const map = { rain: 'rain', storm: 'storm', snow: 'snow', fog: 'fog', clear: 'clear', partly: 'partly' };
    window.kairo.stage.show({ type: 'weatherfx', kind: map[kind] || null, intensity: /storm/.test(kind) ? 1.4 : 1 });
  }
  async function set(v) { await window.App.saveSettings({ desktopWeather: !!v }); clearInterval(timer); if (v) { apply(); timer = setInterval(apply, 30 * 60000); } else window.kairo.stage.show({ type: 'weatherfx', off: true }); window.Show?.refresh(); return v; }
  // test any weather: DesktopWeather.demo('snow')
  const demo = kind => window.kairo.stage.show({ type: 'weatherfx', kind });
  if (window.App?.settings?.()?.desktopWeather) setTimeout(() => set(true), 5000);
  return { set, demo, isOn: () => !!window.App.settings().desktopWeather };
})();

// ================= fireworks & party =================
window.Party = (function () {
  function fireworks(text, sub, ms) { window.kairo.stage.show({ type: 'fireworks', text, sub, ms }); }
  function party() { fireworks('PARTY!', t('pt.sub'), 9000); try { Today.playMood('party'); } catch {} }
  window.kairo.football.onGoal(g => fireworks(t('pt.goal'), g.text.replace('⚽', '').trim(), 7000));
  return { fireworks, party };
})();

// ================= Show centre card (Today page) =================
window.Show = (function () {
  const TILES = [
    ['jarvis', 'scan-search', 'sh.jarvis', () => Jarvis.isOn(), () => Jarvis.set()],
    ['pet', 'cat', 'sh.pet', () => Pet.isOn(), () => Pet.set(!Pet.isOn())],
    ['games', 'gamepad-2', 'sh.games', null, () => GameMaker.open()],
    ['subs', 'message-circle', 'sh.subs', () => Subtitles.isOn(), () => Subtitles.toggle()],
    ['comment', 'mic', 'sh.comment', () => Commentator.isOn(), () => Commentator.set()],
    ['flight', 'plane', 'sh.flight', null, () => { const q = prompt(t('fl.ask')); if (q) Flight.track(q); }],
    ['radio', 'radio', 'sh.radio', null, () => RadioShow.open()],
    ['quiz', 'music-2', 'sh.quiz', null, () => MusicQuiz.open()],
    ['tv', 'tv', 'sh.tv', null, () => WorldTV.open()],
    ['weather', 'cloud-rain', 'sh.weather', () => DesktopWeather.isOn(), () => DesktopWeather.set(!DesktopWeather.isOn())],
    ['party', 'party-popper', 'sh.party', null, () => Party.party()],
    ['solar', 'orbit', 'sh.solar', null, () => SolarSystem.open()],
    ['doc', 'clapperboard', 'sh.doc', null, () => { const q = prompt(t('st.askDoc')); if (q) StoryPlayer.doc(q); }],
    ['whatif', 'sparkles', 'sh.whatif', null, () => { const q = prompt(t('st.askWhatif')); if (q) StoryPlayer.whatIf(q); }],
    ['search', 'scan-search', 'sh.search', null, () => window.kairo.search.toggle()],
    ['logo', 'palette', 'sh.logo', null, () => LogoMaker.open()],
    ['mc', 'pickaxe', 'sh.mc', null, () => McBuilder.open()],
    ['inv', 'lightbulb', 'sh.inv', null, () => Inventor.open()],
    ['social', 'clapperboard', 'sh.social', null, () => SocialStudio.open()],
    ['builder', 'hammer', 'sh.builder', null, () => Builder.open({ tab: 'sketch' })],
    ['bsite', 'globe', 'sh.bsite', null, () => Builder.open({ tab: 'site' })],
    ['bshop', 'store', 'sh.bshop', null, () => Builder.open({ tab: 'shop' })],
    ['how', 'atom', 'sh.how', null, () => HowItWorks.open()],
    ['pro', 'sparkles', 'sh.pro', null, () => Pro.open()],
    ['agent', 'bot', 'sh.agent', null, () => Pro.open('agent')]
  ];
  function mount() {
    const grid = document.querySelector('#view-today .today-grid');
    if (!grid || $s('tcShow')) return refresh();
    grid.insertAdjacentHTML('afterbegin', `<div class="tcard show-card" id="tcShow"><div class="tcard-h"><b>✨ ${t('sh.title')}</b><small class="muted">${t('sh.sub')}</small></div><div class="sh-grid" id="shGrid"></div></div>`);
    refresh();
  }
  function refresh() {
    const g = $s('shGrid'); if (!g) return;
    g.innerHTML = TILES.map(([k, icon, label, isOn], i) => `<button class="sh-tile ${isOn?.() ? 'on' : ''}" data-k="${k}" style="animation-delay:${i * 40}ms"><span>${ic(icon)}</span><b>${t(label)}</b>${isOn ? `<i class="sh-dot"></i>` : ''}</button>`).join('');
    g.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => { await TILES.find(x => x[0] === b.dataset.k)[4](); setTimeout(refresh, 300); });
  }
  return { mount, refresh };
})();

// Earth search: flight numbers like "LX 8" or "EZY1234" open the flight tracker
document.addEventListener('submit', e => {
  if (e.target.id !== 'earthSearch') return;
  const q = $s('earthQuery').value.trim();
  if (Flight.looksLike(q)) { e.preventDefault(); e.stopImmediatePropagation(); Flight.track(q); }
}, true);
