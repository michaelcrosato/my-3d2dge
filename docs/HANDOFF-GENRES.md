# Handoff: every genre of the era (the early 80s to the late PS1)

> **Status: ready (2026-10-27).** The owner asked for it. Work it one milestone at a time, in order (section 4); each
> takes the next minor version when it merges. Section 9 logs where the work stands.

The plan to give my-3D2dge the features, frameworks and kits that games from the early 80s to the late PS1 era need, in
the genres that convert well to it. It was made on 2026-10-27 against v0.59.3 (`cb40a14`), from a review of the engine,
the 3D engine, the kits, the manuals and their budgets (section 1). It is for the agents that build each milestone, and
for the owner. It is temporary: when the work lands, what lasts moves into `README.md`, `API.md`, `AI_GUIDE.md`, the
modules' manuals and `docs/DECISIONS.md`, and this file is deleted, as v0.59.1 did with the last plan.

**The brief (from the owner):**
- Review the kits and the engine. Make sure the engine and its kits have the key, most important features and examples
  to support games from the early 80s to the late PS1 era, in the genres that convert well to this engine.
- A plan in milestones, each with a recommended effort level and its `/goal`. The owner compacts the conversation after
  each milestone, and the finished milestone reports the next one's `/goal` and effort level.
- This is a general-purpose engine.

**The plan in brief:**
1. **What there is.** The engine is strong where it began: action in every ground view, side-scrolling, beat-'em-ups,
   vertical shoot-'em-ups, a turn-based battle, stealth, and the 3D engine's action, platformer and shooter, with the
   standard features every game gets. Seven 2D kits and three 3D kits show them (section 1.1).
2. **What is missing** is of two kinds (sections 1.2 and 1.3):
   - systems that many genres share: more than one player, tweens and scripted sequences, paths, animated and rotated
     sprites, grids with pathfinding, fields of view and turns, transitions, a music clock, save slots, big maps, a free
     camera and picking;
   - genre frameworks: the arcade's scores and attract mode, fighting, Mode 7 and the road, vehicles and races,
     dialogue trees and RPG systems, tactics, real-time strategy and simulation, point-and-click, 2D physics and
     destructible terrain, rhythm, and in 3D lock-on, camera zones, vehicles and flight.

   About half of the era's genres have no kit today, and several have only a recipe that the engine can't fully back.
3. **Room first (M0).** Each kit embeds the whole engine minified (160k of its 188k to 208k tokens), and the manuals are
   at their budgets (the API card has 40 tokens left). New frameworks go in small module files that only the kits using
   them carry, and a kit leaves out the engine's sections its game never calls, so every 2D kit drops under 200k tokens
   and stays there.
4. **Then one milestone per family of genres** (M1 to M15). Each adds the general systems that family needs and a kit
   that proves them: a complete vertical slice a model copies, playable on a phone.
   - M0 to M7 hold the most: the arcade, puzzles, roguelikes, two players and fighting, the full platformer and the
     Metroidvania, racing, and the whole JRPG.
   - M8 to M12: tactics, strategy and simulation, point-and-click, physics toys, music and rhythm.
   - M13 to M15: the late 3D era (horror, lock-on, karts, flight) and two optional kits.
5. **Everything is general.** A system enters the engine because several genres use it (section 3.1). New behavior is
   opt-in, so every game that plays today plays exactly as before.
6. **Last (M16):** the plan folds into the docs and is deleted.

## Read this first

- Read `CLAUDE.md`, `DOCTRINE.md`, then this file. This plan doesn't touch Emberdeep; its suites must still pass.
- **One milestone at a time, in order.** A milestone is one pull request, or two (a, b) where it says so. Each takes the
  next minor version when it merges. Section 7 gives each milestone's effort level and `/goal` line, and the rules every
  run follows. The owner may reorder the milestones; the dependencies are in section 4's "Needs" lines.
- **Check the facts first.** Line numbers are as of v0.59.3: search by name when they have moved, and fix this plan where
  the code says otherwise, in the same pull request.
  - `F:line` is `engine/my-3d2dge.js`, `3D:line` is `engine/my-3d2dge-3d.js`, `S:line` is `src/stress.game.js`.
- **A look or a feel nobody can predict** (Mode 7's pixels, a kart's handling, a fighter's weight) may open with a
  Temporary lab, with no version bump (`DOCTRINE.md`), to judge on a phone before the engine work, as the co-op plan's
  Phase 0 does.
- **The co-op plan** (`docs/HANDOFF-COOP.md`) is on hold and separate: it is online co-op for Emberdeep. M4's local
  players are the engine's side of play on one screen; if co-op restarts, its Phase 2 should build on them.
- **Words this plan uses:**

  | word | meaning |
  | --- | --- |
  | core | `engine/my-3d2dge.js`, the engine as it is today |
  | module | a small engine file of its own, `engine/modules/<name>.js`, holding one general system, loaded after the core (section 3.2) |
  | manual | a module's header: what it holds, its API, a complete example and its rules, under a token budget (as the 3D engine's header is) |
  | kit | `dist/kits/my-3d2dge-<id>.html`: the engine, the API card and one slice: the file a chat model is handed |
  | slice | the one game a kit holds, `src/starter/NN-<id>.js` (`src/starter3d/` in 3D) |
  | the diet | a kit built without the core's sections its slice never calls (section 3.3) |
  | proof | a scripted run of a slice from a seed that returns a hash, the same every time (`<SLICE>.run(n)`, as the 3D slices have) |
  | family | genres that share systems: arcade, platform, fighting, racing, RPG, strategy, adventure, physics, music, 3D |

## 1. The review

### 1.1 What there is (v0.59.3)

| Part | What it holds |
| --- | --- |
| World and views | a 3D world (x east, y south, z up, 16 units a tile) drawn iso, three-quarter, top-down, brawler, side, overhead or at a custom yaw and pitch; console resolutions (`E.RES`: nes, snes, gb, gbc, gba, genesis, pce, n64, ps1, wide); zoom and turn; `expand` fills any screen |
| Drawing | pixel primitives; string sprites (they flip); a 5x7 font and title logos; stepped translucency and blend modes; canvas and WebGPU lighting; parallax backdrops (10 presets); 38 props, 25 shapes and 61 materials as data; particles (dust, sparks, debris, fire, smoke, glints, rings, text); x-ray, afterimages, weapon trails |
| Characters | the HD `Humanoid` (builds, outfits, hair, hats, capes, 24 moves in `E.MOVES`, combos, poses, IK), the `Blob`, motion clips from the store |
| Levels and motion | `TileMap` (heights, materials, facades, flow fields over heights, sight and ledges); `PlatformMap` (solid, one-way, ladders, slopes, hazards) with the `Platformer` (coyote time, buffering, variable jumps, double jump, wall jump, dash, ladders, moving platforms); `Body`; `Mover` (climbing, vaulting, leaping, gliding, stamina); `E.ACTIONS`; perception (`E.sees`, `E.hears`, `E.Suspicion`); `Bullets` and patterns; `SpatialHash` |
| Game | scenes that fade, an exact 1/120 s step, hit-stop, slow motion, timers, a camera (following with a lead, bounds, rooms, an offset), `E.store`, `E.rng`, noise |
| Interface and sound | `Dialog` (typing, names, choices, portraits, radio), `Menu`, `E.ui` (box, bar, hearts, counter), `E.Shell` (HTML screens and a HUD); a chip synth with about 30 effects, a step sequencer and 5 songs |
| Standard features | the pause menu, settings, rebinding, controller and touch options, full screen, the boot, pausing by itself, prompts from `input.label` |
| For agents | headless games, sessions recorded on any device and replayed exactly, `check.mjs`, filmstrips, the API index, contract tests |
| The 3D engine | three.js r182 and Rapier 0.19.3 under the 2D game: levels as text (walls, floors, stairs, platforms, pits), heroes on a character controller, mobs as bodies, props, moving platforms, things (doors, keys, levers, springs...), cameras (the views in 3D, chase, first person, fly, fixed), open-world terrain, filters |
| Kits | 2D: adventure, platformer, brawler, shooter (vertical), RPG battle, stealth, animation lab. 3D: action, platformer, shooter |

### 1.2 The era's genres, against it

How each family of genres converts, what backs it today and what it lacks. "A recipe" means `AI_GUIDE.md` or the API
card's playbook says how, but no kit shows it.

