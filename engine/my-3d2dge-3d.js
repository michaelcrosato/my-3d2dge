/*!
my-3D2dge 3D v0.85.1: real 3D worlds under my-3D2dge games (three.js r182 and Rapier 0.19.3)
https://github.com/michaelcrosato/my-3d2dge (MIT License)

A 3D world, its physics and its camera under a my-3D2dge game. The 2D engine (engine/my-3d2dge.js) still runs the game:
its exact fixed steps, scenes, input, pause menu, settings, touch buttons, sound, the rigs and their moves, the HUD. This
module simulates and draws the world under the game's clear canvas. Everything is drawn by code: levels written as text,
textures pixel by pixel, characters by the 2D engine's rigs (as cards, or as 3D puppets on the same joints), props and
pickups from four shapes. No image, model or sound files.

AGENTS: this header is the whole manual for the 3D side; the API card (API.md) covers the 2D side (E.Game, input, rigs,
moves, E.font, E.ui, E.Menu, audio). Read the code below only to debug: its sections start with "/* ===" and a number.

## Host it (served: browsers load modules only over http; npx serve at the repository's root, or my-3d2dge.vercel.app)
<script type="importmap">{ "imports": { "three": "/vendor/three-0.182.0/three.webgpu.min.js",
  "three/webgpu": "/vendor/three-0.182.0/three.webgpu.min.js", "three/tsl": "/vendor/three-0.182.0/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "/vendor/rapier3d-simd-compat-0.19.3/rapier.js" } }</script>
<style>html, body { margin: 0; height: 100%; overflow: hidden; background: #000 }</style>
<div id="stage" style="position:relative;width:100%;height:100%;overflow:hidden">
  <canvas id="view"></canvas><canvas id="screen" style="position:absolute;inset:0;width:100%;height:100%"></canvas></div>
<script src="/dist/my-3d2dge.js"></script>                   the 2D engine, a classic script, first
<script type="module" src="/dist/my-3d2dge-3d.js"></script>  this file
<script type="module" src="game.js"></script>                your game, a module (const E = My3D2dge;)

## Mental model
- The 2D engine's units: x east, y south, z up; 16 units = 1 metre = 1 tile; speeds in units a second; angles in
  radians from +x toward +y (0 east, PI/2 south, -PI/2 north).
- new E.Game({ ..., bg: null }): its canvas is clear, and the HUD draws on it over the 3D picture (r.overlay, r.text,
  E.ui, E.font) in game pixels, r.W x r.H. res: 'ps1', expand: true as in the 2D games.
- await E.World3D.init(game) once (a boot step), then new E.World3D(game, { level, ... }) for each level. In a scene:
  update(dt) { your rules, then world.step(dt) } and draw(r) { world.draw(r), then your HUD }. Paused or frozen
  (game.freeze), update doesn't run, so the world holds still and still draws. A frame between steps draws the actors
  and the camera part way from the step before (game.alpha: even motion at 144 Hz); a pose set in onDraw is placed as set.
- Deterministic: the world steps in the game's fixed steps; gameplay randomness comes from E.rng(seed); the camera's
  pose is worked out in the steps. world.reset() then the same inputs give the same world.hash() on WebGPU, WebGL 2 and
  run again. Gameplay never reads the picture or the GPU: it reads actors, props and the level.
- The camera decides what "up the stick" means: move with world.camera.ground(game.input.move()).

## Quick start: a complete game (collect the gems, mind the slimes)
```js quickstart
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
```

## The level: text, one character per tile; row 0 is north
level: { rows, legend, ground, side, colors, bottom }. A legend entry says what its character is (the defaults: '#' wall
48, 'w' wall 12, 'P' pillar 56, '.' floor, ' ' pit, 't' brazier):
  { floor: h }        walkable at height h (0 the ground; above 0 a raised floor, solid to the ground)
  { wall: h }         a solid block h tall, cut low where it stands between a view camera and the level (cut: false)
  { pillar: h }       each block of these tiles is one pillar, cut to a stump when it hides the target
  { stairs: 'n'|'s'|'e'|'w', from: 0, floor: 16 }   rising toward that side, from height `from` to `floor`
  { platform: h, thick: 4 }   a slab in the air, its top at h (walk under it); add pit: true for nothing below
  { pit: true }       no floor: a body that falls in is lost (actor.fell)
  { torch: true }     a brazier with a flickering light (the lights go to the torches nearest the target)
  { mark: 'name' }    a spot: world.marks.name -> [{ x, y, z, cx, cy }] (the tile's centre, on its surface)
  { shape: 'bench', facing, scale, mats, solid }   a shape standing on the tile (world.shape), walked round when solid
and its look: ground ('flagstone' 'grass' 'dirt' 'sand' 'snow' 'planks' 'tiles' 'plain' 'water' 'lava', or (x, y) =>
[r, g, b]) with colors { base, dark, light }, side ('brick' 'block' 'earth' 'planks' 'metal') with color (and top, line).
The level's ground is every tile's default; its side styles the floors' edges, its wallSide the walls ('brick'; a tile's
own side wins). Add looks: E.World3D.GROUND.name, E.World3D.SIDE.name.

## The world: new E.World3D(game, o)
o: { level, look: 'card' | 'puppet', res: 'pixels' | 'balanced' | 'full', gravity: 480, sky: '#06050b' or [top,
horizon], fog: { color, near, far } (units past the target) or false, ambient: [sky, ground, intensity], sun: { color,
intensity, dir: [x, y, z] (it shines along it), area, shadow }, torchLights: 6, torchShadows: 1, torchPower: 30,
lights: 2 (your own), spots: 0 (flashlights), glowLights: 4, shadows, outlines, filter, camera: { mode, proj, fov, chase, ... }, terrain (an open
world instead of the level: below), overlay: { fov } (first person: below), onDraw: (world, r) => {} (your own 3D drawing
each frame, whichever scene draws the world) }
  world.step(dt) / world.draw(r) / world.reset() / world.hash([your numbers]) / world.prepare() (build the shaders now)
  world.dispose(): frees a world (its physics, meshes and textures); dispose a level's world before making the next
  world.width, depth (units), mw, mh (tiles), bottom, marks, torches, actors, props, platforms, things, time, stats
  world.ground(x, y)   the ground's height (a wall's top on a wall; bottom over a pit)
  world.floorAt(x, y, z)   the surface a body at height z stands on or falls to (platforms too)
  world.topH(x, y)     the top of whatever stands there (shots stop below it)
  world.tile(cx, cy), spec(cx, cy), solidTile(cx, cy)   the level's character, its legend entry, walls and pillars
  world.flow() -> flow: flow.to(x, y) aims it; flow.dir(x, y, out) -> the way there ([x, y], or null: go straight);
      it climbs stairs and gentle slopes and drops off ledges, never jumps
  world.randomFloor(rnd, minDist, fx, fy) -> [x, y]; world.clear(x0, y0, z0, x1, y1, z1) -> a clear line of sight?
  world.ray(x, y, z, dx, dy, dz, len, { skip: actor(s), level: true (sight lines), down }) -> the first hit { x, y, z, nx,
      ny, nz, dist, actor, prop, ground } or null: hitscan, ledges, feet on the ground
  world.block({ x, y, z, w, d, h, yaw } | { x, y, z, r, h }): an invisible fixed collider (walls you draw your own way;
      z its base, as for world.box, world.thing and world.shape)
  world.near(x, y, r, kind) -> actors within r; world.touching(actor, kind) -> things it touches
  world.project(x, y, z) -> [x, y] in game pixels for the HUD (null behind the camera)
  world.remove(actor | prop | platform | thing)

## Actors: world.hero(o) and world.mob(o)
hero: a kinematic capsule walked by Rapier's character controller: it slides along walls, climbs stairs and slopes,
steps up curbs, rides moving platforms, pushes crates and shoves mobs. mob: a dynamic body; the crowd pushes and piles
up by itself, knockback is momentum. o: { x, y, z, rig: new E.Humanoid(...) | blob: new E.Blob(...) | orb: { color, r },
r, half (the capsule: radius, half its straight part; half 0 a ball), facing, fly (no gravity), mass, trail (a color for
the rig's weapon trail), look ('card' | 'puppet' for this one), shadow, pose: false (you pose it yourself) }
Each step you set what it wants: a.vx, a.vy (units a second on the ground: E.approach toward a target speed), a.jump(v)
or a.vz, a.facing, a.anim (what its rig does: { attack: move.state, pose: 'cheer' | 'die' | 'cast', hurt, dash, expr };
a blob's { squash, look: [dx, dy], squint, flap }); world.step moves it, reads back a.x, a.y, a.z (its feet), a.vx,
a.vy, a.vz, a.grounded, a.landed (this step), a.fell (dropped below the level), and poses its rig.
  a.place(x, y, z), a.push(vx, vy, vz) (knockback), a.setSolid(false) (fallen: it stops blocking the others), a.remove(),
  a.resize(half) (a crouch, a slide: the capsule shorter, the feet kept; look up with world.ray before standing)
  a.flash (a hit flash while above 0: count it down yourself, a.flash -= dt), a.fade (0..1), a.sink (units drawn into the floor: spawning, sinking away), a.visible,
  a.data (yours). E.Attack, E.Combo and E.MOVES work as in 2D: attack.hits(list, e => E.inArc(a, a.facing, e, range,
  half), e => ...) on actors.

## Props, platforms and things
  world.shape(id, x, y, z, { facing, scale, mats, flip, params, solid: true }): a shape (docs/ASSETS.md: an E.SHAPES id,
  a store set's 'SET:id' after E.addAssets, or an entry) in 3D, from the 2D engine's parts and materials, solid as
  map.solid's box. A reset takes yours away (the legend's stand again); world.shapes holds them; world.remove(s)
  world.crate(x, y, z, yaw), world.barrel(x, y, z): dynamic bodies (z their centre; left out, on the floor); world.knock(p, fromX, fromY, dv, up) throws one;
  world.box({ x, y, z, w, d, h, color, side, fixed, mass }); a prop has x, y, z, q (its rotation), data
  world.platform({ w, d, h, path: [[x, y, z], ...] (its top's points), speed, wait, loop, side, color }): a platform that
  moves (there and back, or round with loop); heroes on it ride it, bodies on it are carried
  world.thing(kind, x, y, z, o): drawn by code: coin gem heart key star potion chest door flag sign lever pad spring
  tree bush rock mushroom fence crystal trunk (an item box) typewriter (a save point); o: { yaw, spin (turns a second),
  bob, size, color, open (0..1), on, solid: true | [w, d, h] (a block where it stands: world.setSolid(t, false) opens
  it), data }. Add a kind:
  E.World3D.THINGS.lamp = (pen, t, time) => { pen.tube(0, 0, 0, 0, 0, 20, 1, '#555').glow(0, 0, 21, 2, '#ffd36a'); }
  A door: { w (32, across its local x), h (40), swing: true (leaves on hinges; else a gate that rises), locked: 'iron' (a
  key's id) }. world.reach(hero, 14, kinds) -> the thing in front of it within reach (what a check button acts on);
  world.unlock(door, inv) -> 'open' | 'unlocked' (the key taken from an E.RPG inventory) | 'locked';
  world.through(door, hero, { then }): the door opening between rooms (Resident Evil's): the camera goes through as it
  swings open, the hero comes out beyond it; while world.passing the world holds still: skip your rules

## Drawing for one frame (in draw, before world.draw(r))
  world.arc(x, y, z, r0, r1, a0, a1, color, alpha): a flat arc on the ground (a telegraph)
  world.glow(x, y, z, r, color, { core, light: true }): a glowing ball (a bolt); the first four asked for light the scene
  world.pen.at(x, y, z, yaw, size, pitch, roll).box(x, y, z, w, d, h, color).ball(x, y, z, rx, ry, rz, color).tube(x0, y0, z0, x1,
      y1, z1, r, color).cone(...base to tip).bar(x0, y0, z0, x1, y1, z1, w, t, color).glow(x, y, z, r, color)
      .slab(x0, y0, z0, x1, y1, z1, ax, ay, az, w, t, color) (a box from one point to the other, w wide along a: any lean)
  world.light({ color, reach, power, flicker }) (made once, with the world): a light; set its x, y, z and on each frame
  world.flashlight(hero, { color, reach, angle, power, flicker: 0..1 (a failing bulb) }) (a world made with { spots: 1 }):
  a spot from its hand along its facing, every frame, casting shadows; .on
  game.particles (sparks, dust, bits, rings, glints, fire, text): drawn in 3D; they land on the level; text goes on the HUD
  game.shake(n), game.flash(color), game.freeze(s), game.note(text): as in 2D

## The camera: world.camera
  modes: 'view' (the 2D engine's views as real 3D cameras following camera.target: game.view (game.nextView()),
  game.yaw (game.rotateView(45)): the starter's shell binds V and [ ] to them, the engine no key; game.zoom (the wheel,
  a pinch, Settings, where the scene's camera.zoom allows); proj 'persp' | 'ortho'; dist; walls in
  front cut low), 'chase' (behind the target; it swings round behind as the target moves; a click captures the mouse to
  turn it), 'first' (the target's eyes), 'fly', 'fixed' (camera.fixed = { x, y, z, yaw, pitch, roll, fov }: your own),
  'zones' (Resident Evil's: camera.zones = [{ box: [x0, y0, x1, y1], at: [x, y, z], look: [x, y, z] (fixed) | follow:
  true (turning after the target) | rail: [[x, y, z], [x, y, z]] (sliding level with it), fov (framed for 4:3: a taller
  screen widens it) }]: the target's zone is the camera, cut once it is camera.margin (8) units in (camera.zone,
  camera.cuts); across a cut ground() keeps the old way while the stick is held)
  camera: { capture: true (a click captures the mouse in any mode; camera.takeMouse(out) -> its [dx, dy] since the last
  call: turn your own camera), near, far (units) }; camera.target also sizes the outlines and centres the sun's shadow
  camera.set(mode), camera.follow(actor), camera.ground(move, out) -> the stick turned to the ground,
  camera.aim(actor) -> the angle the mouse (on the floor) or right stick points from it, or null; camera.heading,
  camera.pose, camera.chase = { pitch, dist, fov, height, auto }, camera.first = { pitch, fov }
  camera.steer(hero, move, dt, out) -> the way to go by the player's setting (game.settings.define(E.World3D.CONTROLS)):
  ground(), or tank controls (up forward along hero.facing, down back, left and right turn it: set facing yourself only
  when !camera.tank)
  Lock-on (Zelda's targeting): camera.lock(hero, mobs, { range: 160 }) -> the one in sight (alive, in range, a clear
  line) nearest where hero faces, or null; camera.cycle(mobs, 1 | -1) the next round the hero; camera.unlock();
  camera.lockOn. The chase and first cameras swing behind the hero to frame both, the view frames both, ground() strafes
  round it, a reticle marks it (camera.reticle: a color, false); it lets go when the target dies (alive = false), leaves
  or goes past 1.25 times the range. Turn the hero to it yourself

## Open worlds: new E.World3D(game, { terrain: { height: (x, y) => z, ... } })
terrain: { size (32768: two kilometres), height, color: (x, y, z, nz, out) => [r, g, b] (0..255), cell (32), chunk (32
cells), far (draw distance), physics (heightfields this near an actor), detail (1.7), rock: { colors, band, slope: [s0,
s1] } (strata where it steepens), speckle, mottle, bottom }. Streamed: a chunk is sampled when first asked about, its
collider made near actors (world.step), its meshes near the camera (world.draw: finer near). world.ground, floorAt, topH
and world.terrain.normal(x, y) read the triangles Rapier collides with; flow() goes straight. sky: { top, horizon, ground,
sun, haze } is a dome; fog: { color, near, far }. Keep height() fast: it runs per sample.

## Vehicles, tracks, flight (the RACING and FLIGHT slices show them)
world.vehicle({ kind: 'kart' | 'car' | 'hover', x, y, z, angle, rig (its driver, seated), color, and the drive module's
E.Car options over the kind's (top, accel, brake, turn, grip, drift, hop...), surfaces, ground: (x, y) => tag }): a ball
Rapier rolls (walls, bumps, ramps, jumps) steered by E.Car's arcade handling; an actor. Each step v.update(dt, null,
{ steer, gas, brake, drift }) (or an input), then world.step; it reads speed, slide, angle, drifting, charge (a kart's
drift boost), boostT, onGround, surface ('road', 'boost', a track's off, the level's ground: grass, sand... slow it),
bumped; v.boost(sec, power), v.spinOut(sec). E.Race (the drive module) races vehicles as it races E.Cars.
world.track({ path: new E.Path(points [x, y, z], { closed: true, smooth: 'catmull' }), width: 96, bank: .25 (radians at
the tightest bends), walls: true, kerb: 8, pads: [[d, across]] (boost pads), gaps: [[d0, d1, side]] (no wall: a
shortcut's way off), off (the surface beside it, 'grass'; null: the ground's own), surface: 'road' (a shortcut's
'dirt'), color, line }): the road and its walls, drawn
and solid (heights in the path: hills, a hump to jump; banked about the low edge); track.at(d) -> { x, y, z, angle, bank
}, track.where(x, y) -> { d, across, z }, track.surface(x, y). A terrain under it keeps below it (your height function).
world.flyer({ x, y, z, yaw, speed: 300, min, max (brake, boost), turn, climb, bank, invert, low (least height), bounds:
[x0, y0, z0, x1, y1, z1] | rail: { path, speed, w, h } (Star Fox: the rail's point rides on, the ship moves about a w x h
window across it) }): each step f.update(dt, { steer: [x, y], boost, brake, roll: -1 | 1 (a barrel roll: f.rolling),
loop }); f.x, y, z, yaw, pitch, roll, speed, frame (the rail's point), hitGround; f.seek(list, { cone, range }): what a
charged shot locks on; f.at(): where to draw it this frame. world.pen.at(x, y, z, yaw, size, pitch, roll) tips the pen.
camera 'behind': behind the target's heading (yaw, angle or facing) and pitch, swinging after it (camera.behind = { dist,
height, ahead, lag, fov, roll }): a kart's camera, a ship's (follow f.frame on a rail).
Split screen: game.splitScreen(2) and world.addCamera(o): viewport i draws through world.cameras[i]; world.project
answers in the viewport drawn last; no filter while split.

## First person and third: a shooter (the starter's SHOOTER slice shows it all)
camera 'fixed' with capture: each step turn by camera.takeMouse(), set camera.fixed (the eyes, or over the shoulder pulled
in by world.ray). overlay: { fov } makes world.overlay = { scene, camera, pen, on }: drawn after the world, its depth
cleared (the gun never sinks into a wall), lit like the world. overlay.pen is a pen in the eye's frame (engine units: x
ahead, y right, z up): draw the arms and gun in onDraw; world.pen there draws bodies (the pens empty after each frame).

## The look
  world.look = 'card' | 'puppet'; world.res = 'pixels' | 'balanced' | 'full'; world.shadows; world.outlines
  world.filter = { look: 'clean' | 'cel' (Comic cel: flat bands of light, ink) | 'pixel' (big dithered pixels), apply:
  'all' | 'objects' | 'env', bloom, fxaa, bands, ink, inkW, punch, px, levels, dither }
  E.World3D.SETTINGS in the game's menu lets the player pick the look, the picture, shadows and the filter.
  E.World3D.INPUT: WASD or arrows move, Space jumps, J or a click attacks, Shift dashes, E skill, Q lock, C camera.

## Your own three.js
E.THREE (three/webgpu), E.TSL, E.RAPIER; world.scene, world.pw (Rapier's world), E.World3D.toThree(x, y, z) (engine
units to three's metres, y up). The rules: WebGPURenderer and node materials only (MeshLambertNodeMaterial,
MeshToonNodeMaterial, MeshBasicNodeMaterial, TSL): never WebGLRenderer, ShaderMaterial, onBeforeCompile, EffectComposer or
three/addons (not vendored); no compute shaders or storage buffers; nothing read back from the GPU. An InstancedMesh with
over 1,000 instances never uses DynamicDrawUsage (r182 drops its updates). Make meshes and lights when the world is made,
not mid-game (a new material builds its shader: a stall).

## Tests
Headless Chromium runs it on WebGL 2 (?backend=webgl) and WebGPU (SwiftShader). world.hash() is the proof; game.advance(s)
runs fixed steps at once; game.input.hold / tap script input. The kits expose window.__game.
*/
import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import RAPIER from '@dimforge/rapier3d-simd-compat';

/* =============================================================================
 * 1. SETUP  units, helpers, collision groups, the page's renderer (World3D.init)
 * ============================================================================= */
const E = globalThis.My3D2dge;
if (!E || !E.Game) throw new Error('my-3D2dge 3D: load the engine (engine/my-3d2dge.js, a classic script) before this module');
const { clamp, lerp, approach, TAU } = E;
/** U: engine units per metre (one floor tile is 16 units: one metre). three.js works in metres with y up */
const U = 16, T = 16, DEG = Math.PI / 180, OUTLINE = '#0c0818';
const Z_UP = { x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 };   // Rapier's capsules and cylinders stand along y: this stands them up along z
/** engine units (x east, y south, z up) -> three.js metres (x east, y up, z south) */
const toThree = (x, y, z, out = new THREE.Vector3()) => out.set(x / U, z / U, y / U);
const _lin = new Map(), _col = new THREE.Color();
/** '#rrggbb' -> linear RGB floats (cached): instance colors */
function lin(hex) { let v = _lin.get(hex); if (!v) { _col.set(hex); v = [_col.r, _col.g, _col.b]; _lin.set(hex, v); } return v; }
const _F32 = new Float32Array(1), _I32 = new Uint32Array(_F32.buffer);
/** a hash of a list of numbers by their exact float32 bits (FNV-1a), as 8 hex digits: equal state, equal hash */
function hashNumbers(list) {
  let h = 0x811c9dc5;
  for (const n of list) { _F32[0] = n; h ^= _I32[0]; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
// collision groups (Rapier: membership << 16 | filter; a pair touches when each one's filter has the other's membership):
// the level and platforms touch everything; props everything but flyers; heroes the level, props, platforms and mobs
// (their capsules shove mobs aside); mobs each other too; flyers the level and each other; the downed (setSolid(false))
// the level, props and platforms only
const ig = (member, filter) => (member << 16) | filter;
const GROUPS = { level: ig(1, 0xffff), platform: ig(64, 0xffff), prop: ig(2, 1 | 2 | 4 | 8 | 32 | 64), hero: ig(4, 1 | 2 | 8 | 64),
  mob: ig(8, 1 | 2 | 4 | 8 | 64), flyer: ig(16, 1 | 16 | 64), down: ig(32, 1 | 2 | 64) };
const HERO_QUERY = ig(4, 1 | 2 | 64);   // a hero's controller steers round the level, props and platforms; its capsule shoves monsters
const LEVEL_ONLY = ig(0xffff, 1 | 64);  // sight lines and camera checks: the level and platforms

/** the page's one renderer and 3D canvas, shared by every world (World3D.init makes them) */
const PAGE = { ready: null, renderer: null, canvas: null, backend: 'none', game: null, worlds: new Set(), active: null };
async function init(game, o = {}) {
  if (PAGE.ready) return PAGE.ready;
  return (PAGE.ready = (async () => {
    await RAPIER.init({});
    PAGE.game = game;
    if (o.render === false || !game || game.headless || typeof document === 'undefined') return PAGE;
    // the 3D canvas: the page's #view, or one made right under the game's canvas, which stays on top (clear: bg null)
    const gc = game.screen.canvas;
    let cv = typeof o.canvas === 'string' ? document.getElementById(o.canvas) : o.canvas || document.getElementById('view');
    if (!cv) { cv = document.createElement('canvas'); cv.id = 'view'; gc.parentNode.insertBefore(cv, gc); }
    Object.assign(cv.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', zIndex: '0' });
    if (!gc.style.zIndex) gc.style.zIndex = '1';
    gc.style.background = 'transparent';
    if (!game.screen.clear) E.warn('3d:bg', 'a 3D world draws under the game\'s canvas: make the game with bg: null, or its background hides the world');
    const qs = new URLSearchParams(location.search), webgl = o.backend === 'webgl' || qs.get('backend') === 'webgl';
    const r = new THREE.WebGPURenderer({ canvas: cv, antialias: false, forceWebGL: webgl });
    await r.init();
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NoToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    r.info.autoReset = false; r.setPixelRatio(1);
    Object.assign(PAGE, { renderer: r, canvas: cv, backend: r.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2' });
    mouseLook(gc);
    return PAGE;
  })());
}

/** the mouse turns the chase, first-person and fly cameras of the world drawn last: a click on the game's canvas in
 *  play captures it (pointer lock; Esc or a pause frees it), then each move turns the camera (camera.mouseLook false:
 *  never). Off while a session is recorded or replayed: the lock is not in its record, so the replay would turn apart */
function mouseLook(gc) {
  const cam = () => { const w = PAGE.active; return w && w.camera; }, S = E.session;
  gc.addEventListener('pointerdown', e => {
    const c = cam(); if (!c || e.pointerType !== 'mouse' || !c.mouseLook || !(c.capture || ['chase', 'first', 'fly'].includes(c.mode)) || document.pointerLockElement) return;
    if (PAGE.game.paused || (S && (S.recording || S.replaying))) return;
    try { const r = gc.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* refused: [ and ] still turn it */ }
  });
  document.addEventListener('pointerlockchange', () => { for (const w of PAGE.worlds) w.camera.locked = document.pointerLockElement === gc; });
  document.addEventListener('mousemove', e => {
    const c = cam(); if (!c || !c.locked || PAGE.game.paused) return;
    const k = .0024, dx = e.movementX || 0, dy = e.movementY || 0;
    if (c.capture) { c.mouse[0] += dx; c.mouse[1] += dy; return; }   // (the game turns its own camera with them)
    c.yaw += dx * k; c._held = 1.5;
    if (c.mode === 'chase') c.chase.pitch = clamp(c.chase.pitch - dy * k, -1.3, .15);
    else if (c.mode === 'first') c.first.pitch = clamp(c.first.pitch - dy * k, -1.2, 1.1);
    else if (c.mode === 'fly') c.fly.pitch = clamp(c.fly.pitch - dy * k, -1.5, 1.5);
  });
}

/* =============================================================================
 * 2. TEXTURES AND MATERIALS  everything drawn by code, pixel by pixel, baked into crisp (nearest) textures
 * ============================================================================= */
/** a texture function (x, y) -> [r, g, b] baked into a w x h texture (repeating unless repeat is false) */
function bake(fn, w, h, repeat = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y), i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return canvasTex(cv, repeat);
}
function canvasTex(cv, repeat = true) {
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  return t;
}
const H = E.hex;
/** the stone palette of the stress test's hall: flagstones, mortar, lit and dark edges, specks */
const STONE = { stones: ['#4b4559', '#554f64', '#433e51', '#5d566c'].map(H), mortar: H('#221e2b'), hi: H('#6f6782'), lo: H('#322d3e'), speck: H('#2a2634') };
/** the ground's looks (a level's ground, a tile's ground): (x, y, o) -> [r, g, b] or [r, g, b, glow 0..1] in engine
 *  units; o: the legend entry (its colors: base, dark, light, ...). Add your own: World3D.GROUND.lava = (x, y, o) => ... */
const GROUND = {
  flagstone: (x, y, o) => E.tex.flagstone(x, y, o.pal || STONE),
  grass: (x, y, o) => E.tex.grass(x, y, o),
  dirt: (x, y, o) => E.tex.dirt(x, y, o),
  sand: (x, y, o) => E.tex.dirt(x, y, Object.assign({ base: '#d6bc84', dark: '#b4955e', light: '#ecd8a4' }, o)),
  snow: (x, y, o) => E.tex.dirt(x, y, Object.assign({ base: '#e6ecf6', dark: '#c4cee0', light: '#ffffff' }, o)),
  planks: (x, y, o) => E.tex.planks(x, y, o),
  tiles: (x, y, o) => E.tex.checker(x, y, o),
  plain: (x, y, o) => E.tex.plain(x, y, o),
  water: (x, y, o) => E.tex.water(x, y, o),
  lava: (x, y) => { const n = E.noise2(x * .08, y * .08) * .7 + E.noise2(x * .3, y * .3) * .3; return n > .62 ? [255, 214, 106, 1] : n > .45 ? [255, 122, 42, 1] : [170, 40, 26, .7]; }
};
/** the sides' looks (walls, raised floors, platforms, stairs): { w, h, fn(x, y, c) } where c holds the entry's colors as
 *  [r, g, b] (side, line, top, hi, lo) and (x, y) is a pixel of a w x h texture that repeats every metre (16 pixels)
 *  across; h is the pixels it spans up (64: earth's grass lip sits at the top of four metres) */
const SIDE = {
  brick: { w: 16, h: 16, fn(x, y, c) {   // courses of bricks, joints staggered by course, lit brick tops and specks
    const z = 15 - y, ci = Math.floor(z / 8), fz = z - ci * 8;
    if (fz === 0) return c.line;
    const jx = (ci & 1) ? 4 : 12; if (x === jx) return c.line;
    const v = E.hash2(ci * 7 + (x < jx ? 0 : 1), ci + 99);
    if (fz === 7) return v > .5 ? c.hi : c.side;
    if (E.hash2(x * 3 + 1, z * 5 + 2) < .07) return c.lo;
    return v < .22 ? c.lo : v > .86 ? c.hi : c.side;
  } },
  block: { w: 16, h: 16, fn(x, y, c) {   // dressed stone: big blocks, bevelled (lit top and left, dark bottom and right)
    const row = Math.floor(y / 8), off = (row & 1) * 8, lx = (x + off) % 16, ly = y - row * 8;
    if (ly === 7 || lx === 15) return c.line;
    if (ly === 0 || lx === 0) return c.hi;
    if (ly === 6 || lx === 14) return c.lo;
    return E.noise2(x * .3, y * .3) > .8 ? c.lo : c.side;
  } },
  earth: { w: 16, h: 64, fn(x, y, c) {   // packed earth with stones, a grass lip at the top that hangs in tufts
    const lip = 3 + (E.hash2(x, 7) > .5 ? 1 : 0) + (E.hash2(x >> 1, 3) > .7 ? 1 : 0);
    if (y < lip) return y === lip - 1 ? c.lo2 : c.top;
    const n = E.noise2(x * .25, y * .25);
    if (n > .78) return c.hi;
    if (E.hash2(x * 5 + 1, y * 3 + 2) < .06) return c.lo;
    return n < .3 ? c.lo : c.side;
  } },
  planks: { w: 16, h: 16, fn(x, y, c) {   // boards standing up, a dark seam between each, nails at the ends
    const b = Math.floor(x / 4), lx = x % 4;
    if (lx === 3) return c.line;
    if ((y === 2 || y === 13) && lx === 1) return c.lo;
    return E.hash2(b, Math.floor(y / 5)) > .75 ? c.lo : lx === 0 ? c.hi : c.side;
  } },
  metal: { w: 16, h: 16, fn(x, y, c) {   // plates with rivets
    if (x === 0 || y === 0) return c.hi; if (x === 15 || y === 15) return c.line;
    if ((x === 2 || x === 13) && (y === 2 || y === 13)) return c.lo;
    return E.noise2(x * .2, y * .2) > .7 ? c.hi : c.side;
  } }
};
/** an entry's colors as RGB arrays (side, top, line, hi, lo, lo2), from its color (and the style's defaults) */
const STYLE_COLORS = { brick: '#3d3750', block: '#4a4360', earth: '#7d5838', planks: '#8f5f37', metal: '#5c6070' };
function sideColors(style, o) {
  const side = o.color || STYLE_COLORS[style] || '#4a4360', t = E.tones(side);
  return { side: H(side), line: H(o.line || E.shade(side, -.35)), hi: H(t.lt), lo: H(t.sh), top: H(o.top || (style === 'earth' ? '#55a94a' : E.shade(side, .25))), lo2: H(E.shade(o.top || '#55a94a', -.25)) };
}
/** a box (w, d, h in units; three's axes) whose faces keep 16 pixels per metre (BoxGeometry stretches 0..1 over a face) */
function boxGeo(w, d, h) {
  const g = new THREE.BoxGeometry(w / U, h / U, d / U), uv = g.attributes.uv, size = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];   // faces: +x -x +y -y +z -z
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * size[f][0] / T, uv.getY(i) * size[f][1] / T); }
  return g;
}
/** a box with two draw groups (its four sides, then top and bottom) instead of six: fewer draw calls */
function sidesThenTops(g) {
  const idx = g.index.array, face = f => Array.from(idx.slice(f * 6, f * 6 + 6));
  g.setIndex([0, 1, 4, 5, 2, 3].flatMap(face)); g.clearGroups(); g.addGroup(0, 24, 0); g.addGroup(24, 12, 1);
  return g;
}
/* the puppets' toon look: three bands of light (shadow, base, lit), like the engine's tones */
const TOON_BANDS = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
/* outlines: an inverted hull. The same (instanced) mesh again, back faces only, each vertex pushed OUTLINE_PX pixels
 * outward on the screen (along its normal for round parts, away from the part's centre for boxes) */
const OUTLINE_PX = TSL.uniform(new THREE.Vector2(.01, .01));   // clip-space size of the push, set per frame (one game pixel)
function outlineMat(mode = 'normal') {
  const { Fn, vec4, positionLocal, normalLocal, modelViewMatrix, cameraProjectionMatrix } = TSL;
  const m = new THREE.MeshBasicNodeMaterial({ color: OUTLINE, side: THREE.BackSide, fog: false });
  m.vertexNode = Fn(() => {
    const mvp = cameraProjectionMatrix.mul(modelViewMatrix), pos = mvp.mul(vec4(positionLocal, 1));
    const out = mode === 'center' ? positionLocal : normalLocal;
    const pos2 = mvp.mul(vec4(positionLocal.add(out.normalize().mul(.01)), 1));
    const dir = pos2.xy.div(pos2.w).sub(pos.xy.div(pos.w)).normalize();
    return vec4(pos.xy.add(dir.mul(OUTLINE_PX).mul(pos.w)), pos.z, pos.w);
  })();
  return m;
}
const lambert = (map, o) => new THREE.MeshLambertNodeMaterial(Object.assign({ map }, o));
/** static meshes merged by material (one draw call each): add(geometry, [x, y, z] metres, a material or one per group,
 *  casts a shadow), then build(scene) */
class Merger {
  constructor() { this.by = new Map(); }
  add(geo, at, mats, shadow = true) {
    const P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv, idx = geo.index ? geo.index.array : null;
    const groups = geo.groups.length ? geo.groups : [{ start: 0, count: idx ? idx.length : P.count, materialIndex: 0 }];
    for (const gr of groups) {
      const m = Array.isArray(mats) ? mats[gr.materialIndex] : mats;
      let b = this.by.get(m); if (!b) this.by.set(m, b = { pos: [], nor: [], uv: [], shadow: false });
      for (let k = gr.start; k < gr.start + gr.count; k++) {
        const i = idx ? idx[k] : k;
        b.pos.push(P.getX(i) + at[0], P.getY(i) + at[1], P.getZ(i) + at[2]); b.nor.push(N.getX(i), N.getY(i), N.getZ(i)); b.uv.push(UV ? UV.getX(i) : 0, UV ? UV.getY(i) : 0);
      }
      b.shadow = b.shadow || shadow;
    }
    geo.dispose();
  }
  build(scene, own) {
    for (const [m, b] of this.by) {
      const g = own(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.castShadow = b.shadow; scene.add(mesh);
    }
    this.by.clear();
  }
}

/* =============================================================================
 * 3. LEVEL  written as text, one character per floor tile (1 metre, 16 units); row 0 is the far (north) edge, y grows
 *    south, x east. What each character is comes from the legend (LEGEND below, then the level's own legend over it):
 *      { floor: h }                  walkable at height h (units; 0 the ground; a raised floor is solid down to the ground)
 *      { wall: h }                   a solid block h tall (cut low where it stands between a view camera and the hall)
 *      { pillar: h }                 each block of these tiles is one pillar: plinth, shaft and capital
 *      { stairs: 'n'|'s'|'e'|'w', from, floor }   stairs rising toward that side, from height `from` (0) to `floor`
 *      { platform: h, thick: 4 }     a slab in the air whose top is at h (walk under it); with pit: true, over nothing
 *      { pit: true }                 no floor: a body that falls in is lost (actor.fell)
 *      { torch: true }               a brazier on the floor, lit by the world's torch lights
 *      { mark: 'name' }              a spot to put things: world.marks.name -> [{ x, y, z, cx, cy }] (the tile's centre)
 *    and how it looks: ground ('flagstone' 'grass' 'dirt' 'sand' 'snow' 'planks' 'tiles' 'plain' 'water' 'lava', a key of
 *    World3D.GROUND, or a function (x, y) -> [r, g, b]) with its colors (base, dark, light, flower), side ('brick' 'block'
 *    'earth' 'planks' 'metal') with color (and top, line). A level's own ground, side and color are every tile's default.
 * ============================================================================= */
const LEGEND = { '#': { wall: 48 }, w: { wall: 12 }, P: { pillar: 56 }, '.': {}, ' ': { pit: true }, t: { torch: true } };
const FLOOR = 0, WALL = 1, PILLAR = 2, STAIRS = 3, PIT = 4, TORCH = 5;
const STEP_UP = 3.5, CUT_H = 7;   // STEP_UP: the highest step a walker climbs (units); CUT_H: a wall cut low in front of a view camera
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const STAIR_DIR = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const _m4 = new THREE.Matrix4(), _q0 = new THREE.Quaternion(), _v0 = new THREE.Vector3(), _s0 = new THREE.Vector3();
class Level {
  constructor(world, def) {
    const rows = def.rows, legend = Object.assign({}, LEGEND, def.legend);
    if (!Array.isArray(rows) || !rows.length) throw new Error('my-3D2dge 3D: a level needs rows: an array of strings, one character per 1-metre tile');
    const mw = Math.max(...rows.map(r => r.length)), mh = rows.length, n = mw * mh;
    if (rows.some(r => r.length !== mw)) E.warn('3d:rows', 'a level\'s rows are not all the same length: the short ones end in pits');
    Object.assign(this, { world, def, rows, mw, mh, width: mw * T, depth: mh * T, bottom: def.bottom ?? -96 });
    this.specs = new Array(n); this.kind = new Uint8Array(n); this.base = new Float32Array(n); this.plat = new Float32Array(n).fill(-1e9); this.platLo = new Float32Array(n);
    this.stairOf = new Int16Array(n).fill(-1); this.marks = {}; this.torches = []; this.stairs = []; this.shapes = [];
    for (let cy = 0; cy < mh; cy++) for (let cx = 0; cx < mw; cx++) {
      const i = cy * mw + cx, ch = rows[cy][cx] ?? ' ';
      let sp = legend[ch]; if (!sp) { E.warn('3d:legend:' + ch, 'the level uses "' + ch + '", which its legend does not say: it is floor'); sp = {}; }
      this.specs[i] = sp;
      const fl = sp.floor || 0;
      const k = sp.wall ? WALL : sp.pillar ? PILLAR : sp.stairs ? STAIRS : sp.pit ? PIT : sp.torch ? TORCH : FLOOR;
      this.kind[i] = k;
      this.base[i] = k === WALL ? fl + sp.wall : k === PILLAR ? fl + sp.pillar : k === PIT ? this.bottom : fl;
      if (sp.platform) { this.plat[i] = sp.platform; this.platLo[i] = sp.platform - (sp.thick || 4); }
      if (sp.shape) this.shapes.push([sp.shape, (cx + .5) * T, (cy + .5) * T, sp.platform || (k === PIT ? this.bottom : fl), sp]);
      if (sp.mark) (this.marks[sp.mark] ||= []).push({ x: (cx + .5) * T, y: (cy + .5) * T, z: sp.platform || (k === PIT ? this.bottom : fl), cx, cy });
      if (k === TORCH) this.torches.push({ x: (cx + .5) * T, y: (cy + .5) * T, z: fl, t: E.hash2(cx, cy) * 9 });
    }
    // stairs: each block of one character is one flight, rising toward its side from `from` to `floor`
    for (const [x0, y0, x1, y1, ch] of this.rects(i => this.kind[i] === STAIRS ? this.chars(i) : null)) {
      const sp = this.specs[y0 * mw + x0], d = STAIR_DIR[sp.stairs] || STAIR_DIR.n;
      const s = { x0, y0, x1, y1, ch, dir: sp.stairs in STAIR_DIR ? sp.stairs : 'n', dx: d[0], dy: d[1], low: sp.from || 0, high: sp.floor ?? 16, sp };
      if (s.low > s.high) { [s.low, s.high] = [s.high, s.low]; s.dir = { n: 's', s: 'n', e: 'w', w: 'e' }[s.dir]; s.dx = -s.dx; s.dy = -s.dy; }   // (stairs down: the same flight, rising the other way)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { this.stairOf[y * mw + x] = this.stairs.length; this.base[y * mw + x] = s.high; }
      this.stairs.push(s);
    }
    // the tiles a solid shape's turned footprint covers (shrunk by a unit: one flush with a tile's edge stays out of it)
    this.shapeBlock = new Uint8Array(n);
    for (const [id, x, y, z, sp] of this.shapes) {
      const b = sp.solid === false ? null : E.shapeBox(id, x, y, z, sp); if (!b) continue;
      const ex = Math.abs(b.c) * b.hx + Math.abs(b.s) * b.hy - 1, ey = Math.abs(b.s) * b.hx + Math.abs(b.c) * b.hy - 1;
      for (let cy = Math.floor((b.y - ey) / T); cy <= Math.floor((b.y + ey) / T); cy++) for (let cx = Math.floor((b.x - ex) / T); cx <= Math.floor((b.x + ex) / T); cx++) if (cx >= 0 && cy >= 0 && cx < mw && cy < mh) this.shapeBlock[cy * mw + cx] = 1;
    }
    this.pass = this._pass();
  }
  chars(i) { return this.rows[(i / this.mw) | 0][i % this.mw]; }
  /** the tile index at engine point (x, y), or -1 off the map */
  index(x, y) { const cx = Math.floor(x / T), cy = Math.floor(y / T); return cx < 0 || cy < 0 || cx >= this.mw || cy >= this.mh ? -1 : cy * this.mw + cx; }
  /** the legend entry of tile (cx, cy) (null off the map) */
  spec(cx, cy) { return cx < 0 || cy < 0 || cx >= this.mw || cy >= this.mh ? null : this.specs[cy * this.mw + cx]; }
  /** walls, pillars and braziers: nobody walks there (off the map too) */
  solidTile(cx, cy) { if (cx < 0 || cy < 0 || cx >= this.mw || cy >= this.mh) return true; const k = this.kind[cy * this.mw + cx]; return k === WALL || k === PILLAR || k === TORCH; }
  /** the ground's height at (x, y): a floor, a stair's slope, a wall's or pillar's top, `bottom` over a pit (platforms are
   *  not ground: floorAt sees them) */
  ground(x, y) {
    const i = this.index(x, y); if (i < 0) return this.bottom;
    const si = this.stairOf[i];
    if (si >= 0) {
      const s = this.stairs[si], len = (s.dx ? s.x1 - s.x0 + 1 : s.y1 - s.y0 + 1) * T;
      const t = s.dir === 'n' ? ((s.y1 + 1) * T - y) / len : s.dir === 's' ? (y - s.y0 * T) / len : s.dir === 'e' ? (x - s.x0 * T) / len : ((s.x1 + 1) * T - x) / len;
      return s.low + (s.high - s.low) * clamp(t, 0, 1);
    }
    return this.base[i];
  }
  /** the surface a body at height z stands on or falls to at (x, y): the highest ground or platform top no more than 4
   *  units above z, else `bottom` (inside a wall: nothing under it) */
  floorAt(x, y, z = 1e9) {
    const i = this.index(x, y); if (i < 0) return this.bottom;
    let best = this.bottom; const g = this.ground(x, y), p = this.plat[i];
    if (g <= z + 4) best = g;
    if (p > best && p <= z + 4) best = p;
    return best;
  }
  /** the top of whatever stands at (x, y): a wall's, a platform's or the ground (shots, the camera) */
  topH(x, y) { const i = this.index(x, y); return i < 0 ? this.bottom : Math.max(this.ground(x, y), this.plat[i]); }
  /** rectangles covering the tiles with the same key (greedy, rows first): [x0, y0, x1, y1, key] in tiles, inclusive;
   *  key(i) returns null for tiles left out */
  rects(key) {
    const { mw, mh } = this, used = new Uint8Array(mw * mh), out = [];
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const i = y * mw + x; if (used[i]) continue; const k = key(i); if (k === null || k === undefined) continue;
      let x1 = x; while (x1 + 1 < mw && !used[y * mw + x1 + 1] && key(y * mw + x1 + 1) === k) x1++;
      let y1 = y; for (;;) { const ny = y1 + 1; if (ny >= mh) break; let ok = true; for (let q = x; q <= x1; q++) if (used[ny * mw + q] || key(ny * mw + q) !== k) { ok = false; break; } if (!ok) break; y1 = ny; }
      for (let yy = y; yy <= y1; yy++) for (let xx = x; xx <= x1; xx++) used[yy * mw + xx] = 1;
      out.push([x, y, x1, y1, k]);
    }
    return out;
  }
  /* the walkable grid: from one tile to the next when neither is solid or a pit, and walking the line between their
   * centres never climbs a step higher than STEP_UP (stairs climb gently; a raised floor's edge is a wall from below,
   * a drop from above) */
  _pass() {
    const { mw, mh } = this, pass = new Uint8Array(mw * mh);
    const open = (cx, cy) => !this.solidTile(cx, cy) && this.kind[cy * mw + cx] !== PIT && !this.shapeBlock[cy * mw + cx];   // (a solid shape's tiles: walked round)
    for (let cy = 0; cy < mh; cy++) for (let cx = 0; cx < mw; cx++) {
      if (!open(cx, cy)) continue;
      let bits = 0;
      DIRS8.forEach(([dx, dy], k) => {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= mw || ny >= mh || !open(nx, ny)) return;
        if (dx && dy && (!open(cx + dx, cy) || !open(cx, cy + dy))) return;   // no cutting a corner
        const ax = (cx + .5) * T, ay = (cy + .5) * T; let h = this.ground(ax, ay), ok = true;
        for (let s = 1; s <= 8; s++) { const h2 = this.ground(ax + dx * T * s / 8, ay + dy * T * s / 8); if (h2 - h > STEP_UP) { ok = false; break; } h = h2; }
        if (ok) bits |= 1 << k;
      });
      pass[cy * mw + cx] = bits;
    }
    return pass;
  }
  /** Rapier's fixed colliders for all of it, into a new physics world */
  colliders(pw) {
    const fixed = pw.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const box = (x0, y0, z0, x1, y1, z1, g = GROUPS.level) => pw.createCollider(RAPIER.ColliderDesc.cuboid((x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2).setTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2).setFriction(.6).setCollisionGroups(g), fixed);
    const hull = pts => pw.createCollider(RAPIER.ColliderDesc.convexHull(new Float32Array(pts.flat())).setFriction(.6).setCollisionGroups(GROUPS.level), fixed);
    // columns: every tile but a pit is solid from below the ground up to its top (a stair's foot: its slope is a wedge)
    const colTop = i => { const k = this.kind[i]; return k === PIT ? null : k === STAIRS ? this.stairs[this.stairOf[i]].low : this.base[i]; };
    for (const [x0, y0, x1, y1, top] of this.rects(colTop)) box(x0 * T, y0 * T, Math.min(top, 0) - 16, (x1 + 1) * T, (y1 + 1) * T, top);
    for (const [x0, y0, x1, y1, k] of this.rects(i => this.plat[i] > -1e8 ? this.plat[i] + ':' + this.platLo[i] : null)) {
      const [top, lo] = k.split(':').map(Number); box(x0 * T, y0 * T, lo, (x1 + 1) * T, (y1 + 1) * T, top, GROUPS.platform);
    }
    for (const s of this.stairs) {   // a wedge: `low` at the foot, `high` at the top side
      const a = s.x0 * T, b = (s.x1 + 1) * T, n = s.y0 * T, so = (s.y1 + 1) * T, L = s.low, Hh = s.high;
      const top = s.dir === 'n' ? [[a, n], [b, n]] : s.dir === 's' ? [[a, so], [b, so]] : s.dir === 'e' ? [[b, n], [b, so]] : [[a, n], [a, so]];
      hull([[a, n, L], [b, n, L], [a, so, L], [b, so, L], ...top.map(([x, y]) => [x, y, Hh])]);
    }
    for (const t of this.torches) pw.createCollider(RAPIER.ColliderDesc.cylinder(6, 5).setRotation(Z_UP).setTranslation(t.x, t.y, t.z + 6).setCollisionGroups(GROUPS.level), fixed);
  }
}

