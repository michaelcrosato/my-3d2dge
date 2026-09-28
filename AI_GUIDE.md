# my-3D2dge guide for AI models

This guide is for an AI (or a person) asked to build, port, remaster or remix a game with my-3D2dge. `API.md` is the compact reference; it is embedded at the top of both single files (`dist/my-3d2dge.html` and `dist/my-3d2dge-compact.html`). This guide explains the ideas, the workflow for remaking a classic, recipes for each genre, and the checks to run before handing a game back. Everything here matches `engine/my-3d2dge.js` v0.5.0.

## North star

my-3D2dge is a general-purpose retro-modern 2D engine built for AI models. It exists so that any model can:

- port, remaster, reimagine and remix games from the 8-bit to 64-bit eras;
- make spiritual successors that feel like modern remasters, with better visuals, physics and controls;
- mash up mechanics across titles and genres.

It aims for **consistent quality**: the engine carries the hard parts (feel, physics, rendering, sound, UI), so each game only has to describe its rules and content.

## The mental model

1. **The world is 3D, the camera is 2D.** Game logic works in world units: x east, y south, z up, one tile = 16 units. A `View` projects world points to screen pixels. Switch the view and the same game renders as isometric, three-quarter, top-down, brawler, side-on or any custom angle.
2. **Characters are puppets, not sprite sheets.** A `Humanoid` is a 3D skeleton posed by math every step (IK legs and arms, gait from velocity, jumps, attacks, cape cloth). A `Blob` is a squashy sphere. Both project through the current view. Small objects can be string sprites (`E.sprite`).
3. **Genre kits.** Each kit handles one hard problem and knows nothing about genres, so they combine freely:
   - `TileMap` + `Body`: ground-plane levels and physics.
   - `PlatformMap` + `Platformer`: side-scrolling levels and a platformer controller.
   - `Bullets` + `E.pattern`: projectiles.
   - `Dialog` + `Menu`: text boxes and menus.
   - scenes: title, play, game over.
   - `game.audio`: chip sound.

## Remake workflow (port, remaster, reimagine, remix)

1. **Name the core loop.** Mega Man: run, jump, shoot, reach the boss. Zelda: explore rooms, fight, find keys, open doors. 1942: dodge, shoot, survive waves, beat the boss. Write it as one sentence at the top of the game.
2. **Pick the view and the kit.** Use the genre playbook in `API.md`. A side-scroller is `PlatformMap` + `Platformer` in `'side'`; a top-down game is `TileMap` + `Body`. Pick a console resolution (`res: 'nes'` or `'snes'`) so HUD pixel positions are stable.
3. **Copy the closest starter slice.** The four slices in the single file are complete games (title, gameplay, HUD, win and lose, music). Start from one and change it. Do not start from an empty file.
4. **Rebuild the content.** Levels are ASCII rows with a legend, enemies are small factories, items are sprites. Keep the original's layout ideas but make your own maps; for a remix, change the rules on purpose.
5. **Modernize.** The engine gives you most of it for free:
   - forgiving controls: coyote time, jump buffering, variable jump height, input buffering;
   - hit feedback: hit-stop, shake, sparks, damage numbers;
   - smooth animation, lighting and glow;
   - a 2.5D view (`views: ['side', 'brawler']`);
   - pause, save data, touch controls.
6. **Tune the feel** with the feel numbers in `API.md`, then check the game with the skeleton overlay (`rig.debug(r)`) and in slow motion (`game.timeScale = .25`).
7. **Verify** with the checker and look at the screenshots (see the checklist at the end).

## Hard rules

