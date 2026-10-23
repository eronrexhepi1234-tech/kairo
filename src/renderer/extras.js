// Extra tools: live translator, read-aloud, flashcards, clip mode, animated backgrounds.
window.Extras = (function () {
  const $ = id => document.getElementById(id);
  const S = () => window.App.settings();

  // ================= Live translator =================
  const LANGS = ['Deutsch', 'Englisch', 'Albanisch', 'Türkisch', 'Französisch', 'Italienisch', 'Spanisch', 'Portugiesisch', 'Arabisch', 'Serbisch / Kroatisch / Bosnisch', 'Russisch', 'Ukrainisch', 'Polnisch', 'Chinesisch', 'Japanisch', 'Koreanisch'];
  function translator() {
    const opt = sel => LANGS.map(l => `<option ${l === sel ? 'selected' : ''}>${l}</option>`).join('');
    Today.modal(`<h2>🌍 ${t('tr.title')}</h2><p class="muted">${t('tr.how')}</p>
      <div class="tr-pick"><select class="field" id="trA">${opt('Deutsch')}</select><span>⇄</span><select class="field" id="trB">${opt('Albanisch')}</select></div>
      <div class="row"><span style="flex:1"></span><button class="btn" data-close>${t('today.cancel')}</button><button class="btn primary" id="trGo">🎙 ${t('tr.start')}</button></div>`);
    document.querySelector('#modalBox [data-close]').onclick = Today.closeModal;
    $('trGo').onclick = () => { const a = $('trA').value, b = $('trB').value; Today.closeModal(); LiveVoice.start({ translate: { aName: a, bName: b } }); };
  }

  // ================= Read aloud =================
  let reader = null; // { parts, i, audio, paused, stop }
  function splitText(text) {
    const parts = [], sentences = text.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*\s*/g) || [text];
    let cur = '';
    for (const s of sentences) { if ((cur + s).length > 550 && cur) { parts.push(cur.trim()); cur = ''; } cur += s; }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }
  function pcmWav(b64, rate) {
    const pcm = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), buf = new ArrayBuffer(44 + pcm.length), v = new DataView(buf);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length, true);
    new Uint8Array(buf, 44).set(pcm);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  async function fetchAudio(text) {
    const r = await window.kairo.voice.speak(text);
    if (!r.ok) throw new Error(r.error.code === 'NO_KEY' ? t('err.nokey') : r.error.message);
    return /L16|pcm/i.test(r.mime) ? pcmWav(r.audio, +(r.mime.match(/rate=(\d+)/) || [])[1] || 24000) : `data:${r.mime};base64,${r.audio}`;
  }
  async function readText(text, title = '') {
    stopReading();
    const parts = splitText(text).slice(0, 80);
    if (!parts.length) return toast('?');
    reader = { parts, i: 0, stop: false, paused: false, audio: null, next: null };
    Today.modal(`<h2>📖 ${escAttr(title || t('rd.title'))}</h2>
      <div class="rd-text" id="rdText">${parts.map((p, i) => `<span data-i="${i}">${escAttr(p)} </span>`).join('')}</div>
      <div class="quiz-bar"><i id="rdBar" style="width:0"></i></div>
      <div class="row"><button class="btn" id="rdPause">⏸</button><button class="btn" id="rdStop">■ ${t('rd.stop')}</button>
        <label class="chess-level">${t('set.rate')} <input type="range" id="rdRate" min="0.7" max="1.6" step="0.05" value="${S().voice.rate || 1}"></label></div>`);
    $('rdStop').onclick = () => { stopReading(); Today.closeModal(); };
    $('rdPause').onclick = () => {
      if (!reader?.audio) return;
      reader.paused = !reader.paused;
      reader.paused ? reader.audio.pause() : reader.audio.play();
      $('rdPause').textContent = reader.paused ? '▶' : '⏸';
    };
    $('rdRate').oninput = e => { if (reader?.audio) reader.audio.playbackRate = +e.target.value; };
    const me = reader;
    let nextUrl = fetchAudio(parts[0]);
    for (; me.i < parts.length && !me.stop; me.i++) {
      document.querySelectorAll('#rdText span').forEach(s => s.classList.toggle('on', +s.dataset.i === me.i));
      document.querySelector(`#rdText span[data-i="${me.i}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      $('rdBar') && ($('rdBar').style.width = (me.i / parts.length * 100) + '%');
      let url;
      try { url = await nextUrl; } catch (e) { toast(e.message); break; }
      if (me.i + 1 < parts.length) nextUrl = fetchAudio(parts[me.i + 1]);
      if (me.stop) break;
      await new Promise(res => {
        me.audio = new Audio(url);
        me.audio.playbackRate = +($('rdRate')?.value || 1);
        me.audio.onended = res; me.audio.onerror = res;
        me.audio.play().catch(res);
        const iv = setInterval(() => { if (me.stop) { me.audio.pause(); clearInterval(iv); res(); } }, 200);
        me.audio.addEventListener('ended', () => clearInterval(iv));
      });
    }
    if ($('rdBar')) $('rdBar').style.width = '100%';
  }
  function stopReading() { if (reader) { reader.stop = true; reader.audio?.pause(); reader = null; } }
  function readerDialog() {
    Today.modal(`<h2>📖 ${t('rd.title')}</h2><p class="muted">${t('rd.how')}</p>
      <textarea class="field" id="rdInput" rows="6" placeholder="${t('rd.ph')}"></textarea>
      <div class="row"><button class="btn" id="rdClip">📋 ${t('rd.fromClip')}</button><button class="btn" id="rdFile">📄 ${t('rd.fromFile')}</button>
        <span style="flex:1"></span><button class="btn primary" id="rdGo">▶ ${t('rd.go')}</button></div>`);
    $('rdClip').onclick = async () => { $('rdInput').value = await window.kairo.clip.read(); };
    $('rdFile').onclick = async () => { const r = await window.kairo.reader.file(); if (r?.ok) $('rdInput').value = r.text; else if (r) toast(r.error.message); };
    $('rdGo').onclick = async () => {
      let v = $('rdInput').value.trim(); if (!v) return;
      let title = '';
      if (/^https?:\/\/\S+$/.test(v)) { toast(t('earth.loading')); const r = await window.kairo.reader.url(v); if (!r.ok) return toast(r.error.message); v = r.text; title = r.title; }
      readText(v, title);
    };
  }

  // ================= Flashcards =================
  const DECKS_KEY = 'kairo.decks';
  const loadDecks = () => { try { return JSON.parse(localStorage.getItem(DECKS_KEY) || '[]'); } catch { return []; } };
  const saveDecks = d => { try { localStorage.setItem(DECKS_KEY, JSON.stringify(d)); } catch {} };
  const BOX_DAYS = [0, 1, 3, 7, 14, 30];
  let study = null;

  function cardsHome() {
    const decks = loadDecks();
    const now = Date.now();
    $('cardsArea').innerHTML = `
      <p class="muted">${t('fc.how')}</p>
      <form class="row" id="fcForm"><input class="field" id="fcTopic" placeholder="${t('fc.ph')}" style="flex:1"><button class="btn primary">✨ ${t('fc.make')}</button></form>
      <div class="row"><button class="btn sm" id="fcClip">📋 ${t('fc.fromClip')}</button><button class="btn sm" id="fcScreen">🖥 ${t('fc.fromScreen')}</button></div>
      <div class="decks">${decks.map((d, i) => { const due = d.cards.filter(c => (c.due || 0) <= now).length; return `<div class="deck" data-i="${i}">
        <div><b>${escAttr(d.title)}</b><small>${d.cards.length} ${t('fc.cards')} · ${due} ${t('fc.due')}</small></div>
        <button class="btn sm primary" data-act="learn">${t('fc.learn')}</button><button class="btn sm" data-act="del">✕</button></div>`; }).join('') || `<p class="muted small">${t('fc.none')}</p>`}</div>`;
    $('fcForm').onsubmit = e => { e.preventDefault(); const v = $('fcTopic').value.trim(); if (v) makeDeck({ text: v }); };
    $('fcClip').onclick = async () => { const c = await window.kairo.clip.read(); if (c) makeDeck({ text: c, fromMaterial: true }); else toast(t('fc.clipEmpty')); };
    $('fcScreen').onclick = async () => { const shot = await window.kairo.screen(); makeDeck({ image: shot }); };
    document.querySelectorAll('.deck').forEach(el => {
      const i = +el.dataset.i;
      el.querySelector('[data-act=learn]').onclick = () => learn(i);
      el.querySelector('[data-act=del]').onclick = () => { const d = loadDecks(); d.splice(i, 1); saveDecks(d); cardsHome(); };
    });
  }

  async function makeDeck({ text, image, fromMaterial }) {
    $('cardsArea').innerHTML = `<div class="msg-status">${t('fc.making')}</div>`;
    const ask = image ? 'Make 12 flashcards from the study material on this screenshot.'
      : fromMaterial ? `Make 12 flashcards from this study material:\n"""\n${text.slice(0, 8000)}\n"""` : `Make 12 flashcards to learn: ${text}`;
    const r = await window.kairo.complete({
      text: ask + '\nQuestions short, answers short (max 2 sentences), in the user\'s language. Reply ONLY JSON: {"title":"short deck title","cards":[{"q":"...","a":"..."}]}',
      extraSystem: 'You create great study flashcards. Output strictly valid JSON.', images: image ? [image] : undefined
    });
    try {
      if (!r.ok) throw new Error(r.error.code === 'NO_KEY' ? t('err.nokey') : r.error.message);
      const j = JSON.parse(r.text.slice(r.text.indexOf('{'), r.text.lastIndexOf('}') + 1));
      const deck = { title: j.title || text?.slice(0, 40) || 'Deck', cards: j.cards.filter(c => c.q && c.a).map(c => ({ q: c.q, a: c.a, box: 0, due: 0 })) };
      const d = loadDecks(); d.unshift(deck); saveDecks(d);
      learn(0);
    } catch (e) { toast(e.message || t('quiz.fail')); cardsHome(); }
  }

  function learn(i) {
    const decks = loadDecks(), deck = decks[i];
    const now = Date.now();
    let queue = deck.cards.map((c, k) => k).filter(k => (deck.cards[k].due || 0) <= now);
    if (!queue.length) queue = deck.cards.map((c, k) => k); // all learned: review anyway
    study = { i, queue, done: 0, total: queue.length };
    showCard();
  }
  function showCard() {
    const decks = loadDecks(), deck = decks[study.i];
    if (!study.queue.length) {
      $('cardsArea').innerHTML = `<div class="quiz-end"><div class="quiz-medal">🎓</div><h2>${t('fc.finished')}</h2><p class="muted">${study.total} ${t('fc.cards')}</p>
        <div class="row" style="justify-content:center"><button class="btn primary" id="fcBack">${t('fc.back')}</button></div></div>`;
      $('fcBack').onclick = cardsHome; return;
    }
    const k = study.queue[0], c = deck.cards[k];
    $('cardsArea').innerHTML = `
      <div class="quiz-top"><span>${escAttr(deck.title)}</span><span>${study.done}/${study.total} · 📦 ${c.box || 0}</span></div>
      <div class="flash" id="fcCard"><div class="flash-in"><div class="flash-face front">${escAttr(c.q)}<small>${t('fc.tap')}</small></div><div class="flash-face back">${escAttr(c.a)}</div></div></div>
      <div class="row" id="fcRate" style="justify-content:center;visibility:hidden"><button class="btn" id="fcAgain">🔁 ${t('fc.again')}</button><button class="btn primary" id="fcGood">✅ ${t('fc.knew')}</button></div>
      <div class="row"><button class="btn sm" id="fcRead">🔊</button><button class="btn sm" id="fcStop">${t('fc.back')}</button></div>`;
    $('fcCard').onclick = () => { $('fcCard').classList.toggle('flipped'); $('fcRate').style.visibility = 'visible'; };
    $('fcRead').onclick = () => Voice.speak($('fcCard').classList.contains('flipped') ? c.a : c.q, S());
    $('fcStop').onclick = cardsHome;
    const rate = good => {
      const d = loadDecks(), card = d[study.i].cards[k];
      card.box = good ? Math.min(5, (card.box || 0) + 1) : 0;
      card.due = Date.now() + (good ? BOX_DAYS[card.box] * 86400000 : 60000);
      saveDecks(d);
      study.queue.shift();
      if (!good) study.queue.push(k); else study.done++;
      showCard();
    };
    $('fcAgain').onclick = () => rate(false);
    $('fcGood').onclick = () => rate(true);
  }

  // ================= Clip mode (last ~30 s of the screen) =================
  let clip = null; // { stream, recs: [{rec, chunks, start}], timer }
  const SEG = 30000;
  async function clipOn() {
    const src = await window.kairo.clips.source();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: 'desktop' } },
        video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: src, maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30 } }
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: src, maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30 } } });
    }
    clip = { stream, recs: [] };
    const startRec = slot => {
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 6e6 });
      const r = { rec, chunks: [], start: Date.now() };
      rec.ondataavailable = e => { if (e.data.size) r.chunks.push(e.data); };
      rec.start(1000);
      clip.recs[slot] = r;
    };
    // two recorders, restarted every 30 s and 15 s apart, so one always holds 15–30 s of the past
    startRec(0);
    setTimeout(() => clip && startRec(1), SEG / 2);
    clip.timer = setInterval(() => {
      for (let s = 0; s < 2; s++) { const r = clip.recs[s]; if (r && Date.now() - r.start >= SEG) { r.rec.stop(); startRec(s); } }
    }, 1000);
    document.body.classList.add('clipping');
    updateClipUI();
  }
  function clipOff() {
    if (!clip) return;
    clearInterval(clip.timer);
    clip.recs.forEach(r => { try { r.rec.stop(); } catch {} });
    clip.stream.getTracks().forEach(tr => tr.stop());
    clip = null;
    document.body.classList.remove('clipping');
    updateClipUI();
  }
  async function saveClip() {
    if (!clip) { toast(t('clip.off')); return { ok: false }; }
    const r = clip.recs.filter(Boolean).sort((a, b) => a.start - b.start)[0];
    const blob = await new Promise(res => { r.rec.onstop = () => res(new Blob(r.chunks, { type: 'video/webm' })); r.rec.stop(); });
    const slot = clip.recs.indexOf(r);
    // restart this recorder right away
    const rec = new MediaRecorder(clip.stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 6e6 });
    const nr = { rec, chunks: [], start: Date.now() };
    rec.ondataavailable = e => { if (e.data.size) nr.chunks.push(e.data); };
    rec.start(1000); clip.recs[slot] = nr;
    const buf = new Uint8Array(await blob.arrayBuffer());
    const res = await window.kairo.clips.save(buf);
    toast(res.ok ? '🎬 ' + t('clip.saved') + ' (' + Math.round((Date.now() - r.start) / 1000) + ' s)' : res.error.message);
    return res;
  }
  function updateClipUI() { const el = $('tdClipModeSub'); if (el) el.textContent = clip ? t('clip.onSub') : t('clip.sub'); }
  async function toggleClipMode() { if (clip) clipOff(); else { try { await clipOn(); toast('🎬 ' + t('clip.onSub')); } catch (e) { toast(e.message); } } }

  // ================= Animated backgrounds =================
  let bg = { kind: 'none', raf: 0, ctx: null, parts: [] };
  function setBackground(kind) {
    cancelAnimationFrame(bg.raf);
    const c = $('bgCanvas');
    bg.kind = kind;
    c.hidden = kind === 'none';
    document.body.classList.toggle('has-bg', kind !== 'none');
    if (kind === 'none') return;
    bg.ctx = c.getContext('2d');
    const size = () => { c.width = innerWidth; c.height = innerHeight; };
    size(); window.onresize = size;
    const W = () => c.width, H = () => c.height;
    bg.parts = Array.from({ length: kind === 'rain' ? 140 : kind === 'stars' ? 220 : 6 }, () => ({ x: Math.random() * W(), y: Math.random() * H(), z: Math.random(), v: Math.random() }));
    let last = 0;
    const frame = ts => {
      bg.raf = requestAnimationFrame(frame);
      if (document.hidden || ts - last < 33) return; // ~30 fps, nothing while hidden
      last = ts;
      const ctx = bg.ctx, w = W(), h = H(), t = ts / 1000;
      const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a45';
      ctx.clearRect(0, 0, w, h);
      if (kind === 'stars') {
        for (const p of bg.parts) {
          p.x -= 0.05 + p.z * 0.25; if (p.x < 0) { p.x = w; p.y = Math.random() * h; }
          ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t * (0.5 + p.v) + p.z * 10));
          ctx.fillStyle = p.v > 0.93 ? acc : '#ffffff';
          ctx.beginPath(); ctx.arc(p.x, p.y, 0.4 + p.z * 1.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (kind === 'aurora') {
        for (let i = 0; i < 3; i++) {
          const g = ctx.createLinearGradient(0, 0, w, h);
          const cols = [acc, '#2dd4bf', '#7c3aed'];
          g.addColorStop(0, cols[i] + '00'); g.addColorStop(0.5, cols[i] + '55'); g.addColorStop(1, cols[i] + '00');
          ctx.fillStyle = g; ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.moveTo(0, h * (0.3 + i * 0.15));
          for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * (0.3 + i * 0.15) + Math.sin(x / 180 + t * (0.4 + i * 0.15) + i) * 60 + Math.sin(x / 70 + t) * 12);
          ctx.lineTo(w, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
        }
      }
      if (kind === 'rain') {
        ctx.strokeStyle = '#9fb7d8'; ctx.lineWidth = 1;
        for (const p of bg.parts) {
          p.y += 6 + p.z * 10; p.x -= 1; if (p.y > h) { p.y = -20; p.x = Math.random() * w; }
          ctx.globalAlpha = 0.15 + p.z * 0.35; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2, p.y - 10 - p.z * 10); ctx.stroke();
        }
      }
      if (kind === 'waves') {
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = acc; ctx.globalAlpha = 0.12 + i * 0.05; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 10) { const y = h * 0.75 + i * 18 + Math.sin(x / (120 + i * 30) + t * (0.6 + i * 0.2)) * (25 + i * 6); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };
    bg.raf = requestAnimationFrame(frame);
  }

  function init() {
    $('tdTranslate').onclick = translator;
    $('tdRead').onclick = readerDialog;
    $('tdCards').onclick = () => { window.App.go('games'); Games.showGame('cards'); };
    $('tdClipMode').onclick = toggleClipMode;
    window.kairo.clips.onSaveRequest(() => saveClip());
    setBackground(S().background || 'none');
  }

  return { init, translator, readText, readerDialog, cardsHome, makeDeck, saveClip, toggleClipMode, setBackground, isClipping: () => !!clip };
})();
