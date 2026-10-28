/*!
my-3D2dge module STRATEGY v0.78.1: real-time strategy and simulation: selection, orders, armies, production, resources, placement, fog, AI; a day clock, needs, overlays
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine only. Needs: grid.

For real-time strategy (Dune II, Warcraft II, Command & Conquer, StarCraft), builders and simulations (SimCity, Theme
Park, RollerCoaster Tycoon). It keeps the rules; the game draws (units are plain objects at x, y on a TileMap).
- const rts = new E.Strategy(game, { map, kinds, sides: { blue: { res: { gold: 300 } }, red: { res: { gold: 300 } } },
  player: 'blue', fog: true, on: { attack(u, t), death(u), made(u), built(b), gathered(u, n), ordered(at, u) } }).
  kinds[id]: a unit { hp, speed, r (5), tall (24: its bar's height), atk, range, rate (seconds a blow), sight (cells),
  cost: { gold: 50 }, time (to make), gather (a load) }, a building { building: true, w, h, hp, makes: ['worker'],
  depot: true, atk, range, cost, time } or a resource { resource: 'gold', amount, w, h }.
- rts.spawn(kind, side, x, y, { built: false }) -> { id, kind, side, K, x, y, r, hp, max, orders, face, moving, working,
  carry, progress, queue, rally } (a building's or resource's x, y: its middle, snapped to cells it blocks);
  rts.of(side, kind), rts.units, rts.remove(u), rts.side(id).res.
- rts.order(units, kind, target, { queue }): 'move' ({ x, y }), 'attack' (a unit), 'amove' ({ x, y }: fighting what it
  meets), 'gather' (a resource: trips to the nearest depot), 'build' ({ kind, cx, cy }: paid now), 'patrol' ({ x, y }),
  'stop'; queue: after the orders it has (Shift). A group moves in formation, slots round the point facing the way, on
  one flow field to it, kept apart; idle units fight what comes into sight. rts.smart(units, x, y, target): attack a foe,
  gather a resource, else move (a right click).
- rts.train(building, kind) (paid now, made after its time, sent to building.rally), rts.cancel(building),
  rts.afford(side, cost); rts.canPlace(kind, cx, cy) (free, walkable, seen); rts.ghost(r, kind, cx, cy) draws it.
- Selection, rts.input({ order: 'order' }) each step: a click or tap picks the player's unit under it (r.pick: draw them
  with { pick: u }) or none; input.box() selects the units inside; Shift adds; a double tap selects that kind on screen;
  Ctrl+1..9 keeps a group, 1..9 calls it; the order action (Mouse2) or a tap with a selection on ground, a foe or a
  resource gives rts.smart. rts.selected; rts.draw(r) after the world: rings, health bars, the box.
- rts.fog (E.Fog: the player's sight; walls block it), rts.visible(u); rts.minimap() is E.Shell's hud({ minimap }) (the
  fog, the camera's view, dots; a click moves the camera there).
- rts.ai(side, { build: [['worker', 5], ['barracks'], ['soldier', 6]], waves: { first: 90, every: 75, min: 4 }, script })
  works on the first step short of its count as it can pay (losses made again; buildings near its depot), keeps its
  workers mining nearest home and sends attack-moves at the nearest foe building; script(rts, side): a generator
  game.script runs. rts.update(dt) each step; rts.state() for a proof. A right click with a building that makes units
  selected sets its rally point.
Touch: a tap selects or orders, a drag on open ground pans (game.cam.free), a long press and a drag draws a box, a pinch
zooms. Time controls: game.timeScale 0, 1, 2, 4 (above 1, more steps of 1/120 s a frame, not longer ones).
Simulation:
- const clock = new E.Clock({ day: 240 (seconds), hour: 8 }); clock.update(dt); day, hour, minute, night, label()
  ('DAY 2  14:30'), light() -> { ambient: .1..1, color } (dark at night, warm at dawn and dusk).
- E.needs(agent, rates, dt) raises agent.needs ({ hunger: .2 }, 0..1) by rates a second; E.choose(agent, options) -> the
  option ({ gives: { hunger: -.6 }, x, y, cost }) that best meets its needs for the walk, or null.
- E.overlay(r, map, value(cx, cy) -> 0..1 or null, colors) tints cells by a value; E.tooltip(r, x, y, lines) a box.

```js strategy
const E = My3D2dge, game = new E.Game({ headless: true, view: 'topdown' }), map = new E.TileMap({ w: 20, h: 14 });
const kinds = { hall: { building: true, w: 2, h: 2, hp: 300, depot: true, makes: ['worker'] }, mine: { resource: 'gold', amount: 500 },
  worker: { hp: 20, speed: 40, atk: 2, range: 10, rate: 1, sight: 5, cost: { gold: 50 }, time: 2, gather: 10 } };
const rts = new E.Strategy(game, { map, kinds, sides: { blue: { res: { gold: 100 } } }, player: 'blue' });
const hall = rts.spawn('hall', 'blue', 48, 48), mine = rts.spawn('mine', null, 216, 56), w = rts.spawn('worker', 'blue', 80, 60);
game.start({ update(dt) { rts.update(dt); }, draw() {} });
rts.order([w], 'gather', mine); rts.train(hall, 'worker'); game.advance(20);
if (rts.side('blue').res.gold <= 50 || rts.of('blue', 'worker').length !== 2) throw new Error('gather, train');
```
Rules: units are the module's; read them, draw them, give them orders; a building blocks its cells (map.block), so
flow fields go round it. The same orders give the same game.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module STRATEGY: load engine/my-3d2dge.js (the full engine) first');
if (!E.Grid) throw new Error('my-3D2dge module STRATEGY: load engine/modules/grid.js first');
const { clamp, px } = E, hyp = Math.hypot;

/* =============================================================================
 * STRATEGY  units, buildings and resources on a TileMap; their orders, production, fog, selection and an AI
 * ========================================================================== */
