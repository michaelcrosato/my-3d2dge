// The handoff package's template game: a rooftop thief in the isometric view. Climb onto the roof, take the gem, and
// don't let the guard in the street watch you for long. It shows what a game is made of (scenes, a TileMap with roofs, a
// Mover and a Humanoid, input, the camera, a HUD) and the height-aware API: E.Mover climbs any wall (climbAny: jump at
// it, the stick climbs, jump leaps up, it pulls up at the top), the guard is a plain Body, map.sight and E.inArc for
// the guard's eyes (they see over the planter, not through the roof), shapes and materials (docs/ASSETS.md: barrels and
// crates as data, solid with map.solid; the street's cobbles a material), and game.debug for tests and tools. The pause menu,
// settings, rebinding and full screen come with every game: menu: { controls } names the actions on its Controls screen,
// and input.label() puts the player's own key or button in a prompt. The night is canvas lighting (game.lights): an
// ambient, and lights added every draw (a street lamp, the gem's glow), the same in every browser and every check. The
// HUD is HTML (E.Shell: the objective with its distance, the guard's alert, your keys), over the pixels; the title and
// end screens are pixel art.
// Copy it and make it your game. Test it headless: node game/test.mjs. Check it in a browser: node tools/check.mjs game/index.html
(() => {
const E = My3D2dge;
const game = new E.Game({ canvas: 'screen', res: 'snes', expand: true, view: 'iso', views: ['iso', 'threequarter'],   // expand: full screen at any shape (the HUD anchors to r.W, r.H)
  menu: { controls: { jump: 'Jump and climb', attack: false, dash: false, skill: false } } });   // (this game uses moves and jump only)
const ui = new E.Shell(game);   // the HTML HUD (it keeps the standard pause menu); headless, it draws nothing
const ROOF = 32;
const map = new E.TileMap({
  rows: ['############',
         '#..........#',
         '#.@........#',
         '#....p.....#',
         '#......RRR.#',
         '#......RGR.#',
         '#..s...RRR.#',
         '#..........#',
         '############'],
  legend: { '#': 1, R: 2, G: { tile: 2, spawn: 'gem' }, p: 3, '@': 'hero', s: 'guard' },
  types: { 1: { h: 48, top: '#5a5068', side: '#3e3650', cut: true },
           2: { h: ROOF, top: '#9a4a3a', side: '#c8b89a', face: 'plaster', roof: 'tiles' },
           3: { h: 10, top: '#3e7a3a', side: '#5a4a32', face: 'plank', roof: 'leaves' } },
  floorMat: 'cobble'   // a material (E.MATERIALS, or '#hex pattern'): the floor, wall faces and tops, shapes' parts all take them
});
// set dressing: shapes (E.SHAPES: objects as data, right in every view), solid where they stand (map.solid: walk into one, land on it)
const DRESS = [['barrel', 152, 30, { facing: .5 }], ['barrel', 166, 26, { facing: 2 }], ['crate', 22, 120, { facing: .3 }], ['cart', 72, 26, { facing: 0 }]];
for (const [id, x, y, o] of DRESS) map.solid(id, x, y, 0, o);
const GEM = E.sprite(['.c.', 'cCc', '.c.'], { c: '#48c8f0', C: '#e8faff' }, 2);
let hero, heroRig, guard, guardRig, alert, got, won;

function reset() {
  const h = map.find('hero'), g = map.find('guard');
  hero = new E.Mover({ x: h.x, y: h.y, r: 5, climbAny: true, climbMax: 24 }); hero.facing = 0;   // (the roof, 32 high, is climbed)
  heroRig = heroRig || new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, hood: true, outfit: 'coat', colors: { cloth: '#3a4a6a', cape: '#2a3a52' } });
  guard = new E.Body({ x: g.x, y: g.y, r: 5 }); guard.facing = 0; guard.dir = 1;
  guardRig = guardRig || new E.Humanoid({ size: 1.2, build: 'heroic', weapon: 'sword', hat: 'helmet', colors: { cloth: '#8a3a32' } });
  alert = 0; got = false; won = false;
}

const title = {
  update() { if (game.input.pressed('start')) { reset(); game.go('play'); } },
  draw(r) {
    r.sky(['#141030', '#3a2a60']);
    const m = Math.round(r.H / 2);   // centred on any screen
    r.overlay(g => E.font.title(g, 'ROOFTOP', r.W / 2, m - 52, { scale: 3, align: 'center' }));
    r.text(('CLIMB WITH ' + game.input.label('jump') + '  TAKE THE GEM  STAY UNSEEN').toUpperCase(), r.W / 2, m + 8, '#e8e0ff', { align: 'center' });
    r.text(('PRESS ' + game.input.label('start')).toUpperCase(), r.W / 2, m + 38, '#ffffff', { align: 'center', shadow: '#000' });
  }
};

