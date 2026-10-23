// One streaming chat interface over Anthropic, OpenAI, Google Gemini and any
// OpenAI-compatible server (Ollama, LM Studio, OpenRouter, Groq, Mistral, xAI ...).
//
// Messages use one internal shape:
//   { role: 'user' | 'assistant', text: string, images?: [{ mime, data /* base64 */ }] }

async function* sseLines(res) {
  const decoder = new TextDecoder();
  let buf = '';
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, '');
      buf = buf.slice(i + 1);
      if (line.startsWith('data:')) yield line.slice(5).trim();
    }
  }
  if (buf.startsWith('data:')) yield buf.slice(5).trim();
}

async function ensureOk(res, provider) {
  if (res.ok) return;
  let detail = '';
  try {
    const j = await res.json();
    detail = j.error?.message || j.message || JSON.stringify(j);
  } catch { detail = res.statusText; }
  const err = new Error(`${provider} ${res.status}: ${detail}`);
  err.status = res.status;
  throw err;
}

// ---------- Anthropic ----------
async function* anthropic({ key, model, system, messages, signal, maxTokens }) {
  const body = {
    model, system, stream: true, max_tokens: maxTokens || 4096,
    messages: messages.map(m => ({
      role: m.role,
      content: [
        ...(m.images || []).map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mime, data: img.data } })),
        { type: 'text', text: m.text || ' ' }
      ]
    }))
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body)
  });
  await ensureOk(res, 'Anthropic');
  for await (const data of sseLines(res)) {
    let ev; try { ev = JSON.parse(data); } catch { continue; }
    if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') yield ev.delta.text;
    if (ev.type === 'error') throw new Error('Anthropic: ' + (ev.error?.message || 'stream error'));
  }
}

// ---------- OpenAI + compatible ----------
function openaiMessages(system, messages) {
  return [
    { role: 'system', content: system },
    ...messages.map(m => {
      if (!m.images?.length || m.role !== 'user') return { role: m.role, content: m.text || ' ' };
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.text || ' ' },
          ...m.images.map(img => ({ type: 'image_url', image_url: { url: `data:${img.mime};base64,${img.data}` } }))
        ]
      };
    })
  ];
}

async function* openaiCompatible({ key, model, system, messages, signal, baseUrl, label }) {
  const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/chat/completions';
  const headers = { 'content-type': 'application/json' };
  if (key) headers.authorization = 'Bearer ' + key;
  const res = await fetch(url, {
    method: 'POST', signal, headers,
    body: JSON.stringify({ model, stream: true, messages: openaiMessages(system, messages) })
  });
  await ensureOk(res, label || 'OpenAI');
  for await (const data of sseLines(res)) {
    if (data === '[DONE]') return;
    let ev; try { ev = JSON.parse(data); } catch { continue; }
    const t = ev.choices?.[0]?.delta?.content;
    if (t) yield t;
  }
}

// ---------- Google Gemini ----------
async function* gemini({ key, model, system, messages, signal, webSearch, onSource }) {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [
        ...(m.images || []).map(img => ({ inline_data: { mime_type: img.mime, data: img.data } })),
        { text: m.text || ' ' }
      ]
    }))
  };
  // Gemini 3 models think a lot by default; "low" makes the first word arrive much sooner.
  if (/^gemini-3/.test(model)) body.generationConfig = { thinkingConfig: { thinkingLevel: 'low' } };
  if (webSearch) body.tools = [{ google_search: {} }];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const res = await fetch(url, {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body)
  });
  await ensureOk(res, 'Gemini');
  const seen = new Set();
  for await (const data of sseLines(res)) {
    let ev; try { ev = JSON.parse(data); } catch { continue; }
    const cand = ev.candidates?.[0];
    for (const p of cand?.content?.parts || []) if (p.text && !p.thought) yield p.text;
    for (const c of cand?.groundingMetadata?.groundingChunks || []) {
      if (c.web?.uri && !seen.has(c.web.uri)) { seen.add(c.web.uri); onSource?.({ title: c.web.title, link: c.web.uri, source: c.web.title }); }
    }
  }
}

// Backup models when the chosen one is overloaded or too slow.
const FALLBACKS = { gemini: ['gemini-3.5-flash', 'gemini-flash-lite-latest'] };
const FIRST_BYTE_MS = 20000;
const cooldown = new Map(); // model -> time until which we skip it

function rawStream(provider, args, settings) {
  switch (provider) {
    case 'anthropic': return anthropic(args);
    case 'openai': return openaiCompatible({ ...args, label: 'OpenAI' });
    case 'gemini': return gemini(args);
    case 'custom': return openaiCompatible({ ...args, baseUrl: settings.customBaseUrl, label: 'Custom' });
    default: throw new Error('Unknown provider ' + provider);
  }
}

const retryable = e => e.code === 'SLOW' || [429, 500, 502, 503, 504].includes(e.status);

