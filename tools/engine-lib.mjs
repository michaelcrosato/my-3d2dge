// The engine as the tools load it: the core (engine/my-3d2dge.js) or the agent edition (engine/my-3d2dge-agent.js), then
// its modules (engine/modules/<name>.js: one general system each, in a file of its own that loads after the core;
// engine/modules/README.md says how one is written). Every tool that runs the engine, or reads its manuals, takes them
// from here, so they all see the same engine: the build, contract-test, standard-test, agent-test, api-index,
// assets-test, doctrine-check, modules-test and kits-test.
// A module's header (/*! ... */) is its manual. Its first lines say what it is, which editions it loads after and which
// modules it needs:
//   my-3D2dge module GRID v0.60.0: grids, paths, fields of view and turns
//   https://github.com/michaelcrosato/my-3d2dge (MIT License)
//   Loads after: the full engine or the agent edition. Needs: no other module.
// ("Loads after: the full engine only." for a module that uses a name the agent edition doesn't have; "Needs: grid, gen."
// for one built on others.) MY3D2DGE_MODULES (folders, comma-separated) adds modules from elsewhere: modules-test's
// fixture, in a copy of the repository.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CORE = 'engine/my-3d2dge.js', AGENT = 'engine/my-3d2dge-agent.js', MODULES = 'engine/modules';
/** each edition's file */
export const EDITIONS = { full: CORE, agent: AGENT };
const read = f => readFileSync(isAbsolute(f) ? f : join(root, f), 'utf8');

/** a source's manual: its header comment (/*! ... *\/), as written; '' without one */
export const manualOf = src => { const m = /^\/\*![\s\S]*?\*\//.exec(src); return m ? m[0] : ''; };
/** a manual's fenced examples (```js name ... ```): [{ name, code }] (an unnamed one is #1, #2, ...) */
export const examplesOf = text => [...text.matchAll(/```js( \w+)?\n([\s\S]*?)\n```/g)].map((m, i) => ({ name: (m[1] || '').trim() || '#' + (i + 1), code: m[2] }));

/** every module, by name: { name, file (from the repository's root), src, manual, about, editions: ['full', 'agent'?],
 *  needs: [names] }. A module's name is its file's; MY3D2DGE_MODULES adds folders */
export function modules() {
  const dirs = [MODULES, ...(process.env.MY3D2DGE_MODULES || '').split(',').map(s => s.trim()).filter(Boolean)], out = new Map();
  for (const d of dirs) {
    const abs = isAbsolute(d) ? d : join(root, d); if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs).filter(f => /^[a-z][a-z0-9]*\.js$/.test(f)).sort()) {
      const name = f.slice(0, -3), file = (isAbsolute(d) ? d : d.replace(/\/$/, '')) + '/' + f, src = read(file), manual = manualOf(src);
      if (out.has(name)) throw new Error(`${file}: a module named ${name} is already in ${out.get(name).file}`);
      const head = new RegExp('^\\/\\*!\\s*\\nmy-3D2dge module ' + name.toUpperCase() + ' v[\\d.]+: (.+)\\n').exec(manual);
      if (!head) throw new Error(`${file}: its manual starts "/*!" then "my-3D2dge module ${name.toUpperCase()} v<version>: what it is" (engine/modules/README.md)`);
      const loads = /^Loads after: the full engine( or the agent edition| only)\./m.exec(manual), needs = /Needs: (no other module|[a-z0-9, ]+)\./.exec(manual);
      if (!loads || !needs) throw new Error(`${file}: its manual says "Loads after: the full engine or the agent edition." (or "... the full engine only.") and "Needs: no other module." (or the modules it needs)`);
      out.set(name, { name, file, src, manual, about: head[1], editions: loads[1] === ' only' ? ['full'] : ['full', 'agent'], needs: needs[1] === 'no other module' ? [] : needs[1].split(/,\s*/) });
    }
  }
  for (const m of out.values()) for (const n of m.needs) if (!out.has(n)) throw new Error(`${m.file}: needs the module ${n}, which isn't in ${MODULES}/`);
  return out;
}

/** the modules a list of names needs, in load order: each after the ones it needs; names: 'all', or an array */
export function resolve(names = 'all', all = modules()) {
  const want = names === 'all' ? [...all.keys()] : names, out = [], seen = new Set();
  const add = (n, path) => {
    const m = all.get(n); if (!m) throw new Error(`no module named ${n} (${MODULES}/ has ${[...all.keys()].join(', ') || 'none'})`);
    if (path.includes(n)) throw new Error(`the modules need each other in a circle: ${path.concat(n).join(' -> ')}`);
    if (seen.has(n)) return; seen.add(n);
    for (const d of m.needs) add(d, path.concat(n));
    out.push(m);
  };
  for (const n of want) add(n, []);
  return out;
}

/** the modules that load after an edition, of those asked for: every one after the full engine, the agent edition's
 *  own after it (a module that needs one only the full engine has stays out with it) */
export function forEdition(edition = 'full', names = 'all', all = modules()) {
  const list = resolve(names, all);
  if (edition === 'full') return list;
  const ok = new Set();
  for (const m of list) if (m.editions.includes(edition) && m.needs.every(n => ok.has(n))) ok.add(m.name);
  return list.filter(m => ok.has(m.name));
}

/** the engine's source for an edition followed by its modules (all of them, by default; [] for none), as one script */
export function engineSource(edition = 'full', names = 'all') {
  return [read(EDITIONS[edition]), ...forEdition(edition, names).map(m => m.src)].join('\n');
}

/** the engine run in a vm context of its own, as a page's scripts would run it: its My3D2dge. o.console replaces the
 *  console; o.modules picks the modules ('all', by default) */
export function load(edition = 'full', o = {}) {
  const ctx = { console: o.console || console }; vm.createContext(ctx);
  vm.runInContext(read(EDITIONS[edition]), ctx, { filename: EDITIONS[edition] });
  for (const m of forEdition(edition, o.modules || 'all')) vm.runInContext(m.src, ctx, { filename: m.file });
  return ctx.My3D2dge;
}

/** the modules a slice names in its header ("@modules grid gen"), from its source: [names] */
export const sliceModules = src => { const m = /@modules ([a-z0-9 ]+)/.exec(src.slice(0, src.indexOf('*/') + 2)); return m ? m[1].trim().split(/\s+/) : []; };
