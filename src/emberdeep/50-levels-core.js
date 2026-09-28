/* =============================================================================
 * LEVELS: recipes (what a depth is made of), layouts, themes, and building a level from a recipe
 * A LAYOUT is def('layouts', id, { name, gen(R, o) -> { w, h, cells, tags, rooms: [{ x, y, w, h, cx, cy }], start: [cx, cy], exit: [cx, cy] } })
 *   cells: 0 floor, 1 outer wall, 2 pillar, 3 low wall, 4+ theme extras. tags: per-cell floor tag or null ('pit', 'water', 'ice'...).
 * A THEME is def('themes', id, { name, nouns: ['Vaults'], pal, floor(L, x, y, tag) -> [r, g, b(, glow)], walls: { 1: {...}, 2, 3 },
 *   torch: 'brazier' | prop name, light: '#ff9a4a', ambient, decorate(L, R), ambience(L, dt), sky: [..] | null, music, pool: [archetype ids] })
 * A RECIPE is { depth, seed, name, theme, hue, layout, mechs: [ids], newMech, boss, pool, size }.
 * ============================================================================= */
const T16 = 16;
/* the planned descent: one new element per depth, a boss every fifth. Past the plan, recipes compose themselves */
const PLAN = [
  null,
  { mech: 'powder', theme: 'crypt', layout: 'halls' },
  { mech: 'wards', theme: 'crypt', layout: 'halls' },
  { mech: 'chasm', theme: 'ruins', layout: 'islands' },
  { mech: 'gale', theme: 'ruins', layout: 'halls' },
  { mech: 'magma', theme: 'forge', layout: 'arena', boss: 'cinderking' },
  { mech: 'ice', theme: 'frost', layout: 'caves' },
  { mech: 'brood', theme: 'fungal', layout: 'caves' },
  { mech: 'pylons', theme: 'mine', layout: 'halls' },
  { mech: 'timewell', theme: 'clockwork', layout: 'halls' },
  { mech: 'webs', theme: 'fungal', layout: 'arena', boss: 'broodmother' },
  { mech: 'dark', theme: 'abyss', layout: 'caves' },
  { mech: 'bloodrush', theme: 'ossuary', layout: 'halls' },
  { mech: 'launch', theme: 'sky', layout: 'islands' },
  { mech: 'flood', theme: 'aqueduct', layout: 'halls' },
  { mech: 'quake', theme: 'cavern', layout: 'arena', boss: 'wyrm' }
];
const PLANNED = PLAN.length - 1;
/** the recipe for a depth. visit changes the seed so a depth plays differently each time you go down it */
function recipe(depth, visit = 0) {
  const R = RNG('emberdeep:' + depth + ':' + visit);
  const has = (k, id) => id && REG[k][id];
  const p = PLAN[depth];
  const rec = { depth, seed: R.int(1, 2e9), R, hue: 0, size: [52, 52] };
  if (p) {
    rec.theme = has('themes', p.theme) ? p.theme : 'crypt';
    rec.layout = has('layouts', p.layout) ? p.layout : 'halls';
    rec.newMech = has('mechanics', p.mech) ? p.mech : null;
    rec.mechs = rec.newMech ? [rec.newMech] : [];
    rec.boss = p.boss && REG.bosses[p.boss] ? p.boss : null;
  } else {
    // composed depths: a known theme (recolored further the deeper you go), one mechanic new to this combination
    // plus one or two from before, and a composed boss every fifth depth
    const themes = Object.keys(REG.themes), mechs = Object.keys(REG.mechanics).filter(id => !REG.mechanics[id].bossOnly);
    rec.theme = R.pick(themes); rec.layout = R.pick(Object.keys(REG.layouts).filter(id => !REG.layouts[id].bossOnly));
    rec.hue = ((depth - PLANNED) * 37 + R.int(-20, 20)) % 360;
    const n = depth > 40 ? 3 : 2, pick = R.shuffle(mechs.slice()).slice(0, n);
    rec.mechs = pick; rec.newMech = pick[0];
    if (depth % 5 === 0) { rec.boss = composeBoss(depth, R); rec.layout = REG.layouts.arena ? 'arena' : rec.layout; }
  }
  rec.pool = levelPool(rec.theme, depth);
  rec.name = levelName(rec, R);
  return rec;
}
/** the monsters of a level: archetypes that live in its theme (arch.themes) or anywhere (no themes), deep enough.
 *  Past the planned depths every archetype may turn up anywhere */
