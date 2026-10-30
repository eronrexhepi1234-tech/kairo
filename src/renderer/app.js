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
// own theme: background, panel and text colour; the other tokens are mixed from them
const THEME_VARS = ['--bg', '--bg2', '--bg3', '--line', '--text', '--muted', '--shadow'];
function previewTheme(c) {
  const st = document.documentElement.style;
  if (!c) { THEME_VARS.forEach(v => st.removeProperty(v)); return; }
  const mix = (a, b, p) => `color-mix(in srgb, ${a} ${100 - p}%, ${b})`;
  st.setProperty('--bg', c.bg);
  st.setProperty('--bg2', mix(c.bg, c.panel, 60));
  st.setProperty('--bg3', c.panel);
  st.setProperty('--line', mix(c.panel, c.text, 14));
  st.setProperty('--text', c.text);
  st.setProperty('--muted', mix(c.text, c.bg, 45));
  st.setProperty('--shadow', 'rgba(0,0,0,.45)');
  document.body.style.background = c.bg;
}
function applyLook() {
  const d = document.documentElement;
  d.dataset.theme = S.theme; d.dataset.motion = S.motion; d.dataset.font = S.font; d.dataset.density = S.density;
  previewTheme(S.theme === 'custom' && S.customTheme ? S.customTheme : null);
  if (S.theme !== 'custom') document.body.style.background = '';
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
  $('homeOrbText').textContent = t(S.voice.handsFree && S.keys.gemini ? (S.wakeWord ? 'ww.say' : 'hf.sayHello') : 'home.tap');
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
    if (view === 'today') { window.Extras2?.renderToday(); window.Fun?.init(); window.Show?.mount(); }
    if (view === 'games') window.Fun?.init();
    if (view === 'phone') loadMac();
    if (view === 'today') { Today.refresh(); Life.refreshToday(); }
    if (view === 'school') Life.renderSchool();
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
const WANTS_SEE_RX = /(zeig|show|trego|montre|muestra|mostra|göster|wo ist|where is|ku është|où est|dónde|dove|nerede|geh|flieg|fly|zoom|reise|bring mich|take me|go to|shko|vai|ve a|git)/i;

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

const PROMPT_RX = /\[\[prompt:\s*([^\]\n]*)\]\]\n?([\s\S]*?)(?:\[\[\/prompt\]\]|$)/g;
function parseReply(text) {
  const files = [], prompts = [];
  let shown = (text || '').replace(PROMPT_RX, (_, target, body) => { prompts.push({ target: target.trim() || 'ChatGPT', text: body.replace(/\n$/, '') }); return `\n\n%%PROMPT${prompts.length - 1}%%\n\n`; }).replace(FILE_RX, (_, name, content) => {
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
  const images = grab(/\[\[image:\s*([^\]]+)\]\]/gi);
  const pptx = grab(/\[\[pptx:\s*([^\]]+)\]\]/gi).map(s => { const [topic, n] = s.split('|').map(x => x.trim()); return { topic, slides: +n || 8 }; });
  const split = rx => grab(rx).map(s => s.split('|').map(x => x.trim()));
  const homework = split(/\[\[homework:\s*([^\]]+)\]\]/gi).map(([subject, task, due]) => ({ subject, task: task || subject, due: /^\d{4}-\d\d-\d\d$/.test(due || '') ? due : '' }));
  const exams = split(/\[\[exam:\s*([^\]]+)\]\]/gi).map(([subject, date, topic]) => ({ subject, date: /^\d{4}-\d\d-\d\d$/.test(date || '') ? date : '', topic: topic || '' }));
  const money = split(/\[\[money:\s*([^\]]+)\]\]/gi).map(([amount, note]) => ({ amount: parseFloat(String(amount).replace(',', '.')) || 0, note: note || '' })).filter(m => m.amount);
  const diary = split(/\[\[diary:\s*([^\]]+)\]\]/gi).map(([mood, text]) => text ? { mood, text } : { mood: '🙂', text: mood });
  const routines = grab(/\[\[routine:\s*([^\]]+)\]\]/gi);
  const recipes = grab(/\[\[recipe:\s*([^\]]+)\]\]/gi), patches = grab(/\[\[patch:\s*([^\]]+)\]\]/gi), vfx = grab(/\[\[voicefx:\s*([^\]]+)\]\]/gi);
  const bdays = split(/\[\[birthday:\s*([^\]]+)\]\]/gi).map(([name, date]) => ({ name, date }));
  const sw = name => { const m = shown.match(new RegExp('\\[\\[' + name + '(?::\\s*(on|off|an|aus))?\\s*\\]\\]', 'i')); return m ? !/off|aus/i.test(m[1] || 'on') : null; };
  const show = { jarvis: sw('jarvis'), pet: sw('pet'), subs: sw('subtitles'), comment: sw('commentator'), dweather: sw('desktopweather'), radio: /\[\[radio\]\]/i.test(shown), quiz: /\[\[musicquiz\]\]/i.test(shown), tv: /\[\[worldtv\]\]/i.test(shown), party: /\[\[party\]\]/i.test(shown),
    game: (shown.match(/\[\[game:\s*([^\]]+)\]\]/i) || [])[1] || null, flight: (shown.match(/\[\[flight:\s*([^\]]+)\]\]/i) || [])[1] || null };
  shown = shown.replace(/\[\[(jarvis|pet|subtitles|commentator|desktopweather)(:[^\]]*)?\]\]/gi, '').replace(/\[\[(radio|musicquiz|worldtv|party)\]\]/gi, '').replace(/\[\[(game|flight):[^\]]*\]\]/gi, '');
  const studio = { logo: (shown.match(/\[\[logo:\s*([^\]]+)\]\]/i) || [])[1] || null, mc: (shown.match(/\[\[minecraft:\s*([^\]]+)\]\]/i) || [])[1] || null,
    inv: (shown.match(/\[\[invent:\s*([^\]]+)\]\]/i) || [])[1] || null, social: /\[\[social\]\]/i.test(shown) };
  shown = shown.replace(/\[\[(logo|minecraft|invent):[^\]]*\]\]/gi, '').replace(/\[\[social\]\]/gi, '');
  const build = { app: (shown.match(/\[\[buildapp:\s*([^\]]+)\]\]/i) || [])[1] || null, site: (shown.match(/\[\[website:\s*([^\]]+)\]\]/i) || [])[1] || null,
    change: (shown.match(/\[\[appchange:\s*([^\]]+)\]\]/i) || [])[1] || null, how: (shown.match(/\[\[howitworks:\s*([^\]]+)\]\]/i) || [])[1] || null, shop: /\[\[ideashop\]\]/i.test(shown) };
  build.pro = (shown.match(/\[\[pro:\s*([^\]]+)\]\]/i) || [])[1] || null;
  shown = shown.replace(/\[\[(buildapp|website|appchange|howitworks|pro):[^\]]*\]\]/gi, '').replace(/\[\[ideashop\]\]/gi, '');
  const space = { solar: (shown.match(/\[\[solar(?::\s*([^\]]*))?\]\]/i) || [])[0] ? ((shown.match(/\[\[solar:\s*([^\]]+)\]\]/i) || [])[1] || true) : null,
    doc: (shown.match(/\[\[doku:\s*([^\]]+)\]\]/i) || [])[1] || null, whatif: (shown.match(/\[\[whatif:\s*([^\]]+)\]\]/i) || [])[1] || null };
  shown = shown.replace(/\[\[(solar|doku|whatif)(:[^\]]*)?\]\]/gi, '');
  const guardTag = (shown.match(/\[\[guard:\s*(on|off|an|aus)\s*\]\]/i) || [])[1];
  const flags = { guard: guardTag ? /on|an/i.test(guardTag) : null, viz: /\[\[visualizer\]\]/i.test(shown), song: /\[\[song\]\]/i.test(shown), pc: /\[\[pccheck\]\]/i.test(shown), geo: /\[\[geoguessr\]\]/i.test(shown), riddle: /\[\[riddle\]\]/i.test(shown) };
  shown = shown.replace(/\[\[(visualizer|song|pccheck|geoguessr|riddle)\]\]/gi, '').replace(/\[\[guard:[^\]]*\]\]/gi, '');
  const countries = grab(/\[\[country:\s*([^\]]+)\]\]/gi), cams = grab(/\[\[webcam:\s*([^\]]+)\]\]/gi);
  const layers = grab(/\[\[layer:\s*([^\]]+)\]\]/gi), tours = grab(/\[\[tour:\s*([^\]]+)\]\]/gi), roles = grab(/\[\[voice:\s*([^\]]+)\]\]/gi);
  const countdowns = split(/\[\[countdown:\s*([^\]]+)\]\]/gi).map(([name, date]) => ({ name, date }));
  shown = shown.replace(/\[\[(image|pptx|homework|exam|money|diary|routine|layer|tour|voice|countdown|country|webcam|recipe|patch|voicefx|birthday):[^\]]*\]\]/gi, '');
  const tidy = /\[\[tidy\]\]/i.test(shown), briefing = /\[\[briefing\]\]/i.test(shown);
  const cards = grab(/\[\[cards:\s*([^\]]+)\]\]/gi)[0] || null;
  const translate = grab(/\[\[translate:\s*([^\]]+)\]\]/gi).map(s => s.split('|').map(x => x.trim()))[0] || null;
  const readAloud = /\[\[read\]\]/i.test(shown), saveClip = /\[\[clip\]\]/i.test(shown);
  shown = shown.replace(/\[\[(read|clip)\]\]/gi, '').replace(/\[\[(cards|translate):[^\]]*\]\]/gi, '');
  const quiz = grab(/\[\[quiz:\s*([^\]]+)\]\]/gi)[0] || null;
  shown = shown.replace(OPEN_RX, '').replace(APP_RX, '').replace(FLY_RX, '')
    .replace(/\[\[(chess|tidy|briefing)\]\]/gi, '').replace(/\[\[(remember|forget|remind|alarm|pc|quiz):[^\]]*\]\]/gi, '').trim();
  // leftovers like empty ``` fences around removed tags
  shown = shown.replace(/^\s*`{1,3}\s*$/gm, '').replace(/`{2,3}(?=\s*$)/g, '').replace(/\n{3,}/g, '\n\n').trim();
  const sendPrompt = /\[\[send-prompt\]\]/i.test(shown);
  shown = shown.replace(/\[\[send-prompt\]\]/gi, '');
  return { prompts, sendPrompt, shown, files, opens, apps, places, chess, remember, forget, reminds, pcs, tidy, briefing, quiz, cards, translate, readAloud, saveClip, images, pptx, homework, exams, money, diary, routines, layers, tours, roles, countdowns, countries, cams, recipes, patches, vfx, bdays, flags, show, space, studio, build };
}

