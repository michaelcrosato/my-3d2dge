# my-3D2dge handoff package (v{{VERSION}})

Everything a coding agent needs to build, run, test and check a game on my-3D2dge, in one folder of text files: the 2D
engine, the 3D engine with the libraries it loads, their manuals, a complete game in every genre (2D and 3D), two
template games and the tools. You don't need the engine's repository, and you don't need to read the engines' source
below their headers.

**The engine is yours to change.** This copy is yours to fix, extend or rewrite in any way you see fit: `my-3d2dge.js`
is the engine, readable, with every module, and every page and test here loads it (`modules/` and `my-3d2dge-agent.js`
are separate copies); `my-3d2dge-3d.js`, the 3D engine, is readable too. If you hand the game back, a line on what you
changed and why helps: it shows what the engine lacks.

## Find it fast

| You want | Open |
| --- | --- |
| how the engine works (once, whole) | `API.md`, the API card |
| a 2D game: any classic view (iso, three-quarter, side-on, top-down, Mode 7, the pseudo-3D road) | your genre's kit, `kits/<id>.js`, or the template, `game/` |
| a game in real 3D: a perspective camera (first person, a 3D platformer, karts on banked roads, flight, fixed cameras by room, a dungeon crawled in 3D) | the 3D engine, `my-3d2dge-3d.js`, whose header is the 3D manual (read it whole too); your genre's 3D kit, `kits/3d-<id>.js`, or the template, `game3d/` |
| which kit is which | `kits/README.md`: the 2D and the 3D tables (the card's Genre playbook names a kit for every genre) |
| a name in the 2D engine | `grep -n "ledge\|landing" API-INDEX.md`: every public name, one line each (search it, don't read it whole) |
| a name in the 3D engine (`E.World3D`, `world.hero`, `world.camera`, `world.track`) | `grep -n "camera.lock" my-3d2dge-3d.js`: its header, the 3D manual, names them all |
| a module (grids and turns, races, fights, an RPG's rules, songs ...) | `modules/<name>.js`, whose header is its manual (`my-3d2dge.js` carries every module) |
| a genre's recipe, the look to aim for, heights, recorded sessions | `AI_GUIDE.md` (search it) |
| objects without drawing code (a barrel, a table, a tree) | `docs/ASSETS.md`, then `node tools/asset-find.mjs "market stall"` |
| the player's own language | `docs/LANGUAGES.md` |
| to see the game play, film it, replay a session | `tools/check.mjs`, `tools/filmstrip.mjs`, `tools/replay.mjs` |

## 2D or 3D

The 2D engine runs every game: its exact fixed steps, scenes, input, pause menu, settings, touch buttons, sound, the
rigs and their moves, the HUD. A game's rules work in world units either way (x east, y south, z up; 16 units a tile).
What differs is the camera.

- **2D** (`my-3d2dge.js` alone): the world, in x, y and z, drawn by code from one of the classic angles, which the
  player can switch. One page opened from a disk, and a headless test in Node. Most of the 8- to 32-bit era is here,
  3D-era remakes too (Mario 64 as blocks of heights in iso).
- **3D** (`my-3d2dge.js`, then `my-3d2dge-3d.js`): a real 3D world under the game's clear canvas (`new E.Game({ bg:
  null })`): a level written as text, or a terrain; Rapier's physics; the rigs as cards or 3D puppets; things and
  shapes; a perspective camera; drawn by three.js. Its pages load ES modules and `vendor/`, so they are served, not
  opened from a disk (`tools/check.mjs` serves them; `npx serve` to play one). Pick it when the game needs a
  perspective camera.

## Start here

1. **Read `API.md`**, the API card: a complete game to start from, what x, y and z mean in each view, the rules, the
   common mistakes and the API by area. It is the one page to read whole. In a 3D game it covers what the 2D engine
   still does there (the game and its scenes, input, the rigs and moves, the HUD, menus, sound).
2. **A 3D game: read the 3D manual too**, the header of `my-3d2dge-3d.js` (about 7,000 tokens, to its first `*/`): how
   to host the page, the mental model, a complete game, the level, the world, actors, the camera (chase, first person,
   fixed, zones, lock-on), things and shapes, vehicles, tracks and flight, the rules. Don't read the code below it.
3. **Start from a game, not an empty file.** The kit for your genre (`kits/`; the card's Genre playbook names one for
   each genre, `kits/README.md` says which file is which): `kits/<id>.js` is a complete 2D game in that genre, readable
   (its title, play and end, the modules it rests on, sound, touch controls), `kits/<id>.html` plays it, and
   `node kits/test.mjs <id>` runs it headless; `kits/3d-<id>.js` is a 3D one, `kits/3d-<id>.html` plays it, served.
   Or a template: `game/` (2D: climbing, a guard with sight, an HTML HUD, scenes, a headless test) or `game3d/` (3D:
   the manual's quick start, a hero, gems and slimes in a room). Copy a kit's game into the template's folder and make
   it yours.
4. **Search `API-INDEX.md`** when you need a 2D name: every public name in the engine and its modules, one line each,
   with its signature, units and defaults, and the height rules at the top. `grep -n "ledge\|landing" API-INDEX.md`.
   Don't read it whole. A 3D name is in the 3D manual.
5. **`AI_GUIDE.md`** has the recipes: genre by genre (the 3D ones on the 3D engine), the look to aim for, the frame
   order, heights, recorded sessions.
6. **Don't build a pause menu, settings, key rebinding, full screen or a loading screen**: every game has them (`API.md`,
   "Standard features"; a 3D game adds the 3D settings with `menu: { settings: E.World3D.SETTINGS }`). Adjust them with
   `new E.Game({ menu: { items, settings, controls, quit } })`; heavy setup goes in `game.start({ boot: { steps } })`.
7. **Objects without drawing code:** read `docs/ASSETS.md` whole before you draw a barrel, a table or a tree.
   `r.shape('barrel', x, y, 0, { facing })` draws one of the core library's in every view (in 3D, `world.shape`);
   `node tools/asset-find.mjs "market stall"` searches it and the store (`src/assets/sets/`: about a thousand
   objects, materials and sprites, each with where it came from), and `node tools/asset-sheet.mjs mine.js#stool` draws
   one you wrote, to look at before you use it.

## What is here

**The engines**

| File | What it is |
| --- | --- |
| `my-3d2dge.js` | the full 2D engine, readable (one file, no dependencies): the core, then every module. Every page here loads it, a 3D page first |
| `my-3d2dge-agent.js` | the agent edition: the essential engine, whose header is a shorter manual (a game written for it runs on the full engine) |
| `modules/` | each engine module on its own (one general system; its header is its manual), to load after the agent edition |
| `my-3d2dge-3d.js` | the 3D engine (`E.World3D`), readable, an ES module loaded after the 2D engine; its header is the 3D manual, with a complete game |
| `vendor/` | three.js r182 and Rapier 0.19.3, the libraries the 3D engine loads (each with its licence, and `VERSION.json`: its files' sizes and checksums); a 3D page's import map names them |

**The manuals**

| File | What it is |
| --- | --- |
| `API.md` | the API card: read it whole |
| `API-INDEX.md` | every public name of the 2D engine and its modules, one line each: search it |
| `AI_GUIDE.md` | the guide: ideas, workflow, a recipe for each genre, the look, heights, sessions, the checklist: search it |
| `docs/ASSETS.md` | the asset card: still objects and materials as data (`r.shape`, `map.solid`, `E.MATERIALS`), the core library, writing one |
| `docs/LANGUAGES.md` | every word a line (AI Hub Languages v1): the page's `game-lines` block and `E.t` |

**The games to start from**

| Folder | What it is |
| --- | --- |
| `kits/` | every genre kit, readable: each 2D kit's game (`<id>.js`) and the page that plays it (`<id>.html`), each 3D kit's (`3d-<id>.js`, `3d-<id>.html`), their tables (`README.md`) and the 2D kits' headless test (`test.mjs`) |
| `game/` | the 2D template game: `index.html`, `game.js`, its words (`game.lines.json`) and its headless test (`test.mjs`) |
| `game3d/` | the 3D template game: the 3D manual's quick start, `index.html` (the import map, both engines, the game) and `game.js` |

**The tools** (Node and Playwright: `npm install` once)

| File | What it is |
| --- | --- |
| `tools/check.mjs` | plays a page in headless Chromium (a 3D page served, on WebGL 2), switches its views, and reports errors, what is on screen, screenshots and `game.debug.snapshot()` |
| `tools/filmstrip.mjs` | records frames into one picture, to judge motion (`--seed 1` makes it repeatable, `--compare` marks what changed) |
| `tools/replay.mjs` | replays a recorded play session exactly (`E.session`, a bug seen on a phone) |
| `tools/lines.mjs`, `tools/lines-scan.mjs` | the engine's own lines put in a page's `game-lines` block and its blocks checked as the hub checks them; a page played in the test language `en-XA`, listing words left in the code |
| `tools/asset-find.mjs`, `asset-sheet.mjs`, `asset-set.mjs` | search the core library and the store; draw an object in every view and lint it; cut the few entries a game uses into a set of its own (`asset-lib.mjs` is theirs) |
| `package.json` | pins Playwright for the tools |

**The asset store:** `src/assets/`, sets of objects and materials converted from CC0 libraries (Kenney, KayKit,
ambientCG), with their catalogs. A game loads one with its script and `E.addAssets(window.ASSETS['kenney-furniture'])`;
the Asset Lab shows them all (`examples/asset-lab.html` in the repository).

## Run, test, check

```sh
npm install                          # Playwright, for the tools (once)
npx playwright install chromium      # its browser (once)
node game/test.mjs                   # the 2D game's headless test: no browser, a second
node tools/check.mjs game/index.html # play it in a browser: errors, screenshots, its snapshot
node kits/test.mjs arcade            # a 2D kit, headless: it plays, and its proof gives the same hash twice
node tools/check.mjs kits/arcade.html#arcade/maze   # a kit in a browser, at a part (its deep link)
node tools/check.mjs game3d/index.html              # a 3D page: served and played on WebGL 2 (its boot takes seconds)
node tools/check.mjs kits/3d-horror.html#horror     # a 3D kit
node tools/filmstrip.mjs game/index.html --steps "wait:800 press:Enter wait:500 rec:16:2 down:KeyD wait:600" --seed 1
node tools/lines.mjs game/index.html # put the engine's own lines (its menus) in the page's game-lines block; --check checks it
node tools/lines-scan.mjs game/index.html   # play it in en-XA: every word should be a line
```

Open `game/index.html` in a browser to play. A 3D page must be served: run `npx serve` here and open the address it
prints, then `/game3d/` or `/kits/3d-horror.html#horror`. To hand a single 2D file to a person, inline the two scripts
into the page, writing every `</script` inside them as `<\/script` (the agent edition's header has one, and the page
would end there); a 3D game stays a folder (its page, the engines and `vendor/`), served.

## Testing a game without a browser

`new E.Game()` is headless in Node (or with `{ headless: true }`): no screen, sound or DOM, and `draw` is skipped unless
the game is made with `draw: true` (the template is): then each `advance` draws a frame on a stand-in, and a draw error
lands in `game.errors`, as it would on a player's screen.

- `game.advance(seconds)` runs exact fixed steps of 1/120 s at once: `advance(1)` is 120 updates.
- `game.input.tap('jump')` presses an action for one step, `hold('right')` holds one down, `hold('right', false)` lets go.
- `game.debug = { snapshot() { return {...} }, teleport(x, y, z) {...} }` is your game's handle: tests read it, and
  `tools/check.mjs` and `tools/replay.mjs` print it.
- `game.stop()`, `game.start()` and `game.dispose()` stop, resume and end a game.
- `game.go('play')` fades for `game.fadeTime` (.22 s) before the new scene enters: advance past it, or set
  `game.fadeTime = 0` in a test.
- A scene change clears `game.after` and `game.every` timers (`{ keep: true }` outlives it); those made before the first
  scene live into it. It ends a hit-stop; `game.timeScale` stays (restore a slow motion with a kept timer). A boot step's `game.go(name)` enters that scene when the boot ends.
- Draw changes nothing, and nothing your update or input relies on (a click target, what is on screen) may be made only
  in `draw`: `E.Menu`'s rows come from its update (`menu.rowAt(i)` is entry i's box, for a test's click), and the camera
  (`game.cam`) says where the screen is in update.
- `E.store` keeps values for the visit in Node, which has no `localStorage` (`E.store.clear()` between games in one test).
- A script's `tap` and `hold` are no device: `input.label()` keeps showing the keys or buttons the player used last.

The same inputs give the same game on every machine and at every refresh rate: the clock is an exact fixed step.

**A 3D game** builds its world on a page (the 3D engine bakes its textures there), so it is tested in the browser:
`game.advance` and `input.tap` / `hold` work the same in the page, `world.hash()` is the proof (after `world.reset()`, the
same inputs give the same hash, on WebGL 2 and WebGPU alike), and `tools/check.mjs` prints `game.debug.snapshot()`.
Each 3D kit's proof is `__game.scenes.<id>.run(600)` (the 3D manual, "Tests").
