// Country profiles, live webcams, world clock and "sky tonight" (ISS sightings + moon).
const esc2 = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lang2 = () => (window.APP_LANG || 'de').slice(0, 2);
const loc2 = () => (lang2() === 'de' ? 'de-CH' : lang2() === 'sq' ? 'sq-AL' : 'en-GB');
const fmtNum = (n, d = 0) => (n == null ? '–' : Number(n).toLocaleString(loc2(), { maximumFractionDigits: d }));
const fmtBig = n => n == null ? '–' : n >= 1e9 ? fmtNum(n / 1e9, 2) + ' Mrd.' : n >= 1e6 ? fmtNum(n / 1e6, 1) + ' Mio.' : fmtNum(n);
function countUp(el, to, fmt, ms = 1400) {
  const t0 = performance.now();
  const step = now => { const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 4); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// ================= country profile =================
window.Country = (function () {
  let geo = null, clockTimer = 0;
  const langName = code => { try { return new Intl.DisplayNames([lang2()], { type: 'language' }).of(code) || code; } catch { return code; } };
  const curName = c => { try { return new Intl.DisplayNames([lang2()], { type: 'currency' }).of(c.code) || c.name; } catch { return c.name; } };

  async function highlight(cca3) {
    const g = Earth.globe();
    geo ||= (await window.kairo.earth2.borders()).geo;
    const f = geo?.features?.find(x => [x.properties.ISO_A3, x.properties.ADM0_A3, x.properties.ISO_A3_EH].includes(cca3));
    if (!f) { g.polygonsData([]); return; }
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a45';
    g.polygonCapColor(() => accent + '55').polygonSideColor(() => accent + '33').polygonStrokeColor(() => accent)
      .polygonsTransitionDuration(1600).polygonAltitude(0.001).polygonsData([f]);
    // the country rises out of the globe
    setTimeout(() => g.polygonAltitude(0.035), 60);
  }

  async function show(q) {
    window.App.go('earth'); Earth.init();
    const box = card();
    box.className = 'cty-card loading on';
    box.innerHTML = `<div class="cty-skel"><i></i><i></i><i></i></div>`;
    const r = await window.kairo.earth2.country(q);
    if (!r.ok) { box.classList.remove('on'); window.toast('✕ ' + r.error.message); return null; }
    const c = r.country;
    Earth.flyTo(c.latlng[0], c.latlng[1], c.area > 3e6 ? 1.4 : c.area > 5e5 ? 0.85 : c.area > 5e4 ? 0.5 : 0.28, c.name, c.region);
    highlight(c.cca3);
    box.className = 'cty-card on';
    box.innerHTML = `
      <button class="cty-x" title="✕">${ic('x')}</button>
      <div class="cty-hero" style="--img:url('${esc2(c.flag)}')">
        <div class="cty-flag"><img src="${esc2(c.flag)}" alt=""><i class="cty-shine"></i></div>
        <div class="cty-names"><small>${esc2(c.region)}</small><h2>${[...c.name].map((ch, i) => `<span style="animation-delay:${200 + i * 40}ms">${ch === ' ' ? '&nbsp;' : esc2(ch)}</span>`).join('')}</h2><p>${esc2(c.official)}</p></div>
      </div>
      <div class="cty-stats">
        <div><small>${ic('users')}${t('cty.pop')}</small><b data-count="${c.population || 0}">–</b></div>
        <div><small>${ic('map')}${t('cty.area')}</small><b data-count="${c.area || 0}" data-unit=" km²">–</b></div>
        <div><small>${ic('building-2')}${t('cty.capital')}</small><b>${esc2(c.capital || '–')}</b></div>
        <div><small>${ic('clock')}${t('cty.time')}</small><b class="cty-clock">–</b></div>
        <div><small>${ic('wallet')}${t('cty.currency')}</small><b>${esc2(c.currencies.map(x => `${curName(x)}${x.symbol ? ' (' + x.symbol + ')' : ''}`).join(', ') || '–')}</b></div>
        <div><small>${ic('speech')}${t('cty.lang')}</small><b>${esc2(c.languages.map(l => langName(l.code) || l.name).slice(0, 3).join(', ') || '–')}</b></div>
        ${c.gdpPc ? `<div><small>${ic('chart-column')}${t('cty.gdp')}</small><b>${fmtNum(c.gdpPc)} $</b></div>` : ''}
        ${c.phone ? `<div><small>${ic('smartphone')}${t('cty.phone')}</small><b>${esc2(c.phone)} · ${esc2(c.tld)}</b></div>` : ''}
      </div>
      ${c.summary ? `<p class="cty-sum">${esc2(c.summary)}</p>` : ''}
      ${c.neighbours.length ? `<div class="cty-nb"><small>${t('cty.neighbours')}</small><div>${c.neighbours.map((n, i) => `<button data-cty="${esc2(n.cca3)}" style="animation-delay:${600 + i * 50}ms"><img src="https://flagcdn.com/w40/${n.cca2.toLowerCase()}.png" alt="">${esc2(n.name)}</button>`).join('')}</div></div>` : ''}
      <div class="cty-actions"><button class="btn" data-act="cam">${ic('cctv')} ${t('cam.live')}</button><button class="btn" data-act="ask">${ic('sparkles')} ${t('cty.ask')}</button></div>`;
    box.querySelectorAll('[data-count]').forEach(b => { const v = +b.dataset.count; if (v) countUp(b, v, x => (v > 1e6 ? fmtBig(x) : fmtNum(x)) + (b.dataset.unit || '')); });
    clearInterval(clockTimer);
    const tick = () => { const el = box.querySelector('.cty-clock'); if (!el) return clearInterval(clockTimer); try { el.textContent = c.timezone ? new Date().toLocaleTimeString(loc2(), { timeZone: c.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '–'; } catch { el.textContent = '–'; } };
    tick(); clockTimer = setInterval(tick, 1000);
    box.querySelector('.cty-x').onclick = hide;
    box.querySelectorAll('[data-cty]').forEach(b => b.onclick = () => show(b.dataset.cty));
    box.querySelector('[data-act=cam]').onclick = () => Webcam.open(c.capital ? `${c.capital} ${c.name}` : c.name);
    box.querySelector('[data-act=ask]').onclick = () => window.App.askInChat(t('cty.askText', { name: c.name }));
    return c;
  }
  function card() {
    let el = document.getElementById('ctyCard');
    if (!el) { document.getElementById('view-earth').insertAdjacentHTML('beforeend', '<div class="cty-card" id="ctyCard"></div>'); el = document.getElementById('ctyCard'); }
    return el;
  }
  function hide() { card().classList.remove('on'); clearInterval(clockTimer); try { Earth.globe().polygonAltitude(0.001); setTimeout(() => Earth.globe().polygonsData([]), 900); } catch {} }
  return { show, hide };
})();

// ================= live webcams =================
window.Webcam = (function () {
  async function open(place) {
    let m = document.getElementById('camModal');
    if (!m) { document.body.insertAdjacentHTML('beforeend', '<div class="cam-modal" id="camModal"></div>'); m = document.getElementById('camModal'); }
    m.innerHTML = `<div class="cam-box"><div class="cam-screen"><div class="cam-static"></div><div class="cam-msg">${ic('cctv')}<span>${t('cam.searching', { place: esc2(place) })}</span></div></div></div>`;
    m.classList.add('on');
    m.onclick = e => { if (e.target === m) close(); };
    const r = await window.kairo.earth2.webcams(place);
    if (!r.ok || !r.list.length) { m.querySelector('.cam-msg span').textContent = t('cam.none'); setTimeout(close, 3500); return null; }
    const play = cam => {
      const scr = m.querySelector('.cam-screen');
      scr.classList.remove('tv-on'); void scr.offsetWidth; scr.classList.add('tv-on');
      scr.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${cam.id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe><div class="cam-live"><i></i>LIVE</div>`;
      m.querySelector('.cam-title b').textContent = cam.title;
      m.querySelector('.cam-title small').textContent = cam.channel + (cam.viewers ? ' · ' + cam.viewers : '');
      m.querySelectorAll('.cam-list button').forEach(b => b.classList.toggle('on', b.dataset.id === cam.id));
    };
    m.querySelector('.cam-box').innerHTML = `
      <div class="cam-top"><div class="cam-title"><b></b><small></small></div><button class="cam-x">${ic('x')}</button></div>
      <div class="cam-main"><div class="cam-screen"></div>
        <div class="cam-list">${r.list.map((c, i) => `<button data-id="${c.id}" style="animation-delay:${i * 60}ms"><img src="https://i.ytimg.com/vi/${c.id}/mqdefault.jpg" alt=""><span>${esc2(c.title)}</span></button>`).join('')}</div></div>`;
    m.querySelector('.cam-x').onclick = close;
    m.querySelectorAll('.cam-list button').forEach(b => b.onclick = () => play(r.list.find(c => c.id === b.dataset.id)));
    play(r.list[0]);
    return r.list[0];
  }
  function close() { const m = document.getElementById('camModal'); if (!m) return; m.classList.remove('on'); setTimeout(() => { if (!m.classList.contains('on')) m.innerHTML = ''; }, 400); }
  return { open, close };
})();

// ================= world clock (Today card + Earth labels) =================
window.WorldClock = (function () {
  let raf = 0;
  const cities = () => window.App.settings().worldClock || [];
  function clockSvg() {
    const ticks = Array.from({ length: 12 }, (_, i) => `<line x1="50" y1="${i % 3 ? 9 : 7}" x2="50" y2="${i % 3 ? 13 : 15}" transform="rotate(${i * 30} 50 50)"/>`).join('');
    return `<svg viewBox="0 0 100 100" class="wc-svg"><circle cx="50" cy="50" r="46" class="wc-face"/><g class="wc-ticks">${ticks}</g>
      <line class="wc-h" x1="50" y1="50" x2="50" y2="28"/><line class="wc-m" x1="50" y1="50" x2="50" y2="17"/><line class="wc-s" x1="50" y1="58" x2="50" y2="12"/><circle cx="50" cy="50" r="3.2" class="wc-dot"/></svg>`;
  }
  function parts(tz) {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(new Date());
    const g = k => +f.find(p => p.type === k).value;
    return { h: g('hour') % 24, m: g('minute'), s: g('second') };
  }
  function offset(tz) {
    const now = new Date(), a = new Date(now.toLocaleString('en-US', { timeZone: tz })), b = new Date(now.toLocaleString('en-US'));
    const h = Math.round((a - b) / 36e5 * 2) / 2;
    return h === 0 ? t('wc.same') : (h > 0 ? '+' : '') + h + ' h';
  }
  function render(el) {
    const list = cities();
    el.innerHTML = `<div class="wc-grid">${list.map((c, i) => `<div class="wc-item" data-i="${i}" style="animation-delay:${i * 80}ms"><div class="wc-clock">${clockSvg()}</div>
      <b>${esc2(c.name)}</b><small class="wc-dig"></small><small class="wc-off">${offset(c.tz)}</small><button class="wc-del" data-del="${i}">${ic('x')}</button></div>`).join('')}</div>
      <form class="wc-add"><input class="field" placeholder="${t('wc.add')}"><button class="btn">+</button></form>`;
    el.querySelector('.wc-add').onsubmit = async e => {
      e.preventDefault();
      const inp = el.querySelector('.wc-add input'), q = inp.value.trim(); if (!q) return;
      const r = await window.kairo.earth2.city(q);
      if (!r.ok) return window.toast('✕ ' + r.error.message);
      await window.App.saveSettings({ worldClock: [...cities(), r.city].slice(-6) });
      render(el);
    };
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const l = cities().slice(); l.splice(+b.dataset.del, 1); await window.App.saveSettings({ worldClock: l }); render(el); });
    cancelAnimationFrame(raf);
    const loop = () => {
      if (!el.isConnected) return;
      const ms = new Date().getMilliseconds();
      el.querySelectorAll('.wc-item').forEach(it => {
        const c = list[+it.dataset.i]; if (!c) return;
        let p; try { p = parts(c.tz); } catch { return; }
        const s = p.s + ms / 1000;
        it.querySelector('.wc-s').setAttribute('transform', `rotate(${s * 6} 50 50)`);
        it.querySelector('.wc-m').setAttribute('transform', `rotate(${(p.m + s / 60) * 6} 50 50)`);
        it.querySelector('.wc-h').setAttribute('transform', `rotate(${((p.h % 12) + p.m / 60) * 30} 50 50)`);
        it.querySelector('.wc-dig').textContent = String(p.h).padStart(2, '0') + ':' + String(p.m).padStart(2, '0');
        it.classList.toggle('night', p.h < 6 || p.h >= 20);
      });
      raf = requestAnimationFrame(loop);
    };
    loop();
  }
  // labels on the globe
  let layerTimer = 0;
  function layer(on) {
    clearInterval(layerTimer);
    if (!on) { Earth.setLayer('clock', { html: [] }); return; }
    const items = cities().map(c => {
      const el = document.createElement('div'); el.className = 'gl-clock';
      return { lat: c.lat, lng: c.lng, alt: 0.01, el, c };
    });
    const upd = () => items.forEach(d => { let p; try { p = parts(d.c.tz); } catch { return; } const night = p.h < 6 || p.h >= 20; d.el.innerHTML = `${ic(night ? 'moon' : 'sun')}<b>${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}</b><span>${esc2(d.c.name)}</span>`; d.el.classList.toggle('night', night); });
    upd(); layerTimer = setInterval(upd, 15000);
    Earth.setLayer('clock', { html: items });
  }
  return { render, layer };
})();

// ================= sky tonight: ISS sightings + moon =================
window.Sky = (function () {
  let data = null;
  function dome(p) {
    // azimuth/elevation -> point on a half-dome seen from above (N top)
    const pt = ([az, el]) => { const r = 44 * (1 - el / 90), a = (az - 90) * Math.PI / 180; return [50 + r * Math.cos(a), 50 + r * Math.sin(a)]; };
    const pts = p.path.map(pt);
    const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    return `<svg viewBox="0 0 100 100" class="sky-dome"><circle cx="50" cy="50" r="44" class="sd-h"/><circle cx="50" cy="50" r="29.3" class="sd-r"/><circle cx="50" cy="50" r="14.7" class="sd-r"/>
      <text x="50" y="4.5">N</text><text x="97" y="52">O</text><text x="50" y="99">S</text><text x="1" y="52">W</text>
      <path d="${d}" class="sd-path" pathLength="100"/><circle r="2.6" class="sd-iss"><animateMotion dur="5s" repeatCount="indefinite" path="${d}"/></circle></svg>`;
  }
  function moonSvg(m) {
    // lit part of the moon
    const ph = m.phase, k = Math.cos(ph * 2 * Math.PI), waxing = ph < 0.5;
    const rx = Math.abs(k) * 20;
    const d = waxing
      ? `M25 5 A20 20 0 0 1 25 45 A${rx} 20 0 0 ${k > 0 ? 0 : 1} 25 5`
      : `M25 5 A20 20 0 0 0 25 45 A${rx} 20 0 0 ${k > 0 ? 1 : 0} 25 5`;
    return `<svg viewBox="0 0 50 50" class="moon-svg"><circle cx="25" cy="25" r="20" class="mo-dark"/><path d="${d}" class="mo-lit"/></svg>`;
  }
  async function render(el) {
    el.innerHTML = `<div class="muted small">${t('earth.loading')}</div>`;
    const r = await window.kairo.earth2.iss();
    if (!r.ok) { el.innerHTML = `<div class="muted small">${r.error.message === 'NO_CITY' ? t('sky.noCity') : '✕ ' + esc2(r.error.message)}</div>`; return; }
    data = r;
    const vis = r.passes.filter(p => p.visible);
    const next = vis[0];
    const when = ms => new Date(ms).toLocaleString(loc2(), { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    el.innerHTML = next ? `
      <div class="sky-next">${dome(next)}
        <div class="sky-info"><small>${t('sky.next')}</small><b>${when(next.start)}</b>
          <span>${t('sky.from')} <b>${next.from}</b> ${t('sky.to')} <b>${next.to}</b> · ${next.minutes} min · ${t('sky.max')} ${next.maxEl}°</span>
          <span class="sky-bright">${'★'.repeat(next.bright)}${'☆'.repeat(3 - next.bright)} ${t('sky.bright' + next.bright)}</span>
          <span class="sky-cd" data-at="${next.start}"></span>
          <button class="btn" id="skyRemind">${ic('bell')} ${t('sky.remind')}</button></div></div>
      <div class="sky-more">${vis.slice(1, 4).map(p => `<span>${when(p.start)} · ${p.maxEl}° · ${p.from}→${p.to}</span>`).join('')}</div>`
      : `<div class="muted small">${t('sky.none')}</div>`;
    el.insertAdjacentHTML('beforeend', `<div class="sky-moon">${moonSvg(r.moon)}<div><b>${t('sky.moon')}</b><small>${esc2(r.moon.name)} · ${r.moon.illum}%</small></div></div>`);
    const cd = el.querySelector('.sky-cd');
    if (cd) { const tick = () => { if (!cd.isConnected) return; const s = Math.max(0, (+cd.dataset.at - Date.now()) / 1000); cd.textContent = t('sky.in') + ' ' + (s > 86400 ? Math.floor(s / 86400) + ' d ' : '') + String(Math.floor(s % 86400 / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0'); setTimeout(tick, 1000); }; tick(); }
    const rb = el.querySelector('#skyRemind');
    if (rb) rb.onclick = async () => {
      const at = new Date(next.start - 10 * 60000);
      const res = await window.kairo.reminders.add({ at: at.toISOString(), text: `${t('sky.remindText')} ${t('sky.from')} ${next.from} (${next.maxEl}°)` });
      window.toast(res?.ok === false ? '✕' : t('sky.remindOk'));
    };
  }
  return { render, data: () => data };
})();
