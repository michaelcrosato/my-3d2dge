/* =============================================================================
 * ASSET PROBE: THE LIBRARY (temporary, src/labs.json "Temporary" asset-probe; docs/HANDOFF-ASSETS.md, Phase 0).
 * 24 objects written by hand as named parts, and the materials they use. Units: 16 = 1 m = one tile; x east, y south,
 * z up; a shape's origin is the middle of its footprint on the ground, its front faces south (+y). Parts:
 *   ['box', mat, at, [w, d, h], { rot }]        at: bottom centre; rot: yaw degrees, or [x, y, z] degrees
 *   ['cyl', mat, at, r, h, { r2, seg, sq }]     r2: top radius (a cone or frustum); sq squashes y (an oval)
 *   ['lathe', mat, at, [[r, z], ...], { seg }]  a profile turned about z, bottom to top
 *   ['ball', mat, at, r, { sz }]                at: its centre; sz < 1 flattens it
 *   ['prism', mat, at, [[a, b], ...], h, { axis, rot }]   an outline pushed h along z (up from at), y or x (centred)
 *   ['wedge', mat, at, [w, d, h], { rot }]      a ramp: h tall at the back, down to the floor at the front
 *   ['rock', mat, at, r, { sz, seed, rough }]   a lumpy, faceted ball (at: its centre; below the floor is not drawn)
 *   ['use', id, at, { rot, scale, mats, ...params }]   another shape inside this one
 *   ['mirror', 'x' | 'y' | 'xy', part]  ['ring', n, radius, part]  ['row', n, [dx, dy, dz], part]  ['group', at, rot, [parts]]
 * A material: '#hex pattern key=value' or an id below. Generators (make) seed their noise from their params, never
 * from Math.random, so an entry draws the same pixels everywhere.
 * ============================================================================= */
