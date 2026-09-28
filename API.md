# my-3D2dge API card (v0.6.0)

my-3D2dge ("My 3D 2D Game Engine") is a general-purpose retro-modern 2D game engine built for AI models. Use it to port, remaster, reimagine and remix games from the 8-bit to 64-bit eras (NES, SNES, Genesis, N64, PS1), or to make spiritual successors to them. Everything is drawn by code: no image or sound files. Characters are 3D skeletons drawn as pixel art, and the camera can be any classic 2D view.

**In the single file:** this card, the engine script (do not edit it), and a starter game between `GAME START` and `GAME END`. The starter has a title menu and five vertical slices (a genre kit file holds only one): ADVENTURE (Zelda-like), PLATFORMER (Mario / Mega Man), BRAWLER (Final Fight / Streets of Rage), SHOOTER (1942 / Xevious) and RPG BATTLE (Dragon Quest / Final Fantasy). **To make a game, copy the slice closest to your genre, then replace everything between `GAME START` and `GAME END` with only your game: its own title scene, play scene(s) and game-over scene. Delete the starter's menu and the slices you do not use.**

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

## Look target (read this before drawing anything)
Aim above SNES, level with the best PS1 / N64 2D games (Symphony of the Night, Metal Slug, Legend of Mana, Klonoa). Games that skip these steps look like Atari games. **Every game should use all of them:**
1. **Resolution** `res: 'ps1'` (320x240) or `'snes'`, and characters 40-60 px tall: `new E.Humanoid({ size: 1.3 })` (HD style is the default: shaded volumetric limbs, outfits, hair).
2. **Dress the character**: `outfit: 'tunic' | 'robe' | 'coat'`, `hair: 'short' | 'spiky' | 'long' | 'ponytail'`, `hat`, `armor: true`, `cape`, `sleeves`, and a real palette in `colors` (never leave the defaults on everyone).
3. **Backdrop behind every level**: `const bg = new E.Backdrop('castle-night')` then `bg.draw(r)` first in `draw`. Presets: `day dusk night castle-night city-night desert forest ocean cave space`, or your own `{ sky, sun | moon, stars, starsY: .7, layers: [{ kind: 'mountains' | 'hills' | 'forest' | 'city' | 'castle' | 'clouds' | 'sea' | 'fog' | 'stalactites', color, y, height, parallax, fill }] }` (`starsY` = how far down the stars reach; a layer fills the screen below its skyline unless `fill: false`).
4. **Textured tiles**: PlatformMap styles `stone` (with `moss`), `brick`, `wood`, `metal`, `ground` (with `flower`), `block`, `pipe`, `bonus`; TileMap floors from `E.tex.*`, TileMap walls with `face: 'brick' | 'stone' | 'rock' | 'plank' | 'timber' | 'plaster' | 'hedge'` and tops with `roof: 'tiles' | 'slab' | 'leaves' | 'grass'` (a village = timber and plaster houses with tile roofs, hedges, rock cliffs).
5. **Props in every room** (3-8 per screen): `r.prop(name, x, y, z, { size, color, light: true })` with `torch candle candelabra chandelier brazier window banner pillar statue crate barrel chest pot sign fence lamp door tree pine bush flowers grass rock crystal bones skull vines cobweb lantern streetlamp awning hydrant trashcan firedrum sandbags cactus palm mushroom`. Flames animate, glow and can light the scene. `chest` / `door` take `{ open: true }`, `pillar` takes `{ broken: true }`, `window` is a gothic rose window with lead cames (`colors: [...]` for the glass, `size: 2-3` for a cathedral); hang `vines`, `cobweb`, `lantern` with `{ anchor: 'top' }`. With heroes at size 1.2+, give the scene `propSize: 1.4` (or set `E.style.propSize`) so props match them.
6. **Effects on every hit**: `particles.explosion(x, y, z, size)`, `smoke`, `fire`, `glints`, `sparks`, `game.flash(color, s)`, `game.freeze`, `game.shake`.
7. **Color**: `E.tones(hex)` gives `{ deep, sh, base, lt, hi }` hue-shifted shades and `E.ramp(hex, n)` a palette ramp. Shade everything you draw yourself with them (shadow side `sh`, lit edge `lt`, a `hi` sparkle).
8. **Typography**: the default font is a 5x7 proportional font with lower case. Titles: `E.font.title(g, 'NAME', x, y, { scale: 3, colors: [...], align: 'center' })`. HUD text: `{ shadow: '#000', outline: false }` or `gradient: [top, bottom]`. `font: 'tiny'` is the old 3x5 font.
9. **Faces in dialog**: `talk.say(lines, { name: 'MIRA', portrait: miraRig })` puts a live close-up of that Humanoid (blinking, hair, hat) beside every line. `rig.drawPortrait(g, x, y, 40)` draws one anywhere (HUD, RPG party windows).

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
2. Draw only with `E.px.*`, `E.font`, `E.ui`, sprites, props and the `r.*` helpers. Never use `ctx.arc`, `ctx.stroke`, `ctx.fillText` or canvas gradients on the game buffer (they blur pixels). For translucency and glow use `px.blend(g, alpha, 'add' | 'multiply' | 'screen' | 'normal', () => {...})`, `px.polyDither`, `px.ddisc`, `r.glowDisc` and `r.shadow`: they use stepped alpha and blend modes like PS1 / SNES hardware (or dithering with `E.style.trans = 'dither'` for an NES / Genesis look).
3. Anything that can overlap anything else goes through `r.actor`, `r.sprite` or `r.queue` (depth sorted). Backgrounds (`r.sky`, `map.drawFloor`, `level.draw`) come first in `draw`.
4. Read input only in `update`. Use `pressed(a)` for one-shot actions (menus, jumps, shots), `down(a)` for held actions, and `buffered(a)` + `consume(a)` for forgiving combat input.
5. Animate from continuous values (velocity, timers, easing), never from frame lists.
6. Colors are `'#rrggbb'` (or `'#rgb'`) strings.
7. Put the whole game in one IIFE `(() => { ... })();` between the markers, and start it with `game.start(...)`.

