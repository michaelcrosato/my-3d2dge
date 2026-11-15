/*!
my-3D2dge module MODE7 v0.101.0: a perspective floor drawn a row at a time, a sky that turns with it, everything on it scaled by its distance
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

Super Mario Kart's, F-Zero's and Pilotwings' view (the SNES's Mode 7): a camera at a height over a flat floor, looking
along a heading, pitched down; the floor drawn a screen row at a time, the sky above the horizon, and on the floor
billboards (rigs drawn at the size their distance gives, sprites, models, your own drawing) far to near.
- const m7 = new E.Mode7({ floor: a TileMap (its floorTex) | (x, y) => [r, g, b] | a canvas, size: [w, h] (the floor in
  world units, for a function), texel: 1 (world units a texel: 8 bakes a big world small), outside: '#24402a' (beyond
  the floor) | wrap: true (it repeats), sky: a Backdrop (full engine) | ['#top', '#bottom'], fog: { color, near, far }
  (far: nothing past it), far: 2400, curve: R (the floor a globe of radius R that bends away to a horizon of its own:
  Final Fantasy's airship, a bonus planet; with wrap: true) }).
- m7.cam = { x, y, h: 40 (height), angle: 0 (the heading, as E.angleTo gives it: 0 east, PI / 2 south; keep it
  unwrapped, the sky turns with it), pitch: 12 (degrees down; - looks up; 90 straight down: the floor turns and scales
  flat, Contra III's top-down stages), fov: 70 (degrees across the height), roll: 0 (degrees the camera banks, + to its
  right: the horizon tilts, After Burner's turns) }; m7.chase(body, { back: 56, h: 34, angle }) puts it behind a body
  (body.angle, or angle) each step: back 0 and a low h is first person.
- In draw: m7.rig(rig, x, y, z), m7.sprite(spr or E.anim, x, y, z, { scale, flip, t, target }), m7.shape(id, x, y, z,
  { facing, size, params, mats }) (full engine), m7.mesh(model, x, y, z, o) (the mesh module's E.Mesh, o its draw's:
  yaw, pitch, roll, colors, target), m7.quad([[x, y, z], ...], color, target, layer) (a wall, a sign: a flat polygon in
  the world; one lying flat sorts by its far edge; layer -1 draws it first: pillars under a raised track), m7.add(x, y,
  z, (g, sx, sy, k) => ..., { target, w, h }) gather what is drawn (k: screen pixels per world unit there); m7.draw(r,
  cam) draws sky, floor, fog and them, far to near, as an overlay (in a split screen, in r.viewport: give each player's
  cam).
- m7.pick(sx, sy) -> { target, k } nearest under a screen point in the view last drawn (a target's box: a sprite's or
  model's drawn size, add's w x h units over its foot; a quad blocks what is behind it), or null; m7.pick(sx, sy, [{ x,
  y, z, w, h, target }]) tests those boxes through the camera begun, nothing drawn: a light gun's shot that replays
  (m7.begin({ W: game.W, H: game.H }, cam) in update first).
- m7.project(x, y, z) -> [sx, sy, k] on the screen, or null behind the camera (or past a globe's edge); m7.toFloor(sx,
  sy) -> [x, y], or null above the horizon (both for the camera last drawn: HUD markers, a tap on the track).
  m7.horizon: its screen row (unrolled).
- Your own pass: m7.begin({ W, H, x, y, cx, cy, focal }, cam), then project, rowDepth(sy), drawFloor(g, rect),
  view(k) (the engine view a rig is drawn with at k).
- Resolution: the game's own pixels by default, as the SNES drew; m7.fullRes(game, true) each step draws at the
  screen's own (sharper, slower; it returns the pixel size the game had), false gives the game's pixels back.

```js mode7
const E = My3D2dge, m7 = new E.Mode7({ floor: (x, y) => ((x >> 4) + (y >> 4)) & 1 ? [80, 160, 80] : [60, 130, 60], size: [512, 512] });
m7.cam = { x: 256, y: 400, h: 40, angle: -Math.PI / 2, pitch: 12, fov: 70 };
m7.begin({ W: 320, H: 240 });
const p = m7.project(256, 300, 0), q = m7.toFloor(p[0], p[1]);
if (Math.abs(q[0] - 256) > .01 || Math.abs(q[1] - 300) > .01 || p[1] <= m7.horizon) throw new Error('a floor point and back');
```
Rules: m7.draw covers its viewport (draw nothing under it you need to see); move the camera in update, not draw; a
body's angle and the camera's heading are the same angle; billboards are gathered again every frame; a rolled view
turns its pixels (the HUD stays level).
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module MODE7: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * MODE 7  a perspective floor a row at a time, its sky, billboards scaled by distance
 * ========================================================================== */
