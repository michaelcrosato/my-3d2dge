// Syntax-checks the joined Emberdeep script (every file in src/emberdeep, or --mine a.js,b.js on top of the core)
// without a browser, then reads it with acorn for names used but declared in no scope around them (ESLint's no-undef):
// a line moved out of the function whose locals it names still parses, and passes every suite that never runs it, then
// throws a ReferenceError each time it does run (42-inventory.js in v0.108.0: `cols * CS` and `x + pad` threw every
// frame in the bag once the hero wore a legendary power, and in Harrow's forge on a TV).
//   node tools/ed-syntax.mjs [--all | --mine a.js,b.js] [--dir <path>: another copy of src/emberdeep, an old commit's]
// The files are one classic script (tools/ed-build.mjs joins them), so every file's top-level declarations are seen by
// every file (with --mine or the core alone, the files left out count too: only --all joins them, and a part may name
// another's). Past those a name is declared by a scope around it: var and function hoisted to their function (a function
// in a block to both, as a sloppy script does), let, const and class to their block, parameters (defaults, destructuring,
// rest), a catch's, a named function or class expression's own name, a function's `arguments`; or it is a global
// (GLOBALS). Property keys, members and labels are not names; `{ a }` reads a; `typeof x` is a guard, not a read; a name
// assigned is reported too. Without acorn (npm install) only the syntax is checked.
// Exit code 1 on a syntax error or an undeclared name (each one's file and line).
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2), opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] || '' : ''; };
const dir = opt('dir') ? resolve(opt('dir')) : join(root, 'src/emberdeep'), mine = opt('mine').split(',').filter(Boolean);
const core = readFileSync(join(root, 'tools/ed-build.mjs'), 'utf8').match(/const CORE = (\[[^\]]+\])/)[1].replace(/'/g, '"');
const CORE = JSON.parse(core), files = readdirSync(dir).filter(f => f.endsWith('.js')).sort().filter(f => args.includes('--all') || CORE.includes(f) || mine.includes(f));
const texts = files.map(f => readFileSync(join(dir, f), 'utf8')), src = texts.join('\n');
const starts = []; { let n = 1; for (const t of texts) { starts.push(n); n += t.split('\n').length; } }   // each file's first line in the joined script
const where = n => { let i = starts.length - 1; while (i > 0 && starts[i] > n) i--; return files[i] + ':' + (n - starts[i] + 1); };
try { new Script(src, { filename: 'joined.js' }); }
catch (e) { const msg = String(e.stack || e.message); const m = /joined\.js:(\d+)/.exec(msg); console.log('SYNTAX ERROR at ' + (m ? where(+m[1]) : '') + '\n' + msg.split('\n').slice(0, 6).join('\n')); process.exit(1); }
let parse; try { ({ parse } = await import('acorn')); } catch (e) { console.log('syntax ok:', files.length, 'files (names not checked: acorn is not installed; npm install)'); process.exit(0); }

// The globals the game may read without declaring them: everything on Node's globalThis (the language's own and the web
// platform's Node shares: Math, JSON, Map, console, setTimeout, URL, fetch, performance, navigator...) but Node's own
// (a page has no process, Buffer, global, setImmediate or clearImmediate), and these:
const BROWSER = [   // the browser's (the window's own names), that Emberdeep reads or may (navigator and performance: Node's are recent)
  'window', 'document', 'navigator', 'location', 'localStorage', 'performance', 'addEventListener', 'requestAnimationFrame', 'cancelAnimationFrame',
  'innerWidth', 'innerHeight', 'devicePixelRatio', 'getComputedStyle', 'matchMedia', 'confirm', 'prompt', 'Image', 'Audio', 'AudioContext', 'HTMLMediaElement'];
const PAGE = [   // the page's other scripts, run before the game's (src/emberdeep.template.html: <!-- @inline ... -->)
  'My3D2dge',   // engine/my-3d2dge.js: root.My3D2dge = E (window.My3D2dge)
  'Mocap'];     // src/mocap/mocap.js: a top-level const, and globalThis.Mocap (96-hero-clips.js drives the hero's clips with it)
const GLOBALS = new Set(Object.getOwnPropertyNames(globalThis).filter(n => !['process', 'Buffer', 'global', 'setImmediate', 'clearImmediate'].includes(n)).concat(BROWSER, PAGE));

// a scope: the names it declares, and the scope around it (a name is looked up when it is met, so each scope is filled
// first: a function's with its parameters and hoisted var and function, a block's with its let, const, class and function)
const scope = up => ({ names: new Set(), up });
const bound = (p, out) => {   // the names a binding pattern declares
  if (p.type === 'Identifier') out.add(p.name);
  else if (p.type === 'AssignmentPattern') bound(p.left, out);
  else if (p.type === 'RestElement') bound(p.argument, out);
  else if (p.type === 'ArrayPattern') { for (const e of p.elements) if (e) bound(e, out); }
  else if (p.type === 'ObjectPattern') for (const q of p.properties) bound(q.type === 'RestElement' ? q.argument : q.value, out);
};
const hoist = (n, f) => {   // var and function declarations anywhere in a function's statements (not in nested functions) -> its scope
  if (!n) return;
  switch (n.type) {
    case 'VariableDeclaration': if (n.kind === 'var') for (const d of n.declarations) bound(d.id, f.names); return;
    case 'FunctionDeclaration': f.names.add(n.id.name); return;
    case 'BlockStatement': case 'StaticBlock': for (const x of n.body) hoist(x, f); return;
    case 'IfStatement': hoist(n.consequent, f); hoist(n.alternate, f); return;
    case 'ForStatement': hoist(n.init, f); hoist(n.body, f); return;
    case 'ForInStatement': case 'ForOfStatement': hoist(n.left, f); hoist(n.body, f); return;
    case 'WhileStatement': case 'DoWhileStatement': case 'LabeledStatement': case 'WithStatement': hoist(n.body, f); return;
    case 'TryStatement': hoist(n.block, f); if (n.handler) hoist(n.handler.body, f); hoist(n.finalizer, f); return;
    case 'SwitchStatement': for (const c of n.cases) for (const x of c.consequent) hoist(x, f);
  }
};
const lexical = (body, s) => { for (const x of body) {   // let, const, class and function declared directly in a block -> its scope
  if (x.type === 'VariableDeclaration' && x.kind !== 'var') for (const d of x.declarations) bound(d.id, s.names);
  else if ((x.type === 'ClassDeclaration' || x.type === 'FunctionDeclaration') && x.id) s.names.add(x.id.name);
} };
const body = (stmts, s) => { lexical(stmts, s); for (const x of stmts) visit(x, s); };
const found = [];   // [name, offset in the joined script, assigned]
const ref = (id, s, assigned = false) => { for (let t = s; t; t = t.up) if (t.names.has(id.name)) return; if (!GLOBALS.has(id.name)) found.push([id.name, id.start, assigned]); };
const binding = (p, s) => {   // a binding pattern: its names are declared elsewhere; its defaults and computed keys are read
  if (p.type === 'AssignmentPattern') { binding(p.left, s); visit(p.right, s); }
  else if (p.type === 'RestElement') binding(p.argument, s);
  else if (p.type === 'ArrayPattern') { for (const e of p.elements) if (e) binding(e, s); }
  else if (p.type === 'ObjectPattern') for (const q of p.properties) { if (q.type === 'RestElement') binding(q.argument, s); else { if (q.computed) visit(q.key, s); binding(q.value, s); } }
};
const target = (p, s) => {   // an assignment's target: a name is written (no-undef reports it too), a member's object read
  if (p.type === 'Identifier') ref(p, s, true);
  else if (p.type === 'AssignmentPattern') { target(p.left, s); visit(p.right, s); }
  else if (p.type === 'RestElement') target(p.argument, s);
  else if (p.type === 'ArrayPattern') { for (const e of p.elements) if (e) target(e, s); }
  else if (p.type === 'ObjectPattern') for (const q of p.properties) { if (q.type === 'RestElement') target(q.argument, s); else { if (q.computed) visit(q.key, s); target(q.value, s); } }
  else visit(p, s);
};
const fn = (n, s) => {
  let o = s; if (n.type === 'FunctionExpression' && n.id) { o = scope(s); o.names.add(n.id.name); }   // a named function expression sees its own name
  const f = scope(o); if (n.type !== 'ArrowFunctionExpression') f.names.add('arguments');
  for (const p of n.params) bound(p, f.names);
  for (const p of n.params) binding(p, f);
  if (n.body.type === 'BlockStatement') { hoist(n.body, f); body(n.body.body, f); } else visit(n.body, f);
};
const visit = (n, s) => {
  switch (n.type) {
    case 'Identifier': ref(n, s); return;
    case 'BlockStatement': body(n.body, scope(s)); return;
    case 'StaticBlock': { const f = scope(s); hoist(n, f); body(n.body, f); return; }
    case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': fn(n, s); return;
    case 'ClassDeclaration': case 'ClassExpression': { const c = scope(s); if (n.id) c.names.add(n.id.name); if (n.superClass) visit(n.superClass, c); for (const m of n.body.body) visit(m, c); return; }
    case 'MethodDefinition': case 'PropertyDefinition': case 'Property': if (n.computed) visit(n.key, s); if (n.value) visit(n.value, s); return;   // (in an object or class; a pattern's go through binding or target)
    case 'MemberExpression': visit(n.object, s); if (n.computed) visit(n.property, s); return;
    case 'VariableDeclaration': for (const d of n.declarations) { binding(d.id, s); if (d.init) visit(d.init, s); } return;
    case 'AssignmentExpression': target(n.left, s); visit(n.right, s); return;
    case 'UpdateExpression': target(n.argument, s); return;
    case 'UnaryExpression': if (n.operator !== 'typeof' || n.argument.type !== 'Identifier') visit(n.argument, s); return;   // typeof x: a guard
    case 'CatchClause': { const c = scope(s); if (n.param) { bound(n.param, c.names); binding(n.param, c); } visit(n.body, c); return; }
    case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {   // let and const in the head are the loop's
      const f = scope(s), head = n.init || n.left;
      if (head && head.type === 'VariableDeclaration') { if (head.kind !== 'var') for (const d of head.declarations) bound(d.id, f.names); visit(head, f); }
      else if (head) (n.type === 'ForStatement' ? visit : target)(head, f);
      for (const k of ['test', 'update', 'right', 'body']) if (n[k]) visit(n[k], f);
      return;
    }
    case 'SwitchStatement': { visit(n.discriminant, s); const b = scope(s); lexical(n.cases.flatMap(c => c.consequent), b); for (const c of n.cases) { if (c.test) visit(c.test, b); for (const x of c.consequent) visit(x, b); } return; }
    case 'LabeledStatement': visit(n.body, s); return;
    case 'BreakStatement': case 'ContinueStatement': case 'MetaProperty': case 'ThisExpression': case 'Super': case 'Literal': case 'PrivateIdentifier': case 'EmptyStatement': case 'DebuggerStatement': return;
  }
  for (const k in n) { const v = n[k]; if (!v || typeof v !== 'object') continue; if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === 'string') visit(x, s); } else if (typeof v.type === 'string') visit(v, s); }
};
const read = text => parse(text, { ecmaVersion: 'latest', sourceType: 'script' }), script = b => ({ type: 'BlockStatement', body: b });
const top = scope(null), skipped = [];   // the script's scope: every file's top level
for (const f of readdirSync(dir).filter(f => f.endsWith('.js') && !files.includes(f))) {   // the files left out of a --mine or core build still declare
  try { const b = read(readFileSync(join(dir, f), 'utf8')).body; hoist(script(b), top); lexical(b, top); } catch (e) { skipped.push(f); }   // theirs (only --all joins them all)
}
const ast = read(src); hoist(script(ast.body), top); body(ast.body, top);

