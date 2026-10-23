// Animated weather card: a living sky (sun, clouds, rain, snow, storm, fog, night) behind
// count-up temperature, a drawing 24-hour graph, a spinning wind arrow and day cards.
window.WeatherFX = (function () {
  const kind = (code, isDay) => {
    if ([95, 96, 99].includes(code)) return 'storm';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
    if ([45, 48].includes(code)) return 'fog';
    if (code === 3) return 'cloudy';
    if (code === 2) return isDay ? 'partly' : 'partly-night';
    return isDay ? 'clear' : 'night';
  };
  const SKY = {
    clear: ['#2f80ed', '#56ccf2', '#b8e4ff'], partly: ['#3a7bd5', '#6fa8dc', '#c9e2f5'], cloudy: ['#5b6b7c', '#8796a5', '#b9c3cc'],
    rain: ['#34404e', '#56677a', '#7d8b99'], storm: ['#1b2230', '#2e3a4c', '#465569'], snow: ['#8aa2b8', '#b9cad8', '#e6eef4'],
    fog: ['#8a929a', '#a9b0b6', '#c9cdd1'], night: ['#0b1026', '#1b2350', '#2b3a6b'], 'partly-night': ['#10162e', '#232c55', '#39467a']
  };
  const intensity = code => [65, 67, 82, 75, 86, 99].includes(code) ? 1.8 : [63, 81, 73, 96].includes(code) ? 1.2 : 0.7;

  // ---------- living sky on a canvas ----------
  function sky(canvas, k, code, cloudCover) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, raf = 0, t0 = performance.now(), flash = 0, bolt = null;
    const resize = () => { const r = canvas.getBoundingClientRect(), d = devicePixelRatio || 1; W = r.width; H = r.height; canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    resize();
    const rnd = (a, b) => a + Math.random() * (b - a);
    const nClouds = k === 'clear' || k === 'night' ? 1 : k === 'partly' || k === 'partly-night' ? 4 : Math.round(5 + (cloudCover || 80) / 25);
    const clouds = Array.from({ length: nClouds }, (_, i) => ({ x: rnd(-0.2, 1.1), y: rnd(0.04, k === 'fog' ? 0.9 : 0.3), s: rnd(0.7, 1.4), v: rnd(0.004, 0.012) * (i % 2 ? 1 : 0.6), a: rnd(0.55, 0.95) }));
    const drops = k === 'rain' || k === 'storm' ? Array.from({ length: Math.round(110 * intensity(code)) }, () => ({ x: rnd(0, 1), y: rnd(0, 1), v: rnd(0.9, 1.5), l: rnd(10, 20) })) : [];
    const flakes = k === 'snow' ? Array.from({ length: Math.round(90 * intensity(code)) }, () => ({ x: rnd(0, 1), y: rnd(0, 1), r: rnd(1, 3.2), v: rnd(0.08, 0.2), p: rnd(0, 6) })) : [];
    const stars = k.includes('night') ? Array.from({ length: 90 }, () => ({ x: rnd(0, 1), y: rnd(0, 0.75), r: rnd(0.4, 1.4), p: rnd(0, 6) })) : [];
    const splashes = [];
    const grad = SKY[k] || SKY.clear;

    // one soft path per cloud (no stacked circles), slightly blurred so it looks like vapour
    function cloud(x, y, s, a, dark, night) {
      ctx.save();
      ctx.globalAlpha = a * (night ? 0.38 : dark ? 0.8 : 0.7);
      ctx.filter = `blur(${Math.max(2, 5 * s)}px)`;
      const g = ctx.createLinearGradient(0, y - 50 * s, 0, y + 50 * s);
      const top = night ? '#c6cde0' : dark ? '#a9b2bc' : '#ffffff', bottom = night ? '#5d6684' : dark ? '#6c7784' : '#dfe8f2';
      g.addColorStop(0, top); g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.beginPath();
      for (const [dx, dy, r] of [[-40, 6, 30], [-10, -12, 38], [28, -2, 32], [55, 10, 22], [0, 14, 34], [-62, 16, 18]]) { ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); }
      ctx.fill();
      ctx.restore();
    }

    function frame(now) {
      if (!canvas.isConnected) return cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, grad[0]); bg.addColorStop(0.6, grad[1]); bg.addColorStop(1, grad[2]);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // stars + moon
      for (const s of stars) { ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + s.p)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (k.includes('night')) {
        const mx = W * 0.8, my = H * 0.25, mr = Math.min(W, H) * 0.09;
        const mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.2); mg.addColorStop(0, 'rgba(255,245,210,.35)'); mg.addColorStop(1, 'rgba(255,245,210,0)');
        ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff6da'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = grad[1]; ctx.beginPath(); ctx.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.9, 0, Math.PI * 2); ctx.fill();
      }

      // sun with turning rays and a soft lens flare
      if (k === 'clear' || k === 'partly') {
        const sx = W * 0.78, sy = H * 0.26, sr = Math.min(W, H) * 0.1;
        const sg = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 4); sg.addColorStop(0, 'rgba(255,236,150,.75)'); sg.addColorStop(1, 'rgba(255,236,150,0)');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.25);
        for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = 'rgba(255,240,170,.35)'; ctx.beginPath(); ctx.moveTo(sr * 1.25, -4); ctx.lineTo(sr * (2 + 0.25 * Math.sin(t * 2 + i)), 0); ctx.lineTo(sr * 1.25, 4); ctx.fill(); }
        ctx.restore();
        const core = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, 2, sx, sy, sr); core.addColorStop(0, '#fffbe6'); core.addColorStop(1, '#ffc93c');
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(sx, sy, sr * (1 + 0.03 * Math.sin(t * 2)), 0, Math.PI * 2); ctx.fill();
        for (const [f, r, a] of [[0.35, 0.25, 0.25], [0.6, 0.12, 0.2], [0.85, 0.4, 0.1]]) { ctx.globalAlpha = a; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(sx + (W * 0.2 - sx) * f, sy + (H * 0.8 - sy) * f, sr * r, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }

      // drifting clouds
      const dark = k === 'rain' || k === 'storm';
      for (const c of clouds) { c.x += c.v / 60; if (c.x > 1.3) c.x = -0.3; cloud(c.x * W, c.y * H + Math.sin(t * 0.5 + c.s) * 3, c.s * Math.min(W, 600) / 420, c.a, dark, k.includes('night')); }

      // fog bands
      if (k === 'fog') for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.18; ctx.fillStyle = '#eef1f3'; ctx.fillRect(((t * (8 + i * 4)) % (W + 400)) - 400, H * (0.25 + i * 0.14), W * 0.9, 26 + i * 6); ctx.globalAlpha = 1; }

      // rain + splashes
      if (drops.length) {
        ctx.strokeStyle = 'rgba(210,225,240,.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
        for (const d of drops) {
          d.y += d.v * 0.016 * 1.6; d.x -= 0.0012;
          if (d.y > 1) { if (Math.random() < 0.3) splashes.push({ x: d.x * W, y: H - rnd(2, 18), r: 1, a: 0.6 }); d.y = rnd(-0.2, 0); d.x = rnd(0, 1.1); }
          ctx.moveTo(d.x * W, d.y * H); ctx.lineTo(d.x * W - 2, d.y * H + d.l);
        }
        ctx.stroke();
        for (let i = splashes.length - 1; i >= 0; i--) { const s = splashes[i]; s.r += 0.6; s.a -= 0.03; if (s.a <= 0) { splashes.splice(i, 1); continue; } ctx.globalAlpha = s.a; ctx.strokeStyle = '#dbe7f2'; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 2, s.r * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }

      // snow
      for (const f of flakes) {
        f.y += f.v * 0.016 * 0.6; f.x += Math.sin(t + f.p) * 0.0006;
        if (f.y > 1.02) { f.y = -0.02; f.x = rnd(0, 1); }
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.r, 0, Math.PI * 2); ctx.fill();
      }

      // lightning
      if (k === 'storm') {
        if (!bolt && Math.random() < 0.006) { let x = rnd(0.2, 0.8) * W, y = 0; bolt = [[x, y]]; while (y < H * 0.75) { x += rnd(-25, 25); y += rnd(15, 35); bolt.push([x, y]); } flash = 1; }
        if (flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`; ctx.fillRect(0, 0, W, H);
          if (bolt) { ctx.strokeStyle = `rgba(255,255,230,${flash})`; ctx.lineWidth = 2.5; ctx.shadowColor = '#fff'; ctx.shadowBlur = 18; ctx.beginPath(); bolt.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.shadowBlur = 0; }
          flash -= 0.045; if (flash <= 0) bolt = null;
        }
      }
    }
    new ResizeObserver(resize).observe(canvas);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  // ---------- helpers ----------
  const countUp = (el, to, ms = 1100) => {
    const t0 = performance.now(), from = to - Math.max(6, Math.abs(to) * 0.6);
    const step = now => { const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const DIRS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  const dirName = d => DIRS[Math.round(((d % 360) + 360) % 360 / 45) % 8];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MINI = { clear: 'm-sun', night: 'm-moon', partly: 'm-cloud', 'partly-night': 'm-cloud', cloudy: 'm-cloud', rain: 'm-rain', storm: 'm-storm', snow: 'm-snow', fog: 'm-cloud' };

  function graph(hours) {
    if (!hours?.length) return '';
    const W = 560, H = 120, pad = 16;
    const temps = hours.map(h => h.temp), min = Math.min(...temps) - 1, max = Math.max(...temps) + 1;
    const x = i => pad + i / (hours.length - 1) * (W - 2 * pad), y = v => H - 26 - (v - min) / (max - min || 1) * (H - 50);
    const pts = hours.map((h, i) => [x(i), y(h.temp)]);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; }
    const area = d + ` L${pts[pts.length - 1][0]},${H - 20} L${pts[0][0]},${H - 20} Z`;
    const bars = hours.map((h, i) => h.rain > 5 ? `<rect class="wfx-bar" x="${x(i) - 4}" y="${H - 20 - h.rain * 0.22}" width="8" height="${h.rain * 0.22}" rx="2" style="animation-delay:${0.8 + i * 0.03}s"/>` : '').join('');
    const labels = hours.map((h, i) => i % 3 === 0 ? `<text x="${x(i)}" y="${H - 4}" class="wfx-t">${h.time}</text><text x="${x(i)}" y="${y(h.temp) - 9}" class="wfx-v" style="animation-delay:${0.6 + i * 0.04}s">${h.temp}°</text><circle cx="${x(i)}" cy="${y(h.temp)}" r="3.2" class="wfx-dot" style="animation-delay:${0.6 + i * 0.04}s"/>` : '').join('');
    return `<svg class="wfx-graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="wfxArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      ${bars}<path d="${area}" class="wfx-area"/><path d="${d}" class="wfx-line" pathLength="1"/>${labels}</svg>`;
  }

  // ---------- the card ----------
  // data = result of window.kairo.weatherAt / weather; opts.compact for small panels
  function card(container, data, opts = {}) {
    const k = kind(data.now.code, data.now.isDay);
    const local = data.utcOffset != null ? new Date(Date.now() + (data.utcOffset * 1000) + new Date().getTimezoneOffset() * 60000) : new Date();
    const lang = window.APP_LANG === 'de' ? 'de-CH' : window.APP_LANG || 'en';
    const name = (data.place || '').split(',')[0], country = (data.place || '').split(',').slice(1).join(',').trim().split('/')[0];
    const el = document.createElement('div');
    el.className = `wfx wfx-${k} ${opts.compact ? 'compact' : ''}`;
    el.innerHTML = `
      <canvas class="wfx-sky"></canvas>
      <div class="wfx-shade"></div>
      <div class="wfx-body">
        <div class="wfx-head">
          <div><div class="wfx-place">${[...esc(name)].map((c, i) => `<span style="animation-delay:${i * 35}ms">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
            <div class="wfx-sub">${esc(country)}${country ? ' · ' : ''}${local.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })} · ${local.toLocaleDateString(lang, { weekday: 'long' })}</div></div>
          <div class="wfx-icon ${MINI[k]}"><i></i><i></i><i></i></div>
        </div>
        <div class="wfx-main">
          <div class="wfx-temp"><b class="wfx-num">0</b><span>°</span></div>
          <div class="wfx-cond"><b>${esc(t('wx.' + k))}</b><small>${t('today.feels')} ${data.now.feels}° · ${data.days[0].min}° / ${data.days[0].max}°</small></div>
        </div>
        <div class="wfx-stats">
          <div class="wfx-stat"><div class="wfx-wind" style="--dir:${(data.now.windDir || 0) + 180}deg">➤</div><span>${data.now.wind} km/h ${dirName(data.now.windDir || 0)}</span></div>
          <div class="wfx-stat"><svg class="wfx-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15"/><circle cx="18" cy="18" r="15" class="fill" style="--p:${data.now.humidity}"/></svg><span>${data.now.humidity}% ${t('wx.hum')}</span></div>
          ${data.days[0].uv != null ? `<div class="wfx-stat"><b class="wfx-uv">${Math.round(data.days[0].uv)}</b><span>UV</span></div>` : ''}
          <div class="wfx-stat"><b>🌅</b><span>${data.days[0].sunrise || '–'} · ${data.days[0].sunset || '–'}</span></div>
        </div>
        ${opts.compact ? '' : graph(data.hours)}
        <div class="wfx-days">${data.days.slice(0, opts.compact ? 3 : 5).map((d, i) => {
          const dk = kind(d.code, true);
          const lo = Math.min(...data.days.map(x => x.min)), hi = Math.max(...data.days.map(x => x.max));
          return `<div class="wfx-day" style="animation-delay:${0.9 + i * 0.09}s"><small>${i ? new Date(d.date + 'T12:00').toLocaleDateString(lang, { weekday: 'short' }) : t('today.today')}</small>
            <div class="wfx-icon sm ${MINI[dk]}"><i></i><i></i><i></i></div><b>${d.max}°</b><em>${d.min}°</em>
            <div class="wfx-range"><i style="left:${(d.min - lo) / (hi - lo || 1) * 100}%;right:${100 - (d.max - lo) / (hi - lo || 1) * 100}%"></i></div>${d.rain > 20 ? `<small class="wfx-rain">💧${d.rain}%</small>` : ''}</div>`;
        }).join('')}</div>
      </div>`;
    container.appendChild(el);
    const stop = sky(el.querySelector('.wfx-sky'), k, data.now.code, data.now.clouds);
    countUp(el.querySelector('.wfx-num'), data.now.temp);
    return { el, stop };
  }

  // overlay for voice mode / anywhere: a big card that flies in
  function show(data) {
    document.querySelector('.wfx-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'wfx-pop';
    pop.innerHTML = '<button class="wfx-close">✕</button>';
    document.body.appendChild(pop);
    card(pop, data);
    const close = () => { pop.classList.add('out'); setTimeout(() => pop.remove(), 400); };
    pop.querySelector('.wfx-close').onclick = close;
    setTimeout(close, 20000);
    return close;
  }

  return { card, show, kind };
})();