class Strategy {
  /** new E.Strategy(game, { map, kinds, sides, player, fog, on }): see the manual above */
  constructor(game, o = {}) {
    /** the game it runs in */
    this.game = game;
    /** the TileMap it stands on (a building blocks its cells) */
    this.map = o.map;
    /** the kinds by id (units, buildings, resources: see the manual) */
    this.kinds = o.kinds || {};
    /** the side the player commands (its fog, selection, input) */
    this.player = o.player || Object.keys(o.sides || {})[0] || null;
    /** everything spawned (units, buildings, resources) that still stands */
    this.units = [];
    /** the player's selection */
    this.selected = [];
    /** control groups: groups[1..9], kept with Ctrl and a digit */
    this.groups = {};
    /** its events: { attack, death, made, built, gathered, ordered } */
    this.on = o.on || {};
    /** seconds run (rts.update's dt summed) */
    this.time = 0;
    this._sides = {}; for (const k in o.sides || {}) this._sides[k] = Object.assign({ res: {} }, o.sides[k], { id: k });
    this._id = 0; this._fields = new Map(); this._hash = new E.SpatialHash(32); this._ais = []; this._held = new Set(); this._fogT = 0;
    /** fog: an E.Fog of the player's sight (walls block it, buildings don't), or null with fog: false */
    this.fog = o.fog === false ? null : new E.Fog(E.Grid.from(this.map, { opaque: (x, y) => this.map.cell(x, y) > 0 }));
  }
  /** a side by id: { id, res: { gold: 300 }, ... } */
  side(id) { return this._sides[id] || (this._sides[id] = { id, res: {} }); }
  /** the side's standing units of a kind (or all of them, without kind) */
  of(side, kind) { return this.units.filter(u => u.side === side && (!kind || u.kind === kind)); }
  /** can side pay cost ({ gold: 50 })? */
  afford(side, cost) { const R = this.side(side).res; for (const k in cost || {}) if ((R[k] || 0) < cost[k]) return false; return true; }
  _pay(side, cost, k = 1) { const R = this.side(side).res; for (const c in cost || {}) R[c] = (R[c] || 0) - cost[c] * k; }
  /** make a unit, building or resource of kind for side at world x, y (o.built: false leaves a building to be built) */
  spawn(kind, side, x, y, o = {}) {
    const K = this.kinds[kind]; if (!K) throw new Error('E.Strategy: no kind "' + kind + '"');
    const T = this.map.T, u = { id: ++this._id, kind, side, K, x, y, z: 0, r: K.r || 5, hp: K.hp || 1, max: K.hp || 1, orders: [], cool: 0, carry: 0, face: 0, dead: false,
      building: !!K.building, resource: K.resource || null, amount: K.amount || 0, progress: o.built === false ? 0 : 1, queue: [], rally: null };
    if (u.building || u.resource) {
      const w = K.w || 1, h = K.h || 1; u.cx = Math.round(x / T - w / 2); u.cy = Math.round(y / T - h / 2); u.x = (u.cx + w / 2) * T; u.y = (u.cy + h / 2) * T; u.r = Math.max(w, h) * T / 2;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.map.block(u.cx + i, u.cy + j, true);
      if (o.built === false) u.hp = Math.max(1, Math.round(u.max * .1));
    }
    this.units.push(u); return u;
  }
  /** take u off the map (it died, a mine ran out) */
  remove(u) {
    if (u.dead) return; u.dead = true; this.units.splice(this.units.indexOf(u), 1); this.selected = this.selected.filter(s => s !== u);
    for (const g in this.groups) this.groups[g] = this.groups[g].filter(s => s !== u);
    if (u.building || u.resource) for (let j = 0; j < (u.K.h || 1); j++) for (let i = 0; i < (u.K.w || 1); i++) this.map.block(u.cx + i, u.cy + j, false);
    if (this.on.death) this.on.death(u);
  }
  // how far a is from b's edge (a building's footprint, a unit's circle)
  _gap(a, b) {
    if (b.building || b.resource) { const T = this.map.T, x0 = b.cx * T, y0 = b.cy * T, x1 = x0 + (b.K.w || 1) * T, y1 = y0 + (b.K.h || 1) * T; return hyp(a.x - clamp(a.x, x0, x1), a.y - clamp(a.y, y0, y1)) - a.r; }
    return hyp(a.x - b.x, a.y - b.y) - a.r - b.r;
  }
  _foe(a, b) { return b.side && a.side && b.side !== a.side && !b.resource; }

