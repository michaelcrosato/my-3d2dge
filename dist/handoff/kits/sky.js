// The SKY kit's game (Mode 7 flight: a light plane through rings onto a runway, a skydive onto a target, an airship over a world that curves away; the camera pitched and rolled), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 168 (src/starter/64-sky.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. sky.html plays it; node kits/test.mjs sky runs it headless.
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
 * SLICE 23  SKY  (Pilotwings; Final Fantasy VI's airship, Secret of Mana's Flammie). @modules mode7 mesh
 * Flight over a Mode 7 world, three ways. LIGHT PLANE: ten rings round an island, then down onto its runway (lined up,
 * slow and level: flare it). SKYDIVE: out over the island, through the hoops of a free fall, the chute opened in its
 * band, down onto the target's bullseye. Each scored out of 100 for a medal. VOYAGE: an airship over a world that
 * curves away below it, the horizon bending with your height: light the three beacons (land beside each), then home.
 * Deep links: #sky/plane, #sky/dive, #sky/voyage.
 * KEYS: left / right bank and turn, down climbs and up dives (the stick of a plane), Z / J more throttle, X / K less,
 * Space opens the chute (and lands the airship by a beacon). A pad: the stick, A and X the throttle, B the chute.
 * TOUCH: the stick, GAS, SLOW and ACT.
 * HOW IT WORKS: E.Mode7 (the mode7 module) draws the island and the world below, its camera pitched and rolled with the
 * plane (cam.roll), the voyage's world a globe (curve); E.Mesh (the mesh module) the plane, the rings, the airship, the
 * chute and the towers as low-poly models; this file the flying, the courses, the scoring and the HUD.
 * ===================================================================================== */
