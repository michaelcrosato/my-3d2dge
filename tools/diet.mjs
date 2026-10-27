// The kit diet (docs/HANDOFF-GENRES.md, 3.3): the core without the sections a kit's game never calls. tools/build.mjs
// names the sections that may be left out (DIET: parts of one or more sections, and the methods of what stays that lead
// into one); the rest comes from the code itself, so no list goes stale:
//   - what the kit calls: the engine's names (E.X) and the methods (.x) its code uses: the shell, the slice and the
//     start, the asset sets it inlines, its modules and, in 3D, the 3D engine;
//   - a part none of them calls is left out, statement by statement (the core's top-level statements, read with acorn);
//   - a statement of what stays that needs a left-out name as it loads goes with it (TileMap.prototype.solid goes with
//     the tile map), unless it is in a part the kit uses: then the name stays (the third-person kit keeps the Body);
//   - a name that kept code calls stays too (the platform map keeps parseLevel from the tile map's section), unless it
//     is called only from a method the table names (game.enableGPU and GPU lighting): that call meets a stub;
//   - what is left out still answers: E.X becomes a stub that warns once (a class: throws on new), naming the section
//     and the file that has it, as the agent edition does with what it leaves out.
// It fails, naming the section, when a kit uses an engine name it would leave out, or a name kept code needs as it
// loads would have to go.
import * as acorn from 'acorn';

const ALIASES = new Set(['E', 'My3D2dge']);   // what a game, a module and the 3D engine call the engine

/** what a kit's code uses: { E: engine names (E.X, const { X } = E), props: every method or field it reads (.x) };
 *  codes: [{ text, module }] */
export function uses(codes) {
  const E = new Set(), props = new Set();
  const walk = (n, parent) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'MemberExpression' && !n.computed && n.property.type === 'Identifier') {
      props.add(n.property.name);
      if (n.object.type === 'Identifier' && ALIASES.has(n.object.name)) E.add(n.property.name);
    }
    if (n.type === 'MemberExpression' && n.computed && n.object.type === 'Identifier' && ALIASES.has(n.object.name)) throw new Error('the kit reads the engine by a computed name (E[...]): the diet cannot tell what it uses');
    if (n.type === 'VariableDeclarator' && n.id.type === 'ObjectPattern' && n.init && n.init.type === 'Identifier' && ALIASES.has(n.init.name))
      for (const p of n.id.properties) if (p.key && p.key.type === 'Identifier') E.add(p.key.name);
    for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => walk(c, n)); else if (v && typeof v.type === 'string') walk(v, n); }
  };
  for (const c of codes) walk(acorn.parse(c.text, { ecmaVersion: 'latest', sourceType: c.module ? 'module' : 'script', allowReturnOutsideFunction: true }), null);
  return { E, props };
}

