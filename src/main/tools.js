// Things the assistant can look at: the screen, the news, places on Earth, folders.
const { desktopCapturer, screen } = require('electron');
const fs = require('fs');
const path = require('path');

const UA = 'Kairo-Desktop/0.1 (github.com/kairo-app)';

// ---------- Screen ----------
async function captureScreen(maxWidth = 1600) {
  const d = screen.getPrimaryDisplay();
  const w = Math.round(d.size.width * d.scaleFactor);
  const h = Math.round(d.size.height * d.scaleFactor);
  const scale = Math.min(1, maxWidth / w);
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(w * scale), height: Math.round(h * scale) }
  });
  const src = sources.find(s => s.display_id === String(d.id)) || sources[0];
  if (!src) throw new Error('No screen found');
  return { mime: 'image/jpeg', data: src.thumbnail.toJPEG(82).toString('base64') };
}

// ---------- News (Google News RSS, no key needed) ----------
const REGIONS = {
  de: { hl: 'de', gl: 'DE', ceid: 'DE:de' }, en: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  sq: { hl: 'sq', gl: 'AL', ceid: 'AL:sq' }, fr: { hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
  es: { hl: 'es', gl: 'ES', ceid: 'ES:es' }, it: { hl: 'it', gl: 'IT', ceid: 'IT:it' },
  tr: { hl: 'tr', gl: 'TR', ceid: 'TR:tr' }, ch: { hl: 'de', gl: 'CH', ceid: 'CH:de' }
};

function decodeEntities(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

async function getNews({ query = '', lang = 'de', region = 'auto', limit = 12 } = {}) {
  const r = REGIONS[region !== 'auto' ? region : lang] || REGIONS.en;
  const base = 'https://news.google.com/rss';
  const qs = `hl=${r.hl}&gl=${r.gl}&ceid=${r.ceid}`;
  const url = query ? `${base}/search?q=${encodeURIComponent(query + ' when:7d')}&${qs}` : `${base}?${qs}`;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error('News ' + res.status);
  const xml = await res.text();
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const pick = tag => decodeEntities((m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || '').trim();
    items.push({ title: pick('title'), link: pick('link'), date: pick('pubDate'), source: pick('source') });
    if (items.length >= limit) break;
  }
  return items;
}

// ---------- Places (OpenStreetMap Nominatim) ----------
async function geocode(q) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { 'user-agent': UA } });
  const j = await res.json();
  if (!j[0]) return null;
  return { lat: +j[0].lat, lng: +j[0].lon, name: j[0].display_name };
}

async function reverseGeocode(lat, lng, lang = 'en') {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lng}&accept-language=${lang}`, { headers: { 'user-agent': UA } });
  const j = await res.json();
  if (j.error) return { name: null, country: null };
  const a = j.address || {};
  return {
    name: a.city || a.town || a.village || a.county || a.state || a.country || j.display_name,
    country: a.country || null,
    countryCode: (a.country_code || '').toUpperCase(),
    full: j.display_name
  };
}

// ---------- Folders ----------
const TEXT_EXT = new Set(['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css', '.csv', '.xml', '.yml', '.yaml', '.ini', '.cfg', '.log', '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs', '.php', '.rb', '.lua', '.sh', '.ps1', '.bat', '.sql', '.toml', '.env.example']);
const SKIP_DIRS = new Set(['node_modules', '.git', '__pycache__', '.venv', 'venv', 'dist', 'build', '.next', 'AppData']);

function scanFolder(root, { maxDepth = 3, maxEntries = 400 } = {}) {
  const out = [];
  function walk(dir, depth) {
    if (out.length >= maxEntries || depth > maxDepth) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));
    for (const e of entries) {
      if (out.length >= maxEntries) return;
      if (e.name.startsWith('.') && e.name !== '.env.example') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        out.push({ path: full, rel: path.relative(root, full), dir: true, depth });
        if (!SKIP_DIRS.has(e.name)) walk(full, depth + 1);
      } else {
        let size = 0; try { size = fs.statSync(full).size; } catch {}
        out.push({ path: full, rel: path.relative(root, full), dir: false, size, depth, text: TEXT_EXT.has(path.extname(e.name).toLowerCase()) });
      }
    }
  }
  walk(root, 0);
  return out;
}

function readTextFile(p, maxBytes = 60000) {
  const buf = fs.readFileSync(p);
  const slice = buf.subarray(0, maxBytes).toString('utf8');
  return buf.length > maxBytes ? slice + '\n…[truncated]' : slice;
}

// Builds a compact text summary of a folder for the model.
function folderContext(root) {
  const entries = scanFolder(root);
  const listing = entries.map(e => `${'  '.repeat(e.depth)}${e.dir ? '📁 ' : ''}${path.basename(e.path)}${e.dir ? '/' : ` (${Math.round(e.size / 1024)} KB)`}`).join('\n');
  const important = entries.filter(e => e.text && !e.dir && e.size < 40000)
    .sort((a, b) => (/readme/i.test(b.rel) - /readme/i.test(a.rel)) || a.depth - b.depth)
    .slice(0, 8);
  let budget = 50000;
  const files = [];
  for (const f of important) {
    if (budget <= 0) break;
    const c = readTextFile(f.path, Math.min(12000, budget));
    budget -= c.length;
    files.push(`--- ${f.rel} ---\n${c}`);
  }
  return `Folder: ${root}\n${entries.length} entries${entries.length >= 400 ? ' (cut off)' : ''}\n\n${listing}\n\n${files.join('\n\n')}`;
}

module.exports = { captureScreen, getNews, geocode, reverseGeocode, scanFolder, readTextFile, folderContext };
