/* ============================== GAME START ==============================
 * MY-3D2DGE STARTER: a title menu and four vertical slices. Each slice is a complete
 * small game, written to be copied and changed:
 *   SLICE 1  ADVENTURE   top-down action adventure (Zelda, Secret of Mana): rooms, sword,
 *                        key and locked door, NPC dialog, hearts, rupees, torch lighting
 *   SLICE 2  PLATFORMER  side-scroller (Mario, Mega Man): E.PlatformMap + E.Platformer,
 *                        stomp and shoot, ? blocks, ladder, moving platform, 2.5D view (V)
 *   SLICE 3  SHOOTER     vertical shoot-'em-up (1942, Xevious): E.Bullets, waves, boss
 *   SLICE 4  RPG BATTLE  turn-based battle (Dragon Quest, Final Fantasy): E.Menu, turns
 *   SLICE 5  BRAWLER     beat-'em-up (Final Fight, Streets of Rage): E.Combo punches, kicks,
 *                        knockback, depth lanes, waves that lock the screen, a boss
 * To make your own game: copy the slice closest to your genre, then replace everything
 * between GAME START and GAME END with ONLY your game: its own title, play and game-over
 * scenes. Delete this menu and the slices you do not use. Deep links: #adventure (etc.).
 * ======================================================================== */
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;

/* ---- SHELL: one game, several scenes. Each slice switches view, keys and resolution on entry ---- */
const game = new E.Game({ canvas: 'screen', res: 'snes', view: 'threequarter', bg: '#07060d' });
const P = game.particles, L = game.lights, A = game.audio;
const scenes = {};
let gpu = null;                               // WebGPU lighting, used by the adventure slice only
const best = (k, v) => { const old = E.store.get('best:' + k, 0); if (v > old) E.store.set('best:' + k, v); return Math.max(old, v); };
const SLICES = [
  { id: 'adventure', label: 'ADVENTURE', about: 'TOP-DOWN ACTION ADVENTURE' },
  { id: 'platformer', label: 'PLATFORMER', about: 'SIDE-SCROLLING PLATFORMER' },
  { id: 'brawler', label: 'BRAWLER', about: 'SIDE-SCROLLING BEAT-EM-UP' },
  { id: 'shooter', label: 'SHOOTER', about: 'VERTICAL SHOOT-EM-UP' },
  { id: 'rpg', label: 'RPG BATTLE', about: 'TURN-BASED BATTLE' }
];
/* keys every slice shares: V changes the camera view, G toggles GPU lighting, M mutes */
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'KeyV') game.nextView();
  else if (e.code === 'KeyM') A.mute();
  else if (e.code === 'KeyG' && gpu) gpu.enabled = !gpu.enabled;
});

/* ---- TITLE: a menu, a spinning rig and a slime, to show that characters are 3D puppets ---- */
const mascot = new E.Humanoid({ hat: { style: 'pointed', color: '#3aa050' }, colors: { cloth: '#2f8f86', cape: '#c8452f' }, cape: { len: 6, width: 5, seg: 2.5 } });
const titleSlime = new E.Blob({ R: 6 });
const titleMenu = new E.Menu(game, SLICES.map(s => s.label), { y: 104, onPick: i => game.go(SLICES[i].id) });
scenes.title = {
  view: 'threequarter', views: ['threequarter', 'iso', 'topdown', 'brawler', 'side'], input: 'DEFAULT', res: 'snes',
  enter() { A.music('title'); game.focus(0, 0, 0); game.cam.room = null; game.cam.bounds = null; if (gpu) gpu.enabled = false; L.enabled = false; },
  update(dt) {
    titleMenu.update(dt);
    const t = game.time;
    mascot.update(dt, { x: -60, y: 18, facing: t * .9, vx: Math.cos(t * .9) * 30, vy: Math.sin(t * .9) * 30 });
    titleSlime.update(dt, { squash: Math.sin(t * 5) * .25, look: [Math.cos(t), Math.sin(t)] });
  },
  draw(r) {
    r.sky(['#0c0a24', '#2a1f5c', '#6a3a78', '#d8786a']);
    r.starfield({ count: 50, speed: 4 });
    r.shadow(-60, 18, 5, .5); r.shadow(60, 18, 5, .5);
    r.actor(-60, 18, 0, (g, ox, oy) => mascot.draw(g, ox, oy, r.view));
    r.actor(60, 18, 0, (g, ox, oy) => titleSlime.draw(g, ox, oy, r.view));
    r.text('MY-3D2DGE', r.W / 2, 22, '#ffd36a', { align: 'center', scale: 3 });
    r.text('MY "3D" 2D GAME ENGINE', r.W / 2, 44, '#c9c0e0', { align: 'center' });
    titleMenu.draw(r);
    r.text(SLICES[titleMenu.i].about, r.W / 2, r.H - 30, '#ffe7a8', { align: 'center' });
    r.text('ARROWS + ENTER.  V VIEW  M MUTE  ? API', r.W / 2, r.H - 16, '#8a82a8', { align: 'center' });
  }
};

/* ---- GAME OVER: shared by every slice ---- */
const overMenu = new E.Menu(game, ['RETRY', 'TITLE'], { y: 120, onPick: i => game.go(i === 0 ? overMenu.from : 'title') });
scenes.over = {
  view: 'threequarter', input: 'DEFAULT', res: 'snes',
  enter(d) { overMenu.from = d.from; overMenu.i = 0; A.music(null); A.sfx('die'); if (gpu) gpu.enabled = false; L.enabled = false; },
  update(dt) { overMenu.update(dt); },
  draw(r) { r.sky(['#1a0610', '#3a0c1c']); r.text('GAME OVER', r.W / 2, 70, '#ff6a5a', { align: 'center', scale: 3 }); overMenu.draw(r); }
};

/* =====================================================================================
 * SLICE 1  ADVENTURE  (top-down action adventure)
 * Three rooms side by side. The camera moves room by room (game.cam.room) and gameplay
 * waits while it slides (game.cam.moving). Talk to the elder, clear the slimes, take the
 * key, open the door in the east room and claim the relic.
 * ===================================================================================== */
