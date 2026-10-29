# Genres, systems and kits: how the engine grows

How my-3D2dge covers the era's games (the early 80s to the late PS1), and the rules for adding to that: which system goes
where, how a module is made, how a kit stays small, what every kit has, and the traps. These were the design rules of
the genre plan (`docs/HANDOFF-GENRES.md`, 2026-10-27 to 2026-10-29: Milestones 0 to 14 and 16; folded in at v0.81.2,
and again at v0.81.5 after a last version with M16's row, D65 and D68; its full text with every milestone's as-built
note and progress row in `git show 24aee29:docs/HANDOFF-GENRES.md`).

Where a genre stands today: README's **Genre coverage** (a kit or a recipe on every row), the API card's playbook (each
genre, its view, its modules, the kit to copy) and `AI_GUIDE.md`'s **Genre recipes**.

## What converts well

A genre converts well when:
1. its play reads in one of the engine's views, or under one of the 3D engine's cameras;
2. its art can be drawn by code: rigs, shapes, sprites, materials, backdrops;
3. its rules are deterministic gameplay on the CPU;
4. a vertical slice of it fits a kit (20k to 45k tokens of game code) and plays on a phone;
5. it needs nothing the engine can't make: video, voice, licensed music.

**Out of scope**, each with what covers it instead: online play (the co-op plan, `docs/HANDOFF-COOP.md`, on hold); text
adventures and parsers; realistic simulations (Gran Turismo's driving, flight simulators: arcade handling only); 3D
fighting (the fight module and the 3D engine's puppets could make one: no kit until a builder asks); extreme sports (a 3D
trick system); loops in a side-scroller (the Platformer's momentum stops at slopes); video, voice, licensed music, MMOs,
level editors, mod tools; card and board games (a recipe, `grid` and the pointer, if a builder asks); production
hardening (principle 10: when a game heads to production).

## General systems, proven by kits

A system enters the engine because several genres use it, and a kit is the example a model copies. No genre's rules go
in the core.

| System | Where | The genres it serves |
| --- | --- | --- |
| tweens, scripted sequences, paths | core | cutscenes, waves and dives, moving platforms, racing lines, rails, menus |
| animated, rotated and scaled sprites; wrap-around | core | arcade, shooters, racing's billboards, space |
| transitions, weather, a screen filter | core | every genre |
| input sequences | core | fighting moves, cheat codes, rhythm |
| a camera window, framing several targets | core | platformers, local players, racing |
| grids: paths, ranges, fields of view, fog, turns | module `grid` | roguelikes, tactics, puzzles, mazes, board games, strategy's fog |
| generated maps | module `gen` | roguelikes, action RPG dungeons, strategy maps |
| scores, tables, lives, attract mode | module `arcade` | arcade, shooters, puzzles, pinball, brawlers |
| two to four players, split screen | core | fighting, co-op, versus puzzles, racing, artillery |
| fighters and matches | module `fight` | fighting, brawlers' bosses |
| side-view traversal; worlds of rooms | the core's Platformer, module `rooms` | platformers, Metroidvanias, cinematic platformers |
| Mode 7, the road | modules `mode7`, `road` | racing, rail shooters, world maps, flying |
| vehicles and races | module `drive`; the 3D engine's `world.vehicle` | racing in 2D and 3D, top-down driving |
| dialogue, flags, quests; items, inventories, stats, shops, encounters | modules `story`, `rpg` | JRPGs, adventures, point-and-click, visual novels, horror, sims |
| save slots, dialog markup, big ground maps | core | every long game |
| picking under the cursor | core | tactics, strategy, point-and-click, board games |
| a free camera; selection and orders; agents with needs | core and module `strategy` | RTS, builders, sims, tactics |
| walkable areas, hotspots, verbs | module `click` | point-and-click, visual novels |
| 2D rigid bodies; destructible terrain | modules `physics`, `terrain` | pinball, Breakout, artillery, Lemmings, Asteroids |
| a music clock, layers; a songbook; charts and judgments | core audio, modules `songs`, `rhythm` | rhythm, stealth and chases, every genre's music |
| lock-on, camera zones, tank controls; vehicles, tracks, flight | the 3D engine | 3D action, horror, racing, flight, rails |

## Modules

A system several genres share that the core doesn't need is a module: one small file, `engine/modules/<name>.js`, loaded
after the core, its header its manual (at most 1,500 cl100k tokens, or its line in `tools/doctrine-check.mjs`), using
only the core's public API. `engine/modules/README.md` is the authority: the header's form, which editions a module
loads after, how the builds and the tools take it (`tools/engine-lib.mjs`), its tests (a change to a module runs
`contract`, `agent`, `modules`, `kits` and the phone test of the kits that carry it). A kit carries the modules its
slice names (`@modules grid gen` in its header). The index gets a section per module, the API card one line.

## The kit diet and the budgets

- A kit leaves out the core's sections its slice never calls; each becomes a stub that warns once (a constructor throws,
  naming the section and the file that has it). `DIET` in `tools/build.mjs` names the parts that may go and the methods
  that lead into them; `tools/diet.mjs` works out the rest from the code (what the kit's shell, slice, sets, modules and,
  in 3D, the 3D engine call). The build fails when a slice uses a name it would leave out.
- The diet changes no pixel: `kits-test` runs each slice's proof (no stub ever called), and `kits-test --compare <dir>`
  films each kit beside a build from before.
- A core addition that not every game calls goes in a section of its own (a `/* ====` banner) with a line in `DIET`.
- The 3D engine is not on a diet: every 3D kit carries it whole (D63). A 3D diet (its section 8b, vehicles and flight,
  left out of a kit that never calls it) would take about 10,000 tokens off each such kit.
- **Budgets** (`doctrine-check` counts them): a 2D kit 200,000 cl100k tokens, suspended until the owner's review pass
  (D52; thirteen are past it); each 3D kit its own (D51, D61, D63, D64); the API card 21,000 (D59), the index 60,000
  (D57), the 3D engine's manual 8,000 (D60), a module's manual 1,500 (or its line), the agent header 10,000.

## What every new kit has

- A title, play and an end (a win, a loss or the results), then back to the title; the standard features (pause menu,
  settings, rebinding); `pausable: true` in play.
- **Any screen:** `res: 'ps1', expand: true` (or its own `res`, with `expand`), the extra space filled with its own world,
  the HUD anchored to `r.W` and `r.H`. A game of one fixed screen fills the sides with cabinet art drawn by code.
- **A phone:** touch controls that fit the genre, tap targets of at least 44 CSS pixels, and a case in
  `tools/phone-test.mjs` (a 3D kit: `tools/kit3d-test.mjs`'s phone section).
- **The look target** (PS1 / N64 era 2D): backdrops, materials, lighting, dressed HD rigs, effects, the title font, and
  `check.mjs` with no look notes. A kit of 1980 games plays as a remaster, with the classic look one key away.
- **Sound:** an effect for every action, and at least one original song of its own in the step sequencer's format.
- **For agents:** a deep link (`#<id>`, and `#<id>/<part>` to jump in), `window.__game`, `game.debug.snapshot()`, a proof
  (`<SLICE>.run(n)`: the same hash twice; a 3D kit's the same on WebGL 2 and WebGPU) and a bot (`<SLICE>.bot()`) that
  plays to the end, with its expectation in `tools/kits-test.mjs` (`BOTS`, `BOTS3D`).
- **Original:** its names, characters, levels and songs are its own. The docs may name the games it is in the style of;
  the game never uses their names, characters, logos or music.
- **Registered where kits are:** the shell's `SLICES`, `tools/build.mjs` (`SLICES3D` for a 3D one), `vercel.json`'s kit
  routes, `src/labs.json` (Starter kits, and a To check card), README's tables, the API card's playbook,
  `doctrine-check`'s budget for a 3D kit. A slice's number keeps families together (`25-metroidvania` beside
  `20-platformer`).

## Every change that adds to the engine

- **Opt-in.** A new option on an existing class defaults to today's behavior. Every existing kit, lab and Emberdeep plays
  exactly as before (filmstrips compared), and every suite passes.
- **Deterministic (principle 5).** Time comes from `dt` and the game's clocks, gameplay randomness from `E.rng` or
  `Math.random`, cosmetic randomness from the screen's own stream. Nothing in gameplay reads the audio clock, the screen
  or the GPU. A module's contract tests run at 60, 90, 120 and 144 Hz.
- **Common ground (principle 7).** The names and algorithms agents already know: Penner's easings, generator coroutines,
  A* and Dijkstra, symmetric shadowcasting, numpad notation for fighting moves, SCUMM's verbs, arcade car physics with
  lateral grip. A system agents may know under another engine's name (Phaser's tweens, Unity's coroutines, Godot's
  `AStarGrid2D`) says so in its manual.
- **Budgets reported** in every pull request: the API card, the index, each manual it touched, each kit's tokens, and the
  size of a deployment (each kit adds a few hundred KB; D49 keeps the bill down). A raise is a decision.
- **Decisions** (a budget raised, a deviation) go in `docs/DECISIONS.md`, in a commit of their own, flagged in the pull
  request.

## Traps

- **Changing a default.** Compare filmstrips of every page a change could reach.
- **A stub that changes behavior.** The diet must leave a kit's play and pixels exactly as they were.
- **The audio clock in gameplay.** Only the music clock on game time; the sound follows it, never the other way round.
- **Cosmetic randomness on the gameplay stream.** A draw made only when something is on screen breaks replays.
- **Two players on one keyboard.** Many keyboards drop a third or fourth key held at once (ghosting): the two halves'
  presets keep each player's keys apart, and pads are best for four.
- **Touch and the pointer.** A drag that pans and a drag that selects; a tap that walks and a tap that acts. Decide once
  per module and write it in its manual.
- **Per-pixel loops** (Mode 7, the road, fog, terrain): measure them on the phone test's emulated phone, at the PS1
  resolution.
- **The manuals.** Out of room: move detail to the index first, then ask for a budget with a decision.
- **Timing checks on a slow machine.** The phone suite's timing checks fail in a slow container, `main` alike: run one on
  `main` in the same container before reading it as a change's, and run browser work beside `npm test` only when its
  timing checks don't matter.
- **A 3D circuit's drivers.** E.Race's drivers steer at the racing line, walls or not: a kart that leaves the course must
  be set back on the road (the 3D RACING kit's Lakitu), and a bank or a crest that rises within a few units throws karts
  over the wall (`world.track` eases its banking over about 40).
