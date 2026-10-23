// Wires the newer features into the app: memory, reminders, briefing & weather, PC control,
// tidy-up, clipboard helper, Lichess and game analysis.
const { ipcMain, BrowserWindow, globalShortcut, clipboard, screen } = require('electron');
const path = require('path');
const memory = require('./memory');
const reminders = require('./reminders');
const briefing = require('./briefing');
const pc = require('./pc');
const tidy = require('./tidy');
const providers = require('./providers');
const { buildSystemPrompt } = require('./persona');

let clipWin = null;

const CLIP_PROMPTS = {
  translate: 'Translate the text. If it is not in {LANG}, translate it into {LANG}; if it already is {LANG}, translate it into English. Output only the translation.',
  shorter: 'Rewrite the text much shorter, same language, keep the meaning. Output only the new text.',
  friendlier: 'Rewrite the text friendlier and warmer, same language. Output only the new text.',
  fix: 'Correct spelling, grammar and punctuation, same language, change nothing else. Output only the corrected text.',
  formal: 'Rewrite the text in a polite, formal style, same language. Output only the new text.',
  explain: 'Explain this text simply in {LANG}, in 3-5 short sentences.',
  reply: 'Write a short, natural reply to this message, in the same language as the message. Output only the reply.',
  bullets: 'Summarize the text as 3-6 short bullet points in {LANG}.'
};
const LANGS = { de: 'German', en: 'English', sq: 'Albanian', fr: 'French', es: 'Spanish', it: 'Italian', tr: 'Turkish' };

function openClip() {
  const pt = screen.getCursorScreenPoint();
  const d = screen.getDisplayNearestPoint(pt).workArea;
  const W = 440, H = 380;
  const x = Math.min(Math.max(d.x, pt.x - W / 2), d.x + d.width - W), y = Math.min(Math.max(d.y, pt.y + 12), d.y + d.height - H);
  if (!clipWin || clipWin.isDestroyed()) {
    clipWin = new BrowserWindow({
      width: W, height: H, x, y, frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: false, show: false,
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false }
    });
    clipWin.loadFile(path.join(__dirname, '..', 'renderer', 'clip.html'));
    clipWin.on('blur', () => { if (clipWin && !clipWin.isDestroyed() && !clipWin.webContents.isDevToolsOpened()) clipWin.hide(); });
    clipWin.once('ready-to-show', () => clipWin.show());
  } else {
    clipWin.setPosition(Math.round(x), Math.round(y));
    clipWin.show();
    clipWin.webContents.send('clip:show');
  }
  clipWin.focus();
}

function register({ getWin, store, errInfo }) {
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: errInfo(e) }; } };
  const send = (ch, ...a) => { const w = getWin(); if (w && !w.isDestroyed()) w.webContents.send(ch, ...a); };

  // memory
  ipcMain.handle('mem:list', () => memory.list());
  ipcMain.handle('mem:add', (_e, t) => memory.add(t));
  ipcMain.handle('mem:remove', (_e, id) => memory.remove(id));

  // reminders & alarms
  ipcMain.handle('rem:list', () => reminders.list());
  ipcMain.handle('rem:add', wrap(r => ({ item: reminders.add(r) })));
  ipcMain.handle('rem:remove', (_e, id) => reminders.remove(id));
  ipcMain.handle('rem:snooze', wrap((r, m) => ({ item: reminders.snooze(r, m) })));
  reminders.start(r => {
    const w = getWin();
    if (w && r.kind === 'alarm') { w.show(); w.focus(); }
    send('reminder:fire', r);
  });

  // weather & briefing
  ipcMain.handle('weather:get', wrap(city => briefing.weather(city || store.get().city, store.get().language)));
  ipcMain.handle('weather:at', wrap(place => briefing.weather(place, store.get().language)));
  ipcMain.handle('brief:due', () => briefing.isDue(store.get()));
  ipcMain.handle('brief:make', wrap(async () => {
    const b = await briefing.make(store.get());
    store.update({ briefing: { lastDate: b.date } });
    return b;
  }));

  // PC control
  ipcMain.handle('pc:do', wrap(async (action, value) => ({ result: await pc.run(action, value) })));

  // tidy up
  ipcMain.handle('tidy:plan', wrap(dir => tidy.plan(dir || undefined)));
  ipcMain.handle('tidy:run', wrap(p => tidy.run(p)));
  ipcMain.handle('tidy:undo', wrap(dir => tidy.undo(dir || undefined)));
  ipcMain.handle('tidy:canUndo', (_e, dir) => tidy.canUndo(dir || undefined));

  // clipboard helper
  ipcMain.handle('clip:read', () => clipboard.readText());
  ipcMain.handle('clip:write', (_e, t) => clipboard.writeText(String(t || '')));
  ipcMain.handle('clip:close', () => clipWin?.hide());
  ipcMain.handle('clip:open', () => openClip());
  ipcMain.handle('clip:transform', wrap(async (kind, text) => {
    const s = store.get();
    const lang = LANGS[s.language] || 'English';
    const instr = (CLIP_PROMPTS[kind] || CLIP_PROMPTS.fix).replace(/\{LANG\}/g, lang);
    const out = await providers.complete(s, { system: buildSystemPrompt(s, 'You are a precise text tool. Follow the instruction exactly. No intro, no quotes around the result.'), messages: [{ role: 'user', text: instr + '\n\nTEXT:\n' + String(text).slice(0, 8000) }] });
    return { text: out.trim() };
  }));



  require('./media').register({ ipcMain, wrap, getWin });
  require('./create').register({ ipcMain, wrap, store });
  require('./life').register({ ipcMain, wrap, store, send });
  try { require('./discord').register({ ipcMain, wrap, store, send }); } catch (e) { console.error('[kairo] discord unavailable', e.message); }
  try { require('./focus').register({ ipcMain, wrap, store }); } catch (e) { console.error('[kairo] focus stats unavailable', e.message); }

  ipcMain.handle('win:show', () => { const w = getWin(); if (w) { w.show(); w.focus(); } });

  // Lichess bot + analysis of real games
  require('./lichess').register({ ipcMain, store, send, wrap });
  require('./analysis').register({ ipcMain, wrap });
}

module.exports = { register, openClip };
