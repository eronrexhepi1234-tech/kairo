const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut, screen, nativeTheme } = require('electron');
const path = require('path');
const store = require('./store');
const providers = require('./providers');
const tools = require('./tools');
const agent = require('./agent');
const coach = require('./coach');
// Optional parts: if one is missing (e.g. removed by antivirus), Kairo still starts.
function optional(name, fallback) {
  try { return require(name); } catch (e) { console.error('[kairo] missing module', name, e.message); return fallback; }
}
const remote = optional('./remote', {
  start: async () => { throw new Error('Phone remote is missing (remote.js). Reinstall or restore the file.'); },
  stop: async () => {}, newToken: () => require('crypto').randomBytes(18).toString('base64url'), lanAddress: () => ({ ip: '', mac: '' })
});
const actions = require('./actions');
const system = require('./system');

let win = null;
let trayCtl = null;

// The tray icon only exists when the user wants Kairo to keep running after closing the window.
function syncTray() {
  const want = !!store.get().closeToTray;
  if (want && !trayCtl) trayCtl = system.setupTray(() => win, store);
  else if (!want && trayCtl) { trayCtl.destroy(); trayCtl = null; }
}
let overlay = null;
const running = new Map(); // request id -> AbortController
const remoteHistory = [];

const THEME_BARS = {
  graphite: { color: '#141517', symbolColor: '#c9c9c9' },
  paper: { color: '#f4f1ea', symbolColor: '#3a3a3a' },
  terminal: { color: '#0a0c0a', symbolColor: '#7dff9a' },
  ocean: { color: '#0b1622', symbolColor: '#c7d7e8' },
  sand: { color: '#1d1a16', symbolColor: '#e6d8c2' },
  midnight: { color: '#07070b', symbolColor: '#d8d8e8' },
  forest: { color: '#121813', symbolColor: '#cfe0cc' },
  rose: { color: '#fbf3f2', symbolColor: '#3a2a2e' }
};

function createWindow() {
  const s = store.get();
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    backgroundColor: s.theme === 'custom' && s.customTheme ? s.customTheme.bg : (THEME_BARS[s.theme]?.color || '#141517'),
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...(s.theme === 'custom' && s.customTheme ? { color: s.customTheme.bg, symbolColor: s.customTheme.text } : (THEME_BARS[s.theme] || THEME_BARS.graphite)), height: 40 },
    show: false,
    // keep the mic / voice running smoothly while only the mini orb is visible
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false }
  });
  win.setContentProtection(!!s.hideFromCapture);
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  // Show the window as soon as it's ready. "ready-to-show" sometimes never fires, so there are two backups.
  const showMain = () => { if (!process.argv.includes('--hidden') && win && !win.isDestroyed() && !win.isVisible()) win.show(); };
  win.once('ready-to-show', showMain);
  win.webContents.once('did-finish-load', () => setTimeout(showMain, 300));
  setTimeout(showMain, 4000);
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
}

function createOverlay() {
  if (overlay && !overlay.isDestroyed()) return overlay;
  const d = screen.getPrimaryDisplay().workArea;
  overlay = new BrowserWindow({
    width: 380, height: 220, x: d.x + d.width - 400, y: d.y + 20,
    frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: false, focusable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false }
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setIgnoreMouseEvents(true);
  overlay.setContentProtection(true); // never shows up in Kairo's own screenshots
  overlay.loadFile(path.join(__dirname, '..', 'renderer', 'overlay.html'));
  return overlay;
}

// Mini orb: a small floating orb while Kairo is minimized. Click it to bring Kairo back.
let mini = null;
function showMini() {
  if (!store.get().miniOrb) return;
  if (!mini || mini.isDestroyed()) {
    const d = screen.getPrimaryDisplay().workArea;
    mini = new BrowserWindow({
      width: 110, height: 110, x: d.x + d.width - 140, y: d.y + d.height - 150,
      frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: false, show: false, hasShadow: false,
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false }
    });
    mini.setAlwaysOnTop(true, 'floating');
    mini.loadFile(path.join(__dirname, '..', 'renderer', 'mini.html'));
    mini.once('ready-to-show', () => mini.showInactive());
  } else { mini.webContents.send('mini:update', { refresh: true }); mini.showInactive(); }
}
function hideMini() { if (mini && !mini.isDestroyed()) mini.hide(); }
ipcMain.on('mini:level', (_e, m) => { if (mini && !mini.isDestroyed() && mini.isVisible()) mini.webContents.send('mini:update', m); });

