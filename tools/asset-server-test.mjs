// Asset Studio integration checks: atomic HTTP edits, compact reads, shared history, SSE, watched files and real MCP.
// Browser render and capture checks live in asset-browser-test.mjs. These checks never need a display.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import vm from 'node:vm';
import { createStudioServer } from './animation-studio.mjs';
import { REPO_ROOT } from './studio-service.mjs';

async function studio(t) {
  const dir = await mkdtemp(join(tmpdir(), 'asset-studio-')), file = join(dir, 'project.json');
  const app = await createStudioServer({ port: 0, file, watchDebounce: 20 });
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  return { ...app, dir, file };
}
async function http(app, path, data, options = {}) {
  const response = await fetch(app.url + path, { method: data === undefined ? 'GET' : 'POST', headers: data === undefined ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), ...options });
  const raw = await response.text(); let value; try { value = JSON.parse(raw); } catch { value = raw; }
  return { status: response.status, value, headers: response.headers };
}
async function stream(t, app) {
  const controller = new AbortController(), response = await fetch(app.url + '/api/events', { signal: controller.signal });
  assert.equal(response.status, 200);
  const reader = response.body.getReader(), queue = [], pending = []; let buffer = '', stopped = false;
  const pump = (async () => {
    const decoder = new TextDecoder();
    try { while (!stopped) {
      const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
      let end; while ((end = buffer.indexOf('\n\n')) >= 0) {
        const record = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        const event = /^event: (.+)$/m.exec(record)?.[1], raw = /^data: (.+)$/m.exec(record)?.[1];
        if (!event || !raw) continue;
        const entry = { event, data: JSON.parse(raw) }, index = pending.findIndex(p => p.event === event && p.predicate(entry.data));
        if (index < 0) queue.push(entry); else { const p = pending.splice(index, 1)[0]; clearTimeout(p.timer); p.resolve(entry.data); }
      }
    } } catch (err) { if (!stopped) for (const p of pending.splice(0)) { clearTimeout(p.timer); p.reject(err); } }
  })();
  t.after(async () => { stopped = true; controller.abort(); await pump; for (const p of pending.splice(0)) { clearTimeout(p.timer); p.reject(new Error('SSE closed.')); } });
  return {
    next(event = 'state', predicate = () => true) {
      const i = queue.findIndex(q => q.event === event && predicate(q.data));
      if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0].data);
      return new Promise((resolve, reject) => {
        const p = { event, predicate, resolve, reject, timer: setTimeout(() => { const i = pending.indexOf(p); if (i >= 0) pending.splice(i, 1); reject(new Error('SSE timed out: ' + event)); }, 5000) }; pending.push(p);
      });
    }
  };
}
async function mcp(t, app) {
  const child = spawn(process.execPath, [join(REPO_ROOT, 'tools/animation-mcp.mjs'), '--url', app.url], { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
  let nextID = 1, stderr = ''; const waiting = new Map(), noise = [];
  child.stderr.on('data', data => { stderr += data; });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    let response; try { response = JSON.parse(line); } catch { noise.push(line); return; }
    const p = waiting.get(response.id); if (!p) { noise.push(line); return; }
    waiting.delete(response.id); clearTimeout(p.timer); p.resolve(response);
  });
  child.on('exit', () => { for (const p of waiting.values()) { clearTimeout(p.timer); p.reject(new Error('MCP exited: ' + stderr)); } waiting.clear(); });
  t.after(async () => { child.stdin.end(); if (child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); } lines.close(); assert.deepEqual(noise, []); });
  const ask = (method, params) => new Promise((resolve, reject) => {
    const id = nextID++, timer = setTimeout(() => { waiting.delete(id); reject(new Error('MCP timed out: ' + method + ' ' + stderr)); }, 20000);
    waiting.set(id, { resolve, reject, timer }); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  await ask('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'asset-test', version: '1' } });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  return { ask, call: (name, args = {}) => ask('tools/call', { name, arguments: args }) };
}
const parse = response => {
  assert.equal(response.result.isError, undefined, response.result.content.find(c => c.type === 'text')?.text);
  return JSON.parse(response.result.content.find(c => c.type === 'text').text);
};
const material = { type: 'material_create', id: 'copper', material: { color: '#b56b3b', accent: '#754526', pattern: 'checker', scale: 4, seed: 3 } };
const batch = [
  { type: 'object_add', id: 'NewTower', object: { kind: 'model', model: 'Tower', position: [160, 96, 0] } },
  { type: 'model_create', id: 'Tower', model: { parts: [{ shape: 'cylinder', size: [32, 32, 72], material: 'copper' }] } }, material
];

test('compact scene discovery preserves old projects and exposes complete targeted data', async t => {
  const app = await studio(t), original = (await http(app, '/api/state')).value;
  assert.equal(original.project.assets, undefined);
  const result = await http(app, '/api/scene'); assert.equal(result.status, 200);
  const scene = result.value; assert.equal(scene.revision, original.revision); assert.equal(scene.initialized, false);
  assert.equal(scene.summary.selectedLevel, 'Courtyard'); assert.equal(scene.project, undefined); assert.equal(scene.animations[0].id, 'Wave');
  assert.ok(scene.objects.some(o => o.id === 'Guide')); assert.ok(!JSON.stringify(scene).includes('armR'));
  const target = (await http(app, '/api/scene?type=object&id=Guide&includeSchema=true')).value;
  assert.equal(target.inspected.data.clip, 'Wave'); assert.equal(target.inspected.level, 'Courtyard'); assert.ok(target.schema.action.oneOf.length >= 15);
  const full = (await http(app, '/api/scene?full=true')).value; assert.deepEqual(full.project, original.project);
  const cat = (await http(app, '/api/assets/catalog?includeSchema=true')).value;
  assert.ok(cat.patterns.includes('brick')); assert.ok(cat.shapes.includes('wedge')); assert.ok(cat.schema.action); assert.ok(cat.examples.createModel);
  for (const path of ['/api/scene?type=bad', '/api/scene?id=Guide', '/api/scene?full=yes', '/api/assets/catalog?typo=true']) assert.equal((await http(app, path)).status, 400, path);
  assert.equal((await http(app, '/api/scene?type=model&id=Missing')).status, 404);
  assert.deepEqual((await http(app, '/api/state')).value, original);
  assert.equal((await http(app, '/asset-studio')).status, 200);
});

test('asset batches resolve forward references, broadcast once and roll back every failed action', async t => {
  const app = await studio(t), events = await stream(t, app), original = await events.next();
  const response = await http(app, '/api/scene/edit', { expectedRevision: original.revision, actions: batch, summary: 'Add a copper tower' });
  assert.equal(response.status, 200, JSON.stringify(response.value)); const receipt = response.value;
  assert.equal(receipt.applied, true); assert.equal(receipt.revision, original.revision + 1); assert.equal(receipt.project, undefined);
  assert.deepEqual(receipt.changed.materials, ['copper']); assert.deepEqual(receipt.changed.models, ['Tower']); assert.deepEqual(receipt.changed.objects, [{ level: 'Courtyard', id: 'NewTower' }]);
  const state = await events.next('state', s => s.revision === receipt.revision);
  assert.equal(state.lastChange.summary, 'Add a copper tower'); assert.equal(state.project.assets.levels.Courtyard.objects.NewTower.model, 'Tower');
  assert.equal(state.project.assets.models.Tower.parts[0].material, 'copper'); assert.deepEqual(JSON.parse(await readFile(app.file, 'utf8')), state.project);
  const invalid = await http(app, '/api/scene/edit', { expectedRevision: state.revision, actions: [
    { type: 'material_update', id: 'copper', changes: { color: '#ffffff' } },
    { type: 'object_add', id: 'Broken', object: { kind: 'model', model: 'DoesNotExist' } }
  ] });
  assert.equal(invalid.status, 400); assert.deepEqual((await http(app, '/api/state')).value, state);
  assert.equal((await http(app, '/api/scene/edit', { expectedRevision: original.revision, actions: [{ type: 'material_update', id: 'copper', changes: { color: '#000000' } }] })).status, 409);
  assert.equal((await http(app, '/api/scene/edit', { expectedRevision: state.revision, actions: [], typo: 1 })).status, 400);
  const undone = (await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'undo' } })).value;
  assert.deepEqual(undone.project, original.project); assert.equal(undone.canUndo, false);
  const redone = (await http(app, '/api/action', { expectedRevision: undone.revision, action: { type: 'redo' } })).value;
  assert.deepEqual(redone.project, state.project);
});