// prompt for another AI: card with copy + open buttons
function promptCard(p, streaming) {
  if (!p) return '';
  const id = 'pc' + Math.random().toString(36).slice(2, 8);
  const targets = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity'];
  return `<div class="prompt-card ${streaming ? 'writing' : ''}" id="${id}" data-text="${escAttr(p.text)}">
    <div class="pc-head"><span class="pc-badge">${ic('wand-sparkles')}</span><div><small>${t('pr.for')}</small><b>${escAttr(p.target)}</b></div>
      <span class="pc-len">${p.text.length.toLocaleString()} ${t('file.chars')}</span></div>
    <pre class="pc-text">${escAttr(p.text)}</pre>
    ${streaming ? '' : `<div class="pc-actions"><button class="btn" data-pc="copy">${ic('copy')} ${t('pr.copy')}</button>${targets.map(x => `<button class="btn ${p.target.toLowerCase().includes(x.toLowerCase()) ? 'primary' : ''}" data-pc="open" data-target="${x}">${ic('arrow-up-right')} ${x}</button>`).join('')}</div>`}
  </div>`;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-pc]');
  if (!b) return;
  const card = b.closest('.prompt-card'), text = card.dataset.text;
  if (b.dataset.pc === 'copy') { await navigator.clipboard.writeText(text); b.classList.add('done'); window.toast(t('pr.copied')); setTimeout(() => b.classList.remove('done'), 1500); }
  if (b.dataset.pc === 'open') { const r = await window.kairo.prompt.open(b.dataset.target, text); if (r.ok) window.toast(r.prefilled ? `${r.target} ↗` : `${r.target} ↗ · ${t('pr.pasted')}`); }
});

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
  if (p.sendPrompt && p.prompts[0]) { const r = await window.kairo.prompt.open(p.prompts[0].target, p.prompts[0].text); if (r.ok) m.done.push('↗ ' + r.target + (r.prefilled ? '' : ' · ' + t('pr.pasted'))); }
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
  const L = window.kairo.life;
  for (const h of p.homework) { await Life.addHomework(h); m.done.push('📚 ' + (h.subject ? h.subject + ': ' : '') + h.task.slice(0, 40)); }
  for (const e of p.exams) { await Life.addExam(e); m.done.push('📝 ' + e.subject + (e.date ? ' · ' + e.date : '')); }
  for (const x of p.money) { await L.add('money', x); m.done.push(`💰 ${x.amount > 0 ? '+' : ''}${x.amount.toFixed(2)} ${x.note}`); }
  for (const d of p.diary) { await L.add('diary', { date: new Date().toLocaleDateString('sv'), mood: d.mood, text: d.text }); m.done.push('📔 ' + d.mood); }
  if (p.money.length || p.diary.length) { Life.renderMoney(); Life.renderDiary(); }
  if (p.studio.logo) { m.done.push('🎨 ' + p.studio.logo); setTimeout(() => LogoMaker.open(p.studio.logo), 300); }
  if (p.studio.mc) { m.done.push('⛏ ' + p.studio.mc); setTimeout(() => McBuilder.open(p.studio.mc), 300); }
  if (p.studio.inv) { m.done.push('💡 ' + p.studio.inv); setTimeout(() => Inventor.open(p.studio.inv), 300); }
  if (p.build.app) { m.done.push('Builder: ' + p.build.app); setTimeout(() => Builder.open({ tab: 'sketch', idea: p.build.app }), 300); }
  if (p.build.site) { const [idea, min] = p.build.site.split('|').map(x => x.trim()); m.done.push('Website: ' + idea); setTimeout(() => Builder.site(idea, +min || 5), 300); }
  if (p.build.change) { m.done.push('Ändern: ' + p.build.change); setTimeout(() => { Builder.open(); Builder.change(p.build.change); }, 300); }
  if (p.build.shop) setTimeout(() => Builder.open({ tab: 'shop' }), 300);
  if (p.build.pro) { const [tl, arg] = p.build.pro.split('|').map(x => x.trim()); const id = { present: 'present', presentation: 'present', path: 'path', learnpath: 'path' }[tl] || tl; m.done.push('Kairo Pro'); setTimeout(() => Pro.open(id, arg || undefined), 300); }
  if (p.build.how) { m.done.push('Erklärung: ' + p.build.how); setTimeout(() => HowItWorks.open(p.build.how), 300); }
  if (p.studio.social) { m.done.push('🎬 Social Studio'); setTimeout(() => SocialStudio.open(), 300); }
  if (p.space.solar) { m.done.push('🪐 ' + t('sh.solar')); setTimeout(() => SolarSystem.open(typeof p.space.solar === 'string' ? p.space.solar : null), 300); }
  if (p.space.doc) { m.done.push('🎬 ' + p.space.doc); setTimeout(() => StoryPlayer.doc(p.space.doc), 300); }
  if (p.space.whatif) { m.done.push('✨ ' + p.space.whatif); setTimeout(() => StoryPlayer.whatIf(p.space.whatif), 300); }
  const sh = p.show;
  if (sh.jarvis != null) { Jarvis.set(sh.jarvis); m.done.push('🦾 Jarvis'); }
  if (sh.pet != null) { Pet.set(sh.pet); m.done.push('🐉 ' + t('sh.pet')); }
  if (sh.subs != null) { sh.subs ? Subtitles.start() : Subtitles.stop(); m.done.push('💬 ' + t('sh.subs')); }
  if (sh.comment != null) { Commentator.set(sh.comment); m.done.push('🎙 ' + t('sh.comment')); }
  if (sh.dweather != null) { DesktopWeather.set(sh.dweather); m.done.push('🌧 ' + t('sh.weather')); }
  if (sh.radio) setTimeout(() => RadioShow.open(), 300);
  if (sh.quiz) setTimeout(() => MusicQuiz.open(), 300);
  if (sh.tv) setTimeout(() => WorldTV.open(), 300);
  if (sh.party) Party.party();
  if (sh.game) { m.done.push('🎮 ' + sh.game); setTimeout(() => GameMaker.open(sh.game), 300); }
  if (sh.flight) { m.done.push('✈ ' + sh.flight); setTimeout(() => Flight.track(sh.flight), 300); }
  if (p.recipes[0]) { m.done.push('🍳 ' + p.recipes[0]); setTimeout(() => Cook.open(p.recipes[0]), 300); }
  if (p.patches[0]) { m.done.push('📜 ' + p.patches[0]); setTimeout(() => { go('games'); GamesExtra.mount(); GamesExtra.patch(p.patches[0]); }, 300); }
  if (p.vfx[0]) { VoiceFX.set(p.vfx[0].toLowerCase()); setTimeout(() => { go('games'); Games.showGame('voicefx'); }, 300); m.done.push('🎤 ' + p.vfx[0]); }
  for (const b of p.bdays) { const r = await window.kairo.fun.bdAdd(b); m.done.push(r.ok ? '🎂 ' + b.name : '✕ ' + r.error.message); }
  if (p.flags.guard != null) { await AlertsUI.setGuard(p.flags.guard); m.done.push((p.flags.guard ? '👁 ' : '') + t(p.flags.guard ? 'al.guardOnToast' : 'al.guardOffToast')); }
  if (p.flags.viz) { m.done.push('🎧'); setTimeout(() => MusicViz.open(), 300); }
  if (p.flags.song) { m.done.push('🎶'); setTimeout(() => SongFinder.open(), 300); }
  if (p.flags.pc) { m.done.push('🧮'); setTimeout(() => PcCheck.open(), 300); }
  if (p.flags.geo) { m.done.push('🗺 GeoGuessr'); setTimeout(() => { go('games'); Geo.start(); }, 300); }
  if (p.flags.riddle) { m.done.push('🧩'); setTimeout(() => { go('games'); Games.showGame('riddle'); }, 300); }
  if (p.countries[0]) { m.done.push('🌍 ' + p.countries[0]); setTimeout(() => Country.show(p.countries[0]), 300); }
  if (p.cams[0]) { m.done.push('📷 ' + p.cams[0]); setTimeout(() => Webcam.open(p.cams[0]), 300); }
  for (const l of p.layers) { const k = l.toLowerCase(); go('earth'); Earth.init(); EarthLayers.set(k, true); m.done.push('🌍 ' + (t('lay.' + k) || k)); }
  if (p.tours[0]) { m.done.push('🎬 ' + p.tours[0]); setTimeout(() => Tour.start(p.tours[0]), 400); }
  for (const r of p.roles) { await Extras2.setRole(r.toLowerCase(), S); m.done.push('🎭 ' + r); }
  for (const c of p.countdowns) { const r = await window.kairo.extras2.countdowns.add(c); m.done.push(r.ok ? '⏳ ' + c.name : '✕ ' + r.error.message); }
  for (const r of p.routines) { const res = await Life.runRoutine(r); m.done.push(res.ok ? '⚡ ' + res.name : '✕ ' + res.error); }
  m.imageResults = [];
  for (const prompt of p.images) {
    const r = await window.kairo.create.image(prompt);
    m.imageResults.push(r.ok ? { path: r.path, source: r.source } : { error: r.error.message });
  }
  for (const x of p.pptx) {
    const r = await window.kairo.create.pptx(x.topic, { slides: x.slides });
    m.fileResults.push(r.ok ? { path: r.path } : { error: r.error.message });
    m.pptxNames = (m.pptxNames || []).concat(r.ok ? r.title + '.pptx' : x.topic);
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
  e.preventDefault();
  window.kairo.action({ type: b.dataset.fa, path: b.dataset.path });
});

