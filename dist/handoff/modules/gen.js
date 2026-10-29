/*!
my-3D2dge module GEN v0.81.6: generated maps: rooms and corridors, BSP, caves, mazes and scatter, from a seed
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

Every generator takes a size in cells and { seed } and gives { rows, rooms, start, end, marks }: ASCII rows ('#' wall,
'.' floor) a TileMap reads (put your own characters in with E.gen.mark), the rooms it made ({ x, y, w, h }), a start and
an end cell far apart (stairs), and the cells it marked. The same seed gives the same rows, always (E.rng).
- E.gen.rooms(w, h, { seed, rooms: 9, min: 4, max: 9 }): rooms placed apart, joined in order by bent corridors (Rogue).
- E.gen.bsp(w, h, { seed, min: 7 }): space split in two and two again, a room in each part, sisters joined (dungeons
  with no wasted space).
- E.gen.cave(w, h, { seed, fill: .45, steps: 4 }): cellular automata, then only the biggest open region kept, so all of
  it is connected (caves, islands: '#' is rock or water).
- E.gen.maze(w, h, { seed, algo: 'backtrack' | 'prim', braid: 0 }): a perfect maze on odd cells (backtrack: long winding
  halls; prim: short branches); braid 0..1 knocks out dead ends into loops (Pac-Man's).
- E.gen.scatter(w, h, { seed, r: 3, k: 30, ok(x, y) }): Poisson disc points [x, y] at least r apart (trees, loot,
  enemies), where ok says they may go.
- E.gen.mark(level, ch, n, { seed, near, far }): put character ch on n floor cells (spawns: 'g' goblins, '!' potions),
  away from the start; E.gen.open(rows): every floor cell as [x, y].

```js gen
const E = My3D2dge, a = E.gen.rooms(40, 24, { seed: 7 }), b = E.gen.rooms(40, 24, { seed: 7 });
if (a.rows.join() !== b.rows.join() || a.rows.length !== 24 || a.rooms.length < 4) throw new Error('rooms');
const c = E.gen.cave(30, 20, { seed: 3 }); E.gen.mark(c, 'g', 5, { seed: 1 });
const map = new E.TileMap({ rows: c.rows, legend: { '#': 1, g: 'goblin' }, types: { 1: { h: 24 } } });
if (map.findAll('goblin').length !== 5) throw new Error('marks');
```
Rules: rows are w characters by h rows, walled all round; start and end are floor cells; generators never call
Math.random.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module GEN: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * GEN  rooms, BSP, caves, mazes and scatter: ASCII rows and marks from a seed
 * ========================================================================== */
const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
// a level: a grid of characters, all wall
const blank = (w, h, ch = '#') => Array.from({ length: h }, () => Array(w).fill(ch));
// distances from a cell over the floor (BFS), -1 where it can't reach
const bfs = (G, sx, sy) => {
  const h = G.length, w = G[0].length, d = Array.from({ length: h }, () => Array(w).fill(-1)), q = [[sx, sy]]; d[sy][sx] = 0;
  for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of D4) { const a = x + dx, b = y + dy; if (b >= 0 && b < h && a >= 0 && a < w && G[b][a] !== '#' && d[b][a] < 0) { d[b][a] = d[y][x] + 1; q.push([a, b]); } } }
  return d;
};
// the finished level: rows, and a start and an end as far apart as the floor allows (from the first room's centre, or the
// first floor cell)
const finish = (G, rooms, from) => {
  const h = G.length, w = G[0].length;
  for (let x = 0; x < w; x++) { G[0][x] = G[h - 1][x] = '#'; } for (let y = 0; y < h; y++) { G[y][0] = G[y][w - 1] = '#'; }
  let s = from;
  if (!s || G[s[1]][s[0]] === '#') { s = null; for (let y = 0; y < h && !s; y++) for (let x = 0; x < w && !s; x++) if (G[y][x] !== '#') s = [x, y]; }
  let end = s;
  if (s) { const d = bfs(G, s[0], s[1]); let best = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[y][x] > best) { best = d[y][x]; end = [x, y]; } }
  return { rows: G.map(r => r.join('')), rooms, start: s || [1, 1], end: end || [1, 1], marks: [] };
};
const dig = (G, x, y) => { if (y > 0 && y < G.length - 1 && x > 0 && x < G[0].length - 1) G[y][x] = '.'; };
// an L-shaped corridor from a to b, its bend chosen by R
const corridor = (G, a, b, R) => {
  const [x0, y0] = a, [x1, y1] = b, hFirst = R() < .5;
  const run = (xa, ya, xb, yb) => { for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) dig(G, x, ya); for (let y = Math.min(ya, yb); y <= Math.max(ya, yb); y++) dig(G, xb, y); };
  if (hFirst) run(x0, y0, x1, y1); else { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) dig(G, x0, y); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) dig(G, x, y1); }
};
const centre = r => [Math.floor(r.x + r.w / 2), Math.floor(r.y + r.h / 2)];
const carve = (G, r) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) dig(G, x, y); };