1. **Game logic in world units, `dt` everywhere.** Never store screen pixels. Convert only when drawing (`r.w(x, y, z)`) or reading the mouse (`game.mouseGround()`). `update(dt)` runs in fixed steps of about 1/120 s.
2. **Draw only with engine primitives** (`E.px.*`, `E.font`, `E.ui`, sprites, `r.*` helpers). `ctx.arc`, `ctx.stroke`, `ctx.fillText`, gradients and scaled `drawImage` anti-alias and break the pixel look. Fade with dithering (`px.polyDither`, `px.ddisc`, `r.glowDisc`), not alpha.
3. **Anything that overlaps goes through the queue**: `r.actor`, `r.sprite` or `r.queue`. Only backgrounds are drawn directly (`r.sky`, `map.drawFloor`, `level.draw`, parallax shapes).
4. **Animate with continuous values** (phases, velocities, eased timers), never frame lists.
5. **Read input in `update`**: `pressed` for one-shot actions, `down` for held, `buffered` + `consume` for combat.
6. **Keep games single-file.** In the repo, edit `engine/my-3d2dge.js` and `src/*`, then run `node tools/build.mjs`. In a shared single file, replace only the code between `GAME START` and `GAME END`.

## Frame order

`game.start(...)` runs this every animation frame:

1. `update(dt)` of the current scene several times (skipped during hit-stop and pause), then timers, particles and the camera.
2. `r.begin()` clears the buffer and positions the camera.
3. The scene's `draw(r)`. Draw backgrounds first, then register decals, queue items, actors, sprites, overlays and lights.
4. `r.finish()` runs these steps in order:
   1. particles and afterimages are queued;
   2. decals draw (ground marks, shadows, telegraphs);
   3. the queue sorts and draws by depth;
   4. lighting darkens the frame;
   5. overlays draw on top (HUD, dialog, menus, damage numbers);
   6. the frame is presented with a sub-pixel camera offset.
5. With GPU lighting active, every queue item is also drawn into a hidden info image, and WebGPU does the lighting and presentation.

An error in `update` or `draw` does not stop the loop. It is shown in a red box on screen and logged once to the console (`game.errors` keeps the list).

## Systems in more depth

### Views and resolution
- Presets: `iso` (yaw 45, pitch 30), `threequarter` (pitch 55), `topdown` (pitch 80), `brawler` (pitch 25), `side` (pitch 0).
- `overhead` (pitch 90, scale 1) makes world x/y equal screen pixels, for shooters, puzzle and arcade games. It is not in the default view cycle.
- Make your own with `new E.View(id, label, yaw, pitch, scale, zBoost)`.
- `res` fixes the internal resolution with whole-number scaling. Without it, the size adapts to the window between `minH` and `maxW` × `maxH`.
- `game.views` limits view cycling (`game.nextView()`) and tells the checker which views to test.

### Scenes
A scene is `{ enter(data), exit(), update(dt), draw(r), pausable, view, views, input, res, touch }`.
- `game.go('play', data)` switches before the next step; timers and particles are cleared and the camera snaps.
- `pausable: true` lets `pause` (Escape, P, Start) toggle `game.paused`; a PAUSED overlay is drawn and the music is ducked.

### Camera
- `game.focus(x, y, z)` every update.
- `cam.bounds = v => map.bounds(v)` (or `level.bounds`) keeps it inside the level.
- `cam.room = [w, h]` snaps the target to the center of the current room; the camera then slides, so Zelda- and Metroid-style room transitions come for free. Freeze gameplay while `cam.moving` is true.
- Screen shake respects the player's reduced-motion setting.

### TileMap (ground-plane levels)
- ASCII `rows` and a `legend`: a number is a wall type, a string is a spawn tag, `{ tile, floor, spawn }` combines them.
- Wall `types[id] = { h, top, side, line, course, cut, cutH }`. `cut` lowers a wall when it stands between the camera and the floor.
- `floorTex(x, y, floorTag)` colors the floor per pixel; it is baked once per view. Ready-made: `E.tex.flagstone`, `grass`, `dirt`, `water`, `planks`, `checker`, `plain`.
- `map.set(cx, cy, 0)` opens doors or breaks walls; the floor and wall caches rebuild themselves.
- Collision is height-aware: `collide(body)` ignores walls lower than `body.z + step`, and `groundAt(x, y, r, z)` returns the surface to stand on.
- Things standing on a block sort after it, and `r.shadow(..., surfaceZ)` draws on top of blocks.

