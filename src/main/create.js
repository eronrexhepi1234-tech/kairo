// Creating things: images, YouTube summaries, PowerPoint presentations.
const { app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const providers = require('./providers');
const { buildSystemPrompt } = require('./persona');

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
const safe = s => String(s || 'Kairo').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 80) || 'Kairo';
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';

// ---------- images ----------
// Gemini first (needs an image-enabled key); otherwise the free Pollinations service (prompt is sent there).
async function image(settings, prompt) {
  const dir = path.join(app.getPath('pictures'), 'Kairo');
  fs.mkdirSync(dir, { recursive: true });
  const key = settings.keys.gemini;
  if (key) {
    for (const model of ['gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image', 'gemini-3.1-flash-image']) {
      try {
        const r = await fetch(`${GEMINI}/${model}:generateContent`, {
          method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } })
        });
        if (!r.ok) continue;
        const part = (await r.json()).candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part) continue;
        const ext = /jpe?g/.test(part.inlineData.mimeType) ? 'jpg' : 'png';
        const file = path.join(dir, `Bild ${stamp()}.${ext}`);
        fs.writeFileSync(file, Buffer.from(part.inlineData.data, 'base64'));
        return { path: file, source: 'Gemini', mime: part.inlineData.mimeType, data: part.inlineData.data };
      } catch {}
    }
  }
  // free service: max. 1 picture every ~45 s per IP. If it says "Retry after Ns" we wait exactly that long.
  let r, models = ['flux', ''], tries = 0;
  while (models.length && tries++ < 5) {
    const model = models[0];
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 400))}?width=1024&height=1024&nologo=true${model ? '&model=' + model : ''}&seed=${Date.now() % 100000}`;
    r = await fetch(url, { signal: AbortSignal.timeout(120000) }).catch(() => null);
    if (r?.ok && /image/.test(r.headers.get('content-type') || '')) break;
    const body = r ? await r.text().catch(() => '') : '';
    const wait = +(body.match(/retry after (\d+)\s*s/i) || [])[1];
    if (r?.status === 402 && wait) { await new Promise(res => setTimeout(res, Math.min(wait + 2, 60) * 1000)); continue; }
    if (r?.status === 402 || r?.status === 401) { models.shift(); continue; } // model needs a paid key -> try the default one
    await new Promise(res => setTimeout(res, 4000));
  }
  if (!r?.ok) throw new Error('Der Gratis-Bilddienst ist gerade überlastet (' + (r?.status || 'offline') + '). Versuch es in einer Minute nochmal.');
  const buf = Buffer.from(await r.arrayBuffer());
  const file = path.join(dir, `Bild ${stamp()}.jpg`);
  fs.writeFileSync(file, buf);
  return { path: file, source: 'Pollinations (gratis)', mime: 'image/jpeg', data: buf.toString('base64') };
}

// ---------- YouTube ----------
const YT_RX = /(https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]{6,}[^\s]*)/i;
async function youtube(settings, url, question) {
  const key = settings.keys.gemini;
  if (!key) throw Object.assign(new Error('YouTube-Zusammenfassungen brauchen einen Gemini-Key.'), { code: 'NO_KEY' });
  const lang = { de: 'German', en: 'English', sq: 'Albanian', fr: 'French', es: 'Spanish', it: 'Italian', tr: 'Turkish' }[settings.language] || 'English';
  const ask = question || `Summarize this video in ${lang}: first one sentence what it is about, then the 5-8 most important points as bullets with timestamps (mm:ss), then a one-line verdict whether it is worth watching.`;
  let lastErr;
  for (const model of [settings.models.gemini, 'gemini-3.5-flash', 'gemini-flash-lite-latest']) {
    try {
      const body = { contents: [{ parts: [{ file_data: { file_uri: url } }, { text: ask }] }] };
      if (/^gemini-3/.test(model)) body.generationConfig = { thinkingConfig: { thinkingLevel: 'low' } };
      const r = await fetch(`${GEMINI}/${model}:generateContent`, { method: 'POST', signal: AbortSignal.timeout(120000), headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) { lastErr = new Error(j.error?.message || 'YouTube ' + r.status); continue; }
      return { text: (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim() };
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// ---------- PowerPoint ----------
async function presentation(settings, topic, { slides = 8, style = 'modern' } = {}) {
  const ask = () => providers.complete(settings, {
    system: buildSystemPrompt(settings, 'You create school presentations. Output strictly valid JSON, no code fence.'), json: true,
    messages: [{ role: 'user', text: `Make a ${slides}-slide school presentation about: ${topic}
