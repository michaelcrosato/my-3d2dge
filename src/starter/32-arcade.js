/* =====================================================================================
 * SLICE 10  ARCADE  (a cabinet of three golden-age classics: Pac-Man, Galaga, Asteroids). @modules arcade grid gen
 * Three short games, each a remaster (lit, with HD rigs, glowing lines and particles) with the classic look one key away
 * (C, a pad's Y, or Settings: Arcade, Look), each with its own high-score table, initials on a letter wheel, a continue,
 * two players taking turns, and a demo in the attract mode.
 *   MAZE (#arcade/maze): eat every glow-seed in a hedge maze while four wisps hunt you, each its own way (one chases, one
 *     heads you off, one flanks with the first, one is shy up close), in waves of scatter and chase; a lantern seed turns
 *     them blue and edible for a while; the side tunnel wraps round. Each maze is new (E.gen's braided maze, mirrored);
 *     an intermission after the first.
 *   FORMATION (#arcade/formation): moths fly in on curved paths (E.Path), form up and sway, then dive at you along paths
 *     of their own, turning as they fly (r.sprite's rot); two shots on screen at a time; a stage card between waves.
 *   ROCKS (#arcade/rocks): turn, thrust and drift through a field of rocks that split when shot; the screen's edges meet
 *     (E.wrap); a saucer hunts you; hyperspace when cornered. Glowing vector lines.
 * The cabinet (#arcade) is the title: left and right pick a game, up and down one or two players. Left alone it plays a
 * demo of each game in turn (its own bot), then shows that game's table. The sides of a wide screen show cabinet art
 * drawn by code. Keys: arrows / WASD, Space / Z / J fire (rocks: up thrusts, X / K hyperspace), Enter start, C classic.
 * TOUCH: the stick, FIRE (rocks: THRUST and WARP too); a tap picks a cabinet, and the letter wheel takes taps.
 * HOW IT WORKS: E.Arcade (the arcade module) keeps the scores, lives, turns, tables, initials, cards, the continue and the
 * attract mode; the maze is an E.Grid with E.GridMovers (a turn asked early is kept), each game a { begin, step, draw }.
 * ===================================================================================== */
