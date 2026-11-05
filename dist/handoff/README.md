# my-3D2dge handoff package (v0.89.0)

Everything a coding agent needs to build, run, test and check a game on the full my-3D2dge engine, in one folder of text
files. You don't need the engine's repository, and you don't need to read the engine's source below its header.

**The engine is yours to change.** This copy is yours to fix, extend or rewrite in any way you see fit: `my-3d2dge.js`
is the engine, readable, with every module, and every page and test here loads it (`modules/` and `my-3d2dge-agent.js`
are separate copies). If you hand the game back, a line on what you changed and why helps: it shows what the engine
lacks.

## Start here

1. **Read `API.md`**, the API card: a complete game to start from, what x, y and z mean in each view, the rules, the
   common mistakes and the API by area. It is the one page to read whole.
2. **Start from a game, not an empty file.** The kit for your genre (`kits/`): the card's Genre playbook names one for
   each genre, and `kits/README.md` says which file is which. `kits/<id>.js` is a complete game in that genre, readable
   (its title, play and end, the modules it rests on, sound, touch controls), `kits/<id>.html` plays it, and
   `node kits/test.mjs <id>` runs it headless. Or the template, `game/`: a small complete game (climbing, a guard with
   sight, an HTML HUD, scenes) that `game/index.html` plays and `game/test.mjs` tests without a browser. Copy one into
   `game/` and make it yours.
3. **Search `API-INDEX.md`** when you need a name: every public name in the engine, one line each, with its signature,
   units and defaults, and the height rules at the top. `grep -n "ledge\|landing" API-INDEX.md`. Don't read it whole.
4. **`AI_GUIDE.md`** has the recipes: genre by genre, the look to aim for, the frame order, heights, recorded sessions.
5. **Don't build a pause menu, settings, key rebinding, full screen or a loading screen**: every game has them (`API.md`,
   "Standard features"). Adjust them with `new E.Game({ menu: { items, settings, controls, quit } })`; heavy setup goes in
   `game.start({ boot: { steps } })`.
6. **Objects without drawing code:** read `docs/ASSETS.md` whole before you draw a barrel, a table or a tree.
   `r.shape('barrel', x, y, 0, { facing })` draws one of the core library's in every view; `node tools/asset-find.mjs
   "market stall"` searches it and the store (`src/assets/sets/`: about a thousand objects, materials and sprites,
   each with where it came from), and `node tools/asset-sheet.mjs mine.js#stool` draws one you wrote, to look at
   before you use it.
7. **A game in real 3D** (first person, a light gun, a racer on banked roads, flight, a dungeon crawled in 3D, fixed
   cameras): the 2D views have no perspective camera, but the engine has a 3D add-on, `World3D` (three.js r182 and
   Rapier 0.19.3 under the 2D engine, which keeps the HUD, menus and sound). It is not in this folder: take
   `engine/my-3d2dge-3d.js` (its header is its manual), `vendor/` and the 3D kit closest to your game
   (`src/starter3d/`) from the repository, github.com/michaelcrosato/my-3d2dge, and see them play at
   my-3d2dge.vercel.app/3d.

## What is here

| File | What it is |
| --- | --- |
| `my-3d2dge.js` | the full engine, readable (one file, no dependencies): the core, then every module |
| `modules/` | each engine module on its own, when there are any (one general system; its header is its manual), to load after the agent edition |
| `my-3d2dge-agent.js` | the agent edition: the essential engine, whose header is a shorter manual (a game written for it runs on the full engine) |
| `API.md`, `API-INDEX.md`, `AI_GUIDE.md` | the card, the index, the guide |
| `kits/` | the 2D genre kits, readable: each kit's game (`<id>.js`) and the page that plays it (`<id>.html`), the table of them (`README.md`) and their headless test (`test.mjs`) |
| `game/` | the template game: `index.html`, `game.js`, `test.mjs` |
| `tools/check.mjs` | plays a game in headless Chromium, switches its views, and reports errors, what is on screen, and `game.debug.snapshot()` |
| `tools/filmstrip.mjs` | records frames into one picture, to judge motion (`--seed 1` makes it repeatable, `--compare` marks what changed) |
| `tools/replay.mjs` | replays a recorded play session exactly (`E.session`, a bug seen on a phone) |
| `docs/ASSETS.md` | the asset card: still objects and materials as data (`r.shape`, `map.solid`, `E.MATERIALS`), the core library, writing one |
| `tools/asset-find.mjs`, `asset-sheet.mjs`, `asset-set.mjs` | search the core library and the store; draw an object in every view and lint it; cut the few entries a game uses into a set of its own (`asset-lib.mjs` is theirs) |
| `src/assets/` | the asset store: sets of objects and materials converted from CC0 libraries (Kenney, KayKit, ambientCG), with their catalogs. A game loads one with its script and `E.addAssets(window.ASSETS['kenney-furniture'])`; the Asset Lab shows them all at my-3d2dge.vercel.app/asset-lab |
| `package.json` | pins Playwright for the tools |

Not here: the 3D engine (three.js and Rapier) and its kits, the playbook's 3D rows. They are on the site
(my-3d2dge.vercel.app/3d) and in the repository (github.com/michaelcrosato/my-3d2dge); here a 3D game is built on the 2D
engine's views (`kits/README.md`, 3D).

## Run, test, check

```sh
npm install                          # Playwright, for the tools (once)
npx playwright install chromium      # its browser (once)
node game/test.mjs                   # the game's headless test: no browser, a second
node tools/check.mjs game/index.html # play it in a browser: errors, screenshots, its snapshot
node kits/test.mjs arcade            # a kit, headless: it plays, and its proof gives the same hash twice
node tools/check.mjs kits/arcade.html#arcade/maze   # a kit in a browser, at a part (its deep link)
node tools/filmstrip.mjs game/index.html --steps "wait:800 press:Enter wait:500 rec:16:2 down:KeyD wait:600" --seed 1
```

Open `game/index.html` in a browser to play (or serve the folder: `npx serve`). To hand a single file to a person, inline
the two scripts into the page, writing every `</script` inside them as `<\/script` (the agent edition's header has one,
and the page would end there).

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