/** the names a top-level statement declares (const, let, function, class) */
function declared(st) {
  const out = [], pat = p => { if (!p) return; if (p.type === 'Identifier') out.push(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach(q => pat(q.value || q.argument)); else if (p.type === 'ArrayPattern') p.elements.forEach(pat); else if (p.type === 'AssignmentPattern') pat(p.left); else if (p.type === 'RestElement') pat(p.argument); };
  if (st.type === 'VariableDeclaration') st.declarations.forEach(d => pat(d.id));
  else if ((st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') && st.id) out.push(st.id.name);
  return out;
}
/** what a top-level expression statement puts on E (E.X = ..., Object.assign(E, { X })) and on a class's prototype
 *  (K.prototype.m = ...): { E: [X], proto: [[K, m]] } */
function defines(st) {
  const E = [], proto = [];
  const visit = e => {
    if (!e) return;
    if (e.type === 'SequenceExpression') return e.expressions.forEach(visit);
    if (e.type === 'AssignmentExpression' && e.left.type === 'MemberExpression' && !e.left.computed) {
      const L = e.left;
      if (L.object.type === 'Identifier' && L.object.name === 'E') E.push(L.property.name);
      else if (L.object.type === 'MemberExpression' && !L.object.computed && L.object.property.name === 'prototype' && L.object.object.type === 'Identifier') proto.push([L.object.object.name, L.property.name]);
      visit(e.right);
    }
    if (e.type === 'CallExpression' && e.callee.type === 'MemberExpression' && e.callee.object.name === 'Object' && e.callee.property.name === 'assign' && e.arguments[0] && e.arguments[0].type === 'Identifier' && e.arguments[0].name === 'E' && e.arguments[1] && e.arguments[1].type === 'ObjectExpression')
      for (const p of e.arguments[1].properties) if (p.key) E.push(p.key.name || p.key.value);
  };
  if (st.type === 'ExpressionStatement') visit(st.expression);
  return { E, proto };
}
/** a statement's references to the engine's top-level names and to E.X: [{ name (X, or 'E.X'), load (run as the engine
 *  loads, not inside a function), fn (the function or method it is in: its name) }] */
function references(st) {
  const out = [];
  const walk = (n, parent, key, fn, inFn) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Identifier') {
      const skip = parent && ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed) || (parent.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand) || ((parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && key === 'key' && !parent.computed));
      if (!skip) out.push({ name: n.name, load: !inFn, fn });
      return;
    }
    if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'E' && !(parent && parent.type === 'AssignmentExpression' && key === 'left')) out.push({ name: 'E.' + n.property.name, load: !inFn, fn });
    // the function a reference sits in (a method, a function, K.prototype.m = function), and whether it runs as the engine
    // loads (outside every function; a static field or block too) or only when called
    let f = fn;
    if (n.type === 'MethodDefinition' || (n.type === 'Property' && n.value && /Function/.test(n.value.type))) f = (n.key && (n.key.name || n.key.value)) || fn;
    else if (n.type === 'FunctionDeclaration' && n.id) f = n.id.name;
    else if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init && /Function/.test(n.init.type)) f = n.id.name;
    else if (n.type === 'AssignmentExpression' && /Function/.test(n.right.type) && n.left.type === 'MemberExpression' && !n.left.computed) f = n.left.property.name;
    const isFn = /Function/.test(n.type);
    for (const k of Object.keys(n)) {
      const v = n[k], inner = inFn || isFn || (n.type === 'PropertyDefinition' && k === 'value' && !n.static);
      if (Array.isArray(v)) v.forEach(c => walk(c, n, k, f, inner)); else if (v && typeof v.type === 'string') walk(v, n, k, f, inner);
    }
  };
  walk(st, null, null, null, false);
  return out;
}

/**
 * the core (src) without the parts of `parts` that `used` (uses()) never reaches. parts: [{ part, sections: ['13'], entries:
 * ['enableGPU'] }]; kinds: E name -> 'class' | 'function' | 'object' (what each is in the full engine, for its stub).
 * Returns { src, left: [{ part, sections: [[id, title]] }], kept: ['parseLevel (13. TILE MAP), for PlatformMap'],
 * stubbed: [names] }
 */
