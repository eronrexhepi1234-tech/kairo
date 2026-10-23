// Decides what context a message needs (screen, news, folder), then streams the reply.
const providers = require('./providers');
const tools = require('./tools');
const { buildSystemPrompt } = require('./persona');

const SCREEN_RX = /(bildschirm|screen|was siehst|what do you see|what'?s on my|ekran|écran|pantalla|schermo|was ist das hier|what is this|çfarë sheh|cosa vedi|qué ves|monitor)/i;
const WHERE_RX = /(wo (ist|könnte|liegt) das|wo bin ich|welches land|which country|where (is|could) this|where am i|ku është kjo|ku jam|në cilin vend|où est-ce|quel pays|dónde es esto|qué país|dove si trova|che paese|burası neresi|hangi ülke)/i;
const NEWS_RX = /(news|nachrichten|neuigkeiten|heute.{0,25}(passiert|los|geschehen|neu)|was gibt.{0,12}neues|aktuell|happened today|today'?s|going on (in the world|today)|schlagzeilen|headlines|was ist los|lajme|sot.{0,20}ndodh|çfarë.{0,20}ndodh|actualités|aujourd'hui|noticias|qué pasó hoy|notizie|oggi|haber|bugün|ne oldu)/i;
const NEWS_ABOUT_RX = /(?:news|nachrichten|lajme|noticias|notizie|actualités)\s+(?:about|über|zu|aus|from|in|për|nga|sobre|su|sur)\s+(.{2,60})/i;

const WHERE_PROMPT = `The user wants to know WHERE the place on their screen is (photo, street view, video, map, game like GeoGuessr).
1. List the concrete clues you see: signs and their language/script, road markings, driving side, licence plates, poles, bollards, architecture, vegetation, landscape, sun, weather, people, shops, brands.
2. Use Google Search if available to check specific clues (shop names, signs, landmarks, phone prefixes).
3. Give your best guess: country, region/city, approximate coordinates, and confidence in %. Mention 1-2 alternatives if unsure.
4. End your reply with a line \`[[fly: <best guess place name>]]\` so the app can show it on the Earth.`;

// questions whose answer changes over time -> let Gemini search Google
const FRESH_RX = /(wann kommt|wann erscheint|release|erscheint|ist .{1,30} down|server.{0,10}(down|status)|morgen|aktuell|neueste|latest|newest|preis|price|kostet|score|ergebnis|resultat|spielstand|tabelle|transfer|update|patch|season|saison|turnier|tournament|this week|diese woche|gestern|yesterday|2026|2027)/i;
const FREE_GAMES_RX = /((gratis|kostenlos|free|umsonst).{0,25}(spiel|game)|(spiel|game).{0,30}(gratis|kostenlos|free|umsonst)|\bepic\b)/i;
const WEATHER_RX = /(wetter|weather|regnet|regen|schnee|temperatur|grad draussen|moti|kohë|météo|tiempo|meteo|hava durumu)/i;
const CLIP_RX = /(zwischenablage|clipboard|was ich kopiert|den kopierten|kopierte text|copied)/i;

async function epicFreeGames() {
  const r = await fetch('https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=de&country=CH&allowCountries=CH', { signal: AbortSignal.timeout(10000) });
  const j = await r.json();
  const now = Date.now();
  return (j.data?.Catalog?.searchStore?.elements || []).map(e => {
    const cur = e.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0];
    const next = e.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers?.[0];
    const free = cur && cur.discountSetting?.discountPercentage === 0 && Date.parse(cur.startDate) <= now && Date.parse(cur.endDate) > now;
    const soon = next && next.discountSetting?.discountPercentage === 0;
    if (!free && !soon) return null;
    return `${e.title} — ${free ? 'FREE now until ' + cur.endDate.slice(0, 10) : 'free from ' + next.startDate.slice(0, 10)}`;
  }).filter(Boolean);
}