| Family | The era (examples) | Converts as | Today | Missing | Milestone |
| --- | --- | --- | --- | --- | --- |
| Fixed-screen arcade | Asteroids (1979), Pac-Man (1980), Galaga (1981), Donkey Kong (1981), Dig Dug, Joust, Robotron (1982) | overhead or side, one screen | recipes; the slices keep a best score (`best()`) | high-score tables with initials, lives and extra lives, attract mode, grid movement with buffered turns, wrap-around, rotated and animated sprites | M1, M2, M3 |
| Shoot-'em-ups | Xevious (1982), Gradius (1985), R-Type (1987), Raiden (1990), Einhänder (1997) | overhead (vertical), side (horizontal) | SHOOTER kit (vertical) | a horizontal stage, options that trail the ship, the arcade frame, waves on paths | M1, M3 |
| Platformers | Super Mario Bros. (1985), Castlevania (1986), Mega Man 2 (1988), Sonic (1991), Klonoa (1997) | side, brawler for 2.5D | PLATFORMER kit | crouching and crawling, ledge hangs, swimming, ice, conveyors, springs, ropes and swings, slope momentum | M5 |
| Metroidvania, run-and-gun, cinematic | Metroid (1986), Contra (1987), Prince of Persia (1989), Flashback (1992), Super Metroid (1994), Symphony of the Night (1997) | side | a recipe (`cam.room`) | worlds of rooms, a map of what was explored, ability gates, save rooms, eight-way aim shown | M5 |
| Beat-'em-ups | Double Dragon (1987), Final Fight (1989), TMNT (1989), Streets of Rage 2 (1992) | brawler | BRAWLER kit | a second player | M4 |
| Fighting | Street Fighter II (1991), Mortal Kombat (1992), Samurai Shodown (1993), Darkstalkers (1994) | side | a recipe (two `Platformer`s, `overlapBox`) | two players, motion inputs, hit and hurt boxes, frame data, guarding, rounds, a CPU opponent | M4 |
| Action adventure | The Legend of Zelda (1986), A Link to the Past (1991), Landstalker (1992), Secret of Mana (1993) | three-quarter, top-down, iso | ADVENTURE kit | big overworlds (a floor is baked whole, one canvas per view: F:4444) | M7 |
| JRPG | Dragon Quest (1986), Final Fantasy VI (1994), Chrono Trigger (1995), Pokémon (1996), Final Fantasy VII (1997) | three-quarter towns, side-view battles | RPG BATTLE kit (the battle only) | the loop round it: a world map, towns, dialogue trees and flags, items, equipment, shops, encounters, save slots | M7 |
| Roguelike | Rogue (1980), NetHack (1987), Mystery Dungeon (1993), Shiren (1995) | iso, three-quarter, top-down | none | turns, fields of view and fog, generated maps | M2 |
| Tactics | Fire Emblem (1990), Shining Force (1992), Tactics Ogre (1995), Final Fantasy Tactics (1997) | iso with heights | none | move ranges over heights, a turn order, the raised cell under the cursor, facing | M2, M8 |
| Puzzle | Tetris (1984), Columns (1990), Dr. Mario (1990), Puyo Puyo (1991), Tetris Attack (1995) | overhead | a recipe | matching groups, a kit, versus | M2, M4 |
| Racing | Pole Position (1982), OutRun (1986), RC Pro-Am (1988), F-Zero (1990), Super Mario Kart (1992); in 3D Ridge Racer (1993), Mario Kart 64 (1996), Crash Team Racing (1999) | Mode 7, the road, top-down; the 3D engine | a recipe (top-down); Mode 7 only inside the stress test (S:615-845) | a perspective floor, the road, car physics, laps and positions, AI drivers, split screen, 3D vehicles | M6, M14 |
| Strategy and simulation | SimCity (1989), Populous (1989), Dune II (1992), Theme Park (1994), Warcraft II (1995), Command & Conquer (1995), Harvest Moon (1996), StarCraft (1998), RollerCoaster Tycoon (1999) | iso, top-down | none (flow fields and crowds exist) | a free camera, picking, box selection, orders, fog of war, placement, production, agents with needs, time controls | M2, M9 |
| Point-and-click and visual novels | King's Quest (1984), Maniac Mansion (1987), Snatcher (1988), Monkey Island (1990), Broken Sword (1996), Grim Fandango (1998) | three-quarter or side rooms | `Dialog`'s choices and portraits | walkable areas, hotspots, verbs, an inventory and combining, dialogue trees and flags | M7, M10 |
| Physics toys | Marble Madness (1984), Arkanoid (1986), Lemmings (1991), Scorched Earth (1991), Pinball Fantasies (1992), Worms (1995) | a steep ground view (a table), side | none | 2D rigid bodies with continuous collision, destructible terrain | M11 |
| Rhythm | PaRappa the Rapper (1996), Beatmania (1997), Dance Dance Revolution (1998), Space Channel 5 (1999) | any | none (songs run on the audio clock: F:6335-6352) | a music clock on game time, charts, judgments, an audio offset; more songs | M12 |
| Stealth | Metal Gear (1987), Tenchu (1998), Metal Gear Solid (1998) | iso, three-quarter | STEALTH kit | music that turns with the alert (it cuts to another song) | M12 |
| 3D action and horror | Alone in the Dark (1992), Resident Evil (1996), Ocarina of Time (1998), Silent Hill (1999) | the 3D engine | 3D ACTION kit; a `fixed` camera | lock-on, camera zones, tank controls, locked doors, an item box | M13 |
| 3D platformers and shooters | Super Mario 64 (1996), Crash Bandicoot (1996), GoldenEye 007 (1997), Spyro (1998) | the 3D engine | 3D PLATFORMER and SHOOTER kits | an indoor corridor shooter, as a recipe | M16 |
| Flight, rails and light guns | Space Harrier (1985), Star Fox (1993), Virtua Cop (1994), Panzer Dragoon (1995), Time Crisis (1995), Star Fox 64 (1997) | the 3D engine | none | flight on rails and free, paths, aiming with the pointer | M14 |
| First-person dungeons | Wizardry (1981), Dungeon Master (1987), Eye of the Beholder (1991), King's Field (1994) | the 3D engine, first person | first person exists | stepping on a grid in 3D, a party | M15 (optional) |
| Sports | Tecmo Bowl (1987), Sensible Soccer (1992), NBA Jam (1993), Mario Golf (1999) | brawler, top-down | none | up to four players, a ball's arcs, team AI | M4, M15 (optional) |

### 1.3 What stands in the way, measured

- **The kits are at the edge.** In cl100k tokens at v0.59.3: adventure 203,421, platformer 206,766, brawler 205,180,
  shooter 207,517, RPG 205,006, stealth 188,482, animation lab 194,787; 3D action 241,039, 3D platformer 235,846, 3D
  shooter 310,823. Each 2D kit embeds the whole engine minified (160,122, as `dist/my-3d2dge.min.js`) and the API card
  (14,960), so whatever the core gains, every kit gains. Five of the seven 2D kits are already past a 200k context
  (README, D32).
- **Most of a kit's engine is parts its game never calls.** About, minified: the Humanoid 22k, shapes and the core
  library 16.5k, the Shell 10k, the TileMap 9.4k (16k with its materials, flow field and textures), props 7.9k, the
  PlatformMap 7.5k, the third-person kit (Mover, actions, perception) 6.4k, GPU lighting 5.8k. A puzzle game needs few
  of them.
- **The manuals are full.** The API card 14,960 of 15,000, the agent edition's header 9,833 of 10,000, the API index
  35,566 of 40,000, the 3D engine's manual 5,468 of 6,000, the asset card 3,760 of 4,000 (`node tools/doctrine-check.mjs`).
- **One player.** `game.input` reads the keyboard and one gamepad, the one in use (`padIndex`, F:638 and F:939-942).
  There is no second player and no split screen, in 2D or in 3D.
- **No tweens, sequences or paths.** Time has `game.after` and `game.every`; `E.ease` has five curves. Cutscenes, wave
  timelines, flight paths, racing lines and rails are each game's own code.
- **Sprites stand still.** `px.sprite` flips; it doesn't animate, rotate or scale as it draws (`E.sprite` enlarges by a
  whole number when it is made). An Asteroids ship, a kart seen from eight angles and billboards that grow as they come
  near each need that.
- **One transition.** `game.go` fades through black: no wipe, iris, mosaic or the JRPG's battle swirl.
- **The Platformer stops at ladders** (F:5460): no crouch, ledge hang, swimming, ice, conveyor, spring, rope or slope
  momentum.
- **Big ground maps don't fit.** A `TileMap` bakes its whole floor into one canvas per view (F:4444-4488). A 256 x
  256-cell world map in the three-quarter view is a 6,336 x 5,225-pixel canvas (126 MB), twice that with GPU lighting,
  past the 16.7 million pixels an iPhone's Safari allows one canvas. The `PlatformMap` bakes 128-pixel chunks as they
  come on screen (F:5271-5276).
- **No picking on heights.** `view.toGround` finds the ground at z 0; nothing finds the raised cell, or the actor, under
  the cursor.
- **The music can't be followed.** Songs are scheduled on the audio clock by a 25 ms timer (F:6335-6352): gameplay can't
  read the beat, and a beat read from the audio clock would break determinism (principle 5).
- **Mode 7 is a lab's.** The stress test draws a perspective floor a row at a time and scales the rigs by their distance
  (S:615-845); the engine has no such view.
- **The 3D engine** has no vehicles, lock-on, camera zones or split screen.

## 2. What converts well

A genre converts well when:
1. its play reads in one of the engine's views, or under one of the 3D engine's cameras;
2. its art can be drawn by code: rigs, shapes, sprites, materials, backdrops;
3. its rules are deterministic gameplay on the CPU;
4. a vertical slice of it fits a kit (20k to 45k tokens of game code) and plays on a phone;
5. it needs nothing the engine can't make: video, voice, licensed music.

What fails these is out of scope, each with what covers it instead (section 6).

## 3. The design rules

### 3.1 General systems, proven by kits

A system enters the engine because several genres use it, and a kit is the example a model copies. No genre's rules go
in the core.

