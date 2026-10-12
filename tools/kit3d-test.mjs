// The 3D engine's check (engine/my-3d2dge-3d.js) and its kits (src/starter3d/, built into dist/my-3d2dge-3d.html and
// dist/kits/my-3d2dge-3d-<slice>.html).
//   1. the rules, read from the 3D engine's and the kits' own sources (not the vendored libraries): three.js through
//      WebGPURenderer and node materials only (no WebGLRenderer, ShaderMaterial, onBeforeCompile, EffectComposer,
//      addons), no WebGPU-only compute or storage buffers, nothing read back from the GPU; the import map points at
//      vendored files that exist
//   2. the manual's quick start (the ```js quickstart block in the engine's header) runs as the manual hosts it: no
//      errors, a hero that walks and jumps, gems to take
//   3. every 3D kit, served as Vercel serves it (/kits/3d-<slice>, /3d), on WebGL 2 and on WebGPU (headless Chromium runs
//      WebGPU on SwiftShader, through a stand-in canvas as tools/stress-world-test.mjs does): no page errors, the title
//      draws, each slice starts; each slice's proof run gives the same hash twice and on both backends (the game never
//      reads the renderer); a minute of scripted play builds no GPU pipeline mid-game (the warm-up's job) and moves
//      the hero; pictures in check-output/kit3d/ (read them)
//   4. on an emulated phone held upright (390 x 844 at 3x, touch): a kit starts, the 3D picture lies exactly under the
//      game's, the touch buttons are there
// Usage: node tools/kit3d-test.mjs   (run node tools/build.mjs first; CHROMIUM_PATH picks a browser). Exit code 1 on failure.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';

const root = resolve('.');
const problems = [], notes = [];
const fail = m => problems.push(m);
const read = f => readFileSync(join(root, f), 'utf8');