// Stage: a transparent, click-through layer over the desktop. While only the mini orb is visible,
// answers (weather, pictures, info cards, captions) fly out of the orb as animated cards and fold back after ~13 s.
let stage = null, stageReady = null;
function ensureStage() {
  if (stage && !stage.isDestroyed()) return stageReady;
  const d = screen.getPrimaryDisplay().workArea;
  stage = new BrowserWindow({
    x: d.x, y: d.y, width: d.width, height: d.height, frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
    resizable: false, focusable: false, show: false, hasShadow: false, fullscreenable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false }
  });
  stage.setAlwaysOnTop(true, 'screen-saver');
  stage.setIgnoreMouseEvents(true, { forward: true });
  stage.setContentProtection(!!store.get().hideFromCapture);
  stage.loadFile(path.join(__dirname, '..', 'renderer', 'stage.html'));
  stageReady = new Promise(r => stage.webContents.once('did-finish-load', r));
  stage.on('closed', () => { stage = null; });
  return stageReady;
}
const orbMode = () => !!(mini && !mini.isDestroyed() && mini.isVisible() && win && (!win.isVisible() || win.isMinimized()));
ipcMain.handle('app:orbMode', () => orbMode());
ipcMain.on('stage:show', async (_e, payload) => {
  await ensureStage();
  if (!stage) return;
  const d = screen.getPrimaryDisplay().workArea;
  const b = mini && !mini.isDestroyed() && mini.isVisible() ? mini.getBounds() : { x: d.x + d.width - 140, y: d.y + d.height - 150, width: 110, height: 110 };
  stage.webContents.send('stage:show', { ...payload, orb: { x: b.x - d.x + b.width / 2, y: b.y - d.y + b.height / 2 } });
  if (!stage.isVisible()) stage.showInactive();
  mini?.moveTop?.();
});
ipcMain.on('stage:idle', () => { if (stage && !stage.isDestroyed()) stage.hide(); });
ipcMain.on('stage:mouse', (_e, on) => { if (stage && !stage.isDestroyed()) stage.setIgnoreMouseEvents(!on, { forward: true }); });
ipcMain.on('stage:open', () => { if (stage && !stage.isDestroyed()) stage.hide(); if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });

function registerHotkey() {
  globalShortcut.unregisterAll();
  try { globalShortcut.register('CommandOrControl+Alt+K', () => require('./features').openClip()); } catch {}
  require('./media').hotkeys(() => win);
  try {
    globalShortcut.register(store.get().voiceHotkey, () => {
      if (!win) return;
      win.show(); win.focus();
      win.webContents.send('voice:toggle');
    });
  } catch {}
  const key = store.get().hotkey;
  try {
    globalShortcut.register(key, () => {
      if (!win) return;
      if (win.isVisible() && win.isFocused()) win.hide();
      else { win.show(); win.focus(); win.webContents.send('focus-input'); }
    });
  } catch {}
}

const errInfo = e => ({ message: e.message, code: e.code || null });

// ---------- IPC ----------
ipcMain.handle('settings:get', () => store.publicView());
ipcMain.handle('settings:set', (_e, patch) => {
  // Empty key fields mean "unchanged" unless explicitly cleared with null.
  if (patch.keys) for (const [k, v] of Object.entries(patch.keys)) {
    if (v === '' || (typeof v === 'string' && v.startsWith('••••'))) delete patch.keys[k];
    else if (v === null) patch.keys[k] = '';
  }
  const s = store.update(patch);
  if ((patch.theme || patch.customTheme) && win) {
    const bar = s.theme === 'custom' && s.customTheme ? { color: s.customTheme.bg, symbolColor: s.customTheme.text } : (THEME_BARS[s.theme] || THEME_BARS.graphite);
    try { win.setTitleBarOverlay({ ...bar, height: 40 }); } catch {}
    win.setBackgroundColor(bar.color);
  }
  if ('hideFromCapture' in patch && win) win.setContentProtection(!!s.hideFromCapture);
  if ('autostart' in patch) system.applyAutostart(store);
  if ('closeToTray' in patch) syncTray();
  if ('autostart' in patch || patch.voice) trayCtl?.rebuild();
  if (patch.hotkey || patch.voiceHotkey) registerHotkey();
  if (patch.keys?.gemini || patch.voice?.liveModel) liveCache = null;
  return store.publicView();
});

