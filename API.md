# CO55 engine: API card (v0.4.0)

CO55 makes crisp pixel-art games in any 2D camera view. Characters are 3D skeletons, posed by math every step and drawn as pixel shapes, so motion is fluid and one game renders as isometric, three-quarter, top-down, brawler or side view.

## Make a game from this file
1. Keep the engine script unchanged. Replace only the code between `GAME START` and `GAME END`.
2. Create `new CO55.Game({ canvas, view })`, build a `TileMap`, create rigs, then call `game.start({ update, draw })`.
3. In `update(dt)`, read input, move things in world units, collide them, and update rigs. World axes: x points east, y points south, z points up. One tile is 16 units.
4. In `draw(r)`, call `map.drawFloor(r)`, then `r.shadow(...)`, then `map.queueWalls(r)`. Add characters with `r.actor(...)`, props and effects with `r.queue(...)`, and lights with `game.lights.add(...)`.
5. Check the result in every view (`game.setView(id)`) and with the skeleton overlay on (`rig.debug(r)`).

## Rules
- Keep all game logic in world units. Never store screen pixels.
- Draw only with `CO55.px.*`. Never use `ctx.arc`, `stroke`, `fillText` or gradients on the game buffer; they anti-alias.
- Fade things with dithering (`px.polyDither`, `px.ddisc`, `r.glowDisc`), not with alpha.
- Anything that can overlap something else must go through `r.queue` or `r.actor`, which sort by depth.
- Use `dt` everywhere. `update` runs in fixed steps of about 1/120 s.
- Animate with continuous math (phases, easing, springs), never frame lists.

## Game: `new CO55.Game({ canvas, view, minH=190, maxW=560, maxH=330, bg, input })`
- `view` is one of `'iso'`, `'threequarter'`, `'topdown'`, `'brawler'` or `'side'`.
- Methods:
  - `start({ update(dt), draw(r) })`
  - `setView(id)`
  - `focus(x, y, z)`: the camera target; call it every update.
  - `freeze(seconds)`: hit-stop.
  - `shake(n)`
  - `mouseGround()`: returns `[x, y]` or `null`.
  - `enableGPU({ map })`: returns `gpu`.
- Fields: `timeScale`, `time`, `stats` (`{ updateMs, renderMs, actors, items }`), `particles`, `lights`, `input`, `view`, `cam` (`{ smooth, bounds(view) }`), and `screen.setOptions({ minH, minW, maxW, maxH })`. `CO55.current` is the latest game.

## Input: `game.input`
- `down(a)`: is the action held?
- `buffered(a, win = .15)` then `consume(a)`: forgiving presses.
- `move()`: returns screen-direction intent `[x, y]`. Convert it with `view.screenDirToGround(x, y)`.
- `aimSource` (`'mouse'`, `'pad'` or `'move'`) and `padAim`.
- Default actions: `up`, `down`, `left`, `right`, `attack`, `dash`, `skill`, `jump`.
- Codes are `KeyboardEvent.code`, `Mouse0` and `Mouse2`, and `Pad0` to `Pad15`. `input.bindButtons(root)` wires `data-act="action"` elements as touch buttons.

## View: `game.view`
- `p(x, y, z)` returns `[sx, sy]`. `toGround(sx, sy)` returns `[x, y]`. `screenDirToGround(dx, dy)`. `depth(x, y, z)`.
- Fields: `id`, `label`, `scale`, `inv` (null in side view).
- Custom views: `new CO55.View(id, label, yawDeg, pitchDeg, scale, zBoost)`. Presets live in `CO55.VIEWS` and `CO55.VIEW_ORDER`.

