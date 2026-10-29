// Contract tests: one test for each documented behavior an agent relies on, on both editions (the full engine and the
// agent edition). A promise in API.md, AI_GUIDE.md or a header that no test holds drifts: the old header promised the
// same motion at 60, 120 and 144 Hz for months while the step size followed the refresh rate.
//   the clock      the same inputs at 60, 90, 120 and 144 Hz give the same state after the same time; steps are 1/120 s
//                  of real time, slow motion shortens them, pause and timeScale 0 still tick input, fps reads real time,
//                  the first frame updates before it draws
//   flow fields    a FlowField follows map.block() and map.set() at its next update
//   heights        E.HEIGHTS, map.ray/sight/standable/ledge/landing/drop/arcClear, E.inArc's dz, E.sameLevel, E.targets
//                  and FlowField over heights, on small maps (a roof edge, a kerb, a gap, a planter, a guard above)
//   tactics        the grid module's reach over heights past allies, shapes of effect, facing and blows from behind, threat maps
//   strategy       the pointer's gestures (a box, a long press and a box, a double tap, a pan, a zoom's point); the free
//                  camera in every ground view and turn (a drag keeps the world under the finger, a zoom keeps it under
//                  the pointer, bounds, keys); the strategy module's selection and orders by scripted pointer input in
//                  every ground view (a box, a click, a double click, a right click's move in formation and attack,
//                  control groups), gathering, training, building, an AI's build order and wave, fog; a rally point; an
//                  AI that makes its losses again and mines nearest home; the day clock and needs
//   clicks         the click module (full engine): paths round a walk area's holes from random points, the shortest (a
//                  fine grid's Dijkstra never beats them) and inside; a walk the same at 60, 90, 120 and 144 Hz; a click
//                  walks, a click on a hotspot does its verb (two buttons), a right click looks, Sierra's cursor turns;
//                  rules (an item on an item either way round, an item used on someone given), exits after the fade,
//                  state and restore; the story's log, auto and skip; a tap on a dialog's choice picks it
//   physics toys   the physics module on both editions: a ball at twice its top speed never passes through a wall, a
//                  thin segment or a flipper (from every direction, flippers swinging); a table's world the same at 60,
//                  90, 120 and 144 Hz; bounces, friction, a stack that sleeps upright, layers, sensors, a kicker, a
//                  bumper's kick, a kinematic paddle, ray and query. The terrain module: carving (hard ground stays),
//                  adding, polygons, the ground below, normals, a circle's hit, a ray, a walker on slopes, steps and
//                  walls, falling and landing, a physics ball resting on it; in Chromium only the chunks a change
//                  touched are drawn again
//   picking        map.pick on a map of heights in every ready-made view, turned four ways and zoomed: the cell and face
//                  the line of sight meets first, against a test of every cell's box; the camera's offset; off the map
//   audio          audio.duck(on) is public
//   third person   E.sees, E.hears, maps built in code (fill, setFloor) and r.marker's edge arrow on both editions; on the
//                  full one E.Mover climbs, vaults, leaps a gap, hops down, rolls, takes fall damage and jumps once a press,
//                  E.ACTIONS and E.Action (your own, paired, invulnerable, cancellable), E.Suspicion, FlowField jump links
//                  and next(), and in Chromium footprint sorting, the decorate hook and r.sightCone cut by a wall
//   shell          E.Shell: its HUD shows the state it is given, its pause screen follows game.paused (with the standard
//                  menu's Settings, Controls and Full screen), the game's input moves the focus and is held back while a
//                  screen is open, a button's act reaches the game, settings apply, toasts time out, dispose() takes it
//                  away; headless it keeps its screens' names (the standard features in depth: tools/standard-test.mjs)
//   dialogs        E.Dialog's markup on both editions: the letters alone are wrapped and typed, a run's speed and a pause
//                  take their time, a value comes from say's vars over the box's, braces that aren't markup stay, confirm
//                  finishes the page past its pauses; a map of more than 128 x 128 cells bakes its floor in chunks
//   stories        the story module's dialogue graphs on both editions: conditions (flags, comparisons, quests, lists,
//                  functions), choices filtered by theirs and picked with the keys, gotos, set and add, quests taken and
//                  done, events after the line and a choice's event holding the story till resume(), balloons, state and
//                  restore, a missing node refused
//   rpgs           the rpg module on both editions: stacks and slots (nothing added when it won't fit), a grid's places,
//                  levels and their gains, gear worn and compared, status effects, items used, rewards shared by the
//                  living, shops, damage's bounds, encounters by zone, a party saved and restored
//   modules        every module's manual (engine/modules/): its fenced examples run on each edition it loads after
//   the asset card docs/ASSETS.md's examples: on the full engine the shapes draw, the solid is placed, the sprite made, the
//                  surfaces take their materials and every worked entry draws; on the agent edition they run, the
//                  registries keep what a game adds and the calls warn (the suite in depth: tools/assets-test.mjs)
// Usage: node tools/contract-test.mjs [--node]   (exit code 1 on a failure; --node runs only the part without a browser). What runs without a screen runs in Node; the game loop
// runs in headless Chromium on a virtual clock (CHROMIUM_PATH picks a browser).
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadEngine, engineSource, modules, forEdition, examplesOf } from './engine-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const EDITIONS = [['full', 'engine/my-3d2dge.js'], ['agent', 'engine/my-3d2dge-agent.js']];
const failures = [];
let passed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else { failures.push(name + (detail ? ': ' + detail : '')); console.log('  FAIL ' + name + (detail ? ': ' + detail : '')); } };
/** the engine loaded in Node with its modules, as a game's scripts would load it (a context of its own per call) */
const load = file => loadEngine(EDITIONS.find(e => e[1] === file)[0]);

// the fenced examples of the cards and the index (```js name ... ```; a name starting full- is the full engine's only), and
// of each module's manual on the editions it loads after (x.editions)
const FENCED = file => examplesOf(readFileSync(join(root, file), 'utf8')).map(x => Object.assign(x, { file }, /^full-/.test(x.name) ? { editions: ['full'], card: true } : null));
const MODS = modules();
const EXAMPLES = [...FENCED('API.md'), ...FENCED('API-INDEX.md'),
  ...[...MODS.values()].flatMap(m => examplesOf(m.manual).map(x => Object.assign(x, { file: m.file, editions: EDITIONS.map(e => e[0]).filter(ed => forEdition(ed, [m.name], MODS).some(f => f.name === m.name)) })))];

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
  picks(E, ed);
  examples(E, ed);
  lifecycle(E, ed);
  seesAndMaps(E, ed);
  if (ed === 'full') thirdPerson(E, ed);   // (the rest of the kit is the full engine's)
  if (ed === 'full') motion(E, ed);   // (M1's sections are the full engine's)
  if (ed === 'full') traversal(E, ed);   // (and M5's moves)
  grids(E, ed);   // (the grid and gen modules load after either edition)
  arcades(E, ed);   // (and the arcade module)
  rooms(E, ed);   // (and the rooms module)
  views(E, ed);   // (and the mode7 and road modules)
  drive(E, ed);   // (and the drive module: its races on the full engine, which has E.Path)
  dialogs(E, ed);
  if (ed === 'full') strategies(E, ed);   // (the gestures, the free camera and the strategy module are the full engine's)
  if (ed === 'full') clicks(E, ed);   // (and the click module)
  stories(E, ed);   // (the story and rpg modules load after either edition)
  physicsToys(E, ed);   // (and the physics and terrain modules)
  rpgs(E, ed);
  shellHeadless(E, ed);
}

