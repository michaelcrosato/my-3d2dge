/* =====================================================================================
 * SLICE 14  ROAD  (OutRun, Pole Position, Hang-On, Road Rash). @modules road
 * A convertible on a coast road: the beach, the hills, a tunnel through the cliffs, the desert at dusk, the city at
 * night. Curves throw you outward, the shoulder slows you, palms and rocks and signs stop you dead, traffic weaves in
 * its lanes. A clock counts down; each checkpoint's arch gives time back; reach the goal before it runs out. Pick a
 * song on the radio first. Low gear pulls away hard but tops out early; high gear runs to 290.
 * KEYS: left / right (A / D) steer, up / Z gas, down / X brake, Space / Shift the gear (low, high), left and right on
 * the radio. A pad: the stick, A gas, X brake, R the gear. TOUCH: the stick steers, BRAKE and GEAR; it accelerates by
 * itself. Deep link: #road/drive (the radio skipped).
 * HOW IT WORKS: E.Road (the road module) draws the road, its hills, its tunnel, the scenery and the traffic far to near
 * and says how hard it bends; this file the stage, the car (drawn by code from behind), the traffic, the clock and
 * the radio.
 * ===================================================================================== */
const ROAD = (() => {
  const A = game.audio, SEG = 200, KEYS = Object.assign({}, E.Input.DEFAULT, { gas: ['ArrowUp', 'KeyW', 'KeyZ', 'Pad0'], brake: ['ArrowDown', 'KeyS', 'KeyX', 'Pad2'], gear: ['Space', 'ShiftLeft', 'ShiftRight', 'KeyC', 'Pad5', 'Pad7'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  /* ---- THE STAGE: five stretches, each its colors and sky; checkpoints between them; the goal at the end ---- */
  const AREAS = [
    { name: 'COCONUT BEACH', sky: 'ocean', colors: { grass: ['#e8d8a0', '#dccb90'], rumble: ['#f0f0f0', '#d83030'] } },
    { name: 'GREEN HILLS', sky: 'day', colors: { grass: ['#4aa848', '#3e9a3e'], rumble: ['#f0f0f0', '#3050c0'] } },
    { name: 'CLIFF TUNNEL', sky: 'day', colors: { grass: ['#6a5a48', '#5e5040'], rumble: ['#f0f0f0', '#d83030'] } },
    { name: 'DESERT AT DUSK', sky: 'dusk', colors: { grass: ['#d8a060', '#c89050'], rumble: ['#f0e0c0', '#b04820'], road: ['#6a6070', '#625868'] } },
    { name: 'CITY NIGHTS', sky: 'city-night', colors: { grass: ['#2a2a3a', '#24243a'], rumble: ['#e0e0f0', '#e0b030'], road: ['#4a4a58', '#444452'], lane: '#e0d060' } }];
  const road = new E.Road({ segment: SEG, lanes: 3, draw: 200, fog: null });
  const AT = [];   // where each area starts (a segment)
  const stretch = (ai, parts) => { AT.push(road.segs.length); for (const [n, o] of parts) road.add(n, Object.assign({ colors: AREAS[ai].colors }, o)); };
  stretch(0, [[40, {}], [60, { curve: 3 }], [40, { hill: 2000 }], [60, { curve: -4, hill: -2000 }], [50, {}], [70, { curve: 5 }], [40, {}]]);
  stretch(1, [[50, { hill: 4000 }], [60, { curve: -3, hill: -3000 }], [40, { hill: 3000 }], [70, { curve: 4, hill: -4000 }], [50, { curve: -5 }], [40, { hill: 2000 }], [40, { hill: -2000 }]]);
  stretch(2, [[30, {}], [80, { tunnel: true, curve: 2, colors: Object.assign({}, AREAS[2].colors, { grass: ['#3a3430', '#34302c'] }) }], [30, {}], [60, { curve: -4 }], [40, { curve: 3, hill: 1500 }]]);
  stretch(3, [[60, { curve: -2 }], [50, { hill: 3000 }], [60, { curve: 5, hill: -3000 }], [80, {}], [60, { curve: -5 }], [50, { curve: 2 }]]);
  stretch(4, [[60, {}], [60, { curve: 4 }], [50, { curve: -4 }], [80, { hill: 1000 }], [60, {}], [40, {}]]);
  const GOAL = (road.segs.length - 30) * SEG, CHECKS = AT.slice(1).map(s => s * SEG);
  // the scenery: each area's own, both sides, a checkpoint arch at each area's start, the goal's
  const PALM = E.prop('palm').frames[0], ROCK = E.prop('rock', { size: 2 }).frames[0], CACTUS = E.prop('cactus').frames[0], TREE = E.prop('tree').frames[0];
  const bldg = (w, h, col, lit) => ({ w, draw(g, x, y, s) { const W = w * s, H = h * s; if (W < 1) return; E.px.rect(g, x - W / 2, y - H, W, H, col); if (W > 6) for (let yy = 4 * s; yy < H - 4 * s; yy += 10 * s * 4) for (let xx = -W / 2 + 4 * s * 4; xx < W / 2 - 4 * s * 4; xx += 12 * s * 4) E.px.rect(g, x + xx, y - H + yy, Math.max(1, 5 * s * 4), Math.max(1, 5 * s * 4), lit); } });
  const sign = text => ({ w: 600, draw(g, x, y, s) { const W = 600 * s, H = 300 * s; if (W < 2) return; E.px.rect(g, x - W * .04, y - H * 2, W * .08, H * 2, '#606068'); E.px.rect(g, x - W / 2, y - H * 2.4, W, H, '#f0e0a0'); if (W > 40) E.font.text(g, text, Math.round(x), Math.round(y - H * 2.1), '#c03020', { align: 'center', outline: false }); } });
  const arch = (text, col) => ({ w: 0, draw(g, x, y, s) { const W = 2600 * s, H = 1500 * s; if (W < 3) return; for (const sx of [-1, 1]) E.px.rect(g, x + sx * W - 40 * s, y - H, 80 * s, H, '#e0e0e8'); E.px.rect(g, x - W, y - H, W * 2, H * .2, col); if (W > 60) E.font.text(g, text, Math.round(x), Math.round(y - H * .93), '#ffffff', { align: 'center', outline: false, scale: W > 400 ? 2 : 1 }); } });
  for (let z = 0; z < road.length; z += SEG * 4) {
    const a = AREAS.findIndex((_, i) => i === AREAS.length - 1 || z < AT[i + 1] * SEG), side = (z / SEG / 4) % 2 ? 1 : -1, r = (z * 7919) % 100;
    if (road.seg(z).tunnel) continue;
    if (a === 0) road.place(z, side * (1.5 + r / 200), PALM, 50);
    else if (a === 1) road.place(z, side * (1.6 + r / 150), r < 50 ? TREE : ROCK, 60);
    else if (a === 2) road.place(z, side * 1.7, ROCK, 70);
    else if (a === 3) road.place(z, side * (1.5 + r / 120), r < 70 ? CACTUS : ROCK, 60);
    else road.place(z, side * (2 + r / 200), bldg(900 + r * 8, 1600 + r * 30, ['#2a2a4a', '#3a2a4a', '#2a3a4a'][r % 3], '#ffd870'), 1);
    if (r < 12) road.place(z + SEG * 2, -side * 1.4, sign(['SLOW', 'GOAL', 'TURN'][r % 3]), 1);
  }
  CHECKS.forEach((z, i) => road.place(z, 0, arch('CHECKPOINT', '#2a8a3a'), 1));
  road.place(GOAL, 0, arch('GOAL', '#d02a2a'), 1);
  const SONGS = [
    { name: 'SEA BREEZE', bpm: 132, steps: 4, tracks: [
      { wave: 'square', vol: .06, notes: 'E5 . G5 A5 . G5 E5 D5 | C5 . D5 E5 . . . . | E5 . G5 A5 . B5 A5 G5 | A5 . G5 E5 . . D5 .' },
      { wave: 'triangle', vol: .26, notes: 'A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . | C3 . C4 . C3 . C4 . | G2 . G3 . G2 . G3 .' },
      { wave: 'drums', vol: .07, notes: 'k . h . s . h k k . h . s . h h' }] },
    { name: 'SUNSET DRIVE', bpm: 112, steps: 4, tracks: [
      { wave: 'pulse12', vol: .06, notes: 'D5 - - F5 E5 - D5 - | C5 - - - A4 - - - | D5 - - F5 A5 - G5 - | F5 - E5 - D5 - - -' },
      { wave: 'triangle', vol: .26, notes: 'D3 . . D3 . . A2 . | F2 . . F2 . . C3 . | G2 . . G2 . . D3 . | A2 . . A2 . . C3 .' },
      { wave: 'drums', vol: .06, notes: 'k . . h s . . h k . k h s . . h' }] },
    { name: 'NEON HIGHWAY', bpm: 150, steps: 4, tracks: [
      { wave: 'square', vol: .05, notes: 'A4 A5 E5 A4 G5 E5 C5 G4 | F4 F5 C5 F4 E5 C5 A4 E4 | G4 G5 D5 G4 F5 D5 B4 F4 | E4 E5 B4 E4 G#5 E5 B4 G#4' },
      { wave: 'triangle', vol: .26, notes: 'A1 A2 A1 A2 A1 A2 A1 A2 | F1 F2 F1 F2 F1 F2 F1 F2 | G1 G2 G1 G2 G1 G2 G1 G2 | E1 E2 E1 E2 E1 E2 E1 E2' },
      { wave: 'drums', vol: .07, notes: 'k h s h k h s h k h s h k k s h' }] }];
  const SKIES = {}; const skyOf = n => SKIES[n] || (SKIES[n] = new E.Backdrop(n));

  /* ---- THE DRIVE ---- */
  const MAX = [190, 293], ACC = [130, 75], H = 1000;   // km/h by gear (low, high); the camera over the road
  let mode = 'radio', song = 0, z = 0, x = 0, speed = 0, gear = 0, clock = 60, turn = 0, crash = 0, bump = 0, banner = null, score = 0, reached = 0, traffic = [], t = 0, endT = 0, area = 0;
  const ahead = road.ahead(H), kmh = () => Math.round(speed);
  function begin() {
    mode = 'drive'; z = 0; x = 0; speed = 0; gear = 0; clock = 60; turn = 0; crash = 0; bump = 0; score = 0; reached = 0; t = 0; endT = 0; area = 0; banner = { text: AREAS[0].name, t: 0 };
    traffic = []; for (let i = 0; i < 26; i++) traffic.push({ z: 3000 + i * 4200 + (i * 977) % 1800, x: [-.66, 0, .66][i % 3], v: 80 + (i * 37) % 70, col: ['#3060d0', '#e0e0e0', '#30a050', '#e0b020', '#a03070'][i % 5], w: 380, draw: carBack });
    A.music(SONGS[song]); game.input.consumeAll();
  }
  // a car from behind: its body, rear window, tail lights and tyres, scale pixels a unit
  function carBack(g, sx, sy, s) {
    const W = this.w * s, Hh = W * .45; if (W < 2) return;
    E.px.rect(g, sx - W / 2, sy - Hh, W, Hh * .7, this.col); E.px.rect(g, sx - W * .35, sy - Hh * 1.25, W * .7, Hh * .55, E.shade(this.col, -.3));
    E.px.rect(g, sx - W * .3, sy - Hh * 1.15, W * .6, Hh * .35, '#a0c8e0'); E.px.rect(g, sx - W / 2, sy - Hh * .3, W * .18, Hh * .3, '#1a1a1a'); E.px.rect(g, sx + W * .32, sy - Hh * .3, W * .18, Hh * .3, '#1a1a1a');
    if (W > 8) { E.px.rect(g, sx - W * .45, sy - Hh * .6, W * .12, Hh * .12, '#ff3020'); E.px.rect(g, sx + W * .33, sy - Hh * .6, W * .12, Hh * .12, '#ff3020'); }
  }
  function update(dt) {
    const I = game.input; t += dt;
    for (const k of ['brake', 'gear']) I.touchSet(k, k === 'gear' ? (gear ? 'HIGH' : 'LOW') : null, mode === 'drive');
    if (mode === 'radio') {
      if (I.pressed('left') || I.pressed('right')) { song = (song + (I.pressed('left') ? 2 : 1)) % 3; A.music(SONGS[song]); A.sfx('select'); }
      const tap = I.clicked && I.clicked(); if (tap) { const k = Math.floor(tap[0] / (game.W / 3)); if (k === song) begin(); else { song = clamp(k, 0, 2); A.music(SONGS[song]); A.sfx('select'); } }
      if (I.pressed('confirm') || I.pressed('gas')) { A.sfx('confirm'); begin(); }
      return;
    }
    if (mode === 'over' || mode === 'goal') { endT += dt; if (endT > 1.5 && (I.pressed('confirm') || I.pressed('gas') || (I.clicked && I.clicked()))) { mode = 'radio'; A.sfx('confirm'); } speed = Math.max(0, speed - 120 * dt); z += speed * dt * 12; return; }
    if (banner) { banner.t += dt; if (banner.t > 2.5) banner = null; }
    // the clock: each checkpoint passed gives time; none left, the game is over
    clock -= dt; if (clock <= 0) { clock = 0; mode = 'over'; endT = 0; A.music(null); A.sfx('die'); }
    if (reached < CHECKS.length && z + ahead >= CHECKS[reached]) { reached++; clock += 40; area = reached; banner = { text: AREAS[area].name, t: 0, check: true }; A.sfx('oneup'); score += 5000; }
    if (z + ahead >= GOAL) { mode = 'goal'; endT = 0; score += Math.round(clock) * 1000; A.music(null); A.sfx('secret'); }
    if (I.pressed('gear')) { gear = 1 - gear; A.sfx('select', { vol: .5 }); }
    const auto = I.lastDevice === 'touch', gas = I.down('gas') || auto, brake = I.down('brake') || I.move()[1] > .7, off = Math.abs(x) > 1.05, steer = I.move()[0];
    // speed: the gear's pull and top, the shoulder's drag, a crash's stop
    if (crash > 0) { crash -= dt; speed = Math.max(0, speed - 400 * dt); x += (Math.sign(x) * .5 - x) * Math.min(1, dt * 3); }   // (a crash: it spins to a stop and is put back on the road)
    else {
      const top = MAX[gear] * (off ? .45 : 1);
      if (gas && speed < top) speed = Math.min(top, speed + ACC[gear] * (gear && speed < 100 ? .5 : 1) * dt);
      else if (speed > top) speed = Math.max(top, speed - 150 * dt);
      if (brake) speed = Math.max(0, speed - 220 * dt);
      if (!gas && !brake) speed = Math.max(0, speed - 30 * dt);
    }
    const pct = speed / MAX[1], dz = speed * 12 * dt;   // (km/h to road units: 290 km/h about 3,500 a second)
    x += steer * dt * 2.4 * (pct > .02 ? Math.min(1, pct * 2) : 0);
    x -= road.curveAt(z + ahead) * pct * pct * dt * .7;   // a bend throws it outward (the hardest faster than it steers: slow for them)
    x = clamp(x, -2.4, 2.4); z += dz; turn += road.curveAt(z) * dz * .004;
    score += Math.round(dz * .02);
    // the scenery stops it; the traffic bumps it
    if (crash <= 0 && Math.abs(x) > 1.2 && road.hits(z + ahead, x, .25).length && speed > 10) { crash = 1.2; speed *= .2; A.sfx('explode', { vol: .6 }); game.shake(.4); }
    for (const c of traffic) {
      c.z += c.v * 12 * dt; if (c.z > road.length) c.z -= road.length;
      if (bump <= 0 && Math.abs(c.z - (z + ahead)) < 260 && Math.abs(c.x - x) < .38) { bump = .6; speed = Math.min(speed, c.v * .6); x += x < c.x ? -.3 : .3; A.sfx('bump'); game.shake(.2); }
    }
    bump -= dt;
  }
  // the car, drawn by code from behind at the screen's bottom: leaning into a steer, bouncing on rough ground
  function drawCar(g, sx, sy, s, steer, rough) {
    const W = 64 * s, Hh = 26 * s, lean = steer * 3 * s, b = rough ? Math.round(Math.sin(t * 40)) * s : 0, y = sy + b;
    E.px.ell(g, sx, y - 1, W * .55, 5 * s, 'rgba(0,0,0,.35)');
    E.px.poly(g, [[sx - W / 2, y - Hh * .2], [sx - W / 2 + 4 * s + lean, y - Hh], [sx + W / 2 - 4 * s + lean, y - Hh], [sx + W / 2, y - Hh * .2]], '#d82020');
    E.px.rect(g, sx - W / 2, y - Hh * .45, W, Hh * .3, '#a81818'); E.px.rect(g, sx - W * .42, y - Hh * .38, W * .14, 4 * s, '#ff4030'); E.px.rect(g, sx + W * .28, y - Hh * .38, W * .14, 4 * s, '#ff4030');
    E.px.rect(g, sx - W * .1, y - Hh * .38, W * .2, 4 * s, '#e8e8e8');
    for (const k of [-1, 1]) E.px.rect(g, sx + k * W * .36 - 6 * s, y - Hh * .15, 12 * s, Hh * .25, '#141414');
    for (const [k, hair] of [[-.18, '#3a2010'], [.18, '#e8c050']]) { E.px.disc(g, sx + W * k + lean, y - Hh - 6 * s, 5 * s, '#e8b088'); E.px.disc(g, sx + W * k + lean, y - Hh - 8 * s, 5 * s, hair); }
    E.px.rect(g, sx - W * .3 + lean, y - Hh * 1.05, W * .6, 2 * s, '#c8d8e8');   // the windscreen's top
  }
  function draw(r) {
    const W = r.W, Hs = r.H, I = game.input;
    road.o.sky = skyOf(AREAS[mode === 'radio' ? 0 : area].sky);
    const cz = mode === 'radio' ? (t * 1600) % road.length : z;
    road.draw(r, { z: cz, x: mode === 'radio' ? 0 : x, h: H, turn, cars: traffic });
    r.overlay(g => {
      if (mode === 'radio') {
        E.font.title(g, 'ROAD', W / 2, 26, { scale: 4, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8402a'] });
        E.font.text(g, 'PICK A SONG', W / 2, Hs / 2 - 30, '#ffffff', { align: 'center', shadow: '#000', outline: false });
        SONGS.forEach((s, k) => { const xx = Math.round(W * (k + .5) / 3); E.ui.box(g, xx - 46, Hs / 2 - 14, 92, 26, { bg: k === song ? '#3a2a6a' : '#141a3a', border: k === song ? '#ffe04a' : '#8888aa' }); E.font.text(g, s.name, xx, Hs / 2 - 4, k === song ? '#ffe04a' : '#c8c8e0', { align: 'center', outline: false, font: 'tiny' }); });
        E.font.text(g, (touch() ? 'TAP A SONG, TAP IT AGAIN TO DRIVE' : 'LEFT / RIGHT, THEN ' + I.label('confirm')), W / 2, Hs / 2 + 24, '#ffd080', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
        return;
      }
      const p = road.project(z + ahead, x, 0), cs = Math.max(.6, Hs / 200);
      if (p) { drawCar(g, p[0], p[1], cs, crash > 0 ? Math.sin(crash * 18) * 1.5 : I.move()[0], Math.abs(x) > 1.05 && speed > 20); if (crash > 0) { const al = g.globalAlpha; g.globalAlpha = .7; for (let k = 0; k < 4; k++) E.px.disc(g, p[0] + Math.sin(t * 7 + k * 2) * 16 * cs, p[1] - (12 + k * 6 + (t * 30 % 6)) * cs, (3 + k * 1.5) * cs, k % 2 ? '#d8d8d8' : '#a8a8b0'); g.globalAlpha = al; } }
      // the HUD: the clock, the speed and gear, the score, the stage's progress
      E.font.text(g, 'TIME', W / 2, 4, '#ffe04a', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
      E.font.text(g, String(Math.ceil(clock)), W / 2, 12, clock < 10 && Math.floor(t * 4) % 2 ? '#ff4030' : '#ffffff', { align: 'center', scale: 3, shadow: '#000', outline: false });
      E.font.text(g, 'SCORE ' + score, 6, 6, '#ffffff', { shadow: '#000', outline: false, font: 'tiny' });
      const bx = Math.min(cornerX(), W) - 6; E.font.text(g, kmh() + ' KM/H', bx, Hs - 26, '#ffffff', { align: 'right', scale: 2, shadow: '#000', outline: false });
      E.font.text(g, gear ? 'HIGH' : 'LOW', bx, Hs - 10, gear ? '#ff9a3a' : '#5ae05a', { align: 'right', shadow: '#000', outline: false, font: 'tiny' });
      const pw = Math.min(120, W / 3), px0 = 6, py = 16; E.px.rect(g, px0, py, pw, 3, '#203050'); E.px.rect(g, px0, py, pw * Math.min(1, (z + ahead) / GOAL), 3, '#ffe04a');
      for (const c of CHECKS) E.px.rect(g, px0 + pw * c / GOAL, py - 1, 1, 5, '#5ae05a');
      if (banner) E.font.text(g, (banner.check ? 'EXTENDED PLAY! ' : '') + banner.text, W / 2, Hs * .3, banner.check ? '#5ae05a' : '#ffffff', { align: 'center', scale: 2, shadow: '#000', outline: false });
      if (mode === 'over' || mode === 'goal') {
        E.font.title(g, mode === 'goal' ? 'GOAL!' : 'GAME OVER', W / 2, Hs * .3, { scale: 3, align: 'center', colors: mode === 'goal' ? ['#fff6d0', '#ffd060', '#e8782a'] : ['#ffffff', '#ff8a6a', '#c0302a'] });
        E.font.text(g, 'SCORE ' + score + '   DISTANCE ' + Math.round((z + ahead) / GOAL * 100) + '%', W / 2, Hs * .3 + 30, '#ffffff', { align: 'center', shadow: '#000', outline: false });
        if (endT > 1.5) E.font.text(g, prompt('confirm', 'TO DRIVE AGAIN'), W / 2, Hs * .3 + 44, '#ffd080', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
      }
    });
  }

  /** the bot (tools/kits-test.mjs): drives the stage by the keys, steering for the road's middle ahead and round the
   *  traffic, in high gear once moving, to the goal */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s); const I = game.input, held = new Set(), hold = (a, on) => { if (on && !held.has(a)) { held.add(a); I.hold(a); } else if (!on && held.has(a)) { held.delete(a); I.hold(a, false); } };
    try {
      game.go('road', null, { fade: 0 }); game.advance(1 / 120); song = 0; begin(); hold('gas', true);
      let n = 0, crashes = 0, was2 = 0;
      for (; n < 120 * 400 && mode === 'drive'; n++) {
        if (speed > 120 && !gear) { I.tap('gear'); }
        const bend = road.curveAt(z + ahead + 1500); let want = bend * .1;   // (a little inside a bend: it throws you outward)
        for (const c of traffic) { const dz = c.z - (z + ahead); if (dz > -200 && dz < 2400 && Math.abs(c.x - want) < .45) want = c.x > 0 ? c.x - .7 : c.x + .7; }
        hold('right', x < want - .05); hold('left', x > want + .05); hold('brake', Math.abs(bend) > 3.6 && speed > 230);
        game.advance(1 / 120); if (crash > 0 && !was2) crashes++; was2 = crash > 0;
      }
      return { mode, goal: mode === 'goal', checkpoints: reached, clock: Math.round(clock), score, crashes, seconds: Math.round(n / 120), errors: game.errors.length };
    } finally { for (const a of [...held]) hold(a, false); Math.random = was; }
  }

  return { view: 'side', views: ['side'], input: KEYS, res: 'ps1', pausable: true, touch: ['brake', 'gear'], camera: { zoom: false },
    enter(d) {
      game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false; t = 0;
      if (d && d.part) begin(); else { mode = 'radio'; A.music(SONGS[song]); }
    },
    back() { if (mode === 'drive') return false; if (mode !== 'radio') { mode = 'radio'; return true; } game.go('title'); return true; },
    update, draw, bot,
    state: () => ({ mode, z: Math.round(z), x: +x.toFixed(3), speed: Math.round(speed), gear, clock: +clock.toFixed(2), reached, score }),   // for tests
    /** the proof: the drive, the gas held, high gear, steering through the first bends; a hash of the run */
    run: (n = 600) => proof('road', n, (i, k) => {
      if (i === 2) begin();
      if (i === 4) k.hold('gas');
      if (i === 200) k.tap('gear');
      if (i === 300) k.hold('left'); if (i === 340) k.up('left');
      if (i === 450) k.hold('right'); if (i === 520) k.up('right');
    }, () => [z, x, speed, gear, clock, traffic.map(c => c.z)], () => { game.input.lastDevice = 'keyboard'; }) };   // (fresh: the gas by itself follows the device, which the proof's holds turn to touch)
})();
scenes.road = ROAD;
