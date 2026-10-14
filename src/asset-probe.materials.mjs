// ASSET PROBE: FITTING MATERIALS (temporary, src/labs.json "Temporary" asset-probe; docs/HANDOFF-ASSETS.md, Phase 0).
// Turns CC0 PBR texture sets (ambientCG: a color map, a height map and the physical size) into materials of the house
// kind, a ramp of five tones and a pattern with a few numbers, as section 5.2 of the plan says:
//   1. the source's category picks the pattern family (Bricks -> bricks, WoodFloor -> planks, PavingStones -> stones...)
//   2. the ramp: the color map's pixels in five clusters (k-means), darkest to lightest. A photo is lit flat, so its
//      clusters are the material's own variation, not light: the ramp keeps E.tones' lightness (our light bands) and
//      takes the clusters' hue and chroma only where E.tones misses them by more than dE 8 (moss green in the dark joints)
//   3. the numbers: how often a line across the height map crosses a joint (a break in its slope; of a few cuts for
//      how steep is a break, the one where every line agrees best), across and along, in units at twice life size
//      (16 units = 1 m; drawn bigger than life, as props are)
//   4. the fit: our material drawn at game scale against the color map shrunk to game scale: the mean color's dE, and
//      a structure score (how close the dominant periods and the contrast are, 0..1)
// Usage: node src/asset-probe.materials.mjs <out.js> <dir of ambientCG sets> <id>:<width cm>x<height cm> ...
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { decodePNG } from './asset-probe.convert.mjs';
const E = globalThis.My3D2dge, AP = globalThis.AssetProbe;   // (loaded by the converter's module)

const FAMILY = [[/^Bricks/, 'bricks'], [/^(WoodFloor|Planks|Wood)/, 'planks'], [/^(PavingStones|Rock|Cobble)/, 'stones'], [/^Tiles/, 'tiles'], [/^(MetalPlates|Metal)/, 'metal'], [/^RoofingTiles/, 'shingles'], [/^(Fabric|Carpet)/, 'cloth']];
const LIFE = 2;   // units per real unit beyond 16/m: materials, like props, are drawn twice life size
const lab = ([r, g, b]) => {
  const f = v => { v /= 255; return v > .04045 ? Math.pow((v + .055) / 1.055, 2.4) : v / 12.92; }, R = f(r), G = f(g), B = f(b);
  const X = (R * .4124 + G * .3576 + B * .1805) / .95047, Y = R * .2126 + G * .7152 + B * .0722, Z = (R * .0193 + G * .1192 + B * .9505) / 1.08883;
  const h = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))];
};
const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
/** CIE Lab -> sRGB */
const unlab = ([L, a, b]) => {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200, g = t => t ** 3 > .008856 ? t ** 3 : (t - 16 / 116) / 7.787;
  const X = g(fx) * .95047, Y = g(fy), Z = g(fz) * 1.08883, f = v => 255 * (v > .0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - .055 : 12.92 * v);
  return [f(X * 3.2406 - Y * 1.5372 - Z * .4986), f(-X * .9689 + Y * 1.8758 + Z * .0415), f(X * .0557 - Y * .2040 + Z * 1.0570)];
};
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = (rgba, i) => .2126 * rgba[i] + .7152 * rgba[i + 1] + .0722 * rgba[i + 2];

/** five tones: k-means on a grid of samples, the clusters sorted dark to light */
function ramp(im) {
  const P = []; for (let y = 0; y < im.h; y += 8) for (let x = 0; x < im.w; x += 8) { const i = (y * im.w + x) * 4; P.push([im.rgba[i], im.rgba[i + 1], im.rgba[i + 2]]); }
  P.sort((a, b) => lum(a, 0) - lum(b, 0));
  let C = [0, 1, 2, 3, 4].map(k => P[Math.floor((k + .5) / 5 * P.length)].slice());
  for (let it = 0; it < 20; it++) {
    const S = C.map(() => [0, 0, 0, 0]);
    for (const p of P) { let b = 0, bd = 1e9; for (let k = 0; k < 5; k++) { const d = (p[0] - C[k][0]) ** 2 + (p[1] - C[k][1]) ** 2 + (p[2] - C[k][2]) ** 2; if (d < bd) { bd = d; b = k; } } S[b][0] += p[0]; S[b][1] += p[1]; S[b][2] += p[2]; S[b][3]++; }
    C = C.map((c, k) => S[k][3] ? [S[k][0] / S[k][3], S[k][1] / S[k][3], S[k][2] / S[k][3]] : c);
  }
  return C.sort((a, b) => lum(a, 0) - lum(b, 0));
}
/** the joints' period along x (axis 0) or y (1), in pixels. A height map's joints are breaks: a dark line between two
 *  boards or bricks, a step at a tile's edge. So the steepest 3% of its slope along a line are joint events (events
 *  within 1/100 of the image merge into one); a line crosses a joint every period. The median over lines.
 *  { lag, n } (n: joints a line crosses) */
