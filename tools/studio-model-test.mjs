// Animation Studio model checks: source compatibility, atomic edits, exact sampling,
// transformations and portable exports. Runs in Node without a display or new packages.
// Usage: node tools/studio-model-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { MR, readSet } from './mocap-lib.mjs';

const source = new URL('../src/animation-studio/model.js', import.meta.url), context = { MocapReadable: MR };
vm.runInNewContext(readFileSync(source, 'utf8'), context, { filename: fileURLToPath(source) });
const M = context.AnimationStudioModel;
const sets = Object.fromEntries(['quaternius', 'mesh2motion', 'cmu', 'hero'].map(name => [name, readSet(new URL('../src/mocap/sets/' + name + '.js', import.meta.url))]));
const json = value => JSON.stringify(value), plain = value => JSON.parse(json(value));
const equal = (a, b, label) => assert.deepEqual(plain(a), plain(b), label);
const base = () => M.createProject(sets), current = p => p.clips[p.selected].clip;
const action = (p, a) => M.apply(p, a, sets);
const rest = (set, clip) => {
  const body = set.sources[Object.keys(set.sources)[0]].rest, own = set.sources[clip.src].rest;
  return Object.assign({}, body, { spineW: own.spineW, neckW: own.neckW });
};
const sample = (c, t, set = sets.quaternius) => MR.pose(rest(set, c), Object.assign({}, c, { loop: false }), t);
const near = (a, b, message, tolerance = .002) => assert.ok(MR.error(a, b) <= tolerance, message + ': ' + MR.error(a, b) + ' mm');
let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok  ' + name); }
  catch (error) { console.error('FAIL ' + name + '\n' + error.stack); process.exitCode = 1; }
}

test('all repository clips validate without changing source data', () => {
  let clips = 0, rounded = 0;
  for (const [name, set] of Object.entries(sets)) for (const c of Object.values(set.clips)) {
    const before = json(c), validated = M.validateClip(c);
    equal(validated, c, name + '/' + c.clip); assert.equal(json(c), before);
    if (c.keys.at(-1).t !== c.dur) rounded++;
    for (const t of [0, c.dur * .25, c.dur * .5, c.dur * .75, c.dur]) assert.ok(Array.from(sample(validated, t, set)).every(Number.isFinite), name + '/' + c.clip + ' has a finite pose');
    clips++;
  }
  assert.equal(clips, 340); assert.ok(rounded > 0, 'test imported frame rounding');
});

test('new projects contain original motion with neutral loop endpoints', () => {
  const p = base(), c = current(p);
  assert.equal(p.selected, 'Wave'); assert.equal(c.dur, 2); assert.equal(c.loop, true);
  assert.equal(c.keys.length, 8); assert.equal(c.orig, undefined);
  assert.ok(c.tags.includes('authored'));
  near(sample(c, 0), sample(c, c.dur), 'wave loop closes');
  assert.ok(MR.error(sample(c, 0), sample(c, .6)) > 100, 'wave moves the arm');
  const other = base(); c.keys[0].hips[2] = 50;
  assert.equal(current(other).keys[0].hips[2], 100, 'new projects do not share mutable keys');
  for (const [field, length] of Object.entries(M.FIELDS)) assert.equal(typeof length, 'number', field);
});

test('text parsing accepts the codec legend and reports invalid JSON', () => {
  const c = current(base());
  equal(M.validateClip(MR.LEGEND + '\n' + MR.text(c)), c);
  assert.throws(() => M.validateClip('{'), /Clip JSON is invalid/);
  assert.throws(() => M.validateClip('null'), /must be an object/);
});

