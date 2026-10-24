// More desktop-layer effects: Jarvis HUD, live subtitles, weather over the whole screen, fireworks.
window.Stage2 = (function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const on = { jarvis: false, weather: false, subtitle: false, fireworks: false };
  window.stageBusy = () => on.jarvis || on.weather || on.subtitle || on.fireworks;
  const layer = (id, html = '') => { let el = document.getElementById(id); if (!el) { document.body.insertAdjacentHTML('beforeend', `<div id="${id}">${html}</div>`); el = document.getElementById(id); } return el; };
  const canvasLayer = id => { const c = layer(id, ''); if (!c.querySelector('canvas')) c.innerHTML = '<canvas></canvas>'; const cv = c.querySelector('canvas'); const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { c, cv, g }; };
  const maybeIdle = () => setTimeout(() => { if (!window.stageBusy() && !document.querySelector('.st-card') && document.getElementById('caption')?.hidden !== false) window.kairo.stage.idle(); }, 800);

  // ================= Jarvis HUD =================
  let jTimer = 0, jClock = 0;
  const ring = (r, w, dash, cls, dur, rev) => `<circle cx="200" cy="200" r="${r}" class="${cls}" stroke-width="${w}" stroke-dasharray="${dash}" style="animation-duration:${dur}s;animation-direction:${rev ? 'reverse' : 'normal'}"/>`;
  function arc(pct, label, val) {
    const p = Math.max(0, Math.min(1, pct || 0));
    return `<div class="jv-gauge"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" class="jg-bg"/><circle cx="50" cy="50" r="40" class="jg-fg" pathLength="100" style="--p:${p * 100}"/></svg><b>${val}</b><small>${label}</small></div>`;
  }
  async function jarvisOn() {
    on.jarvis = true;
    const el = layer('jarvis');
    el.className = 'jv boot';
    el.innerHTML = `
      <div class="jv-scan"></div><div class="jv-grid"></div>
      <div class="jv-boot"><b>KAIRO</b><span>SYSTEMS ONLINE</span><i></i></div>
      <div class="jv-core"><svg viewBox="0 0 400 400">${ring(190, 1, '2 6', 'jr', 60)}${ring(170, 3, '120 40 10 40', 'jr', 24, 1)}${ring(150, 1.5, '4 4', 'jr dim', 40)}${ring(132, 8, '60 30', 'jr thick', 16)}${ring(112, 1, '1 3', 'jr', 10, 1)}</svg>
        <div class="jv-time"><b id="jvTime">--:--</b><small id="jvDate"></small><span id="jvSec"></span></div></div>
      <div class="jv-left" id="jvLeft"></div><div class="jv-right" id="jvRight"></div>
      <div class="jv-ticker"><span>KAIRO NEWS</span><div><p id="jvNews">…</p></div></div>
      <div class="jv-corner tl"></div><div class="jv-corner tr"></div><div class="jv-corner bl"></div><div class="jv-corner br"></div>`;
    setTimeout(() => el.classList.remove('boot'), 2200);
    const tick = () => {
      const n = new Date();
      const t = document.getElementById('jvTime'); if (!t) return;
      t.textContent = n.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
      document.getElementById('jvSec').textContent = String(n.getSeconds()).padStart(2, '0');
      document.getElementById('jvDate').textContent = n.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
    };
    tick(); clearInterval(jClock); jClock = setInterval(tick, 1000);
    const load = async () => {
      const r = await window.kairo.show.jarvis(); if (!r.ok || !on.jarvis) return;
      const d = r.data, up = d.uptime > 86400 ? Math.floor(d.uptime / 86400) + 'd ' + Math.floor(d.uptime % 86400 / 3600) + 'h' : Math.floor(d.uptime / 3600) + 'h ' + Math.floor(d.uptime % 3600 / 60) + 'm';
      document.getElementById('jvLeft').innerHTML = `
        <div class="jv-box"><h4>SYSTEM</h4><div class="jv-gauges">${arc(d.cpu, 'CPU', Math.round(d.cpu * 100) + '%')}${arc(d.ram, 'RAM', Math.round(d.ram * 100) + '%')}${d.disk != null ? arc(d.disk, 'DISK', Math.round(d.disk * 100) + '%') : ''}</div><p>UPTIME <b>${up}</b></p></div>
        ${d.weather ? `<div class="jv-box"><h4>WETTER · ${esc((d.weather.place || '').split(',')[0].toUpperCase())}</h4><div class="jv-wx"><span>${esc(d.weather.icon)}</span><b>${d.weather.temp}°</b><div><small>${esc(d.weather.text)}</small><small>${d.weather.min}° / ${d.weather.max}° · ${d.weather.rain}% REGEN</small></div></div></div>` : ''}`;
      document.getElementById('jvRight').innerHTML = `
        <div class="jv-box"><h4>STATUS</h4><p>BENUTZER <b>${esc((d.name || '').toUpperCase())}</b></p><p>KAIRO <b class="ok">AKTIV</b></p><p>VERBINDUNG <b class="ok">SICHER</b></p></div>
        ${d.next ? `<div class="jv-box"><h4>NÄCHSTE ERINNERUNG</h4><p class="jv-big">${esc(d.next.text)}</p><p>${new Date(d.next.at).toLocaleString('de-CH', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()}</p></div>` : ''}`;
      if (d.news?.length) { const p = document.getElementById('jvNews'); p.textContent = d.news.join('   ◆   '); p.style.animationDuration = Math.max(30, d.news.join('').length / 6) + 's'; }
    };
    await load(); clearInterval(jTimer); jTimer = setInterval(load, 20000);
  }
  function jarvisOff() {
    on.jarvis = false; clearInterval(jTimer); clearInterval(jClock);
    const el = document.getElementById('jarvis'); if (!el) return;
    el.classList.add('off'); setTimeout(() => { el.remove(); maybeIdle(); }, 900);
  }

  // ================= live subtitles =================
  let subTimer = 0;
  function subtitle(p) {
    const el = layer('subs');
    if (p.off) { on.subtitle = false; el.classList.remove('on'); setTimeout(maybeIdle, 600); return; }
    on.subtitle = true;
    if (!p.text) return;
    el.innerHTML = `<p>${esc(p.text)}</p>`;
    el.classList.add('on');
    clearTimeout(subTimer); subTimer = setTimeout(() => el.classList.remove('on'), 9000);
  }

  // ================= weather over the screen =================
  let wRaf = 0, wKind = null;
  function weather(p) {
    cancelAnimationFrame(wRaf);
    if (!p.kind || p.off) { on.weather = false; const l = document.getElementById('wxfx'); if (l) { l.classList.add('off'); setTimeout(() => { l.remove(); maybeIdle(); }, 1200); } return; }
    on.weather = true; wKind = p.kind;
    const { c, g } = canvasLayer('wxfx'); c.className = 'wxfx ' + wKind;
    const W = innerWidth, H = innerHeight, rnd = (a, b) => a + Math.random() * (b - a);
    const heavy = p.intensity || 1;
    const drops = /rain|storm/.test(wKind) ? Array.from({ length: Math.round(170 * heavy) }, () => ({ x: rnd(0, W), y: rnd(0, H), v: rnd(14, 24), l: rnd(14, 28) })) : [];
    const flakes = wKind === 'snow' ? Array.from({ length: 160 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(1.2, 3.6), v: rnd(0.6, 1.8), p: rnd(0, 6) })) : [];
    const motes = /clear|partly/.test(wKind) ? Array.from({ length: 40 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(1, 3), v: rnd(0.1, 0.4), p: rnd(0, 6) })) : [];
    let flash = 0;
    const frame = now => {
      g.clearRect(0, 0, W, H);
      if (wKind === 'fog') { for (let i = 0; i < 4; i++) { const y = H * (0.2 + i * 0.22) + Math.sin(now / 4000 + i) * 30; const gr = g.createLinearGradient(0, y - 120, 0, y + 120); gr.addColorStop(0, 'rgba(220,225,235,0)'); gr.addColorStop(.5, 'rgba(220,225,235,.10)'); gr.addColorStop(1, 'rgba(220,225,235,0)'); g.fillStyle = gr; g.fillRect(0, y - 120, W, 240); } }
      if (motes.length) { const sg = g.createRadialGradient(W * .85, -40, 10, W * .85, -40, H * .7); sg.addColorStop(0, 'rgba(255,220,140,.16)'); sg.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, H);
        for (const m of motes) { m.y -= m.v; m.x += Math.sin(now / 1500 + m.p) * .3; if (m.y < -10) m.y = H + 10; g.globalAlpha = .35 + .3 * Math.sin(now / 700 + m.p); g.fillStyle = '#ffe3a1'; g.beginPath(); g.arc(m.x, m.y, m.r, 0, 7); g.fill(); } g.globalAlpha = 1; }
      if (drops.length) { g.strokeStyle = 'rgba(190,215,255,.38)'; g.lineWidth = 1.2; g.beginPath(); for (const d of drops) { d.y += d.v; d.x -= d.v * .18; if (d.y > H) { d.y = rnd(-40, 0); d.x = rnd(0, W + 100); } g.moveTo(d.x, d.y); g.lineTo(d.x + d.l * .18, d.y - d.l); } g.stroke(); }
      if (flakes.length) { g.fillStyle = 'rgba(255,255,255,.85)'; for (const f of flakes) { f.y += f.v; f.x += Math.sin(now / 1000 + f.p) * .6; if (f.y > H) { f.y = -5; f.x = rnd(0, W); } g.beginPath(); g.arc(f.x, f.y, f.r, 0, 7); g.fill(); } }
      if (wKind === 'storm') { if (Math.random() < .003) flash = 1; if (flash > 0) { g.fillStyle = `rgba(230,235,255,${flash * .35})`; g.fillRect(0, 0, W, H); flash -= .06; } }
      wRaf = requestAnimationFrame(frame);
    };
    wRaf = requestAnimationFrame(frame);
  }

  // ================= fireworks (goal, party) =================
  function fireworks(p) {
    on.fireworks = true;
    const { c, g } = canvasLayer('fwfx'); c.className = 'fwfx';
    const title = layer('fwText'); title.className = 'fw-text'; title.innerHTML = p.text ? `<b>${esc(p.text)}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}` : '';
    requestAnimationFrame(() => title.classList.add('on'));
    const W = innerWidth, H = innerHeight, rockets = [], sparks = [], end = performance.now() + (p.ms || 7000);
    const launch = () => rockets.push({ x: W * (.15 + Math.random() * .7), y: H, vx: (Math.random() - .5) * 2, vy: -(H / 75 + Math.random() * 4), hue: Math.random() * 360, ty: H * (.15 + Math.random() * .35) });
    let next = 0;
    const frame = now => {
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
      if (now < end && now > next) { launch(); if (Math.random() < .5) launch(); next = now + 260 + Math.random() * 300; }
      for (const r of rockets) { r.x += r.vx; r.y += r.vy; r.vy += .12; g.fillStyle = `hsl(${r.hue},100%,75%)`; g.beginPath(); g.arc(r.x, r.y, 2.4, 0, 7); g.fill();
        if (r.vy >= -1 || r.y <= r.ty) { r.dead = true; const n = 70 + Math.random() * 50; for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = Math.random() * 6 + 1; sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, hue: r.hue + Math.random() * 40 }); } } }
      for (let i = rockets.length - 1; i >= 0; i--) if (rockets[i].dead) rockets.splice(i, 1);
      for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vx *= .98; s.vy = s.vy * .98 + .06; s.life -= .012; g.globalAlpha = Math.max(0, s.life); g.fillStyle = `hsl(${s.hue},100%,${55 + s.life * 25}%)`; g.beginPath(); g.arc(s.x, s.y, 1.8, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
      if (now < end || rockets.length || sparks.length) requestAnimationFrame(frame);
      else { c.remove(); title.classList.remove('on'); setTimeout(() => title.remove(), 600); on.fireworks = false; maybeIdle(); }
    };
    requestAnimationFrame(frame);
  }

  function handle(p) {
    if (p.type === 'jarvis') return p.on === false || (p.on == null && on.jarvis) ? jarvisOff() : jarvisOn();
    if (p.type === 'subtitle') return subtitle(p);
    if (p.type === 'weatherfx') return weather(p);
    if (p.type === 'fireworks') return fireworks(p);
  }
  return { handle, isOn: k => on[k] };
})();
