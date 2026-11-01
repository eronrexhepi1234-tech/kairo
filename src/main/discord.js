// Kairo as a Discord bot in your server.
// Privacy: the bot uses its own small system prompt. It never sees your memory, homework, money,
// screen or files, and it can't run PC actions — other people write in Discord too.
const providers = require('./providers');
const tools = require('./tools');

let client = null;
let status = { running: false, name: null, id: null, guilds: 0, error: null };
const history = new Map();   // channelId -> last messages
const lastUse = new Map();   // userId -> time (simple rate limit)
let ctx = null;

const PERMS = 1024 + 2048 + 64 + 16384 + 32768 + 65536; // view, send, react, embed, attach, read history
const invite = id => `https://discord.com/oauth2/authorize?client_id=${id}&scope=bot&permissions=${PERMS}`;
const clean = s => String(s || '').replace(/\[\[\/?[a-z]+[^\]]*\]\]/gi, '').replace(/@(everyone|here)/g, '@​$1').trim();

function systemPrompt(settings) {
  const lang = { de: 'German', en: 'English', sq: 'Albanian', fr: 'French', es: 'Spanish', it: 'Italian', tr: 'Turkish' }[settings.language] || 'English';
  return [
    `You are ${settings.name || 'Kairo'}, a friendly AI bot in a Discord server with friends. Default language: ${lang}; answer in the language people write.`,
    'Be short (max ~6 sentences), fun and helpful. Use Discord Markdown. No @everyone or @here.',
    'You know nothing private about the owner and you cannot control anyone\'s PC. Refuse harmful or hateful requests politely.',
    `Current date: ${new Date().toLocaleDateString('en-GB', { dateStyle: 'full' })}.`
  ].join('\n');
}

async function answer(msg, text) {
  const settings = ctx.store.get();
  const h = history.get(msg.channelId) || [];
  let extra = '';
  if (/news|nachrichten|heute passiert|happened today/i.test(text)) {
    try { extra = '\n\nFresh headlines:\n' + (await tools.getNews({ lang: settings.language, region: settings.newsRegion, limit: 8 })).map(n => `- ${n.title} (${n.source})`).join('\n'); } catch {}
  }
  const out = await providers.complete(settings, { system: systemPrompt(settings), messages: [...h.slice(-10), { role: 'user', text: `${msg.author.username}: ${text}${extra}` }], maxTokens: 700 });
  h.push({ role: 'user', text: `${msg.author.username}: ${text}` }, { role: 'assistant', text: out });
  history.set(msg.channelId, h.slice(-12));
  return clean(out).slice(0, 1900);
}

const EMOJI = ['🇦', '🇧', '🇨', '🇩'];
async function quiz(msg, topic) {
  const settings = ctx.store.get();
  const raw = await providers.complete(settings, {
    system: 'You are a quiz master. Output strictly valid JSON.',
    messages: [{ role: 'user', text: `Create 5 fun multiple-choice questions about "${topic || 'general knowledge'}" in ${settings.language === 'de' ? 'German' : 'the language of the topic'}. Reply ONLY JSON: {"questions":[{"q":"","options":["","","",""],"answer":0}]}` }]
  });
  const qs = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).questions.slice(0, 5);
  const score = new Map();
  await msg.channel.send(`🎉 **Quiz: ${clean(topic || 'Allgemeinwissen')}** – 5 Fragen, reagiert mit 🇦 🇧 🇨 🇩. Ihr habt je 15 Sekunden!`);
  for (const [i, q] of qs.entries()) {
    const m = await msg.channel.send(`**${i + 1}. ${clean(q.q)}**\n` + q.options.map((o, k) => `${EMOJI[k]} ${clean(o)}`).join('\n'));
    for (let k = 0; k < q.options.length; k++) await m.react(EMOJI[k]);
    await new Promise(r => setTimeout(r, 15000));
    const fresh = await m.fetch();
    const right = fresh.reactions.cache.get(EMOJI[q.answer]);
    const users = right ? (await right.users.fetch()).filter(u => !u.bot) : new Map();
    for (const u of users.values()) score.set(u.username, (score.get(u.username) || 0) + 1);
    await msg.channel.send(`✅ Richtig: ${EMOJI[q.answer]} **${clean(q.options[q.answer])}**${users.size ? ' – ' + [...users.values()].map(u => u.username).join(', ') : ''}`);
  }
  const board = [...score.entries()].sort((a, b) => b[1] - a[1]);
  await msg.channel.send('🏆 **Endstand**\n' + (board.map(([n, s], i) => `${['🥇', '🥈', '🥉'][i] || '•'} ${n}: ${s}`).join('\n') || 'Niemand hat gepunktet 😅'));
}

