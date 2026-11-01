// Kairo power pack:
//  8  "Was habe ich verpasst?"  – mail, news, game updates, Roblox trends, upcoming dates since Kairo was last open
// 11  oral exam                 – Kairo asks by voice, you answer by voice, grade at the end
// 25  video -> TikTok clips     – Gemini watches the video and picks the best moments (the renderer cuts them)
// 20  Discord server builder    – one sentence -> categories, channels, roles, welcome text (only adds, never deletes)
// 24  tournaments               – post the bracket to Discord (only when the user clicks)
// 22  Roblox trend radar        – real player counts from Roblox, alarm when a game explodes
// 26  thumbnail maker           – 3 YouTube thumbnail backgrounds; the renderer writes the title on them
const { app, ipcMain, dialog, shell, Notification } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const P = () => require('./providers');

let store, getWin;
const LANG = { de: 'German', en: 'English', sq: 'Albanian', fr: 'French', es: 'Spanish', it: 'Italian', tr: 'Turkish' };
const lang = () => LANG[store.get().language] || 'German';
const ud = f => path.join(app.getPath('userData'), f);
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(ud(f), 'utf8')); } catch { return d; } };
const writeJ = (f, v) => fs.writeFileSync(ud(f), JSON.stringify(v));
const jsonOf = raw => { const m = String(raw || '').match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } };
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const send = (ch, ...a) => { const w = getWin?.(); if (w && !w.isDestroyed()) w.webContents.send(ch, ...a); };
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
const safeName = s => String(s || 'Kairo').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 60) || 'Kairo';
async function askJson(system, text, images) {
  const s = store.get();
  for (let i = 0; i < 2; i++) {
    const raw = await P().complete(s, { system: system + (i ? '\nIMPORTANT: reply with valid JSON only.' : ''), messages: [{ role: 'user', text, ...(images ? { images } : {}) }] });
    const j = jsonOf(raw);
    if (j) return j;
  }
  throw new Error('Die KI hat keine gültige Antwort gegeben. Versuch es nochmal.');
}

// ---------- "when was Kairo last open" ----------
let prevSeen = 0;
function trackSeen() {
  const seen = readJ('seen.json', {});
  prevSeen = seen.last || Date.now() - 864e5;
  const mark = () => { try { writeJ('seen.json', { last: Date.now() }); } catch {} };
  mark();
  setInterval(mark, 2 * 60e3);
}

// ---------- 8: what did I miss ----------
async function missed() {
  const s = store.get();
  const since = prevSeen, hours = Math.max(1, Math.round((Date.now() - since) / 36e5));
  const ctx = [], out = { since, hours, news: [], games: [], roblox: [] };
  const jobs = [];
  if (s.mail?.enabled && s.keys.mail) jobs.push((async () => { const x = require('./extras2'); ctx.push('E-MAILS:\n' + x.mailText(await x.checkMail(store))); })());
  jobs.push((async () => {
    const items = await require('./tools').getNews({ lang: s.language, region: s.newsRegion || 'auto', limit: 10 });
    out.news = items.slice(0, 6).map(n => ({ title: n.title, source: n.source, link: n.link }));
    ctx.push('NEWS HEADLINES:\n' + items.slice(0, 10).map(n => `- ${n.title} (${n.source})`).join('\n'));
  })());
  jobs.push((async () => {
    const f = require('./fun');
    const top = f.playtime().top.slice(0, 2);
    for (const g of top) {
      try {
        const n = await timeout(f.patchNotes(s, g.name), 30000);
        if (n && (n.headline || n.points?.length)) {
          out.games.push({ game: n.game || g.name, headline: n.headline || n.title || '', url: n.url || '', image: n.image || '', date: n.date || null });
          ctx.push(`GAME UPDATE ${n.game || g.name} (${n.date ? new Date(n.date).toDateString() : '?'}): ${n.headline || ''} – ${(n.points || []).slice(0, 4).join('; ')}`);
        }
      } catch {}
    }
  })());
  jobs.push((async () => {
    const t = await trendAnalysis(true);
    out.roblox = t.rising.slice(0, 5);
    if (out.roblox.length) ctx.push('ROBLOX RIGHT NOW (fastest growing / trending): ' + out.roblox.map(g => `${g.name} (${g.genre}, ${g.players} players${g.growth != null ? ', +' + Math.round(g.growth * 100) + '%' : ''})`).join('; '));
  })());
  const mem = require('./memory');
  const up = mem.upcoming(7);
  if (up.length) ctx.push('UPCOMING DATES OF THE USER: ' + up.map(m => `${m.text} on ${m.when}`).join('; '));
  try { const rem = readJ('reminders.json', []); const soon = (Array.isArray(rem) ? rem : []).filter(r => r.at && Date.parse(r.at) > Date.now() && Date.parse(r.at) < Date.now() + 2 * 864e5); if (soon.length) ctx.push('REMINDERS: ' + soon.map(r => `${r.text} at ${r.at}`).join('; ')); } catch {}
  await Promise.allSettled(jobs.map(j => timeout(j, 45000)));
  const j = await askJson(`You are Kairo, a personal assistant. The user was away for about ${hours} hours. Write a short, friendly catch-up in ${lang()}, like a friend saying "here's what you missed". Use only the data given, invent nothing.
Reply ONLY JSON: {"headline":"one catchy sentence","sections":[{"kind":"mail|games|roblox|news|school","title":"short title","points":["max 4 short points"]}],"tip":"one useful next step for the user"}. Leave out sections without data. Max 5 sections.`,
    `Name of the user: ${s.userTitle || 'Chef'}\n\n${ctx.join('\n\n') || 'No data could be loaded.'}`);
  return { ...out, ...j };
}

