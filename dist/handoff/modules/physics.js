/*!
my-3D2dge module PHYSICS v0.80.0: 2D rigid bodies: circles, boxes, polygons, segments; fast balls that never pass through
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

Pinball, Breakout, Asteroids with real collisions, an artillery game's grenades: bodies in a plane of x and y (the ground
plane, or the side plane with the engine's z as y), stepped in a fixed order, so the same inputs give the same world.
- const world = new E.Physics({ gravity: [0, 400], substeps: 4, iterations: 8, sleep: true, on: { hit(a, b, info),
  enter(sensor, body), exit(sensor, body), catch(kicker, body) } }). world.step(dt) in each fixed step (it splits dt in
  substeps: none longer than dt / substeps). gravity is a vector (a pinball table's tilt: [0, 400] down its slope).
- Bodies: world.circle(x, y, r, o), world.box(x, y, w, h, o), world.poly(x, y, points, o) (convex, points round x, y)
  are dynamic by default; world.segment(a, b, o), world.chain(points, o) (a polyline; closed: true), world.arc(x, y, r,
  a0, a1, o) (a curved rail as a chain) are static; world.add({ shape: 'circle' | 'box' | 'poly' | 'segment' | 'field',
  type: 'dynamic' | 'kinematic' | 'static', ... }) any. A segment or polygon may have r: rounded by that much (a capsule).
  o: { type, mass (else density * area; density .01), bounce (0..1, .3), friction (.4), damping (per second), angle,
  vx, vy, spin (radians a second), layer (bits, 1), mask (bits it collides with, 0xffff), sensor (overlaps reported,
  no push), bullet (a fast circle: swept, so it stops at what it would pass through), kick (a bumper's or slingshot's:
  what it hits leaves at this speed at least, pixels a second, along the hit's normal), gravity (its scale, 1), maxSpeed, fixedRotation, data (yours) }.
- A body: x, y, angle, vx, vy, spin, sleeping, off (true: it takes no part), held (caught by a kicker); b.impulse(ix, iy,
  px, py), b.wake(), b.moveTo(x, y, angle, speed, turn) (a kinematic body goes there at that speed: paddles, doors).
  Kinematic bodies are moved by code and give their speed to what they hit (flippers, paddles); static ones never move.
- Helpers: world.flipper(x, y, { side: 'left' | 'right', len: 34, r0: 5, r1: 3, rest: .45, up: -.45, speed: 30 })
  (a kinematic tapered bar; flip(true) swings it up, flip(false) back; y down the screen), world.bumper(x, y, r,
  { kick: 260 }), world.slingshot(a, b, { kick: 220 }), world.kicker(x, y, { r: 6, hold: .6, dir: [0, -1], power: 700 })
  (a sensor that catches a ball, holds it, then fires it: a saucer, a kickback; armed: false lets balls by).
- Layers: a ball on a ramp ignores the table's walls: ball.mask = RAMP while it rides, a sensor at each end switching it.
  A field: { shape: 'field', type: 'static', test(x, y, r) -> [nx, ny, depth] | null } collides with circles (the
  terrain module's terrain.collider()).
- world.ray(a, b, mask) -> { body, x, y, t } | null (the nearest hit along a to b); world.query(x, y) -> bodies there;
  world.remove(b); world.wake(); world.bodies (in the order added); world.hash() (a proof's number); world.draw(g, to,
  color) outlines every body (to(x, y) -> [sx, sy]: your plane on the screen).

```js physics
const E = My3D2dge, world = new E.Physics({ gravity: [0, 600] });
world.chain([[0, 0], [0, 200], [160, 200], [160, 0]]);                    // a box open at the top
const L = world.flipper(40, 170, { side: 'left' }), ball = world.circle(64, 150, 5, { bullet: true, bounce: .4 });
for (let i = 0; i < 300 && !world.contacts.some(c => c.a === L || c.b === L); i++) world.step(1 / 120);   // it lands on it
L.flip(true); for (let i = 0; i < 12; i++) world.step(1 / 120);
if (!(ball.vy < -100)) throw new Error('the flipper fires it up');
const shot = world.circle(80, 100, 4, { bullet: true, vx: 9000 }); for (let i = 0; i < 30; i++) world.step(1 / 120);
if (shot.x > 160) throw new Error('never through the wall');
```
Rules: step it from the game's fixed step only (the same steps give the same world); a fast ball is a bullet; keep
polygons convex (a concave shape is several bodies or a chain); give a table's walls a little thickness (r: 1) where
balls press hard; draw your own art at the bodies' places (draw() is for checking).
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module PHYSICS: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * PHYSICS  2D rigid bodies: a core (a point, a segment or a convex polygon) with a radius; sequential impulses in a
 * fixed order; swept circles for fast balls; sensors, layers, sleep, kinematic bodies, a pinball's parts
 * ========================================================================== */
