/* =====================================================================================
 * SLICE 9  PUZZLE  (Tetris, Puyo Puyo, Columns). @modules grid
 * Two games on one neon stage. BLOCKS: falling tetrominoes by today's rules: a bag of seven (E.rng), the next five shown,
 * hold, a ghost, rotation with wall kicks (SRS), delayed auto-shift (input.repeat), lock delay that a move resets (up to
 * 15 times), soft and hard drops; lines that flash and burst, a level every ten lines and a faster fall. PAIRS: falling
 * pairs of four colours; four or more joined (E.Grid's groups) pop, what is above falls, and pops that cause pops are a
 * chain, each worth more. A mascot beside the field cheers a clear and winces at a tall stack. Versus comes with M4.
 * Keys: left / right move (held: auto-shift), down soft drop, Space hard drop, up or X rotate, Z rotate back, C or Shift
 * hold. TOUCH: drag sideways to move (a cell for each step of the thumb), tap to rotate, flick down to drop, flick up to
 * hold, hold the thumb down to soft drop.
 * HOW IT WORKS: the field is an array of cells (0 empty, or a colour), drawn in screen pixels over a painted stage; every
 * rule is a few lines below (spawn, fits, kicks, lock, clear, gravity), so a variant is a change to one of them.
 * bot(n) places n pieces by itself (a placement search: holes, height, bumps, lines), as tools/kits-test.mjs checks.
 * ===================================================================================== */
