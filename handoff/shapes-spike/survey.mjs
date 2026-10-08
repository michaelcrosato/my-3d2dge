// SPIKE (throwaway; see HANDOFF.md). Survey a folder of .glb models: triangles, materials, textures, sizes.
// Usage: node handoff/shapes-spike/survey.mjs <folder of .glb>
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readGlb } from './glb.mjs';
const dir = process.argv[2], rows = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.glb'))) {
  const { tris, mats, textures } = readGlb(join(dir, f)); let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const t of tris) for (const v of t.v) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); }
  rows.push({ f, bytes: statSync(join(dir, f)).size, tris: tris.length, mats: mats.length, textures, size: hi.map((h, k) => +(h - lo[k]).toFixed(2)) });
}
rows.sort((a, b) => a.tris - b.tris);
const q = p => rows[Math.floor(p * (rows.length - 1))];
console.log('models', rows.length, '| triangles: min', rows[0].tris, 'median', q(.5).tris, 'p90', q(.9).tris, 'max', rows.at(-1).tris);
console.log('materials per model: median', [...rows].sort((a, b) => a.mats - b.mats)[rows.length >> 1].mats, '| models with image textures:', rows.filter(r => r.textures).length);
console.log('glb bytes: median', [...rows].sort((a, b) => a.bytes - b.bytes)[rows.length >> 1].bytes);
for (const r of [rows[0], q(.25), q(.5), q(.75), rows.at(-1)]) console.log(' ', r.f.padEnd(34), String(r.tris).padStart(5), 'tris', r.mats, 'mats', (r.bytes / 1024).toFixed(1) + ' KB', 'size m', r.size.join(' x '));