function levelPool(theme, depth) {
  const all = Object.values(REG.archetypes).filter(a => !a.noPack && (a.minDepth || 1) <= depth + 1);
  let pool = all.filter(a => !a.themes || a.themes.includes(theme) || depth > PLANNED);
  const th = REG.themes[theme]; if (th && th.pool) pool = pool.concat(th.pool.map(id => REG.archetypes[id]).filter(a => a && !pool.includes(a)));
  const ids = pool.map(a => a.id);
  return ids.length ? ids : ['husk', 'skeleton', 'slime'];
}
function levelName(rec, R) {
  if (rec.boss && REG.bosses[rec.boss] && REG.bosses[rec.boss].levelName) return REG.bosses[rec.boss].levelName;
  const ms = rec.mechs.map(id => REG.mechanics[id]).filter(Boolean);
  if (!ms.length) return 'The ' + ((REG.themes[rec.theme] && R.pick(REG.themes[rec.theme].nouns || ['Deep'])) || 'Deep');
  if (rec.depth <= PLANNED && ms[0].title) return ms[0].title;
  if (ms.length === 1) return 'The ' + ms[0].adj + ' ' + ms[0].noun;
  if (ms.length === 2) return 'The ' + ms[1].adj + ' ' + ms[0].noun;
  return 'The ' + ms[2].adj + ', ' + ms[1].adj + ' ' + ms[0].noun;
}