(() => {
'use strict';
const AP = window.AssetProbe, M = AP.MATERIALS, S = AP.SHAPES;

/* ---------- materials: woods, metals, stone, earthenware, cloth, plants ---------- */
Object.assign(M, {
  oak: { color: '#8a5a36', pattern: 'planks', bw: 3 },
  'oak-dark': { color: '#5e3c26', pattern: 'planks', bw: 2 },
  pine: { color: '#b08050', pattern: 'planks', bw: 3 },
  crate: { color: '#9a6a3a', pattern: 'crate' },
  iron: { color: '#5e6274', pattern: 'metal' },
  gold: { color: '#d0a038', pattern: 'metal' },
  stone: { color: '#8a8490', pattern: 'stones', size: 5 },
  rock: { color: '#7c7688', pattern: 'speck' },
  clay: { color: '#b0603a', pattern: 'glaze' },
  glazed: { color: '#3a6a8a', pattern: 'glaze' },
  linen: { color: '#d8ccb0', pattern: 'cloth' },
  burlap: { color: '#a88a58', pattern: 'cloth', fold: 1.4 },
  wool: { color: '#9a2a3a', pattern: 'cloth' },
  straw: { color: '#c8a850', pattern: 'thatch' },
  shingle: { color: '#6a4a4a', pattern: 'shingles' },
  bark: { color: '#6a4a2e', pattern: 'bark' },
  needles: { color: '#2f6a4a', pattern: 'foliage', size: 3 },
  leaves: { color: '#3f8a45', pattern: 'foliage' },
  shrub: { color: '#4a8a3e', pattern: 'foliage', size: 3 },
  crystal: { color: '#6ad8f0', pattern: 'glaze', glow: 1 },
  flame: { color: '#ffd070', glow: 1 },
  water: { color: '#2f6fb0', pattern: 'glaze' }
});

/* ---------- the objects ---------- */
Object.assign(S, {
barrel: { about: 'oak barrel, two iron hoops', tags: 'container wood', mats: { w: 'oak', h: 'iron' },
  parts: [['lathe','w',[0,0,0],[[0,0],[5,0],[6,3],[6.5,8],[6,13],[5,16],[0,16]]],['row',2,[0,0,9],['cyl','h',[0,0,7.5],6.5,1.5]]] },
crate: { about: 'wooden crate, framed and braced', tags: 'container wood', mats: { c: 'crate' }, parts: [['box','c',[0,0,0],[15,15,14]]] },
chest: { about: 'oak chest, round lid, iron bands', tags: 'container treasure', mats: { w: 'oak', b: 'iron', l: 'gold' },
  parts: [['box','w',[0,0,0],[16,10,8]],['prism','w',[0,0,8],[[-5,0],[5,0],[4,3],[0,5],[-4,3]],16, {axis:'x'}],['mirror','x',['box','b',[5.5,0,0],[1.5,11,8.5]]],['box','l',[0,5,5],[3,1,3]]] },
table: { about: 'plank table, four legs', tags: 'furniture tavern', mats: { t: 'oak', l: 'oak-dark' },
  parts: [['box','t',[0,0,10],[24,14,2]],['mirror','xy',['box','l',[10,5,0],[2,2,10]]]] },
chair: { about: 'wooden chair', tags: 'furniture tavern', mats: { w: 'oak', l: 'oak-dark' },
  parts: [['box','w',[0,0,7],[9,9,1.5]],['mirror','xy',['box','l',[3.5,3.5,0],[1.5,1.5,7]]],['mirror','x',['box','l',[3.5,-3.5,8.5],[1.5,1.5,10]]],['box','w',[0,-3.5,13],[6,1,4]]] },
stool: { about: 'round three-legged stool', tags: 'furniture tavern', mats: { w: 'oak', l: 'oak-dark' },
  parts: [['cyl','w',[0,0,8],5,1.5],['ring',3,3,['box','l',[0,0,0],[1.5,1.5,8], {rot:[0,-8,0]}]]] },
bench: { about: 'plank bench on two trestles', tags: 'furniture tavern', mats: { w: 'oak', l: 'oak-dark' },
  parts: [['box','w',[0,0,7],[26,7,1.5]],['mirror','x',['wedge','l',[10,0,0],[2,6,7], {rot:90}]]] },
bed: { about: 'wooden bed, red blanket, head at the back', tags: 'furniture inn', mats: { f: 'oak', s: 'linen', b: 'wool' },
  parts: [['box','f',[0,0,0],[17,30,5]],['box','s',[0,-1,5],[15,26,2]],['box','b',[0,4,6],[16,19,1.5]],['box','s',[0,-9.5,7],[11,5,2]],['box','f',[0,-14.5,5],[17,2,9]]] },
bookcase: { about: 'tall bookcase full of books', tags: 'furniture library', mats: { w: 'oak-dark', a: '#8a2a2a', b: '#2a4a8a' },
  parts: [['box','w',[0,-3.5,0],[17,1,30]],['mirror','x',['box','w',[8,0,0],[1.5,8,30]]],['row',4,[0,0,9.5],['box','w',[0,0,14],[16,8,1.5]]],['row',3,[0,0,9.5],['row',3,[5,0,0],['group',[0,0,10.5],0,[['box','a',[-1,0,0],[2,6,7]],['box','b',[1.5,0,0],[2,6,6]]]]]]] },
shelf: { about: 'low shelf with jars and a pot', tags: 'furniture shop', mats: { w: 'pine' },
  parts: [['mirror','x',['box','w',[8,0,0],[1.5,6,16]]],['row',2,[0,0,7.5],['box','w',[0,0,7],[17,6,1.5]]],['use','jar',[-4,0,5], {scale:.7}],['use','pot',[4,0,12.5], {scale:.5}]] },
pot: { about: 'round glazed clay pot', tags: 'container breakable', mats: { c: 'clay' },
  parts: [['lathe','c',[0,0,0],[[0,0],[3,0],[5,3],[5,6],[3.5,9],[4,10],[3,10],[2.5,9],[0,9]]]] },
jar: { about: 'blue glazed jar, corked', tags: 'container shop', mats: { g: 'glazed', c: '#a87850' },
  parts: [['lathe','g',[0,0,0],[[0,0],[2.5,0],[3.5,4],[3,7],[2,8],[2,9],[0,9]]],['cyl','c',[0,0,9],1.5,1.5]] },
sack: { about: 'full burlap sack, tied', tags: 'container farm', mats: { b: 'burlap', t: '#6a4a2e' },
  parts: [['ball','b',[0,0,5],5.5, {sz:.9}],['lathe','b',[0,0,8.5],[[2.5,0],[1,2.5],[2.5,4.5],[0,5]]],['cyl','t',[0,0,10.5],1.5,1]] },
cart: { about: 'hand cart, two wheels, shafts forward', tags: 'vehicle farm', mats: { w: 'pine', d: 'oak-dark', r: 'iron' },
  parts: [['box','w',[0,-2,6],[13,18,1.5]],['mirror','x',['box','w',[6,-2,7.5],[1,18,4]]],['box','w',[0,-10.5,7.5],[13,1,4]],['mirror','x',['box','d',[3.5,13,5.5],[1,16,1.5]]],['mirror','x',['cyl','r',[7,-1,6],6,1.5, {rot:[0,90,0]}]]] },
well: { about: 'stone well, shingled roof, crank', tags: 'village water', mats: { s: 'stone', w: 'oak-dark', r: 'shingle', a: 'water' },
  parts: [['lathe','s',[0,0,0],[[9,0],[9,8],[6.5,8],[6.5,2]]],['cyl','a',[0,0,0],7,2],['mirror','x',['box','w',[8,0,8],[1.5,1.5,15]]],['prism','r',[0,0,22],[[-9,0],[9,0],[0,7]],20, {axis:'x'}],['box','w',[0,0,18],[16,1,1]]] },
sign: { about: 'signpost with a blank board', tags: 'village road', mats: { p: 'oak-dark', b: 'pine' },
  parts: [['box','p',[0,0,0],[2,2,22]],['box','b',[0,1.5,11],[14,1,8]]] },
fence: { about: 'rail fence, len long (16)', tags: 'village farm', mats: { w: 'oak' }, params: { len: 16 },
  make: p => [['mirror', 'x', ['box', 'w', [p.len / 2 - 1, 0, 0], [2, 2, 12]]], ['row', 2, [0, 0, 5], ['box', 'w', [0, 0, 6], [p.len - 2, 1, 1.5]]]] },
lamppost: { about: 'iron street lamp, glowing head', tags: 'town light', mats: { m: 'iron', g: 'flame' }, lights: [[0, 0, 40, '#ffd070', 70]],
  parts: [['cyl','m',[0,0,0],2.5,3],['cyl','m',[0,0,3],1,34],['box','g',[0,0,37],[4,4,5]],['cyl','m',[0,0,42],3.5,3, {r2:0,seg:4}]] },
anvil: { about: 'iron anvil on a wooden block', tags: 'forge smithy', mats: { m: 'iron', w: 'oak-dark' },
  parts: [['cyl','w',[0,0,0],6,7, {sq:.8}],['box','m',[0,0,7],[4,3.5,5]],['prism','m',[0,0,0],[[-7,12],[6,12],[11,14],[6,15.5],[-7,15.5]],5, {axis:'y'}]] },
pine: { about: 'pine, tiers (4), h tall (41)', tags: 'tree forest', mats: { b: 'bark', l: 'needles' }, params: { h: 41, tiers: 4 },
  make: ({ h, tiers: n }) => [['cyl', 'b', [0, 0, 0], h / 18, h / 3], ...[...Array(n)].map((_, i) => {
    const z = h * (.17 + .6 * i / n), r = h * (.3 - .19 * i / n); return ['lathe', 'l', [0, 0, z], [[0, 0], [r * .6, 0], [r, h / 25], [0, h * (.35 - .03 * i)]]]; })] },
tree: { about: 'broadleaf tree, h tall (40)', tags: 'tree forest', mats: { b: 'bark', l: 'leaves' }, params: { h: 40, seed: 1 },
  make: ({ h, seed }) => { const r = My3D2dge.rng(seed), t = h * .62, out = [['cyl', 'b', [0, 0, 0], h / 14, t, { r2: h / 25 }]];
    for (let i = 0; i < 10; i++) { const a = r() * 6.3, d = i && h * (.1 + r() * .15); out.push(['ball', 'l', [Math.cos(a) * d, Math.sin(a) * d, t + (r() - .3) * h / 4 - d / 3], h * (.15 + r() * .07), { sz: .85 }]); }
    return out; } },
bush: { about: 'round bush, r wide (7)', tags: 'plant garden', mats: { l: 'shrub' }, params: { r: 7 },
  make: ({ r }) => [['ball', 'l', [0, 0, r * .55], r * .65, { sz: .85 }], ['ring', 5, r * .5, ['ball', 'l', [0, 0, r * .5], r * .55, { sz: .85 }]]] },
rock: { about: 'boulder, half sunk', tags: 'nature cave', mats: { s: 'rock' },
  parts: [['rock','s',[0,0,1],7.5, {sz:.7,seed:2}],['rock','s',[6,3,0],3.5, {seed:5}]] },
crystal: { about: 'three glowing crystal columns', tags: 'cave magic', mats: { c: 'crystal' },
  parts: [['lathe','c',[0,0,0],[[0,0],[2.5,0],[2.5,14],[0,18]], {seg:6,rot:[0,-10,0]}],['lathe','c',[3.5,1.5,0],[[0,0],[2,0],[2,8],[0,11]], {seg:6,rot:[0,26,30]}],['lathe','c',[-3.5,1,0],[[0,0],[1.5,0],[1.5,6],[0,9]], {seg:6,rot:[0,-24,-20]}]] }
});
// the props each is compared with (our closest flat prop, or none)
AP.PROP_OF = { barrel: 'barrel', crate: 'crate', chest: 'chest', pot: 'pot', jar: 'pot', sign: 'sign', fence: 'fence', lamppost: 'streetlamp', pine: 'pine', tree: 'tree', bush: 'bush', rock: 'rock', crystal: 'crystal' };
})();
