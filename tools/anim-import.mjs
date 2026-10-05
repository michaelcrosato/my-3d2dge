// Animation importer: turns a skeletal animation library in glTF binary form (.glb: one humanoid rig, a mesh and
// its clips) into my-3D2dge clip data, so ready-made animations can play on the engine's procedural rigs.
//
// For every clip it samples the skeleton at a fixed rate, runs forward kinematics, and keeps the 3D positions of
// 31 body points (pelvis, spine, head, shoulders, arms, hands, legs, feet) in the engine's local frame:
// f = forward, r = right, z = up, centred on the character's root on the ground. It also measures the body from
// the mesh (limb radii, head size, the waist and joint bands of a second material), so a game can draw a look-alike.
//
// Points marked 'fwd' sit 12 cm in front of a bone (the way it faced in the rest pose), so a renderer can tell
// which way the face, the chest and the hips point, and how far the torso twists.
//
// Usage:  node tools/anim-import.mjs library.glb [--out src/mocap/ual-clips.js] [--fps 30] [--clips A,B,C] [--name UAL] [--credit "..."]
//         node tools/anim-import.mjs library.glb --list          (print the clips and the bones, write nothing)
// The bone names default to the Rigify "DEF-" deform bones that Quaternius' Universal Animation Library uses; for
// another rig, edit BONES below (one entry per body point).
//
// Output: a script that sets window.MOCAP[name] = { points, fps, body, clips }. Each clip is
//   { n: frames, loop, dur, move?, data } where data is base64 of little-endian Int16 values: frame by frame,
//   point by point, f r z in millimetres. move (root motion clips) is the root's [f, r] in millimetres per frame.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
if (!file) { console.error('Usage: node tools/anim-import.mjs library.glb [--out src/mocap/ual-clips.js] [--fps 30] [--clips A,B] [--name UAL] [--credit "..."] [--list]'); process.exit(2); }
const OUT = resolve(opt('out', 'src/mocap/ual-clips.js')), FPS = +opt('fps', 30), NAME = opt('name', 'UAL');
const CREDIT = opt('credit', NAME === 'UAL' ? 'Universal Animation Library by Quaternius (quaternius.com), CC0 1.0 (public domain).' : '');   // the source's author and license, kept in the output
const ONLY = opt('clips', null) ? new Set(opt('clips').split(',')) : null;

/* ---- the body points: [point, bone, where] (where: 'head' = the bone's own position, 'tip' = its far end) ---- */
const BONES = [
  ['pelvis', 'DEF-hips'], ['spine1', 'DEF-spine.001'], ['spine2', 'DEF-spine.002'], ['chest', 'DEF-spine.003'],
  ['neck', 'DEF-neck'], ['head', 'DEF-head'], ['headTop', 'DEF-head', 'tip'],
  ['faceF', 'DEF-head', 'fwd'], ['chestF', 'DEF-spine.003', 'fwd'], ['pelvisF', 'DEF-hips', 'fwd'],   // 12 cm in front: which way the face, chest and hips point
  ...['L', 'R'].flatMap(s => [
    ['clav' + s, 'DEF-shoulder.' + s], ['sh' + s, 'DEF-upper_arm.' + s], ['elbow' + s, 'DEF-forearm.' + s], ['wrist' + s, 'DEF-hand.' + s],
    ['index' + s, 'DEF-f_index.01.' + s], ['knuck' + s, 'DEF-f_middle.01.' + s], ['pinky' + s, 'DEF-f_pinky.01.' + s], ['fist' + s, 'DEF-f_middle.02.' + s],
    ['hip' + s, 'DEF-thigh.' + s], ['knee' + s, 'DEF-shin.' + s], ['ankle' + s, 'DEF-foot.' + s], ['ball' + s, 'DEF-toe.' + s], ['toe' + s, 'DEF-toe.' + s, 'tip']
  ])
];
const POINTS = BONES.map(b => b[0]);
// segments whose thickness the mesh tells us: [from point, to point, bone whose vertices it owns]
const SEGS = [
  ['pelvis', 'spine1', 'DEF-hips'], ['spine1', 'spine2', 'DEF-spine.001'], ['spine2', 'chest', 'DEF-spine.002'], ['chest', 'neck', 'DEF-spine.003'],
  ['neck', 'head', 'DEF-neck'], ['head', 'headTop', 'DEF-head'],
  ...['L', 'R'].flatMap(s => [
    ['clav' + s, 'sh' + s, 'DEF-shoulder.' + s], ['sh' + s, 'elbow' + s, 'DEF-upper_arm.' + s], ['elbow' + s, 'wrist' + s, 'DEF-forearm.' + s],
    ['wrist' + s, 'knuck' + s, 'DEF-hand.' + s], ['hip' + s, 'knee' + s, 'DEF-thigh.' + s], ['knee' + s, 'ankle' + s, 'DEF-shin.' + s],
    ['ankle' + s, 'ball' + s, 'DEF-foot.' + s], ['ball' + s, 'toe' + s, 'DEF-toe.' + s]
  ])
];

