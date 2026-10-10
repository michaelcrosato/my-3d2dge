// Agent contract checks: cold discovery, compact replies, retry recovery, portable exports and responsive stdio.
// Run: node tools/studio-mcp-test.mjs. HTTP fixtures use temporary projects; no model service or GPU is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { createHash } from 'node:crypto';
import { createStudioServer } from './animation-studio.mjs';
import { createMCPHandler, runMCPStdio } from './animation-mcp.mjs';

const bytes = value => Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function studio(t) {
  const dir = await mkdtemp(join(tmpdir(), 'studio-mcp-')), app = await createStudioServer({ port: 0, file: join(dir, 'project.json') });
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  return app;
}
async function client(url, protocolVersion = '2025-11-25') {
  const handle = createMCPHandler({ url }); let id = 0;
  const ask = (method, params) => handle({ jsonrpc: '2.0', id: ++id, method, params });
  const initialized = await ask('initialize', { protocolVersion, capabilities: {}, clientInfo: { name: 'cold-agent-contract', version: '1.0.0' } });
  await handle({ jsonrpc: '2.0', method: 'notifications/initialized' });
  return { ask, initialized, call: (name, args = {}) => ask('tools/call', { name, arguments: args }) };
}
function data(response) {
  assert.equal(response.error, undefined, JSON.stringify(response.error));
  assert.equal(response.result.isError, undefined, JSON.stringify(response.result));
  const value = response.result.structuredContent;
  assert.ok(value && typeof value === 'object', 'JSON replies must be available as structuredContent');
  assert.deepEqual(JSON.parse(response.result.content.find(c => c.type === 'text').text), value, 'Legacy text and structured content must agree');
  return value;
}

test('a new MCP session discovers status, schemas and an atomic animation workflow', async t => {
  const app = await studio(t), c = await client(app.url);
  assert.match(c.initialized.result.instructions, /studio_status/);
  const list = (await c.ask('tools/list')).result.tools;
  assert.equal(list.length, 16);
  for (const name of ['studio_status', 'studio_import', 'scene_edit', 'animation_edit']) assert.ok(list.some(tool => tool.name === name));
  const statusReply = await c.call('studio_status'), status = data(statusReply);
  assert.ok(statusReply.result.content.every(block => block.type === 'text'), 'Capture setup metadata must never become an empty image block');
  assert.equal(status.connectedEditors, 0); assert.equal(status.fileError, null);
  assert.equal(typeof status.capture.ready, 'boolean'); assert.equal(status.editorUrl, app.url + '/asset-studio');
  const initial = data(await c.call('animation_get', { includeSchema: true }));
  assert.equal(initial.project, undefined); assert.equal(initial.inspected.id, 'Wave');
  assert.equal(initial.schema.fields.armR, 5); assert.equal(initial.schema.assets, undefined);
  const edited = data(await c.call('animation_edit', {
    expectedRevision: initial.revision, requestId: 'cold-agent:greeting:1', summary: 'Raise and lower the greeting hand',
    actions: [
      { type: 'create', name: 'Agent greeting', duration: 2, preset: 'neutral' },
      { type: 'edit_key', id: 'Agent greeting', time: .5, values: { armR: [0, 0, 100, 35, 0] } },
      { type: 'edit_key', id: 'Agent greeting', time: 1.5, values: { armR: [0, 0, 20, 5, 0] } }
    ]
  }));
  assert.equal(edited.revision, initial.revision + 1); assert.equal(edited.selected, 'Agent greeting');
  assert.deepEqual(edited.changed.clips, ['Agent greeting']); assert.equal(edited.project, undefined);
  const inspected = data(await c.call('animation_get', { id: 'Agent greeting' }));
  assert.deepEqual(inspected.inspected.clip.keys.find(k => k.t === .5).armR, [0, 0, 100, 35, 0]);
  const undone = data(await c.call('animation_history', { expectedRevision: edited.revision, requestId: 'cold-agent:undo:1', direction: 'undo' }));
  assert.deepEqual(undone.clips.map(clip => clip.id), ['Wave']);
  const redone = data(await c.call('animation_history', { expectedRevision: undone.revision, requestId: 'cold-agent:redo:1', direction: 'redo' }));
  assert.equal(redone.selected, 'Agent greeting');
});

