// Contract tests: one test for each documented behavior an agent relies on, on both editions (the full engine and the
// agent edition). A promise in API.md, AI_GUIDE.md or a header that no test holds drifts: the old header promised the
// same motion at 60, 120 and 144 Hz for months while the step size followed the refresh rate.
//   the clock      the same inputs at 60, 90, 120 and 144 Hz give the same state after the same time; steps are 1/120 s
//                  of real time, slow motion shortens them, pause and timeScale 0 still tick input, fps reads real time,
//                  the first frame updates before it draws
//   flow fields    a FlowField follows map.block() and map.set() at its next update
//   heights        E.HEIGHTS, map.ray/sight/standable/ledge/landing/drop/arcClear, E.inArc's dz, E.sameLevel, E.targets
//                  and FlowField over heights, on small maps (a roof edge, a kerb, a gap, a planter, a guard above)
//   audio          audio.duck(on) is public
// Usage: node tools/contract-test.mjs [--node]   (exit code 1 on a failure; --node runs only the part without a browser). What runs without a screen runs in Node; the game loop
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
  heights(E, ed);
}

// the height rules (E.HEIGHTS): collision, standing, sight, reach and navigation read heights the same way
function heights(E, ed) {
  const T = 16, C = (cx, cy, z = 0, r = 5) => ({ x: (cx + .5) * T, y: (cy + .5) * T, z, r });
  // a street between two roof blocks (40), a planter (12), a kerb (2), deep water, walls of 120 round it all
  const city = new E.TileMap({ rows: [
    '############',
    '#..........#',
    '#..p....k..#',
    '#RRR..RRR..#',
    '#RRR..RRR..#',
    '#..........#',
    '#.....~~...#',
    '############'], legend: { '#': 1, R: 2, p: 3, k: 4, '~': { floor: 'water', block: true } }, types: { 1: { h: 120 }, 2: { h: 40 }, 3: { h: 12 }, 4: { h: 2 } } });
  const H = E.HEIGHTS;
  check(`${ed}: E.HEIGHTS`, H && H.eye > H.chest && H.level === 8 && H.step === 2, JSON.stringify(H));
  // sight: over a planter lower than the eyes (los, ground only, says no), blocked by a roof, down from a roof's edge
  const a = C(1, 2), b = C(5, 2);
  check(`${ed}: sight sees over a planter lower than its eyes`, city.sight(a, b) && !city.los(a.x, a.y, b.x, b.y));
  check(`${ed}: sight from the street is blocked by a roof`, !city.sight({ x: 72, y: 40, z: 0 }, { x: 40, y: 88, z: 0 }));
  check(`${ed}: a guard at a roof's edge sees the street below`, city.sight({ x: 60, y: 72, z: 40 }, { x: 90, y: 90, z: 0 }));
  check(`${ed}: a guard in the middle of a roof can't see the street close under its edge`, !city.sight({ x: 40, y: 56, z: 40 }, { x: 72, y: 88, z: 0 }));
  check(`${ed}: a crouched body (chest 6) right behind the planter is hidden from eyes at 10`, !city.sight({ x: 1.2 * T, y: 2.5 * T, z: 0, eye: 10 }, { x: 4.2 * T, y: 2.5 * T, z: 0, chest: 6 }));
  check(`${ed}: sight's o.eye and o.target override the bodies'`, city.sight({ x: 1.2 * T, y: 2.5 * T, z: 0, eye: 10 }, { x: 4.2 * T, y: 2.5 * T, z: 0, chest: 6 }, { eye: 30, target: 22 }));
  // ray: where it stops
  const open = city.ray({ x: 4.5 * T, y: 1.5 * T, z: 0 }, { x: 4.5 * T, y: 4.5 * T, z: 0 }, { eye: 10, target: 10 });
  check(`${ed}: ray is clear down an open street`, open.clear && open.t === 1, JSON.stringify(open));
  const wall = city.ray({ x: 4.5 * T, y: 3.5 * T, z: 0 }, { x: 0.5 * T + 20, y: 3.5 * T, z: 0 }, { eye: 10, target: 10 });
  check(`${ed}: ray stops at a roof's side`, !wall.clear && Math.abs(wall.x - 4 * T) < 1e-9 && wall.z === 10, JSON.stringify(wall));
  const onto = city.ray({ x: 4.5 * T, y: 3.5 * T, z: 60 }, { x: 1.5 * T, y: 3.5 * T, z: 20 });
  check(`${ed}: ray comes down onto a roof's top`, !onto.clear && Math.abs(onto.z - 40) < 1e-9 && onto.x < 4 * T, JSON.stringify(onto));
  const diag = city.ray({ x: 4.5 * T, y: 1.5 * T, z: 0 }, { x: 9.5 * T, y: 6.5 * T, z: 0 }, { eye: 1, target: 1 });
  check(`${ed}: ray stops at a roof on a diagonal`, !diag.clear, JSON.stringify(diag));
  // standable
  check(`${ed}: standable on a roof`, city.standable(2 * T, 3.5 * T, 40, 5));
  check(`${ed}: not standable on the floor inside a roof`, !city.standable(2 * T, 3.5 * T, 0, 5));
  check(`${ed}: not standable in the air`, !city.standable(4.5 * T, 1.5 * T, 20, 5));
  check(`${ed}: not standable in deep water`, !city.standable(7 * T, 6.5 * T, 0, 5));
  check(`${ed}: standable on a kerb (2), from the floor or on it`, city.standable(8.5 * T, 2.5 * T, 0, 5) && city.standable(8.5 * T, 2.5 * T, 2, 5));
  // ledge: a 40-unit roof ahead of a body in the street; a 120-unit wall is too high; a drop first is a jump
  const climber = { x: 4.5 * T, y: 3.5 * T, z: 0, r: 5 }, L = city.ledge(climber, Math.PI);
  check(`${ed}: ledge finds the roof's edge and a spot on top`, L && L.z === 40 && L.rise === 40 && Math.abs(L.edge[0] - 4 * T) < .2 && L.x < 4 * T && city.standable(L.x, L.y, L.z, 5), JSON.stringify(L));
  check(`${ed}: ledge takes a vector as a direction`, JSON.stringify(city.ledge(climber, [-3, 0])) === JSON.stringify(L));
  check(`${ed}: no ledge on a wall higher than rise`, city.ledge({ x: 1.5 * T, y: 1.5 * T, z: 0, r: 5 }, -Math.PI / 2) === null);
  check(`${ed}: no ledge where a drop comes first`, city.ledge({ x: 3.6 * T, y: 3.5 * T, z: 40, r: 5 }, 0) === null);
  check(`${ed}: a kerb (rise 2) is no ledge`, city.ledge({ x: 8.5 * T, y: 1.5 * T, z: 0, r: 5 }, Math.PI / 2) === null);
  // landing: across the street from one roof to the other; a pole in the gap needs a higher arc; a roof too high to reach
  const jumper = { x: 3.5 * T, y: 3.5 * T, z: 40, r: 5 }, J = city.landing(jumper, 0, { min: 20 });
  check(`${ed}: landing across a gap onto the next roof`, J && J.z === 40 && J.x >= 6 * T + 5 && city.standable(J.x, J.y, J.z, 5), JSON.stringify(J));
  check(`${ed}: no landing past max`, city.landing(jumper, 0, { min: 20, max: 30 }) === null);
  check(`${ed}: no landing with a wall before the gap`, city.landing({ x: 4.5 * T, y: 1.5 * T, z: 0, r: 5 }, -Math.PI / 2) === null);
  const gaps = h => new E.TileMap({ rows: ['#########', '#AA.P.BB#', '#########'], legend: { '#': 1, A: 2, P: 3, B: 4 }, types: { 1: { h: 120 }, 2: { h: 40 }, 3: { h: 70 }, 4: { h } } });
  const runner = { x: 2.5 * T, y: 1.5 * T, z: 40, r: 5 };
  check(`${ed}: no landing when a pole in the gap rises above the arc`, gaps(40).landing(runner, 0, { min: 20 }) === null);
  const P = gaps(40).landing(runner, 0, { min: 20, apex: 40 });
  check(`${ed}: a higher arc clears the pole`, P && P.z === 40 && P.x > 6 * T, JSON.stringify(P));
  check(`${ed}: no landing on a roof higher than rise`, gaps(60).landing(runner, 0, { min: 20, apex: 45 }) === null && !!gaps(60).landing(runner, 0, { min: 20, apex: 45, rise: 25 }));
  // drop: off a roof's edge, and none facing inward
  const D = city.drop({ x: 3.6 * T, y: 3.5 * T, z: 40, r: 5 }, 0);
  check(`${ed}: drop off a roof's edge`, D && D.z === 0 && D.fall === 40, JSON.stringify(D));
  check(`${ed}: no drop facing into the roof`, city.drop({ x: 3.6 * T, y: 3.5 * T, z: 40, r: 5 }, Math.PI) === null);
  // arcClear: over the planter with a 20 apex, not with 5
  check(`${ed}: an arc clears a planter`, city.arcClear(C(1, 2), C(5, 2), 20, 5));
  check(`${ed}: a low arc doesn't`, !city.arcClear(C(1, 2), C(5, 2), 5));
  // helpers: reach and the same level
  const hero = { x: 4.5 * T, y: 3.5 * T, z: 40, facing: Math.PI }, low = { x: 3.5 * T, y: 3.5 * T, z: 0, r: 4 }, near = { x: 4.0 * T, y: 3.5 * T, z: 38, r: 4 };
  check(`${ed}: inArc without dz stays flat`, E.inArc(hero, Math.PI, low, 20, 1));
  check(`${ed}: inArc with dz limits the height difference`, !E.inArc(hero, Math.PI, low, 20, 1, 8) && E.inArc(hero, Math.PI, near, 20, 1, 8));
  check(`${ed}: sameLevel`, E.sameLevel(hero, near) && !E.sameLevel(hero, low) && E.sameLevel(hero, low, 40));
  const tg = E.targets(hero, [low, near, { x: 9 * T, y: 3.5 * T, z: 40 }], { range: 30 });
  check(`${ed}: targets keeps the same level, nearest first`, tg.length === 1 && tg[0].target === near && Math.abs(tg[0].dz + 2) < 1e-9 && Math.abs(tg[0].angle - Math.PI) < 1e-9, JSON.stringify(tg.map(t => [t.d, t.dz])));
  const tg2 = E.targets(hero, [low, near], { range: 30, dz: 50 });
  check(`${ed}: targets with dz reaches down, nearest first`, tg2.length === 2 && tg2[0].target === near && tg2[1].target === low);
  check(`${ed}: targets with an arc leaves out what's behind`, E.targets(hero, [near], { range: 30, arc: .5, facing: 0 }).length === 0);
  check(`${ed}: targets with sight leaves out what a roof hides`, E.targets({ x: 72, y: 40, z: 0 }, [{ x: 40, y: 88, z: 0 }], { range: 100, sight: city }).length === 0 && E.targets({ x: 4.5 * T, y: 5.5 * T, z: 0 }, [{ x: 4.5 * T, y: 1.5 * T, z: 0 }], { range: 100, sight: city }).length === 1);
  // navigation over heights
  const f0 = new E.FlowField(city), fd = (f, cx, cy) => f.d[cy * city.w + cx];
  f0.update(4.5 * T, 5.5 * T);
  check(`${ed}: a default field stays on the floor`, fd(f0, 4, 1) === 4 && fd(f0, 2, 3) >= 1e9, [fd(f0, 4, 1), fd(f0, 2, 3)].join(','));
  check(`${ed}: a default field walks over a kerb no higher than step`, fd(f0, 8, 2) === 7, String(fd(f0, 8, 2)));
  check(`${ed}: a default field avoids deep water`, fd(f0, 6, 6) >= 1e9);
  const fr = new E.FlowField(city); fr.update(2.5 * T, 4.5 * T);
  check(`${ed}: a target on a roof gets a field across the roof`, fd(fr, 1, 3) === 2 && fd(fr, 4, 3) >= 1e9, [fd(fr, 1, 3), fd(fr, 4, 3)].join(','));
  const fc = new E.FlowField(city, { climb: 40, drop: 40 }); fc.update(2.5 * T, 4.5 * T);
  check(`${ed}: with climb a field reaches the roof from the street`, fd(fc, 4, 3) === 3 && fd(fc, 4, 1) === 5, [fd(fc, 4, 3), fd(fc, 4, 1)].join(','));
  const dir = fc.dir(4.5 * T, 3.5 * T, 2.5 * T, 4.5 * T);
  check(`${ed}: dir climbs toward a target on a roof`, dir[0] < -.5, JSON.stringify(dir));
  const fdn = new E.FlowField(city, { drop: 40 }); fdn.update(4.5 * T, 5.5 * T);
  check(`${ed}: with drop, a roof agent hops down; the street can't climb up`, fd(fdn, 2, 3) < 1e9 && fd(f0, 2, 3) >= 1e9);
  const fup = new E.FlowField(city, { drop: 40 }); fup.update(2.5 * T, 4.5 * T);
  check(`${ed}: with drop only, no field from the street up to a roof`, fd(fup, 4, 3) >= 1e9);
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
  // the first frame updates before it draws, even when it comes at once
  const g2 = new E.Game({ canvas: 'screen', res: 'snes' }); let ready = false, drawnFirst = false;
  g2.start({ update() { ready = true; }, draw(r) { if (!ready) drawnFirst = true; r.sky(['#000', '#000']); } });
  window.__frame(f * 1000 / 60 + 1e-3); out.firstUpdates = !drawnFirst && ready;
  out.duck = typeof game.audio.duck === 'function' && (game.audio.duck(true), game.audio.ducked === true) && (game.audio.duck(false), game.audio.ducked === false);
  return out;
};

if (process.argv.includes('--node')) { console.log(failures.length ? `\nFAILED ${failures.length} of ${passed + failures.length}:\n  ${failures.join('\n  ')}` : `\nall ${passed} checks without a browser passed`); process.exit(failures.length ? 1 : 0); }
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
  check(`${ed}: the first frame updates before it draws, even when it comes at once`, R.firstUpdates);
}
await browser.close();

console.log(failures.length ? `\nFAILED ${failures.length} of ${passed + failures.length}:\n  ${failures.join('\n  ')}` : `\nall ${passed} contract checks passed`);
process.exit(failures.length ? 1 : 0);