/* ---- the flow field: distances along the walkable grid toward one point, recomputed when the point changes tile ---- */
class Flow {
  /** new Flow(level): world.flow() makes one; flow.to(x, y) aims it, flow.dir(x, y, out) reads it */
  constructor(level) { this.L = level; this.d = new Float32Array(level.mw * level.mh); this.heap = []; this.tx = -1; this.ty = -1; }
  /** aim at (x, y) (engine units); cheap when it stays on the same tile */
  to(x, y) {
    const L = this.L, mw = L.mw, mh = L.mh, tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx === this.tx && ty === this.ty) return this; this.tx = tx; this.ty = ty;
    const d = this.d; d.fill(1e9);
    const open = (a, b) => a >= 0 && b >= 0 && a < mw && b < mh && L.pass[b * mw + a];
    const seeds = open(tx, ty) ? [[tx, ty]] : DIRS8.map(([dx, dy]) => [tx + dx, ty + dy]).filter(([a, b]) => open(a, b));   // (standing on a wall: the tiles round it)
    const Hp = this.heap; Hp.length = 0;
    const push = (i, v) => { Hp.push([v, i]); let k = Hp.length - 1; while (k) { const p = (k - 1) >> 1; if (Hp[p][0] <= Hp[k][0]) break; [Hp[p], Hp[k]] = [Hp[k], Hp[p]]; k = p; } };
    const pop = () => { const top = Hp[0], last = Hp.pop(); if (Hp.length) { Hp[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < Hp.length && Hp[l][0] < Hp[m][0]) m = l; if (r < Hp.length && Hp[r][0] < Hp[m][0]) m = r; if (m === k) break; [Hp[m], Hp[k]] = [Hp[k], Hp[m]]; k = m; } } return top; };
    for (const [a, b] of seeds) { d[b * mw + a] = 0; push(b * mw + a, 0); }
    while (Hp.length) {
      const [v, i] = pop(); if (v > d[i]) continue;
      const cx = i % mw, cy = (i / mw) | 0;
      DIRS8.forEach(([dx, dy], k) => {   // walk backwards: a neighbour reaches i if its own step toward i is passable
        const nx = cx - dx, ny = cy - dy; if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) return;
        const j = ny * mw + nx; if (!(L.pass[j] & (1 << k))) return;
        const w = v + (dx && dy ? 1.414 : 1); if (w < d[j]) { d[j] = w; push(j, d[j]); }   // (the distance as stored: a float32, so the pop's check above never takes it for a stale one)
      });
    }
    return this;
  }
  /** the ground direction to walk from (x, y) toward the target, as [x, y] in out (length 1), or null (there already,
   *  off the grid, or no way there: walk straight) */
  dir(x, y, out = [0, 0]) {
    const L = this.L, mw = L.mw, cx = Math.floor(x / T), cy = Math.floor(y / T), i = cy * mw + cx;
    if (cx < 0 || cy < 0 || cx >= mw || cy >= L.mh) return null;
    const here = this.d[i]; if (!(here < 1e9) || here === 0) return null;
    let best = here, bx = 0, by = 0; const bits = L.pass[i];
    DIRS8.forEach(([dx, dy], k) => { if (!(bits & (1 << k))) return; const v = this.d[(cy + dy) * mw + cx + dx]; if (v < best) { best = v; bx = dx; by = dy; } });
    if (!bx && !by) return null;
    const tx = (cx + bx + .5) * T - x, ty = (cy + by + .5) * T - y, l = Math.hypot(tx, ty) || 1;
    out[0] = tx / l; out[1] = ty / l; return out;
  }
  /** steps from (x, y) to the target along the grid (1e9: no way) */
  distance(x, y) { const i = this.L.index(x, y); return i < 0 ? 1e9 : this.d[i]; }
}

/* ---- the level's meshes: the ground baked once (contact shadows at the foot of what stands taller), side faces merged
 *      per look, walls and pillars instanced (cut low or to stumps by the view camera), stairs, platforms, braziers ---- */
Level.prototype.meshes = function (world) {
  const L = this, { mw, mh, def } = L, scene = world.scene, own = x => world._own(x);
  const mat = (key, make) => world._mat(key, make);
  const sideStyle = sp => sp.side || def.side || ((sp.ground || def.ground) === 'grass' ? 'earth' : 'block');
  const sideMat = (style, sp) => { const S = SIDE[style] || SIDE.block, c = sideColors(style, Object.assign({}, def.colors, sp)); return mat('side:' + style + ':' + JSON.stringify(c), () => lambert(own(bake((x, y) => S.fn(x, y, c), S.w, S.h)))); };
  const topMat = color => mat('top:' + color, () => { const tt = E.tones(color), base = H(color), sh = H(tt.sh), lt = H(tt.lt); return lambert(own(bake((x, y) => { const v = E.hash2(x * 3 + 71, y * 5 + 37); return v < .08 ? sh : v > .96 ? lt : base; }, 16, 16))); });
  const add = m => { scene.add(m); return m; };

  /* the ground: every surface seen from above (floors, raised floors, platform tops) in one texture, a pixel per unit
   * (fewer on a level over 128 tiles), with the glow of what gives off light (lava, runes) as its emissive map */
  const ppu = Math.min(1, 2048 / Math.max(L.width, L.depth)), w = Math.round(L.width * ppu), h = Math.round(L.depth * ppu);
  const cv = document.createElement('canvas'), gv = document.createElement('canvas'); cv.width = gv.width = w; cv.height = gv.height = h;
  const g = cv.getContext('2d'), gg = gv.getContext('2d'), img = g.createImageData(w, h), gimg = gg.createImageData(w, h), d = img.data, gd = gimg.data;
  const looks = new Array(mw * mh);
  const lookOf = i => looks[i] || (looks[i] = (() => {
    const sp = L.specs[i], st = sp.ground || def.ground || 'flagstone', o = Object.assign({}, def.colors, sp.colors, sp);
    return { fn: typeof st === 'function' ? st : GROUND[st] || GROUND.flagstone, o };
  })());
  const R = 5;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const x = (px + .5) / ppu, y = (py + .5) / ppu, cx = Math.floor(x / T), cy = Math.floor(y / T), i = cy * mw + cx, k = L.kind[i];
    if (k === WALL || k === PILLAR || k === STAIRS || (k === PIT && L.plat[i] < -1e8)) continue;
    const lk = lookOf(i); let c = lk.fn(x, y, lk.o); if (!c) continue;
    const s = L.plat[i] > -1e8 ? L.plat[i] : L.base[i], lx = x - cx * T, ly = y - cy * T;
    if (L.plat[i] < -1e8) {   // a contact shadow at the foot of anything taller beside it
      const taller = (a, b) => a >= 0 && b >= 0 && a < mw && b < mh && L.topH((a + .5) * T, (b + .5) * T) > s + 4;
      let ao = 0;
      if (taller(cx - 1, cy)) ao = Math.max(ao, 1 - lx / R); if (taller(cx + 1, cy)) ao = Math.max(ao, 1 - (T - lx) / R);
      if (taller(cx, cy - 1)) ao = Math.max(ao, 1 - ly / R); if (taller(cx, cy + 1)) ao = Math.max(ao, 1 - (T - ly) / R);
      if (ao > 0) { const q = 1 - .4 * Math.round(ao * 5) / 5; c = [c[0] * q, c[1] * q * .98, c[2] * q * 1.02, c[3]]; }
    }
    const j = (py * w + px) * 4, glow = clamp(c[3] || 0, 0, 1);
    d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
    gd[j] = c[0] * glow; gd[j + 1] = c[1] * glow; gd[j + 2] = c[2] * glow; gd[j + 3] = 255;
  }
  g.putImageData(img, 0, 0); gg.putImageData(gimg, 0, 0);
  const floorMat = new THREE.MeshLambertNodeMaterial({ map: own(canvasTex(cv, false)), emissiveMap: own(canvasTex(gv, false)), emissive: '#ffffff', emissiveIntensity: 1.6 });
  world._own(floorMat);
  /** a flat polygon at height z (points in units) wearing the ground texture where it stands */
  const floorPoly = (pts, z) => {
    const pos = [], uvs = [], idx = [];
    for (const [x, y] of pts) { pos.push(x / U, z / U, y / U); uvs.push(x / L.width, 1 - y / L.depth); }
    for (let i = 1; i < pts.length - 1; i++) idx.push(0, i + 1, i);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    return own(geo);
  };
  L.floorPoly = floorPoly; L.floorMat = floorMat;
  const merge = new Merger();
  for (const [x0, y0, x1, y1, z] of L.rects(i => L.kind[i] === FLOOR || L.kind[i] === TORCH ? L.base[i] : null))
    merge.add(floorPoly([[x0 * T, y0 * T], [(x1 + 1) * T, y0 * T], [(x1 + 1) * T, (y1 + 1) * T], [x0 * T, (y1 + 1) * T]], z), [0, 0, 0], floorMat, false);

  /* side faces: wherever a floor stands higher than its neighbour (a raised floor, a ledge, the edge of a pit), one quad
   * on that edge from the neighbour's height (a pit: 80 units down) up to its own, in the floor's side look */
  const quads = new Map();
  const edgeH = (cx, cy, x, y) => { if (cx < 0 || cy < 0 || cx >= mw || cy >= mh) return null; const k = L.kind[cy * mw + cx]; return k === WALL || k === PILLAR ? null : k === PIT ? -1e9 : L.ground(x, y); };
  for (let cy = 0; cy < mh; cy++) for (let cx = 0; cx < mw; cx++) {
    const i = cy * mw + cx, k = L.kind[i]; if (k !== FLOOR && k !== TORCH) continue;
    const s = L.base[i], sp = L.specs[i], style = sideStyle(sp);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ex = (cx + .5 + dx * .5) * T, ey = (cy + .5 + dy * .5) * T;
      let ns = edgeH(cx + dx, cy + dy, ex + dx * .5, ey + dy * .5); if (ns === null) { if (cx + dx >= 0 && cx + dx < mw && cy + dy >= 0 && cy + dy < mh) continue; ns = -1e9; }
      if (s - ns < .01) continue;
      const lo = Math.max(ns, s - 80, L.bottom);
      // the edge's ends, left then right as seen from outside (from the neighbour, looking in)
      const px0 = dx ? ex : cx * T, py0 = dy ? ey : cy * T, px1 = dx ? ex : (cx + 1) * T, py1 = dy ? ey : (cy + 1) * T;
      const [A, Bp] = dx === 1 || dy === -1 ? [[px1, py1], [px0, py0]] : [[px0, py0], [px1, py1]];
      const key = style + ':' + JSON.stringify(sideColors(style, Object.assign({}, def.colors, sp)));
      let q = quads.get(key); if (!q) quads.set(key, q = { style, sp, pos: [], uv: [] });
      const Sh = (SIDE[style] || SIDE.block).h, v = z => 1 - (s - z) / Sh;
      const P = (p, z) => [p[0] / U, z / U, p[1] / U];
      q.pos.push(...P(A, lo), ...P(Bp, lo), ...P(Bp, s), ...P(A, lo), ...P(Bp, s), ...P(A, s));
      q.uv.push(0, v(lo), 1, v(lo), 1, 1, 0, v(lo), 1, 1, 0, 1);
    }
  }
  for (const q of quads.values()) {
    const geo = own(new THREE.BufferGeometry()); geo.setAttribute('position', new THREE.Float32BufferAttribute(q.pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(q.uv, 2)); geo.computeVertexNormals();
    const m = add(new THREE.Mesh(geo, sideMat(q.style, q.sp))); m.receiveShadow = m.castShadow = true;
  }

  /* walls: an instanced box per tile, and a short twin shown where the wall is cut low in front of a view camera */
  L.wallTypes = [];
  for (const ch of new Set(L.rows.join(''))) {
    const cells = [];
    for (let cy = 0; cy < mh; cy++) for (let cx = 0; cx < mw; cx++) if (L.rows[cy][cx] === ch && L.kind[cy * mw + cx] === WALL) {
      // which way it faces out of the level (away from the floor beside it): a camera on that side looks over it
      let ox = (L.solidTile(cx - 1, cy) ? 0 : -1) + (L.solidTile(cx + 1, cy) ? 0 : 1), oy = (L.solidTile(cx, cy - 1) ? 0 : -1) + (L.solidTile(cx, cy + 1) ? 0 : 1);
      ox = -ox; oy = -oy; if (!ox && !oy) { ox = cx < mw / 2 ? -1 : 1; oy = cy < mh / 2 ? -1 : 1; }
      const l = Math.hypot(ox, oy); cells.push({ cx, cy, ox: ox / l, oy: oy / l, z: L.specs[cy * mw + cx].floor || 0 });
    }
    if (!cells.length) continue;
    const sp = L.specs[cells[0].cy * mw + cells[0].cx], hh = sp.wall, style = sp.side || def.wallSide || 'brick', c = Object.assign({ color: '#3d3750', top: '#57506a', line: '#2a2538' }, sp);
    const mats = [sideMat(style, c), topMat(c.top)];
    const mk = hgt => { const geo = own(sidesThenTops(boxGeo(T, T, hgt))), m = add(new THREE.InstancedMesh(geo, mats, cells.length)); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.count = 0; return m; };
    L.wallTypes.push({ cells, h: hh, full: mk(hh), cut: hh > CUT_H + 4 && sp.cut !== false ? mk(CUT_H) : null, key: '' });
  }
  L.placeWalls('none', null);

  /* pillars: a plinth, a shaft of dressed stone and a capital on each block of pillar tiles (cut to a stump between a
   * view camera and the hero) */
  L.pillars = []; L.pillarTypes = [];
  const byChar = new Map();
  for (const r of L.rects(i => L.kind[i] === PILLAR ? L.chars(i) : null)) { if (!byChar.has(r[4])) byChar.set(r[4], []); byChar.get(r[4]).push(r); }
  for (const list of byChar.values()) {
    const [x0, y0, x1, y1] = list[0], sp = L.specs[y0 * mw + x0], hh = sp.pillar, w0 = (x1 - x0 + 1) * T, d0 = (y1 - y0 + 1) * T, fl = sp.floor || 0, col = sp.color || '#4a4360';
    const shaft = sideMat('block', { color: col }), cap = topMat(sp.top || '#6a6280'), edge = sideMat('brick', { color: E.shade(col, .08), line: '#302a40' });
    const parts = [[1.06, 0, 6, edge, cap], [.875, 6, hh - 8, shaft, shaft], [1.06, hh - 8, hh - 4, edge, cap], [1.19, hh - 4, hh, edge, cap]].map(([k, z0, z1, m1, m2]) => {
      const m = add(new THREE.InstancedMesh(own(sidesThenTops(boxGeo(w0 * k, d0 * k, z1 - z0))), [m1, m2], list.length)); m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
      return { m, z0, z1 };
    });
    const type = { parts, pillars: list.map(([a, b, c, d]) => ({ x0: a * T, y0: b * T, x1: (c + 1) * T, y1: (d + 1) * T, z0: fl, z1: fl + hh, sx: (c - a + 1) * T / w0, sy: (d - b + 1) * T / d0, stump: null })) };
    L.pillarTypes.push(type); L.pillars.push(...type.pillars);
  }
  L.placePillars(null);

  /* stairs: steps of dressed stone, two to a tile, from the foot up */
  for (const s of L.stairs) {
    const a = s.x0 * T, b = (s.x1 + 1) * T, n = s.y0 * T, so = (s.y1 + 1) * T, along = s.dx ? b - a : so - n, steps = Math.max(2, Math.round(along / 8)), run = along / steps;
    const c = Object.assign({ color: '#4a4360' }, s.sp), mats = [sideMat(s.sp.side || 'brick', Object.assign({}, c, { color: E.shade(c.color, .04) })), sideMat('block', { color: E.shade(c.color, .14) })];
    const lo = Math.min(0, s.low);
    for (let k = 0; k < steps; k++) {
      const top = s.low + (s.high - s.low) * (k + 1) / steps, at = (k + .5) * run;
      const cx = s.dir === 'e' ? a + at : s.dir === 'w' ? b - at : (a + b) / 2, cy = s.dir === 's' ? n + at : s.dir === 'n' ? so - at : (n + so) / 2;
      const gw = s.dx ? run : b - a, gd = s.dx ? so - n : run;
      merge.add(sidesThenTops(boxGeo(gw, gd, top - lo)), [cx / U, (lo + top) / 2 / U, cy / U], mats);
    }
  }

  /* platforms in the text: a slab, its top the ground's texture */
  for (const [x0, y0, x1, y1] of L.rects(i => L.plat[i] > -1e8 ? L.plat[i] + ':' + L.platLo[i] + ':' + L.chars(i) : null)) {
    const i = y0 * mw + x0, sp = L.specs[i], top = L.plat[i], lo = L.platLo[i], a = x0 * T, b = (x1 + 1) * T, n = y0 * T, so = (y1 + 1) * T;
    const style = sp.side || 'planks', mats = [sideMat(style, sp), sideMat(style, Object.assign({}, sp, { color: E.shade(sp.color || STYLE_COLORS[style] || '#8f5f37', -.2) }))];
    merge.add(sidesThenTops(boxGeo(b - a, so - n, top - lo - .2)), [(a + b) / 2 / U, (lo + top - .2) / 2 / U, (n + so) / 2 / U], mats);
    merge.add(floorPoly([[a, n], [b, n], [b, so], [a, so]], top), [0, 0, 0], floorMat, false);
  }
  merge.build(scene, own);

  /* braziers: a stone base, an iron bowl, glowing coals and three flame tongues each, in a few instanced meshes */
  const NT = Math.max(1, L.torches.length), inst = (geo, m, n, shadow) => { const im = add(new THREE.InstancedMesh(own(geo), m, n)); im.frustumCulled = false; im.count = 0; im.castShadow = im.receiveShadow = !!shadow; return im; };
  L.braz = {
    base: inst(new THREE.BoxGeometry(6 / U, 8 / U, 6 / U), world._obj(new THREE.MeshLambertNodeMaterial({ color: '#4c4562' })), NT, false),
    bowl: inst(new THREE.CylinderGeometry(5.5 / U, 4.2 / U, 3 / U, 10), world._obj(new THREE.MeshLambertNodeMaterial({ color: '#2b2430' })), NT, false),
    coals: inst(new THREE.CylinderGeometry(4 / U, 4 / U, .4 / U, 10), world._obj(new THREE.MeshBasicNodeMaterial({ color: '#ff8a3c' })), NT, false),
    outer: inst(new THREE.ConeGeometry(2.2 / U, 1, 5), world._obj(new THREE.MeshBasicNodeMaterial({ color: '#ff7a2a' })), NT * 3, false),
    inner: inst(new THREE.ConeGeometry(2.2 / U, 1, 5), world._obj(new THREE.MeshBasicNodeMaterial({ color: '#ffd36a' })), NT * 3, false)
  };
};
/** stand the walls: full height, or cut low where cut(cell) says (a cell: { cx, cy, ox, oy }, its outward direction) */
Level.prototype.placeWalls = function (key, cut) {
  for (const W of this.wallTypes) {
    if (W.key === key) continue; W.key = key;
    let nf = 0, nc = 0;
    for (const c of W.cells) {
      const isCut = W.cut && cut && cut(c), hh = isCut ? CUT_H : W.h;
      (isCut ? W.cut : W.full).setMatrixAt(isCut ? nc++ : nf++, _m4.makeTranslation(c.cx + .5, (c.z + hh / 2) / U, c.cy + .5));   // (a tile is a metre)
    }
    W.full.count = nf; W.full.instanceMatrix.needsUpdate = true; if (W.cut) { W.cut.count = nc; W.cut.instanceMatrix.needsUpdate = true; }
  }
};
/** stand the pillars whole, or cut to stumps where cut(pillar) says */
Level.prototype.placePillars = function (cut) {
  for (const type of this.pillarTypes) {
    let changed = false;
    type.pillars.forEach((p, i) => {
      const stump = !!(cut && cut(p)); if (stump === p.stump) return; p.stump = stump; changed = true;
      for (const part of type.parts) {
        const z1 = stump ? Math.min(part.z1, part.z0 > 0 ? 14 : part.z1) : part.z1, hh = Math.max(0, z1 - part.z0), full = part.z1 - part.z0;
        part.m.setMatrixAt(i, hh > 0 ? _m4.compose(_v0.set((p.x0 + p.x1) / 2 / U, (p.z0 + part.z0 + hh / 2) / U, (p.y0 + p.y1) / 2 / U), _q0.identity(), _s0.set(p.sx, hh / full, p.sy)) : _m4.makeScale(0, 0, 0));
      }
    });
    if (changed) for (const part of type.parts) part.m.instanceMatrix.needsUpdate = true;
  }
};
/** the braziers' flames dance (the 2D hall's: three tongues, each with its own height and sway) */
Level.prototype.animateBraziers = function (dt) {
  const B = this.braz, n = this.torches.length;
  for (let i = 0; i < n; i++) {
    const b = this.torches[i]; b.t += dt; const x = b.x / U, z = b.y / U, y0 = b.z / U, t = b.t;
    B.base.setMatrixAt(i, _m4.makeTranslation(x, y0 + 4 / U, z)); B.bowl.setMatrixAt(i, _m4.makeTranslation(x, y0 + 9.5 / U, z)); B.coals.setMatrixAt(i, _m4.makeTranslation(x, y0 + 11.1 / U, z));
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + t * .6, hh = (7 + Math.sin(t * 9 + k * 2) * 2.2 + Math.sin(t * 17 + k) * 1.2) / U, sw = Math.sin(t * 6 + k * 1.7) * 1.4 / U, bx = x + Math.cos(a) * 1.6 / U, bz = z + Math.sin(a) * 1.6 / U;
      _q0.setFromAxisAngle(_v0.set(0, 0, 1), -sw * 3);
      B.outer.setMatrixAt(i * 3 + k, _m4.compose(_v0.set(bx + sw * .5, y0 + 11 / U + hh / 2, bz), _q0, _s0.set(1, hh, 1)));
      B.inner.setMatrixAt(i * 3 + k, _m4.compose(_v0.set(bx + sw * .3, y0 + 11 / U + hh * .65 / 2, bz), _q0, _s0.set(.55, hh * .65, .55)));
    }
  }
  for (const [k, m] of Object.entries(B)) { m.count = k === 'outer' || k === 'inner' ? n * 3 : n; m.instanceMatrix.needsUpdate = true; }
};

/* =============================================================================
 * 3b. TERRAIN  an open world instead of a level: new E.World3D(game, { terrain: { size, height, color, ... } })
 *    The ground is the game's height function (x, y) -> z in engine units, sampled every `cell` units (32: 2 m) into
 *    chunks of `chunk` cells (32: 64 m square), each chunk sampled the first time anything asks about it, so a world
 *    kilometres across costs only where someone goes. The same samples make all three of what the ground is:
 *      physics  a Rapier heightfield per chunk, for the chunks within `physics` units of any actor (world.step streams
 *               them: the same moves stream the same colliders, so a run replays exactly)
 *      queries  world.ground, floorAt, topH (and terrain.normal, slope) read the same triangles Rapier collides with (each
 *               cell split from its north-west corner to its south-east), and world.ray marches the height out where
 *               no collider is made yet
 *      picture  a quadtree of meshes, 2 m cells near the camera, coarser with distance out to `far`, a few built a frame
 *               (world.draw streams them; a coarser one stands in until its finer ones are ready), skirts hiding the
 *               seams between sizes, vertex colors from the game's color(x, y, z, nz) and, where the slope is steep,
 *               rock in strata (rock: { colors, band }), with a fine speckle and a broad mottle over all of it
 *    Everything in one material, every mesh from one pool made with the world: streaming never builds a shader
 * ============================================================================= */
const TERRAIN_POOL = 220, TERRAIN_BUILDS = 6;
class Terrain {
  constructor(world, def) {
    if (typeof def.height !== 'function') throw new Error('my-3D2dge 3D: a terrain needs height: (x, y) => z, the ground\'s height in engine units');
    const cell = def.cell || 32, n = def.chunk || 32, cs = cell * n, size = Array.isArray(def.size) ? def.size : [def.size || 32768, def.size || 32768];
    // chunks across: a power of two, so the quadtree's root covers the map exactly
    const cw = 2 ** Math.ceil(Math.log2(Math.max(1, Math.ceil(Math.max(size[0], size[1]) / cs))));
    Object.assign(this, { isTerrain: true, world, def, cell, n, cs, cw, ch: cw, gw: cw * n, width: cw * cs, depth: cw * cs, levels: Math.log2(cw) });
    /** mw, mh: the map in 1-metre tiles (as a level's); bottom: below every valley (a fall past it is lost) */
    this.mw = this.width / T; this.mh = this.depth / T; this.bottom = def.bottom ?? -800;
    this.marks = def.marks || {}; this.torches = []; this.shapes = []; this.rows = [];
    this.far = def.far || 24000; this.physics = def.physics || 2400; this.split = def.detail || 1.7;
    this._h = new Map(); this._cols = new Map(); this._pw = null;
  }
  /* ---- the samples ---- */
  /** chunk (cx, cy)'s heights, (n + 1) x (n + 1) samples, row by row from its north-west corner (made when first asked for) */
  heights(cx, cy) {
    const key = cy * this.cw + cx; let H = this._h.get(key); if (H) return H;
    const n = this.n, c = this.cell, x0 = cx * this.cs, y0 = cy * this.cs, f = this.def.height; H = new Float32Array((n + 1) * (n + 1));
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) H[j * (n + 1) + i] = f(x0 + i * c, y0 + j * c);
    this._h.set(key, H); return H;
  }
  /** the height at grid point (gx, gy) (whole cells from the map's north-west corner): a made chunk's sample, else the
   *  function itself (the same number: far meshes read it without making the chunks they span) */
  sample(gx, gy) {
    const g = this.gw; gx = gx < 0 ? 0 : gx > g ? g : gx; gy = gy < 0 ? 0 : gy > g ? g : gy;
    const n = this.n, cx = Math.min(this.cw - 1, Math.floor(gx / n)), cy = Math.min(this.cw - 1, Math.floor(gy / n)), H = this._h.get(cy * this.cw + cx);
    return H ? H[(gy - cy * n) * (n + 1) + gx - cx * n] : this.def.height(gx * this.cell, gy * this.cell);
  }
  _corners(x, y, need) {
    const c = this.cell, gx = clamp(x / c, 0, this.gw - 1e-6), gy = clamp(y / c, 0, this.gw - 1e-6), i = Math.floor(gx), j = Math.floor(gy);
    if (need) { const n = this.n; this.heights(Math.min(this.cw - 1, Math.floor(i / n)), Math.min(this.cw - 1, Math.floor(j / n))); if ((i + 1) % n === 0 || (j + 1) % n === 0) { this.heights(Math.min(this.cw - 1, Math.floor((i + 1) / n)), Math.min(this.cw - 1, Math.floor((j + 1) / n))); this.heights(Math.min(this.cw - 1, Math.floor((i + 1) / n)), Math.min(this.cw - 1, Math.floor(j / n))); this.heights(Math.min(this.cw - 1, Math.floor(i / n)), Math.min(this.cw - 1, Math.floor((j + 1) / n))); } }
    const C = _tc; C[0] = this.sample(i, j); C[1] = this.sample(i + 1, j); C[2] = this.sample(i, j + 1); C[3] = this.sample(i + 1, j + 1); C[4] = gx - i; C[5] = gy - j;
    return C;
  }
  /** the ground's height at (x, y): the triangle Rapier collides with (a cell is split from its north-west corner to its
   *  south-east one) */
  ground(x, y) {
    const [nw, ne, sw, se, u, s] = this._corners(x, y, true);
    return u <= s ? sw + (se - sw) * u + (nw - sw) * (1 - s) : ne + (nw - ne) * (1 - u) + (se - ne) * s;
  }
  /** the ground's normal at (x, y): [x, y, z], length 1, z up (the triangle's) */
  normal(x, y, out = [0, 0, 1]) {
    const [nw, ne, sw, se, u, s] = this._corners(x, y, true), c = this.cell;
    const gx = (u <= s ? se - sw : ne - nw) / c, gy = (u <= s ? sw - nw : se - ne) / c, l = Math.hypot(gx, gy, 1);
    out[0] = -gx / l; out[1] = -gy / l; out[2] = 1 / l; return out;
  }
  /** how steep the ground is at (x, y): 0 flat .. 1 a cliff */
  slope(x, y) { return 1 - this.normal(x, y, _tn)[2]; }
  floorAt(x, y, z = 1e9) { const g = this.ground(x, y); return g <= z + 4 ? g : this.bottom; }
  topH(x, y) { return this.ground(x, y); }
  index() { return -1; }
  spec() { return null; }
  solidTile() { return false; }
  placeWalls() {}
  placePillars() {}
  animateBraziers() {}
  /** the first point a ray (unit direction) meets the ground within len units, as its distance, or null: marched a cell at
   *  a time, then narrowed down */
  rayDist(x, y, z, dx, dy, dz, len) {
    const st = this.cell * .5; let t0 = 0, above = z - this.ground(x, y);
    if (above < 0) return 0;
    for (let t = st; t <= len + st; t += st) {
      const tt = Math.min(t, len), h = z + dz * tt - this.ground(x + dx * tt, y + dy * tt);
      if (h < 0) { let a = t0, b = tt; for (let k = 0; k < 12; k++) { const m = (a + b) / 2; if (z + dz * m - this.ground(x + dx * m, y + dy * m) < 0) b = m; else a = m; } return (a + b) / 2; }
      t0 = tt; if (tt >= len) break;
    }
    return null;
  }

  /* ---- physics: the chunks near the actors ---- */
  colliders(pw) { this._pw = pw; this._cols.clear(); }
  /** a step of world.step: a heightfield for every chunk within `physics` of an actor, none for the rest (with room to
   *  spare, so one walking along a chunk's edge doesn't make and drop it every step) */
  stream(world) {
    const pw = this._pw; if (!pw) return;
    const R = this.physics, cs = this.cs, want = this._want || (this._want = new Set()); want.clear();
    for (const a of world.actors) {
      if (!a.body) continue;
      const x0 = Math.max(0, Math.floor((a.x - R) / cs)), x1 = Math.min(this.cw - 1, Math.floor((a.x + R) / cs)), y0 = Math.max(0, Math.floor((a.y - R) / cs)), y1 = Math.min(this.cw - 1, Math.floor((a.y + R) / cs));
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) want.add(cy * this.cw + cx);
    }
    for (const k of want) if (!this._cols.has(k)) this._cols.set(k, this._collider(pw, k % this.cw, Math.floor(k / this.cw)));
    for (const [k, b] of this._cols) {
      if (want.has(k)) continue;
      const cx = k % this.cw, cy = Math.floor(k / this.cw), x = (cx + .5) * cs, y = (cy + .5) * cs;
      if (world.actors.some(a => a.body && Math.max(Math.abs(a.x - x), Math.abs(a.y - y)) < R + cs)) continue;
      pw.removeRigidBody(b); this._cols.delete(k);
    }
  }
  _collider(pw, cx, cy) {
    const n = this.n, H = this.heights(cx, cy), F = new Float32Array((n + 1) * (n + 1));
    // Rapier's heightfield lies in its own x-z plane, y up, rows along +z; turned to stand z up (Z_UP), its +z is our -y,
    // so row i is the samples' row n - i (from the chunk's south edge north)
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) F[i + j * (n + 1)] = H[(n - i) * (n + 1) + j];
    const b = pw.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation((cx + .5) * this.cs, (cy + .5) * this.cs, 0).setRotation(Z_UP));
    const flags = RAPIER.HeightFieldFlags ? RAPIER.HeightFieldFlags.FIX_INTERNAL_EDGES : undefined;
    const col = pw.createCollider(RAPIER.ColliderDesc.heightfield(n, n, F, { x: this.cs, y: 1, z: this.cs }, flags).setFriction(.8).setCollisionGroups(GROUPS.level), b);
    this.world._owners.set(col.handle, this);
    return b;
  }
}
const _tc = new Float64Array(6), _tn = [0, 0, 1];
/* ---- the terrain's picture: one material (vertex colors, rock strata by height where it is steep, a speckle and a
 *      mottle), a pool of meshes sharing one index, and the quadtree that picks which to draw ---- */
