/* =====================================================================================
 * SLICE 27  SPECIAL  (Sonic 3's Blue Sphere, Sonic 2's half-pipe, Super Mario Kart's battle, Contra III's top-down
 * stages and Super Castlevania IV's turning room). @modules mode7 drive
 * The Mode 7 era's bonus stages and arenas, a few minutes each. PLANET: a checkered world so small it curves away on
 * every side; run over every blue sphere (it turns red behind you), never touch a red one (jump it), turn a quarter at a
 * crossing. TUBE: a half-pipe that twists and climbs into space; run up its walls for the rings, past the bombs, enough
 * of them by each of its three gates. ARENA: four karts, three balloons each, shells that bounce off the walls; the last
 * with a balloon wins (two to four players in a split screen). TURN: a fort seen from straight above that turns as you
 * do (Contra III); clear its three nests.
 * Deep links: #special/planet, #special/tube, #special/arena, #special/turn.
 * KEYS: left / right turn or steer (TURN: up / down walk), up / Z gas (ARENA), Space / X jump or fire. A pad: the
 * stick, A gas, B jump or fire. TOUCH: the stick; JUMP or FIRE (ARENA: it drives by itself).
 * HOW IT WORKS: E.Mode7 (the mode7 module): the planet a floor with curve (a globe) and wrap; the tube m7.quad strips
 * along an E.Path, the camera rolled with the runner so the pipe's floor stays down; the arena a floor of cells and its
 * walls as quads, the karts E.Car (the drive module); the fort the camera at pitch 90 (straight down), turned with you.
 * ===================================================================================== */
