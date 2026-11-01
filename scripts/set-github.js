// Puts your GitHub user name into package.json (auto-update source) and the README links.
// Usage:  node scripts/set-github.js <your-github-name> [repo-name]
const fs = require('fs');
const path = require('path');

const [owner, repo = 'kairo'] = process.argv.slice(2);
if (!owner) { console.log('Usage: node scripts/set-github.js <your-github-name> [repo-name]'); process.exit(1); }

const pkgFile = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
pkg.build.publish = [{ provider: 'github', owner, repo }];
pkg.repository = { type: 'git', url: `https://github.com/${owner}/${repo}.git` };
pkg.homepage = `https://github.com/${owner}/${repo}`;
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');

const readme = path.join(__dirname, '..', 'README.md');
fs.writeFileSync(readme, fs.readFileSync(readme, 'utf8').replace(/YOUR_GITHUB_NAME\/kairo/g, `${owner}/${repo}`));
// the download page (docs/index.html, for GitHub Pages)
const page = path.join(__dirname, '..', 'docs', 'index.html');
if (fs.existsSync(page)) fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace(/YOUR_GITHUB_NAME\/kairo/g, `${owner}/${repo}`));
console.log(`Done: auto-update and links now point to github.com/${owner}/${repo}`);
