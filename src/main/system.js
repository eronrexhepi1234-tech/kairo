// Tray icon, start with Windows, close-to-tray, and live reload while developing.
const { app, Tray, Menu, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

let tray = null;
let quitting = false;

function isQuitting() { return quitting; }
function markQuitting() { quitting = true; }

function setupTray(getWin, store) {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'renderer', 'assets', 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Kairo');
  const show = () => { const w = getWin(); if (!w) return; w.show(); w.focus(); };
  const rebuild = () => {
    const s = store.get();
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Kairo öffnen', click: show },
      { label: 'Sprechen  (Ctrl+Shift+K)', click: () => { show(); getWin()?.webContents.send('voice:toggle'); } },
      { label: 'Hände frei', type: 'checkbox', checked: !!s.voice.handsFree, click: m => { store.update({ voice: { handsFree: m.checked } }); getWin()?.webContents.send('settings:changed'); } },
      { label: 'Mit Windows starten', type: 'checkbox', checked: !!s.autostart, click: m => { store.update({ autostart: m.checked }); applyAutostart(store); } },
      { type: 'separator' },
      { label: 'Beenden', click: () => { quitting = true; app.quit(); } }
    ]));
  };
  rebuild();
  tray.on('click', show);
  return { rebuild, destroy: () => { tray?.destroy(); tray = null; } };
}

// Start Kairo hidden in the tray when Windows starts.
function applyAutostart(store) {
  const on = !!store.get().autostart;
  const args = app.isPackaged ? ['--hidden'] : [app.getAppPath(), '--hidden'];
  try { app.setLoginItemSettings({ openAtLogin: on, path: process.execPath, args }); } catch {}
}

// While running from the source folder: reload the window when UI files change,
// restart the app when main-process files change. So Kairo is always up to date.
function watchForChanges(getWins) {
  // only for development (KAIRO_DEV=1). Normally Kairo never restarts by itself.
  if (app.isPackaged || !process.env.KAIRO_DEV) return;
  const src = path.join(__dirname, '..');
  let timer = null, restart = false;
  try {
    fs.watch(src, { recursive: true }, (_ev, file) => {
      if (!file || /\.(png|ico|svg)$/i.test(file)) return;
      if (/^main[\\/]/.test(file)) restart = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (restart) {
          // free the "only one Kairo" lock first, so the new Kairo doesn't block itself
          quitting = true;
          app.releaseSingleInstanceLock();
          app.relaunch({ args: process.argv.slice(1).filter(a => a !== '--hidden') });
          app.exit(0);
          return;
        }
        for (const w of getWins()) if (w && !w.isDestroyed()) w.webContents.reloadIgnoringCache();
      }, 1200);
    });
  } catch {}
}

module.exports = { setupTray, applyAutostart, watchForChanges, isQuitting, markQuitting };
