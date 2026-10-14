/* =============================================================================
 * ASSET PROBE: THE SHAPE RENDERER (temporary, src/labs.json "Temporary" asset-probe; docs/HANDOFF-ASSETS.md, Phase 0).
 * Draws a still 3D object written as named parts with named materials, at game size, from any view and facing:
 *   1. resolve: the parts (box, cyl, lathe, ball, prism, wedge, rock; use, mirror, ring, row, group) become primitives,
 *      each with its transform and material (a shape's slot -> a material id or a shorthand '#8a5a36 planks bw=3')
 *   2. tessellate: each primitive becomes faces, flat or smooth, with surface coordinates (u, v) in world units: on a
 *      side u runs round or across and v runs up; on a lid (a face looking up or down) u, v are its own x, y
 *   3. rasterize: every face into a depth buffer at game size (whole pixels, nearer wins), keeping per pixel its normal,
 *      surface coordinates and face (deferred: patterns run once per visible pixel)
 *   4. shade: the normal against the key light picks a band of the material's ramp (deep, sh, base, lt, hi); the
 *      pattern moves it by a step (-1 .. +2); creases darken a part just behind a nearer one; top edges are lit
 * Runs in the browser and in Node (a vm with the engine loaded), so the converter measures fit with the same pixels.
 *   AssetProbe.raster(shape, view, { facing, scale, flip, mats, light, edges, creases, dither }) -> { w, h, ox, oy, rgba, ms }
 * Phase 1 moves this into the engine (E.SHAPES, E.MATERIALS, E.PATTERNS, r.shape); until then it is a prototype.
 * ============================================================================= */
(() => {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis, E = G.My3D2dge;
const AP = G.AssetProbe = G.AssetProbe || {};
const DEG = Math.PI / 180, TAU = Math.PI * 2;
const SHAPES = AP.SHAPES = AP.SHAPES || {}, MATERIALS = AP.MATERIALS = AP.MATERIALS || {}, PATTERNS = AP.PATTERNS = AP.PATTERNS || {};
const warned = new Set(), warn = (k, m) => { if (!warned.has(k)) { warned.add(k); console.warn('asset probe: ' + m); } };

/* ---------- 3 x 3 matrices, row-major: v' = M v ---------- */
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mm = (A, B) => [
  A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8],
  A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8],
  A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8]];
const mv = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const rz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
/** rot in asset data: a yaw in degrees, or [x, y, z] degrees (turned about x, then y, then z) */
const rot = r => !r ? I3 : typeof r === 'number' ? rz(r * DEG) : mm(rz((r[2] || 0) * DEG), mm(ry((r[1] || 0) * DEG), rx((r[0] || 0) * DEG)));
const dg = (x, y, z) => [x, 0, 0, 0, y, 0, 0, 0, z];
/** the inverse transpose (normals), sign kept so a mirrored part's normals still point out */
function invT(M) {
  const [a, b, c, d, e, f, g, h, i] = M, A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
  const det = a * A + b * B + c * C || 1e-9;
  return [A / det, B / det, C / det, (c * h - b * i) / det, (a * i - c * g) / det, (b * g - a * h) / det, (b * f - c * e) / det, (c * d - a * f) / det, (a * e - b * d) / det];
}
const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/* ---------- materials: a color and its five tones, a pattern and the numbers it reads ---------- */
/** '#8a5a36 planks bw=3' -> { color: '#8a5a36', pattern: 'planks', bw: 3 } */
function parseMat(s) {
  const w = String(s).trim().split(/\s+/), o = { color: w[0] };
  for (const t of w.slice(1)) { const i = t.indexOf('='); if (i < 0) o.pattern = t; else { const v = t.slice(i + 1); o[t.slice(0, i)] = isNaN(+v) ? v : +v; } }
  return o;
}
const _mats = new Map();
/** a material ready to shade: { ramp: [deep, sh, base, lt, hi] as [r, g, b], pat, q (its numbers), glow } */
function mat(id) {
  const key = typeof id === 'string' ? id : JSON.stringify(id);
  let m = _mats.get(key); if (m) return m;
  let q = typeof id === 'string' ? (id[0] === '#' ? parseMat(id) : MATERIALS[id]) : id;
  if (typeof q === 'string') q = parseMat(q);
  if (!q) { warn('mat:' + id, 'unknown material "' + id + '" (drawn magenta). Materials: ' + Object.keys(MATERIALS).join(', ')); q = { color: '#ff00ff' }; }
  const t = q.ramp ? null : E.tones(q.color || '#808080'), ramp = (q.ramp || [t.deep, t.sh, t.base, t.lt, t.hi]).map(E.hex);
  const pat = PATTERNS[q.pattern || 'none'] || (warn('pat:' + q.pattern, 'unknown pattern "' + q.pattern + '". Patterns: ' + Object.keys(PATTERNS).join(', ')), PATTERNS.none);
  m = { ramp, pat, q, glow: !!q.glow };
  _mats.set(key, m); return m;
}

/* ---------- patterns: a tone step (-1 dark .. +2 bright) at a point of a surface ----------
 * s: { u, v (world units on the surface), W, H (the face's extent), lid (looks up or down), curved (turned or round),
 *      lit (the light on it, -1..1), px (world units per pixel here), part } ; m: the material's numbers.
 * Names and numbers follow MaterialX's and Blender's texture nodes where they overlap (noise, Voronoi, brick, checker). */