/* ---------- the classic layout: rooms joined by wide corridors ---------- */
def('layouts', 'halls', { name: 'Halls', gen(R, o) {
  const w = o.w || 52, h = o.h || 52, cells = new Array(w * h).fill(1), tags = new Array(w * h).fill(null), rooms = [];
  const carve = (x, y, rw, rh) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (i > 0 && j > 0 && i < w - 1 && j < h - 1) cells[j * w + i] = 0; };
  for (let tries = 0; tries < 400 && rooms.length < (o.rooms || 11); tries++) {
    const rw = R.int(7, 13), rh = R.int(7, 12), x = R.int(2, w - rw - 2), y = R.int(2, h - rh - 2);
    if (rooms.some(r0 => x < r0.x + r0.w + 2 && x + rw + 2 > r0.x && y < r0.y + r0.h + 2 && y + rh + 2 > r0.y)) continue;
    rooms.push({ x, y, w: rw, h: rh, cx: x + rw / 2, cy: y + rh / 2 }); carve(x, y, rw, rh);
  }
  // corridors: each room to its nearest joined neighbour (a spanning tree), plus a couple of loops
  const joined = [rooms[0]], rest = rooms.slice(1), corr = (a, b) => {
    let x = Math.floor(a.cx), y = Math.floor(a.cy); const tx = Math.floor(b.cx), ty = Math.floor(b.cy), hor = R.chance(.5);
    const step = (dx, dy) => { carve(x - 1, y - 1, 3, 3); x += dx; y += dy; };
    if (hor) { while (x !== tx) step(Math.sign(tx - x), 0); while (y !== ty) step(0, Math.sign(ty - y)); }
    else { while (y !== ty) step(0, Math.sign(ty - y)); while (x !== tx) step(Math.sign(tx - x), 0); }
    carve(x - 1, y - 1, 3, 3);
  };
  while (rest.length) {
    let bi = 0, bj = 0, bd = 1e9;
    rest.forEach((r0, i) => joined.forEach((q, j) => { const d = Math.hypot(r0.cx - q.cx, r0.cy - q.cy); if (d < bd) { bd = d; bi = i; bj = j; } }));
    corr(rest[bi], joined[bj]); joined.push(rest.splice(bi, 1)[0]);
  }
  for (let k = 0; k < 2 && rooms.length > 4; k++) corr(R.pick(rooms), R.pick(rooms));
  // pillars in the big rooms, the odd low wall
  for (const r0 of rooms) {
    if (r0.w >= 11 && r0.h >= 10 && R.chance(.6)) for (const [dx, dy] of [[2, 2], [r0.w - 3, 2], [2, r0.h - 3], [r0.w - 3, r0.h - 3]]) cells[(r0.y + dy) * w + r0.x + dx] = 2;
    else if (R.chance(.35)) { const hz = R.chance(.5), lx = r0.x + R.int(2, r0.w - 5), ly = r0.y + R.int(2, r0.h - 4); for (let k = 0; k < 3; k++) cells[(ly + (hz ? 0 : k)) * w + lx + (hz ? k : 0)] = 3; }
  }
  const far = farthestRoom(cells, w, h, rooms, 0);
  return { w, h, cells, tags, rooms, start: [Math.floor(rooms[0].cx), Math.floor(rooms[0].cy)], exit: [Math.floor(far.cx), Math.floor(far.cy)], exitRoom: far };
} });
/** the room farthest (by walking) from room i: the exit goes there */
function farthestRoom(cells, w, h, rooms, i) {
  const d = new Int32Array(w * h).fill(-1), q = [], s = Math.floor(rooms[i].cy) * w + Math.floor(rooms[i].cx); d[s] = 0; q.push(s);
  for (let k = 0; k < q.length; k++) { const c = q[k], x = c % w, y = (c / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (y + dy) * w + x + dx; if (x + dx < 0 || y + dy < 0 || x + dx >= w || y + dy >= h || d[n] >= 0 || cells[n] === 1 || cells[n] === 2) continue; d[n] = d[c] + 1; q.push(n); } }
  let best = rooms[rooms.length - 1], bd = -1;
  for (const r0 of rooms) { const v = d[Math.floor(r0.cy) * w + Math.floor(r0.cx)]; if (v > bd) { bd = v; best = r0; } }
  return best;
}

/* ---------- the stress test's rune hall as a theme: flagstones, teal runes, moss at the edges ---------- */
const CRYPT = { stones: ['#4b4559', '#554f64', '#433e51', '#5d566c'], mortar: '#221e2b', hi: '#6f6782', lo: '#322d3e', speck: '#3e384b', moss: ['#3f5a44', '#4d6b4b'], rune: '#2f7f82', runeHi: '#6fd6cc' };
def('themes', 'crypt', { name: 'Crypt', nouns: ['Vaults', 'Crypts', 'Halls', 'Catacombs'], pal: CRYPT, torch: 'brazier', light: '#ff9a4a', ambient: .12, music: 'deep',
  walls: { 1: { h: 38, cut: true, cutH: 6, top: '#57506a', side: '#3d3750', line: '#2a2538', course: 8 }, 2: { h: 36, top: '#6a6280', side: '#4a4360', line: '#302a40', course: 10 }, 3: { h: 12, top: '#5d566f', side: '#433d55', line: '#2e2940', course: 6 } },
  floor: (L0, x, y, tag) => cryptFloor(L0, x, y, tag, L0.pal),
  decorate(L0, R) { for (const r0 of L0.rooms) { if (R.chance(.5)) L0.props.push({ name: R.pick(['bones', 'skull', 'crate', 'pot', 'barrel']), x: (r0.x + 1 + R() * (r0.w - 2)) * T16, y: (r0.y + 1 + R() * (r0.h - 2)) * T16 }); if (R.chance(.35)) L0.props.push({ name: 'cobweb', x: (r0.x + .5) * T16, y: (r0.y + .5) * T16, o: { size: 1.2 } }); } }
});
/* ---------- standard floor tags: every theme renders them, the core applies their effects ----------
 * pit (nothing: the void shows; blocked for walkers), water (shallow: slows), deep (deep water: blocked), ice (no
 * traction), lava (burns), web (slows, fire clears it), blood, snow. A theme's floor() calls standardFloor first:
 *   const s = standardFloor(L, x, y, tag, base); if (s !== undefined) return s;   // base(x, y) = the theme's own floor */