/* 1. the rules */
const BANNED = [
  [/\bWebGLRenderer\b/, 'WebGLRenderer (use WebGPURenderer: it falls back to WebGL 2 by itself)'],
  [/\b(Raw)?ShaderMaterial\b/, 'ShaderMaterial (write node materials or TSL)'],
  [/\bonBeforeCompile\b/, 'onBeforeCompile (not run by WebGPURenderer)'],
  [/\bEffectComposer\b|three\/examples|three\/addons/, 'addons and EffectComposer (not vendored; post-processing is TSL)'],
  [/\bcompute\s*\(|\bStorageBufferAttribute\b|\bstorage\s*\(|\bcomputeAsync\b/, 'compute shaders or storage buffers (WebGPU only)'],
  [/readRenderTargetPixels|readPixels\s*\(/, 'reading pixels back (nothing comes back from the GPU into gameplay)']
];
const SLICES = readdirSync(join(root, 'src/starter3d')).filter(f => /^[1-8]\d-.+\.js$/.test(f)).map(f => f.replace(/^\d+-|\.js$/g, ''));
const SOURCES = ['engine/my-3d2dge-3d.js', 'src/starter3d.template.html', ...readdirSync(join(root, 'src/starter3d')).filter(f => f.endsWith('.js')).map(f => 'src/starter3d/' + f)];
const engine3d = read('engine/my-3d2dge-3d.js'), manual = engine3d.slice(0, engine3d.indexOf('*/'));
for (const f of SOURCES) {
  const text = f === 'engine/my-3d2dge-3d.js' ? engine3d.slice(manual.length) : read(f);   // (the manual names what is banned)
  text.split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$|\/\*.*?\*\/|^\s*\*.*$/g, '');
    for (const [re, why] of BANNED) if (re.test(code)) fail(`${f}:${i + 1}: ${why}`);
  });
}
{
  const map = JSON.parse(read('src/starter3d.template.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  for (const [k, v] of Object.entries(map.imports)) if (!v.startsWith('/vendor/') || !existsSync(join(root, v))) fail(`src/starter3d.template.html import map: ${k} -> ${v} is not a vendored file that exists`);
}

/* the site, served as Vercel serves it (vercel.json's rewrites), and the quick start's page at /check/quickstart.html */
const rules = JSON.parse(read('vercel.json')).rewrites.map(r => ({
  re: new RegExp('^' + r.source.split(/(:\w+\([^)]+\))/).map((part, i) => i % 2 ? part.replace(/:(\w+)\(([^)]+)\)/, '(?<$1>$2)') : part.replace(/\./g, '\\.').replace(/:(\w+)(?![\w>])/g, '(?<$1>[^/]+)')).join('') + '$'),
  to: r.destination
}));
const code = (manual.split('```js quickstart\n')[1] || '').split('```')[0], host = manual.split('## Host it')[1] || '';
if (!code) fail('the manual has no ```js quickstart block');
const importmap = (host.match(/<script type="importmap">[\s\S]*?<\/script>/) || [''])[0];
const QUICK = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}</style>${importmap}</head><body>
<div id="stage" style="position:relative;width:100%;height:100%;overflow:hidden"><canvas id="view"></canvas><canvas id="screen" style="position:absolute;inset:0;width:100%;height:100%"></canvas></div>
<script src="/dist/my-3d2dge.js"></script><script type="module" src="/dist/my-3d2dge-3d.js"></script>
<script type="module">${code}
window.__quick = { game, get world() { return world; }, get hero() { return hero; }, get gems() { return gems; } };</script></body></html>`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/check/quickstart.html') { res.writeHead(200, { 'content-type': TYPES['.html'] }); res.end(QUICK); return; }
  for (const r of rules) { const m = path.match(r.re); if (m) { path = r.to.replace(/:(\w+)/g, (_, k) => m.groups[k]); break; } }
  const file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:' + server.address().port;
const OUT = join(root, 'check-output/kit3d'); mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface'] });
/** test-only (as tools/stress-world-test.mjs): a WebGPU canvas context that renders into a plain texture (headless
 *  Chromium can't present), and a way to read the last frame back as a PNG. Installed before the page's scripts run */
function standInCanvas() {
  const real = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    if (type !== 'webgpu') return real.call(this, type, opts);
    const canvas = this; let cfg = null, tex = null;
    return { canvas, configure(c) { cfg = c; tex = null; }, unconfigure() { cfg = null; tex = null; }, getConfiguration() { return cfg; },
      getCurrentTexture() {
        if (!tex || tex.width !== canvas.width || tex.height !== canvas.height) {
          tex = cfg.device.createTexture({ size: [canvas.width, canvas.height], format: cfg.format, usage: (cfg.usage || 0) | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
          window.__frameTex = tex; window.__frameDevice = cfg.device; window.__frameFormat = cfg.format;
        }
        return tex;
      } };
  };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => { const d = window.__frameDevice; if (d) d.queue.onSubmittedWorkDone().then(() => raf(cb)); else raf(cb); return 0; };
  window.__readFrame = async scale => {
    const t = window.__frameTex, d = window.__frameDevice, w = t.width, h = t.height, bpr = Math.ceil(w * 4 / 256) * 256;
    const buf = d.createBuffer({ size: bpr * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }), enc = d.createCommandEncoder();
    enc.copyTextureToBuffer({ texture: t }, { buffer: buf, bytesPerRow: bpr }, [w, h]); d.queue.submit([enc.finish()]);
    await buf.mapAsync(GPUMapMode.READ); const src = new Uint8Array(buf.getMappedRange()), img = new ImageData(w, h), bgra = /^bgra/.test(window.__frameFormat);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * bpr + x * 4, o = (y * w + x) * 4; img.data[o] = src[i + (bgra ? 2 : 0)]; img.data[o + 1] = src[i + 1]; img.data[o + 2] = src[i + (bgra ? 0 : 2)]; img.data[o + 3] = 255; }
    buf.unmap(); buf.destroy();
    const a = document.createElement('canvas'); a.width = w; a.height = h; a.getContext('2d').putImageData(img, 0, 0);
    const b = document.createElement('canvas'); b.width = w * scale; b.height = h * scale; const g = b.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(a, 0, 0, b.width, b.height);
    return b.toDataURL('image/png');
  };
}
const watch = page => { const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); }); return errors; };
let pictures = 0;

/* 2. the manual's quick start */
{
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } }), errors = watch(page);
  await page.goto(SITE + '/check/quickstart.html?backend=webgl');
  try {
    await page.waitForFunction(() => window.__quick && __quick.world && __quick.world.stats.frames > 2, null, { timeout: 90000 });
    const r = await page.evaluate(() => {
      const g = __quick.game; g.stop(); const h = __quick.hero, x0 = h.x, y0 = h.y;
      g.input.hold('right', true); g.advance(.8); g.input.hold('right', false);
      g.input.tap('jump'); let top = h.z; for (let i = 0; i < 40; i++) { g.advance(1 / 120); top = Math.max(top, h.z); }
      return { moved: Math.hypot(h.x - x0, h.y - y0), top, gems: __quick.gems.length, things: __quick.world.things.length };
    });
    if (r.moved < 30) fail(`quick start: the hero moved only ${r.moved.toFixed(1)} units in 0.8 s`);
    if (r.top < 20) fail(`quick start: the hero's jump reached only ${r.top.toFixed(1)} units`);
    if (!r.gems || r.gems !== r.things) fail(`quick start: ${r.gems} gems, ${r.things} things`);
    await page.evaluate(() => __quick.game.start()); await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, 'quickstart.png') }); pictures++;
  } catch (e) { fail('quick start: ' + e.message.split('\n')[0]); }
  for (const e of errors) fail('quick start: ' + e);
  await page.close();
}

