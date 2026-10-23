// Smart Home: find, pair and control lights.
// Brands: Philips Hue (bridge), WiZ, Govee (LAN API), Yeelight (LAN control), LIFX (cloud token),
// Home Assistant (covers Tuya / Smart Life / IKEA / almost everything), plus a Demo lamp.
const { app } = require('electron');
const dgram = require('dgram');
const net = require('net');
const fs = require('fs');
const path = require('path');

const file = () => path.join(app.getPath('userData'), 'smarthome.json');
let data = null; // { devices: [], accounts: { hue: [{ip, user}], lifx: token, ha: {url, token} } }

function load() {
  if (data) return data;
  try { data = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch { data = { devices: [], accounts: {} }; }
  data.devices ||= []; data.accounts ||= {};
  return data;
}
function save() { fs.writeFileSync(file(), JSON.stringify(data, null, 2)); }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- colours ----------
const COLORS = {
  rot: '#ff2020', red: '#ff2020', blau: '#2050ff', blue: '#2050ff', grün: '#20e040', gruen: '#20e040', green: '#20e040',
  gelb: '#ffd000', yellow: '#ffd000', orange: '#ff7a10', lila: '#9b30ff', violett: '#9b30ff', purple: '#9b30ff',
  pink: '#ff40b0', rosa: '#ff80c0', türkis: '#20e0d0', tuerkis: '#20e0d0', cyan: '#20e0ff', turquoise: '#20e0d0',
  weiss: 'kelvin:4000', weiß: 'kelvin:4000', white: 'kelvin:4000', warmweiss: 'kelvin:2700', warm: 'kelvin:2700',
  kaltweiss: 'kelvin:6000', cold: 'kelvin:6000', tageslicht: 'kelvin:5500', magenta: '#ff20ff', kuqe: '#ff2020', blu: '#2050ff', jeshile: '#20e040'
};
function parseColor(c) {
  if (!c) return null;
  if (typeof c === 'object' && c.r != null) return { rgb: c };
  let s = String(c).trim().toLowerCase();
  if (COLORS[s]) s = COLORS[s];
  const k = s.match(/kelvin:(\d+)|^(\d{4})k?$/);
  if (k) return { kelvin: +(k[1] || k[2]) };
  const m = s.match(/^#?([0-9a-f]{6})$/);
  if (m) { const n = parseInt(m[1], 16); return { rgb: { r: n >> 16, g: (n >> 8) & 255, b: n & 255 } }; }
  return null;
}
const hex = ({ r, g, b }) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
function rgbToXy({ r, g, b }) {
  const f = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; };
  const R = f(r), G = f(g), B = f(b);
  const X = R * 0.664511 + G * 0.154324 + B * 0.162028, Y = R * 0.283881 + G * 0.668433 + B * 0.047685, Z = R * 0.000088 + G * 0.07231 + B * 0.986039;
  const s = X + Y + Z || 1;
  return [+(X / s).toFixed(4), +(Y / s).toFixed(4)];
}

// ---------- scenes ----------
const SCENES = {
  gaming: { on: true, brightness: 80, colors: ['#7b2fff', '#2050ff'] },
  lernen: { on: true, brightness: 100, color: 'kelvin:5500' },
  study: { on: true, brightness: 100, color: 'kelvin:5500' },
  film: { on: true, brightness: 15, color: 'kelvin:2400' },
  movie: { on: true, brightness: 15, color: 'kelvin:2400' },
  chill: { on: true, brightness: 45, color: '#ff8a30' },
  party: { on: true, brightness: 100, colors: ['#ff2080', '#20e0ff', '#ffd000', '#9b30ff'] },
  schlafen: { on: true, brightness: 5, color: 'kelvin:2200' },
  sleep: { on: true, brightness: 5, color: 'kelvin:2200' },
  morgen: { on: true, brightness: 70, color: 'kelvin:4500' },
  aus: { on: false }, off: { on: false }
};

// ---------- UDP / TCP helpers ----------
function udpRequest(ip, port, payload, { timeout = 1500, expectReply = true } = {}) {
  return new Promise(resolve => {
    const s = dgram.createSocket('udp4');
    let done = false;
    const end = v => { if (done) return; done = true; try { s.close(); } catch {} resolve(v); };
    s.on('message', m => end(String(m)));
    s.on('error', () => end(null));
    s.send(Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)), port, ip, err => { if (err) end(null); else if (!expectReply) end('sent'); });
    setTimeout(() => end(null), timeout);
  });
}
function udpScan(port, payload, target, { listenPort = 0, ms = 3000, filter = () => true } = {}) {
  return new Promise(resolve => {
    const out = [];
    const s = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    s.on('message', (m, r) => { const t = String(m); if (filter(t)) out.push({ ip: r.address, text: t }); });
    s.on('error', () => {});
    s.bind(listenPort, () => {
      try { s.setBroadcast(true); } catch {}
      s.send(Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)), port, target, () => {});
    });
    setTimeout(() => { try { s.close(); } catch {} resolve(out); }, ms);
  });
}
function tcpJson(ip, port, obj) {
  return new Promise((resolve, reject) => {
    const c = net.createConnection({ host: ip, port, timeout: 2500 }, () => { c.write(JSON.stringify(obj) + '\r\n'); });
    let buf = '';
    c.on('data', d => { buf += d; if (buf.includes('\n')) { c.end(); resolve(buf); } });
    c.on('timeout', () => { c.destroy(); reject(new Error('timeout')); });
    c.on('error', reject);
    setTimeout(() => { c.destroy(); resolve(buf); }, 3000);
  });
}

