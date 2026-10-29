// Music visualizer, song finder, recipe cook mode, PC check, voice changer, riddles & jokes,
// birthdays and the gaming cards (playtime + patch notes).
const $f = id => document.getElementById(id);
const escF = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const accentF = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a45';
const gb = n => (n / 1073741824).toFixed(n > 1e11 ? 0 : 1) + ' GB';
const blobToB64 = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => { const u = String(fr.result); r(u.slice(u.indexOf('base64,') + 7)); }; fr.readAsDataURL(b); });

// full-screen overlay helper (inside the app window)
function overlay(id, cls = '') {
  let el = $f(id);
  if (!el) { document.body.insertAdjacentHTML('beforeend', `<div class="fx-ov ${cls}" id="${id}"></div>`); el = $f(id); }
  requestAnimationFrame(() => el.classList.add('on'));
  return el;
}
function closeOverlay(id, after) { const el = $f(id); if (!el) return; el.classList.remove('on'); setTimeout(() => { if (!el.classList.contains('on')) { el.innerHTML = ''; after?.(); } }, 450); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.fx-ov.on').forEach(o => o.querySelector('[data-close]')?.click()); });

// ================= music visualizer: the orb dances to your music =================
window.MusicViz = (function () {
  let stream = null, ctx = null, an = null, raf = 0, orb = null, npTimer = 0, level = 0, beat = 0, active = false;
  async function capture(src) {
    if (src === 'mic') return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    // system sound (what plays on the PC): Windows loopback via the desktop source
    const s = await navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: 'desktop' } }, video: { mandatory: { chromeMediaSource: 'desktop', maxWidth: 32, maxHeight: 32, maxFrameRate: 1 } } });
    s.getVideoTracks().forEach(t => t.stop());
    return s;
  }
  async function open(src = 'system') {
    const el = overlay('mvOverlay', 'mv');
    el.innerHTML = `<canvas class="mv-canvas" id="mvCanvas"></canvas>
      <div class="mv-center"><div class="mv-cover" id="mvCover"></div><canvas id="mvOrb" class="mv-orb"></canvas></div>
      <div class="mv-top"><div class="mv-now" id="mvNow"><small>${t('mv.listening')}</small><b>${t('mv.title')}</b></div>
        <div class="seg" id="mvSrc"><button data-v="system" class="${src === 'system' ? 'active' : ''}">${ic('monitor')} ${t('mv.pc')}</button><button data-v="mic" class="${src === 'mic' ? 'active' : ''}">${ic('mic')} ${t('mv.mic')}</button></div>
        <button class="fx-x" data-close>${ic('x')}</button></div>
      <div class="mv-ctl"><button data-pc="previous">${ic('skip-back')}</button><button data-pc="play_pause" class="big">${ic('play')}</button><button data-pc="next">${ic('skip-forward')}</button></div>`;
    el.querySelector('[data-close]').onclick = close;
    el.querySelectorAll('#mvSrc button').forEach(b => b.onclick = () => { stopAudio(); open(b.dataset.v); });
    el.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => { window.kairo.pc(b.dataset.pc); setTimeout(nowPlaying, 900); });
    try { stream = await capture(src); }
    catch (e) { if (src === 'system') return open('mic'); window.toast('✕ ' + t('mv.noAudio')); return; }
    ctx = new AudioContext();
    an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.8;
    ctx.createMediaStreamSource(stream).connect(an);
    active = true;
    orb = Orb.create();
    orb.start($f('mvOrb'), () => ({ level: Math.min(1, level * 1.6 + beat * .5), state: 'speaking' }));
    draw();
    nowPlaying(); clearInterval(npTimer); npTimer = setInterval(nowPlaying, 6000);
  }
  async function nowPlaying() {
    const r = await window.kairo.fun.nowPlaying();
    const el = $f('mvNow'); if (!el) return;
    if (r.ok && r.now) {
      el.innerHTML = `<small>${escF(r.now.album || r.now.app || '')}</small><b>${escF(r.now.title)}</b><span>${escF(r.now.artist || '')}</span>`;
      const c = $f('mvCover'); if (c && r.now.cover && c.dataset.src !== r.now.cover) { c.dataset.src = r.now.cover; c.style.backgroundImage = `url('${r.now.cover}')`; c.classList.add('on'); }
    }
  }
  function draw() {
    const cv = $f('mvCanvas'); if (!cv || !active) return;
    const g = cv.getContext('2d'), d = devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== W * d) { cv.width = W * d; cv.height = H * d; }
    g.setTransform(d, 0, 0, d, 0, 0);
    const data = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(data);
    const bass = data.slice(1, 12).reduce((a, b) => a + b, 0) / 11 / 255;
    const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
    level = level * 0.7 + avg * 0.3;
    if (bass > 0.62 && bass - (draw.lastBass || 0) > 0.08) { beat = 1; burst(W / 2, H / 2); }
    beat *= 0.9; draw.lastBass = bass;
    const col = accentF();
    // background glow pulses on the beat
    g.clearRect(0, 0, W, H);
    const bg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .7);
    bg.addColorStop(0, `color-mix(in srgb, ${col} ${Math.round(18 + beat * 30)}%, transparent)`); bg.addColorStop(1, 'transparent');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // radial bars, mirrored
    const n = 96, R = Math.min(W, H) * .21 + beat * 10, t0 = performance.now() / 4000;
    for (let i = 0; i < n; i++) {
      const v = data[Math.floor(Math.pow(i / n, 1.6) * 220) + 2] / 255;
      const len = 6 + v * Math.min(W, H) * .22;
      for (const side of [1, -1]) {
        const a = t0 + side * (i / n) * Math.PI - Math.PI / 2;
        const x1 = W / 2 + Math.cos(a) * R, y1 = H / 2 + Math.sin(a) * R, x2 = W / 2 + Math.cos(a) * (R + len), y2 = H / 2 + Math.sin(a) * (R + len);
        const lg = g.createLinearGradient(x1, y1, x2, y2); lg.addColorStop(0, col); lg.addColorStop(1, `hsl(${(i / n) * 120 + 200}, 90%, 70%)`);
        g.strokeStyle = lg; g.lineWidth = 3.2; g.lineCap = 'round'; g.globalAlpha = .55 + v * .45;
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      }
    }
    g.globalAlpha = 1;
    // particles
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vx *= .985; p.vy *= .985; p.life -= .012; g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, Math.max(.1, p.r * p.life), 0, 7); g.fill(); }
    g.globalAlpha = 1; parts = parts.filter(p => p.life > 0);
    if (window.__away || document.hidden) window.kairo.miniLevel({ level: Math.min(1, level * 1.8 + beat * .4), state: 'speaking' });
    raf = requestAnimationFrame(draw);
  }
  let parts = [];
  function burst(x, y) { const col = accentF(); for (let i = 0; i < 26; i++) { const a = Math.random() * 7, v = 2 + Math.random() * 6; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, r: 2 + Math.random() * 3, c: i % 2 ? col : '#fff' }); } }
  function stopAudio() { active = false; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); ctx?.close().catch(() => {}); stream = ctx = null; orb?.stop?.(); clearInterval(npTimer); }
  function close() { stopAudio(); closeOverlay('mvOverlay'); }
  return { open, close, isOn: () => active };
})();

