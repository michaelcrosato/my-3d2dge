/* =====================================================================================
 * SLICE 13  KART  (Super Mario Kart, F-Zero, Mario Kart 64). @modules mode7 drive
 * A circuit in a meadow seen the SNES way, Mode 7: the floor drawn a row at a time under a sky that turns with you,
 * six karts on it, three laps. Kerbs, grass that slows you, sand inside the tight bends, boost pads on the straights,
 * walls round the edge, item boxes in rows across the track: a BOOST, a SHELL that flies ahead and spins out whoever it
 * hits, or a PEEL dropped behind. Hop into a bend and hold the drift: sparks blue, then orange; let go for a boost.
 * MODES: RACE (you against five), VS (two players in a split screen, against four: player 2 joins with 2 on the
 * keyboard or Start on a pad). Then the results. Deep links: #kart/race, #kart/vs.
 * KEYS: left / right (A / D) steer, up / Z gas, down / X brake, Space / Shift hop and drift, E / J the item. A pad: the
 * stick, A gas, X brake, R hop and drift, L the item. TOUCH: the stick steers (pulled down it brakes), DRIFT and ITEM;
 * it accelerates by itself.
 * HOW IT WORKS: E.Mode7 (the mode7 module) draws the floor, the sky and the karts far to near; E.Car and E.Race (the
 * drive module) the karts, the laps, the drivers and the items; this file the track, the look of the karts (HD rigs in
 * karts drawn from whatever side the camera sees), the HUD's map and the menus.
 * ===================================================================================== */
