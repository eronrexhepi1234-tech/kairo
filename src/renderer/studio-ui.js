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
      <div class="lg-act"><button class="btn primary" id="lgSave">${ic('download')} Alle Grössen speichern</button><button class="btn" id="lgAgain">${ic('refresh-cw')} Neue Entwürfe</button></div></div>`;
    el.querySelector('[data-x]').onclick = () => qClose('lgOverlay');
    el.querySelectorAll('.lg-card').forEach(b => b.onclick = () => { pick = +b.dataset.i; el.querySelectorAll('.lg-card').forEach(x => x.classList.toggle('on', x === b)); preview(); });
    $q('lgAgain').onclick = () => open(brief);
    $q('lgSave').onclick = save;
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
  let busy = false;
  const KINDS = [['why', 'Warum Kairo?', 'rocket'], ['update', 'Update-Video', 'sparkles'], ['feature', 'Feature-Spotlight', 'scan-search'], ['tutorial', 'Kurz-Tutorial', 'graduation-cap']];
  function open() {
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
      go.innerHTML = `${ic('mic')} Nimmt die Stimme auf…`;
      // voice for every scene (+ hook and call to action)
      const lines = [S.hook, ...S.scenes.map(s => s.say || s.title), S.cta];
      const ac = new AudioContext();
      const bufs = await Promise.all(lines.map(async t => { try { const a = await window.kairo.voice.speak(t); if (!a.ok) return null; const url = /L16|pcm/i.test(a.mime) ? Voice.pcmToWavUrl(a.audio, +(a.mime.match(/rate=(\d+)/) || [])[1] || 24000) : `data:${a.mime};base64,${a.audio}`; return await ac.decodeAudioData(await (await fetch(url)).arrayBuffer()); } catch { return null; } }));
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
        <div class="so-btns"><button class="btn" id="soFile">${ic('folder-open')} Video zeigen</button><button class="btn primary" id="soTik">${ic('external-link')} Auf TikTok hochladen</button><button class="btn" id="soYt">${ic('external-link')} YouTube Studio</button></div>
        <p class="muted small">Tipp: Text kopieren → beim Hochladen einfügen. Kairo postet nie selbst.</p></div>`;
      $q('soFile').onclick = () => window.kairo.st.reveal(file);
      $q('soTik').onclick = () => { navigator.clipboard.writeText($q('soTk').value); window.toast('TikTok-Text kopiert'); window.kairo.action({ type: 'open', url: 'https://www.tiktok.com/upload' }); window.kairo.st.reveal(file); };
      $q('soYt').onclick = () => { navigator.clipboard.writeText($q('soYtT').value + '\n\n' + $q('soYtD').value); window.toast('YouTube-Text kopiert'); window.kairo.action({ type: 'open', url: 'https://studio.youtube.com' }); window.kairo.st.reveal(file); };
    } catch (e) { window.toast('✕ ' + e.message); go.disabled = false; go.innerHTML = `${ic('clapperboard')} Video erstellen`; }
    busy = false;
  }
  // draws the video into the canvas while recording it (with the voice track)
  function record(S, bufs, shots, logo, ac) {
    return new Promise(async resolve => {
      const cv = $q('soCv'), g = cv.getContext('2d'), W = 1080, H = 1920;
      const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a45';
      const parts = [{ type: 'hook', text: S.hook }, ...S.scenes.map((s, i) => ({ type: 'scene', s, shot: shots[i] })), { type: 'cta', text: S.cta }];
      parts.forEach((p, i) => { p.dur = Math.max(1.8, (bufs[i]?.duration || 2.2) + 0.35); });
      let t = 0; parts.forEach(p => { p.start = t; t += p.dur; });
      const total = t + 0.6;
      const dest = ac.createMediaStreamDestination();
      const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
      const chunks = []; rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: mime });
        const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
        const sv = await window.kairo.st.saveVideo(b64, mime.includes('mp4') ? 'mp4' : 'webm', S.youtube?.title || 'Kairo');
        ac.close(); resolve(sv.path);
      };
      const t0 = ac.currentTime + 0.25;
      parts.forEach((p, i) => { if (bufs[i]) { const src = ac.createBufferSource(); src.buffer = bufs[i]; src.connect(dest); src.connect(ac.destination); src.start(t0 + p.start); } });
      rec.start();
      const wrap = (txt, maxW, font) => { g.font = font; const words = String(txt || '').split(' '), out = []; let line = ''; for (const w of words) { const tl = line ? line + ' ' + w : w; if (g.measureText(tl).width > maxW && line) { out.push(line); line = w; } else line = tl; } if (line) out.push(line); return out; };
      const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
      const frame = () => {
        const now = ac.currentTime - t0;
        if (now > total) { rec.stop(); return; }
        // animated background
        const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b0d16'); bg.addColorStop(1, '#1b1030'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 3; i++) { const x = W * (0.2 + 0.6 * ((Math.sin(now * 0.4 + i * 2) + 1) / 2)), y = H * (0.15 + i * 0.33); const gr = g.createRadialGradient(x, y, 0, x, y, 600); gr.addColorStop(0, i === 1 ? 'rgba(122,92,255,.35)' : 'rgba(255,122,69,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
        const p = parts.find(q => now >= q.start && now < q.start + q.dur) || parts[parts.length - 1], lt = now - p.start, a = ease(lt / 0.45);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (p.type === 'hook' || p.type === 'cta') {
          if (logo) { const s = 260 * (0.8 + 0.2 * a); g.globalAlpha = a; g.drawImage(logo, W / 2 - s / 2, H * 0.3 - s / 2, s, s); }
          g.fillStyle = '#fff'; const lines = wrap(p.text, W - 160, `900 112px 'Space Grotesk Var', Arial`);
          lines.forEach((l, i) => { g.globalAlpha = ease((lt - i * 0.12) / 0.4); g.fillText(l, W / 2, H * 0.52 + i * 128 - (1 - a) * 60); });
          if (p.type === 'cta') { g.globalAlpha = a; g.font = `700 56px 'Inter Var', Arial`; g.fillStyle = acc; g.fillText('Kairo AI · gratis auf GitHub', W / 2, H * 0.8); }
          g.globalAlpha = 1;
        } else {
          const s = p.s;
          // screenshot in a rounded "window" with a slow zoom
          if (p.shot) {
            const bw = W - 120, bh = bw * p.shot.height / p.shot.width, x = 60, y = 360 + (1 - a) * 120, z = 1 + lt * 0.025;
            g.save(); g.globalAlpha = a; g.beginPath(); g.roundRect(x, y, bw, bh, 36); g.clip();
            g.drawImage(p.shot, x - (z - 1) * bw / 2, y - (z - 1) * bh / 2, bw * z, bh * z); g.restore();
            g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3; g.beginPath(); g.roundRect(x, y, bw, bh, 36); g.stroke();
          } else { g.globalAlpha = a; g.font = '260px serif'; g.fillText(s.emoji || '✨', W / 2, 640); g.globalAlpha = 1; }
          g.globalAlpha = a; g.font = '110px serif'; g.fillText(s.emoji || '', W / 2, 1170);
          g.fillStyle = '#fff'; wrap(s.title, W - 140, `900 104px 'Space Grotesk Var', Arial`).forEach((l, i) => g.fillText(l, W / 2, 1320 + i * 116));
          g.fillStyle = '#c9d2e4'; wrap(s.sub, W - 180, `500 52px 'Inter Var', Arial`).forEach((l, i) => { g.globalAlpha = ease((lt - 0.25) / 0.4); g.fillText(l, W / 2, 1560 + i * 66); });
          g.globalAlpha = 1;
        }
        // progress bar + watermark
        g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(60, 120, W - 120, 10); g.fillStyle = acc; g.fillRect(60, 120, (W - 120) * Math.min(1, now / total), 10);
        g.font = `700 40px 'Inter Var', Arial`; g.fillStyle = 'rgba(255,255,255,.7)'; g.textAlign = 'left'; g.fillText('Kairo AI', 60, 200);
        requestAnimationFrame(frame);
      };
      frame();
    });
  }
  return { open };
})();
