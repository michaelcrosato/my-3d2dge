// SPIKE (throwaway, from the Phase 0 planning session; see HANDOFF.md). A minimal .glb reader: every mesh primitive's
// world-space triangles and its material's base color (sRGB). Used by the other spike scripts.
import { readFileSync } from 'node:fs';
export function readGlb(file) {
  const buf = readFileSync(file); if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not glb');
  let off = 12, json = null, bin = null;
  while (off < buf.length) { const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4), data = buf.subarray(off + 8, off + 8 + len); if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8')); else bin = data; off += 8 + len; }
  const G = json, SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }, CT = { 5126: [Float32Array, 4], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5121: [Uint8Array, 1] };
  const acc = i => { const a = G.accessors[i], bv = G.bufferViews[a.bufferView], [T, b] = CT[a.componentType], n = SIZE[a.type], start = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || n * b, out = [];
    for (let k = 0; k < a.count; k++) { const row = []; for (let c = 0; c < n; c++) { const o = bin.byteOffset + start + k * stride + c * b; row.push(T === Float32Array ? bin.buffer.slice(o, o + 4) && new DataView(bin.buffer).getFloat32(o, true) : T === Uint16Array ? new DataView(bin.buffer).getUint16(o, true) : T === Uint32Array ? new DataView(bin.buffer).getUint32(o, true) : new DataView(bin.buffer).getUint8(o)); } out.push(n === 1 ? row[0] : row); } return out; };
  const mul = (A, B) => { const C = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) C[c * 4 + r] += A[k * 4 + r] * B[c * 4 + k]; return C; };
  const local = n => { if (n.matrix) return n.matrix; const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], [x, y, z, w] = q;
    return [(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0, 2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0, 2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1]; };
  const tris = [], mats = (G.materials || []).map(m => { const f = (m.pbrMetallicRoughness || {}).baseColorFactor || [1, 1, 1, 1]; return { name: m.name, rgb: f.slice(0, 3).map(v => Math.round(255 * Math.pow(v, 1 / 2.2))) }; });
  const walk = (ni, M) => { const n = G.nodes[ni], W = mul(M, local(n));
    if (n.mesh !== undefined) for (const p of G.meshes[n.mesh].primitives) { const P = acc(p.attributes.POSITION), I = p.indices !== undefined ? acc(p.indices) : P.map((_, i) => i);
      const tf = v => [W[0] * v[0] + W[4] * v[1] + W[8] * v[2] + W[12], W[1] * v[0] + W[5] * v[1] + W[9] * v[2] + W[13], W[2] * v[0] + W[6] * v[1] + W[10] * v[2] + W[14]];
      for (let i = 0; i + 2 < I.length; i += 3) tris.push({ m: p.material || 0, v: [tf(P[I[i]]), tf(P[I[i + 1]]), tf(P[I[i + 2]])] }); }
    for (const c of n.children || []) walk(c, W); };
  for (const r of G.scenes[G.scene || 0].nodes) walk(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return { tris, mats, textures: (G.images || []).length };
}