/* ---- GLB reading ---- */
const buf = readFileSync(resolve(file));
if (buf.readUInt32LE(0) !== 0x46546c67) { console.error(file + ' is not a binary glTF (.glb) file'); process.exit(1); }
const jsonLen = buf.readUInt32LE(12), G = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')), BIN = 20 + jsonLen + 8;
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function accessor(i) {
  const a = G.accessors[i], bv = G.bufferViews[a.bufferView], n = SIZE[a.type];
  const read = { 5126: o => buf.readFloatLE(o), 5125: o => buf.readUInt32LE(o), 5123: o => buf.readUInt16LE(o), 5121: o => buf.readUInt8(o) }[a.componentType];
  const bytes = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType], norm = a.normalized ? { 5123: 65535, 5121: 255 }[a.componentType] || 1 : 1;
  const base = BIN + (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || n * bytes, out = new Array(a.count);
  for (let k = 0; k < a.count; k++) { const row = new Array(n); for (let c = 0; c < n; c++) row[c] = read(base + k * stride + c * bytes) / norm; out[k] = n === 1 ? row[0] : row; }
  return out;
}

/* ---- math: column-major 4x4 matrices, quaternions [x, y, z, w] ---- */
const mat = (t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) => {
  const [x, y, z, w] = q, xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [(1 - 2 * (yy + zz)) * s[0], 2 * (xy + wz) * s[0], 2 * (xz - wy) * s[0], 0, 2 * (xy - wz) * s[1], (1 - 2 * (xx + zz)) * s[1], 2 * (yz + wx) * s[1], 0,
    2 * (xz + wy) * s[2], 2 * (yz - wx) * s[2], (1 - 2 * (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1];
};
const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
const xf = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const slerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1; if (d < 0) { d = -d; s = -1; }
  if (d > .9995) { const o = a.map((v, i) => v + (b[i] * s - v) * t), l = Math.hypot(...o); return o.map(v => v / l); }
  const th = Math.acos(d), k0 = Math.sin((1 - t) * th) / Math.sin(th), k1 = Math.sin(t * th) / Math.sin(th) * s;
  return a.map((v, i) => v * k0 + b[i] * k1);
};

/* ---- the skeleton ---- */
const nodes = G.nodes, parent = new Array(nodes.length).fill(-1), byName = new Map();
nodes.forEach((n, i) => { (n.children || []).forEach(c => parent[c] = i); byName.set(n.name, i); });
const missing = BONES.filter(b => !byName.has(b[1])).map(b => b[1]);
if (args.includes('--list')) {
  console.log('clips:', G.animations.map(a => a.name).join(', '));
  console.log('bones:', nodes.map(n => n.name).join(', '));
  if (missing.length) console.log('bones the importer needs but this file lacks:', [...new Set(missing)].join(', '));
  process.exit(0);
}
if (missing.length) { console.error('This rig lacks bones the importer maps: ' + [...new Set(missing)].join(', ') + '. Edit BONES in tools/anim-import.mjs.'); process.exit(1); }
const rest = nodes.map(n => ({ t: n.translation || [0, 0, 0], r: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1] }));
const order = [], seen = new Set();
const visit = i => { if (seen.has(i)) return; if (parent[i] >= 0) visit(parent[i]); seen.add(i); order.push(i); };
nodes.forEach((_, i) => visit(i));
const world = trs => { const W = new Array(nodes.length); for (const i of order) { const L = mat(trs[i].t, trs[i].r, trs[i].s); W[i] = parent[i] >= 0 ? mul(W[parent[i]], L) : L; } return W; };

