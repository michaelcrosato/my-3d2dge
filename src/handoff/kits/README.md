# The genre kits (v{{VERSION}})

A kit is a complete small game in one genre, written to be copied: its title, play and end, the modules it rests on,
its sound, touch controls and a phone's screen. The API card's Genre playbook (`API.md`) names a kit for each genre (its
"Copy slice" column); the table says which file is which. Each kit is the same game as the single-file kit on the site
(my-3d2dge.vercel.app/kits/<id>), readable, on this package's engine.

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

**3D:** the 3D engine (three.js and Rapier) and its kits, the playbook's 3D rows, are not in this package. They are on the
site (my-3d2dge.vercel.app/3d, /kits/3d-<genre>) and in the repository (github.com/michaelcrosato/my-3d2dge:
`engine/my-3d2dge-3d.js`, its header the 3D manual; `src/starter3d/`). Here, a 3D game is built on the 2D engine's views,
a world in x, y and z drawn from any angle (`API.md`, Coordinates).
