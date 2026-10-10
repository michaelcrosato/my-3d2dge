// Agent HTTP contracts: compact transactions, retry recovery, imports, status and immutable downloads.
// Uses temporary projects and the real local server; no browser or model service is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createStudioServer } from './animation-studio.mjs';

async function studio(t) {
  const dir = await mkdtemp(join(tmpdir(), 'studio-agent-http-')), file = join(dir, 'project.json');
  const app = await createStudioServer({ port: 0, file, watchDebounce: 1000 });
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  return { ...app, file };
}
async function request(app, path, data, method) {
  const res = await fetch(path.startsWith('http:') ? path : app.url + path, {
    method: method || (data === undefined ? 'GET' : 'POST'),
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  const raw = await res.text(); let value; try { value = JSON.parse(raw); } catch { value = raw; }
  return { status: res.status, value, raw, headers: res.headers };
}
const saved = async app => (await request(app, '/api/state')).value;
const action = (app, revision, value, requestId) => request(app, '/api/animation/edit', {
  expectedRevision: revision, action: value, ...(requestId ? { requestId } : {})
});

test('status discovers editor connections, capture setup and invalid watched data without launching a browser', async t => {
  const app = await studio(t), initial = await saved(app);
  let status = (await request(app, '/api/status')).value;
  assert.equal(status.revision, initial.revision); assert.equal(status.connectedEditors, 0);
  assert.equal(status.capture.warm, false); assert.equal(typeof status.capture.ready, 'boolean');
  assert.equal(status.retry.requestId, true); assert.equal(status.fileError, null);
  const abort = new AbortController();
  const events = await fetch(app.url + '/api/events', { signal: abort.signal });
  t.after(() => abort.abort()); assert.equal(events.status, 200);
  status = (await request(app, '/api/status')).value; assert.equal(status.connectedEditors, 1);
  await writeFile(app.file, '{unfinished');
  status = (await request(app, '/api/status')).value;
  assert.match(status.fileError, /not loaded/); assert.equal(status.revision, initial.revision);
  assert.equal(await readFile(app.file, 'utf8'), '{unfinished');
  await writeFile(app.file, JSON.stringify(initial.project));
  status = (await request(app, '/api/status')).value; assert.equal(status.fileError, null);
});

test('compact reads and animation batches preserve one revision, one history step and actionable failures', async t => {
  const app = await studio(t), initial = await saved(app);
  const read = (await request(app, '/api/animation')).value;
  assert.equal(read.project, undefined); assert.equal(read.inspected.id, 'Wave'); assert.ok(read.inspected.clip.keys.length);
  assert.deepEqual((await request(app, '/api/animation?full=true')).value.project, initial.project);
  assert.equal((await request(app, '/api/animation?full=perhaps')).status, 400);
  const edit = await request(app, '/api/animation/edit', { expectedRevision: initial.revision, actions: [
    { type: 'create', name: 'Salute', duration: 2 },
    { type: 'edit_key', id: 'Salute', time: .7, values: { armR: [10, 20, 100, 50, 0] } },
    { type: 'edit_key', id: 'Salute', time: 1.2, values: { armR: [20, 60, 90, 70, 0] } }
  ], summary: 'Author a salute' });
  assert.equal(edit.status, 200, edit.raw); assert.equal(edit.value.revision, initial.revision + 1);
  assert.equal(edit.value.project, undefined); assert.equal(edit.value.applied, true);
  const after = await saved(app); assert.equal(after.project.clips.Salute.clip.keys.length, 4);
  const failed = await request(app, '/api/animation/edit', { expectedRevision: after.revision, actions: [
    { type: 'transform', id: 'Salute', kind: 'mirror' },
    { type: 'edit_key', id: 'Salute', time: 1, values: { armR: [0, 0] } }
  ] });
  assert.equal(failed.status, 400); assert.equal(typeof failed.value.code, 'string');
  assert.deepEqual(await saved(app), after);
  assert.equal((await request(app, '/api/animation/edit', { expectedRevision: after.revision, action: { type: 'undo' }, actions: [{ type: 'redo' }] })).status, 400);
  const undo = await action(app, after.revision, { type: 'undo' }); assert.equal(undo.status, 200);
  assert.deepEqual((await saved(app)).project, initial.project);
});

test('a lost response can be retried after later edits without repeating a mirror or undo', async t => {
  const app = await studio(t), initial = await saved(app);
  const input = { expectedRevision: initial.revision, requestId: 'agent:mirror.1', action: { type: 'transform', id: 'Wave', kind: 'mirror' } };
  const first = await request(app, '/api/animation/edit', input); assert.equal(first.status, 200, first.raw);
  const second = await action(app, first.value.revision, { type: 'create', name: 'Later' }); assert.equal(second.status, 200);
  const beforeRetry = await saved(app), retried = await request(app, '/api/animation/edit', input);
  assert.equal(retried.status, 200, retried.raw); assert.equal(retried.value.replayed, true);
  assert.equal(retried.value.revision, first.value.revision); assert.equal(retried.value.currentRevision, beforeRetry.revision);
  assert.deepEqual(await saved(app), beforeRetry);
  const changed = await request(app, '/api/animation/edit', { ...input, expectedRevision: beforeRetry.revision });
  assert.equal(changed.status, 409); assert.equal(changed.value.code, 'REQUEST_ID_CONFLICT');
  const history = { expectedRevision: beforeRetry.revision, requestId: 'agent:undo.1', action: { type: 'undo' } };
  const undone = await request(app, '/api/animation/edit', history); assert.equal(undone.status, 200);
  assert.equal((await request(app, '/api/animation/edit', history)).value.replayed, true);
  assert.equal((await saved(app)).revision, undone.value.revision);
});

test('concurrent identical requests share a result; capture failure still leaves one saved edit', async t => {
  const app = await studio(t), initial = await saved(app);
  const input = { expectedRevision: initial.revision, requestId: 'concurrent-create', action: { type: 'create', name: 'Once' }, capture: { times: [-1] } };
  const results = await Promise.all([request(app, '/api/animation/edit', input), request(app, '/api/animation/edit', input)]);
  for (const result of results) {
    assert.equal(result.status, 200, result.raw); assert.equal(result.value.revision, initial.revision + 1);
    assert.equal(result.value.captureError.status, 400); assert.equal(result.value.captureError.revision, result.value.revision);
  }
  assert.equal(results.filter(r => r.value.replayed).length, 1);
  assert.equal((await saved(app)).revision, initial.revision + 1);
  const retry = await request(app, '/api/animation/edit', input); assert.equal(retry.value.replayed, true);
  assert.deepEqual(retry.value.captureError, results[0].value.captureError);
});

test('scene JSON can roundtrip through compact project import and be undone, with safe retries', async t => {
  const app = await studio(t), initial = await saved(app);
  const exported = (await request(app, '/api/scene/export')).value;
  exported.project.name = 'Imported courtyard';
  const input = { expectedRevision: initial.revision, requestId: 'project:import', project: exported };
  const imported = await request(app, '/api/project?compact=true', input, 'PUT');
  assert.equal(imported.status, 200, imported.raw); assert.equal(imported.value.project, undefined);
  assert.equal(imported.value.name, 'Imported courtyard'); assert.ok(imported.value.scene.initialized);
  const retry = await request(app, '/api/project?compact=true', input, 'PUT'); assert.equal(retry.value.replayed, true);
  assert.equal((await saved(app)).revision, imported.value.revision);
  await action(app, imported.value.revision, { type: 'undo' }); assert.deepEqual((await saved(app)).project, initial.project);
});

test('download links hold immutable content after edits and report bytes and digest accurately', async t => {
  const app = await studio(t), initial = await saved(app);
  const link = await request(app, '/api/scene/export?format=html&delivery=link'); assert.equal(link.status, 200, link.raw);
  assert.ok(link.raw.length < 1500); assert.equal(link.value.revision, initial.revision);
  assert.equal(link.value.mimeType, 'text/html'); assert.ok(link.value.bytes > 100000);
  const original = await request(app, link.value.downloadUrl); assert.equal(original.status, 200);
  assert.equal(Buffer.byteLength(original.raw), link.value.bytes);
  assert.equal(createHash('sha256').update(original.raw).digest('hex'), link.value.sha256);
  const changed = await action(app, initial.revision, { type: 'create', name: 'NewerClip' }); assert.equal(changed.status, 200);
  const again = await request(app, link.value.downloadUrl); assert.equal(again.raw, original.raw);
  assert.equal(again.headers.get('content-disposition'), 'attachment; filename="Courtyard.html"');
  const head = await request(app, link.value.downloadUrl, undefined, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.raw, '');
  assert.equal(Number(head.headers.get('content-length')), link.value.bytes);
  const missing = await request(app, '/api/download/' + '0'.repeat(64) + '/missing.html');
  assert.equal(missing.status, 410); assert.equal(missing.value.code, 'EXPORT_EXPIRED');
  const clip = (await request(app, '/api/export?delivery=link')).value;
  const clipData = (await request(app, clip.downloadUrl)).value; assert.ok(clipData.clips.NewerClip);
});

test('download storage is bounded and expired links fail with a recovery action', async t => {
  const app = await studio(t); let state = await saved(app), oldest;
  for (let i = 0; i < 17; i++) {
    const output = (await request(app, '/api/scene/export?delivery=link')).value;
    if (i === 0) oldest = output.downloadUrl;
    if (i < 16) {
      await action(app, state.revision, { type: 'edit_key', id: 'Wave', time: .9, values: { head: [i + 1, 0, 0] } });
      state = await saved(app);
    }
  }
  const expired = await request(app, oldest); assert.equal(expired.status, 410);
  assert.match(expired.value.recovery, /export/);
});