test('animation edits and scene edits use one revision and one ordered history', async t => {
  const app = await studio(t); let state = (await http(app, '/api/state')).value;
  let receipt = (await http(app, '/api/scene/edit', { expectedRevision: state.revision, actions: batch })).value;
  state = (await http(app, '/api/action', { expectedRevision: receipt.revision, action: { type: 'create', name: 'Greeting', duration: 3, preset: 'wave' } })).value;
  receipt = (await http(app, '/api/scene/edit', { expectedRevision: state.revision, actions: [{ type: 'object_update', id: 'Guide', changes: { clip: 'Greeting' } }] })).value;
  state = (await http(app, '/api/state')).value; const final = structuredClone(state.project);
  assert.equal(state.project.assets.levels.Courtyard.objects.Guide.clip, 'Greeting');
  assert.equal((await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'delete', id: 'Greeting' } })).status, 400);
  state = (await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'undo' } })).value;
  assert.equal(state.project.assets.levels.Courtyard.objects.Guide.clip, 'Wave'); assert.ok(state.project.clips.Greeting);
  state = (await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'undo' } })).value;
  assert.equal(state.project.clips.Greeting, undefined); assert.ok(state.project.assets.models.Tower);
  for (let i = 0; i < 2; i++) state = (await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'redo' } })).value;
  assert.deepEqual(state.project, final);
});

