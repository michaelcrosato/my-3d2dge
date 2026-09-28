/* =============================================================================
 * EMBERHOLD, THE LAST LIT TOWN  (TOWN.build: the hand-built town that replaces the core's fallback green)
 * A walled town at dusk, 48 x 40 cells. A cobbled plaza laid in rings round the waystone and its rune circle;
 * timber and plaster houses with pitched tile roofs, glowing windows and smoking chimneys along the north and
 * west (nothing tall stands between the camera and the people); the forge yard, the market stall, the mystic's
 * tower, the tavern terrace; a low wall, lamps, a well, trees, gardens and a chicken coop along the front.
 * Its people are def('npcs', ...) with update(n, dt, rs) built on a small STEP MACHINE (walk somewhere, face
 * something, rig fields, hand targets solved with IK, held items painted from the real joints, sounds and
 * particles on cue), a GREETING layer (turn, wave, smile, a bubble, then back to work) and a TALK layer (gestures
 * while the dialog runs). Animals (Duchess the chicken, the cat) are things with Blob rigs.
 * Everything private lives in this block; TOWN.build and def('npcs', ...) are the only ways out.
 * ============================================================================= */
{
const TW = 48, TH = 40, U = 16;                                   // map size in cells, cell size in world units
const TWN_NPCS = ['harrow', 'seren', 'cobb', 'ilsa', 'pip', 'bram', 'finch'];
/* where things are (world units). The plaza's centre, the waystone on it, the forge, the stall, the tower... */
const PC = { x: 392, y: 328, r: 131 };                            // the plaza: a disc of cobbles laid in rings
const WS = { x: 392, y: 318 };                                    // the waystone (stands on its rune circle)
const MARKET = { x0: 316, y0: 142, x1: 470, y1: 230 };            // cobbles running north to the stall
const HEARTH = { x0: 112, y0: 224, x1: 144, y1: 256, h: 22 };     // the forge hearth (brick), mouth on its south face
const ANVIL = { x: 186, y: 296 }, QUENCH = { x: 150, y: 312 }, BELLOWS = { x: 158, y: 244 };
const TOWER = { x: 632, y: 88, r: 30, h: 66 };                    // Seren's round tower (drawn by hand, not TileMap)
const WELL = { x: 506, y: 392 };
const COUNTER = { x0: 352, x1: 464, y: 128 };                     // the stall counter row (cells y 8), lane behind it
/* ---------- buildings: TileMap wall blocks plus a hand-drawn pitched roof, windows, a door, a chimney ----------
 * face: which wall face has the door; ridge 'x' (gables east / west) or 'y' (gables north / south) */
const HOUSES = [
  { id: 'tavern', x0: 3, y0: 2, x1: 12, y1: 7, type: 5, roof: '#a0462e', ridge: 'x', rise: 24, chimney: [178, 58],
    door: { face: 's', at: 120, open: true }, windows: [['s', 72, 10], ['s', 168, 10], ['s', 72, 23, 1], ['s', 120, 24, 1], ['s', 168, 23, 1], ['e', 70, 12], ['e', 100, 12]] },
  { id: 'cottageA', x0: 15, y0: 2, x1: 19, y1: 6, type: 6, roof: '#4a5a80', ridge: 'x', rise: 20, chimney: [252, 50],
    door: { face: 's', at: 284 }, windows: [['s', 254, 11], ['s', 308, 11], ['e', 72, 11]] },
  { id: 'store', x0: 22, y0: 2, x1: 28, y1: 5, type: 7, roof: '#7a563a', ridge: 'x', rise: 16,
    door: { face: 's', at: 412 }, windows: [['s', 372, 12], ['s', 446, 12], ['e', 60, 12]] },
  { id: 'cottageC', x0: 31, y0: 2, x1: 34, y1: 6, type: 8, roof: '#5a6e3c', ridge: 'y', rise: 22, chimney: [516, 44],
    door: { face: 's', at: 536 }, windows: [['s', 510, 11], ['e', 60, 11], ['e', 92, 11]] },
  { id: 'smithy', x0: 1, y0: 13, x1: 6, y1: 19, type: 9, roof: '#403a48', ridge: 'y', rise: 22,
    door: { face: 'e', at: 290 }, windows: [['e', 236, 12], ['s', 40, 11], ['s', 80, 11]] },
  { id: 'cottageD', x0: 1, y0: 26, x1: 6, y1: 31, type: 6, roof: '#b0602e', ridge: 'y', rise: 22, chimney: [44, 440],
    door: { face: 'e', at: 456 }, windows: [['e', 424, 11], ['e', 490, 11], ['s', 56, 11]] }
];
/* wall materials (TileMap types): face = side pattern, roof = top pattern (hidden under the pitched roofs) */
const TYPES = {
  1: { h: 20, face: 'stone', roof: 'slab', top: '#6e6878', side: '#8a8496', line: '#4a4458', course: 7 },    // the town wall (back)
  2: { h: 12, face: 'stone', roof: 'slab', top: '#6e6878', side: '#8a8496', line: '#4a4458', course: 6 },    // the town wall (front: low)
  3: { h: 30, face: 'stone', roof: 'slab', top: '#7a7486', side: '#958ea0', line: '#4a4458', course: 7 },    // gate pillars
  4: { h: 20, face: 'plank', roof: 'plain', top: '#5a3a24', side: '#6e4a2c' },                                // the gate
  5: { h: 34, face: 'timber', roof: 'tiles', top: '#6a2e20', side: '#e2d0ac', beam: '#4a2e1e' },             // tavern: tudor
  6: { h: 30, face: 'plaster', roof: 'tiles', top: '#3a4460', side: '#d4c6ae' },                              // cottage: plaster
  7: { h: 30, face: 'plank', roof: 'tiles', top: '#5a3e2a', side: '#8e6846' },                               // the store: boards
  8: { h: 30, face: 'timber', roof: 'tiles', top: '#44522c', side: '#d8c8a4', beam: '#5a3a26' },             // cottage: tudor
  9: { h: 30, face: 'stone', roof: 'tiles', top: '#3a3440', side: '#7c7482', line: '#4a4252', course: 8 },   // the smithy
  10: { h: HEARTH.h, face: 'brick', roof: 'plain', top: '#4a3a38', side: '#9a5a46', line: '#5a2a24', course: 5 },   // the forge hearth
  11: { h: 9, face: 'plank', roof: 'plain', top: '#b8885a', side: '#9a6a40' }                                // the stall counter
};
/* ---------- the map: cells (walls) and floor kinds, built once and kept (the floor bakes once per view) ---------- */
const K = { GRASS: 0, COBBLE: 1, PATH: 2, DECK: 3, YARD: 4, RUG: 5, SOIL: 6, BASE: 7 };   // floor kinds
/** dirt paths: polylines (world units) with a width; the floor reads a distance field baked from them */
const PATHS = [
  [[392, 640], [392, 560], [396, 450]], [[300, 290], [226, 226], [150, 196], [110, 190]], [[284, 116], [292, 150], [322, 196]],
  [[536, 116], [520, 160], [462, 214]], [[478, 262], [560, 206], [636, 190]], [[264, 336], [214, 312], [170, 300]],
  [[270, 392], [190, 440], [118, 458]], [[522, 342], [612, 360], [664, 420], [668, 500]], [[470, 430], [530, 500], [572, 548]],
  [[392, 460], [300, 520], [230, 560]]
].map((p, i) => ({ p, w: [34, 28, 22, 22, 26, 30, 24, 24, 20, 20][i] }));
const RUGS = [{ x0: 596, y0: 130, x1: 676, y1: 184, c: '#7a2a4a', b: '#d8a848', m: '#2e3a74' }, { x0: 56, y0: 150, x1: 104, y1: 184, c: '#6a3a22', b: '#c89040', m: '#8a2a2a' }];
const DECK = { x0: 48, y0: 128, x1: 208, y1: 186 }, YARD = { x0: 112, y0: 212, x1: 246, y1: 350 }, SOIL = { x0: 146, y0: 522, x1: 238, y1: 590 };
let MAP = null;   // { cells, tags, blocked, kind, pathD, map, flow } built on the first visit
function buildMap() {
  const cells = new Array(TW * TH).fill(0), tags = new Array(TW * TH).fill(null), blocked = new Uint8Array(TW * TH), kind = new Uint8Array(TW * TH);
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < TW && y < TH) cells[y * TW + x] = v; };
  for (let x = 0; x < TW; x++) { set(x, 0, 1); set(x, TH - 1, 2); }
  for (let y = 0; y < TH; y++) { set(0, y, 1); set(TW - 1, y, 2); }
  set(0, TH - 1, 1); set(TW - 1, 0, 1);
  for (const x of [22, 26]) set(x, TH - 1, 3);
  for (let x = 23; x <= 25; x++) set(x, TH - 1, 4);
  for (const Hs of HOUSES) for (let y = Hs.y0; y <= Hs.y1; y++) for (let x = Hs.x0; x <= Hs.x1; x++) set(x, y, Hs.type);
  for (let y = HEARTH.y0 / U; y < HEARTH.y1 / U; y++) for (let x = HEARTH.x0 / U; x < HEARTH.x1 / U; x++) set(x, y, 10);
  for (let x = COUNTER.x0 / U; x < COUNTER.x1 / U; x++) set(x, COUNTER.y / U, 11);
  // floor kinds per cell (rects); the plaza and the paths are resolved per pixel
  const rect = (R0, k) => { for (let y = Math.floor(R0.y0 / U); y < Math.ceil(R0.y1 / U); y++) for (let x = Math.floor(R0.x0 / U); x < Math.ceil(R0.x1 / U); x++) if (x >= 0 && y >= 0 && x < TW && y < TH) kind[y * TW + x] = k; };
  rect(DECK, K.DECK); rect(YARD, K.YARD); rect(SOIL, K.SOIL); for (const R0 of RUGS) rect(R0, K.RUG);
  // the tower's footprint: blocked floor under a hand-drawn stone drum
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const d = Math.hypot((x + .5) * U - TOWER.x, (y + .5) * U - TOWER.y); if (d < TOWER.r + 6) { blocked[y * TW + x] = 1; tags[y * TW + x] = 'tower'; } if (d < TOWER.r + 14) kind[y * TW + x] = K.BASE; }
  // the path distance field (1 world unit per sample): distance to the nearest centre line minus half the width
  const MW = TW * U, MH = TH * U, pathD = new Float32Array(MW * MH).fill(99);
  for (const { p, w } of PATHS) for (let s = 0; s + 1 < p.length; s++) {
    const [ax, ay] = p[s], [bx, by] = p[s + 1], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy, m = w / 2 + 12;
    for (let y = Math.max(0, Math.floor(Math.min(ay, by) - m)); y < Math.min(MH, Math.ceil(Math.max(ay, by) + m)); y++)
      for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - m)); x < Math.min(MW, Math.ceil(Math.max(ax, bx) + m)); x++) {
        const t = clamp(((x - ax) * vx + (y - ay) * vy) / L2, 0, 1), d = Math.hypot(x - ax - vx * t, y - ay - vy * t) - w / 2, k = y * MW + x;
        if (d < pathD[k]) pathD[k] = d;
      }
  }
  const map = new E.TileMap({ w: TW, h: TH, tile: U, cells, types: TYPES, floorTex: (x, y, tag) => floorTex(x, y, tag) });
  map.floorTags = tags; map.blocked = blocked;
  MAP = { cells, tags, blocked, kind, pathD, map, MW };
  MAP.flow = new E.FlowField(map);
  return MAP;
}

