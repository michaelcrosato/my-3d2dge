/* =============================================================================
 * SHAPE RASTER (temporary, shared by the Shapes vs props lab and the Free camera room, src/labs.json "Temporary"):
 * draws a converted 3D model (a list of boxes, src/shapes-compare.data.js) at game size from any view and facing. Every
 * visible box face is rasterized with a small depth buffer (whole pixels, nearer wins) and shaded with a tone of
 * E.tones by how it faces the light; window.ShapeRaster.outline adds the renderer's 1-px actor outline. Throwaway: it
 * goes with the last of the two labs (HANDOFF.md, the Shapes library plan).
 * ============================================================================= */
(() => {
'use strict';
const E = My3D2dge, OUTLINE = [20, 12, 28];   // the renderer's outline color, #140c1c
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); }, LIGHT = norm([-.55, -.35, .76]);

/* ---- colors: any CSS color -> [r, g, b] ---- */
const cc = document.createElement('canvas').getContext('2d'), rgbs = new Map();
function rgb(c) {
  let v = rgbs.get(c); if (v) return v;
  cc.fillStyle = '#000'; cc.fillStyle = c; const h = cc.fillStyle;
  v = h[0] === '#' ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : h.match(/[\d.]+/g).slice(0, 3).map(Number);
  rgbs.set(c, v); return v;
}

/** a shape's footprint centre and floor (d.c), and its tones (d.T). Call once per shape before raster() */
function prep(d) {
  if (d.c) return d;
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const b of d.b) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b[1 + k]); hi[k] = Math.max(hi[k], b[4 + k]); }
  d.c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]]; d.size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  d.T = d.mats.map(m => { const t = E.tones(m); return { deep: rgb(t.deep), sh: rgb(t.sh), base: rgb(t.base), lt: rgb(t.lt), hi: rgb(t.hi) }; });
  return d;
}
// a box's corners (bit 0 x, bit 1 y, bit 2 z) and its faces: [corners in order, outward normal]
const FACES = [[[4, 5, 7, 6], [0, 0, 1]], [[0, 2, 3, 1], [0, 0, -1]], [[1, 3, 7, 5], [1, 0, 0]], [[0, 4, 6, 2], [-1, 0, 0]], [[2, 6, 7, 3], [0, 1, 0]], [[0, 1, 5, 4], [0, -1, 0]]];
const edge = (a, b, x, y) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);

/**
 * Draw a shape at game size into a canvas: every visible face rasterized with a depth buffer (nearer wins), shaded by
 * how it faces the light. k scales the shape; edges lights the top silhouette of upward faces. Returns { cv, ox, oy }:
 * the canvas and where the shape's feet are in it.
 */
function raster(d, view, facing, k = 1, edges = true) {
  prep(d);
  const c = Math.cos(facing), s = Math.sin(facing), [cx, cy, cz] = d.c, D = [view.dx, view.dy, view.dz];
  const P = (x, y, z) => { x = (x - cx) * k; y = (y - cy) * k; z = (z - cz) * k; const X = x * c - y * s, Y = x * s + y * c; return [view.ax * X + view.ay * Y, view.bx * X + view.by * Y + view.bz * z, view.dx * X + view.dy * Y + view.dz * z]; };
  const boxes = d.b.map(b => { const q = []; for (let i = 0; i < 8; i++) q.push(P(i & 1 ? b[4] : b[1], i & 2 ? b[5] : b[2], i & 4 ? b[6] : b[3])); return [b[0], q]; });
  let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
  for (const [, q] of boxes) for (const p of q) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const ox = 2 - Math.floor(x0), oy = 2 - Math.floor(y0), W = Math.ceil(x1) + ox + 3, H = Math.ceil(y1) + oy + 3;
  const zb = new Float32Array(W * H).fill(-Infinity), col = new Uint8ClampedArray(W * H * 4), top = new Uint8Array(W * H);
  for (const [m, q] of boxes) for (const [ix, n0] of FACES) {
    const n = [n0[0] * c - n0[1] * s, n0[0] * s + n0[1] * c, n0[2]];
    if (n[0] * D[0] + n[1] * D[1] + n[2] * D[2] <= 1e-6) continue;   // faces away from the camera
    const lit = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2], t = d.T[m] || d.T[0];
    const C = lit > .6 ? t.lt : lit > .15 ? t.base : lit > -.35 ? t.sh : t.deep, up = n[2] > .5 ? 1 : 0;
    const v = ix.map(i => [q[i][0] + ox, q[i][1] + oy, q[i][2]]);
    for (const [a, b, e] of [[v[0], v[1], v[2]], [v[0], v[2], v[3]]]) {
      const area = edge(a, b, e[0], e[1]); if (Math.abs(area) < 1e-9) continue;
      const mx = Math.max(0, Math.floor(Math.min(a[0], b[0], e[0]))), Mx = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], e[0])));
      const my = Math.max(0, Math.floor(Math.min(a[1], b[1], e[1]))), My = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], e[1])));
      for (let y = my; y <= My; y++) for (let x = mx; x <= Mx; x++) {
        const px = x + .5, py = y + .5, l0 = edge(b, e, px, py) / area, l1 = edge(e, a, px, py) / area, l2 = 1 - l0 - l1;
        if (l0 < -1e-9 || l1 < -1e-9 || l2 < -1e-9) continue;
        const z = l0 * a[2] + l1 * b[2] + l2 * e[2], i = y * W + x;
        if (z <= zb[i] + 1e-6) continue;
        zb[i] = z; top[i] = up; col[i * 4] = C[0]; col[i * 4 + 1] = C[1]; col[i * 4 + 2] = C[2]; col[i * 4 + 3] = 255;
      }
    }
  }
  // lit edges: the top silhouette of upward faces one tone brighter, the way pixel artists light a top edge
  if (edges) for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!top[i] || col[(i - W) * 4 + 3]) continue;
    const t = col.subarray(i * 4, i * 4 + 3); for (let k2 = 0; k2 < 3; k2++) t[k2] = Math.min(255, t[k2] + 34);
  }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.getContext('2d').putImageData(new ImageData(col, W, H), 0, 0);
  return { cv, ox, oy };
}

/* ---- a 1-px dark outline around everything drawn in a canvas, the way the renderer outlines actors ---- */
function outline(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, img = g.getImageData(0, 0, W, H), a = img.data, solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) solid[i] = a[i * 4 + 3] > 0 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (solid[i]) continue;
    if ((x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) { a[i * 4] = OUTLINE[0]; a[i * 4 + 1] = OUTLINE[1]; a[i * 4 + 2] = OUTLINE[2]; a[i * 4 + 3] = 255; }
  }
  g.putImageData(img, 0, 0); return cv;
}

window.ShapeRaster = { prep, raster, outline, rgb };
})();