ipcMain.handle('models:list', async (_e, provider) => {
  try { return { ok: true, models: await providers.listModels(store.get(), provider) }; }
  catch (e) { return { ok: false, error: errInfo(e) }; }
});

ipcMain.handle('chat:send', async (e, id, req) => {
  const ctrl = new AbortController();
  running.set(id, ctrl);
  const send = (type, payload) => { if (!e.sender.isDestroyed()) e.sender.send('chat:event', id, type, payload); };
  try {
    const r = await agent.run(store.get(), req, send, ctrl.signal);
    return { ok: true, ...r };
  } catch (err) {
    if (err.name === 'AbortError') return { ok: true, aborted: true };
    return { ok: false, error: errInfo(err) };
  } finally { running.delete(id); }
});
ipcMain.handle('chat:stop', (_e, id) => { running.get(id)?.abort(); });

// one-shot completion (used by Earth "what happened here" and the fair AI picker)
ipcMain.handle('ai:complete', async (_e, { text, extraSystem, images, webSearch, json, plain }) => {
  try {
    const { buildSystemPrompt } = require('./persona');
    const s = store.get();
    // plain: a short system prompt without app actions (for small info boxes)
    const system = plain ? `You are a precise assistant. Today is ${new Date().toDateString()}. Answer in ${s.language === 'de' ? 'German' : 'the user\'s language'}. Never output [[...]] tags.\n${extraSystem || ''}` : buildSystemPrompt(s, extraSystem);
    let out = await providers.complete(s, { system, messages: [{ role: 'user', text, images }], webSearch: !!webSearch, json: !!json });
    if (plain) out = out.replace(/\[\[[^\]]*\]\]/g, '').trim();
    return { ok: true, text: out };
  } catch (e) { return { ok: false, error: errInfo(e) }; }
});

ipcMain.handle('screen:capture', async () => tools.captureScreen());
ipcMain.handle('news:get', async (_e, opts) => {
  try { return { ok: true, items: await tools.getNews({ ...opts, lang: store.get().language, region: store.get().newsRegion }) }; }
  catch (e) { return { ok: false, error: errInfo(e) }; }
});
ipcMain.handle('geo:search', (_e, q) => tools.geocode(q).catch(() => null));
ipcMain.handle('geo:reverse', (_e, lat, lng) => tools.reverseGeocode(lat, lng, store.get().language).catch(() => ({ name: null })));