// ================= song finder =================
window.SongFinder = (function () {
  let rec = null, stream = null;
  async function open() {
    const el = overlay('sfOverlay', 'sf');
    el.innerHTML = `<div class="sf-box"><button class="fx-x" data-close>${ic('x')}</button><div class="sf-stage" id="sfStage">${listeningHtml(t('sf.checking'))}</div></div>`;
    el.querySelector('[data-close]').onclick = close;
    // 1) is something playing on this PC right now? (Spotify, YouTube in the browser...)
    const np = await window.kairo.fun.nowPlaying();
    if (np.ok && np.now?.title && np.now.status === 'Playing') return show({ ...np.now, onPc: true });
    // 2) otherwise listen through the microphone
    listen();
  }
  function listeningHtml(msg) {
    return `<div class="sf-listen"><div class="sf-rings"><i></i><i></i><i></i><span>${ic('music-2')}</span></div><canvas id="sfWave" class="sf-wave"></canvas><b id="sfMsg">${msg}</b><small id="sfCount"></small></div>`;
  }
  async function listen() {
    $f('sfStage').innerHTML = listeningHtml(t('sf.listening'));
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } }); }
    catch { $f('sfMsg').textContent = t('voice.noMic'); return; }
    const ctx = new AudioContext(), an = ctx.createAnalyser(); an.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(an);
    const cv = $f('sfWave'), g = cv.getContext('2d'), buf = new Uint8Array(an.fftSize);
    let alive = true;
    const loop = () => {
      if (!alive || !cv.isConnected) return;
      cv.width = cv.clientWidth * 2; cv.height = cv.clientHeight * 2;
      an.getByteTimeDomainData(buf); g.clearRect(0, 0, cv.width, cv.height);
      g.strokeStyle = accentF(); g.lineWidth = 3; g.beginPath();
      buf.forEach((v, i) => { const x = i / buf.length * cv.width, y = v / 255 * cv.height; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
      requestAnimationFrame(loop);
    };
    loop();
    const chunks = [];
    rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    rec.ondataavailable = e => chunks.push(e.data);
    const SEC = 10; let left = SEC;
    $f('sfCount').textContent = left + ' s';
    const cd = setInterval(() => { left--; if ($f('sfCount')) $f('sfCount').textContent = left + ' s'; if (left <= 0) clearInterval(cd); }, 1000);
    rec.onstop = async () => {
      alive = false; clearInterval(cd); stream.getTracks().forEach(t => t.stop()); ctx.close();
      if (!$f('sfStage')) return;
      $f('sfStage').innerHTML = listeningHtml(t('sf.thinking'));
      $f('sfStage').querySelector('.sf-listen').classList.add('think');
      const b64 = await blobToB64(new Blob(chunks, { type: 'audio/webm' }));
      const r = await window.kairo.fun.identify(b64, 'audio/webm');
      if (!r.ok) { $f('sfMsg').textContent = '✕ ' + r.error.message; return; }
      if (!r.song?.title) { $f('sfStage').innerHTML = `<div class="sf-none">${ic('circle-help')}<b>${t('sf.none')}</b><button class="btn primary" id="sfAgain">${ic('refresh-cw')} ${t('sf.again')}</button></div>`; $f('sfAgain').onclick = listen; return; }
      show(r.song);
    };
    rec.start();
    setTimeout(() => rec?.state === 'recording' && rec.stop(), SEC * 1000);
  }
  function show(s) {
    const q = encodeURIComponent(`${s.artist || ''} ${s.title}`.trim());
    $f('sfStage').innerHTML = `<div class="sf-result">
      <div class="sf-vinyl"><div class="sf-disc"></div><div class="sf-cover" style="${s.cover ? `background-image:url('${escF(s.cover)}')` : ''}">${s.cover ? '' : ic('music')}</div></div>
      <div class="sf-info"><small>${s.onPc ? t('sf.onPc') : t('sf.found')}${s.confidence ? ' · ' + s.confidence + '%' : ''}</small>
        <h2>${escF(s.title)}</h2><h3>${escF(s.artist || '')}</h3>
        <span>${escF([s.album, s.year, s.genre].filter(Boolean).join(' · '))}</span>
        ${s.lyric ? `<blockquote>„${escF(s.lyric)}“</blockquote>` : ''}
        <div class="sf-actions">${s.preview ? `<button class="btn primary" id="sfPrev">${ic('play')} ${t('sf.preview')}</button>` : ''}
          <button class="btn" data-url="spotify:search:${q}">Spotify</button><button class="btn" data-url="https://www.youtube.com/results?search_query=${q}">YouTube</button>
          <button class="btn" id="sfAgain2">${ic('refresh-cw')}</button></div></div></div>`;
    let audio = null;
    if ($f('sfPrev')) $f('sfPrev').onclick = () => { if (audio && !audio.paused) { audio.pause(); return; } audio = new Audio(s.preview); audio.volume = .8; audio.play(); $f('sfStage').querySelector('.sf-vinyl').classList.add('spin'); audio.onended = audio.onpause = () => $f('sfStage')?.querySelector('.sf-vinyl')?.classList.remove('spin'); };
    $f('sfStage').querySelectorAll('[data-url]').forEach(b => b.onclick = () => window.kairo.action({ type: 'open', url: b.dataset.url }));
    $f('sfAgain2').onclick = listen;
    SongFinder.last = s;
  }
  function close() { try { rec?.state === 'recording' && rec.stop(); } catch {} stream?.getTracks().forEach(t => t.stop()); closeOverlay('sfOverlay'); }
  return { open, close, listen };
})();