const ADV = (() => {
  const T = 16, ROOM = [10 * T, 8 * T];
  // three 10 x 8 rooms side by side. Rows 3 and 4 are the doorways; 'D' is the locked door, 'R' the relic
  const ROWS = [
    '##############################',
    '#r.t..t.r##.s....~~##s....#R.#',
    '#........##......~~##.....#..#',
    '#..M........b.....o.......#D##',
    '#...............k............#',
    '#.@......##.b....s.##..o...s.#',
    '#r......r##r.......##r......r#',
    '##############################'
  ];
  const LEGEND = { '#': 1, 'b': 2, '~': 3, 'D': 4, '@': 'hero', 'M': 'elder', 't': 'torch', 'r': 'rupee', 's': 'slime', 'o': 'spitter', 'k': 'key', 'R': 'relic' };
  const TYPES = {
    1: { h: 34, cut: true, cutH: 7, top: '#57506a', side: '#3d3750', line: '#2a2538', course: 8 },
    2: { h: 10, top: '#4f8a44', side: '#35613a', line: '#28482c', course: 5 },         // low bush block: blocks walking
    3: { h: 3, top: '#2f6fc0', side: '#24508a', line: '#1c3e6a', course: 3 },          // water: a very low block you cannot enter
    4: { h: 30, top: '#8a5a2a', side: '#6a4020', line: '#3a2410', course: 6 }          // locked door
  };
  const STONE = { stones: ['#4b4559', '#554f64', '#433e51', '#5d566c'].map(E.hex), mortar: E.hex('#221e2b'), hi: E.hex('#6f6782'), lo: E.hex('#322d3e'), speck: E.hex('#2a2634') };
  const RUNE = [...E.hex('#6fd6cc'), 1];
  const floorTex = (x, y) => { const cx = 24.5 * T, cy = 1.5 * T; return Math.abs(Math.hypot(x - cx, y - cy) - 12) < .7 ? RUNE : E.tex.flagstone(x, y, STONE); };
  // pixel sprites for small things ('.' is transparent)
  const RUPEE = E.sprite(['..g..', '.gGg.', 'gGWGg', 'gGGGg', '.gGg.', '..g..'], { g: '#1e8a3a', G: '#46d060', W: '#d8ffe0' });
  const KEY = E.sprite(['.yy....', 'y..y...', '.yyyyyy', '.....y.', '.....yy'], { y: '#f0c030' });
  const RELIC = E.sprite(['...y...', '..yYy..', '.yYYYy.', 'yYYYYYy', '.yyyyy.'], { y: '#e0a020', Y: '#fff0a0' }, 2);
  const HEART = E.sprite(['.R.R.', 'RRRRR', '.RRR.', '..R..'], { R: '#e8384a' });
  let map, hero, elder, foes, items, torches, shots, talk, won, keys, rupees;
  const roomOf = (x, y) => Math.floor(x / ROOM[0]) + Math.floor(y / ROOM[1]) * 10;

  function start() {
    map = new E.TileMap({ rows: ROWS, legend: LEGEND, types: TYPES, floorTex });
    game.cam.bounds = v => map.bounds(v);
    game.cam.room = ROOM;                        // screen-by-screen camera like the NES original
    const h0 = map.find('hero');
    hero = new E.Body({ x: h0.x, y: h0.y, r: 4.5, friction: 0 });
    Object.assign(hero, { hp: 3, max: 3, facing: 0, inv: 0, hurt: 0,
      slash: new E.Attack({ a0: 1.6, a1: -1.7, z0: 12, z1: 9, reach: 7.5, wind: .05, active: .1, recover: .16 }),
      rig: new E.Humanoid({ hat: { style: 'pointed', color: '#3aa050' }, colors: { cloth: '#3aa050', pants: '#6a4a2a', hair: '#d8a040' } }) });
    const e0 = map.find('elder');
    elder = { x: e0.x, y: e0.y, rig: new E.Humanoid({ weapon: null, hood: true, hunch: .35, colors: { cloth: '#b03a3a', hair: '#e8e0d0', skin: '#e8c0a0' } }) };
    elder.rig.update(0, { x: elder.x, y: elder.y, facing: Math.PI / 2 });
    torches = map.findAll('torch').map(t => ({ x: t.x, y: t.y, r: 4, t: Math.random() * 9 }));
    items = [...map.findAll('rupee').map(s => ({ kind: 'rupee', x: s.x, y: s.y, z: 0 })), ...['key', 'relic'].map(k => ({ kind: k, x: map.find(k).x, y: map.find(k).y, z: 0 }))];
    foes = [...map.findAll('slime'), ...map.findAll('spitter')].map(makeFoe);
    shots = new E.Bullets(game, { plane: 'ground' });
    talk = new E.Dialog(game);
    won = false; keys = 0; rupees = 0;
    L.enabled = true; L.ambient = .42;
    if (!gpu) gpu = game.enableGPU({ map, ambient: [.3, .28, .38], wrap: .5 });
    gpu.map = map; gpu.enabled = true;
    A.music('dungeon');
  }
  function makeFoe(s) {
    const spit = s.tag === 'spitter';
    const f = new E.Body({ x: s.x, y: s.y, r: 5.5, friction: 6 });
    return Object.assign(f, { kind: s.tag, hp: spit ? 3 : 2, t: Math.random(), flash: 0, room: roomOf(s.x, s.y),
      blob: new E.Blob({ R: spit ? 6.5 : 5.5, colors: spit ? { dk: '#4a2a78', base: '#8a5ad0', lt: '#c8a8ff' } : { dk: '#2a6a2a', base: '#4ab84a', lt: '#a8f0a0' } }) });
  }
  function hurtHero(ang) {
    if (hero.inv > 0 || won) return;
    hero.hp -= .5; hero.inv = 1; hero.hurt = .25; hero.slash.cancel();
    hero.push(Math.cos(ang) * 160, Math.sin(ang) * 160);
    game.freeze(.06); game.shake(3); A.sfx('hurt'); P.text(hero.x, hero.y, 26, '-1/2', '#ff7a6a');
    if (hero.hp <= 0) game.after(.6, () => game.go('over', { from: 'adventure' }));
  }
  function update(dt) {
    if (talk.update(dt)) return;                             // the dialog box pauses the world
    if (game.cam.moving) { hero.rig.update(dt, { x: hero.x, y: hero.y, facing: hero.facing }); return; }   // room slide
    const inp = game.input, h = hero, room = roomOf(h.x, h.y);
    h.inv -= dt; h.hurt -= dt;
    if (h.hp <= 0) return;
    // talk to the elder: walk up and press confirm (Enter / Space / J)
    const nearElder = E.dist(h, elder) < 22;
    if (nearElder && inp.pressed('confirm')) {
      talk.say(['THE RELIC SLEEPS IN THE EAST ROOM, BEHIND A LOCKED DOOR.', 'SLIMES GUARD THE KEY. STRIKE WITH J, AND KEEP MOVING!'], { name: 'ELDER' });
      return;
    }
    // move: screen-relative keys become a ground direction for the current view
    const mv = inp.move(), md = game.view.screenDirToGround(mv[0], mv[1]);
    if (Math.hypot(md[0], md[1]) > .1 && !h.slash.busy) h.facing = Math.atan2(md[1], md[0]);
    const sp = h.slash.busy ? 20 : 76;
    if (h.hurt <= 0) { h.vx = approach(h.vx, md[0] * sp, 900 * dt); h.vy = approach(h.vy, md[1] * sp, 900 * dt); }
    else { h.vx = approach(h.vx, 0, 400 * dt); h.vy = approach(h.vy, 0, 400 * dt); }
    // sword: E.Attack runs wind -> active -> recover; hits land once per swing in a cone during 'active'
    if (inp.buffered('attack') && h.slash.start()) { inp.consume('attack'); A.sfx('swing'); }
    h.slash.update(dt);
    h.slash.hits(foes, f => E.inArc(h, h.facing, f, 22, 1.4), f => {
      f.hp--; f.flash = .12; const an = E.angleTo(h, f); f.push(Math.cos(an) * 220, Math.sin(an) * 220, 60);
      game.freeze(.05); game.shake(2); A.sfx('hit'); P.sparks(lerp(h.x, f.x, .6), lerp(h.y, f.y, .6), 9, 8, an);
      if (f.hp <= 0) { f.dead = true; P.bits(f.x, f.y, 6, 14, [f.blob.C.base, f.blob.C.lt]); P.ring(f.x, f.y, 3, 18, '#fff3c4', .35); if (E.chance(.5)) items.push({ kind: 'heart', x: f.x, y: f.y, z: 0 }); }
    });
    h.update(dt, map);
    // doors: touch the locked door with a key
    const d = map.find('relic');
    if (keys > 0 && map.cell(d.cx, d.cy + 2) === 4 && Math.hypot(h.x - d.x, h.y - (d.y + 2 * T)) < 16) { map.set(d.cx, d.cy + 2, 0); keys--; A.sfx('door'); game.shake(2); }
    // pickups
    for (const it of items) if (!it.got && Math.hypot(it.x - h.x, it.y - h.y) < 9) {
      it.got = true;
      if (it.kind === 'rupee') { rupees++; A.sfx('coin'); }
      else if (it.kind === 'heart') { h.hp = Math.min(h.max, h.hp + 1); A.sfx('heal'); }
      else if (it.kind === 'key') { keys++; A.sfx('key'); talk.say('YOU GOT A SMALL KEY!'); }
      else if (it.kind === 'relic') { won = true; A.music('victory'); game.after(5, () => game.go('title')); }
    }
    // enemies act only in the hero's room, like the originals
    for (const f of foes) {
      if (f.dead) continue;
      f.flash -= dt; f.t -= dt;
      const active = f.room === room && !won, dx = h.x - f.x, dy = h.y - f.y, dd = Math.hypot(dx, dy) || 1;
      if (active && f.onGround && f.t <= 0) {
        if (f.kind === 'slime') { f.t = .7 + Math.random() * .6; f.push(dx / dd * 70, dy / dd * 70, 0); f.jump(150); f.blob.kick(4); }
        else { f.t = 1.8; const v = E.pattern.aim(f, h, 95); shots.fire({ x: f.x, y: f.y, z: 7, vx: v[0], vy: v[1], r: 2.5, team: 'foe', color: '#c8a8ff' }); A.sfx('shoot', { pitch: .7 }); f.blob.kick(3); }
      }
      const wasAir = !f.onGround;
      f.update(dt, map);
      if (wasAir && f.landed) f.blob.kick(-4);
      f.blob.update(dt, { squash: f.onGround ? 0 : clamp(f.vz / 600, -.2, .25), look: [dx, dy] });
      if (active && f.z < 6 && E.overlap(f, h)) hurtHero(Math.atan2(dy, dx));
    }
    shots.update(dt, map);
    shots.hit([h], (b) => hurtHero(Math.atan2(b.vy, b.vx)), 'foe');
    for (const t of torches) { t.t += dt; if (Math.random() < dt * 8) P.add({ kind: 'ember', x: t.x, y: t.y, z: 14, vx: (Math.random() - .5) * 8, vy: (Math.random() - .5) * 8, vz: 20 + Math.random() * 20, max: 1, color: '#ff8a3a' }); }
    h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, hurt: h.hurt > 0, attack: h.slash.state });
    game.focus(h.x, h.y, 10);
  }
  function drawTorch(g, r, t) {
    r.box(g, t.x - 3, t.y - 3, 0, t.x + 3, t.y + 3, 8, '#5d566f', '#433d55');
    px.glow(g, 1);
    px.poly(g, r.groundPts(t.x, t.y, 3.5, 10, 9), '#ff8a3c');
    const [x0, y0] = r.w(t.x, t.y, 9), [tx, ty] = r.w(t.x + Math.sin(t.t * 7) * 1.2, t.y, 17 + Math.sin(t.t * 11) * 1.5), w = 2.4 * r.view.scale;
    px.poly(g, [[x0 - w, y0], [tx, ty], [x0 + w, y0]], '#ff7a2a'); px.poly(g, [[x0 - w * .5, y0], [(x0 + tx) / 2, (y0 + ty) / 2], [x0 + w * .5, y0]], '#ffd36a');
  }
  function draw(r) {
    const view = r.view, h = hero;
    map.drawFloor(r);
    r.shadow(h.x, h.y, 5, .5, '#000', h.groundZ);
    r.shadow(elder.x, elder.y, 5, .5);
    for (const f of foes) if (!f.dead) r.shadow(f.x, f.y, 5, .45, '#000', f.groundZ);
    map.queueWalls(r);
    for (const t of torches) {
      r.queue(t.x, t.y, 0, g => drawTorch(g, r, t));
      L.add(t.x, t.y, 16, 110, 1.1 + Math.sin(t.t * 13) * .06, { color: '#ff9a4a', shadow: true }); L.caster(t.x, t.y, 3, 9); L.heat(t.x, t.y, 18, 6, 1);
    }
    const bob = Math.sin(game.time * 4) * 1.5;
    for (const it of items) if (!it.got) {
      const spr = it.kind === 'rupee' ? RUPEE : it.kind === 'key' ? KEY : it.kind === 'heart' ? HEART : RELIC;
      if (it.kind === 'relic') { r.sprite(it.x, it.y, 6 + bob, spr, { glow: 1 }); L.add(it.x, it.y, 10, 60, .9, { color: '#ffd36a' }); }
      else r.sprite(it.x, it.y, 2 + bob, spr, { glow: it.kind === 'rupee' ? .5 : 0 });
    }
    r.actor(elder.x, elder.y, 0, (g, ox, oy) => elder.rig.draw(g, ox, oy, view));
    if (E.dist(h, elder) < 22 && !talk.open) r.textAt(elder.x, elder.y, 34, 'TALK: ENTER', '#ffe08a');
    for (const f of foes) if (!f.dead) { r.actor(f.x, f.y, f.z, (g, ox, oy) => f.blob.draw(g, ox, oy, view), { flash: f.flash > 0 }); L.caster(f.x, f.y, 4, f.z + 10); }
    if (h.hp > 0) {
      const blink = h.inv > 0 && Math.floor(game.real * 16) % 2 === 0;
      r.actor(h.x, h.y, h.z, (g, ox, oy) => h.rig.draw(g, ox, oy, view), { xray: true, alpha: blink ? .4 : 1, flash: h.hurt > .15 ? '#ffb0a0' : false });
      h.rig.drawSmear(r); L.add(h.x, h.y, 14, 70, .5, { color: '#d8d0ff' }); L.caster(h.x, h.y, 3, 24);
    }
    shots.draw(r);
    // HUD: a black strip at the top, like the originals
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, 14, '#07060d');
      E.ui.hearts(g, 4, 4, h.hp, h.max);
      px.sprite(g, RUPEE, 46, 4); E.font.text(g, 'x' + rupees, 53, 5, '#ffffff', false);
      px.sprite(g, KEY, 76, 4); E.font.text(g, 'x' + keys, 85, 5, '#ffffff', false);
      E.font.text(g, 'J SWORD  ENTER TALK  V VIEW', r.W - 4, 5, '#8a82a8', { align: 'right', outline: false });
      if (won) { E.ui.box(g, r.W / 2 - 80, r.H / 2 - 16, 160, 30); E.font.text(g, 'YOU FOUND THE RELIC!', r.W / 2, r.H / 2 - 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, 'RUPEES: ' + rupees + '   BEST: ' + best('adventure', rupees), r.W / 2, r.H / 2 + 2, '#ffffff', { align: 'center', outline: false }); }
    });
    talk.draw(r);
  }
  return { view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: 'DEFAULT', res: 'snes', pausable: true, touch: ['attack', 'confirm'], enter: start, update, draw,
    exit() { game.cam.room = null; if (gpu) gpu.enabled = false; L.enabled = false; } };
})();
scenes.adventure = ADV;