const H2 = (x, y) => E.hash2(x, y), N2 = (x, y) => E.noise2(x, y);
const line = s => Math.max(.62, s.px * .98);   // a seam: never thinner than a pixel, so it never drops out
const V = { id: 0, e: 0, dx: 0, dy: 0 };
/** Voronoi (Worley) cells of size S: V.id (the cell's own value 0..1), V.e (distance to its edge), V.dx, V.dy (from its heart) */
function vor(x, y, S, jit = .85) {
  const gx = Math.floor(x / S), gy = Math.floor(y / S); let d1 = 1e9, d2 = 1e9, ax = 0, ay = 0, bx = 0, by = 0, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cy = gy + j, qx = (cx + .5 + (H2(cx, cy) - .5) * jit) * S, qy = (cy + .5 + (H2(cy + 71, cx + 13) - .5) * jit) * S, ex = x - qx, ey = y - qy, d = ex * ex + ey * ey;
    if (d < d1) { d2 = d1; bx = ax; by = ay; d1 = d; ax = qx; ay = qy; id = H2(cx * 7 + 3, cy * 11 + 5); } else if (d < d2) { d2 = d; bx = qx; by = qy; }
  }
  V.id = id; V.e = (d2 - d1) / (2 * (Math.hypot(bx - ax, by - ay) || 1)); V.dx = x - ax; V.dy = y - ay; return V;
}
Object.assign(PATTERNS, {
  none: () => 0,
  /** boards bw wide (default 3) with dark seams and butt joints every len (14); on lids and flat sides they run along u,
   *  on turned surfaces along v (staves). dir=v turns them on flat faces */
  planks(s, m) {
    const bw = m.bw || 3, len = m.len || 14, along = s.curved || m.dir === 'v' ? s.v : s.u, across = s.curved || m.dir === 'v' ? s.u : s.v;
    const row = Math.floor(across / bw), f = across - row * bw, w = line(s);
    if (f < w) return -1;
    const off = H2(row, 7) * len, k = Math.floor((along + off) / len);
    if (!s.curved && along + off - k * len < w) return -1;
    const h = H2(row, k + 3); return h > .78 ? 1 : h < .22 ? -1 : 0;
  },
  /** a framed and braced crate side: a frame `frame` wide (2), a diagonal brace, boards bw (3) inside; lids are planks */
  crate(s, m) {
    if (s.lid || s.curved) return PATTERNS.planks(s, m);
    const f = m.frame || 2, w = line(s), W = s.W, H = s.H, u = s.u, v = s.v, e = Math.min(u, W - u, v, H - v);
    if (e < f) return e > f - w ? -1 : 1;
    const iw = W - 2 * f, ih = H - 2 * f, d = Math.abs((u - f) * ih - (v - f) * iw) / Math.hypot(iw, ih);
    if (d < f * .7) return d > f * .7 - w ? -1 : 1;
    const bw = m.bw || 3, r = Math.floor((v - f) / bw); return v - f - r * bw < w ? -1 : H2(r, 5) > .7 ? -1 : 0;
  },
  /** running-bond bricks bw x bh (6 x 3) with mortar lines */
  bricks(s, m) {
    const bh = m.bh || 3, bw = m.bw || 6, w = line(s), row = Math.floor(s.v / bh), u = s.u + (row & 1) * bw / 2, col = Math.floor(u / bw);
    if (s.v - row * bh < w || u - col * bw < w) return m.mortar === undefined ? -1 : m.mortar;
    const h = H2(col, row); return h > .86 ? 1 : h < .14 ? -1 : 0;
  },
  /** irregular stones (Voronoi cells about `size` across, 5) with dark joints and a lit rim */
  stones(s, m) {
    const S = m.size || 5, c = vor(s.u, s.v, S), w = line(s);
    if (c.e < w * .8) return -1;
    if (c.e < w * 1.8 && c.dy > 0) return 1;
    return c.id > .82 ? 1 : c.id < .22 ? -1 : 0;
  },
  /** square tiles `size` (4) with grout */
  tiles(s, m) {
    const S = m.size || 4, w = line(s), a = s.u / S, b = s.v / S;
    if ((a - Math.floor(a)) * S < w || (b - Math.floor(b)) * S < w) return -1;
    return H2(Math.floor(a), Math.floor(b)) > .8 ? 1 : 0;
  },
  /** specks, dark and light (amount .08) */
  speck(s, m) { const h = H2(Math.floor(s.u * 1.4), Math.floor(s.v * 1.4)), a = m.amount || .08; return h < a ? -1 : h > 1 - a * .5 ? 1 : 0; },
  /** soft patches (scale 4) */
  noise(s, m) { const n = N2(s.u / (m.scale || 4), s.v / (m.scale || 4)); return n > .66 ? 1 : n < .34 ? -1 : 0; },
  /** leaf clumps (size 3.5): each lit at its top, dark at its foot, with a few bright leaves */
  foliage(s, m) {
    const S = m.size || 3.5, c = vor(s.u, s.v * 1.15, S, 1), r = c.dy / S;
    if (c.e < line(s) * .7) return -1;
    if (H2(Math.floor(s.u * 2), Math.floor(s.v * 2)) > .94) return 1;
    return r > .18 ? 1 : r < -.22 ? -1 : 0;
  },
  /** bark: fissures running up the trunk; the cut end shows rings */
  bark(s, m) {
    if (s.lid) { const r = Math.hypot(s.u - s.W / 2, s.v - s.H / 2); return (r % 1.6) < line(s) ? -1 : 1; }
    const n = N2(s.u * 1.1, s.v * .16); return n > .64 ? -1 : n < .22 ? 1 : 0;
  },
  /** metal: hard light (a shine where it is lit, darker in shade), a rivet row every `rivet` units if given */
  metal(s, m) {
    if (m.rivet && s.v % m.rivet < .9 && s.u % m.rivet < .9) return 1;
    return s.lit > .8 ? 1 : s.lit < .05 ? -1 : 0;
  },
  /** cloth: a fine weave and soft folds */
  cloth(s, m) {
    const f = Math.sin(s.u * (m.fold || .9) + N2(s.u * .3, s.v * .2) * 3);
    if (f > .82) return -1; if (f < -.9) return 1;
    return (Math.floor(s.u * 1.2) + Math.floor(s.v * 1.2)) & 1 && H2(Math.floor(s.u), Math.floor(s.v)) > .7 ? -1 : 0;
  },
  /** glaze: a glossy shine where the light is strongest, a few specks */
  glaze(s) { if (s.lit > .86) return 2; if (s.lit > .74) return 1; return H2(Math.floor(s.u * 1.5), Math.floor(s.v * 1.5)) < .04 ? -1 : 0; },
  /** thatch: straw in overlapping courses (course 3) */
  thatch(s, m) { const c = m.course || 3, row = Math.floor(s.v / c), f = s.v - row * c; if (f < line(s)) return -1; const n = H2(Math.floor(s.u * 1.6 + row * 5), row); return n > .7 ? 1 : n < .25 ? -1 : 0; },
  /** shingles: staggered rows of tiles (course 2.5, width 4) */
  shingles(s, m) {
    const c = m.course || 2.5, bw = m.bw || 4, row = Math.floor(s.v / c), u = s.u + (row & 1) * bw / 2, col = Math.floor(u / bw), w = line(s);
    if (s.v - row * c < w || u - col * bw < w) return -1; return H2(col, row) > .8 ? 1 : 0;
  }
});