// ---------- 11: oral exam ----------
async function oralTurn({ topic, level, history = [], total = 5 }) {
  const done = history.length >= total;
  const de = store.get().language === 'de';
  const j = await askJson(`You are a fair but demanding teacher holding an ORAL exam in ${lang()} about "${topic}"${level ? ' (level: ' + level + ')' : ''}.
The student answers by voice, so the answer text may contain small speech-to-text mistakes – ignore those.
${done ? `The exam is over. Give the final result.` : `Ask question ${history.length + 1} of ${total}. Mix: facts, "explain why", and one transfer question. If the last answer was weak or incomplete, the next question may be a short follow-up ("Und warum …?"). Keep each question to 1-2 sentences, spoken style.`}
Reply ONLY JSON: {"feedback":"1-2 sentences about the LAST answer (empty if there was none)","points":0-10 for the last answer or null,"question":"${done ? '' : 'the next question'}","grade":${done ? (de ? 'Swiss grade 1-6 with halves (6 = best), as a number' : 'score 0-100') : 'null'},"summary":"${done ? '2-3 sentences overall' : ''}","strong":[${done ? '"max 3 strengths"' : ''}],"improve":[${done ? '"max 3 things to learn"' : ''}]}`,
    history.length ? history.map((h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.a || '(no answer)'}`).join('\n\n') : 'The exam starts now.');
  return { ...j, done };
}

// ---------- 25: long video -> best TikTok moments (Gemini watches the video) ----------
const VMIME = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo', '.m4v': 'video/mp4' };
async function pickVideo() {
  const r = await dialog.showOpenDialog(getWin(), { title: 'Video auswählen', properties: ['openFile'], defaultPath: app.getPath('videos'), filters: [{ name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'mkv', 'm4v', 'avi'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const f = r.filePaths[0];
  return { path: f, name: path.basename(f), size: fs.statSync(f).size };
}
async function analyzeVideo({ file, count = 3, wish = '' }) {
  const s = store.get(), key = s.keys.gemini;
  if (!key) throw Object.assign(new Error('Dafür braucht Kairo einen Gemini-Schlüssel (Einstellungen). Gemini kann Videos ansehen.'), { code: 'NO_GEMINI' });
  const size = fs.statSync(file).size;
  if (size > 1.9e9) throw new Error('Das Video ist zu gross (max. 1.9 GB).');
  const mime = VMIME[path.extname(file).toLowerCase()] || 'video/mp4';
  const G = 'https://generativelanguage.googleapis.com';
  send('power:progress', 'cm', 'upload');
  let r = await fetch(`${G}/upload/v1beta/files`, { method: 'POST', headers: { 'x-goog-api-key': key, 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(size), 'X-Goog-Upload-Header-Content-Type': mime, 'content-type': 'application/json' }, body: JSON.stringify({ file: { display_name: 'kairo-' + Date.now() } }) });
  if (!r.ok) throw new Error('Upload zu Gemini ging nicht (' + r.status + ')');
  const upUrl = r.headers.get('x-goog-upload-url');
  r = await fetch(upUrl, { method: 'POST', headers: { 'Content-Length': String(size), 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' }, body: fs.readFileSync(file) });
  if (!r.ok) throw new Error('Upload zu Gemini ging nicht (' + r.status + ')');
  let info = (await r.json()).file;
  send('power:progress', 'cm', 'watch');
  for (let i = 0; i < 100 && info.state === 'PROCESSING'; i++) {
    await new Promise(res => setTimeout(res, 3000));
    info = await (await fetch(`${G}/v1beta/${info.name}`, { headers: { 'x-goog-api-key': key } })).json();
  }
  if (info.state !== 'ACTIVE') throw new Error('Gemini konnte das Video nicht verarbeiten.');
  const prompt = `You are a top TikTok editor. Watch this video and find the ${count} BEST moments for TikTok / YouTube Shorts (funny, surprising, emotional, a great play, a strong statement). Each clip 12-45 seconds, must make sense on its own, start right before the action, no long intro. ${wish ? 'Wish of the creator: ' + wish + '.' : ''}
Reply ONLY JSON: {"clips":[{"start":seconds,"end":seconds,"title":"short title in ${lang()}","hook":"text on screen for the first 2 seconds, max 6 words, in ${lang()}","why":"one sentence in ${lang()}","captions":[{"t":seconds (absolute time in the video),"text":"2-6 spoken words, in the spoken language"}]}]}
Captions: what is SAID in the clip, in short pieces, with exact absolute times. If nobody speaks, captions = [].`;
  send('power:progress', 'cm', 'pick');
  let j = null, lastErr = '';
  for (const model of ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-pro']) {
    try {
      const g = await fetch(`${G}/v1beta/models/${model}:generateContent`, { method: 'POST', signal: AbortSignal.timeout(240000), headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ file_data: { mime_type: mime, file_uri: info.uri } }, { text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }) });
      if (!g.ok) { lastErr = g.status + ' ' + (await g.text()).slice(0, 160); continue; }
      j = jsonOf((((await g.json()).candidates?.[0]?.content?.parts) || []).map(p => p.text || '').join(''));
      if (j?.clips?.length) break;
    } catch (e) { lastErr = e.message; }
  }
  fetch(`${G}/v1beta/${info.name}`, { method: 'DELETE', headers: { 'x-goog-api-key': key } }).catch(() => {});
  if (!j?.clips?.length) throw new Error('Kairo hat keine guten Stellen gefunden' + (/429|quota/i.test(lastErr) ? ' (Tageslimit von Gemini erreicht)' : lastErr ? ' (' + lastErr.slice(0, 80) + ')' : '') + '.');
  j.clips = j.clips.map(c => ({ ...c, start: Math.max(0, +c.start || 0), end: Math.max((+c.start || 0) + 5, +c.end || 0), captions: (c.captions || []).filter(x => x && x.text).map(x => ({ t: +x.t || 0, text: String(x.text) })) }));
  return { clips: j.clips.slice(0, count) };
}

// ---------- generic save ----------
const DIRS = { tiktok: () => path.join(app.getPath('videos'), 'Kairo TikToks'), thumb: () => path.join(app.getPath('pictures'), 'Kairo Thumbnails'), photo: () => path.join(app.getPath('pictures'), 'Kairo') };
function saveFile({ kind, bytes, name, ext }) {
  const dir = (DIRS[kind] || DIRS.tiktok)();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${safeName(name)} ${stamp()}.${String(ext || 'bin').replace(/[^a-z0-9]/gi, '')}`);
  fs.writeFileSync(file, typeof bytes === 'string' ? Buffer.from(bytes, 'base64') : Buffer.from(bytes));
  return { file };
}

// ---------- 20 + 24: Discord ----------
const PERM = { channels: 16n, roles: 268435456n, admin: 8n };
const BUILD_PERMS = 1024 + 2048 + 64 + 16384 + 32768 + 65536 + 16 + 268435456;
const dc = () => { const c = require('./discord').getClient?.(); if (!c) throw Object.assign(new Error('Der Kairo-Discord-Bot ist nicht online. Starte ihn unter Einstellungen → Discord.'), { code: 'NO_BOT' }); return c; };
function dsGuilds() {
  const c = dc();
  return {
    invite: `https://discord.com/oauth2/authorize?client_id=${c.user.id}&scope=bot&permissions=${BUILD_PERMS}`,
    guilds: [...c.guilds.cache.values()].map(g => { const me = g.members.me, p = me?.permissions; const has = b => !!p && (p.has(PERM.admin) || p.has(b)); return { id: g.id, name: g.name, icon: g.iconURL?.({ size: 64 }) || '', members: g.memberCount, canBuild: has(PERM.channels) && has(PERM.roles) }; })
  };
}
// names are compared without emojis, fancy fonts, separators or case: "🎬︱𝗲𝗱𝗶𝘁𝘀" == "edits"
const SMALLCAPS = { 'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ꜰ': 'f', 'ɢ': 'g', 'ʜ': 'h', 'ɪ': 'i', 'ᴊ': 'j', 'ᴋ': 'k', 'ʟ': 'l', 'ᴍ': 'm', 'ɴ': 'n', 'ᴏ': 'o', 'ᴘ': 'p', 'ǫ': 'q', 'ʀ': 'r', 'ꜱ': 's', 'ᴛ': 't', 'ᴜ': 'u', 'ᴠ': 'v', 'ᴡ': 'w', 'ʏ': 'y', 'ᴢ': 'z' };
const norm = s => String(s || '').normalize('NFKC').replace(/[ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡʏᴢ]/g, c => SMALLCAPS[c]).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
function existing(g) {
  const cats = [], chans = [];
  for (const ch of g.channels.cache.values()) {
    if (ch.type === 4) cats.push({ id: ch.id, name: ch.name, n: norm(ch.name) });
    else chans.push({ id: ch.id, name: ch.name, n: norm(ch.name), type: ch.type, parent: ch.parentId || null });
  }
  const roles = [...g.roles.cache.values()].filter(r => r.name !== '@everyone' && !r.managed).map(r => ({ name: r.name, n: norm(r.name) }));
  return { cats, chans, roles };
}

// research what the best servers of this kind have, then plan a big, complete structure
async function dsPlan({ desc, guildId }) {
  const s = store.get();
  let ex = null;
  try { const g = dc().guilds.cache.get(guildId); if (g) ex = existing(g); } catch {}
  let research = '';
  send('power:progress', 'ds', 'research');
  try {
    research = await timeout(P().complete(s, {
      webSearch: s.provider === 'gemini' || !!s.keys.gemini,
      ...(s.provider !== 'gemini' && s.keys.gemini ? { providerOverride: 'gemini' } : {}),
      system: 'You research Discord servers. Be concrete and short.',
      messages: [{ role: 'user', text: `Search the web: what do the BEST and most popular Discord servers of this kind have? "${desc}"\nList: typical categories, the most useful channels (with what each is for), forum channels, voice channels, roles (staff, levels, interest/ping roles, software/skill roles), rules that fit, and special ideas that make such a server great (events, contests, resources, feedback systems). Max 350 words, bullet points.` }]
    }), 60000);
  } catch {}
  send('power:progress', 'ds', 'plan');
  const have = ex ? `\nThe server ALREADY HAS these (do NOT plan them again, plan around them; you may put new channels into an existing category by using its exact name):\nCategories: ${ex.cats.map(c => c.name).join(', ') || '-'}\nChannels: ${ex.chans.map(c => c.name).join(', ') || '-'}\nRoles: ${ex.roles.map(r => r.name).join(', ') || '-'}` : '';
  const j = await askJson(`You are the best Discord server designer. Design a COMPLETE, professional server for: "${desc}". Language for all names and texts: ${lang()}.
Use this research about what top servers of this kind have:
${research || '(no research available, use your own knowledge)'}
${have}
Rules for your plan:
- 6-9 categories in a logical order: start (welcome, rules, announcements, roles info), then the main topic areas, community/off-topic, voice, staff at the end.
- 4-8 channels per category and AT LEAST 28 channels in total (a real big server), every channel useful and specific to this kind of server. Use "forum" for feedback/help/requests/resources where threads make sense, "announcement" for news, "voice" and "stage" for talking.
- Names PLAIN (no emojis, no special fonts, no dashes): short words like "showcase" or "after effects hilfe". Give each category and channel ONE fitting emoji separately.
- "readonly": true for rules, announcements, info and resource-drop channels where only staff posts. "slowmode" in seconds (0-60) for showcase/promo channels.
- Roles: 10-18 roles in groups: staff (owner, admin, moderator, helper), level (newbie … legend), interest/skill (e.g. software or games), ping roles (events, announcements). Hex colours that fit. hoist true for staff.
- "post": mark exactly one channel "welcome", one "rules", one "roles" (where the app posts those messages).
Reply ONLY JSON: {"categories":[{"name":"Name","emoji":"🎬","channels":[{"name":"name","emoji":"✂️","type":"text|voice|forum|announcement|stage","topic":"what it is for","readonly":false,"slowmode":0,"post":""}]}],"roles":[{"name":"Role","emoji":"","color":"#hex","hoist":false,"group":"staff|level|interest|ping"}],"welcome":"welcome message, 4-7 lines, Discord markdown","rules":["8-10 short rules"],"rolesInfo":"short message explaining the role groups, Discord markdown"}`, desc);
  // mark what already exists, so the preview can show it and the build skips it
  if (ex) {
    for (const c of j.categories || []) {
      c.exists = ex.cats.some(x => x.n === norm(c.name));
      for (const ch of c.channels || []) ch.exists = ex.chans.some(x => x.n === norm(ch.name));
    }
    for (const r of j.roles || []) r.exists = ex.roles.some(x => x.n === norm(r.name));
  }
  return { ...j, research: !!research };
}

// builds the styled plan; skips everything that already exists (same name without emojis/fonts)
async function dsBuild({ guildId, plan }) {
  const c = dc(), g = c.guilds.cache.get(guildId);
  if (!g) throw new Error('Server nicht gefunden');
  const { ChannelType, PermissionFlagsBits } = require('discord.js');
  const ex = existing(g);
  const made = { roles: 0, categories: 0, channels: 0, skipped: 0 };
  const total = (plan.roles || []).length + (plan.categories || []).reduce((s, x) => s + 1 + (x.channels || []).length, 0);
  let step = 0; const tick = () => send('power:progress', 'dsb', Math.round(++step / Math.max(1, total) * 100));
  const posts = {};
  const clean = t => String(t || '').replace(/@(everyone|here)/g, '@​$1');
  for (const r of (plan.roles || []).slice(0, 25)) {
    tick();
    if (ex.roles.some(x => x.n === norm(r.plain || r.name))) { made.skipped++; continue; }
    try { await g.roles.create({ name: String(r.name).slice(0, 90), color: /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : undefined, hoist: !!r.hoist, mentionable: r.group === 'ping', reason: 'Kairo Server-Bauer' }); made.roles++; ex.roles.push({ n: norm(r.plain || r.name) }); } catch {}
  }
  const TYPE = { text: ChannelType.GuildText, voice: ChannelType.GuildVoice, forum: ChannelType.GuildForum, announcement: ChannelType.GuildAnnouncement, stage: ChannelType.GuildStageVoice };
  const FALLBACK = { forum: 'text', announcement: 'text', stage: 'voice' };
  for (const cat of (plan.categories || []).slice(0, 12)) {
    tick();
    let parent = ex.cats.find(x => x.n === norm(cat.plain || cat.name));
    if (parent) made.skipped++;
    else {
      try { const pc = await g.channels.create({ name: String(cat.name).slice(0, 95), type: ChannelType.GuildCategory, reason: 'Kairo Server-Bauer' }); parent = { id: pc.id, n: norm(cat.plain || cat.name) }; ex.cats.push(parent); made.categories++; } catch { continue; }
    }
    for (const ch of (cat.channels || []).slice(0, 10)) {
      tick();
      const n = norm(ch.plain || ch.name);
      const have = ex.chans.find(x => x.n === n);
      if (have) { made.skipped++; if (ch.post && !posts[ch.post]) posts[ch.post] = have.id; continue; }
      let kind = TYPE[ch.type] != null ? ch.type : 'text';
      const voice = () => kind === 'voice' || kind === 'stage';
      for (let tries = 0; tries < 2; tries++) {
        try {
          const opts = { name: String(ch.name).slice(0, 95), type: TYPE[kind], parent: parent.id, reason: 'Kairo Server-Bauer' };
          if (!voice()) opts.topic = String(ch.topic || '').slice(0, 1000);
          if (!voice() && ch.slowmode) opts.rateLimitPerUser = Math.max(0, Math.min(21600, +ch.slowmode || 0));
          if (ch.readonly && !voice()) opts.permissionOverwrites = [{ id: g.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.SendMessagesInThreads] }, { id: c.user.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] }];
          const nc = await g.channels.create(opts);
          made.channels++; ex.chans.push({ id: nc.id, n });
          if (ch.post && !posts[ch.post] && (kind === 'text' || kind === 'announcement')) posts[ch.post] = nc.id;
          if (!posts.first && kind === 'text') posts.first = nc.id;
          break;
        } catch { if (FALLBACK[kind]) kind = FALLBACK[kind]; else break; }
      }
    }
  }
  // messages: welcome, rules, roles info (only into channels Kairo made or found)
  const say = async (id, text) => { if (!id || !text) return; try { const chn = g.channels.cache.get(id) || await g.channels.fetch(id); await chn.send(clean(text).slice(0, 1990)); } catch {} };
  await say(posts.welcome || posts.first, plan.welcome);
  if (plan.rules?.length) await say(posts.rules || posts.welcome || posts.first, (lang() === 'German' ? '**Regeln**\n' : '**Rules**\n') + plan.rules.map((r, i) => `${i + 1}. ${r}`).join('\n'));
  await say(posts.roles, plan.rolesInfo);
  return made;
}

