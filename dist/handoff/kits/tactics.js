// The TACTICS kit's game (an isometric battle on a map of heights: charge time or phases, facing, arcs, areas, a scoring AI), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 159 (src/starter/47-tactics.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. tactics.html plays it; node kits/test.mjs tactics runs it headless.
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
 * SLICE 15  TACTICS  (Final Fantasy Tactics, Tactics Ogre, Shining Force, Fire Emblem). @modules grid story
 * THE TAKING OF THORNWATCH: four heroes storm a hill fort held by the Ash Legion's five (Grimwald, the knight who leads
 * them, at the gate; an archer on the wall; a mage on the tower; a priest in the yard; a thief out on the hills). An
 * isometric map of heights (E.HEIGHTS.level, 8, a level): a unit walks MOVE cells, climbs and drops what its JUMP allows,
 * and the river's shallows cost two. Blows land harder from the side (x1.25) and from behind (x1.5) and from higher
 * ground (+8% a level). Turns come by speed (charge time: the order ahead is on the left) or, picked before the battle,
 * by phases (every hero in the order you like, then every foe: Fire Emblem). A turn: MOVE and ACT once each, either
 * first (ATTACK or the unit's skill), then WAIT and face a way. Bows arc over what stands between (map.arcClear) and
 * reach further from up high; FIRE burns a diamond (friend and foe alike), VOLLEY rains on a cross, CURE heals one,
 * BASH knocks a foe back a cell, CLEAVE cuts the three cells ahead. The Legion scores every place it can stand and every
 * blow it can strike from there (the damage, a kill, a heal, the danger of the place: grid.threat). Win: the Legion falls.
 * Lose: every hero falls.
 * Keys: arrows / WASD move the cursor (the camera follows), Enter / Z confirm, Esc / X back (before acting, back undoes a
 * move), Q and E turn the view a quarter, the wheel or - and = zoom. The mouse: the cursor follows the pointer
 * (map.pick, the cell under it in every view and turn); a click confirms. TOUCH: a tap selects a unit, a tap on a blue
 * cell moves there, a tap on a foe in range strikes; the command list's rows are a thumb's height; a finger dragging
 * pans the camera, two pinch it; TURN turns the view.
 * HOW IT WORKS: the map is a TileMap whose cells all stand on a base (the earth shows at its edges) at their heights; the
 * grid is E.Grid.from(map, { tops: true }) with the shallows' cost; E.Turns ('ct') orders the turns, grid.reach the
 * moves (allies passed through), grid.shape the areas, grid.side where a blow lands, grid.threat the AI's danger; E.Story
 * runs the scene before the battle and its choice of the order. bot() lets the heroes' own AI play the battle
 * (tools/kits-test.mjs). Deep links: #tactics/battle (no scene, charge time), #tactics/phases.
 * ===================================================================================== */
const TACTICS = (() => {
  const T = 16, LV = E.HEIGHTS.level, STEP = .16, BASE = 16;   // a cell; a level (8); a step's seconds; the ground's height
  // THORNWATCH's march: G major, a snare under a brave lead (the step sequencer's format)
  const SONG = { bpm: 112, steps: 4, tracks: [
    { wave: 'pulse25', vol: .11, notes: 'G4 - B4 - D5 - - - E5 - D5 - B4 - G4 - | A4 - - - B4 - C5 - D5 - - - . . . . | G4 - B4 - D5 - G5 - F#5 - E5 - D5 - B4 - | C5 - B4 - A4 - F#4 - G4 - - - . . . .' },
    { wave: 'triangle', vol: .28, notes: 'G2 - . . G2 . D3 . G2 - . . G2 . D3 . | D2 - . . D2 . A2 . D2 - . . D2 . A2 . | E2 - . . E2 . B2 . C3 - . . C3 . G2 . | D2 - . . D2 . A2 . G2 - . . G2 . . .' },
    { wave: 'drums', vol: .09, notes: 'k . h . s . h . k . h k s . h h' }] };
  // the fort (top left: the camera looks from the south east), its gate, the hills, the river's shallows (~) and its ford
  const ROWS = [
    'Bccce3221111....',
    'cbbbc2211.......',
    'cbbbc211....T...',
    'cbbbc11.....~~..',
    'cBaBc1.....~~...',
    '..a.......~~..T.',
    '.,,,,,...~~.....',
    '..T..,..~~...1..',
    '.....,.~~...122.',
    '.R...,~~....12..',
    '.....~~,,,,,....',
    '..T.~~.....,....',
    '...~~...T..,....',
    '..~~.......,....'];
  const GRASS = { top: '#5c8a3c', side: '#6a5034', face: 'rock', roof: 'grass' }, STONE = { top: '#8c8a90', side: '#6c6a78', face: 'stone', roof: 'slab' };
  const TYPES = { 1: { ...GRASS, h: BASE }, 2: { top: '#a88c5a', side: '#6a5034', face: 'rock', roof: '#9a7e52 noise', h: BASE }, 3: { top: '#3a72a8', side: '#5a4a34', face: 'rock', roof: '#3a6aa8 glaze', h: BASE - 6 },
    4: { ...GRASS, h: BASE + LV }, 5: { ...GRASS, h: BASE + 2 * LV }, 6: { ...GRASS, h: BASE + 3 * LV },
    7: { ...STONE, h: BASE + LV }, 8: { ...STONE, h: BASE + 2 * LV }, 9: { ...STONE, h: BASE + 3 * LV, face: 'brick' }, 10: { ...STONE, h: BASE + 5 * LV, face: 'brick', roof: 'cobble' } };
  const LEGEND = { '.': 1, ',': 2, '~': { tile: 3, floor: 'water' }, 1: 4, 2: 5, 3: 6, a: 7, b: 8, c: 9, e: 10, T: { tile: 1, block: true, spawn: 'tree' }, R: { tile: 1, block: true, spawn: 'rock' }, B: { tile: 9, block: true, spawn: 'banner' } };

  /* ---- THE UNITS: stats, a look, two actions. kind: melee (a step's reach, two levels up or down at most), bow (an arc
   * over what is between; a cell further for each two levels higher), magic, heal. area: a grid.shape round the target
   * ([kind, n]; cone: along the way from the user) ---- */
  const ACTS = {
    sword:  { label: 'ATTACK', kind: 'melee', range: [1, 1], power: 1, anim: 'slash' },
    dagger: { label: 'ATTACK', kind: 'melee', range: [1, 1], power: .9, anim: 'thrust' },
    staff:  { label: 'ATTACK', kind: 'melee', range: [1, 1], power: .8, anim: 'overhead' },
    bow:    { label: 'ATTACK', kind: 'bow', range: [2, 4], power: 1, anim: 'throw' },
    bash:   { label: 'BASH', kind: 'melee', range: [1, 1], power: 1.2, mp: 4, push: true, anim: 'bash' },
    cleave: { label: 'CLEAVE', kind: 'melee', range: [1, 1], power: .9, mp: 5, area: ['cone', 2], anim: 'spin' },
    volley: { label: 'VOLLEY', kind: 'bow', range: [3, 5], power: .7, mp: 6, area: ['cross', 1], anim: 'throw' },
    fire:   { label: 'FIRE', kind: 'magic', range: [1, 4], power: 1.5, mp: 6, area: ['diamond', 1], anim: 'cast' },
    cure:   { label: 'CURE', kind: 'heal', range: [0, 3], power: 2, mp: 5, anim: 'rising' }
  };
  const ROSTER = [   // side, name, class, stats, its two actions, where it starts, its look
    { side: 'hero', name: 'ALDO', cls: 'PALADIN', hp: 54, mp: 10, atk: 13, def: 7, mag: 4, res: 4, speed: 95, move: 4, jump: 2, acts: ['sword', 'bash'], at: [11, 10],
      rig: { build: 'heroic', armor: true, hair: 'short', cape: { len: 5, width: 5, seg: 2.4 }, colors: { cloth: '#2c5cc0', cape: '#e8e4d8', capeIn: '#a8a090', hair: '#e0b050', trim: '#e8c860', metal: '#c8d0e0' } } },
    { side: 'hero', name: 'WREN', cls: 'RANGER', hp: 40, mp: 12, atk: 12, def: 4, mag: 4, res: 5, speed: 110, move: 4, jump: 3, acts: ['bow', 'volley'], at: [13, 10], bow: true,
      rig: { hood: true, outfit: 'tunic', weapon: null, sleeves: 'long', colors: { cloth: '#3a7a3a', pants: '#5a4a32', hair: '#8a4a2a', trim: '#c8a860', boot: '#4a3020' } } },
    { side: 'hero', name: 'SABLE', cls: 'MAGE', hp: 32, mp: 24, atk: 5, def: 3, mag: 14, res: 9, speed: 100, move: 3, jump: 2, acts: ['staff', 'fire'], at: [11, 12],
      rig: { outfit: 'robe', weapon: 'staff', sleeves: 'long', hair: 'long', hat: { style: 'pointed', color: '#2a2a6a' }, colors: { cloth: '#4a3ab0', pants: '#3a2e90', hair: '#e8e0f0', orb: '#ff9040', trim: '#f0c860' } } },
    { side: 'hero', name: 'LIORA', cls: 'CLERIC', hp: 36, mp: 24, atk: 6, def: 4, mag: 11, res: 10, speed: 100, move: 4, jump: 2, acts: ['staff', 'cure'], at: [13, 12],
      rig: { outfit: 'robe', weapon: 'staff', sleeves: 'long', hair: 'ponytail', hat: { style: 'band', color: '#c83a4a' }, colors: { cloth: '#f2eee2', pants: '#e2dccc', trim: '#c8a040', hair: '#6a3a24', orb: '#8affc0' } } },
    { side: 'foe', name: 'GRIMWALD', cls: 'KNIGHT', hp: 60, mp: 10, atk: 13, def: 8, mag: 3, res: 3, speed: 85, move: 3, jump: 1, acts: ['sword', 'cleave'], at: [2, 4], lead: true,
      rig: { build: 'bulky', size: 1.1, armor: true, hair: 'bald', hat: { style: 'helmet', color: '#4a4652' }, cape: { len: 6, width: 6, seg: 2.6 }, eyeGlow: '#ff6040', colors: { cloth: '#2e2a34', pants: '#3a3640', metal: '#6a6878', cape: '#a01c2c', capeIn: '#6a1020', trim: '#c89040', skin: '#12060c' } } },
    { side: 'foe', name: 'ARCHER', cls: 'ARCHER', hp: 30, mp: 0, atk: 10, def: 3, mag: 3, res: 3, speed: 105, move: 4, jump: 2, acts: ['bow'], at: [4, 3], bow: true,
      rig: { hood: true, outfit: 'tunic', weapon: null, sleeves: 'long', colors: { cloth: '#7a2a2a', pants: '#3a3036', hair: '#2a2024', trim: '#5a5a62', boot: '#2a2024' } } },
    { side: 'foe', name: 'MAGE', cls: 'MAGE', hp: 28, mp: 20, atk: 4, def: 2, mag: 12, res: 7, speed: 95, move: 3, jump: 2, acts: ['staff', 'fire'], at: [4, 0],
      rig: { outfit: 'robe', weapon: 'staff', sleeves: 'long', hair: 'bald', hat: { style: 'pointed', color: '#1a1420' }, colors: { cloth: '#2a2030', pants: '#221a28', trim: '#c83a3a', orb: '#ff4a2a', skin: '#c8b0a0' } } },
    { side: 'foe', name: 'PRIEST', cls: 'PRIEST', hp: 30, mp: 20, atk: 5, def: 3, mag: 9, res: 8, speed: 90, move: 3, jump: 2, acts: ['staff', 'cure'], at: [2, 2],
      rig: { outfit: 'robe', weapon: 'staff', hood: true, sleeves: 'long', colors: { cloth: '#5a5462', pants: '#4a4452', trim: '#a01c2c', orb: '#c8ffd8' } } },
    { side: 'foe', name: 'THIEF', cls: 'THIEF', hp: 30, mp: 0, atk: 10, def: 3, mag: 3, res: 3, speed: 125, move: 5, jump: 3, acts: ['dagger'], at: [8, 1],
      rig: { hood: true, outfit: 'tunic', bladeLen: 7, colors: { cloth: '#3a2a4a', pants: '#2a2232', hair: '#1a1420', trim: '#8a6a3a', boot: '#1e1824' } } }
  ];
  const PEOPLE = { aldo: 'ALDO', wren: 'WREN', sable: 'SABLE', liora: 'LIORA', grim: 'GRIMWALD' };
  // the scene before the battle (E.Story): each line looks at its speaker; its last choice sets the turn order
  const NODES = { intro: [
    { event: 'look', at: 'grim' },
    { who: 'grim', say: 'So the Crown sends {c=#8ad0ff}four{/c}. Thornwatch has stood a hundred years, little lord.', emote: 'dots' },
    { event: 'look', at: 'aldo' },
    { who: 'aldo', say: 'Then a hundred years is long enough. Open the gate, Grimwald.' },
    { event: 'look', at: 'grim' },
    { who: 'grim', say: '{shake}Legion! To the walls!{/shake}', emote: '!' },
    { event: 'look', at: 'liora' },
    { who: 'liora', say: 'Mind the archer on the wall. {w=.3}And keep out of the river: the shallows {c=#8ad0ff}slow{/c} you.' },
    { who: 'wren', say: 'From up there their bows reach further. {w=.2}So will mine, from the hill.' },
    { event: 'look', at: 'aldo' },
    { who: 'aldo', say: 'How shall we fight?', choices: [{ text: 'Each in turn, by speed', set: { order: 'ct' } }, { text: 'Side by side: phases', set: { order: 'phase' } }] }] };

  let map = null, grid = null, story = null, turns = null, units = [], active = null, mode = 'scene', order = 'ct', cursor = [11, 10], look = [0, 0, 0], menuI = 0;
  let sel = null, pending = null, cells = null, queue = [], wait = 0, banner = null, msg = null, over = null, round = 1, phase = 'hero', left = [], auto = false, stats = null, hold = 0, held = null, ptr = null, base = null;
  const endMenu = new E.Menu(game, ['RETRY', 'TITLE'], { y: 0, onPick: i => i === 0 ? game.go('tactics', { part: 'battle' }, { fade: 'iris' }) : game.go('title') });
  const top = (cx, cy) => map.height(cx, cy), key = c => c[0] + ',' + c[1], same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
  const living = side => units.filter(u => !u.dead && (!side || u.side === side)), unitAt = c => units.find(u => !u.dead && u.cx === c[0] && u.cy === c[1]) || null;
  const foesOf = u => living(u.side === 'hero' ? 'foe' : 'hero'), mates = u => living(u.side).filter(o => o !== u), cell = u => [u.cx, u.cy];
  const water = c => map.floorTags && map.floorTags[c[1] * map.w + c[0]] === 'water';
  const say = (s, c = '#fff2c4') => { msg = { s, c, t: 0 }; };

  /* ---- 1. RULES: where a unit can go, what it can strike from where, how hard ---- */
  const moveOpts = u => ({ climb: u.jump * LV, drop: (u.jump + 1) * LV, blocked: (x, y) => foesOf(u).some(o => o.cx === x && o.cy === y), pass: (x, y) => mates(u).some(o => o.cx === x && o.cy === y) });
  const reachOf = u => grid.reach(cell(u), u.moved ? 0 : u.move, moveOpts(u));
  // the cells action a can be aimed at from cell c (each with a unit it touches, or any cell for an area)
  function aims(u, a, c) {
    const [lo, hi0] = a.range, h = top(...c), out = [];
    for (let y = c[1] - hi0 - 3; y <= c[1] + hi0 + 3; y++) for (let x = c[0] - hi0 - 3; x <= c[0] + hi0 + 3; x++) {
      if (!grid.inside([x, y])) continue;
      const d = grid.dist(c, [x, y]), dz = h - top(x, y), hi = a.kind === 'bow' ? hi0 + Math.max(0, Math.floor(dz / (2 * LV))) : hi0;
      if (d < lo || d > hi) continue;
      if (a.kind === 'melee' && Math.abs(dz) > 2 * LV) continue;
      if (a.kind === 'bow' && !arcs(c, [x, y])) continue;
      out.push([x, y]);
    }
    return out;
  }
  // an arrow's arc from a unit's chest over the tops between (map.arcClear: the core's jump arcs)
  const arcs = (a, b) => { const [ax, ay] = map.center(...a), [bx, by] = map.center(...b), d = Math.hypot(bx - ax, by - ay); return map.arcClear({ x: ax, y: ay, z: top(...a) + 16 }, { x: bx, y: by, z: top(...b) + 12 }, 8 + d * .25); };
  const area = (a, from, t) => a.area ? grid.shape(t, a.area[0], a.area[1], grid.face(from, t)).filter(c => !(a.area[0] === 'cone' && same(c, from))) : [t];
  const hitCells = (a, from, t) => a.area && a.area[0] === 'cone' ? grid.shape(from, 'cone', a.area[1], grid.face(from, t)) : area(a, from, t);
  // how hard a blows v from cell from: { amount, side, heal }
  function blow(u, a, from, v) {
    if (a.kind === 'heal') return { heal: true, amount: Math.min(v.max - v.hp, Math.round(u.mag * a.power)) };
    const side = a.kind === 'magic' ? 'front' : grid.side(cell(v), v.facing, from), dl = (top(...from) - top(v.cx, v.cy)) / LV;
    const raw = a.kind === 'magic' ? u.mag * a.power - v.res * .6 : u.atk * a.power - v.def * .7;
    return { side, amount: Math.max(1, Math.round(raw * (side === 'back' ? 1.5 : side === 'side' ? 1.25 : 1) * (1 + clamp(dl, -2, 3) * .08))) };
  }

  /* ---- 2. THE AI: every place it can stop and every blow from there, scored; the best (the first of equals) wins ---- */
  function plan(u) {
    const foes = foesOf(u), reach = reachOf(u), heal = u.acts.map(id => ACTS[id]).find(a => a.kind === 'heal');
    const danger = grid.threat(foes.map(o => ({ cx: o.cx, cy: o.cy, move: o.move, range: ACTS[o.acts[0]].range, climb: o.jump * LV, drop: (o.jump + 1) * LV })), { blocked: (x, y) => living(u.side).some(o => o !== u && o.cx === x && o.cy === y) });
    const ranged = ACTS[u.acts[0]].kind === 'bow' || u.acts.some(id => ACTS[id].kind === 'magic');
    let best = null;
    for (const [cx, cy] of reach.cells) {
      const c = [cx, cy], near = Math.min(...foes.map(o => grid.dist(c, cell(o))));
      let pos = (top(cx, cy) - BASE) / LV * 1.2 - danger.count(c) * (u.hp < u.max * .4 ? 5 : 2.5) - (water(c) ? 2 : 0);
      if (heal) { const hurt = living(u.side).filter(o => o.hp < o.max * .7); pos -= hurt.length ? Math.min(...hurt.map(o => grid.dist(c, cell(o)))) * .8 : 0; }
      pos -= ranged ? Math.abs(near - 3) * 1.5 : near * 1.6;
      if (u.lead && near > 2) pos -= 3;   // (the knight holds his gate until they come)
      const take = s => { if (!best || s.score > best.score + 1e-9) best = s; };
      take({ cell: c, score: pos });
      if (u.acted) continue;
      for (const id of u.acts) {
        const a = ACTS[id]; if ((a.mp || 0) > u.mp) continue;
        for (const t of aims(u, a, c)) {
          let v = 0;
          for (const hc of hitCells(a, c, t)) {
            const o = same(hc, c) ? u : same(hc, cell(u)) ? null : unitAt(hc); if (!o || (o === u && a.kind !== 'heal')) continue;
            const b = blow(u, a, c, o), ally = o.side === u.side;
            if (b.heal) v += ally ? b.amount * 1.3 : -b.amount;
            else v += ally ? -b.amount * 1.6 : b.amount + (b.amount >= o.hp ? 25 + (o.lead ? 15 : 0) : 0);
          }
          if (v > 2) take({ cell: c, act: id, aim: t, score: pos + v * 2 });
        }
      }
    }
    return best;
  }

  /* ---- 3. ORDERS: a move along its path, an action and its effects, the wait and its facing. The player's commands, the
   * AI and the bot all give these ---- */
  function march(u, to, done) {
    const p = grid.reach(cell(u), u.move, moveOpts(u)).path(to); if (p.length < 2) { done && done(); return; }
    u.from = cell(u); u.path = p; u.seg = 0; u.st = 0; u.after = done; A.sfx('step');
  }
  function act(u, id, t, done) {
    const a = ACTS[id], from = cell(u), fin = () => { acting--; if (done) done(); }; acting++; u.acted = true; u.mp -= a.mp || 0; u.facing = same(t, from) ? u.facing : grid.face(from, t);
    u.swing = new E.Attack(a.anim); u.swing.start(); A.sfx(a.kind === 'magic' || a.kind === 'heal' ? 'charge' : 'swing');
    const land = () => {
      const hit = hitCells(a, from, t), [tx, ty] = map.center(...t), tz = top(...t);
      if (a.kind === 'magic') { for (const c of hit) { const [x, y] = map.center(...c); P.fire(x, y, top(...c) + 4, 8, { speed: 50 }); P.smoke(x, y, top(...c) + 8, 2); } A.sfx('explode', { vol: .5 }); game.shake(3); }
      if (a.kind === 'heal') { P.glints(tx, ty, tz + 14, 14, '#8affc0', 14); P.ring(tx, ty, 4, 16, '#8affc0', .5, tz); A.sfx('heal'); }
      for (const c of hit) {
        const v = same(c, from) && a.kind !== 'heal' ? null : unitAt(c); if (!v) continue;
        const b = blow(u, a, from, v), [x, y] = map.center(v.cx, v.cy), z = top(v.cx, v.cy);
        if (b.heal) { v.hp += b.amount; P.text(x, y, z + 30, '+' + b.amount, '#8affc0', { bounce: true }); continue; }
        v.hp -= b.amount; v.hit = .3; stats.dealt[u.name] = (stats.dealt[u.name] || 0) + b.amount;
        game.hitFx(x, y, z + 14, { damage: b.amount, power: b.side === 'back' ? 1.5 : 1, angle: Math.atan2(u.facing[1], u.facing[0]), textColor: v.side === 'hero' ? '#ff9a8a' : '#fff2c4', sound: a.kind === 'magic' ? false : 'hit' });
        if (b.side !== 'front') P.text(x, y, z + 40, b.side === 'back' ? 'BACK!' : 'SIDE', '#ffd040');
        if (a.push && v.hp > 0) push(u, v);
        if (v.hp <= 0) fall(v);
      }
      check();
    };
    if (a.kind === 'bow') game.after(.2, () => { arrows.push({ a: [u.x, u.y, top(...from) + 18], b: [...map.center(...t), top(...t) + 12], t: 0, dur: .32 + grid.dist(from, t) * .04, then: () => { land(); game.after(.35, fin); } }); A.sfx('whoosh'); });
    else game.after(a.kind === 'magic' ? .55 : .22, () => { land(); game.after(.5, fin); });
  }
  const arrows = []; let acting = 0;
  // BASH: the foe goes back a cell, falling to a lower one (hurt by the drop), or slams into what is there
  function push(u, v) {
    const d = grid.face(cell(u), cell(v)), to = [v.cx + d[0], v.cy + d[1]];
    if (grid.walk(to) && !unitAt(to) && top(...to) <= top(v.cx, v.cy) + LV / 2) {
      const drop = Math.max(0, Math.floor((top(v.cx, v.cy) - top(...to)) / LV)); v.from = cell(v); v.cx = to[0]; v.cy = to[1]; v.path = [v.from, to]; v.seg = 0; v.st = 0; v.after = null;
      if (drop) { v.hp -= drop * 3; game.after(.2, () => P.text(v.x, v.y, top(v.cx, v.cy) + 30, drop * 3, '#ffb070')); }
    } else { v.hp -= 4; game.after(.15, () => P.text(v.x, v.y, top(v.cx, v.cy) + 30, 'SLAM 4', '#ffb070')); }
  }
  function fall(v) {
    v.dead = true; v.die = 0; v.hp = 0; left = left.filter(o => o !== v); if (turns) turns.remove(v);
    P.dust(v.x, v.y, top(v.cx, v.cy), 10); A.sfx('die'); say(v.name + ' FALLS', v.side === 'hero' ? '#ff8a8a' : '#a8e0a0');
  }
  function check() {
    if (over) return;
    const won = !living('foe').length, lost = !living('hero').length; if (!won && !lost) return;
    over = { won, t: 0 }; queue = []; mode = 'over'; A.sfx(won ? 'powerup' : 'die'); if (won) A.music(null);
  }

  /* ---- 4. TURNS: charge time (E.Turns 'ct': the fastest acts first, a turn of less costs less) or phases ---- */
  function nextTurn() {
    if (over) return;
    let u;
    if (order === 'ct') u = turns.next();
    else {
      if (!left.length) { phase = phase === 'hero' ? 'foe' : 'hero'; if (phase === 'hero') round++; left = living(phase); banner = { s: phase === 'hero' ? 'PLAYER PHASE' : 'ENEMY PHASE', t: 0, c: phase === 'hero' ? '#8ad0ff' : '#ff8a7a' }; }
      u = left[0];
    }
    if (!u) return;
    active = u; u.moved = u.acted = false; u.at0 = cell(u); u.mp = Math.min(u.mmp, u.mp + 2); cursor = cell(u); aimLook(cursor); stats.turns++;
    if (order === 'ct') banner = { s: u.name + "'S TURN", t: 0, c: u.side === 'hero' ? '#8ad0ff' : '#ff8a7a' };
    if (u.side === 'hero' && !auto) { mode = 'command'; menuI = u.moved ? 1 : 0; A.sfx('blip'); }
    else { mode = 'ai'; aiTurn(u); }
  }
  // the end of a unit's turn: its cost to its charge (100 a move and an act, 80 one, 60 neither), then the next
  function endTurn(u, face) {
    if (over) return;
    if (face) u.facing = face;
    if (order === 'ct') turns.done(u, 60 + (u.moved ? 20 : 0) + (u.acted ? 20 : 0)); else left = left.filter(o => o !== u);
    mode = 'busy'; sel = null; cells = null; queue.push([.25, nextTurn]);
  }
  // the AI's turn, a beat at a time: the cursor to where it goes, the move, the cursor to its target, the blow, its facing
  function aiTurn(u) {
    const p = plan(u) || { cell: cell(u) }, foes = foesOf(u);
    queue.push([.35, () => { cursor = p.cell; aimLook(p.cell); }]);
    queue.push([.25, () => { if (!same(p.cell, cell(u))) { u.moved = true; march(u, p.cell, () => { if (!over) mode = 'ai'; }); mode = 'anim'; } }]);
    if (p.act) {
      queue.push([.3, () => { cursor = p.aim; cells = hitCells(ACTS[p.act], p.cell, p.aim); }]);
      queue.push([.35, () => { cells = null; mode = 'anim'; act(u, p.act, p.aim, () => { if (!over) mode = 'ai'; }); }]);
    }
    queue.push([.3, () => { const f = foes.filter(o => !o.dead).sort((a, b) => grid.dist(cell(u), cell(a)) - grid.dist(cell(u), cell(b)))[0]; endTurn(u, f ? grid.face(cell(u), cell(f)) : u.facing); }]);
  }

  /* ---- 5. THE BATTLE ---- */
  function build() {
    map = new E.TileMap({ rows: ROWS, legend: LEGEND, types: TYPES, ao: 0, outside: false, shimmer: false, floorTex: () => [0, 0, 0] });
    grid = E.Grid.from(map, { tops: true, cost: (x, y) => water([x, y]) ? 2 : 1 });
  }
  const rigOf = r => new E.Humanoid(Object.assign({ size: 1 }, r));
  function start(data) {
    if (!map) build();
    const part = data && data.part; order = part === 'phases' ? 'phase' : 'ct'; auto = !!(data && data.auto);
    units = ROSTER.map((d, i) => { const [x, y] = map.center(...d.at); return Object.assign({}, d, { id: i, cx: d.at[0], cy: d.at[1], x, y, z: top(...d.at), max: d.hp, mmp: d.mp, facing: d.side === 'hero' ? [-1, 0] : [1, 0], rig: rigOf(d.rig), swing: null, hit: 0, dead: false, die: 0, path: null }); });
    units.forEach(u => { if (u.side === 'foe') u.facing = grid.face(cell(u), [12, 11]); });
    turns = new E.Turns(units, { mode: 'ct' }); active = null; over = null; queue = []; wait = 0; banner = null; msg = null; round = 0; phase = 'foe'; left = []; cells = null; sel = null; arrows.length = 0;
    stats = { turns: 0, dealt: {} }; base = null; acting = 0;
    const g = units.find(u => u.lead); cursor = cell(g); aimLook(cursor); game.cam.snap = true; game.cam.bounds = null; L.enabled = false; A.music(SONG); game.input.steer = 'drag';
    const people = {}; for (const k in PEOPLE) { const u = units.find(o => o.name === PEOPLE[k]); people[k] = { name: u.name, portrait: u.rig, at: Object.assign(u, { h: 32 }) }; }
    story = new E.Story(game, { people, nodes: NODES, vars: { order: 'ct' }, on: { look(s, st) { const u = people[st.at].at; cursor = cell(u); aimLook(cursor); } } });
    if (part) begin(); else { mode = 'scene'; story.run('intro', { onDone: () => { order = story.get('order') || 'ct'; begin(); } }); }
  }
  function begin() { mode = 'busy'; banner = { s: order === 'ct' ? 'BATTLE!' : 'BATTLE! BY PHASES', t: 0, c: '#ffe070' }; A.sfx('confirm'); queue.push([.9, nextTurn]); }
  // the camera looks at a cell's top (the cursor, a speaker, the unit whose turn it is)
  const aimLook = c => { const [x, y] = map.center(...c); look = [x, y, top(...c)]; };

  /* ---- 6. THE PLAYER: a command list, then a cell to move to or a target, then a way to face ---- */
  const skillOf = u => ACTS[u.acts[1]];
  const rows = u => {
    const sk = skillOf(u), out = [{ id: 'move', label: 'MOVE', off: u.moved }, { id: 'act', act: u.acts[0], label: ACTS[u.acts[0]].label, off: u.acted }];
    if (sk) out.push({ id: 'act', act: u.acts[1], label: sk.label, note: sk.mp + ' MP', off: u.acted || u.mp < sk.mp });
    if (order === 'phase') out.push({ id: 'end', label: 'END PHASE' });
    out.push({ id: 'wait', label: 'WAIT' }); return out;
  };
  function command(r) {
    const u = active; if (!r || r.off) { A.sfx('bump'); return; }
    A.sfx('confirm');
    if (r.id === 'move') { mode = 'move'; cells = reachOf(u).cells.map(c => [c[0], c[1]]); cursor = cell(u); }
    else if (r.id === 'act') { mode = 'target'; pending = r.act; cells = aims(u, ACTS[r.act], cell(u)); const t = cells.find(c => { const o = unitAt(c); return o && (ACTS[r.act].kind === 'heal' ? o.side === u.side : o.side !== u.side); }); cursor = t || cell(u); }
    else if (r.id === 'wait') { mode = 'face'; cells = grid.neighbours(cell(u)); const f = foesOf(u).sort((a, b) => grid.dist(cell(u), cell(a)) - grid.dist(cell(u), cell(b)))[0]; u.facing = f ? grid.face(cell(u), cell(f)) : u.facing; cursor = cell(u); }
    else if (r.id === 'end') { for (const h of left.slice()) if (h !== u) left = left.filter(o => o !== h); endTurn(u); }
  }
  // confirm on cell c: what it means in each mode (a key, a click, a tap)
  function confirmAt(c) {
    const u = active;
    if (mode === 'move') {
      if (!cells.some(k => same(k, c))) { A.sfx('bump'); return; }
      if (same(c, cell(u))) { mode = 'command'; cells = null; return; }
      u.moved = true; cells = null; mode = 'anim'; A.sfx('confirm'); march(u, c, () => { mode = 'command'; menuI = rows(u).findIndex(r => !r.off); });
    } else if (mode === 'target') {
      if (!cells.some(k => same(k, c)) || (!ACTS[pending].area && !unitAt(c))) { A.sfx('bump'); return; }
      cells = null; mode = 'anim'; act(u, pending, c, () => { mode = over ? 'over' : 'command'; menuI = rows(u).findIndex(r => !r.off); });
    } else if (mode === 'face') {
      if (!same(c, cell(u))) u.facing = grid.face(cell(u), c);
      A.sfx('confirm'); endTurn(u);
    } else if (mode === 'command') {
      const o = unitAt(c); sel = o;
      if (o && order === 'phase' && o.side === 'hero' && left.includes(o) && o !== u && !u.moved && !u.acted) { active = o; o.moved = o.acted = false; o.at0 = cell(o); A.sfx('blip'); }   // phases: any hero who hasn't gone
      else A.sfx('select');
    }
  }
  function back() {
    const u = active;
    if (mode === 'move' || mode === 'target' || mode === 'face') { mode = 'command'; cells = null; cursor = cell(u); A.sfx('cancel'); return; }
    if (mode === 'command' && u.moved && !u.acted && !u.path) {   // undo the move
      const [x, y] = map.center(...u.at0); u.cx = u.at0[0]; u.cy = u.at0[1]; u.x = x; u.y = y; u.z = top(...u.at0); u.moved = false; cursor = cell(u); A.sfx('cancel'); menuI = 0;
    }
  }
  // the step the keys ask for, on the grid: turned from the screen (a small bias splits iso's diagonals the same way each time)
  const tapped = () => { const I = game.input, x = (I.pressed('right') ? 1 : 0) - (I.pressed('left') ? 1 : 0), y = (I.pressed('down') ? 1 : 0) - (I.pressed('up') ? 1 : 0); return x || y ? [x, y] : null; };
  function keyDir() {
    const t = tapped(), m = t || game.input.move(); if (Math.hypot(m[0], m[1]) < .5) return null;
    if (t) hold = 0;   // (a tap shorter than a step still moves it)
    const g = game.view.screenDirToGround(m[0], m[1]), a = Math.atan2(g[1], g[0]) + .01, k = Math.round(a / (Math.PI / 2));
    return [Math.round(Math.cos(k * Math.PI / 2)), Math.round(Math.sin(k * Math.PI / 2))];
  }
  // the HUD's boxes this frame (taps and clicks hit them): the command list's rows, TURN
  let ui = { rows: [], turn: null };
  const hitBox = (b, p) => b && p && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h;
  function playerInput(dt) {
    const I = game.input, u = active, tap = I.clicked(), p = I.pointer();
    if (I.pressed('turnL') || I.pressed('turnR') || (tap && hitBox(ui.turn, tap))) { game.rotateView(I.pressed('turnL') ? -90 : 90); A.sfx('select'); return; }
    if (mode === 'command') {
      const rs = rows(u), k = tap ? ui.rows.findIndex(b => hitBox(b, tap)) : -1;
      if (k >= 0) { menuI = k; command(rs[k]); return; }
      if (p && !same(p, ptr)) { const h = ui.rows.findIndex(b => hitBox(b, p)); if (h >= 0) menuI = h; }
      const t = tapped(), m = t || I.move(), dy = Math.abs(m[1]) > .5 ? Math.sign(m[1]) : 0; if (t) hold = 0;
      if (dy && hold <= 0) { menuI = (menuI + dy + rs.length) % rs.length; A.sfx('select'); hold = held ? .09 : .25; held = true; } else if (!dy) { held = false; hold = 0; }
      hold -= dt;
      if (I.pressed('confirm')) { command(rs[menuI]); return; }
      if (I.pressed('cancel')) { back(); return; }
    } else {
      const d = keyDir();
      if (d && hold <= 0) { const c = [clamp(cursor[0] + d[0], 0, map.w - 1), clamp(cursor[1] + d[1], 0, map.h - 1)]; if (!same(c, cursor)) { cursor = c; aimLook(c); A.sfx('blip'); } hold = held ? .09 : .22; held = true; } else if (!d) { held = false; hold = 0; }
      hold -= dt;
      if (I.pressed('confirm')) { confirmAt(cursor); return; }
      if (I.pressed('cancel')) { back(); return; }
    }
    // the mouse's pointer moves the cursor over the map; a click or tap there confirms on that cell (map.pick)
    if (p && !same(p, ptr) && I.lastDevice !== 'touch' && !ui.rows.some(b => hitBox(b, p))) { const h = map.pick(p[0], p[1], game); if (h && !same([h.cx, h.cy], cursor)) cursor = [h.cx, h.cy]; }
    if (tap && !ui.rows.some(b => hitBox(b, tap))) {
      const h = map.pick(tap[0], tap[1], game); if (!h) return;
      const c = [h.cx, h.cy]; cursor = c;
      if (mode === 'command') confirmAt(c);
      else if (cells && cells.some(k => same(k, c))) confirmAt(c);
      else if (mode !== 'face') { sel = unitAt(c); A.sfx('select'); }
      else confirmAt(c);
    }
  }

  /* ---- 7. EACH STEP: the rigs, the walks, the arrows, the queue of beats, the player or the scene ---- */
  function update(dt) {
    const I = game.input;
    for (const u of units) {
      if (u.path) {   // along the path a step at a time, hopping up or down a level
        u.st += dt / STEP;
        while (u.path && u.st >= 1) { u.st -= 1; u.seg++; if (u.seg >= u.path.length - 1) { const [cx, cy] = u.path[u.path.length - 1]; u.cx = cx; u.cy = cy; u.path = null; const f = u.after; u.after = null; if (f) f(); } else A.sfx('step', { vol: .4 }); }
        if (u.path) {
          const a = u.path[u.seg], b = u.path[u.seg + 1], [ax, ay] = map.center(...a), [bx, by] = map.center(...b), k = u.st, za = top(...a), zb = top(...b);
          u.x = lerp(ax, bx, k); u.y = lerp(ay, by, k); u.z = lerp(za, zb, k) + (za !== zb ? Math.sin(k * Math.PI) * (6 + Math.abs(zb - za) * .4) : 0); u.facing = [b[0] - a[0], b[1] - a[1]]; u.cx = b[0]; u.cy = b[1];
        }
      }
      if (!u.path) { const [x, y] = map.center(u.cx, u.cy); u.x = x; u.y = y; u.z = top(u.cx, u.cy); }
      if (u.swing) { u.swing.update(dt); if (!u.swing.phase) u.swing = null; }
      u.hit = Math.max(0, u.hit - dt); if (u.dead) u.die += dt;
      const walking = !!u.path, f = Math.atan2(u.facing[1], u.facing[0]);
      u.rig.update(dt, { x: u.x, y: u.y, z: u.z, vx: walking ? Math.cos(f) * T / STEP : 0, vy: walking ? Math.sin(f) * T / STEP : 0, facing: f, attack: u.swing ? u.swing.state : null,
        pose: u.dead ? 'die' : over && over.won && u.side === 'hero' ? 'cheer' : null, hurt: u.hit > 0 ? u.hit * 4 : 0, look: [Math.cos(f), Math.sin(f)] });
    }
    for (let i = arrows.length - 1; i >= 0; i--) { const a = arrows[i]; a.t += dt / a.dur; if (a.t >= 1) { arrows.splice(i, 1); a.then(); } }
    if (banner) banner.t += dt; if (msg) msg.t += dt;
    // the camera: toward what it looks at, a drag panning it (touch)
    const dr = I.drag(); if (dr && (Math.abs(dr[0]) + Math.abs(dr[1]) > 0)) { const g = game.view.screenDirToGround(-dr[0], -dr[1]), l = Math.hypot(dr[0], dr[1]) / (game.view.scale || 1); look[0] += g[0] * l; look[1] += g[1] * l; }
    game.focus(look[0], look[1], look[2]);
    if (mode === 'scene') { if (I.pressed('skip')) { story.stop(); order = 'ct'; begin(); } else story.update(dt); ptr = I.pointer(); return; }
    if (mode === 'over') { over.t += dt; if (over.t > 1.6) endMenu.update(dt); return; }
    if (queue.length && !units.some(u => u.path) && !arrows.length && !acting) { wait += dt; if (wait >= queue[0][0]) { wait = 0; queue.shift()[1](); } }
    if (!auto && active && active.side === 'hero' && (mode === 'command' || mode === 'move' || mode === 'target' || mode === 'face')) playerInput(dt);
    if (mode === 'face') { const d = keyDir(); if (d) active.facing = d; }
    ptr = I.pointer();
  }

  /* ---- 8. DRAWING: a sky, the map on its base, its trees and banners, the ranges, the units, the cursor, the HUD ---- */
  function draw(r) {
    r.sky(['#16203e', '#2e4a78', '#7a9ab8', '#c8c0a8']);
    map.drawFloor(r); map.queueWalls(r);
    for (const s of map.spawns) { const z = top(s.cx, s.cy); if (s.tag === 'tree') r.prop(E.hash2(s.cx, s.cy) < .5 ? 'tree' : 'pine', s.x, s.y, z); else r.prop(s.tag, s.x, s.y, z); }
    // ranges: blue to move, red to strike, gold the blow's area, the selected unit's reach faint when it isn't its turn
    const h = (x, y) => top(x, y) + .5;
    if (cells && mode === 'move') E.tint(r, cells, '#3a9aff', .6, T, h);
    if (cells && mode === 'target') { E.tint(r, cells, '#ff3a4a', .55, T, h); if (cells.some(c => same(c, cursor))) E.tint(r, hitCells(ACTS[pending], cell(active), cursor), '#ffd040', .7, T, h); }
    if (cells && mode === 'ai') E.tint(r, cells, '#ff6a2a', .5, T, h);
    if (cells && mode === 'face') E.tint(r, cells, '#ffe060', .3, T, h);
    if (mode !== 'scene') for (const u of units) if (!u.dead) E.tint(r, [cell(u)], u.side === 'hero' ? '#4ab0ff' : '#ff4a4a', u === active ? .55 : .22, T, h);
    for (const u of units) {
      if (u.dead && u.die > 1.2) continue;
      r.shadow(u.x, u.y, 6, .4, '#0c0818', u.z);
      r.actor(u.x, u.y, u.z, (g, ox, oy) => { u.rig.draw(g, ox, oy, r.view); if (u.bow) bowOf(g, u, ox, oy, r.view); }, { flash: u.hit > .15 && '#ffffff', alpha: u.dead ? Math.max(0, 1 - (u.die - .6) * 1.6) : 1, xray: u === active && !u.dead });   // (x-ray is for one: the unit whose turn it is)
    }
    for (const a of arrows) {   // an arrow on its arc, pointing along it
      const k = a.t, z = lerp(a.a[2], a.b[2], k) + Math.sin(k * Math.PI) * 18, x = lerp(a.a[0], a.b[0], k), y = lerp(a.a[1], a.b[1], k), k2 = Math.min(1, k + .06), z2 = lerp(a.a[2], a.b[2], k2) + Math.sin(k2 * Math.PI) * 18;
      const x2 = lerp(a.a[0], a.b[0], k2), y2 = lerp(a.a[1], a.b[1], k2);
      r.actor(x, y, z, (g, ox, oy) => { const [p, q] = r.view.p(x2 - x, y2 - y, z2 - z), l = Math.hypot(p, q) || 1; px.line(g, ox - p / l * 4, oy - q / l * 4, ox + p / l * 3, oy + q / l * 3, '#e8dcc0'); px.dot(g, ox + p / l * 3, oy + q / l * 3, '#ffffff'); });
    }
    cursorDraw(r);
    hud(r);
    if (mode === 'scene') story.draw(r);
  }
  // an archer's bow in the left hand: a curve of wood and its string, upright
  function bowOf(g, u, ox, oy, v) {
    const [hx, hy, hz] = u.rig.hand('L'), [p, q] = v.p(hx - u.x, hy - u.y, hz - u.z), x = Math.round(ox + p), y = Math.round(oy + q);
    for (let i = -6; i <= 6; i++) px.dot(g, x + Math.round(2.4 * Math.cos(i / 6 * 1.2)) - 2, y + i, i % 3 ? '#8a5a2a' : '#5a3a1a');
    px.line(g, x - 1, y - 6, x - 1, y + 6, '#e8e0d0');
  }
  // the cursor: a pulsing diamond round the cell's top, and an arrow over a unit there
  function cursorDraw(r) {
    if (mode === 'scene' || mode === 'over' || !map) return;
    const [cx, cy] = cursor, z = top(cx, cy), pts = [[cx, cy], [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1]].map(([a, b]) => r.w(a * T, b * T, z)), k = .5 + .5 * Math.sin(game.real * 7), o = unitAt(cursor);
    r.overlay(g => {
      for (let i = 0; i < 4; i++) { const [a, b] = pts[i], [c, d] = pts[(i + 1) % 4]; px.line(g, a, b, c, d, k > .5 ? '#ffffff' : '#ffe070'); }
      if (o) { const [x, y] = r.w(o.x, o.y, o.z + 40 + Math.sin(game.real * 6) * 2); px.poly(g, [[x - 4, y - 4], [x + 4, y - 4], [x, y + 1]], '#ffe070'); px.line(g, x - 4, y - 5, x + 4, y - 5, '#fff8d0'); }
    });
  }
  function hud(r) {
    const W = r.W, H = r.H, tc = touch(), u = active;
    r.overlay(g => {
      // small HP bars over every unit
      for (const o of units) { if (o.dead || mode === 'scene') continue; const [x, y] = r.w(o.x, o.y, o.z + 36); px.rect(g, x - 8, y, 16, 3, '#140c18'); px.rect(g, x - 7, y + 1, Math.max(1, Math.round(14 * o.hp / o.max)), 1, o.side === 'hero' ? '#5ad86a' : '#ff5a4a'); }
      if (over) return;   // (the results alone)
      if (mode === 'scene') { if (!tc) E.font.text(g, prompt('skip', 'SKIPS'), W - 4, 4, '#a8a0c0', { align: 'right', outline: false, font: 'tiny' }); return; }
      // the order ahead (charge time) or who is left this phase
      const list = order === 'ct' ? (turns && u ? turns.order(7) : []) : left;
      E.ui.box(g, 4, 4, 74, 12 + list.length * 10, { alpha: .78 });
      E.font.text(g, order === 'ct' ? 'ORDER' : phase === 'hero' ? 'PLAYER PHASE' : 'ENEMY PHASE', 9, 7, '#ffe8b0', { outline: false, font: 'tiny' });
      list.forEach((o, i) => { const y = 16 + i * 10; px.rect(g, 9, y + 1, 4, 5, o.side === 'hero' ? '#4ab0ff' : '#ff5a4a'); E.font.text(g, o.name, 16, y, o === u ? '#ffffff' : '#c8c0d8', o === u ? { outline: false } : { outline: false, font: 'tiny' }); });
      if (order === 'phase') E.font.text(g, 'ROUND ' + round, 9, 18 + list.length * 10, '#a8a0c0', { outline: false, font: 'tiny' });
      // the unit whose turn it is (bottom left) and the one under the cursor or selected (bottom right)
      const shown = sel && !sel.dead ? sel : unitAt(cursor);
      if (u && !u.dead) panel(g, u, 4, H - 46, u.side === 'hero' ? 'TURN' : 'ENEMY');
      if (shown && shown !== u) panel(g, shown, Math.max(84, (tc ? cornerX() : W) - 118), H - 46, shown.side === 'hero' ? 'ALLY' : 'FOE');
      // the forecast while aiming: what the blow does to the unit under the cursor
      if (mode === 'target' && cells && cells.some(c => same(c, cursor))) {
        const a = ACTS[pending], hit = hitCells(a, cell(u), cursor).map(unitAt).filter(o => o && (o !== u || a.kind === 'heal'));
        const lines = hit.slice(0, 3).map(o => { const b = blow(u, a, cell(u), o); return [o.name + (b.heal ? '  +' + b.amount : '  -' + b.amount + (b.side !== 'front' ? ' ' + b.side.toUpperCase() : '')), o.side === u.side ? '#8affc0' : '#ffd0a0']; });
        if (lines.length) { const w = Math.max(...lines.map(l => E.font.width(l[0]))) + 12, x = Math.round(W / 2 - w / 2); E.ui.box(g, x, H - 64, w, 8 + lines.length * 10, { alpha: .85 }); lines.forEach((l, i) => E.font.text(g, l[0], x + 6, H - 60 + i * 10, l[1], { outline: false })); }
      }
      // the banner, the message, the hint
      if (banner && banner.t < 1.4) { const a = banner.t < .2 ? banner.t / .2 : banner.t > 1.1 ? (1.4 - banner.t) / .3 : 1; px.blend(g, a * .75, 'normal', () => px.rect(g, 0, H / 2 - 22, W, 26, '#0a0816')); E.font.title(g, banner.s, W / 2, H / 2 - 18, { align: 'center', scale: 2, colors: ['#ffffff', banner.c, E.mix(banner.c, '#000000', .4)] }); }
      if (msg && msg.t < 2.2) E.font.text(g, msg.s, W / 2, 6, msg.c, { align: 'center', shadow: '#000', outline: false });
      if (!tc && u && u.side === 'hero' && mode !== 'busy' && mode !== 'anim' && mode !== 'ai') E.font.text(g, mode === 'command' ? 'UP DOWN CHOOSE  Z OK  X BACK  Q E TURN' : mode === 'face' ? 'ARROWS FACE  Z OK  X BACK' : 'ARROWS MOVE  Z OK  X BACK  Q E TURN', W / 2, H - 9, '#a8a0c0', { align: 'center', outline: false, font: 'tiny' });
      // TURN (touch)
      ui.turn = null;
      if (tc) { const bw = 40, bh = Math.max(16, Math.ceil(44 * game.screen.dpr / game.screen.S)), x = cornerX() - bw - 2, y = 4; ui.turn = { x, y, w: bw, h: bh }; E.ui.box(g, x, y, bw, bh, { alpha: .8 }); E.font.text(g, 'TURN', x + bw / 2, y + bh / 2 - 3, '#ffffff', { align: 'center', outline: false }); }
    });
    commandDraw(r);
    if (over) overDraw(r);
  }
  // a unit's card: name and class, HP and MP, move and jump, the way it faces
  function panel(g, o, x, y, tag) {
    E.ui.box(g, x, y, 114, 42, { alpha: .82 });
    E.font.text(g, o.name, x + 5, y + 4, o.side === 'hero' ? '#a8d8ff' : '#ffb0a0', { outline: false });
    E.font.text(g, o.cls + '  ' + tag, x + 109, y + 5, '#a8a0c0', { align: 'right', outline: false, font: 'tiny' });
    E.ui.bar(g, x + 5, y + 15, 70, 4, o.hp / o.max, o.hp > o.max * .3 ? '#5ad86a' : '#ff4a4a'); E.font.text(g, o.hp + '/' + o.max, x + 79, y + 14, '#e8e0f0', { outline: false, font: 'tiny' });
    if (o.mmp) { E.ui.bar(g, x + 5, y + 22, 70, 3, o.mp / o.mmp, '#5a8aff'); E.font.text(g, o.mp + ' MP', x + 79, y + 21, '#b0c8ff', { outline: false, font: 'tiny' }); }
    E.font.text(g, 'MOVE ' + o.move + '  JUMP ' + o.jump + '  SPD ' + Math.round(o.speed / 10), x + 5, y + 31, '#c8c0d8', { outline: false, font: 'tiny' });
  }
  // the command list (right): rows a thumb's height on a touch screen
  function commandDraw(r) {
    ui.rows = [];
    if (mode !== 'command' || !active || active.side !== 'hero' || auto) return;
    const rs = rows(active), tc = touch(), rh = tc ? Math.max(16, Math.ceil(44 * game.screen.dpr / game.screen.S)) : 12, w = 86, x = (tc ? cornerX() : r.W) - w - 4, h = rs.length * rh + 14, y = Math.max(tc ? 30 : 20, Math.round(r.H / 2 - h / 2) - 10);
    r.overlay(g => {
      E.ui.box(g, x, y, w, h, { alpha: .88 });
      E.font.text(g, active.name, x + 6, y + 3, '#ffe8b0', { outline: false, font: 'tiny' });
      rs.forEach((row, i) => {
        const ry = y + 11 + i * rh; ui.rows.push({ x, y: ry, w, h: rh });
        if (i === menuI) { px.rect(g, x + 3, ry, w - 6, rh - 1, '#2a3a7a'); px.poly(g, [[x + 5, ry + rh / 2 - 3], [x + 9, ry + rh / 2], [x + 5, ry + rh / 2 + 3]], '#ffe070'); }
        E.font.text(g, row.label, x + 12, ry + rh / 2 - 3, row.off ? '#5a5670' : '#ffffff', { outline: false });
        if (row.note) E.font.text(g, row.note, x + w - 6, ry + rh / 2 - 2, row.off ? '#5a5670' : '#8ab0ff', { align: 'right', outline: false, font: 'tiny' });
      });
    });
  }
  function overDraw(r) {
    const k = Math.min(1, over.t / .8), W = r.W, H = r.H, cy = Math.round(H / 2);
    r.overlay(g => {
      g.fillStyle = 'rgba(4,2,10,' + (.6 * k).toFixed(2) + ')'; g.fillRect(0, 0, r.bw, r.bh); E.px.reset(g);
      E.font.title(g, over.won ? 'VICTORY' : 'DEFEAT', W / 2, cy - 70, { align: 'center', scale: 3, colors: over.won ? ['#fff8d0', '#ffd060', '#e07a2a'] : ['#ffd0d0', '#ff5a5a', '#8a1a2a'] });
      const mvp = Object.entries(stats.dealt).sort((a, b) => b[1] - a[1])[0], lines = [over.won ? 'THORNWATCH IS TAKEN' : 'THE LEGION HOLDS THORNWATCH', 'TURNS ' + stats.turns + '   HEROES STANDING ' + living('hero').length + ' OF 4', mvp ? 'MOST DAMAGE: ' + mvp[0] + ' (' + mvp[1] + ')' : ''];
      lines.forEach((s, i) => E.font.text(g, s, W / 2, cy - 20 + i * 11, i ? '#e8e0f0' : '#ffe070', { align: 'center', shadow: '#000', outline: false }));
      endMenu.y = cy + 26;
    });
    if (over.t > 1.6) endMenu.draw(r);
  }

  /* ---- 9. THE BOT: the heroes' own AI plays the battle, through the same orders a player's commands give: by charge
   * time twice (the AI's turns repeat: the same battle), then by phases (tools/kits-test.mjs) ---- */
  function bot(o = {}) {
    const was = Math.random, one = phases => {
      Math.random = E.rng(o.seed || 1);
      game.time = 0; game.timeScale = 1; game.go('tactics', { part: phases ? 'phases' : 'battle', auto: true }, { fade: 0 }); game.advance(1 / 120);
      for (let i = 0; i < 40000 && !over; i++) game.advance(1 / 30);
      return { won: !!(over && over.won), turns: stats.turns, heroes: living('hero').length, hp: living('hero').map(u => u.hp), dealt: stats.dealt };
    };
    try {
      const a = one(false), b = one(false), p = one(true);
      return Object.assign(a, { repeat: JSON.stringify(a) === JSON.stringify(b), phases: p, errors: game.errors.length });
    } finally { Math.random = was; }
  }

  return { view: 'iso', views: ['iso'], res: 'ps1', pausable: true, propSize: 1, touch: [], camera: { zoom: [.75, 2], start: 1, tall: 1.35 },
    input: { ...E.Input.DEFAULT, turnL: ['KeyQ', 'Pad4'], turnR: ['KeyE', 'Pad5'], skip: ['KeyX', 'Pad8'], skill: ['KeyL', 'Mouse2', 'Pad2'] },
    enter: start, update, draw, bot,
    exit() { game.input.steer = 'stick'; game.resetCamera(); },
    back() { if (mode === 'move' || mode === 'target' || mode === 'face') { back(); return true; } return false; },   // a phone's back: aiming goes back to the commands
    /** for tests: the state, and helpers to find a cell or a row on the screen and to place a unit */
    state: () => ({ mode, order, phase, round, active, cursor, sel, units, cells, over, stats, map, grid, turns, rows: active ? rows(active) : [], ui,
      at: (cx, cy) => { const v = game.view, [x, y] = map.center(cx, cy), q = v.p(x, y, top(cx, cy)); return [q[0] - game.screen.ix, q[1] - game.screen.iy]; },
      place: (u, cx, cy) => { u.cx = cx; u.cy = cy; u.path = null; }, plan: u => plan(u), reach: u => reachOf(u) }),
    /** the proof: the scene's lines and its first choice (charge time), then the cursor walked about and confirmed; the
     *  Legion's turns between; a hash of every unit's cell and HP and the turns taken */
    run: (n = 600) => proof('tactics', n, (i, k) => { if (i % 30 === 10) k.tap('confirm'); walk(i, k, ['up', 'left', 'down', 'right'], 50); },
      () => [mode, stats.turns, units.map(u => [u.cx, u.cy, u.hp, u.mp, u.dead])]) };
})();
scenes.tactics = TACTICS;

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
