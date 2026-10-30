// The SPORTS kit's game (two against two in a walled cage, up to four players: a ball that bounces and curls, passes, lobs, shots on a meter, formations, a match clock; Sensible Soccer and NBA Jam), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 159 (src/starter/68-sports.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. sports.html plays it; node kits/test.mjs sports runs it headless.
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
 * SLICE 22  SPORTS  (Sensible Soccer, NBA Jam, Tecmo Bowl).
 * Two against two in a walled cage, for up to four players: the GULLS against the RUST, two halves on the clock, a
 * golden goal if it ends level. The ball is a Body: it rolls, bounces off the ground and the boards, and curls.
 * KEYS: the stick runs; J passes (to the teammate the stick points at, led to where it is going), L lobs one over a
 * defender (its arc solved by E.arc to land at the teammate's feet), K held fills the shot meter and shoots on letting go
 * (the stick across the goal aims it; pushed sideways just after, it curls: aftertouch). Without the ball: J slides in
 * to tackle, K switches to the teammate nearer the ball. TOUCH: the stick, PASS, SHOOT (hold), LOB.
 * PLAYERS: MATCH is you against the CPU; VERSUS lets players 2 to 4 in (2 on the keyboard, or Start on a pad): player 2
 * takes the RUST, 3 and 4 the second of each side. The rest are run by formation: with the ball, the other one runs
 * ahead on the far side; without it, the nearer presses and the other covers the goal. Commentary on Dialog's radio.
 * Deep links: #sports/match (a match against the CPU), #sports/vs (VERSUS: players 2 to 4 join).
 * HOW IT WORKS: a TileMap cage (boards that cut low before the camera, nets), the ball and the players as E.Body, rigs
 * that kick and slide (E.Attack), E.arc for the lob, game.allowJoin for players; SPORTS.run(n) is the proof,
 * SPORTS.bot() plays a match through to its whistle and then a short one with four players.
 * ===================================================================================== */
const SPORTS = (() => {
  const A = game.audio, T = 16, FW = 36, FH = 22, ND = 2, GOAL = 5, BAR = 28, HALF = 60, GOLDEN = 45, PI = Math.PI;
  /* ---- THE CAGE: a field of FW x FH tiles inside boards (cut low where they hide it), a goal in each end with its net,
   * a stand of three tiers behind the north boards; built from rows: # boards, N net, . the field, : the net's floor,
   * 1 2 3 the stand's tiers (back to front), , outside ---- */
  const STAND = 3, COLS = ND + FW + 2 + ND, ROWS = STAND + FH + 2, MID = FH / 2, goalRow = r => r > MID - GOAL / 2 && r <= MID + GOAL / 2;
  const rows = [];
  for (let R = 0; R < ROWS; R++) {
    let s = ''; const r = R - STAND;   // (the cage's own row)
    for (let c = 0; c < COLS; c++) {
      const field = c > ND && c <= ND + FW && r > 0 && r <= FH, endCol = c === ND || c === ND + FW + 1, net = (c < ND || c > ND + FW + 1);
      if (r < 0) s += c >= ND && c <= ND + FW + 1 ? String(R + 1) : ',';
      else if (field) s += '.';
      else if (endCol && r > 0 && r <= FH) s += goalRow(r) ? '.' : '#';
      else if ((r === 0 || r === FH + 1) && c >= ND && c <= ND + FW + 1) s += '#';
      else if (net && goalRow(r)) s += c === 0 || c === COLS - 1 ? 'N' : ':';
      else if (net && (goalRow(r + 1) || goalRow(r - 1))) s += 'N';
      else s += ',';
    }
    rows.push(s);
  }
  const X0 = (ND + 1) * T, X1 = (ND + 1 + FW) * T, Y0 = (STAND + 1) * T, Y1 = (STAND + FH + 1) * T, CX = (X0 + X1) / 2, CY = (Y0 + Y1) / 2, GH = GOAL * T / 2;
  // the pitch: mown stripes with the grass's own grain, painted lines a little worn (the halfway line, the centre circle,
  // an arc before each goal), the nets' shadow on their floor, tarmac outside
  const line = (x, y) => {
    const d = Math.hypot(x - CX, y - CY), ex = Math.min(Math.abs(x - X0), Math.abs(x - X1)), ey = Math.min(Math.abs(y - Y0), Math.abs(y - Y1));
    if (ex < 1.5 || ey < 1.5 || Math.abs(x - CX) < 1 || Math.abs(d - 48) < 1) return true;
    for (const gx of [X0, X1]) if (Math.abs(Math.hypot(x - gx, y - CY) - 72) < 1 && Math.abs(x - gx) < 72) return true;
    return false;
  };
  const floorTex = (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .06, y * .06) * .5;
    if (tag === 'net') { const mesh = Math.floor(x) % 4 === 0 || Math.floor(y) % 4 === 0; return mesh ? [30, 66, 36] : [44 + n * 10, 92 + n * 14, 50 + n * 10]; }
    if (tag === 'out') return [44 + n * 18, 42 + n * 18, 50 + n * 18];
    if (line(x, y)) { const w = 228 + n * 24 + m * 10; return [w, w + 4, w - 8]; }
    const k = Math.floor((x - X0) / 32) % 2 ? 1 : 0, g = (k ? 140 : 106) + n * 34 + m * 24;   // (a stripe mown each way: lighter, darker)
    return [g * .42, g, g * .46];
  };
  let map = null;
  const makeMap = () => new E.TileMap({ rows, legend: { '#': 1, N: 2, 1: 5, 2: 4, 3: 3, '.': { floor: 'grass' }, ':': { floor: 'net' }, ',': { floor: 'out' } }, floorTex, outside: '#1e1c24', ao: 4,
    types: { 1: { h: 26, cut: true, cutH: 6, face: 'plank', side: '#3a4a6a', top: '#d8dce8', line: '#2a3450' }, 2: { h: BAR + 4, face: 'none', side: '#b8bcc8', top: '#e0e4ec' },
      3: { h: 34, face: 'stone', side: '#5a5468', top: '#6a6478' }, 4: { h: 44, face: 'stone', side: '#4e4a5e', top: '#5e586e' }, 5: { h: 54, face: 'stone', side: '#44405a', top: '#544e66' } } });
  // the crowd: two on each tile of the stand, in their colors, bobbing; on a goal, those of the side that scored jump
  const CROWD = [];
  for (let R = 0; R < STAND; R++) for (let c = ND; c <= ND + FW + 1; c++) for (const dx of [4, 12]) {
    const h = E.hash2(c * 3 + dx, R * 7 + 1), side = h < .5 ? 0 : 1;
    CROWD.push({ x: c * T + dx, y: R * T + 9, z: [54, 44, 34][R], side, shirt: side ? ['#c8502a', '#e07040', '#a83a1a'][(h * 30 | 0) % 3] : ['#eef0f6', '#2a5ab8', '#8ab0f0'][(h * 30 | 0) % 3], skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'][(h * 50 | 0) % 4], ph: h * 9 });
  }
  /* ---- THE TEAMS: their colors, names and players; the ball ---- */
  const TEAMS = [
    { name: 'GULLS', colors: { cloth: '#eef0f6', pants: '#2a5ab8', boot: '#1e2030', belt: '#2a5ab8', trim: '#2a5ab8' }, chip: '#eef0f6', players: [['NOOR', '#3a2418', '#c89070'], ['BEX', '#e8c070', '#f0c8a8']] },
    { name: 'RUST', colors: { cloth: '#c8502a', pants: '#2a2a30', boot: '#1a1a1e', belt: '#1a1a1e', trim: '#e8c070' }, chip: '#c8502a', players: [['DRAGO', '#1e1c1a', '#a87050'], ['KIT', '#6a3a22', '#e0b090']] }];
  const SPEED = 92, AI_SPEED = 86, KICK_CD = .3;
  const BALL = E.sprite(['.www.', 'wwkww', 'wkkkw', 'wwkww', '.www.'], { w: '#f4f4f0', k: '#2a2a30' });
  const BALL2 = E.sprite(['.www.', 'wkwkw', 'wwwww', 'wkwkw', '.www.'], { w: '#f4f4f0', k: '#2a2a30' });
  const SOUNDS = {
    kick: { wave: 'noise', freq: 900, to: 200, dur: .07, vol: .3, filter: 'lowpass' }, thump: { wave: 'sine', freq: 120, to: 70, dur: .08, vol: .3 },
    whistle: { wave: 'square', freq: 2200, vib: [30, .05], dur: .32, vol: .14 }, post: { wave: 'triangle', freq: 1400, to: 1100, dur: .3, vol: .25 },
    crowd: { wave: 'noise', freq: 600, to: 900, dur: 1.4, vol: .18, filter: 'lowpass' }, slide: { wave: 'noise', freq: 400, to: 200, dur: .25, vol: .18 }
  };
  for (const [k, v] of Object.entries(SOUNDS)) A.define(k, v);
  const SONG = { bpm: 140, steps: 4, tracks: [   // the cage: a bright chant over a bouncing bass
    { wave: 'square', vol: .07, notes: 'E5 . E5 G5 . E5 D5 . | C5 . C5 E5 . C5 B4 . | A4 . C5 . E5 . A5 . | G5 - - . . . . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] };

  /* ---- THE STATE ---- */
  let mode = 'menu', vs = false, team = [], all = [], ball = null, owner = null, last = null, clock = 0, half = 1, score = [0, 0], kickT = 0, t = 0, scripted = false;
  let stats = null, curlT = 0, golden = false, restartBy = 0, over = false, kickHold = 0;   // kickHold: the kickoff's rule (the other side out of the circle) until the ball is played
  const menu = new E.Menu(game, ['MATCH', 'VERSUS (2-4 PLAYERS)', 'BACK'], { onPick: i => i === 2 ? game.go('title') : i === 1 ? versus() : start(false) });
  const after = new E.Menu(game, ['REMATCH', 'MENU'], { y: 150, onPick: i => i === 0 ? start(vs) : toMenu() });
  const talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#e8c070' });   // (at the bottom: clear of the score and of the touch buttons)
  const VOICE = new E.Humanoid({ weapon: null, hat: 'band', colors: { cloth: '#3a3a4a', hair: '#5a3a2a', skin: '#e0b090', hat: '#2a2a30' } });
  const say = text => { if (!scripted) talk.say(text, { name: 'CAGE RADIO', auto: 2.2, modal: false, alpha: .8, portrait: VOICE, portraitOpts: { zoom: 3, turn: .4 } }); };

  function toMenu() { mode = 'menu'; game.splitScreen(0); game.allowJoin(false); A.music('title'); menu.i = 0; }
  function versus() { vs = true; mode = 'join'; game.allowJoin({ max: 4 }); A.sfx('select'); }
  /** a match: the four on the pitch, the ball at the centre, the clock at 0; players: who holds which (the inputs) */
  function start(versus) {
    vs = versus; map = map || makeMap(); score = [0, 0]; clock = 0; half = 1; golden = false; over = false; owner = null; last = null;
    stats = { passes: 0, done: 0, shots: 0, lobs: 0, tackles: 0, goals: [], walls: 0, curled: 0 };
    all = []; team = [[], []];
    TEAMS.forEach((tm, s) => tm.players.forEach(([name, hair, skin], k) => {
      const b = new E.Body({ x: CX, y: CY, r: 5, friction: 0, gravity: 700 });
      const p = { side: s, k, name, body: b, rig: new E.Humanoid({ weapon: null, build: 'heroic', size: 1.05, hair: k ? 'spiky' : 'short', colors: Object.assign({ hair, skin }, tm.colors), speedRef: 80 }),
        input: null, facing: s ? PI : 0, kick: null, slide: 0, stun: 0, cool: 0, meter: 0, charging: false, cheer: 0 };
      team[s].push(p); all.push(p);
    }));
    // who holds whom: player 1 the GULLS' first (and, alone, whichever GULL is nearer the ball); in versus 2 the RUST, 3 and 4
    // the second of each side
    const P = game.players;
    team[0][0].input = P[0];
    if (vs) { if (P[1]) team[1][0].input = P[1]; if (P[2]) team[0][1].input = P[2]; if (P[3]) team[1][1].input = P[3]; }
    ball = new E.Body({ x: CX, y: CY, r: 3, friction: 0, bounce: .55, gravity: 600 }); ball.spin = 0; ball.roll = 0;
    kickoff(0); game.allowJoin(false); A.music(SONG); game.input.consumeAll();
    game.follow(ball, { z: 8, lead: 10 }); game.cam.smooth = .18; game.cam.bounds = v => map.bounds(v);
    say('THE GULLS AGAINST THE RUST IN THE CAGE. HERE WE GO!');
  }
  /** the formation's spots: kicking off (s kicks), or in play (a team's two by where the ball is and who has it) */
  const goalX = s => s ? X0 : X1;   // where side s shoots (the GULLS attack the right end)
  function kickoff(s) {
    owner = null; ball.x = CX; ball.y = CY; ball.z = 0; ball.onGround = true; ball.vx = ball.vy = ball.vz = 0; ball.spin = 0;
    for (const p of all) {
      const dir = p.side ? 1 : -1, b = p.body;
      b.x = p.side === s && p.k === 0 ? CX + dir * 8 : CX + dir * (p.k ? 150 : 60); b.y = p.side === s && p.k === 0 ? CY : CY + (p.k ? 40 : -40) * (p.side ? -1 : 1);
      b.vx = b.vy = 0; b.z = 0; p.facing = p.side ? PI : 0; p.kick = null; p.slide = 0; p.stun = 0; p.meter = 0; p.charging = false;
    }
    mode = 'kickoff'; kickT = 1; restartBy = s;
  }
  /** a player's spot in the formation now: with the ball (or near it), go for it; else, attacking, ahead on the far
   *  side; defending, between the ball and its own goal */
  function spot(p) {
    const s = p.side, mate = team[s][1 - p.k], dir = s ? -1 : 1, has = owner && owner.side === s;
    if (has) return [clamp(ball.x + dir * 90, X0 + 30, X1 - 30), CY + (ball.y < CY ? 60 : -60)];
    const own = goalX(1 - s), near = Math.hypot(p.body.x - ball.x, p.body.y - ball.y) <= Math.hypot(mate.body.x - ball.x, mate.body.y - ball.y);
    if (near) return [ball.x, ball.y];
    return [lerp(ball.x, own, .55), lerp(ball.y, CY, .5)];
  }

  /* ---- THE BALL: owned (at its owner's feet), or loose: a Body that rolls, bounces off the ground and the boards and
   * curls by its spin; a goal, over the bar, out of the cage ---- */
  function ballStep(dt) {
    if (owner) {
      const b = owner.body, f = owner.facing; ball.x = b.x + Math.cos(f) * 7; ball.y = b.y + Math.sin(f) * 7; ball.z = 0; ball.onGround = true;
      ball.vx = b.vx; ball.vy = b.vy; ball.vz = 0; ball.roll += Math.hypot(b.vx, b.vy) * dt; return;
    }
    const vx0 = ball.vx, vy0 = ball.vy, sp = Math.hypot(ball.vx, ball.vy);
    if (ball.spin && sp > 20) { const k = ball.spin * dt; ball.vx += -vy0 / sp * k * sp; ball.vy += vx0 / sp * k * sp; ball.spin *= Math.exp(-dt * 1.4); }   // curl: across its path
    if (ball.z <= .5) { const f = Math.exp(-dt * 1.1); ball.vx *= f; ball.vy *= f; }   // rolling slows it
    ball.update(dt, map);   // (the Body bounces off the boards and the ground by its bounce)
    if (ball.hitWall) { ball.spin = 0; stats.walls++; if (Math.hypot(vx0, vy0) > 60) A.sfx('thump'); }
    if (ball.bounced) A.sfx('thump');
    ball.roll += Math.hypot(ball.vx, ball.vy) * dt;
    // a goal: over the line between the posts and under the bar; over it, a goal kick; out of the cage, thrown back in
    for (const s of [0, 1]) {
      const gx = goalX(s), past = s ? ball.x < gx - 2 : ball.x > gx + 2;
      if (past && Math.abs(ball.y - CY) < GH && ball.z < BAR) return goal(s);
      if (past && (ball.z >= BAR || Math.abs(ball.y - CY) >= GH)) return restart(1 - s, s ? X0 + 24 : X1 - 24, CY, 'OVER THE BAR. A GOAL KICK');
    }
    if (ball.x < X0 - 40 || ball.x > X1 + 40 || ball.y < Y0 - 4 || ball.y > Y1 + 4) restart(last ? 1 - last.side : 0, clamp(ball.x, X0 + 12, X1 - 12), clamp(ball.y, Y0 + 12, Y1 - 12), 'OUT OF THE CAGE! THROWN BACK IN');
  }
  /** play goes on from (x, y) with the ball at the feet of side s's nearer player */
  function restart(s, x, y, line) {
    const p = team[s].slice().sort((a, b) => Math.hypot(a.body.x - x, a.body.y - y) - Math.hypot(b.body.x - x, b.body.y - y))[0];
    p.body.x = x - (s ? -8 : 8); p.body.y = y; p.facing = s ? PI : 0; owner = p; ball.spin = 0; A.sfx('whistle'); if (line) say(line);
  }
  function goal(s) {
    score[s]++; stats.goals.push([s, last ? last.name : '?', Math.round(clock)]); owner = null; mode = 'goal'; kickT = 2.4; restartBy = 1 - s;
    for (const p of team[s]) p.cheer = 2.4; game.shake(3); A.sfx('crowd'); A.sfx('whistle');
    P.sparks(ball.x, ball.y, 16, 16, null, { color: '#ffe08a' }); P.ring(ball.x, ball.y, 4, 34, '#fff6c0', .5);
    say(golden ? 'GOLDEN GOAL! ' + (last ? last.name : '') + ' WINS IT FOR THE ' + TEAMS[s].name + '!' : 'GOAL! ' + (last ? last.name + ' SCORES FOR THE ' : 'THE ') + TEAMS[s].name + '! ' + score[0] + ' - ' + score[1]);
    if (golden) { over = true; }
  }

  /* ---- KICKS: a pass along the ground led to the teammate, a lob over by E.arc, a shot from the meter with aftertouch ---- */
  /** the teammate a pass goes to: the one the stick points at (within 70 degrees), else the other */
  const mateOf = p => team[p.side][1 - p.k];
  function pass(p) {
    const m = mateOf(p), b = p.body, d = Math.hypot(m.body.x - b.x, m.body.y - b.y), sp = clamp(d * 1.5 + 90, 150, 270), lead = d / sp;
    const tx = m.body.x + m.body.vx * lead * .8, ty = m.body.y + m.body.vy * lead * .8, a = Math.atan2(ty - b.y, tx - b.x);
    release(p, Math.cos(a) * sp, Math.sin(a) * sp, 0); stats.passes++; ball.to = m;
  }
  function lob(p) {
    const m = mateOf(p), lead = .55, tx = m.body.x + m.body.vx * lead, ty = m.body.y + m.body.vy * lead;
    const v = E.arc({ x: ball.x, y: ball.y, z: 0 }, { x: tx, y: ty, z: 0 }, ball.gravity, { apex: 30 });
    release(p, v.vx, v.vy, v.vz); stats.lobs++; stats.passes++; ball.to = m;
  }
  /** a shot: power from the meter (0..1), aimed across the goal mouth by the stick's up and down */
  function shoot(p, power, aimY) {
    const gx = goalX(p.side), gy = CY + clamp(aimY, -1, 1) * (GH - 6), b = p.body, a = Math.atan2(gy - b.y, gx - b.x), sp = 170 + power * 230;
    release(p, Math.cos(a) * sp, Math.sin(a) * sp, 30 + power * 95); stats.shots++; curlT = .4; ball.to = null; A.sfx('kick');
  }
  function release(p, vx, vy, vz) {
    owner = null; last = p; kickHold = 0; ball.vx = vx; ball.vy = vy; ball.vz = vz; ball.onGround = vz <= 0; ball.spin = 0; p.cool = KICK_CD; p.kick = new E.Attack('kick'); p.kick.start(); A.sfx('kick');
  }
  /** a slide tackle: a dash along its facing; whoever it meets with the ball loses it */
  function tackle(p) { p.slide = .35; p.kick = new E.Attack('sweep'); p.kick.start(); stats.tackles++; A.sfx('slide'); const b = p.body; b.vx = Math.cos(p.facing) * 170; b.vy = Math.sin(p.facing) * 170; }

  /* ---- A PLAYER'S STEP: from its input (a human's) or its brain (the formation's), then its body and its rig ---- */
  function playerStep(p, dt) {
    const b = p.body; p.cool = Math.max(0, p.cool - dt); p.stun = Math.max(0, p.stun - dt); p.cheer = Math.max(0, p.cheer - dt);
    let mx = 0, my = 0;
    if (p.slide > 0) { p.slide -= dt; const f = Math.exp(-dt * 3); b.vx *= f; b.vy *= f; }
    else if (p.stun > 0 || mode !== 'play') { b.vx = approach(b.vx, 0, 600 * dt); b.vy = approach(b.vy, 0, 600 * dt); }
    else {
      const c = p.input ? human(p, dt) : brain(p, dt); mx = c.move[0]; my = c.move[1];
      const sp = p.input ? SPEED : AI_SPEED, m = Math.hypot(mx, my);
      b.vx = approach(b.vx, mx * sp, 900 * dt); b.vy = approach(b.vy, my * sp, 900 * dt);
      if (m > .2) p.facing = E.approachAng(p.facing, Math.atan2(my, mx), dt * (owner === p ? 9 : 14));
      act(p, c, dt);
    }
    b.update(dt, map);
    // the loose ball: whoever reaches it first takes it (not just after kicking it, nor a ball high in the air, and a fast one only
    // right at its feet)
    if (!owner && mode === 'play' && p.cool <= 0 && p.stun <= 0 && ball.z < 9 && Math.hypot(ball.x - b.x, ball.y - b.y) < (Math.hypot(ball.vx, ball.vy) > 210 ? 4.5 : 9)) {   // (a hard shot is hard to trap)
      owner = p; ball.spin = 0; if (ball.to === p && last && last.side === p.side) stats.done++; ball.to = null;
      if (p.slide > 0) p.slide = 0;
    }
    // a slide that meets the ball's holder knocks it loose
    if (p.slide > 0 && owner && owner.side !== p.side && Math.hypot(owner.body.x - b.x, owner.body.y - b.y) < 12) {
      const o = owner; owner = null; o.stun = .5; last = p; ball.vx = Math.cos(p.facing) * 120; ball.vy = Math.sin(p.facing) * 120; ball.vz = 40; ball.onGround = false; p.cool = .2; A.sfx('thump');
    }
    if (p.kick) { p.kick.update(dt); if (!p.kick.busy) p.kick = null; }
    p.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: p.facing, attack: p.kick && p.kick.state, hurt: p.stun > 0, pose: p.cheer > 0 ? 'cheer' : null, expr: p.cheer > 0 ? 'shout' : null });
  }
  /** what a human's input asks: the stick; pass, lob, the shot's meter (held), a tackle or a switch */
  function human(p, dt) {
    const I = p.input, mv = I.move(), c = { move: mv, pass: I.pressed('pass'), lob: I.pressed('lob'), shootHeld: I.down('shoot'), shootUp: I.released('shoot'), aim: mv[1] * (p.side ? -1 : 1) };
    if (c.pass) I.consume('pass'); if (c.lob) I.consume('lob');
    // aftertouch: just after a shot, the stick across its path curls the ball
    if (curlT > 0 && last === p && !owner) { const sp = Math.hypot(ball.vx, ball.vy) || 1, across = (mv[0] * -ball.vy + mv[1] * ball.vx) / sp; if (Math.abs(across) > .3) { ball.spin = clamp(ball.spin + across * 3.2 * dt, -1.6, 1.6); stats.curled++; } }
    return c;
  }
  /** the CPU's footballer: to its spot in the formation; with the ball, run at goal, pass when pressed, shoot in range */
  function brain(p, dt) {
    const b = p.body, c = { move: [0, 0], pass: false, lob: false, shootHeld: false, shootUp: false, aim: 0 }, s = p.side;
    if (owner === p) {
      const gx = goalX(s), dg = Math.hypot(gx - b.x, CY - b.y), foe = team[1 - s].find(o => Math.hypot(o.body.x - b.x, o.body.y - b.y) < 30 && Math.abs(E.angDiff(Math.atan2(o.body.y - b.y, o.body.x - b.x), p.facing)) < 1.2);
      const a = Math.atan2(CY - b.y, gx - b.x); c.move = [Math.cos(a), Math.sin(a)];
      const shot = (meter, aim) => { c.shootHeld = p.meter < meter; c.shootUp = !c.shootHeld; c.aim = b.y < CY ? aim : -aim; };   // (held until the meter is where it wants it)
      if (dg < 95 && p.cool <= 0) shot(.4, .45);   // close in: shoot, pressed or not
      else if (foe) { const m = mateOf(p), lane = team[1 - s].some(o => segDist(o.body, b, m.body) < 14); if (p.cool <= 0) { if (lane) c.lob = true; else c.pass = true; } else c.move = [Math.cos(a + 1.1), Math.sin(a + 1.1)]; }
      else if (dg < 160 && p.cool <= 0) shot(.55 + p.k * .2, .55);
      return c;
    }
    let [tx, ty] = spot(p);
    if (kickHold > 0 && s !== restartBy) { const cd = Math.hypot(tx - CX, ty - CY) || 1; if (cd < 56) { tx = CX + (tx - CX) / cd * 56; ty = CY + (ty - CY) / cd * 56; } }   // (the kickoff: out of the circle)
    const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
    if (d > 6) c.move = [dx / d, dy / d];
    // pressing the holder: slide in when close and in front of it
    if (owner && owner.side !== s && d < 18 && p.cool <= 0 && Math.hypot(owner.body.x - b.x, owner.body.y - b.y) < 16) c.pass = true;
    return c;
  }
  const segDist = (o, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return Math.hypot(a.x + vx * u - o.x, a.y + vy * u - o.y); };
  /** the buttons: with the ball, pass, lob or the shot's meter; without it, a tackle (pass) or a switch (shoot) */
  function act(p, c, dt) {
    if (owner === p) {
      if (c.pass && p.cool <= 0) return pass(p);
      if (c.lob && p.cool <= 0) return lob(p);
      if (c.shootHeld) { p.charging = true; p.meter = Math.min(1, p.meter + dt * 1.25); }
      else if (p.charging && (c.shootUp || !c.shootHeld)) { p.charging = false; shoot(p, p.meter, c.aim); p.meter = 0; }
      return;
    }
    p.charging = false; p.meter = 0;
    if (c.pass && p.cool <= 0 && p.slide <= 0 && !(kickHold > 0 && p.side !== restartBy)) tackle(p);
    else if (c.shootUp && p.input && !vs) swap(p);
  }
  /** player 1 alone holds whichever GULL is nearer the ball when the other side has it (or K switches) */
  function swap(p) { const m = mateOf(p); if (m.input) return; m.input = p.input; p.input = null; }
  function autoSwitch() {
    if (vs) return;
    const s = 0, cur = team[s].find(p => p.input), m = cur && mateOf(cur);
    if (!cur || !m || m.input) return;
    if (owner === m || (ball.to === m) || ((!owner || owner.side !== s) && Math.hypot(m.body.x - ball.x, m.body.y - ball.y) + 24 < Math.hypot(cur.body.x - ball.x, cur.body.y - ball.y))) swap(cur);
  }

  /* ---- A STEP OF THE MATCH: the clock, the halves, golden goal, the whistle ---- */
  function update(dt) {
    t += dt;
    if (mode === 'menu') { if (!menu.update(dt)) pickOnStart(menu); return; }
    if (mode === 'join') {
      if (game.input.pressed('start') || game.input.pressed('confirm')) { game.input.consumeAll(); start(true); }
      else if (game.input.pressed('cancel')) toMenu();
      return;
    }
    if (mode === 'full') { after.update(dt); for (const p of all) playerStep(p, dt); return; }
    talk.update(dt);
    if (mode === 'kickoff' || mode === 'goal' || mode === 'half') {
      for (const p of all) playerStep(p, dt);
      if ((kickT -= dt) <= 0) {
        if (mode === 'goal' && over) return fullTime();
        if (mode === 'goal' || mode === 'half') kickoff(restartBy);
        else { mode = 'play'; owner = team[restartBy][0]; kickHold = 2.5; A.sfx('whistle'); }
      }
      return;
    }
    clock += dt; kickHold = Math.max(0, kickHold - dt);
    for (const p of all) playerStep(p, dt);
    ballStep(dt); curlT = Math.max(0, curlT - dt); autoSwitch();
    if (!golden && half === 1 && clock >= HALF) { half = 2; mode = 'half'; kickT = 2.4; restartBy = 1; owner = null; A.sfx('whistle'); say('HALF TIME: GULLS ' + score[0] + ', RUST ' + score[1] + '.'); }
    else if (!golden && clock >= HALF * 2) {
      if (score[0] === score[1]) { golden = true; clock = HALF * 2; A.sfx('whistle'); say('LEVEL AT FULL TIME: GOLDEN GOAL! THE NEXT ONE WINS IT.'); kickoff(0); }
      else fullTime();
    } else if (golden && clock >= HALF * 2 + GOLDEN) fullTime();
  }
  function fullTime() {
    mode = 'full'; over = true; owner = null; A.sfx('whistle'); after.i = 0;
    const w = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1; for (const p of all) p.cheer = p.side === w ? 99 : 0;
    say(w < 0 ? 'FULL TIME: A DRAW IN THE CAGE.' : 'FULL TIME! THE ' + TEAMS[w].name + ' WIN IT, ' + Math.max(...score) + ' - ' + Math.min(...score) + '.');
    if (!scripted) A.music(w === 0 || vs ? 'victory' : null);
  }

  /* ---- DRAWING: the cage, the posts, the players, the ball and its shadow; the score, the clock, the meter, the radar ---- */
  function draw(r) {
    if (mode === 'menu' || mode === 'join') return drawMenu(r);
    const view = E.charView(r.view);
    map.drawFloor(r); map.queueWalls(r);
    for (const f of CROWD) {   // (cheering on the scoring side's goal, else a sway)
      const up = mode === 'goal' && stats.goals.length && stats.goals[stats.goals.length - 1][0] === f.side ? Math.abs(Math.sin(t * 9 + f.ph)) * 5 : Math.sin(t * 2 + f.ph) * .6;
      r.queue(f.x, f.y, f.z + up, g => { const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, f.shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); });
    }
    for (const gx of [X0, X1]) for (const py of [CY - GH, CY + GH]) r.queue(gx, py, 0, g => { const [x, y] = r.w(gx, py, 0), [, y1] = r.w(gx, py, BAR); px.rect(g, Math.round(x) - 1, Math.round(y1), 2, Math.round(y - y1), '#f4f4f0'); });
    for (const gx of [X0, X1]) r.queue(gx, CY + GH, BAR, g => { const [x0, y0] = r.w(gx, CY - GH, BAR), [x1, y1] = r.w(gx, CY + GH, BAR); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f4f4f0', 2); }, { bias: 1 });
    for (const p of all) {
      const b = p.body; r.shadow(b.x, b.y, 6, .35);
      r.actor(b.x, b.y, b.z, (g, ox, oy) => p.rig.draw(g, ox, oy, view));
      if (p.input) r.queue(b.x, b.y, 40, g => { const [x, y] = r.w(b.x, b.y, 40), c = E.PLAYER_COLORS[p.input.player || 0] || '#ffe08a'; px.poly(g, [[x - 3, y - 4], [x + 3, y - 4], [x, y]], c); }, { emissive: true });
      if (p.charging) r.queue(b.x, b.y, 44, g => { const [x, y] = r.w(b.x, b.y, 44); E.ui.bar(g, Math.round(x) - 10, Math.round(y) - 6, 20, 4, p.meter, p.meter > .8 ? '#ff6a3a' : '#ffd36a'); });
    }
    r.shadow(ball.x, ball.y, 3 - Math.min(1.5, ball.z * .05), .4);
    r.sprite(ball.x, ball.y, ball.z + 2.5, Math.floor(ball.roll / 8) % 2 ? BALL2 : BALL, { anchor: 'center' });
    r.overlay(g => hud(g, r));
    talk.draw(r);
    if (mode === 'full') { r.overlay(g => results(g, r)); after.draw(r); }
  }
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function hud(g, r) {
    // the score bug: the sides' chips and scores, the clock (counting down each half; golden goal says so)
    const left = golden ? 'GOLDEN GOAL' : (half === 1 ? '1ST ' : '2ND ') + mmss(Math.max(0, HALF * half - clock));
    E.ui.box(g, 4, 4, 132, 16, { bg: '#141826', border: '#6a7090', alpha: .85 });
    px.rect(g, 8, 9, 6, 6, TEAMS[0].chip); px.rect(g, 70, 9, 6, 6, TEAMS[1].chip);
    E.font.text(g, TEAMS[0].name + ' ' + score[0], 17, 8, '#f0ecdc', { font: 'tiny', outline: false });
    E.font.text(g, score[1] + ' ' + TEAMS[1].name, 79, 8, '#f0ecdc', { font: 'tiny', outline: false });
    E.font.text(g, left, 4, 24, golden ? '#ffd36a' : '#c8d0e8', { font: 'tiny', outline: '#000' });
    // the radar: the cage small, the players as their colors, the ball white
    const s = 2.4 / T, w = Math.round((X1 - X0) * s), h = Math.round((Y1 - Y0) * s), x0 = r.W - w - 6, ca = game.cornerArea(), y0 = ca && ca.x0 < x0 + w ? Math.ceil(ca.y1) + 4 : 26;   // (top right, under the corner's buttons or a kit's API button: the radio and the touch buttons have the bottom)
    E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#183a1e', border: '#6a9070', alpha: .75 });
    for (const p of all) px.rect(g, Math.round(x0 + (p.body.x - X0) * s) - 1, Math.round(y0 + (p.body.y - Y0) * s) - 1, 2, 2, TEAMS[p.side].chip);
    px.rect(g, Math.round(x0 + (ball.x - X0) * s), Math.round(y0 + (ball.y - Y0) * s), 1, 1, '#ffffff');
    if (mode === 'kickoff') E.font.text(g, 'KICK OFF', r.W / 2, r.H * .3, '#ffe7a8', { align: 'center', scale: 2, shadow: '#000', outline: false });
    if (mode === 'goal') E.font.title(g, 'GOAL!', r.W / 2, r.H * .28, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    if (mode === 'half') E.font.text(g, 'HALF TIME', r.W / 2, r.H * .3, '#ffe7a8', { align: 'center', scale: 2, shadow: '#000', outline: false });
  }
  function results(g, r) {
    const w = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
    E.ui.box(g, r.W / 2 - 110, 52, 220, 128, { bg: '#141826', border: '#e8c070', alpha: .92 });
    E.font.title(g, w < 0 ? 'A DRAW' : TEAMS[w].name + ' WIN', r.W / 2, 60, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    E.font.text(g, 'GULLS ' + score[0] + ' - ' + score[1] + ' RUST', r.W / 2, 86, '#f0ecdc', { align: 'center', outline: false });
    stats.goals.slice(-5).forEach(([s, name, at], i) => E.font.text(g, mmss(at) + '  ' + name + ' (' + TEAMS[s].name + ')', r.W / 2, 100 + i * 9, '#c8d0e8', { align: 'center', font: 'tiny', outline: false }));
  }
  function drawMenu(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'CAGE CUP', r.W / 2, 34, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
      E.font.text(g, 'TWO AGAINST TWO, UP TO FOUR PLAYERS', r.W / 2, 70, '#c8d0e8', { align: 'center', outline: false });
      if (mode === 'join') {
        const P = game.players;
        E.font.text(g, 'VERSUS: PRESS 2 ON THE KEYBOARD, OR START ON A PAD, TO JOIN', r.W / 2, 96, '#ffe7a8', { align: 'center', font: 'tiny', outline: false });
        ['P1 GULLS', 'P2 RUST', 'P3 GULLS', 'P4 RUST'].forEach((s, i) => E.font.text(g, s + (P[i] ? '  READY' : '  ...'), r.W / 2 - 40, 112 + i * 12, P[i] ? E.PLAYER_COLORS[i] : '#6a7090', { outline: false }));
        E.font.text(g, prompt('confirm', 'PLAY') + '   ' + prompt('cancel', 'BACK'), r.W / 2, 172, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
      }
    });
    if (mode === 'menu') menu.draw(r);
  }

  /* ---- THE CONTROLS: the default preset's stick with three buttons of its own ---- */
  const KEYS = Object.assign({}, E.Input.DEFAULT, { pass: ['KeyJ', 'KeyX', 'Pad0'], shoot: ['KeyK', 'KeyZ', 'Pad2'], lob: ['KeyL', 'KeyC', 'Pad3'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];

  /** the proof: a match from the kickoff, player 1 running at goal, passing, lobbing, shooting; a hash of the match */
  const run = (n = 600) => proof('sports', n, (i, k) => {
    if (i === 1) start(false);
    if (i === 140) k.hold('right'); if (i === 200) k.tap('pass'); if (i === 300) k.tap('lob');
    if (i === 380) k.hold('shoot'); if (i === 440) k.up('shoot'); if (i === 520) k.up('right');
  }, () => [Math.round(ball.x), Math.round(ball.y), Math.round(ball.z), score, all.map(p => [Math.round(p.body.x), Math.round(p.body.y)]), stats.passes, stats.shots, owner ? owner.name : null]);
  /** the bot: player 1 plays a match by the game's own rules (the stick and the buttons, as a player gives them, from the
   *  CPU's own judgment for its player) to the final whistle; then four players, each holding one footballer, for a
   *  stretch. Returns { full, score, goals, passes, done, lobs, shots, curled, tackles, four, seconds, errors } */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s); const I = game.input, held = new Set(), hold = (a, on) => { if (on && !held.has(a)) { held.add(a); I.hold(a); } else if (!on && held.has(a)) { held.delete(a); I.hold(a, false); } };
    scripted = true;
    try {
      game.go('sports', null, { fade: 0 }); game.advance(1 / 120); start(false);
      let n = 0;
      for (; n < 120 * 400 && mode !== 'full'; n++) {
        const me = team[0].find(p => p.input);
        if (me && mode === 'play') {
          const c = brain(me, 1 / 120), mv = curlT > 0 && last === me && !owner ? [0, 0] : c.move;   // what the CPU would do in its place, given as the stick and buttons (still while its shot flies: no curl)
          hold('right', mv[0] > .35); hold('left', mv[0] < -.35); hold('down', mv[1] > .35); hold('up', mv[1] < -.35);
          if (c.pass) I.tap('pass'); if (c.lob) I.tap('lob'); hold('shoot', c.shootHeld);
        } else for (const a of ['right', 'left', 'up', 'down', 'shoot']) hold(a, false);
        game.advance(1 / 120);
      }
      for (const a of [...held]) hold(a, false);
      const r = { full: mode === 'full', score: score.slice(), goals: stats.goals.length, passes: stats.passes, done: stats.done, lobs: stats.lobs, shots: stats.shots, curled: stats.curled, tackles: stats.tackles, walls: stats.walls, seconds: Math.round(n / 120) };
      // four players: three more join, each footballer held by an input; a stretch of play, each pushing its stick
      while (game.players.length < 4) game.addPlayer(game.players.length === 1 ? { keys: 'right' } : { pad: game.players.length - 1 });
      start(true); const moved = all.map(p => [p.body.x, p.body.y]);
      for (let k = 0; k < 240; k++) { for (const p of all) if (p.input && p.input !== I) p.input.hold(p.side ? 'left' : 'right', k > 140); game.advance(1 / 120); }
      r.four = { held: all.filter(p => p.input).length, moved: all.filter((p, i) => Math.hypot(p.body.x - moved[i][0], p.body.y - moved[i][1]) > 4).length };
      for (const p of all) if (p.input && p.input !== I) p.input.hold(p.side ? 'left' : 'right', false);
      while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]);
      r.errors = game.errors.length; toMenu(); return r;
    } finally { for (const a of [...held]) hold(a, false); Math.random = was; scripted = false; }
  }

  return { view: 'threequarter', views: ['threequarter', 'topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['lob', 'shoot', 'pass'], camera: { zoom: [.7, 1.6] },
    enter(d) { game.cam.bounds = null; t = 0; if (d && d.part === 'match') start(false); else if (d && d.part === 'vs') versus(); else toMenu(); },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'join' || mode === 'full') { toMenu(); return true; } return false; },
    update, draw, bot, run,
    state: () => { const you = all.find(p => p.input === game.input);   // (for tests)
      return { mode, clock: +clock.toFixed(2), score: score.slice(), half, golden, owner: owner && owner.name, ball: ball && [Math.round(ball.x), Math.round(ball.y), Math.round(ball.z)],
        you: you && { name: you.name, x: Math.round(you.body.x), y: Math.round(you.body.y) }, passes: stats ? stats.passes : 0, shots: stats ? stats.shots : 0 }; } };
})();
scenes.sports = SPORTS;

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
