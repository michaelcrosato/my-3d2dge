/*!
my-3D2dge module MESH v0.101.0: low-poly models of flat-shaded polygons, drawn crisp through any camera's projection
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

Star Fox's, Stunt Race FX's and Virtua Racing's look, for what a camera turns round: a car seen from behind and then
from the side as it passes, a jet that rolls, an airship. These are the 2D engine's own polygons on its canvas (a game on
the 3D engine uses three.js meshes). A model is data: parts in its own units (x forward, y right, z up; its origin at its
foot). It is drawn through a projection (the mode7 module's m7.mesh, the road module's road.mesh, or your own
(x, y, z) -> [sx, sy, k] or null), faces turned away left out, the rest painted far to near, each shaded by how it
faces the light (hue-shifted, as the engine shades), pixel-snapped.
- const ship = new E.Mesh([ part, ... ]), each part [kind, ...]:
  ['box', [x, y, z] (its centre), [hx, hy, hz] (half sizes), color, { top: [sx, sy] (the top face scaled: a cabin),
  tip: [dx, dz] (the top face moved forward and up: a windscreen's slope) }];
  ['tube', [x, y, z], r, half length, color, { axis: 'x' | 'y' (a wheel) | 'z', n: 8 sides, end: s (the +axis end's
  radius scaled: .5 a taper, 0 a cone) }];
  ['ball', [x, y, z], [rx, ry, rz], color, { n: 8 }];
  ['face', [[x, y, z], ...], color, { both: true (seen from either side: a fin, a sail) }] (corners anticlockwise seen
  from outside).
  Any part takes { mirror: true }: a copy on the other side (y to -y). A color is '#rgb', or a name that draw's
  colors fills ('body': one model in each kart's colors).
- ship.draw(g, project, { x, y, z, yaw (the engine's angle: 0 east, PI / 2 south), pitch (+ nose up), roll (+ right
  wing down; radians), scale: 1, colors: { body: '#e83030' }, light: [x, y, z] (toward the light, in the world: from
  above and the north-west by default), flat: false (no shading), mix: ['#hex', t] (every face that far toward a color:
  fog) }) -> the faces drawn.
- ship.at(lx, ly, lz, o) -> [x, y, z]: a point of the model in the world for those o (a gun's muzzle, an exhaust).
- ship.bounds: its radius from its origin; ship.faces: [{ p: [[x, y, z], ...], c, both }].

```js mesh
const E = My3D2dge, m = new E.Mesh([['box', [0, 0, 4], [8, 4, 4], 'body'], ['tube', [-4, 0, 2], 2, 1, '#222', { axis: 'y', mirror: true }]]);
const g = E.mkCanvas(64, 64).getContext('2d'), side = (x, y, z) => [32 + x, 40 - z, 1];   // (a camera on the right: x across, z up)
if (m.draw(g, side, { colors: { body: '#c83030' } }) < 1 || m.bounds < 8 || m.at(8, 0, 0, { yaw: Math.PI / 2 })[1] !== 8) throw new Error('a mesh');
```
Rules: a face's corners lie in one plane (split a bent one in two); parts don't cut through each other where it shows
(painting far to near sorts faces, not pixels); the projection's k is pixels a unit there (nearer is larger).
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module MESH: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * MESH  low-poly models: parts to faces, drawn through a projection, culled, sorted, shaded
 * ========================================================================== */