/* ---------- resolving a shape into primitives ---------- */
const PRIMS = { box: 4, cyl: 5, lathe: 4, ball: 4, prism: 5, wedge: 4, rock: 4, mesh: 4 };   // (mesh: raw triangles, for the converter's fit)   // where each primitive's options are
/** a shape (an id or a spec) and its placement's params and mats -> { prims, mats, parts } */
function resolve(spec, o = {}) {
  const out = { prims: [], mats: [], idx: new Map(), parts: 0 };
  const S = typeof spec === 'string' ? SHAPES[spec] : spec;
  if (!S) { warn('shape:' + spec, 'unknown shape "' + spec + '". Shapes: ' + Object.keys(SHAPES).join(', ')); return out; }
  addShape(S, o, I3, [0, 0, 0], name => o.mats && o.mats[name], out, 0);
  return out;
}
function matIndex(out, id) {
  let i = out.idx.get(id); if (i !== undefined) return i;
  i = out.mats.length; out.mats.push(mat(id)); out.idx.set(id, i); return i;
}
function addShape(S, params, M, t, outer, out, depth) {
  if (depth > 8) { warn('deep', 'shapes nested more than 8 deep (a shape that uses itself?)'); return; }
  const P = Object.assign({}, S.params, params);
  const parts = S.make ? S.make(P) : S.parts || [];
  // a slot: the placement's (or the using shape's) choice, then the shape's own mats, then the name itself as a material
  const slot = name => { const ov = outer(name); if (ov) return ov; return S.mats && S.mats[name] || name; };
  for (const p of parts) addPart(p, M, t, slot, out, depth);
}
function addPart(p, M, t, slot, out, depth) {
  const k = p[0];
  if (k === 'mirror') {
    const ax = p[1], q = p[2]; addPart(q, M, t, slot, out, depth);
    if (ax.includes('x')) addPart(q, mm(M, dg(-1, 1, 1)), t, slot, out, depth);
    if (ax.includes('y')) addPart(q, mm(M, dg(1, -1, 1)), t, slot, out, depth);
    if (ax.includes('x') && ax.includes('y')) addPart(q, mm(M, dg(-1, -1, 1)), t, slot, out, depth);
    return;
  }
  if (k === 'ring') { const n = p[1]; for (let i = 0; i < n; i++) { const Mi = mm(M, rz(i * TAU / n)); addPart(p[3], Mi, add(t, mv(Mi, [p[2], 0, 0])), slot, out, depth); } return; }
  if (k === 'row') { const n = p[1], d = p[2]; for (let i = 0; i < n; i++) { const f = i - (n - 1) / 2; addPart(p[3], M, add(t, mv(M, [d[0] * f, d[1] * f, d[2] * f])), slot, out, depth); } return; }
  if (k === 'group') { const M2 = mm(M, rot(p[2])), t2 = add(t, mv(M, p[1])); for (const q of p[3]) addPart(q, M2, t2, slot, out, depth); return; }
  if (k === 'use') {
    const S2 = typeof p[1] === 'string' ? SHAPES[p[1]] : p[1], uo = p[3] || {};
    if (!S2) { warn('shape:' + p[1], 'use: unknown shape "' + p[1] + '"'); return; }
    const M2 = mm(mm(M, rot(uo.rot)), dg(...[0, 1, 2].map(() => uo.scale || 1))), t2 = add(t, mv(M, p[2]));
    const params = Object.assign({}, uo); delete params.rot; delete params.scale; delete params.mats;
    // the used shape's slots: this part's mats (a material, or one of the outer shape's slots), else its own
    addShape(S2, params, M2, t2, name => { const v = uo.mats && uo.mats[name]; return v ? slot(v) : null; }, out, depth + 1);
    return;
  }
  if (!PRIMS[k]) { warn('part:' + k, 'unknown part "' + k + '". Parts: ' + Object.keys(PRIMS).join(', ') + ', use, mirror, ring, row, group'); return; }
  const o = p[PRIMS[k]] || {};
  out.prims.push({ k, p, o, mi: matIndex(out, slot(p[1])), part: out.parts++, M: mm(M, rot(o.rot)), t: add(t, mv(M, p[2] || [0, 0, 0])) });
}

