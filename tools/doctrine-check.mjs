// The doctrine's quick checks (DOCTRINE.md, "Checks"): no browser, a second or two, run with every change (npm run
// test:changed and npm test run it first, beside the version and syntax checks).
//   node tools/doctrine-check.mjs          every check; exit code 1 on a failure
//   node tools/doctrine-check.mjs --todo   also the engine's to-do list in full: every engine-private name used outside
//                                          the engine, and where (the Temporary labs' uses are allowed and belong here)
//   node tools/doctrine-check.mjs --baseline   print what GRANDFATHERED would be today (to tighten it after a cleanup)
//   node tools/doctrine-check.mjs --base <ref> compare the decisions log with <ref> instead of where this branch left main
// 1. assets (principle 4): no binary file in the repository outside the approved list: fonts anywhere, and the pictures
//    our own tools draw for the docs (docs/assets/, written by tools/ed-codex-showcase.mjs). A binary is a file with a zero
//    byte in its first 8 KB, or a picture, sound, model or archive by its extension.
// 2. the manuals' budgets (principle 1): the agent edition's header, the API card, the API index, the 3D engine's
//    header (its manual) and each module's (engine/modules/: 1,500, or its line in MODULE_BUDGETS), in cl100k tokens (exact with gpt-tokenizer, a dev dependency since D28; without it
//    estimated from each manual's own characters a token, measured and rounded down so the estimate errs high: the header
//    2.97, the API card 3.15, the index 3.29, the 3D manual's estimate at 2.9).
// 3. the API boundary (principle 8): engine-private members (names starting with _ that engine/my-3d2dge.js defines) used
//    outside engine/, or by a module (engine/modules/: a module uses only the core's public API). The uses that were there when the doctrine was adopted are grandfathered by area (GRANDFATHERED);
//    a new one in the engine tier fails. A prototype (a Temporary lab in src/labs.json) may reach past the API: its uses
//    are listed, as the engine's to-do list, and never fail.
// 4. the logs that are never cleaned up: docs/DECISIONS.md (DOCTRINE.md, "Deviations and escalation": every entry,
//    ## D<n>, on main is still there) and docs/FEEDBACK-LOG.md (CLAUDE.md, "Feedback from a builder": every source, ### F<n>,
//    and every point, F<n>.<m>).
// 5. the API index (principle 1): API-INDEX.md is what tools/api-index.mjs makes of the engine today (node tools/build.mjs
//    writes it), every public name in it has a description, and it answers the lookups of tools/api-index-lookups.json
//    (D39).
// 6. the kits' budgets (principle 1; D51): each kit is a whole engine, card and game for a chat model's context, so every 2D
//    kit (dist/kits/my-3d2dge-<id>.html) is at most 200,000 cl100k tokens and a 3D kit no larger than at v0.59.3 (the kit
//    diet, tools/build.mjs). Counted exactly, with gpt-tokenizer only (an estimate of minified code is too rough here).
//    Six 2D kits keep budgets of their own (KIT2D: D69); the 3D kits are back at their budgets from before D63 (D70).
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, openSync, readSync, closeSync, statSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { modules as allModules } from './engine-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = k => args.includes('--' + k);
const read = f => readFileSync(join(root, f), 'utf8');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const problems = [], notes = [];
const fail = (part, m) => problems.push(`${part}: ${m}`);

/* 1. assets */
const FONTS = ['.woff2', '.woff', '.ttf', '.otf'];
const BINARY_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.wav', '.mp3', '.ogg', '.flac', '.glb', '.fbx', '.blend', '.bin', '.wasm', '.zip', '.gz', '.mp4', '.webm'];
const APPROVED = [f => FONTS.includes(extname(f).toLowerCase()), f => f.startsWith('docs/assets/')];
{
  let files = [];
  try { files = [...git('ls-files').split('\n'), ...git('ls-files', '--others', '--exclude-standard').split('\n')].filter(Boolean); }
  catch (e) { notes.push('assets: not a git checkout, skipped'); }
  const binary = f => {
    if (BINARY_EXT.includes(extname(f).toLowerCase())) return true;
    const p = join(root, f); if (!existsSync(p) || !statSync(p).isFile()) return false;
    const fd = openSync(p, 'r'), buf = Buffer.alloc(8192), n = readSync(fd, buf, 0, buf.length, 0); closeSync(fd);
    return buf.subarray(0, n).includes(0);
  };
  const found = files.filter(f => existsSync(join(root, f)) && binary(f)), approved = found.filter(f => APPROVED.some(ok => ok(f)));
  for (const f of found) if (!approved.includes(f)) fail('assets', `${f} is a binary file; make it in code or as readable data, or record the human's approval in docs/DECISIONS.md and add it to APPROVED here`);
  console.log(`1. assets: ${approved.length} approved binary file(s)${approved.length ? ' (' + approved.join(', ') + ')' : ''}${found.length > approved.length ? ', ' + (found.length - approved.length) + ' not approved' : ''}`);
}

