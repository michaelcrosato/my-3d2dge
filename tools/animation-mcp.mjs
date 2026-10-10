// MCP stdio bridge for live animation, asset and level work. JSON-RPC only on stdout; diagnostics on stderr.
// Usage: node tools/animation-mcp.mjs [--url http://127.0.0.1:4173]
// Transport: MCP 2025-11-25, newline-delimited JSON-RPC 2.0. No model account or API key is used by this bridge.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ACTION_SCHEMA, VIEWS, CASTS, MAX_BYTES, loadAssetModel } from './studio-service.mjs';

const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const schema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const name = { type: 'string', minLength: 1, maxLength: 80 };
const revision = { type: 'integer', minimum: 0, description: 'Current revision from scene_get or animation_get. Required to avoid replacing a newer edit.' };
const requestId = { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$', description: 'Unique ID for this logical edit. Retain this ID and the exact original arguments when retrying after a timeout; the server returns the saved receipt instead of applying it twice.' };
const camera = {
  id: { ...name, description: 'Project clip to inspect. Does not change the saved selection.' },
  view: { enum: VIEWS }, cast: { enum: CASTS }, bones: { type: 'boolean' },
  facing: { type: 'number', minimum: -180, maximum: 180, description: 'Figure rotation in degrees.' },
  zoom: { type: 'number', minimum: .5, maximum: 3 }
};
const readonly = { readOnlyHint: true, openWorldHint: false };
const localwrite = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
const additive = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const previewwrite = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const animationCapture = schema({ ...camera, times: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'number', minimum: 0, maximum: 600 } } }, ['times']);
export const ANIMATION_TOOLS = [
  { name: 'animation_catalog', description: 'Search the existing animation library before importing a clip. Returns names, durations, tags, descriptions and source credit, with up to 100 results per page.',
    inputSchema: schema({ query: { type: 'string', maxLength: 160 }, set: { type: 'string', description: 'Source set ID, for example quaternius, cmu, hero or mesh2motion.' }, limit: { type: 'integer', minimum: 1, maximum: 100 }, offset: { type: 'integer', minimum: 0, maximum: 100000 } }), annotations: readonly },
  { name: 'animation_get', description: 'Read the current revision, a compact project summary, undo/redo status and one complete readable clip. includeSchema=true explains pose fields and action formats. full=true explicitly includes the whole project; omit it for normal editing.',
    inputSchema: schema({ id: name, includeSchema: { type: 'boolean' }, full: { type: 'boolean' } }), annotations: readonly },
  { name: 'animation_create', description: 'Create a new animation from neutral or wave key poses. To start from an existing library animation, give set and fromClip. The new clip is selected and all open editors update.',
    inputSchema: schema({ expectedRevision: revision, requestId, name, duration: { type: 'number', minimum: .001, maximum: 600 }, loop: { type: 'boolean' }, preset: { enum: ['neutral', 'wave'] }, set: { type: 'string' }, fromClip: { type: 'string', description: 'Exact library clip name from animation_catalog. Imports this clip instead of a preset; duration/loop/preset do not apply.' }, capture: animationCapture }, ['expectedRevision', 'name']), annotations: additive },
  { name: 'animation_edit', description: 'Apply one action OR 1 to 100 actions atomically as one revision and Undo step. Create/import clips, edit keys, transform, rename or delete. capture returns the resulting PNG in this reply. A captureError means the edit was saved; do not repeat it with a new requestId. Read current state after a revision conflict.',
    inputSchema: { ...schema({ expectedRevision: revision, requestId, action: ACTION_SCHEMA, actions: { type: 'array', minItems: 1, maxItems: 100, items: ACTION_SCHEMA }, capture: animationCapture, summary: { type: 'string', minLength: 1, maxLength: 240, description: 'Short description shown in the editor.' } }, ['expectedRevision']), oneOf: [{ required: ['action'] }, { required: ['actions'] }] }, annotations: localwrite },
  { name: 'animation_preview', description: 'Change playback, time, figure, camera or bones in connected live editors. This does not alter key poses, save the project, or add undo history. For images, use animation_capture.',
    inputSchema: schema({ ...camera, time: { type: 'number', minimum: 0, maximum: 600 }, playing: { type: 'boolean' }, speed: { type: 'number', minimum: .05, maximum: 4 } }), annotations: previewwrite },
  { name: 'animation_capture', description: 'View the animation as a PNG filmstrip at 1 to 8 exact times. Uses a separate browser, so the live editor keeps its playback state. Times must be within the selected clip duration. Requires local Playwright and Chromium.',
    inputSchema: animationCapture, annotations: readonly },
  { name: 'animation_history', description: 'Undo or redo one saved edit. History includes LLM edits, editor edits and valid watched-file changes. The project file and every open editor update together.',
    inputSchema: schema({ expectedRevision: revision, requestId, direction: { enum: ['undo', 'redo'] } }, ['expectedRevision', 'direction']), annotations: localwrite },
  { name: 'animation_export', description: 'Export a selected animation as a native my-3D2dge set with source proportions, metadata and credit. JSON is data; JS assigns the set to window.MOCAP. inline=false returns a compact immutable download link instead of the file contents.',
    inputSchema: schema({ id: name, format: { enum: ['json', 'js'] }, inline: { type: 'boolean', description: 'Return file contents inline. Defaults to true; false returns a download link.' } }), annotations: readonly }
];

