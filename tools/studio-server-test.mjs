// Animation Studio integration checks: real HTTP, SSE, file replacement, restart and a real MCP stdio process.
// Run: node tools/studio-server-test.mjs. Capture also runs when the built page and local Chromium are available.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { createInterface } from 'node:readline';
import vm from 'node:vm';
import { createStudioServer } from './animation-studio.mjs';
import { REPO_ROOT, MAX_BYTES } from './studio-service.mjs';
import { validateStudioURL } from './animation-mcp.mjs';

async function studio(t) {
  const dir = await mkdtemp(join(tmpdir(), 'animation-studio-')), file = join(dir, 'project.json');
  const app = await createStudioServer({ port: 0, file, watchDebounce: 25 });
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  return { ...app, dir, file };
}
async function http(app, path, data, options = {}) {
  const response = await fetch(app.url + path, { method: data === undefined ? 'GET' : 'POST', headers: data === undefined ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), ...options });
  const raw = await response.text(); let value; try { value = JSON.parse(raw); } catch { value = raw; }
  return { status: response.status, value, headers: response.headers };
}
async function rawHTTP(app, path, headers) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(app.url + path, { headers }, res => {
      const chunks = []; res.on('data', d => chunks.push(d));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    }); req.on('error', reject); req.end();
  });
}
async function events(app) {
  const controller = new AbortController(), response = await fetch(app.url + '/api/events', { signal: controller.signal });
  assert.equal(response.status, 200);
  const reader = response.body.getReader(), queue = [], waiting = []; let buffer = '', stopped = false;
  const dispatch = entry => {
    const i = waiting.findIndex(w => w.event === entry.event && (!w.predicate || w.predicate(entry.data)));
    if (i < 0) queue.push(entry); else { const w = waiting.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(entry.data); }
  };
  const pumping = (async () => {
    const decoder = new TextDecoder();
    try { while (!stopped) {
      const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
      let end; while ((end = buffer.indexOf('\n\n')) >= 0) {
        const record = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        const event = /^event: (.+)$/m.exec(record)?.[1], raw = /^data: (.+)$/m.exec(record)?.[1];
        if (event && raw) dispatch({ event, data: JSON.parse(raw) });
      }
    } } catch (err) { if (!stopped) for (const w of waiting.splice(0)) { clearTimeout(w.timer); w.reject(err); } }
  })();
  return {
    next(event, predicate, timeout = 5000) {
      const i = queue.findIndex(x => x.event === event && (!predicate || predicate(x.data)));
      if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0].data);
      return new Promise((resolve, reject) => {
        const w = { event, predicate, resolve, reject, timer: setTimeout(() => { const i = waiting.indexOf(w); if (i >= 0) waiting.splice(i, 1); reject(new Error('Timed out waiting for SSE ' + event)); }, timeout) }; waiting.push(w);
      });
    },
    async close() { stopped = true; controller.abort(); await pumping; for (const w of waiting.splice(0)) { clearTimeout(w.timer); w.reject(new Error('SSE closed.')); } }
  };
}
async function mcp(t, app) {
  const child = spawn(process.execPath, [join(REPO_ROOT, 'tools/animation-mcp.mjs'), '--url', app.url], { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map(), errors = []; let stderr = '', count = 0, nextID = 1;
  child.stderr.on('data', d => { stderr += d; });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    count++;
    let value; try { value = JSON.parse(line); } catch (err) { errors.push('Non-JSON stdout: ' + line); return; }
    const item = pending.get(value.id);
    if (!item) { errors.push('Unexpected JSON-RPC response: ' + line); return; }
    pending.delete(value.id); clearTimeout(item.timer); item.resolve(value);
  });
  child.on('exit', (code, signal) => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('MCP exited: ' + code + '/' + signal + ' ' + stderr)); } pending.clear(); });
  t.after(async () => { child.stdin.end(); if (child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve)); } lines.close(); assert.deepEqual(errors, []); });
  const write = (data, id, timeout = 15000) => new Promise((resolve, reject) => { const timer = setTimeout(() => { pending.delete(id); reject(new Error('MCP response timed out: ' + id + ' ' + stderr)); }, timeout); pending.set(id, { resolve, reject, timer }); child.stdin.write(data + '\n'); });
  return {
    ask(method, params, timeout) { const id = nextID++; return write(JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }), id, timeout); },
    raw(line) { return write(line, null); },
    notify(method) { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method }) + '\n'); },
    get count() { return count; }
  };
}
const parseTool = response => { assert.equal(response.result.isError, undefined, response.result.content[0].text); return JSON.parse(response.result.content[0].text); };

