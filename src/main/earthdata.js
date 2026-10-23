// Live data for the Earth layers. All free services without a key:
// OpenSky (planes), adsbdb (flight routes), wheretheiss.at (ISS), USGS (earthquakes).
const { ipcMain } = require('electron');

const UA = { 'user-agent': 'Kairo/0.6 (desktop assistant)' };
const getJson = async (url, ms = 15000) => {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
  return { data: await r.json(), headers: r.headers };
};

// ---------- planes ----------
let flightBlockedUntil = 0;
async function flights({ lamin, lomin, lamax, lomax }) {
  if (Date.now() < flightBlockedUntil) throw Object.assign(new Error('LIMIT'), { code: 'LIMIT' });
  try {
    const q = `lamin=${lamin.toFixed(2)}&lomin=${lomin.toFixed(2)}&lamax=${lamax.toFixed(2)}&lomax=${lomax.toFixed(2)}`;
    const { data, headers } = await getJson('https://opensky-network.org/api/states/all?' + q, 20000);
    const planes = (data.states || [])
      .filter(s => s[5] != null && s[6] != null && !s[8]) // has a position, in the air
      .map(s => ({
        id: s[0], call: (s[1] || '').trim(), country: s[2], lng: s[5], lat: s[6],
        alt: Math.round(s[7] ?? s[13] ?? 0), speed: Math.round((s[9] || 0) * 3.6), heading: s[10] || 0, climb: s[11] || 0
      }))
      .slice(0, 400);
    return { planes, time: data.time, left: +headers.get('x-rate-limit-remaining') || null };
  } catch (e) {
    if (e.status === 429) { flightBlockedUntil = Date.now() + 30 * 60e3; throw Object.assign(new Error('LIMIT'), { code: 'LIMIT' }); }
    throw e;
  }
}

const routeCache = new Map();
async function route(callsign) {
  if (!callsign) return null;
  if (routeCache.has(callsign)) return routeCache.get(callsign);
  let out = null;
  try {
    const { data } = await getJson('https://api.adsbdb.com/v0/callsign/' + encodeURIComponent(callsign));
    const fr = data.response?.flightroute;
    if (fr) {
      const ap = a => a && { code: a.iata_code || a.icao_code, name: a.name, city: a.municipality, country: a.country_name, lat: a.latitude, lng: a.longitude };
      out = { airline: fr.airline?.name || '', flight: fr.callsign_iata || fr.callsign, from: ap(fr.origin), to: ap(fr.destination) };
    }
  } catch {}
  routeCache.set(callsign, out);
  return out;
}

// ---------- ISS ----------
async function iss() {
  const { data } = await getJson('https://api.wheretheiss.at/v1/satellites/25544');
  return { lat: data.latitude, lng: data.longitude, alt: Math.round(data.altitude), speed: Math.round(data.velocity), visibility: data.visibility };
}
async function issPath() {
  // positions from 45 min ago to 50 min ahead (one orbit is ~92 min), 10 per request
  const now = Math.floor(Date.now() / 1000), ts = [];
  for (let m = -45; m <= 50; m += 2.5) ts.push(now + Math.round(m * 60));
  const chunks = [];
  for (let i = 0; i < ts.length; i += 10) chunks.push(ts.slice(i, i + 10));
  const parts = await Promise.all(chunks.map(c => getJson('https://api.wheretheiss.at/v1/satellites/25544/positions?units=kilometers&timestamps=' + c.join(',')).then(r => r.data).catch(() => [])));
  return parts.flat().map(p => ({ lat: p.latitude, lng: p.longitude, t: p.timestamp })).sort((a, b) => a.t - b.t);
}

// ---------- earthquakes ----------
async function quakes() {
  const { data } = await getJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
  return data.features.map(f => ({
    id: f.id, mag: Math.round(f.properties.mag * 10) / 10, place: f.properties.place || '', time: f.properties.time,
    tsunami: !!f.properties.tsunami, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], depth: Math.round(f.geometry.coordinates[2])
  })).filter(q => q.mag != null);
}

function register() {
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { code: e.code || 'ERR', message: e.message } }; } };
  ipcMain.handle('earth:flights', wrap(flights));
  ipcMain.handle('earth:route', wrap(async c => ({ route: await route(c) })));
  ipcMain.handle('earth:iss', wrap(async () => ({ now: await iss() })));
  ipcMain.handle('earth:issPath', wrap(async () => ({ path: await issPath() })));
  ipcMain.handle('earth:quakes', wrap(async () => ({ list: await quakes() })));
}

module.exports = { register, flights, route, iss, issPath, quakes };
