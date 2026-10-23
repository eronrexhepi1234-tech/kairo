// Main glue: navigation, chat, look & feel.
const $ = id => document.getElementById(id);
window.escAttr = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let toastTimer;
window.toast = msg => {
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
};

let S = null;                 // settings (keys masked)
let chatLog = [];             // [{ role, text, sources? }]
let currentReq = null;
const attach = { screen: false, news: false, folder: null, folderCtx: null };
const PERSONAS = ['normal', 'bro', 'lockin', 'mentor', 'butler', 'tutor', 'commentator', 'pirate', 'robot'];

// ---------- Look ----------
function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.36 ? '#14110f' : '#ffffff';
}
function applyAccent(hex) {
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-ink', inkFor(hex));
}
function applyLook() {
  const d = document.documentElement;
  d.dataset.theme = S.theme; d.dataset.motion = S.motion; d.dataset.font = S.font; d.dataset.density = S.density;
  d.lang = S.language;
  applyAccent(S.accent);
  window.APP_LANG = S.language;
  document.body.classList.toggle('lockin', S.persona === 'lockin');
  $('focusTimer').hidden = S.persona !== 'lockin';
  $('brandName').textContent = S.name;
  $('modelTag').textContent = `${S.provider} · ${S.models[S.provider]}`;
  applyI18n();
  renderPersonaSwitch();
}
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $('input').placeholder = t('chat.placeholder');
  const hello = t('chat.hello', { name: `<span class="hl">${escAttr(S.name)}</span>` });
  $('helloLine').innerHTML = hello;
  if (attach.folder) $('chipFolderLabel').textContent = attach.folder.split(/[\\/]/).pop();
  $('viewName').textContent = t('nav.' + currentView);
  $('homeOrbText').textContent = t(S.voice.handsFree && S.keys.gemini ? 'hf.sayHello' : 'home.tap');
}

// ---------- Navigation ----------
let currentView = 'chat';
function go(view) {
  if (view === currentView) return;
  const swap = () => {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    document.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    currentView = view;
    $('viewName').textContent = t('nav.' + view);
    if (view === 'earth') Earth.init();
    if (view === 'settings') SettingsUI.render();
    if (view === 'phone') loadMac();
    if (view === 'today') Today.refresh();
    if (view === 'home') Home.refresh();
    if (view === 'chat') $('input').focus();
    syncHomeOrb();
  };
  swap();
}
document.querySelectorAll('.rail-btn').forEach(b => b.onclick = () => go(b.dataset.view));
document.addEventListener('keydown', e => {
  if (e.ctrlKey && /^[1-6]$/.test(e.key)) go(['chat', 'earth', 'games', 'files', 'phone', 'settings'][+e.key - 1]);
});
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-ext], a[href^="http"]');
  if (a) { e.preventDefault(); window.kairo.openExternal(a.href); }
});

// ---------- Persona switch (sliding pill) ----------
function renderPersonaSwitch() {
  const el = $('personaSwitch');
  el.innerHTML = '<span class="pill"></span>' + PERSONAS.map(p => `<button data-p="${p}" class="${p === S.persona ? 'active' : ''}">${t('persona.' + p)}</button>`).join('');
  el.querySelectorAll('button').forEach(b => b.onclick = async () => {
    S = await window.kairo.settings.set({ persona: b.dataset.p });
    SettingsUI.set(S);
    applyLook();
  });
  requestAnimationFrame(() => {
    const act = el.querySelector('button.active'), pill = el.querySelector('.pill');
    if (act) { pill.style.left = act.offsetLeft + 'px'; pill.style.width = act.offsetWidth + 'px'; }
  });
}

// ---------- Lock-in focus timer ----------
let ftLeft = 25 * 60, ftInt = null;
function ftDraw() { $('ftTime').textContent = `${String(Math.floor(ftLeft / 60)).padStart(2, '0')}:${String(ftLeft % 60).padStart(2, '0')}`; }
$('ftToggle').onclick = () => {
  if (ftInt) { clearInterval(ftInt); ftInt = null; $('ftToggle').textContent = '▶'; return; }
  $('ftToggle').textContent = '❚❚';
  ftInt = setInterval(() => {
    ftLeft--; ftDraw();
    if (ftLeft <= 0) { clearInterval(ftInt); ftInt = null; ftLeft = 25 * 60; ftDraw(); $('ftToggle').textContent = '▶'; toast(t('lockin.done')); Voice.speak(t('lockin.done'), S); }
  }, 1000);
};

