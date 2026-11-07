# The genre kits (v{{VERSION}})

A kit is a complete small game in one genre, written to be copied: its title, play and end, the modules it rests on,
its sound, touch controls and a phone's screen. The API card's Genre playbook (`API.md`) names a kit for each genre (its
"Copy slice" column: a name with 3D in front, 3D HORROR, is a 3D kit, `3d-horror` here); the tables say which file is
which. Each kit is the same game as the single-file kit on the site (my-3d2dge.vercel.app/kits/<id>,
/kits/3d-<id>), readable, on this package's engines.

**2D or 3D?** A 2D kit draws its world in x, y and z from any of the classic angles (iso, three-quarter, side-on,
top-down, Mode 7, the pseudo-3D road) on the 2D engine alone. A 3D kit puts a real 3D world under the game: a perspective
camera (chase, first person, behind a kart or a ship, fixed cameras by room), drawn by three.js and simulated by Rapier,
through the 3D engine (`../my-3d2dge-3d.js`, its header the 3D manual). The 2D engine still runs a 3D game: its scenes,
input, menus, HUD and sound.

## 2D kits

- **`<id>.js`**, its game: the starter's shell (the title menu, the keys every kit shares, the proof), the slice, and the
  start, as the single-file kit holds them between `GAME START` and `GAME END`. Its header says what it plays, its keys,
  its deep links and how it works.
- **`<id>.html`** plays it (open it, or `node tools/check.mjs kits/<id>.html#<id>`); `#<id>` starts the slice, and
  `#<id>/<part>` jumps into a part.
- **`node kits/test.mjs <id>`** runs it headless: the slice plays, and its proof gives the same hash twice.

**Start a game from one:** copy `<id>.js` to `game/game.js` (and, if its page loads an asset set, that `<script>` line into
`game/index.html` before `game.js`). Then replace the starter's title menu with your own title scene and keep only your
game, as its header says. Its test: copy `kits/test.mjs`'s three stand-ins (`window`, `addEventListener`, `location`) into
`game/test.mjs`. A game of several genres reads the kits it mixes and builds on the full engine, which has every module.

| Kit | Files | What it plays | Modules | Deep links |
| --- | --- | --- | --- | --- |
{{KITS}}

## 3D kits

- **`3d-<id>.js`**, its game: the 3D starter's shell, the slice and the start, one ES module loaded after both engines
  (`../my-3d2dge.js`, a classic script, then `../my-3d2dge-3d.js`). Its header says what it plays, its keys and how.
- **`3d-<id>.html`** plays it, **served, not opened from a disk** (browsers load modules only over http): `node
  tools/check.mjs kits/3d-<id>.html#<id>` serves the package and plays it in headless Chromium (WebGL 2), or run
  `npx serve` at the package's root and open `/kits/3d-<id>.html#<id>`. Its import map points at `../vendor/`.
- A 3D kit has no headless test in Node: the 3D world bakes its textures on a page. Its proof runs in the browser,
  `__game.scenes.<id>.run(600)`, a hash the same every time and on WebGL 2 and WebGPU alike.

**Start a game from one:** copy `3d-<id>.js` to `game3d/game.js` (and, if its page loads an asset set, that `<script>`
line into `game3d/index.html` before the 3D engine). Then replace the starter's title menu with your own title scene and
keep only your game, as its header says. `game3d/` as it comes is the 3D manual's quick start, a smaller game to start
from.

| Kit | Files | What it plays | Modules | Deep links |
| --- | --- | --- | --- | --- |
{{KITS3D}}
