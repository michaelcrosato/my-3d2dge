// Builds the standalone pages by inlining the engine and game scripts.
// Usage: node tools/build.mjs
// Every output is a single self-contained HTML file (no network, no other files) that
// you can open, host, or hand to another AI model.
//   dist/my-3d2dge.html          readable engine + API card + all six starter slices (the reference)
//   dist/my-3d2dge-compact.html  same, with the engine minified (fewer tokens)
//   dist/kits/my-3d2dge-<genre>.html  minified engine + API card + ONE slice: the smallest file to
//                                hand a model that is making a game in that genre. Its engine is on the kit diet: the
//                                core less the sections its game never calls (DIET below, tools/diet.mjs)
//   dist/my-3d2dge.js / .min.js  the engine alone, for multi-file projects: the core and every module (engine/modules/) in
//                                one file
//   dist/my-3d2dge-3d.html       the 3D starter: the engine and the 3D engine (engine/my-3d2dge-3d.js: three.js r182 and
//                                Rapier 0.19.3 from vendor/, through the page's import map: served, not double-clicked),
//                                the API card and every 3D slice (src/starter3d/)
//   dist/kits/my-3d2dge-3d-<genre>.html  the same with ONE 3D slice: a 3D genre kit
//   dist/my-3d2dge-3d.js         the 3D engine alone (an ES module), readable
//   dist/my-3d2dge-agent.js      the agent edition: the essential engine plus its manual in one readable file,
//                                for AI coding agents (source: engine/my-3d2dge-agent.js; test: node tools/agent-test.mjs)
//   API-INDEX.md                 every public name in the engine, one line each (tools/api-index.mjs)
//   dist/handoff/                the package for coding agents that need the full engine: the engines, API.md, the
//                                index, AI_GUIDE.md, the tools that check, film and replay a game, and a template game
//                                with a headless test (sources: src/handoff/). The only output of several files; text only
// MODULES (engine/modules/<name>.js, engine/modules/README.md): each loads after the core, in a <script> of its own. The
// reference editions carry every module; a kit carries the ones its slice names in its header (@modules grid gen) and
// the ones those need; the examples pages carry none.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { modules as allModules, resolve as resolveModules, sliceModules } from './engine-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'engine/my-3d2dge.js';
const STARTER = 'src/starter', STARTER3D = 'src/starter3d', ENGINE3D = 'engine/my-3d2dge-3d.js';
const SLICES = { adventure: 'ADVENTURE (top-down action adventure)', platformer: 'PLATFORMER (side-scroller)', brawler: "BRAWLER (beat-'em-up)", shooter: 'SHOOTER (vertical shoot-em-up)', arcade: 'ARCADE (a cabinet of three: maze, formation, rocks)', puzzle: 'PUZZLE (falling blocks and falling pairs)', rpg: 'RPG BATTLE (turn-based battle)', roguelike: 'ROGUELIKE (a turn-based crypt of generated floors)', stealth: 'STEALTH (third-person stealth and parkour)', animlab: 'ANIMATION LAB (every move, pose, skin and view of the character rigs)' };
const ALL = {
  GAMES: 'nine working games and an animation lab',
  CONTENTS: "a title menu plus nine vertical slices\n       (ADVENTURE top-down, PLATFORMER side-scroller, BRAWLER beat-'em-up, SHOOTER, ARCADE, PUZZLE, RPG BATTLE, ROGUELIKE, STEALTH)\n       and an ANIMATION LAB that plays every move, pose and skin in every view.",
  LINKS: 'Deep links: add #adventure, #platformer, #brawler, #shooter, #arcade, #puzzle, #rpg, #roguelike, #stealth or #animlab to the address to\n       start a slice; #arcade/maze, #arcade/formation, #arcade/rocks and #shooter/horizontal jump into a part.'
};
// THE KIT DIET (docs/HANDOFF-GENRES.md, 3.3): a kit's engine leaves out the core's sections its game never calls. This
// table names the parts that may go (one or more of the core's sections, by number) and, where a part is reached only
// through a method or field of what stays, those (entries), or through a string or option name the kit writes (names:
// game.go's 'iris'); tools/diet.mjs works out the rest from the code: what the kit calls (its
// shell, slice, sets, modules and, in 3D, the 3D engine), and what each of the core's statements needs. A part the kit
// calls stays, and so does anything it needs; a kit that would call what went fails the build.
const EASES = ['inSine', 'outSine', 'inOutSine', 'inCubic', 'inOutCubic', 'inOutQuad', 'inBack', 'inOutBack', 'outElastic', 'inElastic', 'inOutElastic', 'outBounce', 'inBounce', 'inOutBounce'];
const DIET = [
  { part: 'blob', sections: ['12'] },                         // E.Blob
  { part: 'tilemap', sections: ['13'] },                      // E.TileMap, and what extends it (wall faces, shapes as solids)
  { part: 'flow', sections: ['14'] },                         // E.FlowField
  { part: 'tex', sections: ['15'] },                          // E.tex
  { part: 'platformer', sections: ['16b'] },                  // E.Platformer
  { part: 'body', sections: ['17'] },                         // E.Body
  { part: 'thirdperson', sections: ['17b', '17c', '17d'] },   // E.ACTIONS, E.Action, E.Mover, E.sees, E.hears, E.Suspicion
  { part: 'bullets', sections: ['18'] },                      // E.Bullets, E.pattern
  { part: 'hash', sections: ['19'] },                         // E.SpatialHash
  { part: 'gpu', sections: ['22'], entries: ['enableGPU'] },  // GPU lighting: only through game.enableGPU
  { part: 'easings', sections: ['1b'], entries: EASES, names: EASES },   // E.ease's names beyond the core's (read, or named in a string)
  { part: 'sprites', sections: ['2b'], names: ['rot'] },      // E.anim, E.rotSprite, E.recolor, and r.sprite's { rot }
  { part: 'tweens', sections: ['10d'] },                      // game.tween, game.script, E.until, E.all, E.any
  { part: 'paths', sections: ['10e'] },                       // E.Path
  { part: 'transitions', sections: ['10f'], names: ['wipe', 'iris', 'mosaic', 'swirl', 'dissolve'] },   // game.go's { fade: 'iris' }
  { part: 'weather', sections: ['10g'], entries: ['weather'] },   // game.weather = { ... }
  { part: 'sequences', sections: ['10h'], entries: ['history'] },   // input.sequence, input.motion, input.history
  { part: 'camera', sections: ['10i'], entries: ['window', 'snapY', 'frame'] },   // game.cam.window, cam.snapY, cam.frame
  { part: 'players', sections: ['10j'], entries: ['allowJoin', 'addPlayer', 'removePlayer', 'splitScreen', 'viewport', 'halfKeys'] }   // game.allowJoin, game.splitScreen, Input.halfKeys (game.players and game.viewports are the core's)
];
// the parts a slice's deep link can jump into (#arcade/maze), named in its kit's header
const PARTS = { arcade: ['maze', 'formation', 'rocks'], shooter: ['horizontal'] };
// a kit's line on its modules (the scripts marked "inlined from engine/modules/...", after the engine), when it has any
const modLine = mods => mods.length ? '\n       Its modules: ' + resolveModules(mods, MODS).map(m => m.name).join(', ') + ' (engine/modules/), each loaded after the engine.' : '';
const kit = (id, mods = []) => ({
  EDITION: id + ' kit', GAMES: 'one working game to copy',
  CONTENTS: 'a title menu plus the ' + SLICES[id] + ' slice.\n       This is a genre kit. The complete file with every slice is dist/my-3d2dge.html\n       at github.com/michaelcrosato/my-3d2dge.' + modLine(mods),
  LINKS: 'Deep link: add #' + id + ' to the address to start the slice' + (PARTS[id] ? '; ' + PARTS[id].map(p => '#' + id + '/' + p).join(', ') + ' jump into a part.' : '.')
});
// the 3D slices: their ids and what each is (the kit's header names it)
const SLICES3D = { action: 'ACTION (a 3D arena: combos, dashes and waves, Zelda 64 and Diablo by way of the stress test)', platformer: 'PLATFORMER (a 3D course of islands, platforms and coins, Mario 64 and Spyro)', shooter: 'SHOOTER (an open world to move through and fight in, first or third person: Apex Legends without the multiplayer)' };
const ALL3D = { EDITION: '3D edition', GAMES: 'the 3D starter games', CONTENTS: 'a title menu plus every 3D slice (' + Object.keys(SLICES3D).map(k => k.toUpperCase()).join(', ') + ').', LINKS: 'Deep links: add #' + Object.keys(SLICES3D).join(', #') + ' to the address to start a slice.' };
const kit3d = (id, mods = []) => ({ EDITION: '3D ' + id + ' kit', GAMES: 'one 3D game to copy', CONTENTS: 'a title menu plus the ' + SLICES3D[id] + ' slice.\n       This is a 3D genre kit. The file with every 3D slice is dist/my-3d2dge-3d.html at github.com/michaelcrosato/my-3d2dge.' + modLine(mods), LINKS: 'Deep link: add #' + id + ' to the address to start the slice.' });
// the modules a slice names (@modules in its header), and those of a folder of slices together
const sliceMods = file => sliceModules(readFileSync(join(root, file), 'utf8'));
const dirMods = dir => [...new Set(readdirSync(join(root, dir)).filter(f => /^[1-8]\d-.+\.js$/.test(f)).flatMap(f => sliceMods(join(dir, f))))];
const MODS = allModules();
const builds = [
  // one arena page for every view: iso by default, arena.html#threequarter (or keys 1-4, V) for the others
  { template: 'src/arena.template.html', out: 'examples/arena.html', vars: { VIEW: 'iso', TITLE: 'Emberwell · my-3D2dge' } },
  { template: 'src/lab.template.html', out: 'examples/perspective-lab.html', vars: {} },
  { template: 'src/stress.template.html', out: 'examples/stress-test.html', vars: {} },
  // imported animation clips (tools/anim-import.mjs) on a look-alike mannequin and on the hero
  { template: 'src/mocap.template.html', out: 'examples/mocap-lab.html', vars: {} },
  // every entry of the asset store (src/assets/sets/, inlined) and the core library, to browse, search and copy
  { template: 'src/asset-lab.template.html', out: 'examples/asset-lab.html', vars: {} },
  // one page that links to every lab, test page and demo, from the list in src/labs.json (my-3d2dge.vercel.app/labs)
  { template: 'src/labs.template.html', out: 'examples/labs.html', vars: {} },
  // the signature game: src/emberdeep/*.js (one script, joined in name order)
  { template: 'src/emberdeep.template.html', out: 'examples/emberdeep.html', vars: {} },
  // the files to share with AI models: API card + engine + starter slices
  { template: 'src/starter.template.html', out: 'dist/my-3d2dge.html', vars: Object.assign({ EDITION: 'single-file edition' }, ALL), modules: 'all' },
  { template: 'src/starter.template.html', out: 'dist/my-3d2dge-compact.html', vars: Object.assign({ EDITION: 'compact edition (engine minified)' }, ALL), compact: true, modules: 'all' },
  // genre kits: the shell (00-shell.js, not 05-families.js: one slice needs no families), one slice and the start code
  ...readdirSync(join(root, STARTER)).filter(f => /^[1-8]\d-.+\.js$/.test(f)).map(f => {
    const id = f.replace(/^\d+-|\.js$/g, '');
    if (!SLICES[id]) throw new Error(STARTER + '/' + f + ': name the slice in SLICES (tools/build.mjs)');
    return { template: 'src/starter.template.html', out: 'dist/kits/my-3d2dge-' + id + '.html', vars: kit(id, sliceMods(join(STARTER, f))), compact: true, kit: true, parts: p => /^(00|9)/.test(p) || p === f, modules: sliceMods(join(STARTER, f)) };
  }),
  // the 3D starter (src/starter3d/: the shell, every 3D slice, the start) and a 3D genre kit for each slice
  { template: 'src/starter3d.template.html', out: 'dist/my-3d2dge-3d.html', vars: ALL3D, compact: true, modules: dirMods(STARTER3D) },
  ...readdirSync(join(root, STARTER3D)).filter(f => /^[1-8]\d-.+\.js$/.test(f)).map(f => {
    const id = f.replace(/^\d+-|\.js$/g, '');
    if (!SLICES3D[id]) throw new Error(STARTER3D + '/' + f + ': name the slice in SLICES3D (tools/build.mjs)');
    return { template: 'src/starter3d.template.html', out: 'dist/kits/my-3d2dge-3d-' + id + '.html', vars: kit3d(id, sliceMods(join(STARTER3D, f))), compact: true, kit: true, parts: p => /^(00|9)/.test(p) || p === f, modules: sliceMods(join(STARTER3D, f)) };
  })
];