/* ---------- the floor: one function per pixel, baked once per view. Crafted, not noisy: big soft patches,
 * cobbles in rings with a lit rim, dirt with pebbles and ragged grassy edges, planks, a rug, soot, soil rows ---------- */
const rgb = h => E.hex(h), mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const FC = {
  grass: ['#34603c', '#3f6e42', '#4a7c48', '#5a8c50', '#6c9c58'].map(rgb), flowers: ['#e8d070', '#d87aa0', '#eef0f4', '#a890e0'].map(rgb),
  stone: ['#7e7688', '#8a8292', '#766e80', '#948c9c', '#847a8a'].map(rgb), mortar: rgb('#443e4c'), stoneLt: rgb('#aaa2b4'), stoneSh: rgb('#5e566a'), moss: rgb('#4e6e44'),
  dirt: ['#6c5238', '#7e6044', '#8e6e4c', '#a0805a'].map(rgb), pebble: rgb('#b49a74'), pebbleSh: rgb('#5a4430'),
  plank: ['#8e5e38', '#7e5230', '#9a6a40'].map(rgb), plankLine: rgb('#3e2618'), nail: rgb('#c8b89a'),
  yard: ['#4a3e3a', '#3e3432', '#564842'].map(rgb), soot: rgb('#2a2224'), ash: rgb('#766a64'), ember: [255, 140, 60, .9],
  soil: ['#4e3628', '#3a281e', '#5e4432'].map(rgb), sprout: ['#5a8a3e', '#7aa84e'].map(rgb),
  base: ['#6a6474', '#5a5464', '#7a7484'].map(rgb), rune: [47, 127, 130, .5], runeHi: [111, 214, 204, 1], runeDim: [60, 100, 110, .25]
};
const nz = (x, y) => E.noise2(x, y), hs = (x, y) => E.hash2(x, y);
function grassAt(x, y) {
  // soft patches at two scales, then sparse blade marks and rare flower clusters (no single-pixel static)
  const n = nz(x * .045, y * .045) * .6 + nz(x * .13, y * .13) * .4, G = FC.grass;
  const row = Math.floor(y / 5), X = x + (row & 1) * 3, k = hs(Math.floor(X / 7), row), lx = X - Math.floor(X / 7) * 7, ly = y - row * 5;
  if (k < .1 && ly > 2.6 && Math.abs(lx - 3.5) < .6) return n > .5 ? G[3] : G[4];              // a lit blade
  if (k < .1 && ly > 3.4 && Math.abs(lx - 3.5) < 1.6) return G[0];                            // its shadow at the root
  const fl = nz(x * .09 + 30, y * .09 + 30);
  if (fl > .78 && k > .93 && ly > 2 && lx > 2 && lx < 5) return FC.flowers[Math.floor(hs(row, 7) * 4)];
  return n < .3 ? G[1] : n < .5 ? G[2] : n < .72 ? G[2] : G[3];
}
function cobbleAt(x, y, polar) {
  // stones laid in rings round the plaza centre (or in rows off it): a bevel lit from the upper left, mortar gaps
  let a, b, sa, sb, ka, kb, dxw, dyw;
  if (polar) {
    const dx = x - PC.x, dy = y - PC.y, d = Math.hypot(dx, dy), ring = Math.floor(d / 6.2), th = Math.atan2(dy, dx) / TAU + .5, n = Math.max(6, Math.round(TAU * (ring + .5) * 6.2 / 7.2));
    a = d / 6.2 - ring; const q = th * n + hs(ring, 3) * 3, j = Math.floor(q); b = q - j; ka = ring; kb = j % n;
    sa = 6.2; sb = TAU * (ring + .5) * 6.2 / n;
    const ux = dx / (d || 1), uy = dy / (d || 1); dxw = ux * (a - .5) * sa - uy * (b - .5) * sb; dyw = uy * (a - .5) * sa + ux * (b - .5) * sb;
  } else {
    const row = Math.floor(y / 6), q = (x + (row & 1) * 3.5 + hs(row, 9) * 7) / 7.5, j = Math.floor(q);
    a = y / 6 - row; b = q - j; ka = row; kb = j; sa = 6; sb = 7.5; dxw = (b - .5) * sb; dyw = (a - .5) * sa;
  }
  if (a < .13 || b * sb < .9) return hs(ka * 7 + kb, 11) < .12 ? FC.moss : FC.mortar;
  const lit = -(dxw + dyw) * .707, h = hs(ka * 31 + kb, ka);
  if (lit > Math.min(sa, sb) * .3) return FC.stoneLt;
  if (lit < -Math.min(sa, sb) * .33) return FC.stoneSh;
  const c = FC.stone[Math.floor(h * 5)];
  return hs(Math.floor(x * 1.7), Math.floor(y * 1.7)) < .04 ? FC.stoneSh : c;
}
function dirtAt(x, y, edge) {
  const n = nz(x * .07, y * .07) * .7 + nz(x * .21, y * .21) * .3, D = FC.dirt, pb = nz(x * .5 + 9, y * .5 + 3);
  if (pb > .82) return nz(x * .5 + 9, (y - 1) * .5 + 3) > .82 ? FC.pebbleSh : FC.pebble;
  let c = n < .3 ? D[0] : n < .55 ? D[1] : n < .78 ? D[2] : D[3];
  if (edge > -3) c = mixc(c, FC.grass[1], clamp((edge + 3) / 5, 0, .6));   // grass creeps over the verge
  // cart ruts: two soft dark lines along the path
  return c;
}
function runeAt(x, y) {
  // the waystone's rune circle: two rings, sixteen spokes, glyph dashes between them (4th value = GPU glow)
  const dx = x - WS.x, dy = y - WS.y, d = Math.hypot(dx, dy), R0 = 44;
  if (d > R0 + 1.5) return null;
  if (Math.abs(d - R0) < .9 || Math.abs(d - R0 * .78) < .7) return FC.rune;
  if (d > R0 * .78 && d < R0) { const a = (Math.atan2(dy, dx) / TAU + 1) * 16; if (a % 1 < .04) return FC.rune; if (Math.abs(d - R0 * .89) < 2 && hs(Math.floor(a * 3), Math.floor(d * .5)) > .35 && ((Math.floor(x) + Math.floor(y)) & 1)) return FC.runeHi; }
  if (Math.abs(d - R0 * .42) < .6) return FC.runeDim;
  return null;
}
function rugAt(x, y, R0) {
  const u = x - R0.x0, v = y - R0.y0, w = R0.x1 - R0.x0, h = R0.y1 - R0.y0, e = Math.min(u, v, w - u, h - v);
  const P = R0._p || (R0._p = { c: rgb(R0.c), cs: rgb(E.shade(R0.c, -.25)), b: rgb(R0.b), bs: rgb(E.shade(R0.b, -.3)), m: rgb(R0.m), f: rgb('#e8d8b0') });
  if ((u < 2.5 || w - u < 2.5) && Math.floor(v) % 2 === 0) return P.f;                          // fringe
  if (u < 2.5 || w - u < 2.5) return null;
  if (e < 3.5) return e < 1.2 ? P.bs : P.b;                                                     // border
  if (e < 5) return P.cs;
  const cu = Math.abs(u - w / 2), cv = Math.abs(v - h / 2), dm = cu / (w / 2 - 5) + cv / (h / 2 - 5);   // a diamond medallion
  if (Math.abs(dm - .62) < .06 || dm < .18) return P.b;
  if (dm < .56 && ((Math.floor(u / 3) + Math.floor(v / 3)) & 1)) return P.m;
  return (Math.floor(u) + Math.floor(v * 2)) % 7 === 0 ? P.cs : P.c;
}
function floorTex(x, y, tag) {
  const M = MAP, cx = Math.floor(x / U), cy = Math.floor(y / U), kd = M.kind[cy * TW + cx];
  if (kd === K.RUG) for (const R0 of RUGS) if (x >= R0.x0 && x < R0.x1 && y >= R0.y0 && y < R0.y1) { const c = rugAt(x, y, R0); if (c) return c; }
  if (kd === K.DECK && x >= DECK.x0 && x < DECK.x1 && y >= DECK.y0 && y < DECK.y1) {   // the tavern terrace: boards running east-west
    const row = Math.floor((y - DECK.y0) / 5.5), ly = y - DECK.y0 - row * 5.5, len = 26 + Math.floor(hs(row, 3) * 20), j = (x + row * 13) % len;
    if (ly < .9 || j < .9) return FC.plankLine;
    if (Math.abs(j - 2) < .6 && Math.abs(ly - 2.7) < .6) return FC.nail;
    return FC.plank[Math.floor(hs(Math.floor((x + row * 13) / len), row) * 3)];
  }
  if (kd === K.BASE) {   // the tower's plinth: big dressed stones in a ring
    const d = Math.hypot(x - TOWER.x, y - TOWER.y);
    if (d < TOWER.r + 12) { const ring = Math.floor((d - TOWER.r) / 6), a = Math.floor((Math.atan2(y - TOWER.y, x - TOWER.x) / TAU + .5) * (24 + ring * 4)); const f = (d - TOWER.r) / 6 - ring; return f < .15 ? FC.mortar : FC.base[Math.floor(hs(a, ring) * 3)]; }
  }
  // the plaza and the market front: cobbles (the edge wanders; stones go missing near it)
  const dx = x - PC.x, dy = y - PC.y, d = Math.hypot(dx, dy), wob = (nz(x * .05, y * .05) - .5) * 16;
  const inM = x > MARKET.x0 + wob * .5 && x < MARKET.x1 - wob * .5 && y > MARKET.y0 && y < MARKET.y1;
  if (d < PC.r + wob || inM) {
    const edge = Math.min(PC.r + wob - d, inM ? 99 : 99);
    if (!inM && edge < 5 && hs(Math.floor(x / 6), Math.floor(y / 6)) < .45 - edge * .08) return dirtAt(x, y, -9);
    const r = d < 60 ? runeAt(x, y) : null; if (r) return r;
    return cobbleAt(x, y, !inM || d < PC.r - 6);
  }
  if (kd === K.YARD) {   // the forge yard: packed dark earth, soot and ash, a cold ember or two
    const n = nz(x * .06, y * .06) * .7 + nz(x * .2, y * .2) * .3, e = Math.min(x - YARD.x0, YARD.x1 - x, y - YARD.y0, YARD.y1 - y) + (nz(x * .1, y * .1) - .5) * 14;
    if (e > 0) { if (hs(Math.floor(x), Math.floor(y)) < .004) return FC.ember; if (nz(x * .4, y * .4) > .8) return FC.ash; return n < .35 ? FC.soot : n < .65 ? FC.yard[1] : FC.yard[0]; }
  }
  if (kd === K.SOIL) {   // garden rows: furrows running east-west, sprouts on the ridges
    const f = ((y - SOIL.y0) / 7) % 1, e = Math.min(x - SOIL.x0, SOIL.x1 - x, y - SOIL.y0, SOIL.y1 - y);
    if (e > 0) { if (f > .35 && f < .55 && hs(Math.floor(x / 5), Math.floor(y / 7)) > .5 && Math.abs(x % 5 - 2.5) < 1) return FC.sprout[f < .45 ? 1 : 0]; return f < .3 ? FC.soil[1] : f > .7 ? FC.soil[2] : FC.soil[0]; }
  }
  const pd = M.pathD[Math.floor(y) * M.MW + Math.floor(x)] + (nz(x * .09, y * .09) - .5) * 7;
  if (pd < 0) return dirtAt(x, y, pd);
  return grassAt(x, y);
}