const PUZZLE = (() => {
  // the puzzle's own tune (the step sequencer's format): C major, bright and quick
  const STACK = { bpm: 144, steps: 4, tracks: [
    { wave: 'square', vol: .11, notes: 'E5 . G5 . C6 - B5 . A5 . G5 . E5 - D5 . | C5 . D5 . E5 - G5 . F5 - E5 . D5 - - . | A4 . C5 . F5 - E5 . D5 . C5 . A4 - G4 . | B4 . D5 . G5 - F5 . E5 . D5 . C5 - - .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . C3 . G3 . C3 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h k s . h h' }] };
  const D = E.Input.DEFAULT, KEYS = { up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause, confirm: D.confirm, cancel: D.cancel,
    rotate: ['KeyX', 'KeyK', 'Pad1'], ccw: ['KeyZ', 'KeyJ', 'Pad0'], drop: ['Space', 'Pad3'], hold: ['KeyC', 'ShiftLeft', 'ShiftRight', 'Pad4', 'Pad5'] };
  /* ---- 1. THE PIECES: SRS shapes in their spawn state, colours, and the wall kicks (y down) ---- */
  const SHAPES = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]] };
  const COLOR = { I: '#38d8f0', J: '#3a6af0', L: '#f09a2a', O: '#f0d838', S: '#4ad85a', T: '#b04ae8', Z: '#f0404a', G: '#6a6680' };
  const KJ = { '01': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '10': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '12': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '21': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '23': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '32': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '30': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '03': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]] };
  const KI = { '01': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]], '10': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], '12': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]], '21': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '23': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], '32': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]], '30': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]], '03': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]] };
  // a shape's cells in rotation state r (0..3): turned clockwise in its box (4 wide for I and O, 3 for the rest)
  const cellsOf = (k, r) => { const n = k === 'I' || k === 'O' ? 4 : 3; let c = SHAPES[k]; if (k !== 'O') for (let i = 0; i < r; i++) c = c.map(([x, y]) => [n - 1 - y, x]); return c; };
  const FALL = lv => Math.pow(Math.max(.05, .8 - (lv - 1) * .007), lv - 1);   // seconds a row, by level (the guideline's curve)
  /* ---- 2. PAIRS: four colours of blobs ---- */
  const PCOL = ['#f04a5a', '#4ad86a', '#4a8af0', '#f0d040'], PW = 6, PH = 12;
  const CHAIN = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256];
  let mode = 'menu', R = Math.random, field = null, W = 10, H = 22, cur = null, hold = null, held = false, queue = [], bag = [], fallT = 0, lockT = 0, resets = 0, softT = 0;
  let score = 0, lines = 0, level = 1, chain = 0, clearing = null, popping = null, over = null, flash = 0, mood = 0, moodT = 0, time = 0, popped = 0;
  let touchX = 0, touchY = 0, downT = 0, swept = false;
  const G = () => new E.Grid(W, H);
  const pick = new E.Menu(game, ['BLOCKS', 'PAIRS'], { y: 0, onPick: i => begin(i ? 'pairs' : 'blocks') });
  const after = new E.Menu(game, ['RETRY', 'OTHER GAME', 'TITLE'], { y: 0, onPick: i => i === 0 ? begin(over.kind) : i === 1 ? begin(over.kind === 'blocks' ? 'pairs' : 'blocks') : game.go('title') });
  const mascot = new E.Humanoid({ size: 1.3, outfit: 'robe', hair: 'ponytail', weapon: null, sleeves: 'long', colors: { cloth: '#e04a8a', hair: '#3a2a6a', trim: '#f0d060', skin: '#f0c8a0' } });

  /* ---- 3. BLOCKS: spawn, fits, move, rotate (kicks), lock, clear ---- */
  function nextFromBag() { if (!bag.length) { bag = 'IJLOSTZ'.split(''); for (let i = 6; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } } return bag.pop(); }
  function spawn(k) {
    while (queue.length < 6) queue.push(nextFromBag());
    cur = { k: k || queue.shift(), r: 0, x: 3, y: 0 }; fallT = 0; lockT = 0; resets = 0;
    if (!fits(cur.x, cur.y, cur.r)) end();
  }
  const fits = (x, y, r, k = cur.k) => cellsOf(k, r).every(([a, b]) => { const cx = x + a, cy = y + b; return cx >= 0 && cx < W && cy < H && (cy < 0 || !field[cy * W + cx]); });
  const grounded = () => !fits(cur.x, cur.y + 1, cur.r);
  function shift(dx) { if (!fits(cur.x + dx, cur.y, cur.r)) return false; cur.x += dx; touched(); A.sfx('blip', { vol: .4 }); return true; }
  function rotate(dir) {
    if (cur.k === 'O') return false;
    const to = (cur.r + dir + 4) % 4, kicks = (cur.k === 'I' ? KI : KJ)['' + cur.r + to];
    for (const [dx, dy] of kicks) if (fits(cur.x + dx, cur.y + dy, to)) { cur.x += dx; cur.y += dy; cur.r = to; touched(); A.sfx('select', { vol: .4 }); return true; }
    return false;
  }
  function touched() { if (grounded() && resets < 15) { lockT = 0; resets++; } }   // a move on the ground starts the lock again (15 times at most)
  function hardDrop() { let n = 0; while (fits(cur.x, cur.y + 1, cur.r)) { cur.y++; n++; } score += n * 2; lock(); A.sfx('land'); game.shake(1); }
  function holdPiece() {
    if (held) return; held = true; A.sfx('whoosh');
    const k = cur.k; if (hold) spawn(hold); else spawn(); hold = k;
  }
  function lock() {
    for (const [a, b] of cellsOf(cur.k, cur.r)) { const cy = cur.y + b; if (cy < 0) { end(); return; } field[cy * W + cur.x + a] = cur.k; }
    held = false;
    const full = []; for (let y = 0; y < H; y++) { let ok = true; for (let x = 0; x < W; x++) if (!field[y * W + x]) { ok = false; break; } if (ok) full.push(y); }
    if (full.length) { clearing = { rows: full, t: 0 }; const n = full.length; score += [0, 100, 300, 500, 800][n] * level; lines += n; A.sfx(n === 4 ? 'oneup' : 'coin'); flash = .3; cheer(n === 4 ? 2 : 1);
      for (const y of full) for (let x = 0; x < W; x += 2) burst(x, y, COLOR[field[y * W + x]] || '#fff'); cur = null; return; }
    spawn();
  }
  function clearRows() { const rows = clearing.rows; for (const y of rows) { field.copyWithin(W, 0, y * W); field.fill(0, 0, W); } clearing = null; const lv = 1 + Math.floor(lines / 10); if (lv > level) { level = lv; A.sfx('powerup'); } spawn(); }

  /* ---- 4. PAIRS: a pivot and a satellite; land, settle, pop the groups of four, chain ---- */
  function pairSpawn() {
    while (queue.length < 3) queue.push([Math.floor(R() * 4) + 1, Math.floor(R() * 4) + 1]);
    const [a, b] = queue.shift(); cur = { a, b, x: 2, y: 1, r: 0 }; fallT = 0; lockT = 0; resets = 0; chain = 0;
    if (field[1 * W + 2] || field[2]) end();
  }
  const SAT = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // where the satellite sits round the pivot, by rotation
  const pfits = (x, y, r) => [[x, y], [x + SAT[r][0], y + SAT[r][1]]].every(([cx, cy]) => cx >= 0 && cx < W && cy < H && (cy < 0 || !field[cy * W + cx]));
  function pshift(dx) { if (!pfits(cur.x + dx, cur.y, cur.r)) return false; cur.x += dx; A.sfx('blip', { vol: .4 }); return true; }
  function protate(dir) {
    const to = (cur.r + dir + 4) % 4;
    for (const [dx, dy] of [[0, 0], [-SAT[to][0], 0], [0, -SAT[to][1]]]) if (pfits(cur.x + dx, cur.y + dy, to)) { cur.x += dx; cur.y += dy; cur.r = to; A.sfx('select', { vol: .4 }); return true; }
    return false;
  }
  function plock() {
    const s = SAT[cur.r]; for (const [x, y, c] of [[cur.x, cur.y, cur.a], [cur.x + s[0], cur.y + s[1], cur.b]]) if (y >= 0) field[y * W + x] = c;
    cur = null; A.sfx('land'); settle();
  }
  function settle() { for (let x = 0; x < W; x++) { let to = H - 1; for (let y = H - 1; y >= 0; y--) { const c = field[y * W + x]; if (c) { field[y * W + x] = 0; field[to * W + x] = c; to--; } } } resolve(); }
  function resolve() {
    const groups = G().groups((x, y) => field[y * W + x] || null).filter(g => g.length >= 4);
    if (!groups.length) { pairSpawn(); return; }
    chain++; const n = groups.reduce((s, g) => s + g.length, 0);
    score += 10 * n * Math.max(1, CHAIN[Math.min(chain - 1, CHAIN.length - 1)] + (groups.length > 1 ? 3 * groups.length : 0)); popped += n;
    popping = { cells: groups.flat(), t: 0 }; A.sfx(chain > 1 ? 'oneup' : 'coin', { pitch: 1 + chain * .1 }); cheer(chain > 1 ? 2 : 1);
    for (const [x, y] of popping.cells) burst(x, y, PCOL[field[y * W + x] - 1]);
    lines = popped; level = 1 + Math.floor(popped / 40);   // (the results show blobs popped; a level every 40)
  }

  /* ---- 5. A GAME: begin, the end, the mascot's mood, bursts ---- */
  function begin(kind) {
    mode = kind; W = kind === 'blocks' ? 10 : PW; H = kind === 'blocks' ? 22 : PH + 1; field = new Array(W * H).fill(0);
    queue = []; bag = []; hold = null; held = false; score = 0; lines = 0; level = 1; chain = 0; clearing = popping = over = null; time = 0; popped = 0; mood = 0; R = E.rng(1 + Math.floor(Math.random() * 1e6));
    if (kind === 'blocks') spawn(); else pairSpawn();
    A.music(STACK); game.input.consumeAll();
  }
  function end() { if (over) return; over = { kind: mode, score, lines, level, best: best('puzzle-' + mode, score), t: 0 }; mode = 'over'; cur = null; mood = -1; moodT = 99; A.music(null); A.sfx('die'); after.i = 0; }
  function cheer(k) { mood = k; moodT = 1.2; }
  function burst(cx, cy, color) { if (!game.r) return; const [x, y] = cellPx(cx + .5, cy + .5); const [wx, wz] = toWorld(x, y); P.sparks(wx, 0, wz, 3, null, { color }); }
  /* ---- 6. INPUT: keys (auto-shift from input.repeat) and touch (drag, tap, flicks) ---- */
  function controls(dt) {
    const I = game.input, blocks = mode === 'blocks', mv = blocks ? shift : pshift, rot = blocks ? rotate : protate;
    if (I.repeat('left', .17, .05)) mv(-1);
    if (I.repeat('right', .17, .05)) mv(1);
    if (I.pressed('up') || I.pressed('rotate')) rot(1);
    if (I.pressed('ccw')) rot(-1);
    if (blocks && I.pressed('hold')) { holdPiece(); return; }
    if (I.pressed('drop')) { if (blocks) hardDrop(); else { while (pfits(cur.x, cur.y + 1, cur.r)) cur.y++; plock(); } return; }
    let soft = I.down('down');
    // touch: the finger's drag (input.drag(): screen pixels this step) moves a cell a step, a quick flick drops or holds
    const d = I.drag();
    if (d) {
      if (!downT) { touchX = touchY = 0; swept = false; } downT += dt; touchX += d[0]; touchY += d[1];
      const cs = cell() * .9; while (touchX > cs) { mv(1); touchX -= cs; swept = true; } while (touchX < -cs) { mv(-1); touchX += cs; swept = true; }
      if (touchY > cs * 3 && downT < .25 && !swept) { swept = true; if (blocks) hardDrop(); else { while (pfits(cur.x, cur.y + 1, cur.r)) cur.y++; plock(); } downT = 0; return; }
      if (touchY < -cs * 3 && downT < .3 && !swept && blocks) { swept = true; holdPiece(); downT = 0; return; }
      if (touchY > cs * 1.2 && downT > .25) soft = true;
    }
    if (I.clicked() && !swept) rot(1);   // a tap (lifted where it landed: the engine's clicked()) turns it
    if (!d) { downT = 0; swept = false; }
    return soft;
  }
  function update(dt) {
    const I = game.input; I.steer = 'drag';
    flash = Math.max(0, flash - dt); moodT -= dt; if (moodT < 0 && mood > 0) mood = 0;
    const tall = field && field.findIndex(v => v) < W * (H * .35);
    mascot.update(dt, { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: mood > 0 ? 'cheer' : mood < 0 ? 'down' : null, expr: mood > 0 ? 'smile' : tall ? 'wince' : null, run: 0 });
    if (mode === 'menu') { if (!pick.update(dt)) pickOnStart(pick); return; }
    if (mode === 'over') { over.t += dt; if (over.t > 1) { if (!after.update(dt)) pickOnStart(after); } return; }
    time += dt;
    if (clearing) { clearing.t += dt; if (clearing.t > .35) clearRows(); return; }
    if (popping) { popping.t += dt; if (popping.t > .4) { for (const [x, y] of popping.cells) field[y * W + x] = 0; popping = null; settle(); } return; }
    if (!cur) return;
    const soft = controls(dt); if (!cur || mode === 'over') return;
    const blocks = mode === 'blocks', rate = blocks ? FALL(level) : Math.max(.08, .7 - level * .05);
    fallT += dt * (soft ? 20 : 1);
    if (blocks) {
      while (fallT >= rate && cur) { fallT -= rate; if (!grounded()) { cur.y++; if (soft) score++; } }
      if (cur && grounded()) { lockT += dt; if (lockT >= .5) lock(); }
    } else {
      while (fallT >= rate && cur) { fallT -= rate; if (pfits(cur.x, cur.y + 1, cur.r)) cur.y++; }
      if (cur && !pfits(cur.x, cur.y + 1, cur.r)) { lockT += dt; if (lockT >= .35) plock(); }
    }
  }

  /* ---- 7. DRAWING: the stage, the field in screen pixels, the panels, the mascot ---- */
  const cell = () => mode === 'blocks' || (over && over.kind === 'blocks') ? Math.max(8, Math.floor((game.H - 24) / 20)) : Math.max(10, Math.floor((game.H - 28) / 12));
  const fieldBox = () => { const c = cell(), vis = W === 10 ? 20 : PH, w = W * c, h = vis * c; return { c, x: Math.round(game.W / 2 - w / 2), y: Math.round(game.H / 2 - h / 2) + 2, w, h, top: H - vis }; };
  const cellPx = (cx, cy) => { const b = fieldBox(); return [b.x + cx * b.c, b.y + (cy - b.top) * b.c]; };
  const toWorld = (sx, sy) => { const v = game.view; return [(sx + game.r.ix) / v.ax, (sy + game.r.iy) / v.bz]; };
  function block(g, x, y, c, color, a = 1) {   // a bevelled block: light top and left, dark bottom and right
    if (a < 1) { px.blend(g, a, 'normal', () => block(g, x, y, c, color)); return; }
    px.rect(g, x, y, c, c, E.shade(color, -.35)); px.rect(g, x + 1, y + 1, c - 2, c - 2, color);
    px.rect(g, x + 1, y + 1, c - 2, 1, E.shade(color, .35)); px.rect(g, x + 1, y + 1, 1, c - 2, E.shade(color, .2)); px.rect(g, x + 2, y + c - 2, c - 3, 1, E.shade(color, -.2));
  }
  function blob(g, x, y, c, k, t) {   // a pair's blob: a ball with a shine and two eyes
    const col = PCOL[k - 1], r = c / 2 - .5, cx = x + c / 2, cy = y + c / 2 + Math.sin(t) * .4;
    px.disc(g, cx, cy, r, E.shade(col, -.3)); px.disc(g, cx - .5, cy - .5, r - 1, col); px.disc(g, cx - r * .35, cy - r * .4, Math.max(1, r * .25), E.shade(col, .5));
    px.rect(g, cx - r * .4, cy - 1, 2, 3, '#ffffff'); px.rect(g, cx + r * .2, cy - 1, 2, 3, '#ffffff'); px.dot(g, cx - r * .4 + 1, cy, '#1a1a2a'); px.dot(g, cx + r * .2 + 1, cy, '#1a1a2a');
  }
  function drawCell(g, cx, cy, v, a = 1) {
    const b = fieldBox(); if (cy < b.top) return; const [x, y] = cellPx(cx, cy);
    if (W === 10) block(g, x, y, b.c, COLOR[v] || '#fff', a); else if (a >= 1) blob(g, x, y, b.c, v, game.time * 3 + cx + cy); else px.blend(g, a, 'normal', () => blob(g, x, y, b.c, v, 0));
  }
  function draw(r) {
    r.sky(['#0a0620', '#2a1050', '#5a1a6a']);
    const t = game.time;
    r.overlay(g => {   // the stage: light beams and a floor grid sweeping toward the field
      for (let i = 0; i < 7; i++) { const x = (i / 6) * r.W, a = .08 + .05 * Math.sin(t + i); px.blend(g, a, 'add', () => px.poly(g, [[x - 10, 0], [x + 10, 0], [r.W / 2 + (x - r.W / 2) * .2 + 6, r.H], [r.W / 2 + (x - r.W / 2) * .2 - 6, r.H]], i % 2 ? '#ff4ab0' : '#4ad8ff')); }
      for (let i = 0; i < 9; i++) { const y = r.H - Math.pow((i + (t * .6) % 1) / 9, 2) * r.H * .45; px.rect(g, 0, Math.round(y), r.W, 1, '#3a1a6a'); }
    });
    if (mode === 'menu') { menuScreen(r); return; }
    const kind = over ? over.kind : mode;
    r.overlay(g => {
      const b = fieldBox(), c = b.c;
      E.ui.box(g, b.x - 4, b.y - 4, b.w + 8, b.h + 8, { bg: ['#120a28', '#1e1240'], alpha: .92 });
      if (flash > 0) px.blend(g, flash * 2, 'add', () => px.rect(g, b.x, b.y, b.w, b.h, '#ffffff'));
      for (let x = 1; x < W; x++) px.rect(g, b.x + x * c, b.y, 1, b.h, '#22163e');
      for (let y = b.top; y < H; y++) for (let x = 0; x < W; x++) {
        const v = field[y * W + x]; if (!v) continue;
        const lit = clearing && clearing.rows.includes(y), pop = popping && popping.cells.some(([a, bb]) => a === x && bb === y);
        if (lit) px.rect(g, ...cellPx(x, y), c, c, Math.floor(clearing.t * 20) % 2 ? '#ffffff' : '#fff0a0');
        else if (pop) { if (Math.floor(popping.t * 16) % 2) drawCell(g, x, y, v); } else drawCell(g, x, y, v);
      }
      if (cur && kind === 'blocks') {
        let gy = cur.y; while (fits(cur.x, gy + 1, cur.r)) gy++;
        for (const [a, bb] of cellsOf(cur.k, cur.r)) { drawCell(g, cur.x + a, gy + bb, cur.k, .25); drawCell(g, cur.x + a, cur.y + bb, cur.k); }
      } else if (cur) { const s = SAT[cur.r]; drawCell(g, cur.x, cur.y, cur.a); drawCell(g, cur.x + s[0], cur.y + s[1], cur.b); }
      panels(g, b, kind);
    });
    // the mascot, beside the field (its world point from the screen point: the side view)
    const b = fieldBox(), side = b.x > 90, mx = side ? b.x - 44 : b.x + b.w - 20, my = side ? b.y + b.h : b.y + b.h + 40, [wx, wz] = toWorld(mx, my);
    if (side) r.actor(wx, 0, wz, (g, ox, oy) => mascot.draw(g, ox, oy, r.view));
    if (over) results(r);
  }
  function panels(g, b, kind) {
    const c = Math.max(6, Math.floor(b.c * .6)), rx = b.x + b.w + 10, lx = b.x - 10, mini = (k, x, y, sz) => { for (const [a, bb] of cellsOf(k, 0)) block(g, x + a * sz, y + bb * sz, sz, COLOR[k]); };
    E.font.text(g, 'NEXT', rx, b.y, '#c8b8ff', { outline: false, font: 'tiny' });
    if (kind === 'blocks') {
      queue.slice(0, 5).forEach((k, i) => mini(k, rx, b.y + 9 + i * c * 2.6, i ? Math.max(4, c - 2) : c));
      E.font.text(g, 'HOLD', lx, b.y, '#c8b8ff', { outline: false, font: 'tiny', align: 'right' });
      if (hold) mini(hold, lx - c * 4, b.y + 9, c);
    } else queue.slice(0, 2).forEach(([p, q], i) => { blob(g, rx, b.y + 10 + i * 30, c * 1.6, q, 0); blob(g, rx, b.y + 10 + i * 30 + c * 1.6, c * 1.6, p, 0); });
    const sy = b.y + b.h - 50, tx = rx;
    [['SCORE', score], [kind === 'blocks' ? 'LINES' : 'POPPED', lines], ['LEVEL', level]].forEach(([k, v], i) => {
      E.font.text(g, k, tx, sy + i * 17, '#a898e0', { outline: false, font: 'tiny' }); E.font.text(g, String(v), tx, sy + i * 17 + 7, '#ffffff', { outline: false });
    });
    if (kind === 'pairs' && chain > 1 && popping) E.font.title(g, chain + ' CHAIN!', b.x + b.w / 2, b.y + b.h / 3, { align: 'center', scale: 2, colors: ['#fff8d0', '#ffd040', '#ff7a2a'] });
  }
  function menuScreen(r) {
    r.overlay(g => {
      E.font.title(g, 'PUZZLE', r.W / 2, 34, { align: 'center', scale: 4, colors: ['#ffffff', '#ff8ad8', '#c04ae8'], depth: 3 });
      E.font.text(g, pick.i ? 'FALLING PAIRS: FOUR OF A COLOUR POP, CHAINS SCORE MORE' : 'FALLING BLOCKS: FILL A ROW TO CLEAR IT', r.W / 2, r.H - 22, '#e8d8ff', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, touch() ? 'DRAG MOVE   TAP ROTATE   FLICK DOWN DROP   FLICK UP HOLD' : 'ARROWS MOVE   UP / X ROTATE   SPACE DROP   C HOLD', r.W / 2, r.H - 11, '#9a8ac8', { align: 'center', outline: false, font: 'tiny' });
    });
    pick.y = 92; pick.draw(r);
  }
  function results(r) {
    r.overlay(g => {
      const k = Math.min(1, over.t / .6), y = Math.round(r.H / 2) - 50;
      g.fillStyle = 'rgba(6,2,16,' + (.7 * k).toFixed(2) + ')'; g.fillRect(0, 0, r.bw, r.bh); px.reset(g);
      E.font.title(g, 'GAME OVER', r.W / 2, y, { align: 'center', scale: 3, colors: ['#ffffff', '#ff8ad8', '#c04ae8'] });
      [['SCORE', over.score + (over.score >= over.best ? '  BEST!' : '')], [over.kind === 'blocks' ? 'LINES' : 'POPPED', over.lines], ['LEVEL', over.level], ['BEST', over.best]].forEach(([a, v], i) =>
        E.font.text(g, a + '  ' + v, r.W / 2, y + 34 + i * 10, i ? '#e8d8ff' : '#ffe070', { align: 'center', shadow: '#000', outline: false }));
      after.y = y + 80;
    });
    if (over.t > 1) after.draw(r);
  }

  /* ---- 8. THE BOT: for each piece, every rotation and column scored by the field it leaves (lines made, holes, height,
   * bumps: the classic weights), then the piece moved and dropped through the game's own rules ---- */
  function evaluate(f) {
    let holes = 0, agg = 0, bump = 0, prev = -1, lns = 0;
    for (let y = 0; y < H; y++) { let full = true; for (let x = 0; x < W; x++) if (!f[y * W + x]) full = false; if (full) lns++; }
    for (let x = 0; x < W; x++) { let top = H; for (let y = 0; y < H; y++) if (f[y * W + x]) { top = y; break; } const h = H - top; agg += h; if (prev >= 0) bump += Math.abs(h - prev); prev = h; for (let y = top + 1; y < H; y++) if (!f[y * W + x]) holes++; }
    return .76 * lns - .51 * agg - .36 * holes - .18 * bump;
  }
  function bestMove() {
    let best = null;
    for (let r = 0; r < 4; r++) for (let x = -2; x < W; x++) {
      if (!fits(x, cur.y, r)) continue; let y = cur.y; while (fits(x, y + 1, r)) y++;
      const f = field.slice(); for (const [a, b] of cellsOf(cur.k, r)) if (y + b >= 0) f[(y + b) * W + x + a] = cur.k;
      const s = evaluate(f); if (!best || s > best.s) best = { s, r, x };
    }
    return best;
  }
  function bot(n = 60, seedNo = 3) {
    const was = Math.random; Math.random = E.rng(seedNo);
    try {
      game.go('puzzle', null, { fade: 0 }); game.advance(1 / 120); begin('blocks');
      let pieces = 0;
      while (pieces < n && mode === 'blocks') {
        game.advance(1 / 60); if (!cur) continue;
        const m = bestMove(); if (!m) break;
        for (let i = 0; i < 4 && cur.r !== m.r; i++) if (!rotate(1)) break;
        for (let i = 0; i < 12 && cur.x !== m.x; i++) if (!shift(Math.sign(m.x - cur.x))) break;
        hardDrop(); pieces++;
      }
      game.advance(1);
      return { pieces, lines, score, level, over: mode === 'over', errors: game.errors.length };
    } finally { Math.random = was; }
  }

  return { view: 'side', views: ['side'], input: KEYS, res: 'ps1', pausable: true, touch: [], propSize: 1, camera: { zoom: false },
    enter() { mode = 'menu'; over = null; field = null; pick.i = 0; game.follow(null); game.cam.bounds = null; game.focus(0, 0, 0); game.cam.snap = true; A.music('title'); },
    exit() { game.input.steer = 'stick'; },
    back() { if (mode === 'menu' || mode === 'over') { game.go('title'); return true; } return false; },
    update, draw, bot,
    state: () => ({ mode, field, cur, score, lines, level }),   // for tests
    /** the proof: a game of blocks played by keys (moves, turns, drops, a hold); a hash of the field and the score */
    run: (n = 600) => proof('puzzle', n, (i, k) => { if (i === 2) begin('blocks'); if (i % 40 === 10) k.tap(i % 80 ? 'left' : 'right'); if (i % 50 === 20) k.tap('up'); if (i % 60 === 30) k.tap('drop'); if (i === 200) k.tap('hold'); },
      () => [mode, field, score, lines, level, hold, queue]) };
})();
scenes.puzzle = PUZZLE;