/* ---------- tessellation: faces with surface coordinates, in a primitive's own frame ----------
 * emit(face) with face = { v: [[x, y, z]...], n: [[nx, ny, nz]...] | one normal (flat), uv: [[u, v]...] | null (planar),
 *   lid, curved, W, H }. seg: the segment count for round parts, chosen from the projected size */
function planarUV(v, n) {
  let us, vs;
  if (Math.abs(n[2]) > .7) { us = v.map(p => p[0]); vs = v.map(p => p[1]); }
  else { const l = Math.hypot(n[0], n[1]) || 1, tx = -n[1] / l, ty = n[0] / l; us = v.map(p => p[0] * tx + p[1] * ty); vs = v.map(p => p[2]); }
  const u0 = Math.min(...us), v0 = Math.min(...vs);
  return { uv: us.map((u, i) => [u - u0, vs[i] - v0]), W: Math.max(...us) - u0, H: Math.max(...vs) - v0, lid: Math.abs(n[2]) > .7 };
}
/** a flat face; frame: the vertices whose planar coordinates it shares (a cap split into triangles keeps one frame) */
function flat(emit, v, n, frame) {
  const P = planarUV(frame ? frame.concat(v) : v, n), k = frame ? frame.length : 0;
  emit({ v, n, uv: P.uv.slice(k), W: P.W, H: P.H, lid: P.lid, curved: false });
}
const TESS = {
  box(emit, P) {
    const [w, d, h] = P.p[3], x = w / 2, y = d / 2;
    const c = (i, j, k) => [i ? x : -x, j ? y : -y, k ? h : 0];
    emit({ v: [c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1)], n: [0, 0, 1], uv: [[0, 0], [w, 0], [w, d], [0, d]], W: w, H: d, lid: true });
    emit({ v: [c(0, 0, 0), c(0, 1, 0), c(1, 1, 0), c(1, 0, 0)], n: [0, 0, -1], uv: [[0, 0], [0, d], [w, d], [w, 0]], W: w, H: d, lid: true });
    emit({ v: [c(0, 1, 0), c(1, 1, 0), c(1, 1, 1), c(0, 1, 1)], n: [0, 1, 0], uv: [[0, 0], [w, 0], [w, h], [0, h]], W: w, H: h });
    emit({ v: [c(1, 0, 0), c(0, 0, 0), c(0, 0, 1), c(1, 0, 1)], n: [0, -1, 0], uv: [[0, 0], [w, 0], [w, h], [0, h]], W: w, H: h });
    emit({ v: [c(1, 1, 0), c(1, 0, 0), c(1, 0, 1), c(1, 1, 1)], n: [1, 0, 0], uv: [[0, 0], [d, 0], [d, h], [0, h]], W: d, H: h });
    emit({ v: [c(0, 0, 0), c(0, 1, 0), c(0, 1, 1), c(0, 0, 1)], n: [-1, 0, 0], uv: [[0, 0], [d, 0], [d, h], [0, h]], W: d, H: h });
  },
  wedge(emit, P) {   // full height at the back (-y), down to the floor at the front (+y): a ramp facing the front
    const [w, d, h] = P.p[3], x = w / 2, y = d / 2;
    flat(emit, [[-x, y, 0], [-x, -y, 0], [x, -y, 0], [x, y, 0]], [0, 0, -1]);
    flat(emit, [[x, -y, 0], [-x, -y, 0], [-x, -y, h], [x, -y, h]], [0, -1, 0]);
    flat(emit, [[-x, y, 0], [x, y, 0], [x, -y, h], [-x, -y, h]], nrm([0, h, d]));
    flat(emit, [[x, y, 0], [x, -y, 0], [x, -y, h]], [1, 0, 0]);
    flat(emit, [[-x, -y, 0], [-x, y, 0], [-x, -y, h]], [-1, 0, 0]);
  },
  cyl(emit, P, seg) {
    const r = P.p[3], h = P.p[4], r2 = P.o.r2 === undefined ? r : P.o.r2, sq = P.o.sq || 1, n = P.o.seg || seg(Math.max(r, r2));
    lathe(emit, r2 > 0 ? [[0, 0], [r, 0], [r2, h], [0, h]] : [[0, 0], [r, 0], [0, h]], n, sq);
  },
  lathe(emit, P, seg) { const pr = P.p[3]; lathe(emit, pr, P.o.seg || seg(Math.max(...pr.map(q => q[0]))), P.o.sq || 1); },
  ball(emit, P, seg) {
    // (a ball needs fewer segments than a turned profile: its shading hides the facets, and leaf clumps come by the dozen)
    const r = P.p[3], sz = P.o.sz || 1, n = P.o.seg || Math.max(8, Math.min(20, Math.round(seg(r) * .6 / 2) * 2)), m = Math.max(3, n >> 1), pts = [];
    for (let j = 0; j <= m; j++) { const a = -Math.PI / 2 + j / m * Math.PI; pts.push([Math.cos(a) * r, Math.sin(a) * r * sz]); }
    pts[0][0] = 0; pts[m][0] = 0;
    lathe(emit, pts, n, 1, true, sz);
  },
  rock(emit, P) {   // an icosahedron split once, its corners pushed in and out by the seed, faceted
    const r = P.p[3], sz = P.o.sz || .75, rough = P.o.rough === undefined ? .28 : P.o.rough, rnd = E.rng(((P.o.seed || 0) + 1) * 7919 + P.part * 131);
    const { v, f } = ico(), k = v.map(() => 1 - rough / 2 + rnd() * rough);
    const at = i => [v[i][0] * r * k[i], v[i][1] * r * k[i], v[i][2] * r * k[i] * sz];
    for (const [a, b, c] of f) { const A = at(a), B = at(b), C = at(c), n = nrm(cross(sub(B, A), sub(C, A))); flat(emit, [A, B, C], n); }
  },
  prism(emit, P) {   // an outline pushed along an axis: z (up from at), y or x (centred on at)
    const ol = P.p[3], h = P.p[4], ax = P.o.axis || 'z';
    const to = ax === 'z' ? (a, b, c) => [a, b, c] : ax === 'y' ? (a, b, c) => [a, c - h / 2, b] : (a, b, c) => [c - h / 2, a, b];
    const z0 = 0, z1 = h;
    let area = 0; for (let i = 0; i < ol.length; i++) { const a = ol[i], b = ol[(i + 1) % ol.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const pts = area < 0 ? ol.slice().reverse() : ol;   // counter-clockwise in the outline's own plane
    const capT = pts.map(q => to(q[0], q[1], z1)), capB = pts.map(q => to(q[0], q[1], z0)), nT = mv(axisM(ax), [0, 0, 1]), nB = mv(axisM(ax), [0, 0, -1]);
    for (const tr of ear(pts)) { flat(emit, tr.map(i => capT[i]), nT, capT); flat(emit, tr.map(i => capB[i]).reverse(), nB, capB); }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey) || 1;
      const n = nrm(mv(axisM(ax), [ey / l, -ex / l, 0]));
      flat(emit, [to(a[0], a[1], z0), to(b[0], b[1], z0), to(b[0], b[1], z1), to(a[0], a[1], z1)], n);
    }
  }
};
TESS.mesh = (emit, P) => { for (const t of P.p[3]) { const n = nrm(cross(sub(t[1], t[0]), sub(t[2], t[0]))); flat(emit, t, n); } };
const axisM = ax => ax === 'z' ? I3 : ax === 'y' ? [1, 0, 0, 0, 0, 1, 0, 1, 0] : [0, 0, 1, 1, 0, 0, 0, 1, 0];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** a profile [[r, z]...] turned about z in n segments: horizontal steps become flat lids, the rest smooth bands */
function lathe(emit, pr, n, sq = 1, ball = false, sz = 1) {
  let R = 0; for (const q of pr) R = Math.max(R, q[0]);
  const cs = [], sn = []; for (let i = 0; i <= n; i++) { cs.push(Math.cos(i / n * TAU)); sn.push(Math.sin(i / n * TAU)); }
  // each segment's normal in the profile plane, then a vertex's: shared with its neighbour where they meet at under 40 degrees
  const segN = [], len = [0];
  for (let j = 0; j + 1 < pr.length; j++) { const dr = pr[j + 1][0] - pr[j][0], dz = pr[j + 1][1] - pr[j][1], l = Math.hypot(dr, dz) || 1; segN.push([dz / l, -dr / l]); len.push(len[j] + l); }
  const vn = (j, end) => {   // the normal at the end (0 start, 1 end) of segment j
    const a = segN[j], k = end ? j + 1 : j - 1, b = segN[k];
    if (ball) { const q = pr[j + end]; return nrm([q[0], q[1] / (sz * sz)]); }
    if (!b || a[0] * b[0] + a[1] * b[1] < .77) return a;
    return nrm([a[0] + b[0], a[1] + b[1]]);
  };
  for (let j = 0; j + 1 < pr.length; j++) {
    const [r0, z0] = pr[j], [r1, z1] = pr[j + 1]; if (r0 < 1e-6 && r1 < 1e-6) continue;
    const lid = Math.abs(z1 - z0) < 1e-6 && !ball;
    if (lid) {   // a flat ring or disc: planar coordinates, so a lid's planks run straight across it
      const up = r1 < r0 ? 1 : -1, rA = Math.max(r0, r1), rB = Math.min(r0, r1);
      for (let i = 0; i < n; i++) {
        const a = [cs[i] * rA, sn[i] * rA * sq, z0], b = [cs[i + 1] * rA, sn[i + 1] * rA * sq, z0];
        const v = rB > 1e-6 ? [a, b, [cs[i + 1] * rB, sn[i + 1] * rB * sq, z0], [cs[i] * rB, sn[i] * rB * sq, z0]] : [a, b, [0, 0, z0]];
        const vv = up > 0 ? v : v.slice().reverse();
        emit({ v: vv, n: [0, 0, up], uv: vv.map(p => [p[0] + R, p[1] + R]), W: 2 * R, H: 2 * R, lid: true, curved: false });
      }
      continue;
    }
    const nA = vn(j, 0), nB = vn(j, 1);
    for (let i = 0; i < n; i++) {
      const P = (r, z, k) => [cs[k] * r, sn[k] * r * sq, z], N = (q, k) => [cs[k] * q[0], sn[k] * q[0] / sq, q[1]];
      emit({ v: [P(r0, z0, i), P(r0, z0, i + 1), P(r1, z1, i + 1), P(r1, z1, i)], n: [N(nA, i), N(nA, i + 1), N(nB, i + 1), N(nB, i)],
        uv: [[i / n * TAU * R, len[j]], [(i + 1) / n * TAU * R, len[j]], [(i + 1) / n * TAU * R, len[j + 1]], [i / n * TAU * R, len[j + 1]]],
        W: TAU * R, H: len[len.length - 1], lid: false, curved: true });
    }
  }
}
let _ico = null;
function ico() {
  if (_ico) return _ico;
  const t = (1 + Math.sqrt(5)) / 2, v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(nrm);
  let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const mid = new Map(), m = (a, b) => { const k = a < b ? a + ',' + b : b + ',' + a; if (!mid.has(k)) { mid.set(k, v.length); v.push(nrm(add(v[a], v[b]))); } return mid.get(k); };
  f = f.flatMap(([a, b, c]) => { const ab = m(a, b), bc = m(b, c), ca = m(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
  return (_ico = { v, f });
}
/** ear clipping for a counter-clockwise outline: [[i, j, k]...] */
function ear(pts) {
  const idx = pts.map((_, i) => i), out = [], cr = (a, b, c) => (pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0]);
  const inside = (p, a, b, c) => cr(a, b, p) >= 0 && cr(b, c, p) >= 0 && cr(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 500) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
      if (cr(a, b, c) <= 1e-9) continue;
      if (idx.some(p => p !== a && p !== b && p !== c && inside(p, a, b, c))) continue;
      out.push([a, b, c]); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length >= 3) for (let i = 1; i + 1 < idx.length; i++) out.push([idx[0], idx[i], idx[i + 1]]);
  return out;
}

/* ---------- the light: fixed to the view (from the viewer's upper left) or to the world ---------- */
function lightDir(view, mode) {
  if (mode === 'world') return nrm([-.55, -.35, .76]);
  const w = view.yaw, p = view.pitch, cw = Math.cos(w), sw = Math.sin(w), cp = Math.cos(p), sp = Math.sin(p);
  const R = [cw, -sw, 0], U = [-sp * sw, -sp * cw, cp], D = [sw * cp, cw * cp, sp];
  return nrm([-.45 * R[0] + .45 * U[0] + .77 * D[0], -.45 * R[1] + .45 * U[1] + .77 * D[1], -.45 * R[2] + .45 * U[2] + .77 * D[2]]);
}

/* ---------- the raster ---------- */
const BANDS = [-.38, .3, .7];
let TB = new Float64Array(28 * 512);   // the triangles of the shape being drawn (grown as needed, reused)   // lit above each: sh, base, lt (deep below the first)
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/**
 * Draw a shape at game size: { w, h, ox, oy (where its origin, the middle of its footprint on the ground, is),
 * rgba (Uint8ClampedArray w * h * 4), tris, prims, ms }. o: { facing (radians, the way its front points; default PI/2,
 * south), scale, flip (mirror x before facing), mats (slot -> material), params (a generator's), light ('view' |
 * 'world'), edges (lit top edges, default true), creases (default true), dither, bands }
 */
function raster(shape, view, o = {}) {
  const t0 = now(), R = resolve(shape, Object.assign({}, o.params, { mats: o.mats }));
  const facing = o.facing === undefined ? Math.PI / 2 : o.facing, k = o.scale || 1, a = facing - Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
  const F = mm([c, -s, 0, s, c, 0, 0, 0, 1], dg(o.flip ? -k : k, k, k));   // shape -> world: scale, mirror, then face
  const D = [view.dx, view.dy, view.dz], L = lightDir(view, o.light), vs = Math.hypot(view.ax, view.ay) || 1, px = 1 / (vs * k);
  // tessellate every primitive, projecting as we go: per vertex sx, sy, depth, z (shape space, for the ground) + normal + uv
  const faces = []; let T = TB, tn = 0;
  const P9 = new Float64Array(9 * 64);   // the current face's projected vertices
  for (const P of R.prims) {
    const Mw = mm(F, P.M), N = invT(Mw), tw = mv(F, P.t), sMax = Math.max(Math.sqrt(Mw[0] * Mw[0] + Mw[3] * Mw[3] + Mw[6] * Mw[6]), Math.sqrt(Mw[1] * Mw[1] + Mw[4] * Mw[4] + Mw[7] * Mw[7]));
    const seg = r => { const n = Math.round(TAU * r * sMax * vs / 3 / 2) * 2; return Math.max(6, Math.min(48, n)); };
    TESS[P.k](f => {
      const fi = faces.length, smooth = Array.isArray(f.n[0]), nv = f.v.length;
      faces.push({ mi: P.mi, part: P.part, W: f.W, H: f.H, lid: !!f.lid, curved: !!f.curved });
      let fx = 0, fy = 0, fz = 0;
      if (!smooth) { const q = f.n; fx = N[0] * q[0] + N[1] * q[1] + N[2] * q[2]; fy = N[3] * q[0] + N[4] * q[1] + N[5] * q[2]; fz = N[6] * q[0] + N[7] * q[1] + N[8] * q[2]; const l = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1; fx /= l; fy /= l; fz /= l; }
      for (let i = 0; i < nv && i < 64; i++) {
        const p = f.v[i], wx = Mw[0] * p[0] + Mw[1] * p[1] + Mw[2] * p[2] + tw[0], wy = Mw[3] * p[0] + Mw[4] * p[1] + Mw[5] * p[2] + tw[1], wz = Mw[6] * p[0] + Mw[7] * p[1] + Mw[8] * p[2] + tw[2], o9 = i * 9;
        P9[o9] = view.ax * wx + view.ay * wy; P9[o9 + 1] = view.bx * wx + view.by * wy + view.bz * wz; P9[o9 + 2] = D[0] * wx + D[1] * wy + D[2] * wz; P9[o9 + 3] = wz;
        if (smooth) { const q = f.n[i]; let a = N[0] * q[0] + N[1] * q[1] + N[2] * q[2], b = N[3] * q[0] + N[4] * q[1] + N[5] * q[2], c = N[6] * q[0] + N[7] * q[1] + N[8] * q[2]; const l = Math.sqrt(a * a + b * b + c * c) || 1; P9[o9 + 4] = a / l; P9[o9 + 5] = b / l; P9[o9 + 6] = c / l; }
        else { P9[o9 + 4] = fx; P9[o9 + 5] = fy; P9[o9 + 6] = fz; }
        P9[o9 + 7] = f.uv[i][0]; P9[o9 + 8] = f.uv[i][1];
      }
      for (let i = 1; i + 1 < nv; i++) {   // a fan of triangles: [face (negative: seen from behind), A, B, C]
        if (tn + 28 > T.length) { const T2 = new Float64Array(T.length * 2); T2.set(T); T = TB = T2; }
        const back = (P9[4] + P9[i * 9 + 4] + P9[i * 9 + 13]) * D[0] + (P9[5] + P9[i * 9 + 5] + P9[i * 9 + 14]) * D[1] + (P9[6] + P9[i * 9 + 6] + P9[i * 9 + 15]) * D[2] < 0;
        T[tn] = back ? -1 - fi : fi;
        for (let k = 0; k < 9; k++) { T[tn + 1 + k] = P9[k]; T[tn + 10 + k] = P9[i * 9 + k]; T[tn + 19 + k] = P9[i * 9 + 9 + k]; }
        tn += 28;
      }
    }, P, seg);
  }
  // the canvas: the projected bounds, a margin of 2 for the outline
  let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
  for (let i = 0; i < tn; i += 28) for (let j = 1; j < 28; j += 9) { if (T[i + j + 3] < -.01) continue; const qx = T[i + j], qy = T[i + j + 1]; if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy; }
  const ox = 2 - Math.floor(x0), oy = 2 - Math.floor(y0), W = Math.ceil(x1) + ox + 3, H = Math.ceil(y1) + oy + 3, n = W * H;
  const zb = new Float32Array(n).fill(-Infinity), fid = new Int32Array(n).fill(-1), bk = new Uint8Array(n), Nx = new Float32Array(n), Ny = new Float32Array(n), Nz = new Float32Array(n), U = new Float32Array(n), Vv = new Float32Array(n);
  let tris = 0;
  for (let i = 0; i < tn; i += 28) {
    const fb = T[i], fi = fb < 0 ? -1 - fb : fb, A = i + 1, B = i + 10, C = i + 19;
    const ax = T[A] + ox, ay = T[A + 1] + oy, bx = T[B] + ox, by = T[B + 1] + oy, cx = T[C] + ox, cy = T[C + 1] + oy;
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); if (area * area < 1e-12) continue;
    tris++;
    // the weights of A and B as planes over the screen: l = a * x + b * y + c (C's is 1 - both)
    const ia = 1 / area, a0 = -(cy - by) * ia, b0 = (cx - bx) * ia, c0 = ((cy - by) * bx - (cx - bx) * by) * ia, a1 = -(ay - cy) * ia, b1 = (ax - cx) * ia, c1 = ((ay - cy) * cx - (ax - cx) * cy) * ia;
    const za = T[A + 2], zb2 = T[B + 2], zc = T[C + 2], ga = T[A + 3], gb = T[B + 3], gc = T[C + 3];
    const mx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), Mx = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx))), my = Math.max(0, Math.floor(Math.min(ay, by, cy))), My = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = my; y <= My; y++) {
      const qy = y + .5; let l0 = a0 * (mx + .5) + b0 * qy + c0, l1 = a1 * (mx + .5) + b1 * qy + c1;
      for (let x = mx; x <= Mx; x++, l0 += a0, l1 += a1) {
        const l2 = 1 - l0 - l1;
        if (l0 < -1e-7 || l1 < -1e-7 || l2 < -1e-7) continue;
        const z = l0 * za + l1 * zb2 + l2 * zc, j = y * W + x;
        if (z <= zb[j] + 1e-5) continue;
        if (l0 * ga + l1 * gb + l2 * gc < -.01) continue;   // below the ground: not drawn (a half-buried rock)
        zb[j] = z; fid[j] = fi; bk[j] = fb < 0 ? 1 : 0;
        Nx[j] = l0 * T[A + 4] + l1 * T[B + 4] + l2 * T[C + 4]; Ny[j] = l0 * T[A + 5] + l1 * T[B + 5] + l2 * T[C + 5]; Nz[j] = l0 * T[A + 6] + l1 * T[B + 6] + l2 * T[C + 6];
        U[j] = l0 * T[A + 7] + l1 * T[B + 7] + l2 * T[C + 7]; Vv[j] = l0 * T[A + 8] + l1 * T[B + 8] + l2 * T[C + 8];
      }
    }
  }
  // shade: the light's band, the pattern's step, darker inside (a face seen from behind)
  const tone = new Int8Array(n).fill(-1), bands = o.bands || BANDS, Sx = { u: 0, v: 0, W: 0, H: 0, lid: false, curved: false, lit: 0, px, part: 0 };
  for (let j = 0; j < n; j++) {
    const fi = fid[j]; if (fi < 0) continue;
    const f = faces[fi], m = R.mats[f.mi];
    let nx = Nx[j], ny = Ny[j], nz = Nz[j]; const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
    let inner = 0; if (bk[j]) { nx = -nx; ny = -ny; nz = -nz; inner = 1; }   // the inside of an open part (a hoop, a bowl)
    let lit = nx * L[0] + ny * L[1] + nz * L[2]; Nz[j] = nz;
    if (o.dither) lit += (E.bayer(j % W, (j / W) | 0) - .5) * .16;
    Sx.u = U[j]; Sx.v = Vv[j]; Sx.W = f.W; Sx.H = f.H; Sx.lid = f.lid; Sx.curved = f.curved; Sx.lit = lit; Sx.part = f.part;
    const band = m.glow ? 3 : lit > bands[2] ? 3 : lit > bands[1] ? 2 : lit > bands[0] ? 1 : 0;
    tone[j] = Math.max(0, Math.min(4, band + m.pat(Sx, m.q) - inner));
  }
  // creases: a pixel just behind a nearer part darkens; lit edges: the top silhouette of a face looking up brightens
  const out = new Int8Array(tone);
  if (o.creases !== false) {
    const part = new Int32Array(n).fill(-1); for (let j = 0; j < n; j++) if (fid[j] >= 0) part[j] = faces[fid[j]].part;
    const near = (j, q) => part[q] >= 0 && part[q] !== part[j] && zb[q] > zb[j] + 1.2;
    for (let y = 1; y < H - 1; y++) for (let x = 1, j = y * W + 1; x < W - 1; x++, j++) {
      if (part[j] < 0) continue;
      if (near(j, j - 1) || near(j, j + 1) || near(j, j - W) || near(j, j + W)) out[j] = Math.max(0, tone[j] - 1);
    }
  }
  if (o.edges !== false) for (let j = W; j < n; j++) {
    if (tone[j] < 0 || Nz[j] < .5) continue;
    const q = j - W; if (tone[q] < 0 || zb[q] < zb[j] - 2.5) out[j] = Math.min(4, out[j] + 1);
  }
  const rgba = new Uint8ClampedArray(n * 4);
  for (let j = 0; j < n; j++) {
    if (out[j] < 0) continue;
    const col = R.mats[faces[fid[j]].mi].ramp[out[j]];
    rgba[j * 4] = col[0]; rgba[j * 4 + 1] = col[1]; rgba[j * 4 + 2] = col[2]; rgba[j * 4 + 3] = 255;
  }
  return { w: W, h: H, ox, oy, rgba, tris, prims: R.prims.length, parts: R.parts, ms: now() - t0, depth: zb, part: Int32Array.from(fid, f => f < 0 ? -1 : faces[f].part) };
}

