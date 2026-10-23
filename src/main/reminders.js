// Reminders and alarms. Checked every few seconds while Kairo runs (also hidden in the tray).
const { app, Notification } = require('electron');
const fs = require('fs');
const path = require('path');

const file = () => path.join(app.getPath('userData'), 'reminders.json');
let items = null;
let onFire = () => {};

function load() {
  if (items) return items;
  try { items = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch { items = []; }
  return items;
}
function save() { fs.writeFileSync(file(), JSON.stringify(items, null, 2)); }

// "at" may be an ISO date/time, or "in 20 min" style text, or minutes as a number.
function parseWhen(at) {
  if (typeof at === 'number') return Date.now() + at * 60000;
  const s = String(at || '').trim();
  let m = s.match(/^(?:in\s*)?(\d+(?:[.,]\d+)?)\s*(s|sek|sec|seconds?|min|minuten?|minutes?|m|h|std|stunden?|hours?)\b/i);
  if (m) {
    const n = parseFloat(m[1].replace(',', '.')), u = m[2].toLowerCase();
    const mult = /^s/.test(u) ? 1000 : /^(h|std|stunde|hour)/.test(u) ? 3600000 : 60000;
    return Date.now() + n * mult;
  }
  m = s.match(/^(\d{1,2})[:.](\d{2})$/); // just a time today (or tomorrow if passed)
  if (m) {
    const d = new Date(); d.setHours(+m[1], +m[2], 0, 0);
    if (d.getTime() < Date.now() - 30000) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  const t = Date.parse(s);
  if (!isNaN(t)) return t;
  throw new Error('Unknown time: ' + s);
}

function add({ at, text, kind = 'reminder', repeat = null }) {
  load();
  const r = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: parseWhen(at), text: String(text || (kind === 'alarm' ? 'Wecker' : 'Erinnerung')).slice(0, 200), kind: kind === 'alarm' ? 'alarm' : 'reminder', repeat: repeat === 'daily' ? 'daily' : null };
  items.push(r);
  items.sort((a, b) => a.at - b.at);
  save();
  return r;
}

function remove(id) { load(); items = items.filter(r => r.id !== id); save(); }
function list() { return load().slice().sort((a, b) => a.at - b.at); }
function snooze(r, minutes = 5) { return add({ at: minutes, text: r.text, kind: r.kind }); }

function tick() {
  load();
  const now = Date.now();
  const due = items.filter(r => r.at <= now);
  if (!due.length) return;
  for (const r of due) {
    if (r.repeat === 'daily') { while (r.at <= now) r.at += 86400000; }
    else items = items.filter(x => x !== r);
    try {
      const n = new Notification({ title: r.kind === 'alarm' ? '⏰ Kairo – Wecker' : '🔔 Kairo – Erinnerung', body: r.text, silent: r.kind !== 'alarm' });
      n.show();
    } catch {}
    onFire(r);
  }
  save();
}

function start(fire) {
  onFire = fire;
  setInterval(tick, 5000);
  setTimeout(tick, 2000);
}

module.exports = { add, remove, list, snooze, start, parseWhen };
