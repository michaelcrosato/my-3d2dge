// Asset Studio's pure data contract: atomic batches, shared references, safe JSON,
// editable level tiles, and compatibility with the existing animation project.
// Usage: node tools/asset-model-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { MR, readSet } from './mocap-lib.mjs';

const context = { MocapReadable: MR };
function load(relative, target = context) {
  const url = new URL(relative, import.meta.url);
  vm.runInNewContext(readFileSync(url, 'utf8'), target, { filename: fileURLToPath(url) });
}
load('../src/asset-studio/model.js'); load('../src/animation-studio/model.js');
const A = context.AssetStudioModel, M = context.AnimationStudioModel;
const sets = Object.fromEntries(['quaternius', 'mesh2motion', 'cmu', 'hero'].map(name => [name, readSet(new URL('../src/mocap/sets/' + name + '.js', import.meta.url))]));
const json = value => JSON.stringify(value), plain = value => JSON.parse(json(value));
const equal = (a, b) => assert.deepEqual(plain(a), plain(b));
const base = (preset = 'courtyard') => A.createProject({ preset, clipIds: ['Wave'] });
const apply = (p, a) => A.apply(p, a, { clipIds: ['Wave'] });
const batch = (p, actions) => A.applyMany(p, actions, { clipIds: ['Wave'] });
const animation = (p, action) => M.apply(p, action, sets);
let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok  ' + name); }
  catch (error) { console.error('FAIL ' + name + '\n' + error.stack); process.exitCode = 1; }
}

test('presets produce complete deterministic JSON with an optional project actor', () => {
  const p = base(); equal(p, base()); equal(A.validateProject(p, { clips: { Wave: {} } }), p);
  assert.equal(p.levels.Courtyard.rows.length, 20); assert.equal(p.levels.Courtyard.rows[0].length, 24);
  assert.equal(p.selectedObject, 'Guide'); assert.equal(p.levels.Courtyard.objects.Guide.clip, 'Wave');
  assert.equal(Object.keys(p.materials).length, 6); assert.equal(Object.keys(p.models).length, 5);
  assert.equal(A.createProject().selectedObject, 'Crate_A');
  const empty = base('empty'); assert.equal(empty.selectedLevel, 'Empty'); assert.equal(empty.selectedObject, null);
  assert.equal(empty.levels.Empty.rows.length, 16); assert.equal(empty.levels.Empty.rows[0].length, 20); equal(empty.levels.Empty.objects, {});
  assert.throws(() => A.validateProject(p), /animation clip "Wave" does not exist/);
  const another = base(); p.models.Crate.parts[0].size[0] = 70; assert.equal(another.models.Crate.parts[0].size[0], 24);
});

test('one batch resolves new references at the end and can remove related assets in any order', () => {
  const p = base('empty'), before = json(p);
  const added = batch(p, [
    { type: 'object_add', id: 'Sculpture', object: { kind: 'model', model: 'CopperBlock', position: [120, 112, 0] } },
    { type: 'model_create', id: 'CopperBlock', model: { parts: [{ shape: 'box', size: [24, 20, 32], material: 'copper' }] } },
    { type: 'material_create', id: 'copper', material: { color: '#b77755', accent: '#684638', pattern: 'noise' } }
  ]);
  assert.equal(json(p), before); assert.equal(added.selectedObject, 'Sculpture');
  equal(added.models.CopperBlock.parts[0].position, [0, 0, 0]); assert.equal(added.models.CopperBlock.parts[0].rotation, 0);
  assert.throws(() => apply(added, { type: 'material_delete', id: 'copper' }), /material "copper" does not exist/);
  const removed = batch(added, [{ type: 'material_delete', id: 'copper' }, { type: 'model_delete', id: 'CopperBlock' }, { type: 'object_delete', id: 'Sculpture' }]);
  equal(removed, p);
});

test('a failed batch leaves every material, model, row and object unchanged', () => {
  const p = base(), before = json(p);
  assert.throws(() => batch(p, [
    { type: 'material_update', id: 'wood', changes: { color: '#ff5500' } },
    { type: 'model_update', id: 'Crate', changes: { name: 'Larger crate' } },
    { type: 'object_update', id: 'Crate_A', changes: { position: [-32, 80, 0] } },
    { type: 'paint', cells: [{ x: 2, y: 2, tile: '.' }, { x: 64, y: 2, tile: '.' }] }
  ]), /Cell x/);
  assert.equal(json(p), before);
  assert.throws(() => batch(p, [{ type: 'object_add', id: 'Unknown', object: { kind: 'model', model: 'Missing' } }]), /model "Missing" does not exist/);
  assert.throws(() => batch(p, [{ type: 'object_add', id: 'Dancer', object: { kind: 'actor', clip: 'Missing' } }]), /animation clip "Missing" does not exist/);
  assert.throws(() => batch(p, []), /1 to 100/); assert.throws(() => batch(p, new Array(101).fill({ type: 'select', id: null })), /1 to 100/);
  assert.throws(() => apply(p, { type: 'load_preset' }), /preset name/); assert.throws(() => apply(p, { type: 'select' }), /needs a level/);
  assert.equal(json(p), before);
});