const TAU = Math.PI * 2;
// the shades of a color, cached: E.shade's hue-shifted steps, a sixteenth apart
const SHADES = new Map();
const shade = (c, a) => { const q = Math.round(a * 16) / 16, k = c + q; let s = SHADES.get(k); if (s === undefined) { if (SHADES.size > 4000) SHADES.clear(); s = q ? E.shade(c, q) : c; SHADES.set(k, s); } return s; };
// a rotation (yaw about z, pitch about the model's y, roll about its x) as a matrix's three columns: where the model's
// forward, right and up go in the world
const frame = (yaw = 0, pitch = 0, roll = 0) => {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const F = [cy * cp, sy * cp, sp], R0 = [-sy, cy, 0], U0 = [-cy * sp, -sy * sp, cp];   // (pitched: + nose up)
  return [F, [R0[0] * cr - U0[0] * sr, R0[1] * cr - U0[1] * sr, R0[2] * cr - U0[2] * sr], [U0[0] * cr + R0[0] * sr, U0[1] * cr + R0[1] * sr, U0[2] * cr + R0[2] * sr]];   // (rolled: + right side down)
};
class Mesh {
  /** new E.Mesh(parts): a model of flat-shaded faces (the manual above) */
  constructor(parts = []) {
    /** faces: [{ p: [[x, y, z], ...], c (a color or a name), both, n (its normal) }]; bounds: its radius from its origin */
    this.faces = []; this.bounds = 0;
    for (const part of parts) this.part(part);
  }
  /** add a part ([kind, ...]: 'box', 'tube', 'ball', 'face'; the manual above); returns the model */
  part(q) {
    const [kind] = q, o = (kind === 'face' ? q[3] : kind === 'tube' ? q[5] : q[4]) || {}, out = [];
    if (kind === 'box') {
      const [c, h, col] = [q[1], q[2], q[3]], [sx, sy] = o.top || [1, 1], [tx, tz] = o.tip || [0, 0];
      const x0 = c[0] - h[0], x1 = c[0] + h[0], y0 = c[1] - h[1], y1 = c[1] + h[1], z0 = c[2] - h[2], z1 = c[2] + h[2];
      const X0 = c[0] + tx - h[0] * sx, X1 = c[0] + tx + h[0] * sx, Y0 = c[1] - h[1] * sy, Y1 = c[1] + h[1] * sy, Z1 = z1 + tz;
      out.push([[[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]], col], [[[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0]], col],
        [[[x1, y0, z0], [x1, y1, z0], [X1, Y1, Z1], [X1, Y0, Z1]], col], [[[x0, y1, z0], [x0, y0, z0], [X0, Y0, Z1], [X0, Y1, Z1]], col],
        [[[x1, y1, z0], [x0, y1, z0], [X0, Y1, Z1], [X1, Y1, Z1]], col], [[[x0, y0, z0], [x1, y0, z0], [X1, Y0, Z1], [X0, Y0, Z1]], col]);
    } else if (kind === 'tube') {   // built along +x, then turned onto its axis (a turn that keeps the faces' sides)
      const [c, r, hl, col] = [q[1], q[2], q[3], q[4]], n = o.n || 8, e = o.end === undefined ? 1 : o.end, a0 = Math.PI / n;
      const to = o.axis === 'y' ? p => [p[2], p[0], p[1]] : o.axis === 'z' ? p => [p[1], p[2], p[0]] : p => p;
      const ring = (x, s) => Array.from({ length: n }, (_, i) => { const a = a0 + i * TAU / n; return [x, r * s * Math.cos(a), r * s * Math.sin(a)]; });
      const A = ring(-hl, 1), B = ring(hl, e), put = pts => pts.map(p => { const t = to(p); return [t[0] + c[0], t[1] + c[1], t[2] + c[2]]; });
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.push([put(e ? [A[i], A[j], B[j], B[i]] : [A[i], A[j], B[i]]), col]); }
      out.push([put(A.slice().reverse()), col]); if (e) out.push([put(B), col]);
    } else if (kind === 'ball') {
      const [c, rr, col] = [q[1], q[2], q[3]], n = o.n || 8, m = Math.max(2, n >> 1);
      const P = (j, i) => { const th = j / m * Math.PI, ph = i / n * TAU; return [c[0] + rr[0] * Math.sin(th) * Math.cos(ph), c[1] + rr[1] * Math.sin(th) * Math.sin(ph), c[2] + rr[2] * Math.cos(th)]; };
      for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
        const k = (i + 1) % n;
        out.push([j === 0 ? [P(0, 0), P(1, i), P(1, k)] : j === m - 1 ? [P(j, i), P(m, 0), P(j, k)] : [P(j, i), P(j + 1, i), P(j + 1, k), P(j, k)], col]);
      }
    } else if (kind === 'face') out.push([q[1].map(p => p.slice()), q[2]]);
    else throw new Error(`my-3D2dge module MESH: a part is 'box', 'tube', 'ball' or 'face', not '${kind}'`);
    for (const [p, c] of out) {
      this._add(p, c, !!o.both);
      if (o.mirror) this._add(p.map(v => [v[0], -v[1], v[2]]).reverse(), c, !!o.both);
    }
    return this;
  }
  _add(p, c, both) {
    let nx = 0, ny = 0, nz = 0;   // (Newell's normal: sound for any flat polygon)
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
    const L = Math.hypot(nx, ny, nz) || 1; if (L < 1e-9) return;
    this.faces.push({ p, c, both, n: [nx / L, ny / L, nz / L] });
    for (const v of p) this.bounds = Math.max(this.bounds, Math.hypot(v[0], v[1], v[2]));
  }
  /** a point of the model (its own units) in the world, for the place and turn draw is given (o: x, y, z, yaw, pitch,
   *  roll, scale) */
  at(lx, ly, lz, o = {}) {
    const [F, R, U] = frame(o.yaw, o.pitch, o.roll), s = o.scale || 1;
    return [(o.x || 0) + (F[0] * lx + R[0] * ly + U[0] * lz) * s, (o.y || 0) + (F[1] * lx + R[1] * ly + U[1] * lz) * s, (o.z || 0) + (F[2] * lx + R[2] * ly + U[2] * lz) * s];
  }
  /** draw it through project(x, y, z) -> [sx, sy, k] (or null: that face is left out) for o (the manual above); returns
   *  how many faces it drew */
  draw(g, project, o = {}) {
    const [F, R, U] = frame(o.yaw, o.pitch, o.roll), s = o.scale || 1, X = o.x || 0, Y = o.y || 0, Z = o.z || 0, cols = o.colors || {};
    const Lr = o.light || [-.35, -.45, .82], ll = Math.hypot(Lr[0], Lr[1], Lr[2]) || 1, lx = Lr[0] / ll, ly = Lr[1] / ll, lz = Lr[2] / ll, mix = o.mix;
    const list = [];
    for (const f of this.faces) {
      const q = []; let d = 0, ok = true;
      for (const v of f.p) {
        const p = project(X + (F[0] * v[0] + R[0] * v[1] + U[0] * v[2]) * s, Y + (F[1] * v[0] + R[1] * v[1] + U[1] * v[2]) * s, Z + (F[2] * v[0] + R[2] * v[1] + U[2] * v[2]) * s);
        if (!p) { ok = false; break; } q.push(p); d += 1 / p[2];
      }
      if (!ok) continue;
      let area = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; area += a[0] * b[1] - b[0] * a[1]; }
      if (area <= 0 && !f.both) continue;   // (turned away: the screen's y runs down, so a face toward the eye winds positive)
      list.push([d / q.length, q, f]);
    }
    list.sort((a, b) => b[0] - a[0]);
    for (const [, q, f] of list) {
      let c = cols[f.c] || f.c; if (c[0] !== '#') c = '#ff00ff';   // (a name draw wasn't given: magenta, to be seen)
      if (!o.flat) { const n = f.n, wx = F[0] * n[0] + R[0] * n[1] + U[0] * n[2], wy = F[1] * n[0] + R[1] * n[1] + U[1] * n[2], wz = F[2] * n[0] + R[2] * n[1] + U[2] * n[2]; c = shade(c, Math.max(-.55, Math.min(.3, (wx * lx + wy * ly + wz * lz) * .42 - .08))); }
      if (mix && mix[1] > .01) c = E.mix(c, mix[0], Math.min(1, mix[1]));
      E.px.poly(g, q.map(p => [p[0], p[1]]), c);
    }
    return list.length;
  }
}
/** the shading draw uses: E.shade's step, cached (a color lightened or darkened by a, -1..1) */
Mesh.shade = shade;
E.Mesh = Mesh;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
