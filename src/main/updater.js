// Auto-update for the installed version: checks GitHub Releases, downloads in the background,
// asks the user to restart. Does nothing when running from the source folder.
const { app, dialog } = require('electron');

function start(getWin) {
  if (!app.isPackaged) return;
  let autoUpdater;
  try { ({ autoUpdater } = require('electron-updater')); } catch { return; }
  const pkg = require('../../package.json');
  const pub = (pkg.build?.publish || [])[0];
  if (!pub || /YOUR_GITHUB/i.test(pub.owner || '')) return; // not published yet
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', async info => {
    const r = await dialog.showMessageBox(getWin(), {
      type: 'info', buttons: ['Jetzt neu starten', 'Später'], defaultId: 0, cancelId: 1,
      title: 'Kairo-Update', message: `Kairo ${info.version} ist bereit.`, detail: 'Neu starten, um das Update zu installieren? Sonst wird es beim nächsten Schliessen installiert.'
    });
    if (r.response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', () => {});
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 3600 * 1000);
}

module.exports = { start };