test('animation reads and edit receipts stay compact when unrelated animation keys grow', async t => {
  const app = await studio(t), c = await client(app.url);
  const clips = Object.entries(app.session.sets).flatMap(([set, source]) => Object.entries(source.clips).map(([name, clip]) => ({ set, name, keys: clip.keys.length }))).sort((a, b) => b.keys - a.keys).slice(0, 10);
  let state = app.session.snapshot();
  for (const clip of clips) state = app.session.apply({ expectedRevision: state.revision, action: { type: 'import', set: clip.set, clip: clip.name, name: clip.name + ' Copy' } });
  const compact = data(await c.call('animation_get', { id: 'Wave' }));
  const full = data(await c.call('animation_get', { id: 'Wave', full: true }));
  assert.equal(compact.project, undefined); assert.equal(compact.clips.length, 11); assert.ok(full.project.clips[state.project.selected]);
  assert.ok(bytes(full) > bytes(compact) * 10, 'A small selected clip must not re-emit the other ten animations');
  const receipt = data(await c.call('animation_edit', { expectedRevision: compact.revision, action: { type: 'edit_key', id: 'Wave', time: .5, values: { armR: [1, 2, 100, 35, 0] } } }));
  assert.ok(bytes(receipt) < 12000, 'A single-key edit receipt must contain clip metadata, not every pose');
  assert.equal(receipt.inspected, undefined); assert.equal(receipt.project, undefined); assert.deepEqual(receipt.changed.clips, ['Wave']);
  t.diagnostic(JSON.stringify({ fullBytes: bytes(full), compactBytes: bytes(compact), editReceiptBytes: bytes(receipt), importedKeys: clips.reduce((sum, clip) => sum + clip.keys, 0) }));
});

test('protocol errors, schema errors and revision conflicts have distinct actionable responses', async t => {
  const app = await studio(t), c = await client(app.url), initial = data(await c.call('animation_get'));
  const direct = createMCPHandler({ url: app.url });
  for (const id of [null, .5, true, {}, Number.MAX_SAFE_INTEGER + 1]) assert.equal((await direct({ jsonrpc: '2.0', id, method: 'ping' })).error.code, -32600);
  assert.deepEqual((await direct({ jsonrpc: '2.0', id: 'valid-string', method: 'ping' })).result, {});
  assert.equal((await c.call('unknown_tool')).error.code, -32602);
  assert.equal((await c.ask('tools/call', [])).error.code, -32602);
  assert.equal((await c.ask('tools/call', { name: 'scene_get', arguments: [] })).error.code, -32602);
  const action = { type: 'edit_key', id: 'Wave', time: .5, values: { armR: [0, 0, 100, 35, 0] } };
  for (const args of [
    { expectedRevision: initial.revision, action, actions: [action] },
    { expectedRevision: initial.revision, actions: [action], typo: true },
    { expectedRevision: 'wrong', actions: [action] },
    { expectedRevision: initial.revision, requestId: 'unsafe/id', actions: [action] }
  ]) {
    const response = await c.call('animation_edit', args);
    assert.equal(response.result.isError, true); assert.equal(response.result.structuredContent.code, 'INVALID_ARGUMENT');
    assert.ok(response.result.structuredContent.recovery);
  }
  assert.equal(app.session.snapshot().revision, initial.revision, 'Rejected schemas must not save partial edits');
  const args = { expectedRevision: initial.revision, requestId: 'lost-response:1', action };
  const first = data(await c.call('animation_edit', args));
  const later = data(await c.call('animation_edit', { expectedRevision: first.revision, requestId: 'later-edit:2', action: { type: 'edit_key', id: 'Wave', time: 1, values: { armL: [0, 0, 80, 35, 0] } } }));
  const replay = data(await c.call('animation_edit', args));
  assert.equal(replay.revision, first.revision); assert.equal(replay.replayed, true); assert.equal(replay.currentRevision, later.revision);
  assert.equal(app.session.snapshot().revision, later.revision, 'An uncertain retry must not add another Undo step');
  const conflict = await c.call('animation_edit', { ...args, expectedRevision: later.revision });
  assert.equal(conflict.result.structuredContent.code, 'REQUEST_ID_CONFLICT'); assert.equal(conflict.result.structuredContent.status, 409);
  const stale = await c.call('animation_edit', { ...args, requestId: 'new-stale-request' });
  assert.equal(stale.result.structuredContent.code, 'REVISION_CONFLICT'); assert.equal(stale.result.structuredContent.revision, later.revision);
  assert.match(stale.result.structuredContent.recovery, /[Rr]ead|[Ii]nspect/);
  const invalidBatch = await c.call('animation_edit', { expectedRevision: later.revision, actions: [action, { type: 'delete', id: 'Missing clip' }] });
  assert.equal(invalidBatch.result.structuredContent.actionIndex, 1); assert.equal(invalidBatch.result.structuredContent.actionType, 'delete');
  assert.equal(app.session.snapshot().revision, later.revision, 'A failed action must roll back its whole batch');
});

