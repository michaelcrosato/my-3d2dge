/* =====================================================================================
 * SLICE 7  STEALTH  (Assassin's Creed, Metal Gear, Tenchu). A rooftop district at dusk: steal the ledger from the brick
 * roof and slip out by the east gate. Three guards (one on a roof) patrol with sight cones; what they see makes them
 * notice (?), search the last place they saw you, and at last chase (!) across the roofs. Hide in tall grass while
 * crouched, take a guard down silently from behind (J), or from a roof above (J as you stand over them). In a fight their
 * swings are telegraphed: K just before the blow parries and stuns them.
 * Keys (E.Input.THIRDPERSON): WASD move, Shift sprint, Space jump, climb a wall, vault, leap a gap, C crouch, J attack or
 * take down, K block or parry, L dodge roll, V view. The ledger is a checkpoint. The hero climbs any wall: Space at a
 * face latches on, the stick climbs (up the screen is up the wall), Space leaps up, C lets go.
 * HOW IT WORKS: the hero and the guards are E.Mover bodies (the same climbing, vaulting and gap-leaping for both); a
 * guard's eyes are E.sees through the map's heights, its mind an E.Suspicion, its legs a FlowField that climbs, drops and
 * jumps. Climbs, vaults, rolls and takedowns are E.ACTIONS; the facades are wall-type options; the belfry's canopy sorts by
 * its footprint; r.sightCone and r.marker draw the cones and the objective. Dusk is canvas lighting (game.lights): an
 * ambient and the lights added each draw (street lamps, the ledger's glow, the gate), on a computer: its pass costs a
 * few milliseconds a frame, so a phone keeps its frame rate and an unlit street (as the ADVENTURE slice's Auto does).
 * The interface is HTML, E.Shell's: the objective with its distance, health, status, the takedown prompt, toasts and
 * the results; the guards' marks stay in the world. The music is one song in layers (game.audio.layer): it sneaks on
 * three tracks, and a guard's alert brings in the chase's drums and its saw over them, taken out again when they lose
 * you: no cut to another song.
 * ===================================================================================== */
