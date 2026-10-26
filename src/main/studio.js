// Creative studio: logos & banners (SVG), Minecraft builds (boxes -> /fill commands), inventor mode (business plan),
// and Social Studio scripts (short promo videos about Kairo for TikTok / YouTube Shorts).
const { app, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

let store = null;
const LANG = { de: 'German', en: 'English', sq: 'Albanian' };
const P = () => require('./providers');
const lang = () => LANG[store.get().language] || 'German';
const outDir = (...p) => { const d = path.join(app.getPath('pictures'), 'Kairo', ...p); fs.mkdirSync(d, { recursive: true }); return d; };
const safe = s => String(s || 'Kairo').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 60) || 'Kairo';
async function json(system, text, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const out = await P().complete(store.get(), { system: system + (i ? ' IMPORTANT: valid JSON only, every string in double quotes.' : ''), messages: [{ role: 'user', text }] });
    let j = null;
    try { j = P().parseJson(out); } catch {}
    if (j) return j;
  }
  throw new Error('Keine gültige Antwort bekommen – nochmal versuchen');
}

// ---------- logos ----------
async function logos(brief) {
  const j = await json(`You are a top brand designer. Design 3 DIFFERENT logo concepts for the brief. Answer texts in ${lang()}.
Return ONLY JSON: {"name":"brand name (from the brief, or invent a short catchy one)","tagline":"short slogan","logos":[{"style":"short style name","colors":["#hex","#hex","#hex"],"bg":"#hex dark or light background that fits","svg":"<svg ...>...</svg>"}]}
SVG rules: viewBox="0 0 512 512", no width/height attributes, only shapes (path, circle, rect, polygon, ellipse, line, g, linearGradient, radialGradient, defs, text with font-family="Arial, sans-serif" and bold weight), no images, no scripts, no external links, no filters.
Make them look professional and modern: a clear symbol/mark (geometric, bold, simple, works small) plus optionally the name. Use the brand colors. Each concept must look clearly different (e.g. mascot, monogram, abstract mark).`, brief);
  return j;
}
function saveImages(folder, files) {
  const dir = outDir(...folder.map(safe));
  const paths = [];
  for (const f of files) { const p = path.join(dir, safe(f.name)); fs.writeFileSync(p, Buffer.from(f.data, 'base64')); paths.push(p); }
  return { dir, paths };
}

// ---------- minecraft ----------
const BLOCKS = ['stone', 'cobblestone', 'stone_bricks', 'mossy_stone_bricks', 'deepslate_bricks', 'bricks', 'sandstone', 'smooth_sandstone', 'quartz_block', 'polished_andesite', 'oak_planks', 'spruce_planks', 'dark_oak_planks', 'birch_planks', 'oak_log', 'spruce_log', 'glass', 'white_stained_glass', 'light_blue_stained_glass', 'white_concrete', 'gray_concrete', 'black_concrete', 'red_concrete', 'blue_concrete', 'yellow_concrete', 'green_concrete', 'orange_concrete', 'white_wool', 'red_wool', 'gold_block', 'iron_block', 'diamond_block', 'emerald_block', 'obsidian', 'glowstone', 'sea_lantern', 'oak_leaves', 'grass_block', 'water', 'lava', 'snow_block', 'ice', 'terracotta', 'red_terracotta', 'prismarine', 'end_stone_bricks', 'purpur_block', 'netherrack', 'nether_bricks', 'copper_block', 'oxidized_copper'];
async function minecraft(idea) {
  const j = await json(`You are a Minecraft master builder. Design the build as a list of axis-aligned boxes (like /fill). Answer texts in ${lang()}.
Coordinates: x and z are the floor (0..40), y is height (0..40), y=0 is the ground. Max size 40x40x40. Use 15-80 boxes. Later boxes overwrite earlier ones, so carve doors/windows with "air" boxes AFTER walls.
Use only these block ids: ${BLOCKS.join(', ')}, air.
Return ONLY JSON: {"title":"short name","description":"1-2 sentences","size":[x,y,z],"boxes":[{"from":[x,y,z],"to":[x,y,z],"block":"id","hollow":false,"note":"what this part is"}],"steps":["5-8 short build steps for building it by hand"],"materials":"rough list of the main blocks"}
Make it look good: details, roof, windows, towers, colors that fit together. "hollow": true makes the box an empty shell (walls only).`, idea);
  if (!j.boxes?.length) throw new Error('Kein Bauplan bekommen');
  // clamp and clean
  const B = new Set([...BLOCKS, 'air']);
  j.boxes = j.boxes.filter(b => b.from?.length === 3 && b.to?.length === 3 && B.has(b.block)).map(b => ({ ...b, from: b.from.map(v => Math.max(0, Math.min(48, Math.round(v)))), to: b.to.map(v => Math.max(0, Math.min(48, Math.round(v)))) }));
  // Minecraft commands (relative to the player: build starts 2 blocks in front)
  const cmd = b => `fill ~${Math.min(b.from[0], b.to[0]) + 2} ~${Math.min(b.from[1], b.to[1])} ~${Math.min(b.from[2], b.to[2]) + 2} ~${Math.max(b.from[0], b.to[0]) + 2} ~${Math.max(b.from[1], b.to[1])} ~${Math.max(b.from[2], b.to[2]) + 2} minecraft:${b.block}${b.hollow ? ' hollow' : ''}`;
  j.commands = j.boxes.map(cmd);
  const dir = path.join(app.getPath('documents'), 'Kairo', 'Minecraft'); fs.mkdirSync(dir, { recursive: true });
  j.file = path.join(dir, safe(j.title) + '.mcfunction');
  fs.writeFileSync(j.file, `# ${j.title} – von Kairo\n# ${j.description}\n# Im Spiel: stell dich hin und gib jeden Befehl mit / ein (oder als Datapack-Funktion)\n` + j.commands.join('\n') + '\n');
  return j;
}

