// The traversal suite (docs/HANDOFF-GENRES.md, M5): each of the Platformer's further moves (section 16c) filmed on
// tools/fixtures/traversal.html (?move=<name>: its own small map, the hero driven step by step by a script) into
// check-output/traversal/: each strip is filmed twice from the same seed and must match pixel for pixel, with no
// errors, and the move must have happened (the hero's state seen during the run: hanging for a ledge, swimming in
// water, ...). The contract tests (tools/contract-test.mjs) hold what each move does in numbers.
// Usage: node tools/traversal-test.mjs [move ...]   (run node tools/build.mjs first; exit code 1 on a failure;
// CHROMIUM_PATH picks a browser)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), out = join(root, 'check-output/traversal'), PAGE = join(root, 'tools/fixtures/traversal.html');
mkdirSync(out, { recursive: true });
const failures = []; let passed = 0;
const check = (name, ok, detail = '') => { if (ok) { passed++; console.log('  ok   ' + name + (detail ? ': ' + detail : '')); } else { failures.push(name + (detail ? ': ' + detail : '')); console.log('  FAIL ' + name + (detail ? ': ' + detail : '')); } };
const t0 = Date.now(), only = process.argv.slice(2);
// each move, the state it must show during its run, and how long its script takes (seconds)
const MOVES = { crouch: ['crouching', 5], ledge: ['hanging', 4], cling: ['clinging', 3], swim: ['swimming', 5], ice: [null, 4], conveyor: [null, 3], spring: ['sprung', 4], crumble: [null, 4], rope: ['onRope', 3], bars: ['onBars', 4], swing: ['swinging', 4.5], momentum: ['rolling', 4] };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [move, [state, secs]] of Object.entries(MOVES)) {
  if (only.length && !only.includes(move)) continue;
  const q = '?move=' + move, frames = 12, every = Math.round(secs * 60 / frames);
  const r = spawnSync(process.execPath, [join(root, 'tools/filmstrip.mjs'), PAGE + q, '--steps', `wait:200 | rec:${frames}:${every}`, '--compare', PAGE + q, '--expect-same', '--seed', '1', '--cols', '6', '--scale', '1', '--out', join(out, move + '.png')], { encoding: 'utf8' });
  const text = (r.stdout + r.stderr).trim(), same = r.status === 0 && /identical, pixel for pixel/.test(text);
  // the run itself: the state the move must show, and what changed (ice slides on, the conveyor carries, a block falls)
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } }), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(PAGE).href + q); await page.waitForFunction(() => window.__fx);
  const res = await page.evaluate(([secs]) => { const fx = window.__fx, x0 = fx.hero.x; fx.game.advance(secs); return { seen: fx.seen, x0, x: fx.hero.x, z: fx.hero.z, judged: fx.judge(), errors: fx.game.errors.length }; }, [secs]);
  await page.close();
  const happened = (state ? res.seen[state] > 0 : true) && res.judged[0];
  check(`${move}: filmed twice, the same pixels; the move happened${state ? ' (' + state + ')' : ''}`, same && happened && !errors.length && !res.errors, (same ? '' : text.split('\n').slice(-1)[0] + '; ') + JSON.stringify(res.seen) + ` x ${Math.round(res.x0)} -> ${Math.round(res.x)}, z ${Math.round(res.z)}` + (res.judged[1] ? '; ' + res.judged[1] : ''));
}
await browser.close();
console.log(failures.length ? `\ntraversal test FAILED (${failures.length}):\n  ${failures.join('\n  ')}` : `\ntraversal test passed (${passed} checks, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failures.length ? 1 : 0);