test('HTTP edits, SSE, revision conflicts, undo/redo and native export share one state', async t => {
  const app = await studio(t), a = await events(app), b = await events(app); t.after(() => Promise.all([a.close(), b.close()]));
  const initial = (await http(app, '/api/state')).value;
  assert.equal(initial.project.selected, 'Wave'); assert.equal(initial.canUndo, false);
  assert.equal((await a.next('state')).revision, initial.revision); assert.equal((await b.next('state')).revision, initial.revision);
  const cat = await http(app, '/api/catalog?query=walk&limit=2');
  assert.equal(cat.status, 200); assert.equal(cat.value.clips.length, 2); assert.ok(cat.value.total > 2); assert.equal(cat.value.nextOffset, 2);
  const source = await http(app, '/api/clip?set=quaternius&name=Walk_Loop');
  assert.equal(source.value.clip.clip, 'Walk_Loop'); assert.ok(source.value.source.rest); assert.match(source.value.credit, /Quaternius/);
  const schema = (await http(app, '/api/schema')).value; assert.equal(schema.fields.armR, 5); assert.match(schema.legend, /hips/);
  const action = { type: 'create', name: 'New motion', preset: 'neutral', duration: 3 };
  let response = await http(app, '/api/action', { expectedRevision: initial.revision, action, source: 'editor', summary: 'New motion created' });
  assert.equal(response.status, 200); let state = response.value;
  assert.equal(state.project.selected, 'New motion'); assert.equal(state.project.clips['New motion'].clip.dur, 3); assert.equal(state.canUndo, true);
  assert.equal((await a.next('state', s => s.revision === state.revision)).lastChange.source, 'editor');
  assert.equal((await b.next('state', s => s.revision === state.revision)).project.selected, 'New motion');
  response = await http(app, '/api/action', { expectedRevision: initial.revision, action: { type: 'delete', id: 'Wave' } });
  assert.equal(response.status, 409); assert.equal(response.value.revision, state.revision);
  response = await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'edit_key', id: 'New motion', time: 1, values: { armR: [1, 2] } } });
  assert.equal(response.status, 400); assert.equal((await http(app, '/api/state')).value.revision, state.revision);
  response = await http(app, '/api/preview', { playing: false, time: .75, facing: 90, bones: true });
  assert.equal(response.status, 200); assert.equal((await a.next('preview')).time, .75); assert.equal((await http(app, '/api/state')).value.revision, state.revision);
  state = (await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'undo' } })).value;
  assert.equal(state.project.selected, 'Wave'); assert.equal(state.canRedo, true); assert.equal(state.project.clips['New motion'], undefined);
  state = (await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'redo' } })).value;
  assert.equal(state.project.selected, 'New motion');
  assert.deepEqual(JSON.parse(await readFile(app.file, 'utf8')), state.project);
  const exported = (await http(app, '/api/export?id=New%20motion')).value;
  assert.equal(exported.set, 'STUDIO'); assert.equal(exported.clips['New motion'].dur, 3); assert.ok(exported.sources[exported.clips['New motion'].src].rest); assert.ok(exported.credit);
  const script = (await http(app, '/api/export?id=New%20motion&format=js')).value;
  const sandbox = { window: {} }; vm.runInNewContext(script, sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.MOCAP.STUDIO)), exported);
  assert.equal((await http(app, '/api/project')).value.name, 'Animation Studio');
  const changed = structuredClone(state.project); changed.name = 'Imported project';
  response = await http(app, '/api/project', { expectedRevision: state.revision, project: changed }, { method: 'PUT' });
  assert.equal(response.status, 200); assert.equal(response.value.project.name, 'Imported project');
});