let minified = null, minified3d = null;
const dieted = new Map();
/** a kit's code, everything that may call the engine: what its template inlines for its parts (the shell, the slice, the
 *  start, its sets; in 3D the 3D engine), and its modules */
function kitCodes(b) {
  const tpl = readFileSync(join(root, b.template), 'utf8'), raw = f => readFileSync(join(root, f), 'utf8'), codes = [];
  const dirParts = dir => readdirSync(join(root, dir)).filter(f => f.endsWith('.js') && (!b.parts || b.parts(f))).sort().map(f => raw(join(dir, f))).join('\n');
  for (const m of tpl.matchAll(/<!-- @inline-with (\S+) (\S+) -->/g)) if (!b.parts || b.parts(m[1])) codes.push({ text: raw(m[2]) });
  for (const m of tpl.matchAll(/<!-- @inline-(parts|module) (\S+) -->/g)) codes.push({ text: dirParts(m[2]), module: m[1] === 'module' });
  for (const m of tpl.matchAll(/<!-- @inline-esm (\S+) -->/g)) codes.push({ text: raw(m[1]), module: true });
  for (const m of tpl.matchAll(/<!-- @inline (\S+) -->/g)) if (m[1] !== ENGINE) codes.push({ text: raw(m[1]) });
  for (const m of resolveModules(b.modules || [], MODS)) codes.push({ text: m.src });
  return codes;
}
/** what each of E's names is in the full engine (a class, a function or an object), for the stubs of what a kit leaves out */
const KINDS = (() => { const ctx = { console: { log() {}, warn() {}, error() {} } }; vm.createContext(ctx); vm.runInContext(readFileSync(join(root, ENGINE), 'utf8'), ctx); const E = ctx.My3D2dge, out = {};
  for (const k of Object.keys(E)) { const v = E[k]; out[k] = typeof v === 'function' ? (/^class\b/.test(Function.prototype.toString.call(v)) ? 'class' : 'function') : 'object'; } return out; })();
