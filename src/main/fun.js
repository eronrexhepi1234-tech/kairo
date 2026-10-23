// Game patch notes, playtime, PC check, song finder, birthdays, riddles and recipes.
const { ipcMain, app, Notification } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const UA = { 'user-agent': 'Mozilla/5.0 Kairo/0.7' };
const getJson = async (url, ms = 15000) => { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
const ps = (script, ms = 20000) => new Promise((res, rej) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true, timeout: ms, maxBuffer: 4e6 }, (e, out) => (e && !out ? rej(e) : res(out.trim()))));
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const LANG = { de: 'German', en: 'English', sq: 'Albanian', fr: 'French', it: 'Italian', es: 'Spanish' };

// ---------- patch notes ----------
const NOT_ON_STEAM = /fortnite|valorant|league of legends|\blol\b|minecraft|roblox|genshin|overwatch|world of warcraft|wow\b|hearthstone|diablo|clash|brawl stars|fifa mobile|ea fc|fc 2\d/i;
async function patchNotes(settings, game) {
  const providers = require('./providers');
  const lang = LANG[settings.language] || 'German';
  let app_ = null;
  if (!NOT_ON_STEAM.test(game)) {
    try { app_ = (await getJson('https://steamcommunity.com/actions/SearchApps/' + encodeURIComponent(game)))[0] || null; } catch {}
  }
  if (app_) {
    const news = (await getJson(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${app_.appid}&count=8&maxlength=6000&feeds=steam_community_announcements`)).appnews?.newsitems || [];
    const pick = news.find(n => /patch|update|hotfix|notes|version|season|release/i.test(n.title + ' ' + (n.tags || []).join(' '))) || news[0];
    if (pick) {
      const raw = pick.contents.replace(/\[[^\]]+\]/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 7000);
      const text = await providers.complete(settings, {
        system: `You summarize game patch notes for a gamer. Answer in ${lang}. Return ONLY JSON: {"headline":"short catchy summary","points":["max 7 short bullet points, most important first"],"verdict":"one sentence: is it a big update?"}`,
        messages: [{ role: 'user', text: `Game: ${app_.name}\nTitle: ${pick.title}\nDate: ${new Date(pick.date * 1000).toDateString()}\n\n${raw}` }]
      });
      const j = providers.parseJson(text) || {};
      return { game: app_.name, appid: app_.appid, image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${app_.appid}/header.jpg`, title: pick.title, date: pick.date * 1000, url: pick.url, source: 'Steam', ...j };
    }
  }
  // not on Steam (or nothing found): ask with Google Search
  const text = await providers.complete(settings, {
    webSearch: true,
    system: `Today is ${new Date().toDateString()}. Find the LATEST official patch notes / update for the game the user names, using Google Search. Answer in ${lang}. Return ONLY JSON: {"game":"official name","title":"update name/version","date":"YYYY-MM-DD","headline":"short catchy summary","points":["max 7 short bullet points"],"verdict":"one sentence"}`,
    messages: [{ role: 'user', text: game }]
  });
  const j = providers.parseJson(text) || { headline: text.slice(0, 300), points: [] };
  return { source: 'Web', ...j, date: j.date ? Date.parse(j.date) : null };
}

// ---------- playtime (from the screen-time samples) ----------
function playtime() {
  const data = readJson(path.join(app.getPath('userData'), 'focus.json'), {});
  const days = [], games = {};
  for (let i = 6; i >= 0; i--) {
    const k = new Date(Date.now() - i * 864e5).toLocaleDateString('sv');
    const d = data[k] || { apps: {} };
    const entry = { date: k, games: {} };
    for (const [name, v] of Object.entries(d.apps || {})) if (v.cat === 'games') { entry.games[name] = v.min; games[name] = (games[name] || 0) + v.min; }
    days.push(entry);
  }
  const top = Object.entries(games).sort((a, b) => b[1] - a[1]).map(([name, min]) => ({ name, min }));
  return { days, top, total: top.reduce((s, g) => s + g.min, 0) };
}