test('HTTP rejects remote origins, unlisted files, invalid formats and missing revisions', async t => {
  const app = await studio(t), state = (await http(app, '/api/state')).value;
  assert.equal((await rawHTTP(app, '/api/state', { Host: 'attacker.example:' + app.port })).status, 403);
  assert.equal((await http(app, '/api/state', undefined, { headers: { Origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await http(app, '/api/state', undefined, { headers: { Origin: 'null' } })).status, 403);
  assert.equal((await http(app, '/api/state', undefined, { headers: { Origin: app.url } })).status, 200);
  for (const path of ['/package.json', '/.env', '/.animation-studio/project.json', '/src/mocap/sets/quaternius.js', '/api/clip?set=__proto__&name=x']) assert.equal((await http(app, path)).status, 404);
  assert.equal((await http(app, '/api/action', { action: { type: 'undo' } })).status, 400);
  assert.equal((await http(app, '/api/action', {}, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await http(app, '/api/action', {}, { body: '{' })).status, 400);
  assert.equal((await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'undo' } }, { headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await http(app, '/api/action', {}, { body: ' '.repeat(MAX_BYTES + 1) })).status, 413);
  assert.equal((await http(app, '/api/preview', { facing: 300 })).status, 400);
  assert.equal((await http(app, '/api/capture', { times: [-1] })).status, 400);
  assert.equal((await http(app, '/api/state')).value.revision, state.revision);
});

test('preview without an id resolves the saved selection after a transient preview', async t => {
  const app = await studio(t), stream = await events(app); t.after(() => stream.close());
  let state = await stream.next('state');
  state = (await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'create', name: 'Short', duration: .5 } })).value;
  assert.equal(state.project.selected, 'Short');
  let preview = await http(app, '/api/preview', { id: 'Wave', time: 1.5, playing: false });
  assert.equal(preview.status, 200); assert.equal((await stream.next('preview')).id, 'Wave');
  preview = await http(app, '/api/preview', { time: .25 });
  assert.equal(preview.status, 200); assert.equal(preview.value.id, 'Short');
  const event = await stream.next('preview'); assert.equal(event.id, 'Short'); assert.equal(event.time, .25);
  assert.equal((await http(app, '/api/preview', { time: 1.5 })).status, 400);
  const unchanged = (await http(app, '/api/state')).value;
  assert.equal(unchanged.project.selected, 'Short'); assert.equal(unchanged.revision, state.revision);
});

test('atomic watched-file changes are live, invalid files stay intact, and saved projects survive restart', async t => {
  const app = await studio(t), stream = await events(app); t.after(() => stream.close());
  let state = await stream.next('state'), project = structuredClone(state.project); project.name = 'External edit';
  await writeFile(app.file + '.next', JSON.stringify(project)); await rename(app.file + '.next', app.file);
  state = await stream.next('state', s => s.project.name === 'External edit');
  assert.equal(state.lastChange.source, 'file'); assert.equal(state.canUndo, true);
  await writeFile(app.file, '{"schema":');
  const error = await stream.next('error'); assert.match(error.error, /last valid animation/);
  assert.equal((await http(app, '/api/state')).value.revision, state.revision);
  assert.equal((await http(app, '/api/action', { expectedRevision: state.revision, action: { type: 'rename', id: 'Wave', name: 'Blocked' } })).status, 409);
  assert.equal(await readFile(app.file, 'utf8'), '{"schema":');
  project.name = 'Repaired file'; await writeFile(app.file + '.next', JSON.stringify(project)); await rename(app.file + '.next', app.file);
  state = await stream.next('state', s => s.project.name === 'Repaired file');
  await stream.close(); await app.close();
  const restarted = await createStudioServer({ port: 0, file: app.file }); t.after(() => restarted.close());
  const read = (await http(restarted, '/api/state')).value;
  assert.deepEqual(read.project, state.project); assert.notEqual(read.revision, state.revision); assert.equal(read.canUndo, false);
  await restarted.close();
  await writeFile(app.file, '{bad data');
  await assert.rejects(createStudioServer({ port: 0, file: app.file }), /file was left unchanged/);
  assert.equal(await readFile(app.file, 'utf8'), '{bad data');
});

test('history retains the last 50 edits and a failed action leaves history intact', async t => {
  const app = await studio(t); let state = app.session.snapshot();
  for (let i = 0; i < 55; i++) state = app.session.apply({ expectedRevision: state.revision, action: { type: 'transform', id: 'Wave', kind: 'mirror' } });
  assert.throws(() => app.session.apply({ expectedRevision: state.revision, action: { type: 'undo', typo: true } }), /only the type field/);
  assert.equal(app.session.snapshot().revision, state.revision);
  for (let i = 0; i < 50; i++) state = app.session.apply({ expectedRevision: state.revision, action: { type: 'undo' } });
  assert.equal(state.canUndo, false); assert.equal(state.canRedo, true);
  assert.throws(() => app.session.apply({ expectedRevision: state.revision, action: { type: 'undo' } }), /no edit to undo/);
  assert.equal(app.session.snapshot().revision, state.revision);
});

