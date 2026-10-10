// MCP stdio bridge for an already running local Animation Studio. JSON-RPC only on stdout; diagnostics on stderr.
// Usage: node tools/animation-mcp.mjs [--url http://127.0.0.1:4173]
// Transport: MCP 2025-11-25, newline-delimited JSON-RPC 2.0. No model account or API key is used by this bridge.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ACTION_SCHEMA, VIEWS, CASTS, MAX_BYTES } from './studio-service.mjs';

const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const schema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const name = { type: 'string', minLength: 1, maxLength: 80 };
const revision = { type: 'integer', minimum: 0, description: 'Current revision from animation_get. Required to avoid replacing a newer edit.' };
const camera = {
  id: { ...name, description: 'Project clip to inspect. Does not change the saved selection.' },
  view: { enum: VIEWS }, cast: { enum: CASTS }, bones: { type: 'boolean' },
  facing: { type: 'number', minimum: -180, maximum: 180, description: 'Figure rotation in degrees.' },
  zoom: { type: 'number', minimum: .5, maximum: 3 }
};
const readonly = { readOnlyHint: true, openWorldHint: false };
const localwrite = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
export const ANIMATION_TOOLS = [
  { name: 'animation_catalog', description: 'Search the existing animation library before importing a clip. Returns names, durations, tags, descriptions and source credit, with up to 100 results per page.',
    inputSchema: schema({ query: { type: 'string', maxLength: 160 }, set: { type: 'string', description: 'Source set ID, for example quaternius, cmu, hero or mesh2motion.' }, limit: { type: 'integer', minimum: 1, maximum: 100 }, offset: { type: 'integer', minimum: 0, maximum: 100000 } }), annotations: readonly },
  { name: 'animation_get', description: 'Read the project, its current revision, undo/redo status and a complete readable clip. Set includeSchema=true to learn all pose fields and action formats before editing.',
    inputSchema: schema({ id: name, includeSchema: { type: 'boolean' } }), annotations: readonly },
  { name: 'animation_create', description: 'Create a new animation from neutral or wave key poses. To start from an existing library animation, give set and fromClip. The new clip is selected and all open editors update.',
    inputSchema: schema({ expectedRevision: revision, name, duration: { type: 'number', minimum: .001, maximum: 600 }, loop: { type: 'boolean' }, preset: { enum: ['neutral', 'wave'] }, set: { type: 'string' }, fromClip: { type: 'string', description: 'Exact library clip name from animation_catalog. Imports this clip instead of a preset; duration/loop/preset do not apply.' } }, ['expectedRevision', 'name']), annotations: localwrite },
  { name: 'animation_edit', description: 'Apply one atomic action to an animation. Add authored readable data; replace clip fields; insert/edit/delete keys; mirror, reverse or retime; rename or delete. Every saved edit updates the live editor. Read the latest state after a revision conflict.',
    inputSchema: schema({ expectedRevision: revision, action: ACTION_SCHEMA, summary: { type: 'string', minLength: 1, maxLength: 240, description: 'Short description shown in the editor.' } }, ['expectedRevision', 'action']), annotations: localwrite },
  { name: 'animation_preview', description: 'Change playback, time, figure, camera or bones in connected live editors. This does not alter key poses, save the project, or add undo history. For images, use animation_capture.',
    inputSchema: schema({ ...camera, time: { type: 'number', minimum: 0, maximum: 600 }, playing: { type: 'boolean' }, speed: { type: 'number', minimum: .05, maximum: 4 } }), annotations: localwrite },
  { name: 'animation_capture', description: 'View the animation as a PNG filmstrip at 1 to 8 exact times. Uses a separate browser, so the live editor keeps its playback state. Times must be within the selected clip duration. Requires local Playwright and Chromium.',
    inputSchema: schema({ ...camera, times: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'number', minimum: 0, maximum: 600 } } }, ['times']), annotations: readonly },
  { name: 'animation_history', description: 'Undo or redo one saved edit. History includes LLM edits, editor edits and valid watched-file changes. The project file and every open editor update together.',
    inputSchema: schema({ expectedRevision: revision, direction: { enum: ['undo', 'redo'] } }, ['expectedRevision', 'direction']), annotations: localwrite },
  { name: 'animation_export', description: 'Return a selected animation as a native my-3D2dge set with source proportions, metadata and credit. JSON is data; JS assigns the set to window.MOCAP and can be loaded by existing engine pages.',
    inputSchema: schema({ id: name, format: { enum: ['json', 'js'] } }), annotations: readonly }
];

