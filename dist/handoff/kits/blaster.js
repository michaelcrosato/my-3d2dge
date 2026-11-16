// The BLASTER kit's game (shooters into the screen, six stages: a jet-pack hero over a checkered plain, a jet that rolls the horizon and locks on, a first-person ride with a cursor, a craft along a winding neon course, a speeder free over the dunes that hunts crawlers by radar, an attack helicopter up a city's avenue, seen first from overhead; four bosses; Space Harrier, After Burner, Yoshi's Safari, HyperZone, Super Star Wars, Thunder Blade), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 168 (src/starter/31-blaster.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. blaster.html plays it; node kits/test.mjs blaster runs it headless.
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
  { id: 'blaster', label: 'BLASTER', about: 'INTO THE SCREEN: SIX STAGES, FOUR BOSSES', family: 'ARCADE' },
  { id: 'arcade', label: 'ARCADE', about: 'A CABINET OF THREE CLASSICS', family: 'ARCADE' },
  { id: 'pinball', label: 'PINBALL', about: 'ONE TABLE: RAMP, MULTIBALL, JACKPOT', family: 'ARCADE' },
  { id: 'kart', label: 'KART', about: 'MODE 7 KARTS, THREE LAPS', family: 'RACING' },
  { id: 'road', label: 'ROAD', about: 'RACE, FIGHT, CHASE AND FLY DOWN THE ROAD', family: 'RACING' },
  { id: 'zero', label: 'ZERO', about: 'ANTI-GRAVITY: A CITY, A RIBBON IN THE SKY', family: 'RACING' },
  { id: 'special', label: 'SPECIAL', about: 'A PLANET, A HALF-PIPE, AN ARENA, A FORT, A ROOM', family: 'ARCADE' },
  { id: 'sky', label: 'SKY', about: 'PLANE, SKYDIVE, BELT, GLIDER, HELICOPTER, AIRSHIP', family: 'FLIGHT' },
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
 * SLICE 24  BLASTER  (Space Harrier, After Burner, Thunder Blade, Yoshi's Safari, HyperZone, Super Star Wars). @modules mode7 mesh
 * Shooters into the screen, six stages in a row (or one picked on the menu). HARRIER: a hero with a jet pack over a
 * checkered plain, anywhere on the screen, firing into it at saucers and jets; columns to dodge; a serpent at the end.
 * BURNER: a jet over the sea (seen first from overhead, as Thunder Blade opens), the horizon tilting as it banks: its cannon, missiles at what the reticle has locked, a
 * barrel roll that shakes off missiles; a bomber at the end. SAFARI: first person on rails through a valley, a cursor
 * to aim: slimes and bats out from behind the rocks (a rock stops a shot), a walker with three weak points at the end.
 * ZONE (HyperZone): a craft along a winding course over a neon grid, the camera banking into its bends: pods to
 * shoot, mines on the course to steer round, the gate at its end. SPEEDER (Super Star Wars' speeders): free over the
 * dunes, low, turned where you will: four crawlers to find by the radar and bring down, skimmers that hunt you. BLADE
 * (Thunder Blade): an attack helicopter up a city's avenue by itself, seen first from straight overhead (it moves about
 * the screen, its gun firing down at the tanks and jeeps in the streets and the turrets on the roofs), then the camera
 * swings down behind it and it flies low between the buildings, or up over them: round a wing or under a skybridge in
 * its way (a building hit hurts), helicopters head on, a gauge of its height and the roof ahead; a gunship at the end.
 * Three lives, a score and a best. Deep links: #blaster/harrier, #blaster/burner, #blaster/safari, #blaster/zone,
 * #blaster/speeder, #blaster/blade. KEYS: the arrows (the hero, the jet, the helicopter: up climbs, overhead up flies
 * ahead; the cursor; the speeder: up faster), J / Z / Space or a click fire, K / X the missiles, L / C / Shift the
 * barrel roll. A pad: the stick, A fire, X missiles, B the roll. TOUCH: the stick, and it fires by itself; MISSILE and
 * ROLL in the jet; in the safari a tap shoots where it lands.
 * HOW IT WORKS: E.Mode7 (the mode7 module): the plain, the sea, the valley and the city's streets, the camera rolled
 * with the jet, m7.pick under the cursor; E.Mesh (the mesh module) the saucers, jets, missiles, columns, rocks, the
 * bomber, the walker, the helicopters (their rotors laid out in the body's frame), tanks, jeeps and the city's buildings;
 * E.Humanoid the hero, E.Blob the slimes and bats, E.Path the rails; this file the stages, their waves and the score.
 * ===================================================================================== */
const BLASTER = (() => {
  const KEYS = Object.assign({}, E.Input.DEFAULT, { fire: ['KeyJ', 'KeyZ', 'Space', 'Mouse0', 'Pad0', 'Pad7'], missile: ['KeyK', 'KeyX', 'Pad2', 'Pad5'], roll: ['KeyL', 'KeyC', 'ShiftLeft', 'ShiftRight', 'Pad1', 'Pad4'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  const STAGES = ['harrier', 'burner', 'safari', 'zone', 'speeder', 'blade'], hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  /* ---- THE MODELS (x forward, y right, z up) ---- */
  const SAUCER = new E.Mesh([['ball', [0, 0, 6], [16, 16, 4], 'hull', { n: 10 }], ['ball', [0, 0, 9.5], [7, 7, 5], '#8ae0ff', { n: 8 }], ['tube', [0, 0, 1.6], 5, 1.4, '#ffd040', { axis: 'z', n: 6 }]]);
  const JET = new E.Mesh([['tube', [2, 0, 4], 2.6, 12, 'body', { n: 8, end: .3 }], ['tube', [-13, 0, 4.2], 2.3, 3, '#3a3a42', { n: 8, end: 1.15 }],
    ['face', [[7, 2, 4], [-6, 2, 4], [-10, 14, 3.4], [-5, 14, 3.4]], 'body', { both: true, mirror: true }], ['face', [[-10, 2.5, 4.4], [-17, 2.5, 4.4], [-18.5, 8, 4.2], [-15.5, 8, 4.2]], 'body', { both: true, mirror: true }],
    ['face', [[-10, 2.6, 6], [-16.5, 2.6, 6], [-18, 3.6, 13], [-14.5, 3.6, 13]], 'tail', { both: true, mirror: true }], ['ball', [6.5, 0, 6.4], [4, 1.8, 1.9], '#5ab8f0', { n: 6 }], ['box', [0, 3.3, 3.4], [4, 1.2, 1.4], '#5a5a62', { mirror: true }]]);
  const MISSILE = new E.Mesh([['tube', [0, 0, 0], .9, 4, '#eceae4', { n: 5, end: .25 }], ['face', [[-2.5, 0, 0], [-4.5, 0, 0], [-4.5, 0, 2.6]], '#c83a30', { both: true }], ['face', [[-2.5, 0, 0], [-4.5, 0, 0], [-4.5, 2.6, 0]], '#c83a30', { both: true, mirror: true }]]);
  const PILLAR = new E.Mesh([['tube', [0, 0, 60], 10, 60, 'col', { axis: 'z', n: 8 }], ['box', [0, 0, 123], [14, 14, 3], 'cap'], ['box', [0, 0, 2], [14, 14, 2], 'cap']]);
  const ROCK = new E.Mesh([['ball', [0, 0, 10], [26, 20, 16], '#8a8278', { n: 7 }], ['ball', [10, 8, 6], [12, 10, 8], '#7a7268', { n: 6 }]]);
  const SEG = new E.Mesh([['ball', [0, 0, 0], [22, 22, 22], 'hue', { n: 8 }], ['tube', [0, 0, 16], 3, 5, '#f0e8c8', { axis: 'z', n: 4, end: 0 }]]);
  const HEAD = new E.Mesh([['ball', [0, 0, 0], [26, 21, 19], 'hue', { n: 8 }], ['box', [20, 0, -4], [10, 12, 6], 'hue', { top: [.8, .8] }], ['tube', [-6, 11, 20], 3.5, 9, '#f0e8c8', { axis: 'z', n: 5, end: 0, mirror: true }], ['ball', [19, 9, 6], [4, 4, 4], '#fff4a0', { n: 6, mirror: true }], ['box', [26, 0, -9], [6, 11, 2], '#5a1a2a']]);
  const WALKER = new E.Mesh([['box', [0, 18, 30], [7, 6, 30], '#5a5e6a', { mirror: true }], ['box', [0, 18, 2], [12, 9, 2], '#3a3e4a', { mirror: true }], ['box', [0, 0, 72], [22, 30, 14], 'hull', { top: [.85, .8] }],
    ['box', [16, 0, 84], [8, 14, 6], '#2a2e3a', { top: [.6, .8] }], ['box', [24, 0, 74], [4, 18, 3], '#ffc040'], ['box', [0, 0, 92], [12, 12, 6], 'hull', { top: [.5, .6] }], ['box', [0, 18, 62], [9, 8, 4], '#3a3e4a', { mirror: true }], ['box', [6, 18, 4], [16, 8, 4], '#4a4e5a', { top: [.7, 1], mirror: true }]]);
  const ARM = new E.Mesh([['box', [0, 0, 0], [10, 7, 7], 'hull'], ['tube', [16, 0, 0], 3.2, 9, '#2a2e3a', { n: 6 }]]);
  const CORE = new E.Mesh([['ball', [0, 0, 0], [9, 9, 9], 'core', { n: 8 }]]);
  const SPEEDER = new E.Mesh([['box', [0, 0, 3], [12, 5, 1.6], 'body', { top: [.7, .9] }], ['tube', [-6, 6, 4], 1.8, 6, '#5a5a62', { n: 6, mirror: true }], ['ball', [3, 0, 5], [4, 3, 2.2], '#5ab8f0', { n: 6 }]]);
  const CRAWLER = new E.Mesh([['box', [0, 0, 16], [24, 13, 13], 'hull', { top: [.8, .85] }], ['box', [6, 0, 33], [11, 9, 5], 'hull', { top: [.7, .8] }], ['box', [0, 14, 6], [24, 3, 6], '#3a3430', { mirror: true }], ['box', [24, 0, 24], [1, 9, 3], '#ffc040']]);
  // the city's: an attack helicopter (its rotors drawn apart, turning: rotor()), the armoured gunship with two, a tank and
  // its turret, a jeep, a roof gun, a tree
  const HELI = new E.Mesh([['ball', [2, 0, 12], [15, 6, 6.5], 'body', { n: 8 }], ['ball', [10, 0, 14.5], [7, 4.2, 4.6], '#8ad0f0', { n: 6 }], ['tube', [-19, 0, 14], 1.4, 12, 'body', { n: 6, end: 1.7 }],
    ['face', [[-29, 0, 14], [-34, 0, 14], [-36, 0, 25], [-32, 0, 25]], 'trim', { both: true }], ['face', [[-26, 0, 14.5], [-30, 0, 14.5], [-30, 6, 14.5], [-27, 6, 14.5]], 'trim', { both: true, mirror: true }],
    ['box', [-1, 0, 19.5], [7, 3.6, 2.4], 'body', { top: [.8, .8] }], ['tube', [0, 0, 23.5], 1, 1.6, '#3a3a42', { axis: 'z', n: 5 }], ['box', [0, 7.5, 10.5], [3.5, 3, .7], 'trim', { mirror: true }], ['tube', [1, 11, 9.4], 1.8, 4.5, '#3a3a42', { n: 6, mirror: true }],
    ['box', [2, 6, 1], [12, .8, .8], '#2a2a30', { mirror: true }], ['box', [-5, 5, 4], [.7, .7, 3], '#2a2a30', { mirror: true }], ['box', [8, 5, 4], [.7, .7, 3], '#2a2a30', { mirror: true }], ['tube', [16, 0, 7.5], .8, 3.5, '#2a2a30', { n: 4 }]]);
  const GUNSHIP = new E.Mesh([['box', [0, 0, 14], [24, 8, 8], 'hull', { top: [.85, .75] }], ['box', [27, 0, 12], [5, 7, 6], 'hull', { top: [.5, .7], tip: [-3, 0] }], ['ball', [27, 0, 17], [5, 4.5, 3], '#ff6a3a', { n: 6 }],
    ['box', [-28, 0, 18], [6, 5, 6], 'hull', { top: [.8, .8] }], ['box', [18, 0, 23], [6, 4, 2], 'hull'], ['tube', [18, 0, 26], 1.2, 1.2, '#3a3a42', { axis: 'z', n: 5 }], ['tube', [-27, 0, 25.5], 1.2, 1.5, '#3a3a42', { axis: 'z', n: 5 }],
    ['box', [0, 12, 10], [6, 4, 1.2], 'trim', { mirror: true }], ['tube', [2, 18, 8], 2.6, 7, '#2a2a30', { n: 6, mirror: true }], ['tube', [12, 18, 8], .9, 3, '#1a1a20', { n: 4, mirror: true }], ['box', [-4, 0, 4.5], [14, 6, 2], '#3a3a42']]);
  const TANK = new E.Mesh([['box', [0, 0, 5], [13, 6, 3], 'hull', { top: [.85, .85] }], ['box', [0, 8.5, 3.5], [14, 2.5, 3.5], '#2a2a26', { mirror: true }]]);
  const TURRET = new E.Mesh([['box', [-1, 0, 2.5], [6, 5, 2.5], 'hull', { top: [.75, .8] }], ['tube', [11, 0, 3], 1, 7, '#3a3a36', { n: 5 }]]);
  const JEEP = new E.Mesh([['box', [0, 0, 5], [9, 5, 2.5], 'body', { top: [.95, .95] }], ['box', [-1, 0, 9.5], [3.5, 4.5, 2], 'body', { top: [.8, .9] }], ['tube', [6, 5.5, 2.5], 2.5, 1, '#1a1a1a', { axis: 'y', n: 6, mirror: true }],
    ['tube', [-6, 5.5, 2.5], 2.5, 1, '#1a1a1a', { axis: 'y', n: 6, mirror: true }], ['tube', [-5, 0, 13.5], .6, 4, '#2a2a2a', { n: 4 }]]);
  const GUN = new E.Mesh([['box', [0, 0, 2], [8, 8, 2], '#4a4a52'], ['ball', [0, 0, 6], [6.5, 6.5, 5], 'hull', { n: 8 }], ['tube', [9, 2, 7], .8, 5, '#2a2a30', { n: 4, mirror: true }]]);
  const TREE = new E.Mesh([['tube', [0, 0, 6], 1.6, 6, '#6a4a2a', { axis: 'z', n: 5 }], ['ball', [0, 0, 17], [10, 10, 9], 'leaf', { n: 6 }]]);
  const HERO = new E.Humanoid({ size: 1.2, weapon: 'gun', hair: 'spiky', colors: { cloth: '#e83a30', pants: '#2a3a8a', hair: '#ffd040' } });
  const SONG = { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .05, notes: 'E5 . E5 G5 . E5 D5 . | C5 . D5 . E5 . . . | E5 . E5 G5 . A5 G5 . | E5 . D5 . C5 . . . | A5 . A5 C6 . A5 G5 . | E5 . G5 . A5 . . . | G5 . E5 . D5 . C5 . | D5 . . . . . . .' },
    { wave: 'saw', vol: .08, notes: 'A2 A2 A3 A2 A2 A3 A2 A3 | F2 F2 F3 F2 G2 G2 G3 G2 | A2 A2 A3 A2 A2 A3 A2 A3 | F2 F2 F3 F2 E2 E2 E3 E2 | D2 D2 D3 D2 D2 D3 D2 D3 | F2 F2 F3 F2 G2 G2 G3 G2 | C3 C3 C3 C3 B2 B2 B2 B2 | E2 E2 E3 E2 E2 . . .' },
    { wave: 'drums', vol: .07, notes: 'k . h k s . h . k . h k s . h h' }] };
  /* ---- THE FLOORS: the checkered plain, the sea, the valley and its rails ---- */
  let VP = null;
  const ZONE = new E.Path([[2048, 3900], [2048, 3200], [2600, 2700], [3300, 2800], [3500, 2100], [2900, 1500], [2200, 1700], [1500, 1300], [900, 1500], [600, 2200], [1000, 2900], [700, 3500], [300, 3000], [300, 1000], [1200, 400]], { smooth: 'catmull' }), ZL = ZONE.length;   // (the zone's course)
  const RAIL = new E.Path([[2048, 3900], [2050, 3300], [2280, 2800], [2160, 2250], [1800, 1850], [1880, 1300], [2100, 900], [2100, 700]], { smooth: 'catmull' });
  function floors() {
    if (VP) return VP;
    const vale = E.mkCanvas(1024, 1024), g = vale.getContext('2d'), img = g.createImageData(1024, 1024), d = img.data;
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) { const n = hash(x, y) % 9, m = E.noise2(x / 24, y / 24), i = (y * 1024 + x) * 4, c = m > .62 ? [60 + n, 118, 52] : m < .3 ? [120 + n * 2, 150, 70] : [84 + n * 2, 146, 62]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    for (let s = 0; s < RAIL.length; s += 6) { const p = RAIL.at(s); px.disc(g, p.x / 4, p.y / 4, 9, '#b89a6a'); }
    for (let s = 0; s < RAIL.length; s += 6) { const p = RAIL.at(s); px.disc(g, p.x / 4, p.y / 4, 6, '#c8aa78'); }
    const R = E.rng(4); for (let i = 0; i < 900; i++) px.rect(g, R() * 1024, R() * 1024, 1, 1, ['#f0e060', '#f0f0f0', '#e870a0'][i % 3]);
    return (VP = {
      zone: new E.Mode7({ floor: (x, y) => (x & 127) < 3 || (y & 127) < 3 ? [60, 200, 255] : (x >> 7) + (y >> 7) & 1 ? [14, 10, 40] : [20, 14, 52], size: [4096, 4096], texel: 4, wrap: true, far: 3200, fog: { color: '#3a1a6a', near: 1400, far: 3200 }, sky: ['#0a0418', '#6a2a9a'] }),
      plain: new E.Mode7({ floor: (x, y) => ((x >> 6) + (y >> 6)) & 1 ? [66, 168, 88] : [196, 226, 120], size: [1024, 1024], texel: 4, wrap: true, far: 4000, fog: { color: '#f0c8a0', near: 1400, far: 4000 },
        sky: new E.Backdrop({ sky: ['#3a2a8a', '#b86aa8', '#f0c8a0'], sun: { x: .3, y: .45, r: 18, color: '#fff0c0' }, layers: [{ kind: 'mountains', color: '#7a5a9a', y: .82, height: .2, parallax: .05, seed: 3 }] }) }),
      sea: new E.Mode7({ floor: (x, y) => { const n = E.noise2(x / 700, y / 700), r = hash(x >> 4, y >> 4) % 6; return n > .7 ? [70 + r * 3, 140, 60] : n > .66 ? [220, 200, 140] : n > .58 ? [40, 140, 190] : [20 + r, 70 + r * 2, 160]; }, size: [8192, 8192], texel: 16, wrap: true, far: 9000, fog: { color: '#cfe0f4', near: 2500, far: 9000 },
        sky: new E.Backdrop({ sky: ['#1a4aa8', '#5a9ae0', '#cfe0f4'], layers: [{ kind: 'clouds', color: '#ffffff', y: .55, height: .18, parallax: .04, drift: 6 }] }) }),
      dunes: new E.Mode7({ floor: (x, y) => { const n = E.noise2(x / 420, y / 420), r = hash(x >> 2, y >> 2) % 7; return n > .74 ? [150 + r, 104, 76] : Math.sin((x + y * .4) / 46 + n * 14) > .6 ? [230 - r, 194, 136] : [212 - r * 2, 172 - r, 112]; }, size: [4096, 4096], texel: 4, wrap: true, far: 6000, fog: { color: '#f0d0a0', near: 2000, far: 6000 },
        sky: ['#c8683a', '#f0d0a0'] }),
      vale: new E.Mode7({ floor: vale, texel: 4, outside: '#4a8a3e', far: 3000, fog: { color: '#6a9a58', near: 1200, far: 3000 }, sky: new E.Backdrop({ sky: ['#3a7ad8', '#8ac0f0', '#cfe6f8'], sun: { x: .8, y: .2, r: 12, color: '#fffbe0' }, layers: [{ kind: 'clouds', color: '#ffffff', y: .25, height: .15, parallax: .04, drift: 4 }, { kind: 'mountains', color: '#6a7ab8', y: .55, height: .3, parallax: .05, seed: 2 }, { kind: 'hills', color: '#5a9a4a', y: .78, height: .22, parallax: .08 }] }) }),
      // the city's streets (1,024 across and eight blocks up, repeating): the avenue at x 0 (four lanes, a double yellow
      // line, crossings at the corners), a side street at 512, a cross street every 512 up it, sidewalks; the lots
      // concrete, two of them in the eight blocks a park (a fountain, paths: park() says which, for block())
      city: new E.Mode7({ floor: (x, y) => {
        const ax = x > 512 ? 1024 - x : x, yy = y % 512, n = hash(x >> 2, y >> 2) % 6, tar = [60 + n, 60 + n, 68 + n], white = [218, 216, 206], yel = [228, 186, 60];
        if (ax < 100) return yy > 42 && yy < 58 || yy > 454 && yy < 470 ? (ax % 14 < 8 ? white : tar) : yy < 40 || yy > 472 ? tar : ax > 1.5 && ax < 5 ? yel : ax > 47 && ax < 51 && (yy & 63) < 30 || ax > 93 && ax < 96 ? white : tar;
        if (yy < 40 || yy > 472) return (yy < 2 || yy > 510) && (ax & 31) < 16 ? yel : tar;   // (a cross street)
        if (ax > 488) return ax > 510 && (yy & 31) < 16 ? white : tar;   // (the side street)
        if (ax < 124 || ax > 476 || yy < 56 || yy > 456) return (x & 15) < 2 || (y & 15) < 2 ? [128, 124, 120] : [150 + n, 146 + n, 140 + n];   // (the sidewalks)
        if (!park(x < 512 ? 0 : 1, y >> 9)) return [112 + n, 106 + n, 100 + n];
        const dx = ax - 300, dy = yy - 256, r = Math.hypot(dx, dy);
        return r < 28 ? [70, 130, 190] : r < 34 ? [190, 184, 170] : Math.abs(dx) < 6 || Math.abs(dy) < 6 ? [184, 170, 136] : [70 + n * 3, 120 + n * 2, 60];
      }, size: [1024, 4096], texel: 2, wrap: true, far: 3200, fog: { color: '#e8b496', near: 1300, far: 3200 },
        sky: new E.Backdrop({ sky: ['#2a3a8a', '#b8708a', '#f0b890'], sun: { x: .75, y: .62, r: 14, color: '#fff0c0' }, layers: [{ kind: 'city', color: '#8a7090', y: .92, height: .5, parallax: .05, windows: '#ffe0a0', seed: 4 }] }) })
    });
  }

  /* ---- THE CITY: its blocks up the avenue (y falls as the stage goes on), each building a box on its lot ---- */
  const WALLS = ['#c8b8a0', '#a8aab8', '#c89a80', '#b0b8b0', '#d8d0c4', '#9890a8', '#b88a74', '#8a9aa8'], GLASS = [{ win: '#3a4a72', lit: '#ffd98a' }, { win: '#2a5a6a', lit: '#fff0b0' }], LIGHT = [-.5, .45, .75];
  const park = (lot, b) => (b & 7) === (lot ? 5 : 2);   // (the floor's lot 0 is x 124 to 476 in its 1,024, lot 1 548 to 900)
  // a building's models, cached by size: its box (a roof house on top) and its windows, a band of glass a floor on the
  // sides the camera sees (toward the avenue, s its side, and the south), drawn after it unshaded; x0..x1 across from its
  // origin (the corner by the avenue at its north end: kept while any of it is on the screen, sorted by its far end)
  const SHAPES = new Map();
  function shape(x0, x1, d, h, s, roof) {
    const key = [x0, x1, d, h, s, roof].join(); let m = SHAPES.get(key); if (m) return m;
    const w = x1 - x0, body = new E.Mesh([['box', [(x0 + x1) / 2, d / 2, h / 2], [w / 2, d / 2, h / 2], 'wall']]), win = new E.Mesh();
    if (roof) body.part(['box', [(x0 + x1) / 2 + s * w * .12, d * .4, h + 5], [Math.min(30, w * .2), Math.min(26, d * .2), 5], 'roof']);
    for (let a = 10, f = 0; a + 12 < h; a += 22, f++) {
      const c = hash(f, w + h) % 3 ? 'win' : 'lit', b = a + 8, y = d + .6;
      if (s) { const x = -s * .6; win.part(['face', s > 0 ? [[x, d - 8, a], [x, 8, a], [x, 8, b], [x, d - 8, b]] : [[x, 8, a], [x, d - 8, a], [x, d - 8, b], [x, 8, b]], c]); }
      win.part(['face', [[x1 - 8, y, a], [x0 + 8, y, a], [x0 + 8, y, b], [x1 - 8, y, b]], s ? c : 'lit']);
    }
    SHAPES.set(key, m = { body, win }); return m;
  }
  // the city's block b: y from b * 512 (its cross street) to b * 512 + 512; a lot each side of the avenue (136 to 460 out)
  // and past the side street (560 to 890), two buildings to a lot, or a park's trees; downtown (from 6,650 up the
  // avenue) tall, and on the way to the gunship a skybridge across the avenue or a low wing into it every third block;
  // each a box { x0, x1, y0, y1, z0, z1 } and its look (fx: its origin's x); the same every run
  const CITY = new Map();
  function block(b) {
    let L = CITY.get(b); if (L) return L; L = [];
    const down = b < -13, y = b * 512, m = -b % 3, way = down && b > -37 && b < -15;
    for (const s of [-1, 1]) for (const c of [0, 1]) {
      if (park((s > 0) === !c ? 0 : 1, b)) { for (const [ox, oy] of [[-110, -120], [110, -120], [-110, 120], [110, 120], [-60, -40], [60, 50]]) L.push({ tree: true, x0: s * (c ? 724 : 300) + ox, y0: y + 256 + oy, y1: y + 256 + oy, col: hash(ox + 200, b) % 2 ? '#3a8a3a' : '#5a9a3a' }); continue; }
      for (const k of [0, 1]) {
        const r = hash(b * 4 + k * 2 + c, s + 3), w = 150 + (r % 8) * 20, h = down ? 120 + (r >>> 3) % 12 * 20 : 50 + (r >>> 3) % 6 * 20, x = s * (c ? 560 : 136);
        L.push({ x0: s > 0 ? x : x - w, x1: s > 0 ? x + w : x, y0: y + 72 + k * 192, y1: y + 248 + k * 192, z0: 0, z1: h, fx: x, s, near: !c, col: WALLS[(r >>> 7) % WALLS.length], glass: GLASS[(r >>> 10) & 1] });
      }
    }
    const lo = L.filter(q => q.near && q.y0 === y + 72 && !q.tree);
    if (way && m === 0 && lo.length === 2) { const z = clamp(Math.min(lo[0].z1, lo[1].z1) - 70, 90, 170); L.push({ x0: -136, x1: 136, y0: y + 140, y1: y + 180, z0: z, z1: z + 26, fx: 0, s: 0, near: true, col: '#8a9ab0', glass: GLASS[0] }); }
    const s = b & 1 ? 1 : -1;
    if (way && m === 1 && !park(s > 0 ? 0 : 1, b)) { const h = 70 + hash(b, 9) % 3 * 25; L.push({ x0: s > 0 ? 20 : -136, x1: s > 0 ? 136 : -20, y0: y + 290, y1: y + 420, z0: 0, z1: h, fx: s * 20, s, near: true, wing: true, col: '#b0a090', glass: GLASS[1] }); }
    CITY.set(b, L); return L;
  }
  // the boxes (not the trees) with some of them between y0 and y1
  function boxes(y0, y1) { const out = []; for (let b = Math.floor(y0 / 512); b <= Math.floor(y1 / 512); b++) for (const q of block(b)) if (!q.tree && q.y1 > y0 && q.y0 < y1) out.push(q); return out; }
  // a rotor: a pale disc where its blades blur and two blades crossed, turned to a; laid out in the model's frame (it
  // banks and pitches with the body): hub and radius in the model's units, side: in the upright plane (a tail rotor)
  function rotor(g, V, M, o, hub, rad, a, side) {
    const P = (u, v) => V.project(...M.at(hub[0] + u, hub[1] + (side ? 0 : v), hub[2] + (side ? v : 0), o)), ring = [];
    for (let i = 0; i < 12; i++) { const p = P(Math.cos(i * TAU / 12) * rad, Math.sin(i * TAU / 12) * rad); if (!p) return; ring.push([p[0], p[1]]); }
    px.polyDither(g, ring, '#e8eef8', .28);
    for (const b of [a, a + Math.PI / 2]) { const c = Math.cos(b), s = Math.sin(b), w = side ? .7 : 1.3, q = [[rad, w], [rad, -w], [-rad, -w], [-rad, w]].map(([u, v]) => P(c * u - s * v, s * u + c * v)); if (!q.some(p => !p)) px.poly(g, q.map(p => [p[0], p[1]]), '#1e1e24'); }
  }
  // a helicopter's two rotors (or the gunship's), gathered at its foot right after its body (the same depth: drawn after it)
  const rotors = (g, V, M, o, a) => { if (M === HELI) { rotor(g, V, M, o, [0, 0, 25.4], 26, a); rotor(g, V, M, o, [-34, 1.6, 21], 5.5, a * 1.7, true); } else { rotor(g, V, M, o, [18, 0, 27.4], 22, a); rotor(g, V, M, o, [-27, 0, 27.2], 22, -a); } };

  /* ---- THE RUN: the score, the lives, what flies; a stage at a time ---- */
  let mode = 'menu', R = null, t = 0, auto = false;
  const menu = new E.Menu(game, [E.t('blaster.menu.start'), E.t('blaster.stage.harrier'), E.t('blaster.stage.burner'), E.t('blaster.stage.safari'), E.t('blaster.stage.zone'), E.t('blaster.stage.speeder'), E.t('blaster.stage.blade'), E.t('blaster.menu.back')], { onPick: i => i === 7 ? game.go('title') : begin(i ? i - 1 : 0, i > 0) });
  const after = new E.Menu(game, [E.t('blaster.menu.again'), E.t('blaster.menu.menu')], { onPick: i => i === 0 ? begin(R.first, R.one) : toMenu() });
  function toMenu() { mode = 'menu'; R = null; A.music('title'); }
  /** a run from a stage (one: that stage alone); a game of one: players who joined elsewhere (a split screen) leave, and
   *  player 1 has the whole keyboard again */
  function begin(i, one) { while (game.players.length > 1) game.removePlayer(game.players.length); floors(); R = { first: i, one, stage: -1, score: 0, lives: 3, hits: 0, best: 0 }; next(i); }
  function next(i) {
    Object.assign(R, { stage: i, name: STAGES[i], t: 0, phase: 'intro', phaseT: 2, hurt: 0, cool: 0, fired: 0, shots: [], hot: [], foes: [], fx: [], boss: null, waves: 0 });
    mode = 'play'; STAGE[STAGES[i]].start(); A.music(i === 2 ? 'adventure' : SONG); game.input.consumeAll();
  }
  const boom = (x, y, z, s = 1) => { R.fx.push({ x, y, z, t: 0, s }); A.sfx('explode', { vol: .5 }); };
  const score = n => { R.score += n; };
  function hurt() {
    if (R.hurt > 0 || R.phase === 'clear' || R.phase === 'intro') return;   // (the stage card is a grace: the zone's first pods are on you before it ends)
    R.hits++; R.hurt = 2; game.shake(5); game.flash('#ff4040', .15, .5); A.sfx('hurt');
    if (!auto && --R.lives <= 0) { R.phase = 'over'; R.phaseT = 2.5; }
  }
  function clear() { if (R.phase === 'clear') return; R.phase = 'clear'; R.phaseT = 3; A.music('victory'); score(5000); }
  // the player's controls, or the autopilot's (the bot): { x, y, fire, missile, roll, tap: [sx, sy] where a touch tapped }
  // (a mouse's click is fire, through Mouse0, at the cursor that follows it, even pressed and let go between two steps:
  // a tap of its own would shoot it twice)
  const pad = () => { const I = game.input, [x, y] = I.move(); return { x, y, fire: I.down('fire') || I.pressed('fire') || I.lastDevice === 'touch', missile: I.pressed('missile'), roll: I.pressed('roll'), tap: I.lastDevice === 'touch' && I.clicked && I.clicked() }; };

  /* ---- THE STAGES ---- */
  const STAGE = {
    /** the zone: a course along a path over the grid; the craft a lateral u and a height on it, the camera behind banking into the bends */
    zone: {
      start() { Object.assign(R, { s: 0, u: 0, zh: 60, steer: 0, spawn: 400, pods: 0, mines: 0 }); },   // (pods: shot down; mines: run into)
      at(s, u, z) { const p = ZONE.at(s); return { x: p.x - Math.sin(p.angle) * u, y: p.y + Math.cos(p.angle) * u, z, a: p.angle }; },
      cam() { const c = this.at(R.s - 170, R.u * .6, 0), a = ZONE.at(R.s).angle, bend = E.angDiff(a, ZONE.at(R.s + 260).angle); return { x: c.x, y: c.y, h: 46 + R.zh * .55, angle: c.a + E.angDiff(c.a, a) * .5, pitch: 6 + R.zh * .02, fov: 70, roll: clamp(bend * 70, -24, 24) + R.steer * -6 }; },
      update(dt, k) {
        R.s = R.phase === 'clear' ? R.s + (ZL - 10 - R.s) * Math.min(1, dt * 2) : R.s + 760 * dt;   // (through the gate, the craft eases to a stop at the course's end: past it the camera would see nothing)
        R.steer += (k.x - R.steer) * Math.min(1, dt * 8); R.u = clamp(R.u + R.steer * 300 * dt, -150, 150); R.zh = clamp(R.zh - k.y * 220 * dt, 16, 160);
        const me = this.at(R.s, R.u, R.zh);
        if (k.fire && R.cool <= 0) { R.cool = .11; R.fired++; R.shots.push({ x: me.x, y: me.y, z: me.z + 4, vx: Math.cos(me.a) * 1700, vy: Math.sin(me.a) * 1700, vz: 0, t: 0 }); A.sfx('shoot', { vol: .3 }); }
        while (R.spawn < R.s + 2400 && R.spawn < ZL - 900) {   // what lies ahead, placed along the course: pods in threes, now and then a mine on it, floating at the height the craft flies (steered round, over or under, or shot)
          const n = Math.round(R.spawn / 260), u = Math.sin(n * .9) * 110, mine = n % 4 === 3;
          if (mine) { const q = this.at(R.spawn, -u * .6, 60); R.foes.push({ kind: 'mine', s: R.spawn, u: -u * .6, x: q.x, y: q.y, z: 60, hp: 2, r: 16 }); }
          else for (let i = -1; i <= 1; i++) { const q = this.at(R.spawn + i * 40, u + i * 40, 50 + Math.abs(i) * 30); R.foes.push({ kind: 'pod', s: R.spawn + i * 40, u: u + i * 40, x: q.x, y: q.y, z: q.z, hp: 1, r: 16, ph: n + i }); }
          R.spawn += 260;
        }
        for (const f of R.foes) if (f.hp > 0) {
          f.t = (f.t || 0) + dt;
          if (f.kind === 'pod') { f.s -= 160 * dt; f.u += Math.sin(f.t * 2 + f.ph) * 40 * dt; const q = this.at(f.s, f.u, f.z); f.x = q.x; f.y = q.y; if (!f.shot && f.s - R.s < 900 && f.ph % 3 === 0) { f.shot = true; fireAt(f, 560); } }
          if (Math.abs(f.s - R.s) < 14 && Math.abs(f.u - R.u) < f.r + 6 && Math.abs(f.z - R.zh) < 26) { f.hp = 0; boom(f.x, f.y, f.z); hurt(); if (f.kind === 'mine') R.mines++; }
        }
        R.foes = R.foes.filter(f => f.hp > 0 && f.s > R.s - 300);
        if (R.s >= ZL - 400) clear();
      },
      hit(s) { for (const f of R.foes) if (f.hp > 0 && Math.hypot(s.x - f.x, s.y - f.y, s.z - f.z) < f.r + 8) { if (--f.hp <= 0) { boom(f.x, f.y, f.z); score(f.kind === 'mine' ? 500 : 200); if (f.kind === 'pod') R.pods++; } return true; } return false; },
      me() { const m = this.at(R.s, R.u, R.zh); return { x: m.x, y: m.y, z: m.z }; },
      gather(V) {
        const k0 = Math.floor((R.s - 160) / 90);
        for (let k = k0; k < k0 + 30; k++) {   // the course: a band of two tones, rails of light along its edges
          const a = k * 90, b = a + 90, P = [this.at(a, -170, 0), this.at(a, 170, 0), this.at(b, 170, 0), this.at(b, -170, 0)].map(q => [q.x, q.y, 0]);
          V.quad(P, k & 1 ? '#2a1a6a' : '#3a2a8a');
          for (const e of [-1, 1]) V.quad([this.at(a, e * 170, 0), this.at(a, e * 182, 0), this.at(b, e * 182, 0), this.at(b, e * 170, 0)].map(q => [q.x, q.y, .5]), k & 1 ? '#ff3ab0' : '#ffe040');
        }
        if (R.s > ZL - 2600) { const g0 = this.at(ZL - 400, -190, 0), g1 = this.at(ZL - 400, 190, 0); for (const q of [g0, g1]) V.quad([[q.x - 6, q.y, 0], [q.x + 6, q.y, 0], [q.x + 6, q.y, 120], [q.x - 6, q.y, 120]], '#ffe040'); V.quad([[g0.x, g0.y, 110], [g1.x, g1.y, 110], [g1.x, g1.y, 124], [g0.x, g0.y, 124]], '#ffe040'); }   // (the gate)
        for (const f of R.foes) if (f.hp > 0 && f.s > R.s - 20) { if (f.kind === 'mine') V.add(f.x, f.y, f.z, (g, sx, sy, k) => { const q = Math.max(1, 9 * k); px.disc(g, sx, sy, q, '#2a2a32'); px.disc(g, sx, sy, q * .45, Math.floor(t * 6) % 2 ? '#ff3a3a' : '#801818'); }); else V.mesh(SAUCER, f.x, f.y, f.z, { yaw: f.t * 4, scale: 1.2, colors: { hull: '#a8f0ff' } }); }
        const m = this.at(R.s, R.u, R.zh); if (R.hurt <= 0 || Math.floor(t * 12) % 2) V.mesh(JET, m.x, m.y, m.z, { yaw: m.a, roll: R.steer * .6, scale: 2.4, colors: { body: '#3a8ae8', tail: '#e8e8f0' } });
        const sh = this.at(R.s, R.u, 0); V.add(sh.x, sh.y, 0, (g, sx, sy, k) => { const a = g.globalAlpha; g.globalAlpha = .4; px.ell(g, sx, sy, 30 * k, 9 * k, '#000000'); g.globalAlpha = a; });
      }
    },
    /** the plain: the hero 150 ahead of the camera, which follows across and up (closely enough to keep the hero on the
     *  screen, its corners too); waves by time, then the serpent */
    harrier: {
      start() { Object.assign(R, { F: 0, hx: 0, hz: 60 }); },
      cam() { const tall = game.H > game.W; return { x: R.hx * .8, y: R.F + (tall ? 170 : 115), h: 38 + R.hz * .85, angle: -Math.PI / 2, pitch: 5 + R.hz * .012, fov: tall ? 80 : 66 }; },
      update(dt, k) {
        R.F -= 520 * dt; R.hx = clamp(R.hx + k.x * 330 * dt, -260, 260); R.hz = clamp(R.hz - k.y * 280 * dt, 0, 240);
        HERO.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: R.hz < 6 ? -150 : 0, facing: -Math.PI / 2, air: R.hz > 6, point: true });
        if (k.fire && R.cool <= 0) {   // (the aim leans to what a shot can hit: a saucer, a jet, the serpent's head; not a column or a bush)
          const aim = R.foes.filter(f => f.hp > 0 && f.kind !== 'bush').concat(R.boss && R.boss.hp > 0 && R.boss.parts ? [R.boss.parts[0]] : []).filter(f => f.y < R.F && R.F - f.y < 1500).sort((a, b) => Math.abs(a.x - R.hx) - Math.abs(b.x - R.hx))[0], dx = aim && Math.abs(aim.x - R.hx) < 90 ? (aim.x - R.hx) / ((R.F - aim.y) / 1500) : 0;
          R.shots.push({ x: R.hx + 4, y: R.F - 10, z: R.hz + 26, vx: clamp(dx, -260, 260), vy: -1500, vz: 0, t: 0 }); R.cool = .11; R.fired++; A.sfx('shoot', { vol: .3 }); }
        const T = R.t, W = R.waves, ahead = R.F - 2400;
        const wave = (at, fn) => { if (T >= at && W === wave.n) { fn(); R.waves++; } wave.n++; }; wave.n = 0;
        for (const [at, kind, n] of [[1.5, 'v', 5], [4, 'cols', 8], [7, 'ring', 6], [9, 'jets', 4], [12, 'v', 5], [14, 'cols', 12], [17, 'ring', 8], [20, 'v', 7], [22, 'cols', 8], [24, 'jets', 6]])
          wave(at, () => { for (let i = 0; i < n; i++) {
            if (kind === 'v') R.foes.push({ kind: 'saucer', x: (i - (n - 1) / 2) * 70, y: ahead - Math.abs(i - (n - 1) / 2) * 120, z: 120, hp: 2, r: 18, ph: i });
            if (kind === 'ring') R.foes.push({ kind: 'saucer', x: Math.cos(i / n * TAU) * 120, y: ahead, z: 120 + Math.sin(i / n * TAU) * 70, hp: 2, r: 18, ph: i, ring: i / n * TAU });
            if (kind === 'cols') { R.foes.push({ kind: 'col', x: (i % 2 ? 1 : -1) * (40 + (i * 53) % 200), y: ahead - i * 260, z: 0, r: 14, still: true }); if (i % 3 === 0) R.foes.push({ kind: 'bush', x: (i % 2 ? -1 : 1) * (60 + (i * 37) % 160), y: ahead - i * 260 - 120, z: 0, hp: 1, r: 22, still: true }); }
            if (kind === 'jets') R.foes.push({ kind: 'jet', x: (i % 2 ? 1 : -1) * 700, y: ahead + 900 + i * 220, z: 60 + i * 30, hp: 1, r: 20, vx: (i % 2 ? -1 : 1) * 380 });
          } });
        if (T > 28 && !R.boss) { R.boss = { kind: 'serpent', hp: 34, max: 34, t: 0, trail: [], segs: 9, die: 0 }; A.music('boss'); }
        for (const f of R.foes) {
          f.t = (f.t || 0) + dt;
          if (f.kind === 'saucer') { f.y += 330 * dt; if (f.ring !== undefined) f.ring += dt * 1.2; f.x += (f.ring !== undefined ? Math.cos(f.ring) * 180 - f.x : Math.sin(f.t * 2.2 + f.ph) * 140 - f.x * .1) * dt * 1.5;
            if (f.ring !== undefined) f.z += (120 + Math.sin(f.ring) * 70 - f.z) * dt * 1.5; if (!f.shot && R.F - f.y < 1100) { f.shot = true; if (f.ph % 2 === 0) fireAt(f, 620); } }
          if (f.kind === 'jet') { f.x += f.vx * dt; f.y += 200 * dt; }
          if (f.kind === 'col' && Math.abs(f.y - R.F) < 14 && Math.abs(f.x - R.hx) < 22 && R.hz < 124) hurt();
        }
        const B = R.boss;
        if (B) {   // the serpent weaves ahead, its body following its head; it breathes fire; shot apart, tail first
          B.t += dt; const head = { x: Math.sin(B.t * 1.1) * 170, y: R.F - 290 + Math.sin(B.t * .7) * 70, z: 100 + Math.sin(B.t * .9) * 60 }; if (B.flash > 0) B.flash -= dt;
          B.trail.unshift([head.x - R.hx * 0, head.y - R.F, head.z]); if (B.trail.length > 120) B.trail.pop();
          B.parts = Array.from({ length: B.segs }, (_, i) => { const p = B.trail[Math.min(B.trail.length - 1, i * 9)]; return { x: p[0], y: R.F + p[1] - i * 40, z: p[2] }; });
          if (B.hp > 0 && Math.floor(B.t / 1.3) !== Math.floor((B.t - dt) / 1.3)) fireAt(B.parts[0], 700);
          if (B.hp <= 0) { B.die += dt; if (B.die > .12 * (9 - B.segs + 1) && B.segs > 0) { const p = B.parts[B.segs - 1]; boom(p.x, p.y, p.z, 1.6); B.segs--; } if (!B.segs) clear(); }
        }
      },
      hit(s) {
        for (const f of R.foes) if (f.hp > 0 && Math.abs(s.y - f.y) < 26 && Math.hypot(s.x - f.x, s.z - (f.z + (f.kind === 'bush' ? 14 : 6))) < f.r + 8) { if (--f.hp <= 0) { boom(f.x, f.y, f.z + 8); score(f.kind === 'bush' ? 50 : 300); } return true; }
        const B = R.boss; if (B && B.hp > 0) for (let i = 0; i < B.segs; i++) { const p = B.parts[i]; if (Math.abs(s.y - p.y) < 36 && Math.hypot(s.x - p.x, s.z - p.z) < (i ? 24 : 30)) { B.hp -= i ? 1 : 2; B.flash = .08; R.fx.push({ x: p.x, y: p.y, z: p.z, t: .2, s: .5 }); if (B.hp <= 0) score(10000); A.sfx('hit', { vol: .4 }); return true; } }
        return false;
      },
      me() { return { x: R.hx, y: R.F, z: R.hz + 20 }; },
      gather(V) {
        for (const f of R.foes) {
          if (f.kind === 'col') V.mesh(PILLAR, f.x, f.y, 0, { colors: { col: '#e8d8b8', cap: '#c8b898' } });
          else if (f.kind === 'bush') { if (f.hp > 0) V.add(f.x, f.y, 0, (g, sx, sy, k) => { for (const [ox, oy, r, c] of [[-10, 10, 12, '#2a7a3a'], [10, 12, 11, '#2a7a3a'], [0, 22, 14, '#3a9a48'], [-4, 26, 7, '#5ab85a']]) px.disc(g, sx + ox * k, sy - oy * k, r * k, c); }); }
          else if (f.kind === 'saucer') V.mesh(SAUCER, f.x, f.y, f.z, { yaw: f.t * 4, scale: 1.4, colors: { hull: '#d8d8e8' } });
          else V.mesh(JET, f.x, f.y, f.z, { yaw: f.vx > 0 ? 0 : Math.PI, roll: f.vx > 0 ? .5 : -.5, colors: { body: '#c84a3a', tail: '#3a3a42' } });
        }
        const B = R.boss; if (B) for (let i = B.segs - 1; i >= 0; i--) { const p = B.parts[i]; V.mesh(i ? SEG : HEAD, p.x, p.y, p.z, { yaw: Math.PI / 2, colors: { hue: B.flash > 0 || B.hp <= 0 ? '#f8f0f0' : i % 2 ? '#3a9a6a' : '#5ac88a' } }); }
        if (R.hurt <= 0 || Math.floor(t * 12) % 2) V.add(R.hx, R.F, R.hz, (g, sx, sy, k) => HERO.draw(g, Math.round(sx), Math.round(sy), V.view(k)));
        V.add(R.hx, R.F, 0, (g, sx, sy, k) => { const a = g.globalAlpha; g.globalAlpha = .35; px.ell(g, sx, sy, 14 * k, 5 * k, '#1a2a10'); g.globalAlpha = a; });
      }
    },
    /** the sea: the jet's heading, bank, height and a barrel roll; bandits ahead and behind; the lock-on; the bomber */
    burner: {
      start() { R.j = { x: 4096, y: 4096, z: 420, yaw: -Math.PI / 2, roll: 0, pitch: 0, spin: 0, speed: 560, missiles: 60 }; R.locks = []; },
      cam() {   // (the stage opens overhead, Thunder Blade's way, the camera swinging down behind the jet after 5 s)
        const j = R.j, back = 90 * (game.H > game.W ? 1.4 : 1), n = { x: j.x - Math.cos(j.yaw) * back, y: j.y - Math.sin(j.yaw) * back, h: j.z + 34 - j.pitch * 40, angle: j.yaw, pitch: 12 - j.pitch * 25, fov: game.H > game.W ? 84 : 68, roll: j.roll * 34 + (j.spin > 0 ? (1 - j.spin / .9) * 360 : 0) }, u = E.ease.inOutQuad(clamp((R.t - 5) / 2.5, 0, 1));
        if (u >= 1) return n; const h = n.h + (j.z + 420 - n.h) * (1 - u), dn = Math.atan2(h - j.z, Math.max(1, back * u)) * 180 / Math.PI;   // (dn: the angle down to the jet: the pitch kept within 20 degrees of it, the jet on the screen as the camera swings)
        return Object.assign(n, { x: j.x + (n.x - j.x) * u, y: j.y + (n.y - j.y) * u, h, pitch: Math.max(n.pitch + (90 - n.pitch) * (1 - u), dn - 20), roll: n.roll * u });
      },
      update(dt, k) {
        const j = R.j;
        j.roll += (clamp(k.x, -1, 1) * 1.15 - j.roll) * Math.min(1, dt * 3); j.yaw += Math.sin(j.roll) * 1.5 * dt;
        j.pitch += (-clamp(k.y, -1, 1) * .35 - j.pitch) * Math.min(1, dt * 4); j.z = clamp(j.z + j.pitch * 700 * dt, 140, 900);
        if (k.roll && j.spin <= 0) { j.spin = .9; A.sfx('whoosh'); } if (j.spin > 0) j.spin -= dt;
        j.x += Math.cos(j.yaw) * j.speed * dt; j.y += Math.sin(j.yaw) * j.speed * dt;
        if (k.fire && R.cool <= 0) { const n = JET.at(16, 0, 4, { x: j.x, y: j.y, z: j.z, yaw: j.yaw }); R.shots.push({ x: n[0], y: n[1], z: n[2], vx: Math.cos(j.yaw) * 2600, vy: Math.sin(j.yaw) * 2600, vz: j.pitch * 1200, t: 0 }); R.cool = .07; R.fired++; A.sfx('shoot', { vol: .2 }); }
        // the lock-on: what stays near the reticle (ahead of the jet, on the screen) a moment is locked, four at most, while a missile is left
        VP.sea.begin({ W: game.W, H: game.H }, this.cam());
        for (const f of R.foes) if (f.hp > 0 && (f.p = VP.sea.project(f.x, f.y, f.z + 6))) { const near = Math.hypot(f.p[0] - game.W / 2, f.p[1] - game.H * .38) < 60 && f.p[2] > .05; f.lockT = near ? (f.lockT || 0) + dt : 0; if (f.lockT > .25 && !R.locks.includes(f) && R.locks.length < 4 && j.missiles > 0) { R.locks.push(f); A.sfx('blip'); } }
        R.locks = R.locks.filter(f => f.hp > 0);
        if (k.missile && R.locks.length && j.missiles > 0) { for (const f of R.locks.splice(0)) if (j.missiles > 0 && j.missiles--) R.shots.push({ x: j.x, y: j.y, z: j.z - 6, vx: Math.cos(j.yaw) * 700, vy: Math.sin(j.yaw) * 700, vz: 0, t: 0, homing: f, sp: 1100 }); A.sfx('laser'); }
        // the bandits: from ahead (head on, firing) and from behind (overtaking); then the bomber
        const fw = [Math.cos(j.yaw), Math.sin(j.yaw)], rt = [-fw[1], fw[0]], T = R.t;
        if (T > 2 && T < 34 && Math.floor(T / 2.6) !== Math.floor((T - dt) / 2.6)) {
          const n = Math.floor(T / 2.6), behind = n % 3 === 2;
          for (let i = 0; i < 3; i++) { const side = (i - 1) * 260 + (n % 2 ? 120 : -120), d = behind ? -700 : 2600;
            R.foes.push({ kind: 'bandit', x: j.x + fw[0] * d + rt[0] * side, y: j.y + fw[1] * d + rt[1] * side, z: j.z + (i - 1) * 60, yaw: behind ? j.yaw : j.yaw + Math.PI, speed: behind ? 820 : 520, hp: 2, r: 26, t: 0, fire: 1 + i * .5 }); }
        }
        if (T > 36 && !R.boss) { const d = 1500; R.boss = { kind: 'bomber', x: j.x + fw[0] * d, y: j.y + fw[1] * d, z: j.z + 60, yaw: j.yaw, hp: 30, max: 30, t: 0, r: 70 }; R.foes.push(R.boss); A.music('boss'); }
        for (const f of R.foes) {
          f.t += dt; if (f.hp <= 0) continue;
          if (f.kind === 'bandit') { const want = Math.atan2(j.y - f.y, j.x - f.x); if (f.t > 1) f.yaw += clamp(E.angDiff(f.yaw, want), -.5 * dt, .5 * dt); f.x += Math.cos(f.yaw) * f.speed * dt; f.y += Math.sin(f.yaw) * f.speed * dt; f.z += (j.z - f.z) * dt * .4;
            f.fire -= dt; if (f.fire < 0 && Math.hypot(j.x - f.x, j.y - f.y) < 1800) { f.fire = 3 + (f.t % 1); R.hot.push({ x: f.x, y: f.y, z: f.z, vx: Math.cos(f.yaw) * 700, vy: Math.sin(f.yaw) * 700, vz: 0, t: 0, home: true }); } }
          if (f.kind === 'bomber') { const w = Math.sin(f.t * .6) * 260, ax = j.x + fw[0] * 900 + rt[0] * w, ay = j.y + fw[1] * 900 + rt[1] * w, e = Math.min(1, dt * .8);   // (it holds a place ahead of the jet, weaving)
            f.x += (ax - f.x) * e; f.y += (ay - f.y) * e; f.z += (j.z + 60 + Math.sin(f.t * .9) * 70 - f.z) * e; f.yaw += E.angDiff(f.yaw, j.yaw) * e;
            if (Math.floor(f.t / 1.8) !== Math.floor((f.t - dt) / 1.8)) for (const s of [-1, 1]) R.hot.push({ x: f.x + rt[0] * s * 40, y: f.y + rt[1] * s * 40, z: f.z, vx: -fw[0] * 300, vy: -fw[1] * 300, vz: 0, t: 0, home: true }); }
        }
        R.foes = R.foes.filter(f => f === R.boss || (f.hp > 0 && f.t < 14)); R.locks = R.locks.filter(f => R.foes.includes(f));   // (a bandit flown off lets go of its lock)
        if (R.boss && R.boss.hp <= 0 && !R.boss.dead) { R.boss.dead = true; for (let i = 0; i < 6; i++) boom(R.boss.x + (i - 3) * 20, R.boss.y, R.boss.z, 2); clear(); }
      },
      hit(s) {
        for (const f of R.foes) if (f.hp > 0 && Math.hypot(s.x - f.x, s.y - f.y, s.z - f.z - 4) < f.r) { f.hp -= s.homing ? 3 : 1; if (f.hp <= 0) { if (f !== R.boss) boom(f.x, f.y, f.z, 1.4); score(f === R.boss ? 20000 : 1000); } else A.sfx('hit', { vol: .3 }); return true; }
        return false;
      },
      me() { const j = R.j; return j.spin > 0 ? null : { x: j.x, y: j.y, z: j.z }; },
      gather(V) {
        const j = R.j, o = { yaw: j.yaw, pitch: j.pitch, roll: j.roll + (j.spin > 0 ? (1 - j.spin / .9) * TAU : 0) };
        for (const f of R.foes) if (f.hp > 0) V.mesh(JET, f.x, f.y, f.z, f === R.boss ? { yaw: f.yaw, scale: 4, colors: { body: '#4a4a5a', tail: '#c83a30' } } : { yaw: f.yaw, roll: Math.sin(f.t * 2) * .4, colors: { body: '#6a7a4a', tail: '#4a5a3a' } });
        if (R.hurt <= 0 || Math.floor(t * 12) % 2) V.mesh(JET, j.x, j.y, j.z, Object.assign({ scale: 1.5, colors: { body: '#d8dce4', tail: '#3a5ab8' } }, o));
        for (const s of R.shots) if (s.homing) V.mesh(MISSILE, s.x, s.y, s.z, { yaw: Math.atan2(s.vy, s.vx) });
        for (const h of R.hot) V.mesh(MISSILE, h.x, h.y, h.z, { yaw: Math.atan2(h.vy, h.vx), colors: {} });
      }
    },
    /** the dunes: the speeder turned freely, faster or slower, low over the sand; four crawlers far apart (the radar
     *  finds them), slow, firing when you're near; skimmers that hunt you; the stage clear when the last crawler falls */
    speeder: {
      start() {
        const Q = E.rng(9); R.v = { x: 4096, y: 4096, z: 26, yaw: -Math.PI / 2, turn: 0, speed: 420 }; R.next = 5;
        for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + .5 + Q() * .5, d = 1300 + i * 350; R.foes.push({ kind: 'crawler', x: 4096 + Math.cos(a) * d, y: 4096 + Math.sin(a) * d, z: 40, yaw: Q() * TAU, hp: 10, r: 70, t: 0, fire: 2 + i }); }
      },
      cam() { const v = R.v, back = game.H > game.W ? 150 : 110; return { x: v.x - Math.cos(v.yaw) * back, y: v.y - Math.sin(v.yaw) * back, h: 46, angle: v.yaw, pitch: 7, fov: game.H > game.W ? 84 : 70, roll: v.turn * 8 }; },
      update(dt, k) {
        const v = R.v; v.turn += (clamp(k.x, -1, 1) - v.turn) * Math.min(1, dt * 6); v.yaw += v.turn * 1.6 * dt;
        v.speed = clamp(v.speed - clamp(k.y, -1, 1) * 420 * dt, 260, 780); v.x += Math.cos(v.yaw) * v.speed * dt; v.y += Math.sin(v.yaw) * v.speed * dt; v.z = 26 + Math.sin(R.t * 3) * 2;
        if (k.fire && R.cool <= 0) { R.cool = .1; R.fired++; R.shots.push({ x: v.x + Math.cos(v.yaw) * 20, y: v.y + Math.sin(v.yaw) * 20, z: v.z + 4, vx: Math.cos(v.yaw) * 2400, vy: Math.sin(v.yaw) * 2400, vz: 0, t: 0 }); A.sfx('shoot', { vol: .3 }); }
        const fw = [Math.cos(v.yaw), Math.sin(v.yaw)];
        if (R.t > R.next && R.foes.filter(f => f.kind === 'skimmer').length < 3) { R.next = R.t + 7; for (const sd of [-1, 1]) R.foes.push({ kind: 'skimmer', x: v.x + fw[0] * 2200 - fw[1] * sd * 300, y: v.y + fw[1] * 2200 + fw[0] * sd * 300, z: 30, yaw: v.yaw + Math.PI, speed: 640, hp: 2, r: 26, t: 0, fire: 1.5 }); }
        for (const f of R.foes) {
          f.t += dt; const d = Math.hypot(v.x - f.x, v.y - f.y), want = Math.atan2(v.y - f.y, v.x - f.x);
          if (f.kind === 'crawler') {   // it grinds on, turning slowly; near, it fires; run into it and it hurts
            f.yaw += Math.sin(f.t * .3 + f.r) * .1 * dt; f.x += Math.cos(f.yaw) * 60 * dt; f.y += Math.sin(f.yaw) * 60 * dt;
            f.fire -= dt; if (f.fire < 0 && d < 1500) { f.fire = 2.6; fireAt(f, 520); }
            if (d < 66) { hurt(); v.speed = 260; v.x = f.x - Math.cos(want) * 68; v.y = f.y - Math.sin(want) * 68; }
          } else {   // a skimmer: turns after you, fires a homing bolt now and then
            if (f.t > .8) f.yaw += clamp(E.angDiff(f.yaw, want), -1.1 * dt, 1.1 * dt); f.x += Math.cos(f.yaw) * f.speed * dt; f.y += Math.sin(f.yaw) * f.speed * dt;
            f.fire -= dt; if (f.fire < 0 && d < 1400) { f.fire = 3; R.hot.push({ x: f.x, y: f.y, z: f.z, vx: Math.cos(f.yaw) * 620, vy: Math.sin(f.yaw) * 620, vz: 0, t: 0, home: true }); }
          }
        }
        R.foes = R.foes.filter(f => f.hp > 0 && (f.kind === 'crawler' || f.t < 16));
        if (R.phase === 'play' && !R.foes.some(f => f.kind === 'crawler')) clear();
      },
      hit(s) {
        for (const f of R.foes) if (f.hp > 0 && Math.hypot(s.x - f.x, s.y - f.y, s.z - f.z) < f.r) { if (--f.hp <= 0) { const big = f.kind === 'crawler'; for (let i = 0; i < (big ? 3 : 1); i++) boom(f.x + (i - 1) * 30, f.y, f.z, big ? 2 : 1.2); score(big ? 5000 : 800); } else A.sfx('hit', { vol: .3 }); return true; }
        return false;
      },
      me() { const v = R.v; return { x: v.x, y: v.y, z: v.z }; },
      gather(V) {
        const v = R.v; V.add(v.x, v.y, 0, (g, sx, sy, k) => { const a = g.globalAlpha; g.globalAlpha = .35; px.ell(g, sx, sy, 20 * k, 7 * k, '#3a2010'); g.globalAlpha = a; });
        for (const f of R.foes) V.mesh(f.kind === 'crawler' ? CRAWLER : SPEEDER, f.x, f.y, f.kind === 'crawler' ? 0 : f.z, f.kind === 'crawler' ? { yaw: f.yaw, scale: 3, colors: { hull: '#9a8a74' } } : { yaw: f.yaw, scale: 1.4, colors: { body: '#7a2a2a' } });
        if (R.hurt <= 0 || Math.floor(t * 12) % 2) V.mesh(SPEEDER, v.x, v.y, v.z, { yaw: v.yaw, roll: v.turn * .5, scale: 1.4, colors: { body: '#e8e4d8' } });
      }
    },
    /** the city (Thunder Blade): the helicopter flies up the avenue (north) by itself, seen from straight overhead for its
     *  first stretch (the stick moves it about the screen, its gun fires down ahead at the streets), then the camera
     *  swings down behind it (at 12 s, as the sea's does) and it flies low between the buildings, the stick its line
     *  across and its height; waves by time, then the gunship */
    blade: {
      start() { Object.assign(R, { F: 0, hx: 0, dy: 40, hz: 260, bank: 0, tilt: -.1, spin: 0, guns: new Set() }); },
      swing: () => E.ease.inOutQuad(clamp((R.t - 12) / 2.5, 0, 1)),
      cam() {   // (over the helicopter, then swung down behind it: the pitch kept within 20 degrees of it, on the screen throughout)
        const tall = game.H > game.W, u = this.swing(), y = R.F + R.dy, n = { x: R.hx * (tall ? .85 : .6), y: y + (tall ? 200 : 150), h: R.hz + (tall ? 70 : 58), angle: -Math.PI / 2, pitch: (tall ? 6 : 10) + R.hz * .01, fov: tall ? 80 : 66, roll: Math.abs(R.bank) > .04 ? R.bank * -12 : 0 };
        for (const q of boxes(n.y - 260, n.y + 40)) if (q.z0 > 0 && R.hz < q.z0) n.h = Math.min(n.h, q.z0 - 8 + Math.max(0, n.y - q.y1 - 40) * .6);   // (the helicopter under a skybridge: the camera under it too, as it nears it)
        if (u >= 1) return n; const cy = R.F - 40 + (n.y - R.F + 40) * u, h = R.hz + 330 + (n.h - R.hz - 330) * u, dn = Math.atan2(h - R.hz, cy - y) * 180 / Math.PI;
        const ox = R.hx * (tall ? .85 : .5); return Object.assign(n, { x: ox + (n.x - ox) * u, y: cy, h, pitch: Math.min(90, Math.max(90 + (n.pitch - 90) * u, dn - 20)), roll: n.roll * u });
      },
      update(dt, k) {
        const u = this.swing(), top = u <= 0, T = R.t, lim = top ? 300 : u < 1 ? 300 - 200 * u : 200;   // (across: the street grid overhead, drawn in to the avenue as the camera swings down)
        R.F -= 480 * dt; R.spin += dt * 31;
        R.bank += (clamp(k.x, -1, 1) * .35 - R.bank) * Math.min(1, dt * 6); R.tilt += (-.1 + (top ? k.y * .15 : -k.y * .12) - R.tilt) * Math.min(1, dt * 5);
        R.hx = clamp(R.hx + k.x * 300 * dt, -300, 300); R.hx += (clamp(R.hx, -lim, lim) - R.hx) * Math.min(1, dt * 4);
        if (top) R.dy = clamp(R.dy + k.y * 260 * dt, -150, 110);   // overhead: up and down the screen; the swing: down to the avenue; behind: up and down
        else if (u < 1) {   // (the swing: down to the avenue, but over a roof until it's over the avenue itself)
          const yy = R.F + R.dy, roof = Math.abs(R.hx) > 110 ? Math.max(0, ...boxes(yy - 40, yy + 40).filter(q => !q.z0 && R.hx > q.x0 - 24 && R.hx < q.x1 + 24).map(q => q.z1 + 24)) : 0;
          R.dy -= R.dy * Math.min(1, dt * 3); R.hz += (Math.max(120, roof) - R.hz) * Math.min(1, dt * 1.6);
        }
        else R.hz = clamp(R.hz - k.y * 260 * dt, 40, 420);
        const me = this.me();
        if (k.fire && R.cool <= 0) {   // overhead the gun fires down ahead (a shot meets what it passes over); behind, ahead, leaning to the foe nearest its line
          R.cool = .1; R.fired++; A.sfx('shoot', { vol: .3 });
          if (u < .5) R.shots.push({ x: me.x, y: me.y - 20, z: me.z - 6, vx: 0, vy: -1100, vz: -(me.z - 6) / .45, t: .45, down: true });
          else { const f = R.foes.filter(f => f.hp > 0 && f.y < me.y - 60 && me.y - f.y < 1800 && Math.abs(f.x - me.x) < 50 + (me.y - f.y) * .06 && Math.abs(f.z + 10 - me.z) < 70 + (me.y - f.y) * .1).sort((a, b) => b.y - a.y)[0], tt = f ? (me.y - f.y) / 1600 : 1;
            R.shots.push({ x: me.x, y: me.y - 20, z: me.z - 4, vx: f ? clamp((f.x - me.x) / tt, -400, 400) : 0, vy: -1600, vz: f ? clamp((f.z + 10 - me.z + 4) / tt, -700, 500) : 0, t: 0 }); }
        }
        const W = R.waves, wave = (at, fn) => { if (T >= at && W === wave.n) { fn(); R.waves++; } wave.n++; }; wave.n = 0;
        for (const [at, kind, n] of [[1.5, 'tanks', 3], [3, 'jeeps', 2], [4.5, 'guns', 3], [6, 'copters', 3], [7.5, 'tanks', 4], [9, 'guns', 3], [10.5, 'copters', 2], [15, 'copters', 3], [17, 'tanks', 3], [19.5, 'guns', 4],
          [22, 'copters', 4], [24.5, 'jeeps', 3], [26, 'tanks', 2], [28, 'guns', 4], [30.5, 'copters', 5], [33, 'tanks', 3], [35.5, 'copters', 3], [37, 'guns', 3]]) wave(at, () => this.spawn(kind, n, top, me));
        if (T > 40 && !R.boss) { R.boss = { kind: 'gunship', x: 0, y: me.y - 2200, z: 200, hp: 60, max: 60, r: 76, t: 0, fire: 2.5, salvo: 5 }; R.foes.push(R.boss); A.music('boss'); }
        for (const f of R.foes) {
          f.t += dt; if (f.hp <= 0) continue;
          const dx = me.x - f.x, dy = me.y - f.y, near = dy > 150 && dy < 1400;   // (ahead of the helicopter, in range)
          if (f.v) { f.x += Math.cos(f.yaw) * f.v * dt; f.y += Math.sin(f.yaw) * f.v * dt; }
          if (f.kind === 'tank' || f.kind === 'gun') { f.aim = Math.atan2(dy, dx); if (near && (f.fire -= dt) < 0) { f.fire = f.kind === 'tank' ? 2.6 : 2.1; lob(f, f.kind === 'tank' ? 480 : 540, f.z + 14); } }
          if (f.kind === 'copter') {   // it weaves at you (down the avenue, between its walls), one missile when near, and past you climbs away; flown into, it hurts
            f.y += f.vy * dt; f.x += Math.sin(f.t * 2 + f.ph) * 60 * dt; if (!top) f.x = clamp(f.x, -100, 100); if (dy < -40 && !top) f.z += 320 * dt;
            if (near && (f.fire -= dt) < 0) { f.fire = 9; R.hot.push({ x: f.x, y: f.y + 10, z: f.z, vx: 0, vy: 560, vz: 0, t: 0, home: true }); }
            if (Math.hypot(dx, dy, me.z - f.z) < 34) { f.hp = 0; boom(f.x, f.y, f.z, 1.4); hurt(); }
          }
        }
        const B = R.boss; if (B && B.flash > 0) B.flash -= dt;
        if (B && B.hp > 0) {   // the gunship holds a place ahead (keeping up), weaving: a burst of three from its guns, a pair of missiles now and then
          const e = Math.min(1, dt * 1.2); B.x += (Math.sin(B.t * .8) * 50 - B.x) * e; B.y += -480 * dt + (me.y - 480 - B.y) * Math.min(1, dt * .9); B.z += (180 + Math.sin(B.t * 1.3) * 60 - B.z) * e;
          if ((B.fire -= dt) < 0) { B.fire = 1.5; for (const s of [-1, 0, 1]) lob({ x: B.x + s * 40, y: B.y + 30 }, 620, B.z, s * 60); }
          if ((B.salvo -= dt) < 0) { B.salvo = 4.5; for (const s of [-1, 1]) R.hot.push({ x: B.x + s * 44, y: B.y + 20, z: B.z, vx: s * 160, vy: 420, vz: 0, t: 0, home: true }); }
        } else if (B && !B.dead) { B.dead = true; B.fall = 0; for (let i = 0; i < 6; i++) boom(B.x + (i - 3) * 24, B.y, B.z + (i % 2) * 20, 2); clear(); }
        else if (B && B.z > 0) {   // shot down: it falls on ahead, smoking, and bursts on the street
          B.fall += dt * 260; B.z = Math.max(0, B.z - B.fall * dt); B.y += -480 * dt + (me.y - 480 - B.y) * Math.min(1, dt * .9);
          if (Math.floor(B.t / .3) !== Math.floor((B.t - dt) / .3)) boom(B.x, B.y, B.z + 20, 1.2); if (B.z <= 0) boom(B.x, B.y, 10, 3);
        }
        if (!top) for (const q of boxes(me.y - 14, me.y + 14)) if (me.x > q.x0 - 14 && me.x < q.x1 + 14 && me.z > q.z0 - 10 && me.z < q.z1 + 12) {   // a building flown into: it hurts, and knocks the helicopter out the nearest way (across, over, under)
          const free = o => Math.abs(me.x + o[0]) <= lim && !boxes(me.y - 14, me.y + 14).some(b => b !== q && me.x + o[0] > b.x0 - 14 && me.x + o[0] < b.x1 + 14 && me.z + o[1] > b.z0 - 10 && me.z + o[1] < b.z1 + 12);   // (a way out within reach and into no other building)
          const out = [[q.x0 - 15 - me.x, 0], [q.x1 + 15 - me.x, 0], [0, q.z1 + 13 - me.z], [0, q.z0 > 0 ? q.z0 - 11 - me.z : 1e9]].filter(free).sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]))[0] || [0, q.z1 + 13 - me.z];
          R.hx += out[0]; R.hz += out[1]; game.shake(4); hurt(); break;
        }
        R.foes = R.foes.filter(f => f === R.boss || (f.hp > 0 && f.y < R.F + 600 && f.t < 30));   // (gone past the screen's foot, overhead too)
      },
      /** what a wave brings, from ahead (overhead, just past the screen's top; behind, out of the haze): tanks up the
       *  avenue's lanes (not into a wing), jeeps across a cross street, guns on the roofs by the avenue, helicopters */
      spawn(kind, n, top, me) {
        const ahead = me.y - (top ? 820 : 2900);
        for (let i = 0; i < n; i++) {
          if (kind === 'tanks') { const lanes = [-70, 70, -25, 25].filter(x => !boxes(ahead - n * 170 - 60, ahead + 400).some(q => q.wing && x > q.x0 - 30 && x < q.x1 + 30)); R.foes.push({ kind: 'tank', x: lanes[i % lanes.length], y: ahead - i * 170, z: 0, yaw: Math.PI / 2, aim: Math.PI / 2, v: 40, hp: 3, r: 26, t: 0, fire: 1 + i * .7 }); }
          if (kind === 'jeeps') { const s = i % 2 ? 1 : -1; R.foes.push({ kind: 'jeep', x: -s * (520 + i * 140), y: Math.round(ahead / 512) * 512 + s * 18, z: 0, yaw: s > 0 ? 0 : Math.PI, v: 240, hp: 1, r: 20, t: 0 }); }
          if (kind === 'copters') { const c = i - (n - 1) / 2; R.foes.push({ kind: 'copter', x: c * (top ? 120 : 55), y: (top ? me.y - 760 : ahead) - Math.abs(c) * (top ? 90 : 160), z: top ? 260 : clamp(me.z + (i % 2 ? 40 : -20), 70, 340), vy: top ? 240 : 320, hp: 2, r: 30, t: 0, ph: i, fire: .3 + i * .35 }); }
        }
        if (kind === 'guns') for (const q of boxes(ahead - 600, ahead + 200).filter(q => q.s && q.near && !q.z0 && !q.wing && !R.guns.has(q)).sort((a, b) => b.y0 - a.y0).slice(0, n)) { R.guns.add(q); R.foes.push({ kind: 'gun', x: q.fx + q.s * 26, y: (q.y0 + q.y1) / 2, z: q.z1, hp: 2, r: 22, t: 0, fire: 1 + R.guns.size % 3 * .5, aim: Math.PI / 2 }); }
      },
      hit(s) {   // (overhead, a shot meets what it passes over: the streets and the air are one)
        for (const f of R.foes) if (f.hp > 0 && (s.down ? Math.hypot(s.x - f.x, s.y - f.y) < f.r + 4 : Math.hypot(s.x - f.x, s.y - f.y, s.z - f.z - (f.kind === 'copter' || f === R.boss ? 0 : 8)) < f.r + 6)) {
          if (f === R.boss) f.flash = .04;
          if (--f.hp <= 0) { if (f !== R.boss) boom(f.x, f.y, f.z + 10, f.kind === 'copter' ? 1.4 : 1.2); score({ tank: 500, jeep: 300, gun: 400, copter: 800, gunship: 20000 }[f.kind]); } else A.sfx('hit', { vol: .3 });
          return true;
        }
        return false;
      },
      me() { return { x: R.hx, y: R.F + R.dy, z: R.hz }; },
      gather(V) {
        const me = this.me(), u = this.swing(), y0 = me.y + (u < .5 ? 700 : 300), y1 = me.y - (u < .5 ? 800 : 3200), c = this.cam(), cp = Math.cos(c.pitch * Math.PI / 180), sp = Math.sin(c.pitch * Math.PI / 180);
        for (let b = Math.floor(y1 / 512); b <= Math.floor(y0 / 512); b++) for (const q of block(b)) {   // the city: each box, its windows near
          if (q.y0 > y0 || q.y1 < y1 || !q.near && u >= .5 && me.z < 150 && me.y - q.y1 > 1200) continue;   // (past the side street, far up the avenue: behind the near ones, but in view over the roofs)
          if (q.tree) { V.mesh(TREE, q.x0, q.y0, 0, { scale: 1.6, colors: { leaf: q.col } }); continue; }
          let d = q.y1 - q.y0; if (cp > .2) { const end = c.y - (14 + (q.z1 + 10 - c.h) * sp) / cp; if (q.y1 > end) d = Math.floor((end - q.y0) / 16) * 16; }   // (one the camera is passing: cut short in front of it, a face reaching behind it being left out whole)
          if (d < 16) continue;
          const m = d < q.y1 - q.y0 ? shape(q.x0 - q.fx, q.x1 - q.fx, d, q.z1 - q.z0, q.s, !q.wing && q.s !== 0) : q.m || (q.m = shape(q.x0 - q.fx, q.x1 - q.fx, d, q.z1 - q.z0, q.s, !q.wing && q.s !== 0));
          V.mesh(m.body, q.fx, q.y0, q.z0, { colors: { wall: q.col, roof: '#5a5866' }, light: LIGHT });
          if (q.near && me.y - q.y1 < 1400) V.mesh(m.win, q.fx, q.y0, q.z0, { colors: q.glass, flat: true });
        }
        for (const f of R.foes) {
          if (f.kind === 'tank') { const o = { x: f.x, y: f.y, z: 0, yaw: f.yaw, scale: 1.8 }, p = TANK.at(-1, 0, 8, o); V.mesh(TANK, f.x, f.y, 0, Object.assign(o, { colors: { hull: '#6a7a4a' }, light: LIGHT })); V.mesh(TURRET, p[0], p[1], p[2], { yaw: f.aim, scale: 1.8, colors: { hull: '#7a8a5a' }, light: LIGHT }); }
          else if (f.kind === 'jeep') V.mesh(JEEP, f.x, f.y, 0, { yaw: f.yaw, scale: 1.8, colors: { body: '#8a7a4a' }, light: LIGHT });
          else if (f.kind === 'gun') V.mesh(GUN, f.x, f.y, f.z, { yaw: f.aim, scale: 1.8, colors: { hull: '#8a8a96' }, light: LIGHT });
          else if (f === R.boss ? f.z > 0 : f.hp > 0) {   // a helicopter, the gunship: its body, then its rotors at the same foot
            const M = f === R.boss ? GUNSHIP : HELI, o = { x: f.x, y: f.y, z: f.z - (M === HELI ? 14 : 36), yaw: Math.PI / 2 + (f.dead ? f.t * 3 : 0), roll: f.dead ? .4 : Math.sin(f.t * 2 + (f.ph || 0)) * .25, pitch: .12, scale: M === HELI ? 1.2 : 3.2, light: LIGHT,
              colors: M === HELI ? { body: '#5a6a3a', trim: '#3a4a2a' } : { hull: f.flash > 0 ? '#f0e8e0' : '#4a4e5a', trim: '#2a2e38' } };
            V.mesh(M, o.x, o.y, o.z, o); V.add(o.x, o.y, o.z, g => rotors(g, V, M, o, f.t * 31), null, true);
          }
        }
        for (const h of R.hot) if (h.home) V.mesh(MISSILE, h.x, h.y, h.z, { yaw: Math.atan2(h.vy, h.vx), scale: 1.4 });
        const sx = me.x + me.z * .3, sy = me.y - me.z * .2, gz = Math.max(0, ...boxes(sy - 1, sy + 1).filter(q => sx > q.x0 && sx < q.x1 && q.z1 < me.z).map(q => q.z1));   // (its shadow, cast north-east, on the street or a roof)
        V.add(sx, sy, gz, (g, x, y, k) => { const a = g.globalAlpha; g.globalAlpha = .35; px.ell(g, x, y, 24 * k, 12 * k, '#1a1420'); g.globalAlpha = a; });
        const o = { x: me.x, y: me.y, z: me.z - 14, yaw: -Math.PI / 2, pitch: R.tilt, roll: R.bank, scale: 1.35, light: LIGHT, colors: { body: '#4a6a9a', trim: '#e8e0c8' } };   // (the helicopter over all: layer 1)
        if (R.hurt <= 0 || Math.floor(t * 12) % 2) V.add(o.x, o.y, o.z, g => { HELI.draw(g, (x, y, z) => V.project(x, y, z), o); rotors(g, V, HELI, o, R.spin); }, null, true, 1);
      }
    },
    /** the valley: the camera rides the rails, the cursor aims, a shot is what m7.pick finds under it; the walker at the end */
    safari: {
      start() {
        R.s = 0; R.cur = [game.W / 2, game.H / 2]; R.rocks = []; R.ptr = null;
        for (let s = 300, n = 0; s < RAIL.length - 500; s += 260, n++) { const p = RAIL.at(s), side = n % 2 ? 1 : -1, nx = -Math.sin(p.angle), ny = Math.cos(p.angle), off = side * (110 + (s * 7) % 80);
          const rock = { x: p.x + nx * off, y: p.y + ny * off }; R.rocks.push(rock); R.foes.push({ kind: n % 3 === 2 ? 'bat' : 'slime', at: s - 420, x: rock.x + Math.cos(p.angle) * 50, y: rock.y + Math.sin(p.angle) * 50, z: 0, hp: 1, out: 0, rig: null, rock }); }
      },
      cam() { const p = RAIL.at(R.s), look = R.boss ? Math.atan2(R.boss.y - p.y, R.boss.x - p.x) : p.angle; return { x: p.x, y: p.y, h: 26, angle: look + (R.cur[0] / game.W - .5) * .25, pitch: 3 + (R.cur[1] / game.H - .5) * 8, fov: game.H > game.W ? 80 : 70 }; },
      update(dt, k) {
        const I = game.input, ptr = I.pointer && I.pointer(), drawn = this.cam();   // (the camera the last frame was drawn with: a tap or a click is on what it showed, so the shot is picked through it, not one already turned to the cursor's new place)
        if (ptr && (!R.ptr || ptr[0] !== R.ptr[0] || ptr[1] !== R.ptr[1])) R.cur = ptr.slice(); R.ptr = ptr;
        R.cur = [clamp(R.cur[0] + k.x * 230 * dt, 6, game.W - 6), clamp(R.cur[1] + k.y * 230 * dt, 6, game.H - 6)];
        const shoot = k.tap || (k.fire && R.cool <= 0 && !(I.lastDevice === 'touch' && !auto)); if (k.tap) R.cur = k.tap.slice();
        if (shoot) { R.cool = .22; R.fired++; A.sfx('shoot', { vol: .4 }); R.flash = .06; VP.vale.begin({ W: game.W, H: game.H }, drawn); const h = VP.vale.pick(R.cur[0], R.cur[1], targets()), f = h && h.target;
          if (f && f.hp > 0) { f.hp--; if (f.hp <= 0) { boom(f.x, f.y, f.z + 12, f.weak ? 1.6 : 1); score(f.weak ? 3000 : f.kind === 'shell' ? 200 : 500); } else A.sfx('hit', { vol: .4 }); } }
        if (R.flash > 0) R.flash -= dt;
        if (!R.boss) { R.s = Math.min(RAIL.length - 40, R.s + 150 * dt); if (R.s >= RAIL.length - 40) { const p = RAIL.at(RAIL.length), ap = p.angle; R.boss = { x: p.x + Math.cos(ap) * 230, y: p.y + Math.sin(ap) * 230, t: 0 };
          R.boss.parts = [-1, 1].map(sd => ({ kind: 'arm', weak: true, hp: 6, side: sd, x: 0, y: 0, z: 0 })).concat([{ kind: 'core', weak: true, hp: 10, x: 0, y: 0, z: 0 }]); R.foes.push(...R.boss.parts); A.music('boss'); } }
        const c = RAIL.at(R.s);
        for (const f of R.foes) {
          if (f.hp <= 0) continue;
          if (f.kind === 'slime' || f.kind === 'bat') {
            if (R.s < f.at) continue; f.out += dt; if (!f.rig) f.rig = f.kind === 'bat' ? new E.Blob({ R: 14, wings: true, ears: 'cat', mouth: 'fangs', colors: { base: '#6a4a9a' } }) : new E.Blob({ R: 16, colors: { base: ['#5ac85a', '#e8a030', '#3a9ae8'][Math.floor(f.at) % 3] } });
            const dx = c.x - f.x, dy = c.y - f.y, d = Math.hypot(dx, dy), sp = f.kind === 'bat' ? 170 : 90;
            if (f.out > (f.kind === 'bat' ? .3 : 1.1)) { f.x += dx / d * sp * dt; f.y += dy / d * sp * dt; }
            f.z = f.kind === 'bat' ? 40 + Math.sin(f.out * 3) * 14 : Math.abs(Math.sin(f.out * 5)) * 22; f.rig.update(dt, { squash: f.kind === 'bat' ? 0 : Math.sin(f.out * 10) * .25, look: [dx / d, dy / d] });
            if (d < 50) { f.hp = 0; hurt(); }
          }
          if (f.kind === 'shell') { f.t += dt; const u = f.t / 1.6; f.x = f.x0 + (c.x - f.x0) * u; f.y = f.y0 + (c.y - f.y0) * u; f.z = 70 + Math.sin(u * Math.PI) * 50 - u * 50; if (u >= 1) { f.hp = 0; hurt(); } }
        }
        const B = R.boss;
        if (B) {   // the walker: two arm cannons, then its core; it stamps in place and fires shells you can shoot down
          B.t += dt; const a = Math.atan2(c.y - B.y, c.x - B.x), arms = B.parts.filter(p => p.kind === 'arm' && p.hp > 0); B.yaw = a;
          for (const p of B.parts) { const at = WALKER.at(p.kind === 'core' ? 22 : 8, p.kind === 'core' ? 0 : p.side * 40, p.kind === 'core' ? 74 : 68, { x: B.x, y: B.y, yaw: a }); p.x = at[0]; p.y = at[1]; p.z = at[2]; }
          B.parts[2].shield = arms.length > 0;
          if (B.parts[2].shield) B.parts[2].hp = Math.max(B.parts[2].hp, 10);
          if (arms.length && Math.floor(B.t / 1.7) !== Math.floor((B.t - dt) / 1.7)) { const p = arms[Math.floor(B.t) % arms.length]; R.foes.push({ kind: 'shell', hp: 1, t: 0, x0: p.x, y0: p.y, x: p.x, y: p.y, z: p.z }); }
          if (B.parts[2].hp <= 0 && !B.dead) { B.dead = true; for (let i = 0; i < 5; i++) boom(B.x, B.y, 40 + i * 12, 2); clear(); }
        }
      },
      hit() { return false; },
      me() { return null; },
      gather(V) {
        for (const r of R.rocks) V.mesh(ROCK, r.x, r.y, 0, { scale: 1.7 });
        for (const f of R.foes) {
          if (f.hp <= 0 || ((f.kind === 'slime' || f.kind === 'bat') && (R.s < f.at || !f.rig))) continue;
          if (f.kind === 'slime' || f.kind === 'bat') V.add(f.x, f.y, f.z, (g, sx, sy, k) => f.rig.draw(g, Math.round(sx), Math.round(sy), V.view(k)), { target: f, w: 50, h: f.kind === 'bat' ? 40 : 46 });
          if (f.kind === 'shell') V.add(f.x, f.y, f.z, (g, sx, sy, k) => { px.disc(g, sx, sy - 5 * k, 6 * k, '#3a3a3a'); px.disc(g, sx - k, sy - 6 * k, 2.5 * k, '#9a9a9a'); }, { target: f, w: 18, h: 16 });
        }
        const B = R.boss;
        if (B && !B.dead) {
          V.mesh(WALKER, B.x, B.y, Math.abs(Math.sin(B.t * 2)) * 4, { yaw: B.yaw, colors: { hull: '#8a909e' }, target: null });
          for (const p of B.parts) if (p.hp > 0) V.mesh(p.kind === 'core' ? CORE : ARM, p.x, p.y, p.z, { yaw: B.yaw, colors: { hull: '#9aa0ae', core: p.shield ? '#4a5a8a' : (t * 6 % 2 < 1 ? '#ff5040' : '#ffd040') }, target: p.shield ? null : p });
        }
      }
    }
  };
  // what a safari shot can meet: each foe out of hiding (its box), the rocks and the walker's body (in the way)
  function targets() {
    const out = R.rocks.map(r => ({ x: r.x, y: r.y, z: 0, w: 80, h: 48 }));
    for (const f of R.foes) if (f.hp > 0 && (f.kind === 'shell' || f.weak || (f.rig && R.s >= f.at))) out.push(f.kind === 'shell' ? { x: f.x, y: f.y, z: f.z, w: 18, h: 16, target: f } : f.weak ? { x: f.x, y: f.y, z: f.z - (f.kind === 'core' ? 10 : 8), w: f.kind === 'core' ? 20 : 26, h: f.kind === 'core' ? 20 : 16, target: f.shield ? null : f } : { x: f.x, y: f.y, z: f.z, w: 50, h: f.kind === 'bat' ? 40 : 46, target: f });
    if (R.boss && !R.boss.dead) out.push({ x: R.boss.x, y: R.boss.y, z: 0, w: 60, h: 56 });
    return out;
  }
  function fireAt(f, sp) { const m = STAGE[R.name].me() || { x: 0, y: R.F, z: 60 }, dx = m.x - f.x, dy = m.y - f.y, dz = m.z - f.z, d = Math.hypot(dx, dy, dz) || 1; R.hot.push({ x: f.x, y: f.y, z: f.z, vx: dx / d * sp, vy: dy / d * sp, vz: dz / d * sp, t: 0 }); }
  // a shell from (f.x, f.y, z) at the helicopter, aimed where it will be (it flies on up the avenue), off: that far beside
  function lob(f, sp, z, off = 0) { const m = STAGE.blade.me(), ty = m.y - 480 * Math.hypot(m.x - f.x, m.y - f.y, m.z - z) / sp * .85, dx = m.x + off - f.x, dy = ty - f.y, dz = m.z - z, d = Math.hypot(dx, dy, dz) || 1; R.hot.push({ x: f.x, y: f.y, z, vx: dx / d * sp, vy: dy / d * sp, vz: dz / d * sp, t: 0 }); }

  /* ---- each step ---- */
  function update(dt) {
    const I = game.input, st = R && STAGE[R.name];
    I.touchSet('missile', null, mode === 'play' && R.name === 'burner'); I.touchSet('roll', null, mode === 'play' && R.name === 'burner'); I.touchSet('fire', null, false);
    t += dt;
    if (mode === 'menu') { menu.update(dt); return; }
    if (mode === 'results') { after.update(dt); return; }
    R.t += dt; R.cool -= dt; if (R.hurt > 0) R.hurt -= dt;
    if (R.phase === 'intro') { R.phaseT -= dt; if (R.phaseT <= 0) R.phase = 'play'; }
    const k = auto ? pilot() : pad();
    if (R.phase === 'over') { R.phaseT -= dt; if (R.phaseT <= 0) end(); return; }
    st.update(dt, R.phase === 'clear' ? { x: 0, y: 0 } : k);
    for (const s of R.shots) {   // the player's shots (a homing missile turns after its target)
      s.t += dt;
      if (s.homing) { const f = s.homing, dx = f.x - s.x, dy = f.y - s.y, dz = f.z - s.z, d = Math.hypot(dx, dy, dz) || 1; s.vx += (dx / d * s.sp - s.vx) * Math.min(1, dt * 4); s.vy += (dy / d * s.sp - s.vy) * Math.min(1, dt * 4); s.vz += (dz / d * s.sp - s.vz) * Math.min(1, dt * 4); }
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; if (st.hit(s)) s.t = 9;
    }
    R.shots = R.shots.filter(s => s.t < (s.homing ? 3 : .9));
    const me = st.me();
    for (const h of R.hot) {   // what flies at the player: fireballs and (homing a little) missiles
      h.t += dt;
      if (h.home && me) { const dx = me.x - h.x, dy = me.y - h.y, dz = me.z - h.z, d = Math.hypot(dx, dy, dz) || 1, sp = Math.hypot(h.vx, h.vy, h.vz); h.vx += (dx / d * sp - h.vx) * dt * .8; h.vy += (dy / d * sp - h.vy) * dt * .8; h.vz += (dz / d * sp - h.vz) * dt * .8; }
      h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt;
      if (me && Math.hypot(h.x - me.x, h.y - me.y, h.z - me.z) < (h.home ? 24 : 26)) { h.t = 9; hurt(); }
    }
    R.hot = R.hot.filter(h => h.t < 4);
    for (const f of R.fx) f.t += dt; R.fx = R.fx.filter(f => f.t < .9);
    if (R.name === 'harrier') R.foes = R.foes.filter(f => f.y < R.F + 400 && (f.hp === undefined || f.hp > 0 || f.still));
    if (R.phase === 'clear') { R.phaseT -= dt; if (R.phaseT <= 0) { if (!R.one && R.stage < STAGES.length - 1) next(R.stage + 1); else end(); } }
  }
  function end() { mode = 'results'; after.i = 0; R.best = best('blaster', R.score); R.won = R.phase === 'clear'; }
  /** the autopilot (the bot, and a demo): the hero lines up with what is ahead and keeps clear of the columns; the jet
   *  turns toward the bandits, locks them and fires; the cursor goes to the nearest foe on the screen; the helicopter
   *  takes the free line up the avenue (round a wing, under or over a skybridge) nearest the foe ahead (R.still: hands
   *  off, nothing steered or fired: the bot's craft left to fly straight on) */
  function pilot() {
    const k = { x: 0, y: 0, fire: !R.still, missile: false, roll: false };
    if (R.still) return k;
    if (R.name === 'harrier') {
      const B = R.boss, f = B && B.parts && B.hp > 0 ? B.parts[0] : R.foes.filter(f => f.hp > 0 && f.y < R.F - 100 && f.kind !== 'col').sort((a, b) => b.y - a.y)[0];
      let tx = f ? f.x : 0, tz = f ? f.z : 60;
      for (const c of R.foes) if (c.kind === 'col' && c.y < R.F + 20 && R.F - c.y < 500 && Math.abs(c.x - tx) < 50) tz = Math.max(tz, 150);
      for (const h of R.hot) if (h.y < R.F && R.F - h.y < 400 && Math.abs(h.x - R.hx) < 40) tx += h.x > R.hx ? -80 : 80;
      k.x = clamp((tx - R.hx) / 40, -1, 1); k.y = clamp(-(tz - R.hz) / 40, -1, 1);
    } else if (R.name === 'zone') {   // line up the nearest pod ahead; a mine ahead on your line: step round it, keeping your height
      const f = R.foes.filter(f => f.hp > 0 && f.s > R.s + 60 && f.kind === 'pod').sort((a, b) => a.s - b.s)[0], m = R.foes.find(f => f.kind === 'mine' && f.hp > 0 && f.s > R.s && f.s < R.s + 420 && Math.abs(f.u - R.u) < 50);
      const tu = m ? m.u + (m.u > R.u ? -110 : 110) : f ? f.u : 0, tz = f ? f.z : 60; k.x = clamp((tu - R.u) / 30, -1, 1); k.y = clamp(-(tz - R.zh) / 30, -1, 1);
    } else if (R.name === 'speeder') {   // the nearest crawler: turn to it, close in, veer off its side; fire at whatever is lined up
      const v = R.v, dist = f => Math.hypot(f.x - v.x, f.y - v.y), off = f => Math.abs(E.angDiff(v.yaw, Math.atan2(f.y - v.y, f.x - v.x))), f = R.foes.filter(f => f.kind === 'crawler').sort((a, b) => dist(a) - dist(b))[0];
      if (f) { const a = E.angDiff(v.yaw, Math.atan2(f.y - v.y, f.x - v.x)), d = dist(f); k.x = d < 240 ? 1 : clamp(a * 3, -1, 1); k.y = d > 900 ? -1 : d < 500 ? 1 : 0; }
      k.fire = R.foes.some(f => off(f) < .2 && dist(f) < 2000);
    } else if (R.name === 'burner') {
      const j = R.j, f = R.foes.filter(f => f.hp > 0).sort((a, b) => Math.hypot(a.x - j.x, a.y - j.y) - Math.hypot(b.x - j.x, b.y - j.y))[0];
      if (f) { k.x = clamp(E.angDiff(j.yaw, Math.atan2(f.y - j.y, f.x - j.x)) * 2.5, -1, 1); k.y = clamp(-(f.z - j.z) / 120, -1, 1); }
      k.missile = R.locks.length > 0 && Math.floor(R.t * 3) % 2 === 0; k.roll = R.hot.some(h => Math.hypot(h.x - j.x, h.y - j.y) < 260);
    } else if (R.name === 'blade') {   // overhead: under the nearest foe ahead, a shell near stepped round; behind: the free line (a lane and a height) nearest the foe ahead, clear of every box for a stretch ahead
      const S = STAGE.blade, m = S.me(), u = S.swing(), f = R.foes.filter(f => f.hp > 0 && f.y < m.y - 40 && m.y - f.y < (u < 1 ? 520 : 1500)).sort((a, b) => b.y - a.y)[0];
      if (u <= 0) { let tx = f ? f.x : 0; for (const h of R.hot) if (h.y < m.y + 20 && m.y - h.y < 260 && Math.abs(h.x - m.x) < 40) tx = m.x + (h.x > m.x ? -90 : 90); k.x = clamp((tx - m.x) / 30, -1, 1); k.y = clamp((40 - R.dy) / 30, -1, 1); }
      else if (u < 1) k.x = clamp(-m.x / 30, -1, 1);
      else {
        const tx = f ? clamp(f.x, -90, 90) : 0, tz = f ? clamp(f.z + 40, 60, 380) : 110, bx = boxes(m.y - 820, m.y + 30), free = (x, z, far) => !bx.some(q => q.y1 > m.y - far && x > q.x0 - 30 && x < q.x1 + 30 && z > q.z0 - 26 && z < q.z1 + 24);
        let best = null;
        for (const far of [820, 420, 200]) { for (const x of [-90, -45, 0, 45, 90]) for (const z of [50, 80, 120, 170, 230, 300, 380]) if (free(x, z, far)) { const c = Math.abs(x - tx) + Math.abs(z - tz) * .7 + Math.abs(x - m.x) * .6 + Math.abs(z - m.z) * .6; if (!best || c < best[2]) best = [x, z, c]; } if (best) break; }
        const [gx, gz] = best || [0, 400]; k.x = clamp((gx - m.x) / 25, -1, 1); k.y = clamp(-(gz - m.z) / 25, -1, 1);
      }
    } else {
      const V = VP.vale.begin({ W: game.W, H: game.H }, STAGE.safari.cam()), all = targets().filter(q => q.target).map(q => [q.target, V.project(q.x, q.y, q.z + q.h / 2)]).filter(([, p]) => p && p[0] > 0 && p[0] < game.W && p[1] > 0 && p[1] < game.H).sort((a, b) => (a[0].kind === 'shell' ? -1 : 0) - (b[0].kind === 'shell' ? -1 : 0) || b[1][2] - a[1][2]);
      const on = all.find(a => a[0] === R.aimAt && a[0].kind !== 'shell' && !all.some(b => b[0].kind === 'shell')) || all[0]; R.aimAt = on && on[0];   // (it keeps to one target; a shell first)
      if (on) { const dx = on[1][0] - R.cur[0], dy = on[1][1] - R.cur[1]; k.x = clamp(dx / 12, -1, 1); k.y = clamp(dy / 12, -1, 1); k.fire = Math.hypot(dx, dy) < 6; } else k.fire = false;
    }
    return k;
  }

  /* ---- the look ---- */
  function draw(r) {
    const W = r.W, H = r.H;
    if (mode === 'menu') {
      const V = floors().plain; V.draw(r, { x: Math.sin(t * .3) * 100, y: -t * 300, h: 90, angle: -Math.PI / 2, pitch: 7, fov: 66, roll: Math.sin(t * .5) * 8 });
      r.overlay(g => { E.font.title(g, E.t('blaster.title'), W / 2, 22, { scale: 4, align: 'center', colors: ['#fff8d0', '#ffd060', '#ff7a3a', '#c83a6a'], depth: 3 }); E.font.text(g, E.t('blaster.tagline'), W / 2, 68, '#fff0e0', { align: 'center', shadow: '#2a1040', outline: false }); });
      menu.y = Math.round(H / 2) - 8; menu.draw(r); return;
    }
    const st = STAGE[R.name], V = VP[{ harrier: 'plain', burner: 'sea', zone: 'zone', safari: 'vale', speeder: 'dunes', blade: 'city' }[R.name]], cam = st.cam();
    st.gather(V);
    for (const s of R.shots) if (!s.homing) V.add(s.x, s.y, s.z, (g, sx, sy, k) => { const q = Math.max(1, 4 * k); px.disc(g, sx, sy, q * 1.6, '#ffe070'); px.disc(g, sx, sy, q, '#ffffff'); });
    for (const h of R.hot) if (!h.home) V.add(h.x, h.y, h.z, (g, sx, sy, k) => { const q = Math.max(1.5, 7 * k), w = Math.sin(t * 30) > 0; px.disc(g, sx, sy, q * 1.4, w ? '#ff5020' : '#ff9030'); px.disc(g, sx, sy, q * .7, '#fff0a0'); });
    for (const f of R.fx) V.add(f.x, f.y, f.z, (g, sx, sy, k) => { const u = f.t / .9, q = (10 + u * 26) * f.s * k; if (u < .5) { px.disc(g, sx, sy - q * .5, q, u < .2 ? '#ffffff' : '#ffd040'); px.disc(g, sx, sy - q * .5, q * .7, '#ff7a20'); } else px.disc(g, sx, sy - q * .5, q * (1.2 - u * .4), u < .7 ? '#6a5a5a' : '#4a4a4a'); });
    V.draw(r, cam);
    r.overlay(g => {
      const txt = (s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#100818', outline: false }, o)), lh = E.font.lineHeight(), right = cornerX() - 4;
      txt(E.t('blaster.score', { n: R.score }), 6, 6, '#ffe890');
      for (let i = 0; i < R.lives; i++) HERO_ICON(g, 8 + i * 12, 8 + lh);
      if (R.name === 'burner') {
        const j = R.j, cx = W / 2, cy = Math.round(H * .38);
        px.rect(g, cx - 14, cy - 1, 9, 2, '#80ff90'); px.rect(g, cx + 6, cy - 1, 9, 2, '#80ff90'); px.rect(g, cx - 1, cy - 14, 2, 9, '#80ff90'); px.rect(g, cx - 1, cy + 6, 2, 9, '#80ff90');
        for (const f of R.locks) { const p = VP.sea.project(f.x, f.y, f.z + 6); if (p) { const s = 10; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.rect(g, p[0] + a * s - (a > 0 ? 4 : 0), p[1] + b * s, 5, 1, '#ff4040'); px.rect(g, p[0] + a * s, p[1] + b * s - (b > 0 ? 4 : 0), 1, 5, '#ff4040'); } } }
        txt(E.t('blaster.missiles', { n: j.missiles }), 6, 10 + lh * 2, '#ffffff');
        if (R.locks.length && j.missiles > 0) txt(E.t('blaster.lock', { n: R.locks.length, key: game.input.label('missile') }), cx, cy + 20, '#ff6060', { align: 'center' });
      }
      if (R.name === 'speeder') {   // the radar (ahead is up; a crawler yellow, a skimmer red) and the crawlers left
        const v = R.v, cx = 26, cy = H - 26, fx = Math.cos(v.yaw), fy = Math.sin(v.yaw); px.disc(g, cx, cy, 21, '#2a1a10'); px.disc(g, cx, cy, 19, '#4a3420'); px.rect(g, cx, cy, 1, 1, '#ffffff');
        for (const f of R.foes) { const dx = f.x - v.x, dy = f.y - v.y, a = (dx * fx + dy * fy) / 130, b = (dy * fx - dx * fy) / 130, m = Math.min(1, 17 / (Math.hypot(a, b) || 1)), big = f.kind === 'crawler'; px.rect(g, Math.round(cx + b * m) - (big ? 1 : 0), Math.round(cy - a * m) - (big ? 1 : 0), big ? 3 : 2, big ? 3 : 2, big ? '#ffe040' : '#ff4040'); }
        txt(E.t('blaster.crawlers', { n: R.foes.filter(f => f.kind === 'crawler').length }), 6, 10 + lh * 2, '#ffe890');
      }
      if (R.name === 'blade' && STAGE.blade.swing() >= 1) {   // the height: a gauge at the right, the helicopter's mark on it, in red the tallest roof on its line ahead
        const x = right - 8, y0 = 34, y1 = H - 34, m = STAGE.blade.me(), Y = z => Math.round(y1 - (y1 - y0) * clamp(z / 420, 0, 1)), roof = Math.max(0, ...boxes(m.y - 700, m.y).filter(q => m.x > q.x0 - 20 && m.x < q.x1 + 20).map(q => q.z1));
        px.rect(g, x, y0, 3, y1 - y0, '#100818'); px.rect(g, x + 1, Y(roof), 1, y1 - Y(roof), '#6a3a4a'); if (roof) px.rect(g, x - 3, Y(roof), 9, 2, '#ff4a4a'); px.rect(g, x - 4, Y(m.z) - 1, 11, 3, '#ffe890');
      }
      if (R.name === 'safari') {   // the cursor: a ring and a cross
        const [cx, cy] = R.cur, c = R.flash > 0 ? '#ffffff' : '#ff3a3a';
        px.rect(g, cx - 9, cy, 6, 1, c); px.rect(g, cx + 4, cy, 6, 1, c); px.rect(g, cx, cy - 9, 1, 6, c); px.rect(g, cx, cy + 4, 1, 6, c);
        for (let a = 0; a < 16; a++) px.rect(g, Math.round(cx + Math.cos(a / 16 * TAU) * 6), Math.round(cy + Math.sin(a / 16 * TAU) * 6), 1, 1, c);
      }
      const B = R.boss, hp = B && (R.name === 'safari' ? (B.parts ? B.parts.reduce((a, p) => a + Math.max(0, p.hp), 0) / 22 : 0) : Math.max(0, B.hp) / B.max);
      if (B && hp > 0) { const w = Math.min(160, W - 80), x = Math.round((W - w) / 2), y = H - 14; px.rect(g, x - 1, y - 1, w + 2, 6, '#100818'); px.rect(g, x, y, Math.round(w * hp), 4, '#ff4a4a'); txt(E.t('blaster.boss'), W / 2, y - lh - 2, '#ffd0d0', { align: 'center' }); }
      if (R.phase === 'intro') txt(E.t('blaster.stage.' + R.name), W / 2, Math.round(H * .3), '#ffffff', { align: 'center', scale: 2 });
      if (R.phase === 'clear' && mode === 'play') txt(E.t('blaster.clear'), W / 2, Math.round(H * .3), '#ffe890', { align: 'center', scale: 2 });
      if (R.phase === 'over' || mode === 'results') txt(E.t(R.won ? 'blaster.won' : 'blaster.over'), W / 2, Math.round(H * .26), R.won ? '#ffe890' : '#ff8080', { align: 'center', scale: 2 });
      if (mode === 'results') { txt(E.t('blaster.final', { n: R.score }), W / 2, Math.round(H * .26) + lh * 2 + 4, '#ffffff', { align: 'center' }); txt(E.t('blaster.best', { n: R.best }), W / 2, Math.round(H * .26) + lh * 3 + 6, '#c8b8f0', { align: 'center' }); }
    });
    if (mode === 'results') { after.y = Math.round(H / 2) + 30; after.draw(r); }
  }
  const HERO_ICON = (g, x, y) => { px.rect(g, x + 2, y, 4, 4, '#ffd040'); px.rect(g, x + 1, y + 4, 6, 5, '#e83a30'); px.rect(g, x + 1, y + 9, 2, 3, '#2a3a8a'); px.rect(g, x + 5, y + 9, 2, 3, '#2a3a8a'); };

  /** the bot (tools/kits-test.mjs): each stage played alone by the autopilot to its boss's fall (the hits it takes
   *  counted; the bot plays on through them; the zone's pods shot down and mines run into too), then the zone again with
   *  the craft left alone, straight down the middle at its height: the mines on its line hit it (still) */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s);
    try {
      game.go('blaster', null, { fade: 0 }); game.advance(1 / 120); const out = {};
      for (let i = 0; i < STAGES.length; i++) { auto = true; begin(i, true); let n = 0; for (; n < 150 && mode === 'play'; n++) game.advance(1); out[STAGES[i]] = Object.assign({ cleared: !!R.won, score: R.score, hits: R.hits, seconds: n }, R.name === 'zone' && { pods: R.pods, mines: R.mines }); toMenu(); }
      auto = true; begin(STAGES.indexOf('zone'), true); R.still = true; for (let n = 0; n < 150 && mode === 'play'; n++) game.advance(1); out.zone.still = R.mines; toMenu();
      return Object.assign(out, { errors: game.errors.length });
    } finally { Math.random = was; auto = false; }
  }

  return { view: 'topdown', views: ['topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['missile', 'roll'], camera: { zoom: false },
    enter(d) { mode = 'menu'; R = null; menu.i = 0; auto = false; game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false; A.music('title'); if (d && d.part) begin(Math.max(0, STAGES.indexOf(d.part)), true); },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'results') { toMenu(); return true; } return false; },
    update, draw, bot,
    /** a stage played by the autopilot (a demo; the bot's) */
    demo(stage) { begin(Math.max(0, STAGES.indexOf(stage)), true); auto = true; },
    /** the safari's foes on the screen as the last frame drew them, each where a tap would hit it (no rock or nearer box
     *  over it), nearest first: [{ i (its place in the stage's foes), kind, x, y (its box's middle), w (its width), all in
     *  game pixels, d (how far it is from the camera) }] (the phone test taps one) */
    sights() {
      if (!R || R.name !== 'safari') return [];
      const cam = STAGE.safari.cam(), V = VP.vale.begin({ W: game.W, H: game.H }, cam), all = targets();
      return all.filter(q => q.target && q.target.hp > 0).map(q => { const p = V.project(q.x, q.y, q.z); return p && { i: R.foes.indexOf(q.target), kind: q.target.kind, x: p[0], y: p[1] - q.h * p[2] / 2, w: q.w * p[2], d: Math.hypot(q.x - cam.x, q.y - cam.y) }; })
        .filter(o => o && o.x > 0 && o.x < game.W && o.y > 0 && o.y < game.H && (V.pick(o.x, o.y, all) || {}).target === R.foes[o.i]).sort((a, b) => a.d - b.d);
    },
    state: () => R && { mode, stage: R.name, phase: R.phase, t: +R.t.toFixed(2), score: R.score, lives: R.lives, hits: R.hits, foes: R.foes.length, shots: R.shots.length, fired: R.fired,
      hero: R.name === 'harrier' ? [Math.round(R.hx), Math.round(R.hz)] : R.name === 'burner' ? [Math.round(R.j.x), Math.round(R.j.y), Math.round(R.j.z), +R.j.roll.toFixed(3)] : R.name === 'zone' ? [Math.round(R.s), Math.round(R.u), Math.round(R.zh)] : R.name === 'speeder' ? [Math.round(R.v.x), Math.round(R.v.y), +R.v.yaw.toFixed(3)] : R.name === 'blade' ? [Math.round(R.hx), Math.round(R.F + R.dy), Math.round(R.hz)] : [Math.round(R.s), Math.round(R.cur[0]), Math.round(R.cur[1])], boss: R.boss ? (R.boss.hp !== undefined ? R.boss.hp : R.boss.parts.map(p => p.hp)) : null },
    /** the proof: the harrier stage, flying up and right, firing, then down and left */
    run: (n = 600) => proof('blaster', n, (i, k) => {
      if (i === 2) begin(0, true);
      if (i === 60) { k.hold('fire'); k.hold('right'); k.hold('up'); }
      if (i === 300) { k.up('right'); k.up('up'); k.hold('left'); k.hold('down'); }
      if (i === 500) { k.up('left'); k.up('down'); k.up('fire'); }
    }, () => R && [R.hx, R.hz, R.F, R.score, R.foes.length, R.shots.length, R.hits]) };
})();
scenes.blaster = BLASTER;

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
