/* =====================================================================================
 * SLICE 4  HORROR  (Resident Evil, Alone in the Dark, Silent Hill). @modules rpg
 * A mansion's east and west wings by flashlight, each room under its own fixed camera (a cut as you walk on, the stick
 * keeping its way across it). Hold K (or a right click) to aim the pistol: it locks on the nearest thing in front, up and
 * down aim high and low (a dog is low), left and right pick another; J fires, or slashes with the knife (Q swaps).
 * J alone checks what is in front: doors (the door opens between rooms), things to take, the item box, the typewriter
 * (a save, in the 2D engine's slots). Shift runs; I opens the items: herbs heal, green and green or green and red mix.
 * Zombies shamble and grab (tap J to shake free), dogs run and leap; two keys and a crank open the way to what waits
 * in the gallery. Few bullets: walk round what you can. Settings, Tank controls: up walks the way you face, left and
 * right turn you. THE 3D: camera zones (world.camera.zones: fixed, one that turns after you, one on a rail), lock-on
 * (camera.lock, cycle), tank steering (camera.steer), the door between rooms (world.through), a flashlight with a
 * failing bulb (world.flashlight), fog. HORROR.run(n): a scripted walk's hash (the proof); HORROR.bot(): to the boss
 * ===================================================================================== */
const HORROR = (() => {
  const T = 16, PI = Math.PI;
  /* ---- THE WING: one character per 1-metre tile. Rooms: the foyer (the start, the typewriter and the item box), the
   * west hall, the kitchen, the dining room, the east hall, the library (the crank's socket, the grille over the brass
   * key) and the gallery. Marks: @ the start, z zombies, d D dogs, G what waits, g r herbs, a A bullets, i the iron key,
   * q the brass key, c the crank, X the typewriter, Y the item box, O the crank's socket ---- */
  const LEVEL = {
    rows: [
      '####################..########################',
      '#.i.........#.................#..........#...#',
      '#.........g.#.t.............t.#..........#.q.#',
      '#..z........#.................#.KKK..KKK.#...#',
      '#...h.h.h...#........G........#..........##..#',
      '#...T.T.T...#...PP.......PP...#.....a........#',
      '#...j.j.j...#...PP.......PP...#.........O...t#',
      '#...........#.................#.KKK..KKK.....#',
      '#.t......z..#.................#..............#',
      '#..........a#.................#..z.........r.#',
      '#####..######.................#..............#',
      '#,SS,,,,SS,,#.................######..########',
      '#,,,,,,,,,k,#.................#####....#######',
      '#,,D,,c,,,,,########..#############....#######',
      '#,,,,,,,,,,,#,,,,,,,,,,,,,,,,,#####...a#######',
      '#B,,,,,,,,B,#,t,,,,,,,,,,,,,t,#####....#######',
      '#,A,,,,,,,,,#,,,,,,,,,,,,,,,,,#####..z.#######',
      '#####..######,,,,,,,,,,,,,,,,,#####....#######',
      '####....#####,,,,,,,,,,,,,,,,,#####....#######',
      '####..g.#####,,,,,,,,,,,,,,,,,#####....#######',
      '####....#####,,,b,,,,,,,,,b,,,#####....#######',
      '####........#,,,,,,,,,,,,,,,,,#.......t#######',
      '####..z......,,,,,,,,,,,,,,,,,......d..#######',
      '####.........,,,,,,,,,,,,,,,,,.g.......#######',
      '####........#,,,,,,,,,,,,,,,,,#........#######',
      '#############,,,,,,,,,,,,,,,,,################',
      '#############,,,X,,,,@,,,,Y,,,################',
      '#############,,,,,,,,,,,,,,,,,################',
      '#############,,,,,,,,,,,,,,,,,################',
      '##############################################'],
    ground: 'planks', colors: { base: '#4e3324', dark: '#3e281c', line: '#22140e' }, side: 'block', color: '#4a4248',
    legend: (() => {
      const tiles = { ground: 'tiles', colors: { a: '#6e665e', b: '#2e2a28', size: 8 } }, on = (sp, o) => Object.assign({}, sp, o);
      return { ',': tiles, P: { pillar: 56 }, t: { torch: true }, T: { shape: 'table' }, h: { shape: 'chair', facing: PI / 2 }, j: { shape: 'chair', facing: -PI / 2 },
        S: on(tiles, { shape: 'shelf', facing: PI / 2 }), B: on(tiles, { shape: 'barrel' }), k: on(tiles, { shape: 'stool' }), K: { shape: 'bookcase', facing: PI / 2 }, b: on(tiles, { shape: 'bench' }),
        '@': on(tiles, { mark: 'start' }), X: on(tiles, { mark: 'typewriter' }), Y: on(tiles, { mark: 'trunk' }), D: on(tiles, { mark: 'dog' }), c: on(tiles, { mark: 'crank' }), A: on(tiles, { mark: 'ammo' }),
        z: { mark: 'zombie' }, d: { mark: 'dog' }, G: { mark: 'boss' }, g: { mark: 'herbG' }, r: { mark: 'herbR' }, a: { mark: 'ammo' }, i: { mark: 'ironkey' }, q: { mark: 'brasskey' }, O: { mark: 'socket' } };
    })()
  };
  // the rooms (boxes in units, to the middle of their walls) and the camera of each part of them: a fixed one (at, look),
  // one that turns after you (follow), one that slides along a rail level with you (rail)
  const R = (x0, y0, x1, y1) => [x0 * T, y0 * T, x1 * T, y1 * T];
  const ROOMS = { foyer: R(12.5, 13.5, 30.5, 29.5), west: R(3.5, 17.5, 12.5, 25.5), kitchen: R(0, 10.5, 12.5, 17.5), dining: R(0, 0, 12.5, 10.5), east: R(30, 11.5, 39.5, 25.5), library: R(30.5, 0, 46, 11.5), gallery: R(12.5, 0, 30.5, 13.5) };
  const ZONES = [
    { room: 'foyer', box: R(12.5, 24, 30.5, 29.5), at: [468, 458, 64], look: [324, 352, 0], fov: 52 },
    { room: 'foyer', box: R(12.5, 13.5, 30.5, 24), at: [216, 228, 62], look: [380, 364, 0], fov: 52 },
    { room: 'west', box: R(3.5, 21, 12.5, 25.5), rail: [[196, 342, 52], [74, 342, 52]], fov: 56 },
    { room: 'west', box: R(3.5, 17.5, 8.5, 21), at: [122, 396, 50], look: [96, 292, 0], fov: 56 },
    { room: 'kitchen', box: R(0, 10.5, 12.5, 17.5), at: [184, 268, 58], look: [70, 196, 0], fov: 56 },
    { room: 'dining', box: R(0, 0, 12.5, 10.5), at: [184, 22, 62], follow: true, fov: 56 },
    { room: 'east', box: R(30, 20.5, 35, 25.5), at: [490, 396, 50], look: [604, 360, 0], fov: 56 },
    { room: 'east', box: R(35, 11.5, 39.5, 25.5), at: [592, 398, 58], follow: true, fov: 52 },
    { room: 'library', box: R(30.5, 0, 37.5, 11.5), at: [504, 170, 62], look: [584, 52, 0], fov: 56 },
    { room: 'library', box: R(37.5, 0, 46, 11.5), at: [716, 172, 62], look: [646, 60, 0], fov: 56 },
    { room: 'gallery', box: R(12.5, 0, 30.5, 13.5), rail: [[226, 206, 104], [446, 206, 104]], height: 26, fov: 58 }
  ];
  const roomAt = (x, y) => { for (const k in ROOMS) { const b = ROOMS[k]; if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return k; } return null; };
  // the doors (2 tiles wide in their gaps: yaw 0 spans x, PI / 2 spans y); the grille over the brass key rises
  const DOORS = [
    { id: 'west', x: 200, y: 368, yaw: PI / 2 }, { id: 'kitchen', x: 96, y: 280 }, { id: 'dining', x: 96, y: 168 },
    { id: 'east', x: 488, y: 368, yaw: PI / 2, locked: 'ironkey' }, { id: 'library', x: 592, y: 184 },
    { id: 'gallery', x: 336, y: 216, locked: 'brasskey' }, { id: 'exit', x: 336, y: 8, locked: 'sealed' }];

  /* ---- ITEMS: the rpg module's items and a Resident Evil inventory of six slots; the item box holds the rest ---- */
  const rpg = new E.RPG({ items: {
    herbG: { name: 'Green herb', kind: 'use', heal: 30, info: 'A medicinal plant. Mix it to make it stronger.' },
    herbR: { name: 'Red herb', kind: 'use', info: 'Useless alone. Mixed with a green herb, it heals completely.' },
    herbGG: { name: 'Mixed herbs (G+G)', kind: 'use', heal: 60, info: 'Two green herbs, ground together.' },
    herbGR: { name: 'Mixed herbs (G+R)', kind: 'use', heal: 100, info: 'Green and red: it heals every wound.' },
    ammo: { name: 'Handgun bullets', kind: 'use', stack: 60, info: 'Bullets for the handgun.' },
    ironkey: { name: 'Iron key', kind: 'key', info: 'A heavy key. An iron lock is cast on its bow.' },
    brasskey: { name: 'Brass key', kind: 'key', info: 'A polished key with a brass lock engraved on it.' },
    crank: { name: 'Crank', kind: 'key', info: 'A square-ended crank handle. It fits some mechanism.' } } });
  const MIX = { 'herbG+herbG': 'herbGG', 'herbG+herbR': 'herbGR', 'herbR+herbG': 'herbGR' };
  const KEY_LOOK = { ironkey: '#8a8c98', brasskey: '#e0b048' };
  // the items' icons on the items screen (pixel sprites, drawn at twice their size)
  const leaf = c => E.sprite(['...gg....', '..gGg..g.', '.gGgg.gG.', '.gg.ggGg.', '..g.gGg..', '...ggg...', '..bbbbb..', '..bBBBb..', '...bbb...'], { g: c, G: E.shade(c, .3), b: '#7a5a40', B: '#9a7a5a' });
  const ICONS = { herbG: leaf('#4aa04a'), herbR: leaf('#c04040'), herbGG: leaf('#6ac05a'), herbGR: leaf('#c0a040'),
    ammo: E.sprite(['.y.y.y...', '.Y.Y.Y...', '.c.c.c...', '.c.c.c...', 'ooooooo..', 'oOOOOOo..', 'oOOOOOo..', 'ooooooo..'], { y: '#ffe090', Y: '#d8b048', c: '#b88a30', o: '#3a4628', O: '#5a6a3a' }),
    ironkey: E.sprite(['.kkk.....', 'k...k....', 'k...k....', '.kkkkkkkk', '.....k.k.', '.....k...'], { k: KEY_LOOK.ironkey }), brasskey: E.sprite(['.kkk.....', 'k...k....', 'k...k....', '.kkkkkkkk', '.....k.k.', '.....k...'], { k: KEY_LOOK.brasskey }),
    crank: E.sprite(['mm.......', 'mm.......', '.m.......', '.mmmmmm..', '......m..', '......mww', '.......ww'], { m: '#8a8a94', w: '#6a4a30' }) };
  // things drawn by code for this slice (the engine's kinds are in its manual): a potted herb, a box of bullets, the
  // crank, its socket in the library
  W3.THINGS.herb = (p, t) => { const c = t.color || '#4aa04a'; p.box(0, 0, 2.2, 6, 6, 4.4, '#7a5a40').box(0, 0, 4.6, 6.4, 6.4, .8, '#5a3e2a'); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; p.cone(Math.cos(a) * .6, Math.sin(a) * .6, 4.6, Math.cos(a) * 3.4, Math.sin(a) * 3.4, 10 + (k & 1) * 2, 1.6, E.shade(c, (k & 1) * .15)); } };
  W3.THINGS.ammo = (p) => { p.box(0, 0, 1.8, 7, 5, 3.6, '#5a6a3a').box(0, 0, 3.7, 7.2, 5.2, .4, '#3a4628').box(-1, -2.6, 2, 3, .3, 1.4, '#e8d890'); for (let k = 0; k < 3; k++) p.tube(-2 + k * 2, 3, 3.6, -2 + k * 2, 3, 5.4, .55, '#d8b048'); };
  W3.THINGS.crank = (p) => { p.tube(-4, 0, 1, 3, 0, 1, .7, '#6a6a74').tube(3, 0, 1, 3, 0, 5, .7, '#6a6a74').tube(3, 0, 5, 6, 0, 5, .9, '#4a3020').box(-4.4, 0, 1, 1.4, 1.4, 1.4, '#3a3a42'); };
  W3.THINGS.socket = (p, t) => {   // a cast plate on a post, a square hole; with the crank in it, the handle turns
    p.box(0, 0, 6, 3, 3, 12, '#3a3640').box(0, 0, 13, 9, 3, 9, '#5a5664').ball(0, -1.6, 13, 1.8, .6, 1.8, '#18161c');
    if (t.on) { const a = t.turn || 0; p.tube(0, -1.8, 13, 0, -5, 13, .6, '#6a6a74').tube(0, -5, 13, Math.cos(a) * 4, -5, 13 + Math.sin(a) * 4, .6, '#6a6a74').ball(Math.cos(a) * 4, -6, 13 + Math.sin(a) * 4, 1, 1, 1, '#4a3020'); }
  };

  /* ---- THE CAST: the hero, the dead of the house, its dogs, and what waits in the gallery ---- */
  const HERO_COLORS = { cloth: '#3a4e6a', pants: '#2a2c36', boot: '#1e1c22', belt: '#4a3a2a', hair: '#3a2418', skin: '#e0b090', glove: '#2a2a30', metal: '#4a4c56', metalDk: '#2a2a30', hilt: '#3a3a40' };
  const ZOMBIE_COLORS = [
    { skin: '#8a9a7e', hair: '#2e2a26', cloth: '#5a4a52', pants: '#33302e', boot: '#262220', belt: '#4a3a2a' },
    { skin: '#9a9488', hair: '#4a3e30', cloth: '#6a5a44', pants: '#2e2e34', boot: '#24221e', belt: '#3a3026' },
    { skin: '#7e8a7a', hair: '#1e1c1a', cloth: '#3e4a5a', pants: '#2a2826', boot: '#201e1c', belt: '#3a3026' }];
  const BOSS_COLORS = { skin: '#b8a090', hair: '#2a2024', cloth: '#5a1e22', pants: '#2a2228', boot: '#1e1a1c', belt: '#3a2a22', eye: '#ff3a2a' };
  const WALK = 26, RUN = 58, HP = 100, CLIP = 12, GUN_DMG = 10, HEAD_DMG = 26, KNIFE_DMG = 7, AIM_A = [-.42, 0, .42];
  const KIND = {
    zombie: { hp: 46, speed: [12, 17], r: 5, half: 8, head: 27 },
    dog: { hp: 24, speed: [84, 92], r: 4.5, half: 0, head: 11 },
    boss: { hp: 260, speed: [22, 22], r: 9, half: 15, head: 48 }
  };

  /* ---- SOUNDS AND MUSIC (the step sequencer's format: original songs) ---- */
  const SOUNDS = {
    gun: [{ wave: 'noise', freq: 2400, to: 300, dur: .16, vol: .5 }, { wave: 'square', freq: 220, to: 70, dur: .1, vol: .3 }],
    dry: { wave: 'square', freq: 1800, dur: .02, vol: .12 }, reload: [{ wave: 'square', freq: 900, dur: .03, vol: .14 }, { wave: 'noise', freq: 3000, dur: .05, vol: .12, delay: .12 }],
    moan: { wave: 'saw', freq: 92, to: 70, dur: .9, vol: .1, vib: [5, .08], filter: 'lowpass' }, bark: [{ wave: 'saw', freq: 420, to: 240, dur: .09, vol: .18 }, { wave: 'saw', freq: 400, to: 200, dur: .1, vol: .16, delay: .14 }],
    bite: [{ wave: 'noise', freq: 1200, to: 300, dur: .14, vol: .4 }, { wave: 'square', freq: 160, to: 60, dur: .12, vol: .25 }],
    crank: { wave: 'square', freq: 300, arp: [0, 0, 0, 0], step: .09, dur: .36, vol: .12, filter: 'lowpass' }, stab: { wave: 'noise', freq: 3200, to: 900, dur: .09, vol: .22 },
    roar: [{ wave: 'saw', freq: 120, to: 50, dur: 1.2, vol: .22, vib: [8, .15] }, { wave: 'noise', freq: 400, to: 100, dur: 1, vol: .2, filter: 'lowpass' }]
  };
  const HALL = { bpm: 56, steps: 4, tracks: [   // the halls: a low drone, a slow minor figure, a heartbeat
    { wave: 'triangle', vol: .3, notes: 'D2 - - - - - - - | D2 - - - - - - - | Bb1 - - - - - - - | A1 - - - - - - -' },
    { wave: 'pulse25', vol: .05, notes: '. . D4 . . F4 . . | E4 . . . . . . . | . . D4 . . Bb3 . . | A3 . . . C#4 . . .' },
    { wave: 'sine', vol: .06, notes: '. . . . . . A4 . | . . . . . . . . | . . . . . . G4 . | . . . . F4 . E4 .' },
    { wave: 'drums', vol: .05, notes: 'k k . . . . . . | k k . . . . . .' }] };
  const SAFE = { bpm: 64, steps: 3, tracks: [   // the foyer: the typewriter's quiet, a waltz in the dark
    { wave: 'triangle', vol: .24, notes: 'F2 C3 A3 | F2 C3 A3 | D2 A2 F3 | D2 A2 F3 | Bb1 F2 D3 | Bb1 F2 D3 | C2 G2 E3 | C2 G2 E3' },
    { wave: 'sine', vol: .1, notes: 'A4 - C5 | F5 - E5 | D5 - - | A4 - - | Bb4 - D5 | F5 - G5 | E5 - - | - - -' }] };
  const DREAD = { bpm: 118, steps: 4, tracks: [   // the gallery's fight
    { wave: 'saw', vol: .06, notes: 'D3 D3 . D3 Eb3 . D3 . | D3 D3 . D3 C3 . Bb2 . | D3 D3 . D3 Eb3 . F3 . | Eb3 . D3 . C#3 . . .' },
    { wave: 'triangle', vol: .3, notes: 'D2 . D2 . D2 . D2 . | Bb1 . Bb1 . Bb1 . Bb1 . | G1 . G1 . G1 . G1 . | A1 . A1 . A1 . A1 .' },
    { wave: 'drums', vol: .1, notes: 'k . . k s . . . | k . k . s . . h' }] };

  /* ---- THE STATE ---- */
  let world = null, flow = null, hero = null, H = null, lamp = null, muzzle = null, rnd = Math.random;
  let enemies = [], items = [], doors = {}, gate = null, socket = null, inv = null, box = null, flags = null, mode = 'play', menu = null, msg = null, song = null, ended = 0, scripted = false;
  const shots = [];
  BOOT.push(['The mansion', () => {
    for (const [k, v] of Object.entries(SOUNDS)) A.define(k, v);
    world = new W3(game, { level: LEVEL, torchLights: 4, torchShadows: 0, torchPower: 22, torchReach: 140, torchColor: '#ffb070', lights: 1, spots: 1,
      ambient: ['#3a3e56', '#141018', 1.6], fog: { color: '#040406', near: 40, far: 250 }, sky: '#020203', camera: { mode: 'zones', zones: ZONES, reticle: '#ff5a3a', lockRange: 170 },
      onDraw: () => { for (const e of enemies) if (e.type === 'dog') drawDog(e); for (const s of shots) world.pen.bar(s.x, s.y, s.z, s.x1, s.y1, s.z1, .5, .5, '#ffe8a8'); } });   // (the dogs and the shots' streaks, whichever scene draws the world)
    flow = world.flow();
  }]);

  /** a fresh game, or the one a save holds (s: its data): the wing as it stood, the hero where it saved */
  function reset(seed = 1, s = null) {
    world.reset(); rnd = E.rng(seed); flow = world.flow();
    flags = s ? JSON.parse(JSON.stringify(s.flags)) : { taken: [], dead: [], open: [], crank: false, boss: false };
    const st = world.marks.start[0], at = s ? s.at : [st.x, st.y, -PI / 2];
    hero = world.hero({ x: at[0], y: at[1], r: 4.5, rig: new E.Humanoid({ weapon: s && !s.gun ? 'sword' : 'gun', bladeLen: 5, hair: 'long', colors: HERO_COLORS, speedRef: 60 }) }); hero.facing = at[2];
    H = { hp: s ? s.hp : HP, clip: s ? s.clip : CLIP, gun: s ? s.gun : true, aim: false, aimLv: 0, cool: 0, fireT: 0, reloadT: 0, hurtT: 0, grabbed: null, grabT: 0, shake: 0, stun: 0, crankT: 0, dead: false, deadT: 0, inv: 0, knife: null, room: roomAt(at[0], at[1]) || 'foyer', shots: 0 };
    inv = rpg.inventory({ slots: 6 }); box = rpg.inventory({ slots: 40 });
    for (const [id, n] of (s ? s.inv : [['ammo', 18], ['herbG', 1]])) inv.add(id, n);
    for (const [id, n] of (s ? s.box : [])) box.add(id, n);
    if (!lamp) { lamp = world.flashlight(hero, { power: 46, reach: 300, angle: .46, flicker: .35 }); muzzle = world.light({ color: '#ffd090', reach: 160, power: 0 }); }
    lamp.actor = hero; lamp.on = true;
    // the doors, the grille, the socket, the save room's things, what is left to take, and who is still about
    doors = {}; for (const d of DOORS) doors[d.id] = world.thing('door', d.x, d.y, 0, { yaw: d.yaw || 0, w: 30, h: 40, swing: true, color: '#4a2c1c', frame: '#3a3036', locked: flags.open.includes(d.id) ? null : d.locked || null, solid: true, data: { id: d.id } });
    if (flags.boss) doors.exit.locked = null;
    gate = world.thing('door', 44 * T, 4.5 * T, 0, { w: 30, h: 36, color: '#3a3a44', frame: '#3a3036', solid: !flags.crank, open: flags.crank ? 1 : 0, data: { id: 'gate' } });
    const sk = world.marks.socket[0]; socket = world.thing('socket', sk.x, sk.y, 0, { yaw: PI / 2, on: flags.crank, turn: 0, solid: [8, 6, 16] });
    world.thing('typewriter', world.marks.typewriter[0].x, world.marks.typewriter[0].y, 0, { yaw: PI / 2, solid: [22, 13, 16] });
    world.thing('trunk', world.marks.trunk[0].x, world.marks.trunk[0].y, 0, { yaw: -PI / 2, solid: [24, 12, 12] });
    items = [];
    const item = (mark, id, n, kind, o = {}) => (world.marks[mark] || []).forEach((m, i) => {
      const key = mark + i; if (flags.taken.includes(key)) return;
      items.push(world.thing(kind, m.x, m.y, m.z, Object.assign({ data: { key, item: id, n } }, o)));
    });
    item('herbG', 'herbG', 1, 'herb'); item('herbR', 'herbR', 1, 'herb', { color: '#c04040' }); item('ammo', 'ammo', 10, 'ammo'); item('crank', 'crank', 1, 'crank', { yaw: .6 });
    item('ironkey', 'ironkey', 1, 'key', { color: KEY_LOOK.ironkey, spin: .3, bob: 1, z: 3 }); item('brasskey', 'brasskey', 1, 'key', { color: KEY_LOOK.brasskey, spin: .3, bob: 1, z: 3 });
    enemies = [];
    const spawn = (type, m, i) => {
      const id = type + i; if (flags.dead.includes(id)) return; const k = KIND[type];
      const e = type === 'dog' ? world.mob({ x: m.x, y: m.y, r: k.r, half: 0, mass: 1.2, visible: false, pose: false })
        : world.mob({ x: m.x, y: m.y, r: k.r, half: k.half, mass: type === 'boss' ? 8 : 1.4, rig: type === 'boss' ? new E.Humanoid({ size: 1.8, build: 'bulky', weapon: null, hunch: .35, lean: .15, hair: 'long', sleeves: 'long', colors: BOSS_COLORS, eyeGlow: '#ff3a2a', speedRef: 40 })
          : new E.Humanoid({ weapon: null, hunch: .3 + rnd() * .2, lean: .12, stride: 5, speedRef: 30, colors: ZOMBIE_COLORS[(rnd() * ZOMBIE_COLORS.length) | 0], eyeGlow: '#d8e0a0' }) });
      Object.assign(e, { id, type, k, hp: k.hp, max: k.hp, room: roomAt(m.x, m.y), state: 'idle', t: rnd() * 2, stun: 0, speed: k.speed[0] + rnd() * (k.speed[1] - k.speed[0]), facing: rnd() * TAU, head: k.head, phase: rnd() * TAU, px: m.x, py: m.y, moan: 2 + rnd() * 6, atk: null });
      enemies.push(e);
    };
    for (const t of ['zombie', 'dog', 'boss']) (world.marks[t] || []).forEach((m, i) => spawn(t, m, i));
    shots.length = 0; mode = 'play'; menu = null; msg = null; ended = 0; song = null;
    world.camera.set('view'); world.camera.set('zones'); world.camera.follow(hero);
  }
  const say = (text, t = 2.6) => { msg = { text, t }; };
  const alive = () => enemies.filter(e => e.alive && e.hp > 0);
  const awake = () => alive().filter(e => e.room === H.room);

  /* ---- THE HERO: the controls (ctl: move, the buttons this step), then what it does ---- */
  function heroStep(dt, ctl) {
    const h = hero, S = H;
    S.cool -= dt; S.fireT -= dt; S.hurtT -= dt; S.inv -= dt; h.flash -= dt;
    S.room = roomAt(h.x, h.y) || S.room;
    if (S.dead) { S.deadT += dt; h.vx = h.vy = 0; h.anim = { pose: 'die' }; return; }
    if (S.grabbed) {   // held by the dead: tap the button to shake free; a bite halfway
      const z = S.grabbed; S.grabT -= dt * (ctl.pressed('act') ? 6 : 1); h.vx = h.vy = 0; h.facing = Math.atan2(z.y - h.y, z.x - h.x);
      if (!z.bit && S.grabT < .55) { z.bit = true; hurtHero(z.type === 'boss' ? 30 : 16, h.facing + PI, true); A.sfx('bite'); }
      if (S.grabT <= 0 || !z.alive) { S.grabbed = null; const a = Math.atan2(h.y - z.y, h.x - z.x); h.push(Math.cos(a) * 140, Math.sin(a) * 140); z.push(-Math.cos(a) * 90, -Math.sin(a) * 90); z.state = 'recoil'; z.t = 1; }
      h.anim = { hurt: true, expr: 'wince', point: false };
      return;
    }
    if (S.crankT > 0) {   // turning the crank: the grille rises
      S.crankT -= dt; socket.turn = (socket.turn || 0) + dt * 6; gate.open = clamp(1 - S.crankT / 2.2, 0, 1); h.vx = h.vy = 0; h.anim = { pose: 'cast' };
      if (S.crankT <= 0) { world.setSolid(gate, false); flags.crank = true; say('The grille rose. Something gleams behind it.'); A.sfx('secret'); }
      return;
    }
    if (S.hurtT > 0) { h.vx = approach(h.vx, 0, 400 * dt); h.vy = approach(h.vy, 0, 400 * dt); h.anim = { hurt: true, expr: 'wince' }; return; }
    // aim: held, it stands still and locks on what is in front; up and down aim high and low, left and right pick another
    const wasAim = S.aim; S.aim = ctl.down('aim') && S.reloadT <= 0;
    const cam = world.camera, targets = awake();
    if (S.aim && !wasAim) { S.aimLv = 0; const t = cam.lock(h, targets); if (t && t.type === 'dog') S.aimLv = -1; }
    if (!S.aim && wasAim) cam.unlock();
    if (S.reloadT > 0) { S.reloadT -= dt; if (S.reloadT <= 0) { const n = Math.min(CLIP - S.clip, inv.count('ammo')); inv.remove('ammo', n); S.clip += n; } }
    if (S.aim) {
      h.vx = approach(h.vx, 0, 600 * dt); h.vy = approach(h.vy, 0, 600 * dt);
      if (ctl.pressed('up')) S.aimLv = Math.min(1, S.aimLv + 1); if (ctl.pressed('down')) S.aimLv = Math.max(-1, S.aimLv - 1);
      const L = cam.lockOn;
      if (L) { if (ctl.pressed('left')) cam.cycle(targets, -1); if (ctl.pressed('right')) cam.cycle(targets, 1); const T2 = cam.lockOn; h.facing = E.approachAng(h.facing, Math.atan2(T2.y - h.y, T2.x - h.x), dt * 9); }
      else { if (!cam.lock(h, targets)) h.facing += (ctl.move[0] ? Math.sign(ctl.move[0]) : 0) * 2.6 * dt; }
      if (ctl.pressed('act') && S.fireT <= 0) { ctl.use('act'); S.gun ? fire() : slash(); }
    } else {
      // walk or run: the camera's way, or tank controls (Settings)
      const mv = ctl.move, ml = Math.hypot(mv[0], mv[1]), sp = (ctl.down('run') ? RUN : WALK) * (S.hp <= 33 ? .7 : 1), acc = 500 * dt;
      h.vx = approach(h.vx, mv[0] * sp, acc); h.vy = approach(h.vy, mv[1] * sp, acc);
      if (ml > .1 && !ctl.tank) h.facing = E.approachAng(h.facing, Math.atan2(mv[1], mv[0]), dt * 9);
      if (ctl.pressed('swap')) { ctl.use('swap'); S.gun = !S.gun; h.rig.o.weapon = S.gun ? 'gun' : 'sword'; h.rig.o.bladeLen = 5; A.sfx('select'); say(S.gun ? 'Handgun.' : 'Knife.', 1); }
      if (ctl.pressed('act')) { ctl.use('act'); check(); }
    }
    if (S.knife) { S.knife.update(dt); if (S.knife.state && S.knife.phase === 'active') S.knife.hits(targets, e => Math.abs(e.z - h.z) < 24 && E.inArc(h, h.facing, e, 22 + e.k.r, .9), e => hurt(e, KNIFE_DMG, h.facing, 50)); if (!S.knife.busy) S.knife = null; }
    h.anim = { point: S.aim && S.gun, aim: S.aim ? AIM_A[S.aimLv + 1] : 0, attack: S.knife && S.knife.state, hurt: false, crouch: S.aim && S.aimLv < 0 && !S.gun, expr: S.hp <= 33 ? 'wince' : null };
  }
  /** the handgun: a shot along the aim (world.ray), the first body it meets hurt; a high shot at a head hurts more */
  function fire() {
    const h = hero, S = H;
    if (S.clip <= 0) { if (inv.count('ammo') > 0) { S.reloadT = 1.1; S.aim = false; world.camera.unlock(); A.sfx('reload'); } else { A.sfx('dry'); say('Out of bullets.', 1.2); } S.fireT = .4; return; }
    S.clip--; S.fireT = .42; S.shots++; A.sfx('gun'); game.shake(1.5);
    const a = h.facing, va = AIM_A[S.aimLv + 1], ca = Math.cos(va), x = h.x + Math.cos(a) * 7, y = h.y + Math.sin(a) * 7, z = h.z + 19;
    const hit = world.ray(x, y, z, Math.cos(a) * ca, Math.sin(a) * ca, Math.sin(va), 300, { skip: h });
    shots.push({ x, y, z, x1: hit ? hit.x : x + Math.cos(a) * ca * 300, y1: hit ? hit.y : y + Math.sin(a) * ca * 300, z1: hit ? hit.z : z + Math.sin(va) * 300, t: .06 });
    muzzle.x = x; muzzle.y = y; muzzle.z = z; muzzle.power = 26; muzzle.on = true; P.sparks(x, y, z, 3, a, { color: '#ffe0a0' });
    if (!hit) return;
    const e = hit.actor && enemies.includes(hit.actor) ? hit.actor : null;
    if (e && e.alive) { const head = e.type !== 'dog' && hit.z > e.z + e.head * .8; hurt(e, head ? HEAD_DMG : GUN_DMG, a, e.type === 'boss' ? 20 : 70); if (head) P.bits(hit.x, hit.y, hit.z, 6, ['#6a1a1a', '#9a2a2a', '#c8b0a0']); }
    else { P.sparks(hit.x, hit.y, hit.z, 5, Math.atan2(hit.ny, hit.nx)); P.dust(hit.x, hit.y, hit.z, 2); }
  }
  function slash() { H.knife = new E.Attack('slash', { reach: 5 }); H.knife.start(); H.fireT = .45; A.sfx('stab'); }
  function hurtHero(dmg, ang, held = false) {
    const h = hero, S = H; if (S.dead || (S.inv > 0 && !held)) return false;
    S.hp -= dmg; S.inv = .6; h.flash = .08; if (!held) { S.hurtT = .35; h.push(Math.cos(ang) * 110, Math.sin(ang) * 110); }
    game.shake(3); game.flash('#7a0000', .12, .35); A.sfx('hurt'); P.bits(h.x, h.y, h.z + 16, 6, ['#7a1010', '#a02020']);
    world.camera.unlock(); S.aim = false;
    if (S.hp <= 0) { S.hp = 0; S.dead = true; S.deadT = 0; S.grabbed = null; A.music(null); A.sfx('die'); }
    return true;
  }
  function hurt(e, dmg, ang, kb) {
    e.hp -= dmg; e.flash = .06; e.stun = e.type === 'boss' ? (e.hp % 60 < dmg ? .7 : 0) : .35; e.push(Math.cos(ang) * kb, Math.sin(ang) * kb);
    if (e.state === 'lunge' || e.state === 'pounce') e.state = 'chase';
    P.bits(e.x, e.y, e.z + e.head * .6, 4, ['#5a1414', '#8a2020']); A.sfx('hit');
    if (e.hp > 0) return;
    e.alive = false; flags.dead.push(e.id); e.setSolid(false); e.deadT = 0; A.sfx(e.type === 'dog' ? 'bark' : 'moan');
    if (world.camera.lockOn === e) world.camera.unlock();
    if (e.type === 'boss') { flags.boss = true; doors.exit.locked = null; game.flash('#ffffff', .3, .5); A.sfx('roar'); say('It is over. The way out is open.', 4); }
  }
  /** J in front of something: a door, a thing to take, the item box, the typewriter, the socket */
  function check() {
    const t = world.reach(hero, 16); if (!t) return;
    const d = t.data || {};
    if (t.kind === 'door' && d.id === 'gate') { say(flags.crank ? 'The grille is up.' : 'An iron grille. A key gleams behind it, out of reach.'); return; }
    if (t.kind === 'door') {
      if (d.id === 'exit') { if (t.locked) { say('Sealed with heavy chains. Something holds them from the far side.'); return; } win(); return; }
      if (t.locked) {
        const was = t.locked, r = world.unlock(t, inv);
        if (r === 'locked') { say('It is locked. ' + (was === 'ironkey' ? 'An iron lock.' : 'A brass lock.')); A.sfx('bump'); return; }
        flags.open.push(d.id); say('You used the ' + rpg.items[was].name.toUpperCase() + '.'); A.sfx('key'); return;
      }
      if (world.through(t, hero, { then: () => { autosave(); } })) A.sfx('door');
      return;
    }
    if (d.item) {
      if (!inv.add(d.item, d.n)) { say('No room. Leave something in the item box.'); A.sfx('bump'); return; }
      flags.taken.push(d.key); world.remove(t); items.splice(items.indexOf(t), 1); A.sfx(d.item.endsWith('key') ? 'key' : 'pickup');
      say('Took the ' + rpg.items[d.item].name.toUpperCase() + (d.n > 1 ? ' x' + d.n : '') + '.'); return;
    }
    if (t.kind === 'trunk') { openBox(); return; }
    if (t.kind === 'typewriter') { saveGame(); return; }
    if (t === socket) {
      if (flags.crank) { say('The crank is fixed in place.'); return; }
      if (!inv.has('crank')) { say('A mechanism with a square socket. A crank would fit it.'); return; }
      inv.remove('crank'); socket.on = true; H.crankT = 2.2; A.sfx('crank'); return;
    }
  }

  /* ---- THE DEAD, THE DOGS, WHAT WAITS: each wakes when you are in its room ---- */
  const _d = [0, 0];
  function towards(e, out) {   // straight at the hero when it sees it, else down the flow field (round the furniture)
    const dx = hero.x - e.x, dy = hero.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d < 60 || world.clear(e.x, e.y, e.z + 10, hero.x, hero.y, hero.z + 10)) { out[0] = dx / d; out[1] = dy / d; return out; }
    if (flow.dir(e.x, e.y, out)) return out; out[0] = dx / d; out[1] = dy / d; return out;
  }
  function zombie(e, dt) {
    const h = hero, dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy), toH = Math.atan2(dy, dx), boss = e.type === 'boss';
    let mx = 0, my = 0, sp = e.speed * (boss && e.hp < e.max / 2 ? 1.35 : 1);
    e.t -= dt; e.moan -= dt;
    if (e.moan < 0 && !boss) { e.moan = 5 + rnd() * 6; A.sfx('moan'); }
    if (e.stun > 0) e.state = e.state === 'grab' ? 'grab' : 'chase';
    else if (e.state === 'idle') { if (H.room === e.room && !H.dead) e.state = 'chase'; }
    else if (e.state === 'chase') {
      towards(e, _d); mx = _d[0]; my = _d[1]; e.facing = E.approachAng(e.facing, Math.atan2(my, mx), dt * (boss ? 3 : 2));
      if (H.room !== e.room) e.state = 'idle';
      else if (boss && d > 70 && d < 170 && e.t < 0 && world.clear(e.x, e.y, e.z + 20, h.x, h.y, h.z + 10)) { e.state = 'wind'; e.t = .6; A.sfx('roar'); }
      else if (d < (boss ? 30 : 14) && e.t < 0 && !H.dead && !H.grabbed) { e.state = 'lunge'; e.t = boss ? .55 : .5; if (boss) { e.atk = new E.Attack('haymaker', { reach: 9, hold: .2 }); e.atk.start(); } }
    }
    else if (e.state === 'lunge') {   // arms out, a lean, then the grab (the boss: a swing)
      e.facing = E.approachAng(e.facing, toH, dt * 3); if (!boss) { mx = Math.cos(e.facing) * .6; my = Math.sin(e.facing) * .6; }
      if (e.atk) e.atk.update(dt);
      if (e.t <= 0) {
        const reach = boss ? 34 : 12, near = d < reach + 4 && Math.abs(h.z - e.z) < 12 && Math.abs(E.angDiff(e.facing, toH)) < 1;
        if (near && !H.dead && !H.grabbed && H.crankT <= 0 && !world.passing) { if (boss) { hurtHero(26, toH); h.push(Math.cos(toH) * 120, Math.sin(toH) * 120); } else { H.grabbed = e; H.grabT = 1.25; e.bit = false; e.state = 'grab'; } }
        if (e.state === 'lunge') { e.state = 'recoil'; e.t = boss ? .8 : .9; }
      }
    }
    else if (e.state === 'grab') { e.facing = toH; if (H.grabbed !== e) { e.state = 'recoil'; e.t = 1; } }
    else if (e.state === 'wind') { e.facing = E.approachAng(e.facing, toH, dt * 4); if (e.t <= 0) { e.state = 'rush'; e.t = .7; } }
    else if (e.state === 'rush') {   // the boss's charge: straight on, a blow to whatever is in the way
      mx = Math.cos(e.facing); my = Math.sin(e.facing); sp = 150;
      if (d < 22 && !H.dead && !world.passing) { hurtHero(30, e.facing); h.push(Math.cos(e.facing) * 160, Math.sin(e.facing) * 160); e.t = 0; }
      if (e.t <= 0) { e.state = 'recoil'; e.t = 1; }
    }
    else if (e.state === 'recoil') { if (e.t <= 0) { e.state = 'chase'; e.t = boss ? 2 + rnd() * 2 : .4 + rnd() * .6; e.atk = null; } }
    if (e.atk && !e.atk.busy) e.atk = null;
    const acc = (e.stun > 0 ? 200 : 260) * dt;
    e.vx = approach(e.vx, e.stun > 0 ? 0 : mx * sp, acc); e.vy = approach(e.vy, e.stun > 0 ? 0 : my * sp, acc);
    e.stun -= dt; e.flash -= dt;
    e.anim = { pose: e.state === 'chase' || e.state === 'lunge' || e.state === 'grab' ? (boss ? null : 'cast') : null, hurt: e.stun > 0, attack: e.atk && e.atk.state, expr: 'angry', dash: e.state === 'rush' };
  }
  function dog(e, dt) {
    const h = hero, dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1, toH = Math.atan2(dy, dx);
    e.t -= dt; e.phase += dt * Math.hypot(e.vx, e.vy) * .16; e.px = e.x; e.py = e.y;
    let mx = 0, my = 0;
    if (e.state === 'idle') { if (H.room === e.room && !H.dead) { e.state = 'run'; A.sfx('bark'); } }
    else if (e.state === 'run') {   // in, weaving
      towards(e, _d); const w = Math.sin(world.time * 3 + e.phase) * .5; mx = _d[0] - _d[1] * w; my = _d[1] + _d[0] * w; e.facing = E.approachAng(e.facing, Math.atan2(my, mx), dt * 8);
      if (H.room !== e.room) e.state = 'idle';
      else if (d < 38 && e.grounded && e.t < 0 && !world.passing) { e.state = 'pounce'; e.t = .5; e.vz = 120; e.vx = dx / d * (d + 4) / .5; e.vy = dy / d * (d + 4) / .5; e.facing = toH; A.sfx('bark'); }
    }
    else if (e.state === 'pounce') {
      if (d < e.r + 7 && Math.abs(h.z - e.z) < 18 && !H.dead) { hurtHero(10, toH); e.state = 'off'; e.t = .9; e.vx = -dx / d * 70; e.vy = -dy / d * 70; A.sfx('bite'); }
      else if (e.t < .1 && e.grounded) { e.state = 'off'; e.t = .6; }
    }
    else if (e.state === 'off') { mx = -dx / d; my = -dy / d; const s = Math.sign(Math.sin(e.phase)) || 1; mx -= my * s; my += mx * s; e.facing = E.approachAng(e.facing, Math.atan2(my, mx), dt * 6); if (e.t <= 0) { e.state = 'run'; e.t = .3 + rnd() * .5; } }
    if (e.state !== 'pounce') { const acc = (e.stun > 0 ? 300 : 700) * dt; e.vx = approach(e.vx, e.stun > 0 ? 0 : mx * e.speed, acc); e.vy = approach(e.vy, e.stun > 0 ? 0 : my * e.speed, acc); }
    e.stun -= dt; e.flash -= dt;
  }

  /* ---- ONE STEP: the rules, then the world ---- */
  function step(dt, ctl) {
    if (msg && (msg.t -= dt) <= 0) msg = null;
    if (world.passing) { world.step(dt); return; }   // (a door between rooms: everything waits)
    flow.to(hero.x, hero.y);
    heroStep(dt, ctl);
    for (const e of enemies) {
      if (!e.alive) { e.deadT += dt; e.vx = approach(e.vx, 0, 300 * dt); e.vy = approach(e.vy, 0, 300 * dt); e.anim = { pose: 'die' }; continue; }
      if (e.type === 'dog') dog(e, dt); else zombie(e, dt);
    }
    for (let i = shots.length - 1; i >= 0; i--) if ((shots[i].t -= dt) <= 0) shots.splice(i, 1);
    if (muzzle.on && (muzzle.power -= 400 * dt) <= 0) muzzle.on = false;
    if (H.dead && H.deadT > 2.4 && !ended) { ended = 1; game.go('over', { from: 'horror', world, lines: ['YOU DIED', flags.taken.length + ' THINGS FOUND   ' + flags.dead.length + ' OF ' + enemies.length + ' PUT DOWN'] }); }
    world.step(dt);
  }
  function win() {
    if (ended) return; ended = 1; if (scripted) return; A.music('victory');
    game.after(1.2, () => game.go('over', { from: 'horror', world, won: true, title: 'ESCAPED', lines: ['THE WING IS QUIET', flags.dead.length + ' PUT DOWN   ' + H.shots + ' SHOTS FIRED'] }));
  }
  /* ---- SAVES: the typewriter writes to the 2D engine's slots (game.saves); a door passed writes the autosave ---- */
  const state = () => ({ data: { at: [hero.x, hero.y, hero.facing], hp: H.hp, clip: H.clip, gun: H.gun, inv: inv.list().map(s => [s.id, s.n]), box: box.list().map(s => [s.id, s.n]), flags }, place: (H.room || 'foyer').toUpperCase(), level: null });
  function saveGame() { game.saves.write = state; game.saves.read = s => reset(1, s.data); if (!game.saves.show('save')) game.saves.save(0); }
  function autosave() { if (!H.dead && !scripted) { game.saves.write = state; game.saves.autosave(); } }   // (not in the proof or the bot)

  /* ---- THE ITEMS SCREEN (I) and THE ITEM BOX: the world stands still while they are open ---- */
  const status = () => H.hp > 66 ? ['FINE', '#5ad070'] : H.hp > 33 ? ['CAUTION', '#e8c040'] : ['DANGER', '#e8483a'];
  function openItems() { mode = 'items'; menu = { i: 0, pick: null, sub: null }; A.sfx('select'); world.camera.unlock(); H.aim = false; }
  function openBox() { mode = 'box'; menu = { side: 0, i: 0 }; A.sfx('door'); }
  function useItem(id) {
    const it = rpg.items[id];
    if (it.heal) { if (H.hp >= HP) { say('You are fine.'); return; } inv.remove(id); H.hp = Math.min(HP, H.hp + it.heal); A.sfx('heal'); say('You feel better.'); return; }
    say(it.info);
  }
  function itemsStep() {
    const I = game.input, M = menu, list = inv.list(), n = 6;
    if (I.pressed('items') || I.pressed('cancel')) { I.consumeAll(); if (M.sub) M.sub = null; else { mode = 'play'; menu = null; } return; }
    if (M.sub) {   // USE, MIX, INFO
      if (I.pressed('up')) M.sub.i = (M.sub.i + 2) % 3; if (I.pressed('down')) M.sub.i = (M.sub.i + 1) % 3;
      if (I.pressed('act') || I.pressed('confirm')) { I.consumeAll(); const s = list[M.i], c = M.sub.i; M.sub = null; if (!s) return; if (c === 0) useItem(s.id); else if (c === 1) { M.pick = M.i; say('Mix it with what?', 2); } else say(s.item.info); A.sfx('confirm'); }
      return;
    }
    if (I.pressed('left')) M.i = (M.i + n - 1) % n; if (I.pressed('right')) M.i = (M.i + 1) % n;
    if (I.pressed('up') || I.pressed('down')) M.i = (M.i + 3) % n;
    if (I.pressed('act') || I.pressed('confirm')) {
      I.consumeAll(); const s = list[M.i]; if (!s) return;
      if (M.pick !== null) { const a = list[M.pick], r = a && M.pick !== M.i && MIX[a.id + '+' + s.id]; M.pick = null; if (!r) { say('They do not mix.'); A.sfx('bump'); return; } inv.remove(a.id); inv.remove(s.id); inv.add(r); A.sfx('heal'); say('Mixed: ' + rpg.items[r].name + '.'); return; }
      M.sub = { i: 0 }; A.sfx('select');
    }
  }
  function boxStep() {
    const I = game.input, M = menu, lists = [inv.list(), box.list()];
    if (I.pressed('cancel') || I.pressed('items')) { I.consumeAll(); mode = 'play'; menu = null; A.sfx('door'); return; }
    if (I.pressed('left') || I.pressed('right')) { M.side ^= 1; M.i = 0; A.sfx('select'); }
    const L = lists[M.side], cap = M.side ? Math.max(1, L.length) : 6;
    if (I.pressed('up')) M.i = (M.i + cap - 1) % cap; if (I.pressed('down')) M.i = (M.i + 1) % cap;
    if (I.pressed('act') || I.pressed('confirm')) {
      I.consumeAll(); const s = L[M.i]; if (!s) return;
      const from = M.side ? box : inv, to = M.side ? inv : box;
      if (!to.add(s.id, s.n)) { say('No room.'); A.sfx('bump'); return; }
      from.remove(s.id, s.n); A.sfx('pickup'); M.i = Math.max(0, Math.min(M.i, lists[M.side].length - 2));
    }
  }

  /* ---- THE DOGS DRAWN WITH THE PEN: a body, a head, four legs at a gallop (part way between steps) ---- */
  function drawDog(e) {
    const k = game.paused ? 1 : clamp(game.alpha, 0, 1), x = lerp(e.px, e.x, k), y = lerp(e.py, e.y, k), z = e.z, pen = world.pen, run = Math.min(1, Math.hypot(e.vx, e.vy) / 60), ph = e.phase, dead = !e.alive;
    const c = '#4a3c36', dk = '#2e2622', raw = '#8a3a34';
    pen.at(x, y, z + (dead ? -3 : 0), e.facing); if (e.flash > 0) pen.flash = true;
    const bob = dead ? 0 : Math.abs(Math.sin(ph)) * 1.2 * run, tilt = dead ? 0 : Math.sin(ph) * .06 * run;
    pen.ball(0, 0, 9 + bob, 7.2, 3.2, 3.6, c).ball(3.2, 0, 10 + bob, 3.2, 3.4, 3.6, dk).ball(-1, 1.8, 9.6 + bob, 2.2, 1.2, 1.6, raw);
    const hz = 12.5 + bob + (dead ? -6 : 0) - tilt * 10;
    pen.ball(7.6, 0, hz, 2.8, 2.4, 2.4, c).cone(9.4, 0, hz - .6, 13, 0, hz - 1.4, 1.5, dk).cone(7, -1.4, hz + 1.4, 6.4, -1.8, hz + 4.4, .9, dk).cone(7, 1.4, hz + 1.4, 6.4, 1.8, hz + 4.4, .9, dk);
    pen.glow(9.2, -1.1, hz + .8, .45, '#ff3a2a').glow(9.2, 1.1, hz + .8, .45, '#ff3a2a');
    pen.tube(-6.6, 0, 10 + bob, -10, 0, 12 + bob + Math.sin(ph * 2) * 1.5, .8, dk);
    for (const [lx, ly, o] of [[4.6, -2, 0], [4.6, 2, PI], [-4.6, -2, PI * .6], [-4.6, 2, PI * 1.6]]) {
      const s = dead ? .4 : Math.sin(ph + o), fx = lx + s * 3.4 * run, fz = dead ? 2 : Math.max(0, Math.cos(ph + o)) * 2.4 * run;
      pen.tube(lx, ly, 8 + bob, (lx + fx) / 2 + 1, ly, 4 + fz, 1.1, c).tube((lx + fx) / 2 + 1, ly, 4 + fz, fx, ly, fz + .4, .8, dk);
    }
    pen.flash = false; pen.at();
  }

  /* ---- THE HUD: little in play (as in the games it follows): a message, the gun when aiming, the status in a corner;
   * the items screen and the item box over the picture ---- */
  function ecg(g, x, y, w, color, t) {   // a heartbeat line, faster as it gets worse
    const rate = H.hp > 66 ? 1.2 : H.hp > 33 ? 1.8 : 2.6;
    for (let i = 0; i < w; i++) { const u = (i / w + t * rate * .5) % 1, v = u > .42 && u < .46 ? -6 : u > .46 && u < .5 ? 5 : u > .5 && u < .53 ? -2 : 0; E.px.rect(g, x + i, y + v, 1, 1, color); }
  }
  function hud(g, r) {
    const [word, col] = status();
    if (mode === 'play') {
      E.font.text(g, word, 6, 6, col, { outline: '#000', font: 'tiny' }); ecg(g, 6, 18, 40, col, game.real);
      if (H.aim) E.font.text(g, (H.gun ? 'HANDGUN ' + H.clip + ' / ' + inv.count('ammo') : 'KNIFE') + (H.aimLv ? H.aimLv > 0 ? '  HIGH' : '  LOW' : ''), r.W - 6, 6, '#e8e0d0', { align: 'right', outline: '#000', font: 'tiny' });
      if (H.reloadT > 0) E.font.text(g, 'RELOADING', r.W - 6, 6, '#e8c040', { align: 'right', outline: '#000', font: 'tiny' });
      if (H.grabbed) E.font.text(g, (touch() ? 'TAP ACT' : 'TAP ' + game.input.label('act')) + ' TO SHAKE FREE', r.W / 2, r.H / 2 + 30, '#ff8a7a', { align: 'center', outline: '#000' });
    }
    // (the message: above the touch buttons on a phone)
    if (msg) { const w = Math.min(r.W - 20, 300), ta = game.input.touchArea(), y = ta && ta.y0 < r.H - 24 ? Math.min(r.H - 46, ta.y0 - 28) : r.H - 46; E.ui.box(g, (r.W - w) / 2, y, w, 22, { bg: '#08060a', border: '#5a5060' }); E.font.text(g, msg.text, r.W / 2, y + 7, '#e8e0d0', { align: 'center', outline: false, font: msg.text.length * 6 > w - 12 ? 'tiny' : undefined }); }
    if (mode === 'items') {
      const M = menu, list = inv.list(), w = Math.min(r.W - 16, 330), x0 = (r.W - w) / 2, y0 = Math.max(8, r.H / 2 - 90);
      g.save(); g.fillStyle = '#000'; g.globalAlpha = .7; g.fillRect(0, 0, r.bw, r.bh); g.restore(); g._c = null;
      E.ui.box(g, x0, y0, w, 160, { bg: '#0c0a10', border: '#6a6070' });
      E.font.text(g, 'CONDITION', x0 + 10, y0 + 8, '#a8a0b0', { font: 'tiny', outline: false }); E.font.text(g, word, x0 + 10, y0 + 20, col, { outline: false }); ecg(g, x0 + 10, y0 + 40, 90, col, game.real);
      E.font.text(g, H.gun ? 'HANDGUN  ' + H.clip + ' / ' + inv.count('ammo') : 'KNIFE', x0 + 10, y0 + 54, '#e8e0d0', { font: 'tiny', outline: false });
      for (let i = 0; i < 6; i++) {
        const s = list[i], cx = x0 + w - 186 + (i % 3) * 60, cy = y0 + 10 + Math.floor(i / 3) * 52, sel = i === M.i, pk = M.pick === i;
        E.ui.box(g, cx, cy, 54, 46, { bg: sel ? '#2a2234' : '#16121c', border: pk ? '#e8c040' : sel ? '#e8e0d0' : '#4a4250' });
        if (s) { E.px.sprite(g, ICONS[s.id], cx + 17, cy + 7, { scale: 2 }); if (s.n > 1) E.font.text(g, String(s.n), cx + 50, cy + 34, '#e8e0d0', { align: 'right', font: 'tiny', outline: '#000' }); }
      }
      const s = list[M.i]; E.font.text(g, s ? s.item.name : '', x0 + 10, y0 + 120, '#ffe0a0', { outline: false }); E.font.text(g, s ? s.item.info : '', x0 + 10, y0 + 134, '#c8c0d0', { font: 'tiny', outline: false });
      if (M.sub) { const sx = x0 + w - 186 + (M.i % 3) * 60 + 30, sy = y0 + 10 + Math.floor(M.i / 3) * 52 + 26; E.ui.box(g, sx, sy, 50, 40, { bg: '#08060a', border: '#e8e0d0' }); ['USE', 'MIX', 'INFO'].forEach((t, k) => E.font.text(g, (k === M.sub.i ? '▸' : ' ') + t, sx + 5, sy + 5 + k * 11, k === M.sub.i ? '#ffd36a' : '#e8e0d0', { font: 'tiny', outline: false })); }
    }
    if (mode === 'box') {
      const M = menu, w = Math.min(r.W - 16, 330), x0 = (r.W - w) / 2, y0 = Math.max(8, r.H / 2 - 90), L = [inv.list(), box.list()];
      g.save(); g.fillStyle = '#000'; g.globalAlpha = .7; g.fillRect(0, 0, r.bw, r.bh); g.restore(); g._c = null;
      ['YOURS', 'THE ITEM BOX'].forEach((t, side) => {
        const x = x0 + side * (w / 2 + 2), ww = w / 2 - 2; E.ui.box(g, x, y0, ww, 170, { bg: '#0c0a10', border: M.side === side ? '#e8e0d0' : '#4a4250' });
        E.font.text(g, t, x + 8, y0 + 7, '#a8a0b0', { font: 'tiny', outline: false });
        const rows = side ? Math.max(1, L[1].length) : 6;
        for (let i = 0; i < Math.min(rows, 12); i++) { const s = L[side][i], sel = M.side === side && M.i === i; E.font.text(g, (sel ? '▸ ' : '  ') + (s ? s.item.name + (s.n > 1 ? ' x' + s.n : '') : '-'), x + 6, y0 + 20 + i * 12, sel ? '#ffd36a' : '#e8e0d0', { font: 'tiny', outline: false }); }
      });
    }
  }

  /* ---- the controls this step: the stick by the player's setting (camera.steer), the buttons ---- */
  const KEYS = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
    act: ['KeyJ', 'Space', 'Mouse0', 'Pad0'], aim: ['KeyK', 'Mouse2', 'Pad6', 'Pad4'], run: ['ShiftLeft', 'ShiftRight', 'Pad1'], swap: ['KeyQ', 'Pad3'], items: ['KeyI', 'Tab', 'Pad2'],
    start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
  const TOUCH = ['items', 'run', 'aim', 'act'], TOUCH_LABELS = { items: 'ITEMS', run: 'RUN', aim: 'AIM', act: 'ACT' };
  const ctl = { move: [0, 0], tank: false, down: a => game.input.down(a), pressed: a => game.input.pressed(a), use: a => game.input.consume(a) };
  function controls(dt) { ctl.tank = world.camera.tank; world.camera.steer(hero, game.input.move(), H.aim || H.grabbed || H.dead ? 0 : dt, ctl.move); if (H.aim) ctl.move[0] = game.input.move()[0]; return ctl; }

  /** the proof: a scripted walk from the foyer, the stick held up across a cut (it keeps its way, as a player's does),
   *  to the west door (the door between rooms), then aim at the dead in the hall (the lock) and shoot; n steps of 1/120
   *  s. The world's hash with the camera's cuts and zone and the lock's target: the same on WebGPU, WebGL 2 and run
   *  again */
  function run(n = 600) {
    reset(3); scripted = true; const keys = new Set(), c = { move: [0, 0], tank: false, down: a => keys.has(a), pressed: a => keys.has('tap:' + a), use() {} }, door = doors.west;
    const toward = (x, y) => { const dx = x - hero.x, dy = y - hero.y, d = Math.hypot(dx, dy); c.move[0] = d > 3 ? dx / d : 0; c.move[1] = d > 3 ? dy / d : 0; return d; };
    let phase = 0;
    for (let i = 0; i < n; i++) {
      keys.clear(); keys.add('run'); c.move[0] = c.move[1] = 0;
      if (phase === 0) { world.camera.steer(hero, [0, -1], 1 / 120, c.move, { tank: false }); if (world.camera.cuts) phase = 1; }   // up, held across the foyer's cut
      else if (phase === 1) { if (toward(door.x + 15, door.y) < 4) { phase = 2; hero.facing = PI; } }
      else if (phase === 2) { keys.add('tap:act'); phase = 3; }
      else if (phase === 3) { if (!world.passing && H.room === 'west') phase = 4; }
      else { keys.add('aim'); if (i % 40 === 0) keys.add('tap:act'); }
      step(1 / 120, c);
    }
    scripted = false; const L = world.camera.lockOn, Z = world.camera.zone;
    return world.hash([H.hp, H.clip, world.camera.cuts, ZONES.indexOf(Z), L ? enemies.indexOf(L) : -1, phase, enemies.filter(e => !e.alive).length]);
  }

  /** the bot: plays the wing through to what waits in the gallery and fights it, by the game's own rules (each step a
   *  stick and buttons, as a player gives them): walk the flow field to each thing it needs, opening (and unlocking)
   *  the doors in its way, fight what comes (aim, shoot, low at dogs; the knife when the gun is dry), heal, crank the
   *  grille. Returns what it did: { reached, boss, won, rooms, took, opened, killed, shots, hp, steps, errors } */
  function bot(max = 120 * 60 * 12) {
    reset(5); scripted = true; const seen = new Set(['foyer']), keys = new Set(), c = { move: [0, 0], tank: false, down: a => keys.has(a), pressed: a => keys.has('tap:' + a), use: a => keys.delete('tap:' + a) };
    const GOALS = [['take', 'herbG1'], ['take', 'crank0'], ['take', 'ammo3'], ['take', 'ironkey0'], ['take', 'herbG0'], ['take', 'ammo1'], ['take', 'ammo2'], ['take', 'herbG2'],
      ['take', 'ammo0'], ['use', 'socket'], ['take', 'brasskey0'], ['take', 'herbR0'], ['fight', 'boss'], ['door', 'exit']];
    let g = 0, steps = 0, errors = 0, stuck = 0, lastD = 1e9, saved = false; const f = world.flow(), dt = 1 / 120;
    const where = () => { const [k, id] = GOALS[g] || []; if (k === 'door') return doors[id]; if (k === 'take') return items.find(t => t.data.key === id); if (k === 'use') return flags.crank ? null : socket; if (k === 'fight') return enemies.find(e => e.type === 'boss' && e.alive); return null; };
    const face = a => { hero.facing = E.approachAng(hero.facing, a, dt * 12); return Math.abs(E.angDiff(hero.facing, a)) < .1; };
    try {
      for (; steps < max && g < GOALS.length && !ended && !H.dead; steps++) {
        keys.clear(); c.move[0] = c.move[1] = 0;
        if (world.passing || H.crankT > 0) { step(dt, c); continue; }
        if (H.grabbed) { if (steps % 6 === 0) keys.add('tap:act'); step(dt, c); continue; }
        if (H.hp < 50) { const herb = inv.list().find(s => rpg.items[s.id].heal); if (herb) useItem(herb.id); }
        seen.add(H.room);
        // a threat in sight: aim (low at a dog), shoot; the knife up close when the gun is dry
        const foes = awake().filter(e => Math.hypot(e.x - hero.x, e.y - hero.y) < (e.type === 'boss' ? 200 : 120) && world.clear(hero.x, hero.y, hero.z + 16, e.x, e.y, e.z + 10));
        if (foes.length) {
          const dry = H.clip === 0 && !inv.count('ammo'); if (H.gun === dry) keys.add('tap:swap');
          const L = world.camera.lockOn, d = L ? Math.hypot(L.x - hero.x, L.y - hero.y) : 0;
          if (!H.gun && L && d > 18) { const a = Math.atan2(L.y - hero.y, L.x - hero.x); c.move[0] = Math.cos(a); c.move[1] = Math.sin(a); }
          else { keys.add('aim'); if (L && L.type === 'dog' && H.aimLv > -1) keys.add('tap:down'); if (L && L.type !== 'dog' && H.aimLv < 0) keys.add('tap:up');
            if (L && Math.abs(E.angDiff(hero.facing, Math.atan2(L.y - hero.y, L.x - hero.x))) < .12 && H.fireT <= 0) keys.add('tap:act'); }
          step(dt, c); continue;
        }
        const goal = GOALS[g], tgt = where(); if (!tgt) { g++; continue; }
        const d = Math.hypot(tgt.x - hero.x, tgt.y - hero.y);
        // there: face it and check it (a door: open it; the exit: out)
        if (goal[0] !== 'fight' && d < (goal[0] === 'door' ? 22 : 18)) {
          if (face(Math.atan2(tgt.y - hero.y, tgt.x - hero.x))) { keys.add('tap:act'); step(dt, c); if (goal[0] !== 'door' && (!items.includes(tgt) || flags.crank || H.crankT > 0)) g++; } else step(dt, c);
          if (inv.has('brasskey') && !saved) saved = game.saves.save(2, state());   // (a save on the way, loaded back at the end)
          continue;
        }
        // on the way: the flow field; a closed door in the way is opened (unlocked first, with the key it takes)
        f.to(tgt.x, tgt.y); const dir = f.dir(hero.x, hero.y, [0, 0]) || [(tgt.x - hero.x) / (d || 1), (tgt.y - hero.y) / (d || 1)];
        const door = world.reach(hero, 10, ['door']);
        if (door && door !== tgt && door !== gate && (door.x - hero.x) * dir[0] + (door.y - hero.y) * dir[1] > 0) { if (face(Math.atan2(door.y - hero.y, door.x - hero.x) + (door.yaw ? 0 : 0))) keys.add('tap:act'); step(dt, c); continue; }
        c.move[0] = dir[0]; c.move[1] = dir[1]; keys.add('run');
        stuck = d < lastD - .01 ? 0 : stuck + 1; lastD = d; if (stuck > 240) { c.move[0] = -dir[1]; c.move[1] = dir[0]; if (stuck > 330) stuck = 0; }
        step(dt, c);
      }
    } catch (e) { errors++; console.error(e); }
    scripted = false; const boss = enemies.find(e => e.type === 'boss');
    const r = { reached: seen.has('gallery'), boss: !!boss && !boss.alive, won: ended === 1 && !H.dead, dead: H.dead, rooms: [...seen], took: flags.taken.length, opened: flags.open.slice(), killed: flags.dead.length, shots: H.shots, hp: H.hp, goal: g, of: GOALS.length, steps, errors, saved };
    // the save made on the way, loaded back: the wing as it stood then (the crank turned, the brass key in hand, in the library)
    game.saves.read = s => reset(1, s.data); const back = saved && game.saves.load(2);
    if (back) r.loaded = { room: roomAt(hero.x, hero.y), crank: flags.crank, brass: inv.has('brasskey'), dead: flags.dead.length, gate: !gate.solid };
    game.saves.erase(2); ended = 0; return r;
  }

  return {
    view: 'iso', input: KEYS, pausable: true, touch: TOUCH, camera: { zoom: [.6, 2] },
    enter() {
      game.settings.define(W3.CONTROLS); reset(1); active = world; A.music(null); game.input.touchButtons(TOUCH, { labels: TOUCH_LABELS });
      game.saves.write = state; game.saves.read = s => reset(1, s.data);
      if (game.saves.any) { mode = 'intro'; menu = new E.Menu(game, ['CONTINUE', 'NEW GAME'], { y: 'center', onPick: i => { mode = 'play'; menu = null; if (i === 0) game.saves.load(game.saves.latest().slot); } }); }
      say('The east and west wings. Find a way out.', 3.5);
    },
    update(dt) {
      if (mode === 'intro') { menu.update(dt); world.step(0); return; }
      if (mode === 'items') { itemsStep(); world.step(0); return; }
      if (mode === 'box') { boxStep(); world.step(0); return; }
      if (game.input.pressed('items') && !H.dead && !world.passing && !H.grabbed) { openItems(); return; }
      step(dt, controls(dt));
      const want = H.room === 'gallery' && enemies.some(e => e.type === 'boss' && e.alive) ? DREAD : H.room === 'foyer' ? SAFE : HALL;
      if (want !== song && !ended && !H.dead) { song = want; A.music(want); }
      const inp = game.input; inp.touchSet('act', H.aim ? 'FIRE' : null, true);
    },
    draw(r) {
      world.draw(r);
      r.overlay(g => hud(g, r));
      if (mode === 'intro') menu.draw(r);
    },
    get world() { return world; }, get hero() { return hero; }, get state() { return H; }, get enemies() { return enemies; }, get inv() { return inv; }, get flags() { return flags; },
    get mode() { return mode; }, reset, run, bot, ZONES, ROOMS
  };
})();
scenes.horror = HORROR;
