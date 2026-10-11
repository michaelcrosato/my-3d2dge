// The API index: API-INDEX.md, written from the engine itself. One line for every public name (a name that doesn't start
// with _): E's functions, values and tables, every class's methods, statics and fields, and the members of the helper
// namespaces (px, font, ui, tex, ...), each with its signature and the doc comment above it in engine/my-3d2dge.js (or the
// // comment at the end of its line), grouped by the engine's sections, with the units and height rules at the top.
// Names the agent edition doesn't have are marked. Agents search it; nobody reads it whole. The cards (API.md, the agent
// edition's header) stay the overviews and point here.
//   node tools/api-index.mjs            write API-INDEX.md
//   node tools/api-index.mjs --check    exit 1 when API-INDEX.md is not what the engine gives, or a public name has no
//                                      description (doctrine-check runs this): document the name, or make it private (_)
//   node tools/api-index.mjs --missing  list the public names without a description, by section
// A doc comment above a line that defines several fields describes each one in a clause of its own: "name: what it is;"
// or "name = what it is;" (the camera's fields are written this way).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FULL = 'engine/my-3d2dge.js', AGENT = 'engine/my-3d2dge-agent.js', OUT = 'API-INDEX.md';
const args = process.argv.slice(2), has = k => args.includes('--' + k);
const load = file => { const ctx = { console: { log() {}, warn() {}, error() {} } }; vm.createContext(ctx); vm.runInContext(readFileSync(join(root, file), 'utf8'), ctx, { filename: file }); return ctx.My3D2dge; };
// the name an instance of each class goes by in games (game.input, r.queue, map.ray, ...)
const INST = { Game: 'game', Input: 'input', Screen: 'game.screen', Renderer: 'r', View: 'view', Lighting: 'game.lights', Particles: 'game.particles',
  TileMap: 'map', PlatformMap: 'level', Humanoid: 'rig', Blob: 'blob', Body: 'body', Platformer: 'hero', FlowField: 'flow', Bullets: 'shots',
  SpatialHash: 'grid', Attack: 'slash', Combo: 'combo', Audio: 'game.audio', Dialog: 'talk', Menu: 'menu', Backdrop: 'backdrop', GPULighting: 'game.gpu' };
// objects inside a class whose own fields are part of the API: game.cam.offset, game.stats.frameMs
const NESTED = { Game: ['cam', 'stats'] };

