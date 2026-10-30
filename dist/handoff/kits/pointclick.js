// The POINT-AND-CLICK kit's game (an adventure of three rooms: a dock, a tavern, a lighthouse; four puzzles, the nine verbs or a verb coin, an inventory, a riddle contest), readable: the starter's shell (src/starter/00-shell.js), then
// the slice from line 159 (src/starter/15-pointclick.js: its header says what it plays and how), then the start (90-start.js), as the
// single-file kit holds them between GAME START and GAME END. pointclick.html plays it; node kits/test.mjs pointclick runs it headless.
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
 * SLICE 18  POINT-AND-CLICK  (Monkey Island, Day of the Tentacle, Broken Sword). @modules click story
 * THE LIGHT ON GULL ROCK: dusk on a fishing harbour, and the lighthouse out on Gull Rock has gone dark with the fleet out
 * in the fog. PIP, a deckhand, relights it. Three painted rooms (the dock, the Salty Gull tavern, the lighthouse's lamp
 * room), eight hotspots or fewer in each, and a chain of four puzzles: a ROPE and a HOOK make a GRAPPLE that fishes
 * Finn's OAR out of the water (items combined); Morwen's riddle contest wins the KEY to the rowboat's chain (a
 * conversation to win); a BOTTLE on the whale-oil barrel gives OIL; the OIL and then the MATCHES on the great lamp end
 * it. The people talk through E.Story (choices, flags), with live close-ups. The interface is a setting (Point and
 * click, Interface): SCUMM's nine verbs, Sierra's icons, a verb coin or two buttons. An opening, an ending and THE END.
 * The mouse: a click walks, or does the verb on what it points at; an item, then a hotspot (or another item), uses it;
 * a right click looks; a double click runs. TOUCH: a tap walks; a tap on a hotspot shows its verbs; the inventory by
 * taps; a long press looks. HOW IT WORKS: E.Click (the click module) keeps the rooms, the walk areas (E.Walkbox: the
 * lamp, the table, Finn and the hatch are holes), the depth scale, the hotspots, the inventory and the rules (data);
 * the rooms are painted once by code. bot() clicks through the whole chain with input.feed, a wrong riddle first
 * (tools/kits-test.mjs). Deep link: #pointclick.
 * ===================================================================================== */
