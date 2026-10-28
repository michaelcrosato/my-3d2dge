// The views suite (docs/HANDOFF-GENRES.md, M6a): the mode7 and road modules' views on tools/fixtures/views.html
// (?view=mode7: a camera due north, the fast floor; turn: around a track, any heading, the sky turning; split: two
// cameras in a split screen; road: curves, hills, a tunnel, scenery and cars), filmed into check-output/views/: each
// strip twice from the same seed, the same pixels, with no errors; Mode 7's two floors (a row stretched due north, a
// pixel sampled at any heading) drawing the same floor; a split screen's two cameras each in its own half; and each view
// drawing a frame within the phone test's budget on an emulated phone (30 ms, the median of 90). The contract tests
// (tools/contract-test.mjs) hold the projections in numbers; the stress test's depth view (S) is drawn by mode7, and
// tools/stress-test.mjs plays it.
// Usage: node tools/views-test.mjs [view ...]   (run node tools/build.mjs first; exit code 1 on a failure; CHROMIUM_PATH
// picks a browser)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), out = join(root, 'check-output/views'), PAGE = join(root, 'tools/fixtures/views.html');
mkdirSync(out, { recursive: true });
const failures = []; let passed = 0;
const check = (name, ok, detail = '') => { if (ok) { passed++; console.log('  ok   ' + name + (detail ? ': ' + detail : '')); } else { failures.push(name + (detail ? ': ' + detail : '')); console.log('  FAIL ' + name + (detail ? ': ' + detail : '')); } };
const t0 = Date.now(), only = process.argv.slice(2), VIEWS = ['mode7', 'turn', 'split', 'road'].filter(v => !only.length || only.includes(v));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// 1. each view filmed twice from one seed: the same pixels
for (const v of VIEWS) {
  const q = '?view=' + v, r = spawnSync(process.execPath, [join(root, 'tools/filmstrip.mjs'), PAGE + q, '--steps', 'wait:200 | rec:12:20', '--compare', PAGE + q, '--expect-same', '--seed', '1', '--cols', '6', '--scale', '1', '--out', join(out, v + '.png')], { encoding: 'utf8' });
  const text = (r.stdout + r.stderr).trim();
  check(`${v}: filmed twice, the same pixels`, r.status === 0 && /identical, pixel for pixel/.test(text), text.split('\n').slice(-1)[0]);
}
// 2. what each view draws, in a page of its own
const open = async (v, ctx) => {
  const page = await (ctx || browser).newPage(ctx ? undefined : { viewport: { width: 640, height: 360 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(PAGE).href + '?view=' + v); await page.waitForFunction(() => window.__fx); return [page, errors];
};
if (VIEWS.includes('mode7')) {   // the fast floor (rows due north) and the sampled one (any heading) draw the same floor
  const [page, errors] = await open('mode7');
  const r = await page.evaluate(() => {
    const { m7 } = window.__fx, E = My3D2dge, W = 320, H = 180, draw = angle => {
      const c = E.mkCanvas(W, H), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      m7.begin({ W, H }, { x: 512, y: 900, h: 40, angle, pitch: 12, fov: 70 }); m7.drawFloor(g, { x: 0, y: 0, w: W, h: H });
      return g.getImageData(0, 0, W, H).data;
    };
    const a = draw(-Math.PI / 2), b = draw(-Math.PI / 2 + 1e-9);   // (a hair off due north: the sampled floor)
    let diff = 0, n = 0; for (let i = 0; i < a.length; i += 4) { if (a[i + 3] === 0) continue; n++; if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) diff++; }
    return { diff, n, horizon: m7.horizon };
  });
  check('mode7: the fast floor and the sampled floor draw the same floor (under 3% of its pixels differ)', r.diff < r.n * .03 && r.n > 10000 && !errors.length, `${r.diff} of ${r.n}${errors.length ? '; ' + errors.join(' | ') : ''}`);
  await page.close();
}
if (VIEWS.includes('split')) {   // a split screen: each half its own camera
  const [page, errors] = await open('split');
  const r = await page.evaluate(() => { const { game, cams } = window.__fx; game.advance(3); const v = game.viewports; return { n: v.length, w: v.map(x => x.w), cams: cams.map(c => [Math.round(c.x), Math.round(c.y)]), errors: game.errors.length }; });
  const sharp = await page.evaluate(() => { const c = document.getElementById('screen'), g = c.getContext('2d'), W = c.width, H = c.height, L = g.getImageData(0, 0, W / 2 | 0, H).data, R = g.getImageData(W / 2 | 0, 0, W / 2 | 0, H).data; let d = 0; for (let i = 0; i < L.length; i += 16) if (Math.abs(L[i] - R[i]) > 20) d++; return d / (L.length / 16); });
  check('split: two viewports, each drawn from its own camera (the halves differ)', r.n === 2 && r.cams[0].join() !== r.cams[1].join() && sharp > .05 && !errors.length && !r.errors, JSON.stringify(r) + ' differ ' + (sharp * 100).toFixed(0) + '%');
  await page.close();
}
// 3. a frame within the phone test's budget on an emulated phone, held upright: the median of 90 (update and draw)
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
for (const v of VIEWS) {
  const [page, errors] = await open(v, phone);
  const ms = await page.evaluate(() => new Promise(res => { const g = window.__fx.game, d = []; let n = 0; const tick = () => { d.push(g.stats.renderMs + g.stats.updateMs); if (++n < 90) requestAnimationFrame(tick); else res(d.sort((a, b) => a - b)[45]); }; requestAnimationFrame(tick); }));
  check(`${v}: on a phone, a frame updates and draws within 30 ms (median)`, ms < 30 && !errors.length, `${ms.toFixed(1)} ms${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
  await page.close();
}
await browser.close();
console.log(failures.length ? `\nviews test FAILED (${failures.length}):\n  ${failures.join('\n  ')}` : `\nviews test passed (${passed} checks, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failures.length ? 1 : 0);