  /* ---- orders ---- */
  /** give units an order: kind 'move' | 'attack' | 'amove' | 'gather' | 'build' | 'patrol' | 'stop', target ({ x, y }, a
   *  unit, or { kind, cx, cy } to build), o.queue: after the orders they have */
  order(units, kind, target, o = {}) {
    const list = units.filter(u => u && !u.dead && !u.building && !u.resource);
    if (kind === 'build') { const K = this.kinds[target.kind], b = list[0]; if (!b || !this.afford(b.side, K.cost)) return false; this._pay(b.side, K.cost); list.length = 1; }
    let slots = null;
    if ((kind === 'move' || kind === 'amove') && list.length > 1) slots = this._formation(list, target);
    list.forEach((u, i) => {
      const s = slots ? slots[i] : target, ord = kind === 'stop' ? null : { kind, x: s && s.x, y: s && s.y, gx: target && target.x, gy: target && target.y, target: target && target.id ? target : null };
      if (kind === 'build') Object.assign(ord, { what: target.kind, cx: target.cx, cy: target.cy, x: (target.cx + (this.kinds[target.kind].w || 1) / 2) * this.map.T, y: (target.cy + (this.kinds[target.kind].h || 1) / 2) * this.map.T, target: null });
      if (kind === 'patrol') Object.assign(ord, { ax: u.x, ay: u.y });
      if (!o.queue || kind === 'stop') u.orders = []; if (ord) u.orders.push(ord); u.stuck = 0;
    });
    return true;
  }
  // slots for a group: rows across the way from the group's middle to the point, as wide as the group is square, the
  // nearest unit to each slot in turn (the same units, the same slots)
  _formation(list, p) {
    const n = list.length, cols = Math.ceil(Math.sqrt(n)), gap = Math.max(...list.map(u => u.r)) * 2 + 5;
    const mx = list.reduce((a, u) => a + u.x, 0) / n, my = list.reduce((a, u) => a + u.y, 0) / n, a = Math.atan2(p.y - my, p.x - mx), fx = Math.cos(a), fy = Math.sin(a);
    const pts = []; for (let i = 0; i < n; i++) { const c = i % cols - (cols - 1) / 2, r = -Math.floor(i / cols); pts.push({ x: p.x + (-fy * c + fx * r) * gap, y: p.y + (fx * c + fy * r) * gap }); }
    const out = new Array(n), free = list.map((u, i) => i);
    for (const q of pts) { let bi = 0; for (let k = 1; k < free.length; k++) if (hyp(list[free[k]].x - q.x, list[free[k]].y - q.y) < hyp(list[free[bi]].x - q.x, list[free[bi]].y - q.y)) bi = k; out[free[bi]] = q; free.splice(bi, 1); }
    return out;
  }
  /** the right click: attack a foe at the point, gather a resource, else move (o.queue as order's); a building that
   *  makes units takes the point as its rally */
  smart(units, x, y, target, o = {}) {
    const mine = units.filter(u => u && u.side === this.player);
    for (const b of mine) if (b.building && b.K.makes) b.rally = { x, y };
    if (target && target.resource) { const gatherers = mine.filter(u => u.K.gather); this.order(gatherers, 'gather', target, o); return this.order(mine.filter(u => !u.K.gather), 'move', { x, y }, o); }
    if (target && units.length && this._foe(units[0], target)) return this.order(mine, 'attack', target, o);
    return this.order(mine, 'move', { x, y }, o);
  }
  /** queue kind at building (paid now): it comes out after its time, toward building.rally. False when it can't */
  train(b, kind) {
    const K = this.kinds[kind]; if (!b || b.dead || b.progress < 1 || !(b.K.makes || []).includes(kind) || b.queue.length >= 5 || !this.afford(b.side, K.cost)) return false;
    this._pay(b.side, K.cost); b.queue.push({ kind, t: 0 }); return true;
  }
  /** take back the last in building's queue (refunded) */
  cancel(b) { const q = b.queue.pop(); if (q) this._pay(b.side, this.kinds[q.kind].cost, -1); return !!q; }
  /** can a building of kind stand on cells cx, cy (its corner)? On the map, walkable, no unit there (but by, its builder),
   *  seen by the player (when it is theirs) */
  canPlace(kind, cx, cy, by = null) {
    const K = this.kinds[kind], T = this.map.T, fog = (by ? by.side : this.player) === this.player ? this.fog : null;
    for (let j = 0; j < (K.h || 1); j++) for (let i = 0; i < (K.w || 1); i++) {
      const x = cx + i, y = cy + j; if (!this.map.walkable(x, y) || (fog && !fog.seen([x, y]))) return false;
      if (this.units.some(u => u !== by && !u.building && !u.resource && Math.floor(u.x / T) === x && Math.floor(u.y / T) === y)) return false;
    }
    return true;
  }
  /** the placement ghost: kind's cells at cx, cy, green where it fits, red where it doesn't */
  ghost(r, kind, cx, cy) { const K = this.kinds[kind], cells = []; for (let j = 0; j < (K.h || 1); j++) for (let i = 0; i < (K.w || 1); i++) cells.push([cx + i, cy + j]); E.tint(r, cells, this.canPlace(kind, cx, cy) ? '#40e070' : '#ff4040', .5, this.map.T); }