/* ---------- 3D paint helpers (world points through r.w, so they work in every view and at every zoom) ---------- */
const W3 = (r, p) => r.w(p[0], p[1], p[2]);
const quad = (r, g, pts, c) => px.poly(g, pts.map(p => W3(r, p)), c);
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const line3 = (r, g, a, b, c, w = 1) => { const A = W3(r, a), B = W3(r, b); px.line(g, A[0], A[1], B[0], B[1], c, w); };
const zw = r => Math.max(1, Math.round(r.view.zoom || 1));
/** does a face with outward ground normal (nx, ny) face the camera? (vertical faces; roofs add their tilt) */
const faces = (r, nx, ny) => nx * r.view.fx + ny * r.view.fy > .02;
/** bake a static painting into a canvas per view (like the TileMap's wall blocks): o = { pts: [[x, y, z]...], paint(g) } */
function baked(o, r) {
  const v = r.view, key = v.id + ':' + v.yawDeg + ':' + v.pitchDeg + ':' + v.scale;
  if (o._bk && o._bk.key === key) return o._bk;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of o.pts) { const q = v.p(p[0], p[1], p[2]); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  x0 = Math.floor(x0) - 4; y0 = Math.floor(y0) - 4;
  const cv = E.mkCanvas(Math.max(1, Math.ceil(x1) - x0 + 8), Math.max(1, Math.ceil(y1) - y0 + 8)), cg = E.ctx2d(cv), sx = r.ix, sy = r.iy;
  r.ix = x0; r.iy = y0; try { o.paint(cg, r); } finally { r.ix = sx; r.iy = sy; }
  return (o._bk = { key, cv, x0, y0 });
}
const drawBaked = (o, r, g) => { if (g._info) { o.paint(g, r); return; } const b = baked(o, r); g.drawImage(b.cv, b.x0 - r.ix, b.y0 - r.iy); };

