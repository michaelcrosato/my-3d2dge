/* =============================================================================
 * ANIMATION STUDIO MODEL  shared by the browser and the local tools. No I/O.
 * Projects hold readable clips and optional AssetStudioModel scene data.
 * validateClip / validateProject copy and check input; apply/applyMany return a new project.
 * The input project never changes, including when an operation fails.
 * ============================================================================= */
var AnimationStudioModel = (() => {
'use strict';
const MR = MocapReadable;
const FIELDS = Object.freeze({ hips: 3, body: 3, chest: 3, head: 3, shL: 2, shR: 2,
  armL: 5, armR: 5, legL: 5, legR: 5, footL: 3, footR: 3, blade: 3, root: 2 });
const REQUIRED = ['hips', 'body', 'chest', 'head', 'armL', 'armR', 'legL', 'legR'];
const CLIP_FIELDS = ['clip', 'src', 'dur', 'loop', 'tags', 'desc', 'orig', 'take', 'keys'];
const ACTION_FIELDS = {
  create: ['name', 'duration', 'loop', 'preset', 'set'], import: ['set', 'clip', 'name'], add: ['set', 'clip'],
  select: ['id'], replace: ['id', 'clip'], edit_key: ['id', 'time', 'values'], delete_key: ['id', 'time'],
  transform: ['id', 'kind', 'duration'], rename: ['id', 'name'], delete: ['id'], assets: ['actions']
};
const MAX_KEYS = 2000, MAX_CLIPS = 128, MAX_DURATION = 600, END_TOL = 1 / 30 + 1e-6, EPS = 1e-9;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const fail = message => { throw new Error(message); };
/** Copy JSON data without changing nonfinite numbers before validation sees them. */
function clone(x) {
  if (Array.isArray(x)) return Array.from(x, clone);
  if (object(x)) return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, clone(v)]));
  return x;
}
function keysOnly(o, allowed, label) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(label + ': unknown field "' + k + '".');
}
function label(x, name, max = 80) {
  if (typeof x !== 'string' || !x.trim() || x.length > max || /[\u0000-\u001f\u007f]/.test(x)) fail(name + ' must be text with 1 to ' + max + ' characters.');
  return x;
}
function clipName(x) {
  label(x, 'Clip name');
  if (x !== x.trim() || /[<>/\\]/.test(x) || ['__proto__', 'constructor', 'prototype', '.', '..'].includes(x)) fail('Clip name contains a reserved name or character.');
  return x;
}
function number(x, name, low, high) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < low || x > high) fail(name + ' must be a finite number from ' + low + ' to ' + high + '.');
  return x;
}
/** Comments on their own lines use the same syntax as MocapReadable.parse. */
function inputClip(input) {
  if (typeof input !== 'string') return clone(input);
  if (input.length > 4 * 1024 * 1024) fail('Clip text is too large. The limit is 4 MiB.');
  try { return JSON.parse(input.replace(/^\s*\/\/.*$/gm, '')); }
  catch (e) { fail('Clip JSON is invalid: ' + e.message); }
}
function field(value, name, where) {
  if (!Array.isArray(value) || value.length !== FIELDS[name]) fail(where + ': "' + name + '" must have ' + FIELDS[name] + ' numbers.');
  for (let i = 0; i < value.length; i++) number(value[i], where + ': ' + name + '[' + i + ']', -100000, 100000);
  if (/^(arm|leg)[LR]$/.test(name)) {
    if (Math.hypot(value[0], value[1], value[2]) < 1e-6) fail(where + ': "' + name + '" needs a nonzero direction.');
    number(value[3], where + ': ' + name + ' bend', 0, 180);
  }
  if (name === 'blade' && Math.hypot(...value) < 1e-6) fail(where + ': "blade" needs a nonzero direction.');
}
/**
 * Keep source keys intact, including the importer rounding its final key to 30 fps.
 * Keys must be in time order. A final key may exceed dur by at most one source frame.
 * Turns and twists can exceed 360 degrees: the readable format preserves full turns.
 */
