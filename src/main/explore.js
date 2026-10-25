// Documentary and "what if" scripts (text, places, pictures from Wikimedia Commons) and narration.
const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let store = null;
const LANG = { de: 'German', en: 'English', sq: 'Albanian' };
const P = () => require('./providers');
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const ud = n => path.join(app.getPath('userData'), n);
const UA = { 'user-agent': 'Kairo/1.0 (desktop assistant)' };

// ---------- documentary & "what if" ----------
async function wikiImages(query, n = 1) {
  try {
    const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=${n * 3}&gsrsearch=${encodeURIComponent(query + ' filetype:bitmap')}&prop=imageinfo&iiprop=url|size&iiurlwidth=1600`;
    const j = await (await fetch(u, { headers: UA, signal: AbortSignal.timeout(12000) })).json();
    return Object.values(j.query?.pages || {}).map(p => p.imageinfo?.[0]).filter(x => x && x.thumbwidth >= 800 && x.thumbheight >= 450).map(x => x.thumburl).slice(0, n);
  } catch { return []; }
}
async function story(kind, topic) {
  const s = store.get(), lang = LANG[s.language] || 'German';
  const sys = kind === 'whatif'
    ? `You create a short, exciting "What if…?" science video for a teenager, in ${lang}. Be scientifically plausible, surprising and fun.`
    : `You create a short, exciting TV-style documentary for a teenager, in ${lang}. Facts must be correct.`;
  const text = await P().complete(s, {
    system: `${sys}
Return ONLY JSON: {"title":"catchy title","subtitle":"short tagline","scenes":[{"narration":"2-3 spoken sentences","caption":"big short headline (max 6 words)","place":"real place for a map flight, or empty","zoom":"country|city|close","stat":"optional big number/fact like '1912' or '-2 °C' or empty","image":"English search words for a real photo (documentary) or a vivid image description (what if)"}]}
6 to 8 scenes. Use "place" for scenes where showing the real location on a 3D Earth makes sense (at most 3 scenes). The last scene is a strong ending.`,
    messages: [{ role: 'user', text: topic }]
  });
  const j = P().parseJson(text);
  if (!j?.scenes?.length) throw new Error('Konnte keine Doku planen – versuch es nochmal');
  // pictures: real photos from Wikimedia Commons; for "what if" too, as a start (generated pictures are slow)
  await Promise.all(j.scenes.map(async sc => { if (!sc.place || kind === 'whatif') sc.img = (await wikiImages(sc.image || sc.caption || topic, 1))[0] || null; }));
  return { kind, topic, ...j };
}
async function narrate(text) {
  const s = store.get();
  const r = await P().geminiSpeak({ ...s, voice: { ...s.voice, role: 'narrator' } }, text);
  return r;
}

function register(ctx) {
  ({ store } = ctx);
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  ipcMain.handle('ex:story', wrap(async (kind, topic) => ({ story: await story(kind, topic) })));
  ipcMain.handle('ex:narrate', wrap(async text => narrate(text)));
}

module.exports = { register, story };
