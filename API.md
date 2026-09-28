# my-3D2dge API card (v0.5.0)

my-3D2dge ("My 3D 2D Game Engine") is a general-purpose retro-modern 2D game engine built for AI models. Use it to port, remaster, reimagine and remix games from the 8-bit to 64-bit eras (NES, SNES, Genesis, N64, PS1), or to make spiritual successors to them. Everything is drawn by code: no image or sound files. Characters are 3D skeletons drawn as pixel art, and the camera can be any classic 2D view.

**In the single file:** this card, the engine script (do not edit it), and a starter game between `GAME START` and `GAME END`. The starter has a title menu and four vertical slices: ADVENTURE (Zelda-like), PLATFORMER (Mario / Mega Man), SHOOTER (1942 / Xevious) and RPG BATTLE (Dragon Quest / Final Fantasy). **To make a game, copy the slice closest to your genre, then replace everything between `GAME START` and `GAME END` with only your game: its own title scene, play scene(s) and game-over scene. Delete the starter's menu and the slices you do not use.**

## Quick start (a complete game)
```js
(() => {
const E = My3D2dge, { px, clamp } = E;            // always start like this
const game = new E.Game({ canvas: 'screen', res: 'snes', view: 'threequarter' });
const map = new E.TileMap({
  rows: ['##########', '#@...s...#', '#..##....#', '#........#', '##########'],
  legend: { '#': 1, '@': 'hero', 's': 'slime' },  // number = wall type, string = spawn tag
  types: { 1: { h: 30, top: '#57506a', side: '#3d3750' } },
  floorTex: (x, y) => E.tex.flagstone(x, y, { stones: ['#4b4559', '#554f64'].map(E.hex), mortar: E.hex('#221e2b'), hi: E.hex('#6f6782'), lo: E.hex('#322d3e'), speck: E.hex('#2a2634') })
});
game.cam.bounds = v => map.bounds(v);
const s = map.find('hero'), hero = new E.Body({ x: s.x, y: s.y, r: 5 });
const rig = new E.Humanoid({ hat: 'pointed' });
game.start({
  update(dt) {
    const m = game.input.move(), d = game.view.screenDirToGround(m[0], m[1]);
    hero.vx = d[0] * 80; hero.vy = d[1] * 80; hero.update(dt, map);
    if (Math.hypot(d[0], d[1]) > .1) hero.facing = Math.atan2(d[1], d[0]);
    rig.update(dt, { x: hero.x, y: hero.y, z: hero.z, vx: hero.vx, vy: hero.vy, facing: hero.facing || 0 });
    game.focus(hero.x, hero.y, 10);                // the camera looks here: call every update
  },
  draw(r) {
    map.drawFloor(r); r.shadow(hero.x, hero.y, 5); map.queueWalls(r);
    r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
    r.text('HELLO', 4, 4, '#ffffff');              // HUD text in screen pixels
  }
});
})();
```

## Coordinates: what x, y, z mean in each view
World units: one tile = 16. **z is always up.** Game logic never stores screen pixels.

| View | Looks like | Ground plane | Use for levels | Move with |
|---|---|---|---|---|
| `'iso'` (yaw 45, pitch 30) | Diablo, Landstalker | x/y ground, z up | `E.TileMap` | `E.Body` |
| `'threequarter'` (pitch 55) | Zelda LttP, Stardew | x right, y down the screen | `E.TileMap` | `E.Body` |
| `'topdown'` (pitch 80) | GTA 1, Hotline Miami | x right, y down | `E.TileMap` | `E.Body` |
| `'brawler'` (pitch 25) | Final Fight, 2.5D | x right, y into the screen | `E.TileMap` or `E.PlatformMap` | `E.Body` or `E.Platformer` |
| `'side'` (pitch 0) | Mario, Mega Man | **x right, z up, y = 0 (depth)** | `E.PlatformMap` | `E.Platformer` |
| `'overhead'` (pitch 90, scale 1) | 1942, Tetris, Pac-Man | x = screen x px, y = screen y px | none, or a TileMap | your own x/y, or `E.Body` |

- In `'side'` the screen shows x (right) and z (up). **y is depth and is normally 0.** Focus the camera with `game.focus(hero.x, 0, hero.z + 24)`.
- In ground views, the screen direction the player pushes becomes a world direction through `game.view.screenDirToGround(mx, my)`.
- `r.actor(x, y, z, (g, ox, oy) => ...)` calls your function with `(ox, oy)` = the buffer pixel where world point (x, y, z) lands. Draw the character around that point.

