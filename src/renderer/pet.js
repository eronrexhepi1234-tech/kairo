// Desktop pet: a little creature that lives on your taskbar. It grows (egg -> baby -> junior -> dragon -> legend)
// when you learn, gets hungry, sleeps at night, dances to music and brings you new mail.
(async function () {
  const k = window.kairo.pet;
  const cv = document.getElementById('c'), g = cv.getContext('2d'), bub = document.getElementById('bub');
  const W = 230, H = 130, d = devicePixelRatio || 1;
  cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
  let P = await k.get();
  let area = await k.area();
  let x = window.screenX, dir = 1, mode = 'idle', modeUntil = 0, t0 = performance.now(), jump = 0, carry = false, music = false, flash = 0, parts = [], said = 0;
  const STAGE = { egg: 0, baby: 1, junior: 2, dragon: 3, legend: 4 };
  const NAMES = { egg: 'Ei', baby: 'Baby', junior: 'Junior', dragon: 'Drache', legend: 'Legende' };
  const night = () => { const h = new Date().getHours(); return h >= 22 || h < 7; };
  const setMode = (m, ms) => { mode = m; modeUntil = performance.now() + ms; };

  // ---------- drawing ----------
  function body(cx, cy, s, t) {
    const st = STAGE[P.stage] || 0;
    const hue = st >= 4 ? 45 : 175 + st * 25;
    const col = `hsl(${hue}, 75%, 58%)`, dark = `hsl(${hue}, 60%, 38%)`, belly = `hsl(${hue}, 80%, 82%)`;
    if (P.stage === 'egg') {
      const wob = Math.sin(t * 3) * (P.nextAt && P.xp > P.nextAt * 0.6 ? 0.12 : 0.04);
      g.save(); g.translate(cx, cy + 4); g.rotate(wob);
      const eg = g.createLinearGradient(0, -34, 0, 30); eg.addColorStop(0, '#fff8ea'); eg.addColorStop(1, '#e8d6b6');
      g.fillStyle = eg; g.beginPath(); g.ellipse(0, 0, 24, 31, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = col; [[-8, -12, 5], [9, 2, 6], [-4, 14, 4], [11, -16, 3]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); });
      if (P.nextAt && P.xp > P.nextAt * 0.5) { g.strokeStyle = '#8a7356'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-14, -6); g.lineTo(-6, -1); g.lineTo(-10, 5); g.lineTo(-2, 9); g.stroke(); }
      g.restore(); return;
    }
    const sz = [0, 0.75, 0.95, 1.1, 1.2][st] * s;
    // wings (dragon+)
    if (st >= 3) {
      const flap = Math.sin(t * (mode === 'dance' ? 14 : 6)) * 0.35;
      g.fillStyle = dark;
      for (const side of [-1, 1]) { g.save(); g.translate(cx + side * 16 * sz, cy - 12 * sz); g.rotate(side * (0.5 + flap)); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(side * 28 * sz, -24 * sz, side * 34 * sz, 4 * sz); g.quadraticCurveTo(side * 18 * sz, 0, 0, 10 * sz); g.fill(); g.restore(); }
    }
    // tail
    if (st >= 2) { g.strokeStyle = col; g.lineWidth = 7 * sz; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - dir * 18 * sz, cy + 10 * sz); g.quadraticCurveTo(cx - dir * 38 * sz, cy + 12 * sz + Math.sin(t * 4) * 5, cx - dir * 40 * sz, cy - 4 * sz); g.stroke(); }
    // feet
    const step = mode === 'walk' ? Math.sin(t * 12) * 4 : 0;
    g.fillStyle = dark; [[-10, step], [10, -step]].forEach(([fx, fy]) => { g.beginPath(); g.ellipse(cx + fx * sz, cy + 24 * sz + fy * 0.3, 7 * sz, 4.5 * sz, 0, 0, 7); g.fill(); });
    // body
    const bg = g.createRadialGradient(cx - 8 * sz, cy - 12 * sz, 4, cx, cy, 34 * sz); bg.addColorStop(0, `hsl(${hue}, 85%, 72%)`); bg.addColorStop(1, col);
    g.fillStyle = bg; g.beginPath(); g.ellipse(cx, cy, 26 * sz, 26 * sz * (mode === 'sleep' ? 0.88 : 1), 0, 0, 7); g.fill();
    g.fillStyle = belly; g.beginPath(); g.ellipse(cx + dir * 3, cy + 8 * sz, 15 * sz, 13 * sz, 0, 0, 7); g.fill();
    // horns (junior+), crown (legend)
    if (st >= 2) { g.fillStyle = '#fff3d6'; for (const side of [-1, 1]) { g.beginPath(); g.moveTo(cx + side * 9 * sz, cy - 22 * sz); g.lineTo(cx + side * 15 * sz, cy - 36 * sz); g.lineTo(cx + side * 17 * sz, cy - 20 * sz); g.fill(); } }
    if (st >= 4) { g.fillStyle = '#ffd24a'; g.beginPath(); const cy2 = cy - 34 * sz; g.moveTo(cx - 12, cy2 + 8); g.lineTo(cx - 12, cy2 - 2); g.lineTo(cx - 6, cy2 + 3); g.lineTo(cx, cy2 - 6); g.lineTo(cx + 6, cy2 + 3); g.lineTo(cx + 12, cy2 - 2); g.lineTo(cx + 12, cy2 + 8); g.fill(); }
    // face
    const ex = cx + dir * 6 * sz, ey = cy - 6 * sz, blink = (t % 4) < 0.12;
    if (mode === 'sleep') { g.strokeStyle = '#1b2230'; g.lineWidth = 2; for (const o of [-8, 8]) { g.beginPath(); g.arc(ex + o * sz, ey, 4 * sz, 0.2, Math.PI - 0.2); g.stroke(); } }
    else for (const o of [-8, 8]) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex + o * sz, ey, 6.5 * sz, blink ? 1 : 7.5 * sz, 0, 0, 7); g.fill();
      if (!blink) { g.fillStyle = '#1b2230'; g.beginPath(); g.arc(ex + o * sz + dir * 1.5, ey + 1, 3.6 * sz, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + o * sz + dir * 2.5, ey - 1.5, 1.3 * sz, 0, 7); g.fill(); }
    }
    // mouth + cheeks
    const happy = P.joy > 45 || mode === 'happy' || mode === 'dance';
    g.strokeStyle = '#1b2230'; g.lineWidth = 2; g.beginPath();
    if (happy) g.arc(ex, ey + 9 * sz, 4.5 * sz, 0.15, Math.PI - 0.15); else g.arc(ex, ey + 14 * sz, 4 * sz, Math.PI + 0.3, -0.3);
    g.stroke();
    g.fillStyle = 'rgba(255,120,140,.45)'; for (const o of [-14, 14]) { g.beginPath(); g.ellipse(ex + o * sz, ey + 7 * sz, 4 * sz, 2.5 * sz, 0, 0, 7); g.fill(); }
    // letter in the hands
    if (carry) { g.save(); g.translate(cx + dir * 22 * sz, cy + 6 * sz); g.rotate(dir * -0.2); g.fillStyle = '#fff'; g.fillRect(-11, -7, 22, 15); g.strokeStyle = '#ff7a45'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-11, -7); g.lineTo(0, 2); g.lineTo(11, -7); g.stroke(); g.restore(); }
    // hunger icon
    if (P.food < 30 && mode !== 'sleep') { g.font = '14px sans-serif'; g.fillText('🍖', cx + 22 * sz, cy - 26 * sz + Math.sin(t * 3) * 3); }
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    g.clearRect(0, 0, W, H);
    // behaviour
    if (now > modeUntil && !['carry'].includes(mode)) {
      if (night() || P.joy < 20) setMode('sleep', 20000);
      else if (music) setMode('dance', 8000);
      else setMode(Math.random() < 0.45 ? 'walk' : 'idle', 3000 + Math.random() * 6000);
      if (mode === 'walk' && Math.random() < 0.4) dir *= -1;
    }
    if (mode === 'walk' || mode === 'carry') {
      const speed = mode === 'carry' ? 1.6 : 0.8;
      x += dir * speed;
      const min = area.x, max = area.x + area.width - W;
      if (x < min || x > max) { x = Math.max(min, Math.min(max, x)); dir *= -1; if (mode === 'carry') { mode = 'idle'; } }
      k.move(x, area.y + area.height - (H + 80));
    }
    let cy = 70 - (mode === 'dance' ? Math.abs(Math.sin(t * 7)) * 12 : 0) - (mode === 'idle' ? Math.sin(t * 2) * 1.5 : 0);
    if (jump > 0) { cy -= Math.sin(jump * Math.PI) * 26; jump = Math.max(0, jump - 0.03); }
    // shadow
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(W / 2, 112, 24, 5, 0, 0, 7); g.fill();
    body(W / 2, cy, 1, t);
    if (mode === 'sleep') { g.fillStyle = '#cfe0ff'; g.font = '700 13px Inter Var, sans-serif'; [0, 1, 2].forEach(i => { const p = (t * 0.5 + i / 3) % 1; g.globalAlpha = 1 - p; g.fillText('z', W / 2 + 22 + p * 18, cy - 24 - p * 30); }); g.globalAlpha = 1; }
    if (mode === 'dance') { g.font = '14px sans-serif'; g.fillText('♪', W / 2 - 40, cy - 30 + Math.sin(t * 5) * 6); g.fillText('♫', W / 2 + 34, cy - 24 + Math.cos(t * 5) * 6); }
    // sparkles (evolution, feeding, petting)
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= 0.02; g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 2.5, 0, 7); g.fill(); }
    g.globalAlpha = 1; parts = parts.filter(p => p.life > 0);
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, W, H); flash -= 0.02; }
    requestAnimationFrame(frame);
  }
  const sparkle = (n, c) => { for (let i = 0; i < n; i++) parts.push({ x: W / 2, y: 60, vx: (Math.random() - .5) * 4, vy: -Math.random() * 4, life: 1, c: c || `hsl(${Math.random() * 360},90%,65%)` }); };

  // ---------- bubble ----------
  let bubTimer = 0;
  function say(html, ms = 4000) {
    bub.innerHTML = html; bub.classList.add('on');
    clearTimeout(bubTimer); if (ms) bubTimer = setTimeout(() => bub.classList.remove('on'), ms);
  }
  function menu() {
    const pct = P.nextAt ? Math.round(P.xp / P.nextAt * 100) : 100;
    say(`<b>${P.name}</b> <small>· ${NAMES[P.stage]} · ${P.coins} 🪙</small>
      <div class="bars"><span>🍖</span><div class="bar"><i style="width:${P.food}%;background:#ffb02e"></i></div><span>💛</span><div class="bar"><i style="width:${P.joy}%;background:#ff5d8f"></i></div>
      <span>⭐</span><div class="bar"><i style="width:${pct}%;background:#6fd3ff"></i></div></div>
      <div class="btns"><button data-a="feed">🍖 Füttern</button><button data-a="pet">✋ Streicheln</button><button data-a="open">Kairo</button><button data-a="hide">Ausblenden</button></div>`, 9000);
    bub.querySelectorAll('[data-a]').forEach(b => b.onclick = async e => {
      e.stopPropagation();
      const a = b.dataset.a;
      if (a === 'feed') { P = await k.give('feed'); setMode('happy', 2500); jump = 1; sparkle(14, '#ffb02e'); say('Mmmh, lecker! 😋', 2500); }
      if (a === 'pet') { P = await k.give('pet'); setMode('happy', 2500); jump = 1; sparkle(10, '#ff5d8f'); say('Hihi 💛', 2000); }
      if (a === 'open') { k.openKairo(); bub.classList.remove('on'); }
      if (a === 'hide') k.show(false);
    });
  }

  // ---------- mouse: hover to interact, drag to move ----------
  let down = null;
  document.addEventListener('mousemove', e => {
    const overPet = e.clientY > 95 && Math.abs(e.clientX - W / 2) < 48;
    const overBub = bub.classList.contains('on') && e.target.closest?.('.bubble');
    k.mouse(!!(overPet || overBub || down));
    if (down) { const nx = down.wx + (e.screenX - down.sx); x = nx; k.move(nx, down.wy + (e.screenY - down.sy)); down.moved = true; }
  });
  document.addEventListener('mousedown', e => { if (e.target.closest('.bubble')) return; down = { sx: e.screenX, sy: e.screenY, wx: window.screenX, wy: window.screenY, moved: false }; });
  document.addEventListener('mouseup', () => {
    if (down && !down.moved) { jump = 1; setMode('happy', 1500); menu(); }
    down = null;
  });

  // ---------- events from Kairo ----------
  k.onState(s => { P = s; });
  k.onEvolve(stage => { flash = 0.9; sparkle(40); jump = 1; say(`✨ <b>${P.name}</b> hat sich entwickelt: <b>${NAMES[stage]}</b>!`, 6000); });
  k.onEvent(ev => {
    if (ev.type === 'mail') { carry = true; setMode('carry', 6000); dir = 1; say(`📬 Neue Mail${ev.n > 1 ? 's (' + ev.n + ')' : ''}!`, 5000); setTimeout(() => { carry = false; }, 6000); }
    if (ev.type === 'goal') { setMode('dance', 6000); jump = 1; sparkle(30); say('⚽ TOOOR!', 4000); }
    if (ev.type === 'study') { sparkle(12, '#6fd3ff'); say('Du lernst – ich werde stärker! 💪', 3500); }
    if (ev.type === 'say') say(ev.text, 5000);
  });
  // is music playing? then dance from time to time
  const checkMusic = async () => { try { const r = await window.kairo.fun.nowPlaying(); music = !!(r.ok && r.now?.status === 'Playing'); } catch {} };
  checkMusic(); setInterval(checkMusic, 45000);
  setInterval(async () => { P = await k.get(); area = await k.area(); if (P.food < 25 && Date.now() - said > 20 * 60e3) { said = Date.now(); say(`${P.name} hat Hunger 🍖`, 4000); } }, 60000);
  setTimeout(() => say(night() ? `${P.name} schläft… 💤` : `Hallo! Ich bin <b>${P.name}</b> 👋`, 3500), 800);
  x = window.screenX;
  requestAnimationFrame(frame);
})();