## Renderer: `r`, passed to `draw`
- `r.w(x, y, z)` gives buffer pixel coordinates. Also available: `r.ctx`, `r.W`, `r.H`, and `r.ix`, `r.iy` (pass these to dither functions so patterns don't swim), plus `r.gpu`.
- `r.queue(x, y, z, g => {...}, { bias, occluder })`
- `r.actor(x, y, z, (g, ox, oy) => {...}, { outline = true, rim, flash, alpha, xray, ghost: { color, life }, emissive })`. Characters off screen are skipped automatically. `outline: false` draws directly, which is much cheaper for crowds.
- `r.decal(fn, { emissive })` draws on the floor before the queue. `r.overlay(fn)` draws unlit on top (health bars, text, debug).
- `r.shadow(x, y, radius, alpha)` and `r.visible(x, y, z)`
- Ground shapes, correct in every view: `r.groundDisc(x, y, rad, color, alpha, z)`, `r.groundRing(...)`, `r.groundArc(x, y, r0, r1, a0, a1, color, alpha)`, `r.groundPts(x, y, rad, n, z)`.
- `r.box(g, x0, y0, z0, x1, y1, z1, topColor, sideColor)` for props, and `r.glowDisc(g, x, y, rad, color, alpha)`.

## Pixels: `CO55.px`
- `rect(g, x, y, w, h, c)`, `dot(g, x, y, c)`, `line(g, x0, y0, x1, y1, c, w)`, `disc(g, x, y, r, c)`, `ell(g, x, y, rx, ry, c)`, `poly(g, pts, c)`
- `polyDither(g, pts, c, a, r.ix, r.iy)` and `ddisc(g, x, y, r, c, a, wx, wy)`
- `glow(g, 0..1)` marks what follows as glowing for GPU lighting, and does nothing otherwise.
- Font: `CO55.font.text(g, str, x, y, color, outline)` and `width(str)`. Glyphs are 3×5 and cover A to Z, 0 to 9 and `+ - ! . : /`.

## Humanoid rig: `new CO55.Humanoid(opts)`
- Options: `cape: { len, width, seg }`, `weapon: 'sword'` or `null`, `hood`, `eyeGlow`, `hunch`, `lean`, `stride`, `swing`, `speedRef`, `headR`, `bladeLen`, and `colors: { skin, hair, cloth, pants, boot, belt, cape, capeIn, metal, metalDk, hilt, eye }`.
- `update(dt, { x, y, z, vx, vy, facing, dash, hurt, attack })`. `attack` is `{ spec, phase: 'wind' | 'active' | 'recover', u: 0..1 }` or `null`.
- Attack spec: `{ a0, a1, z0, z1, reach, blade, spin }`. Angles are relative to facing, and positive means the right-hand side, so a horizontal slash runs from `1.7` to `-1.9`. `blade: 0` disables the smear; `spin: true` swings a full circle.
- `draw(g, ox, oy, view)`, `drawSmear(r)`, `debug(r)`, and `kick(v)` for squash (negative) or stretch.
- `J` holds the joints. `_w(localPoint)` converts a local point to a world offset.

## Blob rig: `new CO55.Blob({ R, colors: { dk, base, lt, spec, eye, pupil } })`
`update(dt, { squash, look: [dx, dy], squint })`, `kick(v)`, `draw(g, ox, oy, view)`.

## TileMap: `new CO55.TileMap({ w, h, tile: 16, cells, types, floorTex })`
- `cells` uses `0` for floor and a type id for walls. `types[id]` accepts `h` (height), `top`, `side`, `line`, `course`, and `cut` / `cutH` (lower the wall when it blocks the camera).
- `floorTex(x, y)` returns `[r, g, b]`, or `[r, g, b, glow]` for glowing details.
- `drawFloor(r)`, `queueWalls(r)`, `collide({ x, y, r })`, `solidAt(x, y)`, `cell(cx, cy)`, `set(cx, cy, id)`, `los(x0, y0, x1, y1)`, `bounds(view)`.
- `CO55.tex.flagstone(x, y, { stones: [rgb, ...], mortar, hi, lo, speck })` is a ready-made stone floor.

## Other systems
- **FlowField:** `new CO55.FlowField(map)`, then `update(targetX, targetY)` and `dir(x, y, targetX, targetY)`, which returns `[dx, dy]` for walking around walls.
- **Particles (`game.particles`):** `dust(x, y, z, n, { speed, size, color })`, `sparks(x, y, z, n, angle, { color })`, `bits(x, y, z, n, colors)`, `ring(x, y, r0, r1, color, duration)`, `text(x, y, z, str, color)`, `add({ kind, ... })`, and the `max` cap.
- **Lights (`game.lights`):**
  - `add(x, y, z, radius, intensity, { color, shadow })`
  - `caster(x, y, r, top)` for things that block light.
  - `heat(x, y, z, width, strength)` for shimmer.
  - Fields: `enabled`, `ambient`.
- **GPU lighting (`game.enableGPU({ map })`):** fields `enabled`, `shadows`, `bands`, `ambient`, `wrap`, `spill`, `glow`, and `status()`, which returns `'loading'`, `'on'`, `'off'` or `'unavailable'`, plus `onStatus`. It falls back to Canvas lighting on its own.
- **Math:** `CO55.clamp`, `lerp`, `approach`, `ease.{ outCubic, outQuad, inQuad, inOut, outBack }`, `angDiff`, `lerpAng`, `approachAng`, `rng(seed)`, `hash2`, `noise2`, `bayer`, `smoothDamp`, `hex`, `shade`, `mix`, `V3`, `ik3`.

## Recipes
- **Enemy:** a factory returning `{ x, y, z, vx, vy, r, hp, rig }`. In update: steer with `flow.dir`, move, `map.collide(e)`, then `e.rig.update`. In draw: `r.shadow`, then `r.actor(e.x, e.y, 0, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash })`. Give every attack a wind-up plus an `r.decal` telegraph.
- **Hit:** during the `active` phase, test distance and angle. On a hit, subtract hp, apply knockback, then call `game.freeze(.05)`, `game.shake(2)`, `particles.sparks` and `particles.text`.
- **Glowing prop:** call `px.glow(g, 1)` at the start of its queue function, add `lights.add(..., { color, shadow: true })`, and add `lights.caster(...)` for its solid base.
- **ASCII maps:** write the level as strings (`#` wall, `.` floor, letters for spawns) and convert them to `cells`, as the starter game does.
- **Crowds:** use `outline: false`, skip work with `r.visible` checks, and separate monsters with a spatial hash.
- **Side-view platformer:** use `view: 'side'`, treat z as height with your own gravity, and collide against your own grid of (x, z) tiles.
