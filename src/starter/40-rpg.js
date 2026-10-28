/* =====================================================================================
 * SLICE 4  RPG  (Dragon Quest, Final Fantasy VI / IX, Chrono Trigger: a JRPG's journey and its battles). @modules story rpg
 * Two parts in this file: the BATTLE (side-view ATB, below), as it always was at #rpg/battle and the journey's every
 * fight; then THE JOURNEY round it (a town, a world map, a cave, the boss, the menus and the saves: its own header).
 * THE BATTLE (side-view: Final Fantasy VI / IX, Chrono Trigger, Legend of Mana)
 * Three heroes (right) face a Dread Knight, a Gargoyle and a Bomb (left) on a ruined plaza at sunset. Wait-mode
 * ATB: a full gauge opens that hero's commands (Attack, skill, Defend, Potion, Run) and a glove to aim; monsters act
 * when theirs fill. Win: defeat every monster. Lose: every hero falls (Run never works here).
 * Every fighter has its own moves from E.MOVES: Rowan leaps in with an overhead chop and spins to Cleave, Lyra flings
 * sparks and casts Fire, Sera jabs with her staff, then crosses and roundhouses, and raises it to Cure; the Dread Knight
 * slashes, bashes and swings a Doom Blade, the Gargoyle dives claws first or beats up a gale, the Bomb rams or spits.
 * ANY SCREEN: the backdrop is painted at the screen's size, its ground with the plaza's own grass and light so the plaza's
 * edge melts into it, a tall screen's sky darkening to the first stars; the HUD band sits on the bottom edge and the
 * battle in the space above it (layout()). A phone held upright comes in to 1.5x (camera.tall) and the two sides close up (TALL), so the
 * fighters are as big as a wide screen shows them. TOUCH, after mobile RPGs: the band is big buttons a thumb hits (pads(): the
 * commands and AUTO, the party fighting by itself; then the targets with their HP, and BACK), the party's cards above them on
 * a phone held upright, beside them on its side; a tap on a fighter targets it too. Keys and a pad: the FF command list.
 * ===================================================================================== */