/* ---------- a house: pitched roof (two planes of shingle rows, a ridge cap, eaves), gables, a chimney ---------- */
function houseParts(Hs) {
  const T0 = TYPES[Hs.type], X0 = Hs.x0 * U, X1 = (Hs.x1 + 1) * U, Y0 = Hs.y0 * U, Y1 = (Hs.y1 + 1) * U, h = T0.h, rz = h + Hs.rise, e = 5, g = 3;
  const X = Hs.ridge === 'x', half = X ? (Y1 - Y0) / 2 : (X1 - X0) / 2, zE = h - Hs.rise * e / half, m = X ? (Y0 + Y1) / 2 : (X0 + X1) / 2;
  Object.assign(Hs, { X0, X1, Y0, Y1, h, rz, m });
  // planes: [eave a, eave b, ridge b, ridge a] and the outward ground normal; gables: triangles on the end walls
  Hs.planes = X ? [{ n: [0, -1], q: [[X0 - g, Y0 - e, zE], [X1 + g, Y0 - e, zE], [X1 + g, m, rz], [X0 - g, m, rz]] }, { n: [0, 1], q: [[X0 - g, Y1 + e, zE], [X1 + g, Y1 + e, zE], [X1 + g, m, rz], [X0 - g, m, rz]] }]
    : [{ n: [-1, 0], q: [[X0 - e, Y0 - g, zE], [X0 - e, Y1 + g, zE], [m, Y1 + g, rz], [m, Y0 - g, rz]] }, { n: [1, 0], q: [[X1 + e, Y0 - g, zE], [X1 + e, Y1 + g, zE], [m, Y1 + g, rz], [m, Y0 - g, rz]] }];
  Hs.gables = X ? [{ n: [-1, 0], t: [[X0, Y1, h], [X0, Y0, h], [X0, m, rz]] }, { n: [1, 0], t: [[X1, Y0, h], [X1, Y1, h], [X1, m, rz]] }]
    : [{ n: [0, -1], t: [[X0, Y0, h], [X1, Y0, h], [m, Y0, rz]] }, { n: [0, 1], t: [[X1, Y1, h], [X0, Y1, h], [m, Y1, rz]] }];
  const ch = Hs.chimney; Hs.chim = ch ? { x: ch[0], y: ch[1], z0: h, z1: rz + 10 } : null;
  Hs.pts = Hs.planes.flatMap(p => p.q).concat(Hs.gables.flatMap(q => q.t)); if (Hs.chim) Hs.pts.push([ch[0] - 5, ch[1] - 5, rz + 13], [ch[0] + 5, ch[1] + 5, rz + 13], [ch[0], ch[1], h]);
  Hs.smoke = [];
  Hs.paint = (gg, r) => paintRoof(gg, r, Hs);
}
function paintRoof(g, r, Hs) {
  const T0 = TYPES[Hs.type], rt = E.tones(Hs.roof), v = r.view, zm = zw(r);
  const far = Hs.planes.filter(p => !faces(r, p.n[0], p.n[1])), near = Hs.planes.filter(p => faces(r, p.n[0], p.n[1]));
  const plane = (P, lit) => {
    const [A, B, C, D] = P.q, base = lit ? rt.base : rt.sh, dark = lit ? rt.sh : rt.deep, light = lit ? rt.lt : rt.base;
    quad(r, g, P.q, base);
    const len = Math.hypot(D[0] - A[0], D[1] - A[1], D[2] - A[2]), rows = Math.max(3, Math.round(len / 3.6)), span = Math.hypot(B[0] - A[0], B[1] - A[1]), cols = Math.max(2, Math.round(span / 6));
    for (let k = 0; k < rows; k++) {
      const v0 = k / rows, v1 = (k + 1) / rows, a0 = lerp3(A, D, v0), b0 = lerp3(B, C, v0), a1 = lerp3(A, D, v1), b1 = lerp3(B, C, v1);
      for (let j = 0; j < cols; j++) {   // a few shingles in each row step out lighter or darker (hand-laid, not printed)
        const hsj = hs(j * 7 + k * 13 + Hs.x0, k), u0 = (j + (k & 1) * .5) / cols, u1 = Math.min(1, u0 + 1 / cols);
        if (hsj < .16 || hsj > .9) quad(r, g, [lerp3(a0, b0, u0), lerp3(a0, b0, u1), lerp3(a1, b1, u1), lerp3(a1, b1, u0)], hsj < .16 ? dark : light);
        const jt = lerp3(a0, b0, u0), jb = lerp3(a1, b1, u0); line3(r, g, jt, lerp3(jt, jb, .75), dark);
      }
      line3(r, g, a0, b0, rt.deep, zm);                                                   // the shadow under each row's lip
      line3(r, g, lerp3(a0, a1, .25), lerp3(b0, b1, .25), light);                         // and the lit lip itself
    }
    line3(r, g, A, B, rt.deep, zm + 1);                                                   // eave edge
    for (const [p0, p1] of [[A, D], [B, C]]) line3(r, g, p0, p1, lit ? rt.lt : rt.base, zm);   // verge boards
  };
  const gable = G => {   // the end wall under the roof: the house's own material, beams on timber houses, an attic light
    const wt = E.tones(T0.side), bt = E.tones(T0.beam || '#4a3222'), [A, B, C] = G.t, lit = G.n[0] + G.n[1] > 0;
    quad(r, g, G.t, lit ? wt.base : wt.sh);
    if (T0.face === 'timber') { line3(r, g, A, B, bt.sh, zm + 1); line3(r, g, lerp3(A, B, .5), C, bt.sh, zm + 1); line3(r, g, lerp3(A, B, .15), lerp3(lerp3(A, B, .5), C, .55), bt.base, zm); line3(r, g, lerp3(A, B, .85), lerp3(lerp3(A, B, .5), C, .55), bt.base, zm); }
    else if (T0.face === 'plank') { for (let k = 1; k < 8; k++) { const u = k / 8; line3(r, g, lerp3(A, B, u), lerp3(lerp3(A, B, u), C, Math.min(u, 1 - u) * 2), wt.sh); } }
    else if (T0.face === 'stone') { for (let k = 1; k < 4; k++) { const u = k / 4; line3(r, g, lerp3(A, C, u), lerp3(B, C, u), wt.sh); } }
    line3(r, g, A, B, wt.deep);
  };
  for (const P of far) plane(P, false);
  for (const G of Hs.gables) if (faces(r, G.n[0], G.n[1])) gable(G);
  for (const P of near) plane(P, true);
  // ridge cap: a rounded row of lighter tiles along the top
  const RA = Hs.planes[0].q[3], RB = Hs.planes[0].q[2]; line3(r, g, [RA[0], RA[1], RA[2] + 1], [RB[0], RB[1], RB[2] + 1], rt.base, zm + 2); line3(r, g, [RA[0], RA[1], RA[2] + 2], [RB[0], RB[1], RB[2] + 2], rt.hi, zm);
  // the chimney: brick stack, a stone cap, the dark flue
  const c = Hs.chim; if (c) {
    r.box(g, c.x - 4, c.y - 4, c.z0, c.x + 4, c.y + 4, c.z1, '#6a3a34', '#9a5646');
    for (let z = c.z1 - 3; z > Hs.rz - 12; z -= 3) { const s = (z / 3) & 1 ? 1.5 : -1.5; line3(r, g, [c.x - 4, c.y + 4.1, z], [c.x + 4, c.y + 4.1, z], '#6a3430'); line3(r, g, [c.x + s, c.y + 4.1, z], [c.x + s, c.y + 4.1, z + 3], '#6a3430'); }
    r.box(g, c.x - 5, c.y - 5, c.z1, c.x + 5, c.y + 5, c.z1 + 2.5, '#9a94a4', '#6a6474'); r.box(g, c.x - 2.5, c.y - 2.5, c.z1 + 2.5, c.x + 2.5, c.y + 2.5, c.z1 + 2.8, '#1a1016', '#1a1016');
  }
}
/** chimney smoke: soft lilac puffs that swell, drift with the evening breeze and fade, drawn right after the roof */
function stepSmoke(Hs, dt, rate = 1) {
  const c = Hs.chim; if (!c) return; const S = Hs.smoke;
  if (Math.random() < dt * 3.2 * rate && S.length < 18) S.push({ x: c.x, y: c.y, z: c.z1 + 3, t: 0, max: 2.6 + Math.random() * 1.4, s: 1.6 + Math.random() * .8, vx: 5 + Math.random() * 3, vy: -3 - Math.random() * 2, k: Math.random() });
  for (let i = S.length - 1; i >= 0; i--) { const p = S[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += (11 - p.t * 2) * dt; p.vx += dt * 2; if (p.t > p.max) S.splice(i, 1); }
}
function drawSmoke(g, r, S, dark = '#5a5068', mid = '#8a8098', hi = '#b4aac0') {
  const zm = r.view.zoom || 1, s = r.view.scale;
  for (const p of S) {
    const u = p.t / p.max, [x, y] = r.w(p.x, p.y, p.z), R = (p.s + u * 4.5) * s * .8, a = u < .12 ? u / .12 : 1 - (u - .12) / .88;
    px.blend(g, a * .75, 'normal', () => { px.disc(g, x, y, R, dark); px.disc(g, x - R * .2, y - R * .25, R * .75, mid); px.disc(g, x - R * .38, y - R * .45, R * .36, hi); });
    void zm;
  }
}

/* ---------- windows and doors, painted on the wall planes ---------- */
/** a point on a house face: face 's' | 'e' | 'n' | 'w', u = world x (s / n) or y (e / w), z; out = offset off the wall */
function onFace(Hs, f, u, z, out = .3) { return f === 's' ? [u, Hs.Y1 + out, z] : f === 'n' ? [u, Hs.Y0 - out, z] : f === 'e' ? [Hs.X1 + out, u, z] : [Hs.X0 - out, u, z]; }
const FN = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] };
/** corners of a rectangle on a face: du along the face, z0..z1 */
function faceRect(Hs, f, u, du, z0, z1, out) { return [onFace(Hs, f, u - du, z0, out), onFace(Hs, f, u + du, z0, out), onFace(Hs, f, u + du, z1, out), onFace(Hs, f, u - du, z1, out)]; }
function drawWindow(r, Hs, W0, t) {
  const [f, u, z0, small] = W0, n = FN[f]; if (!faces(r, n[0], n[1])) return;
  const hw = small ? 3.5 : 4.5, hh = small ? 7 : 9, T0 = TYPES[Hs.type], p = onFace(Hs, f, u, z0 + hh / 2, 1);
  if (!r.visible(p[0], p[1], p[2], 30, 30, 30)) return;
  const shut = E.tones(Hs.shutter || (Hs.type === 6 ? '#3a5a7a' : Hs.type === 9 ? '#4a3a30' : '#5a7a3a'));
  r.queue(p[0], p[1], 0, g => {   // frame, shutters and sill (lit by the scene)
    const bt = E.tones(T0.beam || '#4a3222');
    quad(r, g, faceRect(Hs, f, u, hw + 1.2, z0 - 1.2, z0 + hh + 1.2, .4), bt.sh);
    if (!small) for (const s of [-1, 1]) { quad(r, g, faceRect(Hs, f, u + s * (hw + 3.4), 2.1, z0 - .4, z0 + hh + .4, .5), shut.base); line3(r, g, onFace(Hs, f, u + s * (hw + 3.4), z0 + 1, .6), onFace(Hs, f, u + s * (hw + 3.4), z0 + hh - 1, .6), shut.sh); }
    quad(r, g, faceRect(Hs, f, u, hw + 2, z0 - 2.2, z0 - 1, .8), bt.lt);
    if (!small && Hs.flowers) for (let k = -2; k <= 2; k++) { const q = W3(r, onFace(Hs, f, u + k * 2, z0 - .2, 1.6)); px.dot(g, q[0], q[1] - 1, k & 1 ? '#e87aa0' : '#f0d060'); px.dot(g, q[0], q[1], '#4a7a3a'); }
  }, { bias: .002 });
  r.queue(p[0], p[1], 0, g => {   // the glass: warm light from inside (emissive: dusk never dims it), mullions, a flicker
    const fl = .5 + .5 * Math.sin(t * 3.1 + u * .7) * Math.sin(t * 1.7 + z0);
    quad(r, g, faceRect(Hs, f, u, hw, z0, z0 + hh, .5), fl > .7 ? '#ffd88a' : '#f8c46a');
    quad(r, g, faceRect(Hs, f, u, hw * .55, z0 + hh * .2, z0 + hh * .8, .55), '#fff0c0');
    quad(r, g, faceRect(Hs, f, u, hw, z0, z0 + hh * .18, .56), '#e0963e');
    const bt = E.tones(T0.beam || '#4a3222').deep;
    line3(r, g, onFace(Hs, f, u, z0, .6), onFace(Hs, f, u, z0 + hh, .6), bt); line3(r, g, onFace(Hs, f, u - hw, z0 + hh * .55, .6), onFace(Hs, f, u + hw, z0 + hh * .55, .6), bt);
  }, { bias: .003, emissive: true });
  const lp = onFace(Hs, f, u, 6, 12); L.add(lp[0], lp[1], 6, small ? 26 : 40, .35 + .1 * Math.sin(t * 3.1 + u), { color: '#ffb866' });
}
function drawDoor(r, Hs, t) {
  const D = Hs.door, f = D.face, n = FN[f]; if (!faces(r, n[0], n[1])) return;
  const u = D.at, p = onFace(Hs, f, u, 10, 1); if (!r.visible(p[0], p[1], p[2], 40, 40, 40)) return;
  const wood = E.tones(Hs.doorColor || '#6a4226'), hw = 5.5, top = 19;
  r.queue(p[0], p[1], 0, g => {
    quad(r, g, faceRect(Hs, f, u, hw + 1.6, 0, top + 1.6, .3), '#3a2a24');   // stone surround
    line3(r, g, onFace(Hs, f, u - hw - 1.6, top + 1.6, .4), onFace(Hs, f, u + hw + 1.6, top + 1.6, .4), '#8a8290', zw(r));
    if (D.open) {   // an open doorway: warm light inside, the leaf swung in against the jamb
      quad(r, g, faceRect(Hs, f, u, hw, 0, top, .35), '#2a140c');
      const [a, b] = [onFace(Hs, f, u + hw, 0, .4), onFace(Hs, f, u + hw, top, .4)], q = n[0] ? [0, -1] : [-1, 0];
      quad(r, g, [a, [a[0] - q[0] * 0 - n[0] * 7, a[1] - n[1] * 7, 0], [b[0] - n[0] * 7, b[1] - n[1] * 7, top], b], wood.sh);
    } else {
      quad(r, g, faceRect(Hs, f, u, hw, 0, top, .35), wood.base);
      for (let k = -1; k <= 1; k++) line3(r, g, onFace(Hs, f, u + k * 2.8, .5, .45), onFace(Hs, f, u + k * 2.8, top - .5, .45), wood.sh);
      for (const z of [4, top - 4]) line3(r, g, onFace(Hs, f, u - hw, z, .5), onFace(Hs, f, u + hw, z, .5), '#3a3440');
      const k = W3(r, onFace(Hs, f, u + hw - 2, 9, .6)); px.dot(g, k[0], k[1], '#e8c860');
    }
    quad(r, g, faceRect(Hs, f, u, hw + 2.5, 0, .9, 2.5), '#8a8494');   // the step
  }, { bias: .002 });
  if (D.open) {
    r.queue(p[0], p[1], 0, g => { quad(r, g, faceRect(Hs, f, u - 1.5, hw - 1.5, 1, top - 3, .5), '#c8702e'); quad(r, g, faceRect(Hs, f, u - 1.5, hw - 3, 2, top - 6, .55), '#f0a850'); }, { bias: .003, emissive: true });
    const lp = onFace(Hs, f, u, 4, 16); L.add(lp[0], lp[1], 4, 62, .7 + .12 * Math.sin(t * 5.3) * Math.sin(t * 2.1), { color: '#ff9a4a' });
  }
}

