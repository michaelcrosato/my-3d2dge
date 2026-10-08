# my-3D2dge guide for AI models

This guide is for an AI (or a person) asked to build, port, remaster or remix a game with my-3D2dge. `API.md` is the compact reference; it is embedded at the top of both single files (`dist/my-3d2dge.html` and `dist/my-3d2dge-compact.html`). This guide explains the ideas, the workflow for remaking a classic, recipes for each genre, and the checks to run before handing a game back. Everything here matches `engine/my-3d2dge.js` v0.12.1.

For an AI coding agent that reads files instead of a pasted page, hand over `dist/my-3d2dge-agent.js`, the agent edition. It is the essential engine in one readable file, and its header (about 8k tokens) is a complete manual with three example games. Games written for it run unchanged on the full engine, which adds the lighting, props, backdrops, touch controls and camera tools this guide also covers.

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
3. **Copy the closest starter slice.** The five slices in the single file (adventure, platformer, brawler, shooter, RPG battle) are complete games with gameplay, HUD, win and lose, and music. Start from one and change it, and ship only your game with its own title and game-over scenes. Do not start from an empty file.
4. **Rebuild the content.** Levels are ASCII rows with a legend, enemies are small factories, items are sprites. Keep the original's layout ideas but make your own maps; for a remix, change the rules on purpose.
5. **Modernize.** The engine gives you most of it for free:
   - forgiving controls: coyote time, jump buffering, variable jump height, input buffering;
   - hit feedback: hit-stop, shake, sparks, damage numbers;
   - smooth animation, lighting and glow;
   - a 2.5D view (`views: ['side', 'brawler']`);
   - pause, save data, touch controls.
6. **Tune the feel** with the feel numbers in `API.md`, then check the game with the skeleton overlay (`rig.debug(r)`) and in slow motion (`game.timeScale = .25`).
7. **Verify** with the checker and look at the screenshots (see the checklist at the end).

## Visual craft: aim for PS1 / N64 era 2D, not NES
Players judge a remake in the first screenshot. The engine's defaults reach SNES quality by themselves; games reach the PS1/N64 bar (Symphony of the Night, Metal Slug, Legend of Mana, Klonoa) when they use every layer of the look kit.

**Why games look cheap, and the fix for each:**
- *Tiny stick characters.* Use the HD Humanoid (the default) at `size: 1.2-1.4` on a 320x240 `res`, pick a `build` (`'heroic'` for tall heroes, `'bulky'` for brawlers and bosses, `'chibi'` for Mana-style RPGs), and dress every character: outfit, hair, hat, armor, sleeves, cape, and a palette of 4-6 colors per character (skin, hair, cloth, pants, boot, trim). Give enemies different silhouettes (hunch, bulky, blobs with `ears`, `horns`, `wings`, `feet`, `tail`, `mouth: 'fangs'`). Use poses (`pose: 'cheer'` on victory, `'cast'` for spells, `'guard'`, `'kneel'`, `'down'` for the defeated) instead of leaving everyone in the idle stance.
- *Empty backgrounds.* Side views get an `E.Backdrop` (a preset or custom layers of mountains, castle, forest, city, clouds, fog) with parallax. Ground views get textured floors from `E.tex.*` with floor tags (water, lava shimmer), and walls with a material: `face: 'stone' | 'rock' | 'plank' | 'timber' | 'plaster' | 'hedge'` and `roof: 'tiles' | 'slab' | 'leaves' | 'grass'`. Never leave every wall the same brick.
- *Flat colors.* Shade everything with `E.tones(hex)`: `deep` and `sh` on the shadow side, `base`, `lt` on lit edges, a `hi` sparkle. Shadows lean cool, highlights warm; never shade by only darkening.
- *Bare rooms.* Put 3-8 props on every screen with `r.prop`: candles, chandeliers and stained-glass windows in castles; crates, barrels, signs and lamps in towns; trees, bushes, flowers, rocks and grass outdoors; crystals, bones, skulls, cobwebs and vines in caves; awnings, lanterns, streetlamps, hydrants, trash cans and fire drums on streets; sandbags, cactus and palms in deserts; mushrooms in forests. Tint props with `color` so they match the palette, and set `E.style.propSize = 1.4` when heroes are size 1.2+ so a door is taller than the hero.
- *Weak hits.* Every hit gets hit-stop (`game.freeze(.04-.08)`), shake, sparks and a sound. Every death and explosion gets `particles.explosion(x, y, z, size)` and, for big ones, `game.flash`. Pickups get `particles.glints`.
- *NES typography.* Use the default 5x7 font with a drop shadow for HUD text, `E.ui.box` gradient panels and bars, and `E.font.title` with a 3-4 color gradient and extrusion for logos.
- *Faceless dialog.* Every talking character gets a portrait: `talk.say(lines, { name, portrait: rig })`, and `rig.drawPortrait(g, x, y, 40)` on HUDs and RPG party and status screens.
- *Muddy lighting.* Use lights for mood, not darkness: a few warm lights (`r.prop(..., { light: true })`) over an ambient of .4-.6; GPU lighting in top-down dungeons.

