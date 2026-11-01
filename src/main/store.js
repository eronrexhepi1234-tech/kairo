// Settings live in a JSON file in the user's app-data folder.
// API keys are encrypted with Windows DPAPI via Electron's safeStorage.
const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  name: 'Kairo',
  language: 'de',
  persona: 'normal',
  customInstructions: '',
  provider: 'anthropic',
  models: {
    anthropic: 'claude-sonnet-5-5',
    openai: 'gpt-5.5',
    gemini: 'gemini-3.5-flash',
    custom: 'llama3.2'
  },
  customBaseUrl: 'http://localhost:11434/v1',
  keys: { anthropic: '', openai: '', gemini: '', custom: '', lichess: '', discord: '', mail: '' },
  theme: 'graphite',
  accent: '#ff7a45',
  density: 'comfortable',
  motion: 'full',
  font: 'modern',
  voice: {
    engine: 'auto', systemVoice: '', openaiVoice: 'coral', geminiVoice: 'Kore', ttsModel: 'gpt-4o-mini-tts', sttModel: 'gpt-4o-mini-transcribe',
    autoSpeak: false, rate: 1, liveModel: 'auto', orbStyle: 'orb', orbPalette: 'accent', handsFree: true, sensitivity: 'medium', role: 'normal'
  },
  schema: 4,
  miniOrb: true,
  devMode: false,
  autoMemory: true,
  robloxTrendAlarm: false,
  userTitle: '',
  pet: false,
  desktopWeather: false,
  alerts: { enabled: false, ntfyTopic: '', telegram: '', callAtPc: false, quietFrom: 22, quietTo: 7, triggers: {} },
  worldClock: [{ name: 'New York', tz: 'America/New_York', lat: 40.71, lng: -74.01 }, { name: 'Tokio', tz: 'Asia/Tokyo', lat: 35.69, lng: 139.69 }, { name: 'Tirana', tz: 'Europe/Tirane', lat: 41.33, lng: 19.82 }],
  mail: { enabled: false, provider: 'gmail', user: '', host: '', port: 993, notify: true },
  football: { league: 'sui.1', team: null },
  wakeWord: false,
  customTheme: null,
  discord: { enabled: false, channel: '' },
  background: 'none',
  autostart: false,
  closeToTray: false,
  city: '',
  briefing: { enabled: true, speak: true, lastDate: '' },
  learnLanguage: 'en',
  lichess: { enabled: false, level: 12, acceptFrom: 'all' },
  hideFromCapture: true,
  hotkey: 'CommandOrControl+Shift+Space',
  voiceHotkey: 'CommandOrControl+Shift+K',
  newsRegion: 'auto',
  remote: { enabled: false, port: 7777, token: '' }
};

const file = () => path.join(app.getPath('userData'), 'settings.json');
let cache = null;

function deepMerge(base, extra) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') out[k] = deepMerge(base[k], v);
    else out[k] = v;
  }
  return out;
}

function encryptKey(v) {
  if (!v) return '';
  if (!safeStorage.isEncryptionAvailable()) return 'plain:' + v;
  return 'enc:' + safeStorage.encryptString(v).toString('base64');
}
function decryptKey(v) {
  if (!v) return '';
  if (v.startsWith('plain:')) return v.slice(6);
  if (v.startsWith('enc:')) {
    try { return safeStorage.decryptString(Buffer.from(v.slice(4), 'base64')); } catch { return ''; }
  }
  return v;
}

function load() {
  if (cache) return cache;
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch {}
  // v1 -> v2: the old Gemini default is often overloaded, and voices now pick themselves.
  if (raw.keys && !raw.schema) {
    raw.schema = 2;
    if (raw.models?.gemini === 'gemini-flash-latest') raw.models.gemini = 'gemini-3.5-flash';
    if (raw.voice?.engine === 'system') raw.voice.engine = 'auto';
  }
  // v2 -> v3: no background process unless the user turns it on again
  if (raw.keys && (raw.schema || 0) < 3) { raw.schema = 3; raw.autostart = false; raw.closeToTray = false; }
  // v4: new modern font as default
  if (raw.keys && (raw.schema || 0) < 4) { raw.schema = 4; if (!raw.font || raw.font === 'system') raw.font = 'modern'; }
  cache = deepMerge(DEFAULTS, raw);
  for (const p of Object.keys(cache.keys)) cache.keys[p] = decryptKey(cache.keys[p]);
  return cache;
}

function save() {
  const copy = JSON.parse(JSON.stringify(cache));
  for (const p of Object.keys(copy.keys)) copy.keys[p] = encryptKey(copy.keys[p]);
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(copy, null, 2));
}

function get() { return load(); }

function update(patch) {
  load();
  cache = deepMerge(cache, patch);
  save();
  return cache;
}

// What the renderer sees: keys replaced by a "set / not set" flag.
function publicView() {
  const s = load();
  const view = JSON.parse(JSON.stringify(s));
  view.keys = Object.fromEntries(Object.entries(s.keys).map(([k, v]) => [k, v ? '••••' + v.slice(-4) : '']));
  return view;
}

module.exports = { get, update, publicView, DEFAULTS };
