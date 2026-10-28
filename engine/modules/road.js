/*!
my-3D2dge module ROAD v0.70.0: the pseudo-3D road: segments with curves and hills, lanes, rumble strips, roadside scenery, tunnels
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

OutRun's, Pole Position's, Hang-On's and Road Rash's view: the road a run of short segments, each a band of grass, rumble
and road drawn smaller with its distance, bending and rising, and what stands beside it scaled the same way.
- const road = new E.Road({ segment: 200 (a segment's length, world units), width: 2000 (half the road), lanes: 3,
  rumble: 3 (segments a stripe), draw: 240 (segments ahead), fov: 100, height: 1000 (the camera over the road), colors:
  { road: [a, b], grass: [a, b], rumble: [a, b], lane, wall: [a, b], roof, portal }, fog: { color, density: 5 } | null, sky:
  a Backdrop | '#color' }).
- Build it: road.add(n, { curve: -6..6 (+ bends right), hill: units up (- down) over the n segments, tunnel: true,
  colors }) (curves eased in and out); road.place(z, offset, what, scale): scenery at distance z, offset across (-1
  and 1: the road's edges; beyond: roadside); what: an E.sprite or E.anim (scale: world units a pixel, 8) or {
  draw(g, sx, sy, scale), w: its width in units }. road.length: the lap (it loops).
- Each frame: road.draw(r, { z (the camera's distance along), x (across, in half roads), h (its height over the road),
  turn (the sky's offset: add curve * speed each step), cars: [{ z, x, w, draw(g, sx, sy, scale) }] }) as an overlay
  over the frame (in a split screen, in r.viewport). A hill's crest hides what lies past it. The player's car, drawn
  at the screen's bottom, is road.ahead(h) past z.
- For the game: road.curveAt(z) (how hard it bends there: the push outward), road.yAt(z) (its height), road.hits(z, x,
  w) (the scenery a body w half roads wide touches there), road.project(z, x, y) -> [sx, sy, scale] for the camera
  last drawn (scale * a width in units = pixels).

```js road
const E = My3D2dge, road = new E.Road({ segment: 200 });
road.add(50); road.add(60, { curve: 4, hill: 1200 }); road.add(40, { curve: -3, hill: -1200 }); road.place(3000, -1.4, { w: 300, draw() {} });
if (road.length !== 150 * 200 || road.curveAt(80 * 200) <= 0 || !(road.yAt(110 * 200) > 0) || road.hits(3000, -1.3, .1).length !== 1) throw new Error('a road');
```
Rules: z grows ahead and wraps at road.length; x is in half roads (0 the middle line); build the road before the first
draw; cars and scenery are drawn far to near after the road under them.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module ROAD: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * ROAD  the pseudo-3D road: segments with curves and hills, lanes, rumble strips, scenery, tunnels
 * ========================================================================== */
