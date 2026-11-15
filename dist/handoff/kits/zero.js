// The ZERO kit's game (anti-gravity racing in Mode 7: a night city circuit with energy, dash plates and a pit, and a ribbon track raised on pillars that climbs and crosses itself; two to four players split), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 168 (src/starter/67-zero.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. zero.html plays it; node kits/test.mjs zero runs it headless.
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
 * WORDS: every word a player reads is a line in the page's game-lines block (in <head>), shown with E.t('id', values), so
 * the game can be played in any language a translation adds (AI Hub Languages v1; ?lang=en-XA, zh-XC or ar-XB test it).
 * Each part's lines live beside it in the repo (src/starter/<part>.lines.json); the build writes the block.
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
// button's name) on a touch screen, where the buttons sit over the bottom corner: touch() says so, to move a prompt off it.
// word is a line (E.t), and the two are a line too (starter.prompt), so a language can put them the other way round
const prompt = (a, word) => E.t('starter.prompt', { key: game.input.label(a), word }), touch = () => game.input.lastDevice === 'touch';
// each slice: its scene's id, its title entry, a line about it, and its family (the title groups them under it), as lines:
// starter.slice.<id>, starter.slice.<id>.about and starter.family.<family>
const SLICES = [
  { id: 'adventure', label: 'ADVENTURE', about: 'TOP-DOWN ACTION ADVENTURE', family: 'ACTION ADVENTURE' },
  { id: 'pointclick', label: 'POINT-AND-CLICK', about: 'RELIGHT THE LIGHTHOUSE ON GULL ROCK', family: 'ADVENTURE' },
  { id: 'platformer', label: 'PLATFORMER', about: 'SIDE-SCROLLING PLATFORMER', family: 'PLATFORM' },
  { id: 'metroidvania', label: 'METROIDVANIA', about: 'A WORLD OF ROOMS, ITS MAP, ITS GATES', family: 'PLATFORM' },
  { id: 'brawler', label: 'BRAWLER', about: 'SIDE-SCROLLING BEAT-EM-UP', family: 'FIGHTING' },
  { id: 'fighting', label: 'FIGHTING', about: 'ONE ON ONE, BEST OF THREE', family: 'FIGHTING' },
  { id: 'shooter', label: 'SHOOTER', about: 'VERTICAL SHOOT-EM-UP', family: 'ARCADE' },
  { id: 'blaster', label: 'BLASTER', about: 'INTO THE SCREEN: A HERO, A JET, A RIDE', family: 'ARCADE' },
  { id: 'arcade', label: 'ARCADE', about: 'A CABINET OF THREE CLASSICS', family: 'ARCADE' },
  { id: 'pinball', label: 'PINBALL', about: 'ONE TABLE: RAMP, MULTIBALL, JACKPOT', family: 'ARCADE' },
  { id: 'kart', label: 'KART', about: 'MODE 7 KARTS, THREE LAPS', family: 'RACING' },
  { id: 'road', label: 'ROAD', about: 'A COAST ROAD, ITS FORKS, A CHASE', family: 'RACING' },
  { id: 'zero', label: 'ZERO', about: 'ANTI-GRAVITY: A CITY, A RIBBON IN THE SKY', family: 'RACING' },
  { id: 'special', label: 'SPECIAL', about: 'A PLANET, A HALF-PIPE, AN ARENA, A TURNING FORT', family: 'ARCADE' },
  { id: 'sky', label: 'SKY', about: 'A FLIGHT SCHOOL, A SKYDIVE, AN AIRSHIP', family: 'FLIGHT' },
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
].map(s => Object.assign(s, { label: E.t('starter.slice.' + s.id, null, s.label), about: E.t('starter.slice.' + s.id + '.about', null, s.about), family: s.family && E.t('starter.family.' + s.family.toLowerCase().replace(/ /g, '_'), null, s.family) }));   // (a slice of your own without lines yet shows its own words)
/* the camera: each slice's scene says how the player may zoom it, camera: { zoom: [min, max] | false, start, tall }: the
   engine zooms it with the mouse wheel, - and =, a pinch on a phone and Settings, Camera zoom (the player's own, kept, on
   top of the slice's start: tall on a phone held upright). Keys every slice shares besides: V changes the camera view,
   [ and ] turn it (camera.rotate), 0 resets it (the player's zoom too), G toggles GPU lighting, M mutes */