export function diet(src, parts, used, kinds) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest' });
  const call = ast.body.find(s => s.type === 'ExpressionStatement' && s.expression.type === 'CallExpression' && /Function/.test(s.expression.callee.type));
  if (!call) throw new Error('the diet: the engine is no longer one function called at once ((function (root) { ... })(...))');
  const body = call.expression.callee.body.body;
  const banners = [...src.matchAll(/^\/\* =+\n \* (\d+[a-z]?)\. (.+)$/gm)].map(m => ({ id: m[1], title: m[2].split(/\s{2,}/)[0].trim(), at: m.index }));
  const secOf = pos => { let s = null; for (const b of banners) if (b.at <= pos) s = b; return s; };
  const partOf = new Map(); for (const p of parts) for (const id of p.sections) { if (!banners.some(b => b.id === id)) throw new Error(`the diet: section ${id} (part ${p.part}) is not in the engine any more: fix DIET in tools/build.mjs`); partOf.set(id, p); }
  const S = body.map(st => { const sec = secOf(st.start), d = defines(st); return { st, sec, part: sec && partOf.get(sec.id) || null, decl: declared(st), E: d.E, proto: d.proto, refs: references(st), out: false, attached: false }; });
  const owner = new Map();
  for (const s of S) { for (const n of s.decl) owner.set(n, s); for (const n of s.E) if (!owner.has('E.' + n)) owner.set('E.' + n, s); }
  const label = sec => sec.id + '. ' + sec.title;
  // the parts the kit calls: one of their E names, or a method they add or the table names as their way in
  const calls = p => S.some(s => s.part === p && (s.E.some(n => used.E.has(n)) || s.proto.some(([, m]) => used.props.has(m)))) || (p.entries || []).some(m => used.props.has(m));
  const left = parts.filter(p => !calls(p));
  for (const s of S) if (s.part && left.includes(s.part)) s.out = true;
  // settle what stays and what goes, until nothing changes
  const kept = [], stubs = new Map();
  for (let changed = true, round = 0; changed; round++) {
    if (round > 200) throw new Error('the diet does not settle: a statement goes and comes back');
    changed = false;
    for (const s of S) {
      if (s.out) continue;
      for (const r of s.refs) {
        const o = owner.get(r.name); if (!o || o === s || !o.out) continue;
        const where = (s.sec ? label(s.sec) : 'the prelude') + (r.fn ? ', ' + r.fn + '()' : '');
        if (r.load && !s.part) { s.out = s.attached = true; changed = true; break; }   // the core's: it goes with what it extends
        if (!r.load && o.part && (o.part.entries || []).includes(r.fn)) { stubs.set(r.name, o); continue; }   // only through its way in
        if (o.attached) throw new Error(`the diet: ${where} needs ${r.name}, which goes with the part it extends: keep that part (DIET in tools/build.mjs)`);
        o.out = false; changed = true; kept.push(`${r.name} (${label(o.sec)}), for ${where}`);
      }
    }
  }
  // what the kit calls must stay (an engine name defined only by what goes is an error), and a name kept code needs as it
  // loads too
  for (const n of used.E) { const o = owner.get('E.' + n); if (o && o.out) throw new Error(`the diet: the kit uses E.${n}, which would go with ${o.sec ? label(o.sec) : 'the prelude'}: add the method that reaches it to the part's entries, or keep the part`); }
  // the stubs: names a table's method reaches, E's names, methods put on classes that stay
  const go = S.filter(s => s.out), names = new Set(), lines = [];
  const where = s => (s.part ? 'section ' + label(s.sec) : 'with ' + label(s.sec));
  for (const [n, o] of stubs) if (o.out && !n.startsWith('E.')) lines.push(`const ${n} = _leftClass('${n}', '${where(o)}');`);   // (not one pulled back since)
  for (const s of go) for (const n of s.E) if (!names.has(n) && !S.some(k => !k.out && k.E.includes(n))) {
    names.add(n); const kind = kinds[n] || 'function';
    lines.push(`E.${n} = ${kind === 'class' ? '_leftClass' : kind === 'object' ? '_leftObject' : '_leftFn'}('E.${n}', '${where(s)}');`);
  }
  for (const s of go) for (const [K, m] of s.proto) if (S.some(k => !k.out && k.decl.includes(K))) lines.push(`${K}.prototype.${m} = _leftFn('${K}.prototype.${m}', '${where(s)}');`);
  // the source: the statements that go are cut out; the stubs go in before the engine is handed over (root.My3D2dge = E)
  let out = src;
  const lastAt = body[body.length - 1].start;
  const block = lines.length ? [
    '/* ---- left out of this kit by the kit diet (tools/build.mjs): the sections its game never calls. Each name answers with a',
    ' * warning (a class: an error) naming its section; the full engine has them all (dist/my-3d2dge.js, or dist/my-3d2dge.html',
    ' * for a game of several genres) ---- */',
    "const _left = (name, sec) => name + ' is left out of this kit (' + sec + '): the full engine has it (dist/my-3d2dge.js; dist/my-3d2dge.html for a game of several genres)';",
    "const _leftFn = (name, sec) => function () { if (new.target) throw new Error('my-3D2dge: ' + _left(name, sec)); warn('left:' + name, _left(name, sec)); };",
    "const _leftClass = (name, sec) => function () { throw new Error('my-3D2dge: ' + _left(name, sec)); };",
    "const _leftObject = (name, sec) => new Proxy({}, { get: (t, k) => typeof k === 'symbol' ? undefined : _leftFn(name + '.' + String(k), sec) });",
    ...lines, ''].join('\n') : '';
  const cuts = go.map(s => [s.st.start, s.st.end]).sort((a, b) => b[0] - a[0]);
  out = out.slice(0, lastAt) + block + out.slice(lastAt);
  for (const [a, b] of cuts) { if (a >= lastAt) throw new Error('the diet would cut the engine\'s last statement'); out = out.slice(0, a) + out.slice(b); }
  const bySec = new Map(); for (const s of go) if (s.part) { const k = s.part.part; if (!bySec.has(k)) bySec.set(k, new Map()); bySec.get(k).set(s.sec.id, s.sec.title); }
  return { src: out, left: [...bySec].map(([part, m]) => ({ part, sections: [...m] })), kept, stubbed: [...stubs.keys()], attached: S.filter(s => s.attached).length };
}
