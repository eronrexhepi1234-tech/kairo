// Kairo Builder: sketch -> app, voice coding (change the running app), websites that get better the longer Kairo works on them,
// logo -> website, "how does it work?" explainers (animated SVG steps) and the idea shop.
const { app, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

let store = null;
const LANG = { de: 'German', en: 'English', sq: 'Albanian', fr: 'French', es: 'Spanish', it: 'Italian', tr: 'Turkish' };
const P = () => require('./providers');
const lang = () => LANG[store.get().language] || 'German';
const safe = s => String(s || 'Kairo').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 60) || 'Kairo';
const dirOf = kind => { const d = path.join(app.getPath('documents'), 'Kairo', kind === 'site' ? 'Websites' : 'Apps'); fs.mkdirSync(d, { recursive: true }); return d; };

const RULES = `Technical rules (very important):
- ONE self-contained HTML file: HTML + CSS + JavaScript inline. No external files, no CDN, no web fonts, no images from the internet, no fetch/XHR, no localStorage (it is blocked). Images: draw with CSS, inline SVG or canvas.
- Use a nice system font stack: font-family: "Segoe UI Variable", "Segoe UI", system-ui, sans-serif.
- It must work right away and have no errors. Fit any window size (responsive, also phone width).
- Return ONLY the HTML file, starting with <!doctype html>. No explanation, no markdown fences.`;

const LOGO_NOTE = 'The brand logo is available as an image: use exactly <img src="{{LOGO}}" alt="Logo"> wherever the logo should appear (header, hero, footer, favicon is not needed). Never draw your own logo.';