**Art recipes by classic** (combine with the genre recipes below):
- *Symphony of the Night:* `res: 'ps1'`, the `'castle-night'` backdrop, PlatformMap `stone` tiles with `moss` and `brick` walls, `'back'` tiles for the rear wall, candles and candelabras every few tiles, chandeliers, stained-glass `window` props, banners and statues. The hero is `build: 'heroic'`, `outfit: 'coat'`, `hair: 'long'`, `cape`, pale skin and silver hair, and the sword chops in the screen plane by itself in the side view; enemies are skeletons (`build: 'skeleton'`, add `outfit: 'robe'` and a staff for a lich), bats (`Blob` with `wings: true, mouth: 'fangs'`), cobwebs and vines on the walls.
- *Metal Slug:* the `'desert'` backdrop, `ground` and `metal` tiles, crates, barrels, sandbags, palms and cactus, `broken` pillars, `particles.explosion` everywhere (with `particles.ground` set so debris bounces on platforms), `bulky` soldiers with `weapon: 'gun'`, `point: true` while firing, and screen shake on every blast.
- *Legend of Mana / Secret of Mana:* the `threequarter` view, `E.tex.grass` / `dirt` / `water` floors by floor tag (a river with `block: true` and a plank bridge), houses of `timber` or `plaster` walls under `tiles` roofs, `hedge` walls with `leaves` tops and `rock` cliffs with `grass` tops, trees, bushes, flowers, fences and mushrooms as props, `chibi` characters with `face: { eyes: 'big' }` and bright palettes, rabbites (`Blob` with `ears: 'rabbit', feet: true`), and dialog boxes with portraits.
- *Klonoa and 2.5D platformers:* PlatformMap in the `brawler` view (tiles show their top faces), a bright `'day'` or `'forest'` backdrop, props in front of and behind the play plane (`y` of -12 and +12), and a soft camera `lead`.
- *Final Fight / Streets of Rage:* the `brawler` view, a long street TileMap with brick and `plaster` building walls, awnings, streetlamps, hydrants, trash cans and burning fire drums along the sidewalk, `bulky` heroes and thugs with varied palettes, and big impacts.

## Animation: fluid, varied, readable
Broken animation ruins a good-looking game faster than flat art. The Humanoid rig animates procedurally, so use its vocabulary instead of moving joints by hand:
- **Moves, not raw specs.** `new E.Attack('overhead')`, `new E.Combo(['jab', 'cross', 'hook', 'uppercut'])`. Every move in `E.MOVES` winds up, strikes with a lunge, step, lean and twist, follows through, holds, and eases back to the stance. It never sweeps backwards through its own arc.
- **A move set per character.** A knight gets `overhead`, `thrust` and `spin`; a mage `cast`; a rogue `jab`, `thrust` and `backslash`; a monk `jab`, `cross`, `roundhouse` and `flyingkick`; a brute `haymaker`, `bash` and `sweep`; a beast `claw`. Two heroes must never share one swing.
- **Stances and poses between attacks.** Brawlers walk with `stance: 'guard'`, knights with `stance: 'ready'`. Win with `pose: 'cheer'`, cast with `'cast'`, block with `'block'` (weapons) or `'guard'` (fists), duck with `'crouch'`, taunt with `'hips'` or `'wave'`, fall with `down`, die with `'die'` (stagger, knees, topple), and climb ladders with `climb: true`. Faces act too: `expr: 'smile' | 'shout' | 'angry' | 'wince'`, and a Dialog portrait's mouth moves while its line types.
- **Enemies telegraph.** Give enemy attacks a longer `wind` (.2-.35 s) than the hero's, so players can read and dodge them. Flash and knock back on hit, lie `down` on death.
- **Check the motion.** `node tools/filmstrip.mjs game.html#scene --steps "... rec:16:2 press:KeyJ" --crop x,y,w,h` records the swing frame by frame. Look for the wind-up, the strike and a clean settle. Add `--seed 1` for a repeatable strip, and `--compare before.html` (a copy of the page from before your change) to see exactly which pixels your change moved.