// ---------- discovery ----------
async function discover() {
  const found = [];
  const add = d => { if (!found.some(f => f.brand === d.brand && f.ip === d.ip)) found.push(d); };
  const known = new Set(load().devices.map(d => d.brand + d.conn?.ip));

  const tasks = [
    // WiZ: getPilot only reads the lamp state
    udpScan(38899, { method: 'getPilot', params: {} }, '255.255.255.255', { filter: t => t.includes('"result"') })
      .then(rs => rs.forEach(r => { let mac = ''; try { mac = JSON.parse(r.text).result.mac; } catch {} add({ brand: 'wiz', ip: r.ip, name: 'WiZ ' + (mac ? mac.slice(-4) : r.ip.split('.').pop()), mac }); })),
    // Yeelight
    udpScan(1982, 'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1982\r\nMAN: "ssdp:discover"\r\nST: wifi_bulb\r\n', '239.255.255.250', { filter: t => /yeelight/i.test(t) })
      .then(rs => rs.forEach(r => { const ip = (r.text.match(/yeelight:\/\/([\d.]+)/) || [])[1] || r.ip; add({ brand: 'yeelight', ip, name: 'Yeelight ' + ((r.text.match(/model: ?(\S+)/i) || [])[1] || '') }); })),
    // Govee LAN API (must be switched on in the Govee app)
    udpScan(4001, { msg: { cmd: 'scan', data: { account_topic: 'reserve' } } }, '239.255.255.250', { listenPort: 4002 })
      .then(rs => rs.forEach(r => { let d = {}; try { d = JSON.parse(r.text).msg.data; } catch {} add({ brand: 'govee', ip: d.ip || r.ip, name: 'Govee ' + (d.sku || '') }); })),
    // Philips Hue bridges (cloud list, then check which are really at home)
    fetch('https://discovery.meethue.com', { signal: AbortSignal.timeout(5000) }).then(r => r.json()).then(list => Promise.all(list.map(b =>
      fetch(`http://${b.internalipaddress}/api/config`, { signal: AbortSignal.timeout(2500) }).then(r => r.json())
        .then(c => add({ brand: 'hue-bridge', ip: b.internalipaddress, name: c.name || 'Hue Bridge' })).catch(() => {})
    ))).catch(() => {})
  ];
  await Promise.all(tasks);
  return found.map(f => ({ ...f, added: known.has(f.brand + f.ip) }));
}

// ---------- pairing / adding ----------
async function pairHue(ip) {
  const r = await (await fetch(`http://${ip}/api`, { method: 'POST', body: JSON.stringify({ devicetype: 'kairo#desktop' }), signal: AbortSignal.timeout(5000) })).json();
  if (r[0]?.error) {
    if (r[0].error.type === 101) throw Object.assign(new Error('Drück zuerst den runden Knopf oben auf der Hue Bridge, dann innerhalb von 30 Sekunden nochmal "Koppeln".'), { code: 'PRESS_BUTTON' });
    throw new Error(r[0].error.description);
  }
  const user = r[0].success.username;
  const d = load();
  d.accounts.hue = (d.accounts.hue || []).filter(b => b.ip !== ip).concat([{ ip, user }]);
  const lights = await (await fetch(`http://${ip}/api/${user}/lights`)).json();
  let n = 0;
  for (const [id, l] of Object.entries(lights)) {
    if (d.devices.some(x => x.brand === 'hue' && x.conn.ip === ip && x.conn.id === id)) continue;
    d.devices.push({ id: uid(), brand: 'hue', name: l.name, room: '', conn: { ip, user, id }, caps: { color: !!l.state?.xy, kelvin: l.state?.ct != null }, state: { on: l.state?.on, brightness: Math.round((l.state?.bri || 254) / 2.54) } });
    n++;
  }
  save();
  return { added: n };
}