ipcMain.handle('folder:pick', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('folder:scan', (_e, p) => tools.scanFolder(p));
ipcMain.handle('folder:context', (_e, p) => tools.folderContext(p));
ipcMain.handle('file:read', (_e, p) => { try { return tools.readTextFile(p, 200000); } catch (e) { return null; } });
ipcMain.handle('file:open', (_e, p) => shell.openPath(p));

// which voice reads answers aloud: 'auto' prefers natural voices when a key exists
function ttsEngine(s) {
  const e = s.voice.engine;
  if (e !== 'auto') return e;
  if (s.keys.gemini) return 'gemini';
  if (s.keys.openai) return 'openai';
  return 'system';
}
ipcMain.handle('voice:engine', () => ttsEngine(store.get()));
ipcMain.handle('voice:speak', async (_e, text) => {
  const s = store.get();
  try {
    const r = ttsEngine(s) === 'openai' ? await providers.speak(s, text) : await providers.geminiSpeak(s, text);
    return { ok: true, ...r };
  } catch (e) { return { ok: false, error: errInfo(e) }; }
});

ipcMain.handle('voice:wake', async (_e, wav) => { try { return await providers.wakeCheck(store.get(), wav, store.get().name || 'Kairo'); } catch { return false; } });

// Live voice mode (Gemini Live, speech to speech). The renderer opens the websocket itself.
let liveCache = null;
ipcMain.handle('live:config', async (_e, translate) => {
  const s = store.get();
  if (!s.keys.gemini) return { ok: false, error: { code: 'NO_GEMINI' } };
  try {
    if (!liveCache) liveCache = await providers.liveModels(s);
    const models = s.voice.liveModel && s.voice.liveModel !== 'auto' ? [s.voice.liveModel, ...liveCache] : liveCache;
    const { buildSystemPrompt } = require('./persona');
    if (translate) {
      return { ok: true, key: s.keys.gemini, models: [...new Set(models)], voice: s.voice.geminiVoice || 'Kore', system: [
        `You are a live INTERPRETER between ${translate.aName} and ${translate.bName}.`,
        `When you hear ${translate.aName}, say the same thing in ${translate.bName}. When you hear ${translate.bName}, say it in ${translate.aName}.`,
        'Only speak the translation: no comments, no greetings, no "he says". Keep the tone and meaning. Translate names and numbers correctly.'
      ].join('\n') };
    }
    const role = require('./extras2').role(s);
    const system = buildSystemPrompt(s, [
      ...(role ? [`VOICE ROLE: speak in the style of ${role.persona}. ${role.style} Keep facts correct.`] : []),
      'LIVE VOICE CONVERSATION. You are talking out loud with the user, hands-free.',
      'Speak like a real person: short natural sentences, no markdown, no lists, no emojis, no reading out URLs.',
      'Answer in the language the user speaks. Keep answers short unless asked for detail.',
      'Use Google Search for anything current: news, "what happened today", prices, sports, weather, and to research places.',
      'If the user asks you to look at their screen, call look_at_screen first, then describe what you see.',
      'If they ask where a place on the screen is, look at clues (signs, language, road markings, plates, plants, buildings), research them, then give country, region and confidence, and call fly_to with your best guess.',
      'If the user wants to see a place on Earth, call fly_to.',
      'If the user asks to open a website or YouTube, call open_url. To open a program, call open_app. To write a document, letter, note or code file, call create_file with the full content (Markdown for .docx).',
      'Ignore all "[[...]]" tag rules from above; use your functions instead (fly_to, open_url, open_app, create_file, remember, set_reminder, pc_control, chess_new_game, chess_move, start_quiz, ...).',
      'IMPORTANT: to do something you MUST call the matching function. Never say you started, opened, set or saved something unless you called the function for it.',
      'Chess: "let\'s play chess" -> call chess_new_game. When the user says a move, call chess_move, then tell them the engine\'s reply move.'
    ].join('\n'));
    return { ok: true, key: s.keys.gemini, models: [...new Set(models)], voice: role?.voice || s.voice.geminiVoice || 'Kore', system };
  } catch (e) { return { ok: false, error: errInfo(e) }; }
});
ipcMain.handle('voice:transcribe', async (_e, data, mime) => {
  try { return { ok: true, text: await providers.transcribe(store.get(), data, mime) }; }
  catch (e) { return { ok: false, error: errInfo(e) }; }
});

ipcMain.handle('coach:analyze', async (_e, opts) => {
  try {
    const r = await coach.analyze(store.get(), opts);
    if (overlay && !overlay.isDestroyed()) overlay.webContents.send('overlay:update', r);
    return { ok: true, ...r };
  } catch (e) { return { ok: false, error: errInfo(e) }; }
});
ipcMain.handle('overlay:toggle', (_e, on) => {
  if (on) createOverlay().showInactive();
  else if (overlay && !overlay.isDestroyed()) overlay.hide();
  return on;
});

// raw 16-bit PCM -> WAV (for voice replies on the phone)
function pcmToWav(b64, rate = 24000) {
  const pcm = Buffer.from(b64, 'base64'), h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]).toString('base64');
}

// asks the Kairo window to do something and waits for the answer
function askRenderer(channel, ...args) {
  return new Promise(resolve => {
    const id = Math.random().toString(36).slice(2);
    ipcMain.once('renderer:reply:' + id, (_e, v) => resolve(v));
    win?.webContents.send(channel, id, ...args);
    setTimeout(() => resolve(null), 15000);
  });
}

let remoteInfo = null;
async function startRemote() {
  const s = store.get();
  const token = s.remote.token || remote.newToken();
  store.update({ remote: { enabled: true, token } });
  remoteInfo = await remote.start({ port: s.remote.port, token }, {
    notify: ev => win?.webContents.send('remote:event', ev),
    screenshot: () => tools.captureScreen(1280),
    pc: action => require('./pc').run(action, 3),
    chat: async (text, withScreen) => {
      const r = await agent.run(store.get(), { history: remoteHistory, text, attachScreen: withScreen }, () => {});
      remoteHistory.push({ role: 'user', text }, { role: 'assistant', text: r.text });
      while (remoteHistory.length > 20) remoteHistory.shift();
      win?.webContents.send('remote:event', { type: 'remote-reply', text: r.text }); // the PC runs actions like "open YouTube"
      return r.text.replace(/\[\[\/?[a-z]+[^\]]*\]\]/gi, '').trim();
    },
    tts: async text => {
      const st = store.get();
      const r = st.keys.openai && st.voice.engine === 'openai' ? await providers.speak(st, text) : await providers.geminiSpeak(st, text);
      return /L16|pcm/i.test(r.mime) ? { audio: pcmToWav(r.audio, +(r.mime.match(/rate=(\d+)/) || [])[1] || 24000), mime: 'audio/wav' } : r;
    },
    today: async () => (await askRenderer('remote:today')) || {},
    routine: name => askRenderer('remote:routine', name),
    music: mood => askRenderer('remote:music', mood),
    party: (action, params, body) => require('./party').handle(action, params, body)
  });
  return remoteInfo;
}

