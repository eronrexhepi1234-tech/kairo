// Earth view: 3D globe with real satellite tiles when you zoom in (Esri World Imagery).
window.Earth = (function () {
  let globe = null, current = null, ready = false;
  const IMG = 'assets/earth/';
  const SAT = (x, y, l) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`;
  const $ = id => document.getElementById(id);

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
      .htmlElement(() => { const d = document.createElement('div'); d.className = 'globe-pin'; return d; })
      .onGlobeClick(({ lat, lng }) => select(lat, lng));
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;
    const resize = () => globe.width(el.clientWidth).height(el.clientHeight);
    new ResizeObserver(resize).observe(el);
    resize();

    $('earthSat').onchange = e => globe.globeTileEngineUrl(e.target.checked ? SAT : null);
    $('earthNight').onchange = e => globe.globeImageUrl(IMG + (e.target.checked ? 'earth-night.jpg' : 'earth-blue-marble.jpg'));
    $('earthRotate').onchange = e => { controls.autoRotate = e.target.checked; };
    $('earthSearch').onsubmit = async e => {
      e.preventDefault();
      const q = $('earthQuery').value.trim();
      if (q) flyToName(q);
    };
    $('epWhat').onclick = whatHappened;
    $('epAsk').onclick = () => {
      if (!current) return;
      window.App.askInChat(`${t('earth.what')} — ${current.name}${current.country && current.country !== current.name ? ', ' + current.country : ''}`, { attachNews: true, newsQuery: current.name });
    };
  }

  function stopRotate() { globe.controls().autoRotate = false; $('earthRotate').checked = false; }

  async function select(lat, lng, knownName) {
    stopRotate();
    globe.htmlElementsData([{ lat, lng }]);
    const panel = $('earthPanel');
    panel.classList.add('open');
    $('epCoords').textContent = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
    $('epPlace').textContent = knownName || t('earth.loading');
    $('epBody').innerHTML = '';
    $('epWhat').disabled = $('epAsk').disabled = true;
    const info = await window.kairo.geo.reverse(lat, lng);
    current = { lat, lng, name: knownName || info.name || `${lat.toFixed(2)}, ${lng.toFixed(2)}`, country: info.country };
    $('epPlace').textContent = current.name + (current.country && current.country !== current.name ? ', ' + current.country : '');
    $('epWhat').disabled = $('epAsk').disabled = false;
  }

  function flyTo(lat, lng, altitude = 0.6, name) {
    init();
    stopRotate();
    globe.pointOfView({ lat, lng, altitude }, 1800);
    setTimeout(() => select(lat, lng, name), 400);
  }

  async function flyToName(q) {
    const r = await window.kairo.geo.search(q);
    if (!r) return window.toast('?');
    flyTo(r.lat, r.lng, 0.35, q);
  }

  async function whatHappened() {
    if (!current) return;
    const body = $('epBody');
    body.innerHTML = `<div class="msg-status">${t('status.news')}</div>`;
    const query = current.name;
    const r = await window.kairo.news({ query });
    const items = r.ok ? r.items : [];
    const list = items.map((n, i) => `${i + 1}. ${n.title} — ${n.source} (${n.date})`).join('\n');
    const ai = await window.kairo.complete({
      text: `Place: ${current.name}${current.country ? ', ' + current.country : ''} (${current.lat.toFixed(3)}, ${current.lng.toFixed(3)}).\n` +
        (items.length ? `Recent headlines about it:\n${list}\n\nSummarize what is happening there right now in 4-6 short bullet points, citing sources by name. Then add 2 lines of interesting background about the place.`
          : 'No recent headlines were found. Give 4 short bullet points of interesting facts and history about this place, and say that you found no fresh news.'),
      extraSystem: 'Keep it short. This answer appears in a small side panel next to a 3D globe.'
    });
    body.innerHTML = ai.ok ? renderMarkdown(ai.text) : `<p class="msg error">${ai.error.code === 'NO_KEY' ? t('err.nokey') : ai.error.message}</p>`;
    if (items.length) {
      body.insertAdjacentHTML('beforeend', `<div class="sources">${items.slice(0, 6).map(n => `<a class="source" href="${escAttr(n.link)}" data-ext title="${escAttr(n.title)}">${escAttr(n.source || 'link')}</a>`).join('')}</div>`);
    }
  }

  return { init, flyTo, flyToName };
})();

