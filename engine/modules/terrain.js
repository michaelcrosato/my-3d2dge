/*!
my-3D2dge module TERRAIN v0.83.0: destructible ground in the side plane: carved and added, walked on, drawn in chunks
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

Worms', Scorched Earth's and Lemmings' land: a mask of cells (one a world unit), x right and y UP (the side view's z),
each cell air (0) or a material.
- const land = new E.Terrain({ w: 960, h: 400, x: 0, y: 0 (its bottom left corner in the world), materials: [{ color:
  '#8a5a34', top: '#5aa040' (its lit edge, facing up), edge: '#3a2418', depth: 3 (the lit edge's thickness), hard:
  false (true: never carved) }, ...], chunk: 64 }). A material's id is its place in the list plus one.
- land.fill((x, y) => id) sets every cell (an island: solid below a noise line); land.get(x, y) -> id; land.solid(x, y);
  land.set(x, y, id).
- land.carve(x, y, r, { particles, debris: 12 }) (a crater: returns the cells it took, by material; particles: the
  game's, for flying bits of what it took), land.add(x, y, r, id), land.carvePoly(points), land.addPoly(points, id).
- land.ground(x, y) -> the top of the first solid ground at or below (x, y), or null; land.normal(x, y, r = 4) ->
  [nx, ny] (away from the solid round the point); land.hit(x, y, r) -> [nx, ny, depth] | null (a circle in it);
  land.ray(x0, y0, x1, y1) -> [x, y] | null (the first solid cell on the line: a fast shot).
- land.walk(body, dt, { gravity: 500, climb: 5, h: 10 }): a walker ({ x, y (its feet), vx, vy, ground }) steps up and
  down slopes of up to climb, stops at a wall, falls off edges and lands; returns the speed it landed at (fall
  damage), else 0.
- land.collider() -> a field for the physics module: world.add(land.collider()) (grenades bounce on it).
- land.draw(r) draws the chunks on screen as decals (under the bodies), each redrawn only after a change touches it
  (land.drawn: how many were redrawn last time); a view of whole pixels per unit keeps it crisp.

```js terrain
const E = My3D2dge, land = new E.Terrain({ w: 200, h: 100, materials: [{ color: '#8a5a34', top: '#5aa040' }] });
land.fill((x, y) => y < 40 + Math.sin(x / 20) * 8 ? 1 : 0);
if (Math.abs(land.ground(100, 90) - (40 + Math.sin(5) * 8)) > 1.5) throw new Error('the ground below');
land.carve(100, 40, 12);
if (land.solid(100, 35) || !land.solid(100, 20)) throw new Error('a crater');
const worm = { x: 20, y: 60, vx: 30, vy: 0 };
for (let i = 0; i < 240; i++) land.walk(worm, 1 / 120);
if (!worm.ground || worm.x < 40) throw new Error('it walks along the ground');
```
Rules: one cell a world unit; carve with the game's events (an explosion), never per frame; a walker's x and y are its
feet; keep the water line the game's (below it a walker drowns).
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module TERRAIN: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * TERRAIN  a mask of material cells in the side plane: carving and adding, the ground, normals, hits, rays, walkers,
 * and drawing in chunks redrawn only where it changed
 * ========================================================================== */
