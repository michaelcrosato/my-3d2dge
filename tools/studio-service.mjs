// Animation and Asset Studio state: readable models, catalogs, revision checks, atomic saves and file watching.
// The project file is JSON data only. Source set scripts are the trusted, versioned files used by the engine.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync, unlinkSync, statSync, watch } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { MR, readSet } from './mocap-lib.mjs';

export const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const MAX_BYTES = 8 * 1024 * 1024;
export const VIEWS = ['iso', 'threequarter', 'topdown', 'brawler', 'side'];
export const CASTS = ['mannequin', 'hero', 'both'];
export class StudioError extends Error {
  constructor(message, status = 400, details = {}) { super(message); this.status = status; this.details = details; }
}
export function object(value, label = 'Request') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StudioError(label + ' must be an object.');
  return value;
}
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const serial = project => JSON.stringify(project);

export function loadAssetModel(root = REPO_ROOT) {
  const sandbox = {}, file = resolve(root, 'src/asset-studio/model.js');
  vm.runInNewContext(readFileSync(file, 'utf8'), sandbox, { filename: file, timeout: 5000 });
  if (!sandbox.AssetStudioModel) throw new Error('The Asset Studio model is missing.');
  return sandbox.AssetStudioModel;
}

export function loadStudioResources(root = REPO_ROOT) {
  const sets = Object.create(null), folder = resolve(root, 'src/mocap/sets');
  for (const name of readdirSync(folder).filter(n => /^[a-z0-9-]+\.js$/.test(n)).sort()) {
    sets[name.slice(0, -3)] = readSet(resolve(folder, name));
  }
  const sandbox = { MocapReadable: MR };
  const assetFile = resolve(root, 'src/asset-studio/model.js');
  vm.runInNewContext(readFileSync(assetFile, 'utf8'), sandbox, { filename: assetFile, timeout: 5000 });
  const file = resolve(root, 'src/animation-studio/model.js');
  vm.runInNewContext(readFileSync(file, 'utf8'), sandbox, { filename: file, timeout: 5000 });
  if (!sandbox.AnimationStudioModel) throw new Error('Build the Animation Studio model before starting the server.');
  return { model: sandbox.AnimationStudioModel, assetModel: sandbox.AssetStudioModel, sets };
}

const text = (s, max, label) => {
  if (typeof s !== 'string' || !s.trim() || s.length > max) throw new StudioError(label + ' must be a non-empty string of at most ' + max + ' characters.');
  return s;
};
export function previewOptions(input, project, capture = false) {
  object(input, 'Preview');
  const allowed = capture ? ['id', 'times', 'view', 'cast', 'bones', 'facing', 'zoom'] : ['id', 'time', 'playing', 'speed', 'view', 'cast', 'bones', 'facing', 'zoom'];
  for (const key of Object.keys(input)) if (!allowed.includes(key)) throw new StudioError('Unknown preview field: ' + key + '.');
  const out = {};
  for (const k of allowed) if (own(input, k)) out[k] = input[k];
  if (own(out, 'id') && (typeof out.id !== 'string' || !own(project.clips, out.id))) throw new StudioError('Preview clip does not exist.');
  if (own(out, 'view') && !VIEWS.includes(out.view)) throw new StudioError('view must be one of: ' + VIEWS.join(', ') + '.');
  if (own(out, 'cast') && !CASTS.includes(out.cast)) throw new StudioError('cast must be one of: ' + CASTS.join(', ') + '.');
  for (const k of ['bones', 'playing']) if (own(out, k) && typeof out[k] !== 'boolean') throw new StudioError(k + ' must be true or false.');
  for (const [k, min, max] of [['time', 0, 600], ['speed', .05, 4], ['facing', -180, 180], ['zoom', .5, 3]]) {
    if (own(out, k) && (typeof out[k] !== 'number' || !Number.isFinite(out[k]) || out[k] < min || out[k] > max)) throw new StudioError(k + ' must be a number from ' + min + ' to ' + max + '.');
  }
  if (own(out, 'time') && out.time > project.clips[out.id || project.selected].clip.dur) throw new StudioError('time must not exceed the preview clip duration.');
  if (capture) {
    const c = project.clips[out.id || project.selected]?.clip;
    if (!Array.isArray(out.times) || out.times.length < 1 || out.times.length > 8 || out.times.some(t => typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > c.dur)) {
      throw new StudioError('times must contain 1 to 8 times in seconds, from 0 to the clip duration.');
    }
  }
  return out;
}

