// Jarvis mode for the whole app: a boot sequence, a holographic theme, a live HUD frame around the window,
// answers that appear as animated hologram panels, and a log of the conversation on the desktop HUD.
(function () {
  const J = window.Jarvis;
  if (!J) return;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get: () => { try { return localStorage.getItem('kairo.jarvis') === '1'; } catch { return false; } }, set: v => { try { localStorage.setItem('kairo.jarvis', v ? '1' : '0'); } catch {} } };
  let ac = null, hudTimer = 0, clockTimer = 0, obs = null, bgRaf = 0;

  // ---------- small synthesized UI sounds ----------
  function blip(kind) {
    try {
      ac = ac || new AudioContext();
      const t = ac.currentTime, g = ac.createGain(); g.connect(ac.destination);
      const notes = kind === 'boot' ? [[220, 0, .5], [330, .18, .5], [440, .36, .6], [880, .6, .9]] : kind === 'off' ? [[660, 0, .3], [440, .12, .3], [220, .24, .5]] : [[1320, 0, .08], [1760, .06, .12]];
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'msg' ? 0.025 : 0.05, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'boot' ? 1.6 : 0.5));
      notes.forEach(([f, d, len]) => { const o = ac.createOscillator(); o.type = kind === 'boot' ? 'sine' : 'triangle'; o.frequency.setValueAtTime(f, t + d); o.frequency.exponentialRampToValueAtTime(f * 1.01, t + d + len); o.connect(g); o.start(t + d); o.stop(t + d + len); });
    } catch {}
  }

  // ---------- boot / shutdown sequence over the app ----------
  function bootSequence() {
    document.getElementById('jvBoot')?.remove();
    const lines = ['INITIALISIERE J.A.R.V.I.S. PROTOKOLL', 'NEURALES NETZ ............ OK', 'SPRACHMODUL ............... OK', 'SENSOREN & DATEN .......... OK', 'HOLOGRAFISCHE OBERFLÄCHE .. OK'];
    document.body.insertAdjacentHTML('beforeend', `<div id="jvBoot" class="jvb">
      <div class="jvb-scan"></div>
      <div class="jvb-core"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" class="r1"/><circle cx="100" cy="100" r="78" class="r2"/><circle cx="100" cy="100" r="64" class="r3"/><circle cx="100" cy="100" r="46" class="r4"/><circle cx="100" cy="100" r="22" class="r5"/></svg><b></b></div>
      <div class="jvb-title">KAIRO<small>JARVIS-MODUS</small></div>
      <div class="jvb-log">${lines.map((l, i) => `<p style="animation-delay:${0.35 + i * 0.22}s">› ${l}</p>`).join('')}</div>
      <div class="jvb-bar"><i></i></div></div>`);
    blip('boot');
    setTimeout(() => document.getElementById('jvBoot')?.classList.add('out'), 2300);
    setTimeout(() => document.getElementById('jvBoot')?.remove(), 3000);
  }
  function shutdownSequence(done) {
    document.body.insertAdjacentHTML('beforeend', '<div id="jvOff" class="jvoff"><i></i></div>');
    blip('off');
    setTimeout(done, 420);
    setTimeout(() => document.getElementById('jvOff')?.remove(), 1000);
  }

  // ---------- HUD frame inside the app ----------
  function mountHud() {
    if (document.getElementById('jvApp')) return;
    document.body.insertAdjacentHTML('beforeend', `<div id="jvApp" aria-hidden="true">
      <canvas id="jvBg"></canvas><div class="jva-scan"></div><div class="jva-vig"></div>
      <div class="jva-top"><span class="jva-tag"><i></i> J.A.R.V.I.S. PROTOKOLL AKTIV</span><span id="jvaMsg">BEREIT</span><div class="jva-wave">${'<i></i>'.repeat(24)}</div>
        <span class="jva-stats"><b id="jvaCpu">CPU --</b><b id="jvaRam">RAM --</b><b id="jvaClock">--:--:--</b></span></div>
      <div class="jva-c tl"></div><div class="jva-c tr"></div><div class="jva-c bl"></div><div class="jva-c br"></div>
      <div class="jva-ruler l">${'<i></i>'.repeat(30)}</div><div class="jva-ruler r">${'<i></i>'.repeat(30)}</div>
</div>`);
    const tick = () => { const el = document.getElementById('jvaClock'); if (el) el.textContent = new Date().toLocaleTimeString('de-CH'); };
    tick(); clearInterval(clockTimer); clockTimer = setInterval(tick, 1000);
    const load = async () => { try { const r = await window.kairo.show.jarvis(); if (!r.ok) return; const c = document.getElementById('jvaCpu'), m = document.getElementById('jvaRam'); if (c) c.textContent = 'CPU ' + Math.round(r.data.cpu * 100) + '%'; if (m) m.textContent = 'RAM ' + Math.round(r.data.ram * 100) + '%'; } catch {} };
    load(); clearInterval(hudTimer); hudTimer = setInterval(load, 8000);
    background();
  }
  function unmountHud() { clearInterval(hudTimer); clearInterval(clockTimer); cancelAnimationFrame(bgRaf); document.getElementById('jvApp')?.remove(); }
  // slowly drifting particles connected by thin lines, like a holographic network
  function background() {
    const cv = document.getElementById('jvBg'); if (!cv) return;
    const g = cv.getContext('2d');
    const size = () => { cv.width = innerWidth; cv.height = innerHeight; };
    size(); addEventListener('resize', size);
    const pts = Array.from({ length: 46 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 }));
    const frame = () => {
      if (!document.getElementById('jvBg')) return;
      g.clearRect(0, 0, cv.width, cv.height);
      for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > cv.width) p.vx *= -1; if (p.y < 0 || p.y > cv.height) p.vy *= -1; }
      for (let i = 0; i < pts.length; i++) for (let k = i + 1; k < pts.length; k++) { const a = pts[i], b = pts[k], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 150) { g.strokeStyle = `rgba(92,225,255,${(1 - d / 150) * 0.12})`; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }
      g.fillStyle = 'rgba(92,225,255,.35)'; for (const p of pts) { g.beginPath(); g.arc(p.x, p.y, 1.3, 0, 7); g.fill(); }
      bgRaf = requestAnimationFrame(frame);
    };
    frame();
  }
  const status = t => { const el = document.getElementById('jvaMsg'); if (el) { el.textContent = t; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } };

  // ---------- answers as hologram panels ----------
  const hex = () => '0x' + Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0');
  // the header lives in a data attribute (shown by CSS), because the answer's HTML is rewritten while it streams
  function decorate(el, bulk) {
    if (el.dataset.jvt) return;
    const time = new Date().toLocaleTimeString('de-CH');
    el.dataset.jvt = el.classList.contains('user') ? time : `${hex()} · ${time}`;
    if (bulk) { el.classList.add('jv-done'); return; }
    if (el.classList.contains('user')) { status('ANFRAGE ERHALTEN'); desktopLog('user', el.textContent.trim()); return; }
    if (!el.classList.contains('ai')) return;
    el.classList.add('jv-in');
    if (el.classList.contains('streaming')) { status('ANALYSIERE…'); watchDone(el); } else el.classList.add('jv-done');
  }
  function watchDone(el) {
    const o = new MutationObserver(() => {
      if (el.classList.contains('streaming')) return;
      o.disconnect(); el.classList.add('jv-done'); blip('msg'); status('ANTWORT ÜBERTRAGEN');
      desktopLog('ai', [...el.querySelectorAll('p, li')].map(x => x.textContent).join(' ').trim() || el.textContent.trim());
    });
    o.observe(el, { attributes: true, attributeFilter: ['class'] });
  }
  function watchMessages() {
    const box = document.getElementById('messages'); if (!box || obs) return;
    obs = new MutationObserver(muts => {
      const added = muts.flatMap(m => [...m.addedNodes]).filter(n => n.nodeType === 1 && n.classList.contains('msg'));
      added.forEach(n => decorate(n, added.length > 2)); // many at once = the chat was re-drawn, not a new message
    });
    obs.observe(box, { childList: true });
    box.querySelectorAll('.msg').forEach(n => decorate(n, true));
  }
  // voice mode turns go to the desktop log too
  const origVoice = window.App?.addVoiceTurn;
  if (origVoice) window.App.addVoiceTurn = function (user, ai) { if (document.body.classList.contains('jarvis')) { if (user) desktopLog('user', user); if (ai) desktopLog('ai', ai); } return origVoice.apply(this, arguments); };
  function desktopLog(who, text) { if (!text) return; window.kairo.stage.show({ type: 'jvlog', who, text: text.slice(0, 220) }); }

  // ---------- on / off ----------
  function apply(on, animate) {
    if (on) {
      if (animate) bootSequence();
      setTimeout(() => { document.body.classList.add('jarvis'); mountHud(); watchMessages(); }, animate ? 1300 : 0);
    } else {
      const off = () => { document.body.classList.remove('jarvis'); unmountHud(); obs?.disconnect(); obs = null; };
      animate ? shutdownSequence(off) : off();
    }
  }
  const origSet = J.set;
  J.set = function (v, quiet) {
    const was = J.isOn();
    const r = origSet(v, quiet);
    const now = J.isOn();
    if (now !== was || now !== document.body.classList.contains('jarvis')) { apply(now, true); store.set(now); }
    return r;
  };
  // restore after a restart (theme + desktop HUD, without the greeting)
  window.addEventListener('load', () => setTimeout(() => { if (store.get() && !J.isOn()) { origSet(true, true); apply(true, false); window.Show?.refresh?.(); } }, 1500));
})();
