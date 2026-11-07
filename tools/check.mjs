// my-3D2dge game checker: loads a game in a headless browser, presses start, plays it for a
// moment, switches through the game's camera views, and reports errors, warnings, frame rate,
// how much of the window the picture covers (covers: 1 = no black bars), how much is actually on screen, and screenshots.
//
// Setup (once):   npm install          (installs Playwright)
//                 npx playwright install chromium
// Usage:          node tools/check.mjs path/to/game.html[#scene] [--seconds 4] [--out check-output] [--size 390x844@3]
//                 (--size: the window in CSS pixels and its pixel density; @2 and up is a phone or tablet, with touch)
// Exit code is 1 if the page threw any error or never drew anything, so agents and CI can rely on it.
// A game that sets game.debug = { snapshot() { return {...} } } gets its snapshot printed after play (its own state:
// the hero, the objective, what an agent needs to see the game is where it should be).
// A page that loads ES modules (a 3D game: the 3D engine and its import map) is served, as browsers load modules only
// over http: from the folder above this tool (the repository, or the handoff package) when the page is in it, else from
// the folder it is run in or the page's own. It plays on WebGL 2 (?backend=webgl, unless the address says otherwise), its
// boot waited out, and a game whose canvas is clear (bg: null, a 3D world under it) is measured from the screenshot.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, join, dirname, extname, relative, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !/^\d+(\.\d+)?$/.test(a));
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
if (!file) { console.error('Usage: node tools/check.mjs path/to/game.html [--seconds 4] [--out check-output]'); process.exit(2); }
const seconds = +opt('seconds', 4), out = resolve(opt('out', 'check-output'));
const [, sw, sh, sd] = (opt('size', '1280x720') || '').match(/^(\d+)x(\d+)(?:@(\d+(?:\.\d+)?))?$/) || [0, 1280, 720];
const dpr = +(sd || 1), size = { viewport: { width: +sw, height: +sh }, deviceScaleFactor: dpr, ...(dpr >= 2 && { isMobile: true, hasTouch: true }) };
mkdirSync(out, { recursive: true });

