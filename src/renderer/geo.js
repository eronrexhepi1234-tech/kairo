// GeoGuessr in Kairo: a real satellite photo, you guess on a globe, points by distance. 5 rounds.
window.Geo = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SAT = (x, y, l) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`;
  // [name, country, lat, lng]: cities, landmarks and landscapes with a clear look from above
  const PLACES = [
    ['Zürich', 'Schweiz', 47.3769, 8.5417], ['Thun', 'Schweiz', 46.7580, 7.6280], ['Luzern', 'Schweiz', 47.0502, 8.3093], ['Genf', 'Schweiz', 46.2044, 6.1432], ['Zermatt', 'Schweiz', 46.0207, 7.7491],
    ['Lugano', 'Schweiz', 46.0037, 8.9511], ['Bern', 'Schweiz', 46.9480, 7.4474], ['Tirana', 'Albanien', 41.3275, 19.8187], ['Sarandë', 'Albanien', 39.8754, 20.0050], ['Berat', 'Albanien', 40.7058, 19.9522],
    ['Prishtina', 'Kosovo', 42.6629, 21.1655], ['Paris', 'Frankreich', 48.8584, 2.2945], ['Venedig', 'Italien', 45.4340, 12.3388], ['Rom', 'Italien', 41.8902, 12.4922], ['Barcelona', 'Spanien', 41.4036, 2.1744],
    ['Amsterdam', 'Niederlande', 52.3676, 4.9041], ['London', 'UK', 51.5007, -0.1246], ['Berlin', 'Deutschland', 52.5163, 13.3777], ['Prag', 'Tschechien', 50.0865, 14.4114], ['Wien', 'Österreich', 48.2082, 16.3738],
    ['Santorini', 'Griechenland', 36.4618, 25.3753], ['Dubrovnik', 'Kroatien', 42.6407, 18.1077], ['Istanbul', 'Türkei', 41.0086, 28.9802], ['Kappadokien', 'Türkei', 38.6431, 34.8289], ['Reykjavík', 'Island', 64.1466, -21.9426],
    ['Lofoten', 'Norwegen', 68.2340, 13.9500], ['Stockholm', 'Schweden', 59.3251, 18.0711], ['Moskau', 'Russland', 55.7539, 37.6208], ['Kairo Gizeh', 'Ägypten', 29.9792, 31.1342], ['Marrakesch', 'Marokko', 31.6295, -7.9811],
    ['Kapstadt', 'Südafrika', -33.9249, 18.4241], ['Okavango-Delta', 'Botswana', -19.2833, 22.9000], ['Kilimandscharo', 'Tansania', -3.0674, 37.3556], ['Sansibar', 'Tansania', -6.1659, 39.2026], ['Lagos', 'Nigeria', 6.4541, 3.3947],
    ['Dubai Palm', 'VAE', 25.1124, 55.1390], ['Mekka', 'Saudi-Arabien', 21.4225, 39.8262], ['Petra', 'Jordanien', 30.3285, 35.4444], ['Taj Mahal', 'Indien', 27.1751, 78.0421], ['Mumbai', 'Indien', 19.0760, 72.8777],
    ['Malediven', 'Malediven', 4.1755, 73.5093], ['Kathmandu', 'Nepal', 27.7172, 85.3240], ['Peking', 'China', 39.9163, 116.3972], ['Shanghai', 'China', 31.2397, 121.4998], ['Hongkong', 'China', 22.2855, 114.1577],
    ['Guilin', 'China', 25.2736, 110.2900], ['Tokio', 'Japan', 35.6595, 139.7005], ['Kyoto', 'Japan', 35.0116, 135.7681], ['Fuji', 'Japan', 35.3606, 138.7274], ['Seoul', 'Südkorea', 37.5665, 126.9780],
    ['Singapur', 'Singapur', 1.2834, 103.8607], ['Bangkok', 'Thailand', 13.7563, 100.5018], ['Ha-Long-Bucht', 'Vietnam', 20.9101, 107.1839], ['Bali', 'Indonesien', -8.4095, 115.1889], ['Angkor Wat', 'Kambodscha', 13.4125, 103.8670],
    ['Sydney', 'Australien', -33.8568, 151.2153], ['Uluru', 'Australien', -25.3444, 131.0369], ['Great Barrier Reef', 'Australien', -18.2871, 147.6992], ['Queenstown', 'Neuseeland', -45.0312, 168.6626], ['Bora Bora', 'Franz. Polynesien', -16.5004, -151.7415],
    ['Honolulu', 'USA', 21.2810, -157.8374], ['New York', 'USA', 40.7829, -73.9654], ['San Francisco', 'USA', 37.8199, -122.4783], ['Las Vegas', 'USA', 36.1147, -115.1728], ['Grand Canyon', 'USA', 36.0544, -112.1401],
    ['Miami', 'USA', 25.7907, -80.1300], ['Chicago', 'USA', 41.8781, -87.6298], ['Yellowstone', 'USA', 44.4605, -110.8281], ['Toronto', 'Kanada', 43.6426, -79.3871], ['Banff', 'Kanada', 51.4968, -115.9281],
    ['Mexiko-Stadt', 'Mexiko', 19.4326, -99.1332], ['Chichén Itzá', 'Mexiko', 20.6843, -88.5678], ['Havanna', 'Kuba', 23.1136, -82.3666], ['Panamakanal', 'Panama', 9.0800, -79.6800], ['Machu Picchu', 'Peru', -13.1631, -72.5450],
    ['Rio de Janeiro', 'Brasilien', -22.9519, -43.2105], ['Amazonas Manaus', 'Brasilien', -3.1190, -60.0217], ['Buenos Aires', 'Argentinien', -34.6037, -58.3816], ['Salar de Uyuni', 'Bolivien', -20.1338, -67.4891], ['Patagonien Torres del Paine', 'Chile', -50.9423, -73.4068],
    ['Atacama', 'Chile', -23.8634, -69.1328], ['Galápagos', 'Ecuador', -0.9538, -90.9656], ['Nuuk', 'Grönland', 64.1814, -51.6941], ['Antarktis McMurdo', 'Antarktis', -77.8463, 166.6682], ['Sahara Erg Chebbi', 'Marokko', 31.1450, -4.0200],
    ['Namib Sossusvlei', 'Namibia', -24.7275, 15.3424], ['Victoriafälle', 'Sambia/Simbabwe', -17.9243, 25.8572], ['Madagaskar Baobab-Allee', 'Madagaskar', -20.2508, 44.4183], ['Nil-Delta', 'Ägypten', 30.9000, 31.1000], ['Mont-Saint-Michel', 'Frankreich', 48.6361, -1.5115],
    ['Neuschwanstein', 'Deutschland', 47.5576, 10.7498], ['Hallstatt', 'Österreich', 47.5622, 13.6493], ['Cinque Terre', 'Italien', 44.1270, 9.7100], ['Lissabon', 'Portugal', 38.7223, -9.1393], ['Madeira', 'Portugal', 32.6669, -16.9241]
  ];
  let globe = null, round = 0, total = 0, guess = null, cur = null, rounds = [], zoomLv = 16, hints = 0, borders = null;
  const ROUNDS = 5;

  // ---------- satellite photo: 3x3 tiles around the spot ----------
  function lon2tile(lng, z) { return (lng + 180) / 360 * (1 << z); }
  function lat2tile(lat, z) { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * (1 << z); }
  async function photo(canvas, lat, lng, z) {
    const ctx = canvas.getContext('2d'), S = 256, N = 3;
    canvas.width = canvas.height = S * N;
    const fx = lon2tile(lng, z), fy = lat2tile(lat, z), x0 = Math.floor(fx) - 1, y0 = Math.floor(fy) - 1;
    const offX = (fx - Math.floor(fx)) * S - S / 2, offY = (fy - Math.floor(fy)) * S - S / 2;
    ctx.fillStyle = '#0b0f17'; ctx.fillRect(0, 0, S * N, S * N);
    const jobs = [];
    for (let dx = -1; dx <= N; dx++) for (let dy = -1; dy <= N; dy++) {
      jobs.push(new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { ctx.drawImage(im, (dx) * S - offX, (dy) * S - offY); res(); }; im.onerror = res; im.src = SAT(x0 + dx, y0 + dy, z); }));
    }
    await Promise.all(jobs);
  }

  function shell() {
    let el = $('geoGame');
    if (el) return el;
    $('view-games').insertAdjacentHTML('beforeend', `
      <div class="geo-game" id="geoGame">
        <div class="geo-top"><div class="geo-brand">${ic('earth')}<b>GeoGuessr</b><span>Kairo Edition</span></div>
          <div class="geo-rounds" id="geoRounds"></div><div class="geo-total"><small>${t('geo.points')}</small><b id="geoTotal">0</b></div>
          <button class="geo-x" id="geoClose">${ic('x')}</button></div>
        <div class="geo-main">
          <div class="geo-photo"><canvas id="geoCanvas"></canvas><div class="geo-scan"></div>
            <div class="geo-photo-tools"><button class="btn" id="geoZoomOut">${ic('scan-search')} ${t('geo.zoomOut')} <small>−500</small></button><button class="btn geo-ai" id="geoAi">${ic('bot')} Kairo spielt</button></div>
            <div class="geo-load" id="geoLoad">${ic('satellite')}<span>${t('geo.loading')}</span></div></div>
          <div class="geo-map"><div id="geoGlobe"></div><div class="geo-hint" id="geoHint">${t('geo.click')}</div><div class="geo-ai-note" id="geoAiNote" hidden></div>
            <button class="btn primary geo-go" id="geoGo" disabled>${ic('map-pin')} ${t('geo.guess')}</button></div>
        </div>
        <div class="geo-result" id="geoResult" hidden></div>
      </div>`);
    el = $('geoGame');
    $('geoClose').onclick = close;
    $('geoGo').onclick = submit;
    $('geoAi').onclick = aiPlay;
    $('geoZoomOut').onclick = async () => { if (zoomLv <= 10 || !cur) return; zoomLv -= 3; hints++; $('geoLoad').classList.add('on'); await photo($('geoCanvas'), cur.lat, cur.lng, zoomLv); $('geoLoad').classList.remove('on'); if (zoomLv <= 10) $('geoZoomOut').disabled = true; };
    return el;
  }

  async function initGlobe() {
    if (globe) return;
    const box = $('geoGlobe');
    globe = new Globe(box, { animateIn: false })
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl('assets/earth/earth-blue-marble.jpg')
      .bumpImageUrl('assets/earth/earth-topology.png')
      .showAtmosphere(true).atmosphereColor('#9ec9ff').atmosphereAltitude(0.15)
      .htmlElementsData([]).htmlElement(d => d.el)
      .arcsData([]).arcColor(d => d.color).arcStroke(0.6).arcDashLength(0.4).arcDashGap(0.15).arcDashAnimateTime(1800).arcAltitudeAutoScale(0.4)
      .ringsData([]).ringColor(() => tt => `rgba(255,200,80,${1 - tt})`).ringMaxRadius(5).ringPropagationSpeed(3).ringRepeatPeriod(900)
      .onGlobeClick(({ lat, lng }) => place(lat, lng))
      .onPolygonClick((_, __, { lat, lng }) => place(lat, lng));
    const rs = () => globe.width(box.clientWidth).height(box.clientHeight);
    new ResizeObserver(rs).observe(box); rs();
    globe.controls().autoRotate = false;
    // country borders help a lot when guessing
    try {
      borders ||= (await window.kairo.earth2.borders()).geo;
      globe.polygonsData(borders.features).polygonCapColor(() => 'rgba(0,0,0,0)').polygonSideColor(() => 'rgba(0,0,0,0)')
        .polygonStrokeColor(() => 'rgba(255,255,255,.35)').polygonAltitude(0.002);
    } catch {}
  }

  function pin(cls) { const e = document.createElement('div'); e.className = 'geo-pin ' + cls; e.innerHTML = '<i></i>'; return e; }
  function place(lat, lng) {
    if (!cur || cur.done) return;
    guess = { lat, lng };
    globe.htmlElementsData([{ lat, lng, el: pin('you') }]);
    $('geoGo').disabled = false;
    $('geoHint').classList.add('hide');
  }

  const dist = (a, b) => { const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r; const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const points = km => Math.max(0, Math.round(5000 * Math.exp(-km / 1800)));

  function roundsBar() { $('geoRounds').innerHTML = Array.from({ length: ROUNDS }, (_, i) => `<i class="${i < round ? 'done' : i === round ? 'on' : ''}">${rounds[i] != null ? fmt(rounds[i]) : i + 1}</i>`).join(''); }
  const fmt = n => Number(n).toLocaleString('de-CH');

  async function next() {
    $('geoResult').hidden = true; $('geoResult').className = 'geo-result';
    if (round >= ROUNDS) return finish();
    const p = PLACES[Math.floor(Math.random() * PLACES.length)];
    cur = { name: p[0], country: p[1], lat: p[2] + (Math.random() - .5) * .01, lng: p[3] + (Math.random() - .5) * .01, done: false };
    guess = null; zoomLv = 16; hints = 0;
    $('geoAiNote').hidden = true; $('geoAi').disabled = false;
    $('geoZoomOut').disabled = false;
    $('geoGo').disabled = true; $('geoHint').classList.remove('hide');
    globe.htmlElementsData([]).arcsData([]).ringsData([]);
    globe.pointOfView({ lat: 25, lng: 10, altitude: 2.3 }, 1200);
    roundsBar();
    $('geoLoad').classList.add('on');
    $('geoGame').classList.remove('revealed');
    await photo($('geoCanvas'), cur.lat, cur.lng, zoomLv);
    $('geoLoad').classList.remove('on');
    $('geoCanvas').classList.remove('in'); void $('geoCanvas').offsetWidth; $('geoCanvas').classList.add('in');
  }

  // Kairo looks at the satellite photo, says why, sets the pin and guesses (only in Kairo's own game)
  async function aiPlay() {
    if (!cur || cur.done) return;
    const b = $('geoAi'), note = $('geoAiNote');
    b.disabled = true; b.innerHTML = `${ic('scan-search')} Kairo schaut…`;
    note.hidden = false; note.className = 'geo-ai-note think'; note.innerHTML = `<b>Kairo</b><span>Ich schaue mir das Foto an …</span>`;
    try {
      const r = await window.kairo.geoAiGuess($('geoCanvas').toDataURL('image/jpeg', 0.85).split(',')[1]);
      if (!r.ok) throw new Error(r.error.code === 'NO_KEY' ? t('err.nokey') : r.error.message);
      if (!cur || cur.done) return;
      const g = r.guess;
      note.className = 'geo-ai-note';
      note.innerHTML = `<b>Kairo tippt: ${esc(g.place)}${g.country ? ', ' + esc(g.country) : ''}</b><span>${esc(g.reason)}</span>${g.confidence ? `<i style="--c:${Math.min(100, g.confidence)}%"></i>` : ''}`;
      globe.pointOfView({ lat: g.lat, lng: g.lng, altitude: 1.1 }, 1500);
      await new Promise(res => setTimeout(res, 1600));
      place(g.lat, g.lng);
      await new Promise(res => setTimeout(res, 1400));
      submit();
    } catch (e) { note.hidden = true; window.toast('✕ ' + e.message); }
    b.innerHTML = `${ic('bot')} Kairo spielt`;
  }

  function submit() {
    if (!guess || !cur || cur.done) return;
    cur.done = true;
    const km = dist(guess, cur), pts = Math.max(0, points(km) - hints * 500);
    rounds[round] = pts; total += pts; round++;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a45';
    globe.htmlElementsData([{ lat: guess.lat, lng: guess.lng, el: pin('you') }, { lat: cur.lat, lng: cur.lng, el: pin('real') }])
      .arcsData([{ startLat: guess.lat, startLng: guess.lng, endLat: cur.lat, endLng: cur.lng, color: [accent, '#ffd27a'] }])
      .ringsData([{ lat: cur.lat, lng: cur.lng }]);
    const mid = { lat: (guess.lat + cur.lat) / 2, lng: guess.lng + (((cur.lng - guess.lng + 540) % 360) - 180) / 2 };
    globe.pointOfView({ ...mid, altitude: Math.min(2.6, Math.max(0.5, km / 3500)) }, 1600);
    $('geoGame').classList.add('revealed');
    const res = $('geoResult');
    const stars = pts > 4500 ? 3 : pts > 3000 ? 2 : pts > 1000 ? 1 : 0;
    res.innerHTML = `<div class="gr-card"><small>${t('geo.was')}</small><h3>${esc(cur.name)}<span>${esc(cur.country)}</span></h3>
      <div class="gr-stars">${[0, 1, 2].map(i => `<i class="${i < stars ? 'on' : ''}" style="animation-delay:${.6 + i * .15}s">★</i>`).join('')}</div>
      <div class="gr-nums"><div><b id="grKm">0</b><small>km ${t('geo.off')}</small></div><div><b id="grPts">0</b><small>${t('geo.points')}</small></div></div>
      <div class="gr-bar"><i style="--w:${pts / 50}%"></i></div>
      <button class="btn primary" id="geoNext">${round >= ROUNDS ? t('geo.final') : t('geo.next')} ${ic('chevron-right')}</button></div>`;
    res.hidden = false;
    requestAnimationFrame(() => res.classList.add('on'));
    countUp($('grKm'), Math.round(km), x => fmt(Math.round(x)), 1300);
    countUp($('grPts'), pts, x => fmt(Math.round(x)), 1500);
    countUp($('geoTotal'), total, x => fmt(Math.round(x)), 1500);
    $('geoNext').onclick = next;
    roundsBar();
  }

  function finish() {
    const max = ROUNDS * 5000, pct = total / max;
    const title = pct > .8 ? t('geo.r1') : pct > .6 ? t('geo.r2') : pct > .35 ? t('geo.r3') : t('geo.r4');
    let best = 0; try { best = +localStorage.getItem('kairo.geoBest') || 0; if (total > best) localStorage.setItem('kairo.geoBest', total); } catch {}
    const res = $('geoResult');
    res.innerHTML = `<div class="gr-card final"><div class="gr-trophy">${ic('trophy')}</div><small>${t('geo.end')}</small><h3>${title}</h3>
      <div class="gr-big" id="grTotal">0</div><small>${t('geo.of')} ${fmt(max)}${total > best ? ' · ' + t('geo.record') : best ? ' · ' + t('geo.best') + ' ' + fmt(best) : ''}</small>
      <div class="gr-list">${rounds.map((r, i) => `<span style="animation-delay:${.3 + i * .1}s"><b>${i + 1}</b>${fmt(r)}</span>`).join('')}</div>
      <button class="btn primary" id="geoAgain">${ic('refresh-cw')} ${t('geo.again')}</button></div>`;
    res.hidden = false; res.classList.add('on', 'final');
    countUp($('grTotal'), total, x => fmt(Math.round(x)), 1800);
    if (total > best) confetti(res);
    $('geoAgain').onclick = start;
  }
  function confetti(host) {
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('i'); c.className = 'confetti';
      c.style.cssText = `left:${50 + (Math.random() - .5) * 30}%;--x:${(Math.random() - .5) * 700}px;--y:${-200 - Math.random() * 400}px;--r:${Math.random() * 720}deg;background:hsl(${Math.random() * 360},90%,60%);animation-delay:${Math.random() * .2}s`;
      host.appendChild(c); setTimeout(() => c.remove(), 2400);
    }
  }

  async function start() {
    const el = shell();
    el.classList.add('on');
    round = 0; total = 0; rounds = [];
    $('geoTotal').textContent = '0';
    await initGlobe();
    next();
  }
  function close() { $('geoGame')?.classList.remove('on'); }
  return { start, close, guessAt: (lat, lng) => { place(lat, lng); submit(); } };
})();
