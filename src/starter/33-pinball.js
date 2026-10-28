/* =====================================================================================
 * SLICE 19  PINBALL  (Pinball Fantasies, Devil's Crush, Space Cadet). @modules physics arcade
 * NEBULA RUN: one table in a steep view that scrolls as the ball climbs (a phone held upright shows it whole). Two
 * flippers, three bumpers, two slingshots, a ramp that rises over the table, a bank of three drop targets, a spinner in
 * the left orbit, three top lanes, a kickback in the left outlane, a saucer, a plunger lane with its one-way gate.
 * The mission: knock down the targets (the ramp lights), shoot the ramp three times (the jackpot lights), sink the
 * saucer: JACKPOT, and STAR STORM multiball. A ball saver after each launch, nudging and TILT, a dot-matrix display
 * drawn by code, the bonus counted at each drain, three balls, the arcade module's high-score table and initials.
 * Keys: Left Shift / Z / left arrow the left flipper, Right Shift / M / right arrow the right; hold Space or down to
 * pull the plunger, let go to fire; N or up nudges; Enter starts. TOUCH: each half of the screen flips its side; a
 * swipe up (or a hold) fires the plunger. HOW IT WORKS: E.Physics (the physics module) is the table: chains for the
 * walls, flippers, bumpers, slingshots and kickers its helpers, the ramp a layer of its own the ball switches to at its
 * mouth; the ball a swept bullet, so it never passes through. E.Arcade keeps the score, the balls and the table. bot()
 * plays a ball by the flipper keys (tools/kits-test.mjs). Deep link: #pinball.
 * ===================================================================================== */