/** the map generators (each from a seed: the same rows every time) */
const gen = {
  /** rooms placed apart and joined in order by bent corridors: { rows, rooms, start, end, marks }. o: { seed, rooms: 9,
   *  min: 4, max: 9 (a room's side, cells) } */
  rooms(w, h, o = {}) {
    const R = E.rng(o.seed === undefined ? 1 : o.seed), G = blank(w, h), rooms = [], want = o.rooms || 9, mn = o.min || 4, mx = o.max || 9;
    for (let tries = 0; tries < want * 30 && rooms.length < want; tries++) {
      const rw = mn + Math.floor(R() * (mx - mn + 1)), rh = mn + Math.floor(R() * (mx - mn + 1)) - 1, x = 1 + Math.floor(R() * Math.max(1, w - rw - 2)), y = 1 + Math.floor(R() * Math.max(1, h - rh - 2));
      const r = { x, y, w: Math.min(rw, w - 2 - x), h: Math.min(rh, h - 2 - y) };
      if (r.w < 2 || r.h < 2 || rooms.some(q => r.x <= q.x + q.w && q.x <= r.x + r.w && r.y <= q.y + q.h && q.y <= r.y + r.h)) continue;
      rooms.push(r);
    }
    rooms.sort((a, b) => a.x - b.x || a.y - b.y);
    for (const r of rooms) carve(G, r);
    for (let i = 1; i < rooms.length; i++) corridor(G, centre(rooms[i - 1]), centre(rooms[i]), R);
    if (rooms.length > 3) corridor(G, centre(rooms[0]), centre(rooms[Math.floor(rooms.length / 2)]), R);   // a loop
    return finish(G, rooms, rooms.length ? centre(rooms[0]) : null);
  },
  /** binary space partition: halves split again down to o.min (7) cells, a room in each leaf, sisters joined */
  bsp(w, h, o = {}) {
    const R = E.rng(o.seed === undefined ? 1 : o.seed), G = blank(w, h), mn = o.min || 7, rooms = [];
    const split = (x, y, sw, sh) => {
      const canH = sh >= mn * 2, canV = sw >= mn * 2;
      if (!canH && !canV) {
        const rw = Math.max(3, Math.floor(sw * (.55 + R() * .35))) - 1, rh = Math.max(3, Math.floor(sh * (.55 + R() * .35))) - 1;
        const r = { x: x + 1 + Math.floor(R() * Math.max(1, sw - rw - 1)), y: y + 1 + Math.floor(R() * Math.max(1, sh - rh - 1)), w: rw, h: rh };
        carve(G, r); rooms.push(r); return r;
      }
      const vert = canV && (!canH || (sw > sh ? R() < .8 : R() < .2));
      const at = Math.floor((vert ? sw : sh) * (.4 + R() * .2));
      const a = vert ? split(x, y, at, sh) : split(x, y, sw, at), b = vert ? split(x + at, y, sw - at, sh) : split(x, y + at, sw, sh - at);
      corridor(G, centre(a), centre(b), R);
      return R() < .5 ? a : b;
    };
    split(0, 0, w, h);
    return finish(G, rooms, rooms.length ? centre(rooms[0]) : null);
  },
  /** caves by cellular automata: o.fill (.45) of the cells rock, o.steps (4) rounds of the 4-5 rule, then the biggest
   *  open region alone */
  cave(w, h, o = {}) {
    const R = E.rng(o.seed === undefined ? 1 : o.seed), fill = o.fill === undefined ? .45 : o.fill;
    let G = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => x === 0 || y === 0 || x === w - 1 || y === h - 1 || R() < fill ? '#' : '.'));
    for (let s = 0; s < (o.steps === undefined ? 4 : o.steps); s++) {
      G = G.map((row, y) => row.map((c, x) => { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const r = G[y + dy]; if (!r || r[x + dx] === undefined || r[x + dx] === '#') n++; } return n >= 5 ? '#' : '.'; }));
    }
    // keep the biggest region
    const seen = Array.from({ length: h }, () => Array(w).fill(false)); let best = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (G[y][x] === '#' || seen[y][x]) continue;
      const reg = [[x, y]]; seen[y][x] = true;
      for (let i = 0; i < reg.length; i++) for (const [dx, dy] of D4) { const a = reg[i][0] + dx, b = reg[i][1] + dy; if (G[b] && G[b][a] === '.' && !seen[b][a]) { seen[b][a] = true; reg.push([a, b]); } }
      if (reg.length > best.length) best = reg;
    }
    const keep = new Set(best.map(([x, y]) => y * w + x));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!keep.has(y * w + x)) G[y][x] = '#';
    return finish(G, [], best[0] || null);
  },
  /** a maze on the odd cells: o.algo 'backtrack' (long halls) or 'prim' (short branches); o.braid 0..1 opens that share of
   *  dead ends into loops */
  maze(w, h, o = {}) {
    const R = E.rng(o.seed === undefined ? 1 : o.seed), G = blank(w, h), cells = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && x % 2 && y % 2;
    const D = [[2, 0], [0, 2], [-2, 0], [0, -2]], shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    G[1][1] = '.';
    if (o.algo === 'prim') {
      const front = []; const add = (x, y) => { for (const [dx, dy] of D) if (cells(x + dx, y + dy) && G[y + dy][x + dx] === '#') front.push([x + dx, y + dy, x, y]); };
      add(1, 1);
      while (front.length) { const [x, y, fx, fy] = front.splice(Math.floor(R() * front.length), 1)[0]; if (G[y][x] !== '#') continue; G[y][x] = '.'; G[(y + fy) / 2][(x + fx) / 2] = '.'; add(x, y); }
    } else {
      const stack = [[1, 1]];
      while (stack.length) {
        const [x, y] = stack[stack.length - 1], next = shuffle(D.slice()).find(([dx, dy]) => cells(x + dx, y + dy) && G[y + dy][x + dx] === '#');
        if (!next) { stack.pop(); continue; }
        G[y + next[1] / 2][x + next[0] / 2] = '.'; G[y + next[1]][x + next[0]] = '.'; stack.push([x + next[0], y + next[1]]);
      }
    }
    if (o.braid) for (let y = 1; y < h - 1; y += 2) for (let x = 1; x < w - 1; x += 2) {
      if (G[y][x] === '#') continue; const open = D4.filter(([dx, dy]) => G[y + dy][x + dx] !== '#');
      if (open.length !== 1 || R() >= o.braid) continue;
      const walls = shuffle(D4.filter(([dx, dy]) => G[y + dy][x + dx] === '#' && cells(x + dx * 2, y + dy * 2))); if (walls[0]) G[y + walls[0][1]][x + walls[0][0]] = '.';
    }
    return finish(G, [], [1, 1]);
  },
  /** Poisson disc points at least o.r (3) apart within w x h, o.k (30) tries each, where o.ok(x, y) allows (Bridson's):
   *  [[x, y], ...] in cells, not whole numbers */
  scatter(w, h, o = {}) {
    const R = E.rng(o.seed === undefined ? 1 : o.seed), r = o.r || 3, k = o.k || 30, cs = r / Math.SQRT2, gw = Math.ceil(w / cs), gh = Math.ceil(h / cs), grid = new Array(gw * gh).fill(-1), pts = [], active = [];
    const ok = (x, y) => x >= 0 && y >= 0 && x < w && y < h && (!o.ok || o.ok(x, y));
    const far = (x, y) => { const gx = Math.floor(x / cs), gy = Math.floor(y / cs); for (let j = Math.max(0, gy - 2); j <= Math.min(gh - 1, gy + 2); j++) for (let i = Math.max(0, gx - 2); i <= Math.min(gw - 1, gx + 2); i++) { const p = pts[grid[j * gw + i]]; if (p && (p[0] - x) ** 2 + (p[1] - y) ** 2 < r * r) return false; } return true; };
    const put = (x, y) => { pts.push([x, y]); active.push(pts.length - 1); grid[Math.floor(y / cs) * gw + Math.floor(x / cs)] = pts.length - 1; };
    for (let t = 0; t < 50 && !pts.length; t++) { const x = R() * w, y = R() * h; if (ok(x, y)) put(x, y); }
    while (active.length) {
      const i = Math.floor(R() * active.length), [px, py] = pts[active[i]]; let found = false;
      for (let t = 0; t < k; t++) { const a = R() * Math.PI * 2, d = r * (1 + R()), x = px + Math.cos(a) * d, y = py + Math.sin(a) * d; if (ok(x, y) && far(x, y)) { put(x, y); found = true; break; } }
      if (!found) active.splice(i, 1);
    }
    return pts;
  },
  /** put character ch on n floor cells of a level (from a generator), at least o.far (4) steps from its start and o.near
   *  steps from each other (0), from o.seed; returns the cells and adds them to level.marks */
  mark(level, ch, n, o = {}) {
    const R = E.rng(o.seed === undefined ? 1 : o.seed), G = level.rows.map(r => r.split('')), d = bfs(G, level.start[0], level.start[1]), far = o.far === undefined ? 4 : o.far, near = o.near || 0;
    const free = []; for (let y = 0; y < G.length; y++) for (let x = 0; x < G[0].length; x++) if (G[y][x] === '.' && d[y][x] >= far && !(x === level.end[0] && y === level.end[1])) free.push([x, y]);
    const out = [];
    while (out.length < n && free.length) {
      const [x, y] = free.splice(Math.floor(R() * free.length), 1)[0];
      if (near && out.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < near)) continue;
      G[y][x] = ch; out.push([x, y]); level.marks.push({ ch, x, y });
    }
    level.rows = G.map(r => r.join('')); return out;
  },
  /** every floor cell ('.') of rows, as [x, y] */
  open(rows) { const out = []; rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '.') out.push([x, y]); }); return out; }
};
E.gen = gen;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
