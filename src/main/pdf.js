// PDFs: create nicely designed PDFs from Markdown (rendered by Chromium), read text out of PDFs,
// and the "prompt helper" that opens ChatGPT / Claude / Gemini with a ready prompt.
const { BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const fs = require('fs');
const path = require('path');

async function makePdf(file, markdown, opts = {}) {
  const w = new BrowserWindow({ show: false, width: 900, height: 1200, webPreferences: { contextIsolation: true, sandbox: true } });
  try {
    await w.loadFile(path.join(__dirname, '..', 'renderer', 'pdf.html'));
    const title = opts.title || (markdown.match(/^#\s+(.+)$/m) || [])[1] || path.basename(file, '.pdf');
    await w.webContents.executeJavaScript(`renderDoc(${JSON.stringify(markdown)}, ${JSON.stringify(title)}, ${JSON.stringify(opts.accent || '#ff7a45')}, ${JSON.stringify(new Date().toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' }))})`);
    await new Promise(r => setTimeout(r, 250)); // fonts
    const buf = await w.webContents.printToPDF({
      printBackground: true, pageSize: 'A4', preferCSSPageSize: true, displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="font-family:Segoe UI,Arial;font-size:8px;color:#9a9a9a;width:100%;padding:0 16mm;display:flex;justify-content:space-between"><span>${title.replace(/[<>&]/g, '')}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      margins: { top: 0.55, bottom: 0.6, left: 0, right: 0 }
    });
    fs.writeFileSync(file, buf);
    return file;
  } finally { w.destroy(); }
}

async function readPdf(file) {
  const { getDocumentProxy, extractText } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(file)));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = text.map((t, i) => `--- Seite ${i + 1} ---\n${t.replace(/[ \t]+\n/g, '\n').trim()}`);
  return { pages: totalPages, text: pages.join('\n\n') };
}

// read any attachable file into text for the chat
async function readForChat(file) {
  const ext = path.extname(file).toLowerCase();
  const name = path.basename(file);
  if (ext === '.pdf') { const r = await readPdf(file); return { name, kind: 'pdf', pages: r.pages, text: r.text.slice(0, 120000) }; }
  if (/\.(png|jpe?g|webp|gif)$/.test(ext)) {
    const buf = fs.readFileSync(file);
    return { name, kind: 'image', image: { mime: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg', data: buf.toString('base64') } };
  }
  if (ext === '.docx') { const { docxText } = require('./media'); return { name, kind: 'docx', text: docxText(fs.readFileSync(file)).slice(0, 120000) }; }
  return { name, kind: 'text', text: fs.readFileSync(file, 'utf8').slice(0, 120000) };
}

// ---------- prompt helper ----------
const TARGETS = {
  chatgpt: { name: 'ChatGPT', url: q => 'https://chatgpt.com/?q=' + encodeURIComponent(q), prefill: true },
  claude: { name: 'Claude', url: q => 'https://claude.ai/new?q=' + encodeURIComponent(q), prefill: true },
  gemini: { name: 'Gemini', url: () => 'https://gemini.google.com/app', prefill: false },
  perplexity: { name: 'Perplexity', url: q => 'https://www.perplexity.ai/search?q=' + encodeURIComponent(q), prefill: true },
  copilot: { name: 'Copilot', url: () => 'https://copilot.microsoft.com/', prefill: false }
};
function targetOf(s) {
  const k = String(s || '').toLowerCase();
  return Object.keys(TARGETS).find(t => k.includes(t)) || (/gpt|openai/.test(k) ? 'chatgpt' : /anthropic/.test(k) ? 'claude' : /bard|google/.test(k) ? 'gemini' : null);
}
function openPrompt(target, prompt) {
  const key = targetOf(target) || 'chatgpt', t = TARGETS[key];
  clipboard.writeText(prompt);
  // long prompts don't fit into a link: then it's only on the clipboard
  const url = t.prefill && prompt.length < 6000 ? t.url(prompt) : t.url('');
  shell.openExternal(url);
  return { target: t.name, prefilled: t.prefill && prompt.length < 6000 };
}

function register({ getWin }) {
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  ipcMain.handle('file:attach', wrap(async () => {
    const r = await dialog.showOpenDialog(getWin(), { properties: ['openFile'], filters: [{ name: 'PDF, Word, Text, Bild', extensions: ['pdf', 'docx', 'txt', 'md', 'csv', 'json', 'html', 'png', 'jpg', 'jpeg', 'webp'] }] });
    if (r.canceled) return { file: null };
    return { file: await readForChat(r.filePaths[0]) };
  }));
  ipcMain.handle('file:attachPath', wrap(async p => ({ file: await readForChat(p) })));
  ipcMain.handle('prompt:open', wrap(async (target, prompt) => openPrompt(target, prompt)));
}

module.exports = { register, makePdf, readPdf, readForChat, openPrompt, TARGETS };
