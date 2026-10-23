// Game Coach: Kairo looks at the game on your screen and helps.
// It gives hints and guesses; it never moves your mouse or presses keys in other games.
const providers = require('./providers');
const tools = require('./tools');
const { buildSystemPrompt } = require('./persona');

const PROFILES = {
  geoguessr: {
    json: true,
    prompt: `The screenshot shows a GeoGuessr-style street view round. Work like a top GeoGuessr player:
look at road lines, bollards, poles, signs and their language/script, license plates, driving side, vegetation, soil colour,
architecture, sun position, car/camera meta and anything else. Then guess the location.
Reply with ONLY a JSON object, no code fence:
{"country":"...","region":"...","lat":number,"lng":number,"confidence":0-100,"clues":["short clue", "..."],"tip":"one sentence on what to learn from this round"}`
  },
  chess: { prompt: 'The screenshot shows a chess game. Read the position carefully (say if you are unsure about any square). Suggest the best move for the side to move with a short reason, and one plan. Note: an engine is stronger than you for exact tactics.' },
  minecraft: { prompt: 'The screenshot shows Minecraft. Say what is going on (biome, items, health, danger) and give the 3 most useful next steps or crafting tips.' },
  wordle: { prompt: 'The screenshot shows Wordle or a similar word game. Read the coloured letters and suggest the best next guess with a short reason. Keep the language of the game.' },
  sudoku: { prompt: 'The screenshot shows a Sudoku. Find one cell that can be solved by logic, explain the logic briefly, and give the value. Do not solve the whole puzzle unless asked.' },
  strategy: { prompt: 'The screenshot shows a strategy / MOBA / RTS game. Read the situation (resources, map, units, items) and give 3 concrete tips for right now.' },
  quiz: { prompt: 'The screenshot shows a quiz or trivia question. Give the most likely answer and a one-line reason.' },
  general: { prompt: 'The screenshot shows a video game. Identify the game if you can, explain what is happening, and give the most useful tip for this moment.' }
};

async function analyze(settings, { profile = 'general', question = '' }) {
  const p = PROFILES[profile] || PROFILES.general;
  const shot = await tools.captureScreen(1800);
  const text = p.prompt + (question ? `\n\nThe player also asks: ${question}` : '');
  const system = buildSystemPrompt(settings, 'You are in Game Coach mode. Be practical and short.');
  const raw = await providers.complete(settings, { system, messages: [{ role: 'user', text, images: [shot] }] });
  let data = null;
  if (p.json) {
    const m = raw.match(/\{[\s\S]*\}/);
    try { data = m ? JSON.parse(m[0]) : null; } catch {}
  }
  return { profile, raw, data, screenshot: shot };
}

module.exports = { analyze, PROFILES: Object.keys(PROFILES) };