const KART = (() => {
  const A = game.audio, T = 16, N = 64, SIZE = N * T, HALF = 44;   // the floor: 64 x 64 cells of 16 units; the road's half width
  const KEYS = Object.assign({}, E.Input.DEFAULT, { gas: ['ArrowUp', 'KeyW', 'KeyZ', 'Pad0'], brake: ['ArrowDown', 'KeyS', 'KeyX', 'Pad2'], drift: ['Space', 'ShiftLeft', 'ShiftRight', 'KeyC', 'Pad5', 'Pad7'], item: ['KeyE', 'KeyJ', 'Pad4', 'Pad6'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  /* ---- THE TRACK: its line (the racing line, the start at its first point, heading north), then every cell from its
   * distance to the line: road, kerb, grass, sand, wall ---- */
  const LINE = new E.Path([[160, 600], [160, 380], [175, 220], [230, 140], [360, 120], [520, 125], [680, 140], [760, 240], [720, 370], [580, 420], [480, 510], [530, 630], [680, 690], [820, 650], [890, 770], [830, 880], [640, 890], [420, 890], [240, 880], [165, 800]], { closed: true, smooth: 'catmull' });
  const LEN = LINE.length, SANDS = [[620, 320, 90], [770, 790, 70], [300, 230, 60]], BOOSTS = [LEN * .3, LEN * .82], BOXES = [LEN * .2, LEN * .55];
  const cells = [], floor = [];
  for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
    const x = (cx + .5) * T, y = (cy + .5) * T, d = LINE.nearest(x, y), p = LINE.at(d), e = Math.hypot(p.x - x, p.y - y);
    const wall = e > HALF + 46 || cx === 0 || cy === 0 || cx === N - 1 || cy === N - 1;
    let tag = e < HALF ? (BOOSTS.some(b => Math.abs(d - b) < 14) && e < HALF * .55 ? 'boost' : (d < 9 || d > LEN - 9) ? 'start' : null) : e < HALF + 8 ? 'kerb' : 'grass';
    if (tag === 'grass' && SANDS.some(([sx, sy, r]) => Math.hypot(x - sx, y - sy) < r)) tag = 'sand';
    cells.push(wall ? 1 : 0); floor.push(wall ? null : tag);
  }
  const map = new E.TileMap({ w: N, h: N, cells, floor, types: { 1: { h: 30, side: '#8a8478', top: '#b8b2a4' } } });
  // the wall: the out-of-bounds cells beside the track (a low stone wall on the floor); past it a wood, trees standing in it
  const wallAt = (cx, cy) => map.cell(cx, cy) !== 0, edge = new Uint8Array(N * N), TREES = [];
  for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) if (wallAt(cx, cy)) {
    if (!wallAt(cx + 1, cy) || !wallAt(cx - 1, cy) || !wallAt(cx, cy + 1) || !wallAt(cx, cy - 1)) edge[cy * N + cx] = 1;
    else if ((cx * 7 + cy * 13) % 9 === 0 && !edge[cy * N + cx - 1] && !edge[cy * N + cx + 1]) TREES.push([(cx + .5) * T + (cx * 31 % 7) - 3, (cy + .5) * T + (cy * 17 % 7) - 3]);
  }
  // the floor's colors, a texel a unit: asphalt, kerbs, grass in stripes, sand, boost chevrons, the chequered line, walls
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const look = (x, y) => {
    const cx = x >> 4, cy = y >> 4, n = hash(x, y) % 9;
    if (map.cell(cx, cy) > 0) {
      if (!edge[cy * N + cx]) return n > 5 ? [44, 92, 40] : [52, 104, 46];   // (the wood's floor)
      const b = ((y >> 2) & 1 ? x + 4 : x) >> 3; return ((x & 7) === 0 || (y & 3) === 0) ? [110, 100, 88] : (b + (y >> 2)) % 3 ? [196, 188, 170] : [172, 164, 146];
    }
    const tag = map.floorAt(x, y);
    if (tag === 'kerb') return (cx + cy) & 1 ? [236, 236, 236] : [220, 48, 48];
    if (tag === 'grass') return ((x + y) >> 5) & 1 ? [84 + n, 168, 72] : [72 + n, 150, 62];
    if (tag === 'sand') return n > 6 ? [196, 160, 100] : [228, 196, 132];
    if (tag === 'start') return ((x >> 2) + (y >> 2)) & 1 ? [240, 240, 240] : [30, 30, 36];
    if (tag === 'boost') return ((y + (x & 7)) >> 3) & 1 ? [255, 210, 40] : [255, 120, 30];
    return [104 + n, 102 + n, 112 + n];
  };
  const TREE = E.prop('tree', { color: '#3a8a40' }).frames[0];
  const m7 = new E.Mode7({ floor: look, size: [SIZE, SIZE], outside: '#3c7a34', sky: new E.Backdrop('day'), far: 1400 });
  // the map in the HUD's corner: a pixel a cell
  let mini = null;
  const miniMap = () => mini || (mini = (() => { const c = E.mkCanvas(N, N), g = c.getContext('2d'); for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) { const t = map.floorTags[cy * N + cx], w = map.cell(cx, cy) > 0; g.fillStyle = w ? 'rgba(0,0,0,0)' : t === 'grass' || t === 'sand' ? 'rgba(40,90,40,.6)' : '#d8d8e0'; g.fillRect(cx, cy, 1, 1); } return c; })());

  /* ---- THE DRIVERS: six HD rigs, each in a kart of its own colors ---- */
  const CAST = [
    { name: 'NOVA', kart: '#e83030', rig: { hair: 'short', hat: 'cap', colors: { cloth: '#e83030', pants: '#2f5fd0', hair: '#5a3018', hat: '#e83030' } } },
    { name: 'LUMA', kart: '#3aa850', rig: { hair: 'ponytail', colors: { cloth: '#3aa850', pants: '#f0e8d0', hair: '#e8c060' } } },
    { name: 'BRAKK', kart: '#e8a020', rig: { build: 'bulky', hair: 'spiky', colors: { cloth: '#e8a020', pants: '#5a3a2a', hair: '#2a1a10' } } },
    { name: 'IRIS', kart: '#c050e0', rig: { hair: 'long', colors: { cloth: '#c050e0', pants: '#3a2a5a', hair: '#f0f0f8' } } },
    { name: 'TOK', kart: '#30b8e0', rig: { hat: { style: 'band', color: '#ffffff' }, colors: { cloth: '#30b8e0', pants: '#1a3a5a', hair: '#1a1a1a' } } },
    { name: 'ROOK', kart: '#5a5a6a', rig: { hood: true, colors: { cloth: '#3a3a48', pants: '#22222c', hair: '#1a1a1a' } } }
  ].map(c => Object.assign(c, { rig: new E.Humanoid(Object.assign({ size: .85, weapon: null }, c.rig)) }));
  const SONG = { bpm: 148, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'C5 . E5 G5 . E5 C5 . | D5 . F5 A5 . F5 D5 . | E5 . G5 C6 . G5 E5 . | D5 . B4 G4 . A4 B4 .' },
    { wave: 'triangle', vol: .26, notes: 'C3 C3 G2 G2 C3 C3 G2 G2 | D3 D3 A2 A2 D3 D3 A2 A2 | E3 E3 B2 B2 C3 C3 G2 G2 | G2 G2 D3 D3 G2 G2 B2 B2' },
    { wave: 'drums', vol: .07, notes: 'k . h k s . h . k . h k s . h h' }] };

  let mode = 'menu', vs = false, race = null, players = [], cams = [], over = 0, t = 0;
  const menu = new E.Menu(game, ['RACE', 'VS (2 PLAYERS)', 'BACK'], { onPick: i => i === 2 ? game.go('title') : i === 1 ? versus() : start(false) });
  const after = new E.Menu(game, ['RACE AGAIN', 'MENU'], { onPick: i => i === 0 ? start(vs) : toMenu() });
  function toMenu() { mode = 'menu'; race = null; game.splitScreen(0); A.music('title'); }
  function versus() { if (game.players.length >= 2) start(true); else { mode = 'join'; A.sfx('select'); } }
  /** a race: six karts on the grid (the players' at the back, as Super Mario Kart starts you), items in rows */
  function start(two) {
    vs = two; mode = 'race'; over = 0; t = 0;
    race = new E.Race({ path: LINE, laps: 3, width: HALF, checkpoints: 10 });
    const grid = race.grid(6), order = two ? [2, 3, 4, 5, 0, 1] : [1, 2, 3, 4, 5, 0];
    players = [];
    order.forEach((ci, k) => {
      const c = CAST[ci], g = grid[k], car = new E.Car(Object.assign({ kart: true, top: 205, accel: 150, turn: 2.3, grip: 9, drift: 2, r: 9 }, g));
      const human = ci === 0 || (two && ci === 1), R = race.add(car, human ? { name: c.name, input: game.players[ci] || game.input } : { name: c.name, ai: { skill: .9 + ci * .012, rubber: .25 } });
      R.cast = c; if (human) players[ci] = R;
    });
    for (const d of BOXES) { const p = LINE.at(d); for (const u of [-.6, -.2, .2, .6]) race.box(p.x - Math.sin(p.angle) * u * HALF, p.y + Math.cos(p.angle) * u * HALF); }
    cams = players.map(R => ({ x: R.car.x, y: R.car.y, h: 24, angle: R.car.angle, pitch: 9, fov: 62 }));
    game.splitScreen(two ? 2 : 0, { layout: 'rows' }); A.music(SONG); game.input.consumeAll();
  }

  /* ---- each step ---- */
  function update(dt) {
    const I = game.input;
    for (const k of ['drift', 'item']) I.touchSet(k, null, mode === 'race');
    if (mode === 'menu' || mode === 'join') t += dt;   // (the title's camera rides the line)
    if (mode === 'menu') { menu.update(dt); return; }
    if (mode === 'join') { if (game.players.length >= 2) start(true); else if (I.pressed('cancel')) mode = 'menu'; return; }
    t += dt;
    const was = race.t; for (const R of players) R.car.o.auto = R.input.lastDevice === 'touch';
    race.update(dt, map);
    if (was < 0 && Math.floor(was) !== Math.floor(race.t)) A.sfx(race.t >= 0 ? 'confirm' : 'select');
    for (const R of players) {
      if (R.input.pressed('item') && race.go) { const had = R.item; race.use(R); if (had) A.sfx(had === 'shot' ? 'shoot' : had === 'boost' ? 'powerup' : 'whoosh'); }
      if (R.car.bumped) A.sfx('bump', { vol: .4 });
      if (R.lap !== R._lap) { if (R._lap !== undefined && !R.finished) A.sfx('oneup'); if (R.finished && !R._fin) { A.sfx('secret'); R._fin = true; } R._lap = R.lap; }
    }
    // each camera behind its kart, turning after it (a drift swings the kart, not the view)
    players.forEach((R, i) => { const c = cams[i], k = 1 - Math.exp(-dt * 5); c.angle += E.angDiff(c.angle, R.car.angle) * k; m7.cam = c; m7.chase({ x: R.car.x, y: R.car.y, angle: c.angle }, { back: 42, h: 24 + R.car.z * .5 }); });
    // the riders: seated, leaning into the turn
    for (const R of race.racers) R.cast.rig.update(dt, { x: R.car.x, y: R.car.y, z: 0, vx: 0, vy: 0, facing: R.car.angle, down: .4, hurt: R.car.spinT > 0 });
    if (players.length && players.every(R => R && R.finished)) { over += dt; if (over > 2.5 && mode === 'race') { mode = 'results'; after.i = 0; } }
    if (mode === 'results') after.update(dt);
  }

  /* ---- the look ---- */
  // a box of the kart (center l, half sizes h, local: forward x, right y, up z) seen through view v, its foot at (X, Y)
  function box(g, v, X, Y, a, l, h, col) {
    const c = Math.cos(a), s = Math.sin(a), P = (lx, ly, lz) => { const wx = lx * c - ly * s, wy = lx * s + ly * c; return [X + v.ax * wx + v.ay * wy, Y + v.bx * wx + v.by * wy + v.bz * lz]; };
    const [x0, y0, z0] = [l[0] - h[0], l[1] - h[1], l[2] - h[2]], [x1, y1, z1] = [l[0] + h[0], l[1] + h[1], l[2] + h[2]], dk = E.shade(col, -.25), dk2 = E.shade(col, -.4);
    for (const [nx, ny, q, k] of [[1, 0, [[x1, y0], [x1, y1]], dk], [-1, 0, [[x0, y1], [x0, y0]], dk], [0, 1, [[x1, y1], [x0, y1]], dk2], [0, -1, [[x0, y0], [x1, y0]], dk2]]) {
      if ((nx * c - ny * s) * v.dx + (nx * s + ny * c) * v.dy <= 0) continue;   // (a side turned away)
      E.px.poly(g, [P(q[0][0], q[0][1], z0), P(q[1][0], q[1][1], z0), P(q[1][0], q[1][1], z1), P(q[0][0], q[0][1], z1)], k);
    }
    E.px.poly(g, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], col);
  }
  const PARTS = [   // [center, half sizes, color: 'k' the kart's, else its own] (forward x, right y, up z)
    [[7.5, 8.2, 2.4], [2.7, 1.8, 2.4], '#1a1a20'], [[7.5, -8.2, 2.4], [2.7, 1.8, 2.4], '#1a1a20'], [[-7.5, 8.7, 2.7], [3, 2.1, 2.7], '#1a1a20'], [[-7.5, -8.7, 2.7], [3, 2.1, 2.7], '#1a1a20'],
    [[0, 0, 2.4], [10.5, 6, 1.2], 'k'], [[8, 0, 4], [3.6, 5.2, 2.2], 'k'], [[-9.6, 0, 4.5], [2.1, 4.5, 2.4], '#4a4a54'], [[-5, 0, 5.6], [1, 4, 3], 'k']];
  function drawKart(g, sx, sy, k, R) {
    const v = m7.view(k), car = R.car, a = car.angle + (car.spinT > 0 ? 0 : car.drifting * .35), ground = m7.project(car.x, car.y, 0), dx = v.dx, dy = v.dy;
    if (ground) { const al = g.globalAlpha; g.globalAlpha = al * .4; E.px.ell(g, ground[0], ground[1], 13 * k, 4 * k, '#102010'); g.globalAlpha = al; }
    const c = Math.cos(a), s = Math.sin(a), depth = l => (l[0] * c - l[1] * s) * dx + (l[0] * s + l[1] * c) * dy, items = PARTS.map(p => [depth(p[0]), () => box(g, v, sx, sy, a, p[0], p[1], p[2] === 'k' ? R.cast.kart : p[2])]);
    const seat = [-2.4, 0, 3.4], wx = seat[0] * c, wy = seat[0] * s;
    items.push([depth(seat), () => R.cast.rig.draw(g, Math.round(sx + v.ax * wx + v.ay * wy), Math.round(sy + v.bx * wx + v.by * wy + v.bz * seat[2]), v)]);
    items.sort((p, q) => p[0] - q[0]); for (const [, f] of items) f();
    if (car.drifting && car.charge > .4) for (const side of [-1, 1]) { const lx = -9, ly = side * 8.7, X = sx + v.ax * (lx * c - ly * s) + v.ay * (lx * s + ly * c), Y = sy + v.bx * (lx * c - ly * s) + v.by * (lx * s + ly * c); E.px.disc(g, X, Y - k, Math.max(1, 1.6 * k), car.charge >= 2 ? (t * 20 % 2 < 1 ? '#ff9a2a' : '#ffe060') : (t * 20 % 2 < 1 ? '#58b8ff' : '#d8f0ff')); }
    if (car.boostT > 0) { const lx = -12, X = sx + v.ax * lx * c + v.ay * lx * s, Y = sy + v.bx * lx * c + v.by * lx * s + v.bz * 3; E.px.disc(g, X, Y, Math.max(1, (2 + Math.sin(t * 40)) * k), '#ffb040'); }
  }
  // the wood's trees within sight of a camera (ahead of it, not too far)
  function trees(c) { const fx = Math.cos(c.angle), fy = Math.sin(c.angle); for (const [x, y] of TREES) { const d = (x - c.x) * fx + (y - c.y) * fy; if (d > 40 && d < 900) m7.sprite(TREE, x, y, 0, { scale: 1.6 }); } }
  function draw(r) {
    const W = r.W, H = r.H;
    if (mode === 'menu' || mode === 'join') {
      const p = LINE.at(t * 40); m7.cam = { x: p.x, y: p.y, h: 60, angle: p.angle, pitch: 14, fov: 70 }; trees(m7.cam);
      m7.draw(r);
      r.overlay(g => {
        E.font.title(g, 'KART', W / 2, 30, { scale: 4, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8402a'] });
        if (mode === 'join') E.font.text(g, 'PLAYER 2: PRESS 2 OR START ON A PAD', W / 2, H / 2, '#ffffff', { align: 'center', shadow: '#000', outline: false });
      });
      if (mode === 'menu') { menu.y = Math.round(H / 2) - 6; menu.draw(r); }
      return;
    }
    const i = r.viewport ? r.viewport.i : 0, me = players[vs ? i : 0], cam = cams[vs ? i : 0];
    trees(cam);
    for (const R of race.racers) m7.add(R.car.x, R.car.y, R.car.z, (g, sx, sy, k) => drawKart(g, sx, sy, k, R));
    for (const b of race.boxes) if (b.t <= 0) m7.add(b.x, b.y, 6 + Math.sin(t * 4) * 1.5, (g, sx, sy, k) => { const s = 7 * k, hue = (t * 120 + b.x) % 360; E.px.rect(g, sx - s, sy - s * 2, s * 2, s * 2, E.hsl(hue, .8, .55)); E.px.rect(g, sx - s + 1, sy - s * 2 + 1, s * 2 - 2, s * 2 - 2, E.hsl(hue, .7, .7)); if (s > 4) E.font.text(g, '?', Math.round(sx), Math.round(sy - s * 1.6), '#ffffff', { align: 'center', outline: false, shadow: '#000', scale: s > 12 ? 2 : 1 }); });
    for (const s of race.shots) m7.add(s.x, s.y, 2, (g, sx, sy, k) => { E.px.disc(g, sx, sy - 3 * k, 4 * k, '#2a9a2a'); E.px.disc(g, sx - k, sy - 4 * k, 2 * k, '#8af08a'); });
    for (const h of race.hazards) m7.add(h.x, h.y, 0, (g, sx, sy, k) => { E.px.poly(g, [[sx - 5 * k, sy], [sx, sy - 6 * k], [sx + 5 * k, sy], [sx, sy - 2 * k]], '#f0d030'); });
    m7.draw(r, cam);
    if (me) race.hud(r, me, { color: vs ? (i ? '#ffd080' : '#a0d8ff') : '#ffffff' });
    if (!vs && me) r.overlay(g => {   // the map: the track, every kart a dot (yours blinking)
      const S = Math.max(40, Math.min(64, Math.round(H / 4))), X = 4, Y = H - S - 4, ta = game.input.touchArea && game.input.touchArea();
      if (ta) return;   // (a phone: the buttons sit there)
      g.globalAlpha = .85; g.drawImage(miniMap(), X, Y, S, S); g.globalAlpha = 1;
      for (const R of race.racers) { if (R === me && Math.floor(t * 4) % 2) continue; E.px.rect(g, X + R.car.x / SIZE * S - 1, Y + R.car.y / SIZE * S - 1, 3, 3, R.cast.kart); }
    });
    if (!vs) board(r);
  }
  // the results: every kart's place and time, and what next (over the whole screen, a split screen's too: hud)
  function board(r) {
    if (mode !== 'results') return;
    const W = r.W, H = r.H;
    r.overlay(g => {
      const w = 170, h = 16 + race.racers.length * 11, x = Math.round((W - w) / 2), y = Math.round(H / 2 - h / 2 - 20);
      E.ui.box(g, x, y, w, h, { bg: '#141a3a', border: '#e8e4ff' });
      race.racers.slice().sort((a, b) => a.place - b.place).forEach((R, k) => { const yy = y + 8 + k * 11, fin = R.finished ? Math.floor(R.time / 60) + "'" + (R.time % 60).toFixed(2).padStart(5, '0') : '--'; E.font.text(g, R.place + '. ' + R.name, x + 8, yy, players.includes(R) ? '#ffe04a' : '#ffffff', { outline: false }); E.font.text(g, fin, x + w - 8, yy, '#c8c8e0', { align: 'right', outline: false }); });
    });
    after.y = Math.round(H / 2) + 52; after.draw(r);
  }

  /** the bot (tools/kits-test.mjs): a race with every kart driven by its driver (yours too) to the end; then a race for
   *  two in a split screen, both players holding the gas a while */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s);
    try {
      game.go('kart', null, { fade: 0 }); game.advance(1 / 120); start(false);
      players[0].ai = { skill: .9, rubber: .25, lane: 0 }; players[0].input = null;
      let n = 0, stuck = 0; for (; n < 240 && !race.over; n++) { game.advance(1); for (const R of race.racers) stuck = Math.max(stuck, R._stuck); }
      const one = { finished: race.results.length, laps: race.racers.map(R => R.lap), seconds: n, best: Math.min(...race.racers.map(R => R.best || 99)).toFixed(1) };
      if (game.players.length < 2) game.addPlayer({ keys: 'right' });
      start(true); const P = game.players; P[0].hold('gas'); P[1].hold('gas'); game.advance(9); P[0].hold('gas', false); P[1].hold('gas', false);
      const two = { viewports: game.viewports.length, prog: players.map(R => Math.round(R.prog)), names: players.map(R => R.name) };
      toMenu(); game.removePlayer(2);
      return Object.assign(one, { split: two, stuck: +stuck.toFixed(2), errors: game.errors.length });
    } finally { Math.random = was; }
  }

  return { view: 'topdown', views: ['topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['drift', 'item'], camera: { zoom: false },
    enter(d) {
      mode = 'menu'; race = null; menu.i = 0; game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false;
      game.allowJoin({ max: 2 }); A.music('title');
      if (d && d.part) d.part === 'vs' ? versus() : start(false);
    },
    exit() { game.splitScreen(0); game.allowJoin(false); },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'join' || mode === 'results') { toMenu(); return true; } return false; },
    update, draw, bot, hud: board,
    state: () => race && { mode, t: +race.t.toFixed(2), racers: race.racers.map(R => ({ name: R.name, lap: R.lap, place: R.place, x: Math.round(R.car.x), y: Math.round(R.car.y), speed: Math.round(R.car.speed), item: R.item })) },   // for tests
    race: () => race,   // (for tests)
    /** the proof: a race, the gas held, a hop and a drift into the first bend, the item fired; a hash of every kart */
    run: (n = 600) => proof('kart', n, (i, k) => {
      if (i === 2) start(false);
      if (i === 380) k.hold('gas');
      if (i === 520) { k.hold('right'); k.tap('drift'); k.hold('drift'); }
      if (i === 580) { k.up('right'); k.up('drift'); k.tap('item'); }
    }, () => race ? race.racers.map(R => [R.car.x, R.car.y, R.car.angle, R.prog]) : null) };
})();
scenes.kart = KART;
