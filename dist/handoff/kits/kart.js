// The KART kit's game (Mode 7 karts: six on a circuit, three laps, items, two players in a split screen), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 159 (src/starter/65-kart.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. kart.html plays it; node kits/test.mjs kart runs it headless.
/* ============================== GAME START ==============================
 * MY-3D2DGE STARTER: a title menu and vertical slices, one per genre (a genre kit file holds one; the file with every
 * slice adds an animation lab). Each slice is a complete small game, written to be copied and changed: its own header
 * (below this shell) says what it plays, its keys and touch controls, its deep links and how it works.
 * FULL SCREEN, ANY SHAPE: res: 'ps1', expand: true. 320 x 240 is the least the screen shows; a wider or taller window
 * shows more world (r.W x r.H grows), so every HUD anchors to r.W and r.H, never to 320 and 240, and every level fills
 * what a wide screen or an upright phone shows. Prompts name the player's own keys: prompt('attack', 'Sword').
 * To make your own game: change the slice closest to your genre into yours, with its own title, play and game-over
 * scenes, and delete this menu and the slices you do not use; this shell (the game, its scenes, prompt, best and the
 * proof) stays unless you replace it. Deep links: #<slice> starts a slice, #<slice>/<part> jumps into a part.
 * ======================================================================== */
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;

/* ---- SHELL: one game, several scenes. Each slice switches view, keys and resolution on entry ----
 * expand: the picture fills the window, any shape, with no bars: at least 320 x 240 (a slice's res), more on the long side */
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d' });
const P = game.particles, L = game.lights, A = game.audio;
const scenes = {};
let gpu = null;                               // WebGPU lighting, used by the adventure slice only
const best = (k, v) => { const old = E.store.get('best:' + k, 0); if (v > old) E.store.set('best:' + k, v); return Math.max(old, v); };
// a prompt in the player's own controls, after rebinding: 'J Sword' on a keyboard, 'X Sword' on a pad, 'ATTACK Sword' (the
// button's name) on a touch screen, where the buttons sit over the bottom corner: touch() says so, to move a prompt off it
const prompt = (a, word) => game.input.label(a) + ' ' + word, touch = () => game.input.lastDevice === 'touch';
// each slice: its scene's id, its title entry, a line about it, and its family (the title groups them under it)
const SLICES = [
  { id: 'adventure', label: 'ADVENTURE', about: 'TOP-DOWN ACTION ADVENTURE', family: 'ACTION ADVENTURE' },
  { id: 'pointclick', label: 'POINT-AND-CLICK', about: 'RELIGHT THE LIGHTHOUSE ON GULL ROCK', family: 'ADVENTURE' },
  { id: 'platformer', label: 'PLATFORMER', about: 'SIDE-SCROLLING PLATFORMER', family: 'PLATFORM' },
  { id: 'metroidvania', label: 'METROIDVANIA', about: 'A WORLD OF ROOMS, ITS MAP, ITS GATES', family: 'PLATFORM' },
  { id: 'brawler', label: 'BRAWLER', about: 'SIDE-SCROLLING BEAT-EM-UP', family: 'FIGHTING' },
  { id: 'fighting', label: 'FIGHTING', about: 'ONE ON ONE, BEST OF THREE', family: 'FIGHTING' },
  { id: 'shooter', label: 'SHOOTER', about: 'VERTICAL SHOOT-EM-UP', family: 'ARCADE' },
  { id: 'arcade', label: 'ARCADE', about: 'A CABINET OF THREE CLASSICS', family: 'ARCADE' },
  { id: 'pinball', label: 'PINBALL', about: 'ONE TABLE: RAMP, MULTIBALL, JACKPOT', family: 'ARCADE' },
  { id: 'kart', label: 'KART', about: 'MODE 7 KARTS, THREE LAPS', family: 'RACING' },
  { id: 'road', label: 'ROAD', about: 'A COAST ROAD AGAINST THE CLOCK', family: 'RACING' },
  { id: 'puzzle', label: 'PUZZLE', about: 'FALLING BLOCKS AND FALLING PAIRS', family: 'PUZZLE' },
  { id: 'rhythm', label: 'RHYTHM', about: 'STEP UP! FOUR LANES, TWO SONGS', family: 'MUSIC' },
  { id: 'rpg', label: 'RPG', about: 'A JOURNEY: TOWN, WORLD, CAVE, BATTLES', family: 'RPG' },
  { id: 'roguelike', label: 'ROGUELIKE', about: 'A CRYPT OF TEN GENERATED FLOORS', family: 'RPG' },
  { id: 'tactics', label: 'TACTICS', about: 'TAKE THE HILL FORT, TURN BY TURN', family: 'STRATEGY' },
  { id: 'rts', label: 'RTS', about: 'GATHER GOLD, RAISE AN ARMY, BURN THEIR CAMP', family: 'STRATEGY' },
  { id: 'artillery', label: 'ARTILLERY', about: 'TWO TEAMS OF THREE ON AN ISLAND THAT BLOWS APART', family: 'STRATEGY' },
  { id: 'sim', label: 'SIM', about: 'BUILD A THEME PARK, KEEP THEM SMILING', family: 'SIMULATION' },
  { id: 'stealth', label: 'STEALTH', about: 'ROOFTOP STEALTH AND PARKOUR', family: 'ACTION ADVENTURE' },
  { id: 'sports', label: 'SPORTS', about: 'TWO AGAINST TWO IN THE CAGE', family: 'SPORTS' },
  { id: 'animlab', label: 'ANIMATION LAB', about: 'EVERY MOVE, SKIN AND VIEW', family: 'TOOLS' }
];
/* the camera: each slice's scene says how the player may zoom it, camera: { zoom: [min, max] | false, start, tall }: the
   engine zooms it with the mouse wheel, - and =, a pinch on a phone and Settings, Camera zoom (the player's own, kept, on
   top of the slice's start: tall on a phone held upright). Keys every slice shares besides: V changes the camera view,
   [ and ] turn it (camera.rotate), 0 resets it (the player's zoom too), G toggles GPU lighting, M mutes */