/* 2. the manuals' budgets */
{
  let tok = null;
  try { const { encode } = await import('gpt-tokenizer/encoding/cl100k_base'); tok = s => encode(s).length; } catch (e) { /* optional */ }
  const agent = read('engine/my-3d2dge-agent.js');
  // a module's manual: 1,500 tokens, or its line here (the modules the genre plan gave 2,500; D50)
  const MODULE_BUDGET = 1500, MODULE_BUDGETS = { grid: 2500, fight: 2500, strategy: 2500, physics: 2500 };
  const MANUALS = [   // [name, text, budget in tokens, characters a token for the estimate]
    ['the agent edition\'s header', agent.slice(0, agent.indexOf('*/') + 2), 10000, 2.95],
    ['the API card (API.md)', read('API.md'), 21000, 3.1],   // (D8, D20, D50, D54, D58, D59: until the owner's review pass)
    ['the API index (API-INDEX.md)', existsSync(join(root, 'API-INDEX.md')) ? read('API-INDEX.md') : '', 60000, 3.25],   // (D17, D18, D22, D28, D50, D57: until the owner's review pass)
    ['the 3D engine\'s manual', (s => s.slice(0, s.indexOf('*/') + 2))(read('engine/my-3d2dge-3d.js')), 8000, 2.9],   // (D27; 8,000 for the genre plan's M13 and M14: D60)
    ['the asset card (docs/ASSETS.md)', read('docs/ASSETS.md'), 4000, 3.1],   // (D30)
    ...[...allModules().values()].map(m => [`module ${m.name}'s manual`, m.manual, MODULE_BUDGETS[m.name] || MODULE_BUDGET, 2.9])
  ];
  const line = [];
  for (const [name, text, budget, ratio] of MANUALS) {
    const n = tok ? tok(text) : Math.ceil(text.length / ratio);
    if (n > budget) fail('budget', `${name} is ${n} tokens${tok ? '' : ' (estimated)'}, over its budget of ${budget}: cut it, or raise the budget with a line in docs/DECISIONS.md`);
    line.push(`${name} ${n} of ${budget}`);
  }
  console.log(`2. budgets (${tok ? 'cl100k' : 'estimated'} tokens): ${line.join(', ')}`);
}