const assetModel = loadAssetModel();
const sceneCamera = {
  level: { ...name, description: 'Level ID. Defaults to the saved selectedLevel. Preview does not save selection.' },
  view: { enum: VIEWS }, zoom: { type: 'number', minimum: .5, maximum: 3 },
  focus: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'number', minimum: -100000, maximum: 100000 }, description: 'Camera focus in world coordinates [x,y,z].' },
  selected: { oneOf: [name, { type: 'null' }], description: 'Object ID for the selection outline, or null for none.' }, grid: { type: 'boolean' }
};
const sceneCapture = schema({ ...sceneCamera, times: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'number', minimum: 0, maximum: 600 }, description: 'Exact scene times in seconds. Defaults to [0].' } });
export const ASSET_TOOLS = [
  { name: 'asset_catalog', description: 'Discover readable procedural materials, texture patterns, model shapes and ready-made level presets. Returns current asset summaries. Set includeSchema=true to learn exact action fields. No image/model binaries or LLM API key are needed.',
    inputSchema: schema({ includeSchema: { type: 'boolean' } }), annotations: readonly },
  { name: 'scene_get', description: 'Read a compact scene summary and current shared revision before editing. Inspect one material, model, level or object with type and id. Level defaults to the saved selection. includeSchema adds action schemas; full=true explicitly includes the full project and animation keys.',
    inputSchema: schema({ type: { enum: ['material', 'model', 'level', 'object'] }, id: name, level: name, includeSchema: { type: 'boolean' }, full: { type: 'boolean' } }), annotations: readonly },
  { name: 'scene_edit', description: 'Apply 1 to 100 asset actions as one atomic revision and one Undo step. Create or change procedural materials/textures, reusable part models, level tiles and placed objects/animated actors. All open editors update immediately. Supply capture to receive the resulting PNG in this same call. A captureError means the edit was saved but its image failed; do not repeat the edit.',
    inputSchema: schema({ expectedRevision: revision, requestId, actions: { type: 'array', minItems: 1, maxItems: 100, items: assetModel.schema().action }, summary: { type: 'string', minLength: 1, maxLength: 240 }, capture: sceneCapture }, ['expectedRevision', 'actions']), annotations: localwrite },
  { name: 'scene_preview', description: 'Show a level, camera, selected object or exact time in the live editors. mode=play starts the human playtest; mode=edit returns to editing. These settings do not save assets or add history. The shared scene remains editable during play.',
    inputSchema: schema({ ...sceneCamera, mode: { enum: ['edit', 'play'] }, time: { type: 'number', minimum: 0, maximum: 600 }, playing: { type: 'boolean' } }), annotations: previewwrite },
  { name: 'scene_capture', description: 'Inspect a level as a PNG or frame strip at up to 8 exact scene times. A separate browser keeps the human view unchanged. Response names the captured revision. Defaults to time 0. Requires Playwright and Chromium; the browser stays warm for later captures.',
    inputSchema: sceneCapture, annotations: readonly },
  { name: 'scene_export', description: 'Export one level with its materials, models and actor animations. JSON returns portable data by default. HTML returns an immutable download link to a self-contained playable page. inline=false returns a link for either format; inline=true explicitly returns the complete file text. Import JSON with studio_import.',
    inputSchema: schema({ level: name, format: { enum: ['json', 'html'] }, inline: { type: 'boolean', description: 'Return file contents inline. Defaults to true for JSON, false for HTML to keep engine source out of model context.' } }), annotations: readonly }
];
export const SESSION_TOOLS = [
  { name: 'studio_status', description: 'Start here. Check server readiness, the shared revision, connected human editors, file errors, capture availability and editor URLs. This does not open a browser or change the project.',
    inputSchema: schema({}), annotations: readonly },
  { name: 'studio_import', description: 'Load a complete readable project or JSON scene export into this shared session. Replaces animation and scene data atomically and adds one Undo step. Use the latest revision and a requestId. Inspect the imported project with animation_get or scene_get.',
    inputSchema: schema({ expectedRevision: revision, requestId, project: { type: 'object', description: 'A complete schema-1 animation project, optionally with assets, or the full JSON envelope returned by scene_export. Data only; no executable JavaScript.' } }, ['expectedRevision', 'project']), annotations: localwrite }
];
export const STUDIO_TOOLS = [...SESSION_TOOLS, ...ANIMATION_TOOLS, ...ASSET_TOOLS];

