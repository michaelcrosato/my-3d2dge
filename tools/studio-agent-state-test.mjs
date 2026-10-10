// Agent state contracts: compact reads, atomic animation batches, exact retries, and file-preview freshness.
// Run: node --test tools/studio-agent-state-test.mjs. Uses temporary projects; no browser or network required.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createStudioSession, animationReceipt, REQUEST_CACHE_LIMITS } from './studio-service.mjs';

const plain = value => JSON.parse(JSON.stringify(value));
async function studio(t) {
  const dir = await mkdtemp(join(tmpdir(), 'studio-agent-state-')), session = createStudioSession({ file: join(dir, 'project.json'), watchDebounce: 10000 });
  t.after(async () => { session.close(); await rm(dir, { recursive: true, force: true }); });
  return session;
}
const mirror = { type: 'transform', id: 'Wave', kind: 'mirror' };

test('animation discovery returns one complete clip, compact inventory, and an explicit full snapshot', async t => {
  const s = await studio(t), initial = s.snapshot();
  s.applyBatch({ expectedRevision: initial.revision, actions: Array.from({ length: 12 }, (_, i) => ({ type: 'create', name: 'Motion_' + i, preset: 'wave' })) });
  const state = s.snapshot(), value = s.animation({ id: 'Wave' });
  assert.equal(value.revision, state.revision); assert.equal(value.project, undefined); assert.equal(value.clips.length, 13);
  assert.equal(value.inspected.id, 'Wave'); assert.deepEqual(plain(value.inspected.clip), plain(state.project.clips.Wave.clip));
  assert.equal(value.summary.clips, 13); assert.equal(value.summary.assets, false);
  assert.ok(value.clips.every(c => typeof c.keys === 'number' && !Object.hasOwn(c, 'clip')));
  assert.ok(JSON.stringify(value).length < JSON.stringify(state).length / 3, 'read excludes all unrelated pose keys');
  const schema = s.animation({ includeSchema: true }).schema; assert.equal(schema.fields.armR, 5); assert.equal(schema.assets, undefined);
  assert.deepEqual(plain(s.animation({ full: true }).project), plain(state.project));
  for (const opts of [{ surprise: 1 }, { full: 'yes' }, { id: '' }, { id: 'Missing' }]) assert.throws(() => s.animation(opts));
  assert.deepEqual(plain(s.snapshot()), plain(state));
});

test('100 pose edits make one saved revision, one broadcast, and one undo step', async t => {
  const s = await studio(t), initial = s.snapshot(), events = [];
  s.subscribe((event, value) => { if (event === 'state') events.push(value); });
  const actions = Array.from({ length: 100 }, (_, i) => ({ type: 'edit_key', id: 'Wave', time: (i + 1) / 100, values: { armR: [20, 30, 100, i % 180, 0] } }));
  const untouched = plain(actions), next = s.applyBatch({ expectedRevision: initial.revision, actions, summary: 'Shape the right arm' });
  assert.equal(next.revision, initial.revision + 1); assert.equal(events.length, 1); assert.equal(next.lastChange.summary, 'Shape the right arm');
  assert.deepEqual(actions, untouched); assert.ok(next.project.clips.Wave.clip.keys.length >= 100);
  assert.deepEqual(JSON.parse(await readFile(s.file, 'utf8')), plain(next.project));
  const receipt = animationReceipt(next, initial);
  assert.equal(receipt.project, undefined); assert.equal(receipt.applied, true); assert.deepEqual(receipt.changed.clips, ['Wave']);
  assert.equal(JSON.stringify(receipt).includes('armR'), false);
  const undone = s.applyBatch({ expectedRevision: next.revision, actions: [{ type: 'undo' }] });
  assert.deepEqual(plain(undone.project), plain(initial.project)); assert.equal(undone.canUndo, false); assert.equal(undone.canRedo, true);
});

test('a failed batch preserves disk, revision, history and inputs, and identifies its failed step', async t => {
  const s = await studio(t), original = s.snapshot(), disk = await readFile(s.file, 'utf8');
  const actions = [{ type: 'create', name: 'Temporary' }, { type: 'edit_key', id: 'Temporary', time: .5, values: { armR: [1, 2] } }];
  const untouched = plain(actions);
  assert.throws(() => s.applyBatch({ expectedRevision: original.revision, actions }), err => {
    assert.equal(err.actionIndex, 1); assert.equal(err.actionType, 'edit_key'); assert.match(err.message, /Action 2.*armR/); return true;
  });
  assert.deepEqual(actions, untouched); assert.deepEqual(plain(s.snapshot()), plain(original)); assert.equal(await readFile(s.file, 'utf8'), disk);
  for (const actions of [[], new Array(101).fill(mirror), [mirror, { type: 'undo' }]]) assert.throws(() => s.applyBatch({ expectedRevision: original.revision, actions }));
  assert.deepEqual(plain(s.snapshot()), plain(original));
});

