// ASSET PROBE: THE CONVERTER (temporary, src/labs.json "Temporary" asset-probe; docs/HANDOFF-ASSETS.md, Phase 0).
// Converts CC0 low-poly models (glTF binary) into shapes of named parts, the way docs/HANDOFF-ASSETS.md section 5.2 says,
// and measures how well each one fits: a seed for Phase 2's tools/asset-import.mjs, which replaces it.
//   1. read the meshes; y-up metres become z-up units (x16), the model's front (+z in glTF) facing south (+y)
//   2. split the mesh into parts by color and connectivity (a kit's colors come from its palette texture, colormap.png)
//   3. fit each part to the simplest primitive whose voxels match its own at an IoU of .9 or better (box, cyl, lathe,
//      prism, wedge, ball, along any axis), else merge its voxels into boxes of 1 unit
//   4. fold mirrored pairs into ['mirror', 'x' | 'y', part]; keep within 40 parts (the smallest go first)
//   5. each part's color: the nearest library material (by color), the source color kept beside it
//   6. measure the fit: the silhouette IoU at game scale against the source triangles drawn by the same rasterizer, mean
//      and worst over the views, and the color difference (CIE76) from the kit's own colors and from the library's
// Usage: node src/asset-probe.convert.mjs <out.js> <set>:<glb file> ...      (writes the converted shapes, prints the fit)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import zlib from 'node:zlib';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis;   // the engine and the renderer, in this context (a vm context's globals are slow)
vm.runInThisContext(readFileSync(join(root, 'engine/my-3d2dge.js'), 'utf8'), { filename: 'engine/my-3d2dge.js' });
for (const f of ['src/asset-probe.raster.js', 'src/asset-probe.shapes.js']) vm.runInThisContext(readFileSync(join(root, f), 'utf8'), { filename: f });
const E = globalThis.My3D2dge, AP = globalThis.AssetProbe;
let tok = s => Math.ceil(s.length / 3.2); try { const { encode } = await import('gpt-tokenizer/encoding/cl100k_base'); tok = s => encode(s).length; } catch (e) { /* estimated */ }

/* ---------- PNG (8 or 16 bits, not interlaced; 16-bit samples keep their high byte) ---------- */
export function decodePNG(buf) {
  let o = 8, w = 0, h = 0, ct = 0, bd = 8, pal = null, trns = null; const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len); o += 12 + len;
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; if ((bd !== 8 && bd !== 16) || d[12]) throw new Error('PNG: only 8 or 16 bits, not interlaced'); ct = d[9]; }
    else if (type === 'PLTE') pal = d; else if (type === 'tRNS') trns = d; else if (type === 'IDAT') idat.push(d); else if (type === 'IEND') break;
  }
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct], bpp = ch * bd / 8, raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = px.subarray(y * stride, (y + 1) * stride), up = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0, b = up ? up[x] : 0, c = up && x >= bpp ? up[x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[x] = v & 255;
    }
  }
  const rgba = new Uint8Array(w * h * 4), S = bd / 8, at = (i, c) => px[(i * ch + c) * S];   // (a 16-bit sample's high byte)
  for (let i = 0; i < w * h; i++) {
    let r, g, b, al = 255;
    if (ct === 3) { const k = px[i]; r = pal[k * 3]; g = pal[k * 3 + 1]; b = pal[k * 3 + 2]; if (trns && k < trns.length) al = trns[k]; }
    else if (ct === 0 || ct === 4) { r = g = b = at(i, 0); if (ct === 4) al = at(i, 1); } else { r = at(i, 0); g = at(i, 1); b = at(i, 2); if (ct === 6) al = at(i, 3); }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = al;
  }
  return { w, h, rgba };
}

