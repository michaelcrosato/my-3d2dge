/* =====================================================================================
 * SLICE 4  RPG BATTLE  (side-view battle: Final Fantasy VI / IX, Chrono Trigger, Legend of Mana)
 * Three heroes (right) face a Dread Knight, a Gargoyle and a Bomb (left) on a ruined plaza at sunset. Wait-mode
 * ATB: a full gauge opens that hero's commands (Attack, skill, Defend, Potion, Run) and a glove to aim; monsters act
 * when theirs fill. Win: defeat every monster. Lose: every hero falls (Run never works here).
 * ===================================================================================== */
const RPG = (() => {
  /* ---- BACKDROP: a sunset painted once (the camera never moves) in crisp pixel shapes like the sprites ---- */
  const SKY = ['#1c1642', '#40245f', '#8a3468', '#d4565c', '#f4935c', '#ffd08a'], skyAt = y => { const f = Math.min(y / 15, 4.99), i = f | 0; return E.mix(SKY[i], SKY[i + 1], f - i); };   // a stop every 15 rows
  const SX = 288, SY = 45, CLOUDS = [[44, 13, 60], [156, 19, 84], [246, 10, 52], [98, 33, 64], [206, 36, 74], [296, 51, 46], [22, 47, 52]];   // clouds: [x, y, width]
  const TOWERS = [[116, 9, 26, 12], [127, 15, 16, 0], [144, 8, 36, 15], [154, 13, 21, 0], [169, 7, 28, 11], [178, 12, 12, 0]];   // castle: [x, width, height, roof]
  // a range: one column per x, slopes facing the sun (right) lit
  const range = (g, base, amp, s, col, lit) => { const h = x => amp * (.5 + .32 * (1 - Math.abs(Math.sin(x * .017 + s))) + .18 * Math.sin(x * .061 + s * 3)); for (let x = 0; x < 320; x++) px.rect(g, x, base - h(x), 1, 40, h(x + 1) < h(x - 1) ? lit : col); };
  function paintBackdrop() {
    const c = E.mkCanvas(320, 100), g = E.ctx2d(c);
    for (let y = 0; y < 100; y++) {   // sky rows, a smooth sun glow (no bands, no dither)
      const s = skyAt(y); px.rect(g, 0, y, 320, 1, s);
      for (let x = 160; x < 320; x++) { const k = 1 - Math.hypot((x - SX) / 2.6, y - SY) / 36; if (k > 0) px.dot(g, x, y, E.mix(s, '#ffe8b8', k * k * .85)); }
    }
    px.disc(g, SX, SY, 12, '#fff0c0'); px.disc(g, SX - 1, SY - 1, 10, '#fffcec');   // a hard-edged sun
    for (const [x, y, w] of CLOUDS) {   // flat-bottomed puffs lit from below, warmer near the horizon
      const k = clamp(y / 50, 0, 1), body = E.mix('#4a2a62', '#b4587a', k), lit = E.mix('#9a4a78', '#f09a88', k);
      for (const [dx, dy, rx, col] of [[0, 0, .5, body], [-.14, -2.5, .24, body], [.16, -1.5, .2, body], [.04, 1.5, .42, lit]]) px.ell(g, x + dx * w, y + dy, rx * w, 2.8, col);
      px.rect(g, x - w * .34, y + 3, w * .68, 1, E.mix('#e0808a', '#fff0c0', k));
    }
    range(g, 66, 20, 1, '#c47c90', '#eaa4a0');   // the far range, pale with haze
    for (const [x, w, h, roof] of TOWERS) {   // a hazy castle
      const top = 76 - h;
      px.rect(g, x, top, w, h, '#74446e'); px.rect(g, x + w - 2, top, 2, h, '#e8908e'); px.rect(g, x + (w >> 1), top + 5, 1, 2, '#ffd27a');
      if (roof) { px.poly(g, [[x - 1, top], [x + w + 1, top], [x + w / 2, top - roof]], '#5c3462'); px.poly(g, [[x + w / 2, top], [x + w + 1, top], [x + w / 2, top - roof]], '#c87282'); }
      else for (let bx = x; bx < x + w; bx += 3) px.rect(g, bx, top - 2, 2, 2, '#74446e');
    }
    px.blend(g, .3, 'normal', () => px.rect(g, 96, 66, 110, 10, '#ffc0a0'));   // mist at the castle's foot
    range(g, 77, 9, 5, '#8a4a74', '#c06a7c');   // near hills in front of it
    for (let x = -4; x < 326; x += 5) { const r = 4 + 3 * E.noise2(x * .09, 3), y = 79 - r * .7; px.disc(g, x + 1, y - 1, r, '#b25c5e'); px.disc(g, x, y, r, '#2e2040'); }   // treeline, rim-lit
    px.rect(g, 0, 79, 320, 21, '#2e2040'); return c;
  }
  let backdrop = null;   // painted on the first draw

  /* ---- FLOOR: a round cobbled plaza (a ground circle projects to a wide ellipse: reads as floor). floorTex runs
   * once per pixel when the floor is baked, so light, shadows and wear cost nothing per frame ---- */
  const PLAZA = [110, 98], STONES = ['#ac969c', '#978290', '#baa4a6', '#8a7688', '#a48c86'].map(E.hex), MORTAR = E.hex('#48364a'), MOSS = E.hex('#586e3a');
  const GRASS = { base: '#5e7c3c', dark: '#41602f', light: '#7c9a4a', flower: '#ffd6e4' }, WARM = E.hex('#ffb070'), COOL = E.hex('#40347a'), HAZE = E.hex('#eea08a');
  const SUN = [.8, -.6];   // toward the low sun
  const CASTERS = [[70, 10, 30, 3], [112, 6, 30, 3], [220, 20, 84, 9], [196, 28, 24, 6], [212, 58, 20, 3], [24, 14, 44, 12], [212, 8, 40, 5]];   // [x, y, length, width] of long shadows
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
  const WALL = { top: '#8a9a5a', side: '#7a6478', line: '#4a3848', face: 'stone', roof: 'grass' };
  const plaza = new E.TileMap({ rows: ['21............', ...Array(11).fill('..............')], legend: { 1: 1, 2: 2 }, types: { 1: { ...WALL, h: 12 }, 2: { ...WALL, h: 24 } }, floorTex });
  // [prop, x, y, z, options]: pillars frame the sides, clear of the wall and the sun
  const PROPS = [['vines', 26, 17, 12, { anchor: 'top', size: .5 }], ['pillar', 8, 46, 0], ['vines', 9, 47, 44, { anchor: 'top' }], ['pillar', 212, 8, 0, { broken: true }],
    ['brazier', 70, 10, 0, { haloR: 16 }], ['brazier', 112, 6, 0, { haloR: 16 }],
    ['tree', -2, 22, 0, { size: 1.15, color: '#3e6a3a' }], ['pine', 220, 20, 0, { size: 1.15, color: '#2e5a44' }], ['bush', 22, 26, 0, { color: '#4a7a3a' }], ['bush', 196, 28, 0, { color: '#4a7a3a', berries: '#e04a6a' }],
    ['mushroom', 18, 60, 0, { size: .7, color: '#c8603a' }], ['mushroom', 206, 42, 0, { size: .5, color: '#c8a0e8' }], ['rock', 10, 140, 0],
    ['skull', 34, 150, 0], ['bones', 128, 150, 0], ['crystal', 212, 58, 0, { color: '#8ad8ff' }],
    ['grass', 150, 146, 0], ['flowers', 16, 110, 0, { color: '#b08aff' }]];

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
  // each of 9 wing-beat steps is painted once and reused
  const GARG = [], gargoyleCached = (g, x, y, c, v, t) => { const k = Math.round(Math.sin(t * 7) * 4) + 4; if (!GARG[k]) gargoyle(E.ctx2d(GARG[k] = E.mkCanvas(64, 54)), 42, 47, k / 4 - 1); g.drawImage(GARG[k], x - 42, y - 47); };
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
  // a rig joint on screen: rig._w gives the world offset of a local point, v.p projects it
  const joint = (c, v, x, y, k, f = 0, s = 0, z = 0) => { const J = c.rig.J[k], w = c.rig._w([J[0] + f, J[1] + s, J[2] + z]), q = v.p(w[0], w[1], w[2]); return [x + q[0], y + q[1]]; };
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
   * hats and eyes differ. Robes need pants in the robe color, or the dark default shows through as holes ---- */
  const PARTY = [
    { name: 'Rowan', hp: 96, mp: 16, atk: 14, spd: .45, skill: 'cleave', x: 158, y: 42, turn: .55, stance: true, smear: ['#ffffff', '#fff6c8', '#ffd870', '#f0a040'],   // stance: a long sword held out
      rig: { build: 'heroic', size: 1.35, headR: 3.6, shoulderHalf: 4.1, torsoW: 3.5, footSpread: 2.8, lean: .1, face: { bangs: .6 }, armor: true, outfit: 'tunic', hair: 'spiky', bladeLen: 15,
        colors: { cloth: '#2c5cc0', pants: '#8a6a4a', boot: '#4a2a1a', hair: '#7a4020', trim: '#e8c860', hilt: '#b08040', glove: '#6a4a3a', eye: '#1a3a8a' } } },
    { name: 'Lyra', hp: 62, mp: 30, atk: 8, spd: .38, skill: 'fire', x: 182, y: 84, turn: .7, rig: { build: 'heroic', size: 1.2, headR: 3.8, shoulderHalf: 2.8, limbW: 1.6, torsoW: 2.5, hunch: .3, face: { eyes: 'big', bangs: .3 }, weapon: 'staff', outfit: 'robe', hair: 'long', sleeves: 'long',
      hat: { style: 'pointed', color: '#3a2a7a' }, colors: { cloth: '#6a3ab8', pants: '#5a2e9e', trim: '#f0c860', hair: '#e0602a', orb: '#ff9040', staff: '#6a4a2a', boot: '#3a2a4a', eye: '#2a6a3a' } } },   // a stooped, slender black mage
    { name: 'Sera', hp: 74, mp: 26, atk: 9, spd: .42, skill: 'cure', x: 204, y: 126, h: 34, turn: .9, rig: { size: 1.3, headR: 3.6, face: { eyes: 'big', bangs: .8 }, weapon: 'staff', outfit: 'robe', hair: 'ponytail', sleeves: 'long',   // chibi build
      hat: { style: 'band', color: '#c83a4a' }, colors: { cloth: '#f2eee2', pants: '#e2dccc', trim: '#c83a4a', hair: '#5a3424', orb: '#8affc0', staff: '#c8a060', boot: '#8a5a3a', eye: '#7a3ad0' } } }];   // brown hair, a red ribbon
  const TROOP = [
    { name: 'Dread Knight', hp: 120, atk: 14, spd: .3, moves: ['slash', 'slash', 'doom'], x: 60, y: 76, stance: true, front: knightPlate, debris: ['#454a68', '#aab4d0', '#a01c2c'], smear: ['#ffffff', '#ffe0e0', '#ff8a8a', '#e04058'],
      rig: { build: 'bulky', size: 2.3, armor: true, sleeves: 'long', hair: 'bald', hat: { style: 'helmet', color: '#7a84a6' }, bladeLen: 17, cape: { len: 8, width: 8, seg: 2.8 },
        colors: { cloth: '#4a5274', pants: '#5c6486', boot: '#444860', glove: '#6a7090', skin: '#12060c', metal: '#aab4d0', cape: '#a01c2c', capeIn: '#7a1c32', trim: '#d8a840' } } },
    { name: 'Gargoyle', hp: 44, atk: 10, spd: .5, moves: ['dive'], x: 34, y: 40, z: 30, h: 40, front: gargoyleCached, debris: ['#7a7090', '#44365a', '#e8dcc8'] },
    { name: 'Bomb', hp: 34, atk: 9, spd: .42, moves: ['blaze'], x: 92, y: 126, z: 8, h: 26, debris: ['#e0502a', '#ffb040', '#fff2b0'], back: bombBack, front: bombFront,
      blob: { R: 8.5, face: 'front', colors: { dk: '#8a1a14', base: '#e8582a', lt: '#ffb048', spec: '#fff6c0', eye: '#ffffff', pupil: '#1a0a0a' } } }];

  /* ---- MOVES: power (x atk) or heal, MP, how the user moves (dash, leap, swoop, step), a rig swing, an fx;
   * the blow lands at hit, the move ends at end ---- */
  const SLASH = { a0: 1.9, a1: -1.4, z0: 30, z1: 4, reach: 8 };
  const MOVES = {
    attack: { label: 'Attack', power: 1, move: 'leap', swing: SLASH, hit: .6, end: 1.15, info: 'Strike one foe' },
    cleave: { label: 'Cleave', power: .8, mp: 8, all: true, move: 'step', swing: { a0: 1.2, a1: -1.2, z0: 12, z1: 12, reach: 9, spin: true }, hit: .55, end: 1.2, fx: 'wave', info: 'Sweep every foe' },
    fire: { label: 'Fire', power: 3, mp: 6, move: 'step', cast: true, bolt: '#ff9040', hit: 1.15, end: 1.9, fx: 'flame', info: 'Burn one foe' },
    cure: { label: 'Cure', heal: 34, mp: 5, ally: true, move: 'step', cast: true, hit: .95, end: 1.6, info: 'Heal one ally' },
    defend: { label: 'Defend', guard: true, hit: .2, end: .6, info: 'Halve damage till next turn' },
    potion: { label: 'Potion', heal: 40, ally: true, hit: .35, end: .9, info: 'Restore 40 HP' },
    run: { label: 'Run', hit: .3, end: .8, info: 'Try to escape' },
    slash: { power: 1, move: 'dash', swing: SLASH, hit: .6, end: 1.15 },
    doom: { label: 'Doom Blade', power: 1.7, swing: { a0: 1.6, a1: -1.9, z0: 36, z1: 2, reach: 9 }, wind: .6, lead: .3, hit: 1.25, end: 1.8, fx: 'doom' },   // swung .3 s early: the cut flies
    dive: { label: 'Dive', power: 1, move: 'swoop', hit: .6, end: 1.15 },
    blaze: { label: 'Blaze', power: 1.3, bolt: '#ff8a2a', hit: .8, end: 1.4, fx: 'flame' }
  };
  const COMMANDS = h => ['attack', h.skill, 'defend', 'potion', 'run'];
  let party, foes, all, menu, log, act, fx, mode, actor, list, cursor, pending, potions, note, t, dim, frame = 0;
  const alive = l => l.filter(c => !c.dead), isHero = c => party.includes(c), size = c => c.rig ? c.rig.o.size : 1.2;
  const unit = (d, hero) => {
    const body = d.rig ? new E.Humanoid(d.rig) : d.blob && new E.Blob(d.blob);   // both kick() and draw()
    return Object.assign({}, d, { body, rig: d.rig && body, max: d.hp, mp: d.mp || 0, hx: d.x, hy: d.y, hz: d.z || 0, z: d.z || 0, px: d.x, atb: hero ? E.rand(.45, .9) : E.rand(0, .4),
      face: hero ? Math.PI - d.turn : .75, flash: 0, glow: 0, shake: 0, grow: 0, fade: hero ? 1 : 0, dead: false, guard: false, h: d.h || (d.rig.build === 'bulky' ? 29 : 31) * d.rig.size });
  };
  function start() {
    party = PARTY.map(d => unit(d, true)); foes = TROOP.map(d => unit(d, false)); all = [...party, ...foes];
    for (const h of party) h.x = h.px = h.hx + 70;   // intro: the party runs in, the monsters fade in
    log = new E.Dialog(game, { place: 'top', lines: 2, speed: 70, bg: WIN }); menu = new E.Menu(game, [], { onPick: pick });   // E.Menu reads the keys; hud() draws it
    act = null; fx = []; potions = 3; note = ''; t = 0; dim = 0; mode = 'intro'; game.cam.bounds = null; L.enabled = false;
    A.music('boss'); game.flash('#ffffff', .25); game.after(1.1, () => { mode = 'wait'; });
  }

  /* ---- WAIT-MODE ATB: gauges fill while nobody chooses or acts; a full gauge takes the turn ---- */
  function tick(dt) {
    for (const c of all) if (!c.dead) c.atb = Math.min(1, c.atb + c.spd * dt);
    const c = all.find(c => !c.dead && c.atb >= 1), sk = c && MOVES[c.skill]; if (!c) return;
    c.atb = 0; c.guard = false; actor = c; if (!isHero(c)) return order(E.pick(c.moves), E.pick(alive(party)));   // monsters pick a move and a hero
    menu.items = ['Attack', { label: sk.label, note: sk.mp, disabled: c.mp < sk.mp }, 'Defend', { label: 'Potion', note: '×' + potions, disabled: !potions }, 'Run'];
    menu.i = 0; menu.active = true; mode = 'command'; A.sfx('blip');
  }
  function pick(i) {
    const key = COMMANDS(actor)[i], m = MOVES[key];
    if (m.all || !(m.power || m.heal)) return order(key, null);   // Cleave, Defend and Run need no target
    pending = key; list = alive(m.ally ? party : foes); mode = 'target'; cursor = m.ally ? list.indexOf(list.slice().sort((a, b) => a.hp / a.max - b.hp / b.max)[0]) : 0;   // heals start on the weakest ally
  }
  function order(key, target) {
    const m = MOVES[key]; if (m.mp) actor.mp -= m.mp; if (key === 'potion') potions--;
    act = { who: actor, key, target, t: 0 }; mode = 'act'; menu.active = false; note = key !== 'attack' && m.label || '';
  }
  function finish() {   // after every action: win, lose, or back to the gauges
    act = null; actor = null; note = '';
    if (!alive(foes).length) {   // the victory line with a live portrait
      mode = 'win'; A.music('victory'); game.flash('#fff4d0', .3, .6);
      game.after(1.6, () => log.say(['The monsters are defeated!', 'Rowan, Lyra and Sera grow stronger.'], { name: party[0].name, portrait: party[0].rig, portraitSize: 32, onDone: () => game.go('title') }));
    } else if (!alive(party).length) { mode = 'lose'; note = 'The party has fallen...'; game.after(2, () => game.go('over', { from: 'rpg' })); }
    else mode = 'wait';
  }

  /* ---- ACTIONS: a timeline per move: out, wind-up, the blow at hit, back, done at end ---- */
  function play(a, dt) {
    const u = a.who, m = MOVES[a.key], tt = a.t += dt, side = isHero(u) ? -1 : 1, mine = isHero(u) ? party : foes;
    if (a.target && a.target.dead) a.target = alive(m.ally ? mine : mine === party ? foes : party)[0] || null;   // pick a new target
    const tg = a.target, go = tg && (m.move === 'dash' || m.move === 'leap' || m.move === 'swoop'), dx = go ? tg.hx - side * (6 + 9 * (size(u) + size(tg))) : u.hx + (m.move === 'step' ? side * 12 : 0), dy = go ? tg.hy + 2 : u.hy;
    const out = E.ease.inOut(clamp(tt / .35, 0, 1)) * (1 - E.ease.inOut(clamp((tt - m.hit - .2) / .35, 0, 1)));   // 0 -> 1 -> 0
    u.x = lerp(u.hx, dx, out); u.y = lerp(u.hy, dy, out);
    if (m.move === 'leap') u.z = Math.sin(clamp((tt - m.hit + .42) / .42, 0, 1) * Math.PI) * 18;   // down with the blade
    if (m.move === 'swoop' && tg) u.z = lerp(u.hz, tg.z + 12, out);
    u.swing = swingAt(m, tt + (m.lead || 0));
    u.cast = !!m.cast && tt > .1 && tt < m.hit - .35;              // casters hold the 'cast' pose...
    u.point = !!m.cast && tt >= m.hit - .35 && tt < m.hit + .25;   // ...then thrust the staff
    u.blink = !isHero(u) && tt < .35;                              // monsters glow before they act (FF VI)
    if (m.cast && !a.glyph) a.glyph = addFx('glyph', u, m.hit, m.heal ? '#8affc0' : '#ffb050');
    if (m.lead && tg && !a.cut && tt >= m.hit - m.lead) { a.cut = Object.assign(addFx('wave', u, m.lead), { to: tg, cols: DOOM }); A.sfx('swing'); }   // the cut flies to the target
    a.orb = null; if (m.bolt && tg && tt > m.hit - .3 && tt < m.hit) {   // a fireball trailing embers
      const k = (tt - m.hit + .3) / .3, p0 = u.rig ? u.rig.tip() : [u.x + 8, u.y, u.z + u.h * .5];
      a.orb = [lerp(p0[0], tg.x, k), lerp(p0[1], tg.y, k), lerp(p0[2], tg.z + tg.h * .5, k) + Math.sin(k * Math.PI) * 12, m.bolt];
      P.add({ kind: 'ember', x: a.orb[0], y: a.orb[1], z: a.orb[2], vx: E.rand(-10, 10), vz: E.rand(-10, 10), max: .4, color: m.bolt });
      if (E.chance(dt * 40)) P.fire(a.orb[0], a.orb[1], a.orb[2], 1, { size: 2.5, speed: 4 });
    }
    if (!a.done && tt >= m.hit) { a.done = true; resolve(u, m, tg, a.key, side); }
    if (tt >= m.end) { Object.assign(u, { x: u.hx, y: u.hy, z: u.hz, swing: null, cast: false, point: false, blink: false }); finish(); }
  }
  // a rig attack state: wind-up, a fast active arc at the hit, recover
  function swingAt(m, tt) {
    const s = m.swing, w = m.wind || .16, h = m.hit;
    if (!s || tt < h - w || tt > h + .3) return null;
    return tt < h - .04 ? { spec: s, phase: 'wind', u: (tt - h + w) / (w - .04) } : tt < h + .08 ? { spec: s, phase: 'active', u: (tt - h + .04) / .12 } : { spec: s, phase: 'recover', u: (tt - h - .08) / .22 };
  }
  function resolve(u, m, tg, key, side) {
    if (key === 'run') { note = "Can't escape!"; A.sfx('cancel'); return; } if (m.heal) A.sfx('heal');
    if (m.guard) { u.guard = true; P.ring(u.x, u.y, 3, 16, '#8ad0ff', .4); P.glints(u.x, u.y, u.z + 24, 4, '#c8ecff', 16); A.sfx('select'); return; }   // Defend: guard pose until the next turn
    if (m.fx === 'wave') { P.ring(u.x, u.y, 4, 70, '#bfe8ff', .45); Object.assign(addFx('wave', u, .4), { to: { x: 0, y: u.y, z: 0, h: 40 }, cols: ['#284a9a', '#8ad8ff', '#ffffff'] }); A.sfx('whoosh'); }   // Cleave: a sweeping crescent
    for (const c of m.all ? alive(isHero(u) ? foes : party) : tg ? [tg] : []) {
      const zc = c.z + c.h * .5;
      if (m.heal) {
        const n = m.heal + E.randInt(0, 6); c.hp = Math.min(c.max, c.hp + n); c.glow = .8; P.glints(c.x, c.y, c.z + c.h, 12, '#9affc8', 14); P.ring(c.x, c.y, 3, 18, '#8affc0', .5); P.text(c.x, c.y, zc + 12, n, '#8affc0', { scale: 2, bounce: true }); continue;
      }
      const crit = E.chance(.12), n = Math.round((u.atk * m.power + E.randInt(0, 4)) * (crit ? 1.8 : 1) * (c.guard ? .5 : 1)), col = crit ? '#ffd040' : '#ffffff';
      c.hp = Math.max(0, c.hp - n); c.flash = .12; c.shake = .35; c.grow = .25; if (c.body) c.body.kick(c.rig ? 2 : -3);
      if (m.fx === 'flame') { addFx('flame', c, .8, '#ff7030'); P.explosion(c.x, c.y, c.z + 12, .8, { debris: false }); P.text(c.x, c.y, zc + 12, n, col, { scale: 2, bounce: true }); }
      else game.hitFx(c.x, c.y, zc, { power: crit ? 2 : 1.3, angle: side > 0 ? 0 : Math.PI, damage: n, textScale: 2, textColor: col, color: c.guard ? '#8ad0ff' : undefined, sound: c.guard ? 'bump' : u.rig ? 'hit' : 'punch' });   // hit-stop, shake, sparks, number
      if (m.fx === 'doom') { addFx('doom', c, .45, '#ff2848'); game.shake(5); } if (!c.hp) kill(c);
    }
  }
  function kill(c) {
    c.dead = true; c.atb = 0; c.guard = false;
    if (isHero(c)) { A.sfx('hurt'); return; }   // heroes fall flat; monsters dissolve
    P.bits(c.x, c.y, c.z + 10, 18, c.debris); P.smoke(c.x, c.y, c.z + 6, 6, { size: 5, color: '#8a6aa0' }); A.sfx('explode', { vol: .5 });
  }
  const addFx = (kind, c, dur, color) => { const f = { kind, c, x: c.x, y: c.y, z: c.z, t: 0, dur, color }; fx.push(f); return f; };

  /* ---- UPDATE ---- */
  function animate(c, dt) {
    c.flash -= dt; c.glow -= dt; c.shake -= dt; c.grow = Math.max(0, c.grow - dt);
    c.fade = clamp(c.fade + (c.dead ? -1.2 : 1.5) * dt, isHero(c) ? 1 : 0, 1);   // monsters fade in and out
    const busy = act && act.who === c, choosing = c === actor && (mode === 'command' || mode === 'target'), cheer = mode === 'win' && isHero(c) && !c.dead;
    const tx = c.hx - (choosing ? 6 : 0);   // the hero on turn steps up; moves ease out
    if (!busy) { c.x = approach(c.x, tx, Math.min(90, Math.abs(tx - c.x) * 4 + 8) * dt); c.y = approach(c.y, c.hy, 90 * dt); c.z = c.hz + (c.hz ? Math.sin(t * 2.6 + c.hx) * 3 : 0); }
    if (cheer) c.z = Math.abs(Math.sin(t * 5 + c.hy)) * 6;   // victory: hop, turned to the camera
    const vx = dt > 0 ? (c.x - c.px) / dt : 0; c.px = c.x;
    if (c.blob) {   // a Blob breathes, bounces, squashes when struck
      c.body.update(dt, { squash: c.shake > .1 ? -.35 : busy ? .2 * Math.sin(act.t * 14) : .06 * Math.sin(t * 3 + c.hx), look: [1, .3], squint: c.dead || c.shake > .2 }); c.body.scale = 1 + c.grow;
    }
    if (!c.rig) return;
    // held poses, most important first
    const pose = c.dead ? (isHero(c) ? 'down' : 'kneel') : cheer ? 'cheer' : c.cast ? 'cast' : c.guard && !busy ? 'guard' : isHero(c) && c.hp < c.max / 4 && !busy && !choosing ? 'kneel' : undefined;
    c.rig.update(dt, { x: c.x, y: c.y, z: c.z, facing: cheer ? Math.PI / 2 + .5 : c.dead ? 0 : c.face, vx, vy: 0, hurt: c.shake > .1, air: c.z > c.hz + 2, pose, attack: c.swing, point: c.point || (c.stance && !busy && !c.dead) });
  }
  function update(dt) {
    t += dt; if (log.update(dt)) return;
    for (const c of all) animate(c, dt);
    for (const f of fx) { f.t += dt; Object.assign(f, { x: f.c.x, y: f.c.y, z: f.c.z }); }
    E.prune(fx, f => f.t > f.dur);
    const m = act && MOVES[act.key]; dim = approach(dim, m && (m.cast || m.fx === 'doom') && act.t < m.hit + .4 ? 1 : 0, dt * 3);   // spells and Doom Blade dim the scene
    // ambience: drifting petals, brazier embers
    if (E.chance(dt * 5)) P.add({ kind: 'bit', x: E.rand(0, 200), y: E.rand(10, 140), z: E.rand(50, 90), vx: E.rand(10, 22), vz: -4, g: 5, drag: .2, max: 6, size: E.chance(.4) ? 2 : 1, color: E.pick(['#ffc0d0', '#ffe0e8', '#ffd890']) });
    if (E.chance(dt * 6)) P.add({ kind: 'ember', x: E.pick([70, 112]) + E.rand(-3, 3), y: 10, z: 20, vz: E.rand(18, 30), vx: E.rand(-4, 4), max: 1, color: '#ff8a2a' });
    if (mode === 'wait') tick(dt);
    else if (mode === 'act') play(act, dt);
    else if (mode === 'command') menu.update();
    else if (mode === 'target') {   // aiming the glove
      const inp = game.input, n = list.length, d = inp.repeat('up') || inp.repeat('left') ? -1 : inp.repeat('down') || inp.repeat('right') ? 1 : 0;
      if (d) { cursor = (cursor + n + d) % n; A.sfx('select'); }
      if (inp.pressed('confirm')) { inp.consumeAll(); A.sfx('confirm'); order(pending, list[cursor]); } else if (inp.pressed('cancel')) { inp.consumeAll(); A.sfx('cancel'); mode = 'command'; }
    }
  }

  /* ---- DRAW ---- */
  const RIM = '#ffc27a', DOOM = ['#3a0a1e', '#d0203a', '#fff0f0'];
  // a long see-through shadow away from the sun (a decal)
  const longShadow = (r, x, y, len, w) => r.decal(g => px.polyDither(g, Array.from({ length: 12 }, (_, i) => {
    const a = i / 12 * TAU, u = (1 + Math.cos(a)) / 2 * len, s = Math.sin(a) * w; return r.w(x - SUN[0] * u - SUN[1] * s, y - SUN[1] * u + SUN[0] * s, 0);
  }), '#2a1a50', .32, r.ix, r.iy));
  function drawUnit(r, c) {
    if (c.fade <= 0) return;
    const x = c.x + (c.shake > 0 ? Math.sin(t * 90) * 2 : 0), w = size(c) * 5;   // a struck target shakes
    r.shadow(c.x, c.y, w, .55, '#1e0e24'); longShadow(r, c.x, c.y, c.dead ? 10 : c.h * 1.2, w * .8);   // a violet contact shadow and a long one
    const line = c.flash > 0 ? '#ffffff' : c.glow > 0 && Math.sin(t * 30) > 0 ? '#8affc0' : c.blink && Math.sin(t * 40) > 0 ? '#ffe890' : c.guard ? '#6ab8ff' : undefined;
    r.actor(x, c.y, c.z, (g, ox, oy) => {
      if (c.back) c.back(g, ox, oy, c, r.view, t);
      if (c.body) c.body.draw(g, ox, oy, r.view);   // Humanoid and Blob draw the same way
      if (c.front) c.front(g, ox, oy, c, r.view, t);
    }, { flash: c.fade < 1 && !isHero(c) ? '#b060ff' : false, outlineColor: line, rimColor: c.flash > 0 ? '#ffffff' : RIM, alpha: isHero(c) ? 1 : clamp(c.fade, 0, 1) });
    if (c.rig && c.swing && (c.swing.phase === 'active' || c.swing.u < .3)) c.rig.drawSmear(r, c.smear);   // the sword trail
    if (c.rig && c.rig.o.weapon === 'staff' && !c.dead) { const [ox, oy, oz] = c.rig.tip(); r.queue(ox, oy, oz, g => { const [sx, sy] = r.w(ox, oy, oz); r.glowDisc(g, sx, sy, 6, c.rig.C.orb, .4); }, { bias: .5, emissive: true }); }   // the staff orb glows
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
  }
  function draw(r) {
    r.ctx.drawImage(backdrop || (backdrop = paintBackdrop()), 0, 0);
    plaza.drawFloor(r); plaza.queueWalls(r); for (const [name, x, y, z, o] of PROPS) r.prop(name, x, y, z, o);
    for (const c of all) drawUnit(r, c); for (const f of fx) drawFx(r, f);
    const orb = act && act.orb;
    if (orb) r.queue(orb[0], orb[1], orb[2], g => {   // the bolt: additive halo, ball, hot core
      const [sx, sy] = r.w(orb[0], orb[1], orb[2]); r.glowDisc(g, sx, sy, 16, orb[3], .5); px.disc(g, sx, sy, 6, orb[3]); px.disc(g, sx - 1, sy - 1, 3, '#fff0b0'); px.dot(g, sx - 1, sy - 1, '#ffffff');
    }, { bias: .3 });
    L.enabled = dim > .02;
    if (L.enabled) {   // spells dim the scene; colored lights (PS1-style)
      L.ambient = 1 - .55 * dim; for (const x of [70, 112]) L.add(x, 10, 10, 34, .8, { color: '#ffa040' });
      if (act) L.add(act.who.x, act.who.y, 0, 34, .7, { color: '#c8c0ff' });
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
    const Y = 170, choosing = mode === 'command' || mode === 'target', bob = Math.round(Math.sin(t * 10) * 1.5); frame++;
    // an arrow over the hero on turn, the glove on the target
    if (choosing) { const [sx, sy] = r.w(actor.x, actor.y, actor.z + actor.h + 5); px.poly(g, [[sx - 5, sy - 7 + bob], [sx + 5, sy - 7 + bob], [sx, sy - 1 + bob]], '#ffe060'); px.rect(g, sx - 3, sy - 6 + bob, 6, 1, '#fff8c0'); }
    if (mode === 'target') { const c = list[cursor], [sx, sy] = r.w(c.x, c.y, c.z + c.h * .55); px.sprite(g, HAND, sx - 28 + bob, sy - 4); }
    // top banner: the move, the target, or what the command does
    const top = mode === 'command' ? MOVES[COMMANDS(actor)[menu.i]].info : mode === 'target' ? list[cursor].name : note;
    if (top && !log.open) { const w = E.font.width(top) + 24; E.ui.box(g, 160 - w / 2, 5, w, 18, { bg: WIN }); txt(g, top, 160, 10, '#ffffff', 'center'); }
    // a near-black band under the windows; left: commands, spoils or monsters
    px.rect(g, 0, Y - 3, 320, 73, '#0c0818'); E.ui.box(g, 4, Y, 92, 66, { bg: WIN });
    if (choosing) {
      menu.items.forEach((it, k) => { const y = Y + 5 + k * 10; txt(g, it.label || it, 20, y, it.disabled ? '#7c7aa8' : '#ffffff'); if (it.note) txt(g, it.note, 89, y, '#9ad0ff', 'right'); });
      px.sprite(g, HAND, 6 + (mode === 'command' ? bob : 0), Y + 4 + menu.i * 10); tiny(g, 'Z OK  X BACK', 26, Y + 57, '#a8b8ff');
    } else if (mode === 'win') [['EXP', '+180'], ['Gil', '+96'], ['Item', 'Ether']].forEach(([a, b], k) => { txt(g, a, 11, Y + 10 + k * 17, '#9ad0ff'); txt(g, b, 88, Y + 10 + k * 17, '#ffe08a', 'right'); });
    else alive(foes).forEach((f, k) => { txt(g, f.name, 11, Y + 7 + k * 19, '#ffffff'); gauge(g, 11, Y + 16 + k * 19, 78, f.hp / f.max, '#e0463c'); });
    // right: a card per hero (FF IX): portrait, name, MP, HP, ATB
    party.forEach((h, k) => {
      const x = 100 + k * 72, on = h === actor && choosing, low = h.hp < h.max / 4, col = h.dead ? '#a08aa8' : low ? '#ffd060' : '#ffffff';
      E.ui.box(g, x, Y, 70, 66, { bg: h.dead ? KO : on ? HOT : WIN, border: on ? '#ffe890' : undefined });
      const pic = h.pic || (h.pic = E.mkCanvas(30, 30));   // a whole rig draw: redrawn every third frame
      if ((frame + k) % 3 === 0) { const pg = E.ctx2d(pic); pg.clearRect(0, 0, 30, 30); h.rig.drawPortrait(pg, 3, 3, 24, { zoom: 2.1, turn: .7, bg: ['#3a4aa8', '#10143a'], tint: h.dead ? '#808080' : undefined }); }
      g.drawImage(pic, x + 2, Y + 2);
      txt(g, h.name, x + 34, Y + 6, col); tiny(g, 'MP', x + 34, Y + 19, '#9ad0ff'); txt(g, h.mp, x + 64, Y + 17, col, 'right');
      tiny(g, 'HP', x + 6, Y + 36, '#9ad0ff'); txt(g, h.hp + '/' + h.max, x + 64, Y + 34, col, 'right'); gauge(g, x + 6, Y + 44, 58, h.hp / h.max, low ? '#e8a030' : '#58d068');
      gauge(g, x + 6, Y + 54, 58, h.atb, h.atb >= 1 || on ? '#ffe060' : '#dce0f8');
    });
    if (mode === 'win') E.font.title(g, 'Victory!', 124, 60, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
  }
  // propSize: props sized to the heroes; a strong warm rim light
  return { view: 'brawler', views: ['brawler'], input: 'DEFAULT', res: 'ps1', pausable: true, touch: ['confirm', 'cancel'], propSize: 1.3,
    enter() { start(); game.r.rimAlpha = .75; game.focus(110, 72, 0); },
    exit() { game.r.rimAlpha = .28; L.enabled = false; },
    update(dt) { update(dt); game.focus(110, 72, 0); }, draw,
    state: () => ({ mode, actor: actor && actor.name, act: act && act.key, t: act && act.t }) };   // for automated tests
})();
scenes.rpg = RPG;
