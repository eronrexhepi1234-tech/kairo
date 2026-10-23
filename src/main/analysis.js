// Loads the user's real games from Lichess or Chess.com and finds mistakes with Stockfish.
const { Chess } = require('chess.js');
const { createEngine } = require('./chess');

let engine = null;
let cancel = false;

async function lichessGames(user, max = 15) {
  const res = await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${max}&moves=true&opening=true`, { headers: { accept: 'application/x-ndjson' }, signal: AbortSignal.timeout(20000) });
  if (res.status === 404) throw new Error('Lichess-Benutzer nicht gefunden');
  if (!res.ok) throw new Error('Lichess ' + res.status);
  const lines = (await res.text()).split('\n').filter(Boolean).map(l => JSON.parse(l));
  return lines.filter(g => g.variant === 'standard' && g.moves).map(g => {
    const w = g.players.white, b = g.players.black;
    const name = p => p.user?.name || (p.aiLevel ? `Stockfish ${p.aiLevel}` : '?');
    const color = (w.user?.id || '').toLowerCase() === user.toLowerCase() ? 'w' : 'b';
    return {
      id: 'li-' + g.id, site: 'lichess', url: `https://lichess.org/${g.id}`, date: g.createdAt, speed: g.speed,
      white: name(w), black: name(b), whiteRating: w.rating, blackRating: b.rating, color,
      result: g.winner ? (g.winner === (color === 'w' ? 'white' : 'black') ? 'win' : 'loss') : 'draw',
      opening: g.opening?.name || '', san: g.moves.split(' ')
    };
  });
}

async function chesscomGames(user, max = 15) {
  const u = user.toLowerCase();
  const ar = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`, { headers: { 'user-agent': 'Kairo-Desktop/0.1' }, signal: AbortSignal.timeout(20000) });
  if (ar.status === 404) throw new Error('Chess.com-Benutzer nicht gefunden');
  const archives = (await ar.json()).archives || [];
  const games = [];
  for (const url of archives.slice(-3).reverse()) {
    const j = await (await fetch(url, { headers: { 'user-agent': 'Kairo-Desktop/0.1' } })).json();
    games.push(...(j.games || []).reverse());
    if (games.length >= max) break;
  }
  return games.filter(g => g.rules === 'chess' && g.pgn).slice(0, max).map(g => {
    const c = new Chess();
    try { c.loadPgn(g.pgn); } catch { return null; }
    const color = g.white.username.toLowerCase() === u ? 'w' : 'b';
    const me = color === 'w' ? g.white : g.black;
    const eco = (g.pgn.match(/\[ECOUrl "[^"]*\/([^"]+)"\]/) || [])[1]?.replace(/-/g, ' ') || '';
    return {
      id: 'cc-' + g.uuid, site: 'chess.com', url: g.url, date: g.end_time * 1000, speed: g.time_class,
      white: g.white.username, black: g.black.username, whiteRating: g.white.rating, blackRating: g.black.rating, color,
      result: me.result === 'win' ? 'win' : ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(me.result) ? 'draw' : 'loss',
      opening: eco, san: c.history()
    };
  }).filter(Boolean);
}

// eval in pawns from White's view; mate counts as ±10
const toWhite = (score, turn) => {
  if (!score) return 0;
  const v = score.mate != null ? (score.mate > 0 ? 10 : -10) : Math.max(-10, Math.min(10, score.cp / 100));
  return turn === 'w' ? v : -v;
};

async function analyze(game, onProgress) {
  engine ||= createEngine();
  cancel = false;
  const c = new Chess();
  const fens = [c.fen()];
  for (const s of game.san) { c.move(s); fens.push(c.fen()); }
  const evals = [], bests = [];
  for (let i = 0; i < fens.length; i++) {
    if (cancel) throw new Error('Abgebrochen');
    const pos = new Chess(fens[i]);
    if (pos.isGameOver()) { evals.push(pos.isCheckmate() ? (pos.turn() === 'w' ? -10 : 10) : 0); bests.push(null); continue; }
    const { move, score } = await engine.search(fens[i], { skill: 20, movetime: 250, depth: 12 });
    evals.push(toWhite(score, pos.turn()));
    let san = null; try { san = pos.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] || 'q' }).san; } catch {}
    bests.push(san ? { san, from: move.slice(0, 2), to: move.slice(2, 4) } : null);
    onProgress?.(Math.round(((i + 1) / fens.length) * 100));
  }
  // Same idea as Lichess: compare winning chances (0-100 %) instead of raw pawns,
  // so small engine wobbles in equal positions don't count as mistakes.
  const winPct = pawns => 50 + 50 * (2 / (1 + Math.exp(-0.368208 * pawns)) - 1);
  const moves = game.san.map((san, i) => {
    const color = i % 2 === 0 ? 'w' : 'b';
    const before = evals[i], after = evals[i + 1];
    const wb = color === 'w' ? winPct(before) : 100 - winPct(before);
    const wa = color === 'w' ? winPct(after) : 100 - winPct(after);
    const drop = bests[i]?.san === san ? 0 : Math.max(0, wb - wa);
    const tag = bests[i]?.san === san ? 'best' : drop >= 30 ? 'blunder' : drop >= 20 ? 'mistake' : drop >= 10 ? 'inaccuracy' : null;
    const moveAcc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));
    return { ply: i + 1, san, color, fen: fens[i + 1], fenBefore: fens[i], eval: after, loss: +drop.toFixed(1), acc: moveAcc, best: bests[i], tag };
  });
  const mine = moves.filter(m => m.color === game.color);
  const accuracy = Math.round(mine.reduce((s, m) => s + m.acc, 0) / Math.max(1, mine.length));
  const count = t => mine.filter(m => m.tag === t).length;
  return { moves, evals, accuracy, blunders: count('blunder'), mistakes: count('mistake'), inaccuracies: count('inaccuracy') };
}

function register({ ipcMain, wrap }) {
  ipcMain.handle('analysis:games', wrap(async (site, user) => ({ games: site === 'chess.com' ? await chesscomGames(user) : await lichessGames(user) })));
  ipcMain.handle('analysis:run', wrap(async game => analyze(game, p => {
    const { BrowserWindow } = require('electron');
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('analysis:progress', p);
  })));
  ipcMain.handle('analysis:cancel', () => { cancel = true; });
}

module.exports = { register, lichessGames, chesscomGames, analyze };