test('bad shapes, time values, directions and channels are rejected', () => {
  const invalid = (mutate, pattern) => {
    const c = M.clone(current(base())); mutate(c);
    assert.throws(() => M.validateClip(c), pattern);
  };
  invalid(c => { c.keys[0].hips = [0, 100]; }, /hips.*3 numbers/);
  invalid(c => { c.keys[0].hips = [0, undefined, 100]; }, /finite number/);
  invalid(c => { delete c.keys[0].hips[1]; }, /finite number/);
  invalid(c => { c.keys[0].armR = [0, 0, 0, 10, 0]; }, /nonzero direction/);
  invalid(c => { c.keys[0].armR[3] = 181; }, /bend.*0 to 180/);
  invalid(c => { c.keys[0].legR[3] = -1; }, /bend/);
  invalid(c => { c.keys[0].body[1] = NaN; }, /finite number/);
  invalid(c => { c.keys[0].body[1] = Infinity; }, /finite number/);
  invalid(c => { c.keys[0].body[1] = 100001; }, /finite number/);
  invalid(c => { c.keys[0].t = .01; }, /first key/);
  invalid(c => { c.keys[1].t = c.keys[0].t; }, /greater than/);
  invalid(c => { c.keys[1].t = c.keys[2].t + .01; }, /greater than/);
  invalid(c => { c.keys.at(-1).t = c.dur + .1; }, /time.*finite number/);
  invalid(c => { c.keys[1].t = Infinity; }, /time.*finite number/);
  invalid(c => { c.dur = -1; }, /duration/);
  invalid(c => { c.dur = 601; }, /duration/);
  invalid(c => { c.loop = 'true'; }, /loop/);
  invalid(c => { c.keys = []; }, /1 to 2000/);
  invalid(c => { c.keys = Array.from({ length: 2001 }, () => c.keys[0]); }, /1 to 2000/);
  invalid(c => { c.keys[0].root = [0, 0]; }, /root.*every key/);
  invalid(c => { c.keys[0].blade = [0, 100, 0]; }, /blade.*every key/);
  invalid(c => { c.keys[0].unknown = [1]; }, /unknown field/);
  invalid(c => { c.tags = ['ok', 3]; }, /tag/);
  // Parsing must not silently sort an out-of-order string before validation.
  const c = M.clone(current(base())); [c.keys[1], c.keys[2]] = [c.keys[2], c.keys[1]];
  assert.throws(() => M.validateClip(json(c)), /greater than/);
});

test('project validation requires known sets, sources, names and selection', () => {
  const invalid = (mutate, pattern) => { const p = base(); mutate(p); assert.throws(() => M.validateProject(p, sets), pattern); };
  invalid(p => { p.schema = 2; }, /schema/);
  invalid(p => { p.selected = 'missing'; }, /selected/);
  invalid(p => { p.clips.Wave.set = 'missing'; }, /Unknown animation set/);
  invalid(p => { p.clips.Wave.clip.src = 'missing'; }, /source.*not in set/);
  invalid(p => { p.clips.Wave.clip.clip = 'other'; }, /same name/);
  invalid(p => { p.clips = {}; }, /1 to 128/);
  invalid(p => { p.clips = Object.fromEntries([['__proto__', p.clips.Wave]]); }, /reserved/);
  invalid(p => { p.clips = Object.fromEntries(Array.from({ length: 129 }, (_, i) => ['Clip ' + i, p.clips.Wave])); }, /1 to 128/);
  assert.throws(() => M.newClip({ name: 'bad/name' }, sets), /reserved/);
});

test('import keeps source keys, capture details and existing ancestry', () => {
  const original = sets.quaternius.clips.Idle_Loop;
  const record = M.importClip(sets, 'quaternius', 'Idle_Loop', 'My Idle');
  assert.equal(record.clip.clip, 'My Idle'); assert.equal(record.clip.orig, 'QUATERNIUS/Idle_Loop');
  equal(record.clip.keys, original.keys); assert.equal(record.clip.src, original.src);
  const [name, derived] = Object.entries(sets.mesh2motion.clips).find(([, c]) => c.orig);
  assert.equal(M.importClip(sets, 'mesh2motion', name).clip.orig, derived.orig);
  const [captureName, capture] = Object.entries(sets.cmu.clips).find(([, c]) => c.take);
  assert.equal(M.importClip(sets, 'cmu', captureName).clip.take, capture.take);
  const p = action(base(), { type: 'import', set: 'quaternius', clip: 'Idle_Loop', name: 'My Idle' });
  assert.equal(p.selected, 'My Idle'); equal(p.clips['My Idle'], record);
});