/* ---------- glTF binary: every triangle in game units, with its color ---------- */
export function readGlb(file) {
  const buf = readFileSync(file); if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(file + ': not a .glb');
  let off = 12, G = null, bin = null;
  while (off < buf.length) { const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4), data = buf.subarray(off + 8, off + 8 + len); if (type === 0x4e4f534a) G = JSON.parse(data.toString('utf8')); else bin = data; off += 8 + len; }
  const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }, dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const RD = { 5126: [4, o => dv.getFloat32(o, true)], 5123: [2, o => dv.getUint16(o, true)], 5125: [4, o => dv.getUint32(o, true)], 5121: [1, o => dv.getUint8(o)] };
  const acc = i => { const a = G.accessors[i], bv = G.bufferViews[a.bufferView], [b, rd] = RD[a.componentType], n = SIZE[a.type], start = (bv.byteOffset || 0) + (a.byteOffset || 0), st = bv.byteStride || n * b, out = [];
    for (let k = 0; k < a.count; k++) { const row = []; for (let c = 0; c < n; c++) row.push(rd(start + k * st + c * b)); out.push(n === 1 ? row[0] : row); } return out; };
  // textures: a kit's palette, read from the file the glTF names (beside it)
  const images = (G.images || []).map(im => { try { return im.uri ? decodePNG(readFileSync(join(dirname(file), im.uri))) : null; } catch (e) { return null; } });
  const mats = (G.materials || []).map(m => { const p = m.pbrMetallicRoughness || {}, f = p.baseColorFactor || [1, 1, 1, 1], t = p.baseColorTexture;
    return { name: m.name || '', rgb: f.slice(0, 3).map(v => Math.round(255 * Math.pow(v, 1 / 2.2))), tex: t ? images[G.textures[t.index].source] : null }; });
  const mul = (A, B) => { const C = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) C[c * 4 + r] += A[k * 4 + r] * B[c * 4 + k]; return C; };
  const local = n => { if (n.matrix) return n.matrix; const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], [x, y, z, w] = q;
    return [(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0, 2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0, 2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1]; };
  const tris = [];
  const walk = (ni, M) => { const n = G.nodes[ni], W = mul(M, local(n));
    if (n.mesh !== undefined) for (const p of G.meshes[n.mesh].primitives) {
      const P = acc(p.attributes.POSITION), UV = p.attributes.TEXCOORD_0 !== undefined ? acc(p.attributes.TEXCOORD_0) : null, I = p.indices !== undefined ? acc(p.indices) : P.map((_, i) => i), m = mats[p.material || 0] || { rgb: [200, 200, 200] };
      // glTF (x right, y up, z toward the viewer) -> game (x east, y south, z up), metres -> units: the front faces south
      const tf = v => { const x = W[0] * v[0] + W[4] * v[1] + W[8] * v[2] + W[12], y = W[1] * v[0] + W[5] * v[1] + W[9] * v[2] + W[13], z = W[2] * v[0] + W[6] * v[1] + W[10] * v[2] + W[14]; return [x * 16, z * 16, y * 16]; };
      for (let i = 0; i + 2 < I.length; i += 3) {
        let rgb = m.rgb;
        if (m.tex && UV) { const u = (UV[I[i]][0] + UV[I[i + 1]][0] + UV[I[i + 2]][0]) / 3, v = (UV[I[i]][1] + UV[I[i + 1]][1] + UV[I[i + 2]][1]) / 3, T = m.tex;
          const x = Math.min(T.w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * T.w))), y = Math.min(T.h - 1, Math.max(0, Math.floor((v - Math.floor(v)) * T.h))), k = (y * T.w + x) * 4; rgb = [T.rgba[k], T.rgba[k + 1], T.rgba[k + 2]]; }
        tris.push({ rgb, v: [tf(P[I[i]]), tf(P[I[i + 1]]), tf(P[I[i + 2]])] });
      }
    }
    for (const c of n.children || []) walk(c, W); };
  for (const r of G.scenes[G.scene || 0].nodes) walk(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return { tris, faces: tris.length };
}

/* ---------- colors ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function lab([r, g, b]) {
  const f = v => { v /= 255; return v > .04045 ? Math.pow((v + .055) / 1.055, 2.4) : v / 12.92; }, R = f(r), Gg = f(g), B = f(b);
  const X = (R * .4124 + Gg * .3576 + B * .1805) / .95047, Y = R * .2126 + Gg * .7152 + B * .0722, Z = (R * .0193 + Gg * .1192 + B * .9505) / 1.08883;
  const h = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))];
}
const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
/** the library material nearest a color (the probe's own materials, by their base color) */
function nearestMat(rgb) {
  let best = null, bd = 1e9;
  for (const [id, m] of Object.entries(AP.MATERIALS)) { if (m.glow) continue; const d = dE(rgb, E.hex(m.color)); if (d < bd) { bd = d; best = id; } }
  return { id: best, dE: bd };
}

/* ---------- voxels ---------- */
/** points on a part's surface, about `step` apart: what the solid's projections and profiles are read from */
function samples(T, step) {
  const out = [];
  for (const [a, b, d] of T) {
    const e = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]), Math.hypot(d[0] - b[0], d[1] - b[1], d[2] - b[2])), st = Math.max(1, Math.ceil(e / step));
    for (let i = 0; i <= st; i++) for (let j = 0; j <= st - i; j++) { const u = i / st, w = j / st; out.push([a[0] + (b[0] - a[0]) * u + (d[0] - a[0]) * w, a[1] + (b[1] - a[1]) * u + (d[1] - a[1]) * w, a[2] + (b[2] - a[2]) * u + (d[2] - a[2]) * w]); }
  }
  return out;
}
/** a part's solid at cell size c, as its visual hull: a cell is inside when it is inside the part's silhouette along all
 *  three axes (each silhouette the surface's projection, its holes filled), so gaps between a kit's pieces never leak.
 *  cells: 2 inside, 1 on the hull's skin (counted half), 0 outside */
