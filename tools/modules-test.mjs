// The modules suite: proves the whole path a module takes (engine/modules/, docs/KITS.md, Modules) with a
// fixture that lives here and is never shipped (tools/fixtures/modules/fixture.js, a counter). In a copy of the repository
// (check-output/modules-test/repo: the sources, and node_modules linked), the fixture goes in engine/modules/ and a slice
// that names it (tools/fixtures/starter/85-fixture.js, "@modules fixture") in src/starter/, registered as a new kit is
// (the shell's SLICES, tools/build.mjs). Then the repository's own tools run there, and:
//   build     the fixture's kit carries the module (minified, its manual kept) and no other kit does; dist/my-3d2dge.js,
//             the reference editions and dist/handoff/ (my-3d2dge.js, modules/fixture.js) carry it
//   doctrine  doctrine-check passes, counting the fixture's manual against its budget
//   index     API-INDEX.md has the module's section with its names
//   contract  contract-test (Node) runs the manual's example on both editions
//   agent     agent-test runs the example in a page, after the agent edition
//   runner    a change to the module runs contract, agent, modules and the kits and phone tests of its kit, not every suite
//   play      the fixture's kit plays in Chromium: the module is there, its slice's proof gives the same number twice; a
//             kit that doesn't name it hasn't got it
// Usage: node tools/modules-test.mjs [--keep]   (--keep leaves the copy for a look; exit code 1 on a failure)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync, symlinkSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), work = join(root, 'check-output/modules-test'), repo = join(work, 'repo');
const failures = []; let passed = 0;
const check = (name, ok, detail = '') => { if (ok) { passed++; console.log('  ok   ' + name); } else { failures.push(name + (detail ? ': ' + detail : '')); console.log('  FAIL ' + name + (detail ? ': ' + detail : '')); } };
const t0 = Date.now();

