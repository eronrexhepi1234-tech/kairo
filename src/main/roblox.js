// Roblox Studio assistant: Kairo plans parts + Luau scripts, a small Studio plugin builds them.
// The plugin talks only to Kairo on this PC (127.0.0.1) with a secret key, and only while Kairo is open.
const { app, ipcMain, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 34877;
let store = null, server = null, lastSeen = 0, studio = null, queue = [], waiting = new Map();
const P = () => require('./providers');
const cfgFile = () => path.join(app.getPath('userData'), 'roblox.json');
function key() {
  let c = {}; try { c = JSON.parse(fs.readFileSync(cfgFile(), 'utf8')); } catch {}
  if (!c.key) { c.key = crypto.randomBytes(16).toString('hex'); fs.writeFileSync(cfgFile(), JSON.stringify(c)); }
  return c.key;
}
const pluginDir = () => path.join(process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local'), 'Roblox', 'Plugins');
const pluginFile = () => path.join(pluginDir(), 'KairoAssistant.lua');

// ---------- local link for the plugin ----------
function startServer() {
  if (server) return;
  server = http.createServer((req, res) => {
    const a = req.socket.remoteAddress || '';
    if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(a)) { res.writeHead(403); return res.end(); }
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      let j = {}; try { j = JSON.parse(body || '{}'); } catch {}
      const send = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (j.key !== key()) return send(403, { error: 'key' });
      if (req.url === '/kairo/poll') { lastSeen = Date.now(); if (j.context) studio = j.context; return send(200, { job: queue.shift() || null }); }
      if (req.url === '/kairo/result') { const w = waiting.get(j.id); if (w) { waiting.delete(j.id); w(j); } return send(200, { ok: true }); }
      send(404, {});
    });
  });
  server.on('error', () => { server = null; });
  server.listen(PORT, '127.0.0.1');
}
const status = () => ({ connected: Date.now() - lastSeen < 5000, installed: fs.existsSync(pluginFile()), studio: Date.now() - lastSeen < 5000 ? studio : null, pluginPath: pluginFile() });

function install() {
  const src = fs.readFileSync(path.join(__dirname, 'roblox-plugin.lua'), 'utf8').replace('%KEY%', key()).replace('%PORT%', String(PORT));
  fs.mkdirSync(pluginDir(), { recursive: true });
  fs.writeFileSync(pluginFile(), src);
  return { path: pluginFile() };
}

// ---------- planning ----------
async function plan({ prompt, mode }) {
  const s = store.get(), lang = { de: 'German', en: 'English' }[s.language] || 'German';
  const ctx = studio ? `Roblox Studio place "${studio.place}". Top-level objects in Workspace: ${(studio.workspace || []).join(', ') || 'none'}. Selected: ${(studio.selection || []).join(', ') || 'nothing'}.` : 'Studio is not connected yet.';
  const sys = `You are an expert Roblox developer (Luau, Roblox Studio). Plan what to build for the user's wish. Texts for the user in ${lang}.
${mode === 'script' ? 'MODE: scripts only. Do not create parts (parts: []). Write scripts that work with the existing objects listed below.' : 'MODE: build parts (and scripts if the wish needs gameplay).'}
${ctx}
Coordinates: studs, relative to the build origin. y = 0 is the ground; "pos" is the CENTER of the part, so a part on the ground has pos y = size y / 2. Keep the whole build inside about 300 x 150 x 300 studs. Max 350 parts. Make it look good: varied colors, materials (SmoothPlastic, Neon, Wood, Brick, Concrete, Grass, Glass, Metal, Slate, Marble, Sand, Ice, Foil, Fabric), sensible sizes.
All parts are put into one Model named exactly "${'{{MODEL}}'}" in Workspace. Scripts must find their parts with workspace:WaitForChild("{{MODEL}}"):WaitForChild("<part name>"), or by CollectionService tags you give in "tag" (e.g. "Kill", "Checkpoint", "Coin"). Give parts unique, readable names when scripts need them.
Scripts: modern Luau (task.wait, Players.PlayerAdded, CollectionService:GetTagged), no deprecated APIs, no require of asset ids, no HttpService, no loadstring. Server logic in "Script" (parent ServerScriptService), client/UI in "LocalScript" (parent StarterPlayerScripts or StarterGui). Comment the code briefly in ${lang}.
Return ONLY JSON: {"title":"short name","summary":"2 sentences what was built","modelName":"Kairo_<ShortName>","parts":[{"name":"","class":"Part|WedgePart|SpawnLocation","shape":"Block|Ball|Cylinder","size":[x,y,z],"pos":[x,y,z],"rot":[0,0,0],"color":"#hex","material":"","anchored":true,"canCollide":true,"transparency":0,"tag":""}],"scripts":[{"name":"","type":"Script|LocalScript|ModuleScript","parent":"ServerScriptService|StarterPlayerScripts|StarterGui|ReplicatedStorage|Model","source":"-- luau code"}],"test":["2-4 steps how to test it with Play"]}`;
  for (let i = 0; i < 3; i++) {
    const out = await P().complete(s, { system: sys + (i ? '\nIMPORTANT: valid JSON only, escape quotes and newlines inside strings.' : ''), messages: [{ role: 'user', text: prompt }] });
    let j = null; try { j = P().parseJson(out); } catch {}
    if (j && (j.parts?.length || j.scripts?.length)) {
      j.modelName = String(j.modelName || 'Kairo_Bau').replace(/[^A-Za-z0-9_]/g, '').slice(0, 40) || 'Kairo_Bau';
      j.parts = (j.parts || []).slice(0, 350);
      j.scripts = (j.scripts || []).map(x => ({ ...x, source: String(x.source || '').split('{{MODEL}}').join(j.modelName) }));
      return { plan: j };
    }
  }
  throw new Error('Kein gültiger Bauplan bekommen – nochmal versuchen');
}

