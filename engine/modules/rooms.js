/*!
my-3D2dge module ROOMS v0.85.1: a world of rooms joined at their edges, the map of what was explored, gates and saves
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

Metroid's, Symphony of the Night's and Zelda's worlds: rooms on a grid of screens, walked between at open edges.
- const world = new E.World(game, { id: 'castle' (its saves' name), screen: [20, 12] (one screen, in tiles), view:
  'side' (PlatformMaps: x, z up) | 'top' (TileMaps: x, y down), legend, types (every room's), rooms: { id: { rows, at:
  [gx, gy] (its top-left screen on the world grid), kind: 'save' | 'boss' | null, name, legend, types } }, start: 'id',
  transition: 'slide' | 'fade' | 'none', make: def => map (to build a room's map yourself) }). A room is as many
  screens wide and tall as its rows; rooms meet where they touch on the grid, and an open edge is a door between them.
- world.rooms: every room by id ({ id, def, map, at, w, h: its size in screens }), each map built once and kept (its
  crumbled blocks, its opened gates); world.room: the one the hero is in; world.map: its map.
- Each step, after the hero moves: world.update(dt, hero) returns 'enter' the step the hero crosses an edge into the
  next room (the hero placed just inside, keeping its height or column and its speed): the camera's bounds follow it
  and the transition plays (world.moving is true meanwhile: hold the game still). An edge with no room past it is a
  wall. world.enter(id) goes to a room (the kit places the hero: map.find('start')).
- Explored: world.seen (the cells 'gx,gy' the hero has been in), world.here (its cell). world.drawMap(g, x, y, cell,
  { all }): the pixel map of what was seen (all: every room), the rooms' walls with gaps at their doors, the save (S)
  and boss (B) rooms, the hero blinking; small in a corner, large on a map screen. world.grid: { x0, y0, w, h } (the
  grid's cells); world.cells(): every cell { gx, gy, room, seen }; game.shell.hud({ minimap: world.shellMap() }) (full engine).
- Gates: a tile type with gate: 'dash' (an ability) or 'key:red' stays solid until world.give(name), which opens its
  tiles in every room. world.has(name); world.got (the set).
- Saves: world.save(hero, extra) keeps the room, the hero's place, what was got and seen, and extra (any JSON) in
  E.store ('rooms:' + id); world.load() goes back (the room entered, got and seen restored) and returns { room, x, z,
  got, seen, extra } (put the hero at x, z: y in a top view), or null; world.clear().
- world.draw(r): the room's map (a TileMap's floor and walls); world.drawOver(r): the transition, after everything else.

```js rooms
const E = My3D2dge, game = new E.Game({ headless: true });
const rows = n => ['#'.repeat(n), ...Array(4).fill('.'.repeat(n)), '#'.repeat(n)];
const world = new E.World(game, { screen: [8, 6], legend: { '#': 1 }, types: { 1: {} }, start: 'a', transition: 'none',
  rooms: { a: { rows: rows(8), at: [0, 0] }, b: { rows: rows(16), at: [1, 0], kind: 'save' } } });
const hero = new E.Platformer({ x: 100, z: 16, w: 8, h: 20 });
let entered = 0; for (let i = 0; i < 480; i++) { hero.update(1 / 120, world.map, { x: 1 }); if (world.update(1 / 120, hero) === 'enter') entered++; }
if (entered !== 1 || world.room.id !== 'b' || !world.seen.has('2,0') || hero.x > 16 * 16 - 4) throw new Error('a to b, then its far wall');
```
Rules: the hero's own update moves it (world.update only changes rooms); keep enemies and pickups per room (by
world.room.id); a room's walls are its rows: leave an edge open only where a room continues.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module ROOMS: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * ROOMS  a world of rooms on a grid of screens: walking between them, the explored map, gates, saves
 * ========================================================================== */
