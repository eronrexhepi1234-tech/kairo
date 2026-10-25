// Solar system (real planet positions today) and the documentary / "what if" player.
const $p = id => document.getElementById(id);
const escP = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function pOverlay(id, cls) {
  let el = $p(id);
  if (el && el.dataset.closing) { el.remove(); el = null; } // a closing layer of the same kind: replace it now
  if (!el) { document.body.insertAdjacentHTML('beforeend', `<div class="xo ${cls || ''}" id="${id}"></div>`); el = $p(id); }
  requestAnimationFrame(() => el.classList.add('on'));
  return el;
}
function pClose(id, after) { const el = $p(id); if (!el) return; el.dataset.closing = '1'; el.removeAttribute('id'); el.classList.remove('on'); document.body.classList.remove('story-earth'); setTimeout(() => { after?.(); el.remove(); }, 500); }
const pWav = a => (/L16|pcm/i.test(a.mime) ? Voice.pcmToWavUrl(a.audio, +(a.mime.match(/rate=(\d+)/) || [])[1] || 24000) : `data:${a.mime};base64,${a.audio}`);

// ================= solar system =================
window.SolarSystem = (function () {
  const A = window.Astronomy;
  const PL = [
    ['Mercury', 'Merkur', 0.38, '#b9a89a', 'Der kleinste Planet und der sonnennächste. Ein Jahr dauert nur 88 Tage.'],
    ['Venus', 'Venus', 0.95, '#e8c68a', 'Der heisseste Planet: über 460 °C, wegen dicker Wolken aus Schwefelsäure.'],
    ['Earth', 'Erde', 1, '#4f9bff', 'Unser Zuhause – der einzige bekannte Planet mit Leben.'],
    ['Mars', 'Mars', 0.53, '#e2683c', 'Der rote Planet. Hier steht der höchste Vulkan im Sonnensystem: Olympus Mons, 22 km hoch.'],
    ['Jupiter', 'Jupiter', 3.4, '#d9a877', 'Der grösste Planet. Der Grosse Rote Fleck ist ein Sturm, grösser als die Erde.'],
    ['Saturn', 'Saturn', 2.9, '#e6cf96', 'Berühmt für seine Ringe aus Eis und Gestein. Er würde in Wasser schwimmen.'],
    ['Uranus', 'Uranus', 1.8, '#9fe3e8', 'Er rollt auf der Seite um die Sonne – seine Achse ist um 98° gekippt.'],
    ['Neptune', 'Neptun', 1.75, '#5b7cff', 'Hier wehen die schnellsten Winde: bis 2100 km/h.']
  ];
  let renderer, scene, camera, raf = 0, bodies = [], sun, t = new Date(), speed = 0, rotY = 0.6, rotX = 0.42, dist = 34, target = null, selected = null, dragging = null;
  const scaleR = au => Math.sqrt(au) * 7.5; // distances: square root, so all planets fit on screen

  function build() {
    const T = window.THREE, el = $p('ssCanvas');
    renderer = new T.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(50, 1, 0.1, 2000);
    // stars
    const g = new T.BufferGeometry(), pos = [];
    for (let i = 0; i < 4000; i++) { const r = 400 + Math.random() * 400, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1); pos.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)); }
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false, transparent: true, opacity: .8 })));
    scene.add(new T.AmbientLight(0x404050, 0.6));
    scene.add(new T.PointLight(0xfff2d0, 1.15, 0, 0));
    // sun with glow
    sun = new T.Mesh(new T.SphereGeometry(2.4, 48, 48), new T.MeshBasicMaterial({ color: 0xffc44d }));
    scene.add(sun);
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(255,220,120,1)'); gr.addColorStop(.25, 'rgba(255,170,60,.6)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return new T.CanvasTexture(c); })();
    const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, transparent: true, depthWrite: false }));
    glow.scale.set(16, 16, 1); sun.add(glow);
    // planets + orbit rings
    for (const [id, name, size, col, info] of PL) {
      const r = size * 0.42 + 0.25;
      const m = new T.Mesh(new T.SphereGeometry(r, 32, 32), new T.MeshStandardMaterial({ color: col, roughness: .85, metalness: 0, emissive: new T.Color(col).multiplyScalar(.08) }));
      scene.add(m);
      if (id === 'Saturn') { const ring = new T.Mesh(new T.RingGeometry(r * 1.4, r * 2.3, 64), new T.MeshBasicMaterial({ color: 0xe6d4a6, side: T.DoubleSide, transparent: true, opacity: .55 })); ring.rotation.x = 1.2; m.add(ring); }
      // orbit: sample the real path over one orbital period
      const pts = [], period = { Mercury: 88, Venus: 225, Earth: 365, Mars: 687, Jupiter: 4333, Saturn: 10759, Uranus: 30687, Neptune: 60190 }[id];
      for (let i = 0; i <= 128; i++) { const v = A.HelioVector(A.Body[id], new Date(Date.now() + (i / 128) * period * 864e5)); const d = Math.hypot(v.x, v.y, v.z), s = scaleR(d) / d; pts.push(new T.Vector3(v.x * s, v.z * s, -v.y * s)); }
      const orbit = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: col, transparent: true, opacity: .28 }));
      scene.add(orbit);
      const label = document.createElement('div'); label.className = 'ss-label'; label.textContent = name; $p('ssLabels').appendChild(label);
      label.onclick = () => select(bodies.find(b => b.id === id));
      bodies.push({ id, name, info, mesh: m, label, r });
    }
    // the moon next to the earth
    const earth = bodies.find(b => b.id === 'Earth');
    const moon = new T.Mesh(new T.SphereGeometry(0.14, 16, 16), new T.MeshStandardMaterial({ color: 0xdddddd, roughness: 1 }));
    earth.mesh.add(moon); earth.moon = moon;
  }
  function place() {
    for (const b of bodies) {
      const v = A.HelioVector(A.Body[b.id], t), d = Math.hypot(v.x, v.y, v.z), s = scaleR(d) / d;
      b.mesh.position.set(v.x * s, v.z * s, -v.y * s);
      b.au = d;
      b.mesh.rotation.y += 0.01;
    }
    const e = bodies.find(b => b.id === 'Earth');
    if (e?.moon) { const a = (t.getTime() / 864e5) / 27.3 * 6.283; e.moon.position.set(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9); }
  }
  function frame() {
    if (!$p('ssCanvas')) return;
    const T = window.THREE, el = $p('ssCanvas'), W = el.clientWidth, H = el.clientHeight;
    if (renderer.domElement.width !== Math.floor(W * renderer.getPixelRatio())) { renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
    if (speed) { t = new Date(t.getTime() + speed * 864e5 / 60); $p('ssDate').textContent = t.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' }); }
    place();
    if (!dragging && !selected) rotY += 0.0008;
    const look = selected ? selected.mesh.position : new T.Vector3();
    target = target ? target.lerp(look, 0.06) : look.clone();
    const dd = selected ? Math.max(3, selected.r * 9) : dist;
    camera.position.set(target.x + dd * Math.cos(rotX) * Math.sin(rotY), target.y + dd * Math.sin(rotX), target.z + dd * Math.cos(rotX) * Math.cos(rotY));
    camera.lookAt(target);
    sun.rotation.y += 0.002;
    renderer.render(scene, camera);
    // html labels
    for (const b of bodies) {
      const p = b.mesh.getWorldPosition(new T.Vector3()).project(camera);
      const vis = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
      b.label.style.display = vis ? '' : 'none';
      if (vis) b.label.style.transform = `translate(${(p.x + 1) / 2 * W}px, ${(1 - p.y) / 2 * H}px)`;
      b.label.classList.toggle('sel', b === selected);
    }
    raf = requestAnimationFrame(frame);
  }
  function select(b) {
    selected = b;
    const box = $p('ssInfo');
    if (!b) { box.classList.remove('on'); return; }
    const g = A.GeoVector(A.Body[b.id], t, true), km = b.id === 'Earth' ? 0 : Math.hypot(g.x, g.y, g.z) * 149597870.7;
    const light = km / 299792.458, rocket = km / 58000 / 24; // fastest spacecraft so far ~58,000 km/h on the way
    box.innerHTML = `<button class="ss-x" id="ssBack">✕</button><small>Planet</small><h2>${escP(b.name)}</h2><p>${escP(b.info)}</p>
      <div class="ss-facts">${b.id === 'Earth' ? `<div><b>${b.au.toFixed(3)} AE</b><small>von der Sonne</small></div>` : `
        <div><b>${(km / 1e6).toLocaleString('de-CH', { maximumFractionDigits: 1 })} Mio. km</b><small>von der Erde, heute</small></div>
        <div><b>${light < 3600 ? (light / 60).toFixed(1) + ' min' : (light / 3600).toFixed(1) + ' h'}</b><small>braucht das Licht</small></div>
        <div><b>${rocket < 365 ? Math.round(rocket) + ' Tage' : (rocket / 365).toFixed(1) + ' Jahre'}</b><small>mit einer Rakete</small></div>`}</div>
      <button class="btn" id="ssAsk">Mehr über ${escP(b.name)}</button>`;
    box.classList.add('on');
    $p('ssBack').onclick = () => select(null);
    $p('ssAsk').onclick = () => { close(); window.App.askInChat(`Erzähl mir spannende Dinge über den Planeten ${b.name}.`); };
  }
  function open(planet) {
    if (!window.THREE || !window.Astronomy) { window.toast('3D nicht verfügbar'); return; }
    const el = pOverlay('ssOverlay', 'ss');
    el.innerHTML = `<canvas id="ssCanvas"></canvas><div id="ssLabels"></div>
      <div class="ss-top"><div><small>Sonnensystem · echte Positionen</small><b id="ssDate">${t.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })}</b></div>
        <div class="seg" id="ssSpeed"><button data-s="0" class="active">Heute</button><button data-s="1">1 Tag/s</button><button data-s="30">1 Monat/s</button><button data-s="365">1 Jahr/s</button></div>
        <button class="fx-x" id="ssX">✕</button></div>
      <div class="ss-info" id="ssInfo"></div>`;
    bodies = []; t = new Date(); speed = 0; selected = null; target = null;
    build();
    $p('ssX').onclick = close;
    $p('ssSpeed').querySelectorAll('button').forEach(b => b.onclick = () => { speed = +b.dataset.s; if (!speed) t = new Date(); $p('ssSpeed').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); });
    const cv = $p('ssCanvas');
    cv.onpointerdown = e => { dragging = { x: e.clientX, y: e.clientY, moved: false }; cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => { if (!dragging) return; const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y; if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true; rotY -= dx * 0.005; rotX = Math.max(-1.2, Math.min(1.4, rotX + dy * 0.005)); dragging.x = e.clientX; dragging.y = e.clientY; };
    cv.onpointerup = e => {
      const was = dragging; dragging = null;
      if (was?.moved) return;
      // click: pick the planet
      const T = window.THREE, r = cv.getBoundingClientRect(), ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
      const hit = ray.intersectObjects(bodies.map(b => b.mesh))[0];
      select(hit ? bodies.find(b => b.mesh === hit.object) : null);
    };
    cv.onwheel = e => { dist = Math.max(8, Math.min(80, dist * (e.deltaY > 0 ? 1.1 : 0.9))); };
    cancelAnimationFrame(raf); frame();
    if (planet) { const n = String(planet).toLowerCase(); const b = bodies.find(x => x.name.toLowerCase() === n || x.id.toLowerCase() === n); if (b) setTimeout(() => select(b), 600); }
  }
  function close() { cancelAnimationFrame(raf); pClose('ssOverlay', () => { renderer?.dispose(); renderer = null; }); }
  return { open, close };
})();