## Rules
1. Keep game logic in world units, and use `dt` everywhere. `update(dt)` runs in fixed steps of about 1/120 s.
2. Draw only with `E.px.*`, `E.font`, `E.ui`, sprites and the `r.*` helpers. Never use `ctx.arc`, `ctx.stroke`, `ctx.fillText`, gradients or alpha fades on the game buffer.
3. Anything that can overlap anything else goes through `r.actor`, `r.sprite` or `r.queue` (depth sorted). Backgrounds (`r.sky`, `map.drawFloor`, `level.draw`) come first in `draw`.
4. Read input only in `update`. Use `pressed(a)` for one-shot actions (menus, jumps, shots), `down(a)` for held actions, and `buffered(a)` + `consume(a)` for forgiving combat input.
5. Animate from continuous values (velocity, timers, easing), never from frame lists.
6. Colors are `'#rrggbb'` (or `'#rgb'`) strings.
7. Put the whole game in one IIFE `(() => { ... })();` between the markers, and start it with `game.start(...)`.

## Common mistakes (check these first)
- Nothing on screen: the camera looks at the wrong place. Call `game.focus(...)` every update. In side view focus `(x, 0, z)`.
- Walls or level missing: you forgot `map.drawFloor(r)` + `map.queueWalls(r)` (TileMap) or `level.draw(r)` (PlatformMap).
- Using a TileMap for a side-scroller. Side-scrollers use `E.PlatformMap` + `E.Platformer`.
- HUD drawn in world coordinates. Use `r.text(...)` or `r.overlay(g => ...)` with screen pixels (`r.W`, `r.H`).
- An old key layout: platformers want `input: 'PLATFORMER'` (Space jumps), shooters `input: 'SHMUP'` (Space fires).
- Errors show in a red box on screen and in the console. Fix the first one first.

## Game
`new E.Game({ canvas: 'screen', view, views, res, input, bg })`
- `res`: `'nes'` 256x240, `'snes'` 256x224, `'genesis'` 320x224, `'gb'` 160x144, `'gba'` 240x160, `'ps1'` / `'n64'` 320x240, `'wide'` 400x225, or `[w, h]`. Fixed pixels, whole-number scaling. Leave it out for an adaptive size.
- `input`: `'DEFAULT'` (top-down action), `'PLATFORMER'`, `'SHMUP'`, or your own `{ action: ['KeyQ', 'Pad0'] }`.
- `views`: the views your game supports; `game.nextView()` cycles them (bind it to a key).
- Start: `game.start({ update(dt), draw(r) })`, or with scenes (below).
- Methods: `focus(x, y, z)`, `setView(id)`, `nextView()`, `freeze(s)` (hit-stop), `shake(n)`, `after(s, fn)`, `every(s, fn)` (timers in game time, return `{ cancel() }`), `mouseGround()`, `go(scene, data)`, `enableGPU({ map })`.
- Fields: `W`, `H` (screen pixels), `time`, `real`, `timeScale` (0.25 = slow motion), `paused`, `input`, `audio`, `particles`, `lights`, `view`, `errors`, `cam`.
- Camera: `cam.bounds = v => map.bounds(v)` keeps it inside the level; `cam.room = [160, 128]` moves screen by screen (Zelda, Metroid) and `cam.moving` is true while it slides; `cam.smooth` = lag in seconds.

## Scenes (title, play, game over)
```js
game.start({ scene: 'title', scenes: {
  title: { update(dt) { if (game.input.pressed('start')) game.go('play', { level: 1 }); },
           draw(r) { r.sky(['#101848', '#402a70']); r.text('PRESS START', r.W / 2, 100, '#fff', { align: 'center', scale: 2 }); } },
  play: { pausable: true, view: 'side', input: 'PLATFORMER', res: 'snes', views: ['side', 'brawler'], touch: ['jump', 'attack'],
          enter(data) { /* build the level */ }, exit() {}, update(dt) {}, draw(r) {} }
} });
```
`game.go(name, data)` switches before the next step; timers and particles are cleared. `pausable: true` lets Escape / P / Start pause it (a PAUSED screen is drawn for you). `view`, `views`, `input`, `res`, `touch` are applied on entry.