test('scene preview targets are checked without altering the saved human project', async t => {
  const app = await studio(t), events = await stream(t, app), state = await events.next();
  const response = await http(app, '/api/scene/preview', { view: 'side', time: 500, playing: false, selected: 'Guide', mode: 'edit', zoom: 1.5, focus: [192, 160, 0], grid: true });
  assert.equal(response.status, 200); assert.equal(response.value.workspace, 'scene'); assert.equal(response.value.level, 'Courtyard');
  assert.equal((await events.next('preview')).time, 500); assert.deepEqual((await http(app, '/api/state')).value, state);
  for (const opts of [{ time: -1 }, { time: 601 }, { zoom: .25 }, { focus: [0, 0] }, { selected: 'Missing' }, { grid: 1 }, { mode: 'bad' }, { surprise: true }]) assert.ok((await http(app, '/api/scene/preview', opts)).status >= 400);
  assert.equal((await http(app, '/api/scene/preview', { selected: null })).status, 200);
  const animation = (await http(app, '/api/preview', { time: .5, playing: false })).value;
  assert.equal(animation.workspace, 'animation'); assert.equal(animation.id, 'Wave'); assert.deepEqual((await http(app, '/api/state')).value, state);
});

test('watched assets replace atomically and invalid references preserve the last valid state', async t => {
  const app = await studio(t), events = await stream(t, app); let state = await events.next();
  await http(app, '/api/scene/edit', { expectedRevision: state.revision, actions: batch }); state = await events.next('state');
  const next = structuredClone(state.project); next.assets.materials.copper.color = '#9c5828';
  await writeFile(app.file + '.next', JSON.stringify(next)); await rename(app.file + '.next', app.file);
  state = await events.next('state', s => s.lastChange.source === 'file'); assert.equal(state.project.assets.materials.copper.color, '#9c5828');
  const invalid = structuredClone(next); delete invalid.assets.materials.copper;
  await writeFile(app.file + '.next', JSON.stringify(invalid)); await rename(app.file + '.next', app.file);
  assert.match((await events.next('error')).error, /copper/); assert.deepEqual((await http(app, '/api/state')).value, state);
  assert.equal((await http(app, '/api/scene/edit', { expectedRevision: state.revision, actions: [{ type: 'select', id: 'Guide' }] })).status, 409);
  assert.deepEqual(JSON.parse(await readFile(app.file, 'utf8')), invalid);
  await writeFile(app.file + '.next', JSON.stringify(next)); await rename(app.file + '.next', app.file); await events.next('state');
  const undone = (await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'undo' } })).value;
  assert.equal(undone.project.assets.materials.copper.color, '#b56b3b');
});

