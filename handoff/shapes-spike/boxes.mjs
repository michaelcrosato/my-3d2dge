// SPIKE (throwaway; see HANDOFF.md). Voxelize each model at U game units (1 m = 16 units), fill the inside, merge
// same-material cells greedily into boxes; write a shapes file (window.SHAPES.FURNITURE = { name: { mats, boxes } }).
// Usage: node handoff/shapes-spike/boxes.mjs <folder of .glb> <out.js> [U = 1]   (U 0.5 for finer cells)
import { readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readGlb } from './glb.mjs';
import { pathToFileURL } from 'node:url';
export function boxes(file, U = 1) {
  const { tris, mats } = readGlb(file), S = 16 / U;   // cells per metre
  const T = tris.map(t => ({ m: t.m, v: t.v.map(v => [v[0] * S, -v[2] * S, v[1] * S]) }));   // y-up -> z-up, y south
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const t of T) for (const v of t.v) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); }
  const o = lo.map(x => Math.floor(x) - 1), n = hi.map((x, k) => Math.ceil(x) - o[k] + 2), N = n[0] * n[1] * n[2], cell = new Int16Array(N).fill(-1), idx = (x, y, z) => (z * n[1] + y) * n[0] + x;
  // surface: sample every triangle finely and mark the cells it passes through with its material
  for (const t of T) { const [a, b, c] = t.v, e = Math.max(...[0, 1, 2].map(k => Math.max(Math.abs(b[k] - a[k]), Math.abs(c[k] - a[k]), Math.abs(c[k] - b[k])))), st = Math.max(2, Math.ceil(e * 3));
    for (let i = 0; i <= st; i++) for (let j = 0; j <= st - i; j++) { const u = i / st, w = j / st, p = [0, 1, 2].map(k => a[k] + (b[k] - a[k]) * u + (c[k] - a[k]) * w); const x = Math.floor(p[0] - o[0]), y = Math.floor(p[1] - o[1]), z = Math.floor(p[2] - o[2]); cell[idx(x, y, z)] = t.m; } }
  // inside: flood the outside from a corner; whatever is neither outside nor surface is solid (it takes a neighbour's material)
  const out = new Uint8Array(N), q = [0]; out[0] = 1;
  while (q.length) { const i = q.pop(), x = i % n[0], y = ((i / n[0]) | 0) % n[1], z = (i / (n[0] * n[1])) | 0;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const X = x + dx, Y = y + dy, Z = z + dz; if (X < 0 || Y < 0 || Z < 0 || X >= n[0] || Y >= n[1] || Z >= n[2]) continue; const j = idx(X, Y, Z); if (!out[j] && cell[j] < 0) { out[j] = 1; q.push(j); } } }
  for (let pass = 0; pass < 8; pass++) for (let i = 0; i < N; i++) if (cell[i] < 0 && !out[i]) { for (const d of [1, -1, n[0], -n[0], n[0] * n[1], -n[0] * n[1]]) { const j = i + d; if (j >= 0 && j < N && cell[j] >= 0) { cell[i] = cell[j]; break; } } }
  // greedy merge: grow each unclaimed cell into the biggest same-material box along x, then y, then z
  const used = new Uint8Array(N), B = [];
  for (let z = 0; z < n[2]; z++) for (let y = 0; y < n[1]; y++) for (let x = 0; x < n[0]; x++) {
    const i = idx(x, y, z), m = cell[i]; if (m < 0 || used[i]) continue;
    const ok = (X, Y, Z) => X < n[0] && Y < n[1] && Z < n[2] && cell[idx(X, Y, Z)] === m && !used[idx(X, Y, Z)];
    let x1 = x; while (ok(x1 + 1, y, z)) x1++;
    let y1 = y; while ([...Array(x1 - x + 1).keys()].every(k => ok(x + k, y1 + 1, z))) y1++;
    let z1 = z; while ([...Array(x1 - x + 1).keys()].every(k => [...Array(y1 - y + 1).keys()].every(l => ok(x + k, y + l, z1 + 1)))) z1++;
    for (let Z = z; Z <= z1; Z++) for (let Y = y; Y <= y1; Y++) for (let X = x; X <= x1; X++) used[idx(X, Y, Z)] = 1;
    B.push([m, x + o[0], y + o[1], z + o[2], x1 + 1 + o[0], y1 + 1 + o[1], z1 + 1 + o[2]].map((v, k) => k ? v * U : v));
  }
  const hex = c => '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
  return { mats: mats.map(m => hex(m.rgb)), boxes: B };
}
if (import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2]) {   // (run as a command, not imported)
  const dir = process.argv[2], res = {}; let glb = 0, nb = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.glb'))) { const r = boxes(join(dir, f), +(process.argv[4] || 1)); res[f.replace('.glb', '')] = r; glb += statSync(join(dir, f)).size; nb.push(r.boxes.length); }
  const txt = '(window.SHAPES = window.SHAPES || {}).FURNITURE = {\n' + Object.entries(res).map(([k, r]) => JSON.stringify(k) + ': {"mats": ' + JSON.stringify(r.mats) + ', "boxes": [\n  ' + r.boxes.map(b => JSON.stringify(b)).join(',\n  ') + ']}').join(',\n') + '\n};\n';
  writeFileSync(process.argv[3], txt); nb.sort((a, b) => a - b);
  console.log(`${nb.length} models -> boxes: median ${nb[nb.length >> 1]}, p90 ${nb[Math.floor(nb.length * .9)]}, max ${nb.at(-1)}; glb ${(glb / 1024).toFixed(0)} KB -> ${(txt.length / 1024).toFixed(0)} KB (${(glb / txt.length).toFixed(1)}x smaller)`);
}