/* ---- reading a source: sections, definitions, class bodies, namespaces, doc comments ---- */
function scan(src) {
  const L = src.split('\n'), sections = [], top = new Map(), classes = new Map(), spaces = new Map();
  for (let i = 0; i < L.length; i++) {
    const m = /^\/\* ={10,}/.test(L[i]) && /^ \* (\d+b?)\. (.+?)(?:\s{2,}(.*))?$/.exec(L[i + 1] || '');
    if (m) sections.push({ at: i, n: m[1], title: m[2].trim(), gloss: (m[3] || '').trim() });
    let d;
    if ((d = /^class (\w+)(?: extends (\w+))?/.exec(L[i]))) { let j = i + 1; while (j < L.length && L[j] !== '}') j++; classes.set(d[1], { at: i, end: j, parent: d[2] || null }); top.set(d[1], i); }
    else if ((d = /^(?:const|let) (\w+) = /.exec(L[i])) || (d = /^function (\w+)\s*\(/.exec(L[i]))) { if (!top.has(d[1])) top.set(d[1], i); }
    else if ((d = /^E\.(\w+) = /.exec(L[i]))) top.set('E.' + d[1], i);
    else if ((d = /^(\w+)\.(\w+) = /.exec(L[i]))) top.set(d[1] + '.' + d[2], i);
    // an object literal of functions or data: its members at two spaces' indent
    if ((d = /^(?:E\.(\w+)|(?:const|let) (\w+)) = \{\s*$/.exec(L[i]))) {
      const name = d[1] || d[2], mem = new Map(); let j = i + 1;
      for (; j < L.length && !/^\};?\s*(\/\/.*)?$/.test(L[j]); j++) { const k = /^ {2}(\w+)\s*(?:\(|:)/.exec(L[j]); if (k && !mem.has(k[1])) mem.set(k[1], j); }
      spaces.set(name, mem);
    }
  }
  const section = i => { let s = null; for (const x of sections) if (x.at <= i) s = x; return s; };
  // a class's members: methods at two spaces' indent, fields assigned to this anywhere in its body
  const members = name => {
    const c = classes.get(name); if (!c) return null;
    const methods = new Map(), fields = new Map(), defaults = new Map();
    for (let i = c.at + 1; i < c.end; i++) {
      const m = /^ {2}(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?(\w+)\s*\(/.exec(L[i]); if (m && m[1] !== 'constructor' && !methods.has(m[1])) methods.set(m[1], i);
      for (const f of L[i].matchAll(/this\.(\w+)\s*=(?![=>])/g)) if (!fields.has(f[1])) fields.set(f[1], i);
      const oa = /Object\.assign\(this,\s*\{(.*?)\}\s*,\s*o\)/.exec(L[i]);
      if (oa) for (const k of oa[1].matchAll(/(?:^|,)\s*(\w+)\s*:\s*([^,]+)/g)) { if (!fields.has(k[1])) fields.set(k[1], i); defaults.set(k[1], k[2].trim()); }
      // the options with their defaults over several lines: Object.assign(this, {\n ... \n}, o)
      if (/Object\.assign\(this,\s*\{/.test(L[i]) && (L[i].match(/\{/g) || []).length > (L[i].match(/\}/g) || []).length) for (let j = i; j < c.end; j++) {   // over several lines
        for (const k of L[j].replace(/^.*Object\.assign\(this,\s*\{/, '').matchAll(/(?:^|,)\s*(\w+)\s*:\s*([^,}]+)/g)) { if (!fields.has(k[1])) fields.set(k[1], i); defaults.set(k[1], k[2].trim()); }
        if (/\}\s*,\s*o\)/.test(L[j])) break;
      }
    }
    // a subclass lists only what it adds: the fields its parent sets are the parent's
    if (c.parent) { const P = members(c.parent); if (P) for (const f of P.fields.keys()) if (!/Object\.assign/.test(L[fields.get(f)] || '')) fields.delete(f); else if (P.fields.has(f)) fields.delete(f); }
    return { methods, fields, defaults };
  };
  return { L, sections, section, top, classes, spaces, members };
}

/** the doc comment above line i (/** ... *\/ or // lines), or the // comment at its end. For a line that defines several
 *  names, only the clause about `name` ("name: ..." or "name = ...") */
function docAt(S, i, name, shared) {
  const L = S.L; let doc = '';
  let j = i - 1;
  if (j >= 0 && /\*\/\s*$/.test(L[j])) {
    const end = j; while (j >= 0 && !/^\s*\/\*\*/.test(L[j])) j--;
    if (j >= 0) doc = L.slice(j, end + 1).join('\n').replace(/^\s*\/\*\*\s?/, '').replace(/\s*\*\/\s*$/, '').split('\n').map(l => l.replace(/^\s*\*\s?/, '')).join(' ');
  } else if (j >= 0 && /^\s*\/\/(?! -{4})/.test(L[j])) {
    const out = []; while (j >= 0 && /^\s*\/\/(?! -{4})/.test(L[j])) out.unshift(L[j--].replace(/^\s*\/\/\s?/, ''));
    doc = out.join(' ');
  }
  const tail = trailing(L[i]);
  if (shared) {   // several names on the line: the clause that names this one
    // "name: what", "name = what", "a, b, c: what they are" (each name of the group gets it)
    const clause = text => { for (const c of splitTop(text)) { const m = new RegExp('^\\s*(?:`?\\w+`?\\s*,\\s*)*`?' + name + '`?(?:\\([^)]*\\))?(?:\\s*,\\s*`?\\w+`?)*\\s*(?:[:=]|\\s-)\\s*(.+)$').exec(c); if (m) return m[1]; } return ''; };
    return clean(clause(doc) || clause(tail));
  }
  return clean(doc || tail);
}
/** a shared comment's clauses: split at '; ' and at '. ' before the next name, outside parentheses and brackets */
function splitTop(text) {
  const out = []; let depth = 0, cur = '';
  for (let k = 0; k < text.length; k++) {
    const ch = text[k];
    if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth = Math.max(0, depth - 1);
    if (!depth && ((ch === ';' && text[k + 1] === ' ') || (ch === '.' && text[k + 1] === ' ' && /^ [a-z_]\w*(?:\s*,\s*\w+)*\s*[:=(]/.test(text.slice(k + 1))))) { out.push(cur); cur = ''; k++; continue; }
    cur += ch;
  }
  out.push(cur); return out;
}
/** the // comment at the end of a line of code (outside strings and regular expressions, as far as a simple scan can tell) */
function trailing(line) {
  let q = null;
  for (let k = 0; k < line.length; k++) {
    const ch = line[k];
    if (q) { if (ch === '\\') k++; else if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') q = ch;
    else if (ch === '/' && line[k + 1] === '/' && /\s/.test(line[k - 1] || ' ') && k > 0 && line.slice(0, k).trim()) return line.slice(k + 2).trim().replace(/^\(|\)$/g, '');
  }
  return '';
}
const clean = s => s.replace(/\s+/g, ' ').replace(/\{@link ([^}]+)\}/g, '$1').trim();

/** the parameters written after `name` on line i: (a, b = 2) */
function params(line, name) {
  let k = line.search(new RegExp('\\b' + name + '\\b\\s*(?:=\\s*(?:\\([^)]*\\)\\s*=>|\\w+\\s*=>|function|\\()|\\(|:\\s*(?:\\(|\\w+\\s*=>|function))'));
  if (k < 0) return null;
  const rest = line.slice(k + name.length), single = /^\s*(?:=|:)\s*(\w+)\s*=>/.exec(rest);
  if (single) return single[1];
  const open = rest.indexOf('('); if (open < 0) return null;
  let depth = 0;
  for (let j = open; j < rest.length; j++) { if (rest[j] === '(') depth++; else if (rest[j] === ')' && --depth === 0) return rest.slice(open + 1, j).trim(); }
  return rest.slice(open + 1).trim() + '...';
}
/** a field's starting value, when it is short and plain (a number, a string, a flag, a small array) */
function initial(line, name) {
  const m = new RegExp('this\\.' + name + '\\s*=\\s*([^;]+?)(?:;|$)').exec(line); if (!m) return '';
  const v = m[1].trim();
  return /^(-?[\d.]+(?:\s*\/\s*[\d.]+)?|'[^']*'|true|false|null|\[[^\]]{0,24}\])$/.test(v) ? v : '';
}

/* ---- the index ---- */
export function build() {
  const F = scan(readFileSync(join(root, FULL), 'utf8')), A = scan(readFileSync(join(root, AGENT), 'utf8'));
  const E = load(FULL), EA = load(AGENT), entries = [], missing = [];
  const isClass = v => typeof v === 'function' && /^class\b/.test(Function.prototype.toString.call(v));
  const add = (sec, sig, doc, agent, key, line) => { entries.push({ sec, sig, doc, agent, key, line }); if (!doc) missing.push({ sec: sec ? sec.n + '. ' + sec.title : '?', key, line }); };
  // where E.k is defined: E.k = ..., or a local that Object.assign(E, { k }) or E.k = k exported
  const defOf = (S, k) => {
    if (S.top.has('E.' + k)) { const i = S.top.get('E.' + k), id = /^E\.\w+ = (\w+);/.exec(S.L[i]); return id && S.top.has(id[1]) ? [S.top.get(id[1]), id[1], i] : [i, k, i]; }
    if (S.top.has(k)) { const i = S.top.get(k); return [i, k, i, /^(?:const|let) \w+ = [^;({=>]*,\s*\w+ = /.test(S.L[i])]; }
    // one of several declared on a line (const TAU = ..., DEG = ...), or a key of E's own literal
    const i = S.L.findIndex(l => new RegExp('^(?:const|let) (?:.*[,{]\\s*)?' + k + '\\b\\s*[=:,}]').test(l));
    return i >= 0 ? [i, k, i, true] : null;
  };
  const docOf = (S, d) => d ? docAt(S, d[0], d[1], d[3]) || (d[2] !== d[0] ? docAt(S, d[2], d[1]) : '') : '';
  for (const k of Object.keys(E).sort()) {
    if (k.startsWith('_')) continue;
    const v = E[k], d = defOf(F, k), sec = d ? F.section(d[0]) : null, inAgent = k in EA;
    if (isClass(v)) {
      const cname = d ? d[1] : k, inst = INST[k] || k.toLowerCase(), mem = F.members(cname), amem = A.members(cname), ctor = mem && [...F.L.slice(F.classes.get(cname).at, F.classes.get(cname).end)].findIndex(l => /^ {2}constructor\s*\(/.test(l));
      const ci = ctor >= 0 ? F.classes.get(cname).at + ctor : -1, cdoc = (ci >= 0 && docAt(F, ci, 'constructor')) || docOf(F, d);
      add(sec, `new E.${k}(${ci >= 0 ? params(F.L[ci], 'constructor') || '' : ''})`, cdoc, inAgent, 'E.' + k, ci >= 0 ? ci : d && d[0]);
      for (const s of Object.getOwnPropertyNames(v).filter(s => !['length', 'name', 'prototype'].includes(s) && !s.startsWith('_')).sort()) {
        const i = F.top.get(cname + '.' + s) ?? (mem && mem.methods.get(s)), val = v[s];
        add(sec, `E.${k}.${s}` + (typeof val === 'function' ? `(${i !== undefined ? params(F.L[i], s) || '' : ''})` : ''), i !== undefined ? docAt(F, i, s) : '', inAgent && EA[k] && s in EA[k], `E.${k}.${s}`, i);
      }
      if (!mem) continue;
      const protoNames = Object.getOwnPropertyNames(v.prototype).filter(m => m !== 'constructor' && !m.startsWith('_'));
      for (const m of protoNames.sort()) {
        const i = mem.methods.get(m), get = i !== undefined && /^ {2}(?:static\s+)?get\s/.test(F.L[i]);
        add(sec, `${inst}.${m}` + (get ? '' : `(${i !== undefined ? params(F.L[i], m) || '' : ''})`), i !== undefined ? docAt(F, i, m) : '', !!(amem && amem.methods.has(m)), `${k}#${m}`, i);
      }
      for (const [f, i] of [...mem.fields].filter(([f]) => !f.startsWith('_') && !protoNames.includes(f)).sort((a, b) => a[0] < b[0] ? -1 : 1)) {
        const shared = (F.L[i].match(/this\.(?!_)\w+\s*=(?![=>])/g) || []).length > 1 || /Object\.assign\(this/.test(F.L[i]), dv = mem.defaults.get(f);
        const init = initial(F.L[i], f) || (dv && /^(-?[\d.]+|'[^']*'|true|false|null)$/.test(dv) ? dv : '');
        add(sec, `${inst}.${f}` + (init ? ' = ' + init : ''), docAt(F, i, f, shared), !!(amem && amem.fields.has(f)), `${k}.${f}`, i);
        for (const n of (NESTED[k] || []).filter(n => n === f)) {   // its own fields: one clause each in the comment above
          const lit = /=\s*\{(.*)\};?/.exec(F.L[i]); if (!lit) continue;
          for (const km of lit[1].matchAll(/(?:^|,)\s*(\w+)\s*:/g)) if (!km[1].startsWith('_')) add(sec, `${inst}.${f}.${km[1]}`, docAt(F, i, km[1], true), !!(amem && amem.fields.has(f)), `${k}.${f}.${km[1]}`, i);
        }
      }
    } else if (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).some(x => typeof x === 'function') && !Object.values(v).every(x => x && typeof x === 'object')) {
      // a namespace of helpers: one line for it, one for each member
      const space = F.spaces.get(d ? d[1] : k) || new Map();
      add(sec, `E.${k}`, docOf(F, d), inAgent, 'E.' + k, d && d[0]);
      for (const m of Object.keys(v).filter(m => !m.startsWith('_')).sort()) {
        // (or set inside the function that builds it: S.record = ... in E.session's)
        const inner = () => { if (!d) return undefined; for (let j = d[0] + 1; j < Math.min(F.L.length, d[0] + 600); j++) if (new RegExp('^\\s+\\w+\\.' + m + '\\s*=(?!=)|^\\s+const \\w+ = \\{[^}]*\\b' + m + '\\s*:').test(F.L[j])) return j; return undefined; };
        const i = F.top.get((d ? d[1] : k) + '.' + m) ?? F.top.get('E.' + k + '.' + m) ?? space.get(m) ?? inner(), fn = typeof v[m] === 'function';
        add(sec, `E.${k}.${m}` + (fn ? `(${i !== undefined ? params(F.L[i], m) || '' : ''})` : ''), i !== undefined ? docAt(F, i, m) : '', inAgent && !!EA[k] && m in EA[k], `E.${k}.${m}`, i);
      }
    } else if (typeof v === 'function') {
      add(sec, `E.${k}(${d ? params(F.L[d[0]], d[1]) ?? params(F.L[d[2]], k) ?? '' : ''})`, docOf(F, d), inAgent, 'E.' + k, d && d[0]);
    } else {
      // a value or a table: its keys, briefly
      const keys = Array.isArray(v) ? v.length + ' entries' : v && typeof v === 'object' ? Object.keys(v).slice(0, 14).join(', ') + (Object.keys(v).length > 14 ? ', ... (' + Object.keys(v).length + ')' : '') : JSON.stringify(v);
      add(sec, `E.${k}` + (keys ? ': ' + keys : ''), docOf(F, d), inAgent, 'E.' + k, d && d[0]);
    }
  }
  return { E, F, entries, missing };
}

/** the index's text */
export function render({ E, F, entries }) {
  const H = E.HEIGHTS, out = [];
  out.push(`# my-3D2dge API index (v${E.version})`, '',
    `Every public name in \`engine/my-3d2dge.js\`, one line each: its signature (and default, for a field) and what its doc comment says. Written by \`node tools/api-index.mjs\` from the engine itself; \`doctrine-check\` fails when a public name has no description here. Search it for a name; \`API.md\` and the agent edition's header are the overviews. † marks a name the agent edition (\`my-3d2dge-agent.js\`) doesn't have.`, '',
    '## Units and the height rules', '',
    '| Quantity | Unit |', '| --- | --- |',
    '| Distances, positions, sizes in the world | world units: one floor tile is 16; x east, y south, z up |',
    '| Speeds, gravity | world units per second, per second squared |',
    '| Time, `dt` | seconds (`dt` is one fixed step: 1/120 s of real time times `game.timeScale`) |',
    '| Angles, `facing`, `dir` | radians: 0 east, π/2 south (a direction may also be a ground vector `[dx, dy]`) |',
    '| Screen positions | pixels of the game\'s own low-resolution buffer (`game.screen.W` × `H`) |',
    '| Colors | `\'#rrggbb\'` strings |', '',
    `- A body's \`z\` is its feet. A cell's top is \`map.height(cx, cy)\`: 0 on the floor; a wall is solid from 0 up to its \`h\`.`,
    `- A body stands on the highest top within \`z + ${H.step}\` under its footprint (\`E.HEIGHTS.step\`, \`Body.step\`).`,
    `- Eyes are at \`z + ${H.eye}\` and a target is seen at \`z + ${H.chest}\` (\`E.HEIGHTS.eye\`, \`chest\`; a body's own \`eye\` and \`chest\` override them).`,
    `- Two things are on the same level when \`|dz| <= ${H.level}\` (\`E.HEIGHTS.level\`), unless a call says otherwise.`,
    '- Collision, standing, sight (`map.sight`, `map.ray`), reach (`E.targets`, `E.inArc` with `dz`) and navigation (`E.FlowField`) all follow these rules. `E.dist` is 3D; `E.overlap` is flat.', '',
    '## Examples', '', 'Each runs in `tools/contract-test.mjs`.', '', '```js headless',
    '// a game with no display, in Node or a test: fixed steps, scripted input, its state',
    'const E = My3D2dge, game = new E.Game({ headless: true, res: \'snes\' });',
    'const hero = new E.Body({ x: 40, y: 40, r: 5 });',
    'game.start({ update(dt) { hero.vx = game.input.move()[0] * 80; if (game.input.pressed(\'jump\')) hero.jump(210); hero.update(dt); }, draw() {} });',
    'game.input.hold(\'right\'); game.input.tap(\'jump\');',
    'game.advance(0.25);   // 30 fixed steps of 1/120 s, at once',
    'if (!(hero.x > 55 && hero.z > 20)) throw new Error(\'the hero should run right and be in the air\');',
    'game.dispose();', '```', '', '```js heights',
    '// a guard on a roof, a hero in the street: sight, reach and a climb read heights the same way',
    'const E = My3D2dge, map = new E.TileMap({ rows: [\'#######\', \'#.....#\', \'#..RR.#\', \'#######\'], legend: { \'#\': 1, R: 2 }, types: { 1: { h: 80 }, 2: { h: 40 } } });',
    'const guard = { x: 56, y: 40, z: 40, facing: Math.PI }, hero = { x: 36, y: 40, z: 0, r: 5 };',
    'if (!map.sight(guard, hero)) throw new Error(\'eyes on a roof see down into the street\');',
    'if (E.targets(guard, [hero], { range: 60 }).length) throw new Error(\'not on the same level: no melee target\');',
    'const up = map.ledge(hero, 0);   // east, toward the roof',
    'if (!up || up.z !== 40) throw new Error(\'a ledge to climb onto the roof\');', '```', '');
  const bySec = new Map();
  for (const e of entries) { const k = e.sec ? e.sec.n : '?'; if (!bySec.has(k)) bySec.set(k, { sec: e.sec, list: [] }); bySec.get(k).list.push(e); }
  const order = [...bySec.values()].sort((a, b) => (a.sec ? F.sections.indexOf(a.sec) : -1) - (b.sec ? F.sections.indexOf(b.sec) : -1));
  for (const { sec, list } of order) {
    out.push(`## ${sec ? sec.n + '. ' + sec.title.charAt(0) + sec.title.slice(1).toLowerCase() : 'The engine object (E = My3D2dge)'}`, '');
    for (const e of list) out.push(`- \`${e.sig.replace(/`/g, "'")}\`${e.agent ? '' : ' †'}${e.doc ? ': ' + e.doc : ''}`);
    out.push('');
  }
  return out.join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const r = build(), text = render(r);
  if (has('missing')) {
    const by = {}; for (const m of r.missing) (by[m.sec] = by[m.sec] || []).push(m.key);
    if (has('lines')) for (const m of r.missing) console.log(`${m.key}\t${m.line === undefined || m.line === null ? '?' : m.line + 1}\t${m.line === undefined || m.line === null ? '' : r.F.L[m.line].trim().slice(0, 170)}`);
    else for (const [s, ks] of Object.entries(by)) console.log(`${s} (${ks.length}): ${ks.join(', ')}`);
    console.log(`${r.missing.length} of ${r.entries.length} public names have no description`);
    process.exit(0);
  }
  if (has('check')) {
    const now = existsSync(join(root, OUT)) ? readFileSync(join(root, OUT), 'utf8') : '';
    const problems = [];
    if (r.missing.length) problems.push(`${r.missing.length} public name(s) have no description (a doc comment above, or a // comment at the end of the line): ${r.missing.slice(0, 12).map(m => m.key).join(', ')}${r.missing.length > 12 ? ', ...' : ''} (node tools/api-index.mjs --missing lists them; document them, or make them private with _)`);
    if (now !== text) problems.push(`${OUT} is out of date with the engine: run node tools/api-index.mjs`);
    if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
    console.log(`${OUT}: ${r.entries.length} public names, every one described`);
    process.exit(0);
  }
  writeFileSync(join(root, OUT), text);
  console.log(`wrote ${OUT}: ${r.entries.length} public names${r.missing.length ? `, ${r.missing.length} without a description (--missing lists them)` : ''}`);
}