// every fenced example in API.md and API-INDEX.md runs: a snippet in Node, in a headless game when it uses one it
// doesn't make; a complete game ((() => { ... })()) in Chromium, below
function examples(E, ed) {
  for (const x of EXAMPLES.filter(x => !/^\(\(\) => \{/.test(x.code.trim()) && (!x.editions || x.editions.includes(ed)))) {
    const own = /\b(?:const|let|var)\s[^;]*\bgame\s*=/.test(x.code), game = own ? null : new E.Game({ headless: true });
    try {
      new Function('My3D2dge', ...(own ? [] : ['game']), x.code)(E, ...(own ? [] : [game]));
      if (game && game.scene) { game.input.tap('start'); game.advance(.5); }
      check(`${ed}: ${x.file} example ${x.name} runs`, true);
      if (x.editions && !x.card) console.log(`  ok   ${ed}: ${x.file} example ${x.name} runs`);   // (a module's: said, so its suite sees it ran)
    } catch (e) { check(`${ed}: ${x.file} example ${x.name} runs`, false, e.message); }
  }
}

// the lifecycle and headless runs: advance, stop, start, dispose, tap and hold
function lifecycle(E, ed) {
  const game = new E.Game({ headless: true, res: 'snes' }), I = game.input;
  check(`${ed}: a game in Node is headless, sized like a 1280 x 720 window`, game.headless && game.screen.W === 256 && game.screen.H === 224 && game.r === null && new E.Game().screen.W === 427);
  let ups = 0, draws = 0, taps = 0, downs = 0, ups2 = 0;
  game.start({ update() { ups++; if (I.pressed('jump')) taps++; if (I.down('jump')) downs++; if (I.released('jump')) ups2++; }, draw() { draws++; } });
  check(`${ed}: advance(1) runs 120 fixed steps at once`, game.advance(1) === 120 && ups === 120 && Math.abs(game.time - 1) < 1e-9, ups + ' ' + game.time);
  check(`${ed}: a headless game never draws`, game.advance(.1, { draw: true }) === 12 && draws === 0);
  I.tap('jump'); game.advance(1 / 120); game.advance(1 / 120); game.advance(1 / 120);
  check(`${ed}: tap() is pressed and down for one step, released the next`, taps === 1 && downs === 1 && ups2 === 1, [taps, downs, ups2].join(','));
  I.hold('jump'); game.advance(.05); const held = I.down('jump'); I.hold('jump', false); game.advance(1 / 120);
  check(`${ed}: hold(a) holds an action until hold(a, false)`, held && !I.down('jump') && taps === 2);
  game.dispose();
  check(`${ed}: dispose() ends it`, game.disposed && E.current !== game);
  let threw = ''; try { new E.Game({ headless: true }).advance(1); } catch (e) { threw = e.message; }
  check(`${ed}: advance() before start() says what to do`, /start/.test(threw), threw);
}

// map.pick: the cell under a screen point, checked against a test of its own (the line of sight against every cell's box,
// the hit nearest the camera kept) at random points over the map, in every view, turned four ways, at two zooms
function picks(E, ed) {
  const R = E.rng(7), H = [0, 0, 8, 16, 24, 40], W = 9, D = 7, cells = [], types = { 1: { h: 8 }, 2: { h: 16 }, 3: { h: 24 }, 4: { h: 40 } };
  for (let i = 0; i < W * D; i++) { const h = H[Math.floor(R() * H.length)]; cells.push(h ? [0, 8, 16, 24, 40].indexOf(h) : 0); }
  const map = new E.TileMap({ w: W, h: D, cells, types }), T = map.T;
  // the slab test: where the line through screen point (px, py) first meets a cell's box, from the camera's side
  const truth = (v, px, py) => {
    const N = [v.ay * v.bz, -v.ax * v.bz, v.ax * v.by - v.ay * v.bx], M = [[v.ax, v.ay, 0], [v.bx, v.by, v.bz]];
    const a = M[0].reduce((s, x) => s + x * x, 0), b = M[0].reduce((s, x, i) => s + x * M[1][i], 0), c = M[1].reduce((s, x) => s + x * x, 0), dt = a * c - b * b;
    const u = (c * px - b * py) / dt, w = (a * py - b * px) / dt, P = [0, 1, 2].map(i => M[0][i] * u + M[1][i] * w);
    let best = null;
    for (let cy = 0; cy < D; cy++) for (let cx = 0; cx < W; cx++) {
      const h = map.height(cx, cy), lo = [cx * T, cy * T, 0], hi = [cx * T + T, cy * T + T, h];
      let t0 = -Infinity, t1 = Infinity, ax = -1, ok = true;   // t: along N, toward the camera; the entry is the largest t
      for (let i = 0; i < 3 && ok; i++) {
        if (Math.abs(N[i]) < 1e-12) { if (P[i] < lo[i] - 1e-9 || P[i] > hi[i] + 1e-9) ok = false; continue; }
        const p = (lo[i] - P[i]) / N[i], q = (hi[i] - P[i]) / N[i], e = Math.max(p, q), x = Math.min(p, q);
        if (e < t1) { t1 = e; ax = i; } t0 = Math.max(t0, x);
      }
      if (!ok || t0 > t1 + 1e-9) continue;
      if (!best || t1 > best.t) best = { t: t1, cx, cy, face: ax === 2 ? 'top' : 'side' };
    }
    return best;
  };
  let n = 0, bad = [], tops = 0, sides = 0;
  for (const id of Object.keys(E.VIEWS)) for (const turn of [0, 90, 180, 270]) for (const zoom of [1, 2]) {
    const b = E.VIEWS[id], v = new E.View(id, b.label, b.yawDeg + turn, b.pitchDeg, b.scale * zoom, b.zBoost), pts = [];
    for (const x of [0, W * T]) for (const y of [0, D * T]) for (const z of [0, 40]) pts.push(v.p(x, y, z));
    const x0 = Math.min(...pts.map(p => p[0])) - 6, x1 = Math.max(...pts.map(p => p[0])) + 6, y0 = Math.min(...pts.map(p => p[1])) - 6, y1 = Math.max(...pts.map(p => p[1])) + 6;
    for (let k = 0; k < 120; k++) {
      const px = x0 + R() * (x1 - x0), py = y0 + R() * (y1 - y0), want = truth(v, px, py), ix = Math.floor(R() * 200 - 100), iy = Math.floor(R() * 200 - 100);
      const got = map.pick(px - ix, py - iy, { view: v, ix, iy });
      n++;
      const same = want ? got && got.cx === want.cx && got.cy === want.cy && got.face === want.face : !got;
      if (!same) bad.push(`${id}+${turn}x${zoom} (${px.toFixed(1)}, ${py.toFixed(1)}): want ${want ? want.cx + ',' + want.cy + ' ' + want.face : 'null'}, got ${got ? got.cx + ',' + got.cy + ' ' + got.face : 'null'}`);
      else if (want) want.face === 'top' ? tops++ : sides++;
    }
  }
  check(`${ed}: map.pick finds the cell and face the line of sight meets first, in ${Object.keys(E.VIEWS).length} views x 4 turns x 2 zooms (${n} points: ${tops} tops, ${sides} faces)`, !bad.length && tops > n / 4 && sides > n / 20, bad.length + ' wrong: ' + bad.slice(0, 4).join('; '));
  // a cell's top seen from the camera, its middle picked: that cell, its height
  const v = E.VIEWS.iso, h = map.height(4, 3), [qx, qy] = v.p(4.5 * T, 3.5 * T, h), hit = map.pick(qx, qy, { view: v, ix: 0, iy: 0 }), see = truth(v, qx, qy);
  check(`${ed}: map.pick on a top's middle gives that top at its height (or what stands in front of it)`, hit && hit.cx === see.cx && hit.cy === see.cy && (see.cx !== 4 || see.cy !== 3 || Math.abs(hit.z - h) < 1e-6), JSON.stringify(hit));
  // a headless game's camera at the start: a point off the map is null
  const game = new E.Game({ headless: true, view: 'iso' });
  check(`${ed}: map.pick reads a game's view and camera; off the map, null`, map.pick(-5000, -5000, game) === null && map.pick(...v.p(W * T / 2, D * T / 2, 0).map((c, i) => c - (i ? game.screen.iy : game.screen.ix)), game) !== null);
  game.dispose();
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
  // Body.step: a body walks onto a kerb of 2 (E.HEIGHTS.step) and is stopped by a planter of 12
  const walker = new E.Body({ x: 8.5 * T, y: 1.5 * T, r: 5, vy: 60 });
  for (let i = 0; i < 30; i++) walker.update(1 / 120, city);   // a quarter second: onto the kerb (row 2)
  check(`${ed}: Body.step: a body walks onto a top within step`, walker.z === 2 && walker.onGround && Math.abs(walker.y - 39) < 1e-9, walker.y + ' ' + walker.z);
  const blocked = new E.Body({ x: 3.5 * T, y: 1.5 * T, r: 5, vy: 60 });
  for (let i = 0; i < 60; i++) blocked.update(1 / 120, city);
  check(`${ed}: Body.step: a top higher than step stops it`, Math.abs(blocked.y - (2 * T - 5)) < 1e-6 && blocked.z === 0, blocked.y + ' ' + blocked.z);
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

// the third-person kit: the ground controller, actions, perception, jump links, maps built in code
function thirdPerson(E, ed) {
  const T = 16, still = { move: [0, 0] };
  // two roofs (40 and 44) three cells apart, a low wall (10) to vault, open street round them, walls of 120
  const map = new E.TileMap({ rows: [
    '##############',
    '#............#',
    '#.AAA...BBB..#',
    '#.AAA...BBB..#',
    '#.AAA...BBB..#',
    '#............#',
    '#..w.........#',
    '#............#',
    '##############'], legend: { '#': 1, A: 2, B: 3, w: 4 }, types: { 1: { h: 120 }, 2: { h: 40 }, 3: { h: 44 }, 4: { h: 10 } } });
  const run = (m, sec, ctl = still) => { for (let i = 0; i < Math.round(sec * 120); i++) m.update(1 / 120, map, ctl); return m; };
  // climb: at the foot of A's south wall, facing it, a jump press climbs it
  const c = new E.Mover({ x: 3.5 * T, y: 5.5 * T }); c.facing = -Math.PI / 2;
  c.update(1 / 120, map, { move: [0, 0], jumpPressed: true });
  const climbing = c.action && c.action.name, hang = c.rigState();
  run(c, 1.5);
  check(`${ed}: Mover climbs a ledge with a jump press`, climbing === 'climbUp' && c.z === 40 && c.onGround && !c.action && c.y < 5 * T, [climbing, c.x, c.y, c.z].join(' '));
  check(`${ed}: Mover.rigState() is the action's while it plays`, hang.x !== undefined && hang.facing === -Math.PI / 2, JSON.stringify(hang));
  // a gap: running east off A toward B with a jump at the edge lands on B (the gap assist)
  const l = new E.Mover({ x: 3 * T, y: 3.5 * T, z: 40 }); l.facing = 0;
  let pressed = false;
  for (let i = 0; i < 240; i++) { const at = !pressed && l.onGround && map.drop(l, 0, { reach: 10 }); if (at) pressed = true; l.update(1 / 120, map, { move: [1, 0], jumpPressed: !!at }); if (pressed && l.onGround && l.x > 8 * T) break; }
  check(`${ed}: Mover leaps a gap onto the far roof`, pressed && l.z === 44 && l.x > 8 * T && l.x < 11 * T, [l.x, l.z].join(' '));
  // one jump a press: pressing again in the next steps (coyote time) doesn't jump again, after a leap or a plain jump
  const peak = (x, z, again) => { const m = new E.Mover({ x, y: 3.5 * T, z, vx: 85 }); let p = 0, t0 = -1;
    for (let i = 0; i < 120; i++) { if (t0 < 0 && (map.drop(m, 0, { reach: 10 }) || !z)) t0 = i; m.update(1 / 120, map, { move: [1, 0], jumpPressed: i === t0 || (again && i === t0 + 6) }); p = Math.max(p, m.z); } return p; };
  check(`${ed}: Mover jumps once a press, even pressed again in the air at once`, peak(4.6 * T, 40) > 60 && peak(4.6 * T, 40, true) === peak(4.6 * T, 40) && peak(6 * T, 0, true) === peak(6 * T, 0),
    [peak(4.6 * T, 40), peak(4.6 * T, 40, true), peak(6 * T, 0), peak(6 * T, 0, true)].join(' '));
  // vault: running at the low wall with a jump goes over it
  const v = new E.Mover({ x: 3.5 * T, y: 7.6 * T }); v.facing = -Math.PI / 2;
  let vaulted = null;
  for (let i = 0; i < 240; i++) { v.update(1 / 120, map, { move: [0, -1], jumpPressed: i === 6 }); if (v.action) vaulted = v.action.name; if (vaulted && !v.action && v.onGround) break; }
  check(`${ed}: Mover vaults a low wall at a run`, vaulted === 'vault' && v.y < 6 * T && v.z === 0, [vaulted, v.y, v.z].join(' '));
  // hop down: off B's south edge, where no roof is near to leap to
  const h = new E.Mover({ x: 9.5 * T, y: 4.6 * T, z: 44 }); h.facing = Math.PI / 2;
  let hop = null;
  for (let i = 0; i < 240; i++) { const at = !hop && map.drop(h, Math.PI / 2, { reach: 10 }); h.update(1 / 120, map, { move: [0, 1], jumpPressed: !!at }); if (h.action) hop = hop || h.action.name; if (hop && !h.action && h.onGround) break; }
  check(`${ed}: Mover hops down a ledge`, hop === 'hopDown' && h.z === 0 && h.onGround, [hop, h.y, h.z].join(' '));
  // falls: a long one hurts, a mid one at speed rolls
  const f = new E.Mover({ x: 11.5 * T, y: 6.5 * T, z: 90 }); f.onGround = false;
  let hurt = false; for (let i = 0; i < 240 && !hurt; i++) { f.update(1 / 120, map, still); hurt = f.hurt; }
  check(`${ed}: Mover: a fall from higher than hurtAt hurts`, hurt && f.fell >= 72, String(f.fell));
  const rl = new E.Mover({ x: 5 * T, y: 6.5 * T, z: 34, vx: 60 }); rl.onGround = false;
  let rolled = null; for (let i = 0; i < 240 && !rolled; i++) { rl.update(1 / 120, map, { move: [1, 0] }); if (rl.action) rolled = rl.action.name; }
  check(`${ed}: Mover: a fall past rollAt at speed rolls`, rolled === 'roll', String(rolled));
  const sf = new E.Mover({ x: 6.5 * T, y: 7.5 * T }); run(sf, .1); const safe = sf.lastSafe && sf.lastSafe.x;
  Object.assign(sf, { x: 1, y: 1 }); sf.respawn();
  check(`${ed}: Mover.respawn() goes back to the last safe spot`, safe === 6.5 * T && sf.x === 6.5 * T && sf.onGround, JSON.stringify(sf.lastSafe));
  // actions: the built-in names, your own, a paired takedown, invulnerable frames, a cancellable beat
  check(`${ed}: E.ACTIONS has climbUp, climbJump, vault, hopDown, roll, getUp, takedown`, ['climbUp', 'climbJump', 'vault', 'hopDown', 'roll', 'getUp', 'takedown'].every(n => E.ACTIONS[n]));
  // climbing any wall (climbAny): a tower of 90 in the open, 3 x 3 cells; an AI's intent climbs it ([along, -up])
  {
    const tower = new E.TileMap({ rows: ['.........', '.........', '...TTT...', '...TTT...', '...TTT...', '.........', '.........'], legend: { T: 1 }, types: { 1: { h: 90 } } });
    const go = (m, sec, ctl = still) => { for (let i = 0; i < Math.round(sec * 120); i++) m.update(1 / 120, tower, ctl); return m; };
    const w = new E.Mover({ x: 4.5 * T, y: 5.6 * T, climbAny: true }); w.facing = -Math.PI / 2;
    const plain = new E.Mover({ x: 4.5 * T, y: 5.6 * T }); plain.facing = -Math.PI / 2; go(plain, .1, { jumpPressed: true });
    go(w, 1 / 120, { jumpPressed: true }); go(w, .1); const held = !!w.wall && w.wall.ny === 1 && w.y === 5 * T + 6, rs = w.rigState();
    check(`${ed}: Mover (climbAny) takes hold of a wall too tall for a ledge with a jump press; without climbAny it jumps`, held && !plain.wall && plain.z > 2 && rs.climb === true, JSON.stringify([w.wall, w.y, plain.z, rs.climb]));
    go(w, 1, { move: [0, -1] }); const z1 = w.z; go(w, .5, { move: [1, 0] }); const x1 = w.x;
    check(`${ed}: the stick climbs up and along the face`, z1 > 30 && x1 > 4.5 * T + 8 && !!w.wall, [z1, x1].join(' '));
    go(w, 2, { move: [1, 0] });
    check(`${ed}: it rounds the corner onto the side face`, !!w.wall && w.wall.nx === 1 && w.x === 6 * T + 6, JSON.stringify([w.wall, w.x, w.y]));
    const zj = w.z; go(w, 1 / 120, { jumpPressed: true }); const leap = w.action && w.action.name; go(w, .5);
    check(`${ed}: a jump press leaps up the wall (climbJump) and it holds on after`, leap === 'climbJump' && w.z > zj + 15 && !!w.wall && !w.onGround, [leap, zj, w.z].join(' '));
    go(w, .5, { move: [0, -1] }); const pull = w.action && w.action.name; go(w, 1.2);
    check(`${ed}: near the top it pulls up (climbUp) and stands on it`, pull === 'climbUp' && w.z === 90 && w.onGround && !w.wall, [pull, w.z, w.onGround].join(' '));
    const d = new E.Mover({ x: 4.5 * T, y: 5.6 * T, climbAny: true }); d.facing = -Math.PI / 2; go(d, 1 / 120, { jumpPressed: true }); go(d, 1, { move: [0, -1] });
    go(d, 1 / 120, { crouch: true }); go(d, 1.5);
    check(`${ed}: crouch lets go, and it falls to the floor`, !d.wall && d.onGround && d.z === 0, [d.wall, d.z].join(' '));
    // gliding (glide) off the tower's top: a press in the air opens it, it sinks slowly, lands unhurt; a plain fall hurts
    const off = m => { m.facing = 0; go(m, .2); go(m, .55, { move: [1, 0] }); return m; };
    const gl = off(new E.Mover({ x: 4.5 * T, y: 3.5 * T, z: 90, glide: true }));
    go(gl, 1 / 120, { jumpPressed: true, move: [1, 0] }); go(gl, .3, { move: [1, 0] }); const open = gl.gliding, sink = gl.vz;
    let hurt = false; for (let i = 0; i < 1200 && !gl.onGround; i++) { gl.update(1 / 120, tower, { move: [1, 0] }); hurt = hurt || gl.hurt; } go(gl, .05);
    const fall = off(new E.Mover({ x: 4.5 * T, y: 3.5 * T, z: 90 })); let fh = false; for (let i = 0; i < 600; i++) { fall.update(1 / 120, tower, { move: [1, 0] }); fh = fh || fall.hurt; }
    check(`${ed}: Mover (glide): a jump press in the air opens a glide that sinks at glideSink and lands unhurt, where a plain fall hurts`, open && Math.abs(sink + gl.glideSink) < 1 && !hurt && gl.onGround && !gl.gliding && fh, JSON.stringify([open, sink, hurt, gl.onGround, gl.gliding, fh]));
    const g2 = off(new E.Mover({ x: 4.5 * T, y: 3.5 * T, z: 90, glide: true })); go(g2, 1 / 120, { jumpPressed: true }); go(g2, .2); go(g2, 1 / 120, { jumpPressed: true }); go(g2, .05);
    const up = off(new E.Mover({ x: 4.5 * T, y: 3.5 * T, z: 90, glide: true, lift: 30 })); go(up, 1 / 120, { jumpPressed: true }); go(up, .2); const z0 = up.z; go(up, .5);
    check(`${ed}: a second press closes the glide; an updraft (lift) raises it`, !g2.gliding && g2.vz < -g2.glideSink && up.gliding && up.z > z0 + 5, JSON.stringify([g2.gliding, g2.vz, up.z - z0]));
    // stamina: climbing spends it; at 0 it lets go and is exhausted, standing refills it
    const st = new E.Mover({ x: 4.5 * T, y: 5.6 * T, climbAny: true, staminaMax: 12 }); st.facing = -Math.PI / 2; go(st, 1 / 120, { jumpPressed: true });
    let out = null; for (let i = 0; i < 600 && !out; i++) { st.update(1 / 120, tower, { move: [0, -1] }); if (!st.wall) out = { z: st.z, stamina: st.stamina, exhausted: st.exhausted }; }
    go(st, 3);
    check(`${ed}: stamina: climbing spends it, at 0 it lets go (exhausted), and standing refills it`, out && out.stamina === 0 && out.exhausted && out.z > 20 && st.onGround && st.stamina === 12 && !st.exhausted, JSON.stringify([out, st.stamina, st.exhausted]));
    const W = tower.wall({ x: 4.5 * T, y: 5.6 * T, z: 0, r: 5 }, -Math.PI / 2, { reach: 12 });
    check(`${ed}: map.wall gives the face ahead: its point, normal, top and facing`, W && W.y === 5 * T && W.nx === 0 && W.ny === 1 && W.top === 90 && Math.abs(W.facing + Math.PI / 2) < 1e-9, JSON.stringify(W));
  }
  E.ACTIONS.slide = { beats: [['go', .5]], setup() {}, at: (A, b, u) => ({ x: A.start.x + 20 * u, y: A.start.y, z: 0, state: { pose: 'crouch' } }) };
  const body = { x: 10, y: 10, z: 0 }, s = new E.Action('slide', { body }); let n = 0; while (s.update(1 / 120)) n++;
  delete E.ACTIONS.slide;
  check(`${ed}: your own E.ACTIONS entry plays on any { x, y, z }`, Math.abs(s.duration - .5) < 1e-12 && body.x === 30 && s.done && n > 50 && n < 62, [s.duration, body.x, s.done, n].join(' '));
  const hero = new E.Mover({ x: 50, y: 50 }), guard = new E.Mover({ x: 62, y: 50 }); hero.facing = guard.facing = 0;
  const td = hero.play('takedown', { other: guard }); while (td.update(1 / 120));
  check(`${ed}: a takedown moves two bodies and leaves the other down`, td.other === guard && td.otherState().down === 1 && Math.hypot(guard.x - hero.x, guard.y - hero.y) < 14, JSON.stringify(td.otherState()));
  const roll = new E.Action('roll', { body: { x: 0, y: 0, z: 0 }, dir: 0, dist: 30 }), inv = [];
  while (roll.update(1 / 120)) inv.push(roll.invulnerable);
  check(`${ed}: a roll is invulnerable in its middle only`, !inv[0] && inv.includes(true) && !inv[inv.length - 1], inv.map(Number).join('').replace(/(.)\1+/g, '$1*'));
  const cu = new E.Mover({ x: 3.5 * T, y: 5.5 * T }); cu.facing = -Math.PI / 2; cu.update(1 / 120, map, { move: [0, 0], jumpPressed: true });
  check(`${ed}: a climb can be let go of while hanging (canCancel)`, cu.action && cu.action.canCancel && cu.action.beat === 'hang');
  const g = { x: 1.5 * T, y: 1.5 * T, z: 0, facing: 0 }, tgt = (x, y, o) => Object.assign({ x, y, z: 0, r: 5 }, o), noise = { x: 5.5 * T, y: 1.5 * T, z: 0, loud: 80 };
  const mind = new E.Suspicion(), states = new Set(), who = tgt(4 * T, 1.5 * T);
  for (let i = 0; i < 240; i++) states.add(mind.update(1 / 120, E.sees(g, who, { map }), who));
  check(`${ed}: E.Suspicion rises calm, notice, search, alert while it sees, and keeps where`, ['notice', 'search', 'alert'].every(x => states.has(x)) && mind.state === 'alert' && mind.last.x === who.x, [...states].join(','));
  for (let i = 0; i < 120 * 3; i++) mind.update(1 / 120, false);
  const searching = mind.state;
  for (let i = 0; i < 120 * 8; i++) mind.update(1 / 120, false);
  check(`${ed}: E.Suspicion: an alert guard that loses the target searches, then calms down`, searching === 'search' && mind.state === 'calm', searching + ' ' + mind.state);
  mind.reset(); mind.hear(1, noise);
  check(`${ed}: E.Suspicion.hear: noticed at least, never more than searching`, mind.level >= mind.notice && mind.level <= mind.search && mind.last.x === noise.x, String(mind.level));
  // jump links: from A to B the field leaps (a climb costs more than the jump); without jump it drops and climbs
  const leapField = new E.FlowField(map, { climb: 56, drop: 56, jump: 60 }), walkField = new E.FlowField(map, { climb: 56, drop: 56 });
  leapField.update(9.5 * T, 3.5 * T); walkField.update(9.5 * T, 3.5 * T);
  const nl = leapField.next(4.5 * T, 3.5 * T), nw = walkField.next(4.5 * T, 3.5 * T);
  check(`${ed}: FlowField with jump: next() leaps the gap, with edge`, nl && nl.kind === 'jump' && nl.z === 44 && nl.x === 8.5 * T && nl.edge === 8, JSON.stringify(nl));
  check(`${ed}: FlowField without jump: next() drops into the street`, nw && nw.kind === 'drop' && nw.z === 0, JSON.stringify(nw));
  check(`${ed}: FlowField with jump: a jump of k cells costs k`, leapField.d[3 * map.w + 4] === 5, String(leapField.d[3 * map.w + 4]));
}

// sight, hearing and maps built in code (both editions)
function seesAndMaps(E, ed) {
  const T = 16, map = new E.TileMap({ rows: ['##############', '#............#', '#.AAA...BBB..#', '#.AAA...BBB..#', '#.AAA...BBB..#', '#............#', '##############'],
    legend: { '#': 1, A: 2, B: 3 }, types: { 1: { h: 120 }, 2: { h: 40 }, 3: { h: 44 } } });
  // perception: in front and in range, behind, too far, behind a roof, crouched, hidden by exposure
  const g = { x: 1.5 * T, y: 1.5 * T, z: 0, facing: 0 }, tgt = (x, y, o) => Object.assign({ x, y, z: 0, r: 5 }, o);
  const seen = E.sees(g, tgt(5.5 * T, 1.5 * T), { map });
  check(`${ed}: E.sees: in front, in range: seen, exposure 1`, seen.seen && seen.exposure === 1 && seen.d === 64, JSON.stringify(seen));
  check(`${ed}: E.sees: behind or out of range: not seen`, !E.sees(Object.assign({}, g, { facing: Math.PI }), tgt(5.5 * T, 1.5 * T)).seen && !E.sees(g, tgt(12.5 * T, 1.5 * T), { range: 100 }).seen);
  const wall = { x: 1.5 * T, y: 3.5 * T, z: 0, facing: 0 };
  check(`${ed}: E.sees: not through a roof (with map), seen without it`, !E.sees(wall, tgt(5.5 * T, 3.5 * T), { map, range: 200 }).seen && E.sees(wall, tgt(5.5 * T, 3.5 * T), { range: 200 }).seen);
  const low = E.sees(g, tgt(5.5 * T, 1.5 * T, { crouch: true }), { map });
  check(`${ed}: E.sees: a crouched target shows less, a hidden one not at all`, low.seen && low.exposure < 1 && !E.sees(g, tgt(5.5 * T, 1.5 * T, { exposure: 0 }), { map }).seen, JSON.stringify(low));
  const noise = { x: 5.5 * T, y: 1.5 * T, z: 0, loud: 80 };
  check(`${ed}: E.hears: 1 at the noise, 0 beyond its radius`, E.hears(noise, noise) === 1 && E.hears(g, Object.assign({}, noise, { loud: 30 })) === 0);
  const muffled = E.hears(wall, { x: 5.5 * T, y: 3.5 * T, z: 0, loud: 100 }, map), open = E.hears(wall, { x: 5.5 * T, y: 3.5 * T, z: 0, loud: 100 });
  check(`${ed}: E.hears: a wall between halves it`, Math.abs(muffled - open / 2) < 1e-12 && open > 0, muffled + ' ' + open);
  // a map built in code
  const built = new E.TileMap({ w: 6, h: 5, types: { 2: { h: 30 } } }), v0 = built.version;
  built.fill(1, 1, 2, 2, 2);
  check(`${ed}: new E.TileMap({ w, h }) starts open; fill() puts a block in`, built.cell(0, 0) === 0 && built.cell(2, 2) === 2 && built.cell(3, 3) === 0 && built.height(1, 1) === 30 && built.version > v0);
  built.setFloor(4, 3, 'water', true); const bf = new E.FlowField(built); bf.update(4.5 * T, .5 * T);
  check(`${ed}: setFloor() tags and blocks a cell; fields go round it`, built.floorAt(4.5 * T, 3.5 * T) === 'water' && built.blocked[3 * 6 + 4] === 1 && bf.d[3 * 6 + 4] >= 1e9);
  built.fill(1, 1, 2, 2, 0); check(`${ed}: fill() with 0 clears`, built.cell(1, 1) === 0 && built.cell(2, 2) === 0);
}

// motion and presentation (the genre plan's M1, v0.62.0): tweens, scripts, paths, frames, turns, swaps, wrap-around, input
// sequences, the camera's window and framing, the weather and the transitions' names, headless
function motion(E, ed) {
  const scenes = { a: { update() {}, draw() {} }, b: { update() {}, draw() {} } };
  const game = new E.Game({ headless: true }), o = { x: 0 }; game.start({ scenes, scene: 'a' }); game.advance(1 / 120);
  const tw = game.tween(o, { x: 10 }, 1, { ease: 'linear' }); game.advance(.5); const half = o.x;
  game.paused = true; game.advance(.5); const paused = o.x; game.paused = false;
  game.timeScale = .5; game.advance(.5); const slow = o.x; game.timeScale = 1;
  game.go('b', null, { fade: 0 }); game.advance(.5);
  check(`${ed}: game.tween runs on game time: halfway at half time, still while paused, half speed in slow motion, ended by a scene change`, Math.abs(half - 5) < 1e-9 && paused === half && Math.abs(slow - 7.5) < 1e-9 && o.x === slow && tw.done, [half, paused, slow, o.x, tw.done].join(' '));
  const k = { x: 0 }, kept = game.tween(k, { x: 1 }, 1, { keep: true }); game.go('a', null, { fade: 0 }); game.advance(1.01);
  check(`${ed}: a kept tween outlives the scene and ends exactly on its values`, kept.done && k.x === 1, k.x);
  const y = { v: 0 }; let ended = 0; game.tween(y, { v: 4 }, .25, { repeat: 1, yoyo: true, onDone: () => ended++ }); game.advance(.25); const top = y.v; game.advance(.26);
  check(`${ed}: repeat and yoyo play it there and back; onDone once`, Math.abs(top - 4) < .1 && y.v === 0 && ended === 1, [top, y.v, ended].join(' '));
  const ev = [], t0 = game.time, door = { open: false }, at = () => +(game.time - t0).toFixed(4);
  const sc = game.script(function* () { ev.push(at()); yield .5; ev.push(at()); yield E.until(() => door.open); ev.push(at()); yield game.tween(o, { x: 0 }, .25); ev.push(at()); yield E.all([.1, function* () { yield .2; }]); ev.push(at()); yield E.any([10, () => true]); yield; ev.push(at()); return 'done'; });
  game.advance(.75); door.open = true; game.advance(1);
  check(`${ed}: game.script waits at each yield: seconds, E.until, a tween, E.all of a wait and a generator, E.any, a step`, ev.join() === '0,0.5,0.7583,1.0083,1.2083,1.2167' && sc.done && sc.value === 'done', ev.join());
  const late = game.script(function* () { yield 5; ev.push('late'); }); game.go('b', null, { fade: 0 }); game.advance(6);
  check(`${ed}: a script ends with the scene unless kept`, late.done && !ev.includes('late'));
  // paths
  const sq = new E.Path([[0, 0], [10, 0], [10, 10], [0, 10]], { closed: true }), p15 = sq.at(15), p45 = sq.at(45);
  check(`${ed}: E.Path: a closed square's length, its points by distance (wrapping round), headings, nearest`, sq.length === 40 && p15.x === 10 && p15.y === 5 && Math.abs(p15.angle - Math.PI / 2) < 1e-9 && p45.x === 5 && p45.y === 0 && sq.nearest(10, 4) === 14 && sq.nearest(3, -2) === 3, JSON.stringify([p15, p45]));
  const cm = new E.Path([[0, 0], [10, 0], [10, 10]], { smooth: 'catmull' }), e0 = cm.at(0), e1 = cm.at(cm.length), mid = cm.at(cm.nearest(10, 0));
  check(`${ed}: E.Path smooth: 'catmull' passes through its points, a little longer than the corner`, e0.x === 0 && e1.x === 10 && e1.y === 10 && Math.hypot(mid.x - 10, mid.y) < .5 && cm.length > 20 && cm.length < 22, cm.length);
  // frames, turns, swaps
  const c = { a: '#ff0000', b: '#00ff00' }, f1 = E.sprite(['ab'], c), f2 = E.sprite(['ba'], c), f3 = E.sprite(['aa'], c);
  const A = E.anim([f1, f2, f3], 10), P = E.anim([f1, f2, f3], 10, { pingpong: true }), O = E.anim([f1, f2, f3], 10, { loop: false });
  check(`${ed}: E.anim: frames by time, looping, ping-pong and once`, [0, .1, .2, .3].map(A.index).join() === '0,1,2,0' && [0, .1, .2, .3, .4].map(P.index).join() === '0,1,2,1,0' && O.index(5) === 2 && A.frame(.15) === f2 && A.duration === .3);
  const sheet = E.anim(E.sprite(['aabbab'], c), 8, { frames: 3 });
  check(`${ed}: E.anim cuts a sheet of frames side by side`, sheet.frames.length === 3 && sheet.frames[0].w === 2 && sheet.frames[2]._src[0][0].length === 2);
  const arrow = E.sprite(['ab.', '...', '...'], c), q = E.rotSprite(arrow, Math.PI / 2), q32 = E.rotSprite(arrow, Math.PI / 2 + .1, 32), px = (s, x, y) => { const S = s._src, ch = S[0][y][x]; return ch === '.' ? null : S[1][ch]; };
  check(`${ed}: E.rotSprite turns a sprite's pixels about its centre (a quarter turn: the top row down the right side), cached`, q.w === 3 && q.h === 3 && px(q, 2, 0) === '#ff0000' && px(q, 2, 1) === '#00ff00' && px(q, 0, 0) === null && E.rotSprite(arrow, Math.PI / 2) === q && E.rotSprite(arrow, 0) === arrow && q32 !== q, q._src[0].join('/'));
  const sw = E.recolor(f1, { '#ff0000': '#123456', b: '#abcdef' });
  check(`${ed}: E.recolor swaps colors by color or by character`, px(sw, 0, 0) === '#123456' && px(sw, 1, 0) === '#abcdef' && px(f1, 0, 0) === '#ff0000');
  check(`${ed}: E.wrap and E.wrapDiff: across the seam`, E.wrap(-1, 0, 10) === 9 && E.wrap(330, 0, 320) === 10 && E.wrap(5, 0, 10) === 5 && E.wrapDiff(9, 1, 10) === 2 && E.wrapDiff(1, 9, 10) === -2);
  check(`${ed}: E.ease has Penner's set, each from 0 to 1`, ['linear', 'inSine', 'outSine', 'inOutSine', 'inQuad', 'outQuad', 'inOutQuad', 'inCubic', 'outCubic', 'inOutCubic', 'inBack', 'outBack', 'inOutBack', 'inElastic', 'outElastic', 'inOutElastic', 'inBounce', 'outBounce', 'inOutBounce'].every(n => E.ease[n] && Math.abs(E.ease[n](0)) < 1e-9 && Math.abs(E.ease[n](1) - 1) < 1e-9));
  // input sequences: a quarter circle forward, mirrored by facing
  const g2 = new E.Game({ headless: true }), I = g2.input; g2.start({ update() {}, draw() {} }); g2.advance(1 / 120);
  let hits = [];
  const step = n => { for (let i = 0; i < n; i++) { g2.advance(1 / 120); hits.push([I.motion('236', 'attack'), I.motion('236', 'attack', { facing: -1 }), I.sequence(['up', 'up', 'down', 'attack'], { window: 2 })]); } };
  const press = (dirs, btn) => { for (const d of ['up', 'down', 'left', 'right']) I.hold(d, dirs.includes(d)); if (btn) I.tap(btn); step(3); };
  press(['down']); press(['down', 'right']); press(['right']); press(['right'], 'attack');
  const right = hits.map(h => h[0]).filter(Boolean).length, mirror = hits.some(h => h[1]); hits = []; press([]); step(80);
  press(['down']); press(['down', 'left']); press(['left']); press(['left'], 'attack');
  const left = hits.some(h => h[1]), notRight = !hits.some(h => h[0]); hits = []; press([]); step(80);
  press(['down']); press(['down', 'right']); press(['right'], 'attack');
  const same = hits.some(h => h[0]); hits = []; press([]); step(80);
  press(['down']); step(80); press(['down', 'right']); press(['right'], 'attack');
  const slowMove = hits.some(h => h[0]); hits = []; press([]);
  press(['up']); press([]); press(['up']); press([]); press(['down']); press(['down'], 'attack');
  check(`${ed}: input.motion('236', 'attack'): true on one step for a fighter facing right, mirrored for one facing left, the button allowed on the motion's last step, not when too slow`, right === 1 && !mirror && left && notRight && same && !slowMove, JSON.stringify({ right, mirror, left, notRight, same, slowMove }));
  check(`${ed}: input.sequence: a code of repeated directions; input.history in numpad notation`, hits.some(h => h[2]) && I.history.slice(-2).map(h => h.dir + ':' + h.pressed).join() === '2:,2:attack', I.history.slice(-3).map(h => h.dir + ':' + h.pressed).join());
  // the camera: a window, a height followed on landing, framing two things
  const g3 = new E.Game({ headless: true, view: 'side' }), hero = { x: 100, y: 0, z: 0, onGround: true }; g3.start({ update() {}, draw() {} });
  g3.follow(hero, { z: 0 }); g3.cam.smooth = 0; g3.cam.window = [60, 0]; g3.advance(2 / 120);
  const ax = g3.view.ax, x0 = g3.cam.x; hero.x += 10; g3.advance(2 / 120); const x1 = g3.cam.x; hero.x += 30; g3.advance(2 / 120); const x2 = g3.cam.x;   // (ax: screen pixels a world unit)
  g3.cam.window = null; g3.cam.snapY = true; g3.advance(1 / 120); const y0 = g3.cam.y; hero.onGround = false; hero.z = 30; g3.advance(1 / 120); const y1 = g3.cam.y; hero.onGround = true; g3.advance(1 / 120); const y2 = g3.cam.y;
  check(`${ed}: cam.window holds the camera while the focus moves inside it, then follows from its edge`, x1 === x0 && Math.abs(x2 - x0 - (40 * ax - 30)) < 1e-6, [x0, x1, x2, ax].join(' '));
  check(`${ed}: cam.snapY follows a jump's height only once it lands`, y1 === y0 && y2 < y0, [y0, y1, y2].join(' '));
  const g4 = new E.Game({ headless: true, view: 'side' }), a = { x: 0, y: 0, z: 0 }, b = { x: 200, y: 0, z: 0 }; g4.start({ update() {}, draw() {} });
  g4.cam.smooth = 0; g4.cam.frame([a, b]); g4.advance(2 / 120); const mid4 = g4.cam.x + g4.W / 2, want = g4.view.p(100, 0, 0)[0], z1 = g4.zoom; b.x = 1200; g4.advance(.1);
  check(`${ed}: cam.frame keeps two things in view: centred between them, zoomed out (no further than its least) as they part`, mid4 === want && z1 === 1 && g4.zoom === .5, [mid4, z1, g4.zoom].join(' '));
  // the weather headless: its own stream, the same twice; lightning flashes
  const wx = seed => { const g = new E.Game({ headless: true, view: 'iso' }); g.start({ update() {}, draw() {} }); let fl = 0; const f = g.flash.bind(g); g.flash = (...x) => { fl++; f(...x); }; g.weather = { kind: 'rain', amount: .6, lightning: 1 }; const r = Math.random; let n = 0; Math.random = () => { n++; return r(); }; g.advance(12); Math.random = r; return { calls: n, fl, drops: g._wx.drops.length, at: g._wx.drops.slice(0, 5).map(d => [d.x, d.y, d.z].map(v => v.toFixed(3)).join()).join('|') }; };
  const W1 = wx(), W2 = wx();
  check(`${ed}: game.weather: pooled drops from its own stream (never Math.random), the same twice; lightning flashes`, W1.calls === 0 && W1.at === W2.at && W1.drops === Math.round(.6 * E.WEATHER.rain.n) && W1.fl >= 2, JSON.stringify(W1));
  const g5 = new E.Game({ headless: true }); g5.start({ scenes, scene: 'a' }); g5.weather = { kind: 'snow' }; g5.go('b', null, { fade: 'iris', seconds: .2 }); g5.advance(.5);
  check(`${ed}: game.go with a transition's name goes there in its seconds; the weather ends with the scene`, g5.sceneName === 'b' && g5.weather === null, g5.sceneName + ' ' + JSON.stringify(g5.weather));
}

// the grid and gen modules (M2): paths, reaches and fields of view against known answers, square and hex; turns; a mover's
// buffered turn; the same rows from the same seed, every floor joined
// the arcade module: extra lives, two players taking turns, the continue, initials into a table, the attract mode's phases
// the rooms module (M5): from room to room on the grid (sideways keeping speed, down a hole, up into the room above), an
// edge with no room past it a wall, a gate shut until given, the explored cells, a save that loads back, the map's cells
function rooms(E, ed) {
  if (!E.World) return check(`${ed}: rooms: E.World is there`, false, 'missing');
  const was = Object.assign({}, E.store), mem = new Map();   // (Node has no storage: E.store held in memory for the test)
  Object.assign(E.store, { get: (k, f = null) => mem.has(k) ? JSON.parse(mem.get(k)) : f, set: (k, v) => (mem.set(k, JSON.stringify(v)), true), remove: k => { mem.delete(k); } });
  try {
    const g = new E.Game({ headless: true }), T = 16;
    const R = { a: { at: [0, 0], rows: ['########', '#.......', '#.......', '#.......', '#.......', '########'] },
      b: { at: [1, 0], rows: ['########', '.......G', '.......G', '.......G', '.......G', '########', '#......#', '#......#', '#......#', '#......#', '#......#', '###..###'] },
      c: { at: [1, 2], rows: ['###..###', '.......#', '.......#', '.......#', '.......#', '########'] },
      d: { at: [2, 0], kind: 'save', rows: ['########', '.......#', '.......#', '.......#', '.......#', '########'] } };
    const mk = () => new E.World(g, { id: 'contract-rooms', screen: [8, 6], legend: { '#': 1, G: 2 }, types: { 1: {}, 2: { gate: 'key' } }, rooms: R, start: 'a', transition: 'none' });
    const w = mk(), h = new E.Platformer({ x: 3 * T, z: T, w: 10, h: 28 });
    const go = (secs, c) => { let n = 0; for (let i = 0; i < secs * 120; i++) { h.update(1 / 120, w.map, typeof c === 'function' ? c(i) : c); if (w.update(1 / 120, h) === 'enter') n++; } return n; };
    let n = 0, at = null; for (let i = 0; i < 240 && !n; i++) { h.update(1 / 120, w.map, { x: 1 }); if (w.update(1 / 120, h) === 'enter') { n++; at = [w.room.id, h.x, h.vx]; } }
    check(`${ed}: rooms: walking off an open edge enters the room past it, the hero just inside and still running`, n === 1 && at[0] === 'b' && at[1] < T && at[2] > 50 && !!g.cam.bounds, JSON.stringify(at));
    go(1.5, { x: 1 });
    check(`${ed}: rooms: a gate's tiles are a wall until it is given`, w.room.id === 'b' && h.x < 8 * T - 4 && w.map.kind(7, 9) === 'solid', [w.room.id, Math.round(h.x)].join());
    w.give('key'); n = go(1, { x: 1 });
    check(`${ed}: rooms: given, its tiles go (in every room) and the hero walks on into the next`, w.has('key') && n === 1 && w.room.id === 'd' && w.room.def.kind === 'save', [n, w.room.id].join());
    w.save(h, { n: 7 });
    w.enter('b'); h.x = 3.5 * T; h.z = 3 * T; h.vx = h.vz = 0; at = null;   // (b's lower half: down its hole)
    for (let i = 0; i < 240 && !at; i++) { h.update(1 / 120, w.map, {}); if (w.update(1 / 120, h) === 'enter') at = [w.room.id, h.z, h.vz]; }
    check(`${ed}: rooms: falling through a hole in the floor enters the room below, near its top, still falling`, at && at[0] === 'c' && at[1] > 3 * T && at[2] < -50, JSON.stringify(at));
    go(1, {}); h.vz = 420; n = go(.5, {});
    check(`${ed}: rooms: rising through a hole in the ceiling enters the room above at its bottom`, w.room.id === 'b' && n === 1, [w.room.id, n, Math.round(h.z)].join());
    h.x = 3.5 * T; go(2, {}); go(2, { x: -1 });
    check(`${ed}: rooms: an open edge with no room past it is a wall`, w.room.id === 'c' && h.x >= h.w / 2 - .01 && h.x < T, [w.room.id, Math.round(h.x)].join());
    const seen = ['0,0', '1,0', '1,1', '1,2', '2,0'].every(k => w.seen.has(k));
    check(`${ed}: rooms: the cells walked through are seen; cells() lists the grid's five, the map draws and the shell's map marks the save room`, seen && w.cells().length === 5 && w.grid.w === 3 && w.grid.h === 3 && w.shellMap().markers.length === 1 && (w.drawMap(E.ctx2d(E.mkCanvas(64, 64)), 0, 0, 6), true), [[...w.seen].join(' '), w.cells().length, JSON.stringify(w.grid)].join(' | '));
    const w2 = mk(), d = w2.load();
    check(`${ed}: rooms: a save loads back: the room, the hero's place, what was got (its gates open) and seen, the extra`, d && d.room === 'd' && w2.room.id === 'd' && w2.has('key') && w2.rooms.b.map.kind(7, 9) !== 'solid' && w2.seen.has('1,0') && d.extra.n === 7 && d.x > 0, JSON.stringify(d && { room: d.room, got: d.got, extra: d.extra }));
    w2.clear(); check(`${ed}: rooms: clear() forgets it`, mk().load() === null);
  } finally { Object.assign(E.store, was); }
}

// the mode7 and road modules (M6a): a floor point projected and back at any heading and pitch, nearer is lower and
// larger, the horizon, the chase camera, a rig's view from the camera's side; the road's lap, wrap, eased curves and
// hills, what it hits, the player's place ahead
function views(E, ed) {
  if (!E.Mode7 || !E.Road) return check(`${ed}: views: E.Mode7 and E.Road are there`, false, 'missing');
  const m7 = new E.Mode7({ floor: () => [0, 0, 0], size: [64, 64] }); let worst = 0;
  for (const angle of [0, .7, Math.PI / 2, 2.5, -Math.PI / 2, -2]) for (const pitch of [6, 12, 30]) {
    m7.cam = { x: 100, y: 200, h: 40, angle, pitch, fov: 70 }; m7.begin({ W: 320, H: 180 });
    for (const [d, l] of [[30, 0], [80, -20], [300, 60]]) { const c = Math.cos(angle), s = Math.sin(angle), x = 100 + c * d - s * l, y = 200 + s * d + c * l, p = m7.project(x, y), q = p && m7.toFloor(p[0], p[1]); worst = Math.max(worst, q ? Math.hypot(q[0] - x, q[1] - y) : 1e9); }
  }
  check(`${ed}: views: mode7: a floor point projected and back, at six headings and three pitches`, worst < 1e-6, 'worst ' + worst);
  m7.cam = { x: 0, y: 0, h: 40, angle: 0, pitch: 12, fov: 70 }; m7.begin({ W: 320, H: 180 });
  const near = m7.project(50, 0), far = m7.project(400, 0), right = m7.project(100, 30), up = m7.project(100, 0, 20), low = m7.project(100, 0);
  check(`${ed}: views: mode7: ahead is the middle; nearer lower and larger; the camera's right is right; up is up`, Math.abs(near[0] - 160) < 1e-9 && near[1] > far[1] && near[2] > far[2] && right[0] > 160 && up[1] < low[1] && far[1] > m7.horizon, JSON.stringify([near, far].map(p => p.map(v => +v.toFixed(2)))));
  check(`${ed}: views: mode7: nothing above the horizon is floor, below it is; behind the camera is not on screen`, m7.toFloor(160, m7.horizon - 1) === null && m7.rowDepth(m7.horizon + 1) > 400 && m7.project(-50, 0) === null);
  const b = { x: 10, y: 20, angle: Math.PI / 2 }, cam = m7.chase(b, { back: 50, h: 30 });
  check(`${ed}: views: mode7: chase puts the camera back units behind the body, along its angle, h high`, Math.abs(cam.x - 10) < 1e-9 && Math.abs(cam.y + 30) < 1e-9 && cam.h === 30 && cam.angle === b.angle, JSON.stringify(cam));
  const yaw = a => { m7.cam = { x: 0, y: 0, h: 40, angle: a, pitch: 12 }; m7.begin({ W: 320, H: 180 }); return m7.view(.5); };
  check(`${ed}: views: mode7: a rig is seen from the camera's side (heading north: yaw 0, east: -90), at its distance's scale`, yaw(-Math.PI / 2).yawDeg === 0 && yaw(0).yawDeg === -90 && yaw(0).scale === .5 && yaw(0).pitchDeg === 12, [yaw(-Math.PI / 2).yawDeg, yaw(0).yawDeg].join());
  // the road
  const road = new E.Road({ segment: 200 }); road.add(30).add(60, { curve: 4, hill: 3000 }).add(30, { tunnel: true });
  road.place(1000, -1.5, { w: 400, draw() {} }); road.place(1000, 1.5, { w: 400, draw() {} });
  const L = 200, jumps = []; for (let k = 1; k < road.segs.length; k++) jumps.push(Math.abs(road.yAt(k * L - 1e-6) - road.yAt(k * L)));
  check(`${ed}: views: road: its lap; distance wraps; a curve eases in to its strength and out; a hill climbs smoothly to its height`, road.length === 120 * L && road.seg(-1) === road.segs[119] && road.seg(road.length + 5) === road.segs[0] && road.curveAt(30 * L) === 0 && road.curveAt(60 * L) === 4 && road.curveAt(89 * L) < 1 && Math.abs(road.segs[89].y1 - 3000) < 1e-9 && Math.max(...jumps) < 1e-3, [road.curveAt(30 * L), road.curveAt(60 * L), road.curveAt(89 * L).toFixed(2), Math.max(...jumps).toFixed(5)].join());
  check(`${ed}: views: road: a body touches the scenery beside it, not across the road; nothing is projected before a draw`, road.hits(1100, -1.4, .1).length === 1 && road.hits(1100, 0, .1).length === 0 && road.hits(3000, -1.4, .1).length === 0 && road.project(1000, 0) === null && road.ahead(1000) === 1000 * road.depth && road.segs[95].tunnel);
}

// E.Dialog's markup (M7a): what types, how long it takes, the values it reads; and which maps bake their floor in chunks
function dialogs(E, ed) {
  const game = new E.Game({ headless: true }), talk = new E.Dialog(game, { voice: null, vars: { name: 'ROWAN', town: 'Brightwater' } });
  const time = () => { let t = 0; while (talk.typing && t < 30) { talk.update(1 / 120); t += 1 / 120; } return t; };
  talk.say('Plain words, {as} they were.'); const plain = talk.pages[0][0], tp = time();
  check(`${ed}: dialogs: text without markup types as before (braces that aren't markup stay)`, plain === 'Plain words, {as} they were.' && Math.abs(tp - talk.pageLen / 50) < .02, plain + ' ' + tp.toFixed(3));
  talk.say('Take the {c=#ffd36a}gold{/c}, {$name}.'); const p1 = talk.pages[0][0], t1 = time();
  check(`${ed}: dialogs: markup and values come out of the letters typed; a color takes no time`, p1 === 'Take the gold, ROWAN.' && talk.pageLen === 21 && Math.abs(t1 - 21 / 50) < .02, p1 + ' ' + t1.toFixed(3));
  talk.say('{s=10}Slowly{/s} now.{w=.5} Then on.'); const t2 = time();
  check(`${ed}: dialogs: a run's speed and a pause take their time`, Math.abs(t2 - (6 / 10 + 13 / 50 + .5)) < .03, t2.toFixed(3));
  talk.say('Welcome to {$town}, {$name}.', { vars: { name: 'LYRA' } });
  check(`${ed}: dialogs: say's vars over the box's`, talk.pages[0][0] === 'Welcome to Brightwater, LYRA.', talk.pages[0][0]);
  game.start({ update(dt) { talk.update(dt); }, draw() {} });
  talk.say('{shake}Run!{/shake}{w=2} {wave}Now{/wave}.'); game.advance(.05); game.input.tap('confirm'); game.advance(1 / 120);
  check(`${ed}: dialogs: confirm finishes the page past its pauses; shake and wave take no letters`, !talk.typing && talk.pages[0][0] === 'Run! Now.', talk.pages[0][0] + ' ' + talk.shown);
  talk.say('A {c=#f00}long red sentence that wraps{/c} onto a second line of the box and a third one, then on to a page more of it here.');
  const all = talk.pages.map(p => p.join(' ')).join(' ');
  check(`${ed}: dialogs: marked text wraps by its letters alone`, !/[{}]/.test(all) && all.includes('long red sentence that wraps onto'), all);
  check(`${ed}: dialogs: a map of more than 128 x 128 cells bakes its floor in chunks, a smaller one whole, either on request`, ed !== 'full' || (new E.TileMap({ w: 129, h: 128 }).chunks && !new E.TileMap({ w: 128, h: 128 }).chunks && new E.TileMap({ w: 8, h: 8, chunks: true }).chunks && typeof new E.TileMap({ w: 8, h: 8 }).floorBytes === 'function'));
}

// the story module (M7b): a conversation as data, walked by confirm presses in a headless game
function stories(E, ed) {
  if (!E.Story) return check(`${ed}: stories: E.Story is there`, false, 'missing');
  const game = new E.Game({ headless: true }), seen = [];
  const story = new E.Story(game, { vars: { gold: 40 }, people: { elder: { name: 'ELDER', at: { x: 10, y: 10, z: 0 } } }, on: { gift: (st, step) => seen.push('gift'), shop: () => seen.push('shop') }, nodes: {
    start: [{ if: 'met', goto: 'again' }, { set: 'met', add: { gold: 10 } }, { who: 'elder', emote: '!', say: 'Gold: {$gold}.', choices: [{ text: 'Rich', if: 'gold >= 100', goto: 'rich' }, { text: 'Help', quest: ['q', 'A task', 'Do it'], event: 'shop', wait: true, goto: 'after' }, { text: 'Bye', goto: 'bye' }] }],
    after: [{ say: 'Thanks.', event: 'gift' }, { if: ['quest:q', '!done:q', s => s.get('gold') === 50], done: 'q' }, { end: true }, { set: 'never' }],
    again: [{ say: 'Again?' }], rich: [{ say: 'Rich!' }], bye: [{ say: 'Bye.' }] } });
  game.start({ update(dt) { story.update(dt); }, draw() {} });
  const press = (n, a = 'confirm') => { for (let i = 0; i < n; i++) { game.input.tap(a); game.advance(.3); } };
  story.run('start'); press(1);
  check(`${ed}: stories: set and add run before the line; a choice whose condition fails is left out; the balloon floats`, story.get('met') === true && story.talk.pages[0][0] === 'Gold: 50.' && story.talk.choices.join() === 'Help,Bye' && story._balloons.length === 1, JSON.stringify([story.talk.pages, story.talk.choices]));
  press(1);   // the first choice (Help): its quest, then its event holds the story
  check(`${ed}: stories: a picked choice takes its quest and calls its event, which holds the story till resume()`, story.running && seen.join() === 'shop' && story.quests[0].id === 'q' && !story.talk.open, JSON.stringify([story.running, seen, story.quests]));
  story.resume(); press(3);
  check(`${ed}: stories: resume() goes on to the choice's goto; a line's event runs after it; a list of conditions; end stops the node`, !story.running && seen.join() === 'shop,gift' && story.quests[0].done && story.get('never') === undefined && story.test('done:q'), JSON.stringify([story.running, seen, story.quests]));
  story.run('start'); press(2);
  check(`${ed}: stories: a flag set the first time sends the next talk elsewhere`, story.talk.pages[0][0] === 'Again?' || !story.running, story.talk.pages[0][0]);
  story.set('met', false); story.run('start'); press(1); press(1, 'down'); press(1);
  check(`${ed}: stories: the keys move the choice (down: Bye)`, story.node === 'bye' || seen.length === 2 && !story.quests[1], story.node);
  press(2);
  const saved = story.state(), other = new E.Story(game, { nodes: {} }); other.restore(JSON.parse(JSON.stringify(saved)));
  check(`${ed}: stories: state() and restore() keep the vars and the quests`, other.get('gold') === 60 && other.get('met') === true && other.test('done:q') && other.talk.vars === other.vars, JSON.stringify(other.state()));
  check(`${ed}: stories: conditions: comparisons, not, quests, words`, story.test('gold > 59') && story.test('gold != 3') && !story.test('gold < 10') && story.test('!never') && story.test('quest:q') && !story.test('quest:x') && (story.set('town', 'Brightwater'), story.test('town == Brightwater')));
  const n0 = story.running; story.run('nowhere');
  check(`${ed}: stories: a node that isn't there is refused (a warning), nothing runs`, !story.running && !n0);
}

// the rpg module (M7b): items, bags, members, parties, shops, damage, encounters
function rpgs(E, ed) {
  if (!E.RPG) return check(`${ed}: rpgs: E.RPG is there`, false, 'missing');
  const R = new E.RPG({ items: { potion: { name: 'Potion', kind: 'use', heal: 30, price: 10 }, ether: { name: 'Ether', kind: 'use', mp: 10, price: 30 }, anti: { name: 'Antidote', kind: 'use', cure: ['poison'] }, down: { name: 'Down', kind: 'use', revive: .5 },
    sword: { name: 'Sword', kind: 'weapon', stats: { atk: 5 }, price: 50 }, axe: { name: 'Axe', kind: 'weapon', stats: { atk: 8, spd: -1 }, price: 90 }, key: { name: 'Key', kind: 'key', price: 99 }, box: { name: 'Box', kind: 'use', size: [2, 2], stack: 1 }, gem: { name: 'Gem', kind: 'use', stack: 1 } },
    monsters: { rat: { name: 'Rat', hp: 8, atk: 4, def: 0, exp: 30, gold: 5, drops: [[1, 'potion'], [0, 'ether']] } } });
  const inv = R.inventory({ slots: 2 });
  check(`${ed}: rpgs: stacks of 99, then a new stack; a full bag adds nothing (false)`, inv.add('potion', 150) && inv.list().map(e => e.n).join() === '99,51' && !inv.add('ether') && inv.count('ether') === 0 && inv.add('potion', 48) && inv.count('potion') === 198, JSON.stringify(inv.list().map(e => [e.id, e.n])));
  check(`${ed}: rpgs: remove takes from the last stacks; more than there is is refused`, inv.remove('potion', 100) && inv.count('potion') === 98 && inv.list().length === 1 && !inv.remove('potion', 99) && inv.count('potion') === 98);
  const grid = R.inventory({ grid: [3, 2] });
  check(`${ed}: rpgs: a grid places by size, refuses overlaps, finds what covers a cell`, grid.add('box') && grid.fits('gem', 2, 0) && !grid.fits('gem', 1, 1) && grid.place('gem', 2, 1) && grid.at(1, 1).id === 'box' && !grid.add('box') && grid.add('gem') && grid.at(2, 0).id === 'gem' && !grid.add('gem'), JSON.stringify(grid.list().map(e => [e.id, e.x, e.y])));
  const hero = R.member({ name: 'Ann', stats: { hp: 40, mp: 10, atk: 10, def: 4, spd: 8 }, growth: { hp: 10, atk: 2 } }), party = R.party([hero, R.member({ name: 'Bo', stats: { hp: 30 } })], { gold: 200 });
  const ups = hero.gain(R.curve(4));
  check(`${ed}: rpgs: experience past several levels gives each level and its gains; hp grows with them`, hero.level === 4 && ups.length === 3 && ups[0].up.hp === 10 && hero.max('hp') === 70 && hero.hp === 70 && hero.next === R.curve(5) - R.curve(4), JSON.stringify(ups));
  const shop = R.shop(['sword', 'axe']); shop.buy(party, 'sword'); shop.buy(party, 'axe', 1);
  check(`${ed}: rpgs: a shop sells while the gold lasts; gear compared, worn (the old piece back in the bag) and taken off`, party.gold === 60 && !shop.buy(party, 'axe') && hero.compare('sword').atk === 5 && hero.equip('sword', party.inv) && hero.stat('atk') === 21 && JSON.stringify(hero.compare('axe')) === '{"atk":3,"spd":-1}' && hero.equip('axe', party.inv) && party.inv.has('sword') && hero.unequip('weapon', party.inv) && party.inv.has('axe') && hero.stat('atk') === 16, JSON.stringify([party.gold, hero.equipped, party.inv.list().map(e => e.id)]));
  hero.afflict('poison'); hero.afflict('haste', 2); const t1 = hero.tick(), t2 = hero.tick();
  check(`${ed}: rpgs: poison hurts each tick till cured; haste lifts spd and runs out`, t1.some(([k, d]) => k === 'poison' && d === -Math.round(70 / 16)) && hero.has('poison') && !hero.has('haste') && t2.some(([k, d]) => k === 'haste' && d === 'ends'), JSON.stringify([t1, t2]));
  hero.afflict('sleep'); const asleep = !hero.acts(); party.inv.add('anti'); party.inv.add('potion', 2); party.inv.add('down');
  check(`${ed}: rpgs: sleep keeps a member from acting; items heal, cure and revive (used up), and do nothing (kept) when there's nothing to do`, asleep && party.use('anti', hero) && !hero.has('poison') && party.use('potion', hero) && hero.hp === Math.min(70, 70 - 2 * Math.round(70 / 16) + 30) && !party.use('down', hero) && party.inv.has('down') && (party.members[1].hp = 0, party.use('down', party.members[1])) && party.members[1].hp === 15, JSON.stringify([hero.hp, party.members[1].hp]));
  party.members[1].hp = 0; const lv = party.members[1].level, won = party.reward(['rat', 'rat']);
  check(`${ed}: rpgs: a reward: the troop's exp to the living alone, its gold, the drops that came (chance 1, not 0)`, won.exp === 60 && won.gold === 10 && won.items.join() === 'potion,potion' && party.members[1].level === lv && hero.exp >= R.curve(4) + 60, JSON.stringify(won));
  party.rest(); check(`${ed}: rpgs: rest brings every member back, effects gone`, party.members.every(m => m.hp === m.max('hp') && m.mp === m.max('mp') && !Object.keys(m.effects).length));
  const g0 = party.gold; check(`${ed}: rpgs: a key item doesn't sell; others sell for half`, party.inv.add('key') && !shop.sell(party, 'key') && shop.worth('axe') === 45 && shop.sell(party, 'axe') && party.gold === g0 + 45);
  let lo = 1e9, hi = 0, crit = 0; for (let i = 0; i < 400; i++) { const d = R.damage({ atk: 20 }, { def: 10 }, { crit: .2 }); if (d.crit) crit++; else { lo = Math.min(lo, d.hp); hi = Math.max(hi, d.hp); } }
  const g = R.damage({ atk: 20 }, { def: 10 }, { crit: 0, guard: true }).hp, m = R.damage({ mag: 30, atk: 1 }, { mag: 10, def: 99 }, { kind: 'mag' }).hp;
  check(`${ed}: rpgs: damage: attack less half the defense, a tenth either way; crits; guard halves; magic against magic`, lo >= 13 && hi <= 17 && crit > 40 && crit < 130 && g >= 6 && g <= 9 && m >= 22 && m <= 28, JSON.stringify({ lo, hi, crit, g, m }));
  const enc = R.encounters({ field: { every: [10, 20], troops: [[1, ['rat']], [1, ['rat', 'rat']]] }, town: null }); let n = 0, kinds = new Set();
  for (let i = 0; i < 2000 * 16; i++) { const t = enc.walk('field', 1); if (t) { n++; kinds.add(t.length); } }
  check(`${ed}: rpgs: encounters: one every 10 to 20 cells walked, from the zone's troops; none where there is no zone`, n >= 99 && n <= 201 && kinds.size === 2 && enc.walk('town', 1e6) === null && enc.walk('nowhere', 1e6) === null, n + ' in 2000 cells');
  const back = R.restore(JSON.parse(JSON.stringify(party.state())));
  check(`${ed}: rpgs: a party saved and restored: members, levels, gear, the bag, the gold`, back.members[0].level === hero.level && back.members[0].stat('atk') === hero.stat('atk') && back.inv.count('potion') === party.inv.count('potion') && back.gold === party.gold && back.members[1].name === 'Bo', JSON.stringify(back.state()).slice(0, 200));
}

// the drive module (M6b): a car's speed, grip and slide, a kart's drift and its boost, the ground that slows it, walls and
// cars it bounces off; a race's laps through its checkpoints (a shortcut counts nothing), the wrong way, the places, and
// drivers that finish three laps round an oval without sticking
function drive(E, ed) {
  if (!E.Car || !E.Race) return check(`${ed}: drive: E.Car and E.Race are there`, false, 'missing');
  const run = (car, map, secs, it) => { for (let i = 0; i < secs * 120; i++) car.update(1 / 120, map, typeof it === 'function' ? it(i) : it); return car; };
  const open = new E.TileMap({ w: 120, h: 120 }), top = 200;
  const a = run(new E.Car({ x: 100, y: 1000, angle: 0, top }), open, 4, { gas: 1 });
  check(`${ed}: drive: a car reaches its top speed along its heading, no slide`, Math.abs(a.speed - top) < 2 && Math.abs(a.y - 1000) < .01 && Math.abs(a.slide) < .01, [a.speed.toFixed(1), a.y.toFixed(2)].join());
  let worst = 0; run(a, open, 2, i => (worst = Math.max(worst, Math.abs(a.slide) / Math.max(1, a.speed)), { gas: 1, steer: 1 }));
  const turned = a.angle;
  check(`${ed}: drive: steering at speed it turns, grip keeping its slide small`, turned > 2 && worst < .25, [turned.toFixed(2), worst.toFixed(3)].join());
  const k = run(new E.Car({ x: 100, y: 1000, angle: 0, top, kart: true }), open, 3, { gas: 1 }); let drifted = 0, slide = 0;
  run(k, open, 1.2, i => { if (k.drifting) drifted++; slide = Math.max(slide, Math.abs(k.slide)); return { gas: 1, steer: 1, drift: true }; });
  const charge = k.charge, held = k.drifting, kv = k.speed; run(k, open, 1 / 60, { gas: 1, steer: 1 });
  check(`${ed}: drive: a kart hops into a drift, slides wide keeping its speed, and letting go of a charged drift boosts it`, drifted > 100 && held === 1 && slide > 25 && kv > top * .5 && charge >= 1 && k.boostT > 0 && !k.drifting, [drifted, slide.toFixed(1), kv.toFixed(1), charge.toFixed(2), k.boostT.toFixed(2)].join());
  const grass = new E.TileMap({ w: 120, h: 120, floor: new Array(120 * 120).fill('grass') }), g = run(new E.Car({ x: 100, y: 1000, angle: 0, top }), grass, 4, { gas: 1 });
  check(`${ed}: drive: grass holds it to half its top speed (off-road)`, g.offroad && g.surface === 'grass' && Math.abs(g.speed - top * .5) < 2, [g.surface, g.speed.toFixed(1)].join());
  const walled = new E.TileMap({ rows: ['##########', '#........#', '#........#', '##########'], legend: { '#': 1 }, types: { 1: { h: 30 } } }), w = run(new E.Car({ x: 40, y: 32, angle: 0, top }), walled, 3, { gas: 1 });
  check(`${ed}: drive: a wall stops it (bumped, kept out)`, w.x < 9 * 16 - w.r + .5 && Math.abs(w.speed) < 40, [w.x.toFixed(1), w.speed.toFixed(1)].join());
  const c1 = new E.Car({ x: 100, y: 100 }), c2 = new E.Car({ x: 108, y: 100 }); c1.vx = 50; E.Car.collide([c1, c2]);
  check(`${ed}: drive: two cars that touch are bumped apart, the speed shared`, c2.x - c1.x >= c1.r + c2.r - .01 && c2.vx > 0 && c1.vx < 50 && c1.bumped && c2.bumped, [c1.x.toFixed(1), c2.x.toFixed(1), c1.vx.toFixed(1), c2.vx.toFixed(1)].join());
  if (!E.Path) return;   // (the races: the full engine, which has E.Path)
  const pts = []; for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; pts.push([480 + Math.cos(t) * 360, 480 + Math.sin(t) * 240]); }
  const path = new E.Path(pts, { closed: true, smooth: 'catmull' }), N = 60, T = 16, cells = [];
  for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) { const x = (cx + .5) * T, y = (cy + .5) * T, p = path.at(path.nearest(x, y)); cells.push(Math.hypot(p.x - x, p.y - y) > 80 ? 1 : 0); }
  const oval = new E.TileMap({ w: N, h: N, cells, types: { 1: { h: 30 } } }), L = path.length;
  // a lap by hand: placed round the line in order counts; jumped across from a quarter to the end counts nothing
  const lapRace = new E.Race({ path, laps: 2, countdown: 0 }), hand = lapRace.add(new E.Car(lapRace.grid(1)[0]), { input: { move: () => [0, 0], down: () => false, pressed: () => false } });
  const put = d => { const p = path.at(d); Object.assign(hand.car, { x: p.x, y: p.y, angle: p.angle, vx: 0, vy: 0 }); lapRace.update(1 / 120, oval); };
  for (let d = 0; d <= L + 30; d += 20) put(d);
  const one = hand.lap; put(L + L * .25); put(L * 2 - 10); put(L * 2 + 5);
  check(`${ed}: drive: race: a lap round the line through every checkpoint counts; a shortcut across counts nothing`, one === 1 && hand.lap === 1 && hand.times.length === 1, [one, hand.lap].join());
  const back = lapRace.add(new E.Car({ x: path.at(L / 2).x, y: path.at(L / 2).y, angle: path.at(L / 2).angle + Math.PI }), { input: { move: () => [0, 0], down: a2 => a2 === 'gas', pressed: () => false } });
  for (let i = 0; i < 160; i++) lapRace.update(1 / 120, oval);
  check(`${ed}: drive: race: driving against the line says WRONG WAY`, back.wrong && !hand.wrong);
  // six drivers, three laps
  const race = new E.Race({ path, laps: 3 }), was = Math.random; Math.random = E.rng(3);
  try {
    race.grid(6).forEach((p, i) => race.add(new E.Car(Object.assign({ kart: true, top: 200 + i * 4, r: 8 }, p)), { name: 'K' + i }));
    let t = 0, stuck = 0; while (!race.over && t < 200) { race.update(1 / 120, oval); t += 1 / 120; for (const R of race.racers) stuck = Math.max(stuck, R._stuck); }
    const places = race.racers.map(R => R.place).sort().join();
    check(`${ed}: drive: race: six drivers finish three laps round an oval, none stuck, every place given once`, race.over && race.results.length === 6 && race.racers.every(R => R.lap === 3 && R.times.length === 3) && stuck < 1.2 && places === '1,2,3,4,5,6' && race.results[0].place === 1, [t.toFixed(1), stuck.toFixed(2), places].join(' | '));
  } finally { Math.random = was; }
}

// the Platformer's further moves (section 16c), each on a small map of its own, driven by intents step by step
function traversal(E, ed) {
  const T = 16, map = (rows, types = {}) => new E.PlatformMap({ rows, legend: { '#': 1, w: 2, r: 3, b: 4, i: 5, c: 6, s: 7, x: 8, '/': 9 }, types: Object.assign({ 1: {}, 2: { kind: 'water' }, 3: { kind: 'rope' }, 4: { kind: 'bars' }, 5: { friction: .15 }, 6: { carry: 40 }, 7: { bounce: 520 }, 8: { crumble: .3, respawn: 1 }, 9: { kind: 'slope', dir: -1 } }, types) });
  const hero = (lv, cx, cz, o) => { const h = new E.Platformer(Object.assign({ x: (cx + .5) * T, z: cz * T, w: 10, h: 28 }, o)); for (let i = 0; i < 20; i++) h.update(1 / 120, lv, {}); return h; };
  const run = (lv, h, secs, fn) => { for (let i = 0; i < Math.round(secs * 120); i++) { h.update(1 / 120, lv, fn ? fn(i) : {}); if (lv.update) lv.update(1 / 120); } return h; };
  const floor = n => '#'.repeat(n);
  // defaults: none of it happens without its option
  { const lv = map(['#..........#', '#..........#', '#..........#', '#....#.....#', floor(12)]), h = hero(lv, 3, 1);
    run(lv, h, .5, () => ({ down: true, x: 1 }));
    check(`${ed}: traversal: without its options a hero neither crouches nor clings nor hangs`, !h.crouching && !h.clinging && !h.hanging && h.h === 28, [h.crouching, h.h].join()); }
  // crouch: half as tall, it crawls under a one-tile gap a standing hero can't enter
  { const rows = ['#..............#', '#..............#', '#..............#', '#.....######...#', '#..............#', floor(16)];
    const a = hero(map(rows), 2, 1, { crouch: true }), b = hero(map(rows), 2, 1);
    run(map(rows), a, 2.5, () => ({ down: true, x: 1 })); const la = map(rows); const a2 = hero(la, 2, 1, { crouch: true }); run(la, a2, 2.5, () => ({ down: true, x: 1 }));
    const lb = map(rows); const b2 = hero(lb, 2, 1); run(lb, b2, 2.5, () => ({ x: 1 }));
    check(`${ed}: traversal: crouch halves the box and crawls under a one-tile gap; standing it can't get in`, a2.crouching && a2.h === 14 && a2.x > 8 * T && b2.x < 6 * T, [a2.h, Math.round(a2.x), Math.round(b2.x)].join()); }
  // ledge: falling past a ledge it catches it, up climbs onto it
  { const lv = map(['#.........#', '#.........#', '#.........#', '#.....####.', '#.....####.', '#.....####.', floor(11)]), h = hero(lv, 1, 1, { ledge: true });
    h.x = 6 * T - 6; h.z = 4 * T - 18; h.vz = 0; h.onGround = false; let hung = false;
    run(lv, h, .8, () => { hung = hung || !!h.hanging; return { x: 1 }; });
    const hang = !!h.hanging; run(lv, h, .7, () => ({ up: true }));
    check(`${ed}: traversal: a ledge caught falling past it, then up climbs onto it`, hung && hang && !h.hanging && h.onGround && Math.abs(h.z - 4 * T) < .5 && h.x > 6 * T, [hung, hang, Math.round(h.z), Math.round(h.x)].join()); }
  // wallCling: pressed against a wall in the air it holds; jump leaps off it
  { const lv = map(['#........#', '#........#', '#........#', '#........#', '#........#', '#........#', floor(10)]), h = hero(lv, 7, 1, { wallCling: true });
    run(lv, h, .05, () => ({ x: 1, jump: true, jumpPressed: true })); run(lv, h, .3, () => ({ x: 1, jump: true }));
    const z0 = h.z, held = h.clinging; run(lv, h, .5, () => ({ x: 1 })); const z1 = h.z;
    run(lv, h, .1, i => ({ x: 1, jump: true, jumpPressed: i === 0 }));
    check(`${ed}: traversal: wallCling holds on a wall without sliding; jump leaps away`, held === 1 && Math.abs(z1 - z0) < .01 && !h.clinging && h.vx < 0, [held, Math.round(z0), Math.round(z1), Math.round(h.vx)].join()); }
  // water: it swims (slow sinking), a jump at the surface leaps out
  { const lv = map(['#........#', '#........#', '#........#', '#wwwwwwww#', '#wwwwwwww#', '#wwwwwwww#', floor(10)]), h = hero(lv, 4, 6);
    run(lv, h, 1); const swim = h.swimming, sinkV = h.vz; run(lv, h, 1.5, () => ({ up: true })); const atTop = h.z;
    let peak = 0; run(lv, h, .8, i => { peak = Math.max(peak, h.z); return { jump: true, jumpPressed: i === 0 }; });
    check(`${ed}: traversal: in water it swims (sinking slowly), rises, and a jump at the surface leaps out`, swim && sinkV > -40 && peak > 4 * T + 8, [swim, Math.round(sinkV), Math.round(atTop), Math.round(peak)].join()); }
  // the ground's grip: ice slides farther, a conveyor carries, a spring throws it up, a crumbling block falls away and returns
  { const slide = row => { const lv = map(['#..................#', '#..................#', row]), h = hero(lv, 2, 1); run(lv, h, .6, () => ({ x: 1 })); const x0 = h.x; run(lv, h, 1.5); return h.x - x0; };
    const ice = slide('#iiiiiiiiiiiiiiiiii#'), rock = slide(floor(20));
    const lc = map(['#........#', '#........#', '#cccccccc#']), hc = hero(lc, 2, 1), x0 = hc.x; run(lc, hc, 1);
    const ls = map(['#........#', '#........#', '#........#', '#........#', '#ssssssss#']), hs = hero(ls, 4, 3); let peak = 0, sprung = false; run(ls, hs, 1.2, () => { peak = Math.max(peak, hs.z); sprung = sprung || hs.sprung; return {}; });
    const lx = map(['#........#', '#........#', '#...x....#', '#........#', floor(10)]), hx = hero(lx, 4, 3); run(lx, hx, .5); const fell = lx.cell(4, 2) === 0 && hx.z < 2 * T; run(lx, hx, 1.2); const back = lx.cell(4, 2) === 8;
    check(`${ed}: traversal: ice slides farther, a conveyor carries, a spring throws it high, a crumbling block falls away and comes back`, ice > rock * 3 && Math.abs(hc.x - x0 - 40) < 6 && sprung && peak > T * 4 + 100 && fell && back, [Math.round(ice), Math.round(rock), Math.round(hc.x - x0), sprung, Math.round(peak), fell, back].join()); }
  // a rope: up grabs and climbs it; jump leaves it
  { const lv = map(['#....r....#', '#....r....#', '#....r....#', '#....r....#', '#....r....#', floor(11)]), h = hero(lv, 5, 1);
    run(lv, h, .8, () => ({ up: true })); const on = h.onRope, z = h.z; run(lv, h, .1, i => ({ x: 1, jump: true, jumpPressed: i === 0 }));
    check(`${ed}: traversal: up grabs a rope and climbs it hand over hand; jump leaves it sideways`, on && z > T * 2 && !h.onRope && h.vx > 0, [on, Math.round(z), Math.round(h.vx)].join()); }
  // bars: rising into them it hangs and travels under them; down lets go
  { const lv = map(['##########', '#bbbbbbbb#', '#........#', '#........#', '#........#', floor(10)]), h = hero(lv, 2, 1);
    run(lv, h, .5, i => ({ jump: true, jumpPressed: i === 0 })); const on = !!h.onBars, z0 = h.z, x0 = h.x; run(lv, h, .6, () => ({ x: 1, jump: true }));
    const moved = h.x - x0, z1 = h.z; run(lv, h, .3, () => ({ down: true }));
    check(`${ed}: traversal: a jump into bars hangs from them, travels along them at one height, down lets go`, on && moved > 15 && Math.abs(z1 - z0) < .01 && !h.onBars, [on, Math.round(moved), Math.round(z0), Math.round(z1)].join()); }
  // swingFrom: a pendulum that pumping grows; jump lets go at its speed
  { const lv = map(['#..................#', '#..................#', '#..................#', '#..................#', '#..................#', '#..................#', '#..................#', floor(20)]), h = hero(lv, 8, 1);
    h.z = 3 * T; h.onGround = false; h.swingFrom(10 * T, 7 * T); let lo = 1e9, hi = -1e9;
    run(lv, h, 3, i => { lo = Math.min(lo, h.x); hi = Math.max(hi, h.x); return { x: Math.cos(i / 120 * 3.6) > 0 ? 1 : -1 }; });
    const span = hi - lo; for (let i = 0; i < 240 && Math.abs(h.x - 10 * T) > 3; i++) run(lv, h, 1 / 120);   // let go passing under the point
    let fly = 0; run(lv, h, .1, i => { if (i === 2) fly = h.vx; return { jump: true, jumpPressed: i === 0 }; });
    check(`${ed}: traversal: swingFrom swings across under its point, pumping widens it, jump lets go with its speed`, lo < 10 * T && hi > 10 * T && span > 40 && !h.swinging && Math.abs(fly) > 20 && Math.abs(h.vx - fly) < 1, [Math.round(lo), Math.round(hi), Math.round(fly), Math.round(h.vx)].join()); }
  // momentum: downhill it gains past its run speed; down while still and jump charge a dash
  { const rows = ['#.....................#', '#.....................#', '#/....................#', '##/...................#', '###/..................#', '####/.................#', '#####/................#', floor(23)];
    const lv = map(rows), h = hero(lv, 1, 6, { momentum: true }); let top = 0; run(lv, h, 1.4, () => { top = Math.max(top, Math.abs(h.vx)); return { x: 1 }; });
    const lf = map(['#..................#', floor(20)]), f = hero(lf, 2, 1, { momentum: true }); let ftop = 0; run(lf, f, 1.4, () => { ftop = Math.max(ftop, Math.abs(f.vx)); return { x: 1 }; });
    const ld = map(['#..................#', floor(20)]), d = hero(ld, 2, 1, { momentum: true }); run(ld, d, .4, i => ({ down: true, jump: true, jumpPressed: i % 12 === 0 })); const charged = d.charge; run(ld, d, .05);
    check(`${ed}: traversal: with momentum a slope downhill takes it past its run speed; a charged dash goes faster still`, top > h.run * 1.15 && ftop <= f.run + .5 && charged > .5 && d.rolling && Math.abs(d.vx) > d.run * 1.4, [Math.round(top), Math.round(ftop), charged.toFixed(2), Math.round(d.vx)].join()); }
  // the rig's poses: prone, level, and hung at an angle
  { const r = new E.Humanoid({ size: 1, build: 'heroic' }), at = st => { for (let i = 0; i < 60; i++) r.update(1 / 60, Object.assign({ x: 0, y: 0, z: 0 }, st)); return { head: r.J.head.slice(), hip: r.J.hipC.slice(), hand: r.J.handR.slice(), foot: r.J.footR.slice() }; };
    const stand = at({}), crawl = at({ crawl: true, vx: 20, vy: 0 }), swim = at({ swim: true }), swing = at({ swing: .8 });
    check(`${ed}: traversal: the rig crawls prone, swims level and hangs at a swing's angle`, crawl.head[2] < stand.head[2] * .45 && Math.abs(swim.head[2] - swim.hip[2]) < 6 && swim.head[0] > 6 && swing.hand[2] > swing.head[2] && Math.abs(swing.foot[0] - swing.hand[0]) > 6, [crawl.head[2].toFixed(1), stand.head[2].toFixed(1), (swim.head[2] - swim.hip[2]).toFixed(1), swim.head[0].toFixed(1), (swing.foot[0] - swing.hand[0]).toFixed(1)].join()); }
}

// the grid's tactics helpers (M8): reach over heights (climb, drop) past allies (pass), shapes of effect, facing and where a
// blow lands, a side's threat map
function tactics(E, ed) {
  const H = { '2,0': 8, '3,0': 24, '2,1': 8 }, g = new E.Grid(6, 4, { height: (x, y) => H[x + ',' + y] || 0 });
  const climb = g.reach([0, 0], 4, { climb: 8, drop: 16 }), low = g.reach([0, 0], 4, { climb: 0, drop: 0 });
  check(`${ed}: E.Grid.reach over heights: a step of 8 climbed, 24 not; with no climb, every raised cell left out`, climb.has([2, 0]) && !climb.has([3, 0]) && climb.has([3, 1]) && !low.has([2, 0]) && !low.has([2, 1]) && low.has([1, 2]), climb.cells.length + ' ' + low.cells.length);
  const pass = g.reach([0, 3], 3, { pass: (x, y) => x === 1 && y === 3, climb: 8 }), wall = g.reach([0, 3], 3, { blocked: (x, y) => x === 1 && y === 3, climb: 8 });
  check(`${ed}: E.Grid.reach pass: an ally's cell crossed (the cells past it reached, its path through it) but not stopped on`, !pass.has([1, 3]) && pass.has([3, 3]) && pass.path([2, 3]).length === 3 && !wall.has([3, 3]));
  const q = new E.Grid(9, 9), shp = (k, n, d) => q.shape([4, 4], k, n, d).map(c => c.join()).sort().join(' ');
  check(`${ed}: E.Grid.shape: a cross, a diamond, a square, a ring, a line and a cone, kept on the grid`, q.shape([4, 4], 'cross', 2).length === 9 && q.shape([4, 4], 'diamond', 2).length === 13 && q.shape([4, 4], 'square', 1).length === 9 && q.shape([4, 4], 'ring', 2).length === 8 && shp('line', 3, [0, -1]) === '4,1 4,2 4,3' && shp('cone', 2, [1, 0]) === '5,4 6,3 6,4 6,5' && q.shape([0, 0], 'diamond', 1).length === 3, shp('cone', 2, [1, 0]));
  check(`${ed}: E.Grid.face and side: a unit turns to its target; a blow from behind, the side, a diagonal and the front`, q.face([0, 0], [3, 1]).join() === '1,0' && q.face([0, 0], [1, -3]).join() === '0,-1' && q.side([4, 4], [1, 0], [3, 4]) === 'back' && q.side([4, 4], [1, 0], [4, 6]) === 'side' && q.side([4, 4], [1, 0], [5, 5]) === 'side' && q.side([4, 4], [1, 0], [6, 4]) === 'front');
  const t = q.threat([{ cx: 0, cy: 0, move: 2, range: 1 }, { cx: 8, cy: 8, move: 1, range: [2, 3] }], { blocked: (x, y) => x === 1 && y === 0 });
  check(`${ed}: E.Grid.threat: each unit's move then its range (a bow's least range kept), blocked cells walked round, who threatens a cell`, t.count([0, 3]) === 1 && t.count([2, 1]) === 1 && t.count([4, 0]) === 0 && t.count([8, 8]) === 0 && t.count([6, 8]) === 1 && t.by([5, 8])[0].cx === 8, [t.count([0, 3]), t.count([2, 1]), t.count([4, 0]), t.count([8, 8]), t.count([6, 8])].join());
}

// M11a: the physics module (no tunnelling at twice a ball's top speed, the same world at any rate, its parts) and the
// terrain module (carving, the ground, walkers)
function physicsToys(E, ed) {
  // a box split by a wall down its middle; flippers swinging in the left half, bumpers; balls fired from the left half at
  // twice the table's top speed (1,600 px/s) in 48 directions: none ever leaves the left half
  const TOP = 1600; let escaped = 0, shots = 0;
  for (let k = 0; k < 48; k++) {
    const w = new E.Physics({ gravity: [0, 300] }); w.chain([[0, 0], [200, 0], [200, 200], [0, 200]], { closed: true }); w.segment([100, 0], [100, 200]);
    const L = w.flipper(20, 150, { side: 'left', len: 30 }), R = w.flipper(80, 150, { side: 'right', len: 30 }); w.bumper(50, 60, 8);
    const a = k / 48 * Math.PI * 2, b = w.circle(50, 110, 4, { bullet: true, bounce: .6, vx: Math.cos(a) * TOP * 2, vy: Math.sin(a) * TOP * 2 });
    for (let i = 0; i < 120; i++) { if (i % 10 === 0) { L.flip(i % 20 === 0); R.flip(i % 20 !== 0); } w.step(1 / 120); shots++; if (b.x < -1 || b.x > 101 || b.y < -1 || b.y > 201) { escaped++; break; } }
  }
  check(`${ed}: physics: a ball at twice its top speed (3,200 px/s) never passes through a wall, a thin segment or a swinging flipper (48 directions, a second each)`, !escaped, `${escaped} of 48 escaped`);
  { let through = 0; for (let k = 0; k < 24; k++) { const w = new E.Physics(), F = w.flipper(40, 100, { side: 'left', len: 40, rest: 0, up: 0 }), x = 44 + k % 6 * 6, a = (k / 24 - .5) * 1.2, b = w.circle(x - Math.sin(a) * 80, 20, 4, { bullet: true, vx: Math.sin(a) * TOP * 2, vy: Math.cos(a) * TOP * 2 }); for (let i = 0; i < 24; i++) w.step(1 / 120); if (b.y > 100) through++; }
    check(`${ed}: physics: a ball at twice its top speed thrown at a flipper's face from 24 angles bounces off it, never through`, !through, `${through} went through`); }
  // a table's world at 60, 90, 120 and 144 Hz: flippers on the game clock, bumpers, a kicker, three balls
  const table = hz => {
    const g = new E.Game({ headless: true }), w = new E.Physics({ gravity: [0, 500] });
    w.chain([[0, 0], [160, 0], [160, 240], [0, 240]], { closed: true, r: 1 }); w.arc(80, 60, 70, Math.PI, Math.PI * 2);
    const L = w.flipper(45, 210, { side: 'left' }), R = w.flipper(115, 210, { side: 'right' }); w.bumper(60, 90, 9); w.bumper(100, 90, 9); w.kicker(140, 150, { dir: [-.4, -1], power: 600 });
    const balls = [30, 80, 130].map(x => w.circle(x, 40, 5, { bullet: true, bounce: .4 }));
    g.start({ update(dt) { const t = g.time; L.flip(t % 1 < .25); R.flip((t + .5) % 1 < .25); w.step(dt); }, draw() {} });
    for (let t = 0; t < 3 - 1e-9; t += 1 / hz) g.advance(1 / hz);
    return w.hash() + ' ' + balls.map(b => Math.round(b.x) + ',' + Math.round(b.y)).join(' ');
  };
  const H = [60, 90, 120, 144].map(table);
  check(`${ed}: physics: the same table (flippers, bumpers, a kicker, three balls) gives the same world at 60, 90, 120 and 144 Hz`, new Set(H).size === 1, H.join(' / '));
  // bounces, friction, a stack, layers, sensors, a kicker, a bumper's kick, a kinematic paddle, ray and query
  { const w = new E.Physics({ gravity: [0, 600] }); w.segment([0, 300], [400, 300]); const b = w.circle(100, 100, 5, { bounce: 1, bullet: true }); let hit = false, top = 1e9; for (let i = 0; i < 400; i++) { w.step(1 / 120); if (b.vy < 0) hit = true; if (hit) top = Math.min(top, b.y); }
    const f = new E.Physics({ gravity: [0, 600] }); f.segment([0, 300], [900, 300]); const s1 = f.box(50, 290, 20, 20, { vx: 300, friction: .5 }), s0 = f.box(50, 250, 20, 20, { vx: 300, friction: 0 }); f.segment([0, 260], [900, 260], { layer: 2 }); s0.mask = 0xffff; for (let i = 0; i < 240; i++) f.step(1 / 120);
    check(`${ed}: physics: a bounce of 1 rebounds to its height; friction stops a sliding box, none lets one slide on`, top < 103 && s1.vx < 1 && s0.vx > 250, `rebound to ${top.toFixed(1)} of 100; boxes ${s1.vx.toFixed(1)}, ${s0.vx.toFixed(1)} px/s`); }
  { const w = new E.Physics({ gravity: [0, 500] }); w.segment([0, 300], [400, 300]); const bs = [0, 1, 2].map(i => w.box(200 + i * 2, 280 - i * 22, 30, 20)); for (let i = 0; i < 600; i++) w.step(1 / 120);
    check(`${ed}: physics: a stack of three boxes settles upright and sleeps`, bs.every(b => b.sleeping && Math.abs(b.angle) < .05) && Math.abs(bs[2].y - 250) < 2, bs.map(b => [b.y.toFixed(1), b.angle.toFixed(3), b.sleeping]).join(' ')); }
  { const w = new E.Physics({ gravity: [0, 400] }), ev = []; w.on = { enter: (s, b) => ev.push('in'), exit: (s, b) => ev.push('out') }; w.segment([0, 100], [200, 100], { layer: 2 }); w.segment([0, 300], [200, 300]); w.circle(100, 200, 20, { type: 'static', sensor: true });
    const a = w.circle(60, 50, 5, { mask: 1 }), b = w.circle(140, 50, 5); for (let i = 0; i < 240; i++) w.step(1 / 120);
    check(`${ed}: physics: layers (a ball whose mask leaves out layer 2 falls through its floor, another stands on it); a sensor reports in and out`, a.y > 290 && b.y < 100 && ev.length === 0, `${a.y.toFixed(0)}, ${b.y.toFixed(0)}; ${ev}`);
    const c = w.circle(100, 150, 5, { vx: 0 }); for (let i = 0; i < 240; i++) w.step(1 / 120);
    check(`${ed}: physics: a ball falling through a sensor sets off enter, then exit`, ev.join() === 'in,out', ev.join()); }
  { const w = new E.Physics({ gravity: [0, 400] }), caught = []; w.on = { catch: (k, b) => caught.push(b.id) }; const k = w.kicker(100, 150, { hold: .5, dir: [0, -1], power: 500 }); const b = w.circle(100, 100, 4); let held = 0, up = 0;
    for (let i = 0; i < 120; i++) { w.step(1 / 120); if (b.held) held++; if (b.vy < -400) up++; }
    const w2 = new E.Physics(), bm = w2.bumper(100, 100, 10, { kick: 300 }), ball = w2.circle(100, 40, 4, { vy: 200, bounce: .5 }); for (let i = 0; i < 60; i++) w2.step(1 / 120);
    check(`${ed}: physics: a kicker catches a ball, holds it half a second and fires it; a bumper sends a ball (at 200 px/s) off at its kick (300)`, caught.length === 1 && held >= 58 && held <= 62 && up > 0 && Math.abs(-ball.vy - 300) < 2, `held ${held} steps, fired ${up > 0}; bumper ${ball.vy.toFixed(0)} px/s`); }
  { const w = new E.Physics(), p = w.box(100, 200, 40, 8, { type: 'kinematic' }), b = w.circle(160, 200, 5, { friction: 0 }); p.moveTo(180, 200, 0, 200); for (let i = 0; i < 120; i++) w.step(1 / 120);
    const hit = w.ray([0, 200], [400, 200]), q = w.query(p.x, p.y);
    check(`${ed}: physics: a kinematic paddle reaches its goal and pushes a ball ahead of it; ray finds the nearest, query what is there`, Math.abs(p.x - 180) < .01 && b.x > 190 && hit && hit.body === p && q[0] === p, `paddle ${p.x.toFixed(2)}, ball ${b.x.toFixed(1)}, ray ${hit && hit.body.id}, query ${q.map(o => o.id)}`); }
  // the terrain: carving, adding, polygons, the ground, normals, hits, a ray, walkers, a physics ball on it
  const land = new E.Terrain({ w: 300, h: 120, materials: [{ color: '#8a5a34' }, { color: '#606070', hard: true }] });
  land.fill((x, y) => y < 50 ? (y < 10 ? 2 : 1) : 0);
  const before = land.cells.reduce((a, c) => a + (c ? 1 : 0), 0), took = land.carve(150, 50, 20), after = land.cells.reduce((a, c) => a + (c ? 1 : 0), 0);
  check(`${ed}: terrain: a carve takes the cells within its radius and no others`, before - after === took[1] && took[1] > 600 && took[1] < 640 && !land.solid(150, 40) && land.solid(150, 25) && land.solid(125, 45), `${before - after} cells (half a disc of 20: ~628)`);
  land.carve(150, 10, 15); land.add(40, 70, 6, 1); land.addPoly([[200, 50], [240, 50], [240, 80]], 1); land.carvePoly([[260, 0], [280, 0], [280, 50], [260, 50]]);
  check(`${ed}: terrain: hard ground stays when carved; add and addPoly fill, carvePoly empties`, land.solid(150, 5) && land.solid(40, 70) && land.solid(235, 70) && !land.solid(205, 70) && !land.solid(270, 30) && land.solid(270, 5), '');
  const n0 = land.normal(80, 50), slope = new E.Terrain({ w: 100, h: 100 }); slope.fill((x, y) => y < x ? 1 : 0); const n1 = slope.normal(50, 50, 6), g0 = land.ground(80, 90), h0 = land.hit(80, 52, 4), r0 = land.ray(80, 100, 80, 0);
  check(`${ed}: terrain: the ground below a point, the normal on flat ground and on a slope, a circle's hit, a ray's first solid`, g0 === 50 && Math.abs(n0[1] - 1) < .01 && Math.abs(n1[0] + .707) < .08 && Math.abs(n1[1] - .707) < .08 && h0 && h0[1] > .9 && h0[2] >= 1 && h0[2] <= 3 && r0 && Math.round(r0[1]) === 50, JSON.stringify({ g0, n0, n1, h0, r0 }));
  { const t = new E.Terrain({ w: 200, h: 100 }); t.fill((x, y) => y < 20 || (x > 60 && x < 70 && y < 24) || (x > 120 && x < 125 && y < 40) ? 1 : 0); t.carve(160, 20, 12);
    const wk = { x: 10, y: 20, vx: 40, vy: 0, ground: true }; let up = 0; for (let i = 0; i < 480; i++) { t.walk(wk, 1 / 120); up = Math.max(up, wk.y); } const stoppedAt = wk.x;
    const wf = { x: 150, y: 20, vx: 40, vy: 0, ground: true }; let fell = 0, at = 0; for (let i = 0; i < 120 && !fell; i++) { fell = t.walk(wf, 1 / 120); at = wf.y; }
    check(`${ed}: terrain: a walker steps up a 4-unit step and down again, stops at a 20-unit wall, falls into a crater and lands (its landing speed for damage)`, up === 24 && stoppedAt > 115 && stoppedAt < 121 && wk.ground && Math.abs(wk.y - 20) < .01 && fell > 50 && at < 15, `up to ${up}; stopped at ${stoppedAt.toFixed(1)}; landed at ${fell.toFixed(0)} px/s, at ${at}`); }
  { const w = new E.Physics({ gravity: [0, -400] }); w.add(land.collider()); const b = w.circle(60, 90, 3, { bounce: .4, bullet: true }); let bounced = false; for (let i = 0; i < 600; i++) { w.step(1 / 120); if (b.vy > 20) bounced = true; }
    check(`${ed}: terrain: a physics ball bounces on it (land.collider()) and comes to rest on the ground`, bounced && b.sleeping && Math.abs(b.y - 53) < 1.5, `y ${b.y.toFixed(2)}, bounced ${bounced}, asleep ${b.sleeping}`); }
  // touch zones (M11b, the full engine's touch): a finger in a zone holds its act until it lifts, two fingers two zones,
  // two in one zone hold it until both lift; no stick, no tap; with no zones a finger is a gesture again
  if (ed === 'full') { const g = new E.Game({ headless: true, view: 'overhead', input: Object.assign({}, E.Input.DEFAULT, { flipL: ['KeyZ'], flipR: ['KeyM'] }) }), I = g.input, W = g.screen.W, H = g.screen.H, seen = [];
    g.start({ update() { seen.push((I.down('flipL') ? 'L' : '-') + (I.down('flipR') ? 'R' : '-') + (I.clicked() ? 'c' : '')); }, draw() {} });
    const step = () => g.advance(1 / 120), f = (t, x, id) => { I.feed(t, x, H / 2, { touch: true, id }); step(); };
    I.zones = [{ x0: 0, y0: 0, x1: .5, y1: 1, act: 'flipL' }, { x0: .5, y0: 0, x1: 1, y1: 1, act: 'flipR' }];
    f('down', W * .25, 1); f('down', W * .75, 2); f('up', W * .25, 1); f('up', W * .75, 2); f('down', W * .1, 3); f('down', W * .3, 4); f('up', W * .1, 3); f('up', W * .3, 4);
    I.zones = null; f('down', W * .25, 5); f('up', W * .25, 5); step();
    check(`${ed}: input zones: a finger holds its zone's act until it lifts, two fingers two zones, two in one zone until both lift; none: a tap`, seen.join(' ') === 'L- LR -R -- L- L- L- -- -- --c --', seen.join(' '));
    g.dispose(); }
}

// M10: the click module: walk areas with holes (paths round them, the shortest), walking at any rate, the pointer's
// interfaces, rules, exits, saves; the story's backlog, auto and skip; a dialog's choice by a tap
function clicks(E, ed) {
  // paths round holes: random points, every path inside and crossing no edge, never longer than a fine grid's way
  const wb = new E.Walkbox([[0, 100], [320, 100], [340, 160], [300, 200], [0, 200]], [[[60, 110], [100, 110], [100, 170], [60, 170]], [[150, 130], [200, 120], [210, 190], [160, 180]], [[240, 104], [270, 104], [270, 150], [240, 150]]]);
  const G2 = 2, gw = 172, gh = 102, ok = new Uint8Array(gw * gh); for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) ok[j * gw + i] = wb.inside(i * G2, 98 + j * G2) ? 1 : 0;
  const gridD = (a, b) => {   // Dijkstra on a 2-pixel grid, eight ways (a little longer than the true way, never shorter)
    const cell = p => Math.round(p[0] / G2) + Math.round((p[1] - 98) / G2) * gw, d = new Float64Array(gw * gh).fill(Infinity), s = cell(a), t = cell(b), open = [[0, s]]; d[s] = 0;
    while (open.length) { open.sort((x, y) => y[0] - x[0]); const [dc, c] = open.pop(); if (c === t) return dc; if (dc > d[c]) continue; const cx = c % gw, cy = (c / gw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const x = cx + dx, y = cy + dy, n = y * gw + x; if (x < 0 || y < 0 || x >= gw || y >= gh || !ok[n] || (dx && dy && (!ok[cy * gw + x] || !ok[y * gw + cx]))) continue; const nd = dc + Math.hypot(dx, dy) * G2; if (nd < d[n]) { d[n] = nd; open.push([nd, n]); } } }
    return Infinity; };
  const rnd = E.rng(10), pts = []; while (pts.length < 60) { const p = [Math.round(rnd() * 330), Math.round(100 + rnd() * 100)]; if (wb.inside(...p) && ok[Math.round(p[0] / G2) + Math.round((p[1] - 98) / G2) * gw]) pts.push(p); }
  let outside = 0, longer = 0, worst = 0, turns = 0;
  for (let i = 0; i < 30; i++) {
    const a = pts[i * 2], b = pts[i * 2 + 1], P = wb.path(a, b), L = P.slice(1).reduce((s, q, k) => s + Math.hypot(q[0] - P[k][0], q[1] - P[k][1]), 0), gd = gridD(a, b);
    for (let k = 1; k < P.length; k++) for (let u = .05; u < 1; u += .1) if (!wb.inside(P[k - 1][0] + (P[k][0] - P[k - 1][0]) * u, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * u)) outside++;
    if (L > gd + 3) longer++; worst = Math.max(worst, L - gd); turns += P.length - 2;
  }
  check(`${ed}: E.Walkbox's paths go round its holes (30 random pairs): inside all the way, never longer than a fine grid's way`, !outside && !longer && turns > 10, `${outside} points outside, ${longer} longer than the grid's (worst ${worst.toFixed(1)} px), ${turns} turns`);
  check(`${ed}: E.Walkbox: nearest() puts a point outside on the edge; inside() is false in a hole`, !wb.inside(80, 140) && wb.inside(...wb.nearest(80, 140)) && wb.inside(...wb.nearest(150, 40)) && Math.abs(wb.nearest(150, 40)[1] - 100) <= 3);
  // a game of one room: a key, a box, a door to a second room; the hero walks the same at every refresh rate
  const make = (o = {}) => {
    const g = new E.Game({ headless: true, input: { ...E.Input.DEFAULT, look: ['Mouse2'] } });
    const story = new E.Story(g, { nodes: { hi: [{ say: 'Hello.' }, { say: 'And again.' }] } });
    const pc = new E.Click(g, Object.assign({ story, rooms: {
      yard: { w: 340, h: 200, walk: wb, depth: [100, .8, 200, 1.2], hotspots: [{ id: 'key', name: 'KEY', rect: [300, 140, 10, 10], at: [290, 150], if: '!gotKey', pickup: { give: 'key', set: 'gotKey', say: 'Got it.' } },
        { id: 'box', name: 'BOX', rect: [20, 120, 20, 20], at: [30, 145], look: 'A box.', open: { give: 'gem' } }, { id: 'door', name: 'DOOR', rect: [0, 100, 10, 60], at: [12, 130], exit: 'hall', enter: [50, 50] }] },
      hall: { w: 100, h: 100, walk: [[[0, 0], [100, 0], [100, 100], [0, 100]]] } },
      items: { key: { name: 'KEY' }, gem: { name: 'GEM' }, rope: { name: 'ROPE' }, hook: { name: 'HOOK' }, grapple: { name: 'GRAPPLE' } }, room: 'yard', at: [20, 150],
      rules: [{ item: 'rope', on: 'hook', take: ['rope', 'hook'], give: 'grapple' }, { verb: 'give', item: 'gem', on: 'key', say: 'Thanks!' }] }, o));
    g.start({ update(dt) { pc.update(dt); }, draw(r) { pc.draw(r); } });
    return { g, pc, story };
  };
  const at = []; for (const hz of [60, 90, 120, 144]) { const { g, pc } = make(); pc.walkTo(330, 150); for (let t = 0; t < 2.5 - 1e-9; t += 1 / hz) g.advance(1 / hz); at.push(pc.hero.x.toFixed(3) + ',' + pc.hero.y.toFixed(3)); g.dispose(); }
  check(`${ed}: E.Click: a walk round the holes is the same at 60, 90, 120 and 144 Hz`, new Set(at).size === 1, at.join(' / '));
  { const { g, pc } = make({ ui: 'two' }), I = g.input, click = (q, o) => { I.feed('down', ...q, o); g.advance(1 / 60); I.feed('up', ...q, o); g.advance(1 / 60); }, idle = () => { for (let i = 0; i < 1200 && pc.busy; i++) { if (pc.line) I.tap('confirm'); g.advance(1 / 60); } };
    click(pc.screen(150, 115)); idle(); const walked = Math.hypot(pc.hero.x - 150, pc.hero.y - 115) < 1;
    click(pc.where('key')); idle(); const took = pc.has('key') && !pc.where('key');
    I.feed('move', ...pc.where('box')); I.press('Mouse2'); g.advance(1 / 60); I.release('Mouse2'); for (let i = 0; i < 600 && pc.busy && !pc.line; i++) g.advance(1 / 60); const looked = pc.line && pc.line.lines[0] === 'A box.'; idle();   // (he walks to it, then looks)
    check(`${ed}: E.Click (two buttons): a click walks there; a click on a hotspot does its verb (the key picked up, then hidden by its if); a right click looks`, walked && took && looked, `walked ${walked}, took ${took}, looked ${looked}`);
    pc.give('rope'); pc.give('hook'); pc.act('use', 'rope', 'hook'); const combined = pc.has('grapple') && !pc.has('rope'); pc.give('gem'); pc.act('use', 'key', 'gem'); idle();
    check(`${ed}: E.Click rules: an item on an item either way round (hook on rope makes the grapple); an item used on a hotspot falls back to a give rule`, combined, `inventory ${pc.inv}`);
    pc.act('walk', 'door'); idle(); const s = pc.state(); pc.restore({ room: 'yard', x: 40, y: 150, inv: ['gem'] });
    check(`${ed}: E.Click: an exit takes the hero to its room after the fade; state() and restore() keep the room, the place and the inventory`, s.room === 'hall' && s.x === 50 && s.y === 50 && pc.room === 'yard' && pc.hero.x === 40 && pc.inv.join() === 'gem', JSON.stringify(s));
    g.dispose(); }
  { const { g, pc } = make({ ui: 'icons' }), I = g.input; I.feed('move', ...pc.screen(150, 115)); const seen = []; for (let i = 0; i < 4; i++) { I.press('Mouse2'); g.advance(1 / 60); I.release('Mouse2'); g.advance(1 / 60); seen.push(pc.verb); }
    check(`${ed}: E.Click (Sierra's icons): a right click turns the cursor: walk, look, hand, talk`, seen.join() === 'look,hand,talk,walk', seen.join()); g.dispose(); }
  // the story's backlog, auto and skip; a dialog's choice by a tap on it
  { const { g, story } = make(); story.auto = .5; story.run('hi'); for (let i = 0; i < 200 && story.running; i++) g.advance(1 / 60); const autoT = g.time;
    story.skip = true; story.run('hi'); for (let i = 0; i < 200 && story.running; i++) g.advance(1 / 60); const skipT = g.time - autoT;
    check(`${ed}: E.Story's log keeps what was said; auto turns the pages by itself; skip turns them at once`, story.log.length === 4 && story.log[3].text === 'And again.' && autoT > 1 && autoT < 3 && skipT < .5, `log ${story.log.length}, auto ${autoT.toFixed(2)} s, skip ${skipT.toFixed(2)} s`);
    const D = new E.Dialog(g); let picked = -1; D.say('Which?', { choices: ['ONE', 'TWO', 'THREE'], onChoice: i => { picked = i; } }); g.start({ update(dt) { D.update(dt); }, draw() {} });
    for (let i = 0; i < 60 && D.typing; i++) g.advance(1 / 60); const q = D.choiceAt(2); g.input.feed('down', ...q, { touch: true }); g.advance(1 / 60); g.input.feed('up', ...q, { touch: true }); g.advance(1 / 60);
    check(`${ed}: E.Dialog: a tap on a choice picks it (choiceAt gives where)`, picked === 2 && !D.open, `picked ${picked} at ${q}`); g.dispose(); }
}