test('paint and fill use exact grid coordinates and validate the final tile palette', () => {
  const p = base('empty'), tiles = { ...p.levels.Empty.tiles, g: { material: 'grass', height: 0, solid: false } };
  const edited = batch(p, [
    { type: 'fill', x: 3, y: 2, width: 4, height: 3, tile: 'g' },
    { type: 'paint', cells: [{ x: 0, y: 0, tile: 'g' }] },
    { type: 'level_update', changes: { tiles } }
  ]);
  assert.equal(edited.levels.Empty.rows[0], 'g' + '.'.repeat(19));
  for (const y of [2, 3, 4]) assert.equal(edited.levels.Empty.rows[y], '...gggg' + '.'.repeat(13));
  assert.equal(edited.levels.Empty.rows[1], '.'.repeat(20)); assert.equal(edited.levels.Empty.rows[5], '.'.repeat(20));
  assert.throws(() => apply(p, { type: 'paint', cells: [{ x: 0, y: 0, tile: 'q' }] }), /tile "q" is not defined/);
  assert.throws(() => apply(p, { type: 'fill', x: 19, y: 0, width: 2, height: 1, tile: '.' }), /Fill x/);
  assert.throws(() => apply(p, { type: 'level_update', changes: { rows: ['..', '.'] } }), /row 1/);
  assert.throws(() => apply(p, { type: 'level_update', changes: { rows: ['é'] } }), /ASCII/);
});

test('model edits affect every referencing instance without copying its geometry', () => {
  const p = base(), modelBefore = json(p.models.Crate);
  const duplicate = apply(p, { type: 'object_duplicate', id: 'Crate_A', newId: 'Crate_C', offset: [-32, 0, 4] });
  equal(duplicate.levels.Courtyard.objects.Crate_C.position, [40, 232, 4]);
  assert.equal(duplicate.selectedObject, 'Crate_C');
  const parts = plain(p.models.Crate.parts); parts[0].size = [32, 24, 40];
  const changed = apply(duplicate, { type: 'model_update', id: 'Crate', changes: { parts } });
  for (const key of ['Crate_A', 'Crate_B', 'Crate_C']) {
    const o = changed.levels.Courtyard.objects[key]; assert.equal(o.model, 'Crate'); assert.equal(o.parts, undefined);
    assert.equal(changed.models[o.model].parts[0].size[2], 40);
  }
  assert.equal(json(p.models.Crate), modelBefore);
  const out = A.exportData(changed, { clipIds: ['Wave'] }); equal(out, changed);
  out.models.Crate.parts[0].size[2] = 1; assert.equal(changed.models.Crate.parts[0].size[2], 40);
});

test('level and object selections stay valid across duplication, removal and replacement', () => {
  let p = base();
  p = apply(p, { type: 'level_create', id: 'Workshop' }); assert.equal(p.selectedLevel, 'Workshop'); assert.equal(p.selectedObject, null);
  p = apply(p, { type: 'object_add', id: 'OnlyHere', object: { kind: 'model', model: 'Bench' } }); assert.equal(p.selectedObject, 'OnlyHere');
  assert.throws(() => apply(p, { type: 'select', level: 'Courtyard', id: 'OnlyHere' }), /selectedObject/);
  p = apply(p, { type: 'object_delete', id: 'OnlyHere' }); assert.equal(p.selectedObject, null);
  p = apply(p, { type: 'level_delete', id: 'Workshop' }); assert.equal(p.selectedLevel, 'Courtyard');
  assert.throws(() => apply(p, { type: 'level_delete', id: 'Courtyard' }), /Levels must contain 1/);
  const replaced = batch(p, [{ type: 'level_delete', id: 'Courtyard' }, { type: 'level_create', id: 'NewLevel' }]);
  assert.equal(replaced.selectedLevel, 'NewLevel'); assert.equal(replaced.selectedObject, null);
  const switched = batch(base('empty'), [{ type: 'select', level: 'Future', id: 'FutureObject' }, { type: 'level_create', id: 'Future' }, { type: 'object_add', id: 'FutureObject', object: { kind: 'model', model: 'Crate' } }]);
  assert.equal(switched.selectedObject, 'FutureObject');
});