### PlatformMap (side-scrolling levels)
- Tiles live on the x/z plane; the ASCII top row is the highest.
- Kinds:
  - `solid`;
  - `oneway`: you stand on it and jump up through it, and down + jump drops through;
  - `ladder`: climbable, and you can stand on its top;
  - `hazard`: not solid; test it with `touching(body, 'hazard')`;
  - `deco`: drawn in the play plane;
  - `back`: a darker background wall.
- Styles give each tile its look: `ground` (grass top when open to the sky), `brick`, `block` (bevelled), `bonus` (`?` block, `glyph` option), `pipe`, `plank`, `spikes`, `ladder`, `liquid`, `plain`.
- In `side` the level is flat like an NES or SNES game. In a tilted view with yaw 0 (`brawler` or custom), tiles show top faces and the level becomes a 2.5D diorama.
- `move(body, dt, solids)` moves any box `{ x, z, vx, vz, w, h }` with sub-steps. It reports:
  - `onGround` and `onOneWay`;
  - `hitWall`: -1 left, 1 right, 0 none;
  - `hitCeiling`;
  - `bumped`: the tile hit from below;
  - `ground`: the moving solid it stands on.
- `solids` are extra boxes (moving platforms, elevators, crates); a body standing on one is carried by its `vx` / `vz`.

### Platformer (side-scroller controller)
- Defaults feel like a modern NES remaster: run 95, jump 285 (about 3 tiles), gravity 800 rising and 1150 falling, fall cap 330.
- Forgiving controls: coyote time 0.09 s, jump buffer 0.13 s, jump cut 0.45 when jump is released early.
- Optional moves: `airJumps` (double jump), `wallJump` (with wall slide), `dash`, `climb` speed.
- `update(dt, level, input | intent, solids)`. The same controller runs enemies: pass `{ x, jump, jumpPressed }` from your AI.
- `rigState(extra)` returns the object `Humanoid.update` wants, including the airborne pose.

### Body (ground-plane physics)
- Velocity with optional `friction` (per second) and `bounce` (off walls and the floor).
- `push(ix, iy, iz)` adds knockback; `jump(v)` jumps with `gravity`.
- It lands on the highest walkable surface: the floor, or the top of a block low enough to step onto.
- Use it for heroes, enemies, bombs, crates, pickups and balls.

### Attack (melee timing)
- `new E.Attack(spec)` owns the wind-up, active and recover timers of one move; the spec is also the Humanoid attack spec.
- `start()` begins a swing (pass `true` to chain from recover into a combo); `update(dt)` returns the phase that just began, which is where swing sounds go.
- `hits(targets, test, fn)` calls `fn` once per target per swing while active. `state` feeds `rig.update({ attack })`.

### Bullets and patterns
- A pool on the `'ground'` plane (top-down) or the `'side'` plane.
- Bullets die on walls with a small spark; `hit(targets, fn, team)` tests circles (side targets use their box center).
- `burst(base, E.pattern.spread(...))` fires a pattern: `dir`, `aim`, `aimSide`, `spread`, `ring`.
- Bullets glow under GPU lighting. Set `sprite` for custom art and `pierce` to pass through targets.

### Humanoid
- Proportions: `legUpper legLower hipZ torso shoulderHalf headR armUpper armLower limbW torsoW`.
- Style: `lean hunch stride swing speedRef`.
- Gear: `weapon` (`'sword'`, `'gun'`, `'staff'`), `hat` (`'cap'`, `'pointed'`, `'helmet'`, `'band'`, `'crown'`), `hood`, `cape`, `eyeGlow`, `colors`.
- `update(dt, { x, y, z, vx, vy, facing, dash, hurt, air, point, attack })`.
- Attacks:
  - You own the timing: move `phase` from `'wind'` to `'active'` to `'recover'` with your own timers, and pass `u` (0 to 1) within the phase.
  - `spec.a0` / `a1` are hand angles relative to facing; `z0` / `z1` are heights.
  - `spin: true` swings a full circle, `kick: true` swings the right foot, `blade: 0` hides the smear.
- `hand()` and `tip()` give world points for spawning bullets or sparks. `debug(r)` draws the skeleton.