const STD_TAGS = ['pit', 'water', 'deep', 'ice', 'lava', 'web', 'blood', 'snow'];
function standardFloor(L0, x, y, tag, base) {
  if (!tag || !STD_TAGS.includes(tag)) return undefined;
  if (tag === 'pit') {   // the edge of a chasm: a lip of darker stone, then nothing
    const cx = Math.floor(x / T16), cy = Math.floor(y / T16), lx = x - cx * T16, ly = y - cy * T16, m = L0.map, tg = (a, b) => m && m.floorTags ? m.floorTags[b * L0.w + a] : null;
    const lip = (tg(cx, cy - 1) !== 'pit' && ly < 3) || (tg(cx - 1, cy) !== 'pit' && lx < 3);
    if (lip && m && m.cell(cx, cy - (ly < 3 ? 1 : 0)) === 0) { const b = base(x, y); return b ? b.map((v, i) => i < 3 ? v * (.45 + (ly < 3 ? ly : lx) * .08) : v) : null; }
    return null;
  }
  const hs = E.hash2(Math.floor(x), Math.floor(y)), n = E.noise2(x * .06, y * .06);
  if (tag === 'water' || tag === 'deep') {
    const deep = tag === 'deep', w = Math.sin(x * .3 + Math.sin(y * .15) * 2 + y * .04);
    const c = deep ? (n > .5 ? [26, 58, 110] : [20, 46, 92]) : (n > .5 ? [52, 110, 160] : [42, 92, 140]);
    if (w > .94) return deep ? [70, 120, 180] : [150, 205, 235];
    if (!deep) { const b = base(x, y); if (b && hs < .06) return b.map((v, i) => i < 3 ? v * .6 + c[i] * .4 : v); }
    return c;
  }
  if (tag === 'ice') {
    const crack = Math.abs(E.noise2(x * .08, y * .08) - .5) < .02 || Math.abs(E.noise2(x * .05 + 9, y * .05) - .5) < .012;
    if (crack) return [150, 190, 220];
    const streak = ((x + y * .6) % 23 + 23) % 23 < 1.2 && n > .45;
    return streak ? [236, 250, 255] : n > .55 ? [196, 228, 246] : [176, 214, 238];
  }
  if (tag === 'lava') {
    const crust = E.noise2(x * .09, y * .09) * .7 + E.noise2(x * .3, y * .3) * .3;
    if (crust > .62) return crust > .72 ? [58, 30, 26] : [96, 40, 26];
    return crust > .5 ? [220, 90, 30, .8] : crust > .35 ? [255, 150, 50, 1] : [255, 214, 110, 1];
  }
  const b = base(x, y) || [40, 36, 48];
  if (tag === 'web') {
    const u = x / T16, v = y / T16, fu = u - Math.floor(u), fv = v - Math.floor(v), ring = Math.hypot(fu - .5, fv - .5);
    const strand = Math.abs(fu - fv) < .03 || Math.abs(fu + fv - 1) < .03 || Math.abs(fu - .5) < .025 || Math.abs(fv - .5) < .025 || Math.abs(ring - .3) < .02 || Math.abs(ring - .45) < .02;
    return strand ? [230, 230, 236] : b.map((v2, i) => i < 3 ? v2 * .8 + 30 : v2);
  }
  if (tag === 'blood') return n > .45 ? (hs < .1 ? [150, 40, 50] : [110, 20, 30]) : b.map((v2, i) => i < 3 ? v2 * .7 + (i === 0 ? 30 : 0) : v2);
  if (tag === 'snow') return hs < .04 ? [200, 214, 236] : n > .6 ? [236, 242, 250] : [220, 230, 244];
  return undefined;
}
/** what standing on a tag does (hero and monsters alike): the core rules every theme and mechanic share */
function floorEffects(u, dt) {
  const m = ED.L && ED.L.map; if (!m || !m.floorTags || u.canFly || (u.z || 0) > 2) return;
  const tag = m.floorAt(u.x, u.y); if (!tag) return;
  if (tag === 'water') { u.speedK = (u.speedK === undefined ? 1 : u.speedK) * .78; if (Math.random() < dt * Math.hypot(u.vx || 0, u.vy || 0) * .08) P.ring(u.x, u.y, 2, 9, '#bfe8ff', .3); }
  else if (tag === 'ice') u.traction = Math.min(u.traction === undefined ? 1 : u.traction, .12);
  else if (tag === 'web') u.speedK = (u.speedK === undefined ? 1 : u.speedK) * .45;
  else if (tag === 'lava' && !(u.res && u.res.fire >= .75)) { u.lavaT = (u.lavaT || 0) - dt; if (u.lavaT <= 0) { u.lavaT = .5; dealDamage(u, { src: null, amount: (u.team === 'hero' ? u.maxHp * .06 : u.maxHp * .08) + 2, el: 'fire', kb: 0, statusChance: 1, noNumber: u.team !== 'hero', tags: ['floor'] }); } }
}
/** flagstones with rune circles around every rune point (L.runes), moss creeping in from the walls */
function cryptFloor(L0, x, y, tag, pal) {
  const P0 = L0._pal || (L0._pal = { stones: pal.stones.map(E.hex), mortar: E.hex(pal.mortar), hi: E.hex(pal.hi), lo: E.hex(pal.lo), speck: E.hex(pal.speck), moss: pal.moss.map(E.hex), rune: [...E.hex(pal.rune), .45], runeHi: [...E.hex(pal.runeHi), 1] });
  if (tag) { const sf = standardFloor(L0, x, y, tag, (a, b) => cryptFloor(L0, a, b, null, pal)); if (sf !== undefined) return sf; }
  for (const rc of L0.runes || []) {
    const dx = x - rc.x, dy = y - rc.y, d = Math.hypot(dx, dy), R0 = rc.r;
    if (d > R0 + 2) continue;
    if (Math.abs(d - R0) < .8 || Math.abs(d - R0 * .8) < .6) return P0.rune;
    if (d > R0 * .8 && d < R0) { const a = (Math.atan2(dy, dx) / TAU + 1) * 16; if (a % 1 < .05) return P0.rune; if (Math.abs(d - R0 * .9) < 2 && E.hash2(Math.floor(a), Math.floor(d * .5)) > .35 && ((Math.floor(x) + Math.floor(y)) & 1)) return P0.runeHi; }
    if (d < R0 * .13) return d < R0 * .055 ? P0.runeHi : E.tex.flagstone(x, y, P0);
  }
  let c = E.tex.flagstone(x, y, P0);
  const cx = Math.floor(x / T16), cy = Math.floor(y / T16), m = L0.map;
  let wall = 0; if (m) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (m.cell(cx + ox, cy + oy) === 1) wall = 1;
  if (wall && E.noise2(x * .13, y * .13) > .55) c = P0.moss[E.hash2(x | 0, y | 0) < .5 ? 0 : 1];
  return c;
}

