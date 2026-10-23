// Screen-time stats: once a minute, which programs have an open window (only while Kairo runs).
// Saved per day in focus.json, shown on the Today page. Nothing leaves the PC.
const { app } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const file = () => path.join(app.getPath('userData'), 'focus.json');
let data = null;
const load = () => { if (data) return data; try { data = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch { data = {}; } return data; };
const save = () => fs.writeFileSync(file(), JSON.stringify(data));
const day = () => new Date().toLocaleDateString('sv');

const NAMES = {
  FortniteClient: 'Fortnite', 'FortniteClient-Win64-Shipping': 'Fortnite', VALORANT: 'Valorant', 'VALORANT-Win64-Shipping': 'Valorant', RobloxPlayerBeta: 'Roblox',
  javaw: 'Minecraft', Minecraft: 'Minecraft', cs2: 'Counter-Strike 2', 'League of Legends': 'League of Legends', GTA5: 'GTA V', RocketLeague: 'Rocket League',
  FC25: 'EA FC', FC26: 'EA FC', FC27: 'EA FC', Overwatch: 'Overwatch', 'r5apex': 'Apex Legends', chrome: 'Chrome', msedge: 'Edge', firefox: 'Firefox', opera: 'Opera',
  WINWORD: 'Word', EXCEL: 'Excel', POWERPNT: 'PowerPoint', ONENOTE: 'OneNote', Code: 'VS Code', Discord: 'Discord', WhatsApp: 'WhatsApp', Spotify: 'Spotify', Teams: 'Teams', 'ms-teams': 'Teams'
};
const GAME_RX = /(steamapps\\common|epic games\\|riot games|roblox|minecraft|ubisoft|ea games|battle\.net|xboxgames)/i;
const IGNORE = /^(explorer|ApplicationFrameHost|TextInputHost|SystemSettings|ShellExperienceHost|SearchHost|StartMenuExperienceHost|LockApp|electron|Kairo|powershell|WindowsTerminal|conhost|cmd|Taskmgr)$/i;

function category(name, p, title) {
  if (/youtube/i.test(title) && /chrome|msedge|firefox|opera|brave/i.test(name)) return ['YouTube', 'video'];
  if (/netflix|twitch|disney\+/i.test(title)) return [title.match(/netflix|twitch|disney\+/i)[0], 'video'];
  if (GAME_RX.test(p || '') || /Fortnite|VALORANT|Roblox|javaw|cs2|League|GTA|RocketLeague|FC2\d|Overwatch|r5apex/i.test(name)) return [NAMES[name] || name, 'games'];
  if (/WINWORD|EXCEL|POWERPNT|ONENOTE|Code|Acrobat|notepad|Obsidian|Notion/i.test(name)) return [NAMES[name] || name, 'study'];
  if (/Discord|WhatsApp|Telegram|Teams|Signal|Slack/i.test(name)) return [NAMES[name] || name, 'chat'];
  if (/chrome|msedge|firefox|opera|brave/i.test(name)) return [NAMES[name] || name, 'web'];
  if (/Spotify/i.test(name)) return ['Spotify', 'music'];
  return [NAMES[name] || name, 'other'];
}

function sample() {
  const script = 'Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object ProcessName, Path, MainWindowTitle | ConvertTo-Json -Compress';
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 20000, maxBuffer: 2e6 }, (err, out) => {
    if (err || !out.trim()) return;
    let list; try { list = JSON.parse(out); } catch { return; }
    if (!Array.isArray(list)) list = [list];
    const d = load(), today = (d[day()] ||= { apps: {}, cats: {} });
    const seen = new Set();
    for (const p of list) {
      if (IGNORE.test(p.ProcessName)) continue;
      const [label, cat] = category(p.ProcessName, p.Path, p.MainWindowTitle || '');
      if (seen.has(label)) continue; seen.add(label);
      today.apps[label] = { min: (today.apps[label]?.min || 0) + 1, cat };
    }
    const cats = new Set([...seen].map(l => today.apps[l].cat));
    for (const c of cats) today.cats[c] = (today.cats[c] || 0) + 1;
    // keep 30 days
    for (const k of Object.keys(d).sort().slice(0, -30)) delete d[k];
    save();
  });
}

function summary(dateKey = day()) {
  const t = load()[dateKey] || { apps: {}, cats: {} };
  const apps = Object.entries(t.apps).map(([name, v]) => ({ name, min: v.min, cat: v.cat })).sort((a, b) => b.min - a.min);
  return { date: dateKey, apps, cats: t.cats };
}

function week() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const k = new Date(Date.now() - i * 86400000).toLocaleDateString('sv');
    const s = summary(k);
    out.push({ date: k, games: s.cats.games || 0, video: s.cats.video || 0, study: s.cats.study || 0 });
  }
  return out;
}

function register({ ipcMain }) {
  ipcMain.handle('focus:today', () => summary());
  ipcMain.handle('focus:week', () => week());
  setTimeout(sample, 15000);
  setInterval(sample, 60000);
}

module.exports = { register, summary, week };
