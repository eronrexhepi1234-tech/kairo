// Hands-free voice mode: talk to Kairo, it talks back (Gemini Live, speech to speech).
// It can search the web, look at your screen and fly the Earth while you talk.
window.LiveVoice = (function () {
  const $ = id => document.getElementById(id);
  const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=';

  let ws = null, cfg = null, modelIdx = 0, ready = false, active = false;
  let micStream = null, micCtx = null, micNode = null, micAnalyser = null, muted = false;
  let outCtx = null, outGain = null, outAnalyser = null, nextTime = 0, playing = [];
  let screenTimer = null, sharing = false;
  let userText = '', aiText = '', state = 'idle', gotAudio = false;
  let pendingAudio = [], turnAudio = [], lastActivity = Date.now(), translating = false;

  const TOOLS = [
    { googleSearch: {} },
    { functionDeclarations: [
      { name: 'look_at_screen', description: "Take a fresh screenshot of the user's screen so you can see it. Use whenever the user refers to their screen, a game, a picture or 'this'." },
      { name: 'fly_to', description: 'Show a place on the 3D Earth inside the app.', parameters: { type: 'OBJECT', properties: { place: { type: 'STRING', description: 'Place name, e.g. "Prizren, Kosovo"' } }, required: ['place'] } },
      { name: 'open_url', description: 'Open a website or app link. YouTube search: https://www.youtube.com/results?search_query=..., Google: https://www.google.com/search?q=..., WhatsApp message: whatsapp://send?text=... (user picks contact and presses send), Steam: steam://store/<appid> or steam://install/<appid> (user confirms), Spotify: spotify:search:..., e-mail draft: mailto:...?subject=...&body=...', parameters: { type: 'OBJECT', properties: { url: { type: 'STRING' } }, required: ['url'] } },
      { name: 'open_app', description: 'Open a program on the PC, e.g. spotify, discord, steam, notepad, calculator, explorer, settings, word, excel, chrome, minecraft.', parameters: { type: 'OBJECT', properties: { name: { type: 'STRING' } }, required: ['name'] } },
      { name: 'create_file', description: "Create a file in the user's Documents\\Kairo folder. Use .docx for Word documents (content in Markdown: # headings, - bullets, **bold**), .txt/.md for notes, .html, .csv, or code files. Write the complete content.", parameters: { type: 'OBJECT', properties: { name: { type: 'STRING', description: 'File name with extension' }, content: { type: 'STRING' } }, required: ['name', 'content'] } },
      { name: 'chess_new_game', description: 'Start a chess game against Kairo (Stockfish) on the board in the app. level 1-20 (1 beginner, 8 club, 20 grandmaster).', parameters: { type: 'OBJECT', properties: { color: { type: 'STRING', description: 'white or black (the user\'s colour)' }, level: { type: 'NUMBER' } } } },
      { name: 'chess_move', description: 'Play the user\'s chess move. Use SAN like "e4", "Nf3", "O-O", "exd5", or squares like "e2e4". German piece names: König K, Dame Q, Turm R, Läufer B, Springer N, Bauer = no letter. The engine answers automatically; tell the user its reply.', parameters: { type: 'OBJECT', properties: { move: { type: 'STRING' } }, required: ['move'] } },
      { name: 'chess_play_for_me', description: 'Kairo plays the best move for the user, then the engine answers.' },
      { name: 'chess_hint', description: 'Get the best move suggestion for the user in the current chess position.' },
      { name: 'chess_status', description: 'Get the current chess position, move list and whose turn it is.' },
      { name: 'remember', description: 'Save a fact about the user for the future (name, friends, hobbies, school, favourite games...). Use when the user tells you something personal worth keeping or says "merk dir".', parameters: { type: 'OBJECT', properties: { fact: { type: 'STRING' } }, required: ['fact'] } },
      { name: 'set_reminder', description: 'Set a reminder or an alarm (wake-up with sound). when: "in 20 min", "in 2 h", "07:30", or ISO date-time.', parameters: { type: 'OBJECT', properties: { when: { type: 'STRING' }, text: { type: 'STRING' }, alarm: { type: 'BOOLEAN' }, daily: { type: 'BOOLEAN' } }, required: ['when'] } },
      { name: 'list_reminders', description: 'List the upcoming reminders and alarms.' },
      { name: 'pc_control', description: 'Control the PC: volume_up, volume_down (value = steps of 2 %), mute, play_pause, next, previous, brightness (value 0-100), screenshot, lock, sleep, shutdown (value = minutes), restart (value = minutes), cancel_shutdown.', parameters: { type: 'OBJECT', properties: { action: { type: 'STRING' }, value: { type: 'NUMBER' } }, required: ['action'] } },
      { name: 'tidy_downloads', description: 'Show a preview for tidying up the Downloads folder; the user confirms on screen.' },
      { name: 'morning_briefing', description: 'Show and read the briefing: weather, top news and today\'s reminders.' },
      { name: 'start_quiz', description: 'Start the quiz game in the app about a topic.', parameters: { type: 'OBJECT', properties: { topic: { type: 'STRING' } }, required: ['topic'] } },
      { name: 'light_control', description: 'Control smart lights. target: "all", a lamp name or a room. scene: gaming, lernen, film, chill, party, schlafen, morgen, aus. color: a colour name (rot, blau, lila, warmweiss...) or #hex.', parameters: { type: 'OBJECT', properties: { target: { type: 'STRING' }, on: { type: 'BOOLEAN' }, brightness: { type: 'NUMBER' }, color: { type: 'STRING' }, scene: { type: 'STRING' } } } },
      { name: 'use_camera', description: 'Turn the webcam on (or off) so you can see the user or something they hold up, e.g. "look at me", "what am I holding", "check my homework on paper".', parameters: { type: 'OBJECT', properties: { on: { type: 'BOOLEAN' } } } },
      { name: 'start_translator', description: 'Switch into live interpreter mode between two languages (e.g. German and Albanian) so two people can talk.', parameters: { type: 'OBJECT', properties: { language_a: { type: 'STRING' }, language_b: { type: 'STRING' } }, required: ['language_a', 'language_b'] } },
      { name: 'save_clip', description: 'Save the last ~30 seconds of the screen as a video clip ("clip that"). Only works when clip mode is on.' },
      { name: 'make_flashcards', description: 'Create a flashcard deck about a topic and open it for studying.', parameters: { type: 'OBJECT', properties: { topic: { type: 'STRING' } }, required: ['topic'] } },
      { name: 'read_aloud', description: 'Open the read-aloud tool with the text the user copied (clipboard) and start reading it with a natural voice.' },
      { name: 'stop_conversation', description: 'End the voice conversation when the user says goodbye or asks you to stop listening.' }
    ] }
  ];

  function setState(s) {
    state = s;
    $('vmState').textContent = t('voice.' + s);
    $('voiceMode').dataset.state = s;
  }

  // ---------- helpers ----------
  function f32ToB64(f32) {
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) { const s = Math.max(-1, Math.min(1, f32[i])); i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
    const u8 = new Uint8Array(i16.buffer);
    let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

  // ---------- audio out ----------
  function playPcm(b64, rate) {
    const u8 = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const i16 = new Int16Array(u8.buffer, 0, u8.length >> 1);
    const buf = outCtx.createBuffer(1, i16.length, rate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < i16.length; i++) ch[i] = i16[i] / 32768;
    const src = outCtx.createBufferSource();
    src.buffer = buf;
    src.connect(outGain);
    nextTime = Math.max(nextTime, outCtx.currentTime + 0.03);
    src.start(nextTime);
    nextTime += buf.duration;
    playing.push(src);
    src.onended = () => {
      playing = playing.filter(p => p !== src); lastActivity = Date.now();
      if (!playing.length && state === 'speaking') setState('listening');
    };
    if (state !== 'speaking') setState('speaking');
  }
  function stopPlayback() {
    playing.forEach(p => { try { p.stop(); } catch {} });
    playing = []; nextTime = 0;
  }

  // ---------- screen ----------
  async function sendScreen() {
    const shot = await window.kairo.screen();
    send({ realtimeInput: { video: { data: shot.data, mimeType: shot.mime } } });
    $('vmShot').src = `data:${shot.mime};base64,${shot.data}`;
    $('vmShot').classList.remove('flash'); void $('vmShot').offsetWidth; $('vmShot').classList.add('flash');
  }
  // ---------- webcam ----------
  let camStream = null, camTimer = null;
  async function sendCam() {
    const v = $('vmCam');
    if (!v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = 640; c.height = Math.round(640 * v.videoHeight / v.videoWidth);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    send({ realtimeInput: { video: { data: c.toDataURL('image/jpeg', 0.75).split(',')[1], mimeType: 'image/jpeg' } } });
  }
  async function toggleCam(on = !camStream) {
    clearInterval(camTimer);
    if (!on) {
      camStream?.getTracks().forEach(tr => tr.stop()); camStream = null;
      $('vmCam').hidden = true; $('vmCamBtn').setAttribute('aria-pressed', 'false');
      return;
    }
    if (sharing) toggleScreen(false);
    try { camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } }); }
    catch { toast(t('voice.noCam')); return; }
    const v = $('vmCam'); v.srcObject = camStream; v.hidden = false; await v.play().catch(() => {});
    $('vmCamBtn').setAttribute('aria-pressed', 'true');
    camTimer = setInterval(() => { if (ready) sendCam(); }, 1500);
    if (ready) setTimeout(sendCam, 400);
  }

  function toggleScreen(on = !sharing) {
    if (on && camStream) toggleCam(false);
    sharing = on;
    $('vmScreen').setAttribute('aria-pressed', String(on));
    $('vmShot').hidden = !on;
    clearInterval(screenTimer);
    if (on && ready) { sendScreen(); screenTimer = setInterval(sendScreen, 3000); }
  }

  // ---------- tools ----------
  async function handleTools(calls) {
    const responses = [];
    for (const c of calls) {
      let result = 'ok';
      if (c.name === 'look_at_screen') { await sendScreen(); result = 'A fresh screenshot was just sent as an image. Describe or analyse it now.'; }
      if (c.name === 'fly_to') {
        const place = c.args?.place || '';
        addCaption('system', '📍 ' + place);
        $('voiceMode').classList.add('with-earth');
        window.App.go('earth');
        setTimeout(() => Earth.flyToName(place), 150);
        result = 'The Earth view now shows ' + place;
      }
      if (c.name === 'open_url') {
        const r = await window.kairo.action({ type: 'open', url: c.args?.url });
        addCaption('system', r.ok ? '🌐 ' + r.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60) : '✕ ' + r.error.message);
        result = r.ok ? 'Opened ' + r.url : 'Failed: ' + r.error.message;
      }
      if (c.name === 'open_app') {
        const r = await window.kairo.action({ type: 'app', name: c.args?.name });
        addCaption('system', (r.ok ? '▶ ' : '✕ ') + c.args?.name);
        result = r.ok ? 'Started ' + c.args?.name : 'Failed: ' + r.error.message;
      }
      if (c.name === 'create_file') {
        const name = c.args?.name || 'Dokument.txt', content = c.args?.content || '';
        const r = await window.kairo.action({ type: 'file', name, content });
        addCaption('system', (r.ok ? '📄 ' : '✕ ') + name);
        if (r.ok) window.App.addVoiceFile(name, content, r.path);
        result = r.ok ? 'Saved to ' + r.path : 'Failed: ' + r.error.message;
      }
      if (c.name.startsWith('chess_')) result = await chessTool(c.name, c.args || {});
      const a = c.args || {};
      if (c.name === 'remember') { await window.kairo.memory.add(a.fact); addCaption('system', '🧠 ' + a.fact); Today.loadMemory(); result = 'Saved.'; }
      if (c.name === 'set_reminder') {
        const r = await window.kairo.reminders.add({ at: a.when, text: a.text, kind: a.alarm ? 'alarm' : 'reminder', repeat: a.daily ? 'daily' : null });
        if (r.ok) { const when = new Date(r.item.at).toLocaleString('de-CH', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); addCaption('system', (a.alarm ? '⏰ ' : '🔔 ') + when); Today.loadReminders(); result = 'Set for ' + new Date(r.item.at).toString(); }
        else result = 'Could not understand the time: ' + a.when;
      }
      if (c.name === 'list_reminders') {
        const l = await window.kairo.reminders.list();
        result = l.length ? l.map(r => `${r.kind} at ${new Date(r.at).toString()}: ${r.text}`).join('\n') : 'No reminders.';
      }
      if (c.name === 'pc_control') { const r = await window.kairo.pc(a.action, a.value); addCaption('system', '💻 ' + (r.ok ? r.result : r.error.message)); result = r.ok ? r.result : 'Failed: ' + r.error.message; }
      if (c.name === 'light_control') {
        const cmd = {}; for (const k of ['on', 'brightness', 'color', 'scene']) if (a[k] != null && a[k] !== '') cmd[k] = a[k];
        const r = await window.kairo.home.control(a.target || 'all', cmd);
        addCaption('system', r.ok ? '💡 ' + r.results.filter(x => x.ok).map(x => x.name).join(', ') : '✕ ' + r.error.message);
        result = r.ok ? 'Done: ' + JSON.stringify(r.results) : 'Failed: ' + r.error.message;
      }
      if (c.name === 'use_camera') { await toggleCam(a.on !== false); await new Promise(r => setTimeout(r, 900)); if (a.on !== false) await sendCam(); result = a.on !== false ? 'Camera is on; the latest image was just sent.' : 'Camera off.'; }
      if (c.name === 'start_translator') {
        result = 'Switching to interpreter mode now.';
        setTimeout(() => { stop(); setTimeout(() => start({ translate: { aName: a.language_a, bName: a.language_b } }), 700); }, 2500);
      }
      if (c.name === 'save_clip') { const r = await Extras.saveClip(); result = r.ok ? 'Clip saved to Videos/Kairo Clips.' : 'Clip mode is off. Tell the user to switch it on under Today → Tools → Clip mode.'; }
      if (c.name === 'make_flashcards') { $('voiceMode').classList.add('with-earth'); window.App.go('games'); Games.showGame('cards'); Extras.makeDeck({ text: a.topic }); result = 'Flashcards are being created on screen.'; }
      if (c.name === 'read_aloud') { const txt = await window.kairo.clip.read(); if (txt) { setTimeout(() => { stop(); Extras.readText(txt); }, 2500); result = 'I will stop talking and read the copied text aloud now.'; } else result = 'The clipboard is empty; ask the user to copy the text first.'; }
      if (c.name === 'tidy_downloads') { Today.tidy(); result = 'The preview is on screen; the user confirms it.'; }
      if (c.name === 'morning_briefing') {
        const r = await window.kairo.briefing.make();
        result = r.ok ? 'Read this briefing to the user in your own words:\n' + r.text : 'Failed: ' + r.error.message;
      }
      if (c.name === 'start_quiz') { $('voiceMode').classList.add('with-earth'); window.App.go('games'); Games.showGame('quiz'); Quiz.start(a.topic || 'Allgemeinwissen'); result = 'Quiz started on screen.'; }
      if (c.name === 'stop_conversation') setTimeout(stop, 2500);
      responses.push({ id: c.id, name: c.name, response: { result } });
    }
    send({ toolResponse: { functionResponses: responses } });
  }

  // ---------- chess by voice ----------
  async function chessTool(name, args) {
    const ch = window.kairo.chess;
    let r;
    if (name === 'chess_new_game') r = await ch.newGame({ color: /^b|schwarz|zi/i.test(args.color || '') ? 'b' : 'w', level: args.level || 8 });
    if (name === 'chess_move') r = await ch.move(args.move);
    if (name === 'chess_play_for_me') r = await ch.forMe();
    if (name === 'chess_hint') r = await ch.hint();
    if (name === 'chess_status') r = await ch.state();
    // show the board next to the orb
    $('voiceMode').classList.add('with-earth');
    window.App.go('games'); Games.showGame('chess'); ChessUI.set(r);
    if (r.played) addCaption('system', '♟ ' + r.played + (r.reply ? '  ·  Kairo: ' + r.reply : ''));
    else if (r.reply) addCaption('system', '♟ Kairo: ' + r.reply);
    const desc = await ch.describe();
    if (!r.ok) return 'Error: ' + r.error.message + '\n' + desc;
    const parts = [];
    if (r.played) parts.push('Played for the user: ' + r.played);
    if (r.reply) parts.push("Kairo's engine answered: " + r.reply);
    if (r.hint) parts.push('Best move suggestion: ' + r.hint.san);
    if (r.over) parts.push('Game over: ' + r.result);
    parts.push('Evaluation for White: ' + (r.mateIn != null ? 'mate in ' + r.mateIn : r.evalWhite.toFixed(1)));
    return parts.join('\n') + '\n' + desc;
  }

  // ---------- captions & chat log ----------
  function addCaption(who, text) {
    const el = document.createElement('div');
    el.className = 'cap ' + who;
    el.textContent = text;
    $('vmCaptions').appendChild(el);
    while ($('vmCaptions').children.length > 6) $('vmCaptions').firstChild.remove();
    return el;
  }
  let userCap = null, aiCap = null;
  function finishTurn() {
    if (userText.trim() || aiText.trim()) window.App.addVoiceTurn(userText.trim(), aiText.trim());
    userText = aiText = ''; userCap = aiCap = null;
    turnAudio = []; lastActivity = Date.now();
  }

  // ---------- connection ----------
  function connect() {
    const model = cfg.models[modelIdx];
    if (!model) { fail(t('voice.noModel')); return; }
    ready = false;
    gotAudio = false;
    setState('connecting');
    ws = new WebSocket(WS_URL + encodeURIComponent(cfg.key));
    ws.onopen = () => send({ setup: {
      model: 'models/' + model,
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voice } } } },
      systemInstruction: { parts: [{ text: cfg.system }] },
      tools: translating ? [] : TOOLS,
      inputAudioTranscription: {},
      outputAudioTranscription: {}
    } });
    ws.onmessage = async ev => {
      const raw = typeof ev.data === 'string' ? ev.data : await ev.data.text();
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.setupComplete) {
        ready = true;
        $('vmModel').textContent = model;
        setState('listening');
        // what was said while connecting (and the hands-free pre-roll) goes out now
        const queued = pendingAudio; pendingAudio = [];
        queued.forEach(sendAudio);
        if (sharing) toggleScreen(true);
        return;
      }
      if (m.toolCall?.functionCalls) { setState('thinking'); handleTools(m.toolCall.functionCalls); }
      const sc = m.serverContent;
      if (!sc) return;
      if (sc.interrupted) { stopPlayback(); setState('listening'); }
      if (sc.inputTranscription?.text) {
        userText += sc.inputTranscription.text;
        userCap ||= addCaption('user', '');
        userCap.textContent = userText;
        if (state === 'listening') setState('thinking');
      }
      if (sc.outputTranscription?.text) {
        aiText += sc.outputTranscription.text;
        aiCap ||= addCaption('ai', '');
        aiCap.textContent = aiText;
      }
      for (const p of sc.modelTurn?.parts || []) {
        if (p.inlineData?.data && /audio/.test(p.inlineData.mimeType)) {
          if (!gotAudio) { gotAudio = true; try { localStorage.setItem('kairo.liveModel', model); } catch {} }
          playPcm(p.inlineData.data, +(p.inlineData.mimeType.match(/rate=(\d+)/) || [])[1] || 24000);
        }
      }
      if (sc.turnComplete) finishTurn();
    };
    ws.onclose = ev => {
      const wasReady = ready;
      ready = false;
      if (!active) return;
      // model not available or over quota for this key? try the next one
      const unusable = !wasReady || (!gotAudio && (ev.code === 1011 || /quota|not found|not supported/i.test(ev.reason)));
      if (unusable && modelIdx < cfg.models.length - 1) {
        try { localStorage.removeItem('kairo.liveModel'); } catch {}
        pendingAudio = [...turnAudio, ...pendingAudio]; turnAudio = []; // replay what the user said to the next model
        modelIdx++; connect(); return;
      }
      if (wasReady && ev.code === 1000) { connect(); return; } // session limit reached: reconnect quietly
      fail(ev.reason || t('voice.lost') + ' (' + ev.code + ')');
    };
  }

  function fail(msg) {
    setState('error');
    $('vmState').textContent = msg;
  }

  // ---------- mic ----------
  async function startMic() {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    micCtx = new AudioContext({ sampleRate: 16000 });
    await micCtx.audioWorklet.addModule('mic-worklet.js');
    const src = micCtx.createMediaStreamSource(micStream);
    micAnalyser = micCtx.createAnalyser(); micAnalyser.fftSize = 256;
    micNode = new AudioWorkletNode(micCtx, 'mic-capture');
    micNode.port.onmessage = e => {
      if (muted) return;
      if (rms(e.data) > 0.02) lastActivity = Date.now();
      const chunk = f32ToB64(e.data);
      if (!ready) { pendingAudio.push(chunk); if (pendingAudio.length > 100) pendingAudio.shift(); return; }
      sendAudio(chunk);
    };
    src.connect(micAnalyser);
    src.connect(micNode);
  }

  function rms(f32) { let s = 0; for (let i = 0; i < f32.length; i++) s += f32[i] * f32[i]; return Math.sqrt(s / f32.length); }
  function sendAudio(chunk) {
    send({ realtimeInput: { audio: { data: chunk, mimeType: 'audio/pcm;rate=16000' } } });
    turnAudio.push(chunk); if (turnAudio.length > 150) turnAudio.shift();
  }

  // ---------- hands-free standby ----------
  // The mic is checked on this PC only. Nothing is sent anywhere until someone speaks;
  // then voice mode opens and gets the last ~1.5 s of audio so the first word isn't lost.
  let sb = null; // { stream, ctx, node, ring, floor, hot, level }
  let handsFree = false, sensitivity = 'medium';
  const SENS = { low: 5, medium: 3.6, high: 2.5 };
  const MIN_LEVEL = { low: 0.05, medium: 0.035, high: 0.022 };

  async function startStandby() {
    if (sb || active || !handsFree || document.hidden) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      if (active || !handsFree) { stream.getTracks().forEach(tr => tr.stop()); return; }
      const ctx = new AudioContext({ sampleRate: 16000 });
      await ctx.audioWorklet.addModule('mic-worklet.js');
      const node = new AudioWorkletNode(ctx, 'mic-capture');
      ctx.createMediaStreamSource(stream).connect(node);
      sb = { stream, ctx, node, ring: [], floor: 0.01, hot: 0, level: 0, started: Date.now() };
      node.port.onmessage = e => {
        if (!sb) return;
        const v = rms(e.data);
        sb.level = v;
        sb.ring.push(f32ToB64(e.data)); if (sb.ring.length > 15) sb.ring.shift();
        const busy = document.getElementById('presence').classList.contains('speaking'); // Kairo reading aloud
        const thr = Math.max(MIN_LEVEL[sensitivity], sb.floor * SENS[sensitivity]);
        // the noise floor follows the room slowly, so steady noise (fans, music) stops counting
        sb.floor = sb.floor * 0.985 + Math.min(v, thr) * 0.015;
        if (v < thr) { sb.hot = Math.max(0, sb.hot - 2); return; }
        if (busy || Date.now() - sb.started < 2500) return; // let the noise floor settle first
        // speech = loud for ~0.6 s within a short window; clicks and bangs don't last that long
        if (++sb.hot >= 6) { const pre = sb.ring.slice(); stopStandby(); start({ preroll: pre }); }
      };
      document.body.classList.add('handsfree-on');
    } catch (e) { handsFree = false; document.body.classList.remove('handsfree-on'); }
  }

  function stopStandby() {
    if (!sb) return;
    sb.stream.getTracks().forEach(tr => tr.stop());
    sb.ctx.close();
    sb = null;
  }

  function setHandsFree(on, sens) {
    handsFree = !!on;
    if (sens) sensitivity = sens;
    document.body.classList.toggle('handsfree-on', handsFree);
    if (handsFree) startStandby(); else stopStandby();
  }

  function toggleMute(on = !muted) {
    muted = on;
    $('vmMute').setAttribute('aria-pressed', String(on));
    if (muted) setState('muted'); else if (ready) setState('listening');
  }

  // ---------- public ----------
  async function start(opts = {}) {
    if (active) return;
    stopStandby();
    pendingAudio = opts.preroll || []; turnAudio = []; lastActivity = Date.now();
    Voice.stop();
    const r = await window.kairo.voice.liveConfig(opts.translate || null);
    translating = !!opts.translate;
    if (!r.ok) {
      window.toast(r.error.code === 'NO_GEMINI' ? t('voice.needGemini') : r.error.message);
      if (r.error.code === 'NO_GEMINI') window.App.go('settings');
      return;
    }
    // start with the model that worked last time
    let last = null; try { last = localStorage.getItem('kairo.liveModel'); } catch {}
    if (last && r.models.includes(last)) r.models = [last, ...r.models.filter(m => m !== last)];
    cfg = r; modelIdx = 0; active = true;
    window.kairo.showWindow();
    $('voiceMode').hidden = false;
    $('voiceMode').classList.remove('with-earth');
    $('vmCaptions').innerHTML = '';
    $('vmBanner').hidden = !translating;
    if (translating) $('vmBanner').textContent = '🌍 ' + t('tr.banner') + ': ' + opts.translate.aName + ' ⇄ ' + opts.translate.bName;
    requestAnimationFrame(() => $('voiceMode').classList.add('open'));
    outCtx = new AudioContext({ sampleRate: 24000 });
    outGain = outCtx.createGain();
    outAnalyser = outCtx.createAnalyser(); outAnalyser.fftSize = 256;
    outGain.connect(outAnalyser); outAnalyser.connect(outCtx.destination);
    try { await startMic(); }
    catch (e) { fail(t('voice.noMic')); return; }
    Orb.start($('vmOrb'), level);
    window.App.syncHomeOrb();
    connect();
  }

  function stop() {
    if (!active) return;
    active = false; ready = false;
    if (!translating) finishTurn(); else { userText = aiText = ''; userCap = aiCap = null; }
    clearInterval(screenTimer);
    toggleCam(false);
    try { ws?.close(); } catch {}
    ws = null;
    stopPlayback();
    micStream?.getTracks().forEach(tr => tr.stop());
    micCtx?.close(); outCtx?.close();
    micCtx = outCtx = null;
    Orb.stop();
    $('voiceMode').classList.remove('open');
    setTimeout(() => { if (!active) { $('voiceMode').hidden = true; window.App.syncHomeOrb(); } }, 350);
    if (handsFree) setTimeout(startStandby, 800);
  }

  // close voice mode after a quiet minute when hands-free is on (standby keeps listening)
  setInterval(() => {
    if (active && handsFree && ready && state === 'listening' && !playing.length && Date.now() - lastActivity > 40000) stop();
  }, 5000);

  // loudness 0..1 of whoever is talking, for the orb
  const tmp = new Uint8Array(128);
  function level() {
    const an = state === 'speaking' ? outAnalyser : micAnalyser;
    if (!an) return { level: 0, state };
    an.getByteTimeDomainData(tmp);
    let sum = 0; for (let i = 0; i < tmp.length; i++) { const v = (tmp[i] - 128) / 128; sum += v * v; }
    return { level: Math.min(1, Math.sqrt(sum / tmp.length) * (state === 'speaking' ? 3 : 5)), state };
  }

  // while minimized, the floating mini orb shows Kairo talking/listening
  setInterval(() => { if (document.hidden && active) window.kairo.miniLevel(level()); }, 80);

  // Hands-free only listens while Kairo's window is open, never in the background.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopStandby();
    else if (handsFree && !active) startStandby();
  });

  function init() {
    $('vmClose').onclick = stop;
    $('vmMute').onclick = () => toggleMute();
    $('vmScreen').onclick = () => toggleScreen();
    $('vmCamBtn').onclick = () => toggleCam();
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && active) stop(); });
    window.kairo.voice.onToggle(() => active ? stop() : start());
  }

  return {
    init, start, stop, setHandsFree, isActive: () => active,
    standbyLevel: () => (sb ? Math.min(1, sb.level * 6) : 0), inStandby: () => !!sb
  };
})();