// Scene previews never save data or change history. Resolve targets before broadcasting so every editor agrees.
export function sceneOptions(input, assets, capture = false) {
  object(input, 'Scene preview');
  const allowed = ['level', 'view', 'zoom', 'focus', 'selected', 'grid', ...(capture ? ['times'] : ['mode', 'time', 'playing'])];
  for (const key of Object.keys(input)) if (!allowed.includes(key)) throw new StudioError('Unknown scene preview field: ' + key + '.');
  const out = { ...input, level: input.level ?? assets.selectedLevel };
  if (typeof out.level !== 'string' || !own(assets.levels, out.level)) throw new StudioError('Scene level does not exist.', 404);
  const level = assets.levels[out.level];
  if (own(out, 'selected') && out.selected !== null && (typeof out.selected !== 'string' || !own(level.objects, out.selected))) throw new StudioError('Selected object does not exist in the preview level.', 404);
  if (own(out, 'view') && !VIEWS.includes(out.view)) throw new StudioError('view must be one of: ' + VIEWS.join(', ') + '.');
  if (own(out, 'mode') && !['edit', 'play'].includes(out.mode)) throw new StudioError('mode must be edit or play.');
  for (const key of ['grid', 'playing']) if (own(out, key) && typeof out[key] !== 'boolean') throw new StudioError(key + ' must be true or false.');
  for (const [key, min, max] of [['time', 0, 600], ['zoom', .5, 3]]) {
    if (own(out, key) && (typeof out[key] !== 'number' || !Number.isFinite(out[key]) || out[key] < min || out[key] > max)) throw new StudioError(key + ' must be a number from ' + min + ' to ' + max + '.');
  }
  if (own(out, 'focus') && (!Array.isArray(out.focus) || out.focus.length !== 3 || out.focus.some(n => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 100000))) throw new StudioError('focus must contain three finite coordinates from -100000 to 100000.');
  if (capture) {
    out.times ??= [0];
    if (!Array.isArray(out.times) || out.times.length < 1 || out.times.length > 8 || out.times.some(n => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 600)) throw new StudioError('times must contain 1 to 8 scene times from 0 to 600 seconds.');
  }
  return out;
}

const only = (value, allowed, label) => {
  object(value, label);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new StudioError('Unknown ' + label + ' field: ' + key + '.');
};
export const projectAssets = (project, assetModel) => project.assets || assetModel.createProject({ clipIds: [project.selected, ...Object.keys(project.clips).filter(id => id !== project.selected)] });
export function sceneReceipt(state, assetModel, before) {
  const assets = projectAssets(state.project, assetModel);
  const rows = Object.entries;
  const summary = assetModel.summary(assets), current = assets.levels[assets.selectedLevel];
  const result = {
    revision: state.revision, name: state.project.name, initialized: !!state.project.assets,
    canUndo: state.canUndo, canRedo: state.canRedo, lastChange: state.lastChange,
    summary: { schema: summary.schema, selectedLevel: summary.selectedLevel, selectedObject: summary.selectedObject, counts: summary.counts },
    materials: rows(assets.materials).map(([id, value]) => ({ id, name: value.name, pattern: value.pattern })),
    models: rows(assets.models).map(([id, value]) => ({ id, name: value.name, parts: value.parts.length })),
    levels: rows(assets.levels).map(([id, value]) => ({ id, name: value.name, width: value.rows[0]?.length || 0, height: value.rows.length, objects: Object.keys(value.objects).length })),
    objects: rows(current.objects).map(([id, value]) => ({ id, kind: value.kind, asset: value.model || value.clip, position: value.position })),
    animations: rows(state.project.clips).map(([id, value]) => ({ id, duration: value.clip.dur, loop: !!value.clip.loop }))
  };
  if (before) {
    const old = projectAssets(before.project, assetModel);
    const changed = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(id => serial(a[id]) !== serial(b[id]));
    result.applied = state.revision !== before.revision;
    result.changed = { materials: changed(old.materials, assets.materials), models: changed(old.models, assets.models), levels: changed(old.levels, assets.levels), objects: [] };
    for (const id of new Set([...Object.keys(old.levels), ...Object.keys(assets.levels)])) for (const objectID of changed(old.levels[id]?.objects || {}, assets.levels[id]?.objects || {})) result.changed.objects.push({ level: id, id: objectID });
  }
  return result;
}