### Audio
- Browsers start sound only after the first key press or click; the engine waits for it.
- `sfx(name)` ignores the same sound fired twice in 35 ms, and varies the pitch slightly so repeats don't sound robotic.
- `music(song)` loops tracks of its own step notation. Every track loops on its own length, so short drum or bass loops can run under long melodies.
- Built-in songs: `title`, `adventure`, `dungeon`, `boss`, `victory` (plays once).

### Text and UI
- `E.font` is a 3x5 upper-case pixel font with `scale`, `align`, `wrap` and outline.
- `E.ui.box/bar/hearts` draw classic windows and meters inside `r.overlay`.
- `Dialog` does typewriter text with blips, pages, speaker names and choices; `update` returns true while it is open, so the world waits.
- `Menu` handles up and down with key repeat, confirm, cancel and disabled items.

### Lighting
- Canvas lighting: set `lights.enabled` and `ambient`, then call `lights.add(x, y, z, radius, intensity)` every frame. Light is measured on the ground in ground views, and on screen in side views and for PlatformMaps.
- GPU lighting (`game.enableGPU({ map })`) needs WebGPU and a TileMap. It adds:
  - colored lights, and soft shadows cast by walls and `lights.caster(...)`;
  - light that wraps around characters;
  - glow from `px.glow`, emissive decals and actors, and `[r, g, b, glow]` floor texels;
  - bloom and heat shimmer (`lights.heat`).
- GPU lighting falls back to Canvas lighting by itself. Tune the settings, not the shaders.

### Errors and warnings
- Runtime errors appear in a red box (click to hide) and in the console, labeled with `update` or `draw` and the scene.
- Setup errors (before `game.start`) are shown too.
- One-time `my-3D2dge:` warnings flag:
  - unknown views, actions, sounds, songs, resolutions and input presets;
  - legend characters, wall or tile types missing from `types`;
  - uneven level rows and non-hex colors;
  - lights with bad numbers, and PlatformMaps drawn in the wrong view.
- The checker prints them all.

## Genre recipes

**Side-scroller (Mario, Mega Man, Castlevania).**
```js
const level = new E.PlatformMap({ rows: LEVEL, legend: { '#': 1, '=': 2, '?': 3, '@': 'hero', 'g': 'walker' },
  types: { 1: { style: 'ground', side: '#8a5a32' }, 2: { kind: 'oneway' }, 3: { style: 'bonus', side: '#e8a830' } } });
const s = level.find('hero'), hero = new E.Platformer({ x: s.x, z: s.z }), rig = new E.Humanoid({ weapon: 'gun', hat: 'cap' });
// scene: { view: 'side', views: ['side', 'brawler'], input: 'PLATFORMER', res: 'snes', pausable: true, ... }
// update: hero.update(dt, level, game.input, lifts); if (hero.jumped) game.audio.sfx('jump');
//         if (hero.bumped) { ...change level.set(cx, cz, id)... }
//         rig.update(dt, hero.rigState({ point: game.input.down('attack') })); game.focus(hero.x, 0, hero.z + 24);
// draw:   r.sky([...]); level.draw(r); r.actor(hero.x, 0, hero.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
```
- Enemies are boxes moved by `level.move(e, dt)` with your own gravity: turn at `hitWall`, and at ledges using `groundBelow`.
- Stomp when `hero.vz < 0` and the hero's feet are above the enemy's middle.
- Pits: `hero.z < -40`. Spikes: `level.touching(hero, 'hazard')`.

**Zelda-like adventure.**
- Build rooms with `TileMap` rows and set `game.cam.room = [roomW, roomH]`.
- The hero is a `Body` moved by `screenDirToGround(input.move())`. A sword swing is an `E.Attack` with `hits(foes, f => E.inArc(...), ...)`.
- Talk with `Dialog`, and open a locked door with `map.set(cx, cy, 0)` after checking a key count. Only run enemies in the hero's room, and freeze everything while `cam.moving`.

