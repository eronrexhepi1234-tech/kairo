// Jarvis HUD data, desktop pet, game maker, live subtitles, game commentator, flight tracker,
// music quiz and the two-voice morning radio show.
const { ipcMain, app, BrowserWindow, screen } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

let store = null, getWin = null;
const LANG = { de: 'German', en: 'English', sq: 'Albanian', fr: 'French', it: 'Italian', es: 'Spanish' };
const getJson = async (url, ms = 15000) => { const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 Kairo/0.9' }, signal: AbortSignal.timeout(ms) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
const providers = () => require('./providers');

// ---------- Jarvis HUD ----------
let weatherCache = { at: 0, w: null }, newsCache = { at: 0, n: [] };
async function jarvis() {
  const s = store.get();
  const out = { name: s.userTitle || s.name, cpu: 0, ram: (os.totalmem() - os.freemem()) / os.totalmem(), uptime: os.uptime(), city: s.city };
  const snap = () => os.cpus().map(c => c.times);
  const a = snap(); await new Promise(r => setTimeout(r, 300)); const b = snap();
  let idle = 0, total = 0; b.forEach((t, i) => { const p = a[i]; total += Object.keys(t).reduce((x, k) => x + t[k] - p[k], 0); idle += t.idle - p.idle; });
  out.cpu = total ? 1 - idle / total : 0;
  try { const d = await fs.promises.statfs('C:\\'); out.disk = 1 - d.bavail / d.blocks; } catch {}
  if (s.city && Date.now() - weatherCache.at > 20 * 60e3) { try { weatherCache = { at: Date.now(), w: await require('./briefing').weather(s.city, s.language) }; } catch {} }
  const w = weatherCache.w;
  if (w) out.weather = { place: w.place, temp: w.now.temp, text: w.now.text, icon: w.now.icon, min: w.days[0].min, max: w.days[0].max, rain: w.days[0].rain };
  if (Date.now() - newsCache.at > 30 * 60e3) { try { newsCache = { at: Date.now(), n: (await require('./tools').getNews({ lang: s.language, region: s.newsRegion, limit: 8 })).map(x => x.title) }; } catch {} }
  out.news = newsCache.n;
  try { const r = require('./reminders').list()[0]; if (r) out.next = { text: r.text, at: r.at }; } catch {}
  return out;
}

// ---------- desktop pet ----------
const petFile = () => path.join(app.getPath('userData'), 'pet.json');
const STAGES = [[0, 'egg'], [15, 'baby'], [150, 'junior'], [600, 'dragon'], [2000, 'legend']];
function petLoad() {
  let p; try { p = JSON.parse(fs.readFileSync(petFile(), 'utf8')); } catch { p = null; }
  p ||= { name: 'Pixel', xp: 0, food: 80, joy: 70, born: Date.now(), hat: null, coins: 0 };
  // hunger and joy slowly go down while time passes (also while Kairo was closed, but never below 15)
  const hours = (Date.now() - (p.seen || Date.now())) / 3600e3;
  p.food = Math.max(15, p.food - hours * 3); p.joy = Math.max(15, p.joy - hours * 2); p.seen = Date.now();
  p.stage = STAGES.filter(([x]) => p.xp >= x).pop()[1];
  p.nextAt = (STAGES.find(([x]) => x > p.xp) || [null])[0];
  return p;
}
function petSave(p) { p.seen = Date.now(); fs.writeFileSync(petFile(), JSON.stringify(p)); }
function petGive(kind, n = 1) {
  const p = petLoad(), before = p.stage;
  if (kind === 'xp') { p.xp += n; p.coins += Math.ceil(n / 5); }
  if (kind === 'feed') { p.food = Math.min(100, p.food + 25); p.joy = Math.min(100, p.joy + 5); p.xp += 2; }
  if (kind === 'pet') { p.joy = Math.min(100, p.joy + 12); p.xp += 1; }
  petSave(p);
  const after = petLoad();
  if (after.stage !== before) petWin?.webContents.send('pet:evolve', after.stage);
  petWin?.webContents.send('pet:state', after);
  return after;
}
let petWin = null, petX = null;
function petShow(on) {
  if (!on) { if (petWin && !petWin.isDestroyed()) petWin.close(); petWin = null; return false; }
  if (petWin && !petWin.isDestroyed()) return true;
  const d = screen.getPrimaryDisplay().workArea;
  petX ??= d.x + Math.round(d.width * 0.3);
  petWin = new BrowserWindow({
    width: 230, height: 210, x: petX, y: d.y + d.height - 210, frame: false, transparent: true, resizable: false, skipTaskbar: true,
    alwaysOnTop: true, hasShadow: false, show: false, fullscreenable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false }
  });
  petWin.setAlwaysOnTop(true, 'floating');
  petWin.loadFile(path.join(__dirname, '..', 'renderer', 'pet.html'));
  petWin.setIgnoreMouseEvents(true, { forward: true });
  petWin.once('ready-to-show', () => petWin.showInactive());
  petWin.on('closed', () => { petWin = null; });
  return true;
}
function petEvent(ev) { petWin?.webContents.send('pet:event', ev); }