const camOpt = () => (game.scene && game.scene.camera) || {};
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'KeyV') { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
  else if (e.code === 'Digit0') { game.settings.set('zoom', 1); game.resetCamera(); game.note('CAMERA RESET'); }   // (resetCamera draws it at once)
  else if ((e.code === 'BracketLeft' || e.code === 'BracketRight') && camOpt().rotate) { game.rotateView(e.code === 'BracketLeft' ? -45 : 45); game.note('TURN ' + game.yaw); }
  else if (e.code === 'KeyM') A.mute();
  else if (e.code === 'KeyG' && gpu) gpu.enabled = !gpu.enabled;
});

/* ---- TITLE: a lineup of HD heroes on a torch-lit castle ledge under a dusk sky. The ledge is wide enough for a wide
 * screen and sits on the screen's bottom edge whatever its height; the logo and menu hang from the top ---- */
const MID = 480, stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 },
  types: { 1: { style: 'stone', side: '#6a5a78', moss: '#4a6a3a' } }, edges: 'open' });
const titleBg = new E.Backdrop('castle-night');
const HEROES = [   // six heroes, each dressed with the HD rig options
  { face: 0, rig: new E.Humanoid({ size: 1.25, build: 'heroic', armor: true, hair: 'short', cape: { len: 6, width: 6, seg: 2.6 }, colors: { cloth: '#3a5ab0', cape: '#b02a3a', capeIn: '#5a1020', hair: '#e0b050', trim: '#e8c860' } }) },
  { face: 0, rig: new E.Humanoid({ size: 1.25, outfit: 'tunic', hair: 'spiky', hat: { style: 'pointed', color: '#3aa050' }, colors: { cloth: '#3aa050', pants: '#e8dcc0', hair: '#e0b040', trim: '#8a5a2a' } }) },
  { face: 0, rig: new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, hat: { style: 'band', color: '#e03a3a' }, colors: { cloth: '#f0f0f0', pants: '#2f5fd0' } }) },
  { face: Math.PI, rig: new E.Humanoid({ size: 1.25, weapon: 'gun', hat: 'cap', sleeves: 'long', colors: { cloth: '#d83a2a', pants: '#2f5fd0', glove: '#f0f0f0' } }) },
  { face: Math.PI, rig: new E.Humanoid({ size: 1.25, weapon: 'staff', outfit: 'robe', hair: 'ponytail', sleeves: 'long', colors: { cloth: '#6a3ab0', hair: '#c8402a', trim: '#e8c860' } }) },
  { face: Math.PI, rig: new E.Humanoid({ size: 1.25, build: 'heroic', hood: true, outfit: 'coat', sleeves: 'long', colors: { cloth: '#e8e4dc', coat: '#d8d2c8', trim: '#b02a2a', belt: '#b02a2a', pants: '#4a4a5a', boot: '#3a2e2a' } }) }   // the stealth slice's hooded assassin
];
HEROES.forEach((h, i) => { h.x = MID + (i - 2.5) * 35; });
// the corner's buttons (menu, full screen, the page's ? API) in game pixels: about 170 x 60 CSS pixels at the top right
const corner = () => { const S = game.screen, k = S.dpr / S.S; return [170 * k, 60 * k]; };
// where a HUD's top-right corner ends: left of the corner's menu button while it stays there (a touch screen), else the edge
const cornerX = () => { const ca = touch() && game.cornerArea(); return ca && ca.y0 < 40 ? Math.floor(ca.x0) - 4 : game.W; };
/* ---- THE PROOF (tools/kits-test.mjs runs each slice's twice and compares): proof(id, n, script, state, fresh) enters the
 * slice afresh on a game clock at 0, with Math.random seeded, runs n fixed steps of 1/120 s with script(i, key) pressing
 * keys (key.hold('right'), key.up('right'), key.tap('attack')), and gives a hash of what state() returns: the numbers that
 * say how the run went. fresh(), when given, runs first (seeded): it puts back what the slice keeps between visits. A
 * slice's run(n) is one (__game.scenes.adventure.run(600)): the same number every time ---- */
