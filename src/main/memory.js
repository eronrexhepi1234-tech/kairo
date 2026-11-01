// Long-term memory: short facts about the user that Kairo keeps across chats.
// A fact can have a date ("when", YYYY-MM-DD) for events like exams; Kairo brings those up by itself.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const file = () => path.join(app.getPath('userData'), 'memory.json');
let items = null;
const day = (offset = 0) => { const d = new Date(Date.now() + offset * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

function load() {
  if (items) return items;
  try { items = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch { items = []; }
  // events are forgotten 3 days after their date
  const n = items.length, old = day(-3);
  items = items.filter(m => !m.when || m.when >= old);
  if (items.length !== n) save();
  return items;
}
function save() { fs.writeFileSync(file(), JSON.stringify(items, null, 2)); }

function list() { return load(); }

function add(text, when = '') {
  let t = String(text || '').trim().slice(0, 300);
  // "[[remember: Mathe-Prüfung | 2026-11-05]]" -> fact with a date
  const parts = t.split('|');
  if (!when && parts.length > 1 && DATE_RX.test(parts[parts.length - 1].trim())) { when = parts.pop().trim(); t = parts.join('|').trim(); }
  if (!t) return null;
  load();
  // don't store the same fact twice
  if (items.some(m => m.text.toLowerCase() === t.toLowerCase())) return null;
  const m = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: t, date: new Date().toISOString() };
  if (DATE_RX.test(when || '')) m.when = when;
  items.push(m);
  if (items.length > 200) items.shift();
  save();
  return m;
}

function remove(idOrText) {
  load();
  const q = String(idOrText).toLowerCase();
  const before = items.length;
  items = items.filter(m => m.id !== idOrText && !m.text.toLowerCase().includes(q));
  save();
  return before - items.length;
}

// events from today up to <days> days ahead, soonest first
function upcoming(days = 3) {
  const a = day(0), b = day(days);
  return load().filter(m => m.when && m.when >= a && m.when <= b).sort((x, y) => x.when.localeCompare(y.when));
}

function promptText() {
  const l = load();
  if (!l.length) return '';
  let out = 'What you remember about the user (use it naturally, don\'t list it unless asked):\n' + l.map(m => '- ' + m.text + (m.when ? ` (date: ${m.when})` : '')).join('\n');
  const soon = upcoming(3);
  if (soon.length) out += `\n\nComing up soon (today is ${day(0)}): ${soon.map(m => m.text + ' on ' + m.when).join('; ')}. If it fits, bring it up once on your own like a friend would (e.g. offer to practise for an exam), but don't repeat it in every message.`;
  return out;
}

module.exports = { list, add, remove, promptText, upcoming, day };