/* 3. the kits on both backends */
const hashes = {};
const pages = [['3d', '/3d'], ...SLICES.map(s => ['3d-' + s, '/kits/3d-' + s])];
for (const want of ['webgl', 'webgpu']) for (const [name, path] of pages) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  if (want === 'webgpu') await page.addInitScript(standInCanvas);
  const errors = watch(page), label = name + ' ' + want;
  const r = await page.goto(SITE + path + (want === 'webgl' ? '?backend=webgl' : ''));
  if (!r || r.status() !== 200) { fail(`${path}: status ${r && r.status()}`); await page.close(); continue; }
  try { await page.waitForFunction(() => window.__game && __game.game.sceneName === 'title' && My3D2dge.World3D.worlds.some(w => w.stats.frames > 2), null, { timeout: 120000 }); }
  catch (e) { fail(`${label}: the title did not draw in 120 s ${errors.slice(0, 2).join(' | ')}`); await page.close(); continue; }
  const backend = await page.evaluate(() => My3D2dge.World3D.backend);
  if (want === 'webgl' && backend !== 'WebGL 2') fail(`${label}: ?backend=webgl gave ${backend}`);
  if (want === 'webgpu' && backend !== 'WebGPU') { notes.push('WebGPU is not available in this browser: the WebGPU runs fell back to WebGL 2'); await page.close(); continue; }
  const picture = async shot => {
    let png;
    if (want === 'webgl') png = await page.screenshot();
    else { const d = await page.evaluate(() => window.__readFrame ? __readFrame(2) : null).catch(() => null); png = d ? Buffer.from(d.split(',')[1], 'base64') : await page.screenshot(); }
    writeFileSync(join(OUT, `${name}-${want}-${shot}.png`), png); pictures++;
  };
  await picture('title');
  const slices = await page.evaluate(() => Object.keys(__game.scenes).filter(k => !['title', 'over'].includes(k)));
  for (const s of slices) {
    await page.evaluate(id => __game.game.go(id, null, { fade: 0 }), s);
    await page.waitForFunction(id => __game.game.sceneName === id && __game.scenes[id].world.stats.frames > 2, s, { timeout: 60000 }).catch(() => fail(`${label}: ${s} did not start`));
    // the proof: twice, the same hash (and the same on both backends, below)
    const proof = await page.evaluate(id => [__game.scenes[id].run(600), __game.scenes[id].run(600)], s);
    if (proof[0] !== proof[1]) fail(`${label}: ${s}'s proof run is not repeatable (${proof.join(', then ')})`);
    (hashes[s] ||= {})[want] = proof[0];
    // play: start the slice afresh, hold the stick and press its buttons for a while; no GPU pipeline is built mid-game
    const play = await page.evaluate(async id => {
      const g = __game.game, S = __game.scenes[id], R = My3D2dge.World3D.renderer, pipes = () => { const p = R._pipelines; return p && p.caches ? p.caches.size : null; };
      g.go(id, null, { fade: 0 }); await new Promise(r => setTimeout(r, 400));
      const h0 = S.hero, x0 = h0.x, y0 = h0.y, p0 = pipes(), f0 = S.world.stats.frames;
      const keys = id === 'action' ? ['attack', 'dash', 'jump', 'skill'] : ['jump', 'dash'];
      g.input.hold('up', true);
      for (let i = 0; i < 24; i++) { g.input.tap(keys[i % keys.length]); if (i === 8) { g.input.hold('up', false); g.input.hold('left', true); } await new Promise(r => setTimeout(r, 120)); }
      g.input.hold('left', false);
      return { moved: Math.hypot(S.hero.x - x0, S.hero.y - y0), p0, p1: pipes(), frames: S.world.stats.frames - f0, calls: S.world.stats.calls };
    }, s);
    if (play.frames < 5) fail(`${label}: ${s} drew only ${play.frames} frames in about 3 s of play`);
    if (play.moved < 20) fail(`${label}: ${s}: the hero moved only ${play.moved.toFixed(1)} units under the held stick`);
    if (play.p0 !== null && play.p1 > play.p0) fail(`${label}: ${s}: ${play.p1 - play.p0} GPU pipeline(s) built mid-game (the warm-up should have built them)`);
    await picture(s);
  }
  for (const e of errors) fail(`${label}: ${e}`);
  await page.close();
}
for (const [s, h] of Object.entries(hashes)) if (h.webgl && h.webgpu && h.webgl !== h.webgpu) fail(`${s}: the proof's hash differs between WebGL 2 (${h.webgl}) and WebGPU (${h.webgpu})`);

