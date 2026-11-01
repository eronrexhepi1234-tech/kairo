// Logo & banner maker, Minecraft builder, inventor mode and the Social Studio (vertical promo videos about Kairo).
const $q = id => document.getElementById(id);
const escQ = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function qOverlay(id, cls) {
  let el = $q(id);
  if (el && el.dataset.closing) { el.remove(); el = null; }
  if (!el) { document.body.insertAdjacentHTML('beforeend', `<div class="xo qs ${cls || ''}" id="${id}"></div>`); el = $q(id); }
  requestAnimationFrame(() => el.classList.add('on'));
  return el;
}
function qClose(id, after) { const el = $q(id); if (!el) return; el.dataset.closing = '1'; el.removeAttribute('id'); el.classList.remove('on'); setTimeout(() => { after?.(); el.remove(); }, 500); }
const qWait = (msg) => `<div class="qs-wait"><div class="qs-spin"><i></i><i></i><i></i></div><b>${escQ(msg)}</b></div>`;
const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
const b64Of = canvas => canvas.toDataURL('image/png').split(',')[1];

// only shapes, no scripts or links, before an AI-made SVG is shown
function cleanSvg(svg) {
  const doc = new DOMParser().parseFromString(String(svg || ''), 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') return '';
  root.querySelectorAll('script, foreignObject, image, iframe, a, use, style, animate, set').forEach(n => n.remove());
  for (const n of [root, ...root.querySelectorAll('*')]) for (const a of [...n.attributes]) { if (/^on/i.test(a.name) || /href/i.test(a.name) || /javascript:/i.test(a.value)) n.removeAttribute(a.name); }
  root.removeAttribute('width'); root.removeAttribute('height');
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', '0 0 512 512');
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(root);
}
const svgImage = svg => loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));

// ================= Logo & banner maker =================
window.LogoMaker = (function () {
  let R = null, pick = 0;
  async function open(brief) {
    const el = qOverlay('lgOverlay', 'lg');
    if (!brief) {
      el.innerHTML = `<div class="qs-ask"><button class="fx-x" data-x>✕</button><div class="qs-badge">${ic('palette')}</div><h2>Logo & Banner</h2><p>Für deinen YouTube-, TikTok- oder Discord-Kanal, ein Team oder eine Idee.</p>
        <form id="lgForm"><input class="field" id="lgIn" placeholder="z. B. Gaming-Kanal „NovaPlays“, Farben Lila und Neon" autofocus><button class="btn primary">${ic('wand-sparkles')} Entwerfen</button></form>
        <div class="qs-sugg">${['Gaming-Kanal mit Drachen', 'Fussball-Team FC Blitz', 'Kairo AI', 'Minecraft-Server „Skyland“', 'Rap-Künstler „Arbi“'].map(s => `<button>${escQ(s)}</button>`).join('')}</div></div>`;
      el.querySelector('[data-x]').onclick = () => qClose('lgOverlay');
      $q('lgForm').onsubmit = e => { e.preventDefault(); const v = $q('lgIn').value.trim(); if (v) open(v); };
      el.querySelectorAll('.qs-sugg button').forEach(b => b.onclick = () => open(b.textContent));
      setTimeout(() => $q('lgIn')?.focus(), 200);
      return null;
    }
    el.innerHTML = qWait('Kairo entwirft 3 Logos…');
    const r = await window.kairo.st.logos(brief);
    if (!$q('lgOverlay')) return null;
    if (!r.ok) { el.innerHTML = `<div class="qs-ask"><button class="fx-x" data-x>✕</button><b>✕ ${escQ(r.error.message)}</b></div>`; el.querySelector('[data-x]').onclick = () => qClose('lgOverlay'); return null; }
    R = r.result; R.logos = (R.logos || []).map(l => ({ ...l, svg: cleanSvg(l.svg) })).filter(l => l.svg);
    pick = 0;
    el.innerHTML = `<div class="lg-wrap"><div class="lg-head"><div><small>Logo-Studio</small><h2>${escQ(R.name)}</h2><p>${escQ(R.tagline || '')}</p></div><button class="fx-x" data-x>✕</button></div>
      <div class="lg-cards">${R.logos.map((l, i) => `<button class="lg-card ${i === 0 ? 'on' : ''}" data-i="${i}" style="--bg:${escQ(l.bg || '#111')};animation-delay:${i * 120}ms"><div class="lg-svg">${l.svg}</div><span>${escQ(l.style || 'Entwurf ' + (i + 1))}</span><div class="lg-cols">${(l.colors || []).map(c => `<i style="background:${escQ(c)}"></i>`).join('')}</div></button>`).join('')}</div>
      <h3>Vorschau</h3><div class="lg-prev" id="lgPrev"></div>
      <div class="lg-act"><button class="btn primary" id="lgSave">${ic('download')} Alle Grössen speichern</button><button class="btn lg-web" id="lgWeb">${ic('globe')} Website daraus bauen</button><button class="btn" id="lgAgain">${ic('refresh-cw')} Neue Entwürfe</button></div></div>`;
    el.querySelector('[data-x]').onclick = () => qClose('lgOverlay');
    el.querySelectorAll('.lg-card').forEach(b => b.onclick = () => { pick = +b.dataset.i; el.querySelectorAll('.lg-card').forEach(x => x.classList.toggle('on', x === b)); preview(); });
    $q('lgAgain').onclick = () => open(brief);
    $q('lgSave').onclick = save;
    $q('lgWeb').onclick = () => { const l = R.logos[pick]; qClose('lgOverlay'); setTimeout(() => Builder.fromLogo(R, l), 350); };
    preview();
    return R;
  }
  // banner sizes
  const SIZES = [['YouTube-Banner', 2560, 1440], ['Discord-Banner', 960, 540], ['X / Twitter-Header', 1500, 500], ['Profilbild', 800, 800]];
  async function render(w, h, round) {
    const l = R.logos[pick], c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), cols = l.colors?.length ? l.colors : ['#ff7a45', '#7a5cff'];
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, l.bg || '#111'); bg.addColorStop(1, cols[1] || cols[0]); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // soft shapes
    g.globalAlpha = .18; cols.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(w * (0.15 + i * 0.35), h * (i % 2 ? 0.85 : 0.1), Math.max(w, h) * 0.28, 0, 7); g.fill(); }); g.globalAlpha = 1;
    const im = await svgImage(l.svg);
    if (round) { const s = Math.min(w, h) * 0.8; if (im) g.drawImage(im, (w - s) / 2, (h - s) / 2, s, s); }
    else {
      const s = h * (w / h > 2.5 ? 0.62 : 0.42), safeW = w * 0.55, x0 = (w - safeW) / 2; // YouTube: important stuff in the middle
      if (im) g.drawImage(im, x0, (h - s) / 2, s, s);
      g.fillStyle = '#fff'; g.textBaseline = 'middle';
      g.font = `800 ${Math.round(h * 0.11)}px 'Space Grotesk Var', Arial, sans-serif`; g.fillText(R.name, x0 + s + h * 0.05, h * 0.46, safeW - s - h * 0.05);
      g.globalAlpha = .85; g.font = `500 ${Math.round(h * 0.045)}px 'Inter Var', Arial, sans-serif`; g.fillText(R.tagline || '', x0 + s + h * 0.05, h * 0.58, safeW - s - h * 0.05); g.globalAlpha = 1;
    }
    return c;
  }
  async function preview() {
    const box = $q('lgPrev'); if (!box) return;
    box.innerHTML = SIZES.map(([n], i) => `<figure style="animation-delay:${i * 90}ms"><div class="lg-ph" id="lgp${i}"></div><figcaption>${n}</figcaption></figure>`).join('');
    for (const [i, [, w, h]] of SIZES.entries()) { const c = await render(w, h, i === 3); c.className = i === 3 ? 'round' : ''; $q('lgp' + i)?.appendChild(c); }
  }
  async function save() {
    $q('lgSave').disabled = true;
    const files = [];
    const logo = await render(1024, 1024, true); files.push({ name: 'Logo.png', data: b64Of(logo) });
    for (const [n, w, h] of SIZES) files.push({ name: n.replace(/[^\wäöü-]+/gi, '_') + '.png', data: b64Of(await render(w, h, n === 'Profilbild')) });
    const svgFile = { name: 'Logo.svg', data: btoa(unescape(encodeURIComponent(R.logos[pick].svg))) };
    const r = await window.kairo.st.saveImages(['Logos', R.name], [...files, svgFile]);
    $q('lgSave').disabled = false;
    if (r.ok) { window.toast('✓ Gespeichert in Bilder/Kairo/Logos'); window.kairo.st.reveal(r.paths[0]); }
  }
  return { open };
})();