function fillAI(el, m, streaming) {
  const { shown, files, places, prompts } = parseReply(m.text);
  let html = renderMarkdown(shown) + (streaming ? '<span class="caret"></span>' : '');
  html = html.replace(/(?:<p>)?%%FILE(\d+)%%(?:<\/p>)?/g, (_, i) => fileCard(files[i], m.fileResults?.[i], streaming && !m.fileResults));
  html = html.replace(/(?:<p>)?%%PROMPT(\d+)%%(?:<\/p>)?/g, (_, i) => promptCard(prompts[i], streaming));
  el.innerHTML = html;
  // generated pictures and presentations
  for (const im of m.imageResults || []) {
    el.insertAdjacentHTML('beforeend', im.path
      ? `<figure class="gen-img"><img src="file:///${escAttr(im.path.replace(/\\/g, '/'))}" alt=""><figcaption>${escAttr(im.source || '')} · <a href="#" data-fa="openfile" data-path="${escAttr(im.path)}">${t('files.open')}</a> · <a href="#" data-fa="reveal" data-path="${escAttr(im.path)}">${t('file.folder')}</a></figcaption></figure>`
      : `<p class="msg error">🎨 ${escAttr(im.error)}</p>`);
  }
  if (streaming && /\[\[(image|pptx):/i.test(m.text || '')) el.insertAdjacentHTML('beforeend', `<div class="msg-status">${t('im.making')}</div>`);
  const pptxStart = files.length;
  (m.pptxNames || []).forEach((name, i) => el.insertAdjacentHTML('beforeend', fileCard({ name, content: '' }, m.fileResults?.[pptxStart + i], false)));
  if (m.done?.length) el.insertAdjacentHTML('beforeend', `<div class="sources">${m.done.map(d => `<span class="source done">${escAttr(d)}</span>`).join('')}</div>`);
  if (streaming) return;
  if (m.sources?.length) {
    el.insertAdjacentHTML('beforeend', `<div class="sources">${m.sources.map(s => `<a class="source" href="${escAttr(s.link)}" data-ext title="${escAttr(s.title)}">${escAttr(s.source || 'link')}</a>`).join('')}</div>`);
  }
  const tools = document.createElement('div');
  tools.className = 'msg-tools';
  tools.innerHTML = `<button class="tool-btn" data-a="copy"><svg><use href="#i-copy"/></svg>${t('chat.copy')}</button>
    <button class="tool-btn" data-a="speak"><svg><use href="#i-volume"/></svg>${t('chat.speak')}</button>` +
    places.map(p => `<button class="tool-btn" data-a="fly" data-place="${escAttr(p)}"><svg><use href="#i-pin"/></svg>${escAttr(p.split('|')[0].trim())}</button>`).join('');
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
  chatLog.forEach((m, i) => {
    if (m.weather) { const w = document.createElement('div'); w.className = 'msg wx-msg'; box.appendChild(w); WeatherFX.card(w, m.weather); }
    box.appendChild(msgEl(m, i));
  });
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

  // handled locally: a routine's trigger phrase ("Gute Nacht")
  const routine = await Life.matchPhrase(text);
  if (routine) {
    addMsg({ role: 'user', text });
    const am = { role: 'assistant', text: '⚡ **' + routine.name + '**', actionsDone: true, done: [] };
    const el = addMsg(am);
    const r = await Life.runRoutine(routine.name);
    am.done.push(r.ok ? '✓ ' + (routine.steps || []).length + ' ' + t('rt.steps') : '✕');
    fillAI(el, am); saveHistory();
    return;
  }

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
    folderContext: attach.folderCtx,
    fileContext: attach.file || null
  };
  if (attach.file) { attach.file = null; setChip('chipFile', false); $('chipFileLabel').textContent = t('chip.file'); }
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
  // pictures take a few seconds: show the answer with a "painting" placeholder meanwhile
  const pending = r.ok ? parseReply(aiMsg.text) : null;
  if (pending?.images.length) { el.classList.remove('streaming'); fillAI(el, { ...aiMsg, done: [] }); pending.images.forEach(() => el.insertAdjacentHTML('beforeend', `<div class="paint"><span>${t('im.making')}</span></div>`)); scrollDown(); }
  if (r.ok) await runActions(aiMsg);
  fillAI(el, aiMsg);
  saveHistory();
  scrollDown();

  const { places, shown } = parseReply(aiMsg.text);
  if (places.length) { go('earth'); setTimeout(() => Earth.flyToName(places[0]), 250); }
  if (S.voice.autoSpeak && r.ok) Voice.speak(shown.replace(/%%FILE\d+%%/g, ''), S);
}

window.kairo.chat.onEvent((id, type, payload) => {
  if (id !== currentReq) return;
  const el = $('messages').lastElementChild;
  const m = chatLog[chatLog.length - 1];
  if (type === 'status') el.innerHTML = `<div class="msg-status">${t('status.' + payload)}</div>`;
  if (type === 'sources') m.sources = payload;
  if (type === 'weather') {
    // animated weather card goes above the streaming answer
    m.weather = payload;
    const wrap = document.createElement('div');
    wrap.className = 'msg wx-msg';
    el.before(wrap);
    WeatherFX.card(wrap, payload);
    scrollDown();
  }
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
async function attachFile(r) {
  if (!r.ok) return window.toast('✕ ' + r.error.message);
  if (!r.file) return;
  attach.file = r.file;
  setChip('chipFile', true);
  $('chipFileLabel').textContent = r.file.name.length > 22 ? r.file.name.slice(0, 20) + '…' : r.file.name;
  window.toast((r.file.kind === 'pdf' ? `PDF · ${r.file.pages} ${t('pr.pages')}` : r.file.name) + ' ✓');
  $('input').focus();
}
$('chipFile').onclick = async () => {
  if (attach.file) { attach.file = null; setChip('chipFile', false); $('chipFileLabel').textContent = t('chip.file'); return; }
  attachFile(await window.kairo.attachFile());
};
// drag a PDF / picture / document onto the chat
document.addEventListener('dragover', e => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); document.body.classList.add('drop-on'); } });
document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('drop-on'); });
document.addEventListener('drop', async e => {
  document.body.classList.remove('drop-on');
  const f = e.dataTransfer?.files?.[0];
  if (!f) return;
  e.preventDefault();
  const p = window.kairo.pathForFile(f);
  if (!p) return;
  go('chat');
  attachFile(await window.kairo.attachPath(p));
});
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
async function loadMac() { const i = await window.kairo.remote.info(); $('macAddr').textContent = i.mac || '—'; checkFirewall(); }