async function* stream(settings, { system, messages, signal, providerOverride, maxTokens, webSearch, onSource, onRetry }) {
  const provider = providerOverride || settings.provider;
  const key = settings.keys[provider];
  if (provider !== 'custom' && !key) throw Object.assign(new Error('NO_KEY'), { code: 'NO_KEY' });

  const chosen = settings.models[provider];
  let models = [...new Set([chosen, ...(FALLBACKS[provider] || [])])];
  const fresh = models.filter(m => !(cooldown.get(m) > Date.now()));
  if (fresh.length) models = fresh;

  let lastErr;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort);
    let slow = false;
    const timer = setTimeout(() => { slow = true; ctrl.abort(); }, FIRST_BYTE_MS);
    let started = false;
    try {
      const it = rawStream(provider, { key, model, system, messages, signal: ctrl.signal, maxTokens, webSearch, onSource }, settings);
      for await (const t of it) {
        if (!started) { started = true; clearTimeout(timer); }
        yield t;
      }
      return;
    } catch (e) {
      if (signal?.aborted) throw e;
      const err = slow ? Object.assign(new Error(`${model} answered too slowly`), { code: 'SLOW' }) : e;
      // a search tool can hit a rate limit: try once more without it
      if (webSearch && err.status === 429) { webSearch = false; i--; onRetry?.(model); continue; }
      if (started || !retryable(err) || i === models.length - 1) throw err;
      cooldown.set(model, Date.now() + 10 * 60 * 1000);
      lastErr = err;
      onRetry?.(models[i + 1]);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  throw lastErr;
}

async function complete(settings, opts) {
  let out = '';
  for await (const t of stream(settings, opts)) out += t;
  return out;
}

// Ask each provider for its live model list, so the app never ships stale model names.
async function listModels(settings, provider) {
  const key = settings.keys[provider];
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/models?limit=100', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } });
    await ensureOk(res, 'Anthropic');
    return (await res.json()).data.map(m => m.id);
  }
  if (provider === 'openai' || provider === 'custom') {
    const base = provider === 'openai' ? 'https://api.openai.com/v1' : settings.customBaseUrl.replace(/\/$/, '');
    const res = await fetch(base + '/models', { headers: key ? { authorization: 'Bearer ' + key } : {} });
    await ensureOk(res, provider);
    let ids = (await res.json()).data.map(m => m.id);
    if (provider === 'openai') ids = ids.filter(id => /^(gpt|o\d|chatgpt)/.test(id) && !/(audio|realtime|tts|transcribe|image|search|embedding)/.test(id));
    return ids.sort().reverse();
  }
  if (provider === 'gemini') {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    await ensureOk(res, 'Gemini');
    return (await res.json()).models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''))
      .filter(id => id.startsWith('gemini'));
  }
  return [];
}

// ---------- Voice (OpenAI) ----------
async function speak(settings, text) {
  const key = settings.keys.openai;
  if (!key) throw Object.assign(new Error('NO_KEY'), { code: 'NO_KEY' });
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: settings.voice.ttsModel, voice: settings.voice.openaiVoice, input: text.slice(0, 4000), format: 'mp3',
      instructions: 'Speak naturally and relaxed, like a real person talking to a friend. Match the language of the text.'
    })
  });
  await ensureOk(res, 'OpenAI TTS');
  return { audio: Buffer.from(await res.arrayBuffer()).toString('base64'), mime: 'audio/mpeg' };
}

// Natural Gemini voice. Returns raw 24 kHz 16-bit PCM; the renderer wraps it as WAV.
const GEMINI_TTS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'];
async function geminiSpeak(settings, text) {
  const key = settings.keys.gemini;
  if (!key) throw Object.assign(new Error('NO_KEY'), { code: 'NO_KEY' });
  let lastErr;
  for (const model of GEMINI_TTS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(30000),
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say this naturally and relaxed, like a friend talking:\n' + text.slice(0, 3000) }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voice.geminiVoice || 'Kore' } } } }
        })
      });
      await ensureOk(res, 'Gemini TTS');
      const part = (await res.json()).candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part) return { audio: part.inlineData.data, mime: part.inlineData.mimeType || 'audio/L16;rate=24000' };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Gemini TTS returned no audio');
}

async function transcribeGemini(settings, audioBase64, mime) {
  const key = settings.keys.gemini;
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent', {
    method: 'POST', signal: AbortSignal.timeout(30000),
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [
      { inline_data: { mime_type: mime, data: audioBase64 } },
      { text: 'Transcribe this speech exactly, in the language it is spoken. Output only the transcript.' }
    ] }] })
  });
  await ensureOk(res, 'Gemini');
  return ((await res.json()).candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
}

async function transcribe(settings, audioBase64, mime) {
  const key = settings.keys.openai;
  if (!key && settings.keys.gemini) return transcribeGemini(settings, audioBase64, mime);
  if (!key) throw Object.assign(new Error('NO_KEY'), { code: 'NO_KEY' });
  const form = new FormData();
  form.append('model', settings.voice.sttModel);
  form.append('file', new Blob([Buffer.from(audioBase64, 'base64')], { type: mime }), 'speech.webm');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { authorization: 'Bearer ' + key }, body: form
  });
  await ensureOk(res, 'OpenAI STT');
  return (await res.json()).text;
}

// Picks the best Gemini Live (speech-to-speech) model this key can use.
async function liveModels(settings) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=300', { headers: { 'x-goog-api-key': settings.keys.gemini } });
  await ensureOk(res, 'Gemini');
  const ids = (await res.json()).models
    .filter(m => m.supportedGenerationMethods?.includes('bidiGenerateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(id => !/(transcribe|translate|extended|robotics)/.test(id));
  const ver = id => parseFloat((id.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
  const rank = id => (/native-audio-latest/.test(id) ? 1 : 0) + (/-live$/.test(id) ? 2 : 0) + ver(id) * 10 - (/preview/.test(id) ? 1 : 0);
  return ids.sort((a, b) => rank(b) - rank(a));
}

module.exports = { stream, complete, listModels, speak, geminiSpeak, transcribe, liveModels };