Terrain.prototype.meshes = function (world) {
  const def = this.def, n = this.n, V = (n + 1) * (n + 1) + 4 * (n + 1), own = x => world._own(x);
  const { attribute, positionWorld, normalWorld, texture, vec2, vec3, mix, smoothstep, float } = TSL;
  // the speckle and mottle: value noise in grey (linear filtering, mipmaps: it is seen from far off)
  const noiseTex = (w, f) => { const cv = document.createElement('canvas'); cv.width = cv.height = w; const g = cv.getContext('2d'), img = g.createImageData(w, w);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const v = f(x, y) * 255, i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); const t = own(new THREE.CanvasTexture(cv)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; return t; };
  // value noise that wraps every `per` lattice cells (the texture repeats without a seam)
  const wrapNoise = (x, y, per) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), m = a => ((a % per) + per) % per;
    const h = (a, b) => E.hash2(m(a) + 91, m(b) + 37);
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), su), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), su), sv);
  };
  const fbm = (x, y, oct) => { let v = 0, a = .5, t = 0; for (let o = 0, f = 4; o < oct; o++, f *= 2) { v += a * wrapNoise(x / 64 * f, y / 64 * f, f); t += a; a *= .5; } return v / t; };
  const speck = noiseTex(64, (x, y) => clamp(.5 + (E.hash2(x, y) - .5) * .65 + (fbm(x, y, 2) - .5) * .7, 0, 1));
  const mottle = noiseTex(64, (x, y) => clamp((fbm(x, y, 4) - .5) * 1.6 + .5, 0, 1));
  // the strata: a column of bands (rock.colors repeated, each band split by a thin darker line), read by world height
  const R = def.rock || {}, bands = (R.colors || ['#9c6a4c', '#b98058', '#8a5a40', '#c49268', '#a87050', '#7c5038']).map(c => E.hex(c)), bh = 16;
  const scv = document.createElement('canvas'); scv.width = 1; scv.height = bands.length * bh; const sg = scv.getContext('2d'), simg = sg.createImageData(1, scv.height);
  for (let y = 0; y < scv.height; y++) { const c = bands[Math.floor(y / bh)], k = y % bh === 0 ? .72 : y % bh === 1 ? .86 : 1 + (E.hash2(y, 3) - .5) * .12, i = y * 4; simg.data[i] = clamp(c[0] * k, 0, 255); simg.data[i + 1] = clamp(c[1] * k, 0, 255); simg.data[i + 2] = clamp(c[2] * k, 0, 255); simg.data[i + 3] = 255; }
  sg.putImageData(simg, 0, 0); const strata = own(new THREE.CanvasTexture(scv)); strata.wrapS = strata.wrapT = THREE.RepeatWrapping; strata.colorSpace = THREE.SRGBColorSpace; strata.magFilter = THREE.LinearFilter;
  const band = (R.band || 40) / U * bands.length, s0 = R.slope ? R.slope[0] : .32, s1 = R.slope ? R.slope[1] : .5, dk = def.speckle ?? .22, mk = def.mottle ?? .3;
  const wp = positionWorld, vcol = attribute('color', 'vec3');
  const fine = texture(speck, wp.xz.mul(.75)).r.sub(.5).mul(dk).add(1), broad = texture(mottle, wp.xz.mul(.012)).r.sub(.5).mul(mk).add(1);
  const wob = texture(mottle, wp.xz.mul(.05)).r.sub(.5).mul(.35);
  const rockC = texture(strata, vec2(.5, wp.y.div(band).add(wob))).rgb.mul(texture(speck, vec2(wp.x.add(wp.z), wp.y).mul(.9)).r.sub(.5).mul(.3).add(1));
  const steep = smoothstep(float(s0), float(s1), float(1).sub(normalWorld.y));
  const mat = this.mat = world._obj(new THREE.MeshLambertNodeMaterial({ color: '#ffffff' }));
  mat.colorNode = mix(vcol.mul(fine).mul(broad), rockC.mul(broad), steep);
  world._own(mat);
  // one index for every mesh: the grid's two triangles a cell (NW-SW-SE, NW-SE-NE: the colliders' split), then the skirts
  const idx = [], at = (i, j) => j * (n + 1) + i, sk = (side, k) => (n + 1) * (n + 1) + side * (n + 1) + k;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const nw = at(i, j), ne = at(i + 1, j), sw = at(i, j + 1), se = at(i + 1, j + 1); idx.push(nw, sw, se, nw, se, ne); }
  const edge = [k => at(k, 0), k => at(n, k), k => at(n - k, n), k => at(0, n - k)];   // north, east, south, west, each running round clockwise
  for (let side = 0; side < 4; side++) for (let k = 0; k < n; k++) { const a = edge[side](k), b = edge[side](k + 1), a2 = sk(side, k), b2 = sk(side, k + 1); idx.push(a, b, b2, a, b2, a2, a, b2, b, a, a2, b2); }
  const index = new THREE.BufferAttribute(new Uint32Array(idx), 1);
  this._pool = []; this._nodes = new Map(); this._edge = edge; this._V = V; this._frame = 0;
  for (let k = 0, np = def.pool || (n <= 16 ? 400 : TERRAIN_POOL); k < np; k++) {
    const geo = own(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(V * 3), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(V * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(V * 3), 3)); geo.setIndex(index);
    geo.boundingSphere = new THREE.Sphere(); geo.boundingBox = new THREE.Box3();
    const m = new THREE.Mesh(geo, mat); m.visible = false; m.receiveShadow = true; m.matrixAutoUpdate = false; world.scene.add(m);
    this._pool.push({ mesh: m, key: null, used: -1, shown: -1 });
  }
};
/** fill a pooled mesh with node (L, nx, ny): (n + 1)^2 vertices 2^L cells apart, their normals from the samples round
 *  them, their colors from the game, and the skirts hanging below its edges */
Terrain.prototype._build = function (slot, L, nx, ny) {
  const n = this.n, s = 2 ** L, gx0 = nx * n * s, gy0 = ny * n * s, c = this.cell, colorOf = this.def.color, geo = slot.mesh.geometry;
  const P = geo.attributes.position.array, N = geo.attributes.normal.array, C = geo.attributes.color.array, hs = this._hs || (this._hs = new Float32Array((n + 3) * (n + 3)));
  // the heights, one sample beyond each edge for the normals
  for (let j = -1; j <= n + 1; j++) for (let i = -1; i <= n + 1; i++) hs[(j + 1) * (n + 3) + i + 1] = this.sample(gx0 + i * s, gy0 + j * s);
  let lo = 1e9, hi = -1e9; const nm = [0, 0, 1], col = [0, 0, 0], k2 = 1 / 255;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const v = j * (n + 1) + i, h = hs[(j + 1) * (n + 3) + i + 1], x = (gx0 + i * s) * c, y = (gy0 + j * s) * c;
    const ddx = (hs[(j + 1) * (n + 3) + i + 2] - hs[(j + 1) * (n + 3) + i]) / (2 * s * c), ddy = (hs[(j + 2) * (n + 3) + i + 1] - hs[j * (n + 3) + i + 1]) / (2 * s * c), l = Math.hypot(ddx, ddy, 1);
    nm[0] = -ddx / l; nm[1] = -ddy / l; nm[2] = 1 / l;
    P[v * 3] = x / U; P[v * 3 + 1] = h / U; P[v * 3 + 2] = y / U; N[v * 3] = nm[0]; N[v * 3 + 1] = nm[2]; N[v * 3 + 2] = nm[1];
    col[0] = 150; col[1] = 140; col[2] = 110;
    const r = (colorOf && colorOf(x, y, h, nm[2], col)) || col;
    C[v * 3] = srgbLin(r[0] * k2); C[v * 3 + 1] = srgbLin(r[1] * k2); C[v * 3 + 2] = srgbLin(r[2] * k2);
    if (h < lo) lo = h; if (h > hi) hi = h;
  }
  const drop = (s * c) * .75 + 6;
  for (let side = 0; side < 4; side++) for (let k = 0; k <= n; k++) {
    const a = this._edge[side](k), b = (n + 1) * (n + 1) + side * (n + 1) + k;
    P[b * 3] = P[a * 3]; P[b * 3 + 1] = P[a * 3 + 1] - drop / U; P[b * 3 + 2] = P[a * 3 + 2];
    for (let q = 0; q < 3; q++) { N[b * 3 + q] = N[a * 3 + q]; C[b * 3 + q] = C[a * 3 + q] * .8; }
  }
  for (const a of ['position', 'normal', 'color']) geo.attributes[a].needsUpdate = true;
  const x0 = gx0 * c / U, y0 = gy0 * c / U, w = n * s * c / U;
  geo.boundingBox.min.set(x0, (lo - drop) / U, y0); geo.boundingBox.max.set(x0 + w, hi / U, y0 + w); geo.boundingBox.getBoundingSphere(geo.boundingSphere);
  slot.mesh.castShadow = L <= 1; slot.key = L + ':' + nx + ':' + ny; slot.L = L;
};
/** world.draw's step: pick the quadtree's nodes for a camera at (x, y, z) (engine units), build up to `budget` missing
 *  ones (all of them when budget is Infinity: the first frame), show those and hide the rest */
Terrain.prototype.drawStream = function (world, x, y, z, budget = TERRAIN_BUILDS, again = false) {
  // frame: what this frame built or showed is never taken for another node in it; pass: what the last look showed
  const frame = again ? this._frame : ++this._frame, pass = this._pass = (this._pass || 0) + 1, show = this._show || (this._show = []), queue = this._queue || (this._queue = []); show.length = 0; queue.length = 0;
  const nodes = this._nodes, n = this.n, cs = this.cs, far = this.far, K = this.split;
  const ready = (L, nx, ny) => nodes.get(L + ':' + nx + ':' + ny);
  // nearest first, so what stands closest is built first
  // a node splits into its four when the camera is within K of its size; one whose four aren't all built yet stands in
  // for them (and they are queued); one not built itself is queued, and its parent stands in
  const visit = (L, nx, ny) => {
    const size = cs * 2 ** L, x0 = nx * size, y0 = ny * size, dx = Math.max(x0 - x, 0, x - x0 - size), dy = Math.max(y0 - y, 0, y - y0 - size), d = Math.hypot(dx, dy);
    if (d > far) return;
    const me = ready(L, nx, ny);
    if (L > 0 && d < size * K) {
      const kids = [[2 * nx, 2 * ny], [2 * nx + 1, 2 * ny], [2 * nx, 2 * ny + 1], [2 * nx + 1, 2 * ny + 1]];
      const missing = kids.filter(([a, b]) => !ready(L - 1, a, b) && !this._outside(L - 1, a, b, x, y));
      if (!missing.length) { for (const [a, b] of kids) visit(L - 1, a, b); return; }
      for (const [a, b] of missing) queue.push([d, L - 1, a, b]);
    }
    if (!me) { queue.push([d, L, nx, ny]); return; }
    me.used = frame; me.shown = pass; show.push(me);
  };
  visit(this.levels, 0, 0);
  queue.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let built = 0;
  for (const [, L, nx, ny] of queue) {
    if (built >= budget) break;
    const key = L + ':' + nx + ':' + ny; if (nodes.has(key)) continue;
    // the slot touched longest ago (never one shown or built this frame)
    let slot = null; for (const p of this._pool) if (p.used < frame && (!slot || p.used < slot.used)) slot = p;
    if (!slot) break;
    if (slot.key) nodes.delete(slot.key);
    this._build(slot, L, nx, ny); slot.used = frame; nodes.set(key, slot); built++;
  }
  for (const p of this._pool) p.mesh.visible = p.shown === pass;
  if (built && budget === Infinity) return this.drawStream(world, x, y, z, Infinity, true);
  return built;
};
Terrain.prototype._outside = function (L, nx, ny, x, y) { const size = this.cs * 2 ** L, dx = Math.max(nx * size - x, 0, x - nx * size - size), dy = Math.max(ny * size - y, 0, y - ny * size - size); return Math.hypot(dx, dy) > this.far; };
/** straight lines over open ground: a terrain's flow field (world.flow()) never steers */
class TerrainFlow { to() { return this; } dir() { return null; } distance(x, y) { return 1e9; } }
const srgbLin = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);

/* =============================================================================
 * 4. PARTS DRAWN BY CODE  instanced batches of four shapes (tube, ball, box, cone) in a toon look with outlines, and
 *    two that glow (glow, halo); a pen that draws with them in engine units. Puppets, things and anything a game draws
 *    in 3D go through them, so thousands of parts cost a handful of draw calls
 * ============================================================================= */
const FLASH = lin('#ffe6d8'), BLACKISH = lin('#1a1320');
/* three r182 uploads an instanced mesh's matrices and colors (over 1,000 slots) in the ranges its node copied from the
 * mesh the frame before (a render uploads the geometry, then updates the nodes), so a slot past the last frame's count
 * drew, for one frame, what it last held: zeros (on the overlay, whose camera is the origin, a screen of outline ink) or
 * a part from frames ago. So each upload reaches the most slots ever drawn and some room past them, and a slot never
 * drawn holds a part too far away and too small to see */
const HIDDEN = new THREE.Matrix4().makeScale(1e-3, 1e-3, 1e-3).setPosition(-1e5, -1e5, -1e5);
const hideSlots = (arr, from, to) => { for (let i = from; i < to; i++) HIDDEN.toArray(arr, i * 16); };
const reachOf = (attr, n) => (attr._reach = Math.min(attr.count, Math.max(attr._reach || 0, Math.ceil(n * 1.25) + 16)));
/** an instanced batch of one shape: parts are written between begin() and end() */
class Batch {
  constructor(scene, geo, mat, o = {}) { this.scene = scene; this.geo = geo; this.mat = mat; this.o = o; this.cap = 0; this.n = 0; this.grow(o.cap || 1024); }
  grow(cap) {
    const old = this.mesh, sc = this.scene;
    const mk = mat => { const m = new THREE.InstancedMesh(this.geo, mat, cap); m.frustumCulled = false; m.count = 0; sc.add(m); return m; };
    const mesh = mk(this.mat); hideSlots(mesh.instanceMatrix.array, 0, cap);
    // (no DynamicDrawUsage: in r182 an instanced mesh over 1,000 slots marked dynamic never uploads its changes)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    mesh.castShadow = mesh.receiveShadow = !!this.o.shadow; mesh.renderOrder = this.o.order || 0;
    if (old) { mesh.instanceMatrix.array.set(old.instanceMatrix.array); mesh.instanceColor.array.set(old.instanceColor.array); sc.remove(old); old.dispose(); }
    if (this.shell) { sc.remove(this.shell); this.shell.dispose(); }
    this.shell = this.o.outline ? mk(this.o.shellMat) : null;
    if (this.shell) this.shell.instanceMatrix = mesh.instanceMatrix;   // the outline shares the parts' matrices
    this.mesh = mesh; this.M = mesh.instanceMatrix.array; this.C = mesh.instanceColor.array; this.cap = cap;
  }
  begin() { this.n = 0; }
  /** one part from its basis columns (x, y, z axes with their lengths) and its centre, three.js metres */
  put(ax, ay, az, bx, by, bz, cx, cy, cz, tx, ty, tz, col) {
    if (this.n >= this.cap) this.grow(this.cap * 2);
    const M = this.M, i = this.n * 16, k = this.n * 3; this.n++;
    M[i] = ax; M[i + 1] = ay; M[i + 2] = az; M[i + 3] = 0; M[i + 4] = bx; M[i + 5] = by; M[i + 6] = bz; M[i + 7] = 0;
    M[i + 8] = cx; M[i + 9] = cy; M[i + 10] = cz; M[i + 11] = 0; M[i + 12] = tx; M[i + 13] = ty; M[i + 14] = tz; M[i + 15] = 1;
    this.C[k] = col[0]; this.C[k + 1] = col[1]; this.C[k + 2] = col[2];
  }
  /** a tube (or the cone) from a to b, radius r (metres) */
  tube(a, b, r, col) {
    let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; const L = Math.hypot(dx, dy, dz); if (L < 1e-5 || !r) return;   // (a part with no width has no normals: its outline would be NaN)
    dx /= L; dy /= L; dz /= L;
    let px = Math.abs(dy) < .95 ? -dz : 0, py = Math.abs(dy) < .95 ? 0 : dz, pz = Math.abs(dy) < .95 ? dx : -dy; const pl = Math.hypot(px, py, pz); px /= pl; py /= pl; pz /= pl;
    const qx = py * dz - pz * dy, qy = pz * dx - px * dz, qz = px * dy - py * dx;
    this.put(px * r, py * r, pz * r, dx * L, dy * L, dz * L, qx * r, qy * r, qz * r, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, col);
  }
  ball(p, rx, ry, rz, col) { if (rx && ry && rz) this.put(rx, 0, 0, 0, ry, 0, 0, 0, rz, p[0], p[1], p[2], col); }
  /** a box from a to b (its length), w wide along `across` (a unit vector), t thick (metres) */
  box(a, b, across, w, t, col) {
    if (!w || !t) return;
    let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; const L = Math.hypot(dx, dy, dz) || 1e-4; dx /= L; dy /= L; dz /= L;
    let zx = across[1] * dz - across[2] * dy, zy = across[2] * dx - across[0] * dz, zz = across[0] * dy - across[1] * dx; const zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
    const xx = dy * zz - dz * zy, xy = dz * zx - dx * zz, xz = dx * zy - dy * zx;
    this.put(xx * w, xy * w, xz * w, dx * L, dy * L, dz * L, zx * t, zy * t, zz * t, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, col);
  }
  end(outlines) {
    const m = this.mesh, k = reachOf(m.instanceMatrix, this.n); m.count = this.n;
    m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, k * 16); m.instanceMatrix.needsUpdate = true;
    m.instanceColor.clearUpdateRanges(); m.instanceColor.addUpdateRange(0, k * 3); m.instanceColor.needsUpdate = true;
    if (this.shell) this.shell.count = outlines ? this.n : 0;
  }
}
/** the pen's batches in a scene: the world's own (shadows, tagged for the filters' mask), or the overlay's (sc: its scene;
 *  no shadows, untagged: the overlay draws straight to the screen after the filter) */
function makeBatches(world, sc = world.scene) {
  const main = sc === world.scene, obj = m => main ? world._obj(m) : m, sh = main;
  const TOON = obj(new THREE.MeshToonNodeMaterial({ color: '#ffffff', gradientMap: TOON_BANDS })), shell = { normal: obj(outlineMat('normal')), center: obj(outlineMat('center')) };
  return {
    tube: new Batch(sc, new THREE.CylinderGeometry(.85, 1, 1, 7, 1, true), TOON, { outline: 'normal', shellMat: shell.normal, shadow: sh, cap: 2048 }),
    ball: new Batch(sc, new THREE.SphereGeometry(1, 9, 6), TOON, { outline: 'normal', shellMat: shell.normal, shadow: sh, cap: 2048 }),
    box: new Batch(sc, new THREE.BoxGeometry(1, 1, 1), TOON, { outline: 'center', shellMat: shell.center, shadow: sh }),
    cone: new Batch(sc, new THREE.ConeGeometry(1, 1, 6), TOON, { outline: 'normal', shellMat: shell.normal, shadow: sh }),
    glow: new Batch(sc, new THREE.SphereGeometry(1, 8, 6), obj(new THREE.MeshBasicNodeMaterial({ color: '#ffffff' }))),
    halo: new Batch(sc, new THREE.SphereGeometry(1, 10, 7), new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), { order: 2 }),
    blob: new Batch(sc, new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, opacity: .45, depthWrite: false }), { order: 1 })
  };
}
const _pa = [0, 0, 0], _pb = [0, 0, 0];
/** a frame's turn as a 3 x 3 matrix in engine axes (rows x, y, z): yaw about z, then pitch (the nose up), then roll (the
 *  right side down): its columns are the frame's forward, right and up */
function frameOf(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const f = [cy * cp, sy * cp, sp], r0 = [-sy, cy, 0], u0 = [-cy * sp, -sy * sp, cp];   // forward; right and up before the roll
  const r = [r0[0] * cr - u0[0] * sr, r0[1] * cr - u0[1] * sr, r0[2] * cr - u0[2] * sr], u = [u0[0] * cr + r0[0] * sr, u0[1] * cr + r0[1] * sr, u0[2] * cr + r0[2] * sr];
  return [f[0], r[0], u[0], f[1], r[1], u[1], f[2], r[2], u[2]];
}
/**
 * the pen: draws shapes in engine units, in a frame you set with at(x, y, z, yaw, size) (yaw turns it about z, from +x
 * toward +y). Colors are '#rrggbb'. world.pen in a draw (before world.draw(r)), and every thing's drawing, use it:
 *   ball(x, y, z, rx, ry, rz, color)   a ball (an egg: three radii along the frame's x, y and z)
 *   box(x, y, z, w, d, h, color, yaw)  a box centred at (x, y, z): w along x, d along y, h up, turned by yaw more
 *   tube(x0, y0, z0, x1, y1, z1, r, color), cone(x0, y0, z0, x1, y1, z1, r, color) (base to tip)
 *   bar(x0, y0, z0, x1, y1, z1, w, t, color)   a flat bar from one point to the other (a blade, a plank), w wide, t thick
 *   slab(x0, y0, z0, x1, y1, z1, ax, ay, az, w, t, color)   the same, w wide along (ax, ay, az): any way it leans
 *   glow(x, y, z, r, color), halo(x, y, z, r, color)   unlit: a glowing ball, and light that adds round it
 */
class Pen {
  constructor(world) { this.world = world; this.B = null; this.at(0, 0, 0); this.flash = false; }
  /** set the frame: origin (x, y, z) in engine units, turned by yaw (radians) about z, scaled by k, and tipped by pitch
   *  (the nose up, about its y) and roll (its right side down, about its x): a car on a slope, a ship in a turn; returns
   *  the pen */
  at(x = 0, y = 0, z = 0, yaw = 0, k = 1, pitch = 0, roll = 0) {
    this.ox = x; this.oy = y; this.oz = z; this.ca = Math.cos(yaw); this.sa = Math.sin(yaw); this.k = k;
    this.M = pitch || roll ? frameOf(yaw, pitch, roll) : null; return this;
  }
  _p(x, y, z, out) {
    const k = this.k, M = this.M;
    if (M) { out[0] = (this.ox + (M[0] * x + M[1] * y + M[2] * z) * k) / U; out[1] = (this.oz + (M[6] * x + M[7] * y + M[8] * z) * k) / U; out[2] = (this.oy + (M[3] * x + M[4] * y + M[5] * z) * k) / U; return out; }
    out[0] = (this.ox + (x * this.ca - y * this.sa) * k) / U; out[1] = (this.oz + z * k) / U; out[2] = (this.oy + (x * this.sa + y * this.ca) * k) / U; return out;
  }
  _c(color) { const c = typeof color === 'string' ? lin(color) : color; return this.flash ? [lerp(c[0], FLASH[0], .4), lerp(c[1], FLASH[1], .4), lerp(c[2], FLASH[2], .4)] : c; }
  _rot(B, rx, ry, rz, yaw, x, y, z, color) {
    const k = this.k / U, M = this.M;
    this._p(x, y, z, _pa);
    if (M) {   // (tipped: the part's axes through the frame's turn, in three's axes)
      const c = Math.cos(yaw), s = Math.sin(yaw), ax = [c * rx, s * rx, 0], ay = [-s * ry, c * ry, 0], T = v => [(M[0] * v[0] + M[1] * v[1] + M[2] * v[2]) * k, (M[6] * v[0] + M[7] * v[1] + M[8] * v[2]) * k, (M[3] * v[0] + M[4] * v[1] + M[5] * v[2]) * k];
      const X = T(ax), Y = T(ay), Z = T([0, 0, rz]); B.put(X[0], X[1], X[2], Z[0], Z[1], Z[2], Y[0], Y[1], Y[2], _pa[0], _pa[1], _pa[2], this._c(color)); return;
    }
    const ca = Math.cos(yaw) * this.ca - Math.sin(yaw) * this.sa, sa = Math.sin(yaw) * this.ca + Math.cos(yaw) * this.sa;
    B.put(ca * rx * k, 0, sa * rx * k, 0, rz * k, 0, -sa * ry * k, 0, ca * ry * k, _pa[0], _pa[1], _pa[2], this._c(color));
  }
  ball(x, y, z, rx, ry = rx, rz = rx, color = '#ffffff') { this._rot(this.B.ball, rx, ry, rz, 0, x, y, z, color); return this; }
  box(x, y, z, w, d, h, color = '#ffffff', yaw = 0) { this._rot(this.B.box, w, d, h, yaw, x, y, z, color); return this; }
  tube(x0, y0, z0, x1, y1, z1, r, color = '#ffffff') { this.B.tube.tube(this._p(x0, y0, z0, _pa), this._p(x1, y1, z1, _pb), r * this.k / U, this._c(color)); return this; }
  cone(x0, y0, z0, x1, y1, z1, r, color = '#ffffff') { this.B.cone.tube(this._p(x0, y0, z0, _pa), this._p(x1, y1, z1, _pb), r * this.k / U, this._c(color)); return this; }
  bar(x0, y0, z0, x1, y1, z1, w, t, color = '#ffffff') {
    const a = this._p(x0, y0, z0, _pa), b = this._p(x1, y1, z1, _pb), hx = b[0] - a[0], hz = b[2] - a[2], l = Math.hypot(hx, hz);
    this.B.box.box(a, b, l > 1e-6 ? [-hz / l, 0, hx / l] : [1, 0, 0], w * this.k / U, t * this.k / U, this._c(color)); return this;
  }
  /** a box from (x0, y0, z0) to (x1, y1, z1) (its length), w wide along the direction (ax, ay, az) (in the pen's frame;
   *  only its part square to the length counts) and t thick: a torso leaning any way, a gun's receiver along its aim */
  slab(x0, y0, z0, x1, y1, z1, ax, ay, az, w, t, color = '#ffffff') {
    const a = this._p(x0, y0, z0, _pa), b = this._p(x1, y1, z1, _pb), M = this.M, across = M ? [M[0] * ax + M[1] * ay + M[2] * az, M[6] * ax + M[7] * ay + M[8] * az, M[3] * ax + M[4] * ay + M[5] * az] : [ax * this.ca - ay * this.sa, az, ax * this.sa + ay * this.ca];
    this.B.box.box(a, b, across, w * this.k / U, t * this.k / U, this._c(color)); return this;
  }
  glow(x, y, z, r, color = '#ffffff') { const k = r * this.k / U; this.B.glow.ball(this._p(x, y, z, _pa), k, k, k, typeof color === 'string' ? lin(color) : color); return this; }
  halo(x, y, z, r, color = '#ffffff') { const k = r * this.k / U; this.B.halo.ball(this._p(x, y, z, _pa), k, k, k, typeof color === 'string' ? lin(color) : color); return this; }
}

/* =============================================================================
 * 5. THINGS  pickups and set dressing drawn by code with the pen: world.thing(kind, x, y, z, o). A thing has
 *    { kind, x, y, z, yaw, spin (turns a second), bob (units it floats up and down), size, color, open (0..1: a chest's
 *    lid, a door), on, visible, t (its own clock) }. Add a kind: World3D.THINGS.lamp = (pen, t) => pen.tube(...)...
 *    (local units: z up from the thing's base, x its front)
 * ============================================================================= */
const THINGS = {
  coin(p, t) { p.ball(0, 0, 6, 4, 1.1, 4, t.color || '#ffd34a').ball(0, 0, 6, 2.6, 1.4, 2.6, '#ffe98a').box(0, 0, 6, 1, 1.6, 3.2, '#c8901e'); },
  gem(p, t) { const c = t.color || '#4ae0ff'; p.cone(0, 0, 6, 0, 0, 11, 3.6, c).cone(0, 0, 6, 0, 0, 1, 3.6, E.shade(c, -.25)).glow(0, 0, 6, .9, '#ffffff'); },
  heart(p, t) { const c = t.color || '#ff4a5a'; p.ball(-1.7, 0, 7, 2.4, 1.4, 2.4, c).ball(1.7, 0, 7, 2.4, 1.4, 2.4, c).cone(0, 0, 6.6, 0, 0, 1.6, 3.4, c).ball(-1.8, -.8, 8, .8, .6, .8, '#ffd0d6'); },
  key(p, t) { const c = t.color || '#ffd34a'; p.ball(0, 0, 9, 2.6, .9, 2.6, c).ball(0, -.2, 9, 1.3, 1.1, 1.3, '#3a2a1a').tube(0, 0, 6.6, 0, 0, 1.2, .8, c).box(1.2, 0, 2, 2, 1, 1, c).box(1.2, 0, 4, 1.6, 1, 1, c); },
  star(p, t) {
    const c = t.color || '#ffe24a'; p.ball(0, 0, 8, 2.4, 1.6, 2.4, c);
    for (let k = 0; k < 5; k++) { const a = k * TAU / 5 - Math.PI / 2; p.cone(Math.cos(a) * 1.5, 0, 8 - Math.sin(a) * 1.5, Math.cos(a) * 6.5, 0, 8 - Math.sin(a) * 6.5, 2, c); }
    p.ball(-.9, -1.3, 8.6, .5, .4, .7, '#3a2a10').ball(.9, -1.3, 8.6, .5, .4, .7, '#3a2a10');
  },
  potion(p, t) { const c = t.color || '#ff5aa8'; p.ball(0, 0, 3.6, 3.2, 3.2, 3.2, c).tube(0, 0, 6, 0, 0, 8.6, 1.2, '#cfe6f0').box(0, 0, 9.2, 1.8, 1.8, 1.4, '#9a6a3a').ball(-1.2, -1.6, 4.6, .7, .5, .7, '#ffffff'); },
  chest(p, t) {   // the lid turns up about its back edge as it opens
    const o = clamp(t.open || 0, 0, 1), a = o * 1.9, w = 14, d = 10, hb = 7, wood = t.color || '#8a5a30', trim = '#e8b84a';
    p.box(0, 0, hb / 2, w, d, hb, wood).box(0, 0, hb / 2, w + .4, d + .4, 1.4, trim);
    p.bar(0, d / 2, hb + 2, 0, d / 2 - d * Math.cos(a), hb + 2 + d * Math.sin(a), w, 4, E.shade(wood, .1));
    if (o < .2) p.box(0, -d / 2 - .3, hb - .6, 2, .8, 2.4, trim);
    if (o > .3) p.glow(0, 0, hb + 2, 2.4 * o, '#fff2a8').halo(0, 0, hb + 3, 7 * o, [.5, .4, .1]);
  },
  door(p, t) {   // a frame and a gate that slides up as it opens, or (swing) one leaf or two (28 wide or more) on hinges, opening toward t.swingTo (1: +y); t.w wide (32), t.h tall (40)
    const w = t.w || 32, h = t.h || 40, o = clamp(t.open || 0, 0, 1), c = t.color || '#6a4a2e', stone = t.frame || '#5a5470';
    p.box(-w / 2 - 2, 0, h / 2, 4, 8, h, stone).box(w / 2 + 2, 0, h / 2, 4, 8, h, stone).box(0, 0, h + 2, w + 8, 8, 4, stone);
    if (t.swing) {
      const n = w >= 28 ? 2 : 1, lw = w / n, dk = E.shade(c, -.25);
      for (let i = 0; i < n; i++) {
        const b = o * 1.7 * (t.swingTo || 1) * (i ? -1 : 1), u = i ? -1 : 1, dx = Math.cos(b) * u, dy = Math.sin(b) * u, hx = -u * w / 2, at = q => [hx + dx * q, dy * q];
        const [cx, cy] = at(lw / 2); p.box(cx, cy, h / 2, lw - .6, 2.6, h - 1, c, b);
        for (const z of [h * .27, h * .7]) { const [px, py] = at(lw / 2); p.box(px - dy * 1.4, py + dx * 1.4, z, lw - 5, .6, h * .32, dk, b).box(px + dy * 1.4, py - dx * 1.4, z, lw - 5, .6, h * .32, dk, b); }
        const [kx, ky] = at(lw - 3); p.ball(kx - dy * 2, ky + dx * 2, h * .46, 1, 1, 1, '#d8b04a').ball(kx + dy * 2, ky - dx * 2, h * .46, 1, 1, 1, '#d8b04a');
        if (t.locked && o < .05 && i === n - 1) p.box(kx - dy * 2.2, ky + dx * 2.2, h * .4, 2.4, 1, 3.4, '#ffd34a', b);
      }
      return;
    }
    if (o < 1) { const z0 = o * (h - 2); p.box(0, 0, z0 + (h - z0) / 2, w, 3, h - z0, c); for (let x = -w / 2 + 4; x < w / 2; x += 6) p.box(x, -1.8, z0 + (h - z0) / 2, 1, .6, h - z0, E.shade(c, -.3)); if (t.locked) p.ball(0, -2.4, z0 + h * .45 * (1 - o), 2.2, 1, 2.6, '#ffd34a'); }
  },
  trunk(p, t) {   // an item box: a long iron-bound trunk whose lid turns up as it opens
    const o = clamp(t.open || 0, 0, 1), a = o * 1.8, w = 24, d = 12, hb = 9, wood = t.color || '#5a3a24', iron = '#3a3640';
    p.box(0, 0, hb / 2, w, d, hb, wood);
    for (const x of [-w / 2 + 2, w / 2 - 2, 0]) p.box(x, 0, hb / 2, 1.6, d + .5, hb + .3, iron);
    p.bar(0, d / 2, hb + 1.5, 0, d / 2 - d * Math.cos(a), hb + 1.5 + d * Math.sin(a), w, 3, E.shade(wood, .12));
    if (o < .2) p.box(0, -d / 2 - .3, hb - 1, 3, .8, 3, '#c8a050');
  },
  typewriter(p, t) {   // a save point: a writing desk with a typewriter and a sheet in it, a lamp's glow on the paper
    const wood = t.color || '#4a3222';
    p.box(0, 0, 12, 22, 13, 2, wood);
    for (const [x, y] of [[-9.5, -5], [9.5, -5], [-9.5, 5], [9.5, 5]]) p.box(x, y, 6, 1.6, 1.6, 12, E.shade(wood, -.2));
    p.box(0, 1, 14.4, 11, 8, 3, '#2a2a30').box(0, -2.4, 13.6, 10, 3, 1, '#3a3a42').tube(-6, 3.6, 16.2, 6, 3.6, 16.2, 1.3, '#18181c');
    p.slab(0, 4, 16.4, 0, 5.4, 22, 1, 0, 0, 8, .3, '#efe8d6');
    p.glow(5.5, 3, 15.2, .7, t.on === false ? '#5a4a3a' : '#ffd08a').halo(5.5, 3, 15.6, 3.2, [.3, .22, .1]);
  },
  flag(p, t) { const c = t.color || '#ff4a3a', w = Math.sin((t.t || 0) * 5) * 1.5; p.tube(0, 0, 0, 0, 0, 44, .8, '#d8d8e0').ball(0, 0, 44.5, 1.4, 1.4, 1.4, '#ffd34a'); p.bar(0, 0, 38, 12, w, 37, 8, 1, c); },
  sign(p, t) { p.box(0, 0, 6, 1.6, 1.6, 12, '#6a4a2e').box(0, 0, 13, 14, 1.4, 8, t.color || '#9d6a3f').box(0, -.8, 13, 10, .3, 1, '#3a2614').box(0, -.8, 11.4, 8, .3, 1, '#3a2614'); },
  lever(p, t) { const a = (t.on ? .7 : -.7); p.box(0, 0, 1.5, 8, 6, 3, '#5a5470').tube(0, 0, 2.5, Math.sin(a) * 8, 0, 2.5 + Math.cos(a) * 8, .7, '#b8b8c8').ball(Math.sin(a) * 8, 0, 2.5 + Math.cos(a) * 8, 1.6, 1.6, 1.6, t.on ? '#4ae070' : '#ff4a3a'); },
  pad(p, t) { const c = t.color || '#4ae0ff', on = t.on ? 1 : 0; p.box(0, 0, .8, 14, 14, 1.6, '#5a5470').box(0, 0, 1.8 - on * .6, 10, 10, 1, on ? E.shade(c, .2) : c); if (on) p.halo(0, 0, 3, 7, lin(c).map(v => v * .4)); },
  spring(p, t) { const s = 1 - clamp(t.squash || 0, 0, .7); p.box(0, 0, 1, 12, 12, 2, '#5a5470'); for (let k = 0; k < 4; k++) p.ball(0, 0, 3 + k * 2 * s, 4.4, 4.4, .8, '#b8b8c8'); p.box(0, 0, 3 + 8 * s, 12, 12, 1.8, t.color || '#ff4a3a'); },
  tree(p, t) { const c = t.color || '#3f8a3a', k = t.big || 1; p.tube(0, 0, 0, 0, 0, 22 * k, 2.4 * k, '#6a4a2e').cone(0, 0, 12 * k, 0, 0, 34 * k, 11 * k, c).cone(0, 0, 22 * k, 0, 0, 42 * k, 8.5 * k, E.shade(c, .1)).cone(0, 0, 31 * k, 0, 0, 49 * k, 5.5 * k, E.shade(c, .2)); },
  bush(p, t) { const c = t.color || '#4a9a42'; p.ball(0, 0, 4, 6, 6, 4.6, c).ball(3.6, 1, 5.4, 4, 4, 3.6, E.shade(c, .12)).ball(-3.4, -1, 5, 4.2, 4.2, 3.4, E.shade(c, -.08)); },
  rock(p, t) { const c = t.color || '#7a7488'; p.ball(0, 0, 3, 6, 5, 4, c).ball(2.4, -1.6, 5.4, 3, 3, 2.4, E.shade(c, .14)); },
  mushroom(p, t) { const c = t.color || '#e84a3a'; p.tube(0, 0, 0, 0, 0, 7, 1.8, '#efe4cc').ball(0, 0, 7.5, 6, 6, 3.6, c).ball(2.6, -2, 9.4, 1.2, 1.2, .8, '#ffffff').ball(-2.4, 1.4, 9.6, 1.1, 1.1, .8, '#ffffff'); },
  fence(p, t) { const c = t.color || '#9d6a3f'; p.box(-7, 0, 6, 1.6, 1.6, 12, c).box(7, 0, 6, 1.6, 1.6, 12, c).box(0, 0, 9, 16, 1, 2, E.shade(c, .1)).box(0, 0, 4.6, 16, 1, 2, E.shade(c, .1)); },
  crystal(p, t) { const c = t.color || '#9a6aff'; for (const [x, y, hh, r] of [[0, 0, 16, 3.4], [3.4, 1.6, 10, 2.4], [-3, -1, 8, 2]]) p.cone(x, y, 0, x * 1.2, y * 1.2, hh, r, c); p.halo(0, 0, 8, 8, lin(c).map(v => v * .25)); }
};
/** a thing's size from its kind: where its base sits and how wide it is (for pickups' reach: world.touching) */
const THING_R = { coin: 5, gem: 5, heart: 5, key: 5, star: 7, potion: 5, chest: 9, door: 18, flag: 4, sign: 7, lever: 5, pad: 8, spring: 7, trunk: 12, typewriter: 11 };

