// SPIKE (throwaway; see HANDOFF.md). MEASURES the decided hybrid encoding (it writes no shapes): each connected part
// (shared vertices + material), voxelized at U, becomes the simplest of box / prism / lathe whose cells match it with
// IoU >= THR, else greedy boxes. Prints parts by encoding and lines per model.
// Usage: U=1 THR=.85 node handoff/shapes-spike/hybrid.mjs <folder of .glb> [...]
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readGlb } from './glb.mjs';
const U = +process.env.U || 1, THR = +process.env.THR || .85, dirs = process.argv.slice(2);
function voxelPart(T) {   // T: triangles in game units -> { o, n, cells: Uint8Array }
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const t of T) for (const v of t) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k] / U); hi[k] = Math.max(hi[k], v[k] / U); }
  const o = lo.map(x => Math.floor(x) - 1), n = hi.map((x, k) => Math.ceil(x) - o[k] + 2), N = n[0] * n[1] * n[2], s = new Uint8Array(N), I = (x, y, z) => (z * n[1] + y) * n[0] + x;
  for (const [a, b, c] of T) { const A = a.map(x => x / U), B = b.map(x => x / U), C = c.map(x => x / U), e = Math.max(...[0, 1, 2].map(k => Math.max(Math.abs(B[k] - A[k]), Math.abs(C[k] - A[k]), Math.abs(C[k] - B[k])))), st = Math.max(2, Math.ceil(e * 3));
    for (let i = 0; i <= st; i++) for (let j = 0; j <= st - i; j++) { const u = i / st, w = j / st; s[I(...[0, 1, 2].map(k => Math.floor(A[k] + (B[k] - A[k]) * u + (C[k] - A[k]) * w - o[k])))] = 1; } }
  const out = new Uint8Array(N), q = [0]; out[0] = 1;
  while (q.length) { const i = q.pop(), x = i % n[0], y = ((i / n[0]) | 0) % n[1], z = (i / (n[0] * n[1])) | 0;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const X = x + dx, Y = y + dy, Z = z + dz; if (X < 0 || Y < 0 || Z < 0 || X >= n[0] || Y >= n[1] || Z >= n[2]) continue; const j = I(X, Y, Z); if (!out[j] && !s[j]) { out[j] = 1; q.push(j); } } }
  const cells = new Uint8Array(N); for (let i = 0; i < N; i++) cells[i] = out[i] ? 0 : 1;
  return { n, cells, I };
}
function bestFit({ n, cells, I }) {
  const pts = []; for (let z = 0; z < n[2]; z++) for (let y = 0; y < n[1]; y++) for (let x = 0; x < n[0]; x++) if (cells[I(x, y, z)]) pts.push([x, y, z]);
  if (!pts.length) return { kind: 'empty', cost: 0 };
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const p of pts) for (let k = 0; k < 3; k++) { if (p[k] < lo[k]) lo[k] = p[k]; if (p[k] > hi[k]) hi[k] = p[k]; }
  const vol = (hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1), P = pts.length;
  const cands = [{ kind: 'box', iou: P / vol, cost: 1 }];
  for (let a = 0; a < 3; a++) {   // prism along a: the silhouette along a, extruded over the extent
    const b = (a + 1) % 3, c = (a + 2) % 3, sil = new Set(pts.map(p => p[b] + ',' + p[c])), len = hi[a] - lo[a] + 1;
    const outline = Math.min(24, Math.ceil(Math.sqrt(sil.size) * 2));   // points after simplification, roughly
    cands.push({ kind: 'prism', iou: P / (sil.size * len), cost: 1 + outline / 6 });
    // lathe around axis a through the bbox centre: per slice along a, the max radius
    const cb = (lo[b] + hi[b]) / 2, cc = (lo[c] + hi[c]) / 2, rmax = new Map();
    for (const p of pts) { const r = Math.hypot(p[b] - cb, p[c] - cc); rmax.set(p[a], Math.max(rmax.get(p[a]) || 0, r)); }
    let inter = 0, lath = 0;
    for (const [sa, r] of rmax) for (let u = lo[b]; u <= hi[b]; u++) for (let v = lo[c]; v <= hi[c]; v++) if (Math.hypot(u - cb, v - cc) <= r + .5) { lath++; const q = [0, 0, 0]; q[a] = sa; q[b] = u; q[c] = v; if (cells[I(...q)]) inter++; }
    cands.push({ kind: 'lathe', iou: inter / (lath + P - inter), cost: 1 + Math.min(12, rmax.size) / 6 });
  }
  const ok = cands.filter(c => c.iou >= THR).sort((x, y) => x.cost - y.cost);
  if (ok.length) return ok[0];
  // fallback: greedy boxes over the part's cells
  const used = new Uint8Array(cells.length); let nb = 0;
  for (const [x, y, z] of pts) { if (used[I(x, y, z)]) continue; const okc = (X, Y, Z) => X < n[0] && Y < n[1] && Z < n[2] && cells[I(X, Y, Z)] && !used[I(X, Y, Z)];
    let x1 = x; while (okc(x1 + 1, y, z)) x1++; let y1 = y; const rowOk = Y => { for (let X = x; X <= x1; X++) if (!okc(X, Y, z)) return false; return true; }; while (rowOk(y1 + 1)) y1++;
    let z1 = z; const slabOk = Z => { for (let Y = y; Y <= y1; Y++) for (let X = x; X <= x1; X++) if (!okc(X, Y, Z)) return false; return true; }; while (slabOk(z1 + 1)) z1++;
    for (let Z = z; Z <= z1; Z++) for (let Y = y; Y <= y1; Y++) for (let X = x; X <= x1; X++) used[I(X, Y, Z)] = 1; nb++; }
  return { kind: 'boxes', cost: nb };
}
const kinds = {}, perModel = [];
for (const dir of dirs) for (const f of readdirSync(dir).filter(f => f.endsWith('.glb'))) {
  const { tris } = readGlb(join(dir, f)), g = v => [v[0] * 16, -v[2] * 16, v[1] * 16];
  // parts: connected by shared vertices (eighth-unit grid), split by material too
  const key = v => v.map(c => Math.round(c * 8)).join(), id = new Map(), P = [], find = i => P[i] === i ? i : (P[i] = find(P[i]));
  const TT = tris.map(t => ({ m: t.m, v: t.v.map(g) })), vi = TT.map(t => t.v.map(v => { const k = t.m + '|' + key(v); if (!id.has(k)) { id.set(k, P.length); P.push(P.length); } return id.get(k); }));
  for (const t of vi) { P[find(t[1])] = find(t[0]); P[find(t[2])] = find(t[0]); }
  const parts = new Map(); TT.forEach((t, i) => { const r = find(vi[i][0]); (parts.get(r) || parts.set(r, []).get(r)).push(t.v); });
  let prims = 0;
  for (const T of parts.values()) { const r = bestFit(voxelPart(T)); kinds[r.kind] = (kinds[r.kind] || 0) + 1; prims += r.kind === 'boxes' ? r.cost : 1; }
  perModel.push([f, prims, parts.size]);
}
perModel.sort((a, b) => a[1] - b[1]); const m = perModel[perModel.length >> 1], p9 = perModel[Math.floor(perModel.length * .9)];
console.log(`U=${U} THR=${THR}: ${perModel.length} models; parts by encoding:`, JSON.stringify(kinds));
console.log(`primitives (lines) per model: median ${m[1]}, p90 ${p9[1]}, max ${perModel.at(-1)[1]} (${perModel.at(-1)[0]})`);