test('scene exports retain actor data and HTML injection safely preserves arbitrary display text', async t => {
  const app = await studio(t); let state = (await http(app, '/api/state')).value;
  await http(app, '/api/scene/edit', { expectedRevision: state.revision, actions: batch }); state = (await http(app, '/api/state')).value;
  const project = structuredClone(state.project); project.name = 'Studio </script><script>injected()</script>';
  state = (await http(app, '/api/project', { expectedRevision: state.revision, project }, { method: 'PUT' })).value;
  const output = (await http(app, '/api/scene/export?format=json')).value;
  assert.equal(output.level, 'Courtyard'); assert.equal(output.revision, state.revision); assert.ok(output.project.clips.Wave); assert.ok(output.project.assets.models.Tower);
  assert.deepEqual(JSON.parse(JSON.stringify(app.session.model.validateProject(output.project, app.session.sets))), output.project);
  const html = (await http(app, '/api/scene/export?format=html')).value;
  const init = /<script>window\.__assetStudioExport=([\s\S]*?);<\/script>/.exec(html); assert.ok(init);
  const sandbox = { window: {} }; vm.runInNewContext('window.__assetStudioExport=' + init[1], sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.__assetStudioExport)), output);
  assert.ok(!init[1].includes('</script>')); assert.ok(!html.includes('<script>injected()</script>'));
  assert.equal((await http(app, '/api/scene/export?format=zip')).status, 400);
  assert.equal((await http(app, '/api/scene/export?level=Missing')).status, 404);
});

test('an optional capture error explicitly reports the successfully saved revision', async t => {
  const app = await studio(t), before = (await http(app, '/api/state')).value;
  const result = await http(app, '/api/scene/edit', { expectedRevision: before.revision, actions: batch, capture: { times: [-1] } });
  assert.equal(result.status, 200); assert.equal(result.value.applied, true); assert.equal(result.value.capture, undefined);
  assert.equal(result.value.captureError.status, 400); assert.equal(result.value.captureError.revision, result.value.revision);
  const saved = (await http(app, '/api/state')).value; assert.equal(saved.revision, result.value.revision); assert.ok(saved.project.assets.models.Tower);
  assert.equal(saved.revision, before.revision + 1);
});

test('MCP advertises asset schemas and runs compact atomic edits, preview, export and shared undo', async t => {
  const app = await studio(t), client = await mcp(t, app), list = await client.ask('tools/list');
  assert.equal(list.result.tools.length, 14);
  const edit = list.result.tools.find(t => t.name === 'scene_edit'); assert.ok(edit.inputSchema.required.includes('expectedRevision')); assert.ok(edit.inputSchema.properties.actions.items.oneOf.length >= 15);
  const initial = parse(await client.call('scene_get')); assert.equal(initial.project, undefined);
  const catalog = parse(await client.call('asset_catalog', { includeSchema: true })); assert.ok(catalog.examples.createMaterial);
  let receipt = parse(await client.call('scene_edit', { expectedRevision: initial.revision, actions: batch, summary: 'MCP copper tower' }));
  assert.equal(receipt.applied, true); assert.equal(receipt.project, undefined);
  const read = parse(await client.call('scene_get', { type: 'model', id: 'Tower' })); assert.equal(read.inspected.data.parts[0].material, 'copper');
  assert.equal((await client.call('scene_edit', { expectedRevision: initial.revision, actions: [{ type: 'select', id: 'Guide' }] })).result.isError, true);
  for (const actions of [[{ type: 'material_update', id: 'copper', changes: {} }], [{ type: 'select', id: 5 }], [{ type: 'material_create', id: '__proto__', material: {} }]]) assert.equal((await client.call('scene_edit', { expectedRevision: receipt.revision, actions })).result.isError, true);
  const preview = parse(await client.call('scene_preview', { selected: null, time: 200, view: 'iso', grid: true })); assert.equal(preview.workspace, 'scene');
  const exported = parse(await client.call('scene_export')); assert.equal(exported.level, 'Courtyard'); assert.ok(exported.project.assets.materials.copper);
  // Exercise a real edit-plus-capture failure without requiring or launching a browser in this suite.
  const oldPath = process.env.CHROMIUM_PATH; process.env.CHROMIUM_PATH = join(app.dir, 'missing-chromium');
  try { receipt = parse(await client.call('scene_edit', { expectedRevision: receipt.revision, actions: [{ type: 'material_update', id: 'copper', changes: { color: '#ffffff' } }], capture: {} })); }
  finally { if (oldPath === undefined) delete process.env.CHROMIUM_PATH; else process.env.CHROMIUM_PATH = oldPath; }
  assert.equal(receipt.applied, true); assert.equal(receipt.captureError.status, 503); assert.equal(receipt.captureError.revision, receipt.revision);
  const state = parse(await client.call('animation_history', { expectedRevision: receipt.revision, direction: 'undo' }));
  assert.equal(state.project.assets.materials.copper.color, '#b56b3b');
  assert.equal((await client.call('scene_capture', { times: [601] })).result.isError, true);
  assert.equal((await client.call('scene_export', { format: 'zip' })).result.isError, true);
});