| System | Where | The genres it serves |
| --- | --- | --- |
| tweens, scripted sequences, paths | core (M1) | cutscenes, waves and dives, moving platforms, racing lines, rails, menus |
| animated, rotated and scaled sprites; wrap-around | core (M1) | arcade, shooters, racing's billboards, space |
| transitions, weather, a screen filter | core (M1) | every genre |
| input sequences | core (M1) | fighting moves, cheat codes, rhythm |
| a camera window, framing several targets | core (M1, M4) | platformers, local players, racing |
| grids: paths, ranges, fields of view, fog, turns | module `grid` (M2, M8) | roguelikes, tactics, puzzles, mazes, board games, strategy's fog, first-person dungeons |
| generated maps | module `gen` (M2) | roguelikes, action RPG dungeons, strategy maps |
| scores, tables, lives, attract mode | module `arcade` (M3) | arcade, shooters, puzzles, pinball, brawlers |
| two to four players, split screen | core (M4) | fighting, co-op, versus puzzles, racing, sports, artillery |
| fighters and matches | module `fight` (M4) | fighting, brawlers' bosses, sports' tackles |
| side-view traversal; worlds of rooms | the core's Platformer, module `rooms` (M5) | platformers, Metroidvanias, cinematic platformers, Zelda's rooms |
| Mode 7, the road | modules `mode7`, `road` (M6) | racing, rail shooters, world maps, flying |
| vehicles and races | module `drive` (M6) | racing in 2D and 3D, top-down driving, tanks, boats |
| dialogue trees, flags, quests; items, inventories, stats, shops, encounters | modules `story`, `rpg` (M7) | JRPGs, adventures, point-and-click, visual novels, horror, sims |
| save slots, dialog markup, big ground maps | core (M7) | every long game |
| picking under the cursor | core (M8, M9) | tactics, strategy, point-and-click, board games |
| a free camera; selection and orders; agents with needs | core and module `strategy` (M9) | RTS, builders, sims, god games, tactics |
| walkable areas, hotspots, verbs | module `click` (M10) | point-and-click, visual novels |
| 2D rigid bodies; destructible terrain | modules `physics`, `terrain` (M11) | pinball, Breakout, artillery, Lemmings, Asteroids |
| a music clock, layers; a songbook; charts and judgments | core audio, modules `songs`, `rhythm` (M12) | rhythm, stealth and chases, every genre's music |
| lock-on, camera zones, tank controls; vehicles, tracks, flight | the 3D engine (M13, M14) | 3D action, horror, racing, flight, rails |

### 3.2 Modules

- **A module is one small file**, `engine/modules/<name>.js`, holding one system, as the doctrine asks of the engine's
  code (principle 1: small files, each with a header saying what it holds). The core stays as it is (D5).
- **Its header is its manual:** a `/*!` comment, which the minifier keeps, with what it holds, its API, a complete
  example and its rules, in at most 1,500 cl100k tokens (2,500 where this plan says), counted by `doctrine-check`. Its
  fenced examples run in `contract-test`.
- **It uses only the core's public API**, and `doctrine-check`'s boundary check covers it. It attaches to `My3D2dge`
  (`E.Grid = ...`) and loads after the core. Where every name it uses is in the agent edition too, it loads after the
  agent edition as well, and `agent-test` proves it; otherwise its manual says "full engine only".
- **The builds:** `dist/my-3d2dge.js` and `.min.js` are the core and every module in one file, as now; the full
  reference edition carries every module; a kit carries the modules its slice names in its header (`@modules grid gen`),
  a 3D kit as a 2D one does (they load after the core there too); `dist/handoff/` carries them all.
- **The tools** that load the engine (the build, `contract-test`, `standard-test`, `api-index`, `agent-test`,
  `assets-test`, `doctrine-check`, `modules-test`, `kits-test`) load the modules through one shared helper,
  `tools/engine-lib.mjs` (`replay` only reads the engine's version: its page carries the modules). A module's manual
  says on its third line which editions it loads after and which modules it needs (`engine/modules/README.md`).
- **The index** gets a section per module. **The API card** gets one line per module: its name, what it is for, the kits
  that carry it.
- **Tests:** a change to a module runs `contract`, `agent`, `modules`, `kits` and the phone test of the kits that
  carry it (`kit3d` for a 3D kit), not every suite, as `tools/test-run.mjs` does since v0.60.0 (before it, any change
  under `engine/` ran everything).

### 3.3 The kit diet

- A kit leaves out the core's sections its slice never calls. Each is replaced by a stub that warns once, or, for a
  constructor, throws an error that names the section and the file that has it, as the agent edition does with what it
  leaves out.
- The build works out what a slice calls (its `E.` names, and the sections those need), so no list goes stale, and it
  fails when a slice uses a name from a section it left out. As built in v0.61.0: `DIET` in `tools/build.mjs` names the
  parts that may go (sections by number) and, where a part is reached only through a method of what stays, that method
  (`game.enableGPU` for GPU lighting); `tools/diet.mjs` reads the core's top-level statements with acorn and works out
  the rest: what the kit's code calls (its shell, slice, sets, modules and, in 3D, the 3D engine), a statement that
  extends a left-out class goes with it, and a name kept code needs stays (the platform map keeps `parseLevel` from the
  tile map's section). Proven by `kits-test` (each slice's proof, no stub ever called) and filmstrips of each kit beside
  the build before (`kits-test --compare <dir>`).
- **The budget:** every 2D kit at most 200,000 cl100k tokens; a 3D kit no larger than at v0.59.3. `doctrine-check`
  counts them.
- A kit's header lists the modules it carries and the sections it leaves out, and names the file for a mash-up of
  genres (the full reference edition, or the compact one).
- The diet changes no pixel: each existing kit's filmstrips before and after are the same (`tools/filmstrip.mjs
  --compare`).
- It supersedes part of D32 (the kits carry the shape renderer and the core library): a kit that never draws a shape
  leaves them out.

### 3.4 What every new kit has

- A title, play and an end (a win, a loss or the results), then back to the title; the standard features (pause menu,
  settings, rebinding); `pausable: true` in play.
- **Any screen:** `res: 'ps1', expand: true` (or its own `res`, with `expand`), the extra space filled with its own
  world, the HUD anchored to `r.W` and `r.H`. A game of one fixed screen fills the sides with cabinet art drawn by code.
- **A phone:** touch controls that fit the genre (named per kit below), tap targets of at least 44 CSS pixels, and a case
  in `tools/phone-test.mjs`.
- **The look target** (PS1 / N64 era 2D): backdrops, materials, lighting, dressed HD rigs, effects, the title font, and
  `check.mjs` with no look notes. A kit of 1980 games plays as a remaster, with the classic look one key away.
- **Sound:** an effect for every action, and at least one original song of its own in the step sequencer's format (M12
  gathers the best into the songbook).
- **For agents:** a deep link (`#<id>`, and `#<id>/<part>` to jump in), `window.__game`, `game.debug.snapshot()`, and a
  proof (`<SLICE>.run(n)`) that `tools/kits-test.mjs` (M0) checks: the same hash twice, no errors, and a bot or a
  scripted route that plays to the end.
- **Original:** the kit's names, characters, levels and songs are its own. The docs may name the games it is in the
  style of; the game never uses their names, characters, logos or music.
- **Registered where kits are:** the shell's `SLICES`, `tools/build.mjs`, `src/labs.json` (Starter kits), README's
  tables, the API card's playbook. A suggested slice number keeps families together (`21-metroidvania` beside
  `20-platformer`).

### 3.5 Every milestone

- **Opt-in.** A new option on an existing class defaults to today's behavior. Every existing kit, lab and Emberdeep plays
  exactly as before (filmstrips compared), and every suite passes.
- **Deterministic (principle 5).** Time comes from `dt` and the game's clocks, gameplay randomness from `E.rng` or
  `Math.random`, cosmetic randomness (weather, sparks) from the screen's own stream. Nothing in gameplay reads the audio
  clock, the screen or the GPU. Each module's contract tests run at 60, 90, 120 and 144 Hz.
- **Common ground (principle 7).** Use the names and algorithms agents already know: Penner's easings, generator
  coroutines, A* and Dijkstra, symmetric shadowcasting, numpad notation for fighting moves, SCUMM's verbs, arcade car
  physics with lateral grip.
- **Budgets reported** in every pull request: the API card, the index, each manual it touched, each kit's tokens, and
  the size of a deployment (each kit adds a few hundred KB; D49 keeps the bill down).
- **Decisions** (a budget raised, a deviation) go in `docs/DECISIONS.md`, in a commit of their own, flagged in the pull
  request.
- **On the diet.** A core addition that not every game calls goes in a section of its own (a `/* ====` banner, as
  `16b. PLATFORMER` became in M0) with a line in `DIET` (`tools/build.mjs`), so the kits that never call it leave it out;
  a method of a class that stays is its way in (`entries`). Each kit's tokens are in the pull request.

## 4. The milestones

### M0: room to grow (two pull requests, a and b)

Every later milestone adds systems and kits. Without this one, each makes every kit bigger, and the manuals can't hold
them.

- **0a, modules:**
  - `engine/modules/`, the builds and the tools as in 3.2, proven end to end by a fixture module that lives in the tests
    and is never shipped: its manual counted, its example run, its names indexed, carried by a fixture kit and left out
    of the others (`tools/modules-test.mjs`: `tools/fixtures/`, in a copy of the repository).
  - The budgets, as decisions:
    - the API card: 18,000, for the core's additions across this plan; each milestone reports its share, and moves
      detail to the index before it asks for more;
    - the index: 52,000, for the modules' sections (it is searched, not read whole: D41);
    - a module's manual: 1,500 (2,500 where this plan says);
    - the agent edition's header stays at 10,000 and gains one line on modules.
  - The test runner (3.2) and the handoff package.
