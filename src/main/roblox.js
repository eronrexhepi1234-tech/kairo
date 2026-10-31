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
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...((await fn(...a)) || {}) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  ipcMain.handle('rbx:status', wrap(async () => status()));
  ipcMain.handle('rbx:install', wrap(async () => install()));
  ipcMain.handle('rbx:plan', wrap(o => plan(o)));
  ipcMain.handle('rbx:build', wrap(p => build(p)));
  ipcMain.handle('rbx:reveal', () => shell.showItemInFolder(pluginFile()));
}

module.exports = { register, plan, build, status, install };