const play = {
  pausable: true,
  enter() { game.follow(hero, { z: 16 }); game.cam.bounds = v => map.bounds(v); game.lights.enabled = true; game.lights.ambient = .5; },
  exit() { game.lights.enabled = false; ui.hud({}); },
  update(dt) {
    const I = game.input, was = !!(hero.wall || hero.action);
    hero.update(dt, map, I);   // walks, jumps, climbs: the stick and the jump button, through the view
    if (!was && (hero.wall || hero.action)) game.audio.sfx('jump');
    // the guard walks the street and watches ahead: its eyes see over the planter, not through the roof
    guard.vx = guard.dir * 30; guard.update(dt, map);
    if (guard.x > 112 || guard.hitWall) guard.dir = -1; else if (guard.x < 40) guard.dir = 1;
    guard.facing = guard.dir > 0 ? 0 : Math.PI;
    const sees = map.sight(guard, hero) && E.inArc(guard, guard.facing, hero, 110, .6);
    alert = sees ? alert + dt : Math.max(0, alert - dt * .5);
    const gem = map.find('gem');
    if (!got && E.dist(hero, { x: gem.x, y: gem.y, z: ROOF }) < 12) { got = true; game.audio.sfx('coin'); game.flash('#c8f4ff', .15); }
    if (got && hero.z < 2) { won = true; game.go('end'); }   // back down in the street with it
    else if (alert > 1.2) { won = false; game.audio.sfx('hurt'); game.go('end'); }
    // the rigs are posed every step from the bodies' motion; draw only draws them
    heroRig.update(dt, hero.rigState());
    guardRig.update(dt, { x: guard.x, y: guard.y, z: guard.z, vx: guard.vx, vy: 0, facing: guard.facing, stance: 'ready' });
    // the HUD, from this step's state (E.Shell redraws only what changed; the keys hide on a touch screen)
    ui.hud({ objective: got ? { title: 'Bring it down', text: 'Back to the street with it' } : { title: 'Take the gem', text: hero.wall ? 'Climb: up, and jump to leap' : 'It lies on the roof', at: { x: gem.x, y: gem.y, z: ROOF }, from: hero },
      bars: [{ label: 'Seen', value: Math.min(alert, 1.2), max: 1.2, color: '#ff6040' }],
      keys: [[['up', 'left', 'down', 'right'].map(a => I.label(a)).join(''), 'Move'], [I.label('jump'), 'Jump and climb']] });
  },
  draw(r) {
    map.drawFloor(r); map.queueWalls(r);   // (the floor runs on past the map to the screen's edges: map.outside)
    for (const [id, x, y, o] of DRESS) r.shape(id, x, y, 0, o);
    r.prop('lamp', 88, 88, 0, { light: true });   // a street lamp: its glow and a pool of light
    r.decal(() => r.groundArc(guard.x, guard.y, 6, 110, guard.facing - .6, guard.facing + .6, alert > 0 ? '#ff6040' : '#ffe080', .4));   // its sight cone
    const gem = map.find('gem');
    if (!got) { r.sprite(gem.x, gem.y, ROOF + 6 + Math.sin(game.time * 3) * 2, GEM, { glow: .8 }); game.lights.add(gem.x, gem.y, ROOF + 6, 44, .9, { color: '#80d8ff' }); }
    for (const [b, rig] of [[hero, heroRig], [guard, guardRig]]) {
      r.shadow(b.x, b.y, 7, .35, undefined, b.groundZ || 0);
      r.actor(b.x, b.y, b.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
    }
  }
};

const end = {
  update() { if (game.input.pressed('start')) { reset(); game.go('play'); } },
  draw(r) {
    r.sky(won ? ['#103020', '#2a6a48'] : ['#301010', '#6a2a2a']);
    const m = Math.round(r.H / 2);
    r.overlay(g => E.font.title(g, won ? 'STOLEN' : 'CAUGHT', r.W / 2, m - 42, { scale: 3, align: 'center' }));
    r.text(('PRESS ' + game.input.label('start') + ' TO TRY AGAIN').toUpperCase(), r.W / 2, m + 28, '#ffffff', { align: 'center', shadow: '#000' });
  }
};

reset();
// a handle for tests and tools (node game/test.mjs, tools/check.mjs prints snapshot(), tools/replay.mjs logs it)
game.debug = {
  snapshot: () => ({ scene: game.sceneName, hero: [hero.x, hero.y, hero.z].map(v => Math.round(v * 10) / 10), climbing: !!(hero.wall || hero.action),
    guard: [Math.round(guard.x), Math.round(guard.y), guard.facing], alert: Math.round(alert * 100) / 100, got, won }),
  teleport(x, y, z = 0, facing = hero.facing) { Object.assign(hero, { x, y, z, vx: 0, vy: 0, vz: 0, onGround: true, facing, wall: null, action: null }); }
};
game.start({ scenes: { title, play, end }, scene: 'title' });
})();
