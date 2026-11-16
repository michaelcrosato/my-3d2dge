/* =====================================================================================
 * SLICE 23  SKY  (Pilotwings; Final Fantasy VI's airship, Secret of Mana's Flammie). @modules mode7 mesh
 * Flight over a Mode 7 world, four ways. LIGHT PLANE: ten rings round an island, then down onto its runway (lined up,
 * slow and level: flare it). SKYDIVE: out over the island, through the hoops of a free fall, the chute opened in its
 * band, down onto the target's bullseye. ROCKET BELT: up off the ground on a jet pack (GAS climbs, let go and it sinks,
 * the stick leans you forward or back and turns you), five low rings on the fuel it has, then down softly on the pad.
 * Each scored out of 100 for a medal. VOYAGE: an airship over a world that
 * curves away below it, the horizon bending with your height: light the three beacons (land beside each), then home.
 * Deep links: #sky/plane, #sky/dive, #sky/belt, #sky/voyage.
 * KEYS: left / right bank and turn, down climbs and up dives (the stick of a plane), Z / J more throttle, X / K less,
 * Space opens the chute (and lands the airship by a beacon). A pad: the stick, A and X the throttle, B the chute.
 * TOUCH: the stick, GAS, SLOW and ACT.
 * HOW IT WORKS: E.Mode7 (the mode7 module) draws the island and the world below, its camera pitched and rolled with the
 * plane (cam.roll), the voyage's world a globe (curve); E.Mesh (the mesh module) the plane, the rings, the airship, the
 * chute and the towers as low-poly models; this file the flying, the courses, the scoring and the HUD.
 * ===================================================================================== */
