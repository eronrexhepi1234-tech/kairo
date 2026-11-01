// A self-made HTTPS certificate for the phone remote, so the phone browser allows camera and microphone.
// Phones show a warning once ("not private") because nobody official signed it – it only lives on this PC.
// Built with Node's crypto only (no extra program needed). Kept in userData so the phone's exception stays valid.
const { app } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- tiny DER (ASN.1) writer ---
const len = n => n < 128 ? Buffer.from([n]) : (() => { const b = []; while (n) { b.unshift(n & 255); n >>= 8; } return Buffer.from([0x80 | b.length, ...b]); })();
const tlv = (tag, body) => Buffer.concat([Buffer.from([tag]), len(body.length), body]);
const seq = (...x) => tlv(0x30, Buffer.concat(x));
const set = (...x) => tlv(0x31, Buffer.concat(x));
const int = buf => { if (buf[0] & 0x80) buf = Buffer.concat([Buffer.from([0]), buf]); return tlv(0x02, buf); };
const oid = s => { const p = s.split('.').map(Number); const out = [40 * p[0] + p[1]]; for (const v of p.slice(2)) { const b = [v & 127]; let x = v >> 7; while (x) { b.unshift((x & 127) | 128); x >>= 7; } out.push(...b); } return tlv(0x06, Buffer.from(out)); };
const utf8 = s => tlv(0x0c, Buffer.from(s, 'utf8'));
const time = d => { const s = d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'; return tlv(0x17, Buffer.from(s)); };
const ctx = (n, body, constructed = true) => tlv((constructed ? 0xa0 : 0x80) | n, body);
const bits = buf => tlv(0x03, Buffer.concat([Buffer.from([0]), buf]));
const octets = buf => tlv(0x04, buf);

function make(ips) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const algo = seq(oid('1.2.840.113549.1.1.11'), Buffer.from([0x05, 0x00])); // sha256WithRSAEncryption
  const name = seq(set(seq(oid('2.5.4.3'), utf8('Kairo on this PC'))));
  const now = new Date(Date.now() - 864e5), until = new Date(Date.now() + 10 * 365 * 864e5);
  const san = seq(...[...new Set(['127.0.0.1', ...ips])].map(ip => tlv(0x87, Buffer.from(ip.split('.').map(Number)))), tlv(0x82, Buffer.from('localhost')));
  const exts = ctx(3, seq(
    seq(oid('2.5.29.17'), octets(san)),                                         // subject alt names (LAN IP)
    seq(oid('2.5.29.37'), octets(seq(oid('1.3.6.1.5.5.7.3.1'))))               // server auth
  ));
  const tbs = seq(ctx(0, int(Buffer.from([2]))), int(crypto.randomBytes(12)), algo, name, seq(time(now), time(until)), name,
    publicKey.export({ type: 'spki', format: 'der' }), exts);
  const sig = crypto.sign('sha256', tbs, privateKey);
  const der = seq(tbs, algo, bits(sig));
  const pem = '-----BEGIN CERTIFICATE-----\n' + der.toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----\n';
  return { cert: pem, key: privateKey.export({ type: 'pkcs8', format: 'pem' }), ips };
}

// returns { key, cert } – made once, made again only when the PC got a new home-network address
function get(ip) {
  const file = path.join(app.getPath('userData'), 'remote-cert.json');
  try {
    const c = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (c.cert && c.key && (!ip || (c.ips || []).includes(ip))) return c;
  } catch {}
  const c = make(ip ? [ip] : []);
  try { fs.writeFileSync(file, JSON.stringify(c)); } catch {}
  return c;
}

module.exports = { get, make };