/** a kit's engine on the diet, minified (its manual kept): { diet, min }; null without acorn or terser (npm install) */
async function kitEngine(b) {
  let D; try { D = await import('./diet.mjs'); } catch (e) { console.warn('acorn is not installed (npm install); skipping the kits'); return null; }
  const d = D.diet(readFileSync(join(root, ENGINE), 'utf8'), DIET, D.uses(kitCodes(b)), KINDS);
  if (!dieted.has(d.src)) { let code = false; try { const { minify } = await import('terser'); code = (await minify(d.src, { compress: true, mangle: true, format: { comments: /^!/ } })).code; } catch (e) { /* no terser */ } dieted.set(d.src, code); }
  return { diet: d, min: dieted.get(d.src) };
}
/** a kit's header line on what its engine leaves out */
const dietLine = d => {
  if (!d.left.length) return '';
  const items = d.left.flatMap(l => l.sections.map(([id, t]) => id + ' ' + t)), lines = ['Its engine leaves out what its game never calls (the kit diet):'];
  items.forEach((w, i) => { w += i < items.length - 1 ? ',' : '.'; if ((lines[lines.length - 1] + ' ' + w).length > 104) lines.push(w); else lines[lines.length - 1] += ' ' + w; });
  return '\n       ' + lines.join('\n       ') + '\n       Calling one of them warns, naming its section. A game of several genres starts from the full engine:\n       dist/my-3d2dge.html (every slice and section, readable) or dist/my-3d2dge-compact.html.';
};
const minMods = new Map();
/** a module minified, its manual (the /*! header) kept; false without terser */
async function moduleMin(m) {
  if (minMods.has(m.name)) return minMods.get(m.name);
  let code = false;
  try { const { minify } = await import('terser'); code = (await minify(m.src, { compress: true, mangle: true, format: { comments: /^!/ } })).code; } catch (e) { /* no terser */ }
  minMods.set(m.name, code); return code;
}
/** the <script> of each module a build carries, after the engine's (minified in a compact build) */
async function moduleScripts(b) {
  const out = [];
  for (const m of resolveModules(b.modules || [], MODS)) {
    const min = b.compact ? await moduleMin(m) : null, src = (min || m.src).replaceAll('</script', '<\\/script');
    out.push(`<script>\n/* ---- inlined from ${m.file}${min ? ' (minified; the readable module is in the repo)' : ''} ---- */\n${src}\n</script>`);
  }
  return out.join('\n');
}
async function engineMin() {
  if (minified !== null) return minified;
  try {
    const { minify } = await import('terser');
    const res = await minify(readFileSync(join(root, ENGINE), 'utf8'), { compress: true, mangle: true, format: { comments: /^!/ } });
    minified = res.code;
  } catch (e) { console.warn('terser is not installed (npm install); skipping the compact build'); minified = false; }
  return minified;
}
/** the 3D engine minified as a module, its manual (the /*! header) kept */
async function engine3dMin() {
  if (minified3d !== null) return minified3d;
  try {
    const { minify } = await import('terser');
    minified3d = (await minify(readFileSync(join(root, ENGINE3D), 'utf8'), { module: true, compress: true, mangle: true, format: { comments: /^!/ } })).code;
  } catch (e) { minified3d = false; }
  return minified3d;
}

