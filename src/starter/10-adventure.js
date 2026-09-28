/* =====================================================================================
 * SLICE 1  ADVENTURE  (Secret of Mana, Zelda: A Link to the Past). Three screens, one camera room each: Mana Village,
 * the Mossy Ruins, the Shrine of Mana. Talk, clear the ruins for the key, open the great door, claim the crystal. THE
 * LOOK: wall MATERIALS, ONE floorTex with PAINTED LIGHT, pitched roofs, leaf-clump bushes, light shafts, dialog PORTRAITS.
 * ===================================================================================== */
const ADV = (() => {
  const T = 16, ROOM = [14 * T, 12 * T], AREAS = ['Mana Village', 'Mossy Ruins', 'Shrine of Mana'];
  const ROWS = [
    // village          ruins             shrine
    ['^^^^^^^^^^^^^^', 'RRRRRRRRRRRRRR', 'XXXXXXXXXXXXXX'],
    ['^^#^^^^^^^^#^^', 'RHhJKFYDYFKhHR', 'XwjiXnWXnXijwX'],
    ['#UUUU.ZZZZ.~~#', 'R.u..q...q.S.R', 'X.S*.B..B.*S.X'],
    ['#GQOQbzNzZu~~#', 'H.KK.v..x..v.H', 'X.....rA.....X'],
    ['#ccccV~ccLe~~#', 'K..s.q::::.s.H', 'X...I.++.I...X'],
    ['#cM@cPccac=~~#', 'H.....::::k..K', 'X....m++m....X'],
    ['#,,,,,,,,,,__,', ',,....::C:...H', 'X...I.++.I...X'],
    ['#.b...b.g,,__,', ',,..o.::::.s.H', 'X.....++.....X'],
    ['#...%%%f..s~~#', 'Hb.K..::::q.KH', 'X...I.++.I...X'],
    ['#T..%%%.u..~~#', 'H.u..s....y.RH', 'X.p...++...p.X'],
    ['#..........~~#', 'H...bK...b.xRH', 'X.....E+.....X'],
    ['##############', 'RRRRRRRRRRRRRR', 'XXXXXX++XXXXXX']
  ].map(r => r.join(''));
  const LEGEND = {
    // walls: a number is a wall type (TYPES); { tile, spawn } is a wall with a prop on its face (THINGS)
    '#': 1, 'U': 5, 'Z': 8, 'R': 9, 'H': 3, 'K': 4, 'F': 6, 'X': 2, 'A': 7,
    '^': { tile: 1, spawn: 'tree' }, 'G': { tile: 5, spawn: 'ivy' }, 'Q': { tile: 5, spawn: 'pane' }, 'O': { tile: 5, spawn: 'door' },
    'z': { tile: 8, spawn: 'pane' }, 'N': { tile: 8, spawn: 'shop' }, 'h': { tile: 3, spawn: 'vines' }, 'J': { tile: 3, spawn: 'cobweb' }, 'Y': { tile: 6, spawn: 'moss' }, 'D': { tile: 6, spawn: 'gate' },
    'w': { tile: 2, spawn: 'window' }, 'W': { tile: 2, spawn: 'rose' }, 'i': { tile: 2, spawn: 'torch' }, 'n': { tile: 2, spawn: 'banner' }, 'j': { tile: 2, spawn: 'cobweb' }, 'r': { tile: 7, spawn: 'relic' },
    // floors: a tag for floorTex; block: true = nobody walks on it
    ',': { floor: 'path' }, 'c': { floor: 'plaza' }, '~': { floor: 'water', block: true }, '_': { floor: 'bridge' }, ':': { floor: 'pave' }, '+': { floor: 'carpet' }, '%': { floor: 'bed' },
    '@': { floor: 'plaza', spawn: 'hero' }, 'M': { floor: 'plaza', spawn: 'elder' }, 'P': { floor: 'plaza', spawn: 'pot' }, 'L': { floor: 'plaza', spawn: 'lamp' },
    'V': { floor: 'water', block: true, spawn: 'fountain' }, 'C': { floor: 'pave', spawn: 'chest' }, 'E': { floor: 'carpet', spawn: 'entry' },
    // people, creatures and props
    'f': 'florist', 'a': { floor: 'plaza', spawn: 'cat' }, 's': 'rabite', 'v': 'bat', 'k': 'goblin', 'm': 'mage', 'b': 'bush', 'p': 'pot', 'T': 'oak', 'g': 'sign', 'u': 'mushroom',
    'e': 'barrel', '=': 'crate', 'q': 'ruin', 'I': 'pillar', 'S': 'statue', 'o': 'rock', 'x': 'crystal', 'y': 'skull', 'B': 'brazier', '*': 'candelabra'
  };
  // wall MATERIALS: face = side pattern, roof = top pattern (beam = timber color); cut = lowered to cutH in front of the camera
  const SLAB = { face: 'stone', roof: 'slab' }, TYPES = {
    1: { h: 16, cut: true, cutH: 7, face: 'hedge', roof: 'leaves', top: '#3f8c3c', side: '#2e6a34' },   // hedge
    2: { h: 34, cut: true, cutH: 8, ...SLAB, top: '#4e4670', side: '#6a6294', course: 9 },   // shrine stone
    3: { h: 26, cut: true, cutH: 8, ...SLAB, top: '#7a8a66', side: '#8e8a98', course: 7 },   // ruin wall, mossy top
    4: { h: 12, cut: true, ...SLAB, top: '#72845e', side: '#8e8a98', course: 6 },   // crumbled ruin
    5: { h: 36, face: 'timber', roof: 'tiles', top: '#c4583a', side: '#f0e0c0', beam: '#6a4228' },   // cottage
    6: { h: 36, ...SLAB, top: '#5a5480', side: '#7a7298', course: 9 },   // shrine facade
    7: { h: 9, ...SLAB, top: '#8a84b4', side: '#5a5484', course: 4 },   // altar
    8: { h: 36, face: 'plaster', roof: 'tiles', top: '#3a7ab4', side: '#f4e6c8' },   // shop
    9: { h: 30, cut: true, cutH: 8, face: 'rock', roof: 'grass', top: '#5a9a44', side: '#8a7462' }   // cliff
  };
  // set dressing: tag -> prop(s). r = solid, cut = breakable (debris colors), drop = sure loot, face = on the wall face
  // at z (anchor 'top' hangs it), light = GPU light, dx = nudge right, hidden = appears later
  const THINGS = {
    // village
    door: [{ face: true, size: 1.1, color: '#7a4222' }, { prop: 'lantern', face: true, z: 33, dx: 14, anchor: 'top', light: '#ffb060' }],
    shop: [{ prop: 'door', face: true, size: 1.1, color: '#2a4a7a' }, { prop: 'awning', face: true, z: 23, size: .95, color: '#d8483a' }],
    pane: { prop: 'window', face: true, z: 12, size: .65, color: '#6a4424', colors: ['#fff0b0', '#ffd070'] }, ivy: { prop: 'vines', face: true, z: 35, anchor: 'top', color: '#3a8a3a', blossom: '#f890b0' },
    fountain: { prop: 'statue', size: .8, color: '#a8a6c0', dx: 8 }, lamp: { prop: 'streetlamp', r: 3, size: .8, halo: false }, oak: { prop: 'tree', size: 1.45, r: 8 },   // lamp: unlit by day
    bush: { r: 6, cut: ['#2f7a34', '#5ab04a', '#9ad86a'] }, pot: { size: .95, r: 5, cut: ['#7a3a22', '#c07040', '#e8a878'], drop: 'gem' }, sign: { r: 4 },
    mushroom: { size: .75, color: '#e0503a' }, barrel: { r: 5, size: .85 }, crate: { r: 6, size: .85 },
    // ruins
    vines: { face: true, z: 25, anchor: 'top', color: '#4a8a3a', blossom: '#f890b0' }, moss: { prop: 'vines', face: true, z: 35, anchor: 'top', size: .8, color: '#5a8a3a', blossom: '#f890b0' },
    gate: { prop: 'door', face: true, size: 1.1, color: '#5a3a6a' }, ruin: { prop: 'pillar', broken: true, r: 7 }, rock: { r: 5, color: '#8a8698' }, skull: { prop: 'bones' },
    crystal: { r: 4, light: '#5ad8f0' }, chest: { r: 6, hidden: true },
    // shrine
    window: { face: true, z: 7, size: .8, colors: ['#e05a6a', '#5a8ae8', '#f0c85a', '#6ad08a'], light: '#8ab0ff' }, torch: { face: true, z: 14, light: '#ff9a4a' },
    rose: { prop: 'window', face: true, z: 2, size: 1, dx: 8, colors: ['#e8c85a', '#c04aa0', '#5a8ae8'], light: '#c8a0ff' }, banner: { face: true, z: 8, size: .8, color: '#8a1a3a', emblem: '#e8c04a' },
    cobweb: { face: true, z: 34, anchor: 'top', size: .9 }, pillar: { r: 7 }, statue: { r: 6, color: '#9a98b0' }, brazier: { r: 5, size: .9, light: '#ff9a4a' }, candelabra: { r: 3, size: .8, light: '#ffc060' }
  };
  // palettes: E.ramp(hex, n, strength) = n hue-shifted shades, dark to light; E.hex = [r, g, b] for floorTex
  const rgb = hexes => hexes.map(E.hex), R5 = (c, s = .6) => rgb(E.ramp(c, 5, s)), FLAG = (s, mortar) => ({ stones: s.slice(1, 4), mortar, hi: s[4], lo: s[0], speck: s[1] });
  const GRASS = [['#4c9a3e', '#5aa640', '#6cb44c'], ['#42804a', '#4a8a48', '#5a9a4e']].map(room => room.map(c => R5(c))), DIRT = R5('#b08652', .7), WATER = R5('#2a7ac4', .9), STONE = R5('#a49a8a', .7), SOIL = R5('#6e4a34');
  const PLAZA = FLAG(R5('#b4a894'), E.hex('#6a5e52')), PAVE = FLAG(R5('#8a8a96'), E.hex('#3a3a3e')), TILE = [R5('#5a5688'), R5('#403c68')], PETAL = rgb(['#ffffff', '#ffe070', '#f890b0']);
  const CARPET = rgb(E.ramp('#9a2438', 4)), GOLD = rgb(E.ramp('#d8a840', 3)), RUNE = [...E.hex('#6ae8e0'), .35], LILY = R5('#4aa050');   // RUNE's 4th value = GPU glow
  const SKY = rgb(['#a8dcf4', '#e8f8ff']), REFLECT = E.hex('#1e5a5a');   // sky glints, the hedge's reflection
  const TUFT = ['.l.l.', '.dld.', '..d..'], BLOOM = ['.w.', 'wyw', '.w.'];   // grass stamps (l light, d dark, w petal, y heart)
  const MOOD = [[.92, .9, .84], [.8, .88, .8], [.34, .3, .46]];   // GPU ambient light per room
  // light shafts per room: beam x, tint, lean. Blend alpha steps by 1/8 (PS1 color math): a dark tint sets the strength
  const BEAMS = [[[34, 128, 196], '#7a5a26', 60], [[50, 150], '#566a22', 60], [[24, 120, 200], '#4a3a8a', 12]];
  const WIN = { bg: ['#3a4a9e', '#12163e'], border: '#f0e0a8' }, FACE_BG = ['#7aa4e8', '#1e2a66'];
  // pixel sprites ('.' = transparent) at scale 1, like everything else
  const GEM = E.sprite(['..g..', '.gGg.', 'gGWGg', 'gGGGg', 'dgGgd', '.dgd.', '..d..'], { g: '#1e9a3a', G: '#56e070', W: '#e8fff0', d: '#0e5a24' });
  const HEART = E.sprite(['.R.R.', 'RWRRR', 'RRRRR', '.RRR.', '..R..'], { R: '#e8384a', W: '#ffd0d6' });
  const KEYS = [1, 2].map(s => E.sprite(['.yy....', 'y..y...', 'Y..Yyyy', '.YY..y.', '.....yY'], { y: '#f8d048', Y: '#b07818' }, s));   // scale 2: held up high
  const CRYSTALS = [1, 2].map(s => E.sprite(['....w....', '...wWc...', '..wWWcc..', '.wWWWccC.', 'wWWWccccC', '.wWWcccC.', '.cWWccCC.', '..cWcCC..', '..ccCC...', '...cC....'], { w: '#f0ffff', W: '#a8f0ff', c: '#4ac8e8', C: '#2a5ab0' }, s));

  // THE CAST: chibi rigs, big anime eyes, each its own outfit, hair and palette. The hero's cape is SECONDARY MOTION
  const RIGS = {
    hero: () => new E.Humanoid({ size: 1.3, outfit: 'tunic', hair: 'spiky', face: { eyes: 'big', bangs: .8 }, cape: { len: 4, width: 3.2, seg: 2.2 },
      colors: { skin: '#f8cca4', hair: '#e8902c', cloth: '#3a8a4a', trim: '#f0d070', pants: '#4a3a5a', boot: '#8a4a26', belt: '#6a3a1a', glove: '#7a5238', eye: '#3a2a6a', cape: '#d0483a', capeIn: '#7a1e2e' } }),
    elder: () => new E.Humanoid({ size: 1.2, weapon: 'staff', outfit: 'robe', hair: 'short', sleeves: 'long', hunch: .45, hat: { style: 'pointed', color: '#3e3278' }, face: { eyes: 'big', bangs: .35 },
      colors: { skin: '#f0c4a8', hair: '#b8b2c4', cloth: '#5a4a9a', trim: '#f0cc60', belt: '#f0cc60', boot: '#4a3a2a', eye: '#2a2a4a' } }),
    florist: () => new E.Humanoid({ size: 1.15, weapon: null, outfit: 'robe', sleeves: 'long', hair: 'ponytail', face: { eyes: 'big', bangs: 1 },
      colors: { skin: '#f8cca4', hair: '#b0482a', cloth: '#d86a8a', trim: '#fff0d0', belt: '#fff0d0', pants: '#d86a8a', boot: '#6a3a2a', eye: '#2a5a3a' } }),
    goblin: () => new E.Humanoid({ size: 1.1, build: 'bulky', outfit: 'tunic', hair: 'bald', hat: { style: 'cap', color: '#7a808a' },
      colors: { skin: '#8ab84a', cloth: '#8a5a32', trim: '#c8a040', pants: '#4a3a2a', boot: '#3a2a1a', belt: '#3a2a1a', hilt: '#6a4a2a' } }),
    mage: () => new E.Humanoid({ size: 1.3, build: 'heroic', weapon: 'staff', outfit: 'robe', hood: true, sleeves: 'long', eyeGlow: '#ff6ab0',
      colors: { skin: '#c8b8e0', hair: '#2e2450', cloth: '#4a3a86', trim: '#d070f0', belt: '#d070f0', boot: '#1a1628', orb: '#ff80e0' } })
  };
  // BLOB CREATURES: a round body plus parts (ears, feet, tail, wings, fangs)
  const RABITE = { dk: '#b0703a', base: '#f4d49a', lt: '#fff4dc', pupil: '#5a1a2a', inner: '#f09aa8', ext: '#d8a060' };
  const BAT = { dk: '#2e1a44', base: '#6a4a9a', lt: '#a890d0', eye: '#fff0a0', pupil: '#c02020', wing: '#4a2a6a', inner: '#e08aa0' };
  const CAT = { dk: '#9a5028', base: '#f0a050', lt: '#ffd8a0', pupil: '#2a4a1a', inner: '#f8b0b0', ext: '#fff0e0' };
  const FOES = {   // hp (sword hits do 8-12) and the look
    rabite: { hp: 18, look: () => new E.Blob({ R: 5.5, colors: RABITE, ears: 'rabbit', feet: true, tail: true, mouth: true, face: 'front' }) },
    bat: { hp: 12, fly: 17, look: () => new E.Blob({ R: 4.5, colors: BAT, wings: true, ears: 'cat', mouth: 'fangs', face: 'front' }) },
    goblin: { hp: 40, look: RIGS.goblin }, mage: { hp: 30, look: RIGS.mage }
  };
  const NPCS = {   // each talk says the next line
    elder: { name: 'ELDER', lines: ['Rabites overran the Mossy Ruins across the river. Press J to swing your sword and clear them out!',
      'Clear the ruins and the old chest opens. The Mana crystal sleeps in the shrine behind the great door.'] },
    florist: { name: 'LISE', lines: ['A rabite got into my garden again! Could you shoo it away?', 'Mind the bats in the ruins. They swoop when you get close!'] }
  };
  // BACKDROP (iso view): the island floats over a sea of clouds
  const bg = new E.Backdrop({ sky: ['#3a74c8', '#8ac2ea', '#e4f2f4', '#9ccae6', '#5a90c8'], layers: [{ kind: 'clouds', color: '#ffffff', y: .3, height: .16, parallax: .04, drift: 3 },
    { kind: 'clouds', color: '#ffffff', y: .98, height: .4, parallax: .1, drift: 3, seed: 9 }] });
  let map, relic, entry, hero, npcs, foes, pets, items, things, roofs, shots, talk, won, keys, gems, area, held, fx;
  const roomOf = x => Math.floor(x / ROOM[0]), mod = (a, n) => ((a % n) + n) % n, near = (cx, cy, tag) => map.floorAt((cx + .5) * T, (cy + .5) * T) === tag;
  const txt = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c, { shadow: '#07040c', outline: false, ...o });
  const talkable = () => npcs.find(n => E.dist(hero, n) < 34);
  // CHARACTER VIEW: E.charView(view) = the sprite-like angle for rigs in 40-70 degree views; topdown (80) gets it here too
  let flat; const cv = v => E.charView(v.pitchDeg > 70 ? flat || (flat = new E.View(v.id, v.label, v.yawDeg, 30, v.scale, .85)) : v);
  // CONTACT SHADOWS: a darker core inside a soft ellipse, cool purple, never black
  const shadow = (r, x, y, rad) => { r.shadow(x, y, rad, .28, '#2a2048'); r.shadow(x, y, rad * .6, .22, '#2a2048'); };

  /* ---- FLOORS: floorTex(x, y, tag) returns [r, g, b] (or [r, g, b, glow]); baked once per view ---- */
  // AUTOTILING: distance to the nearest side bordering another floor, corners rounded by K (water runs under bridges)
  function edge(cx, cy, lx, ly, tag, K) {
    const o = (dx, dy) => { const t = map.floorAt((cx + dx + .5) * T, (cy + dy + .5) * T), c = map.cell(cx + dx, cy + dy); return tag === 'water' ? t !== tag && t !== 'bridge' && !c : t !== tag || c !== 0; };
    const a = Math.min(o(-1, 0) ? lx : 99, o(1, 0) ? T - lx : 99), b = Math.min(o(0, -1) ? ly : 99, o(0, 1) ? T - ly : 99);
    return a < K && b < K ? K - Math.hypot(K - a, K - b) : Math.min(a, b);
  }
  // GRASS: TUFT and BLOOM stamps on a staggered lattice in SCREEN pixels (pixel-exact tufts)
  function grass(sx, sy, G) {
    const row = Math.floor(sy / 7), X = sx + (row & 1) * 6, k = E.hash2(Math.floor(X / 12), row), pat = k < .07 ? BLOOM : k < .62 ? TUFT : null;
    const ch = pat && (pat[mod(Math.floor(sy), 7) - 2] || '')[mod(Math.floor(X), 12) - (pat === BLOOM ? 5 : 4)];
    return ch === 'l' ? G[3] : ch === 'd' ? G[1] : ch === 'y' ? PETAL[1] : ch === 'w' ? PETAL[k < .035 ? 0 : 2] : G[2];
  }
  function ground(x, y, tag) {
    const cx = Math.floor(x / T), cy = Math.floor(y / T), lx = x - cx * T, ly = y - cy * T, room = roomOf(x), [sx, sy] = game.view.p(x, y), h = E.hash2(cx, cy);
    const e = tag && tag !== 'carpet' ? edge(cx, cy, lx, ly, tag, tag === 'water' ? 7 : tag === 'pave' ? 1 : 4) : 99;
    if (e < 0) tag = null;   // outside a rounded corner
    // WATER: bank, lip, bank shadow, reflection, foam, then depth BANDS whose edges value noise bends (a sine zigzags)
    if (tag === 'water') {
      if (e < 2.6) return e < 1 ? STONE[0] : E.hash2(Math.floor(y / 3), cx) < .2 ? STONE[1] : STONE[e < 1.8 ? 4 : 3];
      const w = (E.noise2(x / 6, y / 9) - .5) * 5, foam = near(cx, cy - 1, 'bridge') ? ly : near(cx, cy + 1, 'bridge') ? T - ly : 99;
      if (e < 3.3 || foam < 3 + w + E.hash2(Math.floor(sx / 2), 1) * 2) return foam < 1.5 + w ? SKY[1] : WATER[4];
      if (!near(cx - 1, cy, 'water') && lx < 6 + w) return WATER[0];
      if (map.cell(cx + 1, cy) > 0 && lx > 11 + w) return REFLECT;
      const px_ = lx - 4 - h * 8, py_ = ly - 4 - h * 7, pad = Math.hypot(px_, py_);
      if (h < .3 && pad < 3) return LILY[pad < 1 ? 4 : px_ > .5 && Math.abs(py_) < .5 ? 1 : 2];
      const k = mod(Math.floor(sx) + Math.floor(sy / 6) * 7, 23);   // sky glints on every 6th row
      return mod(Math.floor(sy), 6) === 0 && k < 4 ? SKY[k ? 0 : 1] : WATER[e + w < 8 ? 3 : e + w < 12 ? 2 : 1];
    }
    if (tag === 'bridge') return (ly < 2 && !near(cx, cy - 1, tag)) || (ly > T - 2 && !near(cx, cy + 1, tag)) ? DIRT[0] : E.tex.planks(y, x, { base: '#b07c44', dark: '#8a5c32', line: '#4a2e1a' });
    // path and paving: grass erodes the edge by a hash (not a ruled line); dirt, pebbles
    const q = E.hash2(Math.floor(sx / 6), Math.floor(sy / 5)), b = E.hash2(Math.floor(x / 4), Math.floor(y / 4)) * 3;
    if (tag === 'path') return e < b ? grass(sx, sy, GRASS[room][1]) : e < b + .9 ? DIRT[0] : q < .16 && mod(Math.floor(sx), 6) < 2 && mod(Math.floor(sy), 5) === 0 ? DIRT[q < .07 ? 4 : 1] : DIRT[e < b + 1.8 ? 1 : 2];
    if (tag === 'plaza') return e < .9 ? PLAZA.mortar : E.tex.flagstone(x, y, PLAZA, 8);
    if (tag === 'bed') return e < 1 ? STONE[0] : e < 2.4 ? STONE[3] : SOIL[mod(ly, 4) < 1 ? 0 : 2];
    const c = Math.min(near(cx - 1, cy, tag) ? 99 : lx, near(cx + 1, cy, tag) ? 99 : T - lx), m = Math.abs(mod(x, 32) - 16) + Math.abs(ly - 8);   // carpet
    if (tag === 'carpet') return c < 1 ? CARPET[0] : c >= 2 && c < 3 ? GOLD[1] : m > 5 && m < 6.5 ? GOLD[0] : m < 2.5 ? GOLD[2] : CARPET[1];
    const f = E.tex.flagstone(x, y, PAVE);   // paving: moss in the seams
    if (tag === 'pave') return e < b ? grass(sx, sy, GRASS[1][1]) : e < b + .9 ? PAVE.mortar : f === PAVE.mortar && E.hash2(Math.floor(x / 6), Math.floor(y / 6)) < .45 ? GRASS[1][1][1] : f;
    const n = E.noise2(x / 40 + room * 9, y / 40);   // lawn: three shades in slow patches
    if (room < 2) return grass(sx, sy, GRASS[room][n < .36 ? 0 : n > .64 ? 2 : 1]);
    const dr = Math.hypot(x - relic.x, y - relic.y), a = Math.atan2(y - relic.y, x - relic.x), P = TILE[(cx + cy) & 1];
    if (Math.abs(dr - 15) < .7 || Math.abs(dr - 10.5) < .6 || (dr > 11 && dr < 14.5 && Math.abs(mod(a / Math.PI * 4, 1) - .5) < .06)) return RUNE;   // shrine: a rune circle...
    if (dr < 26) return dr > 24.8 ? TILE[1][0] : dr > 23.2 ? TILE[0][4] : TILE[dr < 20 ? 1 : 0][2];   // ...on a round dais with a lit rim...
    if (Math.min(lx, ly) < 1.2) return P[lx < .8 || ly < .8 ? 0 : 4];   // ...on marble tiles: grout, a lit bevel, a sheen
    return lx > T - 1.2 || ly > T - 1.2 ? P[1] : mod(lx + ly, 13) < 1 ? P[3] : P[2];
  }
  // PAINTED LIGHT (Legend of Mana): a wall taller than its distance toward the low western sun shades this point with
  // a cool purple multiply; the map's ao darkens wall bases
  const SHADE = [.64, .68, .86];
  function floorTex(x, y, tag) {
    const c = ground(x, y, tag);
    for (let d = 2; d < 18; d += 2) if (map.heightAt(x - d, y - d * .3) > d * 1.8) return c.map((v, i) => i < 3 ? v * SHADE[i] : v);
    return c;
  }

  // trees and pines varied by hashes (not Math.random)
  const tree = (cx, cy, pine) => { const v = E.hash2(cx * 5, cy * 3); return { prop: pine || v > .72 ? 'pine' : 'tree', size: 1 + v * .45, color: ['#2f7a3c', '#3f8a45', '#2a6a44', '#4a8a3a'][Math.floor(v * 4)], x: (cx + .3 + E.hash2(cy, cx) * .4) * T }; };
  function start() {
    map = new E.TileMap({ rows: ROWS, legend: LEGEND, types: TYPES, floorTex, ao: 8 });
    relic = map.find('relic'); entry = map.find('entry'); relic.x += T / 2; entry.x += T / 2;   // on the room's center line
    game.cam.bounds = v => map.bounds(v); game.cam.room = ROOM;   // screen-by-screen camera
    const at = map.find('hero');
    hero = Object.assign(new E.Body({ ...at, r: 4.5 }), { hp: 3, max: 3, facing: Math.PI / 2, inv: 0, hurt: 0, rig: RIGS.hero(),
      slash: new E.Attack({ a0: 1.6, a1: -1.7, z0: 12, z1: 9, reach: 7.5, wind: .05, recover: .16 }) });
    npcs = Object.keys(NPCS).map(k => Object.assign({ said: 0, rig: RIGS[k]() }, map.find(k), NPCS[k]));
    things = [];
    for (const s of map.spawns) for (const d of [].concat(s.tag === 'tree' ? tree(s.cx, s.cy) : THINGS[s.tag] || []))
      things.push(Object.assign({ tag: s.tag, prop: s.tag, x: s.x + (d.dx || 0), y: s.y, room: roomOf(s.x) }, d));
    // one pass over the cells: house footprints (roofs), pines, ruin weeds, flower beds, bridge rails, hashed tufts
    const box = {};
    for (let cy = 0; cy < map.h - 1; cy++) for (let cx = 0; cx < map.w; cx++) {
      const c = map.cell(cx, cy), v = E.hash2(cx * 3, cy * 7 + 1), X = (cx + .5) * T, Y = (cy + .5) * T, tag = map.floorAt(X, Y), add = o => things.push(Object.assign({ x: X, y: Y }, o));
      if (c === 5 || c === 8) { const b = box[c] || (box[c] = [cx, cy, cx, cy]); b[2] = cx; b[3] = cy; }
      if (map.spawns.some(s => s.cx === cx && s.cy === cy)) continue;
      if (c === 9 && cy === 0 && v < .5) add(tree(cx, cy, true));
      else if ((c === 3 || c === 4) && v < .45) add({ prop: 'bush', size: .7 + v * .6, color: '#5a8a44' });
      else if (tag === 'bed') {
        for (const k of [-3, 3]) add({ prop: 'flowers', size: 1.1, x: X + k, y: Y + k, color: k < 0 ? ['#f06a9a', '#f0a040', '#ffffff'][cx % 3] : '#8ab0ff', color2: '#fff4a0' });
        if (!near(cx, cy + 1, 'bed')) add({ prop: 'fence', size: 1.2, y: Y + 8, color: '#b08050' });
      }
      else if (tag === 'bridge') for (const s of [-1, 1]) { if (!near(cx, cy + s, 'bridge')) add({ prop: 'fence', size: 1.2, y: Y + s * 7, color: '#8a5a32' }); }
      else if (!c && !tag && X < 2 * ROOM[0] && v < .16) add({ prop: v < .06 ? 'flowers' : 'grass', x: X + (E.hash2(cx, cy) - .5) * 10, y: Y + (E.hash2(cy, cx) - .5) * 8,
        color: v < .06 ? '#f06a9a' : X > ROOM[0] ? '#5a9a4a' : '#6ab850', color2: '#fff4a0' });
    }
    roofs = Object.keys(box).map(id => { const [a, b, c, d] = box[id]; return { x0: a * T, y0: b * T, x1: (c + 1) * T, y1: (d + 1) * T, h: TYPES[id].h, C: E.ramp(TYPES[id].top, 5) }; });
    items = [{ kind: 'relic', x: relic.x, y: relic.y }];
    foes = Object.keys(FOES).flatMap(k => map.findAll(k)).map(s => { const F = FOES[s.tag];
      return Object.assign(new E.Body({ ...s, r: 5.5, friction: 6, ...(F.fly && { z: F.fly, gravity: 0, onGround: false }) }), { kind: s.tag, hp: F.hp, fly: F.fly, home: { ...s }, t: 1 + Math.random(), flash: 0, cast: 0,
        face: Math.PI / 2, room: roomOf(s.x), look: F.look(), slash: s.tag === 'goblin' ? new E.Attack({ a0: 1.4, a1: -1.5, z0: 13, z1: 8, reach: 7, wind: .38, active: .12, recover: .45 }) : null }); });
    pets = map.findAll('cat').map(s => Object.assign(new E.Body({ ...s, r: 4 }), { t: 1, home: { ...s }, look: new E.Blob({ R: 4, colors: CAT, ears: 'cat', tail: true, feet: true, mouth: true, face: 'front' }) }));
    shots = new E.Bullets(game, { plane: 'ground' }); talk = new E.Dialog(game, WIN);
    fx = []; won = false; keys = 0; gems = 0; area = { room: 0, t: 2.6 }; held = null;
    // the floor is lit already: no Canvas lighting; GPU lighting (if any) adds light pools and soft shadows
    L.enabled = false; gpu = gpu || game.enableGPU({ map }); Object.assign(gpu, { map, enabled: true, bands: 24, wrap: .5, ambient: MOOD[0] }); A.music('adventure');
  }
  // DIALOG: E.Dialog types, wraps and pages; portrait: rig adds a live close-up of the speaker
  const say = (rig, name, text) => talk.say(text, { name, portrait: rig, portraitSize: 50, portraitOpts: { zoom: 2.6, turn: -.25, cape: false, bg: FACE_BG } });
  function hurtHero(ang) {
    if (hero.inv > 0 || won || hero.hp <= 0) return; hero.hp -= .5; hero.inv = 1; hero.hurt = .25; hero.slash.cancel(); hero.push(Math.cos(ang) * 160, Math.sin(ang) * 160);
    game.hitFx(hero.x, hero.y, 12, { power: 1.2, angle: ang + Math.PI, color: '#ff8a6a', sound: 'hurt' }); game.flash('#ff4a3a', .06, .4);
    if (hero.hp <= 0) { poof(hero.x, hero.y, 0, 1.2); game.after(.8, () => game.go('over', { from: 'adventure' })); }
  }
  // a sword hit: game.hitFx (hit-stop, shake, star, sparks, sound, damage number) and knockback
  function strike(f) {
    const h = hero, an = E.angleTo(h, f), dmg = E.randInt(8, 12);
    f.hp -= dmg; f.flash = .12; f.cast = 0; if (f.slash) f.slash.cancel(); E.knockback(h, f, 220, f.fly ? 0 : 60);
    game.hitFx(lerp(h.x, f.x, .6), lerp(h.y, f.y, .6), 10 + f.z * .5, { angle: an, damage: dmg });
    if (f.hp > 0) return;
    f.dead = true; game.freeze(.1); poof(f.x, f.y, f.z, f.kind === 'mage' ? 1.4 : 1);
    if (f.kind === 'mage') { P.glints(f.x, f.y, 14, 8, '#f0b0ff', 18); game.flash('#f0d0ff', .08, .5); A.sfx('explode', { pitch: 1.3 }); }
    else { P.bits(f.x, f.y, 6 + f.z, 14, f.look instanceof E.Blob ? [f.look.C.dk, f.look.C.base, f.look.C.lt] : ['#8ab84a', '#8a5a32', '#c8d0d8']); A.sfx('stomp'); }
    items.push({ kind: h.hp < h.max && E.chance(.5) ? 'heart' : 'gem', x: f.x, y: f.y });
  }
  // push bodies out of solid props
  const settle = b => { for (const t of things) if (t.r && !t.dead && !t.hidden) { const dx = b.x - t.x, dy = b.y - t.y, dd = Math.hypot(dx, dy) || 1, m = b.r + t.r; if (dd < m) { b.x = t.x + dx / dd * m; b.y = t.y + dy / dd * m; } } };
  function poseHero(dt) {   // prize: face the camera and CHEER
    const h = hero, cheer = held && held.t > 0, still = talk.open || game.cam.moving || cheer, v = game.view;
    h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: still ? 0 : h.vx, vy: still ? 0 : h.vy, facing: cheer ? Math.atan2(v.fy, v.fx) : h.facing, hurt: h.hurt > 0, attack: cheer ? null : h.slash.state, pose: cheer ? 'cheer' : null });
  }
  function update(dt) {
    const h = hero, room = roomOf(h.x), inp = game.input, npc = talkable();
    if (held) held.t -= dt;
    for (const n of npcs) n.rig.update(dt, { x: n.x, y: n.y, facing: E.dist(h, n) < 56 ? E.angleTo(n, h) : Math.PI / 2 });
    if (talk.update(dt)) { poseHero(dt); return; }   // dialog pauses the world
    if (gpu) gpu.ambient = MOOD[room];
    if (room !== area.room) area = { room, t: 2.6 }; else area.t -= dt;
    if (game.cam.moving || won || held && held.t > 0) { poseHero(dt); return; }   // wait while the room slides or the hero cheers
    h.inv -= dt; h.hurt -= dt; if (h.hp <= 0) return;
    if (npc && inp.pressed('confirm')) return void say(npc.rig, npc.name, npc.lines[npc.said++ % npc.lines.length]);
    // screen-relative keys become a ground direction
    const mv = inp.move(), md = game.view.screenDirToGround(mv[0], mv[1]), sp = h.slash.busy ? 20 : 80;
    if (Math.hypot(md[0], md[1]) > .1 && !h.slash.busy) h.facing = Math.atan2(md[1], md[0]);
    const hit = h.hurt > 0, acc = (hit ? 400 : 900) * dt; h.vx = approach(h.vx, hit ? 0 : md[0] * sp, acc); h.vy = approach(h.vy, hit ? 0 : md[1] * sp, acc);
    // sword: E.Attack runs wind -> active -> recover, one hit per target per swing
    if (inp.buffered('attack') && h.slash.start()) { inp.consume('attack'); A.sfx('swing'); } h.slash.update(dt);
    h.slash.hits(foes, f => !f.dead && E.inArc(h, h.facing, f, 22, 1.4), strike);
    // bushes and pots break: pots always hide a gem, bushes sometimes a gem or heart
    h.slash.hits(things, t => t.cut && !t.dead && E.inArc(h, h.facing, t, 22, 1.3), t => {
      t.dead = true; P.bits(t.x, t.y, 6, 14, t.cut); poof(t.x, t.y, 0, .6); A.sfx(t.prop === 'pot' ? 'bump' : 'whoosh');
      const kind = t.drop || E.chance(.5) && (E.chance(.7) ? 'gem' : 'heart'); if (kind) items.push({ kind, x: t.x, y: t.y });
    });
    h.update(dt, map); settle(h);
    // a cleared ruin reveals the key chest; the hero cheers, holding the key high
    const chest = things.find(t => t.tag === 'chest'), gate = things.find(t => t.tag === 'gate');
    if (chest.hidden && foes.every(f => f.room !== 1 || f.dead)) { chest.hidden = false; poof(chest.x, chest.y, 0, 1.3); P.glints(chest.x, chest.y, 10, 8); A.sfx('secret'); }
    if (!chest.hidden && !chest.open && E.dist(h, chest) < 15) {
      chest.open = true; keys++; held = { spr: KEYS[1], t: 1.6 }; A.sfx('key'); P.glints(h.x, h.y, 40, 10); game.flash('#fff4c0', .15, .5);
      game.after(1.6, () => say(h.rig, 'HERO', 'I got the SHRINE KEY! Now the great door in the ruins will open.'));
    }
    // the key opens the door and warps the hero inside
    if (keys > 0 && !gate.open && E.dist(h, gate) < 22) {
      gate.open = true; keys--; A.sfx('door'); game.shake(3); P.dust(gate.x, gate.y + 10, 2, 14, { color: '#8a7a6a', speed: 50 });
      game.after(.5, () => { Object.assign(h, { x: entry.x, y: entry.y, vx: 0, vy: 0, facing: -Math.PI / 2 }); game.cam.snap = true; game.flash('#07040c', .5); A.sfx('warp'); });
    }
    for (const it of items) if (!it.got && E.dist(it, h) < (it.kind === 'relic' ? 15 : 10)) {
      it.got = true; P.glints(it.x, it.y, 6, 4); if (it.kind === 'gem') { gems++; A.sfx('coin'); } else if (it.kind === 'heart') { h.hp = Math.min(h.max, h.hp + 1); A.sfx('heal'); }
      else { won = true; held = { spr: CRYSTALS[1], t: 99 }; game.flash('#ffffff', .2); P.glints(it.x, it.y, 20, 24, '#bff8ff', 30); A.music('victory'); game.after(6, () => game.go('title')); }
    }
    // enemies act only in the hero's room
    for (const f of foes) {
      if (f.dead) continue; f.flash -= dt; f.t -= dt;
      const on = f.room === room, dx = h.x - f.x, dy = h.y - f.y, dd = Math.hypot(dx, dy) || 1;
      if (f.kind === 'rabite') {   // hops near home, then at the hero
        if (on && f.onGround && f.t <= 0) {
          const chase = dd < 72, a = chase ? Math.atan2(dy, dx) : E.dist(f, f.home) > 20 ? E.angleTo(f, f.home) : Math.random() * TAU, v = chase ? 75 : 35;
          f.t = chase ? .6 + Math.random() * .6 : .8 + Math.random(); f.push(Math.cos(a) * v, Math.sin(a) * v, 0); f.jump(chase ? 150 : 110); f.look.kick(4);
        }
      } else if (f.kind === 'bat') {   // weaves overhead, then swoops
        if (on && f.cast <= 0 && f.t <= 0 && dd < 48) { f.cast = .8; f.t = 2.4; A.sfx('whoosh', { pitch: 1.6 }); }
        const a = Math.atan2(dy, dx) + (f.cast > 0 ? 0 : Math.sin(game.time * 4 + f.y) * 1.1), s = !on ? 0 : f.cast > 0 ? 75 : 30;
        f.cast -= dt; f.vx = approach(f.vx, Math.cos(a) * s, 260 * dt); f.vy = approach(f.vy, Math.sin(a) * s, 260 * dt);
        f.onGround = false; f.vz = ((f.cast > 0 ? 5 : f.fly + Math.sin(game.time * 3 + f.x) * 3) - f.z) * 5;
      } else if (f.kind === 'goblin') {   // walks up, winds up (a tell), slashes
        const go = on && !f.slash.busy && dd > 17 ? 32 : 0; if (!f.slash.busy) f.face = Math.atan2(dy, dx); f.vx = approach(f.vx, dx / dd * go, 300 * dt); f.vy = approach(f.vy, dy / dd * go, 300 * dt);
        if (on && dd < 21 && f.t <= 0 && f.slash.start()) f.t = 1.4;
        if (f.slash.update(dt) === 'active') A.sfx('swing', { pitch: .75 }); f.slash.hits([h], t => E.inArc(f, f.face, t, 21, 1.3), () => hurtHero(f.face));
      } else if (on) {   // mage: sidestep, charge, loose an orb
        f.face = Math.atan2(dy, dx);
        if (f.cast > 0 && (f.cast -= dt) <= 0) { const [x, y] = f.look.tip(), [vx, vy] = E.pattern.aim({ x, y }, h, 100); shots.fire({ x, y, z: 10, vx, vy, r: 3, team: 'foe', color: '#e060ff', core: '#ffe8ff' }); A.sfx('laser', { pitch: .8 }); }
        else if (f.cast <= 0 && f.t <= 0) { f.cast = .7; f.t = 2.4; A.sfx('charge', { pitch: 1.5, vol: .06 }); }
        else if (f.cast <= 0) { const s = Math.sin(game.time * .9 + f.x) > 0 ? 22 : -22; f.vx = -dy / dd * s; f.vy = dx / dd * s; }
      }
      f.update(dt, map); if (!f.fly) settle(f);
      if (f.look instanceof E.Blob) { if (f.landed) f.look.kick(-4); f.look.update(dt, { squash: f.fly ? Math.sin(game.time * 14) * .08 : f.onGround ? 0 : clamp(f.vz / 600, -.2, .25), look: [dx, dy], walk: f.onGround ? 0 : 1 }); }
      else f.look.update(dt, { x: f.x, y: f.y, z: f.z, vx: f.vx, vy: f.vy, facing: f.face, hurt: f.flash > 0, attack: f.slash ? f.slash.state : null, pose: f.cast > 0 ? 'cast' : null });
      if (on && f.kind !== 'goblin' && f.z < 9 && E.overlap(f, h)) hurtHero(Math.atan2(dy, dx));
    }
    shots.update(dt, map); shots.hit([h], b => hurtHero(Math.atan2(b.vy, b.vx)), 'foe');
    for (const c of pets) {   // the cat strolls near its spot, sits and dozes
      if ((c.t -= dt) <= 0) { const a = E.dist(c, c.home) > 18 ? E.angleTo(c, c.home) : E.rand(0, TAU), go = E.chance(.6); c.t = go ? 1.2 : E.rand(2, 4); const v = go ? 22 : 0; c.vx = Math.cos(a) * v; c.vy = Math.sin(a) * v; }
      c.update(dt, map); settle(c); const walk = Math.min(1, Math.hypot(c.vx, c.vy) / 20);
      c.look.update(dt, { look: walk ? [c.vx, c.vy] : [h.x - c.x, h.y - c.y], walk, squint: !walk && E.dist(c, h) > 50, squash: walk ? 0 : .12 });
    }
    // ambient life: petals, fireflies, embers, chimney smoke, fountain spray, river foam
    const rx = (room + Math.random()) * ROOM[0], ry = E.rand(T, ROOM[1] - T);
    if (Math.random() < dt * 4) P.add(room === 0 ? { kind: 'bit', x: rx, y: ry, z: 50, vx: 14, vy: 5, vz: -9, g: 3, max: 5, color: E.pick(['#ffb0c8', '#fff0f4']) }
      : room === 1 ? { kind: 'ember', x: rx, y: ry, z: E.rand(6, 26), vx: E.rand(-5, 5), vy: E.rand(-5, 5), vz: 3, max: 2.5, color: '#d8ff6a' }
      : { kind: 'ember', x: rx, y: ry, z: 2, vz: 16, vx: E.rand(-4, 4), max: 2, color: '#ff8a3a' });
    for (const f of roofs) if (roomOf(f.x1) === room && Math.random() < dt * 2.5) P.smoke(f.x1 - 12, f.y0 + 14, f.h + 16, 1, { size: 2.2, color: '#e4e2ee', dark: '#b0acc0', light: '#ffffff' });
    for (const t of things) if (t.tag === 'fountain' && t.room === room && Math.random() < dt * 14) P.add({ kind: 'bit', x: t.x, y: t.y, z: 22, vx: E.rand(-15, 15), vy: E.rand(-6, 6), vz: 40, g: 260, max: .5, color: E.pick(['#ffffff', '#a8e0ff']) });
    if (room === 0 && Math.random() < dt * 6) P.add({ kind: 'bit', x: E.rand(11.3, 12.7) * T, y: E.pick([2, 8]) * T + E.rand(0, 46), z: 0, vy: 26, max: 1.2, color: '#d8f0ff' });
    poseHero(dt); game.focus(h.x, h.y, 10);
  }

  /* ---- DRAWING ---- */
  // POOF: five crisp puffs (outline, white, lilac underside), aged by game.time so hit-stop holds it
  const poof = (x, y, z, s) => fx.push({ x, y, z: z + 4 * s, s, t: game.time, life: .5 });
  function drawFx(r) {
    E.prune(fx, f => game.time - f.t > f.life);
    for (const f of fx) r.queue(f.x, f.y, f.z, g => {
      const u = (game.time - f.t) / f.life, [x, y] = r.w(f.x, f.y, f.z), R = f.s * (u < .25 ? 3 + u * 16 : 7 - (u - .25) * 6);
      for (const [c, k, o, d] of [['#4a3a5a', .62, 1, 0], ['#ffffff', .62, 0, 0], ['#d8d0ec', .32, 0, 1.5]])
        for (const [dx, dy] of [[0, 0], [-1, -.6], [1, -.6], [-.7, .5], [.7, .5]]) px.disc(g, x + dx * R * .8 + d, y + dy * R * .6 - u * 6 + d, R * k + o, c);
    }, { bias: .6 });
  }
  // BUSHES of LEAF CLUMPS, no two alike (a hash seeds clump count, spread, sizes): one outline around the whole mass, a
  // body and lit top-left per clump, loose leaf dots and blossoms. Rings on every clump would read as cabbages
  function bush(g, x, y, s, C, k) {
    const H = i => E.hash2(k, i), n = 4 + Math.floor(H(0) * 4), cl = [];
    for (let i = 0; i < n; i++) { const a = H(i + 9) - .5, b = H(i + 19); cl.push([x + a * (8 + H(1) * 12) * s, y - (3 + b * 4 + (.5 - Math.abs(a)) * 8) * s, (3 + b * 2) * s]); }
    for (const [X, Y, R] of cl) px.disc(g, X, Y, R + 1, C[0]);
    for (const [X, Y, R] of cl) { px.disc(g, X, Y, R, C[1]); px.disc(g, X - R * .3, Y - R * .35, R * .6, C[2]); }
    for (let i = 0; i < n * 3; i++) { const [X, Y, R] = cl[i % n]; px.dot(g, X + (H(i + 29) - .6) * R * 1.5, Y + (H(i + 59) - .7) * R * 1.4, H(2) < .3 && i % 3 < 1 ? '#ffc8dc' : C[3 + i % 2]); }
  }
  // PITCHED ROOF over the flat tiled top: a shaded back half and a ridge cap read as two slopes; an eave lip and its
  // shadow lift the roof off the wall. Chimney: three r.box blocks (stack, cap, flue)
  function roof(r, f) {
    const P = r.w.bind(r), m = (f.y0 + f.y1) / 2 - 1, z = f.h + .3, C = f.C, band = (x0, x1, y0, y1, z0, z1) => [P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z1), P(x0, y1, z1)];
    r.queue(f.x1 - 1, f.y1 - 1, f.h, g => {
      px.blend(g, .32, 'multiply', () => px.poly(g, band(f.x0, f.x1, f.y0, m, z, z), '#4a3a7a'));
      px.blend(g, .4, 'multiply', () => px.poly(g, band(f.x0, f.x1, f.y1 + .1, f.y1 + .1, f.h - 2, f.h - 7), '#3a2a5a'));
      px.poly(g, band(f.x0 - 1.5, f.x1 + 1.5, f.y1 - 1, f.y1 + 1.5, z, f.h - 1.5), C[0]);   // eave lip
      px.poly(g, band(f.x0 - 1, f.x1 + 1, m - 1.5, m + 1.5, z + .8, z + .8), C[1]);   // ridge cap
      px.line(g, ...P(f.x0 - 1, m - 1.5, z + .8), ...P(f.x1 + 1, m - 1.5, z + .8), C[4]);
      const cx = f.x1 - 12, cy = f.y0 + 14;
      r.box(g, cx - 3, cy - 3, f.h - 4, cx + 3, cy + 3, f.h + 11, '#6a3430', '#b05a48');
      r.box(g, cx - 4, cy - 4, f.h + 10, cx + 4, cy + 4, f.h + 12, '#b8a8a0', '#6a5a60');
      r.box(g, cx - 1.5, cy - 2, f.h + 12, cx + 1.5, cy + 1, f.h + 12.3, '#2a1c20', '#2a1c20');
    }, { bias: .01 });
  }
  // LIGHT SHAFTS: short tinted beams, a stepped FALLOFF (three additive layers, each shorter) and drifting dust motes,
  // one blend call per beam. Topdown looks straight down them: none there
  function shafts(r, room) {
    const [xs, c, lean] = BEAMS[room], t = game.real;
    if (r.view.pitchDeg < 70) r.overlay(g => { for (const bx of xs) {
      const [x, y] = r.w(room * ROOM[0] + bx, 12, 40), w = 5 + Math.sin(t * .5 + bx) * 1.5, L = 120;
      px.blend(g, 1 / 8, 'add', () => { for (const k of [1, .6, .3]) { const X = x + lean * k, Y = y + L * k, s = w * (1 + k); px.poly(g, [[x - w, y], [x + w, y], [X + s, Y], [X - s, Y]], c); } });
      px.blend(g, 1, 'add', () => { for (let i = 0; i < 6; i++) { const u = (i * .17 + t * .025 + bx * .01) % 1; px.dot(g, x + lean * u + Math.sin(t * .7 + i * 2) * w, y + L * u, c); } });
    } });
  }
  function draw(r) {
    const view = cv(r.view), h = hero, room = roomOf(h.x), bob = Math.sin(game.time * 4) * 1.5;
    bg.draw(r); map.drawFloor(r); map.queueWalls(r);
    for (const b of [h, ...npcs, ...foes, ...pets]) if (!b.dead) shadow(r, b.x, b.y, (b.look instanceof E.Blob ? 5 : 6) - Math.min(2.5, (b.z || 0) * .12));
    for (const f of roofs) roof(r, f);
    for (const t of things) {
      if (t.dead || t.hidden) continue; const y = t.face ? t.y + T / 2 + 1 : t.y, z = t.face ? t.z || 0 : map.heightAt(t.x, t.y);
      if (t.r) shadow(r, t.x, t.y + 1, t.r);
      if (t.prop === 'bush') r.queue(t.x, t.y, z, g => { const [X, Y] = r.w(t.x, t.y, z), k = Math.floor(t.x * 3 + t.y);   // k seeds shape and green
        bush(g, Math.round(X), Math.round(Y), t.size || 1, t.C || (t.C = E.ramp(t.color || ['#4a9a4a', '#3a8a52', '#5a9a3a'][k % 3], 5, 1.2)), k); });
      else r.prop(t.prop, t.x, y, z, { ...t, light: false });   // its fields style the prop
      // GPU lights in the hero's room only (32 at once); wall lights cast shadows
      if (t.light && t.room === room) L.add(t.x, y + (t.prop === 'window' ? 30 : 0), z + 14, t.face ? 90 : 60, .9, { color: t.light, shadow: t.face });
    }
    for (const it of items) if (!it.got) {
      if (it.kind === 'relic') { r.sprite(it.x, it.y, 18 + bob, CRYSTALS[0], { glow: .5 }); if (Math.random() < .08) P.glints(it.x, it.y, 22, 1, '#bff8ff', 14); }
      else { shadow(r, it.x, it.y, 3); r.sprite(it.x, it.y, 3 + bob, it.kind === 'gem' ? GEM : HEART, { glow: .5 }); }
    }
    for (const b of [...npcs, ...pets]) r.actor(b.x, b.y, b.z || 0, (g, ox, oy) => (b.rig || b.look).draw(g, ox, oy, view));
    for (const f of foes) if (!f.dead) {
      r.actor(f.x, f.y, f.z, (g, ox, oy) => f.look.draw(g, ox, oy, view), { flash: f.flash > 0 });
      if (f.slash) f.look.drawSmear(r, ['#ffffff', '#fff0d0', '#ffc890', '#e08048']);
      if (f.kind === 'mage' && f.cast > 0) { const u = 1 - f.cast / .7; r.decal(() => r.groundRing(f.x, f.y, 4 + u * 8, '#ff70d8'), { emissive: 1 }); }
    }
    if (h.hp > 0 && !(h.inv > 0 && h.hurt <= 0 && Math.floor(game.real * 15) % 2)) {
      r.actor(h.x, h.y, h.z, (g, ox, oy) => {
        h.rig.draw(g, ox, oy, view);
        if (held && held.t > 0) {   // the prize, placed through the character view
          const s = held.spr, q = view.p(0, 0, h.rig.head()[2] - h.z + 9 + bob * .5);
          px.glow(g, .35); px.sprite(g, s, Math.round(ox + q[0] - s.w / 2), Math.round(oy + q[1] - s.h));
        }
      }, { xray: true, flash: h.hurt > .15 });
      h.rig.drawSmear(r);
    }
    shots.draw(r); drawFx(r); shafts(r, room); hud(r); talk.draw(r);
  }
  // HUD in the corners: counters; hero status (live portrait) and CONTROLS at the bottom, hidden during dialog
  function hud(r) {
    const npc = talkable(), Y = r.H - 34;
    r.overlay(g => {
      E.ui.box(g, 4, 4, 66, 17, WIN); px.sprite(g, GEM, 10, 9); px.sprite(g, KEYS[0], 43, 10);
      txt(g, String(gems).padStart(3, '0'), 18, 9, '#ffffff'); txt(g, 'x' + keys, 52, 9, '#ffffff');
      if (won) {
        E.ui.box(g, r.W / 2 - 90, r.H - 62, 180, 48, WIN); E.font.title(g, 'MANA CRYSTAL!', r.W / 2, r.H - 55, { align: 'center', scale: 2, colors: ['#ffffff', '#bff8ff', '#4ac8e8'], depth: 1 });
        return txt(g, 'Gems ' + gems + '    Best ' + best('adventure', gems), r.W / 2, r.H - 28, '#ffe08a', { align: 'center' });
      }
      if (talk.open) return;
      E.ui.box(g, 4, Y, 84, 30, WIN); hero.rig.drawPortrait(g, 9, Y + 5, 20, { zoom: 1.5, cape: false, bg: FACE_BG });
      txt(g, 'HERO', 36, Y + 4, '#ffe08a', { gradient: ['#fff4c0', '#e8a040'] }); E.ui.hearts(g, 36, Y + 15, hero.hp, hero.max);
      const cx = r.W - 128;   // 'Enter Talk' blinks near a villager
      E.ui.box(g, cx, Y + 12, 124, 18, WIN); txt(g, 'J Sword', cx + 8, Y + 17, '#d8d0f0');
      txt(g, 'Enter Talk', cx + 56, Y + 17, npc && Math.floor(game.real * 3) % 2 ? '#ffe08a' : '#d8d0f0');
      if (npc) {   // a speech bubble: you can talk
        const [fx, fy] = r.w(npc.x, npc.y, 0), q = cv(r.view).p(0, 0, 44), x = Math.round(fx + q[0]), y = Math.round(fy + q[1]);
        E.ui.box(g, x - 11, y - 14, 22, 12, WIN); px.poly(g, [[x - 4, y - 3], [x + 2, y - 3], [x - 3, y + 1]], WIN.border);
        for (let k = 0; k < 3; k++) px.rect(g, x - 6 + k * 5, y - 9 - (Math.floor(game.real * 3) % 3 === k ? 1 : 0), 2, 2, '#ffe08a');
      }
      if (area.t > 0) {   // area name card slides down, then up
        const w = E.font.width(AREAS[area.room]) + 20, y = Math.round(4 - (Math.max(0, area.t - 2.3) + Math.max(0, .3 - area.t)) * 90);
        E.ui.box(g, (r.W - w) / 2, y, w, 18, WIN); txt(g, AREAS[area.room], r.W / 2, y + 5, '#ffffff', { align: 'center' });
      }
    });
  }
  return { view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: 'DEFAULT', res: 'ps1', propSize: 1.25, pausable: true, touch: ['attack', 'confirm'], enter: start, update, draw,
    state: () => ({ hero, foes, things, items, map, npcs, pets, talk }),   // for tests
    exit() { game.cam.room = null; if (gpu) gpu.enabled = false; L.enabled = false; } };
})();
scenes.adventure = ADV;