// ---------- big prompt for another AI ("Mach einen Prompt für Steal an Egg") ----------
// 1) research the game on the web, 2) write one very detailed build prompt for an ORIGINAL game in that style
// ---------- Kairo invents its own game ideas ----------
async function ideas({ wish }) {
  const s = store.get(), lang = { de: 'German', en: 'English' }[s.language] || 'German';
  let trends = '';
  try {
    trends = await P().complete(s, { webSearch: s.provider === 'gemini', system: 'Search the web: which Roblox game genres and mechanics are trending right now (most played, fastest growing)? List 8-10 trends with one line each why players like them. Max 250 words.', messages: [{ role: 'user', text: 'Roblox trends right now' }] });
  } catch {}
  const j = await (async () => {
    for (let i = 0; i < 3; i++) {
      const out = await P().complete(s, { system: `You are a hit-making Roblox game designer. Invent 3 completely ORIGINAL Roblox game ideas that could go viral. They must NOT copy an existing game: new name, new theme, a fresh core mechanic or a clever new combination, plus something kids instantly want to show their friends. Use the trends below only as inspiration for what players like. Language: ${lang}.
Return ONLY JSON: {"ideas":[{"name":"catchy game name","genre":"","pitch":"one exciting sentence","loop":"the core gameplay loop in 2-3 sentences","hooks":["3 things that make it addictive"],"twist":"what no other game has","social":"how friends play together","why":"why it can go viral now","color":"#hex main color"}]}${i ? '\nIMPORTANT: valid JSON only.' : ''}`, messages: [{ role: 'user', text: `${wish ? 'Wish of the player: ' + wish + '\n' : ''}Trends:\n${trends || '(no trend data)'}` }] });
      let r = null; try { r = P().parseJson(out); } catch {}
      if (r?.ideas?.length) return r;
    }
    throw new Error('Keine Ideen bekommen – nochmal versuchen');
  })();
  return { ideas: j.ideas.slice(0, 3) };
}

