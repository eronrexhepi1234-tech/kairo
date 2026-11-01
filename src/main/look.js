// Live screen help + smart memory.
// - marks: a click-through window over the whole screen that draws boxes and labels where Kairo points
//   (the AI returns [[mark: ymin, xmin, ymax, xmax | label]] with 0-1000 coordinates of the screenshot)
// - geo:aiGuess: Kairo plays a round of its own GeoGuessr (never clicks in other games)
// - mem:learn / mem:upcoming: Kairo picks up facts and dates from the chat by itself
const { ipcMain, BrowserWindow, screen } = require('electron');
const path = require('path');
const providers = () => require('./providers');
const memory = require('./memory');

let store, getWin, marksWin = null, hideTimer = null;

function marksWindow() {
  if (marksWin && !marksWin.isDestroyed()) return marksWin;
  const b = screen.getPrimaryDisplay().bounds;
  marksWin = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: false, focusable: false, hasShadow: false, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false }
  });
  marksWin.setAlwaysOnTop(true, 'screen-saver');
  marksWin.setIgnoreMouseEvents(true);
  marksWin.setContentProtection(true); // never in Kairo's own screenshots
  marksWin.loadFile(path.join(__dirname, '..', 'renderer', 'marks.html'));
  return marksWin;
}

function showMarks(data) {
  // Kairo's own window would cover what it points at: step aside (the mini orb stays)
  const main = getWin?.();
  if (data.stepAside && (data.marks || []).length && main && !main.isDestroyed() && main.isVisible() && !main.isMinimized()) main.minimize();
  const w = marksWindow();
  const b = screen.getPrimaryDisplay().bounds;
  w.setBounds(b);
  const send = () => { w.webContents.send('marks:data', data); w.showInactive(); };
  if (w.webContents.isLoading()) w.webContents.once('did-finish-load', send); else send();
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideMarks, Math.max(8, Math.min(60, data.seconds || 30)) * 1000);
  return true;
}
function hideMarks() {
  clearTimeout(hideTimer);
  if (marksWin && !marksWin.isDestroyed()) { marksWin.webContents.send('marks:data', null); setTimeout(() => marksWin && !marksWin.isDestroyed() && marksWin.hide(), 400); }
  return true;
}

const jsonOf = raw => { const m = String(raw || '').match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } };

// Kairo looks at the satellite photo of its own GeoGuessr round and guesses
async function geoGuess(b64) {
  const s = store.get();
  const raw = await providers().complete(s, {
    system: 'You are a world-class GeoGuessr player looking at a satellite photo from above.',
    messages: [{ role: 'user', images: [{ mime: 'image/jpeg', data: b64 }], text:
`Where on Earth is this satellite photo? Look at coastlines, rivers, street grid, roof colours, fields, vegetation, desert, snow, famous landmarks.
Reply with ONLY JSON: {"lat":number,"lng":number,"place":"best guess city/area","country":"country","confidence":0-100,"reason":"one short sentence in ${s.language === 'de' ? 'German' : s.language === 'sq' ? 'Albanian' : 'English'}"}` }]
  });
  const j = jsonOf(raw);
  if (!j || !isFinite(+j.lat) || !isFinite(+j.lng)) throw new Error('Kairo konnte keinen Ort erkennen');
  return { lat: +j.lat, lng: +j.lng, place: String(j.place || ''), country: String(j.country || ''), confidence: +j.confidence || 0, reason: String(j.reason || '') };
}

// picks lasting facts and dated events out of the last messages of the user
async function learn(texts) {
  const s = store.get();
  if (s.autoMemory === false) return { added: [] };
  const said = (texts || []).map(t => String(t || '').slice(0, 600)).filter(t => t.length > 3);
  if (!said.length) return { added: [] };
  const known = memory.list().map(m => '- ' + m.text + (m.when ? ' (' + m.when + ')' : '')).join('\n') || '(nothing yet)';
  const today = memory.day(0);
  const raw = await providers().complete(s, {
    system: 'You maintain the long-term memory of a personal assistant. Be very selective.',
    messages: [{ role: 'user', text:
`Today is ${today} (${new Date().toLocaleDateString('en-GB', { weekday: 'long' })}).
Messages the user just wrote:
${said.map(t => '> ' + t).join('\n')}

Already remembered:
${known}

Extract ONLY new facts about the user that are worth remembering for weeks: name, age, school/class, subjects they like or struggle with, hobbies, games they play, projects they build, favourite things, friends/family names, goals,
and upcoming events with a date (exam, test, birthday, trip, deadline). Turn relative dates ("morgen", "am Freitag", "next week") into YYYY-MM-DD.
Do NOT store: questions, one-time requests, moods, things about other people's private data, passwords, addresses, phone numbers, anything sensitive (health, religion, politics).
Write each fact short, in the user's language, in third person from the assistant's view (e.g. "Spielt gern Roblox", "Mathe-Prüfung").
Reply ONLY JSON: {"facts":[{"text":"...","when":"YYYY-MM-DD or empty"}]} – usually 0 or 1 facts, at most 3.` }]
  });
  const j = jsonOf(raw);
  const added = [];
  for (const f of (j?.facts || []).slice(0, 3)) {
    const when = /^\d{4}-\d{2}-\d{2}$/.test(f.when || '') ? f.when : '';
    const m = memory.add(f.text, when);
    if (m) added.push(m);
  }
  return { added };
}

function register(ctx) {
  store = ctx.store; getWin = ctx.getWin;
  ipcMain.handle('marks:show', (_e, d) => showMarks(d || {}));
  ipcMain.handle('marks:hide', () => hideMarks());
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { message: e.message, code: e.code || null } }; } };
  ipcMain.handle('geo:aiGuess', wrap(async b64 => ({ guess: await geoGuess(b64) })));
  ipcMain.handle('mem:learn', wrap(async texts => learn(texts)));
  ipcMain.handle('mem:upcoming', () => memory.upcoming(3));
}

module.exports = { register, showMarks, hideMarks };