test('JSON validation rejects unknown fields, invalid geometry, prototypes and nonfinite values', () => {
  const p = base(), before = json(p);
  assert.throws(() => apply(p, { type: 'object_update', id: 'Crate_A', changes: { opacity: .5 } }), /unknown field "opacity"/);
  assert.throws(() => apply(p, { type: 'object_update', id: 'Crate_A', changes: { position: [NaN, 0, 0] } }), /nonfinite/);
  assert.throws(() => apply(p, { type: 'model_update', id: 'Crate', changes: { parts: [{ size: [1, -1, 2] }] } }), /size\[1\]/);
  assert.throws(() => apply(p, { type: 'material_update', id: 'wood', changes: { seed: .5 } }), /seed/);
  assert.throws(() => apply(p, JSON.parse('{"type":"material_update","id":"wood","changes":{"__proto__":{"polluted":true}}}')), /reserved key/);
  assert.throws(() => apply(p, { type: 'model_create', id: 'constructor', model: {} }), /Reserved keys/);
  assert.throws(() => apply(p, { type: 'object_add', id: 'Bad', object: { kind: 'actor', clip: 'Wave', model: 'Crate' } }), /actor cannot have a model/);
  const cyclic = {}; cyclic.self = cyclic; assert.throws(() => A.clone(cyclic), /cycle/);
  assert.throws(() => A.clone({ callable() {} }), /JSON values only/);
  let invoked = false; assert.throws(() => A.clone({ get value() { invoked = true; return 1; } }), /getters or setters/); assert.equal(invoked, false);
  assert.throws(() => A.clone(Object.create({ inherited: true })), /plain JSON objects/);
  assert.equal({}.polluted, undefined); assert.equal(json(p), before);
});

test('asset actions migrate old animation projects only when requested and preserve source clips', () => {
  const old = M.createProject(sets), before = json(old);
  const oldRuntime = { MocapReadable: MR }; load('../src/animation-studio/model.js', oldRuntime);
  equal(oldRuntime.AnimationStudioModel.validateProject(old, sets), old); assert.equal(old.assets, undefined);
  const edited = animation(old, { type: 'assets', actions: [{ type: 'material_update', id: 'wood', changes: { color: '#cc8844' } }] });
  assert.equal(edited.schema, 1); assert.equal(edited.assets.selectedLevel, 'Courtyard');
  assert.equal(edited.assets.levels.Courtyard.objects.Guide.clip, 'Wave'); equal(edited.clips, old.clips); assert.equal(json(old), before);
  assert.throws(() => oldRuntime.AnimationStudioModel.validateProject(edited, sets), /AssetStudioModel/);
  const sourceClip = Object.keys(sets.mesh2motion.clips)[0];
  const imported = animation(edited, { type: 'import', set: 'mesh2motion', clip: sourceClip, name: 'ImportedWalk' });
  const sourceBefore = json(imported.clips);
  const assetsEdited = animation(imported, { type: 'assets', actions: [{ type: 'load_preset', preset: 'empty' }, { type: 'object_add', id: 'Walker', object: { kind: 'actor', clip: 'ImportedWalk' } }] });
  assert.equal(json(assetsEdited.clips), sourceBefore); equal(assetsEdited.clips.ImportedWalk.clip.keys, sets.mesh2motion.clips[sourceClip].keys);
  equal(M.exportSet(assetsEdited, 'ImportedWalk', sets).sources, sets.mesh2motion.sources);
});

test('animation renames update every actor and clip deletion requires removal of users', () => {
  let p = animation(M.createProject(sets), { type: 'assets', actions: [{ type: 'select', id: 'Guide' }] });
  p = animation(p, { type: 'create', name: 'Idle', preset: 'neutral' });
  p = animation(p, { type: 'assets', actions: [{ type: 'level_create', id: 'Second' }, { type: 'object_add', id: 'OtherGuide', object: { kind: 'actor', clip: 'Wave' } }] });
  const before = json(p);
  assert.throws(() => animation(p, { type: 'delete', id: 'Wave' }), /used by actor "Guide"/); assert.equal(json(p), before);
  const renamed = animation(p, { type: 'rename', id: 'Wave', name: 'Hello' });
  assert.equal(renamed.assets.levels.Courtyard.objects.Guide.clip, 'Hello'); assert.equal(renamed.assets.levels.Second.objects.OtherGuide.clip, 'Hello');
  assert.equal(renamed.clips.Hello.clip.clip, 'Hello'); assert.equal(json(p), before);
  const removed = animation(renamed, { type: 'assets', actions: [{ type: 'object_delete', level: 'Courtyard', id: 'Guide' }, { type: 'object_delete', level: 'Second', id: 'OtherGuide' }] });
  const deleted = animation(removed, { type: 'delete', id: 'Hello' }); equal(Object.keys(deleted.clips), ['Idle']);
});

test('agent discovery and exported schema contain the actual presets and all actions', () => {
  const c = A.catalog(), s = A.schema(), p = base(), inventory = A.summary(p);
  equal(c.presets.map(x => x.id), ['courtyard', 'empty']); assert.equal(c.actions.length, 17);
  equal(s.action.oneOf.map(x => x.properties.type.const).sort(), [...c.actions].sort());
  assert.equal(json(s).includes('"$ref"'), false); assert.equal(s.project.additionalProperties, false);
  assert.equal(inventory.counts.objects, 9); assert.equal(inventory.counts.actors, 1); assert.equal(inventory.level.id, 'Courtyard');
  assert.equal(inventory.level.objects.find(o => o.id === 'Guide').clip, 'Wave');
  c.patterns.push('invented'); assert.equal(A.catalog().patterns.includes('invented'), false);
});

console.log('\nAsset Studio model: ' + passed + ' checks passed.');