const proof = (id, n, script, state, fresh) => {
  const was = Math.random, I = game.input, held = new Set();
  const key = { hold: a => { held.add(a); I.hold(a); }, up: a => { held.delete(a); I.hold(a, false); }, tap: a => I.tap(a) };
  Math.random = E.rng(7);
  try {
    if (fresh) fresh();
    game.time = 0; game.timeScale = 1; game.go(id, null, { fade: 0 }); game.advance(1 / 120);
    for (let i = 0; i < n; i++) { script(i, key); game.advance(1 / 120); }
    const s = JSON.stringify(state()); let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  } finally { for (const a of held) I.hold(a, false); Math.random = was; }
};
// a proof's walk: every `every` steps it lets go of the directions and holds the next of `dirs`
const walk = (i, key, dirs, every) => { if (i % every) return; for (const d of dirs) key.up(d); key.hold(dirs[(i / every) % dirs.length]); };
// START picks too (the touch START, a pad's Start), as Enter does: any player's
const pickOnStart = m => { const P = game.players; if (P.some(I => I.pressed('start'))) { P.forEach(I => I.consumeAll()); m.onPick(m.i, m.items[m.i]); } };
/** the title's menu for the slices in this file: grouped by family when there are several (FamilyMenu, in 05-families.js:
 *  the reference editions carry it, a genre kit of one slice doesn't), else a plain E.Menu */
const menuOf = (slices, o) => new Set(slices.map(s => s.family)).size > 1 ? new FamilyMenu(slices, o) : new E.Menu(game, slices.map(s => s.label), o);
let titleMenu = null;   // (made at the start, once the file's slices are known)
scenes.title = {
  view: 'side', views: ['side', 'brawler'], input: 'DEFAULT', res: 'ps1',
  enter() { A.music('title'); game.resetCamera(); game.follow(null); game.cam.room = null; game.cam.bounds = null; if (gpu) gpu.enabled = false; L.enabled = false; },
  update(dt) {
    if (!titleMenu.update(dt)) pickOnStart(titleMenu);
    game.focus(MID, 0, 32 + (game.H / 2 - 42) / -game.view.bz);   // the ledge's top 42 px above the screen's bottom edge
    const t = game.time;
    HEROES.forEach((h, i) => {
      const u = (t * .45 + i * .37) % 3, swing = u < .5 ? { spec: { a0: 1.4, a1: -1.6, z0: 12, z1: 8, reach: 7.5 }, phase: u < .15 ? 'wind' : 'active', u: u < .15 ? u / .15 : (u - .15) / .35 } : null;
      h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: h.face, vx: 0, vy: 0, attack: swing, point: i === 3 && u < .6 });
    });
  },
  draw(r) {
    const [cw, ch] = corner(), top = r.W / 2 + 132 > r.W - cw ? Math.round(ch) : 0;   // the logo drops below the corner's buttons where it would reach them (an upright phone)
    titleMenu.y = 76 + top;
    titleBg.draw(r);
    stage.draw(r);
    for (const x of [MID - 100, MID + 100]) r.prop('torch', x, 0, 32, { size: 1.3, light: false });
    for (const x of [MID - 53, MID + 53]) r.prop('banner', x, -8, 64, { size: 1.1, color: '#8a1a2a' });
    for (const h of HEROES) r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      E.font.title(g, 'my-3D2dge', r.W / 2, 12 + top, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      E.font.text(g, 'My "3D" 2D Game Engine', r.W / 2, 48 + top, '#e8e0ff', { align: 'center', gradient: ['#ffffff', '#c8b8f0'], shadow: '#140c1c', outline: false });
      E.font.text(g, SLICES[titleMenu.i].about, r.W / 2, r.H - 14, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
    });
    titleMenu.draw(r);
    const dev = game.input.lastDevice, how = dev === 'touch' ? 'Tap a game to play it' : dev === 'gamepad' ? 'D-pad + ' + game.input.label('confirm') + '   ' + game.input.label('start') + ' menu'
      : 'Arrows + Enter or click   V view   - = zoom   M mute';
    r.text(how, r.W / 2, r.H - 26, '#b8b0d8', { align: 'center', shadow: '#000', outline: false });
  }
};

/* ---- GAME OVER: shared by every slice ---- */
const overMenu = new E.Menu(game, ['Retry', 'Title'], { y: 118, onPick: i => game.go(i === 0 ? overMenu.from : 'title') });
const overBg = new E.Backdrop({ sky: ['#12040c', '#3a0c1c', '#6a1a28'], moon: { x: .5, y: .3, r: 16, color: '#e8a0a0' }, stars: 30,
  layers: [{ kind: 'mountains', color: '#2a0c16', y: .72, height: .3, parallax: 0 }, { kind: 'fog', color: '#8a2a3a', y: .9, height: .12, parallax: 0, drift: 4 }] });
