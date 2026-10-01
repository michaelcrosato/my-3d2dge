#!/usr/bin/env node
/* Build one offline Workshop page, then serve only that page on loopback.
 * Run: node tools/visual-workshop.mjs [--build] [--open] [--port 4173]
 * No npm install is required when examples/emberdeep.html already exists.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let port = 4173, buildOnly = false, open = false, gamePath = join(root, 'examples/emberdeep.html');
for (let index = 0; index < args.length; index++) {
  const arg = args[index];
  if (arg === '--build') buildOnly = true;
  else if (arg === '--open') open = true;
  else if (arg === '--port') {
    port = Number(args[++index]);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a port between 1024 and 65535.');
  } else if (arg === '--game') {
    if (!args[index + 1]) throw new Error('--game needs a path to a standalone Emberdeep HTML file.');
    gamePath = resolve(args[++index]);
  } else if (arg === '--help') {
    console.log('node tools/visual-workshop.mjs [--build] [--open] [--port 4173] [--game path/to/emberdeep.html]');
    process.exit(0);
  } else throw new Error('Unknown option: ' + arg);
}
try {
  const folder = join(root, 'tools/visual-workshop');
  let game;
  try { game = readFileSync(gamePath, 'utf8'); }
  catch { throw new Error('Cannot read ' + gamePath + '. Run npm run build first, or use --game with a standalone Emberdeep file.'); }
  if (!game.includes('window.__ed') || !game.includes('class CodexRig')) throw new Error('The input is not a supported Emberdeep build.');
  const safeJSON = value => JSON.stringify(value).replace(/</g, '\u003c');
  const safeScript = text => text.replace(/<\/script/gi, '<\\/script');
  const gameSha256 = createHash('sha256').update(game).digest('hex');
  let commit = null, dirty = null;
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    dirty = !!execFileSync('git', ['status', '--porcelain', '--', 'engine', 'src/emberdeep', 'examples/emberdeep.html'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { /* A downloaded repository ZIP has no Git metadata. The source hash is sufficient. */ }
  const info = { workshopVersion: '1.0.0', gameSha256, commit, dirty, sourceName: gamePath === join(root, 'examples/emberdeep.html') ? 'examples/emberdeep.html' : gamePath.split(/[\\/]/).pop() };
  let html = readFileSync(join(folder, 'index.html'), 'utf8');
  html = html.replace('<!-- WORKSHOP_STYLE -->\n<link rel="stylesheet" href="style.css">', '<style>\n' + readFileSync(join(folder, 'style.css'), 'utf8') + '\n</style>');
  html = html.replace('<!-- WORKSHOP_DATA -->\n<script id="game-source" type="application/json">null</script>\n<script id="build-info" type="application/json">{}</script>', '<script id="game-source" type="application/json">' + safeJSON(game) + '</script>\n<script id="build-info" type="application/json">' + safeJSON(info) + '</script>');
  html = html.replace('<!-- WORKSHOP_SCRIPTS -->\n<script src="bridge.js"></script><script src="app.js"></script>', ['bridge.js', 'app.js'].map(file => '<script>\n' + safeScript(readFileSync(join(folder, file), 'utf8')) + '\n</script>').join('\n'));
  if (/<!-- WORKSHOP_/.test(html)) throw new Error('A Workshop template marker was not replaced.');
  const output = join(root, 'examples/visual-workshop.html'); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
  console.log('Built examples/visual-workshop.html (' + (Buffer.byteLength(html) / 1024 / 1024).toFixed(2) + ' MB).');
  console.log('Game SHA-256: ' + gameSha256);
  console.log('This page is self-contained. It does not write to the normal game save.');
  if (!buildOnly) {
    const server = createServer((request, response) => {
      const path = new URL(request.url, 'http://localhost').pathname;
      if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
      if (path === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      if (path !== '/' && path !== '/visual-workshop.html') { response.writeHead(404); response.end('Not found'); return; }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(html), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      response.end(request.method === 'HEAD' ? undefined : html);
    });
    server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Port ' + port + ' is in use. Run with --port and another number.' : error.message); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => {
      const url = 'http://127.0.0.1:' + port + '/';
      console.log('\nOpen ' + url + '\nPress Ctrl+C to stop the local server.');
      if (open) {
        const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'rundll32' : 'xdg-open';
        const argv = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
        const child = spawn(command, argv, { stdio: 'ignore' }); child.on('error', () => console.log('Open the address above in your browser.')); child.unref();
      }
    });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
  }
} catch (error) { console.error('Visual Workshop: ' + error.message); process.exitCode = 1; }