export function catalog(sets, query = {}) {
  const q = typeof query.query === 'string' ? query.query.toLowerCase().trim().slice(0, 160) : '';
  const set = query.set || '';
  if (set && !own(sets, set)) throw new StudioError('Unknown source set: ' + set + '.', 404);
  const integer = (n, fallback, low, high, label) => {
    if (n === undefined || n === null || n === '') return fallback;
    const value = Number(n);
    if (!Number.isInteger(value) || value < low || value > high) throw new StudioError(label + ' must be an integer from ' + low + ' to ' + high + '.');
    return value;
  };
  const offset = integer(query.offset, 0, 0, 100000, 'offset'), limit = integer(query.limit, 50, 1, 100, 'limit');
  const rows = [];
  for (const [id, data] of Object.entries(sets)) {
    if (set && id !== set) continue;
    for (const [name, clip] of Object.entries(data.clips)) {
      if (q && !(name + ' ' + (clip.desc || '') + ' ' + (clip.tags || []).join(' ')).toLowerCase().includes(q)) continue;
      rows.push({ set: id, name, duration: clip.dur, loop: !!clip.loop, keys: clip.keys.length, tags: clip.tags || [], description: clip.desc || '' });
    }
  }
  return {
    sets: Object.entries(sets).map(([id, data]) => ({ id, label: data.set, clips: Object.keys(data.clips).length, credit: data.credit })),
    clips: rows.slice(offset, offset + limit), total: rows.length, offset, limit, nextOffset: offset + limit < rows.length ? offset + limit : null
  };
}