/* =============================================================================
 * 5b. SHAPES  the 2D engine's shapes (docs/ASSETS.md: E.SHAPES ids, a store set's 'SET:id', or an entry) in 3D, from the
 *     same resolved parts (E.shapeMesh): each kind (an entry with its params, mats and mirror) is one instanced mesh, all
 *     of them in one toon material whose texture is an atlas of the materials' patterns (E.materialTile) at world scale,
 *     so a new kind or placement builds no shader. A solid one gets a fixed collider from the box the 2D engine collides
 *     with (E.shapeBox)
 * ============================================================================= */
const SH_TILE = 32, SH_PX = 2, SH_N = SH_TILE * SH_PX, SH_ATLAS = 1024, SH_PER = SH_ATLAS / SH_N, SH_CAP = 1024;   // 256 tiles, each 32 units square
function shapeKit(world) {
  const cv = document.createElement('canvas'); cv.width = cv.height = SH_ATLAS;
  const g = cv.getContext('2d'), tex = world._own(canvasTex(cv, false)), { attribute, texture, fract } = TSL;
  // a corner's tile in the atlas (x, y, w, h in uv) and its own uv in tiles: the pattern repeats inside its tile
  const tile = attribute('tile', 'vec4'), col = texture(tex, tile.xy.add(fract(attribute('uv', 'vec2')).mul(tile.zw)));
  const mat = world._obj(new THREE.MeshToonNodeMaterial({ gradientMap: TOON_BANDS }));
  mat.colorNode = col; mat.emissiveNode = col.rgb.mul(attribute('glow', 'float'));
  const shell = world._obj(outlineMat('normal')), tiles = new Map(), ids = new WeakMap(); let nTile = 0, nId = 0;
  /** a material's tile (its pattern on a side or a lid, turned or flat; a face pattern's whole face, 16 units), drawn into
   *  the atlas the first time: [x, y, w, h] in uv */
  const tileOf = (m, lid, curved, face) => {
    const key = (ids.get(m.q) || (ids.set(m.q, ++nId), nId)) + (lid ? 'L' : 'S') + (curved ? 'C' : '') + (face ? 'F' : ''); let t = tiles.get(key); if (t) return t;
    const i = nTile++ % (SH_PER * SH_PER), tx = i % SH_PER, ty = Math.floor(i / SH_PER), px = E.materialTile(m.q, { size: face ? 16 : SH_TILE, px: face ? SH_N / 16 : SH_PX, lid, curved });
    if (nTile > SH_PER * SH_PER) E.warn('3d:shape-tiles', 'more than ' + SH_PER * SH_PER + ' materials on shapes: the first are drawn over');
    if (px) { const img = g.createImageData(px.w, px.h); img.data.set(px.rgba); g.putImageData(img, tx * SH_N, ty * SH_N); tex.needsUpdate = true; }
    tiles.set(key, t = [(tx * SH_N + .5) / SH_ATLAS, 1 - (ty * SH_N + SH_N - .5) / SH_ATLAS, (SH_N - 1) / SH_ATLAS, (SH_N - 1) / SH_ATLAS]); return t;
  };
  /** the geometries from E.shapeMesh's groups: three's axes (metres, y up), each triangle wound to face its normal; and
   *  the outline's, the same corners with the normals averaged where faces meet (a box's outline closes round its corners;
   *  as 'normal', instancing turns them with the placement) */
  const build = (M, flip) => {
    const pos = [], nrm = [], uv = [], tl = [], gl = [], fx = flip ? -1 : 1;
    for (const G of M.groups) {
      const t = tileOf(G.mat, G.lid, G.curved, G.face), glow = G.mat.glow ? 1 : 0, P = G.pos, N = G.nrm, V = G.uv;
      const uvOf = q => G.face ? clamp(q, .001, .999) : q / SH_TILE;   // (a face pattern: once across its face)
      for (let i = 0; i < P.length; i += 9) {
        const c = [0, 1, 2].map(k => [P[i + k * 3] * fx / U, P[i + k * 3 + 2] / U, P[i + k * 3 + 1] / U]), n = [0, 1, 2].map(k => [N[i + k * 3] * fx, N[i + k * 3 + 2], N[i + k * 3 + 1]]);
        const a = c[0], e1 = [c[1][0] - a[0], c[1][1] - a[1], c[1][2] - a[2]], e2 = [c[2][0] - a[0], c[2][1] - a[1], c[2][2] - a[2]];
        const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
        const order = cx * (n[0][0] + n[1][0] + n[2][0]) + cy * (n[0][1] + n[1][1] + n[2][1]) + cz * (n[0][2] + n[1][2] + n[2][2]) < 0 ? [0, 2, 1] : [0, 1, 2];
        for (const k of order) { pos.push(...c[k]); nrm.push(...n[k]); const j = (i / 3 + k) * 2; uv.push(uvOf(V[j]), uvOf(V[j + 1])); tl.push(...t); gl.push(glow); }
      }
    }
    const at = new Map(), onrm = new Float32Array(nrm.length), kk = i => Math.round(pos[i] * 1e4) + ',' + Math.round(pos[i + 1] * 1e4) + ',' + Math.round(pos[i + 2] * 1e4);
    for (let i = 0; i < pos.length; i += 3) { const k = kk(i), a = at.get(k) || [0, 0, 0]; a[0] += nrm[i]; a[1] += nrm[i + 1]; a[2] += nrm[i + 2]; at.set(k, a); }
    for (let i = 0; i < pos.length; i += 3) {   // (faces that cancel, two discs back to back: the corner's own normal)
      let a = at.get(kk(i)), l = Math.hypot(a[0], a[1], a[2]); if (l < 1e-4) { a = nrm.slice(i, i + 3); l = 1; }
      onrm[i] = a[0] / l; onrm[i + 1] = a[1] / l; onrm[i + 2] = a[2] / l;
    }
    const geo = world._own(new THREE.BufferGeometry()), sgeo = world._own(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('tile', new THREE.Float32BufferAttribute(tl, 4)); geo.setAttribute('glow', new THREE.Float32BufferAttribute(gl, 1));
    sgeo.setAttribute('position', geo.attributes.position); sgeo.setAttribute('normal', new THREE.BufferAttribute(onrm, 3));
    return [geo, sgeo];
  };
  /** an instanced mesh and its outline for the geometries, its slots growing as placements come */
  const meshes = ([geo, sgeo], cap) => {
    const m = new THREE.InstancedMesh(geo, mat, cap), o = new THREE.InstancedMesh(sgeo, shell, cap);
    m.frustumCulled = o.frustumCulled = false; m.castShadow = m.receiveShadow = true; m.count = o.count = 0; o.instanceMatrix = m.instanceMatrix;
    world.scene.add(m); world.scene.add(o); return [m, o];
  };
  const kinds = new Map(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();
  // the probe: one empty triangle in the same material, so the warm-up builds the shapes' shaders before any is placed
  const pg = new THREE.BufferGeometry(), psg = new THREE.BufferGeometry(), z3 = n => new THREE.Float32BufferAttribute(new Array(n * 3).fill(0), n);
  for (const [k, n] of [['position', 3], ['normal', 3], ['uv', 2], ['tile', 4], ['glow', 1]]) pg.setAttribute(k, z3(n));
  for (const k of ['position', 'normal']) psg.setAttribute(k, z3(3));
  // (every mesh starts with SH_CAP slots: three reads more than 1,000 instances from an attribute, the same shader at any
  // count; fewer come from a uniform array sized in the shader's code, a new pipeline at each size)
  const [probe, probeShell] = meshes([world._own(pg), world._own(psg)], SH_CAP);
  return {
    probe, probeShell, kinds,
    /** the kind for an id and placement (made once): { mesh, shell, list (its placements), cap } */
    kind(id, o) {
      const key = (typeof id === 'string' ? id : 'e' + (ids.get(id) || (ids.set(id, ++nId), nId))) + '|' + JSON.stringify([o.params || null, o.mats || null, !!o.flip]);
      let K = kinds.get(key); if (K) return K;
      const M = E.shapeMesh(id, { params: o.params, mats: o.mats }); if (!M) return null;
      const [mesh, sh] = meshes(build(M, o.flip), SH_CAP); kinds.set(key, K = { mesh, shell: sh, list: [], cap: SH_CAP, bounds: M.bounds }); return K;
    },
    /** write a placement's slot: at (x, y, z), turned to its facing, scaled */
    put(K, p) {
      if (p.i >= K.cap) {   // more slots: a bigger mesh with the same geometry (the old one's placements copied over)
        const [m2, o2] = meshes([K.mesh.geometry, K.shell.geometry], K.cap * 2); m2.instanceMatrix.array.set(K.mesh.instanceMatrix.array);
        for (const x of [K.mesh, K.shell]) { world.scene.remove(x); x.dispose(); }
        K.mesh = m2; K.shell = o2; K.cap *= 2;
      }
      const k = p.scale, a = p.facing - Math.PI / 2;   // (three's y is the engine's z: a turn about z is one about y, the other way)
      _m.makeRotationY(-a).scale(_s.set(k, k, k)).setPosition(p.x / U, p.z / U, p.y / U);
      K.mesh.setMatrixAt(p.i, _m); K.mesh.count = K.shell.count = Math.max(K.mesh.count, p.i + 1); K.mesh.instanceMatrix.needsUpdate = true;
    },
    /** take a placement out: the last one moves into its slot */
    take(K, p) {
      const last = K.list.pop(); if (last !== p) { K.list[p.i] = last; last.i = p.i; K.mesh.getMatrixAt(K.list.length, _m); K.mesh.setMatrixAt(p.i, _m); }
      K.mesh.count = K.shell.count = K.list.length; K.mesh.instanceMatrix.needsUpdate = true;
    },
    clear() { for (const K of kinds.values()) { K.list.length = 0; K.mesh.count = K.shell.count = 0; } },
    outlines(on) { for (const K of kinds.values()) K.shell.visible = on; }
  };
}

/* =============================================================================
 * 6. CHARACTERS DRAWN  each rig as it stands (the game poses it; this only reads it), as a Puppet (3D parts on the
 *    rig's joints, sized from its build and colored from its palette) or a Card (the 2D engine draws the rig, exactly as
 *    in the 2D games, from the camera's own turn and tilt, onto a card standing where it is). Blobs (slimes) squash as
 *    they do in 2D; orbs ({ color, r }) glow. A blob shadow lies on the surface under every body
 * ============================================================================= */
const P3 = Array.from({ length: 24 }, () => [0, 0, 0]);   // scratch points, three.js metres
let _ca, _sa, _k, _kz, _rx, _ry, _rz, _sink = 0;
function frame(rig) { const a = rig.facing + (rig.spin || 0); _ca = Math.cos(a); _sa = Math.sin(a); const sz = rig.o.size || 1; _k = (1 - (rig.sq || 0) * .4) * sz; _kz = (1 + (rig.sq || 0)) * sz; _rx = rig.x; _ry = rig.y; _rz = rig.z || 0; }
/** a rig's local point (forward, right, up) plus an offset in the body's frame -> three.js metres */
function wp(p, out, df = 0, dr = 0, dz = 0) {
  const f = p[0] + df, r = p[1] + dr, z = p[2] + dz;
  out[0] = ((f * _ca - r * _sa) * _k + _rx) / U; out[1] = (z * _kz + _rz + _sink) / U; out[2] = ((f * _sa + r * _ca) * _k + _ry) / U;
  return out;
}
const lerp3 = (a, b, t, out) => { out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t; return out; };
/** a rig's colors as linear RGB, tinted toward the hit flash (cached on the rig) */
function cols(rig, flash) {
  const key = flash ? '_c3f' : '_c3'; if (rig[key] && rig[key + 'C'] === rig.C) return rig[key];
  const out = {}; for (const [k, v] of Object.entries(rig.C)) if (typeof v === 'string' && v[0] === '#') { const c = lin(v); out[k] = flash ? [lerp(c[0], FLASH[0], .3), lerp(c[1], FLASH[1], .3), lerp(c[2], FLASH[2], .3)] : c; }
  rig[key + 'C'] = rig.C; return (rig[key] = out);
}
/** a Humanoid's parts, sized from its build as its own drawing sizes them */
function humanParts(B, rig, flash) {
  const o = rig.o, J = rig.J, C = cols(rig, flash), classic = o.style === 'classic', bones = !!o.skeleton;
  const lw = classic ? .45 : Math.max(.55, o.limbW / 2), R = o.headR, u = 1 / U;
  frame(rig);
  const [hipL, hipR, knL, knR, ftL, ftR, hipC, shC, shL, shR, head, elL, elR, hdL, hdR, t0, t1, t2, t3, t4, t5] = P3;
  wp(J.hipL, hipL); wp(J.hipR, hipR); wp(J.kneeL, knL); wp(J.kneeR, knR); wp(J.footL, ftL); wp(J.footR, ftR);
  wp(J.hipC, hipC, 0, 0, .8); wp(J.shC, shC, 0, 0, -.4); wp(J.shL, shL); wp(J.shR, shR); wp(J.head, head);
  wp(J.elbowL, elL); wp(J.elbowR, elR); wp(J.handL, hdL); wp(J.handR, hdR);
  const upper = o.sleeves === 'none' || bones ? C.skin : C.cloth, lower = o.sleeves === 'long' ? C.cloth : C.skin;
  for (const [hip, kn, ft, J0] of [[hipL, knL, ftL, J.footL], [hipR, knR, ftR, J.footR]]) {   // legs: thigh, shin, boot to the toe
    lerp3(kn, ft, .62, t0); wp(J0, t1, 1.9, 0, .3);
    B.tube.tube(hip, kn, 1.35 * lw * u, C.pants); B.ball.ball(kn, 1.2 * lw * u, 1.2 * lw * u, 1.2 * lw * u, C.pants);
    B.tube.tube(kn, t0, 1.15 * lw * u, C.pants); B.tube.tube(t0, t1, 1.1 * lw * u, C.boot); B.ball.ball(t0, 1.1 * lw * u, 1.1 * lw * u, 1.1 * lw * u, C.boot);
  }
  B.tube.tube(hipL, hipR, 1.4 * lw * u, C.pants);
  const plate = o.armor ? C.plate || C.metal : null;
  B.tube.tube(hipC, shC, (bones ? .55 : classic ? .5 : .68) * o.torsoW * u, plate || (bones ? C.skin : C.cloth));   // the torso (a knight's breastplate, a skeleton's ribs)
  B.tube.tube(shL, shR, 1.15 * lw * u, plate || upper);
  if (!bones && !classic) { wp(J.hipL, t2, 0, -.3, .7); wp(J.hipR, t3, 0, .3, .7); B.tube.tube(t2, t3, o.torsoW * .7 * u, C.belt); }
  for (const [sh, el, hd] of [[shL, elL, hdL], [shR, elR, hdR]]) {   // arms
    B.tube.tube(sh, el, 1.1 * lw * u, upper); B.ball.ball(el, lw * u, lw * u, lw * u, upper);
    B.tube.tube(el, hd, .95 * lw * u, lower); B.ball.ball(hd, .85 * lw * u, .85 * lw * u, .85 * lw * u, C.glove || C.skin);
    if (o.armor) B.ball.ball(sh, 1.5 * u, 1.5 * u, 1.5 * u, plate);
  }
  // the head: the face, the hair (or a helmet) behind and above it, the eyes (glowing for husks and skeletons)
  wp(J.shC, t0, 0, 0, -.2); wp(J.head, t1, 0, 0, -R * .6); B.tube.tube(t0, t1, .7 * u, C.skin);
  wp(J.head, t0, R * .1, 0, -R * .05); B.ball.ball(t0, R * .9 * u, R * .9 * u, R * .9 * u, C.skin);
  const hat = o.hat && o.hat.style === 'helmet';
  if (hat) { wp(J.head, t1, -R * .05, 0, R * .12); const hc = flash ? FLASH : lin(o.hat.color || '#737c90'); B.ball.ball(t1, R * 1.02 * u, R * .98 * u, R * 1.02 * u, hc); }
  else if (!bones && o.hair && o.hair.style !== 'bald') { wp(J.head, t1, -R * .32, 0, R * .16); B.ball.ball(t1, R * .95 * u, R * .95 * u, R * .95 * u, C.hair); }
  const glow = o.eyeGlow ? lin(o.eyeGlow) : null;
  for (const sd of [-1, 1]) { wp(J.head, t2, R * .86, sd * R * .36, -R * .02); if (glow) B.glow.ball(t2, .55 * u, .55 * u, .55 * u, glow); else B.ball.ball(t2, .4 * u, .45 * u, .4 * u, BLACKISH); }
  if (o.weapon === 'sword') {   // the blade along the weapon's direction (J.bladeDir), flat across the swing, and its guard
    const bd = J.bladeDir, Lb = o.bladeLen, hx = J.handR[0], hy = J.handR[1], hz = J.handR[2];
    wp(J.handR, t0, bd[0] * 1.5, bd[1] * 1.5, bd[2] * 1.5); wp(J.handR, t1, bd[0] * Lb, bd[1] * Lb, bd[2] * Lb);
    const fl = Math.hypot(bd[0], bd[1]) > 1e-3 ? [-bd[1], bd[0]] : [0, 1]; wp([hx + fl[0], hy + fl[1], hz], t2); wp(J.handR, t3);
    const ax = t2[0] - t3[0], ay = t2[1] - t3[1], az = t2[2] - t3[2], al = Math.hypot(ax, ay, az) || 1; t4[0] = ax / al; t4[1] = ay / al; t4[2] = az / al;
    B.box.box(t0, t1, t4, 1.3 * u, .3 * u, C.metal || lin('#dce8f1'));
    wp(J.handR, t2, bd[0] * 1.2, bd[1] * 1.2, bd[2] * 1.2); wp(J.handR, t5, bd[0] * 1.7, bd[1] * 1.7, bd[2] * 1.7); B.box.box(t2, t5, t4, 3.4 * u, .5 * u, C.hilt || lin('#e8b04e'));
  }
}
/** a Blob (slime): its body squashed as the Blob squashes, eyes looking where it looks, horns, ears or wings */
function blobParts(B, a, flash, sink) {
  const b = a.blob, o = b.o, R = o.R * (b.scale || 1), sq = b.sq || 0, ka = 1 - sq * .55, hk = 1 + sq, C = b.C, u = 1 / U;
  const base = flash ? FLASH : lin(C.base), dk = lin(C.dk), x = a.x / U, z = a.y / U, y = ((a.z || 0) + R * hk + sink) / U;
  const [c, p] = P3; c[0] = x; c[1] = y; c[2] = z;
  B.ball.ball(c, R * ka * u, R * hk * u, R * ka * u, base);
  const look = b.look || [Math.cos(a.facing), Math.sin(a.facing)], la = Math.atan2(look[1], look[0]), fx = Math.cos(la), fz = Math.sin(la);
  for (const s of [-1, 1]) {   // eyes: white, a pupil in front (a squint is a dark slit)
    const ea = la + s * .42; p[0] = x + Math.cos(ea) * R * ka * .86 * u; p[1] = y + R * hk * .2 * u; p[2] = z + Math.sin(ea) * R * ka * .86 * u;
    if (b.squint) { B.ball.ball(p, 1.1 * u, .3 * u, 1.1 * u, lin(C.pupil)); continue; }
    B.ball.ball(p, 1.25 * u, 1.6 * u, 1.25 * u, lin(C.eye)); p[0] += fx * .9 * u; p[2] += fz * .9 * u; B.ball.ball(p, .7 * u, 1 * u, .7 * u, lin(C.pupil));
  }
  if (o.horns || o.ears) for (const s of [-1, 1]) {   // horns and cat ears: cones on top, toward the sides
    const sa = la + s * Math.PI / 2, bx = x + Math.cos(sa) * R * ka * .45 * u, bz = z + Math.sin(sa) * R * ka * .45 * u, by = y + R * hk * .7 * u;
    const ht = (o.horns ? .9 : .75) * R * u, tip = [bx + Math.cos(sa) * ht * .35, by + ht, bz + Math.sin(sa) * ht * .35];
    B.cone.tube([bx, by, bz], tip, R * .3 * u, o.horns ? lin(C.horn || '#e8dcc0') : dk);
  }
  if (o.wings) for (const s of [-1, 1]) {   // bat wings: they open on the hop and beat (the Blob's flap)
    const sa = la + s * Math.PI / 2, f = Math.sin(b.flapP || 0) * .5 + .5, fold = Math.min(1, (b.flap ?? 1) * 2), span = R * (.8 + (.9 + f * .5) * fold) * u;
    const root = [x + Math.cos(sa) * R * ka * .6 * u, y, z + Math.sin(sa) * R * ka * .6 * u], tip = [root[0] + Math.cos(sa) * span, y + (1.2 - f * 1.3) * fold * R * .6 * u, root[2] + Math.sin(sa) * span];
    B.box.box(root, tip, [fx, 0, fz], R * .9 * u, .25 * u, dk);
  }
}
/** an orb ({ color, r, core }): a glowing ball, a halo and three motes circling it (the stress test's wisps) */
function orbParts(B, a, t) {
  const o = a.orb, r = (o.r || 3.2) * (o.swell || 1), u = 1 / U, fade = clamp(a.fade, 0, 1), c = lin(o.color || '#c78bff');
  const [p, q] = P3; p[0] = a.x / U; p[1] = (a.z + (o.lift ?? 0)) / U; p[2] = a.y / U;
  B.glow.ball(p, r * u, r * u, r * u, a.flash > 0 ? [1, 1, 1] : c);
  B.halo.ball(p, r * 1.45 * u, r * 1.45 * u, r * 1.45 * u, c.map(v => v * .4 * fade));
  const dot = lin(o.core || '#f4e6ff');
  for (let i = 0; i < 3; i++) { const an = t * 4 + i * TAU / 3; q[0] = p[0] + Math.cos(an) * r * 1.9 * u; q[1] = p[1] + Math.sin(an * 1.3) * 2 * u; q[2] = p[2] + Math.sin(an) * r * 1.9 * u; B.glow.ball(q, .7 * u, .7 * u, .7 * u, dot); }
}
/* capes: every rig's cloth in one mesh (two rows of points from the rig's cape chains) */
function makeCapes(world) {
  const SLOT = 8, mat = world._obj(new THREE.MeshToonNodeMaterial({ color: '#ffffff', gradientMap: TOON_BANDS, vertexColors: true, side: THREE.DoubleSide }));
  let cap = 0, mesh = null, pos, col, n = 0;
  function grow(c) {
    cap = c; pos = new Float32Array(cap * SLOT * 2 * 3); col = new Float32Array(cap * SLOT * 2 * 3);
    const idx = []; for (let s = 0; s < cap; s++) for (let i = 0; i < SLOT - 1; i++) { const a = (s * SLOT + i) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    if (mesh) { world.scene.remove(mesh); mesh.geometry.dispose(); }
    mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.castShadow = true; world.scene.add(mesh);
  }
  grow(16);
  return {
    get mesh() { return mesh; },
    begin() { n = 0; },
    add(rig, sink, flash) {
      const Lc = rig.capeL, Rc = rig.capeR; if (!Lc) return;
      if (n >= cap) { const p0 = pos, c0 = col; grow(cap * 2); pos.set(p0); col.set(c0); }
      const c = flash ? FLASH : lin(rig.C.cape), base = n * SLOT * 2 * 3;
      for (let i = 0; i < SLOT; i++) {
        const j = Math.min(i, Lc.length - 1), a = Lc[j], b = Rc[j], o = base + i * 6;
        pos[o] = a.x / U; pos[o + 1] = (a.z + sink) / U; pos[o + 2] = a.y / U; pos[o + 3] = b.x / U; pos[o + 4] = (b.z + sink) / U; pos[o + 5] = b.y / U;
        col[o] = col[o + 3] = c[0]; col[o + 1] = col[o + 4] = c[1]; col[o + 2] = col[o + 5] = c[2];
      }
      n++;
    },
    end() { const g = mesh.geometry; mesh.visible = n > 0; g.setDrawRange(0, n * (SLOT - 1) * 6); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; g.computeVertexNormals(); }
  };
}
/* ---- cards: the engine's own drawings in atlas pages (fixed 512+ pixel canvases, each its own texture and instanced
 *      mesh, made when first needed and kept; only the pages used upload each frame; every page compiles to the same
 *      shader: each card's cell comes from a per-card attribute, and each page has room for over 1,000 cards (three
 *      r182 keeps the matrices of an instanced mesh with 1,000 or fewer in a uniform buffer named after the mesh, which
 *      makes every such mesh's shader its own) ---- */
const CARD_QUAD = new THREE.PlaneGeometry(1, 1), CARD_RECT = TSL.attribute('cardRect', 'vec4');
function makeAtlas(world) {
  const pages = [], scene = world.scene;
  let P = 0, cell = 0, ncol = 0, per = 0, n = 0, key = '';
  function page(i) {
    if (pages[i]) return pages[i];
    const cv = document.createElement('canvas'), out = document.createElement('canvas'); cv.width = cv.height = out.width = out.height = P;
    const tex = canvasTex(out, false), room = Math.max(per, 1001), rect = new THREE.InstancedBufferAttribute(new Float32Array(room * 4), 4), geo = CARD_QUAD.clone(); geo.setAttribute('cardRect', rect);
    const mat = world._obj(new THREE.MeshBasicNodeMaterial({ alphaTest: .5 }));
    mat.colorNode = TSL.texture(tex).sample(TSL.uv().mul(CARD_RECT.zw).add(CARD_RECT.xy));
    const mesh = new THREE.InstancedMesh(geo, mat, room); mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh); hideSlots(mesh.instanceMatrix.array, 0, room);
    return (pages[i] = { cv, out, g: cv.getContext('2d'), go: out.getContext('2d'), tex, rect, mesh, M: mesh.instanceMatrix.array, n: 0, rows: 0 });
  }
  function reset() { for (const pg of pages) { scene.remove(pg.mesh); pg.mesh.dispose(); pg.mesh.geometry.dispose(); pg.mesh.material.dispose(); pg.tex.dispose(); } pages.length = 0; }
  return {
    /** start a frame: the cell size from the cards' view scale */
    begin(view) {
      cell = Math.ceil(64 * view.scale / 8) * 8;
      let size = 512; while (size < 4 * cell && size < 2048) size *= 2;
      if (size + ':' + cell !== key) { reset(); key = size + ':' + cell; P = size; }
      ncol = Math.floor(P / cell); per = ncol * ncol; n = 0;
      for (const pg of pages) { if (pg.rows) pg.g.clearRect(0, 0, P, pg.rows * cell); pg.n = 0; }
    },
    /** draw one character into the next cell (draw(g, ox, oy) as the 2D engine's actors draw) and stand its card at
     *  (x, y, z) engine units; false when the atlas is full */
    add(x, y, z, draw, flash, alpha, v) {
      if (n >= 64 * per) return false;
      const pg = page(Math.floor(n / per)), j = pg.n, g = pg.g;
      const cx = (j % ncol) * cell, cy = Math.floor(j / ncol) * cell, ox = cx + cell / 2, oy = cy + Math.round(cell * .72);
      g.save(); g.beginPath(); g.rect(cx + 1, cy + 1, cell - 2, cell - 2); g.clip();
      if (alpha < 1) g.globalAlpha = alpha;
      try { draw(g, ox, oy); } finally { g.restore(); }
      if (flash) { g.save(); g.beginPath(); g.rect(cx, cy, cell, cell); g.clip(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .3; g.fillStyle = '#ffe6d8'; g.fillRect(cx, cy, cell, cell); g.restore(); }
      // the cell's size in the world (v.ppm: the cards' pixels per metre), its root on the rig's root, facing the camera,
      // pushed toward the camera so the floor can't cut its feet
      const ppm = v.ppm, w = cell / ppm, h = cell / (ppm * v.vert);
      const dx = (cell / 2 - (ox - cx)) / ppm, dy = ((oy - cy) - cell / 2) / (ppm * v.vert);
      const r = v.right, up = v.up, bk = v.back, i = j * 16;
      const tx = x / U + r.x * dx + up.x * dy + bk.x * .45, ty = z / U + r.y * dx + up.y * dy + bk.y * .45, tz = y / U + r.z * dx + up.z * dy + bk.z * .45;
      const A = pg.M; A[i] = r.x * w; A[i + 1] = r.y * w; A[i + 2] = r.z * w; A[i + 3] = 0; A[i + 4] = up.x * h; A[i + 5] = up.y * h; A[i + 6] = up.z * h; A[i + 7] = 0;
      A[i + 8] = bk.x; A[i + 9] = bk.y; A[i + 10] = bk.z; A[i + 11] = 0; A[i + 12] = tx; A[i + 13] = ty; A[i + 14] = tz; A[i + 15] = 1;
      const q = pg.rect.array, k = j * 4; q[k] = cx / P; q[k + 1] = 1 - (cy + cell) / P; q[k + 2] = cell / P; q[k + 3] = cell / P;
      pg.n++; n++; return true;
    },
    /** finish: each used page's outline (each sprite grown by `thick` pixels in the outline color, under it) over its
     *  used rows, and one upload per used page */
    end(outlines, thick = 1) {
      const t = Math.max(1, Math.round(thick)), d = Math.max(1, Math.round(t * .7));
      const OFFS = t === 1 ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[t, 0], [-t, 0], [0, t], [0, -t], [d, d], [-d, d], [d, -d], [-d, -d]];
      for (const pg of pages) {
        const rows = Math.ceil(pg.n / ncol), hNow = rows * cell, hWas = pg.rows * cell, go = pg.go;
        if (hWas) go.clearRect(0, 0, P, hWas);
        if (pg.n) {
          if (outlines) { for (const [dx, dy] of OFFS) go.drawImage(pg.cv, 0, 0, P, hNow, dx, dy, P, hNow); go.globalCompositeOperation = 'source-in'; go.fillStyle = OUTLINE; go.fillRect(0, 0, P, hNow + t); go.globalCompositeOperation = 'source-over'; }
          go.drawImage(pg.cv, 0, 0, P, hNow, 0, 0, P, hNow);
        }
        if (pg.n || hWas) pg.tex.needsUpdate = true;
        pg.rows = rows; pg.mesh.count = pg.n;
        if (pg.n) {
          pg.mesh.instanceMatrix.clearUpdateRanges(); pg.mesh.instanceMatrix.addUpdateRange(0, reachOf(pg.mesh.instanceMatrix, pg.n) * 16); pg.mesh.instanceMatrix.needsUpdate = true;
          pg.rect.clearUpdateRanges(); pg.rect.addUpdateRange(0, pg.n * 4); pg.rect.needsUpdate = true;
        }
      }
    },
    /** make the first k pages now, so the first frames of a crowd don't */
    prepare(view, k) { this.begin(view); for (let i = 0; i < k; i++) page(i); },
    get pages() { return pages; }, dispose: reset
  };
}

/* =============================================================================
 * 7. CAMERA  world.camera: every camera a real 3D one, its pose worked out in the game's fixed steps (so the controls
 *    that read it play back the same), its picture placed when the world draws.
 *      'view'   the 2D engine's views as 3D cameras following the target (camera.target: the first hero unless set), a
 *               little ahead of its aim with the 2D camera's lag: game.view (V cycles it), game.yaw ([ ] turn it),
 *               game.zoom (the wheel, a pinch, Settings: Camera zoom). proj 'persp' (a lens, camera.fov) or 'ortho'
 *               (the 2D engine's flat projection); dist pulls it back. Walls between the level and the camera are cut
 *               low, pillars between it and the target cut to stumps (camera.cut false keeps them)
 *      'chase'  behind the target and above it: it swings round behind as the target moves (chase.auto), turns with
 *               [ ], the mouse once a click captures it (Esc frees it); game.zoom pulls it in; it slides in front of
 *               walls rather than through them
 *      'first'  the target's eyes (its body isn't drawn), 'fly' a free camera the move stick flies (jump up, dash
 *               down), 'fixed' stays where camera.fixed says ({ x, y, z, yaw, pitch, roll, fov }): a game that runs its
 *               own camera (a shooter's eyes, its over-the-shoulder view) sets it every step
 *      'zones'  Resident Evil's: the region the target is in gives the camera (camera.zones: a fixed one, one that turns
 *               to follow, one that slides on a rail), a cut when it moves on, held back until it is `margin` units
 *               into the next region (hysteresis: no flicking back and forth on a border)
 *    camera.ground(move) -> the move stick turned to the ground ([x, y], W walks away from the camera); across a cut it
 *    keeps the old camera's way while the stick is held the same way (no walking back out of a doorway);
 *    camera.steer(actor, move, dt) -> the same, or tank controls (the player's setting: World3D.CONTROLS);
 *    camera.lock(from, target | list) -> lock-on (Zelda's targeting): the chase and first cameras turn to frame both,
 *    ground() strafes round the target, a reticle marks it; cycle(list) the next in sight, unlock();
 *    camera.aim(actor) -> the angle the mouse (on the floor) or right stick points from it, or null;
 *    camera.heading: the ground angle it looks along; camera.pose: { x, y, z, yaw, pitch, fov, ortho } now
 * ============================================================================= */
const headingOf = yawDeg => Math.atan2(-Math.cos(yawDeg * DEG), -Math.sin(yawDeg * DEG));
const engineYaw = a => ((Math.round(Math.atan2(-Math.cos(a), -Math.sin(a)) / DEG) % 360) + 360) % 360;
class Camera3D {
  /** made by the world: new E.World3D(game, { camera: { mode, proj, fov, dist, lag, lead, chase, first } }) */
  constructor(world, o = {}) {
    /** mode: 'view' | 'chase' | 'first' | 'fly' | 'fixed'; proj: 'persp' | 'ortho' (view mode); fov: the view lens
     *  (degrees); dist: how far back a view stands (1 frames the 2D game's picture); lag: seconds the focus trails the
     *  target; lead: units ahead of its aim; target: the actor (or { x, y, z }) followed; cut: walls and pillars cut
     *  away in view mode */
    Object.assign(this, { world, mode: o.mode || 'view', proj: o.proj || 'persp', fov: o.fov || 40, dist: o.dist || 1, lag: o.lag ?? .18, lead: o.lead ?? 16, target: o.target || null, cut: o.cut !== false });
    /** chase: { pitch (radians, - looks down), dist (units), fov, height (units above the feet it looks at), auto (swings
     *  round behind the target as it moves) }; first: { pitch, fov }; fly: { x, y, z, yaw, pitch, fov }; fixed: a pose */
    this.chase = Object.assign({ pitch: -.36, dist: 88, fov: 60, height: 24, auto: true }, o.chase);
    this.first = Object.assign({ pitch: -.08, fov: 75 }, o.first);
    /** behind: the 'behind' camera's { dist (70), height (24), ahead (40: where it looks past the target), lag (5: how
     *  fast it swings after the target's heading), fov (64), roll (0: the share of a flyer's roll it takes) } */
    this.behind = Object.assign({ dist: 70, height: 24, ahead: 40, lag: 5, fov: 64, roll: 0 }, o.behind);
    this.fly = { x: 0, y: 0, z: 90, yaw: -Math.PI / 2, pitch: -.32, fov: 70 }; this.fixed = o.fixed || null;
    /** yaw: the heading of the chase, first and fly cameras (radians, the ground angle they look along); locked: the
     *  mouse is captured (pointer lock) and turns them; mouseLook: false never captures it */
    this.yaw = o.yaw ?? -Math.PI / 2; this.locked = false; this.mouseLook = o.mouseLook !== false;
    /** far: how far it sees (units; a terrain's far); near: its near plane (units; null: the mode's own); capture: a click
     *  captures the mouse in any mode and its moves collect in camera.mouse ([dx, dy] pixels) for the game to take
     *  (camera.takeMouse()) instead of turning the camera: a shooter turns its own (fixed) camera */
    this.far = o.far || 9600; this.near = o.near || null; this.capture = !!o.capture; this.mouse = [0, 0];
    /** zones (mode 'zones'): [{ box: [x0, y0, x1, y1] (units), at: [x, y, z] (the camera), look: [x, y, z] (where a
     *  fixed one looks), follow: true (it turns to follow the target), rail: [[x, y, z], [x, y, z]] (it slides along the
     *  rail, level with the target), height (20: where on the target it looks), fov (50) }], the first holding the target
     *  counts; zone: the one now; cuts: how many cuts so far; margin: how deep into the next zone the target goes first */
    this.zones = o.zones || []; this.zone = null; this.cuts = 0; this.margin = o.margin ?? 8;
    /** lockOn: what the camera is locked on (camera.lock), lockFrom: who locks on, lockRange: how far it holds (it lets go
     *  past 1.25 times that); reticle: the lock's mark (a color; false: none) */
    this.lockOn = null; this.lockFrom = null; this.lockRange = o.lockRange || 160; this.reticle = o.reticle ?? '#ffd34a';
    this._hold = null; this._mv = [0, 0]; this._cutting = false;
    this.focus = null; this.smooth = null; this.eyeZ = 24; this.pose = null; this._gyaw = null; this._held = 0;
    this.persp = new THREE.PerspectiveCamera(40, 1, .1, 600); this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 2000); this.cam = this.persp;
    /** the cards' view of the world: the camera's axes in three.js space, the cards' pixels per metre, its turn and tilt */
    this.cv = { right: new THREE.Vector3(), up: new THREE.Vector3(1, 0, 0), back: new THREE.Vector3(), q: new THREE.Quaternion(), ppm: 24, vert: 1, thick: 1, scale: 1.5, yaw: 0, pitch: 45 };
    this._fr = new THREE.Frustum(); this._views = new Map();
  }
  /** switch mode, keeping the way it looks where it can ('view' -> 'chase' looks the same way) */
  set(mode) {
    if (!['view', 'chase', 'first', 'fly', 'fixed', 'zones', 'behind'].includes(mode) || mode === this.mode) return this;
    if (mode === 'zones') this.zone = null;
    const p = this.pose, was = this.mode;
    if (p && mode !== 'view') this.yaw = p.yaw;
    if (mode === 'fly' && p) Object.assign(this.fly, was === 'first' ? { x: p.x - Math.cos(p.yaw) * 56, y: p.y - Math.sin(p.yaw) * 56, z: p.z + 26, yaw: p.yaw, pitch: Math.min(p.pitch, -.3), fov: 70 } : { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, fov: p.fov || 70 });
    if (mode === 'fixed' && !this.fixed && p) this.fixed = { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, fov: p.fov || 60 };
    this.mode = mode; this.smooth = null;
    if ((mode === 'view' || mode === 'fixed') && !this.capture && typeof document !== 'undefined' && document.pointerLockElement) { document.exitPointerLock(); this.locked = false; }
    return this;
  }
  /** the mouse's moves since the last call ([dx, dy] in pixels, into out), with capture on: zeroed as it is taken */
  takeMouse(out = [0, 0]) { out[0] = this.mouse[0]; out[1] = this.mouse[1]; this.mouse[0] = this.mouse[1] = 0; return out; }
  /** follow an actor (or any { x, y, z }) */
  follow(t) { this.target = t; this.focus = null; this.smooth = null; return this; }
  _target() { const w = this.world; return this.target || w.actors.find(a => a.kind === 'hero') || { x: w.width / 2, y: w.depth / 2, z: 0 }; }
  /** the view mode's angles [yaw, pitch] in degrees (the 2D engine's: yaw 0 has the camera to the south) */
  viewAngles() { const g = this.world.game, v = g.baseView || g.view; return [v.yawDeg + (v.pitchDeg < 5 ? 0 : g.yaw || 0), v.pitchDeg]; }
  /** the ground angle the camera looks along now */
  get heading() { return this.pose ? this.pose.yaw : this.mode === 'view' ? headingOf(this.viewAngles()[0]) : this.mode === 'zones' ? this.update(0).yaw : this.yaw; }
  /** a step of the game: where every camera is (fixed steps: the controls read it) */
  update(dt) {
    const g = this.world.game, t = this._target();
    // [ and ] (game.rotateView) turn the chase, first and fly cameras too
    const gy = g.yaw || 0; if (this._gyaw !== null && gy !== this._gyaw) { const d = ((gy - this._gyaw + 540) % 360) - 180; this.yaw += d * DEG; this.fly.yaw += d * DEG; this._held = 1.5; } this._gyaw = gy;
    this._held = Math.max(0, this._held - dt);
    // the lock lets go of a target that died, left the world or got too far away
    const L = this.lockOn, F = this.lockFrom; if (L && (L.alive === false || !this.world.actors.includes(L) || !F || Math.hypot(L.x - F.x, L.y - F.y) > this.lockRange * 1.25)) this.unlock();
    const m = this.mode, P = this.world.passing;
    this.pose = P ? this._passPose(P) : m === 'view' ? this._viewPose(dt, t) : m === 'chase' ? this._chasePose(dt, t) : m === 'first' ? this._firstPose(dt, t) : m === 'fly' ? this._flyPose(dt) : m === 'zones' ? this._zonePose(dt, t) : m === 'behind' ? this._behindPose(dt, t) : Object.assign({ ortho: false }, this.fixed || this._viewPose(dt, t));
    if (this._cutting) { this._cutting = false; this._was = null; }   // (a cut: the frames after it don't slide in from the old pose)
    return this.pose;
  }
  /** a cut: the next frames start at the new pose; a stick held now keeps its way on the ground until it lets go */
  _cutNow() {
    this._cutting = true;
    if (this.pose && Math.hypot(this._mv[0], this._mv[1]) > .3) this._hold = { yaw: this.pose.yaw, mv: [this._mv[0], this._mv[1]] };
  }
  /** the zone at (x, y): the one it is in while within margin of its box, else the first whose box holds the point */
  _zoneAt(x, y) {
    const inBox = (z, e) => { const b = z.box; return !!b && x >= b[0] - e && x <= b[2] + e && y >= b[1] - e && y <= b[3] + e; };
    if (this.zone && this.zones.includes(this.zone) && inBox(this.zone, this.margin)) return this.zone;
    return this.zones.find(z => inBox(z, 0)) || this.zone;
  }
  _zonePose(dt, t) {
    const Z = this._zoneAt(t.x, t.y);
    if (Z !== this.zone) { if (this.zone) { this.cuts++; this._cutNow(); } this.zone = Z; this.smooth = null; }
    if (!Z) return this._viewPose(dt, t);
    const k = dt > 0 ? 1 - Math.exp(-dt * 5) : 1, lz = (t.z || 0) + (Z.height ?? 20);
    let at = Z.at, look = !Z.follow && !Z.rail && Z.look ? Z.look : [t.x, t.y, lz];
    if (Z.rail) {   // level with the target along the rail's line on the ground
      const [a, b] = Z.rail, dx = b[0] - a[0], dy = b[1] - a[1], u = clamp(((t.x - a[0]) * dx + (t.y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      at = [a[0] + dx * u, a[1] + dy * u, a[2] + (b[2] - a[2]) * u];
    }
    if (Z.follow || Z.rail) {   // (eased: it turns and slides after the target, never snaps)
      const s = this.smooth || (this.smooth = [...at, ...look]);
      for (let i = 0; i < 3; i++) { s[i] += (at[i] - s[i]) * k; s[i + 3] += (look[i] - s[i + 3]) * k; }
      at = s.slice(0, 3); look = s.slice(3);
    }
    const dx = look[0] - at[0], dy = look[1] - at[1];
    return { x: at[0], y: at[1], z: at[2], yaw: Math.atan2(dy, dx), pitch: Math.atan2(look[2] - at[2], Math.hypot(dx, dy)), fov: Z.fov || 50, ortho: false, wide: true };   // (wide: framed for 4:3, a taller screen sees as much across)
  }
  /** behind the target along its heading (t.yaw, t.angle or t.facing) and its pitch, swinging after it (a kart's drift
   *  swings the kart, not the view), in front of walls */
  _behindPose(dt, t) {
    const B = this.behind, k = dt > 0 ? 1 - Math.exp(-dt * B.lag) : 1, kp = dt > 0 ? 1 - Math.exp(-dt * 20) : 1, yaw = t.yaw ?? t.angle ?? t.facing ?? 0, pitch = t.pitch || 0;
    const s = this.smooth || (this.smooth = [t.x, t.y, t.z || 0, yaw, pitch, 0]);
    s[0] += (t.x - s[0]) * kp; s[1] += (t.y - s[1]) * kp; s[2] += ((t.z || 0) - s[2]) * kp;
    s[3] += E.angDiff(s[3], yaw) * k; s[4] += E.angDiff(s[4], pitch) * k; s[5] += ((t.roll || 0) * B.roll - s[5]) * k;
    const cy = Math.cos(s[3]), sy = Math.sin(s[3]), cp = Math.cos(s[4]), sp = Math.sin(s[4]), f = [cy * cp, sy * cp, sp], u = [-cy * sp, -sy * sp, cp];
    const look = [s[0] + f[0] * B.ahead + u[0] * B.height * .4, s[1] + f[1] * B.ahead + u[1] * B.height * .4, s[2] + f[2] * B.ahead + u[2] * B.height * .4];
    let d = B.dist; const zoom = clamp(this.world.game.zoom || 1, .5, 3); d /= zoom;
    for (let r = 8; r <= d; r += 4) { const x = s[0] - f[0] * r + u[0] * B.height, y = s[1] - f[1] * r + u[1] * B.height, z = s[2] - f[2] * r + u[2] * B.height; if (z < this.world.topH(x, y) + 4) { d = Math.max(8, r - 5); break; } }   // (in front of a wall)
    const x = s[0] - f[0] * d + u[0] * B.height, y = s[1] - f[1] * d + u[1] * B.height, z = s[2] - f[2] * d + u[2] * B.height, dx = look[0] - x, dy = look[1] - y;
    return { x, y, z, yaw: Math.atan2(dy, dx), pitch: Math.atan2(look[2] - z, Math.hypot(dx, dy)), roll: s[5], fov: B.fov, ortho: false };
  }
  /** the door opening between rooms (world.through): from the actor's side to the far one, through the doorway */
  _passPose(P) {
    const d = P.door, v = clamp((P.t / P.time - .2) / .8, 0, 1), s = lerp(34, -16, v * v * (3 - 2 * v)) * P.side;
    return { x: d.x + P.nx * s, y: d.y + P.ny * s, z: d.z + 22, yaw: Math.atan2(-P.ny * P.side, -P.nx * P.side), pitch: -.06, fov: 55, ortho: false };
  }
  _viewPose(dt, t) {
    const g = this.world.game, k = dt > 0 ? 1 - Math.exp(-dt / Math.max(.001, this.lag)) : 1, L = this.lockOn && this.lockFrom === t ? this.lockOn : null;
    const a = t.aim ?? t.facing, ld = typeof a === 'number' && !L ? this.lead : 0;
    const tx = L ? lerp(t.x, L.x, .5) : t.x + (ld ? Math.cos(a) * ld : 0), ty = L ? lerp(t.y, L.y, .5) : t.y + (ld ? Math.sin(a) * ld : 0), tz = (t.z || 0) + 8;   // (locked: both framed)
    const f = this.focus || (this.focus = [tx, ty, tz]);
    f[0] += (tx - f[0]) * k; f[1] += (ty - f[1]) * k; f[2] += (tz - f[2]) * k;
    // the picture's height at the focus: the 2D game's (its height in pixels at the view's scale and zoom)
    const [yw, pt] = this.viewAngles(), v = g.baseView || g.view, ortho = this.proj === 'ortho' || pt < 1, Hf = g.H / ((v.scale || 1.5) * (g.zoom || 1)) * this.dist, cp = Math.cos(pt * DEG);
    const d = ortho ? 900 : Hf / 2 / Math.tan(this.fov * DEG / 2);
    return { x: f[0] + Math.sin(yw * DEG) * cp * d, y: f[1] + Math.cos(yw * DEG) * cp * d, z: f[2] + Math.sin(pt * DEG) * d, yaw: headingOf(yw), pitch: -pt * DEG, fov: this.fov, ortho, Hf };
  }
  _chasePose(dt, t) {
    const C = this.chase, g = this.world.game, k = dt > 0 ? 1 - Math.exp(-dt * 12) : 1;
    const s = this.smooth || (this.smooth = [t.x, t.y, t.z || 0]); s[0] += (t.x - s[0]) * k; s[1] += (t.y - s[1]) * k; s[2] += ((t.z || 0) - s[2]) * k;
    const sp = Math.hypot(t.vx || 0, t.vy || 0), L = this.lockOn && this.lockFrom === t ? this.lockOn : null;
    if (L) { if (dt > 0) this.yaw = E.approachAng(this.yaw, Math.atan2(L.y - s[1], L.x - s[0]), dt * 5); }   // locked: behind it, facing the target
    else if (C.auto && !this.locked && !this._held && sp > 20 && dt > 0) {   // swing round behind it as it moves (more the faster)
      const want = Math.atan2(t.vy, t.vx), off = Math.abs(((want - this.yaw + Math.PI * 3) % TAU) - Math.PI);
      if (off < 2.6) this.yaw = E.approachAng(this.yaw, want, dt * 1.6 * Math.min(1, sp / 80) * (off > 1.6 ? .4 : 1));
    }
    const sep = L ? Math.hypot(L.x - s[0], L.y - s[1]) : 0, tx = L ? lerp(s[0], L.x, .3) : s[0], ty = L ? lerp(s[1], L.y, .3) : s[1], tz = s[2] + C.height, cp = Math.cos(C.pitch), fx = Math.cos(this.yaw) * cp, fy = Math.sin(this.yaw) * cp, fz = Math.sin(C.pitch);
    const want = Math.max(C.dist / clamp(g.zoom || 1, .5, 3), sep * .5 + 30); let d = want;
    for (let r = 6; r <= want; r += 3) { const x = tx - fx * r, y = ty - fy * r, z = tz - fz * r; if (z < this.world.topH(x, y) + 4) { d = Math.max(6, r - 5); break; } }   // in front of a wall
    return { x: tx - fx * d, y: ty - fy * d, z: tz - fz * d, yaw: this.yaw, pitch: C.pitch, fov: C.fov, ortho: false };
  }
  _firstPose(dt, t) {
    let ez = (t.z || 0) + 24;
    if (t.rig && t.rig.J) { frame(t.rig); _sink = 0; wp(t.rig.J.head, P3[22]); ez = P3[22][1] * U + 1; }   // its head (it bobs with its steps)
    this.eyeZ += (ez - this.eyeZ) * (dt > 0 ? 1 - Math.exp(-dt * 16) : 1);
    const L = this.lockOn; if (L && this.lockFrom === t && dt > 0) this.yaw = E.approachAng(this.yaw, Math.atan2(L.y - t.y, L.x - t.x), dt * 6);
    return { x: t.x + Math.cos(this.yaw) * 2.5, y: t.y + Math.sin(this.yaw) * 2.5, z: this.eyeZ, yaw: this.yaw, pitch: this.first.pitch, fov: this.first.fov, ortho: false };
  }
  _flyPose(dt) {
    const F = this.fly, I = this.world.game.input, mv = I.move(), sp = 90 * dt, up = (I.down('jump') ? 1 : 0) - (I.down('dash') ? 1 : 0);
    F.yaw = this.yaw;
    const cy = Math.cos(F.yaw), sy = Math.sin(F.yaw), cp = Math.cos(F.pitch), spp = Math.sin(F.pitch), fwd = -mv[1], str = mv[0];
    F.x += (cp * cy * fwd - sy * str) * sp; F.y += (cp * sy * fwd + cy * str) * sp; F.z = clamp(F.z + (spp * fwd + up) * sp, this.world.bottom + 8, 900);
    return Object.assign({}, F, { ortho: false });
  }
  /** the move stick ([x, y]: x right, y down, as game.input.move() gives it) turned to the ground: W walks away from the
   *  camera, D to its right. Across a cut it keeps the old camera's way while the stick is held the same way (within 45
   *  degrees); locked on in the chase or first camera, W walks at the target and A and D strafe round it. Returns [x, y]
   *  in out */
  ground(mv, out = [0, 0]) {
    let a = this.heading; const h = this._hold, m = Math.hypot(mv[0], mv[1]), L = this.lockOn, F = this.lockFrom;
    this._mv[0] = mv[0]; this._mv[1] = mv[1];
    if (h) { if (m > .3 && (mv[0] * h.mv[0] + mv[1] * h.mv[1]) > .7 * m * Math.hypot(h.mv[0], h.mv[1])) a = h.yaw; else this._hold = null; }
    if (L && F && (this.mode === 'chase' || this.mode === 'first')) a = Math.atan2(L.y - F.y, L.x - F.x);
    const fx = Math.cos(a), fy = Math.sin(a);
    out[0] = -fy * mv[0] + fx * -mv[1]; out[1] = fx * mv[0] + fy * -mv[1];
    return out;
  }
  /** the player's Controls setting (World3D.CONTROLS, game.settings.tank3d): tank controls when true */
  get tank() { const s = this.world.game.settings; return !!(s && s.tank3d); }
  /** the way an actor goes this step by the player's controls ([x, y] into out, length up to 1): camera-relative
   *  (ground), or tank controls (o.tank, else the setting): up walks forward along a.facing, down back (o.back: .5 of the
   *  speed), left and right turn it (o.turn: 3.4 radians a second; it sets a.facing: set it yourself only when
   *  !camera.tank) */
  steer(a, mv, dt, out = [0, 0], o = {}) {
    if (!(o.tank ?? this.tank)) return this.ground(mv, out);
    a.facing += mv[0] * (o.turn ?? 3.4) * dt; const f = -mv[1] * (mv[1] > 0 ? o.back ?? .5 : 1);
    out[0] = Math.cos(a.facing) * f; out[1] = Math.sin(a.facing) * f; return out;
  }
  /** lock on (Zelda's targeting): the chase and first cameras swing behind `from` to frame it and the target, the view
   *  camera frames both, ground() strafes round it, a reticle marks it. target: an actor, or a list to pick from: the one
   *  in sight (alive, within range, a clear line between them) nearest the way `from` faces. o: { range (160) }. Returns
   *  the target, or null (nothing in sight: no lock). It lets go when the target dies (alive false), leaves the world or
   *  goes past 1.25 times the range */
  lock(from, target, o = {}) {
    if (o.range) this.lockRange = o.range;
    const t = Array.isArray(target) ? this.pick(from, target) : this.sight(from, target) ? target : null;
    this.lockFrom = t ? from : null; this.lockOn = t; return t;
  }
  /** let go of the lock */
  unlock() { this.lockOn = this.lockFrom = null; return this; }
  /** may `from` see `a`: alive, within range (the lock's), a clear line from its chest to the other's */
  sight(from, a, range = this.lockRange) {
    if (!from || !a || a === from || a.alive === false || !this.world.actors.includes(a) || Math.hypot(a.x - from.x, a.y - from.y) > range) return false;
    return this.world.clear(from.x, from.y, (from.z || 0) + 16, a.x, a.y, (a.z || 0) + 12);
  }
  /** the one of a list in sight of `from` nearest the way it faces (a near one beats a far one a little to the side) */
  pick(from, list) {
    let best = null, bs = 1e9;
    for (const a of list) { if (!this.sight(from, a)) continue; const s = Math.abs(E.angDiff(from.facing || 0, Math.atan2(a.y - from.y, a.x - from.x))) * 60 + Math.hypot(a.x - from.x, a.y - from.y); if (s < bs) { bs = s; best = a; } }
    return best;
  }
  /** locked on: the next of a list in sight, round `from` (dir 1: clockwise from above, -1 the other way); null (and the
   *  lock kept) when no other is in sight */
  cycle(list, dir = 1) {
    const F = this.lockFrom, C = this.lockOn; if (!F || !C) return null;
    const base = Math.atan2(C.y - F.y, C.x - F.x); let best = null, bd = 1e9;
    for (const a of list) { if (a === C || !this.sight(F, a)) continue; const d = ((((Math.atan2(a.y - F.y, a.x - F.x) - base) * dir) % TAU) + TAU) % TAU || TAU; if (d < bd) { bd = d; best = a; } }
    if (best) this.lockOn = best; return best;
  }
  /** the angle an actor aims at: straight ahead with the mouse captured (chase, first), the right stick (turned to the
   *  ground), the mouse's point on the floor at the actor's height; null when nothing aims */
  aim(a) {
    const I = this.world.game.input, p = this.pose || this.update(0);
    if ((this.mode === 'chase' || this.mode === 'first') && this.locked) return p.yaw;
    if (I.aimSource === 'pad' && I.padAim) { const v = this.ground([I.padAim[0], I.padAim[1]], [0, 0]); return Math.atan2(v[1], v[0]); }
    if (I.aimSource === 'mouse' && I.mouse.active) { const m = this.world.screenToFloor(I.mouse.cx, I.mouse.cy, (a.z || 0) + 4); if (m && Math.hypot(m[0] - a.x, m[1] - a.y) > 3) return Math.atan2(m[1] - a.y, m[0] - a.x); }
    return null;
  }
  /** aim the three.js camera at the pose, with the game's screen shake; w x h: the picture's aspect */
  place(w, h) {
    const p = this.pose || this.update(0), g = this.world.game, cam = p.ortho ? this.ortho : this.persp, aspect = w / h, sh = g.shaking || 0, t = g.real || 0;
    const shx = sh > .05 ? (Math.sin(t * 83) + Math.sin(t * 57.3)) * .5 * sh : 0, shy = sh > .05 ? (Math.sin(t * 71) + Math.sin(t * 49.7)) * .5 * sh : 0;
    if (p.ortho) { const hh = p.Hf / U / 2; Object.assign(this.ortho, { left: -hh * aspect, right: hh * aspect, top: hh, bottom: -hh, near: .1, far: 3000 }); }
    else Object.assign(this.persp, { fov: p.wide && aspect < 4 / 3 ? 2 * Math.atan(Math.tan(p.fov * DEG / 2) * 4 / 3 / aspect) / DEG : p.fov, aspect, near: this.near ? this.near / U : this.mode === 'first' ? .3 : .1, far: this.far / U });
    const cp = Math.cos(p.pitch), fx = Math.cos(p.yaw) * cp, fz = Math.sin(p.yaw) * cp, fy = Math.sin(p.pitch), rx = -Math.sin(p.yaw), rz = Math.cos(p.yaw), k = .05 / U * 4;
    cam.position.set(p.x / U + rx * shx * k, p.z / U - shy * k, p.y / U + rz * shx * k);
    cam.up.set(0, 1, 0); if (Math.abs(fy) > .999) cam.up.set(Math.cos(p.yaw), 0, Math.sin(p.yaw));   // (straight down: up on the screen is where it heads)
    cam.lookAt(_v0.set(cam.position.x + fx, cam.position.y + fy, cam.position.z + fz));
    if (p.roll) cam.rotateZ(p.roll);   // (a fixed pose may lean: a slide, a wall run)
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const CV = this.cv; cam.getWorldQuaternion(CV.q);
    CV.right.set(1, 0, 0).applyQuaternion(CV.q); CV.up.set(0, 1, 0).applyQuaternion(CV.q); CV.back.set(0, 0, 1).applyQuaternion(CV.q);
    CV.yaw = engineYaw(p.yaw); CV.pitch = clamp(Math.round(-p.pitch / DEG), 0, 89);
    // the cards' pixel size: about the screen's where the target stands (whole eighths, changed only when it moves by a
    // fifth: a new size remakes the atlas)
    const tg = this._target(); let ppu;
    if (p.ortho) ppu = h / p.Hf;
    else { const hv = _v0.set(tg.x / U, ((tg.z || 0) + 14) / U, tg.y / U).sub(cam.position), dz = Math.max(.5, -hv.dot(CV.back)) * U; ppu = h / 2 / (Math.tan(this.persp.fov * DEG / 2) * dz); }
    const want = clamp(Math.round(ppu * 8) / 8, .5, 4);
    if (Math.abs(want - CV.scale) / CV.scale > .2) CV.scale = want;
    CV.ppm = CV.scale * U; CV.thick = Math.max(1, Math.round(CV.scale / 1.5));
    this._fr.setFromProjectionMatrix(_m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), cam.coordinateSystem);
    this.cam = cam;
    return cam;
  }
  /** on screen: a sphere of radius r (units) round (x, y, z) inside the camera's view */
  sees(x, y, z, r = 36) { return this._fr.intersectsSphere(_sph.set(_v0.set(x / U, (z + 14) / U, y / U), r / U)); }
  /** the 2D engine's view the cards are drawn from: the camera's turn and tilt, at the cards' pixel size */
  cardView() {
    const CV = this.cv, key = CV.yaw + ':' + CV.pitch + ':' + CV.scale; let v = this._views.get(key);
    if (!v) { if (this._views.size > 500) this._views.clear(); v = new E.View('card', 'Card', CV.yaw, CV.pitch, CV.scale, 1); this._views.set(key, v); }
    return v;
  }
}
const _sph = new THREE.Sphere();

/* =============================================================================
 * 8. ACTORS  world.hero(o): a kinematic capsule that Rapier's character controller walks (it slides along walls,
 *    climbs stairs and slopes, steps up curbs, jumps, rides moving platforms, pushes crates and shoves mobs aside);
 *    world.mob(o): a dynamic body (a capsule, or a ball for blobs and orbs) that the crowd's own physics resolves.
 *    Either way the game sets what it wants each step (vx, vy: ground velocity in units a second; jump(v) or vz) and
 *    world.step moves it and reads back where it is.
 * ============================================================================= */
class Actor {
  /** made by world.hero(o) and world.mob(o); see the manual for its fields */
  constructor(world, kind, o) {
    const round = !!(o.blob || o.orb), r = o.r ?? (kind === 'hero' ? 4.5 : round ? 6 : 5), half = o.half ?? (round ? 0 : kind === 'hero' ? 9 : 8);
    /** kind: 'hero' | 'mob'; x, y, z: its feet (engine units); vx, vy, vz: velocity (units a second); facing: radians;
     *  r, half: its capsule (radius, half its straight part; half 0 is a ball); rig | blob | orb: what is drawn; fly:
     *  no gravity; grounded, landed (this step), fell (dropped below the world): read them; alive: yours to keep */
    Object.assign(this, { world, kind, x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 0, vx: 0, vy: 0, vz: 0, facing: o.facing ?? -Math.PI / 2, r, half, foot: half + r,
      rig: o.rig || null, blob: o.blob || null, orb: o.orb || null, fly: !!o.fly, mass: o.mass ?? 1, grounded: false, landed: false, fell: false, solid: true, alive: true });
    /** anim: what its rig is doing this step, given to rig.update with its motion (world.step poses it: { attack, pose,
     *  hurt, dash, expr, ... } as the 2D engine's rigs take them; a blob's: { squash, look, squint, flap }); pose: false
     *  poses it yourself; look: 'card' | 'puppet' for this one (null: the world's); flash: seconds of hit flash; fade:
     *  0..1 shown; sink: units drawn into the floor (rising from it, falling into it); visible; shadow; trail: a color
     *  for its rig's weapon trail (null none); data: yours */
    Object.assign(this, { anim: null, pose: o.pose !== false, look: o.look || null, flash: 0, fade: 1, sink: 0, visible: o.visible !== false, shadow: o.shadow !== false, trail: o.trail || null, data: o.data || {}, on: null, _rv: [0, 0, 0] });
    if (this.rig) { this.rig.x = this.x; this.rig.y = this.y; this.rig.z = this.z; this.rig.facing = this.facing; }
  }
  /** put it at (x, y) on the floor there (or at height z), standing still */
  place(x, y, z) {
    const w = this.world; z = z ?? w.floorAt(x, y);
    Object.assign(this, { x, y, z, vx: 0, vy: 0, vz: 0, fell: false });
    if (this.body) { this.body.setTranslation({ x, y, z: z + this.foot + (this.kind === 'hero' ? .4 : 0) }, true); if (this.kind === 'mob') this.body.setLinvel({ x: 0, y: 0, z: 0 }, true); }
    this._rv[0] = this._rv[1] = this._rv[2] = 0;
    return this;
  }
  /** leave the ground at v units a second upward (a hero only from the ground: check grounded first if it matters) */
  jump(v) { this.vz = v; this.grounded = false; return this; }
  /** add a push of velocity (knockback; vz > 0 throws it up) */
  push(vx, vy, vz = 0) { this.vx += vx; this.vy += vy; if (vz) this.vz = Math.max(this.vz, vz); return this; }
  /** false: it stops blocking heroes and mobs (a body that has fallen): it still rests on the level, props and platforms */
  setSolid(on) {
    this.solid = !!on; if (!this.col) return this;
    this.col.setCollisionGroups(on ? (this.kind === 'hero' ? GROUPS.hero : this.fly ? GROUPS.flyer : GROUPS.mob) : GROUPS.down);
    if (!on && this.kind === 'mob') { this.col.setFriction(.9); this.col.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Average); }
    return this;
  }
  /** a new half for its capsule (its straight part), the feet kept where they are: a crouch, a slide, standing up again
   *  (check the room above first: world.ray up from its head) */
  resize(half) {
    if (half === this.half || !this.col || !this.half) return this;
    const d = half - this.half; this.half = half; this.foot = half + this.r; this.col.setHalfHeight(half);
    const p = this.body.translation(); this.body.setTranslation({ x: p.x, y: p.y, z: p.z + d }, true);
    if (this.kind === 'hero') this.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z + d });
    this.world.pw.propagateModifiedBodyPositionsToColliders();
    return this;
  }
  /** take it out of the world */
  remove() { this.world.remove(this); }
}

