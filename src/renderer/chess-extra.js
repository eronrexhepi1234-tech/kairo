// Chess extras: analyse real games (Lichess / Chess.com) and run Kairo as a Lichess bot.
const ChessExtra = (function () {
  const $ = id => document.getElementById(id);
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const FILES = 'abcdefgh';

  // small read-only board from a FEN
  function boardHTML(fen, flip, hl = {}) {
    const rows = fen.split(' ')[0].split('/');
    const grid = rows.map(r => r.replace(/\d/g, d => '.'.repeat(+d)).split(''));
    let html = '';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const r = flip ? 7 - i : i, c = flip ? 7 - j : j;
      const sq = FILES[c] + (8 - r), p = grid[r][c];
      const cls = ['sq', (r + c) % 2 ? 'dark' : 'light'];
      if (hl.last && (hl.last.from === sq || hl.last.to === sq)) cls.push('last');
      if (hl.best && (hl.best.from === sq || hl.best.to === sq)) cls.push('hint');
      const piece = p !== '.' ? `<span class="pc ${p === p.toUpperCase() ? 'w' : 'b'}">${GLYPH[p.toLowerCase()]}</span>` : '';
      html += `<div class="${cls.join(' ')}">${piece}</div>`;
    }
    return `<div class="chess-board small">${html}</div>`;
  }

  // ================= Analysis =================
  let site = 'lichess', games = [], current = null, result = null;

  function initAnalysis() {
    $('anSite').querySelectorAll('button').forEach(b => b.onclick = () => { site = b.dataset.v; $('anSite').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); });
    try { const last = JSON.parse(localStorage.getItem('kairo.anUser') || 'null'); if (last) { $('anUser').value = last.user; site = last.site; $('anSite').querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.v === site)); } } catch {}
    $('anForm').onsubmit = async e => {
      e.preventDefault();
      const user = $('anUser').value.trim(); if (!user) return;
      try { localStorage.setItem('kairo.anUser', JSON.stringify({ user, site })); } catch {}
      $('anGames').innerHTML = `<div class="msg-status">${t('earth.loading')}</div>`; $('anResult').innerHTML = '';
      const r = await window.kairo.analysis.games(site, user);
      if (!r.ok) { $('anGames').innerHTML = `<p class="msg error">${escAttr(r.error.message)}</p>`; return; }
      games = r.games;
      $('anGames').innerHTML = games.length ? games.map((g, i) => {
        const opp = g.color === 'w' ? `${g.black} (${g.blackRating || '?'})` : `${g.white} (${g.whiteRating || '?'})`;
        const res = { win: ['W', 'win'], loss: ['L', 'loss'], draw: ['½', 'draw'] }[g.result];
        return `<button class="an-game" data-i="${i}" style="animation-delay:${i * 30}ms"><span class="an-res ${res[1]}">${res[0]}</span>
          <div><b>${t('an.vs')} ${escAttr(opp)}</b><small>${escAttr(g.speed || '')} · ${g.color === 'w' ? '♔' : '♚'} · ${escAttr(g.opening || '').slice(0, 40)} · ${new Date(g.date).toLocaleDateString('de-CH')}</small></div>
          <span class="an-go">${t('an.analyze')} →</span></button>`;
      }).join('') : `<p class="muted">${t('an.none')}</p>`;
      $('anGames').querySelectorAll('.an-game').forEach(b => b.onclick = () => analyze(games[+b.dataset.i]));
    };
    window.kairo.analysis.onProgress(p => { const bar = $('anBar'); if (bar) bar.style.width = p + '%'; const tx = $('anPct'); if (tx) tx.textContent = p + '%'; });
  }

  async function analyze(g) {
    current = g;
    $('anGames').innerHTML = '';
    $('anResult').innerHTML = `<div class="an-progress"><div class="msg-status">${t('an.running')} <span id="anPct">0%</span></div><div class="quiz-bar"><i id="anBar" style="width:0"></i></div>
      <button class="btn sm" id="anCancel">${t('today.cancel')}</button></div>`;
    $('anCancel').onclick = () => window.kairo.analysis.cancel();
    const r = await window.kairo.analysis.run(g);
    if (!r.ok) { $('anResult').innerHTML = `<p class="msg error">${escAttr(r.error.message)}</p>`; return; }
    result = r;
    renderResult();
  }

  function graph(evals) {
    const W = 520, H = 90, n = evals.length - 1 || 1;
    const y = v => H / 2 - Math.max(-6, Math.min(6, v)) / 6 * (H / 2 - 4);
    const pts = evals.map((v, i) => `${(i / n * W).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<svg class="an-graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polygon points="0,${H} ${pts} ${W},${H}" class="g-white"/><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" class="g-mid"/>
      <polyline points="${pts}" class="g-line"/></svg>`;
  }

  function renderResult(sel = null) {
    const g = current, r = result;
    const tagSym = { blunder: '??', mistake: '?', inaccuracy: '?!', best: '★' };
    const flip = g.color === 'b';
    const m = sel != null ? r.moves[sel] : null;
    let list = '';
    for (let i = 0; i < r.moves.length; i += 2) {
      const cell = k => { const mv = r.moves[k]; if (!mv) return '<span></span>'; return `<button class="an-mv ${mv.tag || ''} ${mv.color === g.color ? 'mine' : ''} ${k === sel ? 'sel' : ''}" data-k="${k}">${escAttr(mv.san)}${mv.tag && mv.tag !== 'best' ? `<i>${tagSym[mv.tag]}</i>` : ''}</button>`; };
      list += `<div class="an-row"><b>${i / 2 + 1}.</b>${cell(i)}${cell(i + 1)}</div>`;
    }
    const fen = m ? m.fen : r.moves.length ? r.moves[r.moves.length - 1].fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const prev = m && m.fenBefore;
    const isErr = !!(m && ['blunder', 'mistake', 'inaccuracy'].includes(m.tag));
    $('anResult').innerHTML = `
      <div class="an-summary">
        <div class="an-acc"><b>${r.accuracy}%</b><small>${t('an.accuracy')}</small></div>
        <div class="an-count blunder"><b>${r.blunders}</b><small>${t('an.blunders')} ??</small></div>
        <div class="an-count mistake"><b>${r.mistakes}</b><small>${t('an.mistakes')} ?</small></div>
        <div class="an-count inaccuracy"><b>${r.inaccuracies}</b><small>${t('an.inacc')} ?!</small></div>
      </div>
      ${graph(r.evals)}
      <div class="an-body">
        <div>${boardHTML(isErr ? prev : fen, flip, { best: isErr ? m.best : null })}
          <div class="an-note">${m ? (isErr ? `<b>${escAttr(m.san)}</b> ${t('an.was')} <span class="${m.tag}">${t('an.' + m.tag)}</span>. ${t('an.better')} <b>${escAttr(m.best?.san || '?')}</b> (${t('an.blue')})` : `<b>${escAttr(m.san)}</b> · ${(m.eval > 0 ? '+' : '') + m.eval.toFixed(1)}`) : t('an.click')}</div></div>
        <div class="an-moves">${list}</div>
      </div>
      <div class="row">
        <button class="btn primary" id="anExplain">💡 ${t('an.explain')}</button>
        <button class="btn" id="anNext">${t('an.nextMistake')} →</button>
        <a class="btn" href="${escAttr(g.url)}" data-ext>${g.site} ↗</a>
        <button class="btn" id="anBack">← ${t('an.back')}</button>
      </div>`;
    $('anResult').querySelectorAll('.an-mv').forEach(b => b.onclick = () => renderResult(+b.dataset.k));
    $('anBack').onclick = () => $('anForm').requestSubmit();
    $('anNext').onclick = () => {
      const k = r.moves.findIndex((mv, i) => i > (sel ?? -1) && mv.color === g.color && ['blunder', 'mistake', 'inaccuracy'].includes(mv.tag));
      if (k >= 0) renderResult(k); else toast('✓');
    };
    $('anExplain').onclick = () => {
      const bad = r.moves.filter(mv => mv.color === g.color && ['blunder', 'mistake'].includes(mv.tag)).slice(0, 6);
      const txt = `${t('an.explainQ')}\n\nPartie: ${g.white} vs ${g.black} (${g.speed}), ich spiele ${g.color === 'w' ? 'Weiss' : 'Schwarz'}, Ergebnis: ${g.result}. Eröffnung: ${g.opening || '?'}. Genauigkeit ${r.accuracy}%.\n` +
        `Züge: ${g.san.join(' ')}\n\nMeine grössten Fehler:\n` + bad.map(b => `- Zug ${Math.ceil(b.ply / 2)}: ${b.san} (${b.tag}), besser war ${b.best?.san}. Stellung vorher: ${b.fenBefore}`).join('\n');
      window.App.askInChat(txt);
    };
  }

  // ================= Lichess bot =================
  let lStatus = null, lBoard = null, lLog = [];

  async function renderLichess() {
    const S = window.App.settings();
    const area = $('lichessArea');
    if (!S.keys.lichess) {
      area.innerHTML = `
        <p class="muted">${t('li.sub')}</p>
        <ol class="li-steps">
          <li>${t('li.s1')} <a href="https://lichess.org/signup" data-ext>lichess.org/signup ↗</a></li>
          <li>${t('li.s2')} <a href="https://lichess.org/account/oauth/token/create?scopes[]=bot:play&scopes[]=challenge:write&description=KairoBot" data-ext>${t('li.token')} ↗</a></li>
          <li>${t('li.s3')}</li>
        </ol>
        <form class="row" id="liTokForm"><input class="field" type="password" id="liTok" placeholder="lip_…" style="flex:1"><button class="btn primary">${t('li.save')}</button></form>
        <p class="note">${t('li.fair')}</p>`;
      $('liTokForm').onsubmit = async e => { e.preventDefault(); const v = $('liTok').value.trim(); if (!v) return; await window.App.saveSettings({ keys: { lichess: v } }); renderLichess(); };
      return;
    }
    area.innerHTML = `<div class="msg-status">${t('earth.loading')}</div>`;
    const acc = await window.kairo.lichess.account();
    if (!acc.ok) {
      area.innerHTML = `<p class="msg error">${escAttr(acc.error.message)}</p><div class="row"><button class="btn" id="liReset">${t('li.newToken')}</button></div>`;
      $('liReset').onclick = async () => { await window.App.saveSettings({ keys: { lichess: null } }); renderLichess(); };
      return;
    }
    if (!acc.bot) {
      area.innerHTML = `<p>${t('li.notBot', { name: escAttr(acc.username) })}</p>
        <p class="note">${t('li.upgradeWarn', { n: acc.games })}</p>
        <div class="row"><button class="btn primary" id="liUp" ${acc.games ? 'disabled' : ''}>🤖 ${t('li.upgrade')}</button><button class="btn" id="liReset">${t('li.newToken')}</button></div>`;
      $('liReset').onclick = async () => { await window.App.saveSettings({ keys: { lichess: null } }); renderLichess(); };
      $('liUp').onclick = () => {
        Today.modal(`<h2>🤖 ${t('li.upgrade')}</h2><p>${t('li.confirm', { name: escAttr(acc.username) })}</p>
          <div class="row"><span style="flex:1"></span><button class="btn" data-close>${t('today.cancel')}</button><button class="btn primary" id="liUpGo">${t('li.upgradeGo')}</button></div>`);
        document.querySelector('#modalBox [data-close]').onclick = Today.closeModal;
        $('liUpGo').onclick = async () => { const r = await window.kairo.lichess.upgrade(); Today.closeModal(); if (!r.ok) toast(r.error.message); renderLichess(); };
      };
      return;
    }
    const st = await window.kairo.lichess.status();
    lStatus = st; lLog = st.log || [];
    area.innerHTML = `
      <div class="li-card">
        <div class="li-head">
          <span class="li-dot ${st.running ? 'on' : ''}"></span>
          <div><b>${escAttr(acc.username)}</b> <span class="li-bot">BOT</span><small>${Object.entries(acc.ratings).map(([k, v]) => `${k} ${v}`).join(' · ') || t('li.noGames')}</small></div>
          <button class="btn ${st.running ? '' : 'primary'}" id="liToggle">${st.running ? t('li.goOffline') : t('li.goOnline')}</button>
        </div>
        <div class="row">
          <label class="chess-level">${t('li.strength')} <input type="range" id="liLevel" min="1" max="20" value="${S.lichess.level}"><span id="liLevelV">${S.lichess.level}</span></label>
          <label class="chess-level">${t('li.from')} <input class="field" id="liFrom" value="${escAttr(S.lichess.acceptFrom === 'all' ? '' : S.lichess.acceptFrom)}" placeholder="${t('li.everyone')}" style="width:150px"></label>
        </div>
        <div class="row">
          <a class="btn" href="https://lichess.org/?user=${escAttr(acc.id)}#friend" data-ext>⚔ ${t('li.challengeMe')} ↗</a>
          <a class="btn" href="https://lichess.org/@/${escAttr(acc.id)}" data-ext>${t('li.profile')} ↗</a>
          <button class="btn" id="liBots">🤖 ${t('li.vsBots')}</button>
        </div>
      </div>
      <div class="li-live" id="liLive"></div>
      <div id="liBotList"></div>
      <ul class="feed" id="liLog"></ul>`;
    $('liToggle').onclick = async () => {
      const r = st.running ? await window.kairo.lichess.stop() : await window.kairo.lichess.start();
      if (!r.ok) toast(r.error.message);
      await window.App.saveSettings({ lichess: { enabled: !st.running } });
      renderLichess();
    };
    $('liLevel').oninput = e => { $('liLevelV').textContent = e.target.value; };
    $('liLevel').onchange = e => window.App.saveSettings({ lichess: { level: +e.target.value } });
    $('liFrom').onchange = e => window.App.saveSettings({ lichess: { acceptFrom: e.target.value.trim() || 'all' } });
    $('liBots').onclick = async () => {
      $('liBotList').innerHTML = `<div class="msg-status">${t('earth.loading')}</div>`;
      const r = await window.kairo.lichess.bots();
      if (!r.ok) { $('liBotList').innerHTML = `<p class="msg error">${escAttr(r.error.message)}</p>`; return; }
      $('liBotList').innerHTML = `<div class="li-bots">${r.bots.filter(b => b.id !== acc.id).slice(0, 20).map(b => `<button class="chip" data-b="${escAttr(b.id)}">${escAttr(b.name)} <small>${b.blitz || b.bullet || ''}</small></button>`).join('')}</div>`;
      $('liBotList').querySelectorAll('[data-b]').forEach(b => b.onclick = async () => {
        if (!st.running) { toast(t('li.needOnline')); return; }
        const r2 = await window.kairo.lichess.challenge(b.dataset.b, 3, 2);
        toast(r2.ok ? '⚔ ' + b.dataset.b : r2.error.message);
      });
    };
    drawLive(); drawLog();
  }

  function drawLive() {
    const el = $('liLive'); if (!el) return;
    const g = lStatus?.game;
    el.innerHTML = g ? `<div class="li-game"><div>${boardHTML(lBoard || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w', g.color === 'b')}</div>
      <div><b>${t('li.playing')}</b><p>${t('an.vs')} ${escAttr(g.opponent)}</p><a class="btn sm" href="${escAttr(g.url)}" data-ext>${t('li.watch')} ↗</a></div></div>` : '';
  }
  function drawLog() {
    const el = $('liLog'); if (!el) return;
    el.innerHTML = lLog.filter(e => e.text).slice(0, 15).map(e => `<li><time>${new Date(e.time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</time>${escAttr(e.text)}</li>`).join('');
  }

  function init() {
    initAnalysis();
    window.kairo.lichess.onEvent(ev => {
      if (ev.status) lStatus = { ...(lStatus || {}), ...ev.status };
      if (ev.board) lBoard = ev.board;
      if (ev.text) lLog.unshift(ev);
      if (!$('lichessArea').hidden) { drawLive(); drawLog(); }
    });
  }

  return { init, renderLichess };
})();