async function onMessage(msg) {
  if (msg.author.bot) return;
  const me = client.user;
  const isDM = !msg.guild;
  const mentioned = msg.mentions.has(me);
  const cmd = msg.content.match(/^!(kairo|k)\b\s*(.*)$/is);
  if (!isDM && !mentioned && !cmd) return;
  const last = lastUse.get(msg.author.id) || 0;
  if (Date.now() - last < 4000) return;
  lastUse.set(msg.author.id, Date.now());
  let text = (cmd ? cmd[2] : msg.content.replace(new RegExp(`<@!?${me.id}>`, 'g'), '')).trim();
  try {
    await msg.channel.sendTyping();
    if (/^(hilfe|help)$/i.test(text) || !text) {
      return msg.reply('Hey! Ich bin Kairo 👋\n• Schreib mich an (@Kairo) oder `!kairo <Frage>`\n• `!kairo quiz <Thema>` – Quiz für alle\n• `!kairo bild <Beschreibung>` – ich male ein Bild\n• `!kairo news` – was heute passiert ist');
    }
    let m;
    if ((m = text.match(/^quiz\s*(.*)$/i))) return await quiz(msg, m[1]);
    if ((m = text.match(/^(bild|image|mal)\s+(.+)$/i))) {
      const img = await require('./create').image(ctx.store.get(), m[2]);
      return msg.reply({ content: `🎨 ${clean(m[2]).slice(0, 200)}`, files: [img.path] });
    }
    await msg.reply(await answer(msg, text));
  } catch (e) { msg.reply('😵 ' + e.message.slice(0, 200)).catch(() => {}); }
}

async function start() {
  if (client) return publicStatus();
  const token = ctx.store.get().keys.discord;
  if (!token) throw new Error('Kein Discord-Bot-Token gespeichert');
  const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
  client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMessageReactions], partials: [Partials.Channel] });
  client.on(Events.MessageCreate, m => onMessage(m).catch(() => {}));
  client.on(Events.GuildCreate, () => { status.guilds = client.guilds.cache.size; ctx.send('discord:status', publicStatus()); });
  try {
    await client.login(token);
    await new Promise(r => client.once(Events.ClientReady, r));
  } catch (e) {
    client?.destroy(); client = null;
    status = { running: false, error: /disallowed intents/i.test(e.message) ? 'INTENTS' : e.message };
    throw Object.assign(new Error(status.error === 'INTENTS' ? 'Im Discord Developer Portal "Message Content Intent" einschalten.' : e.message), { code: status.error });
  }
  status = { running: true, name: client.user.username, id: client.user.id, guilds: client.guilds.cache.size, error: null };
  return publicStatus();
}

function stop() { client?.destroy(); client = null; status = { running: false }; return publicStatus(); }
const publicStatus = () => ({ ...status, invite: status.id ? invite(status.id) : null });

function register({ ipcMain, wrap, store, send }) {
  ctx = { store, send };
  ipcMain.handle('discord:start', wrap(start));
  ipcMain.handle('discord:stop', wrap(stop));
  ipcMain.handle('discord:status', () => publicStatus());
  if (store.get().discord?.enabled && store.get().keys.discord) setTimeout(() => start().catch(() => {}), 5000);
}

module.exports = { register, getClient: () => client };