/* ---------- building a level from a recipe ---------- */
function buildLevel(rec) {
  const R = RNG(rec.seed), th = REG.themes[rec.theme] || REG.themes.crypt, lay = REG.layouts[rec.layout] || REG.layouts.halls;
  const G0 = lay.gen(R, { w: rec.size[0], h: rec.size[1], depth: rec.depth });
  const L0 = { kind: 'level', rec, depth: rec.depth, name: rec.name, theme: th, hue: rec.hue || 0, w: G0.w, h: G0.h, cells: G0.cells, tags: G0.tags, rooms: G0.rooms,
    things: [], props: [], torches: [], runes: [], mechs: rec.mechs.slice(), seen: new Uint8Array(G0.w * G0.h), t: 0 };
  L0.pal = shiftPal(th.pal || CRYPT, L0.hue);
  // walls: the theme's types, recolored for deep levels; the exit gets a rune circle
  const types = {}; for (const k in th.walls) types[k] = shiftPal(th.walls[k], L0.hue);
  const [sx, sy] = G0.start, [ex, ey] = G0.exit;
  L0.start = { x: (sx + .5) * T16, y: (sy + .5) * T16 }; L0.exit = { x: (ex + .5) * T16, y: (ey + .5) * T16, open: !rec.boss };
  L0.runes.push({ x: L0.start.x, y: L0.start.y, r: 30 }, { x: L0.exit.x, y: L0.exit.y, r: 26 });
  const floorTag = G0.tags.slice();
  L0.map = new E.TileMap({ w: G0.w, h: G0.h, tile: T16, cells: G0.cells, types, floorTex: (x, y, tag) => th.floor(L0, x, y, tag) });
  L0.map.floorTags = floorTag; L0.map.blocked = new Uint8Array(G0.w * G0.h);
  L0.map.floorTags.forEach((t, i) => { if (t === 'pit' || t === 'deep') L0.map.blocked[i] = 1; });
  deepCutaway(L0.map);
  L0.flow = new E.FlowField(L0.map);
  L0.randomFloor = (Rr, o = {}) => randomFloor(L0, Rr, o);
  // light sources along the rooms (braziers stand in the room, sconces on walls)
  for (const r0 of G0.rooms) {
    const n = Math.max(1, Math.round((r0.w * r0.h) / 60 * (th.lights || 1)));
    for (let i = 0; i < n; i++) { const x = (r0.x + 1.5 + R() * (r0.w - 3)) * T16, y = (r0.y + 1.5 + R() * (r0.h - 3)) * T16; if (L0.map.walkable(Math.floor(x / T16), Math.floor(y / T16)) && Math.hypot(x - L0.start.x, y - L0.start.y) > 40) L0.torches.push({ x, y, t: R() * 9, kind: th.torch || 'brazier', color: th.light || '#ff9a4a', r: 4.5, solid: true }); }
  }
  if (th.decorate) th.decorate(L0, R);
  // the mechanics place their things (a missing mechanic is skipped: the level still plays)
  for (const id of L0.mechs) { const M = REG.mechanics[id]; if (M && M.place) M.place(L0, R); }
  // monsters: packs in every room but the first, a rare pack guarding the exit room, champions here and there
  const depth = rec.depth, rooms = G0.rooms.slice(1);
  L0.packs = [];
  for (const r0 of rooms) {
    const area = r0.w * r0.h, packs = Math.max(1, Math.round(area / 55 * DIFF.density * (1 + depth * .02)));
    for (let k = 0; k < packs; k++) L0.packs.push({ x: (r0.x + 1 + R() * (r0.w - 2)) * T16, y: (r0.y + 1 + R() * (r0.h - 2)) * T16, elite: 0 });
  }
  R.shuffle(L0.packs);
  for (let i = 0; i < Math.min(L0.packs.length, 1 + Math.floor(depth / 4)); i++) L0.packs[i].elite = 1;
  if (!rec.boss) L0.packs.push({ x: L0.exit.x + 20, y: L0.exit.y + 10, elite: 2 });
  return L0;
}
/** walls that stand in front of any floor within a few cells drop to their cut height (not just the first row),
 *  so the solid rock between rooms never hides the hero in the tilted views */
