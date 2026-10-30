// The ARTILLERY kit's game (two teams of three on an island every blast carves: turns, aim and power, wind, a rocket, a bouncing grenade, a cluster bomb, falls and the sea, a CPU that tries its shots in simulation), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 159 (src/starter/34-artillery.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. artillery.html plays it; node kits/test.mjs artillery runs it headless.
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
 * SLICE 20  ARTILLERY  (Worms, Scorched Earth). @modules physics terrain grid
 * BLAST ISLAND: two teams of three grubs on an island of earth, rock and sand that every blast carves. The teams take
 * turns (E.Turns, the grid module's), each sending its next grub; in its thirty seconds a grub walks, jumps, aims and
 * fires. Three weapons: a ROCKET the wind blows, a GRENADE that bounces (a physics body on the terrain's collider) and
 * blows on its fuse, a CLUSTER bomb that bursts into five (two a team). A blast throws grubs; a long fall hurts; the sea
 * drowns; from turn 16 the sea rises (sudden death). One player against the CPU, two players on one screen in turn, or
 * two CPUs. The CPU tries its shots in simulation (each weapon at every angle and power, with the wind and the fuse as
 * they are), takes the one that hurts its foes most and its own least, and fires it with a hand a little unsteady.
 * Keys: left and right (A, D) walk, up and down (W, S) aim, hold Space to charge and let go to fire, Enter jumps, Q or E
 * (or 1, 2, 3) picks the weapon. MOUSE: drag back from anywhere and let go to fire (the pull is the power); a click
 * walks there. TOUCH: the same: a drag back fires, a tap walks; the JUMP and WEAPON buttons. HOW IT WORKS: E.Terrain is
 * the island (carve, ground, walk, ray); E.Physics bounces the grenades on land.collider(); E.Turns alternates the
 * teams. bot() lets two CPUs play a match to its end, twice (tools/kits-test.mjs). Deep links: #artillery (the choice
 * of players), #artillery/cpu (two CPUs at once).
 * ===================================================================================== */
const ARTILLERY = (() => {
  const WW = 800, WH = 320, SKY = 560, DT = 1 / 120, px = E.px, clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  E.VIEWS.artillery = E.VIEWS.artillery || new E.View('artillery', 'Island', 0, 0, 1, 1);   // a side view of whole pixels: the terrain stays crisp
  const SOIL = { color: '#7a4a2a', top: '#52a83a', edge: '#3a2210', depth: 3 }, ROCK = { color: '#6a6878', top: '#9a98a8', edge: '#34323e', depth: 2 }, SAND = { color: '#c8a868', top: '#e8d098', edge: '#8a6a3a', depth: 2 };
  const TEAMS = [
    { name: 'RED GRUBS', short: 'RED', color: '#ff5a4a', dark: '#8a1a1a', grubs: ['SPUD', 'NIBBS', 'BOFF'] },
    { name: 'BLUE GRUBS', short: 'BLUE', color: '#4ab4ff', dark: '#1a4a8a', grubs: ['WIGGLE', 'DOT', 'MUNCH'] }];
  // speed: at full power, pixels a second; r and dmg: the blast's reach and its damage at the middle
  const WEAPONS = [
    { id: 'rocket', name: 'ROCKET', speed: 520, wind: true, r: 28, dmg: 45 },
    { id: 'grenade', name: 'GRENADE', speed: 400, fuse: 3, r: 30, dmg: 45 },
    { id: 'cluster', name: 'CLUSTER', speed: 440, r: 16, dmg: 20, ammo: 2, bits: 5 }];
  const BIT = { id: 'bit', r: 14, dmg: 16 }, G_SHOT = 300, G_GRUB = 420, HP = 80, TURN_T = 30, SUDDEN = 16, PULL = 70;
  const PHYS = { gravity: [0, -G_SHOT], substeps: 2, iterations: 4, sleep: false }, GREN = { bounce: .45, friction: .5, damping: .1 }, FUSE_N = Math.round(3 / DT);
  const SONG = { bpm: 112, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'G4 . B4 . D5 - B4 . C5 . A4 . F#4 . D4 . | G4 . B4 . D5 . G5 - F#5 . E5 . D5 . C5 . | B4 . G4 . A4 . F#4 . G4 - - . . . D4 .' },
    { wave: 'triangle', vol: .28, notes: 'G2 . D3 . G2 . D3 . D2 . A2 . D2 . A2 . | G2 . D3 . G2 . D3 . C2 . G2 . D2 . A2 . | G2 . D3 . D2 . A2 . G2 . . . G2 . . .' },
    { wave: 'drums', vol: .09, notes: 'k . h . s . h . k k h . s . h h' }] };
  const KEYS = Object.assign({}, E.Input.DEFAULT, { walkL: ['ArrowLeft', 'KeyA', 'Pad14'], walkR: ['ArrowRight', 'KeyD', 'Pad15'], aimUp: ['ArrowUp', 'KeyW', 'Pad12'], aimDown: ['ArrowDown', 'KeyS', 'Pad13'],
    fire: ['Space', 'Pad0', 'Pad7'], jump: ['Enter', 'NumpadEnter', 'KeyJ', 'Pad2'], weapon: ['KeyQ', 'KeyE', 'Pad3', 'Pad5'], w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'] });

  /* ---- 1. THE ISLAND: hills of earth over rock, beaches of sand, a few caves; the grubs spread along it, the teams mixed ---- */
  let land, back, profile, grubs = [], teams, turns, water = 34;
  function island(seed) {
    const rnd = E.rng(seed), p = [0, 1, 2, 3].map(() => rnd() * Math.PI * 2), mid = 118 + rnd() * 40;
    const top = x => { const e = clamp(Math.min(x - 24, WW - 24 - x) / 130, 0, 1), s = e * e * (3 - 2 * e); return 6 + (mid + 44 * Math.sin(x / 110 + p[0]) + 24 * Math.sin(x / 47 + p[1]) + 8 * Math.sin(x / 17 + p[2])) * s; };
    const H = []; for (let x = 0; x < WW; x++) H[x] = top(x + .5);
    land = new E.Terrain({ w: WW, h: WH, materials: [SOIL, ROCK, SAND], chunk: 64 });
    back = E.mkCanvas(WW, WH); const bg = E.ctx2d(back), img = bg.createImageData(WW, WH), D = img.data;   // (the earth behind: what a cave or a deep crater shows)
    for (let x = 0; x < WW; x++) for (let y = 0; y < H[x] - 7; y++) { const o = ((WH - 1 - y) * WW + x) * 4, n = (E.hash2(x >> 1, y >> 1) - .5) * 10, rock = y < H[x] - 30; D[o] = (rock ? 40 : 52) + n; D[o + 1] = (rock ? 36 : 32) + n; D[o + 2] = (rock ? 44 : 26) + n; D[o + 3] = 255; }
    bg.putImageData(img, 0, 0); profile = null;
    land.fill((x, y) => { const h = H[Math.floor(x)]; return y >= h ? 0 : h < water + 18 ? 3 : y < h - 28 - 12 * Math.sin(x / 31 + p[3]) ? 2 : 1; });
    for (let i = 0; i < 4; i++) { const x = 150 + rnd() * (WW - 300), h = H[Math.floor(x)]; if (h > water + 70) land.carve(x, water + 26 + rnd() * (h - water - 64), 11 + rnd() * 9); }   // (caves inside the hills)
    // six places along the land, the teams in turn, each nudged a little
    grubs = [];
    for (let i = 0; i < 6; i++) {
      let x = 100 + (i + .5) * (WW - 200) / 6 + (rnd() - .5) * 40; for (let k = 0; k < 40 && !((land.ground(x, WH) || 0) > water + 10); k++) x += x < WW / 2 ? 6 : -6;
      grubs.push(grub(i % 2, TEAMS[i % 2].grubs[i >> 1], x));
    }
  }
  const grub = (team, name, x) => ({ team, name, x, y: land.ground(x, WH) || water + 20, vx: 0, vy: 0, ground: true, hp: HP, shown: HP, face: x < WW / 2 ? 1 : -1, aim: .5, dead: false, drowned: false, sunk: 0, fly: false, jump: false, hurt: 0, walkT: 0, goto: null, still: 0 });

  /* ---- 2. THE RULES: a turn each, the shots and their blasts, damage, falls and the sea, the end ---- */
  let look = { x: 0, y: 0, t: 0 }, mode = 'menu', modeT = 0, play = 'cpu', cur = null, phase = 'aim', phT = 0, turnT = 0, turnNo = 0, wind = 0, shots = [], power = 0, charging = false, cpu = null, stats, banner = null, winner = -1, pull = null, menuI = 0, matchSeed = 1;
  function begin(how, seed) {
    play = how; matchSeed = seed || 1 + Math.floor(Math.random() * 1e6); water = 34; island(matchSeed); shots = []; winner = -1; turnNo = 0; mode = 'play'; modeT = 0;
    teams = TEAMS.map((T, i) => ({ i, speed: 100, next: 0, human: how === 'two' || (how === 'cpu' && i === 0), ammo: WEAPONS.map(w => w.ammo === undefined ? Infinity : w.ammo), weapon: 0 }));
    turns = new E.Turns(teams, { mode: 'speed' });   // (two actors of one speed: they alternate)
    stats = { shots: 0, used: {}, kills: 0, drowned: 0, falls: 0, carved: 0, damage: 0 };
    game.input.consumeAll(); A.music(how === 'demo' ? null : SONG); startTurn();
  }
  // the next team's next grub still standing
  function nextGrub() {
    for (let k = 0; k < 2; k++) { const t = turns.next(), mine = grubs.filter(g => g.team === t.i); for (let j = 0; j < mine.length; j++) { const g = mine[(t.next + j) % mine.length]; if (!g.dead) { t.next = (mine.indexOf(g) + 1) % mine.length; return g; } } }
    return null;
  }
  function startTurn() {
    turnNo++; cur = nextGrub(); look.t = 0; phase = 'aim'; phT = 0; turnT = TURN_T; power = 0; charging = false; pull = null;
    wind = Math.round((Math.random() * 2 - 1) * 10) / 10;
    if (turnNo > SUDDEN) { water += 8; banner = { s: 'THE SEA RISES', sub: 'SUDDEN DEATH', t: 1.6, team: -1 }; }
    else banner = { s: cur.name, sub: TEAMS[cur.team].name + (play === 'two' ? '  PLAYER ' + (cur.team + 1) : teams[cur.team].human ? '  YOU' : '  CPU'), t: 1.4, team: cur.team };
    cpu = teams[cur.team].human ? null : { phase: 'think', t: 0, i: 0, cands: null, best: null };
    A.sfx('select');
  }
  const weapon = () => WEAPONS[teams[cur.team].weapon];
  function pickWeapon(i) { const t = teams[cur.team]; for (let k = 0; k < 3; k++, i = (i + 1) % 3) if (t.ammo[i] > 0) { if (t.weapon !== i) A.sfx('blip'); t.weapon = i; return; } }
  // the shot's start: from the grub's middle, a little out along the aim (ang: radians, 0 right, up positive)
  const muzzle = (g, ang, pw, W) => { const sp = Math.max(.15, pw) * W.speed; return [g.x + Math.cos(ang) * 8, g.y + 6 + Math.sin(ang) * 8, Math.cos(ang) * sp, Math.sin(ang) * sp]; };
  function fire(g, ang, pw) {
    const t = teams[g.team], W = weapon(), [x, y, vx, vy] = muzzle(g, ang, pw, W);
    if (W.id === 'grenade') { const w = new E.Physics(PHYS); w.add(land.collider()); const b = w.circle(x, y, 2.5, GREN); b.vx = vx; b.vy = vy; shots.push({ w: W, body: b, world: w, n: 0, x, y }); }
    else shots.push({ w: W, x, y, vx, vy, t: 0, owner: g });
    t.ammo[t.weapon]--; if (t.ammo[t.weapon] <= 0) pickWeapon(0);
    stats.shots++; stats.used[W.id] = (stats.used[W.id] || 0) + 1; phase = 'fly'; phT = 0; charging = false; power = 0; pull = null; cur.goto = null;
    A.sfx(W.id === 'rocket' ? 'shoot' : 'swing'); P.smoke(x, 0, y, 3, { size: 3 });
  }
  // one step of a rocket's, a cluster's or a bomblet's flight: gravity, the wind (a rocket's), the ground and the grubs in
  // its way; 'hit' (at its x, y), 'sea', 'gone', or null (still flying). The CPU's simulation runs this same step
  function fly(s, dt, owner) {
    s.vy -= G_SHOT * dt; if (s.w.wind) s.vx += wind * 90 * dt; s.t += dt;
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt, hit = land.ray(s.x, s.y, nx, ny);
    if (hit) { s.x = hit[0]; s.y = hit[1]; return 'hit'; }
    s.x = nx; s.y = ny;
    for (const g of grubs) if (!g.dead && (g !== owner || s.t > .25) && Math.hypot(g.x - s.x, g.y + 5 - s.y) < 6) return 'hit';
    return s.y < water ? 'sea' : s.x < -60 || s.x > WW + 60 || s.t > 12 ? 'gone' : null;
  }
  // a cluster's five, thrown up in a fan from where it burst
  const bits = (x, y) => [0, 1, 2, 3, 4].map(k => ({ w: BIT, x, y: y + 3, vx: (k - 2) * 55, vy: 160 + (2 - Math.abs(k - 2)) * 25, t: 0, owner: null }));
  function stepShots(dt) {
    if (!dt) return;   // (a hit-stop: nothing moves, and a fuse waits)
    for (const s of shots.slice()) {
      if (s.body) {   // a grenade: its own physics world, the island its collider
        s.world.step(dt); s.x = s.body.x; s.y = s.body.y;
        if (s.y < water) { shots.splice(shots.indexOf(s), 1); splash(s.x); }
        else if (++s.n >= FUSE_N) { shots.splice(shots.indexOf(s), 1); blast(s.x, s.y, s.w.r, s.w.dmg); }
        continue;
      }
      const e = fly(s, dt, s.owner);
      if (!e) { if (s.w.wind && Math.floor(s.t * 30) !== Math.floor((s.t - dt) * 30)) P.smoke(s.x, 0, s.y, 1, { size: 2 }); continue; }
      shots.splice(shots.indexOf(s), 1);
      if (e === 'hit') { blast(s.x, s.y, s.w.r, s.w.dmg); if (s.w.bits) shots.push(...bits(s.x, s.y)); }
      else if (e === 'sea') splash(s.x);
    }
  }
  function splash(x) { for (let i = 0; i < 10; i++) P.add({ kind: 'bit', x: x + (i - 5) * .8, y: 0, z: water + 1, vx: (i - 5) * 14, vz: 80 + (i % 3) * 30, g: 300, max: .7, color: '#cfe8ff', size: 1 }); A.sfx('land', { vol: .4 }); }
  // a blast: a crater in the island, damage by distance, grubs thrown away from it
  function blast(x, y, r, dmg) {
    const took = land.carve(x, y, r, { particles: P, debris: 14 }); for (const k in took) stats.carved += took[k]; profile = null;
    for (const g of grubs) {
      if (g.dead) continue; const dx = g.x - x, dy = g.y + 5 - y, d = Math.hypot(dx, dy); if (d >= r + 6) continue;
      const k = 1 - d / (r + 6), n = d || 1; hurt(g, Math.round(dmg * k)); g.vx = dx / n * 260 * k; g.vy = Math.max(70, dy / n * 260 * k + 120 * k); g.ground = false; g.fly = true; g.goto = null;
    }
    P.explosion(x, 0, y, r / 22, { debris: false, shake: r / 8 });
  }
  function hurt(g, d) { if (d <= 0) return; g.hp = Math.max(0, g.hp - d); g.hurt = .5; stats.damage += d; P.text(g.x, 0, g.y + 18, '-' + d, TEAMS[g.team].color, { bounce: true }); A.sfx('hurt', { vol: .5 }); }
  function drown(g) { g.dead = g.drowned = true; g.hp = 0; g.sunk = .001; stats.drowned++; splash(g.x); A.sfx('die', { vol: .5 }); }
  function stepGrubs(dt) {
    for (const g of grubs) {
      if (g.dead && (g.drowned || !g.grave)) { if (g.sunk) g.sunk += dt; continue; }
      const was = g.x, landed = land.walk(g, dt, { gravity: G_GRUB, climb: 4, h: 9 });
      if (landed) { if (g.fly || g.jump) { g.vx = 0; g.fly = g.jump = false; } if (landed > 230 && !g.dead) { stats.falls++; hurt(g, Math.round((landed - 230) / 4)); A.sfx('land'); } }
      if (!g.dead && g.y < water - 2) drown(g);
      g.still = g.vx && Math.abs(g.x - was) < 1e-3 ? g.still + dt : 0;
      g.shown += (g.hp - g.shown) * Math.min(1, dt * 5); g.hurt = Math.max(0, g.hurt - dt);
    }
  }
  // the end of a turn: everyone at rest; the beaten blow up one by one (what they throw settles first); a team left wins
  function settle() {
    if (phT < .7 || !grubs.every(g => g.dead || g.ground)) return;
    const dying = grubs.find(g => !g.dead && g.hp <= 0);
    if (dying) { dying.dead = dying.grave = true; stats.kills++; blast(dying.x, dying.y + 4, 12, 8); phT = .2; return; }
    const alive = [0, 1].map(i => grubs.some(g => g.team === i && !g.dead));
    if (!alive[0] || !alive[1] || turnNo >= 60) { over(alive[0] && !alive[1] ? 0 : alive[1] && !alive[0] ? 1 : -1); return; }
    startTurn();
  }
  function over(w) { winner = w; mode = 'over'; modeT = 0; menuI = 0; cur = null; A.music(null); A.sfx(w >= 0 ? 'oneup' : 'cancel'); }

  /* ---- 3. A TURN: the player's hands (keys, a mouse's pull, a finger's), or the CPU's: it tries every shot in simulation,
   * a few each step, then turns, aims and charges to the one it chose ---- */
  function turn(dt, I) {
    const g = cur; phT += dt; if (banner && (banner.t -= dt) <= 0) banner = null;
    if (phase === 'settle') { settle(); return; }
    if (!g || g.dead) { phase = 'settle'; phT = 0; return; }   // (it walked into the sea)
    if (phase === 'aim') { turnT -= dt; if (turnT <= 0) { phase = 'settle'; phT = 0; charging = false; power = 0; pull = null; A.sfx('cancel'); return; } if (turnT < 5 && Math.ceil(turnT) !== Math.ceil(turnT + dt)) A.sfx('blip', { pitch: 1.5 }); }
    const c = cpu ? cpuHands(dt) : hands(I);
    if (phase === 'fly' && !shots.length) { phase = 'settle'; phT = 0; }
    if (g.ground && !g.fly && !g.jump) { g.vx = c.walk * 32; if (c.walk) { g.face = c.walk; g.walkT += dt; } else g.walkT = 0; }
    if (c.jump && g.ground) { g.vy = 150; g.vx = g.face * 70; g.ground = false; g.jump = true; g.goto = null; A.sfx('jump'); }
    if (phase !== 'aim') return;   // (after a shot: the grub may only walk away, a grenade's retreat)
    if (c.aim) g.aim = clamp(g.aim + c.aim * 1.4 * dt, -AIM, AIM);
    if (c.pick >= 0) pickWeapon(c.pick); else if (c.weapon) pickWeapon((teams[g.team].weapon + 1) % 3);
    if (c.shot) { fire(g, c.shot[0], c.shot[1]); return; }
    if (c.charge) { if (!charging) A.sfx('charge', { vol: .3 }); charging = true; power = Math.min(1, power + dt / 1.4); }
    if (charging && (!c.charge || power >= 1)) fire(g, aimAngle(g), power);
  }
  const aimAngle = g => g.face > 0 ? g.aim : Math.PI - g.aim;
  // a world point under a screen point (the view is whole pixels: x across, y up)
  const toWorld = p => [p[0] + game.screen.ix, -(p[1] + game.screen.iy)];
  function hands(I) {
    const g = cur, c = { walk: (I.down('walkR') ? 1 : 0) - (I.down('walkL') ? 1 : 0), aim: (I.down('aimUp') ? 1 : 0) - (I.down('aimDown') ? 1 : 0), jump: I.pressed('jump'), weapon: I.pressed('weapon'), pick: ['w1', 'w2', 'w3'].findIndex(a => I.pressed(a)), charge: I.down('fire'), shot: null };
    // a pull: a mouse's left drag (input.box) or a finger anywhere (the touch stick in drag mode, input.drag()); the shot
    // goes the other way, its power the pull's length
    const B = I.box(), d = I.drag();
    if (B) pull = { dx: B.from[0] - B.to[0], dy: B.from[1] - B.to[1], done: B.done };
    else if (I.stickOn) { pull = pull && !pull.done ? pull : { dx: 0, dy: 0 }; if (d) { pull.dx -= d[0]; pull.dy -= d[1]; } }
    else if (pull && !pull.done) pull.done = true;
    if (pull) {
      const l = Math.hypot(pull.dx, pull.dy);
      if (l > 12) { const ang = Math.atan2(-pull.dy, pull.dx); g.face = Math.cos(ang) >= 0 ? 1 : -1; g.aim = clamp(g.face > 0 ? ang : Math.atan2(-pull.dy, -pull.dx), -AIM, AIM); power = Math.min(1, l / PULL); }
      if (pull.done) { if (l > 12 && phase === 'aim') c.shot = [aimAngle(g), Math.min(1, l / PULL)]; pull = null; if (!c.shot) power = 0; }
    }
    // a click or a tap on the island walks there (the keys take over)
    const ck = I.clicked(); if (ck && !pull) { const w = toWorld(ck); g.goto = w[0]; }
    if (c.walk) g.goto = null;
    else if (g.goto !== null) { const dx = g.goto - g.x; if (Math.abs(dx) < 1.5 || g.still > .3) g.goto = null; else c.walk = Math.sign(dx); }
    return c;
  }
  const POWERS = [.3, .4, .5, .6, .7, .8, .9, 1], AIM = 1.45;   // (the aim: up to 1.45 radians above level, or below)
  function cpuHands(dt) {
    const g = cur, c = { walk: 0, aim: 0, jump: false, weapon: 0, pick: -1, charge: false, shot: null }, k = cpu; k.t += dt;
    if (phase !== 'aim') return c;
    if (k.phase === 'think') {
      if (!k.cands) { k.cands = []; const t = teams[g.team]; for (let w = 0; w < 3; w++) if (t.ammo[w] > 0) for (const f of [1, -1]) for (let a = -.2; a <= AIM + 1e-6; a += .075) for (const p of POWERS) k.cands.push([w, f, Math.min(a, AIM), p]); }
      for (let n = 0; n < 6 && k.i < k.cands.length; n++, k.i++) { const [w, f, a, pw] = k.cands[k.i], s = score(sim(w, g, f > 0 ? a : Math.PI - a, pw), g); if (!k.best || s > k.best.s) k.best = { w, f, a, pw, s }; }
      if (k.i >= k.cands.length && k.t > .8) {   // chosen: an unsteady hand, then turn to it
        const b = k.best; k.face = b.f; k.aim = clamp(b.a + (Math.random() - .5) * .05, -AIM, AIM); b.pw = clamp(b.pw * (1 + (Math.random() - .5) * .05), .15, 1); k.phase = 'aim'; c.pick = b.w;
      }
      return c;
    }
    g.face = k.face; const da = k.aim - g.aim;
    if (k.phase === 'aim') { if (Math.abs(da) <= 1.4 * dt) { g.aim = k.aim; k.phase = 'charge'; } else c.aim = Math.sign(da); return c; }
    if (power + dt / 1.4 < k.best.pw) c.charge = true; else c.shot = [aimAngle(g), k.best.pw];
    return c;
  }
  // a shot as it would go, on the island as it is: the blasts it would make ([[x, y, r, dmg]]), or null (the sea, away)
  function sim(w, g, ang, pw) {
    const W = WEAPONS[w], [x, y, vx, vy] = muzzle(g, ang, pw, W); if (land.solid(x, y)) return null;
    if (W.id === 'grenade') { const pw2 = new E.Physics(PHYS); pw2.add(land.collider()); const b = pw2.circle(x, y, 2.5, GREN); b.vx = vx; b.vy = vy; for (let i = 0; i < FUSE_N; i++) { pw2.step(DT); if (b.y < water) return null; } return [[b.x, b.y, W.r, W.dmg]]; }
    const s = { w: W, x, y, vx, vy, t: 0 }; let e; while (!(e = fly(s, DT, g))) { /* flying */ } if (e !== 'hit') return null;
    const out = [[s.x, s.y, W.r, W.dmg]];
    if (W.bits) for (const b of bits(s.x, s.y)) { let f; while (!(f = fly(b, DT, null))) { /* flying */ } if (f === 'hit') out.push([b.x, b.y, BIT.r, BIT.dmg]); }
    return out;
  }
  // what a shot is worth: the foes' hurt (a kill more), less its own side's (its own grub's most), and, hitting none, nearer
  function score(pts, me) {
    if (!pts) return -1e4;
    let s = 0, near = 1e9;
    for (const [x, y, r, dmg] of pts) for (const g of grubs) {
      if (g.dead) continue; const d = Math.hypot(g.x - x, g.y + 5 - y), foe = g.team !== me.team; if (foe) near = Math.min(near, d); if (d >= r + 6) continue;
      const hit = dmg * (1 - d / (r + 6)), kill = hit >= g.hp; s += foe ? hit + (kill ? 40 : 0) + (g.y - y < 30 && g.y - water < 30 ? 8 : 0) : -(hit * (g === me ? 2 : 1.5) + (kill ? 80 : 0));
    }
    return s - near * .05;
  }

  /* ---- 4. THE SCENE: the choice of players over the island, the match, its end ---- */
  const CHOICES = [['ONE PLAYER', 'AGAINST THE CPU', 'cpu'], ['TWO PLAYERS', 'ON ONE SCREEN, IN TURN', 'two'], ['TWO CPUS', 'WATCH THEM PLAY', 'demo']];
  const AFTER = [['PLAY AGAIN', 'A NEW ISLAND'], ['PLAYERS', 'CHOOSE AGAIN'], ['TITLE', '']];
  function start(data) {
    shots = []; cur = null; banner = null; winner = -1; menuI = 0; water = 34; island(7); mode = 'menu'; modeT = 0;
    game.input.touchEnabled = true; game.input.steer = 'drag'; game.input.zones = null; L.enabled = false; game.follow(null); A.music(null);
    game.cam.bounds = () => ({ x0: -40, y0: -SKY, x1: WW + 40, y1: 12 }); game.cam.align = 'bottom'; game.focus(WW / 2, 0, 160); game.cam.snap = true;
    if (data && data.part === 'cpu') begin('demo');
  }
  // the buttons of a menu: a thumb's height on a touch screen
  function buttons(list, W, H) {
    const k = game.screen.dpr / game.screen.S, h = Math.max(24, Math.ceil(46 * k)), w = Math.min(W - 24, 200), gap = 6, y0 = Math.round(Math.max(H * .42, H - (h + gap) * list.length - 34));
    return list.map((b, i) => ({ x: Math.round((W - w) / 2), y: y0 + i * (h + gap), w, h, label: b[0], sub: b[1], i }));
  }
  function menu(I, list, pick) {
    const B = buttons(list, game.W, game.H), ck = I.clicked(), hit = ck && B.find(b => ck[0] >= b.x && ck[0] < b.x + b.w && ck[1] >= b.y && ck[1] < b.y + b.h);
    if (I.pressed('up')) { menuI = (menuI + list.length - 1) % list.length; A.sfx('select'); }
    if (I.pressed('down')) { menuI = (menuI + 1) % list.length; A.sfx('select'); }
    if (hit || I.pressed('confirm') || I.pressed('start')) { if (hit) menuI = hit.i; A.sfx('confirm'); I.consumeAll(); pick(menuI); }
  }
  function update(dt) {
    const I = game.input, human = mode === 'play' && cur && !cpu && (phase === 'aim' || phase === 'fly'); modeT += dt;
    I.touchSet('jump', null, human); I.touchSet('weapon', human ? weapon().name : null, human && phase === 'aim');   // (the buttons only on a player's turn)
    stepGrubs(dt); stepShots(dt);
    if (mode === 'menu') { menu(I, CHOICES, i => begin(CHOICES[i][2])); game.focus(WW / 2 + Math.sin(modeT * .1) * 160, 0, 160); return; }
    if (mode === 'over') { if (modeT > 1.2) menu(I, AFTER, i => i === 0 ? begin(play) : i === 1 ? start() : game.go('title')); return; }
    if (play === 'demo' && modeT > .5 && (I.anyPressed() || I.clicked())) { I.consumeAll(); start(); return; }
    // a look away: a click or a tap on the minimap, or the mouse's right button dragged, moves the camera for a while
    const ck = I.clicked(), mb = miniBox(game.W), pn = I.pan();
    if (ck && ck[0] >= mb.x && ck[0] < mb.x + mb.w && ck[1] >= mb.y && ck[1] < mb.y + mb.h + 6) { const f0 = cur || { x: WW / 2, y: 100 }; look = { x: -40 + (ck[0] - mb.x) / mb.w * (WW + 80) - f0.x, y: 0, t: 3 }; I.consumeAll(); }
    else if (pn && !I.stickOn) { look.x -= pn[0]; look.y += pn[1]; look.t = 3; }
    if ((look.t -= dt) <= 0) { look.x *= 1 - Math.min(1, dt * 4); look.y *= 1 - Math.min(1, dt * 4); }
    turn(dt, I);
    // the camera: on a shot, else on whoever falls, else the grub whose turn it is, led along its aim as it charges
    const s = shots[0], m = !s && phase === 'settle' && grubs.find(g => !g.dead && !g.ground), f = s || m || cur, lead = cur && f === cur && phase === 'aim' ? power * 110 : 0;
    if (f) game.focus(f.x + look.x + (lead && Math.cos(aimAngle(cur)) * lead), 0, f.y + 24 + look.y + (lead && Math.sin(aimAngle(cur)) * lead));
  }

  /* ---- 5. DRAWING: the sky, far hills and clouds blown by the wind, the island (the terrain's own chunks), the grubs, the
   * shots, the sea; the turn, its clock, the wind, the teams' health, the weapon ---- */
  function draw(r) {
    const W = r.W, H = r.H, S = game.screen, t = game.time, h = E.hash2;
    r.sky(['#3a7ac8', '#8ac8f0', '#d8f0ff']);
    r.decal(g => {   // the sun, two ranges of far hills moving slower than the island, clouds drifting with the wind
      const wy = y => -y - S.iy;
      px.ddisc(g, W * .78, wy(380) * .5 + H * .2, 46, '#fff4c0', .5); px.disc(g, W * .78, wy(380) * .5 + H * .2, 16, '#fff8e0');
      for (const [k, c, base, amp] of [[.25, '#8ab0d0', 70, 60], [.5, '#6a96b8', 52, 44]]) { const ox = S.ix * k, sy = wy(0) + base * (1 - k); for (let x = 0; x < W; x += 2) { const X = x + ox, top = sy - base - amp * (.5 + .3 * Math.sin(X / 90 + k * 9) + .2 * Math.sin(X / 37 + k * 3)); px.rect(g, x, top, 2, H - top, c); } }
      for (let i = 0; i < 7; i++) { const cx = ((h(i, 3) * 1400 + t * (6 + wind * 24) - S.ix * .6) % 1400 + 1400) % 1400 - 200, cy = wy(260 + h(i, 4) * 220) * .7 + H * .1; for (let j = 0; j < 4; j++) px.ell(g, cx + j * 12 - 18, cy + (j % 2) * 3, 16 - Math.abs(j - 1.5) * 3, 6, '#f4faff'); }
    });
    r.decal(g => { const [x, y] = r.w(0, 0, WH); g.drawImage(back, Math.round(x), Math.round(y)); });
    land.draw(r);
    r.decal(g => {
      for (const o of grubs) if (o.grave && !o.drowned) grave(g, r, o);
      for (const o of grubs) if (!o.dead || (o.drowned && o.sunk < 1.2)) grubArt(g, r, o);
      if (cur && !cur.dead && mode === 'play' && phase === 'aim') aimArt(g, r, cur);
      for (const s of shots) shotArt(g, r, s);
      // the sea: over all that sinks in it, its waves moving
      const [, sy] = r.w(0, 0, water); px.blend(g, .78, 'normal', () => px.rect(g, 0, sy, W, H - sy, '#1a5aa0'));
      for (let x = 0; x < W; x += 2) { const X = x + S.ix, y = sy + Math.round(Math.sin(X / 9 + t * 2.4) * 1.2 + Math.sin(X / 23 - t * 1.3)); px.rect(g, x, y - 1, 2, 2, '#9ad0ff'); if (h(X >> 1, Math.floor(t * 3)) < .04) px.dot(g, x, y + 3, '#ffffff'); }
    });
    hud(r);
  }
  function grubArt(g, r, o) {
    const T = TEAMS[o.team], f = o.face, [sx, sy0] = r.w(o.x, 0, o.y - (o.sunk ? o.sunk * 8 : 0)), sy = Math.round(sy0), bob = o.ground ? Math.round(Math.sin(game.time * 3 + o.x)) * .5 : 0, sq = o.walkT ? Math.sin(o.walkT * 16) * .7 : 0;
    const tint = o.hurt > 0 && Math.floor(o.hurt * 20) % 2 ? '#ffffff' : null;
    // an outline, then the tail, the body and the head, the team's headband, the eyes looking where it faces
    px.ell(g, sx - f * 4, sy - 2, 4.5, 3.5, '#3a1420'); px.ell(g, sx, sy - 4, 5.5 + sq, 5, '#3a1420'); px.disc(g, sx + f, sy - 9 + bob, 5, '#3a1420');
    px.ell(g, sx - f * 4, sy - 2, 3.5, 2.5, tint || '#cc6a7a'); px.ell(g, sx, sy - 4, 4.5 + sq, 4, tint || '#e88a98'); px.disc(g, sx + f, sy - 9 + bob, 4, tint || '#f6a6b2');
    px.rect(g, sx + f - 4, sy - 12 + bob, 9, 2, T.color); px.dot(g, sx - f * 4, sy - 11 + bob, T.color); px.dot(g, sx - f * 5, sy - 10 + bob, T.dark);
    px.dot(g, sx + f * 2, sy - 9 + bob, '#ffffff'); px.dot(g, sx + f * 3, sy - 9 + bob, '#ffffff'); px.dot(g, sx + f * 3, sy - 9 + bob + (o.fly ? -1 : 0), '#101018');
    px.dot(g, sx + f * 3, sy - 6 + bob, '#8a2a3a');
    if (o.dead) return;
    // its name and health above it, in its team's color
    E.font.text(g, o.name, sx, sy - 32, T.color, { align: 'center', shadow: '#000', outline: false });
    E.font.text(g, String(Math.round(o.shown)), sx, sy - 22, '#ffffff', { align: 'center', font: 'tiny', shadow: T.dark, outline: false });
    if (o === cur && mode === 'play' && phase === 'aim' && Math.floor(game.time * 3) % 2) px.poly(g, [[sx - 3, sy - 38], [sx + 3, sy - 38], [sx, sy - 34]], '#ffffff');
    if (o === cur && cpu && cpu.phase === 'think') E.font.text(g, '?'.repeat(1 + Math.floor(game.time * 3) % 3), sx + 8, sy - 20, '#ffffff', { font: 'tiny', shadow: '#000', outline: false });
  }
  function grave(g, r, o) { const [sx, sy] = r.w(o.x, 0, o.y).map(Math.round); px.rect(g, sx - 4, sy - 10, 8, 10, '#3a3a44'); px.rect(g, sx - 3, sy - 9, 6, 9, '#9a9aa8'); px.rect(g, sx - 1, sy - 8, 2, 6, '#5a5a68'); px.rect(g, sx - 3, sy - 6, 6, 2, '#5a5a68'); }
  // the weapon in its hands along the aim, the crosshair, the power (dots from yellow to red)
  function aimArt(g, r, o) {
    const a = aimAngle(o), c = Math.cos(a), s = -Math.sin(a), [sx, sy] = r.w(o.x, 0, o.y + 6), W = weapon();
    if (W.id === 'rocket') { px.line(g, sx - c * 3, sy - s * 3, sx + c * 7, sy + s * 7, '#2a4a2a', 3); px.line(g, sx - c * 3, sy - s * 3, sx + c * 7, sy + s * 7, '#5a8a4a', 1); }
    else px.disc(g, sx + c * 5, sy + s * 5, 2.5, W.id === 'grenade' ? '#3a6a2a' : '#c03a2a');
    const cx = sx + c * 26, cy = sy + s * 26; px.line(g, cx - 3, cy, cx + 3, cy, '#ff3a3a'); px.line(g, cx, cy - 3, cx, cy + 3, '#ff3a3a'); px.dot(g, cx, cy, '#ffffff');
    for (let i = 0; i < 12 && i < power * 12; i++) { const d = 9 + i * 2.2; px.disc(g, sx + c * d, sy + s * d, 1 + i * .12, E.mix('#ffe040', '#ff2a1a', i / 11)); }
  }
  function shotArt(g, r, s) {
    const [x, y] = r.w(s.x, 0, s.y);
    if (s.body) { px.disc(g, x, y, 3, '#1a2a14'); px.disc(g, x, y, 2, '#4a7a3a'); px.dot(g, x - 1, y - 1, '#9ad08a'); E.font.text(g, String(Math.ceil((FUSE_N - s.n) * DT)), x, y - 12, '#ffffff', { align: 'center', font: 'tiny', shadow: '#000', outline: false }); return; }
    if (s.w === BIT) { px.disc(g, x, y, 1.5, '#2a1a1a'); return; }
    const l = Math.hypot(s.vx, s.vy) || 1, c = s.vx / l, d = -s.vy / l;
    if (s.w.id === 'cluster') { px.disc(g, x, y, 3, '#3a1010'); px.disc(g, x, y, 2, '#d04a2a'); return; }
    px.line(g, x - c * 5, y - d * 5, x + c * 3, y + d * 3, '#3a3a3a', 3); px.line(g, x - c * 4, y - d * 4, x + c * 3, y + d * 3, '#c8c8c8'); px.dot(g, x + c * 3, y + d * 3, '#ff3a2a'); px.dot(g, x - c * 6, y - d * 6, '#ffd040');
  }
  function hud(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, touch = game.input.lastDevice === 'touch', ta = touch && game.input.touchArea(), right = Math.min(W, cornerX());
      if (mode === 'menu' || mode === 'over') {
        g.fillStyle = 'rgba(8,12,30,.35)'; g.fillRect(0, 0, r.bw, r.bh); px.reset(g);
        if (mode === 'menu') { E.font.title(g, 'BLAST', W / 2, 14, { align: 'center', scale: 3, colors: ['#fff0c0', '#ffb040', '#c04a1a'], depth: 3 }); E.font.title(g, 'ISLAND', W / 2, 44, { align: 'center', scale: 3, colors: ['#e0f8ff', '#6ac0ff', '#2a5ac0'], depth: 3 }); E.font.text(g, 'TWO TEAMS OF THREE, TURN BY TURN', W / 2, 76, '#ffffff', { align: 'center', shadow: '#000', outline: false }); }
        else { const T = TEAMS[winner]; E.font.title(g, winner < 0 ? 'A DRAW' : T.short + ' WINS', W / 2, 20, { align: 'center', scale: 3, colors: winner < 0 ? ['#ffffff', '#c8c8d8', '#6a6a7a'] : ['#ffffff', T.color, T.dark], depth: 3 }); E.font.text(g, turnNo + ' TURNS, ' + stats.shots + ' SHOTS, ' + stats.kills + ' DOWN, ' + stats.drowned + ' DROWNED', W / 2, 54, '#ffffff', { align: 'center', shadow: '#000', outline: false }); }
        if (mode === 'menu' || modeT > 1.2) for (const b of buttons(mode === 'menu' ? CHOICES : AFTER, W, H)) {
          const on = b.i === menuI; E.ui.box(g, b.x, b.y, b.w, b.h, { bg: on ? '#3a2a6a' : '#141a3a', border: on ? '#ffd36a' : '#8a8ab0' });
          E.font.text(g, b.label, b.x + b.w / 2, b.y + b.h / 2 - (b.sub ? 9 : 4), on ? '#ffd36a' : '#ffffff', { align: 'center', outline: false, shadow: '#000' });
          if (b.sub) E.font.text(g, b.sub, b.x + b.w / 2, b.y + b.h / 2 + 1, '#a8b0d8', { align: 'center', outline: false });
        }
        return;
      }
      // the turn: whose, its clock; the wind
      if (cur) { const T = TEAMS[cur.team], s = Math.max(0, Math.ceil(turnT)); E.ui.box(g, 4, 4, 74, 24, { bg: '#101428', border: T.color, gradient: false }); E.font.text(g, cur.name, 9, 8, T.color, { outline: false }); E.font.text(g, play === 'two' ? 'PLAYER ' + (cur.team + 1) : teams[cur.team].human ? 'YOU' : 'CPU', 9, 18, '#a8b0d8', { font: 'tiny', outline: false }); E.font.text(g, phase === 'aim' ? String(s) : '-', 72, 9, s <= 5 && phase === 'aim' ? '#ff5a4a' : '#ffffff', { align: 'right', scale: 2, outline: false }); }
      E.ui.box(g, 82, 4, 86, 14, { bg: '#101428', border: '#8a8ab0', gradient: false }); E.font.text(g, 'WIND', 86, 8, '#ffffff', { outline: false });
      const wl = Math.round(Math.abs(wind) * 20); px.rect(g, 142, 7, 1, 8, '#ffffff'); if (wl) px.rect(g, wind > 0 ? 143 : 142 - wl, 9, wl, 4, Math.abs(wind) > .6 ? '#ff7a4a' : '#7ad0ff');
      minimap(g, W);
      // the teams' health
      const bx = 6, bw = Math.min(96, (ta ? ta.x0 : W) - 50), by = H - 22;
      TEAMS.forEach((T, i) => { const hp = grubs.filter(o => o.team === i).reduce((a, o) => a + Math.max(0, o.shown), 0), y = by + i * 9; E.font.text(g, T.short, bx, y, T.color, { font: 'tiny', shadow: '#000', outline: false }); px.rect(g, bx + 22, y, bw, 6, '#101428'); px.rect(g, bx + 23, y + 1, Math.round((bw - 2) * hp / (HP * 3)), 4, T.color); });
      // the weapon, and what to press
      if (cur && mode === 'play' && !cpu) {
        const Wp = weapon(), t = teams[cur.team], n = t.ammo[t.weapon], wy = by - 14; E.font.text(g, Wp.name + (n !== Infinity ? ' x' + n : ''), bx, wy, '#ffe7a8', { shadow: '#000', outline: false });
        if (phase === 'aim' && turnNo <= 2) E.font.text(g, touch ? 'DRAG BACK TO FIRE, TAP TO WALK' : 'ARROWS WALK, AIM  SPACE FIRES  Q WEAPON', bx, wy - 11, '#d8e0ff', { shadow: '#000', outline: false });
      }
      if (banner) { const T = TEAMS[banner.team], a = Math.min(1, banner.t * 3); px.blend(g, a, 'normal', () => { E.font.title(g, banner.s, W / 2, H * .3, { align: 'center', scale: 2, colors: T ? ['#ffffff', T.color, T.dark] : ['#ffffff', '#6ac0ff', '#1a4a8a'], depth: 2 }); E.font.text(g, banner.sub, W / 2, H * .3 + 22, '#ffffff', { align: 'center', shadow: '#000', outline: false }); }); }
    });
  }

  // the minimap: the island's line, the sea, the grubs, the shots and the screen's part of it (on a narrow screen, under
  // the turn's box)
  const miniBox = W => { const wide = Math.min(W, cornerX()) - 176 >= 150; return wide ? { x: 176, y: 4, w: Math.min(220, Math.min(W, cornerX()) - 184), h: 22 } : { x: 4, y: 32, w: Math.min(220, W - 8), h: 22 }; };
  function minimap(g, W) {
    const B = miniBox(W), sx = x => B.x + (x + 40) / (WW + 80) * B.w, sy = y => B.y + B.h - Math.min(B.h, y / 240 * B.h);
    if (!profile || profile.length !== B.w) { profile = []; for (let i = 0; i < B.w; i++) profile.push(land.ground(-40 + (i + .5) / B.w * (WW + 80), WH) || 0); }
    px.rect(g, B.x - 1, B.y - 1, B.w + 2, B.h + 2, '#8a8ab0'); px.rect(g, B.x, B.y, B.w, B.h, '#2a5a90');
    for (let i = 0; i < B.w; i++) if (profile[i] > 0) { const y = Math.round(sy(profile[i])); px.rect(g, B.x + i, y, 1, B.y + B.h - y, '#8a6a3a'); px.dot(g, B.x + i, y, '#6ad04a'); }
    const wy = Math.round(sy(water)); px.blend(g, .7, 'normal', () => px.rect(g, B.x, wy, B.w, B.y + B.h - wy, '#1a4a90'));
    for (const o of grubs) if (!o.dead && (o !== cur || Math.floor(game.time * 4) % 2)) px.rect(g, Math.round(sx(o.x)) - 1, Math.round(sy(o.y + 4)) - 1, 3, 3, TEAMS[o.team].color);
    for (const s of shots) px.dot(g, Math.round(sx(s.x)), Math.round(sy(s.y)), '#ffffff');
    const S = game.screen, v0 = Math.max(B.x, sx(S.ix)), v1 = Math.min(B.x + B.w, sx(S.ix + W)); px.rect(g, v0, B.y, v1 - v0, 1, '#ffffff'); px.rect(g, v0, B.y + B.h - 1, v1 - v0, 1, '#ffffff'); px.rect(g, v0, B.y, 1, B.h, '#ffffff'); px.rect(g, v1 - 1, B.y, 1, B.h, '#ffffff');
  }

  /* ---- 6. THE BOT: two CPUs play a match to its end, twice; how it went (tools/kits-test.mjs) ---- */
  const hashLand = () => { let h = 0; const C = land.cells; for (let i = 0; i < C.length; i += 5) h = (Math.imul(h, 31) + C[i]) | 0; return h; };
  function botRun(o = {}) { const a = botMatch(o), b = botMatch(o); a.repeat = a.hash === b.hash && a.turns === b.turns && a.winner === b.winner; return a; }
  function botMatch(o) {
    const was = Math.random;
    try {
      Math.random = E.rng(o.seed || 11);
      game.time = 0; game.timeScale = 1; game.go('artillery', null, { fade: 0 }); game.advance(1 / 120);
      begin('demo', o.seed || 11); let t = 0;
      while (mode !== 'over' && t < (o.seconds || 1200)) { game.advance(1 / 60); t += 1 / 60; }
      return { over: mode === 'over', winner, turns: turnNo, shots: stats.shots, used: stats.used, kills: stats.kills, drowned: stats.drowned, falls: stats.falls, carved: stats.carved, damage: stats.damage, time: Math.round(t), hash: hashLand() ^ grubs.reduce((h, g) => Math.imul(h, 31) + Math.round(g.x * 10) + g.hp | 0, 0), errors: game.errors.length };
    } finally { Math.random = was; }
  }

  return { view: 'artillery', views: ['artillery'], res: 'ps1', pausable: true, touch: ['jump', 'weapon'], camera: { zoom: false }, input: KEYS,
    enter: start, update, draw, bot: botRun,
    exit() { game.input.steer = 'stick'; game.cam.bounds = null; game.cam.align = null; A.music(null); },
    back() { if (mode === 'menu') return false; start(); return true; },
    /** for tests: the island, the grubs, the turn, the shots, where a world point is on the screen; begin(how, seed) starts a match */
    state: () => ({ land, grubs, cur, phase, mode, turnNo, wind, water, shots, power, teams, stats, winner, weapon: cur ? weapon().id : null, at: (x, y) => { const q = game.view.p(x, 0, y); return [q[0] - game.screen.ix, q[1] - game.screen.iy]; }, buttons: () => buttons(mode === 'menu' ? CHOICES : AFTER, game.W, game.H) }),
    /** begin(how, seed): a match ('cpu': one player against the CPU, 'two': two players, 'demo': two CPUs) on the island of
     *  that seed (else a new one) */
    begin,
    /** the proof: a match against the CPU on a seeded island; the player aims up and fires, then the CPU's turn; the
     *  island's cells, the grubs, the turn */
    run: (n = 1200) => proof('artillery', n, (i, k) => {
      if (i === 2) begin('cpu', 3);
      if (i === 200) k.hold('aimUp'); if (i === 240) k.up('aimUp');
      if (i === 300) k.hold('fire'); if (i === 400) k.up('fire');
    }, () => [hashLand(), grubs.map(g => [Math.round(g.x * 10), Math.round(g.y * 10), g.hp, g.dead]), turnNo, phase, wind, water, stats.shots]) };
})();
scenes.artillery = ARTILLERY;

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