/* =============================================================================
 * 8b. VEHICLES AND FLYERS  world.vehicle(o): a kart, a car or a hovercraft, a ball that Rapier rolls (walls, bumps,
 *     ramps, jumps, falls) steered by the drive module's arcade handling (E.Car's: speed along the heading, a slide that
 *     grip takes away, a kart's hop into a drift that charges a boost, the ground's surface), so E.Race drives it as it
 *     drives an E.Car. world.flyer(o): a ship's arcade flight (yaw, pitch, a bank, barrel rolls and loops, boost and
 *     brake), free within bounds or on rails along a path, worked out in the steps
 * ============================================================================= */
const VEHICLES = {
  kart: { top: 300, accel: 260, brake: 420, reverse: 90, turn: 2.6, grip: 9, drift: 3.2, drag: .5, hop: 95, kart: true, r: 6.5, mass: 1, seat: 4 },
  car: { top: 420, accel: 300, brake: 520, reverse: 110, turn: 2.1, grip: 11, drift: 2.6, drag: .35, hop: 0, r: 7.5, mass: 1.6, seat: 5 },
  hover: { top: 380, accel: 240, brake: 260, reverse: 100, turn: 2.3, grip: 2.4, drift: 1.2, drag: .25, hop: 0, r: 7, mass: .8, seat: 6, float: 7 }
};
/** the ground's surfaces as a vehicle feels them (a vehicle's o.surfaces adds or changes them) */
const SURFACES = { road: {}, grass: { top: .55, grip: .9 }, dirt: { top: .7, grip: .8 }, sand: { top: .45, grip: .6 }, snow: { top: .6, grip: .5 }, ice: { grip: .15 }, water: { top: .35, grip: .5 }, lava: { top: .3 }, boost: { boost: .8 } };
class Vehicle extends Actor {
  /** made by world.vehicle(o): see the manual */
  constructor(world, o) {
    super(world, 'mob', Object.assign({}, o, { half: 0 }));
    /** o: its handling (the kind's, with yours over it: top, accel, brake, reverse, turn, grip, drift, drag, hop, kart,
     *  seat, float, surfaces, ground, color); angle: its heading; speed: along it; slide: across it; drifting (-1, 0, 1);
     *  charge (a kart's drift: 1 blue, 2 orange); boostT, spinT (seconds); surface: the ground's tag under it; offroad;
     *  onGround; airT; bumped (it hit something this step); tilt: [pitch, roll] it is drawn at (the ground's slope) */
    this.o = o; this.isVehicle = true; this.vehicle = o.kind; this.angle = o.angle ?? o.facing ?? 0; this.facing = this.angle;
    Object.assign(this, { speed: 0, slide: 0, drifting: 0, charge: 0, boostT: 0, spinT: 0, surface: null, offroad: false, onGround: false, airT: 0, bumped: false, tilt: [0, 0], steer: 0, _boostK: 0, _hopDir: 0, _held: false, _want: 0 });
    this.o.surfaces = Object.assign({}, SURFACES, o.surfaces);
  }
  /** a boost: seconds of it, power (.4: its top speed up by that share) */
  boost(sec = .8, power = .4) { this._boostK = this.boostT > 0 ? Math.max(this._boostK, power) : power; this.boostT = Math.max(this.boostT, sec); return this; }
  /** a spin-out (a shot, a hazard): seconds without control, most of its speed lost */
  spinOut(sec = 1) { if (this.spinT > 0) return this; this.spinT = sec; this.vx *= .3; this.vy *= .3; this.drifting = 0; this.charge = 0; return this; }
  /** one step's driving (before world.step): an intent { steer: -1..1, gas, brake (0..1), drift (held), top (a factor) }
   *  or an input (its move()'s x steers; gas, brake, drift: actions). E.Race calls it as it does an E.Car's (map: not
   *  read). Sets the velocity world.step gives Rapier */
  update(dt, map, c = {}) {
    const o = this.o, inp = typeof c.move === 'function';
    let steer = inp ? c.move()[0] : c.steer || 0, gas = inp ? (c.down('gas') || o.auto ? 1 : 0) : c.gas || 0, brake = inp ? (c.down('brake') ? 1 : 0) : c.brake || 0;
    const drift = inp ? c.down('drift') : !!c.drift, hop = inp ? c.pressed('drift') : drift && !this._held; this._held = drift;
    const S = o.surfaces[this.surface] || {}, air = !this.onGround;
    if (S.boost && !air) this.boost(S.boost);
    if (this.spinT > 0) { this.spinT -= dt; this.angle += 11 * dt; steer = 0; gas = 0; brake = .5; }
    if (this.boostT > 0) { this.boostT -= dt; gas = 1; }
    if (o.kart) {   // a hop on the drift button; landing still steering, it drifts that way while held, charging a boost
      if (hop && !air && this.spinT <= 0) { this.vz = o.hop; this._hopDir = Math.sign(steer); }
      if (!air && !this.drifting && drift && this._hopDir && this.speed > o.top * .4) this.drifting = this._hopDir;
      if (this.drifting) {
        if (!drift || this.speed < o.top * .2) { if (this.charge >= 1) this.boost(this.charge >= 2 ? 1 : .55, .35); this.drifting = 0; this.charge = 0; this._hopDir = 0; }
        else this.charge += dt * (steer * this.drifting > 0 ? 1.5 : .8);
      }
      if (!drift) this._hopDir = 0;
    } else this.drifting = drift && Math.abs(this.speed) > o.top * .3 ? Math.sign(steer) || this.drifting : 0;   // a car's handbrake
    const k = clamp(Math.abs(this.speed) / (o.top * .25), 0, 1) * Math.sign(this.speed || 1), turn = this.drifting ? this.drifting * .6 + steer * .4 : steer;
    this.angle += turn * o.turn * k * dt * (air ? .5 : 1); this.steer = steer;
    const fx = Math.cos(this.angle), fy = Math.sin(this.angle);
    let v = this.vx * fx + this.vy * fy, s = this.vy * fx - this.vx * fy;
    const top = o.top * (S.top || 1) * (c.top || 1) * (this.boostT > 0 ? 1 + this._boostK : 1);
    if (gas > 0 && v < top) v = Math.min(top, v + o.accel * gas * (this.boostT > 0 ? 2.5 : 1) * dt);
    else if (v > top && !air) v = Math.max(top, v - o.accel * 1.6 * dt);
    if (brake > 0) v = v > 1 ? Math.max(0, v - o.brake * brake * dt) : Math.max(-o.reverse, v - o.accel * .6 * brake * dt);
    if (!gas && !brake) v *= Math.exp(-o.drag * dt);
    if (!air || o.float) s *= Math.exp(-(this.drifting ? o.drift : o.grip) * (S.grip || 1) * dt);
    this.vx = fx * v - fy * s; this.vy = fy * v + fx * s; this._want = Math.hypot(this.vx, this.vy);
    if (o.float) this.vz = this._gz !== null && this._gz !== undefined ? (this._gz + o.float - this.z) * 6 : this.vz - this.world.gravity * dt;   // (a hovercraft rides its cushion; past an edge it falls)
    this.facing = this.angle; this.anim = { vx: 0, vy: 0, down: .4, hurt: this.spinT > 0 };   // (the driver, seated)
    return this;
  }
}
/** a vehicle's ground after a step: a ray under it (tracks, the level, the terrain): on the ground or not, its slope (the
 *  tilt it is drawn at), the surface's tag, a bump (it lost speed it wanted) */
function vehicleGround(w, a, dt) {
  const o = a.o, h = w.ray(a.x, a.y, a.z + a.r, 0, 0, -1, a.r + (o.float ? o.float + 10 : 3.5), { level: true });
  a.onGround = a.grounded = !!h; a._gz = h ? h.z : null; a.airT = h ? 0 : a.airT + dt;
  const fx = Math.cos(a.angle), fy = Math.sin(a.angle), n = h ? [h.nx, h.ny, h.nz] : [0, 0, 1];
  const tp = h ? Math.atan2(-(n[0] * fx + n[1] * fy), n[2]) : clamp(a.vz / 400, -.5, .5), tr = h ? Math.atan2(-fy * n[0] + fx * n[1], n[2]) : 0, k = Math.min(1, dt * 12);
  a.tilt[0] += (tp - a.tilt[0]) * k; a.tilt[1] += (tr + clamp(a.steer * a.speed / a.o.top, -1, 1) * .08 - a.tilt[1]) * k;
  a.surface = o.ground ? o.ground(a.x, a.y) : w._surfaceAt(a.x, a.y, a.z);
  a.offroad = ((o.surfaces[a.surface] || {}).top || 1) < 1;
  a.speed = a.vx * fx + a.vy * fy; a.slide = a.vy * fx - a.vx * fy;
  a.bumped = a._want - Math.hypot(a.vx, a.vy) > Math.max(30, a._want * .2);
}
/** a vehicle drawn by code with the pen, on its tilt: a kart (a low chassis, fat wheels, a seat, pipes), a car (a body
 *  and a cabin) or a hovercraft (a hull on pods over a glowing cushion); the front wheels turn with its steering */
