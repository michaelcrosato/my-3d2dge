// Contract tests: one test for each documented behavior an agent relies on, on both editions (the full engine and the
// agent edition). A promise in API.md, AI_GUIDE.md or a header that no test holds drifts: the old header promised the
// same motion at 60, 120 and 144 Hz for months while the step size followed the refresh rate.
//   the clock      the same inputs at 60, 90, 120 and 144 Hz give the same state after the same time; steps are 1/120 s
//                  of real time, slow motion shortens them, pause and timeScale 0 still tick input, fps reads real time
//   flow fields    a FlowField follows map.block() and map.set() at its next update
//   audio          audio.duck(on) is public
// Usage: node tools/contract-test.mjs   (exit code 1 on a failure). What runs without a screen runs in Node; the game loop
// runs in headless Chromium on a virtual clock (CHROMIUM_PATH picks a browser).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const EDITIONS = [['full', 'engine/my-3d2dge.js'], ['agent', 'engine/my-3d2dge-agent.js']];
const failures = [];
let passed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else { failures.push(name + (detail ? ': ' + detail : '')); console.log('  FAIL ' + name + (detail ? ': ' + detail : '')); } };
/** the engine loaded in Node, as a game's script would load it (a context of its own per call) */
const load = file => { const ctx = { console }; vm.createContext(ctx); vm.runInContext(readFileSync(join(root, file), 'utf8'), ctx, { filename: file }); return ctx.My3D2dge; };

// ---- in Node: what needs no screen
for (const [ed, file] of EDITIONS) {
  const E = load(file);
  console.log(`\n${ed} edition (Node)`);
  // flow fields follow the map: a corridor along the top, a way round along the bottom
  const map = new E.TileMap({ rows: ['#########', '#.......#', '#.#####.#', '#.......#', '#########'], legend: { '#': 1 }, types: { 1: { h: 24 } } });
  const flow = new E.FlowField(map), T = map.T, d = (cx, cy) => flow.d[cy * map.w + cx];
  const at = () => { flow.update(1.5 * T, 1.5 * T); return d(7, 1); };
  check(`${ed}: flow field, open corridor`, at() === 6, 'distance ' + d(7, 1));
  const v0 = map.version; map.block(4, 1);
  check(`${ed}: block() bumps map.version`, map.version === v0 + 1);
  map.block(4, 1); check(`${ed}: block() with the same value leaves map.version`, map.version === v0 + 1);
  check(`${ed}: flow field follows block()`, at() === 10, 'distance ' + d(7, 1) + ', want 10 (round the bottom)');
  map.block(4, 1, false); check(`${ed}: flow field follows unblocking`, at() === 6, 'distance ' + d(7, 1));
  map.set(4, 1, 1); check(`${ed}: flow field follows set() closing a door`, at() === 10, 'distance ' + d(7, 1));
  map.set(4, 1, 0); check(`${ed}: flow field follows set() opening a door`, at() === 6, 'distance ' + d(7, 1));
}

