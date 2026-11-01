// Phone as webcam (33) and as microphone (35) for Kairo.
// The phone opens a secure page of Kairo's phone server (same port, https) and sends its camera over WebRTC,
// or records what you say; the PC answers through its speakers.
window.PhoneCam = (function () {
  const $c = id => document.getElementById(id);
  const de = () => (window.App?.settings?.()?.language || 'de') === 'de';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let pc = null, stream = null, mode = 'cam';
  const waitIce = p => new Promise(res => { if (p.iceGatheringState === 'complete') return res(); const t = setTimeout(res, 2500); p.addEventListener('icegatheringstatechange', () => { if (p.iceGatheringState === 'complete') { clearTimeout(t); res(); } }); });

  // the phone sends an offer through the phone server -> Kairo answers, the video comes straight over the Wi-Fi
  window.kairo.remote.onRequest('remote:rtc', async offer => {
    try {
      pc?.close();
      const me = pc = new RTCPeerConnection({ iceServers: [] });
      me.ontrack = e => { stream = e.streams[0] || new MediaStream([e.track]); open('cam'); attach(); };
      me.onconnectionstatechange = () => { if (me !== pc) return; if (['failed', 'closed', 'disconnected'].includes(me.connectionState)) { stream = null; attach(); } status(); };
      await me.setRemoteDescription(offer);
      await me.setLocalDescription(await me.createAnswer());
      await waitIce(me);
      return { type: 'answer', sdp: me.localDescription.sdp };
    } catch (e) { console.error('[kairo] phone cam', e); return null; }
  });
  // what you said into the phone -> Kairo answers out loud on the PC
  window.kairo.remote.onVoiceIn(text => {
    window.toast((de() ? 'Vom Handy: ' : 'From your phone: ') + text);
    window.App?.askInChat(text, { speak: true });
  });

  async function open(m = 'cam') {
    mode = m;
    let el = $c('pcOverlay');
    if (!el || el.dataset.closing) {
      el = qOverlay('pcOverlay', 'pw');
      el.innerHTML = `<div class="pw-wrap wide"><button class="fx-x pw-x" data-x>✕</button>
        <header class="pw-head"><span class="pw-ic">${ic('smartphone')}</span><div><small>${de() ? 'Handy für Kairo' : 'Phone for Kairo'}</small><h2>${de() ? 'Handy als Webcam und Mikrofon' : 'Phone as webcam and microphone'}</h2><p>${de() ? 'Ohne Kamera am PC: dein Handy wird zur Webcam oder zum Mikrofon. Alles bleibt in deinem WLAN.' : 'Your phone becomes the webcam or microphone. Everything stays on your Wi-Fi.'}</p></div></header>
        <div class="pw-body"><div class="pc-grid">
          <div class="pc-side"><div class="or-n" id="pcModes"><button data-m="cam">${ic('camera')} Webcam</button><button data-m="mic">${ic('mic')} ${de() ? 'Mikrofon' : 'Microphone'}</button></div>
            <div class="pc-qr" id="pcQr"><div class="pw-wait"><div class="pw-radar"><i></i><i></i><i></i><b>${ic('sparkles')}</b></div></div></div>
            <ol class="pc-steps"><li>${de() ? 'QR-Code mit dem Handy scannen (gleiches WLAN wie der PC).' : 'Scan the QR code with your phone (same Wi-Fi).'}</li>
              <li>${de() ? 'Beim ersten Mal kommt „Verbindung nicht privat“: auf „Erweitert“ und dann „Weiter zu …“ tippen. Das ist dein eigener PC, das ist sicher.' : 'The first time you see "not private": tap "Advanced" then "Proceed". It is your own PC.'}</li>
              <li id="pcStep3"></li></ol>
            <p class="muted small">${de() ? 'Oder in der Kairo-App auf dem Handy: „Handy für Kairo“ → Webcam / Mikrofon.' : 'Or in the Kairo phone app: "Phone for Kairo".'}</p></div>
          <div class="pc-stage"><video id="pcVid" autoplay playsinline muted></video><div class="pc-idle" id="pcIdle">${ic('camera')}<span id="pcIdleT"></span></div><div class="pc-live" id="pcLive"><i></i>LIVE</div>
            <div class="pc-acts" id="pcActs"><input class="field" id="pcAsk" placeholder="${de() ? 'Frag Kairo, z. B. Was siehst du? / Löse diese Aufgabe' : 'Ask Kairo, e.g. What do you see?'}"><button class="btn primary" id="pcAskB">${ic('scan-search')} ${de() ? 'Frag Kairo' : 'Ask Kairo'}</button><button class="btn" id="pcShot">${ic('camera')} Foto</button><button class="btn" id="pcEnd">${ic('x')}</button></div></div>
        </div></div></div>`;
      el.querySelector('[data-x]').onclick = () => qClose('pcOverlay');
      el.querySelectorAll('#pcModes [data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; modeUI(); });
      $c('pcShot').onclick = photo;
      $c('pcAskB').onclick = ask;
      $c('pcAsk').onkeydown = e => { if (e.key === 'Enter') ask(); };
      $c('pcEnd').onclick = () => { pc?.close(); pc = null; stream = null; attach(); status(); };
    }
    modeUI(); attach(); status();
  }
  async function modeUI() {
    document.querySelectorAll('#pcModes [data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    $c('pcStep3').textContent = mode === 'mic' ? (de() ? 'Mikrofon erlauben, tippen, reden, nochmal tippen. Kairo antwortet über die PC-Lautsprecher.' : 'Allow the microphone, tap, talk, tap again. Kairo answers on the PC speakers.') : (de() ? 'Kamera erlauben und „Kamera starten“ tippen. Das Bild erscheint hier.' : 'Allow the camera and tap "Start camera". The picture appears here.');
    const r = await window.kairo.remote.camLink(mode);
    if (!$c('pcQr')) return;
    $c('pcQr').innerHTML = r.ok ? `<img src="${r.qr}" alt="QR"><small>${esc(r.link.replace(/\?.*/, ''))}</small>` : `<div class="pw-err">${esc(r.error?.message || '')}</div>`;
  }
  function attach() {
    const v = $c('pcVid'); if (!v) return;
    v.srcObject = stream || null;
    $c('pcIdle').hidden = !!stream; $c('pcActs').classList.toggle('on', !!stream); $c('pcLive').classList.toggle('on', !!stream);
    $c('pcIdleT').textContent = de() ? 'Warte auf dein Handy …' : 'Waiting for your phone …';
  }
  function status() { $c('pcLive')?.classList.toggle('on', !!stream && pc?.connectionState === 'connected'); }
  function frame(mime = 'image/jpeg') {
    const v = $c('pcVid'); if (!v || !v.videoWidth) return null;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    return c.toDataURL(mime, 0.9).split(',')[1];
  }
  async function photo() {
    const b64 = frame('image/png'); if (!b64) return;
    const r = await window.kairo.power.save({ kind: 'photo', bytes: b64, name: de() ? 'Handy-Foto' : 'Phone photo', ext: 'png' });
    window.toast(r.ok ? (de() ? 'Foto gespeichert' : 'Photo saved') : '✕ ' + r.error.message);
    if (r.ok) window.kairo.power.reveal(r.file);
  }
  function ask() {
    const b64 = frame(); if (!b64) return;
    const q = $c('pcAsk').value.trim() || (de() ? 'Was siehst du auf dem Bild von meiner Handy-Kamera?' : 'What do you see on the picture from my phone camera?');
    $c('pcAsk').value = '';
    qClose('pcOverlay');
    window.App?.askInChat(q, { images: [{ mime: 'image/jpeg', data: b64 }] });
  }
  return { open, stream: () => stream, connected: () => !!stream && pc?.connectionState === 'connected' };
})();
