// "Kairo calls you": watches for things that matter (lots of new mail, security mails, someone using the PC
// while you're away, Windows updates, disk full, goals, birthdays, reminders) and reaches your phone:
//  - push notification via ntfy (free app, works anywhere, with Kairo's own voice as an audio file)
//  - a real voice call on Telegram via CallMeBot (free), Kairo's message is read out
//  - the Kairo phone page shows an incoming call screen when it's open
// Only while Kairo runs. Quiet hours turn calls into silent pushes.
const { ipcMain, powerMonitor, Notification } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');

let store = null, getWin = null, speakWav = null;
const history = [];           // last alerts, also shown on the phone
const lastSent = {};          // trigger -> time, so nothing spams you
let guard = { on: false, since: 0, lastIdle: 0, timer: null };

const DEFAULTS = {
  enabled: false, ntfyTopic: '', telegram: '', callAtPc: false, quietFrom: 22, quietTo: 7,
  triggers: {
    mail: { on: true, level: 'push', threshold: 5 }, security: { on: true, level: 'call' }, guard: { on: true, level: 'call', lock: true },
    update: { on: true, level: 'push' }, disk: { on: true, level: 'push' }, goal: { on: true, level: 'push' },
    birthday: { on: true, level: 'push' }, reminder: { on: true, level: 'push' }
  }
};
const cfg = () => { const a = store.get().alerts || {}; return { ...DEFAULTS, ...a, triggers: { ...DEFAULTS.triggers, ...Object.fromEntries(Object.entries(a.triggers || {}).map(([k, v]) => [k, { ...DEFAULTS.triggers[k], ...v }])) } }; };
const title = () => store.get().userTitle || 'Chef';
const quiet = c => { const h = new Date().getHours(); return c.quietFrom > c.quietTo ? (h >= c.quietFrom || h < c.quietTo) : (h >= c.quietFrom && h < c.quietTo); };
const userAtPc = () => { try { return powerMonitor.getSystemIdleTime() < 240 && powerMonitor.getSystemIdleState(240) === 'active'; } catch { return false; } };

// ---------- channels ----------
async function pushNtfy(c, a, withVoice) {
  if (!c.ntfyTopic) return false;
  const url = 'https://ntfy.sh/' + encodeURIComponent(c.ntfyTopic);
  const headers = { Title: encodeHeader(a.title), Priority: a.level === 'call' ? '5' : '3', Tags: a.tag || 'robot' };
  try {
    if (withVoice && speakWav) {
      // Kairo's own voice as an audio file attached to the notification
      const voice = await speakWav(a.speech || a.message).catch(() => null);
      if (voice?.b64) {
        const r = await fetch(url, { method: 'PUT', body: Buffer.from(voice.b64, 'base64'), headers: { ...headers, Filename: 'Kairo.' + voice.ext, Message: encodeHeader(a.message) }, signal: AbortSignal.timeout(30000) });
        if (r.ok) return true;
      }
    }
    const r = await fetch(url, { method: 'POST', body: a.message, headers, signal: AbortSignal.timeout(15000) });
    return r.ok;
  } catch { return false; }
}
// ntfy headers must be ASCII; it decodes RFC 2047 "encoded words"
const encodeHeader = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`;

async function callTelegram(c, a) {
  if (!c.telegram) return { ok: false, text: 'Kein Telegram-Name eingetragen' };
  const user = c.telegram.startsWith('@') || /^\+?\d+$/.test(c.telegram) ? c.telegram : '@' + c.telegram;
  const lang = store.get().language === 'en' ? 'en-US-Standard-C' : 'de-DE-Standard-B';
  const url = `https://api.callmebot.com/start.php?source=kairo&user=${encodeURIComponent(user)}&text=${encodeURIComponent((a.speech || a.message).slice(0, 250))}&lang=${lang}&rpt=2`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(40000) });
    const text = (await r.text()).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { ok: r.ok && !/not authori|error|invalid/i.test(text), text: text.slice(0, 400) };
  } catch (e) { return { ok: false, text: e.message }; }
}

