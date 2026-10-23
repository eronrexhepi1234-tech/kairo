// Speaking (Windows voices or natural OpenAI voices) and listening (OpenAI transcription).
window.Voice = (function () {
  let audio = null, ctx = null, raf = 0, recorder = null, chunks = [];
  const presence = () => document.getElementById('presence');

  const LANG_CODES = { de: 'de', en: 'en', sq: 'sq', fr: 'fr', es: 'es', it: 'it', tr: 'tr' };

  function clean(text) {
    return text.replace(/```[\s\S]*?```/g, ' ').replace(/\[\[fly:[^\]]*\]\]/g, '').replace(/[#*_`>|]/g, '').replace(/https?:\/\/\S+/g, '').trim();
  }

  // raw 16-bit mono PCM (base64) -> playable WAV blob URL
  function pcmToWavUrl(b64, rate) {
    const pcm = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const buf = new ArrayBuffer(44 + pcm.length);
    const v = new DataView(buf);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, pcm.length, true);
    new Uint8Array(buf, 44).set(pcm);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }

  function setBars(levels) {
    const bars = presence().querySelectorAll('i');
    bars.forEach((b, i) => { b.style.height = levels ? Math.max(4, Math.min(24, levels[i])) + 'px' : ''; });
  }

  function stop() {
    speechSynthesis.cancel();
    if (audio) { audio.pause(); audio = null; }
    cancelAnimationFrame(raf);
    setBars(null);
    presence().classList.remove('speaking');
  }

  function fakeBars() {
    const tick = () => {
      const t = performance.now() / 120;
      setBars([0, 1, 2, 3, 4].map(i => 8 + Math.abs(Math.sin(t + i * 1.3)) * 14));
      raf = requestAnimationFrame(tick);
    };
    tick();
  }

  async function speak(text, settings) {
    stop();
    const said = clean(text);
    if (!said) return;
    presence().classList.add('speaking');

    const engine = await window.kairo.voice.engine();
    if (engine !== 'system') {
      fakeBars();
      const r = await window.kairo.voice.speak(said);
      cancelAnimationFrame(raf);
      if (!r.ok) { presence().classList.remove('speaking'); return window.toast(r.error.code === 'NO_KEY' ? t('err.nokey') : r.error.message); }
      audio = new Audio(/L16|pcm/i.test(r.mime) ? pcmToWavUrl(r.audio, +(r.mime.match(/rate=(\d+)/) || [])[1] || 24000) : `data:${r.mime};base64,${r.audio}`);
      audio.playbackRate = settings.voice.rate || 1;
      // real level meter from the audio
      ctx ||= new AudioContext();
      const srcNode = ctx.createMediaElementSource(audio);
      const an = ctx.createAnalyser(); an.fftSize = 64;
      srcNode.connect(an); an.connect(ctx.destination);
      const data = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(data);
        setBars([2, 5, 8, 12, 16].map(i => 4 + data[i] / 11));
        raf = requestAnimationFrame(tick);
      };
      audio.onended = stop;
      await audio.play();
      tick();
      return;
    }

    const u = new SpeechSynthesisUtterance(said);
    const voices = speechSynthesis.getVoices();
    const lang = LANG_CODES[settings.language] || 'en';
    u.voice = voices.find(v => v.name === settings.voice.systemVoice) || voices.find(v => v.lang.startsWith(lang) && /natural|online/i.test(v.name)) || voices.find(v => v.lang.startsWith(lang)) || null;
    u.lang = u.voice?.lang || lang;
    u.rate = settings.voice.rate || 1;
    u.onend = stop;
    fakeBars();
    speechSynthesis.speak(u);
  }

  async function startListening() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.start();
    presence().classList.add('listening');
  }

  function stopListening() {
    return new Promise(resolve => {
      if (!recorder) return resolve(null);
      recorder.onstop = async () => {
        presence().classList.remove('listening');
        recorder.stream.getTracks().forEach(tr => tr.stop());
        recorder = null;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        const r = await window.kairo.voice.transcribe(btoa(bin), 'audio/webm');
        if (!r.ok) { window.toast(r.error.code === 'NO_KEY' ? 'Voice input needs an OpenAI key.' : r.error.message); return resolve(null); }
        resolve(r.text);
      };
      recorder.stop();
    });
  }

  return { speak, stop, startListening, stopListening, isListening: () => !!recorder, voices: () => speechSynthesis.getVoices() };
})();
