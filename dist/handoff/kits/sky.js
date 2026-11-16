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
 * Flight over a Mode 7 world, six ways. LIGHT PLANE: ten rings round an island, then down onto its runway (lined up,
 * slow and level: flare it). SKYDIVE: out over the island, through the hoops of a free fall, the chute opened in its
 * band, down onto the target's bullseye. ROCKET BELT: up off the ground on a jet pack (GAS climbs, let go and it sinks,
 * the stick leans you forward or back and turns you), five low rings on the fuel it has, then down softly on the pad.
 * HANG GLIDER: let go high over the south of the island, no engine: the stick banks and pitches it (nose down it dives,
 * faster and lower; nose up it slows; too slow it stalls), it always sinks a little, SLOW is its air brake; circle in a
 * thermal (a column of rising sparkles) to climb to the high ring, four rings, then down onto the target, slow and
 * level. HELICOPTER: up off the pad (GAS climbs, SLOW comes down, let go and it hovers; the stick tilts it forward or
 * back and turns it), ACT fires a missile ahead and a little down: five flak turrets to destroy (three hits and it is
 * down), then back onto the pad. Each scored out of 100 for a medal. VOYAGE: an airship over a world that
 * curves away below it, the horizon bending with your height: light the three beacons (land beside each), then home.
 * Deep links: #sky/plane, #sky/dive, #sky/belt, #sky/glider, #sky/heli, #sky/voyage.
 * KEYS: left / right bank and turn, down climbs and up dives (the stick of a plane and the glider; the belt's and the
 * helicopter's: up flies forward), Z / J more throttle (the helicopter climbs), X / K less (the glider's air brake; the
 * helicopter comes down), Space opens the chute (lands the airship by a beacon, fires the helicopter's missile). A pad:
 * the stick, A and X the throttle, B the chute.
 * TOUCH: the stick, GAS, SLOW and ACT, each where it acts (the glider SLOW alone; the helicopter's ACT is FIRE).
 * HOW IT WORKS: E.Mode7 (the mode7 module) draws the island and the world below, its camera pitched and rolled with the
 * plane (cam.roll), the voyage's world a globe (curve); E.Mesh (the mesh module) the plane, the glider, the helicopter,
 * the turrets, the rings, the airship, the chute and the towers as low-poly models; this file the flying, the courses,
 * the thermals, the flak, the scoring and the HUD.
 * ===================================================================================== */
const SKY = (() => {
  const KEYS = Object.assign({}, E.Input.DEFAULT, { gas: ['KeyZ', 'KeyJ', 'Pad0', 'Pad7'], slow: ['KeyX', 'KeyK', 'Pad2', 'Pad6'], act: ['Space', 'KeyC', 'Pad1', 'Pad5'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  const TX = 4, ISLE = 4096, M = 2048, hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  /* ---- THE ISLAND: a canvas a texel to 4 units, painted once (sea, reef, beaches, fields, woods, a peak, a lake, a
   * town, the runway north-south and the dive's target) ---- */
  const RUNWAY = { x: 1920, y0: 2400, y1: 3120, w: 40, aim: 3020 }, TARGET = [2600, 2700], PAD = [2120, 2600];   // (PAD: the rocket belt's)
  let isle = null;
  function paintIsle() {
    const N = ISLE / TX, cv = E.mkCanvas(N, N), g = cv.getContext('2d'), img = g.createImageData(N, N), d = img.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x - 512, dy = y - 512, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy), n = hash(x, y) % 7;
      const coast = 330 + 70 * E.noise2(Math.cos(a) * 2 + 7, Math.sin(a) * 2 + 3) + 26 * E.noise2(x / 40, y / 40) - r, hill = E.noise2(x / 70 + 3, y / 70 + 9) * (coast > 60 ? 1 : 0) + Math.max(0, 1 - Math.hypot(x - 430, y - 360) / 150) * .5;
      let c;
      if (coast < -22) c = (E.noise2(x / 9, y / 3) > .62 + Math.max(0, r - 440) / 170) ? [74, 132, 214] : [38 + n, 92 + n, 186];   // (the waves thin out to none before the canvas's edge: plain sea, as outside it)
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
  // the hang glider: a sail of two colours on its keel, the A-frame and its bar, the pilot hung prone under it
  const GLIDER = new E.Mesh([['face', [[9, 0, 15], [-6, 0, 14.6], [-5, 9, 14]], 'sail', { both: true, mirror: true }], ['face', [[9, 0, 15], [-5, 9, 14], [-4, 18, 13.2]], '#f4f4f0', { both: true, mirror: true }],
    ['tube', [1.5, 0, 14.9], .45, 8, '#3a3a40', { n: 4 }], ['face', [[2, -.35, 14.6], [2, .35, 14.6], [3, 4.35, 4], [3, 3.65, 4]], '#a8a8b4', { both: true, mirror: true }], ['box', [3, 0, 4], [.4, 4.2, .4], '#a8a8b4'],
    ['box', [1, 0, 11], [.3, .3, 3.4], '#3a3a40'], ['box', [-.5, 0, 7.3], [4.5, 1.5, 1.3], '#2a3a6a'], ['ball', [4.6, 0, 7.7], [1.5, 1.4, 1.5], '#e8402a', { n: 6 }]]);
  // the helicopter (its rotors their own models, spun), the flak turrets (a base, a head that turns, twin barrels that
  // lift) and a missile
  const HELI = new E.Mesh([['ball', [1, 0, 9], [10, 5.5, 6.5], 'body', { n: 8 }], ['box', [7.5, 0, 9.5], [2.5, 3.6, 3], '#7ad0ff', { top: [.3, .75], tip: [-1.8, 0] }], ['tube', [-15, 0, 11], 1.8, 8, 'body', { n: 6, end: .55 }],
    ['face', [[-21, 0, 11.5], [-25.5, 0, 12], [-27, 0, 19.5], [-24, 0, 19.5]], 'trim', { both: true }], ['box', [-21.5, 0, 12.2], [1.6, 4.5, .3], 'trim'],
    ['box', [1, 5.5, .6], [10, .5, .5], '#3a3a40', { mirror: true }], ['box', [5, 5, 2.6], [.4, .4, 2], '#3a3a40', { mirror: true }], ['box', [-3, 5, 2.6], [.4, .4, 2], '#3a3a40', { mirror: true }], ['tube', [0, 0, 16.6], 1, 1.5, '#3a3a40', { axis: 'z', n: 5 }]]);
  const ROTOR = new E.Mesh([['face', [[-24, -1.2, 0], [24, -1.2, 0], [24, 1.2, 0], [-24, 1.2, 0]], '#2a2a30', { both: true }], ['face', [[-1.2, -24, 0], [1.2, -24, 0], [1.2, 24, 0], [-1.2, 24, 0]], '#2a2a30', { both: true }]]);
  const TROTOR = new E.Mesh([['face', [[-4.5, 0, -.6], [4.5, 0, -.6], [4.5, 0, .6], [-4.5, 0, .6]], '#2a2a30', { both: true }]]);
  const TBASE = new E.Mesh([['tube', [0, 0, 7], 20, 7, 'base', { axis: 'z', n: 8 }], ['box', [0, 0, 15], [12, 12, 1], '#4a4e40']]);
  const TGUN = new E.Mesh([['box', [0, 0, 6], [9, 8, 6], '#7a8058', { top: [.7, .8], tip: [-1.5, 0] }]]), TBARREL = new E.Mesh([['tube', [11, 3.2, 0], 1.4, 12, '#2a2a2e', { n: 5, mirror: true }], ['box', [0, 0, 0], [2.6, 4.8, 2.2], '#5a6044']]);
  const MISSILE = new E.Mesh([['tube', [0, 0, 0], .9, 4, '#eceae4', { n: 5, end: .25 }], ['face', [[-2.5, 0, 0], [-4.5, 0, 0], [-4.5, 0, 2.6]], '#c83a30', { both: true }], ['face', [[-2.5, 0, 0], [-4.5, 0, 0], [-4.5, 2.6, 0]], '#c83a30', { both: true, mirror: true }]]);
  const R7 = E.rng(11), TREES = [], CLOUDS = [];
  for (let i = 0; i < 70; i++) {   // (off the runway, the dive's target and the belt's pad: one there still takes its draws, so the rest stand where they did)
    const a = R7() * TAU, r = 300 + R7() * 900, x = M + Math.cos(a) * r, y = M + Math.sin(a) * r;
    if (Math.abs(x - RUNWAY.x) > 140 || y < 2300 || y > 3200) { const tr = [x, y, R7() < .5 ? 'tree' : 'pine', .8 + R7() * .5]; if (Math.hypot(x - TARGET[0], y - TARGET[1]) > 150 && Math.hypot(x - PAD[0], y - PAD[1]) > 70) TREES.push(tr); }
  }
  for (let i = 0; i < 26; i++) CLOUDS.push([R7() * ISLE, R7() * ISLE, 420 + R7() * 500, 50 + R7() * 50]);
  const WCLOUDS = Array.from({ length: 40 }, () => [R7() * 8192, R7() * 8192, 300 + R7() * 300, 60 + R7() * 50]);
  const cloud = (c, k) => (g, sx, sy) => { const s = c[3] * k; if (s < 1) return; px.ell(g, sx, sy - s * .1, s * .9, s * .32, '#c8d4e8'); px.disc(g, sx - s * .45, sy - s * .38, s * .36, '#f4f8ff'); px.disc(g, sx + s * .35, sy - s * .34, s * .3, '#eef4fc'); px.disc(g, sx, sy - s * .55, s * .42, '#ffffff'); };
  // smoke rising from a wreck on the ground (a crashed plane, a turret destroyed, the helicopter shot down)
  const smoke = (x, y) => m7.add(x, y, 0, (g, sx, sy, k) => { for (let i = 0; i < 5; i++) px.disc(g, sx + Math.sin(i * 2.1 + t) * 12 * k, sy - (10 + i * 7 + (t * 20 % 10)) * k, (6 + i * 2) * k, i % 2 ? '#5a5a5a' : '#3a3a3a'); });

  /* ---- THE EVENTS ---- */
  const COURSE = [[2048, 3400, 280], [2360, 2840, 330], [2720, 2280, 380], [2600, 1660, 400], [2080, 1300, 360], [1520, 1520, 320], [1260, 2120, 260], [1180, 2860, 210], [1500, 4000, 150], [1920, 3780, 80, -Math.PI / 2]];
  const HOOPS = [[2390, 3150, 2000], [2450, 3040, 1600], [2510, 2930, 1200]];
  const BELT = [[2048, 3380, 60], [2160, 3220, 110], [2300, 3080, 70], [2250, 2880, 140], [2140, 2740, 90]], BELT0 = [2048, 3540];   // (the start on the island's grass, south)   // the rocket belt's rings, its pad, its start
  // the hang glider's: four rings ([x, y, z, the way through]), the second higher than where it's let go (GLIDE0: a
  // thermal's climb first), then down onto the dive's target; the thermals, columns of rising air TH_R across
  const GLIDE = [[2048, 3250, 540, -Math.PI / 2], [2700, 2350, 800, -.93], [2150, 1650, 560, -2.24], [1950, 2300, 300, 1.87]], GLIDE0 = [2048, 3720, 600];
  const THERMALS = [[2260, 2950], [1760, 1880], [2920, 2260]], TH_R = 160;
  const lift = (x, y, z) => THERMALS.reduce((l, [tx, ty]) => { const d = Math.hypot(x - tx, y - ty) / TH_R; return d < 1 ? Math.max(l, 42 * (1 - d * d) * clamp((1400 - z) / 300, 0, 1)) : l; }, 0);   // (strongest at the core, fading out above 1100)
  // the helicopter's: five flak turrets on the island (it starts on the belt's pad); its missile's speed and dip, the flak's speed
  const TURRETS = [[2380, 2300], [1700, 2250], [1560, 2950], [2620, 3050], [2500, 1700]], MS = 380, DIP = .14, FLAK = 150;
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
  const EVENTS = ['plane', 'dive', 'belt', 'glider', 'heli', 'voyage'], menu = new E.Menu(game, EVENTS.map(e => E.t('sky.menu.' + e)).concat(E.t('sky.menu.back')), { onPick: i => i === EVENTS.length ? game.go('title') : start(EVENTS[i]) });
  const after = new E.Menu(game, [E.t('sky.menu.again'), E.t('sky.menu.menu')], { onPick: i => i === 0 ? start(ev) : toMenu() });
  function toMenu() { mode = 'menu'; ev = null; S = null; A.music('title'); }
  const say = (s, secs = 2.2) => { banner = s; bannerT = secs; };
  /** an event from its start: the plane south of the island heading north; the diver at 600 m over the bay; the glider
   *  let go at 150 m off the south shore; the helicopter on the pad; the airship by the castle */
  function start(which) {
    views(); ev = which; mode = 'fly'; t = 0; res = null; pilot = null;
    if (which === 'plane') S = { x: 2048, y: 3900, z: 300, yaw: -Math.PI / 2, pitch: 0, roll: 0, speed: 150, thr: .55, prop: 0, next: 0, rings: 0, down: false, crash: 0, landed: false, touch: null };
    else if (which === 'belt') S = { x: BELT0[0], y: BELT0[1], z: 0, vz: 0, v: 0, yaw: -Math.PI / 2, roll: 0, lean: 0, fuel: 100, thrust: 0, next: 0, rings: 0, up: false, down: false };
    else if (which === 'glider') S = { x: GLIDE0[0], y: GLIDE0[1], z: GLIDE0[2], vz: 0, yaw: -Math.PI / 2, pitch: 0, roll: 0, speed: 64, lift: 0, got: GLIDE.map(() => false), next: 0, rings: 0, stall: false, brake: false, down: false, ap: {} };   // (ap: the autopilot's memory)
    else if (which === 'heli') S = { x: PAD[0], y: PAD[1], z: 0, vz: 0, v: 0, speed: 0, yaw: -Math.PI / 2, roll: 0, lean: 0, rotor: 0, cool: 0, fired: 0, kills: 0, hits: 0, up: false, ground: true, down: false, landed: false,
      tur: TURRETS.map(([x, y], i) => ({ x, y, dead: false, cool: 1 + i * .3, yaw: Math.atan2(PAD[1] - y, PAD[0] - x), el: .3 })), mis: [], flak: [], puffs: [] };
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
  /** the rocket belt: GAS climbs, SLOW drops, neither and it sinks slowly; the stick leans it forward or back (it flies
   *  that way) and turns it; the fuel runs down (faster on GAS), and when it's gone it falls; down again on the ground
   *  (once up), the landing judged by the pad and how hard */
  function belt(P, dt, k) {
    if (P.down) { P.v *= .9; P.roll *= .9; return; }   // (down: it stops, and stands up straight)
    const idle = P.z <= 0 && !k.gas, lift = P.fuel <= 0 ? -1.3 : k.gas ? 1 : k.brake ? -1 : -.3; P.thrust = !idle && lift > -.5 ? 1 : 0;   // (on the ground it stands, its jets off, till GAS)
    if (!idle) P.fuel = Math.max(0, P.fuel - (1 + (k.gas ? 2 : 0)) * dt); P.vz += (lift * 70 - P.vz) * Math.min(1, dt * 1.6);
    P.yaw += clamp(k.x, -1, 1) * 1.4 * dt; P.v += ((P.z > 0 ? -clamp(k.y, -1, 1) * 120 : 0) - P.v) * Math.min(1, dt * (P.z > 0 ? 1.1 : 6)); P.roll += (clamp(k.x, -1, 1) * .3 - P.roll) * Math.min(1, dt * 4); P.lean = P.v / 400;   // (the lean flies it only off the ground)
    P.x += Math.cos(P.yaw) * P.v * dt; P.y += Math.sin(P.yaw) * P.v * dt; P.z = Math.max(0, P.z + P.vz * dt); if (P.z > 15) P.up = true;
    if (P.z <= 0 && (P.up || P.fuel <= 0)) { P.down = true; P.dist = Math.hypot(P.x - PAD[0], P.y - PAD[1]); P.soft = P.vz > -32; say(E.t(P.dist < 15 ? 'sky.bull' : P.dist < 90 ? 'sky.landed' : 'sky.miss')); A.sfx(P.soft ? 'land' : 'hurt'); if (!P.soft) game.shake(4); }
  }
  /** the hang glider: no engine. The stick banks it (the bank turns it) and pitches it: nose down it dives, faster and
   *  lower; nose up it slows, and too slow it stalls, its nose dropping till it has the speed again. It always sinks a
   *  little (more when fast, turning, or on SLOW, its air brake), and a thermal lifts it; at the ground the landing is
   *  judged by the target, soft if slow, level and not sinking hard */
  function glider(P, dt, k) {
    if (P.down) { P.speed = Math.max(0, P.speed - 70 * dt); P.x += Math.cos(P.yaw) * P.speed * dt; P.y += Math.sin(P.yaw) * P.speed * dt; P.roll *= .9; P.pitch *= .9; return; }
    P.brake = !!k.brake; P.stall = P.speed < (P.stall ? 46 : 38);   // (it stalls under 38, and flies again over 46)
    P.roll += (clamp(k.x, -1, 1) * .8 - P.roll) * Math.min(1, dt * 2.2);
    P.pitch += ((P.stall ? -.4 : clamp(k.y, -1, 1) * .45) - P.pitch) * Math.min(1, dt * (P.stall ? 3 : 1.6));
    P.yaw += Math.sin(P.roll) * 1.1 * dt;
    P.speed = clamp(P.speed + (((P.brake ? 46 : 64) - P.speed) * (P.brake ? .8 : .3) - Math.sin(P.pitch) * 60) * dt, 20, 150);
    P.lift = lift(P.x, P.y, P.z);
    P.vz = P.speed * Math.sin(P.pitch) - (6 + .0012 * (P.speed - 64) ** 2) / Math.cos(P.roll) - (P.brake ? 10 : 0) - (P.stall ? 12 : 0) + P.lift;
    const h = P.speed * Math.cos(P.pitch); P.x += Math.cos(P.yaw) * h * dt; P.y += Math.sin(P.yaw) * h * dt; P.z += P.vz * dt;
    if (P.z > 0) return;
    P.z = 0; P.down = true; P.dist = Math.hypot(P.x - TARGET[0], P.y - TARGET[1]); P.soft = P.vz > -16 && Math.abs(P.roll) < .35 && P.speed < 80;
    say(E.t(!P.soft ? 'sky.hard' : P.dist < 20 ? 'sky.bull' : P.dist < 120 ? 'sky.landed' : 'sky.miss')); A.sfx(!P.soft ? 'hurt' : P.dist < 40 ? 'secret' : 'land'); if (!P.soft) game.shake(4);
  }
  /** the helicopter: GAS climbs, SLOW comes down (gently near the ground), neither and it holds its height (a hover); the
   *  stick tilts it forward or back (it flies that way, its nose down going forward) and turns it. Set down softly
   *  anywhere, it lifts off again; on the pad with every turret destroyed, it has landed. Three hits and it falls */
  function heli(P, dt, k) {
    P.rotor += dt * (P.down ? 1 : P.z > 0 || k.gas ? 16 : 9);
    if (P.down) { P.v *= .9; P.speed = Math.abs(P.v); return; }
    if (P.hits >= 3) {   // shot down: it falls, spinning, and burns where it lands
      P.vz -= 110 * dt; P.yaw += 4 * dt; P.roll += (.5 - P.roll) * dt; P.x += Math.cos(P.yaw) * P.v * dt; P.y += Math.sin(P.yaw) * P.v * dt; P.z += P.vz * dt;
      if (P.z <= 0) { P.z = 0; P.down = true; puff(P, P.x, P.y, 8, 2); A.sfx('explode'); game.shake(8); } return;
    }
    const ground = P.z <= 0, want = k.gas ? 70 : k.brake ? -clamp(P.z * 1.2, 16, 60) : 0;
    P.vz += (want - P.vz) * Math.min(1, dt * 2.5); P.yaw += clamp(k.x, -1, 1) * 1.3 * dt;
    P.v += ((ground ? 0 : -clamp(k.y, -1, 1) * 170) - P.v) * Math.min(1, dt * (ground ? 6 : 1.1)); P.speed = Math.abs(P.v);
    P.roll += ((ground ? 0 : clamp(k.x, -1, 1) * .3) - P.roll) * Math.min(1, dt * 4); P.lean += (-P.v / 170 * .28 - P.lean) * Math.min(1, dt * 4);
    P.x += Math.cos(P.yaw) * P.v * dt; P.y += Math.sin(P.yaw) * P.v * dt; P.z = clamp(P.z + P.vz * dt, 0, 800); if (P.z > 10) P.up = true;
    if (P.z > 0) { P.ground = false; return; }
    P.vz = Math.max(0, P.vz); if (P.ground || !P.up) return;   // (standing, or not yet off the pad)
    P.ground = true; P.dist = Math.hypot(P.x - PAD[0], P.y - PAD[1]); A.sfx('land');
    if (P.kills === TURRETS.length && P.dist < 30) { P.landed = P.down = true; say(E.t(P.dist < 10 ? 'sky.bull' : 'sky.landed')); A.sfx('confirm'); }
  }
  // a missile from the helicopter's nose: straight ahead and a little down, its speed added
  function missile(P) { const c = Math.cos(P.yaw), s = Math.sin(P.yaw), h = MS * Math.cos(DIP) + P.v; return { x: P.x + c * 12, y: P.y + s * 12, z: P.z + 5, vx: c * h, vy: s * h, vz: -MS * Math.sin(DIP), t: 0 }; }
  const puff = (P, x, y, z, kind) => P.puffs.push({ x, y, z, kind, t: 0 });   // (kind 0 a flak burst, 1 a hit, 2 a blast)
  const target = P => P.tur.reduce((a, T) => !T.dead && (!a || Math.hypot(T.x - P.x, T.y - P.y) < Math.hypot(a.x - P.x, a.y - P.y)) ? T : a, null);   // (the nearest turret standing)
  /** the helicopter's fight: each turret turns its guns on it and, while it's up and in range, fires a slow flak shot at
   *  it now and then; its missiles fly straight on and destroy a turret they reach (or burst on the ground beside one);
   *  a flak shot that reaches it is a hit */
  function battle(P, dt) {
    const alive = P.hits < 3 && !P.down;
    for (const T of P.tur) {
      if (T.dead) continue;
      const dx = P.x - T.x, dy = P.y - T.y, d = Math.hypot(dx, dy);
      T.yaw = E.approachAng(T.yaw, Math.atan2(dy, dx), dt * 1.6); T.el += (clamp(Math.atan2(P.z - 14, d), .12, 1.1) - T.el) * Math.min(1, dt * 2);
      if (!alive || !P.up || d > 560) { T.cool = Math.max(T.cool, .8); continue; }
      if ((T.cool -= dt) > 0) continue;
      const m = [T.x + Math.cos(T.yaw) * 20, T.y + Math.sin(T.yaw) * 20, 26], v = [P.x - m[0], P.y - m[1], P.z + 8 - m[2]], l = Math.hypot(v[0], v[1], v[2]);
      P.flak.push({ x: m[0], y: m[1], z: m[2], vx: v[0] / l * FLAK, vy: v[1] / l * FLAK, vz: v[2] / l * FLAK, t: 0 }); T.cool = 3; A.sfx('bump');
    }
    for (const f of P.flak) {
      f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      if (alive && Math.hypot(f.x - P.x, f.y - P.y, f.z - P.z - 8) < 12) { f.t = 9; P.hits++; puff(P, f.x, f.y, f.z, 1); A.sfx('hurt'); game.shake(5); say(E.t(P.hits >= 3 ? 'sky.heli.down' : 'sky.heli.hit'), P.hits >= 3 ? 3 : 1.2); }
      else if (f.t > 4.5 || f.z < 0) { f.t = 9; puff(P, f.x, f.y, Math.max(0, f.z), 0); }
    }
    for (const m of P.mis) {
      m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
      const T = P.tur.find(q => !q.dead && m.z < 34 && Math.hypot(m.x - q.x, m.y - q.y) < (m.z <= 0 ? 38 : 24));   // (through its guns, or a burst on the ground beside it)
      if (T) { m.t = 9; T.dead = true; P.kills++; puff(P, T.x, T.y, 16, 2); A.sfx('explode'); game.shake(4); const all = P.kills === TURRETS.length; say(E.t(all ? 'sky.heli.pad' : 'sky.heli.boom'), all ? 3 : 1.4); if (all) A.sfx('powerup'); }
      else if (m.z <= 0) { m.t = 9; puff(P, m.x, m.y, 0, 1); }
      else if (m.t > 3) m.t = 9;
    }
    P.flak = P.flak.filter(f => f.t < 9); P.mis = P.mis.filter(m => m.t < 9);
    for (const q of P.puffs) q.t += dt; P.puffs = P.puffs.filter(q => q.t < .8);
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
    else if (ev === 'belt') { part.push(['rings', P.rings * 10]); const d = P.dist; part.push(['landing', P.down ? (d < 15 ? 40 : d < 40 ? 30 : d < 90 ? 18 : 6) + (P.soft ? 10 : 0) : 0]); }
    else if (ev === 'dive') { part.push(['rings', P.rings * 10]); const o = P.opened || 0; part.push(['chute', o > 600 ? 10 : o > 400 ? 6 : 0]); const d = P.dist; part.push(['landing', (d < 20 ? 50 : d < 40 ? 40 : d < 80 ? 28 : d < 120 ? 16 : 6) + (P.soft ? 10 : 0)]); }
    else if (ev === 'glider') { part.push(['rings', P.rings * 10]); const d = P.dist; part.push(['landing', d < 15 ? 40 : d < 30 ? 32 : d < 60 ? 24 : d < 120 ? 14 : d < 300 ? 6 : 0]); part.push(['soft', P.soft ? 20 : 0]); }
    else if (ev === 'heli') { part.push(['turrets', P.kills * 12]); part.push(['landing', P.landed ? (P.dist < 10 ? 25 : P.dist < 20 ? 20 : 15) : 0]); part.push(['damage', P.landed ? 15 - P.hits * 5 : 0]); }
    else { const s = Math.max(0, Math.round(100 - Math.max(0, t - 90) / 2)); part.push(['time', s]); }
    const total = part.reduce((a, p) => a + p[1], 0), medal = total >= 90 ? 'gold' : total >= 75 ? 'silver' : total >= 55 ? 'bronze' : null;
    return { part, total, medal, best: best('sky:' + ev, total) };
  }
  /** the autopilot (the bot, and a demo): a stick that flies to the next ring or hoop, lands, opens the chute, climbs in
   *  a thermal, destroys the turrets, finds the beacons */
  function auto(P) {
    const steer = (tx, ty, tz, spd) => { const d = Math.hypot(tx - P.x, ty - P.y), want = Math.atan2(tz - P.z, Math.max(70, d)), turn = E.angDiff(P.yaw, Math.atan2(ty - P.y, tx - P.x)); return { x: clamp(turn * 2.4, -1, 1), y: clamp((want - P.pitch) * 3 + want / .55, -1, 1), gas: P.speed < spd - 8, brake: P.speed > spd + 8 }; };
    if (ev === 'plane') {
      if (P.next < COURSE.length) { const [x, y, z] = COURSE[P.next], a = yawOf(COURSE, P.next, [2048, 3900]); return steer(x + Math.cos(a) * 60, y + Math.sin(a) * 60, z, 150); }
      const R = RUNWAY, k = steer(R.x, P.y > 3300 ? 3300 : R.aim - 200, P.y > 3300 ? 40 : 0, 100); if (P.z < 16) k.y = -.16; return k;   // (the flare: a slow, shallow sink)
    }
    if (ev === 'belt') {   // to a point past the next ring at its height; then over the pad, and let it sink
      const r = BELT[P.next], a = r && yawOf(BELT, P.next, BELT0), tx = r ? r[0] + Math.cos(a) * 50 : PAD[0], ty = r ? r[1] + Math.sin(a) * 50 : PAD[1], tz = r ? r[2] : 40, d = Math.hypot(tx - P.x, ty - P.y);
      return { x: clamp(E.angDiff(P.yaw, Math.atan2(ty - P.y, tx - P.x)) * 2.4, -1, 1), y: r ? (d > 40 ? -1 : -.5) : d > 60 ? -.8 : d > 12 ? -.25 : P.v > 4 ? .6 : 0, gas: !r && d < 12 ? false : P.z < tz - 6 || P.vz < -12 && P.z < tz + 20, brake: r ? P.z > tz + 14 : false };
    }
    if (ev === 'dive') {
      if (!P.canopy) { const h = HOOPS[P.next] || TARGET, dx = h[0] - P.x, dy = h[1] - P.y, l = Math.max(1, Math.hypot(dx, dy)) / Math.min(1, Math.hypot(dx, dy) / 30); return { x: dx / l, y: dy / l, act: P.z < 760 }; }
      const d = Math.hypot(TARGET[0] - P.x, TARGET[1] - P.y), to = Math.atan2(TARGET[1] - P.y, TARGET[0] - P.x), high = P.z > d / 1.3 + 30;   // (too high to glide straight in: circle the target)
      return { x: clamp(E.angDiff(P.yaw, to + (high && d < 150 ? 1.3 : 0)) * 2, -1, 1), brake: !high && (P.z > d / 1.7 || P.z < 18), y: 0 };
    }
    if (ev === 'glider') {   // too low for the next ring: circle up in the nearest thermal; else to it, lined up (a point on its axis before it, then past it), on the slope down to it (the air brake where that's steep); then the target, the same, circling down if high, level at the last
      const r = GLIDE[P.next], ap = P.ap, glide = (tz, d) => {   // (the pitch that sinks it at the rate the slope wants, given its sink and lift; the air brake when that's steeper than a shallow dive)
        const vz = (tz - P.z) / Math.max(60, d) * P.speed, brake = vz < -18, p = Math.asin(clamp((vz + (6 + .0012 * (P.speed - 64) ** 2) / Math.cos(P.roll) - P.lift + (brake ? 10 : 0)) / Math.max(30, P.speed), -.9, .9));
        return { y: P.speed < 46 ? -.3 : clamp(p / .45 + (p - P.pitch) * 1.5, -1, 1), brake };
      };
      if (r) {
        const d = Math.hypot(r[0] - P.x, r[1] - P.y), th = THERMALS.reduce((a, b) => Math.hypot(b[0] - P.x, b[1] - P.y) < Math.hypot(a[0] - P.x, a[1] - P.y) ? b : a), need = r[2] + Math.hypot(r[0] - th[0], r[1] - th[1]) / 9 + 40;
        if (P.z - d / 10 < r[2] - 20) ap.climb = true; if (P.z > need) ap.climb = false;
        if (ap.climb) {   // round the thermal's core: after a point on a circle 70 out, a little ahead of it
          const td = Math.hypot(P.x - th[0], P.y - th[1]), a = Math.atan2(P.y - th[1], P.x - th[0]) + .8, want = td > 260 ? Math.atan2(th[1] - P.y, th[0] - P.x) : Math.atan2(th[1] + Math.sin(a) * 70 - P.y, th[0] + Math.cos(a) * 70 - P.x);
          return { x: clamp(E.angDiff(P.yaw, want) * 2.4, -1, 1), y: P.speed < 50 ? -.2 : 0, brake: false };
        }
        const fx = Math.cos(r[3]), fy = Math.sin(r[3]), s = (P.x - r[0]) * fx + (P.y - r[1]) * fy, lead = s < -120 ? Math.max(s * .5, -170) : s < -30 ? 60 : -230, tx = r[0] + fx * lead, ty = r[1] + fy * lead;   // (past it, missed: round to well before it)
        return Object.assign({ x: clamp(E.angDiff(P.yaw, Math.atan2(ty - P.y, tx - P.x)) * 2.4, -1, 1) }, glide(r[2], d));
      }
      const d = Math.hypot(TARGET[0] - P.x, TARGET[1] - P.y), to = Math.atan2(TARGET[1] - P.y, TARGET[0] - P.x), high = P.z > (d - 60) / 2.4 + 30;   // (steeper than the air brake comes down: circle)
      if (P.z < 20) return { x: clamp(E.angDiff(P.yaw, to) * 1.2, -.3, .3), y: .12, brake: true };   // (the flare: wings level, the nose up a touch, slowed)
      return Object.assign({ x: clamp(E.angDiff(P.yaw, to + (high && d < 300 ? 1.4 : 0)) * 2.4, -1, 1) }, glide(0, d));
    }
    if (ev === 'heli') {   // at the nearest turret, 60 up, at speed, firing once a missile would come down onto it (backing off if too close); up out of the way of a flak shot that would hit; then to the pad, slowing over it, and down
      const T = target(P), vx = Math.cos(P.yaw) * P.v, vy = Math.sin(P.yaw) * P.v;
      const F = P.flak.some(f => { const rx = f.x - P.x, ry = f.y - P.y, rz = f.z - P.z - 8, wx = f.vx - vx, wy = f.vy - vy, s = -(rx * wx + ry * wy + rz * f.vz) / (wx * wx + wy * wy + f.vz * f.vz); return s > 0 && s < 1.6 && Math.hypot(rx + wx * s, ry + wy * s, rz + f.vz * s) < 22; });   // (its nearest pass, were it to hold its height)
      if (T) {
        const dx = T.x - P.x, dy = T.y - P.y, d = Math.hypot(dx, dy), turn = E.angDiff(P.yaw, Math.atan2(dy, dx)), m = missile(P), pass = m.z + m.vz * (d - 12) / Math.hypot(m.vx, m.vy);
        return { x: clamp(turn * 3, -1, 1), y: Math.abs(turn) > .5 ? 0 : d < 260 ? .5 : -1, gas: F || P.z < 54, brake: !F && P.z > 66, act: Math.abs(turn) < .035 && pass > 4 && pass < 26 };
      }
      const dx = PAD[0] - P.x, dy = PAD[1] - P.y, d = Math.hypot(dx, dy), along = dx * Math.cos(P.yaw) + dy * Math.sin(P.yaw), turn = E.angDiff(P.yaw, Math.atan2(dy, dx)), v = Math.abs(turn) > .5 && d > 40 ? 0 : clamp(along * 1.1, -40, 170), h = d > 150 ? 50 : 20, down = d < 12 && Math.abs(P.v) < 10;
      return { x: d > 30 ? clamp(turn * 3, -1, 1) : 0, y: clamp(-(2 * v - P.v) / 170, -1, 1), gas: !down && P.z < h - 6, brake: down || P.z > h + 6 };
    }
    const g = goal(P); if (!g) return { x: 0, y: 0 };
    return { x: clamp(E.angDiff(P.yaw, Math.atan2(g.y - P.y, g.x - P.x)) * 2.4, -1, 1), y: g.d < 900 && P.z > 200 ? -1 : P.z < 300 && g.d > 900 ? 1 : 0, gas: g.d > 600, brake: g.d < 320, act: g.d < 250 && P.z < 260 };
  }

  /* ---- each step ---- */
  function update(dt) {
    const I = game.input;
    I.touchSet('gas', null, mode === 'fly' && ev !== 'dive' && ev !== 'glider'); I.touchSet('slow', null, mode === 'fly'); I.touchSet('act', ev === 'heli' ? E.t('sky.touch.fire') : null, mode === 'fly' && (ev === 'dive' || ev === 'voyage' || ev === 'heli'));   // (the glider: SLOW alone, its air brake)
    t += dt; if (bannerT > 0) bannerT -= dt;
    if (mode === 'menu') { menu.update(dt); return; }
    if (mode === 'results') { after.update(dt); return; }
    const k = pilot ? auto(S) : stick(), was = [S.x, S.y, S.z];
    if (ev === 'plane') {
      plane(S, dt, k);
      if (S.next < COURSE.length && through(S, COURSE, S.next, [2048, 3900], 40, was)) { S.rings++; A.sfx('coin'); if (S.next === COURSE.length - 1) say(E.t('sky.final')); }
      if (S.next < COURSE.length) { const [x, y] = COURSE[S.next], a = yawOf(COURSE, S.next, [2048, 3900]); if ((S.x - x) * Math.cos(a) + (S.y - y) * Math.sin(a) > 0) S.next++; }   // (past it, through or not)
      if (S.down && S.speed < 4) finish();
    } else if (ev === 'belt') {
      belt(S, dt, k);
      if (S.next < BELT.length && through(S, BELT, S.next, BELT0, 40, was)) { S.rings++; A.sfx('coin'); if (S.next === BELT.length - 1) say(E.t('sky.belt.pad')); }
      if (S.next < BELT.length) { const [x, y] = BELT[S.next], a = yawOf(BELT, S.next, BELT0); if ((S.x - x) * Math.cos(a) + (S.y - y) * Math.sin(a) > 0) S.next++; }
      if (S.down) { S.after = (S.after || 0) + dt; if (S.after > 1.6) finish(); }
    } else if (ev === 'dive') {
      dive(S, dt, k);
      const h = HOOPS[S.next]; if (h && S.z <= h[2]) { if (Math.hypot(S.x - h[0], S.y - h[1]) < 70) { S.rings++; A.sfx('coin'); } S.next++; }
      if (S.down) { S.after = (S.after || 0) + dt; if (S.after > 1.6) finish(); }
    } else if (ev === 'glider') {   // (its rings in any order, each its own way through; the next the first not yet flown)
      glider(S, dt, k);
      GLIDE.forEach((c, i) => { if (!S.got[i] && through(S, GLIDE, i, GLIDE0, 40, was)) { S.got[i] = true; S.rings++; A.sfx('coin'); if (S.rings === GLIDE.length) say(E.t('sky.glider.target'), 3); } });
      S.next = S.got.indexOf(false); if (S.next < 0) S.next = GLIDE.length;
      if (S.down && S.speed < 4) finish();
    } else if (ev === 'heli') {
      heli(S, dt, k); S.cool -= dt;
      if (k.act && S.cool <= 0 && S.hits < 3 && !S.down && S.z > 3) { S.mis.push(missile(S)); S.cool = .45; S.fired++; A.sfx('whoosh'); }
      battle(S, dt);
      if (S.down) { S.after = (S.after || 0) + dt; if (S.after > 1.6) finish(); }
    } else {
      ship(S, dt, k);
      if (S.home && S.land && S.land.t > 3) finish();
    }
  }
  function finish() { if (mode !== 'fly') return; res = score(); mode = 'results'; after.i = 0; bannerT = 0; if (res.medal) A.sfx('powerup'); }   // (the banner gone: the results box stands where it was)

  /* ---- the look ---- */
  // the pad (the belt's and the helicopter's): a yellow square, a grey one in it, a white mark at its middle
  function pad() { const sq = (r, col) => m7.quad([[PAD[0] - r, PAD[1] - r, 0], [PAD[0] + r, PAD[1] - r, 0], [PAD[0] + r, PAD[1] + r, 0], [PAD[0] - r, PAD[1] + r, 0]], col); sq(30, '#f0c030'); sq(22, '#5a5a62'); sq(6, '#f0f0f0'); }
  // a thermal seen: faint coils spiralling up its column, and sparkles rising round it (up to where its lift fades out)
  function thermal(cx, cy) {
    for (let j = 0; j < 5; j++) {
      const z0 = (t * 30 + j * 240) % 1200 + 10, a0 = t * .8 + j * 1.7, R = TH_R * (.55 + .15 * Math.sin(z0 / 160 + j));
      m7.add(cx, cy, z0 + 32, g => { const a = g.globalAlpha; g.globalAlpha = a * .6 * Math.min(1, (1210 - z0) / 200, z0 / 60); let p0 = null;   // (faded in at the ground, out at the top)
        for (let i = 0; i <= 24; i++) { const b = a0 + i / 24 * TAU, p = m7.project(cx + Math.cos(b) * R, cy + Math.sin(b) * R, z0 + i * 2.7); if (p && p0) px.line(g, p0[0], p0[1], p[0], p[1], '#ffe9a0', p[2] > .4 ? 2 : 1); p0 = p; }
        g.globalAlpha = a; });
    }
    for (let i = 0; i < 30; i++) {
      const b = i * 2.4 + t * .6, r = TH_R * (.12 + (i * .37 % 1) * .7), z = (t * 40 + i * 41) % 1200 + 15;
      m7.add(cx + Math.cos(b) * r, cy + Math.sin(b) * r, z, (g, sx, sy, k) => { const s = clamp(Math.round(2.5 * k), 1, 3); px.rect(g, sx - s / 2, sy - s / 2, s, s, i % 3 ? '#fff4c8' : '#ffc860'); });   // (a speck however near)
    }
  }
  function shadow(V, x, y, z, s) { V.add(x, y, 0, (g, sx, sy, k) => { const a = g.globalAlpha; g.globalAlpha = a * clamp(.5 - z / 1600, .1, .5); px.ell(g, sx, sy, s * k, s * k * .36, '#0c1a10'); g.globalAlpha = a; }); }
  function camFor() {
    const tall = game.H > game.W, wide = tall ? 1.45 : 1, fov = tall ? 84 : 64;   // (a phone held upright: further back, wider)
    if (mode === 'menu' || !S) { const a = t * .08; return { x: M + Math.cos(a) * 1900, y: M + Math.sin(a) * 1900, h: 620, angle: a + Math.PI + .25, pitch: 20, fov: 66, roll: Math.sin(t * .3) * 5 }; }
    if (ev === 'heli') { const P = S, back = 92 * wide; return { x: P.x - Math.cos(P.yaw) * back, y: P.y - Math.sin(P.yaw) * back, h: P.z + 40 * wide, angle: P.yaw, pitch: 17, fov, roll: P.roll * 15 }; }
    if (ev === 'plane' || ev === 'glider') { const P = S, gl = ev === 'glider', back = (gl ? 76 : 84) * wide; return { x: P.x - Math.cos(P.yaw) * back * Math.cos(P.pitch), y: P.y - Math.sin(P.yaw) * back * Math.cos(P.pitch), h: Math.max(8, P.z + (gl ? 36 : 24) * wide - Math.sin(P.pitch) * back * .6), angle: P.yaw, pitch: (gl ? 17 : 10) - P.pitch * 40, fov, roll: P.roll * 40 }; }   // (behind and above, rolled with its bank; the glider's higher, to see its sail)
    if (ev === 'belt') { const P = S; return { x: P.x - Math.cos(P.yaw) * 80 * wide, y: P.y - Math.sin(P.yaw) * 80 * wide, h: P.z + 34 * wide, angle: P.yaw, pitch: 14, fov, roll: P.roll * 20 }; }
    if (ev === 'dive') { const P = S; return P.canopy ? { x: P.x - Math.cos(P.yaw) * 90 * wide, y: P.y - Math.sin(P.yaw) * 90 * wide, h: P.z + 58 * wide, angle: P.yaw, pitch: 26, fov: fov + 2 } : { x: P.x, y: P.y + 70, h: P.z + 150 * wide, angle: -Math.PI / 2, pitch: 64, fov: fov + 6 }; }
    const P = S, a = P.yaw + .38; return { x: P.x - Math.cos(a) * 150 * wide, y: P.y - Math.sin(a) * 150 * wide, h: P.z + 50 * wide + P.z * .15, angle: P.yaw + .22, pitch: 15 + P.z / 60, fov };
  }
  function draw(r) {
    const W = r.W, H = r.H; views();
    const cam = camFor(), V = ev === 'voyage' ? w7 : m7, fx = Math.cos(cam.angle), fy = Math.sin(cam.angle), cp = Math.cos(cam.pitch * Math.PI / 180), sp = Math.sin(cam.pitch * Math.PI / 180);
    if (V === m7) {   // the trees in view: by their depth from the camera (the free fall's view reaches behind straight down)
      for (const [x, y, kind, s] of TREES) { const d = (x - cam.x) * fx + (y - cam.y) * fy; if (d * cp + cam.h * sp > 20 && d < 2600) m7.shape(kind, x, y, 0, { size: s }); }
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
      else smoke(P.x, P.y);
      shadow(m7, P.x, P.y, P.z, 14);
    } else if (S && ev === 'belt') {   // the rings, the pad (a yellow square, a grey one in it), the flyer and its flame
      const P = S;
      BELT.forEach((c, i) => { if (i >= P.next) m7.mesh(RING, c[0], c[1], c[2], { yaw: yawOf(BELT, i, BELT0), colors: { ring: i === P.next ? (t * 4 % 2 < 1 ? '#ffd040' : '#ffe890') : '#e8eef8' } }); });
      pad();
      const rig = diver(P.yaw); m7.add(P.x, P.y, P.z, (g, sx, sy, k) => { if (P.thrust && !P.down) for (let i = 0; i < 3; i++) px.disc(g, sx + (i - 1) * 3 * k, sy + (4 + (t * 40 + i * 5) % 8) * k, Math.max(1, (3 - i * .5) * k), i === 1 ? '#fff0a0' : '#ff8a30'); rig.draw(g, Math.round(sx), Math.round(sy), m7.view(k)); });
      shadow(m7, P.x, P.y, P.z, 10);
    } else if (S && ev === 'dive') {
      const P = S;
      HOOPS.forEach((h, i) => { if (i >= P.next) m7.mesh(HOOP, h[0], h[1], h[2], { pitch: Math.PI / 2, colors: { ring: i === P.next ? '#ffd040' : '#e8eef8' } }); });
      const rig = diver(P.canopy ? P.yaw : -Math.PI / 2), up = P.canopy && P.chute > .2;
      m7.add(P.x, P.y, P.z, (g, sx, sy, k) => { rig.draw(g, Math.round(sx), Math.round(sy + (up ? 0 : 18 * k)), up ? m7.view(k) : flatView(k));
        if (up) for (const sd of [-1, 1]) { const e = CHUTE.at(0, 15 * sd, 31, { x: P.x, y: P.y, z: P.z + 6, yaw: P.yaw, scale: P.chute }), q = m7.project(e[0], e[1], e[2]); if (q) px.line(g, sx + sd * 3 * k, sy - 26 * k, q[0], q[1], '#e8e8e8', 1); } });
      if (up) m7.mesh(CHUTE, P.x, P.y, P.z + 6, { yaw: P.yaw, scale: P.chute });
      shadow(m7, P.x, P.y, P.z, 10);
    } else if (S && ev === 'glider') {   // the thermals, the rings not yet flown (the next one flashing), the glider
      const P = S, o = { yaw: P.yaw, pitch: P.pitch, roll: P.roll };
      for (const [x, y] of THERMALS) thermal(x, y);
      GLIDE.forEach((c, i) => { if (!P.got[i]) m7.mesh(RING, c[0], c[1], c[2], { yaw: c[3], colors: { ring: i === P.next ? (t * 4 % 2 < 1 ? '#ffd040' : '#ffe890') : '#e8eef8' } }); });
      m7.mesh(GLIDER, P.x, P.y, P.z, Object.assign({ colors: { sail: '#e8402a' } }, o));
      shadow(m7, P.x, P.y, P.z, 16);
    } else if (S && ev === 'heli') {   // the pad, the turrets (or their wrecks), the missiles, the flak, the bursts, the helicopter and its rotors
      const P = S, o = { yaw: P.yaw, pitch: P.lean, roll: P.roll };
      pad();
      for (const T of P.tur) {
        m7.mesh(TBASE, T.x, T.y, 0, { colors: { base: T.dead ? '#3a3834' : '#9a9888' } });
        if (T.dead) { smoke(T.x, T.y); continue; }
        m7.mesh(TGUN, T.x, T.y, 16, { yaw: T.yaw }); const b = TGUN.at(1, 0, 8, { x: T.x, y: T.y, z: 16, yaw: T.yaw }); m7.mesh(TBARREL, b[0], b[1], b[2], { yaw: T.yaw, pitch: T.el });
      }
      for (const m of P.mis) m7.mesh(MISSILE, m.x, m.y, m.z, { yaw: Math.atan2(m.vy, m.vx), pitch: -DIP });
      for (const f of P.flak) m7.add(f.x, f.y, f.z, (g, sx, sy, k) => { const s = clamp(4 * k, 2, 7); px.disc(g, sx, sy, s, '#3a2418'); px.disc(g, sx, sy, s * .6, t * 12 % 2 < 1 ? '#ffd060' : '#ff7a30'); });   // (no bigger than a coin, even passing the camera)
      for (const q of P.puffs) m7.add(q.x, q.y, q.z, (g, sx, sy, k) => { const s = Math.max(1, (q.kind === 2 ? 16 : 8) * (.5 + q.t * 1.6) * k), a = g.globalAlpha; g.globalAlpha = a * (1 - q.t / .8); px.disc(g, sx, sy, s, q.kind ? '#ff9a30' : '#4a4a50'); px.disc(g, sx, sy, s * .55, q.kind ? '#fff0a0' : '#6a6a72'); g.globalAlpha = a; });
      if (P.down && !P.landed) smoke(P.x, P.y);
      else {
        m7.mesh(HELI, P.x, P.y, P.z, Object.assign({ colors: { body: '#3a6ad8', trim: '#f0c030' } }, o));
        const r = HELI.at(0, 0, 18.4, Object.assign({ x: P.x, y: P.y, z: P.z }, o)), q = HELI.at(-25, 1.6, 16, Object.assign({ x: P.x, y: P.y, z: P.z }, o));
        m7.mesh(ROTOR, r[0], r[1], r[2], { yaw: P.yaw + P.rotor, pitch: P.lean, roll: P.roll }); m7.mesh(TROTOR, q[0], q[1], q[2], { yaw: P.yaw, pitch: P.rotor * 2.3 });
      }
      shadow(m7, P.x, P.y, P.z, 16);
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
  function diver(f = -Math.PI / 2) { if (!rigD) rigD = new E.Humanoid({ size: .9, weapon: null, hair: 'short', colors: { cloth: '#e8402a', pants: '#2a3a6a', hair: '#3a2010' }, helmet: true }); rigD.update(1 / 120, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: f, pose: 'cheer' }); return rigD; }   // (f: its heading, so the camera behind sees its back)
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
      if (ev === 'belt') { txt(E.t('sky.hud.rings', { n: P.rings, of: BELT.length }), 6, 6 + lh); txt(E.t('sky.hud.fuel'), 6, 8 + lh * 2, P.fuel < 20 ? '#ff8060' : '#ffffff'); const w = 50, x = 8 + E.font.width(E.t('sky.hud.fuel')), y = 9 + lh * 2; px.rect(g, x - 1, y - 1, w + 2, 6, '#0a1020'); px.rect(g, x, y, Math.round(w * P.fuel / 100), 4, P.fuel < 20 ? '#ff6040' : '#60d0ff'); }
      if (ev === 'voyage') txt(E.t('sky.hud.beacons', { n: P.lit.filter(Boolean).length }), 6, 6 + lh);
      if (ev === 'glider') { txt(E.t('sky.hud.rings', { n: P.rings, of: GLIDE.length }), 6, 6 + lh); const v = P.vz / 4; if (!P.down) txt(E.t(v >= 0 ? 'sky.hud.climb' : 'sky.hud.sink', { v: Math.abs(v).toFixed(1) }), 6, 6 + lh * 2, v >= 0 ? '#90ff90' : '#ffffff'); }   // (the variometer, in metres a second)
      if (ev === 'heli') {   // the turrets left; the damage, three boxes that go red
        txt(E.t('sky.hud.turrets', { n: TURRETS.length - P.kills }), 6, 6 + lh); txt(E.t('sky.hud.damage'), 6, 8 + lh * 2, P.hits ? '#ff8060' : '#ffffff');
        for (let i = 0, x = 9 + E.font.width(E.t('sky.hud.damage')), y = 9 + lh * 2; i < 3; i++) { px.rect(g, x + i * 10 - 1, y - 1, 9, 7, '#0a1020'); px.rect(g, x + i * 10, y, 7, 5, i < P.hits ? '#ff4030' : '#3a5068'); }
      }
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
      const T = ev === 'heli' && target(S), c = ev === 'plane' ? COURSE[S.next] : ev === 'belt' ? BELT[S.next] || [PAD[0], PAD[1], 0] : ev === 'glider' ? GLIDE[S.next] || [TARGET[0], TARGET[1], 0] : ev === 'heli' ? T ? [T.x, T.y, 16] : [PAD[0], PAD[1], 0] : null;
      if (c && !S.down) {   // the next ring (the belt's pad, the glider's target, the nearest turret, the helicopter's pad) off the screen: an arrow at the edge
        const p = m7.project(c[0], c[1], c[2]);
        if (!p || p[0] < 8 || p[0] > W - 8 || p[1] < 8 || p[1] > H - 8) { const a = p ? Math.atan2(p[1] - H / 2, p[0] - W / 2) : Math.atan2(c[1] - S.y, c[0] - S.x) - S.yaw - Math.PI / 2, ex = W / 2 + Math.cos(a) * (W / 2 - 18), ey = H / 2 + Math.sin(a) * (H / 2 - 18);
          px.poly(g, [[ex + Math.cos(a) * 8, ey + Math.sin(a) * 8], [ex + Math.cos(a + 2.4) * 6, ey + Math.sin(a + 2.4) * 6], [ex + Math.cos(a - 2.4) * 6, ey + Math.sin(a - 2.4) * 6]], '#ffd040'); }
      }
      if ((ev === 'plane' && S.next >= COURSE.length || ev === 'glider' && S.next >= GLIDE.length) && !S.down) txt(E.t('sky.hud.flare'), W / 2, H * .72, S.z < 30 ? '#ffe890' : '#ffffff', { align: 'center' });
      if (ev === 'glider' && !P.down) {   // a stall, flashing; the next ring above it and no lift: a thermal's the way up
        if (P.stall) { if (t * 4 % 2 < 1) txt(E.t('sky.hud.stall'), W / 2, Math.round(H * .62), '#ff6040', { align: 'center', scale: 2 }); }
        else if (GLIDE[P.next] && GLIDE[P.next][2] > P.z + 20 && P.lift < 6) txt(E.t('sky.hud.thermal'), W / 2, H * .72, '#ffe890', { align: 'center' });
      }
      if (ev === 'heli' && !P.down && P.hits < 3) {   // a red mark over each turret standing; on the pad, how to lift off; up, where a missile would meet the ground (a red cross)
        for (const T of P.tur) { const q = !T.dead && m7.project(T.x, T.y, 52); if (q && q[1] > 4) { const x = Math.round(q[0]), y = Math.round(q[1]); px.poly(g, [[x - 4, y - 5], [x + 4, y - 5], [x, y]], '#0a1020'); px.poly(g, [[x - 3, y - 4], [x + 3, y - 4], [x, y - 1]], '#ff4030'); } }
        if (!P.up) txt(E.t('sky.hud.lift', { key: game.input.label('gas') }), W / 2, H * .72, '#ffe890', { align: 'center' });
        else if (P.z > 3) { const m = missile(P), tt = m.z / -m.vz, q = m7.project(m.x + m.vx * tt, m.y + m.vy * tt, 0); if (q) { const x = Math.round(q[0]), y = Math.round(q[1]); for (const [a, b, w, h] of [[-7, 0, 4, 1], [4, 0, 4, 1], [0, -6, 1, 4], [0, 3, 1, 4]]) px.rect(g, x + a, y + b, w, h, '#ff5040'); } }
      }
      if (bannerT > 0 && banner) txt(banner, W / 2, Math.round(H * .3), '#ffffff', { align: 'center', scale: E.font.width(banner, { scale: 2 }) <= W - 8 ? 2 : 1 });   // (half the size where it would run off a narrow screen)
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
   *  runway, the diver through the hoops onto the target, the belt through its rings onto the pad, the glider up a
   *  thermal, through its rings and onto the target, the helicopter's five turrets and back onto the pad, the airship to
   *  the three beacons and home (first, a player who joined on the keyboard's right half: let go as SKY starts) */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s);
    try {
      game.addPlayer({ keys: 'right' }); game.go('sky', null, { fade: 0 }); game.advance(1 / 120); const out = { solo: game.players.length };   // (a player who joined another game: let go here)
      for (const e of EVENTS) {
        start(e); pilot = true; let n = 0; for (; n < 400 && mode === 'fly'; n++) game.advance(1);
        out[e] = e === 'plane' ? { rings: S.rings, landed: S.landed, score: res && res.total, seconds: n } : e === 'belt' ? { rings: S.rings, dist: Math.round(S.dist), soft: S.soft, fuel: Math.round(S.fuel), score: res && res.total, seconds: n } : e === 'dive' || e === 'glider' ? { rings: S.rings, dist: Math.round(S.dist), soft: S.soft, score: res && res.total, seconds: n }
          : e === 'heli' ? { turrets: S.kills, hits: S.hits, fired: S.fired, landed: S.landed, dist: S.landed ? Math.round(S.dist) : null, score: res && res.total, seconds: n } : { lit: S.lit.filter(Boolean).length, home: S.home, seconds: n };
        toMenu();
      }
      return Object.assign(out, { errors: game.errors.length });
    } finally { Math.random = was; pilot = null; }
  }

  return { view: 'topdown', views: ['topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['gas', 'slow', 'act'], camera: { zoom: false },
    enter(d) {
      game.allowJoin(false); while (game.players.length > 1) game.removePlayer(game.players.length);   // (flown alone: those who joined another game let go, the whole keyboard player 1's again)
      mode = 'menu'; S = null; ev = null; menu.i = 0; game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false; A.music('title'); if (d && d.part) start(EVENTS.includes(d.part) ? d.part : 'plane'); },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'results') { toMenu(); return true; } return false; },
    update, draw, bot,
    /** an event flown by the autopilot (a demo; the bot's) */
    demo(e) { start(e); pilot = true; },
    state: () => S && { mode, ev, t: +t.toFixed(2), x: Math.round(S.x), y: Math.round(S.y), z: Math.round(S.z), yaw: +S.yaw.toFixed(3), roll: S.roll !== undefined ? +S.roll.toFixed(3) : 0, speed: S.speed !== undefined ? Math.round(S.speed) : 0, thr: S.thr !== undefined ? +S.thr.toFixed(2) : 0, rings: S.rings, down: S.down, fuel: S.fuel !== undefined ? Math.round(S.fuel) : null, chute: S.opened ? Math.round(S.opened) : null, pitch: S.pitch !== undefined ? +S.pitch.toFixed(3) : 0, turrets: S.kills, hits: S.hits, fired: S.fired, score: res && res.total },   // (chute: the height the dive's opened at; turrets: the helicopter's destroyed)
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