test('scene exports avoid inline engine source and saved projects round-trip through MCP', async t => {
  const app = await studio(t), c = await client(app.url);
  const original = data(await c.call('scene_export'));
  const response = await c.call('scene_export', { format: 'html' }), exported = data(response);
  assert.ok(exported.bytes > 1000000); assert.ok(bytes(response) < 4000);
  assert.equal(response.result.content.find(block => block.type === 'resource_link').uri, exported.downloadUrl);
  const firstDownload = await (await fetch(exported.downloadUrl)).text();
  assert.equal(createHash('sha256').update(firstDownload).digest('hex'), exported.sha256);
  const changed = data(await c.call('scene_edit', { expectedRevision: original.revision, requestId: 'export:edit', actions: [{ type: 'material_update', id: 'stone', changes: { color: '#112233' } }] }));
  assert.equal(await (await fetch(exported.downloadUrl)).text(), firstDownload, 'Export link must still represent its original revision');
  const imported = data(await c.call('studio_import', { expectedRevision: changed.revision, requestId: 'export:restore', project: original }));
  assert.equal(imported.project, undefined); assert.equal(imported.requestId, 'export:restore');
  const restored = data(await c.call('scene_get', { full: true }));
  assert.deepEqual(restored.project, original.project);
  const inline = await c.call('scene_export', { format: 'html', inline: true });
  assert.match(inline.result.content[0].text, /window\.__assetStudioExport=/); assert.ok(bytes(inline) > 1000000);
  const jsonLink = data(await c.call('scene_export', { format: 'json', inline: false }));
  assert.deepEqual(await (await fetch(jsonLink.downloadUrl)).json(), { ...original, revision: imported.revision });
  const older = await client(app.url, '2024-11-05'), oldResult = await older.call('scene_export', { format: 'html' });
  assert.ok(JSON.parse(oldResult.result.content[0].text).downloadUrl); assert.equal(oldResult.result.structuredContent, undefined);
  assert.ok(oldResult.result.content.every(block => block.type === 'text'), 'Older clients still receive the URL without a newer resource-link content type');
  const animationLinkResult = await c.call('animation_export', { format: 'js', inline: false }), animationLink = data(animationLinkResult);
  assert.equal(animationLinkResult.result.content.find(block => block.type === 'resource_link').uri, animationLink.downloadUrl);
  assert.match(await (await fetch(animationLink.downloadUrl)).text(), /window\.MOCAP/);
  t.diagnostic(JSON.stringify({ htmlBytes: exported.bytes, linkReplyBytes: bytes(response) }));
});

test('stdio serves ping and reads during a capture, and cancellation does not emit a late reply', { timeout: 10000 }, async t => {
  const captureStarted = deferred(), releaseCapture = deferred(), responses = [], input = new PassThrough(), output = new PassThrough();
  const server = http.createServer(async (req, res) => {
    if (req.url === '/api/scene/capture') { captureStarted.resolve(); await releaseCapture.promise; }
    if (res.destroyed) return;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(req.url === '/api/status' ? { revision: 7, connectedEditors: 1 } : { revision: 7, mimeType: 'image/png', data: 'test', times: [0] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const run = runMCPStdio({ input, output, url: 'http://127.0.0.1:' + server.address().port });
  t.after(async () => { releaseCapture.resolve(); input.end(); await run.done(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  let buffer = ''; const waiters = new Map();
  output.on('data', chunk => {
    buffer += chunk;
    for (let end; (end = buffer.indexOf('\n')) >= 0;) {
      const value = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1); responses.push(value);
      waiters.get(value.id)?.resolve(value); waiters.delete(value.id);
    }
  });
  const ask = (id, method, params) => { const waiting = deferred(); waiters.set(id, waiting); input.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); return waiting.promise; };
  await ask(1, 'initialize', { protocolVersion: '2025-11-25' });
  ask(2, 'tools/call', { name: 'scene_capture', arguments: {} }); await captureStarted.promise;
  assert.deepEqual((await ask(3, 'ping')).result, {}, 'Ping must finish before the controlled capture is released');
  assert.equal(data(await ask(4, 'tools/call', { name: 'studio_status', arguments: {} })).connectedEditors, 1);
  input.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 2 } }) + '\n');
  await run.done(); assert.equal(responses.some(response => response.id === 2), false);
  releaseCapture.resolve(); assert.deepEqual((await ask(5, 'ping')).result, {});
});

test('offline status gives a recoverable setup error without claiming success', async t => {
  const server = http.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port; await new Promise(resolve => server.close(resolve));
  const c = await client(url), response = await c.call('studio_status');
  assert.equal(response.result.isError, true); assert.equal(response.result.structuredContent.code, 'STUDIO_UNAVAILABLE');
  assert.match(response.result.structuredContent.recovery, /node tools\/animation-studio\.mjs/);
});