  /* ---- each step ---- */
  /** run the orders, production, fights, the fog and the AIs by dt seconds */
  update(dt) {
    this.time += dt; this._hash.build(this.units.filter(u => !u.building && !u.resource));
    for (const A of this._ais) this._aiStep(A, dt);
    for (const u of this.units.slice()) { if (u.dead || u.resource) continue; u.cool = Math.max(0, u.cool - dt); u.moving = false; if (!u.building) this._act(u, dt); else { this._make(u, dt); if (u.K.atk && u.progress >= 1) this._act(u, dt); } }
    if (this.fog && (this._fogT -= dt) <= 0) { this._fogT = .25; const T = this.map.T; this.fog.update(this.of(this.player).filter(u => u.progress >= 1 || !u.building).map(u => ({ cx: Math.floor(u.x / T), cy: Math.floor(u.y / T), r: u.K.sight || 6 }))); }
  }
  // a building's queue: the first one made when its time is up, beside it, sent to the rally point
  _make(b, dt) {
    const q = b.queue[0]; if (!q || b.progress < 1) return;
    if ((q.t += dt) < (this.kinds[q.kind].time || 1)) return;
    const at = this._spot(b); if (!at) return;
    b.queue.shift(); const u = this.spawn(q.kind, b.side, at[0], at[1]); if (b.rally) this.order([u], 'move', b.rally);
    if (this.on.made) this.on.made(u, b);
  }
  // a free cell round a building's footprint: the rings outward, each from its south side
  _spot(b) {
    const T = this.map.T, x0 = b.cx, y0 = b.cy, x1 = x0 + (b.K.w || 1) - 1, y1 = y0 + (b.K.h || 1) - 1;
    for (let k = 1; k < 6; k++) {
      const ring = []; for (let y = y0 - k; y <= y1 + k; y++) for (let x = x0 - k; x <= x1 + k; x++) if (x === x0 - k || x === x1 + k || y === y0 - k || y === y1 + k) ring.push([x, y]);
      ring.sort((p, q) => q[1] - p[1] || p[0] - q[0]);
      for (const [cx, cy] of ring) if (this.map.walkable(cx, cy) && !this.units.some(o => !o.building && !o.resource && Math.floor(o.x / T) === cx && Math.floor(o.y / T) === cy)) return [(cx + .5) * T, (cy + .5) * T];
    }
    return null;
  }
  // a unit's orders (or, idle, a fight with what it sees)
  _act(u, dt) {
    const o = u.orders[0];
    if (!o) { if (u.K.atk && (u._look = (u._look || 0) - dt) <= 0) { u._look = .25; const f = this._near(u, (u.K.sight || 6) * this.map.T); if (f && !u.building) u.orders.push({ kind: 'attack', target: f, idle: true }); else if (f && u.building) { u._foe = f; } } if (u.building && u._foe && !u._foe.dead) this._strike(u, u._foe); return; }
    if (o.kind === 'attack') { if (this._fight(u, o.target, dt)) u.orders.shift(); return; }
    if ((o.kind === 'amove' || o.kind === 'patrol') && u.K.atk && (u._look = (u._look || 0) - dt) <= 0) {   // fighting what it meets on the way
      u._look = .25; const f = this._near(u, (u.K.sight || 6) * this.map.T); if (f) { u.orders.unshift({ kind: 'attack', target: f, idle: true }); return; }
    }
    if (o.kind === 'gather') { this._gather(u, o, dt); return; }
    if (o.kind === 'build') { this._build(u, o, dt); return; }
    if (this._go(u, o.x, o.y, o.gx, o.gy, dt)) {
      if (o.kind === 'patrol') { const ax = o.ax, ay = o.ay; Object.assign(o, { ax: o.x, ay: o.y, x: ax, y: ay, gx: ax, gy: ay }); } else u.orders.shift();
    }
  }
  // the nearest foe within d of u (seen by u's side: the AI's units see through no fog of theirs)
  _near(u, d) {
    let best = null, bd = d;
    this._hash.near(u.x, u.y, d, o => { if (!o.dead && this._foe(u, o)) { const g = hyp(o.x - u.x, o.y - u.y); if (g < bd) { bd = g; best = o; } } });
    if (!best) for (const b of this.units) if (b.building && this._foe(u, b)) { const g = this._gap(u, b); if (g < bd) { bd = g; best = b; } }
    return best;
  }
  _fight(u, t, dt) {
    if (!t || t.dead || !u.K.atk) return true;
    if (this._gap(u, t) > (u.K.range || 8)) { this._go(u, t.x, t.y, t.x, t.y, dt, true); return false; }
    u.face = Math.atan2(t.y - u.y, t.x - u.x); this._strike(u, t); return false;
  }
  _strike(u, t) {
    if (u.cool > 0 || this._gap(u, t) > (u.K.range || 8)) return;
    u.cool = u.K.rate || 1; if (this.on.attack) this.on.attack(u, t);
    t.hp -= u.K.atk; if (t.hp <= 0) this.remove(t);
  }
  // a worker's trips: to the resource, a load, back to the nearest depot of its side; then again, till it runs out
  _gather(u, o, dt) {
    const res = o.target;
    if (!u.carry && (!res || res.dead)) {   // run out: the nearest of the same left, or stop
      const next = res && this.units.filter(m => m.resource === res.resource).sort((a, b) => hyp(a.x - u.x, a.y - u.y) - hyp(b.x - u.x, b.y - u.y))[0];
      if (next) o.target = next; else u.orders.shift(); return;
    }
    if (u.carry >= (u.K.gather || 10) || (u.carry && (!res || res.dead))) {
      const d = this.of(u.side).filter(b => b.building && b.K.depot && b.progress >= 1).sort((a, b) => this._gap(u, a) - this._gap(u, b))[0];
      if (!d) return;
      if (this._gap(u, d) > 4) { this._go(u, d.x, d.y, d.x, d.y, dt, true); return; }
      const k = (res && res.resource) || o.res || 'gold'; this.side(u.side).res[k] = (this.side(u.side).res[k] || 0) + u.carry; if (this.on.gathered) this.on.gathered(u, u.carry, k); o.res = k; u.carry = 0; return;
    }
    if (this._gap(u, res) > 4) { this._go(u, res.x, res.y, res.x, res.y, dt, true); return; }
    u.mining = (u.mining || 0) + dt; o.res = res.resource;
    if (u.mining >= 1) { u.mining = 0; const n = Math.min(Math.ceil((u.K.gather || 10) / 2), res.amount, (u.K.gather || 10) - u.carry); u.carry += n; res.amount -= n; if (res.amount <= 0) this.remove(res); }
  }
  // a worker builds: to the site, the foundation laid (when the cells are free), then up over the kind's time
  _build(u, o, dt) {
    const K = this.kinds[o.what], T = this.map.T;
    if (!o.site) {
      if (hyp(u.x - o.x, u.y - o.y) > Math.max(K.w || 1, K.h || 1) * T * .5 + u.r + 6) { this._go(u, o.x, o.y, o.x, o.y, dt, true); return; }
      if (!this.canPlace(o.what, o.cx, o.cy, u)) { if ((u.stuck = (u.stuck || 0) + dt) > 4) { this._pay(u.side, K.cost, -1); u.orders.shift(); } return; }
      o.site = this.spawn(o.what, u.side, o.x, o.y, { built: false });
    }
    const b = o.site; if (b.dead) { u.orders.shift(); return; }
    if (this._gap(u, b) > 6) { this._go(u, b.x, b.y, b.x, b.y, dt, true); return; }
    u.face = Math.atan2(b.y - u.y, b.x - u.x); u.working = true;
    b.progress = Math.min(1, b.progress + dt / (K.time || 5)); b.hp = Math.min(b.max, b.hp + b.max * dt / (K.time || 5));
    if (b.progress >= 1) { u.orders.shift(); u.working = false; if (this.on.built) this.on.built(b, u); }
  }
  // steer u toward (x, y): straight when near, else along the flow field to (gx, gy); kept apart from the others and out
  // of walls and buildings. True once it is there (or has been stuck a while near it)
  _go(u, x, y, gx, gy, dt, chase) {
    const d = hyp(x - u.x, y - u.y), T = this.map.T; if (d < (chase ? 1 : 3)) return true;
    let dx, dy;
    if (d < T * 2.5) { dx = (x - u.x) / d; dy = (y - u.y) / d; }
    else { const f = this._field(gx, gy); [dx, dy] = f.dir(u.x, u.y, x, y); }
    let sx = 0, sy = 0;
    this._hash.near(u.x, u.y, u.r * 3, o => { if (o === u || o.dead) return; const ex = u.x - o.x, ey = u.y - o.y, e = hyp(ex, ey), m = u.r + o.r + 1; if (e < m && e > .01) { sx += ex / e * (m - e) / m; sy += ey / e * (m - e) / m; } });
    const sp = (u.K.speed || 30) * dt, was = d; u.x += (dx + sx * 1.6) * sp; u.y += (dy + sy * 1.6) * sp; u.face = Math.atan2(dy, dx); u.moving = true;
    this.map.collide(u);
    const now = hyp(x - u.x, y - u.y); u.stuck = now > was - sp * .25 ? (u.stuck || 0) + dt : 0;
    return !chase && (now < 3 || (u.stuck > .6 && now < T * 1.5) || u.stuck > 3);
  }
  // one flow field per destination cell, shared by every unit going there (the last 16 kept); a target in a building or a
  // wall aims at the nearest open cell to it
  _field(x, y) {
    const T = this.map.T, M = this.map; let cx = Math.floor(x / T), cy = Math.floor(y / T);
    if (!M.walkable(cx, cy)) { let best = null, bd = 1e9; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (M.walkable(cx + i, cy + j) && i * i + j * j < bd) { bd = i * i + j * j; best = [cx + i, cy + j]; } if (best) { [cx, cy] = best; x = (cx + .5) * T; y = (cy + .5) * T; } }
    const k = cx + ',' + cy; let f = this._fields.get(k);
    if (!f) { f = new E.FlowField(this.map); this._fields.set(k, f); if (this._fields.size > 16) this._fields.delete(this._fields.keys().next().value); }
    else { this._fields.delete(k); this._fields.set(k, f); }
    f.update(x, y); return f;
  }