// M9a: the pointer's gestures, the free camera, the strategy module (selection and orders by scripted pointer input in
// every ground view, its economy, an AI), the day clock and needs
function strategies(E, ed) {
  // gestures, fed as a browser would give them
  { const g = new E.Game({ headless: true, view: 'topdown' }), I = g.input, seen = []; g.start({ update() { for (const [k, v] of [['box', I.box()], ['long', I.longPress()], ['tap2', I.doubleTap()], ['pan', I.pan()]]) if (v) seen.push(k + (k === 'box' ? (v.done ? '!' : '') : '')); }, draw() {} });
    const step = () => g.advance(1 / 120);
    I.feed('down', 10, 10); step(); I.feed('move', 40, 30); step(); I.feed('up', 40, 30); step();
    I.feed('down', 60, 60); I.feed('up', 60, 60); g.advance(.1); I.feed('down', 61, 60); I.feed('up', 61, 60); step();
    I.feed('down', 90, 90, { touch: true }); g.advance(.5); I.feed('move', 110, 100, { touch: true }); step(); I.feed('up', 110, 100, { touch: true }); step();
    I.feed('down', 90, 90, { touch: true }); step(); I.feed('move', 105, 92, { touch: true }); step(); I.feed('up', 105, 92, { touch: true }); step(); I.feed('zoom', 33, 44);
    check(`${ed}: input gestures: a mouse's drag is a box, two clicks a double tap, a long press then a drag a box, a finger's drag a pan; a zoom's point`, seen.join(' ') === 'box box! tap2 long box box! pan' && I.zoomPoint().join() === '33,44', seen.join(' '));
    g.dispose(); }
  // the free camera in every ground view and turn: a drag keeps the world point under the finger there, a zoom keeps the
  // point under the pointer there (during its preview and after), bounds hold it, the keys move it
  let bad = [];
  for (const view of ['iso', 'threequarter', 'topdown', 'overhead']) for (const turn of [0, 90, 180]) {
    const g = new E.Game({ headless: true, view }), I = g.input, S = g.screen, at = (sx, sy) => { const v = g.view, z = g._zoomTo || g.zoom, k = g.zoom / z; return v.toGround(g.cam.x + S.W / 2 + (sx - S.W / 2) * k, g.cam.y + S.H / 2 + (sy - S.H / 2) * k); };
    g.start({ scenes: { s: { camera: { zoom: [.5, 3] }, update() {}, draw() {} } }, scene: 's' }); g.rotateView(turn); g.cam.free = { bounds: [-2000, -2000, 2000, 2000] }; g.focus(300, 200); g.advance(.05);
    const P = [120, 90], w0 = at(...P); I.feed('down', ...P, { button: 1 }); g.advance(1 / 120);
    for (let i = 1; i <= 4; i++) { I.feed('move', P[0] + 10 * i, P[1] + 6 * i, { button: 1 }); g.advance(1 / 120); }
    I.feed('up', P[0] + 40, P[1] + 24, { button: 1 }); g.advance(1 / 120);
    const w1 = at(P[0] + 40, P[1] + 24), drag = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]);
    const Q = [70, 150], z0 = at(...Q); I.feed('zoom', ...Q, { k: 1.3 }); g.advance(1 / 120); const z1 = at(...Q); g.advance(.4); const z2 = at(...Q);
    const zoom = Math.max(Math.hypot(z1[0] - z0[0], z1[1] - z0[1]), Math.hypot(z2[0] - z0[0], z2[1] - z0[1]));
    if (drag > 1 || zoom > 1.5 || !(g.zoom > 1.2)) bad.push(`${view}+${turn}: drag off by ${drag.toFixed(2)}, zoom by ${zoom.toFixed(2)} (zoom ${g.zoom})`);
    g.dispose();
  }
  { const g = new E.Game({ headless: true, view: 'iso' }), I = g.input; g.start({ update() {}, draw() {} }); g.cam.free = { bounds: [0, 0, 400, 300], speed: 200 }; g.focus(200, 150); g.advance(.05);
    const a = [g.cam.tx, g.cam.ty]; I.hold('right'); g.advance(.5); I.hold('right', false); const b = [g.cam.tx, g.cam.ty];
    I.hold('left'); g.advance(20); I.hold('left', false);
    check(`${ed}: the free camera: a drag keeps the world under the finger and a zoom keeps it under the pointer, in four views turned three ways; the keys pan it; bounds hold it`, !bad.length && Math.hypot(b[0] - a[0], b[1] - a[1]) > 40 && g.cam.tx >= 0 && g.cam.ty <= 300 && (g.cam.tx === 0 || g.cam.ty === 300), bad.slice(0, 3).join('; ') + ` keys moved ${Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(0)}, bounded at ${g.cam.tx.toFixed(0)}, ${g.cam.ty.toFixed(0)}`);
    g.dispose(); }
  // the strategy module: selection and orders by the pointer in every ground view
  const kinds = { soldier: { hp: 30, speed: 50, atk: 6, range: 10, rate: .6, sight: 6 }, hall: { building: true, w: 2, h: 2, hp: 300, depot: true, makes: ['worker', 'soldier'] },
    barracks: { building: true, w: 2, h: 2, hp: 200, makes: ['soldier'], cost: { gold: 100 }, time: 3 }, mine: { resource: 'gold', amount: 2000 },
    worker: { hp: 20, speed: 45, atk: 2, range: 8, rate: 1, sight: 5, gather: 10, cost: { gold: 50 }, time: 2 } };
  bad = [];
  for (const view of ['iso', 'threequarter', 'topdown', 'overhead']) for (const turn of [0, 90, 180]) {
    const g = new E.Game({ headless: true, view, input: { ...E.Input.DEFAULT, order: ['Mouse2'] } }), I = g.input, map = new E.TileMap({ w: 40, h: 30 });
    const rts = new E.Strategy(g, { map, kinds, sides: { blue: {}, red: {} }, player: 'blue', fog: false });
    g.start({ update(dt) { rts.input(); rts.update(dt); }, draw() {} }); g.rotateView(turn);
    const army = [0, 1, 2, 3, 4, 5].map(i => rts.spawn('soldier', 'blue', 280 + (i % 3) * 14, 240 + Math.floor(i / 3) * 14)), foe = rts.spawn('soldier', 'red', 300, 120);
    g.focus(290, 230); g.cam.snap = true; g.advance(.05);
    const scr = u => rts._screen(u), P = army.map(scr), x0 = Math.min(...P.map(p => p[0])) - 8, y0 = Math.min(...P.map(p => p[1])) - 8, x1 = Math.max(...P.map(p => p[0])) + 8, y1 = Math.max(...P.map(p => p[1])) + 8;
    I.feed('down', x0, y0); g.advance(1 / 120); I.feed('move', (x0 + x1) / 2, (y0 + y1) / 2); g.advance(1 / 120); I.feed('move', x1, y1); g.advance(1 / 120); I.feed('up', x1, y1); g.advance(1 / 120);
    const boxed = rts.selected.length;
    const one = scr(army[4]); I.feed('down', ...one); I.feed('up', ...one); g.advance(1 / 120); const clicked = rts.selected.length === 1 && rts.selected[0] === army[4];
    g.advance(.1); I.feed('down', ...one); I.feed('up', ...one); g.advance(1 / 120); const doubled = rts.selected.length;
    I.press('ControlLeft'); I.press('Digit1'); g.advance(1 / 120); I.release('Digit1'); I.release('ControlLeft'); g.advance(1 / 120);
    const empty = [5, 5]; I.feed('down', ...empty); I.feed('up', ...empty); g.advance(.4); const cleared = rts.selected.length === 0;
    I.press('Digit1'); g.advance(1 / 120); I.release('Digit1'); g.advance(1 / 120); const recalled = rts.selected.length;
    // a right click on the ground: a move in formation; then on the foe: an attack
    const dest = g.view.p(330, 330), D = [dest[0] - Math.floor(g.cam.x), dest[1] - Math.floor(g.cam.y)];
    I.feed('down', ...D, { button: 2 }); g.advance(1 / 120); I.feed('up', ...D, { button: 2 }); g.advance(6);
    const near = army.every(u => Math.hypot(u.x - 330, u.y - 330) < 46), apart = army.every(a => army.every(b => a === b || Math.hypot(a.x - b.x, a.y - b.y) > 6));
    const F = rts._screen(foe); I.feed('down', ...F, { button: 2 }); g.advance(1 / 120); I.feed('up', ...F, { button: 2 }); g.advance(12);
    if (boxed !== 6 || !clicked || doubled !== 6 || !cleared || recalled !== 6 || !near || !apart || !foe.dead) bad.push(`${view}+${turn}: box ${boxed}, click ${clicked}, double ${doubled}, cleared ${cleared}, group ${recalled}, moved ${near}, apart ${apart}, foe ${foe.dead ? 'down' : foe.hp}`);
    g.dispose();
  }
  check(`${ed}: E.Strategy by the pointer in four views turned three ways: a box selects six, a click one, a double click the kind, a group kept and called, a right click moves them in formation (kept apart) and attacks`, !bad.length, bad.slice(0, 3).join('; '));
  // the economy and an AI: gathering, training, building; red's build order and its wave; fog
  { const g = new E.Game({ headless: true, view: 'topdown' }), map = new E.TileMap({ w: 48, h: 36 }); const ev = { made: 0, built: 0, waves: 0 };
    const rts = new E.Strategy(g, { map, kinds, sides: { blue: { res: { gold: 200 } }, red: { res: { gold: 600 } } }, player: 'blue', on: { made: () => ev.made++, built: () => ev.built++, wave: () => ev.waves++ } });
    g.start({ update(dt) { rts.update(dt); }, draw() {} });
    const hall = rts.spawn('hall', 'blue', 96, 96), m1 = rts.spawn('mine', null, 248, 96), w1 = rts.spawn('worker', 'blue', 120, 140);
    const rhall = rts.spawn('hall', 'red', 640, 480); rts.spawn('mine', null, 560, 520); for (let i = 0; i < 3; i++) rts.spawn('worker', 'red', 600 + i * 12, 440);
    rts.order([w1], 'gather', m1); const before = rts.side('blue').res.gold; rts.train(hall, 'worker'); const paid = rts.side('blue').res.gold;
    rts.ai('red', { build: [['barracks'], ['soldier', 4]], waves: { first: 40, every: 60, min: 3 } });
    const w2 = rts.spawn('worker', 'blue', 130, 150), placed = rts.order([w2], 'build', { kind: 'barracks', cx: 10, cy: 3 });
    g.advance(20); const gold = rts.side('blue').res.gold, barracks = rts.of('blue', 'barracks')[0]; // before red's wave comes for it
    g.advance(40); const rb = rts.of('red', 'barracks')[0], rs = rts.of('red', 'soldier').length;
    check(`${ed}: E.Strategy's economy: trips to the depot pay, training costs and makes a unit, a worker builds a barracks; red's AI builds its order and sends a wave`, paid === before - 50 && gold > paid - 100 && ev.made >= 1 && placed && barracks && barracks.progress === 1 && rb && rb.progress === 1 && rs >= 3 && ev.waves >= 1 && !!rhall,
      `gold ${before} -> ${paid} -> ${gold}, made ${ev.made}, barracks ${barracks ? barracks.progress : 'none'}, red's ${rb ? rb.progress : 'none'} and ${rs} soldiers, waves ${ev.waves}`);
    check(`${ed}: E.Strategy's fog: the player sees round its units and remembers buildings seen; a foe far off is hidden`, rts.fog.visible([7, 9]) && !rts.visible(rts.of('red', 'worker')[0] || rhall), JSON.stringify(rts.fog.visible([7, 9])));
    g.dispose(); }
  // a building's rally point (a right click with it selected); an AI that makes its losses again and mines nearest home
  { const g = new E.Game({ headless: true, view: 'topdown' }), map = new E.TileMap({ w: 48, h: 36 });
    const rts = new E.Strategy(g, { map, kinds, sides: { blue: { res: { gold: 900 } }, red: { res: { gold: 900 } } }, player: 'blue' });
    g.start({ update(dt) { rts.update(dt); }, draw() {} });
    const hall = rts.spawn('hall', 'blue', 96, 96); rts.smart([hall], 300, 120); rts.train(hall, 'worker'); g.advance(3); const made = rts.of('blue', 'worker')[0], walks = made && made.orders[0] && made.orders[0].kind === 'move' && made.orders[0].x === 300;
    const rh = rts.spawn('hall', 'red', 600, 450), far = rts.spawn('mine', null, 120, 300), near = rts.spawn('mine', null, 660, 520); for (let i = 0; i < 2; i++) rts.spawn('worker', 'red', 560 + i * 14, 430);
    rts.ai('red', { build: [['worker', 2], ['soldier', 2]] }); g.advance(1); const mining = rts.of('red', 'worker').every(w => w.orders[0] && w.orders[0].target === near);
    g.advance(20); const before = rts.of('red', 'soldier').length; rts.remove(rts.of('red', 'soldier')[0]); g.advance(20); const after = rts.of('red', 'soldier').length;
    check(`${ed}: E.Strategy: a right click with a building selected sets its rally point (what it makes walks there); the AI makes its losses again and mines nearest its depot, not nearest each worker`,
      hall.rally && hall.rally.x === 300 && walks && mining && before === 2 && after === 2 && !!rh && !!far, `rally ${JSON.stringify(hall.rally)}, made and walking there ${walks}; mining near ${mining}; soldiers ${before} -> one lost -> ${after}`);
    g.dispose(); }
  // the day clock and needs
  const c = new E.Clock({ day: 240, hour: 8 }); const noon = (c.update(40), c.light().ambient); c.update(80); const night = c.night, label = c.label(), dark = c.light().ambient;
  const agent = { x: 0, y: 0, money: 10, needs: {} }; E.needs(agent, { hunger: .02, fun: .005 }, 30);
  const pick = E.choose(agent, [{ id: 'ride', gives: { fun: -.8 }, x: 10, y: 0, cost: 5 }, { id: 'food', gives: { hunger: -.7 }, x: 60, y: 0, cost: 3 }, { id: 'gift', gives: { fun: -.5 }, cost: 50 }]);
  check(`${ed}: E.Clock (hours, night, the label, the light) and needs (the urgent need wins, a price too high is skipped)`, noon > .9 && night && label === 'DAY 1  20:00' && dark < .3 && pick && pick.id === 'food' && Math.abs(agent.needs.hunger - .6) < 1e-9, `${noon.toFixed(2)} ${night} ${label} ${dark.toFixed(2)} ${pick && pick.id}`);
}