## Input: `game.input`
- Actions in every preset: `up down left right` (WASD, arrows, d-pad), `start` (Enter, Start), `pause` (Escape, P, Start), `confirm` (Enter, Space, J, Z, pad A), `cancel` (Escape, Backspace, X, K, pad B).
- DEFAULT adds `attack` (J, X, click), `dash` (Space, Shift, K), `skill` (L, E, right click), `jump` (Z). PLATFORMER: `jump` (Space, Z, K, pad A), `attack` (X, J, click), `dash` (Shift, C, L), `skill`. SHMUP: `fire` (Space, Z, J, click), `bomb` (X, K).
- `down(a)`, `pressed(a)`, `released(a)`, `repeat(a, delay, rate)` (menus), `buffered(a, win)` + `consume(a)`, `consumeAll()`, `anyPressed()`, `move()` (screen direction `[x, y]`, length up to 1), `use(preset)`, `touchButtons(['jump', 'attack'])`.

## Drawing: `r` in `draw(r)`
- Background: `r.sky(['#top', '#mid', '#bottom'])`, `r.starfield({ count, speed, dir: 'down' | 'left' })`.
- Depth sorted: `r.actor(x, y, z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { flash, alpha, xray, outline, ghost, emissive })`, `r.sprite(x, y, z, sprite, { flip, anchor: 'bottom' | 'center', glow, flash })`, `r.queue(x, y, z, g => {...}, { bias })`, `r.box(g, x0, y0, z0, x1, y1, z1, top, side)` (inside a queue function).
- Floor marks: `r.shadow(x, y, radius, alpha, color, surfaceZ)`, `r.decal(g => r.groundArc(...))`, `r.groundDisc`, `r.groundRing`, `r.groundPts(x, y, rad, n, z)`.
- On top, unlit, screen pixels: `r.text(str, x, y, color, { align, scale, outline })`, `r.textAt(x, y, z, str, color)`, `r.overlay(g => {...})`.
- `r.w(x, y, z)` = buffer pixel of a world point. `r.W`, `r.H`, `r.ix`, `r.iy` (pass to dither functions), `r.view`, `r.visible(x, y, z)`.

## Pixels, sprites, text, UI
- `px.rect(g, x, y, w, h, c)`, `dot`, `line(g, x0, y0, x1, y1, c, width)`, `disc(g, x, y, r, c)`, `ell`, `poly(g, pts, c)`, `polyDither(g, pts, c, 0..1, r.ix, r.iy)`, `ddisc`, `sprite(g, spr, x, y, flip)`, `glow(g, 0..1)` (GPU glow for what follows).
- Sprites from strings (for coins, bullets, ships, icons, NES-style enemies): `const COIN = E.sprite(['.yy.', 'yYYy', '.yy.'], { y: '#f0b020', Y: '#fff0a0' }, scale)`. `.` and space are transparent.
- Font (3x5, upper case): `E.font.text(g, str, x, y, color, { outline, scale, align, wrap })`, `E.font.width(str, scale)`, `E.font.wrap(str, maxW)`. Glyphs: A-Z 0-9 and `+ - ! . : / ? , ' " ( ) % * = < > # & _ ; [ ] $ ^ @ ~ ♥ ★ ← → ↑ ↓`.
- UI (inside `r.overlay(g => ...)`): `E.ui.box(g, x, y, w, h)`, `E.ui.bar(g, x, y, w, h, 0..1, color)`, `E.ui.hearts(g, x, y, hp, max)` (half hearts allowed).
- Dialog: `const talk = new E.Dialog(game)`; `talk.say(['Line one.', 'Page two.'], { name: 'ELDER', onDone, choices: ['YES', 'NO'], onChoice(i) })`; in update `if (talk.update(dt)) return;`; in draw `talk.draw(r)`.
- Menu: `const menu = new E.Menu(game, ['START', { label: 'LOAD', disabled: true }], { x: 'center', y: 100, title, onPick(i, item), onCancel })`; `menu.update(dt)`; `menu.draw(r)`.