const SPECIAL = (() => {
  const KEYS = Object.assign({}, E.Input.DEFAULT, { gas: ['ArrowUp', 'KeyW', 'KeyZ', 'Pad0', 'Pad7'], brake: ['ArrowDown', 'KeyS', 'Pad2', 'Pad6'], fire: ['Space', 'KeyX', 'KeyC', 'Pad1', 'Pad5'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  const HERO = new E.Humanoid({ size: 1.1, hair: 'spiky', colors: { cloth: '#3a6ae8', pants: '#e8e8f0', hair: '#ffd040' } });
  const SONG = { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .05, notes: 'E5 . G5 . A5 . G5 E5 | D5 . E5 . G5 . . . | E5 . G5 . A5 . C6 A5 | G5 . E5 . D5 . . . | C5 . E5 . G5 . E5 C5 | D5 . G5 . B5 . . . | A5 . G5 . E5 . D5 . | E5 . . . . . . .' },
    { wave: 'triangle', vol: .09, notes: 'C3 C3 G3 C3 A2 A2 E3 A2 | F2 F2 C3 F2 G2 G2 D3 G2 | C3 C3 G3 C3 A2 A2 E3 A2 | F2 F2 C3 F2 G2 G2 G2 . ' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h k k . h . s h h .' }] };
  const PARTS = ['planet', 'tube', 'arena', 'turn'];
  let mode = 'menu', part = null, S = null, t = 0, auto = false, result = null;
  const menu = new E.Menu(game, [...PARTS.map(p => E.t('special.menu.' + p)), E.t('special.menu.back')], { onPick: i => i === 4 ? game.go('title') : start(PARTS[i]) });
  const after = new E.Menu(game, [E.t('special.again'), E.t('special.menu.menu')], { onPick: i => i === 0 ? start(part) : toMenu() });
  function toMenu() { mode = 'menu'; part = null; S = null; game.splitScreen(0); A.music('title'); }
  function start(p) { part = p; mode = 'play'; result = null; t = 0; S = STAGE[p].start(); A.music(SONG); game.input.consumeAll(); }
  function end(won, line) { if (mode !== 'play') return; mode = 'over'; result = { won, line }; after.i = 0; A.sfx(won ? 'secret' : 'hurt'); }
  const shade = (g, x, y, r, c, hi) => { px.disc(g, x, y, r, c); if (r > 2) px.disc(g, x - r * .35, y - r * .35, Math.max(1, r * .35), hi); };   // (a ball lit from the top left)
  const steerOf = I => { const m = I.move()[0]; return Math.abs(m) > .2 ? m : 0; };

  /* ---- PLANET: Blue Sphere. A grid on a globe; the runner goes on by itself, a quarter turn at a crossing ---- */
  const N = 32, CELL = 48, WW = N * CELL, DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const planet = new E.Mode7({ floor: (x, y) => ((Math.floor(x / CELL) + Math.floor(y / CELL)) & 1 ? [40, 150, 120] : [230, 200, 90]), size: [WW, WW], wrap: true, curve: 560, texel: 2, sky: ['#120a3a', '#7a5ae0'], far: 1300 });
  const PLANET = {
    start() {
      const g = new Array(N * N).fill(0), put = (x, y, v) => { g[((y % N + N) % N) * N + ((x % N + N) % N)] = v; };
      for (const [cx, cy, s] of [[16, 9, 4], [6, 6, 2], [26, 6, 3], [6, 20, 3], [25, 22, 4], [16, 22, 2]]) for (let i = -s; i <= s; i++) for (const [x, y] of [[cx + i, cy - s], [cx + i, cy + s], [cx - s, cy + i], [cx + s, cy + i]]) put(x, y, Math.abs(i) === s ? 2 : 1);   // squares of blue (1), red at their corners (2)
      for (let i = 0; i < N; i += 5) put(i, 14, 2);   // a broken red line across
      const blues = g.filter(v => v === 1).length;
      return { g, blues, total: blues, x: (16 + .5) * CELL, y: (28 + .5) * CELL, dir: 3, head: -Math.PI / 2, speed: 90, z: 0, vz: 0, turn: 0, was: 0, cells: 0, plan: null };
    },
    cell(S, x, y) { const i = ((Math.round(x / CELL - .5) % N) + N) % N, j = ((Math.round(y / CELL - .5) % N) + N) % N; return j * N + i; },
    // the autopilot: a search over (cell, heading) from here, never through red, to the nearest blue: its first move
    pilot(S) {
      const at = this.cell(S, S.x, S.y), seen = new Map(), q = [];
      for (const m of [0, -1, 1]) { const d = (S.dir + m + 4) % 4, c = this.step(at, d); if (S.g[c] !== 2) { q.push([c, d, m]); seen.set(c * 4 + d, 1); } }
      for (let h = 0; h < q.length; h++) {
        const [c, d, m] = q[h]; if (S.g[c] === 1) return { turn: m, jump: false };
        for (const k of [0, -1, 1]) { const nd = (d + k + 4) % 4, nc = this.step(c, nd); if (S.g[nc] !== 2 && !seen.has(nc * 4 + nd)) { seen.set(nc * 4 + nd, 1); q.push([nc, nd, m]); } }
      }
      return { turn: 0, jump: S.g[this.step(at, S.dir)] === 2 };   // (boxed in: jump the red ahead)
    },
    step(c, d) { const i = c % N, j = Math.floor(c / N); return (((j + DIRS[d][1]) % N + N) % N) * N + ((i + DIRS[d][0]) % N + N) % N; },
    update(S, dt, I) {
      const m = steerOf(I), key = I.pressed('left') ? -1 : I.pressed('right') ? 1 : 0, edge = m && Math.sign(m) !== S.was ? Math.sign(m) : 0; S.was = Math.sign(m);
      if (key || edge) S.turn = key || edge;
      if (auto && !S.plan) S.plan = this.pilot(S);
      if ((I.pressed('fire') || auto && S.plan && S.plan.jump) && S.z <= 0) { S.vz = 170; A.sfx('jump', { vol: .5 }); if (S.plan) S.plan.jump = false; }
      if (S.z > 0 || S.vz > 0) { S.vz -= 520 * dt; S.z = Math.max(0, S.z + S.vz * dt); if (S.z === 0) S.vz = 0; }
      S.speed = Math.min(200, S.speed + 4 * dt);
      let dist = S.speed * dt;
      while (dist > 0) {   // along the heading to the next crossing: there the sphere, and the turn
        const ax = DIRS[S.dir][0] ? 'x' : 'y', sg = DIRS[S.dir][0] || DIRS[S.dir][1], u = S[ax] / CELL - .5, nu = sg > 0 ? Math.floor(u) + 1 : Math.ceil(u) - 1, dn = Math.abs(nu - u) * CELL;
        if (dist < dn) { S[ax] += sg * dist; break; }
        S[ax] = (nu + .5) * CELL; dist -= dn; S.cells++;
        const c = this.cell(S, S.x, S.y);
        if (S.z <= 0) { if (S.g[c] === 2) { end(false, E.t('special.planet.red')); return; } if (S.g[c] === 1) { S.g[c] = 2; S.blues--; A.sfx('coin', { vol: .4 }); if (!S.blues) { end(true, E.t('special.planet.perfect')); return; } } }
        if (auto) { S.plan = this.pilot(S); S.turn = S.plan.turn; }
        if (S.turn && S.z <= 0) { S.dir = (S.dir + S.turn + 4) % 4; S.turn = 0; }
      }
      S.x = (S.x % WW + WW) % WW; S.y = (S.y % WW + WW) % WW;
      S.head += E.angDiff(S.head, Math.atan2(DIRS[S.dir][1], DIRS[S.dir][0])) * Math.min(1, dt * 14);
      HERO.update(dt, { x: 0, y: 0, z: S.z, vx: Math.cos(S.head) * S.speed, vy: Math.sin(S.head) * S.speed, facing: S.head, air: S.z > 2 });
    },
    draw(S, r) {
      const V = planet, cam = { x: S.x - Math.cos(S.head) * 64, y: S.y - Math.sin(S.head) * 64, h: 34, angle: S.head, pitch: 20, fov: 72 };
      for (let dj = -11; dj <= 11; dj++) for (let di = -11; di <= 11; di++) {
        const i = Math.floor(S.x / CELL) + di, j = Math.floor(S.y / CELL) + dj, v = S.g[((j % N + N) % N) * N + ((i % N + N) % N)]; if (!v) continue;
        const x = (i + .5) * CELL, y = (j + .5) * CELL; if ((x - S.x) * Math.cos(S.head) + (y - S.y) * Math.sin(S.head) < -6) continue;   // (none behind the runner: the camera is close behind)
        V.add(x, y, 0, (g, sx, sy, k) => { const rr = Math.max(1, 8 * k); shade(g, sx, sy - rr, rr, v === 1 ? '#2a6aff' : '#e82a2a', v === 1 ? '#a8d0ff' : '#ffb0a0'); });
      }
      V.add(S.x, S.y, S.z, (g, sx, sy, k) => HERO.draw(g, Math.round(sx), Math.round(sy), V.view(k)));
      V.draw(r, cam);
      r.overlay(g => { shade(g, 14, 14, 6, '#2a6aff', '#a8d0ff'); E.font.text(g, E.t('special.planet.left', { n: S.blues }), 24, 9, '#ffffff', { shadow: '#000', outline: false }); });
    },
    state: S => ({ blues: S.blues, total: S.total, cells: S.cells, x: Math.round(S.x), y: Math.round(S.y), dir: S.dir })
  };

  /* ---- TUBE: Sonic 2's half-pipe. A path in space; the runner an angle round the pipe's floor ---- */
  const PR = 56, SEG = 36, TH = 10, TUBE_PATH = new E.Path(Array.from({ length: 20 }, (_, i) => { const a = i / 20 * Math.PI * 2; return [2048 + 1300 * Math.cos(a) + 220 * Math.sin(3 * a), 2048 + 900 * Math.sin(a) + 160 * Math.cos(2 * a), 260 + 140 * Math.sin(2 * a)]; }), { closed: true, smooth: 'catmull' });
  const TL = TUBE_PATH.length, GATES = [TL / 3, TL * 2 / 3, TL], QUOTA = [18, 40, 62];
  const space = new E.Mode7({ floor: (x, y) => { const h = ((Math.floor(x / 16) * 73856093) ^ (Math.floor(y / 16) * 19349663)) >>> 0; return h % 97 === 0 ? [220, 220, 255] : [12, 8, 34]; }, size: [4096, 4096], wrap: true, texel: 4, sky: ['#04020e', '#2a1a5a'], far: 2600 });
  // a point on the pipe at distance s along it, theta round it (0 its floor, + to the right), lifted l toward its middle
  const onPipe = (s, th, l = 0) => { const p = TUBE_PATH.at(s), rx = -Math.sin(p.angle), ry = Math.cos(p.angle), R = PR - l; return [p.x + rx * R * Math.sin(th), p.y + ry * R * Math.sin(th), p.z + PR - R * Math.cos(th)]; };
  const TUBE = {
    start() {
      const things = [];
      for (let s = 300; s < TL - 60; s += 130) {   // rows of rings, now and then a bomb among them
        const k = Math.round(s / 130), th = Math.sin(k * .55), nx = Math.sin((k + .5) * .55);   // (each row a little round from the last: a line a runner can follow)
        for (let i = -1; i <= 1; i++) things.push({ s: s + i * 18, th: th + i * .02, ring: true });
        if (k % 3 === 0) things.push({ s: s + 65, th: clamp(nx + (k & 1 ? .55 : -.55), -1.3, 1.3), ring: false });   // (a bomb beside the line)
        if (k % 5 === 2) things.push({ s: s + 65, th: nx, ring: false });   // (a bomb on it: round it or jump it)
      }
      return { s: 0, th: 0, l: 0, vl: 0, speed: 210, rings: 0, gate: 0, things, flash: 0 };
    },
    update(S, dt, I) {
      let steer = steerOf(I) || (I.down('left') ? -1 : I.down('right') ? 1 : 0), jump = I.pressed('fire');
      if (auto) {   // steer for the nearest ring ahead, off a bomb's line; jump a bomb that can't be missed
        const ahead = S.things.filter(o => !o.got && o.s > S.s + 8 && o.s < S.s + 220).sort((a, b) => a.s - b.s), ring = ahead.find(o => o.ring), bomb = ahead.find(o => !o.ring && Math.abs(o.th - S.th) < .3 && o.s < S.s + 70);
        steer = clamp(((ring ? ring.th : 0) - S.th) * 3, -1, 1); if (bomb) { steer = bomb.th > S.th ? -1 : 1; jump = Math.abs(bomb.th - S.th) < .15 && bomb.s < S.s + 40; }
      }
      S.th = clamp(S.th + steer * 2.4 * dt, -1.35, 1.35);
      if (jump && S.l <= 0) { S.vl = 150; A.sfx('jump', { vol: .5 }); }
      if (S.l > 0 || S.vl > 0) { S.vl -= 460 * dt; S.l = Math.max(0, S.l + S.vl * dt); if (S.l === 0) S.vl = 0; }
      S.speed = Math.min(330, S.speed + 5 * dt); S.s += S.speed * dt; S.flash = Math.max(0, S.flash - dt);
      for (const o of S.things) if (!o.got && Math.abs(o.s - S.s) < 10 && Math.abs(o.th - S.th) < .24 && S.l < 12) {
        o.got = true;
        if (o.ring) { S.rings++; A.sfx('coin', { vol: .3 }); } else { S.rings = Math.max(0, S.rings - 8); S.flash = .6; A.sfx('hurt', { vol: .5 }); }
      }
      if (S.s >= GATES[S.gate]) {
        if (S.rings < QUOTA[S.gate]) { end(false, E.t('special.tube.short', { n: QUOTA[S.gate] })); return; }
        A.sfx('oneup'); if (++S.gate === 3) { end(true, E.t('special.tube.clear')); return; }
      }
      HERO.update(dt, { x: 0, y: 0, z: S.l, vx: 0, vy: -S.speed, facing: -Math.PI / 2, air: S.l > 2 });
    },
    draw(S, r) {
      const V = space, c = onPipe(S.s - 90, S.th, PR * .62), p0 = TUBE_PATH.at(S.s - 90), cam = { x: c[0], y: c[1], h: c[2], angle: p0.angle, pitch: 3, fov: 74, roll: S.th * 180 / Math.PI };
      cam.angle += E.angDiff(cam.angle, Math.atan2(TUBE_PATH.at(S.s).y - c[1], TUBE_PATH.at(S.s).x - c[0]));   // (looking at where the runner is)
      const k0 = Math.floor((S.s - 90) / SEG);
      for (let k = k0; k < k0 + 46; k++) {   // the pipe a strip at a time, a checker of two blues that runs past
        const a = k * SEG, b = a + SEG;
        for (let i = 0; i < TH; i++) {
          const t0 = -1.5 + 3 * i / TH, t1 = -1.5 + 3 * (i + 1) / TH, edge = i === 0 || i === TH - 1;
          V.quad([onPipe(a, t0), onPipe(a, t1), onPipe(b, t1), onPipe(b, t0)], edge ? (k & 1 ? '#e8e8ff' : '#ff6a3a') : (k + i) & 1 ? '#2a3ab8' : '#4a6ae8');
        }
        if (k % 30 === 0 && k > 0) { const gi = Math.round(k * SEG / (TL / 3)) - 1; if (Math.abs(k * SEG - GATES[gi]) < SEG) for (let i = 0; i < TH; i++) V.quad([onPipe(a, -1.5 + 3 * i / TH, .4), onPipe(a, -1.5 + 3 * (i + 1) / TH, .4), onPipe(a + 6, -1.5 + 3 * (i + 1) / TH, .4), onPipe(a + 6, -1.5 + 3 * i / TH, .4)], i & 1 ? '#ffe040' : '#202020'); }
      }
      for (const o of S.things) if (!o.got && o.s > S.s - 60 && o.s < S.s + 1100) {
        const q = onPipe(o.s, o.th, 8);
        V.add(q[0], q[1], q[2], (g, sx, sy, k) => { const rr = Math.max(1, 6 * k); if (o.ring) { px.disc(g, sx, sy - rr, rr, '#ffd040'); px.disc(g, sx, sy - rr, rr * .55, '#2a3ab8'); } else { shade(g, sx, sy - rr, rr, '#181820', '#6a6a7a'); px.rect(g, sx, sy - rr * 2.3, 1, Math.max(1, rr * .5), '#ff8a20'); } });
      }
      const h = onPipe(S.s, S.th, S.l);
      V.add(h[0], h[1], h[2], (g, sx, sy, k) => { if (S.flash > 0 && Math.floor(S.flash * 20) % 2) return; g.save(); g.translate(Math.round(sx), Math.round(sy)); g.rotate(S.th); HERO.draw(g, 0, 0, V.view(k)); g.restore(); });   // (stood up the wall it runs on)
      V.draw(r, cam);
      r.overlay(g => {
        E.font.text(g, E.t('special.tube.rings', { n: S.rings }), 8, 8, '#ffd040', { shadow: '#000', outline: false });
        E.font.text(g, E.t('special.tube.gate', { i: Math.min(3, S.gate + 1), n: QUOTA[Math.min(2, S.gate)] }), 8, 8 + E.font.lineHeight() + 2, '#ffffff', { shadow: '#000', outline: false });
      });
    },
    state: S => ({ s: Math.round(S.s), th: +S.th.toFixed(3), rings: S.rings, gate: S.gate })
  };

  /* ---- ARENA: Super Mario Kart's battle. A floor of cells, its walls; karts with balloons, bouncing shells ---- */
  const AN = 40, AT = 16, ARENA_ROWS = [];
  for (let j = 0; j < AN; j++) { let s = ''; for (let i = 0; i < AN; i++) { const wall = i === 0 || j === 0 || i === AN - 1 || j === AN - 1 || ((i >= 9 && i <= 12) || (i >= 27 && i <= 30)) && ((j >= 9 && j <= 12) || (j >= 27 && j <= 30)) || (i >= 18 && i <= 21 && j >= 18 && j <= 21); s += wall ? '#' : '.'; } ARENA_ROWS.push(s); }
  const ARENA_MAP = new E.TileMap({ w: AN, h: AN, cells: ARENA_ROWS.join('').split('').map(c => c === '#' ? 1 : 0), types: { 1: { h: 30 } } });
  const solid = (x, y) => { const i = Math.floor(x / AT), j = Math.floor(y / AT); return i < 0 || j < 0 || i >= AN || j >= AN || ARENA_ROWS[j][i] === '#'; };
  const arena = new E.Mode7({ floor: (x, y) => solid(x, y) ? [90, 70, 110] : ((Math.floor(x / 32) + Math.floor(y / 32)) & 1 ? [200, 180, 140] : [180, 160, 120]), size: [AN * AT, AN * AT], outside: '#2a1a3a', sky: ['#3a8ae8', '#c8e8ff'], far: 900 });
  const WALLS = [];   // the walls' faces, each a quad 16 high, where a wall cell meets the floor
  for (let j = 0; j < AN; j++) for (let i = 0; i < AN; i++) if (ARENA_ROWS[j][i] === '#') for (const [di, dj] of DIRS) {
    const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= AN || nj >= AN || ARENA_ROWS[nj][ni] === '#') continue;
    const x0 = (i + (di > 0 ? 1 : 0)) * AT, y0 = (j + (dj > 0 ? 1 : 0)) * AT, x1 = di ? x0 : x0 + AT, y1 = dj ? y0 : y0 + AT;
    WALLS.push([[x0, y0, 0], [x1, y1, 0], [x1, y1, 16], [x0, y0, 16]]);
  }
  const KCOL = ['#e83a3a', '#3a8ae8', '#3ac84a', '#e8c03a'];
  const ARENA = {
    start() {
      const n = Math.min(4, game.players.length), spots = [[5, 5, Math.PI / 4], [34, 34, -Math.PI * 3 / 4], [34, 5, Math.PI * 3 / 4], [5, 34, -Math.PI / 4]];
      const karts = spots.map(([i, j, a], k) => ({ k, car: new E.Car({ x: (i + .5) * AT, y: (j + .5) * AT, angle: a, kart: true, top: 170, accel: 170, turn: 2.6, r: 7 }), balloons: 3, cool: 1, slow: 0, rev: 0, input: k < n && !auto ? game.players[k] : null, hit: 0 }));
      game.splitScreen(n > 1 && !auto ? n : 0, { layout: n === 2 ? 'rows' : 'grid' });
      return { karts, shells: [], time: 120, cams: karts.map(K => ({ x: K.car.x, y: K.car.y, h: 22, angle: K.car.angle, pitch: 10, fov: 70 })), humans: auto ? 0 : n };
    },
    // a CPU kart: the nearest rival with balloons, steered for, fired at when it is ahead; off the walls
    drive(S, K) {
      const c = K.car, foes = S.karts.filter(o => o !== K && o.balloons > 0).sort((a, b) => Math.hypot(a.car.x - c.x, a.car.y - c.y) - Math.hypot(b.car.x - c.x, b.car.y - c.y)), f = foes[0];
      const lead = f ? Math.hypot(f.car.x - c.x, f.car.y - c.y) / 250 * .85 : 0; let want = f ? Math.atan2(f.car.y + f.car.vy * lead - c.y, f.car.x + f.car.vx * lead - c.x) : c.angle;   // (where it will be when the shell gets there)
      for (const a of [0, .6, -.6, 1.2, -1.2]) { const h = c.angle + a; if (!solid(c.x + Math.cos(h) * 30, c.y + Math.sin(h) * 30)) { if (a && solid(c.x + Math.cos(c.angle) * 30, c.y + Math.sin(c.angle) * 30)) want = h; break; } }
      const off = E.angDiff(c.angle, want + (K.k - 1.5) * .09 * Math.sin(K.cool * 3)); K.slow = Math.abs(c.speed) < 15 && K.rev <= 0 ? K.slow + 1 / 120 : 0; if (K.slow > .8) { K.rev = .6; K.slow = 0; }   // (pinned against a wall: back off a moment)   // (each CPU a little off its aim, and wavering)
      const back = K.rev > 0; return { steer: clamp(off * 2, -1, 1) * (back ? -1 : 1), gas: back ? 0 : 1, brake: back ? 1 : 0, fire: f && Math.abs(off) < .25 && Math.hypot(f.car.x - c.x, f.car.y - c.y) < 280 };
    },
    update(S, dt) {
      for (const K of S.karts) {
        K.cool -= dt; K.hit = Math.max(0, K.hit - dt); K.rev -= dt;
        if (K.balloons <= 0) { K.car.update(dt, ARENA_MAP, { gas: 0, brake: 1, hold: true }); continue; }
        if (K.input) K.car.o.auto = K.input.lastDevice === 'touch';
        const ctl = K.input || this.drive(S, K), fire = K.input ? K.input.pressed('fire') : ctl.fire;
        K.car.update(dt, ARENA_MAP, ctl);
        if (fire && K.cool <= 0 && S.shells.filter(o => o.by === K).length < 2) {   // (two shells out at most)
          K.cool = K.input ? .8 : 2.6 + K.k * .3;   // (the CPU fires less often than you can)
          const c = K.car; S.shells.push({ x: c.x + Math.cos(c.angle) * 12, y: c.y + Math.sin(c.angle) * 12, vx: Math.cos(c.angle) * 250, vy: Math.sin(c.angle) * 250, by: K, t: 0, bounces: 0 }); if (K.input) A.sfx('shoot', { vol: .4 }); }
      }
      E.Car.collide(S.karts.map(K => K.car));
      for (const s of S.shells) {   // a shell runs straight, bounces off a wall's face (its side by which cell it crossed into), three times at most
        s.t += dt; const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
        if (solid(nx, ny)) { if (solid(nx, s.y)) s.vx = -s.vx; if (solid(s.x, ny)) s.vy = -s.vy; if (!solid(nx, s.y) && !solid(s.x, ny)) { s.vx = -s.vx; s.vy = -s.vy; } if (++s.bounces > 3) s.t = 99; } else { s.x = nx; s.y = ny; }
        for (const K of S.karts) if (K.balloons > 0 && K.hit <= 0 && (K !== s.by || s.t > .4) && Math.hypot(K.car.x - s.x, K.car.y - s.y) < 10) { K.balloons--; K.hit = 1.2; K.car.spinOut(1); s.t = 99; A.sfx('hit', { vol: .5 }); }
      }
      S.shells = S.shells.filter(s => s.t < 6);
      const left = S.karts.filter(K => K.balloons > 0); S.time -= dt;
      if (S.time <= 0) { const most = Math.max(...S.karts.map(K => K.balloons)), top = S.karts.filter(K => K.balloons === most); end(top.length === 1 && (!!top[0].input || !S.humans && top[0].k === 0), top.length === 1 ? E.t('special.arena.won', { n: top[0].k + 1 }) : E.t('special.arena.draw')); return; }   // (two minutes: the most balloons wins)
      if (left.length <= 1 || S.humans && S.karts.slice(0, S.humans).every(K => K.balloons <= 0)) { const w = left[0]; end(!!w && (w.input || (!S.humans && w.k === 0)), w ? E.t('special.arena.won', { n: w.k + 1 }) : E.t('special.arena.draw')); return; }
      S.karts.forEach((K, i) => { const c = S.cams[i], k = 1 - Math.exp(-dt * 6); c.angle += E.angDiff(c.angle, K.car.angle) * k; arena.chase({ x: K.car.x, y: K.car.y, angle: c.angle }, { back: 48, h: 26 }); Object.assign(c, arena.cam, { pitch: 12, fov: 70 }); });
    },
    // a kart: a box of five quads round its heading, its driver's head, its balloons over it
    kart(V, K, cam) {
      const c = K.car, a = c.angle, ca = Math.cos(a), sa = Math.sin(a), pt = (u, v, z) => [c.x + ca * u - sa * v, c.y + sa * u + ca * v, z], col = KCOL[K.k], z = 2 + (K.hit > 0 && Math.floor(K.hit * 16) % 2 ? 2 : 0);
      const P = [pt(9, -6, z), pt(9, 6, z), pt(-8, 6, z), pt(-8, -6, z)], T = P.map(p => [p[0], p[1], z + 6]);
      for (let i = 0; i < 4; i++) { const a0 = P[i], a1 = P[(i + 1) % 4], nx = a1[1] - a0[1], ny = a0[0] - a1[0]; if (nx * ((a0[0] + a1[0]) / 2 - cam.x) + ny * ((a0[1] + a1[1]) / 2 - cam.y) < 0) V.quad([a0, a1, T[(i + 1) % 4], T[i]], i === 0 ? '#202028' : col); }   // (only the sides turned to the camera)
      V.quad(T, col);
      V.add(c.x, c.y, z + 9, (g, sx, sy, k) => shade(g, sx, sy - 3 * k, Math.max(1, 3 * k), '#f0c8a0', '#fff0e0'));
      for (let b = 0; b < K.balloons; b++) V.add(c.x - ca * 6 + (b - 1) * -sa * 5, c.y - sa * 6 + (b - 1) * ca * 5, z + 20 + (b & 1) * 3, (g, sx, sy, k) => { const rr = Math.max(1, 4 * k); px.rect(g, sx, sy, 1, Math.max(1, 6 * k), '#ffffff'); shade(g, sx, sy - rr, rr, col, '#ffffff'); });
    },
    draw(S, r) {
      const i = r.viewport ? r.viewport.i : 0, cam = S.cams[i] || S.cams[0], V = arena, fx = Math.cos(cam.angle), fy = Math.sin(cam.angle);
      for (const w of WALLS) { const mx = (w[0][0] + w[1][0]) / 2, my = (w[0][1] + w[1][1]) / 2; if ((mx - cam.x) * fx + (my - cam.y) * fy > -8) V.quad(w, '#6a4a8a'); }
      for (const K of S.karts) if ((K.car.x - cam.x) * fx + (K.car.y - cam.y) * fy > 14) this.kart(V, K, cam);
      for (const s of S.shells) V.add(s.x, s.y, 3, (g, sx, sy, k) => shade(g, sx, sy - 3 * k, Math.max(1, 3 * k), '#2ac83a', '#c8ffc8'));
      V.draw(r, cam);
      const K = S.karts[i];
      r.overlay(g => { const vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H }; for (let b = 0; b < 3; b++) shade(g, vp.x + 10 + b * 11, vp.y + 12, 4, b < K.balloons ? KCOL[K.k] : '#404048', '#ffffff'); E.font.text(g, E.t('special.arena.you', { n: K.k + 1 }), vp.x + 44, vp.y + 7, KCOL[K.k], { shadow: '#000', outline: false }); if (vp.x === 0 && vp.y === 0) E.font.text(g, Math.ceil(Math.max(0, S.time)) + '', r.W / 2, 6, S.time < 10 ? '#ff6a4a' : '#ffffff', { align: 'center', shadow: '#000', outline: false }); });
    },
    state: S => ({ balloons: S.karts.map(K => K.balloons), shells: S.shells.length, you: [Math.round(S.karts[0].car.x), Math.round(S.karts[0].car.y)] })
  };

  /* ---- TURN: Contra III's top-down stage. The camera straight down, turned with you; three nests to clear ---- */
  const FN = 48, FT = 16, FORT_ROWS = [];
  for (let j = 0; j < FN; j++) { let s = ''; for (let i = 0; i < FN; i++) { const h = ((i * 7349) ^ (j * 3571)) % 23, wall = i === 0 || j === 0 || i === FN - 1 || j === FN - 1 || (i % 12 === 6 && j % 12 > 2 && j % 12 < 9 && h > 4) || (j % 16 === 8 && i % 16 > 3 && i % 16 < 12); s += wall ? '#' : '.'; } FORT_ROWS.push(s); }
  const fsolid = (x, y) => { const i = Math.floor(x / FT), j = Math.floor(y / FT); return i < 0 || j < 0 || i >= FN || j >= FN || FORT_ROWS[j][i] === '#'; };
  const fort = new E.Mode7({ floor: (x, y) => { if (fsolid(x, y)) return (Math.floor(x / 4) + Math.floor(y / 4)) & 1 ? [70, 66, 60] : [96, 90, 82]; const i = Math.floor(x / FT), j = Math.floor(y / FT), e = x % FT < 1 || y % FT < 1; return e ? [60, 70, 50] : (i * 3 + j * 5) % 7 ? [110, 120, 80] : [100, 112, 70]; }, size: [FN * FT, FN * FT], outside: '#202018', sky: ['#000000', '#000000'] });
  const NESTS = [[10, 10], [38, 12], [24, 42]];
  // the fort's distances, cell by cell, to (x, y) round its walls (a breadth-first flow field): what walks follows them down
  const flow = (x, y) => { const d = new Int16Array(FN * FN).fill(-1), q = [Math.floor(y / FT) * FN + Math.floor(x / FT)]; d[q[0]] = 0; for (let h = 0; h < q.length; h++) { const c = q[h], i = c % FN, j = (c - i) / FN; for (const [di, dj] of DIRS) { const n = (j + dj) * FN + i + di; if (i + di >= 0 && i + di < FN && j + dj >= 0 && j + dj < FN && d[n] < 0 && FORT_ROWS[j + dj][i + di] !== '#') { d[n] = d[c] + 1; q.push(n); } } } return d; };
  const downhill = (F, x, y) => { const i = Math.floor(x / FT), j = Math.floor(y / FT); let best = null, bd = F[j * FN + i]; for (const [di, dj] of [...DIRS, [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const n = (j + dj) * FN + i + di, v = F[n]; if (v >= 0 && v < bd && FORT_ROWS[j + dj][i + di] !== '#' && FORT_ROWS[j][i + di] !== '#' && FORT_ROWS[j + dj][i] !== '#') { bd = v; best = [(i + di + .5) * FT, (j + dj + .5) * FT]; } } return best; };   // (the next cell toward it, no corner cut through a wall)
  const sight = (a, b) => { const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 6); for (let k = 1; k < n; k++) if (fsolid(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n)) return false; return true; };
  const TURN = {
    start() { return { x: 24.5 * FT, y: 30.5 * FT, a: -Math.PI / 2, lives: 3, hurt: 0, cool: 0, shots: [], foes: [], F: null, Ft: 0, goal: null, G: null, nests: NESTS.map(([i, j]) => ({ x: (i + .5) * FT, y: (j + .5) * FT, hp: 14, t: 1 + i % 3 })), kills: 0 }; },
    // move a body by (dx, dy) unless a wall is in the way (each axis on its own, so it slides along walls)
    slide(o, dx, dy, r) { if (!fsolid(o.x + dx + Math.sign(dx) * r, o.y)) o.x += dx; if (!fsolid(o.x, o.y + dy + Math.sign(dy) * r)) o.y += dy; },
    update(S, dt, I) {
      let [mx, my] = I.move(), turn = mx, walk = -my, fire = I.down('fire');
      if (auto) {   // a crawler in sight and near: turn and fire; else the nearest nest: in sight and near, fire at it, else walk the flow field to it
        const nest = S.nests.filter(n => n.hp > 0).sort((a, b) => Math.hypot(a.x - S.x, a.y - S.y) - Math.hypot(b.x - S.x, b.y - S.y))[0], foe = S.foes.find(f => Math.hypot(f.x - S.x, f.y - S.y) < 110 && sight(S, f));
        if (nest && nest !== S.goal) { S.goal = nest; S.G = flow(nest.x, nest.y); }
        const shoot = foe || nest && Math.hypot(nest.x - S.x, nest.y - S.y) < 130 && sight(S, nest) && nest, step = !shoot && nest && downhill(S.G, S.x, S.y), aim = shoot || (step ? { x: step[0], y: step[1] } : null);
        if (aim) { const off = E.angDiff(S.a, Math.atan2(aim.y - S.y, aim.x - S.x)); turn = clamp(off * 3, -1, 1); walk = !shoot && Math.abs(off) < .6 ? 1 : 0; fire = !!shoot && Math.abs(off) < .2; }
      }
      S.a += turn * 2.6 * dt; const sp = walk * 90 * dt; this.slide(S, Math.cos(S.a) * sp, Math.sin(S.a) * sp, 6);
      S.cool -= dt; S.hurt = Math.max(0, S.hurt - dt);
      if (fire && S.cool <= 0) { S.cool = .16; S.shots.push({ x: S.x + Math.cos(S.a) * 10, y: S.y + Math.sin(S.a) * 10, vx: Math.cos(S.a) * 330, vy: Math.sin(S.a) * 330, t: 0 }); A.sfx('shoot', { vol: .25 }); }
      for (const s of S.shots) {
        s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; if (fsolid(s.x, s.y)) { s.t = 9; continue; }
        for (const f of S.foes) if (f.hp > 0 && Math.hypot(f.x - s.x, f.y - s.y) < 8) { f.hp = 0; s.t = 9; S.kills++; A.sfx('hit', { vol: .3 }); }
        for (const n of S.nests) if (n.hp > 0 && Math.hypot(n.x - s.x, n.y - s.y) < 14) { s.t = 9; if (--n.hp === 0) A.sfx('explode'); }
      }
      S.shots = S.shots.filter(s => s.t < 1.2);
      for (const n of S.nests) if (n.hp > 0 && (n.t -= dt) <= 0 && S.foes.filter(f => f.hp > 0).length < 8) { n.t = 2.6; S.foes.push({ x: n.x, y: n.y, hp: 1, wob: n.x }); }
      if ((S.Ft -= dt) <= 0) { S.Ft = .4; S.F = flow(S.x, S.y); }   // (the way to you, round the walls, worked out again now and then)
      for (const f of S.foes) if (f.hp > 0) {
        const d = Math.hypot(S.x - f.x, S.y - f.y) || 1, nx = d < 24 ? null : downhill(S.F, f.x, f.y), tx = nx ? nx[0] : S.x, ty = nx ? nx[1] : S.y, e = Math.hypot(tx - f.x, ty - f.y) || 1; f.wob += dt;
        this.slide(f, (tx - f.x) / e * 38 * dt + Math.cos(f.wob * 3) * 8 * dt, (ty - f.y) / e * 38 * dt + Math.sin(f.wob * 3) * 8 * dt, 4);
        if (d < 10 && S.hurt <= 0) { S.hurt = 1.5; f.hp = 0; A.sfx('hurt'); if (--S.lives <= 0) { end(false, E.t('special.turn.down')); return; } }
      }
      S.foes = S.foes.filter(f => f.hp > 0);
      if (S.nests.every(n => n.hp <= 0)) end(true, E.t('special.turn.clear'));
    },
    draw(S, r) {
      const V = fort, cam = { x: S.x, y: S.y, h: 130, angle: S.a, pitch: 90, fov: 64 };
      for (const n of S.nests) if (n.hp > 0) V.add(n.x, n.y, 0, (g, sx, sy, k) => { const rr = 11 * k; px.disc(g, sx, sy, rr, '#5a2a1a'); px.disc(g, sx, sy, rr * .6, Math.floor(t * 4 + n.x) % 2 ? '#e84a2a' : '#a82a1a'); px.rect(g, sx - rr, sy + rr + 2 * k, Math.round(2 * rr * n.hp / 14), Math.max(1, k), '#ffe040'); });
      for (const f of S.foes) V.add(f.x, f.y, 0, (g, sx, sy, k) => { const rr = 5 * k; for (let l = -1; l <= 1; l++) px.rect(g, sx - rr * 1.4, sy + l * rr * .6, Math.round(rr * 2.8), Math.max(1, k * .8), '#2a1a10'); px.disc(g, sx, sy, rr, '#8a3ac8'); });
      for (const s of S.shots) V.add(s.x, s.y, 0, (g, sx, sy, k) => px.disc(g, sx, sy, Math.max(1, 2 * k), '#ffe060'));
      V.add(S.x, S.y, 0, (g, sx, sy, k) => {   // the soldier from above, always facing up the screen: the world turns, not him
        if (S.hurt > 0 && Math.floor(S.hurt * 16) % 2) return; const u = k;
        px.rect(g, sx - 1 * u, sy - 12 * u, Math.max(1, 2 * u), 8 * u, '#303038'); px.disc(g, sx, sy, 6 * u, '#3a6a3a'); px.disc(g, sx - 5 * u, sy + 1 * u, 2.5 * u, '#c8a080'); px.disc(g, sx + 5 * u, sy + 1 * u, 2.5 * u, '#c8a080'); px.disc(g, sx, sy, 3.2 * u, '#e8c040');
      });
      V.draw(r, cam);
      r.overlay(g => { for (let i = 0; i < S.lives; i++) px.rect(g, 8 + i * 8, 8, 5, 8, '#e8c040'); E.font.text(g, E.t('special.turn.nests', { n: S.nests.filter(n => n.hp > 0).length }), 8, 20, '#ffffff', { shadow: '#000', outline: false }); });
    },
    state: S => ({ x: Math.round(S.x), y: Math.round(S.y), a: +S.a.toFixed(3), lives: S.lives, nests: S.nests.map(n => n.hp), kills: S.kills, foes: S.foes.map(f => [Math.round(f.x), Math.round(f.y)]), shots: S.shots.length })
  };
  const STAGE = { planet: PLANET, tube: TUBE, arena: ARENA, turn: TURN };

  function update(dt) {
    const I = game.input; t += dt;
    I.touchSet('fire', mode === 'play' ? E.t(part === 'planet' || part === 'tube' ? 'special.jump' : 'special.fire') : null, mode === 'play');
    if (mode === 'menu') { menu.update(dt); pickOnStart(menu); return; }
    if (mode === 'over') { after.update(dt); pickOnStart(after); return; }
    STAGE[part].update(S, dt, I);
  }
  function draw(r) {
    const W = r.W, H = r.H;
    if (mode === 'menu') {
      const a = t * .25, cam = { x: 800 + Math.cos(a) * 600, y: 800 + Math.sin(a) * 600, h: 120, angle: a + Math.PI / 2, pitch: 24, fov: 70 }; planet.draw(r, cam);
      r.overlay(g => E.font.title(g, E.t('special.title'), W / 2, 20, { scale: 4, align: 'center', colors: ['#ffffff', '#ffe080', '#ff8a3a', '#c83ae8'], depth: 3 }));
      menu.y = Math.round(H / 2) - 18; menu.draw(r); return;
    }
    STAGE[part].draw(S, r);
    if (mode === 'over' && (!r.viewport || r.viewport.i === 0)) r.overlay(g => {
      const w = 220, h = 40, x = Math.round((W - w) / 2), y = Math.round(H / 2 - 50); E.ui.box(g, x, y, w, h, { bg: '#10142a', border: result.won ? '#ffe040' : '#e84a4a' });
      E.font.text(g, result.line, W / 2, y + 15, result.won ? '#ffe040' : '#ffffff', { align: 'center', outline: false });
    });
    if (mode === 'over') { after.y = Math.round(H / 2) + 4; after.draw(r); }
  }

  // the bot: each stage by its autopilot, for a while or to its end
  function bot() {
    const was = Math.random; Math.random = E.rng(5);
    try {
      game.go('special', null, { fade: 0 }); game.advance(1 / 120); auto = true; const out = {};
      for (const p of PARTS) {
        start(p); let n = 0; for (; n < 150 && mode === 'play'; n++) game.advance(1);
        out[p] = Object.assign({ seconds: n, over: mode === 'over', won: !!(result && result.won) }, STAGE[p].state(S));
      }
      auto = false; toMenu(); return Object.assign(out, { errors: game.errors.length });
    } finally { Math.random = was; auto = false; }
  }

  return { view: 'topdown', views: ['topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['fire'], camera: { zoom: false },
    enter(d) {
      mode = 'menu'; part = null; S = null; menu.i = 0; auto = false; game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false; game.allowJoin({ max: 4 }); A.music('title');
      if (d && d.part && STAGE[d.part]) start(d.part);
    },
    exit() { game.splitScreen(0); game.allowJoin(false); },
    back() { if (mode === 'menu') { game.go('title'); return true; } toMenu(); return true; },
    update, draw, bot,
    /** a stage played by its autopilot (a demo; the bot's): 'planet', 'tube', 'arena' or 'turn' */
    demo(p) { auto = true; start(STAGE[p] ? p : 'planet'); },
    state: () => S && Object.assign({ mode, part }, STAGE[part].state(S)),
    /** the proof: the planet, a turn queued at the second crossing, a jump; then the fort, turning and firing */
    run: (n = 600) => proof('special', n, (i, k) => {
      if (i === 2) start('planet');
      if (i === 200) k.tap('right');
      if (i === 300) k.tap('fire');
      if (i === 420) start('turn');
      if (i === 430) { k.hold('right'); k.hold('fire'); }
    }, () => S && STAGE[part].state(S), () => { game.input.lastDevice = 'keyboard'; }) };
})();
scenes.special = SPECIAL;