// a #hash after the file name is kept, so deep links like game.html#platformer work (and a ?query, on a served page)
const [filePath, hash] = file.split('#'), [diskPath, query] = filePath.split('?'), page0 = resolve(diskPath);
const served = existsSync(page0) && /<script\b[^>]*\btype=["']?(module|importmap)\b/i.test(readFileSync(page0, 'utf8'));
const inside = dir => !relative(dir, page0).startsWith('..') && !relative(dir, page0).startsWith(sep);
const ROOT = !served ? null : [join(dirname(fileURLToPath(import.meta.url)), '..'), process.cwd()].find(inside) || dirname(page0);
let origin = null, server = null; const missing = [];   // (what a served page asked for that isn't there: named in the report)
if (served) {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml' };
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = join(ROOT, path);
    if (path === '/favicon.ico') { res.writeHead(204); res.end(); return; }   // (the browser asks for one; a page needs none)
    if (!f.startsWith(ROOT) || !existsSync(f) || !statSync(f).isFile()) { missing.push(path); res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  origin = 'http://127.0.0.1:' + server.address().port;
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required', ...(served ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] : [])] });
const page = await browser.newPage(size);
const errors = [], warnings = [], engineWarnings = [], external = new Set();
page.on('pageerror', e => errors.push(String(e && e.stack || e)));
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error') errors.push(t);
  else if (m.type() === 'warning') (t.startsWith('my-3D2dge:') ? engineWarnings : warnings).push(t);
});
page.on('request', r => { const u = r.url(); if (/^https?:/i.test(u) && !(origin && u.startsWith(origin + '/'))) external.add(u.split('?')[0]); });

if (served) {
  const q = query ? (/(^|&)backend=/.test(query) ? query : query + '&backend=webgl') : 'backend=webgl';
  await page.goto(origin + '/' + relative(ROOT, page0).split(sep).join('/') + '?' + q + (hash ? '#' + hash : ''));
  // its modules load (three.js and Rapier are megabytes), then its boot runs (a 3D world, its shaders' warm-up)
  await page.waitForFunction(() => window.My3D2dge && My3D2dge.current, null, { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => My3D2dge.current && Promise.race([My3D2dge.current.booted, new Promise(r => setTimeout(r, 120000))])).catch(() => {});
}
else await page.goto(pathToFileURL(page0).href + (query ? '?' + query : '') + (hash ? '#' + hash : ''));
await page.waitForTimeout(1200);
const hasEngine = await page.evaluate(() => !!(window.My3D2dge && My3D2dge.current));
const report = { file, engine: hasEngine ? await page.evaluate(() => My3D2dge.version) : null, build: hasEngine ? await page.evaluate(() => My3D2dge.build || null) : null, scenes: [], views: [], errors, warnings, engineWarnings, external: [] };

// how much of the frame is not background (share of pixels that differ from the most common color), plus a quick look
// lint: palette depth, flat areas, dither checkerboards, contrast. Read from the game's buffer; from the screenshot (png,
// scaled to the game's pixels) when the game's canvas is clear, the picture under it (a 3D world) being the most of it
const coverage = png => page.evaluate(async png => {
  const g = My3D2dge.current, W = g.screen.W, H = g.screen.H, N = W * H;
  let ctx = g.screen.buf.getContext('2d');
  if (png) { const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode(); const c = document.createElement('canvas'); c.width = W; c.height = H; ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, W, H); }
  const d = ctx.getImageData(0, 0, W, H).data, counts = new Map(), luma = new Uint8Array(N), key = new Int32Array(N);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) { const k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3); key[p] = k; counts.set(k, (counts.get(k) || 0) + 1); luma[p] = (d[i] * 3 + d[i + 1] * 6 + d[i + 2]) / 10; }
  let top = 0, colors = 0; for (const v of counts.values()) { top = Math.max(top, v); if (v >= N * .001) colors++; }
  let checker = 0, wins = 0;
  for (let y = 0; y < H - 1; y += 2) for (let x = 0; x < W - 1; x += 2) { const a = key[y * W + x], b = key[y * W + x + 1], c2 = key[(y + 1) * W + x], e = key[(y + 1) * W + x + 1]; wins++; if (a !== b && a === e && b === c2) checker++; }
  const sorted = Array.from(luma).sort((p, q) => p - q), spread = sorted[Math.floor(N * .95)] - sorted[Math.floor(N * .05)];
  return { filled: +(1 - top / N).toFixed(3), colors, flat: +(top / N).toFixed(3), checker: +(checker / Math.max(1, wins)).toFixed(3), spread };
}, png);
const snap = async (tag) => {
  const s = await page.evaluate(() => { const g = My3D2dge.current; return { scene: g.sceneName, fps: g.fps, updateMs: +g.stats.updateMs.toFixed(2), renderMs: +g.stats.renderMs.toFixed(2), items: g.stats.items, actors: g.stats.actors, resolution: g.screen.W + 'x' + g.screen.H, covers: +(Math.min(1, g.screen.W * g.screen.S / g.screen.canvas.width) * Math.min(1, g.screen.H * g.screen.S / g.screen.canvas.height)).toFixed(3), errorBox: !!document.querySelector('#my3d2dge-error, #e3-boot[data-failed]'), clear: g.screen.clear }; });
  const shot = join(out, tag + '.png'), png = await page.screenshot({ path: shot }), cov = await coverage(s.clear ? png.toString('base64') : null);
  return { ...s, ...cov, screenshot: shot };
};

if (hasEngine) {
  report.scenes.push({ at: 'load', ...(await snap('0-load')) });
  // press start / confirm twice to get past title screens and menus
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(450); }
  report.scenes.push({ at: 'after start', ...(await snap('1-started')) });
  // play: move in every direction, jump, attack, dash, fire, using both key layouts
  await page.mouse.move(820, 330);
  const hold = async (keys, ms) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); };
  await hold(['KeyD', 'ArrowRight'], 500);
  await page.keyboard.press('Space'); await page.keyboard.press('KeyZ');
  await hold(['KeyD', 'ArrowRight'], 400);
  for (const k of ['KeyJ', 'KeyX', 'KeyJ']) { await page.keyboard.press(k); await page.waitForTimeout(160); }
  await hold(['KeyW', 'ArrowUp'], 250); await hold(['KeyA', 'ArrowLeft'], 300); await hold(['KeyS', 'ArrowDown'], 250);
  report.scenes.push({ at: 'after play', ...(await snap('2-played')) });
  const views = await page.evaluate(() => (My3D2dge.current.views || My3D2dge.VIEW_ORDER).slice());
  for (const id of views) {
    await page.evaluate(v => My3D2dge.current.setView(v), id);
    await page.waitForTimeout(seconds * 1000 / views.length);
    report.views.push({ view: id, ...(await snap('view-' + id)) });
  }
  report.snapshot = await page.evaluate(() => { const d = My3D2dge.current && My3D2dge.current.debug; if (!d || typeof d.snapshot !== 'function') return null; try { return d.snapshot(); } catch (e) { return { threw: e.message }; } });
} else errors.push('No my-3D2dge game found: My3D2dge.current is empty after loading. Did the game script throw before new E.Game(...)?');

