/* =============================================================================
 * ASSET STUDIO MODEL  readable materials, part models and tile levels. No I/O.
 * Shared by the browser and local tools. Positions are [x,y,z], with z up.
 * A part position is its bottom-face center; size is [width,depth,height].
 * applyMany validates references at the end and never changes its input.
 * context: {clipIds:[...]}, or {clips:<the animation project's clips object>}.
 * ============================================================================= */
var AssetStudioModel = (() => {
'use strict';
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const fail = message => { throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const RESERVED = ['__proto__', 'prototype', 'constructor'];
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const PATTERNS = ['solid', 'checker', 'brick', 'planks', 'noise'], SHAPES = ['box', 'wedge', 'cylinder'];
const LIMITS = { materials: 128, models: 128, levels: 16, objectsPerLevel: 256, partsPerModel: 32,
  levelWidth: 64, levelHeight: 64, actions: 100, position: 4096 };
const FIELDS = {
  project: ['schema', 'materials', 'models', 'levels', 'selectedLevel', 'selectedObject'],
  material: ['name', 'color', 'accent', 'pattern', 'scale', 'seed'], model: ['name', 'parts', 'tags'],
  part: ['shape', 'position', 'size', 'rotation', 'material'],
  level: ['name', 'tile', 'rows', 'tiles', 'objects', 'spawn'], tile: ['material', 'height', 'solid'],
  object: ['name', 'kind', 'model', 'clip', 'position', 'rotation', 'scale', 'visible', 'solid']
};
const ACTION_FIELDS = {
  material_create: ['id', 'material'], material_update: ['id', 'changes'], material_delete: ['id'],
  model_create: ['id', 'model'], model_update: ['id', 'changes'], model_delete: ['id'],
  level_create: ['id', 'level'], level_update: ['id', 'changes'], level_delete: ['id'],
  object_add: ['level', 'id', 'object'], object_update: ['level', 'id', 'changes'], object_delete: ['level', 'id'],
  object_duplicate: ['level', 'id', 'newId', 'offset'], paint: ['level', 'cells'],
  fill: ['level', 'x', 'y', 'width', 'height', 'tile'], select: ['level', 'id'], load_preset: ['preset']
};
/** JSON-only copying rejects unsafe keys before an assignment can interpret them. */
function clone(input) {
  const active = new Set();
  function copy(value, depth) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') { if (!Number.isFinite(value)) fail('Asset data cannot contain a nonfinite number.'); return value; }
    if (!object(value) && !Array.isArray(value)) fail('Asset data must contain JSON values only.');
    if (depth > 64 || active.has(value)) fail('Asset data is too deeply nested or contains a cycle.');
    const proto = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && proto !== null && Object.getPrototypeOf(proto) !== null) fail('Asset data must contain plain JSON objects.');
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') fail('Asset data cannot contain symbol keys.');
      if (RESERVED.includes(key)) fail('Asset data contains the reserved key "' + key + '".');
      if (!own(Object.getOwnPropertyDescriptor(value, key), 'value')) fail('Asset data cannot contain getters or setters.');
    }
    active.add(value);
    let result;
    if (Array.isArray(value)) result = Array.from(value, item => copy(item, depth + 1));
    else {
      result = {};
      for (const key of Object.keys(value)) {
        result[key] = copy(value[key], depth + 1);
      }
    }
    active.delete(value); return result;
  }
  return copy(input, 0);
}
function fields(value, allowed, at, required = []) {
  if (!object(value)) fail(at + ' must be an object.');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(at + ': unknown field "' + key + '".');
  for (const key of required) if (!own(value, key)) fail(at + ': missing "' + key + '".');
  return value;
}
function id(value, at = 'ID') {
  if (typeof value !== 'string' || !ID.test(value) || RESERVED.includes(value)) fail(at + ' must start with a letter and use 1 to 64 letters, digits, underscores or hyphens. Reserved keys are not allowed.');
  return value;
}
function text(value, at, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(at + ' must contain 1 to ' + max + ' printable characters.');
  return value;
}
function number(value, at, low, high, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high || (integer && !Number.isInteger(value))) fail(at + ' must be ' + (integer ? 'an integer' : 'a finite number') + ' from ' + low + ' to ' + high + '.');
  return value;
}
function vector(value, at, low = -LIMITS.position, high = LIMITS.position) {
  if (!Array.isArray(value) || value.length !== 3) fail(at + ' must contain three numbers [x,y,z].');
  value.forEach((n, i) => number(n, at + '[' + i + ']', low, high)); return value;
}
function boolean(value, at) { if (typeof value !== 'boolean') fail(at + ' must be true or false.'); }
function registry(value, at, min, max) {
  if (!object(value)) fail(at + ' must be an object keyed by IDs.');
  const entries = Object.entries(value);
  if (entries.length < min || entries.length > max) fail(at + ' must contain ' + min + ' to ' + max + ' entries.');
  for (const [key] of entries) id(key, at + ' ID'); return entries;
}
function tileChar(value, at) {
  if (typeof value !== 'string' || !/^[ -~]$/.test(value)) fail(at + ' must be one printable ASCII character.');
  return value;
}
function clipIds(context = {}) {
  if (!object(context)) fail('Asset context must be an object.');
  if (context.clipIds !== undefined) {
    if (!Array.isArray(context.clipIds) || context.clipIds.some(value => typeof value !== 'string' || !value)) fail('Asset context clipIds must be an array of clip names.');
    return context.clipIds;
  }
  if (context.clips !== undefined) { if (!object(context.clips)) fail('Asset context clips must be an object.'); return Object.keys(context.clips); }
  return [];
}
function reference(records, value, at, kind) {
  id(value, at);
  if (!own(records, value)) fail(at + ': ' + kind + ' "' + value + '" does not exist.');
}
/** All saved fields are explicit. Defaults belong to actions, never hidden in a file. */
function validateProject(input, context = {}) {
  const p = clone(input), knownClips = new Set(clipIds(context));
  fields(p, FIELDS.project, 'Assets', FIELDS.project);
  if (p.schema !== 1) fail('Assets schema must be 1.');
  for (const [key, m] of registry(p.materials, 'Materials', 1, LIMITS.materials)) {
    const at = 'Material "' + key + '"'; fields(m, FIELDS.material, at, FIELDS.material); text(m.name, at + ' name');
    for (const c of ['color', 'accent']) if (typeof m[c] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(m[c])) fail(at + ' ' + c + ' must be a six-digit hex color such as #78a050.');
    if (!PATTERNS.includes(m.pattern)) fail(at + ' pattern must be one of: ' + PATTERNS.join(', ') + '.');
    number(m.scale, at + ' scale', .25, 64); number(m.seed, at + ' seed', 0, 2147483647, true);
  }
  for (const [key, m] of registry(p.models, 'Models', 0, LIMITS.models)) {
    const at = 'Model "' + key + '"'; fields(m, FIELDS.model, at, FIELDS.model); text(m.name, at + ' name');
    if (!Array.isArray(m.parts) || m.parts.length < 1 || m.parts.length > LIMITS.partsPerModel) fail(at + ' needs 1 to ' + LIMITS.partsPerModel + ' parts.');
    if (!Array.isArray(m.tags) || m.tags.length > 16) fail(at + ' tags must be an array of at most 16 values.');
    m.tags.forEach(tag => text(tag, at + ' tag', 48));
    m.parts.forEach((part, i) => {
      const where = at + ' part ' + (i + 1); fields(part, FIELDS.part, where, FIELDS.part);
      if (!SHAPES.includes(part.shape)) fail(where + ' shape must be one of: ' + SHAPES.join(', ') + '.');
      vector(part.position, where + ' position'); vector(part.size, where + ' size', .125, 1024);
      number(part.rotation, where + ' rotation', -36000, 36000);
      reference(p.materials, part.material, where + ' material', 'material');
    });
  }
  for (const [key, l] of registry(p.levels, 'Levels', 1, LIMITS.levels)) {
    const at = 'Level "' + key + '"'; fields(l, FIELDS.level, at, FIELDS.level); text(l.name, at + ' name');
    number(l.tile, at + ' tile size', 1, 64, true); vector(l.spawn, at + ' spawn');
    if (!Array.isArray(l.rows) || !l.rows.length || l.rows.length > LIMITS.levelHeight) fail(at + ' needs 1 to ' + LIMITS.levelHeight + ' rows.');
    const width = typeof l.rows[0] === 'string' ? l.rows[0].length : 0;
    if (width < 1 || width > LIMITS.levelWidth) fail(at + ' rows must be 1 to ' + LIMITS.levelWidth + ' cells wide.');
    if (!object(l.tiles) || !Object.keys(l.tiles).length || Object.keys(l.tiles).length > 32) fail(at + ' tiles must contain 1 to 32 tile definitions.');
    for (const [symbol, tile] of Object.entries(l.tiles)) {
      const where = at + ' tile "' + symbol + '"'; tileChar(symbol, where); fields(tile, FIELDS.tile, where, FIELDS.tile);
      reference(p.materials, tile.material, where + ' material', 'material');
      number(tile.height, where + ' height', 0, 512); boolean(tile.solid, where + ' solid');
    }
    l.rows.forEach((row, y) => {
      if (typeof row !== 'string' || row.length !== width || !/^[ -~]+$/.test(row)) fail(at + ' row ' + y + ' must contain ' + width + ' printable ASCII cells.');
      for (const symbol of row) if (!own(l.tiles, symbol)) fail(at + ' row ' + y + ': tile "' + symbol + '" is not defined.');
    });
    for (const [key, o] of registry(l.objects, at + ' objects', 0, LIMITS.objectsPerLevel)) {
      const where = at + ' object "' + key + '"';
      fields(o, FIELDS.object, where, ['name', 'kind', 'position', 'rotation', 'scale', 'visible', 'solid']);
      text(o.name, where + ' name'); vector(o.position, where + ' position');
      number(o.rotation, where + ' rotation', -36000, 36000); number(o.scale, where + ' scale', .05, 16);
      boolean(o.visible, where + ' visible'); boolean(o.solid, where + ' solid');
      if (o.kind === 'model') {
        if (own(o, 'clip')) fail(where + ': a model object cannot have a clip field.');
        reference(p.models, o.model, where + ' model', 'model');
      } else if (o.kind === 'actor') {
        if (own(o, 'model')) fail(where + ': an actor cannot have a model field.');
        text(o.clip, where + ' clip', 80);
        if (!knownClips.has(o.clip)) fail(where + ': animation clip "' + o.clip + '" does not exist in this project.');
      } else fail(where + ' kind must be "model" or "actor".');
    }
  }
  reference(p.levels, p.selectedLevel, 'Assets selectedLevel', 'level');
  if (p.selectedObject !== null) reference(p.levels[p.selectedLevel].objects, p.selectedObject, 'Assets selectedObject', 'object in the selected level');
  return p;
}
const defaultMaterial = name => ({ name, color: '#b59c78', accent: '#70573c', pattern: 'solid', scale: 1, seed: 1 });
const part = (shape, position, size, material, rotation = 0) => ({ shape, position, size, rotation, material });
const placed = (name, model, position, rotation = 0, scale = 1) => ({ name, kind: 'model', model, position, rotation, scale, visible: true, solid: true });
function blankLevel(name, material) {
  return { name, tile: 16, rows: new Array(16).fill('.'.repeat(20)), tiles: { '.': { material, height: 0, solid: false } }, objects: {}, spawn: [160, 128, 0] };
}
/** Presets contain authored data and deterministic texture seeds, no binary assets. */
function createProject(options = {}) {
  if (!object(options)) fail('New asset options must be an object.');
  const preset = options.preset === undefined ? 'courtyard' : options.preset;
  if (!['courtyard', 'empty'].includes(preset)) fail('Asset preset must be "courtyard" or "empty".');
  const materials = {
    stone: { name: 'Limestone', color: '#a6b1b4', accent: '#78868d', pattern: 'checker', scale: 8, seed: 11 },
    brick: { name: 'Stone blocks', color: '#8797a3', accent: '#51616d', pattern: 'brick', scale: 8, seed: 23 },
    wood: { name: 'Warm timber', color: '#b9824e', accent: '#724628', pattern: 'planks', scale: 8, seed: 37 },
    grass: { name: 'Meadow grass', color: '#527d64', accent: '#3b5e50', pattern: 'noise', scale: 2, seed: 53 },
    water: { name: 'Pool water', color: '#4d9aa7', accent: '#83c3c3', pattern: 'noise', scale: 6, seed: 71 },
    metal: { name: 'Iron details', color: '#526375', accent: '#9dafbc', pattern: 'solid', scale: 1, seed: 89 }
  };
  const models = {
    Crate: { name: 'Timber crate', tags: ['storage', 'wood'], parts: [
      part('box', [0, 0, 0], [24, 24, 24], 'wood'), part('box', [-9, 0, 0], [3, 25, 25], 'metal'),
      part('box', [9, 0, 0], [3, 25, 25], 'metal') ] },
    Bench: { name: 'Garden bench', tags: ['furniture', 'wood'], parts: [
      part('box', [0, 0, 12], [48, 15, 4], 'wood'), part('box', [-17, 0, 0], [5, 12, 12], 'metal'),
      part('box', [17, 0, 0], [5, 12, 12], 'metal'), part('box', [0, 6, 20], [48, 3, 12], 'wood'),
      part('box', [-17, 6, 12], [3, 3, 14], 'metal'), part('box', [17, 6, 12], [3, 3, 14], 'metal') ] },
    Arch: { name: 'Courtyard arch', tags: ['architecture', 'stone'], parts: [
      part('box', [-29, 0, 0], [14, 18, 48], 'brick'), part('box', [29, 0, 0], [14, 18, 48], 'brick'),
      part('box', [0, 0, 46], [72, 20, 12], 'stone'), part('box', [-29, 0, 0], [20, 24, 5], 'stone'),
      part('box', [29, 0, 0], [20, 24, 5], 'stone'), part('wedge', [0, 0, 58], [78, 24, 8], 'brick') ] },
    Column: { name: 'Stone column', tags: ['architecture', 'stone'], parts: [
      part('box', [0, 0, 0], [24, 24, 5], 'stone'), part('cylinder', [0, 0, 5], [15, 15, 38], 'brick'),
      part('box', [0, 0, 43], [23, 23, 5], 'stone') ] },
    Steps: { name: 'Three stone steps', tags: ['architecture', 'stone'], parts: [
      part('box', [0, -12, 0], [40, 12, 5], 'stone'), part('box', [0, 0, 0], [40, 12, 10], 'stone'),
      part('box', [0, 12, 0], [40, 12, 15], 'stone') ] }
  };
  if (preset === 'empty') return validateProject({ schema: 1, materials, models, levels: { Empty: blankLevel('Empty level', 'stone') }, selectedLevel: 'Empty', selectedObject: null }, options);
  const width = 24, height = 20;
  const rows = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) return '#';
    if (x >= 16 && x <= 20 && y >= 4 && y <= 7) return 'w';
    if ((x >= 9 && x <= 14) || (y >= 9 && y <= 12)) return '.';
    return 'g';
  }).join(''));
  // Open the front entrance so playtest can leave the courtyard.
  rows[height - 1] = rows[height - 1].slice(0, 10) + '....' + rows[height - 1].slice(14);
  const level = { name: 'Timber and stone courtyard', tile: 16, rows,
    tiles: { '.': { material: 'stone', height: 0, solid: false }, '#': { material: 'brick', height: 20, solid: true },
      g: { material: 'grass', height: 0, solid: false }, w: { material: 'water', height: 0, solid: true } },
    objects: {
      Gate: placed('Courtyard gate', 'Arch', [192, 48, 0]),
      Bench_West: placed('West bench', 'Bench', [80, 136, 0]),
      Bench_East: placed('East bench', 'Bench', [304, 232, 0], 180),
      Crate_A: placed('Supply crate', 'Crate', [72, 232, 0], 8),
      Crate_B: placed('Stacked crate', 'Crate', [96, 248, 0], -10, .8),
      Column_West: placed('West column', 'Column', [104, 64, 0]),
      Column_East: placed('East column', 'Column', [280, 64, 0]),
      Pool_Steps: placed('Pool steps', 'Steps', [296, 144, 0], 180)
    }, spawn: [192, 240, 0] };
  const firstClip = clipIds(options)[0];
  if (firstClip) level.objects.Guide = { name: 'Animation guide', kind: 'actor', clip: firstClip, position: [192, 168, 0], rotation: -35, scale: 1, visible: true, solid: false };
  return validateProject({ schema: 1, materials, models, levels: { Courtyard: level }, selectedLevel: 'Courtyard', selectedObject: firstClip ? 'Guide' : 'Crate_A' }, options);
}
function requireEntry(records, key, kind) {
  id(key, kind + ' ID'); if (!own(records, key)) fail(kind + ' "' + key + '" does not exist.'); return records[key];
}
function fresh(records, key, kind) {
  id(key, kind + ' ID'); if (own(records, key)) fail(kind + ' "' + key + '" already exists. Choose another ID.'); return key;
}
function patch(input, kind) {
  fields(input, FIELDS[kind], kind + ' changes');
  if (!Object.keys(input).length) fail(kind + ' changes must contain at least one field.');
  return input;
}
function modelParts(parts, material) {
  if (!Array.isArray(parts)) fail('Model parts must be an array.');
  return parts.map(input => Object.assign(part('box', [0, 0, 0], [16, 16, 16], material), fields(input, FIELDS.part, 'Model part')));
}
function createLevel(name, input, material) {
  fields(input, FIELDS.level, 'New level');
  return Object.assign(blankLevel(name, material), input);
}
/** Step changes only private working data. References may be created later in a batch. */
function step(p, action, context) {
  if (!object(action) || !own(ACTION_FIELDS, action.type)) fail('Unknown asset action type "' + String(action?.type) + '".');
  fields(action, ['type', ...ACTION_FIELDS[action.type]], 'Asset action "' + action.type + '"');
  const firstMaterial = () => Object.keys(p.materials)[0] || 'stone';
  if (action.type === 'load_preset') {
    if (!own(action, 'preset')) fail('Load preset needs a preset name: "courtyard" or "empty".');
    return createProject(Object.assign({}, context, { preset: action.preset }));
  }
  if (action.type === 'material_create') {
    const key = fresh(p.materials, action.id, 'Material');
    p.materials[key] = Object.assign(defaultMaterial(key), fields(action.material, FIELDS.material, 'New material'));
  } else if (action.type === 'material_update') Object.assign(requireEntry(p.materials, action.id, 'Material'), patch(action.changes, 'material'));
  else if (action.type === 'material_delete') { requireEntry(p.materials, action.id, 'Material'); delete p.materials[action.id]; }
  else if (action.type === 'model_create') {
    const key = fresh(p.models, action.id, 'Model'), input = fields(action.model, FIELDS.model, 'New model');
    p.models[key] = Object.assign({ name: key, parts: [part('box', [0, 0, 0], [24, 24, 24], firstMaterial())], tags: [] }, input);
    p.models[key].parts = modelParts(p.models[key].parts, firstMaterial());
  } else if (action.type === 'model_update') {
    const model = requireEntry(p.models, action.id, 'Model'), changes = patch(action.changes, 'model');
    Object.assign(model, changes); if (own(changes, 'parts')) model.parts = modelParts(changes.parts, firstMaterial());
  } else if (action.type === 'model_delete') { requireEntry(p.models, action.id, 'Model'); delete p.models[action.id]; }
  else if (action.type === 'level_create') {
    const key = fresh(p.levels, action.id, 'Level');
    p.levels[key] = createLevel(key, action.level === undefined ? {} : action.level, firstMaterial());
    p.selectedLevel = key; p.selectedObject = null;
  } else if (action.type === 'level_update') Object.assign(requireEntry(p.levels, action.id === undefined ? p.selectedLevel : action.id, 'Level'), patch(action.changes, 'level'));
  else if (action.type === 'level_delete') {
    requireEntry(p.levels, action.id, 'Level'); delete p.levels[action.id];
    if (p.selectedLevel === action.id) { p.selectedLevel = Object.keys(p.levels)[0] || null; p.selectedObject = null; }
  } else if (action.type === 'select') {
    if (!own(action, 'level') && !own(action, 'id')) fail('Asset select needs a level or an object id (null clears the object).');
    if (own(action, 'level') && p.selectedLevel !== action.level) { p.selectedLevel = action.level; p.selectedObject = null; }
    if (own(action, 'id')) p.selectedObject = action.id;
  } else {
    const levelId = action.level === undefined ? p.selectedLevel : action.level, level = requireEntry(p.levels, levelId, 'Level');
    if (action.type === 'object_add') {
      const key = fresh(level.objects, action.id, 'Object'), input = fields(action.object, FIELDS.object, 'New object', ['kind']);
      level.objects[key] = Object.assign({ name: key, position: [0, 0, 0], rotation: 0, scale: 1, visible: true, solid: input.kind !== 'actor' }, input);
      if (p.selectedLevel === levelId) p.selectedObject = key;
    } else if (action.type === 'object_update') {
      const obj = requireEntry(level.objects, action.id, 'Object'), changes = patch(action.changes, 'object');
      if (own(changes, 'kind') && changes.kind !== obj.kind) { delete obj.clip; delete obj.model; }
      Object.assign(obj, changes);
    } else if (action.type === 'object_delete') {
      requireEntry(level.objects, action.id, 'Object'); delete level.objects[action.id];
      if (p.selectedLevel === levelId && p.selectedObject === action.id) p.selectedObject = null;
    } else if (action.type === 'object_duplicate') {
      const src = requireEntry(level.objects, action.id, 'Object'), key = fresh(level.objects, action.newId, 'Object');
      const offset = action.offset === undefined ? [16, 16, 0] : vector(action.offset, 'Duplicate offset');
      level.objects[key] = Object.assign(clone(src), { name: src.name.slice(0, 115) + ' copy', position: src.position.map((n, i) => n + offset[i]) });
      if (p.selectedLevel === levelId) p.selectedObject = key;
    } else if (action.type === 'paint' || action.type === 'fill') {
      const width = level.rows[0].length, height = level.rows.length;
      const cell = (x, y, tile) => {
        number(x, 'Cell x', 0, width - 1, true); number(y, 'Cell y', 0, height - 1, true); tileChar(tile, 'Cell tile');
        level.rows[y] = level.rows[y].slice(0, x) + tile + level.rows[y].slice(x + 1);
      };
      if (action.type === 'paint') {
        if (!Array.isArray(action.cells) || action.cells.length < 1 || action.cells.length > LIMITS.levelWidth * LIMITS.levelHeight) fail('Paint cells must contain 1 to 4096 cells.');
        for (const c of action.cells) { fields(c, ['x', 'y', 'tile'], 'Paint cell', ['x', 'y', 'tile']); cell(c.x, c.y, c.tile); }
      } else {
        number(action.width, 'Fill width', 1, width, true); number(action.height, 'Fill height', 1, height, true);
        number(action.x, 'Fill x', 0, width - action.width, true); number(action.y, 'Fill y', 0, height - action.height, true); tileChar(action.tile, 'Fill tile');
        for (let y = action.y; y < action.y + action.height; y++) for (let x = action.x; x < action.x + action.width; x++) cell(x, y, action.tile);
      }
    }
  }
  return p;
}
function applyMany(project, actions, context = {}) {
  if (!Array.isArray(actions) || actions.length < 1 || actions.length > LIMITS.actions) fail('Asset actions must contain 1 to ' + LIMITS.actions + ' actions.');
  let p = validateProject(project, context);
  for (const action of clone(actions)) p = step(p, action, context);
  return validateProject(p, context);
}
function apply(project, action, context = {}) { return applyMany(project, [action], context); }
function catalog() {
  return { presets: [{ id: 'courtyard', name: 'Timber and stone courtyard', description: 'A 24 by 20 level, six procedural materials, five reusable models and an actor when an animation is available.' },
    { id: 'empty', name: 'Empty level', description: 'A 20 by 16 floor with no placed objects. Keeps the six materials and five model templates ready to use.' }],
    shapes: [...SHAPES], patterns: [...PATTERNS], limits: clone(LIMITS),
    coordinates: { position: '[x,y,z], z up, in engine world units', partOrigin: 'center of the bottom face', size: '[widthX,depthY,heightZ]', rotation: 'degrees around z', tile: 'rows[y][x]; tile centers are [(x+.5)*tile,(y+.5)*tile,0]' },
    actions: Object.keys(ACTION_FIELDS), examples: {
      createMaterial: { type: 'material_create', id: 'sand', material: { name: 'Warm sand', color: '#ceb778', accent: '#a08955', pattern: 'noise', scale: 2, seed: 7 } },
      createModel: { type: 'model_create', id: 'Block', model: { name: 'Low block', parts: [part('box', [0, 0, 0], [32, 24, 16], 'stone')], tags: ['architecture'] } },
      placeObject: { type: 'object_add', id: 'NewCrate', object: { kind: 'model', model: 'Crate', position: [160, 192, 0] } },
      paint: { type: 'fill', x: 4, y: 4, width: 3, height: 2, tile: '.' }
    } };
}
/** A compact inventory; callers pass validated data from their shared snapshot. */
function summary(project) {
  const p = project, level = p.levels[p.selectedLevel], allObjects = Object.values(p.levels).flatMap(l => Object.values(l.objects));
  return clone({ schema: 1, selectedLevel: p.selectedLevel, selectedObject: p.selectedObject,
    counts: { materials: Object.keys(p.materials).length, models: Object.keys(p.models).length, levels: Object.keys(p.levels).length,
      objects: allObjects.length, actors: allObjects.filter(o => o.kind === 'actor').length, parts: Object.values(p.models).reduce((n, m) => n + m.parts.length, 0) },
    materials: Object.entries(p.materials).map(([id, m]) => ({ id, name: m.name, color: m.color, pattern: m.pattern })),
    models: Object.entries(p.models).map(([id, m]) => ({ id, name: m.name, parts: m.parts.length, tags: m.tags })),
    levels: Object.entries(p.levels).map(([id, l]) => ({ id, name: l.name, width: l.rows[0].length, height: l.rows.length, tile: l.tile, objects: Object.keys(l.objects).length, spawn: l.spawn })),
    level: { id: p.selectedLevel, name: level.name, width: level.rows[0].length, height: level.rows.length, tile: level.tile,
      spawn: level.spawn, tiles: level.tiles, objects: Object.entries(level.objects).map(([id, o]) => Object.assign({ id }, o)) } });
}
/** Inlined JSON Schema works when embedded under an MCP tool's input schema. */
function schema() {
  const num = (minimum, maximum, integer = false) => ({ type: integer ? 'integer' : 'number', minimum, maximum });
  const str = (maxLength = 120) => ({ type: 'string', minLength: 1, maxLength });
  const identifier = { ...str(64), pattern: '^[A-Za-z][A-Za-z0-9_-]{0,63}$', not: { enum: RESERVED } };
  const bool = { type: 'boolean' }, vec = (min = -LIMITS.position, max = LIMITS.position) => ({ type: 'array', items: num(min, max), minItems: 3, maxItems: 3 });
  const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
  const dict = (additionalProperties, minProperties, maxProperties, propertyNames = identifier) => ({ type: 'object', additionalProperties, minProperties, maxProperties, propertyNames });
  const tileSymbol = { type: 'string', pattern: '^[ -~]$', minLength: 1, maxLength: 1 };
  const material = obj({ name: str(), color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }, accent: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
    pattern: { enum: PATTERNS }, scale: num(.25, 64), seed: num(0, 2147483647, true) });
  const partSchema = obj({ shape: { enum: SHAPES }, position: vec(), size: vec(.125, 1024), rotation: num(-36000, 36000), material: identifier });
  const model = obj({ name: str(), parts: { type: 'array', items: partSchema, minItems: 1, maxItems: LIMITS.partsPerModel }, tags: { type: 'array', items: str(48), maxItems: 16 } });
  const sharedObject = { name: str(), position: vec(), rotation: num(-36000, 36000), scale: num(.05, 16), visible: bool, solid: bool };
  const objectSchema = { oneOf: [obj({ ...sharedObject, kind: { const: 'model' }, model: identifier }), obj({ ...sharedObject, kind: { const: 'actor' }, clip: str(80) })] };
  const tile = obj({ material: identifier, height: num(0, 512), solid: bool });
  const level = obj({ name: str(), tile: num(1, 64, true), rows: { type: 'array', items: { type: 'string', pattern: '^[ -~]+$', minLength: 1, maxLength: LIMITS.levelWidth }, minItems: 1, maxItems: LIMITS.levelHeight },
    tiles: dict(tile, 1, 32, tileSymbol), objects: dict(objectSchema, 0, LIMITS.objectsPerLevel), spawn: vec() });
  const project = obj({ schema: { const: 1 }, materials: dict(material, 1, LIMITS.materials), models: dict(model, 0, LIMITS.models),
    levels: dict(level, 1, LIMITS.levels), selectedLevel: identifier, selectedObject: { anyOf: [identifier, { type: 'null' }] } });
  const partial = (s, minProperties = 0) => Object.assign({}, s, { required: [], minProperties });
  const actions = [], add = (type, properties, required) => actions.push(obj({ type: { const: type }, ...properties }, ['type', ...required]));
  for (const [kind, data] of [['material', material], ['model', model]]) {
    const creating = partial(data);
    if (kind === 'model') creating.properties = { ...data.properties, parts: { ...data.properties.parts, items: partial(partSchema) } };
    add(kind + '_create', { id: identifier, [kind]: creating }, ['id', kind]);
    add(kind + '_update', { id: identifier, changes: partial(creating, 1) }, ['id', 'changes']);
    add(kind + '_delete', { id: identifier }, ['id']);
  }
  add('level_create', { id: identifier, level: partial(level) }, ['id']);
  add('level_update', { id: identifier, changes: partial(level, 1) }, ['changes']);
  add('level_delete', { id: identifier }, ['id']);
  add('object_add', { level: identifier, id: identifier, object: { oneOf: [obj({ ...sharedObject, kind: { const: 'model' }, model: identifier }, ['kind', 'model']), obj({ ...sharedObject, kind: { const: 'actor' }, clip: str(80) }, ['kind', 'clip'])] } }, ['id', 'object']);
  add('object_update', { level: identifier, id: identifier, changes: { ...obj({ ...sharedObject, kind: { enum: ['model', 'actor'] }, model: identifier, clip: str(80) }, []), minProperties: 1 } }, ['id', 'changes']);
  add('object_delete', { level: identifier, id: identifier }, ['id']);
  add('object_duplicate', { level: identifier, id: identifier, newId: identifier, offset: vec() }, ['id', 'newId']);
  add('paint', { level: identifier, cells: { type: 'array', minItems: 1, maxItems: LIMITS.levelWidth * LIMITS.levelHeight, items: obj({ x: num(0, 63, true), y: num(0, 63, true), tile: tileSymbol }) } }, ['cells']);
  add('fill', { level: identifier, x: num(0, 63, true), y: num(0, 63, true), width: num(1, 64, true), height: num(1, 64, true), tile: tileSymbol }, ['x', 'y', 'width', 'height', 'tile']);
  add('select', { level: identifier, id: { anyOf: [identifier, { type: 'null' }] } }, []);
  actions[actions.length - 1].anyOf = [{ required: ['level'] }, { required: ['id'] }];
  add('load_preset', { preset: { enum: ['courtyard', 'empty'] } }, ['preset']);
  return clone({ project, action: { oneOf: actions }, limits: LIMITS, coordinates: catalog().coordinates,
    batch: 'Use 1 to 100 actions. References are checked after the full batch. Unknown fields, reserved keys, and nonfinite numbers are rejected.' });
}
function exportData(project, context = {}) { return validateProject(project, context); }
return { clone, createProject, validateProject, apply, applyMany, catalog, schema, summary, exportData };
})();