function voxelize(S, c) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const v of S) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); }
  const o = lo.map(x => Math.floor(x / c) - 1), n = hi.map((x, k) => Math.floor(x / c) - o[k] + 2), NN = n[0] * n[1] * n[2], cells = new Uint8Array(NN), I = (x, y, z) => (z * n[1] + y) * n[0] + x;
  const sil = (a, b) => {   // the silhouette on the plane of axes a, b: projected, then its holes filled
    const w = n[a], h = n[b], m = new Uint8Array(w * h);
    for (const v of S) m[(Math.floor(v[b] / c) - o[b]) * w + Math.floor(v[a] / c) - o[a]] = 1;
    const out = new Uint8Array(w * h), q = [0]; out[0] = 1;
    while (q.length) { const i = q.pop(), x = i % w, y = (i / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (!out[j] && !m[j]) { out[j] = 1; q.push(j); } } }
    for (let i = 0; i < w * h; i++) m[i] = out[i] ? 0 : 1;
    return m;
  };
  const mz = sil(0, 1), my = sil(0, 2), mx = sil(1, 2);
  for (let z = 0; z < n[2]; z++) for (let y = 0; y < n[1]; y++) for (let x = 0; x < n[0]; x++) if (mz[y * n[0] + x] && my[z * n[0] + x] && mx[z * n[1] + y]) cells[I(x, y, z)] = 2;
  let N = 0;
  for (let z = 0; z < n[2]; z++) for (let y = 0; y < n[1]; y++) for (let x = 0; x < n[0]; x++) {
    const i = I(x, y, z); if (!cells[i]) continue;
    if (x === 0 || y === 0 || z === 0 || x === n[0] - 1 || y === n[1] - 1 || z === n[2] - 1 || !cells[i - 1] || !cells[i + 1] || !cells[i - n[0]] || !cells[i + n[0]] || !cells[i - n[0] * n[1]] || !cells[i + n[0] * n[1]]) cells[i] = 1;
  }
  for (let i = 0; i < NN; i++) N += cells[i] === 2 ? 1 : cells[i] ? .5 : 0;
  return { o, n, cells, N, c };
}
/** the IoU of a part's voxels with a candidate solid (inside(x, y, z) at cell centres). Skin cells are left out of both
 *  sides: a cell the surface only clips is neither in nor out, so an exact fit scores 1 at any cell size */
