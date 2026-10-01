/* Deterministic grammar + browser integration regression suite.
 * node tools/ed-foundry-test.mjs --model-only  (zero dependencies)
 * node tools/ed-foundry-test.mjs               (+ Playwright Chromium)
 * Optional: CHROMIUM_EXECUTABLE=/path/to/chromium.
 */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
const output = resolve('artifacts/foundry');
mkdirSync(output, { recursive: true });
const checks = [], note = (name, details = {}) => { checks.push({ name, ...details }); console.log('ok', name); };
const source = readFileSync(resolve('src/emberdeep/48-foundry-model.js'), 'utf8');
const model = vm.runInNewContext(source + '\nED_GENOME;', Object.create(null));
const plain = value => JSON.parse(JSON.stringify(value));
for (let i = 0; i < 10000; ++i) {
  const options = { seed: 'property-' + i, depth: i + 1 };
  const a = model.compose(options), b = model.compose(options);
  assert.deepEqual(plain(a), plain(b));
  assert.equal(model.validate(a).ok, true);
  assert.deepEqual(plain(model.parse(JSON.stringify(a))), plain(a));
  assert.equal(Object.isFrozen(a), true);
  assert.ok(Object.values(model.stats(a)).filter(x => typeof x === 'number').every(Number.isFinite));
}
note('10,000 deterministic, immutable genome round trips');
for (const body of Object.keys(model.bodies)) {
  const b = model.bodies[body];
  for (const role of b.roles) for (const form of b.forms) for (const socket of model.sockets[b.family]) {
    const g = model.compose({ seed: 'compatibility', body, role, form, socket });
    assert.equal(model.validate(g).ok, true);
  }
}
note('Every supported body/behavior/anatomy/socket combination validates');
const good = model.compose({ seed: 'safety', body: 'husk' });
for (const change of [{ body: '__proto__' }, { role: 'volley' }, { socket: 'tendrils' }, { version: 2 }, { depth: Infinity }, { depth: 1.5 }, { depth: -1 }, { seed: '' }, { seed: 'x'.repeat(129) }, { fingerprint: '00000000' }, { name: '<script>' }]) {
  assert.equal(model.validate({ ...good, ...change }).ok, false);
}
for (const text of ['', '{', 'x'.repeat(8193), JSON.stringify({ ...good, script: 'alert(1)' }), JSON.stringify(good).replace('"version":1', '"__proto__":{"polluted":true},"version":1')]) assert.throws(() => model.parse(text));
assert.equal({}.polluted, undefined);
note('Incompatible parts, untrusted fields, prototype keys, invalid numbers and oversized imports rejected');
for (let i = 0; i < 1000; ++i) {
  const budget = 1 + i % 24, maxUnits = 1 + i % 20;
  const pack = model.planPack({ seed: 'pack-' + i, depth: 1 + i, budget, maxUnits });
  assert.ok(pack.units.length <= maxUnits && pack.spent <= budget + .00001);
  assert.ok(pack.units.filter(g => ['wisp', 'eye'].includes(g.body)).length <= Math.ceil(maxUnits / 3));
  assert.deepEqual(plain(pack), plain(model.planPack({ seed: 'pack-' + i, depth: 1 + i, budget, maxUnits })));
}
for (const input of [{ budget: NaN }, { maxUnits: 0 }, { budget: 129 }, { maxUnits: Infinity }]) assert.throws(() => model.planPack(input));
note('1,000 seeded encounter plans respect unit/ranged/threat budgets');
const grid = { width: 6, height: 6, start: { x: 0, y: 0 }, exit: { x: 5, y: 5 }, isWalkable: () => true };
assert.equal(model.auditGrid(grid).pathLength, 10);
assert.equal(model.auditGrid({ ...grid, isWalkable: (x, y) => x !== 3 }).ok, false);
assert.equal(model.auditGrid({ ...grid, width: 1000000 }).ok, false);
assert.equal(model.auditGrid({ ...grid, start: { x: -1, y: 0 } }).ok, false);
note('Ground-route audit handles connected, disconnected, out-of-bounds and oversized grids');
if (!process.argv.includes('--model-only')) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {});
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const url = pathToFileURL(resolve('examples/emberdeep.html')).href;
  try {
    await page.goto(url + '#town');
    await page.waitForFunction(() => window.__edFoundry && __ed.ED.mode === 'town');
    await page.waitForTimeout(600);
    const saved = await page.evaluate(() => { __ed.ED.hero.gold = 777; __ed.saveGame(); return { save: JSON.stringify(My3D2dge.store.get('ed:save')), hero: __ed.ED.hero.character, gold: __ed.ED.hero.gold, diff: { ...__ed.DIFF } }; });
    assert.equal(saved.hero, 'wanderer');
    assert.equal(await page.evaluate(() => __ed.ED.L.npcs.some(n => n.id === 'foundry_beastwright')), true);
    assert.equal(await page.evaluate(() => { try { __edFoundry.spawn(__edFoundry.compose()); return false; } catch { return true; } }), true);
    note('Original Wanderer retained; Beastwright present; normal-save mutation rejected');
    const assemblies = await page.evaluate(() => {
      const F = __edFoundry, c = F.catalog(), results = [];
      for (const [body, b] of Object.entries(c.bodies)) for (const role of b.roles) for (const form of b.forms) for (const socket of c.sockets[b.family]) {
        const a = F.inspectAsset(F.compose({ seed: 'all-assemblies', body, role, form, socket }));
        results.push({ body, role, form, socket, finite: Object.values(a.baseStats).every(Number.isFinite), warnings: a.attacks.map(t => t.windup) });
      }
      return { results, cache: F.inspect().resources.assemblyCache };
    });
    assert.equal(assemblies.results.length, 153);
    assert.ok(assemblies.results.every(a => a.finite && a.warnings.every(t => t >= .36)));
    assert.ok(assemblies.cache <= 128);
    note('All 153 structural recipes assemble; measured attacks retain warnings; assembly cache stays bounded');
    await page.getByRole('button', { name: 'Open creature Foundry' }).click();
    await page.screenshot({ path: output + '/workbench.png' });
    for (const body of Object.keys(model.bodies)) for (const view of ['iso', 'threequarter', 'topdown', 'brawler']) {
      await page.evaluate(({ body, view }) => __edFoundry.preview(__edFoundry.compose({ seed: 'matrix-' + body, body, depth: 16 }), { view, pose: 'attack' }), { body, view });
      await page.waitForTimeout(70);
      assert.ok((await page.evaluate(() => __edFoundry.capture())).startsWith('data:image/png;base64,'));
    }
    note('Eight procedural bodies render attack previews in all four cameras (32 combinations)');
    await page.keyboard.press('F8');
    await page.waitForTimeout(80);
    assert.equal(await page.locator('dialog').count(), 0);
    await page.keyboard.press('F8');
    await page.waitForTimeout(80);
    assert.equal(await page.locator('dialog').count(), 1);
    await page.getByRole('button', { name: 'Enter disposable sandbox' }).click();
    await page.waitForFunction(() => __ed.DEV.enabled && __ed.ED.mode === 'town');
    await page.waitForTimeout(600);
    await page.evaluate(() => { __ed.DEV.god = true; __ed.DEV.resources = true; __ed.DEV.cooldowns = true; __ed.DEV.paused = true; });
    for (const body of Object.keys(model.bodies)) {
      const result = await page.evaluate(body => __edFoundry.spawn(__edFoundry.compose({ seed: 'live-' + body, body, depth: 16 })), body);
      assert.ok(result.length === 1 && result[0].hp > 0);
    }
    const stepped = await page.evaluate(() => { const before = __ed.game.time; const report = __edFoundry.step(120); return { report, elapsed: __ed.game.time - before }; });
    const live = stepped.report;
    assert.ok(stepped.elapsed > 1.9 && stepped.elapsed <= 2.01);
    assert.ok(live.enemies.filter(m => m.genome).length === 8);
    assert.equal(await page.evaluate(() => JSON.stringify(My3D2dge.store.get('ed:save'))), saved.save);
    note('All eight bodies spawn and simulate; sandbox does not write the normal save');
    const routes = [];
    for (const depth of [1, 3, 5, 10, 15, 16, 31, 101, 500]) {
      await page.evaluate(depth => { __ed.DEV.paused = false; __ed.DIFF.density = .2; __edFoundry.travel(depth); }, depth);
      await page.waitForFunction(depth => __ed.ED.mode === 'level' && __ed.ED.depth === depth, depth);
      await page.waitForTimeout(150);
      await page.evaluate(() => { __ed.DEV.paused = true; });
      const audit = await page.evaluate(() => __edFoundry.auditLevel());
      routes.push(audit); assert.equal(audit.nonFiniteUnits.length, 0);
      assert.equal(audit.missingMechanics.length, 0);
      // Diagnostics are explicit: the topology checker reports, never silently carves levels.
      if (!audit.topology.ok) console.warn('ROUTE DIAGNOSTIC', depth, audit.topology.errors);
    }
    writeFileSync(output + '/route-audits.json', JSON.stringify(routes, null, 2));
    assert.ok(routes.every(r => r.topology.ok));
    note('Authored and procedural depths through 500 have finite units and registered mechanics', { routeDiagnostics: routes.filter(r => !r.topology.ok).map(r => r.depth) });
    const poolChecks = await page.evaluate(() => [15, 16, 31].map(d => ({ depth: d, generated: __ed.recipe(d).pool.filter(k => k.startsWith('foundry_')).length })));
    assert.equal(poolChecks[0].generated, 0); assert.ok(poolChecks[1].generated > 0 && poolChecks[2].generated > 0);
    note('Authored introduction preserved; generated families enter normal pools at depth 16');
    await page.evaluate(() => { __ed.ED.hero.gold = 999999; __ed.DIFF.heroDmg = 7; __edFoundry.disableSandbox(); });
    await page.waitForFunction(() => !__ed.DEV.enabled && __ed.ED.mode === 'town');
    await page.waitForTimeout(500);
    const restored = await page.evaluate(() => ({ gold: __ed.ED.hero.gold, hero: __ed.ED.hero.character, diff: { ...__ed.DIFF }, save: JSON.stringify(My3D2dge.store.get('ed:save')) }));
    assert.equal(restored.gold, saved.gold); assert.equal(restored.hero, saved.hero); assert.deepEqual(restored.diff, saved.diff); assert.equal(restored.save, saved.save);
    note('Sandbox exit restores hero, gold, difficulty and saved data');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open creature Foundry' }).click();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => { const d = document.querySelector('dialog'); return d.scrollWidth <= d.clientWidth + 2; }), true);
    await page.screenshot({ path: output + '/mobile.png' });
    note('Mobile workbench fits a 390px viewport without horizontal overflow');
    assert.deepEqual(await page.evaluate(() => __ed.game.errors), []);
    assert.deepEqual(errors, []);
    note('No browser page errors or error console messages');
  } finally { await browser.close(); }
}
writeFileSync(output + '/test-report.json', JSON.stringify({ checks, generatedAt: new Date().toISOString() }, null, 2));
console.log('Foundry checks passed:', checks.length);