// ---------- PC check ----------
async function cpuLoad() {
  const snap = () => os.cpus().map(c => c.times);
  const a = snap(); await new Promise(r => setTimeout(r, 700)); const b = snap();
  let idle = 0, total = 0;
  b.forEach((t, i) => { const p = a[i]; const tot = Object.keys(t).reduce((s, k) => s + t[k] - p[k], 0); idle += t.idle - p.idle; total += tot; });
  return total ? Math.round((1 - idle / total) * 100) : 0;
}
function dirSize(dir, limit = 7000) {
  let size = 0, count = 0;
  const stack = [dir];
  while (stack.length && count < limit) {
    const d = stack.pop();
    let list; try { list = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of list) { count++; const p = path.join(d, e.name); try { if (e.isDirectory()) stack.push(p); else size += fs.statSync(p).size; } catch {} }
  }
  return { size, partial: count >= limit };
}
async function pcCheck() {
  const out = { cpuName: os.cpus()[0]?.model?.trim(), cores: os.cpus().length, ramTotal: os.totalmem(), ramFree: os.freemem(), uptime: os.uptime(), host: os.hostname() };
  out.cpu = await cpuLoad();
  out.disks = [];
  for (const L of 'CDEFGHIJ') {
    const root = L + ':\\';
    try { if (!fs.existsSync(root)) continue; const s = await fs.promises.statfs(root); out.disks.push({ drive: L + ':', total: s.blocks * s.bsize, free: s.bavail * s.bsize }); } catch {}
  }
  const [procs, gpu, startup] = await Promise.all([
    ps('Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 8 ProcessName, @{n="mb";e={[math]::Round($_.WorkingSet64/1MB)}} | ConvertTo-Json -Compress').then(JSON.parse).catch(() => []),
    ps('(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ", "').catch(() => ''),
    ps('Get-CimInstance Win32_StartupCommand | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress').then(s => [].concat(JSON.parse(s || '[]'))).catch(() => [])
  ]);
  out.procs = [].concat(procs).map(p => ({ name: p.ProcessName, mb: p.mb }));
  out.gpu = gpu; out.startup = startup;
  out.temp = dirSize(os.tmpdir());
  out.downloads = dirSize(app.getPath('downloads'));
  return out;
}

// ---------- what's playing / song finder ----------
const NOW_PLAYING = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -like 'IAsyncOperation*' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$s = $mgr.GetCurrentSession()
if ($s) { $p = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]); $pb = $s.GetPlaybackInfo(); [pscustomobject]@{ title = $p.Title; artist = $p.Artist; album = $p.AlbumTitle; app = $s.SourceAppUserModelId; status = $pb.PlaybackStatus.ToString() } | ConvertTo-Json -Compress }`;
async function nowPlaying() {
  try { const o = await ps(NOW_PLAYING, 12000); return o ? JSON.parse(o) : null; } catch { return null; }
}
async function songInfo(title, artist) {
  try {
    const j = await getJson(`https://itunes.apple.com/search?entity=song&limit=1&term=${encodeURIComponent(`${artist || ''} ${title}`.trim())}`);
    const r = j.results?.[0];
    if (r) return { title: r.trackName, artist: r.artistName, album: r.collectionName, year: (r.releaseDate || '').slice(0, 4), cover: (r.artworkUrl100 || '').replace('100x100', '600x600'), preview: r.previewUrl, link: r.trackViewUrl, genre: r.primaryGenreName };
  } catch {}
  return { title, artist };
}
async function identify(settings, audioB64, mime) {
  if (!settings.keys.gemini) throw Object.assign(new Error('Für die Song-Erkennung brauche ich einen Gemini-Schlüssel.'), { code: 'NO_KEY' });
  const body = {
    contents: [{ parts: [{ inlineData: { mimeType: mime, data: audioB64 } }, { text: 'Identify the song in this recording. Listen to the lyrics, melody, voice and style. If there are lyrics, use Google Search with a distinctive line to find the exact song. Return ONLY JSON: {"title":"","artist":"","confidence":0-100,"lyric":"one short line you heard (max 10 words)"}. If it is not music or you cannot tell, return {"title":"","artist":"","confidence":0}.' }] }],
    tools: [{ google_search: {} }]
  };
  for (const model of ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', signal: AbortSignal.timeout(45000), headers: { 'content-type': 'application/json', 'x-goog-api-key': settings.keys.gemini }, body: JSON.stringify(body) });
      if (!r.ok) continue;
      const txt = (await r.json()).candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      const j = require('./providers').parseJson(txt);
      if (j) return j;
    } catch {}
  }
  throw new Error('Song-Erkennung gerade nicht erreichbar');
}