test('one ordered transaction creates an animation and a scene actor that uses it', async t => {
  const s = await studio(t), initial = s.snapshot();
  const next = s.applyBatch({ expectedRevision: initial.revision, actions: [
    { type: 'create', name: 'Greeting', preset: 'wave' },
    { type: 'assets', actions: [{ type: 'object_add', id: 'Speaker', object: { kind: 'actor', clip: 'Greeting', position: [100, 140, 0] } }] }
  ] });
  assert.equal(next.revision, initial.revision + 1); assert.equal(next.project.assets.levels.Courtyard.objects.Speaker.clip, 'Greeting');
  const receipt = animationReceipt(next, initial); assert.deepEqual(receipt.changed.clips, ['Greeting']); assert.equal(receipt.changed.assets, true);
  const undone = s.apply({ expectedRevision: next.revision, action: { type: 'undo' } }); assert.deepEqual(plain(undone.project), plain(initial.project));
});

test('request IDs join in-flight capture and replay its original receipt after newer edits', async t => {
  const s = await studio(t), initial = s.snapshot(), body = { requestId: 'retry-mirror-1', expectedRevision: initial.revision, action: mirror, capture: { times: [0, 1] } };
  let finish, started; const gate = new Promise(resolve => { finish = resolve; }), running = new Promise(resolve => { started = resolve; }); let calls = 0;
  const work = async () => {
    calls++; const state = s.apply(body); started(); await gate;
    return { ...animationReceipt(state, initial), capture: { revision: state.revision, data: 'original PNG' } };
  };
  const first = s.executeRequest(body, 'animation/edit', work); await running;
  const duplicate = s.executeRequest({ capture: { times: [0, 1] }, action: { kind: 'mirror', id: 'Wave', type: 'transform' }, expectedRevision: initial.revision, requestId: body.requestId }, 'animation/edit', work);
  const mirrored = s.snapshot(); assert.equal(mirrored.revision, initial.revision + 1);
  const later = s.apply({ expectedRevision: mirrored.revision, action: { type: 'create', name: 'Later' } });
  finish(); const [a, b] = await Promise.all([first, duplicate]);
  assert.equal(calls, 1); assert.equal(a.revision, mirrored.revision); assert.equal(a.requestId, body.requestId);
  assert.equal(b.replayed, true); assert.equal(b.revision, mirrored.revision); assert.equal(b.currentRevision, later.revision); assert.equal(b.capture.data, 'original PNG');
  a.capture.data = 'caller mutation';
  const again = await s.executeRequest(body, 'animation/edit', work);
  assert.equal(again.capture.data, 'original PNG'); assert.equal(calls, 1); assert.equal(s.snapshot().revision, later.revision);
  for (const [changed, scope] of [[{ ...body, expectedRevision: later.revision }, 'animation/edit'], [{ ...body, capture: { times: [1] } }, 'animation/edit'], [body, 'scene/edit']]) {
    await assert.rejects(s.executeRequest(changed, scope, work), err => err.status === 409 && err.details.code === 'REQUEST_ID_CONFLICT');
  }
  const oneUndo = s.apply({ expectedRevision: later.revision, action: { type: 'undo' } });
  assert.deepEqual(plain(oneUndo.project), plain(mirrored.project));
  const twoUndos = s.apply({ expectedRevision: oneUndo.revision, action: { type: 'undo' } });
  assert.deepEqual(plain(twoUndos.project), plain(initial.project)); assert.equal(twoUndos.canUndo, false);
});

