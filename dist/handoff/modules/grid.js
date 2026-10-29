/*!
my-3D2dge module GRID v0.82.0: square and hex grids: paths, ranges, lines, fields of view, fog, groups, movers and turns
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

For roguelikes, tactics, puzzles, mazes, board games and strategy's fog (what Godot calls AStarGrid2D). A cell is
[cx, cy]; a grid knows its size, which cells can be walked and what entering one costs, and nothing else: the game
keeps its units.
- new E.Grid(w, h, { hex: false | 'pointy' | 'flat', walkable(cx, cy), cost(cx, cy) (1), height(cx, cy) (0),
  opaque(cx, cy) (not walkable), diagonal: false }); E.Grid.from(map, { tops }) reads a TileMap (its walkable cells;
  tops: true stands on its walls' tops at their heights, for tactics). Hex grids are offset rows ('pointy') or columns
  ('flat'), odd ones shifted.
- grid.inside(c), grid.walk(c), grid.neighbours(c) (4, 8 with diagonal, or 6), grid.dist(a, b) (Manhattan; Chebyshev
  with diagonal; hex steps); grid.center(c, T) and grid.toCell(x, y, T): world points (hex: T across).
- grid.path(a, b, { blocked(cx, cy), climb, drop, ends }) -> [a, ..., b] or [] (A*, ties broken the same way every
  time; ends: true reaches b even when b can't be walked: an attack's target). grid.reach(a, budget, { blocked, climb,
  drop, pass }) -> { cells: [[cx, cy, cost]], has(c), cost(c), path(c) } (Dijkstra: a move range; climb and drop limit
  the height a step may rise and fall: a unit's jump, E.HEIGHTS.level (8) a level; pass(cx, cy): cells crossed but not
  stopped on, its allies).
- grid.line(a, b) (Bresenham, hex: steps), grid.sees(a, b) (no opaque cell between), grid.fov(c, radius) -> a Set of
  'cx,cy' (symmetric shadowcasting: what a sees sees it; hex: lines). grid.flood(c, same(cx, cy)) and grid.groups(key(cx,
  cy) -> a value or null) -> [[cells]] (equal neighbours: matches, chains, regions).
- Tactics: grid.shape(c, kind, n, dir) -> cells ('cross', 'diamond', 'square', 'ring', 'line', 'cone': areas of
  effect); grid.face(a, b) (the four-way facing from a toward b); grid.side(at, facing, from) -> 'front' | 'side' |
  'back' (a blow from behind); grid.threat(units, { blocked }) -> { cells: [[cx, cy, n]], count(c), by(c) } (what units
  { cx, cy, move, range: [min, max], climb, drop } can strike next turn: an AI's safe cells). Over a TileMap's tops:
  map.pick(sx, sy) the cell under the pointer, map.arcClear(from, to, apex) a bow's arc.
- E.Fog(grid): fog.update([{ cx, cy, r }]) (each viewer's field of view: visible now; seen stays), fog.visible(c),
  fog.seen(c), fog.draw(r, T, o) (unseen black, seen dimmed: over the walls too, before your HUD); E.tint(r, cells, color,
  alpha, T, height): tints on cells' tops (ranges, paths).
- E.GridMover({ cx, cy, speed }) moves a cell at a time: mover.update(dt, grid, [dx, dy], { blocked, push(cx, cy, dx, dy)
  }): a turn asked early is kept and taken at the first opening (Pac-Man), push moves what is in the way (Sokoban);
  x, y: its smooth position in cells; moving, dir, arrived (true the step it reaches a cell).
- E.Turns(actors, { mode }) says who acts: 'speed' (energy: each actor's speed, 100 a turn; a bat of 200 acts twice:
  roguelikes), 'ct' (charge time, the order ahead: Final Fantasy Tactics), 'phase' (every one of a side, then the next
  side: Fire Emblem; actor.side), 'atb' (gauges filled on game time: Final Fantasy). turns.next() -> the actor to act
  (speed, ct, phase); turns.order(n): who acts next, n of them; turns.update(dt) and turns.ready() (atb: those full),
  turns.done(actor, cost) (after it acted: ct and atb); add(a), remove(a).

```js grid
const E = My3D2dge, g = new E.Grid(8, 6, { walkable: (x, y) => !(x === 3 && y < 4) });
const p = g.path([0, 0], [7, 0]); if (p.length !== 16 || p[0].join() !== '0,0') throw new Error('path ' + p.length);
const r = g.reach([0, 0], 3); if (!r.has([0, 3]) || r.has([3, 4]) || r.cost([2, 1]) !== 3) throw new Error('reach');
const fov = g.fov([1, 1], 6); if (fov.has('6,1') || !fov.has('3,1')) throw new Error('fov');
const t = new E.Turns([{ id: 'hero', speed: 100 }, { id: 'bat', speed: 200 }], { mode: 'speed' });
if ([1, 2, 3].map(() => t.next().id).join() !== 'bat,hero,bat') throw new Error('turns');
if (g.shape([5, 2], 'cross', 1).length !== 5 || g.side([5, 2], [1, 0], [4, 2]) !== 'back') throw new Error('tactics');
```
Rules: cells are whole numbers; paths and reaches never cross a cell blocked(cx, cy) says is taken (other units); the
same inputs give the same paths, fields and turns. Draw the fog after the world and before your HUD.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module GRID: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * GRID  square and hex grids: neighbours, distances, A*, Dijkstra's reach, lines, sight and fields of view, groups
 * ========================================================================== */