## Hard rules

1. **Game logic in world units, `dt` everywhere.** Never store screen pixels. Convert only when drawing (`r.w(x, y, z)`) or reading the mouse (`game.mouseGround()`). `update(dt)` runs in fixed steps of about 1/120 s.
2. **Draw only with engine primitives** (`E.px.*`, `E.font`, `E.ui`, sprites, props, `r.*` helpers). `ctx.arc`, `ctx.stroke`, `ctx.fillText`, canvas gradients and scaled `drawImage` anti-alias and break the pixel look. Translucency goes through the engine helpers (`px.blend`, `px.polyDither`, `px.ddisc`, `r.glowDisc`, `r.shadow`): stepped alpha with blend modes by default (PS1 / N64 / SNES color math), or ordered dithering with `E.style.trans = 'dither'` for NES, Game Boy and Genesis looks.
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
- `res` fixes the internal resolution with whole-number scaling. Without it, the size adapts to the window between `minH` and `maxW` × `maxH`; `portrait: { maxH }` lets the view grow on a screen held upright (a phone), so it fills the screen.
- `game.views` limits view cycling (`game.nextView()`) and tells the checker which views to test.

### Scenes
A scene is `{ enter(data), exit(), update(dt), draw(r), pausable, view, views, input, res, touch }`.
- `game.go('play', data)` switches before the next step; timers and particles are cleared and the camera snaps.
- `pausable: true` lets `pause` (Escape, P, Start) toggle `game.paused`; a PAUSED overlay is drawn and the music is ducked.

### Camera
- `game.follow(hero, { z, lead })` once, or `game.focus(x, y, z)` every update.
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
  - `slope`: `dir: 1` rises to the right, `-1` to the left, `from` / `to` (0..1) for gentle slopes; bodies walk up and down them and step up onto low ledges;
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
- `E.Combo([spec1, spec2, spec3], { window })` chains attacks: `press()` flows into the next hit during recover (or shortly after), otherwise restarts. `E.knockback(from, target, speed, up)` pushes the target away.

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
- `E.font` is a 5x7 proportional pixel font with lower case (the old 3x5 font is `font: 'tiny'`), with `scale`, `align`, `wrap`, outline, drop `shadow` and `gradient`; `E.font.title` draws extruded gradient logos.
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

**Beat-'em-up (Final Fight, Streets of Rage).** Start from the BRAWLER slice.
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

## Building a big game: lessons from Emberdeep
`examples/emberdeep.html` is the engine's signature game: an endless Diablo-style hack-and-slash of about 1.8 MB of code, built from 30+ source files. Its structure (`src/emberdeep/DESIGN.md`) scales to any large game.

- **A spine, then content.** A small core defines:
  - the shared state;
  - one damage pipeline for every unit;
  - a handful of effect verbs (projectile, nova, ground area, telegraph, strike, meteor, chain, beam, wave, pull);
  - the hero's action model;
  - the monster runtime;
  - the level builder;
  - the UI kit.
  Content never edits the core.
- **Registries make a language.** Every part is registered: `def('skills' | 'archetypes' | 'affixes' | 'bosses' | 'patterns' | 'itemBases' | 'powers' | 'mechanics' | 'themes' | 'layouts' | 'npcs', id, spec)`. Parts refer to each other by id and combine freely. A monster is an archetype × an element × affixes × depth scaling × a palette. A level is a layout × a theme × mechanics × a monster pool. A boss is a body × an element × patterns.
- **An event bus instead of hooks everywhere.** Legendary powers, passive keystones, mechanics and tips listen to `hit`, `kill`, `skill`, `dodge`, `step` and `draw` events and check whether they apply. Adding a power never touches the combat code.
- **Procedural forever.** A recipe per depth draws from the registries. Past the hand-planned depths it composes new combinations in a fixed order (every pair of mechanics, then every triple), recolors themes by depth, varies packs (elements, shared affixes, giants, swarms) and assembles bosses from a pattern library. Both sides of the power curve grow exponentially, the monsters' a little faster.
- **New animation on the rigs.** Post-process the Humanoid's joints after `rig.update`:
  - a dodge roll turns every joint around the hips;
  - drinking re-solves one arm with `E.ik3`;
  - held tools are drawn from the hand and elbow joints.
  New creature rigs (IK-legged spiders, a path-following serpent) are posed in 3D and projected with `view.p`.