function iou(vx, inside) {
  const { o, n, cells, c } = vx; let inter = 0, uni = 0;
  for (let z = 0; z < n[2]; z++) for (let y = 0; y < n[1]; y++) for (let x = 0; x < n[0]; x++) {
    const v = cells[(z * n[1] + y) * n[0] + x]; if (v === 1) continue;
    const P = inside((x + o[0] + .5) * c, (y + o[1] + .5) * c, (z + o[2] + .5) * c);
    if (P && v) inter++; if (P || v) uni++;
  }
  return inter / (uni || 1);
}
/** Douglas-Peucker on an open polyline */
function dp(P, tol) {
  if (P.length < 3) return P;
  let k = 0, d = 0; const [a, b] = [P[0], P[P.length - 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
  for (let i = 1; i < P.length - 1; i++) { const e = Math.abs((b[0] - a[0]) * (a[1] - P[i][1]) - (a[0] - P[i][0]) * (b[1] - a[1])) / L; if (e > d) { d = e; k = i; } }
  return d <= tol ? [a, b] : dp(P.slice(0, k + 1), tol).slice(0, -1).concat(dp(P.slice(k), tol));
}
/** the outer boundary of a 2D mask (w x h, 1 = filled) as a polygon in cell corners, simplified */
function contour(mask, w, h, tol) {
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x];
  const next = new Map(), key = (x, y) => x + ',' + y;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {   // directed boundary edges, the filled cell on the left
    if (!at(x, y)) continue;
    if (!at(x, y - 1)) next.set(key(x + 1, y), [x, y]); if (!at(x, y + 1)) next.set(key(x, y + 1), [x + 1, y + 1]);
    if (!at(x - 1, y)) next.set(key(x, y), [x, y + 1]); if (!at(x + 1, y)) next.set(key(x + 1, y + 1), [x + 1, y]);
  }
  let best = [];
  const seen = new Set();
  for (const k of next.keys()) {
    if (seen.has(k)) continue;
    const loop = []; let c = k.split(',').map(Number), guard = 0;
    while (guard++ < 1e5) { const kk = key(c[0], c[1]); if (seen.has(kk)) break; seen.add(kk); loop.push(c); c = next.get(kk); if (!c) break; }
    if (loop.length > best.length) best = loop;
  }
  if (best.length < 3) return best;
  let far = 0, fd = 0; for (let i = 0; i < best.length; i++) { const d = Math.hypot(best[i][0] - best[0][0], best[i][1] - best[0][1]); if (d > fd) { fd = d; far = i; } }
  const A = dp(best.slice(0, far + 1), tol), B = dp(best.slice(far).concat([best[0]]), tol);
  return A.slice(0, -1).concat(B.slice(0, -1));
}

/* ---------- fitting one part ---------- */
const r1 = v => Math.round(v * 2) / 2, rd = v => Math.abs(v) < 4 ? Math.round(v * 10) / 10 : r1(v);   // half units, tenths when small
const AX = { z: [2, 0, 1], x: [0, 1, 2], y: [1, 0, 2] };   // the axis, then the two across it (the outline's own two)
let TOL = +(process.env.FIT_TOL || .9);   // a part's IoU with its primitive, at least
const ROT = { z: null, x: [0, 90, 0], y: [-90, 0, 0] };   // turns a part's own z onto that axis
/** the simplest primitive for a part (its triangles T): { part, iou, cost } (part null and parts [...] when boxes) */
function fitPart(T, mat, o = {}) {
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const t of T) for (const v of t) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); }
  // a plate thinner than a pixel is drawn half a unit thick (a coffin's floor, a painted panel)
  for (let k = 0; k < 3; k++) if (hi[k] - lo[k] < .5) { const m = (hi[k] + lo[k]) / 2; lo[k] = m - .25; hi[k] = m + .25; }
  const dim = hi.map((v, k) => v - lo[k]), c = Math.min(1, Math.max(.06, Math.min(Math.max(...dim) / 36, Math.min(...dim) / 5)));
  const S = samples(T, c * .45).map(v => v.map((x, k) => Math.min(hi[k], Math.max(lo[k], x)))), vx = voxelize(S.concat([lo, hi]), c), ctr = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], cands = [];
  const inBox = (x, y, z) => x >= lo[0] && x <= hi[0] && y >= lo[1] && y <= hi[1] && z >= lo[2] && z <= hi[2];
  cands.push({ iou: iou(vx, inBox), part: ['box', mat, [rd(ctr[0]), rd(ctr[1]), rd(lo[2])], dim.map(rd)] });
  { const R = (dim[0] + dim[1]) / 4, H = dim[2] / 2; cands.push({ iou: iou(vx, (x, y, z) => ((x - ctr[0]) ** 2 + (y - ctr[1]) ** 2) / (R * R) + ((z - ctr[2]) / H) ** 2 <= 1), part: ['ball', mat, [rd(ctr[0]), rd(ctr[1]), rd(ctr[2])], rd(R), Math.abs(H / R - 1) > .05 ? { sz: Math.round(H / R * 100) / 100 } : undefined] }); }
  for (const ax of ['z', 'x', 'y']) {
    const [a, p, q] = AX[ax], len = dim[a];
    // a lathe (or a cyl, or a cone) about this axis through the middle: the largest radius of each slice, simplified
    const nb = Math.max(2, Math.min(40, Math.round(len / c))), bin = len / nb, rmax = new Float64Array(nb);
    for (const v of S) { const s = Math.min(nb - 1, Math.floor((v[a] - lo[a]) / bin)), r = Math.hypot(v[p] - ctr[p], v[q] - ctr[q]); if (r > rmax[s]) rmax[s] = r; }
    const rAt = h => rmax[Math.min(nb - 1, Math.max(0, Math.floor(h / bin)))];
    const lat = iou(vx, (x, y, z) => { const w = [x, y, z], h = w[a] - lo[a]; return h >= 0 && h <= len && Math.hypot(w[p] - ctr[p], w[q] - ctr[q]) <= rAt(h); });
    let pts = [[0, 0]]; for (let s = 0; s < nb; s++) pts.push([rmax[s], s * bin], [rmax[s], (s + 1) * bin]); pts.push([0, len]);
    pts = dp(pts, Math.max(c, len / 30)).map(([r, z]) => [rd(r), rd(z)]);
    pts = pts.filter((v, i) => !i || v[0] !== pts[i - 1][0] || v[1] !== pts[i - 1][1]);
    const at = [0, 0, 0]; at[a] = lo[a]; at[p] = ctr[p]; at[q] = ctr[q];
    const ro = ROT[ax] ? { rot: ROT[ax] } : undefined;
    if (pts.length === 4 && pts[0][0] === 0 && pts[3][0] === 0 && pts[1][1] === 0) {   // a cylinder, or a frustum
      const [rb, rt] = [pts[1][0], pts[2][0]];
      cands.push({ iou: lat, part: ['cyl', mat, at.map(rd), rb, rd(len), Object.assign({}, ro, rt !== rb ? { r2: rt } : {})] });
    } else if (pts.length <= 10) cands.push({ iou: lat, part: ['lathe', mat, at.map(rd), pts, ro] });
    // a prism along this axis: the silhouette across it (the surface's projection), its outline traced and simplified
    { const g = c * .5, w = Math.ceil(dim[p] / g) + 1, h = Math.ceil(dim[q] / g) + 1, mask = new Uint8Array(w * h);
      for (const v of S) mask[Math.min(h - 1, Math.floor((v[q] - lo[q]) / g)) * w + Math.min(w - 1, Math.floor((v[p] - lo[p]) / g))] = 1;
      // (fill the inside of the outline: a closed part's surface covers its silhouette, a gap of a cell is closed)
      const ol = contour(mask, w, h, Math.max(1.2, Math.max(w, h) / 28)).map(([u, v]) => [lo[p] + u * g, lo[q] + v * g]);
      if (ol.length >= 3 && ol.length <= 10) {
        const poly = ol, inPoly = (u, v) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
        const pri = iou(vx, (x, y, z) => { const w2 = [x, y, z]; return w2[a] >= lo[a] && w2[a] <= hi[a] && inPoly(w2[p], w2[q]); });
        // prism (axis z): outline (x, y), up from at; (axis y): outline (x, z), centred on at; (axis x): outline (y, z)
        const atP = [0, 0, 0]; if (ax === 'z') atP[2] = lo[2]; else atP[a] = ctr[a];
        const outline = ol;
        cands.push({ iou: pri, part: ['prism', mat, atP.map(rd), outline.map(([u, v]) => [rd(u), rd(v)]), rd(len), ax === 'z' ? undefined : { axis: ax }] });
      }
    }
  }
  for (const r of [0, 90, 180, 270]) {   // a wedge, its high side to each of the four sides
    const sw = r % 180 ? [dim[1], dim[0]] : [dim[0], dim[1]], cs = Math.cos(r * Math.PI / 180), sn = Math.sin(r * Math.PI / 180);
    const inside = (x, y, z) => { const dx = x - ctr[0], dy = y - ctr[1], lx = dx * cs + dy * sn, ly = -dx * sn + dy * cs; if (Math.abs(lx) > sw[0] / 2 || Math.abs(ly) > sw[1] / 2) return false; return z - lo[2] >= 0 && z - lo[2] <= dim[2] * (.5 - ly / sw[1]); };
    cands.push({ iou: iou(vx, inside), part: ['wedge', mat, [rd(ctr[0]), rd(ctr[1]), rd(lo[2])], [rd(sw[0]), rd(sw[1]), rd(dim[2])], r ? { rot: r } : undefined] });
  }
  for (const k of cands) { k.part = k.part.filter(x => x !== undefined); k.cost = tok(JSON.stringify(k.part)); }
  if (process.env.FITDBG) console.log(cands.map(k => k.part[0] + (k.part[5] && k.part[5].axis || k.part[4] && k.part[4].rot || '') + ' ' + k.iou.toFixed(2) + ' ' + k.cost).join(' | '));
  const ok = cands.filter(k => k.iou >= (o.tol || TOL)).sort((x, y) => x.cost - y.cost);
  if (ok.length) return Object.assign(ok[0], { size: vx.N * c ** 3 });
  const best = cands.sort((x, y) => y.iou - x.iou)[0];
  if (o.noBoxes) return Object.assign(best, { size: vx.N * c ** 3 });
  // boxes: the part's solid at 1 unit (or its own cell when finer is needed), merged greedily
  const v1 = voxelize(S, Math.max(.5, c, Math.min(1, Math.min(...dim) / 1.5))), boxes = greedy(v1, mat), bc = tok(JSON.stringify(boxes));
  if (best.iou >= .7 && best.cost * 2 < bc) return Object.assign(best, { size: vx.N * c ** 3 });
  return { iou: 1, part: null, parts: boxes, cost: bc, size: vx.N * c ** 3, boxes: boxes.length };
}
function greedy(vx, mat) {
  const { o, n, c } = vx, cells = vx.cells.map(v => v ? 1 : 0), used = new Uint8Array(cells.length), I = (x, y, z) => (z * n[1] + y) * n[0] + x, out = [];
  for (let z = 0; z < n[2]; z++) for (let y = 0; y < n[1]; y++) for (let x = 0; x < n[0]; x++) {
    if (!cells[I(x, y, z)] || used[I(x, y, z)]) continue;
    const ok = (X, Y, Z) => X < n[0] && Y < n[1] && Z < n[2] && cells[I(X, Y, Z)] && !used[I(X, Y, Z)];
    let x1 = x; while (ok(x1 + 1, y, z)) x1++;
    let y1 = y; const rowOk = Y => { for (let X = x; X <= x1; X++) if (!ok(X, Y, z)) return false; return true; }; while (rowOk(y1 + 1)) y1++;
    let z1 = z; const slabOk = Z => { for (let Y = y; Y <= y1; Y++) for (let X = x; X <= x1; X++) if (!ok(X, Y, Z)) return false; return true; }; while (slabOk(z1 + 1)) z1++;
    for (let Z = z; Z <= z1; Z++) for (let Y = y; Y <= y1; Y++) for (let X = x; X <= x1; X++) used[I(X, Y, Z)] = 1;
    const w = (x1 - x + 1) * c, d = (y1 - y + 1) * c, h = (z1 - z + 1) * c;
    out.push(['box', mat, [rd((x + o[0]) * c + w / 2), rd((y + o[1]) * c + d / 2), rd((z + o[2]) * c)], [rd(w), rd(d), rd(h)]]);
  }
  return out;
}