const SKY = (() => {
  const KEYS = Object.assign({}, E.Input.DEFAULT, { gas: ['KeyZ', 'KeyJ', 'Pad0', 'Pad7'], slow: ['KeyX', 'KeyK', 'Pad2', 'Pad6'], act: ['Space', 'KeyC', 'Pad1', 'Pad5'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  const TX = 4, ISLE = 4096, M = 2048, hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  /* ---- THE ISLAND: a canvas a texel to 4 units, painted once (sea, reef, beaches, fields, woods, a peak, a lake, a
   * town, the runway north-south and the dive's target) ---- */
  const RUNWAY = { x: 1920, y0: 2400, y1: 3120, w: 40, aim: 3020 }, TARGET = [2600, 2700];
  let isle = null;
  function paintIsle() {
    const N = ISLE / TX, cv = E.mkCanvas(N, N), g = cv.getContext('2d'), img = g.createImageData(N, N), d = img.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x - 512, dy = y - 512, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy), n = hash(x, y) % 7;
      const coast = 330 + 70 * E.noise2(Math.cos(a) * 2 + 7, Math.sin(a) * 2 + 3) + 26 * E.noise2(x / 40, y / 40) - r, hill = E.noise2(x / 70 + 3, y / 70 + 9) * (coast > 60 ? 1 : 0) + Math.max(0, 1 - Math.hypot(x - 430, y - 360) / 150) * .5;
      let c;
      if (coast < -22) c = (E.noise2(x / 9, y / 3) > .62) ? [74, 132, 214] : [38 + n, 92 + n, 186];
      else if (coast < 0) c = [70, 178 + n * 2, 196];
      else if (coast < 9) c = [228 - n * 2, 206, 150];
      else if (hill > .95) c = [236, 238, 244];
      else if (hill > .8) c = [124 + n * 3, 112, 98];
      else if (Math.hypot(x - 600, y - 380) < 34 + 6 * E.noise2(x / 9, y / 9)) c = [52, 112, 196];
      else if (x > 560 && x < 700 && y > 560 && y < 640) c = (((x >> 3) + (y >> 4)) % 3) ? [196, 170, 82] : [118, 156, 64];   // (fields)
      else if (E.noise2(x / 18 + 50, y / 18) > .6) c = [36 + n * 2, 96, 44];
      else c = [86 + n * 3, 152 + n * 2, 70];
      const i = (y * N + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const R = RUNWAY, X = (R.x - R.w) / TX, Y0 = R.y0 / TX, Y1 = R.y1 / TX;
    px.rect(g, X - 3, Y0 - 3, R.w * 2 / TX + 6, Y1 - Y0 + 6, '#5e7a46'); px.rect(g, X, Y0, R.w * 2 / TX, Y1 - Y0, '#4a4a52');
    for (let y = Y0 + 6; y < Y1 - 10; y += 10) px.rect(g, R.x / TX - .5, y, 1, 5, '#e8e8e8');
    for (let k = 0; k < 4; k++) px.rect(g, X + 2 + k * 5, Y1 - 6, 3, 4, '#f0f0f0');
    px.rect(g, X + 2, R.aim / TX, 4, 3, '#f0f0f0'); px.rect(g, X + R.w * 2 / TX - 6, R.aim / TX, 4, 3, '#f0f0f0');
    px.line(g, R.x / TX, Y1, 430, 690, '#9a8a70', 2);
    for (let k = 0; k < 9; k++) { const hx = 400 + (k % 3) * 9, hy = 680 + Math.floor(k / 3) * 9; px.rect(g, hx, hy, 6, 6, '#e8dcc8'); px.rect(g, hx, hy, 6, 3, k % 2 ? '#c84a3a' : '#4a6ab8'); }
    for (const [r, c] of [[30, '#f0f0f0'], [24, '#d83a30'], [17, '#f0f0f0'], [10, '#d83a30'], [4, '#f0f0f0']]) px.disc(g, TARGET[0] / TX, TARGET[1] / TX, r / 1, c);
    return cv;
  }
  /* ---- THE WORLD (the voyage): continents on a sea that repeats, 8192 units round, seen as a globe ---- */
  const WT = 8, WN = 1024, CONT = [[220, 300, 150], [640, 230, 120], [800, 690, 160], [330, 760, 130], [560, 480, 54]];
  const BEACONS = [[5120, 1840], [6400, 5520], [2640, 6080]], HOME = [1760, 2400];
  let world = null;
  function paintWorld() {
    const cv = E.mkCanvas(WN, WN), g = cv.getContext('2d'), img = g.createImageData(WN, WN), d = img.data, wd = (a, b) => ((a - b + 1536) % WN) - 512;
    for (let y = 0; y < WN; y++) for (let x = 0; x < WN; x++) {
      let v = -1e9, which = 0;
      for (let k = 0; k < CONT.length; k++) { const [cx, cy, r] = CONT[k], q = r - Math.hypot(wd(x, cx), wd(y, cy)); if (q > v) { v = q; which = k; } }
      v += 34 * (E.noise2(x / 30, y / 30) - .5) + 16 * (E.noise2(x / 9, y / 9) - .5);
      const n = hash(x, y) % 6, m = E.noise2(x / 22 + 40, y / 22), f = E.noise2(x / 14 + 80, y / 14);
      const c = v < -28 ? [24 + n, 54 + n, 140] : v < 0 ? [40, 92 + n * 2, 184] : v < 6 ? [226, 204, 150] : m > .74 && v > 30 ? [236, 236, 244] : m > .64 && v > 18 ? [126, 108, 92]
        : which === 2 && E.noise2(x / 50, y / 50) > .45 ? (Math.sin(x / 5 + E.noise2(x / 20, y / 20) * 6) > .55 ? [186, 150, 92] : [218 - n * 3, 184, 114]) : f > .58 ? [34 + n, 98, 42] : [80 + n * 3, 150, 62];
      const i = (y * WN + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return cv;
  }
  let m7 = null, w7 = null;   // (made on the first visit: the paintings take a moment)
  const views = () => {
    if (!m7) m7 = new E.Mode7({ floor: isle = paintIsle(), texel: TX, outside: '#265cba', sky: new E.Backdrop({ sky: ['#2a62c8', '#6aa8ec', '#d0e6f8'], sun: { x: .7, y: .25, r: 12, color: '#fffbe0' }, layers: [{ kind: 'clouds', color: '#ffffff', y: .5, height: .2, parallax: .04, drift: 4 }] }), far: 9000, fog: { color: '#d0e6f8', near: 1600, far: 9000 } });
    if (!w7) w7 = new E.Mode7({ floor: world = paintWorld(), texel: WT, wrap: true, curve: 2200, sky: ['#2a4a9a', '#d8e8ff'], fog: { color: '#d8e8ff', near: 900, far: 2600 } });
  };

  /* ---- THE MODELS (x forward, y right, z up; a unit a quarter of a metre) ---- */
  const PLANE = new E.Mesh([
    ['tube', [3, 0, 7], 3.4, 5, 'body', { n: 8 }], ['tube', [-8, 0, 7.6], 1.2, 7, 'body', { n: 8, end: 2.8 }], ['tube', [9.5, 0, 7], 3.4, 1.5, '#d8d8d8', { n: 8, end: .45 }],
    ['box', [1.5, 9, 9.6], [3.8, 9, .5], 'wing', { mirror: true }], ['box', [1.2, 18.4, 9.6], [3.2, .5, .5], '#e83a30', { mirror: true }],
    ['box', [-13.5, 0, 8], [2.2, 6.5, .35], 'body'], ['box', [-13.5, 0, 11.5], [2.4, .35, 3.6], '#e83a30', { top: [.55, 1], tip: [-1.4, 0] }],
    ['box', [3, 0, 10.6], [3, 2.4, 1.4], '#7ad0ff', { top: [.55, .75], tip: [-.6, 0] }],
    ['box', [4, 3.6, 2.6], [.4, .4, 2], '#3a3a40', { mirror: true }], ['tube', [4, 3.6, 1.4], 1.4, .6, '#1e1e24', { axis: 'y', n: 6, mirror: true }]]);
  const PROP = new E.Mesh([['face', [[0, -6, -.7], [0, 6, -.7], [0, 6, .7], [0, -6, .7]], '#2a2a30', { both: true }]]);
  const ring = (R, w) => new E.Mesh(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * TAU, b = (i + 1) / 12 * TAU, P = (r, t, x) => [x, r * Math.cos(t), r * Math.sin(t)];
    return [['face', [P(R, a, 2), P(R - w, a, 2), P(R - w, b, 2), P(R, b, 2)], 'ring', { both: true }], ['face', [P(R, a, -2), P(R, b, -2), P(R, b, 2), P(R, a, 2)], 'ring']]; }).flat());
  const RING = ring(40, 7), HOOP = ring(70, 9);
  const SHIP = new E.Mesh([['ball', [0, 0, 34], [44, 15, 15], 'hull', { n: 10 }], ['box', [-2, 0, 13], [12, 5, 3.5], '#7a5030', { top: [1.08, 1.12] }], ['box', [-2, 0, 17.4], [10, 4.4, 1], '#c8a060'],
    ['box', [-40, 0, 47], [5, .6, 9], '#c83a30', { top: [.5, 1], tip: [-3, 0] }], ['box', [-40, 0, 34], [5, 16, .6], '#c83a30', { top: [.5, 1] }], ['tube', [-14, 9, 15], 2.2, 3, '#5a5a62', { mirror: true }]]);
  const CHUTE = new E.Mesh(Array.from({ length: 7 }, (_, i) => { const t0 = -1.15 + i * 2.3 / 7, t1 = t0 + 2.3 / 7, P = (t, x) => [x, 17 * Math.sin(t), 30 + 7 * Math.cos(t)]; return ['face', [P(t0, -5), P(t1, -5), P(t1, 5), P(t0, 5)], i % 2 ? '#f0f0f0' : '#e8402a', { both: true }]; }));
  const TOWER = new E.Mesh([['box', [0, 0, 22], [11, 11, 22], '#b8b0a0', { top: [.7, .7] }], ['box', [0, 0, 47], [9, 9, 3], '#7a7068'], ['box', [0, 0, 55], [8, 8, 5], 'cap', { top: [.1, .1] }]]);
  const CASTLE = new E.Mesh([['box', [0, 0, 12], [30, 20, 12], '#cac2b2'], ['box', [24, 18, 22], [6, 6, 22], '#b8b0a0', { mirror: true }], ['box', [-24, 18, 22], [6, 6, 22], '#b8b0a0', { mirror: true }],
    ['box', [24, 18, 48], [7, 7, 4], '#3a5aa8', { top: [.12, .12], mirror: true }], ['box', [-24, 18, 48], [7, 7, 4], '#3a5aa8', { top: [.12, .12], mirror: true }], ['box', [0, 0, 32], [10, 10, 8], '#d6cebe'], ['box', [0, 0, 45], [11, 11, 5], '#3a5aa8', { top: [.1, .1] }]]);
  const R7 = E.rng(11), TREES = [], CLOUDS = [];
  for (let i = 0; i < 70; i++) { const a = R7() * TAU, r = 300 + R7() * 900, x = M + Math.cos(a) * r, y = M + Math.sin(a) * r; if (Math.abs(x - RUNWAY.x) > 140 || y < 2300 || y > 3200) TREES.push([x, y, R7() < .5 ? 'tree' : 'pine', .8 + R7() * .5]); }
  for (let i = 0; i < 26; i++) CLOUDS.push([R7() * ISLE, R7() * ISLE, 420 + R7() * 500, 50 + R7() * 50]);
  const WCLOUDS = Array.from({ length: 40 }, () => [R7() * 8192, R7() * 8192, 300 + R7() * 300, 60 + R7() * 50]);
  const cloud = (c, k) => (g, sx, sy) => { const s = c[3] * k; if (s < 1) return; px.ell(g, sx, sy - s * .1, s * .9, s * .32, '#c8d4e8'); px.disc(g, sx - s * .45, sy - s * .38, s * .36, '#f4f8ff'); px.disc(g, sx + s * .35, sy - s * .34, s * .3, '#eef4fc'); px.disc(g, sx, sy - s * .55, s * .42, '#ffffff'); };

  /* ---- THE EVENTS ---- */
  const COURSE = [[2048, 3400, 280], [2360, 2840, 330], [2720, 2280, 380], [2600, 1660, 400], [2080, 1300, 360], [1520, 1520, 320], [1260, 2120, 260], [1180, 2860, 210], [1500, 4000, 150], [1920, 3780, 80, -Math.PI / 2]];
  const HOOPS = [[2390, 3150, 2000], [2450, 3040, 1600], [2510, 2930, 1200]];
  const yawOf = (L, i, from) => L[i][3] !== undefined ? L[i][3] : Math.atan2(L[i][1] - (i ? L[i - 1][1] : from[1]), L[i][0] - (i ? L[i - 1][0] : from[0]));
  const SONG = { bpm: 116, steps: 4, tracks: [
    { wave: 'square', vol: .05, notes: 'E5 . G5 . A5 . . G5 | E5 . D5 . C5 . . . | D5 . E5 . G5 . A5 . | B5 . . A5 G5 . . . | C6 . B5 . A5 . G5 . | A5 . G5 . E5 . D5 . | E5 . G5 . A5 . D5 . | C5 . . . . . . .' },
    { wave: 'triangle', vol: .24, notes: 'C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . G2 . D3 . | C3 . G3 . C3 . . .' },
    { wave: 'drums', vol: .05, notes: 'k . h . s . h . k . h k s . h .' }] };
  const VOYAGE_SONG = { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse', vol: .05, notes: 'A4 . . C5 E5 . . D5 | C5 . B4 . A4 . . . | F4 . . A4 C5 . . B4 | A4 . G4 . E4 . . . | A4 . . C5 E5 . . G5 | F5 . E5 . D5 . . . | C5 . D5 . E5 . . B4 | A4 . . . . . . .' },
    { wave: 'triangle', vol: .24, notes: 'A2 . E3 . A2 . E3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | E2 . B2 . E2 . B2 . | A2 . E3 . A2 . E3 . | D2 . A2 . D2 . A2 . | F2 . C3 . E2 . B2 . | A2 . E3 . A2 . . .' },
    { wave: 'drums', vol: .04, notes: 'k . . . s . . . k . k . s . . h' }] };
  let mode = 'menu', ev = null, t = 0, S = null, banner = null, bannerT = 0, pilot = null, res = null;
  const menu = new E.Menu(game, [E.t('sky.menu.plane'), E.t('sky.menu.dive'), E.t('sky.menu.voyage'), E.t('sky.menu.back')], { onPick: i => i === 3 ? game.go('title') : start(['plane', 'dive', 'voyage'][i]) });
  const after = new E.Menu(game, [E.t('sky.menu.again'), E.t('sky.menu.menu')], { onPick: i => i === 0 ? start(ev) : toMenu() });
  function toMenu() { mode = 'menu'; ev = null; S = null; A.music('title'); }
  const say = (s, secs = 2.2) => { banner = s; bannerT = secs; };
  /** an event from its start: the plane south of the island heading north; the diver at 600 m over the bay; the airship by the castle */
  function start(which) {
    views(); ev = which; mode = 'fly'; t = 0; res = null; pilot = null;
    if (which === 'plane') S = { x: 2048, y: 3900, z: 300, yaw: -Math.PI / 2, pitch: 0, roll: 0, speed: 150, thr: .55, prop: 0, next: 0, rings: 0, down: false, crash: 0, landed: false, touch: null };
    else if (which === 'dive') S = { x: 2350, y: 3260, z: 2400, vz: 0, yaw: -Math.PI / 2, next: 0, rings: 0, chute: 0, opened: null, canopy: false, down: false, brake: false };
    else S = { x: HOME[0], y: HOME[1] + 500, z: 260, yaw: -Math.PI / 2, speed: 180, thr: .5, lit: [false, false, false], home: false, land: null, prop: 0 };
    say(E.t('sky.goal.' + which), 3); A.music(which === 'voyage' ? VOYAGE_SONG : SONG); game.input.consumeAll();
  }
  // the player's stick: [x, y] (down climbs: a plane's), the throttle up or down, the act; or the autopilot's (the bot)
  const stick = () => { const I = game.input, [x, y] = I.move(); return { x, y, gas: I.down('gas'), brake: I.down('slow'), act: I.pressed('act') }; };
  /** the plane: the stick banks it and pitches it, the bank turns it, a dive gains speed and a climb loses it, too slow it
   *  stalls; at the ground it lands on the runway (lined up, slow, level, not sinking hard) or crashes */
  function plane(P, dt, k) {
    if (P.down) { P.speed = Math.max(0, P.speed - (P.landed ? 70 : 200) * dt); P.x += Math.cos(P.yaw) * P.speed * dt; P.y += Math.sin(P.yaw) * P.speed * dt; P.roll *= .9; P.pitch *= .9; return; }
    P.thr += ((k.gas ? 1 : k.brake ? 0 : P.thr) - P.thr) * Math.min(1, dt * 1.5);
    P.roll += (clamp(k.x, -1, 1) * .95 - P.roll) * Math.min(1, dt * 2.6);
    P.pitch += (clamp(k.y, -1, 1) * .55 - P.pitch) * Math.min(1, dt * 1.7);
    if (P.speed < 72) P.pitch -= (72 - P.speed) * .02 * dt;
    P.yaw += Math.sin(P.roll) * 1.15 * dt;
    P.speed = clamp(P.speed + ((70 + P.thr * 140 - P.speed) * .45 - Math.sin(P.pitch) * 90) * dt, 30, 260);
    const h = P.speed * Math.cos(P.pitch); P.x += Math.cos(P.yaw) * h * dt; P.y += Math.sin(P.yaw) * h * dt; P.z += P.speed * Math.sin(P.pitch) * dt; P.prop += dt * (10 + P.thr * 30);
    if (P.z > 0) return;
    const R = RUNWAY, on = Math.abs(P.x - R.x) < R.w && P.y > R.y0 && P.y < R.y1, sink = P.speed * Math.sin(P.pitch), lined = Math.abs(E.angDiff(P.yaw, -Math.PI / 2)) < .4;
    P.z = 0; P.down = true; P.touch = { y: P.y, sink, speed: P.speed };
    if (on && lined && Math.abs(P.roll) < .32 && sink > -42 && P.speed < 175) { P.landed = true; say(E.t('sky.landed')); A.sfx('land'); A.sfx('confirm'); }
    else { P.crash = 1; say(E.t(on ? 'sky.hard' : 'sky.crash')); A.sfx('explode'); game.shake(6); }
  }
  /** a ring is flown through when the plane crosses its plane within its radius */
  function through(P, L, i, from, r, was) {
    const [x, y, z] = L[i], a = yawOf(L, i, from), fx = Math.cos(a), fy = Math.sin(a), s0 = (was[0] - x) * fx + (was[1] - y) * fy, s1 = (P.x - x) * fx + (P.y - y) * fy;
    return s0 < 0 && s1 >= 0 && Math.hypot((P.x - x) * -fy + (P.y - y) * fx, P.z - z) < r;
  }
  /** the diver: a free fall the stick steers across the ground (north up the screen), the chute opened in its band, then
   *  a canopy that turns, glides and sinks (SLOW brakes it: held at the ground, a soft landing) */
  function dive(P, dt, k) {
    if (P.down) return;
    if (!P.canopy) {
      P.vz = Math.max(-200, P.vz - 160 * dt); P.x += k.x * 70 * dt; P.y += k.y * 70 * dt; P.z += P.vz * dt;
      if ((k.act && P.z < 1150) || P.z < 300) { P.canopy = true; P.opened = P.z; P.chute = 0; A.sfx('whoosh'); if (P.z < 300) say(E.t('sky.late')); }
    } else {
      P.chute = Math.min(1, P.chute + dt * 1.6); P.brake = k.brake || k.y > .6; const fwd = P.brake ? 18 : 44;
      P.yaw += clamp(k.x, -1, 1) * 1.1 * dt; P.x += Math.cos(P.yaw) * fwd * P.chute * dt; P.y += Math.sin(P.yaw) * fwd * P.chute * dt;
      P.z += Math.min(P.vz, 0) * dt; P.vz += ((P.brake ? -14 : -26) - P.vz) * Math.min(1, dt * 2.2);
    }
    if (P.z <= 0) { P.z = 0; P.down = true; P.dist = Math.hypot(P.x - TARGET[0], P.y - TARGET[1]); P.soft = P.canopy && P.vz > -20; say(E.t(P.dist < 20 ? 'sky.bull' : P.dist < 120 ? 'sky.landed' : 'sky.miss')); A.sfx(P.dist < 40 ? 'secret' : 'land'); }
  }
  /** the airship: it turns, rises and sinks with the stick, faster or slower with the throttle; by a beacon not yet lit,
   *  low enough, the act lands it beside it */
  function ship(P, dt, k) {
    P.prop += dt * 12;
    if (P.land) { const L = P.land; L.t += dt; P.z += ((L.t < 2.2 ? 40 : 240) - P.z) * Math.min(1, dt * 1.6); P.speed *= .97;
      if (L.t > 1.6 && !L.done) { L.done = true; if (L.i < 0) { P.home = true; say(E.t('sky.voyage.done'), 4); A.sfx('secret'); } else { P.lit[L.i] = true; say(E.t('sky.voyage.lit', { n: P.lit.filter(Boolean).length }), 3); A.sfx('oneup'); } }
      if (L.t > 3.4 && !P.home) P.land = null; return; }
    P.thr += ((k.gas ? 1 : k.brake ? 0 : P.thr) - P.thr) * Math.min(1, dt * 1.2);
    P.yaw += clamp(k.x, -1, 1) * 1.05 * dt; P.z = clamp(P.z - clamp(k.y, -1, 1) * -110 * dt, 120, 640);
    P.speed += (60 + P.thr * 240 - P.speed) * Math.min(1, dt * .8);
    P.x = ((P.x + Math.cos(P.yaw) * P.speed * dt) % 8192 + 8192) % 8192; P.y = ((P.y + Math.sin(P.yaw) * P.speed * dt) % 8192 + 8192) % 8192;
    const near = goal(P);
    if (near && near.d < 280 && P.z < 260 && k.act) { P.land = { t: 0, i: near.i }; A.sfx('confirm'); }
  }
  // the airship's next goal: the nearest beacon not yet lit, or home once all three are: { i (-1 home), x, y, d }
  function goal(P) {
    const wd = v => ((v + 12288) % 8192) - 4096;
    let best = null; const cand = P.lit.every(Boolean) ? [[-1, HOME]] : BEACONS.map((b, i) => [i, b]).filter(([i]) => !P.lit[i]);
    for (const [i, b] of cand) { const dx = wd(b[0] - P.x), dy = wd(b[1] - P.y), d = Math.hypot(dx, dy); if (!best || d < best.d) best = { i, x: P.x + dx, y: P.y + dy, d }; }
    return best;
  }
  /** a score out of 100, its parts and its medal */
  function score() {
    const P = S, part = [];
    if (ev === 'plane') { part.push(['rings', P.rings * 5]); const L = P.landed ? 30 + Math.round(10 * (1 - Math.min(1, Math.abs(P.touch.y - RUNWAY.aim) / 300))) + (P.touch.sink > -18 ? 10 : 0) : 0; part.push(['landing', L]); }
    else if (ev === 'dive') { part.push(['rings', P.rings * 10]); const o = P.opened || 0; part.push(['chute', o > 600 ? 10 : o > 400 ? 6 : 0]); const d = P.dist; part.push(['landing', (d < 20 ? 50 : d < 40 ? 40 : d < 80 ? 28 : d < 120 ? 16 : 6) + (P.soft ? 10 : 0)]); }
    else { const s = Math.max(0, Math.round(100 - Math.max(0, t - 90) / 2)); part.push(['time', s]); }
    const total = part.reduce((a, p) => a + p[1], 0), medal = total >= 90 ? 'gold' : total >= 75 ? 'silver' : total >= 55 ? 'bronze' : null;
    return { part, total, medal, best: best('sky:' + ev, total) };
  }
  /** the autopilot (the bot, and a demo): a stick that flies to the next ring or hoop, lands, opens the chute, finds the beacons */
  function auto(P) {
    const steer = (tx, ty, tz, spd) => { const d = Math.hypot(tx - P.x, ty - P.y), want = Math.atan2(tz - P.z, Math.max(70, d)), turn = E.angDiff(P.yaw, Math.atan2(ty - P.y, tx - P.x)); return { x: clamp(turn * 2.4, -1, 1), y: clamp((want - P.pitch) * 3 + want / .55, -1, 1), gas: P.speed < spd - 8, brake: P.speed > spd + 8 }; };
    if (ev === 'plane') {
      if (P.next < COURSE.length) { const [x, y, z] = COURSE[P.next], a = yawOf(COURSE, P.next, [2048, 3900]); return steer(x + Math.cos(a) * 60, y + Math.sin(a) * 60, z, 150); }
      const R = RUNWAY, k = steer(R.x, P.y > 3300 ? 3300 : R.aim - 200, P.y > 3300 ? 40 : 0, 100); if (P.z < 16) k.y = -.16; return k;   // (the flare: a slow, shallow sink)
    }
    if (ev === 'dive') {
      if (!P.canopy) { const h = HOOPS[P.next] || TARGET, dx = h[0] - P.x, dy = h[1] - P.y, l = Math.max(1, Math.hypot(dx, dy)) / Math.min(1, Math.hypot(dx, dy) / 30); return { x: dx / l, y: dy / l, act: P.z < 760 }; }
      const d = Math.hypot(TARGET[0] - P.x, TARGET[1] - P.y), to = Math.atan2(TARGET[1] - P.y, TARGET[0] - P.x), high = P.z > d / 1.3 + 30;   // (too high to glide straight in: circle the target)
      return { x: clamp(E.angDiff(P.yaw, to + (high && d < 150 ? 1.3 : 0)) * 2, -1, 1), brake: !high && (P.z > d / 1.7 || P.z < 18), y: 0 };
    }
    const g = goal(P); if (!g) return { x: 0, y: 0 };
    return { x: clamp(E.angDiff(P.yaw, Math.atan2(g.y - P.y, g.x - P.x)) * 2.4, -1, 1), y: g.d < 900 && P.z > 200 ? -1 : P.z < 300 && g.d > 900 ? 1 : 0, gas: g.d > 600, brake: g.d < 320, act: g.d < 250 && P.z < 260 };
  }

  /* ---- each step ---- */
  function update(dt) {
    const I = game.input;
    I.touchSet('gas', null, mode === 'fly' && ev !== 'dive'); I.touchSet('slow', null, mode === 'fly'); I.touchSet('act', null, mode === 'fly' && ev !== 'plane');
    t += dt; if (bannerT > 0) bannerT -= dt;
    if (mode === 'menu') { menu.update(dt); return; }
    if (mode === 'results') { after.update(dt); return; }
    const k = pilot ? auto(S) : stick(), was = [S.x, S.y, S.z];
    if (ev === 'plane') {
      plane(S, dt, k);
      if (S.next < COURSE.length && through(S, COURSE, S.next, [2048, 3900], 40, was)) { S.rings++; A.sfx('coin'); if (S.next === COURSE.length - 1) say(E.t('sky.final')); }
      if (S.next < COURSE.length) { const [x, y] = COURSE[S.next], a = yawOf(COURSE, S.next, [2048, 3900]); if ((S.x - x) * Math.cos(a) + (S.y - y) * Math.sin(a) > 0) S.next++; }   // (past it, through or not)
      if (S.down && S.speed < 4) finish();
    } else if (ev === 'dive') {
      dive(S, dt, k);
      const h = HOOPS[S.next]; if (h && S.z <= h[2]) { if (Math.hypot(S.x - h[0], S.y - h[1]) < 70) { S.rings++; A.sfx('coin'); } S.next++; }
      if (S.down) { S.after = (S.after || 0) + dt; if (S.after > 1.6) finish(); }
    } else {
      ship(S, dt, k);
      if (S.home && S.land && S.land.t > 3) finish();
    }
  }
  function finish() { if (mode !== 'fly') return; res = score(); mode = 'results'; after.i = 0; if (res.medal) A.sfx('powerup'); }

  /* ---- the look ---- */
  function shadow(V, x, y, z, s) { V.add(x, y, 0, (g, sx, sy, k) => { const a = g.globalAlpha; g.globalAlpha = a * clamp(.5 - z / 1600, .1, .5); px.ell(g, sx, sy, s * k, s * k * .36, '#0c1a10'); g.globalAlpha = a; }); }
  function camFor() {
    const tall = game.H > game.W, wide = tall ? 1.45 : 1, fov = tall ? 84 : 64;   // (a phone held upright: further back, wider)
    if (mode === 'menu' || !S) { const a = t * .08; return { x: M + Math.cos(a) * 1900, y: M + Math.sin(a) * 1900, h: 620, angle: a + Math.PI + .25, pitch: 20, fov: 66, roll: Math.sin(t * .3) * 5 }; }
    if (ev === 'plane') { const P = S, back = 84 * wide; return { x: P.x - Math.cos(P.yaw) * back * Math.cos(P.pitch), y: P.y - Math.sin(P.yaw) * back * Math.cos(P.pitch), h: Math.max(8, P.z + 24 * wide - Math.sin(P.pitch) * back * .6), angle: P.yaw, pitch: 10 - P.pitch * 40, fov, roll: P.roll * 40 }; }
    if (ev === 'dive') { const P = S; return P.canopy ? { x: P.x - Math.cos(P.yaw) * 90 * wide, y: P.y - Math.sin(P.yaw) * 90 * wide, h: P.z + 58 * wide, angle: P.yaw, pitch: 26, fov: fov + 2 } : { x: P.x, y: P.y + 70, h: P.z + 150 * wide, angle: -Math.PI / 2, pitch: 64, fov: fov + 6 }; }
    const P = S, a = P.yaw + .38; return { x: P.x - Math.cos(a) * 150 * wide, y: P.y - Math.sin(a) * 150 * wide, h: P.z + 50 * wide + P.z * .15, angle: P.yaw + .22, pitch: 15 + P.z / 60, fov };
  }
  function draw(r) {
    const W = r.W, H = r.H; views();
    const cam = camFor(), V = ev === 'voyage' ? w7 : m7, fx = Math.cos(cam.angle), fy = Math.sin(cam.angle);
    if (V === m7) {
      for (const [x, y, kind, s] of TREES) { const d = (x - cam.x) * fx + (y - cam.y) * fy; if (d > 20 && d < 2600) m7.shape(kind, x, y, 0, { size: s }); }
      for (const c of CLOUDS) m7.add(c[0], c[1], c[2], (g, sx, sy, k) => cloud(c, k)(g, sx, sy));
    } else {
      for (const c of WCLOUDS) w7.add(c[0], c[1], c[2], (g, sx, sy, k) => cloud(c, k)(g, sx, sy));
      BEACONS.forEach((b, i) => { const lit = S && S.lit && S.lit[i]; w7.mesh(TOWER, b[0], b[1], 0, { colors: { cap: lit ? '#ffd040' : '#5a5a68' } }); if (lit) w7.add(b[0], b[1], 64, (g, sx, sy, k) => { const s = (6 + Math.sin(t * 6) * 1.5) * k; px.disc(g, sx, sy - s, s * 1.6, '#fff4a0'); px.disc(g, sx, sy - s, s, '#ffffff'); }); });
      w7.mesh(CASTLE, HOME[0], HOME[1], 0, { yaw: Math.PI / 2 });
    }
    if (S && ev === 'plane') {
      const P = S, o = { yaw: P.yaw, pitch: P.pitch, roll: P.roll };
      COURSE.forEach((c, i) => { if (i >= P.next) m7.mesh(RING, c[0], c[1], c[2], { yaw: yawOf(COURSE, i, [2048, 3900]), colors: { ring: i === P.next ? (t * 4 % 2 < 1 ? '#ffd040' : '#ffe890') : '#e8eef8' } }); });
      if (!P.crash) { m7.mesh(PLANE, P.x, P.y, P.z, Object.assign({ colors: { body: '#f4f4f0', wing: '#f0c030' } }, o)); const n = PLANE.at(11.4, 0, 7, Object.assign({ x: P.x, y: P.y, z: P.z }, o)); m7.mesh(PROP, n[0], n[1], n[2], { yaw: P.yaw, pitch: P.pitch, roll: P.roll + P.prop }); }
      else m7.add(P.x, P.y, 0, (g, sx, sy, k) => { for (let i = 0; i < 5; i++) px.disc(g, sx + Math.sin(i * 2.1 + t) * 12 * k, sy - (10 + i * 7 + (t * 20 % 10)) * k, (6 + i * 2) * k, i % 2 ? '#5a5a5a' : '#3a3a3a'); });
      shadow(m7, P.x, P.y, P.z, 14);
    } else if (S && ev === 'dive') {
      const P = S;
      HOOPS.forEach((h, i) => { if (i >= P.next) m7.mesh(HOOP, h[0], h[1], h[2], { pitch: Math.PI / 2, colors: { ring: i === P.next ? '#ffd040' : '#e8eef8' } }); });
      const rig = diver(), up = P.canopy && P.chute > .2;
      m7.add(P.x, P.y, P.z, (g, sx, sy, k) => { rig.draw(g, Math.round(sx), Math.round(sy + (up ? 0 : 18 * k)), up ? m7.view(k) : flatView(k));
        if (up) for (const sd of [-1, 1]) { const e = CHUTE.at(0, 15 * sd, 31, { x: P.x, y: P.y, z: P.z + 6, yaw: P.yaw, scale: P.chute }), q = m7.project(e[0], e[1], e[2]); if (q) px.line(g, sx + sd * 3 * k, sy - 26 * k, q[0], q[1], '#e8e8e8', 1); } });
      if (up) m7.mesh(CHUTE, P.x, P.y, P.z + 6, { yaw: P.yaw, scale: P.chute });
      shadow(m7, P.x, P.y, P.z, 10);
    } else if (S && ev === 'voyage') {
      const P = S, o = { yaw: P.yaw, pitch: 0, roll: Math.sin(t * 1.3) * .04 };
      w7.mesh(SHIP, P.x, P.y, P.z, Object.assign({ colors: { hull: '#d8c8a0' } }, o));
      for (const s of [-1, 1]) { const p = SHIP.at(-17.5, 9 * s, 15, Object.assign({ x: P.x, y: P.y, z: P.z }, o)); w7.mesh(PROP, p[0], p[1], p[2], { yaw: P.yaw, roll: P.prop * s, scale: .7 }); }
    }
    V.draw(r, cam);
    hud(r, V);
  }
  // the diver: an HD rig, arms up; seen from above in the free fall (a level view: its back), from behind under the canopy
  let rigD = null, flatV = new Map();
  function diver() { if (!rigD) rigD = new E.Humanoid({ size: .9, weapon: null, hair: 'short', colors: { cloth: '#e8402a', pants: '#2a3a6a', hair: '#3a2010' }, helmet: true }); rigD.update(1 / 120, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, pose: 'cheer' }); return rigD; }
  function flatView(k) { const q = Math.max(1 / 8, Math.round(k * 8) / 8); let v = flatV.get(q); if (!v) flatV.set(q, v = new E.View('dive', 'Dive', 0, 0, q, 1)); return v; }
  function hud(r, V) {
    const W = r.W, H = r.H, right = cornerX() - 4, lh = E.font.lineHeight();
    r.overlay(g => {
      const txt = (s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#0a1020', outline: false }, o));
      if (mode === 'menu') {
        E.font.title(g, E.t('sky.title'), W / 2, 24, { scale: 4, align: 'center', colors: ['#ffffff', '#bfe4ff', '#4a9ae8', '#2a5ab8'], depth: 3 });
        txt(E.t('sky.tagline'), W / 2, 24 + 46, '#e8f4ff', { align: 'center' }); return;
      }
      const P = S; if (!P) return;
      txt(E.t('sky.event.' + ev), 6, 6, '#ffe890');
      if (ev === 'plane') txt(E.t('sky.hud.rings', { n: P.rings, of: COURSE.length }), 6, 6 + lh);
      if (ev === 'dive') txt(E.t('sky.hud.rings', { n: P.rings, of: HOOPS.length }), 6, 6 + lh);
      if (ev === 'voyage') txt(E.t('sky.hud.beacons', { n: P.lit.filter(Boolean).length }), 6, 6 + lh);
      txt(E.t('sky.hud.alt', { m: Math.round(P.z / 4) }), right, 6, P.z < 40 && ev === 'plane' && !P.down ? '#ffb040' : '#ffffff', { align: 'right' });
      if (P.speed !== undefined) txt(E.t('sky.hud.speed', { kmh: Math.round(P.speed * .9) }), right, 6 + lh, '#ffffff', { align: 'right' });
      if (ev === 'dive' && !P.canopy && !P.down) {   // the altimeter's band: open the chute while the needle is in the green
        const x = right - 8, y0 = 8 + lh * 2, h = Math.min(90, H / 2), z2y = z => y0 + h - clamp(z / 2400, 0, 1) * h;
        px.rect(g, x - 1, y0 - 1, 8, h + 2, '#0a1020'); px.rect(g, x, z2y(1150), 6, z2y(600) - z2y(1150), '#40c060'); px.rect(g, x, z2y(600), 6, z2y(300) - z2y(600), '#e0a030'); px.rect(g, x - 3, Math.round(z2y(P.z)), 12, 2, '#ffffff');
        if (P.z < 1150) txt(E.t('sky.hud.open', { key: game.input.label('act') }), W / 2, H * .7, '#ffffff', { align: 'center' });
      }
      if (ev === 'voyage' && !P.home) {   // the compass: an arrow to the next goal, and how far
        const q = goal(P), a = Math.atan2(q.y - P.y, q.x - P.x) - P.yaw - Math.PI / 2, cx = W / 2, cy = 22, R = 10;
        px.disc(g, cx, cy, R + 3, '#0a1020'); px.poly(g, [[cx + Math.cos(a) * R, cy + Math.sin(a) * R], [cx + Math.cos(a + 2.5) * R * .6, cy + Math.sin(a + 2.5) * R * .6], [cx + Math.cos(a - 2.5) * R * .6, cy + Math.sin(a - 2.5) * R * .6]], q.i < 0 ? '#80c0ff' : '#ffd040');
        txt(E.t(q.i < 0 ? 'sky.hud.home' : 'sky.hud.beacon', { m: Math.round(q.d / 4) }), cx, cy + R + 6, '#ffffff', { align: 'center' });
        if (q.d < 280 && P.z < 260 && !P.land) txt(E.t('sky.hud.land', { key: game.input.label('act') }), W / 2, H * .7, '#ffe890', { align: 'center' });
        else if (q.d < 600 && P.z >= 260 && !P.land) txt(E.t('sky.hud.lower'), W / 2, H * .7, '#ffffff', { align: 'center' });
      }
      if (ev === 'plane' && S.next < COURSE.length && !S.down) {   // the next ring off the screen: an arrow at the edge
        const c = COURSE[S.next], p = m7.project(c[0], c[1], c[2]);
        if (!p || p[0] < 8 || p[0] > W - 8 || p[1] < 8 || p[1] > H - 8) { const a = p ? Math.atan2(p[1] - H / 2, p[0] - W / 2) : Math.atan2(c[1] - S.y, c[0] - S.x) - S.yaw - Math.PI / 2, ex = W / 2 + Math.cos(a) * (W / 2 - 18), ey = H / 2 + Math.sin(a) * (H / 2 - 18);
          px.poly(g, [[ex + Math.cos(a) * 8, ey + Math.sin(a) * 8], [ex + Math.cos(a + 2.4) * 6, ey + Math.sin(a + 2.4) * 6], [ex + Math.cos(a - 2.4) * 6, ey + Math.sin(a - 2.4) * 6]], '#ffd040'); }
      }
      if (ev === 'plane' && S.next >= COURSE.length && !S.down) txt(E.t('sky.hud.flare'), W / 2, H * .72, S.z < 30 ? '#ffe890' : '#ffffff', { align: 'center' });
      if (bannerT > 0 && banner) txt(banner, W / 2, Math.round(H * .3), '#ffffff', { align: 'center', scale: 2 });
      if (mode === 'results' && res) {
        const w = 190, h = 44 + res.part.length * lh, x = Math.round((W - w) / 2), y = Math.round(H / 2 - h / 2 - 24);
        E.ui.box(g, x, y, w, h, { bg: '#0e1a3a', border: '#d8ecff' });
        res.part.forEach(([k, v], i) => { txt(E.t('sky.part.' + k), x + 10, y + 8 + i * lh); txt(String(v), x + w - 10, y + 8 + i * lh, '#ffe890', { align: 'right' }); });
        const yy = y + 12 + res.part.length * lh; txt(E.t('sky.total', { n: res.total }), x + 10, yy, '#ffffff'); txt(E.t('sky.best', { n: res.best }), x + w - 10, yy, '#a8c8f0', { align: 'right' });
        if (res.medal) { const mc = { gold: '#ffd040', silver: '#d8dce8', bronze: '#d08a4a' }[res.medal]; px.disc(g, x + w - 22, y + h - 12, 8, '#6a4a10'); px.disc(g, x + w - 22, y + h - 12, 6, mc); txt(E.t('sky.medal.' + res.medal), x + 10, yy + lh, mc); }
      }
    });
    if (mode === 'menu') { menu.y = Math.round(H / 2) - 4; menu.draw(r); }
    if (mode === 'results') { after.y = Math.round(H / 2) + 44; after.draw(r); }
  }

  /** the bot (tools/kits-test.mjs): each event flown by the autopilot to its end: the plane round the rings and onto the
   *  runway, the diver through the hoops onto the target, the airship to the three beacons and home */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s);
    try {
      game.go('sky', null, { fade: 0 }); game.advance(1 / 120); const out = {};
      for (const e of ['plane', 'dive', 'voyage']) {
        start(e); pilot = true; let n = 0; for (; n < 400 && mode === 'fly'; n++) game.advance(1);
        out[e] = e === 'plane' ? { rings: S.rings, landed: S.landed, score: res && res.total, seconds: n } : e === 'dive' ? { rings: S.rings, dist: Math.round(S.dist), soft: S.soft, score: res && res.total, seconds: n } : { lit: S.lit.filter(Boolean).length, home: S.home, seconds: n };
        toMenu();
      }
      return Object.assign(out, { errors: game.errors.length });
    } finally { Math.random = was; pilot = null; }
  }

  return { view: 'topdown', views: ['topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['gas', 'slow', 'act'], camera: { zoom: false },
    enter(d) { mode = 'menu'; S = null; ev = null; menu.i = 0; game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false; A.music('title'); if (d && d.part) start(['plane', 'dive', 'voyage'].includes(d.part) ? d.part : 'plane'); },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'results') { toMenu(); return true; } return false; },
    update, draw, bot,
    /** an event flown by the autopilot (a demo; the bot's) */
    demo(e) { start(e); pilot = true; },
    state: () => S && { mode, ev, t: +t.toFixed(2), x: Math.round(S.x), y: Math.round(S.y), z: Math.round(S.z), yaw: +S.yaw.toFixed(3), roll: S.roll !== undefined ? +S.roll.toFixed(3) : 0, speed: S.speed !== undefined ? Math.round(S.speed) : 0, thr: S.thr !== undefined ? +S.thr.toFixed(2) : 0, rings: S.rings, down: S.down, score: res && res.total },
    /** the proof: the light plane from its start, the throttle up, a bank to the right and a climb, then level */
    run: (n = 600) => proof('sky', n, (i, k) => {
      if (i === 2) start('plane');
      if (i === 100) { k.hold('gas'); k.hold('right'); }
      if (i === 300) { k.up('right'); k.hold('down'); }
      if (i === 450) { k.up('down'); k.up('gas'); }
    }, () => S && [S.x, S.y, S.z, S.yaw, S.roll, S.pitch, S.speed, S.rings]) };
})();
scenes.sky = SKY;

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
