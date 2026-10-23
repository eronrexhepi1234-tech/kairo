// Kairo as an official Lichess BOT (https://lichess.org/api#tag/Bot).
// Uses its OWN bot account — never the user's normal account, so it is allowed and fair.
const { Chess } = require('chess.js');
const { createEngine } = require('./chess');

const API = 'https://lichess.org';
let ctl = null;           // AbortController for the event stream
let engine = null;
let status = { running: false, account: null, game: null, log: [] };
let ctx = null;           // { store, send }

const token = () => ctx.store.get().keys.lichess;
const H = () => ({ authorization: 'Bearer ' + token() });

function log(text, extra = {}) {
  const e = { time: Date.now(), text, ...extra };
  status.log.unshift(e);
  status.log = status.log.slice(0, 60);
  ctx.send('lichess:event', { ...e, status: publicStatus() });
}
const publicStatus = () => ({ running: status.running, account: status.account, game: status.game });

async function api(path, opts = {}) {
  const res = await fetch(API + path, { ...opts, headers: { ...H(), ...(opts.headers || {}) } });
  if (!res.ok) {
    let msg = res.statusText; try { const j = await res.json(); msg = j.error || JSON.stringify(j); } catch {}
    throw Object.assign(new Error(`Lichess ${res.status}: ${msg}`), { status: res.status });
  }
  return res;
}
const form = obj => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(obj).toString() });

// newline-delimited JSON stream
async function* ndjson(res) {
  const dec = new TextDecoder(); let buf = '';
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (line) { try { yield JSON.parse(line); } catch {} }
    }
  }
}

async function account() {
  const j = await (await api('/api/account')).json();
  return { id: j.id, username: j.username, bot: j.title === 'BOT', games: j.count?.all || 0, ratings: Object.fromEntries(Object.entries(j.perfs || {}).filter(([, p]) => p.games).map(([k, p]) => [k, p.rating])) };
}

// Turns a fresh account into a bot account. Lichess allows this only for accounts with 0 games; it can't be undone.
async function upgrade() { await api('/api/bot/account/upgrade', { method: 'POST' }); return account(); }

function shouldAccept(ch) {
  const s = ctx.store.get().lichess;
  if (ch.variant?.key !== 'standard') return 'standard';
  if (ch.speed === 'correspondence') return 'tooSlow';
  if (status.game) return 'later';
  if (s.acceptFrom && s.acceptFrom !== 'all' && ch.challenger?.id !== s.acceptFrom.toLowerCase()) return 'generic';
  return null;
}

async function playGame(gameId) {
  const me = status.account.id;
  const res = await api(`/api/bot/game/stream/${gameId}`, { signal: ctl.signal });
  let color = null, opponent = '?', initialFen = 'startpos';
  for await (const ev of ndjson(res)) {
    let state;
    if (ev.type === 'gameFull') {
      color = ev.white?.id === me ? 'w' : 'b';
      opponent = (color === 'w' ? ev.black : ev.white)?.name || (color === 'w' ? ev.black : ev.white)?.aiLevel && 'Stockfish AI' || '?';
      initialFen = ev.initialFen || 'startpos';
      status.game = { id: gameId, color, opponent, url: `${API}/${gameId}` };
      log(`Spiel gegen ${opponent} gestartet (${color === 'w' ? 'Weiss' : 'Schwarz'})`, { gameId });
      api(`/api/bot/game/${gameId}/chat`, form({ room: 'player', text: 'Hi! I am KairoBot, powered by Stockfish. Good luck & have fun! 🤖' })).catch(() => {});
      state = ev.state;
    } else if (ev.type === 'gameState') state = ev;
    else continue;

    const chess = initialFen === 'startpos' ? new Chess() : new Chess(initialFen);
    const moves = (state.moves || '').split(' ').filter(Boolean);
    for (const m of moves) { try { chess.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); } catch {} }
    ctx.send('lichess:event', { time: Date.now(), board: chess.fen(), status: publicStatus() });

    if (state.status !== 'started' && state.status !== 'created') {
      const won = state.winner ? (state.winner === (color === 'w' ? 'white' : 'black')) : null;
      log(`Spiel vorbei: ${state.status}${won === null ? '' : won ? ' – Kairo gewinnt 🏆' : ' – Kairo verliert'}`, { gameId });
      api(`/api/bot/game/${gameId}/chat`, form({ room: 'player', text: 'gg! Thanks for the game 🙂' })).catch(() => {});
      break;
    }
    if (chess.turn() !== color || chess.isGameOver()) continue;

    // think time from the clock: about 1/40 of what's left, between 0.3 s and 6 s
    const left = color === 'w' ? state.wtime : state.btime;
    const inc = color === 'w' ? state.winc : state.binc;
    const level = ctx.store.get().lichess.level || 12;
    const movetime = Math.max(300, Math.min(6000, (left ? left / 40 : 2000) + (inc || 0) * 0.6));
    try {
      const { move } = await engine.search(chess.fen(), { skill: level, movetime: Math.round(movetime), depth: level < 6 ? 6 : 22 });
      await api(`/api/bot/game/${gameId}/move/${move}`, { method: 'POST' });
    } catch (e) { log('Zug-Fehler: ' + e.message, { gameId }); }
  }
  status.game = null;
  ctx.send('lichess:event', { time: Date.now(), status: publicStatus() });
}