// ---- in the browser: the game loop, on a virtual clock that only moves when the test says so
const CLOCK = () => {
  let now = 0, due = [];
  Object.defineProperty(performance, 'now', { value: () => now, configurable: true, writable: true });
  window.requestAnimationFrame = f => { due.push(f); return due.length; };
  /** run one display frame at time t (ms) */
  window.__frame = t => { now = t; const run = due; due = []; for (const f of run) f(t); };
};
// one game, played at `hz`: the hero walks, jumps onto a block, slows to half speed and back, all from input pressed at
// times every rate has a frame at (multiples of 1/6 s). Returns its state after 2.5 s, and what the clock did.
const PLAY = hz => {
  const E = My3D2dge, game = new E.Game({ canvas: 'screen', res: 'snes' }), I = game.input, frame = 1000 / hz;
  const map = new E.TileMap({ rows: ['##########', '#........#', '#....11..#', '#........#', '##########'], legend: { '#': 1, '1': 2 }, types: { 1: { h: 40 }, 2: { h: 14 } } });
  const hero = new E.Body({ x: 30, y: 40, r: 5 }), dts = new Set();
  let peak = 0, fired = 0, jumps = 0, frames = 0, steps = [];
  game.every(.25, () => fired++);
  game.start({ update(dt) {
    dts.add(dt);
    const [mx] = I.move(); hero.vx = mx * 80;
    if (I.pressed('jump') && hero.jump(210)) jumps++;
    hero.update(dt, map); if (!hero.onGround) peak = Math.max(peak, hero.z);
  }, draw(r) { r.sky(['#000', '#000']); } });
  const at = t => { while (frames * frame < t * 1000 - 1e-6) { window.__frame(++frames * frame); steps.push(game.stats.steps); } };
  at(1 / 6); I.press('KeyD');
  at(3 / 6); I.press('KeyZ'); at(4 / 6); I.release('KeyZ');
  at(1); game.timeScale = .5;
  at(8 / 6); I.press('KeyZ'); at(9 / 6); I.release('KeyZ');
  at(1.5); game.timeScale = 1; I.release('KeyD');
  at(2.5);
  const state = [game.time, hero.x, hero.y, hero.z, hero.vz, fired, jumps, I.clock].join(' ');
  return { state, peak, time: game.time, steps: steps.slice(0, 12), total: steps.reduce((a, b) => a + b, 0), dts: [...dts].sort(), alpha: game.alpha };
};
// the rest of the clock's contract, at 60 Hz
const RULES = () => {
  const E = My3D2dge, game = new E.Game({ canvas: 'screen', res: 'snes' }), I = game.input, out = {};
  let f = 0, dts = [], pressedAtZero = false, unpaused = false;
  const frames = (n, ms = 1000 / 60) => { for (let i = 0; i < n; i++) window.__frame(++f * ms); };
  game.start({ scenes: { main: { pausable: true, update(dt) { dts.push(dt); if (I.pressed('jump') && game.timeScale === 0) pressedAtZero = true; }, draw(r) { r.sky(['#000', '#000']); } } }, scene: 'main' });
  frames(30); out.steps60 = game.stats.steps;
  dts = []; game.timeScale = .3; frames(10); out.slow = { steps: dts.length, dt: dts[0] };
  dts = []; game.timeScale = 2; frames(10); out.fast = { steps: dts.length, dt: dts[0] };
  game.timeScale = 0; frames(2); I.press('KeyZ'); frames(2); I.release('KeyZ'); out.pressedAtZero = pressedAtZero; out.timeAtZero = game.time;
  frames(1); out.stillAtZero = game.time === out.timeAtZero; game.timeScale = 1;
  game.paused = true; frames(5); I.press('Escape'); frames(1); I.release('Escape'); unpaused = !game.paused; out.unpaused = unpaused;
  // the counter reads real time: ten frames a second reads 10 (the old counter, fed clamped time, never read under 20)
  for (let i = 0; i < 12; i++) frames(1, 100);
  out.fps = game.fps; out.frameMs = game.stats.frameMs;
  out.duck = typeof game.audio.duck === 'function' && (game.audio.duck(true), game.audio.ducked === true) && (game.audio.duck(false), game.audio.ducked === false);
  return out;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [ed, file] of EDITIONS) {
  console.log(`\n${ed} edition (Chromium, virtual clock)`);
  const html = '<!doctype html><html><body style="margin:0"><canvas id="screen"></canvas><script>(' + CLOCK + ')()</script><script>' + readFileSync(join(root, file), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script></body></html>';
  const run = async (fn, arg) => {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setContent(html);
    const r = await page.evaluate(fn, arg); await page.close();
    if (errors.length) check(`${ed}: no errors`, false, errors.join(' | '));
    return r;
  };
  const rates = {};
  for (const hz of [60, 90, 120, 144]) rates[hz] = await run(PLAY, hz);
  for (const hz of [60, 90, 120, 144]) console.log(`  ${String(hz).padStart(3)} Hz: steps per frame ${rates[hz].steps.join(',')}..., ${rates[hz].total} in 2.5 s, jump peak ${rates[hz].peak.toFixed(4)}, state ${rates[hz].state}`);
  for (const hz of [90, 120, 144]) check(`${ed}: the same state at ${hz} Hz as at 60 Hz`, rates[hz].state === rates[60].state, rates[hz].state + ' vs ' + rates[60].state);
  check(`${ed}: 60 Hz runs two steps a frame`, rates[60].steps.every(s => s === 2), rates[60].steps.join(','));
  check(`${ed}: 120 Hz runs one step a frame`, rates[120].steps.every(s => s === 1), rates[120].steps.join(','));
  check(`${ed}: every step is 1/120 s of real time, slow motion half that`, rates[60].dts.length === 2 && rates[60].dts.includes(1 / 120) && rates[60].dts.includes(1 / 240), rates[60].dts.join(', '));
  check(`${ed}: 2.5 s of real time at half speed for 0.5 s is 2.25 s of game time`, Math.abs(rates[60].time - 2.25) < 1e-9, String(rates[60].time));
  check(`${ed}: game.alpha is the part of a step left over`, rates[144].alpha >= 0 && rates[144].alpha < 1, String(rates[144].alpha));
  const R = await run(RULES);
  check(`${ed}: slow motion makes steps shorter, not fewer`, R.slow.steps === 20 && Math.abs(R.slow.dt - .3 / 120) < 1e-15, JSON.stringify(R.slow));
  check(`${ed}: above timeScale 1 a step is split so none is longer than 1/120 s`, R.fast.steps === 40 && R.fast.dt === 1 / 120, JSON.stringify(R.fast));
  check(`${ed}: at timeScale 0 input still ticks and game time stands still`, R.pressedAtZero && R.stillAtZero, JSON.stringify(R));
  check(`${ed}: paused, input still ticks (pause toggles back)`, R.unpaused);
  check(`${ed}: fps reads real time (10 frames a second reads 10)`, R.fps === 10 && Math.round(R.frameMs) === 100, 'fps ' + R.fps + ', frameMs ' + R.frameMs);
  check(`${ed}: audio.duck(on) is public`, R.duck);
}
await browser.close();

console.log(failures.length ? `\nFAILED ${failures.length} of ${passed + failures.length}:\n  ${failures.join('\n  ')}` : `\nall ${passed} contract checks passed`);
process.exit(failures.length ? 1 : 0);