function vehicleParts(pen, a, t) {
  const o = a.o, c = o.color || '#d83a2a', dk = E.shade(c, -.32), lt = E.shade(c, .25), tyre = '#1c1a20', st = (a.steer || 0) * .45, [p, r] = a.tilt;
  pen.at(a.x, a.y, a.z, a.rig ? a.rig.facing : a.facing, 1, p, r); pen.flash = a.flash > 0;   // (its facing as drawn: part way between steps)
  const wheel = (x, y, R, w, turn) => { const c2 = Math.cos(turn), s2 = Math.sin(turn); pen.tube(x - s2 * w, y - c2 * w, R, x + s2 * w, y + c2 * w, R, R, tyre).tube(x - s2 * (w + .2), y - c2 * (w + .2), R, x + s2 * (w + .2), y + c2 * (w + .2), R, R * .45, '#9a98a8'); };
  if (a.vehicle === 'kart') {
    pen.box(0, 0, 3.2, 16, 9, 2.4, c).box(7.6, 0, 3.6, 2.6, 11, 2.2, dk).box(-6.8, 0, 4.6, 3.6, 8, 4, '#3a3a44').box(-2.2, 0, 5.6, 4, 6, 1.4, '#2a2a30');
    pen.tube(-8.6, -2, 5.6, -10.4, -2.6, 7, .8, '#8a8a94').tube(-8.6, 2, 5.6, -10.4, 2.6, 7, .8, '#8a8a94').tube(3.4, 0, 5, 5.4, 0, 8, .5, '#3a3a44').tube(5.4, -1.6, 8, 5.4, 1.6, 8, .5, '#3a3a44');
    wheel(5.6, -5.4, 2.8, 1.6, st); wheel(5.6, 5.4, 2.8, 1.6, st); wheel(-5.6, -5.8, 3.2, 2, 0); wheel(-5.6, 5.8, 3.2, 2, 0);
  } else if (a.vehicle === 'car') {
    pen.box(0, 0, 5.4, 26, 13, 5.4, c).box(12.4, 0, 4.4, 2, 13.4, 3, dk).box(-2, 0, 10, 12, 11.4, 4.6, lt).box(3.4, 0, 10, 1.4, 10.6, 3.8, '#2a3a4a').box(-7.6, 0, 10, 1.4, 10.6, 3.8, '#2a3a4a');
    pen.ball(13.2, -4.6, 6, .9, 1.4, 1, '#fff6d0').ball(13.2, 4.6, 6, .9, 1.4, 1, '#fff6d0').ball(-13, -4.6, 6, .6, 1.4, 1, '#ff3a2a').ball(-13, 4.6, 6, .6, 1.4, 1, '#ff3a2a');
    wheel(8, -6.6, 3.4, 1.4, st); wheel(8, 6.6, 3.4, 1.4, st); wheel(-8, -6.6, 3.4, 1.4, 0); wheel(-8, 6.6, 3.4, 1.4, 0);
  } else {
    const b = Math.sin(t * 7 + a.x * .01) * .6;
    pen.ball(0, 0, 4 + b, 12, 7, 3, c).box(-8, 0, 5 + b, 5, 12, 2.4, dk).ball(-9, -6.8, 4.6 + b, 4, 2.2, 2, lt).ball(-9, 6.8, 4.6 + b, 4, 2.2, 2, lt).box(2, 0, 7 + b, 6, 6, 2, '#2a3a4a');
    pen.glow(-11, -6.8, 4.6 + b, 1.4, '#7af0ff').glow(-11, 6.8, 4.6 + b, 1.4, '#7af0ff').halo(0, 0, 1, 8, [.1, .3, .4]);
  }
  pen.at(); pen.flash = false;
}
class Flyer {
  /** made by world.flyer(o): see the manual */
  constructor(world, o) {
    /** o: { speed (300), min, max (the brake's and boost's speeds), turn (1.5: yaw radians a second), climb (1.1: pitch),
     *  bank (.8: the roll into a turn), invert (up dives), low (14: its least height over the ground), bounds: [x0, y0,
     *  z0, x1, y1, z1] (free flight turns back inside them), rail: { path, speed, w, h, slide } (it rides the path, moved
     *  about a window w x h across it) }; x, y, z, yaw, pitch, roll: where it is and its turn; speed; rolling (seconds
     *  of a barrel roll left: turn shots aside with it), looping; frame: the rail's point ({ x, y, z, yaw, pitch }: the
     *  camera follows it), d: how far along the rail; hitGround: it touched the ground this step; data: yours */
    this.o = Object.assign({ speed: 300, min: 170, max: 560, turn: 1.5, climb: 1.1, bank: .8, low: 14, invert: false }, o);
    Object.assign(this, { world, x: o.x || 0, y: o.y || 0, z: o.z ?? 120, yaw: o.yaw || 0, pitch: 0, roll: 0, speed: this.o.speed, rolling: 0, rollDir: 1, looping: 0, frame: null, d: 0, ox: 0, oy: 0, vox: 0, voy: 0, hitGround: false, alive: true, data: o.data || {}, _bank: 0, _ip: null });
    if (this.o.rail) { this.d = this.o.rail.start || 0; this._frame(); this.x = this.frame.x; this.y = this.frame.y; this.z = this.frame.z; this.yaw = this.frame.yaw; }
  }
  _frame() {
    const R = this.o.rail, P = R.path, a = P.at(this.d), b = P.at(this.d + 8);
    this.frame = { x: a.x, y: a.y, z: a.z, yaw: a.angle, pitch: Math.atan2(b.z - a.z, 8), angle: a.angle };
  }
  /** one step (before world.step): an intent { steer: [x, y] (the stick: x right, y down), boost, brake, roll (-1 | 1:
   *  a barrel roll that way), loop (a loop: free flight) } */
  update(dt, c = {}) {
    (this._ip || (this._ip = [0, 0, 0, 0, 0, 0])).splice(0, 6, this.x, this.y, this.z, this.yaw, this.pitch, this.roll);   // (where it was: a frame between steps draws it part way)
    const o = this.o, st = c.steer || [0, 0], sx = clamp(st[0], -1, 1), sy = clamp(st[1], -1, 1) * (o.invert ? -1 : 1);
    this.speed += ((c.boost ? o.max : c.brake ? o.min : o.speed) - this.speed) * Math.min(1, dt * 3);
    if (c.roll && this.rolling <= 0) { this.rolling = .6; this.rollDir = Math.sign(c.roll) || 1; }
    if (this.rolling > 0) this.rolling = Math.max(0, this.rolling - dt);
    this._bank += (sx * o.bank - this._bank) * Math.min(1, dt * 6);
    this.roll = this._bank + (this.rolling > 0 ? (1 - this.rolling / .6) * TAU * 2 * this.rollDir : 0);
    if (o.rail) {   // the rail's point goes on; the ship moves about a window across it
      const R = o.rail, k = this.speed / o.speed; this.d += (R.speed || 300) * k * dt; this._frame();
      const S = R.slide || 220, a = Math.min(1, dt * 7); this.vox += (sx * S - this.vox) * a; this.voy += (-sy * S - this.voy) * a;
      const W = (R.w || 260) / 2, Hh = (R.h || 150) / 2; this.ox = clamp(this.ox + this.vox * dt, -W, W); this.oy = clamp(this.oy + this.voy * dt, -Hh, Hh);
      const F = this.frame, rx = -Math.sin(F.yaw), ry = Math.cos(F.yaw);
      this.x = F.x + rx * this.ox; this.y = F.y + ry * this.ox; this.z = F.z + this.oy;
      this.yaw = F.yaw + this.vox / S * .35; this.pitch = F.pitch + this.voy / S * .3;
    } else {
      if (c.loop && this.looping <= 0) this.looping = 1.5;
      if (this.looping > 0) { const was = this.looping; this.looping = Math.max(0, this.looping - dt); this.pitch += TAU * (was - this.looping) / 1.5; if (!this.looping) this.pitch = 0; }
      else {
        this.yaw += sx * o.turn * dt; this.pitch += (-sy * .9 - this.pitch) * Math.min(1, dt * o.climb * 2);
        const B = o.bounds; if (B && (this.x < B[0] || this.x > B[3] || this.y < B[1] || this.y > B[4])) this.yaw = E.approachAng(this.yaw, Math.atan2((B[1] + B[4]) / 2 - this.y, (B[0] + B[3]) / 2 - this.x), o.turn * 1.4 * dt);   // (outside its bounds: it turns back in)
        if (B) this.pitch = clamp(this.pitch, this.z < B[2] ? .2 : -.9, this.z > B[5] ? -.05 : .9);   // (and between its floor and ceiling)
      }
      const cp = Math.cos(this.pitch); this.x += Math.cos(this.yaw) * cp * this.speed * dt; this.y += Math.sin(this.yaw) * cp * this.speed * dt; this.z += Math.sin(this.pitch) * this.speed * dt;
    }
    const g = this.world.topH(this.x, this.y) + o.low; this.hitGround = this.z < g;
    if (this.hitGround) { this.z = g; if (o.rail) this.oy = Math.max(this.oy, g - this.frame.z); else this.pitch = Math.max(this.pitch, .25); }
    return this;
  }
  /** the nearest of a list ({ x, y, z } each, alive unless false) inside a cone round its nose (half-angle cone, .25
   *  radians) within range (900) and in sight (a clear line): what a charged shot locks on */
  seek(list, o = {}) {
    const cone = o.cone ?? .25, range = o.range ?? 900, cp = Math.cos(this.pitch), f = [Math.cos(this.yaw) * cp, Math.sin(this.yaw) * cp, Math.sin(this.pitch)];
    let best = null, bd = 1e9;
    for (const t of list) {
      if (!t || t.alive === false) continue; const dx = t.x - this.x, dy = t.y - this.y, dz = (t.z || 0) - this.z, d = Math.hypot(dx, dy, dz);
      if (d > range || d < 1) continue; const a = Math.acos(clamp((dx * f[0] + dy * f[1] + dz * f[2]) / d, -1, 1));
      if (a < cone && a * 400 + d < bd && this.world.clear(this.x, this.y, this.z, t.x, t.y, t.z || 0)) { bd = a * 400 + d; best = t; }
    }
    return best;
  }
  /** where to draw it this frame: { x, y, z, yaw, pitch, roll } part way from the step before (game.alpha) */
  at(k = this.world.game.alpha) {
    const w = this._ip, m = w && this.world._stepAt === this.world.game.real ? 1 - clamp(k, 0, 1) : 0;
    if (!m || Math.abs(w[0] - this.x) + Math.abs(w[1] - this.y) > 200) return { x: this.x, y: this.y, z: this.z, yaw: this.yaw, pitch: this.pitch, roll: this.roll };
    return { x: lerp(this.x, w[0], m), y: lerp(this.y, w[1], m), z: lerp(this.z, w[2], m), yaw: this.yaw + E.angDiff(this.yaw, w[3]) * m, pitch: lerp(this.pitch, w[4], m), roll: lerp(this.roll, w[5], m) };
  }
}

/* ---- tracks: a road built along a path (world.track): its surface and walls are colliders, its looks one mesh ---- */
class Track {
  /** made by world.track(o): see the manual */
  constructor(world, o) {
    if (!o.path || typeof o.path.at !== 'function') throw new Error('my-3D2dge 3D: world.track({ path }) needs a path: new E.Path(points, { closed: true, smooth: \'catmull\' }), points [x, y, z]');
    /** o: { path, width (96), bank (.25: radians at the tightest bends), walls (true), wallH (10), kerb (8: the striped
     *  edge), pads ([[d, across], ...]: boost pads), gaps ([[d0, d1, side (-1 left, 1 right, 0 both)], ...]: no wall
     *  there, a shortcut's way off and back on), off (the surface beside it: 'grass'), surface ('road': its own tag, a dirt shortcut's 'dirt'), color, line (null: no middle line), kerbs, wall };
     *  path, length; samples [{ d, x, y, z, angle, bank, rx, ry }] every step (8) units */
    this.world = world; this.o = Object.assign({ width: 96, bank: .25, walls: true, wallH: 10, kerb: 8, step: 8, lift: 1, pads: [], gaps: [], off: null, surface: 'road', color: '#4a4a54', line: '#e8e4d0', kerbs: ['#ece8e0', '#c8302a'], wall: '#b8b8c4' }, o);
    const P = this.path = o.path, L = this.length = P.length, n = Math.max(8, Math.round(L / this.o.step)), S = this.samples = [];
    for (let i = 0; i <= n; i++) {
      const d = L * i / n, p = P.at(d), a = P.at(d - 16), b = P.at(d + 16), k = E.angDiff(a.angle, b.angle) / 32;   // (its bend: radians a unit)
      S.push({ d, x: p.x, y: p.y, z: p.z, angle: p.angle, bank: clamp(k * 140, -1, 1) * this.o.bank, rx: -Math.sin(p.angle), ry: Math.cos(p.angle) });
    }
    // the banking eased in and out over about five samples either way (40 units): banked in a few units, its outer edge
    // rising like a ramp, it threw karts over the wall
    for (let pass = 0; pass < 50; pass++) { const B = S.map(s => s.bank); for (let i = 0; i <= n; i++) S[i].bank = (B[i ? i - 1 : P.closed ? n - 1 : 0] + B[i] * 2 + B[i < n ? i + 1 : P.closed ? 1 : n]) / 4; }
    this._build();
  }
  /** a point across it at sample s: lateral l (units, + right), its height on the bank (banked about its low edge, so the
   *  outside of a bend rises and no part of the road sinks below the path's height) */
  _pt(s, l, up = 0) { const t = Math.tan(s.bank), hw = this.o.width / 2 + this.o.kerb; return [s.x + s.rx * l, s.y + s.ry * l, s.z + hw * Math.abs(t) - l * t + this.o.lift + up]; }
  _build() {
    const w = this.world, o = this.o, S = this.samples, hw = o.width / 2 + o.kerb, pos = [], uv = [], idx = [], cpos = [], cidx = [];
    S.forEach((s, i) => { for (const l of [-hw, hw]) { const p = this._pt(s, l); pos.push(p[0] / U, p[2] / U, p[1] / U); cpos.push(p[0], p[1], p[2]); uv.push(l < 0 ? 0 : 1, s.d / 64); } if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); cidx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });   // (faces up: three's axes, and the engine's)
    // the road's texture: 32 pixels across its width and kerbs, 64 a length of 64 units: asphalt, a dashed middle line, striped kerbs
    const kp = Math.round(o.kerb / (o.width + o.kerb * 2) * 32), A = H(o.color), Ad = H(E.shade(o.color, -.12)), Al = H(E.shade(o.color, .1)), Ln = o.line ? H(o.line) : null, K = o.kerbs.map(H);
    const tex = w._own(bake((x, y) => (x < kp || x >= 32 - kp) ? K[Math.floor(y / 8) & 1] : Ln && (x === 15 || x === 16) && (y % 32) < 16 ? Ln : E.hash2(x, y) < .1 ? Ad : E.hash2(x + 7, y) < .05 ? Al : A, 32, 64));
    const geo = w._own(new THREE.BufferGeometry()); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    this.mesh = new THREE.Mesh(geo, w._own(lambert(tex))); this.mesh.receiveShadow = true; w.scene.add(this.mesh);
    const flags = RAPIER.TriMeshFlags ? RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES : undefined, fixed = () => w.pw.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this._cols = () => {   // (made again with each reset: a fresh physics world)
      w.pw.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(cpos), new Uint32Array(cidx), flags).setFriction(.2).setCollisionGroups(GROUPS.level), fixed());
      if (o.walls) { const body = fixed(); for (const [x, y, z, len, yaw, h] of wb) w.pw.createCollider(RAPIER.ColliderDesc.cuboid(len / 2, 1.5, h).setTranslation(x, y, z).setRotation({ x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) }).setFriction(0).setRestitution(.3).setCollisionGroups(GROUPS.level), body); }
    };
    // the walls: a low barrier along each edge (a box section: its face, its top, its outer face down to the ground under
    // a raised or banked road), striped by the length; without walls, only that outer face (a skirt)
    const wp = [], wi = [], vp = [], vu = [], vi = [], wb = [], wh = o.walls ? o.wallH : 0, th = o.walls ? 3 : 0;   // (wb: each wall's segments as thin boxes, its colliders)
    const L = this.length, gap = (d, side) => o.walls && o.gaps.some(([a, b, sd]) => (!sd || sd === side) && (a <= b ? d >= a && d <= b : d >= a || d <= b));
    for (const side of [-1, 1]) {
      const base = wp.length / 3, vb = vp.length / 3;
      S.forEach((s, i) => {
        const open = i && (gap(s.d % L, side) || gap(S[i - 1].d % L, side));   // (a gap: no wall on this segment)
        const a = this._pt(s, side * hw), b = this._pt(s, side * (hw + th)), up = [a[0], a[1], a[2] + wh], up2 = [b[0], b[1], b[2] + wh];
        b[2] = Math.min(b[2], w.floorAt(b[0], b[1])) - 2;
        wp.push(...a, ...up, ...up2, ...b); for (const q of [a, up, up2, b]) vp.push(q[0] / U, q[2] / U, q[1] / U);
        vu.push(0, s.d / 64, .4, s.d / 64, .6, s.d / 64, 1, s.d / 64);
        if (i && o.walls && !open) {   // (its box: from the ground under it to the wall's top)
          const q = this._pt(S[i - 1], side * (hw + 1.5)), e = this._pt(s, side * (hw + 1.5)), x = (q[0] + e[0]) / 2, y = (q[1] + e[1]) / 2, top = Math.max(q[2], e[2]) + wh + 2, lo = Math.min(q[2], e[2], w.floorAt(x, y)) - 2;
          wb.push([x, y, (top + lo) / 2, Math.hypot(e[0] - q[0], e[1] - q[1]) + .6, Math.atan2(e[1] - q[1], e[0] - q[0]), (top - lo) / 2]);
        }
        if (i && !open) for (const [j, k] of [[0, 1], [1, 2], [2, 3]]) { const p0 = base + (i - 1) * 4, q0 = vb + (i - 1) * 4; const f = side < 0 ? [p0 + j, p0 + 4 + j, p0 + k, p0 + k, p0 + 4 + j, p0 + 4 + k] : [p0 + j, p0 + k, p0 + 4 + j, p0 + k, p0 + 4 + k, p0 + 4 + j]; wi.push(...f); vi.push(...f.map(x => x - base + vb)); }
      });
    }
    if (vp.length) {
      const W1 = H(o.wall), W2 = H(E.shade(o.wall, -.3)), wt = w._own(bake((x, y) => (y >> 3) & 1 ? W1 : W2, 4, 16));
      const g2 = w._own(new THREE.BufferGeometry()); g2.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(vu, 2)); g2.setIndex(vi); g2.computeVertexNormals();
      this.walls = new THREE.Mesh(g2, w._own(lambert(wt))); this.walls.material.side = THREE.DoubleSide; this.walls.castShadow = this.walls.receiveShadow = true; w.scene.add(this.walls);
    }
    this._cols();
  }
  /** draw its boost pads with the pen: chevrons that pulse along the road */
  _pads(pen, t) {
    for (const [d, l] of this.o.pads) {
      const s = this._s(d), p = this._pt(s, l || 0, .5), c = (Math.floor(t * 6) & 1) ? '#ffb43a' : '#ff7a2a';
      pen.at(p[0], p[1], p[2], s.angle, 1, 0, -s.bank);
      for (let k = 0; k < 3; k++) pen.bar(-9 + k * 7, -7, 0, -3 + k * 7, 0, 0, 2, .4, c).bar(-3 + k * 7, 0, 0, -9 + k * 7, 7, 0, 2, .4, c);
    }
    pen.at();
  }
  /** the sample nearest d along it */
  _s(d) { const L = this.length, S = this.samples, n = S.length - 1; d = this.path.closed ? ((d % L) + L) % L : clamp(d, 0, L); return S[Math.min(n, Math.round(d / L * n))]; }
  /** the point d along it: { x, y, z, angle, bank, d, rx, ry (its right) } */
  at(d) { const s = this._s(d), p = this.path.at(d); return { x: p.x, y: p.y, z: p.z, angle: p.angle, bank: s.bank, d: p.d, rx: s.rx, ry: s.ry }; }
  /** where (x, y) is across it: { d (along), across (units, + right), z (the road's height there) } */
  where(x, y, z) {
    const d = this.path.nearest(x, y, z), s = this._s(d), p = this.path.at(d), l = (x - p.x) * s.rx + (y - p.y) * s.ry;
    return { d, across: l, z: this._pt(s, l)[2] - s.z + p.z };
  }
  /** the surface at (x, y) (and height z): o.surface ('road') on it, 'boost' on a pad, o.off beside it (within three
   *  widths), else null (the ground's own) */
  surface(x, y, z) {
    const o = this.o, q = this.where(x, y, z); if (z !== undefined && Math.abs(z - q.z) > 24) return null;
    if (Math.abs(q.across) > o.width / 2 + o.kerb) return Math.abs(q.across) < o.width * 3 ? o.off : null;
    const L = this.length; for (const [d, l] of o.pads) if (Math.abs(((d - q.d) % L + L * 1.5) % L - L / 2) < 18 && Math.abs(q.across - (l || 0)) < 16) return 'boost';
    return o.surface;
  }
}

/* =============================================================================
 * 9. THE WORLD  new E.World3D(game, o) (after await E.World3D.init(game)): a level, its physics, its actors, props,
 *    platforms and things, its lights, sky and camera. world.step(dt) in the game's update, world.draw(r) in its draw
 * ============================================================================= */
const RES = ['pixels', 'balanced', 'full'];
class World3D {
  constructor(game, o = {}) {
    if (!PAGE.ready) throw new Error('my-3D2dge 3D: await E.World3D.init(game) (a boot step) before new E.World3D(game, ...)');
    if (!o.terrain && (!o.level || !o.level.rows)) throw new Error('my-3D2dge 3D: new E.World3D(game, { level: { rows: [...], legend: {...} } }) needs a level written as text (or { terrain: { height: (x, y) => z, ... } }: an open world)');
    /** game: the 2D engine's game that runs it; scene: its three.js scene (add your own meshes: E.THREE); o: its options */
    this.game = game; this.o = o; this.scene = new THREE.Scene(); this._owned = []; this._mats = new Map(); this._objMats = new Set();
    const st = game.settings || {};
    /** look: 'card' (each rig drawn by the 2D engine on a card, exactly as in 2D) | 'puppet' (3D parts on its joints);
     *  res: the picture's resolution: 'pixels' (the game's own pixels: PS1 chunky), 'balanced' (half the screen's) or
     *  'full'; outlines: an outline round characters and things; gravity: units a second squared (480: the 2D slimes'
     *  cartoon gravity) */
    this.look = o.look || st.look3d || 'card'; this.res = RES.includes(o.res) ? o.res : RES.includes(st.picture3d) ? st.picture3d : 'pixels';
    this.outlines = o.outlines !== false; this.gravity = o.gravity ?? 480; this.shadows = o.shadows ?? (st.shadows3d !== false);
    /** filter: a look over the whole picture (section 10b): { look: 'clean' | 'cel' | 'pixel', apply, bloom, fxaa, ... } */
    this.filter = Object.assign({}, FX_DEFAULT, st.filter3d && st.filter3d !== 'clean' ? { look: st.filter3d } : null, o.filter);
    /** the level: its size (width, depth in units; mw, mh in tiles), bottom (where a fall is lost), marks; terrain: the
     *  open world's ground (section 3b) when the world was made with one, else null */
    this._owners = new Map(); this.blocks = [];
    const L = this.level = o.terrain ? new Terrain(this, o.terrain) : new Level(this, o.level);
    this.terrain = o.terrain ? L : null;
    Object.assign(this, { width: L.width, depth: L.depth, mw: L.mw, mh: L.mh, bottom: L.bottom, marks: L.marks, torches: L.torches });
    /** actors, props, platforms, things: what is in the world now (read them; add and remove with the methods below) */
    this.actors = []; this.props = []; this.platforms = []; this.things = []; this.shapes = [];
    /** tracks (world.track), flyers (world.flyer): yours to read */
    this.tracks = []; this.flyers = [];
    this.B = makeBatches(this); this.capes = makeCapes(this); this.atlas = makeAtlas(this);
    /** pen: draw your own 3D shapes for this frame (in draw, before world.draw(r)): world.pen.at(x, y, z, yaw).box(...) */
    this.pen = new Pen(this); this.pen.B = this.B;
    this.part = {
      add: new Batch(this.scene, new THREE.CircleGeometry(1, 6), new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), { order: 4, cap: 2048 }),
      solid: new Batch(this.scene, new THREE.CircleGeometry(1, 6), this._obj(new THREE.MeshBasicNodeMaterial({ color: '#ffffff' })), { cap: 2048 }),
      bit: new Batch(this.scene, new THREE.PlaneGeometry(2, 2), this._obj(new THREE.MeshBasicNodeMaterial({ color: '#ffffff' })), { cap: 1024 })
    };
    this._arcs = floorPool(this, 12); this._rings = floorPool(this, 24); this._ribbons = ribbons(this);
    this._propMesh = propMeshes(this); this._shapeKit = shapeKit(this);
    L.meshes(this);
    this._lights(o);
    this._sky(o);
    /** camera: see section 7 */
    this.camera = new Camera3D(this, Object.assign({ far: this.terrain ? this.terrain.far * 1.1 : 9600 }, o.camera));
    /** cameras: the world's cameras, [0] its camera; world.addCamera(o) adds one (a split screen's viewport i draws
     *  through cameras[i]) */
    this.cameras = [this.camera];
    /** overlay: a scene of your own drawn over the world after it (its depth cleared first), from its own camera at the
     *  origin: a first-person view model (the arms and the gun) that never sinks into a wall. { scene, camera (fov: set
     *  it), pen (the world's pen, in this scene: engine units round the eye, x ahead, y right, z up), on }; lit by the
     *  world's sun and sky as the world's camera sees them */
    if (o.overlay) this._makeOverlay(o.overlay);
    /** onDraw(world, r): called as each frame starts drawing, before the camera is placed: the game's own 3D drawing
     *  (world.pen, overlay.pen, glows; a last touch to camera.pose) for every frame, whichever scene draws the world */
    this.onDraw = o.onDraw || null;
    /** time: seconds stepped; n: steps; stats: the last frame's numbers (draw calls, triangles, actors drawn, physics
     *  and draw milliseconds) */
    this.time = 0; this.n = 0; this.stats = { calls: 0, tris: 0, drawn: 0, culled: 0, physicsMs: 0, drawMs: 0, bodies: 0, frames: 0 };
    this._queue = { arcs: [], glows: [] }; this._warm = false; this._seen = new Set();
    PAGE.worlds.add(this);
    this.reset();
  }
  _own(x) { this._owned.push(x); return x; }
  _mat(key, make) { let m = this._mats.get(key); if (!m) { m = this._own(make()); this._mats.set(key, m); } return m; }
  _obj(m) { this._objMats.add(m); return m; }
  /** a fresh physics world: the level's colliders and shapes, nothing else (actors, props, platforms, things and the
   *  shapes you placed are gone: add them again). The same seed and the same inputs from here give the same state (world.hash) */
  reset() {
    if (this.pw) this.pw.free();
    const pw = this.pw = new RAPIER.World({ x: 0, y: 0, z: -this.gravity });
    pw.lengthUnit = U; pw.numSolverIterations = this.o.iterations || 4;
    for (const p of this.platforms) if (p.mesh) this.scene.remove(p.mesh);
    for (const p of this.props) if (p.mesh) this.scene.remove(p.mesh);
    this.actors.length = 0; this.props.length = 0; this.platforms.length = 0; this.things.length = 0; this.blocks.length = 0; this._owners.clear();
    this.level.colliders(pw); for (const t of this.tracks) t._cols(); this.flyers.length = 0;
    // the level's own shapes (a legend's { shape }) stand again; a game's are gone with the rest
    this.shapes.length = 0; this._shapeKit.clear(); for (const [id, x, y, z, sp] of this.level.shapes) this.shape(id, x, y, z, sp);
    this.time = 0; this.n = 0; this.passing = null; if (this.camera) Object.assign(this.camera.unlock(), { focus: null, smooth: null, pose: null, zone: null, cuts: 0, _hold: null, _mv: [0, 0] });   // (the camera starts afresh where the hero is)
    return this;
  }

  /* ---- the level, as the game asks about it ---- */
  /** the ground's height at (x, y) (a floor, a stair, a wall's top; `bottom` over a pit) */
  ground(x, y) { return this.level.ground(x, y); }
  /** the surface under a body at height z at (x, y): the highest ground or platform top no more than 4 units above it */
  floorAt(x, y, z) { return this.level.floorAt(x, y, z); }
  /** the top of whatever stands at (x, y) (shots stop below it) */
  topH(x, y) { return this.level.topH(x, y); }
  /** the character at tile (cx, cy), its legend entry, whether nobody walks there */
  tile(cx, cy) { return (this.level.rows[cy] || '')[cx] ?? ''; }
  spec(cx, cy) { return this.level.spec(cx, cy); }
  solidTile(cx, cy) { return this.level.solidTile(cx, cy); }
  /** a new flow field over the walkable grid: flow.to(x, y) aims it, flow.dir(x, y, out) is the way there from (x, y) */
  flow() { return this.terrain ? new TerrainFlow() : new Flow(this.level); }
  /** a random walkable spot ([x, y]): rnd (E.rng) picks it, at least minDist from (fx, fy) if given */
  randomFloor(rnd, minDist = 0, fx = 0, fy = 0) {
    const L = this.level;
    if (this.terrain) { for (let k = 0; k < 60; k++) { const x = rnd() * L.width, y = rnd() * L.depth; if (!minDist || Math.hypot(x - fx, y - fy) >= minDist) return [x, y]; } return [L.width / 2, L.depth / 2]; }
    for (let k = 0; k < 60; k++) {
      const cx = (rnd() * L.mw) | 0, cy = (rnd() * L.mh) | 0, i = cy * L.mw + cx;
      if (!L.pass[i] || L.kind[i] === STAIRS) continue;
      const x = (cx + .2 + rnd() * .6) * T, y = (cy + .2 + rnd() * .6) * T;
      if (minDist && Math.hypot(x - fx, y - fy) < minDist) continue;
      return [x, y];
    }
    return [L.width / 2, L.depth / 2];
  }
  /** a clear straight line from one point to another through the level and platforms (engine units)? */
  clear(x0, y0, z0, x1, y1, z1) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz); if (L < 1e-6) return true;
    const hit = this.pw.castRay(new RAPIER.Ray({ x: x0, y: y0, z: z0 }, { x: dx / L, y: dy / L, z: dz / L }), L, true, undefined, LEVEL_ONLY);
    return !hit && !(this.terrain && this.terrain.rayDist(x0, y0, z0, dx / L, dy / L, dz / L, L) !== null);
  }
  /** the first thing a ray from (x, y, z) along (dx, dy, dz) meets within len units: { x, y, z (the point), nx, ny, nz
   *  (the surface's normal), dist, actor (a hero or mob hit, or null), prop (a crate, barrel, box or block, or null),
   *  ground (true: the level or the terrain) } or null. o: { skip: an actor (or several) it passes through (the shooter),
   *  level: true (only the level and platforms: a sight line), down: true (bodies laid down count) } */
  ray(x, y, z, dx, dy, dz, len, o = {}) {
    const l = Math.hypot(dx, dy, dz); if (l < 1e-9 || !(len > 0)) return null; dx /= l; dy /= l; dz /= l;
    const skip = o.skip ? (Array.isArray(o.skip) ? o.skip : [o.skip]) : [], skipCol = skip.map(a => a && a.col).filter(Boolean);
    const groups = o.level ? LEVEL_ONLY : ig(0xffff, 1 | 2 | 4 | 8 | 16 | 64 | (o.down ? 32 : 0));
    const pred = skipCol.length > 1 ? c => !skipCol.includes(c) : undefined;
    const h = this.pw.castRayAndGetNormal(new RAPIER.Ray({ x, y, z }, { x: dx, y: dy, z: dz }), len, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, groups, skipCol.length === 1 ? skipCol[0] : undefined, undefined, pred);
    let t = h ? h.timeOfImpact : null, owner = h ? this._owners.get(h.collider.handle) : null, n = h ? [h.normal.x, h.normal.y, h.normal.z] : null;
    if (this.terrain) {   // the ground beyond the colliders made so far (and under them: the same triangles)
      const tt = this.terrain.rayDist(x, y, z, dx, dy, dz, t === null ? len : t);
      if (tt !== null && (t === null || tt < t - .01)) { t = tt; owner = this.terrain; n = this.terrain.normal(x + dx * tt, y + dy * tt, [0, 0, 1]); }
    }
    if (t === null) return null;
    const isActor = owner instanceof Actor;
    return { x: x + dx * t, y: y + dy * t, z: z + dz * t, nx: n[0], ny: n[1], nz: n[2], dist: t, actor: isActor ? owner : null, prop: owner && !isActor && owner !== this.terrain ? owner : null, ground: !owner || owner === this.terrain };
  }
  /** an invisible fixed collider (a tree's trunk, a building's wall drawn your own way): { x, y, z (its base), w, d, h,
   *  yaw } a box, or { x, y, z, r, h } a standing cylinder; it is in world.blocks until world.remove(it) or a reset */
  block(o) {
    const h = o.h || 16, z = (o.z ?? this.floorAt(o.x, o.y)) + h / 2, yaw = o.yaw || 0;
    const body = this.pw.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(o.x, o.y, z).setRotation(o.r ? Z_UP : { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) }));
    const desc = o.r ? RAPIER.ColliderDesc.cylinder(h / 2, o.r) : RAPIER.ColliderDesc.cuboid((o.w || 16) / 2, (o.d || 16) / 2, h / 2);
    const col = this.pw.createCollider(desc.setFriction(o.friction ?? .6).setCollisionGroups(GROUPS.level), body);
    const b = { isBlock: true, kind: 'block', x: o.x, y: o.y, z: z - h / 2, w: o.w || o.r * 2, d: o.d || o.r * 2, h, yaw, body, col, data: o.data || {} };
    this._owners.set(col.handle, b); this.blocks.push(b); return b;
  }

  /* ---- actors ---- */
  /** a hero: { x, y (where it starts; on the floor there), rig, r (4.5), half (9), facing, trail, look, fly } */
  hero(o = {}) {
    const a = new Actor(this, 'hero', o), pw = this.pw, z = o.z ?? this.floorAt(a.x, a.y);
    a.body = pw.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(a.x, a.y, z + a.foot + .4));
    a.col = pw.createCollider((a.half ? RAPIER.ColliderDesc.capsule(a.half, a.r).setRotation(Z_UP) : RAPIER.ColliderDesc.ball(a.r)).setCollisionGroups(GROUPS.hero), a.body);
    const cc = a.cc = pw.createCharacterController(.3);
    cc.setUp({ x: 0, y: 0, z: 1 }); cc.enableSnapToGround(o.snap ?? 4); cc.enableAutostep(o.step ?? 4, 2, false); cc.setMaxSlopeClimbAngle((o.slope ?? 50) * DEG); cc.setSlideEnabled(true);
    cc.setApplyImpulsesToDynamicBodies(true); cc.setCharacterMass(o.mass ?? 2500);
    a.z = z; a.grounded = true; this.actors.push(a); this._owners.set(a.col.handle, a);
    return a;
  }
  /** a mob: { x, y, rig | blob | orb, r, half, mass, fly (no gravity: it holds its own height), facing, look } */
  mob(o = {}) {
    const a = new Actor(this, 'mob', o), pw = this.pw, z = o.z ?? this.floorAt(a.x, a.y) + (a.fly ? 20 : 0);
    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(a.x, a.y, z + a.foot).lockRotations().setCanSleep(true).setLinearDamping(o.damping ?? 0);
    if (a.fly) desc.setGravityScale(0);
    a.body = pw.createRigidBody(desc);
    const shape = a.half ? RAPIER.ColliderDesc.capsule(a.half, a.r).setRotation(Z_UP) : RAPIER.ColliderDesc.ball(a.r);
    a.col = pw.createCollider(shape.setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(0).setDensity(a.mass).setCollisionGroups(a.fly ? GROUPS.flyer : GROUPS.mob), a.body);
    a.z = z; this.actors.push(a); this._owners.set(a.col.handle, a);
    return a;
  }
  /** a vehicle (section 8b): { kind: 'kart' | 'car' | 'hover', x, y, z, angle, rig (its driver, seated), color, the
   *  kind's handling with yours over it (top, accel, brake, reverse, turn, grip, drift, drag, hop, seat, float),
   *  surfaces, ground: (x, y) => tag (else a track's, the level's ground under it) } -> a vehicle (an actor: world.actors) */
  vehicle(o = {}) {
    const K = VEHICLES[o.kind] ? o.kind : 'kart', v = new Vehicle(this, Object.assign({}, VEHICLES[K], o, { kind: K })), pw = this.pw;
    let z = o.z ?? this.floorAt(v.x, v.y); if (o.z === undefined) for (const t of this.tracks) { const q = t.where(v.x, v.y); if (Math.abs(q.across) <= t.o.width / 2 + t.o.kerb) z = Math.max(z, q.z); }   // (on a track: on its road)
    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(v.x, v.y, z + v.r + .2).lockRotations().setCcdEnabled(true).setCanSleep(false);
    if (v.o.float) desc.setGravityScale(0);
    v.z = z; v.body = pw.createRigidBody(desc);
    v.col = pw.createCollider(RAPIER.ColliderDesc.ball(v.r).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(.2).setDensity(v.o.mass).setCollisionGroups(GROUPS.mob), v.body);
    v.sink = -v.o.seat; this.actors.push(v); this._owners.set(v.col.handle, v);
    return v;
  }
  /** a flyer (section 8b): { x, y, z, yaw, speed, min, max, turn, climb, bank, invert, low, bounds | rail: { path, speed,
   *  w, h, slide } } -> a flyer (world.flyers; gone with a reset) */
  flyer(o = {}) { const f = new Flyer(this, o); this.flyers.push(f); return f; }
  /** a track: a road along a path, with its walls (section 8c) */
  track(o) { const t = new Track(this, o); this.tracks.push(t); return t; }
  /** another camera (a split screen's: viewport i draws through world.cameras[i]); o as the world's camera option */
  addCamera(o = {}) { const c = new Camera3D(this, Object.assign({ far: this.camera.far }, o)); this.cameras.push(c); return c; }
  /** the ground's surface tag at (x, y): a track's, else the level's ground under it (a terrain: null) */
  _surfaceAt(x, y, z) {
    for (const t of this.tracks) { const s = t.surface(x, y, z); if (s) return s; }
    if (this.terrain) return null;
    const sp = this.level.spec(Math.floor(x / T), Math.floor(y / T)); return sp ? sp.ground || this.level.def.ground || null : null;
  }
  /** take an actor, prop, platform or thing out of the world */
  remove(x) {
    if (!x) return;
    const from = x instanceof Actor ? this.actors : x.isThing ? this.things : x.isPlatform ? this.platforms : x.isShape ? this.shapes : x.isBlock ? this.blocks : this.props, i = from.indexOf(x);
    if (x.col) this._owners.delete(x.col.handle);
    if (i >= 0) from.splice(i, 1); else if (x.isShape) return;
    if (x.body && this.pw) { try { this.pw.removeRigidBody(x.body); } catch (e) { /* gone with a reset */ } x.body = null; }
    if (x.isShape) this._shapeKit.take(x.kind, x);
    if (x.mesh) { this.scene.remove(x.mesh); x.mesh = null; }
  }
  /** actors of a kind ('hero' | 'mob' | null for all) within r of (x, y) (and of z when given: 24 up or down) */
  near(x, y, r, kind = null, z = null) {
    const out = [];
    for (const a of this.actors) if ((!kind || a.kind === kind) && Math.hypot(a.x - x, a.y - y) < r && (z === null || Math.abs(a.z - z) < 24)) out.push(a);
    return out;
  }

  /* ---- props: crates and barrels are dynamic bodies (swings, bolts and the crowd knock them about); boxes are yours ---- */
  /** a crate (12 units) at (x, y), on the floor there or at height z */
  crate(x, y, z, yaw = 0) { return this._prop('crate', x, y, z ?? this.floorAt(x, y) + 6.1, yaw, RAPIER.ColliderDesc.cuboid(6, 6, 6)); }
  /** a barrel (12 across, 14 tall) */
  barrel(x, y, z, yaw = 0) { return this._prop('barrel', x, y, z ?? this.floorAt(x, y) + 7.1, yaw, RAPIER.ColliderDesc.cylinder(7, 6), true); }
  /** a box: { x, y, z (its base), w, d, h, color, side (a SIDE look), fixed (it never moves), mass } */
  box(o) {
    const w = o.w || 16, d = o.d || 16, hh = o.h || 16, z = (o.z ?? this.floorAt(o.x, o.y)) + hh / 2;
    const p = this._prop('box', o.x, o.y, z, o.yaw || 0, RAPIER.ColliderDesc.cuboid(w / 2, d / 2, hh / 2), false, o.fixed, o.mass);
    const style = o.side || 'block', S = SIDE[style] || SIDE.block, c = sideColors(style, o), m = this._mat('box:' + style + JSON.stringify(c), () => lambert(this._own(bake((x, y) => S.fn(x, y, c), S.w, S.h))));
    p.mesh = new THREE.Mesh(this._own(boxGeo(w, d, hh)), m); p.mesh.castShadow = p.mesh.receiveShadow = true; this.scene.add(p.mesh);
    return p;
  }
  _prop(kind, x, y, z, yaw, shape, upright = false, fixed = false, mass = .5) {
    const half = yaw / 2, rot = upright ? Z_UP : { x: 0, y: 0, z: Math.sin(half), w: Math.cos(half) };
    const body = this.pw.createRigidBody((fixed ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic()).setTranslation(x, y, z).setRotation(rot).setLinearDamping(.3).setAngularDamping(.8));
    const col = this.pw.createCollider(shape.setDensity(mass).setFriction(.7).setRestitution(.05).setCollisionGroups(fixed ? GROUPS.level : GROUPS.prop), body);
    const p = { kind, x, y, z, q: [rot.x, rot.y, rot.z, rot.w], body, col, hit: 0, mesh: null, data: {} };
    this._owners.set(col.handle, p);
    this.props.push(p); return p;
  }
  /** knock a prop: a push of dv units a second away from (fx, fy), and up by up */
  knock(p, fx, fy, dv, up = 0) {
    if (!p.body || p.body.isFixed()) return;
    const dx = p.x - fx, dy = p.y - fy, d = Math.hypot(dx, dy) || 1, m = p.body.mass();
    p.body.applyImpulse({ x: dx / d * dv * m, y: dy / d * dv * m, z: up * m }, true);
    p.body.applyTorqueImpulse({ x: -dy / d * m * 40, y: dx / d * m * 40, z: m * 20 }, true);
    p.hit = 10;
  }

  /* ---- platforms that move: { x, y, z (its top), w, d, h (6), path: [[x, y, z], ...] (its top's points; it goes there
   *      and back, or round with loop: true), speed (units a second), wait (seconds at each end), side, color } ---- */
  platform(o) {
    const w = o.w || 32, d = o.d || 32, hh = o.h || 6, path = (o.path || [[o.x, o.y, o.z]]).map(p => [p[0], p[1], p[2]]);
    const [x, y, z] = path[0], body = this.pw.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z - hh / 2));
    this.pw.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, d / 2, hh / 2).setFriction(1).setCollisionGroups(GROUPS.platform), body);
    let len = 0; const seg = [0]; for (let i = 1; i < path.length; i++) seg.push(len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]));
    if (o.loop) { const a = path[path.length - 1], b = path[0]; seg.push(len += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); path.push(b); }
    const style = o.side || 'planks', S = SIDE[style] || SIDE.block, c = sideColors(style, o);
    const top = this._mat('ptop:' + style + JSON.stringify(c), () => { const tc = Object.assign({}, c, { side: c.hi, hi: H(E.shade(o.color || STYLE_COLORS[style] || '#8f5f37', .3)) }); return lambert(this._own(bake((x2, y2) => S.fn(x2, y2, tc), S.w, S.h))); });
    const mesh = new THREE.Mesh(this._own(sidesThenTops(boxGeo(w, d, hh))), [this._mat('box:' + style + JSON.stringify(c), () => lambert(this._own(bake((x2, y2) => S.fn(x2, y2, c), S.w, S.h)))), top]);
    mesh.castShadow = mesh.receiveShadow = true; this.scene.add(mesh);
    const p = { isPlatform: true, x, y, z, w, d, h: hh, path, seg, len, loop: !!o.loop, speed: o.speed || 30, wait: o.wait ?? .6, s: 0, dir: 1, hold: 0, dx: 0, dy: 0, dz: 0, body, mesh, data: o.data || {} };
    this.platforms.push(p); return p;
  }
  _movePlatform(p, dt) {
    if (p.len > 0) {
      if (p.hold > 0) p.hold -= dt;
      else {
        p.s += p.speed * dt * p.dir;
        if (p.loop) { if (p.s >= p.len) p.s -= p.len; }
        else if (p.s >= p.len) { p.s = p.len; p.dir = -1; p.hold = p.wait; } else if (p.s <= 0) { p.s = 0; p.dir = 1; p.hold = p.wait; }
      }
    }
    let i = 1; while (i < p.seg.length - 1 && p.seg[i] < p.s) i++;
    const a = p.path[i - 1], b = p.path[i] || a, k = p.seg[i] > p.seg[i - 1] ? (p.s - p.seg[i - 1]) / (p.seg[i] - p.seg[i - 1]) : 0;
    const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k), z = lerp(a[2], b[2], k);
    p.dx = x - p.x; p.dy = y - p.y; p.dz = z - p.z; p.x = x; p.y = y; p.z = z;
  }

  /* ---- things (section 5) ---- */
  /** a thing of a kind (World3D.THINGS) at (x, y) on the floor there or at z: { yaw, spin, bob, size, color, open, on,
   *  solid (true or [w, d, h]: a fixed block where it stands, as a door or chest has), data } */
  thing(kind, x, y, z, o = {}) {
    if (!THINGS[kind]) E.warn('3d:thing:' + kind, 'unknown thing "' + kind + '". Things: ' + Object.keys(THINGS).join(', ') + ' (add one: E.World3D.THINGS.' + kind + ' = (pen, t) => ...)');
    const t = Object.assign({ isThing: true, kind, x, y, z: z ?? this.floorAt(x, y), yaw: 0, spin: 0, bob: 0, size: 1, open: 0, on: false, visible: true, t: 0, r: (THING_R[kind] || 6) * (o.size || 1), data: {}, body: null }, o);
    if (t.solid) this.setSolid(t, true);
    this.things.push(t); return t;
  }
  /** a thing's block on (a door shut, a chest) or off (open): a fixed collider of its solid size where it stands */
  setSolid(t, on) {
    if (t.body) { this.pw.removeRigidBody(t.body); t.body = null; }
    if (on) {
      const s = Array.isArray(t.solid) ? t.solid : t.kind === 'door' ? [(t.w || 32) + 8, 8, (t.h || 40) + 4] : t.kind === 'chest' ? [14, 10, 10] : [t.r * 2, t.r * 2, 12];
      t.body = this.pw.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(t.x, t.y, t.z + s[2] / 2).setRotation({ x: 0, y: 0, z: Math.sin(t.yaw / 2), w: Math.cos(t.yaw / 2) }));
      this.pw.createCollider(RAPIER.ColliderDesc.cuboid(s[0] / 2, s[1] / 2, s[2] / 2).setCollisionGroups(GROUPS.level), t.body);
    }
    t.solid = on ? (t.solid || true) : false;
    return t;
  }
  /** the things (of a kind, or any) an actor touches: within its radius plus theirs, and 20 units up or down */
  touching(a, kind = null) {
    const out = [];
    for (const t of this.things) if (t.visible && (!kind || t.kind === kind) && Math.hypot(t.x - a.x, t.y - a.y) < a.r + t.r && t.z + t.bob + 2 > a.z - 6 && t.z < a.z + 2 * a.foot + 4) out.push(t);
    return out;
  }
  /** the nearest thing an actor can reach in front of it (a door, a chest, a trunk, a lever, a key: what a check or use
   *  button acts on): within range of its edge (a door's whole width counts), in front (60 degrees either way) and 20
   *  units up or down; kinds: a list of kinds, or any. Returns the thing or null */
  reach(a, range = 14, kinds = null) {
    let best = null, bd = 1e9; const fx = Math.cos(a.facing), fy = Math.sin(a.facing);
    for (const t of this.things) {
      if (!t.visible || (kinds && !kinds.includes(t.kind)) || Math.abs(t.z - a.z) > 20) continue;
      // the nearest point of it: along a door's width, else its centre less its radius
      const c = Math.cos(t.yaw), s = Math.sin(t.yaw), dx = t.x - a.x, dy = t.y - a.y, hw = t.kind === 'door' ? (t.w || 32) / 2 : 0, lx = clamp(-(dx * c + dy * s), -hw, hw);
      const px = dx + lx * c, py = dy + lx * s, d = Math.hypot(px, py) - (hw ? 4 : t.r * .6) - a.r;
      if (d > range || (Math.hypot(px, py) > 3 && (px * fx + py * fy) < .5 * Math.hypot(px, py))) continue;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  /** a locked door (door.locked: the id of the key it takes) and an inventory (E.RPG's, or anything with has and remove):
   *  'open' (not locked), 'unlocked' (the key used up, or kept with o.keep: door.locked is null now) or 'locked' (no key) */
  unlock(door, inv, o = {}) {
    const k = door.locked; if (!k) return 'open'; if (!inv || !inv.has(k)) return 'locked';
    if (!o.keep) inv.remove(k, 1); door.locked = null; return 'unlocked';
  }
  /** the door opening between rooms (Resident Evil's): the camera cuts to the door from the actor's side, the door swings
   *  open away from it as the camera goes through, then the actor stands on the far side (o.to: [x, y], else o.dist: 22
   *  units past the door), facing in, the door shut behind it, and the camera cuts back to its mode. Takes o.time (1.6)
   *  seconds of world.step, in which nothing else moves: world.passing is set (skip your rules), o.then(door) runs at the
   *  end. False while another passing plays */
  through(door, a, o = {}) {
    if (this.passing) return false;
    const nx = -Math.sin(door.yaw), ny = Math.cos(door.yaw), side = (a.x - door.x) * nx + (a.y - door.y) * ny >= 0 ? 1 : -1, d = o.dist ?? 22;
    this.passing = { door, a, t: 0, time: o.time ?? 1.6, side, nx, ny, to: o.to || [door.x - nx * side * d, door.y - ny * side * d], then: o.then || null, vis: a.visible };
    door.swingTo = -side; a.vx = a.vy = 0; a.visible = false; a.facing = Math.atan2(-ny * side, -nx * side); this.camera._cutNow(); this.camera._hold = null;
    return true;
  }
  _pass(dt) {
    const P = this.passing, u = (P.t += dt) / P.time, D = P.door;
    D.open = clamp(u < .5 ? u * 2 : (1 - u) / .15, 0, 1);
    if (u < 1) return;
    this.passing = null; D.open = 0; P.a.visible = P.vis; P.a.place(P.to[0], P.to[1]);
    this.camera._cutNow(); this.camera.zone = null;   // (the camera picks its zone afresh where the actor stands)
    if (P.then) P.then(D);
  }

  /* ---- shapes (section 5b) ---- */
  /** a shape (an E.SHAPES id, a store set's 'SET:id' after E.addAssets, or an entry) standing at (x, y), on the floor
   *  there or at z, with the 2D placement's options and units: { facing (where its front points; PI/2 south), scale,
   *  mats, flip, params, solid (default true: a fixed collider from the box map.solid uses; false: bodies pass) } -> its
   *  placement { id, x, y, z, facing, scale, body }; null for an unknown shape. world.remove(it) takes it away */
  shape(id, x, y, z, o = {}) {
    const K = this._shapeKit.kind(id, o); if (!K) return null;
    const p = { isShape: true, id, x, y, z: z ?? this.floorAt(x, y), facing: o.facing ?? Math.PI / 2, scale: o.scale || 1, kind: K, i: K.list.length, body: null, data: o.data || {} };
    K.list.push(p); this._shapeKit.put(K, p); this.shapes.push(p);
    if (o.solid !== false) {   // the 2D engine's box: its footprint turned with it, from its base to its top
      const b = E.shapeBox(id, x, y, p.z, o), hz = Math.max(.5, (b.top - p.z) / 2), a = Math.atan2(b.s, b.c);
      p.body = this.pw.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(b.x, b.y, p.z + hz).setRotation({ x: 0, y: 0, z: Math.sin(a / 2), w: Math.cos(a / 2) }));
      this.pw.createCollider(RAPIER.ColliderDesc.cuboid(Math.max(.5, b.hx), Math.max(.5, b.hy), hz).setCollisionGroups(GROUPS.level), p.body);
    }
    return p;
  }

  /* ---- a step of the game: platforms, the heroes' controllers, the mobs' wishes, Rapier, then where all is ---- */
  /** advance the world by dt (the game's fixed step): call it once in your scene's update, after your rules */
  step(dt) {
    if (!(dt > 0)) { this._stepAt = -1; for (const c of this.cameras) c.update(0); return; }   // (time stopped: frames show the last step as it is)
    const t0 = performance.now(), pw = this.pw;
    this.time += dt; this.n++;
    for (const a of this.actors) (a._ip || (a._ip = [0, 0, 0, 0])).splice(0, 4, a.x, a.y, a.z || 0, a.rig ? a.rig.facing : a.facing || 0);   // (where each was, and its facing, before the step: a frame between steps draws them part way)
    for (const q of this.platforms) (q._ip || (q._ip = [0, 0, 0])).splice(0, 3, q.x, q.y, q.z);
    for (const c of this.cameras) c._was = c.pose; this._stepAt = this.game.real;
    if (this.passing) { this._pass(dt); for (const c of this.cameras) { c.update(dt); c._stepPose = c.pose; } return; }   // (a door between rooms: the rest holds still)
    if (this.level.stream) this.level.stream(this);   // (a terrain: the heightfields near the actors)
    // where the platforms go this step (worked out first, given to Rapier after the heroes' controllers have looked:
    // a controller that saw a platform's next place would carry its rider some steps and not others)
    for (const p of this.platforms) this._movePlatform(p, dt);
    for (const a of this.actors) {
      if (!a.body) continue;
      if (a.kind === 'hero') this._moveHero(a, dt);
      else if (a.vx !== a._rv[0] || a.vy !== a._rv[1] || a.vz !== a._rv[2]) a.body.setLinvel({ x: a.vx, y: a.vy, z: a.vz }, true);
    }
    for (const p of this.platforms) p.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z - p.h / 2 });
    pw.timestep = dt; pw.step();
    this._readBack(dt);
    for (const c of this.cameras) { c.update(dt); c._stepPose = c.pose; }
    this.stats.physicsMs = performance.now() - t0;
  }
  _moveHero(a, dt) {
    if (!a.fly) a.vz = Math.max(-600, a.vz - this.gravity * dt);
    a.cc.computeColliderMovement(a.col, { x: a.vx * dt, y: a.vy * dt, z: a.vz * dt }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, HERO_QUERY);
    let m = a.cc.computedMovement(); const p = a.body.translation(), on = a.on, ground = a.cc.computedGrounded() || (on && a.vz <= 0);
    // Rapier's controller, pressed by a step's gravity into a floor it already touches (a hit at time 0), now and then
    // slides nowhere: a walking hero stopped dead for a step every few seconds. Then the move is tried along the floor
    const want = Math.hypot(a.vx, a.vy) * dt;
    if (ground && a.vz <= 0 && want > .02 && Math.hypot(m.x, m.y) < want * .01) { a.cc.computeColliderMovement(a.col, { x: a.vx * dt, y: a.vy * dt, z: 0 }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, HERO_QUERY); m = a.cc.computedMovement(); }
    if (ground && a.vz <= 0) a.vz = 0;
    if (!ground && a.vz > 0 && m.z < a.vz * dt * .5) a.vz = 0;   // a head bump
    a.landed = ground && !a.grounded; a.grounded = !!ground;
    // carried by the moving platform under it: the platform's step added to the hero's own, unless the controller has
    // added it already (Rapier's controller follows a moving floor on some steps and not others)
    let cx = 0, cy = 0, cz = 0;
    if (on && Math.hypot(m.x - a.vx * dt - on.dx, m.y - a.vy * dt - on.dy) > .02) { cx = on.dx; cy = on.dy; cz = on.dz; }
    a.body.setNextKinematicTranslation({ x: p.x + m.x + cx, y: p.y + m.y + cy, z: p.z + m.z + cz });
  }
  _readBack(dt) {
    const L = this.level;
    for (const a of this.actors) {
      if (!a.body) continue;
      const p = a.body.translation();
      a.x = p.x; a.y = p.y;
      if (a.kind === 'hero') {
        a.z = p.z - a.foot - .3;
        if (a.grounded) { const f = this.floorAt(a.x, a.y, a.z + 2); if (Math.abs(a.z - f) < 1.5) a.z = f; }   // (feet on the floor, not the controller's skin above it)
      } else {
        const v = a.body.linvel(); a.z = p.z - a.foot;
        const pvz = a.vz; a.vx = v.x; a.vy = v.y; a.vz = v.z;
        const was = a.grounded; a.grounded = a.fly || (Math.abs(a.vz) < 6 && (a.z - this.floorAt(a.x, a.y, a.z + 1) < 2 || Math.abs(a.vz - pvz) < 1)); a.landed = a.grounded && !was;
        a._rv[0] = a.vx; a._rv[1] = a.vy; a._rv[2] = a.vz;
        if (a.isVehicle) vehicleGround(this, a, dt);
      }
      a.fell = a.z < L.bottom + 8;
      // standing on a moving platform (it carries a hero: world.step adds its motion)
      a.on = null;
      for (const q of this.platforms) if (Math.abs(a.x - q.x) < q.w / 2 + a.r * .5 && Math.abs(a.y - q.y) < q.d / 2 + a.r * .5 && Math.abs(a.z - q.z) < 2.5 && a.vz <= 1) { a.on = q; break; }
      if (a.pose) this._pose(a, dt);
    }
    for (const p of this.props) {
      if (!p.body) continue;
      const q = p.body.translation(), r = p.body.rotation(); p.x = q.x; p.y = q.y; p.z = q.z; p.q[0] = r.x; p.q[1] = r.y; p.q[2] = r.z; p.q[3] = r.w; if (p.hit) p.hit--;
      p.fell = q.z < L.bottom;
    }
    for (const t of this.things) t.t += dt;
  }
  /** pose an actor's rig (or blob) from its motion and its anim (world.step does it for every actor with pose on) */
  _pose(a, dt) {
    if (a.rig) {
      const s = Object.assign({ x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.facing, air: !a.grounded && !a.fly }, a.anim);
      a.rig.update(dt, s);
      const A = s.attack; if (a.rig.capeL && !s.dash && !(A && A.phase === 'active')) settleCape(a.rig, dt, clamp(1 - Math.hypot(a.vx, a.vy) / 60, 0, 1));
    } else if (a.blob) a.blob.update(dt, Object.assign({ look: [Math.cos(a.facing), Math.sin(a.facing)] }, a.anim));
  }
  /** the state's hash: the step count, every actor, prop and platform (positions by their float bits) and your own
   *  numbers. The same seed and the same inputs give the same hash on WebGPU, WebGL 2 and run again */
  hash(extra = []) {
    const list = [this.n, ...extra];
    for (const a of this.actors) list.push(a.x, a.y, a.z, a.vx, a.vy);
    for (const p of this.props) list.push(p.x, p.y, p.z);
    for (const p of this.platforms) list.push(p.x, p.y, p.z);
    for (const f of this.flyers) list.push(f.x, f.y, f.z, f.yaw, f.pitch);
    return hashNumbers(list);
  }
}
/** a cape at rest in 3D: its chains settle behind and below the shoulders (w: how much, 0 moving fast .. 1 still) */
function settleCape(rig, dt, w) {
  const k = Math.min(1, dt * 16 * w), fx = Math.cos(rig.facing), fy = Math.sin(rig.facing), seg = (rig.o.cape && rig.o.cape.seg) || 2.5;
  for (const ch of [rig.capeL, rig.capeR]) ch.forEach((n, i) => {
    n.x = lerp(n.x, ch[0].x - fx * i * .5, k); n.y = lerp(n.y, ch[0].y - fy * i * .5, k); n.z = lerp(n.z, ch[0].z - i * seg, k);
    if (n.px !== undefined) { n.px = lerp(n.px, n.x, k); n.py = lerp(n.py, n.y, k); n.pz = lerp(n.pz, n.z, k); }
  });
}