// study minutes feed the pet (focus.js samples every minute)
setInterval(() => {
  try {
    const f = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'focus.json'), 'utf8'));
    const d = f[new Date().toLocaleDateString('sv')]; if (!d) return;
    const study = Object.values(d.apps || {}).filter(a => a.cat === 'study').reduce((s, a) => s + a.min, 0);
    const p = petLoad(); const done = p.studyToday?.date === new Date().toDateString() ? p.studyToday.min : 0;
    if (study > done) { p.studyToday = { date: new Date().toDateString(), min: study }; petSave(p); petGive('xp', study - done); petEvent({ type: 'study' }); }
  } catch {}
}, 5 * 60e3);

// ---------- game maker ----------
const gamesDir = () => { const d = path.join(app.getPath('documents'), 'Kairo', 'Spiele'); fs.mkdirSync(d, { recursive: true }); return d; };
async function makeGame(idea, previous) {
  const s = store.get();
  const sys = `You are an expert HTML5 game developer. Build a complete, polished, FUN browser game in ONE self-contained HTML file.
Rules: plain HTML + CSS + JavaScript only, <canvas> rendering, no external files, no images/fonts from the internet (draw everything with code, emojis allowed), no localStorage.
Must have: start screen with the title and "Press SPACE / tap to start", clear controls (keyboard AND mouse/touch), score, rising difficulty, juicy effects (particles, screen shake, smooth animations), game over screen with score and restart.
Fit the window (resize with it), 60 fps with requestAnimationFrame. Texts in ${LANG[s.language] || 'German'}.
Return ONLY the HTML file, starting with <!doctype html>. No explanation, no markdown fences.`;
  const text = previous
    ? `Here is the current game:\n\n${previous}\n\nChange it like this: ${idea}\nReturn the full updated HTML file.`
    : `Game idea: ${idea}`;
  let html = await providers().complete(s, { system: sys, messages: [{ role: 'user', text }] });
  html = html.replace(/^[\s\S]*?(<!doctype html>|<html)/i, '$1').replace(/```[\s\S]*$/, '').trim();
  if (!/<html|<canvas|<script/i.test(html)) throw new Error('Kein Spiel bekommen – versuch es nochmal');
  const title = (html.match(/<title>([^<]{1,60})<\/title>/i) || [])[1]?.trim() || idea.slice(0, 40);
  const file = path.join(gamesDir(), title.replace(/[<>:"/\\|?*]/g, '').trim() + '.html');
  fs.writeFileSync(file, html);
  return { title, html, file };
}
function listGames() {
  return fs.readdirSync(gamesDir()).filter(f => f.endsWith('.html')).map(f => ({ name: f.replace(/\.html$/, ''), file: path.join(gamesDir(), f), at: fs.statSync(path.join(gamesDir(), f)).mtimeMs })).sort((a, b) => b.at - a.at);
}

// ---------- live subtitles ----------
async function subtitle(b64, mime, target) {
  const s = store.get(); if (!s.keys.gemini) throw new Error('Untertitel brauchen einen Gemini-Schlüssel');
  const lang = LANG[target] || LANG[s.language] || 'German';
  const body = { contents: [{ parts: [{ inlineData: { mimeType: mime, data: b64 } }, { text: `Transcribe the spoken words in this audio. If they are not in ${lang}, translate them to ${lang}. Return ONLY the subtitle text (max 2 short lines). If there is no speech (only music/noise/silence), return an empty string.` }] }] };
  for (const model of ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-3.5-flash']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', signal: AbortSignal.timeout(20000), headers: { 'content-type': 'application/json', 'x-goog-api-key': s.keys.gemini }, body: JSON.stringify(body) });
      if (!r.ok) continue;
      const t = (await r.json()).candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() || '';
      return t.replace(/^["„]|["“]$/g, '').replace(/^(empty|\(no speech\)|keine sprache)\.?$/i, '');
    } catch {}
  }
  return '';
}

// ---------- game commentator ----------
let lastLines = [];
async function commentate() {
  const s = store.get();
  const shot = await require('./tools').captureScreen(1280);
  const text = (await providers().complete(s, {
    system: `You are a hyped live e-sports / football-style commentator watching ${s.userTitle || 'the player'} play. Look at the screenshot and react to what is happening RIGHT NOW in 1-2 short, energetic, funny sentences, in ${LANG[s.language] || 'German'}. Mention concrete things you see (score, health, kills, map, items). If it is not a game, make a short funny comment about what they are doing. Never repeat these: ${lastLines.join(' | ')}`,
    messages: [{ role: 'user', text: 'Kommentiere!', images: [shot] }]
  })).replace(/\[\[[^\]]*\]\]/g, '').trim();
  lastLines = [...lastLines, text].slice(-5);
  let audio = null;
  try { audio = await providers().geminiSpeak({ ...s, voice: { ...s.voice, role: 'sport' } }, text); } catch {}
  return { text, audio };
}

// ---------- flight tracker ----------
async function flight(q) {
  const code = String(q || '').toUpperCase().replace(/\s+/g, '');
  let route = null, icao = code;
  try {
    const j = await getJson('https://api.adsbdb.com/v0/callsign/' + encodeURIComponent(code));
    const fr = j.response?.flightroute;
    if (fr) {
      icao = fr.callsign_icao || code;
      const ap = a => a && { code: a.iata_code || a.icao_code, name: a.name, city: a.municipality, country: a.country_name, lat: a.latitude, lng: a.longitude };
      route = { airline: fr.airline?.name || '', flight: fr.callsign_iata || code, from: ap(fr.origin), to: ap(fr.destination) };
    }
  } catch {}
  let pos = null;
  for (const base of ['https://api.adsb.lol/v2/callsign/', 'https://opendata.adsb.fi/api/v2/callsign/']) {
    try { const j = await getJson(base + encodeURIComponent(icao)); const a = j.ac?.[0]; if (a?.lat != null) { pos = { lat: a.lat, lng: a.lon, alt: Math.round((+a.alt_baro || 0) * 0.3048), speed: Math.round((+a.gs || 0) * 1.852), track: a.track || 0, type: a.t || '', reg: a.r || '' }; break; } } catch {}
  }
  if (!route && !pos) throw new Error('Flug nicht gefunden: ' + q);
  const out = { code, icao, route, pos };
  if (pos && route?.to?.lat != null) {
    const R = 6371, rad = Math.PI / 180, d = (a, b) => 2 * R * Math.asin(Math.sqrt(Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2));
    out.leftKm = Math.round(d(pos, route.to));
    if (route.from?.lat != null) { const all = d(route.from, route.to); out.progress = Math.max(0, Math.min(1, 1 - out.leftKm / all)); }
    if (pos.speed > 100) out.etaMin = Math.round(out.leftKm / pos.speed * 60 + 12);
  }
  return out;
}

// ---------- music quiz ----------
let chartCache = { at: 0, list: [] };
async function musicQuiz(n = 8) {
  if (Date.now() - chartCache.at > 6 * 3600e3) {
    const country = store.get().language === 'en' ? 'us' : 'ch';
    const j = await getJson(`https://itunes.apple.com/${country}/rss/topsongs/limit=100/json`);
    chartCache = { at: Date.now(), list: (j.feed.entry || []).map(e => ({ title: e['im:name'].label, artist: e['im:artist'].label, cover: (e['im:image']?.slice(-1)[0]?.label || '').replace(/\d+x\d+/, '400x400'), preview: (e.link || []).map(l => l.attributes).find(a => /audio/.test(a.type || ''))?.href })).filter(x => x.preview) };
  }
  const pool = [...chartCache.list].sort(() => Math.random() - 0.5);
  return pool.slice(0, n).map(song => {
    const others = pool.filter(x => x !== song && x.artist !== song.artist).slice(0, 12).sort(() => Math.random() - 0.5).slice(0, 3);
    return { ...song, choices: [song, ...others].sort(() => Math.random() - 0.5).map(x => `${x.title} – ${x.artist}`) };
  });
}

