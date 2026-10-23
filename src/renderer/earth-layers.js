// Live layers on the Earth: rain radar (animated), day/night with city lights, planes, ISS, earthquakes.
window.EarthLayers = (function () {
  const $ = id => document.getElementById(id);
  const on = {};
  const visible = () => document.getElementById('view-earth')?.classList.contains('active');
  const fmtTime = ms => new Date(ms).toLocaleTimeString(window.APP_LANG || 'de', { hour: '2-digit', minute: '2-digit' });
  const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- transparent sphere layers above the globe (borrowing three.js classes from the globe itself) ----------
  function findGlobeMesh() {
    const g = Earth.globe(), R = g.getGlobeRadius();
    let mesh = null;
    g.scene().traverse(o => { if (!mesh && o.geometry?.type === 'SphereGeometry' && Math.abs((o.geometry.parameters?.radius || 0) - R) < 0.01 && o.material?.map) mesh = o; });
    return mesh;
  }
  async function makeSphere(canvas, lift) {
    let base = null;
    for (let i = 0; i < 60 && !(base = findGlobeMesh()); i++) await new Promise(r => setTimeout(r, 250));
    if (!base) throw new Error('globe not ready');
    const tex = base.material.map.clone();
    tex.image = canvas; tex.needsUpdate = true;
    const mat = new base.material.constructor({ transparent: true, depthWrite: false });
    mat.map = tex; mat.emissiveMap = tex;
    mat.color.set(0x000000); mat.emissive.set(0xffffff);
    const R = Earth.globe().getGlobeRadius();
    const mesh = new base.constructor(new base.geometry.constructor(R * (1 + lift), 128, 64), mat);
    mesh.rotation.copy(base.rotation);
    mesh.renderOrder = 2;
    base.parent.add(mesh);
    return { mesh, tex, update() { tex.needsUpdate = true; }, remove() { base.parent.remove(mesh); mesh.geometry.dispose(); mat.dispose(); tex.dispose(); } };
  }
  // hide sphere layers when the camera is very close to the ground (they would sit in front of the camera)
  function watchAltitude(layer, min) {
    const tick = () => { if (!layer.alive) return; layer.sphere && (layer.sphere.mesh.visible = Earth.globe().pointOfView().altitude > min); requestAnimationFrame(tick); };
    tick();
  }

  // ---------- rain radar (RainViewer, last 2 hours, animated) ----------
  const radar = { alive: false };
  async function radarOn() {
    Object.assign(radar, { alive: true, frames: [], idx: 0 });
    status('rain', '🌧 ' + t('lay.loading'));
    const idx = await (await fetch('https://api.rainviewer.com/public/weather-maps.json')).json();
    const past = idx.radar.past.filter((_, i, a) => (a.length - 1 - i) % 2 === 0); // every 20 min
    const Z = 3, N = 1 << Z, W = 256 * N;
    const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
    radar.canvas = canvas;
    radar.sphere = await makeSphere(canvas, 0.0006);
    watchAltitude(radar, 0.004);
    const loadTile = src => new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    for (const f of past) {
      if (!radar.alive) return;
      // mercator tiles -> one mercator image -> equirectangular rows
      const merc = document.createElement('canvas'); merc.width = W; merc.height = W;
      const mc = merc.getContext('2d');
      const jobs = [];
      for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) jobs.push(loadTile(`${idx.host}${f.path}/256/${Z}/${x}/${y}/4/1_1.png`).then(im => im && mc.drawImage(im, x * 256, y * 256)));
      await Promise.all(jobs);
      const eq = document.createElement('canvas'); eq.width = 2048; eq.height = 1024;
      const ec = eq.getContext('2d');
      for (let y = 0; y < 1024; y++) {
        const lat = 90 - (y + 0.5) * 180 / 1024;
        if (Math.abs(lat) > 85) continue;
        const r = lat * Math.PI / 180, my = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * W;
        ec.drawImage(merc, 0, Math.floor(my), W, 1, 0, y, 2048, 1);
      }
      radar.frames.push({ img: eq, time: f.time * 1000 });
      if (radar.frames.length === 1) showRadarFrame(0);
    }
    clearInterval(radar.timer);
    radar.timer = setInterval(() => { if (radar.frames.length) showRadarFrame((radar.idx + 1) % radar.frames.length); }, 700);
  }
  function showRadarFrame(i) {
    radar.idx = i;
    const f = radar.frames[i], c = radar.canvas.getContext('2d');
    c.clearRect(0, 0, 2048, 1024); c.drawImage(f.img, 0, 0);
    radar.sphere.update();
    const last = i === radar.frames.length - 1;
    status('rain', `🌧 ${t('lay.rain')} · <b>${fmtTime(f.time)}</b>${last ? ' · ' + t('lay.now') : ''}<span class="lay-bar">${radar.frames.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</span>`);
  }
  function radarOff() { radar.alive = false; clearInterval(radar.timer); radar.sphere?.remove(); radar.sphere = null; status('rain', null); }

  // ---------- day / night with city lights ----------
  const night = { alive: false };
  function sunPos(d = new Date()) {
    // subsolar point (good to ~0.5°)
    const day = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5;
    const g = 2 * Math.PI / 365 * (day - 1 + (d.getUTCHours() - 12) / 24);
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const mins = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    return { lat: decl * 180 / Math.PI, lng: -((mins + eqt) / 4 - 180) };
  }
  async function nightOn() {
    night.alive = true;
    const W = 1024, H = 512;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    night.canvas = canvas;
    night.lights = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'assets/earth/earth-night.jpg'; });
    night.sphere = await makeSphere(canvas, 0.0003);
    watchAltitude(night, 0.01);
    const draw = () => {
      const s = sunPos(), sl = s.lat * Math.PI / 180, sg = s.lng * Math.PI / 180;
      const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
      const mctx = mask.getContext('2d'), img = mctx.createImageData(W, H);
      for (let y = 0; y < H; y++) {
        const lat = (90 - (y + 0.5) * 180 / H) * Math.PI / 180, sinL = Math.sin(lat), cosL = Math.cos(lat);
        for (let x = 0; x < W; x++) {
          const lng = ((x + 0.5) * 360 / W - 180) * Math.PI / 180;
          const cosZ = sinL * Math.sin(sl) + cosL * Math.cos(sl) * Math.cos(lng - sg); // sun height
          const a = Math.min(1, Math.max(0, (-cosZ + 0.05) / 0.17)); // soft twilight band
          img.data[(y * W + x) * 4 + 3] = a * 255;
        }
      }
      mctx.putImageData(img, 0, 0);
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(2,6,20,.62)'; c.fillRect(0, 0, W, H);
      if (night.lights) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.95; c.drawImage(night.lights, 0, 0, W, H); c.globalAlpha = 1; }
      c.globalCompositeOperation = 'destination-in'; c.drawImage(mask, 0, 0);
      c.globalCompositeOperation = 'source-over';
      night.sphere.update();
      status('night', `🌗 ${t('lay.night')} · ☀ ${Math.abs(s.lat).toFixed(1)}°${s.lat >= 0 ? 'N' : 'S'} ${Math.abs(s.lng).toFixed(1)}°${s.lng >= 0 ? 'E' : 'W'}`);
    };
    draw();
    night.timer = setInterval(draw, 60000);
  }
  function nightOff() { night.alive = false; clearInterval(night.timer); night.sphere?.remove(); night.sphere = null; status('night', null); }

  // ---------- planes ----------
  const planes = { alive: false, list: [], byId: new Map() };
  const PLANE_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2c.8 0 1.3.9 1.3 2v5.2l7.7 4.4v2l-7.7-2.3v4.4l2.2 1.7v1.6L12 20l-3.5 1v-1.6l2.2-1.7v-4.4L3 15.6v-2l7.7-4.4V4c0-1.1.5-2 1.3-2z"/></svg>';
  function planeEl(p) {
    const e = document.createElement('div');
    e.className = 'gl-plane';
    e.innerHTML = PLANE_SVG + `<span>${esc(p.call)}</span>`;
    e.style.pointerEvents = 'auto';
    e.onclick = ev => { ev.stopPropagation(); showPlane(p); };
    return e;
  }
  function box() {
    const p = Earth.globe().pointOfView();
    const h = p.altitude < 0.02 ? 1.5 : p.altitude < 0.1 ? 4 : p.altitude < 0.4 ? 7 : 10;
    const w = h / Math.max(0.3, Math.cos(p.lat * Math.PI / 180));
    return { lamin: Math.max(-85, p.lat - h), lamax: Math.min(85, p.lat + h), lomin: Math.max(-180, p.lng - w), lomax: Math.min(180, p.lng + w) };
  }
  async function loadPlanes() {
    if (!planes.alive || !visible()) return;
    const r = await window.kairo.earth.flights(box());
    if (!planes.alive) return;
    if (!r.ok) { status('flights', r.error.code === 'LIMIT' ? '✈ ' + t('lay.limit') : '✈ ' + t('lay.offline')); return; }
    const next = new Map();
    for (const p of r.planes) {
      const old = planes.byId.get(p.id);
      if (old) { Object.assign(old.d, p, { altM: p.alt, alt: 0.002 + Math.min(p.alt, 13000) / 13000 * 0.01 }); old.d.t = Date.now(); next.set(p.id, old); old.d.el.style.setProperty('--h', p.heading + 'deg'); }
      else {
        const d = { ...p, t: Date.now(), altM: p.alt, alt: 0.002 + Math.min(p.alt, 13000) / 13000 * 0.01 };
        d.el = planeEl(d); d.el.style.setProperty('--h', p.heading + 'deg');
        next.set(p.id, { d });
      }
    }
    planes.byId = next;
    planes.list = [...next.values()].map(x => x.d);
    status('flights', `✈ ${planes.list.length} ${t('lay.planes')}`);
    push();
  }
  // move planes smoothly between updates (speed + heading)
  function movePlanes() {
    if (!planes.alive) return;
    const now = Date.now();
    for (const d of planes.list) {
      const dt = (now - d.t) / 1000; d.t = now;
      const dist = d.speed / 3.6 * dt / 111320, h = d.heading * Math.PI / 180;
      d.lat += dist * Math.cos(h); d.lng += dist * Math.sin(h) / Math.max(0.2, Math.cos(d.lat * Math.PI / 180));
    }
    push();
  }
  async function showPlane(p) {
    const panel = Earth.panel(); panel.classList.add('open');
    $('epCoords').textContent = `${p.lat.toFixed(3)}° · ${p.lng.toFixed(3)}°`;
    $('epPlace').textContent = '✈ ' + (p.call || p.id);
    $('epWhat').disabled = $('epAsk').disabled = true;
    const facts = `<div class="lay-facts"><div><small>${t('lay.altitude')}</small><b>${p.altM?.toLocaleString('de-CH') ?? '–'} m</b></div><div><small>${t('lay.speed')}</small><b>${p.speed} km/h</b></div><div><small>${t('lay.from')}</small><b>${esc(p.country)}</b></div></div>`;
    $('epBody').innerHTML = facts + `<div class="muted">${t('earth.loading')}</div>`;
    const r = await window.kairo.earth.route(p.call);
    const rt = r.ok && r.route;
    if (rt?.from && rt?.to) {
      $('epBody').innerHTML = `<div class="lay-route"><div><b>${esc(rt.from.code)}</b><small>${esc(rt.from.city || rt.from.name)}</small></div><div class="lay-line"><i>✈</i></div><div><b>${esc(rt.to.code)}</b><small>${esc(rt.to.city || rt.to.name)}</small></div></div>
        <div class="muted">${esc(rt.airline)} · ${esc(rt.flight)}</div>` + facts;
      Earth.setLayer('route', { paths: [{ pts: [[rt.from.lat, rt.from.lng, 0.002], [p.lat, p.lng, p.alt], [rt.to.lat, rt.to.lng, 0.002]], color: ['rgba(255,170,90,.95)', 'rgba(255,170,90,.25)'], stroke: 2, dash: 0.03, gap: 0.01, anim: 4000 }] });
    } else $('epBody').innerHTML = facts + `<div class="muted">${t('lay.noRoute')}</div>`;
  }
  function planesOn() {
    planes.alive = true; Earth.stopRotate(); loadPlanes();
    planes.timer = setInterval(loadPlanes, 25000);
    planes.mover = setInterval(movePlanes, 1000);
    planes.onEnd = () => { clearTimeout(planes.deb); planes.deb = setTimeout(loadPlanes, 1500); };
    Earth.globe().controls().addEventListener('end', planes.onEnd);
  }
  function planesOff() {
    planes.alive = false; clearInterval(planes.timer); clearInterval(planes.mover);
    Earth.globe().controls().removeEventListener('end', planes.onEnd);
    planes.list = []; planes.byId.clear(); Earth.setLayer('route', { paths: [] }); status('flights', null); push();
  }

  // ---------- ISS ----------
  const iss = { alive: false, follow: false };
  async function issOn() {
    iss.alive = true;
    const el = document.createElement('div'); el.className = 'gl-iss'; el.innerHTML = '<i>🛰</i><span>ISS</span>';
    el.style.pointerEvents = 'auto'; el.onclick = ev => { ev.stopPropagation(); showIss(); };
    iss.d = { lat: 0, lng: 0, alt: 420 / 6371, el };
    const tick = async () => {
      if (!iss.alive) return;
      const r = await window.kairo.earth.iss();
      if (!r.ok || !iss.alive) return;
      Object.assign(iss.d, { lat: r.now.lat, lng: r.now.lng }); iss.now = r.now;
      status('iss', `🛰 ISS · ${r.now.lat.toFixed(1)}°, ${r.now.lng.toFixed(1)}° · ${r.now.speed.toLocaleString('de-CH')} km/h`);
      if (iss.follow) Earth.globe().pointOfView({ lat: r.now.lat, lng: r.now.lng, altitude: 1.1 }, 2500);
      push();
    };
    await tick();
    if (iss.now) { Earth.stopRotate(); Earth.globe().pointOfView({ lat: iss.now.lat, lng: iss.now.lng, altitude: 1.8 }, 2200); }
    iss.timer = setInterval(tick, 3000);
    const path = await window.kairo.earth.issPath();
    if (path.ok && iss.alive) {
      // split where the orbit crosses the date line so the line doesn't cut across the globe
      const segs = [[]];
      path.path.forEach((p, i) => { if (i && Math.abs(p.lng - path.path[i - 1].lng) > 180) segs.push([]); segs[segs.length - 1].push([p.lat, p.lng, 420 / 6371]); });
      iss.paths = segs.filter(s => s.length > 1).map(pts => ({ pts, color: ['rgba(140,220,255,.9)', 'rgba(140,220,255,.15)'], stroke: 1.2, dash: 0.015, gap: 0.006, anim: 20000 }));
      push();
    }
  }
  function showIss() {
    iss.follow = !iss.follow;
    window.toast(iss.follow ? '🛰 ' + t('lay.followOn') : t('lay.followOff'));
    if (iss.follow && iss.now) { Earth.stopRotate(); Earth.globe().pointOfView({ lat: iss.now.lat, lng: iss.now.lng, altitude: 1.1 }, 2000); }
  }
  function issOff() { iss.alive = false; iss.follow = false; clearInterval(iss.timer); iss.paths = []; status('iss', null); push(); }

  // ---------- earthquakes ----------
  const quakes = { alive: false, list: [] };
  const magColor = m => m >= 6 ? '#ff2d55' : m >= 5 ? '#ff6b3d' : m >= 4 ? '#ffb02e' : '#ffe08a';
  async function quakesOn() {
    quakes.alive = true;
    status('quakes', '🌋 ' + t('lay.loading'));
    const r = await window.kairo.earth.quakes();
    if (!r.ok || !quakes.alive) { status('quakes', '🌋 ' + t('lay.offline')); return; }
    quakes.list = r.list.map(q => {
      const e = document.createElement('div'); e.className = 'gl-quake';
      const size = 4 + Math.max(0, q.mag - 2.5) * 4;
      e.style.cssText = `--s:${size}px;--c:${magColor(q.mag)};pointer-events:auto`;
      e.title = `M${q.mag} · ${q.place}`;
      e.onclick = ev => { ev.stopPropagation(); showQuake(q); };
      return { ...q, el: e, alt: 0.001 };
    });
    const strong = r.list.filter(q => q.mag >= 4.5);
    quakes.rings = strong.map(q => ({ lat: q.lat, lng: q.lng, maxR: 1 + (q.mag - 4) * 1.6, speed: 1.2 + (q.mag - 4) * 0.5, period: 1400, color: tt => `rgba(255,${Math.round(60 + 120 * tt)},60,${(1 - tt) * 0.9})` }));
    const top = [...r.list].sort((a, b) => b.mag - a.mag)[0];
    status('quakes', `🌋 ${r.list.length} ${t('lay.quakes')} · ${t('lay.strongest')} <b>M${top?.mag}</b> ${esc((top?.place || '').replace(/^.*of /, ''))}`);
    push();
  }
  function showQuake(q) {
    Earth.panel().classList.add('open');
    $('epCoords').textContent = `${q.lat.toFixed(3)}° · ${q.lng.toFixed(3)}°`;
    $('epPlace').textContent = `M${q.mag} · ${q.place}`;
    $('epWhat').disabled = $('epAsk').disabled = true;
    $('epBody').innerHTML = `<div class="lay-facts"><div><small>${t('lay.mag')}</small><b style="color:${magColor(q.mag)}">${q.mag}</b></div><div><small>${t('lay.depth')}</small><b>${q.depth} km</b></div><div><small>${t('lay.when')}</small><b>${ago(q.time)}</b></div></div>` +
      (q.tsunami ? `<div class="lay-warn">🌊 ${t('lay.tsunami')}</div>` : '');
    Earth.globe().pointOfView({ lat: q.lat, lng: q.lng, altitude: 0.6 }, 1800);
  }
  function quakesOff() { quakes.alive = false; quakes.list = []; quakes.rings = []; status('quakes', null); push(); }

  // ---------- shared ----------
  function push() {
    Earth.setLayer('planes', { html: planes.alive ? planes.list : [] });
    Earth.setLayer('iss', { html: iss.alive && iss.d ? [iss.d] : [], paths: iss.alive ? iss.paths || [] : [] });
    Earth.setLayer('quakes', { html: quakes.alive ? quakes.list : [], rings: quakes.alive ? quakes.rings || [] : [] });
  }
  const lines = {};
  function status(k, html) {
    if (html == null) delete lines[k]; else lines[k] = html;
    let box = $('layStatus');
    if (!box) { $('view-earth').insertAdjacentHTML('beforeend', '<div class="lay-status" id="layStatus"></div>'); box = $('layStatus'); }
    box.innerHTML = Object.values(lines).map(h => `<div>${h}</div>`).join('');
    box.classList.toggle('on', Object.keys(lines).length > 0);
  }

  const API = { clock: [() => WorldClock.layer(true), () => WorldClock.layer(false)], rain: [radarOn, radarOff], night: [nightOn, nightOff], flights: [planesOn, planesOff], iss: [issOn, issOff], quakes: [quakesOn, quakesOff] };
  async function set(name, value = !on[name]) {
    if (!API[name] || !!on[name] === !!value) return;
    on[name] = !!value;
    const box = document.querySelector(`[data-layer="${name}"]`); if (box) box.checked = !!value;
    try { await API[name][value ? 0 : 1](); }
    catch (e) { console.log('layer', name, e.message); on[name] = false; if (box) box.checked = false; status(name, null); window.toast('✕ ' + e.message); }
  }

  function init() {
    const wrap = document.querySelector('.earth-toggles');
    if (!wrap || wrap.dataset.layers) return;
    wrap.dataset.layers = '1';
    // the old "night lights" switch becomes the live day/night line with city lights
    const nl = $('earthNight'); if (nl) nl.closest('label').remove();
    wrap.insertAdjacentHTML('beforeend', [['night', '🌗'], ['rain', '🌧'], ['flights', '✈'], ['iss', '🛰'], ['quakes', '🌋'], ['clock', '🕐']]
      .map(([k, i]) => `<label class="tog"><input type="checkbox" data-layer="${k}"><span>${i} ${t('lay.' + k)}</span></label>`).join(''));
    wrap.querySelectorAll('[data-layer]').forEach(b => b.onchange = () => { Earth.init(); set(b.dataset.layer, b.checked); });
  }

  return { init, set, isOn: n => !!on[n], sunPos };
})();