test('failed requests are retryable and evicted IDs cannot silently reapply old revisions', async t => {
  const s = await studio(t), initial = s.snapshot(); let count = 0;
  const failed = { expectedRevision: initial.revision, requestId: 'recoverable-error', action: mirror };
  await assert.rejects(s.executeRequest(failed, 'action', () => { count++; throw new Error('temporary failure'); }), /temporary failure/);
  const repaired = await s.executeRequest(failed, 'action', () => { count++; return s.apply(failed); }); assert.equal(count, 2);
  const firstBody = { expectedRevision: repaired.revision, requestId: 'oldest-success', action: mirror };
  await s.executeRequest(firstBody, 'action', () => s.apply(firstBody));
  for (let i = 0; i < REQUEST_CACHE_LIMITS.entries; i++) {
    const body = { expectedRevision: s.snapshot().revision, requestId: 'bounded-' + i, action: mirror };
    await s.executeRequest(body, 'action', () => { const state = s.apply(body); return { revision: state.revision }; });
  }
  const final = s.snapshot();
  await assert.rejects(s.executeRequest(firstBody, 'action', () => s.apply(firstBody)), err => {
    assert.equal(err.details.code, 'REVISION_CONFLICT'); assert.match(err.details.recovery, /Do not blindly repeat/); return true;
  });
  assert.deepEqual(plain(s.snapshot()), plain(final));
  for (const requestId of ['', 'a b', '__proto__', 'x'.repeat(129), 5]) await assert.rejects(s.executeRequest({ requestId }, 'action', () => assert.fail('invalid request ID reached work')));
});

test('request cache also bounds large completed replies while retaining an in-flight request', async t => {
  const s = await studio(t); let finish; const gate = new Promise(resolve => { finish = resolve; });
  const pendingBody = { requestId: 'pending-large', expectedRevision: s.snapshot().revision }; let pendingCalls = 0;
  const pending = s.executeRequest(pendingBody, 'large', async () => { pendingCalls++; await gate; return { revision: pendingBody.expectedRevision }; });
  const body = { requestId: 'large-oldest', expectedRevision: s.snapshot().revision }; let oldCalls = 0;
  const huge = 'x'.repeat(Math.floor(REQUEST_CACHE_LIMITS.bytes / 2));
  await s.executeRequest(body, 'large', () => { oldCalls++; return { data: huge }; });
  for (let i = 0; i < 2; i++) await s.executeRequest({ requestId: 'large-' + i }, 'large', () => ({ data: huge }));
  await s.executeRequest(body, 'large', () => { oldCalls++; return { data: 'evicted' }; }); assert.equal(oldCalls, 2);
  const joined = s.executeRequest(pendingBody, 'large', () => assert.fail('in-flight entry was evicted'));
  finish(); await pending; assert.equal((await joined).replayed, true); assert.equal(pendingCalls, 1);
});

test('pending request limits reject new work before mutation and still let identical retries join', async t => {
  const s = await studio(t), initial = s.snapshot(); let finish;
  const gate = new Promise(resolve => { finish = resolve; }), calls = [];
  for (let i = 0; i < REQUEST_CACHE_LIMITS.pending; i++) calls.push(s.executeRequest({ requestId: 'pending-' + i }, 'wait', async () => { await gate; return { revision: initial.revision }; }));
  const overflow = { requestId: 'overflow', expectedRevision: initial.revision, action: mirror }; let ran = false;
  await assert.rejects(s.executeRequest(overflow, 'action', () => { ran = true; return s.apply(overflow); }), err => err.status === 429 && err.details.code === 'REQUEST_BUSY');
  assert.equal(ran, false); assert.deepEqual(plain(s.snapshot()), plain(initial));
  const joined = s.executeRequest({ requestId: 'pending-0' }, 'wait', () => assert.fail('same pending request ran twice'));
  finish(); await Promise.all(calls); assert.equal((await joined).replayed, true);
  const result = await s.executeRequest(overflow, 'action', () => s.apply(overflow)); assert.equal(result.revision, initial.revision + 1);
});

test('animation preview sees atomic file edits immediately and invalid-file conflicts give recovery details', async t => {
  const s = await studio(t), original = s.snapshot();
  const renamed = s.model.apply(original.project, { type: 'rename', id: 'Wave', name: 'Renamed' }, s.sets);
  await writeFile(s.file + '.next', JSON.stringify(renamed)); await rename(s.file + '.next', s.file);
  const preview = s.preview({ id: 'Renamed', time: .5, playing: false });
  assert.equal(preview.id, 'Renamed'); assert.equal(preview.revision, original.revision + 1);
  await writeFile(s.file, '{"schema":');
  assert.throws(() => s.apply({ expectedRevision: preview.revision, action: { type: 'select', id: 'Renamed' } }), err => {
    assert.equal(err.status, 409); assert.equal(err.details.code, 'INVALID_PROJECT_FILE'); assert.match(err.details.recovery, /Repair the JSON/); return true;
  });
  assert.equal(await readFile(s.file, 'utf8'), '{"schema":'); assert.equal(s.snapshot().project.selected, 'Renamed');
});