ipcMain.handle('remote:start', async () => {
  try { return { ok: true, ...(await startRemote()) }; } catch (e) { return { ok: false, error: errInfo(e) }; }
});

// quiz party
ipcMain.handle('party:create', async (_e, questions) => {
  try {
    const info = remoteInfo || await startRemote();
    const st = require('./party').create(questions);
    const link = `http://${info.ip}:${info.port}/party?code=${st.code}`;
    const qr = await require('qrcode').toDataURL(link, { margin: 1, width: 300, color: { dark: '#111214', light: '#ffffff' } });
    return { ok: true, ...st, link, qr };
  } catch (e) { return { ok: false, error: errInfo(e) }; }
});
ipcMain.handle('party:next', () => require('./party').next());
ipcMain.handle('party:state', () => require('./party').hostState());
ipcMain.handle('party:end', () => require('./party').end());
ipcMain.handle('remote:stop', async () => { remoteInfo = null; await remote.stop(); store.update({ remote: { enabled: false } }); return true; });
ipcMain.handle('remote:reset', async () => { remoteInfo = null; await remote.stop(); store.update({ remote: { token: remote.newToken(), enabled: false } }); return true; });
ipcMain.handle('remote:info', () => remote.lanAddress());
ipcMain.handle('remote:firewall', async () => {
  try { return { ok: true, ...(await require('./firewall').check(store.get().remote.port)) }; } catch (e) { return { ok: false, error: errInfo(e) }; }
});
ipcMain.handle('remote:firewall-allow', async () => {
  try { return { ok: true, ...(await require('./firewall').allow(store.get().remote.port)) }; } catch (e) { return { ok: false, error: errInfo(e) }; }
});

// Chess vs Stockfish
const chessGame = require('./chess');
const chessCall = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: errInfo(e), ...chessGame.state() }; } };
ipcMain.handle('chess:new', chessCall(o => chessGame.newGame(o)));
ipcMain.handle('chess:move', chessCall(m => chessGame.playerMove(m)));
ipcMain.handle('chess:forme', chessCall(() => chessGame.playForMe()));
ipcMain.handle('chess:step', chessCall(() => chessGame.step()));
ipcMain.handle('chess:hint', chessCall(() => chessGame.hint()));
ipcMain.handle('chess:undo', chessCall(() => chessGame.undo()));
ipcMain.handle('chess:level', chessCall(l => chessGame.setLevel(l)));
ipcMain.handle('chess:state', chessCall(() => chessGame.state()));
ipcMain.handle('chess:describe', () => chessGame.describe());

// Actions the assistant asks for: create a file, open a website, open an app.
ipcMain.handle('action:run', async (_e, a) => {
  try {
    if (a.type === 'file' && /\.pdf$/i.test(a.name || '')) return { ok: true, path: await require('./pdf').makePdf(actions.uniquePath(actions.outputDir(), actions.safeName(a.name)), a.content, { accent: store.get().accent }) };
    if (a.type === 'file') return { ok: true, path: actions.createFile(a.name, a.content) };
    if (a.type === 'open') return { ok: true, url: actions.openUrl(a.url) };
    if (a.type === 'app') return { ok: true, app: actions.openApp(a.name) };
    if (a.type === 'reveal') { actions.reveal(a.path); return { ok: true }; }
    if (a.type === 'openfile') { actions.openFile(a.path); return { ok: true }; }
    if (a.type === 'folder') { actions.openFile(actions.outputDir()); return { ok: true }; }
    return { ok: false, error: { message: 'unknown action' } };
  } catch (e) { return { ok: false, error: errInfo(e) }; }
});

