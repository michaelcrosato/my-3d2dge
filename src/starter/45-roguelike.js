/* =====================================================================================
 * SLICE 8  ROGUELIKE  (Rogue, Torneko's / Mystery Dungeon, Shiren the Wanderer). @modules grid gen
 * Ten floors of a torch-lit crypt, each generated from the run's seed (E.gen: rooms, then split halls, then caves), the
 * Amulet of Embers at the bottom. A turn-based dungeon: every step, swing or sip is a turn, and the monsters take theirs
 * by speed (E.Turns: a bat flits twice to your once, a slime oozes once to your twice). Walk into a monster to strike it.
 * Potions heal, scrolls of mapping show the floor and its stairs, a better blade waits on most floors; the stairs (>)
 * take you down. Fall and the crypt keeps a tombstone; escape with the Amulet and the results tell the tale.
 * Keys: arrows / WASD step (two at once: diagonals, as do numpad-style corners in iso), J wait a turn, L drink a potion,
 * K read a scroll. TOUCH: tap a cell to walk there (the hero stops when a monster comes into sight), hold the stick to
 * step, WAIT, POTION and SCROLL buttons.
 * HOW IT WORKS: the floor is a TileMap from E.gen's ASCII rows, the grid (E.Grid.from(map)) gives paths, fields of view
 * (symmetric shadowcasting: you see a monster exactly when it sees you) and E.Fog (unseen black, seen dim); E.Turns
 * orders the turns; each step between cells is a tween (game.tween) the rigs walk through, so the game is turn-based
 * and the animation is not. A floor's stairs lead on through an iris (game.go's fade). Canvas lighting: the hero's
 * torch and the braziers. bot(10) plays ten floors by itself (tools/kits-test.mjs).
 * ===================================================================================== */