## Sound: `game.audio` (chip synth, no files, starts after the first key press)
- `sfx(name, { vol, pitch })`. Presets: `jump jump2 land step coin pickup key powerup oneup heal hit hurt stomp bump swing shoot laser charge explode boom door secret warp die select confirm cancel pause text blip`.
- Custom: `sfx({ wave: 'square' | 'pulse' | 'pulse12' | 'triangle' | 'saw' | 'sine' | 'noise', freq: 440 or 'A4', to: 880, dur: .2, vol: .3, arp: [0, 4, 7], step: .05, vib: [8, .03] })`, or `audio.define('zap', voice)`.
- Music: `music('title' | 'adventure' | 'dungeon' | 'boss' | 'victory')` (built in), or your own `{ bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .15, notes: 'C5 - E5 - G5 . . . | ...' }, { wave: 'triangle', notes: '...' }, { wave: 'drums', notes: 'k . h . s . h .' }] }`. Tokens: a note (`C4`, `F#3`, `Bb2`), `-` holds, `.` rests, `|` is ignored; drums `k s h o c t`. `music(null)` stops. `mute()`, `setVolume(0..1)`.

## Levels
**TileMap** (top-down, isometric, brawler): walls stand on the ground plane.
- `new E.TileMap({ rows, legend, types, floorTex })`. `types[id] = { h, top, side, line, course, cut: true, cutH }` (`cut` lowers walls that block the camera). `floorTex(x, y, floorTag)` returns `[r, g, b]` (or `[r, g, b, glow]`); ready-made: `E.tex.flagstone`, `grass`, `dirt`, `water`, `planks`, `checker`, `plain`.
- Legend values: a number = wall type, a string = spawn tag, `{ tile, floor, spawn }` for both.
- `find(tag)` / `findAll(tag)` give `{ x, y, z, cx, cy }`. Also `cell(cx, cy)`, `set(cx, cy, id)` (open doors), `toCell(x, y)`, `center(cx, cy)`, `heightAt(x, y)`, `floorAt(x, y)`, `groundAt(x, y, r, z)`, `collide(body)`, `los(x0, y0, x1, y1)`, `bounds(view)`, `drawFloor(r)`, `queueWalls(r)`.

**PlatformMap** (side-scrollers; 2.5D in tilted views): tiles on the x/z plane, top row first.
- `new E.PlatformMap({ rows, legend, types })`. `types[id] = { kind, style, side, top, line }`. Example: `rows: ['      ?    ', '   ===     ', '@  g   ^^  ', '###########']`, `legend: { '#': 1, '=': 2, '?': 3, '^': 4, '@': 'hero', 'g': 'walker' }`, `types: { 1: { style: 'ground', side: '#8a5a32' }, 2: { kind: 'oneway' }, 3: { style: 'bonus', side: '#e8a830' }, 4: { kind: 'hazard' } }`. Kinds: `'solid'` (default), `'oneway'` (jump up through), `'ladder'`, `'hazard'` (spikes, lava), `'deco'`, `'back'` (background wall). Styles: `'block' 'brick' 'ground' 'plank' 'spikes' 'ladder' 'pipe' 'bonus' 'liquid' 'plain'`.
- Spawns: `find(tag)` gives `{ x, z }` with z = the bottom of that cell (feet). `cell(cx, cz)` / `set(cx, cz, id)` count cz from the bottom row. `touching(body, 'hazard')`, `cellsTouching(body, kind)`, `groundBelow(x, z)`, `solidAt(x, z)`, `move(body, dt, solids)`, `bounds(view)`, `draw(r)` (call first, after `r.sky`), `width`, `height`.

## Movement and physics
**Platformer** (side-scroller character): `const hero = new E.Platformer({ x, z, w: 8, h: 22, run: 95, jump: 285, gravity: 800, airJumps: 0, wallJump: false, dash: 0 })`.
- Each update: `hero.update(dt, level, game.input, movingPlatforms)`. For enemies pass `{ x: -1..1, jump, jumpPressed, up, down, dash }` instead of the input.
- Read: `onGround`, `jumped`, `landed`, `facing` (1 or -1), `air`, `climbing`, `hitWall`, `hitCeiling`, `bumped` (`{ cx, cz, id }` of a block hit from below). Methods: `knock(dir)`, `rigState(extra)` (feed it to `rig.update`).
- Built in: coyote time, jump buffering, variable jump height (let go early for a short hop), ladders (up / down), drop through one-way tiles (down + jump), optional double jump, wall jump and dash.
- Moving platforms: `{ x, z, w, h, vx, vz }` boxes you move yourself and pass as `solids`; riders are carried.