// ================= documentary & "what if" player =================
window.StoryPlayer = (function () {
  let run = 0, audio = null;
  async function open(kind, topic) {
    const id = ++run;
    const el = pOverlay('stOverlay', 'stp');
    el.innerHTML = `<div class="stp-bg" id="stpBg"></div><div class="stp-shade"></div>
      <div class="stp-title" id="stpTitle"><small>${kind === 'whatif' ? 'Was wäre wenn …' : 'Kairo Doku'}</small><h1>${escP(topic)}</h1><div class="stp-load"><i></i><i></i><i></i></div><span>${kind === 'whatif' ? 'Kairo denkt es durch…' : 'Kairo recherchiert…'}</span></div>
      <div class="stp-scene" id="stpScene" hidden><div class="stp-stat" id="stpStat"></div><h2 id="stpCap"></h2><p id="stpSub"></p></div>
      <div class="stp-dots" id="stpDots"></div>
      <div class="stp-ctl"><button id="stpPrev">⏮</button><button id="stpPause">⏸</button><button id="stpNext">⏭</button><button id="stpX">✕</button></div>`;
    $p('stpX').onclick = close;
    const r = await window.kairo.ex.story(kind, topic);
    if (id !== run || !$p('stOverlay')) return null;
    if (!r.ok) { $p('stpTitle').querySelector('span').textContent = '✕ ' + r.error.message; return null; }
    const st = r.story;
    $p('stpTitle').innerHTML = `<small>${kind === 'whatif' ? 'Was wäre wenn …' : 'Kairo Doku'}</small><h1>${[...escP(st.title)].map((c, i) => `<span style="animation-delay:${i * 28}ms">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</h1><p>${escP(st.subtitle || '')}</p>`;
    $p('stpDots').innerHTML = st.scenes.map(() => '<i></i>').join('');
    // narration for each scene, fetched ahead
    const voice = st.scenes.map(sc => window.kairo.ex.narrate(sc.narration).catch(() => null));
    await new Promise(res => setTimeout(res, 3200));
    $p('stpTitle').classList.add('out');
    let i = 0, paused = false, skip = 0;
    $p('stpPause').onclick = () => { paused = !paused; $p('stpPause').textContent = paused ? '▶' : '⏸'; if (audio) paused ? audio.pause() : audio.play(); };
    $p('stpNext').onclick = () => { skip = 1; audio?.pause(); };
    $p('stpPrev').onclick = () => { skip = -1; audio?.pause(); };
    while (i < st.scenes.length && id === run) {
      const sc = st.scenes[i];
      $p('stpDots').querySelectorAll('i').forEach((d, j) => d.className = j < i ? 'done' : j === i ? 'on' : '');
      // background: real place on the 3D Earth, or a photo with a slow zoom
      const bg = $p('stpBg');
      if (sc.place) {
        $p('stOverlay').classList.add('earth'); document.body.classList.add('story-earth'); Earth.panel().classList.remove('open');
        window.App.go('earth');
        Earth.flyToName(`${sc.place} | ${sc.zoom || 'city'}`);
      } else {
        $p('stOverlay').classList.remove('earth'); document.body.classList.remove('story-earth');
        bg.innerHTML = sc.img ? `<img src="${escP(sc.img)}" alt="">` : `<div class="stp-art" style="--h:${(i * 57) % 360}"></div>`;
      }
      const scene = $p('stpScene'); scene.hidden = false; scene.classList.remove('in'); void scene.offsetWidth; scene.classList.add('in');
      $p('stpCap').textContent = sc.caption || ''; $p('stpStat').textContent = sc.stat || ''; $p('stpSub').textContent = '';
      // spoken narration + typed subtitles
      const a = await voice[i];
      if (id !== run) return st;
      const text = sc.narration || '';
      let dur = Math.max(5000, text.length * 65);
      if (a?.audio) { audio = new Audio(pWav(a)); audio.play().catch(() => {}); await new Promise(res => { audio.onloadedmetadata = () => { dur = audio.duration * 1000 + 600; res(); }; setTimeout(res, 800); }); }
      const t0 = Date.now(); skip = 0;
      while (Date.now() - t0 < dur && !skip && id === run) {
        if (!paused) { const n = Math.min(text.length, Math.ceil((Date.now() - t0) / (dur - 400) * text.length)); $p('stpSub') && ($p('stpSub').textContent = text.slice(0, n)); }
        await new Promise(res => setTimeout(res, 80));
        if (paused) { const p0 = Date.now(); while (paused && id === run) await new Promise(res => setTimeout(res, 100)); dur += Date.now() - p0; }
      }
      audio?.pause();
      i = Math.max(0, i + (skip === -1 ? -1 : 1));
    }
    if (id === run) { $p('stpScene').hidden = true; $p('stOverlay').classList.remove('earth'); $p('stpTitle').classList.remove('out'); $p('stpTitle').innerHTML = `<small>Ende</small><h1>${escP(st.title)}</h1><button class="btn primary" id="stpAgain">Nochmal ansehen</button>`; $p('stpAgain').onclick = () => open(kind, topic); }
    return st;
  }
  function close() { run++; audio?.pause(); pClose('stOverlay'); }
  return { open, close, doc: t => open('doc', t), whatIf: t => open('whatif', t) };
})();
