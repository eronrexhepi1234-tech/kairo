// Desktop stage: answers fly out of the mini orb as a comet, open into a card, stay ~13 s, then fly back.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HOLD = 13000;
  const canvas = $('fx'), ctx = canvas.getContext('2d');
  let W = 0, H = 0, particles = [], comets = [], raf = 0, orb = { x: 0, y: 0 };

  const resize = () => { const d = devicePixelRatio || 1; W = innerWidth; H = innerHeight; canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  addEventListener('resize', resize); resize();
  const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a45';

  (async () => {
    const s = await window.kairo.settings.get();
    window.APP_LANG = s.language;
    document.documentElement.style.setProperty('--accent', s.accent);
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.dataset.motion = s.motion;
  })();

  // ---------- particles & comets on the canvas ----------
  function loop() {
    ctx.clearRect(0, 0, W, H);
    const now = performance.now(), col = accent();
    for (const c of comets) {
      const t = Math.min(1, (now - c.t0) / c.dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = (1 - e) ** 2 * c.a.x + 2 * (1 - e) * e * c.c.x + e * e * c.b.x;
      const y = (1 - e) ** 2 * c.a.y + 2 * (1 - e) * e * c.c.y + e * e * c.b.y;
      for (let i = 0; i < 4; i++) particles.push({ x, y, vx: (Math.random() - .5) * 1.6, vy: (Math.random() - .5) * 1.6, life: 1, r: 1 + Math.random() * 2.6 });
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
      g.addColorStop(0, '#fff'); g.addColorStop(.25, col); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
      if (t >= 1 && !c.done) { c.done = true; c.onEnd?.(); burst(c.b.x, c.b.y, c.burst ?? 36); }
    }
    comets = comets.filter(c => !c.done);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vx *= .97; p.vy *= .97; p.life -= .022;
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.white ? '#fff' : col;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.01, p.r * p.life), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    particles = particles.filter(p => p.life > 0);
    raf = comets.length || particles.length ? requestAnimationFrame(loop) : 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  function burst(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 5; particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, r: 1.5 + Math.random() * 2.5, white: i % 3 === 0 }); } kick(); }
  function comet(a, b, dur, onEnd, opts = {}) {
    // arc up and across the screen, like a shooting star
    const c = { x: (a.x + b.x) / 2 - (b.x - a.x) * .15 - 120, y: Math.min(a.y, b.y) - Math.max(160, Math.abs(a.x - b.x) * .35) };
    comets.push({ a, b, c, dur, t0: performance.now(), onEnd, burst: opts.burst }); kick();
  }

  // ---------- cards ----------
  let live = [];
  function cardHtml(p) {
    if (p.type === 'weather') return '<div class="st-wx"></div>';
    if (p.type === 'image') return `<div class="st-img"><img src="${esc(p.src)}" alt=""><div class="st-shine"></div></div>${p.title ? `<div class="st-img-cap">${esc(p.title)}</div>` : ''}`;
    // info card: icon, title, up to 6 lines
    return `<div class="st-info"><div class="st-head"><span class="st-ico">${ic(p.icon) || ic('sparkles')}</span><div><small>${esc(p.kicker || 'Kairo')}</small><h3>${esc(p.title || '')}</h3></div></div>
      ${p.big ? `<div class="st-big">${esc(p.big)}</div>` : ''}
      <ul>${(p.lines || []).slice(0, 6).map((l, i) => `<li style="--i:${i}">${esc(l)}</li>`).join('')}</ul></div>`;
  }
  function show(p) {
    orb = p.orb || orb;
    // only one card at a time: the old one flies back first
    live.forEach(c => c.close(true));
    const el = document.createElement('div');
    el.className = 'st-card st-' + p.type;
    el.innerHTML = cardHtml(p) + `<div class="st-bar"><i></i></div><div class="st-tools"><button class="st-open" title="Kairo">${ic('arrow-up-right')}</button><button class="st-x">${ic('x')}</button></div>`;
    el.style.visibility = 'hidden';
    $('cards').appendChild(el);
    if (p.type === 'weather') WeatherFX.card(el.querySelector('.st-wx'), p.data, { compact: false });
    // place it above-left of the orb
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(16, Math.min(W - w - 16, orb.x - w + 20)), top = Math.max(16, Math.min(H - h - 16, orb.y - h - 90));
    el.style.left = left + 'px'; el.style.top = top + 'px';
    el.style.setProperty('--ox', (orb.x - left) + 'px'); el.style.setProperty('--oy', (orb.y - top) + 'px');
    const target = { x: left + w / 2, y: top + h / 2 };
    let timer = 0, closed = false, started = 0, left_ = HOLD, paused = false;
    const card = {
      el,
      close(fast) {
        if (closed) return; closed = true; clearTimeout(timer);
        el.classList.remove('in'); el.classList.add('out');
        setTimeout(() => comet(target, orb, fast ? 380 : 650, () => { burst(orb.x, orb.y, 18); }, { burst: 0 }), 120);
        setTimeout(() => { el.remove(); live = live.filter(c => c !== card); if (!live.length && !captionOn) setTimeout(() => { if (!live.length && !captionOn) window.kairo.stage.idle(); }, 900); }, 700);
      }
    };
    live.push(card);
    comet(orb, target, 700, () => {
      el.style.visibility = '';
      el.style.setProperty('--hx', (target.x - left) + 'px'); el.style.setProperty('--hy', (target.y - top) + 'px');
      el.classList.add('in');
      started = Date.now();
      el.querySelector('.st-bar i').style.animationDuration = HOLD + 'ms';
      timer = setTimeout(() => card.close(), HOLD);
    });
    // hover pauses the timer and makes the card clickable
    el.addEventListener('mouseenter', () => { window.kairo.stage.mouse(true); if (closed || !started) return; paused = true; clearTimeout(timer); left_ -= Date.now() - started; el.classList.add('hold'); });
    el.addEventListener('mouseleave', () => { window.kairo.stage.mouse(false); if (closed || !paused) return; paused = false; started = Date.now(); el.classList.remove('hold'); timer = setTimeout(() => card.close(), Math.max(2500, left_)); });
    el.querySelector('.st-x').onclick = () => { window.kairo.stage.mouse(false); card.close(); };
    el.querySelector('.st-open').onclick = () => { window.kairo.stage.mouse(false); card.close(true); setTimeout(() => window.kairo.stage.open(), 300); };
  }

  // ---------- live caption bubble next to the orb ----------
  let captionOn = false, capTimer = 0;
  function caption(p) {
    orb = p.orb || orb;
    const el = $('caption');
    clearTimeout(capTimer);
    if (!p.text) return;
    captionOn = true;
    el.hidden = false;
    el.className = 'st-caption ' + (p.who === 'user' ? 'user' : 'ai');
    el.innerHTML = `<span>${esc(p.text.slice(-260))}</span>`;
    el.style.right = Math.max(16, W - orb.x + 66) + 'px';
    el.style.bottom = Math.max(16, H - orb.y - 18) + 'px';
    requestAnimationFrame(() => el.classList.add('on'));
    if (p.done) capTimer = setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.hidden = true; captionOn = false; if (!live.length) window.kairo.stage.idle(); }, 450); }, 5000);
  }

  window.kairo.stage.onShow(p => (p.type === 'caption' ? caption(p) : show(p)));
})();