## Common mistakes (check these first)
- Nothing on screen: the camera looks at the wrong place. Use `game.follow(hero)` once (in the scene's `enter`), or call `game.focus(...)` every update. In side view the hero has y = 0.
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
- Methods: `follow(obj, { z: 16, lead: 20 })` (camera tracks it automatically), `focus(x, y, z)` (or aim it yourself every update), `setView(id)`, `nextView()`, `freeze(s)` (hit-stop), `shake(n)`, `after(s, fn)`, `every(s, fn)` (timers in game time, return `{ cancel() }`), `mouseGround()`, `go(scene, data)`, `enableGPU({ map })`.
- Fields: `W`, `H` (screen pixels), `time`, `real`, `timeScale` (0.25 = slow motion), `paused`, `input`, `audio`, `particles`, `lights`, `view`, `errors`, `cam`.
- Camera: `cam.bounds = v => map.bounds(v)` keeps it inside the level (in side views a level shorter than the screen sits on the bottom edge; `cam.align = 'center'` to change); `cam.room = [160, 128]` moves screen by screen (Zelda, Metroid) and `cam.moving` is true while it slides; `cam.smooth` = lag in seconds (0 = locked to the target, no lag).

## Scenes (title, play, game over)
```js
game.start({ scene: 'title', scenes: {
  title: { update(dt) { if (game.input.pressed('start')) game.go('play', { level: 1 }); },
           draw(r) { r.sky(['#101848', '#402a70']); r.text('PRESS START', r.W / 2, 100, '#fff', { align: 'center', scale: 2 }); } },
  play: { pausable: true, view: 'side', input: 'PLATFORMER', res: 'snes', views: ['side', 'brawler'], touch: ['jump', 'attack'],
          enter(data) { /* build the level */ }, exit() {}, update(dt) {}, draw(r) {} }
} });
```
`game.go(name, data)` switches before the next step; timers and particles are cleared. `pausable: true` lets Escape / P / Start pause it (a PAUSED screen is drawn for you). `view`, `views`, `input`, `res`, `touch`, `propSize` are applied on entry.

## Input: `game.input`
- Actions in every preset: `up down left right` (WASD, arrows, d-pad), `start` (Enter, Start), `pause` (Escape, P, Start), `confirm` (Enter, Space, J, Z, pad A), `cancel` (Escape, Backspace, X, K, pad B).
- DEFAULT adds `attack` (J, X, click), `dash` (Space, Shift, K), `skill` (L, E, right click), `jump` (Z). PLATFORMER: `jump` (Space, Z, K, pad A), `attack` (X, J, click), `dash` (Shift, C, L), `skill`. SHMUP: `fire` (Space, Z, J, click), `bomb` (X, K).
- `down(a)`, `pressed(a)`, `released(a)`, `repeat(a, delay, rate)` (menus), `buffered(a, win)` + `consume(a)`, `consumeAll()`, `anyPressed()`, `move()` (screen direction `[x, y]`, length up to 1), `use(preset)`, `touchButtons(['jump', 'attack'])`.

## Drawing: `r` in `draw(r)`
- Background: `r.sky(['#top', '#mid', '#bottom'])`, `r.starfield({ count, speed, dir: 'down' | 'left' })`.
- Depth sorted: `r.actor(x, y, z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { flash: '#ffffff', flashMix: .75, alpha, xray, outline, ghost, emissive })` (the flash tints over the sprite so shading shows; `flashMix: 1` is solid; actors up to about 250 px tall), `r.sprite(x, y, z, sprite, { flip, anchor: 'bottom' | 'center', glow, flash })`, `r.queue(x, y, z, g => {...}, { bias })`, `r.box(g, x0, y0, z0, x1, y1, z1, top, side)` (inside a queue function).
- Floor marks: `r.shadow(x, y, radius, alpha, color, surfaceZ)`, `r.decal(g => r.groundArc(...))`, `r.groundDisc`, `r.groundRing`, `r.groundPts(x, y, rad, n, z)`.
- On top, unlit, screen pixels: `r.text(str, x, y, color, { align, scale, outline })`, `r.textAt(x, y, z, str, color)`, `r.overlay(g => {...})`.
- `r.w(x, y, z)` = buffer pixel of a world point. `r.W`, `r.H`, `r.ix`, `r.iy` (pass to dither functions), `r.view`, `r.visible(x, y, z)`.
- Glowing things you draw yourself: `r.queue(x, y, z, fn, { emissive: true })` is drawn again after lighting so darkness never dims it (flames, lasers, magic, neon).

## Pixels, sprites, text, UI
- `px.rect(g, x, y, w, h, c)`, `dot`, `line(g, x0, y0, x1, y1, c, width)`, `disc(g, x, y, r, c)`, `ell`, `poly(g, pts, c)`, `polyDither(g, pts, c, 0..1, r.ix, r.iy)`, `ddisc`, `sprite(g, spr, x, y, flip)`, `glow(g, 0..1)` (GPU glow for what follows).
- Sprites from strings (for coins, bullets, ships, icons, NES-style enemies): `const COIN = E.sprite(['.yy.', 'yYYy', '.yy.'], { y: '#f0b020', Y: '#fff0a0' }, scale)`. `.` and space are transparent.
- Font (5x7 proportional with lower case; `font: 'tiny'` for 3x5): `E.font.text(g, str, x, y, color, { outline, shadow, gradient, scale, align, wrap, font })`, `E.font.title(g, str, x, y, { scale, colors, outline, depth, depthColor, align })`, `E.font.width(str, opts)`, `E.font.lineHeight(opts)`, `E.font.wrap(str, maxW, opts)`. Glyphs: ASCII plus `♥ ★ ← → ↑ ↓ • × ♪ ▸ ©`.
- UI (inside `r.overlay(g => ...)`): `E.ui.box(g, x, y, w, h, { bg, border, gradient, alpha })` (a gradient window like Final Fantasy; `bg` can be `[top, bottom]`, `gradient: false` for flat, `alpha: .6` for a see-through HUD panel), `E.ui.bar(g, x, y, w, h, 0..1, color)`, `E.ui.hearts(g, x, y, hp, max)` (half hearts allowed), `rig.drawPortrait(g, x, y, size, { zoom: 3, turn: .6, bg, frame, cape: false, weapon: false, tint: '#808080' })` (character close-up; it stays upright while the rig kneels or lies down; `tint` greys out a KO'd hero).
- Dialog: `const talk = new E.Dialog(game)`; `talk.say(['Line one.', 'Page two.'], { name: 'ELDER', portrait: elderRig, onDone, choices: ['YES', 'NO'], onChoice(i) })`; in update `if (talk.update(dt)) return;`; in draw `talk.draw(r)`. `portrait` takes a Humanoid (live close-up; `portraitSize: 40`, `portraitOpts: { zoom, turn }`) or a function `(g, x, y, size) => {...}`. Radio chatter during play: `talk.say('Enemy fighters ahead!', { name, portrait, auto: 2.5, modal: false })` turns its pages and closes by itself while the game keeps running.
- Menu: `const menu = new E.Menu(game, ['START', { label: 'LOAD', disabled: true }], { x: 'center', y: 100, title, onPick(i, item), onCancel })`; `menu.update(dt)`; `menu.draw(r)`.

## Sound: `game.audio` (chip synth, no files, starts after the first key press)
- `sfx(name, { vol, pitch })`. Presets: `jump jump2 land step coin pickup key powerup oneup heal hit hurt stomp bump swing whoosh punch kick shoot laser charge explode boom door secret warp die select confirm cancel pause text blip`.
- Custom: `sfx({ wave: 'square' | 'pulse' | 'pulse12' | 'triangle' | 'saw' | 'sine' | 'noise', freq: 440 or 'A4', to: 880, dur: .2, vol: .3, arp: [0, 4, 7], step: .05, vib: [8, .03] })`, or `audio.define('zap', voice)`.
- Music: `music('title' | 'adventure' | 'dungeon' | 'boss' | 'victory')` (built in; any other name is an error), or your own `{ bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .15, notes: 'C5 - E5 - G5 . . . | ...' }, { wave: 'triangle', notes: '...' }, { wave: 'drums', notes: 'k . h . s . h .' }] }`. Tokens: a note (`C4`, `F#3`, `Bb2`), `-` holds, `.` rests, `|` is ignored; drums `k s h o c t`. `music(null)` stops. `mute()`, `setVolume(0..1)`.

## Levels
**TileMap** (top-down, isometric, brawler): walls stand on the ground plane.
- `new E.TileMap({ rows, legend, types, floorTex, block: ['water', 'lava'], ao: 5 })` (`ao` = width of the contact shadow along wall bases, 0 = none). `types[id] = { h, top, side, line, course, cut: true, cutH, face, roof, beam }` (`cut` lowers walls that block the camera; `face`: `'brick'` (default) `'stone' 'rock' 'plank' 'timber' 'plaster' 'hedge' 'none'`; `roof`: `'speckle'` (default) `'plain' 'tiles' 'slab' 'leaves' 'grass'`; `beam` = timber color). `floorTex(x, y, floorTag)` returns `[r, g, b]` (or `[r, g, b, glow]`); ready-made: `E.tex.flagstone`, `grass`, `dirt`, `water`, `planks`, `checker`, `plain`.
- Legend values: a number = wall type, a string = spawn tag, `{ tile, floor, spawn, block }` for both. `block: true` (or the map's `block` list of floor tags) makes deep water, lava or pits stop walkers (jumping bodies pass over); `walkable(cx, cy)`, `block(cx, cy, on)` (a bridge appears). FlowField paths go around blocked cells.
- `find(tag)` / `findAll(tag)` give `{ x, y, z, cx, cy }`. Also `cell(cx, cy)`, `set(cx, cy, id)` (open doors), `toCell(x, y)`, `center(cx, cy)`, `heightAt(x, y)`, `floorAt(x, y)`, `groundAt(x, y, r, z)`, `collide(body)`, `los(x0, y0, x1, y1)`, `bounds(view)`, `drawFloor(r)`, `queueWalls(r)`.

**PlatformMap** (side-scrollers; 2.5D in tilted views): tiles on the x/z plane, top row first.
- `new E.PlatformMap({ rows, legend, types })`. `types[id] = { kind, style, side, top, line }`. Example: `rows: ['      ?    ', '   ===     ', '@  g   ^^  ', '###########']`, `legend: { '#': 1, '=': 2, '?': 3, '^': 4, '@': 'hero', 'g': 'walker' }`, `types: { 1: { style: 'ground', side: '#8a5a32' }, 2: { kind: 'oneway' }, 3: { style: 'bonus', side: '#e8a830' }, 4: { kind: 'hazard' } }`. Kinds: `'solid'` (default), `'oneway'` (jump up through), `'ladder'`, `'slope'` (`dir: 1` rises to the right, `-1` to the left; `from` / `to` heights 0..1 for gentle slopes), `'hazard'` (spikes, lava), `'deco'`, `'back'` (background wall). Styles: `'block' 'brick' 'ground' 'plank' 'spikes' 'ladder' 'pipe' 'bonus' 'liquid' 'plain'`.
- Spawns: `find(tag)` gives `{ x, z }` with z = the bottom of that cell (feet). Standing on the ground means z = the top of the floor tiles (`level.groundBelow(x, z)`, which returns `null` over a pit), not z = 0. `cell(cx, cz)` / `set(cx, cz, id)` count cz from the bottom row. `slopeZ(cx, cz, x)`, `touching(body, 'hazard')`, `cellsTouching(body, kind)`, `groundBelow(x, z)`, `solidAt(x, z)`, `move(body, dt, solids)`, `bounds(view)`, `draw(r)` (call first, after `r.sky`), `width`, `height`.

## Movement and physics
**Platformer** (side-scroller character): `const hero = new E.Platformer({ x, z, w: 8, h: 22, run: 95, jump: 285, gravity: 800, airJumps: 0, wallJump: false, dash: 0 })`.
- Each update: `hero.update(dt, level, game.input, movingPlatforms)`. For enemies pass `{ x: -1..1, jump, jumpPressed, up, down, dash }` instead of the input.
- Read: `onGround`, `jumped`, `landed`, `facing` (1 or -1), `air`, `climbing`, `hitWall`, `hitCeiling`, `bumped` (`{ cx, cz, id }` of a block hit from below). Methods: `knock(dir)`, `rigState(extra)` (feed it to `rig.update`).
- Built in: coyote time, jump buffering, variable jump height (let go early for a short hop), slopes and small steps (sticks to the ground going down), ladders (up / down), drop through one-way tiles (down + jump), optional double jump, wall jump and dash.
- Moving platforms: `{ x, z, w, h, vx, vz }` boxes you move yourself and pass as `solids`; riders are carried.

**Body** (top-down / isometric / brawler): `new E.Body({ x, y, r: 5, friction: 0, bounce: 0, gravity: 700 })`. Set `vx`, `vy`, then `body.update(dt, map)`. Also `push(ix, iy, iz)` (knockback), `jump(v)`, and `onGround`, `z`, `groundZ`, `hitWall`, `landed`, `bounced` (hit the ground and bounced: dust, a thud). Walls lower than your feet are walkable, so bodies can jump onto blocks.

**Attack** (melee timing for swords, punches, kicks): `const slash = new E.Attack({ a0: 1.6, a1: -1.7, z0: 12, z1: 9, reach: 7.5, wind: .06, active: .1, recover: .18 })`. `if (input.buffered('attack') && slash.start()) input.consume('attack')`; `slash.update(dt)` (returns the phase that just began); `slash.hits(enemies, e => E.inArc(hero, facing, e, 22, 1.4), e => {...})` hits each target once per swing during `'active'`; `rig.update(dt, { ..., attack: slash.state })`. Also `busy`, `active`, `cancel()`. **Combo**: `const combo = new E.Combo([jabSpec, jab2Spec, upperSpec], { window: .3 })`; `combo.press()` starts or chains the next hit; `update`, `hits`, `state`, `step` work the same. **Knockback**: `E.knockback(attacker, target, 160, up)` pushes a Body (or anything with vx / vy) away.

**Bullets**: `const shots = new E.Bullets(game, { plane: 'ground' | 'side' })`; `shots.fire({ x, y, z, vx, vy, vz, r: 2, team: 'player', color, life, dmg, pierce, sprite })`; `shots.burst(base, E.pattern.spread(angle, n, arc, speed))`; `shots.update(dt, map)`; `shots.hit(targets, (b, t) => {...}, 'player')`; `shots.draw(r)`; `shots.clear(team)`. Patterns: `E.pattern.dir(angle, speed)`, `aim(a, b, speed)`, `aimSide(a, b, speed)`, `spread(angle, n, arc, speed)`, `ring(n, speed, offset)`. In side view the second number of a pattern velocity is vz.

**Helpers**: `E.dist(a, b)`, `E.angleTo(a, b)`, `E.overlap(a, b)` (circles x, y, r), `E.overlapBox(a, b)` (side boxes x center, z feet, w, h), `E.inArc(a, facing, b, range, halfAngle)` (melee cone), `E.rand(a, b)`, `E.randInt(a, b)`, `E.pick(list)`, `E.chance(p)`, `E.prune(list, fn)`, `E.store.get(key, fallback)` / `set(key, value)` (save data), `new E.SpatialHash(32)` (`build(list)`, `near(x, y, r, fn)`), `new E.FlowField(map)` (`update(tx, ty)`, `dir(x, y, tx, ty)` walks around walls), math `clamp lerp approach ease.* angDiff approachAng smoothDamp rng(seed) noise2 hex shade mix`.

## Characters
**Humanoid** (knights, heroes, soldiers, zombies): `new E.Humanoid({ size: 1.3, build: 'chibi' (default) | 'heroic' (tall, SotN) | 'bulky' (brawlers, bosses) | 'skeleton' (rib cage, skull, glowing eye sockets; tint with colors.bone), weapon: 'sword' (the default) | 'gun' | 'staff' | null (fists), outfit: 'shirt' | 'tunic' | 'robe' | 'coat', hair: 'short' | 'spiky' | 'long' | 'ponytail' | 'bald', hat: 'cap' | 'pointed' | 'helmet' | 'band' | 'crown' (or { style, color }), sleeves: 'short' | 'long' | 'none', armor, hood, cape: { len: 6, width: 5, seg: 2.5 }, eyeGlow, hunch, lean, style: 'hd' (default) | 'classic' (stick figures for huge crowds), colors: { skin, hair, cloth, coat, pants, boot, belt, trim, glove, cape, capeIn, metal, hilt, eye, iris } })`.
- `rig.update(dt, { x, y, z, vx, vy, facing, dash, hurt, air, point, aim, attack })`. `facing` is an angle (side view: 0 = right, `Math.PI` = left). `air: true` tucks the legs for jumps; `point: true` holds a gun forward; `aim` tilts it (radians, + = up: `aim: .8` shoots diagonally up, `Math.PI / 2` straight up).
- `attack: { spec, phase: 'wind' | 'active' | 'recover', u: 0..1 }`, spec `{ a0, a1, z0, z1, reach, blade, spin, kick, plane }`. Angles are relative to facing (+ = right hand side): a slash is `a0: 1.6, a1: -1.7`. In side views the same spec swings in the screen plane (overhead to low, a Castlevania chop) by itself; `plane: 'side' | 'ground'` (or the rig option `swingPlane`) chooses. `kick: true` swings the foot (use z0/z1 around 4..10). You time the phases.
- In steep ground views (threequarter) rigs and Blobs are drawn from a lower, sprite-like angle so faces show, like SNES RPG sprites (`charView: false` turns it off for one rig, `E.style.charPitch = false` for all).
- Faces (eyes with catch-lights, brows, mouth), a cheated 3/4 turn toward the camera in side views (`cheat: .5`, 0 turns it off) and hair layers are automatic. `face: { eyes: 'big' (anime / Mana style), bangs: 0..1 }`.
- Poses: `rig.update(dt, { ..., pose: 'cheer' | 'cast' | 'guard' | 'kneel' | 'down' })` (victory, spell casting, blocking, hurt or resting, knocked out; they blend in and out), or `down: 0..1` to lie a defeated body flat (centred on its position). `guard` is a boxer's guard that keeps the face visible.
- `rig.draw(g, ox, oy, view)` inside `r.actor`, `rig.drawSmear(r)` (a glowing trail along the real blade, fist or foot path, in every view), `rig.debug(r)` (skeleton), `rig.kick(v)` (squash and stretch), `rig.hand()` and `rig.tip()` (world points to spawn bullets from).
**Blob** (slimes, rabbites, bats, imps, round monsters): `new E.Blob({ R: 6, colors: { dk, base, lt, spec, eye, pupil }, ears: 'rabbit' | 'cat', horns: true, wings: true, feet: true, tail: true, mouth: true | 'fangs', face: 'front' })`, `update(dt, { squash: -0.4..0.4, look: [dx, dy], squint, walk: 0..1, flap: 0..1 (wing speed; 0 folds them), hang: true (roost upside down) })`, `kick(v)`, `draw(g, ox, oy, view)`. Mix the parts for a bestiary: `wings` + `mouth: 'fangs'` is a bat, `ears: 'rabbit'` + `feet` a Mana rabbite, `horns` + `tail` an imp.

## Effects and lighting
- Particles: `game.particles.explosion(x, y, z, size)` (fireball, smoke, sparks, debris, ring, shake, sound), `fire(x, y, z, n, { size })`, `smoke(x, y, z, n, { size, color })`, `glints(x, y, z, n, color)`, `dust(x, y, z, n)`, `sparks(x, y, z, n, angle)`, `bits(x, y, z, n, colors)`, `ring(x, y, r0, r1, color, dur)`, `text(x, y, z, '12', color, { scale: 2, bounce: true })` (bouncing damage numbers), `add({ kind: 'dust' | 'spark' | 'bit' | 'ember' | 'fire' | 'smoke' | 'glint', ... })`. `explosion(x, y, z, size, { debris, freeze: false, shake: 0 })` for chains of small blasts. Side-scrollers: `particles.ground = (x, y, z) => level.groundBelow(x, z)` so sparks and debris bounce on platforms. Screen flash: `game.flash('#ffffff', .12, strength 0..1)`.
- Lighting (works in every view, side-scrollers included, no WebGPU needed): `game.lights.enabled = true; game.lights.ambient = .5;` then every draw `game.lights.add(x, y, z, radius, intensity, { color: '#ffa050' })`. Dark areas get a smooth cool tint, lights add their own color, and emissive items (flames, sparks, bullets, `emissive: true`) stay bright. `lights.darkness` (0..1) and `lights.tint` tune it. Props with flames can light the scene: `r.prop('torch', x, y, z, { light: true })`. Lamps, street lamps, lanterns and crystals glow on their own (`haloR`, `haloColor`, `halo: false`); `cone: true` adds a light cone under a street lamp.
- Hits: `game.hitFx(x, y, z, { power: 1, angle, damage: 12, textScale: 2, textZ: 22 })` does hit-stop, shake, an impact star, sparks, a bouncing damage number (`bounce: false` floats it) and a sound in one call; `particles.impact(x, y, z, size, color)` for the star alone.
- GPU lighting (optional, ground views with a TileMap): `const gpu = game.enableGPU({ map })`; mark glowing things with `px.glow(g, 1)`; add `lights.caster(x, y, r, top)` and `lights.heat(x, y, z, w)`. It falls back to Canvas lighting by itself.

## Genre playbook (NES, SNES, Genesis, N64, PS1)
| Genre (examples) | View | Build it with | Copy slice |
|---|---|---|---|
| Platformer (Mario, Mega Man, Sonic, Castlevania) | `side` (+ `brawler` for 2.5D) | PlatformMap, Platformer, Humanoid, sprites, Bullets `'side'` | PLATFORMER |
| Metroidvania (Metroid, Symphony of the Night) | `side` | PlatformMap per room, `cam.room`, Platformer with `dash`, `wallJump` | PLATFORMER |
| Action adventure (Zelda, Secret of Mana) | `threequarter` or `topdown` | TileMap rows, `cam.room`, Body, Humanoid + `E.Attack` sword, Dialog, `E.ui.hearts` | ADVENTURE |
| Action RPG / dungeon (Diablo, Landstalker) | `iso` | TileMap, FlowField, Body (jump onto blocks), GPU lighting | ADVENTURE |
| Beat-'em-up (Final Fight, Streets of Rage, TMNT) | `brawler` | TileMap street strip, Body, Humanoid (`weapon: null`) + `E.Combo` punches and `kick: true` kicks, `E.knockback`, waves that lock the screen | BRAWLER |
| Fighting (Street Fighter II) | `side` | PlatformMap floor, two Platformers, Humanoid + `E.Attack` moves, `overlapBox` hitboxes | BRAWLER + PLATFORMER |
| Shoot-'em-up (1942, Gradius, R-Type) | `overhead` (vertical) or `side` (horizontal) | sprites, Bullets, `E.pattern`, `r.starfield`, a timeline of waves | SHOOTER |
| Twin-stick / run-and-gun (Smash TV, Contra) | `topdown` / `side` | Body or Platformer, Bullets, `weapon: 'gun'`, `point: true` | SHOOTER + ADVENTURE |
| JRPG (Dragon Quest, Final Fantasy, EarthBound) | `threequarter` town, `brawler` battles | TileMap towns, Dialog, Menu, scenes, `E.store` saves | RPG BATTLE + ADVENTURE |
| Puzzle (Tetris, Dr. Mario, Puyo) | `overhead` | a grid array, `input.repeat`, `px.rect`, `E.font`, fixed `res` | SHOOTER (setup) |
| 3D platformer or adventure remake (Mario 64, Ocarina, Crash) | `iso` / `threequarter` / `brawler` | TileMap blocks of different heights + Body `jump()` (z is real height) | ADVENTURE |
| Racing (RC Pro-Am, Micro Machines) | `topdown` / `iso` | TileMap track (floorTex), Body with friction, cars drawn with `px.poly` on `r.w()` corner points | ADVENTURE |

**Sizes:** at 320x240, heroes should be 40-60 px tall: `new E.Humanoid({ size: 1.2-1.4 })` in the default views. Bosses 1.8-2.4. Small things (coins, bullets, ships, pickups) are string sprites designed at 8-16 px, drawn at scale 2 if they are the player's ship. Keep hitboxes smaller than the art.

**Feel numbers** (world units per second, tile = 16): walk 70-90, run 95-140, jump 250-320 with gravity 800, fall cap 330, dash 200-260, bullets 250-320 (player) and 70-120 (enemy), enemy walk 25-45. Hit feedback: `game.freeze(.05)`, `game.shake(2)`, `particles.sparks`, `audio.sfx('hit')`.

## Before you hand the game back
- One IIFE between the markers, starting with `const E = My3D2dge`. Only your game: no leftover starter menu or unused slices. No other files, no network, no libraries.
- Title screen and game-over screen as scenes; `pausable: true` on gameplay scenes.
- The camera follows the player (`game.focus` every update) and shows the level; the HUD uses screen pixels.
- Sound effects on jump, hit, pickup and death; music per scene.
- The look target list above: backdrop, textured tiles, props, sized and dressed HD characters, effects, title font. Compare your screenshots with Symphony of the Night or Metal Slug, not with NES games.
- If you can run commands: `node tools/check.mjs game.html` (add `#scene` to jump to a scene). It presses start, plays, cycles the views, prints how much of the screen is filled and how many colors it uses, adds look notes (flat areas, checkerboard dithering, low contrast, a thin palette), and fails on any error. Act on every look note.
