// Animation Studio: author a clip through the UI, inspect real poses and pixels, then edit the same open page through
// HTTP, MCP and the watched file. Captures must repeat at exact times. Run npm run build first; CHROMIUM_PATH selects Chromium.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { chromium } from 'playwright';
import { createStudioServer } from './animation-studio.mjs';

const out = resolve('check-output/studio');
await mkdir(out, { recursive: true });
const work = await mkdtemp(join(out, 'session-'));
const errors = [], checks = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let app = null, mcp = null;
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const snapshot = page => page.evaluate(() => __animationStudio.getSnapshot());
const selected = state => state.project.clips[state.project.selected].clip;
const digest = data => createHash('sha256').update(data).digest('hex');
const currentPose = page => page.evaluate(() => {
  const S = __animationStudio, p = S.pose;
  const point = name => Array.from(p.slice(MocapReadable.IDX[name] * 3, MocapReadable.IDX[name] * 3 + 3));
  return { values: Array.from(p), shoulder: point('shR'), fist: point('fistR'), actors: S.game.stats.actors };
});
async function check(name, fn) {
  await fn(); checks.push(name); console.log('ok', name);
}
function inspect(page, label) {
  page.on('pageerror', e => errors.push(label + ': ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of (400|409)/.test(m.text())) errors.push(label + ': ' + m.text());
    if (m.type() === 'warning' && m.text().startsWith('my-3D2dge:')) errors.push(label + ': ' + m.text());
  });
}
async function open(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => window.__animationStudio?.ready && __animationStudio.game.fps > 0, null, { timeout: 15000 });
  await page.evaluate(() => __animationStudio.setPreview({ playing: false, time: 0, cast: 'both' }));
  await frames(page);
}
async function download(page, button) {
  const next = page.waitForEvent('download');
  await page.locator(button).click();
  const file = await next;
  const text = await readFile(await file.path(), 'utf8');
  return { name: file.suggestedFilename(), text };
}
async function request(path, method = 'GET', body) {
  const response = await fetch(app.url + path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  assert.ok(response.ok, path + ': ' + JSON.stringify(result));
  return result;
}
async function action(value) {
  const state = await request('/api/state');
  return request('/api/action', 'POST', { expectedRevision: state.revision, source: 'agent', action: value });
}

// The adapter is exercised as a real MCP client would use it. Requests and replies are one JSON object per line.
function startMCP(url) {
  const child = spawn(process.execPath, [resolve('tools/animation-mcp.mjs'), '--url', url], { stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map(); let seq = 0, stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    let value;
    try { value = JSON.parse(line); } catch { errors.push('MCP wrote non-JSON data to stdout: ' + line.slice(0, 120)); return; }
    const p = pending.get(value.id); if (!p) return;
    pending.delete(value.id); clearTimeout(p.timer);
    if (value.error) p.reject(new Error(JSON.stringify(value.error))); else p.resolve(value.result);
  });
  child.on('exit', code => {
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('MCP exited ' + code + ': ' + stderr)); }
    pending.clear();
  });
  return {
    call(method, params) {
      return new Promise((resolve, reject) => {
        const id = ++seq;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('MCP timeout for ' + method + ': ' + stderr)); }, 20000);
        pending.set(id, { resolve, reject, timer });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    },
    notify(method, params) { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n'); },
    close() { lines.close(); child.stdin.end(); child.kill(); }
  };
}