const SQ4 = [[1, 0], [0, 1], [-1, 0], [0, -1]], SQ8 = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
// a binary heap of [priority, tie, seq, value]: the lowest first, ties the same way every time
class Heap {
  constructor() { this.a = []; this.n = 0; }
  _lt(i, j) { const p = this.a[i], q = this.a[j]; return p[0] !== q[0] ? p[0] < q[0] : p[1] !== q[1] ? p[1] < q[1] : p[2] < q[2]; }
  push(pri, tie, v) { const a = this.a; a.push([pri, tie, this.n++, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!this._lt(i, p)) break; [a[i], a[p]] = [a[p], a[i]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && this._lt(l, m)) m = l; if (r < a.length && this._lt(r, m)) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } } return top[3]; }
  get size() { return this.a.length; }
}
class Grid {
  /**
   * new E.Grid(w, h, { hex: false | 'pointy' | 'flat', walkable(cx, cy), cost(cx, cy), height(cx, cy), opaque(cx, cy),
   * diagonal }): w x h cells, every one walkable at cost 1 and height 0 unless the functions say otherwise
   */
  constructor(w, h, o = {}) {
    /** w, h: its size in cells; hex: false, 'pointy' (offset rows) or 'flat' (offset columns); diagonal: square moves
     *  of 8 directions */
    this.w = w; this.h = h; this.hex = o.hex || false; this.diagonal = !!o.diagonal && !this.hex;
    this._walk = o.walkable || null; this._cost = o.cost || null; this._height = o.height || null; this._opaque = o.opaque || null;
  }
  /** a grid from a TileMap: its walkable cells (o.tops: true stands on the walls' tops at their heights, for tactics) */
  static from(map, o = {}) {
    return new Grid(map.w, map.h, Object.assign({
      walkable: o.tops ? (x, y) => !map.blocked[y * map.w + x] : (x, y) => map.walkable(x, y),
      height: o.tops ? (x, y) => map.height(x, y) : null, opaque: (x, y) => map.solidCell(x, y) && !o.tops
    }, o));
  }
  /** is [cx, cy] on the grid? */
  inside(c) { return c[0] >= 0 && c[1] >= 0 && c[0] < this.w && c[1] < this.h; }
  /** can [cx, cy] be walked (on the grid, and walkable)? */
  walk(c) { return this.inside(c) && (!this._walk || !!this._walk(c[0], c[1])); }
  /** what entering [cx, cy] costs (1 by default) */
  cost(c) { return this._cost ? this._cost(c[0], c[1]) : 1; }
  /** a cell's height (0 by default; E.Grid.from(map, { tops: true }): the wall's top) */
  height(c) { return this._height ? this._height(c[0], c[1]) || 0 : 0; }
  /** does [cx, cy] block sight? (not walkable, by default) */
  opaque(c) { return !this.inside(c) || (this._opaque ? !!this._opaque(c[0], c[1]) : !this.walk(c)); }
  /** the cells next to c on the grid: 4, 8 (diagonal) or 6 (hex), walkable or not */
  neighbours(c) {
    const [x, y] = c, out = [];
    let D = this.diagonal ? SQ8 : SQ4;
    if (this.hex === 'pointy') D = y & 1 ? [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]] : [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]];
    else if (this.hex) D = x & 1 ? [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]] : [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]];
    for (const [dx, dy] of D) { const n = [x + dx, y + dy]; if (this.inside(n)) out.push(n); }
    return out;
  }
  // offset cell -> cube coordinates (hex)
  _cube(c) { const [x, y] = c; if (this.hex === 'pointy') { const q = x - (y - (y & 1)) / 2; return [q, y, -q - y]; } const z = y - (x - (x & 1)) / 2; return [x, z, -x - z]; }
  _off(q, r) { return this.hex === 'pointy' ? [q + (r - (r & 1)) / 2, r] : [q, r + (q - (q & 1)) / 2]; }
  /** steps from a to b: Manhattan, Chebyshev (diagonal) or hex steps */
  dist(a, b) {
    if (this.hex) { const p = this._cube(a), q = this._cube(b); return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); }
    const dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]); return this.diagonal ? Math.max(dx, dy) : dx + dy;
  }
  /** a cell's centre in world units, T a cell across (square: T wide; hex: T across its flats) */
  center(c, T = 16) {
    const [x, y] = c;
    if (this.hex === 'pointy') return [(x + .5 + (y & 1) * .5) * T, (y * .866 + .577) * T];
    if (this.hex) return [(x * .866 + .577) * T, (y + .5 + (x & 1) * .5) * T];
    return [(x + .5) * T, (y + .5) * T];
  }
  /** the cell under world point (x, y), T a cell across (center's inverse) */
  toCell(x, y, T = 16) {
    if (!this.hex) return [Math.floor(x / T), Math.floor(y / T)];
    let best = null, bd = Infinity; const guess = this.hex === 'pointy' ? [Math.floor(x / T), Math.floor(y / (.866 * T))] : [Math.floor(x / (.866 * T)), Math.floor(y / T)];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = [guess[0] + dx, guess[1] + dy], [px, py] = this.center(c, T), d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = c; } }
    return best;
  }
  // may a step go from a to b? (walkable, not taken, within climb and drop)
  _step(a, b, o, end) {
    if (end && o.ends) return this.inside(b);
    if (!this.walk(b) || (o.blocked && o.blocked(b[0], b[1]))) return false;
    if (o.climb !== undefined || o.drop !== undefined) { const d = this.height(b) - this.height(a); if (d > (o.climb === undefined ? Infinity : o.climb) || -d > (o.drop === undefined ? Infinity : o.drop)) return false; }
    if (this.diagonal && a[0] !== b[0] && a[1] !== b[1] && (!this.walk([a[0], b[1]]) || !this.walk([b[0], a[1]]))) return false;   // (no cutting a wall's corner)
    return true;
  }
  /** the cheapest way from a to b, [a, ..., b], or [] (A*; ties broken the same way every time). o: { blocked(cx, cy):
   *  cells taken (other units), climb, drop (the most a step rises and falls), ends: b may be unwalkable (a target),
   *  max: give up past this cost } */
  path(a, b, o = {}) {
    if (!this.inside(a) || !this.inside(b)) return [];
    const W = this.w, key = c => c[1] * W + c[0], goal = key(b), g = new Map([[key(a), 0]]), from = new Map(), open = new Heap();
    open.push(this.dist(a, b), this.dist(a, b), a);
    while (open.size) {
      const c = open.pop(), k = key(c), gc = g.get(k);
      if (k === goal) { const out = [c]; let at = k; while (from.has(at)) { at = from.get(at); out.push([at % W, Math.floor(at / W)]); } return out.reverse(); }
      for (const n of this.neighbours(c)) {
        if (!this._step(c, n, o, key(n) === goal)) continue;
        const nk = key(n), ng = gc + this.cost(n);
        if (o.max !== undefined && ng > o.max) continue;
        if (g.has(nk) && g.get(nk) <= ng) continue;
        g.set(nk, ng); from.set(nk, k); const h = this.dist(n, b); open.push(ng + h, h, n);
      }
    }
    return [];
  }
  /** every cell within budget of a: { cells: [[cx, cy, cost]], has(c), cost(c) (or Infinity), path(c) } (Dijkstra: move
   *  ranges). o: { blocked, climb, drop } as path's, and pass(cx, cy): cells it may cross but not stop on (allies) */
  reach(a, budget, o = {}) {
    const W = this.w, key = c => c[1] * W + c[0], cost = new Map([[key(a), 0]]), from = new Map(), open = new Heap();
    open.push(0, 0, a);
    while (open.size) {
      const c = open.pop(), k = key(c), gc = cost.get(k);
      for (const n of this.neighbours(c)) {
        if (!this._step(c, n, o)) continue;
        const nk = key(n), ng = gc + this.cost(n);
        if (ng > budget || (cost.has(nk) && cost.get(nk) <= ng)) continue;
        cost.set(nk, ng); from.set(nk, k); open.push(ng, 0, n);
      }
    }
    if (o.pass) for (const k of [...cost.keys()]) if (k !== key(a) && o.pass(k % W, Math.floor(k / W))) cost.delete(k);   // (crossed, so their paths stay)
    const cells = [...cost].map(([k, v]) => [k % W, Math.floor(k / W), v]).sort((p, q) => p[2] - q[2] || p[1] - q[1] || p[0] - q[0]);
    return { cells, has: c => cost.has(key(c)), cost: c => cost.has(key(c)) ? cost.get(key(c)) : Infinity,
      path: c => { if (!cost.has(key(c))) return []; const out = [c]; let at = key(c); while (from.has(at)) { at = from.get(at); out.push([at % W, Math.floor(at / W)]); } return out.reverse(); } };
  }
  /** the cells on a line from a to b, both ends included (Bresenham; hex: one step at a time) */
  line(a, b) {
    if (this.hex) { const n = this.dist(a, b), p = this._cube(a), q = this._cube(b), out = []; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0, f = [0, 1, 2].map(j => p[j] + (q[j] - p[j]) * t + 1e-6 * (j + 1)); let r = f.map(Math.round); const d = r.map((v, j) => Math.abs(v - f[j])); if (d[0] > d[1] && d[0] > d[2]) r[0] = -r[1] - r[2]; else if (d[1] > d[2]) r[1] = -r[0] - r[2]; out.push(this._off(r[0], r[1])); } return out; }
    let [x0, y0] = a; const [x1, y1] = b, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, out = [];
    let e = dx + dy;
    for (;;) { out.push([x0, y0]); if (x0 === x1 && y0 === y1) return out; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  /** can a see b: no opaque cell on the line between them (the ends themselves may be) */
  sees(a, b) { const L = this.line(a, b); for (let i = 1; i < L.length - 1; i++) if (this.opaque(L[i])) return false; return true; }
  /** what c sees within radius: a Set of 'cx,cy' (symmetric shadowcasting, Albert Ford's: a sees b exactly when b sees a;
   *  walls at the edge of what it sees are in it; hex grids: a line to each cell) */
  fov(c, radius = 8) {
    const out = new Set([c[0] + ',' + c[1]]), R2 = (radius + .5) ** 2;
    const mark = (x, y) => { if ((x - c[0]) ** 2 + (y - c[1]) ** 2 <= R2 && this.inside([x, y])) out.add(x + ',' + y); };
    if (this.hex) { for (let y = c[1] - radius; y <= c[1] + radius; y++) for (let x = c[0] - radius; x <= c[0] + radius; x++) if (this.inside([x, y]) && this.dist(c, [x, y]) <= radius && this.sees(c, [x, y])) out.add(x + ',' + y); return out; }
    for (let q = 0; q < 4; q++) {
      const tr = (row, col) => q === 0 ? [c[0] + col, c[1] - row] : q === 1 ? [c[0] + row, c[1] + col] : q === 2 ? [c[0] + col, c[1] + row] : [c[0] - row, c[1] + col];
      const wall = (row, col) => { const [x, y] = tr(row, col); return this.opaque([x, y]); };
      const scan = (depth, start, end) => {
        if (depth > radius) return;
        let prev = null; const lo = Math.floor(depth * start + .5), hi = Math.ceil(depth * end - .5);
        for (let col = lo; col <= hi; col++) {
          const w = wall(depth, col);
          if (w || (col >= depth * start - 1e-9 && col <= depth * end + 1e-9)) mark(...tr(depth, col));
          if (prev === true && !w) start = (2 * col - 1) / (2 * depth);
          if (prev === false && w) scan(depth + 1, start, (2 * col - 1) / (2 * depth));
          prev = w;
        }
        if (prev === false) scan(depth + 1, start, end);
      };
      scan(1, -1, 1);
    }
    return out;
  }
  /** the cells joined to c through neighbours for which same(cx, cy) is true (c's too): a flood fill */
  flood(c, same) {
    const W = this.w, seen = new Set([c[1] * W + c[0]]), out = [c], stack = [c];
    if (!same(c[0], c[1])) return [];
    while (stack.length) for (const n of this.neighbours(stack.pop())) { const k = n[1] * W + n[0]; if (seen.has(k) || !same(n[0], n[1])) continue; seen.add(k); out.push(n); stack.push(n); }
    return out;
  }
  /** the groups of neighbouring cells with the same key(cx, cy) (null or undefined: none): matches, Puyo chains,
   *  regions. [[cells]], biggest first */
  groups(key) {
    const done = new Uint8Array(this.w * this.h), out = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (done[y * this.w + x]) continue; const v = key(x, y); if (v === null || v === undefined) continue;
      const g = this.flood([x, y], (a, b) => key(a, b) === v); for (const [a, b] of g) done[b * this.w + a] = 1; out.push(g);
    }
    return out.sort((p, q) => q.length - p.length);
  }
  /** the cells a shape of effect covers round c (square grids; on the grid only): 'cross' (n each way), 'diamond' (n steps:
   *  dist), 'square' (n each way, corners too), 'ring' (exactly n steps), 'line' (n cells from c along dir [dx, dy], not
   *  c), 'cone' (n rows along dir, each a cell wider each side) */
  shape(c, kind = 'diamond', n = 1, dir = [1, 0]) {
    const [x, y] = c, [dx, dy] = dir, out = [], add = (a, b) => { if (this.inside([a, b])) out.push([a, b]); };
    if (kind === 'line') for (let i = 1; i <= n; i++) add(x + dx * i, y + dy * i);
    else if (kind === 'cone') for (let i = 1; i <= n; i++) for (let j = -(i - 1); j <= i - 1; j++) add(x + dx * i - dy * j, y + dy * i + dx * j);
    else for (let b = y - n; b <= y + n; b++) for (let a = x - n; a <= x + n; a++) {
      const d = this.dist(c, [a, b]);
      if (kind === 'square' || (kind === 'cross' && (a === x || b === y)) || (kind === 'diamond' && d <= n) || (kind === 'ring' && d === n)) add(a, b);
    }
    return out;
  }
  /** the way from a looks to b, one of four [dx, dy] (the longer axis; x when they tie): a unit turning to its target */
  face(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; return Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy)]; }
  /** where a blow from cell from lands on a unit at cell at facing [dx, dy]: 'front', 'side' or 'back' (within 45
   *  degrees of its facing, of behind it, or between: a diagonal is a side) */
  side(at, facing, from) {
    const dx = from[0] - at[0], dy = from[1] - at[1], l = Math.hypot(dx, dy) * Math.hypot(facing[0], facing[1]); if (!l) return 'front';
    const c = (dx * facing[0] + dy * facing[1]) / l; return c > .7072 ? 'front' : c < -.7072 ? 'back' : 'side';
  }
  /** what a side can strike on its next turn: units ([{ cx, cy, move, range: [min, max] or n (1), climb, drop }]) each
   *  moving within its reach (o.blocked: cells it can't enter) and striking within range of where it stops. { cells:
   *  [[cx, cy, n]], count(c), by(c) -> [units] }: a threat map, for an AI's safe cells and a player's warning tint */
  threat(units, o = {}) {
    const W = this.w, by = new Map();
    for (const u of units) {
      const [lo, hi] = Array.isArray(u.range) ? u.range : [1, u.range || 1], hit = new Set();
      for (const [x, y] of this.reach([u.cx, u.cy], u.move || 0, { blocked: o.blocked, climb: u.climb, drop: u.drop }).cells)
        for (let b = y - hi; b <= y + hi; b++) for (let a = x - hi; a <= x + hi; a++) { const d = this.dist([x, y], [a, b]); if (d >= lo && d <= hi && this.inside([a, b])) hit.add(b * W + a); }
      for (const k of hit) { if (!by.has(k)) by.set(k, []); by.get(k).push(u); }
    }
    const cells = [...by].map(([k, v]) => [k % W, Math.floor(k / W), v.length]).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
    return { cells, count: c => (by.get(c[1] * W + c[0]) || []).length, by: c => by.get(c[1] * W + c[0]) || [] };
  }
}
E.Grid = Grid;