/* =====================================================================================
 * SLICE 2  PLATFORMER  (side-scroller)
 * E.PlatformMap holds the level (ASCII, top row first). E.Platformer moves the hero with
 * modern controls. Stomp walkers, shoot (X / J), bump ? blocks and bricks from below,
 * ride the lift over the pit, climb the ladder, reach the flag. V switches to a 2.5D view.
 * ===================================================================================== */
const PLAT = (() => {
  const T = 16;
  const ROWS = [
    '                                                                                    ',
    '                                                                                    ',
    '                                                                            X       ',
    '                                 ?             c c c c                     XX       ',
    '      ?B?B         ccc                        HXXXXXXXXX                  XXX       ',
    '                               BB?BB          H            c    c        XXXX       ',
    '                                              H           ===  ===      XXXXX       ',
    '   c c              m       PP        PP      H                        XXXXXX   c   ',
    ' @  /#\\     g               PP   g    PP g    H     t                 XXXXXXX     F ',
    '################          ################################^^^^^^^^##################',
    '################          ##########################################################'
  ];
  const LEGEND = { '#': 1, 'X': 2, 'B': 3, '?': 4, 'U': 5, '=': 6, 'H': 7, '^': 8, 'P': 9, '/': 10, '\\': 11, '@': 'hero', 'c': 'coin', 'g': 'walker', 't': 'turret', 'm': 'lift', 'F': 'flag' };
  const TYPES = {
    1: { style: 'ground', side: '#8a5a32', top: '#5fbf4a' },
    2: { style: 'block', side: '#b07a48' },
    3: { style: 'brick', side: '#c0602f', line: '#6a2a14' },
    4: { style: 'bonus', side: '#e8a830', glyph: '?' },
    5: { style: 'block', side: '#7a5a40' },                 // used ? block
    6: { kind: 'oneway', side: '#b07a40' },
    7: { kind: 'ladder', side: '#d8a048' },
    8: { kind: 'hazard', style: 'spikes', side: '#c8d0e0' },
    9: { style: 'pipe', side: '#3aa050' },
    10: { kind: 'slope', dir: 1, side: '#8a5a32', top: '#5fbf4a' },   // '/' ramp up
    11: { kind: 'slope', dir: -1, side: '#8a5a32', top: '#5fbf4a' }   // '\\' ramp down
  };
  const COIN = E.sprite(['.yy.', 'yYyy', 'yYyy', 'yYyy', '.yy.'], { y: '#f0b020', Y: '#fff0a0' });
  const FLAG = E.sprite(['wRRRRR', 'wRRRR.', 'wRRR..', 'w.....', 'w.....', 'w.....', 'w.....', 'w.....', 'w.....', 'w.....', 'w.....', 'w.....'], { w: '#e8e8e8', R: '#e83838' }, 2);
  let level, hero, rig, walkers, turrets, coins, lift, shots, lives, score, nCoins, hp, inv, clear, spawn;
  const WALK = { w: 12, h: 11 };
  function reset(full) {
    if (full) { level = new E.PlatformMap({ rows: ROWS, legend: LEGEND, types: TYPES }); lives = 3; score = 0; nCoins = 0;
      coins = level.findAll('coin').map(c => ({ x: c.x, z: c.z + 3, w: 8, h: 10 }));
      walkers = level.findAll('walker').map(s => ({ x: s.x, z: s.z, vx: -28, vz: 0, w: WALK.w, h: WALK.h, dead: 0, blob: new E.Blob({ R: 6, colors: { dk: '#5a2a14', base: '#a8602a', lt: '#e0a060' } }) }));
      turrets = level.findAll('turret').map(s => ({ x: s.x, z: s.z, w: 14, h: 12, hp: 3, t: 1, flash: 0 }));
      const m = level.find('lift'); lift = { x0: m.x, x: m.x, z: m.z, w: 40, h: 6, vx: 0, vz: 0, t: 0 };
      spawn = level.find('hero'); clear = false; }
    hero = new E.Platformer({ x: spawn.x, z: spawn.z, w: 8, h: 22 });
    rig = rig || new E.Humanoid({ weapon: 'gun', hat: { style: 'cap', color: '#d83a2a' }, colors: { cloth: '#d83a2a', pants: '#2f5fd0', hair: '#3a2418' } });
    hp = 3; inv = 1.5;
    game.follow(hero, { z: 30, lead: 20 });            // the camera tracks the hero (looking ahead of it) from now on
    shots = shots || new E.Bullets(game, { plane: 'side' }); shots.clear();
  }
  function hurt(dir) {
    if (inv > 0 || clear) return;
    hp--; inv = 1.2; hero.knock(dir); A.sfx('hurt'); game.shake(3); game.freeze(.05);
    if (hp <= 0) die();
  }
  function die() {
    lives--; A.sfx('die'); P.bits(hero.x, 0, hero.z + 10, 16, ['#d83a2a', '#2f5fd0', '#f1c7a0']);
    if (lives <= 0) { game.after(.8, () => game.go('over', { from: 'platformer' })); hero.dead = true; return; }
    reset(false);
  }
  function update(dt) {
    if (hero.dead) return;
    const inp = game.input;
    inv -= dt;
    // the lift glides back and forth over the pit; the level carries whoever stands on it
    lift.t += dt; const nx = lift.x0 + Math.sin(lift.t * .9) * 56; lift.vx = (nx - lift.x) / dt; lift.x = nx;
    if (!clear) hero.update(dt, level, inp, [lift]);
    else hero.update(dt, level, { x: .4 }, [lift]);
    if (hero.jumped) A.sfx('jump');
    if (hero.landed) A.sfx('land');
    // bump blocks from below: ? gives a coin and turns used, bricks break
    if (hero.bumped) {
      const { cx, cz, id } = hero.bumped;
      if (id === 4) { level.set(cx, cz, 5); nCoins++; score += 100; A.sfx('coin'); P.add({ kind: 'bit', x: (cx + .5) * T, y: 0, z: (cz + 1) * T, vz: 160, g: 500, max: .45, size: 2, color: '#f0c030' }); }
      else if (id === 3) { level.set(cx, cz, 0); score += 50; A.sfx('bump'); P.bits((cx + .5) * T, 0, (cz + .5) * T, 10, ['#c0602f', '#6a2a14']); }
      else A.sfx('bump', { vol: .5 });
    }
    // shoot (max 3 shots on screen, like the originals)
    if (inp.pressed('attack') && shots.list.length < 3 && !clear) { const t = rig.tip(); shots.fire({ x: t[0], y: 0, z: t[2], vx: hero.facing * 280, r: 2.5, life: .9, team: 'hero', color: '#ffe066' }); A.sfx('shoot'); }
    shots.update(dt, level);
    // coins
    for (const c of coins) if (!c.got && E.overlapBox(hero, c)) { c.got = true; nCoins++; score += 100; A.sfx('coin'); }
    // walkers: patrol, turn at walls and ledges; stomp them or shoot them
    for (const w of walkers) {
      if (w.dead) { w.dead -= dt; continue; }
      if (Math.abs(w.x - hero.x) > 260) continue;          // sleep until near, like NES enemies
      w.vz -= 900 * dt; const vx0 = w.vx;
      level.move(w, dt);
      const ahead = level.groundBelow(w.x + Math.sign(vx0) * 8, w.z + 1);
      if (w.hitWall || (w.onGround && (ahead === null || ahead < w.z - 1))) w.vx = -vx0;
      w.blob.update(dt, { squash: Math.sin(game.time * 10 + w.x) * .12, look: [Math.sign(w.vx), 0] });
      if (E.overlapBox(hero, w)) {
        if (hero.vz < 0 && hero.z > w.z + w.h * .45) { w.dead = 99; hero.vz = 210; score += 200; A.sfx('stomp'); P.dust(w.x, 0, w.z, 8); w.blob.kick(-6); }
        else hurt(hero.x < w.x ? -1 : 1);
      }
    }
    shots.hit(walkers.filter(w => !w.dead), (b, w) => { w.dead = 99; score += 200; A.sfx('hit'); P.bits(w.x, 0, w.z + 6, 8, ['#a8602a', '#e0a060']); }, 'hero');
    // turrets fire at the hero when it is close
    for (const t of turrets) {
      if (t.hp <= 0) continue; t.t -= dt; t.flash -= dt;
      if (t.t <= 0 && Math.abs(t.x - hero.x) < 170) { t.t = 1.6; const v = E.pattern.aimSide({ x: t.x, z: t.z + 8 }, { x: hero.x, z: hero.z + 12 }, 110); shots.fire({ x: t.x, y: 0, z: t.z + 8, vx: v[0], vz: v[1], r: 2.5, life: 2, team: 'foe', color: '#ff7a5a' }); A.sfx('laser', { vol: .6 }); }
      if (E.overlapBox(hero, t)) hurt(hero.x < t.x ? -1 : 1);
    }
    shots.hit(turrets.filter(t => t.hp > 0), (b, t) => { t.hp--; t.flash = .1; A.sfx('hit'); if (t.hp <= 0) { score += 500; A.sfx('explode'); P.bits(t.x, 0, t.z + 6, 14, ['#8a8aa0', '#ff7a5a']); game.shake(3); } }, 'hero');
    shots.hit([hero], b => hurt(b.vx > 0 ? 1 : -1), 'foe');
    // hazards and pits
    if (!clear && (level.touching(hero, 'hazard') || hero.z < -40)) { hp = 0; die(); }
    // goal
    const f = level.find('flag');
    if (!clear && Math.abs(hero.x - f.x) < 10) { clear = true; score += 1000; A.music('victory'); game.after(5, () => game.go('title')); }
    rig.update(dt, hero.rigState({ point: inp.down('attack') }));
  }
  function drawBack(r) {
    r.sky(['#3a78d8', '#78b8f0', '#b8e0f8']);
    // parallax hills: drawn in screen space, scrolled at a third of the camera speed
    const par = (k, col, y, rad) => { const off = (r.ix * k) % 160; for (let i = -1; i < r.W / 160 + 2; i++) px.ell(r.ctx, i * 160 - off + 40, r.H - y, rad, rad * .55, col); };
    par(.25, '#8ac8a8', 58, 70); par(.45, '#5aa878', 34, 52);
  }
  function draw(r) {
    const view = r.view;
    drawBack(r);
    level.draw(r);
    const tilted = view.pitchDeg > 5, shadow = (x, z) => { if (!tilted) return; const gz = level.groundBelow(x, z); if (gz !== null) r.shadow(x, 0, 5, .35, '#000', gz); };
    r.queue(lift.x, 0, lift.z, g => r.box(g, lift.x - lift.w / 2, -8, lift.z, lift.x + lift.w / 2, 8, lift.z + lift.h, '#d8dce8', '#8a90a8'));
    const bob = Math.sin(game.time * 5) > 0 ? 1 : 0;
    for (const c of coins) if (!c.got) r.sprite(c.x, 0, c.z + bob, COIN, { glow: .6 });
    const f = level.find('flag'); r.sprite(f.x, 0, f.z, FLAG);
    for (const w of walkers) if (!w.dead) { shadow(w.x, w.z); r.actor(w.x, 0, w.z, (g, ox, oy) => w.blob.draw(g, ox, oy, view)); }
    for (const t of turrets) if (t.hp > 0) r.queue(t.x, 0, t.z, g => { r.box(g, t.x - 7, -6, t.z, t.x + 7, 6, t.z + 10, t.flash > 0 ? '#ffffff' : '#9aa0b8', '#5a6078'); const face = hero.x < t.x ? -1 : 1, [a, b] = r.w(t.x + face * 4, 0, t.z + 8), [c2, d2] = r.w(t.x + face * 11, 0, t.z + 8); px.line(g, a, b, c2, d2, '#3a3f58', 3); });
    if (!hero.dead) {
      shadow(hero.x, hero.z);
      const blink = inv > 0 && Math.floor(game.real * 16) % 2 === 0;
      r.actor(hero.x, 0, hero.z, (g, ox, oy) => rig.draw(g, ox, oy, view), { alpha: blink ? .4 : 1 });
    }
    shots.draw(r);
    r.overlay(g => {
      E.font.text(g, 'SCORE ' + String(score).padStart(6, '0'), 6, 5, '#ffffff');
      E.font.text(g, 'COINS ' + nCoins, 90, 5, '#ffe066');
      E.font.text(g, 'LIVES ' + lives, 150, 5, '#ffffff');
      E.ui.hearts(g, r.W - 30, 4, hp, 3);
      E.font.text(g, 'SPACE JUMP  X SHOOT  V 2.5D', r.W / 2, r.H - 9, '#ffffff', { align: 'center' });
      if (clear) { E.ui.box(g, r.W / 2 - 70, r.H / 2 - 20, 140, 30); E.font.text(g, 'COURSE CLEAR!', r.W / 2, r.H / 2 - 12, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, 'SCORE ' + score + '  BEST ' + best('platformer', score), r.W / 2, r.H / 2 - 2, '#ffffff', { align: 'center', outline: false }); }
    });
  }
  return { view: 'side', views: ['side', 'brawler'], input: 'PLATFORMER', res: 'genesis', pausable: true, touch: ['jump', 'attack'],
    enter() { reset(true); game.cam.bounds = v => level.bounds(v); A.music('adventure'); L.enabled = false; }, update, draw };
})();
scenes.platformer = PLAT;

