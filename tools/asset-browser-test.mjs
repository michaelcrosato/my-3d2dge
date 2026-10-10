// Asset Studio: a legacy animation project, real scene edits and pixels, shared history, clip reuse, and offline export.
// Run npm run build first. CHROMIUM_PATH selects Chromium. This focused suite writes its images under check-output/assets.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createStudioServer } from './animation-studio.mjs';
import { loadStudioResources } from './studio-service.mjs';

const out = resolve('check-output/assets');
await mkdir(out, { recursive: true });
const work = await mkdtemp(join(out, 'browser-'));
const checks = [], errors = [], timings = {};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let app, mcp;
const digest = value => createHash('sha256').update(value).digest('hex');
const frames = page => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
const snapshot = page => page.evaluate(() => __assetStudio.getSnapshot());
const assets = state => state.project.assets;
const activeLevel = state => assets(state).levels[assets(state).selectedLevel];
const pixels = page => page.evaluate(() => document.getElementById('screen').toDataURL());
async function check(name, run) { await run(); checks.push(name); console.log('ok', name); }
function inspect(page, label) {
  page.on('pageerror', error => errors.push(label + ': ' + error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !/Failed to load resource: the server responded with a status of (400|409)/.test(message.text())) errors.push(label + ': ' + message.text());
    if (message.type() === 'warning' && message.text().startsWith('my-3D2dge:')) errors.push(label + ': ' + message.text());
  });
}
async function open(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => window.__animationStudio?.ready && window.__assetStudio && __animationStudio.game.fps > 0, null, { timeout: 15000 });
}
async function request(path, method = 'GET', body, status = 200) {
  const response = await fetch(app.url + path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json();
  assert.equal(response.status, status, path + ': ' + JSON.stringify(value));
  return value;
}
async function edit(actions, options = {}) {
  const state = await request('/api/state');
  return request('/api/scene/edit', 'POST', { expectedRevision: state.revision, actions, ...options });
}
async function synced(page, revision) {
  await page.waitForFunction(revision => __assetStudio.getSnapshot().revision === revision, revision);
  await frames(page);
}
async function download(page, id) {
  const pending = page.waitForEvent('download'); await page.locator(id).click();
  const file = await pending;
  return { name: file.suggestedFilename(), text: await readFile(await file.path(), 'utf8') };
}
async function field(page, id, value) {
  const input = page.locator('#' + id);
  if (await input.getAttribute('type') === 'color') await input.evaluate((element, value) => {
    element.value = value; element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  else await input.fill(value);
}
function startMCP(url) {
  const child = spawn(process.execPath, [resolve('tools/animation-mcp.mjs'), '--url', url], { stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map(); let seq = 0, stderr = '';
  child.stderr.on('data', data => { stderr += data; });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    let value;
    try { value = JSON.parse(line); } catch { errors.push('MCP output is not JSON: ' + line.slice(0, 120)); return; }
    const waiting = pending.get(value.id); if (!waiting) return;
    pending.delete(value.id); clearTimeout(waiting.timer);
    if (value.error) waiting.reject(new Error(JSON.stringify(value.error))); else waiting.resolve(value.result);
  });
  child.on('exit', code => {
    for (const waiting of pending.values()) { clearTimeout(waiting.timer); waiting.reject(new Error('MCP exited ' + code + ': ' + stderr)); }
    pending.clear();
  });
  return {
    call(method, params) {
      return new Promise((resolve, reject) => {
        const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(new Error('MCP timeout for ' + method + ': ' + stderr)); }, 30000);
        pending.set(id, { resolve, reject, timer }); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    },
    close() { lines.close(); child.stdin.end(); child.kill(); }
  };
}

try {
  const { model, sets } = loadStudioResources();
  const legacy = JSON.parse(JSON.stringify(model.createProject(sets))); delete legacy.assets;
  const file = join(work, 'project.json'); await writeFile(file, JSON.stringify(legacy));
  app = await createStudioServer({ port: 0, file });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
  inspect(page, 'live'); await open(page, app.url);
  const token = await page.evaluate(() => window.assetTestToken = 'one-open-page');

  await check('old animation-only projects keep their clips and file until an asset edit', async () => {
    const before = await request('/api/state');
    assert.deepEqual(before.project, legacy);
    assert.equal(await readFile(file, 'utf8'), JSON.stringify(legacy));
    assert.equal(await page.evaluate(() => __animationStudio.game.stats.actors), 2);
    await page.locator('#workspaceScene').click();
    await page.waitForFunction(() => __assetStudio.ready && __assetStudio.state.workspace === 'scene');
    await page.evaluate(() => __assetStudio.setPreview({ mode: 'edit', playing: false, time: 0, grid: false }));
    await frames(page);
    assert.equal((await request('/api/scene')).initialized, false);
    assert.deepEqual((await request('/api/state')).project, legacy);
    assert.equal(await readFile(file, 'utf8'), JSON.stringify(legacy));
  });

  await check('the courtyard preset draws readable model parts, materials and a clip actor', async () => {
    await page.evaluate(() => __assetStudio.applyActions([{ type: 'load_preset', preset: 'courtyard' }]));
    const state = await snapshot(page);
    assert.equal(assets(state).selectedLevel, 'Courtyard');
    assert.deepEqual(state.project.clips, legacy.clips);
    assert.ok(Object.keys(assets(state).materials).length >= 6);
    assert.ok(Object.keys(assets(state).models).length >= 5);
    assert.equal(activeLevel(state).objects.Guide.clip, legacy.selected);
    await frames(page);
    const colors = await page.evaluate(() => {
      const canvas = document.getElementById('screen'), data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data, colors = new Set();
      for (let i = 0; i < data.length; i += 32) colors.add(data[i] + ',' + data[i + 1] + ',' + data[i + 2]);
      return colors.size;
    });
    assert.ok(colors > 24, 'The scene must contain rendered geometry and material detail, not an empty canvas.');
  });

  let crateID;
  await check('object controls add, select and transform a visible model', async () => {
    const before = await snapshot(page), count = Object.keys(activeLevel(before).objects).length;
    await page.locator('#sceneObjectModel').selectOption('Crate');
    await page.locator('#sceneNewObject').click();
    await page.waitForFunction(count => Object.keys(__assetStudio.runtime.level.objects).length === count + 1, count);
    const added = await snapshot(page); crateID = assets(added).selectedObject;
    assert.equal(activeLevel(added).objects[crateID].model, 'Crate');
    assert.equal(await page.evaluate(() => __assetStudio.state.selected), crateID);
    await page.locator('[data-scene-panel="object"]').click();
    await frames(page); const beforePixels = await pixels(page);
    for (const [id, value] of [['sceneObjectName', 'Browser crate'], ['sceneObjectX', '120'], ['sceneObjectY', '184'], ['sceneObjectZ', '4'], ['sceneObjectRotation', '25'], ['sceneObjectScale', '1.35']]) await page.locator('#' + id).fill(value);
    await page.locator('#sceneApplyObject').click();
    await page.waitForFunction(id => __assetStudio.runtime.level.objects[id].name === 'Browser crate', crateID);
    await frames(page);
    const object = activeLevel(await snapshot(page)).objects[crateID];
    assert.deepEqual(object.position, [120, 184, 4]); assert.equal(object.rotation, 25); assert.equal(object.scale, 1.35);
    assert.notEqual(digest(await pixels(page)), digest(beforePixels));
    const bounds = await page.evaluate(id => __assetStudio.runtime.bounds(id), crateID);
    assert.ok(bounds.flat().every(Number.isFinite)); assert.equal(bounds[2][0], 4);
  });

  await check('material controls change every use of a procedural texture without a reload', async () => {
    await page.locator('#sceneMaterialList [data-id="wood"]').click();
    await page.locator('[data-scene-panel="asset"]').click();
    await frames(page); const before = await pixels(page);
    for (const [id, value] of [['sceneMaterialColor', '#e39e32'], ['sceneMaterialAccent', '#522626'], ['sceneMaterialScale', '4'], ['sceneMaterialSeed', '91']]) await field(page, id, value);
    await page.locator('#scenePattern').selectOption('checker');
    await page.locator('#sceneApplyMaterial').click();
    await page.waitForFunction(() => __assetStudio.runtime.assets.materials.wood.color === '#e39e32');
    await frames(page);
    const material = assets(await snapshot(page)).materials.wood;
    assert.equal(material.pattern, 'checker'); assert.equal(material.scale, 4); assert.equal(material.seed, 91);
    assert.notEqual(digest(await pixels(page)), digest(before));
    assert.equal(await page.evaluate(() => window.assetTestToken), token);
  });

  await check('an agent creates a part model and one geometry edit updates its placed copies', async () => {
    const created = await edit([
      { type: 'model_create', id: 'BrowserTower', model: { name: 'Test tower', parts: [{ shape: 'cylinder', size: [20, 20, 32], material: 'brick' }, { shape: 'wedge', position: [0, 0, 32], size: [28, 24, 8], material: 'wood' }] } },
      { type: 'object_add', id: 'Tower_One', object: { kind: 'model', model: 'BrowserTower', position: [240, 96, 0] } },
      { type: 'object_add', id: 'Tower_Two', object: { kind: 'model', model: 'BrowserTower', position: [256, 144, 0] } }
    ]);
    await synced(page, created.revision);
    const before = await pixels(page);
    assert.equal(await page.evaluate(() => __assetStudio.runtime.bounds('Tower_One')[2][1]), 40);
    const changed = await edit([{ type: 'model_update', id: 'BrowserTower', changes: { parts: [
      { shape: 'cylinder', size: [20, 20, 56], material: 'brick' },
      { shape: 'wedge', position: [0, 0, 56], size: [28, 24, 8], material: 'wood' }
    ] } }]);
    await synced(page, changed.revision);
    for (const id of ['Tower_One', 'Tower_Two']) assert.equal(await page.evaluate(id => __assetStudio.runtime.bounds(id)[2][1], id), 64);
    assert.notEqual(digest(await pixels(page)), digest(before));
  });

  await check('the paint brush changes the tile at the clicked world position', async () => {
    await page.evaluate(() => __assetStudio.setPreview({ view: 'topdown', mode: 'edit', time: 0, playing: false }));
    await page.locator('#sceneFitBtn').click(); await frames(page);
    await page.locator('#sceneBrush').selectOption('g');
    await page.locator('#scenePaintBtn').click();
    const target = await page.evaluate(() => {
      const S = __assetStudio, level = S.runtime.level, x = 11, y = 7;
      const p = S.runtime.groundPoint(0, 0), a = S.runtime.groundPoint(1, 0), b = S.runtime.groundPoint(0, 1);
      const ax = a[0] - p[0], ay = a[1] - p[1], bx = b[0] - p[0], by = b[1] - p[1], det = ax * by - ay * bx;
      const dx = (x + .5) * level.tile - p[0], dy = (y + .5) * level.tile - p[1];
      const canvas = document.getElementById('screen'), rect = canvas.getBoundingClientRect();
      return { x, y, before: level.rows[y][x], px: ((dx * by - dy * bx) / det) * rect.width / S.game.W, py: ((dy * ax - dx * ay) / det) * rect.height / S.game.H };
    });
    assert.notEqual(target.before, 'g', 'The fixture cell must change visibly.');
    await page.locator('#screen').click({ position: { x: target.px, y: target.py } });
    await page.waitForFunction(({ x, y }) => __assetStudio.runtime.level.rows[y][x] === 'g', target);
    assert.equal(activeLevel(await snapshot(page)).rows[target.y][target.x], 'g');
    await page.locator('#sceneSelectBtn').click();
  });

  await check('a batch is atomic, rejects stale revisions, and undoes object and tile changes together', async () => {
    const before = await request('/api/state'), row = activeLevel(before).rows[8], position = activeLevel(before).objects[crateID].position;
    const actions = [{ type: 'fill', x: 9, y: 8, width: 2, height: 1, tile: 'g' }, { type: 'object_update', id: crateID, changes: { position: [144, 184, 4] } }];
    await request('/api/scene/edit', 'POST', { expectedRevision: before.revision, actions: [actions[0], { type: 'object_update', id: crateID, changes: { model: 'Missing_Model' } }] }, 400);
    assert.deepEqual(await request('/api/state'), before, 'An invalid final reference must not save the earlier tile action.');
    const start = performance.now(), receipt = await request('/api/scene/edit', 'POST', { expectedRevision: before.revision, actions });
    assert.equal(receipt.revision, before.revision + 1);
    await synced(page, receipt.revision); timings.editToPreviewMs = Math.round(performance.now() - start);
    const changed = await request('/api/state');
    assert.equal(activeLevel(changed).rows[8].slice(9, 11), 'gg');
    assert.deepEqual(activeLevel(changed).objects[crateID].position, [144, 184, 4]);
    await request('/api/scene/edit', 'POST', { expectedRevision: before.revision, actions: [{ type: 'object_delete', id: crateID }] }, 409);
    assert.deepEqual(await request('/api/state'), changed);
    await page.locator('#undoBtn').click();
    await page.waitForFunction(revision => __assetStudio.getSnapshot().revision > revision, changed.revision);
    const undone = await request('/api/state');
    assert.equal(activeLevel(undone).rows[8], row); assert.deepEqual(activeLevel(undone).objects[crateID].position, position);
    await page.locator('#redoBtn').click();
    await page.waitForFunction(revision => __assetStudio.getSnapshot().revision > revision, undone.revision);
    assert.deepEqual((await request('/api/state')).project, changed.project);
    assert.equal(await page.evaluate(() => window.assetTestToken), token);
  });

  await check('invalid scene JSON preserves the last valid scene and revision', async () => {
    await page.locator('[data-scene-panel="json"]').click();
    await page.locator('#sceneLiveJson').uncheck();
    const before = await request('/api/state'), text = await page.locator('#sceneJson').inputValue();
    await frames(page); const image = await pixels(page);
    await page.locator('#sceneJson').fill('{"parts":[}'); await page.locator('#sceneApplyJson').click(); await frames(page);
    assert.deepEqual(await request('/api/state'), before);
    assert.equal(digest(await pixels(page)), digest(image));
    await page.locator('#sceneReadJson').click();
    assert.equal(await page.locator('#sceneJson').inputValue(), text);
  });

  await check('scene actors reuse project clips and show later animation edits', async () => {
    const before = await snapshot(page), count = Object.keys(activeLevel(before).objects).length;
    await page.locator('#sceneAddActor').click();
    await page.waitForFunction(count => Object.keys(__assetStudio.runtime.level.objects).length === count + 1, count);
    const withActor = await snapshot(page), id = assets(withActor).selectedObject;
    assert.equal(activeLevel(withActor).objects[id].kind, 'actor');
    assert.equal(activeLevel(withActor).objects[id].clip, legacy.selected);
    assert.deepEqual(withActor.project.clips, legacy.clips, 'Placing an actor must reuse the clip without copying its keys.');
    await page.evaluate(() => __assetStudio.setPreview({ playing: false, time: 0 })); await frames(page);
    const beforePose = await page.evaluate(id => Array.from(__assetStudio.runtime.actors.get(id).pose), id);
    const state = await request('/api/state');
    const edited = await request('/api/action', 'POST', { expectedRevision: state.revision, source: 'agent', action: { type: 'edit_key', id: legacy.selected, time: 0, values: { armR: [0, 0, 100, 0, 0] } } });
    await synced(page, edited.revision);
    const pose = await page.evaluate(id => Array.from(__assetStudio.runtime.actors.get(id).pose), id);
    assert.ok(pose.every(Number.isFinite)); assert.notDeepEqual(pose, beforePose);
    const raised = await page.evaluate(id => {
      const p = __assetStudio.runtime.actors.get(id).pose, i = MocapReadable.IDX;
      return p[i.fistR * 3 + 2] > p[i.shR * 3 + 2];
    }, id);
    assert.equal(raised, true, 'The reused clip must raise the scene actor\'s actual hand.');
    assert.equal(await page.evaluate(() => window.assetTestToken), token);
  });

  await check('the level can be played while another edit updates the same open scene', async () => {
    await page.locator('#scenePlayBtn').click();
    await page.waitForFunction(() => __assetStudio.state.mode === 'play' && __assetStudio.runtime.getState().player);
    await page.locator('#screen').click();
    const before = await page.evaluate(() => __assetStudio.runtime.getState());
    await page.keyboard.down('ArrowRight');
    try { await page.waitForFunction(time => __assetStudio.state.time >= time + .35, before.time, { timeout: 10000 }); }
    finally { await page.keyboard.up('ArrowRight'); }
    const after = await page.evaluate(() => __assetStudio.runtime.getState());
    assert.ok(Math.hypot(after.player.x - before.player.x, after.player.y - before.player.y) > 5, 'Real keyboard input must move the playtest character.');
    const updated = await edit([{ type: 'material_update', id: 'metal', changes: { color: '#64788c' } }]);
    await synced(page, updated.revision);
    assert.equal(await page.evaluate(() => __assetStudio.state.mode), 'play');
    assert.equal(await page.evaluate(() => window.assetTestToken), token);
    await page.locator('#scenePlayBtn').click();
    await page.waitForFunction(() => __assetStudio.state.mode === 'edit');
    await page.evaluate(() => __assetStudio.setPreview({ playing: false, time: 0 }));
  });

  await check('an MCP batch changes the live scene and returns a real image in the same reply', async () => {
    mcp = startMCP(app.url);
    await mcp.call('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'asset-browser-test', version: '1.0.0' } });
    const listed = await mcp.call('tools/list', {}), names = listed.tools.map(tool => tool.name);
    for (const name of ['asset_catalog', 'scene_get', 'scene_edit', 'scene_preview', 'scene_capture', 'scene_export', 'animation_get', 'animation_edit', 'animation_history']) assert.ok(names.includes(name), name);
    const state = await request('/api/state'), start = performance.now();
    const result = await mcp.call('tools/call', { name: 'scene_edit', arguments: {
      expectedRevision: state.revision, actions: [{ type: 'material_update', id: 'wood', changes: { pattern: 'planks', color: '#b9824e', accent: '#724628' } }],
      capture: { view: 'threequarter', times: [0, .4], grid: false, selected: null }
    } });
    assert.ok(!result.isError, JSON.stringify(result));
    const receipt = JSON.parse(result.content.find(item => item.type === 'text').text), image = result.content.find(item => item.type === 'image');
    assert.ok(image, 'scene_edit must return an image content block when capture succeeds.');
    assert.equal(receipt.capture.revision, receipt.revision); assert.equal(image.mimeType, 'image/png');
    const bytes = Buffer.from(image.data, 'base64'); assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    await synced(page, receipt.revision); timings.editWithCaptureMs = Math.round(performance.now() - start);
    assert.equal(assets(await snapshot(page)).materials.wood.pattern, 'planks');
    await writeFile(join(out, 'mcp-edit-capture.png'), bytes);
  });

  await check('exact scene captures repeat and leave the human preview unchanged', async () => {
    await page.evaluate(() => __assetStudio.setPreview({ view: 'threequarter', playing: false, time: .4, grid: false, selected: null }));
    const state = await page.evaluate(() => __assetStudio.state), saved = await request('/api/state');
    const options = { times: [0, .4, 1, 1.6], view: 'threequarter', grid: false, selected: null };
    const a = await request('/api/scene/capture', 'POST', options), b = await request('/api/scene/capture', 'POST', options);
    assert.equal(a.revision, saved.revision); assert.deepEqual(a.times, options.times); assert.equal(a.workspace, 'scene');
    assert.equal(digest(Buffer.from(a.data, 'base64')), digest(Buffer.from(b.data, 'base64')));
    assert.deepEqual(await page.evaluate(() => __assetStudio.state), state);
    assert.deepEqual(await request('/api/state'), saved);
    await writeFile(join(out, 'scene-filmstrip.png'), Buffer.from(a.data, 'base64'));
    await page.locator('#sceneFitBtn').click(); await frames(page);
    await page.screenshot({ path: join(out, 'desktop.png'), fullPage: true });
  });

  await check('JSON and HTML exports carry the scene and work in an offline browser', async () => {
    const json = await download(page, '#sceneExportJson'), record = JSON.parse(json.text);
    assert.equal(record.schema, 1); assert.ok(record.project.assets.levels[record.level]);
    assert.equal(Object.keys(record.project.assets.levels).length, 1);
    for (const object of Object.values(record.project.assets.levels[record.level].objects)) if (object.kind === 'actor') assert.ok(record.project.clips[object.clip]);
    const html = await download(page, '#sceneExportHtml');
    assert.ok(html.text.includes('window.__assetStudioExport='));
    const local = join(work, 'scene-export.html'); await writeFile(local, html.text);
    const context = await browser.newContext({ offline: true, viewport: { width: 1280, height: 900 } });
    try {
      const exported = await context.newPage(), requests = []; inspect(exported, 'export');
      exported.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
      await open(exported, pathToFileURL(local).href);
      await exported.waitForFunction(() => __assetStudio.ready && __assetStudio.state.workspace === 'scene');
      assert.deepEqual(assets(await snapshot(exported)), record.project.assets);
      assert.deepEqual((await snapshot(exported)).project.clips, record.project.clips);
      await exported.evaluate(() => __assetStudio.setPreview({ mode: 'edit', playing: false, time: .4 })); await frames(exported);
      assert.ok((await pixels(exported)).length > 10000);
      assert.deepEqual(requests, []);
      await exported.screenshot({ path: join(out, 'export.png'), fullPage: true });
    } finally { await context.close(); }
  });

  await check('the scene layout fits a narrow screen', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await frames(page);
    const size = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth, canvas: document.getElementById('screen').getBoundingClientRect().width }));
    assert.ok(size.content <= size.width + 1, JSON.stringify(size)); assert.ok(size.canvas > 200 && size.canvas <= size.width);
    await page.screenshot({ path: join(out, 'mobile.png'), fullPage: true });
  });

  assert.deepEqual(errors, [], 'Asset Studio must not produce browser or engine errors.');
  await writeFile(join(out, 'report.json'), JSON.stringify({ checks, errors, timings }, null, 2) + '\n');
  console.log('Asset Studio: ' + checks.length + ' browser and live-session checks passed. Images: ' + out);
  console.log('Observed feedback times (this run only): ' + JSON.stringify(timings));
} finally {
  if (mcp) mcp.close();
  if (app) await app.close();
  await browser.close();
  await rm(work, { recursive: true, force: true });
}