// Firewall status for the phone remote, with a button that asks Windows for permission.
async function checkFirewall(result) {
  const el = $('fwCard');
  if (!result) el.innerHTML = `<div class="msg-status">${t('fw.checking')}</div>`;
  const r = result || await window.kairo.remote.firewall();
  if (!r.ok) { el.innerHTML = ''; return; }
  const pub = /public/i.test(r.network);
  let html;
  if (r.allowed && !pub) html = `<div class="fw ok">✅ <div><b>${t('fw.ok')}</b><small>${t('fw.okSub')}</small></div></div>`;
  else {
    html = `<div class="fw ${r.blocked ? 'bad' : 'warn'}">${r.blocked ? '⛔' : '⚠️'} <div><b>${t(r.blocked ? 'fw.blocked' : 'fw.none')}</b><small>${t('fw.what')}</small></div>
      <button class="btn primary" id="fwAllow">🛡 ${t('fw.allow')}</button></div>`;
  }
  if (pub) html += `<div class="fw warn">⚠️ <div><b>${t('fw.public')}</b><small>${t('fw.publicSub')}</small></div><button class="btn" id="fwNet">${t('fw.openSettings')}</button></div>`;
  el.innerHTML = html;
  if ($('fwAllow')) $('fwAllow').onclick = async () => {
    $('fwAllow').disabled = true; $('fwAllow').textContent = t('fw.waiting');
    const res = await window.kairo.remote.allowFirewall();
    checkFirewall(res);
    toast(res.ok && res.allowed ? '✅ ' + t('fw.ok') : t('fw.notChanged'));
  };
  if ($('fwNet')) $('fwNet').onclick = () => window.kairo.action({ type: 'open', url: 'ms-settings:network-status' });
}
function showRemote(r) {
  if (!r.ok) return toast(r.error.message);
  $('qrCard').hidden = false;
  $('qrImg').src = r.qr;
  $('qrLink').textContent = r.link;
  $('remoteStart').hidden = true;
  $('remoteStop').hidden = false;
  if (r.mac) $('macAddr').textContent = r.mac;
}
$('remoteStart').onclick = async () => { showRemote(await window.kairo.remote.start()); checkFirewall(); };
$('remoteStop').onclick = async () => { await window.kairo.remote.stop(); $('qrCard').hidden = true; $('remoteStart').hidden = false; $('remoteStop').hidden = true; };
$('remoteReset').onclick = async () => { await window.kairo.remote.reset(); $('qrCard').hidden = true; $('remoteStart').hidden = false; $('remoteStop').hidden = true; toast('✓'); };
window.kairo.remote.onAutostart(async () => showRemote(await window.kairo.remote.start()));
// lightbox: click a picture, it grows from where it is to the middle of the screen
document.addEventListener('click', e => {
  const img = e.target.closest('.gen-img img, .preview img');
  if (!img || img.closest('.lightbox')) return;
  e.preventDefault();
  const r = img.getBoundingClientRect();
  const box = document.createElement('div'); box.className = 'lightbox';
  const big = img.cloneNode(); big.removeAttribute('style');
  Object.assign(big.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  box.appendChild(big); document.body.appendChild(box);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    box.classList.add('on');
    const ratio = r.width / r.height, maxW = innerWidth * 0.86, maxH = innerHeight * 0.86;
    const w = Math.min(maxW, maxH * ratio), h = w / ratio;
    Object.assign(big.style, { left: (innerWidth - w) / 2 + 'px', top: (innerHeight - h) / 2 + 'px', width: w + 'px', height: h + 'px' });
  }));
  box.onclick = () => {
    box.classList.remove('on');
    Object.assign(big.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    setTimeout(() => box.remove(), 550);
  };
});