function check(value, spec, path = 'arguments') {
  if (Array.isArray(spec.type)) {
    if (!spec.type.some(type => { try { check(value, { type }, path); return true; } catch { return false; } })) throw new Error(path + ' has an invalid type.');
    return check(value, { ...spec, type: undefined }, path);
  }
  for (const option of spec.allOf || []) check(value, option, path);
  if (spec.anyOf) {
    let matched = false;
    for (const option of spec.anyOf) { try { check(value, option, path); matched = true; break; } catch {} }
    if (!matched) throw new Error(path + ' does not match an accepted format.');
  }
  if (spec.not) {
    let excluded = false; try { check(value, spec.not, path); excluded = true; } catch {}
    if (excluded) throw new Error(path + ' uses a reserved value.');
  }
  if (spec.oneOf) {
    let matches = 0;
    for (const option of spec.oneOf) { try { check(value, option, path); matches++; } catch {} }
    if (matches !== 1) {
      // Pick the matching action's error when possible; it gives the caller the useful field name.
      const matching = spec.oneOf.find(option => option.properties?.type?.const !== undefined && option.properties.type.const === value?.type);
      if (!matches && matching) check(value, matching, path);
      throw new Error(path + ' must match exactly one accepted format.');
    }
  }
  if (spec.const !== undefined && value !== spec.const) throw new Error(path + ' must be ' + JSON.stringify(spec.const) + '.');
  if (spec.enum && !spec.enum.includes(value)) throw new Error(path + ' must be one of: ' + spec.enum.join(', ') + '.');
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  if (spec.type === 'object' && !isObject) throw new Error(path + ' must be an object.');
  if (isObject) {
    if (Object.keys(value).length < (spec.minProperties || 0) || Object.keys(value).length > (spec.maxProperties ?? Infinity)) throw new Error(path + ' has an invalid number of fields.');
    for (const key of spec.required || []) if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error(path + '.' + key + ' is required.');
    for (const [key, v] of Object.entries(value)) {
      if (spec.propertyNames) check(key, spec.propertyNames, path + ' key');
      if (spec.additionalProperties === false && !Object.prototype.hasOwnProperty.call(spec.properties || {}, key)) throw new Error(path + ': unknown field ' + key + '.');
      if (spec.properties?.[key]) check(v, spec.properties[key], path + '.' + key);
      else if (spec.additionalProperties && typeof spec.additionalProperties === 'object') check(v, spec.additionalProperties, path + '.' + key);
    }
  }
  if (spec.type === 'array' && !Array.isArray(value)) throw new Error(path + ' must be an array.');
  if (Array.isArray(value)) {
    if (value.length < (spec.minItems || 0) || value.length > (spec.maxItems ?? Infinity)) throw new Error(path + ' must be an array with ' + (spec.minItems || 0) + ' to ' + (spec.maxItems ?? 'unlimited') + ' items.');
    if (spec.items) value.forEach((v, i) => check(v, spec.items, path + '[' + i + ']'));
  }
  if (spec.type === 'number' || spec.type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (spec.type === 'integer' && !Number.isSafeInteger(value))) throw new Error(path + ' must be a finite ' + spec.type + '.');
  }
  if (typeof value === 'number' && (value < (spec.minimum ?? -Infinity) || value > (spec.maximum ?? Infinity) || (spec.exclusiveMinimum !== undefined && value <= spec.exclusiveMinimum))) throw new Error(path + ' is outside the permitted range.');
  if (spec.type === 'string' && typeof value !== 'string') throw new Error(path + ' must be text.');
  if (typeof value === 'string') {
    if (value.length < (spec.minLength || 0) || value.length > (spec.maxLength ?? Infinity)) throw new Error(path + ' must be text of the permitted length.');
    if (spec.pattern && !new RegExp(spec.pattern).test(value)) throw new Error(path + ' does not match the accepted text format.');
  }
  if (spec.type === 'boolean' && typeof value !== 'boolean') throw new Error(path + ' must be true or false.');
  else if (spec.type === 'null' && value !== null) throw new Error(path + ' must be null.');
}