const id = { type: 'string', minLength: 1, maxLength: 80, description: 'Project clip name. Use animation_get to inspect the project.' };
const readable = { oneOf: [{ type: 'object' }, { type: 'string' }], description: 'A complete native readable clip object, or its JSON text. Get /api/schema for pose fields.' };
const schema = (properties, required) => ({ type: 'object', properties, required, additionalProperties: false });
export const ACTION_SCHEMA = { oneOf: [
  schema({ type: { const: 'create' }, name: id, duration: { type: 'number', minimum: .001, maximum: 600 }, loop: { type: 'boolean' }, preset: { enum: ['neutral', 'wave'] }, set: { type: 'string' } }, ['type', 'name']),
  schema({ type: { const: 'import' }, set: { type: 'string' }, clip: { type: 'string' }, name: id }, ['type', 'set', 'clip']),
  schema({ type: { const: 'add' }, set: { type: 'string' }, clip: readable }, ['type', 'set', 'clip']),
  schema({ type: { const: 'select' }, id }, ['type', 'id']),
  schema({ type: { const: 'replace' }, id, clip: readable }, ['type', 'id', 'clip']),
  schema({ type: { const: 'edit_key' }, id, time: { type: 'number', minimum: 0 }, values: { type: 'object', description: 'Pose channels to replace, such as {"armR":[30,20,100,70,0]}. A new time inserts an interpolated key.' } }, ['type', 'id', 'time', 'values']),
  schema({ type: { const: 'delete_key' }, id, time: { type: 'number', minimum: 0 } }, ['type', 'id', 'time']),
  schema({ type: { const: 'transform' }, id, kind: { enum: ['mirror', 'reverse', 'retime'] }, duration: { type: 'number', minimum: .001, maximum: 600 } }, ['type', 'id', 'kind']),
  schema({ type: { const: 'rename' }, id, name: id }, ['type', 'id', 'name']),
  schema({ type: { const: 'delete' }, id }, ['type', 'id']),
  schema({ type: { const: 'assets' }, actions: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'object' }, description: 'Atomic asset actions. Use asset_catalog with includeSchema=true for the full action schema.' } }, ['type', 'actions']),
  schema({ type: { enum: ['undo', 'redo'] } }, ['type'])
] };
export function studioSchema(model, sets, assetModel) {
  return {
    schema: 1, format: 'my-3D2dge readable key poses', legend: MR.LEGEND, fields: model.FIELDS,
    project: { schema: 1, name: 'Animation Studio', selected: 'Clip name', clips: { 'Clip name': { set: 'quaternius', clip: '{clip,src,dur,loop,keys,...}' } } },
    sets: catalog(sets, { limit: 1 }).sets, action: ACTION_SCHEMA,
    request: { expectedRevision: 'Required current integer revision from GET /api/state', action: 'One action from the schema', source: 'agent or editor', summary: 'Optional short description' },
    preview: { view: VIEWS, cast: CASTS, time: 'seconds', speed: '.05 to 4', facing: 'degrees from -180 to 180', zoom: '.5 to 3', bones: 'boolean', playing: 'boolean' },
    endpoints: { state: 'GET /api/state', edit: 'POST /api/action', project: 'GET or PUT /api/project', live: 'GET /api/events (SSE)', catalog: 'GET /api/catalog?query=&set=&limit=50&offset=0', clip: 'GET /api/clip?set=&name=', preview: 'POST /api/preview', capture: 'POST /api/capture', export: 'GET /api/export?id=&format=json|js', scene: 'GET /api/scene', assets: 'GET /api/assets/catalog?includeSchema=true', sceneEdit: 'POST /api/scene/edit', scenePreview: 'POST /api/scene/preview', sceneCapture: 'POST /api/scene/capture', sceneExport: 'GET /api/scene/export?level=&format=json|html' },
    ...(assetModel ? { assets: assetModel.schema() } : {})
  };
}

