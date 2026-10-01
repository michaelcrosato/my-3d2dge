#!/usr/bin/env node
/* Integration checks against the actual built game, not a substitute rig. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'check-output/visual-workshop');
mkdirSync(out, { recursive: true });
execFileSync(process.execPath, ['tools/visual-workshop.mjs', '--build'], { cwd: root, stdio: 'inherit' });
const html = readFileSync(resolve(root, 'examples/visual-workshop.html'));
const server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.accept());
await page.addInitScript(() => {
  if (window === window.top) {
    localStorage.setItem('ed:save', 'WORKSHOP-TEST-KEEP-WANDERER');
    localStorage.setItem('ed:save:codex', 'WORKSHOP-TEST-KEEP-CODEX');
    localStorage.removeItem('ed:visual-workshop:v1');
  }
});
const settle = async () => { await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0))); await page.evaluate(() => window.VisualWorkshop.settled); const text = await page.locator('#status.error').allTextContents(); assert.equal(text.length, 0, text.join('\n')); };
const seek = async frame => { await page.locator('#timeline').evaluate((el, value) => { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(frame)); await settle(); };
const change = async (id, value) => { await page.locator('#' + id).evaluate((el, value) => { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }, String(value)); await settle(); };
const image = () => page.locator('#canvasB').evaluate(canvas => canvas.toDataURL());
const check = label => { checks.push(label); console.log('PASS ' + label); };
let success = false;
try {
  await page.goto(url);
  await page.waitForFunction(() => window.VisualWorkshop?.ready || document.querySelector('#status.error'), null, { timeout: 60000 });
  await settle();
  assert(await page.evaluate(() => window.VisualWorkshop.ready));
  assert((await page.locator('#actions button').count()) >= 18);
  check('Real game loads; character pose catalogue is available');
  // Opaque-origin sandbox, no credentials or saved progression shared with the game.
  assert.equal(await page.locator('iframe.runtime').first().getAttribute('sandbox'), 'allow-scripts');
  assert.deepEqual(await page.evaluate(() => [localStorage.getItem('ed:save'), localStorage.getItem('ed:save:codex')]), ['WORKSHOP-TEST-KEEP-WANDERER', 'WORKSHOP-TEST-KEEP-CODEX']);
  check('Normal save slots remain unchanged');
  await seek(120); const first = await image();
  await seek(20); await seek(120); assert.equal(await image(), first);
  check('Codex backward seek resets and reproduces the same frame');
  await page.locator('#saveA').click(); await settle();
  await change('color-paper', '#ef5c72');
  assert.notEqual(await image(), await page.locator('#canvasA').evaluate(canvas => canvas.toDataURL()));
  check('A/B palette comparison uses distinct actual rendered images');
  await page.locator('#compare').uncheck(); await settle();
  const rect = await page.locator('#marks').boundingBox();
  await page.mouse.click(rect.x + rect.width * .5, rect.y + rect.height * .5);
  await settle();
  await page.locator('#note').fill('Reduce the hover. Keep the book shape. <script>window.BAD=true</script>');
  await page.locator('#addNote').click(); await settle();
  assert.equal(await page.evaluate(() => window.VisualWorkshop.state.noteCount), 1);
  assert.equal(await page.evaluate(() => window.BAD), undefined);
  const note = await page.evaluate(() => window.VisualWorkshop.review.notes[0]);
  assert(Math.abs(note.pin.x - .5) < .02 && Math.abs(note.pin.y - .5) < .02);
  check('Point annotation keeps its frame; note text is not executed');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#exportReview').click()]);
  const zipPath = resolve(out, 'sample-review.zip'); await download.saveAs(zipPath);
  await page.locator('#busyDialog').waitFor({ state: 'hidden' });
  await page.locator('#reviewFile').setInputFiles(zipPath); await settle();
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Review restored'));
  assert.equal(await page.evaluate(() => window.VisualWorkshop.state.noteCount), 1);
  check('ZIP review export and import retain the frame and annotation');
  const rejected = await page.evaluate(() => {
    const review = window.VisualWorkshop.review;
    review.current.config.seed = -1;
    try { window.VisualWorkshop.validateReview(review); return false; } catch { return true; }
  });
  assert(rejected); check('Review input validation rejects invalid settings');
  await page.locator('#captureStrip').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Frame strip captured'), null, { timeout: 90000 });
  assert((await page.evaluate(() => window.VisualWorkshop.state.captureCount)) >= 8);
  check('Eight-frame capture completes');
  await page.screenshot({ path: resolve(out, 'codex-workshop.png'), fullPage: true });
  for (const view of ['iso', 'threequarter', 'topdown', 'brawler']) { await change('view', view); await seek(30); }
  check('All four real game view projections render');
  await change('character', 'wanderer'); await seek(100); const wanderer = await image();
  assert.notEqual(wanderer, first);
  await seek(0); await seek(100); assert.equal(await image(), wanderer);
  check('Wanderer rig renders and replays deterministically');
  await page.screenshot({ path: resolve(out, 'wanderer-workshop.png'), fullPage: true });
  await change('character', 'codex');
  await page.locator('#galleryMode').click(); await settle(); await seek(100);
  const gallery = await image();
  const originalTime = await page.evaluate(() => window.VisualWorkshop.state.frame);
  assert.equal(originalTime, 100);
  await page.locator('#capture').click(); await settle();
  const state = await page.evaluate(() => window.VisualWorkshop.review.captures.at(-1).state);
  assert(state.galleryTime > 1 && state.galleryItem);
  check('Real skill gallery advances actual game simulation');
  await seek(0); await seek(100); assert.equal(await image(), gallery);
  check('Skill gallery replay reproduces the same rendered frame');
  for (const reel of [1, 2, 3]) { await change('reel', reel); await seek(30); }
  check('Monster, boss and pose gallery groups render');
  await change('reel', 0); await seek(100);
  await page.screenshot({ path: resolve(out, 'skill-gallery.png'), fullPage: true });
  await page.locator('#play').click();
  await page.waitForFunction(frame => window.VisualWorkshop.state.frame > frame, 100);
  await page.locator('#play').click(); check('Playback advances and pauses');
  await page.setViewportSize({ width: 390, height: 844 }); await settle();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: resolve(out, 'mobile-workshop.png'), fullPage: true });
  check('390-pixel layout has no horizontal page overflow');
  assert.deepEqual(await page.evaluate(() => [localStorage.getItem('ed:save'), localStorage.getItem('ed:save:codex')]), ['WORKSHOP-TEST-KEEP-WANDERER', 'WORKSHOP-TEST-KEEP-CODEX']);
  assert.deepEqual(errors, []);
  check('No page errors or normal-save writes during the complete workflow');
  success = true;
} catch (error) {
  errors.push(error.stack || String(error));
  console.error(error);
  await page.screenshot({ path: resolve(out, 'failure.png'), fullPage: true }).catch(() => {});
  console.error('UI status:', await page.locator('#status').textContent().catch(() => 'unavailable'));
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'report.json'), JSON.stringify({ success, source: 'examples/emberdeep.html', browser: await browser.version(), checks, errors }, null, 2));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