function detect(text) {
  const where = WHERE_RX.test(text);
  return {
    where,
    fresh: FRESH_RX.test(text),
    freeGames: FREE_GAMES_RX.test(text),
    weather: WEATHER_RX.test(text),
    clip: CLIP_RX.test(text),
    screen: where || SCREEN_RX.test(text),
    news: !where && NEWS_RX.test(text),
    newsQuery: (text.match(NEWS_ABOUT_RX) || [])[1]?.replace(/[?.!]+$/, '') || ''
  };
}

/**
 * @param settings  current settings
 * @param req       { history, text, images, attachScreen, attachNews, newsQuery, folderContext, extraSystem, auto }
 * @param onEvent   (type, payload) => void   types: status, chunk, sources
 */
async function run(settings, req, onEvent, signal) {
  const want = req.auto === false ? {} : detect(req.text || '');
  const attachScreen = req.attachScreen || want.screen;
  const attachNews = req.attachNews || want.news;
  const images = [...(req.images || [])];
  const context = [];
  const sources = [];
  const extra = [req.extraSystem, want.where ? WHERE_PROMPT : ''].filter(Boolean).join('\n\n');

  if (attachScreen) {
    onEvent('status', want.where ? 'where' : 'screen');
    images.push(await tools.captureScreen());
  }
  if (attachNews) {
    onEvent('status', 'news');
    try {
      const items = await tools.getNews({ query: req.newsQuery || want.newsQuery, lang: settings.language, region: settings.newsRegion });
      sources.push(...items.slice(0, 8));
      onEvent('sources', sources);
      context.push('Fresh news headlines (fetched just now):\n' + items.map((n, i) => `${i + 1}. ${n.title} — ${n.source} (${n.date})`).join('\n'));
    } catch (e) {
      context.push('News could not be loaded: ' + e.message);
    }
  }
  if (want.freeGames) {
    try { const g = await epicFreeGames(); if (g.length) context.push('Epic Games Store free games right now (live data):\n' + g.join('\n')); } catch {}
  }
  if (want.weather) {
    try {
      const w = await require('./briefing').weather(settings.city, settings.language);
      context.push(`Live weather for ${w.place}: now ${w.now.temp}°C, ${w.now.text}, feels ${w.now.feels}°C, wind ${w.now.wind} km/h.\n` +
        w.days.map(d => `${d.date}: ${d.min}–${d.max}°C, ${d.text}, rain ${d.rain}%`).join('\n') + '\n(If the user asks about another place, say this is for their home city and use Google Search for the other place.)');
    } catch (e) { if (e.code === 'NO_CITY') context.push('No home city is set. Ask the user for their city, and tell them they can set it under Settings → Profile.'); }
  }
  if (want.clip) {
    const t = require('electron').clipboard.readText();
    if (t) context.push('Text the user copied to the clipboard:\n"""\n' + t.slice(0, 6000) + '\n"""');
  }
  if (req.folderContext) context.push('The user shared this folder from their PC:\n' + req.folderContext);

  const userText = [context.join('\n\n'), req.text].filter(Boolean).join('\n\n---\nUser message:\n');
  const messages = [...(req.history || []).slice(-20), { role: 'user', text: userText, images }];

  onEvent('status', 'thinking');
  const system = buildSystemPrompt(settings, extra);
  let full = '';
  const stream = providers.stream(settings, {
    system, messages, signal,
    webSearch: want.where || attachNews || want.fresh, // Gemini researches with Google Search
    onSource: s => { if (sources.length < 12) { sources.push(s); onEvent('sources', sources); } },
    onRetry: model => onEvent('status', 'retry')
  });
  for await (const t of stream) {
    full += t;
    onEvent('chunk', t);
  }
  return { text: full, usedScreen: !!attachScreen, usedNews: !!attachNews, screenshot: attachScreen ? images[images.length - 1] : null };
}

module.exports = { run, detect };