function dsChannels(guildId) {
  const c = dc(), g = c.guilds.cache.get(guildId);
  if (!g) throw new Error('Server nicht gefunden');
  const me = g.members.me;
  return { channels: [...g.channels.cache.values()].filter(ch => ch.type === 0 && ch.permissionsFor(me)?.has(2048n)).map(ch => ({ id: ch.id, name: ch.name })) };
}
async function dsPost({ channelId, text }) {
  const ch = dc().channels.cache.get(channelId);
  if (!ch) throw new Error('Kanal nicht gefunden');
  await ch.send(String(text || '').replace(/@(everyone|here)/g, '@​$1').slice(0, 1990));
  return { posted: true };
}

// ---------- 22: Roblox trend radar ----------
const TF = 'roblox-trends.json';
async function fetchRoblox() {
  const r = await fetch(`https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${crypto.randomUUID()}&device=computer&country=all`, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('Roblox antwortet nicht (' + r.status + ')');
  const j = await r.json(), games = {};
  for (const s of j.sorts || []) for (const g of s.games || []) {
    const id = String(g.universeId);
    const e = games[id] || (games[id] = { n: String(g.name || '').replace(/[\s\u2028\u2029]+/g, ' ').trim(), p: g.playerCount || 0, g: g.genreL1 || '', g2: g.genreL2 || '', pl: g.rootPlaceId, up: g.totalUpVotes || 0, dn: g.totalDownVotes || 0, s: [] });
    e.p = Math.max(e.p, g.playerCount || 0);
    if (!e.s.includes(s.sortId)) e.s.push(s.sortId);
  }
  return games;
}
async function snapshot(force) {
  const d = readJ(TF, { snaps: [], alerted: {} });
  const last = d.snaps[d.snaps.length - 1];
  if (!force && last && Date.now() - last.t < 25 * 60e3) return d;
  const games = await fetchRoblox();
  d.snaps.push({ t: Date.now(), games });
  d.snaps = d.snaps.filter(x => Date.now() - x.t < 8 * 864e5);
  // keep the file small: at most one snapshot per 90 min except the newest
  d.snaps = d.snaps.filter((x, i, a) => i === a.length - 1 || !a[i + 1] || a[i + 1].t - x.t > 90 * 60e3 || i === 0);
  writeJ(TF, d);
  return d;
}
async function trendAnalysis(fresh) {
  let d;
  try { d = await snapshot(false); } catch { d = readJ(TF, { snaps: [], alerted: {} }); }
  const cur = d.snaps[d.snaps.length - 1];
  if (!cur) return { rising: [], genres: [], baseAt: null, at: null };
  // compare with the snapshot closest to 24 h ago that is at least 3 h old
  const old = d.snaps.filter(x => cur.t - x.t >= 3 * 36e5);
  const base = old.sort((a, b) => Math.abs(cur.t - a.t - 864e5) - Math.abs(cur.t - b.t - 864e5))[0] || null;
  const rows = Object.entries(cur.games).map(([id, g]) => {
    const b = base?.games[id];
    const growth = base ? (b ? (g.p - b.p) / Math.max(b.p, 50) : null) : null;
    const rating = g.up + g.dn ? Math.round(g.up / (g.up + g.dn) * 100) : null;
    return { id, name: g.n, players: g.p, genre: g.g || '–', genre2: g.g2 || '', placeId: g.pl, growth, isNew: !!base && !b, rating, trending: g.s.some(x => /trending|up-and-coming/.test(x)) };
  });
  const rising = rows.filter(r => r.players >= 1500 && (r.trending || r.growth > 0.3 || r.isNew))
    .sort((a, b) => (b.growth ?? (b.isNew ? 2 : -1)) - (a.growth ?? (a.isNew ? 2 : -1)) || b.players - a.players).slice(0, 25);
  const sum = (games) => { const m = {}; for (const g of Object.values(games)) if (g.g) m[g.g] = (m[g.g] || 0) + g.p; return m; };
  const gc = sum(cur.games), gb = base ? sum(base.games) : {};
  const genres = Object.entries(gc).map(([name, p]) => ({ name, players: p, growth: base && gb[name] ? (p - gb[name]) / gb[name] : null })).sort((a, b) => b.players - a.players).slice(0, 10);
  return { rising, genres, at: cur.t, baseAt: base?.t || null };
}
async function trendTick() {
  const s = store.get();
  if (!s.robloxTrendAlarm) return;
  try { await snapshot(); } catch { return; }
  const t = await trendAnalysis();
  if (!t.baseAt) return;
  const d = readJ(TF, { snaps: [], alerted: {} });
  d.alerted ||= {};
  const hot = t.rising.filter(g => g.growth >= 1 && g.players >= 10000 && !(d.alerted[g.id] > Date.now() - 3 * 864e5)).slice(0, 2);
  if (!hot.length) return;
  for (const g of hot) {
    d.alerted[g.id] = Date.now();
    const h = Math.round((t.at - t.baseAt) / 36e5);
    const title = s.language === 'de' ? `Roblox-Trend: ${g.name} explodiert` : `Roblox trend: ${g.name} is exploding`;
    const body = `${g.genre} · ${g.players.toLocaleString('de-CH')} ${s.language === 'de' ? 'Spieler' : 'players'} · +${Math.round(g.growth * 100)}% ${s.language === 'de' ? 'in' : 'in'} ${h} h`;
    try { const n = new Notification({ title, body }); n.on('click', () => { const w = getWin(); if (w) { if (w.isMinimized()) w.restore(); w.show(); w.focus(); } send('power:open', 'trends'); }); n.show(); } catch {}
    send('power:trendAlert', { title, body });
  }
  writeJ(TF, d);
}

// ---------- 26: thumbnails ----------
async function thumbImage(prompt, photo) {
  const s = store.get(), key = s.keys.gemini;
  if (key) {
    for (const model of ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image']) {
      try {
        const parts = [{ text: prompt }];
        if (photo) parts.unshift({ inline_data: { mime_type: photo.mime || 'image/jpeg', data: photo.data } });
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', signal: AbortSignal.timeout(90000), headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '16:9' } } }) });
        if (!r.ok) continue;
        const part = (await r.json()).candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part) return { data: part.inlineData.data, mime: part.inlineData.mimeType || 'image/png' };
      } catch {}
    }
  }
  if (photo) throw new Error('Mit eigenem Foto braucht Kairo einen Gemini-Schlüssel mit Bildern.');
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 450))}?width=1280&height=720&nologo=true&seed=${Date.now() % 100000}`, { signal: AbortSignal.timeout(120000) }).catch(() => null);
    if (r?.ok && /image/.test(r.headers.get('content-type') || '')) return { data: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: 'image/jpeg' };
    await new Promise(res => setTimeout(res, 15000));
  }
  throw new Error('Der Bilddienst ist gerade überlastet. Versuch es gleich nochmal.');
}
async function thumbs({ title, style = '', photo = null }) {
  const plan = await askJson(`You are a YouTube thumbnail expert (MrBeast-level click-through rate). Video title: "${title}". Style: ${style || 'fits the title'}.