const hyp = Math.hypot, clamp = (v, a, b) => v < a ? a : v > b ? b : v, MARGIN = 1, SLOP = .3;
// the points wound one way (a positive area), so each edge's outward normal is (dy, -dx)
const wind = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return (a < 0 ? P.slice().reverse() : P.slice()).map(p => [p[0], p[1]]); };
// a polygon's area, centroid and second moment of area about its centroid
function polyMass(P) {
  let A = 0, cx = 0, cy = 0, I = 0;
  for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length], c = x1 * y2 - x2 * y1; A += c / 2; cx += (x1 + x2) * c / 6; cy += (y1 + y2) * c / 6; I += c / 12 * (x1 * x1 + x1 * x2 + x2 * x2 + y1 * y1 + y1 * y2 + y2 * y2); }
  if (Math.abs(A) < 1e-9) return null;
  cx /= A; cy /= A; return { A, cx, cy, I: I - A * (cx * cx + cy * cy) };
}

class PBody {
  /** made by world.add (and its shorthands): see the manual */
  constructor(world, d) {
    Object.assign(this, { type: 'dynamic', shape: 'circle', x: 0, y: 0, angle: 0, vx: 0, vy: 0, spin: 0, r: 0, bounce: .3, friction: .4, damping: 0, layer: 1, mask: 0xffff, sensor: false, bullet: false, off: false, kick: 0, gravity: 1, maxSpeed: 0, data: null }, d);
    /** world: its world; id: its number (the order added); sleeping: at rest, skipped until something wakes it; held: the
     *  kicker holding it ({ k, t }), or null; to: a kinematic body's goal ({ x, y, angle, speed, turn }), or null */
    this.world = world; this.id = world._id++; this.sleeping = false; this.held = null; this.to = this.to || null;
    const s = this.shape;
    /** local: the core's points round x, y (a box's corners, a polygon's, a segment's two ends), or null (a circle) */
    this.local = s === 'box' ? [[-d.w / 2, -d.h / 2], [d.w / 2, -d.h / 2], [d.w / 2, d.h / 2], [-d.w / 2, d.h / 2]] : s === 'poly' ? wind(d.points) : s === 'segment' ? [d.a.slice(), d.b.slice()] : null;
    if (s === 'segment' && !d.x && !d.y) { this.x = (d.a[0] + d.b[0]) / 2; this.y = (d.a[1] + d.b[1]) / 2; this.local = [[d.a[0] - this.x, d.a[1] - this.y], [d.b[0] - this.x, d.b[1] - this.y]]; }
    // mass and the turning inertia (dynamic bodies only; the others never yield)
    if (this.type === 'dynamic') {
      const den = d.density || .01; let m, I;
      if (!this.local) { m = d.mass || den * Math.PI * this.r * this.r; I = m * this.r * this.r / 2; }
      else {
        const pm = polyMass(this.local);
        if (pm) { for (const p of this.local) { p[0] -= pm.cx; p[1] -= pm.cy; } this.x += pm.cx; this.y += pm.cy; m = d.mass || den * pm.A; I = pm.I * m / pm.A; }
        else { const L = hyp(this.local[1][0] - this.local[0][0], this.local[1][1] - this.local[0][1]); m = d.mass || den * (L * 2 * this.r + Math.PI * this.r * this.r); I = m * (L * L / 12 + this.r * this.r / 2); }
      }
      /** mass, im (its inverse: 0 for what never yields), iI (the inverse of its turning inertia) */
      this.mass = m; this.im = 1 / m; this.iI = d.fixedRotation || !(I > 0) ? 0 : 1 / I;
    } else { this.mass = Infinity; this.im = 0; this.iI = 0; }
    /** wv, wn: the core's points and its edges' outward normals in the world, now; box: [x0, y0, x1, y1] round it all */
    this.wv = this.local ? this.local.map(() => [0, 0]) : null; this.wn = this.local ? this.local.map(() => [0, 0]) : null; this.box = [0, 0, 0, 0]; this._still = 0;
    this._pose();
  }
  // the world points, normals and bounds of where it is now
  _pose() {
    const r = this.r, B = this.box;
    if (this.shape === 'field') { B[0] = B[1] = -Infinity; B[2] = B[3] = Infinity; return; }
    if (!this.local) { B[0] = this.x - r; B[1] = this.y - r; B[2] = this.x + r; B[3] = this.y + r; return; }
    const c = Math.cos(this.angle), s = Math.sin(this.angle), L = this.local, V = this.wv, N = this.wn, n = L.length;
    B[0] = B[1] = Infinity; B[2] = B[3] = -Infinity;
    for (let i = 0; i < n; i++) { const v = V[i]; v[0] = this.x + c * L[i][0] - s * L[i][1]; v[1] = this.y + s * L[i][0] + c * L[i][1]; if (v[0] - r < B[0]) B[0] = v[0] - r; if (v[1] - r < B[1]) B[1] = v[1] - r; if (v[0] + r > B[2]) B[2] = v[0] + r; if (v[1] + r > B[3]) B[3] = v[1] + r; }
    for (let i = 0; i < n; i++) { const a = V[i], b = V[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], l = hyp(ex, ey) || 1; N[i][0] = ey / l; N[i][1] = -ex / l; }
  }
  /** push it: an impulse (mass x speed) at a world point (its middle by default) */
  impulse(ix, iy, px = this.x, py = this.y) { if (this.type !== 'dynamic') return; this.wake(); this.vx += ix * this.im; this.vy += iy * this.im; this.spin += this.iI * ((px - this.x) * iy - (py - this.y) * ix); }
  /** wake it from sleep */
  wake() { this.sleeping = false; this._still = 0; }
  /** a kinematic body's goal: it moves there at speed (pixels a second) and turns to angle at turn (radians a second) */
  moveTo(x, y, angle = this.angle, speed = Infinity, turn = Infinity) { this.to = { x, y, angle, speed, turn }; }
}