export function validateStudioURL(input = 'http://127.0.0.1:4173') {
  let url; try { url = new URL(input); } catch { throw new Error('Studio URL must be http://127.0.0.1:PORT or http://localhost:PORT.'); }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Studio URL must be a local HTTP address, with no credentials, path, query or fragment.');
  }
  // Use IPv4: the server deliberately listens only on 127.0.0.1, not on a public interface or IPv6.
  url.hostname = '127.0.0.1'; return url.origin;
}

export function createMCPHandler({ url = 'http://127.0.0.1:4173' } = {}) {
  const base = validateStudioURL(url), active = new Map(); let initialized = false, protocolVersion;
  const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  const result = (id, value) => ({ jsonrpc: '2.0', id, result: value });
  const failure = (message, details) => Object.assign(new Error(message), details);
  const structured = output => ({ content: [{ type: 'text', text: JSON.stringify(output) }], ...(protocolVersion >= '2025-06-18' ? { structuredContent: output } : {}) });
  async function request(path, data, { plain = false, method = data === undefined ? 'GET' : 'POST', signal } = {}) {
    let response, raw;
    const timer = AbortSignal.timeout(path.includes('/capture') || data?.capture ? 90000 : 10000);
    const controller = new AbortController(), abort = source => controller.abort(source.reason);
    const abortTimer = () => abort(timer), abortCaller = () => abort(signal);
    timer.addEventListener('abort', abortTimer, { once: true });
    signal?.addEventListener('abort', abortCaller, { once: true });
    if (signal?.aborted) abortCaller();
    try {
      response = await fetch(base + path, { method, headers: data === undefined ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), signal: controller.signal, redirect: 'error' });
      raw = await response.text();
    } catch (err) {
      const writing = method !== 'GET';
      throw failure(timer.aborted ? 'The Studio request timed out.' : signal?.aborted ? 'The Studio request was cancelled.' : 'Cannot reach Animation and Asset Studio at ' + base + '.', {
        code: timer.aborted ? 'REQUEST_TIMEOUT' : signal?.aborted ? 'REQUEST_CANCELLED' : 'STUDIO_UNAVAILABLE',
        recovery: writing ? 'The edit may already be saved. Retain the same requestId and exact original arguments when retrying. Read studio_status and the current project before preparing a different edit.' : 'Start the server with node tools/animation-studio.mjs, then call studio_status. For captures, check Chromium availability.',
        ...(writing ? { outcome: 'unknown', ...(data?.requestId ? { requestId: data.requestId } : {}) } : {})
      });
    } finally {
      timer.removeEventListener('abort', abortTimer); signal?.removeEventListener('abort', abortCaller);
    }
    let parsed; try { parsed = JSON.parse(raw); } catch { parsed = null; }
    if (!response.ok) throw failure(parsed?.error || parsed?.message || 'Studio returned HTTP ' + response.status + '.', {
      code: parsed?.code || (response.status === 409 ? 'REVISION_CONFLICT' : response.status === 429 ? 'CAPTURE_BUSY' : response.status === 404 ? 'NOT_FOUND' : response.status >= 500 ? 'STUDIO_ERROR' : 'INVALID_ARGUMENT'),
      status: response.status, ...(parsed?.revision !== undefined ? { revision: parsed.revision } : {}),
      ...(parsed?.currentRevision !== undefined ? { currentRevision: parsed.currentRevision } : {}),
      ...(parsed?.actionIndex !== undefined ? { actionIndex: parsed.actionIndex } : {}),
      ...(parsed?.actionType !== undefined ? { actionType: parsed.actionType } : {}),
      recovery: parsed?.recovery || (response.status === 409 ? 'Read the latest project and revision before preparing a new edit. For an uncertain retry, retain the original requestId and arguments.' : response.status === 429 ? 'Wait for the active capture to finish, then retry.' : 'Correct the named input using the tool schema, then retry.'),
      ...(parsed?.requestId ? { requestId: parsed.requestId } : {})
    });
    if (plain) return raw;
    if (parsed === null || typeof parsed !== 'object') throw failure('Studio returned an invalid JSON response.', { code: 'INVALID_RESPONSE', recovery: 'Check that the URL points to the Studio server and restart it from this repository.' });
    return parsed;
  }
  const query = values => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(values)) if (v !== undefined) p.set(k, String(v)); return p.toString(); };
  async function call(tool, args, signal) {
    const get = (path, plain = false) => request(path, undefined, { plain, signal });
    const post = (path, data) => request(path, data, { signal });
    if (tool === 'studio_status') return get('/api/status');
    if (tool === 'studio_import') return request('/api/project?compact=true', { ...args, source: 'agent' }, { method: 'PUT', signal });
    if (tool === 'animation_catalog') return get('/api/catalog?' + query(args));
    if (tool === 'animation_get') return get('/api/animation?' + query(args));
    if (tool === 'animation_create') {
      const { expectedRevision, fromClip, requestId, capture, ...opts } = args;
      if (fromClip !== undefined && (args.duration !== undefined || args.loop !== undefined || args.preset !== undefined)) throw new Error('When fromClip is set, import first and use animation_edit to change duration, loop or pose data.');
      const action = fromClip !== undefined ? { type: 'import', set: opts.set || 'quaternius', clip: fromClip, name: opts.name } : { type: 'create', ...opts };
      return post('/api/animation/edit', { expectedRevision, requestId, capture, action, source: 'agent', summary: fromClip !== undefined ? 'Imported ' + fromClip : 'Created ' + opts.name });
    }
    if (tool === 'animation_edit') return post('/api/animation/edit', { ...args, source: 'agent' });
    if (tool === 'animation_preview') return post('/api/preview', args);
    if (tool === 'animation_capture') return post('/api/capture', args);
    if (tool === 'animation_history') return post('/api/animation/edit', { expectedRevision: args.expectedRevision, requestId: args.requestId, action: { type: args.direction }, source: 'agent' });
    if (tool === 'animation_export') {
      const { inline, ...opts } = args, linked = inline === false;
      return get('/api/export?' + query({ ...opts, ...(linked ? { delivery: 'link' } : {}) }), !linked && opts.format === 'js');
    }
    if (tool === 'asset_catalog') return get('/api/assets/catalog?' + query(args));
    if (tool === 'scene_get') return get('/api/scene?' + query(args));
    if (tool === 'scene_edit') return post('/api/scene/edit', { ...args, source: 'agent' });
    if (tool === 'scene_preview') return post('/api/scene/preview', args);
    if (tool === 'scene_capture') return post('/api/scene/capture', args);
    if (tool === 'scene_export') {
      const { inline, ...opts } = args, linked = inline === false || opts.format === 'html' && inline !== true;
      return get('/api/scene/export?' + query({ ...opts, ...(linked ? { delivery: 'link' } : {}) }), !linked && opts.format === 'html');
    }
    throw new Error('Unknown studio tool: ' + tool + '.');
  }
  return async message => {
    if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || (Object.prototype.hasOwnProperty.call(message, 'id') && typeof message.id !== 'string' && !Number.isSafeInteger(message.id))) {
      return rpcError(null, -32600, 'Invalid JSON-RPC 2.0 request.');
    }
    const hasID = Object.prototype.hasOwnProperty.call(message, 'id'), id = message.id;
    if (!hasID) {
      // Cancellation stops waiting for HTTP; it does not roll back an edit the server already saved.
      if (message.method === 'notifications/cancelled') active.get(message.params?.requestId)?.abort();
      return null;
    }
    if (message.method === 'initialize') {
      if (!message.params || typeof message.params.protocolVersion !== 'string') return rpcError(id, -32602, 'initialize requires protocolVersion.');
      const supported = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']; initialized = true;
      protocolVersion = supported.includes(message.params.protocolVersion) ? message.params.protocolVersion : supported[0];
      return result(id, { protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'my-3d2dge-animation-studio', version }, instructions: 'Start with studio_status to check readiness and get the human editor URL at ' + base + '. Keep the local server running. Use scene_get and asset_catalog for assets, or animation_get(includeSchema=true) for poses. Tool schemas describe supported actions; no engine-source reading is needed. Read the current revision, send an atomic edit batch with a unique requestId and optional capture, then inspect the returned PNG. Keep the same requestId and exact original arguments for retries after delivery timeouts. Conflicts require reading current state before preparing a new edit. All human editors update as soon as an edit is saved; captures do not interrupt their view. animation_history undoes either workspace. Reads and receipts stay compact; full=true explicitly requests the whole project. scene_export returns portable JSON or a small immutable HTML download link; studio_import restores a saved project or scene export.' });
    }
    if (message.method === 'ping') return result(id, {});
    if (!initialized) return rpcError(id, -32002, 'Initialize this MCP session first.');
    if (message.method === 'tools/list') return result(id, { tools: STUDIO_TOOLS });
    if (message.method !== 'tools/call') return rpcError(id, -32601, 'Method not found: ' + message.method + '.');
    const params = message.params;
    if (!params || typeof params !== 'object' || Array.isArray(params) || typeof params.name !== 'string' || (params.arguments !== undefined && (!params.arguments || typeof params.arguments !== 'object' || Array.isArray(params.arguments)))) return rpcError(id, -32602, 'tools/call requires a tool name and an arguments object.');
    const tool = STUDIO_TOOLS.find(t => t.name === params.name);
    if (!tool) return rpcError(id, -32602, 'Unknown tool: ' + params.name + '. Use tools/list.');
    if (active.has(id)) return rpcError(id, -32600, 'This request ID is already in progress. Use a distinct JSON-RPC id; retain requestId only when retrying the same edit.');
    const controller = new AbortController(); active.set(id, controller);
    try {
      const args = params.arguments === undefined ? {} : params.arguments;
      if (tool.name === 'animation_edit' && (args.action === undefined) === (args.actions === undefined)) throw new Error('Provide exactly one of action or actions.');
      check(args, tool.inputSchema);
      const output = await call(tool.name, args, controller.signal);
      if (controller.signal.aborted) return null;
      if (tool.name === 'animation_capture' || tool.name === 'scene_capture') {
        const { data, ...metadata } = output;
        const value = structured(metadata); value.content.push({ type: 'image', data, mimeType: output.mimeType }); return result(id, value);
      }
      if (['animation_create', 'animation_edit', 'scene_edit'].includes(tool.name) && output.capture) {
        const { capture, ...receipt } = output, { data, ...metadata } = capture;
        const value = structured({ ...receipt, capture: metadata }); value.content.push({ type: 'image', data, mimeType: capture.mimeType }); return result(id, value);
      }
      if (typeof output === 'string') return result(id, { content: [{ type: 'text', text: output }] });
      const value = structured(output);
      if (['scene_export', 'animation_export'].includes(tool.name) && output.downloadUrl && protocolVersion >= '2025-06-18') value.content.push({ type: 'resource_link', uri: output.downloadUrl, name: output.filename || (output.level || output.id || 'export') + '.' + (output.format || args.format || 'json'), mimeType: output.mimeType || (args.format === 'html' ? 'text/html' : 'application/json'), description: 'Immutable export of Studio revision ' + output.revision + '. Download while this local Studio session is running.' });
      return result(id, value);
    } catch (err) {
      if (controller.signal.aborted) return null;
      return result(id, { ...structured({ code: err.code || 'INVALID_ARGUMENT', message: err.message || 'Studio tool failed.', ...(err.status !== undefined ? { status: err.status } : {}), ...(err.revision !== undefined ? { revision: err.revision } : {}), ...(err.currentRevision !== undefined ? { currentRevision: err.currentRevision } : {}), ...(err.actionIndex !== undefined ? { actionIndex: err.actionIndex } : {}), ...(err.actionType !== undefined ? { actionType: err.actionType } : {}), ...(err.requestId ? { requestId: err.requestId } : {}), ...(err.outcome ? { outcome: err.outcome } : {}), recovery: err.recovery || 'Correct the named input using the tool schema, then retry.' }), isError: true });
    } finally { active.delete(id); }
  };
}