// requests from the phone
window.kairo.remote.onRequest('remote:today', async () => {
  const [rem, hw] = await Promise.all([window.kairo.reminders.list(), window.kairo.life.list('homework')]);
  const w = S.city ? await window.kairo.weather() : null;
  const routines = await window.kairo.life.list('routines');
  return {
    weather: w?.ok ? { place: w.place, temp: w.now.temp, icon: w.now.icon, text: w.now.text, max: w.days[0].max, min: w.days[0].min } : null,
    reminders: rem.slice(0, 6).map(r => ({ at: r.at, text: r.text, kind: r.kind })),
    homework: hw.filter(h => !h.done).slice(0, 8).map(h => ({ subject: h.subject, task: h.task, due: h.due })),
    routines: routines.map(r => r.name)
  };
});
window.kairo.remote.onRequest('remote:routine', name => Life.runRoutine(name));
window.kairo.remote.onRequest('remote:music', mood => { Today.playMood(mood); return true; });

window.kairo.remote.onEvent(ev => {
  // a chat from the phone can open things on the PC ("open YouTube")
  if (ev.type === 'remote-reply' && ev.text) runActions({ role: 'assistant', text: ev.text }).catch(() => {});
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
  LiveVoice.setHandsFree(on, S.voice.sensitivity, S.wakeWord);
  $('hfPill').hidden = !S.keys.gemini;
  $('hfPill').classList.toggle('on', on);
  $('homeOrbText').textContent = t(on ? (S.wakeWord ? 'ww.say' : 'hf.sayHello') : 'home.tap');
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
  previewTheme,
  async saveSettings(patch) { S = await window.kairo.settings.set(patch); SettingsUI.set(S); applyLook(); applyHandsFree(); return S; },
  go, applyAccent, renderVoicePickers, syncHomeOrb,
  addVoiceImage(prompt, r) {
    chatLog.push({ role: 'assistant', text: '🎨 ' + prompt, actionsDone: true, imageResults: [{ path: r.path, source: r.source }] });
    saveHistory(); renderAll();
  },
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
  askInChat(text, opts) { go('chat'); setTimeout(() => send(text, opts), 100); },
  // a spoken command from voice mode ("Jarvis-Modus an", "Flug LX8 verfolgen"...)
  async runCommand(cmd) {
    const c = cmd.toLowerCase(), off = /\b(aus|ausschalten|stopp|stop|weg|beenden|off)\b/.test(c);
    const quick = [
      [/jarvis|hud/, () => (Jarvis.set(!off), 'Jarvis-Modus ' + (off ? 'aus' : 'an'))],
      [/haustier|\bpet\b|drache(n)? zeigen/, () => (Pet.set(!off), 'Haustier ' + (off ? 'versteckt' : 'ist da'))],
      [/party|feuerwerk/, () => (Party.party(), 'Party gestartet')],
      [/sonnensystem|planeten/, () => (SolarSystem.open(), 'Sonnensystem ist offen')],
      [/social studio|tiktok|youtube.?video/, () => (SocialStudio.open(), 'Social Studio ist offen')],
      [/super-?suche|suche öffnen/, () => (window.kairo.search.toggle(), 'Super-Suche ist offen')],
      [/musik-?quiz/, () => (MusicQuiz.open(), 'Musik-Quiz gestartet')],
      [/welt-?tv|webcams? der welt/, () => (WorldTV.open(), 'Welt-TV läuft')],
      [/radio/, () => (RadioShow.open(), 'Radio-Show startet')],
      [/untertitel|subtitle/, () => (off ? Subtitles.stop() : Subtitles.start(), 'Live-Untertitel ' + (off ? 'aus' : 'an'))],
      [/kommentator|kommentier/, () => (Commentator.set(!off), 'Kommentator ' + (off ? 'aus' : 'an'))],
      [/wetter auf (dem )?(desktop|bildschirm)/, () => (DesktopWeather.set(!off), 'Wetter auf dem Desktop ' + (off ? 'aus' : 'an'))]
    ];
    // features that open a window or overlay: a fast local check, so they open right away and Kairo comes to the front
    const shown0 = document.querySelectorAll('.xo.on, .fx-ov.on').length, view0 = document.querySelector('.view.active')?.id;
    const front = () => { if (document.hidden || document.querySelectorAll('.xo.on, .fx-ov.on').length > shown0 || document.querySelector('.view.active')?.id !== view0) window.kairo.showWindow(); };
    const routed = await this.routeFeature(cmd);
    if (routed) { setTimeout(front, 400); return routed; }
    for (const [rx, fn] of quick) if (rx.test(c)) { const r = fn(); setTimeout(front, 400); return r; }
    const fl = cmd.match(/\b([a-z]{2,3}\s?\d{1,4}[a-z]?)\b/i);
    if (/flug|flight/.test(c) && fl) { const f = await Flight.track(fl[1]); return f ? 'Flug wird verfolgt' : 'Flug nicht gefunden'; }
    // everything else: the AI picks the app action tags, the app runs them
    const r = await window.kairo.complete({ text: cmd, extraSystem: 'This is a command for the app (from voice mode). Reply with ONLY the app action tag(s) that do it, plus at most one short sentence.' });
    if (!r.ok) return 'Hat nicht geklappt: ' + (r.error?.message || '');
    const m = { role: 'assistant', text: r.text };
    await runActions(m);
    const { places, shown } = parseReply(r.text);
    if (places.length) { go('earth'); setTimeout(() => Earth.flyToName(places[0]), 150); m.done.push('🌍 ' + places[0]); }
    setTimeout(front, 700);
    return ((m.done || []).join(', ') + ' ' + shown).trim() || 'Erledigt';
  },
  // "Erstelle eine Webseite über …", "Wie funktioniert ein Vulkan", "Mach eine Doku über …" -> opens the right feature
  async routeFeature(cmd) {
    const c = cmd.toLowerCase().trim();
    // the subject: everything after "über/zu/für/von", or the sentence without the command words
    const topic = rx => {
      const s = cmd.replace(/[?!.]+$/, '').trim();
      const m = s.match(/(?:^|\s)(?:über|ueber|zum thema|zu|für|fuer|about|von)\s+(.+)$/i);
      if (m) return m[1].trim();
      return s.replace(rx, ' ').replace(/(?<![\p{L}\d])(kairo|bitte|mal|kannst du|könntest du|kann(st)? man|mir|mich|uns|eine?n?|einem|der|die|das|den|ein|neue?n?|coole?n?|schnell|jetzt|bau|baue|baust|mach|mache|machst|erstell|erstelle|erstellst|programmier|programmiere|zeig|zeige|öffne|starte?|ich will|ich möchte|for me|make|build|create|open|a|an|the)(?![\p{L}\d])/giu, ' ').replace(/\s+/g, ' ').trim();
    };
    const mins = (c.match(/(\d{1,2})\s*(min|minute)/) || [])[1];
    const has = s => document.getElementById(s);
    // Kairo Pro
    const pro = (id, arg, msg) => { Pro.open(id, arg || undefined); return msg; };
    const after = rx => topic(rx);
    if (/\b(agent-?modus|agent mode)\b|^(erledige|bereite)\b|\b(bereite|erledige) (mir )?(alles|meinen|meine|mein)\b/.test(c)) return pro('agent', cmd.replace(/^(kairo,?\s*)?(starte? (den )?agent-?modus( und)?|agent-?modus:?)\s*/i, '') || null, 'Der Agent-Modus ist offen und plant die Schritte. Der Nutzer gibt den Plan dann frei.');
    if (/gedächtnis|was weisst du (alles )?über mich|was weißt du (alles )?über mich|deine erinnerungen|was hast du dir gemerkt/.test(c)) return pro('memory', null, 'Das Gedächtnis-Center ist offen: dort sieht der Nutzer alles, was Kairo weiss, und kann es ändern oder löschen.');
    if (/recherchier|deep research|\brecherche\b/.test(c)) { const t = after(/\b(recherchiere?n?|recherche|deep research|gründlich|genau)\b/gi); return pro('research', t, t ? `Die Recherche zu "${t}" läuft. Kairo liest viele Quellen und schreibt einen Bericht.` : 'Deep Research ist offen. Frag, was recherchiert werden soll.'); }
    if (/\bquellen\b|literaturverzeichnis|\bzitate?\b.*(für|zu)/.test(c)) { const t = after(/\b(quellen|seriöse|finde|such|suche|literaturverzeichnis|zitate?)\b/gi); return pro('sources', t, 'Der Quellen-Finder sucht seriöse Quellen.'); }
    if (/\b(bewerbung|lebenslauf|motivationsschreiben|protokoll|handout|kündigung|formelle[nr]? brief|geschäftsbrief|offerte|angebot schreiben)\b/.test(c)) return pro('document', cmd, 'Die Profi-Dokumente sind offen, die Angaben sind schon eingetragen. Der Nutzer ergänzt sie und klickt auf Erstellen.');
    if (/(verbesser|korrigier).*(text|aufsatz|mail|e-mail|brief)|(text|aufsatz).*(verbesser|korrigier)|schreib-?coach/.test(c)) return pro('coach', null, 'Der Schreib-Coach ist offen. Der Nutzer fügt dort seinen Text ein.');
    if (/übersetz.*(dokument|datei|word|powerpoint|pdf|präsentation)/.test(c)) return pro('translate', null, 'Der Dokument-Übersetzer ist offen. Der Nutzer wählt die Datei.');
    if (/(präsentation|powerpoint|vortrag)/.test(c)) { const t = (cmd.match(/(?:über|zum thema)\s+(.+?)[?.!]*$/i) || [])[1] || null; return pro('present', t, 'Präsentation & Training ist offen' + (t ? `, das Thema "${t}" ist eingetragen.` : '.')); }
    if (/(code|programm|projekt-?ordner|quellcode).*(analys|versteh|anschau|prüf|review|assistent)|(analys|versteh|prüf|review|schau).*(code|quellcode|programm)|code-?assistent/.test(c)) return pro('code', null, 'Der Code-Assistent ist offen. Der Nutzer wählt den Projekt-Ordner.');
    if (/dashboard/.test(c)) { const t = cmd.replace(/^.*?dashboard\s*(mit|für|:)?\s*/i, ''); return pro('dash', t.length > 3 ? t : null, 'Das Dashboard ist offen.'); }
    if (/projekt-?plan|projekt (planen|erstellen|starten|anlegen)|plane? (mir )?(mein|ein) (projekt|ziel)|meilensteine|projekt-?manager/.test(c)) { const t = after(/\b(projekt-?plan|projekt-?manager|projekt|planen|plane|plan|erstellen|starten|anlegen|meilensteine|ziel)\b/gi); return pro('projects', t, 'Der Projekt-Manager ist offen.'); }
    if (/übungsprüfung|probeprüfung|probetest|übungstest|prüfungs-?simulator|(prüfung|\btest\b).*(simulier|üben|mach|erstell|start)|(simulier|üben|mach|erstell|start).*(prüfung|\btest\b)/.test(c)) { const t = (cmd.match(/(?:über|zum thema|zu)\s+(.+?)[?.!]*$/i) || cmd.match(/\bin\s+(.+?)[?.!]*$/i) || [])[1] || null; return pro('exam', t, 'Der Prüfungs-Simulator ist offen. Fach und Thema eintragen, dann starten.'); }
    if (/sprachlehrer|(englisch|französisch|spanisch|italienisch|japanisch|albanisch|deutsch|sprache)\s*(üben|sprechen|reden|lernen|praktizieren)|(üben|sprechen|reden).*(auf )?(englisch|französisch|spanisch|italienisch)/.test(c)) return pro('lang', cmd, 'Der Sprachlehrer ist offen. Der Nutzer wählt Niveau und Situation und startet das Gespräch.');
    if (/lernpfad|lernplan|ich will .{2,40} lernen|bring mir .{2,40} bei/.test(c)) { const m2 = cmd.match(/(?:ich will|ich möchte)\s+(.+?)\s+lernen/i) || cmd.match(/bring mir\s+(.+?)\s+bei/i); const t = m2 ? m2[1] : after(/\b(lernpfad|lernplan|erstellen|lernen)\b/gi); return pro('path', t, 'Der Lernpfad ist offen' + (t ? `, das Ziel "${t}" ist eingetragen.` : '.')); }
    if (/marken-?kit|branding|corporate design|marke (erstellen|aufbauen|entwickeln|machen)/.test(c)) { const t = after(/\b(marken-?kit|branding|corporate design|marke|erstellen|aufbauen|entwickeln)\b/gi); return pro('brand', t, t ? `Kairo entwickelt die Marke für "${t}".` : 'Das Marken-Kit ist offen.'); }
    if (/kairo pro|pro-?studio/.test(c)) return pro(null, null, 'Kairo Pro ist offen.');
    // Builder
    if (/ideen-?shop|idee(n)? shop|start-?ideen/.test(c)) { Builder.open({ tab: 'shop' }); return 'Der Ideen-Shop ist offen.'; }
    if (/skizze|zeichnen|sketch/.test(c) && /app|programm|bau|mach|zeichn/.test(c)) { Builder.open({ tab: 'sketch' }); setTimeout(() => document.getElementById('bdPadOpen')?.click(), 500); return 'Der Skizzenblock ist offen. Der Nutzer kann jetzt zeichnen.'; }
    if (/\b(web-?seite|website|homepage|landing-?page|webpage)\b/.test(c) && !/öffne die website|geh auf|go to/.test(c)) {
      const t = topic(/\b(web-?seite|website|homepage|landing-?page|webpage|\d+\s*min(uten?)?|lang|minuten)\b/gi).replace(/[,;]?\s*(in\s+)?\d{1,2}\s*min(uten?)?\b.*$/i, '').trim();
      if (!t || t.length < 3) { Builder.open({ tab: 'site' }); return 'Der Website-Bauer ist offen. Frag den Nutzer, worum es gehen soll.'; }
      Builder.site(t, +mins || 5);
      return `Die Website über "${t}" wird jetzt gebaut, Kairo verbessert sie ${+mins || 5} Minuten lang. Sie ist auf dem Bildschirm zu sehen.`;
    }
    if (has('bdOverlay') && /\b(mach|mache|änder|ändere|füg|füge|tausch|entfern|setz|größer|kleiner|farbe|knopf|button|hintergrund|schrift)\b/.test(c) && !/\b(doku|wie funktioniert|logo|minecraft|website|webseite)\b/.test(c)) {
      await Builder.change(cmd); return 'Geändert. Die neue Version ist zu sehen.';
    }
    if (/\b(app|tool)\b/.test(c) && /\b(bau|baue|mach|mache|erstell|erstelle|programmier|programmiere|build|make|create)\b/.test(c) && !/\bspiel|game\b/.test(c)) {
      const t = cmd.replace(/^kairo,?\s*/i, '').trim();
      Builder.open({ tab: 'sketch', idea: t }); return `Die App "${t}" wird gebaut und erscheint gleich im Kairo Builder.`;
    }
    // explainers, documentaries, what-if
    let m = cmd.match(/wie funktionier(?:t|en)\s+(.+?)[?.!]*$/i) || cmd.match(/how (?:does|do)\s+(.+?)\s+work/i) || cmd.match(/erklär(?:e|ung)?(?:\s+mir)?\s+(?:wie\s+)?(.+?)\s+funktionier/i);
    if (m || /erklärvideo/.test(c)) { const t = m ? m[1].trim() : topic(/\b(erklärvideo|erkläre?|video)\b/gi); HowItWorks.open(t); setTimeout(() => window.LiveVoice?.isActive() && window.LiveVoice.stop(), 4000); return `Die Erklärung "Wie funktioniert ${t}" startet und spricht selbst. Sag nur einen kurzen Satz.`; }
    if (/\bdoku|dokumentation|documentary\b/.test(c)) { const t = topic(/\b(doku|dokumentation|documentary|video|film)\b/gi); if (t) { StoryPlayer.doc(t); return `Die Doku über "${t}" startet.`; } }
    m = cmd.match(/was wäre,? wenn\s+(.+?)[?.!]*$/i) || cmd.match(/what if\s+(.+?)[?.!]*$/i);
    if (m) { StoryPlayer.whatIf('Was wäre, wenn ' + m[1]); return 'Die Was-wäre-wenn-Geschichte startet.'; }
    // creative studio
    if (/\blogo|banner\b/.test(c)) { const t = topic(/\b(logo|logos|banner)\b/gi); LogoMaker.open(t || undefined); return t ? `Kairo entwirft Logos für "${t}".` : 'Der Logo-Macher ist offen.'; }
    if (/minecraft/.test(c) && /\b(bau|baue|bauen|plan|mach|mache|zeig)\b/.test(c)) { const t = cmd.trim(); McBuilder.open(t); return t ? `Der Minecraft-Bauplan für "${t}" entsteht.` : 'Der Minecraft-Planer ist offen.'; }
    if (/erfinder|erfindung|geschäftsidee|business-?plan/.test(c)) { const t = topic(/\b(erfinder-?modus|erfinder|erfindung|geschäftsidee|business-?plan)\b/gi); Inventor.open(t || undefined); return 'Der Erfinder-Modus ist offen.'; }
    if (/\b(spiel|game)\b/.test(c) && /\b(bau|baue|mach|mache|programmier|programmiere|erstell|erstelle)\b/.test(c)) { const t = cmd.trim(); GameMaker.open(t); return `Das Spiel "${t}" wird programmiert.`; }
    return null;
  },
  async attachPath(p) { go('chat'); await attachFile(await window.kairo.attachPath(p)); }
};
window.kairo.onFocusInput(() => { go('chat'); $('input').focus(); });
window.kairo.search.onAsk(text => window.App.askInChat(text));

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
  Extras.init();
  Life.init();
  ChessExtra.init();
  window.kairo.onSettingsChanged(async () => { S = await window.kairo.settings.get(); SettingsUI.set(S); applyLook(); applyHandsFree(); });
  // morning briefing: once a day, the first time Kairo is opened in the morning
  setTimeout(async () => {
    if (S.keys.gemini || S.keys[S.provider]) {
      if (await window.kairo.briefing.due()) { go('today'); Today.briefing(true); }
    }
  }, 3500);
  setInterval(async () => { if (!document.hidden && !window.__away && (await window.kairo.briefing.due())) { go('today'); Today.briefing(true); } }, 15 * 60000);
  renderVoicePickers();
  $('micBtn').title = t('chat.voice') + ' (Ctrl+Shift+K)';
  loadHistory();
  renderAll();
  setTimeout(() => { $('boot').remove(); $('input').focus(); applyHandsFree(); }, 2200);
})();
