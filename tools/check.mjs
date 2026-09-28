// my-3D2dge game checker: loads a game in a headless browser, presses start, plays it for a
// moment, switches through the game's camera views, and reports errors, warnings, frame rate,
// how much is actually on screen, and screenshots.
//
// Setup (once):   npm install          (installs Playwright)
//                 npx playwright install chromium
// Usage:          node tools/check.mjs path/to/game.html[#scene] [--seconds 4] [--out check-output]
// Exit code is 1 if the page threw any error or never drew anything, so agents and CI can rely on it.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !/^\d+(\.\d+)?$/.test(a));
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
if (!file) { console.error('Usage: node tools/check.mjs path/to/game.html [--seconds 4] [--out check-output]'); process.exit(2); }
const seconds = +opt('seconds', 4), out = resolve(opt('out', 'check-output'));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], warnings = [], engineWarnings = [], external = new Set();
page.on('pageerror', e => errors.push(String(e && e.stack || e)));
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error') errors.push(t);
  else if (m.type() === 'warning') (t.startsWith('my-3D2dge:') ? engineWarnings : warnings).push(t);
});
page.on('request', r => { const u = r.url(); if (/^https?:/i.test(u)) external.add(u.split('?')[0]); });

// a #hash after the file name is kept, so deep links like game.html#platformer work
const [filePath, hash] = file.split('#');
await page.goto(pathToFileURL(resolve(filePath)).href + (hash ? '#' + hash : ''));
await page.waitForTimeout(1200);
const hasEngine = await page.evaluate(() => !!(window.My3D2dge && My3D2dge.current));
const report = { file, engine: hasEngine ? await page.evaluate(() => My3D2dge.version) : null, scenes: [], views: [], errors, warnings, engineWarnings, external: [] };

// how much of the frame is not background: share of pixels that differ from the most common color
const coverage = () => page.evaluate(() => {
  const g = My3D2dge.current, c = g.screen.buf, ctx = c.getContext('2d'), W = g.screen.W, H = g.screen.H;
  const d = ctx.getImageData(0, 0, W, H).data, counts = new Map();
  for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3); counts.set(k, (counts.get(k) || 0) + 1); }
  let top = 0; for (const v of counts.values()) top = Math.max(top, v);
  return { filled: +(1 - top / (W * H)).toFixed(3), colors: counts.size };
});
const snap = async (tag) => {
  const s = await page.evaluate(() => { const g = My3D2dge.current; return { scene: g.sceneName, fps: g.fps, updateMs: +g.stats.updateMs.toFixed(2), renderMs: +g.stats.renderMs.toFixed(2), items: g.stats.items, actors: g.stats.actors, resolution: g.screen.W + 'x' + g.screen.H, errorBox: !!document.getElementById('my3d2dge-error') }; });
  const cov = await coverage(), shot = join(out, tag + '.png');
  await page.screenshot({ path: shot });
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
} else errors.push('No my-3D2dge game found: My3D2dge.current is empty after loading. Did the game script throw before new E.Game(...)?');

await browser.close();
report.external = [...external];
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));

// verdicts
const all = [...report.scenes, ...report.views];
const played = all.filter(v => v.at !== 'load');
const blank = played.length > 0 && played.every(v => v.filled < .01);
if (blank) errors.push('After pressing start, the screen stayed one flat color the whole time: nothing is drawn where the camera looks (check game.focus, level.draw / map.drawFloor, and that the play scene draws).');
if (all.some(v => v.errorBox)) errors.push('The on-screen error box was showing (see the errors above).');

console.log('my-3D2dge check: ' + file + (report.engine ? ' (engine ' + report.engine + ')' : ''));
for (const v of report.scenes) console.log(`  ${v.at.padEnd(13)} scene ${String(v.scene).padEnd(10)} ${String(v.fps).padStart(3)} fps  ${v.actors} characters  ${v.items} draws  ${Math.round(v.filled * 100)}% filled  ${v.resolution}`);
for (const v of report.views) console.log(`  view ${v.view.padEnd(13)} ${String(v.fps).padStart(3)} fps  update ${v.updateMs} ms  draw ${v.renderMs} ms  ${v.actors} characters  ${Math.round(v.filled * 100)}% filled`);
const sparse = all.filter(v => v.filled < .06);
if (!blank && sparse.length) console.log(`  note: ${sparse.length} screenshot(s) are almost empty (under 6% of pixels differ from the background). Check the camera (game.focus) and the screenshots.`);
if (engineWarnings.length) console.log(`  ${engineWarnings.length} engine warning(s):\n    ` + engineWarnings.join('\n    '));
if (report.external.length) console.log(`  not self-contained: the page loaded ${report.external.length} file(s) from the internet:\n    ` + report.external.join('\n    '));
console.log(errors.length ? `  ${errors.length} error(s):\n    ` + errors.join('\n    ') : '  no errors');
console.log('  screenshots and report.json in ' + out);
process.exit(errors.length ? 1 : 0);
