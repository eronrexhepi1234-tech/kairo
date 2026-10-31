// Roblox Studio assistant: describe it -> Kairo plans parts + scripts -> 3D preview -> one click builds it in Studio.
window.RobloxUI = (function () {
  const $r = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const IDEAS = ['Obby mit 10 Levels, Checkpoints und Lava', 'Kleines Haus mit Möbeln und Garten', 'Coins zum Einsammeln mit Punkte-Leaderboard', 'Tag-Nacht-Zyklus', 'Tür, die sich bei Berührung öffnet', 'Turm-Parkour mit Neon-Plattformen', 'Rennstrecke mit Startlinie', 'Shop-GUI mit Coins'];
  let P = null, mode = 'build', timer = 0, three = null;
  function open(prompt) {
    let el = $r('rbOverlay');
    if (!el) { document.body.insertAdjacentHTML('beforeend', '<div class="xo rbo" id="rbOverlay"></div>'); el = $r('rbOverlay'); }
    requestAnimationFrame(() => el.classList.add('on'));
    el.innerHTML = `<div class="rb-wrap"><button class="fx-x rb-x" id="rbX">✕</button>
      <aside class="rb-side"><div class="rb-head"><span>${ic('gamepad-2')}</span><div><small>Kairo ×</small><b>Roblox Studio</b></div></div>
        <div class="rb-status" id="rbStatus"><span class="rb-dot"></span><b>Prüfe Verbindung…</b></div>
        <div class="rb-install" id="rbInstall" hidden></div>
        <label class="rb-lbl">Was soll Kairo bauen?</label>
        <textarea class="field" id="rbQ" rows="3" placeholder="z. B. Ein Obby mit 10 Levels, Checkpoints und Lava, die tötet"></textarea>
        <div class="rb-modes" id="rbModes"><button data-m="build" class="on">${ic('pickaxe')} Bauen + Skripte</button><button data-m="script">${ic('terminal')} Nur Skript</button></div>
        <button class="btn primary rb-go" id="rbGo">${ic('wand-sparkles')} Bauplan erstellen</button>
        <div class="rb-ideas">${IDEAS.map(i => `<button>${esc(i)}</button>`).join('')}</div></aside>
      <section class="rb-main" id="rbMain"><div class="rb-empty"><div class="rb-cubes">${'<i></i>'.repeat(9)}</div><b>Hier erscheint die 3D-Vorschau</b><small>Erst ansehen, dann mit einem Klick in Roblox Studio bauen. Alles geht mit Ctrl+Z rückgängig.</small></div></section></div>`;
    $r('rbX').onclick = close;
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; el.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelectorAll('.rb-ideas button').forEach(b => b.onclick = () => { $r('rbQ').value = b.textContent; make(); });
    $r('rbGo').onclick = make;
    poll(); clearInterval(timer); timer = setInterval(poll, 2000);
    if (prompt) { $r('rbQ').value = prompt; make(); }
  }
  function close() { clearInterval(timer); stop3d(); const el = $r('rbOverlay'); if (!el) return; el.classList.remove('on'); setTimeout(() => el.remove(), 400); }
  async function poll() {
    const r = await window.kairo.roblox.status(); if (!r.ok || !$r('rbStatus')) return;
    const st = $r('rbStatus');
    st.className = 'rb-status ' + (r.connected ? 'on' : r.installed ? 'wait' : 'off');
    st.innerHTML = `<span class="rb-dot"></span><div><b>${r.connected ? 'Mit Roblox Studio verbunden' : r.installed ? 'Warte auf Roblox Studio…' : 'Plugin noch nicht installiert'}</b><small>${r.connected ? 'Ort: ' + esc(r.studio?.place || '') + (r.studio?.selection?.length ? ' · ausgewählt: ' + esc(r.studio.selection.slice(0, 2).join(', ')) : '') : r.installed ? 'Studio öffnen (oder neu starten) und einen Ort öffnen' : 'Einmal installieren, dann Studio neu starten'}</small></div>`;
    const ins = $r('rbInstall');
    ins.hidden = r.connected;
    if (!r.connected) ins.innerHTML = `${r.installed ? '' : `<button class="btn primary" id="rbInst">${ic('download')} Plugin installieren</button>`}
      <ol><li>${r.installed ? '✓ Plugin ist installiert' : 'Auf „Plugin installieren“ klicken'}</li><li>Roblox Studio öffnen oder <b>neu starten</b></li><li>Oben im Tab <b>Plugins</b> ist der Knopf <b>Kairo</b> – er muss blau (an) sein</li><li>Beim ersten Mal fragt Studio, ob das Plugin auf <b>127.0.0.1</b> zugreifen und Skripte einfügen darf → <b>Erlauben</b></li></ol>`;
    $r('rbInst') && ($r('rbInst').onclick = async () => { const x = await window.kairo.roblox.install(); window.toast(x.ok ? 'Plugin installiert – jetzt Roblox Studio (neu) starten' : '✕ ' + x.error.message); poll(); });
    const b = $r('rbBuild'); if (b) b.disabled = !r.connected;
  }
  async function make() {
    const q = $r('rbQ').value.trim(); if (!q) return window.toast('Beschreib zuerst, was gebaut werden soll');
    stop3d();
    $r('rbMain').innerHTML = `<div class="rb-wait"><div class="rb-cubes spin">${'<i></i>'.repeat(9)}</div><b>Kairo plant deinen Bau…</b><small>${esc(q)}</small></div>`;
    $r('rbGo').disabled = true;
    const r = await window.kairo.roblox.plan({ prompt: q, mode });
    $r('rbGo').disabled = false;
    if (!$r('rbMain')) return;
    if (!r.ok) { $r('rbMain').innerHTML = `<div class="rb-wait"><b>✕ ${esc(r.error.message)}</b></div>`; return; }
    P = r.plan; show();
  }
  function show() {
    const conn = $r('rbStatus')?.classList.contains('on');
    $r('rbMain').innerHTML = `<div class="rb-top"><div><small>Bauplan</small><h2>${esc(P.title)}</h2><p>${esc(P.summary || '')}</p></div>
        <div class="rb-stats"><span>${ic('box')} ${P.parts.length} Teile</span><span>${ic('terminal')} ${P.scripts.length} Skripte</span></div></div>
      ${P.parts.length ? '<div class="rb-3d" id="rb3d"></div>' : ''}
      <div class="rb-act"><button class="btn primary" id="rbBuild" ${conn ? '' : 'disabled'}>${ic('pickaxe')} In Roblox Studio bauen</button><button class="btn" id="rbAgain">${ic('refresh-cw')} Neuer Plan</button><span class="rb-hint">${conn ? 'Wird vor deiner Kamera gebaut · Ctrl+Z macht es rückgängig' : 'Zuerst Roblox Studio verbinden'}</span></div><div id="rbLog"></div>
      ${P.scripts.length ? `<h3>Skripte</h3><div class="rb-scripts">${P.scripts.map((s, i) => `<details ${i === 0 ? 'open' : ''}><summary>${ic('file-text')}<b>${esc(s.name)}</b><small>${esc(s.type)} · ${esc(s.parent)}</small></summary><pre>${esc(s.source)}</pre></details>`).join('')}</div>` : ''}
      ${P.test?.length ? `<h3>So testest du es</h3><ol class="rb-test">${P.test.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}`;
    $r('rbAgain').onclick = make;
    $r('rbBuild').onclick = async () => {
      const b = $r('rbBuild'); b.disabled = true; b.innerHTML = `<span class="pro-spin"></span> Baue in Studio…`;
      const r = await window.kairo.roblox.build(P);
      b.disabled = false; b.innerHTML = `${ic('pickaxe')} Nochmal bauen`;
      const res = r.ok ? r.result : null;
      $r('rbLog').innerHTML = r.ok && res.ok ? `<div class="rb-ok">${ic('circle-check')}<div><b>In Roblox Studio gebaut!</b>${(res.log || []).map(l => `<small>${esc(l)}</small>`).join('')}</div></div>` : `<div class="rb-err">${ic('triangle-alert')}<div><b>Hat nicht geklappt</b><small>${esc(r.ok ? (res.log || []).join(' ') : r.error.message)}</small></div></div>`;
      if (r.ok && res.ok) window.Party?.fireworks?.('Gebaut!', P.title, 3500);
    };
    if (P.parts.length) preview();
  }
  // 3D preview of the parts with three.js, slowly rotating
  function preview() {
    const box = $r('rb3d'); if (!box || !window.THREE) return;
    const T = window.THREE, w = box.clientWidth, h = box.clientHeight;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(devicePixelRatio); renderer.setSize(w, h); box.appendChild(renderer.domElement);
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(45, w / h, 0.5, 5000);
    scene.add(new T.HemisphereLight(0xbfdfff, 0x30281e, 1.1)); const sun = new T.DirectionalLight(0xffffff, 1.1); sun.position.set(80, 160, 60); scene.add(sun);
    const group = new T.Group(); scene.add(group);
    const min = new T.Vector3(Infinity, Infinity, Infinity), max = new T.Vector3(-Infinity, -Infinity, -Infinity);
    P.parts.forEach((p, i) => {
      const s = (p.size || [4, 4, 4]).map(Number), pos = (p.pos || [0, 0, 0]).map(Number);
      const geo = p.shape === 'Ball' ? new T.SphereGeometry(s[0] / 2, 18, 14) : p.shape === 'Cylinder' ? new T.CylinderGeometry(s[1] / 2, s[1] / 2, s[0], 20) : new T.BoxGeometry(s[0], s[1], s[2]);
      const neon = /neon/i.test(p.material || '');
      const mat = new T.MeshStandardMaterial({ color: p.color || '#cccccc', roughness: /metal|foil/i.test(p.material || '') ? .3 : .8, metalness: /metal|foil/i.test(p.material || '') ? .6 : 0, emissive: neon ? (p.color || '#ffffff') : '#000000', emissiveIntensity: neon ? .8 : 0, transparent: (+p.transparency || 0) > 0 || /glass/i.test(p.material || ''), opacity: /glass/i.test(p.material || '') ? .45 : 1 - (+p.transparency || 0) });
      const m = new T.Mesh(geo, mat);
      m.position.set(pos[0], pos[1], pos[2]);
      if (p.shape === 'Cylinder') m.rotation.z = Math.PI / 2;
      if (p.rot) m.rotation.set(...(p.rot.map(x => (+x || 0) * Math.PI / 180)));
      m.scale.setScalar(0.001); m.userData.delay = i * 12;
      group.add(m);
      min.min(new T.Vector3(pos[0] - s[0] / 2, pos[1] - s[1] / 2, pos[2] - s[2] / 2)); max.max(new T.Vector3(pos[0] + s[0] / 2, pos[1] + s[1] / 2, pos[2] + s[2] / 2));
    });
    const c = min.clone().add(max).multiplyScalar(.5), size = max.clone().sub(min).length() || 50;
    group.position.sub(c); group.position.y += (max.y - min.y) / 2 - (c.y - min.y);
    const grid = new T.GridHelper(Math.max(100, size * 1.4), 24, 0x3a4152, 0x22262f); grid.position.y = -(c.y - min.y) + min.y - min.y; scene.add(grid);
    let t0 = performance.now(), raf = 0;
    const frame = now => {
      if (!document.body.contains(renderer.domElement)) { renderer.dispose(); return; }
      const el = (now - t0);
      group.children.forEach(m => { const k = Math.min(1, Math.max(0, (el - m.userData.delay) / 350)); m.scale.setScalar(k < 1 ? 1 - Math.pow(1 - k, 3) : 1); });
      const a = el / 9000; cam.position.set(Math.cos(a) * size * .95, size * .55, Math.sin(a) * size * .95); cam.lookAt(0, 0, 0);
      renderer.render(scene, cam); raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    three = { renderer, stop: () => cancelAnimationFrame(raf) };
  }
  function stop3d() { if (three) { three.stop(); three.renderer.dispose(); three = null; } }
  return { open };
})();
