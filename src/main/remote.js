// Phone remote: a small web page served on your home network.
// Scan the QR code with your phone to chat with Kairo and see your screen.
// This module only serves the page; PC actions go through pc.js like everywhere else.
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');

let server = null;

const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      if (i.family === 'IPv4' && !i.internal && PRIVATE.test(i.address)) return { ip: i.address, mac: i.mac };
    }
  }
  return { ip: '127.0.0.1', mac: '' };
}

function fromHomeNetwork(addr) {
  const a = (addr || '').replace(/^::ffff:/, '');
  return a === '127.0.0.1' || a === '::1' || PRIVATE.test(a);
}

function sameCode(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
  });
}

// Buttons on the phone page -> names understood by pc.js
const PHONE_BUTTONS = { lock: 'lock', sleep: 'sleep', mute: 'mute', volup: 'volume_up', voldown: 'volume_down', playpause: 'play_pause' };

/**
 * hooks: { chat(text, withScreen), screenshot(), pc(action), notify(event) }
 */
async function start({ port, token }, hooks) {
  await stop();
  const page = fs.readFileSync(path.join(__dirname, '..', 'mobile', 'index.html'));

  server = http.createServer(async (req, res) => {
    if (!fromHomeNetwork(req.socket.remoteAddress)) { res.writeHead(403); return res.end(); }
    const url = new URL(req.url, 'http://x');
    const reply = (code, body, type = 'application/json') => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(type === 'application/json' ? JSON.stringify(body) : body);
    };

    if (url.pathname === '/' || url.pathname === '/index.html') return reply(200, page, 'text/html; charset=utf-8');
    if (url.pathname === '/manifest.json') {
      return reply(200, { name: 'Kairo Remote', short_name: 'Kairo', display: 'standalone', background_color: '#111214', theme_color: '#111214', start_url: '/' + url.search });
    }

    const code = req.headers['x-kairo-token'] || url.searchParams.get('t') || '';
    if (!sameCode(code, token)) return reply(401, { error: 'bad link' });

    try {
      if (url.pathname === '/api/status') {
        return reply(200, { host: os.hostname(), uptime: os.uptime(), mem: 1 - os.freemem() / os.totalmem() });
      }
      if (url.pathname === '/api/chat' && req.method === 'POST') {
        const body = await readJson(req);
        hooks.notify({ type: 'remote-chat', text: body.text });
        return reply(200, { reply: await hooks.chat(String(body.text || ''), !!body.withScreen) });
      }
      if (url.pathname === '/api/screen') {
        const shot = await hooks.screenshot();
        return reply(200, Buffer.from(shot.data, 'base64'), shot.mime);
      }
      if (url.pathname === '/api/action' && req.method === 'POST') {
        const { action } = await readJson(req);
        if (!PHONE_BUTTONS[action]) return reply(400, { error: 'unknown button' });
        hooks.notify({ type: 'remote-action', action });
        await hooks.pc(PHONE_BUTTONS[action]);
        return reply(200, { ok: true });
      }
      reply(404, { error: 'not found' });
    } catch (e) {
      reply(500, { error: e.message });
    }
  });

  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '0.0.0.0', resolve); });

  const { ip, mac } = lanAddress();
  const link = `http://${ip}:${port}/?t=${token}`;
  return { link, ip, mac, port, qr: await QRCode.toDataURL(link, { margin: 1, width: 260, color: { dark: '#111214', light: '#ffffff' } }) };
}

function stop() {
  return new Promise(resolve => { if (!server) return resolve(); server.close(() => resolve()); server = null; });
}

const newToken = () => crypto.randomBytes(18).toString('base64url');

module.exports = { start, stop, newToken, lanAddress };