  /* ---- what the player sees and does ---- */
  /** can the player see u? (the fog: any of its cells in sight; theirs always) */
  visible(u) {
    if (!this.fog || u.side === this.player) return true;
    const T = this.map.T; if (!u.building && !u.resource) return this.fog.visible([Math.floor(u.x / T), Math.floor(u.y / T)]);
    for (let j = 0; j < (u.K.h || 1); j++) for (let i = 0; i < (u.K.w || 1); i++) if (this.fog.seen([u.cx + i, u.cy + j])) return true;   // (buildings stay once seen)
    return false;
  }
  /** E.Shell's minimap spec: the map, the fog, the camera's view, the units seen as dots by side, a click moving the camera */
  minimap(colors = {}) {
    return { map: this.map, fog: this.fog, camera: true, onClick: (x, y) => { this.game.focus(x, y); this.game.cam.snap = true; },
      markers: () => this.units.filter(u => this.visible(u)).map(u => ({ x: u.x, y: u.y, kind: u.building ? 'diamond' : 'dot', size: u.building ? 3 : 1.6, color: u.resource ? '#ffd860' : colors[u.side] || (u.side === this.player ? '#60c0ff' : '#ff5a4a') })) };
  }
  /** the player's pointer and keys, each step (see the manual): selection, groups, orders. o.order: the action that orders
   *  (Mouse2 by default where it is bound); o.at(sx, sy) -> the world point under a screen point (map.pick's, by default) */
  input(o = {}) {
    const G = this.game, I = G.input, r = G.r, sh = I.held.has('ShiftLeft') || I.held.has('ShiftRight'), ctrl = I.held.has('ControlLeft') || I.held.has('ControlRight') || I.held.has('MetaLeft');
    const cam = { view: G.view, ix: Math.floor(G.cam.x), iy: Math.floor(G.cam.y) }, at = o.at || ((sx, sy) => { const h = this.map.pick(sx, sy, cam); return h ? [h.x, h.y] : G.view.toGround(sx + cam.ix, sy + cam.iy); });   // (the camera as drawn: headless too)
    const mine = u => u.side === this.player && !u.resource, onScreen = u => { const q = this._screen(u); return q[0] >= 0 && q[1] >= 0 && q[0] < G.screen.W && q[1] < G.screen.H; };
    const under = p => { const hit = r ? r.pick(p[0], p[1]).filter(u => u && u.K && !u.dead && this.visible(u)) : []; return hit[0] || this.units.filter(u => !u.dead && this.visible(u)).map(u => [u, hyp(...this._screen(u).map((v, i) => v - p[i]))]).filter(e => e[1] < 10).sort((a, b) => a[1] - b[1]).map(e => e[0])[0] || null; };
    const b = I.box();
    if (b && b.done) { const inside = this.units.filter(u => mine(u) && !u.building && (q => q[0] >= b.x0 && q[0] <= b.x1 && q[1] >= b.y0 && q[1] <= b.y1)(this._screen(u))); this.selected = sh ? [...new Set([...this.selected, ...inside])] : inside; }
    this._box = b && !b.done ? b : null;
    const d2 = I.doubleTap(), c = I.clicked(), ord = o.order === undefined ? 'order' : o.order;
    if (d2) { const u = under(d2); if (u && mine(u)) this.selected = this.units.filter(v => mine(v) && v.kind === u.kind && onScreen(v)); }
    else if (c && !(b && b.done)) {
      const u = under(c);
      if (u && mine(u)) this.selected = sh ? (this.selected.includes(u) ? this.selected.filter(s => s !== u) : [...this.selected, u]) : [u];
      else if (this.selected.length && I.lastDevice === 'touch') { const p = at(...c); if (p) { this.smart(this.selected, p[0], p[1], u, { queue: sh }); if (this.on.ordered) this.on.ordered(p, u); } }
      else if (!sh) this.selected = [];
    }
    if (ord && I.map[ord] && I.pressed(ord) && this.selected.length) { const p = I.pointer(), w = p && at(...p); if (w) { const u = under(p); this.smart(this.selected, w[0], w[1], u, { queue: sh }); if (this.on.ordered) this.on.ordered(w, u); } }
    for (let n = 1; n <= 9; n++) {   // control groups: Ctrl+n keeps the selection, n calls it back
      const k = 'Digit' + n, down = I.held.has(k), was = this._held.has(k); if (down) this._held.add(k); else this._held.delete(k);
      if (down && !was) { if (ctrl) this.groups[n] = this.selected.slice(); else if (this.groups[n] && this.groups[n].length) this.selected = this.groups[n].filter(u => !u.dead); }
    }
  }
  // a unit's foot on the screen (the HUD's pixels)
  _screen(u) { const G = this.game, q = G.view.p(u.x, u.y, u.z || 0); return [q[0] - Math.floor(G.cam.x), q[1] - Math.floor(G.cam.y)]; }
  /** after the world: a ring under each selected unit, health bars over the selected and the hurt, the box being drawn */
  draw(r) {
    for (const u of this.selected) {
      const R = (u.building ? u.r * 1.2 : u.r + 2), col = u.side === this.player ? '#60ff90' : '#ff6060', pts = [];
      for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2; pts.push([u.x + Math.cos(a) * R, u.y + Math.sin(a) * R]); }
      r.decal(g => { for (let i = 0; i < 16; i++) { const [a, b] = r.w(pts[i][0], pts[i][1], 0), [c, d] = r.w(pts[i + 1][0], pts[i + 1][1], 0); px.line(g, a, b, c, d, col); } });
    }
    r.overlay(g => {
      for (const u of this.units) {
        if (u.resource || !this.visible(u) || (!this.selected.includes(u) && u.hp >= u.max && u.progress >= 1)) continue;
        const [x, y] = r.w(u.x, u.y, (u.z || 0) + (u.building ? u.r * 1.6 : u.K.tall || 24)), w = u.building ? 24 : 12;
        px.rect(g, x - w / 2 - 1, y, w + 2, 3, '#100c18'); px.rect(g, x - w / 2, y + 1, Math.max(1, Math.round(w * u.hp / u.max)), 1, u.hp > u.max * .4 ? '#5ad86a' : '#ff5a4a');
        if (u.progress < 1) px.rect(g, x - w / 2, y + 3, Math.round(w * u.progress), 1, '#ffd060');
      }
      const B = this._box; if (B) { px.line(g, B.x0, B.y0, B.x1, B.y0, '#80ff90'); px.line(g, B.x1, B.y0, B.x1, B.y1, '#80ff90'); px.line(g, B.x1, B.y1, B.x0, B.y1, '#80ff90'); px.line(g, B.x0, B.y1, B.x0, B.y0, '#80ff90'); }
    });
  }

  /* ---- the AI: a build order as data, waves of attack-moves, a script ---- */
  /** run side by plan ({ build: [[kind, n]], waves: { first, every, min }, script }): see the manual */
  ai(side, plan) { const A = { side, plan, i: 0, t: 0, wave: plan.waves ? plan.waves.first || 60 : Infinity }; this._ais.push(A); if (plan.script) this.game.script(() => plan.script(this, side)); return A; }
  _aiStep(A, dt) {
    if ((A.t -= dt) > 0) return; A.t = .5;
    const S = A.side, mine = this.of(S), workers = mine.filter(u => u.K.gather && !u.building), base = mine.find(u => u.building && u.K.depot);
    const home = base || mine[0];
    for (const w of workers) if (!w.orders.length && home) { const m = this.units.filter(u => u.resource).sort((a, b) => hyp(a.x - home.x, a.y - home.y) - hyp(b.x - home.x, b.y - home.y))[0]; if (m) this.order([w], 'gather', m); }
    const count = kind => mine.filter(u => u.kind === kind).length + mine.reduce((a, b) => a + b.queue.filter(q => q.kind === kind).length, 0) + mine.filter(u => u.orders.some(o => o.kind === 'build' && o.what === kind)).length;
    const step = (A.plan.build || []).find(([kind, n = 1]) => count(kind) < n);   // (the first short of its count: losses are made again)
    A.i = step ? A.plan.build.indexOf(step) : (A.plan.build || []).length;
    if (step) {
      const [kind] = step, K = this.kinds[kind];
      if (!K.building) { const b = mine.find(u => u.building && u.progress >= 1 && (u.K.makes || []).includes(kind) && u.queue.length < 2); if (b) this.train(b, kind); }
      else if (base && this.afford(S, K.cost)) {
        const w = workers.find(u => !u.orders.some(o => o.kind === 'build'));
        const room = (cx, cy) => { for (let y = cy - 1; y <= cy + (K.h || 1); y++) for (let x = cx - 1; x <= cx + (K.w || 1); x++) if (!this.map.walkable(x, y)) return false; return this.canPlace(kind, cx, cy, w); };   // (a cell's margin all round: no walling in)
        let spot = null;
        for (let k = 3; k < 12 && !spot && w; k++) for (let a = 0; a < 16 && !spot; a++) { const cx = Math.round(base.cx + Math.cos(a / 16 * Math.PI * 2) * k), cy = Math.round(base.cy + Math.sin(a / 16 * Math.PI * 2) * k); if (room(cx, cy)) spot = [cx, cy]; }
        if (w && spot) this.order([w], 'build', { kind, cx: spot[0], cy: spot[1] });
      }
    }
    const W = A.plan.waves;
    if (W && this.time >= A.wave) {
      const army = mine.filter(u => !u.building && !u.K.gather && u.K.atk && !u.orders.length);
      if (army.length >= (W.min || 3)) {
        const foes = this.units.filter(u => u.side && u.side !== S && !u.resource), near = l => l.sort((a, b) => hyp(a.x - home.x, a.y - home.y) - hyp(b.x - home.x, b.y - home.y))[0], tgt = home && (near(foes.filter(u => u.building)) || near(foes));
        if (tgt) { this.order(army, 'amove', { x: tgt.x, y: tgt.y }); A.wave = this.time + (W.every || 90); if (this.on.wave) this.on.wave(S, army); }
      }
    }
  }
  /** what a proof hashes: every unit's kind, side, cell and HP, each side's resources */
  state() { const T = this.map.T; return { units: this.units.map(u => [u.kind, u.side, Math.floor(u.x / T * 4), Math.floor(u.y / T * 4), Math.round(u.hp), u.orders.length]), res: Object.values(this._sides).map(s => [s.id, s.res]) }; }
}
E.Strategy = Strategy;