/* =============================================================================
 * BUILD: TOWN.build() returns Emberhold (the map is built once; things and people fresh on every visit)
 * ============================================================================= */
function buildTown() {
  const M = MAP || buildMap();
  const Lv = { kind: 'town', name: 'Emberhold', depth: 0, w: TW, h: TH, cells: M.cells, tags: M.tags, map: M.map, flow: M.flow, things: [], props: [], torches: [], npcs: [], mechs: [], hue: 0, t: 0,
    runes: [{ x: WS.x, y: WS.y, r: 44 }], rooms: [{ x: 17, y: 13, w: 15, h: 15, cx: 24.5, cy: 20.5 }, { x: 34, y: 13, w: 10, h: 12, cx: 39, cy: 19 }, { x: 16, y: 29, w: 18, h: 7, cx: 25, cy: 32 }],
    seen: new Uint8Array(TW * TH).fill(1), ambient: .36, music: 'town',
    sky: ['#140f2c', '#241a44', '#3e2656', '#6a3458', '#a4505a', '#d8805c'] };
  Lv.waystone = { x: WS.x, y: WS.y }; Lv.portalSpot = { x: WS.x + 46, y: WS.y + 30 }; Lv.start = { x: WS.x, y: WS.y + 36 };
  Lv.randomFloor = (R, o) => randomFloor(Lv, R, o);
  for (const Hs of HOUSES) { if (!Hs.planes) houseParts(Hs); Hs.smoke.length = 0; addThing(Lv, houseThing(Hs)); }
  return Lv;
}
function houseThing(Hs) {
  return { kind: 'house', x: (Hs.X0 + Hs.X1) / 2, y: (Hs.Y0 + Hs.Y1) / 2, r: 0, keep: true,
    update(dt) { stepSmoke(Hs, dt); },
    draw(r) {
      const v = r.view, t = game.time;
      if (!r.visible(this.x, this.y, 0, 260, 260, 200)) return;
      let fx = Hs.X0 - 5, fy = Hs.Y0 - 5, best = -1e9; for (const [x, y] of [[Hs.X0 - 5, Hs.Y0 - 5], [Hs.X1 + 5, Hs.Y0 - 5], [Hs.X0 - 5, Hs.Y1 + 5], [Hs.X1 + 5, Hs.Y1 + 5]]) { const k = v.fx * x + v.fy * y; if (k > best) { best = k; fx = x; fy = y; } }
      r.queue(fx, fy, 0, g => { drawBaked(Hs, r, g); drawSmoke(g, r, Hs.smoke); }, { bias: .01 });
      for (const W0 of Hs.windows) drawWindow(r, Hs, W0, t);
      if (Hs.door) drawDoor(r, Hs, t);
    } };
}
TOWN.build = buildTown;
}