Make 3 DIFFERENT thumbnail ideas. The picture must have NO text in it (the app writes the text itself). Leave the left or right third calmer so text fits.
Reply ONLY JSON: {"ideas":[{"scene":"detailed English image prompt: subject, emotion, background, colors, lighting, very high contrast, vivid, 16:9 YouTube thumbnail, no text, no letters","text":"2-4 punchy words in ${lang()} for the thumbnail","accent":"#hex colour that pops","side":"left|right"}]}`, title);
  const ideas = (plan.ideas || []).slice(0, 3);
  const out = [];
  for (let i = 0; i < ideas.length; i++) {
    send('power:progress', 'th', i + 1);
    const idea = ideas[i];
    try {
      const img = await thumbImage(idea.scene + (photo ? ' Use the person from the attached photo as the main subject with a very expressive face; keep their look.' : '') + ' No text, no letters, no watermark.', photo);
      out.push({ ...idea, ...img });
    } catch (e) { if (!out.length && i === ideas.length - 1) throw e; }
  }
  if (!out.length) throw new Error('Keine Bilder bekommen');
  return { thumbs: out };
}

function register(ctx) {
  ({ store, getWin } = ctx);
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { message: e.message, code: e.code || null } }; } };
  trackSeen();
  ipcMain.handle('power:missed', wrap(() => missed()));
  ipcMain.handle('power:oral', wrap(o => oralTurn(o || {})));
  ipcMain.handle('power:pickVideo', wrap(async () => ({ video: await pickVideo() })));
  ipcMain.handle('power:analyzeVideo', wrap(o => analyzeVideo(o || {})));
  ipcMain.handle('power:save', wrap(o => saveFile(o || {})));
  ipcMain.handle('power:reveal', (_e, f) => shell.showItemInFolder(String(f)));
  ipcMain.handle('power:dsGuilds', wrap(() => dsGuilds()));
  ipcMain.handle('power:dsPlan', wrap(o => dsPlan(o || {})));
  ipcMain.handle('power:dsBuild', wrap(o => dsBuild(o || {})));
  ipcMain.handle('power:dsChannels', wrap(id => dsChannels(id)));
  ipcMain.handle('power:dsPost', wrap(o => dsPost(o || {})));
  ipcMain.handle('power:trends', wrap(async force => { if (force) await snapshot(true); return trendAnalysis(); }));
  ipcMain.handle('power:thumbs', wrap(o => thumbs(o || {})));
  setTimeout(() => trendTick().catch(() => {}), 90e3);
  setInterval(() => trendTick().catch(() => {}), 2 * 36e5);
}

module.exports = { register };