function deepCutaway(map, reach = 4) {
  map._isFront = function (cx, cy, view) {
    if (!this.cutaway || view.isTop || view.pitchDeg > 75) return false;
    const t = this.types[this.cell(cx, cy)]; if (!t || !t.cut) return false;
    const bx = -Math.round(view.fx), by = -Math.round(view.fy);
    for (let k = 1; k <= reach; k++) if ((bx && this.cell(cx + bx * k, cy) === 0) || (by && this.cell(cx, cy + by * k) === 0) || (bx && by && this.cell(cx + bx * k, cy + by * k) === 0)) return true;
    return false;
  };
  return map;
}
/** a random walkable point in the level. o: { minStart (distance from the start), edge (cells from walls), room } */
function randomFloor(L0, R, o = {}) {
  for (let k = 0; k < 80; k++) {
    const r0 = o.room || R.pick(L0.rooms), cx = r0.x + 1 + R.int(0, Math.max(0, r0.w - 3)), cy = r0.y + 1 + R.int(0, Math.max(0, r0.h - 3));
    if (!L0.map.walkable(cx, cy)) continue;
    if (o.edge) { let ok = true; for (let dy = -o.edge; dy <= o.edge && ok; dy++) for (let dx = -o.edge; dx <= o.edge; dx++) if (!L0.map.walkable(cx + dx, cy + dy)) { ok = false; break; } if (!ok) continue; }
    const x = (cx + .2 + R() * .6) * T16, y = (cy + .2 + R() * .6) * T16;
    if (o.minStart && Math.hypot(x - L0.start.x, y - L0.start.y) < o.minStart) continue;
    if (o.minExit && Math.hypot(x - L0.exit.x, y - L0.exit.y) < o.minExit) continue;
    return [x, y];
  }
  return [L0.start.x + 20, L0.start.y];
}
/** spawn the level's packs (called when the level starts; the rare at the exit last) */
/** the deeper, the stranger the packs: an element (recolor + status), a shared affix, giants and swarms */
function packVariant(depth, R) {
  const v = {};
  if (depth > 4 && R.chance(Math.min(.55, (depth - 4) * .05))) v.el = R.pick(['fire', 'frost', 'storm', 'void', 'venom']);
  if (depth > 11 && R.chance(Math.min(.45, (depth - 11) * .03))) { const aff = Object.values(REG.affixes).filter(a => (a.minDepth || 1) <= depth); if (aff.length) v.affix = R.pick(aff).id; }
  if (depth > 17) { const k = R(); if (k < .14) Object.assign(v, { scale: 1.32, hpMul: 1.9, dmgMul: 1.3, speedMul: .82, prefix: 'Giant' }); else if (k < .24) Object.assign(v, { scale: .78, hpMul: .45, dmgMul: .7, speedMul: 1.25, count: 2, prefix: 'Swarming' }); }
  return v;
}
function populate(L0) {
  const R = RNG(L0.rec.seed + 99);
  for (const p of L0.packs) { const v = packVariant(L0.rec.depth, R); spawnPack(p.x, p.y, { pool: L0.rec.pool, elite: p.elite, rng: R, instant: true, n: p.elite === 2 ? 3 + R.int(0, 2) : undefined, el: v.el, mod: v }); }
  if (L0.rec.boss) { const B = spawnBoss(L0.rec.boss, L0.exit.x, L0.exit.y - 10, { hue: L0.hue }); if (B) { B.ai.aware = false; B.introT = 0; B.dormant = true; } }
}

