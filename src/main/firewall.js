// Windows Firewall check for the phone remote.
// check(): reads the rules for this program (no admin needed).
// allow(): only when the user clicks the button — Windows shows its own admin prompt (UAC).
//   It removes the inbound "block" rules Windows made when access was denied before,
//   and allows ONLY the phone-remote port, ONLY on private networks.
const { app } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const exe = () => process.execPath;
const q = s => "'" + String(s).replace(/'/g, "''") + "'";

function ps(script, timeout = 30000) {
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout }, (err, out) => resolve(err ? '' : String(out).trim()));
  });
}

async function check(port) {
  const out = await ps(
    `$r = Get-NetFirewallApplicationFilter -Program ${q(exe())} -ErrorAction SilentlyContinue | Get-NetFirewallRule | Where-Object { $_.Direction -eq 'Inbound' -and $_.Enabled -eq 'True' };` +
    `$net = (Get-NetConnectionProfile | Select-Object -First 1).NetworkCategory;` +
    `[pscustomobject]@{ block = @($r | Where-Object Action -eq 'Block').Count; allow = @($r | Where-Object Action -eq 'Allow').Count; net = "$net" } | ConvertTo-Json -Compress`
  );
  let j = {}; try { j = JSON.parse(out); } catch {}
  return { blocked: (j.block || 0) > 0, allowed: (j.allow || 0) > 0 && !(j.block > 0), network: j.net || 'unknown', port };
}

async function allow(port) {
  const script = [
    `$exe = ${q(exe())}`,
    `Get-NetFirewallApplicationFilter -Program $exe -ErrorAction SilentlyContinue | Get-NetFirewallRule | Where-Object { $_.Direction -eq 'Inbound' -and $_.Action -eq 'Block' } | Remove-NetFirewallRule`,
    `Get-NetFirewallRule -DisplayName 'Kairo Phone Remote' -ErrorAction SilentlyContinue | Remove-NetFirewallRule`,
    `New-NetFirewallRule -DisplayName 'Kairo Phone Remote' -Description 'Lets your phone reach Kairo on your home Wi-Fi' -Direction Inbound -Action Allow -Program $exe -Protocol TCP -LocalPort ${+port} -Profile Private | Out-Null`,
    // remove the lamp-search rule from an older Kairo version, if it exists
    `Get-NetFirewallRule -DisplayName 'Kairo Smart Home' -ErrorAction SilentlyContinue | Remove-NetFirewallRule`
  ].join('\r\n');
  const file = path.join(app.getPath('temp'), 'kairo-firewall.ps1');
  fs.writeFileSync(file, script, 'utf8');
  // Start-Process -Verb RunAs shows the Windows admin prompt; if the user says no, nothing changes.
  await ps(`try { Start-Process powershell.exe -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',${q(file)} } catch { 'cancelled' }`, 120000);
  try { fs.unlinkSync(file); } catch {}
  return check(port);
}

module.exports = { check, allow };
