// The 3D template game: the 3D engine's quick start (the manual, the header of ../my-3d2dge-3d.js), a complete small
// game (collect the gems, mind the slimes) to change into yours. index.html loads it as a module after both engines;
// node tools/check.mjs game3d/index.html plays it in a browser. For a genre's game, start from its 3D kit instead
// (kits/3d-<id>.js: kits/README.md). Its words are not lines yet (docs/LANGUAGES.md: E.t and the page's game-lines block).
const E = My3D2dge;
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: E.World3D.INPUT, menu: { settings: E.World3D.SETTINGS } });
const LEVEL = { rows: [
  '################',
  '#t............t#',
  '#..g.....==..g.#',
  '#........==....#',
  '#..s.....^^....#',
  '#.............s#',
  '#..g...@....g..#',
  '#t............t#',
  '################'],
  legend: { '=': { floor: 16 }, '^': { stairs: 'n', floor: 16 }, g: { mark: 'gem' }, s: { mark: 'slime' }, '@': { mark: 'start' } } };
let world, hero, slimes, gems, hp, done;
const move = [0, 0];
const play = {
  view: 'iso', views: ['iso', 'threequarter', 'topdown'], pausable: true, touch: ['jump'], camera: { zoom: [.6, 2] },
  enter() {
    world.reset(); const rnd = E.rng(1), s = world.marks.start[0];
    hero = world.hero({ x: s.x, y: s.y, rig: new E.Humanoid({ colors: { cloth: '#2f8f86' } }) });
    slimes = world.marks.slime.map(m => world.mob({ x: m.x, y: m.y, blob: new E.Blob({ R: 6 }) }));
    gems = world.marks.gem.map(m => world.thing('gem', m.x, m.y, m.z + 2, { spin: .5, bob: 3 }));
    world.camera.follow(hero); hp = 3; done = false;
    for (const e of slimes) e.data.t = rnd() * 2;
  },
  update(dt) {
    if (game.input.pressed('camera')) world.camera.set(world.camera.mode === 'view' ? 'chase' : 'view');
    world.camera.ground(game.input.move(), move);
    hero.vx = E.approach(hero.vx, move[0] * 90, 900 * dt); hero.vy = E.approach(hero.vy, move[1] * 90, 900 * dt);
    if (Math.hypot(move[0], move[1]) > .1) hero.facing = Math.atan2(move[1], move[0]);
    if (hero.grounded && game.input.pressed('jump')) hero.jump(170);
    for (const e of slimes) {   // hop at the hero now and then; touch one: a heart lost, knocked back
      if ((e.data.t -= dt) < 0 && e.grounded) { e.data.t = 1.2; const a = Math.atan2(hero.y - e.y, hero.x - e.x); e.vx = Math.cos(a) * 60; e.vy = Math.sin(a) * 60; e.vz = 140; e.facing = a; }
      if (Math.hypot(e.x - hero.x, e.y - hero.y) < 11 && Math.abs(e.z - hero.z) < 10 && !(hero.data.inv > 0)) { hp--; hero.data.inv = 1; hero.push((hero.x - e.x) * 12, (hero.y - e.y) * 12, 120); game.shake(3); }
    }
    hero.data.inv = (hero.data.inv || 0) - dt;
    for (const t of world.touching(hero, 'gem')) { world.remove(t); gems.splice(gems.indexOf(t), 1); game.particles.glints(t.x, t.y, t.z + 6, 8, '#bff8ff'); }
    if (!done && (!gems.length || hp <= 0)) { done = true; game.note(gems.length ? 'OUCH!' : 'ALL GEMS!', 2); game.after(2, () => game.go('play')); }
    world.step(dt);
  },
  draw(r) {
    world.draw(r);
    r.overlay(g => { E.ui.hearts(g, 6, 6, Math.max(0, hp), 3); E.font.text(g, 'GEMS ' + gems.length, 6, 18, '#bff8ff'); });
  }
};
game.start({ scenes: { play }, scene: 'play', boot: { steps: [
  ['The 3D engine', () => E.World3D.init(game)],
  ['The level', () => { world = new E.World3D(game, { level: LEVEL }); world.prepare(); }]] } });