/* ---- measure the body from the mesh in its bind pose ---- */
const skin = G.skins[0], joints = skin.joints, ibm = accessor(skin.inverseBindMatrices);
const meshNode = nodes.findIndex(n => n.mesh !== undefined && n.skin !== undefined), mesh = G.meshes[nodes[meshNode].mesh];
const boneVerts = new Map(), bandVerts = new Map();   // bone index -> [[x, y, z] in that bone's own frame]
let matJoint = -1; (G.materials || []).forEach((m, i) => { if (/joint/i.test(m.name)) matJoint = i; });
for (const prim of mesh.primitives) {
  const P = accessor(prim.attributes.POSITION), JN = accessor(prim.attributes.JOINTS_0), W = accessor(prim.attributes.WEIGHTS_0), band = prim.material === matJoint;
  for (let v = 0; v < P.length; v++) {
    let best = 0; for (let k = 1; k < 4; k++) if (W[v][k] > W[v][best]) best = k;
    const ji = JN[v][best], node = joints[ji], local = xf(ibm[ji], P[v]);
    const m = band ? bandVerts : boneVerts; if (!m.has(node)) m.set(node, []); m.get(node).push(local);
  }
}
const pct = (arr, p) => { if (!arr.length) return 0; const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const bindW = world(rest);
const boneLen = name => {   // distance to the bone's first child, or (a tip bone) the extent of its vertices along y
  const i = byName.get(name), kids = nodes[i].children || [];
  if (kids.length) { const a = xf(bindW[i], [0, 0, 0]), b = xf(bindW[kids[0]], [0, 0, 0]); return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); }
  const vs = (boneVerts.get(i) || []).concat(bandVerts.get(i) || []); return pct(vs.map(v => v[1]), .98);
};
// tip lengths for the bones that end a chain (head top, toe tip): from the mesh, in the bone's frame (y runs along a bone)
const TIP = {}; for (const b of BONES) if (b[2] === 'tip') TIP[b[1]] = boneLen(b[1]);

/* ---- the engine's local frame, found from the rest pose: up = +y, forward from the heels toward the toes ---- */
const pos = (W, name, where) => { const i = byName.get(name); return where === 'tip' ? xf(W[i], [0, TIP[name], 0]) : where === 'fwd' ? xf(W[i], FWD[name]) : xf(W[i], [0, 0, 0]); };
const UP = [0, 1, 0];
const fwd0 = (() => { const a = pos(bindW, 'DEF-foot.L'), b = pos(bindW, 'DEF-toe.L', 'tip'); const v = [b[0] - a[0], 0, b[2] - a[2]], l = Math.hypot(...v); return v.map(x => x / l); })();
const RIGHT = [fwd0[1] * UP[2] - fwd0[2] * UP[1], fwd0[2] * UP[0] - fwd0[0] * UP[2], fwd0[0] * UP[1] - fwd0[1] * UP[0]].map(x => -x);   // up x forward = left, so right is its negative
{ const l = pos(bindW, 'DEF-thigh.L'), r = pos(bindW, 'DEF-thigh.R'), d = (r[0] - l[0]) * RIGHT[0] + (r[2] - l[2]) * RIGHT[2]; if (d < 0) RIGHT.forEach((v, i) => RIGHT[i] = -v); }   // right really is toward the .R side
// for 'fwd' points: the rest pose's forward direction written in each bone's own frame (the transpose of its rotation)
const FWD = {}; for (const b of BONES) if (b[2] === 'fwd') { const m = bindW[byName.get(b[1])], n = [0, 1, 2].map(c => Math.hypot(m[c * 4], m[c * 4 + 1], m[c * 4 + 2])); FWD[b[1]] = [0, 1, 2].map(c => (m[c * 4] * fwd0[0] + m[c * 4 + 1] * fwd0[1] + m[c * 4 + 2] * fwd0[2]) / (n[c] * n[c]) * .12); }
const toLocal = (p, o) => { const d = [p[0] - o[0], p[1], p[2] - o[2]]; return [d[0] * fwd0[0] + d[2] * fwd0[2], d[0] * RIGHT[0] + d[2] * RIGHT[2], d[1]]; };

/* body: per-segment radii at the start, middle and end (from the vertices each bone owns), widths for the torso,
   and the second material's bands (where along which segment they sit) */