/* =============================================================================
 * SIMULATION  a day clock, needs, a value tinted on cells, a tooltip
 * ========================================================================== */
class Clock {
  /** new E.Clock({ day: 240 (real seconds of game time a day), hour: 8 (to start at) }) */
  constructor(o = {}) {
    /** day: the day (1, 2, ...); t: hours since the first midnight; length: seconds a day */
    this.length = o.day || 240; this.t = o.hour === undefined ? 8 : o.hour; this.day = 1;
  }
  /** run it by dt seconds of game time */
  update(dt) { this.t += dt / this.length * 24; this.day = 1 + Math.floor(this.t / 24); }
  /** the hour (0..23) */
  get hour() { return Math.floor(this.t % 24); }
  /** the minute (0..59) */
  get minute() { return Math.floor(this.t % 1 * 60); }
  /** true from 20:00 to 6:00 */
  get night() { const h = this.t % 24; return h >= 20 || h < 6; }
  /** 'DAY 2  14:30' */
  label() { return 'DAY ' + this.day + '  ' + String(this.hour).padStart(2, '0') + ':' + String(Math.floor(this.minute / 10) * 10).padStart(2, '0'); }
  /** the light by the hour: { ambient (.12 at night .. 1 at noon), color (the sky's tint: blue night, warm dawn and dusk) } */
  light() {
    const h = this.t % 24, sun = clamp(Math.sin((h - 6) / 12 * Math.PI), 0, 1), dusk = clamp(1 - Math.abs(h - 6.5) / 1.5, 0, 1) + clamp(1 - Math.abs(h - 19) / 1.5, 0, 1);
    return { ambient: .12 + .88 * Math.sqrt(sun), color: dusk > .05 ? E.mix('#ffffff', '#ffb070', Math.min(1, dusk) * .7) : sun > 0 ? '#ffffff' : '#6070c0' };
  }
}
E.Clock = Clock;
/** raise an agent's needs (agent.needs: { hunger: .2, fun: .5 }, each 0..1) by rates ({ hunger: .01 }) a second */
E.needs = (agent, rates, dt) => { const N = agent.needs || (agent.needs = {}); for (const k in rates) N[k] = clamp((N[k] || 0) + rates[k] * dt, 0, 1); return N; };
/** the option that best meets an agent's needs ({ gives: { hunger: -.6 }, x, y, cost }): each need it lowers, weighted by
 *  that need squared (the urgent first), less the walk (a cell's worth per 400 units) and cost against agent.money; null
 *  when none helps */
