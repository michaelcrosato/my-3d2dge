// 3D lab check (docs/LAB-3D.md; the page is examples/lab-3d.html, built from src/lab3d.template.html and src/lab3d/).
//   1. the vendored libraries match their checksums (tools/vendor-3d.mjs --check)
//   2. the lab's own code keeps its rules: three.js through WebGPURenderer and node materials only (no WebGLRenderer,
//      ShaderMaterial, onBeforeCompile, EffectComposer, addons), no WebGPU-only compute or storage buffers, nothing read
//      back from the GPU, and an import map with local paths only
//   3. it serves the repo as Vercel does and opens /lab-3d on WebGL 2 (?backend=webgl) and on WebGPU (headless Chromium
//      runs WebGPU on SwiftShader): no page errors, the backend each claims, and the proof run's state hash the same on
//      both (the renderer never touches gameplay) and the same when run again. Headless Chromium's WebGPU loses its device
//      the moment it presents to a canvas, so on WebGPU the test hands three.js a stand-in canvas context (its frames go
//      to a texture the test reads back for the pictures): the whole WebGPU pipeline runs, only presenting is skipped
//   4. it plays: the hero walks and swings under the keys and knocks crates about
//   5. every camera and look draws a picture (screenshots in check-output/lab3d/, read them)
//   6. the 3D stress test (/stress-3d: the 2D stress test's own game drawn by three.js) on both backends: a fight with every
//      monster kind draws as cards and as puppets without building a GPU pipeline mid-fight (the warm-up's job), the
//      panel's numbers fill in, every camera draws (side, custom, chase, first person, fly, fixed; W walks away from a
//      fixed one), every filter draws (cel, pixel, on everything, the characters, the hall; bloom, FXAA), the hero moves
//   7. the 2D stress test's cameras: a ?cam= link opens its custom view fixed in place, a fixed camera stays put while
//      the hero walks, F frees it, the side scrolling view
// Usage: node tools/lab3d-test.mjs   (run node tools/build.mjs first; CHROMIUM_PATH picks a browser). Exit code 1 on failure.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve('.');
const problems = [], notes = [];
const fail = m => problems.push(m);

/* 1. the vendored files */
try { execFileSync('node', ['tools/vendor-3d.mjs', '--check'], { cwd: root, stdio: 'pipe' }); } catch (e) { fail(String(e.stderr || e.message).trim()); }

/* 2. the rules, read from the lab's own sources (not the vendored libraries) */
const BANNED = [
  [/\bWebGLRenderer\b/, 'WebGLRenderer (use WebGPURenderer: it falls back to WebGL 2 by itself)'],
  [/\b(Raw)?ShaderMaterial\b/, 'ShaderMaterial (write node materials or TSL)'],
  [/\bonBeforeCompile\b/, 'onBeforeCompile (not run by WebGPURenderer)'],
  [/\bEffectComposer\b|three\/examples|three\/addons/, 'addons and EffectComposer (not vendored; post-processing is TSL)'],
  [/\bcompute\s*\(|\bStorageBufferAttribute\b|\bstorage\s*\(|\bcomputeAsync\b/, 'compute shaders or storage buffers (WebGPU only)'],
  [/readRenderTargetPixels|getImageData\s*\(|readPixels\s*\(/, 'reading pixels back (nothing comes back from the GPU into gameplay)']
];
const srcs = ['src/lab3d', 'src/stress3d'].flatMap(d => readdirSync(join(root, d)).filter(f => f.endsWith('.js')).map(f => d + '/' + f));
for (const f of [...srcs, 'src/lab3d.template.html', 'src/stress3d.template.html']) {
  const lines = readFileSync(join(root, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$|\/\*.*?\*\/|^\s*\*.*$/g, '');   // comments may name what is banned
    for (const [re, why] of BANNED) if (re.test(code)) fail(`${f}:${i + 1}: ${why}`);
  });
}
for (const tpl of ['src/lab3d.template.html', 'src/stress3d.template.html']) {
  const map = JSON.parse(readFileSync(join(root, tpl), 'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  for (const [k, v] of Object.entries(map.imports)) {
    if (!v.startsWith('/vendor/')) fail(`${tpl} import map: ${k} -> ${v} is not a vendored file`);
    else if (!existsSync(join(root, v))) fail(`${tpl} import map: ${k} -> ${v} does not exist`);
  }
}

/* 3. the page, served like Vercel (vercel.json's rewrites) */
const rules = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')).rewrites.map(r => ({
  re: new RegExp('^' + r.source.replace(/\./g, '\\.').replace(/:(\w+)\(([^)]+)\)/g, '(?<$1>$2)').replace(/:(\w+)(?![\w>])/g, '(?<$1>[^/]+)') + '$'),
  to: r.destination,
}));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json' };
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
const OUT = join(root, 'check-output/lab3d'); mkdirSync(OUT, { recursive: true });

