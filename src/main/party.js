// Quiz party: questions on the PC, friends answer on their phones (same Wi-Fi).
// Players only get a party code; it opens nothing else of Kairo.
const crypto = require('crypto');

const QTIME = 20000;
let party = null; // { code, questions, players: Map, phase, index, endsAt, answers: Map, timer }

const newCode = () => String(crypto.randomInt(1000, 10000));
const pub = p => ({ id: p.id, name: p.name, score: p.score, last: p.last });

function create(questions) {
  clearTimeout(party?.timer);
  party = { code: newCode(), questions, players: new Map(), phase: 'lobby', index: -1, endsAt: 0, answers: new Map(), timer: null };
  return hostState();
}

function startQuestion() {
  if (!party) return;
  party.index++;
  if (party.index >= party.questions.length) { party.phase = 'end'; return; }
  party.phase = 'question';
  party.answers = new Map();
  party.endsAt = Date.now() + QTIME;
  clearTimeout(party.timer);
  party.timer = setTimeout(reveal, QTIME + 300);
}

function reveal() {
  if (!party || party.phase !== 'question') return;
  clearTimeout(party.timer);
  const q = party.questions[party.index];
  for (const p of party.players.values()) {
    const a = party.answers.get(p.id);
    const right = a && a.choice === q.answer;
    const gained = right ? 500 + Math.round(500 * Math.max(0, (party.endsAt - a.at) / QTIME)) : 0;
    p.score += gained;
    p.last = a ? (right ? gained : 0) : null;
  }
  party.phase = 'reveal';
}

function next() { if (!party) return null; if (party.phase === 'question') reveal(); else startQuestion(); return hostState(); }

function hostState() {
  if (!party) return null;
  const q = party.questions[party.index];
  return {
    code: party.code, phase: party.phase, index: party.index, total: party.questions.length, endsAt: party.endsAt,
    question: q ? { text: q.q, options: q.options, answer: party.phase === 'reveal' ? q.answer : null, fact: party.phase === 'reveal' ? q.fact : null } : null,
    answered: party.answers.size,
    players: [...party.players.values()].map(pub).sort((a, b) => b.score - a.score)
  };
}

// requests from phones: /party/join, /party/state, /party/answer
function handle(action, params, body) {
  const code = String(body.code || params.get('code') || '');
  if (!party || code !== party.code) throw new Error('Party nicht gefunden – Code prüfen');
  if (action === 'join') {
    const name = String(body.name || '').trim().slice(0, 16) || 'Spieler';
    if (party.players.size >= 30) throw new Error('Party ist voll');
    const id = crypto.randomBytes(6).toString('hex');
    party.players.set(id, { id, name, score: 0, last: null });
    return { pid: id };
  }
  const me = party.players.get(String(body.pid || params.get('pid') || ''));
  if (!me) throw new Error('Bitte neu beitreten');
  if (action === 'answer') {
    if (party.phase !== 'question' || Date.now() > party.endsAt) return { ok: false };
    if (!party.answers.has(me.id)) party.answers.set(me.id, { choice: +body.choice, at: Date.now() });
    if (party.answers.size >= party.players.size) setTimeout(reveal, 400); // everyone answered
    return { ok: true };
  }
  if (action === 'state') {
    const q = party.questions[party.index];
    const rank = [...party.players.values()].sort((a, b) => b.score - a.score).findIndex(p => p.id === me.id) + 1;
    return {
      phase: party.phase, index: party.index, total: party.questions.length, endsAt: party.endsAt, now: Date.now(),
      options: party.phase === 'question' ? q.options.length : 0, answered: party.answers.has(me.id),
      correct: party.phase === 'reveal' ? q.answer : null, myChoice: party.answers.get(me.id)?.choice ?? null,
      you: { name: me.name, score: me.score, last: me.last, rank, of: party.players.size }
    };
  }
  throw new Error('unknown');
}

function end() { clearTimeout(party?.timer); party = null; }

module.exports = { create, next, hostState, handle, end };