/* 3. the API boundary */
// what the engine keeps private: every _name it assigns, calls or defines as a member
const ENGINE = read('engine/my-3d2dge.js');
const PRIVATE = new Set([...ENGINE.matchAll(/(?:\bthis\.|^\s+|[{,]\s*)(_[A-Za-z]\w*)\s*(?:=[^=]|\(|:)/gm)].map(m => m[1]));
// the uses before the doctrine (v0.15.0), by area: a folder of src/ or a single file. Remove a name once its area stops
// using it (the check says when); never add one: promote the member to the public API instead, or make it a prototype's.
const GRANDFATHERED = {};   // (empty: every name it held was promoted, PROMOTED)
// private names that have a public twin now: a new use is pointed at it
const PROMOTED = {
  _w: 'rig.worldOffset(p)', _lastView: 'rig.lastView', _pose: 'rig.solvePose()', _build: 'game.lights.refresh()',
  _composite: 'r.actorNow(x, y, z, drawFn, o)', _fail: 'game.fail(where, err)', _isFront: 'map.isFront(cx, cy, view)',
  _levels: 'game.audio.applyVolume()', _note: 'game.shownNote'
};
const area = f => { const p = f.split('/'); return p.length > 2 ? p.slice(0, 2).join('/') + '/' : f; };
const walk = d => readdirSync(join(root, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
// the prototypes: each Temporary lab's template and the sources it inlines that no other page does
const PROTOTYPES = new Set();
{
  const temp = JSON.parse(read('src/labs.json')).sections.find(s => s.id === 'temporary'), tempPages = new Set((temp ? temp.entries : []).map(e => e.page));
  const pages = [...read('tools/build.mjs').matchAll(/template: '([^']+)', out: 'examples\/([^']+)\.html'/g)].map(m => ({ template: m[1], page: m[2] }));
  const sources = tpl => [tpl, ...[...read(tpl).matchAll(/@inline(?:-module|-parts|-head)? (\S+)/g)].flatMap(m => {
    const p = m[1]; if (!existsSync(join(root, p))) return [];
    return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
  })];
  const shared = new Set(pages.filter(p => !tempPages.has(p.page)).flatMap(p => sources(p.template)));
  for (const p of pages) if (tempPages.has(p.page)) for (const f of sources(p.template)) if (!shared.has(f)) PROTOTYPES.add(f);
}
const uses = {};   // area -> name -> [files]
const MODULE_FILES = [...allModules().values()].map(m => m.file);   // (a module is its own area: engine/modules/<name>.js)
for (const f of [...walk('src').filter(f => /\.(js|html)$/.test(f) && !f.startsWith('src/mocap/sets/') && !f.startsWith('src/assets/sets/')), ...MODULE_FILES]) {
  const code = read(f).split('\n').map(l => /^\s*\*/.test(l) ? '' : l.replace(/(^|\s)\/\/.*$/, '')).join('\n');   // comments may name them
  for (const m of code.matchAll(/(?<!\bthis)\.(_[A-Za-z]\w*)\b/g)) {
    if (!PRIVATE.has(m[1])) continue;
    const a = PROTOTYPES.has(f) || MODULE_FILES.includes(f) ? f : area(f), list = ((uses[a] ??= {})[m[1]] ??= []);
    if (!list.includes(f)) list.push(f);
  }
}
if (opt('baseline')) {
  console.log(JSON.stringify(Object.fromEntries(Object.entries(uses).filter(([a]) => !PROTOTYPES.has(a)).sort().map(([a, o]) => [a, Object.keys(o).sort()])), null, 2));
  process.exit(0);
}
{
  let fresh = 0;
  for (const [a, names] of Object.entries(uses)) {
    if (PROTOTYPES.has(a)) continue;
    for (const [name, files] of Object.entries(names)) if (!(GRANDFATHERED[a] || []).includes(name)) {
      fresh++; fail('boundary', `${files.join(', ')} uses the engine's private ${name}: ` + (PROMOTED[name] ? `use ${PROMOTED[name]}` : `use the public API, or promote ${name} to it (engine, agent edition, API.md), or keep this in a prototype`));
    }
  }
  for (const [a, names] of Object.entries(GRANDFATHERED)) for (const name of names) if (!(uses[a] && uses[a][name])) notes.push(`boundary: ${a} no longer uses ${name}; remove it from GRANDFATHERED in tools/doctrine-check.mjs`);
  // the engine's to-do list: the private names most wanted outside it
  const wanted = {};
  for (const [a, names] of Object.entries(uses)) for (const name of Object.keys(names)) (wanted[name] ??= []).push(a);
  const ranked = Object.entries(wanted).sort((x, y) => y[1].length - x[1].length || (x[0] < y[0] ? -1 : 1));
  const protoUses = Object.keys(uses).filter(a => PROTOTYPES.has(a));
  console.log(`3. boundary: ${fresh ? fresh + ' new use(s) of engine-private members' : 'no new use of engine-private members'} (${PROTOTYPES.size} prototype file(s) may reach past the API; ${protoUses.length} do)`);
  console.log(ranked.length ? `   the engine's to-do list, most wanted first: ${ranked.slice(0, 6).map(([n, as]) => `${n} (${as.length})`).join(', ')}${ranked.length > 6 ? ` and ${ranked.length - 6} more` : ''}${opt('todo') ? '' : ' (--todo for where)'}` : '   the engine\'s to-do list is empty: nothing outside engine/ uses its private members');
  if (opt('todo')) for (const [n, as] of ranked) console.log(`     ${n.padEnd(14)} ${as.map(a => a + (PROTOTYPES.has(a) ? ' (prototype)' : '')).join(', ')}`);
}

/* 4. the logs that are never cleaned up */
{
  const LOGS = [   // [file, what an entry is, its ids, what to do instead of removing one]
    ['docs/DECISIONS.md', 'entries', s => [...s.matchAll(/^## (D\d+)\b/gm)].map(m => m[1]), 'mark an entry superseded instead'],
    ['docs/FEEDBACK-LOG.md', 'sources and points', s => [...s.matchAll(/^### (F\d+)\b|\*\*(F\d+\.\d+)\*\*/gm)].map(m => m[1] || m[2]), 'mark a point taken up instead']
  ];
  const ref = args.includes('--base') ? args[args.indexOf('--base') + 1] : null;
  let base = null; try { base = ref || git('merge-base', 'HEAD', 'origin/main'); } catch (e) { /* no main */ }
  const out = [];
  for (const [LOG, what, ids, instead] of LOGS) {
    if (!existsSync(join(root, LOG))) { fail('logs', `${LOG} is missing`); continue; }
    const now = new Set(ids(read(LOG)));
    let before = null; try { if (base) before = git('show', `${base}:${LOG}`); } catch (e) { /* the log is new */ }
    if (before === null) { out.push(`${LOG.slice(5)} ${now.size} ${what} (${base ? 'new on this branch' : 'no main to compare with'})`); continue; }
    const gone = ids(before).filter(id => !now.has(id));
    for (const id of gone) fail('logs', `${LOG} lost ${id}: the log is never cleaned up (${instead})`);
    out.push(`${LOG.slice(5)} ${now.size} ${what}, ${gone.length ? gone.length + ' removed' : 'none removed since main'}`);
  }
  console.log(`4. logs: ${out.join('; ')}`);
}

/* 5. the API index */
{
  const { build, render, names, lookupReport } = await import(pathToFileURL(join(root, 'tools/api-index.mjs')).href), r = build(), want = render(r), lk = lookupReport(want);
  const have = existsSync(join(root, 'API-INDEX.md')) ? read('API-INDEX.md') : '';
  if (r.missing.length) fail('index', `${r.missing.length} public name(s) have no description (a doc comment above, or a // comment at the end of its line): ${r.missing.slice(0, 10).map(m => m.key).join(', ')}${r.missing.length > 10 ? ', ...' : ''}. node tools/api-index.mjs --missing lists them: document each, or make it private (_)`);
  if (have !== want) fail('index', 'API-INDEX.md is not what the engine gives today: run node tools/build.mjs (it writes the index)');
  for (const p of lk.problems) fail('index', p);
  console.log(`5. the API index: ${names(r)} public names, ${r.missing.length ? r.missing.length + ' without a description' : 'every one described'}${have === want ? '' : ', out of date'}; ${lk.line}`);
}

/* 6. the kits' budgets */
{
  let count = null;
  try { const { countTokens } = await import('gpt-tokenizer/encoding/cl100k_base'); count = countTokens; } catch (e) { /* optional */ }
  const KIT = 200000, KIT2D = { rpg: 241000, shooter: 224000, adventure: 210000, sim: 210000, rts: 208000, brawler: 207000 };   // (a 2D kit; the six that can't get there without losing what they play: D69)
  const KIT3D = { action: 241039, platformer: 235846, shooter: 310823, horror: 256000, racing: 252000, flight: 254000, crawler: 250000 };   // (a 3D kit: D51, the horror kit's D61, the racing and flight kits' D64; back from D63 by the 3D diet: D70; the crawler's D72)
  const dir = join(root, 'dist/kits'), kits = existsSync(dir) ? readdirSync(dir).filter(f => /^my-3d2dge-.+\.html$/.test(f)).sort() : [];
  if (!count) notes.push('kits: not counted (npm install for gpt-tokenizer: an estimate of minified code is too rough for these budgets)');
  else {
    const line = [];
    for (const f of kits) {
      const id = f.replace(/^my-3d2dge-|\.html$/g, ''), three = id.startsWith('3d-'), budget = three ? KIT3D[id.slice(3)] : KIT2D[id] || KIT, n = count(readFileSync(join(dir, f), 'utf8'));
      if (!budget) { fail('kits', `${f}: a new 3D kit has no budget: give it one in KIT3D (tools/doctrine-check.mjs) with a line in docs/DECISIONS.md`); continue; }
      if (n > budget) fail('kits', `${f} is ${n} tokens, over its budget of ${budget}: leave out what its game never calls (DIET in tools/build.mjs), move the API card's detail to the index, or raise the budget with a line in docs/DECISIONS.md`);
      line.push(`${id} ${Math.round(n / 1000)}k`);
    }
    console.log(`6. the kits (cl100k tokens; 2D at most ${KIT / 1000}k but six of their own, 3D each its own): ${line.join(', ')}`);
  }
}

for (const n of notes) console.log('   note: ' + n);
if (problems.length) { console.error('doctrine check FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('doctrine ok');
