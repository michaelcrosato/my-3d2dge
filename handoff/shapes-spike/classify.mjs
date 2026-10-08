// SPIKE (throwaway; see HANDOFF.md). Exact detection of box / prism / lathe parts (no tolerance for bevels): it found
// only 30% of parts, which is why the hybrid encoder matches at game resolution instead.
// Usage: node handoff/shapes-spike/classify.mjs <folder of .glb> [...]
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readGlb } from './glb.mjs';
const dirs = process.argv.slice(2), total = { box: 0, prism: 0, lathe: 0, other: 0 }, tri = { box: 0, prism: 0, lathe: 0, other: 0 }; let models = 0, fullyExact = 0;
const per = {};
for (const dir of dirs) for (const f of readdirSync(dir).filter(f => f.endsWith('.glb'))) {
  const { tris } = readGlb(join(dir, f)); models++;
  const q = v => [Math.round(v[0] * 16 * 8), Math.round(-v[2] * 16 * 8), Math.round(v[1] * 16 * 8)];   // eighth-unit grid
  const id = new Map(), V = [], T = tris.map(t => t.v.map(v => { const p = q(v), k = p.join(); if (!id.has(k)) { id.set(k, V.length); V.push(p); } return id.get(k); }));
  const P = V.map((_, i) => i), find = i => P[i] === i ? i : (P[i] = find(P[i]));
  for (const t of T) { P[find(t[1])] = find(t[0]); P[find(t[2])] = find(t[0]); }
  const parts = new Map(); T.forEach(t => { const r = find(t[0]); (parts.get(r) || parts.set(r, []).get(r)).push(t); });
  let exact = true;
  for (const pt of parts.values()) {
    const vs = [...new Set(pt.flat())].map(i => V[i]), lo = [0, 1, 2].map(k => Math.min(...vs.map(v => v[k]))), hi = [0, 1, 2].map(k => Math.max(...vs.map(v => v[k])));
    const ext = hi.map((h, k) => h - lo[k]), tolA = 2;   // a quarter of a game unit, in eighth-units
    let kind = 'other';
    if (vs.length <= 8 && vs.every(v => v.every((c, k) => Math.abs(c - lo[k]) <= tolA || Math.abs(c - hi[k]) <= tolA))) kind = 'box';
    if (kind === 'other') for (let a = 0; a < 3; a++) {   // prism along axis a: every vertex sits on one of the two end planes, and both ends have the same outline
      if (ext[a] < 2) continue;
      const ends = vs.every(v => Math.abs(v[a] - lo[a]) <= tolA || Math.abs(v[a] - hi[a]) <= tolA); if (!ends) continue;
      const key = v => [0, 1, 2].filter(k => k !== a).map(k => Math.round(v[k] / 2)).join();
      const A = new Set(vs.filter(v => Math.abs(v[a] - lo[a]) <= tolA).map(key)), B = new Set(vs.filter(v => Math.abs(v[a] - hi[a]) <= tolA).map(key));
      if (A.size >= 3 && A.size === B.size && [...A].every(k => B.has(k))) { kind = 'prism'; break; }
    }
    if (kind === 'other' && vs.length >= 12) {   // lathe: around the vertical axis through the bounding-box centre, each height ring has one radius
      const cx = (lo[0] + hi[0]) / 2, cy = (lo[1] + hi[1]) / 2, rings = new Map();
      for (const v of vs) { const h = Math.round(v[2] / 2), r = Math.hypot(v[0] - cx, v[1] - cy); (rings.get(h) || rings.set(h, []).get(h)).push(r); }
      const R = Math.max(ext[0], ext[1]) / 2;
      const ok = [...rings.values()].every(rs => rs.length === 1 || (Math.max(...rs) - Math.min(...rs) <= Math.max(2, R * .06)));
      if (ok && Math.abs(ext[0] - ext[1]) <= Math.max(2, R * .1)) kind = 'lathe';
    }
    total[kind]++; tri[kind] += pt.length; if (kind === 'other') exact = false;
  }
  if (exact) fullyExact++;
  (per[dir] || (per[dir] = [0, 0]))[0]++; if (exact) per[dir][1]++;
}
const parts = Object.values(total).reduce((a, b) => a + b, 0), tris = Object.values(tri).reduce((a, b) => a + b, 0);
console.log(`${models} models, ${parts} parts:`, Object.entries(total).map(([k, n]) => `${k} ${n} (${(100 * n / parts).toFixed(0)}% of parts, ${(100 * tri[k] / tris).toFixed(0)}% of triangles)`).join('; '));
console.log(`models made only of box, prism and lathe parts: ${fullyExact} of ${models}`); for (const [d, [n, e]] of Object.entries(per)) console.log('  ', d.split('/').at(-1), e, 'of', n);