// ---------- morning radio show (two voices) ----------
async function radioShow() {
  const s = store.get();
  const b = await require('./briefing').make(s).catch(() => null);
  const facts = b ? b.text : 'No briefing data.';
  const name = s.userTitle || 'Chef';
  const script = await providers().complete(s, {
    system: `Write a short, fun morning radio show script (about 60-80 seconds spoken) for "Radio Kairo" with two hosts: Kairo (energetic, funny) and Lina (calm, witty). They talk to the listener "${name}". In ${LANG[s.language] || 'German'}.
Use these facts (weather, news, mail, reminders...) naturally, with jokes between: ${facts}
Format strictly, one line per turn:
Kairo: ...
Lina: ...
Start with a jingle-like greeting ("Guten Morgen ${name}, hier ist Radio Kairo!"), end with a motivating sign-off. No stage directions, no emojis.`,
    messages: [{ role: 'user', text: 'Los' }]
  });
  const lines = script.split('\n').map(l => l.trim()).filter(l => /^(Kairo|Lina):/i.test(l)).join('\n');
  const body = {
    contents: [{ parts: [{ text: 'TTS the following conversation between Kairo and Lina, like a lively radio morning show:\n' + lines }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [{ speaker: 'Kairo', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }, { speaker: 'Lina', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }] } } }
  };
  let audio = null;
  for (const model of ['gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', signal: AbortSignal.timeout(90000), headers: { 'content-type': 'application/json', 'x-goog-api-key': s.keys.gemini }, body: JSON.stringify(body) });
      if (!r.ok) continue;
      const part = (await r.json()).candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part) { audio = { audio: part.inlineData.data, mime: part.inlineData.mimeType }; break; }
    } catch {}
  }
  return { script: lines, audio, weather: b?.weather || null };
}