function check(value, spec, path = 'arguments') {
  if (spec.oneOf) {
    const errors = [];
    for (const option of spec.oneOf) { try { check(value, option, path); return; } catch (err) { errors.push(err.message); } }
    // Pick the matching action's error when possible; it gives the caller the useful field name.
    const matching = spec.oneOf.find(option => option.properties?.type?.const === value?.type);
    if (matching) return check(value, matching, path);
    throw new Error(path + ' does not match an accepted format.');
  }
  if (spec.const !== undefined && value !== spec.const) throw new Error(path + ' must be ' + JSON.stringify(spec.const) + '.');
  if (spec.enum && !spec.enum.includes(value)) throw new Error(path + ' must be one of: ' + spec.enum.join(', ') + '.');
  if (spec.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(path + ' must be an object.');
    for (const key of spec.required || []) if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error(path + '.' + key + ' is required.');
    for (const [key, v] of Object.entries(value)) {
      if (spec.additionalProperties === false && !Object.prototype.hasOwnProperty.call(spec.properties || {}, key)) throw new Error(path + ': unknown field ' + key + '.');
      if (spec.properties?.[key]) check(v, spec.properties[key], path + '.' + key);
    }
  } else if (spec.type === 'array') {
    if (!Array.isArray(value) || value.length < (spec.minItems || 0) || value.length > (spec.maxItems ?? Infinity)) throw new Error(path + ' must be an array with ' + (spec.minItems || 0) + ' to ' + (spec.maxItems ?? 'unlimited') + ' items.');
    if (spec.items) value.forEach((v, i) => check(v, spec.items, path + '[' + i + ']'));
  } else if (spec.type === 'number' || spec.type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (spec.type === 'integer' && !Number.isSafeInteger(value))) throw new Error(path + ' must be a finite ' + spec.type + '.');
    if (value < (spec.minimum ?? -Infinity) || value > (spec.maximum ?? Infinity) || (spec.exclusiveMinimum !== undefined && value <= spec.exclusiveMinimum)) throw new Error(path + ' is outside the permitted range.');
  } else if (spec.type === 'string') {
    if (typeof value !== 'string' || value.length < (spec.minLength || 0) || value.length > (spec.maxLength ?? Infinity)) throw new Error(path + ' must be text of the permitted length.');
  } else if (spec.type === 'boolean' && typeof value !== 'boolean') throw new Error(path + ' must be true or false.');
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
  const base = validateStudioURL(url); let initialized = false;
  const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  const result = (id, value) => ({ jsonrpc: '2.0', id, result: value });
  async function request(path, data, plain = false) {
    let response;
    try { response = await fetch(base + path, { method: data === undefined ? 'GET' : 'POST', headers: data === undefined ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(path === '/api/capture' ? 90000 : 10000), redirect: 'error' }); }
    catch (err) { throw new Error('Cannot reach Animation Studio at ' + base + '. Start it with: node tools/animation-studio.mjs. ' + err.message); }
    const raw = await response.text();
    let parsed; try { parsed = JSON.parse(raw); } catch { parsed = null; }
    if (!response.ok) throw new Error((parsed?.error || 'Studio returned HTTP ' + response.status + '.') + (parsed?.revision !== undefined ? ' Current revision: ' + parsed.revision + '.' : ''));
    if (plain) return raw;
    if (parsed === null) throw new Error('Studio returned an invalid JSON response.');
    return parsed;
  }
  const query = values => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(values)) if (v !== undefined) p.set(k, String(v)); return p.toString(); };
  async function call(tool, args) {
    if (tool === 'animation_catalog') return request('/api/catalog?' + query(args));
    if (tool === 'animation_get') {
      const state = await request('/api/state'), id = args.id || state.project.selected;
      if (!Object.prototype.hasOwnProperty.call(state.project.clips, id)) throw new Error('Project has no clip "' + id + '".');
      return { ...state, inspected: { id, ...state.project.clips[id] }, editorUrl: base, ...(args.includeSchema ? { schema: await request('/api/schema') } : {}) };
    }
    if (tool === 'animation_create') {
      const { expectedRevision, fromClip, ...opts } = args;
      if (fromClip !== undefined && (args.duration !== undefined || args.loop !== undefined || args.preset !== undefined)) throw new Error('When fromClip is set, import first and use animation_edit to change duration, loop or pose data.');
      const action = fromClip !== undefined ? { type: 'import', set: opts.set || 'quaternius', clip: fromClip, name: opts.name } : { type: 'create', ...opts };
      return request('/api/action', { expectedRevision, action, source: 'agent', summary: fromClip !== undefined ? 'Imported ' + fromClip : 'Created ' + opts.name });
    }
    if (tool === 'animation_edit') return request('/api/action', { ...args, source: 'agent' });
    if (tool === 'animation_preview') return request('/api/preview', args);
    if (tool === 'animation_capture') return request('/api/capture', args);
    if (tool === 'animation_history') return request('/api/action', { expectedRevision: args.expectedRevision, action: { type: args.direction }, source: 'agent' });
    if (tool === 'animation_export') return request('/api/export?' + query(args), undefined, true);
    throw new Error('Unknown animation tool: ' + tool + '.');
  }
  return async message => {
    if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || (Object.prototype.hasOwnProperty.call(message, 'id') && message.id !== null && typeof message.id !== 'string' && typeof message.id !== 'number')) {
      return rpcError(null, -32600, 'Invalid JSON-RPC 2.0 request.');
    }
    const hasID = Object.prototype.hasOwnProperty.call(message, 'id'), id = message.id;
    if (!hasID) return null; // Notifications, including initialized and cancellation, never get a response.
    if (message.method === 'initialize') {
      if (!message.params || typeof message.params.protocolVersion !== 'string') return rpcError(id, -32602, 'initialize requires protocolVersion.');
      const supported = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']; initialized = true;
      return result(id, { protocolVersion: supported.includes(message.params.protocolVersion) ? message.params.protocolVersion : supported[0], capabilities: { tools: {} }, serverInfo: { name: 'my-3d2dge-animation-studio', version }, instructions: 'Keep the local Animation Studio server running at ' + base + '. Call animation_get with includeSchema=true to learn the readable format. Use the current revision for every edit. The live editor shows changes immediately. Use animation_capture to inspect motion before and after edits.' });
    }
    if (message.method === 'ping') return result(id, {});
    if (!initialized) return rpcError(id, -32002, 'Initialize this MCP session first.');
    if (message.method === 'tools/list') return result(id, { tools: ANIMATION_TOOLS });
    if (message.method !== 'tools/call') return rpcError(id, -32601, 'Method not found: ' + message.method + '.');
    try {
      const params = message.params;
      if (!params || typeof params.name !== 'string') throw new Error('tools/call requires a tool name.');
      const tool = ANIMATION_TOOLS.find(t => t.name === params.name);
      if (!tool) throw new Error('Unknown tool: ' + params.name + '. Use tools/list.');
      const args = params.arguments === undefined ? {} : params.arguments; check(args, tool.inputSchema);
      const output = await call(tool.name, args);
      if (tool.name === 'animation_capture') {
        const { data, ...metadata } = output;
        return result(id, { content: [{ type: 'image', data, mimeType: output.mimeType }, { type: 'text', text: JSON.stringify(metadata) }] });
      }
      return result(id, { content: [{ type: 'text', text: typeof output === 'string' ? output : JSON.stringify(output) }] });
    } catch (err) { return result(id, { isError: true, content: [{ type: 'text', text: err.message || 'Animation tool failed.' }] }); }
  };
}