// WebGPU in a headless browser: Chromium's software adapter (SwiftShader) behind these switches
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface'] });
/** test-only: a WebGPU canvas context that renders into a plain texture (headless Chromium can't present), and a way to
 *  read the last frame back as a PNG (data URL). Installed before the page's scripts run; the lab itself is unchanged */
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
  // a real canvas holds the page back while the GPU is behind; the stand-in doesn't, so each frame waits for the last one's work
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
const results = {};
for (const want of ['webgl', 'webgpu']) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  if (want === 'webgpu') await page.addInitScript(standInCanvas);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const r = await page.goto(SITE + '/lab-3d' + (want === 'webgl' ? '?backend=webgl' : ''));
  if (!r || r.status() !== 200) { fail(`/lab-3d (${want}): status ${r && r.status()}`); await page.close(); continue; }
  try { await page.waitForFunction(() => window.__lab3d && (window.__lab3d.ready || window.__lab3d.error), null, { timeout: 90000 }); }
  catch (e) { fail(`${want}: the lab did not start in 90 s`); await page.close(); continue; }
  const info = await page.evaluate(() => ({ error: __lab3d.error || null, backend: __lab3d.backend, proof: __lab3d.proof && __lab3d.proof.hash, again: __lab3d.ready ? __lab3d.run(600) : null }));
  if (info.error) { fail(`${want}: ${info.error}`); await page.close(); continue; }
  const label = info.backend === 'WebGPU' ? 'webgpu' : 'webgl';
  if (want === 'webgl' && label !== 'webgl') fail('?backend=webgl did not give WebGL 2');
  if (want === 'webgpu' && label !== 'webgpu') { notes.push('WebGPU is not available in this browser: the WebGPU run fell back to WebGL 2'); await page.close(); continue; }
  if (info.again !== info.proof) fail(`${label}: the proof run is not repeatable (${info.proof}, then ${info.again})`);
  results[label] = info.proof;

  /* 5. every camera and look draws (a picture of each; a blank one compresses to almost nothing) */
  const shots = [['iso-card', { cam: 'iso', look: 'card' }], ['iso-puppet', { look: 'puppet' }], ['threequarter-both', { cam: 'threequarter', look: 'both' }],
    ['topdown-card', { cam: 'topdown', look: 'card' }], ['side-puppet', { cam: 'side', look: 'puppet' }], ['brawler-both', { cam: 'brawler', look: 'both' }],
    ['orbit-both-full', { cam: 'orbit', look: 'both', pixels: false }], ['fly-card', { cam: 'fly', look: 'card', pixels: true }], ['fly-puppet', { look: 'puppet' }], ['chase-puppet', { cam: 'chase' }]];
  for (const [name, set] of shots) {
    await page.evaluate(s => { for (const [k, v] of Object.entries(s)) __lab3d.set(k, v); }, set);
    const f0 = await page.evaluate(() => __lab3d.frames);
    await page.waitForFunction(n => __lab3d.frames > n + 20, f0, { timeout: 30000 }).catch(() => fail(`${label} ${name}: frames stopped`));
    let png;
    if (label === 'webgl') png = await page.screenshot({ path: join(OUT, `${label}-${name}.png`) });
    else { png = Buffer.from((await page.evaluate(() => __readFrame(__lab3d.OPT.pixels ? 3 : 1))).split(',')[1], 'base64'); writeFileSync(join(OUT, `${label}-${name}.png`), png); }
    if (png.length < 25000) fail(`${label} ${name}: the picture looks blank (${png.length} bytes)`);
  }

  /* 4. play: walk right and up into the crates, swinging; the hero must move and a crate must too */
  await page.evaluate(() => { __lab3d.set('cam', 'iso'); __lab3d.set('look', 'card'); __lab3d.set('play', true); });
  const before = await page.evaluate(() => __lab3d.state());
  await page.keyboard.down('KeyW'); await page.waitForTimeout(700); await page.keyboard.up('KeyW');
  for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(160); }
  await page.keyboard.down('KeyD'); await page.waitForTimeout(500); await page.keyboard.up('KeyD');
  await page.keyboard.press('Space'); await page.waitForTimeout(400);
  const after = await page.evaluate(() => __lab3d.state());
  const moved = Math.hypot(after.hero.x - before.hero.x, after.hero.z - before.hero.z);
  if (moved < .5) fail(`${label}: the hero did not move under the keys (${moved.toFixed(2)} m)`);
  if (label === 'webgl') await page.screenshot({ path: join(OUT, `${label}-played.png`) });
  else writeFileSync(join(OUT, `${label}-played.png`), Buffer.from((await page.evaluate(() => __readFrame(3))).split(',')[1], 'base64'));
  for (const e of errors) fail(`${label}: ${e}`);
  await page.close();
}
/* 6. the 3D stress test, on both backends */
const stressOk = [];
const picture = async (page, label, name) => {   // a screenshot (WebGL 2) or the stand-in canvas's last frame (WebGPU)
  let png;
  if (label === 'webgl') png = await page.screenshot({ path: join(OUT, `stress-${label}-${name}.png`) });
  else { png = Buffer.from((await page.evaluate(() => __readFrame(3))).split(',')[1], 'base64'); writeFileSync(join(OUT, `stress-${label}-${name}.png`), png); }
  return png;
};
for (const want of ['webgl', 'webgpu']) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  if (want === 'webgpu') await page.addInitScript(standInCanvas);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const r = await page.goto(SITE + '/stress-3d' + (want === 'webgl' ? '?backend=webgl' : ''));
  if (!r || r.status() !== 200) { fail(`/stress-3d (${want}): status ${r && r.status()}`); await page.close(); continue; }
  try { await page.waitForFunction(() => window.__stress3d && (__stress3d.ready || __stress3d.error), null, { timeout: 90000 }); }
  catch (e) { fail(`stress-3d ${want}: it did not start in 90 s`); await page.close(); continue; }
  const st = await page.evaluate(() => ({ error: __stress3d.error || null, backend: __stress3d.backend }));
  if (st.error) { fail(`stress-3d ${want}: ${st.error}`); await page.close(); continue; }
  const label = st.backend === 'WebGPU' ? 'webgpu' : 'webgl';
  if (want === 'webgpu' && label !== 'webgpu') { await page.close(); continue; }
  // hold a key for so much game time (not wall time: on the WebGPU stand-in a frame can take half a second, and the
  // engine caps the game time one frame may step)
  const hold = async (code, seconds) => {
    const t0 = await page.evaluate(() => __game.game.time);
    await page.keyboard.down(code);
    await page.waitForFunction(t => __game.game.time > t, t0 + seconds, { timeout: 60000 }).catch(() => fail(`stress-3d ${label}: the game stopped while ${code} was held`));
    await page.keyboard.up(code);
  };
  const frames = async (what, n = 8) => { const f0 = await page.evaluate(() => __stress3d.stats.frames); await page.waitForFunction(k => __stress3d.stats.frames > k, f0 + n, { timeout: 60000 }).catch(() => fail(`stress-3d ${label} ${what}: frames stopped`)); };
  const pipelines = () => page.evaluate(() => { const p = __stress3d.renderer._pipelines; return p && p.caches ? p.caches.size : null; });
  await frames('start', 3);
  const p0 = await pipelines();
  // a fight: every kind of monster and rig, run forward in the game's own steps, the hero swinging through them and
  // throwing embers, wisps lit
  await page.evaluate(() => { const G = __game, g = G.game; G.S.skin = 'mixed'; G.S.monsterLights = true; G.setMonsters(36, true); for (let i = 0; i < 600; i++) g._step(1 / 120); for (let k = 0; k < 10; k++) { G.hero.combo.press(); g.input.press('KeyE'); for (let i = 0; i < 22; i++) g._step(1 / 120); g.input.release('KeyE'); } });
  for (const look of ['card', 'puppet']) {
    await page.evaluate(l => __stress3d.set('look', l), look);
    await frames(look, 12);
    const drawn = await page.evaluate(() => __stress3d.stats.drawn);
    if (drawn < 10) fail(`stress-3d ${label} ${look}: only ${drawn} characters drawn`);
    const png = await picture(page, label, look);
    if (png.length < 25000) fail(`stress-3d ${label} ${look}: the picture looks blank (${png.length} bytes)`);
  }
  // no stall: the load-time warm-up built every pipeline the fight needs (a new one mid-fight costs tens of ms)
  const p1 = await pipelines();
  if (p0 !== null && p1 !== p0) fail(`stress-3d ${label}: ${p1 - p0} GPU pipelines were built during the fight (the warm-up should have built them)`);
  // the panel's numbers
  const panel = await page.evaluate(() => ['fpsBig', 'mMonsters', 'mRender', 'mGpu'].map(id => document.getElementById(id).textContent));
  if (!/\d/.test(panel[1]) || !/three\.js/.test(panel[3])) fail(`stress-3d ${label}: the panel's numbers did not fill in (${panel.join(' | ')})`);
  // every camera draws the fight: the engine's side and custom views, chase, first person, fly, fixed
  const CAMS = [['side', () => document.querySelector('[data-view=side]').click()], ['custom', () => document.querySelector('[data-view=custom]').click()],
    ['chase', () => __stress3d.setCam('chase')], ['first', () => __stress3d.setCam('first')], ['fly', () => __stress3d.setCam('fly')], ['fixed', () => __game.HOOKS.fix()]];
  for (const [name, fn] of CAMS) {
    await page.evaluate(fn); await frames(name, 6);
    const s = await page.evaluate(() => ({ mode: __stress3d.CAM.mode, drawn: __stress3d.stats.drawn, view: __game.game.view.id }));
    const png = await picture(page, label, 'cam-' + name);
    if (s.drawn < 3 || png.length < 15000) fail(`stress-3d ${label} camera ${name}: ${s.drawn} drawn, picture ${png.length} bytes`);
    if (['side', 'custom'].includes(name) && !s.view.startsWith(name)) fail(`stress-3d ${label}: the ${name} view did not take (${s.view})`);
    if (['chase', 'first', 'fly', 'fixed'].includes(name) && s.mode !== name) fail(`stress-3d ${label}: the ${name} camera did not take (${s.mode})`);
  }
  // in the fixed 3D camera, W walks the hero away from it
  await page.evaluate(() => { __game.setMonsters(0); });
  const away = async () => {
    const before = await page.evaluate(() => [__game.hero.x, __game.hero.y, __stress3d.CAM.pose.yaw]);
    await hold('KeyW', .6);
    const after = await page.evaluate(() => [__game.hero.x, __game.hero.y]);
    return (after[0] - before[0]) * Math.cos(before[2]) + (after[1] - before[1]) * Math.sin(before[2]);
  };
  const fwd = await away();
  if (!(fwd > 4)) fail(`stress-3d ${label}: W did not walk the hero away from the fixed camera (${fwd.toFixed(1)} units)`);
  // filters: each look and where it applies, bloom and FXAA, through PostProcessing (the warm-up runs again for them)
  await page.evaluate(() => { __stress3d.setCam('engine'); document.querySelector('[data-view=iso]').click(); const G = __game; G.setMonsters(30, true); for (let i = 0; i < 300; i++) G.game._step(1 / 120); });
  const FX = [['cel-all', 'cel', 'all', false], ['cel-objects', 'cel', 'objects', false], ['pixel-env', 'pixel', 'env', false], ['pixel-all-bloom-fxaa', 'pixel', 'all', true], ['clean', 'clean', 'all', false]];
  for (const [name, look, to, extras] of FX) {
    await page.evaluate(([l, t, x]) => {
      document.querySelector(`[data-fx=${l}]`).click(); const s = document.getElementById('fxApply'); s.value = t; s.dispatchEvent(new Event('change'));
      for (const id of ['fxBloom', 'fxFxaa']) { const c = document.getElementById(id); c.checked = x; c.dispatchEvent(new Event('change')); }
    }, [look, to, extras]);
    await frames('filter ' + name, 6);
    const png = await picture(page, label, 'fx-' + name);
    if (png.length < 25000) fail(`stress-3d ${label} filter ${name}: the picture looks blank (${png.length} bytes)`);
  }
  const report = await page.evaluate(() => __game.HOOKS.renderer());
  if (!/no filter/.test(report)) fail(`stress-3d ${label}: the report's renderer line is off (${report})`);
  // the hero under the keys (the 2D page's own controls, the engine camera)
  await page.evaluate(() => __game.setMonsters(0));
  const h0 = await page.evaluate(() => [__game.hero.x, __game.hero.y]);
  await hold('KeyD', .6);
  const h1 = await page.evaluate(() => [__game.hero.x, __game.hero.y]);
  if (Math.hypot(h1[0] - h0[0], h1[1] - h0[1]) < 4) fail(`stress-3d ${label}: the hero did not move under the keys`);
  for (const e of errors) fail(`stress-3d ${label}: ${e}`);
  stressOk.push(label);
  await page.close();
}
/* 7. the 2D stress test's cameras (shared with the 3D one): side scrolling, custom, fixed, and its link */
let camOk = false;
{
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  await page.addInitScript(standInCanvas);   // (the 2D page's GPU lighting is WebGPU too: the same headless stand-in)
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(SITE + '/stress-test?cam=300,20,1.25,8,1.2,520,410');
  await page.waitForFunction(() => window.__game && __game.game.stats.renderMs > 0, null, { timeout: 60000 }).catch(() => fail('stress-test: it did not start'));
  const s = await page.evaluate(() => ({ view: __game.game.view, fix: __game.FIX, zoom: __game.game.zoom }));
  if (!s.view.id.startsWith('custom') || s.view.yawDeg !== 300 || s.view.pitchDeg !== 20 || !s.fix.on || s.fix.x !== 520 || s.zoom !== 1.25) fail(`stress-test: the ?cam= link did not open its camera (${JSON.stringify({ id: s.view.id, yaw: s.view.yawDeg, pitch: s.view.pitchDeg, fix: s.fix, zoom: s.zoom })})`);
  await page.screenshot({ path: join(OUT, 'stress2d-custom-fixed.png') });
  // fixed: the camera stays while the hero walks; freed, it follows him
  const c0 = await page.evaluate(() => [__game.game.cam.x, __game.game.cam.y]);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(1000); await page.keyboard.up('KeyD');
  const c1 = await page.evaluate(() => [__game.game.cam.x, __game.game.cam.y]);
  if (Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) > 1) fail('stress-test: a fixed camera moved with the hero');
  await page.keyboard.press('KeyF');
  if (await page.evaluate(() => __game.FIX.on)) fail('stress-test: F did not free the camera');
  await page.evaluate(() => document.querySelector('[data-view=side]').click());
  await page.waitForTimeout(400);
  if (await page.evaluate(() => __game.game.view.id) !== 'side') fail('stress-test: the side scrolling view did not take');
  await page.screenshot({ path: join(OUT, 'stress2d-side.png') });
  for (const e of errors) fail(`stress-test: ${e}`);
  camOk = !errors.length;
  await page.close();
}
await browser.close();
server.close();
if (results.webgl && results.webgpu && results.webgl !== results.webgpu) fail(`the proof run differs: WebGL 2 ${results.webgl}, WebGPU ${results.webgpu}`);
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ results, notes, problems }, null, 2));
if (problems.length) { console.error('lab 3D check FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`lab 3D check passed: vendored files verified, rules kept in ${srcs.length} files, proof run ${Object.entries(results).map(([k, v]) => k + ' ' + v).join(' = ')}, it plays, ${Object.keys(results).length * 11} pictures; the 3D stress test fights in both looks, every camera and filter on ${stressOk.join(' and ')} with no pipeline built mid-fight; the 2D one's cameras ${camOk ? 'work' : 'FAILED'}; pictures in check-output/lab3d/${notes.length ? ' (' + notes.join('; ') + ')' : ''}`);
