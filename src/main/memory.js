// Long-term memory: short facts about the user that Kairo keeps across chats.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const file = () => path.join(app.getPath('userData'), 'memory.json');
let items = null;

function load() {
  if (items) return items;
  try { items = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch { items = []; }
  return items;
}
function save() { fs.writeFileSync(file(), JSON.stringify(items, null, 2)); }

function list() { return load(); }

function add(text) {
  const t = String(text || '').trim().slice(0, 300);
  if (!t) return null;
  load();
  // don't store the same fact twice
  if (items.some(m => m.text.toLowerCase() === t.toLowerCase())) return null;
  const m = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: t, date: new Date().toISOString() };
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

function promptText() {
  const l = load();
  if (!l.length) return '';
  return 'What you remember about the user (use it naturally, don\'t list it unless asked):\n' + l.map(m => '- ' + m.text).join('\n');
}

module.exports = { list, add, remove, promptText };
