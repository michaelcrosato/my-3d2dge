/* =====================================================================================
 * SLICE 12  METROIDVANIA  (Metroid, Super Metroid, Symphony of the Night). @modules rooms
 * A research station buried in a moon: twelve rooms on a grid of screens (the landing site, the caverns, a grotto, a
 * flooded shaft, a shrine under the water, the save room, a tower, the nest, the laboratory, the cold store, a lift
 * shaft, the reactor). Two abilities found on the way open the gates: the SPRING BOOTS (a second jump in the air; the
 * green hatch and the tower's climb), in the shrine at the shaft's foot, and the PHASE DASH (the blue hatch), which the
 * CARAPACE guards at the top of the tower. The WARDEN waits in the reactor.
 * KEYS: arrows / WASD move, Space / Z jump, X / J fire (hold it: a charged shot), E / F the lash (a short energy whip
 *   from the cannon: it cuts, knocks shots away and catches the rings to swing from), Shift / C dash, Q held stands
 *   still to aim, Tab / R the map. The cannon aims eight ways: up, up and forward, forward, and in the air down and
 *   forward, or down (crouched, it fires low). Down crouches and crawls; a ledge caught when falling is climbed with up.
 * TOUCH: the stick (it aims too), JUMP, FIRE (beside a foe, or near a ring in the air, it lashes), DASH and MAP.
 * THE MAP: the rooms seen, cell by cell, their doors, the save room (S) and the bosses' (B); the corner shows the cells
 * round you. SAVE: step onto the station (it refills energy); the next visit starts there.
 * Deep links: #metroidvania/miniboss and #metroidvania/boss (a practice: the abilities given, at the arena's door),
 * #metroidvania/map.
 * HOW IT WORKS: E.World (the rooms module) holds the rooms, their doors, the map, the gates and the save; the core's
 * Platformer the moves (crouching, ledges, clinging, swimming, the rope and the bars, swinging); this file the cast,
 * the bosses and the look.
 * ===================================================================================== */