**Beat-'em-up (Final Fight, Streets of Rage).**
- Use the `brawler` view with a long `TileMap` floor strip (walls along the top edge only) and `cam.bounds` that scroll right.
- Heroes and thugs are `Body` + `Humanoid` with `weapon: null`. Punches are attack specs with `blade: 0`; kicks use `kick: true, z0: 6, z1: 9`.
- Hits need `E.inArc` plus a small y difference (same lane). Knock down with `body.push(dx, dy, 120)` and let gravity drop them.

**Fighting game (Street Fighter II).**
- Use the `side` view with a one-screen `PlatformMap` floor. Two `Platformer`s; the CPU fighter passes an intent object.
- Hurtboxes and hitboxes are `overlapBox` boxes placed from `rig.hand()` during `'active'`. Add health bars (`E.ui.bar`), a round timer (`game.every(1, ...)`) and `game.freeze` on hits.

**Shoot-'em-up (1942, Gradius).**
- Use `view: 'overhead'` and `res: [224, 256]`, so world x/y equal screen pixels.
- Ships are sprites, and the backdrop is `r.starfield({ dir: 'down' })` (or `'left'` for horizontal shooters).
- A timeline array spawns waves; enemies move on formulas (sine lines, dives aimed with `E.pattern.aim`).
- Bosses fire `E.pattern.ring` and `spread`. A bomb clears `shots.clear('foe')`.

**JRPG (Dragon Quest, Final Fantasy).**
- Towns and dungeons are `TileMap` rooms with `Dialog` NPCs; shops use `say(text, { choices })`.
- Battles are a scene in the `brawler` view with rigs lined up, a `Menu` of commands and a queue of actions. Each action steps forward, swings, applies damage and steps back.
- Keep party data in one object and save it with `E.store.set('save', party)`.

**Puzzle (Tetris, Dr. Mario).**
- Use `view: 'overhead'`, `res: 'nes'`, and a 2D array grid drawn with `px.rect`.
- `input.repeat('left', .17, .05)` gives the classic delayed auto-shift; `game.every(speed, fall)` drives gravity.
- Clear lines with particles and `sfx('coin')`.

**3D-era remake (Mario 64, Ocarina, Crash).**
- Use the `iso` or `threequarter` view with a `TileMap` whose wall heights are platforms (h 8, 16, 24...). The hero is a `Body` with `jump(260)`; walls lower than the hero's feet are walkable, so the level becomes a height map you platform across.
- Add GPU lighting for mood and `cam.bounds` for framing.

**Mash-ups.** The kits don't depend on each other. Some examples:
- a platformer with Zelda rooms: `cam.room` in the side view;
- a shooter with RPG shops: scenes plus `Menu`;
- a brawler with bullet-hell bosses: `Bullets` with the `'ground'` plane;
- a puzzle game with dialog cutscenes: `Dialog`.

## Performance
- **Rigs:** projection costs microseconds. The outline composite is the expensive part, so crowds should use `outline: false`.
- **Walls, floors and PlatformMap chunks** are baked once per view.
- **Canvas lighting** scans pixels inside each light, so keep radii sensible or use GPU lighting.
- **Particles** are capped at 900 (`game.particles.max`) and bullets at 800 per pool.
- **Crowd separation:** use `E.SpatialHash`, not all-pairs checks.
- `examples/stress-test.html` benchmarks a device and prints a copyable report.

## Checklist before handing a game back
- One IIFE between `GAME START` and `GAME END`, starting with `const E = My3D2dge`, holding only your game (no leftover starter menu or slices). No other files, libraries or network requests.
- A title scene, a gameplay scene with `pausable: true`, and a game-over or win path back to the title.
- The camera follows the player and the level is visible. The HUD uses screen pixels (`r.text`, `r.overlay`).
- Sounds for jumping, hitting, pickups and dying; music per scene.
- Positions and speeds are in world units, `dt` is used everywhere, and nothing draws with anti-aliased canvas calls.
- Every view in `views` looks right (press `V`), and the skeleton overlay and slow motion look right.
- `node tools/check.mjs game.html` passes; look at its screenshots, not only its exit code.