function validateClip(input) {
  const c = inputClip(input);
  if (!object(c)) fail('A clip must be an object.');
  keysOnly(c, CLIP_FIELDS, 'Clip'); clipName(c.clip); label(c.src, 'Clip source', 120);
  number(c.dur, 'Clip duration', 0, MAX_DURATION);
  if (typeof c.loop !== 'boolean') fail('Clip loop must be true or false.');
  if (!Array.isArray(c.keys) || c.keys.length < 1 || c.keys.length > MAX_KEYS) fail('A clip needs 1 to ' + MAX_KEYS + ' key poses.');
  if (c.tags !== undefined && (!Array.isArray(c.tags) || c.tags.length > 32)) fail('Clip tags must be an array with at most 32 text values.');
  if (c.tags) c.tags.forEach(t => label(t, 'Clip tag', 64));
  for (const f of ['desc', 'orig', 'take']) if (c[f] !== undefined && (typeof c[f] !== 'string' || c[f].length > (f === 'desc' ? 4000 : 256))) fail('Clip ' + f + ' must be text of at most ' + (f === 'desc' ? 4000 : 256) + ' characters.');
  let previous = -1;
  c.keys.forEach((k, i) => {
    const at = 'Key ' + (i + 1);
    if (!object(k)) fail(at + ' must be an object.');
    keysOnly(k, ['t', ...Object.keys(FIELDS)], at);
    number(k.t, at + ' time', 0, c.dur + END_TOL);
    if (i === 0 && k.t !== 0) fail('The first key must start at 0 seconds.');
    if (i && k.t <= previous) fail(at + ' time must be greater than the previous key time.');
    if (k.t > c.dur && i !== c.keys.length - 1) fail('Only the final key can use the source frame rounding after the duration.');
    for (const f of REQUIRED) if (!own(k, f)) fail(at + ': missing "' + f + '".');
    for (const f of Object.keys(FIELDS)) if (own(k, f)) field(k[f], f, at);
    for (const f of ['root', 'blade']) if (own(k, f) !== own(c.keys[0], f)) fail('The "' + f + '" channel must be present in every key or in no keys.');
    previous = k.t;
  });
  if (c.dur === 0 && (c.keys.length !== 1 || c.keys[0].t !== 0)) fail('A zero duration clip must have one key at 0 seconds.');
  // Call the shared parser only after checking order: its sorting must not hide bad input.
  return MR.parse(c);
}
function getSet(sets, name) {
  if (typeof name !== 'string' || !object(sets) || !own(sets, name.toLowerCase())) fail('Unknown animation set "' + String(name) + '".');
  const id = name.toLowerCase(), set = sets[id];
  if (!object(set) || !object(set.sources) || !Object.keys(set.sources).length) fail('Animation set "' + id + '" has no reference body.');
  return { id, set };
}
function assetModel() {
  if (typeof AssetStudioModel === 'undefined') fail('This project contains assets. Open it with Asset Studio or load AssetStudioModel before AnimationStudioModel.');
  return AssetStudioModel;
}
/** A project is portable JSON. Reference set data remains in the repository. */
function validateProject(input, sets) {
  if (!object(input)) fail('A project must be an object.');
  keysOnly(input, ['schema', 'name', 'selected', 'clips', 'assets'], 'Project');
  if (input.schema !== 1) fail('Project schema must be 1.');
  label(input.name, 'Project name', 120);
  if (!object(input.clips)) fail('Project clips must be an object.');
  const entries = Object.entries(input.clips);
  if (!entries.length || entries.length > MAX_CLIPS) fail('A project needs 1 to ' + MAX_CLIPS + ' clips.');
  const clips = {};
  for (const [id, record] of entries) {
    clipName(id);
    if (!object(record)) fail('Clip "' + id + '" needs a set and a clip object.');
    keysOnly(record, ['set', 'clip'], 'Clip record "' + id + '"');
    const source = getSet(sets, record.set), c = validateClip(record.clip);
    if (c.clip !== id) fail('Clip "' + id + '" must have the same name in its clip field.');
    if (!own(source.set.sources, c.src)) fail('Clip "' + id + '": source "' + c.src + '" is not in set "' + source.id + '".');
    clips[id] = { set: source.id, clip: c };
  }
  if (typeof input.selected !== 'string' || !own(clips, input.selected)) fail('Project selected must name a clip in this project.');
  const p = { schema: 1, name: input.name, selected: input.selected, clips };
  // Old animation files stay byte-for-byte equivalent and need no asset runtime.
  if (own(input, 'assets')) p.assets = assetModel().validateProject(input.assets, { clips });
  return p;
}
function neutral() {
  return { hips: [0, 0, 100], body: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], shL: [0, 0], shR: [0, 0],
    armL: [12, 10, -100, 15, 0], armR: [12, 10, -100, 15, 0],
    legL: [0, 8, -100, 5, 0], legR: [0, 8, -100, 5, 0], footL: [0, 0, 0], footR: [0, 0, 0] };
}
/** Author new motion. The reference set supplies proportions, not animation keys. */
function newClip(options, sets) {
  if (!object(options)) fail('New clip options must be an object.');
  keysOnly(options, ['type', ...ACTION_FIELDS.create], 'New clip options');
  const name = clipName(options.name), duration = options.duration === undefined ? 2 : options.duration;
  const loop = options.loop === undefined ? true : options.loop, preset = options.preset === undefined ? 'neutral' : options.preset;
  number(duration, 'New clip duration', .001, MAX_DURATION);
  if (typeof loop !== 'boolean') fail('New clip loop must be true or false.');
  if (!['neutral', 'wave'].includes(preset)) fail('New clip preset must be "neutral" or "wave".');
  const source = getSet(sets, options.set === undefined ? 'quaternius' : options.set);
  const key = (phase, values = {}) => Object.assign({ t: phase * duration }, neutral(), values);
  const keys = preset === 'neutral' ? [key(0), key(1)] : [
    key(0), key(.16, { armR: [25, 65, 60, 70, -15], head: [7, 0, 0] }),
    key(.3, { armR: [20, 25, 100, 85, 5], shR: [5, 8], head: [7, 0, 0] }),
    key(.43, { armR: [25, 80, 55, 95, -20], shR: [5, 8], head: [7, 0, 0] }),
    key(.56, { armR: [20, 25, 100, 85, 5], shR: [5, 8], head: [7, 0, 0] }),
    key(.69, { armR: [25, 80, 55, 95, -20], shR: [5, 8], head: [7, 0, 0] }),
    key(.82, { armR: [25, 65, 60, 70, -15], head: [5, 0, 0] }), key(1)
  ];
  const clip = validateClip({ clip: name, src: Object.keys(source.set.sources)[0], dur: duration, loop,
    tags: ['authored', preset === 'wave' ? 'gesture' : 'reference'],
    desc: preset === 'wave' ? 'Raises the right hand and moves the arm from side to side.' : 'Stands upright with both arms down.', keys });
  return { set: source.id, clip };
}
function createProject(sets) {
  return validateProject({ schema: 1, name: 'Animation Studio', selected: 'Wave', clips: { Wave: newClip({ name: 'Wave', preset: 'wave' }, sets) } }, sets);
}
/** Import one repository clip, keeping its data and all recorded source details. */
function importClip(sets, setName, name, newName = name) {
  const source = getSet(sets, setName); clipName(name); clipName(newName);
  if (!object(source.set.clips) || !own(source.set.clips, name)) fail('Set "' + source.id + '" has no clip "' + name + '".');
  const clip = validateClip(source.set.clips[name]);
  if (!clip.orig) clip.orig = source.set.set + '/' + name;
  clip.clip = newName;
  return { set: source.id, clip };
}
const exactKey = (c, t) => Object.assign({ t }, clone(MR.keyAt(Object.assign({}, c, { loop: false }), t)));
/** Limit a transform to the visible interval, with exact, nonwrapping end poses. */
function intervalKeys(c) {
  if (!c.dur) return [exactKey(c, 0)];
  return [exactKey(c, 0), ...c.keys.filter(k => k.t > 0 && k.t < c.dur).map(clone), exactKey(c, c.dur)];
}
function requireClip(p, id) {
  if (typeof id !== 'string' || !own(p.clips, id)) fail('Project has no clip "' + String(id) + '".');
  return p.clips[id];
}
function addRecord(p, record) {
  const id = record.clip.clip;
  if (own(p.clips, id)) fail('A clip named "' + id + '" already exists. Choose another name.');
  if (Object.keys(p.clips).length >= MAX_CLIPS) fail('A project can hold at most ' + MAX_CLIPS + ' clips.');
  p.clips[id] = record; p.selected = id;
}
/** One ordered step on the private working copy. Optional id uses the selected clip. */
function step(p, action, sets) {
  if (!object(action) || typeof action.type !== 'string') fail('An action needs a type.');
  if (!own(ACTION_FIELDS, action.type)) fail('Unknown action type "' + action.type + '".');
  keysOnly(action, ['type', ...ACTION_FIELDS[action.type]], 'Action "' + action.type + '"');
  if (action.type === 'assets') {
    const A = assetModel(), context = { clipIds: [p.selected, ...Object.keys(p.clips).filter(id => id !== p.selected)] };
    p.assets = A.applyMany(p.assets || A.createProject(context), action.actions, context);
  } else if (action.type === 'create') addRecord(p, newClip(action, sets));
  else if (action.type === 'import') addRecord(p, importClip(sets, action.set, action.clip, action.name === undefined ? action.clip : action.name));
  else if (action.type === 'add') {
    const source = getSet(sets, action.set === undefined ? 'quaternius' : action.set);
    addRecord(p, { set: source.id, clip: validateClip(action.clip) });
  } else {
    const id = action.id === undefined ? p.selected : action.id, record = requireClip(p, id), c = record.clip;
    if (action.type === 'select') p.selected = id;
    else if (action.type === 'replace') {
      const replacement = inputClip(action.clip);
      if (!object(replacement)) fail('Replacement clip must be an object or readable JSON.');
      if (replacement.clip !== undefined && replacement.clip !== id) fail('Use the rename action to change a clip name.');
      record.clip = validateClip(Object.assign({}, c, replacement, { clip: id }));
    } else if (action.type === 'edit_key') {
      const time = number(action.time, 'Key time', 0, c.dur);
      if (!object(action.values) || !Object.keys(action.values).length) fail('Key values must contain at least one pose field.');
      keysOnly(action.values, Object.keys(FIELDS), 'Key values');
      for (const [f, v] of Object.entries(action.values)) {
        field(v, f, 'Key edit');
        // A new optional channel begins from its normal default on the other keys.
        if (!REQUIRED.includes(f)) for (const k of c.keys) if (!own(k, f)) k[f] = f === 'blade' ? [0, 100, 0] : new Array(FIELDS[f]).fill(0);
      }
      const i = c.keys.findIndex(k => Math.abs(k.t - time) < EPS);
      const key = i < 0 ? exactKey(c, time) : clone(c.keys[i]);
      Object.assign(key, clone(action.values));
      if (i < 0) c.keys.push(key); else c.keys[i] = key;
      c.keys.sort((a, b) => a.t - b.t);
    } else if (action.type === 'delete_key') {
      const time = number(action.time, 'Key time', 0, c.dur + END_TOL), i = c.keys.findIndex(k => Math.abs(k.t - time) < EPS);
      if (i < 0) fail('No key exists at ' + time + ' seconds.');
      if (i === 0) fail('The first key at 0 seconds cannot be deleted.');
      c.keys.splice(i, 1);
    } else if (action.type === 'transform') {
      if (action.kind === 'mirror') record.clip = Object.assign(MR.mirror(c), { clip: id });
      else if (action.kind === 'reverse') c.keys = intervalKeys(c).reverse().map(k => Object.assign({}, k, { t: c.dur - k.t }));
      else if (action.kind === 'retime') {
        const duration = number(action.duration, 'New duration', .001, MAX_DURATION);
        if (c.dur === 0) { c.keys = [Object.assign({}, clone(c.keys[0]), { t: 0 }), Object.assign({}, clone(c.keys[0]), { t: duration })]; }
        else {
          const scale = duration / c.dur;
          const keys = c.keys[c.keys.length - 1].t * scale > duration + END_TOL ? intervalKeys(c) : c.keys;
          c.keys = keys.map(k => Object.assign({}, k, { t: k.t * scale }));
        }
        c.dur = duration;
      } else fail('Transform kind must be "mirror", "reverse", or "retime".');
    } else if (action.type === 'rename') {
      const name = clipName(action.name);
      if (name !== id && own(p.clips, name)) fail('A clip named "' + name + '" already exists.');
      if (name !== id) {
        c.clip = name;
        p.clips = Object.fromEntries(Object.entries(p.clips).map(([key, value]) => [key === id ? name : key, value]));
        if (p.selected === id) p.selected = name;
        if (p.assets) for (const level of Object.values(p.assets.levels)) for (const o of Object.values(level.objects)) if (o.kind === 'actor' && o.clip === id) o.clip = name;
      }
    } else if (action.type === 'delete') {
      if (Object.keys(p.clips).length === 1) fail('The last clip cannot be deleted. Create another clip first.');
      if (p.assets) for (const [levelId, level] of Object.entries(p.assets.levels)) for (const [objectId, o] of Object.entries(level.objects)) {
        if (o.kind === 'actor' && o.clip === id) fail('Clip "' + id + '" is used by actor "' + objectId + '" in level "' + levelId + '". Change or remove that actor before deleting the clip.');
      }
      delete p.clips[id]; if (p.selected === id) p.selected = Object.keys(p.clips)[0];
    } else fail('Unknown action type "' + action.type + '".');
  }
  return p;
}
/** Validate and copy once for a batch; publish nothing unless every ordered step is valid. */
function applyMany(project, actions, sets) {
  if (!Array.isArray(actions) || actions.length < 1 || actions.length > 100) fail('Animation actions must contain 1 to 100 actions.');
  let p = validateProject(project, sets);
  for (let i = 0; i < actions.length; i++) {
    try { p = step(p, actions[i], sets); }
    catch (err) {
      err.message = 'Action ' + (i + 1) + (actions[i]?.type ? ' (' + actions[i].type + ')' : '') + ': ' + err.message;
      err.actionIndex = i; err.actionType = actions[i]?.type; throw err;
    }
  }
  return validateProject(p, sets);
}
/** One atomic operation; a batch uses the same action vocabulary and makes one history entry. */
function apply(project, action, sets) { return applyMany(project, [action], sets); }
/** Export a game-ready set. Retain reference bodies and credits; discard old fit claims. */
function exportSet(project, id, sets) {
  const p = validateProject(project, sets), record = requireClip(p, id === undefined ? p.selected : id), source = getSet(sets, record.set).set;
  const set = { set: 'STUDIO', title: p.name, format: 1,
    credit: (source.credit || '') + ' Animation authored or edited in Animation Studio. Reference body: ' + source.set + '. Source details are retained in each clip.',
    fps: source.fps || 30, sources: clone(source.sources), clips: { [record.clip.clip]: clone(record.clip) } };
  // Mocap.load uses the first source body as its base, so keep all source measurements.
  if (source.body) set.body = clone(source.body);
  return set;
}
return { FIELDS, clone, validateClip, validateProject, newClip, createProject, importClip, apply, applyMany, exportSet };
})();