/* =====================================================================================
 * SLICE 3  SHOOTER  (vertical shoot-'em-up)
 * The built-in 'overhead' view (pitch 90, scale 1) makes world x/y equal screen pixels, so the
 * playfield is simply 0..W by 0..H. The stars scroll; enemies arrive on a timeline.
 * Hold fire for autofire, X is a bomb that clears enemy bullets.
 * ===================================================================================== */
const SHOOT = (() => {
  const W = 224, H = 256;                       // 'overhead' is a built-in view: pitch 90, scale 1
  const PAL = { w: '#e8f0ff', b: '#4a8ae0', d: '#2a4a90', r: '#e84a3a', y: '#ffd040', g: '#8a90a8', k: '#3a3f58', p: '#b05ae0', o: '#ff9a3a' };
  const SHIP = E.sprite(['.....w.....', '....wbw....', '....wbw....', '...wwbww...', 'r..wbbbw..r', 'w.wbbwbbw.w', 'wwbbwwwbbww', 'wbbbbbbbbbw', 'w.d.ddd.d.w', '...o...o...'], PAL, 2);
  const LIFE = E.sprite(['..w..', '.wbw.', 'wbbbw', 'w.d.w'], PAL);
  const FIGHTER = E.sprite(['r.....r', 'rr...rr', '.rrgrr.', '..rkr..', '...r...'], PAL, 2);
  const DIVER = E.sprite(['p.....p', '.p...p.', '.ppgpp.', 'ppkkkpp', '..p.p..'], PAL, 2);
  const TANK = E.sprite(['.ggggggg.', 'gkkkkkkkg', 'gkgyygkgg', 'gkgyygkgg', 'gkkkkkkkg', '.ggggggg.', '...k.k...'], PAL, 3);
  const BOSS = E.sprite(['......rrrrrrrr......', '...rrrggggggggrrr...', '.rrggkkkkkkkkkkggrr.', 'rggkkyykkkkkkyykkggr', 'rgkkkyykkrrkkyykkkgr', 'rggkkkkkrrrrkkkkkggr', '.rrggggkkkkkkggggrr.', '...rr.gggggggg.rr...', '.....rr..rr..rr.....'], PAL, 3);
  const POWER = E.sprite(['.yyy.', 'yywyy', 'ywwwy', 'yywyy', '.yyy.'], PAL, 2);
  let ship, foes, shots, t, wave, lives, bombs, score, power, boss, won, fireT;
  // the stage: [time in seconds, what to spawn]
  const TIMELINE = [
    [1, () => line('fighter', 5, 40)], [4, () => line('fighter', 5, 184)], [7, () => vee('diver')], [10, () => spawn('tank', 112, -20)],
    [13, () => line('fighter', 6, 70)], [15, () => line('fighter', 6, 150)], [18, () => vee('diver')], [20, () => { spawn('tank', 60, -20); spawn('tank', 164, -20); }],
    [24, () => line('fighter', 8, 112)], [27, () => vee('diver')], [31, () => { boss = spawn('boss', 112, -40); A.music('boss'); }]
  ];
  function spawn(kind, x, y, extra) {
    const stats = { fighter: [1, 9, 100], diver: [2, 9, 150], tank: [10, 15, 600], boss: [160, 34, 10000] }[kind];
    const f = Object.assign({ kind, x, y, z: 0, vx: 0, vy: 0, hp: stats[0], r: stats[1], pts: stats[2], t: 0, flash: 0, fire: 1 + Math.random() }, extra);
    foes.push(f); return f;
  }
  function line(kind, n, x) { for (let i = 0; i < n; i++) spawn(kind, x, -10 - i * 18, { phase: i * .5, x0: x }); }
  function vee(kind) { for (let i = 0; i < 5; i++) spawn(kind, 40 + i * 36, -10 - Math.abs(i - 2) * 16); }
  function reset() {
    ship = { x: W / 2, y: H - 30, z: 0, r: 3, inv: 2, dead: 0 };
    foes = []; shots = shots || new E.Bullets(game, { plane: 'ground', max: 900 }); shots.clear();
    t = 0; wave = 0; lives = 3; bombs = 2; score = 0; power = 0; boss = null; won = false; fireT = 0;
  }
  function explode(x, y, big) {
    P.bits(x, y, 0, big ? 30 : 10, ['#ffd040', '#ff9a3a', '#e84a3a', '#ffffff']); P.sparks(x, y, 0, big ? 20 : 8); P.ring(x, y, 2, big ? 40 : 14, '#ffe0a0', big ? .6 : .3);
    A.sfx(big ? 'boom' : 'explode'); game.shake(big ? 6 : 1.5);
  }
  function update(dt) {
    const inp = game.input;
    t += dt;
    while (wave < TIMELINE.length && t >= TIMELINE[wave][0]) TIMELINE[wave++][1]();
    // player ship
    if (ship.dead > 0) { ship.dead -= dt; if (ship.dead <= 0) { if (lives <= 0) { game.go('over', { from: 'shooter' }); return; } ship = { x: W / 2, y: H - 30, z: 0, r: 3, inv: 2.5, dead: 0 }; } }
    else {
      ship.inv -= dt;
      const mv = inp.move(); ship.x = clamp(ship.x + mv[0] * 120 * dt, 8, W - 8); ship.y = clamp(ship.y + mv[1] * 120 * dt, 16, H - 10);
      fireT -= dt;
      if (inp.down('fire') && fireT <= 0) {
        fireT = .11; A.sfx('shoot', { vol: .5 });
        const base = { x: ship.x, y: ship.y - 12, z: 0, r: 2, life: 1.2, team: 'ship', color: '#9ff0ff', core: '#ffffff' };
        shots.burst(base, power ? E.pattern.spread(-Math.PI / 2, 3, .45, 300) : [[0, -300]]);
      }
      if (inp.pressed('bomb') && bombs > 0) { bombs--; shots.clear('foe'); for (const f of foes) { f.hp -= 6; f.flash = .15; } P.ring(ship.x, ship.y, 4, 160, '#ffffff', .6); A.sfx('boom'); game.shake(5); }
    }
    // enemies
    for (const f of foes) {
      if (f.kind === 'power') continue;
      f.t += dt; f.flash -= dt; f.fire -= dt;
      if (f.kind === 'fighter') { f.y += 70 * dt; f.x = f.x0 + Math.sin(f.t * 2.2 + f.phase) * 46; }
      else if (f.kind === 'diver') { if (f.t < 1.2) f.y += 80 * dt; else { if (!f.vx && !f.vy) { const v = E.pattern.aim(f, ship, 150); f.vx = v[0]; f.vy = v[1]; } f.x += f.vx * dt; f.y += f.vy * dt; } }
      else if (f.kind === 'tank') f.y += 22 * dt;
      else if (f.kind === 'boss') { f.y = Math.min(62, f.y + 30 * dt); f.x = W / 2 + Math.sin(f.t * .7) * 70; }
      if (f.fire <= 0 && f.y > 0 && ship.dead <= 0) {
        if (f.kind === 'boss') { f.fire = .9; const n = f.hp < 80 ? 16 : 12; shots.burst({ x: f.x, y: f.y + 10, r: 2.5, life: 4, team: 'foe', color: '#ff7ad0' }, E.pattern.ring(n, 70, f.t)); if (f.t % 3 < 1) shots.burst({ x: f.x, y: f.y + 10, r: 2.5, life: 4, team: 'foe', color: '#ffd040' }, E.pattern.spread(Math.atan2(ship.y - f.y, ship.x - f.x), 5, .6, 110)); A.sfx('laser', { vol: .5 }); }
        else if (f.kind === 'tank') { f.fire = 1.6; shots.burst({ x: f.x, y: f.y + 6, r: 2.5, life: 4, team: 'foe', color: '#ff9a3a' }, E.pattern.spread(Math.PI / 2, 3, .6, 90)); }
        else { f.fire = 2 + Math.random() * 2; const v = E.pattern.aim(f, ship, 100); shots.fire({ x: f.x, y: f.y, vx: v[0], vy: v[1], r: 2, life: 4, team: 'foe', color: '#ff5a4a' }); }
      }
      if (ship.dead <= 0 && ship.inv <= 0 && E.overlap(f, ship)) { hitShip(); if (f.kind !== 'boss') f.hp = 0; }
      if (f.y > H + 30 || f.x < -40 || f.x > W + 40) f.gone = true;
    }
    shots.update(dt);
    shots.hit(foes.filter(f => f.kind !== 'power'), (b, f) => { f.hp -= 1; f.flash = .06; if (f.hp > 0) A.sfx('hit', { vol: .3 }); }, 'ship');
    for (const f of foes) if (f.hp <= 0 && !f.gone) {
      f.gone = true; score += f.pts; explode(f.x, f.y, f.kind === 'boss' || f.kind === 'tank');
      if (f.kind === 'tank') foes.push({ kind: 'power', x: f.x, y: f.y, z: 0, r: 6, vy: 30, hp: 1e9, t: 0, flash: 0, fire: 1e9 });
      if (f.kind === 'boss') { won = true; A.music('victory'); game.after(5, () => game.go('title')); }
    }
    for (const f of foes) if (f.kind === 'power') { f.y += 30 * dt; if (ship.dead <= 0 && E.overlap(f, { x: ship.x, y: ship.y, r: 8 })) { f.gone = true; power = 1; score += 500; A.sfx('powerup'); } }
    E.prune(foes, f => f.gone);
    if (ship.dead <= 0 && ship.inv <= 0) shots.hit([ship], () => hitShip(), 'foe');
    game.focus(W / 2, H / 2, 0);
  }
  function hitShip() {
    explode(ship.x, ship.y, true); ship.dead = 1.5; lives--; power = 0; shots.clear('foe');
  }
  function draw(r) {
    r.sky(['#05040f', '#0e0c2a', '#1a1440']);
    r.starfield({ count: 90, speed: 60, dir: 'down', layers: 3 });
    for (const f of foes) {
      const spr = f.kind === 'fighter' ? FIGHTER : f.kind === 'diver' ? DIVER : f.kind === 'tank' ? TANK : f.kind === 'boss' ? BOSS : POWER;
      r.sprite(f.x, f.y, 0, spr, { anchor: 'center', flash: f.flash > 0 ? '#ffffff' : false, glow: f.kind === 'power' ? 1 : 0 });
    }
    if (ship.dead <= 0 && !(ship.inv > 0 && Math.floor(game.real * 16) % 2)) r.sprite(ship.x, ship.y, 0, SHIP, { anchor: 'center' });
    shots.draw(r);
    r.overlay(g => {
      E.font.text(g, String(score).padStart(7, '0'), 4, 4, '#ffffff');
      E.font.text(g, 'HI ' + String(Math.max(score, E.store.get('best:shooter', 0))).padStart(7, '0'), r.W / 2, 4, '#ffe066', { align: 'center' });
      for (let i = 0; i < lives; i++) px.sprite(g, LIFE, r.W - 9 - i * 8, 4);
      E.font.text(g, 'BOMB ' + bombs, 4, r.H - 9, '#ffffff');
      if (boss && boss.hp > 0) E.ui.bar(g, 40, 14, r.W - 80, 5, boss.hp / 160, '#ff5a8a');
      if (won) { best('shooter', score); E.ui.box(g, r.W / 2 - 70, r.H / 2 - 16, 140, 30); E.font.text(g, 'STAGE CLEAR!', r.W / 2, r.H / 2 - 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, 'SCORE ' + score, r.W / 2, r.H / 2 + 2, '#ffffff', { align: 'center', outline: false }); }
      if (t < 2.5) E.font.text(g, 'SPACE FIRE   X BOMB', r.W / 2, r.H / 2, '#ffffff', { align: 'center' });
    });
  }
  return { view: 'overhead', views: ['overhead'], input: 'SHMUP', res: [W, H], pausable: true, touch: ['fire', 'bomb'],
    enter() { reset(); game.cam.bounds = null; A.music('adventure'); L.enabled = false; }, update, draw };
})();
scenes.shooter = SHOOT;