// ---------- raise an alert ----------
async function raise(trigger, a, opts = {}) {
  const c = cfg();
  const t = c.triggers[trigger];
  if (!opts.test && (!c.enabled || !t?.on)) return null;
  const now = Date.now(), gap = trigger === 'mail' ? 20 * 60e3 : trigger === 'guard' ? 60e3 : 10 * 60e3;
  if (!opts.test && lastSent[trigger + (a.key || '')] && now - lastSent[trigger + (a.key || '')] < gap) return null;
  lastSent[trigger + (a.key || '')] = now;
  let level = opts.level || t?.level || 'push';
  const urgent = trigger === 'security' || trigger === 'guard';
  if (level === 'call' && quiet(c) && !urgent && !opts.test) level = 'push';
  const alert = { id: now.toString(36), trigger, level, time: now, title: a.title, message: a.message, speech: a.speech, tag: a.tag };
  history.unshift(alert); history.splice(30);
  // always visible on the PC (desktop card / app) ...
  getWin()?.webContents.send('alert:new', alert);
  // ... and on the phone, unless you're sitting at the PC anyway
  const atPc = userAtPc() && !urgent && !opts.test;
  if (atPc && !c.callAtPc) return alert;
  const out = { push: await pushNtfy(c, alert, level === 'call' || opts.voice) };
  if (level === 'call') out.call = await callTelegram(c, alert);
  alert.sent = out;
  return alert;
}

// ---------- triggers ----------
const SECURITY_RX = /(sicherheit|security|verdächtig|suspicious|anmeldung|sign-?in|new login|neues gerät|new device|passwort|password|2-?faktor|two-?factor|verification code|bestätigungscode|zugriff|unusual activity|ungewöhnlich)/i;
function onMail(fresh) {
  const n = title();
  const sec = fresh.filter(m => SECURITY_RX.test(m.subject || ''));
  if (sec.length) {
    const m = sec[0];
    raise('security', { key: m.subject, tag: 'warning', title: `⚠ Sicherheitsmail von ${m.from}`, message: `${m.subject}`, speech: `Hallo ${n}, hier ist Kairo. Achtung: Du hast eine Sicherheitswarnung bekommen, von ${m.from}: ${m.subject}. Schau bitte nach, ob das du warst.` });
  }
  const t = cfg().triggers.mail;
  const recent = (onMail.buf = [...(onMail.buf || []).filter(x => Date.now() - x < 3600e3), ...fresh.map(() => Date.now())]);
  if (recent.length >= (t.threshold || 5)) {
    onMail.buf = [];
    const from = [...new Set(fresh.map(m => m.from))].slice(0, 3).join(', ');
    raise('mail', { tag: 'email', title: `✉ ${recent.length} neue Mails`, message: `Neu: ${from}`, speech: `Hallo ${n}, hier ist Kairo. Du hast ${recent.length} neue E-Mails bekommen, unter anderem von ${from}.` });
  }
}

// guard: "pass auf meinen PC auf" -> any keyboard/mouse activity = alert (+ lock)
function setGuard(on) {
  clearInterval(guard.timer);
  guard = { on, since: Date.now(), lastIdle: 0, timer: null, tripped: false };
  getWin()?.webContents.send('alert:guard', on);
  if (!on) return false;
  // 15 s to walk away, then watch
  setTimeout(() => {
    if (!guard.on) return;
    guard.lastIdle = powerMonitor.getSystemIdleTime();
    guard.timer = setInterval(() => {
      const idle = powerMonitor.getSystemIdleTime();
      if (idle < guard.lastIdle && idle < 3 && !guard.tripped) {
        guard.tripped = true;
        const n = title();
        raise('guard', { tag: 'rotating_light', title: '🚨 Jemand benutzt deinen PC!', message: `Bewegung an Maus oder Tastatur um ${new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}.`, speech: `${n}, hier ist Kairo! Jemand benutzt gerade deinen PC. Ich habe ihn gesperrt.` }, { voice: true });
        if (cfg().triggers.guard.lock !== false) execFile('rundll32.exe', ['user32.dll,LockWorkStation']);
        setTimeout(() => { if (guard.on) guard.tripped = false; }, 120e3);
      }
      guard.lastIdle = idle;
    }, 1500);
  }, 15000);
  return true;
}