**Body** (top-down / isometric / brawler): `new E.Body({ x, y, r: 5, friction: 0, bounce: 0, gravity: 700 })`. Set `vx`, `vy`, then `body.update(dt, map)`. Also `push(ix, iy, iz)` (knockback), `jump(v)`, and `onGround`, `z`, `groundZ`, `hitWall`, `landed`. Walls lower than your feet are walkable, so bodies can jump onto blocks.

**Attack** (melee timing for swords, punches, kicks): `const slash = new E.Attack({ a0: 1.6, a1: -1.7, z0: 12, z1: 9, reach: 7.5, wind: .06, active: .1, recover: .18 })`. `if (input.buffered('attack') && slash.start()) input.consume('attack')`; `slash.update(dt)` (returns the phase that just began); `slash.hits(enemies, e => E.inArc(hero, facing, e, 22, 1.4), e => {...})` hits each target once per swing during `'active'`; `rig.update(dt, { ..., attack: slash.state })`. Also `busy`, `active`, `cancel()`, `start(true)` to chain combos during recover.

**Bullets**: `const shots = new E.Bullets(game, { plane: 'ground' | 'side' })`; `shots.fire({ x, y, z, vx, vy, vz, r: 2, team: 'player', color, life, dmg, pierce, sprite })`; `shots.burst(base, E.pattern.spread(angle, n, arc, speed))`; `shots.update(dt, map)`; `shots.hit(targets, (b, t) => {...}, 'player')`; `shots.draw(r)`; `shots.clear(team)`. Patterns: `E.pattern.dir(angle, speed)`, `aim(a, b, speed)`, `aimSide(a, b, speed)`, `spread(angle, n, arc, speed)`, `ring(n, speed, offset)`. In side view the second number of a pattern velocity is vz.

**Helpers**: `E.dist(a, b)`, `E.angleTo(a, b)`, `E.overlap(a, b)` (circles x, y, r), `E.overlapBox(a, b)` (side boxes x center, z feet, w, h), `E.inArc(a, facing, b, range, halfAngle)` (melee cone), `E.rand(a, b)`, `E.randInt(a, b)`, `E.pick(list)`, `E.chance(p)`, `E.prune(list, fn)`, `E.store.get(key, fallback)` / `set(key, value)` (save data), `new E.SpatialHash(32)` (`build(list)`, `near(x, y, r, fn)`), `new E.FlowField(map)` (`update(tx, ty)`, `dir(x, y, tx, ty)` walks around walls), math `clamp lerp approach ease.* angDiff approachAng smoothDamp rng(seed) noise2 hex shade mix`.

## Characters
**Humanoid** (knights, heroes, soldiers, zombies): `new E.Humanoid({ weapon: 'sword' | 'gun' | 'staff' | null, hat: 'cap' | 'pointed' | 'helmet' | 'band' | 'crown' (or { style, color }), hood, cape: { len: 6, width: 5, seg: 2.5 }, eyeGlow, hunch, lean, colors: { skin, hair, cloth, pants, boot, belt, cape, capeIn, metal, hilt, eye } })`.
- `rig.update(dt, { x, y, z, vx, vy, facing, dash, hurt, air, point, attack })`. `facing` is an angle (side view: 0 = right, `Math.PI` = left). `air: true` tucks the legs for jumps; `point: true` holds a gun forward.
- `attack: { spec, phase: 'wind' | 'active' | 'recover', u: 0..1 }`, spec `{ a0, a1, z0, z1, reach, blade, spin, kick }`. Angles are relative to facing (+ = right hand side): a slash is `a0: 1.6, a1: -1.7`. `kick: true` swings the foot (use z0/z1 around 4..10). You time the phases.
- `rig.draw(g, ox, oy, view)` inside `r.actor`, `rig.drawSmear(r)` (sword trail), `rig.debug(r)` (skeleton), `rig.kick(v)` (squash and stretch), `rig.hand()` and `rig.tip()` (world points to spawn bullets from).
**Blob** (slimes, jellies, round enemies): `new E.Blob({ R: 6, colors: { dk, base, lt, spec, eye, pupil } })`, `update(dt, { squash: -0.4..0.4, look: [dx, dy], squint })`, `kick(v)`, `draw(g, ox, oy, view)`.