const POINTCLICK = (() => {
  const px = E.px, hash = E.hash2, TAU = Math.PI * 2;
  // a shanty in D minor (three steps a beat: 6/8), and the ending's hymn in D major
  const SONG = { bpm: 92, steps: 3, tracks: [
    { wave: 'pulse25', vol: .1, notes: 'D5 - A4 | D5 E5 F5 | E5 - C5 | A4 - - | D5 - A4 | F5 E5 D5 | C5 - E5 | D5 - - | F5 - G5 | A5 - F5 | G5 F5 E5 | C5 - - | D5 - F5 | E5 C5 A4 | D5 C5 E5 | D5 - -' },
    { wave: 'triangle', vol: .28, notes: 'D3 A3 A3 | D3 A3 A3 | C3 G3 G3 | A2 E3 E3 | D3 A3 A3 | Bb2 F3 F3 | C3 G3 G3 | D3 A3 A3 | F3 C4 C4 | F3 C4 C4 | C3 G3 G3 | A2 E3 E3 | Bb2 F3 F3 | A2 E3 E3 | A2 E3 C#3 | D3 A3 D3' },
    { wave: 'drums', vol: .05, notes: 'k . h | s . h' }] };
  const HYMN = { bpm: 76, steps: 3, tracks: [
    { wave: 'pulse25', vol: .1, notes: 'D5 - F#5 | A5 - - | G5 F#5 E5 | F#5 - - | D5 - E5 | F#5 - A5 | B5 A5 F#5 | A5 - - | D6 - - | . . .' },
    { wave: 'triangle', vol: .28, notes: 'D3 A3 F#3 | D3 A3 F#3 | A2 E3 C#3 | D3 A3 F#3 | G2 D3 B2 | D3 A3 F#3 | G2 D3 B2 | A2 E3 C#3 | D3 A3 D4 | . . .' }] };

  /* ---- 1. PAINTING: smooth bands (a PS1 sky or wall), planks, cobbles, ellipses; each room painted
   * once into its own canvas (E.Click keeps it), with margins a bigger screen shows: 120 pixels past each side, 160
   * above (the night sky, a roof, the rafters) and below (the quay, the sea, the floor) ---- */
  const at = (stops, t) => { let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++; const [t0, a] = stops[i], [t1, b] = stops[i + 1]; return E.mix(a, b, E.clamp((t - t0) / (t1 - t0 || 1), 0, 1)); };
  function grad(g, x, y, w, h, stops, n = 32) {   // (a smooth sky or wall: a row at a time, n bands or more, a band 3 rows at most)
    n = Math.max(n, Math.ceil(h / 3));
    for (let j = 0; j < h; j++) px.rect(g, x, y + j, w, 1, at(stops, Math.round(j / Math.max(1, h - 1) * (n - 1)) / (n - 1)));
  }
  const ell = (cx, cy, rx, ry, n = 18) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * TAU) * rx, cy + Math.sin(i / n * TAU) * ry]);
  // boards: rows (each rowH tall, or rowH(i)), each board its own shade, the seams and grain dark; vertical: up and down
  function planks(g, x, y, w, h, c, rowH, seed = 1, vertical = false) {
    const T = E.tones(c);
    for (let r = 0, o = 0; o < (vertical ? w : h); r++) {
      const rh = typeof rowH === 'function' ? rowH(r) : rowH, len = vertical ? h : w;
      for (let s = 0, k = 0; s < len; k++) {
        const L = 22 + Math.floor(hash(r + seed * 31, k) * 40), u = hash(k + seed, r * 7), col = u < .3 ? T.sh : u > .8 ? T.lt : c;
        if (vertical) { px.rect(g, x + o, y + s, rh - 1, Math.min(L, len - s), col); px.rect(g, x + o + rh - 1, y + s, 1, Math.min(L, len - s), T.deep); px.rect(g, x + o, y + s + L - 1, rh - 1, 1, T.deep); }
        else { px.rect(g, x + s, y + o, Math.min(L, len - s), rh - 1, col); px.rect(g, x + s, y + o + rh - 1, Math.min(L, len - s), 1, T.deep); px.rect(g, x + s + L - 1, y + o, 1, rh - 1, T.deep); }
        for (let q = 0; q < L / 9; q++) { const a = s + hash(q, r + k * 13 + seed) * L, b = o + 1 + hash(q + 5, r + k) * (rh - 3); if (a < len) px.rect(g, vertical ? x + b : x + a, vertical ? y + a : y + b, vertical ? 1 : 3, vertical ? 3 : 1, T.sh); }
        s += L;
      }
      o += rh;
    }
  }
  // cobbles: rows of rounded stones, each its own shade, dark mortar between, lit from above
  function cobbles(g, x, y, w, h, c) {
    const T = E.tones(c); px.rect(g, x, y, w, h, T.deep);
    for (let r = 0, o = 0; o < h; r++) {
      const rh = Math.min(9, 4 + Math.floor(r * .6));   // (rows deepen toward us, then keep their size)
      for (let s = (r % 2) * -5; s < w; ) { const L = 7 + Math.floor(hash(r, s) * 6) + Math.min(6, r >> 2), u = hash(s, r + 9), col = u < .35 ? T.sh : u > .85 ? T.lt : c, sw = Math.min(L, w - s); if (sw > 2) { px.rect(g, x + Math.max(0, s) + 1, y + o + 1, sw - 2 + Math.min(0, s), rh - 1, col); px.rect(g, x + Math.max(0, s) + 2, y + o + 1, Math.max(0, sw - 4 + Math.min(0, s)), 1, T.lt); } s += L; }   // (cut at its edges)
      o += rh;
    }
  }
  const glow = (g, x, y, r, c, a = .5) => { for (let k = 1; k <= 4; k++) px.ddisc(g, x, y, r * k / 4, c, a / 4); };

  // the DOCK: dusk over the bay, the sun on the sea, Gull Rock dark on the horizon, the tavern's front on the quay, the pier
  function paintDock(g) {
    const X0 = -120, WD = 720;
    grad(g, X0, -160, WD, 160, [[0, '#06050e'], [1, '#191632']], 8);
    for (let i = 0; i < 120; i++) px.dot(g, X0 + Math.floor(hash(i, 4) * WD), -160 + Math.floor(hash(i, 5) * 160), hash(i, 6) < .3 ? '#ffffff' : '#8a80b8');
    grad(g, X0, 0, WD, 78, [[0, '#191632'], [.35, '#3e2652'], [.62, '#8a3a62'], [.86, '#d8606a'], [1, '#f39a62']], 12);
    for (let i = 0; i < 46; i++) px.dot(g, X0 + Math.floor(hash(i, 1) * WD), Math.floor(hash(i, 2) * 28), hash(i, 3) < .3 ? '#e8e0ff' : '#7a70a8');
    for (const [cx, cy, w] of [[40, 30, 120], [250, 22, 160], [470, 42, 110], [150, 52, 90], [-60, 44, 100], [560, 26, 90]]) { px.polyDither(g, ell(cx, cy, w / 2, 3), '#b8587a', .7); px.polyDither(g, ell(cx + 6, cy + 2, w / 2 - 10, 1.6), '#f0a080', .8); px.polyDither(g, ell(cx - 4, cy - 2, w / 2 - 16, 1.3), '#5a2c58', .6); }
    glow(g, 330, 78, 34, '#ffb070', .5); px.disc(g, 330, 78, 10, '#fff0c0');
    // Gull Rock: the rock and the tower, its lamp dark
    px.poly(g, [[358, 78], [368, 70], [382, 68], [392, 63], [404, 65], [418, 71], [432, 78]], '#2a1e34');
    px.poly(g, [[392, 65], [404, 65], [402, 40], [394, 40]], '#e0d4cc'); px.poly(g, [[399, 65], [404, 65], [402, 40], [399, 40]], '#a89ca8');
    for (const yy of [57, 48]) px.rect(g, 393, yy, 11, 3, '#a83a3a');
    px.rect(g, 391, 38, 14, 2, '#3a3040'); px.rect(g, 394, 32, 8, 6, '#24243a'); px.poly(g, [[393, 32], [403, 32], [398, 27]], '#5a2a2a');
    // the sea: the sky's colours, darker toward us; the sun's path; ripples
    grad(g, X0, 78, WD, 90, [[0, '#d0646a'], [.12, '#7a3a62'], [.5, '#3a2a54'], [1, '#141834']], 10); grad(g, X0, 168, WD, 160, [[0, '#141834'], [1, '#07081a']], 6);
    for (let y = 79; y < 150; y += 2) for (let i = 0; i < 3; i++) { const sp = 5 + (y - 79) * .55, x = 330 + (hash(y, i * 7) - .5) * sp * 2; if (hash(y, i + 11) < 1 - (y - 79) / 80) px.rect(g, x, y, 2 + hash(y, i + 3) * 7, 1, y < 100 ? '#ffe0a0' : '#e09070'); }
    for (let i = 0; i < 460; i++) { const x = X0 + hash(i, 21) * WD, y = 81 + Math.pow(hash(i, 22), .8) * 240, w = 2 + Math.min(14, (y - 78) / 12) * hash(i, 23); px.rect(g, x, y, w, 1, y < 112 ? '#a85878' : y < 200 ? '#3c3866' : '#262650'); }
    // the far pilings behind the pier, and the pier's posts with a sagging rope rail
    for (const x of [200, 270, 340]) { px.rect(g, x, 104, 3, 12, '#2a2030'); }
    // the quay: cobbles to the water, its stone edge
    cobbles(g, X0, 108, 294, 220, '#6c6474'); px.rect(g, 170, 108, 4, 220, '#3e3846'); px.rect(g, 170, 108, 4, 1, '#8a8294');
    // the pier: boards across it, its front face, pilings into the water with rings
    planks(g, 174, 116, 248, 34, '#8a6a48', 6, 3, true); px.rect(g, 174, 116, 248, 1, '#b08a60');
    px.rect(g, 174, 150, 248, 5, '#4a3424'); px.rect(g, 174, 150, 248, 1, '#6a4c34');
    for (let x = 178; x < 420; x += 40) { px.rect(g, x, 155, 5, 13, '#3a2a20'); px.rect(g, x, 155, 1, 13, '#5a4430'); px.rect(g, x - 3, 166, 11, 1, '#6a6090'); }
    for (const x of [182, 262, 342, 414]) { px.rect(g, x, 92, 6, 24, '#4a3424'); px.rect(g, x, 92, 2, 24, '#6a4c34'); px.rect(g, x - 1, 91, 8, 2, '#5a4030'); }
    for (const [a, b] of [[188, 262], [268, 342], [348, 414]]) for (let x = a; x < b; x++) { const u = (x - a) / (b - a); px.dot(g, x, Math.round(96 + Math.sin(u * Math.PI) * 5), '#c8a070'); }
    // the rowboat at the pier's end, its seat and the far oarlock
    px.poly(g, [[424, 134], [478, 134], [470, 150], [432, 150]], '#7a4a2a'); px.poly(g, [[428, 134], [474, 134], [470, 140], [432, 140]], '#4a2a18');
    px.rect(g, 446, 134, 10, 2, '#9a6a3a'); px.rect(g, 424, 133, 54, 1, '#a87040'); px.rect(g, 432, 150, 38, 1, '#2a1a10');
    for (let x = 426; x < 476; x += 3) px.dot(g, x, 152, '#8a7ab0');
    // the tavern's front: its plank wall on a stone footing, the timber frame, the roof and its eaves
    planks(g, X0, 14, 268, 88, '#6a4430', 7, 5, true);
    px.rect(g, X0, 100, 268, 8, '#5a5262'); for (let x = X0; x < 148; x += 9) px.rect(g, x, 100, 1, 8, '#3e3846');
    // (its gable roof rises into the margin above, a chimney smoking)
    px.rect(g, 18, -112, 16, 52, '#6a3a30'); for (let y = -110; y < -60; y += 5) px.rect(g, 18, y, 16, 1, '#4a2620'); px.rect(g, 16, -116, 20, 5, '#4a2a24');
    for (let i = 0; i < 6; i++) px.polyDither(g, ell(26 + i * 7 + Math.sin(i) * 4, -124 - i * 9, 6 + i * 2, 4 + i), '#6a6080', .45 - i * .06);
    px.poly(g, [[X0 - 4, -84], [48, -84], [156, 16], [X0 - 4, 16]], '#4a2e3e'); for (let y = -80; y < 16; y += 4) px.line(g, X0, y, Math.min(152, 52 + (y + 84) * 1.08), y, '#3a2232');
    px.line(g, X0 - 4, -84, 48, -84, '#6a4458'); px.line(g, 48, -84, 156, 16, '#6a4458');
    px.rect(g, -50, -50, 22, 18, '#2a1a24'); px.rect(g, -48, -48, 18, 14, '#ffd070'); px.rect(g, -40, -48, 2, 14, '#2a1a24'); px.poly(g, [[-54, -50], [-24, -50], [-39, -62]], '#3a2232');
    px.rect(g, X0 - 4, 16, 164, 5, '#2a1a24'); px.rect(g, X0 - 4, 21, 164, 1, '#1a1018');
    for (const x of [-60, 0, 50, 92, 144]) { px.rect(g, x, 22, 4, 78, '#3a2418'); px.rect(g, x, 22, 1, 78, '#5a3a28'); }
    px.rect(g, X0, 58, 268, 3, '#3a2418');
    // its windows, lit, and the light they throw on the quay
    for (const x of [8, 100, -96, -44]) { px.rect(g, x - 2, 64, 34, 28, '#3a2418'); grad(g, x, 66, 30, 24, [[0, '#ffe8a0'], [1, '#e89040']], 5); px.rect(g, x + 14, 66, 2, 24, '#3a2418'); px.rect(g, x, 77, 30, 2, '#3a2418'); px.polyDither(g, [[x - 4, 108], [x + 34, 108], [x + 44, 126], [x - 14, 126]], '#ffc070', .22); }
    // the door (ajar: a warm crack), the lantern by it, the sign
    px.rect(g, 56, 60, 32, 48, '#2a1a12'); planks(g, 58, 62, 27, 46, '#4a2c1c', 7, 9, true); px.rect(g, 84, 62, 2, 46, '#ffc060'); px.rect(g, 60, 66, 22, 10, '#ffd080'); px.rect(g, 70, 66, 2, 10, '#4a2c1c'); px.dot(g, 80, 86, '#e8c060');
    px.rect(g, 93, 44, 1, 8, '#2a1a12'); px.rect(g, 90, 52, 7, 9, '#2a2a30'); px.rect(g, 91, 53, 5, 7, '#ffd070'); glow(g, 93, 56, 18, '#ffc060', .5);
    px.rect(g, 104, 34, 46, 2, '#2a1a12'); px.rect(g, 108, 36, 1, 4, '#2a1a12'); px.rect(g, 144, 36, 1, 4, '#2a1a12');
    E.ui.box(g, 104, 40, 46, 16, { bg: '#3a2418', border: '#c8a060', gradient: false });
    E.font.text(g, 'SALTY', 127, 42, '#ffd880', { align: 'center', outline: false, font: 'tiny' }); E.font.text(g, 'GULL', 127, 49, '#ffd880', { align: 'center', outline: false, font: 'tiny' });
    // a bollard on the quay, crates by the wall
    px.rect(g, 150, 128, 8, 12, '#2a2a34'); px.rect(g, 149, 127, 10, 3, '#3e3e4a'); px.rect(g, 151, 129, 2, 10, '#4a4a58');
    for (const [x, y] of [[-40, 98], [-28, 92]]) { px.rect(g, x, y, 14, 12, '#7a5a3a'); px.rect(g, x, y, 14, 1, '#a07a50'); px.line(g, x, y, x + 13, y + 11, '#5a4028'); }
  }
  // the SALTY GULL: a plank back wall under a beam, shelves behind the bar, the oil barrel, the fireplace, a board floor
  function paintTavern(g) {
    const X0 = -120, WD = 640;
    // the rafters in the margin above: dark boards, beams across, the lamps' chains going up
    planks(g, X0, -160, WD, 160, '#2e1e14', 9, 7, true);
    for (const y of [-150, -96, -40]) { px.rect(g, X0, y, WD, 9, '#1a100a'); px.rect(g, X0, y, WD, 1, '#3a2418'); }
    for (const x of [-60, 60, 180, 300, 420]) { px.poly(g, [[x, -150], [x + 8, -150], [x + 68, -40], [x + 60, -40]], '#22160e'); }
    planks(g, X0, 0, WD, 100, '#5a3a28', 8, 2, true);
    px.rect(g, X0, 0, WD, 8, '#24160e'); px.rect(g, X0, 18, WD, 4, '#3a2418'); px.rect(g, X0, 18, WD, 1, '#5a3a28'); px.rect(g, X0, 94, WD, 6, '#2e1c12');
    for (const x of [-70, 8, 112, 258, 304, 396, 470]) { px.rect(g, x, 8, 5, 86, '#3a2418'); px.rect(g, x, 8, 1, 86, '#5a3a28'); }
    // the floor: boards in rows that widen toward us, lighter where the fire reaches
    planks(g, X0, 100, WD, 228, '#7a5034', r => 3 + Math.floor(r * 1.2), 4);
    px.polyDither(g, ell(350, 118, 90, 22), '#ffb060', .2); px.polyDither(g, ell(186, 104, 70, 10), '#ffc070', .14);
    // the door back to the dock (its little window shows the dusk)
    px.rect(g, 12, 36, 34, 64, '#24160e'); planks(g, 14, 38, 30, 62, '#4a2c1c', 7, 11, true); grad(g, 22, 44, 14, 12, [[0, '#8a3a62'], [1, '#f09060']], 4); px.rect(g, 28, 44, 2, 12, '#24160e'); px.dot(g, 40, 70, '#e8c060');
    // the notice board, the hanging lamps and their light
    px.rect(g, 52, 26, 34, 26, '#3a2418'); px.rect(g, 54, 28, 30, 22, '#a07a4a'); for (const [x, y, c] of [[56, 30, '#e8e0c8'], [68, 32, '#f0e8d8'], [60, 40, '#e0d4b8'], [74, 41, '#e8e0c8']]) { px.rect(g, x, y, 9, 8, c); px.rect(g, x + 1, y + 2, 6, 1, '#7a7060'); px.rect(g, x + 1, y + 4, 5, 1, '#7a7060'); px.dot(g, x + 4, y, '#c83a3a'); }
    for (const x of [150, 238]) { px.rect(g, x, -160, 1, 180, '#1a1010'); px.rect(g, x - 3, 20, 7, 8, '#2a2a30'); px.rect(g, x - 2, 21, 5, 6, '#ffe090'); glow(g, x, 24, 30, '#ffc060', .45); }
    // shelves of bottles and mugs behind the bar
    for (const y of [40, 60]) { px.rect(g, 124, y, 128, 3, '#3a2418'); px.rect(g, 124, y, 128, 1, '#6a4a30');
      for (let x = 128; x < 248; x += 7) { const u = hash(x, y), c = u < .3 ? '#3a7a4a' : u < .55 ? '#7a4a2a' : u < .75 ? '#b8c8c8' : '#6a2a3a', h = 8 + Math.floor(u * 6); px.rect(g, x, y - h, 4, h, c); px.rect(g, x + 1, y - h - 2, 2, 2, c); px.rect(g, x, y - h + 2, 1, h - 3, '#ffffff40'); } }
    // the whale-oil barrel on its stand, its tap
    px.rect(g, 262, 92, 4, 8, '#2a1a10'); px.rect(g, 292, 92, 4, 8, '#2a1a10');
    px.rect(g, 264, 70, 30, 24, '#7a4a2a'); for (const x of [268, 276, 284]) px.rect(g, x, 70, 1, 24, '#5a3418'); px.rect(g, 264, 74, 30, 2, '#4a4a54'); px.rect(g, 264, 88, 30, 2, '#4a4a54');
    px.ell(g, 264, 82, 4, 12, '#8a5a32'); px.ell(g, 264, 82, 2, 9, '#6a4024'); px.rect(g, 258, 80, 5, 3, '#c8a040'); px.rect(g, 258, 83, 2, 3, '#c8a040');
    E.font.text(g, 'OIL', 280, 78, '#e8d8a0', { align: 'center', outline: false, font: 'tiny' });
    // the fireplace: its stones, its black mouth (the fire burns in it, drawn each frame), the mantel, the hearth
    for (let y = 26; y < 100; y += 6) for (let x = 316 + ((y / 6) % 2) * 5; x < 388; x += 10) { const u = hash(x, y); px.rect(g, x, y, 9, 5, u < .4 ? '#6a6470' : u < .8 ? '#7a7482' : '#5a5462'); px.rect(g, x, y, 9, 1, '#8a8494'); }
    px.rect(g, 330, 58, 44, 42, '#120a08'); px.rect(g, 334, 62, 36, 38, '#1e100a');
    px.rect(g, 310, 48, 82, 6, '#5a3a24'); px.rect(g, 310, 48, 82, 1, '#8a6040'); px.rect(g, 310, 53, 82, 1, '#2a1a10');
    px.rect(g, 360, 40, 6, 8, '#d8d0c0'); px.rect(g, 362, 37, 2, 3, '#ffe080');
    px.rect(g, 314, 100, 78, 12, '#5a5462'); for (let x = 314; x < 392; x += 13) px.rect(g, x, 100, 1, 12, '#3e3846'); px.rect(g, 314, 100, 78, 1, '#8a8494');
  }
  // the LAMP ROOM: the gallery's glass round the back (the night sea, the fog, the fleet's lanterns), its iron frames,
  // the parapet, the iron grating floor and the hatch to the stairs
  function paintLamp(g) {
    const X0 = -120, WD = 640;
    grad(g, X0, -160, WD, 232, [[0, '#03030a'], [.7, '#070818'], [.88, '#121a38'], [1, '#26365a']], 10);
    for (let i = 0; i < 200; i++) px.dot(g, X0 + Math.floor(hash(i, 41) * WD), -110 + Math.floor(hash(i, 42) * 166), hash(i, 43) < .25 ? '#e8e8ff' : '#6a70a0');
    // (the lantern's roof in the margin above: copper plates and ribs closing in toward its middle)
    px.poly(g, [[X0, -160], [X0 + WD, -160], [X0 + WD, -112], [X0, -112]], '#2a3a36'); for (let x = X0; x < X0 + WD; x += 24) px.line(g, x, -112, 200 + (x - 200) * .6, -160, '#3e544e');
    px.rect(g, X0, -114, WD, 4, '#1a2420'); px.rect(g, X0, -110, WD, 1, '#4a645c');
    grad(g, X0, 72, WD, 32, [[0, '#1a2848'], [1, '#0a1020']], 6);
    for (let i = 0; i < 160; i++) px.rect(g, X0 + hash(i, 51) * WD, 73 + hash(i, 52) * 30, 2 + hash(i, 53) * 4, 1, '#2a3a60');
    for (const [cx, cy, w] of [[0, 66, 160], [210, 62, 200], [420, 68, 150], [-90, 60, 90]]) px.polyDither(g, ell(cx, cy, w / 2, 6), '#5a6a8a', .3);
    for (let i = 0; i < 14; i++) { const x = X0 + 40 + hash(i, 61) * (WD - 80), y = 76 + hash(i, 62) * 20; glow(g, x, y, 5, '#ffc060', .5); px.dot(g, x, y, '#ffe8a0'); }
    // the frames: a mullion every 48 pixels, a rail, the sill; the parapet under it, riveted
    for (let x = X0; x < X0 + WD; x += 48) { px.rect(g, x, -110, 4, 214, '#22222c'); px.rect(g, x, -110, 1, 214, '#4a4a5a'); }
    px.rect(g, X0, 40, WD, 2, '#22222c'); px.rect(g, X0, -40, WD, 2, '#22222c'); px.rect(g, X0, 98, WD, 6, '#3a3a46'); px.rect(g, X0, 98, WD, 1, '#6a6a7a');
    px.rect(g, X0, 104, WD, 10, '#4a4654'); for (let x = X0 + 4; x < X0 + WD; x += 12) px.dot(g, x, 108, '#7a7686'); px.rect(g, X0, 113, WD, 1, '#2a2832');
    // the grating: a dark floor, a grid of bars lit along their tops
    px.rect(g, X0, 114, WD, 214, '#26242c');
    for (let y = 116, k = 0; y < 328; k++, y += 4 + Math.floor(k / 2)) px.rect(g, X0, y, WD, 1, '#46424e');
    for (let x = X0; x < X0 + WD; x += 6) px.rect(g, x, 114, 1, 214, '#34303a');
    // the hatch to the stairs, the ladder's rails and rungs going down
    px.rect(g, 28, 140, 50, 22, '#3a3640'); px.rect(g, 31, 143, 44, 16, '#08070c'); for (const x of [40, 64]) px.rect(g, x, 143, 2, 16, '#5a4a3a'); for (let y = 146; y < 159; y += 4) px.rect(g, 40, y, 26, 1, '#5a4a3a');
    // the fog bell on its bracket, its rope
    px.rect(g, 352, 34, 34, 3, '#22222c'); px.rect(g, 368, 37, 2, 6, '#22222c');
    px.poly(g, [[362, 43], [376, 43], [380, 64], [358, 64]], '#a8783a'); px.poly(g, [[370, 43], [376, 43], [380, 64], [372, 64]], '#7a5428'); px.rect(g, 356, 64, 26, 3, '#c8904a'); px.rect(g, 368, 67, 2, 4, '#5a4020');
    for (let y = 70; y < 100; y++) px.dot(g, 382 + Math.round(Math.sin(y * .3)), y, '#c8b080');
  }

  /* ---- 2. ITEMS, the people, the rooms' hotspots, the rules: data for E.Click; the talk: nodes for E.Story ---- */
  const S = (rows, pal) => E.sprite(rows, pal);
  const ITEMS = {
    rope: { name: 'ROPE', look: 'A good length of rope. Salt-stiff, but strong.', icon: S(['...bbbbbb...', '.bBBbbbbBBb.', 'bBb......bBb', 'bB..bbbb..Bb', 'bB.bBBBBb.Bb', 'bB.bB..Bb.Bb', 'bB.bBBBBb.Bb', 'bB..bbbb..Bb', 'bBb......bBb', '.bBBbbbbBBb.', '...bbbbbbBB.', '.........BB.'], { b: '#8a6a3a', B: '#e0b878' }) },
    hook: { name: 'HOOK', look: 'An iron hook, rusty and sharp.', icon: S(['.....KK..', '....KhhK.', '....KhK..', '....KhK..', '....KhK..', '.K..KhK..', 'KhK.KhK..', 'KhK.KhK..', 'KhhKhhK..', '.KhhhK...', '..KKK....'], { K: '#2a2a34', h: '#a8b0c0' }) },
    grapple: { name: 'GRAPPLE', look: 'A hook on a rope. I could go fishing with this.', icon: S(['bBb.......KK', 'B.Bb.....KhK', 'bB.Bb....KhK', '.bB.Bbb..KhK', '..bBb.BBbKhK', '....bbb.KhK.', '...K..K.KhK.', '..KhK.KhhK..', '..KhhKhhK...', '...KhhhK....', '....KKK.....'], { b: '#8a6a3a', B: '#e0b878', K: '#2a2a34', h: '#a8b0c0' }) },
    oar: { name: 'OAR', look: 'Finn\'s oar. Still dripping.', icon: S(['..........ww', '.........wWw', '........wWw.', '.......wWw..', '......wWw...', '.....wWw....', '..bbwWw.....', '.bBBBw......', 'bBBBb.......', 'bBBb........', '.bb.........'], { w: '#6a4a2a', W: '#c8965a', b: '#6a4a2a', B: '#d8a868' }) },
    key: { name: 'KEY', look: 'Morwen\'s brass key. It opens Finn\'s chain.', icon: S(['.yyy........', 'yY.Yy.......', 'y...yyyyyyyy', 'yY.YyYYYYYYy', '.yyy....y.y.', '........y.y.'], { y: '#8a6a20', Y: '#f0d060' }) },
    bottle: { name: 'BOTTLE', look: 'An empty bottle. It smells of rum.', icon: S(['..kk..', '..gg..', '..gg..', '.gGgg.', 'gGgggg', 'gGgggg', 'gGgggg', 'gGgggg', 'gGgggg', '.gggg.'], { k: '#7a5a3a', g: '#2a6a4a', G: '#8ad0a0' }) },
    oil: { name: 'OIL', look: 'A bottle of whale oil. It smells awful.', icon: S(['..kk..', '..gg..', '..gg..', '.gGgg.', 'gGgggg', 'gGoooo', 'gGoOoo', 'gGoooo', 'gGoooo', '.gggg.'], { k: '#7a5a3a', g: '#2a6a4a', G: '#8ad0a0', o: '#c8902a', O: '#ffd070' }) },
    matches: { name: 'MATCHES', look: 'A box of matches. Five left.', icon: S(['......rr....', '......rw....', '......w.....', '.....w......', 'bbbbbbbbbb..', 'bBBBBBBBBb..', 'bByyyyyyBb..', 'bBBBBBBBBb..', 'bbbbbbbbbb..'], { r: '#d83a2a', w: '#e8d8b0', b: '#3a2a6a', B: '#6a5ab0', y: '#f0d060' }) }
  };
  // where the people stand (room pixels), their rigs made at each start
  const PEOPLE = { finn: { x: 244, y: 128, face: Math.PI, h: 50, color: '#ffe080' }, morwen: { x: 96, y: 118, face: Math.PI / 2, h: 52, color: '#b0d8ff' }, bruno: { x: 188, y: 94, face: Math.PI / 2, h: 54, color: '#ffc0a0' } };
  const say = (s, who) => pc => pc.say(s, who && PEOPLE[who]);
  const bob = (x, y, f = 1) => Math.round(Math.sin(game.time * 1.6 * f + x) * 1.2);
  let ROOMS = null;
  const rooms = () => ({
    dock: { w: 480, h: 168, pad: [120, 160], paint: paintDock, depth: [112, .78, 165, 1.08],
      walk: [[[8, 112], [168, 112], [174, 118], [418, 118], [418, 148], [174, 148], [168, 165], [8, 165]], [[234, 124], [254, 124], [254, 132], [234, 132]]],
      things: [{ y: 1, draw(g, ox, oy) { g.save(); g.beginPath(); g.rect(ox + 174, oy, 800, 110); g.clip(); for (let i = 0; i < 3; i++) { const x = ((game.time * (3 + i * 2) + i * 230) % 760) - 140; px.polyDither(g, ell(ox + x, oy + 76 + i * 5, 70 + i * 20, 3), '#d8b8d8', .16); } g.restore(); px.reset(g); } }],   // (fog drifting over the sea)
      hotspots: [
        { id: 'door', name: 'TAVERN DOOR', rect: [56, 60, 32, 48], at: [72, 116], face: 'up', exit: 'tavern', enter: [40, 128], look: 'The Salty Gull. Warm in there, and loud.', open: pc => pc.act('walk', 'door') },
        { id: 'rope', name: 'ROPE', rect: [116, 132, 26, 14], at: [108, 144], face: 'right', if: '!rope', y: 146,
          draw(g, ox, oy) { for (let r = 0; r < 3; r++) px.poly(g, ell(ox + 129, oy + 141 - r * 2, 11 - r, 4 - r * .6, 14), r % 2 ? '#8a6a3a' : '#d8b070'); px.poly(g, ell(ox + 129, oy + 137, 5, 1.5, 10), '#5a4428'); },
          look: 'A coil of rope. Nobody seems to be using it.', pickup: { give: 'rope', set: 'rope', say: 'A good length of rope. Mine now.' } },
        { id: 'finn', name: 'FINN', actor: PEOPLE.finn, at: [222, 132], face: 'right', look: 'Finn. He\'s fished these waters for fifty years.', talk: { talk: 'finn' }, pickup: 'He\'s a bit big to carry.' },
        { id: 'oar', name: 'OAR', rect: [280, 152, 44, 12], at: [300, 146], face: 'down', if: '!oar', y: 160,
          draw(g, ox, oy) { const b = bob(300, 0), x = ox + 282, y = oy + 157 + b; px.rect(g, x, y, 30, 2, '#c8965a'); px.rect(g, x, y + 2, 30, 1, '#6a4a2a'); px.poly(g, [[x + 30, y - 2], [x + 42, y - 1], [x + 42, y + 4], [x + 30, y + 4]], '#d8a868'); px.rect(g, x - 3, y + 4, 50, 1, '#8a7ab8'); },
          look: 'Finn\'s oar, bobbing just out of reach.', pickup: 'I can\'t reach it from up here.', use: 'Too far down to reach.' },
        { id: 'boat', name: 'ROWBOAT', rect: [424, 128, 56, 24], at: [410, 136], face: 'right', look: pc => pc.say(story.get('unchained') ? 'Finn\'s rowboat, free of its chain.' : 'Finn\'s rowboat. Chained to the post.'), use: () => row(), open: () => row(), push: () => row() },
        { id: 'chain', name: 'CHAIN', rect: [410, 112, 16, 30], at: [404, 134], face: 'right', if: '!unchained', y: 146,
          draw(g, ox, oy) { for (let i = 0; i <= 8; i++) { const u = i / 8, x = ox + 418 + u * 18, y = oy + 124 + u * 14 + Math.sin(u * Math.PI) * 3; px.rect(g, x, y, 2, 2, i % 2 ? '#8a8a9a' : '#c8c8d8'); } px.rect(g, ox + 414, oy + 120, 8, 7, '#c8a040'); px.rect(g, ox + 415, oy + 117, 6, 3, '#8a8a9a'); px.dot(g, ox + 418, oy + 123, '#3a2a10'); },
          look: 'A chain and a brass padlock. Morwen\'s, by the look of it.', pull: 'It\'s locked tight.', open: 'It needs a key.', use: 'It needs a key.', pickup: 'It\'s fixed to the post.' },
        { id: 'gull', name: 'GULL', rect: [338, 80, 16, 14], at: [344, 122], face: 'up', y: 95,
          draw(g, ox, oy) { const x = ox + 345, y = oy + 88 + (Math.floor(game.time * 1.5) % 3 === 0 ? -1 : 0); px.ell(g, x, y, 5, 3, '#e8e8f0'); px.rect(g, x - 5, y - 1, 6, 2, '#9aa0b0'); px.disc(g, x + 4, y - 3, 2, '#f0f0f8'); px.dot(g, x + 5, y - 4, '#1a1a20'); px.rect(g, x + 6, y - 3, 2, 1, '#f0b030'); px.rect(g, x - 1, y + 3, 1, 2, '#f0b030'); px.rect(g, x + 1, y + 3, 1, 2, '#f0b030'); },
          look: 'A gull. It\'s eyeing my sandwich. I haven\'t got a sandwich.', talk: 'Squawk? ...I don\'t speak gull.', pickup: 'It would peck my eyes out.' },
        { id: 'light', name: 'GULL ROCK', rect: [384, 24, 26, 46], look: 'Gull Rock. Its light should be lit by now, and the fleet\'s out in this fog.', use: 'It\'s miles out. I\'ll need a boat.' }
      ] },
    tavern: { w: 400, h: 168, pad: [120, 160], paint: paintTavern, depth: [104, .84, 165, 1.08],
      walk: [[[8, 104], [310, 104], [314, 114], [392, 114], [392, 165], [8, 165]], [[66, 116], [126, 116], [126, 138], [66, 138]]],
      things: [
        { y: 100, draw(g, ox, oy) { const x = ox + 116, y = oy + 76; px.rect(g, x, y, 140, 6, '#6a4228'); px.rect(g, x, y, 140, 1, '#a07048'); px.rect(g, x, y + 6, 140, 18, '#4a2c1a'); for (let i = 0; i < 5; i++) { px.rect(g, x + 6 + i * 27, y + 9, 22, 12, '#3a2214'); px.rect(g, x + 6 + i * 27, y + 9, 22, 1, '#5a3824'); } px.rect(g, x - 2, y + 24, 144, 2, '#24160e'); } },
        { y: 112, draw(g, ox, oy) { const x = ox + 352, y = oy + 98, t = game.time; for (let i = 0; i < 6; i++) { const h = 10 + Math.sin(t * 9 + i * 1.7) * 3 + (i % 3) * 3, xx = x - 14 + i * 5 + Math.round(Math.sin(t * 6 + i) * 1); px.poly(g, [[xx - 3, y], [xx + 3, y], [xx + Math.round(Math.sin(t * 7 + i) * 2), y - h]], i % 2 ? '#ff8a2a' : '#ffc040'); } px.rect(g, x - 16, y, 34, 2, '#3a1a0a'); glow(g, x, y - 6, 26, '#ff9a40', .35); } },
        { y: 138, draw(g, ox, oy) { const x = ox + 96, y = oy + 124; px.rect(g, x - 24, y + 4, 3, 12, '#3a2214'); px.rect(g, x + 21, y + 4, 3, 12, '#3a2214'); px.poly(g, ell(x, y, 28, 7), '#6a4228'); px.poly(g, ell(x, y - 1, 26, 5.5), '#8a5a34'); px.rect(g, x - 16, y - 7, 3, 6, '#e8e0c8'); px.dot(g, x - 15, y - 8, '#ffd060'); glow(g, x - 15, y - 9, 10, '#ffc060', .4); } }
      ],
      hotspots: [
        { id: 'out', name: 'DOOR', rect: [12, 36, 34, 64], at: [32, 110], face: 'up', exit: 'dock', enter: [74, 120], look: 'Back out to the dock.' },
        { id: 'bruno', name: 'BRUNO', actor: PEOPLE.bruno, at: [186, 112], face: 'up', look: 'Bruno keeps the Salty Gull. He has arms like hams.', talk: { talk: 'bruno' }, pickup: 'Not without a crane.' },
        { id: 'barrel', name: 'OIL BARREL', rect: [258, 68, 38, 32], at: [278, 110], face: 'up', look: 'A barrel of whale oil, for the town\'s lamps.', use: 'I need something to carry it in.', open: 'It has a tap. I need something to carry the oil in.', pickup: 'It weighs more than I do.' },
        { id: 'matches', name: 'MATCHES', rect: [340, 40, 16, 9], at: [350, 120], face: 'up', if: '!matches', y: 54,
          draw(g, ox, oy) { const x = ox + 342, y = oy + 43; px.rect(g, x, y, 12, 5, '#3a2a6a'); px.rect(g, x + 1, y + 1, 10, 3, '#6a5ab0'); px.rect(g, x + 2, y + 2, 8, 1, '#f0d060'); },
          look: 'A box of matches on the mantel.', pickup: { give: 'matches', set: 'matches', say: 'Matches. Bruno won\'t mind.' } },
        { id: 'hook', name: 'HOOK', rect: [92, 46, 14, 16], at: [100, 108], face: 'up', if: '!hook', y: 64,
          draw(g, ox, oy) { const x = ox + 98, y = oy + 48; px.rect(g, x, y, 3, 3, '#3a3a44'); px.rect(g, x + 1, y + 3, 2, 7, '#a8b0c0'); px.rect(g, x - 2, y + 10, 5, 2, '#a8b0c0'); px.rect(g, x - 3, y + 7, 2, 4, '#a8b0c0'); px.rect(g, x + 3, y + 3, 1, 7, '#5a6070'); },
          look: 'An iron hook, screwed into rotten wood.', pickup: { give: 'hook', set: 'hook', say: 'It comes away from the rotten wood. Got it.' }, pull: { give: 'hook', set: 'hook', say: 'One good pull, and it comes away. Got it.' } },
        { id: 'notice', name: 'NOTICES', rect: [52, 26, 34, 26], at: [70, 108], face: 'up', look: ['"WANTED: A KEEPER\'S HAND FOR GULL ROCK."', '"FOUND: ONE LEFT BOOT. ASK BRUNO."', 'And a riddle, pinned up by Morwen: "UNBEATEN SINCE THE FLOOD."'], pickup: 'I\'d better leave them.' },
        { id: 'morwen', name: 'MORWEN', actor: PEOPLE.morwen, at: [138, 130], face: 'left', look: 'Morwen, the harbour master. Every key on the dock hangs from her belt.', talk: { talk: 'morwen' }, pickup: 'I value my life.' },
        { id: 'bottle', name: 'BOTTLE', rect: [104, 106, 10, 16], at: [134, 142], face: 'left', if: '!bottle', y: 139,
          draw(g, ox, oy) { const x = ox + 106, y = oy + 108; px.rect(g, x + 2, y, 2, 3, '#7a5a3a'); px.rect(g, x + 1, y + 3, 4, 3, '#2a6a4a'); px.rect(g, x, y + 6, 6, 9, '#2a6a4a'); px.rect(g, x + 1, y + 6, 1, 8, '#8ad0a0'); },
          look: 'An empty bottle. Morwen\'s, I think.', pickup: { give: 'bottle', set: 'bottle', say: 'An empty bottle. She won\'t miss it.' } }
      ] },
    lamp: { w: 400, h: 168, pad: [120, 160], paint: paintLamp, depth: [114, .88, 165, 1.08],
      walk: [[[8, 116], [392, 116], [392, 165], [8, 165]], [[174, 126], [226, 126], [232, 132], [226, 140], [174, 140], [168, 132]], [[310, 120], [334, 120], [334, 130], [310, 130]], [[26, 138], [80, 138], [80, 164], [26, 164]]],
      things: [
        { y: 130, draw(g, ox, oy) { const x = ox + 322, y = oy + 104; px.rect(g, x - 2, y + 6, 4, 20, '#4a3424'); px.rect(g, x - 8, y + 24, 16, 2, '#3a2a1a'); px.poly(g, [[x - 11, y], [x + 11, y], [x + 9, y + 7], [x - 9, y + 7]], '#5a3a24'); px.rect(g, x - 9, y - 2, 8, 3, '#f0e8d0'); px.rect(g, x + 1, y - 2, 8, 3, '#e8e0c8'); px.rect(g, x - 7, y - 1, 5, 1, '#8a8070'); px.rect(g, x + 2, y - 1, 5, 1, '#8a8070'); } },
        { y: 134, draw(g, ox, oy) { const x = ox + 242, y = oy + 124; px.rect(g, x - 4, y, 9, 10, '#7a7a86'); px.rect(g, x - 4, y, 2, 10, '#a8a8b4'); px.rect(g, x + 3, y - 3, 4, 2, '#7a7a86'); px.rect(g, x - 1, y - 2, 3, 2, '#5a5a66'); } },
        { y: 136, draw: (g, ox, oy) => drawLamp(g, ox, oy) }
      ],
      front(g, ox, oy) { if (!story.get('lit')) return; const cx = ox + 200, cy = oy + 52, a = game.time * 1.3; for (const s of [0, Math.PI]) { const b = a + s; px.polyDither(g, [[cx, cy], [cx + Math.cos(b - .14) * 460, cy + Math.sin(b - .14) * 160], [cx + Math.cos(b + .14) * 460, cy + Math.sin(b + .14) * 160]], '#fff2b0', .22); } glow(g, cx, cy, 70, '#fff0a0', .6); },
      hotspots: [
        { id: 'hatch', name: 'STAIRS', rect: [28, 138, 52, 24], at: [54, 134], face: 'down', exit: 'dock', enter: [404, 136], look: 'A hundred and twelve steps back down to the boat.' },
        { id: 'lens', name: 'LENS', rect: [170, 22, 60, 40], look: 'A great glass lens, rings inside rings. It throws the light twenty miles.', use: 'It\'s the lamp inside that needs lighting.', pickup: 'It weighs as much as a cow.' },
        { id: 'lamp', name: 'LAMP', rect: [178, 62, 44, 72], at: [200, 146], face: 'up', look: pc => pc.say(story.get('lit') ? 'Burning bright!' : story.get('oiled') ? 'Its well is full of oil. It just needs a flame.' : 'The great lamp. Its oil well is bone dry.'), use: 'It needs oil, and then a flame.', open: 'The oil well is open. And empty.' },
        { id: 'log', name: 'LOGBOOK', rect: [310, 98, 26, 14], at: [322, 138], face: 'up', look: ['The keeper\'s log. The last entry:', '"Oil run dry. Gone ashore for more. Back by dusk. BRAM."'], open: ['"Oil run dry. Gone ashore for more. Back by dusk. BRAM."', 'It\'s well past dusk.'], pickup: 'It belongs here.' },
        { id: 'bell', name: 'FOG BELL', rect: [354, 40, 32, 30], at: [370, 122], face: 'up', look: 'The fog bell. For when the light isn\'t enough.', use: () => bell(), pull: () => bell(), push: () => bell() },
        { id: 'can', name: 'OIL CAN', rect: [236, 118, 14, 18], at: [254, 144], face: 'left', look: 'The keeper\'s oil can. Empty, of course.', pickup: 'It\'s empty. No use to me.', use: 'Empty.' },
        { id: 'window', name: 'WINDOW', rect: [60, 6, 100, 60], look: pc => pc.say(story.get('lit') ? 'The fleet\'s lanterns are turning for home!' : 'Fog to the horizon. I can see the fleet\'s lanterns bobbing out there.'), open: 'The wind would blow the flame out.' }
      ] }
  });
  // the great lamp: its brass pedestal, the burner, the beehive lens of glass rings (ablaze once lit)
  function drawLamp(g, ox, oy) {
    const x = ox + 200, y = oy + 52, lit = story.get('lit'), t = game.time;
    px.poly(g, ell(x, oy + 134, 26, 6), '#3a2a18'); px.poly(g, ell(x, oy + 132, 22, 5), '#a8783a');
    px.rect(g, x - 9, oy + 86, 18, 46, '#8a5a28'); px.rect(g, x - 9, oy + 86, 4, 46, '#c8904a'); px.rect(g, x + 6, oy + 86, 3, 46, '#5a3a18');
    for (const yy of [92, 112, 126]) px.rect(g, x - 11, oy + yy, 22, 3, '#c8904a');
    px.rect(g, x - 26, y + 28, 52, 6, '#a8783a'); px.rect(g, x - 26, y - 30, 52, 5, '#a8783a'); px.poly(g, [[x - 20, y - 30], [x + 20, y - 30], [x, y - 40]], '#8a5a28');
    // the lens: rings of prisms, a bullseye in the middle, the gallery's frames seen through the glass
    for (let i = 0; i < 9; i++) {
      const yy = y - 25 + i * 6, w = Math.round(17 + Math.sqrt(16 - (i - 4) * (i - 4)) * 2.2), c = lit ? (i % 2 ? '#fff4c0' : '#ffe080') : (i % 2 ? '#7890a8' : '#9ab0c4');
      px.rect(g, x - w, yy, w * 2, 5, c); px.rect(g, x - w, yy + 4, w * 2, 1, lit ? '#ffd060' : '#4a6078'); px.rect(g, x - w, yy, w * 2, 1, lit ? '#ffffff' : '#c8d8e4');
      px.rect(g, x - w + 2, yy + 1, 3, 2, lit ? '#ffffff' : '#e8f0f4'); px.rect(g, x + w - 6, yy + 1, 4, 3, lit ? '#ffe8a0' : '#5a7088');
    }
    if (!lit) for (const dx of [-14, 14]) px.rect(g, x + dx, y - 25, 1, 54, '#3a4a5e');
    px.ell(g, x, y + 1, 9, 9, lit ? '#ffffff' : '#b8ccdc'); px.ell(g, x, y + 1, 6, 6, lit ? '#fff8d0' : '#8aa4bc');
    if (lit) { glow(g, x, y, 34 + Math.sin(t * 8) * 2, '#ffffd0', .9); px.disc(g, x, y, 5, '#ffffff'); }
    else { px.rect(g, x - 3, y - 2, 6, 8, '#3a3a44'); px.rect(g, x - 1, y - 4, 2, 2, '#1a1a20'); }
  }
  // the rules (data): an item on a hotspot or an item, the first that matches runs
  const RULES = [
    { item: 'rope', on: 'hook', take: ['rope', 'hook'], give: 'grapple', say: 'I knot the rope to the hook. A grapple!' },
    { item: 'grapple', on: 'oar', take: 'grapple', give: 'oar', set: 'oar', say: 'Got it! I haul Finn\'s oar up onto the pier.' },
    { item: 'rope', on: 'oar', say: 'The rope just floats beside it. It needs something on the end to catch it.' },
    { item: 'hook', on: 'oar', say: 'My arm isn\'t that long. If the hook were on a line...' },
    { item: 'key', on: 'chain', take: 'key', set: 'unchained', say: 'Click! The padlock springs open, and the chain drops.' },
    { item: 'bottle', on: 'barrel', take: 'bottle', give: 'oil', say: 'I fill the bottle from the tap. Whale oil. Phew.' },
    { item: 'oil', on: 'lamp', take: 'oil', set: 'oiled', say: 'I pour the oil into the lamp\'s well. Every drop.' },
    { item: 'matches', on: 'lamp', if: 'oiled', take: 'matches', do: () => light() },
    { item: 'matches', on: 'lamp', say: 'There\'s no oil in it to burn.' },
    { item: 'oil', on: 'can', say: 'The lamp needs it more than the can does.' },
    { verb: 'give', item: 'oar', on: 'finn', do: pc => pc.say('Hang on to it, Pip. You\'re the one rowing.', PEOPLE.finn) },
    { verb: 'give', item: 'bottle', on: 'bruno', do: pc => pc.say('Fill it yourself, lad. The barrel\'s right there.', PEOPLE.bruno) },
    { verb: 'give', item: 'key', on: 'morwen', do: pc => pc.say('Keep it till the boat\'s back. Then I want it.', PEOPLE.morwen) }
  ];
  // the talk: Finn's opening and his questions, Bruno's, Morwen's riddle contest (three right answers win the key)
  const NODES = {
    intro: [
      { who: 'finn', say: ['Pip! Gull Rock\'s gone dark. Old Bram rowed ashore for oil this morning, and he\'s not back.', 'And the whole fleet\'s out in this fog. Without the light they\'ll be on the rocks by midnight.'] },
      { who: 'pip', say: 'Then I\'ll light it myself! How do I get out there?' },
      { who: 'finn', say: ['Take my rowboat, at the end of the pier. Only I dropped my oar in the drink...', 'And Morwen chains every boat on this dock at dusk. She\'s in the Salty Gull.'] }],
    finn: [{ who: 'finn', say: 'Any luck, Pip?', choices: [{ text: 'WHERE\'S YOUR OAR?', goto: 'finnOar' }, { text: 'HOW DO I GET THE KEY?', goto: 'finnKey' }, { text: 'WHAT DOES THE LAMP NEED?', goto: 'finnLamp' }, { text: 'I\'D BETTER GO', goto: 'finnBye' }] }],
    finnOar: [{ if: 'oar', who: 'finn', say: 'You fished it out! Good lad.' }, { if: '!oar', who: 'finn', say: 'Floating by the pier, just out of reach. A hook on a line would fetch it.' }, { goto: 'finn' }],
    finnKey: [{ if: 'unchained', who: 'finn', say: 'You got her to part with it? Then go!' }, { if: '!unchained', who: 'finn', say: 'Morwen won\'t sell it. But she can\'t resist a riddle contest. Never lost one, mind.' }, { goto: 'finn' }],
    finnLamp: [{ who: 'finn', say: 'Oil, and a flame. Bram went ashore because the oil ran out.' }, { goto: 'finn' }],
    finnBye: [{ who: 'finn', say: 'Mind the fog, Pip.' }],
    bruno: [{ who: 'bruno', say: 'What\'ll it be, Pip?', choices: [{ text: 'THE LIGHTHOUSE IS DARK', goto: 'brunoLight' }, { text: 'IS THAT WHALE OIL?', goto: 'brunoOil' }, { text: 'TELL ME ABOUT MORWEN', goto: 'brunoMorwen' }, { text: 'NOTHING, THANKS', goto: 'brunoBye' }] }],
    brunoLight: [{ who: 'bruno', say: 'Bram\'s gone ashore, so the lamp\'s dry. You\'ll want oil, and a flame to put to it. There\'s matches on the mantel.' }, { goto: 'bruno' }],
    brunoOil: [{ who: 'bruno', say: 'For the town\'s lamps, aye. Take what you need, if you\'ve something to carry it in.' }, { goto: 'bruno' }],
    brunoMorwen: [{ who: 'bruno', say: 'Harbour master. Loves a riddle more than her own mother. Never lost a contest, she says.' }, { goto: 'bruno' }],
    brunoBye: [{ who: 'bruno', say: 'Mind the fog.' }],
    morwen: [{ if: 'wonKey', goto: 'morwenWon' }, { who: 'morwen', say: 'Finn\'s chain? Every chain on this dock is mine, Pip, and so is every key.' },
      { who: 'morwen', say: 'But I\'ll give that key to anyone who beats me at riddles. Three riddles. No mistakes.', choices: [{ text: 'ASK AWAY', goto: 'riddle1' }, { text: 'NOT NOW', goto: 'morwenBye' }] }],
    riddle1: [{ who: 'morwen', say: 'First. What has a mouth but never eats, and a bed but never sleeps?', choices: [{ text: 'A WHALE', goto: 'wrong' }, { text: 'A RIVER', goto: 'riddle2' }, { text: 'A HARBOUR', goto: 'wrong' }] }],
    riddle2: [{ who: 'morwen', say: 'Lucky. Second. The more of them you take, the more you leave behind.', choices: [{ text: 'COINS', goto: 'wrong' }, { text: 'FISH', goto: 'wrong' }, { text: 'FOOTSTEPS', goto: 'riddle3' }] }],
    riddle3: [{ who: 'morwen', say: 'Hmph. Last. I\'m light as a feather, yet the strongest sailor can\'t hold me for long.', choices: [{ text: 'HIS BREATH', goto: 'won' }, { text: 'A GULL', goto: 'wrong' }, { text: 'A SAIL', goto: 'wrong' }] }],
    won: [{ who: 'morwen', say: ['Three for three! Nobody\'s done that since the flood.', 'Here. Finn\'s padlock, and mind you bring it back.'], set: 'wonKey', event: 'key' }],
    wrong: [{ who: 'morwen', say: 'Wrong! Come back when you\'re sharper, Pip.', add: { tries: 1 } }],
    morwenWon: [{ who: 'morwen', say: 'The key\'s yours, Pip. Off you go.' }],
    morwenBye: [{ who: 'morwen', say: 'I\'ll be here. I always am.' }],
    ending: [{ who: 'pip', say: 'It\'s lit! Gull Rock is shining again!' }, { who: 'pip', say: 'Steer for the light, all of you. Come home.' }]
  };

  /* ---- 3. THE GAME: the opening card and talk, play, the ending, THE END ---- */
  let pc = null, story = null, rigs = null, mode = 'open', modeT = 0, acts = 0, played = 0, caption = null;
  // the interface (Settings, Point and click): the nine verbs, the icons, the coin or two buttons
  game.settings.define({ key: 'pcInterface', group: 'Point and click', label: 'Interface', options: [['verbs', 'Nine verbs'], ['icons', 'Icons'], ['coin', 'Verb coin'], ['two', 'Two buttons']], value: 'verbs',
    help: 'Nine verbs: SCUMM\'s (Monkey Island), a verb then a thing. Icons: Sierra\'s, a right click turns the cursor. Verb coin: a click on a thing shows its verbs. Two buttons: a click uses, a right click looks. A phone taps: the coin', apply: (g, v) => { if (pc) pc.ui = v; } });
  const endMenu = new E.Menu(game, ['PLAY AGAIN', 'TITLE'], { y: 0, onPick: i => i === 0 ? game.go('pointclick', null, { fade: 'iris' }) : game.go('title') });
  function start() {
    rigs = {
      pip: new E.Humanoid({ size: 1.15, weapon: null, hair: 'short', hat: { style: 'cap', color: '#2a4a8a' }, colors: { cloth: '#e8e4dc', trim: '#2a4a8a', pants: '#3a4a6a', hair: '#c8642a', boot: '#4a3020', belt: '#6a4a2a' } }),
      finn: new E.Humanoid({ size: 1.2, weapon: null, outfit: 'coat', sleeves: 'long', hunch: .25, hair: 'short', hat: { style: 'cap', color: '#e8c040' }, colors: { coat: '#e8c040', cloth: '#3a5a7a', pants: '#3a3a4a', hair: '#d8d8d8', boot: '#2a2a30', trim: '#b89020' } }),
      morwen: new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'long', hat: { style: 'cap', color: '#1a2a4a' }, colors: { coat: '#1a2a4a', trim: '#e8c860', cloth: '#e8e4dc', pants: '#2a2a3a', hair: '#3a2420', boot: '#1a1418', belt: '#c8a040' } }),
      bruno: new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, hair: 'bald', colors: { cloth: '#f0ece0', pants: '#4a3a2a', belt: '#6a4a2a', skin: '#d8a880', boot: '#2a2018' } })
    };
    for (const k in PEOPLE) PEOPLE[k].rig = rigs[k];
    ROOMS = ROOMS || rooms();
    story = new E.Story(game, { people: { pip: { name: 'PIP', portrait: rigs.pip }, finn: { name: 'FINN', portrait: rigs.finn }, morwen: { name: 'MORWEN', portrait: rigs.morwen }, bruno: { name: 'BRUNO', portrait: rigs.bruno } },
      nodes: NODES, vars: { tries: 0 }, on: { key: () => { pc.give('key'); A.sfx('key'); } } });
    pc = new E.Click(game, { rooms: ROOMS, items: ITEMS, rules: RULES, story, hero: { rig: rigs.pip, speed: 52 }, ui: game.settings.pcInterface || 'verbs', room: 'dock', at: [40, 140],
      on: { done: (pc, verb) => { acts++; if (verb === 'pickup' && !pc.line) A.sfx('pickup'); }, enter: (pc, id) => { A.sfx('door'); if (id === 'lamp' && !story.get('climbed')) { story.set('climbed'); pc.say('Phew. A hundred and twelve steps.'); } } } });
    mode = 'open'; modeT = 0; acts = 0; played = 0; caption = null; pc.panel = false;
    game.input.touchEnabled = false; L.enabled = false; game.follow(null); A.music(SONG);
  }
  // the rowboat: chained, then oarless, then off to Gull Rock
  function row() {
    if (!story.get('unchained')) { pc.say('It\'s chained to the post. Padlocked, too.'); return; }
    if (!pc.has('oar')) { pc.say('Rowing with my hands would take all night. I need an oar.'); return; }
    A.sfx('whoosh'); caption = { s: 'PIP ROWS OUT TO GULL ROCK...', t: 0 }; pc.go('lamp', [96, 136]);
  }
  function bell() { A.sfx({ wave: 'triangle', freq: 392, to: 388, dur: 1.4, vol: .35 }); pc.say('BONG! ...That woke the gulls.'); }
  // the matches on the oiled lamp: it blazes, the beams sweep, Pip's last words, THE END
  function light() {
    story.set('lit'); mode = 'lit'; modeT = 0; pc.panel = false; A.sfx('powerup'); A.music(HYMN); game.flash('#fff6d0', .5);
  }
  function update(dt) {
    modeT += dt; if (caption) caption.t += dt;
    const I = game.input;
    if (mode === 'open') { if (modeT > 3.5 || (modeT > .4 && (I.clicked() || I.pressed('confirm')))) { I.consumeAll(); mode = 'play'; pc.panel = true; story.run('intro'); } return; }
    if (mode === 'end') { if (!endMenu.update(dt)) pickOnStart(endMenu); return; }
    if (mode === 'play') played += dt;
    pc.update(dt);
    if (mode === 'lit' && modeT > 2.5 && !story.running && !story.get('said')) { story.set('said'); story.run('ending', { onDone: () => { mode = 'end'; modeT = 0; } }); }
  }
  function draw(r) {
    pc.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (caption && caption.t < 3) E.font.text(g, caption.s, W / 2, 20, '#ffe8b0', { align: 'center', shadow: '#000', outline: false });
      if (mode === 'open') {
        const a = Math.min(1, modeT * 2) * (modeT > 3 ? Math.max(0, 1 - (modeT - 3) * 2) : 1);
        g.fillStyle = 'rgba(5,4,10,' + (.55 * a).toFixed(2) + ')'; g.fillRect(0, H / 2 - 40, W, 70);
        if (a > .2) { E.font.title(g, 'THE LIGHT ON', W / 2, H / 2 - 34, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 }); E.font.title(g, 'GULL ROCK', W / 2, H / 2 - 12, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 }); }
      }
      if (mode === 'end') {
        const a = Math.min(1, modeT); g.fillStyle = 'rgba(5,4,10,' + (.6 * a).toFixed(2) + ')'; g.fillRect(0, 0, W, H);
        const y = Math.round(H / 2) - 70;
        E.font.title(g, 'THE END', W / 2, y, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
        E.font.text(g, 'THE LIGHT ON GULL ROCK', W / 2, y + 40, '#e8e0ff', { align: 'center', shadow: '#000', outline: false });
        const m = Math.floor(played / 60), s = Math.floor(played % 60);
        E.font.text(g, 'TIME ' + m + ':' + String(s).padStart(2, '0') + '    ACTIONS ' + acts + '    RIDDLES MISSED ' + (story.get('tries') || 0), W / 2, y + 54, '#b8b0d8', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
        endMenu.y = y + 72;
      }
    });
    if (mode === 'end') endMenu.draw(r);
  }

  /* ---- 4. THE BOT: clicks through the whole chain as a player would (input.feed on the screen's buttons and the
   * hotspots, the nine verbs), answers a riddle wrong first, then all three; THE END (tools/kits-test.mjs) ---- */
  function bot(o = {}) {
    const was = Math.random, I = game.input, log = [];
    try {
      Math.random = E.rng(o.seed || 5);
      game.time = 0; game.timeScale = 1; game.settings.set('pcInterface', 'verbs'); game.go('pointclick', null, { fade: 0 }); game.advance(1 / 120);
      const step = (s = 1 / 60) => game.advance(s, { draw: true });
      const key = () => { I.press('Space'); step(1 / 60); I.release('Space'); };   // (a key, as a player at a computer: input.tap is a touch button's)
      let answers = [];
      // wait while play waits: lines tapped through, choices clicked (the next answer, else the last: goodbye)
      const wait = (max = 60) => {
        for (let t = 0; t < max; t += 1 / 30) {
          const D = story.talk;
          if (mode === 'open') key();
          else if (story.running && D.open && D.choices && !D.typing && D.i >= D.pages.length - 1) { const want = answers.length ? D.choices.indexOf(answers[0]) : D.choices.length - 1; if (want < 0) throw new Error('bot: no choice ' + answers[0] + ' in ' + D.choices); answers.shift(); const p = D.choiceAt(want); click(p[0], p[1]); continue; }
          else if (story.running || pc.line) key();
          else if (!pc.busy && mode !== 'open') return;
          step(1 / 30);
        }
        throw new Error('bot: still busy after ' + max + ' s (' + pc.room + ')');
      };
      const click = (x, y) => { I.feed('move', x, y); I.feed('down', x, y); step(); I.feed('up', x, y); step(); };
      const button = id => { step(0); const b = pc.boxes.find(b => b.id === id); if (!b) throw new Error('bot: no button ' + id); click(b.x + b.w / 2, b.y + b.h / 2); };
      const spot = id => { const p = pc.where(id); if (!p) throw new Error('bot: no ' + id + ' in ' + pc.room); click(p[0], p[1]); };
      const verb = (v, id) => { button('verb:' + v); spot(id); wait(); log.push(v + ' ' + id); };
      const use = (item, id) => { button('item:' + item); if (pc.has(id)) button('item:' + id); else spot(id); wait(); log.push(item + ' on ' + id); };
      const go = id => { spot(id); wait(); log.push('to ' + pc.room); };
      wait();
      verb('pickup', 'rope'); go('door');
      verb('pull', 'hook'); use('rope', 'hook'); verb('pickup', 'bottle'); verb('pickup', 'matches'); use('bottle', 'barrel');
      answers = ['ASK AWAY', 'A WHALE']; verb('talk', 'morwen');
      const lost = !pc.has('key') && story.get('tries') === 1;
      answers = ['ASK AWAY', 'A RIVER', 'FOOTSTEPS', 'HIS BREATH']; verb('talk', 'morwen');
      go('out'); use('grapple', 'oar'); use('key', 'chain'); verb('use', 'boat');
      use('matches', 'lamp'); const dry = !story.get('lit');
      use('oil', 'lamp'); use('matches', 'lamp');
      for (let t = 0; t < 30 && mode !== 'end'; t += 1 / 30) { if (story.running) key(); step(1 / 30); }
      return { won: mode === 'end', lost, dry, log, inv: pc.inv.slice(), acts, time: Math.round(played), room: pc.room, errors: game.errors.length };
    } finally { Math.random = was; }
  }

  return { view: 'side', views: ['side'], res: 'ps1', pausable: true, touch: [], camera: { zoom: false },
    input: { ...E.Input.DEFAULT, look: ['Mouse2'] },
    enter: start, update, draw, bot,
    exit() { if (pc) pc.end(); game.input.touchEnabled = true; },
    back() { if (mode === 'end' || mode === 'open') { game.go('title'); return true; } if (pc && pc.item) { pc.item = null; return true; } return false; },
    /** for tests: the click module's E.Click (pc), the story, the scene's mode, the actions taken */
    state: () => ({ pc, story, mode, acts, room: pc && pc.room, inv: pc ? pc.inv.slice() : [] }),
    /** the proof: the opening, Finn's talk tapped through while Pip walks (the module's calls: the rope picked up, the
     *  tavern, the hook pulled, the rope tied to it); the room, the hero's place, the inventory and the flags, hashed */
    run: (n = 1500) => proof('pointclick', n, (i, k) => {
      if (i % 30 === 10) k.tap('confirm');
      if (i === 60) pc.act('pickup', 'rope'); if (i === 330) pc.act('walk', 'door'); if (i === 700) pc.act('pull', 'hook'); if (i === 1000) pc.act('use', 'hook', 'rope');
    }, () => [pc.state(), story.state(), mode, acts, Math.round(pc.hero.x * 10), Math.round(pc.hero.y * 10)]) };
})();
scenes.pointclick = POINTCLICK;

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