const camOpt = () => (game.scene && game.scene.camera) || {};
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'KeyV') { game.nextView(); game.note(E.lang.upper(E.t('starter.note.view', { view: game.view.label }))); }
  else if (e.code === 'Digit0') { game.settings.set('zoom', 1); game.resetCamera(); game.note(E.t('starter.note.camera_reset')); }   // (resetCamera draws it at once)
  else if ((e.code === 'BracketLeft' || e.code === 'BracketRight') && camOpt().rotate) { game.rotateView(e.code === 'BracketLeft' ? -45 : 45); game.note(E.t('starter.note.turn', { angle: game.yaw })); }
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
    titleMenu.y = 76 + top + (E.lang.big ? E.font.lineHeight({ scale: 4 }) - 40 : 0);   // (below a taller logo)
    titleBg.draw(r);
    stage.draw(r);
    for (const x of [MID - 100, MID + 100]) r.prop('torch', x, 0, 32, { size: 1.3, light: false });
    for (const x of [MID - 53, MID + 53]) r.prop('banner', x, -8, 64, { size: 1.1, color: '#8a1a2a' });
    for (const h of HEROES) r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view));
    const lh = E.font.lineHeight();   // (lines measured, not counted: a language the device's font draws has taller ones)
    r.overlay(g => {
      const logo = E.font.title(g, E.t('starter.logo'), r.W / 2, 12 + top, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      E.font.text(g, E.t('starter.tagline'), r.W / 2, 12 + top + logo.h, '#e8e0ff', { align: 'center', gradient: ['#ffffff', '#c8b8f0'], shadow: '#140c1c', outline: false });
      E.font.text(g, SLICES[titleMenu.i].about, r.W / 2, r.H - 4 - lh, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
    });
    titleMenu.draw(r);
    const dev = game.input.lastDevice, how = E.t(dev === 'touch' ? 'starter.how.touch' : dev === 'gamepad' ? 'starter.how.pad' : 'starter.how.keys');
    r.text(how, r.W / 2, r.H - 6 - 2 * lh, '#b8b0d8', { align: 'center', shadow: '#000', outline: false });
  }
};

/* ---- GAME OVER: shared by every slice ---- */
const overMenu = new E.Menu(game, [E.t('starter.over.retry'), E.t('starter.over.title')], { y: 118, onPick: i => game.go(i === 0 ? overMenu.from : 'title') });
const overBg = new E.Backdrop({ sky: ['#12040c', '#3a0c1c', '#6a1a28'], moon: { x: .5, y: .3, r: 16, color: '#e8a0a0' }, stars: 30,
  layers: [{ kind: 'mountains', color: '#2a0c16', y: .72, height: .3, parallax: 0 }, { kind: 'fog', color: '#8a2a3a', y: .9, height: .12, parallax: 0, drift: 4 }] });