/* =============================================================================
 * FOG  what has been seen and what is in sight, from viewers' fields of view; drawn over the map
 * ========================================================================== */
// a cell's outline on the screen: its top at its height and, below a raised top, the faces down to the floor
const hull = (r, cx, cy, T, z) => {
  const P = [[cx, cy], [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1]].flatMap(([x, y]) => z > 0 ? [r.w(x * T, y * T, z), r.w(x * T, y * T, 0)] : [r.w(x * T, y * T, 0)]);
  P.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
class Fog {
  /** new E.Fog(grid): every cell unseen; update() with the viewers each turn */
  constructor(grid) {
    /** grid: what it covers; state: per cell 0 unseen, 1 seen before, 2 visible now (row by row) */
    this.grid = grid; this.state = new Uint8Array(grid.w * grid.h);
  }
  /** what the viewers see now ([{ cx, cy, r }]: each one's field of view) becomes visible; what was visible stays seen */
  update(viewers) {
    const S = this.state, W = this.grid.w;
    for (let i = 0; i < S.length; i++) if (S[i] === 2) S[i] = 1;
    for (const v of viewers) for (const k of this.grid.fov([v.cx, v.cy], v.r === undefined ? 8 : v.r)) { const [x, y] = k.split(',').map(Number); S[y * W + x] = 2; }
  }
  /** is [cx, cy] in sight now? */
  visible(c) { return this.grid.inside(c) && this.state[c[1] * this.grid.w + c[0]] === 2; }
  /** has [cx, cy] been seen (now or before)? */
  seen(c) { return this.grid.inside(c) && this.state[c[1] * this.grid.w + c[0]] > 0; }
  /** draw it over the world: unseen cells black, seen ones dimmed (o.dim: .55, o.color), walls' faces covered too; call
   *  after the world and before the HUD. T: world units a cell; o.height(cx, cy): a cell's top (a TileMap's height) */
  draw(r, T = 16, o = {}) {
    const G = this.grid, S = this.state, col = o.color || '#05040a', dim = o.dim === undefined ? .55 : o.dim, H = o.height || ((x, y) => G.height([x, y]));
    r.overlay(g => {
      const m = this._m || (this._m = [E.mkCanvas(8, 8), E.mkCanvas(8, 8)]);
      for (const c of m) { if (c.width !== r.bw || c.height !== r.bh) { c.width = r.bw; c.height = r.bh; } const cg = c.getContext('2d'); cg.clearRect(0, 0, c.width, c.height); }
      const [dark, half] = m.map(c => c.getContext('2d'));
      for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
        const s = S[y * G.w + x]; if (s === 2) continue;
        const z = Math.min(H(x, y) || 0, 200), pts = hull(r, x, y, T, z); if (!r.visible(x * T + T / 2, y * T + T / 2, 0, 40, 60 + z, 60)) continue;
        E.px.poly(s ? half : dark, pts, col);
      }
      g.save(); g.globalAlpha = dim; g.drawImage(m[1], 0, 0); g.globalAlpha = 1; g.drawImage(m[0], 0, 0); g.restore(); E.px.reset(g);
    });
  }
}
E.Fog = Fog;
/** tints on cells' tops: E.tint(r, cells ([[cx, cy], ...]), color, alpha = .4, T = 16, height(cx, cy) = 0): a move range,
 *  a path, an attack's reach, drawn on the floor (decals) where height is 0; on a raised top (a TileMap wall's) it sorts
 *  with the map: over that top, under whoever stands on it, behind what is in front */