// ---------- inventor mode ----------
async function invent(idea) {
  return json(`You are a startup coach for a creative teenager. Turn the idea into an exciting but realistic plan. Answer in ${lang()}.
Return ONLY JSON: {"names":["3 name ideas"],"name":"best name","slogan":"","pitch":"elevator pitch, 2 sentences","problem":"","solution":"","features":["4-6 key features"],"audience":"who it is for","money":"how it could earn money (or 'free project')","steps":[{"title":"","text":"","when":"e.g. Woche 1"}],"costs":"rough start costs","risks":["2-3 risks and how to handle them"],"first_task":"what to do TODAY in 30 minutes","colors":["#hex","#hex"],"emoji":"one emoji that fits"}
4-6 steps.`, idea);
}

// ---------- Social Studio ----------
const FEATURES = `Kairo is a free desktop AI assistant for Windows (Electron). Highlights:
- talk hands-free, natural voices, 13 character voices (narrator, pirate, movie trailer...), Jarvis-mode HUD over the desktop
- 3D satellite Earth with cinematic flights, live rain radar, flights, ISS, earthquakes, world tours, country profiles, live webcams
- animated weather cards, morning radio show with two hosts, wake-up show with sunrise
- documentary generator and "what if" stories, solar system with real planet positions
- games: chess vs Stockfish, GeoGuessr, music quiz, riddles; Kairo programs playable games from an idea
- desktop pet that grows when you study, school helper (homework, exams, flashcards, PDFs, presentations)
- phone app: chat, control the PC, Kairo calls you about new mail/birthdays
- Super-Search (Alt+Space), logo maker, Minecraft builder, inventor mode, prompt helper
- works with Gemini (free), Claude, GPT or local models; open source on GitHub`;
async function social(kind, extra) {
  const ver = (() => { try { return require(path.join(__dirname, '..', '..', 'package.json')).version; } catch { return ''; } })();
  const what = { why: 'Why people should try Kairo (convincing, fun)', update: `Update video: what is new in Kairo ${ver}`, feature: 'Spotlight on ONE cool feature', tutorial: 'Quick tutorial: how to get started with Kairo' }[kind] || kind;
  const shots = (() => { try { return fs.readdirSync(path.join(__dirname, '..', '..', 'docs', 'screenshots')).filter(f => /\.png$/i.test(f)).map(f => f.replace(/\.png$/i, '')); } catch { return []; } })();
  const j = await json(`You are a viral TikTok / YouTube Shorts creator making a 25-40 second vertical video for the account of the app "Kairo". Language: ${lang()}.
About the app:\n${FEATURES}
Video goal: ${what}. ${extra ? 'Extra wish: ' + extra : ''}
Available screenshots of the app (use their exact names): ${shots.join(', ') || 'none'}.
Return ONLY JSON: {"hook":"first 1-2 seconds, max 6 words, makes people stop scrolling","scenes":[{"title":"big text, max 5 words","sub":"small text, max 12 words","shot":"screenshot name or empty","emoji":"one emoji","say":"what the voice says (1-2 short sentences)"}],
"cta":"call to action at the end, max 8 words","tiktok":{"caption":"TikTok caption with 5-8 hashtags"},"youtube":{"title":"YouTube Shorts title max 70 chars","description":"2-4 lines + hashtags"}}
5-7 scenes. Fast, energetic, honest (no fake claims).`, 'Mach das Video');
  j.kind = kind; j.version = ver;
  return j;
}
function saveVideo(b64, ext, title) {
  const dir = path.join(app.getPath('videos'), 'Kairo', 'Social'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${safe(title)} ${new Date().toLocaleString('sv').replace(/[: ]/g, '-')}.${ext}`);
  fs.writeFileSync(f, Buffer.from(b64, 'base64'));
  return f;
}

function register(ctx) {
  ({ store } = ctx);
  const wrap = fn => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  ipcMain.handle('st:logos', wrap(async brief => ({ result: await logos(brief) })));
  ipcMain.handle('st:saveImages', wrap(async (folder, files) => saveImages(folder, files)));
  ipcMain.handle('st:minecraft', wrap(async idea => ({ build: await minecraft(idea) })));
  ipcMain.handle('st:invent', wrap(async idea => ({ plan: await invent(idea) })));
  ipcMain.handle('st:social', wrap(async (kind, extra) => ({ script: await social(kind, extra) })));
  ipcMain.handle('st:saveVideo', wrap(async (b64, ext, title) => ({ path: saveVideo(b64, ext, title) })));
  ipcMain.handle('st:shot', (_e, name) => { try { return 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'screenshots', safe(name) + '.png')).toString('base64'); } catch { return null; } });
  ipcMain.handle('st:reveal', (_e, p) => shell.showItemInFolder(p));
}

module.exports = { register, logos, minecraft, invent, social };