const read = file => readFileSync(join(root, file), 'utf8').replaceAll('</script', '<\\/script');
// every page may say which release it is: {{VERSION}} (package.json) and {{BUILD}}, a placeholder that tools/stamp.mjs
// turns into the commit when the site deploys (the repo's copies keep it, so a rebuild matches them exactly)
const GLOBAL = { VERSION: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version, BUILD: 'dev-build' };
// <!-- @boot Title --> becomes the boot screen's splash (the engine's own E.bootSplash, so the page's first paint and the
// screen the engine takes it over with never drift apart): it shows while the page's scripts load
const bootSplash = (() => { const ctx = { console }; vm.createContext(ctx); vm.runInContext(read(ENGINE), ctx); return ctx.My3D2dge.bootSplash; })();
const boot = html => html.replace(/<!-- @boot ?(.*?) -->/g, (_, t) => bootSplash(t.trim()));
for (const b of builds) {
  const ke = b.kit ? await kitEngine(b) : null, min = b.compact ? (ke ? ke.min : b.kit ? null : await engineMin()) : null;
  if (b.compact && !min) continue;
  let html = readFileSync(join(root, b.template), 'utf8');
  const vars = Object.assign({}, GLOBAL, b.vars); if (ke) vars.CONTENTS += dietLine(ke.diet);
  for (const [k, v] of Object.entries(vars)) html = html.replaceAll(`{{${k}}}`, v);
  html = boot(html);
  // a file one part needs, only where that part is (a kit of one slice leaves out the others' sets)
  html = html.replace(/<!-- @inline-with (\S+) (\S+) -->/g, (_, part, file) => !b.parts || b.parts(part) ? `<!-- @inline ${file} -->` : '');
  html = html.replace(/<!-- @inline-raw (\S+) -->/g, (_, file) => read(file));
  // a folder of script parts joined in name order into one <script> (the starter game: shell + one file per slice)
  html = html.replace(/<!-- @inline-parts (\S+) -->/g, (_, dir) => {
    const parts = readdirSync(join(root, dir)).filter(f => f.endsWith('.js') && (!b.parts || b.parts(f))).sort();
    return `<script>\n/* ---- inlined from ${dir} (${parts.join(', ')}) ---- */\n${parts.map(f => read(join(dir, f))).join('\n')}\n</script>`;
  });
  // one ES module file as a <script type="module"> (the 3D engine; minified, its manual kept, in a compact build)
  const min3d = b.compact ? await engine3dMin() : null;
  html = html.replace(/<!-- @inline-esm (\S+) -->/g, (_, file) => {
    const src = file === ENGINE3D && min3d ? min3d.replaceAll('</script', '<\\/script') : read(file);
    return `<script type="module">\n/* ---- inlined from ${file}${file === ENGINE3D && min3d ? ' (minified; the readable engine is in the repo)' : ''} ---- */\n${src}\n</script>`;
  });
  // a folder of module parts joined in name order into one <script type="module"> (they share one scope; imports go first)
  html = html.replace(/<!-- @inline-module (\S+) -->/g, (_, dir) => {
    const parts = readdirSync(join(root, dir)).filter(f => f.endsWith('.js') && (!b.parts || b.parts(f))).sort();
    return `<script type="module">\n/* ---- inlined from ${dir} (${parts.join(', ')}) ---- */\n${parts.map(f => read(join(dir, f))).join('\n')}\n</script>`;
  });
  // a file's first section, raw: everything before its second /* ==== banner (Dan's body, without Emberdeep's skills)
  html = html.replace(/<!-- @inline-head (\S+) -->/g, (_, file) => {
    const src = read(file), at = [...src.matchAll(/^\/\* =+$/gm)].map(m => m.index);
    if (at.length < 2) throw new Error(file + ': @inline-head needs a second /* ==== section banner');
    return `/* ---- inlined from ${file} (its first section) ---- */\n` + src.slice(0, at[1]);
  });
  const mods = await moduleScripts(b);
  html = html.replace(/<!-- @inline (\S+) -->/g, (_, file) => {
    const src = file === ENGINE && min ? min.replaceAll('</script', '<\\/script') : read(file);
    const how = file !== ENGINE || !min ? '' : ke && ke.diet.left.length ? ' (minified, less the sections its game never calls: the header above lists them; the readable engine is in the repo)' : ' (minified; the readable engine is in the repo)';
    return `<script>\n/* ---- inlined from ${file}${how} ---- */\n${src}\n</script>` + (file === ENGINE && mods ? '\n' + mods : '');
  });
  mkdirSync(dirname(join(root, b.out)), { recursive: true });
  writeFileSync(join(root, b.out), html);
  console.log('built', b.out, (html.length / 1024).toFixed(1) + ' KB' + (ke && ke.diet.left.length ? ', leaving out ' + ke.diet.left.map(l => l.part).join(', ') : ''));
}
// the engine alone: the core, then every module (each starts with its manual)
const EVERY = resolveModules('all', MODS);
writeFileSync(join(root, 'dist/my-3d2dge.js'), [readFileSync(join(root, ENGINE), 'utf8'), ...EVERY.map(m => m.src)].join('\n'));
console.log('built dist/my-3d2dge.js' + (EVERY.length ? ' (the core and ' + EVERY.length + ' module' + (EVERY.length > 1 ? 's' : '') + ')' : ''));
writeFileSync(join(root, 'dist/my-3d2dge-agent.js'), readFileSync(join(root, 'engine/my-3d2dge-agent.js'), 'utf8'));
console.log('built dist/my-3d2dge-agent.js');
writeFileSync(join(root, 'dist/my-3d2dge-3d.js'), readFileSync(join(root, ENGINE3D), 'utf8'));
console.log('built dist/my-3d2dge-3d.js');
const min = await engineMin();
if (min) { const mm = []; for (const m of EVERY) mm.push(await moduleMin(m)); writeFileSync(join(root, 'dist/my-3d2dge.min.js'), [min, ...mm].join('\n')); console.log('built dist/my-3d2dge.min.js'); }