try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  inspect(page, 'offline');
  const remote = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
  await open(page, pathToFileURL(resolve('examples/animation-studio.html')).href);

  await check('offline page draws both figures without network requests', async () => {
    const pose = await currentPose(page);
    assert.equal(pose.actors, 2);
    assert.ok(pose.values.length >= 90 && pose.values.every(Number.isFinite));
    assert.deepEqual(remote, []);
  });

  await check('new clip and pose controls change the actual right hand', async () => {
    await page.locator('#newBtn').click();
    await page.locator('#newName').fill('Browser Greeting');
    await page.locator('#newDuration').fill('2');
    await page.locator('#newPreset').selectOption('neutral');
    await page.locator('#createBtn').click();
    let state = await snapshot(page);
    assert.equal(state.project.selected, 'Browser Greeting');
    assert.equal(selected(state).dur, 2);
    await page.evaluate(() => __animationStudio.seek(0));
    await page.locator('#channelSelect').selectOption('armR');
    await page.locator('#poseTime').fill('0');
    for (const [i, value] of [0, 0, 100, 0, 0].entries()) await page.locator('#channelValues [data-component="' + i + '"]').fill(String(value));
    await page.locator('#setKeyBtn').click();
    await frames(page);
    state = await snapshot(page);
    assert.deepEqual(selected(state).keys.find(k => k.t === 0).armR, [0, 0, 100, 0, 0]);
    const pose = await currentPose(page);
    assert.ok(pose.fist[2] > pose.shoulder[2] + 350, 'The changed pose must raise the right fist above the shoulder.');
  });

  await check('Undo and Redo restore the pose, not only the text', async () => {
    const raised = selected(await snapshot(page));
    await page.locator('#undoBtn').click(); await frames(page);
    const down = await currentPose(page);
    assert.ok(down.fist[2] < down.shoulder[2]);
    await page.locator('#redoBtn').click(); await frames(page);
    assert.deepEqual(selected(await snapshot(page)), raised);
    const up = await currentPose(page);
    assert.ok(up.fist[2] > up.shoulder[2] + 350);
  });

  await check('Delete removes the nearby key at its exact time and Undo restores it', async () => {
    const originalID = (await snapshot(page)).project.selected;
    await page.locator('#clipList [data-id="Wave"]').click();
    const before = selected(await snapshot(page)), time = before.keys[1].t;
    await page.evaluate(time => __animationStudio.seek(time + .001), time);
    await page.locator('[data-panel="pose"]').click();
    assert.equal(await page.locator('#deleteKeyBtn').isEnabled(), true);
    await page.locator('#deleteKeyBtn').click(); await frames(page);
    const after = selected(await snapshot(page));
    assert.equal(after.keys.length, before.keys.length - 1);
    assert.ok(!after.keys.some(key => Math.abs(key.t - time) < 1e-9));
    await page.locator('#undoBtn').click(); await frames(page);
    assert.deepEqual(selected(await snapshot(page)).keys, before.keys);
    await page.locator('#clipList [data-id="' + originalID + '"]').click();
    await page.evaluate(() => __animationStudio.seek(0)); await frames(page);
  });

  await check('invalid clip JSON leaves the last valid pose and revision in place', async () => {
    await page.locator('[data-panel="json"]').click();
    await page.locator('#autoApply').uncheck();
    const before = await snapshot(page), pixels = await page.evaluate(() => document.querySelector('#screen').toDataURL());
    await page.locator('#clipText').fill('{"clip":"broken","keys":[}');
    await page.locator('#applyJsonBtn').click(); await frames(page);
    const after = await snapshot(page);
    assert.deepEqual(after.project, before.project);
    assert.equal(after.revision, before.revision);
    assert.equal(digest(await page.evaluate(() => document.querySelector('#screen').toDataURL())), digest(pixels));
    assert.ok((await page.locator('#notice').textContent()).trim().length > 8, 'A rejected edit needs an explanation.');
    await page.locator('#clipText').fill(JSON.stringify(selected(before), null, 2));
    await page.locator('#applyJsonBtn').click();
  });

  await check('clip, project and game-set exports retain motion and import again', async () => {
    const state = await snapshot(page), source = selected(state);
    const clip = await download(page, '#exportBtn');
    const record = JSON.parse(clip.text);
    assert.equal(record.set, state.project.clips[state.project.selected].set);
    assert.deepEqual(record.clip.keys, source.keys);
    const project = await download(page, '#saveProjectBtn');
    assert.deepEqual(JSON.parse(project.text).clips, state.project.clips);
    const setFile = await download(page, '#exportSetBtn');
    const context = { window: {} };
    vm.runInNewContext(setFile.text, context, { timeout: 1000 });
    const sets = Object.values(context.window.MOCAP || {});
    assert.equal(sets.length, 1);
    const set = JSON.parse(JSON.stringify(sets[0])), names = Object.keys(set.clips);
    assert.deepEqual(names, [source.clip]);
    assert.deepEqual(set.clips[source.clip].keys, source.keys);
    assert.ok(set.sources[source.src], 'The native game set needs its source proportions and credit.');
    const imported = structuredClone(record); imported.clip.clip = 'Clip_File_Copy';
    await page.locator('#importFile').setInputFiles({ name: 'clip-copy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
    await frames(page);
    assert.equal((await snapshot(page)).project.selected, 'Clip_File_Copy');
    assert.deepEqual(selected(await snapshot(page)).keys, source.keys);
    await page.locator('#importFile').setInputFiles({ name: 'saved-project.json', mimeType: 'application/json', buffer: Buffer.from(project.text) });
    await frames(page);
    assert.deepEqual((await snapshot(page)).project.clips, state.project.clips);
    await writeFile(join(out, 'authored-clip.json'), clip.text);
    await writeFile(join(out, 'authored-set.js'), setFile.text);
  });

  await check('clip JSON keeps the Hero reference body when imported from another library', async () => {
    await page.locator('#librarySet').selectOption('hero');
    await page.locator('#librarySearch').fill('Land_Three_Point');
    await page.locator('#libraryList [data-set="hero"][data-clip="Land_Three_Point"]').click();
    await page.evaluate(() => __animationStudio.seek(.5)); await frames(page);
    const before = await snapshot(page), body = await page.evaluate(() => ({ body: __animationStudio.lib.body, rest: __animationStudio.lib.rest }));
    const pose = (await currentPose(page)).values;
    const exported = await download(page, '#exportBtn');
    assert.equal(JSON.parse(exported.text).set, 'hero');
    await page.locator('#librarySet').selectOption('mesh2motion');
    await page.locator('#librarySearch').fill('Idle_A');
    await page.locator('#libraryList [data-set="mesh2motion"][data-clip="Idle_A"]').click();
    assert.equal((await snapshot(page)).project.clips[(await snapshot(page)).project.selected].set, 'mesh2motion');
    await page.locator('#importFile').setInputFiles({ name: 'hero-landing.json', mimeType: 'application/json', buffer: Buffer.from(exported.text) });
    await frames(page);
    const after = await snapshot(page);
    assert.equal(after.project.clips[after.project.selected].set, 'hero');
    assert.deepEqual(selected(after).keys, selected(before).keys);
    await page.evaluate(() => __animationStudio.seek(.5)); await frames(page);
    assert.deepEqual(await page.evaluate(() => ({ body: __animationStudio.lib.body, rest: __animationStudio.lib.rest })), body);
    assert.deepEqual((await currentPose(page)).values, pose);
  });

  await check('a library clip keeps its keys and works in all five views and three casts', async () => {
    await page.locator('#librarySet').selectOption('quaternius');
    await page.locator('#librarySearch').fill('Walk_Loop');
    await page.locator('#libraryList [data-set="quaternius"][data-clip="Walk_Loop"]').click();
    const state = await snapshot(page);
    assert.ok(selected(state).keys.length > 2);
    assert.ok(selected(state).src);
    const views = await page.evaluate(() => My3D2dge.VIEW_ORDER.slice());
    assert.equal(views.length, 5);
    for (const view of views) {
      await page.locator('#viewSelect').selectOption(view);
      for (const [cast, actors] of [['mannequin', 1], ['hero', 1], ['both', 2]]) {
        await page.locator('#castSelect').selectOption(cast);
        for (const time of [0, selected(state).dur * .4, selected(state).dur]) {
          await page.evaluate(time => __animationStudio.seek(time), time); await frames(page);
          const pose = await currentPose(page);
          assert.ok(pose.values.every(Number.isFinite), view + '/' + cast + ': pose must contain finite values.');
          assert.equal(pose.actors, actors, view + '/' + cast + ': wrong number of figures.');
        }
      }
    }
    await page.evaluate(() => __animationStudio.setPreview({ view: 'threequarter', cast: 'both', playing: false, time: .3 }));
    await frames(page);
    await page.screenshot({ path: join(out, 'desktop.png'), fullPage: true });
  });

  await check('mobile layout keeps all content within the viewport', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await frames(page);
    const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, width: innerWidth, canvas: document.querySelector('#screen').getBoundingClientRect().width }));
    assert.ok(size.content <= size.width + 1, JSON.stringify(size));
    assert.ok(size.canvas > 200 && size.canvas <= size.width);
    await page.screenshot({ path: join(out, 'mobile.png'), fullPage: true });
  });

  const file = join(work, 'project.json');
  app = await createStudioServer({ port: 0, file });
  const live = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  inspect(live, 'live');
  await open(live, app.url);
  const token = await live.evaluate(() => window.studioTestToken = 'same-open-page');

  await check('an external HTTP edit changes the open preview without a reload', async () => {
    await action({ type: 'create', name: 'Live Greeting', preset: 'neutral', duration: 2 });
    await live.waitForFunction(() => __animationStudio.project.selected === 'Live Greeting');
    await action({ type: 'edit_key', id: 'Live Greeting', time: 0, values: { armR: [0, 0, 100, 0, 0] } });
    await live.waitForFunction(() => __animationStudio.project.clips['Live Greeting'].clip.keys[0].armR[2] === 100);
    await live.evaluate(() => __animationStudio.seek(0)); await frames(live);
    const pose = await currentPose(live);
    assert.ok(pose.fist[2] > pose.shoulder[2] + 350);
    assert.equal(await live.evaluate(() => window.studioTestToken), token);
  });

  await check('an incoming edit keeps a JSON draft and rejects its stale revision', async () => {
    await live.locator('[data-panel="json"]').click();
    await live.locator('#autoApply').uncheck();
    const draft = selected(await snapshot(live));
    draft.keys[0].head = [30, 0, 0];
    const text = JSON.stringify(draft, null, 2);
    await live.locator('#clipText').fill(text);
    await action({ type: 'edit_key', id: 'Live Greeting', time: 0, values: { head: [15, 0, 0] } });
    await live.waitForFunction(() => __animationStudio.project.clips['Live Greeting'].clip.keys[0].head[0] === 15);
    assert.equal(await live.locator('#clipText').inputValue(), text);
    const latest = await request('/api/state');
    await live.locator('#applyJsonBtn').click();
    await live.waitForFunction(() => /another edit changed|old revision|revision conflict/i.test(document.querySelector('#jsonStatus').textContent));
    assert.equal((await request('/api/state')).revision, latest.revision);
    assert.deepEqual((await request('/api/state')).project, latest.project);
    await live.locator('#resetJsonBtn').click();
    assert.equal(JSON.parse(await live.locator('#clipText').inputValue()).keys[0].head[0], 15);
  });

  await check('valid watched-file changes reach the page; incomplete JSON does not replace the preview', async () => {
    const state = await request('/api/state'), project = structuredClone(state.project);
    project.clips['Live Greeting'].clip.keys[0].armR = [100, 0, 0, 0, 0];
    await writeFile(file, JSON.stringify(project));
    await live.waitForFunction(() => __animationStudio.project.clips['Live Greeting'].clip.keys[0].armR[0] === 100);
    const accepted = await request('/api/state');
    await writeFile(file, '{"schema":1,"clips":');
    await live.waitForFunction(() => /invalid|JSON|parse|expected|unexpected/i.test(document.querySelector('#notice').textContent));
    assert.deepEqual((await request('/api/state')).project, accepted.project);
    assert.deepEqual((await snapshot(live)).project, accepted.project);
    await writeFile(file, JSON.stringify(accepted.project));
  });

  // The MCP tool names and fields are tested against the adapter's declared schema below.
  await check('MCP tools can inspect and change the same live project', async () => {
    mcp = startMCP(app.url);
    const initialized = await mcp.call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'studio-browser-test', version: '1.0.0' } });
    assert.ok(initialized.capabilities.tools);
    mcp.notify('notifications/initialized', {});
    const tools = await mcp.call('tools/list', {});
    assert.equal(tools.tools.length, 16);
    // Kept explicit so a changed public tool contract requires a corresponding test and guide update.
    const names = tools.tools.map(tool => tool.name);
    for (const name of ['animation_catalog', 'animation_get', 'animation_create', 'animation_edit', 'animation_preview', 'animation_capture', 'animation_history', 'animation_export', 'studio_status', 'studio_import']) assert.ok(names.includes(name), 'Missing MCP tool: ' + name);
    const stateResult = await mcp.call('tools/call', { name: 'animation_get', arguments: {} });
    assert.ok(!stateResult.isError, JSON.stringify(stateResult));
    const state = stateResult.structuredContent || JSON.parse(stateResult.content.find(c => c.type === 'text').text);
    assert.equal(state.project, undefined); assert.equal(state.selected, 'Live Greeting'); assert.equal(state.inspected.id, 'Live Greeting');
    const result = await mcp.call('tools/call', { name: 'animation_edit', arguments: { expectedRevision: state.revision, action: { type: 'edit_key', id: 'Live Greeting', time: 0, values: { armR: [0, 0, 100, 0, 0] } } } });
    assert.ok(!result.isError, JSON.stringify(result));
    await live.waitForFunction(() => __animationStudio.project.clips['Live Greeting'].clip.keys[0].armR[2] === 100);
    assert.equal(await live.evaluate(() => window.studioTestToken), token);
  });

  await check('temporary preview leaves selection unchanged and returns to the saved clip on request', async () => {
    const saved = await request('/api/state');
    assert.equal(saved.project.selected, 'Live Greeting');
    assert.ok(saved.project.clips.Wave);
    await request('/api/preview', 'POST', { id: 'Wave', time: 0, playing: false });
    await live.waitForFunction(() => {
      const S = __animationStudio, i = MocapReadable.IDX;
      return S.pose[i.fistR * 3 + 2] < S.pose[i.shR * 3 + 2];
    });
    const after = await request('/api/state');
    assert.equal(after.revision, saved.revision);
    assert.equal(after.project.selected, 'Live Greeting');
    // Selecting the already-saved clip is a server no-op. The visible preview must still change back.
    await live.locator('#clipList [data-id="Live Greeting"]').click();
    await live.waitForFunction(() => {
      const S = __animationStudio, i = MocapReadable.IDX;
      return S.state.id === 'Live Greeting' && S.pose[i.fistR * 3 + 2] > S.pose[i.shR * 3 + 2] + 350;
    });
    assert.equal((await request('/api/state')).revision, saved.revision);

    // An omitted id targets the saved selection, even after a different temporary preview.
    await request('/api/preview', 'POST', { id: 'Wave', time: 0, playing: false });
    await live.waitForFunction(() => __animationStudio.state.id === 'Wave');
    const target = await request('/api/preview', 'POST', { time: 0, playing: false });
    assert.equal(target.id, 'Live Greeting');
    await live.waitForFunction(() => {
      const S = __animationStudio, i = MocapReadable.IDX;
      return S.state.id === 'Live Greeting' && S.pose[i.fistR * 3 + 2] > S.pose[i.shR * 3 + 2] + 350;
    });
    const final = await request('/api/state');
    assert.equal(final.revision, saved.revision);
    assert.equal(final.project.selected, saved.project.selected);
  });

  await check('still and frame-strip captures show exact times and repeat pixel for pixel', async () => {
    await action({ type: 'create', name: 'Capture Wave', preset: 'wave', duration: 2 });
    const options = { times: [0, .4, 1, 1.6], view: 'threequarter', cast: 'both', bones: false };
    const a = await request('/api/capture', 'POST', options), b = await request('/api/capture', 'POST', options);
    assert.equal(a.mimeType, 'image/png');
    assert.deepEqual(a.times, options.times);
    assert.equal(a.revision, b.revision);
    const bytes = Buffer.from(a.data, 'base64');
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok(bytes.length > 3000, 'The frame strip must contain a rendered animation.');
    assert.equal(digest(bytes), digest(Buffer.from(b.data, 'base64')));
    await writeFile(join(out, 'wave-filmstrip.png'), bytes);
    const still = await request('/api/capture', 'POST', { times: [1], view: 'side', cast: 'both' });
    assert.equal(still.mimeType, 'image/png');
    assert.notEqual(digest(Buffer.from(still.data, 'base64')), digest(bytes));
    await writeFile(join(out, 'wave-still.png'), Buffer.from(still.data, 'base64'));
  });

  assert.deepEqual(errors, [], 'The studio must not produce browser or engine errors.');
  await writeFile(join(out, 'report.json'), JSON.stringify({ checks, errors }, null, 2) + '\n');
  console.log('Animation Studio: ' + checks.length + ' browser and live-session checks passed. Images: ' + out);
} finally {
  if (mcp) mcp.close();
  if (app) await app.close();
  await browser.close();
  await rm(work, { recursive: true, force: true });
}