/* =====================================================================================
 * SLICE 4  RPG BATTLE  (turn-based, side view like the 16-bit classics)
 * Two heroes against two monsters. Pick FIGHT / MAGIC / HEAL / RUN with a menu, watch the
 * attacker step forward and swing, read the damage numbers. The rigs are the same puppets
 * the action slices use, just driven by a turn script instead of the keyboard.
 * ===================================================================================== */
const RPG = (() => {
  const floorTex = (x, y) => E.tex.grass(x, y);
  let stage, party, foes, menu, log, turn, queue, busy, done, actor;
  const mk = (name, x, y, o) => Object.assign({ name, x, y, x0: x, hp: o.hp, max: o.hp, mp: o.mp || 0, maxMp: o.mp || 0, atk: o.atk, flash: 0, dead: false, face: o.face, spec: o.spec }, o);
  function start() {
    stage = new E.TileMap({ rows: Array(22).fill('................'), legend: {}, floorTex });
    game.cam.bounds = null;
    party = [
      mk('KNIGHT', 170, 76, { hp: 48, atk: 9, face: Math.PI, rig: new E.Humanoid({ hat: { style: 'helmet', color: '#9aa8c8' }, colors: { cloth: '#3a5ab0', cape: '#c8452f' }, cape: { len: 5, width: 5, seg: 2.4 } }) }),
      mk('MAGE', 184, 110, { hp: 30, mp: 20, atk: 5, face: Math.PI, rig: new E.Humanoid({ weapon: 'staff', hat: { style: 'pointed', color: '#6a3ab0' }, colors: { cloth: '#6a3ab0', skin: '#f0d0b0' } }) })
    ];
    foes = [
      mk('SLIME', 92, 58, { hp: 26, atk: 6, face: 0, blob: new E.Blob({ R: 7 }) }),
      mk('HUSK', 56, 118, { hp: 34, atk: 8, face: 0, rig: new E.Humanoid({ weapon: null, hunch: .4, eyeGlow: '#ff6a3d', colors: { skin: '#8fa38a', cloth: '#5b4a3c', pants: '#3d3530' } }) })
    ];
    log = new E.Dialog(game, { place: 'top', voice: null, lines: 2, speed: 90 });
    menu = new E.Menu(game, ['FIGHT', 'MAGIC', 'HEAL', 'RUN'], { x: 6, y: 170, onPick: pick });
    turn = 0; queue = []; busy = 0; done = false; actor = party[0];
    A.music('boss');
    L.enabled = false;
  }
  const alive = list => list.filter(c => !c.dead);
  function pick(i) {
    const me = actor, target = alive(foes)[0];
    if (i === 0) act(me, target, me.atk + E.randInt(0, 4), 'hit');
    else if (i === 1) { if (me.mp < 5) { log.say(me.name + ' HAS NO MAGIC LEFT.'); return; } me.mp -= 5; act(me, target, 14 + E.randInt(0, 6), 'magic'); }
    else if (i === 2) { const low = alive(party).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; act(me, low, -(12 + E.randInt(0, 5)), 'heal'); }
    else { log.say('YOU CANNOT RUN FROM THIS FIGHT!'); return; }
    menu.active = false;
  }
  // an action: step forward, swing, apply damage, step back
  function act(who, target, amount, kind) {
    queue.push({ who, target, amount, kind, t: 0 });
  }
  function ended() {
    if (!alive(foes).length) { done = 'win'; A.music('victory'); log.say(['VICTORY!', 'THE PARTY GAINS 24 EXP.'], { onDone: () => game.go('title') }); return true; }
    if (!alive(party).length) { done = 'lose'; game.after(1, () => game.go('over', { from: 'rpg' })); return true; }
    return false;
  }
  function next() {
    // after the heroes, each monster attacks a random hero
    if (ended()) return;
    const heroes = alive(party), monsters = alive(foes);
    turn++;
    const i = party.indexOf(actor);
    const nextHero = party.slice(i + 1).find(p => !p.dead);
    if (nextHero) { actor = nextHero; menu.active = true; menu.i = 0; return; }
    for (const m of monsters) act(m, E.pick(heroes), m.atk + E.randInt(0, 3), 'hit');
    actor = alive(party)[0]; queue.push({ endRound: true });
  }
  function update(dt) {
    if (log.update(dt)) return;
    for (const c of [...party, ...foes]) { c.flash -= dt; if (c.rig) c.rig.update(dt, { x: c.x, y: c.y, facing: c.face, vx: (c.x - (c.px === undefined ? c.x : c.px)) / dt, vy: 0, hurt: c.flash > 0, attack: c.swing || null }); if (c.blob) c.blob.update(dt, { squash: c.swing ? -.25 : 0, look: [1, 0] }); c.px = c.x; }
    if (done) return;
    if (queue.length) {
      const q = queue[0];
      if (q.endRound) { queue.shift(); if (!ended()) { actor = alive(party)[0]; menu.active = true; menu.i = 0; } return; }
      if (q.who.dead) { queue.shift(); return; }
      q.t += dt; const who = q.who, dir = party.includes(who) ? -1 : 1, u = q.t;
      if (u < .25) who.x = lerp(who.x0, who.x0 + dir * 24, E.ease.outCubic(u / .25));
      else if (u < .55) who.swing = { spec: { a0: 1.6, a1: -1.6, z0: 13, z1: 8, reach: 7.5, blade: who.rig && who.rig.o.weapon === 'sword' ? undefined : 0 }, phase: u < .35 ? 'wind' : 'active', u: u < .35 ? (u - .25) / .1 : (u - .35) / .2 };
      else if (!q.applied) {
        q.applied = true; who.swing = null;
        const tg = q.target.dead ? alive(q.kind === 'heal' ? party : (party.includes(q.target) ? party : foes))[0] : q.target;
        if (tg) {
          if (q.amount < 0) { tg.hp = Math.min(tg.max, tg.hp - q.amount); P.text(tg.x, tg.y, 30, '+' + (-q.amount), '#7aff9a'); A.sfx('heal'); }
          else { tg.hp -= q.amount; tg.flash = .2; P.text(tg.x, tg.y, 30, q.amount, '#fff2c4'); A.sfx(q.kind === 'magic' ? 'laser' : 'hit'); game.shake(2); if (q.kind === 'magic') P.ring(tg.x, tg.y, 3, 22, '#9ff0ff', .4); if (tg.hp <= 0) { tg.hp = 0; tg.dead = true; P.bits(tg.x, tg.y, 8, 16, ['#ffffff', '#c8b0ff']); } }
        }
      } else if (u < .85) who.x = lerp(who.x0 + dir * 24, who.x0, E.ease.inOut((u - .55) / .3));
      else { who.x = who.x0; queue.shift(); if (!queue.length || queue[0].endRound) { if (!queue.length) next(); } }
      return;
    }
    if (menu.active) menu.update(dt);
  }
  function draw(r) {
    const view = r.view;
    r.sky(['#2a4a8a', '#7aa8d8', '#b8d8f0']);
    stage.drawFloor(r);
    for (const c of [...party, ...foes]) if (!c.dead) {
      r.shadow(c.x, c.y, 6, .45);
      if (c.rig) r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, view), { flash: c.flash > 0 });
      else r.actor(c.x, c.y, 0, (g, ox, oy) => c.blob.draw(g, ox, oy, view), { flash: c.flash > 0 });
      if (c.rig && c.swing) c.rig.drawSmear(r);
    }
    r.overlay(g => {
      // status window, like the 16-bit RPGs
      const x = 92, y = 164, w = r.W - x - 6;
      E.ui.box(g, x, y, w, 54);
      party.forEach((p, k) => {
        const yy = y + 6 + k * 22, c = p.dead ? '#8a82a8' : p === actor && menu.active ? '#ffd36a' : '#ffffff';
        E.font.text(g, p.name, x + 6, yy, c, false);
        E.font.text(g, 'HP ' + p.hp + '/' + p.max, x + 52, yy, c, false); E.ui.bar(g, x + 52, yy + 7, 60, 4, p.hp / p.max, '#5ad070');
        if (p.maxMp) { E.font.text(g, 'MP ' + p.mp, x + 120, yy, c, false); E.ui.bar(g, x + 120, yy + 7, 30, 4, p.mp / p.maxMp, '#5aa0f0'); }
      });
      foes.forEach((f, k) => { if (!f.dead) { const [sx, sy] = r.w(f.x, f.y, 28); E.ui.bar(g, sx - 10, sy, 20, 3, f.hp / f.max, '#e0463c'); } });
    });
    if (menu.active && !done && !queue.length) menu.draw(r);
    log.draw(r);
  }
  return { view: 'brawler', views: ['brawler', 'threequarter', 'iso'], input: 'DEFAULT', res: 'snes', pausable: true, touch: ['confirm', 'cancel'],
    enter() { start(); game.focus(122, 100, 0); }, update(dt) { update(dt); game.focus(122, 100, 0); }, draw };
})();
scenes.rpg = RPG;