test('MCP stdio initializes, advertises schemas, applies an edit and returns errors without protocol noise', async t => {
  const app = await studio(t), client = await mcp(t, app);
  assert.equal((await client.ask('tools/list')).error.code, -32002);
  const initialized = await client.ask('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'studio-test', version: '1' } });
  assert.equal(initialized.result.protocolVersion, '2025-11-25'); assert.ok(initialized.result.capabilities.tools);
  client.notify('notifications/initialized'); assert.deepEqual((await client.ask('ping')).result, {});
  const list = await client.ask('tools/list'); assert.equal(list.result.tools.length, 16);
  assert.ok(list.result.tools.find(t => t.name === 'animation_edit').inputSchema.required.includes('expectedRevision'));
  for (const name of ['studio_status', 'studio_import']) assert.ok(list.result.tools.some(tool => tool.name === name), name);
  assert.equal((await client.raw('{invalid JSON')).error.code, -32700);
  assert.equal((await client.ask('does/not/exist')).error.code, -32601);
  const call = (name, args, timeout) => client.ask('tools/call', { name, arguments: args }, timeout);
  let state = parseTool(await call('animation_get', { includeSchema: true })); assert.equal(state.selected, 'Wave'); assert.equal(state.schema.fields.armL, 5);
  assert.equal(state.project, undefined); assert.equal(state.inspected.id, 'Wave'); assert.ok(state.inspected.clip.keys.length);
  const before = state.revision;
  state = parseTool(await call('animation_create', { expectedRevision: before, name: 'MCP wave', duration: 2, preset: 'wave' }));
  assert.equal(state.selected, 'MCP wave'); assert.equal(state.project, undefined);
  const stale = await call('animation_edit', { expectedRevision: before, action: { type: 'delete', id: 'Wave' } });
  assert.equal(stale.result.isError, true); assert.match(stale.result.content[0].text, /Revision conflict/);
  state = parseTool(await call('animation_edit', { expectedRevision: state.revision, action: { type: 'edit_key', id: 'MCP wave', time: .5, values: { armR: [20, 40, 100, 60, 0] } } }));
  assert.equal(state.project, undefined);
  const inspected = parseTool(await call('animation_get', { id: 'MCP wave' }));
  assert.equal(inspected.revision, state.revision);
  assert.deepEqual(inspected.inspected.clip.keys.find(k => k.t === .5).armR, [20, 40, 100, 60, 0]);
  assert.equal((await call('animation_edit', { action: { type: 'undo' } })).result.isError, true);
  assert.equal((await call('animation_unknown', {})).error.code, -32602);
  const exported = parseTool(await call('animation_export', { id: 'MCP wave' })); assert.equal(exported.clips['MCP wave'].dur, 2); assert.ok(exported.sources);
  if (existsSync(join(REPO_ROOT, 'examples/animation-studio.html'))) {
    const capture = await call('animation_capture', { id: 'MCP wave', times: [0, .5, 1], view: 'side', cast: 'mannequin' }, 90000);
    if (capture.result.isError) {
      assert.match(capture.result.content[0].text, /Capture needs Playwright|Capture cannot start Chromium/); t.diagnostic('Capture skipped: local Playwright or Chromium is not installed.');
    } else {
      const image = capture.result.content.find(c => c.type === 'image'); assert.equal(image.mimeType, 'image/png');
      assert.equal(Buffer.from(image.data, 'base64').subarray(1, 4).toString(), 'PNG');
      const meta = JSON.parse(capture.result.content.find(c => c.type === 'text').text); assert.equal(meta.revision, state.revision); assert.deepEqual(meta.times, [0, .5, 1]);
    }
  } else t.diagnostic('Capture skipped: run npm run build to create the page.');
  const full = parseTool(await call('animation_get', { full: true }));
  assert.equal(full.revision, state.revision);
  assert.deepEqual(JSON.parse(await readFile(app.file, 'utf8')), full.project);
  assert.equal(validateStudioURL('http://localhost:4173'), 'http://127.0.0.1:4173');
  for (const url of ['https://127.0.0.1:4173', 'http://attacker.example', 'http://127.0.0.1:4173/file', 'http://name:secret@127.0.0.1:4173']) assert.throws(() => validateStudioURL(url));
});
