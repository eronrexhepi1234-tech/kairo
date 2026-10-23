// The animated orb (voice mode + chat home screen). Three styles, colour palettes, reacts to sound.
(function () {
  let style = 'orb', palette = 'accent';

  const PALETTES = {
    accent: () => { const a = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a45'; return [a, shade(a, -0.35), shade(a, 0.45)]; },
    aurora: () => ['#2dd4bf', '#6366f1', '#a7f3d0'],
    sunset: () => ['#ff7a45', '#e11d74', '#ffd29a'],
    ocean: () => ['#38bdf8', '#1e3a8a', '#bae6fd'],
    lava: () => ['#ef4444', '#7c2d12', '#fdba74'],
    mono: () => ['#e5e5e5', '#525252', '#ffffff']
  };

  function shade(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const tgt = amt < 0 ? 0 : 255, k = Math.abs(amt);
    r = Math.round(r + (tgt - r) * k); g = Math.round(g + (tgt - g) * k); b = Math.round(b + (tgt - b) * k);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // evenly spread points on a sphere (Fibonacci)
  const N_POINTS = 520;
  const SPHERE = Array.from({ length: N_POINTS }, (_, i) => {
    const y = 1 - (i / (N_POINTS - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    return [Math.cos(th) * r, y, Math.sin(th) * r];
  });

  // smooth pseudo-noise from layered sines
  const noise = (a, t, seed = 0) =>
    Math.sin(a * 3 + t * 1.1 + seed) * 0.5 + Math.sin(a * 5 - t * 1.7 + seed * 2) * 0.3 + Math.sin(a * 2 + t * 0.6 + seed * 3) * 0.2;

  function draw(ctx, W, H, t, energy, thinking) {
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.28;
    const [c1, c2, c3] = PALETTES[palette]();
    ctx.clearRect(0, 0, W, H);

    if (style === 'orb') {
      const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, Math.min(W, H) / 2);
      g.addColorStop(0, c1 + '55'); g.addColorStop(1, c1 + '00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let layer = 2; layer >= 0; layer--) {
        ctx.beginPath();
        const N = 120;
        for (let i = 0; i <= N; i++) {
          const a = (i / N) * Math.PI * 2;
          const wob = noise(a, t * (1 + layer * 0.3) * (thinking ? 2.2 : 1), layer * 1.7);
          const r = R * (1 + layer * 0.06) * (1 + energy * 0.35 * (0.6 + wob) + 0.025 * Math.sin(t * 1.5));
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        const fg = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.35);
        fg.addColorStop(0, layer ? c1 + '40' : c3);
        fg.addColorStop(0.45, layer ? c2 + '30' : c1);
        fg.addColorStop(1, layer ? c2 + '10' : c2);
        ctx.fillStyle = fg;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'screen';
      const hx = cx + Math.cos(t * 0.7) * R * 0.3, hy = cy + Math.sin(t * 0.9) * R * 0.25;
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.8);
      hg.addColorStop(0, c3 + '66'); hg.addColorStop(1, c3 + '00');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    if (style === 'rings') {
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const rr = R * (0.35 + i * 0.13) * (1 + energy * 0.25 * Math.sin(t * 3 - i * 0.7));
        ctx.strokeStyle = i % 2 ? c1 : c3;
        ctx.globalAlpha = 0.85 - i * 0.1;
        ctx.lineWidth = 2 + (6 - i) * 0.6 + energy * 5;
        const start = t * (i % 2 ? 0.8 : -0.6) * (thinking ? 3 : 1) + i;
        ctx.beginPath(); ctx.arc(cx, cy, rr, start, start + Math.PI * (1.1 + 0.6 * Math.sin(t + i))); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.16 * (1 + energy * 0.8), 0, Math.PI * 2); ctx.fill();
    }

    if (style === 'particles') {
      // a rotating 3D sphere of points that swells and ripples with the voice
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) / 2);
      g.addColorStop(0, c1 + '30'); g.addColorStop(1, c1 + '00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const rotY = t * (thinking ? 0.9 : 0.35), rotX = 0.35 + Math.sin(t * 0.3) * 0.2;
      const cyR = Math.cos(rotY), syR = Math.sin(rotY), cxR = Math.cos(rotX), sxR = Math.sin(rotX);
      for (let i = 0; i < SPHERE.length; i++) {
        const [px, py, pz] = SPHERE[i];
        const ripple = 1 + energy * 0.45 * Math.sin(py * 6 + t * 5) + energy * 0.2;
        let x = px * ripple, y = py * ripple, z = pz * ripple;
        const x1 = x * cyR + z * syR, z1 = -x * syR + z * cyR;
        const y2 = y * cxR - z1 * sxR, z2 = y * sxR + z1 * cxR;
        const depth = (z2 + 1.4) / 2.8;               // 0 back .. 1 front
        const sx = cx + x1 * R * 1.15, sy = cy + y2 * R * 1.15;
        ctx.globalAlpha = 0.15 + depth * 0.85;
        ctx.fillStyle = depth > 0.62 ? c3 : i % 3 ? c1 : c2;
        const size = 0.8 + depth * 2.2 + energy * 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (style === 'wave') {
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.strokeStyle = [c3, c1, c2, c1][k];
        ctx.globalAlpha = 1 - k * 0.2;
        ctx.lineWidth = 3 - k * 0.5;
        for (let x = 0; x <= W; x += 4) {
          const u = x / W;
          const env = Math.sin(u * Math.PI) ** 2;
          const y = cy + Math.sin(u * (8 + k * 3) + t * (2 + k) * (thinking ? 2 : 1) + k) * env * (12 + energy * R * 1.1) * (1 - k * 0.15);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Faces ----------
  let mouse = { x: -1, y: -1 };
  window.addEventListener('mousemove', e => { mouse = { x: e.clientX, y: e.clientY }; });
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  function drawFace(ctx, W, H, t, energy, thinking, canvas, state) {
    const kind = style.slice(5) || 'cute';            // face-cute | face-robot | face-cat | face-minimal
    const cx = W / 2, cy = H / 2 + Math.sin(t * 1.6) * 3, R = Math.min(W, H) * 0.3;
    const [c1, c2, c3] = PALETTES[palette]();
    ctx.clearRect(0, 0, W, H);

    // where to look: thinking -> up-right, otherwise follow the mouse
    let lx = 0, ly = 0;
    if (thinking) { lx = 0.6; ly = -0.6; }
    else {
      const r = canvas.getBoundingClientRect();
      if (mouse.x >= 0) { const dx = mouse.x - (r.left + r.width / 2), dy = mouse.y - (r.top + r.height / 2); const d = Math.hypot(dx, dy) || 1; const k = Math.min(1, d / 400); lx = dx / d * k; ly = dy / d * k; }
    }
    const blink = ((t * 0.29 + Math.sin(t * 0.17) * 0.3) % 1 + 1) % 1 < 0.035 ? 0.08 : 1;
    const listening = state === 'listening';
    const talk = Math.min(1, energy * 1.6);
    const eyeY = cy - R * 0.12, eyeDX = R * 0.38, eyeS = (listening ? 1.12 : 1) * R;

    // glow behind
    const g = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, Math.min(W, H) / 2);
    g.addColorStop(0, c1 + '40'); g.addColorStop(1, c1 + '00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    if (kind === 'cute' || kind === 'cat') {
      if (kind === 'cat') { // ears
        ctx.fillStyle = c2;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * R * 0.35, cy - R * 0.85); ctx.lineTo(cx + s * R * 0.95, cy - R * 1.25); ctx.lineTo(cx + s * R * 0.9, cy - R * 0.45); ctx.fill(); }
        ctx.fillStyle = c3 + '66';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * R * 0.48, cy - R * 0.82); ctx.lineTo(cx + s * R * 0.86, cy - R * 1.08); ctx.lineTo(cx + s * R * 0.82, cy - R * 0.6); ctx.fill(); }
      }
      const head = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R * 1.2);
      head.addColorStop(0, c3); head.addColorStop(0.5, c1); head.addColorStop(1, c2);
      ctx.fillStyle = head; ctx.beginPath(); ctx.arc(cx, cy, R * (1 + talk * 0.03), 0, Math.PI * 2); ctx.fill();
      // cheeks
      ctx.fillStyle = '#ff6b8a44';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * R * 0.58, cy + R * 0.2, R * 0.13, R * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
      // eyes
      for (const s of [-1, 1]) {
        const ex = cx + s * eyeDX, ew = eyeS * 0.17, eh = eyeS * 0.22 * blink;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, eyeY, ew, Math.max(1.5, eh), 0, 0, Math.PI * 2); ctx.fill();
        if (blink > 0.5) {
          ctx.fillStyle = '#1a1a22';
          if (kind === 'cat') { ctx.beginPath(); ctx.ellipse(ex + lx * ew * 0.4, eyeY + ly * eh * 0.3, ew * 0.22, eh * 0.85, 0, 0, Math.PI * 2); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(ex + lx * ew * 0.45, eyeY + ly * eh * 0.4, ew * 0.62, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + lx * ew * 0.45 - ew * 0.2, eyeY + ly * eh * 0.4 - eh * 0.25, ew * 0.18, 0, Math.PI * 2); ctx.fill();
        }
      }
      // mouth
      ctx.strokeStyle = '#1a1a22'; ctx.fillStyle = '#3a1020'; ctx.lineWidth = Math.max(2, R * 0.04); ctx.lineCap = 'round';
      const my = cy + R * 0.38;
      if (talk > 0.12) { ctx.beginPath(); ctx.ellipse(cx, my, R * (0.14 + talk * 0.06), R * (0.04 + talk * 0.16), 0, 0, Math.PI * 2); ctx.fill(); }
      else if (kind === 'cat') { ctx.beginPath(); ctx.moveTo(cx - R * 0.16, my - R * 0.03); ctx.quadraticCurveTo(cx - R * 0.08, my + R * 0.08, cx, my); ctx.quadraticCurveTo(cx + R * 0.08, my + R * 0.08, cx + R * 0.16, my - R * 0.03); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(cx, my - R * 0.1, R * 0.16, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
      if (kind === 'cat') { // whiskers
        ctx.strokeStyle = '#ffffff99'; ctx.lineWidth = 1.5;
        for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * R * 0.3, my - R * 0.06 + k * R * 0.05); ctx.lineTo(cx + s * R * 0.75, my - R * 0.12 + k * R * 0.1); ctx.stroke(); }
      }
    }

    if (kind === 'robot') {
      const w = R * 2, h = R * 1.7;
      ctx.fillStyle = c2; rr(ctx, cx - w / 2, cy - h / 2, w, h, R * 0.35); ctx.fill();
      ctx.fillStyle = '#0c0d10'; rr(ctx, cx - w / 2 + R * 0.14, cy - h / 2 + R * 0.14, w - R * 0.28, h - R * 0.28, R * 0.25); ctx.fill();
      ctx.strokeStyle = c1; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx, cy - h / 2 - R * 0.3); ctx.stroke();
      ctx.fillStyle = c3; ctx.shadowColor = c1; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(cx, cy - h / 2 - R * 0.34, R * 0.08 * (1 + talk * 0.6), 0, Math.PI * 2); ctx.fill();
      for (const s of [-1, 1]) {
        const ew = R * 0.36, eh = R * 0.26 * blink;
        rr(ctx, cx + s * eyeDX - ew / 2 + lx * R * 0.06, eyeY - eh / 2 + ly * R * 0.05, ew, Math.max(2, eh), R * 0.08); ctx.fill();
      }
      // LED equalizer mouth
      const n = 9, bw = R * 0.1, my = cy + R * 0.42;
      for (let i = 0; i < n; i++) {
        const v = talk > 0.08 ? 0.25 + talk * (0.5 + 0.5 * Math.abs(Math.sin(t * 9 + i * 1.7))) : 0.12;
        const bh = R * 0.3 * v;
        ctx.globalAlpha = 0.5 + v * 0.5;
        rr(ctx, cx - (n * bw * 1.4) / 2 + i * bw * 1.4, my - bh / 2, bw, bh, 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    if (kind === 'minimal') {
      ctx.strokeStyle = c3; ctx.shadowColor = c1; ctx.shadowBlur = 20; ctx.lineWidth = Math.max(3, R * 0.07); ctx.lineCap = 'round';
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      for (const s of [-1, 1]) {
        const ex = cx + s * eyeDX + lx * R * 0.07, ey = eyeY + ly * R * 0.06;
        if (blink < 0.5 || listening) { ctx.beginPath(); ctx.arc(ex, ey + R * 0.05, R * 0.11, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(ex, ey - R * 0.1); ctx.lineTo(ex, ey + R * 0.1); ctx.stroke(); }
      }
      const my = cy + R * 0.38;
      ctx.beginPath();
      if (talk > 0.1) ctx.ellipse(cx, my, R * 0.16, R * (0.03 + talk * 0.14), 0, 0, Math.PI * 2);
      else ctx.arc(cx, my - R * 0.12, R * 0.18, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke(); ctx.shadowBlur = 0;
    }

    if (thinking) { // three dots orbiting above the head
      ctx.fillStyle = c3;
      for (let i = 0; i < 3; i++) { const a = t * 3 + i * 0.6; ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(a)); ctx.beginPath(); ctx.arc(cx + R * 0.9 + i * R * 0.18, cy - R * 1.1 - Math.abs(Math.sin(a)) * R * 0.1, R * 0.06, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }

  // One orb on one canvas. levelFn() -> { level 0..1, state }
  function create() {
    let canvas, ctx, raf = 0, getLevel = () => ({ level: 0, state: 'idle' }), smooth = 0;
    const t0 = performance.now();
    const resize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1, r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    function frame() {
      const { level, state } = getLevel();
      smooth += (level - smooth) * 0.18;
      const t = (performance.now() - t0) / 1000;
      const thinking = state === 'thinking' || state === 'connecting';
      const energy = smooth + (thinking ? 0.12 + 0.08 * Math.sin(t * 6) : 0) + 0.04;
      if (canvas.clientWidth) {
        if (style.startsWith('face')) drawFace(ctx, canvas.clientWidth, canvas.clientHeight, t, energy, thinking, canvas, state);
        else draw(ctx, canvas.clientWidth, canvas.clientHeight, t, energy, thinking);
      }
      raf = requestAnimationFrame(frame);
    }
    return {
      start(el, levelFn) {
        canvas = el; ctx = el.getContext('2d'); if (levelFn) getLevel = levelFn;
        resize(); window.addEventListener('resize', resize);
        cancelAnimationFrame(raf); frame();
      },
      stop() { cancelAnimationFrame(raf); raf = 0; window.removeEventListener('resize', resize); },
      resize,
      running: () => !!raf
    };
  }

  const main = create();
  window.Orb = {
    start: main.start, stop: main.stop, create,
    configure(s, p) { if (s) style = s; if (p) palette = p; },
    PALETTES: Object.keys(PALETTES), STYLES: ['orb', 'particles', 'rings', 'wave', 'face-cute', 'face-robot', 'face-cat', 'face-minimal'],
    preview: p => PALETTES[p]()
  };
})();
