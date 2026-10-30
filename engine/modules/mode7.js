/*!
my-3D2dge module MODE7 v0.85.0: a perspective floor drawn a row at a time, a sky that turns with it, everything on it scaled by its distance
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

Super Mario Kart's, F-Zero's and Pilotwings' view (the SNES's Mode 7): a camera at a height over a flat floor, looking
along a heading, pitched down; the floor drawn a screen row at a time, the sky above the horizon, and on the floor
billboards (rigs drawn at the size their distance gives, sprites, your own drawing) far to near.
- const m7 = new E.Mode7({ floor: a TileMap (its floorTex) | (x, y) => [r, g, b] | a canvas (a texel a unit), size:
  [w, h] (the floor in world units, for a function), outside: '#24402a' (beyond the floor) | wrap: true (it repeats),
  sky: a Backdrop (full engine) | ['#top', '#bottom'], fog: { color, near, far } (far: nothing past it), far: 2400 }).
- m7.cam = { x, y, h: 40 (height), angle: 0 (the heading, as E.angleTo gives it: 0 east, PI / 2 south; keep it
  unwrapped, the sky turns with it), pitch: 12 (degrees down), fov: 70 (degrees across the height) };
  m7.chase(body, { back: 56, h: 34, angle }) puts it behind a body (body.angle, or angle) each step.
- In draw: m7.rig(rig, x, y, z), m7.sprite(spr or E.anim, x, y, z, { scale, flip, t }), m7.shape(id, x, y, z, { facing,
  size }) (full engine), m7.add(x, y, z, (g, sx, sy, k) => ...) gather billboards (k: screen pixels per world unit there); m7.draw(r, cam) draws sky, floor, fog and them,
  far to near, as an overlay (in a split screen, in r.viewport: give each player's cam).
- m7.project(x, y, z) -> [sx, sy, k] on the screen, or null behind the camera; m7.toFloor(sx, sy) -> [x, y], or null
  above the horizon (both for the camera last drawn: HUD markers, a tap on the track). m7.horizon: its screen row.
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
body's angle and the camera's heading are the same angle; billboards are gathered again every frame.
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
  /** new E.Mode7({ floor, size, outside, wrap, sky, fog, far }): a Mode 7 view (the manual above) */
  constructor(o = {}) {
    /** o: its options */
    this.o = Object.assign({ outside: '#24402a', far: 2400, sky: ['#1a3060', '#7aa8e0'] }, o);
    /** cam: the camera ({ x, y, h, angle, pitch, fov }); horizon: the screen row of the horizon in the last drawing;
     *  items: the billboards gathered for the next draw */
    this.cam = { x: 0, y: 0, h: 40, angle: 0, pitch: 12, fov: 70 }; this.horizon = 0; this.items = [];
    this._P = { x: 0, y: 0, h: 40, fx: 0, fy: -1, rx: 1, ry: 0, cp: 1, sp: 0, f: 1, cx: 0, cy: 0, W: 0, H: 0, vx: 0, vy: 0 };
    this._views = new Map(); this._shapes = new Map(); this._tex = null; this._buf = null; this._a = 0; this._pd = 12; this._t = 0;
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
    const P = this._P, W = rect.W, H = rect.H, pd = cam.pitch === undefined ? 12 : cam.pitch, pitch = pd * Math.PI / 180, [fx, fy] = trig(cam.angle || 0);
    Object.assign(P, { x: cam.x, y: cam.y, h: cam.h, fx, fy, rx: -fy, ry: fx, cp: Math.cos(pitch), sp: Math.sin(pitch), W, H, vx: rect.x || 0, vy: rect.y || 0 });
    P.f = rect.focal || H / 2 / Math.tan((cam.fov || 70) * Math.PI / 360);
    P.cx = rect.cx === undefined ? P.vx + W / 2 : rect.cx; P.cy = rect.cy === undefined ? P.vy + H / 2 : rect.cy;
    this.horizon = P.cy - P.f * P.sp / P.cp; this._a = cam.angle || 0; this._pd = pd;
    return this;
  }
  /** a world point -> [screen x, screen y, screen pixels per unit there], or null at or behind the camera */
  project(x, y, z = 0) {
    const P = this._P, dx = x - P.x, dy = y - P.y, D = dx * P.fx + dy * P.fy, L = dx * P.rx + dy * P.ry, dz = z - P.h, zc = D * P.cp - dz * P.sp;
    if (zc < 6) return null;
    const k = P.f / zc; return [P.cx + L * k, P.cy - (D * P.sp + dz * P.cp) * k, k];
  }
  /** a screen row's floor distance ahead of the camera, or 0 at or above the horizon */
  rowDepth(sy) {
    const P = this._P, k = (P.cy - sy) / P.f, den = P.sp - k * P.cp; if (den <= 1e-4) return 0;
    return P.h * (P.cp + k * P.sp) / den;
  }
  /** a screen point -> the floor point under it [x, y], or null above the horizon */
  toFloor(sx, sy) {
    const P = this._P, D = this.rowDepth(sy); if (!D) return null;
    const L = (sx - P.cx) * (D * P.cp + P.h * P.sp) / P.f; return [P.x + P.fx * D + P.rx * L, P.y + P.fy * D + P.ry * L];
  }
  /** gather a billboard: fn(g, sx, sy, k) draws it with its foot at (sx, sy), k screen pixels per unit */
  add(x, y, z, fn) { this.items.push({ x, y, z: z || 0, fn }); return this; }
  /** gather a rig, drawn by the engine at the size its distance gives, from the camera's side (it faces rig.facing) */
  rig(rig, x, y, z = 0) { return this.add(x, y, z, (g, sx, sy, k) => rig.draw(g, Math.round(sx), Math.round(sy), this.view(k))); }
  /** gather a sprite (E.sprite, or E.anim's frames at o.t, the game's time by default), its foot at the point: o.scale
   *  (world units a sprite pixel, 1), o.flip */
  sprite(spr, x, y, z = 0, o = {}) {
    return this.add(x, y, z, (g, sx, sy, k) => {
      const sp = spr.isAnim ? spr.frame(o.t === undefined ? this._t : o.t) : spr, s = k * (o.scale || 1), w = sp.w * s, h = sp.h * s; if (w < .5) return;
      g.drawImage(o.flip ? sp.fl : sp.cv, Math.round(sx - w / 2), Math.round(sy - h), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    });
  }
  /** gather one of the engine's shapes (r.shape's: 'barrel', 'tree', ...; the full engine), seen from the camera's side at
   *  its distance's size: o.facing (radians), o.size (1) */
  shape(id, x, y, z = 0, o = {}) {
    return this.add(x, y, z, (g, sx, sy, k) => {
      const v = this.view(k), f = Math.round((o.facing === undefined ? Math.PI / 2 : o.facing) / Math.PI * 8) / 8 * Math.PI, key = id + ':' + v.scale + ':' + v.yawDeg + ':' + v.pitchDeg + ':' + f + ':' + (o.size || 1);
      let sp = this._shapes.get(key); if (sp === undefined) { if (this._shapes.size > 300) this._shapes.clear(); sp = E.shapeSprite ? E.shapeSprite(id, { view: v, facing: f, size: o.size || 1 }) : null; this._shapes.set(key, sp); }
      if (sp) g.drawImage(sp.cv, Math.round(sx - sp.foot[0]), Math.round(sy - sp.foot[1]));
    });
  }
  /** the engine view a rig is drawn with at k pixels per unit, seen from the camera's heading (sixteenths, reused) */
  view(k) {
    const q = Math.max(1 / 8, Math.round(k * 16) / 16), yaw = (Math.round((-this._a * 180 / Math.PI - 90) * 2) / 2) || 0, key = q + ':' + yaw + ':' + this._pd;
    let v = this._views.get(key); if (!v) { if (this._views.size > 400) this._views.clear(); v = new E.View('mode7', 'Mode 7', yaw, this._pd, q, 1); this._views.set(key, v); }
    return v;
  }
  /** draw the view as an overlay over r's frame (in a split screen, r.viewport's part): sky, floor, fog, then the
   *  billboards far to near (gathered with add, rig, sprite; they are used up) */
  draw(r, cam = this.cam) {
    const vp = r.viewport || { x: 0, y: 0, w: r.bw, h: r.bh }, items = this.items.splice(0), sc = r.game.screen, whole = !r.viewport;
    r.overlay(g => {
      this.begin({ W: whole ? r.W : vp.w, H: whole ? r.H : vp.h, x: vp.x, y: vp.y, cx: whole ? r.W / 2 + sc.fx : vp.x + vp.w / 2, cy: whole ? r.H / 2 + sc.fy : vp.y + vp.h / 2 }, cam);
      this._t = r.game.time;
      // drawn on a canvas of the viewport's size (moved so screen points land on it), then onto the frame
      const c = this._out && this._out.width === vp.w && this._out.height === vp.h ? this._out : (this._out = E.mkCanvas(vp.w, vp.h)), cg = E.ctx2d(c);
      cg.setTransform(1, 0, 0, 1, -vp.x, -vp.y);
      this.drawSky(cg, r, vp); this.drawFloor(cg, vp);
      const P = this._P, fog = this.o.fog, far = fog && fog.far || this.o.far, list = [];
      for (const it of items) { const p = this.project(it.x, it.y, it.z); if (!p || p[0] < vp.x - 200 || p[0] > vp.x + vp.w + 200) continue; const d = (it.x - P.x) * P.fx + (it.y - P.y) * P.fy; if (d <= far) list.push([d, it, p]); }
      list.sort((a, b) => b[0] - a[0]);
      for (const [d, it, p] of list) { cg.globalAlpha = fog ? clamp(1 - (d - (fog.near || 0)) / (far - (fog.near || 0)) * .8, .2, 1) : 1; E.px.reset(cg); it.fn(cg, p[0], p[1], p[2]); }   // (the color cache forgotten: the floor and the sky set colors directly)
      cg.globalAlpha = 1; cg.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, vp.x, vp.y);
    });
    return this;
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
  // the floor's texture: a canvas, or one baked from a TileMap's floor or a color function (a texel a unit)
  _texture() {
    if (this._tex) return this._tex;
    const f = this.o.floor; if (f && f.getContext) return (this._tex = f);
    const map = f && f.w && f.T ? f : null, W = map ? map.w * map.T : (this.o.size || [256, 256])[0], H = map ? map.h * map.T : (this.o.size || [256, 256])[1];
    const cv = E.mkCanvas(W, H), g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = map ? (map.cell(Math.floor(x / map.T), Math.floor(y / map.T)) === 0 ? map.floorTex(x + .5, y + .5, map.floorAt(x + .5, y + .5)) : null) : f(x + .5, y + .5);
      if (!c) continue; const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return (this._tex = cv);
  }
  /** forget the floor's baked texture (after changing the map or the function: it bakes again) */
  refresh() { this._tex = null; this._px = null; return this; }
  /** draw the floor below the horizon in the rectangle ({ x, y, w, h }), a row at a time, and the fog over it */
  drawFloor(g, vp) {
    const P = this._P, F = this._texture(), TW = F.width, TH = F.height, o = this.o, fog = o.fog, far = fog && fog.far || o.far;
    const top = Math.max(vp.y, Math.ceil(P.cy - P.f * P.sp / P.cp)), bot = vp.y + vp.h; if (bot <= top) return;
    g.fillStyle = o.outside; g.fillRect(vp.x, top, vp.w, bot - top);
    if (P.fx === 0 && P.fy === -1 && !o.wrap) {   // due north: each row a strip of the texture stretched across (the fast path)
      for (let by = top; by < bot; by++) {
        const D = this.rowDepth(by + .5); if (!D || D > far) continue;
        const y = P.y - D; if (y < 0 || y >= TH) continue;
        const u = (D * P.cp + P.h * P.sp) / P.f; g.drawImage(F, P.x - (P.cx - vp.x) * u, Math.floor(y), vp.w * u, 1, vp.x, by, vp.w, 1);
      }
    } else {   // any heading: each row's pixels sampled along the floor's line under it
      if (!this._px) this._px = new Uint32Array(F.getContext('2d').getImageData(0, 0, TW, TH).data.buffer);
      const T = this._px, w = vp.w, h = bot - top;
      const B = this._buf && this._buf.width === w && this._buf.height === h ? this._buf : (this._buf = E.mkCanvas(w, h)), bg = B.getContext('2d'), img = bg.createImageData(w, h), out = new Uint32Array(img.data.buffer);
      const oh = E.hex(o.outside), oc = ((255 << 24) | (oh[2] << 16) | (oh[1] << 8) | oh[0]) >>> 0;
      for (let row = 0; row < h; row++) {
        const D = this.rowDepth(top + row + .5); if (!D || D > far) continue;
        const s = (D * P.cp + P.h * P.sp) / P.f, l0 = (vp.x + .5 - P.cx) * s, ux = P.rx * s, uy = P.ry * s, base = row * w;
        let wx = P.x + P.fx * D + P.rx * l0, wy = P.y + P.fy * D + P.ry * l0;
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