E.tint = (r, cells, color, alpha = .4, T = 16, height = null) => {
  const quad = (g, x, y, z) => E.px.polyDither(g, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([a, b]) => r.w(a * T, b * T, z)), color, alpha, r.ix, r.iy), flat = [];
  for (const [x, y] of cells) { const z = height ? height(x, y) || 0 : 0; if (z > 0) r.queue((x + .5) * T, (y + .5) * T, 0, g => quad(g, x, y, z), { bias: .001 }); else flat.push([x, y]); }   // (the wall sorts at the same spot; one standing on it, lifted .002 past it)
  if (flat.length) r.decal(g => { for (const [x, y] of flat) quad(g, x, y, 0); });
};

/* =============================================================================
 * GRIDMOVER  one cell at a time at a speed: a buffered turn (Pac-Man), pushing (Sokoban), a smooth position
 * ========================================================================== */
class GridMover {
  /** new E.GridMover({ cx, cy, speed: 6 (cells a second) }) */
  constructor(o = {}) {
    /** cx, cy: the cell it is in (or leaving); x, y: its smooth position in cells (draw it there); speed: cells a second;
     *  dir: [dx, dy] it is moving (or last moved); moving: between cells; arrived: true the step it reaches a cell */
    this.cx = o.cx || 0; this.cy = o.cy || 0; this.x = this.cx; this.y = this.cy; this.speed = o.speed || 6; this.dir = [0, 0]; this.moving = false; this.arrived = false;
    this._want = null; this._to = null; this._u = 0;
  }
  /** a step of dt: want ([dx, dy] or null) is kept until it can be taken. o: { blocked(cx, cy): true where it can't go,
   *  push(cx, cy, dx, dy): true when what is in the way moved (a crate), keep: true goes on in the same direction (a
   *  maze) }. Returns true when it reached a cell this step */
  update(dt, grid, want, o = {}) {
    if (want && (want[0] || want[1])) this._want = want;
    this.arrived = false; let t = dt * this.speed;
    for (let guard = 0; guard < 8 && t > 0; guard++) {
      if (!this.moving) {
        const tryDir = d => { if (!d) return false; const n = [this.cx + d[0], this.cy + d[1]]; if (!grid.walk(n)) return false; if (o.blocked && o.blocked(n[0], n[1]) && !(o.push && o.push(n[0], n[1], d[0], d[1]))) return false; this._to = n; this.dir = d; this.moving = true; this._u = 0; return true; };
        if (tryDir(this._want)) this._want = o.keep ? this._want : null; else if (!(o.keep && tryDir(this.dir))) break;
      }
      const left = 1 - this._u, step = Math.min(left, t); this._u += step; t -= step;
      this.x = this.cx + (this._to[0] - this.cx) * this._u; this.y = this.cy + (this._to[1] - this.cy) * this._u;
      if (this._u >= 1 - 1e-9) { [this.cx, this.cy] = this._to; this.x = this.cx; this.y = this.cy; this.moving = false; this.arrived = true; if (!o.keep && !this._want) break; }
    }
    return this.arrived;
  }
  /** put it on a cell at once, still */
  place(cx, cy) { this.cx = this.x = cx; this.cy = this.y = cy; this.moving = false; this._want = null; }
}
E.GridMover = GridMover;