/* ---------- one model ---------- */
const ANGLES = [['iso', 0], ['threequarter', 0], ['topdown', 1], ['brawler', 0], ['side', 0], ['iso', 1.6], ['iso', 3.2], ['iso', 4.7]];
export function convert(file, o = {}) {
  const { tris } = readGlb(file);
  // centre the footprint on the origin, the lowest point on the floor
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const t of tris) for (const v of t.v) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); }
  const sc = o.scale || 1, sh = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]];
  for (const t of tris) t.v = t.v.map(v => [(v[0] - sh[0]) * sc, (v[1] - sh[1]) * sc, (v[2] - sh[2]) * sc]);
  // colors: a kit's palette shades each swatch in a gradient, so shades of one hue are one color (CIE Lab, lightness
  // counting a third); each cluster's color is its area-weighted mean
  const area = t => { const [a, b, c] = t.v, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; return Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2; };
  const shades = new Map(); for (const t of tris) { const k = t.rgb.join(','); if (!shades.has(k)) shades.set(k, { rgb: t.rgb, lab: lab(t.rgb), a: 0 }); shades.get(k).a += area(t); }
  const clusters = [];
  for (const sh2 of [...shades.values()].sort((x, y) => y.a - x.a)) {
    let best = null, bd = o.colorTol || 11;
    for (const cl of clusters) { const d = Math.hypot((sh2.lab[0] - cl.lab[0]) / 3, sh2.lab[1] - cl.lab[1], sh2.lab[2] - cl.lab[2]); if (d < bd) { bd = d; best = cl; } }
    if (!best) clusters.push(best = { lab: sh2.lab, sum: [0, 0, 0], a: 0, keys: [] });
    best.keys.push(sh2.rgb.join(',')); best.a += sh2.a; for (let k = 0; k < 3; k++) best.sum[k] += sh2.rgb[k] * sh2.a;
  }
  const colors = new Map(), ofShade = new Map();
  clusters.forEach((cl, i) => { const rgb = cl.sum.map(v => v / cl.a); colors.set(i, { rgb, area: cl.a }); for (const k of cl.keys) ofShade.set(k, i); });
  for (const t of tris) t.ck = ofShade.get(t.rgb.join(','));
  // pieces: connected triangles of one color
  const vkey = v => v.map(x => Math.round(x * 8)).join(','), id = new Map(), P = [], find = i => P[i] === i ? i : (P[i] = find(P[i]));
  const vi = tris.map(t => t.v.map(v => { const k = t.ck + '|' + vkey(v); if (!id.has(k)) { id.set(k, P.length); P.push(P.length); } return id.get(k); }));
  for (const t of vi) { P[find(t[1])] = find(t[0]); P[find(t[2])] = find(t[0]); }
  const groups = new Map(); tris.forEach((t, i) => { const r = find(vi[i][0]); if (!groups.has(r)) groups.set(r, { ck: t.ck, T: [] }); groups.get(r).T.push(t.v); });
  // slots: a letter per color, the nearest library material for it
  const slots = {}, mats = {}, src = {}; let sl = 0;
  for (const [k, col] of [...colors].sort((x, y) => y[1].area - x[1].area)) { const s = String.fromCharCode(97 + sl++); slots[k] = s; const nm = nearestMat(col.rgb); mats[s] = nm.id; src[s] = hex(col.rgb); col.mat = nm; }
  // fit: all the pieces of a color together first (a barrel's staves are one turned shape); what does not fit is split in
  // two where its pieces spread most, down to single pieces (which may become boxes). Pieces under a pixel are left out
  const fitted = [], tiny = o.tiny === undefined ? .6 : o.tiny;
  const solve = list => {
    const T = list.flatMap(g => g.T), mat = slots[list[0].ck];
    if (list.length === 1) { fitted.push(fitPart(T, mat)); return; }
    const f = fitPart(T, mat, { noBoxes: true }); if (f.iou >= TOL) { fitted.push(f); return; }
    const C = list.map(g => { const s = [0, 0, 0]; for (const t of g.T) for (const v of t) for (let k = 0; k < 3; k++) s[k] += v[k] / (g.T.length * 3); return s; });
    let ax = 0, sp = -1; for (let k = 0; k < 3; k++) { const vs = C.map(q => q[k]), d = Math.max(...vs) - Math.min(...vs); if (d > sp) { sp = d; ax = k; } }
    const order = list.map((g, i) => [C[i][ax], g]).sort((x, y) => x[0] - y[0]).map(x => x[1]), half = order.length >> 1;
    solve(order.slice(0, half)); solve(order.slice(half));
  };
  const byColor = new Map();
  for (const g of groups.values()) {
    let l0 = [1e9, 1e9, 1e9], h0 = [-1e9, -1e9, -1e9]; for (const t of g.T) for (const v of t) for (let k = 0; k < 3; k++) { l0[k] = Math.min(l0[k], v[k]); h0[k] = Math.max(h0[k], v[k]); }
    if (Math.max(h0[0] - l0[0], h0[1] - l0[1], h0[2] - l0[2]) < tiny) continue;
    if (!byColor.has(g.ck)) byColor.set(g.ck, []); byColor.get(g.ck).push(g);
  }
  for (const list of byColor.values()) solve(list);
  fitted.sort((a, b) => b.size - a.size);
  let parts = fitted.flatMap(f => f.part ? [f.part] : f.parts);
  parts = foldMirrors(parts);
  parts = visible(parts, mats);
  const budget = o.budget || 40; if (parts.length > budget) parts = parts.slice(0, budget);
  const entry = { about: o.about || basename(file, '.glb').replace(/-/g, ' '), tags: o.tags || '', mats, parts, src: o.src, orig: o.orig || basename(file) };
  // the fit: silhouettes at game scale (the source's triangles through the same rasterizer), each view
  const mesh = { mats: { m: '#808080' }, parts: [['mesh', 'm', [0, 0, 0], tris.map(t => t.v)]] };
  const ious = ANGLES.map(([v, f]) => { const view = f === 1 ? E.charView(E.VIEWS[v]) : E.VIEWS[v], fc = Math.PI / 2 + .45 + (f > 1 ? f : 0);
    return silIoU(AP.raster(entry, view, { facing: fc }), AP.raster(mesh, view, { facing: fc })); });
  // the color: each source color against its slot's material (remapped) and against the source itself (exact)
  // the color: each triangle's own color against its slot's (the kit's colors: dE), and against the library material its
  // slot maps to (dElib)
  let tot = 0, de = 0, dl = 0; for (const t of tris) { const a = area(t), col = colors.get(t.ck); tot += a; de += a * dE(t.rgb, col.rgb); dl += a * col.mat.dE; }
  entry.fit = { iou: Math.round(ious.reduce((a, b) => a + b, 0) / ious.length * 100) / 100, worst: Math.round(Math.min(...ious) * 100) / 100, dE: Math.round(de / tot), dElib: Math.round(dl / tot) };
  return { entry, tris: tris.length, colors: colors.size, groups: groups.size, ious, fitted, srcColors: src };
}
/** the parts some view shows (a part wholly inside another, or under it, is left out) */
function visible(parts, mats) {
  const range = [], seen = new Set(); let k = 0;
  for (const p of parts) { const n = AP.resolve({ mats, parts: [p] }).prims.length; range.push([k, k + n]); k += n; }
  for (const [v, f] of ANGLES) for (const extra of [0, Math.PI]) {
    const r = AP.raster({ mats, parts }, f === 1 ? E.charView(E.VIEWS[v]) : E.VIEWS[v], { facing: Math.PI / 2 + .45 + (f > 1 ? f : 0) + extra });
    for (const q of r.part) if (q >= 0) seen.add(q);
  }
  return parts.filter((p, i) => { for (let q = range[i][0]; q < range[i][1]; q++) if (seen.has(q)) return true; return false; });
}
function silIoU(a, b) {
  // the two masks with their origins together
  let inter = 0, uni = 0; const x0 = Math.min(-a.ox, -b.ox), y0 = Math.min(-a.oy, -b.oy), x1 = Math.max(a.w - a.ox, b.w - b.ox), y1 = Math.max(a.h - a.oy, b.h - b.oy);
  const on = (r, x, y) => { const X = x + r.ox, Y = y + r.oy; return X >= 0 && Y >= 0 && X < r.w && Y < r.h && r.rgba[(Y * r.w + X) * 4 + 3] > 0; };
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = on(a, x, y), q = on(b, x, y); if (p || q) uni++; if (p && q) inter++; }
  return inter / (uni || 1);
}
/** two parts the same but for x (or y) negated -> ['mirror', 'x' | 'y', part] */
function foldMirrors(parts) {
  const out = [], used = new Set(), sig = p => JSON.stringify([p[0], p[1], p.slice(3)]);
  for (let i = 0; i < parts.length; i++) {
    if (used.has(i)) continue; const p = parts[i];
    if (!Array.isArray(p[2])) { out.push(p); continue; }
    let done = false;
    for (const [axis, k] of [['x', 0], ['y', 1]]) {
      if (Math.abs(p[2][k]) < .3 || (p[0] !== 'box' && p[0] !== 'cyl' && p[0] !== 'ball' && !(p[0] === 'lathe' && !p[4]))) continue;
      for (let j = i + 1; j < parts.length; j++) {
        if (used.has(j)) continue; const q = parts[j]; if (sig(q) !== sig(p) || !Array.isArray(q[2])) continue;
        const m = [...p[2]]; m[k] = -m[k];
        if (Math.abs(m[0] - q[2][0]) < .3 && Math.abs(m[1] - q[2][1]) < .3 && Math.abs(m[2] - q[2][2]) < .3) {
          const keep = p[2][k] > 0 ? p : q; out.push(['mirror', axis, keep]); used.add(j); done = true; break;
        }
      }
      if (done) break;
    }
    if (!done) out.push(p);
  }
  return out;
}

