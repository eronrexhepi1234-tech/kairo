// PC control by voice/text: volume, media keys, brightness, screenshot, lock, sleep, shutdown timer.
const { app, desktopCapturer, screen, shell } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function ps(script) {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 15000 }, (err, out) => err ? reject(err) : resolve(String(out).trim()));
  });
}
const keys = (code, n = 1) => ps(`$w=New-Object -ComObject WScript.Shell; 1..${n} | % { $w.SendKeys([char]${code}) }`);

async function screenshot() {
  const d = screen.getPrimaryDisplay();
  const w = Math.round(d.size.width * d.scaleFactor), h = Math.round(d.size.height * d.scaleFactor);
  const src = (await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: w, height: h } }))[0];
  const dir = path.join(app.getPath('pictures'), 'Kairo');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `Screenshot ${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.png`);
  fs.writeFileSync(file, src.thumbnail.toPNG());
  return file;
}

// action: volume_up | volume_down | mute | play_pause | next | previous | brightness | screenshot | lock | sleep | shutdown | restart | cancel_shutdown
async function run(action, value) {
  const a = String(action || '').toLowerCase().replace(/[\s-]/g, '_');
  const n = Math.max(1, Math.min(50, Math.round(+value || 5)));
  switch (a) {
    case 'volume_up': await keys(175, n); return `Volume +${n * 2}%`;
    case 'volume_down': await keys(174, n); return `Volume -${n * 2}%`;
    case 'mute': case 'unmute': await keys(173); return 'Mute toggled';
    case 'play_pause': case 'pause': case 'play': await keys(179); return 'Play/Pause';
    case 'next': await keys(176); return 'Next track';
    case 'previous': case 'prev': await keys(177); return 'Previous track';
    case 'brightness': {
      const v = Math.max(5, Math.min(100, Math.round(+value || 70)));
      await ps(`(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop | Invoke-CimMethod -MethodName WmiSetBrightness -Arguments @{Timeout=1;Brightness=${v}}) | Out-Null`)
        .catch(() => { throw new Error('Brightness can only be changed on laptop screens'); });
      return `Brightness ${v}%`;
    }
    case 'screenshot': { const f = await screenshot(); shell.showItemInFolder(f); return 'Saved: ' + f; }
    case 'lock': execFile('rundll32.exe', ['user32.dll,LockWorkStation']); return 'Locked';
    case 'sleep': setTimeout(() => execFile('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']), 1500); return 'Going to sleep';
    case 'shutdown': case 'restart': {
      const minutes = Math.max(0, Math.min(24 * 60, Math.round(+value || 0)));
      execFile('shutdown.exe', [a === 'restart' ? '/r' : '/s', '/t', String(Math.max(30, minutes * 60))], { windowsHide: true });
      return `${a === 'restart' ? 'Restart' : 'Shutdown'} in ${minutes || 0.5} min (say "cancel shutdown" to stop)`;
    }
    case 'cancel_shutdown': case 'abort_shutdown': execFile('shutdown.exe', ['/a'], { windowsHide: true }); return 'Shutdown cancelled';
    default: throw new Error('Unknown PC action: ' + action);
  }
}

module.exports = { run, screenshot };