// the API index, from the engine itself
const { build: indexOf, render: renderIndex } = await import('./api-index.mjs');
writeFileSync(join(root, 'API-INDEX.md'), renderIndex(indexOf()));
console.log('built API-INDEX.md');

// the handoff package: [its path, the source] (the README, package.json and index page take {{VERSION}} and {{BUILD}})
const H = 'dist/handoff', HANDOFF = [
  ['README.md', 'src/handoff/README.md'], ['package.json', 'src/handoff/package.json'],
  ['my-3d2dge.js', 'dist/my-3d2dge.js'], ['my-3d2dge-agent.js', 'engine/my-3d2dge-agent.js'],
  // each module on its own too, to load after the agent edition (or the full engine) with a <script> of its own
  ...EVERY.map(m => ['modules/' + m.name + '.js', m.file]),
  ['API.md', 'API.md'], ['API-INDEX.md', 'API-INDEX.md'], ['AI_GUIDE.md', 'AI_GUIDE.md'],
  ['tools/check.mjs', 'tools/check.mjs'], ['tools/filmstrip.mjs', 'tools/filmstrip.mjs'], ['tools/replay.mjs', 'tools/replay.mjs'],
  // the asset card, its tools and the store, at the repository's own paths so the card's commands work as written
  ['docs/ASSETS.md', 'docs/ASSETS.md'], ...['find', 'sheet', 'set', 'lib'].map(t => ['tools/asset-' + t + '.mjs', 'tools/asset-' + t + '.mjs']),
  ...readdirSync(join(root, 'src/assets/sets')).filter(f => f.endsWith('.js')).sort().map(f => ['src/assets/sets/' + f, 'src/assets/sets/' + f]),
  ...readdirSync(join(root, 'src/assets/catalogs')).filter(f => f.endsWith('.json')).sort().map(f => ['src/assets/catalogs/' + f, 'src/assets/catalogs/' + f]),
  ...readdirSync(join(root, 'src/handoff/game')).sort().map(f => ['game/' + f, 'src/handoff/game/' + f])
];
const SAY = { 'README.md': 'start here: what the package holds, which page to read, how to run and test a game', 'package.json': 'pins Playwright for the tools',
  'my-3d2dge.js': 'the full engine, readable: the core and every module', 'my-3d2dge-agent.js': 'the agent edition: the essential engine, its header a short manual',
  'API.md': 'the API card: read it whole', 'API-INDEX.md': 'every public name, one line each: search it', 'AI_GUIDE.md': 'the guide: recipes, the look, heights, sessions',
  'tools/check.mjs': 'plays a game headless and reports errors, screenshots and its snapshot', 'tools/filmstrip.mjs': 'records frames into one picture',
  'tools/replay.mjs': 'replays a recorded play session exactly', 'game/index.html': 'the template game: play it', 'game/game.js': 'the template game: copy it',
  'game/test.mjs': 'its headless test: node game/test.mjs', 'docs/ASSETS.md': 'the asset card: objects and materials as data (r.shape), the core library, writing one',
  'tools/asset-find.mjs': 'searches the core library and the store: node tools/asset-find.mjs "tavern table"', 'tools/asset-sheet.mjs': 'draws an object in every view and says what reads badly',
  'tools/asset-set.mjs': 'cuts the few entries a game uses from the store\'s sets', 'tools/asset-lib.mjs': 'shared by the asset tools' };