## Effects and lighting
- Particles: `game.particles.dust(x, y, z, n)`, `sparks(x, y, z, n, angle)`, `bits(x, y, z, n, colors)`, `ring(x, y, r0, r1, color, dur)`, `text(x, y, z, '12', color)`, `add({ kind: 'dust' | 'spark' | 'bit' | 'ember', ... })`.
- Canvas lighting: `game.lights.enabled = true; game.lights.ambient = .3;` then every draw `game.lights.add(x, y, z, radius, intensity, { color, shadow })`.
- GPU lighting (optional, ground views with a TileMap): `const gpu = game.enableGPU({ map })`; mark glowing things with `px.glow(g, 1)`; add `lights.caster(x, y, r, top)` and `lights.heat(x, y, z, w)`. It falls back to Canvas lighting by itself.

## Genre playbook (NES, SNES, Genesis, N64, PS1)
| Genre (examples) | View | Build it with | Copy slice |
|---|---|---|---|
| Platformer (Mario, Mega Man, Sonic, Castlevania) | `side` (+ `brawler` for 2.5D) | PlatformMap, Platformer, Humanoid, sprites, Bullets `'side'` | PLATFORMER |
| Metroidvania (Metroid, Symphony of the Night) | `side` | PlatformMap per room, `cam.room`, Platformer with `dash`, `wallJump` | PLATFORMER |
| Action adventure (Zelda, Secret of Mana) | `threequarter` or `topdown` | TileMap rows, `cam.room`, Body, Humanoid + `E.Attack` sword, Dialog, `E.ui.hearts` | ADVENTURE |
| Action RPG / dungeon (Diablo, Landstalker) | `iso` | TileMap, FlowField, Body (jump onto blocks), GPU lighting | ADVENTURE |
| Beat-'em-up (Final Fight, Streets of Rage, TMNT) | `brawler` | TileMap floor strip, Body, Humanoid + `E.Attack` punches and `kick: true` kicks, `inArc` | ADVENTURE |
| Fighting (Street Fighter II) | `side` | PlatformMap floor, two Platformers, Humanoid + `E.Attack` moves, `overlapBox` hitboxes | PLATFORMER |
| Shoot-'em-up (1942, Gradius, R-Type) | `overhead` (vertical) or `side` (horizontal) | sprites, Bullets, `E.pattern`, `r.starfield`, a timeline of waves | SHOOTER |
| Twin-stick / run-and-gun (Smash TV, Contra) | `topdown` / `side` | Body or Platformer, Bullets, `weapon: 'gun'`, `point: true` | SHOOTER + ADVENTURE |
| JRPG (Dragon Quest, Final Fantasy, EarthBound) | `threequarter` town, `brawler` battles | TileMap towns, Dialog, Menu, scenes, `E.store` saves | RPG BATTLE + ADVENTURE |
| Puzzle (Tetris, Dr. Mario, Puyo) | `overhead` | a grid array, `input.repeat`, `px.rect`, `E.font`, fixed `res` | SHOOTER (setup) |
| 3D platformer or adventure remake (Mario 64, Ocarina, Crash) | `iso` / `threequarter` / `brawler` | TileMap blocks of different heights + Body `jump()` (z is real height) | ADVENTURE |
| Racing (RC Pro-Am, Micro Machines) | `topdown` / `iso` | TileMap track (floorTex), Body with friction, cars drawn with `px.poly` on `r.w()` corner points | ADVENTURE |

**Sizes:** a hero is about 24 units tall (a Humanoid). At 256-320 px wide, player sprites read best at 14-24 px: draw small designs with `E.sprite(rows, colors, 2)`. Keep hitboxes smaller than sprites.

**Feel numbers** (world units per second, tile = 16): walk 70-90, run 95-140, jump 250-320 with gravity 800, fall cap 330, dash 200-260, bullets 250-320 (player) and 70-120 (enemy), enemy walk 25-45. Hit feedback: `game.freeze(.05)`, `game.shake(2)`, `particles.sparks`, `audio.sfx('hit')`.

## Before you hand the game back
- One IIFE between the markers, starting with `const E = My3D2dge`. Only your game: no leftover starter menu or unused slices. No other files, no network, no libraries.
- Title screen and game-over screen as scenes; `pausable: true` on gameplay scenes.
- The camera follows the player (`game.focus` every update) and shows the level; the HUD uses screen pixels.
- Sound effects on jump, hit, pickup and death; music per scene.
- If you can run commands: `node tools/check.mjs game.html` (add `#scene` to jump to a scene). It presses start, plays, cycles the views, prints how much of the screen is filled, and fails on any error.