if (skipped.length) console.log(`(left out and not read: ${skipped.join(', ')} do not parse on their own; names they declare count as undeclared)`);
if (!found.length) { console.log('syntax ok:', files.length, 'files; no undeclared names'); process.exit(0); }
const nl = [0]; for (let i = 0; (i = src.indexOf('\n', i) + 1) > 0;) nl.push(i);   // each joined line's first offset
const lineOf = p => { let lo = 0, hi = nl.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (nl[m] <= p) lo = m; else hi = m - 1; } return lo + 1; };
const lines = new Map(); for (const [name, at, assigned] of found) { const line = lineOf(at), l = lines.get(line) || new Set(); l.add(name + (assigned ? ' (assigned)' : '')); lines.set(line, l); }
const all = src.split('\n'), count = new Set(found.map(f => f[0])).size;
console.log(`syntax ok: ${files.length} files\nUNDECLARED: ${count} name${count === 1 ? '' : 's'} used but declared in no scope around ${count === 1 ? 'it' : 'them'} (a ReferenceError when the line runs; a global the game may read goes in GLOBALS in tools/ed-syntax.mjs):`);
for (const [line, names] of [...lines].sort((a, b) => a[0] - b[0])) console.log(`  ${where(line)}  ${[...names].join(', ')}\n      ${all[line - 1].trim().slice(0, 140)}`);
process.exit(1);