export function runMCPStdio({ input = process.stdin, output = process.stdout, url } = {}) {
  const handle = createMCPHandler({ url }), pending = new Set(); let buffer = '', discarding = false;
  const write = value => { if (value) output.write(JSON.stringify(value) + '\n'); };
  const enqueue = line => {
    if (!line.trim()) return;
    // Slow captures must not hold up ping, cancellation, reads or the next human-directed edit.
    // Shared revisions and requestId deduplication decide which writes may commit on the server.
    const task = Promise.resolve().then(async () => {
      let message; try { message = JSON.parse(line); } catch { write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON.' } }); return; }
      write(await handle(message));
    }).catch(err => { process.stderr.write('Animation MCP: ' + err.message + '\n'); });
    pending.add(task); task.finally(() => pending.delete(task));
  };
  input.setEncoding('utf8');
  input.on('data', chunk => {
    for (const part of chunk.match(/[^\n]*\n|[^\n]+$/g) || []) {
      const end = part.endsWith('\n');
      if (!discarding) buffer += end ? part.slice(0, -1) : part;
      if (Buffer.byteLength(buffer) > MAX_BYTES) {
        discarding = true; buffer = '';
        write({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'MCP message exceeds the 8 MiB limit.' } });
      }
      if (end) { if (!discarding) enqueue(buffer); buffer = ''; discarding = false; }
    }
  });
  input.on('end', () => { if (buffer.trim() && !discarding) enqueue(buffer); buffer = ''; });
  return { done: async () => { while (pending.size) await Promise.all(pending); } };
}

function main() {
  const args = process.argv.slice(2); let url;
  if (args.includes('--help') || args.includes('-h')) { process.stderr.write('Usage: node tools/animation-mcp.mjs [--url http://127.0.0.1:4173]\nStart tools/animation-studio.mjs first. This process speaks MCP over stdin/stdout.\n'); return; }
  if (args.length) { if (args.length !== 2 || args[0] !== '--url') throw new Error('Use --url http://127.0.0.1:PORT.'); url = args[1]; }
  runMCPStdio({ url });
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(); } catch (err) { console.error('Animation MCP: ' + err.message); process.exitCode = 1; }
}
