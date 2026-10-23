// Earth extras: country profiles (with borders), live webcams (YouTube live), world clock and ISS sightings.
const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');

const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'accept-language': 'de-CH,de;q=0.9,en;q=0.8' };
const cacheDir = () => { const d = path.join(app.getPath('userData'), 'cache'); fs.mkdirSync(d, { recursive: true }); return d; };
async function cached(name, url, maxAgeDays = 30) {
  const f = path.join(cacheDir(), name);
  try { if (Date.now() - fs.statSync(f).mtimeMs < maxAgeDays * 864e5) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40000) });
  if (!r.ok) { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); throw new Error('HTTP ' + r.status); }
  const j = await r.json();
  fs.writeFileSync(f, JSON.stringify(j));
  return j;
}
const getJson = async url => { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };

// ---------- countries ----------
let countries = null;
async function allCountries() { return (countries ||= await cached('countries.json', 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json', 60)); }
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
async function findCountry(q) {
  const list = await allCountries(), n = norm(q);
  if (!n) return null;
  const names = c => [c.name.common, c.name.official, c.cca2, c.cca3, ...(c.altSpellings || []), ...Object.values(c.translations || {}).flatMap(t => [t.common, t.official])].map(norm);
  return list.find(c => names(c).includes(n)) || list.find(c => names(c).some(x => x.length > 3 && (x.startsWith(n) || n.startsWith(x)))) || null;
}
async function borders() { return cached('borders.geojson', 'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson', 120); }

async function country(q, lang = 'de') {
  const c = await findCountry(q);
  if (!c) throw new Error('Land nicht gefunden: ' + q);
  const L = lang === 'de' ? 'deu' : lang === 'sq' ? null : null;
  const name = (L && c.translations[L]?.common) || c.name.common;
  const out = {
    cca2: c.cca2, cca3: c.cca3, name, official: (L && c.translations[L]?.official) || c.name.official, capital: c.capital?.[0] || '',
    region: c.subregion || c.region, area: c.area, landlocked: c.landlocked, latlng: c.latlng, tld: c.tld?.[0] || '',
    phone: c.idd?.root ? c.idd.root + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : '') : '',
    languages: Object.entries(c.languages || {}).map(([code, n]) => ({ code, name: n })), currencies: Object.entries(c.currencies || {}).map(([code, v]) => ({ code, name: v.name, symbol: v.symbol })),
    flag: `https://flagcdn.com/w640/${c.cca2.toLowerCase()}.png`, flagSvg: `https://flagcdn.com/${c.cca2.toLowerCase()}.svg`,
    neighbours: []
  };
  const list = await allCountries();
  out.neighbours = (c.borders || []).map(b => list.find(x => x.cca3 === b)).filter(Boolean).map(x => ({ cca3: x.cca3, cca2: x.cca2, name: (L && x.translations[L]?.common) || x.name.common }));
  const jobs = [
    getJson(`https://api.worldbank.org/v2/country/${c.cca3}/indicator/SP.POP.TOTL?format=json&mrnv=1`).then(j => { out.population = j?.[1]?.[0]?.value || null; out.popYear = j?.[1]?.[0]?.date; }).catch(() => {}),
    getJson(`https://api.worldbank.org/v2/country/${c.cca3}/indicator/NY.GDP.PCAP.CD?format=json&mrnv=1`).then(j => { out.gdpPc = j?.[1]?.[0]?.value || null; }).catch(() => {}),
    getJson(`https://${lang === 'de' ? 'de' : 'en'}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent((lang === 'de' && c.translations.deu?.common) || c.name.common)}`).then(j => { out.summary = j.extract; out.image = j.originalimage?.source || j.thumbnail?.source || null; }).catch(() => {}),
    out.capital ? getJson(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(out.capital)}&language=${lang}`).then(j => { const r = j.results?.[0]; if (r) { out.timezone = r.timezone; out.capitalLatLng = [r.latitude, r.longitude]; } }).catch(() => {}) : null
  ];
  await Promise.all(jobs);
  return out;
}

// ---------- live webcams (YouTube live streams) ----------
function walk(o, fn) { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(x => walk(x, fn)); fn(o); for (const v of Object.values(o)) walk(v, fn); }
async function webcams(place) {
  const q = `${place} live webcam`;
  const r = await fetch('https://www.youtube.com/results?sp=EgJAAQ%253D%253D&search_query=' + encodeURIComponent(q), { headers: UA, signal: AbortSignal.timeout(15000) });
  const html = await r.text();
  const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  const out = [], seen = new Set();
  if (m) {
    let data; try { data = JSON.parse(m[1]); } catch { data = null; }
    walk(data, o => {
      const v = o.videoRenderer;
      if (!v?.videoId || seen.has(v.videoId)) return;
      const live = JSON.stringify(v.badges || []).includes('LIVE') || JSON.stringify(v.thumbnailOverlays || []).includes('LIVE');
      if (!live) return;
      seen.add(v.videoId);
      out.push({ id: v.videoId, title: v.title?.runs?.map(x => x.text).join('') || '', channel: v.ownerText?.runs?.[0]?.text || '', viewers: v.viewCountText?.runs?.map(x => x.text).join('') || v.viewCountText?.simpleText || '' });
    });
  }
  return out.slice(0, 8);
}

// ---------- city lookup for the world clock ----------
async function city(name, lang = 'de') {
  const j = await getJson(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(name)}&language=${lang}`);
  const r = j.results?.[0];
  if (!r) throw new Error('Ort nicht gefunden: ' + name);
  return { name: r.name, country: r.country || '', cc: r.country_code || '', lat: r.latitude, lng: r.longitude, tz: r.timezone };
}

// ---------- ISS sightings ----------
let tleCache = { at: 0, lines: null };
async function tle() {
  if (tleCache.lines && Date.now() - tleCache.at < 6 * 3600e3) return tleCache.lines;
  const f = path.join(cacheDir(), 'iss.tle');
  try {
    const r = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE', { headers: UA, signal: AbortSignal.timeout(15000) });
    const txt = await r.text();
    const lines = txt.trim().split(/\r?\n/).map(s => s.trim());
    if (lines.length >= 3 && lines[1].startsWith('1 ')) { fs.writeFileSync(f, txt); tleCache = { at: Date.now(), lines }; return lines; }
  } catch {}
  const lines = fs.readFileSync(f, 'utf8').trim().split(/\r?\n/).map(s => s.trim());
  tleCache = { at: Date.now(), lines };
  return lines;
}
function sunEci(date) {
  // low precision solar position (good to ~0.01°), unit vector in ECI
  const jd = date.getTime() / 864e5 + 2440587.5, n = jd - 2451545.0, rad = Math.PI / 180;
  const L = (280.46 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, eps = (23.439 - 0.0000004 * n) * rad;
  return { x: Math.cos(lambda), y: Math.cos(eps) * Math.sin(lambda), z: Math.sin(eps) * Math.sin(lambda) };
}
const COMPASS = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const dir = az => COMPASS[Math.round(((az % 360) + 360) % 360 / 22.5) % 16];
async function issPasses(lat, lng, days = 5) {
  const sat = require('satellite.js');
  const [, l1, l2] = await tle();
  const rec = sat.twoline2satrec(l1, l2);
  const obs = { latitude: sat.degreesToRadians(lat), longitude: sat.degreesToRadians(lng), height: 0.4 };
  const passes = [];
  let cur = null;
  const end = Date.now() + days * 864e5;
  for (let t = Date.now(); t < end; t += 20000) {
    const d = new Date(t);
    const pv = sat.propagate(rec, d);
    if (!pv.position) continue;
    const gmst = sat.gstime(d);
    const look = sat.ecfToLookAngles(obs, sat.eciToEcf(pv.position, gmst));
    const el = look.elevation * 180 / Math.PI, az = look.azimuth * 180 / Math.PI;
    if (el > 10) {
      // is the station in sunlight while the observer is in darkness?
      const s = sunEci(d), p = pv.position, proj = p.x * s.x + p.y * s.y + p.z * s.z;
      const perp = Math.hypot(p.x - proj * s.x, p.y - proj * s.y, p.z - proj * s.z);
      const lit = proj > 0 || perp > 6371;
      const oe = sat.ecfToEci(sat.geodeticToEcf(obs), gmst), on = Math.hypot(oe.x, oe.y, oe.z);
      const sunEl = Math.asin((oe.x * s.x + oe.y * s.y + oe.z * s.z) / on) * 180 / Math.PI;
      const visible = lit && sunEl < -6;
      if (!cur) cur = { start: t, startAz: az, maxEl: el, maxAt: t, maxAz: az, visibleSteps: 0, steps: 0, path: [] };
      cur.steps++; if (visible) cur.visibleSteps++;
      if (el > cur.maxEl) { cur.maxEl = el; cur.maxAt = t; cur.maxAz = az; }
      cur.path.push([Math.round(az), Math.round(el)]);
      cur.end = t; cur.endAz = az;
    } else if (cur) {
      passes.push(cur); cur = null;
      if (passes.length > 40) break;
    }
  }
  return passes.map(p => ({
    start: p.start, end: p.end, maxAt: p.maxAt, maxEl: Math.round(p.maxEl), minutes: Math.max(1, Math.round((p.end - p.start) / 60000)),
    from: dir(p.startAz), to: dir(p.endAz), startAz: Math.round(p.startAz), endAz: Math.round(p.endAz), path: p.path.filter((_, i) => i % 2 === 0),
    visible: p.visibleSteps >= 3, bright: p.maxEl > 50 ? 3 : p.maxEl > 30 ? 2 : 1
  }));
}

// moon phase 0..1 (0 new, .5 full)
function moon(date = new Date()) {
  const lp = 2551443, newMoon = Date.UTC(2000, 0, 6, 18, 14) / 1000;
  const phase = (((date.getTime() / 1000 - newMoon) % lp) + lp) % lp / lp;
  const names = ['Neumond', 'zunehmende Sichel', 'erstes Viertel', 'zunehmender Mond', 'Vollmond', 'abnehmender Mond', 'letztes Viertel', 'abnehmende Sichel'];
  return { phase, illum: Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100), name: names[Math.round(phase * 8) % 8] };
}

function register({ store }) {
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  ipcMain.handle('earth2:country', wrap(async q => ({ country: await country(q, store.get().language) })));
  ipcMain.handle('earth2:borders', wrap(async () => ({ geo: await borders() })));
  ipcMain.handle('earth2:webcams', wrap(async place => ({ list: await webcams(place) })));
  ipcMain.handle('earth2:city', wrap(async name => ({ city: await city(name, store.get().language) })));
  ipcMain.handle('earth2:iss', wrap(async (lat, lng) => {
    let where = lat != null ? { lat, lng, name: '' } : null;
    if (!where) { const s = store.get(); if (!s.city) throw Object.assign(new Error('NO_CITY'), { code: 'NO_CITY' }); const c = await city(s.city, s.language); where = { lat: c.lat, lng: c.lng, name: c.name }; }
    return { where, passes: await issPasses(where.lat, where.lng), moon: moon() };
  }));
}

module.exports = { register, country, findCountry, webcams, city, issPasses, moon };
