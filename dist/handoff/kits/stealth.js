// The STEALTH kit's game (third-person stealth and parkour: a rooftop district at dusk, guards with sight and suspicion, climbing, takedowns, an HTML HUD; Assassin's Creed, Metal Gear), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 159 (src/starter/70-stealth.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. stealth.html plays it; node kits/test.mjs stealth runs it headless.
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
 * SLICE 7  STEALTH  (Assassin's Creed, Metal Gear, Tenchu). A rooftop district at dusk: steal the ledger from the brick
 * roof and slip out by the east gate. Three guards (one on a roof) patrol with sight cones; what they see makes them
 * notice (?), search the last place they saw you, and at last chase (!) across the roofs. Hide in tall grass while
 * crouched, take a guard down silently from behind (J), or from a roof above (J as you stand over them). In a fight their
 * swings are telegraphed: K just before the blow parries and stuns them.
 * Keys (E.Input.THIRDPERSON): WASD move, Shift sprint, Space jump, climb a wall, vault, leap a gap, C crouch, J attack or
 * take down, K block or parry, L dodge roll, V view. The ledger is a checkpoint. The hero climbs any wall: Space at a
 * face latches on, the stick climbs (up the screen is up the wall), Space leaps up, C lets go. TOUCH: the stick, JUMP,
 * ATTACK, BLOCK, CROUCH.
 * HOW IT WORKS: the hero and the guards are E.Mover bodies (the same climbing, vaulting and gap-leaping for both); a
 * guard's eyes are E.sees through the map's heights, its mind an E.Suspicion, its legs a FlowField that climbs, drops and
 * jumps. Climbs, vaults, rolls and takedowns are E.ACTIONS; the facades are wall-type options; the belfry's canopy sorts by
 * its footprint; r.sightCone and r.marker draw the cones and the objective. Dusk is canvas lighting (game.lights): an
 * ambient and the lights added each draw (street lamps, the ledger's glow, the gate), on a computer: its pass costs a
 * few milliseconds a frame, so a phone keeps its frame rate and an unlit street.
 * The interface is HTML, E.Shell's: the objective with its distance, health, status, the takedown prompt, toasts and
 * the results; the guards' marks stay in the world. The music is one song in layers (game.audio.layer): it sneaks on
 * three tracks, and a guard's alert brings in the chase's drums and its saw over them, taken out again when they lose
 * you: no cut to another song.
 * ===================================================================================== */
const STEALTH = (() => {
  const T = 16, HP = 3;
  // SHADOWS ON THE ROOFS: the sneaking bass, ticks and lead; 'chase' and 'alarm' start silent (on: false)
  const SONG = { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'A2 . . A2 . . A2 . | A2 . . A2 . C3 . . | F2 . . F2 . . F2 . | G2 . . G2 . E2 . .' },
    { name: 'tick', wave: 'drums', vol: .06, notes: 'h . . h . . h . h . . h . . h .' },
    { name: 'lead', wave: 'pulse12', vol: .07, notes: 'E5 - . . . . D5 . | C5 - . . B4 . A4 . | . . . . F5 - E5 . | D5 - . . E5 - . . | E5 - . . . . G5 . | F5 - . . E5 . D5 . | C5 - . . D5 - . . | B4 - - - . . . .' },
    { name: 'chase', wave: 'drums', vol: .13, on: false, notes: 'k . h k s . h . k k h . s . h s' },
    { name: 'alarm', wave: 'saw', vol: .06, on: false, notes: 'A3 A3 A4 A3 E4 A3 G4 A3 | A3 A3 A4 A3 C5 A3 B4 A3 | F3 F3 F4 F3 C4 F3 E4 F3 | G3 G3 G4 G3 D4 G3 B3 G3' }] };
  const PAVE = { stones: ['#7a6a60', '#726258', '#806e64'].map(E.hex), mortar: E.hex('#3e3236'), hi: E.hex('#8e7e72'), lo: E.hex('#56484a'), speck: E.hex('#66564e') };   // warm cobbles against the cool stone walls
  /* ---- THE DISTRICT: roofs 24-56 high a jump apart (3-4 cells), a belfry, tall grass (,) and a planter (p) ---- */
  const map = new E.TileMap({ rows: [
    '############################',
    '#.......................,,,#',
    '#.AAAA...BBBBB....CCCC...,,#',
    '#.AAAA...BBBBB....CCCC.....#',
    '#.AAAA...BBBBB....CCCC..TT.#',
    '#.AAAA...BBBBB....CCCC..TT.#',
    '#.........................,#',
    '#..,,,.......p.......,,,..,#',
    '#..,,,...............,,,...#',
    '#.DDDD..EEE....FFFFF.......#',
    '#.DDDD..EEE....FFFFF..GGG..#',
    '#.DDDD..EEE....FFFFF..GGG..#',
    '#.@.......................X#',
    '############################'],
    legend: { '#': 1, A: 2, B: 3, C: 4, D: 5, E: 6, F: 7, G: 8, T: 9, p: 10, ',': { floor: 'grass' }, '@': 'hero', X: 'exit' },
    types: {
      1: { h: 64, top: '#3a3448', side: '#5a5068', face: 'stone', roof: 'plain', cut: true, cutH: 6 },   // the city wall drops low on the camera's side
      2: { h: 40, top: '#8a4a3a', side: '#c8b89a', face: 'plaster', roof: 'tiles', windows: { lit: .3 }, shutters: '#2a5a8a', door: { chance: .4 } },
      3: { h: 48, top: '#5a4a3a', side: '#9a6a4a', face: 'brick', roof: 'slab', windows: { lit: .2 }, balcony: { z: 30, color: '#3a2a1e' } },
      4: { h: 40, top: '#4a6a3a', side: '#b8a888', face: 'timber', roof: 'tiles', arch: { chance: .5 }, windows: true },
      5: { h: 24, top: '#7a4a32', side: '#d0c0a0', face: 'plaster', roof: 'tiles', door: { chance: .5, color: '#5a2a1a' }, windows: { from: 12, lit: .4 } },
      6: { h: 48, top: '#6a5a6a', side: '#7a7a8a', face: 'stone', roof: 'plain', windows: { w: 4, h: 12, lit: .15 } },
      7: { h: 40, top: '#8a5a3a', side: '#c8a888', face: 'plaster', roof: 'tiles', windows: true, shutters: '#6a3a2a', balcony: { z: 24 } },
      8: { h: 24, top: '#4a6a3a', side: '#a89878', face: 'timber', roof: 'tiles', arch: { chance: .6 } },
      9: { h: 72, top: '#7a6a5a', side: '#a89878', face: 'sandstone', roof: 'plain', windows: { w: 3, h: 10, step: 22, lit: .5 } },   // the belfry: face, a MATERIAL (docs/ASSETS.md)
      10: { h: 10, top: '#3e7a3a', side: '#5a4a32', face: 'plank', roof: 'leaves' } },
    floorTex: (x, y, tag) => tag === 'grass' ? E.tex.grass(x, y, { base: '#3e6a32', dark: '#2a5226', light: '#5a8a42' }) : E.tex.flagstone(x, y, PAVE)
  });
  const LEDGER = { x: 11.5 * T, y: 3.5 * T, z: 48 }, EXIT = map.find('exit'), GRASS = [];
  // set dressing: SHAPES (E.SHAPES, docs/ASSETS.md: objects as data, right in every view) along the north street, out of the patrols' way
  const DRESS = [['barrel', 1.5 * T, 1.4 * T, { facing: .4 }], ['barrel', 2.5 * T, 1.3 * T, { facing: 2 }], ['crate', 7.4 * T, 1.4 * T, { scale: .8, facing: .2 }],
    ['cart', 15.5 * T, 1.5 * T, { facing: 0 }], ['sack', 16.9 * T, 1.3 * T, { facing: 1 }], ['barrel', 22.6 * T, 1.4 * T, { facing: 3 }],
    // stacked planks from the asset store, cut into the page's 'stealth' set (src/assets/sets/stealth.js; none without it)
    ...(E.addAssets((window.ASSETS || {}).stealth || { set: 'stealth' }).shapes.length ? [['stealth:resource-planks', 12.2 * T, 1.4 * T, { scale: .7, facing: Math.PI / 2 + .1 }]] : [])];
  for (let cy = 0; cy < map.h; cy++) for (let cx = 0; cx < map.w; cx++) if (map.floorAt((cx + .5) * T, (cy + .5) * T) === 'grass') GRASS.push([(cx + .5) * T, (cy + .5) * T]);
  const BOOK = E.sprite(['.bbbb.', 'bBBBBb', 'bBwwBb', 'bBBBBb', '.bbbb.'], { b: '#3a2010', B: '#8a3a20', w: '#f0e0b0' });
  const ROUTES = [   // [start, ...patrol points] in cells, and the guard's roof height
    [[19.5, 3.5, 40], [21.5, 3.5, 40], [21.5, 5.5, 40], [18.5, 5.5, 40]],
    [[6.5, 6.5, 0], [20.5, 6.5, 0], [20.5, 8.5, 0], [6.5, 8.5, 0]],
    [[11.5, 12.2, 0], [20.5, 12.2, 0], [20.5, 8.2, 0], [11.5, 8.2, 0]]
  ];
  let hero, rig, guards, attack, checkpoint, ledger, won, over, hp, hurtT, alertT, ui = null;
  const say = (title, text) => ui.toast(title, text, 3);
  const inGrass = b => b.z < 2 && map.floorAt(b.x, b.y) === 'grass';

  /* ---- GUARDS: a Mover with patrol points, eyes, a mind and a flow field that climbs, drops and jumps ---- */
  function makeGuard(route, i) {
    const [x, y, z] = route[0];
    const g = new E.Mover({ x: x * T, y: y * T, z, r: 5, run: 70, walk: 30, climbMax: 56, hopMax: 56 });
    Object.assign(g, { i, route: route.map(p => [p[0] * T, p[1] * T]), at: 1, mind: new E.Suspicion({ rise: 1.6, decay: .25, forget: 7 }), hp: 2, stun: 0, dead: false,
      flow: new E.FlowField(map, { climb: 56, drop: 56, jump: 60 }), wait: 0, hit: null, swing: new E.Attack('overhead', { wind: .38, recover: .3, reach: 9 }), bark: 0,
      rig: new E.Humanoid({ size: 1.2, build: 'heroic', hat: 'helmet', armor: true, weapon: 'sword', colors: { cloth: ['#8a3a32', '#6a3a5a', '#7a4a2a'][i], metal: '#c8c8d8' } }) });
    return g;
  }
  function guardUpdate(g, dt) {
    if (g.dead) return;   // (a takedown moves the body it takes: the hero's action plays it)
    if (g.stun > 0) { g.stun -= dt; g.update(dt, map, { move: [0, 0] }); return; }
    const seen = hero && !over ? E.sees(g, hero, { map, range: 110, fov: 1.5 }) : { seen: false, exposure: 0 }, st = g.mind.update(dt, seen, hero);
    if (g.mind.changed && st === 'alert') { A.sfx('select'); g.bark = 1.2; }
    let goal = null, speed = 'walk';
    if (st === 'alert') { goal = hero; speed = 'run'; }
    else if (st === 'search' && g.mind.last) goal = g.mind.last;
    else if (st === 'notice') { g.facing = E.approachAng(g.facing, Math.atan2(g.mind.last.y - g.y, g.mind.last.x - g.x), dt * 3); g.update(dt, map, { move: [0, 0] }); return; }
    else { const p = g.route[g.at]; goal = { x: p[0], y: p[1], z: 0 }; if (Math.hypot(p[0] - g.x, p[1] - g.y) < 8) { g.at = (g.at + 1) % g.route.length; g.wait = .8; } }
    if (g.wait > 0 && st === 'calm') { g.wait -= dt; g.update(dt, map, { move: [0, 0] }); return; }
    // in reach of the hero: a telegraphed swing (a long wind-up), else walk the field toward the goal
    const d = Math.hypot(hero.x - g.x, hero.y - g.y), near = st === 'alert' && d < 20 && E.sameLevel(g, hero, 10);
    if (near && !g.swing.busy && !hero.action) { g.facing = Math.atan2(hero.y - g.y, hero.x - g.x); g.swing.start(); A.sfx('swing', { vol: .5 }); }
    const began = g.swing.update(dt);
    if (g.swing.busy) { g.update(dt, map, { move: [0, 0] }); if (g.swing.active && began === 'active') strikeHero(g); return; }
    let move = [0, 0], jump = false;
    if (goal) {
      g.flow.update(goal.x, goal.y);
      const nx = g.flow.next(g.x, g.y), tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - g.x, ty - g.y) || 1;
      if (Math.hypot(goal.x - g.x, goal.y - g.y) > 6) move = [(tx - g.x) / l, (ty - g.y) / l];
      if (nx && g.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < g.r + 4) { jump = true; g.facing = Math.atan2(ty - g.y, tx - g.x); }
    }
    if (speed === 'walk') move = move.map(v => v * .5);
    g.update(dt, map, { move, sprint: false, jumpPressed: jump });
  }
  function strikeHero(g) {
    if (!E.inArc(g, g.facing, hero, 20, 1.2, 10) || (hero.action && hero.action.invulnerable)) return;
    if (game.input.down('block') && !hero.action) { A.sfx('hit', { vol: .4 }); P.sparks(hero.x, hero.y, hero.z + 16, 6, g.facing + Math.PI); return; }
    hp--; hurtT = .4; game.hitFx(hero.x, hero.y, hero.z + 16, { power: 1, angle: g.facing, sound: 'hurt' }); E.knockback(g, hero, 140);
    if (hp <= 0) lose();
  }

  /* ---- THE HERO: a Mover, a hidden blade, a parry, two takedowns ---- */
  function start() {
    const s = map.find('hero');
    hero = new E.Mover({ x: s.x, y: s.y, r: 5, climbAny: true, climbMax: 30 }); hero.facing = 0;   // (walls up to 30 are pulled up at once, higher ones climbed)
    rig = rig || new E.Humanoid({ size: 1.2, build: 'heroic', hood: true, weapon: 'sword', bladeLen: 7, outfit: 'coat', sleeves: 'long', cape: { len: 6, width: 5, seg: 2.4 }, colors: { cloth: '#d8d2c4', coat: '#d8d2c4', cape: '#8a2a2a', capeIn: '#5a1a1a', pants: '#3a3448', metal: '#e8e8f0' } });
    attack = new E.Attack('slash', { reach: 9 }); guards = ROUTES.map(makeGuard);
    ui = ui || new E.Shell(game, { theme: { accent: '#e8c070' } });   // (made once: it takes over from the engine's own, keeping the pause menu)
    checkpoint = null; ledger = false; won = false; over = false; hp = HP; hurtT = 0; alertT = 0; say('Steal the ledger', 'It lies on the brick roof');
    game.follow(hero, { z: 18 }); game.cam.bounds = v => map.bounds(v); game.cam.offset = [0, -10]; L.enabled = !!(window.matchMedia && matchMedia('(pointer: fine)').matches); L.ambient = .6; A.music(SONG); A.layer('chase', 0, .02); A.layer('alarm', 0, .02);
  }
  function respawnAt(cp) {
    Object.assign(hero, { x: cp.x, y: cp.y, z: cp.z, vx: 0, vy: 0, vz: 0, onGround: true, action: null }); hp = HP;
    guards.forEach((g, i) => { if (!g.dead) { const [x, y, z] = ROUTES[i][0]; Object.assign(g, { x: x * T, y: y * T, z, vx: 0, vy: 0, vz: 0, at: 1, stun: 0, action: null }); g.mind.reset(); g.swing.cancel(); } });
    game.cam.snap = true; say('Back at the checkpoint');
  }
  function lose() { if (checkpoint) { A.sfx('die'); respawnAt(checkpoint); } else { over = true; game.after(.8, () => game.go('over', { from: 'stealth' })); } }
  // a takedown within reach: [guard, from above] or null
  function takedown() {
    for (const g of guards) {
      if (g.dead || g.action) continue;
      const dz = hero.z - g.z, d = Math.hypot(g.x - hero.x, g.y - hero.y);
      // from above: the hero stands over a guard below, close enough to drop onto them
      if (dz > 14 && d < 44 && hero.onGround) return [g, true];
      // from behind: close, on the same level, outside the guard's view and not yet hunting
      const behind = Math.abs(E.angDiff(g.facing, Math.atan2(g.y - hero.y, g.x - hero.x))) < 1.1;
      if (E.sameLevel(hero, g) && d < 18 && behind && g.mind.state !== 'alert') return [g, false];
    }
    return null;
  }
  function tryTakedown() { const t = takedown(); if (!t) return false; hero.play('takedown', { other: t[0], aerial: t[1], map }); return finishGuard(t[0], hero.action); }
  const parrying = () => guards.some(g => !g.dead && g.swing.phase === 'wind' && g.swing.u > .35 && Math.hypot(g.x - hero.x, g.y - hero.y) < 26);
  function finishGuard(g, act) { g.dead = true; g.action = act; A.sfx('punch'); game.freeze(.06); return true; }
  function heroUpdate(dt) {
    const I = game.input;
    hero.exposure = inGrass(hero) && hero.crouch ? 0 : 1;   // crouched in tall grass: unseen
    if (!hero.action) {
      if (I.pressed('dodge') && hero.dodge(undefined, 34)) A.sfx('whoosh');
      else if (I.pressed('attack') && !tryTakedown() && attack.start()) { I.consume('attack'); A.sfx('swing'); }
    }
    attack.update(dt);
    attack.hits(guards.filter(g => !g.dead), g => E.inArc(hero, hero.facing, g, 20, 1.3, 10), g => {
      game.hitFx(g.x, g.y, g.z + 16, { power: g.stun > 0 ? 2 : 1, angle: hero.facing }); E.knockback(hero, g, 90);
      if (g.stun > 0 || --g.hp <= 0) { g.dead = true; g.action = null; A.sfx('die', { vol: .5 }); } else g.mind.level = 1.2;
    });
    // a parry: block in the last moments of a guard's wind-up
    // CONTEXT touch buttons: ATTACK says TAKE DOWN when one is in reach, BLOCK says PARRY in a guard's wind-up
    I.touchSet('attack', !hero.action && takedown() ? 'TAKE DOWN' : null); I.touchSet('block', parrying() ? 'PARRY' : null);
    if (I.pressed('block')) for (const g of guards) if (!g.dead && g.swing.phase === 'wind' && g.swing.u > .35 && Math.hypot(g.x - hero.x, g.y - hero.y) < 26) {
      g.swing.cancel(); g.stun = 1.3; A.sfx('kick'); game.flash('#ffffff', .08); P.sparks(g.x, g.y, g.z + 18, 10, hero.facing); say('Parried');
    }
    hero.update(dt, map, attack.busy ? { move: [0, 0] } : I);
    if (hero.hurt) { hp--; hurtT = .4; game.shake(3); if (hp <= 0) lose(); }
    if (hero.inHazard) hero.respawn();
    if (!ledger && E.dist(hero, LEDGER) < 12) { ledger = true; checkpoint = { x: hero.x, y: hero.y, z: hero.z }; A.sfx('powerup'); say('Checkpoint', 'The ledger is yours: now the east gate'); }
    if (ledger && !won && Math.hypot(hero.x - EXIT.x, hero.y - EXIT.y) < 14 && hero.z < 2) { won = true; A.music('victory'); results(); }
  }

  function results() {
    const alive = guards.filter(g => !g.dead).length, top = best('stealth', alive);
    ui.show('results', { kicker: 'Mission complete', title: 'The ledger is out', stats: [[String(alive), 'guards who never fell'], [String(top), 'the best yet'], [String(HP - hp), 'wounds taken']],
      actions: [{ label: 'Back to the title', primary: true, fn: () => { ui.hide(); game.go('title'); } }] });
  }
  // the HUD, from this step's state: E.Shell redraws only what changed (keys hide by themselves on a touch screen)
  function hud() {
    const k = a => game.input.label(a).toUpperCase(), pad = game.input.lastDevice === 'gamepad', td = !hero.action && takedown();
    ui.hud(won || over ? {} : {
      objective: ledger ? { step: '02 / 02', title: 'Slip out by the east gate', text: 'Down in the street, at the far end', at: { x: EXIT.x, y: EXIT.y, z: 0 }, from: hero }
        : { step: '01 / 02', title: 'Steal the ledger', text: 'On the brick roof', at: LEDGER, from: hero },
      status: hero.exposure === 0 ? { text: 'Hidden', color: '#9ae89a' } : alertT > 0 ? { text: 'Hunted', color: '#ff4a3a' } : hero.crouch ? 'Crouched' : null,
      bars: [{ label: 'Health', value: hp, max: HP, kind: 'pips', color: '#e8505a' }], counts: [['Guards down', guards.filter(g => g.dead).length]],
      prompt: touch() ? null : td ? { act: 'attack', label: 'Take down', hint: td[1] ? 'From above' : 'From behind' } : parrying() ? { act: 'block', label: 'Parry' } : null,
      keys: [[pad ? 'STICK' : ['up', 'left', 'down', 'right'].map(k).join(''), 'Move'], [k('sprint'), 'Sprint'], [k('jump'), 'Jump, climb'], [k('crouch'), 'Crouch'], [k('attack'), 'Strike'], [k('block'), 'Block'], [k('dodge'), 'Roll']]
    });
  }

  function update(dt) {
    if (hurtT > 0) hurtT -= dt;
    if (won || over) { hud(); rig.update(dt, hero.rigState({ pose: won ? 'cheer' : null })); return; }
    heroUpdate(dt);
    for (const g of guards) guardUpdate(g, dt);
    const alert = guards.some(g => !g.dead && g.mind.state === 'alert');
    if (alert !== alertT > 0) { alertT = alert ? 1 : 0; A.layer('chase', alert ? 1 : 0, alert ? .4 : 2.5); A.layer('alarm', alert ? 1 : 0, alert ? .8 : 2.5); }   // (the chase comes in by layers, and fades out)
    rig.update(dt, hero.rigState({ attack: attack.state, pose: game.input.down('block') && !hero.action ? 'block' : null, hurt: hurtT > 0 }));
    for (const g of guards) {
      if (g.dead) { g.rig.update(dt, g.action && g.action.other === g ? g.action.otherState() : { x: g.x, y: g.y, z: g.z, facing: g.facing, down: 1 }); continue; }
      g.rig.update(dt, g.rigState({ attack: g.swing.state, stance: g.mind.state === 'alert' ? 'ready' : null, hurt: g.stun > 0 }));
      if (g.bark > 0) g.bark -= dt;
    }
    hud();
  }

  const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
  const LAMPS = [[8.5, 6.2], [16, 8.8], [23.5, 6.2], [12.5, 10.5], [19.5, 1.3]].map(([x, y]) => [x * T, y * T]);   // street lamps, clear of the patrols
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);   // (the street runs on past the walls to the screen's edges: map.outside)
    for (const [x, y] of GRASS) r.prop('grass', x, y, 0, { size: 1.3 });
    for (const [id, x, y, o] of DRESS) r.shape(id, x, y, 0, o);
    for (const [x, y] of LAMPS) r.prop('lamp', x, y, 0, { light: true });   // each glows and lights the street (game.lights)
    if (!ledger) L.add(LEDGER.x, LEDGER.y, LEDGER.z + 6, 40, .8, { color: '#ffd060' }); else L.add(EXIT.x, EXIT.y, 12, 56, .9, { color: '#80e0ff' });
    // the belfry: a canopy wider than the tower, sorted by its whole footprint (over every tower block)
    const bx = 25 * T, by = 5 * T, w = 21, H = 20, z = 72;
    r.queue(bx, by, z, g => { const P2 = (x, y, zz) => r.w(x, y, zz), c = [P2(bx - w, by - w, z), P2(bx + w, by - w, z), P2(bx + w, by + w, z), P2(bx - w, by + w, z)], tip = P2(bx, by, z + H);
      for (let i = 0; i < 4; i++) px.poly(g, [c[i], c[(i + 1) % 4], tip], ['#7a3a2a', '#9a4a32', '#6a2a22', '#8a4232'][i]);
      px.line(g, tip[0], tip[1], tip[0], tip[1] - 6, '#e8c860'); }, { footprint: [bx - w, by - w, bx + w, by + w] });
    for (const g of guards) if (!g.dead) r.sightCone(g, { map, range: 110, fov: 1.5, color: MOOD[g.mind.state], alpha: g.mind.state === 'calm' ? .22 : .38 });
    if (!ledger) r.sprite(LEDGER.x, LEDGER.y, LEDGER.z + 4 + Math.sin(game.time * 3) * 1.5, BOOK, { glow: .6 });
    const shadow = b => r.shadow(b.x, b.y, 6, .35, undefined, map.groundAt(b.x, b.y, b.r, b.z));
    shadow(hero); r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: { actors: true }, flash: hurtT > 0, alpha: hero.exposure === 0 ? .55 : 1 });
    for (const g of guards) { shadow(g); r.actor(g.x, g.y, g.z, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), { flash: g.stun > 0 && Math.floor(game.time * 10) % 2 === 0 }); }
    r.marker(ledger ? EXIT.x : LEDGER.x, ledger ? EXIT.y : LEDGER.y, ledger ? 0 : LEDGER.z, { label: ledger ? 'EAST GATE' : 'LEDGER', color: ledger ? '#80e0ff' : '#ffd040' });
    r.overlay(g => {
      for (const gd of guards) if (!gd.dead && gd.mind.state !== 'calm') {   // ? and ! over their heads, with the meter
        const [sx, sy] = r.w(gd.x, gd.y, gd.z + 46), a = gd.mind.state === 'alert';
        E.font.text(g, a ? '!' : '?', Math.round(sx), Math.round(sy) - 8, MOOD[gd.mind.state], { align: 'center', shadow: '#000' });
        E.ui.bar(g, Math.round(sx) - 6, Math.round(sy) + 2, 12, 2, Math.min(1, gd.mind.level), MOOD[gd.mind.state]);
      }
    });
  }
  return { view: 'iso', views: ['iso', 'threequarter'], input: 'THIRDPERSON', res: 'ps1', pausable: true, touch: ['jump', 'attack', 'block', 'crouch'],
    camera: { zoom: [.75, 2], rotate: true }, enter: start, update, draw,
    state: () => ({ hero, guards, map, ledger, won, hp }),   // for tests
    /** the proof: over the rooftops, jumping, swinging and crouching, the guards on their rounds; a hash of the run */
    run: (n = 600) => proof('stealth', n, (i, k) => { walk(i, k, ['right', 'down', 'left', 'up'], 100); if (i % 130 === 60) k.tap('jump'); if (i % 90 === 45) k.tap('attack'); if (i === 400) k.tap('crouch'); },
      () => [hero.x, hero.y, hero.z, hp, ledger, won, guards.map(g => [g.x, g.y, g.z, g.hp, g.dead])]),
    exit() { game.cam.offset = null; L.enabled = false; if (ui) ui.hud({}); } };
})();
scenes.stealth = STEALTH;

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