E.choose = (agent, options) => {
  const N = agent.needs || {}; let best = null, bs = 0;
  for (const o of options) {
    if (o.cost && agent.money !== undefined && o.cost > agent.money) continue;
    let s = 0; for (const k in o.gives || {}) s += -o.gives[k] * (N[k] || 0) ** 2 * 4;
    if (o.x !== undefined) s -= hyp(o.x - (agent.x || 0), o.y - (agent.y || 0)) / 400;
    if (o.cost) s -= o.cost / 100;
    if (s > bs) { bs = s; best = o; }
  }
  return best;
};
/** tint each cell by value(cx, cy) (0..1, or null for none) along colors (cold to hot): land value, crowding, mood */
E.overlay = (r, map, value, colors = ['#2050c0', '#e0e040', '#e02020'], alpha = .45) => {
  const T = map.T, n = colors.length - 1;
  r.decal(g => { for (let cy = 0; cy < map.h; cy++) for (let cx = 0; cx < map.w; cx++) { const v = value(cx, cy); if (v === null || v === undefined) continue; const f = clamp(v, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)); E.px.polyDither(g, [[cx, cy], [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1]].map(([a, b]) => r.w(a * T, b * T, 0)), E.mix(colors[i], colors[i + 1], f - i), alpha, r.ix, r.iy); } });
};
/** a box of lines (text, or [text, color]) beside a screen point (the pointer), kept on the screen */
E.tooltip = (r, x, y, lines) => {
  r.overlay(g => {
    const L = lines.map(l => Array.isArray(l) ? l : [l, '#e8e0f0']), w = Math.max(...L.map(l => E.font.width(l[0], { font: 'tiny' }))) + 10, h = L.length * 8 + 6;
    const bx = clamp(x + 8, 2, r.W - w - 2), by = clamp(y + 8, 2, r.H - h - 2);
    E.ui.box(g, bx, by, w, h, { alpha: .9 }); L.forEach((l, i) => E.font.text(g, l[0], bx + 5, by + 4 + i * 8, l[1], { outline: false, font: 'tiny' }));
  });
};
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