async function start() {
  if (status.running) return publicStatus();
  if (!token()) throw new Error('Kein Lichess-Token gespeichert');
  status.account = await account();
  if (!status.account.bot) throw Object.assign(new Error('Dieses Konto ist noch kein Bot-Konto'), { code: 'NOT_BOT', account: status.account });
  engine ||= createEngine();
  ctl = new AbortController();
  status.running = true;
  log(`Online als ${status.account.username} – wartet auf Herausforderungen`);
  (async () => {
    try {
      const res = await api('/api/stream/event', { signal: ctl.signal });
      for await (const ev of ndjson(res)) {
        if (ev.type === 'challenge') {
          const ch = ev.challenge;
          if (ch.challenger?.id === status.account.id) continue; // our own outgoing challenge
          const reason = shouldAccept(ch);
          if (reason) { api(`/api/challenge/${ch.id}/decline`, form({ reason })).catch(() => {}); log(`Herausforderung von ${ch.challenger?.name} abgelehnt (${reason})`); }
          else { api(`/api/challenge/${ch.id}/accept`, { method: 'POST' }).catch(e => log(e.message)); log(`Herausforderung von ${ch.challenger?.name} angenommen (${ch.timeControl?.show || ch.speed})`); }
        }
        if (ev.type === 'gameStart') playGame(ev.game.gameId || ev.game.id).catch(e => { status.game = null; log('Spiel-Fehler: ' + e.message); });
      }
    } catch (e) { if (e.name !== 'AbortError') log('Verbindung getrennt: ' + e.message); }
    status.running = false;
    ctx.send('lichess:event', { time: Date.now(), status: publicStatus() });
  })();
  return publicStatus();
}

function stop() { ctl?.abort(); status.running = false; log('Offline'); return publicStatus(); }

// Kairo challenges someone (a person or another bot) to a casual game.
async function challenge(username, minutes = 5, increment = 3) {
  const j = await (await api(`/api/challenge/${encodeURIComponent(username)}`, form({ rated: 'false', 'clock.limit': String(minutes * 60), 'clock.increment': String(increment), color: 'random', variant: 'standard' }))).json();
  log(`Herausforderung an ${username} gesendet`);
  return { id: j.challenge?.id || j.id, url: j.challenge?.url || j.url };
}

async function onlineBots() {
  const res = await fetch(API + '/api/bot/online?nb=30');
  const out = [];
  for await (const b of ndjson(res)) out.push({ id: b.id, name: b.username, blitz: b.perfs?.blitz?.rating, bullet: b.perfs?.bullet?.rating });
  return out;
}

function register({ ipcMain, store, send, wrap }) {
  ctx = { store, send };
  ipcMain.handle('lichess:account', wrap(account));
  ipcMain.handle('lichess:upgrade', wrap(upgrade));
  ipcMain.handle('lichess:start', wrap(start));
  ipcMain.handle('lichess:stop', wrap(stop));
  ipcMain.handle('lichess:challenge', wrap((u, m, i) => challenge(u, m, i)));
  ipcMain.handle('lichess:bots', wrap(async () => ({ bots: await onlineBots() })));
  ipcMain.handle('lichess:status', () => ({ ...publicStatus(), log: status.log }));
  if (store.get().lichess.enabled && store.get().keys.lichess) setTimeout(() => start().catch(e => log('Start fehlgeschlagen: ' + e.message)), 4000);
}

module.exports = { register };