const { clamp } = E;
// cos and sin, exact at the quarter turns (a camera looking due north projects as the stress test always did)
const trig = a => { let c = Math.cos(a), s = Math.sin(a); if (Math.abs(c) < 1e-12) c = 0; if (Math.abs(s) < 1e-12) s = 0; return [c, s]; };
class Mode7 {
  /** new E.Mode7({ floor, size, texel, outside, wrap, sky, fog, far, curve }): a Mode 7 view (the manual above) */
  constructor(o = {}) {
    /** o: its options */
    this.o = Object.assign({ outside: '#24402a', far: 2400, sky: ['#1a3060', '#7aa8e0'], texel: 1 }, o);
    /** cam: the camera ({ x, y, h, angle, pitch, fov, roll }); horizon: the screen row of the horizon in the last drawing;
     *  items: the billboards gathered for the next draw */
    this.cam = { x: 0, y: 0, h: 40, angle: 0, pitch: 12, fov: 70 }; this.horizon = 0; this.items = [];
    this._P = { x: 0, y: 0, h: 40, fx: 0, fy: -1, rx: 1, ry: 0, cp: 1, sp: 0, f: 1, cx: 0, cy: 0, W: 0, H: 0, vx: 0, vy: 0, cr: 1, sr: 0, R: 0, lim: 0, ww: 0, wh: 0 };
    this._views = new Map(); this._shapes = new Map(); this._tex = null; this._buf = null; this._a = 0; this._pd = 12; this._t = 0;
    this._seen = []; this._last = []; this._pt = null;
  }
  /** the camera behind a body each step: back units behind it, h high, looking along its angle (o.angle to set one) */
  chase(b, o = {}) {
    const a = o.angle !== undefined ? o.angle : b.angle || 0, back = o.back === undefined ? 56 : o.back, [c, s] = trig(a);
    Object.assign(this.cam, { x: b.x - c * back, y: b.y - s * back, h: o.h === undefined ? 34 : o.h, angle: a });
    return this.cam;
  }
  /** set up the projection for a camera (default this.cam) and a rectangle of the screen ({ W, H, x, y, cx, cy }: its
   *  size, its top left and its centre; focal: screen pixels per unit at a distance of one, instead of the fov) */
  begin(rect = {}, cam = this.cam) {
    const P = this._P, W = rect.W, H = rect.H, pd = cam.pitch === undefined ? 12 : cam.pitch, pitch = pd * Math.PI / 180, [fx, fy] = trig(cam.angle || 0), roll = (cam.roll || 0) * Math.PI / 180;
    Object.assign(P, { x: cam.x, y: cam.y, h: cam.h, fx, fy, rx: -fy, ry: fx, cp: Math.cos(pitch), sp: Math.sin(pitch), W, H, vx: rect.x || 0, vy: rect.y || 0, cr: roll ? Math.cos(roll) : 1, sr: roll ? Math.sin(roll) : 0 });
    P.f = rect.focal || H / 2 / Math.tan((cam.fov || 70) * Math.PI / 360);
    P.cx = rect.cx === undefined ? P.vx + W / 2 : rect.cx; P.cy = rect.cy === undefined ? P.vy + H / 2 : rect.cy;
    const R = this.o.curve || 0, T = this.o.texel || 1, F = R && this.o.wrap ? this._texture() : null;
    P.R = R; P.lim = R ? Math.acos(R / (R + Math.max(.01, cam.h))) : 0; P.ww = F ? F.width * T : 0; P.wh = F ? F.height * T : 0;
    this.horizon = P.cy - P.f * P.sp / P.cp; this._a = cam.angle || 0; this._pd = pd;
    return this;
  }
  /** a world point -> [screen x, screen y, screen pixels per unit there], or null at or behind the camera (or past a
   *  globe's edge) */
  project(x, y, z = 0) {
    const P = this._P; let dx = x - P.x, dy = y - P.y, dz = z - P.h;
    if (P.R) {   // on a globe: the point set on the sphere by its distance over the floor (the nearest copy where it repeats)
      if (P.ww) { dx -= Math.round(dx / P.ww) * P.ww; dy -= Math.round(dy / P.wh) * P.wh; }
      const s = Math.hypot(dx, dy), th = s / P.R, rz = P.R + z;
      if (!P.all && th > P.lim + Math.acos(Math.min(1, P.R / Math.max(P.R, rz)))) return null;   // (P.all: a model past the edge, drawn before the floor)
      const k = s ? rz * Math.sin(th) / s : 0; dx *= k; dy *= k; dz = rz * Math.cos(th) - P.R - P.h;
    }
    const D = dx * P.fx + dy * P.fy, L = dx * P.rx + dy * P.ry, zc = D * P.cp - dz * P.sp;
    if (zc < 6) return null;
    const k = P.f / zc; if (!P.sr) return [P.cx + L * k, P.cy - (D * P.sp + dz * P.cp) * k, k];
    const u = L * k, v = -(D * P.sp + dz * P.cp) * k; return [P.cx + u * P.cr + v * P.sr, P.cy - u * P.sr + v * P.cr, k];
  }
  /** a screen row's floor distance ahead of the camera, or 0 at or above the horizon (a flat floor, unrolled) */
  rowDepth(sy) {
    const P = this._P, k = (P.cy - sy) / P.f, den = P.sp - k * P.cp; if (den <= 1e-4) return 0;
    return P.h * (P.cp + k * P.sp) / den;
  }
  /** a screen point -> the floor point under it [x, y], or null above the horizon */
  toFloor(sx, sy) {
    const P = this._P;
    if (!P.sr && !P.R) { const D = this.rowDepth(sy); if (!D) return null; const L = (sx - P.cx) * (D * P.cp + P.h * P.sp) / P.f; return [P.x + P.fx * D + P.rx * L, P.y + P.fy * D + P.ry * L]; }
    const du = sx - P.cx, dv = sy - P.cy, u = du * P.cr - dv * P.sr, v = du * P.sr + dv * P.cr;   // (the roll undone)
    if (P.R) { const q = this._globe(u, v); return q && [q[0], q[1]]; }
    const D = this.rowDepth(P.cy + v); if (!D) return null;
    const L = u * (D * P.cp + P.h * P.sp) / P.f; return [P.x + P.fx * D + P.rx * L, P.y + P.fy * D + P.ry * L];
  }
  // the globe under an unrolled screen offset (u, v) from the centre: [x, y, distance over the floor], or null (the sky)
  _globe(u, v) {
    const P = this._P, R = P.R, h = P.h, dx = P.fx * P.cp * P.f + P.rx * u - P.fx * P.sp * v, dy = P.fy * P.cp * P.f + P.ry * u - P.fy * P.sp * v, dz = -P.sp * P.f - P.cp * v;
    const a = P.f * P.f + u * u + v * v, b = dz * (h + R), disc = b * b - a * h * (2 * R + h); if (b >= 0 || disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / a, px = t * dx, py = t * dy, rho = Math.hypot(px, py), s = R * Math.atan2(rho, h + t * dz + R), m = rho > 1e-9 ? s / rho : 0;
    return [P.x + px * m, P.y + py * m, s];
  }
  /** gather a billboard: fn(g, sx, sy, k) draws it with its foot at (sx, sy), k screen pixels per unit; hit: { target, w,
   *  h } gives m7.pick its box (w x h world units over its foot); everything sorts by its depth from the camera (one under
   *  another behind it); deep: it draws its own shape, each point projected (models and quads are), so on a globe it is
   *  kept with its foot past the edge, what stands above the edge shown; layer: a lower one is drawn first */
  add(x, y, z, fn, hit, deep, layer) { this.items.push({ x, y, z: z || 0, fn, hit: hit || null, deep: !!deep, layer: layer || 0 }); return this; }
  /** gather a rig, drawn by the engine at the size its distance gives, from the camera's side (it faces rig.facing) */
  rig(rig, x, y, z = 0) { return this.add(x, y, z, (g, sx, sy, k) => rig.draw(g, Math.round(sx), Math.round(sy), this.view(k))); }
  /** gather a sprite (E.sprite, or E.anim's frames at o.t, the game's time by default), its foot at the point: o.scale
   *  (world units a sprite pixel, 1), o.flip, o.target (m7.pick finds it by the box it was drawn in) */
  sprite(spr, x, y, z = 0, o = {}) {
    return this.add(x, y, z, (g, sx, sy, k) => {
      const sp = spr.isAnim ? spr.frame(o.t === undefined ? this._t : o.t) : spr, s = k * (o.scale || 1), w = sp.w * s, h = sp.h * s; if (w < .5) return;
      g.drawImage(o.flip ? sp.fl : sp.cv, Math.round(sx - w / 2), Math.round(sy - h), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
      if (o.target !== undefined) this._seen.push({ target: o.target, k, box: [sx - w / 2, sy - h, w, h] });
    });
  }
  /** gather one of the engine's shapes (r.shape's: 'barrel', 'tree', ...; the full engine), seen from the camera's side at
   *  its distance's size: o.facing (radians), o.size (1), o.params and o.mats (as r.shape's: a door's angle, a crate's wood) */
  shape(id, x, y, z = 0, o = {}) {
    const extra = o.params || o.mats ? ':' + JSON.stringify([o.params || null, o.mats || null]) : '';   // (each look a sprite of its own)
    return this.add(x, y, z, (g, sx, sy, k) => {
      const v = this.view(k), f = Math.round((o.facing === undefined ? Math.PI / 2 : o.facing) / Math.PI * 8) / 8 * Math.PI, key = id + ':' + v.scale + ':' + v.yawDeg + ':' + v.pitchDeg + ':' + f + ':' + (o.size || 1) + extra;
      let sp = this._shapes.get(key); if (sp === undefined) { if (this._shapes.size > 300) this._shapes.clear(); sp = E.shapeSprite ? E.shapeSprite(id, { view: v, facing: f, size: o.size || 1, params: o.params, mats: o.mats }) : null; this._shapes.set(key, sp); }
      if (sp) g.drawImage(sp.cv, Math.round(sx - sp.foot[0]), Math.round(sy - sp.foot[1]));
    });
  }
  /** gather a model (the mesh module's E.Mesh, or any { draw(g, project, o) }) at (x, y, z), drawn through this camera:
   *  o as its draw takes (yaw, pitch, roll, scale, colors), o.target (m7.pick finds it by the box it was drawn in) */
  mesh(model, x, y, z = 0, o = {}) {
    return this.add(x, y, z, (g, sx, sy, k) => {
      const a = g.globalAlpha, fog = this.o.fog; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const pr = (X, Y, Z) => { const p = this.project(X, Y, Z); if (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return p; };
      g.globalAlpha = 1;   // (fog mixes a model's colors: faces see-through would show the ones behind them)
      model.draw(g, pr, Object.assign({}, o, { x, y, z, mix: a < 1 && fog ? [fog.color || '#a8c0e0', (1 - a) * .9] : o.mix }));
      g.globalAlpha = a; E.px.reset(g);
      if (o.target !== undefined && x1 >= x0) this._seen.push({ target: o.target, k, box: [x0, y0, x1 - x0, y1 - y0] });
    }, null, true);
  }
  // a polygon cut where it crosses the camera's near plane (a flat floor's camera), projected: null if nothing is left
  _clip(pts) {
    const P = this._P, N = 6.5, w = pts.map(p => { const z = p[2] || 0; return [p[0], p[1], z, ((p[0] - P.x) * P.fx + (p[1] - P.y) * P.fy) * P.cp - (z - P.h) * P.sp]; }), out = [];
    for (let i = 0; i < w.length; i++) {
      const a = w[i], b = w[(i + 1) % w.length]; if (a[3] >= N) out.push(a);
      if ((a[3] >= N) !== (b[3] >= N)) { const t = (N - a[3]) / (b[3] - a[3]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
    }
    const q = out.length > 2 && out.map(p => this.project(p[0], p[1], p[2])); return q && !q.some(p => !p) ? q : null;
  }
  /** gather a flat polygon in the world ([[x, y, z], ...]: a wall, a fence, a sign), sorted with the billboards by its
   *  middle's depth (one lying flat, a floor or a track, by its far edge: what stands on it draws over it); target:
   *  m7.pick finds it (null: it only blocks what is behind it); layer -1: drawn before the rest (a pillar under a raised
   *  track, which no sort by depth keeps behind it) */
  quad(pts, color, target = null, layer = 0) {
    const n = pts.length, c = pts.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + (p[2] || 0) / n], [0, 0, 0]);
    const u = [0, 1, 2].map(i => (pts[1][i] || 0) - (pts[0][i] || 0)), v = [0, 1, 2].map(i => (pts[n - 1][i] || 0) - (pts[0][i] || 0)), nz = u[0] * v[1] - u[1] * v[0];
    const flat = Math.abs(nz) > .7 * Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], nz);   // (its normal within 45 degrees of up)
    this.add(c[0], c[1], c[2], (g, sx, sy, k) => {
      let q = pts.map(p => this.project(p[0], p[1], p[2] || 0));
      if (q.some(p => !p)) { if (this._P.R) return; q = this._clip(pts); if (!q) return; }   // (crossing the near plane: cut there, not dropped)
      const a = g.globalAlpha, fog = this.o.fog; g.globalAlpha = 1;   // (a wall shows nothing behind it, so fog mixes its color)
      E.px.poly(g, q.map(p => [p[0], p[1]]), a < 1 && fog ? E.mix(color, fog.color || '#a8c0e0', (1 - a) * .9) : color);
      g.globalAlpha = a; E.px.reset(g); this._seen.push({ target, k: flat ? Math.min(...q.map(v => v[2])) : k, poly: q });   // (a floor as deep as its far edge: what stands on it is picked first)
    }, null, true, layer);
    const it = this.items[this.items.length - 1]; it.pts = pts; if (flat) it.floor = pts;
    return this;
  }
  /** what was drawn under a screen point (sx, sy) in the view last drawn, nearest first: { target, k }, or null; with a
   *  list ([{ x, y, z, w, h, target }]: boxes w x h world units over those feet), those boxes through the camera begun,
   *  nothing drawn (gameplay that replays: m7.begin(rect, cam) in update first) */
  pick(sx, sy, list) {
    if (list) {   // (a rolled camera: the shot and each foot turned back level, where the box stands upright as draw drew it)
      const P = this._P, lv = (x, y) => { const du = x - P.cx, dv = y - P.cy; return [P.cx + du * P.cr - dv * P.sr, P.cy + du * P.sr + dv * P.cr]; }, [x, y] = P.sr ? lv(sx, sy) : [sx, sy]; let best = null;
      for (const q of list) { const p = this.project(q.x, q.y, q.z || 0); if (!p) continue; const [fx, fy] = P.sr ? lv(p[0], p[1]) : p, w = (q.w || 16) * p[2], h = (q.h || 16) * p[2]; if (x >= fx - w / 2 && x < fx + w / 2 && y >= fy - h && y < fy && (!best || p[2] > best.k)) best = { target: q.target === undefined ? null : q.target, k: p[2] }; }
      return best;
    }
    const T = this._pt; let x = sx, y = sy;
    if (T) { const du = sx - T.rx, dv = sy - T.ry; x = T.cx + du * T.cr - dv * T.sr; y = T.cy + du * T.sr + dv * T.cr; }   // (into the unrolled picture)
    const inPoly = (P, px, py) => { let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > py) !== (P[j][1] > py) && px < (P[j][0] - P[i][0]) * (py - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside; return inside; };
    let best = null;
    for (const s of this._last) if ((s.box ? x >= s.box[0] && x < s.box[0] + s.box[2] && y >= s.box[1] && y < s.box[1] + s.box[3] : inPoly(s.poly, x, y)) && (!best || s.k > best.k)) best = s;
    return best && { target: best.target, k: best.k };
  }
  /** the engine view a rig is drawn with at k pixels per unit, seen from the camera's heading (sixteenths, reused) and
   *  pitch (whole degrees: a bobbing camera makes no new view each frame) */
  view(k) {
    const q = Math.max(1 / 8, Math.round(k * 16) / 16), yaw = (Math.round((-this._a * 180 / Math.PI - 90) * 2) / 2) || 0, pd = Math.round(this._pd), key = q + ':' + yaw + ':' + pd;
    let v = this._views.get(key); if (!v) { if (this._views.size > 400) this._views.clear(); v = new E.View('mode7', 'Mode 7', yaw, pd, q, 1); this._views.set(key, v); }
    return v;
  }
  /** draw the view as an overlay over r's frame (in a split screen, r.viewport's part): sky, floor, fog, then the
   *  billboards far to near (gathered with add, rig, sprite, mesh, quad; they are used up) */
  draw(r, cam = this.cam) {
    const vp = r.viewport || { x: 0, y: 0, w: r.bw, h: r.bh }, items = this.items.splice(0), sc = r.game.screen, whole = !r.viewport, roll = (cam.roll || 0) * Math.PI / 180;
    r.overlay(g => {
      const rect = { W: whole ? r.W : vp.w, H: whole ? r.H : vp.h, x: vp.x, y: vp.y, cx: whole ? r.W / 2 + sc.fx : vp.x + vp.w / 2, cy: whole ? r.H / 2 + sc.fy : vp.y + vp.h / 2 };
      this._t = r.game.time; this._seen = [];
      // drawn on a canvas of the viewport's size (moved so screen points land on it), then onto the frame
      const c = this._out && this._out.width === vp.w && this._out.height === vp.h ? this._out : (this._out = E.mkCanvas(vp.w, vp.h)), cg = E.ctx2d(c);
      if (!roll) {
        this.begin(rect, cam); this._pt = null;
        cg.setTransform(1, 0, 0, 1, -vp.x, -vp.y); this._scene(cg, r, vp, items);
      } else {   // rolled: drawn level on a canvas big enough to cover the viewport once turned, then turned onto it
        const ca = Math.abs(Math.cos(roll)), sa = Math.abs(Math.sin(roll)), ox = rect.cx - vp.x - vp.w / 2, oy = rect.cy - vp.y - vp.h / 2, m = 4 + 2 * (Math.abs(ox) + Math.abs(oy));
        const W2 = Math.ceil(vp.w * ca + vp.h * sa + m), H2 = Math.ceil(vp.w * sa + vp.h * ca + m), U = this._lvl && this._lvl.width === W2 && this._lvl.height === H2 ? this._lvl : (this._lvl = E.mkCanvas(W2, H2)), ug = E.ctx2d(U);
        const lv = { x: 0, y: 0, w: W2, h: H2 }, cx2 = W2 / 2 + ox, cy2 = H2 / 2 + oy;
        this.begin({ W: W2, H: H2, x: 0, y: 0, cx: cx2, cy: cy2, focal: rect.H / 2 / Math.tan((cam.fov || 70) * Math.PI / 360) }, cam);
        const P = this._P; P.cr = 1; P.sr = 0;
        const sky = this.o.sky, low = Array.isArray(sky) ? sky[sky.length - 1] : sky.sky ? sky.sky[sky.sky.length - 1] : this.o.outside;   // (under all: the sky's lowest color, so the horizon's row has no seam)
        ug.setTransform(1, 0, 0, 1, 0, 0); E.px.rect(ug, 0, 0, W2, H2, low); E.px.reset(ug); this._scene(ug, r, lv, items);
        cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, vp.w, vp.h); cg.setTransform(1, 0, 0, 1, rect.cx - vp.x, rect.cy - vp.y); cg.rotate(-roll); cg.imageSmoothingEnabled = false; cg.drawImage(U, -cx2, -cy2);
        this.begin(rect, cam); this._pt = { cx: cx2, cy: cy2, rx: rect.cx, ry: rect.cy, cr: P.cr, sr: P.sr };   // (project and pick on the turned screen)
      }
      this._last = this._seen; cg.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, vp.x, vp.y);
    });
    return this;
  }
  // sky, floor and the billboards far to near on g, over the rectangle vp, for the projection begun
  _scene(cg, r, vp, items) {
    this.drawSky(cg, r, vp);
    if (this.o.curve) { const sky = this.o.sky, H0 = Math.round(clamp(this.horizon, vp.y, vp.y + vp.h)); E.px.rect(cg, vp.x, H0, vp.w, vp.y + vp.h - H0, Array.isArray(sky) ? sky[sky.length - 1] : this.o.outside); }   // (a globe's edge shows the sky below the horizon)
    const P = this._P, fog = this.o.fog, far = fog && fog.far || this.o.far, list = [], past = [];
    for (const it of items) {
      let p = this.project(it.x, it.y, it.z), L = list;
      if (!p && it.pts) for (const q of it.pts) { const pq = this.project(q[0], q[1], q[2] || 0); if (pq && (!p || pq[2] < p[2])) p = pq; }   // (a quad whose middle is behind the camera: by its farthest corner in view, cut at the near plane as it is drawn)
      if (!p && P.R && it.deep) { P.all = true; p = this.project(it.x, it.y, it.z); P.all = false; L = past; }   // (a model or a quad whose foot is past a globe's edge: drawn before the floor, which hides what the globe hides)
      if (!p || !it.pts && (p[0] < vp.x - 200 || p[0] > vp.x + vp.w + 200)) continue;
      const f = P.f / p[2]; let d = f, n = f;   // (everything by its depth from the camera, models, quads and billboards alike: one under another sorts behind it)
      if (it.floor) for (const q of it.floor) { const pq = this.project(q[0], q[1], q[2] || 0); if (pq) { d = Math.max(d, P.f / pq[2]); n = Math.min(n, P.f / pq[2]); } }   // (a floor sorts by its far edge, is cut by its near one)
      if (n <= far) L.push([d, it, p, f]);
    }
    const paint = L => { L.sort((a, b) => a[1].layer - b[1].layer || b[0] - a[0]);   // (a lower layer first: what stands under a track)
      for (const [d, it, p, f] of L) {
        cg.globalAlpha = fog ? clamp(1 - (f - (fog.near || 0)) / (far - (fog.near || 0)) * .8, .2, 1) : 1; E.px.reset(cg); it.fn(cg, p[0], p[1], p[2]);   // (the color cache forgotten: the floor and the sky set colors directly)
        const h = it.hit; if (h) this._seen.push({ target: h.target, k: p[2], box: [p[0] - (h.w || 16) * p[2] / 2, p[1] - (h.h || 16) * p[2], (h.w || 16) * p[2], (h.h || 16) * p[2]] });
      }
    };
    if (past.length) { P.all = true; paint(past); P.all = false; }
    this.drawFloor(cg, vp); paint(list);
    cg.globalAlpha = 1;
  }
  /** the sky above the horizon: a Backdrop turned with the heading, or a gradient of two colors */
  drawSky(g, r, vp) {
    const H0 = Math.round(clamp(this.horizon, vp.y, vp.y + vp.h)) - vp.y, sky = this.o.sky; if (H0 <= 0) return;
    if (Array.isArray(sky)) { const gr = g.createLinearGradient(0, vp.y, 0, vp.y + H0); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1] || sky[0]); g.fillStyle = gr; g.fillRect(vp.x, vp.y, vp.w, H0); return; }
    const c = this._sky || (this._sky = E.mkCanvas(vp.w, H0)); if (c.width !== vp.w || c.height !== H0) { c.width = vp.w; c.height = H0; }
    // the Backdrop drawn on its own canvas through a stand-in for r: a turn of a radian moves a layer of parallax .1
    // by the focal length, as far scenery moves
    const turn = this._a * this._P.f * 10, val = value => ({ value });
    sky.draw(Object.create(r, { ctx: val(E.ctx2d(c)), bw: val(vp.w), bh: val(H0), W: val(vp.w), H: val(H0), ix: val(turn), iy: val(0) }));
    g.drawImage(c, vp.x, vp.y);
  }
  // the floor's texture: a canvas, or one baked from a TileMap's floor or a color function (a texel a unit, or o.texel)
  _texture() {
    if (this._tex) return this._tex;
    const f = this.o.floor; if (f && f.getContext) return (this._tex = f);
    const map = f && f.w && f.T ? f : null, T = map ? 1 : this.o.texel || 1, W = map ? map.w * map.T : Math.round((this.o.size || [256, 256])[0] / T), H = map ? map.h * map.T : Math.round((this.o.size || [256, 256])[1] / T);
    const cv = E.mkCanvas(W, H), g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = map ? (map.cell(Math.floor(x / map.T), Math.floor(y / map.T)) === 0 ? map.floorTex(x + .5, y + .5, map.floorAt(x + .5, y + .5)) : null) : f((x + .5) * T, (y + .5) * T);
      if (!c) continue; const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return (this._tex = cv);
  }
  /** forget the floor's baked texture (after changing the map or the function: it bakes again) */
  refresh() { this._tex = null; this._px = null; return this; }
  /** draw the floor below the horizon in the rectangle ({ x, y, w, h }), a row at a time, and the fog over it */
  drawFloor(g, vp) {
    const P = this._P, F = this._texture(), TW = F.width, TH = F.height, o = this.o, fog = o.fog, far = fog && fog.far || o.far, iT = 1 / (o.texel || 1);
    if (P.R) return this._globeFloor(g, vp, F);
    const top = Math.max(vp.y, Math.ceil(P.cy - P.f * P.sp / P.cp)), bot = vp.y + vp.h; if (bot <= top) return;
    g.fillStyle = o.outside; g.fillRect(vp.x, top, vp.w, bot - top);
    if (P.fx === 0 && P.fy === -1 && !o.wrap) {   // due north: each row a strip of the texture stretched across (the fast path)
      for (let by = top; by < bot; by++) {
        const D = this.rowDepth(by + .5); if (!D || D > far) continue;
        const y = (P.y - D) * iT; if (y < 0 || y >= TH) continue;
        const u = (D * P.cp + P.h * P.sp) / P.f; g.drawImage(F, (P.x - (P.cx - vp.x) * u) * iT, Math.floor(y), vp.w * u * iT, 1, vp.x, by, vp.w, 1);
      }
    } else {   // any heading: each row's pixels sampled along the floor's line under it
      if (!this._px) this._px = new Uint32Array(F.getContext('2d').getImageData(0, 0, TW, TH).data.buffer);
      const T = this._px, w = vp.w, h = bot - top;
      const B = this._buf && this._buf.width === w && this._buf.height === h ? this._buf : (this._buf = E.mkCanvas(w, h)), bg = B.getContext('2d'), img = bg.createImageData(w, h), out = new Uint32Array(img.data.buffer);
      const oh = E.hex(o.outside), oc = ((255 << 24) | (oh[2] << 16) | (oh[1] << 8) | oh[0]) >>> 0;
      for (let row = 0; row < h; row++) {
        const D = this.rowDepth(top + row + .5); if (!D || D > far) continue;
        const s = (D * P.cp + P.h * P.sp) / P.f, l0 = (vp.x + .5 - P.cx) * s, ux = P.rx * s * iT, uy = P.ry * s * iT, base = row * w;
        let wx = (P.x + P.fx * D + P.rx * l0) * iT, wy = (P.y + P.fy * D + P.ry * l0) * iT;
        for (let i = 0; i < w; i++, wx += ux, wy += uy) {
          let tx = Math.floor(wx), ty = Math.floor(wy);
          if (o.wrap) { tx = ((tx % TW) + TW) % TW; ty = ((ty % TH) + TH) % TH; } else if (tx < 0 || ty < 0 || tx >= TW || ty >= TH) { out[base + i] = oc; continue; }
          const c = T[ty * TW + tx]; out[base + i] = c >>> 24 ? c : oc;
        }
      }
      bg.putImageData(img, 0, 0); g.drawImage(B, vp.x, top);
    }
    if (fog) {   // the fog: each row mixed toward its color with its distance
      const fc = E.hex(fog.color || '#a8c0e0'), n = fog.near || 0;
      for (let by = top; by < bot; by++) { const D = this.rowDepth(by + .5), a = D ? clamp((D - n) / (far - n), 0, 1) : 1; if (a > .01) { g.fillStyle = `rgba(${fc[0]},${fc[1]},${fc[2]},${a.toFixed(3)})`; g.fillRect(vp.x, by, vp.w, 1); } }
    }
  }
  // a globe's floor: each pixel's ray met with the sphere and laid back onto the floor by its distance over it (its
  // fog mixed in the pixel); what misses it is left clear, for the sky
  _globeFloor(g, vp, F) {
    const P = this._P, o = this.o, fog = o.fog, iT = 1 / (o.texel || 1), TW = F.width, TH = F.height, w = vp.w, h = vp.h, R = P.R, H = P.h;
    if (!this._px) this._px = new Uint32Array(F.getContext('2d').getImageData(0, 0, TW, TH).data.buffer);
    const T = this._px, B = this._buf && this._buf.width === w && this._buf.height === h ? this._buf : (this._buf = E.mkCanvas(w, h)), bg = B.getContext('2d'), img = bg.createImageData(w, h), out = new Uint32Array(img.data.buffer);
    const oh = E.hex(o.outside), oc = ((255 << 24) | (oh[2] << 16) | (oh[1] << 8) | oh[0]) >>> 0, fc = fog && E.hex(fog.color || '#a8c0e0'), fn = fog ? fog.near || 0 : 0, ff = fog ? (fog.far || o.far) - fn : 1;
    const ff2 = P.f * P.f, cterm = H * (2 * R + H), top = Math.max(vp.y, Math.floor(P.cy - P.f * P.sp / P.cp) - 1);
    for (let row = Math.max(0, top - vp.y); row < h; row++) {
      const v = vp.y + row + .5 - P.cy, dz = -P.sp * P.f - P.cp * v, b = dz * (H + R); if (b >= 0) continue;
      const bx = P.fx * P.cp * P.f - P.fx * P.sp * v, by = P.fy * P.cp * P.f - P.fy * P.sp * v, base = row * w, bb = b * b, a0 = ff2 + v * v;
      for (let i = 0; i < w; i++) {
        const u = vp.x + i + .5 - P.cx, a = a0 + u * u, disc = bb - a * cterm; if (disc < 0) continue;
        const t = (-b - Math.sqrt(disc)) / a, px = t * (bx + P.rx * u), py = t * (by + P.ry * u), rho = Math.hypot(px, py), s = R * Math.atan2(rho, H + t * dz + R), m = rho > 1e-9 ? s / rho : 0;
        let tx = Math.floor((P.x + px * m) * iT), ty = Math.floor((P.y + py * m) * iT);
        if (o.wrap) { tx = ((tx % TW) + TW) % TW; ty = ((ty % TH) + TH) % TH; } else if (tx < 0 || ty < 0 || tx >= TW || ty >= TH) { out[base + i] = oc; continue; }
        let c = T[ty * TW + tx]; if (!(c >>> 24)) c = oc;
        if (fog && s > fn) { const k = Math.min(1, (s - fn) / ff), j = 1 - k; c = ((255 << 24) | (((c >>> 16 & 255) * j + fc[2] * k) << 16) | (((c >>> 8 & 255) * j + fc[1] * k) << 8) | ((c & 255) * j + fc[0] * k)) >>> 0; }
        out[base + i] = c;
      }
    }
    bg.putImageData(img, 0, 0); g.drawImage(B, vp.x, vp.y);
  }
  /** draw at the screen's own pixels (on, called each step: sharper, slower) or the game's again (off); returns the
   *  pixel size the game had (1 when it had no other) */
  fullRes(game, on) {
    const sc = game.screen, O = game.o;   // (the game's sizing options: setOptions changes them)
    if (on && sc.S !== 1) {
      if (!this._res) this._res = { minW: O.minW, minH: O.minH, maxW: O.maxW, maxH: O.maxH, portrait: O.portrait, S: sc.S };
      sc.setOptions({ minW: 1e6, minH: 1e6, maxW: 1e6, maxH: 1e6, portrait: { maxH: 1e6 } }); game.cam.snap = true;
    } else if (!on && this._res) { const R = this._res; this._res = null; sc.setOptions({ minW: R.minW, minH: R.minH, maxW: R.maxW, maxH: R.maxH, portrait: R.portrait }); game.cam.snap = true; }
    return this._res ? this._res.S : 1;
  }
}
E.Mode7 = Mode7;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
