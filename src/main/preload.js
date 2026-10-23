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
    liveConfig: tr => invoke('live:config', tr), onToggle: fn => on('voice:toggle', fn)
  },
  coach: { analyze: o => invoke('coach:analyze', o), overlay: on_ => invoke('overlay:toggle', on_) },
  remote: {
    start: () => invoke('remote:start'), stop: () => invoke('remote:stop'), reset: () => invoke('remote:reset'),
    info: () => invoke('remote:info'), onEvent: fn => on('remote:event', fn), onAutostart: fn => on('remote:autostart', fn)
  },
  openExternal: url => invoke('app:open-external', url),
  action: a => invoke('action:run', a),
  memory: { list: () => invoke('mem:list'), add: t => invoke('mem:add', t), remove: id => invoke('mem:remove', id) },
  reminders: {
    list: () => invoke('rem:list'), add: r => invoke('rem:add', r), remove: id => invoke('rem:remove', id),
    snooze: (r, m) => invoke('rem:snooze', r, m), onFire: fn => on('reminder:fire', fn)
  },
  weather: city => invoke('weather:get', city),
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
  home: {
    list: () => invoke('home:list'), discover: () => invoke('home:discover'), pairHue: ip => invoke('home:pairHue', ip),
    add: d => invoke('home:add', d), demo: () => invoke('home:demo'), lifx: t => invoke('home:lifx', t), ha: (u, t) => invoke('home:ha', u, t),
    update: (id, p) => invoke('home:update', id, p), remove: id => invoke('home:remove', id), control: (t, c) => invoke('home:control', t, c),
    onChange: fn => on('home:changed', fn)
  },
  showWindow: () => invoke('win:show'),
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
