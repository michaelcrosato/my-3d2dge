// The motion suite (the genre plan's M1, v0.62.0): what the presentation sections draw, filmed on tools/fixtures/motion.html
// (two scenes, the full engine from dist/my-3d2dge.js) into check-output/motion/:
//   transitions  each of game.go's fades (wipe, iris, mosaic, swirl, dissolve, white) filmed going from one scene to the
//                other beside the plain fade through black: frames differ; with reduce motion each is that plain fade,
//                pixel for pixel; each ends in the new scene, with no errors
//   weather      each kind filmed (rain, snow, leaves, ash, sand; ground, flat and side views) twice from the same seed:
//                the same pixels; its drops show (the picture differs from clear skies); it never draws on Math.random
//   the filter   the screen filter darkens the canvas's rows as the picture is presented, leaves the game's buffer as it
//                was, and is off under a test harness (navigator.webdriver)
// The contract tests (tools/contract-test.mjs) hold the rest of M1: tweens, scripts, paths, frames, turns, wrap-around,
// sequences and the camera.
// Usage: node tools/motion-test.mjs   (exit code 1 on a failure; CHROMIUM_PATH picks a browser)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), out = join(root, 'check-output/motion'), PAGE = join(root, 'tools/fixtures/motion.html');
mkdirSync(out, { recursive: true });
const failures = []; let passed = 0;
const check = (name, ok, detail = '') => { if (ok) { passed++; console.log('  ok   ' + name); } else { failures.push(name + (detail ? ': ' + detail : '')); console.log('  FAIL ' + name + (detail ? ': ' + detail : '')); } };
const t0 = Date.now();
// film the page with query a beside query b (the same steps, seed 1): { same, text }
const film = (a, b, steps, name) => {
  const r = spawnSync(process.execPath, [join(root, 'tools/filmstrip.mjs'), PAGE + '?' + a, '--steps', steps, '--compare', PAGE + '?' + b, '--seed', '1', '--cols', '6', '--scale', '1', '--out', join(out, name + '.png')], { encoding: 'utf8' });
  const text = (r.stdout + r.stderr).trim();
  return { same: /identical, pixel for pixel/.test(text), differ: /frames differ/.test(text), errors: /errors:/.test(text) || r.status === 2, text: text.split('\n').slice(-2).join(' | ') };
};

console.log('transitions');
const GO = 'wait:400 | rec:12:3 | eval:__go()';
for (const f of ['wipe', 'iris', 'mosaic', 'swirl', 'dissolve', 'white']) {
  const r = film('fade=' + f, 'fade=black', GO, 'fade-' + f);
  check(`${f}: filmed beside the fade through black, it draws its own frames`, r.differ && !r.errors, r.text);
  if (f === 'white') continue;
  const q = film('fade=' + f + '&reduce=1', 'fade=black&reduce=1', GO, 'fade-' + f + '-reduced');
  check(`${f}: with reduce motion, the plain fade, pixel for pixel`, q.same && !q.errors, q.text);
}

console.log('weather');
for (const [kind, view] of [['rain', 'iso'], ['snow', 'threequarter'], ['leaves', 'threequarter'], ['ash', 'side'], ['sand', 'topdown'], ['rain', 'side']]) {
  const q = `weather=${kind}&view=${view}&wind=.4`, r = film(q, q, 'wait:900 | rec:6:6', `weather-${kind}-${view}`);
  check(`${kind} (${view}): filmed twice from the same seed, the same pixels`, r.same && !r.errors, r.text);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const open = async (query, o = {}) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } }), errors = [];
  if (o.real) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(pathToFileURL(PAGE).href + '?' + query);
  await page.waitForFunction(() => window.__game && window.__game.game.sceneName, null, { timeout: 20000 });
  return { page, errors };
};
// the game's buffer after it has stood still and drawn: its pixels, and the canvas's, summed per row
const still = page => page.evaluate(() => { const g = My3D2dge.current; g.stop(); g.advance(1, { draw: true }); const b = g.screen.buf, d = b.getContext('2d').getImageData(0, 0, b.width, b.height).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) >>> 0; return h; });

{
  for (const f of ['wipe', 'iris', 'mosaic', 'swirl', 'dissolve', 'white']) {
    const { page, errors } = await open('fade=' + f);
    await page.evaluate(() => { const g = My3D2dge.current; g.stop(); window.__go(); for (let i = 0; i < 120; i++) g.advance(1 / 60, { draw: true }); });
    const scene = await page.evaluate(() => My3D2dge.current.sceneName);
    check(`${f}: it ends in the new scene, with no errors`, scene === 'b' && !errors.length, scene + ' ' + errors.join(' | '));
    await page.close();
  }
}
{
  for (const kind of ['rain', 'snow', 'leaves', 'ash', 'sand']) {
    const clear = await open('view=threequarter&hero=0'), wet = await open(`weather=${kind}&view=threequarter&hero=0`);   // (no rig: its blink draws on Math.random)
    const calls = await wet.page.evaluate(() => { const g = My3D2dge.current, r = Math.random; let n = 0; Math.random = () => { n++; return r(); }; g.stop(); g.advance(2, { draw: true }); Math.random = r; return n; });
    const [a, b] = [await still(clear.page), await still(wet.page)];
    check(`${kind}: its drops show (the picture differs from clear skies), and it never calls Math.random`, a !== b && calls === 0 && !wet.errors.length, `calls ${calls} ${wet.errors.join(' | ')}`);
    await clear.page.close(); await wet.page.close();
  }
}
{
  // one frame drawn twice, clean and filtered (the same state: the loop stopped), then under a harness
  const measure = page => page.evaluate(() => {
    const g = My3D2dge.current; g.advance(0, { draw: true });
    const c = g.screen.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, S = g.screen.S, y0 = g.screen.OY + Math.floor(g.screen.H / 2) * S, x = Math.floor(c.width / 2);
    const lum = y => { const k = (y * c.width + x) * 4; return d[k] + d[k + 1] + d[k + 2]; };
    let dark = 0; for (let i = 0; i < 20; i++) { const top = y0 + i * S - Math.round(g.screen.fy * S); if (lum(top + S - 1) < lum(top) - 10) dark++; }
    const b = g.screen.buf, bd = b.getContext('2d').getImageData(0, 0, b.width, b.height).data; let h = 0; for (let i = 0; i < bd.length; i += 7) h = (h * 31 + bd[i]) >>> 0;
    return { dark, buf: h };
  });
  const real = await open('view=topdown', { real: true });
  await real.page.evaluate(() => My3D2dge.current.stop());
  const clean = await measure(real.page);
  await real.page.evaluate(() => My3D2dge.current.settings.set('filter', 'scanlines'));
  const lines = await measure(real.page);
  await real.page.close();
  const h = await open('view=topdown&filter=crt'); await h.page.evaluate(() => My3D2dge.current.stop()); const harness = await measure(h.page); await h.page.close();
  check(`the filter: scanlines darken the canvas's rows as it is presented (${lines.dark} of 20 rows), the buffer as it was`, lines.dark >= 15 && clean.dark <= 2 && lines.buf === clean.buf, JSON.stringify({ clean, lines }));
  check('the filter: off under a test harness (navigator.webdriver)', harness.dark <= 2, JSON.stringify(harness));
}
await browser.close();

console.log(`\n${failures.length ? failures.length + ' FAILED' : 'all ' + passed + ' passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s (strips in check-output/motion/)`);
process.exit(failures.length ? 1 : 0);
