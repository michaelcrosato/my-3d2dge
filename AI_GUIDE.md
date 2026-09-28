# CO55 engine guide for AI models

This file is written for an AI (or a person) who has been handed a CO55 game and asked to change it or build a new one. Read it once before editing. Everything here matches `engine/co55.js` v0.2.0.

## The mental model

CO55 draws pixel-art games where nothing is a pre-drawn sprite. Characters are small skeletons whose joints are recalculated from math every simulation step, then drawn with pixel-snapped shapes. The result is fluid motion with a crisp pixel look.

The second idea is that the world is 3D and the camera is swappable. Game logic works in world units: `x` points east, `y` points south, `z` points up, and one floor tile is 16 units. A `View` projects world points to screen pixels. Change the view and the same game renders as isometric, three-quarter, top-down, brawler or side-on, with no new art.

## Hard rules

1. **Keep game logic in world units.** Never store positions in screen pixels. Convert only when drawing (`r.w(x, y, z)`) or when reading the mouse (`game.mouseGround()`).
2. **Draw only with `CO55.px` primitives on the game buffer.** `ctx.arc`, `ctx.stroke`, `ctx.fillText`, gradients and scaled `drawImage` all anti-alias and break the pixel look. Use `px.rect`, `px.line`, `px.disc`, `px.ell`, `px.poly`, `px.polyDither`, `px.ddisc`, `px.dot`, and `CO55.font.text` for words.
3. **Fade with dithering, not alpha.** `px.polyDither` and `px.ddisc` take a 0 to 1 coverage value plus the camera offset (`r.ix`, `r.iy`) so the pattern stays pinned to the world instead of swimming.
4. **Anything that can overlap anything else goes through the queue**, with `r.queue(x, y, z, fn)` or `r.actor(...)`. The renderer sorts by depth for the current view. Drawing straight to `r.ctx` inside `draw()` is only for the floor.
5. **Animate with continuous values.** Drive poses from phases, velocities and eased timers (`CO55.ease`), never from frame lists. Smooth state changes with `approach`, `lerp` or springs.
6. **Use `dt` everywhere in update.** The loop calls `update(dt)` in fixed substeps of about 1/120 s. Never assume 60 fps.
7. **Keep each example a single HTML file.** Edit `engine/co55.js` and `src/*.js`, then run `node tools/build.mjs` to regenerate `examples/`. When working inside one standalone HTML file with no repo, edit the inlined scripts directly.

## Frame order

`game.start({ update, draw })` runs this every animation frame:

1. `update(dt)` several times (skipped during hit-stop), then particles and the camera.
2. `r.begin()` clears the buffer and positions the camera.
3. Your `draw(r)`: call `map.drawFloor(r)` first, then register decals, queue items, overlays and lights.
4. `r.finish()` runs, in order: particles and afterimages get queued, decals draw (ground marks, shadows, telegraphs), the queue sorts and draws (walls, props, actors, projectiles, particles), lighting darkens the frame, overlays draw on top (health bars, damage numbers, debug), then the frame is presented with a sub-pixel camera offset.
5. With GPU lighting active, step 4 changes. Every queue item is drawn a second time into a hidden info image. Overlays go to their own unlit image, and WebGPU does the lighting and presentation instead of the Canvas lighting.

## API reference

### Math (`CO55.*`)
`clamp`, `lerp`, `approach(a, b, step)`, `ease.{outCubic, outQuad, inQuad, inOut, outBack}`, `angDiff(a, b)`, `lerpAng`, `approachAng(a, b, step)`, `rng(seed)` (seeded random), `hash2(x, y)` (0 to 1 hash), `noise2(x, y)` (smooth value noise), `bayer(x, y)` (4×4 dither threshold), `smoothDamp(cur, target, vel, smoothTime, dt)` which returns `[value, vel]`, `hex('#rrggbb')` to `[r, g, b]`, `shade(hex, -1..1)`, `mix(hexA, hexB, t)`, `V3` (3D vector helpers), and `ik3(a, b, L1, L2, hint)` (two-bone IK that returns `[joint, end]`).

### Views (`CO55.View`, `CO55.VIEWS`)
`new CO55.View(id, label, yawDeg, pitchDeg, scale, zBoost)` creates an orthographic camera. Yaw spins it around the up axis, pitch tilts it from 0 (side) to 90 (straight down), scale sets pixels per world unit, and zBoost exaggerates height for readability.

| Preset | Yaw | Pitch | Scale | Feels like |
|---|---|---|---|---|
| `iso` | 45 | 30 | √2 | Diablo, Bastion (2:1 pixel isometric, 32×16 tiles) |
| `threequarter` | 0 | 55 | 1.5 | Zelda, Stardew Valley, Enter the Gungeon |
| `topdown` | 0 | 80 | 1.5 | Hotline Miami, GTA 1 |
| `brawler` | 0 | 25 | 1.5 | Streets of Rage, Castle Crashers |
| `side` | 0 | 0 | 1.5 | Mega Man, platformers |