const { clamp, px } = E;
class World {
  /** new E.World(game, { id, screen: [20, 12], view: 'side' | 'top', legend, types, rooms, start, transition: 'slide',
   *  make }): a world of rooms (the manual above) */
  constructor(game, o = {}) {
    /** game: its game; o: its options; id: its name (its saves'); defs: the rooms' definitions by id */
    this.game = game; this.o = Object.assign({ screen: [20, 12], view: 'side', transition: 'slide', legend: {}, types: {} }, o); this.id = o.id || 'world'; this.defs = o.rooms || {};
    /** seen: the world grid's cells the hero has been in ('gx,gy'); here: its cell [gx, gy]; got: the abilities and
     *  keys it has; room: the room it is in; moving: a transition is playing */
    this.seen = new Set(); this.here = null; this.got = new Set(); this.room = null; this.moving = false; this._tr = null; this._sm = null;
    /** rooms: every room by id: { id, def, map, at, w, h } (its size in screens) */
    this.rooms = {};
    const [sw, sh] = this.o.screen, top = this.o.view === 'top';
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const id in this.defs) {
      const def = this.defs[id], legend = Object.assign({}, this.o.legend, def.legend), types = Object.assign({}, this.o.types, def.types);
      const map = this.o.make ? this.o.make(Object.assign({ id, legend, types }, def)) : top ? new E.TileMap({ rows: def.rows, legend, types }) : new E.PlatformMap({ rows: def.rows, legend, types });
      if (!top) map.edges = 'open';   // (the room's own rows are its walls; update makes an edge with no room past it one)
      const R = this.rooms[id] = { id, def, map, at: def.at || [0, 0], w: Math.max(1, Math.round(map.w / sw)), h: Math.max(1, Math.round(map.h / sh)) };
      x0 = Math.min(x0, R.at[0]); y0 = Math.min(y0, R.at[1]); x1 = Math.max(x1, R.at[0] + R.w); y1 = Math.max(y1, R.at[1] + R.h);
    }
    /** grid: the world grid's extent in cells { x0, y0, w, h } */
    this.grid = { x0, y0, w: x1 - x0, h: y1 - y0 };
    this.enter(o.start || Object.keys(this.defs)[0]);
  }
  /** the room's map */
  get map() { return this.room && this.room.map; }
  /** go to a room by id (the camera's bounds become its map's); returns the room */
  enter(id) {
    const R = this.rooms[id]; if (!R) throw new Error('E.World: no room "' + id + '"');
    const g = this.game; this.room = R; g.cam.bounds = v => R.map.bounds(v); g.cam.snap = true;
    return R;
  }
  /** the room that holds world cell (gx, gy), or null */
  roomAt(gx, gy) { for (const id in this.rooms) { const R = this.rooms[id]; if (gx >= R.at[0] && gx < R.at[0] + R.w && gy >= R.at[1] && gy < R.at[1] + R.h) return R; } return null; }
  // the world cell at a place in a room: x across, d down from the room's top
  _cell(R, x, d) { const T = R.map.T, [sw, sh] = this.o.screen; return [R.at[0] + clamp(Math.floor(x / (sw * T)), 0, R.w - 1), R.at[1] + clamp(Math.floor(d / (sh * T)), 0, R.h - 1)]; }
  /** each step, after the hero moves: the cell it is in marked seen; off an edge into the next room, the room changes
   *  ('enter' that step), off one with no room past it, it stops as at a wall; the transition plays on */
  update(dt, b) {
    const tr = this._tr; if (tr && (tr.t += dt) >= tr.dur) { this._tr = null; this.moving = false; }
    const R = this.room, m = R.map, T = m.T, W = m.w * T, H = m.h * T, top = this.o.view === 'top', r = b.r || (b.w || 8) / 2, hh = top ? 0 : (b.h || 0) / 2;
    let down = top ? b.y : H - b.z - hh;   // (the body's middle, down from the room's top)
    this.here = this._cell(R, b.x, down); this.seen.add(this.here.join());
    // a side view's edges are open: where no room continues, the edge is a wall
    if (!top) for (const s of [-1, 1]) if ((s < 0 ? b.x < r : b.x > W - r) && !this.roomAt(this.here[0] + s, this.here[1])) { b.x = s < 0 ? r : W - r; if (b.vx * s > 0) b.vx = 0; }
    // past an edge (a top view's hero stops against it: touching it is enough)
    const e = top ? r + 1 : 0, dx = b.x < e ? -1 : b.x > W - e ? 1 : 0, dy = dx ? 0 : down < e ? -1 : down > H - e ? 1 : 0;
    const N = (dx || dy) && this.roomAt(this.here[0] + dx, this.here[1] + dy);
    if (!N || N === R) return null;
    // the same place along the shared edge, a step inside the new room
    const [sw, sh] = this.o.screen, nm = N.map, NW = nm.w * nm.T, NH = nm.h * nm.T, kx = top ? r + 6 : r + 1, ky = top ? r + 6 : hh + 1, img = this._snap();
    let x = b.x + (R.at[0] - N.at[0]) * sw * T; down += (R.at[1] - N.at[1]) * sh * T;
    if (dx) x = dx > 0 ? kx : NW - kx; else down = dy > 0 ? ky : NH - ky;
    b.x = clamp(x, kx, NW - kx); down = clamp(down, ky, NH - ky);
    if (top) b.y = down; else b.z = NH - down - hh;
    this.enter(N.id); this.here = this._cell(N, b.x, down); this.seen.add(this.here.join());
    const kind = this.o.transition; if (kind !== 'none') { this._tr = { kind, t: 0, dur: kind === 'fade' ? .4 : .35, dx, dy, img }; this.moving = true; }
    return 'enter';
  }
  // a copy of the last frame (the slide moves it away)
  _snap() { const s = this.game.screen; if (this.o.transition !== 'slide' || !s || !s.buf) return null; const c = E.mkCanvas(s.buf.width, s.buf.height); c.getContext('2d').drawImage(s.buf, 0, 0); return c; }
  /** draw the room's map (the kit draws its actors after) */
  draw(r) { const m = this.room.map; if (m.draw) m.draw(r); else { m.drawFloor(r); m.queueWalls(r); } }   // (a TileMap: its floor, then its walls)
  /** draw the transition over everything (last): the old screen sliding away, or a fade through black */
  drawOver(r) {
    const tr = this._tr; if (!tr) return;
    const u = clamp(tr.t / tr.dur, 0, 1);
    r.overlay(g => {
      if (tr.kind === 'slide' && tr.img) { const e = u * u * (3 - 2 * u); g.drawImage(tr.img, Math.round(-tr.dx * e * g.canvas.width), Math.round(-tr.dy * e * g.canvas.height)); }
      else px.blend(g, 1 - Math.abs(u * 2 - 1), 'normal', () => px.rect(g, 0, 0, g.canvas.width, g.canvas.height, '#000000'));
    });
  }
  // open a map's gates for what is got
  _open(map) { const T = map.types; for (let i = 0; i < map.cells.length; i++) { const t = T[map.cells[i]]; if (t && t.gate && this.got.has(t.gate)) map.set(i % map.w, Math.floor(i / map.w), 0); } }
  /** an ability or a key got ('dash', 'key:red'): its gates open in every room */
  give(name) { this.got.add(name); for (const id in this.rooms) this._open(this.rooms[id].map); return this; }
  /** true once it has an ability or a key */
  has(name) { return this.got.has(name); }
  /** every cell of the world grid that a room holds: [{ gx, gy, room, seen }] */
  cells() {
    const out = [];
    for (const id in this.rooms) { const R = this.rooms[id]; for (let a = 0; a < R.w; a++) for (let b = 0; b < R.h; b++) { const gx = R.at[0] + a, gy = R.at[1] + b; out.push({ gx, gy, room: R, seen: this.seen.has(gx + ',' + gy) }); } }
    return out;
  }
  // is this cell's edge toward (dx, dy) open somewhere: a door?
  _door(c, dx, dy) {
    const R = c.room, m = R.map, [sw, sh] = this.o.screen, a = c.gx - R.at[0], b = c.gy - R.at[1], top = this.o.view === 'top';
    const open = (cx, ry) => { const v = m.cell(cx, top ? ry : m.h - 1 - ry); return v === 0 || (v > 0 && m.types[v] && (m.types[v].gate || (m.types[v].kind && m.types[v].kind !== 'solid'))); };
    if (dx) { const cx = dx > 0 ? Math.min(m.w, (a + 1) * sw) - 1 : a * sw; for (let ry = b * sh; ry < Math.min(m.h, (b + 1) * sh); ry++) if (open(cx, ry)) return true; }
    else { const ry = dy > 0 ? Math.min(m.h, (b + 1) * sh) - 1 : b * sh; for (let cx = a * sw; cx < Math.min(m.w, (a + 1) * sw); cx++) if (open(cx, ry)) return true; }
    return false;
  }
  /** draw the explored map with its top-left cell at x, y, each cell a square of cell pixels: the seen cells (o.all:
   *  every room's), walls where rooms end with gaps at their doors, save rooms S and the boss's B, the hero's cell
   *  blinking; o: { all, color, wall, save, boss } */
  drawMap(g, x, y, cell = 6, o = {}) {
    const col = o.color || '#3a5ad0', wall = o.wall || '#d8e4ff', at = (gx, gy) => [x + (gx - this.grid.x0) * cell, y + (gy - this.grid.y0) * cell];
    for (const c of this.cells()) {
      if (!c.seen && !o.all) continue;
      const [X, Y] = at(c.gx, c.gy), k = c.room.def.kind;
      px.rect(g, X, Y, cell, cell, k === 'save' ? o.save || '#c8408a' : k === 'boss' ? o.boss || '#b03a3a' : c.seen ? col : '#2a3048');
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const n = this.roomAt(c.gx + dx, c.gy + dy); if (n === c.room) continue;
        const door = n && this._door(c, dx, dy), h = Math.max(1, Math.floor(cell / 3));
        if (dx) { const X2 = dx > 0 ? X + cell - 1 : X; px.rect(g, X2, Y, 1, cell, wall); if (door) px.rect(g, X2, Y + ((cell - h) >> 1), 1, h, col); }
        else { const Y2 = dy > 0 ? Y + cell - 1 : Y; px.rect(g, X, Y2, cell, 1, wall); if (door) px.rect(g, X + ((cell - h) >> 1), Y2, h, 1, col); }
      }
      if (k && cell >= 8) E.font.text(g, k === 'save' ? 'S' : 'B', X + cell / 2, Y + (cell >> 1) - 2, '#ffffff', { align: 'center', outline: false, font: 'tiny' });
    }
    if (this.here && Math.floor(this.game.real * 3) % 2 === 0) { const [X, Y] = at(this.here[0], this.here[1]), d = Math.max(2, cell >> 2); px.rect(g, X + ((cell - d) >> 1), Y + ((cell - d) >> 1), d, d, '#ffffff'); }
  }
  /** the explored map for E.Shell's minimap: game.shell.hud({ minimap: world.shellMap() }) (a cell a square, the save
   *  and boss rooms marked, the hero's cell) */
  shellMap() {
    const G = this.grid, w = this, m = this._sm || (this._sm = { T: 16, w: G.w, h: G.h, version: 0, cell: (cx, cy) => w.seen.has((cx + G.x0) + ',' + (cy + G.y0)) ? 0 : 1, height: () => 0, floorAt: (x, y) => w.seen.has((Math.floor(x / 16) + G.x0) + ',' + (Math.floor(y / 16) + G.y0)) ? 'water' : null });
    m.version = this.seen.size;
    const markers = this.cells().filter(c => c.seen && c.room.def.kind).map(c => ({ x: (c.gx - G.x0 + .5) * 16, y: (c.gy - G.y0 + .5) * 16, kind: c.room.def.kind === 'save' ? 'diamond' : 'cross', color: c.room.def.kind === 'save' ? '#e070b0' : '#e05050' }));
    return { map: m, at: this.here ? { x: (this.here[0] - G.x0 + .5) * 16, y: (this.here[1] - G.y0 + .5) * 16, facing: 0 } : null, markers };
  }
  /** keep a save: the room, the hero's place, what was got and seen, and extra (anything JSON) */
  save(b, extra) { const d = { room: this.room.id, x: b.x, z: this.o.view === 'top' ? b.y : b.z, got: [...this.got], seen: [...this.seen], extra: extra === undefined ? null : extra }; E.store.set('rooms:' + this.id, d); return d; }
  /** go back to the save (its room entered, what was got and seen restored): { room, x, z, got, seen, extra }, or null */
  load() {
    const d = E.store.get('rooms:' + this.id); if (!d || !this.rooms[d.room]) return null;
    this.got = new Set(d.got || []); this.seen = new Set(d.seen || []); for (const id in this.rooms) this._open(this.rooms[id].map);
    this._tr = null; this.moving = false; this.enter(d.room); return d;
  }
  /** forget the save */
  clear() { E.store.remove('rooms:' + this.id); }
}
E.World = World;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
