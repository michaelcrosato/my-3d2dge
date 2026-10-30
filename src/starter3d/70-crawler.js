/* =====================================================================================
 * SLICE 7  CRAWLER  (Wizardry, Dungeon Master, Eye of the Beholder, King's Field). @modules grid
 * The Lantern Vaults in first person, a cell at a time: W and S (or up and down) step forward and back, A and D turn a
 * quarter turn, Q and E step aside, each one tweened. A party of four, their portraits under the view: two in front who
 * fight, two behind who cast. J (or a click on the view) uses what is in front (a lever, a locked gate) or has the next
 * one ready act: a blow at what stands in front, else the mage's bolt; K the mage's bolt down the corridor, H the
 * cleric's heal, 1 to 4 (or a click on a portrait) that one's own act; Tab the map (what the party has seen: E.Fog).
 * Gates that rise (one with an iron lock), a lever on a wall, plates in the floor (one raises a gate, one springs darts);
 * wisps, slimes, the dead of the vaults and the Warden at the bottom; the stair out behind it. Settings, Turns: REAL TIME
 * (each one's gauge fills on game time, E.Turns 'atb': Dungeon Master, Eye of the Beholder) or TURNS (the vaults wait:
 * each step, turn or blow is the party's turn, the monsters act by their speed, E.Turns 'speed': Wizardry).
 * THE 3D: the camera 'fixed' at the party's eyes, tweened per step; a level of 2 x 2 tiles a cell, braziers in niches,
 * a ceiling and the party's lantern; world.thing gates that rise, and a lever, plates and a stair drawn by the slice;
 * mobs walked cell to cell. Deep link: #crawler/warden (the Warden's hall, its gates open). CRAWLER.run(n): a scripted
 * walk's hash (the proof); CRAWLER.bot(): to the Warden and out
 * ===================================================================================== */