// ================= recipe helper & cook mode =================
window.Cook = (function () {
  let R = null, step = 0, timer = null, speak = false;
  async function open(wish) {
    const el = overlay('ckOverlay', 'ck');
    if (!wish) {
      el.innerHTML = `<div class="ck-ask"><button class="fx-x" data-close>${ic('x')}</button><div class="ck-hat">${ic('chef-hat')}</div><h2>${t('ck.q')}</h2>
        <form id="ckForm"><input class="field" id="ckWish" placeholder="${t('ck.ph')}" autofocus><button class="btn primary">${ic('sparkles')} ${t('ck.go')}</button></form>
        <div class="ck-sugg">${t('ck.sugg').split('|').map(x => `<button>${escF(x)}</button>`).join('')}</div></div>`;
      el.querySelector('[data-close]').onclick = close;
      $f('ckForm').onsubmit = e => { e.preventDefault(); const w = $f('ckWish').value.trim(); if (w) open(w); };
      el.querySelectorAll('.ck-sugg button').forEach(b => b.onclick = () => open(b.textContent));
      setTimeout(() => $f('ckWish')?.focus(), 300);
      return null;
    }
    el.innerHTML = `<div class="ck-loading"><div class="ck-pan"><i></i><i></i><i></i></div><b>${t('ck.cooking')}</b><small>${escF(wish)}</small></div>`;
    const r = await window.kairo.fun.recipe(wish);
    if (!r.ok) { el.innerHTML = `<div class="ck-ask"><button class="fx-x" data-close>${ic('x')}</button><b>✕ ${escF(r.error.message)}</b></div>`; el.querySelector('[data-close]').onclick = close; return null; }
    R = r.recipe; step = 0;
    el.innerHTML = `<div class="ck-wrap">
      <div class="ck-head"><div><small>${ic('chef-hat')} ${t('ck.title')}</small><h1>${escF(R.title)}</h1><p>${escF(R.intro || '')}</p>
        <div class="ck-chips"><span>${ic('timer')} ${R.minutes || '?'} min</span><span>${ic('users')} ${R.servings || '?'}</span><span>${ic('flame')} ${escF(R.difficulty || '')}</span></div></div>
        <div class="ck-tools"><button class="btn" id="ckSpeak">${ic('volume-2')} ${t('ck.read')}</button><button class="btn" id="ckSave">${ic('file-down')} PDF</button><button class="fx-x" data-close>${ic('x')}</button></div></div>
      <div class="ck-body"><aside class="ck-ing"><h3>${t('ck.ing')}</h3>${R.ingredients.map((g, i) => `<label style="animation-delay:${i * 50}ms"><input type="checkbox"><i></i><b>${escF(g.amount || '')}</b><span>${escF(g.item)}</span></label>`).join('')}
        ${R.tip ? `<div class="ck-tip">${ic('lightbulb')}<span>${escF(R.tip)}</span></div>` : ''}</aside>
        <section class="ck-steps"><div class="ck-dots" id="ckDots"></div><div class="ck-step" id="ckStep"></div>
          <div class="ck-nav"><button class="btn" id="ckPrev">${ic('chevron-left')} ${t('ck.prev')}</button><button class="btn primary" id="ckNext">${t('ck.next')} ${ic('chevron-right')}</button></div></section></div></div>`;
    el.querySelector('[data-close]').onclick = close;
    $f('ckPrev').onclick = () => go(step - 1); $f('ckNext').onclick = () => go(step + 1);
    $f('ckSpeak').onclick = () => { speak = !speak; $f('ckSpeak').classList.toggle('primary', speak); if (speak) say(); else Voice.stop(); };
    $f('ckSave').onclick = async () => {
      const md = `# ${R.title}\n\n${R.intro || ''}\n\n> ${R.minutes} min · ${R.servings} Portionen · ${R.difficulty || ''}\n\n## ${t('ck.ing')}\n${R.ingredients.map(g => `- **${g.amount || ''}** ${g.item}`).join('\n')}\n\n## ${t('ck.steps')}\n${R.steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n')}\n\n${R.tip ? '> ' + R.tip : ''}`;
      const res = await window.kairo.action({ type: 'file', name: R.title + '.pdf', content: md });
      if (res.ok) { window.toast('PDF ✓'); window.kairo.action({ type: 'openfile', path: res.path }); }
    };
    render();
    return R;
  }
  function render() {
    if (!R) return;
    const s = R.steps[step];
    $f('ckDots').innerHTML = R.steps.map((_, i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('');
    const box = $f('ckStep');
    box.classList.remove('in'); void box.offsetWidth;
    box.innerHTML = `<div class="ck-num">${step + 1}<small>/ ${R.steps.length}</small></div><p>${escF(s.text)}</p>
      ${s.minutes ? `<div class="ck-timer" id="ckTimer"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="tr-bg"/><circle cx="60" cy="60" r="52" class="tr-fg" id="ckRing" pathLength="100"/></svg><div><b id="ckTime">${s.minutes}:00</b><button class="btn" id="ckTStart">${ic('play')} ${t('ck.timer')}</button></div></div>` : ''}`;
    box.classList.add('in');
    $f('ckPrev').disabled = step === 0;
    $f('ckNext').innerHTML = step === R.steps.length - 1 ? `${ic('party-popper')} ${t('ck.done')}` : `${t('ck.next')} ${ic('chevron-right')}`;
    if ($f('ckTStart')) $f('ckTStart').onclick = () => startTimer(s.minutes);
    if (speak) say();
  }
  function say() { if (R) Voice.speak(`${t('ck.stepWord')} ${step + 1}. ${R.steps[step].text}`, window.App.settings()); }
  function startTimer(min) {
    clearInterval(timer);
    const end = Date.now() + min * 60000, total = min * 60000;
    $f('ckTStart').innerHTML = `${ic('pause')}`; $f('ckTStart').onclick = () => { clearInterval(timer); render(); };
    timer = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      if (!$f('ckTime')) return clearInterval(timer);
      $f('ckTime').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left % 60000 / 1000)).padStart(2, '0')}`;
      $f('ckRing').style.strokeDashoffset = 100 - left / total * 100;
      if (!left) { clearInterval(timer); $f('ckTimer').classList.add('ring'); window.toast('⏰ ' + t('ck.timerDone')); new Audio('data:audio/wav;base64,' + beep()).play().catch(() => {}); }
    }, 250);
  }
  function beep() {
    // tiny generated chime
    const sr = 22050, n = sr * 1.2, buf = new DataView(new ArrayBuffer(44 + n * 2));
    const w = (o, s) => [...s].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); buf.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true); buf.setUint32(24, sr, true); buf.setUint32(28, sr * 2, true); buf.setUint16(32, 2, true); buf.setUint16(34, 16, true); w(36, 'data'); buf.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const tt = i / sr, f = tt < .4 ? 880 : tt < .8 ? 1175 : 1568; buf.setInt16(44 + i * 2, Math.sin(2 * Math.PI * f * tt) * Math.exp(-((tt % .4) * 6)) * 12000, true); }
    let bin = ''; new Uint8Array(buf.buffer).forEach(b => bin += String.fromCharCode(b)); return btoa(bin);
  }
  function go(i) {
    if (!R) return;
    if (i >= R.steps.length) { window.toast('🎉 ' + t('ck.enjoy')); close(); return; }
    step = Math.max(0, i); clearInterval(timer); render();
  }
  document.addEventListener('keydown', e => { if (!$f('ckStep') || !$f('ckOverlay')?.classList.contains('on') || e.target.matches('input')) return; if (e.key === 'ArrowRight') go(step + 1); if (e.key === 'ArrowLeft') go(step - 1); });
  function close() { clearInterval(timer); Voice.stop(); closeOverlay('ckOverlay'); }
  return { open, close, next: () => go(step + 1), prev: () => go(step - 1), repeat: () => render(), current: () => (R ? { step: step + 1, of: R.steps.length, text: R.steps[step].text, title: R.title } : null) };
})();

// ================= PC check =================
window.PcCheck = (function () {
  function gauge(label, pct, sub, icon) {
    const p = Math.max(0, Math.min(100, pct || 0)), col = p > 85 ? '#ff5d5d' : p > 65 ? '#ffb02e' : '#3ddc97';
    return `<div class="pcg"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="g-bg"/><circle cx="60" cy="60" r="50" class="g-fg" pathLength="100" style="--p:${p};stroke:${col}"/></svg>
      <div class="pcg-in">${ic(icon)}<b data-to="${p}">0%</b></div><span>${label}</span><small>${sub}</small></div>`;
  }
  async function open() {
    const el = overlay('pcOverlay', 'pcov');
    el.innerHTML = `<div class="pc-box"><div class="pc-top"><div><small>${ic('cpu')} ${t('pc2.title')}</small><h2>${t('pc2.scanning')}</h2></div><button class="fx-x" data-close>${ic('x')}</button></div>
      <div class="pc-scan"><i></i></div></div>`;
    el.querySelector('[data-close]').onclick = () => closeOverlay('pcOverlay');
    const r = await window.kairo.fun.pc();
    if (!r.ok) { el.querySelector('h2').textContent = '✕ ' + r.error.message; return null; }
    const p = r.pc, ramUsed = p.ramTotal - p.ramFree, maxMb = Math.max(...p.procs.map(x => x.mb), 1);
    const up = p.uptime > 86400 ? `${Math.floor(p.uptime / 86400)} d ${Math.floor(p.uptime % 86400 / 3600)} h` : `${Math.floor(p.uptime / 3600)} h ${Math.floor(p.uptime % 3600 / 60)} min`;
    el.querySelector('.pc-box').innerHTML = `<div class="pc-top"><div><small>${ic('cpu')} ${t('pc2.title')} · ${escF(p.host)}</small><h2>${t('pc2.result')}</h2></div><button class="fx-x" data-close>${ic('x')}</button></div>
      <div class="pc-gauges">${gauge('CPU', p.cpu, `${p.cores} ${t('pc2.cores')}`, 'cpu')}${gauge('RAM', ramUsed / p.ramTotal * 100, `${gb(ramUsed)} / ${gb(p.ramTotal)}`, 'memory-stick')}
        ${p.disks.map(d => gauge(d.drive, (d.total - d.free) / d.total * 100, `${gb(d.free)} ${t('pc2.free')}`, 'hard-drive')).join('')}</div>
      <div class="pc-grid">
        <div class="pc-card"><h4>${ic('activity')} ${t('pc2.top')}</h4>${p.procs.map((x, i) => `<div class="pc-proc" style="--w:${x.mb / maxMb * 100}%;animation-delay:${i * 60}ms"><span>${escF(x.name)}</span><b>${x.mb >= 1024 ? (x.mb / 1024).toFixed(1) + ' GB' : x.mb + ' MB'}</b><i></i></div>`).join('')}</div>
        <div class="pc-card"><h4>${ic('gauge')} ${t('pc2.facts')}</h4>
          <div class="pc-fact"><span>${t('pc2.uptime')}</span><b>${up}</b></div>
          <div class="pc-fact"><span>${t('pc2.startup')}</span><b>${p.startup.length}</b></div>
          <div class="pc-fact"><span>${t('pc2.temp')}</span><b>${gb(p.temp.size)}${p.temp.partial ? '+' : ''}</b></div>
          <div class="pc-fact"><span>${t('pc2.downloads')}</span><b>${gb(p.downloads.size)}${p.downloads.partial ? '+' : ''}</b></div>
          <div class="pc-fact"><span>GPU</span><b>${escF(p.gpu || '–')}</b></div>
          <div class="pc-fact"><span>CPU</span><b>${escF(p.cpuName || '–')}</b></div></div>
        <div class="pc-card pc-ai"><h4>${ic('sparkles')} ${t('pc2.tips')}</h4><div id="pcTips" class="md"><div class="cty-skel"><i></i><i></i></div></div>
          <div class="pc-btns"><button class="btn" data-open="ms-settings:storagesense">${ic('brush')} ${t('pc2.clean')}</button><button class="btn" data-open="ms-settings:startupapps">${ic('zap')} ${t('pc2.autostart')}</button><button class="btn" data-app="taskmgr">${ic('activity')} Task-Manager</button></div></div>
      </div>`;
    el.querySelector('[data-close]').onclick = () => closeOverlay('pcOverlay');
    el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => window.kairo.action({ type: 'open', url: b.dataset.open }));
    el.querySelectorAll('[data-app]').forEach(b => b.onclick = () => window.kairo.action({ type: 'app', name: b.dataset.app }));
    el.querySelectorAll('.pcg b[data-to]').forEach(b => countUp(b, +b.dataset.to, x => Math.round(x) + '%', 1200));
    const facts = `CPU ${p.cpu}% (${p.cpuName}, ${p.cores} cores), RAM ${gb(ramUsed)} of ${gb(p.ramTotal)}, disks: ${p.disks.map(d => `${d.drive} ${gb(d.free)} free of ${gb(d.total)}`).join(', ')}, uptime ${up}, ${p.startup.length} startup apps (${p.startup.slice(0, 12).join(', ')}), temp files ${gb(p.temp.size)}, downloads ${gb(p.downloads.size)}, GPU ${p.gpu}. Top RAM: ${p.procs.map(x => `${x.name} ${x.mb} MB`).join(', ')}.`;
    const ai = await window.kairo.complete({ plain: true, text: `My PC right now: ${facts}\nWhat makes it slow and what are the 3-5 best concrete tips? Short bullet points, friendly, no technical jargon. Mention the biggest problem first.` });
    if ($f('pcTips')) $f('pcTips').innerHTML = ai.ok ? window.renderMarkdown(ai.text) : '–';
    return { facts };
  }
  return { open };
})();

// ================= voice changer =================
window.VoiceFX = (function () {
  const FX = { normal: ['smile', 'Normal'], robot: ['bot', 'Roboter'], monster: ['ghost', 'Monster'], mouse: ['sparkles', 'Micky'], cave: ['mountain', 'Höhle'], radio: ['radio', 'Radio'], alien: ['orbit', 'Alien'], phone: ['smartphone', 'Telefon'] };
  let ctx = null, mic = null, src = null, out = null, nodes = [], fx = 'robot', live = false, an = null, raf = 0, rec = null, lastBlob = null;
  function render(el) {
    el.innerHTML = `<div class="vfx">
      <p class="muted small">${t('vfx.desc')}</p>
      <div class="vfx-grid">${Object.entries(FX).map(([k, [icon, name]], i) => `<button data-fx="${k}" class="${k === fx ? 'on' : ''}" style="animation-delay:${i * 40}ms"><span>${ic(icon)}</span>${t('vfx.' + k) !== 'vfx.' + k ? t('vfx.' + k) : name}</button>`).join('')}</div>
      <canvas class="vfx-wave" id="vfxWave"></canvas>
      <div class="vfx-ctl"><button class="btn primary vfx-rec" id="vfxRec">${ic('circle-dot')} ${t('vfx.record')}</button>
        <button class="btn" id="vfxPlay" disabled>${ic('play')} ${t('vfx.play')}</button><button class="btn" id="vfxSave" disabled>${ic('download')}</button>
        <label class="tog"><input type="checkbox" id="vfxLive"><span>${t('vfx.live')}</span></label></div>
      <small class="muted" id="vfxNote">${t('vfx.note')}</small></div>`;
    el.querySelectorAll('[data-fx]').forEach(b => b.onclick = () => { fx = b.dataset.fx; el.querySelectorAll('[data-fx]').forEach(x => x.classList.toggle('on', x === b)); if (mic) rebuild(); });
    $f('vfxLive').onchange = e => setLive(e.target.checked);
    $f('vfxRec').onclick = record;
    $f('vfxPlay').onclick = () => lastBlob && new Audio(URL.createObjectURL(lastBlob)).play();
    $f('vfxSave').onclick = async () => { if (!lastBlob) return; const r = await window.kairo.fun.saveAudio(await blobToB64(lastBlob), 'webm'); if (r.ok) { window.toast('✓ Musik/Kairo'); window.kairo.action({ type: 'reveal', path: r.path }); } };
  }
  async function ensure() {
    if (mic) return;
    ctx = new AudioContext();
    await ctx.audioWorklet.addModule('pitch-worklet.js');
    mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    src = ctx.createMediaStreamSource(mic);
    an = ctx.createAnalyser(); an.fftSize = 1024;
    out = ctx.createGain();
    out.connect(an);
    rebuild(); wave();
  }
  function impulse(sec) { const n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); } return b; }
  function shaper(k) { const s = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } s.curve = c; return s; }
  function ringMod(freq) { const g = ctx.createGain(); g.gain.value = 0; const o = ctx.createOscillator(); o.frequency.value = freq; o.connect(g.gain); o.start(); nodes.push(o); return g; }
  function pitch(r) { const p = new AudioWorkletNode(ctx, 'pitch-shifter'); p.parameters.get('ratio').value = r; return p; }
  function filt(type, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  function rebuild() {
    try { src.disconnect(); } catch {}
    nodes.forEach(n => { try { n.stop?.(); n.disconnect(); } catch {} }); nodes = [];
    let chain = [];
    if (fx === 'robot') chain = [ringMod(55), shaper(4), filt('highpass', 200)];
    if (fx === 'monster') { const lo = filt('lowshelf', 200); lo.gain.value = 9; chain = [pitch(0.66), lo, shaper(3)]; }
    if (fx === 'mouse') chain = [pitch(1.7), filt('highpass', 300)];
    if (fx === 'cave') { const cv = ctx.createConvolver(); cv.buffer = impulse(3); const dry = ctx.createGain(); dry.gain.value = .6; src.connect(dry); dry.connect(out); nodes.push(dry); chain = [cv]; }
    if (fx === 'radio') chain = [filt('bandpass', 1400, 1.2), shaper(18), filt('highpass', 400)];
    if (fx === 'alien') { const d = ctx.createDelay(); d.delayTime.value = .03; const fb = ctx.createGain(); fb.gain.value = .55; d.connect(fb); fb.connect(d); nodes.push(fb); chain = [ringMod(420), pitch(1.25), d]; }
    if (fx === 'phone') chain = [filt('highpass', 350), filt('lowpass', 3200), shaper(6)];
    let last = src;
    for (const n of chain) { last.connect(n); nodes.push(n); last = n; }
    last.connect(out);
    out.disconnect(); out.connect(an);
    if (live) out.connect(ctx.destination);
  }
  async function setLive(on) {
    try { await ensure(); } catch { window.toast(t('voice.noMic')); return; }
    live = on;
    out.disconnect(); out.connect(an); if (live) out.connect(ctx.destination);
    if (on) window.toast(t('vfx.headphones'));
  }
  async function record() {
    try { await ensure(); } catch { window.toast(t('voice.noMic')); return; }
    if (rec?.state === 'recording') { rec.stop(); return; }
    const dest = ctx.createMediaStreamDestination(); out.connect(dest);
    const chunks = [];
    rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus' });
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => { out.disconnect(dest); lastBlob = new Blob(chunks, { type: 'audio/webm' }); $f('vfxRec')?.classList.remove('rec'); if ($f('vfxRec')) $f('vfxRec').innerHTML = `${ic('circle-dot')} ${t('vfx.record')}`; $f('vfxPlay').disabled = $f('vfxSave').disabled = false; new Audio(URL.createObjectURL(lastBlob)).play(); };
    rec.start();
    $f('vfxRec').classList.add('rec'); $f('vfxRec').innerHTML = `${ic('octagon-x')} ${t('vfx.stop')}`;
    setTimeout(() => rec?.state === 'recording' && rec.stop(), 12000);
  }
  function wave() {
    const cv = $f('vfxWave'); if (!cv || !an) { raf = 0; return; }
    const g = cv.getContext('2d'); cv.width = cv.clientWidth * 2; cv.height = cv.clientHeight * 2;
    const buf = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(buf);
    g.clearRect(0, 0, cv.width, cv.height);
    const n = 64, w = cv.width / n, col = accentF();
    for (let i = 0; i < n; i++) { const v = buf[Math.floor(i * buf.length / n / 2)] / 255, h = Math.max(4, v * cv.height * .9); g.fillStyle = col; g.globalAlpha = .35 + v * .65; g.beginPath(); g.roundRect(i * w + 2, (cv.height - h) / 2, w - 4, h, 4); g.fill(); }
    g.globalAlpha = 1;
    raf = requestAnimationFrame(wave);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; live = false; try { rec?.state === 'recording' && rec.stop(); } catch {} mic?.getTracks().forEach(t => t.stop()); ctx?.close().catch(() => {}); mic = ctx = src = out = an = null; nodes = []; }
  return { render, stop, set: k => { fx = k; } };
})();

// ================= riddles & jokes =================
window.Riddles = (function () {
  let cur = null;
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(der|die|das|ein|eine|the|a|an)\b/g, '').replace(/[^a-z0-9äöü]/g, '');
  async function render(el, force) {
    el.innerHTML = `<div class="rdl"><div class="rdl-card" id="rdlCard"><div class="rdl-face front"><small>${ic('puzzle')} ${t('rd2.daily')}</small><p id="rdlQ"><span class="cty-skel"><i></i><i></i></span></p>
        <div class="rdl-hint" id="rdlHint" hidden></div>
        <form id="rdlForm"><input class="field" id="rdlA" placeholder="${t('rd2.answer')}" autocomplete="off"><button class="btn primary">${ic('check')}</button></form>
        <div class="rdl-btns"><button class="btn" id="rdlHintBtn">${ic('lightbulb')} ${t('rd2.hint')}</button><button class="btn" id="rdlShow">${ic('eye')} ${t('rd2.show')}</button><button class="btn" id="rdlNew">${ic('refresh-cw')}</button></div></div>
      <div class="rdl-face back"><small id="rdlRes"></small><h3 id="rdlAns"></h3><p id="rdlExp"></p><button class="btn" id="rdlBack">${ic('undo-2')}</button></div></div>
      <div class="rdl-streak" id="rdlStreak"></div>
      <div class="joke"><button class="btn primary" id="jokeBtn">${ic('laugh')} ${t('rd2.joke')}</button><div class="joke-box" id="jokeBox"></div></div></div>`;
    streak();
    const r = await window.kairo.fun.riddle(!!force);
    if (!r.ok) { $f('rdlQ').textContent = '✕ ' + r.error.message; return; }
    cur = r.riddle;
    $f('rdlQ').textContent = cur.question;
    $f('rdlHintBtn').onclick = () => { $f('rdlHint').hidden = false; $f('rdlHint').innerHTML = ic('lightbulb') + ' ' + escF(cur.hint || '–'); };
    $f('rdlShow').onclick = () => reveal(false);
    $f('rdlNew').onclick = () => render(el, true);
    $f('rdlBack').onclick = () => $f('rdlCard').classList.remove('flip');
    $f('rdlForm').onsubmit = e => {
      e.preventDefault();
      const a = norm($f('rdlA').value), b = norm(cur.answer);
      const ok = a && b && (a === b || a.includes(b) || b.includes(a) && a.length > 2);
      if (ok) reveal(true); else { $f('rdlForm').classList.remove('shake'); void $f('rdlForm').offsetWidth; $f('rdlForm').classList.add('shake'); }
    };
    $f('jokeBtn').onclick = joke;
  }
  function streak() { let s = 0; try { s = +localStorage.getItem('kairo.riddleStreak') || 0; } catch {} if ($f('rdlStreak')) $f('rdlStreak').innerHTML = s ? `${ic('flame')} ${t('rd2.streak', { n: s })}` : ''; }
  function reveal(won) {
    $f('rdlRes').innerHTML = won ? `${ic('party-popper')} ${t('rd2.right')}` : t('rd2.solution');
    $f('rdlAns').textContent = cur.answer; $f('rdlExp').textContent = cur.explain || '';
    $f('rdlCard').classList.add('flip');
    try { const k = 'kairo.riddleStreak', d = new Date().toDateString(); if (won && localStorage.getItem('kairo.riddleDay') !== d) { localStorage.setItem(k, (+localStorage.getItem(k) || 0) + 1); localStorage.setItem('kairo.riddleDay', d); } else if (!won) localStorage.setItem(k, 0); } catch {}
    streak();
    if (won) confettiAt($f('rdlCard'));
  }
  async function joke() {
    const box = $f('jokeBox');
    box.innerHTML = `<div class="drum"><i></i><i></i><i></i></div>`;
    const r = await window.kairo.fun.joke('');
    if (!r.ok) { box.textContent = '✕'; return; }
    box.innerHTML = `<p class="j-setup">${escF(r.joke.setup)}</p><p class="j-punch" id="jPunch">${escF(r.joke.punchline)}</p>`;
    setTimeout(() => { $f('jPunch')?.classList.add('on'); laughBurst(box); }, Math.min(3500, 1200 + r.joke.setup.length * 25));
    return r.joke;
  }
  return { render, joke };
})();
function confettiAt(host) {
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('i'); c.className = 'confetti';
    c.style.cssText = `left:50%;top:40%;--x:${(Math.random() - .5) * 600}px;--y:${-150 - Math.random() * 350}px;--r:${Math.random() * 720}deg;background:hsl(${Math.random() * 360},90%,60%);animation-delay:${Math.random() * .15}s`;
    host.appendChild(c); setTimeout(() => c.remove(), 2400);
  }
}
function laughBurst(host) {
  for (let i = 0; i < 8; i++) { const s = document.createElement('span'); s.className = 'laugh'; s.textContent = ['😂', '🤣', '😆'][i % 3]; s.style.cssText = `left:${10 + Math.random() * 80}%;animation-delay:${i * .08}s`; host.appendChild(s); setTimeout(() => s.remove(), 2200); }
}

// ================= birthdays (Today card) =================
window.Birthdays = (function () {
  async function render(el, list) {
    if (!list) { const r = await window.kairo.fun.birthdays(); list = r.ok ? r.list : []; }
    const col = name => `hsl(${[...name].reduce((a, c) => a + c.charCodeAt(0), 0) * 37 % 360}, 70%, 55%)`;
    el.innerHTML = (list.length ? `<div class="bd-list">${list.slice(0, 4).map((b, i) => `<div class="bd-item ${b.days === 0 ? 'today' : ''}" style="animation-delay:${i * 70}ms">
        <span class="bd-av" style="--c:${col(b.name)}">${escF(b.name[0].toUpperCase())}</span>
        <div><b>${escF(b.name)}</b><small>${new Date(b.next).toLocaleDateString(window.APP_LANG === 'de' ? 'de-CH' : 'en-GB', { day: 'numeric', month: 'long' })}${b.age ? ' · ' + t('bd.turns', { n: b.age }) : ''}</small></div>
        <span class="bd-days">${b.days === 0 ? ic('cake') + ' ' + t('bd.today') : b.days === 1 ? t('bd.tomorrow') : t('bd.in', { n: b.days })}</span><button class="bd-x" data-id="${b.id}">${ic('x')}</button></div>`).join('')}</div>`
      : `<div class="muted small">${t('bd.empty')}</div>`) +
      `<form class="bd-add"><input class="field" name="n" placeholder="${t('bd.name')}"><input class="field" name="d" placeholder="${t('bd.date')}"><button class="btn">+</button></form>`;
    el.querySelectorAll('.bd-x').forEach(b => b.onclick = async () => render(el, (await window.kairo.fun.bdRemove(b.dataset.id)).list));
    el.querySelector('.bd-add').onsubmit = async e => {
      e.preventDefault();
      const f = e.target, r = await window.kairo.fun.bdAdd({ name: f.n.value.trim(), date: f.d.value.trim() });
      if (!r.ok) return window.toast('✕ ' + r.error.message);
      render(el, r.list);
    };
    if (list[0]?.days === 0 && !el.dataset.party) { el.dataset.party = 1; confettiAt(el.closest('.tcard') || el); }
  }
  window.kairo.fun.onBirthday(b => { window.toast((b.days === 0 ? '🎂 ' : '🎁 ') + b.name); if ($f('tcBdBody')) render($f('tcBdBody')); });
  return { render };
})();

// ================= gaming cards: playtime + patch notes =================
window.GamesExtra = (function () {
  const COLORS = ['#ff7a45', '#6fd3ff', '#b78cff', '#3ddc97', '#ffd27a', '#ff5d8f'];
  function mount() {
    const col = document.querySelector('#view-games .page-col');
    if (!col || $f('gxPlay')) return;
    col.insertAdjacentHTML('beforeend', `
      <div class="tcard gx" id="gxPlay"><div class="tcard-h"><b>${ic('timer')} ${t('gx.play')}</b><span class="muted small" id="gxTotal"></span></div><div id="gxPlayBody"></div></div>
      <div class="tcard gx" id="gxPatch"><div class="tcard-h"><b>${ic('scroll-text')} ${t('gx.patch')}</b></div>
        <form id="gxForm" class="gx-form"><input class="field" id="gxGame" placeholder="${t('gx.patchPh')}"><button class="btn primary">${ic('search')}</button></form>
        <div class="gx-chips">${['Fortnite', 'Minecraft', 'Valorant', 'Counter-Strike 2', 'Roblox', 'EA FC'].map(g => `<button>${g}</button>`).join('')}</div>
        <div id="gxPatchBody"></div></div>`);
    $f('gxForm').onsubmit = e => { e.preventDefault(); const g = $f('gxGame').value.trim(); if (g) patch(g); };
    col.querySelectorAll('.gx-chips button').forEach(b => b.onclick = () => patch(b.textContent));
    playtime();
  }
  async function playtime() {
    const r = await window.kairo.fun.playtime(); if (!r.ok || !$f('gxPlayBody')) return;
    const names = r.top.slice(0, 6).map(g => g.name), max = Math.max(60, ...r.days.map(d => Object.values(d.games).reduce((a, b) => a + b, 0)));
    $f('gxTotal').textContent = `${Math.floor(r.total / 60)} h ${r.total % 60} min`;
    if (!r.total) { $f('gxPlayBody').innerHTML = `<div class="muted small">${t('gx.noPlay')}</div>`; return; }
    $f('gxPlayBody').innerHTML = `<div class="gx-bars">${r.days.map((d, i) => `<div class="gx-day"><div class="gx-stack" style="animation-delay:${i * 70}ms">${names.map((n, j) => d.games[n] ? `<i style="height:${d.games[n] / max * 100}%;background:${COLORS[j]}" title="${escF(n)} ${d.games[n]} min"></i>` : '').join('')}</div><small>${new Date(d.date + 'T12:00').toLocaleDateString('de-CH', { weekday: 'short' })}</small></div>`).join('')}</div>
      <div class="gx-legend">${r.top.slice(0, 6).map((g, j) => `<span><i style="background:${COLORS[j]}"></i>${escF(g.name)} <b>${g.min >= 60 ? Math.floor(g.min / 60) + ' h ' : ''}${g.min % 60} min</b></span>`).join('')}</div>`;
  }
  async function patch(game) {
    const body = $f('gxPatchBody'); if (!body) return null;
    body.innerHTML = `<div class="gx-load"><div class="cty-skel"><i></i><i></i><i></i></div><small>${t('gx.reading', { game: escF(game) })}</small></div>`;
    const r = await window.kairo.fun.patch(game);
    if (!r.ok) { body.innerHTML = `<div class="muted small">✕ ${escF(r.error.message)}</div>`; return null; }
    const n = r.notes;
    body.innerHTML = `<div class="gx-patch">${n.image ? `<div class="gx-hero" style="background-image:url('${escF(n.image)}')"></div>` : ''}
      <div class="gx-meta"><b>${escF(n.game || game)}</b><small>${escF(n.title || '')}${n.date ? ' · ' + new Date(n.date).toLocaleDateString('de-CH') : ''} · ${escF(n.source)}</small></div>
      ${n.headline ? `<h4>${escF(n.headline)}</h4>` : ''}<ul>${(n.points || []).map((p, i) => `<li style="animation-delay:${.15 + i * .07}s">${escF(p)}</li>`).join('')}</ul>
      ${n.verdict ? `<p class="gx-verdict">${ic('sparkles')} ${escF(n.verdict)}</p>` : ''}${n.url ? `<a href="${escF(n.url)}" data-ext class="small">${t('gx.full')} ↗</a>` : ''}</div>`;
    return n;
  }
  return { mount, patch, playtime };
})();

// ================= tabs, tools and Today cards =================
window.Fun = (function () {
  function areas() {
    const mini = $f('miniArea');
    if (!mini || $f('riddleArea')) return;
    mini.insertAdjacentHTML('afterend', '<div id="riddleArea" hidden></div><div id="voicefxArea" hidden></div>');
  }
  function showTab(g) {
    areas();
    $f('riddleArea').hidden = g !== 'riddle';
    $f('voicefxArea').hidden = g !== 'voicefx';
    if (g === 'riddle' && !$f('riddleArea').children.length) Riddles.render($f('riddleArea'));
    if (g === 'voicefx') VoiceFX.render($f('voicefxArea')); else VoiceFX.stop();
  }
  function init() {
    const bind = (id, fn) => { const b = $f(id); if (b) b.onclick = fn; };
    bind('tdViz', () => MusicViz.open());
    bind('tdSong', () => SongFinder.open());
    bind('tdRecipe', () => Cook.open());
    bind('tdPc', () => PcCheck.open());
    bind('tdVoiceFx', () => { window.App.go('games'); Games.showGame('voicefx'); });
    bind('tdGeo', () => { window.App.go('games'); Geo.start(); });
    GamesExtra.mount();
    // Today: birthday card
    const grid = document.querySelector('#view-today .today-grid');
    if (grid && !$f('tcBd')) {
      grid.insertAdjacentHTML('beforeend', `<div class="tcard" id="tcBd"><div class="tcard-h"><b>🎂 ${t('bd.title')}</b></div><div id="tcBdBody"></div></div>`);
      Birthdays.render($f('tcBdBody'));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 400)); else setTimeout(init, 400);
  return { showTab, init };
})();