/* 4. an upright phone */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), errors = watch(page);
  await page.goto(SITE + '/kits/3d-' + SLICES[0] + '?backend=webgl#' + SLICES[0]);
  try {
    await page.waitForFunction(id => window.__game && __game.game.sceneName === id && __game.scenes[id].world.stats.frames > 2, SLICES[0], { timeout: 120000 });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const v = document.getElementById('view').getBoundingClientRect(), sc = __game.game.screen, s = document.getElementById('screen').getBoundingClientRect();
      const under = Math.abs(v.width - sc.W * sc.S / sc.dpr) < 1.5 && Math.abs(v.height - sc.H * sc.S / sc.dpr) < 1.5 && v.width >= s.width - 2 && v.height >= s.height - 2;
      return { under, buttons: document.querySelectorAll('[data-act]').length, w: v.width, h: v.height, sw: s.width, sh: s.height };
    });
    if (!r.under) fail(`phone: the 3D picture (${r.w} x ${r.h}) is not laid exactly under the game's (${r.sw} x ${r.sh})`);
    if (r.buttons < 2) fail(`phone: ${r.buttons} touch buttons`);
    await page.screenshot({ path: join(OUT, 'phone.png') }); pictures++;
  } catch (e) { fail('phone: ' + e.message.split('\n')[0]); }
  for (const e of errors) fail('phone: ' + e);
  await page.close();
}

await browser.close();
server.close();
for (const n of [...new Set(notes)]) console.log('note: ' + n);
if (problems.length) { console.error('3D kits check FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`3D kits check passed: the rules hold in ${SOURCES.length} sources; the manual's quick start runs; ${pages.length} pages on WebGL 2 and WebGPU, ${SLICES.length} slices (${Object.entries(hashes).map(([s, h]) => s + ' ' + (h.webgl || h.webgpu)).join(', ')}: the same hash on both backends and run again, no pipeline built mid-game); the phone; ${pictures} pictures in check-output/kit3d/`);