export function runMCPStdio({ input = process.stdin, output = process.stdout, url } = {}) {
  const handle = createMCPHandler({ url }); let pending = Promise.resolve(), buffer = '', discarding = false;
  const write = value => { if (value) output.write(JSON.stringify(value) + '\n'); };
  const enqueue = line => {
    if (!line.trim()) return;
    pending = pending.then(async () => {
      let message; try { message = JSON.parse(line); } catch { write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON.' } }); return; }
      write(await handle(message));
    }).catch(err => { process.stderr.write('Animation MCP: ' + err.message + '\n'); });
  };
  input.setEncoding('utf8');
  input.on('data', chunk => {
    for (const part of chunk.match(/[^\n]*\n|[^\n]+$/g) || []) {
      const end = part.endsWith('\n');
      if (!discarding) buffer += end ? part.slice(0, -1) : part;
      if (Buffer.byteLength(buffer) > MAX_BYTES) {
        discarding = true; buffer = '';
        pending = pending.then(() => write({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'MCP message exceeds the 8 MiB limit.' } }));
      }
      if (end) { if (!discarding) enqueue(buffer); buffer = ''; discarding = false; }
    }
  });
  input.on('end', () => { if (buffer.trim() && !discarding) enqueue(buffer); buffer = ''; });
  return { done: () => pending };
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