const CRAWLER = (() => {
  const C = 32, PI = Math.PI, EYE = 25, STEP_T = .28, TURN_T = .2, MOVE_T = .4;
  // the four ways, a quarter turn apart: 0 north, 1 east, 2 south, 3 west
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], YAW = d => -PI / 2 + d * PI / 2, WAYS = ['N', 'E', 'S', 'W'];
  /* ---- THE VAULTS: one character a cell (2 metres: 2 x 2 of the level's tiles). # wall, . floor, @ the start (facing
   * north), n a wall with a brazier in a niche, L a wall with a lever, G a gate (raised by what is wired to it), K a gate
   * with an iron lock, P a plate (raises a gate), T a plate that springs darts, X the stair out, i the iron key, h a
   * flask, w wisps, s slimes, k the dead, W the Warden ---- */
  const MAP = [
    '#########n#n###n###n#',
    '#######.....i.#..X..#',
    '#######....k..#..W..#',
    '#######.s.....#.....#',
    '#.....#.....s.###G###',
    'n.w.h.#.......#..P..n',
    '#w....#.......#...k.#',
    '###.######.######K###',
    '###............T..###',
    '######n###G##########',
    '########.....########',
    '#######L.....n#######',
    '########..@..########',
    '#####################'];
  const MW = MAP[0].length, MH = MAP.length, at = (x, y) => (MAP[y] || '')[x] || '#';
  const WALLS = '#nL', wallCell = (x, y) => WALLS.includes(at(x, y));
  // what is wired to what: a lever's or a plate's cell -> the gate it raises
  const WIRES = { '7,11': '10,9', '17,5': '17,4' };
  // a wall cell's open side (a niche's brazier, a lever's face): the first way with floor beyond it
  const openSide = (x, y) => [0, 1, 2, 3].find(d => !wallCell(x + DX[d], y + DY[d]));
  // the level: each cell 2 x 2 tiles; a niche holds a brazier ('t') in the tile on its open side
  const NICHE = [['t#', '##'], ['#t', '##'], ['##', 't#'], ['t#', '##']];
  const rows = [];
  for (let y = 0; y < MH; y++) for (let k = 0; k < 2; k++) {
    let row = ''; for (let x = 0; x < MW; x++) { const c = at(x, y); row += c === 'n' ? NICHE[openSide(x, y)][k] : wallCell(x, y) ? '##' : '..'; }
    rows.push(row);
  }
  const LEVEL = { rows, ground: 'flagstone', colors: { base: '#4a4656', dark: '#34303e', light: '#5a5668' }, side: 'brick', color: '#4e4858', legend: {} };
  const mid = c => c * C + C / 2;

  /* ---- THE PARTY: two in front who fight, two behind who cast; each one's portrait is its rig's (drawPortrait) ---- */
  const PARTY = [
    { name: 'BRAM', role: 'FIGHTER', hp: 46, speed: 100, hit: [8, 13], rig: { build: 'heroic', hat: { style: 'helmet', color: '#8a92a0' }, colors: { cloth: '#7a3a2e', pants: '#3a3440', hair: '#4a2e1e', skin: '#d8a888', metal: '#b8c0cc' } } },
    { name: 'TESK', role: 'ROGUE', hp: 34, speed: 135, hit: [5, 10], rig: { hood: true, colors: { cloth: '#3a5a3e', pants: '#2e2a26', hair: '#2a3a2c', skin: '#c89070' } } },
    { name: 'MAREN', role: 'CLERIC', hp: 30, mp: 16, speed: 90, heal: [12, 19], rig: { hair: 'long', hat: 'band', colors: { cloth: '#d8d0b8', pants: '#8a7a5a', hair: '#c8a050', skin: '#e8c0a0', hat: '#c8a040' } } },
    { name: 'QUILL', role: 'MAGE', hp: 22, mp: 18, speed: 85, bolt: [11, 18], rig: { hat: 'pointed', weapon: null, colors: { cloth: '#3a3a7a', pants: '#2a2a4a', hair: '#e0e0e8', skin: '#e0b090', hat: '#3a3a7a' } } }];
  const BOLT_MP = 4, HEAL_MP = 3;
  /* ---- THE MONSTERS: hp, a blow's damage, speed (100: a turn as the party's), how far they see (cells) ---- */
  const BONE = { bone: '#d8cfb4', cloth: '#2c2434', belt: '#5a4a38', metal: '#b3b8c0', metalDk: '#636872', hilt: '#6a5038' };
  const WARDEN = { cloth: '#3a3a52', pants: '#2a2832', boot: '#1e1c24', belt: '#5a4a30', trim: '#9a8a5a', metal: '#7a8294', metalDk: '#3e4452', skin: '#8a9aa8', hair: '#1a1a22' };
  const KINDS = {
    wisp: { hp: 9, dmg: [2, 4], speed: 150, sight: 4, z: 16 },
    slime: { hp: 20, dmg: [3, 6], speed: 70, sight: 3 },
    skeleton: { hp: 28, dmg: [4, 8], speed: 100, sight: 5, move: 'slash' },
    warden: { hp: 120, dmg: [6, 10], speed: 95, sight: 6, move: 'overhead', boss: true }
  };
  const MARK = { w: 'wisp', s: 'slime', k: 'skeleton', W: 'warden' };

  /* ---- THINGS drawn by this slice (the engine's kinds are in its manual): a lever on a wall, a plate in the floor, the
   * stair out (an arch over steps down, lit once the Warden falls) ---- */
  W3.THINGS.wallLever = (p, t) => {   // its local +y points out of the wall
    const a = t.on ? -1 : 1;
    p.box(0, .8, 20, 6, 1.6, 9, '#4a4452').box(0, 1.8, 20, 2, .8, 5.5, '#24202a')
      .tube(0, 2.2, 20, 0, 3.6, 20 + a * 5, .55, '#a8a8b8').ball(0, 3.8, 20 + a * 5.4, 1.1, 1.1, 1.1, t.on ? '#4ae070' : '#e8483a');
  };
  W3.THINGS.plate = (p, t) => { const s = t.on ? .2 : 1, c = t.color || '#6a6474'; p.box(0, 0, s / 2, 22, 22, s, c).box(0, 0, s + .05, 17, 17, .1, E.shade(c, -.2)); };
  W3.THINGS.stair = (p, t) => {
    const s = '#5a5468';
    p.box(-13, 0, 19, 4, 5, 38, s).box(13, 0, 19, 4, 5, 38, s).box(0, 0, 39, 30, 6, 4, s);
    for (let k = 0; k < 4; k++) p.box(0, -2 - k * 3, -1 - k * 2.5, 22, 3, 2, '#3a3644');   // the steps going down
    if (t.on) p.glow(0, 0, 16, 5 + Math.sin((t.t || 0) * 3) * .8, '#9ae8ff').halo(0, 0, 16, 18, [.15, .3, .38]);
    else p.box(0, 0, 18, 22, 1, 34, '#14121a');
  };

  /* ---- SOUNDS AND MUSIC (the step sequencer's format: original songs) ---- */
  const SOUNDS = {
    step: { wave: 'noise', freq: 320, to: 120, dur: .07, vol: .1, filter: 'lowpass' }, turn: { wave: 'noise', freq: 900, to: 500, dur: .06, vol: .05 },
    thud: [{ wave: 'square', freq: 90, to: 50, dur: .1, vol: .2 }, { wave: 'noise', freq: 300, dur: .06, vol: .12 }],
    swing: { wave: 'noise', freq: 2600, to: 800, dur: .1, vol: .12 }, bolt: [{ wave: 'saw', freq: 220, to: 880, dur: .18, vol: .16 }, { wave: 'noise', freq: 3000, to: 600, dur: .2, vol: .1 }],
    lever: [{ wave: 'square', freq: 260, to: 140, dur: .08, vol: .2 }, { wave: 'noise', freq: 1200, dur: .05, vol: .12, delay: .09 }],
    gate: { wave: 'saw', freq: 70, to: 110, dur: .9, vol: .12, vib: [12, .1], filter: 'lowpass' }, plate: { wave: 'square', freq: 140, to: 90, dur: .1, vol: .2 },
    dart: [{ wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .2 }, { wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .2, delay: .07 }],
    locked: { wave: 'square', freq: 180, dur: .05, vol: .16 }, unlock: { wave: 'square', freq: 660, arp: [0, 7], step: .06, dur: .14, vol: .18 },
    rattle: { wave: 'noise', freq: 2200, arp: [0, 3, 0, 5], step: .04, dur: .2, vol: .1 }, squelch: { wave: 'sine', freq: 140, to: 60, dur: .16, vol: .25 },
    zap: { wave: 'square', freq: 1400, to: 300, dur: .1, vol: .1 }, roar: [{ wave: 'saw', freq: 110, to: 55, dur: 1, vol: .2, vib: [7, .12] }, { wave: 'noise', freq: 500, to: 120, dur: .8, vol: .15, filter: 'lowpass' }]
  };
  const VAULT = { bpm: 72, steps: 4, tracks: [   // the vaults: a slow figure over a drone, water dripping
    { wave: 'triangle', vol: .26, notes: 'A1 - - - - - - - | A1 - - - - - - - | F1 - - - - - - - | E1 - - - - - - -' },
    { wave: 'pulse25', vol: .05, notes: 'A3 . C4 . E4 . . . | D4 . C4 . B3 . . . | A3 . C4 . F4 . E4 . | E4 . . . G#3 . . .' },
    { wave: 'sine', vol: .07, notes: '. . . . . . E5 . | . . . . . . . . | . . . . . . . A5 | . . . . . . . .' }] };
  const FIGHT = { bpm: 128, steps: 4, tracks: [   // the Warden
    { wave: 'saw', vol: .06, notes: 'A3 A3 . A3 C4 . A3 . | G3 G3 . G3 Bb3 . G3 . | F3 F3 . F3 A3 . F3 . | E3 . G#3 . B3 . E4 .' },
    { wave: 'triangle', vol: .3, notes: 'A1 . A1 . A1 . A1 . | G1 . G1 . G1 . G1 . | F1 . F1 . F1 . F1 . | E1 . E1 . E1 . E1 .' },
    { wave: 'drums', vol: .1, notes: 'k . h k s . h . | k k h . s . h h' }] };

  /* ---- THE STATE ---- */
  let world = null, hero = null, lamp = null, grid = null, fog = null, turns = null, rnd = Math.random, mode = 'real', scripted = false;
  let party = null, S = null, foes = [], gates = {}, levers = [], plates = {}, items = [], stair = null, bolts = [], keys = null;
  let total = 0, msg = null, showMap = false, song = null, ended = 0, slashT = 0, phase = 'party', took = 0, rounds = 0;
  BOOT.push(['The vaults', () => {
    for (const [k, v] of Object.entries(SOUNDS)) A.define(k, v);
    world = new W3(game, { level: LEVEL, torchLights: 4, torchShadows: 0, torchPower: 16, torchReach: 160, torchColor: '#ffb070', lights: 2,
      ambient: ['#5a5478', '#221e2a', 3.4], fog: { color: '#050407', near: 40, far: 250 }, sky: '#050407', camera: { mode: 'fixed' },
      onDraw: w => {   // the ceiling over the vaults, the bolts in flight, the wisps' zaps
        w.pen.at().box(w.width / 2, w.depth / 2, 50, w.width, w.depth, 4, '#1c1a22');   // (at(): the pen's origin back at the world's)
        for (const b of bolts) w.glow(b.x, b.y, b.z, 3.2, '#ffb14a', { light: true });
        for (const e of foes) if (e.zap > 0) w.pen.at().bar(e.x, e.y, e.z + 2, S.x, S.y, EYE - 6, .6, .6, '#bff4ff');
      } });
  }]);

  /** a fresh descent (seed: the dice; m: 'real' or 'turns', else the player's setting) */
  function reset(seed = 1, m = null) {
    world.reset(); rnd = E.rng(seed); mode = m || game.settings.crawlTurns || 'real';
    const st = MAP.findIndex(r => r.includes('@')), sx = MAP[st].indexOf('@');
    hero = world.hero({ x: mid(sx), y: mid(st), r: 4, visible: false }); world.camera.follow(hero);
    S = { cx: sx, cy: st, dir: 0, x: mid(sx), y: mid(st), yaw: YAW(0), px: mid(sx), py: mid(st), pyaw: YAW(0), from: null, t: 0, dur: 0, bump: 0, act: 0 };
    party = PARTY.map((o, i) => ({ i, name: o.name, role: o.role, front: i < 2, max: o.hp, hp: o.hp, mpMax: o.mp || 0, mp: o.mp || 0, speed: o.speed, o, hurtT: 0, flash: 0, rig: new E.Humanoid(Object.assign({ speedRef: 60 }, o.rig)), _turn: 100 }));
    if (!lamp) lamp = world.light({ color: '#ffd8a0', reach: 190, power: 10 });
    keys = new Set(); items = []; bolts = []; foes = []; gates = {}; levers = []; plates = {}; stair = null;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const c = at(x, y), k = x + ',' + y;
      if (c === 'G' || c === 'K') {   // a gate across its corridor (walls east and west: it spans x)
        const ns = wallCell(x - 1, y) && wallCell(x + 1, y);
        gates[k] = { cx: x, cy: y, up: false, t: world.thing('door', mid(x), mid(y), 0, { yaw: ns ? 0 : PI / 2, w: 32, h: 46, color: '#26242c', frame: '#3a3444', locked: c === 'K' ? 'iron' : null, solid: true }) };
      } else if (c === 'L') {
        const d = openSide(x, y), fx = x + DX[d], fy = y + DY[d];   // its face: toward the floor cell beside it
        levers.push({ cx: fx, cy: fy, dir: (d + 2) % 4, gate: WIRES[k], t: world.thing('wallLever', mid(x) + DX[d] * C / 2, mid(y) + DY[d] * C / 2, 0, { yaw: Math.atan2(DY[d], DX[d]) - PI / 2 }) });
      } else if (c === 'P' || c === 'T') plates[k] = { trap: c === 'T', gate: WIRES[k], t: world.thing('plate', mid(x), mid(y), 0, { color: c === 'T' ? '#625c6a' : '#6e6878' }) };
      else if (c === 'X') stair = { cx: x, cy: y, t: world.thing('stair', mid(x), mid(y) - 6, 0, { on: false }) };
      else if (c === 'i') items.push({ cx: x, cy: y, kind: 'key', t: world.thing('key', mid(x), mid(y), 5, { color: '#8a8c98', spin: .3, bob: 1.5 }) });
      else if (c === 'h') items.push({ cx: x, cy: y, kind: 'flask', t: world.thing('potion', mid(x), mid(y), 0, { color: '#e04a4a', spin: .2 }) });
      else if (MARK[c]) foes.push(spawn(MARK[c], x, y));
    }
    total = foes.length;
    grid = new E.Grid(MW, MH, { walkable: (x, y) => open(x, y), opaque: (x, y) => wallCell(x, y) || !!(gates[x + ',' + y] && gates[x + ',' + y].t.open < .5) });
    fog = new E.Fog(grid); look();
    makeTurns(); msg = null; showMap = false; song = null; ended = 0; slashT = 0; phase = 'party'; took = 0; rounds = 0;
    world.camera.set('fixed'); place(0);
  }
  function spawn(type, x, y) {
    const k = KINDS[type], X = mid(x), Y = mid(y);
    const e = type === 'wisp' ? world.mob({ x: X, y: Y, z: k.z, r: 4, half: 0, fly: true, orb: { color: '#8ae0ff', r: 3.6 } })
      : type === 'slime' ? world.mob({ x: X, y: Y, r: 6, half: 0, mass: 2, blob: new E.Blob({ R: 7, face: 'front', colors: { base: '#5ac86a', dk: '#2e7a3e', lt: '#a8f0a0' } }) })
      : world.mob({ x: X, y: Y, r: type === 'warden' ? 8 : 4.5, half: type === 'warden' ? 12 : 8, mass: type === 'warden' ? 8 : 1.4,
        rig: type === 'warden' ? new E.Humanoid({ size: 1.45, build: 'bulky', armor: true, sleeves: 'long', bladeLen: 13, hat: { style: 'helmet', color: '#5a5e6e' }, eyeGlow: '#7ad8ff', colors: WARDEN, speedRef: 45 })
          : new E.Humanoid({ build: 'skeleton', bladeLen: 9, colors: BONE, speedRef: 40 }) });
    return Object.assign(e, { type, k, cx: x, cy: y, hp: k.hp, max: k.hp, speed: k.speed, awake: false, atk: null, hitT: 0, zap: 0, tx: X, ty: Y, deadT: 0, blows: 0, _turn: 0, facing: PI / 2 });
  }
  /** the turns: real time, each one's gauge on game time ('atb'); turns, the party one actor among the monsters ('speed') */
  function makeTurns() {
    const live = foes.filter(e => e.hp > 0);
    turns = mode === 'turns' ? new E.Turns([S, ...live], { mode: 'speed' }) : new E.Turns([...party.filter(m => m.hp > 0), ...live], { mode: 'atb', fill: .55 });
    S.speed = 100; for (const m of party) m._turn = mode === 'turns' ? 100 : Math.min(m._turn, 100);
  }
  const say = (text, t = 2.4) => { msg = { text, t }; };
  const gateAt = (x, y) => gates[x + ',' + y];
  const foeAt = (x, y) => foes.find(e => e.hp > 0 && e.cx === x && e.cy === y);
  /** can a body stand in this cell (a wall, a gate down: no) */
  function open(x, y) { if (wallCell(x, y)) return false; const g = gateAt(x, y); return !g || (g.up && g.t.open > .85); }
  const alive = () => party.filter(m => m.hp > 0);
  /** the party sees: the fog's field of view, and the monsters it falls on wake */
  function look() {
    fog.update([{ cx: S.cx, cy: S.cy, r: 5 }]);
    for (const e of foes) if (e.hp > 0 && !e.awake && fog.visible([e.cx, e.cy]) && Math.abs(e.cx - S.cx) + Math.abs(e.cy - S.cy) <= e.k.sight) wake(e);
  }
  function wake(e) { e.awake = true; A.sfx(e.type === 'slime' ? 'squelch' : e.type === 'wisp' ? 'zap' : e.type === 'warden' ? 'roar' : 'rattle'); if (e.type === 'warden') say('THE WARDEN WAKES', 3); }

  /* ---- MOVING: a step or a turn, tweened; bumping a wall ---- */
  function place(u) {   // where the eyes are this step (u: the tween's 0..1)
    const s = u * u * (3 - 2 * u), F = S.from;
    S.px = S.x; S.py = S.y; S.pyaw = S.yaw;
    if (F) { S.x = lerp(F[0], mid(S.cx), s); S.y = lerp(F[1], mid(S.cy), s); S.yaw = F[2] + E.angDiff(F[2], YAW(S.dir)) * s; }
    else { S.x = mid(S.cx); S.y = mid(S.cy); S.yaw = YAW(S.dir); }
    const b = Math.sin(Math.min(1, S.bump) * PI) * 4;   // a bump into a wall: a lurch forward and back
    hero.place(S.x + Math.cos(S.yaw) * b, S.y + Math.sin(S.yaw) * b, 0);
    world.camera.fixed = { x: S.x + Math.cos(S.yaw) * (b - 4), y: S.y + Math.sin(S.yaw) * (b - 4), z: EYE + Math.sin(s * PI) * (F && F[3] ? .8 : 0), yaw: S.yaw, pitch: -.04, fov: 74 };
  }
  const busy = () => S.dur > 0 && S.t < S.dur;
  /** try to step one cell along way d (relative to nothing: 0..3 on the map); true when the party moves */
  function stepTo(d) {
    const x = S.cx + DX[d], y = S.cy + DY[d];
    if (!open(x, y) || foeAt(x, y)) { S.bump = .001; A.sfx('thud'); const g = gateAt(x, y); if (g && !g.up && !scripted) say(g.t.locked ? 'A GATE WITH AN IRON LOCK' : 'THE GATE WILL NOT BUDGE'); return false; }
    S.from = [S.x, S.y, S.yaw, 1]; S.cx = x; S.cy = y; S.t = 0; S.dur = STEP_T; A.sfx('step'); return true;
  }
  function turnBy(s) { S.from = [S.x, S.y, S.yaw, 0]; S.dir = (S.dir + s + 4) % 4; S.t = 0; S.dur = TURN_T; A.sfx('turn'); return true; }
  /** the party has come into its cell: plates, things to take, the stair */
  function arrive() {
    look(); const k = S.cx + ',' + S.cy, pl = plates[k];
    if (pl && !pl.t.on) {
      pl.t.on = true; A.sfx('plate');
      if (pl.trap) { A.sfx('dart'); say('DARTS FROM THE WALLS!'); for (const m of alive().filter(m => m.front)) hurtMember(m, 4 + ((rnd() * 4) | 0)); }
      else { raise(gates[pl.gate]); say('A GRINDING, FAR OFF', 2.6); }
    }
    for (const it of items.slice()) if (it.cx === S.cx && it.cy === S.cy) {
      world.remove(it.t); items.splice(items.indexOf(it), 1); took++; A.sfx('pickup');
      if (it.kind === 'key') { keys.add('iron'); say('THE IRON KEY'); } else { for (const m of alive()) heal(m, 15); say('A FLASK: EVERYONE FEELS BETTER'); }
    }
    if (stair && S.cx === stair.cx && S.cy === stair.cy) { if (stair.t.on) win(); else if (!scripted) say('THE STAIR IS SEALED: SOMETHING HOLDS IT'); }
  }
  function raise(g) { if (!g || g.up) return; g.up = true; g.t.locked = null; A.sfx('gate'); }
  /** J at what is in front: a lever on this wall, a locked gate; true when it used something */
  function use() {
    const fx = S.cx + DX[S.dir], fy = S.cy + DY[S.dir];
    const lv = levers.find(l => l.cx === S.cx && l.cy === S.cy && l.dir === S.dir);
    if (lv) { lv.t.on = !lv.t.on; A.sfx('lever'); if (lv.t.on) { raise(gates[lv.gate]); say('A LEVER: SOMEWHERE A GATE RISES'); } return true; }
    const g = gateAt(fx, fy);
    if (g && !g.up && g.t.locked) {
      const r = world.unlock(g.t, { has: k => keys.has(k), remove: k => keys.delete(k) });
      if (r === 'unlocked') { A.sfx('unlock'); raise(g); say('THE IRON KEY TURNS'); } else { A.sfx('locked'); say('LOCKED: IT WANTS AN IRON KEY'); }
      return true;
    }
    return false;
  }

  /* ---- FIGHTING: the front rank's blows at what stands in front, the mage's bolt, the cleric's heal ---- */
  const roll = ([a, b]) => a + ((rnd() * (b - a + 1)) | 0);
  const ahead = () => foeAt(S.cx + DX[S.dir], S.cy + DY[S.dir]);
  /** member m acts by its role; false when it has nothing to do (no foe in reach, no one hurt, no magic) */
  function act(m) {
    if (!m || m.hp <= 0 || (mode === 'real' && m._turn < 100)) return false;
    if (m.o.heal) {
      const w = alive().filter(o => o.hp < o.max).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
      if (!w || m.mp < HEAL_MP) return false;
      m.mp -= HEAL_MP; heal(w, roll(m.o.heal)); A.sfx('heal'); m.flash = .3; say(m.name + ' HEALS ' + w.name, 1.6);
    } else if (m.o.bolt) {
      if (m.mp < BOLT_MP) return false;
      m.mp -= BOLT_MP; bolts.push({ cx: S.cx, cy: S.cy, d: S.dir, x: S.x, y: S.y, z: EYE - 5, t: 0, dmg: roll(m.o.bolt), by: m }); A.sfx('bolt');
    } else {
      const e = ahead(); slashT = .16; A.sfx('swing');
      if (e) hurtFoe(e, roll(m.o.hit), m);
    }
    m.cool = .3; if (mode === 'real') turns.done(m); return true;
  }
  /** the first foe down the line the party faces (6 cells, until a wall or a gate), or null: what a bolt would hit */
  function inLine() {
    for (let k = 1, x = S.cx, y = S.cy; k <= 6; k++) { x += DX[S.dir]; y += DY[S.dir]; const e = foeAt(x, y); if (e) return e; if (!open(x, y)) return null; }
    return null;
  }
  /** J in real time: the next one ready, the front rank first at what stands in front, the mage at what comes down the
   *  line; with nothing there, the front swings at the air */
  function anyAct() {
    const order = ahead() ? [0, 1, 3] : inLine() ? [3] : [0, 1];
    for (const i of order) if (act(party[i])) return true;
    return false;
  }
  /** J in turns: the party's round, each one that has something to do: blows at what is in front, a bolt down the line,
   *  the cleric's heal for one below two thirds */
  function round() {
    const foe = ahead(), line = inLine(); let n = 0;
    for (const m of party) if (m.hp > 0 && (m.o.hit ? foe : m.o.bolt ? line : alive().some(o => o.hp < o.max * .67)) && act(m)) n++;
    if (!n && party.some(m => m.hp > 0 && m.o.hit)) { slashT = .16; A.sfx('swing'); n = 1; }   // (nothing to do: a swing at the air is the round)
    return n > 0;
  }
  function heal(m, n) { if (m.hp <= 0) return; m.hp = Math.min(m.max, m.hp + n); m.flash = .4; }
  function hurtFoe(e, dmg, by) {
    e.hp -= dmg; e.flash = .15; if (!e.awake) wake(e);
    P.sparks(e.x, e.y, (e.z || 0) + 14, 6, Math.atan2(S.y - e.y, S.x - e.x)); P.text(e.x, e.y, (e.z || 0) + 30, dmg, '#fff2c4'); A.sfx('hit');
    if (e.hp <= 0) {
      e.alive = false; e.setSolid(false); turns.remove(e); A.sfx(e.type === 'warden' ? 'roar' : 'die');
      if (e.type === 'warden') { stair.t.on = true; say('THE WARDEN FALLS: THE STAIR IS OPEN', 3.2); song = null; }
    }
  }
  function hurtMember(m, dmg) {
    if (m.hp <= 0) return;
    m.hp = Math.max(0, m.hp - dmg); m.hurtT = .5; game.shake(2); A.sfx('hurt');
    if (m.hp <= 0) { say(m.name + ' FALLS', 2); turns.remove(m); }
  }
  /** a monster's blow lands: the front rank takes what comes from ahead or the sides, the back rank what comes from behind */
  function blow(e) {
    const rel = ((Math.round(Math.atan2(e.cy - S.cy, e.cx - S.cx) / (PI / 2)) + 1 - S.dir) % 4 + 4) % 4;   // 0 ahead, 2 behind
    let pool = alive().filter(m => m.front === (rel !== 2)); if (!pool.length) pool = alive(); if (!pool.length) return;
    const hits = e.type === 'warden' && e.blows % 3 === 2 ? pool : [pool[(rnd() * pool.length) | 0]];   // the Warden's sweep, every third blow
    for (const m of hits) hurtMember(m, roll(e.k.dmg));
    if (hits.length > 1) { game.shake(5); say('THE WARDEN SWEEPS THE FRONT', 1.6); }
    e.blows++;
  }
  /** a monster's turn: strike when beside the party, else close in by the grid's path (awake ones only) */
  function foeTurn(e) {
    if (e.hp <= 0 || !e.awake) return;
    const d = Math.abs(e.cx - S.cx) + Math.abs(e.cy - S.cy);
    e.facing = Math.atan2(S.y - e.y, S.x - e.x);
    if (d === 1) {
      e.hitT = .3;
      if (e.k.move) { e.atk = new E.Attack(e.k.move); e.atk.start(); } else if (e.type === 'wisp') e.zap = .18; else { e.vx += Math.cos(e.facing) * 60; e.vy += Math.sin(e.facing) * 60; }
      return;
    }
    const path = grid.path([e.cx, e.cy], [S.cx, S.cy], { blocked: (x, y) => !!foeAt(x, y) && !(x === e.cx && y === e.cy), ends: true });
    if (path.length > 2) { const [nx, ny] = path[1]; if (!(nx === S.cx && ny === S.cy)) { e.cx = nx; e.cy = ny; e.tx = mid(nx); e.ty = mid(ny); e.moveT = MOVE_T; } }
  }
  /** each step: walk each monster to its cell's middle, its blow's timing, its death */
  function foeStep(e, dt) {
    if (e.hp <= 0) {
      e.deadT += dt; e.vx = approach(e.vx, 0, 300 * dt); e.vy = approach(e.vy, 0, 300 * dt);
      e.anim = e.rig ? { pose: 'die' } : e.blob ? { squash: -.45, squint: true } : null; if (e.type === 'wisp') { e.fade = Math.max(0, 1 - e.deadT * 1.5); e.vz = -10; }
      if (e.deadT > 1.2) e.sink += dt * 12;
      if (e.deadT > 2.6 && foes.includes(e)) { world.remove(e); e.gone = true; }
      return;
    }
    const sp = e.type === 'warden' ? 70 : 90, dx = e.tx - e.x, dy = e.ty - e.y;
    e.vx = clamp(dx * 9, -sp, sp); e.vy = clamp(dy * 9, -sp, sp);
    if (e.fly) e.vz = (e.k.z + Math.sin(world.time * 3 + e.cx) * 2 - e.z) * 5;
    if (Math.hypot(dx, dy) > 2) e.facing = E.approachAng(e.facing, Math.atan2(dy, dx), dt * 10);
    if (e.hitT > 0 && (e.hitT -= dt) <= 0 && Math.abs(e.cx - S.cx) + Math.abs(e.cy - S.cy) === 1) blow(e);
    if (e.atk) { e.atk.update(dt); if (!e.atk.busy) e.atk = null; }
    e.zap = Math.max(0, e.zap - dt); e.moveT = Math.max(0, (e.moveT || 0) - dt);
    e.anim = e.rig ? { attack: e.atk && e.atk.state, hurt: e.flash > 0, expr: e.atk ? 'angry' : null } : e.blob ? { squash: e.hitT > 0 ? -.35 : Math.sin(world.time * 4 + e.cx) * .06, look: [Math.cos(e.facing), Math.sin(e.facing)] } : null;
  }
  /** the bolts: a cell every .07 s down the corridor, until a monster, a wall or a gate */
  function boltStep(dt) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.t += dt;
      const nx = mid(b.cx) + DX[b.d] * C * Math.min(1, b.t / .07), ny = mid(b.cy) + DY[b.d] * C * Math.min(1, b.t / .07);
      b.x = nx; b.y = ny;
      if (b.t < .07) continue;
      b.t = 0; b.cx += DX[b.d]; b.cy += DY[b.d];
      const e = foeAt(b.cx, b.cy), stop = !open(b.cx, b.cy) || Math.abs(b.cx - S.cx) + Math.abs(b.cy - S.cy) > 7;
      if (e) hurtFoe(e, b.dmg, b.by);
      if (e || stop) { P.sparks(mid(b.cx) - DX[b.d] * 12, mid(b.cy) - DY[b.d] * 12, b.z, 10, null, { color: '#ffb14a' }); bolts.splice(i, 1); }
    }
  }

  /* ---- A STEP OF THE GAME: the party's controls, the turns, the monsters ---- */
  function step(dt, ctl) {
    if (msg && (msg.t -= dt) <= 0) msg = null;
    slashT = Math.max(0, slashT - dt);
    for (const m of party) { m.hurtT = Math.max(0, m.hurtT - dt); m.flash = Math.max(0, m.flash - dt); m.rig.update(dt, { x: 0, y: 0, hurt: m.hurtT > 0, expr: m.hurtT > 0 ? 'wince' : null }); }
    for (const g of Object.values(gates)) { const was = g.t.open || 0; g.t.open = approach(was, g.up ? 1 : 0, dt * .9); if (g.up && g.t.open > .85 && g.t.body) world.setSolid(g.t, false); if ((was < .5) !== (g.t.open < .5)) look(); }
    if (mode !== (game.settings.crawlTurns || mode) && !scripted) { mode = game.settings.crawlTurns; makeTurns(); phase = 'party'; }
    const dead = !alive().length;
    // the party: a step or turn tweening, or the controls (in turns, only on the party's turn)
    if (busy()) { S.t += dt; place(Math.min(1, S.t / S.dur)); if (!busy()) { const stepped = S.from[3]; S.from = null; S.dur = 0; if (stepped) arrive(); } }
    else {
      if (S.bump > 0) { S.bump += dt * 6; if (S.bump >= 1) S.bump = 0; }
      place(1);
      if (!dead && !ended && (mode === 'real' || phase === 'party')) control(ctl);
    }
    boltStep(dt);
    // the monsters: real time, each by its gauge; turns, all of them once the party has had its turn and its move is done
    if (mode === 'real') {
      turns.update(dt);
      for (const a of turns.ready()) if (a.k) { turns.done(a); foeTurn(a); }
    } else if (phase === 'world' && !busy() && !bolts.length) {
      for (let guard = 0; guard < 40; guard++) { const a = turns.next(); if (!a || a === S) break; foeTurn(a); }
      phase = 'wait';
    } else if (phase === 'wait' && !foes.some(e => e.hp > 0 && (e.moveT > 0 || e.hitT > 0))) { phase = 'party'; rounds++; for (const m of alive()) if (m.mpMax) m.mp = Math.min(m.mpMax, m.mp + .5); }
    if (mode === 'real') for (const m of alive()) if (m.mpMax) m.mp = Math.min(m.mpMax, m.mp + dt / 4);
    for (const e of foes) foeStep(e, dt);
    for (let i = foes.length - 1; i >= 0; i--) if (foes[i].gone) foes.splice(i, 1);
    lamp.x = S.x; lamp.y = S.y; lamp.z = EYE + 4; lamp.on = true;
    if (dead && !ended) { ended = 2; if (!scripted) game.after(1.5, () => game.go('over', { from: 'crawler', world, lines: ['THE PARTY IS LOST', 'IN THE LANTERN VAULTS'] })); }
    world.step(dt);
  }
  /** the controls when the party may act: the stick or keys to step and turn, Q and E aside, J, K, H, 1 to 4 */
  function control(c) {
    const mv = c.move, turnsMode = mode === 'turns';
    let did = false;
    if (c.pressed('act')) { c.use('act'); did = use() || (turnsMode ? round() : anyAct()); }
    else if (c.pressed('spell')) { c.use('spell'); did = act(party[3]); }
    else if (c.pressed('heal')) { c.use('heal'); did = act(party[2]); }
    else for (let i = 0; i < 4; i++) if (c.pressed('m' + (i + 1))) { c.use('m' + (i + 1)); did = act(party[i]); break; }
    if (did) { if (turnsMode) { phase = 'world'; for (const m of party) m._turn = 100; } return; }
    if (S.bump > 0) return;
    let moved = false;
    if (mv[1] < -.5) moved = stepTo(S.dir); else if (mv[1] > .5) moved = stepTo((S.dir + 2) % 4);
    else if (mv[0] < -.5) moved = turnBy(-1); else if (mv[0] > .5) moved = turnBy(1);
    else if (c.down('strafeL')) moved = stepTo((S.dir + 3) % 4); else if (c.down('strafeR')) moved = stepTo((S.dir + 1) % 4);
    if (moved && turnsMode) phase = 'world';
  }
  function win() {
    if (ended) return; ended = 1; if (scripted) return; A.music('victory');
    game.after(1.4, () => game.go('over', { from: 'crawler', world, won: true, title: 'OUT OF THE VAULTS', lines: ['THE WARDEN IS DOWN', alive().length + ' OF 4 CLIMB THE STAIR   ' + foes.filter(e => e.hp <= 0).length + ' FOES'] }));
  }

  /* ---- THE HUD: the party's cards (portrait, life, magic, gauge), the compass, the map ---- */
  const card = (r, i) => {   // a card's box: one row of four on a wide screen, two by two on a narrow one; at the top on a touch screen (below the corner's buttons where they would cover it)
    const four = r.W >= 300, cw = four ? Math.min(92, Math.floor((r.W - 10) / 4)) : Math.floor((r.W - 8) / 2), ch = 38, n = four ? 4 : 2;
    const x0 = Math.round((r.W - (cw * n + 2 * (n - 1))) / 2), row = four ? 0 : i >> 1, col = four ? i : i & 1, top = touch();
    const ca = top && game.cornerArea(), y0 = ca && ca.x0 < x0 + n * (cw + 2) ? Math.ceil(ca.y1) + 3 : 4;
    return [x0 + col * (cw + 2), top ? y0 + row * (ch + 2) : r.H - (four ? 1 : 2) * (ch + 2) - 2 + row * (ch + 2), cw, ch];
  };
  const below = r => touch() ? card(r, 3)[1] + 42 : 4;   // where the compass and the little map go: under the cards on a touch screen
  function hud(g, r) {
    // a blow's streak across the view
    if (slashT > 0) { g.save(); g.globalAlpha = slashT / .16; g.strokeStyle = '#fff6e0'; g.lineWidth = 2; g.beginPath(); g.moveTo(r.W * .7, r.H * .28); g.lineTo(r.W * .3, r.H * .62); g.stroke(); g.restore(); }
    for (let i = 0; i < 4; i++) {
      const m = party[i], [x, y, w, h] = card(r, i), ko = m.hp <= 0, ready = mode === 'real' ? m._turn >= 100 : phase === 'party';
      E.ui.box(g, x, y, w, h, { bg: m.hurtT > 0 ? '#5a1a1e' : m.flash > 0 ? '#1e4a2e' : '#1a1626', border: ready && !ko ? '#d8c890' : '#6a6080', alpha: .9 });
      m.rig.drawPortrait(g, x + 3, y + 3, 26, { zoom: 2.4, turn: .4, bg: '#2a2438', tint: ko ? '#707070' : undefined });
      E.font.text(g, (i + 1) + ' ' + m.name, x + 32, y + 3, ko ? '#8a8090' : '#f0e8d8', { font: 'tiny', outline: false });
      E.ui.bar(g, x + 32, y + 12, w - 36, 5, m.hp / m.max, '#e0463c');
      if (m.mpMax) E.ui.bar(g, x + 32, y + 19, w - 36, 4, m.mp / m.mpMax, '#4a8aff');
      if (mode === 'real' && !ko) E.ui.bar(g, x + 32, y + h - 9, w - 36, 3, Math.min(1, m._turn / 100), ready ? '#ffd36a' : '#8a7a4a');
      E.font.text(g, ko ? 'DOWN' : m.hp + '/' + m.max, x + 32, y + 26, ko ? '#c84a4a' : '#c8c0b0', { font: 'tiny', outline: false });
    }
    // the compass, the mode, the message
    const cx = Math.round(r.W / 2), ty = below(r);
    E.ui.box(g, cx - 26, ty, 52, 14, { bg: '#1a1626', border: '#6a6080', alpha: .85 });
    E.font.text(g, WAYS[(S.dir + 3) % 4] + '   ' + WAYS[S.dir] + '   ' + WAYS[(S.dir + 1) % 4], cx, ty + 4, '#d8c890', { align: 'center', font: 'tiny', outline: false });
    E.font.text(g, mode === 'turns' ? (phase === 'party' ? 'YOUR TURN' : 'THEIR TURN') : 'REAL TIME', 4, ty + 4, mode === 'turns' && phase !== 'party' ? '#e8a060' : '#9a90b0', { font: 'tiny', outline: '#000' });
    if (msg) E.font.text(g, msg.text, cx, touch() ? r.H * .62 : card(r, 0)[1] - 12, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
    automap(g, r, showMap);
  }
  /** the map from the fog: what the party has seen (walls beside it), gates, plates, the stair, the party's arrow */
  function automap(g, r, big) {
    const s = big ? Math.max(4, Math.min(10, Math.floor(Math.min(r.W - 20, r.H - 60) / MW))) : 3, w = MW * s, h = MH * s;
    const x0 = big ? Math.round((r.W - w) / 2) : r.W - w - 4, y0 = big ? Math.round((r.H - h) / 2) : below(r);
    E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#0c0a12', border: '#6a6080', alpha: big ? .95 : .75 });
    const seenNear = (x, y) => [0, 1, 2, 3].some(d => fog.seen([x + DX[d], y + DY[d]]) && !wallCell(x + DX[d], y + DY[d]));
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const wall = wallCell(x, y); if (wall ? !seenNear(x, y) : !fog.seen([x, y])) continue;
      const k = x + ',' + y, gt = gates[k], pl = plates[k];
      g.fillStyle = wall ? '#6a6080' : gt ? (gt.up ? '#4a4458' : '#c8a050') : pl ? (pl.trap && !pl.t.on ? '#3a3448' : '#8a7aa0') : stair && stair.cx === x && stair.cy === y ? '#9ae8ff' : fog.visible([x, y]) ? '#3a3448' : '#2a2436';
      g.fillRect(x0 + x * s, y0 + y * s, s, s);
      const f = foeAt(x, y); if (f && fog.visible([x, y])) { g.fillStyle = '#ff5a4a'; g.fillRect(x0 + x * s + (s >> 2), y0 + y * s + (s >> 2), Math.max(1, s >> 1), Math.max(1, s >> 1)); }
    }
    // the party: a dot and the way it faces
    const px = x0 + S.cx * s + s / 2, py = y0 + S.cy * s + s / 2;
    g.fillStyle = '#ffe08a'; g.fillRect(Math.round(px - 1), Math.round(py - 1), 2, 2); g.fillRect(Math.round(px + DX[S.dir] * s * .45 - .5), Math.round(py + DY[S.dir] * s * .45 - .5), 1, 1);
    if (big) E.font.text(g, 'THE LANTERN VAULTS   ' + (keys.has('iron') ? 'IRON KEY' : ''), r.W / 2, y0 - 12, '#d8c890', { align: 'center', font: 'tiny', outline: '#000' });
  }

  /* ---- THE CONTROLS: keys, touch, and clicks on the cards and the map ---- */
  const KEYS = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
    strafeL: ['KeyQ', 'Pad4'], strafeR: ['KeyE', 'Pad5'], act: ['KeyJ', 'Space', 'Pad0'], spell: ['KeyK', 'Pad2'], heal: ['KeyH', 'Pad3'], map: ['Tab', 'Pad8'],
    m1: ['Digit1'], m2: ['Digit2'], m3: ['Digit3'], m4: ['Digit4'],
    start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
  const TOUCH = ['map', 'heal', 'spell', 'act'], TOUCH_LABELS = { map: 'MAP', heal: 'HEAL', spell: 'BOLT', act: 'ACT' };
  const SETTING = { key: 'crawlTurns', label: 'Turns', group: 'Game', type: 'select', value: 'real', options: [['real', 'Real time'], ['turns', 'Turns']],
    help: 'Real time: each one acts when its gauge fills, and the monsters do not wait. Turns: the vaults wait for you; each step, turn or blow is a turn' };
  const ctl = { move: [0, 0], down: a => game.input.down(a), pressed: a => game.input.pressed(a), use: a => game.input.consume(a) };
  function controls() {
    const m = game.input.move(); ctl.move[0] = m[0]; ctl.move[1] = m[1];
    const tap = game.input.clicked();
    if (tap) {   // a portrait acts; the little map opens the big one; the view uses what is in front, or fights
      const r = game.r || { W: game.W, H: game.H }, i = [0, 1, 2, 3].find(k => { const [x, y, w, h] = card(r, k); return tap[0] >= x && tap[0] < x + w && tap[1] >= y && tap[1] < y + h; });
      if (i !== undefined) { if ((mode === 'real' || phase === 'party') && act(party[i]) && mode === 'turns') phase = 'world'; }
      else if (tap[0] > r.W - MW * 3 - 8 && tap[1] >= below(r) - 2 && tap[1] < below(r) + MH * 3 + 6) showMap = !showMap;
      else if (!touch()) { const t = { pressed: a => a === 'act', use() {}, down: () => false, move: [0, 0] }; if (mode === 'real' || phase === 'party') control(t); }
    }
    return ctl;
  }

  /** the proof: a scripted walk from the start (forward, a quarter turn to the lever, pull it, round to the gate it raised,
   *  through it), in real time; n steps of 1/120 s. The world's hash with the party's cell and way, the gate's height and
   *  the party's lives: the same on WebGPU, WebGL 2 and run again */
  function run(n = 600) {
    reset(3, 'real'); scripted = true;
    const plan = ['up', 'left', 'up', 'up', 'act', 'right', 'up', 'right', 'up', 'up', 'left', 'up', 'up'], keys0 = new Set();
    const c = { move: [0, 0], down: a => keys0.has(a), pressed: a => keys0.has(a), use: a => keys0.delete(a) };
    let k = 0, wait = 0;
    for (let i = 0; i < n; i++) {
      keys0.clear(); c.move[0] = c.move[1] = 0;
      if (!busy() && S.bump === 0 && k < plan.length && (wait -= 1 / 120) <= 0) {
        const a = plan[k++];
        if (a === 'up') c.move[1] = -1; else if (a === 'left') c.move[0] = -1; else if (a === 'right') c.move[0] = 1; else keys0.add(a);
        if (a === 'act') wait = 1.4;   // (the gate takes a while to rise)
      }
      step(1 / 120, c);
    }
    scripted = false; const g = gates['10,9'];
    return world.hash([S.cx, S.cy, S.dir, g.t.open, levers[0].t.on ? 1 : 0, ...party.map(m => m.hp), k]);
  }

  /** the bot: plays the vaults by the game's own rules (a stick and buttons each step, as a player gives them): the
   *  lever, the iron key in the slimes' hall, the locked gate, the plate, the Warden, the stair; it walks the grid's
   *  paths, turns to face what attacks, fights (the front's blows, the mage's bolts down a line), heals when hurt. Then
   *  the same start in TURNS: the vaults hold still while the party waits, and act once it steps.
   *  Returns { lever, key, unlocked, plate, warden, won, alive, killed, steps, errors, turns: { waited, acted } } */
  function bot(max = 120 * 60 * 10) {
    reset(5, 'real'); scripted = true;
    const keys0 = new Set(), c = { move: [0, 0], down: a => keys0.has(a), pressed: a => keys0.has(a), use: a => keys0.delete(a) };
    const GOALS = [['use', 8, 11, 3], ['go', 12, 1], ['use', 17, 8, 0], ['go', 17, 5], ['go', 17, 3], ['go', 17, 1]];
    let g = 0, steps = 0, errors = 0, waitT = 0;
    const r = { lever: false, key: false, unlocked: false, plate: false, warden: false, won: false };
    try {
      for (; steps < max && !ended && alive().length; steps++) {
        keys0.clear(); c.move[0] = c.move[1] = 0;
        r.lever = r.lever || levers[0].t.on; r.key = r.key || keys.has('iron') || gates['17,7'].up; r.unlocked = gates['17,7'].up; r.plate = plates['17,5'].t.on;
        if (busy() || S.bump > 0) { step(1 / 120, c); continue; }
        // a foe beside the party: face it and fight; heal whoever is low; bolt what stands in line ahead
        const near = foes.find(e => e.hp > 0 && Math.abs(e.cx - S.cx) + Math.abs(e.cy - S.cy) === 1);
        const low = alive().some(m => m.hp < m.max * .45) && party[2].hp > 0 && party[2].mp >= HEAL_MP && party[2]._turn >= 100;
        if (low) keys0.add('heal');
        else if (near) {
          const want = [0, 1, 2, 3].find(d => S.cx + DX[d] === near.cx && S.cy + DY[d] === near.cy);
          if (want !== S.dir) c.move[0] = ((want - S.dir + 4) % 4) === 3 ? -1 : 1; else keys0.add('act');
        } else {
          const lineFoe = foes.find(e => e.hp > 0 && e.awake && fog.visible([e.cx, e.cy]) && ((e.cx === S.cx && Math.sign(e.cy - S.cy) === DY[S.dir] && DY[S.dir]) || (e.cy === S.cy && Math.sign(e.cx - S.cx) === DX[S.dir] && DX[S.dir])));
          if (lineFoe && party[3].hp > 0 && party[3].mp >= BOLT_MP && party[3]._turn >= 100) keys0.add('spell');
          else if (lineFoe && Math.abs(lineFoe.cx - S.cx) + Math.abs(lineFoe.cy - S.cy) <= 3 && (waitT += 1 / 120) < 3) { /* wait for it to come (3 s at most) */ }
          else if (g < GOALS.length) {
            waitT = 0;
            const [kind, gx, gy, gd] = GOALS[g];
            if (S.cx === gx && S.cy === gy) {
              if (kind === 'use') { if (S.dir !== gd) c.move[0] = ((gd - S.dir + 4) % 4) === 3 ? -1 : 1; else { keys0.add('act'); g++; } }
              else g++;
            } else {
              const path = grid.path([S.cx, S.cy], [gx, gy], { blocked: (x, y) => !!foeAt(x, y) });
              if (path.length > 1) {
                const [nx, ny] = path[1], want = [0, 1, 2, 3].find(d => S.cx + DX[d] === nx && S.cy + DY[d] === ny);
                if (want === S.dir) c.move[1] = -1; else c.move[0] = ((want - S.dir + 4) % 4) === 3 ? -1 : 1;
              }
            }
          }
        }
        step(1 / 120, c);
        r.warden = r.warden || foes.every(e => e.type !== 'warden') || !!(stair && stair.t.on);
      }
    } catch (e) { errors++; console.error(e); }
    Object.assign(r, { won: ended === 1, alive: alive().length, killed: total - foes.filter(e => e.hp > 0).length, steps, errors, goal: g });
    // TURNS: the vaults hold still while the party waits (a second and a half), then a step: the wisps by the start's
    // hall act (none are awake there yet: the dead in the hall beyond the gate are not seen), so the count is of turns had
    reset(5, 'turns');
    try {
      const before = foes.map(e => [e.cx, e.cy, e._turn].join()).join('|');
      for (let i = 0; i < 180; i++) { keys0.clear(); c.move[0] = c.move[1] = 0; step(1 / 120, c); }
      const still = foes.map(e => [e.cx, e.cy, e._turn].join()).join('|') === before && phase === 'party';
      c.move[1] = -1; step(1 / 120, c); c.move[1] = 0; const t0 = S.cy;
      for (let i = 0; i < 120; i++) step(1 / 120, c);
      r.turns = { waited: still, stepped: t0 !== MAP.findIndex(row => row.includes('@')), back: phase === 'party', rounds, energy: foes.some(e => e._turn > 0) };
    } catch (e) { errors++; r.errors = errors; console.error(e); }
    scripted = false; ended = 0; return r;
  }

  return {
    view: 'iso', input: KEYS, pausable: true, touch: TOUCH,
    enter(d) {
      game.settings.define(SETTING); reset(1); active = world; game.input.touchButtons(TOUCH, { labels: TOUCH_LABELS });
      if (d && d.part === 'warden') { for (const k of ['10,9', '17,7', '17,4']) { raise(gates[k]); gates[k].t.open = 1; world.setSolid(gates[k].t, false); } S.cx = 17; S.cy = 5; S.dir = 0; plates['17,5'].t.on = true; place(1); look(); }
      say(d && d.part === 'warden' ? 'THE WARDEN\'S HALL' : 'THE LANTERN VAULTS. FIND THE WAY DOWN', 3.5);
    },
    update(dt) {
      if (game.input.pressed('map')) { game.input.consume('map'); showMap = !showMap; }
      step(dt, controls());
      const want = foes.some(e => e.type === 'warden' && e.awake && e.hp > 0) ? FIGHT : VAULT;
      if (want !== song && !ended) { song = want; A.music(want); }
    },
    draw(r) {
      world.draw(r);
      r.overlay(g => hud(g, r));
    },
    get world() { return world; }, get hero() { return hero; }, get party() { return party; }, get foes() { return foes; }, get state() { return S; }, get mode() { return mode; },
    get gates() { return gates; }, reset, run, bot, MAP
  };
})();
scenes.crawler = CRAWLER;
