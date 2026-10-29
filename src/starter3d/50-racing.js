/* =====================================================================================
 * SLICE 5  RACING  (Mario Kart 64, Crash Team Racing, Diddy Kong Racing). @modules drive
 * A kart circuit in a green valley: banked bends, a hill whose crest throws you, a jump over the stream, a hairpin in
 * the infield with a dirt shortcut through it (slow on the dirt: take it on a boost), boost pads, rows of item boxes.
 * You and five drivers, three laps. Hop into a bend and hold the drift: the sparks go blue, then orange; let go for a
 * boost. Items: a BOOST, a SHELL fired ahead that spins out whoever it hits, a PEEL dropped behind.
 * MODES: RACE (you against five), VS (two players in a split screen against four: player 2 joins with 2 on the
 * keyboard or Start on a pad). The title races the drivers by themselves. Deep links: #racing/race, #racing/vs.
 * KEYS: left / right (A / D) steer, up / Z gas, down / X brake, Space / Shift hop and drift, E / J the item, C the
 * camera (behind the kart, or the view). A pad: the stick, A gas, X brake, R hop and drift, L the item. TOUCH: the stick
 * steers, DRIFT and ITEM; it accelerates by itself.
 * THE 3D: world.track (the circuit, banked about its low edge, its walls opened where the shortcut leaves and rejoins;
 * the shortcut, a dirt track without walls), world.vehicle (karts, their drivers seated), E.Race (the drive module:
 * laps, places, the drivers, items), the 'behind' camera, split screen (game.splitScreen, world.addCamera).
 * RACING.run(n): a race's hash (the proof); RACING.bot(): a race to the end by the drivers (yours over the shortcut),
 * then two players in a split screen
 * ===================================================================================== */