const PINBALL = (() => {
  const TW = 240, TL = 520, BR = 5, TAU = Math.PI * 2, px = E.px, mx = x => 222 - x;   // (the playfield is 8..214 wide: mx mirrors it)
  E.VIEWS.pinball = E.VIEWS.pinball || new E.View('pinball', 'Table', 0, 62, 1, 1);
  const V = E.VIEWS.pinball, BY = V.by, BZ = V.bz;   // (a table point (x, y, z) is r.w(x, y, z) on the screen)
  // a driving tune in E minor (the step sequencer's format)
  const SONG = { bpm: 138, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'E5 . G5 . B5 . E6 - D6 . B5 . G5 . A5 . | B5 - - . A5 . G5 . F#5 . D5 . E5 - - . | C5 . E5 . G5 . C6 - B5 . G5 . E5 . F#5 . | G5 . F#5 . E5 . D#5 . E5 - - - - . . .' },
    { wave: 'triangle', vol: .3, notes: 'E2 E3 E2 E3 E2 E3 E2 E3 | G2 G3 G2 G3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | B1 B2 B1 B2 E2 E3 E2 E3' },
    { wave: 'drums', vol: .11, notes: 'k . h . s . h k k . h . s . h h' }] };
  const KEYS = Object.assign({}, E.Input.DEFAULT, { flipL: ['ShiftLeft', 'KeyZ', 'ArrowLeft', 'KeyA', 'Pad4', 'Pad6', 'Pad14'], flipR: ['ShiftRight', 'KeyM', 'Slash', 'ArrowRight', 'KeyD', 'Pad5', 'Pad7', 'Pad15'],
    plunge: ['Space', 'ArrowDown', 'KeyS', 'Pad0', 'Pad13'], nudge: ['KeyN', 'KeyX', 'ArrowUp', 'KeyW', 'Pad3', 'Pad12'] });

  /* ---- 1. THE TABLE: its bodies in the physics world, in table units (x across, y down the table toward the flippers) ---- */
  const RAMP = [[176, 300], [178, 190], [162, 122], [111, 94], [60, 122], [44, 190], [40, 300]];   // the ramp's middle line
  const rampZ = s => 26 * Math.sin(Math.PI * Math.min(1, Math.max(0, s)));   // its height along its length (0..1)
  const WALLS = [], RAILS = [];   // (the painted rails: [points, closed])
  let world, F = {}, balls, drops, lanes, lights;
  function table() {
    world = new E.Physics({ gravity: [0, 450], substeps: 4, iterations: 8, sleep: false, on: { hit, enter, exit, catch: caught } });
    const chain = (P, o = {}) => { WALLS.push(...world.chain(P, Object.assign({ r: 1.5, bounce: .3, friction: .2 }, o))); RAILS.push(P); };
    WALLS.length = RAILS.length = 0;
    // the cabinet: the left wall, the arch over the top, the right wall; the plunger lane's inner wall; the floor below
    const arch = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + i / 24 * Math.PI; arch.push([120 + Math.cos(a) * 112, 130 + Math.sin(a) * 112]); }
    chain([[8, 505], ...arch, [232, 505]]);
    chain([[214, 505], [214, 152]]);
    world.segment([0, 560], [240, 560]);
    F.stop = world.segment([215, 494], [231, 494], { r: 1 });   // (the plunger's tip: the ball rests on it)
    F.gate = world.segment([214, 152], [228, 134], { r: 1.5 }); F.gate.off = true;   // (one way: closed once the ball is out)
    // the lower table: inlane guides, slingshots (their long faces kick), the flippers, the kickback in the left outlane
    chain([[22, 330], [22, 418], [63, 442]]); chain([[mx(22), 330], [mx(22), 418], [mx(63), 442]]);
    chain([[34, 360], [34, 402], [58, 418]]); chain([[mx(34), 360], [mx(34), 402], [mx(58), 418]]);
    F.slingL = world.slingshot([34, 360], [58, 418], { kick: 230 }); F.slingR = world.slingshot([mx(34), 360], [mx(58), 418], { kick: 230 });
    F.L = world.flipper(70, 448, { side: 'left', len: 36, r0: 6, r1: 3.5, speed: 32 }); F.R = world.flipper(mx(70), 448, { side: 'right', len: 36, r0: 6, r1: 3.5, speed: 32 });
    F.kick = world.kicker(15, 472, { r: 6, hold: .35, dir: [0, -1], power: 820 });
    // the upper table: the left orbit's inner wall, three bumpers, the top lanes' posts, the saucer, the drop targets
    chain([[26, 300], [26, 158]]);
    F.bumpers = [[78, 150], [144, 150], [111, 192]].map(([x, y]) => Object.assign(world.bumper(x, y, 11, { kick: 300 }), { lit: 0 }));
    for (const x of [70, 98, 126, 154]) world.circle(x, 62, 3, { type: 'static', bounce: .4 });
    lanes = [84, 112, 140].map(x => ({ s: world.circle(x, 68, 5, { type: 'static', sensor: true }), on: false }));
    F.saucer = world.kicker(111, 102, { r: 6, hold: .9, dir: [.35, .94], power: 330 });
    drops = [224, 243, 262].map(y => ({ b: world.box(192, y, 5, 14, { type: 'static', bounce: .2 }), down: false }));
    F.spinner = world.box(17, 236, 16, 3, { type: 'static', sensor: true }); F.spin = 0; F.spinA = 0;
    F.laneTop = world.circle(170, 34, 10, { type: 'static', sensor: true });
    // the ramp: two rails on a layer of their own (2), a sensor at its mouth and its end on both layers
    const side = k => RAMP.map(([x, y], i) => { const a = RAMP[Math.max(0, i - 1)], b = RAMP[Math.min(RAMP.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [x - dy / l * 8 * k, y + dx / l * 8 * k]; });
    for (const k of [1, -1]) world.chain(side(k), { layer: 2, r: 1, bounce: .2, friction: .1 });
    F.rampIn = world.circle(176, 296, 6, { type: 'static', sensor: true, layer: 3 }); F.rampOut = world.circle(40, 304, 7, { type: 'static', sensor: true, layer: 3 });
  }

  /* ---- 2. THE RULES: scoring, the mission, the ball saver, multiball, tilt, the end of each ball ---- */
  let cab, mode = 'title', modeT = 0, st, dmd = { msg: null }, bot = null, demo = false, plungeT = 0, swipe = 0, camY = 0;
  const fresh = () => ({ ball: 1, rampLit: false, ramps: 0, jackLit: false, jackpots: 0, mult: 1, kickLit: true, saveT: 0, tilt: 0, tilted: false, spins: 0, hits: 0, targets: 0, laneHits: 0, bonus: 0, flips: 0, inLane: true, gameT: 0, multi: false });
  const add = (n, b) => { if (!st.tilted && cab) cab.add(n, b ? { x: b.x, y: b.y, z: 14 } : null); };
  const say = (s, t = 2, big) => { dmd.msg = { s, t, big }; };
  function newBall(lane = true) {
    const b = world.circle(223, 488, BR, { bullet: true, bounce: .35, friction: .25, maxSpeed: 1600 }); b.z = 0; b.onRamp = false; balls.push(b);
    if (lane) { st.inLane = true; F.gate.off = true; }
    return b;
  }
  function hit(a, b, info) {
    const o = a.shape === 'circle' && a.type === 'dynamic' ? b : a;
    if (F.bumpers.includes(o)) { o.lit = .15; add(100, o); st.hits++; A.sfx('kick', { vol: .5, pitch: 1 + (F.bumpers.indexOf(o)) * .12 }); P.sparks(o.x, o.y, 10, 6); return; }
    if (o === F.slingL || o === F.slingR) { o.lit = .12; add(10); A.sfx('punch', { vol: .35 }); return; }
    if (o === F.L || o === F.R) return;
    const d = drops.find(t => t.b === o); if (d && !d.down) { d.down = true; d.b.off = true; add(500, d.b); st.targets++; A.sfx('bump'); if (drops.every(t => t.down)) { st.rampLit = true; add(5000); say('RAMP LIT', 2); A.sfx('powerup'); modeT = 0; dropsUp = 2.5; } return; }
    if (info && info.speed > 160) A.sfx('land', { vol: Math.min(.4, info.speed / 1500) });
  }
  let dropsUp = 0;
  function enter(s, b) {
    if (s === F.rampIn && !b.onRamp && b.vy < -120) { b.onRamp = true; b.layer = 2; b.mask = 2; A.sfx('whoosh', { vol: .3 }); return; }
    if (s === F.rampOut && b.onRamp) { b.onRamp = false; b.layer = 1; b.mask = 0xffff; ramp(b); return; }
    const l = lanes.find(q => q.s === s); if (l) { if (!l.on) { l.on = true; add(1000, b); A.sfx('blip'); st.laneHits++; } if (lanes.every(q => q.on)) { lanes.forEach(q => { q.on = false; }); st.mult = Math.min(5, st.mult + 1); st.kickLit = true; F.kick.catch.armed = true; say('BONUS ' + st.mult + 'X', 2); A.sfx('oneup'); } return; }
    if (s === F.laneTop && st.inLane) { st.inLane = false; F.gate.off = false; st.saveT = 8; return; }
    if (s === F.spinner) { const n = Math.min(12, Math.floor(Math.abs(b.vy) / 60)); F.spin += n; st.spins += n; add(50 * n); if (n) A.sfx('blip', { vol: .2, pitch: 1.6 }); return; }
  }
  function exit(s, b) { if (s === F.rampIn && b.onRamp && b.vy > 0) { b.onRamp = false; b.layer = 1; b.mask = 0xffff; } }   // (it fell back down the ramp)
  function ramp(b) {
    add(st.rampLit ? 10000 : 5000, b); A.sfx('powerup'); P.glints(b.x, b.y, 10, 10, '#a8f0ff', 14);
    if (st.rampLit) { st.ramps++; if (st.ramps >= 3) { st.jackLit = true; st.rampLit = false; st.ramps = 0; say('JACKPOT LIT', 2.5); } else say('WARP ' + st.ramps, 1.5); } else say('RAMP', 1);
  }
  function caught(k, b) {
    if (k === F.kick) { st.kickLit = false; k.catch.armed = false; say('KICKBACK', 1.5); A.sfx('whoosh'); return; }
    if (k === F.saucer) {
      add(2500, b); A.sfx('secret');
      if (st.jackLit) { st.jackLit = false; st.jackpots++; add(50000, b); say('JACKPOT', 3, true); A.sfx('oneup'); game.flash('#ffffff', .25); P.glints(k.x, k.y, 30, 30, '#ffe080', 20);
        if (!st.multi) { st.multi = true; say('STAR STORM', 3, true); for (let i = 0; i < 2; i++) { const nb = newBall(false); nb.x = 111 + (i ? 10 : -10); nb.y = 140; nb.vy = 200; nb.vx = i ? 120 : -120; } st.saveT = 10; } }
    }
  }
  function drain(b) {
    world.remove(b); balls.splice(balls.indexOf(b), 1);
    if (balls.length) { if (balls.length === 1) st.multi = false; return; }
    if (st.saveT > 0 && !st.tilted) { say('BALL SAVED', 2); A.sfx('heal'); newBall(); return; }
    A.sfx('die'); st.multi = false;
    const bonus = (st.spins * 20 + st.hits * 50 + st.targets * 300 + st.laneHits * 400) * st.mult;
    mode = 'bonus'; modeT = 0; st.bonus = st.tilted ? 0 : bonus;
  }
  function nextBall() {
    if (st.bonus) add(st.bonus); st.bonus = 0; st.spins = st.hits = st.targets = st.laneHits = 0; st.mult = 1; st.tilted = false; st.tilt = 0;
    const r = cab.die();
    if (r === 'over') { over(); return; }
    st.ball++; mode = 'play'; modeT = 0; say('BALL ' + st.ball, 1.5); newBall();
  }
  function over() {
    mode = 'over'; modeT = 0; A.music(null); say('GAME OVER', 4, true);
    const s = cab.p.score; if (!demo && cab.qualifies(s)) { mode = 'entry'; cab.enter(s, '', () => { mode = 'table'; modeT = 0; }); }
  }

  /* ---- 3. THE SCENE: the title (the table lit, the display's attract loop, a demo by the bot), play, the bonus, the
   * initials and the table ---- */
  function start() {
    table(); balls = []; st = fresh(); demo = false; bot = null; mode = 'title'; modeT = 0; camY = TL / 2;
    cab = cab || new E.Arcade(game, { id: 'pinball', lives: 3, extra: [500000], hud: false, colors: ['#ff9a40', '#ffe0a0', '#ffd040'] });
    cab.mode = 'title'; cab.phase = 'title';
    game.input.touchEnabled = false; game.input.zones = null; L.enabled = false; game.follow(null); A.music(null);
  }
  function begin(asDemo) {
    table(); balls = []; st = fresh(); demo = !!asDemo; cab.start(1, { demo }); mode = 'play'; modeT = 0; newBall(); say('BALL 1', 1.5); if (!demo) A.music(SONG);
  }
  function update(dt) {
    const I = game.input; modeT += dt; if (dmd.msg && (dmd.msg.t -= dt) <= 0) dmd.msg = null;
    cab.update(dt);
    if (mode === 'title') {
      game.input.zones = null;
      const ph = cab.attract(dt);
      if (I.pressed('start') || I.pressed('plunge') || I.clicked()) { I.consumeAll(); begin(false); return; }
      if (ph === 'demo' && !demo) { begin(true); bot = { t: 0 }; }
      world.step(dt); return;
    }
    if (mode === 'entry') return;
    if (mode === 'table' || mode === 'over') { if (modeT > (mode === 'table' ? 6 : 3) || (modeT > 1 && (I.pressed('start') || I.clicked()))) { mode = 'title'; modeT = 0; cab.mode = 'title'; cab.phase = 'title'; demo = false; } world.step(dt); return; }
    if (mode === 'bonus') { if (modeT > 2.4) nextBall(); return; }
    if (demo && (I.pressed('start') || I.clicked())) { I.consumeAll(); begin(false); return; }
    st.gameT += dt; if (st.saveT > 0 && !st.inLane) st.saveT -= dt; st.tilt = Math.max(0, st.tilt - dt * .6);
    // the controls: the flipper keys (or the screen's halves), the plunger, the nudge
    const ctl = bot ? botControls(dt) : { l: I.down('flipL'), r: I.down('flipR'), p: I.down('plunge'), pDone: I.released ? I.released('plunge') : false, n: I.pressed('nudge') };
    if (!st.tilted) { if (ctl.l !== F.L._on) { F.L.flip(ctl.l); F.L._on = ctl.l; if (ctl.l) { st.flips++; A.sfx('swing', { vol: .3 }); } } if (ctl.r !== F.R._on) { F.R.flip(ctl.r); F.R._on = ctl.r; if (ctl.r) { st.flips++; A.sfx('swing', { vol: .3, pitch: 1.1 }); } } }
    else { F.L.flip(false); F.R.flip(false); F.L._on = F.R._on = false; }
    game.input.zones = !bot && game.input.lastDevice === 'touch' ? (lanePlunge() ? [{ x0: 0, y0: 0, x1: 1, y1: 1, act: 'plunge' }] : [{ x0: 0, y0: 0, x1: .5, y1: 1, act: 'flipL' }, { x0: .5, y0: 0, x1: 1, y1: 1, act: 'flipR' }]) : null;
    if (lanePlunge()) {
      const pan = I.pan(); if (pan && ctl.p) swipe = Math.max(swipe, swipe - pan[1]);
      if (ctl.p) plungeT = Math.min(1, plungeT + dt * 1.2);
      else if (plungeT > 0 || swipe > 0) { const k = Math.max(plungeT, Math.min(1, swipe / 70)), b = lanePlunge(); b.vy = -(380 + 560 * k); plungeT = 0; swipe = 0; A.sfx('whoosh'); }
    } else { plungeT = 0; swipe = 0; }
    if (ctl.n && balls.length) { for (const b of balls) { b.vx += (b.x < 111 ? 1 : -1) * 40; b.vy -= 60; } st.tilt += 1.2; game.shake(.15, 3); A.sfx('bump', { vol: .4 }); if (st.tilt > 3.5 && !st.tilted) { st.tilted = true; say('TILT', 4, true); A.sfx('cancel'); } else if (st.tilt > 2.2) say('DANGER', 1); }
    // the world, then what left it
    world.step(dt);
    for (const b of balls.slice()) { if (b.y > 515) drain(b); }
    if (dropsUp > 0 && (dropsUp -= dt) <= 0) { if (balls.every(b => b.x < 180 || b.y < 210 || b.y > 280)) for (const d of drops) { d.down = false; d.b.off = false; } else dropsUp = .5; }
    for (const o of F.bumpers) o.lit = Math.max(0, o.lit - dt); for (const o of [F.slingL, F.slingR]) o.lit = Math.max(0, (o.lit || 0) - dt);
    F.spinA += F.spin * dt * 30; F.spin = Math.max(0, F.spin - dt * 6);
    for (const b of balls) b.z = b.onRamp ? rampZ(rampAt(b)) : 0;
    if (demo && (balls.length === 0 || modeT > 40)) { cab.endDemo && cab.endDemo(); }
  }
  // the ball resting in the plunger lane, ready (or null)
  const lanePlunge = () => st.inLane && balls.find(b => b.x > 214 && b.y > 470 && Math.abs(b.vy) < 30) || null;
  // how far along the ramp a ball is (0..1): the nearest point of its middle line
  function rampAt(b) { let best = 1e9, s = 0, run = 0, total = 0; for (let i = 1; i < RAMP.length; i++) total += Math.hypot(RAMP[i][0] - RAMP[i - 1][0], RAMP[i][1] - RAMP[i - 1][1]);
    for (let i = 1; i < RAMP.length; i++) { const a = RAMP[i - 1], c = RAMP[i], dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy), t = Math.max(0, Math.min(1, ((b.x - a[0]) * dx + (b.y - a[1]) * dy) / (l * l))), d = Math.hypot(a[0] + dx * t - b.x, a[1] + dy * t - b.y); if (d < best) { best = d; s = (run + t * l) / total; } run += l; }
    return s; }
  // the bot's hands: launch at full pull, flip when a ball comes down onto a flipper's middle, hold a moment
  function botControls(dt) {
    const c = bot; c.t += dt; const out = { l: false, r: false, p: false, n: false };
    if (lanePlunge()) { out.p = c.t % 1.6 < 1.2; return out; }
    for (const [k, f] of [['l', F.L], ['r', F.R]]) {
      c[k] = Math.max(0, (c[k] || 0) - dt); c[k + 'cool'] = Math.max(0, (c[k + 'cool'] || 0) - dt);
      const near = balls.some(b => { const dx = (b.x - f.x) * (k === 'l' ? 1 : -1), dy = b.y - f.y; return dx > 8 && dx < 40 && dy > -26 && dy < 10 && b.vy > -40; });
      if (near && !c[k + 'cool'] && !c[k]) c[k] = .14;
      out[k] = c[k] > 0; if (c[k] > 0 && c[k] <= dt) c[k + 'cool'] = .22;
    }
    return out;
  }

  /* ---- 4. DRAWING: the playfield painted once (deep space, nebulae, lane lines, the inserts, the logo) and drawn
   * foreshortened; the rails, posts and slingshots in it with their height; the lights, bumpers, targets, flippers,
   * the ramp and the balls each frame, in depth order; the dot-matrix display; cabinet art down a wide screen's sides ---- */
  let floorCv = null, dmdCv = null, dmdKey = '';
  const PJ = (x, y, z = 0) => [x, y * BY + z * BZ + 16];   // (a table point on the painted canvas: 16 pixels of room above for heights)
  function paint() {
    const A0 = E.mkCanvas(TW, TL), g = E.ctx2d(A0), h = E.hash2;
    // deep space, nebulae, stars
    for (let y = 0; y < TL; y++) px.rect(g, 0, y, TW, 1, E.mix('#22145a', '#0c0a30', y / TL));
    for (const [x, y, r, c] of [[60, 120, 80, '#8a3aaa'], [170, 300, 100, '#2a7a9a'], [90, 400, 70, '#aa3a6a'], [150, 60, 60, '#3a5aba'], [40, 250, 50, '#5a2a9a']]) for (let k = 3; k >= 1; k--) px.ddisc(g, x, y, r * k / 3, c, .2);
    // a ringed planet and a moon, painted
    px.disc(g, 160, 390, 15, '#c87a4a'); px.disc(g, 156, 386, 11, '#e8a060'); px.disc(g, 153, 383, 4, '#ffd8a0'); for (let a = 0; a < TAU; a += .02) { const x = 160 + Math.cos(a) * 26, y = 390 + Math.sin(a) * 6; if (Math.sin(a) > 0 || Math.hypot(x - 160, y - 390) > 15) px.dot(g, x, y, '#ffe0b0'); }
    px.disc(g, 52, 336, 7, '#2a7a5a'); px.disc(g, 50, 334, 5, '#4aaa6a'); px.disc(g, 54, 338, 2, '#2a6a4a'); px.dot(g, 48, 332, '#9af0b0');   // (a green moon: nothing a ball could be taken for)
    for (let i = 0; i < 260; i++) { const x = h(i, 1) * TW, y = h(i, 2) * TL, c = h(i, 3) < .2 ? '#ffffff' : h(i, 3) < .6 ? '#a8b0ff' : '#5a5aa0'; px.dot(g, x, y, c); }
    // the logo across the middle, the lane lines, the apron
    E.font.title(g, 'NEBULA', 111, 262, { align: 'center', scale: 2, colors: ['#ffe0ff', '#ff8ae8', '#a03ac8'], depth: 2 });
    E.font.title(g, 'RUN', 111, 280, { align: 'center', scale: 2, colors: ['#e0ffff', '#6ae0ff', '#2a7ac8'], depth: 2 });
    // neon lane lines: the inlanes, the orbit, the ramp's way in; arrows to the shots
    for (const [a, b, c] of [[[28, 334], [28, 414], '#5a6aff'], [[mx(28), 334], [mx(28), 414], '#5a6aff'], [[17, 160], [17, 300], '#ff5ac8'], [[170, 330], [176, 306], '#4ae0ff'], [[182, 330], [176, 306], '#4ae0ff']]) { px.line(g, a[0], a[1], b[0], b[1], E.shade(c, -.3), 3); px.line(g, a[0], a[1], b[0], b[1], c); }
    for (const [x, y, c] of [[176, 345, '#4ae0ff'], [22, 318, '#ff5ac8'], [111, 140, '#ffd040']]) px.poly(g, [[x, y - 9], [x - 6, y + 2], [x + 6, y + 2]], E.shade(c, -.55));
    px.poly(g, [[8, 470], [64, 470], [74, 520], [8, 520]], '#1a1630'); px.poly(g, [[214, 470], [158, 470], [148, 520], [214, 520]], '#1a1630');
    E.font.text(g, 'SHOOT AGAIN', 111, 498, '#5a4a7a', { align: 'center', outline: false, font: 'tiny' });
    // the inserts: unlit glass (lit each frame where they shine)
    for (const L of INSERTS) { px.disc(g, L.x, L.y, L.r, E.shade(L.c, -.62)); px.disc(g, L.x - 1, L.y - 1, Math.max(1, L.r - 2), E.shade(L.c, -.45)); }
    // the plunger lane's floor
    px.rect(g, 215, 150, 17, 360, '#0e0a22');
    // foreshortened, with room above for heights; then the rails and posts drawn with their height
    const C = E.mkCanvas(TW, Math.ceil(TL * BY) + 18), c = E.ctx2d(C); c.imageSmoothingEnabled = true; c.drawImage(A0, 0, 16, TW, TL * BY); c.imageSmoothingEnabled = false; E.px.reset(c);
    const rail = (pts, top, side) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], q = [PJ(a[0], a[1]), PJ(b[0], b[1]), PJ(b[0], b[1], 9), PJ(a[0], a[1], 9)]; px.poly(c, q, side); } for (let i = 1; i < pts.length; i++) { const a = PJ(pts[i - 1][0], pts[i - 1][1], 9), b = PJ(pts[i][0], pts[i][1], 9); px.line(c, a[0], a[1], b[0], b[1], top, 2); } };
    for (const pts of RAILS) rail(pts, '#c8d0f0', '#4a4a6a');
    for (const x of [70, 98, 126, 154]) { const [sx, sy] = PJ(x, 62), [tx, ty] = PJ(x, 62, 10); px.rect(c, sx - 3, ty, 6, sy - ty, '#6a6a8a'); px.ell(c, tx, ty, 3, 2, '#e0e0ff'); }
    return C;
  }
  const INSERTS = [
    { id: 'ramp', x: 176, y: 318, r: 5, c: '#40e0ff' }, { id: 'ramp', x: 176, y: 332, r: 4, c: '#40e0ff' },
    { id: 'jack', x: 111, y: 124, r: 6, c: '#ffd040' }, { id: 'kick', x: 15, y: 456, r: 4, c: '#ff5050' },
    { id: 'save', x: 111, y: 488, r: 5, c: '#ff8040' }, { id: 'w1', x: 150, y: 330, r: 3, c: '#a0ff60' }, { id: 'w2', x: 158, y: 340, r: 3, c: '#a0ff60' }, { id: 'w3', x: 166, y: 350, r: 3, c: '#a0ff60' },
    ...[2, 3, 4, 5].map((m, i) => ({ id: 'm' + m, x: 84 + i * 18, y: 438, r: 4, c: '#ff60c0' })),
    ...[84, 112, 140].map((x, i) => ({ id: 'l' + i, x, y: 82, r: 4, c: '#60a0ff' }))
  ];
  function lit(id) {
    const t = game.time, blink = Math.floor(t * 6) % 2 === 0;
    if (id === 'ramp') return st.rampLit && blink; if (id === 'jack') return st.jackLit && blink; if (id === 'kick') return st.kickLit; if (id === 'save') return st.saveT > 0 && blink;
    if (id[0] === 'w') return st.ramps >= +id[1]; if (id[0] === 'm') return st.mult >= +id[1]; if (id[0] === 'l') return lanes[+id[1]].on;
    return false;
  }
  function draw(r) {
    const W = r.W, H = r.H, dmdH = dmdBox(W, H).h;
    // the camera: the table whole where it fits under the display, else following the lowest ball
    const viewH = (H - dmdH) / BY, fits = viewH >= TL + 30, low = balls.length ? Math.max(...balls.map(b => b.y)) : TL;
    const want = fits ? TL / 2 - 8 : Math.max(viewH / 2 + 10, Math.min(TL - viewH / 2 + 20, low - viewH * .1));   // (the arch's top just under the display at the top; the apron at the bottom)
    camY += (want - camY) * Math.min(1, game.dt * 6 || 1); game.cam.offset = [0, Math.round(dmdH / 2)]; game.focus(TW / 2, camY, 0); game.cam.snap = true;
    r.sky(['#05040e', '#0a0618']);
    if (!floorCv) floorCv = paint();
    const [ox, oy] = r.w(0, 0, 0);
    cabinet(r, ox, W, H);
    backglass(r, ox, Math.round(oy), Math.round(r.w(0, TL, 0)[1]), W, H, dmdH);
    r.decal(g => { g.drawImage(floorCv, Math.round(ox), Math.round(oy) - 16); });
    r.decal(g => { for (const L of INSERTS) if (lit(L.id)) { const [x, y] = r.w(L.x, L.y, 0); px.ddisc(g, x, y, L.r * 2.2, L.c, .35); px.ell(g, x, y, L.r, L.r * BY, E.shade(L.c, .3)); px.ell(g, x - 1, y - 1, Math.max(1, L.r - 2), Math.max(1, (L.r - 2) * BY), '#ffffff'); } });
    // bumpers, slingshot rubbers, drop targets, the saucer, the spinner, the flippers, the ramp, the plunger, the balls
    for (const o of F.bumpers) r.queue(o.x, o.y, 0, g => cylinder(g, r, o.x, o.y, 11, 10, o.lit > 0 ? '#ffffff' : '#ff60c0', o.lit > 0 ? '#ffe0ff' : '#8a2a7a'), { bias: 2 });
    for (const s of [F.slingL, F.slingR]) r.queue(s.x, s.y, 0, g => { const [a, b] = s.wv, p = r.w(a[0], a[1], 6), q = r.w(b[0], b[1], 6); px.line(g, p[0], p[1], q[0], q[1], s.lit > 0 ? '#ffffff' : '#ff4040', 3); });
    for (const d of drops) r.queue(d.b.x, d.b.y, 0, g => { const z = d.down ? 1 : 12; box3(g, r, d.b.wv, z, d.down ? '#3a3050' : '#ffd040', d.down ? '#2a2040' : '#a07820'); });
    r.queue(F.saucer.x, F.saucer.y, 0, g => { const [x, y] = r.w(F.saucer.x, F.saucer.y, 0); px.ell(g, x, y, 8, 8 * BY, '#05030a'); px.ell(g, x, y, 6, 6 * BY, st.jackLit ? '#ffd040' : '#2a1a40'); });
    r.queue(17, 236, 0, g => { const w = Math.abs(Math.cos(F.spinA)) * 8, a = r.w(17 - w, 236, 14), b = r.w(17 + w, 236, 14), p = r.w(9, 236, 14), q = r.w(25, 236, 14); px.line(g, p[0], p[1], q[0], q[1], '#8a8aa8'); px.rect(g, Math.min(a[0], b[0]), a[1] - 1, Math.max(1, Math.abs(b[0] - a[0])), 4, '#e0e0ff'); }, { bias: 4 });
    for (const f of [F.L, F.R]) r.queue(f.x, f.y + 6, 0, g => flipper(g, r, f), { bias: 3 });
    r.queue(111, 94, 0, g => drawRamp(g, r), { bias: 30 });
    r.queue(223, 500, 0, g => { const k = plungeT, [x, y] = r.w(223, 500 + k * 10, 4); px.rect(g, x - 4, y - 2, 8, 5, '#c8c8d8'); px.rect(g, x - 1, y + 3, 2, 10, '#8a8aa0'); });
    for (const b of balls) r.queue(b.x, b.y, b.z, g => ball(g, r, b), { bias: b.onRamp ? 40 : 1 });
    hud(r);
  }
  // a cylinder standing on the table: its foot, its side, its lit cap
  function cylinder(g, r, x, y, rad, h, cap, side) {
    const [bx, by] = r.w(x, y, 0), [tx, ty] = r.w(x, y, h);
    px.ell(g, bx, by + 1, rad + 1, (rad + 1) * BY, '#0a0618'); px.rect(g, bx - rad, ty, rad * 2 + 1, by - ty, side); px.ell(g, bx, by, rad, rad * BY, side);
    px.ell(g, tx, ty, rad, rad * BY, cap); px.ell(g, tx - 2, ty - 1, rad * .45, rad * .45 * BY, '#ffffff');
  }
  // a block (a drop target) of world points raised to z
  function box3(g, r, wv, z, top, side) { const B = wv.map(v => r.w(v[0], v[1], 0)), T = wv.map(v => r.w(v[0], v[1], z)); for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; px.poly(g, [B[i], B[j], T[j], T[i]], side); } px.poly(g, T, top); }
  function flipper(g, r, f) {
    const B = f.wv.map(v => r.w(v[0], v[1], 0)), T = f.wv.map(v => r.w(v[0], v[1], 6));
    for (let i = 0; i < B.length; i++) { const j = (i + 1) % B.length; px.poly(g, [B[i], B[j], T[j], T[i]], '#a01a2a'); }
    px.poly(g, T, '#f0f0f8'); const [cx, cy] = r.w(f.x, f.y, 6); px.ell(g, cx, cy, 2, 1.5, '#8a8aa0');
  }
  function ball(g, r, b) {
    const [sx, sy] = r.w(b.x, b.y, 0), [x, y] = r.w(b.x, b.y, b.z + BR);
    if (!b.onRamp) px.ell(g, sx + 1, sy + 1, BR, BR * BY * .8, 'rgba(0,0,0,.45)');
    px.disc(g, x, y, BR, '#9aa0b8'); px.disc(g, x - .5, y - .5, BR - 1, '#d8dcec'); px.disc(g, x - 1.5, y - 1.5, 1.6, '#ffffff'); px.dot(g, x + 2, y + 2, '#6a7088');
  }
  // the ramp: its two rails high over the table on posts, a see-through floor, its mouth's arch
  function drawRamp(g, r) {
    const pts = [], n = 40; let total = 0; const segL = []; for (let i = 1; i < RAMP.length; i++) { const l = Math.hypot(RAMP[i][0] - RAMP[i - 1][0], RAMP[i][1] - RAMP[i - 1][1]); segL.push(l); total += l; }
    for (let k = 0; k <= n; k++) { let d = k / n * total, i = 0; while (i < segL.length - 1 && d > segL[i]) { d -= segL[i]; i++; } const a = RAMP[i], b = RAMP[i + 1], t = d / segL[i], x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, dx = (b[0] - a[0]) / segL[i], dy = (b[1] - a[1]) / segL[i]; pts.push({ x, y, z: rampZ(k / n), nx: -dy, ny: dx }); }
    px.blend(g, .3, 'normal', () => { for (let k = 1; k <= n; k++) { const a = pts[k - 1], b = pts[k], q = [r.w(a.x + a.nx * 8 + 3, a.y + a.ny * 8 + 4, 0), r.w(b.x + b.nx * 8 + 3, b.y + b.ny * 8 + 4, 0), r.w(b.x - b.nx * 8 + 3, b.y - b.ny * 8 + 4, 0), r.w(a.x - a.nx * 8 + 3, a.y - a.ny * 8 + 4, 0)]; px.poly(g, q, '#000000'); } });   // (its shadow on the table)
    for (let k = 4; k < n; k += 8) { const p = pts[k], [x, y] = r.w(p.x, p.y, 0), [, ty] = r.w(p.x, p.y, p.z); px.rect(g, x - 1, ty, 2, y - ty, '#5a5a7a'); }
    px.blend(g, .35, 'normal', () => { for (let k = 1; k <= n; k++) { const a = pts[k - 1], b = pts[k], q = [r.w(a.x + a.nx * 8, a.y + a.ny * 8, a.z), r.w(b.x + b.nx * 8, b.y + b.ny * 8, b.z), r.w(b.x - b.nx * 8, b.y - b.ny * 8, b.z), r.w(a.x - a.nx * 8, a.y - a.ny * 8, a.z)]; px.poly(g, q, '#2a8ab0'); } });
    for (const k of [1, -1]) for (let i = 1; i <= n; i++) { const a = pts[i - 1], b = pts[i], p = r.w(a.x + a.nx * 8 * k, a.y + a.ny * 8 * k, a.z + 4), q = r.w(b.x + b.nx * 8 * k, b.y + b.ny * 8 * k, b.z + 4); px.line(g, p[0], p[1], q[0], q[1], st.rampLit ? '#a8f8ff' : '#c8d0e8'); }
  }
  // a tall screen's room above the table: the backglass (the title over deep space); below it: the lockdown bar and the
  // coin door (each painted once for its size)
  let glass = null;
  function backglass(r, ox, top, bottom, W, H, dmdH) {
    const up = top - dmdH, down = H - bottom; if (up < 12 && down < 12) return;
    const key = up + ',' + down; if (!glass || glass.key !== key) {
      const a = up >= 12 ? E.mkCanvas(TW, up) : null, b = down >= 12 ? E.mkCanvas(TW, down) : null, h = E.hash2;
      if (a) { const g = E.ctx2d(a); for (let y = 0; y < up; y++) px.rect(g, 0, y, TW, 1, E.mix('#0c0a2a', '#2a1050', y / up)); for (let i = 0; i < 90; i++) px.dot(g, h(i, 7) * TW, h(i, 8) * up, h(i, 9) < .3 ? '#ffffff' : '#8a80c0');
        for (let k = 3; k >= 1; k--) px.ddisc(g, TW * .7, up * .55, Math.min(up, 90) * k / 3, '#8a3aaa', .2);
        if (up > 70) { px.disc(g, 40, up * .7, 12, '#4aaa6a'); px.disc(g, 37, up * .7 - 3, 7, '#8ae0a0'); E.font.title(g, 'NEBULA', TW / 2, up / 2 - 26, { align: 'center', scale: 3, colors: ['#ffe0ff', '#ff8ae8', '#a03ac8'], depth: 3 }); E.font.title(g, 'RUN', TW / 2, up / 2 + 2, { align: 'center', scale: 3, colors: ['#e0ffff', '#6ae0ff', '#2a7ac8'], depth: 3 }); }
        px.rect(g, 0, up - 3, TW, 3, '#4a3a6a'); px.rect(g, 0, up - 3, TW, 1, '#8a7aaa'); }
      if (b) { const g = E.ctx2d(b); for (let y = 0; y < down; y++) px.rect(g, 0, y, TW, 1, E.mix('#3a3a4a', '#14121c', Math.min(1, y / 40))); px.rect(g, 0, 0, TW, 6, '#c8c8d8'); px.rect(g, 0, 6, TW, 2, '#6a6a7a');
        if (down > 60) { px.rect(g, TW / 2 - 40, 24, 80, Math.min(70, down - 30), '#2a2830'); for (const x of [TW / 2 - 22, TW / 2 + 14]) { px.rect(g, x, 34, 10, 16, '#8a8a9a'); px.rect(g, x + 4, 37, 2, 10, '#1a1820'); px.rect(g, x - 1, 54, 12, 5, '#c84040'); } E.font.text(g, 'INSERT COIN', TW / 2, 64, '#c8c8d8', { align: 'center', outline: false, font: 'tiny' }); } }
      glass = { key, a, b };
    }
    r.decal(g => { if (glass.a) g.drawImage(glass.a, Math.round(ox), dmdH); if (glass.b) g.drawImage(glass.b, Math.round(ox), bottom); });
  }
  // cabinet art down a wide screen's sides: the side rails, chasing lights
  function cabinet(r, ox, W, H) {
    if (ox < 6) return;
    r.decal(g => {
      for (const [x0, x1] of [[0, ox - 2], [ox + TW + 2, W]]) {
        if (x1 - x0 < 4) continue; for (let y = 0; y < H; y++) px.rect(g, x0, y, x1 - x0, 1, E.mix('#1a0a2a', '#2a0a3a', (y / H)));
        const cx = x0 < 10 ? x1 - 6 : x0 + 6; px.rect(g, cx - 2, 0, 4, H, '#4a3a6a');
        for (let y = 8, i = 0; y < H; y += 14, i++) px.disc(g, cx, y, 2, (Math.floor(game.time * 8) + i) % 4 === 0 ? '#ffd040' : '#5a3a20');
      }
    });
  }

  /* ---- 5. THE DISPLAY: a 128 x 32 dot matrix drawn by code (the score, the ball, the mission's words, the attract
   * loop), its dots orange on black; above the table, or down a wide screen's side ---- */
  function dmdBox(W, H) { const k = W >= 300 && H >= 420 ? 2 : 1, w = 128 * k + 6, h = 32 * k + 6, side = (W - TW) / 2 >= w + 8; return { k, w, h: side ? 0 : h, x: side ? 6 : Math.round((W - w) / 2), y: side ? Math.round(H / 2 - h / 2) : 2, ww: w, hh: h }; }
  function dmdText() {
    const s = cab && cab.p ? cab.p.score : 0, sc = s.toLocaleString('en-US');
    if (mode === 'title') { const ph = Math.floor(modeT / 3) % 3; return ph === 0 ? ['NEBULA RUN', 'PRESS START'] : ph === 1 ? ['HIGH SCORE', (cab.table('')[0] || { score: 0 }).score.toLocaleString('en-US')] : ['3 BALLS', 'LAST ' + (cab.p ? cab.p.score.toLocaleString('en-US') : '0')]; }
    if (mode === 'bonus') return ['BONUS ' + st.mult + 'X', st.bonus.toLocaleString('en-US')];
    if (mode === 'over' || mode === 'entry' || mode === 'table') return ['GAME OVER', sc];
    if (dmd.msg) return dmd.msg.big ? [dmd.msg.s, sc, 1] : [dmd.msg.s, sc];
    return [sc, (demo ? 'DEMO  ' : '') + 'BALL ' + st.ball + (st.multi ? '  STORM' : '') + (st.tilted ? '  TILT' : '')];
  }
  function hud(r) {
    const W = r.W, H = r.H, B = dmdBox(W, H), lines = dmdText(), key = lines.join('|') + (lines[2] ? Math.floor(game.time * 4) % 2 : '');
    if (!dmdCv || key !== dmdKey) {   // the words drawn small, then each pixel a dot: lit or dim
      dmdKey = key; const T = E.mkCanvas(128, 32), t = E.ctx2d(T);
      if (lines[2]) E.font.title(t, lines[0], 64, 4, { align: 'center', scale: 2, colors: ['#ffffff', '#ffffff'], depth: 0 }); else { E.font.text(t, lines[0], 64, 5, '#ffffff', { align: 'center', outline: false }); E.font.text(t, lines[1], 64, 19, '#ffffff', { align: 'center', outline: false }); }
      const d = t.getImageData ? t.getImageData(0, 0, 128, 32).data : null, k = B.k; dmdCv = E.mkCanvas(128 * k, 32 * k); const c = E.ctx2d(dmdCv);
      c.fillStyle = '#100604'; c.fillRect(0, 0, 128 * k, 32 * k);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 128; x++) { const on = d && d[(y * 128 + x) * 4 + 3] > 80; c.fillStyle = on ? '#ff9a30' : '#2a1206'; c.fillRect(x * k, y * k, k > 1 ? k - (on ? 0 : 1) : 1, k > 1 ? k - (on ? 0 : 1) : 1); }
    }
    r.overlay(g => {
      E.ui.box(g, B.x, B.y, B.ww, B.hh, { bg: '#080404', border: '#5a3a2a', gradient: false }); g.drawImage(dmdCv, B.x + 3, B.y + 3);
      if (mode === 'play' && lanePlunge() && !bot) { const tc = game.input.lastDevice === 'touch'; E.font.text(g, tc ? 'SWIPE UP TO LAUNCH' : 'HOLD SPACE, LET GO TO LAUNCH', W / 2, H - 14, '#ffd8a0', { align: 'center', shadow: '#000', outline: false }); if (plungeT) E.ui.bar(g, W / 2 - 30, H - 22, 60, 4, plungeT, '#ff9a30'); }
      if (mode === 'title' && !demo) E.font.text(g, game.input.lastDevice === 'touch' ? 'TAP TO PLAY' : 'ENTER TO PLAY', W / 2, H - 14, '#ffd8a0', { align: 'center', shadow: '#000', outline: false });
    });
    if (mode === 'table') { r.overlay(g => { g.fillStyle = 'rgba(0,0,0,.78)'; g.fillRect(0, 0, r.bw, r.bh); px.reset(g); }); cab.drawTable(r, '', Math.max(B.h + 8, Math.round(H / 2 - 82)), 'NEBULA RUN HIGH SCORES'); }
    else cab.draw(r);
  }

  /* ---- 6. THE BOT: plays a ball (or more) by the flipper keys and the plunger, as a player would, twice; its score,
   * flips and shots, and whether the two were the same (tools/kits-test.mjs) ---- */
  function botRun(o = {}) { const a = botBall(o), b = botBall(o); a.repeat = a.hash === b.hash && a.score === b.score; return a; }
  function botBall(o) {
    const was = Math.random;
    try {
      Math.random = E.rng(o.seed || 5);
      game.time = 0; game.timeScale = 1; game.go('pinball', null, { fade: 0 }); game.advance(1 / 120);
      begin(true); demo = false; bot = { t: 0 };
      let t = 0; const firstBall = st.ball; let drained = false;
      while (t < (o.seconds || 90)) { game.advance(1 / 60); t += 1 / 60; if (mode === 'bonus' || st.ball > firstBall || mode === 'over') { drained = true; break; } }
      const out = { score: cab.p.score, flips: st.flips, bumpers: st.hits, spins: st.spins, targets: st.targets, lanes: st.laneHits, ramps: st.ramps, drained, time: Math.round(t), hash: world.hash(), errors: game.errors.length };
      bot = null; return out;
    } finally { Math.random = was; }
  }

  return { view: 'pinball', views: ['pinball'], res: 'ps1', pausable: true, touch: [], camera: { zoom: false }, input: KEYS,
    enter: start, update, draw, bot: botRun,
    exit() { game.input.touchEnabled = true; game.input.zones = null; game.cam.offset = [0, 0]; A.music(null); },
    back() { if (mode === 'play' && !demo) return false; game.go('title'); return true; },
    /** for tests: the table's world, its parts, the balls, the state of play, the arcade frame, where a table point is */
    state: () => ({ world, F, balls, drops, lanes, st, mode, cab, demo, at: (x, y, z = 0) => { const q = game.view.p(x, y, z); return [q[0] - game.screen.ix, q[1] - game.screen.iy]; }, plunge: lanePlunge }),
    /** the proof: a game started, the ball fired, the flippers on a fixed beat; the world's hash, the score, the ball */
    run: (n = 1200) => proof('pinball', n, (i, k) => {
      if (i === 2) begin(false);
      if (i === 10) k.hold('plunge'); if (i === 130) k.up('plunge');
      if (i > 200 && i % 50 === 0) k.hold(i % 100 ? 'flipL' : 'flipR'); if (i > 200 && i % 50 === 20) { k.up('flipL'); k.up('flipR'); }
    }, () => [world.hash(), cab.p ? cab.p.score : 0, st.ball, mode, balls.length]) };
})();
scenes.pinball = PINBALL;
