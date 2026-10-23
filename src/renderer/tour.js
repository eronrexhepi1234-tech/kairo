// World tour: "Zeig mir die 5 schönsten Orte in Japan" -> Kairo plans stops and flies from one to the next
// like a documentary, with a caption card and (optionally) a narrator voice.
window.Tour = (function () {
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let run = 0, paused = false, skip = false;

  async function plan(topic) {
    const r = await window.kairo.complete({
      plain: true, webSearch: false,
      text: `Plan a short virtual world tour for: "${topic}".
Return ONLY JSON: {"title":"short tour title","stops":[{"name":"display name","query":"place for a map search, with country","zoom":"country|city|close|street","fact":"2 exciting sentences about this place, in the user's language"}]}
3 to 7 stops (5 if not specified), in a nice travel order. zoom: "close" for buildings/landmarks, "city" for cities, "country" for big areas. No markdown.`
    });
    if (!r.ok) throw new Error(r.error?.message || 'AI');
    const j = window.parseJsonLoose ? window.parseJsonLoose(r.text) : JSON.parse(r.text.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
    if (!j?.stops?.length) throw new Error(t('tour.fail'));
    return j;
  }

  function card() {
    let el = $('tourCard');
    if (!el) {
      $('view-earth').insertAdjacentHTML('beforeend', `<div class="tour-card" id="tourCard" hidden>
        <div class="tour-top"><span class="tour-badge">🎬 <b id="tourTitle"></b></span><span class="tour-dots" id="tourDots"></span></div>
        <div class="tour-num" id="tourNum"></div><h3 id="tourName"></h3><p id="tourFact"></p>
        <div class="tour-ctl"><button class="btn" id="tourPause">⏸</button><button class="btn" id="tourNext">⏭</button><button class="btn" id="tourStop">✕</button></div>
        <div class="tour-progress"><i id="tourBar"></i></div></div>`);
      el = $('tourCard');
      $('tourPause').onclick = () => { paused = !paused; $('tourPause').textContent = paused ? '▶' : '⏸'; };
      $('tourNext').onclick = () => { skip = true; };
      $('tourStop').onclick = stop;
    }
    return el;
  }

  function stop() {
    run++;
    const el = $('tourCard'); if (!el) return;
    el.classList.remove('on'); setTimeout(() => { el.hidden = true; }, 400);
    Voice.stop?.();
  }

  // wait while respecting pause / skip / stop, and animate the progress bar
  async function hold(ms, id) {
    const bar = $('tourBar'); let done = 0;
    while (done < ms) {
      if (id !== run) return false;
      if (skip) { skip = false; return true; }
      await wait(100);
      if (!paused) done += 100;
      bar.style.width = (done / ms * 100) + '%';
    }
    return true;
  }

  async function start(topic, opts = {}) {
    const id = ++run; paused = skip = false;
    window.App.go('earth'); Earth.init();
    const el = card();
    el.hidden = false; requestAnimationFrame(() => el.classList.add('on'));
    $('tourTitle').textContent = topic; $('tourDots').innerHTML = ''; $('tourNum').textContent = '';
    $('tourName').textContent = t('tour.planning'); $('tourFact').textContent = ''; $('tourBar').style.width = '0';
    el.classList.add('loading');
    let tour;
    try { tour = await plan(topic); }
    catch (e) { if (id === run) { $('tourName').textContent = '✕ ' + e.message; setTimeout(stop, 4000); } return null; }
    if (id !== run) return null;
    el.classList.remove('loading');
    $('tourTitle').textContent = tour.title || topic;
    const stops = tour.stops.slice(0, 7);
    $('tourDots').innerHTML = stops.map(() => '<i></i>').join('');
    const speakIt = opts.speak ?? !(window.LiveVoice?.isActive());
    for (const [i, s] of stops.entries()) {
      if (id !== run) return tour;
      $('tourDots').querySelectorAll('i').forEach((d, j) => d.className = j < i ? 'done' : j === i ? 'on' : '');
      $('tourNum').textContent = `${i + 1} / ${stops.length}`;
      el.classList.add('swap');
      await wait(250);
      $('tourName').textContent = s.name; $('tourFact').textContent = '';
      el.classList.remove('swap');
      $('tourBar').style.width = '0';
      await Earth.flyToName(`${s.query || s.name} | ${s.zoom || 'city'}`, null, s.name);
      if (id !== run) return tour;
      // type the fact like a subtitle
      const fact = s.fact || '';
      for (let k = 0; k <= fact.length; k += 3) { if (id !== run) return tour; $('tourFact').textContent = fact.slice(0, k); await wait(14); }
      $('tourFact').textContent = fact;
      if (speakIt && fact) Voice.speak(fact, window.App.settings());
      if (!await hold(Math.max(7000, fact.length * 70), id)) return tour;
      Voice.stop?.();
    }
    if (id === run) { $('tourDots').querySelectorAll('i').forEach(d => d.className = 'done'); $('tourNum').textContent = '🏁'; await wait(2500); stop(); }
    return tour;
  }

  return { start, stop };
})();