Methods:
- `p(x, y, z)` gives screen pixels.
- `depth(x, y, z)` gives true camera depth, for sorting parts inside one object.
- `order(x, y, z)` gives painter's order for whole objects.
- `toGround(sx, sy)` gives a ground point (null in side view).
- `screenDirToGround(dx, dy)` turns screen-relative input into a world direction, so "up" on the keyboard means "up the screen" in every view.

Useful fields: `fx, fy` (the ground direction pointing at the camera), `isSide`, `isTop`, `scale`, `pitch`.

To rotate an isometric camera, build views with yaw 45, 135, 225 and 315 and call `game.setView(view)`.

### Game (`new CO55.Game(options)`)
Options: `canvas` (required), `view` (preset id or View), `minH` (smallest internal height in pixels, default 190), `minW`, `maxW`, `maxH`, `bg`, `step` (default 1/120), and `input` (action map, default `CO55.Input.DEFAULT`).

Members:
- `screen`, `input`, `view`, `particles`, `lights`, `r` (renderer), `time` (game time, pauses in hit-stop), `real`, `fps`, `timeScale` (0.25 = slow motion).
- `cam` has `smooth` (seconds of lag) and `bounds(view)`, which returns `{x0, y0, x1, y1}` in projected pixels (use `map.bounds`).

Methods:
- `start({ update, draw })` starts the loop.
- `setView(idOrView)` switches the camera; `onView(fn)` runs a callback when that happens.
- `focus(x, y, z)` sets the camera target (call it every update).
- `freeze(seconds)` is hit-stop; `shake(amount)` is screen shake (respects reduced motion).
- `mouseGround()` returns the mouse position on the ground in world units.

### Input (`game.input`)
Actions are names mapped to codes. Codes are `KeyboardEvent.code` values, `Mouse0` or `Mouse2`, and `Pad0` to `Pad15` (standard gamepad). Every action also accepts `Act:<name>`, so `input.bindButtons(root)` wires any element with `data-act="<name>"` as a touch button.

- `down(a)`: is the action held?
- `buffered(a, window = 0.15)`: was it pressed recently and not yet used? Pair it with `consume(a)`. This gives forgiving, buffered combat input.
- `move()`: screen-space intent `[x, y]`, with length at most 1. Combines keys, gamepad left stick and the touch stick (left half of the screen).
- `aimSource` (`'mouse'`, `'pad'` or `'move'`), `padAim`, `mouseScreen()`.

`CO55.Input.DEFAULT` maps these actions: `up, down, left, right` (WASD and arrows), `attack` (J, X, left click, pad A or RT), `dash` (Space, Shift, K, pad B or LT), `skill` (L, E, right click, pad X or RB), `jump` (Z, pad Y).

### Renderer (`r` in `draw(r)`)
- `r.w(x, y, z)` gives buffer pixel coordinates.
- `r.ctx` is the buffer context. `r.W` and `r.H` are the view size. `r.ix` and `r.iy` are the integer camera offset, which you pass to dither functions.
- `r.queue(x, y, z, g => {...}, { bias, occluder })` adds a depth-sorted draw. `bias` nudges ordering (for example `+0.5` to draw in front of an actor at the same spot).
- `r.actor(x, y, z, (g, ox, oy) => {...}, opts)` adds a character. Draw with `(ox, oy)` as the projected root. The engine adds a 1-pixel outline, a rim light, hit flash (`flash: true` or a color), `alpha`, dash afterimages (`ghost: { color, life }`), and an x-ray silhouette where walls cover it (`xray: true`).
- `r.decal(fn)` draws on the ground before the queue. `r.overlay(fn)` draws after lighting.
- Ground helpers, all correct in every view: `r.groundDisc(x, y, radius, color, alpha, z)`, `r.groundRing(...)`, `r.groundArc(x, y, r0, r1, a0, a1, color, alpha)`, `r.groundPts(x, y, radius, n, z)` (a projected circle polygon).
- `r.box(g, x0, y0, z0, x1, y1, z1, topColor, sideColor)` draws an extruded box prop inside a queue callback.

### Humanoid rig (`new CO55.Humanoid(options)`)
Proportions, in world units:
- Body: `legUpper`, `legLower`, `hipZ`, `hipHalf`, `footSpread`, `torso`, `shoulderHalf`, `neck`, `headR`, `armUpper`, `armLower`.
- Line widths: `limbW`, `torsoW`.