function cleanHtml(out) {
  let html = String(out || '').replace(/^[\s\S]*?(<!doctype html>|<html)/i, '$1').replace(/```[\s\S]*$/, '').trim();
  if (!/<html|<body|<script|<div/i.test(html)) throw new Error('Keine fertige Seite bekommen – versuch es nochmal');
  return html;
}
const complete = (system, text, images) => P().complete(store.get(), { system, messages: [{ role: 'user', text, images }] });
const titleOf = (html, fallback) => (html.match(/<title>([^<]{1,60})<\/title>/i) || [])[1]?.trim() || String(fallback || 'Kairo App').slice(0, 40);
// after the first build the project keeps its name (and folder), even if the AI renames the <title>

// ---------- sketch / idea -> app ----------
async function makeApp({ idea, image }) {
  const sys = `You are a world-class product designer and front-end developer. Build a complete, beautiful, WORKING web app in ONE HTML file.
${image ? 'The user drew a rough sketch of the layout. Follow its layout (where things are, what the buttons/fields are, labels written on it) but make it look like a polished, modern, professional app: great spacing, typography, colors, rounded cards, subtle shadows, smooth hover and click animations.' : 'Design the layout yourself: polished, modern, professional, with great spacing, typography, colors and smooth animations.'}
Every button and field must really work (real logic, not fake). If it is a game, it must be playable with keyboard and mouse/touch.
Texts in the app in ${lang()}.
${RULES}`;
  const html = cleanHtml(await complete(sys, `${image ? 'Here is my sketch.' : ''} What it should be: ${idea || 'figure it out from the sketch'}`, image ? [{ mime: 'image/png', data: image }] : undefined));
  return { html, title: titleOf(html, idea) };
}

// ---------- voice coding: change the current app/site ----------
async function edit({ html, change, kind }) {
  const sys = `You are an expert front-end developer. Change the given ${kind === 'site' ? 'website' : 'web app'} exactly as the user asks and keep everything else working and looking the same.
Make the change clearly visible and nicely animated where it fits. Texts in ${lang()}.
${kind === 'site' && html.includes('{{LOGO}}') ? LOGO_NOTE : ''}
${RULES}`;
  const out = cleanHtml(await complete(sys, `Current file:\n\n${html}\n\nChange: ${change}\n\nReturn the full updated HTML file.`));
  return { html: out };
}

// ---------- websites ----------
const STYLES = {
  auto: 'pick the style that fits the topic best',
  dark: 'dark, premium, glowing accents (like Apple / Linear / Vercel)',
  light: 'light, clean, airy, lots of white space (like Stripe / Notion)',
  bold: 'bold, colorful, big typography, playful (like Spotify Wrapped / Duolingo)',
  gaming: 'gaming / esports: dark, neon, sharp angles, energetic',
  luxury: 'luxury: elegant serif headlines, black and gold, calm'
};
async function makeSite({ idea, style, brand }) {
  const sys = `You are an award-winning web designer (Awwwards level) and front-end developer. Build a stunning, complete landing website in ONE HTML file.
Style: ${STYLES[style] || STYLES.auto}.
${brand ? `Brand: name "${brand.name}"${brand.tagline ? `, slogan "${brand.tagline}"` : ''}, brand colors ${(brand.colors || []).join(', ')}. Use exactly these colors for the whole design. ${LOGO_NOTE}` : ''}
Must have: sticky header with navigation (smooth scroll to sections), a big impressive hero section with a strong headline and call-to-action, at least 5 more sections (e.g. features, how it works, gallery or showcase drawn with CSS/SVG, testimonials, pricing or FAQ, contact form that shows a thank-you message), footer.
Make it feel alive: scroll reveal animations (IntersectionObserver), hover effects, a subtle animated background in the hero (gradient, particles or shapes on canvas/CSS).
Write real, convincing texts (no lorem ipsum) in ${lang()}.
${RULES}`;
  const html = cleanHtml(await complete(sys, `Website about: ${idea}`));
  return { html, title: titleOf(html, idea) };
}
// each round improves one thing; Kairo goes through them until the time is up
const ROUNDS = [
  ['design', 'Make the design clearly more beautiful and professional: better typography scale, spacing, color harmony, consistent rounded corners, nicer cards, better contrast. Keep all content.'],
  ['wow', 'Make the hero section unforgettable: a stunning animated background (canvas particles, flowing gradient blobs or 3D-looking shapes), animated headline (letters or words appear), a glowing call-to-action button.'],
  ['motion', 'Add smooth, tasteful animations everywhere: scroll reveals with stagger, hover lifts, animated counters for numbers, a smooth progress bar at the top while scrolling, button ripple effects.'],
  ['content', 'Add 2 more valuable sections that fit the topic (e.g. statistics, timeline, comparison table, team, FAQ accordion) and improve all texts to sound more convincing and specific.'],
  ['mobile', 'Make it perfect on phones: a working burger menu with animation, readable font sizes, no horizontal scrolling, touch-friendly buttons. Also check desktop still looks great.'],
  ['interactive', 'Add 1-2 delightful interactive elements that fit the topic (e.g. a configurator, a mini quiz, before/after slider, pricing toggle monthly/yearly, tabs, image carousel drawn with CSS/SVG).'],
  ['polish', 'Final polish: fix any bug or broken layout, make all links and buttons work, add a dark/light mode toggle if it fits, add small details (favicon-like emoji in title is not allowed, use SVG icons), make it feel finished.'],
  ['details', 'Look at it like a top designer: what still looks cheap or empty? Improve those parts: icons (inline SVG), illustrations (SVG/CSS), section transitions, footer.']
];
async function improveSite({ html, round, brand, wish }) {
  const [key, task] = ROUNDS[round % ROUNDS.length];
  const sys = `You are an award-winning web designer and front-end developer. Improve the given website. Keep everything that works and is good, keep the language (${lang()}), keep the brand.
Improvement for this round: ${task}${wish ? `\nThe user also wants: ${wish}` : ''}
${brand || html.includes('{{LOGO}}') ? LOGO_NOTE : ''}
${RULES}`;
  const out = cleanHtml(await complete(sys, `Current website:\n\n${html}\n\nReturn the full improved HTML file.`));
  // a cut-off answer would break the site: keep the old one then
  if (!/<\/html>\s*$/i.test(out) || out.length < html.length * 0.6) throw new Error('Runde unvollständig – nächste Runde');
  return { html: out, key };
}

// ---------- save / list ----------
function save({ html, title, kind, logo }) {
  const dir = path.join(dirOf(kind), safe(title));
  fs.mkdirSync(dir, { recursive: true });
  let out = html;
  if (logo && out.includes('{{LOGO}}')) { fs.writeFileSync(path.join(dir, 'logo.svg'), logo); out = out.split('{{LOGO}}').join('logo.svg'); }
  const file = path.join(dir, 'index.html');
  fs.writeFileSync(file, out);
  return { file, dir };
}
function list() {
  const out = [];
  for (const kind of ['app', 'site']) {
    const d = dirOf(kind);
    for (const n of fs.readdirSync(d)) {
      const f = path.join(d, n, 'index.html');
      if (fs.existsSync(f)) out.push({ kind, name: n, file: f, at: fs.statSync(f).mtimeMs });
    }
  }
  return out.sort((a, b) => b.at - a.at).slice(0, 40);
}
function load(file) {
  const base = [dirOf('app'), dirOf('site')].find(d => path.resolve(file).startsWith(d + path.sep));
  if (!base) throw new Error('Nur Kairo-Projekte');
  let html = fs.readFileSync(file, 'utf8'), logo = null;
  const lf = path.join(path.dirname(file), 'logo.svg');
  if (fs.existsSync(lf)) { logo = fs.readFileSync(lf, 'utf8'); html = html.split('src="logo.svg"').join('src="{{LOGO}}"'); }
  return { html, logo, title: path.basename(path.dirname(file)), kind: base === dirOf('site') ? 'site' : 'app' };
}

// ---------- how does it work? ----------
async function explain({ topic, depth }) {
  const n = { short: '4', normal: '6', long: '9' }[depth] || '6';
  const sys = `You are a brilliant science explainer like Kurzgesagt. Explain how something works in ${n} clear visual steps, for a curious teenager. Language: ${lang()}.
For EVERY step draw a clean, beautiful explanatory diagram as SVG (like an infographic): viewBox="0 0 800 450", dark background is added by the app (do not draw a full background rect), use bright colors (#ff7a45, #7a5cff, #3ddc97, #4fc3ff, #ffd27a, #ff4f8b, white), thick rounded strokes (stroke-linecap="round"), simple shapes (path, circle, rect, ellipse, line, polyline, polygon, g, text), arrows to show movement or flow, short labels with <text font-family="Arial" font-weight="bold" fill="#fff">. Use the WHOLE 800x450 area (main objects big, centered, filling most of it). 6-25 elements per diagram, list them in drawing order (background parts first, labels last). No images, no scripts, no filters, no <style>, no animations.
Return ONLY JSON: {"title":"How X works","intro":"one exciting sentence","steps":[{"title":"short step title","text":"2-3 sentences, simple and precise","say":"what the narrator says (natural, 2-3 sentences, can be a bit more detailed than text)","fact":"optional short surprising fact or empty","svg":"<svg ...>...</svg>"}],"summary":"one sentence summary"}`;
  for (let i = 0; i < 3; i++) {
    const out = await complete(sys + (i ? ' IMPORTANT: valid JSON only, escape quotes inside strings.' : ''), `Explain: ${topic}`);
    let j = null; try { j = P().parseJson(out); } catch {}
    if (j?.steps?.length) return j;
  }
  throw new Error('Keine Erklärung bekommen – nochmal versuchen');
}
function saveVideo(b64, ext, title) {
  const dir = path.join(app.getPath('videos'), 'Kairo', 'Erklärvideos'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${safe(title)} ${new Date().toLocaleString('sv').replace(/[: ]/g, '-')}.${ext}`);
  fs.writeFileSync(f, Buffer.from(b64, 'base64'));
  return f;
}

function register(ctx) {
  ({ store } = ctx);
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  ipcMain.handle('bd:app', wrap(o => makeApp(o)));
  ipcMain.handle('bd:edit', wrap(o => edit(o)));
  ipcMain.handle('bd:site', wrap(o => makeSite(o)));
  ipcMain.handle('bd:improve', wrap(o => improveSite(o)));
  ipcMain.handle('bd:save', wrap(async o => save(o)));
  ipcMain.handle('bd:list', wrap(async () => ({ items: list() })));
  ipcMain.handle('bd:load', wrap(async f => load(f)));
  ipcMain.handle('bd:explain', wrap(async o => ({ ex: await explain(o) })));
  ipcMain.handle('bd:saveVideo', wrap(async (b64, ext, title) => ({ path: saveVideo(b64, ext, title) })));
  ipcMain.handle('bd:reveal', (_e, p) => shell.showItemInFolder(p));
  ipcMain.handle('bd:openExternal', (_e, f) => { if ([dirOf('app'), dirOf('site')].some(d => path.resolve(f).startsWith(d + path.sep))) shell.openPath(f); });
}

module.exports = { register, makeApp, edit, makeSite, improveSite, explain, ROUNDS };
