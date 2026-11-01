// Kairo power pack (windows): what did I miss, oral exam, video -> TikToks, Discord server builder,
// tournaments, Roblox trend radar, thumbnail maker. The work happens in src/main/power.js.
window.Power = (function () {
  const $p = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = () => window.App?.settings?.() || {};
  const de = () => (S().language || 'de') === 'de';
  const fmt = n => Number(n || 0).toLocaleString('de-CH');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const P = window.kairo.power;
  const openUrl = url => window.kairo.action({ type: 'open', url });
  const errText = r => r?.error?.code === 'NO_KEY' ? t('err.nokey') : (r?.error?.message || 'Fehler');

  // one window frame for all tools
  function frame(id, { kicker, title, sub, icon, wide }) {
    const el = qOverlay(id, 'pw');
    el.innerHTML = `<div class="pw-wrap ${wide ? 'wide' : ''}"><button class="fx-x pw-x" data-x>✕</button>
      <header class="pw-head"><span class="pw-ic">${ic(icon)}</span><div><small>${esc(kicker)}</small><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div></header>
      <div class="pw-body" id="${id}B"></div></div>`;
    el.querySelector('[data-x]').onclick = () => qClose(id);
    el.onkeydown = e => { if (e.key === 'Escape') qClose(id); };
    return $p(id + 'B');
  }
  const wait = (msg, steps) => `<div class="pw-wait"><div class="pw-radar"><i></i><i></i><i></i><b>${ic('sparkles')}</b></div><b>${esc(msg)}</b>${steps ? `<div class="pw-steps">${steps.map((s, i) => `<span data-st="${i}">${esc(s)}</span>`).join('')}</div>` : ''}</div>`;
  const stepOn = (host, i) => host.querySelectorAll('[data-st]').forEach(x => { x.classList.toggle('on', +x.dataset.st === i); x.classList.toggle('done', +x.dataset.st < i); });

  // ================= 8: what did I miss =================
  const KIND_IC = { mail: 'inbox', games: 'gamepad-2', roblox: 'trending-up', news: 'newspaper', school: 'graduation-cap' };
  async function missed() {
    const B = frame('pwMissed', { kicker: 'Kairo', title: 'Was habe ich verpasst?', icon: 'bell', wide: true });
    B.innerHTML = wait('Kairo schaut nach, was passiert ist …', ['Mails', 'Spiele', 'Roblox', 'News', 'Termine']);
    let k = 0; const tick = setInterval(() => stepOn(B, k++ % 5), 900);
    const r = await P.missed();
    clearInterval(tick);
    if (!$p('pwMissedB')) return;
    if (!r.ok) { B.innerHTML = `<div class="pw-err">${esc(errText(r))}</div>`; return; }
    const away = r.hours >= 48 ? Math.round(r.hours / 24) + (de() ? ' Tage' : ' days') : r.hours + (de() ? ' Std.' : ' h');
    B.innerHTML = `<div class="ms-hero"><small>${de() ? 'Du warst' : 'You were away for'} ${esc(away)} ${de() ? 'weg' : ''}</small><h3>${esc(r.headline || '')}</h3></div>
      <div class="ms-grid">${(r.sections || []).map((s, i) => `<section class="ms-card k-${esc(s.kind)}" style="animation-delay:${i * 90}ms"><h4>${ic(KIND_IC[s.kind] || 'sparkles')} ${esc(s.title)}</h4><ul>${(s.points || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>`).join('')}</div>
      ${r.games?.length ? `<div class="ms-row">${r.games.map(g => `<button class="ms-game" data-url="${esc(g.url)}">${g.image ? `<img src="${esc(g.image)}">` : ''}<span><b>${esc(g.game)}</b><small>${esc(g.headline)}</small></span></button>`).join('')}</div>` : ''}
      ${r.roblox?.length ? `<h5 class="ms-h">${ic('trending-up')} Roblox ${de() ? 'gerade' : 'right now'}</h5><div class="ms-chips">${r.roblox.map(g => `<button class="ms-chip" data-url="https://www.roblox.com/games/${esc(g.placeId)}"><b>${esc(g.name)}</b><small>${esc(g.genre)} · ${fmt(g.players)}${g.growth != null ? ' · +' + Math.round(g.growth * 100) + '%' : ''}</small></button>`).join('')}</div>` : ''}
      ${r.news?.length ? `<h5 class="ms-h">${ic('newspaper')} News</h5><div class="ms-news">${r.news.map(n => `<button data-url="${esc(n.link)}"><b>${esc(n.title)}</b><small>${esc(n.source)}</small></button>`).join('')}</div>` : ''}
      ${r.tip ? `<div class="ms-tip">${ic('sparkles')}<span>${esc(r.tip)}</span></div>` : ''}`;
    B.querySelectorAll('[data-url]').forEach(b => b.onclick = () => b.dataset.url && openUrl(b.dataset.url));
  }

  // ================= 11: oral exam =================
  let oral = null;
  function oralExam(topic = '') {
    const B = frame('pwOral', { kicker: de() ? 'Mündliche Prüfung' : 'Oral exam', title: de() ? 'Kairo fragt dich ab' : 'Kairo quizzes you', sub: de() ? 'Kairo stellt die Fragen mit Stimme, du antwortest mit dem Mikrofon. Am Ende gibt es eine Note.' : '', icon: 'graduation-cap' });
    B.innerHTML = `<div class="or-setup">
      <label>${de() ? 'Thema' : 'Topic'}</label><input class="field" id="orTopic" placeholder="${de() ? 'z. B. Photosynthese, Französische Revolution, Bruchrechnen' : 'e.g. photosynthesis, French Revolution, fractions'}" value="${esc(topic)}">
      <label>${de() ? 'Stufe (optional)' : 'Level (optional)'}</label><input class="field" id="orLevel" placeholder="${de() ? 'z. B. 8. Klasse, Sek, Gymnasium' : 'e.g. 8th grade, high school'}">
      <label>${de() ? 'Wie viele Fragen?' : 'How many questions?'}</label><div class="or-n">${[3, 5, 8].map(n => `<button data-n="${n}" class="${n === 5 ? 'on' : ''}">${n}</button>`).join('')}</div>
      <button class="btn primary pw-go" id="orGo">${ic('mic')} ${de() ? 'Prüfung starten' : 'Start exam'}</button></div>`;
    let n = 5;
    B.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { n = +b.dataset.n; B.querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', x === b)); });
    $p('orGo').onclick = () => { const tp = $p('orTopic').value.trim(); if (!tp) return $p('orTopic').focus(); oral = { topic: tp, level: $p('orLevel').value.trim(), total: n, history: [], points: [] }; oralRun(); };
    setTimeout(() => $p('orTopic')?.focus(), 200);
  }
  async function oralRun() {
    const B = $p('pwOralB'); if (!B) return;
    B.innerHTML = `<div class="or-stage"><div class="or-top"><b>${esc(oral.topic)}</b><div class="or-dots">${Array.from({ length: oral.total }, (_, i) => `<i data-d="${i}"></i>`).join('')}</div></div>
      <div class="or-teacher" id="orTeacher"><div class="or-orb"><i></i><i></i><i></i></div></div>
      <div class="or-q" id="orQ">${wait(de() ? 'Kairo überlegt sich die erste Frage …' : 'Thinking of the first question …')}</div>
      <div class="or-fb" id="orFb" hidden></div>
      <div class="or-ans"><button class="or-mic" id="orMic" disabled>${ic('mic')}<span>${de() ? 'Drücken und antworten' : 'Press and answer'}</span></button>
        <div class="or-type"><input class="field" id="orText" placeholder="${de() ? '… oder hier tippen' : '… or type here'}"><button class="btn" id="orSend">${ic('check')}</button></div>
        <button class="btn or-again" id="orRepeat">${ic('refresh-cw')} ${de() ? 'Frage nochmal' : 'Repeat'}</button></div></div>`;
    $p('orMic').onclick = oralMic;
    $p('orSend').onclick = () => { const v = $p('orText').value.trim(); if (v) oralAnswer(v); };
    $p('orText').onkeydown = e => { if (e.key === 'Enter') $p('orSend').click(); };
    $p('orRepeat').onclick = () => oral.q && say(oral.q);
    await oralNext();
  }
  function say(text) { $p('orTeacher')?.classList.add('talk'); Promise.resolve(Voice.speak(text, S())).finally(() => setTimeout(() => $p('orTeacher')?.classList.remove('talk'), 1500)); }
  async function oralNext() {
    const r = await P.oral({ topic: oral.topic, level: oral.level, history: oral.history, total: oral.total });
    if (!$p('pwOralB')) return;
    if (!r.ok) { $p('orQ').innerHTML = `<div class="pw-err">${esc(errText(r))}</div>`; return; }
    if (r.feedback && oral.history.length) {
      const pts = r.points != null ? Math.max(0, Math.min(10, +r.points)) : null;
      if (pts != null) oral.points.push(pts);
      const d = document.querySelector(`#pwOralB [data-d="${oral.history.length - 1}"]`); if (d) d.className = pts == null ? 'done' : pts >= 7 ? 'good' : pts >= 4 ? 'mid' : 'bad';
      $p('orFb').hidden = false; $p('orFb').innerHTML = `${pts != null ? `<b>${pts}/10</b>` : ''}<span>${esc(r.feedback)}</span>`;
    }
    if (r.done) return oralEnd(r);
    oral.q = r.question;
    $p('orQ').innerHTML = `<small>${de() ? 'Frage' : 'Question'} ${oral.history.length + 1}/${oral.total}</small><p>${esc(r.question)}</p>`;
    $p('orMic').disabled = false; $p('orText').value = '';
    say((r.feedback && oral.history.length ? r.feedback + ' ' : '') + r.question);
  }
  async function oralMic() {
    const m = $p('orMic');
    if (!m.classList.contains('rec')) {
      Voice.stop();
      try { await Voice.startListening(); } catch (e) { return window.toast(e.message); }
      m.classList.add('rec'); m.querySelector('span').textContent = de() ? 'Fertig? Nochmal drücken' : 'Done? Press again';
      return;
    }
    m.classList.remove('rec'); m.disabled = true; m.querySelector('span').textContent = de() ? 'Kairo hört zu …' : 'Listening …';
    const text = await Voice.stopListening();
    m.querySelector('span').textContent = de() ? 'Drücken und antworten' : 'Press and answer';
    if (text) oralAnswer(text); else m.disabled = false;
  }
  async function oralAnswer(a) {
    $p('orMic').disabled = true;
    oral.history.push({ q: oral.q, a });
    $p('orQ').innerHTML += `<div class="or-you"><small>${de() ? 'Deine Antwort' : 'Your answer'}</small>${esc(a)}</div>`;
    $p('orFb').hidden = true;
    $p('orQ').insertAdjacentHTML('beforeend', `<div class="or-think">${de() ? 'Kairo bewertet …' : 'Grading …'}</div>`);
    await oralNext();
  }
  function oralEnd(r) {
    const B = $p('pwOralB');
    const g = +r.grade || 0, deGrade = de(), pct = deGrade ? (g - 1) / 5 : g / 100;
    B.innerHTML = `<div class="or-end"><div class="or-grade" style="--p:${Math.max(0, Math.min(1, pct))}"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="52" class="v"/></svg><b>${deGrade ? g.toFixed(1).replace('.0', '') : Math.round(g) + '%'}</b><small>${deGrade ? 'Note' : 'Score'}</small></div>
      <p class="or-sum">${esc(r.summary || '')}</p>
      <div class="or-lists"><div><h4>${ic('check')} ${de() ? 'Stark' : 'Strong'}</h4><ul>${(r.strong || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div><h4>${ic('graduation-cap')} ${de() ? 'Noch lernen' : 'To learn'}</h4><ul>${(r.improve || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
      <div class="pw-btns"><button class="btn primary" id="orAgain">${ic('refresh-cw')} ${de() ? 'Nochmal' : 'Again'}</button><button class="btn" id="orNew">${de() ? 'Neues Thema' : 'New topic'}</button></div></div>`;
    say((r.summary || '') + ' ' + (deGrade ? 'Deine Note: ' + String(g).replace('.', ',') : 'Your score: ' + Math.round(g)));
    if (deGrade ? g >= 5 : g >= 80) setTimeout(() => window.confettiAt?.(B.querySelector('.or-grade')), 400);
    $p('orAgain').onclick = () => { oral = { ...oral, history: [], points: [] }; oralRun(); };
    $p('orNew').onclick = () => oralExam();
  }

  // ================= 25: video -> TikToks (17: also for saved clips) =================
  let cm = null;
  const fileUrl = p => 'file:///' + encodeURI(String(p).replace(/\\/g, '/')).replace(/#/g, '%23').replace(/\?/g, '%3F');
  function clips(file) {
    const B = frame('pwClips', { kicker: 'TikTok-Macher', title: de() ? 'Aus deinem Video werden TikToks' : 'Turn your video into TikToks', sub: de() ? 'Kairo schaut das Video an, findet die besten Momente, schneidet sie hochkant und schreibt Untertitel drauf.' : '', icon: 'clapperboard', wide: true });
    cm = { file: null, clips: [], made: [] };
    B.innerHTML = `<div class="cm-grid"><div class="cm-side" id="cmSide"></div><div class="cm-stage"><div class="cm-phone"><canvas id="cmCv" width="1080" height="1920"></canvas><div class="cm-idle" id="cmIdle">${ic('clapperboard')}<span>${de() ? 'Hier entstehen deine TikToks' : 'Your TikToks appear here'}</span></div></div></div></div>`;
    if (file) cmFile({ path: file, name: file.split(/[\\/]/).pop() }); else cmPick();
  }
  function cmPick() {
    $p('cmSide').innerHTML = `<button class="cm-drop" id="cmPick">${ic('upload')}<b>${de() ? 'Video auswählen' : 'Choose a video'}</b><small>MP4, WEBM, MOV, MKV</small></button>`;
    $p('cmPick').onclick = async () => { const r = await P.pickVideo(); if (r.ok && r.video) cmFile(r.video); };
  }
  async function cmFile(v) {
    cm.file = v;
    // recorded WebM files (Kairo's own clips) have no length inside: jump far to the end once to find it
    const dur = await new Promise(res => {
      const x = document.createElement('video'); x.preload = 'metadata'; x.muted = true;
      const done = d => { x.removeAttribute('src'); x.load(); res(isFinite(d) ? d : 0); };
      x.onerror = () => done(0);
      x.onloadedmetadata = () => {
        if (isFinite(x.duration) && x.duration > 0) return done(x.duration);
        x.ondurationchange = () => { if (isFinite(x.duration)) { x.ondurationchange = null; done(x.duration); } };
        x.currentTime = 1e7; setTimeout(() => done(x.duration), 6000);
      };
      x.src = fileUrl(v.path);
    });
    cm.duration = dur;
    $p('cmSide').innerHTML = `<div class="cm-file">${ic('clapperboard')}<span><b>${esc(v.name)}</b><small>${dur ? Math.floor(dur / 60) + ':' + String(Math.round(dur % 60)).padStart(2, '0') + ' min' : ''}</small></span><button class="btn" id="cmOther">${de() ? 'Anderes' : 'Other'}</button></div>
      <label>${de() ? 'Wunsch (optional)' : 'Wish (optional)'}</label><input class="field" id="cmWish" placeholder="${de() ? 'z. B. die lustigsten Stellen, nur Gameplay' : 'e.g. funniest moments'}">
      <label>${de() ? 'Wie viele TikToks?' : 'How many?'}</label><div class="or-n" id="cmN">${[1, 2, 3, 5].map(n => `<button data-n="${n}" class="${n === (dur <= 90 ? 1 : 3) ? 'on' : ''}">${n}</button>`).join('')}</div>
      <button class="btn primary pw-go" id="cmGo">${ic('wand-sparkles')} ${de() ? 'Beste Momente finden' : 'Find the best moments'}</button>
      ${dur && dur <= 90 ? `<button class="btn pw-go2" id="cmWhole">${ic('play')} ${de() ? 'Ganzes Video als TikTok (ohne KI)' : 'Whole video as TikTok (no AI)'}</button>` : ''}
      <div id="cmOut"></div>`;
    let n = dur <= 90 ? 1 : 3;
    $p('cmN').querySelectorAll('[data-n]').forEach(b => b.onclick = () => { n = +b.dataset.n; $p('cmN').querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', x === b)); });
    $p('cmOther').onclick = cmPick;
    $p('cmGo').onclick = () => cmAnalyze(n, $p('cmWish').value.trim());
    if ($p('cmWhole')) $p('cmWhole').onclick = () => { cm.clips = [{ start: 0, end: dur, title: v.name.replace(/\.[^.]+$/, ''), hook: '', captions: [] }]; cmMake([0]); };
  }
  async function cmAnalyze(n, wish) {
    const out = $p('cmOut');
    out.innerHTML = wait(de() ? 'Kairo schaut dein Video …' : 'Kairo is watching your video …', de() ? ['Hochladen', 'Ansehen', 'Momente wählen'] : ['Upload', 'Watch', 'Pick moments']);
    const off = P.onProgress((k, st) => { if (k === 'cm') stepOn(out, { upload: 0, watch: 1, pick: 2 }[st] ?? 0); });
    const r = await P.analyzeVideo({ file: cm.file.path, count: n, wish });
    off?.();
    if (!$p('cmOut')) return;
    if (!r.ok) { out.innerHTML = `<div class="pw-err">${esc(errText(r))}</div>`; return; }
    cm.clips = r.clips;
    const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    out.innerHTML = `<div class="cm-list">${r.clips.map((c, i) => `<label class="cm-clip"><input type="checkbox" checked data-c="${i}"><span><b>${esc(c.title)}</b><small>${mmss(c.start)}–${mmss(c.end)} · ${Math.round(c.end - c.start)} s</small><em>${esc(c.why || '')}</em></span><button class="btn" data-prev="${i}">${ic('play')}</button></label>`).join('')}</div>
      <button class="btn primary pw-go" id="cmMake">${ic('clapperboard')} ${de() ? 'TikToks erstellen' : 'Create TikToks'}</button>`;
    out.querySelectorAll('[data-prev]').forEach(b => b.onclick = e => { e.preventDefault(); cmPreview(cm.clips[+b.dataset.prev]); });
    $p('cmMake').onclick = () => cmMake([...out.querySelectorAll('[data-c]:checked')].map(x => +x.dataset.c));
  }
  function cmPreview(c) {
    $p('cmIdle')?.remove();
    const cv = $p('cmCv'), g = cv.getContext('2d'), v = document.createElement('video');
    v.src = fileUrl(cm.file.path); v.muted = true;
    v.onloadeddata = async () => { v.currentTime = c.start; await new Promise(r => v.onseeked = r); drawFrame(g, v, c, c.start, 0); };
  }
  // vertical frame: blurred copy as background, the video in the middle, hook on top, captions below
  function drawFrame(g, v, c, now, rel) {
    const W = 1080, H = 1920, vw = v.videoWidth || 16, vh = v.videoHeight || 9;
    g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const portrait = vh / vw > 1.3;
    if (!portrait) {
      const s = Math.max(W / vw, H / vh); g.filter = 'blur(40px) brightness(.5) saturate(1.3)';
      g.drawImage(v, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s); g.filter = 'none';
      const s2 = W * 1.0 / vw, h2 = vh * s2, y = (H - h2) / 2 - 40;
      g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; g.drawImage(v, 0, y, W, h2); g.shadowBlur = 0;
    } else { const s = Math.max(W / vw, H / vh); g.drawImage(v, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s); }
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a45';
    if (c.hook && rel < 2.6) {
      const a = Math.min(1, rel * 4) * Math.min(1, (2.6 - rel) * 4), sc = 0.9 + 0.1 * Math.min(1, rel * 5);
      g.globalAlpha = a; g.translate(W / 2, 300); g.scale(sc, sc); g.rotate(-0.03);
      g.font = '900 76px "Segoe UI Black", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const lines = wrap(g, c.hook.toUpperCase(), 900), lh = 92;
      lines.forEach((l, i) => { const w = g.measureText(l).width + 60, yy = (i - (lines.length - 1) / 2) * lh; g.fillStyle = i % 2 ? '#fff' : accent; g.fillRect(-w / 2, yy - 46, w, 88); g.fillStyle = i % 2 ? '#111' : '#fff'; g.fillText(l, 0, yy + 4); });
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    }
    const cap = (c.captions || []).filter(x => x.t <= now + 0.05).pop();
    if (cap && now - cap.t < 3) {
      g.font = '900 78px "Segoe UI Black", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const lines = wrap(g, cap.text, 940), y0 = 1480;
      lines.forEach((l, i) => { const y = y0 + i * 92; g.lineWidth = 16; g.strokeStyle = '#000'; g.strokeText(l, W / 2, y); g.fillStyle = i === 0 ? '#ffe14d' : '#fff'; g.fillText(l, W / 2, y); });
    }
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, H - 10, W, 10);
    g.fillStyle = accent; g.fillRect(0, H - 10, W * Math.min(1, rel / Math.max(1, c.end - c.start)), 10);
    g.restore();
  }
  function wrap(g, text, max) { const words = String(text).split(/\s+/), out = []; let cur = ''; for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > max && cur) { out.push(cur); cur = w; } else cur = tt; } if (cur) out.push(cur); return out.slice(0, 3); }
  const MIME = () => ['video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  async function renderClip(c, onProg) {
    $p('cmIdle')?.remove();
    const cv = $p('cmCv'), g = cv.getContext('2d');
    const v = document.createElement('video'); v.src = fileUrl(cm.file.path); v.preload = 'auto';
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error(de() ? 'Video kann nicht gelesen werden' : 'Cannot read the video')); });
    v.currentTime = c.start; await new Promise(r => v.onseeked = r);
    const ac = new AudioContext(), dest = ac.createMediaStreamDestination();
    try { ac.createMediaElementSource(v).connect(dest); } catch {}
    const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mime = MIME(), chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 9e6 });
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise(r => rec.onstop = r);
    drawFrame(g, v, c, c.start, 0);
    rec.start(500); await v.play();
    await new Promise(res => {
      const loop = () => {
        const now = v.currentTime, rel = now - c.start;
        drawFrame(g, v, c, now, rel); onProg?.(rel / (c.end - c.start));
        if (now >= c.end || v.ended || !$p('cmCv')) return res();
        requestAnimationFrame(loop);
      };
      loop();
    });
    v.pause(); rec.stop(); await done; ac.close(); v.removeAttribute('src'); v.load();
    const blob = new Blob(chunks, { type: mime.split(';')[0] });
    const r = await P.save({ kind: 'tiktok', bytes: new Uint8Array(await blob.arrayBuffer()), name: c.title || 'TikTok', ext: /mp4/.test(mime) ? 'mp4' : 'webm' });
    if (!r.ok) throw new Error(r.error.message);
    return r.file;
  }
  async function cmMake(idx) {
    const out = $p('cmOut') || $p('cmSide');
    const list = idx.map(i => cm.clips[i]).filter(Boolean);
    if (!list.length) return;
    out.innerHTML = `<div class="cm-prog">${list.map((c, i) => `<div class="cm-pi" id="cmPi${i}"><b>${esc(c.title)}</b><i><span></span></i><small>${de() ? 'wartet' : 'waiting'}</small></div>`).join('')}</div>`;
    const files = [];
    for (let i = 0; i < list.length; i++) {
      const row = $p('cmPi' + i); if (!row) return;
      row.classList.add('on'); row.querySelector('small').textContent = de() ? 'wird geschnitten …' : 'cutting …';
      try {
        const f = await renderClip(list[i], p => { const s = row.querySelector('span'); if (s) s.style.width = Math.round(Math.min(1, p) * 100) + '%'; });
        files.push(f); row.classList.add('done'); row.querySelector('small').textContent = de() ? 'fertig' : 'done';
      } catch (e) { row.classList.add('err'); row.querySelector('small').textContent = e.message; }
    }
    if (!$p('cmOut') && !$p('cmSide')) return;
    out.insertAdjacentHTML('beforeend', files.length ? `<div class="so-done"><b>${ic('circle-check')} ${files.length} ${de() ? 'TikToks fertig!' : 'TikToks ready!'}</b>
      <div class="so-btns"><button class="btn" id="cmShow">${ic('folder-open')} ${de() ? 'Zeigen' : 'Show'}</button><button class="btn primary" id="cmTik">${ic('external-link')} ${de() ? 'Auf TikTok hochladen' : 'Upload to TikTok'}</button></div>
      <p class="muted small">${de() ? 'Kairo postet nie selbst. Du lädst sie hoch.' : 'Kairo never posts by itself.'}</p></div>` : '');
    if ($p('cmShow')) { $p('cmShow').onclick = () => P.reveal(files[0]); $p('cmTik').onclick = () => { openUrl('https://www.tiktok.com/upload'); P.reveal(files[0]); }; }
  }
  // after "Clip das!": small card with "make a TikTok of it"
  function clipSaved(file) {
    document.getElementById('pwClipCard')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="pw-toastcard" id="pwClipCard">${ic('clapperboard')}<span><b>${de() ? 'Clip gespeichert' : 'Clip saved'}</b><small>${de() ? 'Soll Kairo ein TikTok daraus machen?' : 'Make a TikTok of it?'}</small></span><button class="btn primary" id="pwClipTik">TikTok</button><button class="btn" id="pwClipX">✕</button></div>`);
    $p('pwClipTik').onclick = () => { $p('pwClipCard').remove(); window.kairo.showWindow?.(); clips(file); };
    $p('pwClipX').onclick = () => $p('pwClipCard').remove();
    setTimeout(() => $p('pwClipCard')?.remove(), 15000);
  }

  // ================= 20: Discord server builder =================
  const DS_IDEAS = () => de() ? ['Gaming-Server für Roblox mit Turnieren', 'Lern-Server für unsere Klasse', 'Server für meine Freunde', 'Community für meinen YouTube-Kanal'] : ['Gaming server for Roblox with tournaments', 'Study server for our class', 'Server for my friends', 'Community for my YouTube channel'];
  async function discordBuild() {
    const B = frame('pwDsb', { kicker: 'Discord', title: de() ? 'Server mit einem Satz bauen' : 'Build a server with one sentence', sub: de() ? 'Kairo plant Kategorien, Kanäle, Rollen und eine Begrüssung. Es wird nur hinzugefügt, nie etwas gelöscht.' : 'Kairo only adds, never deletes.', icon: 'users', wide: true });
    B.innerHTML = wait(de() ? 'Verbinde mit deinem Discord-Bot …' : 'Connecting to your Discord bot …');
    const r = await P.dsGuilds();
    if (!$p('pwDsbB')) return;
    if (!r.ok) { B.innerHTML = dsNoBot(r); B.querySelector('#dsSet')?.addEventListener('click', () => { qClose('pwDsb'); window.App?.go?.('settings'); }); return; }
    if (!r.guilds.length) { B.innerHTML = `<div class="pw-err">${de() ? 'Der Bot ist in keinem Server. Lade ihn zuerst in deinen Server ein.' : 'The bot is in no server yet.'}</div><button class="btn primary" id="dsInv">${ic('external-link')} ${de() ? 'Bot einladen' : 'Invite bot'}</button>`; $p('dsInv').onclick = () => openUrl(r.invite); return; }
    let gid = r.guilds[0].id;
    B.innerHTML = `<label>${de() ? 'Welcher Server?' : 'Which server?'}</label><div class="ds-guilds">${r.guilds.map((g, i) => `<button data-g="${g.id}" class="${i ? '' : 'on'}">${g.icon ? `<img src="${esc(g.icon)}">` : `<span>${esc(g.name[0] || '?')}</span>`}<b>${esc(g.name)}</b><small>${fmt(g.members)} ${de() ? 'Mitglieder' : 'members'}</small></button>`).join('')}</div>
      <label>${de() ? 'Was für ein Server soll es sein?' : 'What kind of server?'}</label><textarea class="field" id="dsDesc" rows="2" placeholder="${de() ? 'z. B. Gaming-Server für Roblox mit Turnieren und einem Bereich für Memes' : ''}"></textarea>
      <div class="ds-ideas">${DS_IDEAS().map(x => `<button>${esc(x)}</button>`).join('')}</div>
      <button class="btn primary pw-go" id="dsPlan">${ic('wand-sparkles')} ${de() ? 'Plan erstellen' : 'Create plan'}</button><div id="dsOut"></div>`;
    B.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { gid = b.dataset.g; B.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b)); });
    B.querySelectorAll('.ds-ideas button').forEach(b => b.onclick = () => { $p('dsDesc').value = b.textContent; });
    $p('dsPlan').onclick = async () => {
      const desc = $p('dsDesc').value.trim(); if (!desc) return $p('dsDesc').focus();
      const out = $p('dsOut'); out.innerHTML = wait(de() ? 'Kairo plant deinen Server …' : 'Planning your server …');
      const p = await P.dsPlan({ desc });
      if (!$p('dsOut')) return;
      if (!p.ok) { out.innerHTML = `<div class="pw-err">${esc(errText(p))}</div>`; return; }
      const g = r.guilds.find(x => x.id === gid);
      const nCh = (p.categories || []).reduce((s, c) => s + (c.channels || []).length, 0);
      out.innerHTML = `<div class="ds-plan"><div class="ds-tree">${(p.categories || []).map(c => `<div class="ds-cat"><b>${esc(c.name)}</b>${(c.channels || []).map(ch => `<div class="ds-ch">${/voice|sprach/i.test(ch.type) ? ic('mic') : '<i>#</i>'}<span>${esc(ch.name)}</span></div>`).join('')}</div>`).join('')}</div>
        <div class="ds-right"><h5>${de() ? 'Rollen' : 'Roles'}</h5><div class="ds-roles">${(p.roles || []).map(x => `<span style="--c:${esc(x.color || '#99aab5')}">${esc(x.name)}</span>`).join('')}</div>
        <h5>${de() ? 'Begrüssung' : 'Welcome'}</h5><div class="ds-welcome">${esc(p.welcome || '')}</div></div></div>
        ${g && !g.canBuild ? `<div class="pw-warn">${de() ? 'Dem Bot fehlen Rechte zum Bauen (Kanäle und Rollen verwalten).' : 'The bot needs the rights to manage channels and roles.'}<div class="pw-btns"><button class="btn primary" id="dsReinv">${ic('external-link')} ${de() ? 'Bot mit Bau-Rechten einladen' : 'Invite with build rights'}</button><button class="btn" id="dsRecheck">${ic('refresh-cw')} ${de() ? 'Nochmal prüfen' : 'Check again'}</button></div></div>` : ''}
        <button class="btn primary pw-go" id="dsBuild" ${g && !g.canBuild ? 'disabled' : ''}>${ic('hammer')} ${de() ? `${nCh} Kanäle in „${g?.name || ''}“ bauen` : `Build ${nCh} channels`}</button>`;
      $p('dsReinv')?.addEventListener('click', () => openUrl(r.invite));
      $p('dsRecheck')?.addEventListener('click', () => discordBuild());
      $p('dsBuild').onclick = async () => {
        if (!confirm(de() ? `Kairo erstellt jetzt ${nCh} Kanäle und ${(p.roles || []).length} Rollen in „${g?.name}“. Es wird nichts gelöscht. Los?` : `Create ${nCh} channels in "${g?.name}"? Nothing gets deleted.`)) return;
        const b = $p('dsBuild'); b.disabled = true; b.innerHTML = `${ic('hammer')} ${de() ? 'Baue …' : 'Building …'}`;
        const res = await P.dsBuild({ guildId: gid, plan: p });
        if (!$p('dsOut')) return;
        if (!res.ok) { b.disabled = false; b.innerHTML = `${ic('hammer')} ${de() ? 'Nochmal versuchen' : 'Try again'}`; return window.toast('✕ ' + res.error.message); }
        b.outerHTML = `<div class="so-done"><b>${ic('circle-check')} ${de() ? 'Server gebaut!' : 'Server built!'}</b><p>${res.categories} ${de() ? 'Kategorien' : 'categories'} · ${res.channels} ${de() ? 'Kanäle' : 'channels'} · ${res.roles} ${de() ? 'Rollen' : 'roles'}</p></div>`;
        window.confettiAt?.(out);
      };
    };
  }
  const dsNoBot = r => `<div class="pw-empty">${ic('users')}<b>${esc(r.error?.message || '')}</b><p>${de() ? 'Unter Einstellungen → Discord trägst du den Bot-Token ein und startest den Bot. Danach geht es hier weiter.' : 'Add the bot token in Settings → Discord and start the bot.'}</p><button class="btn primary" id="dsSet">${de() ? 'Zu den Einstellungen' : 'Open settings'}</button></div>`;

  // ================= 24: tournaments =================
  const TK = 'kairo.tourney';
  let tn = null;
  const loadT = () => { try { return JSON.parse(localStorage.getItem(TK) || 'null'); } catch { return null; } };
  const saveT = () => { try { localStorage.setItem(TK, JSON.stringify(tn)); } catch {} };
  function tourney() {
    frame('pwTour', { kicker: de() ? 'Turnier' : 'Tournament', title: de() ? 'Turnier-Organisator' : 'Tournament organizer', icon: 'trophy', wide: true });
    tn = loadT();
    tn ? tDraw() : tSetup();
  }
  function tSetup() {
    const B = $p('pwTourB');
    B.innerHTML = `<div class="tn-setup"><label>${de() ? 'Name' : 'Name'}</label><input class="field" id="tnName" placeholder="${de() ? 'z. B. Bedwars-Cup' : 'e.g. Bedwars Cup'}">
      <label>${de() ? 'Spiel' : 'Game'}</label><input class="field" id="tnGame" placeholder="Roblox, Fortnite, FIFA …">
      <label>${de() ? 'Spieler (einer pro Zeile, 3–32)' : 'Players (one per line, 3–32)'}</label><textarea class="field" id="tnPl" rows="7" placeholder="Luca&#10;Mia&#10;Noah&#10;Lea"></textarea>
      <label class="tn-mix"><input type="checkbox" id="tnMix" checked> ${de() ? 'Paarungen auslosen' : 'Random pairings'}</label>
      <button class="btn primary pw-go" id="tnGo">${ic('trophy')} ${de() ? 'Turnierbaum erstellen' : 'Create bracket'}</button></div>`;
    $p('tnGo').onclick = () => {
      let pl = [...new Set($p('tnPl').value.split('\n').map(x => x.trim()).filter(Boolean))].slice(0, 32);
      if (pl.length < 3) return window.toast(de() ? 'Mindestens 3 Spieler' : 'At least 3 players');
      if ($p('tnMix').checked) pl = pl.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      const size = 2 ** Math.ceil(Math.log2(pl.length)), seeds = [...pl, ...Array(size - pl.length).fill(null)];
      // spread byes: player i meets bye i
      const first = []; for (let i = 0; i < size / 2; i++) first.push([seeds[i], seeds[size - 1 - i]]);
      const rounds = [first.map(([a, b]) => ({ a, b, w: null }))];
      for (let n = size / 4; n >= 1; n /= 2) rounds.push(Array.from({ length: n }, () => ({ a: null, b: null, w: null })));
      tn = { name: $p('tnName').value.trim() || (de() ? 'Turnier' : 'Tournament'), game: $p('tnGame').value.trim(), rounds };
      tAuto(); saveT(); tDraw();
    };
  }
  function tAuto() { // byes advance by themselves
    tn.rounds[0].forEach((m, i) => { if (m.a && !m.b) tWin(0, i, m.a, true); else if (m.b && !m.a) tWin(0, i, m.b, true); });
  }
  function tWin(r, i, who, quiet) {
    const m = tn.rounds[r][i]; if (!who) return;
    m.w = who;
    const next = tn.rounds[r + 1];
    if (next) { const nm = next[Math.floor(i / 2)]; nm[i % 2 ? 'b' : 'a'] = who; if (nm.w && nm.w !== nm.a && nm.w !== nm.b) nm.w = null; }
    else if (!quiet) { setTimeout(() => window.confettiAt?.(document.querySelector('.tn-champ')), 200); }
  }
  const RNAME = (r, total) => { const left = total - r; return left === 1 ? (de() ? 'Finale' : 'Final') : left === 2 ? (de() ? 'Halbfinale' : 'Semi-final') : left === 3 ? (de() ? 'Viertelfinale' : 'Quarter-final') : (de() ? 'Runde ' : 'Round ') + (r + 1); };
  function tDraw() {
    const B = $p('pwTourB'); if (!B) return;
    const champ = tn.rounds[tn.rounds.length - 1][0].w;
    B.innerHTML = `<div class="tn-head"><div><b>${esc(tn.name)}</b><small>${esc(tn.game)}</small></div><div class="pw-btns"><button class="btn" id="tnPost">${ic('users')} ${de() ? 'In Discord posten' : 'Post to Discord'}</button><button class="btn" id="tnNew">${ic('plus')} ${de() ? 'Neues Turnier' : 'New'}</button></div></div>
      <div class="tn-tree">${tn.rounds.map((rd, r) => `<div class="tn-col"><h6>${RNAME(r, tn.rounds.length)}</h6>${rd.map((m, i) => `<div class="tn-m">${['a', 'b'].map(k => `<button data-r="${r}" data-i="${i}" data-k="${k}" class="${m[k] == null ? 'empty' : ''} ${m.w && m.w === m[k] ? 'win' : m.w ? 'lose' : ''}" ${m[k] == null ? 'disabled' : ''}>${m[k] == null ? (r === 0 ? (de() ? 'Freilos' : 'Bye') : '…') : esc(m[k])}</button>`).join('')}</div>`).join('')}</div>`).join('')}
      <div class="tn-col tn-cc"><div class="tn-champ ${champ ? 'on' : ''}">${ic('trophy')}<small>${de() ? 'Sieger' : 'Champion'}</small><b>${champ ? esc(champ) : '?'}</b></div></div></div>
      <p class="muted small">${de() ? 'Klick auf den Gewinner eines Spiels, er kommt eine Runde weiter.' : 'Click the winner of a match.'}</p><div id="tnPostBox"></div>`;
    B.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const r = +b.dataset.r, i = +b.dataset.i, m = tn.rounds[r][i]; const who = m[b.dataset.k]; if (!who || !(m.a && m.b)) return; tWin(r, i, who); saveT(); tDraw(); });
    $p('tnNew').onclick = () => { if (confirm(de() ? 'Neues Turnier anfangen?' : 'Start a new tournament?')) { tn = null; try { localStorage.removeItem(TK); } catch {} tSetup(); } };
    $p('tnPost').onclick = tPostBox;
  }
  function tText() {
    const L = [`**${de() ? 'Turnier' : 'Tournament'}: ${tn.name}**${tn.game ? ' – ' + tn.game : ''}`];
    tn.rounds.forEach((rd, r) => { L.push('', `__${RNAME(r, tn.rounds.length)}__`); rd.forEach(m => { if (!m.a && !m.b) return; const n = x => x == null ? (de() ? 'offen' : 'tbd') : (m.w === x ? `**${x}**` : x); L.push(`${n(m.a)} vs ${n(m.b)}${m.w ? '  →  ' + m.w : ''}`); }); });
    const champ = tn.rounds[tn.rounds.length - 1][0].w; if (champ) L.push('', `${de() ? 'Sieger' : 'Champion'}: **${champ}**`);
    return L.join('\n');
  }
  async function tPostBox() {
    const box = $p('tnPostBox'); box.innerHTML = wait(de() ? 'Verbinde mit Discord …' : 'Connecting …');
    const r = await P.dsGuilds();
    if (!r.ok) { box.innerHTML = `<div class="pw-err">${esc(r.error.message)}</div>`; return; }
    if (!r.guilds.length) { box.innerHTML = `<div class="pw-err">${de() ? 'Der Bot ist in keinem Server.' : 'The bot is in no server.'}</div>`; return; }
    box.innerHTML = `<div class="tn-post"><select class="field" id="tnG">${r.guilds.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select><select class="field" id="tnC"></select><button class="btn primary" id="tnSend">${de() ? 'Posten' : 'Post'}</button></div><pre class="tn-pre">${esc(tText())}</pre>`;
    const loadC = async () => { const c = await P.dsChannels($p('tnG').value); $p('tnC').innerHTML = c.ok ? c.channels.map(ch => `<option value="${ch.id}">#${esc(ch.name)}</option>`).join('') : ''; };
    $p('tnG').onchange = loadC; await loadC();
    $p('tnSend').onclick = async () => { if (!$p('tnC').value) return; const res = await P.dsPost({ channelId: $p('tnC').value, text: tText() }); window.toast(res.ok ? (de() ? 'Im Discord gepostet' : 'Posted to Discord') : '✕ ' + res.error.message); if (res.ok) box.innerHTML = ''; };
  }

  // ================= 22: Roblox trend radar =================
  async function trends(force) {
    const B = frame('pwTrend', { kicker: 'Roblox', title: de() ? 'Trend-Radar' : 'Trend radar', sub: de() ? 'Echte Spielerzahlen von Roblox. Kairo merkt, welche Spiele gerade explodieren.' : 'Real player counts from Roblox.', icon: 'trending-up', wide: true });
    B.innerHTML = wait(de() ? 'Hole die Zahlen von Roblox …' : 'Loading Roblox numbers …');
    const r = await P.trends(!!force);
    if (!$p('pwTrendB')) return;
    if (!r.ok) { B.innerHTML = `<div class="pw-err">${esc(r.error.message)}</div>`; return; }
    const on = !!S().robloxTrendAlarm;
    const ago = r.baseAt ? Math.round((r.at - r.baseAt) / 36e5) : 0;
    const max = Math.max(1, ...r.genres.map(g => g.players));
    B.innerHTML = `<div class="tr-bar"><label class="tog"><input type="checkbox" id="trAlarm" ${on ? 'checked' : ''}><span>${de() ? 'Alarm, wenn ein Spiel explodiert' : 'Alert when a game explodes'}</span></label><small>${de() ? 'Stand' : 'Updated'} ${new Date(r.at).toLocaleTimeString(de() ? 'de-CH' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}${ago ? ` · ${de() ? 'Wachstum über' : 'growth over'} ${ago} h` : ''}</small><button class="btn" id="trRe">${ic('refresh-cw')}</button></div>
      ${!r.baseAt ? `<div class="pw-note">${de() ? 'Das Wachstum siehst du, sobald Kairo die Zahlen ein paar Stunden lang beobachtet hat. Kairo muss dafür offen sein. Bis dahin: die Spiele, die Roblox gerade als Trend zeigt.' : 'Growth appears after Kairo has watched the numbers for a few hours.'}</div>` : ''}
      <div class="tr-grid"><div class="tr-list">${r.rising.map((g, i) => `<button class="tr-g" data-pl="${g.placeId}" style="animation-delay:${i * 35}ms"><em>${i + 1}</em><span><b>${esc(String(g.name).replace(/\s+/g, " "))}</b><small>${esc(g.genre)}${g.genre2 ? ' · ' + esc(g.genre2) : ''}${g.rating ? ' · ' + g.rating + '% ' + (de() ? 'mögen es' : 'like it') : ''}</small></span><i class="tr-p">${fmt(g.players)}</i>${g.growth != null ? `<i class="tr-up ${g.growth >= 1 ? 'hot' : g.growth < 0 ? 'down' : ''}">${g.growth >= 0 ? '+' : ''}${Math.round(g.growth * 100)}%</i>` : g.isNew ? `<i class="tr-up hot">${de() ? 'NEU' : 'NEW'}</i>` : '<i class="tr-up">Trend</i>'}</button>`).join('')}</div>
      <div class="tr-genres"><h5>${de() ? 'Genres (Spieler jetzt)' : 'Genres (players now)'}</h5>${r.genres.map(g => `<div class="tr-gen"><span>${esc(g.name)}</span><i><b style="width:${Math.round(g.players / max * 100)}%"></b></i><small>${fmt(g.players)}${g.growth != null ? ` <em class="${g.growth > 0 ? 'up' : 'down'}">${g.growth > 0 ? '+' : ''}${Math.round(g.growth * 100)}%</em>` : ''}</small></div>`).join('')}
      <p class="muted small">${de() ? 'Klick auf ein Spiel öffnet es auf Roblox.' : 'Click a game to open it on Roblox.'}</p></div></div>`;
    B.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => openUrl('https://www.roblox.com/games/' + b.dataset.pl));
    $p('trRe').onclick = () => trends(true);
    $p('trAlarm').onchange = async e => { await window.kairo.settings.set({ robloxTrendAlarm: e.target.checked }); window.toast(e.target.checked ? (de() ? 'Trend-Alarm an (solange Kairo offen ist)' : 'Trend alarm on') : (de() ? 'Trend-Alarm aus' : 'Trend alarm off')); };
  }

  // ================= 26: thumbnails =================
  let thPhoto = null;
  function thumbMaker(title = '') {
    const B = frame('pwThumb', { kicker: 'YouTube', title: 'Thumbnail-Maker', sub: de() ? 'Titel rein, 3 Thumbnails raus. Den Text kannst du danach noch ändern.' : 'Title in, 3 thumbnails out.', icon: 'image', wide: true });
    thPhoto = null;
    B.innerHTML = `<div class="th-form"><input class="field" id="thTitle" placeholder="${de() ? 'Titel deines Videos, z. B. Ich habe 100 Tage Roblox überlebt' : 'Your video title'}" value="${esc(title)}">
      <div class="ds-ideas" id="thStyle">${['Gaming', 'Vlog', 'Tutorial', 'Challenge', 'Reaction'].map((x, i) => `<button class="${i ? '' : 'on'}">${x}</button>`).join('')}</div>
      <label class="th-photo"><input type="file" accept="image/*" id="thFile" hidden>${ic('image')} <span id="thFileL">${de() ? 'Eigenes Foto dazu (optional)' : 'Add your own photo (optional)'}</span></label>
      <button class="btn primary pw-go" id="thGo">${ic('wand-sparkles')} ${de() ? '3 Thumbnails erstellen' : 'Create 3 thumbnails'}</button></div><div id="thOut"></div>`;
    let style = 'Gaming';
    B.querySelectorAll('#thStyle button').forEach(b => b.onclick = () => { style = b.textContent; B.querySelectorAll('#thStyle button').forEach(x => x.classList.toggle('on', x === b)); });
    $p('thFile').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { thPhoto = { mime: f.type || 'image/jpeg', data: String(rd.result).split(',')[1] }; $p('thFileL').textContent = f.name; }; rd.readAsDataURL(f); };
    $p('thGo').onclick = async () => {
      const tt = $p('thTitle').value.trim(); if (!tt) return $p('thTitle').focus();
      const out = $p('thOut'); out.innerHTML = wait(de() ? 'Kairo malt deine Thumbnails …' : 'Painting your thumbnails …', ['1', '2', '3']);
      const off = P.onProgress((k, n) => k === 'th' && stepOn(out, n - 1));
      const r = await P.thumbs({ title: tt, style, photo: thPhoto });
      off?.();
      if (!$p('thOut')) return;
      if (!r.ok) { out.innerHTML = `<div class="pw-err">${esc(errText(r))}</div>`; return; }
      out.innerHTML = `<div class="th-grid">${r.thumbs.map((x, i) => `<div class="th-card" style="animation-delay:${i * 120}ms"><canvas width="1280" height="720" id="thC${i}"></canvas><div class="th-row"><input class="field" value="${esc(x.text)}" data-t="${i}"><button class="btn primary" data-s="${i}">${ic('download')}</button></div></div>`).join('')}</div>`;
      r.thumbs.forEach(async (x, i) => {
        const img = await loadImg(`data:${x.mime};base64,${x.data}`);
        const draw = () => thDraw($p('thC' + i), img, out.querySelector(`[data-t="${i}"]`).value, x.accent, x.side);
        draw(); out.querySelector(`[data-t="${i}"]`).oninput = draw;
        out.querySelector(`[data-s="${i}"]`).onclick = async () => { const res = await P.save({ kind: 'thumb', bytes: $p('thC' + i).toDataURL('image/png').split(',')[1], name: tt, ext: 'png' }); if (res.ok) { window.toast(de() ? 'Thumbnail gespeichert' : 'Thumbnail saved'); P.reveal(res.file); } };
      });
    };
  }
  function thDraw(cv, img, text, accent, side) {
    const g = cv.getContext('2d'), W = 1280, H = 720;
    g.clearRect(0, 0, W, H);
    if (img) { const s = Math.max(W / img.width, H / img.height); g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s); }
    const right = side === 'right', acc = /^#[0-9a-f]{6}$/i.test(accent || '') ? accent : '#ffd400';
    const gr = g.createLinearGradient(right ? W : 0, 0, right ? W * 0.35 : W * 0.65, 0); gr.addColorStop(0, 'rgba(0,0,0,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const words = String(text || '').toUpperCase().split(/\s+/).filter(Boolean);
    if (!words.length) return;
    g.textBaseline = 'middle'; g.lineJoin = 'round';
    let size = 150; g.font = `900 ${size}px "Segoe UI Black", "Arial Black", sans-serif`;
    const lines = []; let cur = ''; for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > W * 0.52 && cur) { lines.push(cur); cur = w; } else cur = tt; } lines.push(cur);
    while (lines.some(l => g.measureText(l).width > W * 0.56) && size > 70) { size -= 8; g.font = `900 ${size}px "Segoe UI Black", "Arial Black", sans-serif`; }
    const lh = size * 1.02, y0 = H / 2 - (lines.length - 1) * lh / 2, x = right ? W - 50 : 50;
    g.textAlign = right ? 'right' : 'left';
    lines.slice(0, 3).forEach((l, i) => {
      g.save(); g.translate(x, y0 + i * lh); g.rotate(-0.035);
      g.lineWidth = size * 0.16; g.strokeStyle = '#000'; g.strokeText(l, 0, 0);
      g.fillStyle = i === lines.length - 1 ? acc : '#fff'; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 20; g.fillText(l, 0, 0);
      g.restore();
    });
  }

  // tools can be opened from the main process (notification click) and from the AI ([[power: …]])
  P.onOpen?.(k => open(k));
  P.onTrendAlert?.(a => window.toast(a.title));
  function open(kind, arg) {
    ({ missed, oral: oralExam, exam: oralExam, clips, tiktok: clips, discord: discordBuild, server: discordBuild, tourney, turnier: tourney, trends, thumbs: thumbMaker, thumbnail: thumbMaker })[kind]?.(arg);
  }
  return { open, missed, oralExam, clips, clipSaved, discordBuild, tourney, trends, thumbMaker };
})();