Style:
- Posture and gait: `lean`, `hunch`, `stride`, `lift`, `swing`, `speedRef` (the speed at which the gait reaches full stride).
- Gear and details: `weapon` (`'sword'` or `null`), `bladeLen`, `hood`, `eyeGlow` (a color, for monsters), `cape` (`{ len, width, seg, body }`, or null).
- `colors`: `{ skin, hair, cloth, pants, boot, belt, cape, capeIn, metal, metalDk, hilt, eye }`. Dark variants are derived automatically.

Every step, call:
```js
rig.update(dt, { x, y, z, vx, vy, facing, dash, hurt, attack })
// attack = { spec, phase: 'wind' | 'active' | 'recover', u: 0..1 } or null
// spec   = { a0, a1, z0, z1, reach, blade, spin }
//   a0, a1: hand angle relative to facing (+ = toward the right hand); horizontal slash is 1.7 -> -1.9
//   z0, z1: hand height; spin: true swings a full circle; blade: 0 disables the smear
```
To draw it: `rig.draw(g, ox, oy, view)` inside `r.actor`, then `rig.drawSmear(r)` for the sword trail, and `rig.debug(r)` inside an overlay to show the skeleton.

`rig.kick(v)` adds a squash-and-stretch impulse (negative squashes). `rig.J` holds the local joints: `hipL/R, kneeL/R, footL/R, hipC, shC, shL/R, elbowL/R, handL/R, head, bladeDir`. `rig._w(localPoint)` converts a local point to a world offset, for example to spawn a projectile from the hand.

### Blob rig (`new CO55.Blob({ R, colors: { dk, base, lt, spec, eye, pupil } })`)
Call `blob.update(dt, { squash: -0.4..0.4, look: [dx, dy], squint })`, `blob.kick(v)`, and `blob.draw(g, ox, oy, view)`. Use it for slimes and anything round that squashes.

### TileMap (`new CO55.TileMap({ w, h, tile, cells, types, floorTex, cutaway })`)
`cells` is a flat array: `0` is floor and any other id is a wall type. `types[id]` accepts:
- `h`: height in world units.
- `top`, `side`: colors (`sideLt` and `sideDk` are optional).
- `line`: the mortar color.
- `course`: brick course height.
- `cut: true`: the wall is lowered to `cutH` when it stands between the camera and the floor, which keeps the arena visible in isometric view.

`floorTex(x, y)` returns `[r, g, b]` for any ground point. It runs once per pixel the first time a view is used, and the result is cached per view. `CO55.tex.flagstone(x, y, palette)` is a ready-made stone floor.

Methods: `drawFloor(r)`, `queueWalls(r)`, `collide(body)` (pushes a `{x, y, r}` circle out of walls), `solidAt(x, y)`, `cell(cx, cy)`, `set(cx, cy, id)`, `los(x0, y0, x1, y1)`, `bounds(view)`.

### FlowField (`new CO55.FlowField(map)`)
`update(targetX, targetY)` (cheap: it only recomputes when the target changes tile) and `dir(x, y, targetX, targetY)` (a normalized walking direction around walls). One field serves any number of chasers.

### Particles (`game.particles`)
`add({ kind, x, y, z, vx, vy, vz, g, drag, bounce, max, color, size })`, where `kind` is `dust`, `spark`, `bit`, `ember`, `ring` or `text`. Shortcuts: `dust(x, y, z, n, { speed, size, color })`, `sparks(x, y, z, n, angle, { color })`, `bits(x, y, z, n, colors)`, `ring(x, y, r0, r1, color, duration)`, `text(x, y, z, '12', color)`.

### Lighting (`game.lights`)
Set `enabled`, `ambient` (0 to 1), `dark` (RGB), `levels` (darkness steps) and `glow`, then call `add(x, y, z, radius, intensity)` every frame inside `draw`. Light is measured on the ground, so pools stay correctly shaped in every view.

### GPU lighting (`game.enableGPU(options)`, optional WebGPU)
Turn it on with `const gpu = game.enableGPU({ map })`. If WebGPU is missing or fails, the game silently keeps the Canvas lighting, so you never need a separate code path.

**How it works.** The Canvas renderer still draws every color. Alongside it, the engine writes a hidden info image that records each pixel's height, surface type (floor, wall top, wall face, character) and glow. The GPU then rebuilds each pixel's 3D position and lights it:
- Colored point lights, with soft shadows marched through a heightmap of the level.
- Light that wraps around characters, using normals estimated from their silhouettes.
- Glow that spills onto nearby surfaces, plus a tight pixel bloom.
- Light snapped into dithered bands, so it stays pixel art.
- Heat shimmer in the final pass.