function addDevice({ brand, ip, name, room, mac }) {
  const d = load();
  const dev = { id: uid(), brand, name: name || brand, room: room || '', conn: { ip, mac }, caps: { color: true, kelvin: true }, state: { on: false, brightness: 80, color: '#ffffff' } };
  d.devices.push(dev);
  save();
  return dev;
}

function addDemo() {
  const d = load();
  const names = ['Schreibtisch', 'Deckenlicht', 'LED-Streifen'];
  const name = names.find(n => !d.devices.some(x => x.name === n)) || 'Demo ' + (d.devices.length + 1);
  const dev = { id: uid(), brand: 'demo', name, room: 'Zimmer', conn: {}, caps: { color: true, kelvin: true }, state: { on: true, brightness: 70, color: '#ff7a45' } };
  d.devices.push(dev); save();
  return dev;
}

async function connectLifx(token) {
  const list = await (await fetch('https://api.lifx.com/v1/lights/all', { headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(8000) })).json();
  if (!Array.isArray(list)) throw new Error(list.error || 'LIFX token rejected');
  const d = load(); d.accounts.lifx = token;
  let n = 0;
  for (const l of list) {
    if (d.devices.some(x => x.brand === 'lifx' && x.conn.id === l.id)) continue;
    d.devices.push({ id: uid(), brand: 'lifx', name: l.label, room: l.group?.name || '', conn: { id: l.id }, caps: { color: true, kelvin: true }, state: { on: l.power === 'on', brightness: Math.round(l.brightness * 100) } });
    n++;
  }
  save(); return { added: n };
}