ipcMain.handle('app:open-external', (_e, url) => { if (/^https?:/.test(url)) shell.openExternal(url); });

// ---------- lifecycle ----------
app.setAppUserModelId('app.kairo.desktop');
// Only one Kairo at a time. A second start ends right away (before anything else runs)
// and the first Kairo brings its window to the front.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.exit(0);
app.on('second-instance', () => {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
});

app.on('before-quit', () => system.markQuitting());

if (gotLock) app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  createWindow();
  registerHotkey();
  // close button hides to the tray; Kairo keeps listening, reminding and briefing
  win.on('close', e => {
    if (!system.isQuitting() && store.get().closeToTray) { e.preventDefault(); win.hide(); return; }
    // closing the window really ends Kairo (also closes helper windows like the clipboard pop-up)
    system.markQuitting();
    setImmediate(() => app.quit());
  });
  syncTray();
  // tell the app when it is minimized (and whether the mini orb is on screen)
  const winState = () => setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.send('win:state', { away: !win.isVisible() || win.isMinimized(), orb: !!store.get().miniOrb }); }, 50);
  win.on('minimize', () => { showMini(); winState(); });
  win.on('hide', () => { showMini(); winState(); });
  win.on('restore', () => { hideMini(); winState(); });
  win.on('show', () => { hideMini(); winState(); });
  win.on('focus', () => { hideMini(); winState(); });
  if (!process.env.KAIRO_SHOTS) system.applyAutostart(store);
  if (!process.env.KAIRO_SHOTS) system.watchForChanges(() => [win, overlay]);
  require('./features').register({ getWin: () => win, store, errInfo, tray: trayCtl });
  // YouTube embeds (live webcams) refuse to play without a web referrer; give them one
  require('electron').session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['https://www.youtube-nocookie.com/*', 'https://www.youtube.com/embed/*'] }, (d, cb) => {
    d.requestHeaders.Referer = 'https://kairo.local/'; cb({ requestHeaders: d.requestHeaders });
  });
  optional('./earthdata', { register: () => {} }).register();
  optional('./pdf', { register: () => {} }).register({ getWin: () => win });
  optional('./earth2', { register: () => {} }).register({ store });
  optional('./fun', { register: () => {} }).register({ getWin: () => win, store });
  optional('./extras2', { register: () => {} }).register({ getWin: () => win, store });
  optional('./updater', { start: () => {} }).start(() => win);
  // Screenshot mode for the README / testing:  KAIRO_SHOTS=<folder> npm start
  if (process.env.KAIRO_SHOTS) {
    const fs = require('fs');
    const dir = process.env.KAIRO_SHOTS;
    fs.mkdirSync(dir, { recursive: true });
    const wait = ms => new Promise(r => setTimeout(r, ms));
    win.webContents.once('did-finish-load', async () => {
      await wait(3000);
      if (process.env.KAIRO_SHOT_PRE) { await win.webContents.executeJavaScript(process.env.KAIRO_SHOT_PRE); await wait(4000); }
      // optional test steps: KAIRO_SHOT_STEPS=[{"js":"...","wait":3000,"name":"x"}]
      if (process.env.KAIRO_SHOT_STEPS) {
        for (const st of JSON.parse(process.env.KAIRO_SHOT_STEPS)) {
          if (st.minimize) win.minimize();
          if (st.js) await win.webContents.executeJavaScript(st.js).catch(e => console.log('step error', e.message));
          await wait(st.wait || 1000);
          if (st.name) fs.writeFileSync(path.join(dir, st.name + '.png'), (await win.webContents.capturePage()).toPNG());
          if (st.stage && stage && !stage.isDestroyed()) fs.writeFileSync(path.join(dir, st.stage + '.png'), (await stage.webContents.capturePage()).toPNG());
        }
        return app.quit();
      }
      const views = await win.webContents.executeJavaScript(`[...document.querySelectorAll('.rail-btn')].map(b => b.dataset.view)`);
      for (const v of views) {
        await win.webContents.executeJavaScript(`App.go('${v}')`);
        await wait(v === 'earth' ? 6000 : 900);
        fs.writeFileSync(path.join(dir, v + '.png'), (await win.webContents.capturePage()).toPNG());
      }
      app.quit();
    });
  }
  if (store.get().remote.enabled) {
    win.webContents.once('did-finish-load', () => win.webContents.send('remote:autostart'));
  }
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (system.isQuitting() || !store.get().closeToTray) app.quit(); });