**What game code provides:**
- `game.lights.add(x, y, z, radius, intensity, { color: '#ff9a4a', shadow: true })`. Up to 32 lights. Keep shadow-casting lights to about 10.
- `game.lights.caster(x, y, radius, top)` every frame for anything that should block light but isn't a wall: characters, pedestals, crates. Walls come from the map automatically.
- `game.lights.heat(x, y, z, width, strength)` for shimmer above fires. Up to 8.
- `px.glow(g, 0..1)` inside a queue callback marks what follows as glowing (flames, projectiles, pickups). It does nothing in Canvas mode, so call it freely.
- `r.decal(fn, { emissive: 0.5 })` makes a ground mark glow (telegraphs, magic circles).
- `r.actor(..., { emissive: 1 })` makes a whole character glow (wisps, spirits).
- `floorTex` may return `[r, g, b, glow]` to bake glowing floor details such as runes, lava cracks or crystals.

**Settings on `gpu`:**
- `enabled`: toggle at runtime.
- `bands`: number of light steps (default 6).
- `ambient`: RGB, 0 to 1.
- `wrap`: how far light wraps around surfaces (0 to 1).
- `spill`: how strongly glowing pixels light their surroundings.
- `glow`: bloom strength.
- `shadows`: true or false.

Read `gpu.status()` (`'loading'`, `'on'`, `'off'` or `'unavailable'`), `gpu.failed` (the reason) and `gpu.onStatus = fn` for UI.

**Limits.** Side view has no ground to light, so it uses Canvas lighting. The heightmap assumes things stand on the floor, so floating casters cast shadows as if they were solid pillars. Characters are lit as if every pixel sat on their vertical center line, which is convincing at this scale.

**Tuning rule.** Change the settings and light parameters, not the WGSL. If you must edit the shaders, keep the info encoding (red = height × 3, green = class × 20, blue = glow × 255) in sync with `Renderer._infoCol`.

**Testing.** Headless browsers often can't present a WebGPU canvas. Create the GPU with `offscreen: true` and call `await gpu.snapshot()` to get the last lit frame as a PNG data URL.

### Pixel font (`CO55.font`)
`text(g, 'WAVE 3', x, y, color, outlineColor)` and `width(str)`. Glyphs are 3×5 and cover A to Z, 0 to 9 and `+ - ! . : /`.

## Recipes

**Add an enemy.** Write a factory that returns `{ type, x, y, z, vx, vy, r, hp, ... , rig }`. In update, steer with `flow.dir(...)`, move, call `map.collide(e)`, then call `e.rig.update(...)`. In draw, add a shadow decal and `r.actor(e.x, e.y, e.z, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: e.flash > 0 })`. Give attacks a readable wind-up, with a telegraph such as a `groundArc` decal that grows during the wind phase.

**Add a new attack.** Give the rig a spec and time its three phases in your game code. Test hits during `active` with distance and `angDiff(facing, angleToTarget) <= halfArc`. Add `game.freeze(0.05)`, `game.shake(2)`, sparks and a damage number on hit.

**Add a prop.** Use `r.queue(x, y, 0, g => { r.box(g, ...); px.poly(g, r.groundPts(...), color); })`. Use `r.groundPts` at a height `z` for round tops such as bowls, tables and wells.

**Add a view.** Create `new CO55.View('myview', 'My view', yaw, pitch, scale, zBoost)`, add it to `CO55.VIEWS`, and call `game.setView('myview')`. Nothing else needs to change.

**Make a platformer (side view).** Use `view: 'side'`. Keep `y` constant (or use it for depth lanes) and treat `z` as height with gravity. For solid platforms, keep a 2D grid over (x, z) in your own code and collide against it. `examples/scarfrunner-side.html` is a standalone side-view reference, built before the engine, that shows jumping, dashing, a physics scarf and parallax.

**Add a light source that looks right with GPU lighting.** Draw the object in a queue callback with `px.glow(g, 1)` before its bright parts, add `lights.add(..., { color, shadow: true })`, add `lights.heat(...)` if it's hot, and add `lights.caster(...)` for its base if it's solid.

**Performance.** Each light scans the pixels inside its radius, so keep lights under about 20 and radii under about 120. Floor textures bake once per view. Rigs are cheap; aim for fewer than about 40 on screen. Keep particles under the 900 cap.

## Checklist before handing a change back

- Positions and speeds are in world units, and `dt` is used everywhere.
- New visuals use `px` primitives and dithering, with no anti-aliased canvas calls on the buffer.
- Anything that overlaps goes through `r.queue` or `r.actor`.
- Switch through every view with `V` and confirm nothing breaks.
- Turn on the skeleton (`R`) and slow motion (`T`) to confirm the animation reads well.
- If the game uses GPU lighting, toggle it (`G` in the examples) to confirm both lighting paths look right.
- `node tools/build.mjs` has been run, if you are working in the repo.