// ---------- birthdays ----------
const bdFile = () => path.join(app.getPath('userData'), 'birthdays.json');
function nextOf(b) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const [m, d] = b.date.split('-').map(Number);
  let n = new Date(now.getFullYear(), m - 1, d);
  if (n < now) n = new Date(now.getFullYear() + 1, m - 1, d);
  return { ...b, next: n.getTime(), days: Math.round((n - now) / 864e5), age: b.year ? n.getFullYear() - b.year : null };
}
const bdList = () => readJson(bdFile(), []).map(nextOf).sort((a, b) => a.days - b.days);
function bdAdd({ name, date, year }) {
  const m = String(date || '').match(/(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2,4}))?/) || String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let mm, dd, yy = +year || null;
  if (!m) throw new Error('Datum z. B. 24.12. oder 24.12.2010');
  if (/^\d{4}-/.test(date)) { yy = yy || +m[1]; mm = +m[2]; dd = +m[3]; } else { dd = +m[1]; mm = +m[2]; if (m[3]) yy = +m[3] < 100 ? 2000 + +m[3] : +m[3]; }
  if (!name || mm < 1 || mm > 12 || dd < 1 || dd > 31) throw new Error('Name und gültiges Datum nötig');
  const list = readJson(bdFile(), []);
  list.push({ id: Date.now().toString(36), name: String(name).slice(0, 50), date: `${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, year: yy && yy > 1900 && yy <= new Date().getFullYear() ? yy : null });
  fs.writeFileSync(bdFile(), JSON.stringify(list, null, 1));
  return bdList();
}
function bdRemove(id) { fs.writeFileSync(bdFile(), JSON.stringify(readJson(bdFile(), []).filter(b => b.id !== id), null, 1)); return bdList(); }
let bdNotified = '';
function bdWatch(getWin) {
  const check = () => {
    const key = new Date().toDateString();
    if (bdNotified === key) return;
    bdNotified = key;
    const soon = bdList().filter(b => b.days <= 1);
    for (const b of soon) {
      const title = b.days === 0 ? `🎂 Heute hat ${b.name} Geburtstag!` : `🎁 Morgen hat ${b.name} Geburtstag`;
      if (Notification.isSupported()) new Notification({ title, body: b.age ? `${b.name} wird ${b.age}.` : 'Nicht vergessen zu gratulieren!' }).show();
      getWin()?.webContents.send('bd:soon', b);
    }
  };
  setTimeout(check, 20000);
  setInterval(check, 30 * 60e3);
}

// ---------- riddles & recipes (AI) ----------
const riddleFile = () => path.join(app.getPath('userData'), 'riddles.json');
async function riddle(settings, force) {
  const store = readJson(riddleFile(), {});
  const key = new Date().toLocaleDateString('sv');
  if (!force && store[key]) return store[key];
  const providers = require('./providers');
  const recent = Object.values(store).slice(-20).map(r => r.question).join(' | ');
  const text = await providers.complete(settings, {
    system: `Create one clever, fun riddle for a teenager. Answer in ${LANG[settings.language] || 'German'}. Not one of these: ${recent}. Return ONLY JSON: {"question":"","answer":"short answer","hint":"a small hint","explain":"one sentence why"}`,
    messages: [{ role: 'user', text: 'Neues Rätsel ' + Math.random().toString(36).slice(2, 6) }]
  });
  const j = providers.parseJson(text);
  if (!j?.question) throw new Error('Kein Rätsel bekommen');
  if (!force) { store[key] = j; fs.writeFileSync(riddleFile(), JSON.stringify(store)); }
  return j;
}
async function joke(settings, topic) {
  const providers = require('./providers');
  const text = await providers.complete(settings, {
    system: `Tell ONE short, really funny, clean joke for a teenager${topic ? ' about ' + topic : ''}. Answer in ${LANG[settings.language] || 'German'}. Return ONLY JSON: {"setup":"","punchline":""}`,
    messages: [{ role: 'user', text: 'Witz ' + Math.random().toString(36).slice(2, 6) }]
  });
  return providers.parseJson(text) || { setup: text, punchline: '' };
}
async function recipe(settings, wish) {
  const providers = require('./providers');
  const text = await providers.complete(settings, {
    system: `You are a friendly chef. Create a real, tasty, doable recipe for what the user asks (a dish, or "what can I cook with ..." using mainly those ingredients). Answer in ${LANG[settings.language] || 'German'}, metric units.
Return ONLY JSON: {"title":"","intro":"one tempting sentence","minutes":total,"servings":n,"difficulty":"leicht|mittel|schwer","ingredients":[{"amount":"200 g","item":"Mehl"}],"steps":[{"text":"clear step, 1-3 sentences","minutes":optional timer minutes for waiting/cooking}],"tip":"one pro tip"}. 4-9 steps.`,
    messages: [{ role: 'user', text: wish }]
  });
  const j = providers.parseJson(text);
  if (!j?.steps?.length) throw new Error('Kein Rezept bekommen');
  return j;
}

function register({ getWin, store }) {
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { code: e.code || 'ERR', message: e.message } }; } };
  ipcMain.handle('fun:patch', wrap(async game => ({ notes: await patchNotes(store.get(), game) })));
  ipcMain.handle('fun:playtime', wrap(async () => playtime()));
  ipcMain.handle('fun:pc', wrap(async () => ({ pc: await pcCheck() })));
  ipcMain.handle('fun:nowPlaying', wrap(async () => { const np = await nowPlaying(); return { now: np && np.title ? { ...np, ...(await songInfo(np.title, np.artist)), app: np.app, status: np.status } : null }; }));
  ipcMain.handle('fun:identify', wrap(async (b64, mime) => { const j = await identify(store.get(), b64, mime); return { song: j.title ? { ...(await songInfo(j.title, j.artist)), confidence: j.confidence, lyric: j.lyric } : null }; }));
  ipcMain.handle('fun:birthdays', wrap(async () => ({ list: bdList() })));
  ipcMain.handle('fun:bdAdd', wrap(async b => ({ list: bdAdd(b) })));
  ipcMain.handle('fun:bdRemove', wrap(async id => ({ list: bdRemove(id) })));
  ipcMain.handle('fun:riddle', wrap(async force => ({ riddle: await riddle(store.get(), force) })));
  ipcMain.handle('fun:joke', wrap(async topic => ({ joke: await joke(store.get(), topic) })));
  ipcMain.handle('fun:recipe', wrap(async wish => ({ recipe: await recipe(store.get(), wish) })));
  ipcMain.handle('fun:saveAudio', wrap(async (b64, ext) => {
    const dir = path.join(app.getPath('music'), 'Kairo'); fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, `Stimme ${new Date().toLocaleString('sv').replace(/[: ]/g, '-')}.${ext || 'webm'}`);
    fs.writeFileSync(f, Buffer.from(b64, 'base64'));
    return { path: f };
  }));
  bdWatch(getWin);
}

module.exports = { register, patchNotes, playtime, pcCheck, nowPlaying, songInfo, bdList, bdAdd, riddle, joke, recipe };