scenes.over = {
  view: 'side', input: 'DEFAULT', res: 'ps1',
  enter(d) { overMenu.from = d.from; overMenu.i = 0; A.music(null); A.sfx('die'); game.follow(null); game.focus(0, 0, 0); if (gpu) gpu.enabled = false; L.enabled = false; },
  update(dt) { if (!overMenu.update(dt)) pickOnStart(overMenu); },
  back() { game.go('title'); return true; },   // a phone's back gesture: to the title, not off the page
  draw(r) {   // centred on any screen
    const y = Math.round(r.H / 2) - 60; overMenu.y = y + 58;
    overBg.draw(r); r.overlay(g => E.font.title(g, E.t('starter.over'), r.W / 2, y, { align: 'center', scale: 4, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810' })); overMenu.draw(r);
  }
};

/* =====================================================================================
 * SLICE 26  ZERO  (F-Zero, F-Zero X, Power Drift; Street Racer's four players). @modules mode7 mesh drive
 * Anti-gravity racing in Mode 7, six machines, three laps. NEON CITY: a night circuit on the floor, its magnetic barriers
 * draining energy, dash plates, a pit lane that fills it back up. SKY RIBBON: a track raised on pillars over the desert
 * that climbs, banks and crosses over itself (a figure of eight, the low pass under the high one). Energy is your
 * life and your boost: from the second lap, BOOST spends some of it for a burst; out of it, the machine limps.
 * GRAND PRIX: both tracks, points for places. VS: two to four players in a split screen on the city.
 * Deep links: #zero/gp, #zero/city, #zero/sky, #zero/vs; #zero/gba the Grand Prix at the Game Boy Advance's 240 x 160.
 * KEYS: left / right steer, up / Z gas, down / X brake, Space / C boost. A pad: the stick, A gas, X brake, B boost.
 * TOUCH: the stick steers, it accelerates by itself; BOOST.
 * HOW IT WORKS: E.Mode7 (the mode7 module) draws the floors, and the ribbon as m7.quad strips over them; E.Car and
 * E.Race (the drive module) the machines, the laps and the drivers (heights: true, as the ribbon crosses itself); E.Mesh
 * (the mesh module) the machines; this file the tracks, the energy, the ribbon's walls and the HUD.
 * ===================================================================================== */
const ZERO = (() => {
  const KEYS = Object.assign({}, E.Input.DEFAULT, { gas: ['ArrowUp', 'KeyW', 'KeyZ', 'Pad0', 'Pad7'], brake: ['ArrowDown', 'KeyS', 'KeyX', 'Pad2', 'Pad6'], boost: ['Space', 'KeyC', 'ShiftLeft', 'Pad1', 'Pad5'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const MACHINE = new E.Mesh([['box', [2, 0, 3.4], [13, 6, 1.8], 'body', { top: [.8, .7], tip: [-2, 0] }], ['box', [12, 0, 3], [5, 3.6, 1.2], 'body', { top: [.4, .6] }], ['ball', [1, 0, 6], [5, 2.6, 2], '#8ae8ff', { n: 6 }],
    ['tube', [-11, 4.6, 3.6], 1.8, 3, '#3a3a46', { mirror: true, n: 6 }], ['tube', [-14.4, 4.6, 3.6], 1.3, .4, 'glow', { mirror: true, n: 6 }], ['face', [[-6, 6, 4.4], [-13, 6, 4.4], [-14, 10.5, 3.8], [-9, 10.5, 3.8]], 'trim', { both: true, mirror: true }],
    ['face', [[-8, 0, 5], [-13, 0, 5], [-14, 0, 9.5], [-11, 0, 9.5]], 'trim', { both: true }]]);
  const CAST = [{ name: 'zero.name.flare', body: '#3a6ae8', trim: '#ffd040' }, { name: 'zero.name.vex', body: '#e8402a', trim: '#f0f0f0' }, { name: 'zero.name.moss', body: '#3ac85a', trim: '#1a3a2a' },
    { name: 'zero.name.halo', body: '#f0e050', trim: '#c83aa8' }, { name: 'zero.name.drift', body: '#c83ae8', trim: '#3ae0ff' }, { name: 'zero.name.ash', body: '#8a8a9a', trim: '#e83a3a' }];
  /* ---- NEON CITY: a line round a 2048-unit floor, the walls and the floor's tags from each cell's distance to it ---- */
  const T = 16, N = 128, HALF = 52;
  const CITY = new E.Path([[400, 1450], [400, 900], [520, 500], [900, 360], [1400, 380], [1650, 560], [1640, 900], [1350, 1050], [1300, 1300], [1600, 1450], [1700, 1750], [1450, 1880], [900, 1860], [560, 1840], [410, 1720], [400, 1580]], { closed: true, smooth: 'catmull' });   // (the line partway up the straight, so the grid behind it stands on the straight too)
  const CL = CITY.length, PIT = [CL * .02, CL * .11], DASH = [CL * .3, CL * .55, CL * .8];
  let city = null;
  function buildCity() {
    const cells = [], floor = [];
    for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
      const x = (cx + .5) * T, y = (cy + .5) * T, d = CITY.nearest(x, y), p = CITY.at(d), e = Math.hypot(p.x - x, p.y - y), side = (x - p.x) * -Math.sin(p.angle) + (y - p.y) * Math.cos(p.angle);
      const wall = e > HALF + 10 || cx === 0 || cy === 0 || cx === N - 1 || cy === N - 1;
      const tag = e < HALF ? (d > PIT[0] && d < PIT[1] && side > HALF * .35 ? 'pit' : DASH.some(b => Math.abs(d - b) < 12) && e < HALF * .5 ? 'boost' : d < 10 || d > CL - 10 ? 'start' : null) : 'kerb';
      cells.push(wall ? 1 : 0); floor.push(wall ? null : tag);
    }
    const map = new E.TileMap({ w: N, h: N, cells, floor, types: { 1: { h: 30, side: '#2a2a3a', top: '#3a3a4a' } } });
    const look = (x, y) => {
      const cx = x >> 4, cy = y >> 4, n = hash(x >> 1, y >> 1) % 7;
      if (map.cell(cx, cy) > 0) { const lit = (hash(x >> 5, y >> 5) % 5) === 0 && (x & 7) > 1 && (y & 7) > 1; return lit ? [230, 200, 110] : ((x >> 5) + (y >> 5)) % 3 ? [26 + n, 28 + n, 44 + n] : [34, 36, 54]; }
      const tag = map.floorAt(x, y);
      if (tag === 'kerb') return (((x + y) >> 4) & 1) ? [255, 58, 176] : [58, 224, 255];
      if (tag === 'pit') return ((x + y) >> 3) & 1 ? [40, 120, 96] : [52, 150, 120];
      if (tag === 'start') return ((x >> 3) + (y >> 3)) & 1 ? [240, 240, 240] : [24, 24, 30];
      if (tag === 'boost') return ((y + (x & 15)) >> 4) & 1 ? [255, 220, 40] : [255, 130, 30];
      return ((x & 31) === 0 || (y & 31) === 0) ? [70, 76, 104] : [56 + n, 60 + n, 82 + n];
    };
    const m7 = new E.Mode7({ floor: look, size: [N * T, N * T], texel: 2, outside: '#1a1c2a', sky: new E.Backdrop('city-night'), far: 1600, fog: { color: '#2a2440', near: 700, far: 1600 } });
    const towers = []; const R = E.rng(9);
    for (let i = 0; i < 70; i++) { const x = 80 + R() * 1890, y = 80 + R() * 1890, p = CITY.at(CITY.nearest(x, y)); if (Math.hypot(p.x - x, p.y - y) > HALF + 50) towers.push({ x, y, w: 30 + R() * 30, h: 60 + R() * 140, c: ['#2a2e4a', '#3a2a4a', '#2a3a48'][i % 3], seed: i }); }
    return { map, m7, towers };
  }
  /* ---- SKY RIBBON: a figure of eight in the air (the line's points [x, y, z]), its segments, pillars and shadow ---- */
  const HW = 64, RIB = new E.Path(Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return [2048 + 1500 * Math.sin(a), 2048 + 1050 * Math.sin(a) * Math.cos(a), 230 + 170 * Math.cos(a) + 30 * Math.sin(a * 3)]; }), { closed: true, smooth: 'catmull' });
  const RL = RIB.length, STEP = 64;
  let sky = null;
  function buildSky() {
    const segs = [];
    for (let s = 0; s < RL; s += STEP) {
      const p = RIB.at(s), q = RIB.at(s + 30), bank = clamp(E.angDiff(p.angle, q.angle) * 9, -.45, .45), rx = -Math.sin(p.angle), ry = Math.cos(p.angle), dz = Math.sin(bank) * HW;
      segs.push({ s, x: p.x, y: p.y, z: p.z, dz, bank, L: [p.x - rx * HW, p.y - ry * HW, p.z + dz], R: [p.x + rx * HW, p.y + ry * HW, p.z - dz] });
    }
    segs.forEach((a, k) => {   // the pillars under every fourth stretch, two abreast; none where the track passes underneath (they'd stand in its road)
      a.pil = []; if (k % 4) return;
      for (const off of [-.5, .5]) {
        const ux = (a.R[0] - a.L[0]) / (2 * HW) * 10, uy = (a.R[1] - a.L[1]) / (2 * HW) * 10, x = a.x + (a.R[0] - a.x) * off, y = a.y + (a.R[1] - a.y) * off;
        if (!segs.some(q => q.z < a.z - 40 && Math.hypot(q.x - x, q.y - y) < HW + 14)) a.pil.push([[x - ux, y - uy, 0], [x + ux, y + uy, 0], [x + ux, y + uy, a.z - 4], [x - ux, y - uy, a.z - 4]]);
      }
    });
    const cv = E.mkCanvas(1024, 1024), g = cv.getContext('2d'), img = g.createImageData(1024, 1024), d = img.data;
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) { const n = hash(x, y) % 8, m = E.noise2(x / 40, y / 40), i = (y * 1024 + x) * 4, c = m > .66 ? [150 + n, 96, 70] : ((x >> 4) + (y >> 4)) & 1 ? [214 - n, 168, 112] : [206 - n, 160, 106]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    for (const q of segs) px.disc(g, (q.x + q.z * .35) / 4, (q.y + q.z * .45) / 4, HW / 4, '#8a6a4a');   // (its shadow, cast by a sun high in the north-west)
    return { segs, m7: new E.Mode7({ floor: cv, texel: 4, outside: '#c8a070', sky: new E.Backdrop('desert'), far: 3000, fog: { color: '#e8c898', near: 1400, far: 3000 } }) };
  }
  // the ribbon as the cars' map: its height under a car is the ground (it rides it, gripping), and its rails are the
  // walls (a car past one is put back on, E.Body bouncing it: a knock); its z picks the right pass where it crosses
  const RIBMAP = { floorAt: () => null,
    groundAt: (x, y, r, z) => RIB.at(RIB.nearest(x, y, z)).z,
    collide(b) { const p = RIB.at(RIB.nearest(b.x, b.y, b.z)), rx = -Math.sin(p.angle), ry = Math.cos(p.angle), u = (b.x - p.x) * rx + (b.y - p.y) * ry, lim = HW - 9; if (Math.abs(u) <= lim) return false; b.x = p.x + rx * Math.sign(u) * (lim - 2); b.y = p.y + ry * Math.sign(u) * (lim - 2); return true; } };   // (pushed off it a little)
  /** a car on the ribbon: held to its surface (it grips down a slope as up one), its slope (the camera pitches with it) */
  const RPIT = [RL * .62, RL * .72];   // (the ribbon's pit: a green stretch that fills energy back up)
  /** the ribbon's surface at distance s and u across (+ right, in units): its height there and its bank (the stretches' own, between them) */
  function surf(s, u) {
    s = ((s % RL) + RL) % RL; const S = sky.segs, k = Math.min(S.length - 1, Math.floor(s / STEP)), a = S[k], b = S[(k + 1) % S.length], t = (s - a.s) / ((k + 1 < S.length ? b.s : RL) - a.s), dz = a.dz + (b.dz - a.dz) * t;
    return { z: RIB.at(s).z - dz * u / HW, bank: a.bank + (b.bank - a.bank) * t };
  }
  function ride(R) {   // (held to it: down a slope it never leaves the ground; at the middle's height, so its place on the line is exact, drawn lifted by the bank)
    const c = R.car, s = RIB.nearest(c.x, c.y, c.z), p = RIB.at(s), f = surf(s, (c.x - p.x) * -Math.sin(p.angle) + (c.y - p.y) * Math.cos(p.angle));
    R.pit = s > RPIT[0] && s < RPIT[1]; R.slope = (RIB.at(s + 20).z - p.z) / 20; R.bank = f.bank; R.lift = f.z - p.z; c.z = p.z; c.vz = 0; c.onGround = true;
  }


  /* ---- THE RACE ---- */
  const SONG = { bpm: 156, steps: 4, tracks: [
    { wave: 'square', vol: .05, notes: 'D5 . D5 F5 . D5 C5 . | A4 . C5 . D5 . . . | D5 . D5 F5 . G5 F5 . | A5 . G5 . F5 . . . | D5 . D5 F5 . D5 C5 . | A4 . C5 . D5 . F5 . | G5 . F5 . D5 . C5 . | D5 . . . . . . .' },
    { wave: 'saw', vol: .08, notes: 'D2 D2 D3 D2 D2 D3 D2 D3 | A#1 A#1 A#2 A#1 C2 C2 C3 C2 | D2 D2 D3 D2 D2 D3 D2 D3 | F2 F2 F3 F2 C2 C2 C3 C2 | D2 D2 D3 D2 D2 D3 D2 D3 | A#1 A#1 A#2 A#1 C2 C2 C3 C2 | G1 G1 G2 G1 A1 A1 A2 A1 | D2 D2 D3 D2 D2 . . .' },
    { wave: 'drums', vol: .07, notes: 'k . h k s . h . k k h . s . h h' }] };
  let mode = 'menu', G = null, race = null, players = [], cams = [], t = 0, over = 0, track = 'city', auto = false, idle = 0, attract = false;
  const menu = new E.Menu(game, [E.t('zero.menu.gp'), E.t('zero.menu.city'), E.t('zero.menu.sky'), E.t('zero.menu.vs'), E.t('zero.menu.back')], { onPick: i => i === 4 ? game.go('title') : i === 3 ? versus() : (G = { gp: i === 0, pts: CAST.map(() => 0) }, go(i === 2 ? 'sky' : 'city')) });
  const after = new E.Menu(game, [E.t('zero.menu.next'), E.t('zero.menu.menu')], { onPick: i => i === 0 ? (G && G.gp ? (track === 'city' ? go('sky') : (G.pts = CAST.map(() => 0), go('city'))) : G && G.vs ? go('city', true) : go(track)) : toMenu() });   // (after the ribbon a Grand Prix is over: RACE ON starts another)
  function toMenu() { mode = 'menu'; race = null; G = null; idle = 0; if (attract) { attract = false; auto = false; } game.splitScreen(0); A.music('title'); }
  function versus() { G = { vs: true, pts: CAST.map(() => 0) }; if (game.players.length >= 2) go('city', true); else { mode = 'join'; A.sfx('select'); } }
  /** a race on a track: six machines on the grid (the players' at the back), three laps */
  function go(which, vs) {
    track = which; mode = 'race'; over = 0; t = 0;
    if (which === 'city' && !city) city = buildCity(); if (which === 'sky' && !sky) sky = buildSky();
    race = new E.Race({ path: which === 'city' ? CITY : RIB, laps: 3, width: which === 'city' ? HALF * .8 : HW * .7, checkpoints: 12, items: [], heights: which === 'sky' });
    const n = vs ? Math.min(4, game.players.length) : 1, grid = race.grid(6); players = [];
    for (let k = 0; k < 6; k++) {
      const ci = (k + n) % 6, g = grid[k], human = ci < n && !auto, car = new E.Car(Object.assign({ top: 300, accel: 160, turn: 2.05, grip: 14, drag: .4, kart: false, r: 9, surfaces: { pit: { top: .75 }, kerb: { top: .8 } } }, g));
      const R = race.add(car, human ? { name: E.t(CAST[ci].name), input: game.players[ci] || game.input } : { name: E.t(CAST[ci].name), ai: { skill: .9 + ci * .014, rubber: .25 } });
      R.cast = CAST[ci]; R.ci = ci; R.energy = 100; R.calm = 9; R.stuck = 0; if (ci < n) players[ci] = R;
    }
    cams = players.map(R => ({ x: R.car.x, y: R.car.y, h: 22, angle: R.car.angle, pitch: 9, fov: 66 }));
    game.splitScreen(n > 1 ? n : 0, { layout: n === 2 ? 'rows' : 'grid' }); A.music(SONG); game.input.consumeAll();
  }

  function update(dt) {
    const I = game.input; I.touchSet('boost', null, mode === 'race');
    t += dt;
    if (mode === 'menu') { menu.update(dt); idle = I.anyPressed() ? 0 : idle + dt; if (idle > 25) { idle = 0; attract = true; auto = true; G = { gp: false, pts: CAST.map(() => 0) }; go(Math.floor(t / 25) % 2 ? 'sky' : 'city'); } return; }   // (left alone, it races by itself: an attract mode)
    if (attract && I.anyPressed()) { attract = false; auto = false; toMenu(); return; }
    if (mode === 'join') { if (game.players.length >= 2 && I.pressed('confirm')) go('city', true); else if (I.pressed('cancel')) mode = 'menu'; return; }   // (up to four join; player 1 starts it)
    if (mode === 'results') { if (attract && (over += dt) > 8) toMenu(); else after.update(dt); return; }
    for (const R of players) if (R.input) R.car.o.auto = R.input.lastDevice === 'touch';
    for (const R of race.racers) R.v0 = R.car.speed;
    const was = race.t; race.update(dt, track === 'city' ? city.map : RIBMAP);
    if (was < 0 && Math.floor(was) !== Math.floor(race.t)) A.sfx(race.t >= 0 ? 'confirm' : 'select');
    for (const R of race.racers) {
      const c = R.car; if (track === 'sky') ride(R);
      if (c.hitWall && race.go && track === 'sky') {   // the ribbon's barrier (it runs along the line) turns it along itself, F-Zero's glance: a graze keeps most of its speed, a hit head-on little; grinding on, a little less each step (the city's walls of cells bounce it, as the kart's do)
        const p = RIB.at(RIB.nearest(c.x, c.y, c.z)), a = Math.abs(E.angDiff(c.angle, p.angle)) < Math.PI / 2 ? p.angle : p.angle + Math.PI, off = E.angDiff(c.angle, a);
        const v = Math.max(c.speed, R.v0 * (R.calm > .4 ? .9 - .5 * Math.abs(Math.sin(off)) : .985)); c.angle += off * .35; c.vx = Math.cos(a) * v; c.vy = Math.sin(a) * v;
      }
      if (c.bumped && R.calm > .4) { R.energy = Math.max(0, R.energy - 3); if (players.includes(R)) A.sfx('bump', { vol: .35 }); } else if (R.calm < .25) R.energy = Math.max(0, R.energy - 6 * dt);   // (a knock costs 3; grinding along a barrier, 6 a second)
      R.calm = c.bumped ? 0 : R.calm + dt;
      R.stuck = race.go && !R.finished && Math.abs(c.speed) < 12 ? R.stuck + dt : 0;
      if (R.input && c.o.auto && R.stuck > 1.5) { const P = track === 'city' ? CITY : RIB, p = P.at(P.nearest(c.x, c.y, track === 'sky' ? c.z : undefined) + 30); Object.assign(c, { x: p.x, y: p.y, angle: p.angle, vx: 0, vy: 0 }); if (track === 'sky') ride(R); R.stuck = 0; }   // (a phone has no reverse: stuck against a wall, it is set back on the line)
      if (c.surface === 'pit' || (track === 'sky' && R.pit)) R.energy = Math.min(100, R.energy + 50 * dt);
      const want = R.lap >= 1 && R.energy > 30 && (R.input ? R.input.pressed('boost') : (auto || !R.input) && c.boostT <= 0 && Math.floor((t + R.ci) * .7) % 4 === 0 && R.energy > 50);
      if (want && race.go && c.boostT <= 0) { c.boost(1.2, .45); R.energy -= 14; if (players.includes(R)) A.sfx('powerup', { vol: .5 }); }
      c.o.top = R.energy <= 0 ? 210 : R.calm < .25 ? 230 : 300;   // (out of energy it limps; grinding a barrier it drags)
      if (R.lap !== R._lap) { if (R._lap !== undefined && !R.finished && players.includes(R)) A.sfx('oneup'); R._lap = R.lap; }
    }
    const tall = game.H > game.W * (players.length > 1 ? .5 : 1);
    players.forEach((R, i) => {
      const c = cams[i], k = 1 - Math.exp(-dt * 6), V = view(), back = tall ? 96 : 66, up = tall ? 40 : 26;
      if (track === 'sky') {   // on the ribbon: the camera on the track behind, never past its barriers, looking at the machine
        const s = RIB.nearest(R.car.x, R.car.y, R.car.z), p = RIB.at(s), u = (R.car.x - p.x) * -Math.sin(p.angle) + (R.car.y - p.y) * Math.cos(p.angle), q = RIB.at(s - back), off = clamp(u * .6, 24 - HW, HW - 24);
        c.x = q.x - Math.sin(q.angle) * off; c.y = q.y + Math.cos(q.angle) * off; c.h = surf(s - back, off).z + up; c.angle += E.angDiff(c.angle, E.angleTo(c, R.car)) * k;
      } else { c.angle += E.angDiff(c.angle, R.car.angle) * k; V.chase({ x: R.car.x, y: R.car.y, angle: c.angle }, { back, h: up + R.car.z }); Object.assign(c, V.cam); }
      c.pitch = (tall ? 13 : 9) - (R.slope || 0) * 45; c.fov = tall ? 84 : 66;
    });
    if (players.length && players.every(R => R.finished)) { over += dt; if (over > 2.5 && mode === 'race') finish(); }
  }
  const view = () => track === 'city' ? city.m7 : sky.m7;
  function finish() {
    mode = 'results'; after.i = 0;
    const PTS = [9, 6, 4, 3, 2, 1]; race.racers.slice().sort((a, b) => a.place - b.place).forEach((R, i) => { G.pts[R.ci] += PTS[i] || 0; });
    A.sfx(players[0] && players[0].place === 1 ? 'secret' : 'confirm');
  }

  /* ---- the look ---- */
  function draw(r) {
    const W = r.W, H = r.H;
    if (mode === 'menu' || mode === 'join') {
      if (!city) city = buildCity(); const p = CITY.at(t * 120); city.m7.cam = { x: p.x, y: p.y, h: 50, angle: p.angle, pitch: 12, fov: 70 }; towersOf(city.m7.cam); city.m7.draw(r);
      r.overlay(g => { E.font.title(g, E.t('zero.title'), W / 2, 20, { scale: 4, align: 'center', colors: ['#ffffff', '#a8f0ff', '#3ae0ff', '#c83ae8'], depth: 3 }); if (mode === 'join') E.font.text(g, E.t('zero.join'), W / 2, H / 2, '#ffffff', { align: 'center', shadow: '#000', outline: false }); if (mode === 'join' && game.players.length >= 2) E.font.text(g, E.t('zero.join.go', { n: game.players.length, key: game.input.label('confirm') }), W / 2, H / 2 + 16, '#ffe060', { align: 'center', shadow: '#000', outline: false }); });
      if (mode === 'menu') { menu.y = Math.round(H / 2) - 10; menu.draw(r); }
      return;
    }
    const i = r.viewport ? r.viewport.i : 0, me = players[i], cam = cams[i], V = view();
    if (track === 'city') towersOf(cam); else ribbonFor(cam);
    const fx = Math.cos(cam.angle), fy = Math.sin(cam.angle);
    for (const R of race.racers) if (R === me || (R.car.x - cam.x) * fx + (R.car.y - cam.y) * fy > 26) V.mesh(MACHINE, R.car.x, R.car.y, R.car.z + (track === 'sky' ? R.lift || 0 : 0) + 3 + Math.sin(t * 9 + R.ci) * .6, { scale: .8, yaw: R.car.angle, roll: clamp(R.car.slide * .012, -.5, .5) + (track === 'sky' ? R.bank || 0 : 0), colors: { body: R.cast.body, trim: R.cast.trim, glow: R.car.boostT > 0 ? '#ffe060' : '#ff6a2a' } });   // (it leans with its slide; one beside the camera, nearer than its near plane can draw, is left out)
    V.draw(r, cam);
    if (me) race.hud(r, me, { color: players.length > 1 ? ['#a0d8ff', '#ffd080', '#a0ffa0', '#ffa0e0'][i] : '#ffffff', right: r.viewport && r.viewport.y > 0 ? null : cornerX() });
    if (me) r.overlay(g => {   // the energy bar and the speed, under the race's own HUD
      const vp = r.viewport || { x: 0, y: 0, w: W, h: H }, w = Math.min(90, vp.w * .3), x = vp.x + 6, y = vp.y + vp.h - 14, e = me.energy / 100;
      px.rect(g, x - 1, y - 1, w + 2, 7, '#0a0a14'); px.rect(g, x, y, Math.round(w * e), 5, e < .25 ? (Math.floor(t * 6) % 2 ? '#ff3a3a' : '#ffd040') : '#3ae0ff');
      E.font.text(g, E.t('zero.kmh', { n: Math.round(me.car.speed * 1.6) }), x + w + 6, y - 2, '#ffffff', { shadow: '#000', outline: false });
      if (me.lap >= 1 && me.energy > 30) E.font.text(g, E.t('zero.boost', { key: (me.input || game.input).label('boost') }), x, y - E.font.lineHeight() - 2, '#ffe060', { shadow: '#000', outline: false });
    });
    if (players.length < 2 && mode === 'results') board(r);
  }
  // the city's towers within sight of a camera: dark blocks with lit windows
  function towersOf(c) {
    const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
    for (const b of city.towers) { const d = (b.x - c.x) * fx + (b.y - c.y) * fy; if (d > 30 && d < 1500) city.m7.add(b.x, b.y, 0, (g, sx, sy, k) => { const w = b.w * k, h = b.h * k; if (w < 1) return; px.rect(g, sx - w / 2, sy - h, w, h, b.c); if (w > 6) for (let yy = 0; yy < 12; yy++) for (let xx = 0; xx < 3; xx++) if ((b.seed * 7 + yy * 3 + xx) % 4) px.rect(g, sx - w / 2 + w * (.12 + xx * .3), sy - h + h * (.05 + yy * .078), Math.max(1, w * .16), Math.max(1, h * .035), '#ffd870'); }); }
  }
  // the ribbon near a camera: each segment's surface, its rails (neon), a pillar every fourth, the start line
  function ribbonFor(c) {
    const S = sky.segs, n = S.length, fx = Math.cos(c.angle), fy = Math.sin(c.angle);
    for (let k = 0; k < n; k++) {
      const a = S[k], b = S[(k + 1) % n], d = (a.x - c.x) * fx + (a.y - c.y) * fy; if (d < -160 || Math.hypot(a.x - c.x, a.y - c.y) > 2800) continue;
      sky.m7.quad([a.L, a.R, b.R, b.L], a.s > RPIT[0] && a.s < RPIT[1] ? (k % 2 ? '#2a8a6a' : '#34a07a') : k % 2 ? '#4a4f72' : '#42476a');
      if (k === 0) for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {   // the line: a band of checks across, just over the track
        const at = (u, v) => { const t = v * 5 / STEP, l = a.L.map((q, n) => q + (b.L[n] - q) * t), r = a.R.map((q, n) => q + (b.R[n] - q) * t); return [l[0] + (r[0] - l[0]) * u, l[1] + (r[1] - l[1]) * u, l[2] + (r[2] - l[2]) * u + .6]; };
        sky.m7.quad([at(i / 8, j), at((i + 1) / 8, j), at((i + 1) / 8, j + 1), at(i / 8, j + 1)], (i + j) % 2 ? '#f0f0f0' : '#202030');
      }
      if (k % 2) sky.m7.quad([[(a.L[0] + a.R[0]) / 2 - (a.R[0] - a.L[0]) * .02, (a.L[1] + a.R[1]) / 2 - (a.R[1] - a.L[1]) * .02, (a.L[2] + a.R[2]) / 2 + .5], [(a.L[0] + a.R[0]) / 2 + (a.R[0] - a.L[0]) * .02, (a.L[1] + a.R[1]) / 2 + (a.R[1] - a.L[1]) * .02, (a.L[2] + a.R[2]) / 2 + .5], [(b.L[0] + b.R[0]) / 2, (b.L[1] + b.R[1]) / 2, (b.L[2] + b.R[2]) / 2 + .5]], '#e8e8f0');
      for (const [e1, e2, col] of [[a.L, b.L, '#ff3ab0'], [a.R, b.R, '#3ae0ff']]) sky.m7.quad([e1, e2, [e2[0], e2[1], e2[2] + 9], [e1[0], e1[1], e1[2] + 9]], col);
      if (d > 90) for (const q of a.pil) sky.m7.quad(q, '#8a8478', null, -1);   // (pillars first: the track over them covers them)
    }
  }
  // the results: every machine's place and time, and the Grand Prix's points
  function board(r) {
    const W = r.W, H = r.H;
    r.overlay(g => {
      const w = 200, rows = race.racers.slice().sort((a, b) => a.place - b.place), h = 18 + rows.length * 11, x = Math.round((W - w) / 2), y = Math.round(H / 2 - h / 2 - 24);
      E.ui.box(g, x, y, w, h, { bg: '#10142a', border: '#a8f0ff' });
      rows.forEach((R, k) => { const yy = y + 8 + k * 11, fin = R.finished ? Math.floor(R.time / 60) + "'" + (R.time % 60).toFixed(2).padStart(5, '0') : '--'; E.font.text(g, E.t('zero.row', { place: R.place, name: R.name }), x + 8, yy, players.includes(R) ? '#ffe04a' : '#e8e8f0', { outline: false }); E.font.text(g, (G && G.gp ? G.pts[R.ci] + ' ' : '') + fin, x + w - 8, yy, '#c8c8e0', { align: 'right', outline: false }); });
    });
    after.y = Math.round(H / 2) + 50; after.draw(r);
  }

  /** the bot (tools/kits-test.mjs): the Grand Prix with every machine driven by its driver (yours too): both tracks to
   *  the end; then four players in a split screen on the city, the gas held a while */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s);
    try {
      game.go('zero', null, { fade: 0 }); game.advance(1 / 120); auto = true; const out = {};
      G = { gp: true, pts: CAST.map(() => 0) };
      for (const tr of ['city', 'sky']) { go(tr); let n = 0, stuck = 0; for (; n < 220 && !race.over; n++) { game.advance(1); for (const R of race.racers) stuck = Math.max(stuck, R._stuck || 0); } out[tr] = { finished: race.results.length, laps: race.racers.map(R => R.lap), seconds: n, stuck: +stuck.toFixed(2), energy: race.racers.map(R => Math.round(R.energy)) }; if (race.over) finish(); }
      out.points = G.pts.slice(); auto = false;
      toMenu(); idle = 30; game.advance(1 / 60); out.attract = attract && mode === 'race'; toMenu();   // (left alone on the title: it races by itself)
      game.go('zero', { part: 'gba' }, { fade: 0 }); game.advance(1 / 60); out.gba = [game.W, game.H]; game.go('zero', null, { fade: 0 }); game.advance(1 / 60); auto = false;
      while (game.players.length < 4) game.addPlayer({ keys: game.players.length === 1 ? 'right' : undefined });
      G = { vs: true, pts: CAST.map(() => 0) }; go('city', true); for (const P of game.players) P.hold('gas'); game.advance(8); for (const P of game.players) P.hold('gas', false);
      out.vs = { viewports: game.viewports.length, prog: players.map(R => Math.round(R.prog)) };
      toMenu(); while (game.players.length > 1) game.removePlayer(game.players.length);
      return Object.assign(out, { errors: game.errors.length });
    } finally { Math.random = was; auto = false; }
  }

  return { view: 'topdown', views: ['topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['boost'], camera: { zoom: false },
    enter(d) {
      mode = 'menu'; race = null; menu.i = 0; auto = false; attract = false; idle = 0; game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false; game.allowJoin({ max: 4 }); A.music('title');
      const gba = !!d && d.part === 'gba'; game.screen.setOptions({ res: gba ? 'gba' : 'ps1', expand: !gba });   // (#zero/gba: the Game Boy Advance's 240 x 160 exactly, letterboxed: F-Zero: Maximum Velocity's)
      if (d && d.part) { if (d.part === 'vs') versus(); else { G = { gp: d.part === 'gp' || d.part === 'gba', pts: CAST.map(() => 0) }; go(d.part === 'sky' ? 'sky' : 'city'); } }
    },
    exit() { game.splitScreen(0); game.allowJoin(false); attract = false; auto = false; idle = 0; game.screen.setOptions({ res: 'ps1', expand: true }); },   // (an attract race left by the pause menu's quit: none of it carried back in)
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'join' || mode === 'results') { toMenu(); return true; } return false; },
    update, draw, bot, hud: r => { if (players.length > 1 && mode === 'results') board(r); },
    /** a race driven by the autopilot (a demo; the bot's): 'city' or 'sky' */
    demo(tr) { auto = true; G = { gp: false, pts: CAST.map(() => 0) }; go(tr === 'sky' ? 'sky' : 'city'); },
    state: () => race && { mode, track, t: +race.t.toFixed(2), you: players[0] && { x: Math.round(players[0].car.x), y: Math.round(players[0].car.y), z: Math.round(players[0].car.z), angle: +players[0].car.angle.toFixed(3), speed: Math.round(players[0].car.speed), energy: Math.round(players[0].energy), lap: players[0].lap, place: players[0].place, auto: players[0].car.o.auto }, racers: race.racers.map(R => ({ name: R.name, lap: R.lap, place: R.place, z: Math.round(R.car.z) })), viewports: game.viewports.length },
    race: () => race,   // (for tests)
    /** the proof: the city race, the gas held, a boost tried, a turn into the first bend */
    run: (n = 600) => proof('zero', n, (i, k) => {
      if (i === 2) { G = { gp: false, pts: CAST.map(() => 0) }; go('city'); }
      if (i === 380) k.hold('gas');
      if (i === 520) { k.hold('right'); k.tap('boost'); }
      if (i === 580) k.up('right');
    }, () => race ? race.racers.map(R => [R.car.x, R.car.y, R.car.angle, R.prog, R.energy]) : null, () => { game.input.lastDevice = 'keyboard'; }) };
})();
scenes.zero = ZERO;

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