// ---------- Chat ----------
function saveHistory() { try { localStorage.setItem('kairo.chatLog', JSON.stringify(chatLog.slice(-60))); } catch {} }
function loadHistory() { try { chatLog = JSON.parse(localStorage.getItem('kairo.chatLog') || '[]'); } catch { chatLog = []; } }

const FLY_RX = /\[\[fly:\s*([^\]]+)\]\]/g;
const SHOW_EARTH_RX = /(zeig|show|trego|montre|muestra|mostra|göster|open).{0,20}(erde|earth|tokën|toka|terre|tierra|terra|dünya|globus|globe)/i;
const WANTS_SEE_RX = /(zeig|show|trego|montre|muestra|mostra|göster|wo ist|where is|ku është|où est|dónde|dove|nerede)/i;

function msgEl(m, i) {
  const el = document.createElement('div');
  el.className = 'msg ' + (m.role === 'user' ? 'user' : 'ai md') + (m.error ? ' error' : '');
  el.dataset.i = i;
  if (m.role === 'user') {
    el.textContent = m.text;
    if (m.shot) { const img = document.createElement('img'); img.className = 'shot'; img.src = m.shot; el.appendChild(img); }
  } else {
    fillAI(el, m);
  }
  return el;
}

// ---------- Actions inside replies: [[file: x]]…[[/file]], [[open: url]], [[app: name]] ----------
const FILE_RX = /\[\[file:\s*([^\]\n]+)\]\]\n?([\s\S]*?)(?:\[\[\/file\]\]|$)/g;
const OPEN_RX = /\[\[open:\s*([^\]]+?)\s*\]\]/g;
const APP_RX = /\[\[app:\s*([^\]]+)\]\]/g;

function parseReply(text) {
  const files = [];
  let shown = (text || '').replace(FILE_RX, (_, name, content) => {
    files.push({ name: name.trim(), content: content.replace(/\n$/, '') });
    return `\n\n%%FILE${files.length - 1}%%\n\n`;
  });
  const opens = [...shown.matchAll(OPEN_RX)].map(x => x[1]);
  const apps = [...shown.matchAll(APP_RX)].map(x => x[1].trim());
  const places = [...shown.matchAll(FLY_RX)].map(x => x[1].trim());
  const chess = /\[\[chess\]\]/i.test(shown);
  const grab = rx => [...shown.matchAll(rx)].map(x => x[1].trim());
  const remember = grab(/\[\[remember:\s*([^\]]+)\]\]/gi);
  const forget = grab(/\[\[forget:\s*([^\]]+)\]\]/gi);
  const reminds = [...shown.matchAll(/\[\[(remind|alarm):\s*([^\]]+)\]\]/gi)].map(x => {
    const [when, text, rep] = x[2].split('|').map(s => s.trim());
    return { kind: x[1].toLowerCase() === 'alarm' ? 'alarm' : 'reminder', at: when, text: text || '', repeat: /daily|täglich/i.test(rep || '') ? 'daily' : null };
  });
  const pcs = grab(/\[\[pc:\s*([^\]]+)\]\]/gi).map(s => { const [a, v] = s.split(/\s+/); return { action: a, value: v }; });
  const lights = grab(/\[\[light:\s*([^\]]+)\]\]/gi).map(s => {
    const [target, rest = ''] = s.split('|').map(x => x.trim());
    const cmd = {};
    for (const kv of rest.split(/[;,]/)) {
      const [k, v] = kv.split('=').map(x => (x || '').trim());
      if (!k || v === '') continue;
      if (k === 'on') cmd.on = v === 'toggle' ? 'toggle' : v === 'true' || v === 'an' || v === 'on';
      else if (k === 'brightness') cmd.brightness = +v;
      else if (k === 'color' || k === 'scene') cmd[k] = v;
    }
    return { target: target || 'all', cmd };
  });
  const tidy = /\[\[tidy\]\]/i.test(shown), briefing = /\[\[briefing\]\]/i.test(shown);
  const cards = grab(/\[\[cards:\s*([^\]]+)\]\]/gi)[0] || null;
  const translate = grab(/\[\[translate:\s*([^\]]+)\]\]/gi).map(s => s.split('|').map(x => x.trim()))[0] || null;
  const readAloud = /\[\[read\]\]/i.test(shown), saveClip = /\[\[clip\]\]/i.test(shown);
  shown = shown.replace(/\[\[(read|clip)\]\]/gi, '').replace(/\[\[(cards|translate):[^\]]*\]\]/gi, '');
  const quiz = grab(/\[\[quiz:\s*([^\]]+)\]\]/gi)[0] || null;
  shown = shown.replace(OPEN_RX, '').replace(APP_RX, '').replace(FLY_RX, '')
    .replace(/\[\[(chess|tidy|briefing)\]\]/gi, '').replace(/\[\[(remember|forget|remind|alarm|pc|quiz|light):[^\]]*\]\]/gi, '').trim();
  return { shown, files, opens, apps, places, chess, remember, forget, reminds, pcs, lights, tidy, briefing, quiz, cards, translate, readAloud, saveClip };
}

