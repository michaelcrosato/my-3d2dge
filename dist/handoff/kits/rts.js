// The RTS kit's game (real-time strategy: workers, gold, a barracks and a stable, three kinds to fight, fog, an enemy camp that builds and attacks in waves), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 159 (src/starter/48-rts.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. rts.html plays it; node kits/test.mjs rts runs it headless.
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
 * SLICE 16  RTS  (Dune II, Warcraft II, Command & Conquer, StarCraft). @modules grid strategy
 * THE VALE WAR: the Vale's hall stands south-west of a river; the Ash Clan's camp across it, north-east, behind two of
 * its three fords. Workers mine gold and carry it to the hall; the hall makes workers, a BARRACKS footmen and archers, a
 * STABLE knights (workers build both). The clan builds its own and sends its army across in waves, bigger each time.
 * Win: every clan building falls. Lose: every one of yours does. Fog hides what your people don't see; walls of rock
 * block sight, a building once seen stays on the map.
 * The mouse: a click selects, a drag draws a box, Shift adds, a double click takes every one of that kind on screen, a
 * right click orders (move, attack, mine; a building's rally point), the wheel zooms toward the pointer, the screen's
 * edge pans. Keys: arrows / WASD pan, Z X C the panel's commands, H the hall, R the army, Space the last alert, Ctrl+1..9
 * keeps a group and 1..9 calls it back, F then a click attack-moves. TOUCH: a tap selects, a tap on ground or a foe
 * orders, a drag pans, a long press then a drag draws a box, two fingers zoom; the panel's buttons are a thumb's size,
 * HALL and ARMY on the left; BUILD shows the plan where you tap, PLACE puts it there.
 * HOW IT WORKS: the strategy module keeps the rules (E.Strategy: kinds as data, orders, flow fields, fog, the clan's AI
 * from its build order and waves); this slice draws (rigs, buildings as E.SHAPES, the fog), runs the HUD and its
 * commands, and the minimap (E.Shell). bot() gives the Vale an AI of its own that plays the match to its end, twice the
 * same (tools/kits-test.mjs). Deep link: #rts.
 * ===================================================================================== */
const RTS = (() => {
  const T = 16, POP = 40, BLUE = '#3a6ad0', RED = '#c03a3a';
  // the war drums: D minor, a march under a horn
  const SONG = { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse25', vol: .1, notes: 'D4 - - - F4 - A4 - G4 - F4 - E4 - - - | D4 - - - F4 - A4 - C5 - A4 - G4 - - - | Bb4 - A4 - G4 - F4 - E4 - F4 - G4 - - - | A4 - - - G4 - E4 - D4 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'D2 . D2 . A2 . D2 . | D2 . D2 . A2 . D2 . | G2 . G2 . D3 . G2 . | A2 . A2 . E2 . A2 .' },
    { wave: 'drums', vol: .1, notes: 'k . . k s . . . k . k . s . h h' }] };
  // the Vale (B, its hall's corner: south-west) and the Ash Clan (R: north-east) across the river (~) and its fords (=);
  // gold ($, a mine's corner), rock (^: blocks sight), woods (T)
  const ROWS = [
    'TTTTTTTTT.TTTTT.TTTTT~~TTTTT.TT..TTTTTTTTTTT.TTTTTTTTTTT',
    'TT..TT...T.T...TTT..T~~.T.....TT.TT.TT..TT...TT.T....TTT',
    '.T...........TT.......~~...$...........................T',
    '............TTTTT......~~..............................T',
    'TT..........T..TT......~~................$.............T',
    'T...TTT,,,,.TTT.T.......~~............................T.',
    'TT...T,T,,,..T....,.....~~.............................T',
    'T..TTTT.T,.,....,,,,,....~~.....^^.........:::::.......T',
    'TTTTTTTTT.,.....,,,,,....~~....^...........:R:::......T.',
    'T.TTTTTTT,,....,,,,,,,...==.........::::::::::::......TT',
    '.T.TTTTT,.......,,,,,....==................:::::......TT',
    'T...TTT.........,,,,,....~~................:::::.......T',
    'TT.......................~~T.........TT...........$....T',
    'TT..........^...$.......T~~TT.......TT,...............TT',
    '.T........^^............T~~TT.......TTT...............TT',
    'T.......................T~~TT.......TT,...............TT',
    'T...,.^..................~~T.......,,TT...............TT',
    'TT,,,,^..................~~.........,,,,.,,,...........,',
    'T..,,,,..................~~..........,.,,,,,.,TT.....,TT',
    '.,,,,,,...............,.~~...........,,,,,.,TTT.T.....,,',
    '..,,..,.TTT.......^.,,,,~~.............,,,,,TTT.T....,TT',
    'T.,,,,,TTTTT.......^,,,,==...............,,,TTTT...,,,,T',
    'T...,..TTTTT.......,^.,,.==..............,,,,TT....,,,TT',
    '........TT.T......,,,,,,,==................,.......,,,,T',
    '........TTT........,,,,,,~~.........^^...............,TT',
    'T..................,,,,,,~~..........^.............,,,,T',
    'T...................,..,,.~~........................,,,T',
    'T.....................,...~~..........................T.',
    'TT................T........~~TTT...............TTT..,,,T',
    'T...$............TTT........~~TTT.............TTTTT,,,T,',
    '.................TTT........~~TTT......$......TTTTT,,,T,',
    'T................TT..........~~TT.........^.....TTT,,,,T',
    'TT.....:::::.....TT...........~~...........^^..TTT.,,,TT',
    '.T.....:B:::..................~~.....................,TT',
    '.......:::::::::::::...........==....................,TT',
    '.T.....:::::....................==.....TTT............TT',
    '.T.....:::::............^......,~~,...TTTT..............',
    'T................,......^.....,,,~~..TT.TTTT..........TT',
    '.............$...,.....^.....,,.,~~,.TTTTTT......TTT...T',
    '.................,,...........,,,,~~...TT.TT....TTT.T.TT',
    '.................,..............,,~~..TTTTT.......TTT..T',
    'T.........,,,.,.,,...........$..,.~~...TTT......T.TTT.T.',
    'T....TTT....,TT,TT....T..T.T....T.~~T.TT....TT....TT..TT',
    '.TT.TTTT.TTTTT.TTTTTTTTTTTTT....TT~~TTT..TT.TTTTTTTTTTTT'];
  const LEGEND = { '.': { floor: 'grass' }, ',': { floor: 'meadow' }, ':': { floor: 'dirt' }, '~': { floor: 'water', block: true }, '=': { floor: 'ford' }, '^': 1,
    T: { floor: 'grass', block: true, spawn: 'tree' }, '$': { floor: 'dirt', spawn: 'mine' }, B: { floor: 'dirt', spawn: 'blue' }, R: { floor: 'dirt', spawn: 'red' } };
  const FLOORS = { grass: 'grass', meadow: '#78a04a noise', dirt: '#8a7048 noise', water: '#3a6aa8 glaze', ford: '#a89868 speck' };
  const TYPES = { 1: { h: 18, top: '#8a8676', side: '#5e584c', face: 'rock', roof: 'rock' } };

  /* ---- 1. THE KINDS (the strategy module's data): three to fight and one to work; the hall, two to build, the mines.
   * look: the rig (its cloth the side's color); melee: a sword's swing; bow: an arrow flies ---- */
  const KINDS = {
    worker:   { name: 'WORKER', many: 'WORKERS', hp: 30, tall: 19, speed: 38, atk: 3, range: 8, rate: 1.2, sight: 5, cost: { gold: 50 }, time: 7, gather: 8, look: { size: .58, hat: 'cap', weapon: null, outfit: 'shirt', sleeves: 'short' }, team: 'hat' },
    footman:  { name: 'FOOTMAN', many: 'FOOTMEN', hp: 60, tall: 20, speed: 33, atk: 7, range: 9, rate: 1, sight: 6, cost: { gold: 70 }, time: 9, melee: true, look: { size: .64, hat: { style: 'helmet', color: '#a8a8b4' }, armor: true, weapon: 'sword' } },
    archer:   { name: 'ARCHER', many: 'ARCHERS', hp: 40, tall: 20, speed: 33, atk: 5, range: 52, rate: 1.4, sight: 7, cost: { gold: 80 }, time: 10, bow: true, look: { size: .62, hood: true, weapon: null, sleeves: 'long' } },
    knight:   { name: 'KNIGHT', many: 'KNIGHTS', hp: 120, tall: 23, speed: 46, atk: 11, range: 10, rate: 1.1, sight: 7, cost: { gold: 150 }, time: 13, melee: true, r: 6, look: { size: .72, build: 'heroic', hat: { style: 'helmet', color: '#d8d8e0' }, armor: true, weapon: 'sword', cape: { len: 5, width: 4, seg: 2.2 } } },
    hall:     { name: 'HALL', building: true, w: 3, h: 3, hp: 1800, depot: true, makes: ['worker'], sight: 7, shape: 'rts-hall' },
    barracks: { name: 'BARRACKS', building: true, w: 3, h: 3, hp: 700, makes: ['footman', 'archer'], cost: { gold: 150 }, time: 24, sight: 5, shape: 'rts-barracks' },
    stable:   { name: 'STABLE', building: true, w: 3, h: 3, hp: 600, makes: ['knight'], cost: { gold: 200 }, time: 28, sight: 5, shape: 'rts-stable' },
    mine:     { name: 'GOLD MINE', resource: 'gold', amount: 4000, w: 2, h: 2, shape: 'rts-mine' }
  };
  // the buildings, as E.SHAPES (team: the side's banners and trim)
  Object.assign(E.SHAPES, {
    'rts-hall': { about: 'a town hall: a stone footing, timber walls, a shingled gable, a banner over the door', mats: { team: BLUE + ' cloth' },
      parts: [['box','stone',[0,0,0],[44,40,5]], ['box','timber',[0,0,5],[40,36,14]], ['prism','shingle',[0,0,19],[[-20,0],[20,0],[0,15]],42,{axis:'x'}],
        ['box','walnut',[0,18.5,5],[8,1,10]], ['box','team',[0,18.6,12],[6,1,10]], ['box','stone',[13,-8,19],[5,5,18]], ['mirror','x',['box','team',[16,18.6,8],[3,1,9]]]] },
    'rts-barracks': { about: 'a barracks: a long stone hall, a flat roof with a parapet, banners, a rack of spears', mats: { team: BLUE + ' cloth' },
      parts: [['box','stone',[0,0,0],[44,34,16]], ['box','slate',[0,0,16],[46,36,2]], ['row',5,[9,0,0],['box','stone',[0,17,18],[4,2,3]]],
        ['box','walnut',[0,17.5,0],[9,1,11]], ['mirror','x',['box','team',[13,17.6,5],[5,1,10]]], ['row',3,[2.5,0,0],['cyl','oak',[-18,20,0],.6,16]]] },
    'rts-stable': { about: 'a stable: a plank barn, a shingled roof, a fenced pen, hay', mats: { team: BLUE + ' cloth' },
      parts: [['box','plank',[0,-4,0],[40,28,14]], ['prism','shingle',[0,-4,14],[[-16,0],[16,0],[0,11]],42,{axis:'x'}], ['box','walnut',[0,10.5,0],[10,1,11]],
        ['box','team',[0,10.6,11],[12,1,3]], ['row',5,[9,0,0],['box','oak',[0,19,0],[2,2,8]]], ['box','oak',[0,19,5],[38,1,1.5]], ['ball','straw',[14,14,3],4,{sz:.7}]] },
    'rts-mine': { about: 'a gold mine: a rocky mound, a timbered mouth, nuggets', mats: {},
      parts: [['rock','rock',[0,-2,0],15,{sz:.75,seed:4}], ['box','#1a140e none',[0,11,0],[9,3,9]], ['box','oak',[-5,12,0],[1.5,2,10]], ['box','oak',[5,12,0],[1.5,2,10]],
        ['box','oak',[0,12,9],[12,2,1.5]], ['ball','gold',[-9,10,1.5],2.2], ['ball','gold',[8,9,1.5],1.8], ['ball','gold',[-5,6,6],1.6]] },
    'rts-site': { about: 'a building going up: a plank floor, posts, a beam', mats: {},
      parts: [['box','plank',[0,0,0],[40,36,2]], ['mirror','xy',['box','oak',[18,16,2],[2,2,14]]], ['box','oak',[0,16,15],[38,2,1.5]], ['box','oak',[0,-16,15],[38,2,1.5]]] }
  });
  const HOTKEYS = ['cmd1', 'cmd2', 'cmd3'];
  // the Ash Clan's plan (the module's AI): workers, a barracks, footmen and archers; a stable, knights; more of each; the
  // waves: the first after four minutes, then every two and a half
  const CLAN = { build: [['worker', 6], ['barracks'], ['footman', 3], ['archer', 2], ['worker', 8], ['stable'], ['footman', 5], ['knight', 2], ['archer', 4], ['footman', 8], ['knight', 4]],
    waves: { first: 240, every: 150, min: 4 } };
  // the bot's plan for the Vale (tools/kits-test.mjs): the same build, sooner and bigger, and waves once it can win them
  const VALE = { build: [['worker', 8], ['barracks'], ['footman', 4], ['worker', 11], ['barracks', 2], ['archer', 4], ['stable'], ['footman', 10], ['knight', 4], ['archer', 7], ['knight', 6], ['footman', 14]],
    waves: { first: 300, every: 60, min: 12 } };

  let map = null, rts = null, ui = null, mode = 'play', placing = null, amoving = false, over = null, msg = null, banner = null, alert = null, auto = false;
  let stats = null, arrows = [], dying = [], ruins = [], wave = 0, idle = 0, hits = 0;
  const say = (s, c = '#fff2c4') => { msg = { s, c, t: 0 }; };
  const blueOf = kind => rts.of('blue', kind), mine = u => u && u.side === 'blue';
  const buildings = side => rts.units.filter(u => u.side === side && u.building);

  /* ---- 2. THE MATCH: a fresh map (buildings block its cells), the strategy module over it, the sides, the clan's AI ---- */
  function start(data) {
    auto = !!(data && data.auto);
    map = new E.TileMap({ rows: ROWS, legend: LEGEND, types: TYPES, floorMat: 'grass', floorMats: FLOORS, ao: 0, outside: false });
    rts = new E.Strategy(game, { map, kinds: KINDS, sides: { blue: { res: { gold: 400 } }, red: { res: { gold: 400 } } }, player: 'blue', on: {
      attack(u, t) {
        if (u.K.bow) arrows.push({ x: u.x, y: u.y, tx: t.x, ty: t.y, t: 0, d: Math.hypot(t.x - u.x, t.y - u.y) / 160 });
        if (u.K.melee || u.K.gather) u.swing = .45;
        if (rts.visible(t) && onScreen(t)) { if (++hits % 3 === 0) A.sfx(u.K.bow ? 'shoot' : 'hit'); }
        if (t.side === 'blue' && (!alert || game.time - alert.t > 8) && !auto) { alert = { x: t.x, y: t.y, t: game.time }; if (!onScreen(t)) { say(t.building ? 'YOUR ' + t.K.name + ' IS UNDER ATTACK' : 'YOUR PEOPLE ARE UNDER ATTACK', '#ff9a7a'); A.sfx('warp'); } }
      },
      death(u) {
        if (u.resource) { say('A GOLD MINE RUNS DRY', '#ffd860'); return; }
        stats[u.side === 'blue' ? 'lost' : 'killed']++;
        if (u.building) { ruins.push({ x: u.x, y: u.y, r: u.r }); if (rts.visible(u)) { game.particles.explosion(u.x, u.y, 12, 1.4); A.sfx('explode'); } }
        else if (u.rig) dying.push({ x: u.x, y: u.y, rig: u.rig, t: 0, side: u.side });
      },
      made(u, b) {
        u.rig = rigOf(u);
        if (u.K.gather && !b.rally) { const m = rts.units.filter(o => o.resource).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0]; if (m) rts.order([u], 'gather', m); }   // (a new worker goes to the nearest mine)
        if (u.side === 'blue') { stats.made++; if (!auto) A.sfx('blip'); }
      },
      built(b) { if (b.side === 'blue' && !auto) { say(b.K.name + ' IS BUILT', '#a8ffb0'); A.sfx('powerup'); } },
      gathered(u, n) { if (u.side === 'blue') stats.gold += n; },
      ordered() { A.sfx('select'); }
    } });
    rts.ai('red', CLAN);
    if (auto) rts.ai('blue', VALE);
    stats = { made: 0, lost: 0, killed: 0, gold: 0, t: 0 }; arrows = []; dying = []; ruins = []; wave = 0; over = null; msg = null; alert = null; placing = null; amoving = false; mode = 'play';
    for (const s of map.spawns) {
      if (s.tag === 'mine') rts.spawn('mine', null, (s.cx + 1) * T, (s.cy + 1) * T);
      if (s.tag === 'blue' || s.tag === 'red') {
        const hall = rts.spawn('hall', s.tag, (s.cx + 1.5) * T, (s.cy + 1.5) * T), dir = s.tag === 'blue' ? 1 : -1;
        for (let i = 0; i < 4; i++) rts.spawn('worker', s.tag, hall.x + (i - 1.5) * 12, hall.y + dir * 34);
        for (let i = 0; i < 2; i++) rts.spawn('footman', s.tag, hall.x + dir * 36, hall.y + (i - .5) * 14);
      }
    }
    for (const u of rts.units) if (!u.building && !u.resource) u.rig = rigOf(u);
    for (const side of ['blue', 'red']) { const h = buildings(side)[0], m = rts.units.filter(u => u.resource).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0]; rts.order(rts.of(side, 'worker'), 'gather', m); }   // (to work at once)
    const hall = buildings('blue')[0];
    game.cam.free = { bounds: [0, 0, map.w * T, map.h * T] }; game.focus(hall.x + 40, hall.y - 30); game.cam.snap = true;
    game.input.touchEnabled = false; L.enabled = false; A.music(SONG);
    ui = ui || new E.Shell(game, { theme: { accent: '#e8c070' } });   // (made once: the minimap; it keeps the pause menu)
    banner = { s: 'THE VALE WAR', t: 0, c: '#ffe070' }; say('BURN THE ASH CLAN\'S CAMP, ACROSS THE RIVER', '#ffe8b0');
  }
  const rigOf = u => new E.Humanoid(Object.assign({}, u.K.look, u.K.team === 'hat' ? { hat: { style: u.K.look.hat, color: u.side === 'blue' ? '#3a5ab0' : '#a02a2a' } } : {}, { colors: Object.assign({ cloth: u.side === 'blue' ? BLUE : RED, hair: u.side === 'blue' ? '#5a3a1a' : '#2a2020', cape: u.side === 'blue' ? '#2a4aa0' : '#8a2020', capeIn: '#3a2a2a', pants: '#4a4038' }, u.K.look.colors) }));
  // on the screen now (the camera's whole-pixel offset), with a margin: the rigs that move, the sounds that play
  const onScreen = (u, m = 40) => { const q = game.view.p(u.x, u.y, 0), x = q[0] - game.cam.x, y = q[1] - game.cam.y; return x > -m && y > -m && x < game.W + m && y < game.H + m * 1.5; };

  /* ---- 3. THE PANEL'S COMMANDS: what the selection can do (a key, a click or a tap each) ---- */
  function commands() {
    const sel = rts.selected.filter(u => !u.dead), out = [];
    if (!sel.length) return out;
    const b = sel.length === 1 && sel[0].building ? sel[0] : null;
    if (b) {
      if (b.progress < 1) return out;
      for (const k of b.K.makes || []) out.push({ id: 'train', kind: k, label: KINDS[k].name, cost: KINDS[k].cost.gold, off: !rts.afford('blue', KINDS[k].cost) || b.queue.length >= 5 || rts.of('blue').filter(u => !u.building).length >= POP });
      if (b.queue.length) out.push({ id: 'cancel', label: 'CANCEL' });
      return out;
    }
    if (sel.every(u => u.K.gather)) for (const k of ['barracks', 'stable']) out.push({ id: 'build', kind: k, label: KINDS[k].name, cost: KINDS[k].cost.gold, off: !rts.afford('blue', KINDS[k].cost) });
    else out.push({ id: 'amove', label: 'A-MOVE' });
    out.push({ id: 'stop', label: 'STOP' });
    return out.slice(0, 3);
  }
  function command(c) {
    if (!c || c.off) { A.sfx('bump'); if (c && c.cost && !rts.afford('blue', { gold: c.cost })) say('NOT ENOUGH GOLD', '#ffb070'); return; }
    const sel = rts.selected.filter(u => !u.dead);
    if (c.id === 'train') { rts.train(sel[0], c.kind); A.sfx('confirm'); }
    else if (c.id === 'cancel') { rts.cancel(sel[0]); A.sfx('cancel'); }
    else if (c.id === 'stop') { rts.order(sel, 'stop'); A.sfx('cancel'); }
    else if (c.id === 'amove') { amoving = true; A.sfx('blip'); say(touch() ? 'TAP WHERE THEY FIGHT THEIR WAY TO' : 'CLICK WHERE THEY FIGHT THEIR WAY TO', '#ffd0a0'); }
    else if (c.id === 'build') { mode = 'place'; const at = groundAt([game.W / 2, game.H / 2]) || [sel[0].x, sel[0].y]; placing = { kind: c.kind, cx: Math.floor(at[0] / T) - 1, cy: Math.floor(at[1] / T) - 1, by: sel[0] }; A.sfx('blip'); }
  }
  // the world point under a screen point (the ground's cell: map.pick, or the ground plane)
  const groundAt = p => { const h = map.pick(p[0], p[1]); return h ? [h.x, h.y] : game.view.toGround(p[0] + Math.floor(game.cam.x), p[1] + Math.floor(game.cam.y)); };
  function place() {
    const p = placing; if (!rts.canPlace(p.kind, p.cx, p.cy)) { A.sfx('bump'); say('IT CANNOT STAND THERE', '#ffb070'); return; }
    const by = p.by && !p.by.dead ? p.by : rts.selected.find(u => !u.dead && u.K.gather) || blueOf('worker')[0];
    if (by && rts.order([by], 'build', { kind: p.kind, cx: p.cx, cy: p.cy })) { A.sfx('confirm'); say(KINDS[p.kind].name + ': A WORKER IS ON HIS WAY', '#a8ffb0'); }
    mode = 'play'; placing = null;
  }

  /* ---- 4. EACH STEP: the HUD's buttons first (a tap on one is not an order), then the module's selection and orders,
   * placing a building, the rules, the rigs, the end ---- */
  let boxes = { cmds: [], side: [], place: [] };
  const hitBox = (b, p) => b && p && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h;
  function update(dt) {
    const I = game.input, tap = I.clicked();
    if (msg) msg.t += dt; if (banner) banner.t += dt;
    if (over) { over.t += dt; if (over.t > 1.6) endMenu.update(dt); stepWorld(dt); return; }
    stats.t += dt;
    if (!auto) {
      let used = false;
      boxes.cmds.forEach((b, i) => { if (hitBox(b, tap)) { command(b.c); used = true; } });
      if (!used) for (const b of boxes.side) if (hitBox(b, tap)) { sideButton(b.id); used = true; }
      if (!used) for (const b of boxes.place) if (hitBox(b, tap)) { if (b.id === 'place') place(); else { mode = 'play'; placing = null; A.sfx('cancel'); } used = true; }
      HOTKEYS.forEach((k, i) => { if (I.pressed(k) && mode === 'play') command(commands()[i]); });
      if (I.pressed('base')) sideButton('hall'); if (I.pressed('army')) sideButton('army');
      if (I.pressed('alert') && alert) { game.focus(alert.x, alert.y); game.cam.snap = true; }
      if (I.pressed('amove') && rts.selected.some(u => !u.building)) command({ id: 'amove' });
      if (mode === 'place') {
        const p = I.pointer(), at = !used && (tap || (!touch() && p)) ? groundAt(tap || p) : null;
        if (at) { placing.cx = Math.floor(at[0] / T) - 1; placing.cy = Math.floor(at[1] / T) - 1; }
        if (!used && tap && !touch()) place();
        else if (I.pressed('confirm')) place();
        else if (I.pressed('order') || I.pressed('cancel')) { mode = 'play'; placing = null; A.sfx('cancel'); }
      } else if (amoving && !used && (tap || I.pressed('order'))) {
        const at = groundAt(tap || I.pointer()); amoving = false;
        if (at && I.pressed('order')) A.sfx('cancel'); else if (at) { rts.order(rts.selected, 'amove', { x: at[0], y: at[1] }); A.sfx('confirm'); }
      } else if (!used) rts.input();
    }
    stepWorld(dt);
    if (!buildings('red').length) end(true); else if (!buildings('blue').length) end(false);
  }
  function sideButton(id) {
    if (id === 'hall') { const h = blueOf('hall')[0] || buildings('blue')[0]; if (h) { rts.selected = [h]; game.focus(h.x, h.y); game.cam.snap = true; A.sfx('select'); } }
    else if (id === 'army') { rts.selected = rts.of('blue').filter(u => !u.building && !u.K.gather); A.sfx(rts.selected.length ? 'select' : 'bump'); }
    else if (id === 'idle') { const w = blueOf('worker').find(u => !u.orders.length); if (w) { rts.selected = [w]; game.focus(w.x, w.y); game.cam.snap = true; A.sfx('select'); } else A.sfx('bump'); }
  }
  function stepWorld(dt) {
    rts.update(dt);
    for (const u of rts.units) {
      if (!u.rig) continue;
      if (u.swing > 0) u.swing -= dt;
      if (!onScreen(u, 80)) continue;   // (off screen a rig waits: a match's hundred bodies cost what the screen shows)
      const sp = u.moving ? u.K.speed : 0, s = u.swing > 0 ? 1 - u.swing / .45 : 0;
      u.rig.update(dt, { x: u.x, y: u.y, vx: Math.cos(u.face) * sp, vy: Math.sin(u.face) * sp, facing: u.face, point: u.K.bow && u.cool > u.K.rate - .4,
        attack: s > 0 ? { spec: { a0: 1.4, a1: -1.6, z0: 12, z1: 8, reach: 7.5 }, phase: s < .35 ? 'wind' : 'active', u: s < .35 ? s / .35 : (s - .35) / .65 } : null });
    }
    for (const a of arrows) a.t += dt / Math.max(.05, a.d); arrows = arrows.filter(a => a.t < 1);
    for (const d of dying) d.t += dt; dying = dying.filter(d => d.t < 1.6);
    if (rts.time >= CLAN.waves.first - 20 && wave === 0 && !auto) { wave = 1; say('THE ASH CLAN IS ARMING: THEY WILL CROSS SOON', '#ffb070'); }
  }
  function end(won) { over = { won, t: 0 }; rts.selected = []; mode = 'play'; placing = null; if (!auto) A.sfx(won ? 'powerup' : 'die'); }
  const endMenu = new E.Menu(game, ['PLAY AGAIN', 'TITLE'], { y: 0, onPick: i => i === 0 ? game.go('rts', null, { fade: 'iris' }) : game.go('title') });

  /* ---- 5. DRAWING: the floor, the woods, the buildings (shapes, their side's colors; a site going up), the bodies, the
   * arrows, the fog over it all, then the rings and bars, the plan of a building being placed, the HUD ---- */
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    for (const s of map.spawns) if (s.tag === 'tree') r.prop(E.hash2(s.cx, s.cy) < .55 ? 'pine' : 'tree', s.x, s.y, 0);
    for (const q of ruins) r.shadow(q.x, q.y, q.r * .9, .55, '#2a2420');   // (a fallen building's scorched ground)
    for (const u of rts.units) {
      if (!rts.visible(u) && !(u.building && rts.fog && rts.fog.seen([Math.floor(u.x / T), Math.floor(u.y / T)]))) continue;
      if (u.resource) { r.shape('rts-mine', u.x, u.y, 0, { pick: u }); continue; }
      if (u.building) {
        const team = { team: (u.side === 'blue' ? BLUE : RED) + ' cloth' };
        if (u.progress < 1) r.shape('rts-site', u.x, u.y, 0, { pick: u });
        if (u.progress >= .35) r.shape(u.K.shape, u.x, u.y, 0, { pick: u, mats: team, alpha: u.progress < 1 ? .35 + u.progress * .5 : undefined });
        continue;
      }
      r.shadow(u.x, u.y, u.r + 1, .35);
      r.actor(u.x, u.y, 0, (g, ox, oy) => { u.rig.draw(g, ox, oy, r.view); if (u.K.bow) bow(g, ox, oy, u); if (u.carry) px.rect(g, ox - 2, oy - 13, 4, 3, '#ffd040'); }, { pick: u, every: 3, key: u });
    }
    for (const d of dying) r.actor(d.x, d.y, 0, (g, ox, oy) => d.rig.draw(g, ox, oy, r.view), { alpha: Math.max(0, 1 - d.t / 1.6), key: d });
    for (const a of arrows) {
      const x = a.x + (a.tx - a.x) * a.t, y = a.y + (a.ty - a.y) * a.t, z = 12 + Math.sin(a.t * Math.PI) * 10, dz = Math.cos(a.t * Math.PI) * 10;
      r.queue(x, y, z, g => { const [sx, sy] = r.w(x, y, z), [ex, ey] = r.w(x + (a.tx - a.x) * .04, y + (a.ty - a.y) * .04, z + dz * .2); px.line(g, sx, sy, ex, ey, '#e8dcc0'); });
    }
    if (rts.fog) rts.fog.draw(r, T, {});
    rts.draw(r);
    if (mode === 'place' && placing) rts.ghost(r, placing.kind, placing.cx, placing.cy);
    if (alert && game.time - alert.t < 3) { const k = (game.time - alert.t) * 30; r.decal(() => r.groundRing(alert.x, alert.y, 6 + k % 24, '#ff5040', .8)); }
    hud(r);
  }
  // an archer's bow in its hand (a curve and its string)
  function bow(g, ox, oy, u) {
    const f = Math.cos(u.face) >= 0 ? 1 : -1, x = ox + 4 * f, y = oy - 11;
    for (let i = -4; i <= 4; i++) px.dot(g, x + Math.round(1.8 * Math.cos(i / 4 * 1.2)) * f, y + i, i % 2 ? '#8a5a2a' : '#5a3a1a');
    px.line(g, x - f, y - 4, x - f, y + 4, '#e8e0d0');
  }
  function hud(r) {
    const W = r.W, H = r.H, tc = touch(), th = Math.max(16, Math.ceil(44 * game.screen.dpr / game.screen.S)), sel = rts.selected.filter(u => !u.dead);
    ui.hud(over ? {} : { minimap: rts.minimap({ blue: '#70b0ff', red: '#ff5a4a' }) });
    boxes = { cmds: [], side: [], place: [] };
    r.overlay(g => {
      if (over) { overDraw(g, W, H); return; }
      // gold, the army, the clock
      E.ui.box(g, 3, 3, 112, 14, { alpha: .78 });
      px.rect(g, 8, 7, 5, 5, '#ffd040'); px.rect(g, 9, 8, 2, 2, '#fff2a0');
      E.font.text(g, String(rts.side('blue').res.gold || 0), 16, 6, '#ffe8a0', { outline: false });
      const army = rts.of('blue').filter(u => !u.building).length, mm = Math.floor(stats.t / 60), ss = Math.floor(stats.t % 60);
      E.font.text(g, 'PEOPLE ' + army + '/' + POP, 46, 7, '#c8d8ff', { outline: false, font: 'tiny' });
      E.font.text(g, mm + ':' + String(ss).padStart(2, '0'), 111, 7, '#a8a0c0', { align: 'right', outline: false, font: 'tiny' });
      // the selection: its name, its health, what it is making; its commands
      const cmds = mode === 'place' ? [] : commands(), bw = 62, bh = tc ? th : 16, py = H - bh - 22;
      if (sel.length) {
        const u = sel[0], one = sel.length === 1, label = one ? u.K.name : sel.length + ' ' + (sel.every(s => s.kind === u.kind) ? u.K.many || u.K.name : 'SELECTED');
        E.ui.box(g, 3, py - 2, Math.max(150, cmds.length * (bw + 2) + 8), bh + 23, { alpha: .82 });
        E.font.text(g, label, 8, py + 1, '#ffe8b0', { outline: false });
        if (one) { E.ui.bar(g, 8, py + 11, 60, 3, u.hp / u.max, u.hp > u.max * .35 ? '#5ad86a' : '#ff4a4a'); E.font.text(g, Math.ceil(u.hp) + '/' + u.max, 72, py + 10, '#c8c0d8', { outline: false, font: 'tiny' }); }
        if (one && u.queue && u.queue.length) { const q = u.queue[0], k = q.t / (KINDS[q.kind].time || 1); E.font.text(g, 'MAKING ' + KINDS[q.kind].name + (u.queue.length > 1 ? ' +' + (u.queue.length - 1) : ''), 100, py + 2, '#a8ffb0', { outline: false, font: 'tiny' }); E.ui.bar(g, 100, py + 11, 44, 3, k, '#ffd060'); }
        if (one && u.progress < 1) E.font.text(g, 'GOING UP ' + Math.floor(u.progress * 100) + '%', 100, py + 2, '#ffd060', { outline: false, font: 'tiny' });
        cmds.forEach((c, i) => {
          const b = { x: 7 + i * (bw + 2), y: py + 17, w: bw, h: bh, c }; boxes.cmds.push(b);
          E.ui.box(g, b.x, b.y, b.w, b.h, { alpha: .9, bg: c.off ? '#1a1828' : '#2a3a7a' });
          E.font.text(g, c.label, b.x + 4, b.y + b.h / 2 - 3, c.off ? '#6a6680' : '#ffffff', { outline: false, font: 'tiny' });
          if (c.cost) E.font.text(g, String(c.cost), b.x + b.w - 3, b.y + b.h / 2 - 3, c.off ? '#6a6680' : '#ffd860', { align: 'right', outline: false, font: 'tiny' });
          if (!tc) E.font.text(g, ['Z', 'X', 'C'][i], b.x + b.w - 3, b.y - 6, '#8a86a0', { align: 'right', outline: false, font: 'tiny' });
        });
      }
      // a building's plan: PLACE and CANCEL on a touch screen (a tap moves it), else the hint
      if (mode === 'place') {
        const ok = rts.canPlace(placing.kind, placing.cx, placing.cy);
        if (tc) [['place', 'PLACE', ok], ['cancel', 'CANCEL', true]].forEach(([id, s, on], i) => { const b = { id, x: 7 + i * 66, y: H - th - 6, w: 62, h: th }; boxes.place.push(b); E.ui.box(g, b.x, b.y, b.w, b.h, { alpha: .9, bg: on ? '#2a5a3a' : '#3a1a1a' }); E.font.text(g, s, b.x + b.w / 2, b.y + b.h / 2 - 3, '#ffffff', { align: 'center', outline: false }); });
        E.font.text(g, KINDS[placing.kind].name + (tc ? ': TAP WHERE IT STANDS' : ': CLICK WHERE IT STANDS, RIGHT CLICK CANCELS'), W / 2, 22, ok ? '#a8ffb0' : '#ffb0a0', { align: 'center', shadow: '#000', outline: false });
      }
      // HALL, ARMY and IDLE on the left of a touch screen (keys H and R)
      if (tc) ['hall', 'army', 'idle'].forEach((id, i) => { const b = { id, x: 3, y: 22 + i * (th + 3), w: 40, h: th }; boxes.side.push(b); E.ui.box(g, b.x, b.y, b.w, b.h, { alpha: .82 }); E.font.text(g, id.toUpperCase(), b.x + b.w / 2, b.y + b.h / 2 - 3, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); });
      // the banner, the message
      if (banner && banner.t < 2.4) { const a = banner.t < .3 ? banner.t / .3 : banner.t > 1.9 ? (2.4 - banner.t) / .5 : 1; px.blend(g, a * .7, 'normal', () => px.rect(g, 0, H / 2 - 26, W, 30, '#0a0816')); E.font.title(g, banner.s, W / 2, H / 2 - 22, { align: 'center', scale: 2, colors: ['#ffffff', banner.c, E.mix(banner.c, '#000000', .5)] }); }
      if (msg && msg.t < 3) E.font.text(g, msg.s, W / 2, mode === 'place' ? 34 : 22, msg.c, { align: 'center', shadow: '#000', outline: false });
      if (!tc && !sel.length && stats.t < 40) E.font.text(g, 'CLICK OR DRAG TO SELECT  RIGHT CLICK ORDERS  H HALL  R ARMY', W / 2, H - 9, '#a8a0c0', { align: 'center', outline: false, font: 'tiny' });
    });
    if (over && over.t > 1.6) endMenu.draw(r);
  }
  function overDraw(g, W, H) {
    const k = Math.min(1, over.t / .8), cy = Math.round(H / 2);
    g.fillStyle = 'rgba(4,2,10,' + (.6 * k).toFixed(2) + ')'; g.fillRect(0, 0, game.r.bw, game.r.bh); E.px.reset(g);
    E.font.title(g, over.won ? 'VICTORY' : 'DEFEAT', W / 2, cy - 64, { align: 'center', scale: 3, colors: over.won ? ['#fff8d0', '#ffd060', '#e07a2a'] : ['#ffd0d0', '#ff5a5a', '#8a1a2a'] });
    const t = stats.t, lines = [over.won ? 'THE ASH CLAN\'S CAMP IS BURNED' : 'THE VALE HAS FALLEN', 'TIME ' + Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') + '   GOLD MINED ' + stats.gold,
      'MADE ' + stats.made + '   LOST ' + stats.lost + '   FOES FELLED ' + stats.killed];
    lines.forEach((s, i) => E.font.text(g, s, W / 2, cy - 20 + i * 11, i ? '#e8e0f0' : '#ffe070', { align: 'center', shadow: '#000', outline: false }));
    endMenu.y = cy + 22;
  }

  /* ---- 6. THE BOT: the Vale's own AI (the same module's, its plan above) against the clan's, through the same rules a
   * player's orders give; a match to its end, twice, the same (tools/kits-test.mjs) ---- */
  function bot(o = {}) {
    const was = Math.random, one = () => {
      Math.random = E.rng(o.seed || 1);
      game.time = 0; game.timeScale = 1; game.go('rts', { auto: true }, { fade: 0 }); game.advance(1 / 120);
      for (let i = 0; i < 30 * 60 * 20 && !over; i++) game.advance(1 / 30);
      const s = JSON.stringify(rts.state()); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
      return { won: !!(over && over.won), over: !!over, time: Math.round(stats.t), made: stats.made, lost: stats.lost, killed: stats.killed, gold: stats.gold, hash: h >>> 0 };
    };
    try { const a = one(), b = one(); return Object.assign(a, { repeat: JSON.stringify(a) === JSON.stringify(b), errors: game.errors.length }); }
    finally { Math.random = was; }
  }

  return { view: 'iso', views: ['iso'], res: 'ps1', pausable: true, propSize: 1, touch: [], camera: { zoom: [.6, 1.6], start: 1, tall: 1.25 },
    input: { ...E.Input.DEFAULT, order: ['Mouse2'], cmd1: ['KeyZ'], cmd2: ['KeyX'], cmd3: ['KeyC'], base: ['KeyH'], army: ['KeyR'], alert: ['Space'], amove: ['KeyF'] },
    enter: start, update, draw, bot,
    exit() { game.cam.free = null; game.input.touchEnabled = true; game.resetCamera(); if (ui) ui.hud({}); },
    back() { if (mode === 'place') { mode = 'play'; placing = null; return true; } if (rts.selected.length) { rts.selected = []; return true; } return false; },   // a phone's back: the plan, then the selection
    /** for tests: the state, the strategy module, a unit's place on the screen, the HUD's boxes */
    state: () => ({ mode, over, stats, rts, map, placing, boxes, wave, commands: commands().map(c => c.label),
      at: u => { const q = game.view.p(u.x, u.y, u.z || 0); return [q[0] - game.screen.ix, q[1] - game.screen.iy]; } }),
    /** the proof: the hall selected (H), a worker made (Z), the camera panned about, the army called (R) and sent across
     *  with F and a click; the clan's AI between; a hash of every unit's kind, side, place and HP, and each side's gold */
    run: (n = 1200) => proof('rts', n, (i, k) => { if (i === 30) k.tap('base'); if (i === 40 || i === 50) k.tap('cmd1'); if (i % 400 === 100) k.tap('army'); walk(i, k, ['up', 'right', 'down', 'left'], 150); },
      () => [mode, rts.state()]) };
})();
scenes.rts = RTS;

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