- **0b, the kits:**
  - The diet (3.3): every 2D kit under 200,000 tokens, pixel for pixel as before.
  - `tools/kits-test.mjs`: every kit's proof, run twice, the same hash, no errors. The existing 2D slices get proofs
    (`ADV.run(n)` and the others); the 3D slices' are reused.
  - The title menu for many slices: grouped by family under headings, two columns on a wide screen, a list that
    scrolls on a phone; the lineup of heroes stays as the title's art; a kit's menu still lists its one slice. The 3D
    starter's menu does the same. (As built: `05-families.js` in each starter, a part only the reference editions
    carry; each slice names its `family` in the shell's `SLICES`; a kit keeps the plain `E.Menu`, its title unchanged.)
  - The compact edition: the milestone whose slices would take it past 500,000 tokens splits it into collections by
    family, or drops it, as a decision (the kits and the full reference cover its uses).
- **Docs:** `AI_GUIDE.md` (modules, the diet, the file for a mash-up), the API card's line on modules, README's kits
  table with the new sizes, `docs/DECISIONS.md` (modules; the diet, superseding part of D32; the budgets).
- **Done when:** the fixture module goes through the whole path; every 2D kit is at most 200,000 tokens and its
  filmstrips match the build before; `kits-test`, the phone test, `standard`, `determinism` and `replay` pass; `npm test`
  passes.

### M1: motion, timing and presentation (the core)

Needs M0. Almost every later kit uses these, and each is small.

- **Tweens:** `game.tween(target, { x: 10 }, seconds, { ease, delay, repeat, yoyo, onDone })` on game time: it pauses
  with the game, slows with `timeScale`, ends with the scene unless kept, and returns a handle that cancels. `E.ease`
  gains Penner's set (linear, sine, cubic, back, elastic and bounce, each in, out and in-out).
- **Scripts:** `game.script(function* () { yield .5; yield E.until(() => door.open); ... })`: coroutines that run in
  the update step on game time and wait for seconds, a condition, or all or any of other scripts; they cancel, and they
  are deterministic. For cutscenes, boss patterns, wave timelines, tutorials and attract modes.