const ARCADE = (() => {
  const KEYS = Object.assign({}, E.Input.SHMUP, { thrust: ['Pad2', 'Pad5'], warp: ['KeyX', 'KeyK', 'ShiftLeft', 'Mouse2', 'Pad1', 'Pad6'], classic: ['KeyC', 'Pad3'] });
  delete KEYS.bomb;
  game.settings.define({ key: 'arcadeLook', group: 'Arcade', label: 'Look', options: [['remaster', 'Remaster'], ['classic', 'Classic']], value: 'remaster', help: 'Remaster: lit, with HD rigs and glowing lines. Classic: as the cabinets first looked. C switches it in play' });
  const classic = () => game.settings.arcadeLook === 'classic';
  // the cabinet's own tune (the step sequencer's format): A minor, a bouncing bass
  const SONG = { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'A4 . C5 . E5 . A5 - G5 . E5 . C5 . D5 . | E5 - - . D5 . C5 . B4 . G4 . A4 - - . | F4 . A4 . C5 . F5 - E5 . C5 . A4 . B4 . | C5 . B4 . A4 . G#4 . A4 - - - - . . .' },
    { wave: 'triangle', vol: .3, notes: 'A2 . A3 . A2 . A3 . A2 . A3 . A2 . A3 . | C3 . C4 . C3 . C4 . G2 . G3 . G2 . G3 . | F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | E2 . E3 . E2 . E3 . A2 . A3 . A2 . A3 .' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k k h . s . h h' }] };
  // cabinet art round a playfield of one fixed screen: on a wide screen's sides (left of x0, right of x1) a lit bezel edge,
  // a marquee stripe and drifting sparks; on a tall one (above y0, below y1) the marquee with the game's name and the
  // control panel
  function cabinet(r, x0, x1, hue, y0 = 0, y1 = r.H, label = '') {
    r.overlay(g => {
      const H = r.H, t = game.time;
      if (y0 > 40) {
        px.rect(g, 0, 0, r.W, y0 - 4, '#0a0614'); px.rect(g, 8, y0 - 46, r.W - 16, 34, hue[0]); px.blend(g, .25, 'add', () => px.rect(g, 8, y0 - 46, r.W - 16, 12, '#ffffff'));
        E.font.title(g, label, r.W / 2, y0 - 42, { align: 'center', scale: 2, colors: ['#ffffff', '#1a1030'], depth: 1 });
      }
      if (H - y1 > 40) {
        const y = y1 + 6; px.rect(g, 0, y, r.W, H - y, '#140c22'); px.rect(g, 0, y, r.W, 2, hue[0]);
        const cy = y + Math.min(40, (H - y) / 2); px.disc(g, r.W / 2 - 50, cy, 8, '#2a1a3e'); px.rect(g, r.W / 2 - 51, cy - 16, 3, 16, '#c8c8d0'); px.disc(g, r.W / 2 - 50, cy - 17, 5, '#ff4a4a');
        for (let i = 0; i < 3; i++) px.disc(g, r.W / 2 + 10 + i * 18, cy, 6, hue[i]);
      }
      for (const [a, b, right] of [[0, x0, false], [x1, r.W, true]]) {
        if (b - a < 3) continue;
        px.rect(g, a, 0, b - a, H, '#0a0614');
        for (let y = -24; y < H; y += 24) { const yy = Math.round(y + (t * 20) % 24); px.rect(g, right ? a + 6 : b - 10, yy, 4, 12, hue[1]); px.rect(g, right ? a + 14 : b - 18, yy + 12, 2, 6, hue[2]); }
        for (let i = 0; i < 8; i++) { const y = (i * 61 + t * (12 + i * 3)) % (H + 20) - 10, x = right ? a + 10 + (i * 13) % Math.max(8, b - a - 14) : b - 10 - (i * 13) % Math.max(8, b - a - 14); px.blend(g, .45, 'add', () => px.disc(g, x, y, 1 + i % 3, hue[i % 3])); }
        px.rect(g, right ? a : b - 3, 0, 3, H, hue[0]); px.rect(g, right ? a + 3 : b - 4, 0, 1, H, '#ffffff');
      }
    });
  }

  /* =================================== 1. MAZE =================================== */
  const MAZE = (() => {
    const C8 = 8, MW = 29, MH = 31, TUN = 17, HX = 10, HY = 11, DOOR = [14, 10], WCOL = ['#ff4a4a', '#ff9ad8', '#4ae8ff', '#ffb84a'];
    const CORNER = [[MW - 2, -3], [1, -3], [MW - 1, MH], [0, MH]], PHASES = [7, 20, 7, 20, 5, 20, 5, 1e9], WAYS = [[0, -1], [-1, 0], [0, 1], [1, 0]];   // (up, left, down, right: the original's order for ties)
    let cells, grid, wgrid, start, seeds, power, hero = null, wisps = null, mode, modeT, phase, fright, eaten, level, cab, demo, over, deathT, readyT, inter, berry, ate, X0 = 0, Y0 = 12;
    const key = (x, y) => x + ',' + y, cellOf = k => k.split(',').map(Number);
    const nearest = (x, y, ok) => { let best = [x, y], bd = 1e9; for (let b = 0; b < MH; b++) for (let a = 0; a < MW; a++) if (ok(a, b)) { const d = Math.abs(a - x) + Math.abs(b - y); if (d < bd) { bd = d; best = [a, b]; } } return best; };
    const ring = (x, y) => y >= HY - 1 && y <= HY + 5 && x >= HX - 1 && x <= HX + 9;
    // a new maze: the left half from E.gen's braided maze, mirrored; doors in the middle wall; the wisps' house in a ring
    // of hall; the tunnel's ends opened. The same level gives the same maze
    function build() {
      const half = E.gen.maze(15, MH, { seed: 7 + level * 13, braid: 1 }).rows;
      cells = half.map(r => (r + r.slice(0, 14).split('').reverse().join('')).split(''));
      for (let y = 1; y < MH - 1; y += 4) if (cells[y][13] === '.') cells[y][14] = '.';
      for (let y = HY - 1; y <= HY + 5; y++) for (let x = HX - 1; x <= HX + 9; x++) cells[y][x] = '.';
      for (let y = HY; y <= HY + 4; y++) for (let x = HX; x <= HX + 8; x++) cells[y][x] = y === HY || y === HY + 4 || x === HX || x === HX + 8 ? '#' : 'H';
      cells[HY][14] = '-'; cells[TUN][0] = cells[TUN][MW - 1] = '.';
      grid = new E.Grid(MW, MH, { walkable: (x, y) => cells[y][x] === '.' });       // yours
      wgrid = new E.Grid(MW, MH, { walkable: (x, y) => cells[y][x] !== '#' });      // the wisps' (the house too: openFor says when)
      start = nearest(14, 23, (x, y) => cells[y][x] === '.' && !ring(x, y));
      seeds = new Set(); power = new Set(); ate = 0; berry = null;
      for (let y = 0; y < MH; y++) for (let x = 1; x < MW - 1; x++) if (cells[y][x] === '.' && !ring(x, y) && !(x === start[0] && y === start[1])) seeds.add(key(x, y));
      for (const [x, y] of [[1, 3], [MW - 2, 3], [1, MH - 4], [MW - 2, MH - 4]]) { const k = key(...nearest(x, y, (a, b) => seeds.has(key(a, b)))); seeds.delete(k); power.add(k); }
    }
    // everyone to their places: you below the house, the first wisp at its door, the others inside waiting their turn
    function reset() {
      hero = { m: new E.GridMover({ cx: start[0], cy: start[1], speed: 7.5 }), dir: [-1, 0], chomp: 0, dying: 0 };
      hero.m.dir = [-1, 0];
      const was = wisps;
      wisps = WCOL.map((c, i) => ({ i, c, m: new E.GridMover({ cx: i ? 10 + i * 2 : DOOR[0], cy: i ? HY + 2 : DOOR[1], speed: 6.8 }), home: i > 0, wait: i * 2.5, eyes: false, leaving: false, blue: false,
        rig: was ? was[i].rig : new E.Blob({ R: 3.6, face: 'front', colors: { dk: E.shade(c, -.35), base: c, lt: E.shade(c, .35) } }) }));
      for (const w of wisps) w.m.dir = [w.i % 2 ? 1 : -1, 0];
      mode = 'scatter'; modeT = 0; phase = 0; fright = 0; eaten = 0; readyT = 1.8; deathT = 0;
    }
    // where each aims while chasing: at you; four cells ahead of you; past a point two ahead, as far again as the first wisp
    // is behind it (they pincer); at you from afar, its corner up close. Scattering: its corner. Eyes and leavers: the door
    function target(w) {
      if (w.eyes || w.leaving) return DOOR;
      if (mode === 'scatter') return CORNER[w.i];
      const h = hero.m, [dx, dy] = hero.dir;
      if (w.i === 0) return [h.cx, h.cy];
      if (w.i === 1) return [h.cx + dx * 4, h.cy + dy * 4];
      if (w.i === 2) { const a = wisps[0].m; return [(h.cx + dx * 2) * 2 - a.cx, (h.cy + dy * 2) * 2 - a.cy]; }
      return Math.hypot(w.m.cx - h.cx, w.m.cy - h.cy) > 8 ? [h.cx, h.cy] : CORNER[3];
    }
    const openFor = (w, x, y) => { if (x < 0 || x >= MW) return y === TUN; const c = cells[y] && cells[y][x]; return c === '.' || ((c === 'H' || c === '-') && (w.eyes || w.leaving)); };
    // at each cell a wisp takes the open way (never straight back) nearest its target; blue, a random one; eyes, the
    // grid's path home
    function choose(w) {
      const m = w.m;
      if (w.eyes) { const p = grid.path([m.cx, m.cy], DOOR); if (p.length > 1) return [p[1][0] - m.cx, p[1][1] - m.cy]; }
      const ways = WAYS.filter(([a, b]) => !(a === -m.dir[0] && b === -m.dir[1]) && openFor(w, m.cx + a, m.cy + b));
      if (!ways.length) return [-m.dir[0], -m.dir[1]];
      if (w.blue) return ways[Math.floor(Math.random() * ways.length)];
      const t = target(w), d = c => (m.cx + c[0] - t[0]) ** 2 + (m.cy + c[1] - t[1]) ** 2;
      return ways.reduce((p, q) => d(q) < d(p) ? q : p);
    }
    // the tunnel: off one end, on at the other, going the same way
    function wrapTunnel(m) { if (m.cy !== TUN || m.moving) return; if (m.cx === 0 && m.dir[0] < 0) { m.place(MW - 1, TUN); m.dir = [-1, 0]; } else if (m.cx === MW - 1 && m.dir[0] > 0) { m.place(0, TUN); m.dir = [1, 0]; } }
    const dirOf = v => Math.hypot(v[0], v[1]) < .4 ? null : Math.abs(v[0]) > Math.abs(v[1]) ? [Math.sign(v[0]), 0] : [0, Math.sign(v[1])];
    const pos = m => ({ x: X0 + (m.x + .5) * C8, y: Y0 + (m.y + .5) * C8 });
    function step(dt, I) {
      if (inter) return;   // (the intermission is a script: it moves its own actors)
      if (readyT > 0) { readyT -= dt; return; }
      const h = hero.m;
      if (deathT > 0) { hero.dying = deathT; if ((deathT -= dt) <= 0) lost(); return; }
      if (fright > 0) { if ((fright -= dt) <= 0) for (const w of wisps) w.blue = false; }
      else if ((modeT += dt) > PHASES[phase]) { modeT = 0; phase = Math.min(PHASES.length - 1, phase + 1); mode = phase % 2 ? 'chase' : 'scatter'; }
      // you: the stick's way, kept until it can be taken (a turn asked early), going on until a wall
      h.update(dt, grid, demo ? botDir() : dirOf(I.move()), { keep: true });
      if (h.moving) hero.dir = h.dir;
      wrapTunnel(h); hero.chomp = Math.max(0, hero.chomp - dt);
      const k = key(h.cx, h.cy);
      if (seeds.delete(k)) { cab.add(10); ate++; hero.chomp = .25; A.sfx('blip', { vol: .25, pitch: ate % 2 ? 1 : 1.2 }); if (ate === 70 || ate === 170) berry = { t: 9 }; }
      if (power.delete(k)) { cab.add(50); fright = Math.max(1.5, 7 - level); eaten = 0; for (const w of wisps) w.blue = !w.eyes; A.sfx('powerup'); P.ring(pos(h).x, pos(h).y, 2, 30, '#ffd060', .4); }
      if (berry && (berry.t -= dt) <= 0) berry = null;
      if (berry && h.cx === 14 && h.cy === TUN) { cab.add(100 * level, pos(h)); berry = null; A.sfx('pickup'); P.glints(pos(h).x, pos(h).y, 4, 6, '#ff8a8a'); }
      for (const w of wisps) {
        const m = w.m;
        if (w.home) { if ((w.wait -= dt) > 0) { m.y = HY + 2 + Math.sin(game.time * 6 + w.i) * .3; continue; } w.home = false; w.leaving = true; m.y = m.cy; }
        m.speed = w.eyes ? 15 : w.blue ? 4.2 : m.cy === TUN && (m.cx < 5 || m.cx > MW - 6) ? 4 : 6.6 + level * .25;
        m.update(dt, wgrid, m.moving ? null : choose(w), { blocked: (x, y) => !openFor(w, x, y) });
        wrapTunnel(m);
        if (!m.moving && m.cx === DOOR[0] && m.cy === DOOR[1]) { w.leaving = false; if (w.eyes) { w.eyes = false; w.blue = false; } }
        if (!w.eyes && Math.abs(m.x - h.x) + Math.abs(m.y - h.y) < .8) {
          if (w.blue) { w.eyes = true; w.blue = false; eaten++; cab.add(200 * 2 ** (eaten - 1), pos(m)); A.sfx('kick'); game.freeze(.3); P.sparks(pos(m).x, pos(m).y, 2, 8); }
          else { deathT = 1.5; A.sfx('die'); return; }
        }
      }
      if (!seeds.size && !power.size) { level++; cab.card('MAZE ' + level, 2); A.sfx('oneup'); if (level === 2 && !demo) intermission(); build(); reset(); readyT = 2.2; }
    }
    // after the death's turn: a life gone; the other player's maze (two players, each keeps theirs), or the end
    function lost() {
      const was = cab.p, r = cab.die();
      if (r === 'over') { over = true; return; }
      if (r === 'next') { was.save = { level, seeds, power, ate }; const s = cab.p.save; level = s ? s.level : 1; build(); if (s) ({ seeds, power, ate } = s); }
      reset();
    }
    // the intermission (a script): a wisp chases you across, then you come back big and chase it
    function intermission() {
      const a = { x: -30, big: false }; inter = a;
      game.script(function* () { yield game.tween(a, { x: MW * C8 + 40 }, 2.6, { ease: 'linear' }); a.big = true; yield .4; yield game.tween(a, { x: -60 }, 2.2, { ease: 'linear' }); yield .3; inter = null; });
    }
    // the demo's player (the attract mode, and tools/kits-test.mjs): it counts the steps to every cell, its own and the
    // wisps' (breadth first, through the tunnel); a cell is safe when it gets there two steps before any of them. It goes
    // the safe way to the nearest seed (a lantern when they close in, a blue wisp while there is time), else to the
    // neighbour they reach last
    function steps(from, ok) {
      const D = new Map(), up = new Map(); let q = [];
      for (const [c, d] of from) { const k = key(...c); if (!D.has(k) || D.get(k) > d) { D.set(k, d); q.push(c); } }
      while (q.length) {
        const n = [];
        for (const c of q) { const d = D.get(key(...c)); for (const [a, b] of WAYS) { let x = c[0] + a; const y = c[1] + b; if (y === TUN) x = (x + MW) % MW; const k = key(x, y); if (!grid.walk([x, y]) || D.has(k) || (ok && !ok(x, y, d + 1))) continue; D.set(k, d + 1); up.set(k, c); n.push([x, y]); } }
        q = n;
      }
      return { D, up };
    }
    function botDir() {
      const h = hero.m; if (h.moving) return null;
      const src = [];
      for (const w of wisps) {
        if (w.eyes || w.blue) continue;
        if (w.home || w.leaving) { if (!w.home || w.wait < 2) src.push([DOOR, w.home ? 3 : 1]); continue; }
        src.push([[w.m.cx, w.m.cy], 0]); const n = [w.m.cx + w.m.dir[0], w.m.cy + w.m.dir[1]]; if (grid.walk(n)) src.push([n, 0]);
      }
      const W = steps(src).D, wd = (x, y) => W.has(key(x, y)) ? W.get(key(x, y)) : 99, safe = (x, y, d) => d + 2 < wd(x, y);
      const S = steps([[[h.cx, h.cy], 0]], safe), near = wd(h.cx, h.cy) < 7;
      const goals = fright > 2.5 && wisps.some(w => w.blue) ? wisps.filter(w => w.blue).map(w => key(w.m.cx, w.m.cy)) : near && [...power].some(k => S.D.has(k)) ? [...power] : [...seeds, ...power];
      let best = null, bd = 1e9; for (const k of goals) { const d = S.D.get(k); if (d > 0 && d < bd) { bd = d; best = k; } }
      if (best) { let c = cellOf(best), p; while ((p = S.up.get(key(...c))) && !(p[0] === h.cx && p[1] === h.cy)) c = p; return [Math.sign(E.wrapDiff(h.cx, c[0], MW)), c[1] - h.cy]; }
      let far = null, fd = -1;
      for (const [a, b] of WAYS) { let x = h.cx + a; if (h.cy === TUN) x = (x + MW) % MW; if (grid.walk([x, h.cy + b]) && wd(x, h.cy + b) > fd) { fd = wd(x, h.cy + b); far = [a, b]; } }
      return far;
    }
    function layout() { X0 = Math.round((game.W - MW * C8) / 2); Y0 = Math.max(12, Math.round((game.H - MH * C8) / 2)); }
    function draw(r) {
      layout(); const cl = classic(), t = game.time, [ox, oy] = r.w(0, 0), bx = ox + X0, by = oy + Y0;
      r.sky(cl ? ['#000000', '#000000'] : ['#04030c', '#0a0820', '#120a28']);
      // the maze on the floor (lit in the remaster: hedges with a sunlit top edge and a shadow at the foot; the classic's
      // thin blue lines facing the halls)
      r.decal(g => {
        const wall = (x, y) => !!cells[y] && cells[y][x] === '#';
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
          const c = cells[y][x], X = bx + x * C8, Y = by + y * C8;
          if (c === '#') {
            if (cl) { px.col(g, '#2121de'); if (!wall(x, y - 1)) g.fillRect(X, Y + 2, C8, 1); if (!wall(x, y + 1)) g.fillRect(X, Y + C8 - 3, C8, 1); if (!wall(x - 1, y)) g.fillRect(X + 2, Y, 1, C8); if (!wall(x + 1, y)) g.fillRect(X + C8 - 3, Y, 1, C8); }
            else { px.rect(g, X, Y, C8, C8, '#1c4a22'); if (!wall(x, y - 1)) px.rect(g, X, Y, C8, 2, '#5aa84a'); if (!wall(x, y + 1)) px.rect(g, X, Y + C8 - 2, C8, 2, '#0c2410'); if (E.hash2(x, y) < .3) px.dot(g, X + 2 + (x * 3) % 4, Y + 3 + (y * 5) % 3, '#7ac860'); }
          } else if (c === '-') px.rect(g, X, Y + 3, C8, 2, cl ? '#ffb8ff' : '#e0a0ff');
          else if (!cl) px.rect(g, X, Y, C8, C8, (x + y) % 2 ? '#141026' : '#171230');
        }
      });
      // the seeds, lanterns and the berry: glowing (they stay bright under the light)
      r.queue(0, -1e4, 0, g => {
        for (const k of seeds) { const [x, y] = cellOf(k), X = bx + x * C8 + 3, Y = by + y * C8 + 3; px.rect(g, X, Y, 2, 2, cl ? '#ffb897' : '#ffe9a0'); if (!cl) px.dot(g, X, Y, '#ffffff'); }
        if (Math.floor(t * 4) % 2 || readyT > 0) for (const k of power) { const [x, y] = cellOf(k), X = bx + x * C8 + 4, Y = by + y * C8 + 4; if (cl) px.disc(g, X, Y, 3, '#ffb897'); else { px.blend(g, .45, 'add', () => px.disc(g, X, Y, 6, '#ffb030')); px.disc(g, X, Y, 3, '#fff4c0'); } }
        if (berry) { const X = bx + 14 * C8 + 4, Y = by + TUN * C8 + 4; px.disc(g, X - 2, Y + 1, 2, '#e02a3a'); px.disc(g, X + 2, Y + 1, 2, '#e02a3a'); px.dot(g, X - 2, Y, '#ffb0b0'); px.rect(g, X - 1, Y - 3, 3, 1, '#4ad84a'); }
      }, { emissive: true, bias: -1e6 });
      if (!cl) { L.add(pos(hero.m).x, pos(hero.m).y, 8, 60, 1.2, { color: '#ffe890' }); for (const k of power) { const [x, y] = cellOf(k); L.add(X0 + x * C8 + 4, Y0 + y * C8 + 4, 6, 26, .7, { color: '#ffb040' }); } }
      if (inter) { drawInter(r); return; }
      // you: a lit sphere with a chomping mouth (classic: the flat yellow disc); dying, the mouth opens until you are gone
      const hp = pos(hero.m), ang = Math.atan2(hero.dir[1], hero.dir[0]), open = hero.dying > 0 ? Math.PI * (1 - hero.dying / 1.5) : (hero.m.moving || hero.chomp > 0 ? Math.abs(Math.sin(t * 16)) : .3) * .9;
      if (hero.dying <= 0 || open < Math.PI * .98) r.actor(hp.x, hp.y, 0, (g, x, y) => {
        y -= 0; const R = 4;
        if (cl) px.disc(g, x, y, R, '#ffe000'); else { px.disc(g, x, y, R, '#d8a010'); px.disc(g, x - .5, y - .5, R - 1, '#ffe040'); px.disc(g, x - 1.5, y - 1.5, 1.5, '#fff8c0'); }
        if (open > .05) px.poly(g, [[x, y], [x + Math.cos(ang - open) * 7, y + Math.sin(ang - open) * 7], [x + Math.cos(ang) * 8, y + Math.sin(ang) * 8], [x + Math.cos(ang + open) * 7, y + Math.sin(ang + open) * 7]], cl ? '#000000' : '#141026');
      }, { outline: !cl, rim: false, wrap: [MW * C8, 0] });
      if (deathT > 0) return;
      for (const w of wisps) {
        const p = pos(w.m), blink = w.blue && fright < 2 && Math.floor(t * 6) % 2, body = w.blue ? (blink ? '#f0f0ff' : '#2a3aff') : w.c;
        if (w.eyes || cl) r.actor(p.x, p.y, 0, (g, x, y) => {
          if (!w.eyes) { px.disc(g, x, y - 1, 4, body); px.rect(g, x - 4, y - 1, 9, 4, body); for (let i = 0; i < 3; i++) px.dot(g, x - 3 + i * 3 + (Math.floor(t * 8) % 2), y + 3, '#000000'); }
          if (w.blue && !w.eyes) { px.rect(g, x - 2, y - 2, 1, 2, '#ffd0c0'); px.rect(g, x + 2, y - 2, 1, 2, '#ffd0c0'); return; }
          const [dx, dy] = w.m.dir; px.rect(g, x - 3, y - 3, 3, 3, '#ffffff'); px.rect(g, x + 1, y - 3, 3, 3, '#ffffff'); px.dot(g, x - 2 + dx, y - 2 + dy, '#2a2aff'); px.dot(g, x + 2 + dx, y - 2 + dy, '#2a2aff');
        }, { outline: false, rim: false, wrap: [MW * C8, 0] });
        else {   // a Blob rig, its colour its own (blue while you can eat it), its eyes on the way it goes
          const rig = w.rig; rig.C.base = body; rig.C.dk = E.shade(body, -.35); rig.C.lt = E.shade(body, .35);
          rig.update(1 / 60, { look: w.m.dir, walk: 1, squash: Math.sin(t * 10 + w.i) * .08 });
          r.actor(p.x, p.y + 3, 0, (g, x, y) => rig.draw(g, x, y, E.VIEWS.threequarter), { outline: true, rim: true, wrap: [MW * C8, 0] });
          if (w.blue) L.add(p.x, p.y, 6, 22, .5, { color: '#6a7aff' });
        }
      }
      if (readyT > 0) r.overlay(g => E.font.text(g, 'READY!', X0 + MW * C8 / 2, Y0 + (HY + 6) * C8 + 1, '#ffe040', { align: 'center', outline: false, shadow: '#000' }));
    }
    function drawInter(r) {
      r.overlay(g => {
        const a = inter, y = Y0 + TUN * C8 + 4, x = X0 + a.x;
        E.font.text(g, 'INTERMISSION', X0 + MW * C8 / 2, Y0 + 8 * C8, '#ffe070', { align: 'center', outline: false, shadow: '#000' });
        if (!a.big) { px.disc(g, x, y, 4, '#ffe040'); px.disc(g, x - 20, y - 1, 4, '#ff4a4a'); px.rect(g, x - 24, y - 1, 9, 4, '#ff4a4a'); }
        else { px.disc(g, x + 30, y - 1, 4, '#2a3aff'); px.rect(g, x + 26, y - 1, 9, 4, '#2a3aff'); px.disc(g, x, y, 11, '#ffe040'); px.poly(g, [[x, y], [x - 12, y - 6], [x - 12, y + 6]], '#000000'); }
      });
    }
    return {
      id: 'maze', label: 'MAZE', res: [232, 270], about: 'EAT EVERY SEED, DODGE FOUR WISPS', hue: ['#ffe040', '#4ae8ff', '#ff4a8a'], touch: [], extra: [10000], light: .5,
      begin(c, isDemo) { cab = c; demo = !!isDemo; over = false; level = 1; inter = null; wisps = wisps || null; build(); reset(); },
      revive() { over = false; reset(); },   // after a continue: the same maze, everyone back in place
      force() { over = true; },
      step, draw, box: () => [X0, Y0 - 12, MW * C8, MH * C8 + 22], edges: () => [X0 - 4, X0 + MW * C8 + 4],
      get over() { return over; }, get level() { return level; },
      state: () => ({ hero: [hero.m.cx, hero.m.cy], wisps: wisps.map(w => [w.m.cx, w.m.cy, w.eyes, w.blue]), seeds: seeds.size + power.size, level, fright: +fright.toFixed(3) })
    };
  })();

  /* =================================== 2. FORMATION =================================== */
  const FORM = (() => {
    const FW = 224, FLY = 130;   // the field's width (its height is the screen's: FH), a moth's speed along its path (px/s)
    let FH = 270;
    const MOTH = {
      a: E.sprite(['..y..y..', '.yYyyYy.', 'ybbBBbby', 'bbBwwBbb', '.bBBBBb.', '..b..b..'], { y: '#ffe040', Y: '#fff8a0', b: '#4a8aff', B: '#8ab8ff', w: '#ffffff' }),
      b: E.sprite(['r......r', '.rRRRRr.', 'rRwRRwRr', '.rRRRRr.', 'r.r..r.r'], { r: '#e03a4a', R: '#ff8a8a', w: '#ffffff' }),
      boss: E.sprite(['..gGGg..', '.gGwwGg.', 'gGGGGGGg', 'gpGppGpg', '.p.pp.p.', 'p......p'], { g: '#3ad860', G: '#9af0a0', w: '#ffffff', p: '#c050f0' }),
      hurt: E.sprite(['..pPPp..', '.pPwwPp.', 'pPPPPPPp', 'pgPggPgp', '.g.gg.g.', 'g......g'], { p: '#a050e0', P: '#d8a0ff', w: '#ffffff', g: '#3ad860' })
    };
    const SHIP = E.sprite(['...w...', '...w...', '..wrw..', '.wwrww.', 'wwbwbww', 'w.bbb.w', 'r..r..r'], { w: '#f0f0f8', r: '#ff4a4a', b: '#4a8aff' });
    const ROWS = [['boss', 4], ['b', 8], ['b', 8], ['a', 10], ['a', 10]];
    const SLOTS = ROWS.flatMap(([kind, n], row) => Array.from({ length: n }, (_, i) => ({ kind, x: FW / 2 + (i - (n - 1) / 2) * 18, y: 36 + row * 16 })));
    let cab, demo, foes, shots, bombs, ship, wave, sway, dead, over, readyT, stars = [], X0 = 0, Y0 = 0;
    // a wave: five groups of eight fly in from alternate sides, a loop on the way, each to its own place (Catmull paths)
    function newWave() {
      foes = []; wave++; cab.card('STAGE ' + wave, 1.8); readyT = Math.max(readyT, .6);
      SLOTS.forEach((s, i) => {
        const group = Math.floor(i / 8), side = group % 2 ? 1 : -1, k = i % 8;
        const path = new E.Path([[FW / 2 + side * 150, -20], [FW / 2 + side * 70, 80], [FW / 2 - side * 20, 170], [FW / 2 - side * 70, 120], [FW / 2 - side * 30, 70], [s.x, s.y]], { smooth: 'catmull' });
        foes.push({ kind: s.kind, hp: s.kind === 'boss' ? 2 : 1, slot: s, path, d: -(group * 1.6 + k * .14) * FLY, state: 'in', x: path.at(0).x, y: -20, a: Math.PI / 2 });
      });
    }
    function begin(c, isDemo) { cab = c; demo = !!isDemo; wave = 0; over = false; shots = []; bombs = []; sway = 0; dead = 0; readyT = 1.4; ship = { x: FW / 2, y: FH - 28, cool: 0 }; stars = Array.from({ length: 90 }, (_, i) => ({ x: (i * 97) % FW, y: (i * 53) % 600, s: 20 + (i % 3) * 25 })); layout(); newWave(); }
    // a dive: from its place a swoop out, at the ship (where it is now) and off the bottom; it comes back from the top
    function dive(f) {
      const sx = ship.x, out = f.x < FW / 2 ? -1 : 1;
      f.path = new E.Path([[f.x, f.y], [f.x + out * 30, f.y - 16], [f.x + out * 46, f.y + 20], [sx + (Math.random() - .5) * 50, FH * .62], [sx + out * 40, FH + 24]], { smooth: 'catmull' }); f.d = 0; f.state = 'dive';
    }
    const kill = f => { f.hp = 0; cab.add(f.kind === 'boss' ? (f.state === 'dive' ? 400 : 150) : f.kind === 'b' ? (f.state === 'dive' ? 160 : 80) : (f.state === 'dive' ? 100 : 50), { x: X0 + f.x, y: Y0 + f.y }); P.sparks(X0 + f.x, Y0 + f.y, 4, 10); P.bits(X0 + f.x, Y0 + f.y, 4, 6, ['#ffe040', '#4a8aff', '#ff4a4a']); A.sfx('explode', { vol: .45 }); };
    function step(dt, I) {
      layout(); sway += dt; ship.y = FH - 28;
      for (const s of stars) s.y = (s.y + s.s * dt) % 600;
      if (readyT > 0) readyT -= dt;
      if (dead > 0 && (dead -= dt) <= 0) { const was = cab.p, r = cab.die(); if (r === 'over') { over = true; return; } if (r === 'next') { was.save = { wave, foes }; const s = cab.p.save; if (s) { wave = s.wave; foes = s.foes; for (const f of foes) if (f.state !== 'form') { f.state = 'back'; f.y = -20; } } else { wave = 0; newWave(); } } ship.x = FW / 2; bombs.length = 0; readyT = 1.4; }
      const live = dead <= 0 && readyT <= 0;
      if (live) {   // the ship: left and right; two shots on screen at most
        const mv = demo ? botMove() : I.move()[0]; ship.x = clamp(ship.x + mv * 115 * dt, 10, FW - 10); ship.cool -= dt;
        if ((demo ? botFire() : I.down('fire')) && ship.cool <= 0 && shots.length < 2) { shots.push({ x: ship.x, y: ship.y - 8 }); ship.cool = .2; A.sfx('shoot', { vol: .35 }); }
      }
      for (const s of shots) s.y -= 270 * dt; shots = shots.filter(s => s.y > -10);
      const sx = Math.sin(sway * 1.2) * 12;
      let formed = 0;
      for (const f of foes) {
        if (f.state === 'in' || f.state === 'dive') {
          f.d += FLY * (1 + wave * .04) * dt; if (f.d < 0) continue;
          const p = f.path.at(f.d), u = f.state === 'in' ? Math.min(1, f.d / f.path.length) : 0; f.x = p.x + sx * u * u; f.y = p.y; f.a = p.angle;
          if (f.d >= f.path.length) { if (f.state === 'dive') { f.state = 'back'; f.y = -20; f.x = f.slot.x + sx; } else f.state = 'form'; }
          if (f.state === 'dive' && f.y < ship.y - 50 && Math.random() < dt * (.7 + wave * .1)) bombs.push({ x: f.x, y: f.y, vx: (ship.x - f.x) * .35, vy: 125 });
        } else if (f.state === 'back') { f.y += 90 * dt; f.x += (f.slot.x + sx - f.x) * Math.min(1, dt * 4); f.a = Math.PI / 2; if (f.y >= f.slot.y) f.state = 'form'; }
        else { f.x = f.slot.x + sx; f.y = f.slot.y + Math.sin(sway * 3 + f.slot.x * .1) * 1.5; f.a = Math.PI / 2; formed++; }
      }
      if (live && formed > 3 && Math.random() < dt * (.45 + wave * .15)) { const c = foes.filter(f => f.state === 'form' && f.hp > 0); if (c.length) { const f = c[Math.floor(Math.random() * c.length)]; dive(f); if (f.kind === 'boss') for (const e of c.filter(e => e !== f && e.kind === 'b' && Math.abs(e.slot.x - f.slot.x) < 20).slice(0, 2)) dive(e); A.sfx('whoosh', { vol: .3 }); } }
      for (const b of bombs) { b.x += b.vx * dt; b.y += b.vy * dt; } bombs = bombs.filter(b => b.y < FH + 10);
      for (const s of shots) for (const f of foes) if (!s.hit && f.hp > 0 && f.d >= 0 && Math.abs(s.x - f.x) < 7 && Math.abs(s.y - f.y) < 6) { s.hit = true; if (--f.hp > 0) { A.sfx('bump'); P.sparks(X0 + f.x, Y0 + f.y, 4, 4); } else kill(f); }
      shots = shots.filter(s => !s.hit); foes = foes.filter(f => f.hp > 0);
      if (live) for (const o of [...bombs, ...foes]) if (Math.abs(o.x - ship.x) < 6 && Math.abs(o.y - ship.y) < 6) { dead = 1.8; P.explosion(X0 + ship.x, Y0 + ship.y, 4, .9, { sound: true, flash: false, shake: 2, freeze: false }); if (o.hp) kill(o); break; }
      if (!foes.length && dead <= 0) newWave();
    }
    // the demo's pilot: of a step left, none and a step right, the first where no bomb or diving moth will be in the next
    // half second (a bomb's way read ahead to the ship's row), preferring the way to the moth nearest above; firing when
    // under one
    const hitAt = (x, t) => bombs.some(b => { const k = (ship.y - b.y) / b.vy; return k > -.05 && k < t && Math.abs(b.x + b.vx * k - x) < 9; }) || foes.some(f => f.state === 'dive' && f.d >= 0 && Math.abs(f.y - ship.y) < 40 && Math.abs(f.x - x) < 12);
    const botMove = () => {
      const t = foes.find(f => f.state === 'dive' && f.y < ship.y - 50) || foes.filter(f => f.d >= 0).reduce((p, f) => !p || Math.abs(f.x - ship.x) < Math.abs(p.x - ship.x) ? f : p, null);
      const want = t ? clamp((t.x - ship.x) / 10, -1, 1) : 0, ways = [want, 0, -1, 1].map(m => Math.round(m)), q = m => clamp(ship.x + m * 115 * .3, 10, FW - 10);
      for (const m of ways) if (!hitAt(q(m), .8) && !hitAt((ship.x + q(m)) / 2, .4)) return m === Math.round(want) ? want : m;
      return ship.x < FW / 2 ? 1 : -1;
    };
    const botFire = () => foes.some(f => f.d >= 0 && Math.abs(f.x - ship.x) < 8);
    function layout() { FH = Math.max(270, game.H - 4); X0 = Math.round((game.W - FW) / 2); Y0 = Math.round((game.H - FH) / 2); }
    function draw(r) {
      layout(); const cl = classic(), x0 = X0, y0 = Y0;
      r.sky(['#000000', cl ? '#000000' : '#0a0624']);
      r.overlay(g => {
        for (const s of stars) if (s.y < FH) px.dot(g, x0 + s.x, y0 + s.y, s.s > 50 ? '#ffffff' : s.s > 30 ? '#8a8ab0' : '#4a4a6a');
        for (const s of shots) { if (!cl) px.blend(g, .5, 'add', () => px.rect(g, x0 + s.x - 1, y0 + s.y - 1, 3, 7, '#8ad8ff')); px.rect(g, x0 + s.x, y0 + s.y, 1, 5, '#ffffff'); }
        for (const b of bombs) { if (!cl) px.blend(g, .4, 'add', () => px.disc(g, x0 + b.x, y0 + b.y, 3, '#ff8a4a')); px.rect(g, x0 + b.x - 1, y0 + b.y - 1, 2, 4, '#ff6a4a'); }
      });
      // each moth turned to the way it flies (r.sprite's rot; in its place, facing down); the classic turns in 16 steps
      for (const f of foes) if (f.d >= 0 || f.state !== 'in') r.sprite(x0 + f.x, y0 + f.y, 0, f.kind === 'boss' && f.hp === 1 ? MOTH.hurt : MOTH[f.kind], { rot: f.a + Math.PI / 2, anchor: 'center', steps: cl ? 16 : 32, glow: cl ? 0 : .3 });
      if (dead <= 0 && !over && (readyT <= 0 || Math.floor(readyT * 8) % 2)) { r.sprite(x0 + ship.x, y0 + ship.y, 0, SHIP, { anchor: 'center', glow: cl ? 0 : .4 }); if (!cl) L.add(x0 + ship.x, y0 + ship.y, 4, 46, .9, { color: '#8ab8ff' }); }
      if (!cl) for (const s of shots) L.add(x0 + s.x, y0 + s.y, 4, 18, .6, { color: '#8ad8ff' });
    }
    return {
      id: 'formation', label: 'FORMATION', res: [232, 270], about: 'MOTHS FLY IN, FORM UP AND DIVE', hue: ['#4a8aff', '#ff4a4a', '#ffe040'], touch: ['fire'], extra: [20000, 70000], light: .8, fills: true,
      begin, revive() { over = false; ship.x = FW / 2; bombs.length = 0; readyT = 1.4; }, force() { over = true; }, step, draw,
      box: () => [X0, Y0, FW, FH], edges: () => [X0 - 2, X0 + FW + 2],
      get over() { return over; }, get level() { return wave; },
      state: () => ({ ship: +ship.x.toFixed(2), foes: foes.length, wave, shots: shots.length, bombs: bombs.length })
    };
  })();

  /* =================================== 3. ROCKS =================================== */
  const ROCKS = (() => {
    let RW = 320, RH = 240;   // the field: the whole screen (at least 320 x 240), its edges meeting
    let cab, demo, ship, rocks, shots, saucer, over, wave, deadT, readyT, sparks, X0 = 0, Y0 = 0;
    // a rock: a ring of lumpy points; size 3 big, 2, 1 small; the smaller, the faster
    const rock = (x, y, size) => { const n = 8 + size * 2, R = [0, 5, 10, 18][size], a = Math.random() * TAU, sp = (52 - size * 11) * (.6 + Math.random() * .6); return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size, R, rot: 0, spin: (Math.random() - .5) * 2, pts: Array.from({ length: n }, (_, i) => { const t = i / n * TAU, k = .75 + Math.random() * .35; return [Math.cos(t) * R * k, Math.sin(t) * R * k]; }) }; };
    function newWave() { wave++; rocks = []; for (let i = 0; i < 3 + wave; i++) { const edge = Math.random() < .5; rocks.push(rock(edge ? 0 : Math.random() * RW, edge ? Math.random() * RH : 0, 3)); } if (wave > 1) cab.card('WAVE ' + wave, 1.4); }
    const home = () => Object.assign(ship, { x: RW / 2, y: RH / 2, vx: 0, vy: 0, a: -Math.PI / 2 });
    function begin(c, isDemo) { cab = c; demo = !!isDemo; wave = 0; over = false; shots = []; saucer = null; sparks = []; deadT = 0; readyT = 1.2; ship = { cool: 0, thrust: false }; layout(); home(); newWave(); }
    const wd = (a, b, s) => E.wrapDiff(a, b, s), far = (a, b) => Math.hypot(wd(a.x, b.x, RW), wd(a.y, b.y, RH));
    const burst = (x, y, n, sp, life, c) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (.4 + Math.random() * .6); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: life * (.5 + Math.random() * .5), c }); } };
    function kill() { deadT = 1.8; A.sfx('boom'); burst(ship.x, ship.y, 24, 80, .9, '#ffe0a0'); game.shake(3); }
    function step(dt, I) {
      layout(); if (readyT > 0 && (readyT > .3 || !rocks.some(k => far(k, { x: RW / 2, y: RH / 2 }) < k.R + 40))) readyT -= dt;   // (it comes back once the middle is clear)
      if (deadT > 0 && (deadT -= dt) <= 0) { const was = cab.p, r = cab.die(); if (r === 'over') { over = true; return; } if (r === 'next') { was.save = { wave, rocks }; const s = cab.p.save; if (s) ({ wave, rocks } = s); else { wave = 0; newWave(); } } home(); readyT = 1.4; shots = shots.filter(s => !s.foe); }
      const live = deadT <= 0 && readyT <= 0;
      if (live) {   // turn, thrust (and drift: a little drag), fire, hyperspace (a one-in-ten chance it goes wrong)
        const turn = demo ? botTurn() : I.move()[0], thr = demo ? botThrust() : I.down('up') || I.down('thrust') || I.move()[1] < -.6;
        ship.a += turn * 4.4 * dt; ship.thrust = thr;
        if (thr) { ship.vx += Math.cos(ship.a) * 170 * dt; ship.vy += Math.sin(ship.a) * 170 * dt; if (Math.random() < .6) sparks.push({ x: ship.x - Math.cos(ship.a) * 6, y: ship.y - Math.sin(ship.a) * 6, vx: -Math.cos(ship.a) * 50 + (Math.random() - .5) * 24, vy: -Math.sin(ship.a) * 50 + (Math.random() - .5) * 24, t: .3, c: '#ffb84a' }); }
        const sp = Math.hypot(ship.vx, ship.vy); if (sp > 220) { ship.vx *= 220 / sp; ship.vy *= 220 / sp; }
        ship.vx *= Math.exp(-.4 * dt); ship.vy *= Math.exp(-.4 * dt); ship.cool -= dt;
        if ((demo ? botFire() : I.pressed('fire')) && ship.cool <= 0 && shots.filter(s => !s.foe).length < 5) { shots.push({ x: ship.x + Math.cos(ship.a) * 7, y: ship.y + Math.sin(ship.a) * 7, vx: Math.cos(ship.a) * 290 + ship.vx, vy: Math.sin(ship.a) * 290 + ship.vy, t: .85 }); ship.cool = .12; A.sfx('laser', { vol: .3 }); }
        if (demo ? botWarp() : I.pressed('warp')) { burst(ship.x, ship.y, 10, 40, .4, '#8ab8ff'); ship.x = Math.random() * RW; ship.y = Math.random() * RH; ship.vx = ship.vy = 0; A.sfx('warp'); if (Math.random() < .1) kill(); }
      }
      if (deadT <= 0) { ship.x = E.wrap(ship.x + ship.vx * dt, 0, RW); ship.y = E.wrap(ship.y + ship.vy * dt, 0, RH); }
      for (const s of shots) { s.x = E.wrap(s.x + s.vx * dt, 0, RW); s.y = E.wrap(s.y + s.vy * dt, 0, RH); s.t -= dt; }
      for (const k of rocks) { k.x = E.wrap(k.x + k.vx * dt, 0, RW); k.y = E.wrap(k.y + k.vy * dt, 0, RH); k.rot += k.spin * dt; }
      for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; } sparks = sparks.filter(p => p.t > 0);
      // the saucer: now and then, across the screen, shooting at you (across the edges: the nearer way)
      if (!saucer && live && Math.random() < dt * .05 * wave) saucer = { x: 0, y: 30 + Math.random() * (RH - 60), vx: Math.random() < .5 ? 60 : -60, vy: 0, t: 0, cool: 1.2 };
      if (saucer) {
        saucer.x = E.wrap(saucer.x + saucer.vx * dt, 0, RW); saucer.t += dt; saucer.vy = Math.sin(saucer.t * 2) * 22; saucer.y = E.wrap(saucer.y + saucer.vy * dt, 0, RH); saucer.cool -= dt;
        if (saucer.cool <= 0 && live) { const a = Math.atan2(wd(saucer.y, ship.y, RH), wd(saucer.x, ship.x, RW)) + (Math.random() - .5) * .5; shots.push({ x: saucer.x, y: saucer.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, t: 1.4, foe: true }); saucer.cool = 1.4; A.sfx('shoot', { vol: .2, pitch: .6 }); }
        if (saucer.t > RW / 60) saucer = null;
      }
      // hits: your shots split rocks (big 20, middle 50, small 100) and down the saucer (500); rocks, its shots and it on you
      for (const s of shots) {
        if (s.t <= 0 || s.foe) continue;
        for (const k of rocks) if (!k.dead && far(s, k) < k.R) { k.dead = true; s.t = 0; cab.add([0, 100, 50, 20][k.size], { x: X0 + k.x, y: Y0 + k.y }); A.sfx(k.size > 2 ? 'boom' : 'explode', { vol: .4 }); burst(k.x, k.y, 6 + k.size * 3, 60, .6, '#c8d8ff'); if (k.size > 1) for (let i = 0; i < 2; i++) rocks.push(rock(k.x, k.y, k.size - 1)); break; }
        if (s.t > 0 && saucer && far(s, saucer) < 8) { cab.add(500, { x: X0 + saucer.x, y: Y0 + saucer.y }); s.t = 0; burst(saucer.x, saucer.y, 16, 70, .7, '#ff8aa8'); saucer = null; A.sfx('boom'); }
      }
      rocks = rocks.filter(k => !k.dead); shots = shots.filter(s => s.t > 0);
      if (live && (rocks.some(k => far(ship, k) < k.R + 4) || shots.some(s => s.foe && far(s, ship) < 5) || (saucer && far(saucer, ship) < 10))) kill();
      if (!rocks.length) newWave();
    }
    // the demo's pilot: a rock, the saucer or its shot that will pass within reach in the next second and a half is a
    // threat: turn across its way and thrust out of it (hyperspace when it is a quarter second off); else brake when
    // drifting, and turn to where the nearest rock will be when a shot gets there (across the edges), firing when facing
    // it; the saucer first when it is about
    function threat() {
      let worst = null, wt = 1.5;
      const all = [...rocks, ...(saucer ? [Object.assign({ R: 9 }, saucer)] : []), ...shots.filter(s => s.foe).map(s => Object.assign({ R: 3 }, s))];
      for (const k of all) {
        const rx = wd(ship.x, k.x, RW), ry = wd(ship.y, k.y, RH), vx = k.vx - ship.vx, vy = k.vy - ship.vy, v2 = vx * vx + vy * vy || 1, t = -(rx * vx + ry * vy) / v2;
        if (Math.hypot(rx, ry) < k.R + 12) return { k, t: 0, a: Math.atan2(-ry, -rx) };
        if (t > 0 && t < wt && Math.hypot(rx + vx * t, ry + vy * t) < k.R + 9) { wt = t; worst = { k, t, a: Math.atan2(vy, vx) + (vx * ry - vy * rx > 0 ? -1 : 1) * Math.PI / 2 }; }
      }
      return worst;
    }
    const brake = () => Math.hypot(ship.vx, ship.vy) > 45 ? Math.atan2(-ship.vy, -ship.vx) : null;
    function aim() {
      let b = null, bd = 1e9; for (const k of saucer ? [saucer] : rocks) { const d = far(ship, k); if (d < bd) { bd = d; b = k; } }
      if (!b) return null; const t = bd / 290; return Math.atan2(wd(ship.y, b.y + b.vy * t, RH), wd(ship.x, b.x + b.vx * t, RW));
    }
    const botTurn = () => { const th = threat(), b = brake(), a = th ? th.a : b !== null ? b : aim(); return a === null ? 0 : clamp(E.angDiff(ship.a, a) * 4, -1, 1); };
    const botFire = () => { const a = aim(); return a !== null && Math.abs(E.angDiff(ship.a, a)) < .15; };
    const botThrust = () => { const th = threat(), b = brake(), a = th ? th.a : b; return a !== null && Math.abs(E.angDiff(ship.a, a)) < .6; };
    const botWarp = () => { const th = threat(); return !!th && th.t < .25 && th.k.R > 3 && Math.abs(E.angDiff(ship.a, th.a)) > 1; };
    function layout() { RW = Math.max(320, game.W); RH = Math.max(240, game.H); X0 = Math.round((game.W - RW) / 2); Y0 = Math.round((game.H - RH) / 2); }
    function draw(r) {
      layout(); const cl = classic(), x0 = X0, y0 = Y0;
      r.sky(['#000000', cl ? '#000000' : '#04061a']);
      r.overlay(g => {
        g.save(); g.beginPath(); g.rect(x0, y0, RW, RH); g.clip();
        // glowing vector lines: each shape bright over a soft wide glow (classic: plain white lines), at every edge it crosses
        const vec = (pts, x, y, a, color, closed = true) => {
          for (const ox of [-RW, 0, RW]) for (const oy of [-RH, 0, RH]) {
            const Q = pts.map(([u, v]) => [x0 + x + ox + u * Math.cos(a) - v * Math.sin(a), y0 + y + oy + u * Math.sin(a) + v * Math.cos(a)]);
            if (Q.every(q => q[0] < x0 - 2 || q[0] > x0 + RW + 2) || Q.every(q => q[1] < y0 - 2 || q[1] > y0 + RH + 2)) continue;
            const n = closed ? Q.length : Q.length - 1;
            if (!cl) px.blend(g, .3, 'add', () => { for (let i = 0; i < n; i++) px.line(g, ...Q[i], ...Q[(i + 1) % Q.length], color, 3); });
            for (let i = 0; i < n; i++) px.line(g, ...Q[i], ...Q[(i + 1) % Q.length], cl ? '#ffffff' : E.shade(color, .45));
          }
        };
        for (const k of rocks) vec(k.pts, k.x, k.y, k.rot, '#8ab8ff');
        if (deadT <= 0 && (readyT <= 0 || Math.floor(readyT * 8) % 2)) { vec([[8, 0], [-6, -5], [-3, 0], [-6, 5]], ship.x, ship.y, ship.a, '#ffffff'); if (ship.thrust && Math.floor(game.time * 30) % 2) vec([[-4, -2], [-9, 0], [-4, 2]], ship.x, ship.y, ship.a, '#ffb84a', false); }
        if (saucer) vec([[-9, 0], [-4, -3], [4, -3], [9, 0], [4, 3], [-4, 3], [-9, 0], [9, 0], [4, -3], [2, -6], [-2, -6], [-4, -3]], saucer.x, saucer.y, 0, '#ff6a8a', false);
        for (const s of shots) { if (!cl) px.blend(g, .5, 'add', () => px.disc(g, x0 + s.x, y0 + s.y, 2, s.foe ? '#ff6a8a' : '#c8e0ff')); px.rect(g, x0 + s.x, y0 + s.y, 1, 1, '#ffffff'); }
        for (const p of sparks) px.dot(g, x0 + p.x, y0 + p.y, cl ? '#ffffff' : p.c);
        g.restore(); px.reset(g);
      });
    }
    return {
      id: 'rocks', label: 'ROCKS', res: [320, 240], about: 'TURN, THRUST, SPLIT THE ROCKS', hue: ['#c8d8ff', '#8ab8ff', '#ff8a4a'], touch: ['fire', 'thrust', 'warp'], every: 10000, light: 0, fills: true,
      begin, revive() { over = false; home(); readyT = 1.4; }, force() { over = true; }, step, draw,
      box: () => [X0, Y0, RW, RH], edges: () => [X0 - 2, X0 + RW + 2],
      get over() { return over; }, get level() { return wave; },
      state: () => ({ ship: [+ship.x.toFixed(2), +ship.y.toFixed(2)], rocks: rocks.length, wave, shots: shots.length })
    };
  })();

  /* =================================== 4. THE CABINET: a scene per game, the title, the attract mode =================================== */
  const GAMES = [MAZE, FORM, ROCKS];
  const cabs = {}; for (const G of GAMES) cabs[G.id] = new E.Arcade(game, { id: G.id, lives: 3, extra: G.extra || [], every: G.every });
  const front = new E.Arcade(game, { id: 'arcade', idle: 20, demo: 1e9, scores: 6 });   // the title's attract clock (a demo ends itself: endDemo)
  let pick = 0, players = 1, demoNext = 0, cabsAt = [];
  function playScene(G) {
    const cab = cabs[G.id];
    let demo = false, demoT = 0, stage = 'play', tableT = 0;
    // the end: each player's initials in turn (the best first) where they make the table, then the table
    const ending = (order = cab.players.slice().sort((a, b) => b.score - a.score)) => {
      const p = order.shift(); if (!p) { stage = 'table'; tableT = 0; A.music(null); return; }
      if (cab.qualifies(p.score)) { stage = 'entry'; if (cab.players.length > 1) cab.say('PLAYER ' + p.n, 30); cab.enter(p.score, '', () => { cab.clear(); ending(order); }); } else ending(order);
    };
    const scene = {
      view: 'overhead', views: ['overhead'], input: KEYS, res: G.res, expand: true, pausable: true, touch: G.touch, camera: { zoom: false },
      enter(d) {
        demo = !!(d && d.demo); demoT = 0; stage = 'play'; tableT = 0;
        game.follow(null); game.cam.bounds = null; game.focus(game.W / 2, game.H / 2, 0); game.cam.snap = true;
        L.enabled = !classic() && G.light > 0; L.ambient = G.light; L.dark = [4, 2, 14]; L.refresh();
        if (G.id === 'rocks') { game.input.touchSet('thrust', 'THRUST'); game.input.touchSet('warp', 'WARP'); }
        cab.start(demo ? 1 : players, { demo }); G.begin(cab, demo); A.music(null);
      },
      exit() { L.enabled = false; },
      back() { game.go('arcade'); return true; },
      update(dt) {
        const I = game.input; game.focus(game.W / 2, game.H / 2, 0);
        if (I.pressed('classic')) { game.settings.set('arcadeLook', classic() ? 'remaster' : 'classic'); L.enabled = !classic() && G.light > 0; game.note(classic() ? 'CLASSIC LOOK' : 'REMASTER'); }
        cab.update(dt);
        if (demo) { demoT += dt; if (I.anyPressed() || I.clicked() || demoT > 30 || G.over) { front.endDemo(); game.go('arcade', { scores: G.id }, { fade: 'black' }); return; } G.step(dt, I); return; }
        if (cab.entry || cab.continuing) return;
        if (stage === 'table') { tableT += dt; if (tableT > 8 || (tableT > 1 && (I.pressed('confirm') || I.pressed('start') || I.clicked()))) game.go('arcade', null, { fade: 'black' }); return; }
        if (G.over && stage === 'play') { stage = 'cont'; cab.continue(9, yes => { if (yes) { stage = 'play'; G.revive(); } else ending(); }); return; }
        G.step(dt, I);
      },
      draw(r) {
        G.draw(r); const [e0, e1] = G.edges(), b = G.box(); cabinet(r, e0, e1, G.hue, G.fills ? 0 : b[1], G.fills ? r.H : b[1] + b[3], G.label);
        if (stage === 'table') { r.overlay(g => { g.fillStyle = 'rgba(0,0,0,.78)'; g.fillRect(0, 0, r.bw, r.bh); px.reset(g); }); cab.drawTable(r, '', Math.max(16, Math.round(r.H / 2 - 82)), G.label + ' HIGH SCORES'); }
        else cab.draw(r, G.box());
      },
      /** the end of a game, now, with score (tools/phone-test.mjs: the way to the table): lives to none; the continue when
       *  cont, else straight to the initials */
      end(score, cont) { cab.p.score = score; cab.hi = Math.max(cab.hi, score); for (const p of cab.players) p.lives = 0; G.force(); if (!cont) { stage = 'cont'; ending(); } },
      /** the proof: a scripted game, a hash of where things are and the scores */
      run: (n = 600) => proof('arcade-' + G.id, n, (i, k) => { walk(i, k, ['left', 'up', 'right', 'down'], 70); if (i % 30 === 5) k.tap('fire'); if (G.id === 'rocks') { if (i % 140 < 40) k.hold('thrust'); else k.up('thrust'); } }, () => [G.state(), cab.players.map(p => [p.score, p.lives])]),
      state: () => ({ game: G.state(), stage, demo, entry: cab.entry && { name: cab.entry.name.slice(), i: cab.entry.i, score: cab.entry.score }, wheel: cab.entry && cab.wheel, continuing: cab.continuing, scores: cab.players.map(p => p.score), table: cab.table() })
    };
    return scene;
  }
  for (const G of GAMES) scenes['arcade-' + G.id] = playScene(G);
  let showTable = null;
  const go = i => { pick = i; A.sfx('confirm'); game.go('arcade-' + GAMES[i].id, null, { fade: 'black' }); };
  const title = {
    view: 'side', views: ['side'], input: KEYS, res: 'ps1', expand: true, pausable: false, touch: [], camera: { zoom: false },
    enter(d) {
      game.follow(null); game.cam.bounds = null; game.focus(0, 0, 0); game.cam.snap = true; A.music(SONG); L.enabled = false; game.input.consumeAll();
      showTable = d && d.scores || null;
      if (d && d.part && scenes['arcade-' + d.part]) game.go('arcade-' + d.part, null, { fade: 0 });   // #arcade/maze
    },
    update(dt) {
      const I = game.input, ph = front.attract(dt);
      if (ph === 'demo') { const G = GAMES[demoNext++ % GAMES.length]; game.go('arcade-' + G.id, { demo: true }, { fade: 'black' }); return; }
      if (ph !== 'scores') showTable = null; else if (!showTable) showTable = GAMES[(demoNext + GAMES.length - 1) % GAMES.length].id;
      if (I.pressed('left')) { pick = (pick + GAMES.length - 1) % GAMES.length; A.sfx('select'); }
      if (I.pressed('right')) { pick = (pick + 1) % GAMES.length; A.sfx('select'); }
      if (I.pressed('up') || I.pressed('down')) { players = 3 - players; A.sfx('select'); }
      if (I.pressed('confirm') || I.pressed('start') || I.pressed('fire')) { go(pick); return; }
      const tap = I.clicked();
      if (tap) { const i = cabsAt.findIndex(([x, y, w, h]) => tap[0] >= x && tap[0] < x + w && tap[1] >= y && tap[1] < y + h); if (i >= 0 && i < GAMES.length) go(i); else if (i === GAMES.length) { players = 3 - players; A.sfx('select'); } }
    },
    draw(r) {
      r.sky(['#0a0418', '#2a0a3a', '#4a1050']);
      const t = game.time, [cw, ch] = corner(), top = touch() && r.W / 2 + 120 > r.W - cw ? Math.round(ch) : 0;
      r.overlay(g => {
        for (let i = 0; i < 50; i++) { const x = (i * 71 + t * 6 * (1 + i % 3)) % r.W, y = (i * 37) % (r.H * .7); px.dot(g, x, y, i % 5 ? '#6a5a9a' : '#ffffff'); }
        px.rect(g, 0, r.H - 30, r.W, 30, '#1a0a26'); for (let x = 0; x < r.W; x += 16) px.rect(g, x + ((x / 16) % 2) * 8, r.H - 30, 8, 1, '#3a1a4a');
        // the cabinets in a row, as tall as they can stand (to 1.9 times their width), centred on a tall screen
        const n = GAMES.length, w = Math.min(84, Math.floor((r.W - 24) / n) - 8), gap = 8, x0 = Math.round(r.W / 2 - (n * w + (n - 1) * gap) / 2), hgt = Math.min(Math.round(w * 1.9), r.H - 50 - top - 70), y = Math.max(50 + top, Math.round((r.H - hgt) / 2 - 10));
        E.font.title(g, 'ARCADE', r.W / 2, y - 40, { align: 'center', scale: 4, colors: ['#ffffff', '#ffe040', '#ff8a40', '#ff4a8a'], depth: 3 });
        cabsAt = [];
        GAMES.forEach((G, i) => {   // a cabinet: a lit marquee, a screen showing the game's own picture, the control panel
          const x = x0 + i * (w + gap), on = i === pick, sh = Math.round(hgt * .5);
          cabsAt.push([x, y, w, hgt]);
          px.rect(g, x, y, w, hgt, on ? '#3a2a5a' : '#221636'); px.rect(g, x + 1, y + 1, w - 2, 1, on ? '#8a6ac0' : '#3a2a50');
          px.rect(g, x + 2, y + 2, w - 4, 13, G.hue[0]); px.blend(g, .3, 'add', () => px.rect(g, x + 2, y + 2, w - 4, 6, '#ffffff'));
          E.font.text(g, G.label, x + w / 2, y + 6, '#0a0614', { align: 'center', outline: false, font: 'tiny' });
          const sx = x + 5, sy = y + 19, sw = w - 10; px.rect(g, sx, sy, sw, sh, '#000000');
          g.save(); g.beginPath(); g.rect(sx, sy, sw, sh); g.clip();
          if (i === 0) { for (let k = 0; k < 6; k++) px.rect(g, sx + 8 + k * 9, sy + sh / 2, 2, 2, '#ffe9a0'); const hx = sx + 6 + (t * 14) % (sw - 12); px.disc(g, hx, sy + sh / 2 + 1, 4, '#ffe040'); px.disc(g, hx - 14, sy + sh / 2, 4, '#ff4a4a'); px.rect(g, sx, sy + 4, sw, 2, '#2a6a32'); px.rect(g, sx, sy + sh - 6, sw, 2, '#2a6a32'); }
          if (i === 1) { for (let k = 0; k < 8; k++) px.rect(g, sx + 6 + (k % 4) * 14 + Math.sin(t * 1.5) * 4, sy + 8 + Math.floor(k / 4) * 10, 6, 4, k < 4 ? '#3ad860' : '#4a8aff'); px.rect(g, sx + sw / 2 - 2 + Math.sin(t) * 18, sy + sh - 9, 5, 5, '#f0f0f8'); px.rect(g, sx + sw / 2 + Math.sin(t) * 18, sy + sh - 18 - (t * 60) % 30, 1, 4, '#ffffff'); }
          if (i === 2) { for (let k = 0; k < 4; k++) { const cx = sx + 10 + ((k * 23 + t * 9) % (sw - 10)), cy = sy + 10 + ((k * 17 + t * 5) % (sh - 14)), R = 3 + k % 3 * 2; for (let q = 0; q < 6; q++) px.line(g, cx + Math.cos(q) * R, cy + Math.sin(q) * R, cx + Math.cos(q + 1) * R, cy + Math.sin(q + 1) * R, '#c8d8ff'); } const a = t * 1.3, cx = sx + sw / 2, cy = sy + sh / 2; px.line(g, cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, cx + Math.cos(a + 2.5) * 4, cy + Math.sin(a + 2.5) * 4, '#ffffff'); px.line(g, cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, cx + Math.cos(a - 2.5) * 4, cy + Math.sin(a - 2.5) * 4, '#ffffff'); }
          g.restore(); px.reset(g);
          px.blend(g, .12, 'add', () => px.rect(g, sx, sy, sw, 3, '#ffffff'));
          const py = sy + sh + 5; px.rect(g, x + 3, py, w - 6, Math.max(10, hgt - (py - y) - 14), '#140c22');
          px.disc(g, x + 14, py + 8, 4, '#ff4a4a'); px.rect(g, x + 13, py + 1, 2, 7, '#c8c8d0'); px.disc(g, x + w - 22, py + 8, 3, '#ffe040'); px.disc(g, x + w - 12, py + 8, 3, '#4ae8ff');
          const hi = cabs[G.id].table()[0]; E.font.text(g, 'HI ' + (hi ? hi.score : 0), x + w / 2, y + hgt - 10, '#c8b8f0', { align: 'center', outline: false, font: 'tiny' });
          if (on) { const k = Math.floor(t * 3) % 2 ? '#ffffff' : '#ffe040'; px.rect(g, x - 2, y - 2, w + 4, 2, k); px.rect(g, x - 2, y + hgt, w + 4, 2, k); px.rect(g, x - 2, y, 2, hgt, k); px.rect(g, x + w, y, 2, hgt, k); }
        });
        // one or two players (up and down, or a tap on it)
        const by = y + hgt + 6, bw = 96, bh = touch() ? 34 : 16; cabsAt.push([Math.round(r.W / 2 - bw / 2), by, bw, bh]);   // (a thumb's size on a touch screen)
        px.rect(g, r.W / 2 - bw / 2, by, bw, bh, '#2a1a3e'); E.font.text(g, players === 1 ? '< 1 PLAYER >' : '< 2 PLAYERS >', r.W / 2, by + bh / 2 - 3, '#ffe7a8', { align: 'center', outline: false });
        E.font.text(g, GAMES[pick].about, r.W / 2, r.H - 22, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
        E.font.text(g, touch() ? 'TAP A CABINET TO PLAY' : game.input.lastDevice === 'gamepad' ? 'D-PAD + ' + game.input.label('confirm') + '   Y CLASSIC LOOK' : 'ARROWS + ENTER   C CLASSIC LOOK', r.W / 2, r.H - 11, '#9a8ac8', { align: 'center', outline: false, font: 'tiny' });
      });
      if (showTable) { r.overlay(g => { g.fillStyle = 'rgba(4,2,12,.88)'; g.fillRect(0, 0, r.bw, r.bh); px.reset(g); }); cabs[showTable].drawTable(r, '', Math.max(16, Math.round(r.H / 2 - 82)), GAMES.find(G => G.id === showTable).label + ' HIGH SCORES'); }
    },
    back() { game.go('title'); return true; },
    /** the bot (tools/kits-test.mjs): each game played by its own demo pilot, from a seed, until it clears two stages (or
     *  five minutes of game time, or its lives run out); then the attract mode left alone: the demo it starts, the table, the title again. What they reached */
    bot() {
      const was = Math.random, out = {}, A0 = game.audio.muted; Math.random = E.rng(9);
      try {
        for (const G of GAMES) {
          game.time = 0; game.go('arcade-' + G.id, { demo: true }, { fade: 0 }); game.advance(1 / 120);
          const cab = cabs[G.id]; let t = 0, cleared = 0;
          while (t < 300 && !G.over && G.level < 3) { cab.update(1 / 120); G.step(1 / 120, game.input); t += 1 / 120; if (G.level > 1 && !cleared) cleared = Math.round(t); }
          out[G.id] = { score: cab.players[0].score, level: G.level, cleared, lives: cab.players[0].lives, over: !!G.over, seconds: Math.round(t) };
        }
        game.go('arcade', null, { fade: 0 }); game.advance(1 / 120); front.wake();
        game.advance(front.o.idle + .5); const demoAt = game.sceneName;
        for (let i = 0; i < 40 && game.sceneName !== 'arcade'; i++) game.advance(1);
        const back = game.sceneName, table = front.phase === 'scores'; game.advance(front.o.scores + .5);
        out.attract = demoAt.startsWith('arcade-') && back === 'arcade' && table && front.phase === 'title';
        out.errors = game.errors.length; return out;
      } finally { Math.random = was; }
    },
    /** what the title shows: the game picked, one or two players, where each cabinet is (and the players button, last) on
     *  screen, the attract mode's phase */
    state: () => ({ pick, players, cabs: cabsAt, phase: front.phase, table: showTable }),
    /** the proof: each game's proof, one after the other */
    run: (n = 600) => GAMES.map(G => scenes['arcade-' + G.id].run(n)).join('-')
  };
  return title;
})();
scenes.arcade = ARCADE;
