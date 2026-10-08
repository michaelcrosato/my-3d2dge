/* =============================================================================
 * FREE CAMERA ROOM: FLY MODE (temporary lab). The engine has no perspective (every view is an orthographic camera), so
 * a first-person camera needs a renderer of its own. This is a small one, written for this lab to show what it takes:
 * a software rasterizer at pixel-art resolution (a depth buffer, perspective-correct texturing, near-plane clipping)
 * that redraws the room's walls, floor and crates in 3D. What it takes from the engine: the colors (E.tones, E.shade),
 * the floor's texture function (E.tex.flagstone), the wall look (its bricks, re-made per pixel), the converted crate
 * (src/shapes-raster.js) and the flat props, and the hero: the engine draws him from the camera's exact angle every
 * frame, then he is pasted in like a Doom sprite (one depth for the whole picture). What it leaves out: the engine's
 * lighting, cut-away walls, x-ray, particles. window.FlyCam(canvas, room) -> { resize, render, collide }.
 * ============================================================================= */
(() => {
'use strict';
const E = My3D2dge, SR = window.ShapeRaster, NEAR = .5, SPR = 65535;
const BG = [13, 11, 20], OUT = [20, 12, 28];
const rgb = c => Array.isArray(c) ? c.slice(0, 3) : SR.rgb(c);
const clamp = E.clamp, hash2 = E.hash2;

function FlyCam(canvas, room) {
  const { cells, MW, MH, T, types, floorTex, light } = room, FW = MW * T, FH = MH * T;
  const g = canvas.getContext('2d');
  let W = 0, H = 0, img = null, buf = null, zb = null, idb = null, mark = null;

  /* the floor: one texel per world unit, from the engine's own texture function */
  const floor = new Uint8Array(FW * FH * 3);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const c = floorTex(x + .5, y + .5), k = (y * FW + x) * 3; floor[k] = c[0]; floor[k + 1] = c[1]; floor[k + 2] = c[2]; }

  /* the room as polygons: walls and pillars (sides, tops), the floor. kind 0 floor, 1 wall side, 2 top, 3 flat color */
  const cell = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH ? 0 : cells[y * MW + x];
  const height = (x, y) => { const c = cell(x, y); return c > 0 ? types[c].h : 0; };
  const statics = [{ kind: 0, id: 1, n: [0, 0, 1], v: [[T, T, 0], [FW - T, T, 0], [FW - T, FH - T, 0], [T, FH - T, 0]] }];
  for (let cy = 0; cy < MH; cy++) for (let cx = 0; cx < MW; cx++) {
    const c = cell(cx, cy); if (c <= 0) continue;
    const t = types[c], h = t.h, x0 = cx * T, y0 = cy * T, x1 = x0 + T, y1 = y0 + T, id = 2 + cy * MW + cx, tt = E.tones(t.top);
    statics.push({ kind: 2, id, n: [0, 0, 1], v: [[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]], top: rgb(t.top), sh: rgb(tt.sh), lt: rgb(tt.lt) });
    for (const [nx, ny, A, B] of [[0, -1, [x1, y0], [x0, y0]], [0, 1, [x0, y1], [x1, y1]], [-1, 0, [x0, y0], [x0, y1]], [1, 0, [x1, y1], [x1, y0]]]) {
      const nh = height(cx + nx, cy + ny); if (nh >= h) continue;
      // the TileMap's face light: lit sides a shade lighter, the others darker (TileMap._box)
      const lit = -(nx * light[0] + ny * light[1]), col = lit > .2 ? E.shade(t.side, .12) : lit < -.2 ? E.shade(t.side, -.25) : t.side, ct = E.tones(col);
      statics.push({ kind: 1, id, n: [nx, ny, 0], v: [[A[0], A[1], nh], [B[0], B[1], nh], [B[0], B[1], h], [A[0], A[1], h]],
        alongX: ny !== 0, z0: nh, course: t.course || 8, seed: id * 31 + (nx + 2) * 7 + ny,
        base: rgb(col), sh: rgb(ct.sh), lt: rgb(ct.lt), line: rgb(E.shade(col, -.3)), bottom: rgb(E.shade(col, -.35)) });
    }
  }

  /* the crates, rebuilt when their look changes: the converted shape's boxes, or the engine-style plain box */
  let crateKey = '', cratePolys = [];
  function buildCrates(look, crates, shape) {
    const key = look + crates.length; if (key === crateKey) return; crateKey = key; cratePolys = [];
    crates.forEach((c, i) => {
      const id = 1000 + i;
      if (look === 'shape' && shape) {
        const co = Math.cos(c.f), si = Math.sin(c.f), [ccx, ccy, ccz] = shape.c;
        const P = (x, y, z) => { x -= ccx; y -= ccy; return [c.x + x * co - y * si, c.y + x * si + y * co, c.z + z - ccz]; };
        for (const b of shape.b) {
          const q = []; for (let k = 0; k < 8; k++) q.push(P(k & 1 ? b[4] : b[1], k & 2 ? b[5] : b[2], k & 4 ? b[6] : b[3]));
          for (const [ix, n0] of SR.FACES) {
            const n = [n0[0] * co - n0[1] * si, n0[0] * si + n0[1] * co, n0[2]];
            cratePolys.push({ kind: 3, id, n, v: ix.map(k => q[k]), col: SR.tone(shape, b[0], n) });
          }
        }
      } else if (look === 'box') {   // r.box's colors and face light (the engine's plain box)
        const x0 = c.x - 8.5, y0 = c.y - 8.5, x1 = c.x + 8.5, y1 = c.y + 8.5, z0 = c.z, z1 = c.z + 17, side = '#7a5a36';
        cratePolys.push({ kind: 3, id, n: [0, 0, 1], v: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col: rgb('#b08a58') });
        for (const [nx, ny, A, B] of [[0, -1, [x1, y0], [x0, y0]], [0, 1, [x0, y1], [x1, y1]], [-1, 0, [x0, y0], [x0, y1]], [1, 0, [x1, y1], [x1, y0]]]) {
          const lit = .6 * nx + .8 * ny, col = lit < -.2 ? E.shade(side, .12) : lit > .5 ? E.shade(side, -.25) : side;
          cratePolys.push({ kind: 3, id, n: [nx, ny, 0], v: [[A[0], A[1], z0], [B[0], B[1], z0], [B[0], B[1], z1], [A[0], A[1], z1]], col: rgb(col) });
        }
      }
    });
  }

  function resize(lines, cssW, cssH) {
    H = lines; W = Math.max(80, Math.round(lines * clamp(cssW / Math.max(1, cssH), .45, 2.6)));
    canvas.width = W; canvas.height = H; img = g.createImageData(W, H); buf = img.data;
    zb = new Float32Array(W * H); idb = new Uint16Array(W * H); mark = new Uint8Array(W * H);
  }

  /* ---- per frame ---- */
  let P, f, r, u, F, cx0, cy0, fog, blobs, stats = { polys: 0, ms: 0 };
  const shade = (c, depth, k) => {   // write one pixel with distance fog
    let R = c[0], G = c[1], B = c[2];
    if (fog) { const t = clamp((depth - 90) / 320, 0, .6); R += (BG[0] - R) * t; G += (BG[1] - G) * t; B += (BG[2] - B) * t; }
    buf[k * 4] = R; buf[k * 4 + 1] = G; buf[k * 4 + 2] = B; buf[k * 4 + 3] = 255;
  };
  const tmp = [0, 0, 0];
  function floorColor(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= FW || ty >= FH) return BG;
    const k = (ty * FW + tx) * 3; let m = 1;
    for (const b of blobs) { const d2 = (x - b[0]) * (x - b[0]) + (y - b[1]) * (y - b[1]); if (d2 < b[2]) m = Math.min(m, .62 + .38 * d2 / b[2]); }   // contact shadows
    tmp[0] = floor[k] * m; tmp[1] = floor[k + 1] * m; tmp[2] = floor[k + 2] * m; return tmp;
  }
  function wallColor(p, x, y, z) {   // the TileMap's bricks, per pixel: courses, running bond, varied bricks, mortar
    const u = p.alongX ? x : y, ci = Math.floor(z / p.course), fz = z / p.course - ci, bu = u + (ci & 1) * 4, bm = bu - Math.floor(bu / 8) * 8;
    if (z - p.z0 < .6) return p.bottom;
    if (z - ci * p.course < .7 || bm < .7) return p.line;
    const v = hash2(Math.floor(bu / 8) * 5 + p.seed, ci + 99);
    if (hash2(Math.floor(u * 1.4) + p.seed * 7, Math.floor(z * 1.4)) < .07) return p.sh;
    return fz > .8 && v > .5 ? p.lt : v < .22 ? p.sh : v > .86 ? p.lt : p.base;
  }
  function topColor(p, x, y) { const v = hash2(Math.floor(x * 1.5), Math.floor(y * 1.5)); return v < .08 ? p.sh : v > .96 ? p.lt : p.top; }

  // a polygon: cull, to camera space, clip at the near plane, project, fill as a fan of triangles
  const cam = q => { const dx = q[0] - P[0], dy = q[1] - P[1], dz = q[2] - P[2]; return [dx * r[0] + dy * r[1], dx * u[0] + dy * u[1] + dz * u[2], dx * f[0] + dy * f[1] + dz * f[2], q[0], q[1], q[2]]; };
  function poly(p) {
    const v0 = p.v[0], n = p.n;
    if ((P[0] - v0[0]) * n[0] + (P[1] - v0[1]) * n[1] + (P[2] - v0[2]) * n[2] <= 0) return;   // faces away
    let vs = p.v.map(cam);
    if (vs.every(q => q[2] < NEAR)) return;
    if (vs.some(q => q[2] < NEAR)) {   // Sutherland-Hodgman against z = NEAR
      const out = [];
      for (let i = 0; i < vs.length; i++) {
        const a = vs[i], b = vs[(i + 1) % vs.length], ia = a[2] >= NEAR, ib = b[2] >= NEAR;
        if (ia) out.push(a);
        if (ia !== ib) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push(a.map((x, j) => x + (b[j] - x) * t)); }
      }
      vs = out; if (vs.length < 3) return;
    }
    const sv = vs.map(q => { const w = 1 / q[2]; return [cx0 + q[0] * F * w, cy0 - q[1] * F * w, w, q[3] * w, q[4] * w, q[5] * w]; });
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const s of sv) { x0 = Math.min(x0, s[0]); x1 = Math.max(x1, s[0]); y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]); }
    if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) return;
    stats.polys++;
    for (let i = 1; i + 1 < sv.length; i++) tri(p, sv[0], sv[i], sv[i + 1]);
  }
  function tri(p, a, b, c) {
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); if (Math.abs(area) < 1e-9) return;
    const ia = 1 / area;
    const mx = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), Mx = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const my = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), My = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    // edge functions, stepped per pixel: l0 for vertex a (edge b-c), l1 for b (edge c-a)
    const A0 = (b[1] - c[1]) * ia, A1 = (c[1] - a[1]) * ia;
    const kind = p.kind, id = p.id;
    for (let y = my; y <= My; y++) {
      const py = y + .5;
      let l0 = ((b[0] - c[0]) * (py - c[1]) - (b[1] - c[1]) * (mx + .5 - c[0])) * -ia, l1 = ((c[0] - a[0]) * (py - a[1]) - (c[1] - a[1]) * (mx + .5 - a[0])) * -ia;
      for (let x = mx; x <= Mx; x++, l0 += A0, l1 += A1) {
        const l2 = 1 - l0 - l1;
        if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
        const w = l0 * a[2] + l1 * b[2] + l2 * c[2], k = y * W + x;
        if (w <= zb[k]) continue;
        const iw = 1 / w;
        let col;
        if (kind === 3) col = p.col;
        else {
          const wx = (l0 * a[3] + l1 * b[3] + l2 * c[3]) * iw, wy = (l0 * a[4] + l1 * b[4] + l2 * c[4]) * iw;
          if (kind === 0) col = floorColor(wx, wy);
          else if (kind === 2) col = topColor(p, wx, wy);
          else col = wallColor(p, wx, wy, (l0 * a[5] + l1 * b[5] + l2 * c[5]) * iw);
        }
        zb[k] = w; idb[k] = id; shade(col, iw, k);
      }
    }
  }

  // a picture standing in the world (the hero, a flat prop): one depth for all of it, its feet at a world point
  const pics = new WeakMap();
  function picture(cv, ax, ay, at, depthAt, fresh) {
    const c = cam(at), d = cam(depthAt); if (d[2] < NEAR * 2 || c[2] < NEAR) return;
    let data = !fresh && pics.get(cv);
    if (!data) { data = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; if (!fresh) pics.set(cv, data); }
    const sx = Math.round(cx0 + c[0] * F / c[2]) - ax, sy = Math.round(cy0 - c[1] * F / c[2]) - ay, w = 1 / d[2], cw = cv.width, ch = cv.height;
    for (let y = Math.max(0, -sy); y < ch && sy + y < H; y++) for (let x = Math.max(0, -sx); x < cw && sx + x < W; x++) {
      const i = (y * cw + x) * 4; if (data[i + 3] < 128) continue;
      const k = (sy + y) * W + sx + x; if (w <= zb[k]) continue;
      zb[k] = w; idb[k] = SPR; shade([data[i], data[i + 1], data[i + 2]], d[2], k);
    }
  }

  // outlines from depth: a pixel next to a nearer, different object turns dark (the way 3D pixel engines ink edges)
  function outlines() {
    mark.fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x, id = idb[k]; if (id === SPR) continue;
      const lim = zb[k] * 1.06;
      if ((x > 0 && idb[k - 1] !== id && idb[k - 1] !== SPR && zb[k - 1] > lim) || (x < W - 1 && idb[k + 1] !== id && idb[k + 1] !== SPR && zb[k + 1] > lim) ||
          (y > 0 && idb[k - W] !== id && idb[k - W] !== SPR && zb[k - W] > lim) || (y < H - 1 && idb[k + W] !== id && idb[k + W] !== SPR && zb[k + W] > lim)) mark[k] = 1;
    }
    for (let k = 0; k < W * H; k++) if (mark[k]) { buf[k * 4] = OUT[0]; buf[k * 4 + 1] = OUT[1]; buf[k * 4 + 2] = OUT[2]; }
  }

  /* the hero, drawn by the engine from the camera's angle at the camera's scale, then outlined like an actor */
  const heroCv = document.createElement('canvas'), views = new Map();
  heroCv.getContext('2d', { willReadFrequently: true });   // read back every frame
  function heroPicture(hero) {
    const dx = P[0] - hero.x, dy = P[1] - hero.y, c = cam([hero.x, hero.y, 13]); if (c[2] < NEAR * 2) return;
    const yaw = ((Math.round(Math.atan2(dx, dy) * 180 / Math.PI / 5) * 5) % 360 + 360) % 360;
    const pitch = clamp(Math.round(Math.atan2(P[2] - 13, Math.hypot(dx, dy)) * 180 / Math.PI / 5) * 5, 0, 85);
    const s = clamp(Math.round(F / c[2] * 4) / 4, .25, 10), key = yaw + ':' + pitch + ':' + s;
    let v = views.get(key); if (!v) { if (views.size > 600) views.clear(); v = new E.View('fly', 'Fly', yaw, pitch, s, 1); views.set(key, v); }
    const cw = Math.ceil(60 * s) + 6, ch = Math.ceil(64 * s) + 6, ox = cw >> 1, oy = ch - Math.ceil(12 * s) - 3;
    if (heroCv.width !== cw || heroCv.height !== ch) { heroCv.width = cw; heroCv.height = ch; } else heroCv.getContext('2d').clearRect(0, 0, cw, ch);
    const hg = heroCv.getContext('2d'); hg.imageSmoothingEnabled = false;
    hero.rig.draw(hg, ox, oy, v); SR.outline(heroCv);
    picture(heroCv, ox, oy, [hero.x, hero.y, 0], [hero.x, hero.y, 13], true);
  }

  /** draw a frame. C: { x, y, z, yaw, pitch, fov (degrees) }; o: { crates: 'shape' | 'prop' | 'box', outlines, fog,
   *  offX, offY (the view's centre, in buffer pixels from the middle) }; hero: { x, y, rig }; crates: [{ x, y, z, f }] */
  function render(C, o, hero, crates, shape) {
    const t0 = performance.now(); stats.polys = 0;
    const cyw = Math.cos(C.yaw), syw = Math.sin(C.yaw), cp = Math.cos(C.pitch), sp = Math.sin(C.pitch);
    P = [C.x, C.y, C.z]; f = [cp * cyw, cp * syw, sp]; r = [-syw, cyw, 0]; u = [-sp * cyw, -sp * syw, cp];
    F = (H / 2) / Math.tan(C.fov * Math.PI / 360); cx0 = W / 2 + (o.offX || 0); cy0 = H / 2 + (o.offY || 0); fog = !!o.fog;
    blobs = [[hero.x, hero.y, 5.5 * 5.5]]; for (const c of crates) if (!c.z) blobs.push([c.x, c.y, 100]);
    for (let k = 0; k < W * H; k++) { buf[k * 4] = BG[0]; buf[k * 4 + 1] = BG[1]; buf[k * 4 + 2] = BG[2]; buf[k * 4 + 3] = 255; }
    zb.fill(0); idb.fill(0);
    for (const p of statics) poly(p);
    buildCrates(o.crates, crates, shape);
    for (const p of cratePolys) poly(p);
    if (o.crates === 'prop') for (const c of crates) {   // the engine's flat crate, sized for its distance
      const d = cam([c.x, c.y, c.z + 8]); if (d[2] < NEAR * 2) continue;
      const size = clamp(Math.round(17 * F / d[2] / 14 * 4) / 4, .25, 12), spr = E.prop('crate', { size }).frames[0];
      picture(spr.cv, Math.floor(spr.w / 2), spr.h, [c.x, c.y, c.z], [c.x, c.y, c.z + 8], false);
    }
    heroPicture(hero);
    if (o.outlines) outlines();
    g.putImageData(img, 0, 0);
    stats.ms = performance.now() - t0;
  }

  /** keep a flying camera (radius 3) out of walls, pillars and crates below their tops, and above the floor */
  function collide(C, crates) {
    const R = 3;
    C.z = clamp(C.z, R, 220); C.x = clamp(C.x, -4 * T, FW + 4 * T); C.y = clamp(C.y, -4 * T, FH + 4 * T);
    const boxes = [];
    const gx = Math.floor(C.x / T), gy = Math.floor(C.y / T);
    for (let y = gy - 1; y <= gy + 1; y++) for (let x = gx - 1; x <= gx + 1; x++) { const h = height(x, y); if (h && C.z < h + R) boxes.push([x * T, y * T, x * T + T, y * T + T]); }
    for (const c of crates) if (C.z < c.z + 17 + R) boxes.push([c.x - 8.5, c.y - 8.5, c.x + 8.5, c.y + 8.5]);
    for (const [x0, y0, x1, y1] of boxes) {
      const nx = clamp(C.x, x0, x1), ny = clamp(C.y, y0, y1), dx = C.x - nx, dy = C.y - ny, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d > 1e-6) { C.x = nx + dx / d * R; C.y = ny + dy / d * R; continue; }
      // inside: out through the nearest side
      const l = C.x - x0, rr = x1 - C.x, t = C.y - y0, b = y1 - C.y, m = Math.min(l, rr, t, b);
      if (m === l) C.x = x0 - R; else if (m === rr) C.x = x1 + R; else if (m === t) C.y = y0 - R; else C.y = y1 + R;
    }
  }

  return { resize, render, collide, stats, get size() { return [W, H]; } };
}
window.FlyCam = FlyCam;
})();