// Windows update waiting for a restart, disk almost full: checked every 2 hours
function ps(script) { return new Promise(res => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 20000 }, (e, out) => res(e ? '' : String(out).trim()))); }
async function checkSystem() {
  const n = title();
  const reboot = await ps("if ((Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired') -or (Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending')) { 'yes' }");
  if (reboot === 'yes') raise('update', { key: new Date().toDateString(), tag: 'arrows_counterclockwise', title: '🔄 Windows-Update wartet', message: 'Dein PC hat ein Update installiert und möchte neu starten.', speech: `Hallo ${n}, hier ist Kairo. Dein PC hat ein Windows-Update und möchte neu starten.` });
  try {
    const s = await fs.promises.statfs('C:\\');
    const free = s.bavail * s.bsize, total = s.blocks * s.bsize;
    if (free < 8e9 || free / total < 0.06) raise('disk', { key: new Date().toDateString(), tag: 'floppy_disk', title: '💾 Festplatte fast voll', message: `Nur noch ${(free / 1e9).toFixed(1)} GB frei auf C:.`, speech: `Hallo ${n}, deine Festplatte ist fast voll. Nur noch ${Math.round(free / 1e9)} Gigabyte frei.` });
  } catch {}
}

function register(ctx) {
  ({ store, getWin, speakWav } = ctx);
  // other modules report events here
  global.kairoAlert = (type, data) => {
    try {
      const n = title();
      if (type === 'mail') return onMail(data || []);
      if (type === 'goal') return raise('goal', { key: data.text, tag: 'soccer', title: '⚽ Tor!', message: data.text, speech: `${n}, Tor! ${data.text.replace(/[^\p{L}\p{N}: ]/gu, ' ')}` });
      if (type === 'birthday') return raise('birthday', { key: data.name, tag: 'birthday', title: data.days === 0 ? `🎂 ${data.name} hat heute Geburtstag` : `🎁 Morgen: ${data.name}`, message: data.age ? `${data.name} wird ${data.age}.` : 'Nicht vergessen!', speech: `Hallo ${n}, ${data.days === 0 ? 'heute' : 'morgen'} hat ${data.name} Geburtstag.` });
      if (type === 'reminder') return raise('reminder', { key: data.text + data.at, tag: data.kind === 'alarm' ? 'alarm_clock' : 'bell', title: data.kind === 'alarm' ? '⏰ Wecker' : '🔔 Erinnerung', message: data.text, speech: `Hallo ${n}, Erinnerung: ${data.text}` });
    } catch {}
  };
  setTimeout(checkSystem, 60e3);
  setInterval(checkSystem, 2 * 3600e3);

  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  ipcMain.handle('alerts:get', () => ({ cfg: cfg(), history, guard: guard.on }));
  ipcMain.handle('alerts:newTopic', () => ({ topic: 'kairo-' + require('crypto').randomBytes(9).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, 'x') }));
  ipcMain.handle('alerts:test', wrap(async kind => {
    const n = title();
    const a = await raise('test', { tag: 'wave', title: '👋 Test von Kairo', message: `Hallo ${n}! So sehen Kairos Meldungen aus.`, speech: `Hallo ${n}, hier ist Kairo. Das ist ein Test. Wenn du mich hörst, funktioniert alles.` }, { test: true, level: kind === 'call' ? 'call' : 'push', voice: true });
    return { alert: a };
  }));
  ipcMain.handle('alerts:qr', async (_e, text) => require('qrcode').toDataURL(String(text), { margin: 1, width: 180, color: { dark: '#111214', light: '#ffffff' } }));
  ipcMain.handle('alerts:guard', (_e, on) => ({ on: setGuard(!!on) }));
}

module.exports = { register, raise, setGuard, history: () => history, guardOn: () => guard.on };