/* the copy: the sources a build reads (not what it writes, nor .git), the fixture dropped in and registered */
console.log('the copy: ' + repo);
rmSync(work, { recursive: true, force: true }); mkdirSync(repo, { recursive: true });
const SKIP = new Set(['.git', 'node_modules', 'examples', 'dist', 'check-output', '.cache', 'temp-feedback', '.vercel']);
for (const f of readdirSync(root)) if (!SKIP.has(f)) cpSync(join(root, f), join(repo, f), { recursive: true });
symlinkSync(join(root, 'node_modules'), join(repo, 'node_modules'), 'dir');
// (the CMU library the cards name, which no build writes: linked as node_modules is, so their paths are there)
if (existsSync(join(root, 'examples/cmu-lib'))) { mkdirSync(join(repo, 'examples'), { recursive: true }); symlinkSync(join(root, 'examples/cmu-lib'), join(repo, 'examples/cmu-lib'), 'dir'); }
mkdirSync(join(repo, 'engine/modules'), { recursive: true });
cpSync(join(root, 'tools/fixtures/modules/fixture.js'), join(repo, 'engine/modules/fixture.js'));
cpSync(join(root, 'tools/fixtures/starter/85-fixture.js'), join(repo, 'src/starter/85-fixture.js'));
const register = (file, from, to) => {
  const s = readFileSync(join(repo, file), 'utf8');
  if (!s.includes(from)) { check('the fixture registers in ' + file, false, `"${from}" isn't there any more: change the registration in tools/modules-test.mjs`); return; }
  writeFileSync(join(repo, file), s.replace(from, to));
};
register('tools/build.mjs', 'const SLICES = { ', "const SLICES = { fixture: 'FIXTURE (a tally: the modules suite\\'s, never shipped)', ");
register('src/starter/00-shell.js', 'const SLICES = [\n', "const SLICES = [\n  { id: 'fixture', label: 'FIXTURE', about: 'A TALLY (THE MODULES SUITE)' },\n");
const node = (args, o = {}) => { const r = spawnSync(process.execPath, args, Object.assign({ cwd: repo, encoding: 'utf8', maxBuffer: 1 << 26 }, o)); return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') }; };
const tail = s => s.trim().split('\n').slice(-6).join(' | ');
const read = f => existsSync(join(repo, f)) ? readFileSync(join(repo, f), 'utf8') : '';

console.log('build');
const b = node(['tools/build.mjs']);
check('the build runs with the fixture', b.ok, tail(b.out));
const kits = readdirSync(join(repo, 'dist/kits')).filter(f => f.endsWith('.html'));
const fx = read('dist/kits/my-3d2dge-fixture.html'), mark = 'inlined from engine/modules/fixture.js';
check("the fixture's kit carries the module after the engine, minified with its manual", fx.includes(mark + ' (minified') && fx.includes('my-3D2dge module FIXTURE v') && fx.indexOf(mark) > fx.indexOf('inlined from engine/my-3d2dge.js'));
check("the fixture's kit header names its module", /Its modules follow it[\s\S]{0,160}?manual:\s+fixture\./.test(fx));
const others = kits.filter(f => f !== 'my-3d2dge-fixture.html' && read('dist/kits/' + f).includes('engine/modules/fixture.js'));
check('every other kit leaves it out (' + (kits.length - 1) + ')', !others.length, others.join(', '));
check('dist/my-3d2dge.js is the core and the module', read('dist/my-3d2dge.js').startsWith('/*!\n * my-3D2dge v') && read('dist/my-3d2dge.js').includes('my-3D2dge module FIXTURE'));
check('dist/my-3d2dge.min.js carries it, its manual kept', read('dist/my-3d2dge.min.js').includes('my-3D2dge module FIXTURE'));
check('the reference editions carry it', ['dist/my-3d2dge.html', 'dist/my-3d2dge-compact.html'].every(f => read(f).includes(mark)));
check('the handoff package carries it: in my-3d2dge.js and as modules/fixture.js, listed', read('dist/handoff/my-3d2dge.js').includes('my-3D2dge module FIXTURE') && read('dist/handoff/modules/fixture.js') === read('engine/modules/fixture.js') && read('dist/handoff/index.html').includes('modules/fixture.js'));

console.log('doctrine and the index');
const d = node(['tools/doctrine-check.mjs']), counted = /module fixture's manual (\d+) of 1500/.exec(d.out);
check('doctrine-check passes, counting the manual against its budget' + (counted ? ' (' + counted[1] + ' of 1500)' : ''), d.ok && !!counted, tail(d.out));
const idx = read('API-INDEX.md');
check('API-INDEX.md has the module\'s section and names', /^## Module fixture: proves the path every module takes/m.test(idx) && /`new E\.Tally\(o = \{\}\) → tally`: a counter/.test(idx) && /`tally\.add\(n = 1\)`/.test(idx) && /`E\.echo\(x\)`/.test(idx));
check('the index marks them as the agent edition\'s too (the module loads after it)', !/`new E\.Tally[^\n]*†/.test(idx) && !/`E\.echo\(x\)` †/.test(idx));

console.log('contract and agent');
const c = node(['tools/contract-test.mjs', '--node']);
check("contract-test runs the manual's example on both editions", c.ok && ['full', 'agent'].every(ed => c.out.includes(`ok   ${ed}: engine/modules/fixture.js example tally runs`)), tail(c.out));
const ran = node(['-e', "import('./tools/engine-lib.mjs').then(L => { for (const ed of ['full', 'agent']) { const E = L.load(ed, { console: { log() {}, warn() {}, error() {} } }); console.log(ed, typeof E.Tally, E.echo(3)); } })"]);
check('both editions load it through the tools\' loader', /full function 3/.test(ran.out) && /agent function 3/.test(ran.out), ran.out.trim());
const a = node(['tools/agent-test.mjs', '--only', 'modules', '--out', join(work, 'agent')]);
check('agent-test runs its example after the agent edition', a.ok && /ok {3}module fixture, example tally/.test(a.out), tail(a.out));

console.log('the test runner');
const l = node(['tools/test-run.mjs', '--list', '--files', 'engine/modules/fixture.js']);
check('a change to the module runs contract, agent, modules and its kit\'s kits and phone tests, not every suite', l.ok && ['contract', 'agent', 'modules'].every(s => new RegExp('^ {2}' + s + ' ', 'm').test(l.out)) && /^ {2}phone .*fixture/m.test(l.out) && /^ {2}kits .*fixture/m.test(l.out) && /skipped: .*standard/.test(l.out), l.out.trim());

console.log('play');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const open = async (file, hash) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(join(repo, file)).href + (hash ? '#' + hash : ''));
  await page.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName, null, { timeout: 30000 });
  return { page, errors };
};
{
  const { page, errors } = await open('dist/kits/my-3d2dge-fixture.html', 'fixture');
  const r = await page.evaluate(() => { const s = window.__game.scenes.fixture; return { tally: typeof My3D2dge.Tally, scene: window.__game.game.sceneName, proof: [s.run(600), s.run(600)] }; });
  check("the fixture's kit plays its slice with the module, and the proof repeats", r.tally === 'function' && r.scene === 'fixture' && r.proof[0] === 21 && r.proof[1] === 21 && !errors.length, JSON.stringify(r) + ' ' + errors.join(' | '));
  await page.close();
}
{
  const { page, errors } = await open('dist/kits/my-3d2dge-adventure.html', '');
  const r = await page.evaluate(() => typeof My3D2dge.Tally);
  check('a kit that doesn\'t name the module hasn\'t got it', r === 'undefined' && !errors.length, r + ' ' + errors.join(' | '));
  await page.close();
}
await browser.close();

if (!process.argv.includes('--keep') && !failures.length) rmSync(work, { recursive: true, force: true });
console.log(`\n${failures.length ? failures.length + ' FAILED' : 'all ' + passed + ' passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s${failures.length || process.argv.includes('--keep') ? ' (the copy: ' + repo + ')' : ''}`);
process.exit(failures.length ? 1 : 0);
