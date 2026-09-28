// CO55 game checker: loads a game in a headless browser, plays it for a moment,
// switches through every camera view, and reports errors, frame rate and screenshots.
//
// Setup (once):   npm install          (installs Playwright)
//                 npx playwright install chromium
// Usage:          node tools/check.mjs path/to/game.html [--seconds 4] [--out check-output]
// Exit code is 1 if the page threw any error, so agents and CI can rely on it.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
if (!file) { console.error('Usage: node tools/check.mjs path/to/game.html [--seconds 4] [--out check-output]'); process.exit(2); }
const seconds = +opt('seconds', 4), out = resolve(opt('out', 'check-output'));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], warnings = [];
page.on('pageerror', e => errors.push(String(e && e.stack || e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });

await page.goto(pathToFileURL(resolve(file)).href);
await page.waitForTimeout(1500);
const hasEngine = await page.evaluate(() => !!(window.CO55 && CO55.current));
const report = { file, engine: hasEngine ? await page.evaluate(() => CO55.version) : null, views: [], errors, warnings };

if (hasEngine) {
  // play: move around, attack, dash
  await page.mouse.move(820, 330);
  for (const key of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) { await page.keyboard.down(key); await page.waitForTimeout(250); await page.keyboard.up(key); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(220); }
  await page.keyboard.press('Space');
  const views = await page.evaluate(() => CO55.VIEW_ORDER.slice());
  for (const id of views) {
    await page.evaluate(v => CO55.current.setView(v), id);
    await page.waitForTimeout(seconds * 1000 / views.length);
    const s = await page.evaluate(() => { const g = CO55.current; return { fps: g.fps, updateMs: +g.stats.updateMs.toFixed(2), renderMs: +g.stats.renderMs.toFixed(2), items: g.stats.items, actors: g.stats.actors, resolution: g.screen.W + 'x' + g.screen.H }; });
    const shot = join(out, 'view-' + id + '.png');
    await page.screenshot({ path: shot });
    report.views.push({ view: id, ...s, screenshot: shot });
  }
} else errors.push('No CO55 game found: CO55.current is empty after loading.');

await browser.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log('CO55 check: ' + file + (report.engine ? ' (engine ' + report.engine + ')' : ''));
for (const v of report.views) console.log(`  ${v.view.padEnd(13)} ${String(v.fps).padStart(3)} fps  update ${v.updateMs} ms  draw ${v.renderMs} ms  ${v.actors} characters  ${v.resolution}`);
console.log(errors.length ? `  ${errors.length} error(s):\n    ` + errors.join('\n    ') : '  no errors');
console.log('  screenshots and report.json in ' + out);
process.exit(errors.length ? 1 : 0);
