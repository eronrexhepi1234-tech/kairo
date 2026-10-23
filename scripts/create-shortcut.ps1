# Creates a "Kairo" shortcut on the desktop and in the Start menu.
# Run:  powershell -ExecutionPolicy Bypass -File scripts\create-shortcut.ps1
$root = Split-Path -Parent $PSScriptRoot
$electron = Join-Path $root 'node_modules\electron\dist\electron.exe'
$icon = Join-Path $root 'build\icon.ico'
if (-not (Test-Path $electron)) { Write-Error 'Run "npm install" first.'; exit 1 }

$shell = New-Object -ComObject WScript.Shell
$places = @(
  [Environment]::GetFolderPath('Desktop'),
  (Join-Path ([Environment]::GetFolderPath('Programs')) '')
)
foreach ($dir in $places) {
  $lnk = $shell.CreateShortcut((Join-Path $dir 'Kairo.lnk'))
  $lnk.TargetPath = $electron
  $lnk.Arguments = '"' + $root + '"'
  $lnk.WorkingDirectory = $root
  $lnk.IconLocation = "$icon,0"
  $lnk.Description = 'Kairo - your desktop AI companion'
  $lnk.Save()
  Write-Output "Shortcut created: $(Join-Path $dir 'Kairo.lnk')"
}