const RPG = (() => {
  /* ---- BACKDROP: a sunset painted once per screen size and zoom in crisp pixel shapes like the sprites (a turn, and a
   * zoomed-in camera following the fight, move only the plaza). Drawn for 320 x 240 and moved: ox centres it, oy puts its
   * horizon where the plaza's far edge is; the hills keep their size at any zoom, as far things do when a camera comes in ---- */
  const SKY = ['#1c1642', '#40245f', '#8a3468', '#d4565c', '#f4935c', '#ffd08a'], skyAt = y => { const f = Math.min(y / 15, 4.99), i = f | 0; return E.mix(SKY[i], SKY[i + 1], f - i); };   // a stop every 15 rows
  const SX = 288, SY = 45, CLOUDS = [[44, 13, 60], [156, 19, 84], [246, 10, 52], [98, 33, 64], [206, 36, 74], [296, 51, 46], [22, 47, 52]];   // clouds: [x, y, width]
  const TOWERS = [[116, 9, 26, 12], [127, 15, 16, 0], [144, 8, 36, 15], [154, 13, 21, 0], [169, 7, 28, 11], [178, 12, 12, 0]];   // castle: [x, width, height, roof]
  // a range: one column per x, slopes facing the sun (right) lit
  const range = (g, base, amp, s, col, lit, x0, x1) => { const h = x => amp * (.5 + .32 * (1 - Math.abs(Math.sin(x * .017 + s))) + .18 * Math.sin(x * .061 + s * 3)); for (let x = x0; x < x1; x++) px.rect(g, x, base - h(x), 1, 40, h(x + 1) < h(x - 1) ? lit : col); };
  function paintBackdrop(W, H, fy, cx, Z) {   // fy: where the camera's focus sits on screen (layout); cx, Z: the camera at rest
    const v = E.VIEWS.brawler, c = E.mkCanvas(W, H), g = E.ctx2d(c), ox = Math.round((W - 320) / 2), oy = fy - 74 - Math.round(72 * v.by * Z), sx = SX + ox, sy = SY + oy;
    // the ground from the row the plaza's far edge is on: the plaza's grass and light at the world point under each pixel (the
    // camera at rest). Laid last, over the hills' feet, so the horizon is one line on both sides of the plaza
    const im = g.createImageData(W, H), d = im.data, gy = Math.max(0, Math.round(fy - 72 * v.by * Z));
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) {
      const wx = cx + (x - W / 2) / (v.ax * Z), wy = 72 + (y - fy) / (v.by * Z), warm = clamp(.5 + (wx - PLAZA[0]) / 260 - (wy - PLAZA[1]) / 200, 0, 1), haze = clamp(1 - wy / 70, 0, 1) * .45, k = 1.08 - clamp(wy - 70, 0, 110) / 400;
      const q = E.tex.grass(wx, wy, GRASS), o = (y * W + x) * 4; for (let i = 0; i < 3; i++) d[o + i] = lerp(lerp(q[i] * k, lerp(COOL[i], WARM[i], warm), .28), HAZE[i], haze); d[o + 3] = 255;
    }
    for (let y = 0; y < 100 + oy; y++) {   // sky rows (above the painting, a tall screen's: night coming), a smooth sun glow (no bands, no dither)
      const s = y < oy ? E.mix('#07061a', SKY[0], clamp(1 - (oy - y) / 170, 0, 1)) : skyAt(y - oy); px.rect(g, 0, y, W, 1, s);
      if (y < oy + 24) for (let x = 0; x < W; x++) { const h = E.hash2(x * 3 + 1, y * 5 + 2); if (h > .9965 - clamp((oy - y) / 4000, 0, .004)) px.dot(g, x, y, h > .9993 ? '#ffffff' : E.mix(s, '#fff0d8', .6)); }   // the first stars
      for (let x = Math.max(0, sx - 100); x < Math.min(W, sx + 100); x++) { const k = 1 - Math.hypot((x - sx) / 2.6, y - sy) / 36; if (k > 0) px.dot(g, x, y, E.mix(s, '#ffe8b8', k * k * .85)); }
    }
    g.translate(ox, oy);   // the rest is drawn as for 320 x 240, the far hills and trees running on across a wide screen
    const x0 = -ox - 4, x1 = W - ox + 6;
    px.disc(g, SX, SY, 12, '#fff0c0'); px.disc(g, SX - 1, SY - 1, 10, '#fffcec');   // a hard-edged sun
    for (const [cx, y, w] of CLOUDS) for (let x = cx - 320 * Math.ceil(ox / 320); x < x1 + w; x += 320) {   // flat-bottomed puffs lit from below, warmer near the horizon
      const k = clamp(y / 50, 0, 1), body = E.mix('#4a2a62', '#b4587a', k), lit = E.mix('#9a4a78', '#f09a88', k);
      for (const [dx, dy, rx, col] of [[0, 0, .5, body], [-.14, -2.5, .24, body], [.16, -1.5, .2, body], [.04, 1.5, .42, lit]]) px.ell(g, x + dx * w, y + dy, rx * w, 2.8, col);
      px.rect(g, x - w * .34, y + 3, w * .68, 1, E.mix('#e0808a', '#fff0c0', k));
    }
    range(g, 66, 20, 1, '#c47c90', '#eaa4a0', x0, x1);   // the far range, pale with haze
    for (const [x, w, h, roof] of TOWERS) {   // a hazy castle
      const top = 76 - h;
      px.rect(g, x, top, w, h, '#74446e'); px.rect(g, x + w - 2, top, 2, h, '#e8908e'); px.rect(g, x + (w >> 1), top + 5, 1, 2, '#ffd27a');
      if (roof) { px.poly(g, [[x - 1, top], [x + w + 1, top], [x + w / 2, top - roof]], '#5c3462'); px.poly(g, [[x + w / 2, top], [x + w + 1, top], [x + w / 2, top - roof]], '#c87282'); }
      else for (let bx = x; bx < x + w; bx += 3) px.rect(g, bx, top - 2, 2, 2, '#74446e');
    }
    px.blend(g, .3, 'normal', () => px.rect(g, 96, 66, 110, 10, '#ffc0a0'));   // mist at the castle's foot
    range(g, 77, 9, 5, '#8a4a74', '#c06a7c', x0, x1);   // near hills in front of it
    for (let x = x0 - ((x0 - 1) % 5 + 5) % 5; x < x1; x += 5) { const r = 4 + 3 * E.noise2(x * .09, 3), y = 79 - r * .7; px.disc(g, x + 1, y - 1, r, '#b25c5e'); px.disc(g, x, y, r, '#2e2040'); }   // treeline, rim-lit
    g.putImageData(im, 0, 0, 0, gy, W, H - gy); return c;   // the ground over its foot
  }
  // where things go on this screen: the HUD band's top (Y: on the bottom edge, a little higher on a phone, off its home
  // bar), the camera focus's height on screen (fy: the battle just above the band, or on a tall screen 3/5 down the sky,
  // a phone held upright's a little lower: its fight is bigger)
  const layout = (W, H) => { const Y = game.input.lastDevice === 'touch' ? pads(W, H).Y : H - 73; return { Y, fy: Math.round(Math.min(Y - 47, 40 + (Y - 40) * (game.upright ? .66 : .6))) }; };
  // TOUCH: a 3 x 2 grid of buttons 38 px tall (44 CSS px and more on a phone, an iPhone SE's too: a thumb), the party's 214 px of cards above it
  // on a tall screen (the grid as wide as the screen), beside it on a wide one; 8 px off a phone's home bar. cell(i): pad i's box
  const pads = (W, H) => {
    const tall = W < 440, ch = 38, gap = 4, gh = ch * 2 + gap, cw0 = 214, gw = tall ? Math.min(W - 8, 312) : Math.min(W - cw0 - 14, 300);
    const Y = H - (tall ? 66 + gap + gh : Math.max(66, gh)) - 8, x0 = Math.round(tall ? (W - gw) / 2 : (W - gw - 6 - cw0) / 2), gy = tall ? Y + 66 + gap : Y, cw = Math.floor((gw - gap * 2) / 3);
    return { Y, cards: tall ? Math.round((W - cw0) / 2) : x0 + gw + 6, cell: i => ({ x: x0 + (i % 3) * (cw + gap), y: gy + Math.floor(i / 3) * (ch + gap), w: cw, h: ch }) };
  };
  let backdrop = null;   // painted on the first draw, again for a new screen size or zoom
  // the camera at rest: on a phone held upright (game.upright) it comes in to 1.5x and the sides close up toward x 119 (spread),
  // so the fight fills the narrow screen's width, each rank opening out in depth from y 84 (deep) so nobody hides behind
  // the one in front; x: where it looks
  const TALL = { zoom: 1.5, spread: .6, deep: 1.25, x: 111 }, WIDE = { zoom: 1, spread: 1, deep: 1, x: 110 }, rest = () => game.upright ? TALL : WIDE;

  /* ---- FLOOR: a round cobbled plaza (a ground circle projects to a wide ellipse: reads as floor). floorTex runs
   * once per pixel when the floor is baked, so light, shadows and wear cost nothing per frame ---- */
  const PLAZA = [110, 98], STONES = ['#ac969c', '#978290', '#baa4a6', '#8a7688', '#a48c86'].map(E.hex), MORTAR = E.hex('#48364a'), MOSS = E.hex('#586e3a');
  const GRASS = { base: '#5e7c3c', dark: '#41602f', light: '#7c9a4a', flower: '#ffd6e4' }, WARM = E.hex('#ffb070'), COOL = E.hex('#40347a'), HAZE = E.hex('#eea08a');
  const SUN = [.8, -.6];   // toward the low sun
  const CASTERS = [[100, 8, 30, 3], [132, 6, 30, 3], [220, 20, 84, 9], [196, 28, 24, 6], [212, 58, 20, 3], [24, 14, 44, 12], [212, 8, 40, 5]];   // [x, y, length, width] of long shadows
  const cobble = (x, y) => {   // Voronoi cobbles: the nearest jittered cell center owns a pixel
    let d1 = 99, d2 = 99, id = 0, lit = 0; const gx = Math.floor(x / 13), gy = Math.floor(y / 10);
    for (let j = -1; j < 2; j++) for (let i = -1; i < 2; i++) {
      const cx = (gx + i + E.hash2(gx + i, gy + j)) * 13, cy = (gy + j + E.hash2(gy + j, gx + i + 7)) * 10, d = Math.hypot(x - cx, (y - cy) * 1.2);
      if (d < d1) { d2 = d1; d1 = d; id = E.hash2(cx, cy); lit = ((x - cx) * SUN[0] + (y - cy) * SUN[1]) / (d + 1); } else if (d < d2) d2 = d;
    }
    return [d2 - d1, id, lit];   // joint distance, stone id, -1..1 facing the sun
  };
  const floorTex = (x, y) => {
    const dx = x - PLAZA[0], dy = y - PLAZA[1], d = Math.hypot(dx, dy) + E.noise2(x * .06, y * .06) * 5, wild = E.noise2(x * .05, y * .08) + d / 120, [gap, id, lit] = cobble(x, y);
    let c;
    if (d > 100 || wild > 1.3 || id < .04) c = E.tex.grass(x, y, GRASS);                                                      // grass around the plaza and where stones are gone
    else if (d < 17) c = E.hex(d < 5 + 8 * Math.abs(Math.cos(Math.atan2(dy, dx) * 4)) ? '#d8b868' : d > 14 ? '#c8a860' : '#5e5070');   // a golden star inlaid at the center
    else if (gap < 1.3 || Math.abs(d - 19) < 1.1 || Math.abs(d - 96) < 1.1) c = wild > .95 ? MOSS : MORTAR;                         // joints (mossy toward the rim) and two curb rings
    else c = STONES[id * 5 | 0].map(v => v * (gap < 3.2 ? 1 + lit * .24 : 1 - E.hash2(x | 0, y | 0) * .06) * (wild > .9 ? .9 : 1));   // bevels lit on the sun side, grain, worn stones
    const shade = CASTERS.some(([sx, sy, len, w]) => { const vx = x - sx, vy = y - sy, a = -(vx * SUN[0] + vy * SUN[1]); return a > 0 && a < len && Math.abs(vx * SUN[1] - vy * SUN[0]) < w * (1 - a / len * .5); });
    const warm = clamp(.5 + dx / 260 - dy / 200, 0, 1), haze = clamp(1 - y / 70, 0, 1) * .45, k = (1.08 - clamp(y - 70, 0, 110) / 400) * (shade ? .66 : 1);
    return c.map((v, i) => lerp(lerp(v * k, shade ? COOL[i] : lerp(COOL[i], WARM[i], warm), shade ? .3 : .28), HAZE[i], haze));   // warm toward the sun, cool shadows, hazy far edge
  };
  // broken wall stubs at the back left
  const WALL = { top: '#8a9a5a', side: '#7a6478', line: '#4a3848', face: 'ruin', roof: 'grass' };   // face: a MATERIAL (stones, cracks, moss, dirt; docs/ASSETS.md)
  const plaza = new E.TileMap({ rows: ['21............', ...Array(11).fill('..............')], legend: { 1: 1, 2: 2 }, types: { 1: { ...WALL, h: 12 }, 2: { ...WALL, h: 24 } }, floorTex });
  // [prop, x, y, z, options]: pillars frame the sides; braziers stand clear of the fighters (a dimmed scene lights their glow)
  const PROPS = [['vines', 26, 17, 12, { anchor: 'top', size: .5 }], ['pillar', 8, 46, 0], ['vines', 9, 47, 44, { anchor: 'top' }], ['pillar', 212, 8, 0, { broken: true }],
    ['brazier', 100, 8, 0, { haloR: 16 }], ['brazier', 132, 6, 0, { haloR: 16 }],
    ['bush', 22, 26, 0, { color: '#4a7a3a' }], ['bush', 196, 28, 0, { color: '#4a7a3a', berries: '#e04a6a' }],
    ['mushroom', 18, 60, 0, { size: .7, color: '#c8603a' }], ['mushroom', 206, 42, 0, { size: .5, color: '#c8a0e8' }],
    ['skull', 34, 150, 0], ['bones', 128, 150, 0], ['grass', 150, 146, 0], ['flowers', 16, 110, 0, { color: '#b08aff' }]];
  // [shape, x, y, options]: SHAPES (docs/ASSETS.md) are objects as data, right in every view and turn: the trees grow from
  // a generator's params, the mats recolor a slot ('#hex pattern', or any material id)
  const SHAPES = [['tree', -2, 22, { params: { h: 46, seed: 3 }, mats: { l: '#3e6a3a foliage size=3' } }], ['pine', 220, 20, { scale: 1.1, mats: { l: '#2e5a44 foliage size=3' } }],
    ['rock', 10, 140, { facing: 1 }], ['crystal', 212, 58, { params: { h: 14 } }], ['barrel', 146, 14, { scale: .8, facing: 2 }], ['crate', 158, 4, { scale: .7, facing: .3 }],
    // a broken column from the asset store, cut into the page's 'rpg' set (src/assets/sets/rpg.js; none without it)
    ...(E.addAssets((window.ASSETS || {}).rpg || { set: 'rpg' }).shapes.length ? [['rpg:statue-column-damaged', 190, 8, { scale: 1.15, facing: 1.3, mats: { a: '#9a9282 speck' } }]] : [])];

  /* ---- THE CAVE (the journey's battles under the mountain): darkness and hanging stone for a sky, a lit rock wall with
   * crystals in it, a floor of wet stone, the party's torches and the crystals' glow lighting it ---- */
  function paintCave(W, H, fy, Z) {
    const c = E.mkCanvas(W, H), g = E.ctx2d(c), gy = Math.round(fy - 72 * E.VIEWS.brawler.by * Z) + 2;   // the floor's far edge
    for (let y = 0; y < H; y++) px.rect(g, 0, y, W, 1, E.mix('#040308', '#2a2238', clamp(y / Math.max(1, gy), 0, 1) ** 1.6));   // dark above, the wall lit near the floor
    for (let x = 0; x < W; x++) { const h = gy - 10 - 26 * E.noise2(x * .02, 7) - 6 * E.noise2(x * .11, 2); px.rect(g, x, h, 1, gy - h + 2, E.mix('#241c30', '#43384f', E.noise2(x * .3, 4) * .5)); px.dot(g, x, h, '#5a4c66'); }   // ledges of rock
    for (let x = -2; x < W; x += 5) { const h = 10 + 34 * E.noise2(x * .04, 1) + 10 * E.hash2(x, 3); px.poly(g, [[x, 0], [x + 5, 0], [x + 2.5, h]], '#0c0a14'); px.line(g, x + 3, h * .4, x + 2.5, h - 1, '#2a2438'); }   // stalactites
    for (let k = 0; k < Math.ceil(W / 40); k++) {   // crystals grown into the wall, catching the torchlight
      const x = Math.round(E.hash2(k, 5) * W), y = Math.round(gy - 16 - E.hash2(k, 6) * 26);
      px.poly(g, [[x, y - 10], [x + 3, y - 1], [x, y + 2], [x - 3, y - 1]], '#3a9ad8'); px.poly(g, [[x, y - 10], [x + 3, y - 1], [x, y - 2]], '#8ae0ff'); px.rect(g, x - 1, y - 7, 1, 4, '#e8fbff');
    }
    return c;
  }
  const caveTex = (x, y) => {   // wet stone: cobbles with dark joints, puddles that catch the light, moss in the cracks
    const [gap, id, lit] = cobble(x * .8, y * .8), wet = E.noise2(x * .05, y * .07), k = 1.1 - clamp(y - 60, 0, 110) / 300;
    const c = gap < 1.4 ? (wet > .72 ? [40, 70, 52] : [22, 18, 30]) : wet > .78 ? [52, 70, 96] : [60 + id * 22, 52 + id * 18, 72 + id * 20].map(v => v * (1 + lit * .2));
    return c.map(v => v * k);
  };
  const cavern = new E.TileMap({ rows: ['21............', ...Array(11).fill('..............')], legend: { 1: 1, 2: 2 }, types: { 1: { top: '#5a4c66', side: '#3a3048', line: '#1a1424', face: 'rock', roof: 'plain', h: 14 }, 2: { top: '#5a4c66', side: '#3a3048', line: '#1a1424', face: 'rock', roof: 'plain', h: 26 } }, floorTex: caveTex });
  const CAVE_PROPS = [['mushroom', 18, 60, 0, { size: .8, color: '#6ad8a0' }], ['mushroom', 206, 42, 0, { size: .6, color: '#c8a0e8' }], ['skull', 34, 150, 0], ['bones', 128, 150, 0], ['bones', 190, 20, 0]];
  const CAVE_SHAPES = [['rock', 10, 140, { facing: 1, params: { r: 10, seed: 4 } }], ['rock', 212, 16, { params: { r: 12, seed: 7 } }], ['crystal', 212, 58, { params: { h: 18 } }], ['crystal', 8, 30, { params: { h: 14, seed: 3 } }],
    ['crystal', 150, 4, { params: { h: 11, seed: 2 } }], ['rock', 160, 150, { params: { r: 6, seed: 9 } }]];

  /* ---- MONSTERS: extras painted inside the same r.actor get the engine's outline, rim light and hit flash.
   * (x, y) = the feet on screen, v = the view ---- */
  // a shaded volume: dark body, lit core, highlight, spec
  const ball = (g, x, y, rx, ry, c) => { const t = E.tones(c); px.ell(g, x, y, rx, ry, t.sh); px.ell(g, x - rx * .15, y - ry * .18, rx * .78, ry * .74, t.base); px.ell(g, x - rx * .38, y - ry * .42, rx * .32, ry * .26, t.lt); px.dot(g, x - rx * .45, y - ry * .55, t.hi); };
  // a flame tongue: red, orange, white-hot layers
  const flame = (g, x, y, w, h, k) => { const s = Math.sin(k) * w * .6; for (const [f, c] of [[1, '#d8381a'], [.66, '#ffa030'], [.34, '#fff2b0']]) px.poly(g, [[x - w * f, y], [x - w * f * .8 + s * .3, y - h * f * .45], [x + s * f, y - h * f], [x + w * f * .7 + s * .5, y - h * f * .5], [x + w * f, y]], c); };
  function gargoyle(g, x, y, f) {   // all paint, in side profile, perched on the ruin; f = wing beat -1..1
    const S = '#7a7090', st = E.tones(S), bone = '#e8dcc8';
    const wing = (dx, col, k) => {   // bat wing: arm and finger bones, membrane panels
      const w = E.tones(col), e = [x - 6 + dx, y - 36 - f * 5 * k], T = [[x - 32 + dx, y - 36 + f * 6 * k], [x - 36 + dx, y - 19 + f * 5 * k], [x - 25 + dx, y - 8 + f * 3 * k]];
      px.poly(g, [e, T[0], [x - 25 + dx, y - 27 + f * 5 * k], T[1]], w.base); px.poly(g, [e, T[1], [x - 23 + dx, y - 16 + f * 4 * k], T[2]], w.sh); px.poly(g, [[x + dx, y - 22], e, T[2], [x - 4 + dx, y - 12]], w.deep);   // panels darken toward the body
      for (const p of T) px.line(g, e[0], e[1], p[0], p[1], w.lt); px.line(g, x + dx, y - 22, e[0], e[1], w.hi, 2); px.dot(g, e[0], e[1] - 1, bone);   // finger bones, arm, thumb claw
    };
    wing(9, '#4a3c64', .8);                                                                                   // far wing, darker
    px.line(g, x - 6, y - 4, x - 17, y + 1, st.sh, 2); px.poly(g, [[x - 17, y - 2], [x - 22, y + 3], [x - 15, y + 5]], st.sh);   // tail with a spade tip
    ball(g, x - 1, y - 4, 5, 4, S); px.line(g, x + 1, y - 1, x + 3, y + 3, st.sh, 2); for (const d of [0, 2, 4]) px.dot(g, x + 1 + d, y + 4, bone);   // haunch, shin, talons
    ball(g, x + 2, y - 14, 7, 9, S); for (const d of [0, 3, 6]) px.rect(g, x + 4, y - 16 + d, 4, 1, st.lt);   // torso and belly plates
    wing(0, '#6a5884', 1);                                                                                    // near wing
    ball(g, x + 9, y - 26, 6, 5, S); px.ell(g, x + 14, y - 23, 3, 2, st.base);                                // head and snout
    px.poly(g, [[x + 5, y - 29], [x - 4, y - 39], [x + 2, y - 30]], bone); px.poly(g, [[x + 9, y - 30], [x + 6, y - 41], [x + 11, y - 31]], '#d0c4b0');   // horns
    px.line(g, x + 8, y - 29, x + 13, y - 28, st.deep); px.rect(g, x + 10, y - 27, 3, 1, '#ffe040'); px.dot(g, x + 12, y - 27, '#ff3020');   // brow ridge over a glowing eye
    px.line(g, x + 11, y - 21, x + 16, y - 22, '#2a1020'); px.dot(g, x + 13, y - 20, '#ffffff'); px.dot(g, x + 15, y - 21, '#ffffff');   // fanged mouth
    px.line(g, x + 6, y - 16, x + 13, y - 12, st.base, 2); for (const d of [-1, 1, 3]) px.line(g, x + 13, y - 12, x + 16, y - 12 + d, bone);   // arm and claws
  }
  // each of 9 wing-beat steps is painted once and reused, tilted around the torso (c.tilt: leaning into a dive, a tumble).
  // The wind-up holds the wings high, the strike beats them down. r.actor tracks the area of plain draws only, so the tilt
  // happens on a scratch canvas first
  const GARG = [], TILT = E.ctx2d(E.mkCanvas(104, 104)), gargoyleCached = (g, x, y, c, v) => {
    const k = Math.round(lerp(Math.sin(c.flapT * 7), Math.sign(c.coil), Math.min(1, Math.abs(c.coil) * 1.5)) * 4) + 4; if (!GARG[k]) gargoyle(E.ctx2d(GARG[k] = E.mkCanvas(64, 54)), 42, 47, k / 4 - 1);
    TILT.setTransform(1, 0, 0, 1, 0, 0); TILT.clearRect(0, 0, 104, 104); TILT.translate(52, 52); TILT.rotate(c.tilt); TILT.drawImage(GARG[k], -42, -27);
    const z = v.scale / E.VIEWS.brawler.scale;   // zoomed in (a phone held upright: 1.5x), it grows as the painted fighters do, pixels kept square
    if (z === 1) g.drawImage(TILT.canvas, x - 52, y - 72); else g.drawImage(TILT.canvas, Math.round(x - 52 * z), Math.round(y - 72 * z), Math.round(104 * z), Math.round(104 * z));
  };
  // a Blob's body center (pixels above its feet) and radius
  const blobAt = (c, v) => { const b = c.body, R = b.o.R * b.scale; return [v.p(0, 0, R * (1 + b.sq))[1], R * v.scale]; };
  // the Bomb: flames behind the body, tallest on top...
  const bombBack = (g, x, y, c, v, t) => {
    const [cy, R] = blobAt(c, v);
    for (let i = 0; i < 9; i++) { const a = -3.5 + i * .4, up = Math.max(0, -Math.sin(a)); flame(g, x + Math.cos(a) * R * .8, y + cy + Math.sin(a) * R * .75 + 3, 3 + up * 2, 6 + up * up * 13 + 3 * Math.sin(t * 13 + i * 2), t * 11 + i); }
  };
  // ...and a hot core and a toothy grin in front
  const bombFront = (g, x, y, c, v) => {
    const [cy, R] = blobAt(c, v), mx = x + R * .22, my = y + cy + R * .3;
    px.ell(g, x - R * .2, y + cy + R * .6, R * .38, R * .18, '#ffc050'); px.poly(g, [[mx - R * .55, my], [mx + R * .55, my], [mx + R * .3, my + R * .42], [mx - R * .3, my + R * .42]], '#4a0a0a');
    for (const d of [-.32, 0, .32]) px.poly(g, [[mx + (d - .1) * R, my], [mx + (d + .1) * R, my], [mx + d * R, my + R * .22]], '#ffffff');
  };
  // a rig joint on screen: rig.worldOffset gives where a point in the rig's frame sits, v.p projects it
  const joint = (c, v, x, y, k, f = 0, s = 0, z = 0) => { const J = c.rig.J[k], w = c.rig.worldOffset([J[0] + f, J[1] + s, J[2] + z]), q = v.p(w[0], w[1], w[2]); return [x + q[0], y + q[1]]; };
  // the Dread Knight's plate: knee cops, shins, horns, a faceplate
  function knightPlate(g, x, y, c, v) {
    const m = E.tones('#b4bed8'), P = (k, f, s, z) => joint(c, v, x, y, k, f, s, z), r = c.rig.o.headR * c.rig.o.size * v.scale;
    for (const s of 'LR') { const [kx, ky] = P('knee' + s, .9), [ax, ay] = P('foot' + s, .4, 0, 2); px.line(g, kx, ky + 2, ax, ay, m.sh, 2); px.line(g, kx - 1, ky + 2, ax - 1, ay, m.lt); px.disc(g, kx, ky, 3.5, m.deep); px.disc(g, kx - .5, ky - .5, 2.6, m.base); px.dot(g, kx - 1, ky - 1, m.hi); }
    const [hx, hy] = P('head', 0, 0, 2.6), [fx, fy] = P('head', 2.3, 0, -.3);
    for (const s of [-1, 1]) { const [bx, by] = P('head', 0, s * 2.4, 1.6), [mx, my] = P('head', -.5, s * 5.4, 2.8), [tx, ty] = P('head', 1, s * 6, 6); px.poly(g, [[bx - 3, by + 1], [mx - 1, my - 1], [tx, ty], [mx + 1, my + 2], [bx + 3, by]], s < 0 ? '#a89c88' : '#e8dcc8'); }
    px.line(g, hx - r * .5, hy + 1, hx + r * .3, hy, m.hi);                                                               // light on the helm's crown
    px.disc(g, fx, fy, r * .55, m.sh); px.disc(g, fx - .5, fy - .5, r * .45, m.base); px.rect(g, fx - r * .5, fy - 2, r, 3, '#12060c');   // faceplate, eye slit,
    px.rect(g, fx - 1, fy - 1, 4, 1, '#ff5030'); px.dot(g, fx + 1, fy - 1, '#ffd0a0'); for (const d of [0, 2, 4]) px.dot(g, fx + d - 2, fy + 4, '#12060c');   // a red glare, breath holes
  }

  /* ---- CAST. Heroes face left, turned to the camera (turn). Builds (tuned by shoulderHalf, limbW, hunch...), hair,
   * hats and eyes differ. Robes need pants in the robe color, or the dark default shows through as holes.
   * attack and skill name MOVES below: no two heroes share a swing ---- */
  const PARTY = [
    { name: 'Rowan', hp: 96, mp: 16, atk: 14, spd: .45, atb: 1, attack: 'chop', skill: 'cleave', x: 158, y: 42, turn: .55, stance: 'ready', smear: ['#ffffff', '#fff6c8', '#ffd870', '#f0a040'],   // leads: his gauge starts full
      rig: { build: 'heroic', size: 1.35, headR: 3.6, shoulderHalf: 4.1, torsoW: 3.5, footSpread: 2.8, lean: .1, face: { bangs: .6 }, armor: true, outfit: 'tunic', hair: 'spiky', bladeLen: 15,
        colors: { cloth: '#2c5cc0', pants: '#8a6a4a', boot: '#4a2a1a', hair: '#7a4020', trim: '#e8c860', hilt: '#b08040', glove: '#6a4a3a', eye: '#1a3a8a' } } },
    { name: 'Lyra', hp: 62, mp: 30, atk: 8, spd: .38, attack: 'spark', skill: 'fire', x: 182, y: 84, turn: .7, rig: { build: 'heroic', size: 1.2, headR: 3.8, shoulderHalf: 2.8, limbW: 1.6, torsoW: 2.5, hunch: .3, face: { eyes: 'big', bangs: .3 }, weapon: 'staff', outfit: 'robe', hair: 'long', sleeves: 'long',
      hat: { style: 'pointed', color: '#3a2a7a' }, colors: { cloth: '#6a3ab8', pants: '#5a2e9e', trim: '#f0c860', hair: '#e0602a', orb: '#ff9040', staff: '#6a4a2a', boot: '#3a2a4a', eye: '#2a6a3a' } } },   // a stooped, slender black mage
    { name: 'Sera', hp: 74, mp: 26, atk: 9, spd: .42, attack: 'flurry', skill: 'cure', x: 204, y: 126, h: 34, turn: .9, rig: { size: 1.3, headR: 3.6, face: { eyes: 'big', bangs: .8 }, weapon: 'staff', outfit: 'robe', hair: 'ponytail', sleeves: 'long',   // chibi build
      hat: { style: 'band', color: '#c83a4a' }, colors: { cloth: '#f2eee2', pants: '#e2dccc', trim: '#c83a4a', hair: '#5a3424', orb: '#8affc0', staff: '#c8a060', boot: '#8a5a3a', eye: '#7a3ad0' } } }];   // brown hair, a red ribbon
  // painted monsters: pounce = [px back, px up] at the top of the wind-up (mirrored in the strike). Placed so the spot
  // a hero attacks each foe from (at its right) is clear of the others: nobody lands on the Bomb's head
  const TROOP = [
    { name: 'Dread Knight', hp: 120, atk: 14, spd: .3, moves: ['rend', 'bash', 'doom'], x: 72, y: 70, stance: 'ready', front: knightPlate, debris: ['#454a68', '#aab4d0', '#a01c2c'], smear: ['#ffffff', '#ffe0e0', '#ff8a8a', '#e04058'],
      rig: { build: 'bulky', size: 2.3, armor: true, sleeves: 'long', hair: 'bald', hat: { style: 'helmet', color: '#7a84a6' }, bladeLen: 17, cape: { len: 8, width: 8, seg: 2.8 },
        colors: { cloth: '#4a5274', pants: '#5c6486', boot: '#444860', glove: '#6a7090', skin: '#12060c', metal: '#aab4d0', cape: '#a01c2c', capeIn: '#7a1c32', trim: '#d8a840' } } },
    { name: 'Gargoyle', hp: 44, atk: 10, spd: .5, moves: ['dive', 'gale'], x: 34, y: 40, z: 30, h: 40, pounce: [8, 3], front: gargoyleCached, debris: ['#7a7090', '#44365a', '#e8dcc8'] },
    { name: 'Bomb', hp: 34, atk: 9, spd: .42, moves: ['tackle', 'blaze'], x: 38, y: 132, z: 8, h: 26, pounce: [12, 3], debris: ['#e0502a', '#ffb040', '#fff2b0'], back: bombBack, front: bombFront,
      blob: { R: 8.5, face: 'front', colors: { dk: '#8a1a14', base: '#e8582a', lt: '#ffb048', spec: '#fff6c0', eye: '#ffffff', pupil: '#1a0a0a' } } }];

  // the journey's monsters (below): its troops name these, each standing in the next of SLOTS (a flier keeps its height);
  // their hp, atk, def and spd come from the journey's rules
  const KIN = { knight: TROOP[0], gargoyle: TROOP[1], bomb: TROOP[2],
    slime: { name: 'Slime', moves: ['tackle'], h: 20, pounce: [10, 2], debris: ['#2a8a3a', '#6ad86a', '#e8ffd8'], blob: { R: 7, face: 'front', colors: { dk: '#1a5a2a', base: '#4ac85a', lt: '#9af090', spec: '#f0fff0', eye: '#ffffff', pupil: '#0a1a0a' } } },
    goblin: { name: 'Goblin', moves: ['rend', 'bash'], stance: 'ready', debris: ['#4a6a2a', '#8ab84a', '#c8d0d8'], smear: ['#ffffff', '#e8ffd0', '#b0e070', '#70a040'],
      rig: { build: 'bulky', size: 1.35, bladeLen: 9, outfit: 'tunic', hair: 'bald', eyeGlow: '#ffd84a', colors: { skin: '#7ab048', cloth: '#6a4a2a', pants: '#4a3a2a', boot: '#3a2a1a', metal: '#a0a8b0', glove: '#5a7a30' } } } };
  const SLOTS = [[72, 70], [38, 128], [40, 26], [100, 110], [104, 34]];

  /* ---- MOVES: power (x atk) or heal, MP, how the user gets there (go: dash, leap, swoop, hop, step, flee), charge (seconds
   * in the cast pose), the swing: anim = a move from E.MOVES or an E.Attack with overrides (a list chains as an E.Combo,
   * one blow per hit) or, for painted monsters and plain commands, time = a timing-only spec whose phases drive the paint.
   * A blow lands on its impact frame, a bolt or cut when it arrives, a wave (its colors) as it passes each foe.
   * Monsters wind up longer: the player can read them coming ---- */
  const MOVES = {
    chop:   { power: 1, go: 'leap', anim: 'overhead', info: 'Leap in and cut one foe' },
    cleave: { label: 'Cleave', power: .8, mp: 8, all: true, go: 'step', anim: 'spin', wave: ['#284a9a', '#8ad8ff', '#ffffff'], info: 'Sweep every foe' },
    spark:  { power: 1, go: 'step', anim: 'throw', bolt: '#c890ff', info: 'Fling a spark at one foe' },
    fire:   { label: 'Fire', power: 3, mp: 6, go: 'step', charge: .7, anim: new E.Attack('cast', { a0: 2, wind: .3 }), bolt: '#ff9040', fx: 'flame', info: 'Burn one foe' },   // the staff up and back, then flung forward
    flurry: { power: 1.5, go: 'dash', anim: [new E.Attack('jab', { hand: 'R', lunge: 2.5 }), new E.Attack('cross', { hand: 'L' }), 'roundhouse'], info: 'Three blows on one foe' },   // staff butt, fist, foot
    cure:   { label: 'Cure', heal: 34, mp: 5, ally: true, go: 'step', charge: .6, anim: new E.Attack('rising', { a0: -.6, wind: .2 }), info: 'Heal one ally' },   // a small dip, the staff raised to the sky
    defend: { label: 'Defend', guard: true, pose: 'block', info: 'Halve damage till next turn' },   // the weapon upright across the body
    potion: { label: 'Potion', heal: 40, ally: true, pose: 'cheer', item: true, time: { wind: .4, active: .05, recover: .4 }, info: 'Restore 40 HP' },   // the bottle held up high
    run:    { label: 'Run', go: 'flee', info: 'Try to escape' },
    rend:   { power: 1, go: 'dash', anim: new E.Attack('slash', { wind: .3 }) },
    bash:   { power: 1.2, go: 'dash', pose: 'block', anim: new E.Attack('bash', { wind: .4, a0: 1.6, a1: -.1, r0: 2.5, r1: 4.5, z0: -3, crouch: .7, lean: .35, lunge: 2.6 }) },   // hands to the hip, then a pommel shove, blade upright
    doom:   { label: 'Doom Blade', power: 1.7, anim: new E.Attack('twohand', { wind: .6, active: .2 }), fx: 'doom' },   // a slow, heavy cut (its trail curves) that flies from where he stands
    dive:   { power: 1, go: 'swoop', time: { wind: .5, active: .12, recover: .4 }, fx: 'claw' },
    gale:   { label: 'Gale', power: .7, all: true, time: { wind: .6, active: .12, recover: .45 }, wave: ['#4a3c64', '#c8bcd8', '#fff8f0'] },   // wings up, one great beat
    tackle: { power: 1, go: 'hop', time: { wind: .45, active: .14, recover: .4 } },
    blaze:  { label: 'Blaze', power: 1.3, time: { wind: .6, active: .1, recover: .35 }, bolt: '#ff8a2a', fx: 'flame' }
  };
  const PAUSE = { wind: .2, active: .05, recover: .35 }, GO = .35, BACK = .4, FLY = .3, DIE = .9, WAVE = 400;   // seconds: out, back, a bolt's flight, a monster's death; a wave's speed
  const COMMANDS = h => [h.attack, h.skill, 'defend', 'potion', 'run'];
  let party, foes, all, menu, log, act, fx, mode, actor, list, cursor, pending, potions, note, t, dim, cam, yaw, band, frame = 0, auto = false;   // band: the HUD on screen (taps); auto: the party fights by itself
  // D: the journey's battle ({ troop: [ids], party: its E.RPG party, stats: its monsters, cave, boss, done(result) }), or
  // null: the battle as it always was (#rpg/battle); won: its spoils; drank: the potions used
  const alive = l => l.filter(c => !c.dead), isHero = c => party.includes(c), size = c => c.rig ? c.rig.o.size : 1.2;
  const unit = (d, hero) => {
    const body = d.rig ? new E.Humanoid(d.rig) : d.blob && new E.Blob(d.blob);   // both kick() and draw()
    return Object.assign({}, d, { body, rig: d.rig && body, max: d.hp, mp: d.mp || 0, home: [d.x, d.y], hx: d.x, hy: d.y, hz: d.z || 0, z: d.z || 0, px: d.x, py: d.y, atb: d.atb || (hero ? E.rand(.3, .7) : E.rand(0, .3)),
      face: hero ? Math.PI - d.turn : .75, flash: 0, glow: 0, shake: 0, grow: 0, coil: 0, flee: 0, tilt: 0, flapT: 0, bob: 0, die: 0, fade: hero ? 1 : 0, dead: false, guard: false, h: d.h || (d.rig.build === 'bulky' ? 29 : 31) * d.rig.size });
  };
  let D = null, won = null, drank = 0;
  // a member of the journey's party as a fighter: its look from PARTY, its numbers from its stats (spd scaled by haste and slow)
  const fighter = m => {
    const d = PARTY.find(p => p.name === m.name) || PARTY[0], u = unit(Object.assign({}, d, { hp: m.max('hp'), mp: m.max('mp'), atk: m.stat('atk'), def: m.stat('def'), spd: d.spd * m.stat('spd') / m.base.spd }), true);
    u.hp = Math.max(0, m.hp); u.mp = m.mp; u.member = m; if (m.dead) Object.assign(u, { dead: true, die: DIE, atb: 0 }); return u;
  };
  const monster = (id, i) => { const k = KIN[id] || KIN.slime, st = D.stats[id] || {}, at = SLOTS[i % SLOTS.length]; return unit(Object.assign({}, k, { hp: st.hp || k.hp, atk: st.atk || k.atk, def: st.def || 0, spd: st.spd || k.spd || .4, x: at[0], y: at[1] }), false); };
  function start(data) {
    D = data && data.troop ? data : null; won = null; drank = 0;
    party = D ? D.party.members.map(fighter) : PARTY.map(d => unit(d, true)); foes = D ? D.troop.map(monster) : TROOP.map(d => unit(d, false)); all = [...party, ...foes]; place();
    for (const c of all) { c.x = c.px = c.hx + (isHero(c) ? 70 : 0); c.y = c.py = c.hy; }   // intro: the party runs in, the monsters fade in
    log = new E.Dialog(game, { place: 'top', lines: 2, speed: 70, bg: WIN }); menu = new E.Menu(game, [], { onPick: pick });   // E.Menu reads the keys; hud() draws it
    act = null; fx = []; potions = D ? D.party.inv.count('potion') : 3; note = ''; t = 0; dim = 0; cam = [rest().x, 72, 0]; mode = 'intro'; game.cam.bounds = null; L.enabled = false;
    A.music(D && !D.boss ? D.music || 'boss' : 'boss'); game.flash('#ffffff', .25); game.after(.9, () => { mode = 'wait'; });
  }

  // each fighter's place for this screen's shape (the standing walk there when it turns: animate)
  const place = () => { placed = game.upright; const R = rest(); for (const c of all) { c.hx = 119 + (c.home[0] - 119) * R.spread; c.hy = 84 + (c.home[1] - 84) * R.deep; } };
  let placed;

  /* ---- WAIT-MODE ATB: gauges fill while nobody chooses or acts; a full gauge takes the turn ---- */
  function tick(dt) {
    for (const c of all) if (!c.dead) c.atb = Math.min(1, c.atb + c.spd * dt);
    const c = all.find(c => !c.dead && c.atb >= 1), sk = c && MOVES[c.skill]; if (!c) return;
    c.atb = 0; c.guard = false; actor = c; if (!isHero(c)) return order(E.pick(c.moves), E.pick(alive(party)));   // monsters pick a move and a hero
    menu.items = ['Attack', { label: sk.label, note: sk.mp, disabled: c.mp < sk.mp }, 'Defend', { label: 'Potion', note: '×' + potions, disabled: !potions }, 'Run'];
    if (auto) return order(...autoPick(c));   // AUTO: the hero picks for himself
    menu.i = 0; menu.active = true; mode = 'command'; A.sfx('blip');
  }
  // AUTO (mobile RPGs' battle button): heal the weakest ally under 40% (the skill, or a potion under 25%), sweep two foes or
  // more, spend the skill on a foe that can take it, else hit the weakest foe
  function autoPick(c) {
    const sk = MOVES[c.skill], foe = alive(foes).sort((a, b) => a.hp - b.hp)[0], low = alive(party).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
    if (low.hp < low.max * .4 && sk.heal && c.mp >= sk.mp) return [c.skill, low];
    if (low.hp < low.max * .25 && potions) return ['potion', low];
    if (sk.power && c.mp >= sk.mp && (sk.all ? alive(foes).length > 1 : foe.hp > c.atk * 2)) return [c.skill, sk.all ? null : foe];
    return [c.attack, foe];
  }
  function pick(i) {
    const key = COMMANDS(actor)[i], m = MOVES[key];
    if (m.all || !(m.power || m.heal)) return order(key, null);   // Cleave, Defend and Run need no target
    pending = key; list = alive(m.ally ? party : foes); mode = 'target'; cursor = m.ally ? list.indexOf(list.slice().sort((a, b) => a.hp / a.max - b.hp / b.max)[0]) : 0;   // heals start on the weakest ally
  }
  function order(key, target) {
    const m = MOVES[key]; if (m.mp) actor.mp -= m.mp; if (key === 'potion') { potions--; drank++; }
    act = { who: actor, key, target, t: 0, hits: 0, due: [] }; mode = 'act'; menu.active = false; note = m.label || '';   // named moves show a banner
  }
  function finish() {   // after every action: win, lose, or back to the gauges
    act = null; actor = null; note = '';
    if (!alive(foes).length) {   // the last death plays out, then victory and a line with a live portrait
      mode = 'won'; game.after(DIE, () => { mode = 'win'; A.music('victory'); game.flash('#fff4d0', .3, .6); });
      if (D) { keep(); won = D.party.reward(D.troop); }   // the journey's: the spoils, shared exp and its level-ups
      const lead = D && party.find(h => !h.dead) || party[0], lines = D ? spoken() : ['The monsters are defeated!', 'Rowan, Lyra and Sera grow stronger.'];
      game.after(DIE + 1.6, () => log.say(lines, { name: lead.name, portrait: lead.rig, portraitSize: 32, onDone: () => D ? end({ won: true, spoils: won }) : game.go('title') }));
    } else if (!alive(party).length) { mode = 'lose'; note = 'The party has fallen...'; game.after(2, () => D ? (keep(), end({ won: false })) : game.go('over', { from: 'rpg' })); }
    else mode = 'wait';
  }
  // the journey's battle over: hp and mp back on its members, the potions drunk taken from the bag, then back to the field
  const keep = () => { for (const u of party) { u.member.hp = Math.max(0, u.hp); u.member.mp = u.mp; } D.party.inv.remove('potion', drank); drank = 0; };
  const end = r => { const d = D; D = null; d.done(r); };
  // what the victory says: the spoils, then each level reached and what it brought
  const spoken = () => [['The monsters are defeated!', won.exp + ' EXP, ' + won.gold + ' gold' + (won.items.length ? ', and ' + won.items.map(i => D.party.rpg.item(i).name).join(', ') : '') + '.'].join(' '),
    ...won.levels.map(([m, ls]) => { const up = ls[ls.length - 1].up; return '{c=#ffe08a}' + m.name + ' reached level ' + ls[ls.length - 1].level + '!{/c} ' + Object.keys(up).map(k => k.toUpperCase() + ' +' + up[k]).join(', '); })];
  // the spoils' window rows: the journey's, or the demo's
  const spoils = () => won ? [['EXP', '+' + won.exp], ['Gold', '+' + won.gold], ['Item', won.items.length ? D && D.party.rpg.item(won.items[0]).name || won.items[0] : '-']] : [['EXP', '+180'], ['Gil', '+96'], ['Item', 'Ether']];

  /* ---- ACTIONS: go out (GO s), charge in the cast pose, swing an E.Combo of the move (each blow settles before the
   * next starts), wait for everything in flight to land (a.due), come back (BACK s) ---- */
  function play(a, dt) {
    const u = a.who, m = MOVES[a.key], tt = a.t += dt, side = isHero(u) ? -1 : 1, mine = isHero(u) ? party : foes;
    if (a.target && a.target.dead && !a.hits) a.target = alive(m.ally ? mine : mine === party ? foes : party)[0] || null;   // a new target (never mid-combo)
    const tg = a.target, near = tg && /dash|leap|swoop|hop/.test(m.go), t0 = (m.go ? GO : 0) + (m.charge || 0), fly = m.go === 'swoop';
    // melee: clear of the target's blade; a flier swoops low in front of its target, clear of the rest
    const dx = near ? tg.hx - side * (fly ? 16 : 10 + 5 * size(tg) + 8 * size(u)) : u.hx + (m.go === 'step' ? side * 12 : 0), dy = near ? (fly ? Math.min(tg.hy + 30, 140) : tg.hy + 2) : u.hy;
    if (!a.atk && tt >= t0) { a.atk = new E.Combo([].concat(m.anim || m.time || PAUSE).map(s => s.spec ? new E.Attack(s.spec) : s)); a.atk.press(); }   // fresh copies: MOVES are shared
    const k = a.atk;
    if (k) {
      k.update(dt); if (!k.busy && k.step < k.moves.length - 1) k.press();   // the next blow
      const h = k.current; if (a.hits <= k.step && (h.phase === 'recover' || !h.phase || h.active && h.u >= (h.spec.hitAt || .5))) { a.hits++; strike(a, m, tg, side); }   // the impact frame (a move's hitAt)
      E.prune(a.due, d => d.at <= tt && land(a, d));
      if (!k.busy && !a.due.length && a.back === undefined) a.back = tt;
    }
    const st = k && k.state;
    const going = clamp(a.back === undefined ? tt / GO : (tt - a.back) / BACK, 0, 1), out = a.back === undefined ? E.ease.inOut(going) : 1 - E.ease.inOut(going);
    u.x = lerp(u.hx, dx, out); u.y = lerp(u.hy, dy, out);
    u.z = fly && tg ? lerp(u.hz, tg.z + 6, out) : u.hz + Math.sin(going * Math.PI) * (m.go === 'leap' ? 16 : m.go === 'hop' ? 9 : 0);   // leaps arc there and back
    // coil: 0 -> 1 through the wind-up, 1 -> -1 in the strike, back to 0: painted monsters rear back and pounce with it
    u.coil = !st ? 0 : st.phase === 'wind' ? E.ease.outQuad(st.u) : st.phase === 'active' ? 1 - 2 * E.ease.outCubic(st.u) : E.ease.inOut(st.u) - 1;
    if (u.pounce) { u.x -= side * u.pounce[0] * u.coil; u.z += u.pounce[1] * u.coil; }
    u.swing = m.anim ? st : null;                                                   // the rig plays the E.MOVES swing
    const was = u.phase; u.phase = st && (st.phase === 'active' && a.hits ? 'hit' : st.phase);   // wind, active, hit (the blow landed), recover
    if (u.blob && u.phase === 'active' && was === 'wind') u.body.kick(-14);        // the Bomb launches stretched
    const ch = m.charge && tt < t0 ? clamp(1 - (t0 - tt) / m.charge, 0, 1) : 0;   // 0..1 through a charge
    u.charge = m.charge && a.atk && !a.hits ? 1 : ch;                              // lit until the spell is released
    u.pose = ch ? 'cast' : a.atk && m.pose;                                         // charge in the cast pose; Potion, Defend, bash (till home)
    u.item = m.item && !a.hits;                                                     // the potion bottle, until it is used
    u.flee = m.go === 'flee' ? out : 0;                                             // Run: turn tail and run in place (FF VI)
    u.blink = !isHero(u) && tt < .35;                                               // monsters glow before they act (FF VI)
    // the ready blade rests low from the follow-through till clear: never sweeps back through the foe
    u.calm = st ? st.phase === 'recover' : a.back !== undefined && (!near || going < .6);
    if (m.charge && !a.glyph) a.glyph = addFx('glyph', u, t0 + .4, m.heal ? '#8affc0' : '#ffb050');
    if (u.charge) {   // a live charge: the caster floats a pixel, motes stream into the orb
      u.z += Math.sin(ch * Math.PI) * (1.2 + .4 * Math.sin(tt * 14));
      if (E.chance(dt * 40)) { const [ox, oy, oz] = u.rig.tip(), w = E.rand(0, TAU), d = E.rand(10, 16), v = [Math.cos(w) * d, Math.sin(w) * d * .5, Math.sin(w * 3) * d * .7];
        P.add({ kind: 'ember', x: ox + v[0], y: oy + v[1], z: oz + v[2], vx: -v[0] * 4, vy: -v[1] * 4, vz: -v[2] * 4, max: .25, color: m.heal ? '#b0ffd8' : '#ffd070' }); }   // arrives in .25 s
    }
    if (u.item && E.chance(dt * 6)) { const [x, y, z] = u.rig.hand('L'); P.add({ kind: 'glint', x, y, z: z + 5, max: .3, size: 1.2, color: '#ffffff' }); }   // the bottle glints
    a.orb = null; if (m.bolt && tt - a.fly < FLY) {   // a bolt trailing embers; it bows toward the camera, in front of anyone on the way
      const q = (tt - a.fly) / FLY, p0 = a.from, bow = Math.sin(q * Math.PI);
      a.orb = [lerp(p0[0], tg.x, q), lerp(p0[1], tg.y, q) + bow * Math.max(0, tg.y - p0[1]) * 1.4, lerp(p0[2], tg.z + tg.h * .5, q) + bow * 12, m.bolt, 3 + m.power];   // [x, y, z, color, radius]
      P.add({ kind: 'ember', x: a.orb[0], y: a.orb[1], z: a.orb[2], vx: E.rand(-10, 10), vz: E.rand(-10, 10), max: .4, color: m.bolt });
      if (m.fx === 'flame' && E.chance(dt * 40)) P.fire(a.orb[0], a.orb[1], a.orb[2], 1, { size: 2.5, speed: 4 });
    }
    if (a.back !== undefined && tt >= a.back + BACK) { Object.assign(u, { x: u.hx, y: u.hy, z: u.hz, swing: null, phase: null, pose: null, coil: 0, flee: 0, blink: false, calm: false }); finish(); }
  }
  // a blow reaches its impact frame: it lands now, a bolt or the Doom Blade's cut after FLY s, a wave as it passes each foe
  function strike(a, m, tg, side) {
    const u = a.who, due = (c, s) => a.due.push({ c, at: a.t + s, i: a.hits - 1 });
    if (a.key === 'run') {
      if (D && !D.boss && E.chance(.6)) { note = 'Escaped!'; mode = 'fled'; A.sfx('warp'); game.after(.9, () => { keep(); end({ fled: true }); }); return; }   // the journey's: away, but not from a boss
      note = "Can't escape!"; A.sfx('cancel'); return;
    }
    if (m.guard) { u.guard = true; P.ring(u.x, u.y, 3, 16, '#8ad0ff', .4); P.glints(u.x, u.y, u.z + 24, 4, '#c8ecff', 16); A.sfx('select'); return; }   // Defend: guard until the next turn
    if (u.blob) u.body.sq = .35;   // the Bomb squashes on the hit frame (a kick waits out the hit-stop)
    if (m.item) { const [x, y, z] = u.rig.hand('L'); P.glints(x, y, z, 8, '#b0ffd0', 6); P.add({ kind: 'bit', x, y, z: z + 6, vx: 25, vz: 110, g: 380, max: .5, size: 2, color: '#c08040' }); A.sfx('pickup'); }   // the cork pops
    if (m.wave) {   // a crescent sweeps across the other side, aimed at their middle
      const l = alive(isHero(u) ? foes : party), to = { x: side < 0 ? -10 : 240, y: l.reduce((s, c) => s + c.y / l.length, 0), z: 0, h: 40 };
      Object.assign(addFx('wave', u, Math.abs(to.x - u.x) / WAVE), { to, cols: m.wave }); P.ring(u.x, u.y, 4, 70, m.wave[1], .45); A.sfx('whoosh');
      return l.forEach(c => due(c, Math.abs(c.x - u.x) / WAVE));
    }
    if (!tg) return;
    if (m.bolt || m.fx === 'doom') { a.fly = a.t; a.from = u.rig ? u.rig.tip() : [u.x + side * 8, u.y, u.z + u.h * .4]; A.sfx(m.bolt ? 'shoot' : 'swing'); due(tg, FLY); }
    else due(tg, 0);
    if (m.fx === 'doom') Object.assign(addFx('wave', u, FLY), { to: tg, cols: DOOM });
  }
  function land(a, { c, i }) {   // i: the blow's place in a combo
    const u = a.who, m = MOVES[a.key], zc = c.z + c.h * .5; if (c.dead) return true;
    if (m.heal) {
      const h = m.heal + E.randInt(0, 6); c.hp = Math.min(c.max, c.hp + h); c.glow = .8; A.sfx('heal');
      P.glints(c.x, c.y, c.z + c.h, 12, '#9affc8', 14); P.ring(c.x, c.y, 3, 18, '#8affc0', .5); P.text(c.x, c.y, zc + 12, h, '#8affc0', { scale: 2, bounce: true }); return true;
    }
    const crit = E.chance(.12), d = Math.max(1, Math.round((u.atk * m.power / a.atk.moves.length + E.randInt(0, 4) - (c.def || 0) / 2) * (crit ? 1.8 : 1) * (c.guard ? .5 : 1))), col = crit ? '#ffd040' : '#ffffff', side = isHero(u) ? -1 : 1;   // (the journey's foes and heroes wear armor: def)
    c.hp = Math.max(0, c.hp - d); c.flash = .12; c.shake = .35; c.grow = .25; c.x += side * 4; if (c.body) c.body.kick(c.rig ? 2 : -3);   // flinch: flash, shake, knocked back a step
    if (m.fx === 'flame') { addFx('flame', c, .8, '#ff7030'); P.explosion(c.x, c.y, c.z + 12, .8, { debris: false }); }
    else game.hitFx(c.x, c.y, zc, { power: crit ? 2 : 1.3, angle: side > 0 ? 0 : Math.PI, color: c.guard ? '#8ad0ff' : m.bolt, sound: c.guard ? 'bump' : u.rig ? 'hit' : 'punch' });   // hit-stop, shake, sparks
    P.text(c.x + i * 8, c.y, zc + 12 + i * 10, d, col, { scale: 2, bounce: true });   // a combo's numbers climb in a stair, never on top of each other
    if (m.fx === 'doom') { addFx('doom', c, .45, '#ff2848'); game.shake(5); } if (m.fx === 'claw') addFx('claw', c, .3);
    if (!c.hp) kill(c); return true;
  }
  function kill(c) { c.dead = true; c.atb = 0; c.guard = false; c.die = 0; A.sfx(isHero(c) ? 'hurt' : 'die'); }   // heroes fall flat; monsters play a death, then burst()
  function burst(c) {   // the end of a monster's death: debris and smoke (the Bomb explodes), then it fades
    c.gone = true; P.bits(c.x, c.y, c.z + 10, 18, c.debris); A.sfx('explode', { vol: .5 });
    if (c.blob) { addFx('pop', c, .2); P.explosion(c.x, c.y, c.z + 10, 1.2); c.fade = 0; }
    else for (const d of [-10, 0, 10]) P.smoke(c.x + d, c.y, c.z + 4, 3, { size: 4, color: '#c8b0e4', dark: '#a48cc8', light: '#f4ecff' });   // pale violet wisps
  }
  const addFx = (kind, c, dur, color) => { const f = { kind, c, x: c.x, y: c.y, z: c.z, t: 0, dur, color }; fx.push(f); return f; };

  /* ---- UPDATE ---- */
  // heavy cloth: drain the cape's swing relative to its wearer (mx, my: his step), so it settles in .15 s after a dash
  function heavyCape(rig, dt, mx, my) {
    const keep = .05 ** (dt / .15);
    for (const n of [...rig.capeL, ...rig.capeR]) { n.px = n.x - mx - (n.x - n.px - mx) * keep; n.py = n.y - my - (n.y - n.py - my) * keep; }
  }
  function animate(c, dt) {
    c.flash -= dt; c.glow -= dt; c.shake -= dt; c.grow = Math.max(0, c.grow - dt); c.flapT += dt * (1 + Math.abs(c.coil) * 1.5);   // wings beat harder in a strike
    if (c.dead && (c.die += dt) > DIE && !c.gone && !isHero(c)) burst(c);
    c.fade = clamp(c.fade + (c.gone ? -2.5 : c.dead ? 0 : 1.5) * dt, isHero(c) ? 1 : 0, 1);   // monsters fade in, and out once they burst
    const busy = act && act.who === c, choosing = c === actor && (mode === 'command' || mode === 'target'), cheer = mode === 'win' && isHero(c) && !c.dead;
    const tx = c.hx - (choosing ? 6 : c.dead && isHero(c) ? 12 : 0);   // the hero on turn steps up; the fallen stagger forward
    if (!busy) { c.x = approach(c.x, tx, Math.min(90, Math.abs(tx - c.x) * 4 + 8) * dt); c.y = approach(c.y, c.hy, 90 * dt); c.z = c.hz * (c.dead ? Math.max(0, 1 - (c.die / .5) ** 2) : 1); }   // the dead drop
    if (cheer) c.z = Math.abs(Math.sin(t * 5 + c.hy)) * 6;   // victory: hop, turned to the camera
    c.bob = c.hz && !c.dead ? Math.sin(t * 2.6 + c.hx) * 3 : 0;   // fliers hover (drawn on top of z)
    c.tilt = c.dead ? Math.min(c.die * 3, 1.4) : -.55 * c.coil;    // the Gargoyle rears back, pitches into the dive, tumbles when it dies
    const k = dt > 0 ? 1 / dt : 0, vx = (c.x - c.px) * k, vy = (c.y - c.py) * k; c.px = c.x; c.py = c.y;
    if (c.blob) {   // a Blob breathes, swells to wind up (and die), stretches at its target, squashes on the hit and when struck
      c.body.update(dt, { squash: c.shake > .1 ? -.35 : { wind: .3 * c.coil, active: -.4, hit: .4 }[c.phase] ?? .06 * Math.sin(t * 3 + c.hx), look: [1, .3], squint: c.dead || c.shake > .2 });
      c.body.scale = 1 + c.grow + (c.dead ? c.die * .7 : Math.max(0, c.coil) * .3);
    }
    if (!c.rig) return;
    // held poses, most important first: KO (a stagger, the knees give, a topple), victory, the move's pose, Defend, low HP
    const pose = c.dead ? 'die' : cheer ? 'cheer' : c.pose || (c.guard ? 'block' : isHero(c) && c.hp < c.max / 4 && !busy && !choosing ? 'kneel' : undefined);
    // faces: wince when hurt, smile to cheer, glare while charging, shout on the blow
    const expr = c.dead || c.shake > .1 || pose === 'kneel' ? 'wince' : cheer ? 'smile' : c.charge ? 'angry' : c.phase === 'active' || c.phase === 'hit' ? 'shout' : undefined;
    // the facing eases, never snaps: side-on to the foes while acting (blows read in profile, FF style), to the camera to
    // cheer, away to Run; the fallen drop where they stand
    const goal = cheer ? Math.PI / 2 + .5 : c.flee ? Math.PI - c.face : busy && !MOVES[act.key].ally ? (isHero(c) ? Math.PI - .35 : .35) : c.face;
    const f = c.fa = E.approachAng(c.fa ?? goal, goal, dt * 9);
    c.rig.update(dt, { x: c.x, y: c.y, z: c.z, facing: f, vx, vy, run: c.flee, hurt: c.shake > .1, air: c.z > c.hz + 2, pose, expr, attack: c.swing, stance: pose || c.calm ? undefined : c.stance });   // a held pose drops the stance; Run: legs pump in place
    if (c.rig.capeL) heavyCape(c.rig, dt, vx * dt, vy * dt);
  }
  function update(dt) {
    t += dt; if (log.update(dt)) return;
    for (const c of all) animate(c, dt);
    for (const f of fx) { f.t += dt; Object.assign(f, { x: f.c.x, y: f.c.y, z: f.c.z }); }
    E.prune(fx, f => f.t > f.dur);
    const m = act && MOVES[act.key]; dim = approach(dim, m && (m.charge || m.fx === 'doom') && act.back === undefined ? 1 : 0, dt * 3);   // spells and Doom Blade dim the scene
    // ambience: drifting petals, brazier embers
    if (D && D.cave) { if (E.chance(dt * 3)) P.add({ kind: 'bit', x: E.rand(0, 220), y: E.rand(10, 150), z: 90, vz: -60, g: 300, max: 1, size: 1, color: '#8ac8ff' }); }   // drips from the roof
    else {
      if (E.chance(dt * 5)) P.add({ kind: 'bit', x: E.rand(0, 200), y: E.rand(10, 140), z: E.rand(50, 90), vx: E.rand(10, 22), vz: -4, g: 5, drag: .2, max: 6, size: E.chance(.4) ? 2 : 1, color: E.pick(['#ffc0d0', '#ffe0e8', '#ffd890']) });
      if (E.chance(dt * 6)) P.add({ kind: 'ember', x: E.pick([100, 132]) + E.rand(-3, 3), y: 8, z: 20, vz: E.rand(18, 30), vx: E.rand(-4, 4), max: 1, color: '#ff8a2a' });
    }
    if (tapped()) return;
    const ap = game.input.pressed('skill') && padsNow().find(p => p && p.label === 'AUTO'); if (ap) ap.go();   // the keys' AUTO (L, E, a pad's X): the party fights by itself, or not
    if (mode === 'wait') tick(dt);
    else if (mode === 'act') play(act, dt);
    else if (mode === 'command') menu.update();
    else if (mode === 'target') {   // aiming the glove
      const inp = game.input, n = list.length, d = inp.repeat('up') || inp.repeat('left') ? -1 : inp.repeat('down') || inp.repeat('right') ? 1 : 0;
      if (d) { cursor = (cursor + n + d) % n; A.sfx('select'); }
      if (inp.pressed('confirm')) { inp.consumeAll(); A.sfx('confirm'); order(pending, list[cursor]); } else if (inp.pressed('cancel')) { inp.consumeAll(); A.sfx('cancel'); mode = 'command'; }
    }
  }

  // TAPS (a click works too). Touch: the pads, as drawn; a mouse: the command list (a click there while aiming goes back).
  // Aiming, a tap on a fighter targets it
  function tapped() {
    const c = game.input.clicked(); if (!c || !band) return false;
    const [x, y] = c, inside = b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h, use = f => { game.input.consumeAll(); f(); return true; };
    if (band.pads) { const p = band.pads.find(p => p && p.go && !p.off && p.w && inside(p)); if (p) return use(p.go); }
    else {
      const onCmds = inside({ x: band.X + 4, y: band.Y, w: 92, h: 66 }), k = Math.floor((y - band.Y - 3) / 10), it = menu.items[k];
      if (mode === 'command' && onCmds && it && !it.disabled) return use(() => { menu.i = k; A.sfx('confirm'); pick(k); });
      if (mode === 'target' && onCmds) return use(() => { A.sfx('cancel'); mode = 'command'; });
    }
    if (mode !== 'target') return false;
    const z = game.view.scale / E.VIEWS.brawler.scale, i = list.findIndex(u => { const [sx, sy] = game.r.w(u.x, u.y, u.z + u.h * .5); return Math.abs(x - sx) < (14 + u.h * .25) * z && Math.abs(y - sy) < (u.h * .6 + 8) * z; });   // the whole fighter, at any zoom
    return i >= 0 && use(() => { cursor = i; A.sfx('confirm'); order(pending, list[i]); });
  }
  // what the pads say and do now: the commands and AUTO on a hero's turn; aiming, the targets (with their HP) and BACK; else
  // the foes' HP (or the spoils) and AUTO, which can be turned on or off at any time
  function padsNow() {
    const autoPad = { label: 'AUTO', note: auto ? 'ON' : 'OFF', on: auto, go: () => { auto = !auto; A.sfx(auto ? 'confirm' : 'cancel'); if (auto && actor && (mode === 'command' || mode === 'target')) order(...autoPick(actor)); } };
    const fill = (a, n) => { while (a.length < n) a.push(null); return a.slice(0, n); };
    if (mode === 'command') return [...menu.items.map((it, k) => ({ label: it.label || it, note: it.note, off: it.disabled, go: () => { menu.i = k; A.sfx('confirm'); pick(k); } })), autoPad];
    if (mode === 'target') return [...fill(list.map((c, k) => ({ label: c.name, hp: c.hp / c.max, ally: isHero(c), on: k === cursor, go: () => { cursor = k; A.sfx('confirm'); order(pending, c); } })), 5), { label: 'BACK', go: () => { A.sfx('cancel'); mode = 'command'; } }];
    if (mode === 'win' || mode === 'won') return fill(spoils().map(([label, note]) => ({ label, note })), 6);
    return [...fill(alive(foes).map(f => ({ label: f.name, hp: f.hp / f.max })), 5), autoPad];
  }

  /* ---- DRAW ---- */
  const RIM = '#ffc27a', DOOM = ['#3a0a1e', '#d0203a', '#fff0f0'];
  const BOTTLE = E.sprite(['...kkk...', '...kck...', '...kck...', '...kwk...', '..kwwgk..', '.kwwgggk.', 'kwwgggggk', 'kwgggggGk', 'kggyyygGk', 'kggyyyGGk', '.kgGGGGk.', '..kkkkk..'],
    { k: '#1a1030', c: '#c08040', w: '#ffffff', g: '#58e088', G: '#2a9a58', y: '#fff0b0' });   // a potion flask: cork, glint, label
  // a long see-through shadow away from the sun (a decal)
  const longShadow = (r, x, y, len, w) => r.decal(g => px.polyDither(g, Array.from({ length: 12 }, (_, i) => {
    const a = i / 12 * TAU, u = (1 + Math.cos(a)) / 2 * len, s = Math.sin(a) * w; return r.w(x - SUN[0] * u - SUN[1] * s, y - SUN[1] * u + SUN[0] * s, 0);
  }), '#2a1a50', .32, r.ix, r.iy));
  function drawUnit(r, c) {
    if (c.fade <= 0) return;
    const x = c.x + (c.shake > 0 ? Math.sin(t * 90) * 2 : 0), w = size(c) * 5;   // a struck target shakes
    r.shadow(c.x, c.y, w, .55, '#1e0e24'); longShadow(r, c.x, c.y, c.dead ? 10 : c.h * 1.2, w * .8);   // a violet contact shadow and a long one
    const line = c.flash > 0 ? '#ffffff' : c.glow > 0 && Math.sin(t * 30) > 0 ? '#8affc0' : c.blink && Math.sin(t * 40) > 0 ? '#ffe890' : c.guard ? '#6ab8ff' : undefined;
    const dying = c.dead && !c.gone && !isHero(c) && Math.sin(c.die * 36) > 0;   // a dying monster blinks white
    r.actor(x, c.y, c.z + c.bob, (g, ox, oy) => {
      if (c.back) c.back(g, ox, oy, c, r.view, t);
      if (c.body) c.body.draw(g, ox, oy, r.view);   // Humanoid and Blob draw the same way
      if (c.front) c.front(g, ox, oy, c, r.view, t);
    }, { flash: dying || c.flash > .08 ? '#ffffff' : c.fade < 1 && !isHero(c) ? '#b060ff' : false, outlineColor: line, rimColor: c.flash > 0 ? '#ffffff' : RIM, alpha: isHero(c) ? 1 : clamp(c.fade, 0, 1),   // struck: a 3-frame flash
      bias: act && act.who === c ? 60 : 0 });   // the fighter in action is drawn over the others (FF style), never hidden behind the Bomb
    if (c.swing && c.rig.trail.length > 3) c.rig.drawSmear(r, c.smear);   // the trail along the real blade, fist or foot path, once it curves (no flat first slab)
    if (c.item) { const [x, y, z] = c.rig.hand('L'); r.sprite(x, y, z - 2, BOTTLE, { bias: 61 }); }   // held up by its base, over the acting fighter
    if (c.rig && c.rig.o.weapon === 'staff' && !c.dead) { const [ox, oy, oz] = c.rig.tip(), k = c.charge || 0; r.queue(ox, oy, oz, g => {   // the orb glows; charging, it throbs
      const [sx, sy] = r.w(ox, oy, oz); r.glowDisc(g, sx, sy, 6 + k * (3.5 + 1.5 * Math.sin(t * 24)), c.rig.C.orb, .4 + .3 * k); if (k) px.disc(g, sx, sy, .5 + k * 2, '#fffbe8');
    }, { bias: .5, emissive: true }); }
  }
  function drawFx(r, f) {
    const u = f.t / f.dur, k = Math.sin(u * Math.PI);
    if (f.kind === 'glyph') r.decal(() => {   // a magic circle under the caster: two rings and turning rune marks
      r.groundRing(f.x, f.y, 15, f.color, 1); r.groundRing(f.x, f.y, 11, f.color, .7);
      for (let i = 0; i < 6; i++) { const a = f.t * 2 + i * TAU / 6; r.groundArc(f.x, f.y, 11, 15, a, a + .35, f.color, 1); }
    });
    else if (f.kind === 'flame') for (const front of [false, true]) r.queue(f.x, f.y + (front ? 2 : -2), 0, g => {   // a flame ring: back half behind
      const s = f.c.h / 40, [cx, cy] = r.w(f.x, f.y, f.z + f.c.h * .4);   // the target, front half in front
      if (!front) r.glowDisc(g, cx, cy, 24 * s, '#ff6a20', .7 * k);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + f.t * 4, [sx, sy] = r.w(f.x + Math.cos(a) * 10 * s, f.y + Math.sin(a) * 10 * s, f.z), q = .7 + i * 37 % 10 / 20; if (Math.sin(a) > 0 === front) flame(g, sx, sy, (4 + 2 * s) * q, (30 + 14 * Math.sin(f.t * 24 + i * 2)) * s * k * q, f.t * 16 + i); }
    });
    else if (f.kind === 'doom' || f.kind === 'wave') r.queue(f.x, f.y + 3, 0, g => {   // crescent cuts: a wave flies to f.to
      const w = f.to, d = w && w.x < f.x ? -1 : 1, R = (w ? 24 : 36) + 12 * u, h = f.z + f.c.h * .5;
      const [sx, sy] = w ? r.w(lerp(f.x, w.x, u), lerp(f.y, w.y, u), lerp(h, w.z + w.h * .5, u)) : r.w(f.x, f.y, h), arc = (R0, cx, cy) => Array.from({ length: 9 }, (_, i) => [cx + d * Math.cos(-2.4 + i * .42) * R0, cy + Math.sin(-2.4 + i * .42) * R0]);
      (f.cols || DOOM).forEach((c, i) => px.poly(g, [...arc(R * (1 - i * .2), sx, sy), ...arc(R * (1 - i * .2) * (.72 + .26 * u), sx + 5 * d, sy - 4).reverse()], c));
    }, { emissive: true });   // emissive: never darkened by the lights
    else if (f.kind === 'pop') r.queue(f.x, f.y + 3, f.z + 12, g => {   // the Bomb bursts: a white-hot flash bigger than its swollen body
      const [sx, sy] = r.w(f.x, f.y, f.z + 12), R = 20 * r.view.scale * (1 - u * .5); r.glowDisc(g, sx, sy, R * 1.5, '#ffd070', 1 - u); px.disc(g, sx, sy, R * (1 - u), '#fff8e0');
    }, { emissive: true, bias: 4 });   // over the blast's first smoke
    else if (f.kind === 'claw') r.queue(f.x, f.y + 3, 0, g => {   // three claw rakes tear down across the target, their tails catching up
      const [sx, sy] = r.w(f.x, f.y, f.z + f.c.h * .7), a = Math.min(1, u * 4) * 18, b = Math.max(0, u * 2 - 1) * 18;   // head and tail along each rake
      for (const i of [-7, 0, 7]) for (const [w, c] of [[2, '#ff3050'], [1, '#ffffff']]) px.line(g, sx + i - 5 + b * .5, sy - 9 + b, sx + i - 5 + a * .5, sy - 9 + a, c, w);
    }, { emissive: true });
  }
  function draw(r) {
    const cave = !!(D && D.cave), { fy } = layout(r.W, r.H), cx = rest().x, key = [r.W, r.H, fy, cx, game.zoom, cave].join();
    if (!backdrop || backdrop.key !== key) { backdrop = cave ? paintCave(r.W, r.H, fy, game.zoom) : paintBackdrop(r.W, r.H, fy, cx, game.zoom); backdrop.key = key; }
    r.ctx.drawImage(backdrop, 0, 0);
    const floor = cave ? cavern : plaza; floor.drawFloor(r); floor.queueWalls(r); for (const [name, x, y, z, o] of cave ? CAVE_PROPS : PROPS) r.prop(name, x, y, z, o);
    for (const [id, x, y, o] of cave ? CAVE_SHAPES : SHAPES) r.shape(id, x, y, 0, o);
    for (const c of all) drawUnit(r, c); for (const f of fx) drawFx(r, f);
    const orb = act && act.orb, m = act && MOVES[act.key];
    if (orb) r.queue(orb[0], orb[1], orb[2], g => {   // the bolt: additive halo, ball, hot core
      const [sx, sy] = r.w(orb[0], orb[1], orb[2]), R = orb[4]; r.glowDisc(g, sx, sy, R * 2.7, orb[3], .5); px.disc(g, sx, sy, R, orb[3]); px.disc(g, sx - 1, sy - 1, R / 2, '#fff0b0'); px.dot(g, sx - 1, sy - 1, '#ffffff');
    }, { bias: .3 });
    L.enabled = dim > .02 || cave;
    if (L.enabled) {   // spells dim the scene; colored lights (PS1-style)
      L.ambient = (cave ? .5 : 1) - .55 * dim * (cave ? .5 : 1);
      if (cave) { for (const [x, y] of [[212, 58], [8, 30], [150, 4]]) L.add(x, y, 10, 40, .8, { color: '#6ad0ff' }); for (const h of party) if (!h.dead) L.add(h.x, h.y, 20, 60, .9, { color: '#ffc070' }); }   // the crystals, the party's torches
      else for (const x of [100, 132]) L.add(x, 8, 10, 24, .7, { color: '#ffa040' });
      if (act) L.add(act.who.x, act.who.y, 0, 34, m && m.charge ? .7 : .3, { color: m && m.charge ? '#c8c0ff' : '#ff5060' });   // a caster glows; the Knight keeps dark
      for (const f of fx) if (f.color) L.add(f.x, f.y, 0, 34, .8, { color: f.color });
    }
    r.overlay(g => hud(g, r)); log.draw(r);
  }

  /* ---- HUD: FF gradient windows (E.ui.box bg: [top, bottom]), cards with live portraits (drawPortrait), gauges ---- */
  const WIN = ['#6c8cff', '#0a0a48'], HOT = ['#90aaff', '#1c2a90'], KO = ['#8a3a5a', '#20061a'];   // [top, bottom]
  const gauge = (g, x, y, w, f, c) => E.ui.bar(g, x, y, w, 5, f, c, { bg: '#2a2650' });
  // the 16-bit RPG glove cursor
  const HAND = E.sprite(['..kkkk......', '.kwwwwkkkkk.', 'kwwwwwwwwwwk', 'kwwwwwkkkkk.', 'kwwwwwsk....', 'kswwwwsk....', '.ksssssk....', '..kkkkk.....'], { k: '#1a1030', w: '#ffffff', s: '#a8b0d0' });
  const txt = (g, s, x, y, c, align) => E.font.text(g, String(s), x, y, c, { shadow: '#0a0820', outline: false, align });
  const tiny = (g, s, x, y, c) => E.font.text(g, s, x, y, c, { font: 'tiny', outline: false });
  function hud(g, r) {
    const { Y } = layout(r.W, r.H), choosing = mode === 'command' || mode === 'target', bob = Math.round(Math.sin(t * 10) * 1.5); frame++;
    const X = Math.round((r.W - 320) / 2), P = game.input.lastDevice === 'touch' && pads(r.W, r.H); band = { X, Y, pads: P && padsNow() };   // keys: the band's 316 px, centred
    // an arrow over the hero on turn, the glove on the target
    if (choosing) { const [sx, sy] = r.w(actor.x, actor.y, actor.z + actor.h + 5); px.poly(g, [[sx - 5, sy - 7 + bob], [sx + 5, sy - 7 + bob], [sx, sy - 1 + bob]], '#ffe060'); px.rect(g, sx - 3, sy - 6 + bob, 6, 1, '#fff8c0'); }
    if (mode === 'target') { const c = list[cursor], [sx, sy] = r.w(c.x, c.y, c.z + c.h * .55); px.sprite(g, HAND, sx - 28 + bob, sy - 4); }
    // top banner: the move, the target, or what the command does
    const top = mode === 'command' ? MOVES[COMMANDS(actor)[menu.i]].info : mode === 'target' ? list[cursor].name : note;
    if (top && !log.open) { const w = E.font.width(top) + 24, c = Math.round(r.W / 2); E.ui.box(g, c - w / 2, 5, w, 18, { bg: WIN }); txt(g, top, c, 10, '#ffffff', 'center'); }
    // a near-black band under the windows (down to the bottom edge); touch: the pads; keys: commands, spoils or monsters on the left
    px.rect(g, 0, Y - 3, r.W, r.H - Y + 3, '#0c0818');
    if (P) band.pads.forEach((p, i) => {   // a pad: its label (left) and note (right), a target's HP bar under them; lit when on
      if (!p) return; const b = Object.assign(p, P.cell(i)), ty = b.y + (p.hp === undefined ? 15 : 9);
      E.ui.box(g, b.x, b.y, b.w, b.h, { bg: p.on ? HOT : WIN, border: p.on ? '#ffe890' : undefined });
      txt(g, p.label, b.x + 7, ty, p.off ? '#7c7aa8' : '#ffffff'); if (p.note !== undefined) txt(g, p.note, b.x + b.w - 6, ty, p.on ? '#ffe890' : '#9ad0ff', 'right');
      if (p.hp !== undefined) gauge(g, b.x + 7, b.y + 23, b.w - 14, p.hp, p.ally ? '#58d068' : '#e0463c');
    });
    else {
      E.ui.box(g, X + 4, Y, 92, 66, { bg: WIN });
      if (choosing) {
        menu.items.forEach((it, k) => { const y = Y + 5 + k * 10; txt(g, it.label || it, X + 20, y, it.disabled ? '#7c7aa8' : '#ffffff'); if (it.note) txt(g, it.note, X + 89, y, '#9ad0ff', 'right'); });
        px.sprite(g, HAND, X + 6 + (mode === 'command' ? bob : 0), Y + 4 + menu.i * 10);
        E.font.text(g, game.input.label('confirm') + ' OK  ' + game.input.label('cancel') + ' BACK', X + 50, Y + 57, '#a8b8ff', { font: 'tiny', outline: false, align: 'center' });   // the player's own keys
      } else if (mode === 'win') spoils().forEach(([a, b], k) => { txt(g, a, X + 11, Y + 10 + k * 17, '#9ad0ff'); txt(g, b, X + 88, Y + 10 + k * 17, '#ffe08a', 'right'); });
      else alive(foes).forEach((f, k) => { txt(g, f.name, X + 11, Y + 7 + k * 19, '#ffffff'); gauge(g, X + 11, Y + 16 + k * 19, 78, f.hp / f.max, '#e0463c'); });
    }
    // a card per hero (FF IX): portrait, name, MP, HP, ATB
    party.forEach((h, k) => {
      const x = (P ? P.cards : X + 100) + k * 72, on = h === actor && choosing, low = h.hp < h.max / 4, col = h.dead ? '#a08aa8' : low ? '#ffd060' : '#ffffff';
      E.ui.box(g, x, Y, 70, 66, { bg: h.dead ? KO : on ? HOT : WIN, border: on ? '#ffe890' : undefined });
      const pic = h.pic || (h.pic = E.mkCanvas(30, 30));   // a whole rig draw: redrawn every third frame
      if ((frame + k) % 3 === 0) { const pg = E.ctx2d(pic); pg.clearRect(0, 0, 30, 30); h.rig.drawPortrait(pg, 3, 3, 24, { zoom: 2.1, turn: .7, bg: ['#3a4aa8', '#10143a'], tint: h.dead ? '#808080' : undefined }); }
      g.drawImage(pic, x + 2, Y + 2);
      txt(g, h.name, x + 34, Y + 6, col); tiny(g, 'MP', x + 34, Y + 19, '#9ad0ff'); txt(g, h.mp, x + 64, Y + 17, col, 'right');
      tiny(g, 'HP', x + 6, Y + 36, '#9ad0ff'); txt(g, h.hp + '/' + h.max, x + 64, Y + 34, col, 'right'); gauge(g, x + 6, Y + 44, 58, h.hp / h.max, low ? '#e8a030' : '#58d068');
      gauge(g, x + 6, Y + 54, 58, h.atb, h.atb >= 1 || on ? '#ffe060' : '#dce0f8');
    });
    if (mode === 'win') E.font.title(g, 'Victory!', Math.round(r.W / 2) - 36, layout(r.W, r.H).fy - 60, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
  }
  // propSize: props sized to the heroes; a strong warm rim light
  // camera: - / = zoom, [ ] turn the plaza under the painted sky; zoomed in past rest(), it eases to the fight (or the hero on turn) at chest height
  return { view: 'brawler', views: ['brawler'], input: 'DEFAULT', res: 'ps1', pausable: true, touch: [], propSize: 1.3, camera: { zoom: [.75, 2], tall: TALL.zoom, rotate: true },   // touch: taps, no buttons
    back() { if (mode !== 'target') return false; mode = 'command'; A.sfx('cancel'); return true; },   // a phone's back: aiming goes back to the commands
    enter(data) { start(data); game.r.rimAlpha = .75; game.focus(...cam); game.cam.offset = [0, layout(game.W, game.H).fy - game.H / 2]; yaw = game.yaw; },
    exit() { game.r.rimAlpha = .28; L.enabled = false; game.cam.offset = null; },
    update(dt) {
      if (game.yaw !== yaw) game.note((yaw = game.yaw) || game.zoom !== 1 ? 'TURN ' + yaw : 'CAMERA RESET');   // the kit's notice has a degree sign the pixel font lacks
      if (placed !== game.upright) place();   // a phone turned: the camera comes in or out (camera.tall), and the sides close up or open out
      update(dt); const f = game.zoom > rest().zoom + 1e-6 && (act ? [act.who, act.target || act.who] : actor && [actor, actor]), k = Math.min(1, dt * 4);
      const goal = f ? [(f[0].x + f[1].x) / 2, (f[0].y + f[1].y) / 2, 22] : [rest().x, 72, 0]; cam = cam.map((v, i) => lerp(v, goal[i], k)); game.focus(cam[0], cam[1], cam[2]);
      game.cam.offset = [0, layout(game.W, game.H).fy - game.H / 2];   // the battle sits above the HUD band, wherever the band is
    }, draw,
    state: () => ({ mode, actor: actor && actor.name, act: act && act.key, t: act && act.t, hp: all.map(c => c.hp), auto, pads: band && band.pads && band.pads.map(p => p && p.w && { label: p.label, x: p.x, y: p.y, w: p.w, h: p.h }) }),   // for automated tests
    looks: PARTY, kin: KIN,   // the heroes' and monsters' looks, for the journey's field
    /** the proof: the party on AUTO (each hero picks for himself) for n steps; a hash of the battle */
    run(n = 600) { const was = auto; try { return proof('rpg-battle', n, i => { if (!i) auto = true; }, () => [mode, actor && actor.name, potions, all.map(c => [c.hp, c.x, c.y])]); } finally { auto = was; } } };
})();
scenes['rpg-battle'] = RPG;

