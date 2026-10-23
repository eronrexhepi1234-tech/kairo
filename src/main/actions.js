// Things Kairo can do on the PC: create files, open websites, open apps.
const { shell, app } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- Files ----------
function outputDir() {
  const dir = path.join(app.getPath('documents'), 'Kairo');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeName(name) {
  let n = String(name || 'Dokument.txt').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
  if (!/\.[a-z0-9]{1,5}$/i.test(n)) n += '.txt';
  return n || 'Dokument.txt';
}

function uniquePath(dir, name) {
  const ext = path.extname(name), base = path.basename(name, ext);
  let p = path.join(dir, name), i = 2;
  while (fs.existsSync(p)) p = path.join(dir, `${base} (${i++})${ext}`);
  return p;
}

function createFile(name, content) {
  const file = uniquePath(outputDir(), safeName(name));
  const ext = path.extname(file).toLowerCase();
  if (ext === '.docx') fs.writeFileSync(file, makeDocx(content));
  else fs.writeFileSync(file, (ext === '.csv' ? '﻿' : '') + content, 'utf8');
  return file;
}

// ---------- Minimal Word (.docx) writer ----------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function zip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, text] of files) {
    const data = Buffer.from(text, 'utf8');
    const comp = zlib.deflateRawSync(data);
    const nameBuf = Buffer.from(name);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(0, 10); local.writeUInt32LE(crc, 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 12); central.writeUInt32LE(crc, 16); central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, comp);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const xmlEsc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// **bold** and *italic* inside a line -> Word runs
function runs(text, base = '') {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean).map(part => {
    let props = base;
    if (/^\*\*.*\*\*$/.test(part)) { props += '<w:b/>'; part = part.slice(2, -2); }
    else if (/^\*.*\*$/.test(part)) { props += '<w:i/>'; part = part.slice(1, -1); }
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${xmlEsc(part)}</w:t></w:r>`;
  }).join('');
}

function makeDocx(markdown) {
  const font = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>';
  const paras = [];
  for (const raw of String(markdown).replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) continue;
    if ((m = line.match(/^(#{1,3})\s+(.*)/))) {
      const sz = [40, 32, 28][m[1].length - 1];
      paras.push(`<w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>${runs(m[2].replace(/\*\*/g, ''), `${font}<w:b/><w:sz w:val="${sz}"/>`)}</w:p>`);
    } else if ((m = line.match(/^\s*[-*•]\s+(.*)/))) {
      paras.push(`<w:p><w:pPr><w:ind w:left="360" w:hanging="240"/><w:spacing w:after="60"/></w:pPr>${runs('• ' + m[1], `${font}<w:sz w:val="22"/>`)}</w:p>`);
    } else {
      paras.push(`<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>${runs(line, `${font}<w:sz w:val="22"/>`)}</w:p>`);
    }
  }
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1134" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', doc]
  ]);
}

// ---------- Open websites ----------
function openUrl(url) {
  let u = String(url || '').trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
  // web links plus app links that only open something; the user still confirms inside the app
  if (!/^(https?:\/\/|whatsapp:|steam:|spotify:|mailto:|discord:|ms-settings:|msteams:|roblox:|ms-windows-store:)/i.test(u)) throw new Error('This kind of link is not allowed');
  shell.openExternal(u);
  return u;
}

// ---------- Open apps ----------
// Known apps -> how Windows starts them. Unknown names go through "start", which only
// launches programs registered with Windows (App Paths), never arbitrary commands.
const APPS = {
  notepad: 'notepad', editor: 'notepad', rechner: 'calc', calculator: 'calc', calc: 'calc',
  explorer: 'explorer', 'datei-explorer': 'explorer', 'file explorer': 'explorer', dateien: 'explorer',
  paint: 'mspaint', taskmanager: 'taskmgr', 'task manager': 'taskmgr', cmd: 'cmd', terminal: 'wt', powershell: 'powershell',
  einstellungen: 'ms-settings:', settings: 'ms-settings:', store: 'ms-windows-store:', 'microsoft store': 'ms-windows-store:',
  kamera: 'microsoft.windows.camera:', camera: 'microsoft.windows.camera:', uhr: 'ms-clock:', clock: 'ms-clock:', wecker: 'ms-clock:',
  kalender: 'outlookcal:', calendar: 'outlookcal:', mail: 'outlookmail:', fotos: 'ms-photos:', photos: 'ms-photos:',
  spotify: 'spotify:', discord: 'discord:', steam: 'steam:', teams: 'msteams:', whatsapp: 'whatsapp:', zoom: 'zoommtg:',
  edge: 'microsoft-edge:', chrome: 'chrome', firefox: 'firefox', word: 'winword', excel: 'excel', powerpoint: 'powerpnt', outlook: 'outlook',
  'vs code': 'code', vscode: 'code', code: 'code', obs: 'obs64', roblox: 'roblox:', minecraft: 'minecraft:', epic: 'com.epicgames.launcher:'
};

function openApp(name) {
  const key = String(name || '').toLowerCase().trim();
  const target = APPS[key] || key;
  if (!/^[\w .:-]{1,60}$/.test(target)) throw new Error('Unknown app');
  if (/:$/.test(target)) { shell.openExternal(target); return target; }
  const p = spawn('cmd.exe', ['/d', '/c', `start "" "${target}"`], { windowsHide: true, detached: true, stdio: 'ignore', windowsVerbatimArguments: true });
  p.unref();
  return target;
}

function reveal(file) { shell.showItemInFolder(file); }
function openFile(file) { return shell.openPath(file); }

module.exports = { createFile, openUrl, openApp, reveal, openFile, outputDir, makeDocx };