const SKY = (() => {
  const KEYS = Object.assign({}, E.Input.DEFAULT, { gas: ['KeyZ', 'KeyJ', 'Pad0', 'Pad7'], slow: ['KeyX', 'KeyK', 'Pad2', 'Pad6'], act: ['Space', 'KeyC', 'Pad1', 'Pad5'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  const TX = 4, ISLE = 4096, M = 2048, hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  /* ---- THE ISLAND: a canvas a texel to 4 units, painted once (sea, reef, beaches, fields, woods, a peak, a lake, a
   * town, the runway north-south and the dive's target) ---- */
  const RUNWAY = { x: 1920, y0: 2400, y1: 3120, w: 40, aim: 3020 }, TARGET = [2600, 2700];
  let isle = null;
  function paintIsle() {
    const N = ISLE / TX, cv = E.mkCanvas(N, N), g = cv.getContext('2d'), img = g.createImageData(N, N), d = img.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x - 512, dy = y - 512, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy), n = hash(x, y) % 7;
      const coast = 330 + 70 * E.noise2(Math.cos(a) * 2 + 7, Math.sin(a) * 2 + 3) + 26 * E.noise2(x / 40, y / 40) - r, hill = E.noise2(x / 70 + 3, y / 70 + 9) * (coast > 60 ? 1 : 0) + Math.max(0, 1 - Math.hypot(x - 430, y - 360) / 150) * .5;
      let c;
      if (coast < -22) c = (E.noise2(x / 9, y / 3) > .62 + Math.max(0, r - 440) / 170) ? [74, 132, 214] : [38 + n, 92 + n, 186];   // (the waves thin out to none before the canvas's edge: plain sea, as outside it)
      else if (coast < 0) c = [70, 178 + n * 2, 196];
      else if (coast < 9) c = [228 - n * 2, 206, 150];
      else if (hill > .95) c = [236, 238, 244];
      else if (hill > .8) c = [124 + n * 3, 112, 98];
      else if (Math.hypot(x - 600, y - 380) < 34 + 6 * E.noise2(x / 9, y / 9)) c = [52, 112, 196];
      else if (x > 560 && x < 700 && y > 560 && y < 640) c = (((x >> 3) + (y >> 4)) % 3) ? [196, 170, 82] : [118, 156, 64];   // (fields)
      else if (E.noise2(x / 18 + 50, y / 18) > .6) c = [36 + n * 2, 96, 44];
      else c = [86 + n * 3, 152 + n * 2, 70];
      const i = (y * N + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const R = RUNWAY, X = (R.x - R.w) / TX, Y0 = R.y0 / TX, Y1 = R.y1 / TX;
    px.rect(g, X - 3, Y0 - 3, R.w * 2 / TX + 6, Y1 - Y0 + 6, '#5e7a46'); px.rect(g, X, Y0, R.w * 2 / TX, Y1 - Y0, '#4a4a52');
    for (let y = Y0 + 6; y < Y1 - 10; y += 10) px.rect(g, R.x / TX - .5, y, 1, 5, '#e8e8e8');
    for (let k = 0; k < 4; k++) px.rect(g, X + 2 + k * 5, Y1 - 6, 3, 4, '#f0f0f0');
    px.rect(g, X + 2, R.aim / TX, 4, 3, '#f0f0f0'); px.rect(g, X + R.w * 2 / TX - 6, R.aim / TX, 4, 3, '#f0f0f0');
    px.line(g, R.x / TX, Y1, 430, 690, '#9a8a70', 2);
    for (let k = 0; k < 9; k++) { const hx = 400 + (k % 3) * 9, hy = 680 + Math.floor(k / 3) * 9; px.rect(g, hx, hy, 6, 6, '#e8dcc8'); px.rect(g, hx, hy, 6, 3, k % 2 ? '#c84a3a' : '#4a6ab8'); }
    for (const [r, c] of [[30, '#f0f0f0'], [24, '#d83a30'], [17, '#f0f0f0'], [10, '#d83a30'], [4, '#f0f0f0']]) px.disc(g, TARGET[0] / TX, TARGET[1] / TX, r / 1, c);
    return cv;
  }
  /* ---- THE WORLD (the voyage): continents on a sea that repeats, 8192 units round, seen as a globe ---- */
  const WT = 8, WN = 1024, CONT = [[220, 300, 150], [640, 230, 120], [800, 690, 160], [330, 760, 130], [560, 480, 54]];
  const BEACONS = [[5120, 1840], [6400, 5520], [2640, 6080]], HOME = [1760, 2400];
  let world = null;
  function paintWorld() {
    const cv = E.mkCanvas(WN, WN), g = cv.getContext('2d'), img = g.createImageData(WN, WN), d = img.data, wd = (a, b) => ((a - b + 1536) % WN) - 512;
    for (let y = 0; y < WN; y++) for (let x = 0; x < WN; x++) {
      let v = -1e9, which = 0;
      for (let k = 0; k < CONT.length; k++) { const [cx, cy, r] = CONT[k], q = r - Math.hypot(wd(x, cx), wd(y, cy)); if (q > v) { v = q; which = k; } }
      v += 34 * (E.noise2(x / 30, y / 30) - .5) + 16 * (E.noise2(x / 9, y / 9) - .5);
      const n = hash(x, y) % 6, m = E.noise2(x / 22 + 40, y / 22), f = E.noise2(x / 14 + 80, y / 14);
      const c = v < -28 ? [24 + n, 54 + n, 140] : v < 0 ? [40, 92 + n * 2, 184] : v < 6 ? [226, 204, 150] : m > .74 && v > 30 ? [236, 236, 244] : m > .64 && v > 18 ? [126, 108, 92]
        : which === 2 && E.noise2(x / 50, y / 50) > .45 ? (Math.sin(x / 5 + E.noise2(x / 20, y / 20) * 6) > .55 ? [186, 150, 92] : [218 - n * 3, 184, 114]) : f > .58 ? [34 + n, 98, 42] : [80 + n * 3, 150, 62];
      const i = (y * WN + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return cv;
  }
  let m7 = null, w7 = null;   // (made on the first visit: the paintings take a moment)
  const views = () => {
    if (!m7) m7 = new E.Mode7({ floor: isle = paintIsle(), texel: TX, outside: '#265cba', sky: new E.Backdrop({ sky: ['#2a62c8', '#6aa8ec', '#d0e6f8'], sun: { x: .7, y: .25, r: 12, color: '#fffbe0' }, layers: [{ kind: 'clouds', color: '#ffffff', y: .5, height: .2, parallax: .04, drift: 4 }] }), far: 9000, fog: { color: '#d0e6f8', near: 1600, far: 9000 } });
    if (!w7) w7 = new E.Mode7({ floor: world = paintWorld(), texel: WT, wrap: true, curve: 2200, sky: ['#2a4a9a', '#d8e8ff'], fog: { color: '#d8e8ff', near: 900, far: 2600 } });
  };

  /* ---- THE MODELS (x forward, y right, z up; a unit a quarter of a metre) ---- */
  const PLANE = new E.Mesh([
    ['tube', [3, 0, 7], 3.4, 5, 'body', { n: 8 }], ['tube', [-8, 0, 7.6], 1.2, 7, 'body', { n: 8, end: 2.8 }], ['tube', [9.5, 0, 7], 3.4, 1.5, '#d8d8d8', { n: 8, end: .45 }],
    ['box', [1.5, 9, 9.6], [3.8, 9, .5], 'wing', { mirror: true }], ['box', [1.2, 18.4, 9.6], [3.2, .5, .5], '#e83a30', { mirror: true }],
    ['box', [-13.5, 0, 8], [2.2, 6.5, .35], 'body'], ['box', [-13.5, 0, 11.5], [2.4, .35, 3.6], '#e83a30', { top: [.55, 1], tip: [-1.4, 0] }],
    ['box', [3, 0, 10.6], [3, 2.4, 1.4], '#7ad0ff', { top: [.55, .75], tip: [-.6, 0] }],
    ['box', [4, 3.6, 2.6], [.4, .4, 2], '#3a3a40', { mirror: true }], ['tube', [4, 3.6, 1.4], 1.4, .6, '#1e1e24', { axis: 'y', n: 6, mirror: true }]]);
  const PROP = new E.Mesh([['face', [[0, -6, -.7], [0, 6, -.7], [0, 6, .7], [0, -6, .7]], '#2a2a30', { both: true }]]);
  const ring = (R, w) => new E.Mesh(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * TAU, b = (i + 1) / 12 * TAU, P = (r, t, x) => [x, r * Math.cos(t), r * Math.sin(t)];
    return [['face', [P(R, a, 2), P(R - w, a, 2), P(R - w, b, 2), P(R, b, 2)], 'ring', { both: true }], ['face', [P(R, a, -2), P(R, b, -2), P(R, b, 2), P(R, a, 2)], 'ring']]; }).flat());
  const RING = ring(40, 7), HOOP = ring(70, 9);
  const SHIP = new E.Mesh([['ball', [0, 0, 34], [44, 15, 15], 'hull', { n: 10 }], ['box', [-2, 0, 13], [12, 5, 3.5], '#7a5030', { top: [1.08, 1.12] }], ['box', [-2, 0, 17.4], [10, 4.4, 1], '#c8a060'],
    ['box', [-40, 0, 47], [5, .6, 9], '#c83a30', { top: [.5, 1], tip: [-3, 0] }], ['box', [-40, 0, 34], [5, 16, .6], '#c83a30', { top: [.5, 1] }], ['tube', [-14, 9, 15], 2.2, 3, '#5a5a62', { mirror: true }]]);
  const CHUTE = new E.Mesh(Array.from({ length: 7 }, (_, i) => { const t0 = -1.15 + i * 2.3 / 7, t1 = t0 + 2.3 / 7, P = (t, x) => [x, 17 * Math.sin(t), 30 + 7 * Math.cos(t)]; return ['face', [P(t0, -5), P(t1, -5), P(t1, 5), P(t0, 5)], i % 2 ? '#f0f0f0' : '#e8402a', { both: true }]; }));
  const TOWER = new E.Mesh([['box', [0, 0, 22], [11, 11, 22], '#b8b0a0', { top: [.7, .7] }], ['box', [0, 0, 47], [9, 9, 3], '#7a7068'], ['box', [0, 0, 55], [8, 8, 5], 'cap', { top: [.1, .1] }]]);
  const CASTLE = new E.Mesh([['box', [0, 0, 12], [30, 20, 12], '#cac2b2'], ['box', [24, 18, 22], [6, 6, 22], '#b8b0a0', { mirror: true }], ['box', [-24, 18, 22], [6, 6, 22], '#b8b0a0', { mirror: true }],
    ['box', [24, 18, 48], [7, 7, 4], '#3a5aa8', { top: [.12, .12], mirror: true }], ['box', [-24, 18, 48], [7, 7, 4], '#3a5aa8', { top: [.12, .12], mirror: true }], ['box', [0, 0, 32], [10, 10, 8], '#d6cebe'], ['box', [0, 0, 45], [11, 11, 5], '#3a5aa8', { top: [.1, .1] }]]);
  const R7 = E.rng(11), TREES = [], CLOUDS = [];
  for (let i = 0; i < 70; i++) {   // (off the runway and off the dive's target: one there still takes its draws, so the rest stand where they did)
    const a = R7() * TAU, r = 300 + R7() * 900, x = M + Math.cos(a) * r, y = M + Math.sin(a) * r;
    if (Math.abs(x - RUNWAY.x) > 140 || y < 2300 || y > 3200) { const tr = [x, y, R7() < .5 ? 'tree' : 'pine', .8 + R7() * .5]; if (Math.hypot(x - TARGET[0], y - TARGET[1]) > 150) TREES.push(tr); }
  }
  for (let i = 0; i < 26; i++) CLOUDS.push([R7() * ISLE, R7() * ISLE, 420 + R7() * 500, 50 + R7() * 50]);
  const WCLOUDS = Array.from({ length: 40 }, () => [R7() * 8192, R7() * 8192, 300 + R7() * 300, 60 + R7() * 50]);
  const cloud = (c, k) => (g, sx, sy) => { const s = c[3] * k; if (s < 1) return; px.ell(g, sx, sy - s * .1, s * .9, s * .32, '#c8d4e8'); px.disc(g, sx - s * .45, sy - s * .38, s * .36, '#f4f8ff'); px.disc(g, sx + s * .35, sy - s * .34, s * .3, '#eef4fc'); px.disc(g, sx, sy - s * .55, s * .42, '#ffffff'); };

  /* ---- THE EVENTS ---- */
  const COURSE = [[2048, 3400, 280], [2360, 2840, 330], [2720, 2280, 380], [2600, 1660, 400], [2080, 1300, 360], [1520, 1520, 320], [1260, 2120, 260], [1180, 2860, 210], [1500, 4000, 150], [1920, 3780, 80, -Math.PI / 2]];
  const HOOPS = [[2390, 3150, 2000], [2450, 3040, 1600], [2510, 2930, 1200]];
  const BELT = [[2048, 3560, 60], [2160, 3380, 110], [2300, 3240, 70], [2250, 3020, 140], [2140, 2840, 90]], PAD = [2120, 2640], BELT0 = [2048, 3760];   // the rocket belt's rings, its pad, its start
  const yawOf = (L, i, from) => L[i][3] !== undefined ? L[i][3] : Math.atan2(L[i][1] - (i ? L[i - 1][1] : from[1]), L[i][0] - (i ? L[i - 1][0] : from[0]));
  const SONG = { bpm: 116, steps: 4, tracks: [
    { wave: 'square', vol: .05, notes: 'E5 . G5 . A5 . . G5 | E5 . D5 . C5 . . . | D5 . E5 . G5 . A5 . | B5 . . A5 G5 . . . | C6 . B5 . A5 . G5 . | A5 . G5 . E5 . D5 . | E5 . G5 . A5 . D5 . | C5 . . . . . . .' },
    { wave: 'triangle', vol: .24, notes: 'C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . G2 . D3 . | C3 . G3 . C3 . . .' },
    { wave: 'drums', vol: .05, notes: 'k . h . s . h . k . h k s . h .' }] };
  const VOYAGE_SONG = { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse', vol: .05, notes: 'A4 . . C5 E5 . . D5 | C5 . B4 . A4 . . . | F4 . . A4 C5 . . B4 | A4 . G4 . E4 . . . | A4 . . C5 E5 . . G5 | F5 . E5 . D5 . . . | C5 . D5 . E5 . . B4 | A4 . . . . . . .' },
    { wave: 'triangle', vol: .24, notes: 'A2 . E3 . A2 . E3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | E2 . B2 . E2 . B2 . | A2 . E3 . A2 . E3 . | D2 . A2 . D2 . A2 . | F2 . C3 . E2 . B2 . | A2 . E3 . A2 . . .' },
    { wave: 'drums', vol: .04, notes: 'k . . . s . . . k . k . s . . h' }] };
  let mode = 'menu', ev = null, t = 0, S = null, banner = null, bannerT = 0, pilot = null, res = null;
  const EVENTS = ['plane', 'dive', 'belt', 'voyage'], menu = new E.Menu(game, EVENTS.map(e => E.t('sky.menu.' + e)).concat(E.t('sky.menu.back')), { onPick: i => i === EVENTS.length ? game.go('title') : start(EVENTS[i]) });
  const after = new E.Menu(game, [E.t('sky.menu.again'), E.t('sky.menu.menu')], { onPick: i => i === 0 ? start(ev) : toMenu() });
  function toMenu() { mode = 'menu'; ev = null; S = null; A.music('title'); }
  const say = (s, secs = 2.2) => { banner = s; bannerT = secs; };
  /** an event from its start: the plane south of the island heading north; the diver at 600 m over the bay; the airship by the castle */
  function start(which) {
    views(); ev = which; mode = 'fly'; t = 0; res = null; pilot = null;
    if (which === 'plane') S = { x: 2048, y: 3900, z: 300, yaw: -Math.PI / 2, pitch: 0, roll: 0, speed: 150, thr: .55, prop: 0, next: 0, rings: 0, down: false, crash: 0, landed: false, touch: null };
    else if (which === 'belt') S = { x: BELT0[0], y: BELT0[1], z: 0, vz: 0, v: 0, yaw: -Math.PI / 2, roll: 0, lean: 0, fuel: 100, thrust: 0, next: 0, rings: 0, up: false, down: false };
    else if (which === 'dive') S = { x: 2350, y: 3260, z: 2400, vz: 0, yaw: -Math.PI / 2, next: 0, rings: 0, chute: 0, opened: null, canopy: false, down: false, brake: false };
    else S = { x: HOME[0], y: HOME[1] + 500, z: 260, yaw: -Math.PI / 2, speed: 180, thr: .5, lit: [false, false, false], home: false, land: null, prop: 0 };
    say(E.t('sky.goal.' + which), 3); A.music(which === 'voyage' ? VOYAGE_SONG : SONG); game.input.consumeAll();
  }
  // the player's stick: [x, y] (down climbs: a plane's), the throttle up or down, the act; or the autopilot's (the bot)
  const stick = () => { const I = game.input, [x, y] = I.move(); return { x, y, gas: I.down('gas'), brake: I.down('slow'), act: I.pressed('act') }; };
  /** the plane: the stick banks it and pitches it, the bank turns it, a dive gains speed and a climb loses it, too slow it
   *  stalls; at the ground it lands on the runway (lined up, slow, level, not sinking hard) or crashes */
  function plane(P, dt, k) {
    if (P.down) { P.speed = Math.max(0, P.speed - (P.landed ? 70 : 200) * dt); P.x += Math.cos(P.yaw) * P.speed * dt; P.y += Math.sin(P.yaw) * P.speed * dt; P.roll *= .9; P.pitch *= .9; return; }
    P.thr += ((k.gas ? 1 : k.brake ? 0 : P.thr) - P.thr) * Math.min(1, dt * 1.5);
    P.roll += (clamp(k.x, -1, 1) * .95 - P.roll) * Math.min(1, dt * 2.6);
    P.pitch += (clamp(k.y, -1, 1) * .55 - P.pitch) * Math.min(1, dt * 1.7);
    if (P.speed < 72) P.pitch -= (72 - P.speed) * .02 * dt;
    P.yaw += Math.sin(P.roll) * 1.15 * dt;
    P.speed = clamp(P.speed + ((70 + P.thr * 140 - P.speed) * .45 - Math.sin(P.pitch) * 90) * dt, 30, 260);
    const h = P.speed * Math.cos(P.pitch); P.x += Math.cos(P.yaw) * h * dt; P.y += Math.sin(P.yaw) * h * dt; P.z += P.speed * Math.sin(P.pitch) * dt; P.prop += dt * (10 + P.thr * 30);
    if (P.z > 0) return;
    const R = RUNWAY, on = Math.abs(P.x - R.x) < R.w && P.y > R.y0 && P.y < R.y1, sink = P.speed * Math.sin(P.pitch), lined = Math.abs(E.angDiff(P.yaw, -Math.PI / 2)) < .4;
    P.z = 0; P.down = true; P.touch = { y: P.y, sink, speed: P.speed };
    if (on && lined && Math.abs(P.roll) < .32 && sink > -42 && P.speed < 175) { P.landed = true; say(E.t('sky.landed')); A.sfx('land'); A.sfx('confirm'); }
    else { P.crash = 1; say(E.t(on ? 'sky.hard' : 'sky.crash')); A.sfx('explode'); game.shake(6); }
  }
  /** a ring is flown through when the plane crosses its plane within its radius */
  function through(P, L, i, from, r, was) {
    const [x, y, z] = L[i], a = yawOf(L, i, from), fx = Math.cos(a), fy = Math.sin(a), s0 = (was[0] - x) * fx + (was[1] - y) * fy, s1 = (P.x - x) * fx + (P.y - y) * fy;
    return s0 < 0 && s1 >= 0 && Math.hypot((P.x - x) * -fy + (P.y - y) * fx, P.z - z) < r;
  }
  /** the diver: a free fall the stick steers across the ground (north up the screen), the chute opened in its band, then
   *  a canopy that turns, glides and sinks (SLOW brakes it: held at the ground, a soft landing) */
  function dive(P, dt, k) {
    if (P.down) return;
    if (!P.canopy) {
      P.vz = Math.max(-200, P.vz - 160 * dt); P.x += k.x * 70 * dt; P.y += k.y * 70 * dt; P.z += P.vz * dt;
      if ((k.act && P.z < 1150) || P.z < 300) { P.canopy = true; P.opened = P.z; P.chute = 0; A.sfx('whoosh'); if (P.z < 300) say(E.t('sky.late')); }
    } else {
      P.chute = Math.min(1, P.chute + dt * 1.6); P.brake = k.brake || k.y > .6; const fwd = P.brake ? 18 : 44;
      P.yaw += clamp(k.x, -1, 1) * 1.1 * dt; P.x += Math.cos(P.yaw) * fwd * P.chute * dt; P.y += Math.sin(P.yaw) * fwd * P.chute * dt;
      P.z += Math.min(P.vz, 0) * dt; P.vz += ((P.brake ? -14 : -26) - P.vz) * Math.min(1, dt * 2.2);
    }
    if (P.z <= 0) { P.z = 0; P.down = true; P.dist = Math.hypot(P.x - TARGET[0], P.y - TARGET[1]); P.soft = P.canopy && P.vz > -20; say(E.t(P.dist < 20 ? 'sky.bull' : P.dist < 120 ? 'sky.landed' : 'sky.miss')); A.sfx(P.dist < 40 ? 'secret' : 'land'); }
  }
  /** the rocket belt: GAS climbs, SLOW drops, neither and it sinks slowly; the stick leans it forward or back (it flies
   *  that way) and turns it; the fuel runs down (faster on GAS), and when it's gone it falls; down again on the ground
   *  (once up), the landing judged by the pad and how hard */
  function belt(P, dt, k) {
    if (P.down) { P.v *= .9; return; }
    const lift = P.fuel <= 0 ? -1.3 : k.gas ? 1 : k.brake ? -1 : -.3; P.thrust = lift > -.5 ? 1 : 0;
    P.fuel = Math.max(0, P.fuel - (1 + (k.gas ? 2 : 0)) * dt); P.vz += (lift * 70 - P.vz) * Math.min(1, dt * 1.6);
    P.yaw += clamp(k.x, -1, 1) * 1.4 * dt; P.v += (-clamp(k.y, -1, 1) * 120 - P.v) * Math.min(1, dt * 1.1); P.roll += (clamp(k.x, -1, 1) * .3 - P.roll) * Math.min(1, dt * 4); P.lean = P.v / 400;
    P.x += Math.cos(P.yaw) * P.v * dt; P.y += Math.sin(P.yaw) * P.v * dt; P.z = Math.max(0, P.z + P.vz * dt); if (P.z > 15) P.up = true;
    if (P.up && P.z <= 0) { P.down = true; P.dist = Math.hypot(P.x - PAD[0], P.y - PAD[1]); P.soft = P.vz > -32; say(E.t(P.dist < 15 ? 'sky.bull' : P.dist < 90 ? 'sky.landed' : 'sky.miss')); A.sfx(P.soft ? 'land' : 'hurt'); if (!P.soft) game.shake(4); }
  }
  /** the airship: it turns, rises and sinks with the stick, faster or slower with the throttle; by a beacon not yet lit,
   *  low enough, the act lands it beside it */
  function ship(P, dt, k) {
    P.prop += dt * 12;
    if (P.land) { const L = P.land; L.t += dt; P.z += ((L.t < 2.2 ? 40 : 240) - P.z) * Math.min(1, dt * 1.6); P.speed *= .97;
      if (L.t > 1.6 && !L.done) { L.done = true; if (L.i < 0) { P.home = true; say(E.t('sky.voyage.done'), 4); A.sfx('secret'); } else { P.lit[L.i] = true; say(E.t('sky.voyage.lit', { n: P.lit.filter(Boolean).length }), 3); A.sfx('oneup'); } }
      if (L.t > 3.4 && !P.home) P.land = null; return; }
    P.thr += ((k.gas ? 1 : k.brake ? 0 : P.thr) - P.thr) * Math.min(1, dt * 1.2);
    P.yaw += clamp(k.x, -1, 1) * 1.05 * dt; P.z = clamp(P.z - clamp(k.y, -1, 1) * -110 * dt, 120, 640);
    P.speed += (60 + P.thr * 240 - P.speed) * Math.min(1, dt * .8);
    P.x = ((P.x + Math.cos(P.yaw) * P.speed * dt) % 8192 + 8192) % 8192; P.y = ((P.y + Math.sin(P.yaw) * P.speed * dt) % 8192 + 8192) % 8192;
    const near = goal(P);
    if (near && near.d < 280 && P.z < 260 && k.act) { P.land = { t: 0, i: near.i }; A.sfx('confirm'); }
  }
  // the airship's next goal: the nearest beacon not yet lit, or home once all three are: { i (-1 home), x, y, d }
  function goal(P) {
    const wd = v => ((v + 12288) % 8192) - 4096;
    let best = null; const cand = P.lit.every(Boolean) ? [[-1, HOME]] : BEACONS.map((b, i) => [i, b]).filter(([i]) => !P.lit[i]);
    for (const [i, b] of cand) { const dx = wd(b[0] - P.x), dy = wd(b[1] - P.y), d = Math.hypot(dx, dy); if (!best || d < best.d) best = { i, x: P.x + dx, y: P.y + dy, d }; }
    return best;
  }
  /** a score out of 100, its parts and its medal */
  function score() {
    const P = S, part = [];
    if (ev === 'plane') { part.push(['rings', P.rings * 5]); const L = P.landed ? 30 + Math.round(10 * (1 - Math.min(1, Math.abs(P.touch.y - RUNWAY.aim) / 300))) + (P.touch.sink > -18 ? 10 : 0) : 0; part.push(['landing', L]); }
    else if (ev === 'belt') { part.push(['rings', P.rings * 10]); const d = P.dist; part.push(['landing', P.down ? (d < 15 ? 40 : d < 40 ? 30 : d < 90 ? 18 : 6) + (P.soft ? 10 : 0) : 0]); }
    else if (ev === 'dive') { part.push(['rings', P.rings * 10]); const o = P.opened || 0; part.push(['chute', o > 600 ? 10 : o > 400 ? 6 : 0]); const d = P.dist; part.push(['landing', (d < 20 ? 50 : d < 40 ? 40 : d < 80 ? 28 : d < 120 ? 16 : 6) + (P.soft ? 10 : 0)]); }
    else { const s = Math.max(0, Math.round(100 - Math.max(0, t - 90) / 2)); part.push(['time', s]); }
    const total = part.reduce((a, p) => a + p[1], 0), medal = total >= 90 ? 'gold' : total >= 75 ? 'silver' : total >= 55 ? 'bronze' : null;
    return { part, total, medal, best: best('sky:' + ev, total) };
  }
  /** the autopilot (the bot, and a demo): a stick that flies to the next ring or hoop, lands, opens the chute, finds the beacons */
  function auto(P) {
    const steer = (tx, ty, tz, spd) => { const d = Math.hypot(tx - P.x, ty - P.y), want = Math.atan2(tz - P.z, Math.max(70, d)), turn = E.angDiff(P.yaw, Math.atan2(ty - P.y, tx - P.x)); return { x: clamp(turn * 2.4, -1, 1), y: clamp((want - P.pitch) * 3 + want / .55, -1, 1), gas: P.speed < spd - 8, brake: P.speed > spd + 8 }; };
    if (ev === 'plane') {
      if (P.next < COURSE.length) { const [x, y, z] = COURSE[P.next], a = yawOf(COURSE, P.next, [2048, 3900]); return steer(x + Math.cos(a) * 60, y + Math.sin(a) * 60, z, 150); }
      const R = RUNWAY, k = steer(R.x, P.y > 3300 ? 3300 : R.aim - 200, P.y > 3300 ? 40 : 0, 100); if (P.z < 16) k.y = -.16; return k;   // (the flare: a slow, shallow sink)
    }
    if (ev === 'belt') {   // to a point past the next ring at its height; then over the pad, and let it sink
      const r = BELT[P.next], a = r && yawOf(BELT, P.next, BELT0), tx = r ? r[0] + Math.cos(a) * 50 : PAD[0], ty = r ? r[1] + Math.sin(a) * 50 : PAD[1], tz = r ? r[2] : 40, d = Math.hypot(tx - P.x, ty - P.y);
      return { x: clamp(E.angDiff(P.yaw, Math.atan2(ty - P.y, tx - P.x)) * 2.4, -1, 1), y: r ? (d > 40 ? -1 : -.5) : d > 60 ? -.8 : d > 12 ? -.25 : P.v > 4 ? .6 : 0, gas: !r && d < 12 ? false : P.z < tz - 6 || P.vz < -12 && P.z < tz + 20, brake: r ? P.z > tz + 14 : false };
    }
    if (ev === 'dive') {
      if (!P.canopy) { const h = HOOPS[P.next] || TARGET, dx = h[0] - P.x, dy = h[1] - P.y, l = Math.max(1, Math.hypot(dx, dy)) / Math.min(1, Math.hypot(dx, dy) / 30); return { x: dx / l, y: dy / l, act: P.z < 760 }; }
      const d = Math.hypot(TARGET[0] - P.x, TARGET[1] - P.y), to = Math.atan2(TARGET[1] - P.y, TARGET[0] - P.x), high = P.z > d / 1.3 + 30;   // (too high to glide straight in: circle the target)
      return { x: clamp(E.angDiff(P.yaw, to + (high && d < 150 ? 1.3 : 0)) * 2, -1, 1), brake: !high && (P.z > d / 1.7 || P.z < 18), y: 0 };
    }
    const g = goal(P); if (!g) return { x: 0, y: 0 };
    return { x: clamp(E.angDiff(P.yaw, Math.atan2(g.y - P.y, g.x - P.x)) * 2.4, -1, 1), y: g.d < 900 && P.z > 200 ? -1 : P.z < 300 && g.d > 900 ? 1 : 0, gas: g.d > 600, brake: g.d < 320, act: g.d < 250 && P.z < 260 };
  }

  /* ---- each step ---- */
  function update(dt) {
    const I = game.input;
    I.touchSet('gas', null, mode === 'fly' && ev !== 'dive'); I.touchSet('slow', null, mode === 'fly'); I.touchSet('act', null, mode === 'fly' && (ev === 'dive' || ev === 'voyage'));
    t += dt; if (bannerT > 0) bannerT -= dt;
    if (mode === 'menu') { menu.update(dt); return; }
    if (mode === 'results') { after.update(dt); return; }
    const k = pilot ? auto(S) : stick(), was = [S.x, S.y, S.z];
    if (ev === 'plane') {
      plane(S, dt, k);
      if (S.next < COURSE.length && through(S, COURSE, S.next, [2048, 3900], 40, was)) { S.rings++; A.sfx('coin'); if (S.next === COURSE.length - 1) say(E.t('sky.final')); }
      if (S.next < COURSE.length) { const [x, y] = COURSE[S.next], a = yawOf(COURSE, S.next, [2048, 3900]); if ((S.x - x) * Math.cos(a) + (S.y - y) * Math.sin(a) > 0) S.next++; }   // (past it, through or not)
      if (S.down && S.speed < 4) finish();
    } else if (ev === 'belt') {
      belt(S, dt, k);
      if (S.next < BELT.length && through(S, BELT, S.next, BELT0, 40, was)) { S.rings++; A.sfx('coin'); if (S.next === BELT.length - 1) say(E.t('sky.belt.pad')); }
      if (S.next < BELT.length) { const [x, y] = BELT[S.next], a = yawOf(BELT, S.next, BELT0); if ((S.x - x) * Math.cos(a) + (S.y - y) * Math.sin(a) > 0) S.next++; }
      if (S.down) { S.after = (S.after || 0) + dt; if (S.after > 1.6) finish(); }
    } else if (ev === 'dive') {
      dive(S, dt, k);
      const h = HOOPS[S.next]; if (h && S.z <= h[2]) { if (Math.hypot(S.x - h[0], S.y - h[1]) < 70) { S.rings++; A.sfx('coin'); } S.next++; }
      if (S.down) { S.after = (S.after || 0) + dt; if (S.after > 1.6) finish(); }
    } else {
      ship(S, dt, k);
      if (S.home && S.land && S.land.t > 3) finish();
    }
  }
  function finish() { if (mode !== 'fly') return; res = score(); mode = 'results'; after.i = 0; bannerT = 0; if (res.medal) A.sfx('powerup'); }   // (the banner gone: the results box stands where it was)

  /* ---- the look ---- */
  function shadow(V, x, y, z, s) { V.add(x, y, 0, (g, sx, sy, k) => { const a = g.globalAlpha; g.globalAlpha = a * clamp(.5 - z / 1600, .1, .5); px.ell(g, sx, sy, s * k, s * k * .36, '#0c1a10'); g.globalAlpha = a; }); }
  function camFor() {
    const tall = game.H > game.W, wide = tall ? 1.45 : 1, fov = tall ? 84 : 64;   // (a phone held upright: further back, wider)
    if (mode === 'menu' || !S) { const a = t * .08; return { x: M + Math.cos(a) * 1900, y: M + Math.sin(a) * 1900, h: 620, angle: a + Math.PI + .25, pitch: 20, fov: 66, roll: Math.sin(t * .3) * 5 }; }
    if (ev === 'plane') { const P = S, back = 84 * wide; return { x: P.x - Math.cos(P.yaw) * back * Math.cos(P.pitch), y: P.y - Math.sin(P.yaw) * back * Math.cos(P.pitch), h: Math.max(8, P.z + 24 * wide - Math.sin(P.pitch) * back * .6), angle: P.yaw, pitch: 10 - P.pitch * 40, fov, roll: P.roll * 40 }; }
    if (ev === 'belt') { const P = S; return { x: P.x - Math.cos(P.yaw) * 80 * wide, y: P.y - Math.sin(P.yaw) * 80 * wide, h: P.z + 34 * wide, angle: P.yaw, pitch: 14, fov, roll: P.roll * 20 }; }
    if (ev === 'dive') { const P = S; return P.canopy ? { x: P.x - Math.cos(P.yaw) * 90 * wide, y: P.y - Math.sin(P.yaw) * 90 * wide, h: P.z + 58 * wide, angle: P.yaw, pitch: 26, fov: fov + 2 } : { x: P.x, y: P.y + 70, h: P.z + 150 * wide, angle: -Math.PI / 2, pitch: 64, fov: fov + 6 }; }
    const P = S, a = P.yaw + .38; return { x: P.x - Math.cos(a) * 150 * wide, y: P.y - Math.sin(a) * 150 * wide, h: P.z + 50 * wide + P.z * .15, angle: P.yaw + .22, pitch: 15 + P.z / 60, fov };
  }
  function draw(r) {
    const W = r.W, H = r.H; views();
    const cam = camFor(), V = ev === 'voyage' ? w7 : m7, fx = Math.cos(cam.angle), fy = Math.sin(cam.angle), cp = Math.cos(cam.pitch * Math.PI / 180), sp = Math.sin(cam.pitch * Math.PI / 180);
    if (V === m7) {   // the trees in view: by their depth from the camera (the free fall's view reaches behind straight down)
      for (const [x, y, kind, s] of TREES) { const d = (x - cam.x) * fx + (y - cam.y) * fy; if (d * cp + cam.h * sp > 20 && d < 2600) m7.shape(kind, x, y, 0, { size: s }); }
      for (const c of CLOUDS) m7.add(c[0], c[1], c[2], (g, sx, sy, k) => cloud(c, k)(g, sx, sy));
    } else {
      for (const c of WCLOUDS) w7.add(c[0], c[1], c[2], (g, sx, sy, k) => cloud(c, k)(g, sx, sy));
      BEACONS.forEach((b, i) => { const lit = S && S.lit && S.lit[i]; w7.mesh(TOWER, b[0], b[1], 0, { colors: { cap: lit ? '#ffd040' : '#5a5a68' } }); if (lit) w7.add(b[0], b[1], 64, (g, sx, sy, k) => { const s = (6 + Math.sin(t * 6) * 1.5) * k; px.disc(g, sx, sy - s, s * 1.6, '#fff4a0'); px.disc(g, sx, sy - s, s, '#ffffff'); }); });
      w7.mesh(CASTLE, HOME[0], HOME[1], 0, { yaw: Math.PI / 2 });
    }
    if (S && ev === 'plane') {
      const P = S, o = { yaw: P.yaw, pitch: P.pitch, roll: P.roll };
      COURSE.forEach((c, i) => { if (i >= P.next) m7.mesh(RING, c[0], c[1], c[2], { yaw: yawOf(COURSE, i, [2048, 3900]), colors: { ring: i === P.next ? (t * 4 % 2 < 1 ? '#ffd040' : '#ffe890') : '#e8eef8' } }); });
      if (!P.crash) { m7.mesh(PLANE, P.x, P.y, P.z, Object.assign({ colors: { body: '#f4f4f0', wing: '#f0c030' } }, o)); const n = PLANE.at(11.4, 0, 7, Object.assign({ x: P.x, y: P.y, z: P.z }, o)); m7.mesh(PROP, n[0], n[1], n[2], { yaw: P.yaw, pitch: P.pitch, roll: P.roll + P.prop }); }
      else m7.add(P.x, P.y, 0, (g, sx, sy, k) => { for (let i = 0; i < 5; i++) px.disc(g, sx + Math.sin(i * 2.1 + t) * 12 * k, sy - (10 + i * 7 + (t * 20 % 10)) * k, (6 + i * 2) * k, i % 2 ? '#5a5a5a' : '#3a3a3a'); });
      shadow(m7, P.x, P.y, P.z, 14);
    } else if (S && ev === 'belt') {   // the rings, the pad (a yellow square, a grey one in it), the flyer and its flame
      const P = S, sq = (c, r, col) => m7.quad([[c[0] - r, c[1] - r, 0], [c[0] + r, c[1] - r, 0], [c[0] + r, c[1] + r, 0], [c[0] - r, c[1] + r, 0]], col);
      BELT.forEach((c, i) => { if (i >= P.next) m7.mesh(RING, c[0], c[1], c[2], { yaw: yawOf(BELT, i, BELT0), colors: { ring: i === P.next ? (t * 4 % 2 < 1 ? '#ffd040' : '#ffe890') : '#e8eef8' } }); });
      sq(PAD, 30, '#f0c030'); sq(PAD, 22, '#5a5a62'); sq(PAD, 6, '#f0f0f0');
      const rig = diver(P.yaw); m7.add(P.x, P.y, P.z, (g, sx, sy, k) => { if (P.thrust && !P.down) for (let i = 0; i < 3; i++) px.disc(g, sx + (i - 1) * 3 * k, sy + (4 + (t * 40 + i * 5) % 8) * k, Math.max(1, (3 - i * .5) * k), i === 1 ? '#fff0a0' : '#ff8a30'); rig.draw(g, Math.round(sx), Math.round(sy), m7.view(k)); });
      shadow(m7, P.x, P.y, P.z, 10);
    } else if (S && ev === 'dive') {
      const P = S;
      HOOPS.forEach((h, i) => { if (i >= P.next) m7.mesh(HOOP, h[0], h[1], h[2], { pitch: Math.PI / 2, colors: { ring: i === P.next ? '#ffd040' : '#e8eef8' } }); });
      const rig = diver(P.canopy ? P.yaw : -Math.PI / 2), up = P.canopy && P.chute > .2;
      m7.add(P.x, P.y, P.z, (g, sx, sy, k) => { rig.draw(g, Math.round(sx), Math.round(sy + (up ? 0 : 18 * k)), up ? m7.view(k) : flatView(k));
        if (up) for (const sd of [-1, 1]) { const e = CHUTE.at(0, 15 * sd, 31, { x: P.x, y: P.y, z: P.z + 6, yaw: P.yaw, scale: P.chute }), q = m7.project(e[0], e[1], e[2]); if (q) px.line(g, sx + sd * 3 * k, sy - 26 * k, q[0], q[1], '#e8e8e8', 1); } });
      if (up) m7.mesh(CHUTE, P.x, P.y, P.z + 6, { yaw: P.yaw, scale: P.chute });
      shadow(m7, P.x, P.y, P.z, 10);
    } else if (S && ev === 'voyage') {
      const P = S, o = { yaw: P.yaw, pitch: 0, roll: Math.sin(t * 1.3) * .04 };
      w7.mesh(SHIP, P.x, P.y, P.z, Object.assign({ colors: { hull: '#d8c8a0' } }, o));
      for (const s of [-1, 1]) { const p = SHIP.at(-17.5, 9 * s, 15, Object.assign({ x: P.x, y: P.y, z: P.z }, o)); w7.mesh(PROP, p[0], p[1], p[2], { yaw: P.yaw, roll: P.prop * s, scale: .7 }); }
    }
    V.draw(r, cam);
    hud(r, V);
  }
  // the diver: an HD rig, arms up; seen from above in the free fall (a level view: its back), from behind under the canopy
  let rigD = null, flatV = new Map();
  function diver(f = -Math.PI / 2) { if (!rigD) rigD = new E.Humanoid({ size: .9, weapon: null, hair: 'short', colors: { cloth: '#e8402a', pants: '#2a3a6a', hair: '#3a2010' }, helmet: true }); rigD.update(1 / 120, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: f, pose: 'cheer' }); return rigD; }   // (f: its heading, so the camera behind sees its back)
  function flatView(k) { const q = Math.max(1 / 8, Math.round(k * 8) / 8); let v = flatV.get(q); if (!v) flatV.set(q, v = new E.View('dive', 'Dive', 0, 0, q, 1)); return v; }
  function hud(r, V) {
    const W = r.W, H = r.H, right = cornerX() - 4, lh = E.font.lineHeight();
    r.overlay(g => {
      const txt = (s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#0a1020', outline: false }, o));
      if (mode === 'menu') {
        E.font.title(g, E.t('sky.title'), W / 2, 24, { scale: 4, align: 'center', colors: ['#ffffff', '#bfe4ff', '#4a9ae8', '#2a5ab8'], depth: 3 });
        txt(E.t('sky.tagline'), W / 2, 24 + 46, '#e8f4ff', { align: 'center' }); return;
      }
      const P = S; if (!P) return;
      txt(E.t('sky.event.' + ev), 6, 6, '#ffe890');
      if (ev === 'plane') txt(E.t('sky.hud.rings', { n: P.rings, of: COURSE.length }), 6, 6 + lh);
      if (ev === 'dive') txt(E.t('sky.hud.rings', { n: P.rings, of: HOOPS.length }), 6, 6 + lh);
      if (ev === 'belt') { txt(E.t('sky.hud.rings', { n: P.rings, of: BELT.length }), 6, 6 + lh); txt(E.t('sky.hud.fuel'), 6, 8 + lh * 2, P.fuel < 20 ? '#ff8060' : '#ffffff'); const w = 50, x = 8 + E.font.width(E.t('sky.hud.fuel')), y = 9 + lh * 2; px.rect(g, x - 1, y - 1, w + 2, 6, '#0a1020'); px.rect(g, x, y, Math.round(w * P.fuel / 100), 4, P.fuel < 20 ? '#ff6040' : '#60d0ff'); }
      if (ev === 'voyage') txt(E.t('sky.hud.beacons', { n: P.lit.filter(Boolean).length }), 6, 6 + lh);
      txt(E.t('sky.hud.alt', { m: Math.round(P.z / 4) }), right, 6, P.z < 40 && ev === 'plane' && !P.down ? '#ffb040' : '#ffffff', { align: 'right' });
      if (P.speed !== undefined) txt(E.t('sky.hud.speed', { kmh: Math.round(P.speed * .9) }), right, 6 + lh, '#ffffff', { align: 'right' });
      if (ev === 'dive' && !P.canopy && !P.down) {   // the altimeter's band: open the chute while the needle is in the green
        const x = right - 8, y0 = 8 + lh * 2, h = Math.min(90, H / 2), z2y = z => y0 + h - clamp(z / 2400, 0, 1) * h;
        px.rect(g, x - 1, y0 - 1, 8, h + 2, '#0a1020'); px.rect(g, x, z2y(1150), 6, z2y(600) - z2y(1150), '#40c060'); px.rect(g, x, z2y(600), 6, z2y(300) - z2y(600), '#e0a030'); px.rect(g, x - 3, Math.round(z2y(P.z)), 12, 2, '#ffffff');
        if (P.z < 1150) txt(E.t('sky.hud.open', { key: game.input.label('act') }), W / 2, H * .7, '#ffffff', { align: 'center' });
      }
      if (ev === 'voyage' && !P.home) {   // the compass: an arrow to the next goal, and how far
        const q = goal(P), a = Math.atan2(q.y - P.y, q.x - P.x) - P.yaw - Math.PI / 2, cx = W / 2, cy = 22, R = 10;
        px.disc(g, cx, cy, R + 3, '#0a1020'); px.poly(g, [[cx + Math.cos(a) * R, cy + Math.sin(a) * R], [cx + Math.cos(a + 2.5) * R * .6, cy + Math.sin(a + 2.5) * R * .6], [cx + Math.cos(a - 2.5) * R * .6, cy + Math.sin(a - 2.5) * R * .6]], q.i < 0 ? '#80c0ff' : '#ffd040');
        txt(E.t(q.i < 0 ? 'sky.hud.home' : 'sky.hud.beacon', { m: Math.round(q.d / 4) }), cx, cy + R + 6, '#ffffff', { align: 'center' });
        if (q.d < 280 && P.z < 260 && !P.land) txt(E.t('sky.hud.land', { key: game.input.label('act') }), W / 2, H * .7, '#ffe890', { align: 'center' });
        else if (q.d < 600 && P.z >= 260 && !P.land) txt(E.t('sky.hud.lower'), W / 2, H * .7, '#ffffff', { align: 'center' });
      }
      if ((ev === 'plane' && S.next < COURSE.length || ev === 'belt') && !S.down) {   // the next ring (the belt's pad) off the screen: an arrow at the edge
        const c = ev === 'plane' ? COURSE[S.next] : BELT[S.next] || [PAD[0], PAD[1], 0], p = m7.project(c[0], c[1], c[2]);
        if (!p || p[0] < 8 || p[0] > W - 8 || p[1] < 8 || p[1] > H - 8) { const a = p ? Math.atan2(p[1] - H / 2, p[0] - W / 2) : Math.atan2(c[1] - S.y, c[0] - S.x) - S.yaw - Math.PI / 2, ex = W / 2 + Math.cos(a) * (W / 2 - 18), ey = H / 2 + Math.sin(a) * (H / 2 - 18);
          px.poly(g, [[ex + Math.cos(a) * 8, ey + Math.sin(a) * 8], [ex + Math.cos(a + 2.4) * 6, ey + Math.sin(a + 2.4) * 6], [ex + Math.cos(a - 2.4) * 6, ey + Math.sin(a - 2.4) * 6]], '#ffd040'); }
      }
      if (ev === 'plane' && S.next >= COURSE.length && !S.down) txt(E.t('sky.hud.flare'), W / 2, H * .72, S.z < 30 ? '#ffe890' : '#ffffff', { align: 'center' });
      if (bannerT > 0 && banner) txt(banner, W / 2, Math.round(H * .3), '#ffffff', { align: 'center', scale: 2 });
      if (mode === 'results' && res) {
        const w = 190, h = 44 + res.part.length * lh, x = Math.round((W - w) / 2), y = Math.round(H / 2 - h / 2 - 24);
        E.ui.box(g, x, y, w, h, { bg: '#0e1a3a', border: '#d8ecff' });
        res.part.forEach(([k, v], i) => { txt(E.t('sky.part.' + k), x + 10, y + 8 + i * lh); txt(String(v), x + w - 10, y + 8 + i * lh, '#ffe890', { align: 'right' }); });
        const yy = y + 12 + res.part.length * lh; txt(E.t('sky.total', { n: res.total }), x + 10, yy, '#ffffff'); txt(E.t('sky.best', { n: res.best }), x + w - 10, yy, '#a8c8f0', { align: 'right' });
        if (res.medal) { const mc = { gold: '#ffd040', silver: '#d8dce8', bronze: '#d08a4a' }[res.medal]; px.disc(g, x + w - 22, y + h - 12, 8, '#6a4a10'); px.disc(g, x + w - 22, y + h - 12, 6, mc); txt(E.t('sky.medal.' + res.medal), x + 10, yy + lh, mc); }
      }
    });
    if (mode === 'menu') { menu.y = Math.round(H / 2) - 4; menu.draw(r); }
    if (mode === 'results') { after.y = Math.round(H / 2) + 44; after.draw(r); }
  }

  /** the bot (tools/kits-test.mjs): each event flown by the autopilot to its end: the plane round the rings and onto the
   *  runway, the diver through the hoops onto the target, the airship to the three beacons and home (first, a player who
   *  joined on the keyboard's right half: let go as SKY starts) */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s);
    try {
      game.addPlayer({ keys: 'right' }); game.go('sky', null, { fade: 0 }); game.advance(1 / 120); const out = { solo: game.players.length };   // (a player who joined another game: let go here)
      for (const e of EVENTS) {
        start(e); pilot = true; let n = 0; for (; n < 400 && mode === 'fly'; n++) game.advance(1);
        out[e] = e === 'plane' ? { rings: S.rings, landed: S.landed, score: res && res.total, seconds: n } : e === 'belt' ? { rings: S.rings, dist: Math.round(S.dist), soft: S.soft, fuel: Math.round(S.fuel), score: res && res.total, seconds: n } : e === 'dive' ? { rings: S.rings, dist: Math.round(S.dist), soft: S.soft, score: res && res.total, seconds: n } : { lit: S.lit.filter(Boolean).length, home: S.home, seconds: n };
        toMenu();
      }
      return Object.assign(out, { errors: game.errors.length });
    } finally { Math.random = was; pilot = null; }
  }

  return { view: 'topdown', views: ['topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['gas', 'slow', 'act'], camera: { zoom: false },
    enter(d) {
      game.allowJoin(false); while (game.players.length > 1) game.removePlayer(game.players.length);   // (flown alone: those who joined another game let go, the whole keyboard player 1's again)
      mode = 'menu'; S = null; ev = null; menu.i = 0; game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false; A.music('title'); if (d && d.part) start(EVENTS.includes(d.part) ? d.part : 'plane'); },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'results') { toMenu(); return true; } return false; },
    update, draw, bot,
    /** an event flown by the autopilot (a demo; the bot's) */
    demo(e) { start(e); pilot = true; },
    state: () => S && { mode, ev, t: +t.toFixed(2), x: Math.round(S.x), y: Math.round(S.y), z: Math.round(S.z), yaw: +S.yaw.toFixed(3), roll: S.roll !== undefined ? +S.roll.toFixed(3) : 0, speed: S.speed !== undefined ? Math.round(S.speed) : 0, thr: S.thr !== undefined ? +S.thr.toFixed(2) : 0, rings: S.rings, down: S.down, fuel: S.fuel !== undefined ? Math.round(S.fuel) : null, chute: S.opened ? Math.round(S.opened) : null, score: res && res.total },   // (chute: the height the dive's opened at)
    /** the proof: the light plane from its start, the throttle up, a bank to the right and a climb, then level */
    run: (n = 600) => proof('sky', n, (i, k) => {
      if (i === 2) start('plane');
      if (i === 100) { k.hold('gas'); k.hold('right'); }
      if (i === 300) { k.up('right'); k.hold('down'); }
      if (i === 450) { k.up('down'); k.up('gas'); }
    }, () => S && [S.x, S.y, S.z, S.yaw, S.roll, S.pitch, S.speed, S.rings]) };
})();
scenes.sky = SKY;