const MM = 1000;   // metres -> millimetres
const body = { height: 0, segs: [], bands: [] };
{ let top = 0; for (const prim of mesh.primitives) for (const p of accessor(prim.attributes.POSITION)) top = Math.max(top, p[1]); body.height = Math.round(top * MM); }
for (const [a, b, bone] of SEGS) {
  const i = byName.get(bone), vs = (boneVerts.get(i) || []).concat(bandVerts.get(i) || []), L = boneLen(bone) || 1;
  const bins = [[], [], []], wide = [], deep = [];
  for (const v of vs) { const t = v[1] / L, r = Math.hypot(v[0], v[2]); bins[t < .33 ? 0 : t < .67 ? 1 : 2].push(r); wide.push(Math.abs(v[0])); deep.push(Math.abs(v[2])); }
  body.segs.push({ a, b, r: bins.map(x => Math.round(pct(x, .8) * MM)), w: Math.round(pct(wide, .9) * MM), d: Math.round(pct(deep, .9) * MM) });
}
for (const [a, b, bone] of SEGS) {   // one band per run of the segment the second material covers (an elbow ring, a wrist ring)
  const i = byName.get(bone), vs = bandVerts.get(i); if (!vs || vs.length < 12) continue;
  const L = boneLen(bone) || 1, NB = 24, bins = Array.from({ length: NB }, () => []);
  for (const v of vs) { const t = v[1] / L, k = Math.max(0, Math.min(NB - 1, Math.floor((t + .2) / 1.4 * NB))); bins[k].push(v); }
  const min = Math.max(4, vs.length * .02);
  for (let k = 0; k < NB;) {
    if (bins[k].length < min) { k++; continue; }
    let e = k; const run = []; while (e < NB && bins[e].length >= min) run.push(...bins[e++]);
    const ts = run.map(v => v[1] / L), rs = run.map(v => Math.hypot(v[0], v[2]));
    body.bands.push({ a, b, t0: +pct(ts, .03).toFixed(2), t1: +pct(ts, .97).toFixed(2), r: Math.round(pct(rs, .85) * MM), front: +(run.reduce((s, v) => s + v[2], 0) / run.length / (pct(rs, .85) || 1)).toFixed(2) });
    k = e;
  }
}

/* ---- sample each clip ---- */
const clips = {};
const enc = arr => Buffer.from(new Int16Array(arr).buffer).toString('base64');
for (const an of G.animations) {
  if (ONLY && !ONLY.has(an.name)) continue;
  const tracks = an.channels.map(c => { const s = an.samplers[c.sampler]; return { node: c.target.node, path: c.target.path, t: accessor(s.input), v: accessor(s.output), interp: s.interpolation }; });
  const dur = Math.max(...tracks.map(k => k.t[k.t.length - 1])), n = Math.max(1, Math.round(dur * FPS) + 1);
  const data = [], move = []; let moved = false;
  for (let f = 0; f < n; f++) {
    const time = Math.min(dur, f / FPS), trs = rest.map(r => ({ t: r.t, r: r.r, s: r.s }));
    for (const k of tracks) {
      const T = k.t; let j = 0; while (j < T.length - 2 && T[j + 1] <= time) j++;
      const u = T.length < 2 || k.interp === 'STEP' ? 0 : Math.max(0, Math.min(1, (time - T[j]) / ((T[j + 1] - T[j]) || 1)));
      const a = k.v[j], b = k.v[Math.min(j + 1, k.v.length - 1)];
      const val = k.path === 'rotation' ? slerp(a, b, u) : a.map((x, i) => x + (b[i] - x) * u);
      const key = k.path === 'translation' ? 't' : k.path === 'rotation' ? 'r' : k.path === 'scale' ? 's' : null; if (key) trs[k.node] = Object.assign({}, trs[k.node], { [key]: val });
    }
    const W = world(trs), root = xf(W[byName.get('root') ?? order[0]], [0, 0, 0]);
    const rl = toLocal(root, [0, 0, 0]); move.push(Math.round(rl[0] * MM), Math.round(rl[1] * MM)); if (Math.abs(rl[0]) + Math.abs(rl[1]) > .01) moved = true;
    for (const [, bone, where] of BONES) { const p = toLocal(pos(W, bone, where), root); data.push(Math.round(p[0] * MM), Math.round(p[1] * MM), Math.round(p[2] * MM)); }
  }
  const loop = /_Loop$/.test(an.name) || /Idle$/.test(an.name);
  clips[an.name] = Object.assign({ n, dur: +dur.toFixed(3), loop }, moved ? { move: enc(move) } : {}, { data: enc(data) });
}

const lib = { source: 'converted by tools/anim-import.mjs from ' + file.split(/[\\/]/).pop(), credit: CREDIT, points: POINTS, fps: FPS, unit: 'mm', body, clips };
const js = `/* ${NAME}: skeletal animation clips converted to my-3D2dge clip data by tools/anim-import.mjs (do not edit by hand).
 * Source: ${file.split(/[\\/]/).pop()}.${CREDIT ? ' ' + CREDIT : ''}
 * Points are body positions in the rig's local frame (f forward, r right, z up), millimetres, base64 Int16, ${FPS} fps. */
(window.MOCAP = window.MOCAP || {})[${JSON.stringify(NAME)}] = ${JSON.stringify(lib)};
`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, js);
console.log(`wrote ${OUT}: ${Object.keys(clips).length} clips, ${POINTS.length} points, ${(js.length / 1024).toFixed(0)} KB; mannequin ${body.height} mm tall`);