scenes.over = {
  view: 'side', input: 'DEFAULT', res: 'ps1',
  enter(d) { overMenu.from = d.from; overMenu.i = 0; A.music(null); A.sfx('die'); game.follow(null); game.focus(0, 0, 0); if (gpu) gpu.enabled = false; L.enabled = false; },
  update(dt) { if (!overMenu.update(dt)) pickOnStart(overMenu); },
  back() { game.go('title'); return true; },   // a phone's back gesture: to the title, not off the page
  draw(r) {   // centred on any screen
    const y = Math.round(r.H / 2) - 60; overMenu.y = y + 58;
    overBg.draw(r); r.overlay(g => E.font.title(g, 'GAME OVER', r.W / 2, y, { align: 'center', scale: 4, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810' })); overMenu.draw(r);
  }
};

/* =====================================================================================
 * SLICE 13  KART  (Super Mario Kart, F-Zero, Mario Kart 64). @modules mode7 drive
 * A circuit in a meadow seen the SNES way, Mode 7: the floor drawn a row at a time under a sky that turns with you,
 * six karts on it, three laps. Kerbs, grass that slows you, sand inside the tight bends, boost pads on the straights,
 * walls round the edge, item boxes in rows across the track: a BOOST, a SHELL that flies ahead and spins out whoever it
 * hits, or a PEEL dropped behind. Hop into a bend and hold the drift: sparks blue, then orange; let go for a boost.
 * MODES: RACE (you against five), VS (two players in a split screen, against four: player 2 joins with 2 on the
 * keyboard or Start on a pad). Then the results. Deep links: #kart/race, #kart/vs.
 * KEYS: left / right (A / D) steer, up / Z gas, down / X brake, Space / Shift hop and drift, E / J the item. A pad: the
 * stick, A gas, X brake, R hop and drift, L the item. TOUCH: the stick steers (pulled down it brakes), DRIFT and ITEM;
 * it accelerates by itself.
 * HOW IT WORKS: E.Mode7 (the mode7 module) draws the floor, the sky and the karts far to near; E.Car and E.Race (the
 * drive module) the karts, the laps, the drivers and the items; this file the track, the look of the karts (HD rigs in
 * karts drawn from whatever side the camera sees), the HUD's map and the menus.
 * ===================================================================================== */
const KART = (() => {
  const A = game.audio, T = 16, N = 64, SIZE = N * T, HALF = 44;   // the floor: 64 x 64 cells of 16 units; the road's half width
  const KEYS = Object.assign({}, E.Input.DEFAULT, { gas: ['ArrowUp', 'KeyW', 'KeyZ', 'Pad0'], brake: ['ArrowDown', 'KeyS', 'KeyX', 'Pad2'], drift: ['Space', 'ShiftLeft', 'ShiftRight', 'KeyC', 'Pad5', 'Pad7'], item: ['KeyE', 'KeyJ', 'Pad4', 'Pad6'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  /* ---- THE TRACK: its line (the racing line, the start at its first point, heading north), then every cell from its
   * distance to the line: road, kerb, grass, sand, wall ---- */
  const LINE = new E.Path([[160, 600], [160, 380], [175, 220], [230, 140], [360, 120], [520, 125], [680, 140], [760, 240], [720, 370], [580, 420], [480, 510], [530, 630], [680, 690], [820, 650], [890, 770], [830, 880], [640, 890], [420, 890], [240, 880], [165, 800]], { closed: true, smooth: 'catmull' });
  const LEN = LINE.length, SANDS = [[620, 320, 90], [770, 790, 70], [300, 230, 60]], BOOSTS = [LEN * .3, LEN * .82], BOXES = [LEN * .2, LEN * .55];
  const cells = [], floor = [];
  for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
    const x = (cx + .5) * T, y = (cy + .5) * T, d = LINE.nearest(x, y), p = LINE.at(d), e = Math.hypot(p.x - x, p.y - y);
    const wall = e > HALF + 46 || cx === 0 || cy === 0 || cx === N - 1 || cy === N - 1;
    let tag = e < HALF ? (BOOSTS.some(b => Math.abs(d - b) < 14) && e < HALF * .55 ? 'boost' : (d < 9 || d > LEN - 9) ? 'start' : null) : e < HALF + 8 ? 'kerb' : 'grass';
    if (tag === 'grass' && SANDS.some(([sx, sy, r]) => Math.hypot(x - sx, y - sy) < r)) tag = 'sand';
    cells.push(wall ? 1 : 0); floor.push(wall ? null : tag);
  }
  const map = new E.TileMap({ w: N, h: N, cells, floor, types: { 1: { h: 30, side: '#8a8478', top: '#b8b2a4' } } });
  // the wall: the out-of-bounds cells beside the track (a low stone wall on the floor); past it a wood, trees standing in it
  const wallAt = (cx, cy) => map.cell(cx, cy) !== 0, edge = new Uint8Array(N * N), TREES = [];
  for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) if (wallAt(cx, cy)) {
    if (!wallAt(cx + 1, cy) || !wallAt(cx - 1, cy) || !wallAt(cx, cy + 1) || !wallAt(cx, cy - 1)) edge[cy * N + cx] = 1;
    else if ((cx * 7 + cy * 13) % 9 === 0 && !edge[cy * N + cx - 1] && !edge[cy * N + cx + 1]) TREES.push([(cx + .5) * T + (cx * 31 % 7) - 3, (cy + .5) * T + (cy * 17 % 7) - 3]);
  }
  // the floor's colors, a texel a unit: asphalt, kerbs, grass in stripes, sand, boost chevrons, the chequered line, walls
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const look = (x, y) => {
    const cx = x >> 4, cy = y >> 4, n = hash(x, y) % 9;
    if (map.cell(cx, cy) > 0) {
      if (!edge[cy * N + cx]) return n > 5 ? [44, 92, 40] : [52, 104, 46];   // (the wood's floor)
      const b = ((y >> 2) & 1 ? x + 4 : x) >> 3; return ((x & 7) === 0 || (y & 3) === 0) ? [110, 100, 88] : (b + (y >> 2)) % 3 ? [196, 188, 170] : [172, 164, 146];
    }
    const tag = map.floorAt(x, y);
    if (tag === 'kerb') return (cx + cy) & 1 ? [236, 236, 236] : [220, 48, 48];
    if (tag === 'grass') return ((x + y) >> 5) & 1 ? [84 + n, 168, 72] : [72 + n, 150, 62];
    if (tag === 'sand') return n > 6 ? [196, 160, 100] : [228, 196, 132];
    if (tag === 'start') return ((x >> 2) + (y >> 2)) & 1 ? [240, 240, 240] : [30, 30, 36];
    if (tag === 'boost') return ((y + (x & 7)) >> 3) & 1 ? [255, 210, 40] : [255, 120, 30];
    return [104 + n, 102 + n, 112 + n];
  };
  const TREE = E.prop('tree', { color: '#3a8a40' }).frames[0];
  const m7 = new E.Mode7({ floor: look, size: [SIZE, SIZE], outside: '#3c7a34', sky: new E.Backdrop('day'), far: 1400 });
  // the map in the HUD's corner: a pixel a cell
  let mini = null;
  const miniMap = () => mini || (mini = (() => { const c = E.mkCanvas(N, N), g = c.getContext('2d'); for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) { const t = map.floorTags[cy * N + cx], w = map.cell(cx, cy) > 0; g.fillStyle = w ? 'rgba(0,0,0,0)' : t === 'grass' || t === 'sand' ? 'rgba(40,90,40,.6)' : '#d8d8e0'; g.fillRect(cx, cy, 1, 1); } return c; })());

  /* ---- THE DRIVERS: six HD rigs, each in a kart of its own colors ---- */
  const CAST = [
    { name: 'NOVA', kart: '#e83030', rig: { hair: 'short', hat: 'cap', colors: { cloth: '#e83030', pants: '#2f5fd0', hair: '#5a3018', hat: '#e83030' } } },
    { name: 'LUMA', kart: '#3aa850', rig: { hair: 'ponytail', colors: { cloth: '#3aa850', pants: '#f0e8d0', hair: '#e8c060' } } },
    { name: 'BRAKK', kart: '#e8a020', rig: { build: 'bulky', hair: 'spiky', colors: { cloth: '#e8a020', pants: '#5a3a2a', hair: '#2a1a10' } } },
    { name: 'IRIS', kart: '#c050e0', rig: { hair: 'long', colors: { cloth: '#c050e0', pants: '#3a2a5a', hair: '#f0f0f8' } } },
    { name: 'TOK', kart: '#30b8e0', rig: { hat: { style: 'band', color: '#ffffff' }, colors: { cloth: '#30b8e0', pants: '#1a3a5a', hair: '#1a1a1a' } } },
    { name: 'ROOK', kart: '#5a5a6a', rig: { hood: true, colors: { cloth: '#3a3a48', pants: '#22222c', hair: '#1a1a1a' } } }
  ];
  const rigOf = c => new E.Humanoid(Object.assign({ size: .85, weapon: null }, c.rig));   // (made afresh each race: a rig's blinks draw on Math.random, so a race replays exactly)
  const SONG = { bpm: 148, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'C5 . E5 G5 . E5 C5 . | D5 . F5 A5 . F5 D5 . | E5 . G5 C6 . G5 E5 . | D5 . B4 G4 . A4 B4 .' },
    { wave: 'triangle', vol: .26, notes: 'C3 C3 G2 G2 C3 C3 G2 G2 | D3 D3 A2 A2 D3 D3 A2 A2 | E3 E3 B2 B2 C3 C3 G2 G2 | G2 G2 D3 D3 G2 G2 B2 B2' },
    { wave: 'drums', vol: .07, notes: 'k . h k s . h . k . h k s . h h' }] };

  let mode = 'menu', vs = false, race = null, players = [], cams = [], over = 0, t = 0;
  const menu = new E.Menu(game, ['RACE', 'VS (2 PLAYERS)', 'BACK'], { onPick: i => i === 2 ? game.go('title') : i === 1 ? versus() : start(false) });
  const after = new E.Menu(game, ['RACE AGAIN', 'MENU'], { onPick: i => i === 0 ? start(vs) : toMenu() });
  function toMenu() { mode = 'menu'; race = null; game.splitScreen(0); A.music('title'); }
  function versus() { if (game.players.length >= 2) start(true); else { mode = 'join'; A.sfx('select'); } }
  /** a race: six karts on the grid (the players' at the back, as Super Mario Kart starts you), items in rows */
  function start(two) {
    vs = two; mode = 'race'; over = 0; t = 0;
    race = new E.Race({ path: LINE, laps: 3, width: HALF, checkpoints: 10 });
    const grid = race.grid(6), order = two ? [2, 3, 4, 5, 0, 1] : [1, 2, 3, 4, 5, 0];
    players = [];
    order.forEach((ci, k) => {
      const c = CAST[ci], g = grid[k], car = new E.Car(Object.assign({ kart: true, top: 205, accel: 150, turn: 2.3, grip: 9, drift: 2, r: 9 }, g));
      const human = ci === 0 || (two && ci === 1), R = race.add(car, human ? { name: c.name, input: game.players[ci] || game.input } : { name: c.name, ai: { skill: .9 + ci * .012, rubber: .25 } });
      R.cast = c; R.rig = rigOf(c); if (human) players[ci] = R;
    });
    for (const d of BOXES) { const p = LINE.at(d); for (const u of [-.6, -.2, .2, .6]) race.box(p.x - Math.sin(p.angle) * u * HALF, p.y + Math.cos(p.angle) * u * HALF); }
    cams = players.map(R => ({ x: R.car.x, y: R.car.y, h: 24, angle: R.car.angle, pitch: 9, fov: 62 }));
    game.splitScreen(two ? 2 : 0, { layout: 'rows' }); A.music(SONG); game.input.consumeAll();
  }

  /* ---- each step ---- */
  function update(dt) {
    const I = game.input;
    for (const k of ['drift', 'item']) I.touchSet(k, null, mode === 'race');
    if (mode === 'menu' || mode === 'join') t += dt;   // (the title's camera rides the line)
    if (mode === 'menu') { menu.update(dt); return; }
    if (mode === 'join') { if (game.players.length >= 2) start(true); else if (I.pressed('cancel')) mode = 'menu'; return; }
    t += dt;
    const was = race.t; for (const R of players) if (R.input) R.car.o.auto = R.input.lastDevice === 'touch';   // (a phone: the gas by itself)
    race.update(dt, map);
    if (was < 0 && Math.floor(was) !== Math.floor(race.t)) A.sfx(race.t >= 0 ? 'confirm' : 'select');
    for (const R of players) {
      if (R.input && R.input.pressed('item') && race.go) { const had = R.item; race.use(R); if (had) A.sfx(had === 'shot' ? 'shoot' : had === 'boost' ? 'powerup' : 'whoosh'); }
      if (R.car.bumped) A.sfx('bump', { vol: .4 });
      if (R.lap !== R._lap) { if (R._lap !== undefined && !R.finished) A.sfx('oneup'); if (R.finished && !R._fin) { A.sfx('secret'); R._fin = true; } R._lap = R.lap; }
    }
    // each camera behind its kart, turning after it (a drift swings the kart, not the view)
    const tall = game.H > game.W * (vs ? .5 : 1);   // (a phone held upright: further back, wider, so the track shows past the kart)
    players.forEach((R, i) => { const c = cams[i], k = 1 - Math.exp(-dt * 5); c.angle += E.angDiff(c.angle, R.car.angle) * k; m7.cam = c; m7.chase({ x: R.car.x, y: R.car.y, angle: c.angle }, { back: tall ? 74 : 42, h: (tall ? 38 : 24) + R.car.z * .5 }); c.pitch = tall ? 13 : 9; c.fov = tall ? 84 : 62; });
    // the riders: seated, leaning into the turn
    for (const R of race.racers) R.rig.update(dt, { x: R.car.x, y: R.car.y, z: 0, vx: 0, vy: 0, facing: R.car.angle, down: .4, hurt: R.car.spinT > 0 });
    if (players.length && players.every(R => R && R.finished)) { over += dt; if (over > 2.5 && mode === 'race') { mode = 'results'; after.i = 0; } }
    if (mode === 'results') after.update(dt);
  }

  /* ---- the look ---- */
  // a box of the kart (center l, half sizes h, local: forward x, right y, up z) seen through view v, its foot at (X, Y)
  function box(g, v, X, Y, a, l, h, col) {
    const c = Math.cos(a), s = Math.sin(a), P = (lx, ly, lz) => { const wx = lx * c - ly * s, wy = lx * s + ly * c; return [X + v.ax * wx + v.ay * wy, Y + v.bx * wx + v.by * wy + v.bz * lz]; };
    const [x0, y0, z0] = [l[0] - h[0], l[1] - h[1], l[2] - h[2]], [x1, y1, z1] = [l[0] + h[0], l[1] + h[1], l[2] + h[2]], dk = E.shade(col, -.25), dk2 = E.shade(col, -.4);
    for (const [nx, ny, q, k] of [[1, 0, [[x1, y0], [x1, y1]], dk], [-1, 0, [[x0, y1], [x0, y0]], dk], [0, 1, [[x1, y1], [x0, y1]], dk2], [0, -1, [[x0, y0], [x1, y0]], dk2]]) {
      if ((nx * c - ny * s) * v.dx + (nx * s + ny * c) * v.dy <= 0) continue;   // (a side turned away)
      E.px.poly(g, [P(q[0][0], q[0][1], z0), P(q[1][0], q[1][1], z0), P(q[1][0], q[1][1], z1), P(q[0][0], q[0][1], z1)], k);
    }
    E.px.poly(g, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], col);
  }
  const PARTS = [   // [center, half sizes, color: 'k' the kart's, else its own] (forward x, right y, up z)
    [[7.5, 8.2, 2.4], [2.7, 1.8, 2.4], '#1a1a20'], [[7.5, -8.2, 2.4], [2.7, 1.8, 2.4], '#1a1a20'], [[-7.5, 8.7, 2.7], [3, 2.1, 2.7], '#1a1a20'], [[-7.5, -8.7, 2.7], [3, 2.1, 2.7], '#1a1a20'],
    [[0, 0, 2.4], [10.5, 6, 1.2], 'k'], [[8, 0, 4], [3.6, 5.2, 2.2], 'k'], [[-9.6, 0, 4.5], [2.1, 4.5, 2.4], '#4a4a54'], [[-5, 0, 5.6], [1, 4, 3], 'k']];
  function drawKart(g, sx, sy, k, R) {
    const v = m7.view(k), car = R.car, a = car.angle + (car.spinT > 0 ? 0 : car.drifting * .35), ground = m7.project(car.x, car.y, 0), dx = v.dx, dy = v.dy;
    if (ground) { const al = g.globalAlpha; g.globalAlpha = al * .4; E.px.ell(g, ground[0], ground[1], 13 * k, 4 * k, '#102010'); g.globalAlpha = al; }
    const c = Math.cos(a), s = Math.sin(a), depth = l => (l[0] * c - l[1] * s) * dx + (l[0] * s + l[1] * c) * dy, items = PARTS.map(p => [depth(p[0]), () => box(g, v, sx, sy, a, p[0], p[1], p[2] === 'k' ? R.cast.kart : p[2])]);
    const seat = [-2.4, 0, 3.4], wx = seat[0] * c, wy = seat[0] * s;
    items.push([depth(seat), () => R.rig.draw(g, Math.round(sx + v.ax * wx + v.ay * wy), Math.round(sy + v.bx * wx + v.by * wy + v.bz * seat[2]), v)]);
    items.sort((p, q) => p[0] - q[0]); for (const [, f] of items) f();
    if (car.drifting && car.charge > .4) for (const side of [-1, 1]) { const lx = -9, ly = side * 8.7, X = sx + v.ax * (lx * c - ly * s) + v.ay * (lx * s + ly * c), Y = sy + v.bx * (lx * c - ly * s) + v.by * (lx * s + ly * c); E.px.disc(g, X, Y - k, Math.max(1, 1.6 * k), car.charge >= 2 ? (t * 20 % 2 < 1 ? '#ff9a2a' : '#ffe060') : (t * 20 % 2 < 1 ? '#58b8ff' : '#d8f0ff')); }
    if (car.boostT > 0) { const lx = -12, X = sx + v.ax * lx * c + v.ay * lx * s, Y = sy + v.bx * lx * c + v.by * lx * s + v.bz * 3; E.px.disc(g, X, Y, Math.max(1, (2 + Math.sin(t * 40)) * k), '#ffb040'); }
  }
  // the wood's trees within sight of a camera (ahead of it, not too far)
  function trees(c) { const fx = Math.cos(c.angle), fy = Math.sin(c.angle); for (const [x, y] of TREES) { const d = (x - c.x) * fx + (y - c.y) * fy; if (d > 40 && d < 900) m7.sprite(TREE, x, y, 0, { scale: 1.6 }); } }
  function draw(r) {
    const W = r.W, H = r.H;
    if (mode === 'menu' || mode === 'join') {
      const p = LINE.at(t * 40); m7.cam = { x: p.x, y: p.y, h: 60, angle: p.angle, pitch: 14, fov: 70 }; trees(m7.cam);
      m7.draw(r);
      r.overlay(g => {
        E.font.title(g, 'KART', W / 2, 30, { scale: 4, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8402a'] });
        if (mode === 'join') E.font.text(g, 'PLAYER 2: PRESS 2 OR START ON A PAD', W / 2, H / 2, '#ffffff', { align: 'center', shadow: '#000', outline: false });
      });
      if (mode === 'menu') { menu.y = Math.round(H / 2) - 6; menu.draw(r); }
      return;
    }
    const i = r.viewport ? r.viewport.i : 0, me = players[vs ? i : 0], cam = cams[vs ? i : 0];
    trees(cam);
    for (const R of race.racers) m7.add(R.car.x, R.car.y, R.car.z, (g, sx, sy, k) => drawKart(g, sx, sy, k, R));
    for (const b of race.boxes) if (b.t <= 0) m7.add(b.x, b.y, 6 + Math.sin(t * 4) * 1.5, (g, sx, sy, k) => { const s = 7 * k, hue = (t * 120 + b.x) % 360; E.px.rect(g, sx - s, sy - s * 2, s * 2, s * 2, E.hsl(hue, .8, .55)); E.px.rect(g, sx - s + 1, sy - s * 2 + 1, s * 2 - 2, s * 2 - 2, E.hsl(hue, .7, .7)); if (s > 4) E.font.text(g, '?', Math.round(sx), Math.round(sy - s * 1.6), '#ffffff', { align: 'center', outline: false, shadow: '#000', scale: s > 12 ? 2 : 1 }); });
    for (const s of race.shots) m7.add(s.x, s.y, 2, (g, sx, sy, k) => { E.px.disc(g, sx, sy - 3 * k, 4 * k, '#2a9a2a'); E.px.disc(g, sx - k, sy - 4 * k, 2 * k, '#8af08a'); });
    for (const h of race.hazards) m7.add(h.x, h.y, 0, (g, sx, sy, k) => { E.px.poly(g, [[sx - 5 * k, sy], [sx, sy - 6 * k], [sx + 5 * k, sy], [sx, sy - 2 * k]], '#f0d030'); });
    m7.draw(r, cam);
    if (me) race.hud(r, me, { color: vs ? (i ? '#ffd080' : '#a0d8ff') : '#ffffff', right: r.viewport && r.viewport.y > 0 ? null : cornerX() });
    if (!vs && me) r.overlay(g => {   // the map: the track, every kart a dot (yours blinking)
      const S = Math.max(40, Math.min(64, Math.round(H / 4))), X = 4, Y = H - S - 4, ta = game.input.touchArea && game.input.touchArea();
      if (ta) return;   // (a phone: the buttons sit there)
      g.globalAlpha = .85; g.drawImage(miniMap(), X, Y, S, S); g.globalAlpha = 1;
      for (const R of race.racers) { if (R === me && Math.floor(t * 4) % 2) continue; E.px.rect(g, X + R.car.x / SIZE * S - 1, Y + R.car.y / SIZE * S - 1, 3, 3, R.cast.kart); }
    });
    if (!vs) board(r);
  }
  // the results: every kart's place and time, and what next (over the whole screen, a split screen's too: hud)
  function board(r) {
    if (mode !== 'results') return;
    const W = r.W, H = r.H;
    r.overlay(g => {
      const w = 170, h = 16 + race.racers.length * 11, x = Math.round((W - w) / 2), y = Math.round(H / 2 - h / 2 - 20);
      E.ui.box(g, x, y, w, h, { bg: '#141a3a', border: '#e8e4ff' });
      race.racers.slice().sort((a, b) => a.place - b.place).forEach((R, k) => { const yy = y + 8 + k * 11, fin = R.finished ? Math.floor(R.time / 60) + "'" + (R.time % 60).toFixed(2).padStart(5, '0') : '--'; E.font.text(g, R.place + '. ' + R.name, x + 8, yy, players.includes(R) ? '#ffe04a' : '#ffffff', { outline: false }); E.font.text(g, fin, x + w - 8, yy, '#c8c8e0', { align: 'right', outline: false }); });
    });
    after.y = Math.round(H / 2) + 52; after.draw(r);
  }

  /** the bot (tools/kits-test.mjs): a race with every kart driven by its driver (yours too) to the end; then a race for
   *  two in a split screen, both players holding the gas a while */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s);
    try {
      game.go('kart', null, { fade: 0 }); game.advance(1 / 120); start(false);
      players[0].ai = { skill: .9, rubber: .25, grip: 520, lane: 0 }; players[0].input = null;
      let n = 0, stuck = 0; for (; n < 240 && !race.over; n++) { game.advance(1); for (const R of race.racers) stuck = Math.max(stuck, R._stuck); }
      const one = { finished: race.results.length, laps: race.racers.map(R => R.lap), seconds: n, best: Math.min(...race.racers.map(R => R.best || 99)).toFixed(1) };
      if (game.players.length < 2) game.addPlayer({ keys: 'right' });
      start(true); const P = game.players; P[0].hold('gas'); P[1].hold('gas'); game.advance(9); P[0].hold('gas', false); P[1].hold('gas', false);
      const two = { viewports: game.viewports.length, prog: players.map(R => Math.round(R.prog)), names: players.map(R => R.name) };
      toMenu(); game.removePlayer(2);
      return Object.assign(one, { split: two, stuck: +stuck.toFixed(2), errors: game.errors.length });
    } finally { Math.random = was; }
  }

  return { view: 'topdown', views: ['topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['drift', 'item'], camera: { zoom: false },
    enter(d) {
      mode = 'menu'; race = null; menu.i = 0; game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false;
      game.allowJoin({ max: 2 }); A.music('title');
      if (d && d.part) d.part === 'vs' ? versus() : start(false);
    },
    exit() { game.splitScreen(0); game.allowJoin(false); },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'join' || mode === 'results') { toMenu(); return true; } return false; },
    update, draw, bot, hud: board,
    state: () => race && { mode, t: +race.t.toFixed(2), you: players[0] && { x: players[0].car.x, y: players[0].car.y, angle: players[0].car.angle, speed: players[0].car.speed, auto: players[0].car.o.auto }, racers: race.racers.map(R => ({ name: R.name, lap: R.lap, place: R.place, x: Math.round(R.car.x), y: Math.round(R.car.y), speed: Math.round(R.car.speed), item: R.item })) },   // for tests
    race: () => race,   // (for tests)
    /** the proof: a race, the gas held, a hop and a drift into the first bend, the item fired; a hash of every kart */
    run: (n = 600) => proof('kart', n, (i, k) => {
      if (i === 2) start(false);
      if (i === 380) k.hold('gas');
      if (i === 520) { k.hold('right'); k.tap('drift'); k.hold('drift'); }
      if (i === 580) { k.up('right'); k.up('drift'); k.tap('item'); }
    }, () => race ? race.racers.map(R => [R.car.x, R.car.y, R.car.angle, R.prog]) : null, () => { game.input.lastDevice = 'keyboard'; }) };   // (fresh: the gas by itself follows the device, which the proof's holds turn to touch)
})();
scenes.kart = KART;

/* ---- START: the title menu, or a slice named in the address (#platformer) ---- */
// a genre kit file holds one slice: the menu lists only the slices in this file
for (let i = SLICES.length - 1; i >= 0; i--) if (!scenes[SLICES[i].id]) SLICES.splice(i, 1);
titleMenu = menuOf(SLICES, { y: 76, onPick: i => game.go(SLICES[i].id) });
// #<slice>/<part> jumps in (#arcade/maze, #shooter/horizontal): the slice's enter(data) gets { part }; a part that is a
// scene of its own (the slice's parts: { battle: 'rpg-battle' }) starts there
const [first, part] = (location.hash || '').slice(1).split('/'), sc = scenes[first], to = sc && part && sc.parts && sc.parts[part];
game.start({ scenes, scene: to || (sc ? first : 'title'), data: sc && part ? { part } : undefined });
window.__game = { game, scenes, titleMenu };   // for tests
})();
/* =============================== GAME END =============================== */