- **Paths:** `new E.Path(points, { closed, smooth: 'catmull' })`: `length`, `at(d)` (a point, its heading and height,
  by distance along), `nearest(x, y)` (the distance along it: a race's progress), and `draw(r)` to debug.
- **Sprites:** frames (`E.anim([spr, ...], fps, { loop, pingpong })`, or several frames in one block of rows) drawn by
  `r.sprite(..., { anim, t })`; rotation and scale (`rot`, `scale` on `px.sprite` and `r.sprite`: nearest-neighbour,
  whole pixels, the rotations cached in 16 or 32 steps as hardware-era games pre-rotated theirs); `E.recolor(sprite,
  map)` for palette swaps.
- **Wrap-around:** `E.wrap(v, lo, hi)`, the shortest difference across a seam, and a `wrap` option on drawing, so a
  thing crossing the edge shows on both sides.
- **Transitions:** `game.go(name, data, { fade, at, seconds })` with `fade` one of `'black'`, `'white'`, `'wipe'`,
  `'iris'`, `'mosaic'`, `'swirl'` or `'dissolve'`; with reduce motion each is a plain fade.
- **Weather:** `game.weather = { kind, amount, wind, lightning }` with `kind` one of rain, snow, ash, leaves or sand:
  falling through the world's height in ground views and in layers in the side view, splashing on the ground
  (`particles.ground`), with lightning flashes and thunder; cosmetic randomness only; pooled.
- **Input sequences:** `input.sequence(['down', 'down+right', 'right', 'attack'], { window })`, and numpad notation
  (`input.motion('236', 'attack', { facing })`, mirrored by facing), over `input.history` (the last second of
  directions and presses: an input display reads it too).
- **The camera:** `cam.window` (a dead zone the target moves in before the camera follows, as Super Mario World's does),
  `cam.snapY` (height followed only on landing), `cam.frame(targets, { margin, zoom })` (several things kept in view).
- **A screen filter** (a standard setting, under Display): clean, scanlines or CRT, drawn when the picture is
  presented, never on the game's buffer, off under the test harness.
- **No new kit.** The existing kits are unchanged.
- **On the diet (3.5):** the tweens and scripts, paths, transitions, weather and input sequences each in a section of
  their own, in `DIET`, so a kit whose slice calls none of them stays the size it was.
- **Docs:** the API card (about 700 tokens of its 18,000), the index, `AI_GUIDE.md` (a paragraph each, and the game
  code each replaces: a wave timeline, a cutscene).
- **Done when:** contract tests for each (a tween across a pause, slow motion and a scene change; scripts at 60, 90,
  120 and 144 Hz; a path's length and points; frames; a rotated sprite's pixels; wrap-around; sequences mirrored; the
  camera's window and framing); a filmstrip of each transition and weather; every existing kit as before, pixel for
  pixel.

### M2: grids, turns and generated maps (modules `grid`, `gen`; kits ROGUELIKE, PUZZLE)

Needs M1 (tweens for steps between turns).

- **`grid`** (a manual of up to 2,500):
  - `new E.Grid(w, h, { hex, walkable, cost, diagonal })` (`hex`: false, `'pointy'` or `'flat'`) and `E.Grid.from(map)`
    (a TileMap's walkable cells and heights);
  - neighbours; distances (Manhattan, Chebyshev, hex); A* (`path`, its ties broken the same way every time); Dijkstra's
    reach within a budget (`reach`: move ranges, with climb and drop limits from the heights); lines (Bresenham, hex);
    sight on the grid and fields of view (symmetric shadowcasting);
  - `E.Fog(grid)`: unseen, seen and visible, updated from viewers with radii, and drawn over a map's floor
    (`r.cells(cells, color, alpha)`: tints on the cells' tops at their heights);
  - flood fill and connected groups (matches, chains, regions);
  - `E.GridMover`: one cell at a time at a speed, its next turn buffered and taken at the first opening (Pac-Man),
    pushing (Sokoban), and a smooth position for drawing;
  - `E.Turns`: who acts next, by speed (energy: roguelikes), by charge time with the order ahead (Final Fantasy
    Tactics), by phase (every hero, then every foe: Fire Emblem), or by ATB gauges on game time (Final Fantasy).
- **`gen`:** rooms and corridors, BSP, caves (cellular automata, kept connected), mazes (backtracker, Prim, braided) and
  scatter (Poisson disc), each from `E.rng(seed)` and each returning ASCII rows and marks a `TileMap` reads.
- **Kit ROGUELIKE** (Rogue, Mystery Dungeon, Shiren): `#roguelike`. Generated floors; fields of view and fog; turns by
  speed (bats move twice); bump to attack; potions, scrolls and a better weapon; stairs down; a tombstone and the
  results. Three-quarter or iso, with HD rigs that walk the step between turns, by torchlight. Touch: tap a cell to walk
  there, swipe to step, a button to wait.
- **Kit PUZZLE** (Tetris, Puyo Puyo, Columns): `#puzzle`. Falling blocks by today's rules (delayed auto-shift from
  `input.repeat`, lock delay, hold, the next queue, a bag of seven from `E.rng`, wall kicks), line clears that light up
  the field; a second mode of falling pairs that chain (connected groups); levels that speed up; a mascot rig that
  reacts. Versus comes in M4. Touch: swipes and taps.
- **Done when:** the grid's paths, reaches and fields of view match known answers (fixtures, square and hex); `gen`
  gives the same rows for the same seed; the roguelike's bot plays ten floors with no errors; the puzzle's bot clears
  lines; both proofs repeat; both pass the phone test.

### M3: the arcade (module `arcade`; kit ARCADE; the SHOOTER grows)

Needs M1 (paths, rotated sprites, wrap-around, scripts) and M2 (`GridMover`).

- **`arcade`:** a score, with points floating where they were won; high-score tables per game and mode (`E.store`),
  initials entered on a letter wheel by keys, pad or touch; lives, and extra lives at thresholds; credits (free play by
  default) and a continue countdown; two players taking turns on one controller ("PLAYER 2, READY!"); stage cards; an
  attract mode on the title: after an idle time, a demo from a recorded input log or the game's own bot ("DEMO"), the
  high scores, then the title again.
- **Kit ARCADE**, a cabinet of three short classics, each a scene with its own table and demo:
  - **maze** (Pac-Man): a `GridMover` with buffered turns, four chasers (Blob rigs) each with its own way of choosing
    its target, scatter and frightened timers, the tunnel's wrap-around, an intermission (a script);
  - **formation** (Galaga): waves that fly in on paths, form up, and dive on paths;
  - **rocks** (Asteroids): rotation, thrust and drift, wrap-around, rocks that split, a saucer, hyperspace, and glowing
    lines for the vector look.
  - Each plays as a remaster (HD rigs, lighting, particles), with the classic look one key away (a key the shell leaves
    free: `V` already changes the view) and in Settings. The sides of a wide screen show cabinet art drawn by code.
    Touch: the stick and one or two buttons.
- **SHOOTER:** the arcade frame (a table with initials, a continue), and a horizontal stage (Gradius, R-Type) at
  `#shooter/horizontal`: scrolling with terrain above and below, options that follow the ship's past path, a power bar,
  a mid-boss on a path. Its vertical stage plays as before.
- **Done when:** each of the three plays from the title to its high-score table on keys, pad and touch (the phone
  test); the attract mode plays and returns; the proofs repeat; the horizontal stage plays to its boss; the vertical
  stage's filmstrips match.

### M4: two to four players, and fighting (core players and split screen; module `fight`; kit FIGHTING; the BRAWLER's second player) in two pull requests

Needs M1 (input sequences, `cam.frame`).

- **4a, players (the core):**
  - `game.players`: one to four, each with an input of its own, with the API of `game.input`, which stays player 1, so
    every game written today is unchanged. Each has its bindings and device: a gamepad each, or half a keyboard each
    for two (a preset for each half), and touch for player 1.
  - Joining and leaving (`game.join({ max, onJoin })`: Start on a free pad, or on the keyboard's other half); each
    player's colour and name.
  - The standard features per player: the Controls screen has a page per player; prompts (`input.label`) are per
    player; a pause says who paused; a lost controller names its player.
  - Sessions record every pad and replay them; `determinism` and `replay` gain a two-player run.
  - The camera: `cam.frame` on every player for one shared screen; split screen (`game.split(n, { layout })`, n from 2
    to 4: a camera and a view per viewport, the scene drawn once per viewport with `r.viewport`, the HUD per viewport or
    over the whole screen, GPU lighting off while split).
- **4b, fighting (module `fight`, a manual of up to 2,500):**
  - `E.Fighter` on a `Platformer` and a `Humanoid`: it faces its opponent; push boxes; hurt boxes from the rig's joints
    each step; hit boxes from the move's active phase; frame data from `E.MOVES` (shown in frames at 60); hit-stun and
    block-stun; high, low and overhead guards; chip damage; throws; cancels; juggles; knockdowns and getting up; special
    moves by motion input (236, 623, 41236, charges); a super meter; projectiles on `Bullets`.
  - `E.Match`: rounds, the timer, KO, time over, perfect, the round call, win poses, a character select.
  - A CPU (`E.FightAI({ level })`): an intent each step, from spacing, anti-airs, guarding, combos and a reaction time.
  - Training: the boxes drawn, frame data, the input display, a dummy that stands, crouches, jumps or guards.
- **Kit FIGHTING** (Street Fighter II, Darkstalkers, Samurai Shodown): `#fighting`. Three fighters with move lists of
  their own (an all-rounder with a projectile and an uppercut, a grappler, a fast one who teleports); versus for two;
  an arcade mode against the CPU; training; a stage with a parallax crowd; a big HUD (life, timer, rounds, meter).
  Touch: the stick (motions work on it) and four buttons.
- **BRAWLER:** a second player drops in (Start on a pad, or on the keyboard's other half), on one screen framed to both.
  Alone, it plays as before.
- **PUZZLE:** versus for two, side by side, each clear sending rows of garbage to the other field.
- **Done when:** two players on one keyboard, and on two pads (scripted), fight to a KO; the CPU's matches repeat;
  motions are read at the 120 Hz step and mirrored by facing; a two-player session replays exactly; split screen draws
  two cameras (a filmstrip); the brawler's two heroes clear a wave; a versus puzzle plays to a loss; one-player play is
  unchanged everywhere.

### M5: side-view traversal and the Metroidvania (the core's Platformer; module `rooms`; kit METROIDVANIA)

Needs M1 (the camera's window, transitions).

- **The Platformer**, each move opt-in, today's defaults unchanged:
  - `crouch` (a lower box; crawling under gaps), `ledge` (catch a ledge when falling past it, hang, then climb up or
    drop), `wallCling`;
  - water as a tile kind (less gravity, drag, a stroke on each jump, a jump out at the surface; `hero.swimming`); ice
    (`friction`), conveyors (`carry`), springs (`bounce`), crumbling blocks;
  - ropes and vines to climb, monkey bars to hang from, swinging from a point (a grapple or a whip: a pendulum let go
    of with its speed);
  - `momentum` (speed won downhill and lost uphill, a roll, a charged dash: Sonic without the loops);
  - the Humanoid's poses for them (hang and climb exist; crawl, swim and swing are new).
- **`rooms`:** a world of rooms (`PlatformMap`s, or `TileMap`s for Zelda's), joined at edges and doors. Going through
  slides or fades, and moves the camera's bounds. A map of what was explored (rooms marked as they are seen, their
  doors, the save and boss rooms), drawn as a pixel map or in `E.Shell`. Gates that need an ability or a key; save rooms
  (`E.store` for now; save slots come in M7).
- **Kit METROIDVANIA** (Metroid, Super Metroid, Symphony of the Night): `#metroidvania`. Ten to fourteen rooms
  (caverns, a flooded shaft, a tower of ledges and ropes, a laboratory); two abilities found on the way that open the
  gates (a double jump, and a dash or a diving suit); an arm cannon aimed eight ways (the run-and-gun recipe, shown) and
  a melee; the map screen; a save room; a mini-boss and a boss. Touch: the stick, jump, fire, dash, and a button for the
  map.
- **Done when:** every new move has a contract test and a filmstrip; every existing side-view page matches its
  filmstrips; the kit's bot takes its route to the boss; the map fills in as rooms are seen, and a save loads back; the
  phone test passes.

### M6: Mode 7, the road and racing (modules `mode7`, `road`, `drive`; kits KART, ROAD) in two pull requests

Needs M1 (paths, scaled and animated sprites) and M4 (split screen).

- **6a, the views:**
  - `mode7`: the stress test's depth view (S:615-845), graduated. A perspective camera (position, height, yaw, pitch,
    field of view, horizon) over a floor drawn a row at a time from a TileMap's floor or a colour function; a sky that
    turns with the yaw (a Backdrop); billboards (sprites with M1's frames and scale, rigs drawn at the scale their
    distance gives, shapes), sorted far to near; fog with distance; projection for the HUD. It draws at the game's own
    resolution, as the SNES did (the stress test's screen resolution as an option), and is ready for split screen. The
    stress test then uses it, pixel for pixel as before.
  - `road`: segments with curves and hills, lanes, rumble strips and alternating colours, roadside scenery (props,
    shapes, sprites) scaled by distance, tunnels, the backdrop's parallax on curves, and the camera's height over the
    hills (OutRun, Pole Position, Hang-On, Road Rash).
- **6b, the racing (`drive`):**
  - `E.Car`: arcade physics on the ground plane (forward and lateral speed, grip and drift, a handbrake, a boost,
    off-road read from the floor's tag, bumps against walls and cars), a kart's hop and drift boost; driven by
    `game.input` or an intent.
  - `E.Race`: checkpoints along an `E.Path`, laps, wrong way, positions, lap times kept, the countdown and the results;
    AI drivers that follow the racing line with a look-ahead, brake for curves, overtake, recover and rubber-band; a few
    items (a boost, a shot, a hazard).
- **Kit KART** (Super Mario Kart, F-Zero): `#kart`. A Mode 7 track (road, grass, sand, boost pads, walls) against five
  AI karts, three laps, items, the results, and two players in split screen. The drivers are HD rigs in karts drawn by
  code, seen from whatever angle the camera gives. Touch: the stick steers, buttons drift and use items, and it
  accelerates by itself.
- **Kit ROAD** (OutRun): `#road`. A stage of curves and hills, traffic, checkpoints that add time, a radio of songs, the
  results. Touch: as the kart.
- A top-down racer (Micro Machines, RC Pro-Am) and top-down driving (GTA 1 and 2) are recipes: `drive` on a TileMap in
  the top-down view.
- **Done when:** both views draw a frame within the phone test's budget; the stress test's depth view matches its
  filmstrip; the car's grip, drift and off-road have contract tests; the AI karts finish three laps without sticking; a
  split-screen race plays for two; the proofs repeat.

### M7: stories, RPG systems and big maps (core dialog markup, save slots and big ground maps; modules `story`, `rpg`; the RPG kit grows) in two pull requests

Needs M1 (scripts, the swirl).

- **7a, the core:**
  - `TileMap` floors baked in chunks near the camera, as the `PlatformMap`'s are (the colours and the GPU lighting's
    canvas both), so a 256 x 256-cell map costs what the screen shows; small maps as before, pixel for pixel.
  - Dialog markup: colour, pauses, speed, shake and wave, variables (`{c=#ffd36a}gold{/c}`, `{w=.5}`, `{$name}`); text
    without markup as before.
  - Save slots (`game.saves`): three slots and an autosave, versioned, each with its place, time played and level;
    save, load, copy and erase; a standard screen where a game turns it on (`menu: { saves: true }`); it never throws,
    and play goes on when storage is blocked.
- **7b, the modules and the kit:**
  - `story`: dialogue as data (nodes of lines with a speaker and a portrait, choices with conditions, flags set and
    tested, jumps, and events for the game's scripts); flags and variables saved with the game; a quest log; emote
    balloons over heads (!, ?, a heart, dots, a note).
  - `rpg`: items (kinds, icons from `E.shapeSprite` or sprites, stacks, key items); an inventory (slots, or a grid of
    item sizes for a Resident Evil or a Diablo); equipment and its stat changes; shops; a party; stats and levels
    (experience curves); status effects; a damage helper; random encounters by zone; battle rewards; windows for them in
    `E.ui` or `E.Shell`.
  - **The RPG kit** becomes the JRPG's whole loop (Dragon Quest, Final Fantasy, Chrono Trigger): `#rpg`. A town (people
    with dialogue trees, an inn, a shop, a chest), a big world map, a cave with encounters (the swirl into battle), the
    ATB battle as it is (`#rpg/battle` goes straight there), level-ups, a boss with a scene before it, a save point and
    the save slots, and the Items, Equip, Status and Save menus. Touch: taps, as the battle takes them now.
- **Done when:** a 256 x 256-cell map scrolls within budget on the phone, its floor's memory measured; small maps match
  their filmstrips; dialogue graphs and flags have contract tests; save slots are in `standard-test`; the RPG's bot
  plays the town, the cave, the boss, a save and a load; the battle plays as before.

### M8: tactics (core picking; `grid` grows; kit TACTICS)

Needs M2 and M7 (`story`, for the scene before the battle).

- **Picking:** `map.pick(sx, sy)`: the cell under a screen point on a TileMap with heights (the top face it hits, front
  to back), in every view and turn.
- **`grid`:** reach with jump heights per unit (the height rules, `E.HEIGHTS`), threat maps, facing and attacks from the
  side and the back, shapes of effect (a cross, a diamond, a line, a cone), arcs over heights for bows (`map.arcClear`).
- **Kit TACTICS** (Final Fantasy Tactics, Tactics Ogre, Shining Force, Fire Emblem): `#tactics`. An iso map with heights
  (a hill fort); four heroes against five foes (a knight, an archer, a mage, a healer, a thief); the charge-time order
  shown; moves with jump heights; attacks from behind; archers' arcs; a mage's area; water that slows. A cursor (keys,
  pad, mouse, touch) the camera follows, turned in 90-degree steps and zoomed; a panel for each unit; an AI that scores
  its moves; a scene before the battle; Fire Emblem's phases as an option.
- **Done when:** picking is right in every view and turn (contract); the AI's turns repeat; the bot wins the battle; on
  a phone, a tap selects, a tap moves and a tap attacks.

### M9: strategy and simulation (core free camera and picking; module `strategy`; kits RTS, SIM) in two pull requests

Needs M1 (scripts) and M2 (`E.Fog`).

- **9a, the core and `strategy`:**
  - A free camera (`cam.free`): pans by dragging, at the screen's edge, by keys or a stick; zooms toward the pointer or
    the pinch; keeps to bounds; works in every view and turn. Pointer gestures: a drag box, a long press, a double tap.
  - `r.pick(sx, sy)`: the actors and shapes drawn under a screen point, front to back.
  - `strategy` (a manual of up to 2,500): selection (a click, a box, adding, all of a kind, control groups, rings on
    the ground); orders (move, attack, attack-move, gather, build, patrol, stop; queued); formations; groups moving on
    shared flow fields, kept apart; production queues; resources and costs; placement on the map's cells with a ghost
    that shows where it fits; fog of war (`E.Fog`); the minimap (`E.Shell`'s, with the fog, a click moving the camera);
    an enemy's build order and attacks as data and scripts.
  - For simulations: time controls (pause, 1x, 2x, 4x: more fixed steps a frame, not longer ones, since `timeScale`
    stretches `dt`); a day clock (`E.Clock`: hours, days, and
    the light by the hour); agents with needs that take the action that scores best; overlays of a value per cell;
    tooltips.
  - Touch, decided here and written in the manual: a tap selects or orders, a drag on open ground pans, a long press
    then a drag draws a box, a pinch zooms.
- **9b, the kits:**
  - **RTS** (Dune II, Warcraft II, Command & Conquer, StarCraft): `#rts`. A map, a base, workers who gather, three kinds
    of unit, two buildings to build, fog, and an enemy base that builds and attacks in waves. Take it to win.
  - **SIM** (Theme Park, SimCity, RollerCoaster Tycoon): `#sim`. Lay paths; build four rides and two shops (shapes that
    move); guests (crowds of rigs) come, walk the paths, ride, eat and leave happy or not; money, prices and a rating;
    day and night; time controls.
- **Done when:** 200 units under orders hold the phone test's frame budget; selection and orders have contract tests,
  with scripted pointer input in every view; an RTS match plays to its end, the same every time (the proof); the sim
  runs ten game days headless with its money in a sane range; both kits pass the phone test.

### M10: point-and-click and visual novels (module `click`; kit POINT-AND-CLICK)

Needs M1 (transitions, scripts) and M7 (`story`).

- **`click`:** walkable areas as polygons with holes, walked to by a click or a tap (A* over the polygon's corners, then
  smoothed); characters scaled by depth in rooms drawn in perspective; things in front drawn by depth; hotspots
  (polygons, rectangles or actors) with names, verbs, a place to stand and a way to face; the pointer's label and
  cursor; an interface of SCUMM's nine verbs, Sierra's icons, a verb coin, or look and use; an inventory bar, an item
  used on a hotspot or on another item (the rules as data); exits between rooms; `story`'s flags, dialogue and scenes; a
  double click to run.
- **Visual novels** are a recipe: `story` with big portraits (`rig.drawPortrait` at size), a backdrop, a backlog, auto
  and skip.
- **Kit POINT-AND-CLICK** (Monkey Island, Day of the Tentacle, Broken Sword): `#pointclick`. Three rooms (a dock, a
  tavern, a lighthouse), six to eight hotspots in each, a chain of four puzzles (items combined, a conversation to win),
  the nine verbs or the coin (Settings), an inventory, an opening and an ending. Touch: a tap walks, a tap on a hotspot
  shows its verbs.
- **Done when:** paths go round holes (contract); the bot clicks through the whole chain; the proof repeats; the phone
  test passes.

### M11: physics toys (modules `physics`, `terrain`; kits PINBALL, ARTILLERY) in two pull requests

Needs M2 (`E.Turns`) and M3 (the high-score table).

- **11a, the modules:**
  - `physics` (a manual of up to 2,500): 2D rigid bodies on the ground plane or the side plane. Circles, boxes, convex
    polygons, and static segments, polylines and arcs. Static bodies; kinematic ones (flippers, paddles: moved by code,
    their speed given to what they hit); dynamic ones (mass, bounce, friction, damping). Sensors; continuous collision
    for fast circles (a ball never passes through a flipper); substeps of the engine's step; sleeping; layers (a ball on
    a ramp ignores the table's walls); gravity as a vector (a table's tilt); contacts in a fixed order, so it is
    deterministic. Helpers for flippers, bumpers, slingshots and kickers.
  - `terrain`: destructible terrain in the side plane. A mask at world resolution; circles and polygons carved and
    added; the ground below a point and its normal; collision for walkers and shots; drawn in dirty chunks with
    materials and a lit edge; debris.
- **11b, the kits:**
  - **PINBALL** (Pinball Fantasies, Devil's Crush, Space Cadet): `#pinball`. One table in a steep ground view, scrolling
    as the ball climbs; flippers, bumpers, slingshots, a ramp, drop targets, a spinner, a kickback, multiball, nudging
    and tilt, a ball saver, a mission and its jackpot, a dot-matrix display drawn by code, and the arcade module's table.
    Touch: each half of the screen flips its side, a swipe up plunges.
  - **ARTILLERY** (Worms, Scorched Earth): `#artillery`. Two teams of three on a destructible island; turns (`E.Turns`);
    aim and power (a drag on touch); wind; three weapons (a rocket, a grenade that bounces, a cluster); fall damage and
    water; two players on one screen in turn, or against a CPU that tries its shots in simulation.
- Breakout, Asteroids with real collisions, and Lemmings are recipes on these.
- **Done when:** a ball at twice its top speed never tunnels (contract); the same table run at 60, 90, 120 and 144 Hz
  gives the same hash; carving and collision have contract tests; the pinball's bot plays a ball and the artillery's
  CPUs finish a match; both pass the phone test.

### M12: music, rhythm and the songbook (core audio; modules `songs`, `rhythm`; kit RHYTHM; the STEALTH slice's music)

Needs M1. Any time after M1: it moves up if the kits' music needs it sooner.

- **The music clock:** a song starts at a game time, and its position in steps and beats is game time (`audio.pos`,
  headless too), with events on the update step (`audio.at(step, fn)`, `audio.onBeat(fn)`). The sound follows the
  game's clock (re-anchored when they drift), and a song played with `sync: true` pauses with the game. Gameplay never
  reads the audio clock.
- **Dynamic music:** tempo (hurry up!), tracks faded in and out as it plays (`audio.layer`), stingers over the music,
  crossfades.
- **An audio offset:** a standard setting under Sound, with a tap-in-time calibration.
- **`songs`, the songbook:** the kits' best songs gathered, with more original songs and jingles, tagged by mood (field,
  town, shop, battle, race, puzzle, space, horror, stealth, chase, stage clear, game over, one-up, level up, fanfare),
  in the step sequencer's format. A kit carries it only when it plays its songs.
- **`rhythm`:** charts as text per lane on a song's steps (or drawn from one of its tracks); judgments in milliseconds of
  the music clock (perfect, great, good, miss); combo, score, grade and a life gauge; held notes; a note highway in any
  direction; call and response (PaRappa's).
- **Kit RHYTHM** (PaRappa, Beatmania, Dance Dance Revolution, Space Channel 5): `#rhythm`. Two songs; four lanes (keys,
  pad, touch lanes); a dancer rig that dances to the beat and reacts; a crowd; a grade; the calibration screen.
- **STEALTH:** its music goes from sneaking to the chase by layers, not by a cut to another song.
- **Done when:** the same beats headless and in a browser (contract); the judgments of scripted inputs repeat; the
  sound stays within 10 ms of the game's clock over three minutes (measured in the browser); the stealth slice's
  filmstrips match; the phone test passes.

### M13: 3D action and survival horror (the 3D engine; kit 3D HORROR; 3D ACTION gains lock-on)

Needs M7 (`rpg`'s inventory, save slots).

- **The 3D engine** (its manual's budget rises to 8,000, a decision):
  - lock-on (`world.camera.lock(hero, target)`): both framed, strafing round the target, cycling through targets in
    sight, a reticle;
  - camera zones (`world.camera.zones`): by region, a fixed camera, one that turns to follow, or one that slides on a
    rail; cuts with hysteresis; the stick's direction held across a cut until it is let go;
  - tank controls beside camera-relative ones (a setting);
  - locked doors that need a key from the inventory, a door's opening between rooms, an item box, a save point (M7's
    slots);
  - a flashlight that follows the hero's facing, and flicker.
- **Kit 3D HORROR** (Resident Evil, Alone in the Dark, Silent Hill): `#horror`, in the 3D starter. A mansion wing of
  six to eight rooms under fixed cameras; a pistol (hold to aim, aim up and down) and a knife; zombies that shamble and
  grab, a dog that runs; two keys and a crank puzzle; the item box and saves; few bullets, herbs to mix; a boss; fog and
  the flashlight; tank or modern controls. Touch: the stick, aim, fire, run.
- **3D ACTION:** lock-on, on the waves and the knight.
- **Done when:** zone cuts and lock-on give the same `world.hash()` on WebGL 2 and WebGPU; lock-on has a contract test;
  the horror kit's bot plays from the first room to the boss; `kit3d-test` passes for every 3D kit.

### M14: 3D vehicles and flight (the 3D engine; kits 3D RACING, 3D FLIGHT) in two pull requests

Needs M1 (paths), M4 (split screen) and M6 (`drive`'s intent, `E.Race`).

- **14a, the 3D engine:**
  - vehicles (`world.vehicle({ kind })`, a kart, a car or a hovercraft): arcade handling on Rapier (its ray-cast vehicle
    controller, or a rolling body steered arcade-style: decide by feel in a Temporary lab first), drift and boost,
    jumps, boost pads, off-road by the ground, bumps; driven by `drive`'s intent;
  - tracks (`world.track({ path, width, bank, walls })`: a road built along an `E.Path`), with `E.Race` for the laps,
    the positions and the AI;
  - split screen: two cameras in two viewports, the HUD per viewport, as in M4;
  - flight (`world.flyer`): arcade pitch, yaw and roll, boost and brake, rolls and loops, lock-on shots; on rails (the
    play space moves along a path and the ship flies in a window of it: Star Fox) or free within bounds.
- **14b, the kits:**
  - **3D RACING** (Mario Kart 64, Crash Team Racing, Diddy Kong Racing): `#racing`. A track with banked turns, a jump
    and a shortcut; five AI karts; items; three laps; two players split.
  - **3D FLIGHT** (Star Fox 64, Panzer Dragoon): `#flight`. A stage on rails over the sea and a base (fighters on
    paths, turrets, rings); a boss in free flight; charged lock-on shots; rolls that turn shots aside; a wingman on the
    radio (`Dialog`'s radio). A light-gun rail shooter is a recipe: the same rails, aimed with the pointer.
- **Done when:** both kits' proofs hash the same on WebGL 2 and WebGPU; the AI karts finish their laps; a split-screen
  race plays; the flight's bot finishes the stage; the phone test passes.

### M15 (optional, on the owner's word): a first-person dungeon and sports

Needs M2 (`E.Turns`, `E.Fog`), M4 (players) and M13 (doors and levers in 3D).

- **3D CRAWLER** (Wizardry, Dungeon Master, Eye of the Beholder, King's Field): `#crawler`, in the 3D starter. A grid
  stepped in first person on the 3D level (turns of 90 degrees and steps, tweened), turns or real time (`E.Turns`), a
  party of four with portraits, an automap from `E.Fog`, doors, levers and pressure plates.
- **SPORTS** (NBA Jam, Sensible Soccer, Tecmo Bowl): `#sports`. Two against two, for up to four players: a ball as a
  `Body` with bounce and curl, passes with aim assist, shots on a meter, teammates by formation, the rules and a match
  clock, commentary on `Dialog`'s radio; a ball's arc solved in the core's math (`E.arc`).
- **Done when:** as for any kit (3.4).

### M16: fold the plan in (a patch)

- `README.md`: the genre coverage table with a kit or a recipe on every row; the kits' table and sizes; the modules in
  "What's in the engine".
- `API.md`: the genre playbook: each genre, its view, its modules, the kit to copy.
- `AI_GUIDE.md`: a recipe for each genre with no kit: the twin-stick shooter (Robotron, Smash TV), Bomberman, Gauntlet,
  Frogger, Breakout, Lemmings, Sokoban, Sonic without the loops, the cinematic platformer, top-down racing and driving,
  visual novels, light guns, and the indoor corridor shooter (Doom, GoldenEye) on the 3D engine.
- `src/labs.json`: every kit.
- The benchmark: briefs for era games (an adaptation each of Pac-Man, Street Fighter II, Super Mario Kart, Final Fantasy
  Tactics and Resident Evil) in `tools/agent-bench/briefs/`. Their runs spend money: escalate (the principle, the
  recommendation, a 15-minute wake-up); with no answer, don't run them (as D36), and say so.
- What lasts goes into the docs and `docs/DECISIONS.md`; what is left goes to `docs/FEEDBACK-LOG.md` or a new plan; this
  file is deleted.

## 5. Traps

- **Changing a default.** Every new option on `Input`, `Platformer`, `TileMap`, `Dialog`, the camera or the audio
  defaults to today's behavior. Compare filmstrips of every page a change could reach.
- **A stub that changes behavior.** The diet must leave a kit's play and pixels exactly as they were.
- **The audio clock in gameplay.** Only the music clock on game time; the sound follows it, never the other way round.
- **Cosmetic randomness on the gameplay stream.** Weather, sparks and the crowd's idle moves draw from the screen's own
  stream. A draw made only when something is on screen breaks replays.
- **Two players on one keyboard.** Many keyboards drop a third or fourth key held at once (ghosting). The two halves'
  presets keep each player's keys apart, and the manual says pads are best for four.
- **Touch and the pointer.** A drag that pans and a drag that selects; a tap that walks and a tap that acts. Decide once
  per module and write it in its manual.
- **Per-pixel loops.** Mode 7, the road, fog and terrain write pixels every frame: measure them on the phone test's
  emulated phone, at the PS1 resolution.
- **The size of a deployment.** Each kit adds a few hundred KB to every deployment: report it, and keep previews as
  D49 has them.
- **The manuals.** A milestone that runs out of room in a manual moves detail to the index first, then asks for a budget
  with a decision.
- **Other people's games.** A kit is in the style of the games it names; its names, characters, levels and songs are
  original.
- **Agents' habits.** A new system that agents may know under another engine's name (Phaser's tweens, Unity's
  coroutines, Godot's `AStarGrid2D`) says so in its manual, so a search for the familiar name finds it.

## 6. Out of scope

- **Online play:** the co-op plan (`docs/HANDOFF-COOP.md`), on hold.
- **Text adventures and parsers:** they use nothing the engine is.
- **Realistic simulations** (Gran Turismo's driving, flight simulators): arcade handling only.
- **3D fighting** (Tekken, Virtua Fighter): the fight module and the 3D engine's puppets could make one; no kit until a
  builder asks.
- **Extreme sports** (Tony Hawk's Pro Skater): a 3D trick system, no kit.
- **Loops in a side-scroller** (Sonic's 360-degree running): the Platformer's momentum stops at slopes.
- **Video, voice, licensed music, MMOs, level editors, mod tools.**
- **Card and board games:** a recipe (`grid` and the pointer) if a builder asks.
- **Production hardening** (principle 10): when a game heads to production.

## 7. Effort and the /goal lines

**The rules for every milestone's run:**
1. Read `CLAUDE.md`, `DOCTRINE.md`, then this file.
2. Check the milestone's facts against the code of the day (line numbers are as of v0.59.3: search by name), and fix
   the plan where it is wrong, in the same pull request.
3. Build exactly what the milestone lists, on one branch (two where it says a and b), as the next minor version (M16: a
   patch); fill in the changelog by part, and rebuild.
4. Keep everything that plays today playing as it does: every suite passes, and filmstrips change only where the
   milestone says.
5. Add the tests the milestone names and make them pass; look at the screenshots and filmstrips; run the phone test for
   each kit.
6. Log a budget raised, or any deviation, in `docs/DECISIONS.md`, in a commit of its own, flagged in the pull request.
7. Run `npm run test:changed`, merge (squash) as `CLAUDE.md` says, then run the full `npm test` in the background and fix
   forward.
8. Fill in the milestone's row in section 9 (what landed, the version and commit, what was measured, what's left).
   Then report the version and commit, the budgets and kit sizes, and the next milestone's effort level and `/goal`
   line, from the lists below, changed if the work changed them.

**Effort.** `xhigh` where a mistake is costly and quiet: the core every game runs through, a renderer, physics,
determinism. `high` where the work is new frameworks and kits on settled ground. `medium` for the fold-in.

| Milestone | Effort | Why |
| --- | --- | --- |
| M0 room to grow | xhigh | the build, every kit and the checks; the diet must change no pixel |
| M1 motion and presentation | high | many small features in the core; determinism held at every refresh rate |
| M2 grids, turns, generated maps | high | known algorithms, two kits |
| M3 the arcade | high | a module and a cabinet of three small games |
| M4 players and fighting | xhigh | input, the standard features, sessions and the renderer change under every game |
| M5 traversal and Metroidvania | xhigh | the Platformer every side-scroller uses; its feel is subtle |
| M6 Mode 7, the road, racing | xhigh | two renderers on a per-pixel budget, car physics, AI |
| M7 stories, RPG, big maps | xhigh | the floor's bake under every ground view, and save data |
| M8 tactics | high | picking, then a kit on M2's grid |
| M9 strategy and simulation | xhigh | a free camera, touch gestures, crowds within budget |
| M10 point-and-click | high | a module on settled ground, and a kit |
| M11 physics toys | xhigh | continuous collision, and determinism |
| M12 music and rhythm | high | the clock is subtle but small; the rest is content |
| M13 3D action and horror | xhigh | the 3D camera, and the proof hash on two backends |
| M14 3D vehicles and flight | xhigh | vehicles on Rapier, split screen in 3D |
| M15 crawler and sports (optional) | high | kits on systems built earlier |
| M16 fold in | medium | docs, measures, a deletion |

**The /goal lines**, one per milestone, to paste after compacting:

M0 (effort: xhigh)
```
/goal Milestone 0 of docs/HANDOFF-GENRES.md (room to grow: engine modules, the kit diet, the budgets, kits-test, the grouped title menu) is done by the plan's section 7 rules: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor version, its row in section 9 filled in, and the version, commit, kit sizes and Milestone 1's effort level and /goal line reported.
```

M1 (effort: high)
```
/goal Milestone 1 of docs/HANDOFF-GENRES.md (motion and presentation: tweens, scripts, paths, sprite frames and rotation, wrap-around, transitions, weather, input sequences, the camera's window and framing, a screen filter) is done by the plan's section 7 rules: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor version, its row in section 9 filled in, and the version, commit, kit sizes and Milestone 2's effort level and /goal line reported.
```

M2 (effort: high)
```
/goal Milestone 2 of docs/HANDOFF-GENRES.md (grids, turns and generated maps: the grid and gen modules, the ROGUELIKE and PUZZLE kits) is done by the plan's section 7 rules: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor version, its row in section 9 filled in, and the version, commit, kit sizes and Milestone 3's effort level and /goal line reported.
```

M3 (effort: high)
```
/goal Milestone 3 of docs/HANDOFF-GENRES.md (the arcade: the arcade module, the ARCADE cabinet kit, the SHOOTER's arcade frame and horizontal stage) is done by the plan's section 7 rules: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor version, its row in section 9 filled in, and the version, commit, kit sizes and Milestone 4's effort level and /goal line reported.
```

M4 (effort: xhigh)
```
/goal Milestone 4 of docs/HANDOFF-GENRES.md (two to four players and fighting: game.players, joining, per-player controls, split screen, the fight module, the FIGHTING kit, the BRAWLER's second player) is done by the plan's section 7 rules, as its two pull requests: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor versions, its row in section 9 filled in, and the versions, commits, kit sizes and Milestone 5's effort level and /goal line reported.
```

M5 (effort: xhigh)
```
/goal Milestone 5 of docs/HANDOFF-GENRES.md (side-view traversal and the Metroidvania: the Platformer's new opt-in moves, the rooms module, the METROIDVANIA kit) is done by the plan's section 7 rules: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, every existing side-view page matching its filmstrips, merged to main as the next minor version, its row in section 9 filled in, and the version, commit, kit sizes and Milestone 6's effort level and /goal line reported.
```

M6 (effort: xhigh)
```
/goal Milestone 6 of docs/HANDOFF-GENRES.md (Mode 7, the road and racing: the mode7, road and drive modules, the KART and ROAD kits, the stress test on mode7) is done by the plan's section 7 rules, as its two pull requests: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor versions, its row in section 9 filled in, and the versions, commits, kit sizes and Milestone 7's effort level and /goal line reported.
```

M7 (effort: xhigh)
```
/goal Milestone 7 of docs/HANDOFF-GENRES.md (stories, RPG systems and big maps: chunked TileMap floors, dialog markup, save slots, the story and rpg modules, the RPG kit's whole JRPG loop) is done by the plan's section 7 rules, as its two pull requests: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor versions, its row in section 9 filled in, and the versions, commits, kit sizes and Milestone 8's effort level and /goal line reported.
```

M8 (effort: high)
```
/goal Milestone 8 of docs/HANDOFF-GENRES.md (tactics: map.pick, the grid module's tactics helpers, the TACTICS kit) is done by the plan's section 7 rules: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor version, its row in section 9 filled in, and the version, commit, kit sizes and Milestone 9's effort level and /goal line reported.
```

M9 (effort: xhigh)
```
/goal Milestone 9 of docs/HANDOFF-GENRES.md (strategy and simulation: the free camera, pointer gestures, r.pick, the strategy module, the RTS and SIM kits) is done by the plan's section 7 rules, as its two pull requests: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor versions, its row in section 9 filled in, and the versions, commits, kit sizes and Milestone 10's effort level and /goal line reported.
```

M10 (effort: high)
```
/goal Milestone 10 of docs/HANDOFF-GENRES.md (point-and-click: the click module, the POINT-AND-CLICK kit, the visual novel recipe) is done by the plan's section 7 rules: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor version, its row in section 9 filled in, and the version, commit, kit sizes and Milestone 11's effort level and /goal line reported.
```

M11 (effort: xhigh)
```
/goal Milestone 11 of docs/HANDOFF-GENRES.md (physics toys: the physics and terrain modules, the PINBALL and ARTILLERY kits) is done by the plan's section 7 rules, as its two pull requests: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor versions, its row in section 9 filled in, and the versions, commits, kit sizes and Milestone 12's effort level and /goal line reported.
```

M12 (effort: high)
```
/goal Milestone 12 of docs/HANDOFF-GENRES.md (music and rhythm: the music clock, dynamic music, the audio offset, the songs and rhythm modules, the RHYTHM kit, the STEALTH slice's layered music) is done by the plan's section 7 rules: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor version, its row in section 9 filled in, and the version, commit, kit sizes and Milestone 13's effort level and /goal line reported.
```

M13 (effort: xhigh)
```
/goal Milestone 13 of docs/HANDOFF-GENRES.md (3D action and survival horror: lock-on, camera zones, tank controls, locked doors and a flashlight in the 3D engine, the 3D HORROR kit, lock-on in 3D ACTION) is done by the plan's section 7 rules: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor version, its row in section 9 filled in, and the version, commit, kit sizes and Milestone 14's effort level and /goal line reported.
```

M14 (effort: xhigh)
```
/goal Milestone 14 of docs/HANDOFF-GENRES.md (3D vehicles and flight: vehicles, tracks, split screen and flight in the 3D engine, the 3D RACING and 3D FLIGHT kits) is done by the plan's section 7 rules, as its two pull requests: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor versions, its row in section 9 filled in, and the versions, commits, kit sizes and the effort level and /goal line of Milestone 15 (optional: ask the owner) or Milestone 16 reported.
```

M15 (effort: high; only on the owner's word)
```
/goal Milestone 15 of docs/HANDOFF-GENRES.md (optional: the 3D CRAWLER and SPORTS kits) is done by the plan's section 7 rules: its facts checked against the code, built, every "Done when" check and npm run test:changed passing, merged to main as the next minor version, its row in section 9 filled in, and the version, commit, kit sizes and Milestone 16's effort level and /goal line reported.
```

M16 (effort: medium)
```
/goal Milestone 16 of docs/HANDOFF-GENRES.md (fold the plan in: README, API.md's playbook, AI_GUIDE.md's recipes, the labs page, era briefs for the benchmark with their runs escalated, and the plan deleted) is done by the plan's section 7 rules: built, npm run test:changed passing, merged to main as a patch, its decisions kept in docs/DECISIONS.md, and the version and commit reported with the plan declared complete.
```

## 8. Done means

- A model handed one kit, or the handoff package, builds a convincing vertical slice of any genre in section 1.2: every
  row has a kit to copy, or a recipe the engine backs.
- Every 2D kit fits in 200,000 tokens, and every manual in its budget.
- What played before plays exactly as it did; every suite passes; every kit's proof repeats, and every kit plays on a
  phone.
- The systems are general: each serves several genres (section 3.1).

## 9. Progress

| Milestone | State | Version and commit | Notes |
| --- | --- | --- | --- |
| this plan | written | v0.59.4 | a review of v0.59.3: the genres (1.2), the measures (1.3) |
| M0 room to grow | done (two pull requests) | 0a v0.60.0 `00fbfe1`; 0b v0.61.0 | 0a: modules (`engine/modules/`, `tools/engine-lib.mjs` for every tool, the `modules` suite's fixture in a copy of the repository), the budgets (D50: card 18,000, index 52,000, a module 1,500), the test runner. 0b: the kit diet (`DIET`, `tools/diet.mjs`; the Platformer a section of its own, 16b), `kits-test` (every slice's proof twice; `--compare` films; the reference menus), the family title menus (`05-families.js`), the kits' budgets (D51). Measured at v0.61.0, cl100k: adventure 195,281, shooter 191,532, RPG 189,874, brawler 187,859, animation lab 180,685, platformer 180,085, stealth 179,909; 3D action 215,277, platformer 210,084, shooter 285,061; the compact edition 332,477 (it splits or goes past 500,000: a later milestone's decision), the reference 437,609; card 15,032, index 35,597, agent header 9,876. Every 2D kit's title and play filmed beside the build without the diet: the same pixels. Left: nothing; the adventure kit has the least room (4.7k), so M1's additions go on the diet (3.5) |
| M1 motion and presentation | not started | | |
| M2 grids, turns, generated maps | not started | | |
| M3 the arcade | not started | | |
| M4 players and fighting | not started | | |
| M5 traversal and Metroidvania | not started | | |
| M6 Mode 7, the road, racing | not started | | |
| M7 stories, RPG, big maps | not started | | |
| M8 tactics | not started | | |
| M9 strategy and simulation | not started | | |
| M10 point-and-click | not started | | |
| M11 physics toys | not started | | |
| M12 music and rhythm | not started | | |
| M13 3D action and horror | not started | | |
| M14 3D vehicles and flight | not started | | |
| M15 crawler and sports | optional: on the owner's word | | |
| M16 fold in | not started | | |
