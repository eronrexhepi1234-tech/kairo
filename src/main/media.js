// Read-aloud sources (web page, text/Word file) and saving screen clips.
const { app, dialog, desktopCapturer, screen, shell, globalShortcut, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&[a-z]+;/g, ' ');

// main text of a web page: headings, paragraphs and list items, without menus and scripts
function htmlToText(html) {
  const body = html.replace(/<(script|style|nav|footer|header|aside|form|noscript|svg)[\s\S]*?<\/\1>/gi, ' ');
  const blocks = [...body.matchAll(/<(h1|h2|h3|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(m => decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 25 || /[.!?:]$/.test(t));
  return blocks.join('\n\n');
}

async function readUrl(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error('Only web links');
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 Kairo-Reader' }, signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const text = htmlToText(html);
  if (text.length < 80) throw new Error('No readable text found on this page');
  return { title, text: text.slice(0, 60000) };
}

// tiny zip reader for .docx (central directory -> word/document.xml)
function docxText(buf) {
  let eocd = buf.length - 22;
  while (eocd > 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    if (name === 'word/document.xml') {
      const lnlen = buf.readUInt16LE(off + 26), lelen = buf.readUInt16LE(off + 28);
      const data = buf.subarray(off + 30 + lnlen + lelen, off + 30 + lnlen + lelen + csize);
      const xml = (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8');
      return decode(xml.replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, ' ').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').trim();
    }
    p += 46 + nlen + elen + clen;
  }
  throw new Error('Not a Word document');
}

async function readFile(win) {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Text', extensions: ['txt', 'md', 'docx', 'html', 'htm', 'csv', 'json'] }] });
  if (r.canceled) return null;
  const f = r.filePaths[0], ext = path.extname(f).toLowerCase();
  const buf = fs.readFileSync(f);
  let text = ext === '.docx' ? docxText(buf) : buf.toString('utf8');
  if (ext === '.html' || ext === '.htm') text = htmlToText(text);
  return { title: path.basename(f), text: text.slice(0, 60000) };
}

// ---------- clips ----------
async function screenSourceId() {
  const d = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } });
  return (sources.find(s => s.display_id === String(d.id)) || sources[0]).id;
}

function saveClip(bytes) {
  const dir = path.join(app.getPath('videos'), 'Kairo Clips');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `Clip ${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.webm`);
  fs.writeFileSync(file, Buffer.from(bytes));
  shell.showItemInFolder(file);
  return { file };
}

function register({ ipcMain, wrap, getWin }) {
  ipcMain.handle('reader:url', wrap(u => readUrl(u)));
  ipcMain.handle('reader:file', async () => { try { const r = await readFile(getWin()); return r ? { ok: true, ...r } : null; } catch (e) { return { ok: false, error: { message: e.message } }; } });
  ipcMain.handle('clips:source', () => screenSourceId());
  ipcMain.handle('clips:save', wrap(b => saveClip(b)));
}

// Ctrl+Alt+C saves a clip (works while a game is in front)
function hotkeys(getWin) {
  try { globalShortcut.register('CommandOrControl+Alt+C', () => getWin()?.webContents.send('clips:save-request')); } catch {}
}

module.exports = { register, hotkeys, htmlToText, docxText };
