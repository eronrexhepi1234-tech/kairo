// Tidy up a folder (Downloads by default): sort loose files into sub-folders by type.
// Always: plan first (nothing moves), the user confirms, and every move can be undone.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const GROUPS = {
  'Bilder': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'svg', 'ico', 'tif', 'tiff', 'avif'],
  'Videos': ['mp4', 'mov', 'mkv', 'avi', 'webm', 'wmv', 'm4v'],
  'Musik': ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac', 'wma'],
  'Dokumente': ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'odp', 'ods', 'epub'],
  'Programme': ['exe', 'msi', 'msix', 'appx', 'bat', 'cmd'],
  'Archive': ['zip', 'rar', '7z', 'tar', 'gz', 'iso'],
  'Code': ['js', 'ts', 'py', 'json', 'html', 'css', 'java', 'c', 'cpp', 'cs', 'lua', 'xml', 'yml', 'yaml'],
  '3D & Design': ['blend', 'fbx', 'obj', 'stl', 'psd', 'ai', 'fig', 'rbxl', 'rbxm']
};
const SKIP = /\.(crdownload|part|partial|tmp|download|opdownload)$|^desktop\.ini$/i;
const groupOf = ext => Object.keys(GROUPS).find(g => GROUPS[g].includes(ext)) || null;
const UNDO = dir => path.join(dir, '.kairo-undo.json');

function defaultDir() { return app.getPath('downloads'); }

function plan(dir = defaultDir()) {
  const moves = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile() || SKIP.test(e.name) || e.name.startsWith('.')) continue;
    const g = groupOf(path.extname(e.name).slice(1).toLowerCase());
    if (!g) continue;
    let size = 0; try { size = fs.statSync(path.join(dir, e.name)).size; } catch {}
    moves.push({ name: e.name, group: g, size });
  }
  const summary = {};
  for (const m of moves) summary[m.group] = (summary[m.group] || 0) + 1;
  return { dir, moves, summary, total: moves.length };
}

function unique(p) {
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(p), base = p.slice(0, -ext.length || undefined);
  let i = 2; while (fs.existsSync(`${base} (${i})${ext}`)) i++;
  return `${base} (${i})${ext}`;
}

function run(p) {
  const done = [];
  for (const m of p.moves) {
    const from = path.join(p.dir, m.name);
    if (!fs.existsSync(from)) continue;
    const folder = path.join(p.dir, m.group);
    fs.mkdirSync(folder, { recursive: true });
    const to = unique(path.join(folder, m.name));
    try { fs.renameSync(from, to); done.push({ from, to }); } catch {}
  }
  fs.writeFileSync(UNDO(p.dir), JSON.stringify({ date: new Date().toISOString(), done }, null, 2));
  return { moved: done.length };
}

function undo(dir = defaultDir()) {
  const log = JSON.parse(fs.readFileSync(UNDO(dir), 'utf8'));
  let n = 0;
  for (const { from, to } of log.done.reverse()) {
    if (fs.existsSync(to) && !fs.existsSync(from)) { try { fs.renameSync(to, from); n++; } catch {} }
  }
  fs.unlinkSync(UNDO(dir));
  return { restored: n };
}

function canUndo(dir = defaultDir()) { return fs.existsSync(UNDO(dir)); }

module.exports = { plan, run, undo, canUndo, defaultDir };