/* =============================================================================
 * TURNS  who acts next: by speed (energy), by charge time, by phase, or by ATB gauges on game time
 * ========================================================================== */
class Turns {
  /** new E.Turns(actors, { mode: 'speed' | 'ct' | 'phase' | 'atb', sides: ['hero', 'foe'] (phase), fill: 1 (atb: gauge
   *  per second at speed 100) }). An actor is any object with speed (100: normal) and, in phase mode, side */
  constructor(actors = [], o = {}) {
    /** actors: in the order they were added (ties go to the earlier); mode: 'speed', 'ct', 'phase' or 'atb'; sides: the
     *  sides in their order (phase; null: as the actors have them); fill: an atb gauge's fill a second at speed 100;
     *  phase: the side acting now (phase mode) */
    this.actors = actors.slice(); this.mode = o.mode || 'speed'; this.sides = o.sides || null; this.fill = o.fill || 1; this.phase = null; this._left = [];
    for (const a of this.actors) this._init(a);
  }
  _init(a) { if (a._turn === undefined) a._turn = 0; }
  /** add an actor (it starts with an empty gauge) */
  add(a) { this._init(a); this.actors.push(a); }
  /** take an actor out (it died, it left) */
  remove(a) { const i = this.actors.indexOf(a); if (i >= 0) this.actors.splice(i, 1); this._left = this._left.filter(x => x !== a); }
  // the speed and ct modes: fill every gauge until one is full; returns it
  _tick(A, take) {
    if (!A.length) return null;
    for (let guard = 0; guard < 1e5; guard++) {
      let best = null; for (const a of A) if (a._turn >= 100 && (!best || a._turn > best._turn)) best = a;
      if (best) { if (take) best._turn -= 100; return best; }
      for (const a of A) a._turn += Math.max(1, a.speed === undefined ? 100 : a.speed) / 10;
    }
    return null;
  }
  /** the actor whose turn it is (speed: its energy spent; ct: call done(actor, cost) after it acts; phase: each of the
   *  side once, then the next side's) */
  next() {
    if (this.mode === 'phase') {
      if (!this._left.length) {
        const sides = this.sides || [...new Set(this.actors.map(a => a.side))]; if (!sides.length) return null;
        let i = this.phase === null ? 0 : (sides.indexOf(this.phase) + 1) % sides.length;
        for (let k = 0; k < sides.length && !this._left.length; k++, i = (i + 1) % sides.length) { this.phase = sides[i]; this._left = this.actors.filter(a => a.side === this.phase); }
      }
      return this._left.shift() || null;
    }
    return this._tick(this.actors, this.mode === 'speed');
  }
  /** who acts next, n of them, without changing anything (speed and ct: the order ahead; phase: the rest of this side) */
  order(n = 5) {
    if (this.mode === 'phase') return this._left.slice(0, n);
    const copy = this.actors.map(a => ({ a, speed: a.speed, _turn: a._turn })), out = [];
    for (let i = 0; i < n; i++) { const b = this._tick(copy, true); if (!b) break; out.push(b.a); }
    return out;
  }
  /** after an actor acted (ct: cost 100 for a move and an action, 80 or 60 for less; atb: its gauge empties) */
  done(a, cost = 100) { if (this.mode === 'ct') a._turn -= cost; else if (this.mode === 'atb') a._turn = 0; }
  /** atb: fill the gauges on game time (dt seconds) */
  update(dt) { if (this.mode === 'atb') for (const a of this.actors) a._turn = Math.min(100, a._turn + (a.speed === undefined ? 100 : a.speed) * this.fill * dt); }
  /** atb: the actors whose gauges are full, in the order they were added */
  ready() { return this.actors.filter(a => a._turn >= 100); }
  /** an actor's gauge 0..1 (atb and ct: how full; speed: its energy) */
  gauge(a) { return Math.max(0, Math.min(1, (a._turn || 0) / 100)); }
}
E.Turns = Turns;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