- **Test like a player.**
  - An autopilot drives the hero through a virtual input for balance runs and an attract-mode demo.
  - Scripted headless playtests (`tools/ed-play.mjs`) and a smoke test over every scene and depth (`tools/ed-smoke.mjs`) keep a big game honest.
  - A Gallery scene plays every skill and monster for visual review.

## Where to find more: animation and examples
The engine files carry the engine; the repo (github.com/michaelcrosato/my-3d2dge) also holds a store of motion and a whole game of worked examples. Take from it rather than inventing a walk cycle or a spider from nothing, but take only what a game needs: the store's files are large (a clip set is 75-820 KB, each motion-capture subject about 2.5 MB), so search them and never read one whole. All of it runs at https://my-3d2dge.vercel.app/labs.

**Motion clips** (`docs/MOCAP.md`): 325 curated clips and all 2,548 takes of the CMU motion capture database, in a readable text format of key poses (whole numbers, a legend in every file's header) that plays on any Humanoid at its own build, on either engine (the full engine also turns the face and hair with the body, for rolls and cartwheels). Every clip is free to use: Quaternius and Mesh2Motion are CC0, CMU is free for all uses.
- **Find** a clip by what it does. The curated sets have catalogs, each clip's name with its tags and a description: `src/mocap/catalogs/quaternius.json` (88 clips: idles, walks, runs, jumps, sword, gun, shield, magic and fist attacks, dodges, hits, deaths, sitting, talking, work), `mesh2motion.json` (177: idles, attacks, emotes and gestures, dodges, climbing, sneaking, zombies, chores) and `cmu.json` (60 moments cut from motion capture: gaits, fights and kicks, dodges, falls and get-ups, chores, monsters and zombies acted by people). The motion-capture takes are in a ledger, one a line with its category, length and description: `node tools/cmu.mjs ledger kick` searches it, or grep `src/mocap/catalogs/cmu-takes.tsv`.
- **Take** the clips you want into a small set of your own: `node tools/anim-set.mjs src/mocap/sets/quaternius.js examples/cmu-lib/CMU_10.js --clips Idle_Loop,10_01 --name MINE --out mine.js` (the curated sets are `src/mocap/sets/<set>.js`; take `NN_xx` is in `examples/cmu-lib/CMU_NN.js`). A clip copied by hand also needs its set's preamble (its `sources`, the bodies it was measured on), so use the tool when you can run commands.
- **Play** it: load `src/mocap/readable.js`, `src/mocap/mocap.js` and the set after the engine, then `const lib = Mocap.load(MOCAP.MINE); Mocap.drive(rig, lib);` once, and each step `rig.mocap = lib.sample(lib.clip('Idle_Loop'), t)` before `rig.update`. `rig.mocapW` (0 to 1) fades a clip in and out over the rig's own animation, `rig.mocapMask = 'upper'` plays only the chest, head and arms over the rig's own walk, and `lib.moveAt(clip, t)` says how far a travelling clip has carried the body.
- **Edit** it: a clip is text. Change a key pose's numbers to fix or vary it (the Mocap Lab's AI panel shows a clip as text and plays an edit).

**Worked examples** (`src/emberdeep/`, `src/emberdeep/DESIGN.md`): Emberdeep registers every part on one line, so one search lists them all: `grep -nE "def\(['\"](archetypes|characters|skills)" src/emberdeep/*.js` gives the 28 monster, boss and dummy bodies (with tags: beast, spider, flying, ranged...), the 3 heroes and the skills (Codex's six come from one helper in `29-codex-skills.js`). Bodies that are not people are classes: `grep -n "^class " src/emberdeep/*.js` (an eight-legged crawler with IK legs, a burrowing serpent, a floating eye with a beam, Codex the living book, Dan the scythed beast on reverse-kneed legs). They lean on the game's helpers and shared state, so adapt them rather than paste them; `docs/CHARACTERS.md` is the recipe for a new body and what makes one read at game scale.

**Starters**: `dist/kits/my-3d2dge-<adventure|platformer|brawler|shooter|rpg|animlab>.html`, one vertical slice per genre, each a complete game to copy from.

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