for (const m of EVERY) SAY['modules/' + m.name + '.js'] = 'a module, loaded after the engine: ' + m.about;
if (existsSync(join(root, H))) rmSync(join(root, H), { recursive: true });
const fill = s => boot(s.replaceAll('{{VERSION}}', GLOBAL.VERSION).replaceAll('{{BUILD}}', GLOBAL.BUILD));
for (const [to, from] of HANDOFF) {
  mkdirSync(dirname(join(root, H, to)), { recursive: true });
  const text = readFileSync(join(root, from), 'utf8');
  writeFileSync(join(root, H, to), from.startsWith('src/handoff/') && !from.endsWith('.js') && !from.endsWith('.mjs') ? fill(text) : text);
}
// the store: a page of its own listing every set (what each holds, from its header; the folder itself has no page), and
// one line for it on the index
const sets = HANDOFF.filter(([to]) => to.startsWith('src/assets/sets/')).map(([to, from]) => { const t = readFileSync(join(root, from), 'utf8'), n = /(\d+) shapes, (\d+) materials, (\d+) sprites/.exec(t);
  return `- [${to.split('/').pop()}](sets/${to.split('/').pop()}): ${n ? n[0] : ''}${existsSync(join(root, 'src/assets/catalogs', to.split('/').pop().replace(/\.js$/, '.json'))) ? ` ([catalog](catalogs/${to.split('/').pop().replace(/\.js$/, '.json')}))` : ' (a game\'s own cut)'}`; });
writeFileSync(join(root, H, 'src/assets/README.md'), '# The asset store\n\nSets of still objects, materials and sprites converted from CC0 libraries (each entry says where it came from),\nand the hand-written catalogs that describe them. `docs/ASSETS.md` is the card;\n`node tools/asset-find.mjs \"words\"` searches them; a game loads one with its script and\n`E.addAssets(window.ASSETS[\'<set>\'])`, or cuts the few it uses with `node tools/asset-set.mjs`.\n\n' + sets.join('\n') + '\n');
const list = HANDOFF.filter(([to]) => !to.startsWith('src/assets/')).map(([to]) => `<li><a href="${to}">${to}</a><span>${SAY[to] || ''}</span></li>`)
  .concat(`<li><a href="src/assets/README.md">src/assets/</a><span>the asset store: ${sets.length} sets of objects and materials converted from CC0 libraries, and their catalogs (docs/ASSETS.md, "Make one")</span></li>`).join('\n');
writeFileSync(join(root, H, 'index.html'), fill(readFileSync(join(root, 'src/handoff/index.html'), 'utf8')).replace('{{FILES}}', list));
console.log('built ' + H + '/ (' + (HANDOFF.length + 2) + ' files)');