const EXT_LABEL = n => (n.match(/\.([a-z0-9]+)$/i) || [, 'TXT'])[1].toUpperCase().slice(0, 4);
function fileCard(f, res, streaming) {
  const status = streaming ? `${t('file.writing')} · ${f.content.length.toLocaleString()} ${t('file.chars')}`
    : res?.path ? escAttr(res.path) : res?.error ? `<span class="err">${escAttr(res.error)}</span>` : '…';
  const btns = res?.path ? `<button class="btn" data-fa="openfile" data-path="${escAttr(res.path)}">${t('files.open')}</button>
      <button class="btn" data-fa="reveal" data-path="${escAttr(res.path)}">${t('file.folder')}</button>` : '';
  return `<div class="file-card ${streaming ? 'writing' : ''}"><div class="fc-icon">${escAttr(EXT_LABEL(f.name))}</div>
    <div class="fc-info"><b>${escAttr(f.name)}</b><small>${status}</small></div>${btns}</div>`;
}

async function runActions(m) {
  if (m.actionsDone) return;
  m.actionsDone = true;
  const p = parseReply(m.text);
  m.fileResults = [];
  for (const f of p.files) {
    const r = await window.kairo.action({ type: 'file', name: f.name, content: f.content });
    m.fileResults.push(r.ok ? { path: r.path } : { error: r.error.message });
  }
  m.done = [];
  for (const u of p.opens) { const r = await window.kairo.action({ type: 'open', url: u.replace(/ /g, '%20') }); if (r.ok) m.done.push('🌐 ' + r.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)); }
  for (const a of p.apps) { const r = await window.kairo.action({ type: 'app', name: a }); m.done.push((r.ok ? '▶ ' : '✕ ') + a); }
  if (p.chess) { m.done.push('♟ ' + t('games.chess')); setTimeout(() => { go('games'); Games.showGame('chess'); }, 600); }
  for (const f of p.remember) { await window.kairo.memory.add(f); m.done.push('🧠 ' + f.slice(0, 50)); }
  for (const f of p.forget) { const n = await window.kairo.memory.remove(f); m.done.push(`🧠✕ ${n}`); }
  for (const r of p.reminds) {
    const res = await window.kairo.reminders.add(r);
    m.done.push(res.ok ? `${r.kind === 'alarm' ? '⏰' : '🔔'} ${new Date(res.item.at).toLocaleString('de-CH', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : '✕ ' + t('today.badTime'));
  }
  if (p.reminds.length || p.remember.length || p.forget.length) { Today.loadReminders(); Today.loadMemory(); }
  for (const c of p.pcs) { const r = await window.kairo.pc(c.action, c.value); m.done.push((r.ok ? '💻 ' + r.result : '✕ ' + r.error.message).slice(0, 70)); }
  for (const l of p.lights) {
    const r = await window.kairo.home.control(l.target, l.cmd);
    m.done.push(r.ok ? '💡 ' + r.results.filter(x => x.ok).map(x => x.name).join(', ') : '✕ ' + r.error.message);
  }
  if (p.tidy) setTimeout(() => Today.tidy(), 500);
  if (p.cards) { m.done.push('🗂 ' + p.cards); setTimeout(() => { go('games'); Games.showGame('cards'); Extras.makeDeck({ text: p.cards }); }, 500); }
  if (p.translate) { m.done.push('🌍 ' + p.translate.join(' ⇄ ')); setTimeout(() => LiveVoice.start({ translate: { aName: p.translate[0], bName: p.translate[1] || 'Deutsch' } }), 800); }
  if (p.readAloud) { const txt = await window.kairo.clip.read(); if (txt) setTimeout(() => Extras.readText(txt), 500); else m.done.push('✕ ' + t('fc.clipEmpty')); }
  if (p.saveClip) { const r = await Extras.saveClip(); m.done.push(r.ok ? '🎬 ' + t('clip.saved') : '✕ ' + t('clip.off')); }
  if (p.briefing) setTimeout(() => { go('today'); Today.briefing(true); }, 500);
  if (p.quiz) setTimeout(() => { go('games'); Games.showGame('quiz'); Quiz.start(p.quiz); }, 500);
}

$('messages').addEventListener('click', e => {
  const b = e.target.closest('[data-fa]'); if (!b) return;
  window.kairo.action({ type: b.dataset.fa, path: b.dataset.path });
});

function fillAI(el, m, streaming) {
  const { shown, files, places } = parseReply(m.text);
  let html = renderMarkdown(shown) + (streaming ? '<span class="caret"></span>' : '');
  html = html.replace(/(?:<p>)?%%FILE(\d+)%%(?:<\/p>)?/g, (_, i) => fileCard(files[i], m.fileResults?.[i], streaming && !m.fileResults));
  el.innerHTML = html;
  if (m.done?.length) el.insertAdjacentHTML('beforeend', `<div class="sources">${m.done.map(d => `<span class="source done">${escAttr(d)}</span>`).join('')}</div>`);
  if (streaming) return;
  if (m.sources?.length) {
    el.insertAdjacentHTML('beforeend', `<div class="sources">${m.sources.map(s => `<a class="source" href="${escAttr(s.link)}" data-ext title="${escAttr(s.title)}">${escAttr(s.source || 'link')}</a>`).join('')}</div>`);
  }
  const tools = document.createElement('div');
  tools.className = 'msg-tools';
  tools.innerHTML = `<button class="tool-btn" data-a="copy"><svg><use href="#i-copy"/></svg>${t('chat.copy')}</button>
    <button class="tool-btn" data-a="speak"><svg><use href="#i-volume"/></svg>${t('chat.speak')}</button>` +
    places.map(p => `<button class="tool-btn" data-a="fly" data-place="${escAttr(p)}"><svg><use href="#i-pin"/></svg>${escAttr(p)}</button>`).join('');
  tools.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'copy') { navigator.clipboard.writeText(shown.replace(/%%FILE(\d+)%%/g, (_, i) => files[i].content)); toast('✓'); }
    if (b.dataset.a === 'speak') Voice.speak(shown.replace(/%%FILE\d+%%/g, ''), S);
    if (b.dataset.a === 'fly') { go('earth'); setTimeout(() => Earth.flyToName(b.dataset.place), 120); }
  };
  el.appendChild(tools);
}

// ---------- Home orb (big orb on the empty chat screen) ----------
const homeOrb = Orb.create();
let homeHover = false;
function syncHomeOrb() {
  const show = !$('chatEmpty').hidden && currentView === 'chat' && !LiveVoice.isActive();
  if (show && !homeOrb.running()) {
    homeOrb.start($('homeOrb'), () => ({
      level: Math.max(LiveVoice.standbyLevel(), homeHover ? 0.3 : 0.06 + 0.04 * Math.sin(performance.now() / 700)), state: 'idle'
    }));
  } else if (!show && homeOrb.running()) homeOrb.stop();
}
$('homeOrbBtn').onmouseenter = () => { homeHover = true; };
$('homeOrbBtn').onmouseleave = () => { homeHover = false; };
$('homeOrbBtn').onclick = () => {
  if (S.keys.gemini) LiveVoice.start();
  else { toast(t('voice.needGemini')); $('input').focus(); }
};

function renderAll() {
  const box = $('messages');
  box.innerHTML = '';
  chatLog.forEach((m, i) => box.appendChild(msgEl(m, i)));
  $('chatEmpty').hidden = chatLog.length > 0;
  syncHomeOrb();
  scrollDown();
}
function scrollDown() { const s = $('chatScroll'); s.scrollTop = s.scrollHeight; }

function addMsg(m) {
  chatLog.push(m);
  $('chatEmpty').hidden = true;
  syncHomeOrb();
  const el = msgEl(m, chatLog.length - 1);
  $('messages').appendChild(el);
  scrollDown();
  return el;
}

function setPresence(state) {
  const p = $('presence');
  p.classList.toggle('thinking', state === 'thinking');
}

function setSending(on) {
  $('sendBtn').innerHTML = `<svg><use href="#i-${on ? 'stop' : 'send'}"/></svg>`;
  setPresence(on ? 'thinking' : null);
}

async function send(text, opts = {}) {
  text = (text ?? $('input').value).trim();
  if (!text || currentReq) return;
  $('input').value = ''; autosize();
  Voice.stop();

  // handled locally: "show me the Earth"
  if (SHOW_EARTH_RX.test(text) && text.length < 60) {
    addMsg({ role: 'user', text });
    go('earth');
    return;
  }

  const prior = chatLog.filter(m => !m.error).map(m => ({ role: m.role, text: m.text }));
  addMsg({ role: 'user', text });
  const aiMsg = { role: 'assistant', text: '' };
  chatLog.push(aiMsg);
  const el = document.createElement('div');
  el.className = 'msg ai md streaming';
  el.innerHTML = `<div class="msg-status">${t('status.thinking')}</div>`;
  $('messages').appendChild(el);
  scrollDown();

  const id = Math.random().toString(36).slice(2);
  currentReq = id;
  setSending(true);
  const req = {
    chatLog: prior, text,
    attachScreen: opts.attachScreen ?? attach.screen,
    attachNews: opts.attachNews ?? attach.news,
    newsQuery: opts.newsQuery || '',
    folderContext: attach.folderCtx
  };
  // one-shot chips reset after sending
  setChip('chipScreen', attach.screen = false);
  setChip('chipNews', attach.news = false);

  const r = await window.kairo.chat.send(id, req);
  currentReq = null;
  setSending(false);
  el.classList.remove('streaming');

  if (!r.ok) {
    aiMsg.error = true;
    aiMsg.text = r.error.code === 'NO_KEY' ? t('err.nokey') : `${t('err.generic')} ${r.error.message}`;
    el.classList.add('error');
  }
  if (r.screenshot) {
    const u = chatLog[chatLog.length - 2];
    u.shot = 'data:' + r.screenshot.mime + ';base64,' + r.screenshot.data;
    const userEl = $('messages').children[$('messages').children.length - 2];
    if (userEl && !userEl.querySelector('.shot')) { const img = document.createElement('img'); img.className = 'shot'; img.src = u.shot; userEl.appendChild(img); }
    delete u.shot; // don't store screenshots in chatLog
  }
  if (r.ok) await runActions(aiMsg);
  fillAI(el, aiMsg);
  saveHistory();
  scrollDown();

  const { places, shown } = parseReply(aiMsg.text);
  if (places.length && WANTS_SEE_RX.test(text)) { go('earth'); setTimeout(() => Earth.flyToName(places[0]), 150); }
  if (S.voice.autoSpeak && r.ok) Voice.speak(shown.replace(/%%FILE\d+%%/g, ''), S);
}

window.kairo.chat.onEvent((id, type, payload) => {
  if (id !== currentReq) return;
  const el = $('messages').lastElementChild;
  const m = chatLog[chatLog.length - 1];
  if (type === 'status') el.innerHTML = `<div class="msg-status">${t('status.' + payload)}</div>`;
  if (type === 'sources') m.sources = payload;
  if (type === 'chunk') {
    m.text += payload;
    fillAI(el, m, true);
    const s = $('chatScroll');
    if (s.scrollHeight - s.scrollTop - s.clientHeight < 160) scrollDown();
  }
});

function autosize() { const i = $('input'); i.style.height = 'auto'; i.style.height = Math.min(220, i.scrollHeight) + 'px'; }
$('input').addEventListener('input', autosize);
$('input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
$('sendBtn').onclick = () => currentReq ? window.kairo.chat.stop(currentReq) : send();
$('newChat').onclick = () => { chatLog = []; saveHistory(); renderAll(); Voice.stop(); };
document.querySelectorAll('[data-sugg]').forEach(b => b.onclick = () => send(t(b.dataset.sugg)));

function setChip(id, on) { $(id).setAttribute('aria-pressed', String(!!on)); }
$('chipScreen').onclick = () => setChip('chipScreen', attach.screen = !attach.screen);
$('chipNews').onclick = () => setChip('chipNews', attach.news = !attach.news);
$('chipFolder').onclick = async () => {
  if (attach.folder) { attach.folder = attach.folderCtx = null; setChip('chipFolder', false); $('chipFolderLabel').textContent = t('chip.folder'); return; }
  const p = await window.kairo.folder.pick();
  if (p) await attachFolder(p);
};
async function attachFolder(p) {
  attach.folder = p;
  attach.folderCtx = await window.kairo.folder.context(p);
  setChip('chipFolder', true);
  $('chipFolderLabel').textContent = p.split(/[\\/]/).pop();
}

// Voice: with a Gemini key the mic opens hands-free voice mode; otherwise it dictates one message.
$('micBtn').onclick = async () => {
  if (S.keys.gemini && !Voice.isListening()) return LiveVoice.start();
  if (Voice.isListening()) {
    $('micBtn').classList.remove('rec');
    const text = await Voice.stopListening();
    if (text) send(text);
    return;
  }
  try { await Voice.startListening(); $('micBtn').classList.add('rec'); }
  catch (e) { toast(e.message); }
};

// ---------- Files ----------
let tree = [];
async function openFolder(p) {
  $('folderPath').textContent = p;
  $('askFolder').disabled = false;
  $('askFolder').dataset.path = p;
  tree = await window.kairo.folder.scan(p);
  $('tree').innerHTML = tree.slice(0, 400).map((e, i) => `<div class="tree-item ${e.dir ? 'dir' : ''}" data-i="${i}" style="padding-left:${14 + e.depth * 14}px;animation-delay:${Math.min(i, 30) * 12}ms">
    ${e.dir ? '▸' : '·'} ${escAttr(e.rel.split(/[\\/]/).pop())}${e.dir ? '' : `<small>${e.size < 1024 ? e.size + ' B' : Math.round(e.size / 1024) + ' KB'}</small>`}</div>`).join('');
}
$('pickFolder').onclick = async () => { const p = await window.kairo.folder.pick(); if (p) openFolder(p); };
$('tree').onclick = async e => {
  const it = e.target.closest('.tree-item'); if (!it) return;
  const f = tree[+it.dataset.i];
  $('tree').querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
  it.classList.add('sel');
  if (f.dir) return;
  const head = `<div class="preview-head"><span>${escAttr(f.rel)}</span><button class="btn" id="openFile">${t('files.open')}</button></div>`;
  if (f.text && f.size < 400000) {
    const c = await window.kairo.folder.read(f.path);
    $('preview').innerHTML = head + `<pre>${escAttr(c ?? '')}</pre>`;
  } else if (/\.(png|jpe?g|gif|webp|svg)$/i.test(f.path)) {
    $('preview').innerHTML = head + `<img src="file:///${escAttr(f.path.replace(/\\/g, '/'))}" style="max-width:100%;border-radius:8px">`;
  } else {
    $('preview').innerHTML = head + `<p class="muted">${Math.round(f.size / 1024)} KB</p>`;
  }
  $('openFile').onclick = () => window.kairo.folder.open(f.path);
};
$('askFolder').onclick = async () => {
  await attachFolder($('askFolder').dataset.path);
  go('chat');
  $('input').value = S.language === 'de' ? 'Was ist in diesem Ordner? Gib mir einen kurzen Überblick.' : 'What is in this folder? Give me a short overview.';
  autosize(); $('input').focus();
};

// ---------- Phone ----------
async function loadMac() { const i = await window.kairo.remote.info(); $('macAddr').textContent = i.mac || '—'; }
function showRemote(r) {
  if (!r.ok) return toast(r.error.message);
  $('qrCard').hidden = false;
  $('qrImg').src = r.qr;
  $('qrLink').textContent = r.link;
  $('remoteStart').hidden = true;
  $('remoteStop').hidden = false;
  if (r.mac) $('macAddr').textContent = r.mac;
}
$('remoteStart').onclick = async () => showRemote(await window.kairo.remote.start());
$('remoteStop').onclick = async () => { await window.kairo.remote.stop(); $('qrCard').hidden = true; $('remoteStart').hidden = false; $('remoteStop').hidden = true; };
$('remoteReset').onclick = async () => { await window.kairo.remote.reset(); $('qrCard').hidden = true; $('remoteStart').hidden = false; $('remoteStop').hidden = true; toast('✓'); };
window.kairo.remote.onAutostart(async () => showRemote(await window.kairo.remote.start()));
window.kairo.remote.onEvent(ev => {
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const label = ev.type === 'remote-chat' ? '📱 ' + ev.text : ev.type === 'remote-reply' ? '↳ ' + ev.text.slice(0, 160) : '⚡ ' + ev.action;
  li.innerHTML = `<time>${time}</time>${escAttr(label)}`;
  $('remoteFeed').prepend(li);
});

// ---------- App API used by other modules ----------
// ---------- Hands-free ----------
function applyHandsFree() {
  const on = !!(S.voice.handsFree && S.keys.gemini);
  LiveVoice.setHandsFree(on, S.voice.sensitivity);
  $('hfPill').hidden = !S.keys.gemini;
  $('hfPill').classList.toggle('on', on);
  $('homeOrbText').textContent = t(on ? 'hf.sayHello' : 'home.tap');
}
$('hfPill').onclick = async () => {
  S = await window.kairo.settings.set({ voice: { handsFree: !S.voice.handsFree } });
  SettingsUI.set(S);
  applyHandsFree();
  toast(t(S.voice.handsFree ? 'hf.on' : 'hf.off'));
};

// ---------- Voice mode pickers (style + colours) ----------
function renderVoicePickers() {
  Orb.configure(S.voice.orbStyle, S.voice.orbPalette);
  const names = Object.fromEntries(Orb.STYLES.map(s => [s, t('orb.' + s)]));
  $('vmStyles').innerHTML = Orb.STYLES.map(s => `<button data-s="${s}" class="${s === S.voice.orbStyle ? 'active' : ''}">${names[s]}</button>`).join('');
  $('vmPalettes').innerHTML = Orb.PALETTES.map(p => {
    const [a, b] = Orb.preview(p);
    return `<button class="vm-pal ${p === S.voice.orbPalette ? 'active' : ''}" data-p="${p}" title="${p}" style="background:linear-gradient(135deg,${a},${b})"></button>`;
  }).join('');
  $('vmStyles').querySelectorAll('button').forEach(b => b.onclick = () => saveOrb({ orbStyle: b.dataset.s }));
  $('vmPalettes').querySelectorAll('button').forEach(b => b.onclick = () => saveOrb({ orbPalette: b.dataset.p }));
}
async function saveOrb(patch) {
  S = await window.kairo.settings.set({ voice: patch });
  SettingsUI.set(S);
  renderVoicePickers();
}

window.App = {
  settings: () => S,
  async saveSettings(patch) { S = await window.kairo.settings.set(patch); SettingsUI.set(S); applyLook(); applyHandsFree(); return S; },
  go, applyAccent, renderVoicePickers, syncHomeOrb,
  addVoiceFile(name, content, path) {
    chatLog.push({ role: 'assistant', text: `[[file: ${name}]]\n${content}\n[[/file]]`, actionsDone: true, fileResults: [{ path }] });
    saveHistory(); renderAll();
  },
  addVoiceTurn(user, ai) {
    if (user) chatLog.push({ role: 'user', text: '🎙 ' + user });
    if (ai) chatLog.push({ role: 'assistant', text: ai });
    saveHistory();
    renderAll();
  },
  askInChat(text, opts) { go('chat'); setTimeout(() => send(text, opts), 100); }
};
window.kairo.onFocusInput(() => { go('chat'); $('input').focus(); });

// ---------- Start ----------
(async function boot() {
  S = await window.kairo.settings.get();
  window.APP_LANG = S.language;
  applyLook();
  SettingsUI.init(S, (next, patch) => {
    S = next; applyLook(); renderVoicePickers();
    if (patch.voice || patch.keys) applyHandsFree();
    if (patch.language) Games.refresh();
  });
  Games.init();
  LiveVoice.init();
  Today.init(() => S);
  Home.init();
  Extras.init();
  ChessExtra.init();
  window.kairo.onSettingsChanged(async () => { S = await window.kairo.settings.get(); SettingsUI.set(S); applyLook(); applyHandsFree(); });
  // morning briefing: once a day, the first time Kairo is opened in the morning
  setTimeout(async () => {
    if (S.keys.gemini || S.keys[S.provider]) {
      if (await window.kairo.briefing.due()) { go('today'); Today.briefing(true); }
    }
  }, 3500);
  setInterval(async () => { if (!document.hidden && (await window.kairo.briefing.due())) { go('today'); Today.briefing(true); } }, 15 * 60000);
  renderVoicePickers();
  $('micBtn').title = t('chat.voice') + ' (Ctrl+Shift+K)';
  loadHistory();
  renderAll();
  setTimeout(() => { $('boot').remove(); $('input').focus(); applyHandsFree(); }, 2200);
})();
