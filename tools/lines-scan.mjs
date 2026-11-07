// Words a page shows that are not lines (AI Hub Languages v1: every word a player reads comes from the page's game-lines
// block, so a translation reaches it). It plays the page in the test language en-XA, where every line E.t gives is
// bracketed and accented ([Stárt ··]), and lists the text drawn (E.font.text, E.font.title, r.text) or put in the page (the
// menus' HTML) with three letters or more, no bracket and no accent: a word the code wrote itself.
//   node tools/lines-scan.mjs <page.html> [#slice[/part]] [--seconds 6] [--keys confirm,start] [--allow 'regex']
// The page is served from the repository (a 3D kit loads vendor/), its hash taken as the place to start. It presses the
// keys given (confirm and start by default: past a title), opens the pause menu and its settings and controls, and
// prints each word once with how often it showed; exit code 1 when there is one. --allow: words it may show (names,
// units). Run node tools/build.mjs first.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');   // (the repository, or the handoff package)

const a = process.argv.slice(2), opt = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
const file = a.find(x => !x.startsWith('--') && !x.startsWith('#') && a[a.indexOf(x) - 1] !== '--seconds' && a[a.indexOf(x) - 1] !== '--keys' && a[a.indexOf(x) - 1] !== '--allow');
if (!file) { console.error("usage: node tools/lines-scan.mjs <page.html> [#slice[/part]] [--seconds 6] [--keys confirm,start] [--allow 'regex']"); process.exit(2); }
const hash = a.find(x => x.startsWith('#')) || '', secs = +opt('seconds', 6), keys = opt('keys', 'confirm,start').split(',').filter(Boolean), allow = opt('allow', null) ? new RegExp(opt('allow')) : null;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.css': 'text/css' };
const server = createServer((req, res) => {
  const f = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(root) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${relative(root, resolve(file)).split('\\').join('/')}?lang=en-XA${hash}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } }), errors = [];
page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
// before the page's scripts: when the engine arrives, every text it draws is noted
await page.addInitScript(() => {
  const seen = window.__seen = new Map(), note = s => { s = String(s); if (s) seen.set(s, (seen.get(s) || 0) + 1); };
  let E0; Object.defineProperty(window, 'My3D2dge', { configurable: true, get() { return E0; }, set(E) {
    E0 = E; const f = E && E.font; if (!f || f._scan) return; f._scan = true;
    for (const k of ['text', 'title']) { const o = f[k]; f[k] = function (g, s, ...r) { note(s); return o.call(this, g, s, ...r); }; }
  } });
});
await page.goto(url);
await page.waitForTimeout(1500);
const press = async k => page.evaluate(k => { const g = window.My3D2dge && My3D2dge.current; if (g) g.input.tap(k); }, k).catch(() => {});
const t0 = Date.now();
while (Date.now() - t0 < secs * 1000) { for (const k of keys) { await press(k); await page.waitForTimeout(350); } }
// the menus: pause, settings, controls (their HTML)
const html = new Set();
const grab = async () => { for (const s of await page.evaluate(() => [...document.querySelectorAll('.esh-sh, .esh-col, .esh-toast, #e3-corner')].flatMap(el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), out = []; let n; while ((n = w.nextNode())) out.push(n.textContent.trim()); return out; }).filter(Boolean)).catch(() => [])) html.add(s); };
await page.evaluate(() => { const g = My3D2dge.current; if (g && g.menu) g.menu(); }).catch(() => {}); await page.waitForTimeout(400); await grab();
for (const s of ['settings', 'controls']) { await page.evaluate(s => { const g = My3D2dge.current; if (g && g.shell && g.shell.show) g.shell.show(s); }, s).catch(() => {}); await page.waitForTimeout(400); await grab(); }
const drawn = await page.evaluate(() => [...window.__seen.entries()]);
await browser.close(); server.close();
const UNITS = /^[-+]?[\d.,\s]*\d[\d.,\s]*(ms|px|%|×)?$/;   // (a number with its unit: units stay as written)
const PADS = /^((A|B|X|Y|LB|RB|LT|RT|LS|RS|L1|R1|L2|R2|L3|R3|ZL|ZR|View|Menu|Create|Options|Guide|PS|[✕○□△+−↑↓←→]) ?(\/ ?)?)+$/;   // (a gamepad's own button names, as its makers print them)
const bad = ([s]) => /\p{L}{3,}/u.test(s) && !/[[\]áéíóúñçÁÉÍÓÚÑÇ]/.test(s) && !UNITS.test(s) && !PADS.test(s) && !(allow && allow.test(s));   // (a line's text carries en-XA's brackets, or its accents where a box breaks a long one into rows; three letters or more: a typewriter's first two are no word)
const out = [...drawn.filter(bad).map(([s, n]) => [s, n, 'drawn']), ...[...html].filter(s => bad([s])).map(s => [s, 1, 'menu'])];
for (const [s, n, w] of out.sort((x, y) => y[1] - x[1])) console.log(`  ${w} ×${n}: ${JSON.stringify(s)}`);
for (const e of errors) console.log('  page error: ' + e);
console.log(out.length ? `${file}${hash}: ${out.length} words not from the lines (en-XA brackets every line)` : `${file}${hash}: every word it showed is a line (${drawn.length} texts drawn, ${html.size} in the menus)`);
process.exit(out.length || errors.length ? 1 : 0);