function joints(im, axis) {
  const W = im.w, H = im.h, L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = lum(im.rgba, i * 4);
  const n0 = axis ? H : W, m0 = axis ? W : H, at = (i, j) => axis ? L[i * W + j] : L[j * W + i], G = [];
  for (let j = 0; j < m0; j += 2) for (let i = 2; i < n0 - 2; i++) G.push(Math.abs(at(i + 2, j) - at(i - 2, j)));
  const sorted = Float32Array.from(G).sort(), gap = Math.max(3, Math.round(n0 / 100));
  // how steep counts as a break: of a few cuts, the one whose lines agree best (real joints cross every line alike)
  let best = { lag: 0, n: 0, spread: 1e9 };
  for (const q of [.92, .94, .96, .975, .985]) {
    const cut = sorted[Math.floor(sorted.length * q)], counts = [];
    for (let j = 0; j < m0; j += 2) {
      let c = 0, last = -1e9;
      for (let i = 2; i < n0 - 2; i++) if (Math.abs(at(i + 2, j) - at(i - 2, j)) > cut) { if (i - last > gap) c++; last = i; }
      if (c > 0) counts.push(c);
    }
    if (counts.length < m0 / 8) continue;
    counts.sort((a, b) => a - b); const n = counts[counts.length >> 1], mad = counts.map(c => Math.abs(c - n)).sort((a, b) => a - b)[counts.length >> 1];
    const spread = mad / n; if (n > 1 && spread < best.spread) best = { lag: n0 / n, n, spread };
  }
  return best;
}
const period = (im, axis) => ({ lag: joints(im, axis).lag });
/** an image shrunk by a box filter to w x h */
function shrink(im, w, h) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.floor(x * im.w / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * im.w / w)), y0 = Math.floor(y * im.h / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * im.h / h)), s = [0, 0, 0]; let n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * im.w + xx) * 4; s[0] += im.rgba[i]; s[1] += im.rgba[i + 1]; s[2] += im.rgba[i + 2]; n++; }
    out.set([s[0] / n, s[1] / n, s[2] / n, 255], (y * w + x) * 4);
  }
  return { w, h, rgba: out };
}
const stats = im => { let m = 0, v = 0, n = im.w * im.h; for (let i = 0; i < n; i++) m += lum(im.rgba, i * 4); m /= n; for (let i = 0; i < n; i++) v += (lum(im.rgba, i * 4) - m) ** 2; const c = [0, 0, 0]; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) c[k] += im.rgba[i * 4 + k] / n; return { mean: c, sd: Math.sqrt(v / n) }; };