const RACING = (() => {
  const T = 16, PI = Math.PI, HALF = 42, KERB = 8, EDGE = HALF + KERB;   // the road's half width, its kerbs; past EDGE the wall
  const KEYS = Object.assign({}, W3.INPUT, { gas: ['ArrowUp', 'KeyW', 'KeyZ', 'Pad0'], brake: ['ArrowDown', 'KeyS', 'KeyX', 'Pad2'], drift: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad5', 'Pad7'], item: ['KeyE', 'KeyJ', 'Pad4', 'Pad6'] });
  for (const k of ['attack', 'dash', 'skill', 'jump', 'lock']) delete KEYS[k];
  const TOUCH = ['drift', 'item'];

  /* ---- THE CIRCUIT: its racing line (the start at its first point, heading east along the bottom straight), heights in
   * it (the hill on the east side, the jump on the north straight); the shortcut across the infield's hairpin ---- */
  const LINE = new E.Path([[640, 1212, 0], [1100, 1200, 0], [1420, 1100, 0], [1560, 880, 0], [1560, 640, 18], [1500, 420, 44], [1360, 260, 12], [1120, 200, 0],
    [920, 200, 0], [800, 200, 14], [740, 200, 26], [690, 200, 0], [480, 220, 0], [320, 330, 0], [300, 520, 0], [420, 680, 0], [640, 720, 0], [760, 860, 0],
    [640, 1000, 0], [420, 1000, 0], [250, 1050, 0], [205, 1150, 0], [310, 1215, 0]], { closed: true, smooth: 'catmull' });
  const LEN = LINE.length, OFF = LINE.nearest(600, 718), ON = LINE.nearest(600, 1000);   // (where the shortcut leaves the road and rejoins it)
  const SHORT = new E.Path([[600, 760, 0], [588, 860, 0], [600, 958, 0]], { smooth: 'catmull' });
  const PADS = [[LEN * .07, 0], [LEN * .2, -16], [LEN * .5, 14]], BOXES = [LEN * .13, LEN * .43, LEN * .7];
  /* ---- THE VALLEY: 112 x 88 tiles of grass, a ridge of rock round it, a stream under the jump into a pond, trees, bushes
   * and rocks (shapes in the level's legend: they stand again with each reset) clear of the road ---- */
  const COLS = 112, ROWS = 88, stream = (x, y) => (y < 560 && Math.abs(x - 715 - Math.sin(y / 60) * 18) < 22) || Math.hypot(x - 770, y - 590) < 58;
  const clear = (x, y) => { const p = LINE.at(LINE.nearest(x, y)); return Math.hypot(p.x - x, p.y - y) > EDGE + 60 && Math.hypot(x - 590, y - 860) > 90; };
  const rows = Array.from({ length: ROWS }, (_, cy) => Array.from({ length: COLS }, (_, cx) => {
    const x = (cx + .5) * T, y = (cy + .5) * T, h = E.hash2(cx * 3 + 1, cy * 7 + 2);
    if (!cx || !cy || cx === COLS - 1 || cy === ROWS - 1) return '#';
    if (stream(x, y)) return '~';
    return h < .045 && clear(x, y) ? (h < .025 ? 'T' : h < .036 ? 'k' : 'o') : '.';
  }).join(''));
  const LEVEL = { rows, ground: 'grass', colors: { base: '#5a9a3a', dark: '#4a8a32', light: '#6aaa4a' }, side: 'earth', color: '#8a7458',
    legend: { '~': { ground: 'water', colors: { base: '#3a7ac8', dark: '#2a66b0', light: '#5a9ae0' } }, T: { shape: 'tree', scale: 1.4 }, k: { shape: 'bush', scale: 1.3 }, o: { shape: 'rock', scale: 1.5 } } };

  /* ---- THE DRIVERS: six rigs, each in a kart of its own color ---- */
  const CAST = [
    { name: 'NOVA', kart: '#e83030', rig: { hair: 'short', hat: 'cap', colors: { cloth: '#e83030', pants: '#2f5fd0', hair: '#5a3018', hat: '#e83030' } } },
    { name: 'LUMA', kart: '#3aa850', rig: { hair: 'ponytail', colors: { cloth: '#3aa850', pants: '#f0e8d0', hair: '#e8c060' } } },
    { name: 'BRAKK', kart: '#e8a020', rig: { build: 'bulky', hair: 'spiky', colors: { cloth: '#e8a020', pants: '#5a3a2a', hair: '#2a1a10' } } },
    { name: 'IRIS', kart: '#c050e0', rig: { hair: 'long', colors: { cloth: '#c050e0', pants: '#3a2a5a', hair: '#f0f0f8' } } },
    { name: 'TOK', kart: '#30b8e0', rig: { hat: { style: 'band', color: '#ffffff' }, colors: { cloth: '#30b8e0', pants: '#1a3a5a', hair: '#1a1a1a' } } },
    { name: 'ROOK', kart: '#5a5a6a', rig: { hood: true, colors: { cloth: '#3a3a48', pants: '#22222c', hair: '#1a1a1a' } } }
  ];
  const rigOf = c => new E.Humanoid(Object.assign({ size: .85, weapon: null }, c.rig));   // (made afresh each race: a rig's blinks draw on Math.random, so a race replays exactly)
  const SONG = { bpm: 152, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'E5 . G5 B5 . G5 E5 . | F5 . A5 C6 . A5 F5 . | G5 . B5 D6 . B5 G5 . | A5 . F5 D5 . E5 F5 .' },
    { wave: 'triangle', vol: .26, notes: 'E3 E3 B2 B2 E3 E3 B2 B2 | F3 F3 C3 C3 F3 F3 C3 C3 | G3 G3 D3 D3 G3 G3 D3 D3 | A2 A2 E3 E3 D3 D3 B2 B2' },
    { wave: 'drums', vol: .07, notes: 'k . h k s . h . k . h k s . h h' }] };

  let world, track, short, race = null, mode = 'menu', vs = false, players = [], over = 0, t = 0, scripted = false;
  // shots stop at the walls (E.Race asks the map); a kart's own shell is fired from inside the road
  const MAP = { collide: b => { const q = track.where(b.x, b.y); return Math.abs(q.across) > EDGE + 2 && Math.hypot(b.x - 590, b.y - 860) > 110; } };
  const menu = new E.Menu(game, ['RACE', 'VS (2 PLAYERS)', 'BACK'], { onPick: i => i === 2 ? game.go('title') : i === 1 ? versus() : start(false) });
  const after = new E.Menu(game, ['RACE AGAIN', 'MENU'], { onPick: i => i === 0 ? start(vs) : toMenu() });

  BOOT.push(['The racing valley', () => {
    world = new W3(game, { level: LEVEL, fog: { color: '#cfe4f4', near: 700, far: 1900 }, sky: ['#4a8ae0', '#cfe4f4'], ambient: ['#e0eaff', '#6a7a4a', 2.2],
      sun: { color: '#fff4dc', intensity: 2.6, dir: [-.5, .4, -.7], area: 600 }, torchLights: 0, camera: { mode: 'behind', far: 2400 }, onDraw });
    track = world.track({ path: LINE, width: HALF * 2, kerb: KERB, bank: .3, wallH: 16, pads: PADS, off: 'grass', gaps: [[OFF - 50, OFF + 34, 1], [ON - 34, ON + 50, 1]] });
    short = world.track({ path: SHORT, width: 40, kerb: 0, walls: false, bank: 0, lift: .6, surface: 'dirt', color: '#8a6a44', line: null, off: null });
    demo();   // (the drivers on the grid as the warm-up frame draws: their karts' and rigs' shaders built behind the boot screen)
  }]);

  /** a race: six karts on the grid; two = VS (the players' karts at the back, as Mario Kart starts you); none = the
   *  title's race, every kart driven by its driver. o.countdown: seconds before GO (3) */
  function start(two, o = {}) {
    vs = two; mode = 'race'; over = 0; t = 0; world.reset();
    race = new E.Race({ path: LINE, laps: 3, width: HALF - 4, checkpoints: 8, countdown: o.countdown ?? 3 });
    const grid = race.grid(6), order = two ? [2, 3, 4, 5, 0, 1] : [1, 2, 3, 4, 5, 0], who = o.demo ? [] : two ? [0, 1] : [0];
    players = [];
    order.forEach((ci, k) => {
      const c = CAST[ci], g = grid[k], v = world.vehicle({ kind: 'kart', x: g.x, y: g.y, angle: g.angle, color: c.kart, rig: rigOf(c) });
      const human = who.includes(ci), R = race.add(v, human ? { name: c.name, input: game.players[ci] || game.input } : { name: c.name, ai: { skill: .9 + ci * .014, rubber: .25, grip: 700 } });
      R.cast = c; if (human) players[ci] = R;
    });
    players = players.filter(Boolean);
    for (const d of BOXES) { const p = track.at(d); for (const u of [-.6, -.2, .2, .6]) race.box(p.x + p.rx * u * HALF, p.y + p.ry * u * HALF); }
    if (o.demo) { mode = 'menu'; world.camera.set('behind'); world.camera.follow(race.racers[0].car); return; }
    game.splitScreen(two ? 2 : 0, { layout: 'rows' });
    if (two && world.cameras.length < 2) world.addCamera({ mode: 'behind', far: 2400 });
    players.forEach((R, i) => { const c = world.cameras[i]; c.set('behind'); c.follow(R.car); c.smooth = null; });
    if (!scripted) A.music(SONG); game.input.consumeAll();
  }
  function demo() { start(false, { demo: true, countdown: 0 }); }
  function toMenu() { game.splitScreen(0); demo(); menu.i = 0; A.music('title'); }
  function versus() { if (game.players.length >= 2) start(true); else { mode = 'join'; A.sfx('select'); } }

  /* ---- each step: the race (every kart, the items, the laps), then the world; the sparks and the sounds ---- */
  function step(dt) {
    for (const R of players) if (R.input && R.input.lastDevice !== undefined) R.car.o.auto = R.input.lastDevice === 'touch';   // (a phone: the gas by itself)
    const was = race.t;
    race.update(dt, MAP); world.step(dt); t += dt;
    for (const R of race.racers) {   // a kart off the course (past the walls, over the edge) a while is set back on the road where it left it (Lakitu)
      const v = R.car, q = track.where(v.x, v.y), cut = SHORT.at(SHORT.nearest(v.x, v.y)), off = (Math.abs(q.across) > EDGE + 6 && Math.hypot(cut.x - v.x, cut.y - v.y) > 26) || v.z < q.z - 30;
      R.offT = off ? (R.offT || 0) + dt : 0;
      if (R.offT > 2 || v.z < -80) rescue(R, q.d);
    }
    if (scripted) return;
    if (was < 0 && Math.floor(was) !== Math.floor(race.t) && mode === 'race') A.sfx(race.t >= 0 ? 'confirm' : 'select');
    for (const R of race.racers) {
      const v = R.car;
      if (v.drifting && v.charge > .4 && (world.n & 3) === 0) for (const s of [-1, 1]) P.sparks(v.x - Math.cos(v.angle) * 7 - Math.sin(v.angle) * 6 * s, v.y - Math.sin(v.angle) * 7 + Math.cos(v.angle) * 6 * s, v.z + 1, 1, v.angle + PI, { color: v.charge >= 2 ? '#ffa030' : '#5ac8ff' });
      if (v.bumped && players.includes(R)) A.sfx('bump', { vol: .4 });
      if (v.offroad && v.onGround && Math.abs(v.speed) > 60 && (world.n & 7) === 0) P.dust(v.x, v.y, v.z, 1, { color: v.surface === 'water' ? '#cfe8ff' : v.surface === 'dirt' ? '#a88a60' : '#7aa850' });
    }
    for (const R of players) {
      if (R.input && R.input.pressed('item') && race.go && !R.finished) { const had = R.item; race.use(R); if (had) A.sfx(had === 'shot' ? 'shoot' : had === 'boost' ? 'powerup' : 'whoosh'); }
      if (R.lap !== R._lap) { if (R._lap !== undefined && !R.finished) A.sfx('oneup'); if (R.finished && !R._fin) { A.sfx('secret'); R._fin = true; } R._lap = R.lap; }
    }
  }
  /** set a kart back on the road at d along it, facing the way round (Lakitu's rescue) */
  function rescue(R, d) {
    const v = R.car, p = track.at(d), z = track.where(p.x, p.y).z;
    v.place(p.x, p.y, z + 2); v.angle = v.facing = p.angle; v.drifting = 0; v.charge = 0; v.boostT = 0; R.offT = 0; R.rescued = (R.rescued || 0) + 1;
    if (!scripted) { P.glints(p.x, p.y, z + 10, 10, '#fff6c0', 24); if (players.includes(R)) A.sfx('warp'); }
  }
  function update(dt) {
    const I = game.input; active = world;
    for (const k of TOUCH) I.touchSet(k, null, mode === 'race');
    if (mode === 'menu' || mode === 'join') {   // the title's race goes on under the menu; a new one when it ends
      step(dt); if (race.over || race.t > 150) demo();
      const lead = race.racers.reduce((a, b) => b.prog > a.prog ? b : a); if (world.camera.target !== lead.car) world.camera.follow(lead.car);
      if (mode === 'menu') menu.update(dt); else if (game.players.length >= 2) start(true); else if (I.pressed('cancel')) mode = 'menu';
      return;
    }
    if (I.pressed('camera')) { const c = world.camera, m = c.mode === 'behind' ? 'view' : 'behind'; c.set(m); game.note(m === 'behind' ? 'BEHIND THE KART' : game.view.label.toUpperCase() + ' VIEW'); }
    // the camera behind each kart: further back and wider on a screen held upright (the track shows past the kart)
    const tall = game.H > game.W * (vs ? .5 : 1);
    for (const c of world.cameras) Object.assign(c.behind, { dist: tall ? 92 : 62, height: tall ? 34 : 22, ahead: 40, lag: 5, fov: tall ? 78 : 66 });
    step(dt);
    if (players.length && players.every(R => R.finished)) { over += dt; if (over > 2.5 && mode === 'race') { mode = 'results'; after.i = 0; } }
    if (mode === 'results') after.update(dt);
  }

  /* ---- the look: the item boxes, shells and peels, the boost flames, the start's arch (with the pen, each frame) ---- */
  function onDraw(w) {
    const pen = w.pen, tt = game.real || 0, zAt = (x, y) => { const q = track.where(x, y); return Math.abs(q.across) < EDGE + 4 ? q.z : w.floorAt(x, y); };
    for (const b of race.boxes) if (b.t <= 0) {
      const z = zAt(b.x, b.y) + 9 + Math.sin(tt * 3 + b.x) * 1.5, c = E.hsl((tt * 90 + b.x * .7) % 360, .8, .55);
      pen.at(b.x, b.y, z, tt * 1.6 + b.y, 1, .5, .3).box(0, 0, -4.5, 9, 9, 9, c).box(0, 0, -2.5, 4, 9.4, 4, '#ffffff').box(0, 0, -2.5, 9.4, 4, 4, '#ffffff');
    }
    pen.at();
    for (const s of race.shots) pen.ball(s.x, s.y, zAt(s.x, s.y) + 3.5, 3.6, 3.6, 3, '#2aa02a').ball(s.x, s.y, zAt(s.x, s.y) + 2, 4.2, 4.2, 1.2, '#f0f0e0');
    for (const h of race.hazards) { const z = zAt(h.x, h.y); pen.ball(h.x, h.y, z + 1.6, 3, 2, 1.6, '#f0d030').ball(h.x + 2, h.y, z + 1, 2.4, 1.4, 1, '#e0b820').ball(h.x - 2, h.y + 1, z + 1, 2.2, 1.4, 1, '#e0b820'); }
    for (const R of race.racers) { const v = R.car; if (v.boostT > 0) pen.at(v.x, v.y, v.z, v.angle).glow(-12, -2.6, 6, 2.2 + Math.sin(tt * 40) * .6, '#ffb040').glow(-12, 2.6, 6, 2.2 + Math.cos(tt * 37) * .6, '#ffb040'); }
    // the start: an arch over the line, a chequered banner and a chequered strip on the road
    const s = track.at(0), z = zAt(s.x, s.y); pen.at(s.x, s.y, z, s.angle);
    for (const side of [-1, 1]) pen.tube(0, side * (EDGE + 6), 0, 0, side * (EDGE + 6), 44, 2.4, '#d8d8e0');
    for (let i = -6; i < 6; i++) for (let j = 0; j < 2; j++) pen.box(0, (i + .5) * (EDGE + 6) / 6, 37 + j * 5, 1.4, (EDGE + 6) / 6, 5, (i + j) & 1 ? '#1a1a20' : '#f4f4f4');
    for (let i = -7; i < 7; i++) for (let j = 0; j < 2; j++) pen.box((j - .5) * 5, (i + .5) * HALF / 7, .4, 5, HALF / 7, .3, (i + j) & 1 ? '#1a1a20' : '#f4f4f4');
    pen.at();
  }

  /* ---- the HUD: the race's own (place, lap, time, item, countdown), the map, the results ---- */
  const MAP_PTS = Array.from({ length: 96 }, (_, i) => LINE.at(i / 96 * LEN)), WW = COLS * T, WH = ROWS * T;
  function hud(r) {
    const W = r.W, H = r.H;
    if (mode === 'menu' || mode === 'join') {
      r.overlay(g => {
        E.font.title(g, 'RACING', W / 2, Math.max(10, Math.round(H * .1)), { scale: 4, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8402a'], depth: 3 });
        if (mode === 'join') E.font.text(g, 'PLAYER 2: PRESS 2 OR START ON A PAD', W / 2, H / 2, '#ffffff', { align: 'center', shadow: '#000', outline: false });
      });
      if (mode === 'menu') { menu.y = Math.round(H / 2) - 6; menu.draw(r); }
      return;
    }
    const i = r.viewport ? r.viewport.i : 0, me = players[i];
    if (me) race.hud(r, me, { color: vs ? (i ? '#ffd080' : '#a0d8ff') : '#ffffff' });
    if (me && me.car.drifting && me.car.charge >= 1) r.overlay(g => E.font.text(g, me.car.charge >= 2 ? 'TURBO!' : 'DRIFT', (r.viewport ? r.viewport.x : 0) + 8, (r.viewport ? r.viewport.y : 0) + 50, me.car.charge >= 2 ? '#ffa030' : '#5ac8ff', { shadow: '#000', outline: false, font: 'tiny' }));
    if (!vs && me && !(game.input.touchArea && game.input.touchArea())) r.overlay(g => {   // the map: the circuit, the shortcut, every kart a dot (yours blinking)
      const S = Math.max(48, Math.min(76, Math.round(H / 3.6))), X = 4, Y = H - S * WH / WW - 6, k = S / WW, line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach((p, j) => j ? g.lineTo(X + p.x * k, Y + p.y * k) : g.moveTo(X + p.x * k, Y + p.y * k)); g.stroke(); };
      g.save(); g.globalAlpha = .8; line([...MAP_PTS, MAP_PTS[0]], '#20202a', 4); line([...MAP_PTS, MAP_PTS[0]], '#d8d8e0', 2); line([0, .5, 1].map(f => SHORT.at(f * SHORT.length)), '#b08a58', 1.5); g.restore(); g._c = null;
      for (const R of race.racers) { if (R === me && Math.floor(t * 4) % 2) continue; E.px.rect(g, X + R.car.x * k - 1, Y + R.car.y * k - 1, 3, 3, R.cast.kart); }
    });
    if (mode === 'results' && (!r.viewport || r.viewport.i === game.viewports.length - 1)) board(r);
  }
  function board(r) {
    const W = game.W, H = game.H;
    r.overlay(g => {
      const w = 170, h = 16 + race.racers.length * 11, x = Math.round((W - w) / 2), y = Math.round(H / 2 - h / 2 - 20);
      E.ui.box(g, x, y, w, h, { bg: '#141a3a', border: '#e8e4ff' });
      race.racers.slice().sort((a, b) => a.place - b.place).forEach((R, k) => { const yy = y + 8 + k * 11, fin = R.finished ? Math.floor(R.time / 60) + "'" + (R.time % 60).toFixed(2).padStart(5, '0') : '--'; E.font.text(g, R.place + '. ' + R.name, x + 8, yy, players.includes(R) ? '#ffe04a' : '#ffffff', { outline: false }); E.font.text(g, fin, x + w - 8, yy, '#c8c8e0', { align: 'right', outline: false }); });
    });
    after.y = Math.round(H / 2) + 52; after.draw(r);
  }

  /* ---- the proof and the bot ---- */
  /** a scripted player (keys held as a player holds them) for the proof */
  const pad = (keys, steer) => ({ move: () => [steer(), 0], down: a => keys.has(a), pressed: a => keys.has('tap:' + a), lastDevice: 'keyboard' });
  /** the proof: a race from the grid (Math.random seeded: the items), the gas held through GO, a hop and a drift into
   *  the first bend, the item fired; n steps of 1/120 s. The world's hash with every racer's progress and place: the
   *  same on WebGPU, WebGL 2 and run again */
  function run(n = 600) {
    const was = Math.random; Math.random = E.rng(7); scripted = true;
    try {
      start(false, { countdown: 1 }); const keys = new Set(), R = players[0]; let steer = 0; R.input = pad(keys, () => steer);
      for (let i = 0; i < n; i++) {
        keys.clear(); keys.add('gas'); steer = 0;
        if (i >= 300 && i < 420) { steer = 1; keys.add('drift'); if (i === 300) keys.add('tap:drift'); }
        if (i === 440) keys.add('tap:item');
        step(1 / 120);
      }
      return world.hash(race.racers.map(Q => [Math.round(Q.prog * 10), Q.lap, Q.place, Q.item || 0]));
    } finally { Math.random = was; scripted = false; demo(); }
  }
  /** your kart's way when the bot drives it: its driver's, but over the shortcut when it comes to it (proving a lap
   *  through the shortcut still counts) */
  function shortcut(R, dt, drive) {
    const v = R.car, d = SHORT.nearest(v.x, v.y), p = SHORT.at(d), on = Math.hypot(p.x - v.x, p.y - v.y) < 40 && d < SHORT.length - 12;
    const into = ((R._d - OFF + LEN) % LEN) > LEN - 90;   // (just before it: turn in)
    if (!on && !into) return drive.call(race, R, dt);
    const q = on ? SHORT.at(d + 40) : SHORT.at(10), a = Math.atan2(q.y - v.y, q.x - v.x), diff = E.angDiff(v.angle, a); R.cuts = (R.cuts || 0) + (on ? dt : 0);
    return { steer: E.clamp(diff * 2.6, -1, 1), gas: 1, brake: Math.abs(diff) > .8 && v.speed > 140 ? 1 : 0 };
  }
  /** the bot (tools/kits-test.mjs): a race with every kart driven by its driver (yours over the shortcut each lap) to the
   *  end; then a race for two in a split screen, both players holding the gas a while */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s); scripted = true;
    try {
      game.go('racing', null, { fade: 0 }); game.advance(1 / 120); start(false);
      const me = players[0], dt = 1 / 120; me.input = null; me.ai = { skill: .95, rubber: 0, grip: 700, lane: 0 };
      const drive = E.Race.prototype.drive; race.drive = (R, d) => R === me ? shortcut(R, d, drive) : drive.call(race, R, d);
      let n = 0, stuck = 0, air = 0;
      for (; n < 120 * 300 && !race.over; n++) {
        step(dt);
        for (const R of race.racers) { stuck = Math.max(stuck, R._stuck || 0); air = Math.max(air, R.car.airT); }
      }
      delete race.drive;
      const one = { finished: race.results.length, laps: race.racers.map(R => R.lap), seconds: Math.round(n / 120), best: Math.min(...race.racers.map(R => R.best || 99)).toFixed(1), shortcut: +(me.cuts || 0).toFixed(1), yours: me.place, stuck: +stuck.toFixed(2), air: +air.toFixed(2), rescued: race.racers.reduce((k, R) => k + (R.rescued || 0), 0) };
      scripted = false;
      if (game.players.length < 2) game.addPlayer({ keys: 'right' });
      start(true, { countdown: 1 }); const P2 = game.players; P2[0].hold('gas'); P2[1].hold('gas'); game.advance(9); P2[0].hold('gas', false); P2[1].hold('gas', false);
      const two = { viewports: game.viewports.length, cameras: world.cameras.length, prog: players.map(R => Math.round(R.prog)), names: players.map(R => R.name) };
      toMenu(); game.removePlayer(2);
      return Object.assign(one, { split: two, errors: game.errors.length });
    } finally { Math.random = was; scripted = false; }
  }

  return {
    view: 'iso', input: KEYS, pausable: true, touch: TOUCH, camera: { zoom: false }, play: { part: 'race', countdown: .3 },
    enter(d) {
      active = world; game.allowJoin({ max: 2 }); toMenu();
      if (d && d.part) d.part === 'vs' ? versus() : start(false, d);
    },
    exit() { game.splitScreen(0); game.allowJoin(false); },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'join' || mode === 'results') { toMenu(); return true; } return false; },
    update, draw(r) { world.draw(r); hud(r); },
    get world() { return world; }, get hero() { return players[0] ? players[0].car : race && race.racers[0].car; }, get race() { return race; }, get mode() { return mode; },
    get track() { return track; }, run, bot, LINE, SHORT
  };
})();
scenes.racing = RACING;
