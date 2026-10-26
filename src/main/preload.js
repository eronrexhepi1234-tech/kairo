const { contextBridge, ipcRenderer } = require('electron');

const invoke = (ch, ...a) => ipcRenderer.invoke(ch, ...a);
const on = (ch, fn) => {
  const h = (_e, ...a) => fn(...a);
  ipcRenderer.on(ch, h);
  return () => ipcRenderer.removeListener(ch, h);
};

contextBridge.exposeInMainWorld('kairo', {
  settings: { get: () => invoke('settings:get'), set: p => invoke('settings:set', p) },
  models: p => invoke('models:list', p),
  chat: {
    send: (id, req) => invoke('chat:send', id, req),
    stop: id => invoke('chat:stop', id),
    onEvent: fn => on('chat:event', fn)
  },
  complete: req => invoke('ai:complete', req),
  screen: () => invoke('screen:capture'),
  news: opts => invoke('news:get', opts),
  geo: { search: q => invoke('geo:search', q), reverse: (lat, lng) => invoke('geo:reverse', lat, lng) },
  folder: {
    pick: () => invoke('folder:pick'), scan: p => invoke('folder:scan', p), context: p => invoke('folder:context', p),
    read: p => invoke('file:read', p), open: p => invoke('file:open', p)
  },
  voice: {
    speak: t => invoke('voice:speak', t), engine: () => invoke('voice:engine'),
    transcribe: (d, m) => invoke('voice:transcribe', d, m),
    liveConfig: tr => invoke('live:config', tr), wakeCheck: wav => invoke('voice:wake', wav), onToggle: fn => on('voice:toggle', fn)
  },
  coach: { analyze: o => invoke('coach:analyze', o), overlay: on_ => invoke('overlay:toggle', on_) },
  remote: {
    start: () => invoke('remote:start'), stop: () => invoke('remote:stop'), reset: () => invoke('remote:reset'),
    info: () => invoke('remote:info'),
    onRequest: (ch, fn) => on(ch, async (id, ...a) => ipcRenderer.send('renderer:reply:' + id, await fn(...a))),
    party: { create: q => invoke('party:create', q), next: () => invoke('party:next'), state: () => invoke('party:state'), end: () => invoke('party:end') }, firewall: () => invoke('remote:firewall'), allowFirewall: () => invoke('remote:firewall-allow'), onEvent: fn => on('remote:event', fn), onAutostart: fn => on('remote:autostart', fn)
  },
  openExternal: url => invoke('app:open-external', url),
  action: a => invoke('action:run', a),
  memory: { list: () => invoke('mem:list'), add: t => invoke('mem:add', t), remove: id => invoke('mem:remove', id) },
  reminders: {
    list: () => invoke('rem:list'), add: r => invoke('rem:add', r), remove: id => invoke('rem:remove', id),
    snooze: (r, m) => invoke('rem:snooze', r, m), onFire: fn => on('reminder:fire', fn)
  },
  weather: city => invoke('weather:get', city),
  weatherAt: place => invoke('weather:at', place),
  earth: {
    flights: box => invoke('earth:flights', box), route: c => invoke('earth:route', c),
    iss: () => invoke('earth:iss'), issPath: () => invoke('earth:issPath'), quakes: () => invoke('earth:quakes')
  },
  extras2: {
    sample: (role, lang) => invoke('voice:sample', role, lang), roles: () => invoke('voice:roles'),
    mail: { check: force => invoke('mail:check', force), test: cfg => invoke('mail:test', cfg), onNew: cb => on('mail:new', cb) },
    history: () => invoke('history:today'),
    countdowns: { list: () => invoke('countdown:list'), add: c => invoke('countdown:add', c), remove: id => invoke('countdown:remove', id) }
  },
  briefing: { due: () => invoke('brief:due'), make: () => invoke('brief:make') },
  pc: (action, value) => invoke('pc:do', action, value),
  tidy: { plan: d => invoke('tidy:plan', d), run: p => invoke('tidy:run', p), undo: d => invoke('tidy:undo', d), canUndo: d => invoke('tidy:canUndo', d) },
  clip: {
    read: () => invoke('clip:read'), write: t => invoke('clip:write', t), close: () => invoke('clip:close'), open: () => invoke('clip:open'),
    transform: (k, t) => invoke('clip:transform', k, t), onShow: fn => on('clip:show', fn)
  },
  lichess: {
    account: () => invoke('lichess:account'), upgrade: () => invoke('lichess:upgrade'), start: () => invoke('lichess:start'), stop: () => invoke('lichess:stop'),
    challenge: (u, m, i) => invoke('lichess:challenge', u, m, i), bots: () => invoke('lichess:bots'), status: () => invoke('lichess:status'),
    onEvent: fn => on('lichess:event', fn)
  },
  analysis: { games: (site, user) => invoke('analysis:games', site, user), run: g => invoke('analysis:run', g), cancel: () => invoke('analysis:cancel'), onProgress: fn => on('analysis:progress', fn) },
  create: {
    image: p => invoke('create:image', p), youtube: (u, q) => invoke('create:youtube', u, q),
    pptx: (topic, o) => invoke('create:pptx', topic, o), show: p => invoke('create:show', p)
  },
  life: {
    list: n => invoke('life:list', n), add: (n, it) => invoke('life:add', n, it), addMany: (n, its) => invoke('life:addMany', n, its),
    update: (n, id, p) => invoke('life:update', n, id, p), remove: (n, id) => invoke('life:remove', n, id)
  },
  football: {
    leagues: () => invoke('foot:leagues'), teams: l => invoke('foot:teams', l), matches: (l, t) => invoke('foot:matches', l, t),
    onGoal: fn => on('football:goal', fn)
  },
  discord: { start: () => invoke('discord:start'), stop: () => invoke('discord:stop'), status: () => invoke('discord:status') },
  showWindow: () => invoke('win:show'),
  orbMode: () => invoke('app:orbMode'),
  st: {
    logos: b => invoke('st:logos', b), saveImages: (folder, files) => invoke('st:saveImages', folder, files), minecraft: i => invoke('st:minecraft', i), invent: i => invoke('st:invent', i),
    social: (k, x) => invoke('st:social', k, x), saveVideo: (b64, ext, title) => invoke('st:saveVideo', b64, ext, title), shot: n => invoke('st:shot', n), reveal: p => invoke('st:reveal', p)
  },
  ex: { story: (k, t) => invoke('ex:story', k, t), narrate: t => invoke('ex:narrate', t) },
  search: {
    query: q => invoke('search:query', q), open: r => invoke('search:open', r), reveal: p => invoke('search:reveal', p), hide: () => ipcRenderer.send('search:hide'),
    toKairo: t => ipcRenderer.send('search:toKairo', t), toggle: () => invoke('search:toggle'), onOpen: fn => on('search:open', fn), onAsk: fn => on('search:ask', fn)
  },
  show: {
    jarvis: () => invoke('show:jarvis'), onJarvis: fn => on('jarvis:toggle', fn),
    game: (idea, prev) => invoke('show:game', idea, prev), games: () => invoke('show:games'), gameFile: f => invoke('show:gameFile', f),
    subtitle: (b64, mime, lang) => invoke('show:subtitle', b64, mime, lang), comment: () => invoke('show:comment'),
    flight: q => invoke('show:flight', q), musicQuiz: n => invoke('show:musicQuiz', n), radio: () => invoke('show:radio')
  },
  pet: {
    get: () => invoke('pet:get'), show: on => invoke('pet:show', on), give: (k, n) => invoke('pet:give', k, n), rename: n => invoke('pet:rename', n),
    move: (x, y) => ipcRenderer.send('pet:move', x, y), mouse: on => ipcRenderer.send('pet:mouse', on), area: () => invoke('pet:area'), openKairo: () => ipcRenderer.send('pet:open'),
    onState: fn => on('pet:state', fn), onEvent: fn => on('pet:event', fn), onEvolve: fn => on('pet:evolve', fn)
  },
  alerts: {
    get: () => invoke('alerts:get'), newTopic: () => invoke('alerts:newTopic'), test: k => invoke('alerts:test', k), qr: s => invoke('alerts:qr', s), guard: on => invoke('alerts:guard', on),
    onNew: fn => on('alert:new', fn), onGuard: fn => on('alert:guard', fn), onSay: fn => on('remote:say', fn)
  },
  onWinState: fn => on('win:state', fn),
  fun: {
    patch: g => invoke('fun:patch', g), playtime: () => invoke('fun:playtime'), pc: () => invoke('fun:pc'), nowPlaying: () => invoke('fun:nowPlaying'),
    identify: (b64, mime) => invoke('fun:identify', b64, mime), birthdays: () => invoke('fun:birthdays'), bdAdd: b => invoke('fun:bdAdd', b), bdRemove: id => invoke('fun:bdRemove', id),
    riddle: force => invoke('fun:riddle', force), joke: topic => invoke('fun:joke', topic), recipe: w => invoke('fun:recipe', w), onBirthday: cb => on('bd:soon', cb), saveAudio: (b64, ext) => invoke('fun:saveAudio', b64, ext)
  },
  earth2: {
    country: q => invoke('earth2:country', q), borders: () => invoke('earth2:borders'), webcams: p => invoke('earth2:webcams', p),
    city: n => invoke('earth2:city', n), iss: (lat, lng) => invoke('earth2:iss', lat, lng)
  },
  attachFile: () => invoke('file:attach'), attachPath: p => invoke('file:attachPath', p),
  pathForFile: f => { try { return require('electron').webUtils.getPathForFile(f); } catch { return null; } },
  prompt: { open: (target, text) => invoke('prompt:open', target, text) },
  stage: {
    show: p => ipcRenderer.send('stage:show', p), idle: () => ipcRenderer.send('stage:idle'),
    mouse: on => ipcRenderer.send('stage:mouse', on), open: () => ipcRenderer.send('stage:open'), onShow: fn => on('stage:show', fn)
  },
  reader: { url: u => invoke('reader:url', u), file: () => invoke('reader:file') },
  clips: { source: () => invoke('clips:source'), save: b => invoke('clips:save', b), onSaveRequest: fn => on('clips:save-request', fn) },
  focus: { today: () => invoke('focus:today'), week: () => invoke('focus:week') },
  miniLevel: m => ipcRenderer.send('mini:level', m),
  onMini: fn => on('mini:update', fn),
  onSettingsChanged: fn => on('settings:changed', fn),
  chess: {
    newGame: o => invoke('chess:new', o), move: m => invoke('chess:move', m), forMe: () => invoke('chess:forme'),
    step: () => invoke('chess:step'), hint: () => invoke('chess:hint'), undo: () => invoke('chess:undo'),
    level: l => invoke('chess:level', l), state: () => invoke('chess:state'), describe: () => invoke('chess:describe')
  },
  onFocusInput: fn => on('focus-input', fn),
  onOverlay: fn => on('overlay:update', fn)
});
