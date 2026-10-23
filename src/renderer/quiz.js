// Quiz game: Kairo writes questions about any topic, you answer against the clock.
window.Quiz = (function () {
  const $ = id => document.getElementById(id);
  const TOPICS = ['Fussball', 'Gaming', 'Geografie', 'Albanien', 'Schweiz', 'Weltall', 'Tiere', 'Filme & Serien', 'Musik', 'Geschichte', 'Wissenschaft', 'Allgemeinwissen'];
  let qs = [], idx = 0, score = 0, streak = 0, best = 0, timer = null, left = 0, locked = false, topic = '', readAloud = false, correct = 0;
  const QTIME = 20;

  function setup() {
    const area = $('quizArea');
    area.innerHTML = `
      <div class="quiz-setup">
        <p class="muted">${t('quiz.sub')}</p>
        <div class="quiz-topics">${TOPICS.map(tp => `<button class="chip" data-tp="${escAttr(tp)}">${escAttr(tp)}</button>`).join('')}</div>
        <form id="quizForm" class="row">
          <input class="field" id="quizTopic" placeholder="${t('quiz.ownTopic')}" style="flex:1">
          <select class="field" id="quizLevel" style="width:auto"><option value="easy">${t('quiz.easy')}</option><option value="medium" selected>${t('quiz.medium')}</option><option value="hard">${t('quiz.hard')}</option></select>
          <button class="btn primary">${t('quiz.start')}</button>
        </form>
        <label class="tog"><input type="checkbox" id="quizRead" ${readAloud ? 'checked' : ''}><span>${t('quiz.read')}</span></label>
      </div>`;
    area.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { $('quizTopic').value = b.dataset.tp; });
    $('quizRead').onchange = e => { readAloud = e.target.checked; };
    $('quizForm').onsubmit = e => { e.preventDefault(); start($('quizTopic').value.trim() || 'Allgemeinwissen', $('quizLevel').value); };
  }

  async function start(tp, level = 'medium') {
    topic = tp;
    $('quizArea').innerHTML = `<div class="quiz-loading"><div class="msg-status">${t('quiz.making', { topic: escAttr(tp) })}</div></div>`;
    const r = await window.kairo.complete({
      text: `Create 10 ${level} multiple-choice quiz questions about "${tp}" in the user's language. Mix easy facts and surprising ones; every fact must be correct and not time-sensitive.
Reply with ONLY JSON, no code fence: {"questions":[{"q":"question","options":["A","B","C","D"],"answer":0,"fact":"one short sentence why"}]}`,
      extraSystem: 'You are a quiz master. Output strictly valid JSON.'
    });
    if (!r.ok) { $('quizArea').innerHTML = `<p class="msg error">${r.error.code === 'NO_KEY' ? t('err.nokey') : escAttr(r.error.message)}</p>`; return; }
    try {
      const j = JSON.parse(r.text.slice(r.text.indexOf('{'), r.text.lastIndexOf('}') + 1));
      qs = j.questions.filter(q => q.q && q.options?.length >= 2 && q.answer >= 0 && q.answer < q.options.length).slice(0, 10);
      if (!qs.length) throw 0;
    } catch { $('quizArea').innerHTML = `<p class="msg error">${t('quiz.fail')}</p>`; setTimeout(setup, 2500); return; }
    idx = 0; score = 0; streak = 0; best = 0; correct = 0;
    show();
  }

  function show() {
    const q = qs[idx];
    locked = false; left = QTIME;
    $('quizArea').innerHTML = `
      <div class="quiz">
        <div class="quiz-top"><span>${escAttr(topic)} · ${idx + 1}/${qs.length}</span><span class="quiz-score">⭐ ${score}${streak > 1 ? ` · 🔥${streak}` : ''}</span></div>
        <div class="quiz-bar"><i id="qBar"></i></div>
        <h3 class="quiz-q">${escAttr(q.q)}</h3>
        <div class="quiz-opts">${q.options.map((o, i) => `<button class="quiz-opt" data-i="${i}" style="animation-delay:${i * 60}ms"><b>${'ABCD'[i]}</b>${escAttr(o)}</button>`).join('')}</div>
        <div class="quiz-fact" id="qFact"></div>
      </div>`;
    $('quizArea').querySelectorAll('.quiz-opt').forEach(b => b.onclick = () => answer(+b.dataset.i));
    if (readAloud) Voice.speak(q.q + ' ' + q.options.map((o, i) => 'ABCD'[i] + ': ' + o).join('. '), window.App.settings());
    clearInterval(timer);
    timer = setInterval(() => {
      left -= 0.1;
      $('qBar') && ($('qBar').style.width = Math.max(0, left / QTIME * 100) + '%');
      if (left <= 0) answer(-1);
    }, 100);
  }

  function tone(ok) {
    try {
      const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
      o.frequency.value = ok ? 660 : 180; o.type = ok ? 'triangle' : 'sawtooth';
      g.gain.setValueAtTime(0.15, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.35);
      if (ok) { const o2 = c.createOscillator(); o2.frequency.value = 990; o2.type = 'triangle'; o2.connect(g); o2.start(c.currentTime + 0.1); o2.stop(c.currentTime + 0.35); }
    } catch {}
  }

  function answer(i) {
    if (locked) return;
    locked = true;
    clearInterval(timer);
    const q = qs[idx], ok = i === q.answer;
    if (ok) { streak++; correct++; best = Math.max(best, streak); score += 100 + Math.round(left * 5) + (streak > 1 ? streak * 20 : 0); }
    else streak = 0;
    tone(ok);
    $('quizArea').querySelectorAll('.quiz-opt').forEach(b => {
      const n = +b.dataset.i;
      b.classList.add(n === q.answer ? 'right' : n === i ? 'wrong' : 'dim');
      b.disabled = true;
    });
    $('qFact').innerHTML = `${ok ? '✅' : i < 0 ? '⏱' : '❌'} ${escAttr(q.fact || '')}`;
    setTimeout(() => { idx++; idx < qs.length ? show() : end(); }, ok ? 1600 : 2600);
  }

  function end() {
    const pct = Math.round(correct / qs.length * 100);
    const medal = pct >= 90 ? '🏆' : pct >= 70 ? '🥇' : pct >= 50 ? '🥈' : '🎯';
    $('quizArea').innerHTML = `
      <div class="quiz-end">
        <div class="quiz-medal">${medal}</div>
        <h2>${score} ${t('quiz.points')}</h2>
        <p class="muted">${correct}/${qs.length} ${t('quiz.right')} · 🔥 ${best}</p>
        <div class="row" style="justify-content:center"><button class="btn primary" id="qAgain">${t('quiz.again')}</button><button class="btn" id="qNew">${t('quiz.newTopic')}</button></div>
      </div>`;
    $('qAgain').onclick = () => start(topic);
    $('qNew').onclick = setup;
    if (readAloud) Voice.speak(`${score} ${t('quiz.points')}! ${correct} / ${qs.length}`, window.App.settings());
  }

  return { init: () => { if (!$('quizArea').children.length) setup(); }, start, setup };
})();