/* =============================================================================
 * 10. DRAWING  effects (arcs and rings on the ground, weapon trails, glows, the game's particles), lights (the torches
 *     nearest the action, two of them casting shadows; your own; a sun), the sky and fog, then the frame: world.draw(r)
 * ============================================================================= */
/** a pool of flat ground shapes (arcs and rings), each its own mesh so each fades on its own; one material for the pool
 *  (the color and fade are in the vertices), so a new shape never builds a shader mid-fight */
function floorPool(world, segments) {
  const pool = [], mat = new THREE.MeshBasicNodeMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  return {
    get(i) {
      if (!pool[i]) {
        const geo = new THREE.BufferGeometry(), pos = new Float32Array((segments + 1) * 2 * 3), idx = [];
        for (let k = 0; k < segments; k++) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3)); geo.setIndex(idx);
        geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
        const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 1; m.visible = false; world.scene.add(m); pool[i] = m;
      }
      return pool[i];
    },
    /** shape i: from radius r0 to r1 between angles a0 and a1 round (x, y) at height z (engine units) */
    set(i, x, y, z, r0, r1, a0, a1, color, alpha) {
      const m = this.get(i), p = m.geometry.attributes.position.array, cl = m.geometry.attributes.color.array, c = typeof color === 'string' ? lin(color) : color;
      for (let k = 0; k <= segments; k++) {
        const a = a0 + (a1 - a0) * k / segments, cs = Math.cos(a), sn = Math.sin(a), o = k * 6;
        p[o] = (x + cs * r0) / U; p[o + 1] = (z + .3) / U; p[o + 2] = (y + sn * r0) / U; p[o + 3] = (x + cs * r1) / U; p[o + 4] = (z + .3) / U; p[o + 5] = (y + sn * r1) / U;
        cl[o] = cl[o + 3] = c[0] * alpha; cl[o + 1] = cl[o + 4] = c[1] * alpha; cl[o + 2] = cl[o + 5] = c[2] * alpha;
      }
      m.geometry.attributes.position.needsUpdate = m.geometry.attributes.color.needsUpdate = true; m.visible = true;
    },
    hideFrom(i) { for (let k = i; k < pool.length; k++) pool[k].visible = false; },
    prepare(n) { for (let i = 0; i < n; i++) this.get(i); },
    get list() { return pool; }
  };
}
/** weapon trails: ribbons between a blade's base and tip over its last positions, fading at the tail */
function ribbons(world) {
  const pool = [], MAX = 12, mat = new THREE.MeshBasicNodeMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  function make() {
    const pos = new Float32Array(MAX * 2 * 3), col = new Float32Array(MAX * 2 * 3), idx = [];
    for (let i = 0; i < MAX - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 3; m.visible = false; world.scene.add(m); return m;
  }
  return {
    set(i, trail, tint) {
      const m = pool[i] || (pool[i] = make()), n = Math.min(MAX, trail.length); m.visible = n > 1; if (n < 2) return;
      const pos = m.geometry.attributes.position.array, col = m.geometry.attributes.color.array;
      for (let k = 0; k < n; k++) {
        const p = trail[trail.length - n + k], f = ((k + 1) / n) ** 1.5 * .85, o = k * 6;
        pos[o] = p.b[0] / U; pos[o + 1] = p.b[2] / U; pos[o + 2] = p.b[1] / U; pos[o + 3] = p.t[0] / U; pos[o + 4] = p.t[2] / U; pos[o + 5] = p.t[1] / U;
        col[o] = tint[0] * f * .5; col[o + 1] = tint[1] * f * .5; col[o + 2] = tint[2] * f * .5; col[o + 3] = tint[0] * f; col[o + 4] = tint[1] * f; col[o + 5] = tint[2] * f;
      }
      m.geometry.attributes.position.needsUpdate = m.geometry.attributes.color.needsUpdate = true; m.geometry.setDrawRange(0, (n - 1) * 6);
    },
    hideFrom(i) { for (let k = i; k < pool.length; k++) pool[k].visible = false; },
    prepare(n) { for (let i = 0; i < n; i++) if (!pool[i]) pool[i] = make(); },
    get list() { return pool; }
  };
}
/* crates and barrels: instanced, each where its body is (a crate's planks and a barrel's staves drawn by code) */
const WOOD = { planks: ['#9d6a3f', '#8f5f37', '#a87547'].map(H), frame: H('#6e4528'), line: H('#4a2e1c'), hi: H('#c08a55'), nail: H('#2e2420') };
function crateTex(x, y) {   // 12 x 12 pixels for a 12-unit crate: a dark frame, planks, a diagonal brace, four nails
  const P = WOOD, n = 12;
  if (x === 0 || y === 0 || x === n - 1 || y === n - 1) return P.line;
  if (x === 1 || y === 1 || x === n - 2 || y === n - 2) return (x === 1 || x === n - 2) && (y === 1 || y === n - 2) ? P.nail : P.frame;
  if (Math.abs(x - y) <= .5 || Math.abs(x - y - 1) <= .5) return x === y ? P.hi : P.frame;
  if ((y - 2) % 3 === 2) return P.line;
  return P.planks[Math.floor((y - 2) / 3) % P.planks.length];
}
function barrelTex(x, y) {   // staves round the side (36 x 14 pixels), two iron hoops
  if (y === 2 || y === 3 || y === 10 || y === 11) return y === 2 || y === 10 ? H('#5d5a66') : H('#3a3842');
  const st = Math.floor(x / 3), c = WOOD.planks[st % 3];
  return x % 3 === 2 ? WOOD.line : E.hash2(st, y) < .08 ? WOOD.frame : c;
}
function propMeshes(world) {
  const mk = (geo, mats, n) => { const m = new THREE.InstancedMesh(world._own(geo), mats, n); m.frustumCulled = false; m.count = 0; m.castShadow = m.receiveShadow = true; world.scene.add(m); return m; };
  const crate = world._obj(new THREE.MeshLambertNodeMaterial({ map: world._own(bake(crateTex, 12, 12)) }));
  const side = world._obj(new THREE.MeshLambertNodeMaterial({ map: world._own(bake(barrelTex, 36, 14)) })), lid = world._obj(new THREE.MeshLambertNodeMaterial({ color: '#7a5030' }));
  return { crate: mk(new THREE.BoxGeometry(12 / U, 12 / U, 12 / U), crate, 300), barrel: mk(new THREE.CylinderGeometry(6 / U, 6 / U, 14 / U, 12, 1), [side, lid, lid], 300) };
}
const _pq = new THREE.Quaternion(), _pv = new THREE.Vector3(), _ps = new THREE.Vector3(1, 1, 1), _rotZY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
/** a body's rotation (Rapier's, about the engine's axes, z up) as three's (y up): swap y and z and flip the handedness */
const quatToThree = (q, out) => out.set(-q[0], -q[2], -q[1], q[3]);
const FLICKER = t => .9 + Math.sin(t * 13) * .05 + Math.sin(t * 29) * .04 + Math.sin(t * 7.3) * .04;   // the 2D hall's torch flicker
/** a light's own flicker (h.flicker 0..1): a failing bulb's stutter now and then, a faint shimmer between (cosmetic) */
const flick = (h, t) => { const f = h.flicker; if (!f) return 1; const s = Math.sin(t * 2.3 + Math.sin(t * .7) * 4) * Math.sin(t * 5.9); return 1 - f * (s > .55 ? .9 * (.5 + .5 * Math.sin(t * 47)) : .08 * (.5 + .5 * Math.sin(t * 13))); };
const TRAIL = { hero: lin('#d8f2ff'), claw: lin('#ff7a5a') };

Object.assign(World3D.prototype, {
  /* ---- lights: a fixed set made with the world (the count never changes, so shaders never rebuild mid-game) ---- */
  _lights(o) {
    const sc = this.scene, a = o.ambient || ['#5a5480', '#241f30', 4];
    this._ambient = new THREE.HemisphereLight(a[0], a[1], a[2] ?? 4); sc.add(this._ambient);
    const point = (color, reach, decay = 1) => { const l = new THREE.PointLight(color, 0, reach / U, decay); sc.add(l); return l; };
    const nt = this.torches.length, TC = o.torchColor || '#ffc8a0', TR = o.torchReach || 170;
    this._torchLights = Array.from({ length: Math.min(nt, o.torchLights ?? 6) }, () => point(TC, TR, .5));
    this._shadowLights = nt ? Array.from({ length: o.torchShadows ?? 1 }, () => { const l = point(TC, TR, .5); l.shadow.mapSize.set(512, 512); l.shadow.camera.near = .1; l.shadow.camera.far = TR / U; l.shadow.bias = -.002; return l; }) : [];
    this._glowLights = Array.from({ length: o.glowLights ?? 4 }, () => point('#ffb347', 40));
    /** lights you place: world.light() hands out one of o.lights (made with the world, 2 unless said) */
    this._userLights = Array.from({ length: o.lights ?? 2 }, () => point('#ffffff', 120));
    this._userNext = 0; this._handles = []; this.torchPower = o.torchPower ?? 30;
    /** spot lights for world.flashlight (o.spots: 0 unless said), each casting a shadow while shadows are on */
    this._spots = Array.from({ length: o.spots ?? 0 }, () => { const l = new THREE.SpotLight('#ffffff', 0, 10, .5, .5, 1); l.shadow.mapSize.set(512, 512); l.shadow.camera.near = .2; l.shadow.bias = -.002; sc.add(l); sc.add(l.target); return l; });
    this._spotNext = 0; this._beams = [];
    if (o.sun) {
      const s = o.sun, L = this._sun = new THREE.DirectionalLight(s.color || '#fff4e0', s.intensity ?? 2.4);
      L.castShadow = s.shadow !== false; const area = (s.area || 220) / U;
      this._sunBack = (s.back || Math.max(960, (s.area || 220) * 1.5)) / U;   // (metres from the focus back toward the sun: what stands that far casts)
      Object.assign(L.shadow.camera, { left: -area, right: area, top: area, bottom: -area, near: .5, far: Math.max(200, this._sunBack + area * 2.5) }); L.shadow.mapSize.set(s.map || 1024, s.map || 1024); L.shadow.bias = s.bias ?? -.0015; L.shadow.normalBias = s.normalBias ?? .02;
      this._sunTexel = area * 2 / (s.map || 1024);
      const d = s.dir || [-.5, -.7, -.6]; this._sunDir = new THREE.Vector3(d[0], d[2], d[1]).normalize();   // (engine axes -> three's; it shines along dir)
      sc.add(L); sc.add(L.target);
    }
  },
  /** one of the world's own lights to place each frame: { x, y, z, color, reach, power, on } (power 0 or on false: dark) */
  light(o = {}) {
    const L = this._userLights[this._userNext++];
    if (!L) { E.warn('3d:lights', 'world.light(): every light made with the world is in use; make the world with { lights: n }'); return { x: 0, y: 0, z: 0, on: false }; }
    const h = Object.assign({ x: 0, y: 0, z: 0, color: '#ffffff', reach: 120, power: 12, on: true, flicker: 0 }, o); h._L = L; this._handles.push(h); return h;
  },
  /** a flashlight (the world made with { spots: n }): a spot light at an actor's hand that follows its facing every frame
   *  (part way between steps, as the actor is drawn). o: { color, reach (260), angle (.42: its cone's half, radians), soft
   *  (.5: the edge's blur), power (40), pitch (-.12: down a little), height (18), flicker (0..1: a failing bulb's
   *  stutter), shadow (true) }; the handle's fields change it, on: false puts it out */
  flashlight(a, o = {}) {
    const L = this._spots[this._spotNext++];
    if (!L) { E.warn('3d:spots', 'world.flashlight(): no spot light left; make the world with { spots: n }'); return { on: false }; }
    const h = Object.assign({ actor: a, color: '#fff2d6', reach: 260, angle: .42, soft: .5, power: 40, pitch: -.12, height: 18, flicker: 0, shadow: true, on: true }, o); h._L = L; this._beams.push(h); return h;
  },
  _sky(o) {
    const sky = o.sky || '#06050b';
    if (sky && typeof sky === 'object' && !Array.isArray(sky)) return this._dome(sky, o);
    const top = Array.isArray(sky) ? sky[0] : sky, bot = Array.isArray(sky) ? sky[1] : sky;
    if (top === bot) this.scene.background = new THREE.Color(top);
    else this.scene.backgroundNode = TSL.mix(TSL.color(bot), TSL.color(top), TSL.screenUV.y.oneMinus().pow(.8));
    const f = o.fog === undefined ? { color: bot, near: 190, far: 1120 } : o.fog;
    this._fog = f ? { color: f.color || bot, near: f.near ?? 190, far: f.far ?? 1120 } : null;
    this.scene.fog = this._fog ? new THREE.Fog(this._fog.color, 30, 90) : null;
  },
  /** sky: { top, horizon, ground, sun (a disc and its glow where the sun is: true, or its color), haze }: a dome round the
   *  camera whose colors follow where it looks (up: top; level: horizon; down: ground), for a world seen from inside
   *  it (first person, an open world); the fog takes the horizon's color unless it says its own */
  _dome(sky, o) {
    const { positionLocal, mix, max, pow, dot, clamp: cl, smoothstep, color, uniform, float, select, vec3 } = TSL;
    const dir = positionLocal.normalize(), y = dir.y, top = color(sky.top || '#3f74c4'), hor = color(sky.horizon || '#cfe0ee'), gnd = color(sky.ground || sky.horizon || '#8a8a88');
    const above = mix(hor, top, pow(cl(y, 0, 1), float(sky.curve ?? .55))), below = mix(hor, gnd, cl(y.negate().mul(4), 0, 1));
    let col = select(y.greaterThan(0), above, below);
    this._sunU = uniform(new THREE.Vector3(0, 1, 0));
    if (sky.sun !== false && o.sun) {
      const sc = color(typeof sky.sun === 'string' ? sky.sun : '#fff1c8'), c = max(dot(dir, this._sunU), 0);
      col = col.add(sc.mul(pow(c, 6).mul(.18).add(pow(c, 64).mul(.35)).add(smoothstep(float(.9993), float(.9996), c).mul(2.2))));
    }
    if (sky.haze) col = mix(col, hor, float(sky.haze).mul(float(1).sub(cl(y.abs().mul(6), 0, 1))));
    const mat = this._obj(new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false })); mat.colorNode = vec3(col);
    const dome = this._skyDome = new THREE.Mesh(this._own(new THREE.SphereGeometry(1, 40, 20)), mat); dome.frustumCulled = false; dome.renderOrder = -1000; this.scene.add(dome);
    const f = o.fog === undefined ? { color: sky.horizon || '#cfe0ee', near: 3200, far: 22000 } : o.fog;
    this._fog = f ? { color: f.color || sky.horizon || '#cfe0ee', near: f.near ?? 3200, far: f.far ?? 22000 } : null;
    this.scene.fog = this._fog ? new THREE.Fog(this._fog.color, 30, 90) : null;
  },
  /* the overlay (a view model): its own scene and camera, lit by the world's sky and sun as the camera sees them */
  _makeOverlay(o) {
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(o.fov || 62, 1, o.near || .01, o.far || 40);
    cam.lookAt(1, 0, 0);   // (along three's +x, the engine's +x: the pen's x is ahead, its y right, its z up)
    const amb = new THREE.HemisphereLight('#ffffff', '#555555', 1.5), sun = new THREE.DirectionalLight('#ffffff', 2.2);
    sc.add(amb); sc.add(sun); sc.add(sun.target); sc.add(cam);
    const pen = new Pen(this); pen.B = makeBatches(this, sc);
    this.overlay = { scene: sc, camera: cam, pen, on: o.on !== false, light: o.light ?? 1, _amb: amb, _sun: sun };
  },
  _lightOverlay(c3) {
    const ov = this.overlay, A = this._ambient, q = _q0.copy(c3.quaternion).invert().premultiply(ov.camera.quaternion);
    ov._amb.color.copy(A.color); ov._amb.groundColor.copy(A.groundColor); ov._amb.intensity = A.intensity * ov.light;
    ov._amb.position.set(0, 1, 0).applyQuaternion(q);   // (the sky is up in the world, wherever the camera turns)
    if (this._sun) { ov._sun.color.copy(this._sun.color); ov._sun.intensity = this._sun.intensity * ov.light; ov._sun.position.copy(this._sunDir).negate().applyQuaternion(q).multiplyScalar(5); }
    else ov._sun.intensity = 0;
  },
  /** the torches nearest the focus lit (two of them through the shadow casters when shadows are on), your lights, the sun */
  _light(fx, fy, fz) {
    const T0 = this.torches, n = T0.length, t = this.time, P = this.torchPower;
    const near = n ? T0.map((b, i) => [Math.hypot(b.x - fx, b.y - fy), i]).sort((a, b) => a[0] - b[0]).map(a => a[1]) : [];
    const sh = this.shadows && this._shadowLights.length ? near.slice(0, this._shadowLights.length) : [];
    this._shadowLights.forEach((L, k) => { const i = sh[k], on = i !== undefined; L.castShadow = on; L.intensity = on ? P * FLICKER(t + T0[i].t) : 0; if (on) L.position.set(T0[i].x / U, (T0[i].z + 16) / U, T0[i].y / U); });
    const rest = near.slice(sh.length);
    this._torchLights.forEach((L, k) => { const i = rest[k], on = i !== undefined; L.intensity = on ? P * FLICKER(t + T0[i].t) : 0; if (on) L.position.set(T0[i].x / U, (T0[i].z + 16) / U, T0[i].y / U); });
    for (const h of this._handles) { const L = h._L; L.intensity = h.on ? h.power * flick(h, t) : 0; if (h.on) { L.position.set(h.x / U, h.z / U, h.y / U); L.color.set(h.color); L.distance = h.reach / U; } }
    const k = 1 - (this._al ?? 1);
    for (const h of this._beams) {   // a flashlight: from the actor's hand, along its facing (drawn part way between steps, as it is)
      const L = h._L, a = h.actor, w = a._ip, m = w && k && Math.abs(w[0] - a.x) + Math.abs(w[1] - a.y) < 40 ? k : 0, f = a.facing + (m ? E.angDiff(a.facing, w[3]) * m : 0);
      const on = h.on && (a.visible !== false || (this.passing && this.passing.a === a)); L.intensity = on ? h.power * flick(h, t) : 0; L.castShadow = this.shadows && h.shadow;   // (kept as it is while out: no shader built mid-game)
      if (!on) continue;
      const x = a.x + (m ? (w[0] - a.x) * m : 0) + Math.cos(f) * 5, y = a.y + (m ? (w[1] - a.y) * m : 0) + Math.sin(f) * 5, z = (a.z || 0) + (m ? (w[2] - (a.z || 0)) * m : 0) + h.height, cp = Math.cos(h.pitch);
      L.position.set(x / U, z / U, y / U); L.target.position.set((x + Math.cos(f) * cp * 60) / U, (z + Math.sin(h.pitch) * 60) / U, (y + Math.sin(f) * cp * 60) / U); L.target.updateMatrixWorld();
      L.color.set(h.color); L.distance = h.reach / U; L.angle = h.angle; L.penumbra = h.soft; L.shadow.camera.far = h.reach / U;
    }
    if (this._sun) {
      // the shadow's square follows the focus a whole texel at a time (in the light's own frame), so its edges never crawl
      const s = this._sun, d = this._sunDir, tp = s.target.position.set(fx / U, fz / U, fy / U), tx = this._sunTexel;
      const rt = _v0.set(0, 1, 0).cross(d); if (rt.lengthSq() < 1e-6) rt.set(1, 0, 0); rt.normalize(); const up = _s0.copy(d).cross(rt).normalize();
      const a = tp.dot(rt), b = tp.dot(up); tp.addScaledVector(rt, Math.round(a / tx) * tx - a).addScaledVector(up, Math.round(b / tx) * tx - b);
      s.position.copy(tp).addScaledVector(d, -this._sunBack); s.castShadow = this.shadows && this.o.sun.shadow !== false;
    }
  },

  /* ---- effects for this frame: call them in your draw, before world.draw(r) ---- */
  /** a flat shape on the ground this frame: an arc round (x, y) at height z from radius r0 to r1, between angles a0 and
   *  a1 (a telegraph: a wind-up's reach), light that adds (color, alpha 0..1) */
  arc(x, y, z, r0, r1, a0, a1, color = '#ff4a3a', alpha = .6) { this._queue.arcs.push([x, y, z, r0, r1, a0, a1, color, alpha]); },
  /** a glowing ball this frame (a bolt, a spell): radius r, its color and a white-hot core; light: true lends it one of
   *  the world's glow lights (the first four asked for) */
  glow(x, y, z, r, color = '#ffb347', o = {}) { this._queue.glows.push([x, y, z, r, color, o.core || '#fff3c4', !!o.light]); },
  /** where a point (engine units) is on the game's screen, in game pixels [x, y] (for the HUD), or null behind the camera */
  project(x, y, z) {
    const P = this._proj, c = P ? P.cam : this.camera.cam; _pv.set(x / U, z / U, y / U).project(c); if (_pv.z > 1 || _pv.z < -1) return null;
    const g = this.game, v = P && P.vp || { x: 0, y: 0, w: g.W, h: g.H }; return [v.x + (_pv.x + 1) / 2 * v.w, v.y + (1 - _pv.y) / 2 * v.h];   // (in the viewport the world drew last)
  },
  /** where a point of the page (client pixels: a mouse) lands on the plane at height z, in engine units [x, y], or null */
  screenToFloor(cx, cy, z = 0) {
    const cv = PAGE.canvas; if (!cv) return null; const r = cv.getBoundingClientRect(); if (!r.width) return null;
    _ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height * 2 - 1));
    _ray.setFromCamera(_ndc, this.camera.cam); const o = _ray.ray.origin, d = _ray.ray.direction, y0 = z / U;
    if (Math.abs(d.y) < 1e-4) return null; const k = (y0 - o.y) / d.y; if (k < 0) return null;
    return [(o.x + d.x * k) * U, (o.z + d.z * k) * U];
  },

  /* ---- the frame ---- */
  /** draw the world as it stands (in your scene's draw; your HUD on r after it). r: the 2D renderer (its damage numbers
   *  and notes go on the HUD) */
  draw(r) {
    const R = PAGE.renderer; if (!R) { this._queue.arcs.length = this._queue.glows.length = 0; for (const b of Object.values(this.B)) b.begin(); if (this.overlay) for (const b of Object.values(this.overlay.pen.B)) b.begin(); return; }
    // a split screen's viewport (r.viewport, the 2D engine's game.splitScreen) draws through its own camera
    const vp = r && r.viewport, vc = vp ? this.cameras[vp.i] || this.camera : this.camera;
    if (vc !== this.camera) { const main = this.camera; this.camera = vc; try { return this.draw(r); } finally { this.camera = main; } }
    this._vp = vp || null;
    PAGE.active = this; if (this.camera.locked && this.game.paused) document.exitPointerLock();   // a pause frees the mouse
    const t0 = performance.now(), g = this.game;
    g.particles.ground = (x, y, z) => this.level.floorAt(x, y, z);
    // the 2D renderer draws the game's particles after the scene's draw: a frame the world drew, it puts only their text
    // (damage numbers) on the HUD; the world draws the rest in 3D
    if (!g.particles._3d) { const P = g.particles, draw2d = P.draw.bind(P); P._3d = true; P.draw = rr => { const w = P._world; P._world = null; if (w) w._texts(rr); else draw2d(rr); }; }
    g.particles._world = this;
    // the player's settings (World3D.SETTINGS), taken up when they change
    const st = g.settings || {}, sk = [st.look3d, st.picture3d, st.shadows3d, st.filter3d].join();
    if (sk !== this._sk) {
      if (this._sk !== undefined) { if (st.look3d) this.look = st.look3d; if (RES.includes(st.picture3d)) this.res = st.picture3d; if (st.shadows3d !== undefined) this.shadows = !!st.shadows3d; if (st.filter3d) this.filter.look = st.filter3d; }
      this._sk = sk;
    }
    const full = this._fit(), sw = full[0] / g.W, rw = vp ? [Math.max(1, Math.round(vp.w * sw)), Math.max(1, Math.round(vp.h * sw))] : full, cam = this.camera;
    if (!cam.pose) cam.update(0);
    const p0 = cam.pose, pk = p0 && [p0.x, p0.y, p0.z, p0.yaw, p0.pitch, p0.fov, p0.roll].join();   // (a pose onDraw changes, replaced or in place, is the game's)
    if (this.onDraw) this.onDraw(this, r);   // (the game's own drawing for every frame, whichever scene draws the world)
    // the steps run 120 times a second: a frame between two draws the camera and the actors part way (game.alpha), so
    // motion is even at 90, 144 or 240 Hz; after a step that didn't run the world (paused, a hit-stop) it shows the last
    // as it is. A pose the game set itself (onDraw) is the game's to place
    const al = this._al = this._stepAt === g.real && !(g.hitstop > 0) ? clamp(g.alpha, 0, 1) : 1, sp = cam.pose, wp0 = cam._was;   // (the frame a hit-stop starts shows the blow's step whole)
    if (al < 1 && wp0 && sp === cam._stepPose && sp === p0 && [sp.x, sp.y, sp.z, sp.yaw, sp.pitch, sp.fov, sp.roll].join() === pk && Math.abs(sp.x - wp0.x) + Math.abs(sp.y - wp0.y) + Math.abs(sp.z - wp0.z) < 60) {
      const k = 1 - al, dy = ((sp.yaw - wp0.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      cam.pose = Object.assign({}, sp, { x: sp.x + (wp0.x - sp.x) * k, y: sp.y + (wp0.y - sp.y) * k, z: sp.z + (wp0.z - sp.z) * k, yaw: sp.yaw - dy * k, pitch: sp.pitch + (wp0.pitch - sp.pitch) * k, fov: sp.fov + ((wp0.fov ?? sp.fov) - sp.fov) * k, roll: (sp.roll || 0) + ((wp0.roll || 0) - (sp.roll || 0)) * k });
    }
    const c3 = cam.place(rw[0], rw[1]), p = cam.pose, tg = cam._target(); cam.pose = sp;
    OUTLINE_PX.value.set(2 / rw[0] * cam.cv.thick, 2 / rw[1] * cam.cv.thick);
    // fog from a little past the target, however far the camera stands
    if (this._fog) { const dH = Math.hypot(c3.position.x - tg.x / U, c3.position.y - (tg.z || 0) / U, c3.position.z - tg.y / U); this.scene.fog.near = dH + this._fog.near / U; this.scene.fog.far = dH + this._fog.far / U; }
    this._cut(p, tg);
    this._light(tg.x, tg.y, tg.z || 0);
    const fdt = clamp(g.real - (this._real ?? g.real), 0, .1); this._real = g.real;
    this.level.animateBraziers(fdt);
    const view = cam.cardView(), first = cam.mode === 'first';
    // (the pens' batches hold what the game drew with world.pen and overlay.pen before this; they empty after the render)
    const OB = this.overlay && this.overlay.pen.B;
    this.capes.begin();
    const look = this.look;
    if (look === 'card' || this.actors.some(a => a.look === 'card')) this.atlas.begin(view);
    for (const t of this.tracks) t._pads(this.pen, g.real || 0);
    const drawn = this._drawActors(view, first ? tg : null);
    this._drawThings(); this._reticle();
    this._drawProps();
    this._effects(cam.cv);
    this.atlas.end(this.outlines, cam.cv.thick);
    for (const b of Object.values(this.B)) b.end(this.outlines);
    if (OB) for (const b of Object.values(OB)) b.end(this.outlines);
    this._shapeKit.outlines(this.outlines);
    this.capes.end();
    if (this._fx || fxOn(this.filter)) { this._fx = this._fx || makeFX(this); this._fx.tag(fxOn(this.filter)); }
    this._frameExtras(c3, rw);
    if (!this._warm) this._warmUp(c3, view);
    R.info.reset();
    const t1 = performance.now();
    if (vp) { const x = Math.round(vp.x * sw), y = full[1] - Math.round(vp.y * sw) - rw[1]; R.setViewport(x, y, rw[0], rw[1]); R.setScissor(x, y, rw[0], rw[1]); R.setScissorTest(true); R.autoClear = vp.i === 0; }   // (the first viewport clears the picture; the others draw beside it)
    this._render(c3); this._proj = { cam: c3, vp };
    if (vp) { R.setViewport(0, 0, full[0], full[1]); R.setScissorTest(false); R.autoClear = true; }
    for (const b of Object.values(this.B)) b.begin(); if (OB) for (const b of Object.values(OB)) b.begin();
    const info = R.info.render, t2 = performance.now();
    Object.assign(this.stats, { calls: info.drawCalls, tris: info.triangles, drawn, bodies: this.pw.bodies.len(), drawMs: t2 - t0, renderMs: t2 - t1 });
    this.stats.frames++;
  },
  /** what a frame needs before it draws: the terrain's meshes for where the camera is (all of them the first time), the
   *  sky's dome round the camera, the overlay's light and shape */
  _frameExtras(c3, rw) {
    const cp = c3.position;
    if (this.terrain) this.terrain.drawStream(this, cp.x * U, cp.z * U, cp.y * U, this._warm ? TERRAIN_BUILDS : Infinity);
    if (this._skyDome) { this._skyDome.position.copy(cp); this._skyDome.scale.setScalar(this.camera.far / U * .92); if (this._sun) this._sunU.value.copy(this._sunDir).negate(); }
    if (this.overlay) { const oc = this.overlay.camera; oc.aspect = rw[0] / rw[1]; oc.updateProjectionMatrix(); this._lightOverlay(c3); }
  },
  /** the picture's size: the game's pixels ('pixels'), half the screen's or all of it, the 3D canvas laid exactly under
   *  the game's picture (so the HUD's game pixels and project() agree) */
  _fit() {
    const sc = this.game.screen, cv = PAGE.canvas, dpr = sc.dpr || 1, res = this.res;
    const rw = res === 'full' ? Math.round(sc.W * sc.S) : res === 'balanced' ? Math.round(sc.W * sc.S / 2) : sc.W, rh = res === 'full' ? Math.round(sc.H * sc.S) : res === 'balanced' ? Math.round(sc.H * sc.S / 2) : sc.H;
    const key = [rw, rh, sc.W, sc.H, sc.S, sc.OX, sc.OY, dpr].join();
    if (PAGE.fit !== key) {
      PAGE.fit = key;
      Object.assign(cv.style, { left: sc.OX / dpr + 'px', top: sc.OY / dpr + 'px', width: sc.W * sc.S / dpr + 'px', height: sc.H * sc.S / dpr + 'px', imageRendering: res === 'full' ? 'auto' : 'pixelated' });
      PAGE.renderer.setSize(Math.max(1, rw), Math.max(1, rh), false);
    }
    return [rw, rh];
  },
  /** walls between the level and a view camera cut low, pillars between it and the target cut to stumps */
  _cut(p, tg) {
    const L = this.level, cam = this.camera;
    if (cam.mode !== 'view' || !cam.cut) { L.placeWalls('none', null); L.placePillars(null); return; }
    const [yw, pt] = cam.viewAngles(), fx = Math.sin(yw * DEG), fy = Math.cos(yw * DEG);
    L.placeWalls(pt > 85 ? 'none' : 'cut:' + yw, pt > 85 ? null : c => c.ox * fx + c.oy * fy > .3);
    const far = p.ortho ? 3000 : 0, cp = Math.cos(p.pitch), a = [p.x - Math.cos(p.yaw) * cp * far, p.y - Math.sin(p.yaw) * cp * far, p.z - Math.sin(p.pitch) * far];
    const aims = pt >= 60 ? [[0, 0, 26], [0, 0, 2]] : [[0, 0, 26], [0, 0, 2], [40, 0, 2], [-40, 0, 2], [0, 40, 2], [0, -40, 2]];
    L.placePillars(P0 => aims.some(([dx, dy, dz]) => segBox(a, [tg.x + dx, tg.y + dy, (tg.z || 0) + dz], P0.x0 - 4, P0.y0 - 4, P0.z0, P0.x1 + 4, P0.y1 + 4, P0.z1)));
  },
  /** every actor the camera sees, as cards or puppets, with their shadows, capes and trails; returns how many */
  _drawActors(view, firstOf) {
    const B = this.B, cam = this.camera, v = cam.cv, t = this.time, k = 1 - (this._al ?? 1); let drawn = 0, nr = 0;
    const one = a => {
      if (!a.visible || a.fade <= 0 || !cam.sees(a.x, a.y, a.z)) return;
      if (firstOf && (a === firstOf || Math.hypot(a.x - firstOf.x, a.y - firstOf.y) < 12)) return;   // (first person: its own body, and one pressed against the camera, would fill the picture)
      const flash = a.flash > 0, sink = -a.sink, alpha = clamp(a.fade, 0, 1);
      if (a.orb) { orbParts(B, a, t); drawn++; return; }
      if (a.isVehicle) { vehicleParts(this.pen, a, t); if (!a.rig) { shadowAt(this, a.x, a.y, a.z, 10, alpha); drawn++; return; } }
      if (a.shadow) shadowAt(this, a.x, a.y, a.z, a.blob ? a.blob.o.R || 6 : a.r + 1, alpha);
      drawn++;
      const look = a.look || this.look;
      if (look === 'card' && this.atlas.add(a.x, a.y, a.z - a.sink, (g, ox, oy) => a.rig ? a.rig.draw(g, ox, oy, view) : a.blob.draw(g, ox, oy, view), flash, alpha, v)) { if (a.trail && a.rig && a.rig.trail.length > 1 && nr < 24) this._ribbons.set(nr++, a.rig.trail, typeof a.trail === 'string' ? lin(a.trail) : a.trail); return; }
      if (a.rig) { a.rig._cheat = 0; _sink = sink; humanParts(B, a.rig, flash); if (a.rig.capeL && a.rig.o.cape) this.capes.add(a.rig, sink, flash); _sink = 0; }
      else if (a.blob) blobParts(B, a, flash, sink);
      if (a.trail && a.rig && a.rig.trail.length > 1 && nr < 24) this._ribbons.set(nr++, a.rig.trail, typeof a.trail === 'string' ? lin(a.trail) : a.trail);
    };
    for (const a of this.actors) {   // (each drawn part way from where it was before the last step, then put back; one that jumped is where it is)
      const w = a._ip, dx = w && k ? (w[0] - a.x) * k : 0, dy = w && k ? (w[1] - a.y) * k : 0, dz = w && k ? (w[2] - (a.z || 0)) * k : 0, m = Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 40 * k;
      if (!m) { one(a); continue; }
      // (the body, its facing, and what hangs off it in the world: the cape, the hair, the blade's ribbon; all put back
      // exactly, even if drawing throws: the steps read them)
      const ax = a.x, ay = a.y, az = a.z, af = a.facing, R = a.rig, rx = R && R.x, ry = R && R.y, rz = R && R.z, rf = R && R.facing, f1 = R ? rf : af || 0;
      const df = ((w[3] - f1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI, pts = [], arr = [];
      if (R) { for (const ch of [R.capeL, R.capeR, R._hairPts]) if (ch) for (const n of ch) pts.push(n, n.x, n.y, n.z); for (const q of R.trail || []) for (const v of [q.b, q.t, q.o]) if (v) arr.push(v, v[0], v[1], v[2]); }
      try {
        a.x += dx; a.y += dy; a.z = (az || 0) + dz; if (R) { R.x += dx; R.y += dy; R.z = (rz || 0) + dz; R.facing = rf + df * k; } else if (af !== undefined) a.facing = af + df * k;
        for (let i = 0; i < pts.length; i += 4) { pts[i].x += dx; pts[i].y += dy; pts[i].z += dz; }
        for (let i = 0; i < arr.length; i += 4) { arr[i][0] += dx; arr[i][1] += dy; arr[i][2] += dz; }
        one(a);
      } finally {
        a.x = ax; a.y = ay; a.z = az; a.facing = af; if (R) { R.x = rx; R.y = ry; R.z = rz; R.facing = rf; }
        for (let i = 0; i < pts.length; i += 4) { pts[i].x = pts[i + 1]; pts[i].y = pts[i + 2]; pts[i].z = pts[i + 3]; }
        for (let i = 0; i < arr.length; i += 4) { arr[i][0] = arr[i + 1]; arr[i][1] = arr[i + 2]; arr[i][2] = arr[i + 3]; }
      }
    }
    this._ribbons.hideFrom(nr);
    this.stats.culled = this.actors.length - drawn;
    return drawn;
  },
  _drawThings() {
    const pen = this.pen, cam = this.camera;
    for (const t of this.things) {
      if (!t.visible || !cam.sees(t.x, t.y, t.z)) continue;
      const draw = THINGS[t.kind]; if (!draw) continue;
      pen.at(t.x, t.y, t.z + (t.bob ? (Math.sin(t.t * 2.4) * .5 + .5) * t.bob : 0), t.yaw + t.spin * t.t * TAU, t.size); pen.flash = t.flash > 0;
      draw(pen, t, this.time);
      if (t.shadow !== false && t.kind !== 'door') shadowAt(this, t.x, t.y, t.z + (t.bob || 0), t.r * .8, 1);
    }
    pen.at(); pen.flash = false;
  },
  /** the lock-on's mark (camera.lock): three arrows turning over the target's head and three arcs round its feet */
  _reticle() {
    const L = this.camera.lockOn, c = this.camera.reticle; if (!L || !c) return;
    const k = 1 - (this._al ?? 1), w = L._ip, m = w && k && Math.abs(w[0] - L.x) + Math.abs(w[1] - L.y) < 40 ? k : 0, x = L.x + (m ? (w[0] - L.x) * m : 0), y = L.y + (m ? (w[1] - L.y) * m : 0), z = (L.z || 0) + (m ? (w[2] - (L.z || 0)) * m : 0);
    const t = this.game.real || 0, top = z + (L.foot || 10) * 2 + 9 + Math.sin(t * 5) * 1.5, r = (L.r || 5) + 5;
    this.pen.at(x, y, top, t * 2.5);
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3; this.pen.cone(Math.cos(a) * 5, Math.sin(a) * 5, 5, Math.cos(a) * 2, Math.sin(a) * 2, 0, 1.7, c); }
    this.pen.at();
    for (let i = 0; i < 3; i++) { const a = -t * 2 + i * TAU / 3; this.arc(x, y, z, r, r + 1.6, a, a + 1.1, c, .7); }
  },
  _drawProps() {
    const M = this._propMesh, cam = this.camera; let nc = 0, nb = 0;
    for (const p of this.props) {
      if (p.mesh) { toThree(p.x, p.y, p.z, p.mesh.position); p.mesh.quaternion.copy(quatToThree(p.q, _pq)); continue; }
      if (!cam.sees(p.x, p.y, p.z - 8)) continue;
      quatToThree(p.q, _pq); if (p.kind === 'barrel') _pq.multiply(_rotZY);   // (the barrel's cylinder stands along Rapier's y, three's along its own y)
      _m4.compose(toThree(p.x, p.y, p.z, _pv), _pq, _ps);
      if (p.kind === 'crate') M.crate.setMatrixAt(nc++, _m4); else M.barrel.setMatrixAt(nb++, _m4);
    }
    M.crate.count = nc; M.barrel.count = nb; M.crate.instanceMatrix.needsUpdate = M.barrel.instanceMatrix.needsUpdate = true;
    const k = 1 - (this._al ?? 1);   // (moving platforms part way between steps, as their riders are)
    for (const q of this.platforms) { const w = q._ip, m = w && k && Math.abs(w[0] - q.x) + Math.abs(w[1] - q.y) + Math.abs(w[2] - q.z) < 40 ? k : 0; toThree(q.x + (m ? (w[0] - q.x) * m : 0), q.y + (m ? (w[1] - q.y) * m : 0), q.z - q.h / 2 + (m ? (w[2] - q.z) * m : 0), q.mesh.position); }
  },
  /** the frame's arcs, glows (the first four lit) and the game's particles; your lights */
  _effects(v) {
    const Q = this._queue, B = this.B;
    Q.arcs.forEach((a, i) => this._arcs.set(i, ...a)); this._arcs.hideFrom(Q.arcs.length);
    let nl = 0;
    for (const [x, y, z, r, color, core, lit] of Q.glows) {
      _pa[0] = x / U; _pa[1] = z / U; _pa[2] = y / U; const c = lin(color);
      B.halo.ball(_pa, r * 1.6 / U, r * 1.6 / U, r * 1.6 / U, [c[0] * .5, c[1] * .5, c[2] * .5]); B.glow.ball(_pa, r * .6 / U, r * .6 / U, r * .6 / U, lin(core));
      if (lit && nl < this._glowLights.length) { const L = this._glowLights[nl++]; L.position.set(_pa[0], _pa[1], _pa[2]); L.color.set(color); L.intensity = 10; }
    }
    for (let k = nl; k < this._glowLights.length; k++) this._glowLights[k].intensity = 0;
    Q.arcs.length = 0; Q.glows.length = 0;
    // the game's particles: tiny quads facing the camera (sparks, embers, glints, impacts add light; dust and bits are
    // solid); rings lie on the ground; text goes on the HUD (_texts)
    const PT = this.part; for (const b of Object.values(PT)) b.begin();
    let nrg = 0;
    const quad = (Bt, x, y, z, r, col) => { const s = r / U; Bt.put(v.right.x * s, v.right.y * s, v.right.z * s, v.up.x * s, v.up.y * s, v.up.z * s, v.back.x, v.back.y, v.back.z, x / U + v.back.x * .05, z / U + v.back.y * .05, y / U + v.back.z * .05, col); };
    const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
    for (const p of this.game.particles.list) {
      const u = p.life / p.max;
      switch (p.kind) {
        case 'spark': quad(PT.add, p.x, p.y, p.z, (p.size > 1.5 ? 1.4 : 1) * (1 - u * .5), lin(u < .5 ? (p.hot || '#fff5cf') : p.color)); break;
        case 'ember': quad(PT.add, p.x, p.y, p.z, .9, mul(lin(u < .4 ? '#fff0b0' : p.color), 1 - u * .8)); break;
        case 'glint': { const k = (1 - Math.abs(u * 2 - 1)) * p.size * 2.5; if (k > .2) quad(PT.add, p.x, p.y, p.z, k * .7, lin(p.color)); break; }
        case 'impact': quad(PT.add, p.x, p.y, p.z, p.size * (u < .35 ? 1 : 1.4 - u), lin(u < .35 ? '#ffffff' : p.color)); break;
        case 'fire': quad(PT.add, p.x, p.y, p.z, p.size * (u < .3 ? .6 + u * 1.4 : 1.02 - (u - .3) * .5), lin(u < .15 ? '#fffbe0' : u < .3 ? '#ffe070' : u < .5 ? '#ffa030' : u < .7 ? '#e0502a' : '#5a4a4a')); break;
        case 'bit': quad(PT.bit, p.x, p.y, p.z, p.size * .5, lin(p.color)); break;
        case 'ring': if (nrg < 48) { const rr = lerp(p.r0, p.r1, E.ease.outQuad(u)); this._rings.set(nrg++, p.x, p.y, p.z, rr - .7, rr + .7, 0, TAU, p.color, 1 - u); } break;
        case 'text': break;
        default: quad(PT.solid, p.x, p.y, p.z, p.size * (1 + u * 1.4) * (1 - u * .6), lin(p.color || '#b9a88f'));   // dust, smoke
      }
    }
    this._rings.hideFrom(nrg);
    for (const b of Object.values(PT)) b.end(false);
  },
  /** the game's text particles (damage numbers, words) on the HUD where the camera sees them */
  _texts(r) {
    for (const p of this.game.particles.list) {
      if (p.kind !== 'text') continue;
      const u = p.life / p.max; if (!(u < .75 || Math.floor(p.life * 20) % 2)) continue;
      const s = this.project(p.x, p.y, p.z); if (!s) continue;
      r.overlay(g => E.font.text(g, p.text, Math.round(s[0]), Math.round(s[1]), p.color, { align: 'center', scale: p.scale || 1, outline: '#0b0814' }));
    }
  },
  /** draw everything once, empty (scaled to nothing), so every material builds its shaders and GPU pipelines now, shadow
   *  passes too, and none stalls a frame mid-game */
  _warmUp(cam, view) {
    this._warm = true;
    this._arcs.prepare(8); this._rings.prepare(12); this._ribbons.prepare(6); this.atlas.prepare(view, 1);
    const Z = new THREE.Matrix4().makeScale(0, 0, 0), M = this._propMesh, inst = [M.crate, M.barrel];
    for (const b of [...Object.values(this.B), ...Object.values(this.part), ...(this.overlay ? Object.values(this.overlay.pen.B) : [])]) { inst.push(b.mesh); if (b.shell) inst.push(b.shell); }
    for (const pg of this.atlas.pages) inst.push(pg.mesh);
    inst.push(this._shapeKit.probe, this._shapeKit.probeShell);   // (the shapes' shaders, before any is placed)
    const counts = inst.map(m => m.count), pools = [...this._arcs.list, ...this._rings.list, ...this._ribbons.list], vis = pools.map(m => m.visible);
    for (const m of inst) { m.setMatrixAt(0, Z); m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.needsUpdate = true; m.count = 1; }
    for (const m of pools) m.visible = true;
    const sh = this._shadowLights.map(L => [L.castShadow, L.intensity]), gl = this._glowLights.map(L => L.intensity), ul = this._userLights.map(L => L.intensity), sp = this._spots.map(L => [L.castShadow, L.intensity]);
    for (const L of [...this._shadowLights, ...this._glowLights, ...this._userLights, ...this._spots]) { L.intensity = Math.max(L.intensity, .001); }
    this._shadowLights.forEach(L => { L.castShadow = true; }); this._spots.forEach(L => { L.castShadow = this.shadows; });
    const capes = this.capes.mesh, cd = capes.geometry.drawRange.count, cv = capes.visible; capes.geometry.setDrawRange(0, 6); capes.visible = true;
    const ovHid = []; if (this.overlay) this.overlay.scene.traverse(x => { if (!x.visible) { ovHid.push(x); x.visible = true; } });
    const ovOn = this.overlay && this.overlay.on; if (this.overlay) this.overlay.on = true;
    this._render(cam);
    for (const x of ovHid) x.visible = false; if (this.overlay) this.overlay.on = ovOn;
    capes.geometry.setDrawRange(0, cd); capes.visible = cv;
    this._shadowLights.forEach((L, i) => { L.castShadow = sh[i][0]; L.intensity = sh[i][1]; }); this._glowLights.forEach((L, i) => { L.intensity = gl[i]; }); this._userLights.forEach((L, i) => { L.intensity = ul[i]; }); this._spots.forEach((L, i) => { L.castShadow = sp[i][0]; L.intensity = sp[i][1]; });
    inst.forEach((m, i) => { m.count = counts[i]; }); pools.forEach((m, i) => { m.visible = vis[i]; });
  },
  /** build every shader now (a boot step): one warm-up frame drawn off the record (three r182's compileAsync leaves a
   *  light's shadow without its map, so the warm-up draws instead) */
  prepare() {
    if (!PAGE.renderer) return this;
    const rw = this._fit(); this.camera.update(0); const cam = this.camera.place(rw[0], rw[1]);
    this._frameExtras(cam, rw);
    if (!this._warm) this._warmUp(cam, this.camera.cardView());
    return this;
  },
  /** free the world: its physics, meshes, materials and textures (the page's renderer stays for the next world) */
  dispose() {
    if (this.pw) { this.pw.free(); this.pw = null; }
    this.atlas.dispose();
    this.scene.traverse(o => { if (o.isMesh) { o.geometry && o.geometry.dispose(); } });
    for (const x of this._owned) if (x && x.dispose) x.dispose();
    PAGE.worlds.delete(this);
  }
});
/** a blob shadow on the surface under a body (smaller and lighter the higher the body is above it) */
function shadowAt(world, x, y, z, r, a) {
  const f = world.floorAt(x, y, z + 1); if (f <= world.bottom + 1) return;
  const up = Math.max(0, z - f), k = Math.max(.35, 1 - up / 80), sh = P3[23];
  sh[0] = x / U; sh[1] = (f + .2) / U; sh[2] = y / U; world.B.blob.ball(sh, r * k / U * a, 1, r * k * .8 / U * a, BLACKISH);
}
/** does the segment a -> b (engine units) pass through the box [x0, y0, z0] - [x1, y1, z1]? (slabs) */
function segBox(a, b, x0, y0, z0, x1, y1, z1) {
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) {
    const lo = k === 0 ? x0 : k === 1 ? y0 : z0, hi = k === 0 ? x1 : k === 1 ? y1 : z1, d = b[k] - a[k];
    if (Math.abs(d) < 1e-9) { if (a[k] < lo || a[k] > hi) return false; continue; }
    let u = (lo - a[k]) / d, v = (hi - a[k]) / d; if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false;
  }
  return true;
}
const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();