async function gamePrompt({ game, extra, idea }, onStep = () => {}) {
  const s = store.get(), lang = { de: 'German', en: 'English' }[s.language] || 'German';
  if (idea) game = idea.name || game;
  const platform = /unity/i.test(game + extra) ? 'Unity (C#)' : /godot/i.test(game + extra) ? 'Godot (GDScript)' : /(web|browser|html)/i.test(game + extra) ? 'a browser game (HTML5 + JavaScript)' : 'Roblox (Luau, Roblox Studio)';
  onStep('research');
  let research = idea ? `This is Kairo's own ORIGINAL game idea – build exactly this game, keep its name "${idea.name}":\n${JSON.stringify(idea, null, 1)}` : '';
  if (!idea) try {
    research = await P().complete(s, { webSearch: s.provider === 'gemini', system: `You are a game researcher. Search the web and describe the game precisely and completely: genre, core gameplay loop, every mechanic and system, items/pets/units and their rarities, economy (currencies, prices, income rates), progression and rebirths, maps and areas, UI screens, social/multiplayer features (trading, stealing, PvP, teams), events and updates, monetization (game passes, developer products), what makes it fun and addictive, common player complaints. Use concrete numbers where known. Max 700 words. Language: ${lang}.`, messages: [{ role: 'user', text: `Game: ${game}${platform.startsWith('Roblox') ? ' (Roblox game)' : ''}` }] });
  } catch { research = ''; }
  onStep('write');
  const sys = `You are a senior ${platform} game designer, lead programmer and expert prompt engineer.
${idea ? `Write ONE extremely detailed, ready-to-paste prompt that makes another AI (Claude, ChatGPT, Gemini) build the complete, polished game "${idea.name}" for ${platform}, exactly as described in the game idea below. Keep its name, theme, loop and twist, and work out every detail.`
  : `Write ONE extremely detailed, ready-to-paste prompt that makes another AI (Claude, ChatGPT, Gemini) build a complete, polished, original game for ${platform} in the style of "${game}".
The new game must be ORIGINAL: its own name, own theme/setting, own item names and visuals, plus 2-3 fresh twists — it uses the same kind of mechanics and game feel, but is not a copy (no copied names, logos, assets or text).`}
Write the prompt in ${lang}, in Markdown, addressed to the AI ("Du bist …"). Be very concrete: exact numbers, tables, names, file paths. Structure it with these sections:
1. Rolle & Ziel (who the AI is, what to build, quality bar)
2. Spielidee & neuer Name, Setting, Zielgruppe, was es süchtig macht
3. Core Gameplay Loop (Schritt für Schritt, was der Spieler jede Minute tut)
4. Alle Systeme im Detail (each with rules, numbers, edge cases): e.g. Sammeln/Kaufen, Ausbrüten/Seltenheiten (table with chances), Stehlen/Verteidigen, Basis/Plot, Geld & Einkommen pro Sekunde, Upgrades, Rebirth, Leaderboards, Handel, Events — only what fits the game
5. Economy-Tabelle (prices, income, rarity multipliers, balancing curve)
6. Welt & Map (areas, layout, sizes in studs, lighting/mood)
7. UI/UX (every screen and button, animations, sounds, mobile + PC controls)
8. Multiplayer, Server-Autorität & Anti-Exploit (all logic on the server, validate every RemoteEvent, rate limits, sanity checks)
9. Speichern (DataStore/ProfileService-style session locking, auto-save, data schema as a table)
10. Technische Architektur: exact folder/file structure (e.g. ServerScriptService/Services/…, ReplicatedStorage/Shared/…, StarterGui/…), every ModuleScript with its responsibility and public functions, RemoteEvents/RemoteFunctions list with parameters
11. Bau-Reihenfolge in Phasen (Phase 1 MVP … Phase 5 Polish), each phase with a clear "fertig wenn …"
12. Monetarisierung (fair, optional game passes / dev products with prices in Robux)
13. Qualitätsregeln für die AI: complete code for every file (no placeholders, no "…"), comments, modern ${platform.startsWith('Roblox') ? 'Luau (task.wait, typed where useful, no deprecated APIs)' : 'code'}, ask before guessing assets, output file by file with full paths, start with Phase 1 and wait for "weiter"
14. Test-Checkliste (what to test after each phase)
Use the research below for the mechanics. Return ONLY the prompt text, no explanation before or after.`;
  let prompt = await P().complete(s, { system: sys, messages: [{ role: 'user', text: `${idea ? 'Game to build' : 'Game to take inspiration from'}: ${game}\n${extra ? 'Extra wishes: ' + extra + '\n' : ''}\nResearch about the game:\n${research || '(no research available – use your knowledge of the genre)'}` }] });
  prompt = String(prompt || '').replace(/^```(?:markdown)?\s*/i, '').replace(/```\s*$/, '').trim();
  if (prompt.length < 800) throw new Error('Der Prompt ist zu kurz geworden – nochmal versuchen');
  const name = (prompt.match(/(?:neuer name|spielname|name des spiels)[^\n:]*[:：]\s*\**([^\n*]{2,40})/i) || [])[1]?.trim() || '';
  // keep a copy as a file
  const dir = path.join(app.getPath('documents'), 'Kairo', 'Prompts'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `Prompt ${String(game).replace(/[<>:"/\\|?*]/g, '').slice(0, 40)} ${new Date().toLocaleDateString('sv')}.md`);
  fs.writeFileSync(file, prompt);
  return { prompt, research, name, file, platform, chars: prompt.length };
}

function build(planObj) {
  if (!status().connected) throw new Error('Roblox Studio ist nicht verbunden. Öffne Studio und aktiviere oben den Kairo-Knopf.');
  const id = crypto.randomBytes(6).toString('hex');
  queue.push({ id, title: planObj.title, modelName: planObj.modelName, parts: planObj.parts, scripts: planObj.scripts });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { waiting.delete(id); queue = queue.filter(q => q.id !== id); reject(new Error('Studio hat nicht geantwortet')); }, 60000);
    waiting.set(id, r => { clearTimeout(t); resolve({ result: r }); });
  });
}

function register(ctx) {
  ({ store } = ctx);
  startServer();
  // keep an installed plugin up to date with this Kairo version (Studio loads it on its next start)
  try { if (fs.existsSync(pluginFile())) { const want = fs.readFileSync(path.join(__dirname, 'roblox-plugin.lua'), 'utf8').replace('%KEY%', key()).replace('%PORT%', String(PORT)); if (fs.readFileSync(pluginFile(), 'utf8') !== want) fs.writeFileSync(pluginFile(), want); } } catch {}
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...((await fn(...a)) || {}) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  ipcMain.handle('rbx:status', wrap(async () => status()));
  ipcMain.handle('rbx:install', wrap(async () => install()));
  ipcMain.handle('rbx:plan', wrap(o => plan(o)));
  ipcMain.handle('rbx:build', wrap(p => build(p)));
  ipcMain.handle('rbx:ideas', wrap(o => ideas(o || {})));
  ipcMain.handle('rbx:prompt', wrap(o => gamePrompt(o, step => { try { require('electron').BrowserWindow.getAllWindows().forEach(w => w.webContents.send('rbx:promptStep', step)); } catch {} })));
  ipcMain.handle('rbx:reveal', () => shell.showItemInFolder(pluginFile()));
}

module.exports = { register, plan, build, status, install, gamePrompt, ideas };