// ================= Minecraft builder =================
window.McBuilder = (function () {
  const COL = { stone: '#7d7d7d', cobblestone: '#6f6f6f', stone_bricks: '#7a7a7a', mossy_stone_bricks: '#6f7d5c', deepslate_bricks: '#474749', bricks: '#96503f', sandstone: '#d8cb9b', smooth_sandstone: '#dccf9f', quartz_block: '#ece6df', polished_andesite: '#848686', oak_planks: '#a2834f', spruce_planks: '#735531', dark_oak_planks: '#4c3220', birch_planks: '#c4b47d', oak_log: '#6b5332', spruce_log: '#3b2a17', glass: '#bfe6f5', white_stained_glass: '#f0f0f0', light_blue_stained_glass: '#8ec5e6', white_concrete: '#cfd5d6', gray_concrete: '#373a3e', black_concrete: '#08090d', red_concrete: '#8e2121', blue_concrete: '#2c2e8f', yellow_concrete: '#f0af15', green_concrete: '#495b24', orange_concrete: '#e06101', white_wool: '#e9ecec', red_wool: '#a02722', gold_block: '#f6d03d', iron_block: '#dcdcdc', diamond_block: '#62dbd5', emerald_block: '#2ad467', obsidian: '#100c1c', glowstone: '#fbd979', sea_lantern: '#acc7be', oak_leaves: '#3f7a23', grass_block: '#5d9b3b', water: '#3f76e4', lava: '#e8761a', snow_block: '#f9fefe', ice: '#91b7fd', terracotta: '#985e43', red_terracotta: '#8f3d2e', prismarine: '#63a18e', end_stone_bricks: '#dadb9d', purpur_block: '#a97ea9', netherrack: '#6f3534', nether_bricks: '#2c161a', copper_block: '#c06b4f', oxidized_copper: '#52a284' };
  let B = null, renderer, scene, camera, raf = 0, rot = 0.8, tilt = 0.55, zoom = 1, maxY = 99, mesh = null, drag = null;
  async function open(idea) {
    const el = qOverlay('mcOverlay', 'mc');
    if (!idea) {
      el.innerHTML = `<div class="qs-ask mcask"><button class="fx-x" data-x>✕</button><div class="qs-badge">${ic('pickaxe')}</div><h2>Minecraft-Bauplaner</h2><p>Beschreib dein Bauwerk – Kairo plant es Block für Block, mit 3D-Vorschau und Befehlen.</p>
        <form id="mcForm"><input class="field" id="mcIn" placeholder="z. B. eine mittelalterliche Burg mit 4 Türmen" autofocus><button class="btn primary">${ic('wand-sparkles')} Planen</button></form>
        <div class="qs-sugg">${['Burg mit Türmen und Burggraben', 'Modernes Haus mit Pool', 'Japanischer Tempel', 'Leuchtturm am Meer', 'Weltraum-Rakete', 'Gemütliche Holzhütte'].map(s => `<button>${escQ(s)}</button>`).join('')}</div></div>`;
      el.querySelector('[data-x]').onclick = close;
      $q('mcForm').onsubmit = e => { e.preventDefault(); const v = $q('mcIn').value.trim(); if (v) open(v); };
      el.querySelectorAll('.qs-sugg button').forEach(b => b.onclick = () => open(b.textContent));
      setTimeout(() => $q('mcIn')?.focus(), 200);
      return null;
    }
    el.innerHTML = qWait('Kairo plant dein Bauwerk…');
    const r = await window.kairo.st.minecraft(idea);
    if (!$q('mcOverlay')) return null;
    if (!r.ok) { el.innerHTML = `<div class="qs-ask"><button class="fx-x" data-x>✕</button><b>✕ ${escQ(r.error.message)}</b></div>`; el.querySelector('[data-x]').onclick = close; return null; }
    B = r.build;
    const top = Math.max(...B.boxes.map(b => Math.max(b.from[1], b.to[1])));
    maxY = top;
    el.innerHTML = `<div class="mc-wrap"><div class="mc-3d"><canvas id="mcCanvas"></canvas>
        <div class="mc-layer"><small>Ebene</small><input type="range" id="mcY" min="0" max="${top}" value="${top}"><b id="mcYv">alle</b></div><div class="mc-hint">Ziehen = drehen · Mausrad = zoomen</div></div>
      <aside class="mc-side"><button class="fx-x" data-x>✕</button><small>Minecraft · ${B.boxes.length} Teile</small><h2>${escQ(B.title)}</h2><p>${escQ(B.description || '')}</p>
        <h4>${ic('list-checks')} So baust du es</h4><ol>${(B.steps || []).map(s => `<li>${escQ(s)}</li>`).join('')}</ol>
        <h4>${ic('package')} Material</h4><p class="muted small">${escQ(B.materials || '')}</p>
        <h4>${ic('terminal')} Befehle (${B.commands.length})</h4><pre class="mc-cmd">${escQ(B.commands.map(c => '/' + c).join('\n'))}</pre>
        <div class="mc-act"><button class="btn primary" id="mcCopy">${ic('copy')} Befehle kopieren</button><button class="btn" id="mcFile">${ic('folder-open')} Datei</button><button class="btn" id="mcNew">${ic('refresh-cw')}</button></div>
        <p class="muted small">Im Spiel: Cheats an, hinstellen, Befehle einfügen. Das Bauwerk entsteht 2 Blöcke vor dir.</p></aside></div>`;
    el.querySelector('[data-x]').onclick = close;
    $q('mcCopy').onclick = () => { navigator.clipboard.writeText(B.commands.map(c => '/' + c).join('\n')); window.toast('✓ Befehle kopiert'); };
    $q('mcFile').onclick = () => window.kairo.st.reveal(B.file);
    $q('mcNew').onclick = () => open(idea);
    $q('mcY').oninput = e => { maxY = +e.target.value; $q('mcYv').textContent = maxY >= top ? 'alle' : maxY + 1; build(); };
    init(); build();
    return B;
  }
  function init() {
    const T = window.THREE, cv = $q('mcCanvas');
    renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    scene = new T.Scene(); camera = new T.PerspectiveCamera(45, 1, 0.1, 1000);
    scene.add(new T.HemisphereLight(0xdfefff, 0x55452f, 1.0));
    const sun = new T.DirectionalLight(0xffffff, 0.9); sun.position.set(30, 60, 20); scene.add(sun);
    const ground = new T.Mesh(new T.CylinderGeometry(40, 40, 0.6, 48), new T.MeshLambertMaterial({ color: 0x5d9b3b })); ground.position.y = -0.31; scene.add(ground);
    cv.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => { if (!drag) return; rot -= (e.clientX - drag.x) * 0.006; tilt = Math.max(0.1, Math.min(1.4, tilt + (e.clientY - drag.y) * 0.006)); drag = { x: e.clientX, y: e.clientY }; };
    cv.onpointerup = () => { drag = null; };
    cv.onwheel = e => { zoom = Math.max(0.4, Math.min(2.5, zoom * (e.deltaY > 0 ? 1.1 : 0.9))); };
    cancelAnimationFrame(raf); loop();
  }
  function build() {
    const T = window.THREE;
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    const vox = new Map();
    for (const b of B.boxes) {
      const [x0, x1] = [Math.min(b.from[0], b.to[0]), Math.max(b.from[0], b.to[0])], [y0, y1] = [Math.min(b.from[1], b.to[1]), Math.max(b.from[1], b.to[1])], [z0, z1] = [Math.min(b.from[2], b.to[2]), Math.max(b.from[2], b.to[2])];
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        if (b.hollow && x > x0 && x < x1 && y > y0 && y < y1 && z > z0 && z < z1) continue;
        const k = x + ',' + y + ',' + z;
        if (b.block === 'air') vox.delete(k); else vox.set(k, b.block);
        if (vox.size > 60000) break;
      }
    }
    const list = [...vox].filter(([k]) => +k.split(',')[1] <= maxY);
    const geo = new T.BoxGeometry(1, 1, 1), mat = new T.MeshLambertMaterial({ vertexColors: false });
    mesh = new T.InstancedMesh(geo, mat, list.length);
    const m = new T.Matrix4(), c = new T.Color();
    const sx = Math.max(...B.boxes.map(b => Math.max(b.from[0], b.to[0]))) / 2, sz = Math.max(...B.boxes.map(b => Math.max(b.from[2], b.to[2]))) / 2;
    list.forEach(([k, block], i) => { const [x, y, z] = k.split(',').map(Number); m.setPosition(x - sx, y + 0.5, z - sz); mesh.setMatrixAt(i, m); c.set(COL[block] || '#999'); c.offsetHSL(0, 0, (Math.random() - .5) * .04); mesh.setColorAt(i, c); });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    B._span = Math.max(sx, sz, 8);
  }
  function loop() {
    const cv = $q('mcCanvas'); if (!cv || !renderer) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.floor(W * renderer.getPixelRatio())) { renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
    if (!drag) rot += 0.003;
    const d = (B._span || 20) * 4.3 * zoom;
    camera.position.set(Math.sin(rot) * Math.cos(tilt) * d, Math.sin(tilt) * d + 4, Math.cos(rot) * Math.cos(tilt) * d);
    camera.lookAt(0, (B.size?.[1] || 10) / 3, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  function close() { cancelAnimationFrame(raf); qClose('mcOverlay', () => { renderer?.dispose(); renderer = null; }); }
  return { open, close };
})();

// ================= Inventor mode =================
window.Inventor = (function () {
  async function open(idea) {
    const el = qOverlay('ivOverlay', 'iv');
    if (!idea) {
      el.innerHTML = `<div class="qs-ask"><button class="fx-x" data-x>✕</button><div class="qs-badge">${ic('lightbulb')}</div><h2>Erfinder-Modus</h2><p>Deine Idee für eine App, ein Spiel, einen Kanal oder ein Business – Kairo macht einen Plan daraus.</p>
        <form id="ivForm"><input class="field" id="ivIn" placeholder="z. B. eine App, die Fussball-Trainings plant" autofocus><button class="btn primary">${ic('rocket')} Los</button></form>
        <div class="qs-sugg">${['YouTube-Kanal über Fussball-Tricks', 'App für Hausaufgaben mit Freunden', 'Eigenes Handy-Spiel', 'Sneaker-Reinigungs-Service', 'Discord-Bot für Gamer'].map(s => `<button>${escQ(s)}</button>`).join('')}</div></div>`;
      el.querySelector('[data-x]').onclick = () => qClose('ivOverlay');
      $q('ivForm').onsubmit = e => { e.preventDefault(); const v = $q('ivIn').value.trim(); if (v) open(v); };
      el.querySelectorAll('.qs-sugg button').forEach(b => b.onclick = () => open(b.textContent));
      setTimeout(() => $q('ivIn')?.focus(), 200);
      return null;
    }
    el.innerHTML = qWait('Kairo denkt wie ein Erfinder…');
    const r = await window.kairo.st.invent(idea);
    if (!$q('ivOverlay')) return null;
    if (!r.ok) { el.innerHTML = `<div class="qs-ask"><button class="fx-x" data-x>✕</button><b>✕ ${escQ(r.error.message)}</b></div>`; el.querySelector('[data-x]').onclick = () => qClose('ivOverlay'); return null; }
    const p = r.plan, c1 = p.colors?.[0] || '#ff7a45', c2 = p.colors?.[1] || '#7a5cff';
    el.innerHTML = `<div class="iv-wrap" style="--c1:${escQ(c1)};--c2:${escQ(c2)}"><button class="fx-x iv-x" data-x>✕</button>
      <section class="iv-hero"><span class="iv-emoji">${escQ(p.emoji || '💡')}</span><small>Erfinder-Modus</small><h1>${escQ(p.name)}</h1><h3>${escQ(p.slogan || '')}</h3><p>${escQ(p.pitch || '')}</p>
        <div class="iv-names">${(p.names || []).map(n => `<span>${escQ(n)}</span>`).join('')}</div></section>
      <section class="iv-grid"><div><h4>${ic('circle-help')} Problem</h4><p>${escQ(p.problem)}</p></div><div><h4>${ic('sparkles')} Lösung</h4><p>${escQ(p.solution)}</p></div>
        <div><h4>${ic('users')} Für wen</h4><p>${escQ(p.audience)}</p></div><div><h4>${ic('wallet')} Geld</h4><p>${escQ(p.money)}</p></div></section>
      <section><h2>Features</h2><div class="iv-feat">${(p.features || []).map((f, i) => `<div style="animation-delay:${i * 80}ms"><b>${i + 1}</b><span>${escQ(f)}</span></div>`).join('')}</div></section>
      <section><h2>Der Plan</h2><div class="iv-steps">${(p.steps || []).map((s, i) => `<div style="animation-delay:${i * 100}ms"><i></i><small>${escQ(s.when || '')}</small><b>${escQ(s.title)}</b><p>${escQ(s.text)}</p></div>`).join('')}</div></section>
      <section class="iv-grid"><div><h4>${ic('chart-column')} Kosten</h4><p>${escQ(p.costs)}</p></div><div><h4>${ic('shield')} Risiken</h4><ul>${(p.risks || []).map(x => `<li>${escQ(x)}</li>`).join('')}</ul></div></section>
      <section class="iv-today"><small>Heute in 30 Minuten</small><p>${escQ(p.first_task)}</p></section>
      <div class="iv-act"><button class="btn primary" id="ivLogo">${ic('palette')} Logo machen</button><button class="btn" id="ivPdf">${ic('file-text')} Als PDF</button><button class="btn" id="ivPpt">${ic('chart-column')} Präsentation</button></div></div>`;
    el.querySelector('[data-x]').onclick = () => qClose('ivOverlay');
    $q('ivLogo').onclick = () => { qClose('ivOverlay'); setTimeout(() => LogoMaker.open(`${p.name} – ${p.slogan}. ${p.pitch}. Farben ${p.colors?.join(', ') || ''}`), 400); };
    $q('ivPdf').onclick = async () => {
      const md = `# ${p.name}\n\n> ${p.slogan}\n\n${p.pitch}\n\n## Problem\n${p.problem}\n\n## Lösung\n${p.solution}\n\n## Für wen\n${p.audience}\n\n## Features\n${(p.features || []).map(f => '- ' + f).join('\n')}\n\n## Geld\n${p.money}\n\n## Plan\n${(p.steps || []).map((s, i) => `${i + 1}. **${s.title}** (${s.when}) – ${s.text}`).join('\n')}\n\n## Kosten\n${p.costs}\n\n## Risiken\n${(p.risks || []).map(x => '- ' + x).join('\n')}\n\n## Heute\n${p.first_task}`;
      const res = await window.kairo.action({ type: 'file', name: p.name + '.pdf', content: md });
      if (res.ok) { window.toast('PDF ✓'); window.kairo.action({ type: 'openfile', path: res.path }); }
    };
    $q('ivPpt').onclick = async () => { window.toast('Präsentation wird erstellt…'); const res = await window.kairo.create.pptx(`Pitch für ${p.name}: ${p.pitch}`, { slides: 8 }); if (res.ok) window.kairo.action({ type: 'openfile', path: res.path }); else window.toast('✕ ' + res.error.message); };
    return p;
  }
  return { open };
})();

// ================= Social Studio =================
window.SocialStudio = (function () {
  // only for the developer of Kairo (videos about Kairo itself)
  const dev = () => !!window.App?.settings?.()?.devMode;
  let busy = false;
  const KINDS = [['why', 'Warum Kairo?', 'rocket'], ['update', 'Update-Video', 'sparkles'], ['feature', 'Feature-Spotlight', 'scan-search'], ['tutorial', 'Kurz-Tutorial', 'graduation-cap']];
  function open() {
    if (!dev()) return window.toast('Das Social Studio gibt es nur im Entwickler-Modus (Einstellungen).');
    const el = qOverlay('soOverlay', 'so');
    el.innerHTML = `<div class="so-wrap"><button class="fx-x so-x" data-x>✕</button>
      <aside class="so-side"><small>Kairo Social Studio</small><h2>Videos für TikTok & YouTube</h2><p>Kairo macht ein fertiges Hochformat-Video über sich selbst – mit Stimme, Animationen und Untertiteln. Hochladen machst du selbst.</p>
        <div class="so-kinds">${KINDS.map(([k, l, i], n) => `<button data-k="${k}" class="${n === 0 ? 'on' : ''}">${ic(i)}<b>${l}</b></button>`).join('')}</div>
        <input class="field" id="soExtra" placeholder="Extra-Wunsch (optional), z. B. „über den Jarvis-Modus“">
        <button class="btn primary so-go" id="soGo">${ic('clapperboard')} Video erstellen</button>
        <div id="soOut"></div></aside>
      <div class="so-stage"><div class="so-phone"><canvas id="soCv" width="1080" height="1920"></canvas><div class="so-idle" id="soIdle">${ic('smartphone')}<span>Hier entsteht dein Video</span></div></div></div></div>`;
    el.querySelector('[data-x]').onclick = () => { if (!busy) qClose('soOverlay'); };
    let kind = 'why';
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { kind = b.dataset.k; el.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x === b)); });
    $q('soGo').onclick = () => make(kind, $q('soExtra').value.trim());
  }
  async function make(kind, extra) {
    if (busy) return; busy = true;
    const go = $q('soGo'); go.disabled = true; go.innerHTML = `${ic('clapperboard')} Schreibe das Drehbuch…`;
    $q('soOut').innerHTML = '';
    try {
      const r = await window.kairo.st.social(kind, extra);
      if (!r.ok) throw new Error(r.error.message);
      const S = r.script;
      // voice for every scene (+ hook and call to action)
      const lines = [S.hookSay || S.hook, ...S.scenes.map(s => s.say || s.title), S.ctaSay || S.cta];
      const ac = new AudioContext();
      // one line after another (all at once hits the voice rate limit), with retries
      let voiceErr = '';
      const voiceOf = async t => {
        for (let n = 0; n < 4; n++) {
          try {
            const a = await window.kairo.voice.speak(t);
            if (a.ok) { const url = /L16|pcm/i.test(a.mime) ? Voice.pcmToWavUrl(a.audio, +(a.mime.match(/rate=(\d+)/) || [])[1] || 24000) : `data:${a.mime};base64,${a.audio}`; return await ac.decodeAudioData(await (await fetch(url)).arrayBuffer()); }
            voiceErr = a.error?.code === 'NO_KEY' ? 'NO_KEY' : (a.error?.message || '');
            if (voiceErr === 'NO_KEY') return null;
          } catch (e) { voiceErr = e.message; }
          if (n < 3) await new Promise(r => setTimeout(r, [3000, 8000, 15000][n]));
        }
        return null;
      };
      const bufs = [];
      for (let k = 0; k < lines.length; k++) { go.innerHTML = `${ic('mic')} Nimmt die Stimme auf… ${k + 1}/${lines.length}`; bufs.push(await voiceOf(lines[k])); }
      const missing = bufs.filter(b => !b).length;
      if (missing === bufs.length) throw new Error(voiceErr === 'NO_KEY' ? 'Für die Stimme brauchst du einen Gemini- oder OpenAI-Schlüssel (Einstellungen).' : 'Die Stimme hat nicht geklappt (' + (/429|quota|exhaust|rate/i.test(voiceErr) ? 'Tageslimit der KI-Stimme erreicht – später nochmal versuchen' : voiceErr.slice(0, 120)) + ').');
      if (missing) window.toast(`${missing} von ${bufs.length} Sätzen ohne Stimme`);
      // the AI voice often has silence at the start/end: cut it so the video stays snappy
      const trim = b => { if (!b) return b; const d = b.getChannelData(0), th = 0.015; let a = 0, e = d.length - 1; while (a < e && Math.abs(d[a]) < th) a++; while (e > a && Math.abs(d[e]) < th) e--; a = Math.max(0, a - b.sampleRate * 0.03); e = Math.min(d.length - 1, e + b.sampleRate * 0.12); if (e - a < b.sampleRate * 0.2) return b; const nb = ac.createBuffer(b.numberOfChannels, e - a, b.sampleRate); for (let c = 0; c < b.numberOfChannels; c++) nb.copyToChannel(b.getChannelData(c).slice(a, e), c); return nb; };
      for (let k = 0; k < bufs.length; k++) bufs[k] = trim(bufs[k]);
      const shots = await Promise.all(S.scenes.map(async s => (s.shot ? loadImg(await window.kairo.st.shot(s.shot) || '') : null)));
      const logo = await loadImg('assets/icon.png');
      go.innerHTML = `${ic('circle-dot')} Video wird aufgenommen…`;
      $q('soIdle')?.remove();
      const file = await record(S, bufs, shots, logo, ac);
      go.innerHTML = `${ic('clapperboard')} Neues Video`; go.disabled = false;
      $q('soOut').innerHTML = `<div class="so-done"><b>${ic('circle-check')} Video fertig!</b>
        <label>TikTok-Text</label><textarea class="field" rows="3" id="soTk">${escQ(S.tiktok?.caption || '')}</textarea>
        <label>YouTube-Titel</label><input class="field" id="soYtT" value="${escQ(S.youtube?.title || '')}">
        <label>YouTube-Beschreibung</label><textarea class="field" rows="3" id="soYtD">${escQ(S.youtube?.description || '')}</textarea>
        <div class="so-btns"><button class="btn" id="soFile">${ic('folder-open')} Video zeigen</button><button class="btn primary" id="soTik">${ic('external-link')} Auf TikTok hochladen</button><button class="btn primary" id="soYt">${ic('external-link')} Auf YouTube hochladen</button></div>
        <div id="soYtHelp"></div>
        <p class="muted small">Tipp: Text kopieren → beim Hochladen einfügen. Kairo postet nie selbst.</p></div>`;
      $q('soFile').onclick = () => window.kairo.st.reveal(file);
      $q('soTik').onclick = () => { navigator.clipboard.writeText($q('soTk').value); window.toast('TikTok-Text kopiert'); window.kairo.action({ type: 'open', url: 'https://www.tiktok.com/upload' }); window.kairo.st.reveal(file); };
      // YouTube: open the upload dialog, show the file, then a step list with one copy button per field
      $q('soYt').onclick = () => {
        const copy = (txt, b) => { navigator.clipboard.writeText(txt); $q('soYtHelp').querySelectorAll('.so-cp').forEach(x => x.classList.toggle('on', x === b)); window.toast('Kopiert – jetzt bei YouTube einfügen (Strg+V)'); };
        $q('soYtHelp').innerHTML = `<ol class="so-steps">
          <li>Ziehe das Video aus dem Ordner in das YouTube-Fenster.</li>
          <li>Titel: <button class="btn so-cp on" id="soCpT">${ic('copy')} Titel kopieren</button></li>
          <li>Beschreibung: <button class="btn so-cp" id="soCpD">${ic('copy')} Beschreibung kopieren</button></li>
          <li>Bei „Speziell für Kinder?“ wähle „Nein“, dann 3× „Weiter“.</li>
          <li>Wähle „Öffentlich“ und klicke „Veröffentlichen“.</li></ol>`;
        $q('soCpT').onclick = e => copy($q('soYtT').value, e.currentTarget);
        $q('soCpD').onclick = e => copy($q('soYtD').value, e.currentTarget);
        navigator.clipboard.writeText($q('soYtT').value);
        window.toast('Titel kopiert');
        window.kairo.action({ type: 'open', url: 'https://www.youtube.com/upload' });
        window.kairo.st.reveal(file);
      };
    } catch (e) { window.toast('✕ ' + e.message); go.disabled = false; go.innerHTML = `${ic('clapperboard')} Video erstellen`; }
    busy = false;
  }
  // draws the video into the canvas while recording it: beat music + voice, word-by-word captions, motion design
  function record(S, bufs, shots, logo, ac) {
    return new Promise(async resolve => {
      const cv = $q('soCv'), g = cv.getContext('2d'), W = 1080, H = 1920;
      const accRaw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), acc = /^#[0-9a-f]{6}$/i.test(accRaw) ? accRaw : '#ff7a45', acc2 = '#8b5cff';
      const lines = [S.hookSay || S.hook, ...S.scenes.map(s => s.say || s.title), S.ctaSay || S.cta];
      const parts = [{ type: 'hook', text: S.hook }, ...S.scenes.map((s, i) => ({ type: 'scene', s, shot: shots[i] })), { type: 'cta', text: S.cta }];
      parts.forEach((p, i) => { p.say = lines[i] || ''; const raw = bufs[i]?.duration || 0, max = p.type === 'hook' ? 3 : p.type === 'cta' ? 4 : 5.2; p.rate = raw > max ? Math.min(1.18, raw / max) : 1; p.vdur = raw / p.rate; p.dur = Math.max(p.type === 'scene' ? 3 : 2.2, p.vdur + 0.4); });
      let t = 0; parts.forEach(p => { p.start = t; t += p.dur; });
      const total = t + 0.4, BPM = 112, beat = 60 / BPM;
      // word timings for the captions (spread over the voice by word length)
      parts.forEach(p => { const ws = String(p.say).split(/\s+/).filter(Boolean), sum = ws.reduce((a, w) => a + w.length + 2, 0) || 1, span = (p.vdur || p.dur * 0.8) * 0.96; let x = 0.15; p.words = ws.map(w => { const d = (w.length + 2) / sum * span, o = { w, t0: x, t1: x + d }; x += d; return o; }); });

      // ---------- audio: voice + synthesized beat, music ducks under the voice ----------
      const dest = ac.createMediaStreamDestination();
      const out = ac.createGain(); out.connect(dest); out.connect(ac.destination);
      const music = ac.createGain(); music.connect(out);
      const t0 = ac.currentTime + 0.3;
      music.gain.setValueAtTime(0.22, t0);
      parts.forEach(p => { if (p.vdur) { const a = t0 + p.start + 0.2; music.gain.setTargetAtTime(0.075, a, 0.05); music.gain.setTargetAtTime(0.22, a + p.vdur + 0.1, 0.15); } });
      music.gain.setTargetAtTime(0, t0 + total - 0.5, 0.2);
      const noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const kick = at => { const o = ac.createOscillator(), e = ac.createGain(); o.frequency.setValueAtTime(140, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.18); e.gain.setValueAtTime(0.9, at); e.gain.exponentialRampToValueAtTime(0.001, at + 0.32); o.connect(e).connect(music); o.start(at); o.stop(at + 0.35); };
      const noise = (at, len, freq, vol, type = 'highpass') => { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain(); s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; e.gain.setValueAtTime(vol, at); e.gain.exponentialRampToValueAtTime(0.001, at + len); s.connect(f).connect(e).connect(music); s.start(at); s.stop(at + len + 0.02); };
      const note = (at, f, len, vol, type = 'sawtooth', cut = 900) => { const o = ac.createOscillator(), fl = ac.createBiquadFilter(), e = ac.createGain(); o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut; e.gain.setValueAtTime(0.0001, at); e.gain.exponentialRampToValueAtTime(vol, at + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, at + len); o.connect(fl).connect(e).connect(music); o.start(at); o.stop(at + len + 0.05); };
      const CH = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]; // Am F C G
      for (let b = 0, bt = 0; bt < total; b++, bt = b * beat) {
        const at = t0 + bt, bar = Math.floor(b / 4) % 4;
        if (b % 2 === 0) kick(at); else noise(at, 0.16, 1500, 0.35, 'bandpass');
        noise(at + beat / 2, 0.05, 7000, 0.12); noise(at, 0.04, 8000, 0.08);
        note(at, CH[bar][0] / 4, beat * 0.9, 0.22, 'sawtooth', 380);
        if (b % 4 === 0) CH[bar].forEach(f => note(at, f, beat * 3.8, 0.035, 'triangle', 1800));
      }
      parts.forEach((p, i) => { if (i) noise(t0 + p.start - 0.25, 0.35, 900, 0.18, 'bandpass'); }); // whoosh into every scene
      kick(t0 + 0.02);
      parts.forEach((p, i) => { if (bufs[i]) { const src = ac.createBufferSource(); src.buffer = bufs[i]; src.playbackRate.value = p.rate; src.connect(out); src.start(t0 + p.start + 0.2); } });

      const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 9e6 });
      const chunks = []; rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = async () => {
        // plain type for the file (the codec list contains a comma, which would break the data URL)
        const blob = new Blob(chunks, { type: mime.split(';')[0] });
        const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => { const u = String(fr.result); r(u.slice(u.indexOf('base64,') + 7)); }; fr.readAsDataURL(blob); });
        if (b64.length < 1000) { ac.close(); resolve(null); window.toast('✕ Video leer – bitte nochmal'); return; }
        const sv = await window.kairo.st.saveVideo(b64, mime.includes('mp4') ? 'mp4' : 'webm', S.youtube?.title || 'Kairo');
        ac.close(); resolve(sv.path);
      };
      rec.start();

      // ---------- drawing helpers ----------
      const clamp = x => Math.min(1, Math.max(0, x)), ease = x => 1 - Math.pow(1 - clamp(x), 3);
      const back = x => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
      const FONT = (w, s) => `${w} ${s}px 'Space Grotesk Var', 'Inter Var', Arial`;
      const wrap = (txt, maxW, font) => { g.font = font; const words = String(txt || '').split(' '), out = []; let line = ''; for (const w of words) { const tl = line ? line + ' ' + w : w; if (g.measureText(tl).width > maxW && line) { out.push(line); line = w; } else line = tl; } if (line) out.push(line); return out; };
      const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
      const grad = (x0, x1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, acc); gr.addColorStop(1, acc2); return gr; };
      const dots = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 3, v: 10 + Math.random() * 40 }));
      const confetti = Array.from({ length: 90 }, () => ({ x: W / 2, y: H * 0.42, vx: (Math.random() - .5) * 1600, vy: -600 - Math.random() * 1200, r: Math.random() * 6, c: [acc, acc2, '#3ddc97', '#ffd27a', '#4fc3ff'][Math.floor(Math.random() * 5)] }));
      // words that pop in one after another; "key" gets a gradient pill
      function popWords(text, y, size, lt, key, perWord = 0.13) {
        const lines = wrap(text, W - 150, FONT(900, size)); let n = 0;
        lines.forEach((l, li) => {
          g.font = FONT(900, size); const ws = l.split(' '), widths = ws.map(w => g.measureText(w + ' ').width), lw = widths.reduce((a, b) => a + b, 0);
          let x = (W - lw) / 2;
          ws.forEach((w, wi) => {
            const k = back((lt - n * perWord) / 0.32), yy = y + li * size * 1.12;
            if (k > 0) {
              g.save(); g.translate(x + widths[wi] / 2, yy); g.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k); g.globalAlpha *= clamp(k * 1.5);
              const isKey = key && w.replace(/[^\p{L}\d]/gu, '').toLowerCase() === String(key).replace(/[^\p{L}\d]/gu, '').toLowerCase();
              if (isKey) { const ww = widths[wi] - size * 0.25; g.fillStyle = grad(-ww / 2, ww / 2); rr(-ww / 2 - 18, -size * 0.62, ww + 36, size * 1.12, 22); g.fill(); }
              g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FONT(900, size);
              g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 24; g.fillText(w, 0, 0); g.shadowBlur = 0;
              g.restore();
            }
            x += widths[wi]; n++;
          });
        });
        return lines.length;
      }
      // CapCut-style captions: 3-4 words at a time, the spoken word highlighted
      function captions(p, lt) {
        if (!p.words?.length) return;
        const vt = lt - 0.2, i = p.words.findIndex(w => vt >= w.t0 && vt < w.t1), cur = i < 0 ? (vt < p.words[0].t0 ? -1 : p.words.length - 1) : i;
        if (cur < 0) return;
        const start = Math.floor(cur / 3) * 3, chunk = p.words.slice(start, start + 3);
        g.font = FONT(900, 70); g.textBaseline = 'middle'; g.textAlign = 'left';
        const widths = chunk.map(w => g.measureText(w.w.toUpperCase() + ' ').width), lw = widths.reduce((a, b) => a + b, 0);
        const fit = Math.min(1, (W - 120) / lw); g.save(); g.translate(W / 2, 0); g.scale(fit, fit); g.translate(-W / 2, 0); let x = (W - lw) / 2; const y = (H - 330) / fit;
        chunk.forEach((w, k) => {
          const on = start + k === cur, pop = on ? back((vt - w.t0) / 0.18) : 1;
          g.save(); g.translate(x + widths[k] / 2, y); g.scale(on ? 0.9 + 0.12 * pop : 1, on ? 0.9 + 0.12 * pop : 1);
          if (on) { g.fillStyle = acc; rr(-widths[k] / 2 - 4, -46, widths[k] - 8, 92, 18); g.fill(); }
          g.lineWidth = 12; g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineJoin = 'round'; g.textAlign = 'center';
          const txt = w.w.toUpperCase(); g.strokeText(txt, -g.measureText(' ').width / 2, 0); g.fillStyle = start + k <= cur ? '#fff' : 'rgba(255,255,255,.55)'; g.fillText(txt, -g.measureText(' ').width / 2, 0);
          g.restore(); x += widths[k];
        });
        g.restore();
      }

      const frame = () => {
        const now = ac.currentTime - t0;
        if (now > total) { rec.stop(); return; }
        const pi = Math.max(0, parts.findIndex(q => now >= q.start && now < q.start + q.dur)), p = parts[pi] || parts[parts.length - 1], lt = now - p.start;
        const bp = (now % beat) / beat, pulse = Math.pow(1 - bp, 3);
        // background: dark gradient, glowing blobs on the beat, synthwave grid, particles
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#07070e'); bg.addColorStop(1, '#140a24'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        [[acc, .2, .25], [acc2, .78, .55], ['#4fc3ff', .3, .85]].forEach(([c, fx, fy], k) => { const x = W * (fx + 0.12 * Math.sin(now * 0.5 + k * 2)), y = H * (fy + 0.05 * Math.cos(now * 0.4 + k)), r = 620 + 80 * pulse; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c + '55'); gr.addColorStop(1, 'transparent'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
        g.save(); g.strokeStyle = `rgba(139,92,255,${0.18 + 0.12 * pulse})`; g.lineWidth = 2; const hz = H * 0.74;
        for (let k = 0; k < 14; k++) { const z = ((k + (now * 1.6) % 1) / 14), y = hz + Math.pow(z, 2.2) * (H - hz); g.globalAlpha = z; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        g.globalAlpha = 0.5; for (let k = -10; k <= 10; k++) { g.beginPath(); g.moveTo(W / 2 + k * 30, hz); g.lineTo(W / 2 + k * 260, H); g.stroke(); } g.restore();
        dots.forEach(d => { d.y -= d.v / 30; if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; } g.fillStyle = `rgba(255,255,255,${0.15 + 0.25 * pulse})`; g.beginPath(); g.arc(d.x, d.y, d.s, 0, 7); g.fill(); });

        // zoom punch + flash at the start of every part
        const punch = 1 + 0.12 * (1 - ease(lt / 0.35)), shake = lt < 0.25 ? (1 - lt / 0.25) * 10 : 0;
        g.save(); g.translate(W / 2 + (Math.random() - .5) * shake, H / 2 + (Math.random() - .5) * shake); g.scale(punch, punch); g.translate(-W / 2, -H / 2);
        if (lt < 0.18) g.filter = `blur(${(1 - lt / 0.18) * 8}px)`;
        if (p.type === 'hook') {
          if (logo) { const k = back(lt / 0.5); g.globalAlpha = clamp(k); g.drawImage(logo, W / 2 - 90 * k, 420 - 90 * k, 180 * k, 180 * k); g.globalAlpha = 1; }
          const n = popWords(p.text, H * 0.44, 132, lt - 0.1, p.text.split(' ').slice(-1)[0], 0.16);
          g.font = FONT(700, 40); g.fillStyle = 'rgba(255,255,255,.7)'; g.textAlign = 'center'; g.globalAlpha = ease((lt - 0.6) / 0.4); g.fillText('KAIRO AI', W / 2, H * 0.44 + n * 150 + 30); g.globalAlpha = 1;
        } else if (p.type === 'scene') {
          const s = p.s; const tl = popWords(s.title, 320, 100, lt, s.key, 0.11), subY = 320 + tl * 112 + 34;
          g.font = FONT(600, 46); g.fillStyle = '#c9d2e4'; g.textAlign = 'center'; g.globalAlpha = ease((lt - 0.45) / 0.4); const subL = wrap(s.sub, W - 180, FONT(600, 46)).slice(0, 2); subL.forEach((l, i) => g.fillText(l, W / 2, subY + i * 58)); g.globalAlpha = 1;
          if (p.shot) {
            // screenshot in a device frame that flies in tilted and then floats
            // the picture sits between the texts and the captions
            const top = Math.max(600, subY + subL.length * 58 + 30), k = ease(lt / 0.7), bh = Math.min(900, (W - 110) * p.shot.height / p.shot.width, H - 470 - top), bw = Math.min(W - 110, bh * p.shot.width / p.shot.height), x = (W - bw) / 2, y = top + (1 - k) * 500 + Math.sin(now * 1.4) * 8;
            const tilt = (1 - k) * 0.12 + Math.sin(now * 0.8) * 0.012;
            g.save(); g.translate(W / 2, y + bh / 2); g.rotate(tilt); g.transform(1, 0, -tilt * 0.6, 1, 0, 0); g.translate(-W / 2, -(y + bh / 2));
            g.globalAlpha = clamp(k * 1.4);
            const glow = g.createRadialGradient(W / 2, y + bh / 2, 0, W / 2, y + bh / 2, bw * 0.75); glow.addColorStop(0, acc + '66'); glow.addColorStop(1, 'transparent'); g.fillStyle = glow; g.fillRect(0, y - 200, W, bh + 400);
            g.fillStyle = '#0b0d14'; rr(x - 14, y - 14, bw + 28, bh + 28, 44); g.fill();
            g.save(); rr(x, y, bw, bh, 32); g.clip(); const z = 1.04 + lt * 0.03; g.drawImage(p.shot, x - (z - 1) * bw / 2, y - (z - 1) * bh / 2, bw * z, bh * z);
            const sheen = g.createLinearGradient(x, y, x + bw, y + bh); const sp = ((now * 0.35) % 1.6) - 0.3; sheen.addColorStop(clamp(sp - 0.1), 'transparent'); sheen.addColorStop(clamp(sp), 'rgba(255,255,255,.14)'); sheen.addColorStop(clamp(sp + 0.1), 'transparent'); g.fillStyle = sheen; g.fillRect(x, y, bw, bh);
            g.restore();
            g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 3; rr(x, y, bw, bh, 32); g.stroke();
            g.restore();
          }
          captions(p, lt);
        } else {
          // end card: logo with pulsing rings, gradient name, call to action, confetti
          const k = back(lt / 0.6), cx = W / 2, cy = H * 0.34;
          for (let r = 0; r < 3; r++) { const ph = ((now * 0.8 + r / 3) % 1); g.strokeStyle = acc; g.globalAlpha = (1 - ph) * 0.6; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 150 + ph * 260, 0, 7); g.stroke(); }
          g.globalAlpha = 1; if (logo) g.drawImage(logo, cx - 130 * k, cy - 130 * k, 260 * k, 260 * k);
          g.font = FONT(900, 170); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = grad(W / 2 - 300, W / 2 + 300); g.globalAlpha = clamp(k); g.fillText('Kairo', cx, H * 0.53); g.globalAlpha = 1;
          popWords(p.text, H * 0.63, 76, lt - 0.3, null, 0.1);
          const ck = ease((lt - 0.9) / 0.4); if (ck > 0) { g.globalAlpha = ck; g.font = FONT(800, 48); const tw = g.measureText('Gratis · Link in Bio').width + 90; g.fillStyle = '#fff'; rr(cx - tw / 2, H * 0.75 - 50, tw, 100, 50); g.fill(); g.fillStyle = '#111'; g.fillText('Gratis · Link in Bio', cx, H * 0.75 + 2); g.globalAlpha = 1; }
          confetti.forEach(c => { const tt = Math.max(0, lt - 0.2); const x = c.x + c.vx * tt * 0.6, y = c.y + c.vy * tt * 0.6 + 900 * tt * tt; if (y < H) { g.fillStyle = c.c; g.save(); g.translate(x, y); g.rotate(tt * 6 + c.r); g.fillRect(-9, -5, 18, 10); g.restore(); } });
          captions(p, lt);
        }
        g.filter = 'none'; g.restore();
        if (lt < 0.09) { g.fillStyle = `rgba(255,255,255,${(1 - lt / 0.09) * 0.3})`; g.fillRect(0, 0, W, H); }
        // story-style progress segments + watermark
        const segW = (W - 120 - (parts.length - 1) * 10) / parts.length;
        parts.forEach((q, k) => { const x = 60 + k * (segW + 10); g.fillStyle = 'rgba(255,255,255,.22)'; rr(x, 90, segW, 9, 5); g.fill(); const f = k < pi ? 1 : k === pi ? clamp(lt / q.dur) : 0; if (f > 0) { g.fillStyle = '#fff'; rr(x, 90, segW * f, 9, 5); g.fill(); } });
        g.font = FONT(700, 38); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('Kairo AI', 60, 150);
        requestAnimationFrame(frame);
      };
      frame();
    });
  }
  return { open, dev };
})();