/* ---------- the contact shadow: the footprint (soft) and where parts meet the floor (darker), in shape space ---------- */
function shadow(shape, o = {}) {
  const R = resolve(shape, Object.assign({}, o.params, { mats: o.mats })), hull = [], contact = [];
  for (const P of R.prims) {
    const pts = [];
    TESS[P.k](f => { for (const p of f.v) pts.push(add(mv(P.M, p), P.t)); }, P, () => 12);
    for (const p of pts) hull.push([p[0], p[1]]);
    const low = pts.filter(p => p[2] < .8);
    if (low.length >= 3) contact.push(convex(low.map(p => [p[0], p[1]])));
  }
  return { hull: convex(hull), contact: contact.filter(c => c.length >= 3) };
}
/** the convex hull of 2D points (monotone chain) */
function convex(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
/** the bounds of a shape in shape space: [x0, y0, z0, x1, y1, z1] */
function bounds(shape, o = {}) {
  const R = resolve(shape, Object.assign({}, o.params, { mats: o.mats })), b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const P of R.prims) TESS[P.k](f => { for (const p of f.v) { const w = add(mv(P.M, p), P.t); for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], w[i]); b[i + 3] = Math.max(b[i + 3], w[i]); } } }, P, () => 12);
  return b;
}

/* ---------- for the browser: a raster as a canvas, and the renderer's 1-px outline round it ---------- */
function toCanvas(r, outline = true) {
  const cv = document.createElement('canvas'); cv.width = r.w; cv.height = r.h;
  const img = new ImageData(new Uint8ClampedArray(r.rgba), r.w, r.h);
  if (outline) {
    const a = img.data, W = r.w, H = r.h, OL = [20, 12, 28];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (a[i * 4 + 3]) continue;
      if ((x > 0 && r.rgba[(i - 1) * 4 + 3]) || (x < W - 1 && r.rgba[(i + 1) * 4 + 3]) || (y > 0 && r.rgba[(i - W) * 4 + 3]) || (y < H - 1 && r.rgba[(i + W) * 4 + 3])) { a[i * 4] = OL[0]; a[i * 4 + 1] = OL[1]; a[i * 4 + 2] = OL[2]; a[i * 4 + 3] = 255; }
    }
  }
  cv.getContext('2d').putImageData(img, 0, 0); return cv;
}

Object.assign(AP, { raster, resolve, mat, parseMat, shadow, bounds, convex, toCanvas, lightDir, BANDS, TESS, vor });
})();