/* =====================================================================================
 * SLICE 5  BRAWLER  (side-scrolling beat-'em-up)
 * A long TileMap street seen from the 'brawler' camera: buildings along the back, a curb
 * at the front, and depth lanes you walk up and down. J throws a 3-hit E.Combo, K kicks.
 * Each wave locks the screen until it is cleared ("GO!"), then the street scrolls on.
 * ===================================================================================== */
const BRAWL = (() => {
  const T = 16, LEN = 56;
  const ROWS = ['#'.repeat(LEN), 's'.repeat(LEN), ...Array(4).fill('.'.repeat(LEN)), '_'.repeat(LEN), 's'.repeat(LEN), 's'.repeat(LEN)];   // buildings, sidewalk, 4 lanes, curb, front sidewalk
  const LEGEND = { '#': 1, '_': 2, 's': { floor: 'walk' } };
  const TYPES = { 1: { h: 56, top: '#4a4458', side: '#6a4a5a', line: '#3a2a3a', course: 7 }, 2: { h: 4, cut: true, cutH: 4, top: '#8a8494', side: '#5a5464' } };
  const floorTex = (x, y, tag) => {
    if (tag === 'walk') return E.tex.checker(x, y, { a: '#8a8290', b: '#7a7282', size: 8 });
    if (Math.abs(y - 4 * T) < 1 && (Math.floor(x / 12) & 1)) return E.hex('#d8c050');   // lane stripe
    return E.tex.plain(x, y, { base: '#3e3a46', amount: .18 });
  };
  const WAVES = [{ x: 14, foes: 2 }, { x: 28, foes: 3 }, { x: 42, foes: 4 }, { x: 52, boss: true }];
  const JAB = { a0: .15, a1: -.1, z0: 14, z1: 14, reach: 9, blade: 0, wind: .04, active: .07, recover: .1 };
  let map, hero, foes, wave, lockX, go, score, won;
  const mkRig = o => new E.Humanoid(Object.assign({ weapon: null }, o));   // weapon: null = fists (the default is a sword)
  function start() {
    map = new E.TileMap({ rows: ROWS, legend: LEGEND, types: TYPES, floorTex });
    game.cam.bounds = v => map.bounds(v);
    hero = new E.Body({ x: 3 * T, y: 3.5 * T, r: 5 });
    Object.assign(hero, { hp: 30, max: 30, facing: 0, inv: 0, hurt: 0,
      combo: new E.Combo([JAB, Object.assign({}, JAB, { a0: -.1, a1: .1 }), Object.assign({}, JAB, { a0: .6, a1: -.4, z0: 10, z1: 18, active: .1, recover: .2 })], { window: .3 }),
      kick: new E.Attack({ a0: .1, a1: 0, z0: 5, z1: 10, reach: 8, blade: 0, kick: true, wind: .08, active: .1, recover: .2 }),
      rig: mkRig({ hat: { style: 'band', color: '#e03a3a' }, colors: { cloth: '#f0f0f0', pants: '#2f5fd0', hair: '#3a2418' } }) });
    game.follow(hero, { z: 12, lead: 24 });
    foes = []; wave = 0; lockX = WAVES[0].x * T; go = 0; score = 0; won = false;
    A.music('boss'); L.enabled = false;
  }
  function spawnWave(w) {
    const n = w.boss ? 1 : w.foes;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? -1 : 1, x = w.x * T + side * (90 + i * 12), y = (1.8 + (i * 1.3) % 4) * T;
      const f = new E.Body({ x, y, r: w.boss ? 7 : 5, friction: 5 });
      Object.assign(f, { hp: w.boss ? 40 : 8, max: w.boss ? 40 : 8, boss: !!w.boss, facing: Math.PI, t: 1 + Math.random(), stun: 0, flash: 0,
        punch: new E.Attack({ a0: .3, a1: -.2, z0: 13, z1: 13, reach: 9, blade: 0, wind: w.boss ? .3 : .4, active: .08, recover: .35 }),
        rig: mkRig(w.boss ? { hat: 'crown', hunch: .15, colors: { cloth: '#7a2a8a', pants: '#2a2a2a', skin: '#c89070' } }
          : { hat: i % 2 ? 'cap' : null, hunch: .25, colors: { cloth: ['#3a8a4a', '#8a6a2a', '#2a6a8a'][i % 3], pants: '#3a3440', hair: '#2a1a14' } }) });
      foes.push(f);
    }
  }
  function hitFoe(f, dmg, force, up) {
    f.hp -= dmg; f.flash = .1; f.stun = .35; f.punch.cancel(); f.rig.kick(2);
    E.knockback(hero, f, force, up); score += dmg * 10;
    game.freeze(up ? .08 : .045); game.shake(up ? 3 : 1.5); A.sfx(up ? 'kick' : 'punch');
    P.sparks(lerp(hero.x, f.x, .5), lerp(hero.y, f.y, .5), 14, 6, Math.atan2(f.y - hero.y, f.x - hero.x));
    if (f.hp <= 0) { f.dead = 1.2; f.push(0, 0, 160); score += f.boss ? 2000 : 200; }
  }
  function update(dt) {
    const inp = game.input, h = hero;
    h.inv -= dt; h.hurt -= dt; go -= dt;
    if (h.hp <= 0) return;
    // spawn the next wave when the hero reaches it; it locks the screen until cleared
    const w = WAVES[wave];
    if (w && !w.spawned && h.x > w.x * T - 60) { w.spawned = true; spawnWave(w); lockX = (w.x + 6) * T; }
    if (w && w.spawned && !foes.some(f => !f.dead)) { wave++; go = 2.5; lockX = WAVES[wave] ? (WAVES[wave].x + 6) * T : LEN * T; if (!WAVES[wave]) { won = true; A.music('victory'); game.after(5, () => game.go('title')); } else A.sfx('confirm'); }
    // move on the street (left / right and up / down the lanes)
    const mv = inp.move(), md = game.view.screenDirToGround(mv[0], mv[1]), busy = h.combo.busy || h.kick.busy;
    if (h.hurt <= 0) { h.vx = approach(h.vx, busy ? 0 : md[0] * 70, 800 * dt); h.vy = approach(h.vy, busy ? 0 : md[1] * 45, 800 * dt); }
    if (!busy && Math.abs(md[0]) > .2) h.facing = md[0] > 0 ? 0 : Math.PI;
    if (inp.buffered('attack') && !h.kick.busy && h.combo.press()) { inp.consume('attack'); A.sfx('whoosh'); }
    if (inp.buffered('kick') && !h.combo.busy && h.kick.start()) { inp.consume('kick'); A.sfx('whoosh', { pitch: .8 }); }
    h.combo.update(dt); h.kick.update(dt);
    const inReach = f => !f.dead && Math.abs(f.y - h.y) < 9 && E.inArc(h, h.facing, f, 20, 1.1);
    h.combo.hits(foes, inReach, f => hitFoe(f, h.combo.step === 2 ? 4 : 2, h.combo.step === 2 ? 190 : 60, h.combo.step === 2 ? 120 : 0));
    h.kick.hits(foes, inReach, f => hitFoe(f, 3, 170, 90));
    h.update(dt, map);
    h.x = clamp(h.x, 8, Math.min(lockX, LEN * T - 8));
    // thugs: walk to the hero's lane, wind up, punch
    for (const f of foes) {
      f.flash -= dt; f.stun -= dt;
      if (f.dead) { f.dead -= dt; f.update(dt, map); continue; }
      const dx = h.x - f.x, dy = h.y - f.y, want = dx > 0 ? -16 : 16;
      if (f.stun <= 0 && !f.punch.busy) {
        const tx = h.x + want - f.x; f.facing = dx > 0 ? 0 : Math.PI;
        f.vx = approach(f.vx, Math.abs(tx) > 4 ? Math.sign(tx) * (f.boss ? 40 : 34) : 0, 300 * dt); f.vy = approach(f.vy, Math.abs(dy) > 2 ? Math.sign(dy) * 26 : 0, 300 * dt);
        f.t -= dt; if (Math.abs(tx) < 8 && Math.abs(dy) < 6 && f.t <= 0) { f.punch.start(); f.t = f.boss ? .6 : 1.2 + Math.random(); }
      }
      f.punch.update(dt);
      f.punch.hits([h], t => h.inv <= 0 && Math.abs(t.y - f.y) < 9 && E.inArc(f, f.facing, t, 20, 1), () => {
        h.hp -= f.boss ? 4 : 2; h.inv = .6; h.hurt = .25; h.combo.cancel(); E.knockback(f, h, 150); game.shake(3); A.sfx('hurt');
        if (h.hp <= 0) { h.hp = 0; h.push(0, 0, 150); game.after(1.2, () => game.go('over', { from: 'brawler' })); }
      });
      f.update(dt, map);
      f.rig.update(dt, { x: f.x, y: f.y, z: f.z, vx: f.vx, vy: f.vy, facing: f.facing, hurt: f.stun > 0, attack: f.punch.state });
    }
    E.prune(foes, f => f.dead !== undefined && f.dead !== false && f.dead <= 0);
    h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, hurt: h.hurt > 0, attack: h.kick.busy ? h.kick.state : h.combo.state, air: !h.onGround });
  }
  function draw(r) {
    const view = r.view;
    r.sky(['#1a1030', '#4a2a5a', '#c86a5a']);
    px.rect(r.ctx, 0, Math.round(r.H * .55), r.W + 2, r.H, '#7a7282');   // pavement behind the bottom edge of the street
    map.drawFloor(r);
    for (const c of [hero, ...foes]) r.shadow(c.x, c.y, c.boss ? 7 : 5.5, .5);
    map.queueWalls(r);
    for (const f of foes) r.actor(f.x, f.y, f.z, (g, ox, oy) => f.rig.draw(g, ox, oy, view), { flash: f.flash > 0, alpha: f.dead ? (Math.floor(game.real * 20) % 2 ? .3 : 1) : 1 });
    const blink = hero.inv > 0 && Math.floor(game.real * 16) % 2 === 0;
    r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => hero.rig.draw(g, ox, oy, view), { alpha: blink ? .45 : 1, flash: hero.hurt > .15 ? '#ffb0a0' : false });
    r.overlay(g => {
      E.font.text(g, 'PLAYER', 6, 5, '#ffffff'); E.ui.bar(g, 32, 5, 70, 6, hero.hp / hero.max, '#f0d040');
      E.font.text(g, String(score).padStart(6, '0'), r.W - 6, 5, '#ffffff', { align: 'right' });
      const b = foes.find(f => f.boss && !f.dead); if (b) { E.font.text(g, 'BOSS', 6, 15, '#ff8a8a'); E.ui.bar(g, 32, 15, 70, 6, b.hp / b.max, '#e0463c'); }
      if (go > 0 && Math.floor(game.real * 3) % 2 === 0) E.font.text(g, 'GO! →', r.W - 10, r.H / 2 - 10, '#ffd36a', { align: 'right', scale: 2 });
      E.font.text(g, 'J PUNCH  K KICK  ARROWS MOVE', r.W / 2, r.H - 9, '#ffffff', { align: 'center' });
      if (won) { E.ui.box(g, r.W / 2 - 70, r.H / 2 - 16, 140, 30); E.font.text(g, 'STREETS CLEARED!', r.W / 2, r.H / 2 - 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, 'SCORE ' + score + '  BEST ' + best('brawler', score), r.W / 2, r.H / 2 + 2, '#ffffff', { align: 'center', outline: false }); }
    });
  }
  return { view: 'brawler', views: ['brawler', 'threequarter'], res: 'snes', pausable: true, touch: ['attack', 'kick'],
    input: Object.assign({}, E.Input.DEFAULT, { kick: ['KeyK', 'KeyL', 'Mouse2', 'Pad2'] }),
    enter() { WAVES.forEach(w => { w.spawned = false; }); start(); }, update, draw };
})();
scenes.brawler = BRAWL;

/* ---- START: the title menu, or a slice named in the address (#platformer) ---- */
const first = (location.hash || '').slice(1);
game.start({ scenes, scene: scenes[first] ? first : 'title' });
window.__game = { game, scenes };
})();
/* =============================== GAME END =============================== */