/* ---------- drawing a level: floor, walls, torches, props, things ---------- */
const flicker = t => .9 + Math.sin(t * 13) * .05 + Math.sin(t * 29) * .04 + Math.sin(t * 7.3) * .04;
function drawBrazier(g, r, b) {
  r.box(g, b.x - 3, b.y - 3, 0, b.x + 3, b.y + 3, 8, '#5d566f', '#433d55');
  px.poly(g, r.groundPts(b.x, b.y, 5.5, 14, 11), '#2b2430'); px.poly(g, r.groundPts(b.x, b.y, 5.5, 14, 9), '#3a3036');
  px.glow(g, .9); px.poly(g, r.groundPts(b.x, b.y, 4, 12, 11.2), b.color === '#ff9a4a' ? '#ff8a3c' : b.color);
  const sc = r.view.scale, t = b.t, hot = b.color === '#ff9a4a' ? ['#ff7a2a', '#ffd36a'] : [b.color, E.tones(b.color).hi];
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + t * .6, bx = b.x + Math.cos(a) * 1.6, by = b.y + Math.sin(a) * 1.6, h = 7 + Math.sin(t * 9 + k * 2) * 2.2 + Math.sin(t * 17 + k) * 1.2, sw = Math.sin(t * 6 + k * 1.7) * 1.4;
    const [x0, y0] = r.w(bx, by, 11), [tx, ty] = r.w(bx + sw, by, 11 + h), w = 2.2 * sc;
    px.poly(g, [[x0 - w, y0], [tx, ty], [x0 + w, y0]], hot[0]);
    const [mx, my] = r.w(bx + sw * .5, by, 11 + h * .65); px.poly(g, [[x0 - w * .55, y0], [mx, my], [x0 + w * .55, y0]], hot[1]);
  }
}
function drawTorches(L0, r) {
  let heats = 0;
  for (const b of L0.torches) {
    b.t += 1 / 60;
    if (b.kind === 'brazier') { if (r.visible(b.x, b.y, 0)) { r.queue(b.x, b.y, 0, g => drawBrazier(g, r, b), { emissive: true }); if (heats++ < 6) L.heat(b.x, b.y, 17, 7, 1.1); } }
    else r.prop(b.kind, b.x, b.y, 0, { size: b.size || 1.2, halo: true });
    if (r.visible(b.x, b.y, 0, 200, 200, 200)) L.add(b.x, b.y, 16, b.radius || 124, (b.i || 1.25) * flicker(b.t), { color: b.color, shadow: true });
    L.caster(b.x, b.y, 4.5, 11);
  }
}
function drawProps(L0, r) { for (const p of L0.props) r.prop(p.name, p.x, p.y, p.z || 0, p.o || {}); }
/** the exit waystone: a floating crystal over its rune circle, dark until the level's boss falls */
function drawExit(L0, r) {
  const e = L0.exit, t = game.time, open = e.open, c = open ? '#6fd6cc' : '#5a4a6a', bob = Math.sin(t * 2) * 2;
  r.decal(() => { r.groundRing(e.x, e.y, 14 + Math.sin(t * 3) * 1.5, c, open ? .8 : .4); if (open) r.groundDisc(e.x, e.y, 12, '#2f7f82', .3); }, { emissive: open ? .8 : 0 });
  r.queue(e.x, e.y, 0, g => {
    const [x, y] = r.w(e.x, e.y, 18 + bob), s = (r.view.zoom || 1);
    if (open) { px.glow(g, 1); r.glowDisc(g, x, y, 12 * s, '#6fd6cc', .4); }
    px.poly(g, [[x, y - 9 * s], [x + 4 * s, y], [x, y + 7 * s], [x - 4 * s, y]], open ? '#8ff0e0' : '#6a5a7a');
    px.poly(g, [[x, y - 9 * s], [x, y + 7 * s], [x - 4 * s, y]], open ? '#e0fff8' : '#8a7a9a');
  }, { emissive: open });
  if (open) { L.add(e.x, e.y, 20, 90, .9 + .2 * Math.sin(t * 4), { color: '#6fd6cc' }); if (Math.random() < .2) P.glints(e.x, e.y, 20, 1, '#bff6ff', 14); }
}
