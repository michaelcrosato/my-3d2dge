// Labs check: the Labs page (examples/labs.html, built from src/labs.json) and the way back to it. It serves the repo the
// way Vercel does (vercel.json's rewrites), opens the Labs page at /labs and /labs.html, and opens every link on it: each
// must load (status 200) without a page error. As files on disk, every link must point at a file that exists. Each lab's
// "All labs" link and the game's Developer panel button must reach the Labs page, and held upright on a phone every lab's
// picture must fill the screen. It fails (exit code 1) on any of these.
// Usage: node tools/labs-test.mjs        (run node tools/build.mjs first; CHROMIUM_PATH picks a browser)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = resolve('.');
const problems = [];
const fail = m => problems.push(m);

/* a static server with vercel.json's rewrites: "/:page(a|b)" patterns, filled into the destination */
const rules = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')).rewrites.map(r => ({
  re: new RegExp('^' + r.source.replace(/\./g, '\\.').replace(/:(\w+)\(([^)]+)\)/g, '(?<$1>$2)') + '$'),
  to: r.destination,
}));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const r of rules) { const m = path.match(r.re); if (m) { path = r.to.replace(/:(\w+)/g, (_, k) => m.groups[k]); break; } }
  const file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:' + server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
let errors = [];
page.on('pageerror', e => errors.push(String(e)));
const links = () => page.$$eval('#list a', as => as.map(a => a.href));

/* the Labs page on the site, at both its addresses: the same links, and each one loads without an error */
await page.goto(SITE + '/labs');
if (await page.textContent('h1') !== 'Labs') fail('/labs is not the Labs page');
const siteLinks = await links();
const sections = await page.$$eval('h2', hs => hs.map(h => h.textContent));
await page.goto(SITE + '/labs.html');
if (JSON.stringify(await links()) !== JSON.stringify(siteLinks)) fail('/labs.html links differ from /labs');
const labs = JSON.parse(readFileSync(join(root, 'src/labs.json'), 'utf8'));
for (const S of labs.sections) if (!sections.includes(S.title)) fail('section missing: ' + S.title);
const want = labs.sections.reduce((n, S) => n + S.entries.reduce((m, L) => m + 1 + L.links.length, 0), 0);
if (siteLinks.length !== want) fail(`the Labs page shows ${siteLinks.length} links, src/labs.json has ${want}`);
let opened = 0;
for (const href of [...new Set(siteLinks)]) {
  await page.goto('about:blank');   // a fresh load each time (a link that only changes the #part would not reload)
  errors = [];
  const r = await page.goto(href);
  if (!r || r.status() !== 200) { fail(`${href.replace(SITE, '')}: status ${r && r.status()}`); continue; }
  await page.waitForTimeout(400);
  for (const e of errors) fail(`${href.replace(SITE, '')}: page error: ${e}`);
  opened++;
}

/* the Labs page as files: every link points at a file that exists */
await page.goto(pathToFileURL(join(root, 'examples/labs.html')).href);
const fileLinks = await links();
if (fileLinks.length !== siteLinks.length) fail('the file copy of the Labs page has a different number of links');
for (const href of fileLinks) {
  const f = fileURLToPath(href.replace(/[?#].*$/, ''));
  if (!existsSync(f)) fail('file link to a missing file: ' + f.replace(root, '.'));
}

/* the way back: each lab's "All labs" link, and the game's Developer panel */
for (const lab of ['mocap-lab', 'perspective-lab', 'stress-test', 'arena']) {
  await page.goto(SITE + '/' + lab);
  const a = page.locator('a.to-labs');
  if (await a.count() !== 1) { fail(lab + ': no All labs link'); continue; }
  await Promise.all([page.waitForURL(/\/labs\.html$/), a.click()]);
  if (await page.textContent('h1') !== 'Labs') fail(lab + ': All labs did not open the Labs page');
}
await page.goto(SITE + '/');
await page.waitForFunction(() => window.__ed && __ed.UI);
await page.evaluate(() => __ed.UI.open('developer'));
await Promise.all([page.waitForURL(/\/labs\.html$/), page.getByRole('button', { name: 'All labs ↗' }).click()]);
if (await page.textContent('h1') !== 'Labs') fail('the Developer panel button did not open the Labs page');

/* held upright on a phone, every lab's picture fills the screen (the engine's portrait sizing) */
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
for (const lab of ['mocap-lab', 'perspective-lab', 'stress-test', 'arena']) {
  await phone.goto(SITE + '/' + lab);
  await phone.waitForTimeout(500);
  const fills = await phone.evaluate(() => { const sc = (window.__mocap || window.__game).game.screen; return sc.W * sc.S >= sc.canvas.width - sc.S && sc.H * sc.S >= sc.canvas.height - sc.S; });
  if (!fills) fail(lab + ': the picture does not fill an upright phone');
}

await browser.close();
server.close();
if (problems.length) { console.error('labs check FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`labs check passed: ${siteLinks.length} links (${opened} pages opened on the site, all found as files), the way back from 4 labs and the game, 4 labs fill an upright phone`);
