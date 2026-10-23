// Everyday data (homework, exams, money, diary, routines) and football live scores.
const { app, Notification } = require('electron');
const fs = require('fs');
const path = require('path');

// ---------- simple collections in life.json ----------
const file = () => path.join(app.getPath('userData'), 'life.json');
let db = null;
const load = () => { if (db) return db; try { db = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch { db = {}; } return db; };
const save = () => fs.writeFileSync(file(), JSON.stringify(db, null, 2));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const COLLECTIONS = new Set(['homework', 'exams', 'money', 'diary', 'routines']);
const coll = name => { if (!COLLECTIONS.has(name)) throw new Error('unknown list ' + name); const d = load(); return (d[name] ||= []); };

function list(name) { return coll(name); }
function add(name, item) { const c = coll(name); const it = { id: uid(), created: Date.now(), ...item }; c.push(it); save(); return it; }
function update(name, id, patch) { const it = coll(name).find(x => x.id === id); if (it) { Object.assign(it, patch); save(); } return it; }
function remove(name, id) { const d = load(); d[name] = coll(name).filter(x => x.id !== id); save(); }
function addMany(name, items) { return items.map(i => add(name, i)); }

// ---------- football (ESPN public scoreboard, no key) ----------
const LEAGUES = {
  'sui.1': 'Super League (CH)', 'ger.1': 'Bundesliga', 'eng.1': 'Premier League', 'esp.1': 'LaLiga', 'ita.1': 'Serie A',
  'fra.1': 'Ligue 1', 'por.1': 'Liga Portugal', 'ned.1': 'Eredivisie', 'tur.1': 'Süper Lig', 'uefa.champions': 'Champions League', 'uefa.europa': 'Europa League'
};
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');

async function teams(league) {
  const j = await (await fetch(`${ESPN}/${league}/teams`, { signal: AbortSignal.timeout(10000) })).json();
  return (j.sports?.[0]?.leagues?.[0]?.teams || []).map(x => ({ id: x.team.id, name: x.team.displayName, logo: x.team.logos?.[0]?.href })).sort((a, b) => a.name.localeCompare(b.name));
}

function mapEvent(e) {
  const comp = e.competitions?.[0] || {};
  const cs = comp.competitors || [];
  const home = cs.find(c => c.homeAway === 'home') || cs[0] || {}, away = cs.find(c => c.homeAway === 'away') || cs[1] || {};
  const st = e.status || comp.status || {};
  const score = c => c.score?.displayValue ?? c.score ?? '';
  return {
    id: e.id, date: e.date, state: st.type?.state, detail: st.type?.shortDetail, clock: st.displayClock,
    home: { id: home.team?.id, name: home.team?.shortDisplayName || home.team?.displayName, score: score(home), logo: home.team?.logo },
    away: { id: away.team?.id, name: away.team?.shortDisplayName || away.team?.displayName, score: score(away), logo: away.team?.logo }
  };
}

// results (team schedule) + upcoming (fixtures) + today's live board
async function matches(league, teamId) {
  const get = u => fetch(u, { signal: AbortSignal.timeout(12000) }).then(r => r.json()).catch(() => ({}));
  const [past, next, today] = await Promise.all([
    get(`${ESPN}/${league}/teams/${teamId}/schedule`), get(`${ESPN}/${league}/teams/${teamId}/schedule?fixture=true`), get(`${ESPN}/${league}/scoreboard`)
  ]);
  const byId = new Map();
  for (const e of [...(past.events || []), ...(next.events || []), ...(today.events || [])].map(mapEvent)) {
    if (teamId && e.home.id !== String(teamId) && e.away.id !== String(teamId)) continue;
    byId.set(e.id, { ...byId.get(e.id), ...e });
  }
  const ev = [...byId.values()].sort((a, b) => a.date.localeCompare(b.date));
  // some leagues (e.g. the Swiss Super League) are not updated by this source
  const newest = ev.length ? Date.parse(ev[ev.length - 1].date) : 0;
  const stale = !ev.length || Date.now() - newest > 60 * 86400000;
  return { league: LEAGUES[league] || league, events: stale ? [] : ev, stale };
}

// live goal alerts for the favourite team while Kairo runs
let lastScores = {};
async function pollLive(store, send) {
  const fav = store.get().football;
  if (!fav?.team?.id) return;
  try {
    const j = await (await fetch(`${ESPN}/${fav.league}/scoreboard`, { signal: AbortSignal.timeout(10000) })).json();
    for (const e of (j.events || []).map(mapEvent)) {
      if (e.home.id !== String(fav.team.id) && e.away.id !== String(fav.team.id)) continue;
      const score = `${e.home.score}:${e.away.score}`, prev = lastScores[e.id];
      lastScores[e.id] = score;
      if (e.state === 'in' && prev && prev !== score) {
        const msg = `⚽ ${e.home.name} ${score} ${e.away.name}`;
        try { new Notification({ title: 'Tor!', body: msg }).show(); } catch {}
        send('football:goal', { text: msg, event: e });
      }
    }
  } catch {}
}

function register({ ipcMain, wrap, store, send }) {
  ipcMain.handle('life:list', (_e, n) => list(n));
  ipcMain.handle('life:add', (_e, n, it) => add(n, it));
  ipcMain.handle('life:addMany', (_e, n, its) => addMany(n, its));
  ipcMain.handle('life:update', (_e, n, id, p) => update(n, id, p));
  ipcMain.handle('life:remove', (_e, n, id) => remove(n, id));
  ipcMain.handle('foot:leagues', () => LEAGUES);
  ipcMain.handle('foot:teams', wrap(async l => ({ teams: await teams(l) })));
  ipcMain.handle('foot:matches', wrap((l, t) => matches(l, t)));
  setInterval(() => pollLive(store, send), 60000);
  setTimeout(() => pollLive(store, send), 8000);
}

// short text for the AI about today's data (homework due soon, exams, money balance)
function promptText() {
  const d = load(), now = Date.now();
  const lines = [];
  const hw = (d.homework || []).filter(h => !h.done).sort((a, b) => (a.due || '').localeCompare(b.due || '')).slice(0, 8);
  if (hw.length) lines.push('Open homework: ' + hw.map(h => `${h.subject ? h.subject + ': ' : ''}${h.task}${h.due ? ' (due ' + h.due + ')' : ''}`).join('; '));
  const ex = (d.exams || []).filter(e => e.date && Date.parse(e.date) >= now - 86400000).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  if (ex.length) lines.push('Upcoming exams: ' + ex.map(e => `${e.subject} on ${e.date}${e.topic ? ' (' + e.topic + ')' : ''}`).join('; '));
  const money = d.money || [];
  if (money.length) lines.push('Pocket money balance: ' + money.reduce((s, m) => s + (+m.amount || 0), 0).toFixed(2) + ' CHF');
  return lines.join('\n');
}

module.exports = { register, list, add, update, remove, addMany, teams, matches, promptText, LEAGUES };