function register(ctx) {
  ({ store, getWin } = ctx);
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  ipcMain.handle('show:jarvis', wrap(async () => ({ data: await jarvis() })));
  ipcMain.handle('pet:get', () => petLoad());
  ipcMain.handle('pet:show', (_e, on) => { const r = petShow(!!on); store.update({ pet: !!on }); return r; });
  ipcMain.handle('pet:give', (_e, kind, n) => petGive(kind, n));
  ipcMain.handle('pet:rename', (_e, name) => { const p = petLoad(); p.name = String(name || 'Pixel').slice(0, 20); petSave(p); return p; });
  ipcMain.on('pet:move', (e, x, y) => { const w = BrowserWindow.fromWebContents(e.sender); if (w) { petX = Math.round(x); w.setPosition(Math.round(x), Math.round(y)); } });
  ipcMain.on('pet:mouse', (e, on) => { const w = BrowserWindow.fromWebContents(e.sender); w?.setIgnoreMouseEvents(!on, { forward: true }); });
  ipcMain.handle('pet:area', () => screen.getPrimaryDisplay().workArea);
  ipcMain.on('pet:open', () => { const w = getWin(); if (w) { if (w.isMinimized()) w.restore(); w.show(); w.focus(); } });
  ipcMain.handle('show:game', wrap(async (idea, prev) => makeGame(idea, prev)));
  ipcMain.handle('show:games', () => listGames());
  ipcMain.handle('show:gameFile', (_e, f) => { if (!String(f).startsWith(gamesDir())) return ''; return fs.readFileSync(f, 'utf8'); });
  ipcMain.handle('show:subtitle', wrap(async (b64, mime, lang) => ({ text: await subtitle(b64, mime, lang) })));
  ipcMain.handle('show:comment', wrap(async () => commentate()));
  ipcMain.handle('show:flight', wrap(async q => ({ flight: await flight(q) })));
  ipcMain.handle('show:musicQuiz', wrap(async n => ({ rounds: await musicQuiz(n) })));
  ipcMain.handle('show:radio', wrap(async () => radioShow()));
  // pet reacts to things happening in Kairo
  const prev = global.kairoAlert;
  global.kairoAlert = (type, data) => { if (type === 'mail') petEvent({ type: 'mail', n: (data || []).length }); if (type === 'goal') petEvent({ type: 'goal' }); return prev?.(type, data); };
  if (store.get().pet) app.whenReady().then(() => setTimeout(() => petShow(true), 4000));
}

module.exports = { register, jarvis, petGive, petShow, petEvent, makeGame, flight, musicQuiz, radioShow, subtitle, commentate };