/* =====================================================================================
 * THE JOURNEY  (Dragon Quest, Final Fantasy, Chrono Trigger: the JRPG's whole loop round the battle above)
 * Brightwater's wells run dry since the Dread Knight took the cave in the northern mountains. THE TOWN: people to talk
 * to (E.Story: lines, choices, flags, a quest, emote balloons), an inn, a shop, a chest, a crystal that saves. THE WORLD:
 * an island of 256 x 256 cells (its floor bakes in squares near the camera), meadows, woods, mountains and the road north.
 * Random encounters by zone (E.RPG's) swirl into the ATB battle above, in the cave under its rock. THE CAVE: tunnels, a
 * chest, a crystal that heals and saves, the Dread Knight with a scene before the fight. The party (E.RPG members) gains
 * levels, gold and spoils from every victory. THE MENU (MENU: L or E, a pad's X, the touch button): Items, Equip,
 * Status, Quests and, at a crystal, Save: three slots and the autosave (game.saves; the inn autosaves). The title's
 * CONTINUE and LOAD bring a journey back; BATTLE is the battle alone (#rpg/battle). TOUCH: the stick walks, TALK and
 * MENU; a tap picks in every window, as the battle's pads do.
 * ===================================================================================== */
const JOURNEY = (() => {
  const T = 16, inp = game.input, WIN = ['#6c8cff', '#0a0a48'], HOT = ['#90aaff', '#1c2a90'], GOLD = '#ffe08a';
  const txt = (g, s, x, y, c = '#ffffff', align) => E.font.text(g, String(s), x, y, c, { shadow: '#0a0820', outline: false, align });

  /* ---- THE RULES (E.RPG): what items do and cost, the monsters' numbers and spoils, where they wait ---- */
  const ITEMS = {
    potion: { name: 'Potion', kind: 'use', heal: 40, price: 12, info: 'Restores 40 HP' }, hipotion: { name: 'Hi-Potion', kind: 'use', heal: 120, price: 50, info: 'Restores 120 HP' },
    ether: { name: 'Ether', kind: 'use', mp: 20, price: 60, info: 'Restores 20 MP' }, antidote: { name: 'Antidote', kind: 'use', cure: ['poison'], price: 8, info: 'Cures poison' },
    phoenix: { name: 'Phoenix Down', kind: 'use', revive: .3, price: 120, info: 'Revives a fallen ally' },
    bronze: { name: 'Bronze Sword', kind: 'weapon', stats: { atk: 5 }, price: 70, for: 'Rowan', info: 'A sword for Rowan' }, iron: { name: 'Iron Sword', kind: 'weapon', stats: { atk: 10 }, price: 260, for: 'Rowan', info: 'A heavier blade' },
    oak: { name: 'Oak Staff', kind: 'weapon', stats: { atk: 2, mag: 4 }, price: 70, for: 'Lyra Sera', info: 'A staff for the mages' },
    leather: { name: 'Leather Vest', kind: 'armor', stats: { def: 3 }, price: 40, info: 'Light armor for anyone' }, chain: { name: 'Chain Mail', kind: 'armor', stats: { def: 7 }, price: 220, for: 'Rowan', info: 'Heavy armor for Rowan' },
    robe: { name: 'Silk Robe', kind: 'armor', stats: { def: 2, mag: 3 }, price: 90, for: 'Lyra Sera', info: 'A mage\'s robe' }, cap: { name: 'Leather Cap', kind: 'helm', stats: { def: 2 }, price: 30, info: 'A cap for anyone' },
    ring: { name: 'Swift Ring', kind: 'accessory', stats: { spd: 2 }, price: 300, info: 'Its wearer acts sooner' },
    key: { name: 'Cave Key', kind: 'key', info: 'Opens the cave in the northern mountains' }
  };
  const MONSTERS = {
    slime: { name: 'Slime', hp: 26, atk: 8, def: 1, spd: .34, exp: 7, gold: 5, drops: [[.25, 'potion']] }, goblin: { name: 'Goblin', hp: 40, atk: 11, def: 3, spd: .4, exp: 12, gold: 9, drops: [[.15, 'antidote']] },
    bomb: { name: 'Bomb', hp: 38, atk: 10, def: 2, spd: .42, exp: 15, gold: 12, drops: [[.15, 'ether']] }, gargoyle: { name: 'Gargoyle', hp: 50, atk: 12, def: 4, spd: .5, exp: 20, gold: 16, drops: [[.2, 'hipotion']] },
    knight: { name: 'Dread Knight', hp: 420, atk: 25, def: 6, spd: .32, exp: 150, gold: 300 }
  };
  const R = new E.RPG({ items: ITEMS, monsters: MONSTERS });
  const ENC = R.encounters({ plains: { every: [16, 32], troops: [[3, ['slime', 'slime']], [2, ['goblin']], [2, ['slime', 'goblin']]] },
    forest: { every: [10, 22], troops: [[2, ['goblin', 'goblin']], [2, ['bomb']], [1, ['goblin', 'bomb']]] },
    cave: { every: [12, 24], troops: [[2, ['gargoyle']], [2, ['bomb', 'goblin']], [2, ['gargoyle', 'slime']], [1, ['goblin', 'goblin', 'bomb']]] } });
  const SHOP = R.shop(['potion', 'hipotion', 'ether', 'antidote', 'phoenix', 'bronze', 'oak', 'leather', 'robe', 'cap', 'iron', 'chain', 'ring']);
  // the heroes as members at level 1 (their looks are the battle's: RPG.looks)
  const HEROES = () => [
    R.member({ name: 'Rowan', stats: { hp: 96, mp: 16, atk: 14, def: 6, mag: 3, spd: 10 }, growth: { hp: 12, mp: 2, atk: 3, def: 2, mag: 1, spd: .3 } }),
    R.member({ name: 'Lyra', stats: { hp: 62, mp: 30, atk: 8, def: 3, mag: 12, spd: 9 }, growth: { hp: 7, mp: 5, atk: 2, def: 1, mag: 3, spd: .3 } }),
    R.member({ name: 'Sera', stats: { hp: 74, mp: 26, atk: 9, def: 4, mag: 9, spd: 9.5 }, growth: { hp: 9, mp: 4, atk: 2, def: 1, mag: 2, spd: .3 } })];

  /* ---- SONGS: the town's lilt, the road's march, the battle's drive; the cave plays the dungeon's ---- */
  const TOWN_SONG = { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'F3 . C4 . A3 . C4 . | C3 . G3 . E3 . G3 . | D3 . A3 . F3 . A3 . | Bb2 . F3 . C3 . E3 .' },
    { wave: 'pulse', vol: .11, notes: 'A4 - C5 - F5 - E5 D5 | C5 - - - G4 - - - | D5 - F5 - A5 - G5 F5 | E5 - C5 - D5 - - -' },
    { wave: 'drums', vol: .06, notes: 'k . h . . . h . k . h . . . h h' }] };
  const ROAD_SONG = { bpm: 126, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'G4 - B4 - D5 - - G5 | F#5 - D5 - E5 - D5 - | C5 - E5 - G5 - - E5 | D5 - B4 - A4 - - - | G4 - B4 - D5 - - G5 | A5 - G5 - F#5 - E5 - | D5 - C5 - B4 - A4 - | G4 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'G2 . D3 . G2 . D3 . | D2 . A2 . D2 . A2 . | C3 . G3 . C3 . G3 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | F2 . C3 . D3 . A2 . | C3 . G2 . D3 . A2 . | G2 . D3 . G2 . . .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . k k h . s . h h' }] };
  const BATTLE_SONG = { bpm: 152, steps: 4, tracks: [
    { wave: 'saw', vol: .07, notes: 'A4 A4 C5 A4 E5 - D5 C5 | B4 B4 D5 B4 E5 - D5 B4 | C5 C5 E5 C5 A5 - G5 E5 | F5 - E5 - D5 - B4 - ' },
    { wave: 'square', vol: .07, notes: 'A3 . A3 . A3 . A3 . | G#3 . G#3 . G#3 . G#3 . | A3 . A3 . C4 . C4 . | D4 . D4 . E4 . E4 .' },
    { wave: 'triangle', vol: .3, notes: 'A2 A3 A2 A3 A2 A3 A2 A3 | E2 E3 E2 E3 E2 E3 E2 E3 | F2 F3 F2 F3 C3 C4 C3 C4 | D3 D4 D3 D4 E3 E4 E3 E4' },
    { wave: 'drums', vol: .12, notes: 'k h s h k k s h' }] };

  /* ---- THE MAPS. A map: its TileMap, view, song, zone (encounters by floor tag), its people and things from the rows'
   * spawns; links: a floor tag that leads to another map's spawn ---- */
  const pad = rows => { const w = Math.max(...rows.map(r => r.length)); return rows.map(r => r.padEnd(w, 'T')); };
  const HOUSE = (top, side) => ({ h: 30, top, side, face: 'plaster', roof: 'tiles', windows: true, door: { chance: .5 }, shutters: true });
  // BRIGHTWATER: a walled town round a square and its fountain; houses for the elder, the inn and the shop
  const TOWN = pad([
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T##############################T',
    'T#tt..........................#T',
    'T#.EEEEEE..........IIIIIII..t.#T',
    'T#.EEEEEE..........IIIIIII....#T',
    'T#.EEEEEE...t......IIIIIII.l..#T',
    'T#....e,,,,,,,,,,,,,,,,i......#T',
    'T#..n..,......,...............#T',
    'T#.....,..~~~.,.......SSSSSS..#T',
    'T#..t..,..~F~.,.......SSSSSS..#T',
    'T#.....,..~~~.,,,,,,,.SSSSSS..#T',
    'T#.....,,,,,,,,..c...,.v......#T',
    'T#..........,........,........#T',
    'T#..k...w...,........,...C....#T',
    'T#..........,....b...,........#T',
    'T#...Y......,,,,,,,,,,......t.#T',
    'T#..........,.................#T',
    'T#..t.......,@........t.......#T',
    'T#tt........,...............tt#T',
    'T###########g##################T',
    'TTTTTTTTTTTTxTTTTTTTTTTTTTTTTTTT']);
  const TOWN_LEGEND = { 'T': { tile: 3, spawn: 'tree' }, '#': 1, 'E': 4, 'I': 2, 'S': 5, '~': { floor: 'water', block: true }, 'F': { tile: 6, spawn: 'fountain' }, ',': { floor: 'path' },
    t: { floor: null, block: true, spawn: 'tree' }, l: { block: true, spawn: 'lamp' }, n: { block: true, spawn: 'sign' }, k: { block: true, spawn: 'barrels' }, b: { block: true, spawn: 'bench' },
    e: 'elder', i: 'inn', v: 'shop', c: 'child', w: 'woman', g: { floor: 'path', spawn: 'guard' }, C: { block: true, spawn: 'chest' }, Y: { block: true, spawn: 'crystal' }, '@': { floor: 'path', spawn: 'start' }, x: { floor: 'exit', spawn: 'exit' } };
  const TOWN_TYPES = { 1: { h: 16, top: '#9a9488', side: '#7a7266', face: 'stone', roof: 'slab' }, 2: HOUSE('#c8503a', '#e8dcc0'), 3: { h: 2, top: '#3a6a34', side: '#2e5a2a', face: 'none', roof: 'grass' },
    4: HOUSE('#4a6ab8', '#e8dcc0'), 5: HOUSE('#4a9a5a', '#e0d4b8'), 6: { h: 6, top: '#a8b0c0', side: '#8a92a4', face: 'stone', roof: 'slab' } };
  const townTex = (x, y, tag) => tag === 'water' ? E.tex.water(x, y, { base: '#3a7ac8', dark: '#2a5aa8', light: '#9ad0ff' }) : tag === 'path' || tag === 'exit' ? E.tex.flagstone(x, y, PAVE, 12) : E.tex.grass(x, y, MEADOW);
  const PAVE = { stones: [[176, 164, 140], [164, 150, 128], [188, 176, 150]], mortar: [110, 98, 82], hi: [210, 200, 176], lo: [130, 118, 98], speck: [150, 138, 116] };
  const MEADOW = { base: '#5e9a44', dark: '#4a8238', light: '#78b252', flower: '#ffe8a0' };
  // THE CAVE: tunnels from the mouth (x) past a chest (C) and a crystal (Y) to the knight's hall (K)
  const CAVE = pad([
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
    'RRRRR..........RRRRRRRR.......K......RRR',
    'RRRR............RRRRRR...............RRR',
    'RRR.....C........RRRRR...............RRR',
    'RRR..............RRRRR......,,,......RRR',
    'RRRR.....RRR.....RRRRRR.....,Y,....RRRRR',
    'RRRRR...RRRR.....RRRRRRR....,,,...RRRRRR',
    'RRRRRR..RRRR......RRRRRR.....,....RRRRRR',
    'RRRRRR..RRRRR......RRRRR.....,....RRRRRR',
    'RRRRR...RRRRRR......RRRR.....,....RRRRRR',
    'RRRR....RRRRRRR......RRR.....,....RRRRRR',
    'RRRR...RRRRRRRRR......RR.....,....RRRRRR',
    'RRRR...RRRRRRRRRR................RRRRRRR',
    'RRRR...RRRRRRRRRRR...............RRRRRRR',
    'RRRR....RRRRRRRRRRR.........RRRRRRRRRRRR',
    'RRRRR....RRRRRRRRRR........RRRRRRRRRRRRR',
    'RRRRRR....RRRRRRRRR.......RRRRRRRRRRRRRR',
    'RRRRRRR....RRRRRRR.......RRRRRRRRRRRRRRR',
    'RRRRRRRR....RRRRR.......RRRRRRRRRRRRRRRR',
    'RRRRRRRRR.........@....RRRRRRRRRRRRRRRRR',
    'RRRRRRRRRR..........RRRRRRRRRRRRRRRRRRRR',
    'RRRRRRRRRRR..xxx...RRRRRRRRRRRRRRRRRRRRR',
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR']);
  const CAVE_LEGEND = { R: 1, ',': { floor: 'moss' }, C: { block: true, spawn: 'chest' }, Y: { block: true, spawn: 'crystal' }, K: 'knight', '@': 'start', x: { floor: 'exit', spawn: 'exit' } };
  const CAVE_TYPES = { 1: { h: 30, top: '#4a4058', side: '#3a3248', line: '#1a1424', face: 'rock', roof: 'plain', cut: true, cutH: 5 } };
  const caveTex = (x, y, tag) => {   // rough rock: mottled, cracked, cold puddles; moss by the crystal
    const n = E.noise2(x * .09, y * .09), k = E.noise2(x * .03 + 7, y * .03), crack = Math.abs(E.noise2(x * .06 + 3, y * .06 - 5) - .5) < .018, w = E.noise2(x * .05, y * .06);
    let c = [58 + n * 26 + k * 12, 52 + n * 22 + k * 10, 70 + n * 24 + k * 14];
    if (crack) c = c.map(v => v * .5); else if (E.hash2(x | 0, y | 0) > .97) c = c.map(v => v * 1.25);
    return tag === 'moss' ? c.map((v, i) => v * [.7, 1.3, .8][i]) : w > .74 ? c.map((v, i) => v * [.8, .95, 1.35][i]) : c;
  };
  // THE WORLD: an island of 256 x 256 cells, made once from noise: the sea round it, beaches, meadows (plains), woods
  // (forest), mountains (walls of three heights), the road from the town (south) to the cave (north, ringed by peaks)
  const N = 256, TOWN_AT = [128, 176], CAVE_AT = [128, 64], ROAD = [CAVE_AT[1], TOWN_AT[1] - 3];
  const roadX = y => { const u = (y - ROAD[0]) / (ROAD[1] - ROAD[0]) * TAU; return 128 + Math.round(12 * Math.sin(u) + 4 * Math.sin(u * 3)); };   // the road's middle at row y: an S that starts and ends at x 128
  function makeWorld() {
    const cells = new Array(N * N).fill(0), floor = new Array(N * N).fill(null), block = new Array(N * N).fill(0), I = (x, y) => y * N + x;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = (x - 128) / 118, dy = (y - 124) / 118, d = dx * dx + dy * dy, n = E.noise2(x * .028, y * .028) * .65 + E.noise2(x * .09 + 5, y * .09) * .35, i = I(x, y);
      const road = y >= ROAD[0] && y <= ROAD[1] && Math.abs(x - roadX(y)) <= 1, nearRoad = y >= ROAD[0] - 2 && y <= TOWN_AT[1] + 3 && Math.abs(x - roadX(Math.min(y, ROAD[1]))) <= 4;
      if (n - d * .75 < .05 && !nearRoad) { floor[i] = 'sea'; block[i] = 1; continue; }
      if (road) { floor[i] = 'road'; continue; }
      const m = E.noise2(x * .05 + 20, y * .05), f = E.noise2(x * .045 + 40, y * .045 + 11), ring = Math.hypot(x - CAVE_AT[0], y - CAVE_AT[1]);
      if (!nearRoad && (m > .66 || (ring > 3 && ring < 9))) { floor[i] = 'peak'; block[i] = 1; }   // the peaks, and the ring round the cave
      else if (f > .58) floor[i] = 'forest';
    }
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const i = I(x, y); if (floor[i] === null && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => floor[I(x + a, y + b)] === 'sea')) floor[i] = 'sand'; }   // the beaches
    for (let y = -1; y <= 2; y++) for (let x = -2; x <= 2; x++) { const i = I(TOWN_AT[0] + x, TOWN_AT[1] + y); floor[i] = 'brightwater'; block[i] = 1; }   // Brightwater, small, its gate north to the road
    const gate = I(TOWN_AT[0], TOWN_AT[1] - 2); floor[gate] = 'town'; block[gate] = 0;
    for (let y = -4; y <= 0; y++) for (let x = -1; x <= 1; x++) { const i = I(CAVE_AT[0] + x, CAVE_AT[1] + y); floor[i] = 'peak'; block[i] = 1; }   // the mouth in the peaks
    const mouth = I(CAVE_AT[0], CAVE_AT[1]); floor[mouth] = 'cave'; block[mouth] = 0;
    for (let y = 1; y < 4; y++) for (let x = -1; x <= 1; x++) { const i = I(CAVE_AT[0] + x, CAVE_AT[1] + y); if (floor[i] === 'sea' || floor[i] === 'peak') floor[i] = null; block[i] = 0; }
    const map = new E.TileMap({ w: N, h: N, cells, floor, blocked: block, types: WORLD_TYPES, floorTex: worldTex, outside: '#2a5aa8', shimmer: true });
    map.spawns.push({ tag: 'start', x: (TOWN_AT[0] + .5) * T, y: (TOWN_AT[1] - 2.5) * T, z: 0 }, { tag: 'mouth', x: (CAVE_AT[0] + .5) * T, y: (CAVE_AT[1] + 1.5) * T, z: 0 });
    return map;
  }
  const WORLD_TYPES = {};
  const SAND = { base: '#e0d090', dark: '#c8b474', light: '#f0e4b0' };
  const worldTex = (x, y, tag) => {
    if (tag === 'sea') return E.tex.water(x, y, { base: '#2f68b8', dark: '#24549a', light: '#7ab0e8' });
    if (tag === 'sand') return E.tex.dirt(x, y, SAND);
    if (tag === 'road' || tag === 'town') return E.tex.dirt(x, y, { base: '#b89a6a', dark: '#9a7e54', light: '#d0b484' });
    if (tag === 'peak') return peakTex(x, y);
    if (tag === 'brightwater') return townIcon(x, y);
    if (tag === 'cave') { const u = x / T % 1 - .5, v = y / T % 1 - .3; return u * u * 2.2 + v * v * 1.2 < .14 ? [12, 8, 18] : peakTex(x, y); }   // a dark arch in the rock
    const g = E.tex.grass(x, y, MEADOW); if (tag !== 'forest') return g;
    // a wood seen from above: round crowns on a jittered grid, lit from the upper left (baked once, nothing to draw per frame)
    let best = 99, lx = 0, ly = 0; const gx = Math.floor(x / 9), gy = Math.floor(y / 9);
    for (let j = -1; j < 2; j++) for (let i = -1; i < 2; i++) { const cx = (gx + i + E.hash2(gx + i, gy + j) * .8) * 9, cy = (gy + j + E.hash2(gy + j, gx + i + 3) * .8) * 9, d = Math.hypot(x - cx, y - cy); if (d < best) { best = d; lx = x - cx; ly = y - cy; } }
    if (best > 6.2) return g.map(v => v * .55);   // the shade between the trees
    const k = 1 - best / 9, lit = -(lx + ly) / 8.5;
    return [34 + 40 * k + 26 * lit, 82 + 50 * k + 30 * lit, 40 + 22 * k + 14 * lit];
  };

  // a cell of mountains seen from above: a peak (its top jittered), its faces lit from the upper left, a ridge line where
  // they meet, snow on the highest; the ground between the peaks dark rock (baked once, like the woods)
  function peakTex(x, y) {
    const cx = Math.floor(x / T), cy = Math.floor(y / T), px0 = (cx + .5 + (E.hash2(cx, cy) - .5) * .35) * T, py0 = (cy + .45 + (E.hash2(cy, cx + 9) - .5) * .3) * T, dx = x - px0, dy = y - py0;
    const d = Math.max(Math.abs(dx), Math.abs(dy) * 1.15) / (T * .62), high = E.noise2(cx * .05 + 20, cy * .05) > .76 || Math.hypot(cx - CAVE_AT[0], cy - CAVE_AT[1]) < 6;
    if (d > 1) return [88 + E.hash2(x | 0, y | 0) * 10, 80, 64];   // the ground between
    const left = Math.abs(dx) > Math.abs(dy) * 1.15 ? dx < 0 : dy < 0, ridge = Math.abs(Math.abs(dx) - Math.abs(dy) * 1.15) < .7, h = 1 - d, snow = high && h > .45;
    const c = snow ? (left ? [240, 244, 248] : [176, 188, 204]) : left ? [176, 160, 132] : [110, 98, 82];
    return ridge && !left ? c.map(v => v * .78) : c.map(v => v * (.86 + h * .22));
  }
  // Brightwater on the map: a stone wall round four red roofs, its gate north (baked)
  function townIcon(x, y) {
    const bx = x - (TOWN_AT[0] - 2) * T, by = y - (TOWN_AT[1] - 1) * T, W = 5 * T, H = 4 * T;
    if (bx < 3 || by < 3 || bx > W - 3 || by > H - 3) return (Math.floor(bx / 4) + Math.floor(by / 4)) % 2 ? [168, 160, 146] : [140, 132, 120];   // the wall's stones
    for (const [u, v] of [[.22, .3], [.62, .26], [.3, .68], [.74, .66]]) {
      const hx = bx - u * W, hy = by - v * H;
      if (Math.abs(hx) < 9 && hy > -7 && hy < 8) return hy < 0 ? [216, 96, 74] : hy < 4 ? [160, 58, 42] : [232, 220, 192];   // the roof's lit and shaded halves, the front wall
    }
    return E.tex.flagstone(x, y, PAVE, 8);
  }

  /* ---- THE PEOPLE: their looks (E.Humanoid options), where they stand, what they say (story nodes), how they idle ---- */
  const LOOKS = {
    elder: { size: 1.15, weapon: 'staff', outfit: 'robe', hair: 'short', sleeves: 'long', hunch: .45, hat: { style: 'pointed', color: '#3e3278' }, face: { eyes: 'big', bangs: .3 }, colors: { cloth: '#5a4a9a', pants: '#4a3a7a', hair: '#e8e8e8', staff: '#8a6a3a', orb: '#ffd060', trim: '#e8c860' } },
    inn: { size: 1.2, build: 'bulky', weapon: null, outfit: 'tunic', hair: 'short', face: { eyes: 'big' }, colors: { cloth: '#c8783a', pants: '#5a4030', hair: '#5a3a1a', trim: '#f0e0b0' } },
    shop: { size: 1.1, weapon: null, outfit: 'robe', hair: 'ponytail', sleeves: 'long', face: { eyes: 'big', bangs: .8 }, colors: { cloth: '#3a8a5a', pants: '#2a6a4a', hair: '#c83a2a', trim: '#f0e0a0' } },
    guard: { size: 1.25, build: 'heroic', armor: true, sleeves: 'long', hat: { style: 'helmet', color: '#9aa4c0' }, bladeLen: 12, colors: { cloth: '#3a5ab0', pants: '#2a3a6a', metal: '#b8c0d8', trim: '#e8c860' } },
    child: { size: .85, weapon: null, hair: 'spiky', face: { eyes: 'big', bangs: .9 }, colors: { cloth: '#e8b040', pants: '#4a6ab0', hair: '#7a4a2a' } },
    woman: { size: 1.1, weapon: null, outfit: 'robe', hair: 'long', sleeves: 'long', face: { eyes: 'big', bangs: .5 }, colors: { cloth: '#c84a7a', pants: '#9a3a6a', hair: '#2a1a1a', trim: '#f0d0e0' } }
  };
  const NAMES = { elder: 'ELDER', inn: 'INNKEEPER', shop: 'MERCHANT', guard: 'GUARD', child: 'PIP', woman: 'MARTA', knight: 'DREAD KNIGHT', rowan: 'ROWAN', lyra: 'LYRA', sera: 'SERA' };
  // what everyone says: E.Story's nodes (markup in the lines; gold and the hero's name from story.vars)
  const NODES = {
    elder: [{ if: 'done:cave', goto: 'elderThanks' }, { if: 'quest:cave', goto: 'elderAgain' },
      { who: 'elder', emote: '!', say: 'Ah, travelers! Welcome to {c=#ffe08a}Brightwater{/c}.' },
      { who: 'elder', say: ['Since the {c=#ff8a8a}Dread Knight{/c} took the cave in the northern mountains,{w=.4} our wells have run dry.', 'Will you clear the cave for us?'], choices: [
        { text: 'We will', quest: ['cave', 'The Dread Knight', 'Clear the cave in the northern mountains, up the road from Brightwater. The elder gave you its key.'], event: 'key' },
        { text: 'Not yet', goto: 'elderLater' }] },
      { who: 'elder', say: 'Take its key, and {c=#ffe08a}100 gold{/c} for the road.{w=.3} The inn and the shop are on the square.' }],
    elderLater: [{ who: 'elder', emote: 'dots', say: 'I understand.{w=.3} Come back when you are ready.' }],
    elderAgain: [{ who: 'elder', say: 'The cave lies north, past the woods.{w=.3} Follow the road, {$hero}.' }],
    elderThanks: [{ who: 'elder', emote: 'heart', say: 'The water flows again!{w=.4} Brightwater will sing of you, {$hero}.' }],
    inn: [{ who: 'inn', say: 'Welcome to the {c=#ffe08a}Sleeping Dragon{/c}! A night is 10 gold.', choices: [{ text: 'Stay (10 G)', if: 'gold >= 10', set: 'slept', event: 'inn', wait: true }, { text: 'No thanks' }] },
      { if: 'slept', who: 'inn', say: 'Good morning! You look ready for anything.', set: { slept: false } }],
    shop: [{ who: 'shop', say: 'Potions, blades and good armor!{w=.2} Have a look.', event: 'shop', wait: true }, { who: 'shop', say: 'Come again!' }],
    guard: [{ if: '!quest:cave', who: 'guard', say: 'The road north is dangerous.{w=.3} Speak to the elder before you go.' }, { if: 'quest:cave', who: 'guard', say: 'Good luck, {$hero}. Monsters prowl the woods: walk the road.' }],
    child: [{ who: 'child', emote: 'note', say: 'La la la!{w=.3} Do you like my song?', choices: [{ text: 'It\'s lovely', set: 'song' }, { text: 'Hmm...' }] },
      { if: 'song', who: 'child', emote: 'heart', say: 'Yay! I\'ll sing it when the water comes back!' }, { if: '!song', who: 'child', emote: '?', say: 'Hmph. You sound like my brother.' }],
    woman: [{ if: 'done:cave', who: 'woman', say: 'My well is full again!{w=.3} Thank you!' }, { if: '!done:cave', who: 'woman', say: 'They say the knight was a hero once.{w=.4} {s=14}Before the cave changed him...{/s}' }],
    sign: [{ say: '{c=#ffe08a}BRIGHTWATER{/c}{w=.2}  North gate: closed.  South gate: the road.' }],
    sealed: [{ who: 'rowan', say: 'A door of stone, sealed tight.{w=.3} The elder must have its key.' }],
    found: [{ say: 'Found {c=#9ad0ff}{$found}{/c}!' }],
    crystal: [{ say: 'A crystal hums with soft light.{w=.3} {c=#8affc0}Your wounds close.{/c}', event: 'heal' }, { say: 'Record your journey?', choices: [{ text: 'Save', event: 'save', wait: true }, { text: 'Not now' }] }],
    knight: [{ who: 'knight', emote: '!', say: '{shake}Who dares walk my halls?{/shake}' }, { who: 'rowan', say: 'Brightwater wants its water back, knight!' },
      { who: 'knight', say: 'Then you will {c=#ff6a6a}{wave}join the stones{/wave}{/c}.{w=.5} Come!' }, { event: 'fight' }],
    victory: [{ who: 'rowan', say: 'It\'s over.{w=.3} Listen: water, running under the rock.' }, { who: 'sera', say: 'The spring is free. Let\'s go home.' }, { done: 'cave', set: 'knightDown' }, { event: 'home', wait: true },
      { who: 'elder', emote: 'heart', say: 'You did it!{w=.4} The wells are full, and Brightwater owes you everything.' }, { event: 'theend' }]
  };

  /* ---- STATE ---- */
  let party, story, at, map, maps = {}, hero, crew, people, things, trail = [], mode = 'title', t = 0, wins = [], banner = null, dark = 0, onDark = null, end = 0, saveNote = '', noteT = 0, boxes = [], fought = [], boss = false;
  const looks = () => RPG.looks;   // the battle's heroes: their rigs, names and moves
  const rigOf = name => new E.Humanoid((looks().find(p => p.name === name) || looks()[0]).rig);
  const lead = () => party.members[0];
  const place = id => ({ town: 'Brightwater', world: 'The Island', cave: 'The Northern Cave' })[id];
  function build(id) {   // a map, made once: its TileMap and what stands on it
    if (maps[id]) return maps[id];
    const m = id === 'town' ? new E.TileMap({ rows: TOWN, legend: TOWN_LEGEND, types: TOWN_TYPES, floorTex: townTex, ao: 6 }) : id === 'cave' ? new E.TileMap({ rows: CAVE, legend: CAVE_LEGEND, types: CAVE_TYPES, floorTex: caveTex, ao: 7, outside: '#06040a' }) : makeWorld();
    return (maps[id] = { id, map: m, zone: id === 'world' ? tag => tag === 'forest' ? 'forest' : tag === 'town' ? null : 'plains' : id === 'cave' ? () => 'cave' : () => null,
      song: id === 'town' ? TOWN_SONG : id === 'cave' ? 'dungeon' : ROAD_SONG });
  }
  // a new journey: the party at level 1 with 50 gold and two potions, the story at its start, in the town's square
  function fresh() {
    party = R.party(HEROES(), { gold: 50 }); party.inv.add('potion', 2);
    story = new E.Story(game, { nodes: NODES, vars: { hero: 'Rowan' }, on: EVENTS, dialog: new E.Dialog(game, { bg: WIN, lines: 3 }) });
    for (const n of ['rowan', 'lyra', 'sera']) story.people[n] = { name: NAMES[n], portrait: rigOf(n[0].toUpperCase() + n.slice(1)) };
    go('town', 'start');
  }
  // enter a map at one of its spawns (a tag) or a point: the people and things of its rows, the camera, the song, the light
  function go(id, spot) {
    const M = build(id); at = id; map = M.map;
    const s = typeof spot === 'string' ? map.find(spot) : spot;
    hero = Object.assign(new E.Body({ x: s.x, y: s.y, r: 4.5, friction: 10 }), { facing: -Math.PI / 2, rig: hero ? hero.rig : rigOf('Rowan') });
    crew = (crew || ['Lyra', 'Sera'].map(n => ({ name: n, rig: rigOf(n) }))).map(c => Object.assign(c, { x: s.x, y: s.y + 4, facing: hero.facing }));
    trail = []; people = []; things = [];
    for (const sp of map.spawns) {
      if (LOOKS[sp.tag]) people.push({ id: sp.tag, x: sp.x, y: sp.y, home: [sp.x, sp.y], face: Math.PI / 2, dir: Math.PI / 2, rig: new E.Humanoid(LOOKS[sp.tag]), t: E.hash2(sp.cx, sp.cy) * 3 });
      else if (sp.tag === 'knight') { if (!story.get('knightDown')) people.push({ id: 'knight', x: sp.x, y: sp.y, home: [sp.x, sp.y], face: Math.PI / 2, dir: Math.PI / 2, rig: new E.Humanoid(RPG.kin.knight.rig), boss: true, t: 0 }); }
      else if (['chest', 'crystal', 'tree', 'fountain', 'lamp', 'sign', 'barrels', 'bench'].includes(sp.tag)) things.push({ kind: sp.tag, x: sp.x, y: sp.y, key: id + ':' + sp.cx + ',' + sp.cy });
    }
    const guard = people.find(p => p.id === 'guard'); if (guard && story.test('quest:cave')) { guard.x += T; guard.y -= T; }   // the gate opened: he stands aside
    for (const p of people) story.people[p.id] = { name: NAMES[p.id], portrait: p.rig, at: p };
    story.people.rowan.at = hero;
    game.follow(hero, { z: 14 }); game.cam.bounds = v => map.bounds(v); game.cam.snap = true;
    A.music(M.song); L.enabled = id === 'cave'; if (L.enabled) { L.ambient = .32; L.dark = [6, 4, 14]; L.refresh && L.refresh(); }
    banner = { text: place(id), t: 2.4 }; ENC.left = null;
  }
  const near = (a, d) => Math.hypot(a.x - hero.x, a.y - hero.y) < d;
  const talkable = () => people.find(p => near(p, p.boss ? 30 : 21)) || things.find(o => (o.kind === 'chest' && !story.get(o.key)) || o.kind === 'crystal' || o.kind === 'sign' ? near(o, 21) : false);

  /* ---- EVENTS: the story's calls into the game ---- */
  const EVENTS = {
    key() { party.inv.add('key'); party.gold += 100; A.sfx('key'); const g = people.find(p => p.id === 'guard'); if (g) { g.x = g.home[0] + T; g.y = g.home[1] - T; } },
    inn() { party.gold -= 10; A.sfx('pause'); night(() => { party.rest(); game.saves.autosave(); story.resume(); }); },
    shop() { open(shopWin(() => story.resume())); },
    heal() { party.rest(); A.sfx('heal'); P.glints(hero.x, hero.y, 20, 14, '#8affc0', 18); },
    save() { open(saveWin('save', () => story.resume())); },
    fight() { battle(['knight', 'gargoyle', 'gargoyle'], { boss: true }); },
    home() { night(() => { go('town', 'start'); story.resume(); }); },
    theend() { end = 1; A.music('victory'); }
  };
  const night = f => { dark = 1.6; onDark = f; };   // the screen goes dark, f runs at the darkest, it comes back
  // a random encounter (or the boss): the swirl into the battle scene, the party and its bag with it; back here after
  function battle(troop, o = {}) {
    mode = 'battle'; boss = !!o.boss; fought.push([at, troop.join('+'), Math.round(game.time)]); A.sfx('warp');
    game.go('rpg-battle', { troop, party, stats: MONSTERS, cave: at === 'cave', boss: !!o.boss, music: BATTLE_SONG, done: r => game.go('rpg', { back: r }, { fade: .3 }) },
      { fade: 'swirl', seconds: .5, at: { x: hero.x, y: hero.y, z: 12 } });
  }
  function back(r) {   // home from a battle: won (the boss: the scene after), fled, or fallen (the game over)
    mode = 'walk'; game.follow(hero, { z: 14 }); game.cam.bounds = v => map.bounds(v); game.cam.snap = true; A.music(build(at).song); L.enabled = at === 'cave';
    if (!r.won && !r.fled) return void game.after(.01, () => game.go('over', { from: 'rpg' }));
    if (r.won && boss) { people = people.filter(p => !p.boss); story.set('knightDown'); story.vars.gold = party.gold; story.run('victory'); }
  }

  /* ---- WINDOWS: a stack of lists (rpg.list) the keys, the pad and taps move through; each { title, rows(), pick(i, row),
   * back(), x, y, w, show, i, top, foot() (a line under it), side(g, box) (a window beside it) } ---- */
  const open = w => { w.i = w.i || 0; w.top = 0; wins.push(w); inp.consumeAll(); A.sfx('select'); return w; };
  const close = () => { const w = wins.pop(); inp.consumeAll(); A.sfx('cancel'); if (w && w.done) w.done(); };
  const say = s => { saveNote = s; noteT = 2.2; };
  const fit = (r, w) => Math.min(w, r.W - 16);
  function menuWin() {   // the field's menu, FF style: its commands; the party's cards and the gold beside them
    return { title: 'MENU', w: 92, rows: () => [{ label: 'Items' }, { label: 'Equip' }, { label: 'Status' }, { label: 'Quests' }, { label: 'Save', off: !atCrystal(), note: atCrystal() ? '' : '-' }],
      pick: i => [() => open(itemsWin()), () => open(whoWin('Equip', m => open(slotsWin(m)))), () => open(statusWin()), () => open(questsWin()), () => open(saveWin('save'))][i](), side: true };
  }
  const atCrystal = () => things.some(o => o.kind === 'crystal' && near(o, 30));
  function itemsWin() {
    const list = () => party.inv.list();
    return { title: 'ITEMS', w: 170, rows: () => list().length ? list().map(e => ({ label: e.item.name, note: '×' + e.n, icon: R.icon(e.id), off: e.item.kind !== 'use' })) : [{ label: '(nothing)', off: true }],
      foot: w => { const e = list()[w.i]; return e ? e.item.info || '' : ''; },
      pick: i => { const e = list()[i]; if (!e || e.item.kind !== 'use') return; open(whoWin('Use ' + e.item.name, m => { if (party.use(e.id, m)) { A.sfx('heal'); say(m.name + ': ' + e.item.info.toLowerCase() + '.'); } else { A.sfx('bump'); say('It has no effect.'); } close(); if (!party.inv.has(e.id)) wins[wins.length - 1].i = 0; })); } };
  }
  function whoWin(title, then) { return { title: title.toUpperCase(), w: 110, rows: () => party.members.map(m => ({ label: m.name, note: m.hp + '/' + m.max('hp') })), pick: i => then(party.members[i]), side: true }; }
  const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armor', helm: 'Helm', accessory: 'Accessory' }, fits = (id, m) => { const it = R.item(id); return !it.for || it.for.split(' ').includes(m.name); };
  function slotsWin(m) {
    const ks = Object.keys(SLOT_NAMES);
    return { title: m.name.toUpperCase() + ' · EQUIP', w: 190, rows: () => ks.map(k => ({ label: SLOT_NAMES[k], note: m.equipped[k] ? R.item(m.equipped[k]).name : '-' })), member: m,
      pick: i => open(gearWin(m, ks[i])) };
  }
  function gearWin(m, slot) {
    const list = () => party.inv.list().filter(e => e.item.kind === slot && fits(e.id, m)), delta = id => Object.entries(m.compare(id)).map(([k, d]) => (d > 0 ? '+' : '') + d + ' ' + k.toUpperCase()).join(' ');
    return { title: SLOT_NAMES[slot].toUpperCase(), w: 200, member: m,
      rows: () => [...list().map(e => ({ label: e.item.name, note: delta(e.id) || '=', icon: R.icon(e.id) })), { label: '(remove)', off: !m.equipped[slot] }],
      pick: i => { const e = list()[i]; if (e) { m.equip(e.id, party.inv); A.sfx('powerup'); say(m.name + ' equips the ' + e.item.name + '.'); } else if (m.equipped[slot]) { m.unequip(slot, party.inv); say('Removed.'); } close(); } };
  }
  function statusWin() { return { title: 'STATUS', w: 120, rows: () => party.members.map(m => ({ label: m.name, note: 'Lv ' + m.level })), pick: () => {}, side: true, status: true, foot: w => { const m = party.members[w.i]; return m.exp + ' EXP · ' + m.next + ' to the next level'; } }; }
  function questsWin() {
    const q = () => story.quests;
    return { title: 'QUESTS', w: 200, rows: () => q().length ? q().map(x => ({ label: x.title, note: x.done ? 'Done' : '...' })) : [{ label: '(none yet)', off: true }], pick: () => {}, foot: w => (q()[w.i] || {}).text || '' };
  }
  const slotName = s => s === 'auto' ? 'Autosave' : 'Slot ' + (s + 1);
  const about = s => s.empty ? 'Empty' : s.damaged ? 'Damaged' : s.newer ? 'Newer version' : (s.place || '') + ' · Lv ' + s.level + ' · ' + Math.floor(s.time / 3600) + ':' + String(Math.floor(s.time / 60) % 60).padStart(2, '0');
  function saveWin(kind, done) {   // the slots (game.saves): save to one (not the autosave), or load one
    const list = () => game.saves.list().filter(s => kind === 'load' || s.slot !== 'auto');
    return { title: kind === 'save' ? 'SAVE' : 'LOAD', w: 230, done, rows: () => list().map(s => ({ label: slotName(s.slot), note: about(s), off: kind === 'load' && (s.empty || s.damaged || s.newer) })),
      pick: i => { const s = list()[i]; if (kind === 'save') { game.saves.save(s.slot); A.sfx('confirm'); say('Saved to ' + slotName(s.slot) + '.'); } else if (load(s.slot)) { wins = []; say('Loaded ' + slotName(s.slot) + '.'); } } };
  }
  function shopWin(done) {   // the merchant: buy (the gold you have, what you carry) or sell
    const stock = () => SHOP.items.filter(id => id !== 'iron' && id !== 'chain' && id !== 'ring' || story.test('quest:cave'));
    return { title: 'SHOP', w: 120, done, rows: () => [{ label: 'Buy' }, { label: 'Sell' }, { label: 'Leave' }],
      pick: i => i === 2 ? close() : open(i === 0 ? { title: 'BUY', w: 210, rows: () => stock().map(id => ({ label: R.item(id).name, note: SHOP.price(id) + ' G', icon: R.icon(id), off: party.gold < SHOP.price(id) })), foot: w => { const id = stock()[w.i]; return id ? R.item(id).info + ' · you have ' + party.inv.count(id) : ''; },
        pick: k => { const id = stock()[k]; if (SHOP.buy(party, id)) { A.sfx('coin'); say('Bought a' + (/^[AEIOU]/.test(R.item(id).name) ? 'n ' : ' ') + R.item(id).name + '.'); } else { A.sfx('bump'); say('Not enough gold.'); } } }
        : { title: 'SELL', w: 210, rows: () => party.inv.list().map(e => ({ label: e.item.name, note: e.item.kind === 'key' ? '-' : SHOP.worth(e.id) + ' G', icon: R.icon(e.id), off: e.item.kind === 'key' })), pick: k => { const e = party.inv.list()[k]; if (e && SHOP.sell(party, e.id)) { A.sfx('coin'); say('Sold.'); } } }), side: 'gold' };
  }
  function titleWin() {   // the journey's title: a new one, the last one, any saved one, or the battle alone
    const latest = game.saves.latest();
    return { title: null, w: 150, rows: () => [{ label: 'New game' }, { label: 'Continue', note: latest ? latest.place : '-', off: !latest }, { label: 'Load', off: !game.saves.any }, { label: 'Battle' }],
      pick: i => { if (i === 0) { wins = []; fresh(); mode = 'walk'; } else if (i === 1 && latest) { if (load(latest.slot)) wins = []; } else if (i === 2) open(saveWin('load')); else game.go('rpg-battle'); }, title0: true };
  }
  function menuUpdate() {
    const w = wins[wins.length - 1], rows = w.rows(), n = rows.length;
    const d = inp.repeat('up') ? -1 : inp.repeat('down') ? 1 : 0;
    if (d && n) { w.i = (w.i + n + d) % n; A.sfx('select'); }
    const c = inp.clicked(), b = c && boxes.find(x => x.w === w), k = b ? b.box.row(c[0], c[1]) : -1;
    if (k >= 0) { w.i = k; inp.consumeAll(); }
    if ((inp.pressed('confirm') || k >= 0) && n && !rows[w.i].off) { inp.consumeAll(); A.sfx('confirm'); w.pick(w.i, rows[w.i]); }
    else if (inp.pressed('cancel') && !w.title0) close();
    w.top = clamp(w.top, Math.max(0, w.i - (w.show || 8) + 1), w.i);
  }
  // saving and loading the journey (game.saves): where the party stands, the party, the story
  game.saves.write = () => ({ data: { at, x: Math.round(hero.x), y: Math.round(hero.y), party: party.state(), story: story.state() }, place: place(at), level: lead().level });
  function load(slot) {
    let ok = false; const was = game.saves.read;
    game.saves.read = s => { ok = true; fresh(); party = R.restore(s.data.party); story.restore(s.data.story); crew = null; go(s.data.at, { x: s.data.x, y: s.data.y }); mode = 'walk'; };
    game.saves.load(slot); game.saves.read = was; return ok;
  }

  /* ---- UPDATE ---- */
  function walkUpdate(dt) {
    const h = hero, ui = wins.length > 0, near0 = !ui && !story.running && talkable();
    inp.touchSet('confirm', story.running ? 'NEXT' : ui ? 'OK' : near0 ? (near0.kind ? 'LOOK' : 'TALK') : null, story.running || ui || !!near0);
    inp.touchSet('skill', 'MENU', !ui && !story.running && mode === 'walk'); inp.touchSet('cancel', 'BACK', ui && !(wins[wins.length - 1] || {}).title0);
    if (dark > 0) { const was = dark; dark -= dt; if (was > .8 && dark <= .8 && onDark) { const f = onDark; onDark = null; f(); } return; }
    if (ui) return menuUpdate();
    story.vars.gold = party.gold;
    if (story.update(dt)) return;
    if (end) { if (inp.pressed('confirm') && end > 1.5) { end = 0; mode = 'walk'; A.music(build(at).song); } return; }
    if (inp.pressed('skill')) return void open(menuWin());
    if (near0 && inp.pressed('confirm')) return void interact(near0);
    // walking: the stick or keys to a ground direction (the camera's turn applied), a little run-up and slow-down
    const mv = inp.move(), md = game.view.screenDirToGround(mv[0], mv[1]), sp = 76, ox = h.x, oy = h.y;
    if (Math.hypot(md[0], md[1]) > .1) h.facing = Math.atan2(md[1], md[0]);
    h.vx = approach(h.vx, md[0] * sp, 700 * dt); h.vy = approach(h.vy, md[1] * sp, 700 * dt);
    h.update(dt, map); for (const p of people) { const dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy), r = p.boss ? 14 : 8; if (d < r && d > 0) { h.x = p.x + dx / d * r; h.y = p.y + dy / d * r; } }   // townsfolk stand their ground
    const moved = Math.hypot(h.x - ox, h.y - oy), tag = map.floorAt(h.x, h.y);
    if (moved > .01) { trail.unshift([h.x, h.y]); if (trail.length > 60) trail.length = 60; }
    // where the floor leads: out of town, into town, the cave (its key), out of the cave
    if (tag === 'exit') return void (at === 'town' ? go('world', 'start') : go('world', 'mouth'));
    if (tag === 'town') return void go('town', 'start');
    if (tag === 'cave') { if (party.inv.has('key')) return void go('cave', 'start'); h.y += 10; story.run('sealed'); return; }
    if (people.some(p => p.boss && near(p, 56))) return void story.run('knight');   // the knight's scene, then the fight
    const zone = build(at).zone(tag), troop = moved > .01 && zone && ENC.walk(zone, moved);
    if (troop) battle(troop);
  }
  function interact(o) {
    if (o.id) { o.face = E.angleTo(o, hero); return void story.run(o.id); }
    if (o.kind === 'sign') return void story.run('sign');
    if (o.kind === 'crystal') return void story.run('crystal');
    if (o.kind === 'chest') {   // a chest opens once (its key in the story's vars, so a save keeps it)
      const item = at === 'cave' ? 'ether' : 'hipotion'; story.set(o.key); party.inv.add(item); story.vars.found = R.item(item).name; A.sfx('secret'); P.glints(o.x, o.y, 14, 10); story.run('found');
    }
  }
  function people_(dt) {   // the townsfolk idle, glance about, face whoever speaks to them; the crew follows the leader's steps
    const cam = Math.atan2(game.view.fy, game.view.fx);
    for (const p of people) {
      const says = story.running && story.talk.open && story.talk.name === NAMES[p.id];
      if ((p.t -= dt) <= 0) { p.t = E.rand(2, 4); p.look = p.face + E.rand(-.8, .8); }
      const goal = says ? E.angleTo(p, hero) + E.angDiff(E.angleTo(p, hero), cam) * .5 : near(p, 30) ? E.angleTo(p, hero) : p.look ?? p.face;
      p.dir = E.approachAng(p.dir, goal, dt * 6);
      p.rig.update(dt, { x: p.x, y: p.y, z: 0, facing: p.dir, expr: says ? 'smile' : undefined, stance: p.boss ? 'ready' : undefined, pose: p.id === 'child' && !says ? (Math.floor(t * .7) % 3 === 0 ? 'wave' : undefined) : undefined });
    }
    crew.forEach((c, k) => {   // each a step further back along the leader's trail
      const q = trail[Math.min(trail.length - 1, (k + 1) * 9)] || [hero.x, hero.y], vx = (q[0] - c.x) / Math.max(dt, 1e-6), vy = (q[1] - c.y) / Math.max(dt, 1e-6);
      if (Math.hypot(q[0] - c.x, q[1] - c.y) > .05) c.facing = Math.atan2(q[1] - c.y, q[0] - c.x);
      c.x = q[0]; c.y = q[1]; c.rig.update(dt, { x: c.x, y: c.y, z: 0, facing: c.facing, vx: clamp(vx, -90, 90), vy: clamp(vy, -90, 90) });
    });
    hero.rig.update(dt, { x: hero.x, y: hero.y, z: 0, facing: hero.facing, vx: story.running || wins.length ? 0 : hero.vx, vy: story.running || wins.length ? 0 : hero.vy, pose: end ? 'cheer' : undefined });
  }
  function update(dt) {
    t += dt; noteT -= dt; if (banner) banner.t -= dt; if (end) end += dt;
    if (mode === 'battle') return;   // (the swirl into a battle: the field holds still)
    if (mode === 'title') { inp.touchSet('confirm', 'OK', true); inp.touchSet('skill', null, false); inp.touchSet('cancel', 'BACK', wins.length > 1); if (!wins.length) open(titleWin()); menuUpdate(); people_(dt); return; }
    people_(dt); walkUpdate(dt);
  }

  /* ---- DRAW ---- */
  const TREE = { params: { h: 34 }, mats: { l: '#3e7a3a foliage size=3' } };
  function drawThing(r, o) {
    const sx = r.w(o.x, o.y)[0], sy = r.w(o.x, o.y)[1]; if (sx < -40 || sx > r.W + 40 || sy < -60 || sy > r.H + 40) return;   // (only what's on screen)
    if (o.kind === 'tree') r.shape(E.hash2(o.x, o.y) < .5 ? 'tree' : 'pine', o.x, o.y, 0, { params: { h: 30 + E.hash2(o.y, o.x) * 12, seed: (o.x * 7 + o.y) % 9 }, mats: { l: E.hash2(o.x, 3) < .5 ? '#3e7a3a foliage size=3' : '#2e6a44 foliage size=3' } });
    else if (o.kind === 'chest') r.prop('chest', o.x, o.y, 0, { open: !!story.get(o.key) });
    else if (o.kind === 'crystal') { r.shape('crystal', o.x, o.y, 0, { params: { h: 20, seed: 4 }, }); if (L.enabled) L.add(o.x, o.y, 14, 70, 1, { color: '#6ad0ff' }); r.queue(o.x, o.y, 0, g => { const [x, y] = r.w(o.x, o.y, 12 + Math.sin(t * 2) * 2); r.glowDisc(g, x, y, 10, '#8ae8ff', .35); }, { emissive: true, bias: 1 }); }
    else if (o.kind === 'fountain') { r.shape('well', o.x, o.y, 0); }
    else if (o.kind === 'lamp') r.shape('lamppost', o.x, o.y, 0);
    else if (o.kind === 'sign') r.shape('sign', o.x, o.y, 0, { facing: Math.PI / 2 });
    else if (o.kind === 'barrels') { r.shape('barrel', o.x - 3, o.y, 0); r.shape('crate', o.x + 4, o.y + 2, 0, { facing: .3 }); }
    else if (o.kind === 'bench') r.shape('bench', o.x, o.y, 0, { facing: Math.PI / 2 });
  }
  function draw(r) {
    r.sky(at === 'cave' ? '#06040a' : at === 'world' ? '#2a5aa8' : '#2e5a2a');
    map.drawFloor(r); map.queueWalls(r);
    for (const o of things) drawThing(r, o);
    if (at === 'world') r.shape('crystal', (CAVE_AT[0] + .5) * T, (CAVE_AT[1] - .2) * T, 0, { params: { h: 9, seed: 2 } });   // a gleam over the cave's mouth
    const shadow = b => r.shadow(b.x, b.y, 5, .35, '#1a1030');
    for (const p of people) { shadow(p); r.actor(p.x, p.y, 0, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view), { every: 2, key: p }); }
    for (const c of crew) { shadow(c); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view)); }
    shadow(hero); r.actor(hero.x, hero.y, 0, (g, ox, oy) => hero.rig.draw(g, ox, oy, r.view));
    if (L.enabled) { L.add(hero.x, hero.y, 22, 110, 1.15 + Math.sin(t * 9) * .05, { color: '#ffb868' }); }   // the party's torch
    story.draw(r);
    r.overlay(g => hud(g, r));
  }
  function hud(g, r) {
    if (mode === 'title') {   // the journey's title over its town
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0820'));
      E.font.title(g, 'BRIGHTWATER', r.W / 2, Math.round(r.H * .2), { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#c8602a'], depth: 2 });
      txt(g, 'AND THE DREAD KNIGHT', r.W / 2, Math.round(r.H * .2) + 30, '#c8d0ff', 'center');
    }
    if (banner && banner.t > 0 && mode !== 'title') { const w = E.font.width(banner.text) + 26; px.blend(g, Math.min(1, banner.t), 'normal', () => { E.ui.box(g, r.W / 2 - w / 2, 10, w, 18, { bg: WIN }); txt(g, banner.text, r.W / 2, 15, '#ffffff', 'center'); }); }
    if (mode === 'walk' && !wins.length && !story.running) { const s = party.gold + ' G'; txt(g, s, r.W - 8, r.H - 14, GOLD, 'right'); }
    // the windows, each a little right of and below the one under it; cards or the gold beside the top one
    // on a touch screen a row is a thumb's height (46 CSS px), and a window shows what fits, scrolling the rest
    const S = game.screen, rh = inp.lastDevice === 'touch' ? Math.max(11, Math.ceil(46 / (S.S / S.dpr))) : 11;
    boxes = []; let x = 8, y = 8;
    wins.forEach((w, k) => {
      const ww = fit(r, w.w), wx = w.title0 ? Math.round(r.W / 2 - ww / 2) : Math.min(x, r.W - ww - 8), wy = w.title0 ? Math.round(r.H * .2) + 48 : Math.min(y, r.H - 60);
      w.show = Math.max(3, Math.min(8, Math.floor((r.H - wy - 40) / rh)));
      const box = R.list(g, wx, wy, ww, w.rows(), { cursor: k === wins.length - 1 ? w.i : -1, title: w.title, top: w.top, show: w.show, rowH: rh, bg: k === wins.length - 1 ? WIN : ['#4a5ab8', '#0a0a38'] });
      boxes.push({ w, box }); x = wx + 14; y = wy + 14;
      if (k === wins.length - 1) {
        const foot = w.foot && w.foot(w); if (foot) { const fw = Math.min(r.W - 16, 300); E.ui.box(g, Math.round(r.W / 2 - fw / 2), r.H - 34, fw, 26, { bg: WIN }); E.font.text(g, foot, Math.round(r.W / 2 - fw / 2) + 7, r.H - 29, '#e8ecff', { outline: false, shadow: '#0a0820', wrap: fw - 14 }); }
        if (w.side === true || w.status) {   // the party's cards beside it (a phone held upright: under it)
          const cx = wx + ww + 6 + 150 <= r.W - 4 ? wx + ww + 6 : 8, cy = cx === 8 ? wy + box.h + 4 : wy;
          party.members.forEach((m, j) => R.card(g, cx, cy + j * 64, m, { portrait: looksRig(m), w: Math.min(150, r.W - cx - 6), bg: w.status && j === w.i ? HOT : WIN }));
        }
        if (w.side) { const beside = w.side === 'gold' && wx + ww + 98 <= r.W, gx = beside ? wx + ww + 6 : wx, gy = beside ? wy : wy + box.h + 4 + (w.side === true && wx + ww + 156 > r.W ? 3 * 64 : 0); E.ui.box(g, gx, gy, 92, 18, { bg: WIN }); txt(g, party.gold + ' G', gx + 85, gy + 5, GOLD, 'right'); }   // the gold: beside the shop, under the menu (and the cards, upright)
      }
    });
    if (noteT > 0 && saveNote) { const w = E.font.width(saveNote) + 20; E.ui.box(g, r.W / 2 - w / 2, r.H / 2 - 9, w, 18, { bg: HOT }); txt(g, saveNote, r.W / 2, r.H / 2 - 4, '#ffffff', 'center'); }
    if (dark > 0) px.blend(g, clamp(1 - Math.abs(dark - .8) / .8, 0, 1), 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
    if (end) { px.blend(g, Math.min(.7, end * .5), 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0820')); E.font.title(g, 'THE END', r.W / 2, r.H / 2 - 20, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 }); if (end > 1.5) txt(g, inp.label('confirm') + ': WALK ON', r.W / 2, r.H / 2 + 24, '#c8d0ff', 'center'); }
  }
  const rigs = {}, looksRig = m => rigs[m.name] || (rigs[m.name] = rigOf(m.name));

  /* ---- THE BOT: it plays the journey by the keys, as a player would: the elder, the shop, a sword and a vest worn, the
   * chest, a save at the crystal, the road north through its encounters (each battle on AUTO), the cave's chest and
   * crystal, the knight's scene and fight, the way home; then it loads the save and checks what came back ---- */
  function bot() {
    const I = inp, rep = { errors0: game.errors.length }, dirs = ['up', 'down', 'left', 'right'];
    const step = () => game.advance(1 / 120), wait = n => { for (let i = 0; i < n; i++) step(); };
    const hold = d => { for (const k of dirs) I.hold(k, false); if (d) { if (d[0] > .38) I.hold('right'); if (d[0] < -.38) I.hold('left'); if (d[1] > .38) I.hold('down'); if (d[1] < -.38) I.hold('up'); } };
    const tap = (a, n = 1) => { for (let i = 0; i < n; i++) { I.tap(a); wait(14); } };
    // what plays by itself: a battle (AUTO on, its lines read), a scene change, the dark of a night, a line (read, the
    // first choice taken), the end card. The windows are the bot's to drive
    const busy = () => {
      if (game.sceneName === 'rpg-battle') { const s = scenes['rpg-battle'].state(); if (!s.auto && s.mode !== 'intro') tap('skill'); else tap('confirm'); return true; }
      if (game.sceneName !== 'rpg') { step(); return true; }
      if (wins.length) return false;
      if (mode === 'battle' || dark > 0) { step(); return true; }
      if (story.running) { tap('confirm'); return true; }
      if (end) { if (end > 1.6) tap('confirm'); else step(); return true; }
      return false;
    };
    const settle = (n = 120 * 120) => { hold(null); for (let i = 0; i < n && busy(); i++); };
    const walkTo = (tx, ty, r = 16, limit = 120 * 300) => {   // a flow field toward the point, round the walls; what plays by itself on the way
      const f = new E.FlowField(map), m0 = map; f.update(tx, ty);
      for (let i = 0; i < limit; i++) {
        if (busy()) { hold(null); continue; }
        if (map !== m0) { hold(null); return false; }
        if (Math.hypot(hero.x - tx, hero.y - ty) < r) { hold(null); return true; }
        hold(f.dir(hero.x, hero.y, tx, ty)); step();
      }
      hold(null); return false;
    };
    const visit = o => { walkTo(o.x, o.y + 13, 6); hero.facing = -Math.PI / 2; tap('confirm'); };
    const pick = (label, w = wins[wins.length - 1]) => { w.i = Math.max(0, w.rows().findIndex(row => row.label === label)); tap('confirm'); };
    const person = id => people.find(p => p.id === id), thing = k => things.find(o => o.kind === k);
    game.go('rpg', null, { fade: 0 }); wait(10); pick('New game'); fought = [];
    visit(person('elder')); settle(); rep.quest = story.test('quest:cave'); rep.key = party.inv.has('key');
    visit(person('shop')); settle();
    if (wins.length) { pick('Buy'); for (const id of ['bronze', 'leather', 'potion', 'potion', 'potion']) pick(R.item(id).name); tap('cancel', 2); settle(); }
    rep.bought = party.inv.has('bronze') && party.inv.has('leather') && party.inv.has('potion', 5);
    tap('skill'); pick('Equip'); pick('Rowan'); pick('Weapon'); pick('Bronze Sword'); tap('cancel', 3);   // the menu: a sword on Rowan, the vest on Sera
    tap('skill'); pick('Equip'); pick('Sera'); pick('Armor'); pick('Leather Vest'); tap('cancel', 3);
    rep.equipped = lead().equipped.weapon === 'bronze' && party.members[2].equipped.armor === 'leather';
    visit(thing('chest')); settle(); rep.chest = party.inv.has('hipotion');
    visit(thing('crystal')); for (let i = 0; i < 200 && !wins.length; i++) if (!busy()) step();
    if (wins.length) { pick('Slot 1'); tap('cancel'); } settle();
    const saved = game.saves.get(0); rep.saved = !!saved && saved.place === 'Brightwater'; rep.savedGold = party.gold;
    walkTo(map.find('exit').x, map.find('exit').y, 4); settle(); rep.world = at === 'world';
    const mouth = map.find('mouth');   // the road north (battles on the way); short of the cave it trains to level 3 on the road, as a player would; then in
    for (let k = 0; k < 30 && lead().level < 3 && at === 'world'; k++) { const y = k % 2 ? 84 : 104; walkTo((roadX(y) + .5) * T, (y + .5) * T, 10, 120 * 60); }
    for (let k = 0; k < 8 && at === 'world'; k++) { walkTo(mouth.x, mouth.y, 6); for (let i = 0; i < 120 * 2 && at === 'world'; i++) { if (busy()) continue; hold([0, -1]); step(); } hold(null); }
    rep.cave = at === 'cave'; rep.levelAtCave = lead().level;
    if (thing('chest')) { visit(thing('chest')); settle(); }
    if (thing('crystal')) { visit(thing('crystal')); for (let i = 0; i < 200 && !wins.length; i++) if (!busy()) step(); if (wins.length) { pick('Slot 2'); tap('cancel'); } settle(); }
    const kn = people.find(p => p.boss); if (kn) walkTo(kn.x, kn.y + 40, 18);
    for (let i = 0; i < 120 * 600 && (people.some(p => p.boss) || busy()); i++) if (!busy()) { hold([0, -1]); step(); hold(null); }
    settle(); rep.boss = story.get('knightDown') === true && story.test('done:cave'); rep.after = party.members.map(m => m.hp + '/' + m.max('hp')).join(' ') + ' potions ' + party.inv.count('potion'); rep.home = at === 'town'; rep.levels = party.members.map(m => m.level); rep.battles = fought.length; rep.fights = fought.slice(); rep.time = Math.round(game.time);
    game.go('rpg', null, { fade: 0 }); wait(20); pick('Load'); pick('Slot 1'); wait(20);   // the save from the town's crystal: the journey as it was then
    rep.loaded = { at, quest: story.test('quest:cave'), done: story.test('done:cave'), gold: party.gold, key: party.inv.has('key'), bronze: lead().equipped.weapon === 'bronze' };
    rep.errors = game.errors.length - rep.errors0; delete rep.errors0; hold(null);
    return rep;
  }

  return { view: 'threequarter', views: ['threequarter', 'topdown'], input: 'DEFAULT', res: 'ps1', pausable: true, propSize: 1.2, touch: ['confirm', 'cancel', 'skill'], camera: { zoom: [.75, 2] },
    parts: { battle: 'rpg-battle' },   // #rpg/battle: the battle alone, as it always was
    enter(data) {
      game.r.rimAlpha = .28; game.cam.offset = null;
      if (data && data.back && party) return back(data.back);   // home from a battle
      maps = {}; crew = null; hero = null; fresh(); mode = 'title'; wins = []; end = 0; dark = 0;
      game.follow(null); game.focus(15 * T, 10 * T, 0); game.cam.snap = true;
    },
    exit() { L.enabled = false; inp.touchSet('confirm', null); inp.touchSet('skill', null); inp.touchSet('cancel', null); },
    back() { if (wins.length && !wins[wins.length - 1].title0) { close(); return true; } return false; },   // a phone's back: a window closes
    update, draw, bot,
    state: () => ({ mode, at, x: hero && Math.round(hero.x), y: hero && Math.round(hero.y), wins: wins.map(w => w.title), gold: party && party.gold, levels: party && party.members.map(m => m.level), quests: story && story.quests.map(q => q.id + (q.done ? '+' : '')), node: story && story.node, near: hero && (talkable() || {}).id || (talkable() || {}).kind || null,
      rows: boxes.length ? (b => b.w.rows().slice(b.box.top, b.box.top + b.box.show).map((row, k) => ({ label: row.label, at: b.box.at(b.box.top + k), h: b.box.rowH })))(boxes[boxes.length - 1]) : [] }),   // the top window's rows on screen (taps, in tests)
    /** the proof: a new journey, a walk round the square by the keys and a word with the elder; then the battle's own proof */
    run(n = 600) {
      const a = proof('rpg', n, (i, key) => { if (i === 10) key.tap('confirm'); if (i > 30) walk(i, key, ['up', 'left', 'down', 'right'], 90); if (i % 60 === 59) key.tap('confirm'); },
        () => [mode, at, Math.round(hero.x), Math.round(hero.y), party.gold, story.quests.length, Object.keys(story.vars).length], () => { maps = {}; crew = null; hero = null; });
      return (a ^ RPG.run(n)) >>> 0;
    } };
})();
scenes.rpg = JOURNEY;