/* ---------- the command ---------- */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [out, ...items] = process.argv.slice(2);
  if (!out || !items.length) { console.error('Usage: node src/asset-probe.convert.mjs <out.js> <id>=<set>:<file.glb>[:scale] ...'); process.exit(2); }
  const sets = {}, shapes = {}, rows = [];
  for (const it of items) {
    const [id, rest] = it.split('='), [set, file, scale] = rest.split(':');
    const r = convert(file, { src: set, scale: scale ? +scale : 1 });
    shapes[id] = r.entry; r.entry.srcColors = r.srcColors;
    if (!sets[set]) { const lic = readFileSync(join(dirname(file), '..', '..', 'License.txt')); sets[set] = { license: /CC0/.test(lic.toString()) ? 'CC0 1.0' : '?', licenseHash: createHash('sha256').update(lic).digest('hex').slice(0, 16) }; }
    rows.push([id, r.tris, r.groups, JSON.stringify(r.entry.parts).length, tok(JSON.stringify(r.entry.parts)), r.entry.parts.length, r.entry.fit.iou, r.entry.fit.worst, r.entry.fit.dE]);
    console.log(`${id.padEnd(16)} ${String(r.tris).padStart(5)} tris, ${r.groups} pieces -> ${r.entry.parts.length} parts, ${tok(JSON.stringify(r.entry.parts))} tokens; IoU mean ${r.entry.fit.iou}, worst ${r.entry.fit.worst} (${r.ious.map(v => v.toFixed(2)).join(' ')}); dE ${r.entry.fit.dE}`);
  }
  const text = `/* ASSET PROBE: CONVERTED MODELS (temporary, src/labs.json "Temporary" asset-probe). Written by src/asset-probe.convert.mjs from
 * Kenney's 3D kits (kenney.nl), CC0 1.0. Each entry: mats (each slot's nearest library material), srcColors (the model's own
 * colors), src (its kit), orig (its file), fit (silhouette IoU at game scale, mean and worst over 8 views; color dE). */
(window.AssetProbe.CONVERTED = window.AssetProbe.CONVERTED || {}, Object.assign(window.AssetProbe.CONVERTED, ${JSON.stringify(shapes, null, 0).replace(/\{"about"/g, '\n{"about"')}));
window.AssetProbe.CONVERTED_SETS = ${JSON.stringify(sets)};
`;
  writeFileSync(out, text);
  console.log('wrote', out, text.length, 'bytes');
}