export function createStudioSession({ file = resolve(REPO_ROOT, '.animation-studio/project.json'), root = REPO_ROOT, watchDebounce = 80 } = {}) {
  file = resolve(file);
  const { model, assetModel, sets } = loadStudioResources(root), listeners = new Set(), undo = [], redo = [];
  let project, revision = Date.now(), lastChange = { source: 'studio', summary: 'Project opened' };
  let diskText = '', canonical = '', lastError = null, timer, closed = false, saveID = 0;
  const emit = (event, data) => { for (const fn of listeners) fn(event, data); };
  const snapshot = () => ({ revision, project: model.clone(project), canUndo: undo.length > 0, canRedo: redo.length > 0, lastChange: { ...lastChange } });
  const record = (stack, p) => { stack.push(p); if (stack.length > 50) stack.shift(); };
  const parse = raw => { if (Buffer.byteLength(raw) > MAX_BYTES) throw new Error('Project exceeds the 8 MiB limit.'); return model.validateProject(JSON.parse(raw), sets); };
  const read = () => { if (statSync(file).size > MAX_BYTES) throw new Error('Project exceeds the 8 MiB limit.'); return readFileSync(file, 'utf8'); };
  const save = p => {
    const raw = JSON.stringify(p, null, 2) + '\n';
    if (Buffer.byteLength(raw) > MAX_BYTES) throw new StudioError('Project exceeds the 8 MiB limit.');
    const tmp = resolve(dirname(file), '.' + basename(file) + '.' + process.pid + '.' + (++saveID) + '.tmp');
    try { writeFileSync(tmp, raw, { flag: 'wx', mode: 0o600 }); renameSync(tmp, file); }
    catch (err) { try { unlinkSync(tmp); } catch {} throw new StudioError('Cannot save the project: ' + err.message, 500); }
    diskText = raw; canonical = serial(p); lastError = null;
  };
  mkdirSync(dirname(file), { recursive: true });
  try { diskText = read(); project = parse(diskText); canonical = serial(project); }
  catch (err) {
    if (err.code !== 'ENOENT') throw new Error('Cannot open project. The file was left unchanged. ' + err.message);
    project = model.createProject(sets); model.validateProject(project, sets); save(project);
  }
  // Watch the directory, not its inode: editors commonly replace the file with an atomic rename.
  const refresh = () => {
    if (closed) return;
    try {
      const raw = read(); if (raw === diskText && !lastError) return;
      const incoming = parse(raw), next = serial(incoming), wasError = lastError;
      diskText = raw; lastError = null;
      if (next === canonical) { if (wasError) emit('state', snapshot()); return; }
      record(undo, project); redo.length = 0; project = incoming; canonical = next;
      revision++; lastChange = { source: 'file', summary: 'Project file changed' }; emit('state', snapshot());
    } catch (err) {
      const error = 'Project file was not loaded. The last valid animation is still active. ' + err.message;
      if (lastError !== error) { lastError = error; emit('error', { error, revision }); }
    }
  };
  const watcher = watch(dirname(file), (event, name) => {
    if (name !== null && String(name) !== basename(file)) return;
    clearTimeout(timer); timer = setTimeout(refresh, watchDebounce); timer.unref();
  });
  watcher.on('error', err => { lastError = 'Cannot watch project file. ' + err.message; emit('error', { error: lastError, revision }); });
  const expect = value => {
    refresh();
    if (!Number.isSafeInteger(value) || value < 0) throw new StudioError('expectedRevision must be the integer revision from GET /api/state.');
    if (value !== revision) throw new StudioError('Revision conflict. Read the latest state and apply the edit again.', 409, { revision });
    if (lastError) throw new StudioError('Fix the invalid project file before saving another edit. ' + lastError, 409, { revision });
  };
  const change = (value, expected, source, summary, historyAction) => {
    expect(expected);
    const next = model.validateProject(value, sets);
    if (serial(next) === canonical && !historyAction) return snapshot();
    save(next); // A disk error must leave the project and its history unchanged.
    if (historyAction === 'undo') { record(redo, project); undo.pop(); }
    else if (historyAction === 'redo') { record(undo, project); redo.pop(); }
    else { record(undo, project); redo.length = 0; }
    project = next; revision++; lastChange = { source, summary }; const state = snapshot(); emit('state', state); return state;
  };
  return {
    file, model, assetModel, sets, snapshot, refresh,
    get lastError() { return lastError; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    apply(body) {
      object(body); expect(body.expectedRevision); object(body.action, 'action');
      const source = body.source === undefined ? 'agent' : body.source;
      if (!['agent', 'editor'].includes(source)) throw new StudioError('source must be agent or editor.');
      const summary = body.summary === undefined ? body.action.type : text(body.summary, 240, 'summary');
      let next;
      if (body.action.type === 'undo' || body.action.type === 'redo') {
        if (Object.keys(body.action).some(key => key !== 'type')) throw new StudioError('Undo and redo actions accept only the type field.');
        const stack = body.action.type === 'undo' ? undo : redo;
        if (!stack.length) throw new StudioError('There is no edit to ' + body.action.type + '.', 409, { revision });
        next = stack[stack.length - 1];
      } else next = model.apply(project, body.action, sets);
      return change(next, body.expectedRevision, source, summary, ['undo', 'redo'].includes(body.action.type) ? body.action.type : null);
    },
    replace(body) {
      object(body); expect(body.expectedRevision);
      const source = body.source === undefined ? 'agent' : body.source;
      if (!['agent', 'editor'].includes(source)) throw new StudioError('source must be agent or editor.');
      return change(body.project, body.expectedRevision, source, 'Project imported');
    },
    preview(body) {
      const value = previewOptions(body, project);
      value.id = value.id ?? project.selected; // Every client must use the same target that time validation used.
      value.workspace = 'animation';
      emit('preview', value); return { ...value, revision };
    },
    scene(body = {}) {
      only(body, ['type', 'id', 'level', 'includeSchema', 'full'], 'scene request'); refresh();
      for (const key of ['includeSchema', 'full']) if (own(body, key) && typeof body[key] !== 'boolean') throw new StudioError(key + ' must be true or false.');
      const state = snapshot(), assets = projectAssets(project, assetModel), result = sceneReceipt(state, assetModel);
      if (body.type !== undefined && !['material', 'model', 'level', 'object'].includes(body.type)) throw new StudioError('type must be material, model, level or object.');
      if (body.id !== undefined && (typeof body.id !== 'string' || !body.id)) throw new StudioError('id must be a non-empty string.');
      if (body.level !== undefined && (typeof body.level !== 'string' || !own(assets.levels, body.level))) throw new StudioError('Scene level does not exist.', 404);
      if (body.id !== undefined && body.type === undefined) throw new StudioError('Provide type when inspecting an id.');
      if (body.type) {
        const levelID = body.level || assets.selectedLevel, registry = body.type === 'object' ? assets.levels[levelID].objects : assets[body.type + 's'];
        const id = body.id ?? (body.type === 'level' ? levelID : body.type === 'object' && levelID === assets.selectedLevel ? assets.selectedObject : undefined);
        if (typeof id !== 'string' || !own(registry, id)) throw new StudioError('The requested ' + body.type + ' does not exist. Provide its id from scene_get.', 404);
        result.inspected = { type: body.type, id, ...(body.type === 'object' ? { level: levelID } : {}), data: model.clone(registry[id]) };
      }
      if (body.includeSchema) result.schema = assetModel.schema();
      if (body.full) result.project = state.project;
      return result;
    },
    assetCatalog(body = {}) {
      only(body, ['includeSchema'], 'asset catalog');
      if (own(body, 'includeSchema') && typeof body.includeSchema !== 'boolean') throw new StudioError('includeSchema must be true or false.');
      refresh(); const state = snapshot(), result = { ...assetModel.catalog(), current: sceneReceipt(state, assetModel) };
      if (body.includeSchema) result.schema = assetModel.schema();
      return result;
    },
    scenePreview(body) {
      refresh(); const assets = projectAssets(project, assetModel);
      const value = { workspace: 'scene', ...sceneOptions(body, assets) };
      emit('preview', value); return { ...value, revision };
    },
    sceneExport(levelID) {
      refresh(); const state = snapshot(), assets = projectAssets(project, assetModel);
      levelID ??= assets.selectedLevel;
      if (typeof levelID !== 'string' || !own(assets.levels, levelID)) throw new StudioError('Scene level does not exist.', 404);
      const data = assetModel.exportData(assets, { clips: project.clips });
      data.levels = { [levelID]: data.levels[levelID] }; data.selectedLevel = levelID;
      if (!own(data.levels[levelID].objects, data.selectedObject)) data.selectedObject = null;
      const ids = new Set(Object.values(data.levels[levelID].objects).filter(o => o.kind === 'actor').map(o => o.clip));
      // This is a complete readable project so an agent can import the export without a conversion step.
      // Keep a selected clip when a level has no actors; schema 1 always contains at least one animation.
      if (!ids.size) ids.add(project.selected);
      const clips = Object.fromEntries([...ids].map(id => [id, project.clips[id]]));
      const exported = model.validateProject({ ...project, selected: own(clips, project.selected) ? project.selected : [...ids][0], clips, assets: data }, sets);
      return { schema: 1, level: levelID, revision: state.revision, project: exported };
    },
    export(id = project.selected, format = 'json') {
      if (!['json', 'js'].includes(format)) throw new StudioError('format must be json or js.');
      const out = model.exportSet(project, id, sets), json = JSON.stringify(out, null, 2);
      // Bracket assignment preserves every legal name. Escaping HTML boundaries also permits safe inline scripts.
      const escaped = json.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      const setName = JSON.stringify(out.set).replace(/</g, '\\u003c');
      return { id, set: out, text: format === 'js' ? '(window.MOCAP = window.MOCAP || {})[' + setName + '] = ' + escaped + ';\n' : json + '\n' };
    },
    close() { closed = true; clearTimeout(timer); watcher.close(); listeners.clear(); }
  };
}