const ROGUE = (() => {
  const T = 16, FW = 46, FH = 30, LAST = 10, SIGHT = 7, STEP = .13;   // a cell; a floor's size; the Amulet's floor; how far the torch shows; a step's seconds
  const KINDS = {   // monsters: hit points, attack, defence, speed (100: yours), experience, first floor, and their rigs
    rat: { name: 'RAT', hp: 4, atk: 2, def: 0, speed: 100, xp: 2, from: 1, blob: { R: 4, ears: 'cat', tail: true, feet: true, colors: { dk: '#3a2e2a', base: '#7a6658', lt: '#a8927e' } } },
    bat: { name: 'BAT', hp: 3, atk: 2, def: 0, speed: 200, xp: 3, from: 1, fly: 14, blob: { R: 3.5, wings: true, ears: 'cat', colors: { dk: '#2a1e34', base: '#5a4270', lt: '#8a70a8' } } },
    slime: { name: 'SLIME', hp: 9, atk: 3, def: 2, speed: 50, xp: 4, from: 2, blob: { R: 6, mouth: true, colors: { dk: '#1e5a32', base: '#3aa05a', lt: '#8ae09a' } } },
    goblin: { name: 'GOBLIN', hp: 9, atk: 4, def: 1, speed: 100, xp: 6, from: 3, rig: { size: .9, build: 'bulky', hair: 'spiky', weapon: 'sword', colors: { skin: '#7aa04a', cloth: '#6a4a2a', pants: '#4a3a2a', hair: '#2a2a1a' } } },
    skeleton: { name: 'SKELETON', hp: 14, atk: 5, def: 2, speed: 100, xp: 10, from: 5, rig: { size: 1, outfit: 'tunic', weapon: 'sword', colors: { skin: '#e8e2d0', cloth: '#3a3440', pants: '#2a2630', hair: '#e8e2d0' } } },
    wraith: { name: 'WRAITH', hp: 16, atk: 7, def: 3, speed: 150, xp: 16, from: 7, rig: { size: 1.1, outfit: 'robe', hood: true, weapon: 'staff', colors: { skin: '#a8b0d0', cloth: '#3a3a6a', hair: '#1a1a2a' } } }
  };
  const BLADES = [['DAGGER', 1], ['SWORD', 3], ['BROADSWORD', 5], ['RUNEBLADE', 8]];   // a better blade on most floors
  const SPR = {   // the floor's things, in pixels
    potion: E.sprite(['.cc.', '.ww.', 'wrrw', 'rRrr', 'rrrr', '.rr.'], { c: '#c8a070', w: '#e8e8f0', r: '#d02a3a', R: '#ff8a8a' }),
    scroll: E.sprite(['bbbbbb', 'pwwwwp', 'pwkwkp', 'pwwwwp', 'bbbbbb'], { b: '#8a5a2a', p: '#c8b088', w: '#f0e4c0', k: '#5a4a3a' }),
    blade: E.sprite(['....w', '...wl', '..wl.', 'gwl..', '.g...', 'h.g..'], { w: '#f0f0f8', l: '#a8b0c0', g: '#c8a040', h: '#6a4a2a' }),
    gold: E.sprite(['.yy.', 'yYYy', 'yYyy', '.yy.'], { y: '#e0a020', Y: '#fff0a0' }),
    amulet: E.sprite(['.g.g.', 'g...g', '.grg.', '.rRr.', '..r..'], { g: '#e0c050', r: '#e03a2a', R: '#ffb080' })
  };
  const PAVE = { stones: ['#3e3a44', '#46424c', '#423e48'].map(E.hex), mortar: E.hex('#1e1a24'), hi: E.hex('#524e58'), lo: E.hex('#2e2a34'), speck: E.hex('#4a4650') };
  let R = Math.random, seed = 1, depth = 1, level = null, map = null, grid = null, fog = null, turns = null;
  let hero = null, foes = [], items = [], braziers = [], log = [], travel = null, busy = 0, mode = 'play', over = null, dirWait = 0, lastDir = null, repeatT = 0, held = 0, going = false;
  let stats = { kills: 0, gold: 0, turns: 0, killer: null };
  const menu = new E.Menu(game, ['RETRY', 'TITLE'], { y: 0, onPick: i => i === 0 ? game.go('roguelike', null, { fade: 'iris' }) : game.go('title') });
  const say = (s, c = '#e8e0d0') => { log.push({ s, c, t: game.real }); if (log.length > 4) log.shift(); };
  const at = (x, y) => [x, y].join();
  const occupied = (cx, cy) => (hero && hero.cx === cx && hero.cy === cy) || foes.some(f => !f.dead && f.cx === cx && f.cy === cy);
  const foeAt = (cx, cy) => foes.find(f => !f.dead && f.cx === cx && f.cy === cy);
  const center = (cx, cy) => [(cx + .5) * T, (cy + .5) * T];

  /* ---- 1. A FLOOR: E.gen's rows by depth, its marks read by a TileMap; the grid, the fog and the turns over it ---- */
  function build() {
    const g = depth <= 3 ? E.gen.rooms(FW, FH, { seed: seed * 31 + depth, rooms: 10 }) : depth <= 6 ? E.gen.bsp(FW, FH, { seed: seed * 31 + depth, min: 8 }) : E.gen.cave(FW, FH, { seed: seed * 31 + depth, fill: .44 });
    const sub = (ch, n, far) => E.gen.mark(g, ch, n, { seed: seed * 97 + depth * 13 + ch.charCodeAt(0), far, near: 2 });
    const rows = g.rows.map(r => r.split('')); rows[g.end[1]][g.end[0]] = depth === LAST ? 'A' : '>'; g.rows = rows.map(r => r.join(''));
    const pool = Object.keys(KINDS).filter(k => KINDS[k].from <= depth);
    for (let i = 0; i < 5 + depth; i++) sub(KINDS[pool[Math.floor(R() * pool.length)]].name[0].toLowerCase(), 1, 6);
    sub('!', 2 + (depth % 2), 3); sub('?', depth % 3 === 1 ? 1 : 0, 3); sub('$', 3, 2);
    if (depth % 3 !== 0 && depth < LAST) sub(')', 1, 4);
    const legend = { '#': 1, '>': 'stairs', A: 'amulet', '!': 'potion', '?': 'scroll', '$': 'gold', ')': 'blade' };
    for (const k in KINDS) legend[KINDS[k].name[0].toLowerCase()] = k;
    map = new E.TileMap({ rows: g.rows, legend, types: { 1: { h: 20, top: '#2e2a38', side: '#58506a', face: 'stone', roof: 'plain', cut: true, cutH: 4 } },
      floorTex: (x, y) => E.tex.flagstone(x, y, PAVE, 16) });
    map.outside = '#05040a';
    level = g; grid = E.Grid.from(map, { diagonal: true }); fog = new E.Fog(grid); going = false;
    foes = []; items = []; braziers = (g.rooms || []).filter((_, i) => i % 2 === 0).map(r => center(r.x, r.y));
    for (const s of map.spawns) {
      if (KINDS[s.tag]) foes.push(makeFoe(s.tag, s.cx, s.cy));
      else if (['potion', 'scroll', 'gold', 'blade', 'amulet', 'stairs'].includes(s.tag)) items.push({ kind: s.tag, cx: s.cx, cy: s.cy });
    }
    const [sx, sy] = g.start; hero.cx = sx; hero.cy = sy; [hero.x, hero.y] = center(sx, sy); travel = null;
    turns = new E.Turns([hero, ...foes], { mode: 'speed' });
    game.follow(hero, { z: 12 }); game.cam.bounds = v => map.bounds(v); game.cam.snap = true;
    say(depth === LAST ? 'THE AMULET IS NEAR' : 'FLOOR ' + depth, '#ffd890');
    nextTurn();
  }
  function makeFoe(kind, cx, cy) {
    const K = KINDS[kind], [x, y] = center(cx, cy), hp = K.hp + Math.floor((depth - K.from) * .8);
    return { kind, K, cx, cy, x, y, hp, max: hp, atk: K.atk + Math.floor((depth - K.from) / 3), def: K.def, speed: K.speed, face: Math.PI / 2, awake: false, hit: 0, dead: false, die: 0,
      rig: K.blob ? new E.Blob(K.blob) : new E.Humanoid(K.rig), swing: new E.Attack('slash') };
  }

  /* ---- 2. TURNS: the hero acts on input; then everyone faster than the next hero turn, by E.Turns ---- */
  function nextTurn() {
    for (let guard = 0; guard < 400; guard++) {
      const a = turns.next(); if (!a) return;
      if (a === hero) break;
      if (!a.dead) foeTurn(a);
      if (hero.hp <= 0) return;
    }
    fog.update([{ cx: hero.cx, cy: hero.cy, r: SIGHT }]);
    for (const f of foes) if (!f.dead && !f.awake && fog.visible([f.cx, f.cy])) { f.awake = true; travel = null; say('A ' + f.K.name + ' SEES YOU', '#ffb070'); }
  }
  // a step: the cell changes now, the rig walks there in a tween
  function stepTo(a, cx, cy) {
    a.face = Math.atan2(cy - a.cy, cx - a.cx); a.cx = cx; a.cy = cy;
    const [x, y] = center(cx, cy); if (a.tw) a.tw.cancel(); a.tw = game.tween(a, { x, y }, STEP, { ease: 'linear' });
    if (a.rig && a.rig.kick) a.rig.kick(2);
  }
  function strike(a, d) {
    a.face = Math.atan2(d.cy - a.cy, d.cx - a.cx); a.swing.start();
    const dmg = Math.max(1, a.atk + Math.floor(R() * 3) - d.def);
    d.hp -= dmg; d.hit = .25;
    game.hitFx(d.x, d.y, 14, { damage: dmg, power: a === hero ? 1 : .6, angle: a.face, sound: 'hit', textColor: d === hero ? '#ff8a8a' : '#fff2c4' });
    if (d.rig && d.rig.kick) d.rig.kick(-3);
    if (d === hero) { if (hero.hp <= 0) { stats.killer = a.K.name; die(); } return; }
    if (d.hp <= 0) {
      d.dead = true; turns.remove(d); stats.kills++; P.dust(d.x, d.y, 4, 10); P.bits(d.x, d.y, 6, 6, d.K.blob ? [d.K.blob.colors.base, d.K.blob.colors.dk] : ['#6a6070', '#a8a0b0']);
      hero.xp += d.K.xp; say('THE ' + d.K.name + ' DIES', '#a8e0a0');
      if (hero.xp >= hero.next) { hero.lv++; hero.next = Math.round(hero.next * 1.7); hero.max += 5; hero.hp = hero.max; hero.atk += 1; say('LEVEL ' + hero.lv + '!', '#ffe070'); A.sfx('powerup'); }
    }
  }
  function foeTurn(f) {
    const d = grid.dist([f.cx, f.cy], [hero.cx, hero.cy]);
    if (f.awake && d === 1 && corner(f, hero)) { strike(f, hero); return; }
    let want = null;
    if (f.awake && !(f.kind === 'bat' && R() < .4)) { const p = grid.path([f.cx, f.cy], [hero.cx, hero.cy], { blocked: (x, y) => !!foeAt(x, y), ends: true, max: 40 }); if (p.length > 2) want = p[1]; }
    if (!want && (f.kind === 'bat' || R() < .25)) { const n = grid.neighbours([f.cx, f.cy]).filter(c => grid.walk(c) && !occupied(...c)); if (n.length) want = n[Math.floor(R() * n.length)]; }
    if (want && !occupied(...want)) stepTo(f, ...want);
  }
  const corner = (a, b) => a.cx === b.cx || a.cy === b.cy || (grid.walk([a.cx, b.cy]) && grid.walk([b.cx, a.cy]));   // (no swinging round a wall's corner)
  function heroAct(act) {
    if (mode !== 'play' || hero.hp <= 0 || going) return false;
    if (act.move) {
      const [dx, dy] = act.move, cx = hero.cx + dx, cy = hero.cy + dy, f = foeAt(cx, cy);
      if (f && corner(hero, f)) strike(hero, f);
      else if (grid.walk([cx, cy]) && !f && (dx === 0 || dy === 0 || corner(hero, { cx, cy }))) { stepTo(hero, cx, cy); pickUp(); if (mode !== 'play') return true; }
      else return false;
    } else if (act.potion) {
      if (!hero.potions) { say('NO POTIONS'); return false; }
      hero.potions--; const h = Math.min(hero.max - hero.hp, Math.ceil(hero.max * .6)); hero.hp += h; say('YOU FEEL BETTER (+' + h + ')', '#ff9aa0'); A.sfx('heal'); P.glints(hero.x, hero.y, 16, 8, '#ff9ab0');
    } else if (act.scroll) {
      if (!hero.scrolls) { say('NO SCROLLS'); return false; }
      hero.scrolls--; for (let i = 0; i < fog.state.length; i++) if (!fog.state[i] && map.walkable(i % map.w, Math.floor(i / map.w))) fog.state[i] = 1;
      for (let i = 0; i < fog.state.length; i++) { const x = i % map.w, y = Math.floor(i / map.w); if (!fog.state[i] && grid.neighbours([x, y]).some(c => map.walkable(...c))) fog.state[i] = 1; }
      say('THE FLOOR IS REVEALED', '#a8c8ff'); A.sfx('powerup');
    } else if (!act.wait) return false;
    stats.turns++; if (stats.turns % 9 === 0 && hero.hp < hero.max) hero.hp++;   // you heal slowly as you go
    busy = STEP; nextTurn(); return true;
  }
  function pickUp() {
    const i = items.findIndex(t => t.cx === hero.cx && t.cy === hero.cy); if (i < 0) return;
    const t = items[i];
    if (t.kind === 'stairs') { say('DOWN THE STAIRS', '#ffd890'); A.sfx('door'); descend(); return; }
    items.splice(i, 1);
    if (t.kind === 'potion') { hero.potions++; say('A POTION', '#ff9aa0'); }
    else if (t.kind === 'scroll') { hero.scrolls++; say('A SCROLL OF MAPPING', '#a8c8ff'); }
    else if (t.kind === 'gold') { const g = 5 + Math.floor(R() * 10 * depth); stats.gold += g; say(g + ' GOLD', '#ffe070'); A.sfx('coin'); }
    else if (t.kind === 'blade') { const b = BLADES[Math.min(BLADES.length - 1, Math.floor(depth / 3) + 1)]; if (b[1] > hero.blade[1]) { hero.atk += b[1] - hero.blade[1]; hero.blade = b; say('A ' + b[0] + '!', '#c8e0ff'); } else say('A RUSTY BLADE (YOURS IS BETTER)'); A.sfx('powerup'); }
    else if (t.kind === 'amulet') { stats.gold += 500; finish('won'); }
  }
  function descend() { depth++; going = true; game.go('roguelike', { depth, keep: true }, { fade: 'iris', seconds: .35, at: hero }); }
  function die() { say('YOU DIE...', '#ff6a6a'); A.sfx('die'); finish('dead'); }
  function finish(how) {
    mode = how; travel = null; menu.i = 0;
    const score = stats.gold + stats.kills * 10 + depth * 100 + (how === 'won' ? 1000 : 0);
    over = { how, score, best: best('roguelike', score), t: 0 };
    if (how === 'won') { A.music(null); A.sfx('oneup'); }
  }

  /* ---- 3. A RUN and its scenes ---- */
  function start(data) {
    L.enabled = true; L.ambient = .06; L.dark = [6, 4, 14]; L.refresh();
    if (data && data.keep) { depth = data.depth; build(); return; }   // the next floor of this run
    R = Math.random; seed = 1 + Math.floor(R() * 1e6); depth = 1; mode = 'play'; over = null; log = []; busy = 0; lastDir = null; held = 0; dirWait = repeatT = 0; travel = null; going = false;
    stats = { kills: 0, gold: 0, turns: 0, killer: null };
    hero = { cx: 0, cy: 0, x: 0, y: 0, hp: 20, max: 20, atk: 3, def: 1, speed: 100, lv: 1, xp: 0, next: 10, potions: 1, scrolls: 0, blade: BLADES[0], face: Math.PI / 2, hit: 0,
      rig: new E.Humanoid({ size: 1, outfit: 'tunic', hair: 'short', weapon: 'sword', cape: { len: 5, width: 5, seg: 2.4 }, colors: { cloth: '#2a5ab0', cape: '#8a2a2a', hair: '#c8a050', trim: '#e0c060' } }), swing: new E.Attack('slash') };
    A.music('dungeon'); game.input.touchSet('attack', 'WAIT'); game.input.touchSet('skill', 'POTION'); game.input.touchSet('dash', 'SCROLL');
    build();
  }
  // the step the keys or the stick ask for: [dx, dy] on the grid (in iso, turned from the screen), or null
  function wantDir() {
    const I = game.input, m = I.move(); if (Math.hypot(m[0], m[1]) < .4) return null;
    let [x, y] = game.view.pitchDeg > 70 || game.view.id === 'threequarter' ? m : game.view.screenDirToGround(m[0], m[1]);
    const a = Math.round(Math.atan2(y, x) / (Math.PI / 4)) * Math.PI / 4; return [Math.round(Math.cos(a)), Math.round(Math.sin(a))];
  }
  function update(dt) {
    const I = game.input;
    hero.rig.update(dt, rigState(hero, dt)); hero.swing.update(dt); hero.hit = Math.max(0, hero.hit - dt);
    for (const f of foes) { f.swing.update(dt); f.hit = Math.max(0, f.hit - dt); if (f.dead) f.die += dt; f.rig.update(dt, f.K.blob ? { look: [Math.cos(f.face), Math.sin(f.face)], walk: f.tw && !f.tw.done ? 1 : 0, flap: 1 } : rigState(f, dt)); }
    if (mode !== 'play') { if (over) over.t += dt; if (over && over.t > 1.2) menu.update(dt); return; }
    busy -= dt; if (busy > 0) return;
    // touch: a tap on a cell walks there; keys and the stick: a step (two keys pressed together: a diagonal)
    const tap = I.clicked();
    if (tap && game.r) { const [wx, wy] = game.view.toGround(tap[0] + game.r.ix, tap[1] + game.r.iy) || [0, 0], c = map.toCell(wx, wy); if (fog.seen(c) && grid.walk(c)) { const p = grid.path([hero.cx, hero.cy], c, { blocked: (x, y) => !!foeAt(x, y) && !(x === c[0] && y === c[1]), ends: true }); travel = p.length > 1 ? p.slice(1) : null; } }
    if (I.pressed('attack')) { travel = null; heroAct({ wait: true }); return; }
    if (I.pressed('skill')) { travel = null; heroAct({ potion: true }); return; }
    if (I.pressed('dash')) { travel = null; heroAct({ scroll: true }); return; }
    const d = wantDir();
    if (d) {
      travel = null;
      if (!lastDir) { dirWait = .06; held = 0; }   // a moment for a second key (a diagonal)
      lastDir = d; dirWait -= dt; repeatT -= dt;
      if (dirWait <= 0 && repeatT <= 0) { heroAct({ move: d }); repeatT = held++ ? 0 : .2; }   // one step a tap; held, it walks on
      return;
    }
    lastDir = null; repeatT = 0;
    if (travel && travel.length) { const [cx, cy] = travel.shift(); if (!heroAct({ move: [cx - hero.cx, cy - hero.cy] })) travel = null; }
  }
  function rigState(a, dt) {
    const tw = a.tw && !a.tw.done, sp = tw ? T / STEP : 0;
    return { x: a.x, y: a.y, z: 0, vx: tw ? Math.cos(a.face) * sp : 0, vy: tw ? Math.sin(a.face) * sp : 0, facing: a.face, hurt: a.hit > 0 ? a.hit * 4 : 0,
      attack: a.swing.phase ? a.swing.state : null, pose: a.hp <= 0 ? 'die' : null };
  }

  /* ---- 4. DRAWING: floor, stairs, things seen, actors in sight, the fog over it all, torchlight, the HUD ---- */
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    const fl = (Math.sin(game.time * 13) + Math.sin(game.time * 7.3)) * .05;
    L.add(hero.x, hero.y, 26, 105, 1.25 + fl, { color: '#ffb868' });
    for (const [x, y] of braziers) if (fog.seen(map.toCell(x, y))) { r.prop('brazier', x, y, 0, { light: true }); }
    for (const t of items) {
      if (!fog.seen([t.cx, t.cy])) continue;
      const [x, y] = center(t.cx, t.cy);
      if (t.kind === 'stairs') { r.decal(g => { for (let i = 0; i < 4; i++) E.px.polyDither(g, [[x - 7 + i, y - 7 + i * 2], [x + 7 - i, y - 7 + i * 2], [x + 7 - i, y - 4 + i * 2], [x - 7 + i, y - 4 + i * 2]].map(([a, b]) => r.w(a, b, 0)), i % 2 ? '#2a2632' : '#5a5462', 1, r.ix, r.iy); }); continue; }
      r.sprite(x, y, 2 + Math.sin(game.time * 3 + t.cx) * 1.2, SPR[t.kind], { glow: t.kind === 'amulet' ? 1 : .3 });
      if (t.kind === 'amulet') L.add(x, y, 10, 50, 1, { color: '#ff6040' });
    }
    for (const f of foes) {
      if (!fog.visible([f.cx, f.cy]) || (f.dead && f.die > .5)) continue;
      r.shadow(f.x, f.y, f.K.blob ? 5 : 6, .4);
      const z = f.K.fly ? f.K.fly + Math.sin(game.time * 6 + f.cx) * 2 : 0;
      r.actor(f.x, f.y, z, (g, ox, oy) => f.rig.draw(g, ox, oy, r.view), { flash: f.hit > .1 && '#ffffff', alpha: f.dead ? 1 - f.die * 2 : 1 });
    }
    r.shadow(hero.x, hero.y, 6, .45);
    r.actor(hero.x, hero.y, 0, (g, ox, oy) => hero.rig.draw(g, ox, oy, r.view), { flash: hero.hit > .1 && '#ff6060', xray: true });
    if (travel && travel.length) E.tint(r, travel, '#ffd890', .35, T);
    fog.draw(r, T, { height: (x, y) => map.height(x, y) });
    hud(r);
  }
  function hud(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, x0 = 4, w = 108;
      E.ui.box(g, x0, 4, w, 34, { alpha: .75 });
      E.font.text(g, (depth === LAST ? 'DEEPEST FLOOR' : 'FLOOR ' + depth) + '   LV ' + hero.lv, x0 + 5, 8, '#ffe8b0', { outline: false });
      E.ui.bar(g, x0 + 5, 19, w - 10, 5, hero.hp / hero.max, hero.hp > hero.max * .3 ? '#e04a4a' : '#ff2a6a');
      E.font.text(g, hero.hp + '/' + hero.max + '  ' + hero.blade[0], x0 + 5, 27, '#d8d0e8', { outline: false, font: 'tiny' });
      const cx = (touch() ? cornerX() : W) - 74;
      E.ui.box(g, cx, 4, 70, 22, { alpha: .75 });
      px.sprite(g, SPR.potion, cx + 5, 9); E.font.text(g, 'x' + hero.potions, cx + 12, 10, '#ffb0b0', { outline: false });
      px.sprite(g, SPR.scroll, cx + 34, 10); E.font.text(g, 'x' + hero.scrolls, cx + 42, 10, '#c8d8ff', { outline: false });
      const ly = H - (touch() ? 96 : 12) - log.length * 9;
      log.forEach((m, i) => { const a = Math.min(1, 6 - (game.real - m.t)); if (a > 0) E.font.text(g, m.s, 6, ly + i * 9, m.c, { shadow: '#000', outline: false }); });
      if (!touch() && mode === 'play') E.font.text(g, 'J WAIT  L POTION  K SCROLL', W - 4, H - 10, '#8a82a8', { align: 'right', outline: false, font: 'tiny' });
      if (over) {
        const k = Math.min(1, over.t / .8), cy = Math.round(H / 2);
        g.fillStyle = 'rgba(4,2,10,' + (.75 * k).toFixed(2) + ')'; g.fillRect(0, 0, r.bw, r.bh); E.px.reset(g);
        if (over.how === 'dead') tombstone(g, W / 2, cy - 30);
        else E.font.title(g, 'YOU ESCAPED!', W / 2, cy - 76, { align: 'center', scale: 3, colors: ['#fff8d0', '#ffd060', '#e07a2a'] });
        const lines = over.how === 'dead' ? ['KILLED BY A ' + (stats.killer || 'TRAP'), 'ON FLOOR ' + depth] : ['WITH THE AMULET OF EMBERS', 'FROM FLOOR ' + LAST];
        lines.push('KILLS ' + stats.kills + '   GOLD ' + stats.gold + '   TURNS ' + stats.turns, 'SCORE ' + over.score + (over.score >= over.best ? '  BEST!' : '   BEST ' + over.best));
        lines.forEach((s, i) => E.font.text(g, s, W / 2, cy + 16 + i * 10, i === lines.length - 1 ? '#ffe070' : '#e8e0f0', { align: 'center', shadow: '#000', outline: false }));
        if (over.t > 1.2) { menu.y = cy + 62; }
      }
    });
    if (over && over.t > 1.2) menu.draw(r);
  }
  function tombstone(g, x, y) {   // a grey headstone with its words, on a mound
    x = Math.round(x); px.ell(g, x, y + 30, 40, 7, '#2a2a1e'); px.ell(g, x, y + 29, 34, 5, '#3e4a2a');
    px.rect(g, x - 26, y - 18, 52, 46, '#5a5a66'); px.disc(g, x, y - 18, 26, '#5a5a66'); px.rect(g, x - 22, y - 16, 44, 42, '#6e6e7a'); px.disc(g, x, y - 18, 22, '#6e6e7a');
    px.rect(g, x - 26, y + 24, 52, 4, '#46464e');
    E.font.text(g, 'R.I.P.', x, y - 26, '#2a2a34', { align: 'center', outline: false, scale: 1 });
    E.font.text(g, 'HERE LIES', x, y - 10, '#34343e', { align: 'center', outline: false, font: 'tiny' });
    E.font.text(g, 'A WANDERER', x, y - 2, '#34343e', { align: 'center', outline: false, font: 'tiny' });
    E.font.text(g, 'LV ' + hero.lv, x, y + 8, '#34343e', { align: 'center', outline: false, font: 'tiny' });
  }

  /* ---- 5. THE BOT: plays the run by itself (tools/kits-test.mjs): potions when hurt, fights what is next to it, walks
   * to the stairs; ten floors of it, every step through the same turns and tweens a player's go through ---- */
  function bot(floors = LAST, seedNo = 1) {
    const was = Math.random; Math.random = E.rng(seedNo);
    try {
      game.time = 0; game.timeScale = 1; game.go('roguelike', null, { fade: 0 }); game.advance(1 / 120);
      let reached = 1;
      for (let i = 0; i < 6000 && mode === 'play'; i++) {
        game.advance(STEP + 1 / 60);
        if (going) continue;
        reached = Math.max(reached, depth); if (reached > floors || (mode !== 'play')) break;
        const adj = foes.find(f => !f.dead && grid.dist([f.cx, f.cy], [hero.cx, hero.cy]) === 1 && corner(hero, f));
        if (hero.hp < hero.max * .45 && hero.potions) heroAct({ potion: true });
        else if (adj) heroAct({ move: [adj.cx - hero.cx, adj.cy - hero.cy] });
        else {
          const loot = items.filter(t => t.kind !== 'stairs' && t.kind !== 'gold').map(t => grid.path([hero.cx, hero.cy], [t.cx, t.cy], { max: 14 })).filter(q => q.length > 1).sort((a, b) => a.length - b.length)[0];
          const goal = loot ? loot[loot.length - 1] : level.end, p = grid.path([hero.cx, hero.cy], goal, { blocked: (x, y) => !!foeAt(x, y) });
          const q = p.length > 1 ? p : grid.path([hero.cx, hero.cy], goal, { ends: true });
          if (q.length > 1 && !heroAct({ move: [q[1][0] - hero.cx, q[1][1] - hero.cy] })) heroAct({ wait: true });
          else if (q.length <= 1) heroAct({ wait: true });
        }
      }
      game.advance(.5);
      return { floors: Math.min(reached, floors), depth, mode, kills: stats.kills, turns: stats.turns, level: hero.lv, errors: game.errors.length };
    } finally { Math.random = was; }
  }

  return { view: 'threequarter', views: ['threequarter', 'iso'], input: 'DEFAULT', res: 'ps1', pausable: true, propSize: 1.1, touch: ['attack', 'skill', 'dash'],
    camera: { zoom: [.75, 2], start: 1, tall: 1.25 }, enter: start, update, draw, bot,
    exit() { L.enabled = false; game.cam.bounds = null; },
    state: () => ({ depth, hero, foes, items, mode, turns, grid, fog }),   // for tests
    /** the proof: steps about the first floor, a wait, a potion; the monsters on their turns; a hash of the run */
    run: (n = 600) => proof('roguelike', n, (i, k) => { walk(i, k, ['right', 'down', 'left', 'up'], 45); if (i % 70 === 30) k.tap('attack'); if (i === 300) k.tap('skill'); },
      () => [depth, hero.cx, hero.cy, hero.hp, hero.potions, stats.turns, foes.map(f => [f.cx, f.cy, f.hp, f.dead])]) };
})();
scenes.roguelike = ROGUE;