In the user's language. Each content slide: a short title, 3-5 short bullet points (max 10 words each), and speaker notes (3-5 sentences the student can say).
Reply ONLY with JSON: {"title":"","subtitle":"","slides":[{"title":"","bullets":["",""],"notes":""}],"sources":["short source hint"]}` }]
  });
  let j;
  try { j = providers.parseJson(await ask()); } catch { j = providers.parseJson(await ask()); } // one retry
  const PptxGenJS = require('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const accent = (settings.accent || '#ff7a45').replace('#', '').toUpperCase();
  const dark = '16171A', light = 'F4F1EA';
  pptx.defineSlideMaster({ title: 'CONTENT', background: { color: light },
    objects: [{ rect: { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: accent } } }, { text: { text: j.title, options: { x: 0.5, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: '8A8580' } } }],
    slideNumber: { x: 12.4, y: 7.0, fontSize: 10, color: '8A8580' } });

  const t = pptx.addSlide();
  t.background = { color: dark };
  t.addShape(pptx.ShapeType.ellipse, { x: 9.2, y: -1.2, w: 5.5, h: 5.5, fill: { color: accent, transparency: 70 }, line: { color: accent, transparency: 100 } });
  t.addText(j.title, { x: 0.8, y: 2.4, w: 10.5, h: 1.6, fontSize: 44, bold: true, color: 'FFFFFF', fontFace: 'Segoe UI' });
  t.addText(j.subtitle || '', { x: 0.8, y: 4.0, w: 10.5, h: 0.8, fontSize: 20, color: accent, fontFace: 'Segoe UI' });
  t.addText(new Date().toLocaleDateString('de-CH'), { x: 0.8, y: 6.4, w: 4, h: 0.4, fontSize: 12, color: 'AAAAAA' });

  for (const s of j.slides || []) {
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    sl.addText(s.title, { x: 0.6, y: 0.4, w: 12, h: 0.9, fontSize: 30, bold: true, color: dark, fontFace: 'Segoe UI' });
    sl.addText((s.bullets || []).map(b => ({ text: b, options: { bullet: { code: '25CF' }, paraSpaceAfter: 10 } })),
      { x: 0.8, y: 1.6, w: 11.5, h: 5, fontSize: 22, color: '2B2B2B', fontFace: 'Segoe UI', valign: 'top' });
    if (s.notes) sl.addNotes(s.notes);
  }
  const end = pptx.addSlide();
  end.background = { color: dark };
  end.addText(settings.language === 'de' ? 'Danke! Fragen?' : 'Thank you! Questions?', { x: 0.8, y: 2.8, w: 11.5, h: 1.4, fontSize: 44, bold: true, color: 'FFFFFF', align: 'center' });
  if (j.sources?.length) end.addText('Quellen: ' + j.sources.join(' · '), { x: 0.8, y: 6.2, w: 11.5, h: 0.6, fontSize: 11, color: 'AAAAAA', align: 'center' });

  const dir = path.join(app.getPath('documents'), 'Kairo');
  fs.mkdirSync(dir, { recursive: true });
  let file = path.join(dir, safe(j.title) + '.pptx'), i = 2;
  while (fs.existsSync(file)) file = path.join(dir, `${safe(j.title)} (${i++}).pptx`);
  fs.writeFileSync(file, await pptx.write({ outputType: 'nodebuffer' }));
  return { path: file, title: j.title, slides: (j.slides || []).length + 2 };
}

function register({ ipcMain, wrap, store }) {
  ipcMain.handle('create:image', wrap(p => image(store.get(), p)));
  ipcMain.handle('create:youtube', wrap((u, q) => youtube(store.get(), u, q)));
  ipcMain.handle('create:pptx', wrap((topic, o) => presentation(store.get(), topic, o)));
  ipcMain.handle('create:show', (_e, p) => shell.showItemInFolder(p));
}

module.exports = { register, image, youtube, presentation, YT_RX };