function arcades(E, ed) {
  const game = new E.Game({ headless: true }), I = game.input, step = (n = 1) => { for (let i = 0; i < n; i++) game.advance(1 / 60); };
  const a = new E.Arcade(game, { id: 'ct-every-' + ed, lives: 2, every: 1000 }); a.start(1); a.add(2500);
  const b = new E.Arcade(game, { id: 'ct-extra-' + ed, lives: 2, extra: [500, 2000] }); b.start(1); b.add(600); const one = b.p.lives; b.add(1500);
  check(`${ed}: E.Arcade: a life every 1,000 (two by 2,500), and one at each listed score (500, then 2,000)`, a.p.lives === 4 && a.p.next === 3000 && one === 3 && b.p.lives === 4 && b.p.next === Infinity, [a.p.lives, a.p.next, one, b.p.lives, b.p.next].join());
  const t = new E.Arcade(game, { id: 'ct-turns-' + ed, lives: 1 }); t.start(2);
  const r1 = t.die(), n1 = t.p.n, carded = t.carding, r2 = t.die();
  check(`${ed}: E.Arcade: two players take turns ("PLAYER 2, READY!"), and it is over when neither has a life`, r1 === 'next' && n1 === 2 && carded && r2 === 'over' && t.mode === 'over', [r1, n1, carded, r2].join());
  let got = null, cont = null, late = null;
  const c = new E.Arcade(game, { id: 'ct-table-' + ed, lives: 1 }); game.start({ update(dt) { c.update(dt); }, draw() {} });
  c.start(1); c.die(); c.continue(5, yes => { cont = yes; }); I.tap('start'); step();
  const back = c.p.lives; c.die(); c.continue(1, yes => { late = yes; }); step(70);
  c.enter(1234, '', name => { got = name; }); I.tap('up'); step(); for (let i = 0; i < 3; i++) { I.tap('confirm'); step(); }
  const tb = c.table();
  check(`${ed}: E.Arcade: a continue taken (lives back) or let run out; initials on the wheel (up turns A to B) into the table`, cont === true && back === 1 && late === false && got === 'BAA' && tb.length === 1 && tb[0].score === 1234 && c.qualifies(1) && !c.qualifies(0), JSON.stringify({ cont, back, late, got, tb }));
  const f = new E.Arcade(game, { id: 'ct-attract-' + ed, idle: 1, demo: 2, scores: 1 }), ph = [f.attract(.6), f.attract(.6), f.attract(2.1), f.attract(1.1)];
  f.attract(1.2); f.endDemo(); const ended = f.phase; f.wake();
  check(`${ed}: E.Arcade.attract: the title, a demo after the idle time, the scores, the title again; endDemo shows the scores`, ph.join() === 'title,demo,scores,title' && ended === 'scores' && f.phase === 'title', ph.join() + ' ' + ended);
}
function grids(E, ed) {
  const g = new E.Grid(8, 6, { walkable: (x, y) => !(x === 3 && y < 4) }), p = g.path([0, 0], [7, 0]), r = g.reach([0, 0], 3);
  check(`${ed}: E.Grid: A* round a wall (16 cells, ends included), Dijkstra's reach (9 cells within 3, the wall's left out)`, p.length === 16 && p[15].join() === '7,0' && r.cells.length === 9 && !r.has([3, 0]) && r.cost([1, 2]) === 3 && r.path([2, 1]).length === 4, p.length + ' ' + r.cells.length);
  tactics(E, ed);
  const same = g.path([0, 5], [7, 5]).map(c => c.join()).join(' ') === g.path([0, 5], [7, 5]).map(c => c.join()).join(' ');
  check(`${ed}: E.Grid.path: the same answer every time (its ties broken one way)`, same && g.path([0, 0], [3, 0]).length === 0 && g.path([0, 0], [3, 0], { ends: true }).length > 0);
  const d8 = new E.Grid(6, 6, { diagonal: true });
  check(`${ed}: E.Grid diagonal: Chebyshev, a straight diagonal path`, d8.dist([0, 0], [4, 3]) === 4 && d8.path([0, 0], [4, 4]).length === 5 && d8.neighbours([2, 2]).length === 8);
  const hx = new E.Grid(7, 7, { hex: 'pointy' }), fl = new E.Grid(7, 7, { hex: 'flat' });
  check(`${ed}: E.Grid hex: six neighbours (odd rows shifted), steps, paths, lines`, hx.neighbours([2, 2]).map(c => c.join()).join(' ') === '3,2 2,3 1,3 1,2 1,1 2,1' && hx.neighbours([2, 3]).length === 6 && hx.dist([0, 0], [3, 3]) === 5 && hx.path([0, 0], [3, 3]).length === 6 && hx.line([0, 0], [3, 3]).length === 6 && fl.dist([0, 0], [3, 3]) === 5 && fl.neighbours([3, 3]).length === 6, hx.neighbours([2, 2]).map(c => c.join()).join(' '));
  check(`${ed}: E.Grid hex: centre and toCell are each other's inverse`, [[0, 0], [3, 4], [6, 5]].every(c => hx.toCell(...hx.center(c, 16), 16).join() === c.join() && fl.toCell(...fl.center(c, 16), 16).join() === c.join()));
  const room = new E.Grid(11, 11, { walkable: (x, y) => !(x === 6 && y === 5) }), fov = room.fov([5, 5], 4);
  check(`${ed}: E.Grid.fov: a pillar's shadow, the pillar seen, the radius kept`, fov.has('6,5') && !fov.has('8,5') && fov.has('8,7') && fov.has('5,1') && !fov.has('5,0') && !fov.has('0,0'), [...fov].length + ' cells');
  const R = E.rng(5), walls = new Set(); for (let i = 0; i < 60; i++) walls.add(Math.floor(R() * 20) + ',' + Math.floor(R() * 20));
  const big = new E.Grid(20, 20, { walkable: (x, y) => !walls.has(x + ',' + y) }); let asym = 0;
  for (let i = 0; i < 120; i++) { const a = [Math.floor(R() * 20), Math.floor(R() * 20)], b = [Math.floor(R() * 20), Math.floor(R() * 20)]; if (walls.has(a.join()) || walls.has(b.join())) continue; if (big.fov(a, 30).has(b.join()) !== big.fov(b, 30).has(a.join())) asym++; }
  check(`${ed}: E.Grid.fov is symmetric (what a sees sees a), on a scattered map`, asym === 0, asym + ' one-way pairs');
  const hill = new E.Grid(6, 1, { height: x => x * 4 });
  check(`${ed}: E.Grid.reach: climb and drop limit a step`, hill.reach([0, 0], 9, { climb: 4 }).cells.length === 6 && hill.reach([0, 0], 9, { climb: 3 }).cells.length === 1 && hill.reach([5, 0], 9, { drop: 3 }).cells.length === 1);
  const groups = new E.Grid(4, 2).groups((x, y) => 'aabbaaab'[y * 4 + x]);
  check(`${ed}: E.Grid.groups and flood: neighbours of one key, biggest first`, groups.map(x => x.length).join() === '5,3' && new E.Grid(4, 2).flood([3, 1], (x, y) => 'aabbaaab'[y * 4 + x] === 'b').length === 3);
  const fog = new E.Fog(room); fog.update([{ cx: 5, cy: 5, r: 3 }]); const seen1 = fog.visible([5, 2]); fog.update([{ cx: 1, cy: 1, r: 1 }]);
  check(`${ed}: E.Fog: visible from the viewers now, seen stays after`, seen1 && !fog.visible([5, 2]) && fog.seen([5, 2]) && !fog.seen([10, 10]));
  const t = new E.Turns([{ id: 'hero', speed: 100 }, { id: 'bat', speed: 200 }, { id: 'slime', speed: 50 }], { mode: 'speed' });
  const ct = new E.Turns([{ id: 'a', speed: 100 }, { id: 'b', speed: 150 }], { mode: 'ct' }), ahead = ct.order(4).map(a => a.id).join();
  const ph = new E.Turns([{ id: 'a', side: 'hero' }, { id: 'b', side: 'foe' }, { id: 'c', side: 'hero' }], { mode: 'phase' });
  const atb = new E.Turns([{ id: 'x', speed: 100 }, { id: 'y', speed: 200 }], { mode: 'atb' }); atb.update(.6);
  check(`${ed}: E.Turns: by speed (a bat twice, a slime half), charge time's order ahead, phases, ATB gauges`, [0, 1, 2, 3, 4, 5, 6].map(() => t.next().id).join() === 'bat,hero,bat,bat,hero,bat,slime' && ahead === 'b,a,b,a' && [0, 1, 2].map(() => ph.next().id).join() === 'a,c,b' && atb.ready().map(a => a.id).join() === 'y', ahead);
  const maze = new E.Grid(5, 3, { walkable: (x, y) => y === 1 || x === 3 }), m = new E.GridMover({ cx: 0, cy: 1, speed: 10 });
  m.update(.05, maze, [1, 0], { keep: true }); m.update(.05, maze, [0, -1], { keep: true }); for (let i = 0; i < 6; i++) m.update(.05, maze, null, { keep: true });
  check(`${ed}: E.GridMover: a turn asked early is taken at the first opening (Pac-Man)`, m.cx === 3 && m.cy === 0, m.cx + ',' + m.cy);
  // gen: the same rows for a seed, floors joined, marks on floor
  const joined = L => { const rows = L.rows, open = E.gen.open(rows), seen = new Set([L.start.join()]), q = [L.start]; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && rows[y + dy] && rows[y + dy][x + dx] !== '#') { seen.add(k); q.push([x + dx, y + dy]); } } } return open.every(c => seen.has(c.join())); };
  const kinds = [['rooms', o => E.gen.rooms(40, 24, o)], ['bsp', o => E.gen.bsp(40, 24, o)], ['cave', o => E.gen.cave(40, 24, o)], ['maze', o => E.gen.maze(31, 21, o)], ['maze prim', o => E.gen.maze(31, 21, Object.assign({ algo: 'prim', braid: .5 }, o))]];
  for (const [name, make] of kinds) {
    const a = make({ seed: 7 }), b = make({ seed: 7 }), c = make({ seed: 8 });
    check(`${ed}: E.gen.${name}: the same rows for the same seed, others for another, every floor joined, walled round`, a.rows.join() === b.rows.join() && a.rows.join() !== c.rows.join() && joined(a) && a.rows[0].replace(/#/g, '') === '' && a.rows.every(r => r[0] === '#'), name);
  }
  const lv = E.gen.rooms(40, 24, { seed: 2 }), got = E.gen.mark(lv, 'g', 6, { seed: 3, far: 5 }), pts = E.gen.scatter(30, 20, { seed: 4, r: 3 });
  check(`${ed}: E.gen.mark puts n marks on floor away from the start; scatter keeps its distance`, got.length === 6 && got.every(([x, y]) => lv.rows[y][x] === 'g' && Math.abs(x - lv.start[0]) + Math.abs(y - lv.start[1]) >= 5) && pts.length > 20 && pts.every((p, i) => pts.every((q, j) => i === j || Math.hypot(p[0] - q[0], p[1] - q[1]) >= 3 - 1e-9)));
}

// E.Shell in a headless game: no DOM, but its screens' names, the pause it follows and back() still work; the agent
// edition's stand-in does nothing and doesn't throw
function shellHeadless(E, ed) {
  const game = new E.Game({ headless: true }), ui = new E.Shell(game, { screens: { pause: { text: 'x' } } });
  game.start({ scenes: { play: { pausable: true, update() { ui.hud({ objective: { title: 'x' } }); }, draw() {} } }, scene: 'play' });
  if (ed === 'agent') { ui.show('pause'); check(`${ed}: E.Shell is a stand-in that does nothing`, ui.screen === null && ui.root === null); return; }
  game.input.tap('pause'); game.advance(2 / 120);
  const opened = ui.screen; ui.back();
  check(`${ed}: E.Shell headless: the pause screen follows game.paused, back() resumes`, opened === 'pause' && ui.screen === null && !game.paused && ui.root === null, opened + ' ' + ui.screen + ' ' + game.paused);
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
// the music clock (M12) at a refresh rate, or headless (advance by the same frames): its beats, an at(), a pause of a
// synced song, a tempo change and a layer; the same log in Node and in the browser, at every rate
const BEATS = (hz, headless) => {
  const E = My3D2dge, game = new E.Game(headless ? { headless: true } : { canvas: 'screen', res: 'snes' }), A = game.audio, log = [], frame = 1000 / hz;
  let frames = 0;
  game.start({ update() {}, draw() {} });
  A.onBeat(b => log.push('b' + b + '@' + game.time.toFixed(5)));
  A.music({ bpm: 150, steps: 4, tracks: [{ name: 'a', notes: 'C5 . E5 . G5 . E5 .' }, { name: 'b', on: false, wave: 'drums', notes: 'k . h . s . h .' }] }, { sync: true });
  A.at(10, k => log.push('at' + k + '@' + game.time.toFixed(5)));
  const to = t => { while (frames * frame < t * 1000 - 1e-6) { frames++; if (headless) game.advance(frame / 1000); else window.__frame(frames * frame); } };
  to(1); game.paused = true; to(1.5); game.paused = false; to(2); A.tempo(200); A.layer('b', 1); to(3);
  log.push('pos ' + A.pos.step.toFixed(4) + ' ' + A.pos.layers.join(','));
  return log.join(' ');
};
// the rest of the clock's contract, at 60 Hz
// a script's timeline and a tween at a refresh rate (M1): the same at every rate, as the steps are
const TIMELINE = hz => {
  const E = My3D2dge, game = new E.Game({ canvas: 'screen', res: 'snes' }), frame = 1000 / hz, log = [], o = { x: 0 };
  let frames = 0;
  game.start({ update() {}, draw() {} });
  game.script(function* () { for (let i = 0; i < 6; i++) { yield .13; log.push(game.time.toFixed(6)); } const t = game.tween(o, { x: 100 }, .37, { ease: 'outBounce' }); yield t; log.push(game.time.toFixed(6) + ':' + o.x); });
  while (frames * frame < 2000) window.__frame(++frames * frame);
  return log.join(' ');
};
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
// the lifecycle in a page: dispose() takes the engine's listeners away; loop: false runs only by advance()
const LIFE = () => {
  const E = My3D2dge, out = {};
  const g = new E.Game({ canvas: 'screen', res: 'snes' }); g.start({ update() {}, draw(r) { r.sky(['#000', '#000']); } });
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' })); out.before = g.input.held.has('KeyD');
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
  g.dispose(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' })); out.after = g.input.held.has('KeyD');
  out.current = E.current === null;
  const h = new E.Game({ canvas: 'screen', res: 'snes', loop: false }); let ups = 0, draws = 0;
  h.start({ update() { ups++; }, draw(r) { draws++; r.sky(['#000', '#000']); } });
  for (let i = 1; i <= 30; i++) window.__frame(i * 1000 / 60);
  out.idle = ups === 0 && draws === 0;
  out.steps = h.advance(1, { draw: true }); out.ups = ups; out.draws = draws;
  h.stop(); h.dispose();
  return out;
};
// the third-person kit's drawing (full edition): a footprint lifts a canopy over the tower under it, the decorate hook
// paints wall faces as they bake, r.marker turns into an arrow at the edge, r.sightCone stops at a wall
const DRAW3P = () => {
  const E = My3D2dge, out = { faces: [] }, mode = {};
  const map = new E.TileMap({ rows: ['#########', '#.......#', '#..TTT..#', '#..TTT..#', '#..TTT..#', '#.......#', '#.......#', '#########'], legend: { '#': 1, T: 2 },
    types: { 1: { h: 6 }, 2: { h: 60, decorate: f => { out.faces.push({ side: f.side, du: f.u1 - f.u0, z1: f.z1, fns: typeof f.at + typeof f.quad }); f.quad(f.u0 + 4, 20, f.u0 + 12, 32, '#00ff00'); } } } });
  const game = new E.Game({ canvas: 'screen', res: 'snes', view: 'iso', loop: false }), C = 72, w = 28;   // (a canopy over the 3 x 3 tower, anchored at its middle)
  const count = (hex, edge) => { const c = game.screen.buf, W = game.screen.W, H = game.screen.H, d = c.getContext('2d').getImageData(0, 0, W, H).data, [R, G, B] = E.hex(hex); let n = 0, inner = 0;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) if (d[i] === R && d[i + 1] === G && d[i + 2] === B) { n++; const x = p % W, y = (p / W) | 0; if (x > 20 && x < W - 20 && y > 20 && y < H - 20) inner++; } return edge ? { n, inner } : n; };
  game.start({ update() {}, draw(r) {
    r.sky(['#000', '#000']); map.drawFloor(r); map.queueWalls(r);
    if (mode.canopy) r.queue(C, C - 16, 60, g => { const c = [r.w(C - w, C - 16 - w, 60), r.w(C + w, C - 16 - w, 60), r.w(C + w, C - 16 + w, 60), r.w(C - w, C - 16 + w, 60)], tip = r.w(C, C - 16, 76);
      for (let i = 0; i < 4; i++) E.px.poly(g, [c[i], c[(i + 1) % 4], tip], '#ff00ff'); }, mode.canopy === 'footprint' ? { footprint: [C - w, C - 16 - w, C + w, C - 16 + w] } : {});
    if (mode.marker) r.marker(mode.marker[0], mode.marker[1], 0, { color: '#ff00ff' });
    if (mode.cone && r.sightCone) r.sightCone({ x: 120, y: C - 16, z: 0, facing: Math.PI }, { range: 150, fov: .5, color: '#00ffff', alpha: 1, map: mode.cone === 'map' ? map : undefined });
  } });
  game.follow({ x: C, y: C - 16, z: 0 }, { z: 20 });
  const frame = m => { for (const k in mode) delete mode[k]; Object.assign(mode, m); game.advance(1 / 120, { draw: true }); };
  frame({}); out.green = count('#00ff00');
  frame({ canopy: 'plain' }); out.plain = count('#ff00ff');
  frame({ canopy: 'footprint' }); out.footprint = count('#ff00ff');
  frame({ marker: [C, C] }); out.onScreen = count('#ff00ff', true);
  frame({ marker: [C + 4000, C] }); out.offScreen = count('#ff00ff', true);
  frame({ cone: 'open' }); out.coneOpen = count('#00ffff');
  frame({ cone: 'map' }); out.coneMap = count('#00ffff');
  return out;
};
// the x-ray (full edition): a hero behind a tall wall or a tall prop shows through it (a checker of its color in the
// 'dither' style, so it can be counted), not behind a cut-down wall or low grass; hides: true makes a low prop hide; the
// outline is on by default and outline: false leaves it out
const XRAY = () => {
  const E = My3D2dge, out = {}, mode = {}, T = 16, C = 3.5 * T, trans = E.style.trans;
  const map = new E.TileMap({ rows: ['.......', '.......', '.......', '.......', '.......', '.......', '.......'], legend: {}, types: { 2: { h: 48 }, 3: { h: 6 } } });
  const game = new E.Game({ canvas: 'screen', res: 'snes', view: 'iso', loop: false });
  const count = hex => { const c = game.screen.buf, d = c.getContext('2d').getImageData(0, 0, game.screen.W, game.screen.H).data, [R, G, B] = E.hex(hex); let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] === R && d[i + 1] === G && d[i + 2] === B) n++; return n; };
  game.start({ update() {}, draw(r) {
    r.sky(['#000', '#000']); map.drawFloor(r); map.queueWalls(r);
    r.actor(C, C, 0, (g, ox, oy) => E.px.rect(g, ox - 4, oy - 30, 8, 30, '#00ff00'), { xray: { color: '#ff00ff', outline: mode.ol } });
    if (mode.prop) r.prop(mode.prop, C + 9, C + 9, 0, Object.assign({ size: 2 }, mode.po));
  } });
  game.follow({ x: C, y: C, z: 0 }, { z: 16 });
  const frame = (cell, m) => { map.set(4, 4, cell); for (const k in mode) delete mode[k]; Object.assign(mode, { ol: false }, m); game.advance(1 / 120, { draw: true }); };
  E.style.trans = 'dither';
  frame(2, {}); out.tall = count('#ff00ff');
  frame(3, {}); out.low = count('#ff00ff');
  frame(0, { prop: 'grass' }); out.grass = count('#ff00ff');
  frame(0, { prop: 'grass', po: { hides: true } }); out.grassHides = count('#ff00ff');
  frame(0, { prop: 'pillar', po: { size: 1 } }); out.pillar = count('#ff00ff');
  frame(2, { ol: undefined }); out.outline = count('#e8fdff');
  frame(2, { ol: false }); out.noOutline = count('#e8fdff');
  E.style.trans = trans; game.dispose();
  return out;
};
// E.Shell over a game run by advance(): the HUD, the pause screen, focus moved by the game's input, input held back from
// the game while a screen is open, a button's act, settings, the toast's time, dispose
const SHELL = () => {
  const E = My3D2dge, out = {}, q = s => document.querySelector(s), texts = s => [...document.querySelectorAll(s)].map(e => e.textContent);
  const game = new E.Game({ canvas: 'screen', res: 'snes', loop: false, input: 'THIRDPERSON' }), I = game.input;
  const ui = new E.Shell(game, { screens: { pause: { text: 'The objective' }, help: { keys: [['WASD', 'Move']] } },
    settings: { items: ['motion', { key: 'cones', label: 'Cones', value: true }], onChange: (s, k) => { out.changed = k; } } });
  game.start({ scenes: { play: { pausable: true, update() {
    if (I.pressed('attack')) out.attacked = (out.attacked || 0) + 1;
    ui.hud({ objective: { title: 'Steal it', at: { x: 160, y: 0, z: 40 }, from: { x: 0, y: 0, z: 0 } }, prompt: { key: 'E', label: 'Take', progress: .5 }, bars: [{ value: 2, max: 3, kind: 'pips' }] });
  }, draw(r) { r.sky(['#000', '#000']); } } }, scene: 'play' });
  const step = (n = 1) => game.advance(n / 120);
  step();
  out.obj = q('.esh-obj').textContent; out.prompt = q('.esh-pr').textContent; out.pips = [document.querySelectorAll('.esh-pips i').length, document.querySelectorAll('.esh-pips i.off').length];
  I.tap('pause'); step(2);
  out.pause = ui.screen; out.paused = game.paused; out.buttons = texts('.esh-sh button'); out.focus = document.activeElement.textContent; out.hudHidden = q('.esh-obj').hidden;
  // (a tap holds its action through the next step: step twice before tapping the same one again, as a key is let go)
  I.tap('down'); step(2); out.f1 = document.activeElement.textContent; I.tap('down'); step(2); out.f2 = document.activeElement.textContent;
  I.tap('confirm'); step(2); out.s1 = ui.screen; I.tap('cancel'); step(2); out.s2 = ui.screen; I.tap('cancel'); step(2); out.s3 = ui.screen; out.resumed = !game.paused;
  ui.show('results', { title: 'Done', stats: [['1', 'A']], medals: [['M', true]], actions: [['Again', () => { out.again = true; }], { label: 'Hit', act: 'attack' }] });
  I.tap('attack'); step(2); out.heldBack = out.attacked || 0;
  document.querySelectorAll('.esh-sh button')[1].click(); step(); out.actPassed = out.attacked || 0;
  out.results = q('.esh-stats').textContent + '|' + q('.esh-med').textContent;
  ui.show('settings'); [...document.querySelectorAll('.esh-sh .esh-row')].find(r => /Reduce motion/.test(r.textContent)).querySelector('[role=switch]').click(); step(); out.motion = game.reduceMotion; out.still = ui.root.classList.contains('esh-still'); out.saved = ui.settings.motion;
  ui.hide(); ui.toast('Hi'); out.toastOn = q('.esh-toast').classList.contains('on'); step(600); out.toastOff = !q('.esh-toast').classList.contains('on');
  game.dispose(); out.gone = !q('.esh') && game.shell === null;
  return out;
};
// docs/ASSETS.md's examples in a game: the surfaces (on a small map), the stool, the worked entries (as card-<id>), and
// the use block in draw (its shape, its solid and its sprite); what is drawn with and without it, and every warning
// the terrain drawn in the side view: chunks painted once, then only where a carve touched; its pixels on screen
const TERRAIN_DRAW = () => {
  const E = My3D2dge, game = new E.Game({ canvas: 'screen', res: 'snes', view: 'side', loop: false }), land = new E.Terrain({ w: 400, h: 200, chunk: 32, materials: [{ color: '#8a5a34', top: '#5aa040' }] }), out = {};
  land.fill((x, y) => y < 60 ? 1 : 0); game.view.scale = 1;
  game.start({ update() {}, draw(r) { r.sky(['#000', '#000']); land.draw(r); } }); game.focus(128, 0, 60);
  game.advance(1 / 60, { draw: true }); out.first = land.drawn; game.advance(1 / 60, { draw: true }); out.again = land.drawn;
  land.carve(130, 60, 10); game.advance(1 / 60, { draw: true }); out.carved = land.drawn;
  const d = game.screen.buf.getContext('2d').getImageData(0, 0, game.screen.W, game.screen.H).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 120 && d[i] < 140) lit++; out.lit = lit;
  return out;
};
const CARD = ([use, surf, entry, worked]) => {
  const E = My3D2dge, out = { warns: [] }, warn = console.warn; console.warn = (...a) => { out.warns.push(a.join(' ')); warn(...a); };
  const rows = ['#####', '#.~..', '#....', '#....'], legend = { '#': 1, '~': { floor: 'water' } };
  const { map, level } = new Function('E', 'rows', 'legend', surf + '\nreturn { map, level };')(E, rows, legend);
  new Function('E', entry)(E);
  const cards = new Function('return {' + worked + '}')(); for (const k in cards) E.SHAPES['card-' + k] = cards[k];
  const game = new E.Game({ canvas: 'screen', res: 'snes', view: 'iso', loop: false }), mode = {}, made = new Function('E', 'r', 'map', 'x', 'y', use + '\nreturn icon;');
  let last = null; const lit = () => { const c = game.screen.buf, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (last && (d[i] !== last[i] || d[i + 1] !== last[i + 1] || d[i + 2] !== last[i + 2])) n++; last = d; return n; };   // (pixels changed since the last frame)
  game.start({ update() {}, draw(r) { r.sky(['#000', '#000']); map.drawFloor(r); map.queueWalls(r); if (mode.use) out.icon = made(E, r, map, 40, 30); } });
  game.follow({ x: 40, y: 32, z: 0 });
  game.advance(1 / 120, { draw: true }); lit(); game.advance(1 / 120, { draw: true }); out.still = lit();
  mode.use = true; game.advance(1 / 120, { draw: true }); out.withUse = lit();
  out.solids = (map.solids || []).length; out.icon = !!(out.icon && out.icon.w);
  out.stool = !!E.SHAPES.stool; out.cards = Object.keys(cards);
  if (E.shapeInfo && E.SHAPES.barrel) { out.drawn = ['stool', ...out.cards.map(k => 'card-' + k)].filter(id => (E.shapeInfo(id, { view: E.VIEWS.iso }) || {}).pixels > 20); }
  out.level = !!(level && level.w); out.mossy = !!E.MATERIALS.mossy;
  console.warn = warn; return out;
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [ed, file] of EDITIONS) {
  console.log(`\n${ed} edition (Chromium, virtual clock)`);
  const html = '<!doctype html><html><body style="margin:0"><canvas id="screen"></canvas><script>(' + CLOCK + ')()</script><script>' + engineSource(ed).replace(/<\/script/gi, '<\\/script') + '</script></body></html>';
  const run = async (fn, arg) => {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setContent(html);
    let r; try { r = await page.evaluate(fn, arg); } catch (e) { await page.close(); throw new Error(e.message + (errors.length ? '\n  page errors: ' + errors.join(' | ') : '')); }
    await page.close();
    if (errors.length) check(`${ed}: no errors`, false, errors.join(' | '));
    return r;
  };
  const rates = {};
  for (const hz of [60, 90, 120, 144]) rates[hz] = await run(PLAY, hz);
  for (const hz of [60, 90, 120, 144]) console.log(`  ${String(hz).padStart(3)} Hz: steps per frame ${rates[hz].steps.join(',')}..., ${rates[hz].total} in 2.5 s, jump peak ${rates[hz].peak.toFixed(4)}, state ${rates[hz].state}`);
  for (const hz of [90, 120, 144]) check(`${ed}: the same state at ${hz} Hz as at 60 Hz`, rates[hz].state === rates[60].state, rates[hz].state + ' vs ' + rates[60].state);
  if (ed === 'full') {
    const T = {}; for (const hz of [60, 90, 120, 144]) T[hz] = await run(TIMELINE, hz);
    check(`${ed}: a script's waits and a tween give the same timeline at 60, 90, 120 and 144 Hz`, T[60].split(' ').length === 7 && [90, 120, 144].every(hz => T[hz] === T[60]), JSON.stringify(T));
    const B = {}, node = new Function('My3D2dge', 'return (' + BEATS + ')')(load('engine/my-3d2dge.js'))(60, true); for (const hz of [60, 90, 120, 144]) B[hz] = await run(BEATS, hz);
    check(`${ed}: the music clock: its beats, an at(), a synced song's pause, a tempo change and a layer on the same steps headless (Node) and in the browser at 60, 90, 120 and 144 Hz`, node.split(' ').length > 8 && [60, 90, 120, 144].every(hz => B[hz] === node), 'Node: ' + node + (B[60] !== node ? ' | 60 Hz: ' + B[60] : ''));
  }
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
  const LF = await run(LIFE);
  check(`${ed}: dispose() removes the engine's listeners`, LF.before && !LF.after && LF.current, JSON.stringify(LF));
  check(`${ed}: loop: false waits for advance(), which runs fixed steps and draws when asked`, LF.idle && LF.steps === 120 && LF.ups === 120 && LF.draws === 1, JSON.stringify(LF));
  if (ed === 'full') {
    const S = await run(SHELL);
    console.log('  shell:', JSON.stringify(S));
    check(`${ed}: E.Shell's HUD shows the state it is given (the objective's distance and height, the prompt, the pips)`, /Steal it/.test(S.obj) && /20 m/.test(S.obj) && /ABOVE/.test(S.obj) && /Take/.test(S.prompt) && S.pips.join() === '3,1', JSON.stringify([S.obj, S.prompt, S.pips]));
    check(`${ed}: E.Shell's pause screen follows game.paused, with Resume, Settings, Controls, Full screen and Help, the HUD hidden`, S.pause === 'pause' && S.paused && S.buttons.join() === 'Resume,Settings,Controls,Full screen,Help' && S.focus === 'Resume' && S.hudHidden, JSON.stringify(S));
    check(`${ed}: E.Shell: the game's input moves the focus, confirm opens, cancel goes back, then resumes`, S.f1 === 'Settings' && S.f2 === 'Controls' && S.s1 === 'controls' && S.s2 === 'pause' && S.s3 === null && S.resumed, JSON.stringify(S));
    check(`${ed}: E.Shell holds the game's input back while a screen is open; a button's act reaches it`, S.heldBack === 0 && S.actPassed === 1 && /A/.test(S.results), JSON.stringify(S));
    check(`${ed}: E.Shell settings apply (reduce motion) and tell the game`, S.motion === true && S.still && S.saved === true && S.changed === 'motion', JSON.stringify(S));
    check(`${ed}: E.Shell toasts time out; dispose() takes it away`, S.toastOn && S.toastOff && S.gone, JSON.stringify(S));
  }
  const D = await run(DRAW3P);
  console.log('  third person:', JSON.stringify(Object.assign({}, D, { faces: D.faces.length })));
  check(`${ed}: r.marker: a diamond on screen, an arrow at the edge off it`, D.onScreen.inner > 10 && D.offScreen.n > 10 && D.offScreen.inner === 0, JSON.stringify([D.onScreen, D.offScreen]));
  if (ed === 'full') {
    check(`${ed}: types[id].decorate(face) is called for each face with its side, u0..u1, z1, at and quad, and paints it`, D.faces.length >= 4 && new Set(D.faces.map(f => f.side)).size >= 2 && D.faces.every(f => f.du === 16 && f.z1 === 60 && f.fns === 'functionfunction') && D.green > 20, JSON.stringify(D.faces.slice(0, 2)) + ' green ' + D.green);
    check(`${ed}: a footprint sorts a canopy over every block under it`, D.footprint > D.plain + 20, D.plain + ' -> ' + D.footprint);
    check(`${ed}: r.sightCone stops at a wall (with map)`, D.coneMap > 0 && D.coneMap < D.coneOpen / 4, D.coneOpen + ' -> ' + D.coneMap);
  }
  if (ed === 'full') {
    const X = await run(XRAY);
    console.log('  x-ray:', JSON.stringify(X));
    check(`${ed}: x-ray: a tall wall or a tall prop in front shows the hero through it; a cut-down wall or low grass doesn't`, X.tall > 20 && X.pillar > 20 && X.low === 0 && X.grass === 0, JSON.stringify(X));
    check(`${ed}: x-ray: hides: true makes a low prop hide; the outline is on by default, outline: false leaves it out`, X.grassHides > 0 && X.outline > 10 && X.noOutline === 0, JSON.stringify(X));
  }
  const TD = await run(TERRAIN_DRAW);
  check(`${ed}: terrain: the first draw paints the chunks on screen, the next none, a carve only the chunks it touched; it shows on screen`, TD.first > 4 && TD.again === 0 && TD.carved >= 1 && TD.carved <= 4 && TD.lit > 100, JSON.stringify(TD));
  const CODE = FENCED('docs/ASSETS.md').map(x => x.code), K = await run(CARD, CODE);
  console.log('  the asset card:', JSON.stringify(Object.assign({}, K, { warns: K.warns.length })));
  check(`${ed}: docs/ASSETS.md has its four examples (use, surfaces, an entry, worked entries)`, CODE.length === 4 && K.cards.length >= 6, CODE.length + ' blocks, ' + K.cards.length + ' worked entries');
  check(`${ed}: docs/ASSETS.md's examples keep what they add (E.SHAPES, E.MATERIALS) and build their maps`, K.stool && K.mossy && K.level, JSON.stringify(K));
  if (ed === 'full') {
    check(`${ed}: docs/ASSETS.md's examples draw without a warning: the shape, the solid, the sprite, the stool and every worked entry`, !K.warns.length && !K.still && K.withUse > 120 && K.solids >= 1 && K.icon && K.drawn.length === K.cards.length + 1, K.warns.join(' | ') + ' ' + JSON.stringify(K));
  } else check(`${ed}: docs/ASSETS.md's examples draw nothing and say so (r.shape, map.solid, E.shapeSprite are the full engine's)`, !K.still && !K.withUse && !K.solids && !K.icon && ['r.shape', 'map.solid', 'E.shapeSprite'].every(n => K.warns.some(w => w.includes(n))), K.warns.join(' | ') + ' ' + JSON.stringify(K));
  // the complete games among the examples (API.md's quick start): they start, take a start press and play, without errors
  for (const x of EXAMPLES.filter(x => /^\(\(\) => \{/.test(x.code.trim()) && (!x.editions || x.editions.includes(ed)))) {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const at = html.lastIndexOf('</body>');   // (the agent edition's header has a </body> of its own)
    await page.setContent(html.slice(0, at) + '<script>' + x.code.replace(/<\/script/gi, '<\\/script') + '</script>' + html.slice(at));
    const r = await page.evaluate(() => { let f = 0; const run = n => { for (let i = 0; i < n; i++) window.__frame(++f * 1000 / 60); };
      run(60); const g = My3D2dge.current; g.input.tap('start'); g.input.tap('confirm'); run(60); g.input.hold('right'); run(120); return { scene: g.sceneName, errors: g.errors.length }; });
    await page.close();
    check(`${ed}: ${x.file} example ${x.name} plays`, !errors.length && !r.errors, errors.join(' | ') + JSON.stringify(r));
  }
}
// the handoff package's template game: its headless test passes, and it plays in a browser without errors
if (existsSync(join(root, 'dist/handoff/game/test.mjs'))) {
  const t = spawnSync(process.execPath, [join(root, 'dist/handoff/game/test.mjs')], { encoding: 'utf8' });
  check('handoff: game/test.mjs passes', t.status === 0, (t.stdout + t.stderr).split('\n').filter(l => /FAIL|Error/.test(l)).join(' | '));
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(CLOCK); await page.goto(pathToFileURL(join(root, 'dist/handoff/game/index.html')).href);
  const snap = await page.evaluate(() => { let f = 0; const run = n => { for (let i = 0; i < n; i++) window.__frame(++f * 1000 / 60); };
    run(30); const g = My3D2dge.current; g.input.tap('start'); run(40); g.input.hold('right'); run(90); return g.debug.snapshot(); });
  await page.close();
  check('handoff: game/index.html plays in a browser', !errors.length && snap.scene === 'play', errors.join(' | ') + JSON.stringify(snap));
  // the asset card's tools run on the package alone (its engine and its copy of the store), as the card says
  const f = spawnSync(process.execPath, [join(root, 'dist/handoff/tools/asset-find.mjs'), 'graveyard urn', '--top', '3'], { encoding: 'utf8', cwd: join(root, 'dist/handoff') });
  check('handoff: docs/ASSETS.md is there and tools/asset-find.mjs finds a store entry', existsSync(join(root, 'dist/handoff/docs/ASSETS.md')) && f.status === 0 && /kenney-graveyard:urn-round/.test(f.stdout), (f.stdout + f.stderr).slice(0, 300));
}
await browser.close();

console.log(failures.length ? `\nFAILED ${failures.length} of ${passed + failures.length}:\n  ${failures.join('\n  ')}` : `\nall ${passed} contract checks passed`);
process.exit(failures.length ? 1 : 0);