test('create, add, rename, select and delete form a complete project workflow', () => {
  let p = action(base(), { type: 'create', name: 'Still', preset: 'neutral', duration: 3, loop: false });
  assert.equal(p.selected, 'Still'); assert.equal(current(p).loop, false);
  assert.equal(current(p).keys.length, 2); near(sample(current(p), 0), sample(current(p), 1.5), 'neutral pose holds');
  const copied = M.clone(current(p)); copied.clip = 'Copied';
  p = action(p, { type: 'add', set: 'quaternius', clip: MR.text(copied) });
  assert.equal(p.selected, 'Copied');
  p = action(p, { type: 'rename', name: 'Renamed' }); assert.equal(current(p).clip, 'Renamed');
  assert.equal(p.clips.Copied, undefined);
  p = action(p, { type: 'select', id: 'Still' }); assert.equal(p.selected, 'Still');
  p = action(p, { type: 'delete' }); assert.equal(p.clips.Still, undefined); assert.ok(p.clips[p.selected]);
  p = action(p, { type: 'delete', id: 'Renamed' }); assert.equal(p.selected, 'Wave');
  assert.throws(() => action(p, { type: 'delete' }), /last clip/);
});

test('failed operations preserve the original project and action data', () => {
  const p = base(), before = json(p);
  for (const a of [
    { type: 'create', name: 'Wave' }, { type: 'import', set: 'quaternius', clip: 'missing' },
    { type: 'edit_key', time: .5, values: { armR: [100, 0] } },
    { type: 'edit_key', time: 5, values: { head: [0, 0, 0] } },
    { type: 'replace', clip: { src: 'missing' } }, { type: 'replace', clip: { clip: 'other' } },
    { type: 'select', id: 'missing' }, { type: 'rename', name: '__proto__' },
    { type: 'delete_key', time: 0 }, { type: 'delete_key', time: .123 },
    { type: 'transform', kind: 'retime', duration: 0 }, { type: 'unknown' }
  ]) {
    const originalAction = json(a);
    assert.throws(() => action(p, a)); assert.equal(json(p), before); assert.equal(json(a), originalAction);
  }
  const values = { armR: [100, 0, 0, 20, 0] };
  const changed = action(p, { type: 'edit_key', time: .5, values });
  values.armR[0] = 50; assert.equal(changed.clips.Wave.clip.keys.find(k => k.t === .5).armR[0], 100);
  assert.equal(json(p), before, 'successful edits are also immutable');
});

test('action typos and prototype fields fail before a project changes', () => {
  const p = base(), before = json(p);
  assert.throws(() => action(p, { type: 'create', name: 'Typo', durations: 10 }), /unknown field "durations"/);
  assert.throws(() => action(p, { type: 'edit_key', time: .5, value: { head: [5, 0, 0] } }), /unknown field "value"/);
  assert.throws(() => action(p, JSON.parse('{"type":"select","id":"Wave","__proto__":{"value":1}}')), /unknown field "__proto__"/);
  assert.throws(() => action(p, { type: 'constructor' }), /Unknown action type/);
  assert.throws(() => action(p, { type: 'import', set: 'quaternius', clip: 'Idle_Loop', name: '' }), /Clip name/);
  assert.throws(() => action(p, { type: 'create', name: 'Wrong preset', preset: '' }), /preset/);
  assert.equal(json(p), before);
  // Direct model callers can still omit id and use the selected clip.
  const changed = action(p, { type: 'edit_key', time: .5, values: { head: [12, 0, 0] } });
  equal(changed.clips.Wave.clip.keys.find(k => k.t === .5).head, [12, 0, 0]);
});

test('key edits interpolate missing poses and do not wrap at the duration', () => {
  let p = action(base(), { type: 'create', name: 'Reach', duration: 2, preset: 'neutral' });
  p = action(p, { type: 'edit_key', time: 2, values: { head: [40, 0, 0], armR: [100, 0, 0, 0, 0] } });
  p = action(p, { type: 'edit_key', time: 1, values: { hips: [0, 0, 90] } });
  const mid = current(p).keys.find(k => k.t === 1); equal(mid.head, [20, 0, 0]);
  p = action(p, { type: 'edit_key', time: 2, values: { hips: [0, 0, 80] } });
  equal(current(p).keys.at(-1).head, [40, 0, 0], 'editing a looping endpoint does not take the start pose');
  p = action(p, { type: 'edit_key', time: 1, values: { root: [40, 0], blade: [100, 0, 0] } });
  equal(current(p).keys[0].root, [0, 0]); equal(current(p).keys.at(-1).root, [0, 0]);
  equal(current(p).keys[0].blade, [0, 100, 0]); equal(current(p).keys[1].blade, [100, 0, 0]);
  const count = current(p).keys.length;
  p = action(p, { type: 'edit_key', time: 1, values: { head: [25, 0, 0] } });
  assert.equal(current(p).keys.length, count, 'upsert replaces an existing key');
  p = action(p, { type: 'delete_key', time: 1 }); assert.equal(current(p).keys.length, count - 1);
});

