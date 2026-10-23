// Chess board UI. Click a piece, then a highlighted square. Kairo (Stockfish) answers.
window.ChessUI = (function () {
  const $ = id => document.getElementById(id);
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const FILES = 'abcdefgh';
  const LEVELS = [[1, 'chess.l1'], [5, 'chess.l2'], [10, 'chess.l3'], [15, 'chess.l4'], [20, 'chess.l5']];
  let S = null, selected = null, hintMove = null, busy = false, auto = false, inited = false;

  const levelName = l => t([...LEVELS].reverse().find(([v]) => l >= v)[1]);

  function squareName(r, c) { return FILES[c] + (8 - r); }

  function render() {
    if (!S) return;
    const flip = S.color === 'b';
    const kingInCheck = S.check ? findKing(S.turn) : null;
    const targets = new Set(selected ? S.legal[selected] || [] : []);
    let html = '';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const r = flip ? 7 - i : i, c = flip ? 7 - j : j;
      const sq = squareName(r, c), p = S.board[r][c];
      const cls = ['sq', (r + c) % 2 ? 'dark' : 'light'];
      if (S.lastMove && (S.lastMove.from === sq || S.lastMove.to === sq)) cls.push('last');
      if (selected === sq) cls.push('sel');
      if (hintMove && (hintMove.from === sq || hintMove.to === sq)) cls.push('hint');
      if (kingInCheck === sq) cls.push('check');
      if (targets.has(sq)) cls.push(p ? 'capture' : 'target');
      const coordF = i === 7 ? `<i class="cf">${FILES[c]}</i>` : '', coordR = j === 0 ? `<i class="cr">${8 - r}</i>` : '';
      const piece = p ? `<span class="pc ${p[0] === 'w' ? 'w' : 'b'} ${S.lastMove?.to === sq ? 'moved' : ''}">${GLYPH[p[1]]}</span>` : '';
      html += `<div class="${cls.join(' ')}" data-sq="${sq}">${piece}${coordF}${coordR}</div>`;
    }
    $('chessBoard').innerHTML = html;

    // eval bar (white's share)
    const ev = S.mateIn != null ? (S.mateIn > 0 ? 10 : -10) : Math.max(-10, Math.min(10, S.evalWhite || 0));
    const white = 50 + 50 * Math.tanh(ev / 4);
    $('chessEvalFill').style.height = (flip ? 100 - white : white) + '%';
    $('chessEvalFill').classList.toggle('flip', flip);
    $('chessEvalTxt').textContent = S.mateIn != null ? `M${Math.abs(S.mateIn)}` : (S.evalWhite > 0 ? '+' : '') + (S.evalWhite || 0).toFixed(1);

    // moves list
    const h = S.history;
    let list = '';
    for (let k = 0; k < h.length; k += 2) list += `<li><b>${k / 2 + 1}.</b> ${h[k]} ${h[k + 1] || ''}</li>`;
    $('chessMoves').innerHTML = list;
    $('chessMoves').scrollTop = 1e9;

    $('chessLevelName').textContent = `${levelName(S.level)} · ${S.level}`;
    $('chessLevel').value = S.level;
    $('chessColor').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.c === S.color));

    let st;
    if (S.over) st = S.result === '½-½' ? t('games.draw') : ((S.result === '1-0') === (S.color === 'w') ? t('games.youwin') : t('games.aiwins'));
    else if (busy) st = t('status.thinking');
    else st = (S.turn === S.color ? t('games.yourturn') : t('status.thinking')) + (S.check ? ' · ' + t('chess.check') : '');
    $('chessStatus').textContent = st;
  }

  function findKing(color) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (S.board[r][c] === color + 'k') return squareName(r, c);
    return null;
  }

  async function call(p) {
    busy = true; render();
    const r = await p;
    busy = false;
    S = r; selected = null;
    if (!r.ok && r.error) toast(r.error.message);
    render();
    return r;
  }

  async function onClick(e) {
    const el = e.target.closest('.sq'); if (!el || busy || !S || S.over || S.turn !== S.color) return;
    const sq = el.dataset.sq;
    if (selected && (S.legal[selected] || []).includes(sq)) {
      const from = selected; hintMove = null;
      // show the player's move right away, then wait for Kairo
      selected = null;
      await call(window.kairo.chess.move({ from, to: sq }));
      return;
    }
    selected = S.legal[sq] ? sq : null;
    render();
  }

  async function autoplay() {
    while (auto && S && !S.over && document.getElementById('view-games').classList.contains('active')) {
      await call(window.kairo.chess.step());
      await new Promise(r => setTimeout(r, 450));
    }
    auto = false; $('chessAuto').classList.remove('on');
  }

  async function explain() {
    const desc = await window.kairo.chess.describe();
    window.App.askInChat(t('chess.explainQ') + '\n\n' + desc);
  }

  async function init() {
    if (inited) return refresh();
    inited = true;
    $('chessBoard').onclick = onClick;
    $('chessNew').onclick = () => { hintMove = null; auto = false; call(window.kairo.chess.newGame({ color: S?.color || 'w', level: +$('chessLevel').value })); };
    $('chessColor').querySelectorAll('button').forEach(b => b.onclick = () => { hintMove = null; call(window.kairo.chess.newGame({ color: b.dataset.c, level: +$('chessLevel').value })); });
    $('chessLevel').oninput = e => { $('chessLevelName').textContent = `${levelName(+e.target.value)} · ${e.target.value}`; };
    $('chessLevel').onchange = e => call(window.kairo.chess.level(+e.target.value));
    $('chessHint').onclick = async () => { const r = await call(window.kairo.chess.hint()); hintMove = r.hint; render(); if (r.hint) toast('💡 ' + r.hint.san); };
    $('chessForMe').onclick = () => { hintMove = null; call(window.kairo.chess.forMe()); };
    $('chessUndo').onclick = () => { hintMove = null; call(window.kairo.chess.undo()); };
    $('chessAuto').onclick = () => { auto = !auto; $('chessAuto').classList.toggle('on', auto); if (auto) autoplay(); };
    $('chessExplain').onclick = explain;
    const r = await window.kairo.chess.state();
    S = r;
    if (!r.history.length && !r.lastMove) await call(window.kairo.chess.newGame({ color: 'w', level: 8 }));
    render();
  }

  async function refresh() { S = await window.kairo.chess.state(); render(); }

  return { init, refresh, set: s => { S = s; selected = null; hintMove = null; render(); } };
})();