const MVANIA = (() => {
  const T = 16, KEYS = Object.assign({}, E.Input.PLATFORMER, { fire: ['KeyX', 'KeyJ', 'Mouse0', 'Pad2', 'Pad7'], melee: ['KeyE', 'KeyF', 'Pad3'], lock: ['KeyQ', 'Pad4', 'Pad6'], map: ['Tab', 'KeyR', 'Pad8'] });
  delete KEYS.attack; delete KEYS.skill;
  /* ---- THE WORLD: each room's top-left screen on the grid, its name and area (the look), its rows (top first) ---- */
  const ROOMS = {
    landing: { at: [0, 1], name: 'LANDING SITE', area: 'cave', rows: [
      '########################################',
      '#####.......#############.......########',
      '###...............######...........#####',
      '##...................##...............##',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#..........................===.........#',
      '#......................................#',
      '#.............................f........#',
      '#........................#..............',
      '#.......................###.............',
      '#...@...n..............#####......c.....',
      '########################################',
      '########################################'] },
    caverns: { at: [2, 1], name: 'CAVERNS', area: 'cave', rows: [
      '########################################',
      '################f##########.....########',
      '#####......#########.........f.......###',
      '##....................................##',
      '#......................................#',
      '#.........................===..........#',
      '#......................................#',
      '#.................####.................#',
      '#................###########...........#',
      '#................###########...........#',
      '.................###########............',
      '.................############...........',
      '..........c.......................c.....',
      '######xxxx##############################',
      '######xxxx##############################'] },
    grotto: { at: [2, 2], name: 'GROTTO', area: 'cave', rows: [
      '######....##############################',
      '#.....................#########........#',
      '#..........................o...........#',
      '#...e..................................#',
      '#####..................................#',
      '#......................................#',
      '#..............xxxx....................#',
      '#......................................#',
      '#........................#####wwwwwwwww#',
      '#.......................######wwwwwwwww#',
      '#......................#######wwwwwwwwww',
      '#.....................^^^^^^^#wwwwwwwwww',
      '#....c....ss..........^^^^^^^#wwwwwwwwww',
      '########################################',
      '########################################'] },
    shaft: { at: [4, 0], name: 'FLOODED SHAFT', area: 'water', rows: [
      '####################',
      '####################',
      '##...r.......#######',
      '#....r.............#',
      '#....r.............#',
      '#....r.............#',
      '#....r.............#',
      '#....r.............#',
      '#....r.............#',
      '#....r.............#',
      '#....r..............',
      '#....r..............',
      '#....r..............',
      '#....r..############',
      '#....r.......#######',
      '#....r.......#######',
      '#....r........######',
      '#....r.........#####',
      '#....r.........#####',
      '#....r..........####',
      '#....r..........####',
      '#....r.........#####',
      '#....r.........#####',
      '#....r..........####',
      '#....r.............#',
      '.....r.............D',
      '.....r.............D',
      '.....r.............D',
      '#####r.........#####',
      '#wwwwrwwwwwwwwwwwww#',
      '#wwwwwwwwwwwwwwwwww#',
      '#wwwwwwwwwwwwwwwwww#',
      '#wwwwwwwwwwwwwwwwww#',
      '#wwwwwwwwwwwwwwwwww#',
      '##wwwwwwwwwwwwwwwww#',
      '##wwwwwwwwwwwwwwww##',
      '#wwwwwwwwwwwwwwwwww#',
      '#wwwwwwwwwwwwwwwwww#',
      '#wwwwwwwwwwwwwwwwww#',
      '#wwwwwwwwwwwwwwwwww#',
      'wwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwwww',
      '####################',
      '####################'] },
    save: { at: [5, 0], name: 'SAVE ROOM', area: 'lab', kind: 'save', rows: [
      '####################',
      '####################',
      '####################',
      '#####..........#####',
      '####............####',
      '###..............###',
      '##................##',
      '#..................#',
      '#..................#',
      '#..................#',
      '...................G',
      '...................G',
      '.........S.........G',
      '####################',
      '####################'] },
    shrine: { at: [5, 2], name: 'SHRINE', area: 'water', rows: [
      '####################',
      '###.............####',
      '##...............###',
      '#.................##',
      '#..................#',
      '#..............u...#',
      '#wwwwwwwwwww########',
      '#wwwwwwwwwww########',
      '#wwwwwwwwwwwwww#####',
      '#wwwwwwwwwwwwwwwww##',
      'wwwwwwwwwwwwwwwwwww#',
      'wwwwwwwwwwwwwwwwwww#',
      'wwwwwwwwwwwwwwwwwww#',
      '####################',
      '####################'] },
    tower: { at: [6, -2], name: 'TOWER', area: 'tower', rows: [
      '####################',
      '####################',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '...................#',
      '...................#',
      '...................#',
      '#########..........#',
      '#..f...............#',
      '#..................#',
      '#........====......#',
      '#..................#',
      '#..........r.......#',
      '#..........r..=====#',
      '#..........r.......#',
      '#..........r.......#',
      '#..........r.......#',
      '#..........r.......#',
      '#..........r.......#',
      '#..........r.......#',
      '#..........r.......#',
      '#..........r.......#',
      '#..........r.......#',
      '#..........r.......#',
      '#..................#',
      '#######............#',
      '#..f...............#',
      '#..................#',
      '#.......====.......#',
      '#..................#',
      '#..................#',
      '#............#######',
      '#..................#',
      '#..................#',
      '...................#',
      '...................#',
      '...................#',
      '####################',
      '####################'] },
    arena: { at: [5, -2], name: 'THE NEST', area: 'tower', kind: 'boss', rows: [
      '####################',
      '####################',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#...................',
      '#...................',
      '#.....M.............',
      '####################',
      '####################'] },
    lab: { at: [5, 1], name: 'LABORATORY', area: 'lab', rows: [
      '########################################',
      '#################t######################',
      '####...............................#####',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#.......bbbbbbbbbbbbbbbbbbbb...........#',
      '#......................................#',
      '........................................',
      '........................................',
      '................................d.....t.',
      '#########^^^^^^^^^^^^^^^^^##>>>>>>>>>###',
      '########################################'] },
    cryo: { at: [7, 1], name: 'COLD STORE', area: 'lab', rows: [
      '####################',
      '####################',
      '###..............###',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#.........d........#',
      '#......====........#',
      '#..................#',
      '....................',
      '....................',
      '....................',
      'iiiiiiii^^^iiiiiiiii',
      '####################'] },
    lift: { at: [8, 0], name: 'LIFT SHAFT', area: 'lab', rows: [
      '####################',
      '####################',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#.........d........#',
      '#..................#',
      '#...................',
      '#...................',
      '#..............R....',
      '#.....##############',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#####.........######',
      '#..................#',
      '#..................#',
      '#..................#',
      '#.......d..........#',
      '#.....======.......#',
      '#..................#',
      '...................#',
      '...................#',
      '...................#',
      '####################',
      '####################'] },
    reactor: { at: [9, 0], name: 'REACTOR', area: 'lab', kind: 'boss', rows: [
      '########################################',
      '########################################',
      '####................................####',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#.......====..........====.............#',
      '#......................................#',
      '.......................................#',
      '.......................................#',
      '..................................Z....#',
      '########################################',
      '########################################'] }
  };
  // tiles: rock (restyled by area), a ledge to jump up through, water, a vine, monkey bars, ice, conveyors, a spring,
  // crumbling blocks, spikes, the green and blue hatches (gates the boots and the dash open). Letters are spawns.
  const LEGEND = { '#': 1, '=': 2, w: 3, r: 4, b: 5, i: 6, '>': 7, '<': 8, s: 9, x: 10, '^': 11, G: 12, D: 13,
    '@': 'start', n: 'ship', S: 'station', R: 'recharge', u: 'boots', e: 'tank', o: 'ring', c: 'crawler', f: 'flyer', t: 'turret', d: 'drone', M: 'carapace', Z: 'warden' };
  const TYPES = { 1: { style: 'stone', side: '#5a5070' }, 2: { kind: 'oneway', side: '#8a7a6a' }, 3: { kind: 'water', side: '#2a7ac0' }, 4: { kind: 'rope', side: '#4a8a3a', leaves: '#6ac050' },
    5: { kind: 'bars', side: '#a8b0c8' }, 6: { friction: .12, style: 'block', side: '#a8d8f0' }, 7: { carry: 55, style: 'metal', side: '#6a7484' }, 8: { carry: -55, style: 'metal', side: '#6a7484' },
    9: { bounce: 520, style: 'bonus', side: '#e0a030' }, 10: { crumble: .45, respawn: 2.5, style: 'brick', side: '#8a6a50' }, 11: { kind: 'hazard', side: '#c8d0e0' },
    12: { gate: 'boots', style: 'metal', side: '#38c060' }, 13: { gate: 'dash', style: 'metal', side: '#3a8ae8' } };
  // the areas: the rock's look, the back wall's, the sky behind (three stops), how lit the dark is, the song
  const AREAS = {
    cave: { types: { 1: { style: 'ground', side: '#4c3c54', top: '#5a7a48', flower: '#9a6ad8' }, 2: { side: '#7a6a5a' } }, back: '#1a1424', backStyle: 'plain', backMat: '#1a1424 noise', sky: ['#06040a', '#110b1a', '#1e1530'], amb: .3, song: 'caves' },
    water: { types: { 1: { style: 'stone', side: '#3e5c6c', moss: '#3a7a5a' } }, back: '#0e2028', backStyle: 'plain', backMat: '#0e2028 speck', sky: ['#02080c', '#05202a', '#0a3644'], amb: .34, song: 'caves' },
    tower: { types: { 1: { style: 'brick', side: '#6e5c6a' }, 2: { side: '#9a7a5a' } }, back: '#221828', backStyle: 'brick', sky: ['#08061a', '#24143a', '#5a2a4a'], amb: .42, song: 'caves' },
    lab: { types: { 1: { style: 'metal', side: '#5a6478' }, 2: { style: 'metal', side: '#8a94a8' } }, back: '#141a22', backStyle: 'metal', sky: ['#04060a', '#0a0e16', '#121824'], amb: .34, song: 'station' }
  };
  // the songs (the step sequencer's format): the caves' slow drone, the station's pulse
  const SONGS = {
    caves: { bpm: 84, steps: 4, tracks: [
      { wave: 'triangle', vol: .24, notes: 'D3 . . A2 . . F3 . | E3 . . . C3 . . . | D3 . . A2 . . G3 . | F3 . E3 . D3 . . .' },
      { wave: 'pulse12', vol: .05, notes: 'A4 - - - . . F5 - | E5 - - - . . . . | D5 - - - . . A4 - | C5 - - - D5 - - -' },
      { wave: 'drums', vol: .05, notes: 'k . . . . . h . k . . . . . . .' }] },
    station: { bpm: 120, steps: 4, tracks: [
      { wave: 'square', vol: .06, notes: 'E4 . E5 . B4 . G4 . | E4 . E5 . C5 . A4 . | D4 . D5 . A4 . F4 . | E4 . B4 . G4 . D4 .' },
      { wave: 'triangle', vol: .26, notes: 'E2 E2 . E2 E3 . E2 . | C2 C2 . C2 C3 . C2 . | D2 D2 . D2 D3 . D2 . | B1 B1 . B1 B2 . D2 .' },
      { wave: 'drums', vol: .07, notes: 'k . h . s . h . k k h . s . h h' }] } };
  // the back walls: every open cell beside rock (the room's middle stays open on its sky)
  const backs = {};
  function backOf(d, ar) {
    const rows = d.rows, out = rows.map((row, y) => [...row].map((c, x) => { if (c === '#') return '.'; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((rows[y + dy] || '')[x + dx] === '#') return 'k'; return '.'; }).join(''));
    return new E.PlatformMap({ rows: out, legend: { k: 1 }, types: { 1: { kind: 'back', style: ar.backStyle, side: ar.back, mat: ar.backMat } } });
  }
  // a world of the rooms (id: its save's name: the player's, the bot's, a practice's)
  const makeWorld = id => new E.World(game, { id, screen: [20, 15], rooms: ROOMS, legend: LEGEND, start: 'landing', transition: 'slide', make: d => {
    const ar = AREAS[d.area], types = {}; for (const k in TYPES) types[k] = Object.assign({}, TYPES[k], ar.types[k]);
    backs[d.id] = backOf(d, ar); return new E.PlatformMap({ rows: d.rows, legend: d.legend, types }); } });

  /* ---- THE CAST: the hero (an armored suit, an arm cannon), the creatures, the bosses ---- */
  const FOES = { crawler: { hp: 3, w: 18, h: 20, dmg: 12 }, flyer: { hp: 2, w: 14, h: 12, dmg: 12 }, turret: { hp: 4, w: 16, h: 18, dmg: 10 }, drone: { hp: 3, w: 14, h: 12, dmg: 10 },
    carapace: { hp: 26, w: 42, h: 28, dmg: 20, boss: 'CARAPACE' }, warden: { hp: 24, w: 70, h: 92, dmg: 20, boss: 'WARDEN' } };
  const DEBRIS = { crawler: ['#c8783a', '#f0c060', '#5a2a1a'], flyer: ['#8a4ab8', '#e0a0ff', '#2a1a3a'], turret: ['#8a94a8', '#ff6a3a', '#3a4050'], drone: ['#a0a8b8', '#ff3a3a', '#3a4050'],
    carapace: ['#3a8a8a', '#a0e0c0', '#1a3a3a', '#ffb040'], warden: ['#b04a6a', '#ffd0a0', '#3a1a2a', '#ff6a3a'] };
  const shots = new E.Bullets(game, { plane: 'side', max: 160 });
  const newHero = (x, z) => new E.Platformer({ x, z, w: 10, h: 28, run: 100, jump: 305, crouch: true, ledge: true, wallCling: true, dashTime: .22 });
  const newRig = () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: 'gun', armor: true, sleeves: 'long', hat: { style: 'helmet', color: '#d86a24' }, eyeGlow: '#8aff6a', speedRef: 60,
    colors: { skin: '#f0c8a8', cloth: '#d86a24', pants: '#b85a1c', boot: '#6a3218', metal: '#5ad050', glove: '#e8c040', belt: '#e8c040', trim: '#f0d048' } });
  let seals = [], recharge = null, onRe = false, world, hero, rig, hp, inv, aim, aimA, charge, cool, lash, foes, items, rings, orbs, gates, station, ship, fx, banner, got, mapOpen, dead, won, wonT, visited, song, onPad, mode = null, age, hint, bolt;
  const tanks = () => [...world.got].filter(g => g.startsWith('tank:')).length, MAXHP = () => 99 + tanks() * 100;
  const label = a => game.input.label(a);
  // a new run in a world: loaded from its save unless fresh; at: a practice's room (got: what it is given)
  function start(o = {}) {
    world = makeWorld(o.id || 'metroidvania'); won = false; wonT = 0; visited = new Set(); song = null; fx = []; banner = got = null; mapOpen = false; dead = 0; age = 0; hint = 7;
    const d = o.fresh ? null : world.load();
    if (o.at) { for (const k of o.got || []) world.give(k); world.enter(o.at); const e = ENTRY[o.at]; hero = newHero(e[0], e[1]); }
    else if (d) hero = newHero(d.x, d.z);
    else { const s = world.map.find('start'); hero = newHero(s.x, s.z); }
    rig = newRig(); hp = MAXHP(); inv = 0; charge = 0; cool = 0; lash = null; aim = [1, 0]; aimA = 0; onPad = false;
    game.follow(hero, { z: 18, lead: 16 }); arrive(); world.update(0, hero);
  }
  const ENTRY = { arena: [17 * T, 2 * T], reactor: [2.5 * T, 2 * T] };   // (a practice's start: inside the door)
  // into a room: its creatures (the bosses beaten stay beaten), what is still to find, the rings, the hatches, the song
  function arrive() {
    const R = world.room, m = R.map; foes = []; items = []; rings = []; orbs = []; shots.clear(); lash = null; if (hero.swinging) hero.release();
    for (const s of m.spawns) {
      const k = s.tag;
      if (FOES[k]) { if (!(k === 'carapace' && world.has('dash')) && !(k === 'warden' && won)) foes.push(spawn(k, s, m)); }
      else if (k === 'boots' && !world.has('boots')) items.push({ kind: k, x: s.x, z: s.z + 2, w: 14, h: 14 });
      else if (k === 'tank' && !world.has('tank:' + R.id)) items.push({ kind: k, id: 'tank:' + R.id, x: s.x, z: s.z + 2, w: 14, h: 14 });
      else if (k === 'ring') rings.push({ x: s.x, z: s.z + 8 });
    }
    station = m.find('station'); recharge = m.find('recharge'); ship = m.find('ship'); hatches();
    seals = []; if (R.def.kind === 'boss') for (const cx of [0, m.w - 1]) for (let cz = 0; cz < m.h; cz++) if (!m.cell(cx, cz)) seals.push({ x: (cx + .5) * T, z: cz * T });
    if (!visited.has(R.id)) { visited.add(R.id); banner = { text: R.def.name, t: 0 }; }
    frame(); tune();
  }
  const hatches = () => { const m = world.map; gates = []; for (let i = 0; i < m.cells.length; i++) { const tp = m.types[m.cells[i]]; if (tp && tp.gate) gates.push({ x: (i % m.w + .5) * T, z: Math.floor(i / m.w) * T, c: tp.side }); } };
  const bossHere = () => foes.some(f => f.boss && !f.dead);
  // a boss's room: the camera keeps the hero and the boss in view (and zooms out for them); elsewhere it follows
  const frame = () => { const f = foes.find(f => f.boss && !f.dead); game.cam.frame(f ? [hero, f.kind === 'warden' ? { x: EYE(f)[0], y: 0, z: f.z + 46 } : f] : null, { margin: 30, zoom: [.6, 1] }); };
  function tune() { const s = won ? 'victory' : bossHere() ? 'boss' : AREAS[world.room.def.area].song; if (s !== song) { song = s; A.music(SONGS[s] || s); } }
  function spawn(kind, s, m) {
    const f = Object.assign({ kind, x: s.x, z: s.z, vx: 0, vz: 0, t: E.hash2(s.cx, s.cz) * 6, flash: 0, dir: -1, cool: 1.2 + E.hash2(s.cz, s.cx), state: 'idle', st: 0, a: -Math.PI / 2, open: 0, n: 0, beams: 0 }, FOES[kind]);
    f.max = f.hp;
    if (kind === 'flyer' || kind === 'turret') {   // up to the ceiling above (a floor turret stays down)
      let cz = s.cz; if (kind === 'flyer' || m.kind(s.cx, s.cz + 1) === 'solid') { while (cz < m.h - 1 && m.kind(s.cx, cz + 1) !== 'solid') cz++; f.ceil = true; f.z = (cz + 1) * T - f.h; }
    }
    if (kind === 'drone') f.z += 18;
    if (kind === 'warden') { f.x = s.x + 10; f.z = 2 * T; f.state = 'fan'; f.cool = 1.5; }
    return f;
  }

  /* ---- PLAY ---- */
  // the cannon's aim from the stick, one of eight ways ([x, z], a unit): forward by default; crouched it fires low
  function aimFrom(I, lock) {
    const [mx, my] = I.move(), sx = Math.abs(mx) > .35 ? Math.sign(mx) : 0, up = my < -.45, dn = my > .45, air = !hero.onGround && !hero.swimming;
    if (lock && sx) hero.facing = sx;
    const f = hero.facing, k = Math.SQRT1_2;
    return up ? (sx || lock && mx ? [sx * k, k] : [0, 1]) : dn && (air || lock) ? (sx ? [sx * k, -k] : air ? [0, -1] : [f * k, -k]) : [f, 0];
  }
  function shoot(big) {
    const m = rig.tip(), sp = big ? 280 : 330;
    shots.fire({ x: m[0], z: m[2], vx: aim[0] * sp, vz: aim[1] * sp, r: big ? 6 : 2.5, dmg: big ? 4 : 1, life: big ? 1.1 : .8, team: 'player', color: big ? '#ffd040' : '#fff0a0', core: '#ffffff', pierce: big });
    A.sfx(big ? 'laser' : 'shoot', big ? { pitch: .7 } : { vol: .6 }); fx.push({ kind: 'muzzle', x: m[0], z: m[2], t: 0, max: .06, size: big ? 7 : 4 }); if (big) game.shake(1.5);
  }
  // the lash: a short whip from the cannon along the aim; in the air near a ring above, it catches the ring and swings
  function startLash() {
    lash = { t: 0, d: aim.slice(), hit: new Set(), ring: null, end: null }; A.sfx('swing', { pitch: 1.5 });
    if (hero.onGround || hero.swimming) return;
    const m = rig.tip(); let best = null, bd = 72;
    for (const g of rings) { const d = Math.hypot(g.x - m[0], g.z - m[2]); if (d < bd && g.z > hero.z + 12) { bd = d; best = g; } }
    if (best) { lash.ring = best; hero.swingFrom(best.x, best.z); A.sfx('key'); }
  }
  // does a segment pass through a creature (its box, or the warden's shell)?
  const inside = (f, x, z, pad = 0) => f.kind === 'warden' ? Math.hypot(x - f.x, z - f.z - 46) < 46 + pad || Math.hypot(x - f.x + 40, z - f.z - 28) < 18 + pad : Math.abs(x - f.x) < f.w / 2 + pad && z > f.z - pad && z < f.z + f.h + pad;
  const EYE = f => [f.x - 40, f.z + 28];   // (the warden's eye: at its shell's front, low enough for a shot standing)
  const along = (x0, z0, x1, z1, f, pad) => { for (let i = 0; i <= 6; i++) if (inside(f, x0 + (x1 - x0) * i / 6, z0 + (z1 - z0) * i / 6, pad)) return true; return false; };
  function updateLash(dt) {
    if (!lash) return; lash.t += dt;
    if (lash.ring) { if (!hero.swinging) lash = null; return; }
    if (lash.t > .22) { lash = null; return; }
    const m = rig.tip(), L = 38 * Math.sin(clamp(lash.t / .22, 0, 1) * Math.PI), ex = m[0] + lash.d[0] * L, ez = m[2] + lash.d[1] * L; lash.end = [ex, ez];
    for (const f of foes) if (!f.dead && !lash.hit.has(f) && along(m[0], m[2], ex, ez, f, 2)) { lash.hit.add(f); hitFoe(f, 3, null); }
    for (const b of shots.list) if (b.team === 'foe' && !b.dead && Math.hypot(b.x - ex, b.z - ez) < 12 + b.r) { b.dead = true; P.sparks(b.x, 0, b.z, 5, null, { color: '#8af0ff' }); A.sfx('bump', { pitch: 1.6 }); }
  }
  // a hit on a creature: false when its armor turns it (the carapace's front, the warden's shut shell)
  function hitFoe(f, n, b) {
    if (f.dead) return false;
    const plate = b && (f.kind === 'carapace' ? f.state !== 'dazed' && b.vx * f.dir < 0 && b.vz > -150 : f.kind === 'warden' ? f.open < .6 || Math.hypot(b.x - EYE(f)[0], b.z - EYE(f)[1]) > 18 + b.r : false);
    if (plate) { P.sparks(b.x, 0, b.z, 4, null, { color: '#d0e0ff' }); A.sfx('bump', { pitch: 1.8, vol: .5 }); return false; }
    f.hp -= n; f.flash = .1; A.sfx('bump', { pitch: f.boss ? .7 : 1.2 }); P.bits(f.x, 0, f.z + f.h / 2, 3, DEBRIS[f.kind]);
    if (!f.boss) { f.vx += Math.sign(f.x - hero.x) * 40; }
    if (f.hp <= 0) kill(f);
    return true;
  }
  function kill(f) {
    f.dead = true; const z = f.kind === 'warden' ? f.z + 46 : f.z + f.h / 2;
    P.explosion(f.x, 0, z, f.boss ? 2.2 : .7, { debris: DEBRIS[f.kind] }); A.sfx('explode'); game.shake(f.boss ? 8 : 2);
    if (!f.boss && Math.random() < .4) orbs.push({ x: f.x, z: f.z + 4, vx: 0, vz: 110, w: 8, h: 8, t: 0 });
    if (f.boss) game.after(.8, frame);   // (the camera back on the hero)
    if (f.kind === 'carapace') { items.push({ kind: 'dash', x: clamp(f.x, 3 * T, world.map.w * T - 3 * T), z: f.z + 10, w: 14, h: 14, float: true }); tune(); game.flash('#ffffff', .5, .4); }
    if (f.kind === 'warden') { won = true; wonT = 0; tune(); game.flash('#ffffff', .8, 1); for (let i = 0; i < 6; i++) game.after(.25 * i, () => P.explosion(f.x + E.rand(-40, 30), 0, f.z + E.rand(20, 100), 1.2, { debris: DEBRIS.warden })); }
  }
  function hurt(n, dir) {
    if (inv > 0 || dead || won) return;
    hp -= n; inv = 1.1; hero.knock(dir || -hero.facing, 110, 150, .22); A.sfx('hurt'); game.flash('#ff3030', .12, .2); game.shake(2);
    P.text(hero.x, 0, hero.z + 40, '-' + n, '#ff8a8a');
    if (hp <= 0) { hp = 0; dead = 2; A.music(null); song = null; A.sfx('die'); P.explosion(hero.x, 0, hero.z + 14, 1, { debris: ['#d86a24', '#e8c040', '#5ad050'] }); }
  }
  // the creatures, each by its own rule
  function updateFoe(f, dt) {
    const m = world.map, dx = hero.x - f.x, dz = hero.z + 14 - (f.z + f.h / 2), d = Math.hypot(dx, dz) || 1;
    f.t += dt; f.flash -= dt; f.cool -= dt; f.st += dt;
    if (f.kind === 'crawler') {   // along the floor, turning at walls and ledges
      f.vx = approach(f.vx, f.dir * 26, 120 * dt); f.vz -= 700 * dt; m.move(f, dt);
      const ahead = m.groundBelow(f.x + f.dir * 10, f.z + 1);
      if (f.hitWall || (f.onGround && (ahead === null || ahead < f.z - 2))) { f.dir = -f.dir; f.vx = 0; }
    } else if (f.kind === 'flyer') {   // hangs from the ceiling until the hero passes under, then drops at it and bursts on the floor
      if (f.state === 'idle') { if (Math.abs(dx) < 60 && dz < -10) { f.state = 'dive'; f.vx = Math.sign(dx) * 50; f.vz = -30; A.sfx('whoosh', { pitch: 1.7, vol: .5 }); } return; }
      f.vz = Math.max(f.vz - 520 * dt, -230); f.vx = approach(f.vx, Math.sign(dx) * 95, 220 * dt); m.move(f, dt);
      if (f.onGround || f.hitWall) kill(f);
    } else if (f.kind === 'turret') {   // turns its barrel to the hero and fires a slow orb when it can see it
      const cz = f.z + (f.ceil ? f.h - 9 : 9); f.a = Math.atan2(hero.z + 14 - cz, dx);
      if (f.cool <= 0 && d < 240 && clearLine(f.x, cz, hero.x, hero.z + 14)) { f.cool = 2.2; shots.fire({ x: f.x + Math.cos(f.a) * 9, z: cz + Math.sin(f.a) * 9, vx: Math.cos(f.a) * 95, vz: Math.sin(f.a) * 95, r: 3, team: 'foe', color: '#ff6a3a', core: '#ffe0a0', life: 3.5, dmg: f.dmg }); A.sfx('laser', { pitch: .5, vol: .35 }); }
    } else if (f.kind === 'drone') {   // hovers to a place above and in front of the hero; lunges every few seconds
      if (f.state === 'lunge') { f.x += f.vx * dt; f.z += f.vz * dt; if (f.st > .55 || m.solidAt(f.x, f.z + 6)) { f.state = 'idle'; f.st = 0; f.vx *= .3; f.vz *= .3; } }
      else {
        const tx = hero.x - Math.sign(dx || 1) * 56, tz = hero.z + 46 + Math.sin(f.t * 2.2) * 8;
        f.vx = approach(f.vx, clamp((tx - f.x) * 1.4, -55, 55), 110 * dt); f.vz = approach(f.vz, clamp((tz - f.z) * 1.4, -55, 55), 110 * dt); f.x += f.vx * dt; f.z += f.vz * dt;
        if (f.cool <= 0 && d < 130) { f.state = 'lunge'; f.st = 0; f.cool = 3.2; f.vx = dx / d * 175; f.vz = dz / d * 175; A.sfx('whoosh'); }
      }
      f.x = clamp(f.x, T, m.w * T - T); f.z = clamp(f.z, T, m.h * T - 2 * T);
    } else if (f.kind === 'carapace') carapace(f, dt, dx);
    else if (f.kind === 'warden') warden(f, dt, dx);
    const lo = T + f.w / 2, hi = m.w * T - T - f.w / 2;   // (no creature leaves its room: a doorway is a wall to it)
    if (f.x < lo || f.x > hi) { f.hitWall = f.x < lo ? -1 : 1; f.x = clamp(f.x, lo, hi); f.vx = 0; }
  }
  // the CARAPACE: an armored beetle. It walks at the hero, rears (its back glows) and charges until it hits a wall,
  // where it is dazed and its soft back is open; every third time it leaps instead. Shots from in front glance off its
  // plate; from behind, from above, or while it is dazed they hurt it, and the lash always does
  function carapace(f, dt, dx) {
    const m = world.map; f.vz -= 900 * dt;
    if (f.state === 'idle') { f.dir = Math.sign(dx) || f.dir; f.vx = approach(f.vx, f.dir * 38, 220 * dt); if (f.st > 1.4 && f.onGround) { f.st = 0; f.state = f.n++ % 3 === 2 ? 'leap' : 'rear'; } }
    else if (f.state === 'rear') { f.vx = approach(f.vx, 0, 400 * dt); if (f.st > .6) { f.state = 'charge'; f.st = 0; A.sfx('whoosh', { pitch: .5 }); } }
    else if (f.state === 'charge') { f.vx = f.dir * 215; if (f.hitWall || f.st > 2.5) { f.state = 'dazed'; f.st = 0; f.vx = -f.dir * 70; f.vz = 170; game.shake(5); A.sfx('stomp'); P.dust(f.x + f.dir * 20, 0, f.z + 10, 14); } }
    else if (f.state === 'dazed') { if (f.onGround) f.vx = approach(f.vx, 0, 260 * dt); if (f.st > 1.6) { f.state = 'idle'; f.st = 0; } }
    else if (f.state === 'leap') { if (f.st < dt * 1.5) { f.vz = 390; f.vx = clamp(dx * 1.1, -150, 150); f.dir = Math.sign(dx) || f.dir; } else if (f.onGround && f.st > .25) { f.state = 'idle'; f.st = 0; game.shake(4); P.dust(f.x, 0, f.z, 12); A.sfx('stomp', { pitch: .7 }); } }
    m.move(f, dt);
  }
  // the WARDEN: the reactor's core, grown into its far wall. Its shell shuts while it fires (a fan of orbs at the hero;
  // hurt past half, a beam along the floor: jump it, or stand on a ledge), then opens on its eye, which can be shot.
  // f.open: 0 shut .. 1 open; f.beam: the beam's time
  function warden(f, dt) {
    f.open = approach(f.open, f.state === 'open' ? 1 : 0, dt * 3.5);
    const [ex, ez] = EYE(f), half = f.hp <= f.max / 2;
    if (f.state === 'fan') {
      if (f.cool <= 0 && f.n < 3) { f.cool = .7; f.n++; const a0 = Math.atan2(hero.z + 14 - ez, hero.x - ex), k = half ? 5 : 3;
        for (let i = 0; i < k; i++) { const a = a0 + (i - (k - 1) / 2) * .22; shots.fire({ x: ex, z: ez, vx: Math.cos(a) * 92, vz: Math.sin(a) * 92, r: 4, team: 'foe', color: '#ff5a8a', core: '#ffe0f0', life: 5, dmg: 10 }); }
        A.sfx('laser', { pitch: .4, vol: .5 }); }
      if (f.n >= 3 && f.cool <= 0) { f.state = half && f.beams++ % 2 === 0 ? 'beam' : 'open'; f.st = 0; f.n = 0; }
    } else if (f.state === 'beam') {   // a warning line, then the beam
      if (f.st > .9 && f.st - dt <= .9) { A.sfx('explode', { pitch: 1.6 }); game.shake(3); }
      if (f.st > .9 && f.st < 1.5 && hero.z < 30) hurt(22, -1);
      if (f.st > 1.7) { f.state = 'open'; f.st = 0; }
    } else if (f.state === 'open') { if (f.st > 2.6) { f.state = 'fan'; f.st = 0; f.cool = .6; } }
  }
  // is the line between two points clear of rock?
  const clearLine = (x0, z0, x1, z1) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 6); for (let i = 1; i < n; i++) if (world.map.solidAt(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n)) return false; return true; };
  // an item's banner (the world holds still a moment, as in Metroid); the room's name on a first visit
  const say = (title, text) => { got = { title, text, t: 0 }; A.sfx('powerup'); game.flash('#ffffff', .35, .3); };
  function pickUp(it) {
    it.got = true; P.glints(it.x, 0, it.z + 7, 10, '#ffffff', 16);
    if (it.kind === 'boots') { world.give('boots'); say('SPRING BOOTS', 'PRESS ' + label('jump') + ' AGAIN IN THE AIR: A SECOND JUMP'); }
    else if (it.kind === 'dash') { world.give('dash'); say('PHASE DASH', label('dash') + ' DASHES. THE BLUE HATCHES OPEN'); }
    else { world.give(it.id); say('ENERGY TANK', 'YOUR ENERGY HOLDS 100 MORE'); }
    hp = MAXHP(); hatches();
  }
  function update(dt) {
    const I = game.input; age += dt; hint -= dt;
    if (I.pressed('map') && !dead) { mapOpen = !mapOpen; A.sfx(mapOpen ? 'select' : 'cancel'); I.consumeAll(); }
    if (mapOpen) { if (I.pressed('confirm') || I.pressed('cancel')) { mapOpen = false; I.consumeAll(); } return; }   // (the world holds still under the map)
    if (banner) { banner.t += dt; if (banner.t > 2.4) banner = null; }
    if (got) { got.t += dt; if (got.t > 3.6) got = null; if (got && got.t < 1.2) return; }
    for (const f of fx) f.t += dt; E.prune(fx, f => f.t >= f.max);
    if (world.moving) { world.update(dt, hero); return; }   // (a room's slide: everyone holds still)
    if (dead > 0) { dead -= dt; rig.update(dt, hero.rigState({ pose: 'die' })); if (dead <= 0) start({ id: world.id }); return; }
    if (won) { wonT += dt; if (wonT > 7 && mode !== 'bot') game.go('title'); }
    // the abilities found: a second jump, the dash
    hero.airJumps = world.has('boots') ? 1 : 0; hero.dash = world.has('dash') ? 270 : 0;
    const lock = I.down('lock') && hero.onGround;
    const air0 = hero.air; hero.update(dt, world.map, lock ? { x: 0, jump: I.down('jump'), jumpPressed: I.pressed('jump') } : I);
    world.map.update(dt);
    if (hero.jumped) A.sfx(air0 ? 'jump2' : 'jump', { vol: .5 });
    if (hero.landed) { A.sfx('land', { vol: .5 }); rig.kick(-4); }
    if (hero.sprung) A.sfx('jump2');
    // a boss's room shuts behind the hero until the boss is beaten
    const W = world.map.w * T; if (bossHere()) hero.x = clamp(hero.x, T + 6, W - T - 6);
    if (world.update(dt, hero) === 'enter') { arrive(); return; }
    // the cannon and the lash
    aim = aimFrom(I, lock); aimA = aim[0] ? Math.atan2(aim[1], Math.abs(aim[0])) : aim[1] * Math.PI / 2;
    cool -= dt; inv -= dt;
    const near = foes.some(f => !f.dead && inside(f, hero.x + hero.facing * 14, hero.z + 14, 12)) || (!hero.onGround && !hero.swimming && rings.some(g => Math.hypot(g.x - hero.x, g.z - hero.z - 20) < 70 && g.z > hero.z + 12));
    if (!lash && (I.pressed('melee') || (I.pressed('fire') && near))) { startLash(); I.consume('melee'); I.consume('fire'); charge = 0; }
    else if (I.pressed('fire')) { if (cool <= 0) { shoot(false); cool = .14; } charge = 0; I.consume('fire'); }
    if (I.down('fire') && !lash) { const was = charge; charge += dt; if (charge >= .7 && was < .7) A.sfx('charge'); }
    else { if (charge >= .7) shoot(true); charge = 0; }
    updateLash(dt);
    // shots: the hero's at the creatures, theirs at the hero
    shots.update(dt, world.map);
    for (const b of shots.list) {
      if (b.dead) continue;
      if (b.team === 'foe') { if (Math.abs(b.x - hero.x) < 5 + b.r && b.z > hero.z - b.r && b.z < hero.z + hero.h + b.r) { b.dead = true; hurt(b.dmg, Math.sign(b.vx) || 1); } continue; }
      for (const f of foes) if (!f.dead && inside(f, b.x, b.z, b.r) && !(b.hitSet && b.hitSet.has(f))) {
        const ok = hitFoe(f, b.dmg, b); if (!ok || !b.pierce) { b.dead = true; break; } (b.hitSet || (b.hitSet = new Set())).add(f);
      }
    }
    E.prune(shots.list, b => b.dead);
    for (const f of foes) { if (f.dead) continue; updateFoe(f, dt); if (!f.dead && inside(f, hero.x, hero.z + 14, 6)) hurt(f.dmg, Math.sign(hero.x - f.x) || -hero.facing); }
    E.prune(foes, f => f.dead && !f.boss);
    // what lies about: abilities, tanks, the energy creatures drop
    for (const it of items) { if (it.float) it.z += Math.sin(age * 3) * .1; if (!it.got && E.overlapBox(hero, it)) pickUp(it); }
    E.prune(items, it => it.got);
    for (const o of orbs) { o.t += dt; o.vz -= 400 * dt; world.map.move(o, dt); if (E.overlapBox(hero, o)) { o.dead = true; hp = Math.min(MAXHP(), hp + 10); A.sfx('heal', { vol: .6 }); } if (o.t > 7) o.dead = true; }
    E.prune(orbs, o => o.dead);
    if (world.map.touching(hero, 'hazard')) { hurt(15, -hero.facing); if (inv > 1) hero.vz = 230; }
    // the save station: stepping on saves (and refills energy) once a visit
    const on = !!station && hero.onGround && Math.abs(hero.x - station.x) < 12 && Math.abs(hero.z - station.z) < 4;
    if (on && !onPad && !won) { world.save(hero); hp = MAXHP(); say('GAME SAVED', 'THE NEXT VISIT STARTS HERE'); A.sfx('secret'); }
    onPad = on;
    // a recharge station: energy only (no save), before the reactor
    const re = !!recharge && hero.onGround && Math.abs(hero.x - recharge.x) < 12 && Math.abs(hero.z - recharge.z) < 4;
    if (re && !onRe && hp < MAXHP()) { hp = MAXHP(); say('ENERGY RESTORED', 'A RECHARGE STATION: IT DOES NOT SAVE'); A.sfx('heal'); }
    onRe = re;
    // the suit: the cannon held out along the aim, but not on a rope, the bars or a ledge (its hands are full)
    const busy = hero.onRope || hero.onBars || hero.hanging || hero.climbUp || hero.clinging;
    rig.update(dt, hero.rigState(Object.assign({ point: !busy, aim: aimA, hurt: hero.stun > 0, expr: hero.stun > 0 ? 'wince' : null }, won && hero.onGround && { pose: 'cheer' })));
    for (const k of ['jump', 'fire', 'dash']) game.input.touchSet(k, k === 'fire' && near ? 'LASH' : null, k !== 'dash' || world.has('dash'));
  }
  /* ---- THE LOOK ---- */
  const cache = new Map(), bake = (key, w, h, fn) => { if (!cache.has(key)) { const c = E.mkCanvas(w, h); fn(E.ctx2d(c), w, h); cache.set(key, c); } return cache.get(key); };
  const add = (g, a, fn) => px.blend(g, a, 'add', fn);
  // the area's sky behind the rooms: a gradient, then the caves' hanging rock, the water's light shafts, the tower's
  // stars and moon, the station's panels
  function sky(r, g, ar, area) {
    const W = r.bw, H = r.bh, t = game.time;
    g.drawImage(bake('sky' + area + H, 1, H, (c) => { for (let y = 0; y < H; y++) { const u = y / H; px.rect(c, 0, y, 1, 1, u < .5 ? E.mix(ar.sky[0], ar.sky[1], u * 2) : E.mix(ar.sky[1], ar.sky[2], u * 2 - 1)); } }), 0, 0, W, H);
    if (area === 'cave' || area === 'water') for (let k = 0; k < 14; k++) {   // far stalactites, slow parallax
      const x = ((k * 57 - r.ix * .25) % (W + 80) + W + 80) % (W + 80) - 40, L = 30 + E.hash2(k, 2) * 70, w = 10 + E.hash2(k, 3) * 16;
      px.poly(g, [[x - w, 0], [x + w, 0], [x + 2, L], [x - 1, L + 6]], E.mix(ar.sky[1], '#000000', .35));
      px.poly(g, [[x - w * .7, H], [x + w * .8, H], [x + 1, H - L * .7]], E.mix(ar.sky[2], '#000000', .4));
    }
    if (area === 'water') add(g, .07, () => { for (let k = 0; k < 5; k++) { const x = ((k * 97 - r.ix * .4 + Math.sin(t * .4 + k) * 12) % (W + 60) + W + 60) % (W + 60) - 30; px.poly(g, [[x, 0], [x + 18, 0], [x + 60, H], [x + 26, H]], '#7ae0ff'); } });
    if (area === 'tower') {
      for (let i = 0; i < 60; i++) { const x = ((E.hash2(i, 1) * W * 1.5 - r.ix * .05) % W + W) % W, y = E.hash2(i, 2) * H * .7; px.dot(g, x, y, (i + Math.floor(t * 2)) % 9 ? '#a8a0d8' : '#ffffff'); }
      const mx = Math.round(W * .7 - r.ix * .03), my = Math.round(H * .22); add(g, .25, () => px.disc(g, mx, my, 30, '#6a5ac8')); px.disc(g, mx, my, 13, '#e8dcc8'); px.disc(g, mx + 4, my - 3, 11, E.mix(ar.sky[1], '#e8dcc8', .2));
    }
    if (area === 'lab') {
      const o = ((r.ix * .5) % 48 + 48) % 48, p = ((r.iy * .5) % 48 + 48) % 48;
      for (let x = -o; x < W; x += 48) px.rect(g, Math.round(x), 0, 1, H, '#1a222e');
      for (let y = -p; y < H; y += 48) px.rect(g, 0, Math.round(y), W, 1, '#1a222e');
      for (let x = -o; x < W; x += 96) for (let y = -p + 24; y < H; y += 96) if ((Math.floor(t * 1.5) + Math.round(x + y)) % 5 === 0) add(g, .8, () => px.rect(g, Math.round(x) + 20, Math.round(y), 3, 2, '#3ae0a0'));
    }
  }
  // the ship on the landing site: a gunship on its struts, its cockpit lit
  function drawShip(r, s) {
    r.queue(s.x, -10, s.z, g => {
      const [x, y] = r.w(s.x, -10, s.z), k = r.view.scale, t = E.tones('#c8682a'), b = Math.round(y - 22 * k);
      for (const d of [-1, 1]) px.line(g, x + d * 18 * k, b + 8, x + d * 26 * k, y, '#3a3440', 2);
      px.ell(g, x, b, 44 * k, 11 * k, t.deep); px.ell(g, x, b - 1, 42 * k, 9 * k, t.sh); px.ell(g, x - 2, b - 3, 36 * k, 6 * k, t.base); px.rect(g, x - 34 * k, b - 3, 60 * k, 1, t.lt);
      px.ell(g, x + 14 * k, b - 7 * k, 12 * k, 6 * k, '#1a3a4a'); add(g, .7, () => px.ell(g, x + 14 * k, b - 8 * k, 9 * k, 3 * k, '#5ae0ff'));
      for (const d of [-1, 1]) { px.rect(g, x - 44 * k, b - 1 + d * 2, 6, 2, '#3a3440'); add(g, .6 + .3 * Math.sin(game.time * 9 + d), () => px.disc(g, x - 46 * k, b + d * 2, 3, '#ffb040')); }
    }, { bias: -2 });
    game.lights.add(s.x + 14, 0, s.z + 22, 40, .6, { color: '#5ae0ff' });
  }
  // the save station: a pad between two pillars, its beam when it saves
  function drawStation(r, s) {
    r.queue(s.x, -4, s.z, g => {
      const [x, y] = r.w(s.x, -4, s.z), on = got && got.title === 'GAME SAVED' ? 1 - got.t / 3.6 : 0, k = .5 + .5 * Math.sin(game.time * 3);
      for (const d of [-1, 1]) { px.rect(g, x + d * 20 - 3, y - 40, 6, 40, '#4a5468'); px.rect(g, x + d * 20 - 3, y - 40, 6, 2, '#8a94a8'); add(g, .6 + .4 * k, () => px.rect(g, x + d * 20 - 1, y - 34, 2, 26, '#3ae0a0')); }
      px.rect(g, x - 16, y - 4, 32, 4, '#6a7488'); add(g, .7, () => px.rect(g, x - 14, y - 4, 28, 1, '#7affc8'));
      if (on > 0) add(g, on * .8, () => { px.rect(g, x - 15, y - 120, 30, 116, '#3affb0'); px.rect(g, x - 6, y - 120, 12, 116, '#d0ffe8'); });
    }, { bias: -1 });
    game.lights.add(s.x, 0, s.z + 20, 60, .7, { color: '#3ae0a0' });
  }
  // the recharge station: a pink column of light over a pad
  function drawRecharge(r, s) {
    r.queue(s.x, -4, s.z, g => { const [x, y] = r.w(s.x, -4, s.z), k = .5 + .5 * Math.sin(game.time * 4);
      px.rect(g, x - 12, y - 4, 24, 4, '#6a5470'); px.rect(g, x - 3, y - 34, 6, 30, '#4a3a50'); add(g, .5 + .4 * k, () => { px.rect(g, x - 1, y - 32, 2, 26, '#ff7ac0'); px.disc(g, x, y - 36, 4, '#ff7ac0'); }); }, { bias: -1 });
    game.lights.add(s.x, 0, s.z + 24, 50, .6, { color: '#ff7ac0' });
  }
  // the hatches: the gate's color, a pulse down its middle
  const drawGates = r => { for (const q of gates) r.queue(q.x, 2, q.z, g => { const [x, y] = r.w(q.x, 0, q.z + T), k = .5 + .5 * Math.sin(game.time * 4 + q.z * .05); add(g, .35 + .35 * k, () => px.rect(g, x - 2, y + 1, 4, T - 2, E.mix(q.c, '#ffffff', .4))); }, { bias: 1 }); };
  // a boss's doorways sealed while it lives: a wall of light
  const drawSeals = r => { if (bossHere()) for (const q of seals) r.queue(q.x, 2, q.z, g => { const [x, y] = r.w(q.x, 0, q.z + T), k = .6 + .4 * Math.sin(game.time * 9 + q.z); add(g, k, () => { px.rect(g, x - 3, y, 6, T, '#ff4a6a'); px.rect(g, x - 1, y, 2, T, '#ffe0e8'); }); }, { bias: 1 }); };
  const drawRing = (r, q) => r.queue(q.x, 0, q.z, g => { const [x, y] = r.w(q.x, 0, q.z); px.disc(g, x, y, 5, '#2a2a3a'); px.disc(g, x, y, 4, '#8af0ff'); px.disc(g, x, y, 2.4, '#1a2a3a'); add(g, .4 + .2 * Math.sin(game.time * 5), () => px.disc(g, x, y, 7, '#5ad0ff')); });
  // an item: a glowing orb in the colors of what it gives, with its sign
  const ITEM = { boots: ['#38c060', 'J'], dash: ['#3a8ae8', '>'], tank: ['#e04a8a', '+'] };
  function drawItem(r, it) {
    const [c, sign] = ITEM[it.kind], b = Math.sin(game.time * 3) * 2;
    r.queue(it.x, 1, it.z, g => { const [x, y] = r.w(it.x, 0, it.z + 7 + b); add(g, .5, () => px.disc(g, x, y, 11, c)); px.disc(g, x, y, 6.5, E.shade(c, -.3)); px.disc(g, x, y, 5.5, c); px.disc(g, x - 2, y - 2, 2, '#ffffff'); E.font.text(g, sign, x + 1, y - 2, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); });
    game.lights.add(it.x, 0, it.z + 8, 40, .8, { color: c });
  }
  // the creatures, drawn by hand: f.flash whitens a hit
  function drawFoe(r, f) {
    const t = game.time + f.t, W = f.flash > 0 ? '#ffffff' : null;
    if (f.kind === 'warden') return drawWarden(r, f, W);
    r.actor(f.x, 0, f.z, (g, x, y) => {
      if (f.kind === 'crawler') {   // a spiked shell on short legs (crouch to shoot it)
        const c = E.tones(W || '#c8783a'), s = Math.sin(t * 12);
        for (let i = -1; i <= 1; i++) px.line(g, x + i * 6, y - 4, x + i * 6 + s * 2 * (i ? i : 1), y, '#3a1a10', 2);
        px.ell(g, x, y - 10, 11, 8, c.deep); px.ell(g, x, y - 11, 10, 7, c.base); px.ell(g, x - 3, y - 14, 5, 3, c.lt);
        for (let i = -2; i <= 2; i++) px.poly(g, [[x + i * 4 - 2.5, y - 16 + Math.abs(i) * 1.5], [x + i * 4 + 2.5, y - 16 + Math.abs(i) * 1.5], [x + i * 5.5, y - 23 + Math.abs(i) * 2.5]], W || '#f0c060');
        px.disc(g, x + f.dir * 8, y - 8, 1.6, '#ff3a3a');
      } else if (f.kind === 'flyer') {   // folded under the ceiling; diving, a spinning drill
        const c = E.tones(W || '#8a4ab8'), Y = y - 6;
        if (f.state === 'idle') { px.ell(g, x, Y, 6, 7, c.sh); px.ell(g, x - 1, Y - 1, 4, 5, c.base); px.dot(g, x - 2, Y + 3, '#ffe0ff'); px.dot(g, x + 2, Y + 3, '#ffe0ff'); }
        else { const s = Math.sin(t * 30) * 6; px.poly(g, [[x - 7, Y - 4], [x + 7, Y - 4], [x, Y + 9]], c.sh); px.poly(g, [[x - 7 + s, Y - 5], [x + s * .3, Y + 8], [x + 1, Y - 5]], c.lt); px.line(g, x - 9, Y - 5, x + 9, Y - 5, c.base, 2); }
      } else if (f.kind === 'turret') {   // a dome and its barrel turned to the hero
        const up = f.ceil ? -1 : 1, base = up < 0 ? y - f.h : y, cy = base - up * 9, c = E.tones(W || '#8a94a8'), a = f.a;
        px.rect(g, x - 4, Math.min(base, cy), 8, 9, c.deep); px.rect(g, x - 9, base - (up > 0 ? 2 : 0), 18, 2, c.sh);
        px.line(g, x, cy, x + Math.cos(a) * 12, cy - Math.sin(a) * 12, '#3a4050', 3);
        px.disc(g, x, cy, 7, c.sh); px.disc(g, x - 1, cy - 1, 5.5, c.base); px.disc(g, x - 2, cy - 2, 2, c.hi);
        add(g, f.cool < .5 ? 1 : .5, () => px.disc(g, x, cy, 2, '#ff6a3a'));
      } else if (f.kind === 'drone') {   // a ball with one red eye and a hover ring
        const c = E.tones(W || '#a0a8b8'), b = Math.sin(t * 6) * 1.5, Y = y - 7 + b;
        add(g, .4, () => px.ell(g, x, Y + 9, 8, 2, '#5ae0ff'));
        px.disc(g, x, Y, 7, c.deep); px.disc(g, x - .5, Y - .5, 6, c.base); px.disc(g, x - 2, Y - 2, 2, c.hi);
        const ex = x + clamp((hero.x - f.x) / 40, -2.5, 2.5); px.disc(g, ex, Y, 2.6, '#2a0a0a'); px.disc(g, ex, Y, 1.6, f.state === 'lunge' ? '#ffffff' : '#ff3a3a');
      } else if (f.kind === 'carapace') drawCarapace(g, x, y, f, W);
    }, { flash: !!W });
    if (f.kind === 'drone' || f.kind === 'turret') game.lights.add(f.x, 0, f.z + 6, 26, .5, { color: '#ff4a3a' });
  }
  // the CARAPACE: a domed shell over six legs, a horned head, mandibles; its back glows rearing and while dazed
  function drawCarapace(g, x, y, f, W) {
    const d = f.dir, t = game.time, c = E.tones(W || '#3a8a8a'), walk = Math.sin(t * (f.state === 'charge' ? 24 : 9)), dz = f.state === 'dazed';
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const lx = x + (i - 1) * 11 * d, k = (i % 2 ? walk : -walk) * s; px.line(g, lx, y - 8, lx + d * 4 + k * 3, y, '#1a3a3a', 2); }
    px.ell(g, x, y - 14, 22, 13, c.deep); px.ell(g, x - d, y - 15, 21, 12, c.sh); px.ell(g, x - d * 3, y - 18, 16, 8, c.base); px.ell(g, x - d * 6, y - 22, 8, 3, c.lt);
    for (let i = -1; i <= 1; i++) px.line(g, x + i * 8 - d * 3, y - 26 + Math.abs(i) * 2, x + i * 10 - d * 3, y - 6, c.deep);
    const glow = f.state === 'rear' ? .6 + .4 * Math.sin(t * 30) : dz ? .5 : 0;
    if (glow) add(g, glow, () => { px.ell(g, x - d * 8, y - 18, 10, 7, '#ffb040'); px.ell(g, x - d * 8, y - 19, 5, 3, '#fff0c0'); });
    const hx = x + d * 22, hy = y - 11; px.disc(g, hx, hy, 8, E.tones(W || '#2a6a6a').sh); px.disc(g, hx + d, hy - 1, 6, E.tones(W || '#2a6a6a').base);
    px.poly(g, [[hx + d * 3, hy - 5], [hx + d * 14, hy - 16], [hx + d * 6, hy - 3]], W || '#e8e0c0');   // the horn
    const mo = f.state === 'charge' ? 4 : 2 + Math.sin(t * 6); for (const s of [-1, 1]) px.line(g, hx + d * 6, hy + 2, hx + d * 12, hy + 2 + s * mo, '#e8e0c0', 2);
    px.dot(g, hx + d * 3, hy - 2, '#ff4a3a');
    if (dz) for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; px.dot(g, hx + Math.cos(a) * 9, hy - 14 + Math.sin(a) * 3, '#ffe060'); }
  }
  // the WARDEN: a shell of plates round an eye, grown into the wall by its pipes; the plates part to open it
  function drawWarden(r, f, W) {
    r.queue(f.x, 0, f.z + 46, g => {
      const [x, y] = r.w(f.x, 0, f.z + 46), t = game.time, o = f.open, c = E.tones(W || '#b04a6a'), [ex0, ez0] = EYE(f), [ex, ey] = r.w(ex0, 0, ez0);
      for (let i = 0; i < 5; i++) { const yy = y - 40 + i * 20; px.line(g, x + 30, yy, x + 70, yy + Math.sin(t + i) * 4, '#3a1a2a', 6); px.line(g, x + 30, yy - 1, x + 70, yy - 1 + Math.sin(t + i) * 4, '#6a2a4a', 2); }
      px.disc(g, x, y, 48, c.deep); px.disc(g, x - 2, y - 2, 45, c.sh); px.ell(g, x - 10, y - 22, 26, 12, c.base); px.ell(g, x - 14, y - 28, 12, 4, c.lt);
      const eye = clamp(Math.atan2(r.w(hero.x, 0, hero.z + 14)[1] - ey, r.w(hero.x, 0, 0)[0] - ex), -2.4, 2.4);
      // the eye under the plates
      px.disc(g, ex, ey, 16, '#2a0a14'); px.disc(g, ex, ey, 14, '#f0e0d0'); px.disc(g, ex + Math.cos(eye) * 5, ey + Math.sin(eye) * 5, 7, '#c82a3a'); px.disc(g, ex + Math.cos(eye) * 6, ey + Math.sin(eye) * 6, 3, '#1a0a0a');
      add(g, .3 + o * .5, () => px.disc(g, ex, ey, 18, '#ff6a8a'));
      for (const s of [-1, 1]) {   // the plates: they slide apart up and down as it opens
        const sh = s * (6 + o * 20); px.ell(g, ex + 4, ey + sh - s * 2, 22, 13, c.base); px.ell(g, ex + 2, ey + sh - s * 6, 16, 5, c.lt);
        for (let i = -1; i <= 1; i++) px.line(g, ex + i * 8, ey + sh - s * 10, ex + i * 9 + 2, ey + sh + s * 6, c.deep);
      }
      if (f.state === 'beam') {   // the warning line, then the beam along the floor
        const [, fy] = r.w(0, 0, 10); if (f.st < .9) { if (Math.floor(t * 16) % 2) px.rect(g, 0, Math.round(fy), ex - 10, 1, '#ff3a3a'); }
        else if (f.st < 1.5) add(g, 1, () => { px.rect(g, 0, Math.round(fy) - 10, ex - 10, 20, '#ff3a5a'); px.rect(g, 0, Math.round(fy) - 3, ex - 10, 6, '#ffe0e8'); });
      }
    }, { bias: -1 });
    game.lights.add(EYE(f)[0], 0, EYE(f)[1], 120, .6 + f.open * .6, { color: '#ff5a7a' });
  }
  function draw(r) {
    const R = world.room, area = R.def.area, ar = AREAS[area], g = r.ctx, t = game.time;
    L.enabled = true; L.ambient = ar.amb;
    sky(r, g, ar, area); backs[R.id].draw(r); world.draw(r); drawGates(r); drawSeals(r);
    if (ship) drawShip(r, ship); if (station) drawStation(r, station); if (recharge) drawRecharge(r, recharge);
    for (const q of rings) drawRing(r, q);
    for (const it of items) drawItem(r, it);
    for (const o of orbs) r.queue(o.x, 1, o.z, g2 => { const [x, y] = r.w(o.x, 0, o.z + 4); add(g2, .6, () => px.disc(g2, x, y, 5, '#ff5aa0')); px.disc(g2, x, y, 2.5, '#ffd0e8'); });
    for (const f of foes) if (!f.dead) drawFoe(r, f);
    // the hero: blinking while hurt, the dash's ghosts, the charge's glow at the muzzle; the lash; the cannon's light
    const m = rig.tip(), blink = inv > 0 && Math.floor(game.real * 16) % 2 === 0;
    if (!(dead > 0 && dead < 1.6)) r.actor(hero.x, 0, hero.z, (g2, ox, oy) => rig.draw(g2, ox, oy, r.view), { alpha: blink ? .45 : 1, ghost: hero.dashing > 0 && (game.real * 60 | 0) % 3 === 0 ? { color: '#5a8aff', life: .25 } : null });
    if (charge > .15) r.queue(m[0], 3, m[2], g2 => { const [x, y] = r.w(m[0], 0, m[2]), k = clamp(charge / .7, 0, 1); add(g2, .5 + .5 * Math.sin(t * 30), () => px.disc(g2, x, y, 2 + k * 4, k >= 1 ? '#ffe060' : '#a0f0ff')); });
    if (lash) r.queue(m[0], 3, m[2], g2 => {
      const [x0, y0] = r.w(m[0], 0, m[2]), q = lash.ring, [x1, y1] = q ? r.w(q.x, 0, q.z) : lash.end ? r.w(lash.end[0], 0, lash.end[1]) : [x0, y0];
      add(g2, 1, () => { for (let i = 0; i < 8; i++) { const u = i / 8, v = (i + 1) / 8, w = q ? 0 : Math.sin(u * 9 + t * 40) * 2; px.line(g2, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + w, x0 + (x1 - x0) * v, y0 + (y1 - y0) * v, i % 2 ? '#8af0ff' : '#ffffff', 2); } });
    });
    for (const f of fx) if (f.kind === 'muzzle') r.queue(f.x, 3, f.z, g2 => { const [x, y] = r.w(f.x, 0, f.z); add(g2, 1 - f.t / f.max, () => { px.disc(g2, x, y, f.size, '#fff0a0'); px.disc(g2, x, y, f.size * .5, '#ffffff'); }); });
    shots.draw(r);
    game.lights.add(hero.x, 0, hero.z + 18, 80, .9, { color: '#ffe8c8' }); game.lights.add(m[0], 0, m[2], 30, .5 + (charge > .7 ? .4 : 0), { color: '#a0ff8a' });
    for (const b of shots.list) game.lights.add(b.x, 0, b.z, b.r * 6, .5, { color: b.color });
    world.map.drawWater(r);
    world.drawOver(r);
    r.overlay(g2 => { hud(g2, r); if (mapOpen) mapScreen(g2, r); });
  }
  /* ---- THE HUD, THE MAP ---- */
  const S = { shadow: '#000000', outline: false }, SC = Object.assign({ align: 'center' }, S);
  // ENERGY: the full tanks as squares over the rest as a number (Super Metroid); the abilities got; the minimap: the
  // five by three cells round the hero, top right (clear of the corner's buttons)
  function hud(g, r) {
    const full = Math.min(tanks(), Math.floor(hp / 100)), rest = hp - full * 100;
    for (let i = 0; i < tanks(); i++) { px.rect(g, 30 + i * 7, 5, 6, 5, '#000000'); px.rect(g, 31 + i * 7, 6, 4, 3, i < full ? '#ff5aa0' : '#3a2a3a'); }
    E.font.text(g, 'EN', 6, 12, '#ffd0e8', S); E.font.text(g, String(rest).padStart(2, '0'), 22, 10, rest < 25 && !full ? (Math.floor(game.real * 6) % 2 ? '#ff4a4a' : '#ffffff') : '#ffffff', { scale: 2, shadow: '#000', outline: false });
    let ix = 6; for (const [k, c, s] of [['boots', '#38c060', 'BOOTS'], ['dash', '#3a8ae8', 'DASH']]) if (world.has(k)) { px.rect(g, ix, 25, 4, 4, c); E.font.text(g, s, ix + 6, 24, '#c8d0e0', Object.assign({ font: 'tiny' }, S)); ix += 32; }   // (the abilities under it)
    const cell = 7, mx = cornerX() - 5 * cell - 6, my = touch() ? 6 : 14, G = world.grid, h = world.here || [G.x0, G.y0];
    px.rect(g, mx - 2, my - 2, 5 * cell + 4, 3 * cell + 4, '#000000'); px.rect(g, mx - 1, my - 1, 5 * cell + 2, 3 * cell + 2, '#2a3048');
    g.save(); g.beginPath(); g.rect(mx, my, 5 * cell, 3 * cell); g.clip();
    world.drawMap(g, mx + (2 - (h[0] - G.x0)) * cell, my + (1 - (h[1] - G.y0)) * cell, cell);
    g.restore(); g._c = null;
    // the room's name on a first visit; an item's banner; the controls at first; the end
    if (banner && !got && !mapOpen) { const a = clamp(Math.min(banner.t * 3, (2.4 - banner.t) * 2), 0, 1); if (a > .05) px.blend(g, a, 'normal', () => { px.rect(g, 0, 34, r.W, 15, '#000000'); E.font.text(g, banner.text, r.W / 2, 38, '#e8f0ff', SC); }); }
    if (got) { const y = Math.round(r.H * .36); E.ui.box(g, r.W / 2 - 110, y - 6, 220, 40, { bg: ['#1a2a4a', '#0a1020'], border: '#8ab0e8' }); E.font.title(g, got.title, r.W / 2, y, { scale: 2, align: 'center', colors: ['#ffffff', '#c8e0ff', '#6a9ae0'] }); E.font.text(g, got.text, r.W / 2, y + 20, '#e8f0ff', Object.assign({ font: 'tiny' }, SC)); }
    if (hint > 0 && !got && !banner && age > 1) {
      const s = touch() ? 'STICK MOVES AND AIMS  •  FIRE BESIDE A FOE: THE LASH  •  MAP' : [label('jump') + ' JUMP', label('fire') + ' FIRE (HOLD)', label('melee') + ' LASH', 'HOLD ' + label('lock') + ' AIM', label('map') + ' MAP'].join('  •  ');
      const ta = game.input.touchArea && game.input.touchArea(), y = ta ? Math.round(ta.y0) - 16 : r.H - 16;   // (above the touch buttons)
      px.blend(g, .6 * clamp(hint, 0, 1), 'normal', () => px.rect(g, 0, y, r.W, 12, '#000000')); E.font.text(g, s, r.W / 2, y + 3, '#d8e0ff', Object.assign({ font: E.font.width(s) > r.W - 8 ? 'tiny' : undefined }, SC));
    }
    const bf = foes.find(f => f.boss && !f.dead);
    if (bf) { const w = Math.round(120 * bf.hp / bf.max), x = Math.round(r.W / 2 - 60), y = 16; E.font.text(g, bf.boss, r.W / 2, y - 9, '#ffb0c0', Object.assign({ font: 'tiny' }, SC)); px.rect(g, x - 1, y - 1, 122, 6, '#000000'); px.rect(g, x, y, w, 4, '#e04a6a'); px.rect(g, x, y, w, 1, '#ffb0c0'); }   // (top middle: clear of the floor it fights on)
    if (won && wonT > 1.2) { E.ui.box(g, r.W / 2 - 100, r.H / 2 - 30, 200, 52, { bg: ['#2a1a3a', '#0a0612'], border: '#ffd080' }); E.font.title(g, 'MISSION COMPLETE', r.W / 2, r.H / 2 - 24, { scale: 2, align: 'center', colors: ['#fffbe8', '#ffd36a', '#e0662a'] }); E.font.text(g, 'MAP ' + explored() + '%  •  ITEMS ' + world.got.size + ' OF 3', r.W / 2, r.H / 2 + 2, '#e8e0ff', SC); }
    if (dead > 0) px.blend(g, clamp(1 - dead / 2, 0, 1), 'normal', () => { px.rect(g, 0, 0, r.W, r.H, '#000000'); E.font.text(g, 'THE SUIT FAILS...', r.W / 2, r.H / 2 - 4, '#ff8a8a', SC); });
  }
  const explored = () => { const C = world.cells(); return Math.round(100 * C.filter(c => c.seen).length / C.length); };
  // the map screen: the whole grid, what was seen, the doors, S and B, the hero blinking; what was found
  function mapScreen(g, r) {
    px.blend(g, .9, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#04060e'));
    const G = world.grid, cell = Math.max(6, Math.min(18, Math.floor((r.W - 32) / G.w), Math.floor((r.H - 96) / G.h))), w = G.w * cell, h = G.h * cell, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2) + 6;
    E.font.title(g, 'MAP', r.W / 2, y - 42, { scale: 2, align: 'center', colors: ['#ffffff', '#a0c0ff', '#4a6ad0'] });
    E.font.text(g, world.room.def.name + '  •  EXPLORED ' + explored() + '%', r.W / 2, y - 20, '#c8d8ff', SC);
    for (let a = 0; a <= G.w; a++) for (let b = 0; b <= G.h; b++) px.dot(g, x + a * cell, y + b * cell, '#1e2a48');
    world.drawMap(g, x, y, cell);
    // what was found: a square for each, lit once it is got
    const found = [['boots', 'SPRING BOOTS', world.has('boots')], ['dash', 'PHASE DASH', world.has('dash')], ['tank', 'ENERGY TANK', tanks() > 0]], wd = found.reduce((s, f) => s + E.font.width(f[1]) + 18, -8);
    let fx0 = Math.round((r.W - wd) / 2); for (const [k, s, on] of found) { px.rect(g, fx0, y + h + 11, 7, 7, '#000000'); px.rect(g, fx0 + 1, y + h + 12, 5, 5, on ? ITEM[k][0] : '#2a3048'); E.font.text(g, s, fx0 + 10, y + h + 10, on ? '#e8f0ff' : '#6a7898', S); fx0 += E.font.width(s) + 18; }
    E.font.text(g, 'S SAVE ROOM   B A BOSS   ' + label('map') + ' CLOSES', r.W / 2, y + h + 24, '#8a9ac8', Object.assign({ font: 'tiny' }, SC));
  }

  /* ---- THE BOT (tools/kits-test.mjs): it plays the route with the keys, from the landing site to the WARDEN ---- */
  // the route, room by room and by what is got: waypoints [x, z, how] in tiles (x across, z the feet's height); how:
  // '' walk there, 'j' jump there (the next waypoint is the landing; z on it: where it must land, or it tries again),
  // 'J' jump twice, 'c' crawl, 'r' climb the rope to z, 's' swim to x, z, 'b' along the bars to x, then let go,
  // 'g' fetch what lies in the room, 'f' fight the boss
  const ROUTE = {
    landing: () => [[21.5, null, 'j'], [26.5], [40.6]],
    caverns: () => [[15.6], [29.6, null, 'c'], [40.6]],
    shaft: w => !w.has('boots') ? [[8.5], [12, 8, 's'], [18, 3, 's'], [20.6, 3, 's']]
      : !w.has('dash') ? [[5.5, 14.4, 's'], [5.5, 33.6, 'r'], [5.5, null, 'j'], [10, 32], [20.6]]
      : [[7.5], [7.5, 15, 's'], [14, 15.6, 's'], [14.3, null, 'j'], [16.5, 17], [20.6]],
    shrine: w => !w.has('boots') ? [[10.5, 8.4, 's'], [11, null, 'j'], [13.5, 9], [15.5, null, 'g']] : [[11.4], [6, 4, 's'], [-.6, 3.5, 's']],
    save: w => w.has('dash') ? [[-.6]] : [[20.6]],
    tower: w => !w.has('dash') ? [[12.3, null, 'J'], [15.5, 8], [13.3, null, 'J'], [10, 11], [8.4, null, 'J'], [4, 14], [6.4, null, 'J'], [11.5, 17, 'r'], [11.5, 25.3, 'r'],
      [11.5, null, 'j'], [15.5, 26], [14.3, null, 'J'], [10.5, 29], [9.4, null, 'J'], [6, 32], [-.6]]
      : [[10.5], [13.6], [12.3], [-.6]],
    arena: w => w.has('dash') ? [[20.6]] : [[14, null, 'f'], [0, null, 'g'], [20.6]],
    lab: () => [[8.5, null, 'j'], [26.6, null, 'b'], [40.6]],
    cryo: () => [[6.9, null, 'J'], [14, 2], [20.6]],
    lift: () => [[8.5, null, 'J'], [8.5, 7], [7, null, 'J'], [2.5, 12], [4.5, null, 'J'], [9, 17], [20.6]],
    reactor: () => [[21, null, 'f']]
  };
  function pilot() {
    const I = game.input, w = world, R = w.room, key = R.id + (w.has('boots') ? 'B' : '') + (w.has('dash') ? 'D' : ''), hold = new Set(), tap = new Set();
    if (!bolt || bolt.key !== key) bolt = { key, i: 0, t: 0, sgn: 0, jump: 0, dj: false, stroke: 0, last: -1 };
    const list = (ROUTE[R.id] || (() => []))(w), wp = list[Math.min(bolt.i, list.length - 1)] || [hero.x / T], how = wp[2] || '', hx = hero.x / T, hz = hero.z / T, dt = 1 / 120;
    if (bolt.last !== bolt.i) { bolt.last = bolt.i; bolt.sgn = 0; bolt.t = 0; } bolt.t += dt;
    let tx = how === 'g' ? (items[0] ? items[0].x / T : hx) : wp[0];
    const dx = tx - hx, step = () => { bolt.i++; };
    if (!bolt.sgn && Math.abs(dx) > .3) bolt.sgn = Math.sign(dx);
    const atX = Math.abs(dx) < .3 || (bolt.sgn && Math.sign(dx) !== bolt.sgn), boss = foes.find(f => f.boss && !f.dead), foot = hero.onGround || hero.onRope || hero.swimming;
    if (how === 'f') { if (boss) fightBoss(boss, hold, tap); else step(); }
    else {
      if (!atX || how === 's' || (how === 'b' && hero.onBars)) hold.add(dx > 0 ? 'right' : 'left');
      if (how === 'c') hold.add('down');
      if (!how && wp[1] != null && !hero.onGround && hz < wp[1] + .2 && (hero.vz > 0 || bolt.dj)) { hold.delete('left'); hold.delete('right'); }   // (a landing above: rise first, then over)
      if (how === 'r') { hold.add('up'); if (hero.swimming && (bolt.stroke -= dt) <= 0) { tap.add('jump'); bolt.stroke = .3; } if (hero.onRope) { hold.delete('left'); hold.delete('right'); if (hz >= wp[1]) step(); } }
      else if (how === 's') {   // strokes up to z, or down to it; there once near
        if (Math.abs(dx) < .4) { hold.delete('left'); hold.delete('right'); }
        if (hz < wp[1] - .3) { if ((bolt.stroke -= dt) <= 0) { tap.add('jump'); bolt.stroke = .28; } } else if (hz > wp[1] + .5) hold.add('down');
        if (Math.abs(dx) < .6 && Math.abs(hz - wp[1]) < .8) step();
      } else if (how === 'b') { if (hero.onBars) { if (hx >= tx - .05) { hold.add('down'); step(); } } else if (atX && hero.onGround) step(); }
      else if (how === 'g') { if (!items.length) step(); }
      else if (how === 'j' || how === 'J') { if (atX && foot) { const nx = (list[bolt.i + 1] || [])[0]; if (nx != null && Math.abs(nx - hx) > .3) { hold.delete('left'); hold.delete('right'); hold.add(nx > hx ? 'right' : 'left'); } tap.add('jump'); bolt.jump = .5; bolt.dj = how === 'J'; step(); } }   // (toward the landing)
      else if (atX) {   // a landing: on the ground, at its height (else back to the jump before it)
        if (wp[1] == null) step();
        else if (hero.onGround) { if (Math.abs(hz - wp[1]) < .7) step(); else if (bolt.i > 0 && /[jJ]/.test((list[bolt.i - 1] || [])[2] || '') && hz < wp[1]) { bolt.i = Math.max(0, bolt.i - 2); } }
      }
      // in the air: the jump held to its top, the second jump there
      if (bolt.jump > 0) { bolt.jump -= dt; if (hero.vz > 0) hold.add('jump'); else if (bolt.dj && !hero.onGround && w.has('boots')) { tap.add('jump'); bolt.dj = false; bolt.jump = .4; } }
      if (hero.onGround && hero.hitWall && hold.has(hero.hitWall > 0 ? 'right' : 'left') && !hold.has('down')) { tap.add('jump'); bolt.jump = .5; bolt.dj = true; }   // (a step in the way: hop it)
      if (hero.hanging && how !== 'b') hold.add('up');   // (a ledge caught: climb it; a wall clung to: leap up it)
      if (hero.clinging && (bolt.cling = (bolt.cling || 0) + dt) > .15) { tap.add('jump'); bolt.cling = 0; }
      combat(hold, tap);
    }
    // jump is pressed as a key goes down: held from the press while rising; a second press lets go a step first
    if (tap.has('jump')) { tap.delete('jump'); if (bolt.held) bolt.queue = true; else hold.add('jump'); }
    else if (bolt.queue) { hold.add('jump'); bolt.queue = false; }
    else if (!bolt.held) hold.delete('jump');   // (held only from a press)
    bolt.held = hold.has('jump');
    for (const a of ['left', 'right', 'up', 'down', 'jump', 'lock', 'fire']) I.hold(a, hold.has(a) && !(a === 'fire' && tap.has('fire')));
    for (const a of tap) I.tap(a);
  }
  // on the way: a creature ahead on the floor is shot crouching; one above, aimed at standing still (lock); the shots
  // come every other step
  function combat(hold, tap) {
    if (!hero.onGround || hero.swimming) return;
    const shoot = Math.floor(game.time * 9) % 2 === 0;
    for (const f of foes) {
      if (f.dead || f.boss) continue;
      const dx = f.x - hero.x, dz = f.z - hero.z, ahead = Math.sign(dx) === hero.facing || Math.abs(dx) < 10;
      if (f.kind === 'crawler' && Math.abs(dx) < 7 * T && Math.abs(dz) < T && ahead) { hold.delete('left'); hold.delete('right'); if (Math.sign(dx) !== hero.facing) hold.add(dx > 0 ? 'right' : 'left'); hold.add('down'); if (shoot) tap.add('fire'); return; }
      if ((f.kind === 'drone' || f.kind === 'turret' || (f.kind === 'flyer' && f.state === 'idle')) && Math.abs(dx) < 6 * T && dz > 1.5 * T && dz < 7 * T && clearLine(hero.x, hero.z + 27, f.x, f.z + f.h / 2)) {
        hold.clear(); hold.add('lock'); hold.add('up'); if (Math.abs(dx) > 1.2 * T) hold.add(dx > 0 ? 'right' : 'left'); if (shoot) tap.add('fire'); return;
      }
    }
  }
  // the bosses: the beetle is jumped as it charges and shot dazed (or from behind); the warden's eye is shot from
  // range while it is open, its orbs and beam jumped
  function fightBoss(f, hold, tap) {
    const dx = f.x - hero.x, ad = Math.abs(dx), dirTo = Math.sign(dx) || 1, shoot = Math.floor(game.time * 9) % 2 === 0;
    if (f.kind === 'carapace') {
      if (f.state === 'charge' && Math.sign(f.vx) === dirTo * -1 && ad < 5 * T && hero.onGround) { tap.add('jump'); bolt.jump = .6; bolt.dj = true; }
      else if (f.state === 'dazed' || (Math.sign(dx) === f.dir && f.state !== 'charge')) { if (ad > 2.2 * T) hold.add(dirTo > 0 ? 'right' : 'left'); else { hold.add('lock'); hold.add(dirTo > 0 ? 'right' : 'left'); if (shoot) tap.add('melee'); } if (shoot) tap.add('fire'); }
      else if (ad < 3.5 * T && f.state !== 'charge') hold.add(dirTo > 0 ? 'left' : 'right');
      else { hold.add('lock'); hold.add(dirTo > 0 ? 'right' : 'left'); if (shoot) tap.add('fire'); }
    } else {
      const want = 21 * T; if (Math.abs(hero.x - want) > T) hold.add(hero.x < want ? 'right' : 'left'); else { hold.add('lock'); hold.add('right'); if (f.open > .5) { if (shoot) tap.add('fire'); } else hold.add('fire'); }   // (charged while it is shut, let go when it opens)
      const orb = shots.list.some(b => b.team === 'foe' && b.vx < 0 && b.x - hero.x < 34 && b.x > hero.x && Math.abs(b.z - hero.z - 14) < 18);
      if (hero.onGround && ((f.state === 'beam' && f.st > .65 && f.st < 1.2) || orb)) { tap.add('jump'); bolt.jump = .6; bolt.dj = f.state === 'beam'; }
    }
    if (bolt.jump > 0) { bolt.jump -= 1 / 120; if (hero.vz > 0) hold.add('jump'); else if (bolt.dj && !hero.onGround) { tap.add('jump'); bolt.dj = false; bolt.jump = .4; } }
  }
  function bot(s = 1, stop) {   // (stop: { room, after } leaves the game there, after seconds in that room: for pictures)
    const was = Math.random, I = game.input; Math.random = E.rng(s); bolt = null;
    try {
      mode = 'bot'; game.go('metroidvania', null, { fade: 0 }); game.advance(1 / 120);
      const path = [world.room.id], seenAt = {}; let n = 0, deaths = 0, stall = 0, where = '';
      for (; n < 120 * 900 && !won; n++) {
        pilot(); game.advance(1 / 120);
        if (path[path.length - 1] !== world.room.id) { path.push(world.room.id); seenAt[world.room.id] = world.seen.size; }
        if (dead > 0 && dead - 1 / 120 <= 0) deaths++;
        if (stop && world.room.id === stop.room && (stop.t = (stop.t || 0) + 1 / 120) >= (stop.after || 0)) return { stopped: world.room.id, seconds: Math.round(n / 120) };
        const k = bolt.key + ':' + bolt.i; if (k === where && !bossHere()) { if (++stall > 120 * 40) break; } else { where = k; stall = 0; }   // (stuck 40 s, a fight aside: give up)
      }
      const beat = won, seen = world.seen.size, saved = E.store.get('rooms:mv-bot');
      const at = { room: world.room.id, wp: bolt && bolt.i, x: Math.round(hero.x / T * 10) / 10, z: Math.round(hero.z / T * 10) / 10, hp };
      start({ id: 'mv-bot' }); const loaded = { room: world.room.id, got: [...world.got], seen: world.seen.size };
      return { won: beat, path, seen, cells: world.cells().length, seenAt, saved: !!saved, loaded, seconds: Math.round(n / 120), deaths, at, errors: game.errors.length };
    } finally { for (const a of ['left', 'right', 'up', 'down', 'fire', 'lock', 'jump', 'melee']) I.hold(a, false); Math.random = was; if (!stop) mode = null; }
  }

  return { view: 'side', views: ['side'], input: KEYS, res: 'ps1', pausable: true, touch: ['jump', 'fire', 'dash', 'map'], camera: { zoom: [.75, 1.5], tall: 1.6 },
    enter(d) {
      const part = d && d.part;
      if (mode === 'bot') { E.store.remove('rooms:mv-bot'); start({ id: 'mv-bot', fresh: true }); }
      else if (mode === 'proof') { mode = null; start({ id: 'mv-proof', fresh: true }); }
      else if (part === 'boss') start({ id: 'mv-practice', fresh: true, at: 'reactor', got: ['boots', 'dash'] });
      else if (part === 'miniboss') start({ id: 'mv-practice', fresh: true, at: 'arena', got: ['boots'] });
      else { start(); if (part === 'map') mapOpen = true; }
      game.cam.align = 'center';
    },
    exit() { L.enabled = false; game.cam.align = null; }, update, draw, bot,
    state: () => { const b = shots.list.filter(b => b.team === 'player').pop(); return { room: world.room.id, x: hero.x, z: hero.z, hp, got: [...world.got], seen: world.seen.size, foes: foes.filter(f => !f.dead).length, mapOpen, won, dead: dead > 0, shot: b ? { vx: b.vx, vz: b.vz } : null }; },   // (for tests)
    world: () => world, hero: () => hero, rig: () => rig, foes: () => foes, go: (id, x, z) => { world.enter(id); hero.x = x; hero.z = z; hero.vx = hero.vz = 0; arrive(); world.update(0, hero); },   // (for tests)
    /** the proof: a fresh run from the landing site: right past the ship, jumping, firing, a crouch and a lash; a hash of it */
    run: (n = 600) => proof('metroidvania', n, (i, k) => { if (!i) k.hold('right'); if (i % 90 === 40) k.tap('jump'); if (i % 30 === 10) k.tap('fire'); if (i === 300) k.tap('melee'); if (i === 400) k.hold('down'); if (i === 460) k.up('down'); },
      () => [hero.x, hero.z, hp, world.room.id, foes.map(f => [f.x, f.z, f.hp]), shots.list.length], () => { mode = 'proof'; }) };
})();
scenes.metroidvania = MVANIA;
