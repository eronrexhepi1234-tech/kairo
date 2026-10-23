// Earth view: 3D globe with real satellite tiles (Esri World Imagery) and cinematic fly-to:
// pull back → travel → lock on → dive in, with a HUD, pulse rings, title card and live weather.
window.Earth = (function () {
  let globe = null, current = null, ready = false, flight = 0, hudTimer = 0;
  const IMG = 'assets/earth/';
  const SAT = (x, y, l) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`;
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const motion = () => (document.documentElement.dataset.motion === 'off' ? 0.25 : document.documentElement.dataset.motion === 'subtle' ? 0.7 : 1);
  // how close the camera goes
  // altitude in earth radii: 0.012 ≈ 70 km wide view, 0.0025 ≈ 15 km, 0.0007 ≈ 4 km
  const ZOOM = { world: 2.4, country: 0.55, region: 0.12, city: 0.012, close: 0.0035, street: 0.0008 };

  function init() {
    if (ready) return;
    ready = true;
    const el = $('globe');
    globe = new Globe(el, { animateIn: true })
      .backgroundImageUrl(IMG + 'night-sky.png')
      .globeImageUrl(IMG + 'earth-blue-marble.jpg')
      .bumpImageUrl(IMG + 'earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#9ec9ff')
      .atmosphereAltitude(0.18)
      .globeTileEngineUrl(SAT)
      .htmlElementsData([])
      .htmlElement(d => { if (d.el) return d.el; const e = document.createElement('div'); e.className = 'globe-pin'; return e; })
      .htmlAltitude(d => d.alt || 0)
      .htmlTransitionDuration(0)
      .ringsData([])
      .ringColor(d => d.color || (t => `rgba(255,${Math.round(122 + 80 * t)},69,${1 - t})`))
      .ringMaxRadius(d => d.maxR || 4).ringPropagationSpeed(d => d.speed || 3).ringRepeatPeriod(d => d.period || 650)
      .pathsData([]).pathPoints('pts').pathPointLat(p => p[0]).pathPointLng(p => p[1]).pathPointAlt(p => p[2] || 0)
      .pathColor(d => d.color || ['rgba(120,200,255,.9)', 'rgba(120,200,255,.1)']).pathStroke(d => d.stroke || 1.5)
      .pathDashLength(d => d.dash || 0.02).pathDashGap(d => d.gap || 0.004).pathDashAnimateTime(d => d.anim || 30000).pathTransitionDuration(0)
      .onGlobeClick(({ lat, lng }) => { flight++; select(lat, lng); });
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;
    const resize = () => globe.width(el.clientWidth).height(el.clientHeight);
    new ResizeObserver(resize).observe(el);
    resize();

    // HUD, title card and zoom buttons on top of the globe
    const view = $('view-earth');
    view.insertAdjacentHTML('beforeend', `
      <div class="earth-hud" id="earthHud"><div class="hud-scan"></div><div class="hud-cross"><i></i><i></i><i></i><i></i></div><div class="hud-data" id="hudData"></div></div>
      <div class="earth-title" id="earthTitle" hidden></div>
      <div class="zoom-ctl"><button id="zoomIn" title="Zoom +">＋</button><button id="zoomOut" title="Zoom −">－</button><button id="zoomHome" title="Erde">🌍</button></div>`);
    $('zoomIn').onclick = () => zoom(0.35);
    $('zoomOut').onclick = () => zoom(2.6);
    $('zoomHome').onclick = () => { flight++; globe.pointOfView({ altitude: ZOOM.world }, 1600); };

    $('earthSat').onchange = e => globe.globeTileEngineUrl(e.target.checked ? SAT : null);
    $('earthNight').onchange = e => globe.globeImageUrl(IMG + (e.target.checked ? 'earth-night.jpg' : 'earth-blue-marble.jpg'));
    $('earthRotate').onchange = e => { controls.autoRotate = e.target.checked; };
    $('earthSearch').onsubmit = async e => {
      e.preventDefault();
      const q = $('earthQuery').value.trim();
      if (q) flyToName(q, 'city');
    };
    window.EarthLayers?.init();
    $('epWhat').onclick = whatHappened;
    $('epAsk').onclick = () => {
      if (!current) return;
      window.App.askInChat(`${t('earth.what')} — ${current.name}${current.country && current.country !== current.name ? ', ' + current.country : ''}`, { attachNews: true, newsQuery: current.name });
    };
  }

  function stopRotate() { globe.controls().autoRotate = false; $('earthRotate').checked = false; }

  // zoom in/out around what's in the middle of the screen
  function zoom(factor) {
    init(); stopRotate();
    const p = globe.pointOfView();
    globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: Math.max(0.0006, Math.min(4, p.altitude * factor)) }, 1200 * motion());
  }

  async function select(lat, lng, knownName, knownCountry) {
    stopRotate();
    setLayer('pin', { html: [{ lat, lng }] });
    const panel = $('earthPanel');
    panel.classList.add('open');
    $('epCoords').textContent = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
    $('epPlace').textContent = knownName || t('earth.loading');
    $('epBody').innerHTML = '<div class="ep-weather" id="epWeather"></div>';
    $('epWhat').disabled = $('epAsk').disabled = true;
    const info = knownCountry ? { country: knownCountry } : await window.kairo.geo.reverse(lat, lng);
    current = { lat, lng, name: knownName || info.name || `${lat.toFixed(2)}, ${lng.toFixed(2)}`, country: (info.country || "").split("/")[0] };
    $('epPlace').textContent = current.name + (current.country && !current.name.includes(current.country) ? ', ' + current.country : '');
    $('epWhat').disabled = $('epAsk').disabled = false;
    // live weather at this spot
    const w = await window.kairo.weatherAt({ lat, lng, name: current.name, country: current.country });
    if (w.ok && $('epWeather')) WeatherFX.card($('epWeather'), w, { compact: true });
    return current;
  }

  function hud(on, lock) {
    const h = $('earthHud');
    h.classList.toggle('on', on);
    h.classList.toggle('lock', !!lock);
    cancelAnimationFrame(hudTimer);
    if (!on) return;
    const tick = () => {
      const p = globe.pointOfView();
      $('hudData').innerHTML = `LAT <b>${p.lat.toFixed(3)}</b> · LNG <b>${p.lng.toFixed(3)}</b> · ALT <b>${Math.round(p.altitude * 6371).toLocaleString('de-CH')} km</b>`;
      hudTimer = requestAnimationFrame(tick);
    };
    tick();
  }

  function title(name, sub) {
    const el = $('earthTitle');
    el.classList.remove('out');
    el.hidden = false;
    el.innerHTML = `<h1>${[...String(name)].map((c, i) => `<span style="animation-delay:${i * 45}ms">${c === ' ' ? '&nbsp;' : escAttr(c)}</span>`).join('')}</h1><p>${escAttr(sub)}</p>`;
    return () => { el.classList.add('out'); setTimeout(() => { el.hidden = true; }, 800); };
  }

  // the cinematic flight
  async function flyTo(lat, lng, zoomLevel = 'city', name, country) {
    init(); stopRotate();
    const id = ++flight, m = motion();
    const alt = typeof zoomLevel === 'number' ? zoomLevel : ZOOM[zoomLevel] ?? ZOOM.city;
    const start = globe.pointOfView();
    const far = Math.hypot(start.lat - lat, ((start.lng - lng + 540) % 360) - 180) > 25;
    $('earthPanel').classList.remove('open');
    setLayer('pin', { html: [], rings: [] });
    hud(true);
    const coords = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
    const hideTitle = title(name || '', [country, coords].filter(Boolean).join('  ·  '));
    // 1) pull back if we're close to the ground or far away from the target
    if (far || start.altitude < 1.2) { globe.pointOfView({ lat: start.lat, lng: start.lng, altitude: Math.max(start.altitude, 2.3) }, 900 * m); await wait(900 * m); }
    if (id !== flight) return;
    // 2) travel above the target
    globe.pointOfView({ lat, lng, altitude: Math.max(1.6, Math.min(2.3, alt * 4)) }, (far ? 2000 : 1100) * m); await wait((far ? 2000 : 1100) * m);
    if (id !== flight) return;
    // 3) lock on: pulse rings + crosshair
    setLayer('pin', { rings: [{ lat, lng }] });
    hud(true, true);
    await wait(500 * m);
    // 4) dive in (two stages feel more like a real camera)
    if (alt < 0.9) { globe.pointOfView({ lat, lng, altitude: Math.max(alt, 0.45) }, 1500 * m); await wait(1500 * m); }
    if (id !== flight) return;
    if (alt < 0.45) { globe.pointOfView({ lat, lng, altitude: Math.max(alt, 0.04) }, 1700 * m); await wait(1700 * m); }
    if (id !== flight) return;
    if (alt < 0.04) { globe.pointOfView({ lat, lng, altitude: alt }, 2200 * m); await wait(2200 * m); }
    if (id !== flight) return;
    hideTitle();
    hud(false);
    setTimeout(() => { if (id === flight) setLayer('pin', { rings: [] }); }, 3500);
    return select(lat, lng, name, country);
  }

  // "Thun", "Paris | street", "Albania | country"
  async function flyToName(q, zoomLevel, label) {
    let [place, z] = String(q).split('|').map(s => s.trim());
    z = zoomLevel || (z && (ZOOM[z] != null ? z : /street|strasse|nah|close|rein|zoom/i.test(z) ? 'street' : /land|country/i.test(z) ? 'country' : 'city')) || 'city';
    init();
    const r = await window.kairo.geo.search(place);
    if (!r) return window.toast('? ' + place);
    const parts = (r.name || place).split(',').map(s => s.trim());
    const country = parts.length > 1 ? parts[parts.length - 1].split('/')[0] : '';
    const nameShown = place.length < 3 ? parts[0] : place.charAt(0).toUpperCase() + place.slice(1);
    return flyTo(r.lat, r.lng, z, label || nameShown, country);
  }

  async function whatHappened() {
    if (!current) return;
    const body = $('epBody');
    const wx = $('epWeather');
    body.innerHTML = '';
    if (wx) body.appendChild(wx);
    body.insertAdjacentHTML('beforeend', `<div class="msg-status" id="epNews">${t('status.news')}</div>`);
    const query = current.name;
    const r = await window.kairo.news({ query });
    const items = r.ok ? r.items : [];
    const list = items.map((n, i) => `${i + 1}. ${n.title} — ${n.source} (${n.date})`).join('\n');
    const ai = await window.kairo.complete({
      text: `Place: ${current.name}${current.country ? ', ' + current.country : ''} (${current.lat.toFixed(3)}, ${current.lng.toFixed(3)}).\n` +
        (items.length ? `Recent headlines about it:\n${list}\n\nSummarize what is happening there right now in 4-6 short bullet points, citing sources by name. Then add 2 lines of interesting background about the place.`
          : 'No recent headlines were found. Give 4 short bullet points of interesting facts and history about this place, and say that you found no fresh news.'),
      extraSystem: 'Keep it short. This answer appears in a small side panel next to a 3D globe.', plain: true
    });
    $('epNews')?.remove();
    body.insertAdjacentHTML('beforeend', `<div class="ep-news">${ai.ok ? renderMarkdown(ai.text) : `<p class="msg error">${ai.error.code === 'NO_KEY' ? t('err.nokey') : escAttr(ai.error.message)}</p>`}</div>`);
    if (items.length) body.insertAdjacentHTML('beforeend', `<div class="sources">${items.slice(0, 6).map(n => `<a class="source" href="${escAttr(n.link)}" data-ext title="${escAttr(n.title)}">${escAttr(n.source || 'link')}</a>`).join('')}</div>`);
  }

  // several layers (pin, planes, ISS, quakes...) share the globe's markers, rings and paths
  const layers = {};
  function setLayer(name, data) {
    layers[name] = { ...(layers[name] || {}), ...data };
    if (!globe) return;
    const all = k => Object.values(layers).flatMap(l => l[k] || []);
    globe.htmlElementsData(all('html')).ringsData(all('rings')).pathsData(all('paths'));
  }

  return { init, flyTo, flyToName, zoom, select, setLayer, globe: () => (init(), globe), current: () => current, panel: () => $('earthPanel'), stopRotate: () => stopRotate(), ZOOM: Object.keys(ZOOM) };
})();