async function connectHomeAssistant(url, token) {
  const base = url.replace(/\/$/, '');
  const res = await fetch(base + '/api/states', { headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('Home Assistant: ' + res.status + ' (URL oder Token falsch?)');
  const states = await res.json();
  const d = load(); d.accounts.ha = { url: base, token };
  let n = 0;
  for (const s of states.filter(s => s.entity_id.startsWith('light.') || s.entity_id.startsWith('switch.'))) {
    if (d.devices.some(x => x.brand === 'ha' && x.conn.entity === s.entity_id)) continue;
    const modes = s.attributes.supported_color_modes || [];
    d.devices.push({ id: uid(), brand: 'ha', name: s.attributes.friendly_name || s.entity_id, room: '', conn: { entity: s.entity_id }, caps: { color: modes.some(m => /rgb|hs|xy/.test(m)), kelvin: modes.includes('color_temp') }, state: { on: s.state === 'on', brightness: Math.round((s.attributes.brightness || 255) / 2.55) } });
    n++;
  }
  save(); return { added: n };
}

function update(id, patch) { const d = load(); const dev = d.devices.find(x => x.id === id); if (dev) { Object.assign(dev, patch); save(); } return dev; }
function remove(id) { const d = load(); d.devices = d.devices.filter(x => x.id !== id); save(); }

// ---------- control ----------
// cmd: { on?, brightness? 1-100, color? name/#hex/kelvin:NNNN }
async function sendToDevice(dev, cmd) {
  const c = cmd.color ? parseColor(cmd.color) : null;
  const b = cmd.brightness != null ? Math.max(1, Math.min(100, Math.round(cmd.brightness))) : null;
  const on = cmd.on ?? (b != null || c ? true : undefined);
  switch (dev.brand) {
    case 'demo': break;
    case 'hue': {
      const body = {};
      if (on != null) body.on = on;
      if (b != null) body.bri = Math.round(b * 2.54);
      if (c?.rgb) body.xy = rgbToXy(c.rgb);
      if (c?.kelvin) body.ct = Math.round(1e6 / c.kelvin);
      const r = await fetch(`http://${dev.conn.ip}/api/${dev.conn.user}/lights/${dev.conn.id}/state`, { method: 'PUT', body: JSON.stringify(body), signal: AbortSignal.timeout(4000) });
      const j = await r.json(); if (j[0]?.error) throw new Error(j[0].error.description);
      break;
    }
    case 'wiz': {
      const params = {};
      if (on != null) params.state = on;
      if (b != null) params.dimming = Math.max(10, b);
      if (c?.rgb) Object.assign(params, c.rgb);
      if (c?.kelvin) params.temp = Math.max(2200, Math.min(6500, c.kelvin));
      const r = await udpRequest(dev.conn.ip, 38899, { method: 'setPilot', params });
      if (!r) throw new Error('WiZ lamp did not answer');
      break;
    }
    case 'yeelight': {
      const send = (method, params) => tcpJson(dev.conn.ip, 55443, { id: 1, method, params });
      if (on === false) { await send('set_power', ['off', 'smooth', 300]); break; }
      if (on) await send('set_power', ['on', 'smooth', 300]);
      if (b != null) await send('set_bright', [b, 'smooth', 300]);
      if (c?.rgb) await send('set_rgb', [(c.rgb.r << 16) + (c.rgb.g << 8) + c.rgb.b, 'smooth', 300]);
      if (c?.kelvin) await send('set_ct_abx', [Math.max(1700, Math.min(6500, c.kelvin)), 'smooth', 300]);
      break;
    }
    case 'govee': {
      const send = m => udpRequest(dev.conn.ip, 4003, { msg: m }, { expectReply: false });
      if (on != null) await send({ cmd: 'turn', data: { value: on ? 1 : 0 } });
      if (b != null) await send({ cmd: 'brightness', data: { value: b } });
      if (c) await send({ cmd: 'colorwc', data: { color: c.rgb || { r: 0, g: 0, b: 0 }, colorTemInKelvin: c.kelvin || 0 } });
      break;
    }
    case 'lifx': {
      const body = {};
      if (on != null) body.power = on ? 'on' : 'off';
      if (b != null) body.brightness = b / 100;
      if (c?.rgb) body.color = hex(c.rgb); if (c?.kelvin) body.color = 'kelvin:' + c.kelvin;
      const r = await fetch(`https://api.lifx.com/v1/lights/id:${dev.conn.id}/state`, { method: 'PUT', headers: { authorization: 'Bearer ' + load().accounts.lifx, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('LIFX ' + r.status);
      break;
    }
    case 'ha': {
      const ha = load().accounts.ha;
      const domain = dev.conn.entity.split('.')[0];
      const svc = on === false ? 'turn_off' : 'turn_on';
      const body = { entity_id: dev.conn.entity };
      if (domain === 'light' && on !== false) {
        if (b != null) body.brightness_pct = b;
        if (c?.rgb) body.rgb_color = [c.rgb.r, c.rgb.g, c.rgb.b];
        if (c?.kelvin) body.color_temp_kelvin = c.kelvin;
      }
      const r = await fetch(`${ha.url}/api/services/${domain}/${svc}`, { method: 'POST', headers: { authorization: 'Bearer ' + ha.token, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('Home Assistant ' + r.status);
      break;
    }
  }
  // remember the state for the UI
  const st = dev.state ||= {};
  if (on != null) st.on = on;
  if (b != null) st.brightness = b;
  if (c?.rgb) st.color = hex(c.rgb);
  if (c?.kelvin) st.color = 'kelvin:' + c.kelvin;
}

// target: "all" | device id | name / room words (e.g. "schreibtisch", "zimmer")
function pick(target) {
  const devs = load().devices;
  const t = String(target || 'all').toLowerCase().trim();
  if (!t || /^(all|alle|alles|überall|everything|licht|lichter|lampen|lights)$/.test(t)) return devs;
  const exact = devs.filter(d => d.id === t);
  if (exact.length) return exact;
  return devs.filter(d => d.name.toLowerCase().includes(t) || t.includes(d.name.toLowerCase()) || (d.room && (d.room.toLowerCase().includes(t) || t.includes(d.room.toLowerCase()))));
}

async function control(target, cmd = {}) {
  let devs = pick(target);
  if (!devs.length) throw new Error(load().devices.length ? 'Keine Lampe passt zu "' + target + '"' : 'Noch keine Lampen eingerichtet');
  const scene = cmd.scene && SCENES[String(cmd.scene).toLowerCase()];
  const results = await Promise.all(devs.map(async (dev, i) => {
    let c = { ...cmd };
    if (scene) { c = { on: scene.on, brightness: scene.brightness, color: scene.colors ? scene.colors[i % scene.colors.length] : scene.color }; }
    if (c.on === 'toggle') c.on = !dev.state?.on;
    try { await sendToDevice(dev, c); return { name: dev.name, ok: true }; }
    catch (e) { return { name: dev.name, ok: false, error: e.message }; }
  }));
  save();
  return { results, devices: load().devices };
}

function list() { return load().devices; }
function promptText() {
  const devs = load().devices;
  if (!devs.length) return '';
  return 'Smart lights in the home (control them with the light action/function): ' + devs.map(d => `"${d.name}"${d.room ? ' in ' + d.room : ''} (${d.state?.on ? 'on' : 'off'})`).join(', ') + '. Scenes: gaming, lernen, film, chill, party, schlafen, morgen, aus.';
}

module.exports = { discover, pairHue, addDevice, addDemo, connectLifx, connectHomeAssistant, update, remove, control, list, promptText, parseColor, SCENES };
