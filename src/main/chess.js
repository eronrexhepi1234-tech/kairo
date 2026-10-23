// Chess: rules from chess.js, moves from the Stockfish engine (runs inside the app, no internet needed).
const path = require('path');
const { Chess } = require('chess.js');

// One Stockfish instance. Requests are queued so callers never mix up answers.
const SF_PATH = path.join(__dirname, '..', '..', 'node_modules', 'stockfish', 'src', 'stockfish.js');
function createEngine() {
  // the module changes itself after loading, so load a fresh copy for every engine
  delete require.cache[require.resolve(SF_PATH)];
  const sf = require(SF_PATH)();
  let pending = null, queue = Promise.resolve();
  sf.onmessage = raw => {
    const line = typeof raw === 'string' ? raw : raw?.data;
    if (!line || !pending) return;
    const sc = line.match(/ score (cp|mate) (-?\d+)/);
    if (sc) pending.score = sc[1] === 'cp' ? { cp: +sc[2] } : { mate: +sc[2] };
    const bm = line.match(/^bestmove (\S+)/);
    if (bm) { const p = pending; pending = null; p.resolve({ move: bm[1], score: p.score }); }
  };
  sf.postMessage('uci');
  // opts: { skill 0-20, movetime ms, depth }
  function search(fen, { skill = 20, movetime = 1000, depth = 18 } = {}) {
    const run = () => new Promise(resolve => {
      pending = { resolve, score: null };
      sf.postMessage(`setoption name Skill Level value ${skill}`);
      sf.postMessage(`position fen ${fen}`);
      sf.postMessage(`go movetime ${movetime} depth ${depth}`);
    });
    const p = queue.then(run);
    queue = p.catch(() => {});
    return p;
  }
  return { search };
}

let engine = null;
// level 1..20 -> engine strength. Low levels also think shorter.
function bestMove(fen, level = 10) {
  engine ||= createEngine();
  const skill = Math.max(0, Math.min(20, level));
  return engine.search(fen, { skill, movetime: 200 + skill * 60, depth: skill < 5 ? 4 : skill < 12 ? 10 : 18 });
}

const game = { chess: new Chess(), color: 'w', level: 8, lastMove: null, evalWhite: 0, mateIn: null };

function state() {
  const c = game.chess;
  const legal = {};
  for (const m of c.moves({ verbose: true })) (legal[m.from] ||= []).push(m.to);
  let result = null;
  if (c.isCheckmate()) result = c.turn() === 'w' ? '0-1' : '1-0';
  else if (c.isDraw() || c.isStalemate() || c.isThreefoldRepetition() || c.isInsufficientMaterial()) result = '½-½';
  return {
    fen: c.fen(), turn: c.turn(), color: game.color, level: game.level,
    history: c.history(), lastMove: game.lastMove, check: c.inCheck(),
    over: c.isGameOver(), result, legal,
    board: c.board().map(row => row.map(p => p ? p.color + p.type : null)),
    evalWhite: game.evalWhite, mateIn: game.mateIn
  };
}

function setEval(score, sideToMove) {
  if (!score) return;
  const sign = sideToMove === 'w' ? 1 : -1;
  if (score.mate != null) { game.mateIn = score.mate * sign; game.evalWhite = sign * (score.mate > 0 ? 99 : -99); }
  else { game.mateIn = null; game.evalWhite = (score.cp * sign) / 100; }
}

function applyUci(uci) {
  const m = game.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
  game.lastMove = { from: m.from, to: m.to, san: m.san };
  return m;
}

async function engineMove() {
  if (game.chess.isGameOver()) return null;
  const side = game.chess.turn();
  const { move, score } = await bestMove(game.chess.fen(), game.level);
  setEval(score, side);
  return applyUci(move);
}

async function newGame({ color = 'w', level } = {}) {
  game.chess = new Chess();
  game.color = color === 'b' || color === 'black' ? 'b' : 'w';
  if (level) game.level = Math.max(1, Math.min(20, +level));
  game.lastMove = null; game.evalWhite = 0; game.mateIn = null;
  let reply = null;
  if (game.color === 'b') reply = await engineMove();
  return { ...state(), reply: reply?.san || null };
}

// Player move: { from, to, promotion } or a text move like "e4", "Nf3", "e2e4".
async function playerMove(mv) {
  const c = game.chess;
  if (c.turn() !== game.color) throw new Error('Not your turn');
  let m;
  try {
    if (typeof mv === 'string') {
      const s = mv.trim().replace(/\s+/g, '');
      m = /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(s) ? c.move({ from: s.slice(0, 2), to: s.slice(2, 4), promotion: s[4] || 'q' }) : c.move(s);
    } else m = c.move({ ...mv, promotion: mv.promotion || 'q' });
  } catch { throw new Error('Illegal move: ' + (typeof mv === 'string' ? mv : mv.from + mv.to)); }
  game.lastMove = { from: m.from, to: m.to, san: m.san };
  const reply = await engineMove();
  return { ...state(), played: m.san, reply: reply?.san || null };
}

// "Kairo plays for me": best move for the player's side, then the engine answers.
async function playForMe() {
  if (game.chess.turn() !== game.color || game.chess.isGameOver()) return state();
  const keep = game.level;
  game.level = 20;
  const m = await engineMove();
  game.level = keep;
  const reply = await engineMove();
  return { ...state(), played: m?.san, reply: reply?.san || null };
}

// One move for whoever is to move (used for Kairo vs Kairo).
async function step() { const m = await engineMove(); return { ...state(), played: m?.san }; }

async function hint() {
  const side = game.chess.turn();
  const { move, score } = await bestMove(game.chess.fen(), 20);
  setEval(score, side);
  const probe = new Chess(game.chess.fen());
  const m = probe.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] || 'q' });
  return { ...state(), hint: { from: m.from, to: m.to, san: m.san } };
}

function undo() {
  game.chess.undo();
  if (game.chess.turn() !== game.color) game.chess.undo();
  const h = game.chess.history({ verbose: true });
  const last = h[h.length - 1];
  game.lastMove = last ? { from: last.from, to: last.to, san: last.san } : null;
  return state();
}

function setLevel(level) { game.level = Math.max(1, Math.min(20, +level)); return state(); }

// Text version for the voice assistant.
function describe() {
  const s = state();
  return `FEN: ${s.fen}\nPlayer is ${s.color === 'w' ? 'White' : 'Black'}. ${s.turn === s.color ? "Player's turn" : "Kairo's turn"}.\n` +
    `Moves: ${s.history.join(' ') || '(none)'}\n${s.over ? 'Game over: ' + s.result : ''}\n${game.chess.ascii()}`;
}

module.exports = { createEngine, newGame, playerMove, playForMe, step, hint, undo, setLevel, state, describe };
