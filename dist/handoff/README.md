# my-3D2dge handoff package (v0.37.0)

Everything a coding agent needs to build, run, test and check a game on the full my-3D2dge engine, in one folder of text
files. You don't need the engine's repository, and you don't need to read the engine's source below its header.

## Start here

1. **Read `API.md`**, the API card: a complete game to start from, what x, y and z mean in each view, the rules, the
   common mistakes and the API by area. It is the one page to read whole.
2. **Search `API-INDEX.md`** when you need a name: every public name in the engine, one line each, with its signature,
   units and defaults, and the height rules at the top. `grep -n "ledge\|landing" API-INDEX.md`. Don't read it whole.
3. **`AI_GUIDE.md`** has the recipes: genre by genre, the look to aim for, the frame order, heights, recorded sessions.
4. **Don't build a pause menu, settings, key rebinding, full screen or a loading screen**: every game has them (`API.md`,
   "Standard features"). Adjust them with `new E.Game({ menu: { items, settings, controls, quit } })`; heavy setup goes in
   `game.start({ boot: { steps } })`.
5. **Copy `game/`** and make it yours: `game/game.js` is a small complete game (climbing, a guard with sight, a HUD,
   scenes), `game/index.html` plays it, and `game/test.mjs` tests it without a browser.

## What is here

| File | What it is |
| --- | --- |
| `my-3d2dge.js` | the full engine, readable (one file, no dependencies) |
| `my-3d2dge-agent.js` | the agent edition: the essential engine, whose header is a shorter manual (a game written for it runs on the full engine) |
| `API.md`, `API-INDEX.md`, `AI_GUIDE.md` | the card, the index, the guide |
| `game/` | the template game: `index.html`, `game.js`, `test.mjs` |
| `tools/check.mjs` | plays a game in headless Chromium, switches its views, and reports errors, what is on screen, and `game.debug.snapshot()` |
| `tools/filmstrip.mjs` | records frames into one picture, to judge motion (`--seed 1` makes it repeatable, `--compare` marks what changed) |
| `tools/replay.mjs` | replays a recorded play session exactly (`E.session`, a bug seen on a phone) |
| `package.json` | pins Playwright for the tools |

## Run, test, check

```sh
npm install                          # Playwright, for the tools (once)
npx playwright install chromium      # its browser (once)
node game/test.mjs                   # the game's headless test: no browser, a second
node tools/check.mjs game/index.html # play it in a browser: errors, screenshots, its snapshot
node tools/filmstrip.mjs game/index.html --steps "wait:800 press:Enter wait:500 rec:16:2 down:KeyD wait:600" --seed 1
```

Open `game/index.html` in a browser to play (or serve the folder: `npx serve`). To hand a single file to a person, inline
the two scripts into the page.

## Testing a game without a browser

`new E.Game()` is headless in Node (or with `{ headless: true }`): no screen, sound or DOM, and `draw` is skipped.

- `game.advance(seconds)` runs exact fixed steps of 1/120 s at once: `advance(1)` is 120 updates.
- `game.input.tap('jump')` presses an action for one step, `hold('right')` holds one down, `hold('right', false)` lets go.
- `game.debug = { snapshot() { return {...} }, teleport(x, y, z) {...} }` is your game's handle: tests read it, and
  `tools/check.mjs` and `tools/replay.mjs` print it.
- `game.stop()`, `game.start()` and `game.dispose()` stop, resume and end a game.

The same inputs give the same game on every machine and at every refresh rate: the clock is an exact fixed step.
