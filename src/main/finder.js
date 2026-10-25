// Super-Search (Alt+Space): find files, programs and Windows settings, or calculate. No history is recorded.
const { app, ipcMain, shell, BrowserWindow, screen, globalShortcut } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

let getWin = null;

// files in your personal folders (only names and dates, refreshed every 10 minutes)
let fileIndex = { at: 0, files: [] };
function walk(root, depth, out, limit) {
  if (depth < 0 || out.length >= limit) return;
  let list; try { list = fs.readdirSync(root, { withFileTypes: true }); } catch { return; }
  for (const e of list) {
    if (out.length >= limit) return;
    if (e.name.startsWith('.') || /^(node_modules|AppData|\$Recycle\.Bin|desktop\.ini|win-unpacked|locales|resources|swiftshader)$/i.test(e.name)) continue;
    const p = path.join(root, e.name);
    if (e.isDirectory()) { out.push({ name: e.name, path: p, dir: true, at: 0 }); walk(p, depth - 1, out, limit); }
    else if (!/\.(pak|dll|dat|bin|asar|node|sys|tmp|log|lock|map|ini|db|pdb|cache)$/i.test(e.name)) { try { out.push({ name: e.name, path: p, at: fs.statSync(p).mtimeMs }); } catch {} }
  }
}
function indexFiles() {
  if (Date.now() - fileIndex.at < 10 * 60e3) return fileIndex.files;
  const out = [];
  for (const k of ['desktop', 'documents', 'downloads', 'pictures', 'videos', 'music']) { try { walk(app.getPath(k), 4, out, 40000); } catch {} }
  fileIndex = { at: Date.now(), files: out };
  return out;
}

// programs from the Start menu
let apps = null;
function appList() {
  if (apps) return apps;
  apps = [];
  for (const root of [path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'), path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')]) {
    const out = []; walk(root, 3, out, 3000);
    for (const f of out) if (!f.dir && /\.(lnk|url)$/i.test(f.name) && !/uninstall|deinstall|readme|help|hilfe/i.test(f.name)) apps.push({ name: f.name.replace(/\.(lnk|url)$/i, ''), path: f.path });
  }
  return apps;
}
const SETTINGS = [['WLAN', 'ms-settings:network-wifi'], ['Bluetooth', 'ms-settings:bluetooth'], ['Bildschirm', 'ms-settings:display'], ['Sound', 'ms-settings:sound'], ['Hintergrundbild', 'ms-settings:personalization-background'],
  ['Windows Update', 'ms-settings:windowsupdate'], ['Speicher', 'ms-settings:storagesense'], ['Apps', 'ms-settings:appsfeatures'], ['Autostart', 'ms-settings:startupapps'], ['Maus', 'ms-settings:mousetouchpad'],
  ['Benachrichtigungen', 'ms-settings:notifications'], ['Energie', 'ms-settings:powersleep'], ['Datum und Uhrzeit', 'ms-settings:dateandtime'], ['Sprache', 'ms-settings:regionlanguage'], ['Drucker', 'ms-settings:printers'], ['Nachtmodus', 'ms-settings:nightlight']];

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function score(name, q) { const n = norm(name), w = q.split(/\s+/).filter(Boolean); if (!w.every(x => n.includes(x))) return 0; return (n.startsWith(w[0]) ? 3 : 1) + (n === q ? 5 : 0); }
function calc(q) {
  const e = q.replace(/,/g, '.').replace(/(\d)\s*x\s*(\d)/g, '$1*$2').replace(/÷/g, '/').replace(/\^/g, '**');
  if (!/^[\d\s+\-*/().%]+$/.test(e) || !/\d\s*[-+*/%]/.test(e)) return null;
  try { const v = Function('"use strict";return (' + e + ')')(); return Number.isFinite(v) ? Math.round(v * 1e10) / 1e10 : null; } catch { return null; }
}
function search(q) {
  q = norm(q).trim();
  if (!q) return [];
  const res = [];
  const c = calc(q); if (c != null) res.push({ type: 'calc', title: c.toLocaleString('de-CH'), raw: String(c), sub: q + ' =', score: 100 });
  for (const a of appList()) { const s = score(a.name, q); if (s) res.push({ type: 'app', title: a.name, sub: 'Programm', path: a.path, score: 20 + s }); }
  for (const [n, u] of SETTINGS) { const s = score(n + ' einstellungen', q); if (s) res.push({ type: 'setting', title: n, sub: 'Windows-Einstellung', url: u, score: 15 + s }); }
  for (const f of indexFiles()) {
    const s = score(f.name, q);
    if (s) res.push({ type: f.dir ? 'folder' : 'file', title: f.name, sub: path.dirname(f.path).replace(os.homedir(), '~'), path: f.path, score: (f.dir ? 11 : 10) + s + Math.max(0, 5 - (Date.now() - f.at) / 864e6) });
  }
  return res.sort((a, b) => b.score - a.score).slice(0, 40);
}
function openResult(r) {
  if (r.type === 'setting') return shell.openExternal(r.url);
  if (r.path) return shell.openPath(r.path);
}

let sw = null;
function toggle() {
  if (sw && !sw.isDestroyed()) { if (sw.isVisible()) { sw.hide(); return; } sw.show(); sw.focus(); sw.webContents.send('search:open'); return; }
  const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  sw = new BrowserWindow({ width: 720, height: 520, x: Math.round(d.x + (d.width - 720) / 2), y: Math.round(d.y + d.height * 0.16), frame: false, transparent: true, resizable: false, skipTaskbar: true, alwaysOnTop: true, show: false, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false } });
  sw.loadFile(path.join(__dirname, '..', 'renderer', 'search.html'));
  sw.once('ready-to-show', () => { sw.show(); sw.focus(); });
  sw.on('blur', () => { if (sw && !sw.isDestroyed()) sw.hide(); });
}

function register(ctx) {
  getWin = ctx.getWin;
  setTimeout(indexFiles, 30000);
  ipcMain.handle('search:query', (_e, q) => ({ ok: true, results: search(q) }));
  ipcMain.handle('search:open', async (_e, r) => { await openResult(r); sw?.hide(); return { ok: true }; });
  ipcMain.handle('search:reveal', (_e, p) => { shell.showItemInFolder(p); sw?.hide(); return { ok: true }; });
  ipcMain.on('search:hide', () => sw?.hide());
  ipcMain.on('search:toKairo', (_e, text) => { sw?.hide(); const w = getWin(); if (w) { if (w.isMinimized()) w.restore(); w.show(); w.focus(); w.webContents.send('search:ask', text); } });
  ipcMain.handle('search:toggle', () => toggle());
  const hk = () => { try { globalShortcut.register('Alt+Space', toggle); } catch {} };
  app.whenReady().then(hk);
  global.kairoSearchHotkey = hk; // hotkeys get re-registered elsewhere; put ours back
}

module.exports = { register, search, toggle };
