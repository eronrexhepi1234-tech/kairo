// Renders the Kairo logo to assets/icon.png and build/icon.ico.
// Run with:  npx electron scripts/make-icon.js
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <radialGradient id="bg" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#2a2b30"/><stop offset="1" stop-color="#121316"/></radialGradient>
    <radialGradient id="dot" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#ffd2b8"/><stop offset=".5" stop-color="#ff7a45"/><stop offset="1" stop-color="#c2410c"/></radialGradient>
  </defs>
  <rect x="8" y="8" width="240" height="240" rx="56" fill="url(#bg)"/>
  <rect x="8.5" y="8.5" width="239" height="239" rx="55.5" fill="none" stroke="#ffffff" stroke-opacity=".08"/>
  <circle cx="128" cy="128" r="54" fill="none" stroke="#ececec" stroke-width="13"/>
  <ellipse cx="128" cy="128" rx="92" ry="31" transform="rotate(-24 128 128)" fill="none" stroke="#ff7a45" stroke-width="10"/>
  <circle cx="196" cy="98" r="17" fill="url(#dot)"/>
</svg>`;

function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, buf }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e); header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(buf.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, ...pngs.map(p => p.buf)]);
}

app.whenReady().then(async () => {
  const w = new BrowserWindow({ width: 256, height: 256, show: false, transparent: true, frame: false, useContentSize: true });
  await w.loadURL('data:text/html,' + encodeURIComponent(`<html><body style="margin:0;background:transparent">${SVG}</body></html>`));
  await new Promise(r => setTimeout(r, 400));
  const img = await w.webContents.capturePage({ x: 0, y: 0, width: 256, height: 256 });
  const big = img.resize({ width: 256, height: 256, quality: 'best' });
  fs.mkdirSync(path.join(ROOT, 'src', 'renderer', 'assets'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'src', 'renderer', 'assets', 'icon.png'), big.toPNG());
  fs.writeFileSync(path.join(ROOT, 'src', 'renderer', 'assets', 'icon.svg'), SVG);
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  fs.writeFileSync(path.join(ROOT, 'build', 'icon.ico'), ico(sizes.map(size => ({ size, buf: big.resize({ width: size, height: size, quality: 'best' }).toPNG() }))));
  console.log('icon written');
  app.quit();
});