await browser.close();
if (server) server.close();
for (const m of new Set(missing)) errors.push(`the page asked the server for ${m}, which is not in ${ROOT} (served pages: run the check from the folder that holds the page and what it loads)`);
report.external = [...external];
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));

// verdicts
const all = [...report.scenes, ...report.views];
const played = all.filter(v => v.at !== 'load');
const blank = played.length > 0 && played.every(v => v.filled < .01);
if (blank) errors.push('After pressing start, the screen stayed one flat color the whole time: nothing is drawn where the camera looks (check game.focus, level.draw / map.drawFloor, and that the play scene draws).');
if (all.some(v => v.errorBox)) errors.push('The on-screen error box (or the boot screen\'s failure report) was showing (see the errors above).');

console.log('my-3D2dge check: ' + file + (report.engine ? ' (engine ' + report.engine + (report.build ? ', build ' + report.build : '') + ')' : ''));
for (const v of report.scenes) console.log(`  ${v.at.padEnd(13)} scene ${String(v.scene).padEnd(10)} ${String(v.fps).padStart(3)} fps  ${v.actors} characters  ${v.items} draws  ${Math.round(v.filled * 100)}% filled  ${v.colors} colors  ${v.resolution}`);
for (const v of report.views) console.log(`  view ${v.view.padEnd(13)} ${String(v.fps).padStart(3)} fps  update ${v.updateMs} ms  draw ${v.renderMs} ms  ${v.actors} characters  ${Math.round(v.filled * 100)}% filled`);
const sparse = all.filter(v => v.filled < .06);
if (!blank && sparse.length) console.log(`  note: ${sparse.length} screenshot(s) are almost empty (under 6% of pixels differ from the background). Check the camera (game.focus) and the screenshots.`);
// look lint: the gameplay screenshots only (the title may be sparse on purpose)
const lookNotes = new Set();
for (const v of played) {
  // (a 3D world under the game, its canvas clear: the 3D manual's words for the same fixes)
  if (v.colors < 40) lookNotes.add(`only ${v.colors} distinct colors on screen (PS1-era scenes use 100+) in "${v.at || 'view ' + v.view}": ` + (v.clear ? 'light it (sun, ambient, torches), texture the ground and sides (level.ground, side), dress it with things and shapes' : 'shade with E.tones, add a backdrop, textured tiles and props'));
  if (v.flat > .4) lookNotes.add(`${Math.round(v.flat * 100)}% of the screen is one flat color in "${v.at || 'view ' + v.view}": ` + (v.clear ? 'a sky of two colors and fog, textured ground, things and shapes (or bring the camera in)' : 'fill it with an E.Backdrop, textured tiles or props'));
  if (v.checker > .06) lookNotes.add(`${Math.round(v.checker * 100)}% of the screen is 1-pixel checkerboard dithering in "${v.at || 'view ' + v.view}": use the stepped-alpha helpers (E.style.trans = 'alpha')`);
  if (v.spread < 70) lookNotes.add(`low contrast in "${v.at || 'view ' + v.view}" (luma spread ${v.spread}): darker shadows, brighter highlights`);
}
if (report.snapshot) console.log('  game.debug.snapshot(): ' + JSON.stringify(report.snapshot).slice(0, 600));
if (lookNotes.size) console.log(`  look notes (aim for PS1 / N64 era ${played.some(v => v.clear) ? '3D' : '2D'}):\n    ` + [...lookNotes].slice(0, 6).join('\n    '));
if (engineWarnings.length) console.log(`  ${engineWarnings.length} engine warning(s):\n    ` + engineWarnings.join('\n    '));
if (report.external.length) console.log(`  not self-contained: the page loaded ${report.external.length} file(s) from the internet:\n    ` + report.external.join('\n    '));
console.log(errors.length ? `  ${errors.length} error(s):\n    ` + errors.join('\n    ') : '  no errors');
console.log('  screenshots and report.json in ' + out);
process.exit(errors.length ? 1 : 0);