/** fit one set: { id, mat, fit } */
export function fitMaterial(dir, id, wcm, hcm) {
  const fam = (FAMILY.find(([re]) => re.test(id)) || [0, 'noise'])[1];
  const col = decodePNG(readFileSync(join(dir, id, `${id}_1K-PNG_Color.png`))), disp = decodePNG(readFileSync(join(dir, id, `${id}_1K-PNG_Displacement.png`)));
  const R = ramp(col), base = R[2], t = E.tones(hex(base)), tr = [t.deep, t.sh, t.base, t.lt, t.hi].map(E.hex);
  const miss = R.reduce((a, c, k) => { const p = lab(c), q = lab(tr[k]); return a + Math.hypot(p[1] - q[1], p[2] - q[2]); }, 0) / 5;
  const upx = wcm / 100 * 16 * LIFE / disp.w, vpx = hcm / 100 * 16 * LIFE / disp.h;   // units per pixel of the height map, across and up
  const px = joints(disp, 0), py = joints(disp, 1), U = px.lag * upx, Vv = py.lag * vpx, r1 = v => Math.round(v * 2) / 2;
  const m = { color: hex(base), pattern: fam };
  if (fam === 'bricks') { m.bw = r1(U); m.bh = r1(Vv); }
  else if (fam === 'planks') { const across = py.n >= px.n; m.bw = r1(across ? Vv : U); m.len = r1(across ? U : Vv); if (!across) m.dir = 'v'; }   // more seams across the boards than along
  else if (fam === 'stones') m.size = r1((U + Vv) / 2);
  else if (fam === 'tiles') m.size = r1(Math.min(U, Vv));
  else if (fam === 'shingles') { m.bw = r1(U); m.course = r1(Vv); }
  else if (fam === 'metal' && px.n > 1) m.rivet = r1(Math.min(U, Vv));
  if (miss > 8) m.ramp = R.map((c, k) => { const q = lab(c), L = lab(tr[k])[0]; return hex(unlab([L, q[1], q[2]])); });
  // the fit at game scale: a flat lid of our material, 1.5 pixels a unit, against the color map shrunk the same way
  const gw = Math.round(wcm / 100 * 16 * LIFE * 1.5), gh = Math.round(hcm / 100 * 16 * LIFE * 1.5), src = shrink(col, gw, gh);
  const ours = render(m, gw, gh, 1.5), a = stats(src), b = stats(ours);
  const pa = [period(src, 0).lag, period(src, 1).lag].map(Math.round), pb = [period(ours, 0).lag, period(ours, 1).lag].map(Math.round);
  const sim = (x, y) => x && y ? Math.min(x, y) / Math.max(x, y) : x === y ? 1 : 0;
  const structure = (sim(pa[0], pb[0]) + sim(pa[1], pb[1])) / 4 + sim(a.sd, b.sd) / 2;
  return { id, family: fam, mat: m, fit: { dE: Math.round(dE(a.mean, b.mean)), ramp: Math.round(miss), structure: Math.round(structure * 100) / 100, periods: { src: pa, ours: pb } }, game: { src, ours } };
}
/** our material on a flat face (a lid, lit evenly) at k pixels a unit, as an image */
function render(m, w, h, k) {
  const mt = AP.mat(m), out = new Uint8ClampedArray(w * h * 4), s = { u: 0, v: 0, W: w / k, H: h / k, lid: false, curved: false, lit: .5, px: 1 / k, part: 0 };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { s.u = (x + .5) / k; s.v = (h - y - .5) / k; const t = Math.max(0, Math.min(4, 2 + mt.pat(s, mt.q))), c = mt.ramp[t]; out.set([c[0], c[1], c[2], 255], (y * w + x) * 4); }
  return { w, h, rgba: out };
}

if (process.argv[1] && process.argv[1].endsWith('asset-probe.materials.mjs')) {
  const [out, dir, ...items] = process.argv.slice(2), res = {}, recs = {};
  for (const it of items) {
    const [id, wh] = it.split(':'), [w, h] = wh.split('x').map(Number), r = fitMaterial(dir, id, w, h), key = 'acg-' + id.toLowerCase();
    res[key] = Object.assign({}, r.mat, { src: 'ambientcg', orig: id, fit: r.fit });
    recs[id] = createHash('sha256').update(readFileSync(join(dir, id + '.zip'))).digest('hex').slice(0, 16);
    console.log(`${key.padEnd(24)} ${r.family.padEnd(8)} ${JSON.stringify(r.mat)}  dE ${r.fit.dE}, ramp dE ${r.fit.ramp}, structure ${r.fit.structure} (periods ${r.fit.periods.src} vs ${r.fit.periods.ours})`);
  }
  const text = `/* ASSET PROBE: FITTED MATERIALS (temporary, src/labs.json "Temporary" asset-probe). Written by src/asset-probe.materials.mjs from
 * ambientCG (ambientcg.com) texture sets, CC0 1.0: each a pattern family, a ramp (k-means of the color map, when E.tones
 * misses it), its numbers from the height map's period at twice life size, and its fit at game scale. */
Object.assign(window.AssetProbe.MATERIALS, ${JSON.stringify(res, null, 0).replace(/,"acg-/g, ',\n"acg-')});
window.AssetProbe.FITTED = ${JSON.stringify(Object.keys(res))};
window.AssetProbe.FITTED_SOURCES = { ambientcg: { label: 'ambientCG', license: 'CC0 1.0', url: 'https://ambientcg.com', fetched: '2026-10-14', sha256: ${JSON.stringify(recs)} } };
`;
  writeFileSync(out, text); console.log('wrote', out);
}