/* ---- contacts: the closest features of two cores, a normal from a to b, up to two points, each with its separation
 * (below 0: overlapping); found while within MARGIN, so a body about to touch is stopped at the surface ---- */
function circleCircle(a, b, m) {
  const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), s = d - a.r - b.r; if (s > m) return null;
  const nx = d > 1e-9 ? dx / d : 0, ny = d > 1e-9 ? dy / d : 1;
  return { nx, ny, pts: [[a.x + nx * (a.r + s / 2), a.y + ny * (a.r + s / 2), s]] };
}
// a polygon (with its radius) and a circle: the face the centre is furthest out of, or the corner it is past
function polyCircle(p, c, m) {
  const V = p.wv, N = p.wn, n = V.length, R = p.r + c.r; let best = -Infinity, i1 = 0;
  for (let i = 0; i < n; i++) { const s = N[i][0] * (c.x - V[i][0]) + N[i][1] * (c.y - V[i][1]); if (s > best) { best = s; i1 = i; } }
  if (best > R + m) return null;
  const v1 = V[i1], v2 = V[(i1 + 1) % n]; let nx = N[i1][0], ny = N[i1][1], s = best - R;
  if (best > 1e-9) {
    const u1 = (c.x - v1[0]) * (v2[0] - v1[0]) + (c.y - v1[1]) * (v2[1] - v1[1]), u2 = (c.x - v2[0]) * (v1[0] - v2[0]) + (c.y - v2[1]) * (v1[1] - v2[1]), v = u1 <= 0 ? v1 : u2 <= 0 ? v2 : null;
    if (v) { const dx = c.x - v[0], dy = c.y - v[1], d = hyp(dx, dy); if (d - R > m) return null; nx = d > 1e-9 ? dx / d : nx; ny = d > 1e-9 ? dy / d : ny; s = d - R; }
  }
  return { nx, ny, pts: [[c.x - nx * (c.r + s / 2), c.y - ny * (c.r + s / 2), s]] };
}
// the face of a whose normal separates it furthest from b's points
function maxSep(a, b) { let best = -Infinity, bi = 0; for (let i = 0; i < a.wv.length; i++) { const n = a.wn[i], v = a.wv[i]; let mn = Infinity; for (const q of b.wv) { const s = n[0] * (q[0] - v[0]) + n[1] * (q[1] - v[1]); if (s < mn) mn = s; } if (mn > best) { best = mn; bi = i; } } return [best, bi]; }
// two polygons: the reference face (the more separating one), the other's face most against it, clipped to its sides
function polyPoly(a, b, m) {
  const R = a.r + b.r, [sa, ia] = maxSep(a, b); if (sa > R + m) return null;
  const [sb, ib] = maxSep(b, a); if (sb > R + m) return null;
  const flip = sb > sa + .1, ref = flip ? b : a, inc = flip ? a : b, i1 = flip ? ib : ia, n = ref.wn[i1], v1 = ref.wv[i1], v2 = ref.wv[(i1 + 1) % ref.wv.length];
  let j = 0, mn = Infinity; for (let k = 0; k < inc.wn.length; k++) { const d = inc.wn[k][0] * n[0] + inc.wn[k][1] * n[1]; if (d < mn) { mn = d; j = k; } }
  const c0 = inc.wv[j], c1 = inc.wv[(j + 1) % inc.wv.length];
  const tx = v2[0] - v1[0], ty = v2[1] - v1[1], tl = hyp(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
  const clip = (p, q, k, o) => {   // keep the part of p..q with k (u . x) >= o (k: 1 or -1, the two side planes)
    const dp = k * (ux * p[0] + uy * p[1]) - o, dq = k * (ux * q[0] + uy * q[1]) - o;
    if (dp >= 0 && dq >= 0) return [p, q]; if (dp < 0 && dq < 0) return null;
    const t = dp / (dp - dq), x = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; return dp < 0 ? [x, q] : [p, x];
  };
  let seg = clip(c0, c1, 1, ux * v1[0] + uy * v1[1] - R); if (!seg) return null;
  seg = clip(seg[0], seg[1], -1, -(ux * v2[0] + uy * v2[1]) - R); if (!seg) return null;
  const pts = [];
  for (const p of seg) { const s = n[0] * (p[0] - v1[0]) + n[1] * (p[1] - v1[1]) - R; if (s <= m) pts.push([p[0] - n[0] * (inc.r + s / 2), p[1] - n[1] * (inc.r + s / 2), s]); }
  return pts.length ? { nx: flip ? -n[0] : n[0], ny: flip ? -n[1] : n[1], pts } : null;
}
// a field (terrain) and a circle: its own test
function fieldCircle(f, c, m) { const t = f.test(c.x, c.y, c.r + m); if (!t) return null; const s = m - t[2]; if (s > m) return null; return { nx: t[0], ny: t[1], pts: [[c.x - t[0] * c.r, c.y - t[1] * c.r, s]] }; }
function manifold(a, b, m) {
  const ca = !a.local, cb = !b.local;
  if (a.shape === 'field') return cb && b.shape !== 'field' ? fieldCircle(a, b, m) : null;
  if (b.shape === 'field') { const k = ca ? fieldCircle(b, a, m) : null; if (k) { k.nx = -k.nx; k.ny = -k.ny; } return k; }
  if (ca && cb) return circleCircle(a, b, m);
  if (!ca && cb) return polyCircle(a, b, m);
  if (ca && !cb) { const k = polyCircle(b, a, m); if (k) { k.nx = -k.nx; k.ny = -k.ny; } return k; }
  return polyPoly(a, b, m);
}
const ov = (a, b, m) => a[0] - m <= b[2] && b[0] - m <= a[2] && a[1] - m <= b[3] && b[1] - m <= a[3];
const cross = (ax, ay, bx, by) => ax * by - ay * bx;

class Physics {
  /** new E.Physics({ gravity, substeps, iterations, sleep, on, cell }): a world of bodies (see the manual) */
  constructor(o = {}) {
    /** gravity: [gx, gy], pixels a second a second; substeps: steps per step(dt); iterations: the solver's passes;
     *  sleep: bodies at rest sleep; on: its events */
    this.gravity = o.gravity || [0, 0]; this.substeps = o.substeps || 4; this.iterations = o.iterations || 8; this.sleep = o.sleep !== false; this.on = o.on || {};
    /** bodies: every body in the order added; contacts: the last substep's ({ a, b, nx, ny, pts, fresh }) */
    this.bodies = []; this.contacts = [];
    this._id = 1; this._cell = o.cell || 64; this._grid = null; this._was = new Set(); this._in = new Set(); this._stamp = 0;
  }
  /** a body from its definition (see the manual) */
  add(d) { const b = new PBody(this, d); this.bodies.push(b); if (b.type === 'static') this._grid = null; return b; }
  /** take a body out */
  remove(b) { const i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1); if (b.type === 'static') this._grid = null; }
  /** a circle (dynamic unless o.type says) */
  circle(x, y, r, o) { return this.add(Object.assign({ shape: 'circle', x, y, r }, o)); }
  /** a box w x h about its middle (dynamic unless o.type says) */
  box(x, y, w, h, o) { return this.add(Object.assign({ shape: 'box', x, y, w, h }, o)); }
  /** a convex polygon, its points round x, y (dynamic unless o.type says) */
  poly(x, y, points, o) { return this.add(Object.assign({ shape: 'poly', x, y, points }, o)); }
  /** a static segment from a to b (o.r: its thickness's half) */
  segment(a, b, o) { return this.add(Object.assign({ type: 'static', shape: 'segment', a, b }, o)); }
  /** static segments through the points (o.closed: back to the first); returns them */
  chain(points, o = {}) { const out = []; for (let i = 0; i < points.length - (o.closed ? 0 : 1); i++) out.push(this.segment(points[i], points[(i + 1) % points.length], o)); return out; }
  /** a curved rail: a chain round (x, y) at radius r from angle a0 to a1 (radians; o.n segments) */
  arc(x, y, r, a0, a1, o = {}) { const n = o.n || Math.max(3, Math.ceil(Math.abs(a1 - a0) * r / 6)), P = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return this.chain(P, o); }
  /** wake every body (after a change to gravity, say) */
  wake() { for (const b of this.bodies) b.wake(); }
  /** advance by dt seconds (from the game's fixed step), in substeps */
  step(dt) { if (!(dt > 0)) return; const h = dt / this.substeps; for (let i = 0; i < this.substeps; i++) this._sub(h); }
  // the statics in cells of the grid, for the bodies that move to look up
  _build() {
    const G = new Map(), k = this._cell;
    for (const b of this.bodies) { if (b.type !== 'static' || b.shape === 'field') continue; b._pose(); const B = b.box; for (let cy = Math.floor(B[1] / k); cy <= Math.floor(B[3] / k); cy++) for (let cx = Math.floor(B[0] / k); cx <= Math.floor(B[2] / k); cx++) { const key = cx * 73856093 ^ cy * 19349663; let L = G.get(key); if (!L) G.set(key, L = []); L.push(b); } }
    this._grid = G; this._fields = this.bodies.filter(b => b.shape === 'field');
  }
  // the statics whose cells meet the box (each once, in the order added)
  _near(B, out) {
    const k = this._cell, st = ++this._stamp; out.length = 0;
    for (let cy = Math.floor(B[1] / k); cy <= Math.floor(B[3] / k); cy++) for (let cx = Math.floor(B[0] / k); cx <= Math.floor(B[2] / k); cx++) { const L = this._grid.get(cx * 73856093 ^ cy * 19349663); if (L) for (const b of L) if (b._st !== st) { b._st = st; out.push(b); } }
    out.sort((p, q) => p.id - q.id); for (const f of this._fields) out.push(f); return out;
  }
  // one substep: kinematic goals; contacts where things are; gravity; the solver; kicks; the moves (fast balls swept)
  _sub(h) {
    const B = this.bodies, g = this.gravity;
    for (const b of B) if (b.type === 'kinematic' && b.to && !b.off) {
      const t = b.to;
      if (t.angle !== undefined) b.spin = clamp((t.angle - b.angle) / h, -t.turn, t.turn);
      if (t.x !== undefined) { const dx = t.x - b.x, dy = t.y - b.y, d = hyp(dx, dy), v = Math.min(d / h, t.speed); b.vx = d > 1e-9 ? dx / d * v : 0; b.vy = d > 1e-9 ? dy / d * v : 0; }
    }
    const C = this._collide();
    for (const b of B) if (b.type === 'dynamic' && !b.sleeping && !b.held && !b.off) { b.vx += g[0] * b.gravity * h; b.vy += g[1] * b.gravity * h; if (b.damping) { const k = Math.exp(-b.damping * h); b.vx *= k; b.vy *= k; b.spin *= k; } }
    for (const c of C) this._prep(c, h);
    for (let k = 0; k < this.iterations; k++) for (const c of C) this._solve(c);
    for (const c of C) if (c.fresh) {   // a contact that began this substep: the hit event, a bumper's kick
      const { a, b, nx, ny } = c;
      if (a.kick && b.type === 'dynamic') { const v = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (v < a.kick) { b.vx += nx * (a.kick - v); b.vy += ny * (a.kick - v); } }   // (it leaves at the kick's speed at least)
      if (b.kick && a.type === 'dynamic') { const v = -((a.vx - b.vx) * nx + (a.vy - b.vy) * ny); if (v < b.kick) { a.vx -= nx * (b.kick - v); a.vy -= ny * (b.kick - v); } }
      if (this.on.hit) this.on.hit(a, b, { x: c.pts[0].x, y: c.pts[0].y, nx, ny, speed: c.speed });
    }
    const F = new Array(B.length).fill(1);
    for (let i = 0; i < B.length; i++) { const b = B[i]; if (b.bullet && !b.local && b.type === 'dynamic' && !b.sleeping && !b.held && !b.off) F[i] = this._toi(b, h); }
    for (let i = 0; i < B.length; i++) {
      const b = B[i]; if (b.type === 'static' || b.sleeping || b.off) continue;
      if (b.held) { const H = b.held; b.x = H.k.x; b.y = H.k.y; b.vx = b.vy = b.spin = 0; if ((H.t -= h) <= 0) { const K = H.k.catch; b.held = null; b.vx = K.dir[0] * K.power; b.vy = K.dir[1] * K.power; } b._pose(); continue; }
      if (b.maxSpeed) { const v = hyp(b.vx, b.vy); if (v > b.maxSpeed) { b.vx *= b.maxSpeed / v; b.vy *= b.maxSpeed / v; } }
      b.x += b.vx * h * F[i]; b.y += b.vy * h * F[i]; b.angle += b.spin * h; b._pose();
      if (b.type === 'dynamic' && this.sleep) { if (b.vx * b.vx + b.vy * b.vy < 16 && Math.abs(b.spin) < .1) { if ((b._still += h) > .6) { b.sleeping = true; b.vx = b.vy = b.spin = 0; } } else b._still = 0; }
    }
  }
  // every pair near enough to touch, in a fixed order: the movers in the order added, each with the statics near it
  // and the movers after it; sensors report entering and leaving; sleepers wake when a mover strikes them
  _collide() {
    if (!this._grid) this._build();
    const B = this.bodies, C = [], was = this._was, now = new Set(), ins = new Set(), near = [];
    const mov = B.filter(b => b.type !== 'static' && !b.off), awake = o => o.type === 'dynamic' && !o.sleeping;
    const pair = (a, b) => {
      if (a.off || b.off || !(a.layer & b.mask) || !(b.layer & a.mask) || !ov(a.box, b.box, MARGIN)) return;
      const m = manifold(a, b, MARGIN); if (!m) return;
      const key = a.id < b.id ? a.id * 1048576 + b.id : b.id * 1048576 + a.id;
      if (a.sensor || b.sensor) {
        if (!m.pts.some(p => p[2] < 0)) return;
        const s = a.sensor ? a : b, o = s === a ? b : a; ins.add(key);
        if (!this._in.has(key)) { if (s.catch && s.catch.armed !== false && o.type === 'dynamic' && !o.held && !o.local) { o.held = { k: s, t: s.catch.hold }; if (this.on.catch) this.on.catch(s, o); } if (this.on.enter) this.on.enter(s, o); }
        s._over = s._over || new Map(); s._over.set(key, o); return;
      }
      if (a.sleeping !== b.sleeping) { const w = a.sleeping ? b : a, sl = a.sleeping ? a : b; if (w.vx * w.vx + w.vy * w.vy > 16 || Math.abs(w.spin) > .1) sl.wake(); }
      if ((a.sleeping || a.type !== 'dynamic') && (b.sleeping || b.type !== 'dynamic')) return;
      now.add(key);
      C.push({ a, b, nx: m.nx, ny: m.ny, pts: m.pts.map(p => ({ x: p[0], y: p[1], s: p[2], ln: 0, lt: 0 })), fresh: !was.has(key), speed: 0 });
    };
    for (let i = 0; i < mov.length; i++) {
      const a = mov[i];
      if (a.type === 'dynamic' && !a.sleeping) for (const s of this._near(a.box, near)) pair(s, a);
      else if (a.type === 'kinematic') for (const s of this._near(a.box, near)) if (s.sensor) pair(s, a);
      for (let j = i + 1; j < mov.length; j++) { const b = mov[j]; if (awake(a) || awake(b) || (a.type === 'kinematic' && b.sleeping) || (b.type === 'kinematic' && a.sleeping)) pair(a, b); }
    }
    for (const s of B) if (s._over) for (const [key, o] of s._over) if (!ins.has(key)) { s._over.delete(key); if (this.on.exit) this.on.exit(s, o); }
    this._in = ins; this._was = now; this.contacts = C; return C;
  }
  // a contact's masses along its normal and its tangent, and the speed it should part at (a bounce, or out of overlap)
  _prep(c, h) {
    const { a, b, nx, ny } = c, e = Math.max(a.bounce, b.bounce); c.mu = Math.sqrt(a.friction * b.friction);
    for (const p of c.pts) {
      const rax = p.x - a.x, ray = p.y - a.y, rbx = p.x - b.x, rby = p.y - b.y, rna = cross(rax, ray, nx, ny), rnb = cross(rbx, rby, nx, ny), rta = cross(rax, ray, -ny, nx), rtb = cross(rbx, rby, -ny, nx);
      p.rax = rax; p.ray = ray; p.rbx = rbx; p.rby = rby;
      p.mn = 1 / (a.im + b.im + a.iI * rna * rna + b.iI * rnb * rnb || 1); p.mt = 1 / (a.im + b.im + a.iI * rta * rta + b.iI * rtb * rtb || 1);
      const vn = (b.vx - b.spin * rby - a.vx + a.spin * ray) * nx + (b.vy + b.spin * rbx - a.vy - a.spin * rax) * ny;
      if (c.fresh && -vn > c.speed) c.speed = -vn;
      // a gap it won't close this substep may close; a hit (now, or within the gap this substep) bounces; an overlap parts
      p.target = p.s > 0 && vn * h >= -p.s ? -p.s / h : Math.max(vn < -30 ? -e * vn : p.s > 0 ? -p.s / h : 0, .2 * Math.max(0, -p.s - SLOP) / h);
    }
  }
  // one pass over a contact's points: friction within its cone, then the push along the normal (never a pull)
  _solve(c) {
    const { a, b, nx, ny } = c, tx = -ny, ty = nx;
    for (const p of c.pts) {
      let rvx = b.vx - b.spin * p.rby - a.vx + a.spin * p.ray, rvy = b.vy + b.spin * p.rbx - a.vy - a.spin * p.rax;
      let d = -(rvx * tx + rvy * ty) * p.mt; const lt = clamp(p.lt + d, -c.mu * p.ln, c.mu * p.ln); d = lt - p.lt; p.lt = lt;
      this._apply(a, b, p, tx * d, ty * d);
      rvx = b.vx - b.spin * p.rby - a.vx + a.spin * p.ray; rvy = b.vy + b.spin * p.rbx - a.vy - a.spin * p.rax;
      d = (p.target - (rvx * nx + rvy * ny)) * p.mn; const ln = Math.max(p.ln + d, 0); d = ln - p.ln; p.ln = ln;
      this._apply(a, b, p, nx * d, ny * d);
    }
  }
  _apply(a, b, p, ix, iy) { a.vx -= ix * a.im; a.vy -= iy * a.im; a.spin -= a.iI * cross(p.rax, p.ray, ix, iy); b.vx += ix * b.im; b.vy += iy * b.im; b.spin += b.iI * cross(p.rbx, p.rby, ix, iy); }
  // how much of this substep's move a fast ball can make before it would touch what it is not already touching
  _toi(b, h) {
    const mx = b.vx * h, my = b.vy * h, L = hyp(mx, my); if (L < b.r * .5) return 1;
    const box = [Math.min(b.box[0], b.box[0] + mx), Math.min(b.box[1], b.box[1] + my), Math.max(b.box[2], b.box[2] + mx), Math.max(b.box[3], b.box[3] + my)];
    const cand = this._near(box, []).concat(this.bodies.filter(o => o.type === 'kinematic' && !o.off && ov(o.box, box, 0)));
    const hit = this._sweep(b.x, b.y, mx, my, b.r, cand, b);
    return hit ? Math.max(0, hit.t - .02 / L) : 1;
  }
  // the first body a point of radius R meets moving by (mx, my) from (x, y): { body, t, x, y }, skipping those it
  // already touches (within MARGIN) and sensors
  _sweep(x, y, mx, my, R, cand, self, mask = 0xffff) {
    let best = null; const L2 = mx * mx + my * my; if (!L2) return null;
    const circle = (cx, cy, rr, o) => { const fx = x - cx, fy = y - cy, c0 = fx * fx + fy * fy - rr * rr; if (c0 < (2 * rr + MARGIN) * MARGIN && self) return; const bq = fx * mx + fy * my; if (bq >= 0) return; const disc = bq * bq - L2 * c0; if (disc < 0) return; const t = (-bq - Math.sqrt(disc)) / L2; if (t >= 0 && t <= 1 && (!best || t < best.t)) best = { body: o, t }; };
    for (const o of cand) {
      if (o === self || o.sensor || o.off || (self ? !(self.layer & o.mask) || !(o.layer & self.mask) : !(o.layer & mask))) continue;
      if (o.shape === 'field') { if (self && o.test(x, y, R + MARGIN)) continue; const st = Math.max(1, Math.ceil(Math.sqrt(L2) / Math.max(1, R * .5))); for (let k = 1; k <= st; k++) { const t = k / st; if (best && t >= best.t) break; const q = o.test(x + mx * t, y + my * t, R); if (q && q[2] > 0) { best = { body: o, t: (k - 1) / st }; break; } } continue; }
      if (!o.local) { circle(o.x, o.y, R + o.r, o); continue; }
      const V = o.wv, N = o.wn, n = V.length, rr = R + o.r;
      for (let i = 0; i < n; i++) {
        const v = V[i], nn = N[i], d0 = nn[0] * (x - v[0]) + nn[1] * (y - v[1]), dm = nn[0] * mx + nn[1] * my;
        if (dm < 0 && d0 >= rr + (self ? MARGIN : 0)) {
          const t = (rr - d0) / dm; if (t > 1 || (best && t >= best.t)) continue;
          const w = V[(i + 1) % n], qx = x + mx * t - nn[0] * rr, qy = y + my * t - nn[1] * rr, ex = w[0] - v[0], ey = w[1] - v[1], u = ((qx - v[0]) * ex + (qy - v[1]) * ey) / (ex * ex + ey * ey || 1);
          if (u >= 0 && u <= 1) best = { body: o, t };
        }
        circle(v[0], v[1], rr, o);
      }
    }
    if (best) { best.x = x + mx * best.t; best.y = y + my * best.t; }
    return best;
  }
  /** the nearest body along the line from a to b (sensors aside; mask: the layers it sees): { body, x, y, t } or null */
  ray(a, b, mask = 0xffff) { if (!this._grid) this._build(); const box = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; return this._sweep(a[0], a[1], b[0] - a[0], b[1] - a[1], 0, this._near(box, []).concat(this.bodies.filter(o => o.type !== 'static' && ov(o.box, box, 0))), null, mask); }
  /** the bodies over a point */
  query(x, y) {
    return this.bodies.filter(o => {
      if (o.off || o.shape === 'field') return o.shape === 'field' && !!o.test(x, y, 0);
      if (!o.local) return hyp(x - o.x, y - o.y) <= o.r;
      let best = -Infinity; for (let i = 0; i < o.wv.length; i++) best = Math.max(best, o.wn[i][0] * (x - o.wv[i][0]) + o.wn[i][1] * (y - o.wv[i][1]));
      return best <= o.r;
    });
  }
  /** a number for the world now: every body's place, angle and speed (a proof's hash) */
  hash() { let h = 2166136261; const s = this.bodies.map(b => [b.id, Math.round(b.x * 100), Math.round(b.y * 100), Math.round(b.angle * 1000), Math.round(b.vx * 10), Math.round(b.vy * 10), b.sleeping ? 1 : 0].join(',')).join(';'); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  /** outline every body into g (to(x, y) -> [sx, sy]: the plane on the screen; its identity by default) */
  draw(g, to = (x, y) => [x, y], color = '#7cf2a0') {
    g.save(); g.strokeStyle = color; g.lineWidth = 1;
    for (const b of this.bodies) {
      if (b.off || b.shape === 'field') continue; g.globalAlpha = b.sleeping ? .4 : b.sensor ? .5 : 1; g.beginPath();
      if (!b.local) { for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, [sx, sy] = to(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); } const [cx, cy] = to(b.x, b.y), [ex, ey] = to(b.x + Math.cos(b.angle) * b.r, b.y + Math.sin(b.angle) * b.r); g.moveTo(cx, cy); g.lineTo(ex, ey); }
      else { b.wv.forEach((v, i) => { const [sx, sy] = to(v[0], v[1]); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); if (b.wv.length > 2) g.closePath(); }
      g.stroke();
    }
    g.restore();
  }
  /* ---- a pinball's parts ---- */
  /** a flipper: a kinematic tapered bar from its pivot (x, y); flip(on) swings it up or back (see the manual) */
  flipper(x, y, o = {}) {
    const s = o.side === 'right' ? -1 : 1, L = (o.len || 34) * s, r0 = o.r0 || 5, r1 = o.r1 || 3, P = [], rest = (o.rest !== undefined ? o.rest : .45) * s, up = (o.up !== undefined ? o.up : -.45) * s;
    for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + i / 6 * Math.PI; P.push([Math.cos(a) * r0 * s, Math.sin(a) * r0]); }   // (the pivot's round end, then the tip's)
    for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI; P.push([L + Math.cos(a) * r1 * s, Math.sin(a) * r1]); }
    const b = this.add(Object.assign({ type: 'kinematic', shape: 'poly', points: P, x, y, angle: rest, bounce: .25, friction: .3 }, o.body));
    /** rest, up: its angles at rest and flipped; turn: how fast it swings (radians a second); flip(on): up or back */
    b.rest = rest; b.up = up; b.turn = o.speed || 30; b.flip = on => { b.to = { angle: on ? b.up : b.rest, turn: b.turn }; };
    b.flip(false); return b;
  }
  /** a bumper: a static round post that kicks a ball away (kick: pixels a second) */
  bumper(x, y, r, o = {}) { return this.circle(x, y, r, Object.assign({ type: 'static', kick: 260, bounce: .5 }, o)); }
  /** a slingshot: a static segment that kicks a ball off it */
  slingshot(a, b, o = {}) { return this.segment(a, b, Object.assign({ kick: 220, bounce: .4, r: 1 }, o)); }
  /** a kicker: a sensor that catches a ball, holds it, then fires it (a saucer, a kickback); k.catch.armed */
  kicker(x, y, o = {}) { const k = this.circle(x, y, o.r || 6, { type: 'static', sensor: true }); k.catch = { hold: o.hold !== undefined ? o.hold : .6, dir: o.dir || [0, -1], power: o.power || 700, armed: o.armed !== false }; return k; }
}
E.Physics = Physics;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