const { clamp } = E, easeIn = (a, b, u) => a + (b - a) * u * u, easeInOut = (a, b, u) => a + (b - a) * (-Math.cos(u * Math.PI) / 2 + .5);
const COLORS = { road: ['#6a6a6a', '#646464'], grass: ['#10aa10', '#009a00'], rumble: ['#e8e8e8', '#c01818'], lane: '#d8d8d8', wall: ['#5a4a3a', '#4a3a2a'], roof: '#2a2420', portal: '#6a5a48' };
class Road {
  /** new E.Road({ segment, width, lanes, rumble, draw, fov, height, colors, fog, sky }): a road (the manual above) */
  constructor(o = {}) {
    /** o: its options (colors over the defaults) */
    this.o = Object.assign({ segment: 200, width: 2000, lanes: 3, rumble: 3, draw: 240, fov: 100, height: 1000, fog: { color: '#a0c0e0', density: 5 }, sky: '#6aa8e8' }, o);
    this.o.colors = Object.assign({}, COLORS, o.colors);
    /** segs: its segments ({ i, z, y0, y1, curve, tunnel, colors, things }); length: the lap in world units; depth: the
     *  camera's depth (1 / tan(fov / 2): a unit that far away fills half the screen's width) */
    this.segs = []; this.length = 0; this.depth = 1 / Math.tan(this.o.fov / 2 * Math.PI / 180);
    this._cam = null; this._out = null;
  }
  /** n segments more, bending (curve) and climbing (hill: units up, - down), eased in and out; o.tunnel, o.colors */
  add(n, o = {}) {
    const y0 = this.segs.length ? this.segs[this.segs.length - 1].y1 : 0, curve = o.curve || 0, hill = o.hill || 0, e = Math.max(1, Math.min(n / 3, 25)), L = this.o.segment;
    for (let k = 0; k < n; k++) {
      const c = k < e ? easeIn(0, curve, k / e) : k > n - e ? easeInOut(curve, 0, (k - (n - e)) / e) : curve, i = this.segs.length;
      this.segs.push({ i, z: i * L, y0: easeInOut(y0, y0 + hill, k / n), y1: easeInOut(y0, y0 + hill, (k + 1) / n), curve: c, tunnel: !!o.tunnel, colors: o.colors || null, things: [] });
    }
    this.length = this.segs.length * this.o.segment; return this;
  }
  /** the segment at a distance (it wraps) */
  seg(z) { const n = this.segs.length; return this.segs[((Math.floor(z / this.o.segment) % n) + n) % n]; }
  /** scenery at distance z, offset across: what = an E.sprite or E.anim (scale: world units a pixel, 8) or { draw(g,
   *  sx, sy, scale), w } */
  place(z, offset, what, scale = 8) {
    const spr = what.isAnim ? what.frames[0] : what.isSprite ? what : null;
    this.seg(z).things.push({ offset, what, scale, w: spr ? spr.w * scale : what.w || 200 }); return this;
  }
  /** how hard the road bends at a distance */
  curveAt(z) { return this.seg(z).curve; }
  /** the road's height at a distance */
  yAt(z) { const L = this.o.segment, s = this.seg(z), u = ((z % L) + L) % L / L; return s.y0 + (s.y1 - s.y0) * u; }
  /** the scenery a body w half roads wide at (z, x) touches */
  hits(z, x, w) { const W = this.o.width; return this.seg(z).things.filter(t => Math.abs(t.offset - x) * W < t.w / 2 + w * W); }
  /** how far past the camera the player's car stands when drawn at the screen's bottom, for a camera h over the road */
  ahead(h = this.o.height) { return h * this.depth; }
  // a road point into the screen for camera C: { x, y, w (half the road there, pixels), scale (pixels a unit), d }
  _p(wx, wy, wz, C) {
    const d = wz - C.z; if (d <= 0) return null;
    const s = this.depth / d; return { x: C.cx + s * (wx - C.x) * C.hw, y: C.cy - s * (wy - C.y) * C.hh, w: s * this.o.width * C.hw, scale: s * C.hw, d };
  }
  /** a point (distance z, across x in half roads, height y over the road) -> [sx, sy, scale] for the camera last drawn,
   *  or null behind it */
  project(z, x, y = 0) {
    const C = this._cam; if (!C) return null;
    let dz = z - C.z; if (dz < 0) dz += this.length;
    const L = this.o.segment, u = dz / L + C.pct, k = Math.floor(u), B = C.bend, b = k + 1 < B.length ? B[k] + (B[k + 1] - B[k]) * (u - k) : B[B.length - 1] || 0;
    const p = this._p(x * this.o.width + b, this.yAt(z) + y, C.z + dz, C); return p && [p.x, p.y, p.scale];
  }
  /** draw the road over r's frame (an overlay; r.viewport's part in a split screen): { z, x, h, turn, cars } */
  draw(r, v = {}) {
    const vp = r.viewport || { x: 0, y: 0, w: r.bw, h: r.bh }, o = this.o, segs = this.segs, n = segs.length, L = o.segment, cars = v.cars || [];
    r.overlay(g => {
      const W = vp.w, H = vp.h, z = ((v.z || 0) % this.length + this.length) % this.length, base = this.seg(z), pct = (z % L) / L, t = r.game.time;
      const C = this._cam = { x: (v.x || 0) * o.width, y: (v.h === undefined ? o.height : v.h) + this.yAt(z), z, cx: vp.x + W / 2, cy: vp.y + H / 2, hw: W / 2, hh: H / 2, pct, bend: [] };
      const out = this._out && this._out.width === W && this._out.height === H ? this._out : (this._out = E.mkCanvas(W, H)), cg = E.ctx2d(out);
      cg.setTransform(1, 0, 0, 1, -vp.x, -vp.y);
      if (o.sky && o.sky.draw) { const val = value => ({ value }); o.sky.draw(Object.create(r, { ctx: val(cg), bw: val(W), bh: val(H), W: val(W), H: val(H), ix: val(v.turn || 0), iy: val(0) })); }
      else E.px.rect(cg, vp.x, vp.y, W, H, o.sky || '#6aa8e8');
      // near to far: each segment projected, bending as the curves add up; it shows only above the last one shown (a
      // crest hides the road past it)
      const list = []; let maxy = vp.y + H, x = 0, dx = -(base.curve * pct);
      for (let k = 0; k < Math.min(o.draw, n); k++) {
        const s = segs[(base.i + k) % n], wz = s.z + (s.i < base.i ? this.length : 0);
        C.bend.push(x);
        const p1 = this._p(x, s.y0, wz, C), p2 = this._p(x + dx, s.y1, wz + L, C), show = !!(p1 && p2 && p1.d > this.depth && p2.y < p1.y && p2.y < maxy);
        x += dx; dx += s.curve; list.push([s, p1, p2, show, wz]); if (show) maxy = p2.y;
      }
      C.bend.push(x);
      // far to near: the road under each segment, then what stands on it (nearer road covers what a crest hides)
      const fog = o.fog && E.hex(o.fog.color), byseg = new Map();
      for (const c of cars) { const s = this.seg(c.z); (byseg.get(s) || byseg.set(s, []).get(s)).push(c); }
      for (let k = list.length - 1; k > 0; k--) {
        const [s, p1, p2, show, wz] = list[k], f = fog ? 1 - Math.exp(-((k / o.draw) ** 2) * o.fog.density) : 0;
        if (show) this._band(cg, vp, s, p1, p2, fog, f);
        const things = s.things, cs = byseg.get(s); if (!p1 || (!things.length && !cs)) continue;
        cg.globalAlpha = 1 - f * .8;
        for (const th of things) this._thing(cg, th.what, p1.x + p1.scale * th.offset * o.width, p1.y, p1.scale, th.scale, t);
        if (cs) for (const c of cs) {   // a car between its segment's ends
          const u = (((c.z - wz) % this.length + this.length) % this.length) / L, q = p2 || p1, sc = p1.scale + (q.scale - p1.scale) * u;
          this._thing(cg, c, p1.x + (q.x - p1.x) * u + sc * c.x * o.width, p1.y + (q.y - p1.y) * u, sc, 8, t);
        }
        cg.globalAlpha = 1;
      }
      cg.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(out, vp.x, vp.y);
    });
    return this;
  }
  // a thing at its foot (sx, sy), scale pixels a unit: a sprite or anim (spr world units a pixel), or its own draw
  _thing(g, q, sx, sy, scale, spr, t) {
    E.px.reset(g);   // (the color cache forgotten: the fog and the alpha set the canvas directly)
    if (q.draw) return q.draw(g, sx, sy, scale);
    const sp = q.isAnim ? q.frame(t) : q, k = scale * spr, w = sp.w * k, h = sp.h * k; if (w < .5) return;
    g.drawImage(sp.cv, Math.round(sx - w / 2), Math.round(sy - h), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  // a segment's band: the grass across, the rumble strips, the road and its lanes; a tunnel's walls and roof; the fog
  _band(g, vp, s, p1, p2, fog, f) {
    const o = this.o, px = E.px, C = s.colors ? Object.assign({}, o.colors, s.colors) : o.colors, alt = Math.floor(s.i / o.rumble) % 2, W = vp.w, X = vp.x, y1 = Math.ceil(p1.y), y2 = Math.ceil(p2.y);   // (the rows its polygons fill: from p2 down to p1, p1's not)
    const quad = (x1, w1, x2, w2, c) => px.poly(g, [[x1 - w1, p1.y], [x1 + w1, p1.y], [x2 + w2, p2.y], [x2 - w2, p2.y]], c);
    px.rect(g, X, y2, W, y1 - y2, C.grass[alt]);
    const k = Math.max(6, 2 * o.lanes);
    quad(p1.x, p1.w * (1 + 1 / k), p2.x, p2.w * (1 + 1 / k), C.rumble[alt]);
    quad(p1.x, p1.w, p2.x, p2.w, C.road[alt]);
    if (!alt) for (let l = 1; l < o.lanes; l++) { const u = -1 + 2 * l / o.lanes; quad(p1.x + u * p1.w, p1.w / (16 * o.lanes), p2.x + u * p2.w, p2.w / (16 * o.lanes), C.lane); }
    if (s.tunnel) {   // walls from beyond the rumble up to a roof; where it starts, a face round its mouth
      const e1 = p1.w * 1.25, e2 = p2.w * 1.25, t1 = p1.y - p1.w * .8, t2 = p2.y - p2.w * .8, n = this.segs.length;
      px.poly(g, [[p1.x - e1, p1.y], [p2.x - e2, p2.y], [p2.x - e2, t2], [p1.x - e1, t1]], C.wall[alt]);
      px.poly(g, [[p1.x + e1, p1.y], [p2.x + e2, p2.y], [p2.x + e2, t2], [p1.x + e1, t1]], C.wall[alt]);
      px.poly(g, [[p1.x - e1, t1], [p1.x + e1, t1], [p2.x + e2, t2], [p2.x - e2, t2]], C.roof);
      if (!this.segs[(s.i + n - 1) % n].tunnel) {
        const a = Math.round(p1.x - e1), b = Math.round(p1.x + e1), top = clamp(Math.round(t1), vp.y, y1), r = X + W;
        px.rect(g, X, vp.y, W, top - vp.y, C.portal); if (a > X) px.rect(g, X, top, Math.min(a, r) - X, y1 - top, C.portal); if (b < r) px.rect(g, Math.max(b, X), top, r - Math.max(b, X), y1 - top, C.portal);
      }
    }
    if (f > .01) { g.fillStyle = `rgba(${fog[0]},${fog[1]},${fog[2]},${f.toFixed(3)})`; g.fillRect(X, y2, W, y1 - y2); px.reset(g); }   // fog thickening with the distance
  }
}
E.Road = Road;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
