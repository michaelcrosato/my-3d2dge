// The ROAD kit's game (the pseudo-3D road: a coast run of six stages picked at the forks, in a car or on a bike that leans, traffic, checkpoints, a rewind; a police chase that rams a getaway car), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 168 (src/starter/66-road.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. road.html plays it; node kits/test.mjs road runs it headless.
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
 * SLICE 25  ROAD  (OutRun, Super Hang-On, Chase H.Q.; Slipstream's rewind). @modules road mesh rewind
 * The pseudo-3D road. COAST RUN: a convertible (or a motorbike that leans into the bends) from the beach to a goal,
 * three stages a run picked at the forks (keep left or right where the road splits: six stages in a pyramid), a clock
 * the checkpoints refill, traffic to weave through, a radio of three songs; hit the scenery fast and the car spins
 * out; hold R to rewind (three a run). RASH (Road Rash): a bike race down the canyon against seven riders who fight:
 * PUNCH the one beside you, knock three blows into him and he goes down; three blows into you and you do; place in the
 * top three. DUEL (Top Gear, Lotus): two players race one road to its line, the screen split in two. CHASE: a police car after a getaway car through the night traffic: catch it before the clock runs out
 * and ram it until it stops; NITRO three times. STRIKER (Night Striker): an armoured car that flies over the night
 * road: up and down rise and fall, left and right cross it, FIRE at the drones and the cars that come at you; reach the
 * end with your shield.
 * Deep links: #road/car, #road/bike, #road/rash, #road/duel, #road/chase, #road/striker; #road/hd the coast run at
 * 960 x 540 (today's resolution, Horizon Chase's). In the car, brake while steering hard at speed to drift: let go
 * after a long one for a boost (Victory Heat Rally's).
 * KEYS: left / right steer, up / Z gas, down / X brake, C / L nitro (the chase) or punch (the rash), R rewind (held). A pad: the stick, A
 * gas, X brake, B nitro, LB rewind. TOUCH: the stick steers, it accelerates by itself; BRAKE, REWIND (NITRO).
 * HOW IT WORKS: E.Road (the road module) draws the road, its hills, tunnels and forks (split, branch), the scenery, and
 * through road.mesh the cars as low-poly models (the mesh module); E.Rewind (the rewind module) keeps the last seconds;
 * this file the stages and their forks, the car and the bike, the traffic, the chase and the HUD.
 * ===================================================================================== */
const ROAD = (() => {
  const KEYS = Object.assign({}, E.Input.DEFAULT, { gas: ['ArrowUp', 'KeyW', 'KeyZ', 'Pad0', 'Pad7'], brake: ['ArrowDown', 'KeyS', 'KeyX', 'Pad2', 'Pad6'], nitro: ['KeyC', 'KeyL', 'Pad1', 'Pad5'], rewind: ['KeyR', 'Pad4'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  const SEG = 200, W = 2000, TOP = 6000, KMH = .048, GAP = 2.4, CK = 38;   // a segment, half the road, top speed (units a second), units to km/h, the fork's gap, a car model's units
  /* ---- THE MODELS (x forward, y right, z up; a unit about 2.6 cm: scale CK) ---- */
  const wheels = (x0, x1, y, r) => [['tube', [x0, y, r], r, 1.4, '#1a1a1e', { axis: 'y', n: 8, mirror: true }], ['tube', [x1, y, r], r, 1.4, '#1a1a1e', { axis: 'y', n: 8, mirror: true }]];
  const CAR = new E.Mesh([['box', [0, 0, 3.4], [22, 9, 2.2], 'body', { top: [.98, .97] }], ['box', [12, 0, 6.2], [9, 8.4, .9], 'body', { top: [.92, .95], tip: [1, -.5] }], ['box', [-13, 0, 6.2], [8, 8.6, .9], 'body'],
    ['face', [[6, -7.6, 7], [6, 7.6, 7], [2.6, 7, 11], [2.6, -7, 11]], '#9ad8ff', { both: true }], ['box', [-4, 4.2, 7.4], [3, 3, 2.4], '#3a2420', { mirror: true }],
    ['box', [-4.4, 4.2, 10], [1.6, 2.4, 2], 'shirt'], ['ball', [-4.2, 4.2, 13.2], [2, 2, 2.2], '#e8b890'], ['box', [-4.4, -4.2, 10], [1.6, 2.4, 2], '#3a6ac8'], ['ball', [-4.2, -4.2, 13.2], [2, 2, 2.2], '#f0c8a0'], ['ball', [-4.6, -4.2, 14.4], [2.2, 2.2, 1.4], '#f0d060'], ['ball', [-4.6, 4.2, 14.4], [2.2, 2.2, 1.4], '#3a2418'],
    ['box', [-22.2, 6.4, 4.6], [.3, 2, .8], 'tail', { mirror: true }], ['box', [22.2, 0, 3.4], [.4, 7, 1], '#2a2a30'], ['box', [-22.4, 0, 3], [.2, 2.6, 1], '#e8e0c8'], ...wheels(14, -14, 8.4, 3.2)]);
  const SEDAN = new E.Mesh([['box', [0, 0, 4], [21, 9, 2.8], 'body'], ['box', [-1, 0, 9.4], [10, 8, 2.6], 'glass', { top: [.75, .9] }], ['box', [-21.2, 6, 5], [.3, 2.2, .9], '#e83a30', { mirror: true }], ['box', [0, 0, 12.2], [7, 7, .4], 'roof'], ...wheels(13, -13, 8.6, 3.2)]);
  const VAN = new E.Mesh([['box', [0, 0, 9], [22, 9.5, 7.5], 'body', { top: [.96, .96] }], ['box', [12, 0, 13], [6, 9.6, 2.4], '#2a3a4a'], ['box', [-22.2, 6, 5], [.3, 2.2, 1], '#e83a30', { mirror: true }], ...wheels(14, -14, 8.8, 3.4)]);
  const TRUCK = new E.Mesh([['box', [14, 0, 9], [7, 9.5, 7], 'body', { top: [.8, .95] }], ['box', [-8, 0, 12], [16, 10, 10], '#d8d4c8'], ['box', [-24.2, 6.5, 4], [.3, 2.2, 1], '#e83a30', { mirror: true }], ...wheels(16, -18, 9, 3.6)]);
  const DRONE = new E.Mesh([['box', [0, 0, 0], [16, 12, 3], 'body', { top: [.7, .8] }], ['ball', [2, 0, 3], [5, 5, 3], '#ff3a3a'], ['box', [0, 9, 0], [8, 4, 1], '#2a2a32'], ['box', [0, -9, 0], [8, 4, 1], '#2a2a32']]);   // (STRIKER's foe in the air)
  const BIKE = new E.Mesh([['tube', [11, 0, 3.4], 3.4, 1, '#1a1a1e', { axis: 'y', n: 8 }], ['tube', [-10, 0, 3.6], 3.6, 1.4, '#1a1a1e', { axis: 'y', n: 8 }], ['box', [1, 0, 7], [9, 2.4, 2.6], 'body', { top: [.8, .8] }], ['box', [9, 0, 10], [3, 3.2, 3], 'body', { top: [.6, .8], tip: [-1, 0] }], ['face', [[11, -2.4, 12], [11, 2.4, 12], [9, 2, 15], [9, -2, 15]], '#9ad8ff', { both: true }], ['box', [-6, 0, 9.6], [4, 2.2, 1], '#2a2a30'], ['box', [-12, 0, 6], [3, 1.6, 1.2], '#4a4a52']]);
  const RIDER = new E.Mesh([['box', [-3, 0, 14], [5, 3.2, 3], 'suit', { top: [.8, .9], tip: [3, -1] }], ['ball', [3, 0, 17.4], [2.6, 2.4, 2.6], 'helm'], ['box', [2, 3, 13.4], [4, 1, 1], 'suit', { mirror: true }], ['box', [-4, 3.2, 9], [4, 1.2, 1.4], 'suit', { mirror: true, top: [1, 1], tip: [3, 0] }]]);
  const LIGHTS = new E.Mesh([['box', [0, 3, 13.4], [1.6, 3, .8], 'l1'], ['box', [0, -3, 13.4], [1.6, 3, .8], 'l2']]);
  /* ---- THE STAGES: a pyramid of six (left at a fork to the same index below, right to the next), each its colors,
   * sky, scenery and stretches [segments, curve, hill (units), tunnel] ---- */
  const RIVALS = [['#2a8ae8', '#e8e8e8'], ['#e8c02a', '#2a2a2a'], ['#3ac84a', '#e8402a'], ['#a83ae8', '#f0d0a0'], ['#f0f0f0', '#3a3ae8'], ['#e86a2a', '#2a6a3a'], ['#2a2a2a', '#e8c02a']];   // the rash's riders: bike, suit
  const SKIES = {}, sky = s => SKIES[s] || (SKIES[s] = new E.Backdrop(s));
  const STAGES = [
    { id: 'beach', sky: 'ocean', grass: ['#e8d8a0', '#dccb90'], rumble: ['#f4f4f4', '#d83030'], props: 'palm', parts: [[60], [80, 3], [60, 0, 3000], [80, -4, -3000], [60], [90, 5], [60, 0, 2000], [80, -3, -2000], [70, 2], [60]] },
    { id: 'desert', sky: 'desert', grass: ['#d8a868', '#cc9a5a'], rumble: ['#f0e0c0', '#b04820'], props: 'cactus', parts: [[70, 0, 4000], [80, -3, -3000], [60, 4], [80, 0, 3000], [80, -5, -4000], [70], [80, 3, 2000], [60, -2, -2000]] },
    { id: 'forest', sky: 'forest', grass: ['#3e9a3e', '#348a34'], rumble: ['#f0f0f0', '#3050c0'], props: 'pine', parts: [[60, 2], [80, -4, 3000], [60, 0, -3000], [40, 3, 0, 1], [60, 3, 0, 1], [80, -5], [70, 4, 2000], [70, 0, -2000]] },
    { id: 'canyon', sky: 'dusk', grass: ['#a85a3a', '#9a5034'], rumble: ['#f0d8c0', '#6a3020'], props: 'rock', parts: [[60, -3, 3000], [80, 5, -3000], [70], [80, -6, 2000], [60, 4, -2000], [90, -2], [70]] },
    { id: 'city', sky: 'city-night', grass: ['#2a2a3a', '#24243a'], rumble: ['#e0e0f0', '#e0b030'], road: ['#4a4a58', '#444452'], lane: '#e0d060', props: 'lamp', parts: [[80], [60, 4], [80, -4], [60, 0, 2000], [80, 5, -2000], [60, -3], [90]] },
    { id: 'alps', sky: 'night', grass: ['#e8eef4', '#dce4ec'], rumble: ['#f0f0f0', '#c83a30'], props: 'snowpine', parts: [[70, 0, 5000], [80, -4, -2000], [60, 5, 3000], [60, 0, -4000], [80, -5, 2000], [70, 3, -4000], [60]] }];
  const ROW = i => i === 0 ? 0 : i < 3 ? 1 : 2, KIDS = i => i === 0 ? [1, 2] : i === 1 ? [3, 4] : i === 2 ? [4, 5] : null;
  const PALM = E.prop('palm').frames[0], CACTUS = E.prop('cactus').frames[0], PINE = E.prop('pine').frames[0], ROCK = E.prop('rock', { size: 2 }).frames[0], LAMP = E.prop('streetlamp').frames[0];
  const SNOW = E.prop('pine', { color: '#dfe8f0' }).frames[0];
  const thing = (w, h, fn) => ({ w, draw(g, x, y, s) { const X = w * s, Y = h * s; if (X < 1) return; fn(g, x, y, X, Y, s); } });
  const SIGN = side => thing(700, 900, (g, x, y, X, Y) => { px.rect(g, x - X * .04, y - Y, X * .08, Y, '#606068'); px.rect(g, x - X / 2, y - Y, X, Y * .5, '#f0d030'); for (let i = 0; i < 3; i++) { const cx = x + (i - 1) * X * .3, cy = y - Y * .75, a = X * .1 * side; px.poly(g, [[cx - a, cy - Y * .16], [cx + a, cy], [cx - a, cy + Y * .16], [cx - a * .2, cy]], '#1a1a1a'); } });
  const ARCH = (word, col) => thing(4800, 2400, (g, x, y, X, Y, s) => { for (const sd of [-1, 1]) px.rect(g, x + sd * X / 2 - X * .02, y - Y, X * .04, Y, '#e8e8f0'); px.rect(g, x - X / 2, y - Y, X, Y * .22, col); if (X > 60) E.font.text(g, word, x, y - Y * .94, '#ffffff', { align: 'center', scale: Math.max(1, Math.floor(X / 160)), outline: false }); });
  const TOWER = thing(1400, 5000, (g, x, y, X, Y) => { px.rect(g, x - X / 2, y - Y, X, Y, '#2a2a40'); for (let r = 0; r < 12; r++) for (let c = 0; c < 3; c++) if ((r * 7 + c * 3) % 5) px.rect(g, x - X / 2 + X * (.15 + c * .28), y - Y + Y * (.05 + r * .078), X * .14, Y * .035, '#ffd870'); });
  function scenery(road, st) {
    for (let z = SEG * 6; z < road.length; z += SEG * 3) {
      const r = (z * 7919 / SEG) % 100, sd = (z / SEG / 3) % 2 ? 1 : -1, cs = road.centers(z), edge = Math.max(...cs.map(Math.abs)) + 1;
      const pick = st.props === 'palm' ? PALM : st.props === 'cactus' ? (r < 60 ? CACTUS : ROCK) : st.props === 'pine' ? PINE : st.props === 'rock' ? ROCK : st.props === 'snowpine' ? SNOW : null;
      if (st.props === 'lamp') { road.place(z, sd * (edge + .3), LAMP, 70); if (r < 45) road.place(z + SEG, -sd * (edge + 1.4 + r / 60), TOWER, 1); }
      else if (!road.seg(z).tunnel) { road.place(z, sd * (edge + .5 + r / 120), pick, 46); if (r < 30) road.place(z + SEG, -sd * (edge + 1.2 + r / 40), pick, 52); }
      const c = road.curveAt(z + SEG * 12); if (Math.abs(c) > 3 && r < 40) road.place(z, (c > 0 ? 1 : -1) * (edge + .3), SIGN(c > 0 ? -1 : 1), 1);
    }
  }
  /** a leg: a stage's road (from a fork: its first stretch beside the way not taken, `from` half roads off), then its
   *  own fork (or the goal), its scenery, its checkpoint arch, and traffic in its lanes */
  function leg(i, from, chase, rash) {
    const st = STAGES[i], last = !KIDS(i) || chase || rash, road = new E.Road({ segment: SEG, width: W, lanes: 3, rumble: 3, draw: 210, fov: 100, height: 1000, square: true,
      colors: { road: st.road || ['#6a6a72', '#646470'], grass: st.grass, rumble: st.rumble, lane: st.lane || '#d8d8d8', wall: ['#5a4a3a', '#4a3a2a'], roof: '#2a2420', portal: '#6a5a48' }, fog: null, sky: sky(st.sky) });
    if (from) road.add(30, { branch: from });
    for (const [n, curve = 0, hill = 0, tun] of (chase ? st.parts.concat(st.parts, st.parts) : rash ? st.parts.concat(st.parts) : st.parts)) road.add(n, { curve, hill, tunnel: !!tun });
    const end = road.length; if (!last) road.add(70, { split: GAP }); road.add(160, last ? {} : { split: GAP });   // (past the end: more of the same, never reached)
    scenery(road, st); road.place(end - SEG * 2, 0, ARCH(E.t(last ? (chase ? 'road.arch.end' : rash ? 'road.arch.finish' : 'road.arch.goal') : 'road.arch.check'), last ? '#d02a2a' : '#2a8a3a'), 1);
    const traffic = [], R = E.rng(31 + i);
    for (let z = SEG * 40; z < end; z += SEG * (14 + Math.floor(R() * 16))) traffic.push({ z, lane: [-2 / 3, 0, 2 / 3][Math.floor(R() * 3)], speed: 1700 + R() * 1200, model: [SEDAN, VAN, TRUCK][Math.floor(R() * 3)], col: ['#e8e8e8', '#3a6ac8', '#e8a020', '#2a8a4a', '#8a3ac8'][Math.floor(R() * 5)] });
    return { i, road, end, last, traffic, fork: last ? 0 : end + 70 * SEG };
  }

  /* ---- THE RUN ---- */
  const SONGS = [
    { name: 'road.song.breeze', bpm: 132, steps: 4, tracks: [
      { wave: 'square', vol: .06, notes: 'E5 . G5 A5 . G5 E5 D5 | C5 . D5 E5 . . . . | E5 . G5 A5 . B5 A5 G5 | A5 . G5 E5 . . D5 .' },
      { wave: 'triangle', vol: .26, notes: 'A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . | C3 . C4 . C3 . C4 . | G2 . G3 . G2 . G3 .' },
      { wave: 'drums', vol: .07, notes: 'k . h . s . h k k . h . s . h h' }] },
    { name: 'road.song.sunset', bpm: 112, steps: 4, tracks: [
      { wave: 'pulse12', vol: .06, notes: 'D5 - - F5 E5 - D5 - | C5 - - - A4 - - - | D5 - - F5 A5 - G5 - | F5 - E5 - D5 - - -' },
      { wave: 'triangle', vol: .26, notes: 'D3 . . D3 . . A2 . | F2 . . F2 . . C3 . | G2 . . G2 . . D3 . | A2 . . A2 . . C3 .' },
      { wave: 'drums', vol: .06, notes: 'k . . h s . . h k . k h s . . h' }] },
    { name: 'road.song.neon', bpm: 150, steps: 4, tracks: [
      { wave: 'square', vol: .05, notes: 'A4 A5 E5 A4 G5 E5 C5 G4 | F4 F5 C5 F4 E5 C5 A4 E4 | G4 G5 D5 G4 F5 D5 B4 F4 | E4 E5 B4 E4 G#5 E5 B4 G#4' },
      { wave: 'triangle', vol: .26, notes: 'A1 A2 A1 A2 A1 A2 A1 A2 | F1 F2 F1 F2 F1 F2 F1 F2 | G1 G2 G1 G2 G1 G2 G1 G2 | E1 E2 E1 E2 E1 E2 E1 E2' },
      { wave: 'drums', vol: .07, notes: 'k h s h k h s h k h s h k k s h' }] }];
  let mode = 'menu', P = null, t = 0, auto = false, song = 0, ride = 'car', DUO = null;   // (DUO: the duel's two players, P the first)
  const rw = new E.Rewind({ seconds: 6, every: 1 / 20 });
  const menu = new E.Menu(game, [E.t('road.menu.car'), E.t('road.menu.bike'), E.t('road.menu.rash'), E.t('road.menu.duel'), E.t('road.menu.chase'), E.t('road.menu.striker'), E.t('road.menu.back')], { onPick: i => i === 6 ? game.go('title') : i === 5 ? start('striker') : i === 4 ? start('chase') : i === 3 ? duel() : i === 2 ? start('rash') : radio(i ? 'bike' : 'car') });
  const after = new E.Menu(game, [E.t('road.menu.again'), E.t('road.menu.menu')], { onPick: i => i === 0 ? (DUO ? start('duel') : P.chase ? start('chase') : P.rash ? start('rash') : P.striker ? start('striker') : radio(ride)) : toMenu() });
  function toMenu() { mode = 'menu'; P = null; DUO = null; game.splitScreen(0); A.music('title'); }
  function duel() { if (game.players.length >= 2) start('duel'); else { mode = 'join'; A.sfx('select'); } }   // (Top Gear's and Lotus's two players: the second joins first)
  function radio(r) { ride = r; mode = 'radio'; A.music(SONGS[song]); game.input.consumeAll(); }
  /** a run: the car (or bike) at the start of the beach, the clock at 60 (the chase: the city at night, a getaway car ahead) */
  function start(what) {
    if (what === 'duel') {   // two cars on one road to its finish, a screen each (no clock, no rewind)
      start('rash'); ride = 'car'; const L = P.L; Object.assign(P, { rash: false, rivals: null, bike: false }); DUO = [P, Object.assign({}, P, { x: .66, route: [3] })]; P.x = -.66; DUO.forEach((Q, i) => Object.assign(Q, { duel: true, n: i, L, clock: 999, rewinds: 0 }));
      game.splitScreen(2, { layout: 'rows' }); return;
    }
    DUO = null; game.splitScreen(0);
    if (what === 'striker') {   // Night Striker: the city at night, flown over; no clock, a shield of five
      ride = 'car'; start('rash'); Object.assign(P, { rash: false, rivals: null, bike: false, striker: true, L: leg(4, 0, false, true), alt: 260, shield: 5, shots: [], foes: [], bolts: [], fire: 0, spawn: 2, kills: 0, hurt: 0 }); A.music('boss'); return;
    }
    const chase = what === 'chase', rash = what === 'rash'; if (chase) ride = 'car'; if (rash) ride = 'bike';
    P = { chase, rash, hp: 6, punch: 0, side: 1, place: 8, downs: 0, bike: ride === 'bike', L: leg(chase ? 4 : rash ? 3 : 0, 0, chase, rash), z: SEG * 4, x: 0, speed: 0, steer: 0, lean: 0, clock: chase ? 55 : 44, crash: 0, spin: 0, hop: 0, score: 0, route: [chase ? 4 : 0], rewinds: 3, rewinding: false, nitro: 3, boost: 0, over: null, bump: 0, near: 0 };
    if (chase) P.target = { z: SEG * 70, x: 0, speed: 4000, damage: 0, swerve: 0, met: false };
    if (rash) { P.clock = 999; P.rivals = RIVALS.map((c, k) => ({ k, z: SEG * 4 + (k + 1) * 700, x: [-2 / 3, 0, 2 / 3][k % 3], goal: [-2 / 3, 0, 2 / 3][k % 3], speed: 0, pace: .9 + k * .012, hp: 3, punch: 1 + k * .3, swing: 0, wob: 0, fall: 0, col: c[0], suit: c[1] })); }   // (the grid: you at the back)
    rw.clear(); mode = 'drive'; A.music(chase ? 'boss' : rash ? SONGS[2] : SONGS[song]); game.input.consumeAll();
  }
  const pad = (I = game.input) => { const [x, y] = I.move(); return { x, y, fire: I.down('nitro'), gas: I.down('gas') || I.lastDevice === 'touch', brake: I.down('brake'), nitro: I.pressed('nitro'), rewind: I.down('rewind') }; };
  /** the next leg at a fork's end: the side the car is on is the way it goes; the rest of the run on that road */
  function fork() {
    const L = P.L, cs = L.road.centers(P.z), side = P.x < 0 ? 0 : 1, kid = KIDS(L.i)[side], off = cs[side];
    const N = leg(kid, (side ? -1 : 1) * Math.abs(cs[1] - cs[0]), false);
    P.L = N; P.z -= L.fork; P.x -= off; P.route.push(kid); P.clock += 30; P.score += 2000;
    A.sfx('oneup'); say(E.t('road.stage.' + STAGES[kid].id), 2.5);
  }
  const ROAD_P = () => P;   // (the player the autopilot drives when none is named)
  let banner = null, bannerT = 0; const say = (s, secs = 2) => { banner = s; bannerT = secs; };
  function update(dt) {
    const I = game.input;
    I.touchSet('brake', null, mode === 'drive'); I.touchSet('rewind', null, !!(mode === 'drive' && P && !P.chase && !P.rash && !P.striker && !P.duel && (P.rewinds > 0 || P.rewinding))); I.touchSet('nitro', P && P.rash ? E.t('road.punch') : P && P.striker ? E.t('road.fire') : null, !!(mode === 'drive' && P && (P.chase || P.rash || P.striker)));   // (a strict true or false: undefined would leave the button as it was)   // (the last rewind's button stays under the finger while it runs)
    t += dt; if (bannerT > 0) bannerT -= dt;
    if (mode === 'menu') { menu.update(dt); return; }
    if (mode === 'join') { if (game.players.length >= 2) start('duel'); else if (I.pressed('cancel')) mode = 'menu'; return; }
    if (mode === 'results') { after.update(dt); return; }
    if (mode === 'radio') {
      if (I.pressed('left') || I.pressed('right')) { song = (song + (I.pressed('left') ? 2 : 1)) % 3; A.music(SONGS[song]); A.sfx('select'); }
      const tap = I.clicked && I.clicked(); if (tap) { const k = clamp(Math.floor(tap[0] / (game.W / 3)), 0, 2); if (k === song) start(ride); else { song = k; A.music(SONGS[song]); A.sfx('select'); } }
      if (I.pressed('confirm') || I.pressed('start')) start(ride);
      return;
    }
    const k = auto ? pilot() : pad();
    // rewinding: the last seconds walked back while R is held (a rewind used up as it starts)
    if (k.rewind && !P.chase && !P.rash && !P.striker && !P.over && (P.rewinding || P.rewinds > 0) && rw.seconds > .2) { if (!P.rewinding) { P.rewinding = true; P.rewinds--; A.sfx('warp'); } const s = rw.back(dt, 2); if (s) Object.assign(P, JSON.parse(s.json), { L: s.L, traffic: undefined }), s.L.traffic.forEach((c, i) => Object.assign(c, s.cars[i])); return; }
    P.rewinding = false;
    if (DUO) {   // the duel: each player's car on the one road; the first over the line wins; they bump each other
      DUO.forEach((Q, i) => { Q.z0 = Q.z; if (Q.over) { Q.over.t += dt; Q.speed = Math.max(0, Q.speed - 3000 * dt); Q.z += Q.speed * dt; } else drive(Q, dt, auto ? pilot(Q) : pad(game.players[i] || I), i > 0); });
      const [A1, B1] = DUO; if (Math.abs(A1.z - B1.z) < 1300 && Math.abs(A1.x - B1.x) < .45 && A1.bump <= 0 && B1.bump <= 0) { const s = A1.x < B1.x ? -1 : 1; A1.x += s * .25; B1.x -= s * .25; A1.bump = B1.bump = .4; A.sfx('bump'); }
      const line = A1.L.end - SEG * 2, when = Q => Q.over && Q.over.won && Q.over.t === 0 ? (line - Q.z0) / Math.max(1e-6, Q.z - Q.z0) : -1;   // (both over the line in one step: when in the step each crossed, from where it was and where it is)
      if (when(A1) >= 0 && when(B1) >= 0) (when(A1) <= when(B1) ? B1 : A1).over.won = false;
      const won = DUO.find(Q => Q.over && Q.over.won); if (won) DUO.forEach(Q => { if (!Q.over) { Q.over = { won: false, t: 0 }; } });
      if (DUO.every(Q => Q.over && Q.over.t > 2.5) && mode === 'drive') end(); return;
    }
    if (P.over) { P.over.t += dt; P.speed = Math.max(0, P.speed - 3000 * dt); P.z += P.speed * dt; if (P.over.t > 2.5 && mode === 'drive') end(); return; }
    if (P.striker) strike(P, dt, k); else drive(P, dt, k);
    if (!P.chase && !P.rash && !P.striker) rw.keep(dt, () => ({ L: P.L, json: JSON.stringify({ z: P.z, x: P.x, speed: P.speed, steer: P.steer, lean: P.lean, clock: P.clock, crash: P.crash, spin: P.spin, hop: P.hop, score: P.score, route: P.route }), cars: P.L.traffic.map(c => ({ z: c.z, lane: c.lane })) }));
  }
  /** a step of the drive: the gas, the brake and the steering; the bends pull outward, the grass slows; scenery hit fast
   *  spins the car out; traffic bumps it; the clock; the forks; the chase */
  function drive(P, dt, k, still) {   // (still: the traffic moved already this step, by the duel's first car)
    const L = P.L, road = L.road, cs = road.centers(P.z), on = cs.reduce((a, c) => Math.abs(P.x - c) < Math.abs(P.x - a) ? c : a), off = Math.abs(P.x - on) > 1.08, top = TOP * (P.bike ? 1.05 : 1) + (P.boost > 0 ? 1400 : 0);
    P.clock -= dt; if (P.bump > 0) P.bump -= dt; if (P.boost > 0) P.boost -= dt;
    if (P.crash > 0) {   // spun out: the car turns over and over as it slides to the road, then goes on
      P.crash -= dt; P.spin += dt * 14 * P.crash; P.speed = Math.max(0, P.speed - 5200 * dt); P.x += (on - P.x) * dt * 1.6; P.hop = Math.max(0, Math.sin((1.6 - P.crash) * 4) * 380 * P.crash);
      if (P.crash <= 0) { P.spin = 0; P.hop = 0; }
    } else {
      // a drift (Victory Heat Rally's): the brake held, steering hard at speed: the car slides through the bend instead of
      // braking, the bend pulls it outward less, and it charges a boost let go when the brake is
      const slide = !P.bike && !P.chase && !P.striker && k.brake && Math.abs(k.x) > .5 && P.speed > TOP * .55;
      if (slide) { if (!P.drift) P.drift = Math.sign(k.x); P.charge = Math.min(2, (P.charge || 0) + dt); } else if (P.drift) { if (P.charge > .6) { P.boost = Math.max(P.boost, P.charge * .9); A.sfx('powerup', { vol: .4 }); } P.drift = 0; P.charge = 0; }
      const acc = k.gas ? (P.speed < 2000 ? 2600 : 1500) : -700, br = k.brake && !P.drift ? 5200 : 0;
      P.speed = clamp(P.speed + (acc - br) * dt - (off ? P.speed * 1.4 * dt : 0), 0, top);
      if (k.nitro && P.chase && P.nitro > 0 && P.boost <= 0) { P.nitro--; P.boost = 3; A.sfx('powerup'); }
      const grip = Math.min(1, P.speed / 1200), steer = clamp(k.x, -1, 1);
      P.steer += (steer - P.steer) * Math.min(1, dt * 8); P.x += P.steer * dt * (P.drift ? 2 : 2.3) * grip - road.curveAt(P.z) * (P.speed / TOP) ** 2 * dt * (P.drift ? .16 : .42);
      P.lean += ((P.steer * .9 + road.curveAt(P.z) * P.speed / TOP * .08) - P.lean) * Math.min(1, dt * 5);
      if (road.hits(P.z, P.x, .17).length && P.speed > 1600) { P.crash = 1.6; A.sfx('explode'); game.shake(6); say(E.t('road.crash')); }
      else if (road.hits(P.z, P.x, .17).length) { P.speed *= .5; P.x += P.x > on ? -.15 : .15; A.sfx('bump'); }
    }
    P.x = clamp(P.x, -6, 6); P.z += P.speed * dt; P.score += P.speed * dt * .01; P.turn = (P.turn || 0) + road.curveAt(P.z) * P.speed * dt * .006;
    for (const c of L.traffic) {   // the traffic keeps its lane (a lane of the road it is on); the car meets it
      if (!still) c.z += c.speed * dt;
      const cx = road.centers(c.z)[0] + c.lane;
      if (P.crash <= 0 && P.bump <= 0 && Math.abs(c.z - P.z) < 1500 && Math.abs(cx - P.x) < .42) { P.bump = .6; P.speed = Math.min(P.speed, c.speed) * .7; P.x += P.x > cx ? .3 : -.3; A.sfx('bump'); game.shake(3); }
    }
    if (P.chase) {   // the getaway car: weaves round the traffic; caught up, rammed until its damage is full
      const T = P.target, tc = road.centers(T.z)[0];
      T.z += T.speed * dt; const ahead = L.traffic.find(c => c.z > T.z && c.z - T.z < 3000 && Math.abs(c.lane - T.x) < .4); T.x += ((ahead ? (T.x > 0 ? -2 / 3 : 2 / 3) : T.x) - T.x) * dt * 2;
      if (!T.met && T.z - P.z < 4000) { T.met = true; P.clock += 30; say(E.t('road.close'), 2); A.sfx('secret'); }
      if (Math.abs(T.z - P.z) < 1400 && Math.abs(tc + T.x - P.x) < .5 && P.bump <= 0) { const hit = Math.max(10, (P.speed - T.speed) / 80); T.damage = Math.min(100, T.damage + hit); P.bump = .5; P.speed = T.speed - 150; T.x += P.x < tc + T.x ? .25 : -.25; A.sfx('hit'); game.shake(5); P.score += 500; }
      if (T.damage >= 100 && !P.over) { P.over = { won: true, t: 0 }; say(E.t('road.arrest'), 3); A.sfx('secret'); A.music('victory'); }
      if (T.damage >= 100) T.speed = Math.max(0, T.speed - 3000 * dt);
    }
    if (P.rash) {   // Road Rash: seven riders who race and fight; a punch at the one beside you (three and he goes down), theirs at you
      P.punch = Math.max(0, P.punch - dt);
      const beside = P.rivals.filter(v => v.fall <= 0 && Math.abs(v.z - P.z) < 700 && Math.abs(v.x - P.x) < .6).sort((a, b) => Math.abs(a.z - P.z) - Math.abs(b.z - P.z))[0];
      if (k.nitro && P.punch <= 0 && P.crash <= 0) {
        P.punch = .45; P.side = beside ? Math.sign(beside.x - P.x) || 1 : P.side; A.sfx('swing', { vol: .5 });
        if (beside) { beside.hp--; beside.x += P.side * .3; beside.wob = .4; P.score += 300; A.sfx('hit'); game.shake(2); if (beside.hp <= 0) { beside.fall = 2.4; P.downs++; P.score += 1500; A.sfx('explode'); say(E.t('road.rash.down'), 1.5); } }
      }
      for (const v of P.rivals) {
        v.punch -= dt; v.swing = Math.max(0, v.swing - dt); v.wob = Math.max(0, v.wob - dt);
        if (v.fall > 0) { v.fall -= dt; v.speed = Math.max(0, v.speed - 4200 * dt); v.z += v.speed * dt; if (v.fall <= 0) { v.hp = 3; v.speed = 2400; } continue; }   // (down: it tumbles to a stop, then gets back on)
        const gap = v.z - P.z, want = TOP * v.pace * (gap > 8000 ? .92 : gap < -8000 ? 1.08 : 1), c = road.centers(v.z)[0];
        v.speed += clamp(want - v.speed, -1600 * dt, 1500 * dt); v.z += v.speed * dt;
        const block = L.traffic.find(o => o.z > v.z && o.z - v.z < 2600 && Math.abs(c + o.lane - v.x) < .45); if (block) v.goal = c + (o => o > 0 ? -2 / 3 : o < 0 ? 2 / 3 : (v.k & 1 ? 2 / 3 : -2 / 3))(block.lane);
        v.x += clamp(v.goal - v.x, -1, 1) * dt * 1.4;
        for (const o of L.traffic) if (Math.abs(o.z - v.z) < 900 && Math.abs(c + o.lane - v.x) < .35) { v.speed *= .6; v.x += v.x > c + o.lane ? .2 : -.2; }
        if (Math.abs(gap) < 600 && Math.abs(v.x - P.x) < .55 && v.punch <= 0 && P.crash <= 0 && !P.over) {   // beside you: a blow, now and then
          v.punch = 1.6 + Math.random() * 1.6; v.swing = .4; if (Math.random() < .55) { P.hp--; P.x += Math.sign(P.x - v.x) * .25 || .25; A.sfx('hurt'); game.shake(3); if (P.hp <= 0) { P.hp = 6; P.crash = 1.6; A.sfx('explode'); say(E.t('road.rash.thrown')); } }
        }
      }
      P.place = 1 + P.rivals.filter(v => v.z > P.z).length;
    }
    if (!P.over && P.clock <= 0) { P.clock = 0; P.over = { won: false, t: 0 }; say(E.t(P.chase ? 'road.escaped' : 'road.timeup'), 3); A.sfx('die'); }
    if (!P.over && P.duel && P.z >= L.end - SEG * 2) { P.over = { won: true, t: 0 }; say(E.t('road.duel.won', { n: P.n + 1 }), 3); A.music('victory'); }
    if (!P.over && P.rash && P.z >= L.end - SEG * 2) { const won = P.place <= 3; P.over = { won, t: 0 }; P.score += won ? (4 - P.place) * 3000 : 0; say(E.t(won ? 'road.rash.won' : 'road.rash.lost', { n: P.place }), 3); A.music(won ? 'victory' : 'gameover'); }
    if (!P.over && L.last && P.z >= L.end - SEG * 2 && !P.chase && !P.rash) { P.over = { won: true, t: 0 }; P.score += P.clock * 300; say(E.t('road.goal'), 3); A.music('victory'); }
    if (!P.over && L.last && P.chase && P.z >= L.end - SEG * 2) { P.over = { won: false, t: 0 }; say(E.t('road.escaped'), 3); }
    if (!P.over && !L.last && P.z >= L.fork) fork();
  }
  /** STRIKER's step: flown, not driven. The car goes on by itself; the stick moves it across the road and up and down;
   *  drones (in the air) and armoured cars (on the road) come at it and fire; FIRE shoots ahead */
  function strike(P, dt, k) {
    const L = P.L, road = L.road, c = road.centers(P.z)[0];
    P.speed = 4600; P.z += P.speed * dt; P.score += P.speed * dt * .005; P.turn = (P.turn || 0) + road.curveAt(P.z) * P.speed * dt * .006;
    P.steer += (clamp(k.x, -1, 1) - P.steer) * Math.min(1, dt * 8); P.x = clamp(P.x + P.steer * dt * 2.2, c - 1.3, c + 1.3);
    P.alt = clamp(P.alt - (k.y || 0) * 520 * dt, 0, 900); P.lean = P.steer * .5; P.hurt = Math.max(0, P.hurt - dt); P.fire -= dt;
    if (k.fire && P.fire <= 0) { P.fire = .14; P.shots.push({ z: P.z + 900, x: P.x, alt: P.alt + 40 }); A.sfx('shoot', { vol: .25 }); }
    if ((P.spawn -= dt) <= 0 && P.z < L.end - SEG * 40) {   // the next foe, far ahead: a drone at a height, or an armoured car on the road
      P.spawn = .7 + Math.random() * .9; const air = Math.random() < .6;
      P.foes.push({ z: P.z + 26000, x: c + (Math.random() * 2 - 1) * 1.1, alt: air ? 120 + Math.random() * 600 : 0, air, hp: air ? 1 : 3, speed: air ? 2600 : 1800, shot: 1 + Math.random() * 1.5, sway: Math.random() * 6 });
    }
    for (const s of P.shots) { s.z += 30000 * dt; for (const f of P.foes) if (f.hp > 0 && Math.abs(s.z - f.z) < 900 && Math.abs(s.x - f.x) < .28 && Math.abs(s.alt - f.alt - 30) < 180) { f.hp--; s.dead = true; A.sfx('hit', { vol: .3 }); if (!f.hp) { P.kills++; P.score += f.air ? 300 : 800; A.sfx('explode', { vol: .5 }); } break; } }
    P.shots = P.shots.filter(s => !s.dead && s.z < P.z + 40000);
    for (const f of P.foes) if (f.hp > 0) {
      f.z += f.speed * dt; f.sway += dt; if (f.air) f.x += Math.sin(f.sway * 1.3) * dt * .5;
      if ((f.shot -= dt) <= 0 && f.z - P.z > 5000 && f.z - P.z < 20000) { f.shot = 2.6 + Math.random() * 2; const e = (Math.random() - .5) * .5, T = (f.z - P.z) / (7000 + P.speed); P.bolts.push({ z: f.z, x: f.x, alt: f.alt + 30, vx: (P.x + e - f.x) / T, va: (P.alt + e * 300 - f.alt) / T }); }   // (aimed where you are, roughly: keep moving)   // (it closes at its speed and yours)
      if (Math.abs(f.z - P.z) < 700 && Math.abs(f.x - P.x) < .3 && Math.abs(f.alt - P.alt) < 140 && P.hurt <= 0) { f.hp = 0; hit(P); }   // (rammed)
    }
    P.foes = P.foes.filter(f => f.hp > 0 && f.z > P.z - 3000);
    for (const b of P.bolts) { b.z -= 7000 * dt; b.x += b.vx * dt; b.alt += b.va * dt; if (Math.abs(b.z - P.z) < 500 && Math.abs(b.x - P.x) < .16 && Math.abs(b.alt - P.alt - 30) < 90 && P.hurt <= 0) { b.dead = true; hit(P); } }
    P.bolts = P.bolts.filter(b => !b.dead && b.z > P.z - 2000);
    if (P.alt < 60) for (const o of L.traffic) if (Math.abs(o.z - P.z) < 1500 && Math.abs(c + o.lane - P.x) < .42 && P.hurt <= 0) hit(P);   // (low enough to meet the traffic)
    for (const o of L.traffic) o.z += o.speed * dt;
    if (!P.over && P.z >= L.end - SEG * 2) { P.over = { won: true, t: 0 }; P.score += P.shield * 2000; say(E.t('road.striker.won'), 3); A.music('victory'); }
  }
  function hit(P) { P.shield--; P.hurt = 1.2; A.sfx('hurt'); game.shake(5); if (P.shield <= 0 && !P.over) { P.over = { won: false, t: 0 }; say(E.t('road.striker.down'), 3); A.sfx('die'); } }
  function end() { mode = 'results'; after.i = 0; P.best = best('road:' + (P.chase ? 'chase' : P.duel ? 'duel' : P.rash ? 'rash' : P.striker ? 'striker' : 'coast'), Math.round(P.score)); }   // (each mode its own record: their scores aren't alike)
  /** the autopilot (the bot, and a demo): the lane clear of traffic, the gas, a brake into the hardest bends, left at
   *  the first fork and right at the next; in the chase, at the getaway car with the nitro */
  function pilot(P = ROAD_P()) {
    if (P.striker) { const f = P.foes.filter(o => o.z > P.z + 2000).sort((a, b) => a.z - b.z)[0], bolt = P.bolts.find(b => b.z - P.z < 5000 && Math.abs(b.x + b.vx * (b.z - P.z) / 7000 - P.x) < .35); return { x: clamp(((f ? f.x : P.L.road.centers(P.z)[0]) + (bolt ? .5 : 0) - P.x) * 4, -1, 1), y: clamp((P.alt - (f ? f.alt : 300)) / 120, -1, 1), fire: !!f && Math.abs(f.x - P.x) < .3, gas: true }; }   // (STRIKER: line up the nearest foe ahead and fire; a bolt coming: step aside)
    const L = P.L, road = L.road, cs = road.centers(P.z), forkNear = !L.last && L.fork - P.z < 70 * SEG + 4000, side = P.route.length % 2 ? 1 : 0, want0 = forkNear ? (cs.length > 1 ? cs[side] : cs[0] + (side ? .66 : -.66)) : cs.reduce((a, c) => Math.abs(P.x - c) < Math.abs(P.x - a) ? c : a);
    let want = want0, top = -1e9;
    for (const lane of [0, -2 / 3, 2 / 3]) { const x = want0 + lane, block = L.traffic.filter(c => c.z > P.z - 1600 && Math.abs(road.centers(c.z)[0] + c.lane - x) < .5).reduce((a, c) => Math.min(a, c.z - P.z), 1e9), sc = Math.min(block, 9000) - Math.abs(x - P.x) * 900 - Math.abs(lane) * 200; if (sc > top) { top = sc; want = x; } }   // (the lane whose next car is farthest)
    if (P.chase) { const T = P.target; if (T.z - P.z < 5000) want = road.centers(T.z)[0] + T.x; }
    const c = road.curveAt(P.z + 3000);
    const fight = P.rash && P.rivals.some(v => v.fall <= 0 && Math.abs(v.z - P.z) < 600 && Math.abs(v.x - P.x) < .55);
    return { x: clamp((want - P.x) * 3 + c * (P.speed / TOP) ** 2 * .2, -1, 1), gas: true, brake: Math.abs(c) > 4.5 && P.speed > TOP * .8, nitro: P.chase ? P.target.z - P.z > 6000 : fight, rewind: false };
  }

  /* ---- the look ---- */
  function draw(r) {
    const W0 = r.W, H = r.H;
    if (mode === 'menu' || mode === 'radio' || mode === 'join') {
      const L = demoLeg || (demoLeg = leg(0, 0, false)), z = (t * 2600) % (L.end - SEG * 20);
      L.road.draw(r, { z, x: Math.sin(t * .4) * .4, h: 1000, turn: (t * 40) % 4000, cars: [] });
      r.overlay(g => { E.font.title(g, E.t('road.title'), W0 / 2, 18, { scale: 4, align: 'center', colors: ['#fff6d0', '#ffd060', '#ff7a2a', '#d02a5a'], depth: 3 }); });
      if (mode === 'menu') { menu.y = Math.round(H / 2) - 6; menu.draw(r); return; }
      if (mode === 'join') { r.overlay(g => E.font.text(g, E.t('road.duel.join'), W0 / 2, H / 2, '#ffffff', { align: 'center', shadow: '#000', outline: false })); return; }
      r.overlay(g => {   // the radio: three songs to pick from
        E.font.text(g, E.t('road.radio'), W0 / 2, H * .34, '#ffffff', { align: 'center', shadow: '#000', outline: false });
        SONGS.forEach((s, i) => { const w = Math.min(120, W0 / 3 - 8), x = Math.round(W0 * (i + .5) / 3 - w / 2), y = Math.round(H / 2 - 10); E.ui.box(g, x, y, w, 26, { bg: i === song ? '#3a2a6a' : '#141a3a', border: i === song ? '#ffe04a' : '#8888aa' }); E.font.text(g, E.t(s.name), x + w / 2, y + 9, i === song ? '#ffe890' : '#c8c8e0', { align: 'center', outline: false }); });
        E.font.text(g, E.t('road.radio.go', { key: game.input.label('confirm') }), W0 / 2, H / 2 + 26, '#ffffff', { align: 'center', shadow: '#000', outline: false });
      });
      return;
    }
    return view(r, DUO ? DUO[r.viewport ? r.viewport.i : 0] : P);
  }
  /** a player's screen: the road, the cars (the other duellist's too), the HUD, in its viewport */
  function view(r, P) {
    const vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H }, W0 = vp.w, H = vp.h;
    const L = P.L, road = L.road, h = P.striker ? 1000 + P.alt * .35 : P.bike ? 760 : 1000, camZ = P.z - road.ahead(h, r) - 1700, cars = [], tt = t;
    if (P.striker) {   // the foes, your shots and theirs, at their heights over the road; your shadow on it under you
      cars.push({ z: P.z, x: P.x, w: 900, draw: (g, sx, sy, sc) => px.ell(g, sx, sy, 520 * sc, 110 * sc, '#14141c') });
      for (const f of P.foes) if (f.z > camZ) cars.push(road.mesh(f.air ? DRONE : SEDAN, f.z, f.x, { scale: CK, y: f.alt, yaw: Math.PI, colors: { body: f.air ? '#4a4a5a' : '#3a4a3a', glass: '#ff3a3a', roof: '#2a3a2a' } }));
      for (const o of P.shots.concat(P.bolts)) if (o.z > camZ) cars.push({ z: o.z, x: o.x, w: 80, draw: (g, sx, sy, sc) => px.disc(g, sx, sy - o.alt * sc, Math.max(1, 50 * sc), P.shots.includes(o) ? '#ffe060' : '#ff4a8a') });
    }
    if (DUO) { const Q = DUO[1 - P.n]; if (Q.z > camZ && Q.z - camZ < 210 * SEG) cars.push(road.mesh(CAR, Q.z, Q.x, { scale: CK, yaw: Q.steer * .14 + Q.spin, roll: -Q.steer * .05, y: Q.hop, colors: { body: Q.n ? '#2a6ae8' : '#e8202a', shirt: '#f0f0f0', tail: '#a82020' } })); }
    for (const c of L.traffic) if (c.z > (P.striker ? P.z - 600 : camZ) && c.z - camZ < 210 * SEG) cars.push(road.mesh(c.model, c.z, road.centers(c.z)[0] + c.lane, { scale: CK, colors: { body: c.col, glass: '#2a3a4a', roof: c.col } }));
    if (P.chase) { const T = P.target, tc = road.centers(T.z)[0]; cars.push(road.mesh(SEDAN, T.z, tc + T.x, { scale: CK, yaw: T.damage >= 100 ? .3 : 0, colors: { body: T.damage > 60 ? '#6a2a2a' : '#c8202a', glass: '#1a1a22', roof: '#c8202a' } })); }
    if (P.rash) for (const v of P.rivals) if (v.z > camZ && v.z - camZ < 210 * SEG) {   // the riders: a punch leans one into it, a fall tumbles it
      const ro = { scale: CK, yaw: v.fall > 0 ? v.fall * 4 : 0, roll: (v.swing > 0 ? Math.sign(P.x - v.x) * .5 : 0) + (v.wob > 0 ? Math.sin(v.wob * 30) * .2 : 0), y: v.fall > 0 ? Math.abs(Math.sin(v.fall * 5)) * 300 * v.fall / 2.4 : 0 };
      cars.push(road.mesh(BIKE, v.z, v.x, Object.assign({ colors: { body: v.col } }, ro))); if (v.fall <= 1.2) cars.push(road.mesh(RIDER, v.z, v.x, Object.assign({ colors: { suit: v.suit, helm: v.col } }, ro)));
    }
    if (P.drift) for (const d of [-.13, .13]) for (let i = 0; i < 3; i++) cars.push({ z: P.z - 260 - i * 220 - (t * 3000 % 220), x: P.x + d - P.drift * i * .05, w: 120, draw: (g, sx, sy, sc) => { const a = g.globalAlpha; g.globalAlpha = .45 - i * .12; px.disc(g, sx, sy - 40 * sc, Math.max(1, (50 + i * 30) * sc), '#e0e0e8'); g.globalAlpha = a; } });   // (tyre smoke, thinning behind)
    const o = { scale: CK, yaw: P.steer * .14 + P.spin + (P.drift || 0) * .4, roll: P.bike ? P.lean * .7 + (P.punch > .2 ? P.side * .5 : 0) : P.striker ? -P.steer * .4 : -P.steer * .05, y: P.striker ? P.alt : P.hop };
    if (P.bike) { cars.push(road.mesh(BIKE, P.z, P.x, Object.assign({ colors: { body: '#e8402a' } }, o))); cars.push(road.mesh(RIDER, P.z, P.x, Object.assign({ colors: { suit: '#2a3a8a', helm: '#f0f0f0' } }, o))); }
    else { cars.push(road.mesh(CAR, P.z, P.x, Object.assign({ colors: { body: P.chase ? '#f0f0f0' : P.n ? '#2a6ae8' : '#e8202a', shirt: '#f0f0f0', tail: game.input.down('brake') && !auto ? '#ff6060' : '#a82020' } }, o))); if (P.chase) cars.push(road.mesh(LIGHTS, P.z, P.x, Object.assign({ colors: { l1: tt * 6 % 2 < 1 ? '#ff2a2a' : '#5a1010', l2: tt * 6 % 2 < 1 ? '#1a1a5a' : '#3a6aff' } }, o))); }
    road.draw(r, { z: camZ, x: P.x, h, turn: P.turn || 0, cars });
    r.overlay(g => { g.save(); g.translate(vp.x, vp.y);   // (in its viewport: the duel's two screens)
      const txt = (s, x, y, c = '#ffffff', o2 = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#100818', outline: false }, o2)), lh = E.font.lineHeight(), right = (r.viewport ? W0 : cornerX()) - 4;
      if (P.striker) { for (let i = 0; i < 5; i++) px.rect(g, W0 / 2 - 24 + i * 10, 6, 8, 6, i < P.shield ? (P.hurt > 0 && Math.floor(t * 12) % 2 ? '#ffffff' : '#40e0ff') : '#2a2a3a'); txt(E.t('road.striker.kills', { n: P.kills }), W0 / 2, 16, '#ffffff', { align: 'center' }); }
      else if (P.duel) { const Q = DUO[1 - P.n], d = Math.round((P.z - Q.z) / 380); txt(E.t('road.duel.you', { n: P.n + 1 }), W0 / 2, 4, P.n ? '#80b0ff' : '#ff9090', { align: 'center' }); txt(E.t(d >= 0 ? 'road.duel.ahead' : 'road.duel.behind', { m: Math.abs(d) }), W0 / 2, 6 + lh, '#ffffff', { align: 'center' }); }
      else if (!P.rash) { txt(E.t('road.time'), W0 / 2, 4, '#ffe890', { align: 'center' }); txt(String(Math.ceil(P.clock)), W0 / 2, 6 + lh, P.clock < 10 && Math.floor(t * 4) % 2 ? '#ff6060' : '#ffffff', { align: 'center', scale: 2 }); }
      txt(E.t('road.score', { n: Math.round(P.score) }), 6, 6, '#ffffff'); txt(E.t('road.stage.' + STAGES[L.i].id), 6, 6 + lh, '#a8d8ff');
      txt(E.t('road.kmh', { n: Math.round(P.speed * KMH) }), right, 6, '#ffffff', { align: 'right' });
      if (P.drift) { const y = 10 + lh * 3; txt(E.t('road.drift'), W0 / 2, y, P.charge > .6 ? '#ffe040' : '#ffffff', { align: 'center' }); px.rect(g, W0 / 2 - 30, y + lh + 2, Math.round(60 * Math.min(1, P.charge / 2)), 3, P.charge > .6 ? '#ffe040' : '#a0a0b0'); }
      if (P.striker) txt(E.t('road.striker.fire', { key: game.input.label('nitro') }), right, 6 + lh, '#c8c8e0', { align: 'right' });
      if (!P.chase && !P.rash && !P.duel && !P.striker) txt(E.t('road.rewinds', { n: P.rewinds, key: game.input.label('rewind') }), right, 6 + lh, P.rewinding ? '#80c8ff' : '#c8c8e0', { align: 'right' });
      if (P.rash) { txt(E.t('road.rash.place', { n: P.place, of: P.rivals.length + 1 }), right, 6 + lh, P.place <= 3 ? '#80ffa0' : '#ffb0b0', { align: 'right' }); const w = 60, x = right - w, y = 8 + lh * 2; px.rect(g, x - 1, y - 1, w + 2, 6, '#100818'); px.rect(g, x, y, Math.round(w * P.hp / 6), 4, P.hp <= 2 ? '#ff4040' : '#ffd040'); txt(E.t('road.rash.punch', { key: game.input.label('nitro') }), right, y + 8, '#c8c8e0', { align: 'right' }); }
      if (P.chase) {
        const T = P.target, d = Math.max(0, Math.round((T.z - P.z) / 380)), w = 70, x = right - w, y = 8 + lh * 2;
        txt(E.t('road.target', { m: d }), right, 6 + lh, '#ffb0b0', { align: 'right' }); px.rect(g, x - 1, y - 1, w + 2, 6, '#100818'); px.rect(g, x, y, Math.round(w * T.damage / 100), 4, '#ff4040');
        txt(E.t('road.nitro', { n: P.nitro }), right, y + 8, '#80ffa0', { align: 'right' });
      }
      if (!P.chase && !P.rash && !P.duel && !P.striker) {   // the route: the pyramid of stages, the ones driven lit
        const ox = 8, oy = H - 34; for (let i = 0; i < 6; i++) { const rw2 = ROW(i), col = i - (rw2 === 0 ? 0 : rw2 === 1 ? 1 : 3), x = ox + 12 + (col - rw2 / 2) * 12, y = oy + rw2 * 10; px.rect(g, x, y, 9, 7, P.route.includes(i) ? (i === L.i ? (Math.floor(t * 4) % 2 ? '#ffe890' : '#ff9a30') : '#ffd040') : '#3a3a5a'); }
      }
      if (P.rewinding) { px.rect(g, 0, 0, W0, 2, '#80c8ff'); px.rect(g, 0, H - 2, W0, 2, '#80c8ff'); txt(E.t('road.rewinding'), W0 / 2, H * .62, '#80c8ff', { align: 'center' }); }
      if (!L.last && P.z > L.end - SEG * 30 && P.z < L.fork) txt(E.t('road.fork'), W0 / 2, H * .36, '#ffffff', { align: 'center' });
      if (bannerT > 0 && banner) txt(banner, W0 / 2, Math.round(H * .26), '#ffffff', { align: 'center', scale: 2 });
      if (mode === 'results') { txt(E.t('road.final', { n: Math.round(P.score) }), W0 / 2, Math.round(H * .26) + lh * 2 + 6, '#ffffff', { align: 'center' }); txt(E.t('road.best', { n: P.best }), W0 / 2, Math.round(H * .26) + lh * 3 + 8, '#c8b8f0', { align: 'center' }); if (P.over && P.over.won !== undefined) txt(P.striker ? E.t(P.over.won ? 'road.striker.won' : 'road.striker.down') : P.duel ? E.t('road.duel.won', { n: DUO.find(Q => Q.over && Q.over.won) ? DUO.find(Q => Q.over && Q.over.won).n + 1 : 1 }) : P.rash ? E.t(P.over.won ? 'road.rash.won' : 'road.rash.lost', { n: P.place }) : E.t(P.over.won ? (P.chase ? 'road.arrest' : 'road.goal') : (P.chase ? 'road.escaped' : 'road.timeup')), W0 / 2, Math.round(H * .26), '#ffe890', { align: 'center', scale: 2 }); }
      g.restore();
    });
    if (mode === 'results' && (!r.viewport || r.viewport.i === 0)) { after.y = Math.round(H / 2) + 30; after.draw(r); }
  }
  let demoLeg = null;

  /** the bot (tools/kits-test.mjs): a coast run by the autopilot from the beach to the goal (left at the first fork,
   *  right at the next), a rewind, the bike's first stage, and the chase to the arrest */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s);
    try {
      game.go('road', null, { fade: 0 }); game.advance(1 / 120); auto = true; const out = {};
      ride = 'car'; start('car'); let n = 0; for (; n < 260 && mode === 'drive'; n++) game.advance(1);
      out.coast = { goal: !!(P.over && P.over.won), route: P.route.map(i => STAGES[i].id), clock: Math.round(P.clock), score: Math.round(P.score), seconds: n };
      ride = 'car'; start('car'); game.advance(5); const z0 = P.z; P.rewinds = 1; auto = false; game.input.hold('rewind'); game.advance(1); game.input.hold('rewind', false); auto = true; out.rewind = { back: Math.round(z0 - P.z), left: P.rewinds };
      ride = 'car'; start('car'); auto = false; const I = game.input; I.hold('gas'); game.advance(2.2); I.hold('brake'); I.hold('right'); game.advance(.9); const ch = P.charge; I.hold('brake', false); I.hold('right', false); game.advance(.05); out.drift = { charge: +ch.toFixed(2), boost: +P.boost.toFixed(2) }; I.hold('gas', false); auto = true;   // (a drift on the beach's first straight, let go into a boost)
      ride = 'bike'; start('bike'); for (n = 0; n < 80 && P.route.length < 2 && mode === 'drive'; n++) game.advance(1); out.bike = { forked: P.route.length > 1, seconds: n };
      start('rash'); for (n = 0; n < 240 && mode === 'drive'; n++) game.advance(1); out.rash = { finished: !!P.over && P.z >= P.L.end - SEG * 3, place: P.place, downs: P.downs, seconds: n };
      if (game.players.length < 2) game.addPlayer({ keys: 'right' }); start('duel'); for (n = 0; n < 240 && mode === 'drive'; n++) game.advance(1);
      out.duel = { viewports: game.viewports.length, finished: !!DUO && DUO.some(Q => Q.over && Q.over.won), seconds: n }; toMenu(); while (game.players.length > 1) game.removePlayer(game.players.length);
      start('striker'); for (n = 0; n < 200 && mode === 'drive'; n++) game.advance(1); out.striker = { finished: !!(P.over && P.over.won), kills: P.kills, shield: P.shield, seconds: n };
      start('chase'); for (n = 0; n < 200 && mode === 'drive'; n++) game.advance(1); out.chase = { arrested: !!(P.over && P.over.won), damage: Math.round(P.target.damage), seconds: n };
      toMenu(); return Object.assign(out, { errors: game.errors.length });
    } finally { Math.random = was; auto = false; }
  }

  return { view: 'topdown', views: ['topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['brake', 'rewind', 'nitro'], camera: { zoom: false },
    exit() { game.splitScreen(0); game.allowJoin(false); },
    enter(d) { mode = 'menu'; P = null; DUO = null; auto = false; menu.i = 0; game.allowJoin({ max: 2 }); game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false; A.music('title'); game.screen.setOptions({ res: d && d.part === 'hd' ? [960, 540] : 'ps1' });   // (#road/hd: the coast run at today's resolution, Horizon Chase's and Slipstream's)
      if (d && d.part) { if (d.part === 'duel') duel(); else if (d.part === 'chase' || d.part === 'rash' || d.part === 'striker') start(d.part); else { ride = d.part === 'bike' ? 'bike' : 'car'; start(ride); } } },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'radio' || mode === 'results' || mode === 'join') { toMenu(); return true; } return false; },
    update, draw, bot,
    /** a run driven by the autopilot (a demo; the bot's): 'car', 'bike', 'rash' or 'chase' */
    demo(what) { if (what === 'chase' || what === 'rash' || what === 'duel' || what === 'striker') start(what); else { ride = what === 'bike' ? 'bike' : 'car'; start(ride); } auto = true; },
    state: () => P && { mode, drift: P.drift || 0, charge: +(P.charge || 0).toFixed(2), boost: +(P.boost || 0).toFixed(2), striker: P.striker && { alt: Math.round(P.alt), shield: P.shield, kills: P.kills, foes: P.foes.length }, rash: P.rash, place: P.place, hp: P.hp, downs: P.downs, chase: P.chase, bike: P.bike, z: Math.round(P.z), x: +P.x.toFixed(3), speed: Math.round(P.speed), clock: +P.clock.toFixed(2), stage: STAGES[P.L.i].id, route: P.route.slice(), crash: P.crash > 0, rewinds: P.rewinds, rewinding: P.rewinding, target: P.target && { z: Math.round(P.target.z), damage: Math.round(P.target.damage) }, score: Math.round(P.score) },
    /** the proof: a coast run, the gas held, a weave left and right through the first bends, a brake */
    run: (n = 600) => proof('road', n, (i, k) => {
      if (i === 2) { ride = 'car'; start('car'); }
      if (i === 10) k.hold('gas');
      if (i === 200) k.hold('left'); if (i === 300) { k.up('left'); k.hold('right'); } if (i === 420) { k.up('right'); k.hold('brake'); } if (i === 470) k.up('brake');
    }, () => P && [P.z, P.x, P.speed, P.clock, P.crash, P.score], () => { game.input.lastDevice = 'keyboard'; }) };
})();
scenes.road = ROAD;

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