test('mirror, reverse and retime preserve their motion contracts', () => {
  const p = base(), original = current(p);
  const mirrored = action(p, { type: 'transform', kind: 'mirror' });
  assert.equal(current(mirrored).clip, 'Wave', 'an in-place mirror keeps its ID');
  const twice = action(mirrored, { type: 'transform', kind: 'mirror' });
  for (const t of [0, .1, .37, .6, 1.11, 1.9, 2]) near(sample(current(twice), t), sample(original, t), 'double mirror at ' + t);
  const reversed = current(action(p, { type: 'transform', kind: 'reverse' }));
  for (const t of [0, .13, .5, 1.27, 2]) near(sample(reversed, t), sample(original, original.dur - t), 'reverse at ' + t);
  const slower = current(action(p, { type: 'transform', kind: 'retime', duration: 5 }));
  assert.equal(slower.dur, 5);
  for (const t of [0, .31, .9, 1.5, 2]) near(sample(slower, t * 2.5), sample(original, t), 'retime at ' + t);
});

test('transforms handle source frame rounding and a zero duration static clip', () => {
  const [name] = Object.entries(sets.mesh2motion.clips).find(([, c]) => c.keys.at(-1).t > c.dur);
  let p = action(base(), { type: 'import', set: 'mesh2motion', clip: name });
  const original = current(p), duration = original.dur;
  const reversed = current(action(p, { type: 'transform', kind: 'reverse' }));
  near(sample(reversed, 0, sets.mesh2motion), sample(original, duration, sets.mesh2motion), 'reverse uses exact source end');
  p = action(p, { type: 'transform', kind: 'retime', duration: duration * 10 });
  const slowed = current(p); assert.ok(slowed.keys.at(-1).t <= slowed.dur + 1 / 30 + 1e-6);
  near(sample(slowed, slowed.dur, sets.mesh2motion), sample(original, duration, sets.mesh2motion), 'slowdown retains exact end');
  const still = M.newClip({ name: 'Static' }, sets).clip; still.dur = 0; still.keys = [still.keys[0]];
  p = action(base(), { type: 'add', set: 'quaternius', clip: still });
  assert.equal(current(p).dur, 0); assert.equal(current(action(p, { type: 'transform', kind: 'reverse' })).dur, 0);
  p = action(p, { type: 'transform', kind: 'retime', duration: 1 });
  assert.equal(current(p).keys.length, 2); assert.equal(current(p).keys.at(-1).t, 1);
});

test('exports retain the exact reference bodies and credit without false fit claims', () => {
  const name = Object.keys(sets.quaternius.clips).find(n => sets.quaternius.clips[n].src !== Object.keys(sets.quaternius.sources)[0]);
  const p = action(base(), { type: 'import', set: 'quaternius', clip: name, name: 'Exported' });
  const exported = M.exportSet(p, 'Exported', sets);
  assert.equal(exported.set, 'STUDIO'); assert.equal(exported.format, 1); assert.equal(exported.fps, 30);
  assert.equal(exported.fit, undefined); assert.equal(exported.from, undefined); equal(Object.keys(exported.clips), ['Exported']);
  assert.ok(exported.credit.includes(sets.quaternius.credit));
  equal(exported.sources, sets.quaternius.sources); equal(exported.body, sets.quaternius.body);
  equal(exported.clips.Exported, p.clips.Exported.clip);
  exported.clips.Exported.keys[0].hips[2] = -100;
  assert.notEqual(p.clips.Exported.clip.keys[0].hips[2], -100, 'export does not share mutable project data');
});

console.log(passed + ' Animation Studio model checks passed.');
if (process.exitCode) process.exit(process.exitCode);