const hexRGB = c => { const n = parseInt(c.slice(1), 16); return c.length === 4 ? [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hash = (x, y) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
class Terrain {
  /** new E.Terrain({ w, h, x, y, materials, chunk }): see the manual */
  constructor(o = {}) {
    /** w, h: its size in cells (world units); x, y: its bottom left corner; chunk: the drawn squares' size */
    this.w = o.w || 320; this.h = o.h || 200; this.x = o.x || 0; this.y = o.y || 0; this.chunk = o.chunk || 64;
    /** materials: their looks (a material's id is its index + 1) */
    this.materials = (o.materials || [{ color: '#8a5a34', top: '#5aa040', edge: '#3a2418' }]).map(m => Object.assign({ edge: '#2a1a10', depth: 3 }, m));
    /** cells: the mask, row by row from the top (0: air); drawn: how many chunks the last draw painted again */
    this.cells = new Uint8Array(this.w * this.h); this.drawn = 0;
    this._cv = new Map(); this._dirty = new Set();
    this._rgb = this.materials.map(m => ({ c: hexRGB(m.color), t: hexRGB(m.top || m.color), e: hexRGB(m.edge) }));
  }
  // a world point's cell: [column, row] (row 0 at the top)
  _cell(x, y) { return [Math.floor(x - this.x), this.h - 1 - Math.floor(y - this.y)]; }
  /** the material at a world point (0: air, and outside) */
  get(x, y) { const [c, r] = this._cell(x, y); return c < 0 || r < 0 || c >= this.w || r >= this.h ? 0 : this.cells[r * this.w + c]; }
  /** is the point in the ground? */
  solid(x, y) { return this.get(x, y) > 0; }
  /** set the cell at a world point */
  set(x, y, id) { const [c, r] = this._cell(x, y); if (c < 0 || r < 0 || c >= this.w || r >= this.h) return; this.cells[r * this.w + c] = id; this._touch(c, r, c, r); }
  /** set every cell from fn(x, y) (the world point at the cell's middle) -> a material id or 0 */
  fill(fn) { for (let r = 0; r < this.h; r++) for (let c = 0; c < this.w; c++) this.cells[r * this.w + c] = fn(this.x + c + .5, this.y + this.h - 1 - r + .5) | 0; this._touch(0, 0, this.w - 1, this.h - 1); }
  // the chunks a cell range touches (and their neighbours' edges) need drawing again
  _touch(c0, r0, c1, r1) { const k = this.chunk; for (let cy = Math.floor((r0 - 4) / k); cy <= Math.floor((r1 + 4) / k); cy++) for (let cx = Math.floor((c0 - 1) / k); cx <= Math.floor((c1 + 1) / k); cx++) this._dirty.add(cx + ',' + cy); }
  // every cell within a circle: fn(index, column, row)
  _disc(x, y, r, fn) {
    const [cc, rr] = this._cell(x, y), R = Math.ceil(r);
    for (let dr = -R; dr <= R; dr++) { const row = rr + dr; if (row < 0 || row >= this.h) continue; const yy = (this.h - 1 - row) + this.y + .5 - y; for (let dc = -R; dc <= R; dc++) { const col = cc + dc; if (col < 0 || col >= this.w) continue; const xx = col + this.x + .5 - x; if (xx * xx + yy * yy <= r * r) fn(row * this.w + col, col, row); } }
    this._touch(cc - R, rr - R, cc + R, rr + R);
  }
  /** a crater: air within r of (x, y) but for hard materials; o.particles: bits of what it took fly out; returns { id:
   *  cells taken } */
  carve(x, y, r, o = {}) {
    const took = {}, M = this.materials;
    this._disc(x, y, r, i => { const id = this.cells[i]; if (id && !(M[id - 1] && M[id - 1].hard)) { took[id] = (took[id] || 0) + 1; this.cells[i] = 0; } });
    // the bits fly by a hash of the crater's place: no draw on the game's randomness
    if (o.particles) { const ids = Object.keys(took); for (let k = 0, n = Math.min(o.debris || 12, ids.length ? 99 : 0); k < n; k++) { const id = +ids[k % ids.length], a = (k / n) * Math.PI * 2 + hash(k, x * 7 + y) * .4, sp = 60 + hash(y, k) * 120; o.particles.add({ x: x + Math.cos(a) * r * .6, y: 0, z: y + Math.sin(a) * r * .6, vx: Math.cos(a) * sp, vz: Math.abs(Math.sin(a)) * sp + 40, g: 300, max: .9, kind: 'bit', color: M[id - 1].color, size: 1 }); } }
    return took;
  }
  /** fill a circle with a material */
  add(x, y, r, id) { this._disc(x, y, r, i => { this.cells[i] = id; }); }
  // every cell inside a polygon of world points: fn(index); the scanline at each row's middle
  _poly(P, fn) {
    let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity; for (const p of P) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
    for (let wy = Math.floor(y0) + .5; wy <= y1; wy++) {
      const xs = []; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > wy) !== (b[1] > wy)) xs.push(a[0] + (wy - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let wx = Math.ceil(xs[k] - .5) + .5; wx < xs[k + 1]; wx++) { const [c, r] = this._cell(wx, wy); if (c >= 0 && r >= 0 && c < this.w && r < this.h) fn(r * this.w + c); }
    }
    const [c0, r1] = this._cell(x0, y0), [c1, r0] = this._cell(x1, y1); this._touch(c0, r0, c1, r1);
  }
  /** air inside a polygon of world points (hard materials stay) */
  carvePoly(points) { const M = this.materials; this._poly(points, i => { const id = this.cells[i]; if (id && !(M[id - 1] && M[id - 1].hard)) this.cells[i] = 0; }); }
  /** a material inside a polygon of world points */
  addPoly(points, id) { this._poly(points, i => { this.cells[i] = id; }); }
  /** the top of the first solid ground at or below (x, y) (a world y), or null when there is none */
  ground(x, y) { const [c, r0] = this._cell(x, y); if (c < 0 || c >= this.w) return null; for (let r = Math.max(0, r0); r < this.h; r++) if (this.cells[r * this.w + c]) return this.y + this.h - r; return null; }
  /** the ground's normal near (x, y): [nx, ny], pointing away from the solid within r */
  normal(x, y, r = 4) {
    let nx = 0, ny = 0; const [cc, rr] = this._cell(x, y), R = Math.ceil(r);
    for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) { if (dc * dc + dr * dr > r * r) continue; const c = cc + dc, row = rr + dr; if (c < 0 || row < 0 || c >= this.w || row >= this.h || !this.cells[row * this.w + c]) continue; nx -= dc; ny += dr; }
    const l = Math.hypot(nx, ny); return l ? [nx / l, ny / l] : [0, 1];
  }
  /** a circle in the ground: [nx, ny, depth] (out along the normal by depth clears it), or null */
  hit(x, y, r) {
    let any = false; const [cc, rr] = this._cell(x, y), R = Math.ceil(r);
    for (let dr = -R; dr <= R && !any; dr++) for (let dc = -R; dc <= R; dc++) { if (dc * dc + dr * dr > r * r) continue; const c = cc + dc, row = rr + dr; if (c >= 0 && row >= 0 && c < this.w && row < this.h && this.cells[row * this.w + c]) { any = true; break; } }
    if (!any) return null;
    const [nx, ny] = this.normal(x, y, r + 1); let d = 0;
    for (; d < r * 2; d += .5) { let clear = true; const px = x + nx * d, py = y + ny * d, [c0, r0] = this._cell(px, py); for (let dr = -R; dr <= R && clear; dr++) for (let dc = -R; dc <= R; dc++) { if (dc * dc + dr * dr > r * r) continue; const c = c0 + dc, row = r0 + dr; if (c >= 0 && row >= 0 && c < this.w && row < this.h && this.cells[row * this.w + c]) { clear = false; break; } } if (clear) break; }
    return [nx, ny, Math.max(d, .25)];
  }
  /** the first solid cell on the line from (x0, y0) to (x1, y1): [x, y] (the last air before it), or null */
  ray(x0, y0, x1, y1) { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1; let px = x0, py = y0; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (this.solid(x, y)) return [px, py]; px = x; py = y; } return null; }
  /** a walker's step: up and down slopes of up to climb, stopped by walls, falling and landing (see the manual) */
  walk(b, dt, o = {}) {
    const g = o.gravity !== undefined ? o.gravity : 500, climb = o.climb || 5, h = o.h || 10; let landed = 0;
    if (b.vx) {
      const nx = b.x + b.vx * dt, top = this.ground(nx, b.y + climb + .5);
      if (this.solid(nx, b.y + climb + 1) || this.solid(nx, b.y + h)) b.vx = 0;   // a wall taller than a step
      else { b.x = nx; if (b.ground) { if (top !== null && top >= b.y - climb) b.y = top; else b.ground = false; } }
    }
    if (!b.ground) {
      b.vy = (b.vy || 0) - g * dt; const ny = b.y + b.vy * dt;
      if (b.vy <= 0) { const top = this.ground(b.x, b.y); if (top !== null && top >= ny) { landed = -b.vy; b.y = top; b.vy = 0; b.ground = true; } else b.y = ny; }
      else if (this.solid(b.x, ny + h)) b.vy = 0; else b.y = ny;
    } else if (!this.solid(b.x, b.y - .5)) { const top = this.ground(b.x, b.y); if (top === null || top < b.y - climb) b.ground = false; else b.y = top; }
    return landed;
  }
  /** a field for the physics module: world.add(land.collider()) */
  collider() { return { type: 'static', shape: 'field', test: (x, y, r) => this.hit(x, y, r) }; }
  /** draw it as decals under the bodies, in the side view (its y is the engine's z); only changed chunks are redrawn */
  draw(r) {
    const k = this.chunk, v = r.game.view, s = v.scale, W = r.game.W, H = r.game.H; this.drawn = 0;
    for (let cy = 0; cy * k < this.h; cy++) for (let cx = 0; cx * k < this.w; cx++) {
      const wx = this.x + cx * k, wy = this.y + this.h - cy * k, [sx, sy] = r.w(wx, 0, wy);
      if (sx > W || sy > H || sx + k * s < 0 || sy + k * s * v.zBoost < 0) continue;
      const key = cx + ',' + cy; let cv = this._cv.get(key);
      if (!cv || this._dirty.has(key)) { cv = this._paint(cx, cy, cv); this._cv.set(key, cv); this._dirty.delete(key); this.drawn++; }
      r.decal(g => { const was = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(cv, Math.round(sx), Math.round(sy), Math.round(k * s), Math.round(k * s * v.zBoost)); g.imageSmoothingEnabled = was; });
    }
  }
  // one chunk's picture: each cell its material's color, varied a little; the lit top (air above), a dark rim elsewhere
  _paint(cx, cy, cv) {
    const k = this.chunk; cv = cv || E.mkCanvas(k, k); const g = E.ctx2d(cv), img = g.createImageData(k, k), D = img.data, W = this.w, C = this.cells;
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) {
      const c = cx * k + x, row = cy * k + y, o = (y * k + x) * 4; if (c >= W || row >= this.h) continue;
      const id = C[row * W + c]; if (!id) continue;
      const M = this.materials[id - 1], P = this._rgb[id - 1], air = (cc, rr) => cc >= 0 && rr >= 0 && cc < W && rr < this.h && !C[rr * W + cc];
      let up = 0; for (let d = 1; d <= M.depth; d++) if (air(c, row - d)) { up = d; break; }
      const rim = air(c - 1, row) || air(c + 1, row) || air(c, row + 1), n = (hash(c, row) - .5) * 18 + (hash(c >> 2, row >> 2) - .5) * 14;
      const base = up ? P.t : rim ? P.e : P.c, l = up === 1 ? 24 : 0;
      D[o] = Math.max(0, Math.min(255, base[0] + n + l)); D[o + 1] = Math.max(0, Math.min(255, base[1] + n + l)); D[o + 2] = Math.max(0, Math.min(255, base[2] + n * .7 + l)); D[o + 3] = 255;
    }
    g.putImageData(img, 0, 0); return cv;
  }
}
E.Terrain = Terrain;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