/* =============================================================================
 * 10b. FILTERS  one look over the finished picture: world.filter = { look, apply, bloom, fxaa, ... } (change it any time)
 *   look 'clean'   no filter: the scene goes straight to the screen (no extra pass)
 *        'cel'     Comic cel: light in a few flat bands (bands), colors pushed (punch), ink where the picture changes
 *                  sharply (ink: strength, inkW: width) and round every character's and thing's silhouette
 *        'pixel'   square blocks (px: the block in the picture's pixels), a few levels per channel (levels), ordered
 *                  dithering between them (dither)
 *   apply 'all' | 'objects' (the characters, things and props only) | 'env' (the level only)
 *   bloom: bright parts glow; fxaa: edges smoothed. All in TSL, the same on WebGPU and WebGL 2. With a filter on, the
 *   scene draws a mask of its characters and things beside the picture (MRT), which is how a filter takes them alone
 * ============================================================================= */
const FX_DEFAULT = { look: 'clean', apply: 'all', bands: 4, ink: .9, inkW: 1.5, punch: 1.3, px: 4, levels: 8, dither: .35, bloom: false, fxaa: false };
const fxOn = f => f.look === 'cel' || f.look === 'pixel' || f.bloom || f.fxaa;
function makeFX(world) {
  const { pass, mrt, output, rtt, float, vec2, vec3, vec4, uv, uniform, floor, mod, abs, max, min, mix, select, smoothstep, luminance, saturation, sRGBTransferOETF } = TSL;
  const UF = { bands: uniform(4), ink: uniform(.9), inkW: uniform(1.5), punch: uniform(1.3), px: uniform(4), levels: uniform(8), dither: uniform(.35), apply: uniform(0), texel: uniform(new THREE.Vector2(1, 1)), qtexel: uniform(new THREE.Vector2(1, 1)) };
  const post = new THREE.PostProcessing(PAGE.renderer); post.outputColorTransform = false;   // (the filters end in display colors themselves)
  const scenePass = pass(world.scene, world.camera.persp); scenePass.setMRT(mrt({ output, mask: float(0) }));
  const colTex = scenePass.getTextureNode('output'), maskTex = scenePass.getTextureNode('mask'), INK = vec3(.047, .031, .094);
  const sceneAt = u => sRGBTransferOETF(colTex.sample(u).rgb), maskAt = u => maskTex.sample(u).r;
  const keep = m => select(UF.apply.equal(0), float(1), select(UF.apply.equal(1), m, float(1).sub(m)));
  function cel() {
    const u = uv(), c = sceneAt(u), l = luminance(c);
    const q = max(floor(l.mul(UF.bands).add(.5)), .5).div(UF.bands), banded = c.mul(q.div(max(l, .002))), punched = saturation(banded, UF.punch);
    const o = UF.texel.mul(UF.inkW), m = maskAt(u); let edge = float(0), rim = float(0);
    for (const d of [vec2(o.x, 0), vec2(o.x.negate(), 0), vec2(0, o.y), vec2(0, o.y.negate())]) { edge = max(edge, luminance(sceneAt(u.add(d))).sub(l)); rim = max(rim, m.sub(maskAt(u.add(d)))); }
    return mix(c, min(max(mix(punched, INK, max(smoothstep(.16, .36, edge), rim).mul(UF.ink)), vec3(0)), vec3(1)), keep(m));
  }
  function pixel() {
    const u = uv(), res = vec2(1).div(UF.texel), blk = floor(u.mul(res).div(UF.px)), cu = blk.add(.5).mul(UF.px).div(res), c = sceneAt(cu);
    const b2 = (x, y) => abs(x.sub(y)).mul(2).add(y), bayer = b2(mod(blk.x, 2), mod(blk.y, 2)).mul(4).add(b2(mod(floor(blk.x.div(2)), 2), mod(floor(blk.y.div(2)), 2))).add(.5).div(16).sub(.5);
    const L = UF.levels.sub(1), q = floor(c.mul(L).add(bayer.mul(UF.dither)).add(.5)).div(L), m = select(UF.apply.equal(1), maskAt(cu), maskAt(u));
    return mix(sceneAt(u), min(max(q, vec3(0)), vec3(1)), keep(m));
  }
  const W9 = [.227, .194, .121, .054, .016];
  function bloom() {
    const bright = rtt(vec4(sceneAt(uv()).mul(smoothstep(.72, 1, luminance(sceneAt(uv())))), 1), 1, 1);
    const blur = (src, dir) => { let acc = src.sample(uv()).rgb.mul(W9[0]); for (let i = 1; i < 5; i++) acc = acc.add(src.sample(uv().add(dir.mul(i * 1.6))).rgb.mul(W9[i])).add(src.sample(uv().sub(dir.mul(i * 1.6))).rgb.mul(W9[i])); return rtt(vec4(acc, 1), 1, 1); };
    const hh = blur(bright, vec2(UF.qtexel.x, 0)), v = blur(hh, vec2(0, UF.qtexel.y));
    return { targets: [bright, hh, v], glow: v.sample(uv()).rgb };
  }
  function fxaa(src) {
    const u = uv(), t = UF.texel, L = p => luminance(src.sample(p).rgb);
    const nw = L(u.add(vec2(-1, -1).mul(t))), ne = L(u.add(vec2(1, -1).mul(t))), sw = L(u.add(vec2(-1, 1).mul(t))), se = L(u.add(vec2(1, 1).mul(t))), m = L(u);
    const lo = min(m, min(min(nw, ne), min(sw, se))), hi = max(m, max(max(nw, ne), max(sw, se))), dir0 = vec2(nw.add(ne).sub(sw.add(se)).negate(), nw.add(sw).sub(ne.add(se)));
    const reduce = max(nw.add(ne).add(sw).add(se).mul(.25 / 8), 1 / 128), rcp = float(1).div(min(abs(dir0.x), abs(dir0.y)).add(reduce)), dir = min(vec2(8), max(vec2(-8), dir0.mul(rcp))).mul(t);
    const a = src.sample(u.add(dir.mul(1 / 3 - .5))).rgb.add(src.sample(u.add(dir.mul(2 / 3 - .5))).rgb).mul(.5), b = a.mul(.5).add(src.sample(u.add(dir.mul(-.5))).rgb.add(src.sample(u.add(dir.mul(.5))).rgb).mul(.25)), lb = luminance(b);
    return select(lb.lessThan(lo).or(lb.greaterThan(hi)), a, b);
  }
  const OBJ_MASK = mrt({ mask: float(1) }), sz = new THREE.Vector2();
  let targets = [], key = '', tagged = false;
  return {
    /** tag the world's characters and things for the mask (only while a filter is on: a material with its own MRT
     *  outputs can't draw straight to the screen) */
    tag(on) { if (on === tagged) return; tagged = on; for (const m of world._objMats) { m.mrtNode = on ? OBJ_MASK : null; m.needsUpdate = true; } world._warm = false; },
    render(cam) {
      const F = world.filter, k = [F.look, F.bloom, F.fxaa].join();
      if (k !== key) {
        key = k; let col = F.look === 'cel' ? cel() : F.look === 'pixel' ? pixel() : sceneAt(uv()); targets = [];
        if (F.bloom) { const b = bloom(); targets = b.targets; col = col.add(b.glow.mul(.6)); }
        if (F.fxaa) col = fxaa(rtt(vec4(col, 1)));
        post.outputNode = vec4(col, 1); post.needsUpdate = true; world._warm = false;
      }
      PAGE.renderer.getDrawingBufferSize(sz); UF.texel.value.set(1 / sz.x, 1 / sz.y);
      const qw = Math.max(1, Math.round(sz.x / 4)), qh = Math.max(1, Math.round(sz.y / 4));
      for (const t of targets) if (t.width !== qw || t.height !== qh) t.setSize(qw, qh);
      UF.qtexel.value.set(1 / qw, 1 / qh);
      for (const n of ['bands', 'ink', 'inkW', 'punch', 'px', 'levels', 'dither']) UF[n].value = F[n];
      UF.apply.value = F.apply === 'objects' ? 1 : F.apply === 'env' ? 2 : 0;
      scenePass.camera = cam; post.render();
    }
  };
}
Object.assign(World3D.prototype, {
  /** draw the picture: straight to the screen, or through the filter */
  _render(cam) {
    const on = !this._vp && fxOn(this.filter);   // (no filter in a split screen's viewports)
    if (on || this._fx) { this._fx = this._fx || makeFX(this); this._fx.tag(on); }
    if (on) this._fx.render(cam); else PAGE.renderer.render(this.scene, cam);
    const ov = this.overlay;
    if (ov && ov.on && !this._vp) { const R = PAGE.renderer; R.autoClear = false; R.clearDepth(); R.render(ov.scene, ov.camera); R.autoClear = true; }
  }
});

/* =============================================================================
 * 11. THE ENGINE'S HANDLES  E.World3D (init, the registries, the input preset and settings), E.THREE, E.TSL, E.RAPIER
 * ============================================================================= */
/** load three.js's renderer and Rapier once for the page (await it in a boot step): the 3D canvas under the game's.
 *  o: { backend: 'webgl' (force WebGL 2; the address's ?backend=webgl does too), canvas (a canvas or its id: #view by
 *  default, made if missing), render: false (physics only: no picture) } */
World3D.init = init;
/** the drawings of things by kind: (pen, thing, time) => { pen.box(...)... } (section 5). Add your own kinds */
World3D.THINGS = THINGS;
/** the ground's looks by name (section 2): (x, y, entry) -> [r, g, b] or [r, g, b, glow]. Add your own */
World3D.GROUND = GROUND;
/** the sides' looks by name (section 2): { w, h, fn(x, y, colors) }. Add your own */
World3D.SIDE = SIDE;
/** the controls a 3D action game starts from (new E.Game({ input: E.World3D.INPUT })): WASD or the arrows or the left
 *  stick move, Space or A jumps, J or a click or X attacks, Shift or K or B dashes, E or L or a right click or Y uses a
 *  skill, Q or Tab or the left bumper locks on (camera.lock), C or the right stick's click changes the camera; the menu
 *  keys of the 2D engine's presets */
World3D.INPUT = Object.assign({}, E.Input.DEFAULT, {
  jump: ['Space', 'Pad0'], attack: ['KeyJ', 'Mouse0', 'Pad2', 'Pad7'], dash: ['ShiftLeft', 'ShiftRight', 'KeyK', 'Pad1', 'Pad6'],
  skill: ['KeyE', 'KeyL', 'Mouse2', 'Pad3', 'Pad5'], lock: ['KeyQ', 'Tab', 'Pad4'], camera: ['KeyC', 'Pad11']
});
/** the player's 3D settings for the pause menu (new E.Game({ menu: { settings: E.World3D.SETTINGS } })): Characters
 *  (cards or puppets), 3D picture (pixels, balanced, full), Shadows and Filter, read by every world as it draws */
World3D.SETTINGS = [
  { key: 'look3d', label: 'Characters', group: 'Display', value: 'card', options: [['card', 'Drawn (cards)'], ['puppet', '3D (puppets)']], help: 'Cards are drawn exactly as in the 2D games; puppets are 3D parts on the same bones, in the scene\'s light and shadow.' },
  { key: 'picture3d', label: '3D picture', group: 'Display', value: 'pixels', options: [['pixels', 'Pixels'], ['balanced', 'Balanced'], ['full', 'Full']], help: 'Pixels: the game\'s own resolution, chunky and fast. Full: the screen\'s.' },
  { key: 'shadows3d', label: 'Shadows', group: 'Display', value: true, help: 'Torches and the sun cast real shadows.' },
  { key: 'filter3d', label: 'Filter', group: 'Display', value: 'clean', options: [['clean', 'None'], ['cel', 'Comic cel'], ['pixel', 'Pixel']], help: 'A look over the whole picture: comic-book ink and flat light, or big dithered pixels.' }
];
/** the Controls setting of a game that offers tank controls (game.settings.define(E.World3D.CONTROLS), or in menu.settings):
 *  camera.steer reads it */
World3D.CONTROLS = { key: 'tank3d', label: 'Tank controls', group: 'Game', value: false, help: 'Up walks forward the way your character faces, down backs away, left and right turn it, whatever the camera does. Off: the stick moves it the way the camera looks.' };
Object.defineProperties(World3D, {
  /** 'WebGPU' | 'WebGL 2' | 'none': what draws the 3D picture (after init) */
  backend: { get: () => PAGE.backend },
  /** the page's three.js renderer (after init), null without a picture */
  renderer: { get: () => PAGE.renderer },
  /** the worlds alive now */
  worlds: { get: () => [...PAGE.worlds] }
});
/** U: engine units per metre (16); toThree(x, y, z): engine units -> a three.js Vector3 in metres (y up) */
World3D.U = U; World3D.toThree = toThree; World3D.hashNumbers = hashNumbers;
E.World3D = World3D; E.THREE = THREE; E.TSL = TSL; E.RAPIER = RAPIER;
export { World3D, THREE, TSL, RAPIER };
export default World3D;
