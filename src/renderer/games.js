// Games: the screen coach for real games, plus two mini games Kairo can play with (or for) you.
window.Games = (function () {
  const $ = id => document.getElementById(id);
  const PROFILES = [
    { id: 'geoguessr', icon: '🌍', name: 'GeoGuessr', sub: 'Country + coordinates' },
    { id: 'chess', icon: '♞', name: 'Chess', sub: 'Next move & plan' },
    { id: 'minecraft', icon: '⛏', name: 'Minecraft', sub: 'What to do next' },
    { id: 'wordle', icon: '🟩', name: 'Wordle', sub: 'Best next guess' },
    { id: 'sudoku', icon: '#', name: 'Sudoku', sub: 'One logical step' },
    { id: 'strategy', icon: '⚔', name: 'Strategy / MOBA', sub: 'Tips for right now' },
    { id: 'quiz', icon: '?', name: 'Quiz / Trivia', sub: 'Likely answer' },
    { id: 'general', icon: '🎮', name: 'Any game', sub: 'What\'s going on' }
  ];
  let profile = 'geoguessr', watchTimer = null, busy = false;

  // ---------- Coach ----------
  function renderGrid() {
    $('gameGrid').innerHTML = PROFILES.map(p => `
      <button class="game-card ${p.id === profile ? 'active' : ''}" data-p="${p.id}">
        <span class="gico">${p.icon}</span><b>${p.name}</b><small>${p.sub}</small>
      </button>`).join('');
    $('gameGrid').querySelectorAll('.game-card').forEach(b => b.onclick = () => { profile = b.dataset.p; renderGrid(); });
  }

  async function analyze() {
    if (busy) return;
    busy = true;
    const out = $('coachResult');
    out.innerHTML = `<div class="msg-status">${t('status.screen')}</div>`;
    const r = await window.kairo.coach.analyze({ profile, question: $('coachQuestion').value.trim() });
    busy = false;
    if (!r.ok) { out.innerHTML = `<p class="msg error">${r.error.code === 'NO_KEY' ? t('err.nokey') : escAttr(r.error.message)}</p>`; return; }
    if (r.data && profile === 'geoguessr') {
      const d = r.data;
      out.innerHTML = `
        <div class="coach-card">
          <div class="geo-head"><span class="geo-country">${escAttr(d.country || '?')}</span><span class="geo-region">${escAttr(d.region || '')}</span></div>
          <div class="geo-coords">${(+d.lat).toFixed(3)}°, ${(+d.lng).toFixed(3)}°</div>
          <small class="muted">${t('games.confidence')} ${d.confidence ?? '?'}%</small>
          <div class="conf"><i style="width:${Math.max(4, Math.min(100, d.confidence || 0))}%"></i></div>
          <ul class="clues">${(d.clues || []).map((c, i) => `<li style="animation-delay:${i * 60}ms">${escAttr(c)}</li>`).join('')}</ul>
          ${d.tip ? `<p class="note">${escAttr(d.tip)}</p>` : ''}
          <button class="btn primary" id="geoShow"><svg><use href="#i-pin"/></svg>${t('games.showEarth')}</button>
        </div>`;
      $('geoShow').onclick = () => { window.App.go('earth'); setTimeout(() => Earth.flyTo(+d.lat, +d.lng, 0.9, d.region || d.country), 150); };
    } else {
      out.innerHTML = `<div class="coach-card md">${renderMarkdown(r.raw)}</div>`;
    }
  }

  // ---------- Mini games ----------
  let game = 'ttt', board = [], turn = 1, over = false, score = { you: 0, ai: 0, draw: 0 };
  // player 1 = you (X / orange), player 2 = Kairo

  const TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function tttWinner(b) {
    for (const l of TTT_LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { p: b[l[0]], cells: l };
    return b.every(Boolean) ? { p: 0, cells: [] } : null;
  }
  function tttBest(b, me) {
    const other = 3 - me;
    let best = { score: -Infinity, move: -1 };
    for (let i = 0; i < 9; i++) if (!b[i]) {
      b[i] = me;
      const s = -tttNegamax(b, other, 1);
      b[i] = 0;
      if (s > best.score) best = { score: s, move: i };
    }
    return best.move;
  }
  function tttNegamax(b, p, depth) {
    const w = tttWinner(b);
    if (w) return w.p === 0 ? 0 : (w.p === p ? 10 - depth : depth - 10);
    let best = -Infinity;
    for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = p; best = Math.max(best, -tttNegamax(b, 3 - p, depth + 1)); b[i] = 0; }
    return best;
  }

  const C4W = 7, C4H = 6;
  function c4Drop(b, col, p) { for (let r = C4H - 1; r >= 0; r--) if (!b[r * C4W + col]) { b[r * C4W + col] = p; return r; } return -1; }
  function c4Undo(b, col) { for (let r = 0; r < C4H; r++) if (b[r * C4W + col]) { b[r * C4W + col] = 0; return; } }
  function c4Winner(b) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < C4H; r++) for (let c = 0; c < C4W; c++) {
      const p = b[r * C4W + c]; if (!p) continue;
      for (const [dr, dc] of dirs) {
        const cells = [0,1,2,3].map(k => [r + dr * k, c + dc * k]);
        if (cells.every(([rr, cc]) => rr >= 0 && rr < C4H && cc >= 0 && cc < C4W && b[rr * C4W + cc] === p)) return { p, cells: cells.map(([rr, cc]) => rr * C4W + cc) };
      }
    }
    return b.every(Boolean) ? { p: 0, cells: [] } : null;
  }
  function c4Eval(b, p) {
    let s = 0;
    for (let r = 0; r < C4H; r++) s += (b[r * C4W + 3] === p ? 3 : b[r * C4W + 3] ? -3 : 0);
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < C4H; r++) for (let c = 0; c < C4W; c++) for (const [dr, dc] of dirs) {
      let mine = 0, theirs = 0, ok = true;
      for (let k = 0; k < 4; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || rr >= C4H || cc < 0 || cc >= C4W) { ok = false; break; }
        const v = b[rr * C4W + cc]; if (v === p) mine++; else if (v) theirs++;
      }
      if (!ok || (mine && theirs)) continue;
      s += [0, 1, 4, 20, 0][mine] - [0, 1, 5, 25, 0][theirs];
    }
    return s;
  }
  function c4Search(b, p, depth, alpha, beta) {
    const w = c4Winner(b);
    if (w) return w.p === 0 ? 0 : (w.p === p ? 10000 + depth : -10000 - depth);
    if (depth === 0) return c4Eval(b, p);
    for (const col of [3, 2, 4, 1, 5, 0, 6]) {
      if (b[col]) continue;
      c4Drop(b, col, p);
      const s = -c4Search(b, 3 - p, depth - 1, -beta, -alpha);
      c4Undo(b, col);
      if (s > alpha) alpha = s;
      if (alpha >= beta) break;
    }
    return alpha;
  }
  function c4Best(b, p) {
    let best = -Infinity, move = 3;
    for (const col of [3, 2, 4, 1, 5, 0, 6]) {
      if (b[col]) continue;
      c4Drop(b, col, p);
      const s = -c4Search(b, 3 - p, 5, -Infinity, Infinity);
      c4Undo(b, col);
      if (s > best) { best = s; move = col; }
    }
    return move;
  }

  function reset() {
    board = game === 'ttt' ? Array(9).fill(0) : Array(C4W * C4H).fill(0);
    turn = 1; over = false;
    draw(); status(t('games.yourturn'));
  }
  function status(s) { $('miniStatus').textContent = s; }
  function updateScore() { $('miniScore').textContent = `${score.you} : ${score.ai}  ·  ${score.draw}`; }

  function draw(lastIdx = -1) {
    const el = $('miniBoard');
    el.className = 'mini-board ' + game;
    const w = game === 'ttt' ? tttWinner(board) : c4Winner(board);
    const winCells = new Set(w?.cells || []);
    el.innerHTML = board.map((v, i) => {
      const inner = game === 'ttt' ? (v ? `<span class="${v === 1 ? 'x' : 'o'}">${v === 1 ? '×' : '○'}</span>` : '')
        : (v ? `<span class="disc p${v}" style="${i === lastIdx ? '' : 'animation:none'}"></span>` : '');
      return `<button class="cell ${winCells.has(i) ? 'win' : ''}" data-i="${i}">${inner}</button>`;
    }).join('');
    el.querySelectorAll('.cell').forEach(c => c.onclick = () => play(+c.dataset.i));
  }

  function place(idx) {
    if (game === 'ttt') { if (board[idx]) return -1; board[idx] = turn; return idx; }
    const col = idx % C4W;
    const r = c4Drop(board, col, turn);
    return r < 0 ? -1 : r * C4W + col;
  }

  function finish() {
    const w = game === 'ttt' ? tttWinner(board) : c4Winner(board);
    if (!w) return false;
    over = true;
    if (w.p === 1) { score.you++; status(t('games.youwin')); }
    else if (w.p === 2) { score.ai++; status(t('games.aiwins')); }
    else { score.draw++; status(t('games.draw')); }
    updateScore();
    return true;
  }

  function play(idx) {
    if (over || turn !== 1) return;
    const at = place(idx);
    if (at < 0) return;
    draw(at);
    if (finish()) return;
    turn = 2;
    status(t('status.thinking'));
    setTimeout(aiMove, 380);
  }

  function aiMove() {
    const m = game === 'ttt' ? tttBest(board, 2) : c4Best(board, 2);
    const at = place(m);
    draw(at);
    turn = 1;
    if (!finish()) status(t('games.yourturn'));
  }

  // "Kairo plays my move": picks the best move for you
  function playForMe() {
    if (over || turn !== 1) return;
    const m = game === 'ttt' ? tttBest(board, 1) : c4Best(board, 1);
    play(m);
  }

  function init() {
    renderGrid();
    $('coachGo').onclick = analyze;
    $('coachWatch').onchange = e => {
      clearInterval(watchTimer);
      if (e.target.checked) { analyze(); watchTimer = setInterval(analyze, 20000); }
    };
    $('coachOverlay').onchange = e => window.kairo.coach.overlay(e.target.checked);
    $('miniTabs').querySelectorAll('button').forEach(b => b.onclick = () => showGame(b.dataset.game));
    $('miniReset').onclick = reset;
    $('miniAI').onclick = playForMe;
    reset(); updateScore();
    showGame('chess');
  }

  function showGame(g) {
    $('miniTabs').querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.game === g));
    for (const [id, key] of [['chessArea', 'chess'], ['analysisArea', 'analysis'], ['lichessArea', 'lichess'], ['quizArea', 'quiz'], ['cardsArea', 'cards']]) $(id).hidden = g !== key;
    $('miniArea').hidden = !['ttt', 'c4'].includes(g);
    window.Fun?.showTab(g);
    if (g === 'geo') { Geo.start(); setTimeout(() => showGame('chess'), 50); return; }
    if (g === 'chess') ChessUI.init();
    else if (g === 'lichess') ChessExtra.renderLichess();
    else if (g === 'quiz') Quiz.init();
    else if (g === 'cards') Extras.cardsHome();
    else if (g === 'ttt' || g === 'c4') { game = g; reset(); }
  }

  return { init, showGame, refresh:() => { renderGrid(); if (!over) status(turn === 1 ? t('games.yourturn') : t('status.thinking')); } };
})();
