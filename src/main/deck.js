// Stream Deck: big buttons on the phone that do things on the PC.
// Every button is one of a fixed list of action types (nothing else can be run from the phone).
const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const file = () => path.join(app.getPath('userData'), 'deck.json');
const APPS = ['spotify', 'discord', 'steam', 'chrome', 'explorer', 'calculator', 'notepad', 'obs', 'roblox', 'minecraft', 'vs code', 'word', 'excel', 'settings'];
const PC = { mute: 'mute', volup: 'volume_up', voldown: 'volume_down', playpause: 'play_pause', next: 'next', prev: 'previous', lock: 'lock' };
const MOODS = ['chill', 'focus', 'party', 'gaming', 'sleep'];

// catalog shown in the editors: [type, value, label, icon, color]
const CATALOG = [
  ['Kairo', [
    ['kairo', 'Jarvis-Modus an', 'Jarvis an', 'scan', '#5ce1ff'], ['kairo', 'Jarvis-Modus aus', 'Jarvis aus', 'scan-off', '#3a8fa8'],
    ['kairo', 'Party', 'Party', 'party', '#ff4f8b'], ['kairo', 'Haustier zeigen', 'Haustier', 'cat', '#ffb347'],
    ['kairo', 'Musik-Quiz starten', 'Musik-Quiz', 'music', '#a37bff'], ['kairo', 'Radio-Show', 'Radio', 'radio', '#ff7a45'],
    ['kairo', 'Wetter auf dem Desktop an', 'Wetter-Show', 'cloud', '#6ea8ff'], ['kairo', 'Sonnensystem zeigen', 'Planeten', 'orbit', '#7a5cff'],
    ['kairo', 'Kommentator an', 'Kommentator', 'mic', '#3ddc97'], ['kairo', 'Live-Untertitel an', 'Untertitel', 'captions', '#ffd27a']]],
  ['Musik & Ton', [
    ['pc', 'playpause', 'Play / Pause', 'play', '#3ddc97'], ['pc', 'next', 'Weiter', 'next', '#3ddc97'], ['pc', 'prev', 'Zurück', 'prev', '#3ddc97'],
    ['pc', 'volup', 'Lauter', 'volup', '#6ea8ff'], ['pc', 'voldown', 'Leiser', 'voldown', '#6ea8ff'], ['pc', 'mute', 'Stumm', 'mute', '#ff6b6b'],
    ['music', 'chill', 'Chill-Musik', 'music', '#7a5cff'], ['music', 'focus', 'Fokus-Musik', 'music', '#3ddc97'], ['music', 'gaming', 'Gaming-Musik', 'music', '#ff4f8b'], ['music', 'party', 'Party-Musik', 'music', '#ffb347']]],
  ['Apps', APPS.map(a => ['app', a, a[0].toUpperCase() + a.slice(1), 'app', { spotify: '#1ed760', discord: '#5865f2', steam: '#66c0f4', chrome: '#fbbc05', obs: '#9c9c9c', roblox: '#e2231a', minecraft: '#62b047', 'vs code': '#23a8f2' }[a] || '#8e97aa'])],
  ['PC', [['pc', 'lock', 'PC sperren', 'lock', '#ff6b6b'], ['shot', '', 'Screenshot', 'camera', '#ffd27a'], ['say', 'Hallo! Ich bin Kairo.', 'Kairo spricht', 'speaker', '#ff7a45']]]
];
const DEFAULT = [
  ['kairo', 'Jarvis-Modus an', 'Jarvis an', 'scan', '#5ce1ff'], ['pc', 'playpause', 'Play / Pause', 'play', '#3ddc97'], ['pc', 'volup', 'Lauter', 'volup', '#6ea8ff'],
  ['app', 'discord', 'Discord', 'app', '#5865f2'], ['pc', 'next', 'Weiter', 'next', '#3ddc97'], ['pc', 'voldown', 'Leiser', 'voldown', '#6ea8ff'],
  ['app', 'spotify', 'Spotify', 'app', '#1ed760'], ['kairo', 'Party', 'Party', 'party', '#ff4f8b'], ['pc', 'mute', 'Stumm', 'mute', '#ff6b6b'],
  ['shot', '', 'Screenshot', 'camera', '#ffd27a'], ['kairo', 'Haustier zeigen', 'Haustier', 'cat', '#ffb347'], ['pc', 'lock', 'PC sperren', 'lock', '#ff6b6b']
].map(([type, value, label, icon, color], i) => ({ id: 'd' + i, type, value, label, icon, color }));

function load() { try { const d = JSON.parse(fs.readFileSync(file(), 'utf8')); if (Array.isArray(d.buttons)) return d; } catch {} return { buttons: DEFAULT }; }
const clean = s => String(s ?? '').replace(/[<>]/g, '').slice(0, 120);
// only known action types with allowed values are kept
function sanitize(buttons) {
  return (buttons || []).slice(0, 24).map((b, i) => {
    const type = String(b.type);
    let value = clean(b.value);
    if (type === 'pc' && !PC[value]) return null;
    if (type === 'app' && !APPS.includes(value)) return null;
    if (type === 'music' && !MOODS.includes(value)) return null;
    if (!['kairo', 'pc', 'app', 'music', 'shot', 'say'].includes(type)) return null;
    if (type === 'kairo' && !value) return null;
    return { id: clean(b.id) || 'b' + i + Date.now().toString(36), type, value, label: clean(b.label).slice(0, 24) || value, icon: clean(b.icon).slice(0, 20) || 'zap', color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#ff7a45' };
  }).filter(Boolean);
}
function save(buttons) { const d = { buttons: sanitize(buttons) }; fs.writeFileSync(file(), JSON.stringify(d, null, 1)); return d; }

let hooks = null;
async function run(id) {
  const b = load().buttons.find(x => x.id === id);
  if (!b) throw new Error('Knopf nicht gefunden');
  hooks.notify?.({ type: 'remote-action', action: 'Deck: ' + b.label });
  if (b.type === 'pc') return hooks.pc(PC[b.value]);
  if (b.type === 'app') return hooks.app(b.value);
  if (b.type === 'music') return hooks.music(b.value);
  if (b.type === 'say') return hooks.say(b.value);
  if (b.type === 'shot') {
    const img = await hooks.screenshot();
    const dir = path.join(app.getPath('pictures'), 'Kairo', 'Screenshots'); fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, `Screenshot ${new Date().toLocaleString('sv').replace(/[: ]/g, '-')}.jpg`);
    fs.writeFileSync(f, Buffer.from(String(img.data || img).replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    return { saved: f };
  }
  if (b.type === 'kairo') return hooks.kairo(b.value);
}

function register(ctx) {
  hooks = ctx;
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...((await fn(...a)) || {}) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  ipcMain.handle('deck:get', wrap(async () => ({ ...load(), catalog: CATALOG })));
  ipcMain.handle('deck:save', wrap(async b => save(b)));
  ipcMain.handle('deck:run', wrap(async id => ({ result: await run(id) })));
}

module.exports = { register, load, save, run, CATALOG };