const STEALTH = (() => {
  const T = 16, HP = 3;
  // SHADOWS ON THE ROOFS: the sneaking bass, ticks and lead; 'chase' and 'alarm' start silent (on: false)
  const SONG = { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'A2 . . A2 . . A2 . | A2 . . A2 . C3 . . | F2 . . F2 . . F2 . | G2 . . G2 . E2 . .' },
    { name: 'tick', wave: 'drums', vol: .06, notes: 'h . . h . . h . h . . h . . h .' },
    { name: 'lead', wave: 'pulse12', vol: .07, notes: 'E5 - . . . . D5 . | C5 - . . B4 . A4 . | . . . . F5 - E5 . | D5 - . . E5 - . . | E5 - . . . . G5 . | F5 - . . E5 . D5 . | C5 - . . D5 - . . | B4 - - - . . . .' },
    { name: 'chase', wave: 'drums', vol: .13, on: false, notes: 'k . h k s . h . k k h . s . h s' },
    { name: 'alarm', wave: 'saw', vol: .06, on: false, notes: 'A3 A3 A4 A3 E4 A3 G4 A3 | A3 A3 A4 A3 C5 A3 B4 A3 | F3 F3 F4 F3 C4 F3 E4 F3 | G3 G3 G4 G3 D4 G3 B3 G3' }] };
  const PAVE = { stones: ['#7a6a60', '#726258', '#806e64'].map(E.hex), mortar: E.hex('#3e3236'), hi: E.hex('#8e7e72'), lo: E.hex('#56484a'), speck: E.hex('#66564e') };   // warm cobbles against the cool stone walls
  /* ---- THE DISTRICT: roofs 24-56 high a jump apart (3-4 cells), a belfry, tall grass (,) and a planter (p) ---- */
  const map = new E.TileMap({ rows: [
    '############################',
    '#.......................,,,#',
    '#.AAAA...BBBBB....CCCC...,,#',
    '#.AAAA...BBBBB....CCCC.....#',
    '#.AAAA...BBBBB....CCCC..TT.#',
    '#.AAAA...BBBBB....CCCC..TT.#',
    '#.........................,#',
    '#..,,,.......p.......,,,..,#',
    '#..,,,...............,,,...#',
    '#.DDDD..EEE....FFFFF.......#',
    '#.DDDD..EEE....FFFFF..GGG..#',
    '#.DDDD..EEE....FFFFF..GGG..#',
    '#.@.......................X#',
    '############################'],
    legend: { '#': 1, A: 2, B: 3, C: 4, D: 5, E: 6, F: 7, G: 8, T: 9, p: 10, ',': { floor: 'grass' }, '@': 'hero', X: 'exit' },
    types: {
      1: { h: 64, top: '#3a3448', side: '#5a5068', face: 'stone', roof: 'plain', cut: true, cutH: 6 },   // the city wall drops low on the camera's side
      2: { h: 40, top: '#8a4a3a', side: '#c8b89a', face: 'plaster', roof: 'tiles', windows: { lit: .3 }, shutters: '#2a5a8a', door: { chance: .4 } },
      3: { h: 48, top: '#5a4a3a', side: '#9a6a4a', face: 'brick', roof: 'slab', windows: { lit: .2 }, balcony: { z: 30, color: '#3a2a1e' } },
      4: { h: 40, top: '#4a6a3a', side: '#b8a888', face: 'timber', roof: 'tiles', arch: { chance: .5 }, windows: true },
      5: { h: 24, top: '#7a4a32', side: '#d0c0a0', face: 'plaster', roof: 'tiles', door: { chance: .5, color: '#5a2a1a' }, windows: { from: 12, lit: .4 } },
      6: { h: 48, top: '#6a5a6a', side: '#7a7a8a', face: 'stone', roof: 'plain', windows: { w: 4, h: 12, lit: .15 } },
      7: { h: 40, top: '#8a5a3a', side: '#c8a888', face: 'plaster', roof: 'tiles', windows: true, shutters: '#6a3a2a', balcony: { z: 24 } },
      8: { h: 24, top: '#4a6a3a', side: '#a89878', face: 'timber', roof: 'tiles', arch: { chance: .6 } },
      9: { h: 72, top: '#7a6a5a', side: '#a89878', face: 'sandstone', roof: 'plain', windows: { w: 3, h: 10, step: 22, lit: .5 } },   // the belfry: face, a MATERIAL (docs/ASSETS.md)
      10: { h: 10, top: '#3e7a3a', side: '#5a4a32', face: 'plank', roof: 'leaves' } },
    floorTex: (x, y, tag) => tag === 'grass' ? E.tex.grass(x, y, { base: '#3e6a32', dark: '#2a5226', light: '#5a8a42' }) : E.tex.flagstone(x, y, PAVE)
  });
  const LEDGER = { x: 11.5 * T, y: 3.5 * T, z: 48 }, EXIT = map.find('exit'), GRASS = [];
  // set dressing: SHAPES (E.SHAPES, docs/ASSETS.md: objects as data, right in every view) along the north street, out of the patrols' way
  const DRESS = [['barrel', 1.5 * T, 1.4 * T, { facing: .4 }], ['barrel', 2.5 * T, 1.3 * T, { facing: 2 }], ['crate', 7.4 * T, 1.4 * T, { scale: .8, facing: .2 }],
    ['cart', 15.5 * T, 1.5 * T, { facing: 0 }], ['sack', 16.9 * T, 1.3 * T, { facing: 1 }], ['barrel', 22.6 * T, 1.4 * T, { facing: 3 }],
    // stacked planks from the asset store, cut into the page's 'stealth' set (src/assets/sets/stealth.js; none without it)
    ...(E.addAssets((window.ASSETS || {}).stealth || { set: 'stealth' }).shapes.length ? [['stealth:resource-planks', 12.2 * T, 1.4 * T, { scale: .7, facing: Math.PI / 2 + .1 }]] : [])];
  for (let cy = 0; cy < map.h; cy++) for (let cx = 0; cx < map.w; cx++) if (map.floorAt((cx + .5) * T, (cy + .5) * T) === 'grass') GRASS.push([(cx + .5) * T, (cy + .5) * T]);
  const BOOK = E.sprite(['.bbbb.', 'bBBBBb', 'bBwwBb', 'bBBBBb', '.bbbb.'], { b: '#3a2010', B: '#8a3a20', w: '#f0e0b0' });
  const ROUTES = [   // [start, ...patrol points] in cells, and the guard's roof height
    [[19.5, 3.5, 40], [21.5, 3.5, 40], [21.5, 5.5, 40], [18.5, 5.5, 40]],
    [[6.5, 6.5, 0], [20.5, 6.5, 0], [20.5, 8.5, 0], [6.5, 8.5, 0]],
    [[11.5, 12.2, 0], [20.5, 12.2, 0], [20.5, 8.2, 0], [11.5, 8.2, 0]]
  ];
  let hero, rig, guards, attack, checkpoint, ledger, won, over, hp, hurtT, alertT, ui = null;
  const say = (title, text) => ui.toast(title, text, 3);
  const inGrass = b => b.z < 2 && map.floorAt(b.x, b.y) === 'grass';

  /* ---- GUARDS: a Mover with patrol points, eyes, a mind and a flow field that climbs, drops and jumps ---- */
  function makeGuard(route, i) {
    const [x, y, z] = route[0];
    const g = new E.Mover({ x: x * T, y: y * T, z, r: 5, run: 70, walk: 30, climbMax: 56, hopMax: 56 });
    Object.assign(g, { i, route: route.map(p => [p[0] * T, p[1] * T]), at: 1, mind: new E.Suspicion({ rise: 1.6, decay: .25, forget: 7 }), hp: 2, stun: 0, dead: false,
      flow: new E.FlowField(map, { climb: 56, drop: 56, jump: 60 }), wait: 0, hit: null, swing: new E.Attack('overhead', { wind: .38, recover: .3, reach: 9 }), bark: 0,
      rig: new E.Humanoid({ size: 1.2, build: 'heroic', hat: 'helmet', armor: true, weapon: 'sword', colors: { cloth: ['#8a3a32', '#6a3a5a', '#7a4a2a'][i], metal: '#c8c8d8' } }) });
    return g;
  }
  function guardUpdate(g, dt) {
    if (g.dead) return;   // (a takedown moves the body it takes: the hero's action plays it)
    if (g.stun > 0) { g.stun -= dt; g.update(dt, map, { move: [0, 0] }); return; }
    const seen = hero && !over ? E.sees(g, hero, { map, range: 110, fov: 1.5 }) : { seen: false, exposure: 0 }, st = g.mind.update(dt, seen, hero);
    if (g.mind.changed && st === 'alert') { A.sfx('select'); g.bark = 1.2; }
    let goal = null, speed = 'walk';
    if (st === 'alert') { goal = hero; speed = 'run'; }
    else if (st === 'search' && g.mind.last) goal = g.mind.last;
    else if (st === 'notice') { g.facing = E.approachAng(g.facing, Math.atan2(g.mind.last.y - g.y, g.mind.last.x - g.x), dt * 3); g.update(dt, map, { move: [0, 0] }); return; }
    else { const p = g.route[g.at]; goal = { x: p[0], y: p[1], z: 0 }; if (Math.hypot(p[0] - g.x, p[1] - g.y) < 8) { g.at = (g.at + 1) % g.route.length; g.wait = .8; } }
    if (g.wait > 0 && st === 'calm') { g.wait -= dt; g.update(dt, map, { move: [0, 0] }); return; }
    // in reach of the hero: a telegraphed swing (a long wind-up), else walk the field toward the goal
    const d = Math.hypot(hero.x - g.x, hero.y - g.y), near = st === 'alert' && d < 20 && E.sameLevel(g, hero, 10);
    if (near && !g.swing.busy && !hero.action) { g.facing = Math.atan2(hero.y - g.y, hero.x - g.x); g.swing.start(); A.sfx('swing', { vol: .5 }); }
    const began = g.swing.update(dt);
    if (g.swing.busy) { g.update(dt, map, { move: [0, 0] }); if (g.swing.active && began === 'active') strikeHero(g); return; }
    let move = [0, 0], jump = false;
    if (goal) {
      g.flow.update(goal.x, goal.y);
      const nx = g.flow.next(g.x, g.y), tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - g.x, ty - g.y) || 1;
      if (Math.hypot(goal.x - g.x, goal.y - g.y) > 6) move = [(tx - g.x) / l, (ty - g.y) / l];
      if (nx && g.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < g.r + 4) { jump = true; g.facing = Math.atan2(ty - g.y, tx - g.x); }
    }
    if (speed === 'walk') move = move.map(v => v * .5);
    g.update(dt, map, { move, sprint: false, jumpPressed: jump });
  }
  function strikeHero(g) {
    if (!E.inArc(g, g.facing, hero, 20, 1.2, 10) || (hero.action && hero.action.invulnerable)) return;
    if (game.input.down('block') && !hero.action) { A.sfx('hit', { vol: .4 }); P.sparks(hero.x, hero.y, hero.z + 16, 6, g.facing + Math.PI); return; }
    hp--; hurtT = .4; game.hitFx(hero.x, hero.y, hero.z + 16, { power: 1, angle: g.facing, sound: 'hurt' }); E.knockback(g, hero, 140);
    if (hp <= 0) lose();
  }

  /* ---- THE HERO: a Mover, a hidden blade, a parry, two takedowns ---- */
  function start() {
    const s = map.find('hero');
    hero = new E.Mover({ x: s.x, y: s.y, r: 5, climbAny: true, climbMax: 30 }); hero.facing = 0;   // (walls up to 30 are pulled up at once, higher ones climbed)
    rig = rig || new E.Humanoid({ size: 1.2, build: 'heroic', hood: true, weapon: 'sword', bladeLen: 7, outfit: 'coat', sleeves: 'long', cape: { len: 6, width: 5, seg: 2.4 }, colors: { cloth: '#d8d2c4', coat: '#d8d2c4', cape: '#8a2a2a', capeIn: '#5a1a1a', pants: '#3a3448', metal: '#e8e8f0' } });
    attack = new E.Attack('slash', { reach: 9 }); guards = ROUTES.map(makeGuard);
    ui = ui || new E.Shell(game, { theme: { accent: '#e8c070' } });   // (made once: it takes over from the engine's own, keeping the pause menu)
    checkpoint = null; ledger = false; won = false; over = false; hp = HP; hurtT = 0; alertT = 0; say('Steal the ledger', 'It lies on the brick roof');
    game.follow(hero, { z: 18 }); game.cam.bounds = v => map.bounds(v); game.cam.offset = [0, -10]; L.enabled = !!(window.matchMedia && matchMedia('(pointer: fine)').matches); L.ambient = .6; A.music(SONG); A.layer('chase', 0, .02); A.layer('alarm', 0, .02);
  }
  function respawnAt(cp) {
    Object.assign(hero, { x: cp.x, y: cp.y, z: cp.z, vx: 0, vy: 0, vz: 0, onGround: true, action: null }); hp = HP;
    guards.forEach((g, i) => { if (!g.dead) { const [x, y, z] = ROUTES[i][0]; Object.assign(g, { x: x * T, y: y * T, z, vx: 0, vy: 0, vz: 0, at: 1, stun: 0, action: null }); g.mind.reset(); g.swing.cancel(); } });
    game.cam.snap = true; say('Back at the checkpoint');
  }
  function lose() { if (checkpoint) { A.sfx('die'); respawnAt(checkpoint); } else { over = true; game.after(.8, () => game.go('over', { from: 'stealth' })); } }
  // a takedown within reach: [guard, from above] or null
  function takedown() {
    for (const g of guards) {
      if (g.dead || g.action) continue;
      const dz = hero.z - g.z, d = Math.hypot(g.x - hero.x, g.y - hero.y);
      // from above: the hero stands over a guard below, close enough to drop onto them
      if (dz > 14 && d < 44 && hero.onGround) return [g, true];
      // from behind: close, on the same level, outside the guard's view and not yet hunting
      const behind = Math.abs(E.angDiff(g.facing, Math.atan2(g.y - hero.y, g.x - hero.x))) < 1.1;
      if (E.sameLevel(hero, g) && d < 18 && behind && g.mind.state !== 'alert') return [g, false];
    }
    return null;
  }
  function tryTakedown() { const t = takedown(); if (!t) return false; hero.play('takedown', { other: t[0], aerial: t[1], map }); return finishGuard(t[0], hero.action); }
  const parrying = () => guards.some(g => !g.dead && g.swing.phase === 'wind' && g.swing.u > .35 && Math.hypot(g.x - hero.x, g.y - hero.y) < 26);
  function finishGuard(g, act) { g.dead = true; g.action = act; A.sfx('punch'); game.freeze(.06); return true; }
  function heroUpdate(dt) {
    const I = game.input;
    hero.exposure = inGrass(hero) && hero.crouch ? 0 : 1;   // crouched in tall grass: unseen
    if (!hero.action) {
      if (I.pressed('dodge') && hero.dodge(undefined, 34)) A.sfx('whoosh');
      else if (I.pressed('attack') && !tryTakedown() && attack.start()) { I.consume('attack'); A.sfx('swing'); }
    }
    attack.update(dt);
    attack.hits(guards.filter(g => !g.dead), g => E.inArc(hero, hero.facing, g, 20, 1.3, 10), g => {
      game.hitFx(g.x, g.y, g.z + 16, { power: g.stun > 0 ? 2 : 1, angle: hero.facing }); E.knockback(hero, g, 90);
      if (g.stun > 0 || --g.hp <= 0) { g.dead = true; g.action = null; A.sfx('die', { vol: .5 }); } else g.mind.level = 1.2;
    });
    // a parry: block in the last moments of a guard's wind-up
    // CONTEXT touch buttons: ATTACK says TAKE DOWN when one is in reach, BLOCK says PARRY in a guard's wind-up
    I.touchSet('attack', !hero.action && takedown() ? 'TAKE DOWN' : null); I.touchSet('block', parrying() ? 'PARRY' : null);
    if (I.pressed('block')) for (const g of guards) if (!g.dead && g.swing.phase === 'wind' && g.swing.u > .35 && Math.hypot(g.x - hero.x, g.y - hero.y) < 26) {
      g.swing.cancel(); g.stun = 1.3; A.sfx('kick'); game.flash('#ffffff', .08); P.sparks(g.x, g.y, g.z + 18, 10, hero.facing); say('Parried');
    }
    hero.update(dt, map, attack.busy ? { move: [0, 0] } : I);
    if (hero.hurt) { hp--; hurtT = .4; game.shake(3); if (hp <= 0) lose(); }
    if (hero.inHazard) hero.respawn();
    if (!ledger && E.dist(hero, LEDGER) < 12) { ledger = true; checkpoint = { x: hero.x, y: hero.y, z: hero.z }; A.sfx('powerup'); say('Checkpoint', 'The ledger is yours: now the east gate'); }
    if (ledger && !won && Math.hypot(hero.x - EXIT.x, hero.y - EXIT.y) < 14 && hero.z < 2) { won = true; A.music('victory'); results(); }
  }

  function results() {
    const alive = guards.filter(g => !g.dead).length, top = best('stealth', alive);
    ui.show('results', { kicker: 'Mission complete', title: 'The ledger is out', stats: [[String(alive), 'guards who never fell'], [String(top), 'the best yet'], [String(HP - hp), 'wounds taken']],
      actions: [{ label: 'Back to the title', primary: true, fn: () => { ui.hide(); game.go('title'); } }] });
  }
  // the HUD, from this step's state: E.Shell redraws only what changed (keys hide by themselves on a touch screen)
  function hud() {
    const k = a => game.input.label(a).toUpperCase(), pad = game.input.lastDevice === 'gamepad', td = !hero.action && takedown();
    ui.hud(won || over ? {} : {
      objective: ledger ? { step: '02 / 02', title: 'Slip out by the east gate', text: 'Down in the street, at the far end', at: { x: EXIT.x, y: EXIT.y, z: 0 }, from: hero }
        : { step: '01 / 02', title: 'Steal the ledger', text: 'On the brick roof', at: LEDGER, from: hero },
      status: hero.exposure === 0 ? { text: 'Hidden', color: '#9ae89a' } : alertT > 0 ? { text: 'Hunted', color: '#ff4a3a' } : hero.crouch ? 'Crouched' : null,
      bars: [{ label: 'Health', value: hp, max: HP, kind: 'pips', color: '#e8505a' }], counts: [['Guards down', guards.filter(g => g.dead).length]],
      prompt: touch() ? null : td ? { act: 'attack', label: 'Take down', hint: td[1] ? 'From above' : 'From behind' } : parrying() ? { act: 'block', label: 'Parry' } : null,
      keys: [[pad ? 'STICK' : ['up', 'left', 'down', 'right'].map(k).join(''), 'Move'], [k('sprint'), 'Sprint'], [k('jump'), 'Jump, climb'], [k('crouch'), 'Crouch'], [k('attack'), 'Strike'], [k('block'), 'Block'], [k('dodge'), 'Roll']]
    });
  }

  function update(dt) {
    if (hurtT > 0) hurtT -= dt;
    if (won || over) { hud(); rig.update(dt, hero.rigState({ pose: won ? 'cheer' : null })); return; }
    heroUpdate(dt);
    for (const g of guards) guardUpdate(g, dt);
    const alert = guards.some(g => !g.dead && g.mind.state === 'alert');
    if (alert !== alertT > 0) { alertT = alert ? 1 : 0; A.layer('chase', alert ? 1 : 0, alert ? .4 : 2.5); A.layer('alarm', alert ? 1 : 0, alert ? .8 : 2.5); }   // (the chase comes in by layers, and fades out)
    rig.update(dt, hero.rigState({ attack: attack.state, pose: game.input.down('block') && !hero.action ? 'block' : null, hurt: hurtT > 0 }));
    for (const g of guards) {
      if (g.dead) { g.rig.update(dt, g.action && g.action.other === g ? g.action.otherState() : { x: g.x, y: g.y, z: g.z, facing: g.facing, down: 1 }); continue; }
      g.rig.update(dt, g.rigState({ attack: g.swing.state, stance: g.mind.state === 'alert' ? 'ready' : null, hurt: g.stun > 0 }));
      if (g.bark > 0) g.bark -= dt;
    }
    hud();
  }

  const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
  const LAMPS = [[8.5, 6.2], [16, 8.8], [23.5, 6.2], [12.5, 10.5], [19.5, 1.3]].map(([x, y]) => [x * T, y * T]);   // street lamps, clear of the patrols
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);   // (the street runs on past the walls to the screen's edges: map.outside)
    for (const [x, y] of GRASS) r.prop('grass', x, y, 0, { size: 1.3 });
    for (const [id, x, y, o] of DRESS) r.shape(id, x, y, 0, o);
    for (const [x, y] of LAMPS) r.prop('lamp', x, y, 0, { light: true });   // each glows and lights the street (game.lights)
    if (!ledger) L.add(LEDGER.x, LEDGER.y, LEDGER.z + 6, 40, .8, { color: '#ffd060' }); else L.add(EXIT.x, EXIT.y, 12, 56, .9, { color: '#80e0ff' });
    // the belfry: a canopy wider than the tower, sorted by its whole footprint (over every tower block)
    const bx = 25 * T, by = 5 * T, w = 21, H = 20, z = 72;
    r.queue(bx, by, z, g => { const P2 = (x, y, zz) => r.w(x, y, zz), c = [P2(bx - w, by - w, z), P2(bx + w, by - w, z), P2(bx + w, by + w, z), P2(bx - w, by + w, z)], tip = P2(bx, by, z + H);
      for (let i = 0; i < 4; i++) px.poly(g, [c[i], c[(i + 1) % 4], tip], ['#7a3a2a', '#9a4a32', '#6a2a22', '#8a4232'][i]);
      px.line(g, tip[0], tip[1], tip[0], tip[1] - 6, '#e8c860'); }, { footprint: [bx - w, by - w, bx + w, by + w] });
    for (const g of guards) if (!g.dead) r.sightCone(g, { map, range: 110, fov: 1.5, color: MOOD[g.mind.state], alpha: g.mind.state === 'calm' ? .22 : .38 });
    if (!ledger) r.sprite(LEDGER.x, LEDGER.y, LEDGER.z + 4 + Math.sin(game.time * 3) * 1.5, BOOK, { glow: .6 });
    const shadow = b => r.shadow(b.x, b.y, 6, .35, undefined, map.groundAt(b.x, b.y, b.r, b.z));
    shadow(hero); r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: { actors: true }, flash: hurtT > 0, alpha: hero.exposure === 0 ? .55 : 1 });
    for (const g of guards) { shadow(g); r.actor(g.x, g.y, g.z, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), { flash: g.stun > 0 && Math.floor(game.time * 10) % 2 === 0 }); }
    r.marker(ledger ? EXIT.x : LEDGER.x, ledger ? EXIT.y : LEDGER.y, ledger ? 0 : LEDGER.z, { label: ledger ? 'EAST GATE' : 'LEDGER', color: ledger ? '#80e0ff' : '#ffd040' });
    r.overlay(g => {
      for (const gd of guards) if (!gd.dead && gd.mind.state !== 'calm') {   // ? and ! over their heads, with the meter
        const [sx, sy] = r.w(gd.x, gd.y, gd.z + 46), a = gd.mind.state === 'alert';
        E.font.text(g, a ? '!' : '?', Math.round(sx), Math.round(sy) - 8, MOOD[gd.mind.state], { align: 'center', shadow: '#000' });
        E.ui.bar(g, Math.round(sx) - 6, Math.round(sy) + 2, 12, 2, Math.min(1, gd.mind.level), MOOD[gd.mind.state]);
      }
    });
  }
  return { view: 'iso', views: ['iso', 'threequarter'], input: 'THIRDPERSON', res: 'ps1', pausable: true, touch: ['jump', 'attack', 'block', 'crouch'],
    camera: { zoom: [.75, 2], rotate: true }, enter: start, update, draw,
    state: () => ({ hero, guards, map, ledger, won, hp }),   // for tests
    /** the proof: over the rooftops, jumping, swinging and crouching, the guards on their rounds; a hash of the run */
    run: (n = 600) => proof('stealth', n, (i, k) => { walk(i, k, ['right', 'down', 'left', 'up'], 100); if (i % 130 === 60) k.tap('jump'); if (i % 90 === 45) k.tap('attack'); if (i === 400) k.tap('crouch'); },
      () => [hero.x, hero.y, hero.z, hp, ledger, won, guards.map(g => [g.x, g.y, g.z, g.hp, g.dead])]),
    exit() { game.cam.offset = null; L.enabled = false; if (ui) ui.hud({}); } };
})();
scenes.stealth = STEALTH;
