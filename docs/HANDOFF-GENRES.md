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
  | kit | `dist/kits/my-3d2dge-<id>.html`: the engine (on the diet since v0.61.0), the API card and one slice: the file a chat model is handed |
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
  agent edition as well, and `agent-test` proves it; otherwise its manual says so ("Loads after: the full engine
  only.").
- **The builds:** `dist/my-3d2dge.js` and `.min.js` are the core and every module in one file, as now; the full
  reference edition carries every module; a kit carries the modules its slice names in its header (`@modules grid gen`),
  a 3D kit as a 2D one does (they load after the core there too); `dist/handoff/` carries them all.
- **The tools** that load the engine or list its modules (the build, `contract-test`, `standard-test`, `api-index`,
  `agent-test`, `assets-test`, `doctrine-check`, `test-run`, `modules-test`) take them from one shared helper,
  `tools/engine-lib.mjs` (`replay` only reads the engine's version and `kits-test` opens the built kits: their pages
  carry the modules). A module's manual
  says on its third line which editions it loads after and which modules it needs (`engine/modules/README.md`).
- **The index** gets a section per module. **The API card** gets one line per module: its name, what it is for, the kits
  that carry it (until the first module, M2's, one line on modules in general: v0.60.0).
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
- It supersedes part of D32 (the kits carry the shape renderer and the core library): as built, every kit keeps them
  (every slice draws from its own cut of the store, and they are not in `DIET`); a kit whose slice drew none could add
  them to it.

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
  scripted route that plays to the end (`kits-test` gains that check with the first new kit, M2's).
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
    (`ADV.run(n)` and the others: `__game.scenes.adventure.run(600)` from the page); the 3D slices' are reused.
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
  `r.sprite(x, y, z, anim, { t })` (as built: the anim is passed as the sprite); rotation and scale (`rot`, `scale` on `px.sprite` and `r.sprite`: nearest-neighbour,
  whole pixels, the rotations cached in 16 or 32 steps as hardware-era games pre-rotated theirs); `E.recolor(sprite,
  map)` for palette swaps.
- **Wrap-around:** `E.wrap(v, lo, hi)`, the shortest difference across a seam (as built: `E.wrapDiff(a, b, size)`), and
  a `wrap` option on drawing (`r.sprite`, `r.actor`), so a thing crossing the edge shows on both sides.
- **Transitions:** `game.go(name, data, { fade, at, seconds })` with `fade` one of `'black'`, `'white'`, `'wipe'`,
  `'iris'`, `'mosaic'`, `'swirl'` or `'dissolve'`; with reduce motion each is a plain fade. (`fade` stays a number of
  seconds too, as before: `{ fade: 0 }` cuts. GPU lighting draws its picture after the overlays, so under it a
  transition is a plain fade.)
- **Weather:** `game.weather = { kind, amount, wind, lightning }` with `kind` one of rain, snow, ash, leaves or sand:
  falling through the world's height in ground views and in layers in the side view, splashing on the ground
  (`particles.ground`), with lightning flashes and thunder; cosmetic randomness only; pooled. (The engine had no
  screen's own stream: the particles draw on `Math.random`. The weather has its own seeded `E.rng`; flat views, pitch 70
  degrees and up, fall in screen layers as the side view's do. It ends with the scene, like the timers.)
- **Input sequences:** `input.sequence(['down', 'down+right', 'right', 'attack'], { window })`, and numpad notation
  (`input.motion('236', 'attack', { facing })`, mirrored by facing), over `input.history` (the last second of
  directions and presses: an input display reads it too).
- **The camera:** `cam.window` (a dead zone the target moves in before the camera follows, as Super Mario World's does),
  `cam.snapY` (height followed only on landing: a followed body's `onGround`), `cam.frame(targets, { margin, zoom })`
  (several things kept in view; `zoom: [min, max]`).
- **A screen filter** (a standard setting, under Display): clean, scanlines or CRT, drawn when the picture is
  presented, never on the game's buffer, off under the test harness (`navigator.webdriver`, which every tool's browser
  sets).
- **The agent edition** gets none of it (as built): its header has 115 tokens left of its 10,000, and a game that needs
  these uses the full engine or a kit.
- **No new kit.** The existing kits are unchanged.
- **On the diet (3.5):** the tweens and scripts, paths, transitions, weather and input sequences each in a section of
  their own, in `DIET`, so a kit whose slice calls none of them stays the size it was. (As built: also Penner's easings
  beyond the core's (1b), sprite frames, turns and swaps (2b) and the camera's window and framing (10i), reached from the
  core through `HOOKS` and `FADES`, which each section fills as it loads. `DIET`'s new `names` match strings and option
  names a kit writes (`{ fade: 'iris' }`, `{ rot }`), its `entries` fields it reads (`game.weather`). Every kit still
  grows by about 2,500 tokens: 1,600 in its engine (the screen filter, a standard setting, and those ways in) and 1,000
  in its card.)
- **Docs:** the API card (about 700 tokens of its 18,000; as built, 980), the index, `AI_GUIDE.md` (a paragraph each,
  and the game code each replaces: a wave timeline, a cutscene).
- **Done when:** contract tests for each (a tween across a pause, slow motion and a scene change; scripts at 60, 90,
  120 and 144 Hz; a path's length and points; frames; a rotated sprite's pixels; wrap-around; sequences mirrored; the
  camera's window and framing); a filmstrip of each transition and weather; every existing kit as before, pixel for
  pixel. (As built: the contract tests in `tools/contract-test.mjs`, the filmstrips in the `motion` suite,
  `tools/motion-test.mjs`, on `tools/fixtures/motion.html`.)

### M2: grids, turns and generated maps (modules `grid`, `gen`; kits ROGUELIKE, PUZZLE)

Needs M1 (tweens for steps between turns).

- **`grid`** (a manual of up to 2,500):
  - `new E.Grid(w, h, { hex, walkable, cost, diagonal })` (`hex`: false, `'pointy'` or `'flat'`) and `E.Grid.from(map)`
    (a TileMap's walkable cells and heights);
  - neighbours; distances (Manhattan, Chebyshev, hex); A* (`path`, its ties broken the same way every time); Dijkstra's
    reach within a budget (`reach`: move ranges, with climb and drop limits from the heights); lines (Bresenham, hex);
    sight on the grid and fields of view (symmetric shadowcasting);
  - `E.Fog(grid)`: unseen, seen and visible, updated from viewers with radii, and drawn over a map's floor
    (`r.cells(cells, color, alpha)`: tints on the cells' tops at their heights; as built, a module adds no renderer
    method: `fog.draw(r, T, { height })` covers walls' faces too, and `E.tint(r, cells, color, alpha, T, height)` tints);
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
  there, swipe to step, a button to wait. (As built: `src/starter/45-roguelike.js`, the RPG family; ten floors to the
  Amulet; the stick held is the swipe; WAIT, POTION and SCROLL buttons; `bot()` plays the run.)
- **Kit PUZZLE** (Tetris, Puyo Puyo, Columns): `#puzzle`. Falling blocks by today's rules (delayed auto-shift from
  `input.repeat`, lock delay, hold, the next queue, a bag of seven from `E.rng`, wall kicks), line clears that light up
  the field; a second mode of falling pairs that chain (connected groups); levels that speed up; a mascot rig that
  reacts. Versus comes in M4. Touch: swipes and taps. (As built: `src/starter/35-puzzle.js`, the PUZZLE family, in the
  side view with the field in screen pixels; the mascot stands where the screen has room beside the field, so a phone
  held upright plays without it; `bot()` places pieces by a placement search.)
- **Done when:** the grid's paths, reaches and fields of view match known answers (fixtures, square and hex); `gen`
  gives the same rows for the same seed; the roguelike's bot plays ten floors with no errors; the puzzle's bot clears
  lines; both proofs repeat; both pass the phone test. (As built: the fixtures in `tools/contract-test.mjs` (both
  editions: the modules load after the agent edition too); the bots in `kits-test`'s `BOTS`, 3.4's play-to-the-end
  check; tap-to-walk and drag-and-tap cases in `tools/phone-test.mjs`.)

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
- **As built (v0.64.0):** `engine/modules/arcade.js` (809 of 1,500 tokens; it loads after the agent edition too):
  `cab.draw(r, box)` draws the HUD in the playfield's box; `cab.wheel` says where the letter wheel is (each of its taps
  a thumb's size on that screen), `clear()` and `wake()` take the cards down and wake the attract mode; the tables are
  kept for the visit where storage is blocked. The kit is `src/starter/32-arcade.js` (family ARCADE): the cabinet is
  the title (left and right pick, up and down one or two players), each game a scene of its own (`arcade-maze`, ...);
  `#<slice>/<part>` deep links (the start code passes `{ part }` to the slice's `enter`) open `#arcade/maze` and
  `#shooter/horizontal`. The classic look is C (a pad's Y) and Settings, Arcade, Look (the adventure slice's C is its
  own scene's). The maze is E.gen's braided maze mirrored (29 cells wide, a berry bonus, an intermission script); the
  formation and the rocks take the whole height (the rocks the whole screen) on a tall one, the maze a marquee and a
  control panel. The horizontal stage is a scene of its own (`shooter-horizontal`, `[320, 240]`, the `overhead` view
  with world x scrolling), after the fortress and at its deep link: rock above and below as functions of x, a power bar
  of six (SPEED, MISSILE, DOUBLE, LASER, OPTION, SHIELD), up to four options on the ship's past path, a cruiser looping a
  closed Catmull path while the scroll waits, a core battleship behind three walls. Bots (`kits-test`): the cabinet's
  clears a maze, two waves of moths and two of rocks and checks the attract mode; the shooter's flies the horizontal
  stage to its core (and downs it). Each new kit and stage has a song of its own (the roguelike's and the puzzle's came
  with it). The shooter kit is 212,213 tokens: D52 suspends the 2D budget until the owner's review.

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

- **As built, 4a (v0.65.0):** the engine's section 10j (on the diet: only the brawler and the puzzle carry it). The names
  are `game.allowJoin({ max, onJoin })` and `game.splitScreen(n, { layout, follow })` (D53: the plan's `join` and `split`,
  String's and Array's names, kept the section in every kit), with `game.addPlayer({ pad } | { keys: 'right' })`,
  `game.removePlayer(p)`, `game.viewports` and `Input.halfKeys(preset, side)`; `game.players` and `E.PLAYER_COLORS` are
  the core's. Each other player is an `Input` with no listeners of its own: player 1's keydowns go on to the players
  sharing the keyboard (`keysTo`), and player 1 reads no pad another holds; the Start that joins a pad is neither player
  1's pause nor the new player's first press. The core ticks every player's input before the hooks, so each has its own
  history (`input.motion`). `E.Menu` and the starter's `pickOnStart` read every player. A split screen
  draws the scene once per viewport, clipped from the pass's start (its floor too), each with its own eased camera, then
  `scene.hud(r)`, the dividers and the frame's notes over the whole screen; the players suite films it. The brawler's
  second player (Jack, in blue) drops in with `cam.frame` on both, foes going for the nearer hero, the round card showing
  each player's keys (its preset trimmed to punch, kick, sweep and jump so each half reads in that order), game over
  when both are out; its `bot()` brings in player 2 and both heroes clear the first wave. The puzzle's VERSUS appears
  once a second player is in: two fields from one seed, swapped in and out to step and draw, rows sent across.

- **As built, 4b (v0.66.0):** `engine/modules/fight.js` (after the full engine only: it needs the Platformer and
  `input.motion`). `E.Fighter` is a Platformer on an `E.FightStage` (a floor and two walls) with a Humanoid; its moves are
  specs on `E.MOVES` names with frame data in frames at 60 (`f`), each with its E.Attack; hurt boxes (head, body, legs)
  come from the rig's joints each step, a hit box from the striking fist or foot in the active frames; guards `mid`,
  `low`, `overhead`, `throw`; chip on specials; throws (forward or back with HP, close) and command grabs (`throw`);
  cancels into specials once a move connects; juggles (three at most); knockdowns and an invulnerable rise; specials by
  motion (read with `input.motion`, mirrored by facing, a longer window for six-direction supers) or charge (`'46'`,
  `'28'`); a meter (a super's cost, a flash and a freeze); one projectile at a time on `E.Bullets`; teleports; `f.last`,
  the frame data and advantage of its last move. `E.Match` adds rounds, the clock, KO (a slow-motion call), time over,
  perfect, the win poses, the HUD (below a phone's corner button) and training (the dummy, the boxes, the frame data,
  the inputs in numpad digits). `E.FightAI({ level, seed })` sees its foe after a reaction time, guards, anti-airs,
  throws, confirms hits into specials and keeps its range, all from its own `E.rng`; `E.FightSelect` picks by keys, pads
  or a tap. The preset is `E.FIGHT_KEYS` (U, I punch; J, K kick; a pad's X, Y, A, B), so two on one keyboard take F G H R
  and . / , L. The kit is `src/starter/55-fighting.js` (family FIGHTING): RYO, GORM and VEX, the courtyard and its crowd,
  VERSUS, ARCADE (the other two, then a shadow) and TRAINING (`#fighting/versus`, `/arcade`, `/training`); a mirror
  match gives player 2 the second palette; upright on a phone the camera starts at 1.8x. The `fight` suite: motions at
  120 Hz and mirrored, the guards, a KO on one keyboard and on two pads, the CPU's matches repeating, training's frame
  data; phone case 11; `kits-test`'s bot plays a CPU match twice and compares.

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
- **As built (v0.67.0):** the core's section 16c (on the diet with the Platformer: the `platformer` part is sections
  16b and 16c): `crouch`, `ledge`, `wallCling` and `momentum` as Platformer options; tile kinds `water`, `rope` and
  `bars` and grip on any tile type (`friction`, `carry`, `bounce`, `crumble` with `respawn`: `level.update(dt)`, and
  `level.drawWater(r)` after the actors); `swingFrom(x, z)` and `release()`; the Humanoid's poses for crawling,
  swimming and swinging (hang and climb were there). Today's defaults are unchanged: every existing side-view kit films
  the same pixels. The traversal suite (`tools/traversal-test.mjs`, its fixture `tools/fixtures/traversal.html`) films
  each move twice from one seed; the contract test holds each in numbers. `engine/modules/rooms.js` (after either
  edition): `E.World` (rooms on a grid of screens, each a PlatformMap or, `view: 'top'`, a TileMap; an open edge is a
  door, an edge with no room past it a wall; a slide or a fade; the camera's bounds; `world.seen`, `drawMap`,
  `shellMap()` for `E.Shell`'s minimap; gates as tile types with `gate`; `save`, `load`, `clear` in `E.store`). The
  METROIDVANIA kit (`src/starter/25-metroidvania.js`, family PLATFORM): twelve rooms in four areas (caverns, water, a
  tower, a station), the SPRING BOOTS (a second jump; the green hatch) and the PHASE DASH (the blue hatch), an arm cannon
  aimed eight ways with a charged shot and a lash (it cuts, knocks shots away and catches rings to swing from), the map
  screen and a corner map, a save room and a recharge station, the CARAPACE (armored in front, dazed by a wall) and the
  WARDEN (an eye behind plates, a fan of orbs, a floor beam); deep links `#metroidvania/miniboss`, `/boss`, `/map`.
  Its `bot()` plays the route by the keys, from the landing site to the WARDEN, and beats it.

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
- **As built, 6a (v0.68.0):** `engine/modules/mode7.js` (after either edition): `E.Mode7` with a camera `{ x, y, h, angle,
  pitch, fov }` (the angle as `E.angleTo` gives it), the floor from a TileMap's `floorTex`, a color function or a canvas
  (baked once; due north each row is a strip of it stretched across, as the stress test drew it; at any other heading
  each pixel is sampled), a sky of two colors or a Backdrop turned with the heading, billboards gathered each frame
  (`rig`, `sprite` with an `E.anim`'s frames, `shape`, `add`) and drawn far to near, fog, `chase`, `project`, `toFloor`,
  a split screen's viewports, and `begin`, `rowDepth`, `drawFloor`, `view` for a pass of your own (the stress test's:
  its walls, light pools and fog stay its own); `fullRes(game, on)` is the stress test's screen resolution.
  `engine/modules/road.js` (after either edition): `E.Road` with `add(n, { curve, hill, tunnel, colors })`, `place`
  (sprites, anims, drawings), cars between segments' ends, a crest hiding what lies past it (visibility near to far,
  drawing far to near), tunnels with a face round the mouth, `turn` for the Backdrop on curves, `curveAt`, `yAt`,
  `hits`, `ahead`, `project`. The `views` suite (`tools/views-test.mjs`, its fixture `tools/fixtures/views.html`)
  films both views twice and times a frame of each on an emulated phone; the contract test's views group holds the
  projections in numbers; the stress test's depth view films the same pixels as before.
- **As built, 6b (v0.69.0):** `engine/modules/drive.js` (after either edition; `E.Race` takes an `E.Path`, the full
  engine's): `E.Car`, an `E.Body` with a heading, speed along it and a slide across it that grip takes away; `top`,
  `accel`, `brake`, `turn`, `grip`, `drift`; a kart's hop into a drift that charges a boost (blue, then orange); a car's
  handbrake; the floor's tag under it from `surfaces` (`grass` half speed, `sand`, `dirt`, `ice`, `boost` pads); walls
  through the TileMap and `E.Car.collide` between cars; `boost`, `spinOut`; driven by an input or an intent.
  `E.Race`: a closed path as the racing line, `grid(n)`, laps through checkpoints in order, the wrong way, places, the
  results; drivers that look ahead, slow for the sharpest bend ahead to the speed it allows, drift, pass, back out of a
  wall and rubber-band; item boxes (a boost, a shot, a hazard) and `use`; `hud(r, racer)`. The KART kit
  (`src/starter/65-kart.js`, family RACING, `#kart/race`, `#kart/vs`): a circuit of a TileMap's cells drawn by
  `E.Mode7` (road, kerbs, grass, sand, boost pads, the start line, a low wall, a wood with trees), six karts drawn as
  boxes round an HD rig seated in each, sorted from the camera's side; item boxes; the map in the corner; VS in a split
  screen for two; the results. The ROAD kit (`src/starter/66-road.js`, `#road/drive`): five stretches on `E.Road`
  (the beach, hills, a tunnel, the desert, the city) with their skies, scenery and traffic, two gears, a clock and four
  checkpoints that add time, the goal, a radio of three songs. `kits-test`'s bots: six karts finish three laps and two
  players race in a split screen; the road's bot reaches the goal. The contract test's drive group; phone cases 13
  and 14.

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
- **As built, 7a (v0.70.0):** a `TileMap` of more than 128 x 128 cells (or `chunks: true`) bakes its floor in squares
  of 128 screen pixels as the camera comes to them, the colors and the GPU lighting's canvas both (the lighting's only
  while it is on), one more of the ring round the screen each frame ahead of the camera, the least recently drawn let
  go past twice what the screen needs; `set`, `fill` and `setFloor` re-bake only the squares over the cells changed;
  `map.floorBytes()` says what the floors hold; walls and the water's sparkle are queued from the cells on screen alone.
  A smaller map bakes as before (Emberdeep's web repaint reads that bake; every existing map is smaller), and the views
  suite draws a small map both ways from fifteen cameras: the same pixels. The agent edition keeps its one bake (its
  maps are small). Dialog markup is in both editions' `E.Dialog` (modules built on it load after either); `game.saves`
  is the full engine's section 10k, on the diet (`saves`: a kit reading `game.saves` or writing `menu: { saves }` keeps
  it), its screen built from `E.Shell`'s specs (the pause menu's Save and Load through a hook). Measured on the views
  suite's 256 x 256 map (`tools/fixtures/bigmap.html`): its floor holds 2.9 MB where one bake would take 253 to 302 MB;
  scrolling it on an emulated phone, 0.4 ms a frame (median), under 6 ms at the 95th percentile.
- **As built, 7b (v0.71.0):** `engine/modules/story.js` (after either edition): `E.Story` with people (a name, a
  portrait, a thing a balloon floats over), nodes of steps (a line or pages with choices, conditions on any step and
  choice: a flag, `!flag`, a comparison, `quest:id`, `done:id`, a list, a function; `set`, `add`, `quest`, `done`,
  `emote`, `goto`, `end`, `wait`, and `event` with `wait: true` holding the talk until `story.resume()`: the game's
  shop, inn and fight); `vars` that a line's `{$name}` reads; the quest log; balloons (!, ?, heart, dots, note);
  `state()` and `restore()`. `engine/modules/rpg.js` (after either edition): `E.RPG` with items (icons: an item's own
  sprite, else one drawn for its kind: a flask, a blade, a breastplate, a helm, a ring, a key), bags of slots or a
  grid of sizes, members (stats, growth per level, an experience curve, gear and `compare`, status effects that tick),
  a party (items used, an inn's rest, rewards shared by the living, drops), shops, `damage`, encounters by zone, a
  party's `state()` and `rpg.restore`, and windows in `E.ui` (`list`, rows a thumb's height on a phone; `card`). The
  RPG kit (`src/starter/40-rpg.js`): the battle as it was (`#rpg/battle`, a scene of its own, filmed beside v0.70.0:
  the same pixels), taking the journey's troops, members and the cave as its place; THE JOURNEY: a title (New game,
  Continue, Load, the battle alone), Brightwater (an elder with the quest and its key, an inn that autosaves, a shop,
  a chest, a guard who stands aside, a child and a gossip, a save crystal), an island of 256 x 256 cells (meadows,
  woods and peaks painted into its chunked floor, beaches, the road north), encounters by zone into the battle by a
  swirl, the cave (a chest, a crystal that heals and saves, the Dread Knight's scene and fight), the way home and THE
  END; the menu: Items, Equip (gear compared), Status, Quests, Save at a crystal. A slice's `parts` names a part that
  is a scene of its own (90-start.js). Its bot plays it all by the keys and loads the save; phone case 15.

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
- **As built (v0.72.0):** `map.pick(sx, sy, at)` in both editions: the screen point's line of sight (the projection's
  rows crossed: exact with any `zBoost`) clipped to the map's box and walked cell by cell, front to back, to the first top
  it comes down onto or wall face it meets (`{ cx, cy, x, y, z, face }`); the contract test checks it against a test of
  every cell's box at 5,760 points (six views, four turns, two zooms) on each edition. The grid already had climb and
  drop (M2): a unit's jump is those two; `reach` gains `pass` (allies crossed, not stopped on); new: `grid.shape` (cross,
  diamond, square, ring, line, cone), `grid.face`, `grid.side` (front, side, back), `grid.threat` (what units can strike
  next turn). Bows use the core's `map.arcClear`. `E.tint` over raised tops sorts with the map (D56). The TACTICS kit
  (`src/starter/47-tactics.js`, family STRATEGY, `#tactics`, `#tactics/battle`, `#tactics/phases`): Thornwatch, a hill
  fort on a floating map of block heights (its earth at the edges), four heroes (paladin, ranger, mage, cleric) against
  Grimwald's five (knight, archer, mage, priest, thief); the scene before the battle in `E.Story`, whose last choice
  picks charge time (`E.Turns` 'ct': a turn of less costs less) or phases (kept by the kit: the player's heroes in any
  order, END PHASE); MOVE, ATTACK or a skill (BASH knocks back, CLEAVE a cone, VOLLEY a cross, FIRE a diamond friend and
  foe, CURE), WAIT and a facing; x1.25 from the side, x1.5 from behind, +8% a level higher; the shallows cost two; the AI
  scores every place and blow less `grid.threat`'s danger; the cursor by keys (turned with the view), the mouse
  (`map.pick`) and taps; Q and E turn the view, a drag pans it on a phone; the order ahead, unit cards, a forecast; its
  own march. x-ray only for the unit whose turn it is (the renderer's x-ray assumes one).

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
- **As built, 9a (v0.73.0):** the core (on no kit's diet): the pointer's gestures in `E.Input` (`box()`, `longPress()`,
  `doubleTap()`, `pan()`, `zoomPoint()`; `feed(type, x, y, { touch, button })` plays a pointer in a test), `cam.free`
  (keys or a stick, the screen's edge, a drag one to one, a zoom toward the pointer or the pinch, bounds; in every view
  and turn), `r.pick(sx, sy)` (the `pick` values given to `r.actor`, `r.sprite`, `r.prop` and `r.queue`, front to back,
  each where its pixels went: an actor's drawn bounds, a kept image's, a sprite's), and E.Shell's minimap with the fog,
  the camera's view and a click's world point. `engine/modules/strategy.js` (after the full engine only, needs `grid`;
  its manual 1,560 of 2,500): `E.Strategy` (selection, orders and their queue, formations on shared flow fields (the 16
  last kept) kept apart by a `SpatialHash`, production queues and rally points, gathering trips, workers that lay and
  raise buildings, placement and its ghost, the player's fog (`E.Fog`, walls block sight), the minimap's spec, an
  enemy's build order and waves as data, a script), `E.Clock`, `E.needs`, `E.choose`, `E.overlay`, `E.tooltip`. One
  fact corrected: `timeScale` above 1 already runs more fixed steps a frame, none longer than 1/120 s (M0's loop), so
  the time controls are `timeScale` 0, 1, 2 and 4 and needed nothing new. A crowd's frame: 200 rigs drawn every frame
  take 84 ms on the phone test's emulated phone; with `every: 3, key` (each body's image kept two frames of three) they
  take 10 to 17 ms (phone case 17, `tools/fixtures/army.html`), the way the kits will draw them.
- **As built, 9b (v0.74.0):** the RTS kit (`src/starter/48-rts.js`, family STRATEGY, `#rts`, modules grid and strategy):
  the Vale War, a map of 56 x 44 cells with a river and three fords; the Vale's hall south-west, the Ash Clan's camp
  north-east; workers who mine gold (two mines by each base, four between), three kinds to fight (footmen, archers whose
  arrows fly, knights), two buildings to build (a barracks, a stable); buildings and mines as `E.SHAPES` in each side's
  colors (a site going up first); fog; E.Shell's minimap; the clan's AI from a build order that keeps its counts and
  waves from four minutes, bigger each time; the HUD's panel of commands (Z X C), HALL, ARMY and IDLE on a phone,
  BUILD then a tap and PLACE; alerts when the Vale is struck; the end and its numbers. The SIM kit
  (`src/starter/49-sim.js`, family SIMULATION, `#sim`, modules grid and strategy): Sunny Bay Park, paths as floor tags
  laid a tile or a line at a time, four rides (carousel, Ferris wheel, teacups, swing tower) and two stands (burgers,
  lemonade) as shapes whose moving parts are generators stepped through angles (16, 24 or 32 pictures, kept), guests
  as rigs with money and needs choosing by `E.choose`, queues, prices against what a ride is worth to them, thoughts,
  a rating from how happy they leave, the gate's fee, upkeep at midnight, `E.Clock`'s days and night lights, PAUSE and
  1X to 4X, a crowds overlay, tooltips, inspecting a ride (its price, knock it down) or a guest. The core: `r.shape`
  takes `pick`. The module: a building's rally point by a right click; its AI makes its losses again, mines nearest its
  depot and attacks the nearest foe building.

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
- **As built (v0.75.0):** the click module (`engine/modules/click.js`, after the full engine only; its manual 1,420 of
  1,500 tokens): `E.Walkbox` (a polygon with holes: `inside`, `nearest`, `path`: A* over the corners set a pixel and a
  half off, then straight where nothing is in the way) and `E.Click` (rooms painted once with margins a bigger screen
  shows, a whole zoom on a tall one; depth scale; hotspots by rectangle, polygon or actor with a place to stand, a way
  to face and their verbs; `things` drawn by depth; the nine verbs, Sierra's icons, a verb coin or two buttons; a
  cursor and a label; an inventory, an item on a hotspot or another item, either way round, and on someone a give;
  rules as data; exits with fades; a double click runs; `story`'s flags and talk; on a phone a tap walks, a tap on a
  hotspot opens its verbs, a long press looks, thumb-sized buttons; `panel` off for a cutscene; `where`, `screen` and
  `boxes` for tests and bots). Three facts corrected: `story` had no backlog, auto or skip, so it gained `story.log`,
  `story.auto` and `story.skip` (the visual novel's recipe uses them); M1's transitions are between scenes, so a room
  change fades in the module; and a phone could not pick a dialog's choice by a tap, so `E.Dialog` takes a tap or click
  on a choice (`choiceAt(i)` says where). The POINT-AND-CLICK kit (`src/starter/15-pointclick.js`, family ADVENTURE,
  `#pointclick`, modules click and story): THE LIGHT ON GULL ROCK, a dock at dusk (eight hotspots), the Salty Gull
  (eight) and the lighthouse's lamp room (seven); PIP, FINN, MORWEN and BRUNO as rigs with live close-ups in the talk;
  the chain: the ROPE and the HOOK make a GRAPPLE that fishes the OAR out; Morwen's riddle contest (three riddles, a
  wrong answer ends it) wins the KEY to the rowboat's chain; a BOTTLE on the whale-oil barrel gives OIL; the OIL, then
  the MATCHES, light the lamp; an opening card and talk, the ending's beams and THE END with the time and actions;
  Settings, Point and click, Interface; a shanty and a hymn of its own.

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
- **As built, 11a (v0.76.0):** the physics module (`engine/modules/physics.js`, after either edition; its manual 1,349
  of 2,500 tokens): `E.Physics`, every shape a core (a point, a segment or a convex polygon) with a radius round it, so
  a segment with `r` is a capsule; dynamic, kinematic (`moveTo`, its speed given to what it hits) and static bodies;
  contacts found within a pixel and solved by sequential impulses in a fixed order (the movers in the order added, each
  with the statics of a grid near it), bounce, friction, sensors with enter and exit, layers and masks, sleep, gravity
  as a vector; a fast ball (`bullet`) is swept each substep and stops where it would touch what it is not already
  touching, keeping its speed for the bounce; `world.flipper`, `bumper` (a kick: what it hits leaves at that speed at
  least), `slingshot`, `kicker` (catches, holds, fires); a field shape for anything that answers a circle's test (the
  terrain); `ray`, `query`, `hash`, a debug `draw`. The terrain module (`engine/modules/terrain.js`, after either
  edition; 914 of 1,500): `E.Terrain`, a mask of material cells, one a world unit, its y up (the side view's z);
  `carve` (hard materials stay; bits of what it took as particles, scattered by a hash, not the game's randomness),
  `add`, `carvePoly`, `addPoly`, `ground`, `normal`, `hit`, `ray`, `walk` (a step up of `climb`, walls, falls and
  the landing's speed), `collider()` for physics, and `draw(r)` as decals in chunks painted again only where a change
  touched (`drawn`). One fact made precise: "the ball never passes through a flipper" is held by the sweep against
  static and kinematic bodies at their poses each substep (four a step: 1/480 s), the flipper's tip moving under a
  ball's radius in that time.
- **As built, 11b (v0.77.0):** PINBALL (`#pinball`, `src/starter/33-pinball.js`, family ARCADE; 190,924 tokens):
  NEBULA RUN in a view of its own (`new E.View('pinball', 'Table', 0, 62, 1, 1)`), every part of the plan's list, the
  mission a chain of counters (targets, ramp, jackpot, the saucer's multiball), a dot-matrix display drawn by code, the
  arcade module's table and attract mode (a demo by the bot); a phone held upright shows the table whole, with a
  backglass above and a coin door below. ARTILLERY (`#artillery`, `#artillery/cpu`, `src/starter/34-artillery.js`,
  family STRATEGY; 197,566 tokens): BLAST ISLAND, a generated island (`E.Terrain`, a side view at a whole scale), grubs
  as `land.walk` walkers, the rocket and cluster stepping their own flight on `land.ray`, each grenade a body in a
  physics world of its own on `land.collider()`, the CPU's tries run through the same steps (a few each step), a
  minimap, sudden death from turn 16. Two facts made precise: the core had no way for a finger to hold an action where
  it lands, so it gained touch zones (`input.zones`: the pinball's halves, a finger each; no stick); and `E.Turns` has
  no mode that alternates teams, so the two teams are its actors (in speed mode, equal speeds alternate) and each sends
  its next grub still standing. Proved: each kit's bot (`kits-test`), a ball played and a CPU match to its end, each
  twice the same; phone cases 21 and 22; the contract test's touch zones; the other kits filmed beside v0.76.0, the
  same pixels.

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
| M0 room to grow | done (two pull requests) | 0a v0.60.0 `00fbfe1` (#153); 0b v0.61.0 `2ad644f` (#154); the plan's facts v0.61.1 | 0a: modules (`engine/modules/`, `tools/engine-lib.mjs` for every tool, the `modules` suite's fixture in a copy of the repository), the budgets (D50: card 18,000, index 52,000, a module 1,500), the test runner. 0b: the kit diet (`DIET`, `tools/diet.mjs`; the Platformer a section of its own, 16b), `kits-test` (every slice's proof twice; `--compare` films; the reference menus), the family title menus (`05-families.js`), the kits' budgets (D51). Measured at v0.61.0, cl100k: adventure 195,281, shooter 191,532, RPG 189,874, brawler 187,859, animation lab 180,685, platformer 180,085, stealth 179,909; 3D action 215,277, platformer 210,084, shooter 285,061; the compact edition 332,477 (it splits or goes past 500,000: a later milestone's decision), the reference 437,609; card 15,032, index 35,597, agent header 9,876. Every 2D kit's title and play filmed beside the build without the diet: the same pixels. Left: nothing; the adventure kit has the least room (4.7k), so M1's additions go on the diet (3.5). Checked after the merge (rule 2): every statement of 3.2, 3.3 and M0 against the code at v0.61.0; six were put right in v0.61.1 (which tools take the loader, the manual's words for "full engine only", the API card's line until the first module, D32's shapes kept in every kit, `kits-test`'s play-to-the-end check arriving in M2, a kit's engine in the words table). The full `npm test` on `main` at `2ad644f`: every suite passed (24, with the version, syntax and doctrine checks; 21 min 14 s). |
| M1 motion and presentation | done | v0.62.0 `c9de150` (#156); its row v0.62.1 | Tweens and scripts (10d), paths (10e), transitions (10f), weather (10g), input sequences (10h), the camera's window and framing (10i), Penner's easings (1b) and sprite frames, turns and swaps (2b), each a part of the diet; wrap-around and the screen filter in the core. Measured at v0.62.0, cl100k: adventure 197,866 (2,134 left), shooter 194,774, RPG 192,376, brawler 191,397, animation lab 183,248, platformer 183,120, stealth 182,431; 3D 218,048, 212,855, 287,832; compact 341,273, reference 453,334; card 16,012, index 38,261, agent header 9,885; the kits 5.21 MB (5.13). Every 2D kit's title and play, Emberdeep, the arena and the reference edition's adventure and platformer filmed beside v0.61.1: the same pixels. `npm run test:changed`: all 25 suites passed (19 min 25 s), on the third run (the first two caught the card's script example running on the agent edition, and the motion suite counting the fixture hero's blink as the weather's `Math.random`: both fixed in #156). The full `npm test` on `main` at `c9de150`: every suite passed (25, with the version, syntax and doctrine checks; 19 min 27 s). Left: nothing; the adventure kit has 2,134 tokens of room, so M2's slices and modules go in kits of their own and M2's core additions on the diet. |
| M2 grids, turns, generated maps | done | v0.63.0 `d74f49f` (#158); its row v0.63.1 | The `grid` module (`E.Grid`, square and hex; A*, Dijkstra's reach, lines, symmetric shadowcasting, flood and groups; `E.Fog`, `E.tint`; `E.GridMover`; `E.Turns` by speed, charge time, phase and ATB; 1,216 of its 2,500 tokens) and the `gen` module (rooms, BSP, caves, mazes, Poisson scatter, `mark`; 691 of 1,500), both loading after the agent edition too; the ROGUELIKE kit (`45-roguelike.js`, family RPG: ten floors, its bot wins with seed 1) and the PUZZLE kit (`35-puzzle.js`, family PUZZLE: blocks and pairs, its bot clears lines); `kits-test` runs each slice's `bot()` (`BOTS`); phone cases 7 and 8; the Labs page's **To check** section (the owner's checks, each with a button to the place). Measured at v0.63.0, cl100k: adventure 198,265, shooter 195,173, RPG 192,775, brawler 191,796, roguelike 188,087, animation lab 183,647, platformer 183,519, stealth 182,830, puzzle 170,154; 3D 218,263, 213,070, 288,047; compact 368,720, reference 485,534; card 16,227, index 40,614. Every existing kit's strips beside v0.61.1's: the same pixels. `npm run test:changed`: all 25 suites passed (19 min 60 s). The full `npm test` on `main` at `d74f49f`: every suite passed (26 with the build; 20 min 43 s). Left: the two kits play built-in songs, not songs of their own (3.4): each gets one in M3. |
| M3 the arcade | done | v0.64.0 `9841a03` (#160); its row v0.64.1 | The `arcade` module (`E.Arcade`: scores that float up, extra lives, two players' turns, credits and the continue, tables per game and mode with initials on a letter wheel by keys, pad or taps, stage cards, the attract mode; 818 of its 1,500 tokens; after either edition); the ARCADE kit (`32-arcade.js`, family ARCADE: MAZE with `E.GridMover`s and four wisps that each choose their target their own way, FORMATION on `E.Path`s turned by `rot`, ROCKS with thrust, drift, a saucer and hyperspace; each with its table, a demo by its own bot and a classic look); the SHOOTER's arcade frame (the continue, initials, the table) and horizontal stage (`#shooter/horizontal`: rock above and below, a power bar of six, options on the ship's past path, a looping cruiser, a core battleship behind walls); deep links into a part (`#<slice>/<part>`); songs of their own for the roguelike, the puzzle, the arcade and stage 2. D52: the 2D kits' 200,000 budget suspended until the owner's review pass (the shooter is over it). Measured at v0.64.0, cl100k: shooter 212,477, adventure 198,627, arcade 195,251, RPG 193,137, brawler 192,158, roguelike 188,738, animation lab 184,009, platformer 183,881, stealth 183,192, puzzle 170,817; 3D 218,463, 213,270, 288,247; compact 408,362, reference 527,040; card 16,427, index 41,766; the kits 6.39 MB. Every other kit's strips beside v0.63.1's, and the shooter's vertical stage: the same pixels. Bots: the cabinet's bot clears a maze, two waves of moths and two of rocks, then shows the attract mode; the shooter's bot flies stage 2 to the core. Phone cases 9 and 10. `npm run test:changed`: 23 of 25 suites passed on the first run (21 min 6 s); the kits suite (`BOTS` applied to the 3D shooter) and the phone suite (the roguelike's tap check on an unseeded floor) were fixed in #160 and passed on rerun. The full `npm test` on `main` at `9841a03`: every suite passed (26 with the build; 20 min 24 s). Left: nothing. |
| M4 players and fighting | done (two pull requests) | 4a v0.65.0 `5aa84f1` (#162); 4b v0.66.0 `bf263aa` (#163); its row v0.66.1 | 4a: two to four players in the core (section 10j, on the diet: only the brawler and the puzzle carry it): `game.players`, `game.allowJoin` (Start on a pad no one holds, 2 on the keyboard: the keyboard's halves, `Input.halfKeys`), `game.addPlayer`, `removePlayer`, each player's history, prompts, pause and lost controller, menus that read every player; split screen (`game.splitScreen(n)`, 2 to 4 viewports clipped from the pass's start, each with its own camera); the BRAWLER's second player and the PUZZLE's versus; the `players` suite. D53: `allowJoin` and `splitScreen` for the plan's `join` and `split`. 4b: the `fight` module (`E.Fighter` on `E.MOVES` with frame data at 60, hurt boxes from the rig, guards, throws, cancels, juggles, motions read at 120 Hz and mirrored, charge, a super meter; `E.Match` with rounds, the HUD and training; `E.FightAI` from its own `E.rng`; `E.FightSelect`; 1,473 of its 2,500 tokens; after the full engine) and the FIGHTING kit (`55-fighting.js`, family FIGHTING: RYO, GORM, VEX; versus, arcade, training; a song of its own); the `fight` suite; phone case 11. Measured at v0.66.0, cl100k: shooter 213,698 (D52), adventure 199,824, brawler 197,155, arcade 196,476, RPG 194,363, roguelike 190,001, animation lab 185,208, platformer 185,108, stealth 184,429, fighting 180,786, puzzle 176,275; 3D 219,746, 214,553, 289,530; compact 433,958, reference 560,137; card 16,879, index 44,608; the kits 6.90 MB. Every kit's strips beside the milestone before: the same pixels. `npm run test:changed`: 4a all 26 suites passed (19 min 20 s), 4b all 27 (20 min 4 s). The full `npm test` on `main`: at `5aa84f1` every suite passed (27 with the build; 19 min 41 s), at `bf263aa` every suite (28; 19 min 52 s). Left: the owner's checks on the Labs page (the brawler with a friend, puzzle versus, does the fighting feel like Street Fighter). |
| M5 traversal and Metroidvania | done | v0.67.0 `5aaecfa` (#165); its row v0.67.1 | The core's section 16c (on the diet with the Platformer: only the platformer, the fighting and the metroidvania carry it): `crouch`, `ledge`, `wallCling` and `momentum` as Platformer options; tile kinds `water`, `rope` and `bars`; grip on any tile type (`friction`, `carry`, `bounce`, `crumble` with `respawn`); `swingFrom` and `release`; the Humanoid's poses for crawling, swimming and swinging; the `rooms` module (`E.World`: rooms on a grid of screens, a door at each open edge, slides and fades, the explored map and `shellMap()`, gates, saves; 1,089 of its 1,500 tokens; after either edition); the METROIDVANIA kit (`25-metroidvania.js`, family PLATFORM: twelve rooms in four areas, the SPRING BOOTS and the PHASE DASH, an arm cannon aimed eight ways with a charged shot and a lash, the CARAPACE and the WARDEN, the map screen, a save room; its bot plays the route by the keys to the WARDEN and beats it); the `traversal` suite (each move filmed twice from one seed); phone case 12. Measured at v0.67.0, cl100k: shooter 214,734 (D52), metroidvania 204,874 (D52), adventure 200,860 (D52), brawler 198,082, arcade 197,512, RPG 195,399, roguelike 191,038, platformer 190,634, fighting 186,409, animation lab 186,244, stealth 185,465, puzzle 177,311; 3D 220,734, 215,541, 290,518; compact 469,461, reference 600,644; card 17,216, index 45,741; the kits 7.46 MB. Every existing side-view kit's strips beside v0.66.1's: the same pixels. `npm run test:changed`: all 28 suites passed (20 min 57 s). The full `npm test` on `main` at `5aaecfa`: every suite passed (29 with the build; 21 min 9 s). Left: the owner's check on the Labs page (does the metroidvania feel like Super Metroid). |
| M6 Mode 7, the road, racing | done (two pull requests) | 6a v0.68.0 `ec5bea4` (#167); 6b v0.69.0 `f2c076d` (#168); its row v0.69.1 | 6a: the `mode7` module (`E.Mode7`: a camera over a flat floor drawn a row at a time, a stretched strip of it due north and each pixel sampled at any other heading; a sky turned with the heading; billboards far to near (rigs from the camera's side, sprites, anims, shapes, your drawing); fog; `chase`, `project`, `toFloor`; a viewport per player; `fullRes`; 975 of its 1,500 tokens) and the `road` module (`E.Road`: segments with eased curves and hills, lanes, rumble strips, tunnels with a face round the mouth, scenery and cars scaled by distance, crests that hide what lies past them, a Backdrop's parallax; 798 of 1,500), both after either edition; the stress test's depth view drawn by `E.Mode7`, the same pixels as before; the `views` suite (each view filmed twice, the two floors the same, a split screen's halves, the phone budget). 6b: the `drive` module (`E.Car`: heading, grip, a kart's hop into a drift that charges a boost, the floor's tags (grass, sand, dirt, ice, boost pads); `E.Race`: laps through checkpoints in order, the wrong way, places, drivers that slow for the sharpest bend ahead, drift, pass, back out of a wall and rubber-band, item boxes, the HUD per viewport; 914 of 1,500; after either edition) and two kits of the new RACING family: KART (`65-kart.js`: a Mode 7 circuit, six karts with seated HD drivers, three laps, items, VS for two in a split screen, a song of its own) and ROAD (`66-road.js`: five stretches with their skies and scenery, traffic, bends that throw you outward, crashes, two gears, the clock and four checkpoints, a radio of three songs); `vercel.json` serves every kit (fighting and metroidvania were missed in M4 and M5); the contract test's views and drive groups; phone cases 13 and 14. Measured at v0.69.0, cl100k: shooter 215,247 (D52), metroidvania 205,387 (D52), adventure 201,373 (D52), brawler 198,595, arcade 198,025, RPG 195,912, roguelike 191,551, platformer 191,147, kart 188,672, fighting 186,922, animation lab 186,757, stealth 185,978, puzzle 177,824, road 171,700; 3D 221,177, 215,984, 290,961; compact 496,774 (the 500,000 line is M0's later decision), reference 633,476; card 17,659, index 48,043; the kits 8.37 MB. Every existing kit's strips beside the milestone before: the same pixels. Bots: the kart's six karts finish three laps in about a minute, none stuck long enough to back out, then two players race in a split screen; the road's bot reaches the goal through its four checkpoints with no crash. `npm run test:changed`: 6a all 29 suites passed (21 min 46 s), 6b all 29 (21 min 55 s). The full `npm test` on `main`: at `ec5bea4` every suite passed (30 with the build; 22 min 4 s), at `f2c076d` every suite (30; 22 min 7 s). Left: the owner's checks on the Labs page (does the kart feel like Super Mario Kart, does the road feel like OutRun). |
| M7 stories, RPG, big maps | done (two pull requests) | 7a v0.70.0 `90eec25` (#170); 7b v0.71.0 `f8b0cf9` (#171); its row v0.71.1 | 7a: a `TileMap` of more than 128 x 128 cells (or `chunks: true`) bakes its floor in squares of 128 screen pixels near the camera (the colors and the GPU lighting's canvas both), re-baking only the squares a change touches, walls and the water's sparkle queued from the cells on screen (`map.floorBytes()`; smaller maps bake as before, the same pixels); dialog markup in both editions' `E.Dialog` (`{c=}`, `{w=}`, `{s=}`, `{shake}`, `{wave}`, `{$name}`); save slots (`game.saves`, section 10k, on the diet: three slots and an autosave, versioned with `migrate`, damaged and newer saves refused, blocked storage kept for the visit, `menu: { saves: true }` and the standard screen); the views suite's big map (256 x 256 cells: its floor 2.9 MB where one bake would take 253 to 302 MB; 0.4 ms a frame on an emulated phone, median, under 6 ms at the 95th percentile), the standard test's save slots, the contract test's dialogs group. 7b: the `story` module (`E.Story`: people, nodes of steps with conditions and choices, flags and variables, quests, events that can hold the talk, balloons, `state` and `restore`; 1,116 of 1,500 tokens) and the `rpg` module (`E.RPG`: items with icons, bags of slots or a grid, members with growth, a curve, gear and `compare`, status effects, a party, shops, `damage`, encounters by zone, windows in `E.ui`; 1,497 of 1,500), both after either edition; the RPG kit's journey (`40-rpg.js`: Brightwater, a 256 x 256 island in a chunked floor, the cave and the Dread Knight, the menus and the save slots; the battle a scene of its own, `#rpg/battle`, filmed beside v0.70.0: the same pixels); a slice's `parts` (90-start.js); the contract test's stories and rpg groups; phone case 15. Measured at v0.71.0, cl100k: RPG 234,786 (D52), shooter 217,906 (D52), metroidvania 208,058 (D52), adventure 204,059 (D52), brawler 201,265 (D52), arcade 199,591, roguelike 194,094, platformer 192,714, kart 191,227, animation lab 189,411, stealth 188,650, fighting 188,502, puzzle 179,387, road 173,265; 3D 222,640, 217,447, 292,424; compact 532,876 (D55), reference 676,447; card 18,129 (D54), index 50,133; the kits 8.56 MB. Every other kit's strips beside the milestone before: the same pixels (7a all of them; 7b all but the RPG's, whose play is now the journey). Bots: the RPG's bot plays the journey by the keys (the quest and its key, the shop, Equip, the chest, a save at the crystal, the road north on AUTO to level 3, the cave, the knight, home; six of six runs beat the knight) and loads its save (the town, the quest taken, its gold and gear). Decisions: D54 (the API card's budget 19,000 until the owner's review), D55 (the compact edition kept whole past 500,000 until then). `npm run test:changed`: 7a all 29 suites passed (22 min 52 s), 7b all 29 (22 min 20 s). The full `npm test` on `main`: at `90eec25` every suite passed (30 with the build; 22 min 40 s), at `f8b0cf9` every suite (30; 22 min 35 s). Left: the owner's check on the Labs page (does the RPG feel like Dragon Quest and Final Fantasy). |
| M8 tactics | done | v0.72.0 `c30e191` (#173); its row v0.72.1 | `map.pick(sx, sy, at)` in both editions (the cell under a screen point on a map of heights, in any view, turn and zoom: the line of sight clipped to the map's box and walked cell by cell to the first top or face it meets); the grid module's tactics helpers (`reach`'s `pass`, `grid.shape`, `grid.face`, `grid.side`, `grid.threat`; 1,480 of its 2,500 tokens), a unit's jump being M2's `climb` and `drop`, a bow's arc the core's `map.arcClear`; `E.tint` over a raised top sorting with the map (D56); the TACTICS kit (`47-tactics.js`, family STRATEGY: Thornwatch, a hill fort of block heights; four heroes against Grimwald's five; the scene before the battle in `E.Story` and its choice of charge time or phases; MOVE, ATTACK or a skill, WAIT and a facing; blows from the side, behind and above; the shallows; a scoring AI; the cursor by keys, mouse and taps; the view turned and zoomed; a march of its own); the contract test's picking group (5,760 points in six views, four turns and two zooms on each edition, against a test of every cell's box) and tactics group; phone case 16. Measured at v0.72.0, cl100k: RPG 235,521 (D52), shooter 218,648 (D52), metroidvania 208,801 (D52), adventure 204,794 (D52), brawler 202,007 (D52), arcade 200,769 (D52), tactics 199,432, roguelike 195,773, platformer 192,955, kart 191,969, animation lab 190,153, stealth 189,392, fighting 188,743, puzzle 180,565, road 173,506; 3D 222,778, 217,585, 292,562; compact 551,474 (D55), reference 696,131; card 18,267 (D54), index 50,659; agent header 9,971 of 10,000; the kits 9.08 MB. Every other kit's strips beside v0.71.1's: the same pixels. Bots: the heroes' own AI takes the fort by charge time in 51 turns, twice the same (the AI's turns repeat), and by phases in 45, all four heroes standing each time. Decisions: D56. `npm run test:changed`: all 29 suites passed (23 min 12 s). The full `npm test` on `main` at `c30e191`: every suite passed (30 with the build; 22 min 54 s). Left: the owner's check on the Labs page (does TACTICS feel like Final Fantasy Tactics and Fire Emblem). |
| M9 strategy and simulation | done (two pull requests) | 9a v0.73.0 `acbd322` (#175); 9b v0.74.0 `fc9ba7f` (#176); its row v0.74.1 | 9a: the pointer's gestures in the core (a box, a long press, a double tap, a pan, the zoom's point; `input.feed` for tests), `cam.free` (keys or a pad's stick, the screen's edge, a drag one to one, a zoom toward the pointer, bounds; every view and turn; a finger never pans as the touch stick), `r.pick` (what the last frame drew under a point, front to back), E.Shell's minimap with fog, the camera's view and a click's world point; the strategy module (1,560 of its 2,500 tokens: `E.Strategy`'s selection, orders, formations on shared flow fields, production, gathering, building, placement, fog, the minimap, an AI's build order and waves; `E.Clock`, `E.needs`, `E.choose`, `E.overlay`, `E.tooltip`); the contract test's strategy group (selection and orders by scripted pointer input in four views turned three ways); phone case 17 (`tools/fixtures/army.html`: 200 units under orders at 10 to 17 ms a frame, the median, each body kept two frames of three; 84 ms drawn every frame). One fact put right: `timeScale` above 1 already ran more fixed steps a frame. 9b: the RTS kit (`48-rts.js`, family STRATEGY: the Vale War, workers and gold, a barracks and a stable, footmen, archers and knights, fog, the minimap, the Ash Clan's waves) and the SIM kit (`49-sim.js`, family SIMULATION: Sunny Bay Park, paths, four rides whose shapes turn and two stands, guests with money and needs, prices, a rating, day and night, 1x to 4x); `r.shape`'s `pick`; the module's rally points and an AI that keeps its counts; phone cases 18 and 19. Measured at v0.74.0, cl100k: RPG 238,449 (D52), shooter 221,587 (D52), metroidvania 211,744 (D52), adventure 207,749 (D52), sim 207,226 (D52), RTS 205,461 (D52), brawler 204,957 (D52), arcade 203,594 (D52), tactics 202,373 (D52), roguelike 198,705, platformer 195,808, kart 194,952, animation lab 193,087, stealth 192,347, fighting 191,578, puzzle 183,431, road 176,358; 3D 225,434, 220,241, 295,218; compact 588,540 (D55), reference 738,518; card 18,858 (D54), index 52,857 (D57); agent header 9,971 of 10,000; the kits 10.22 MB. Every other kit's strips beside the build before each: the same pixels. Bots: the Vale's own AI burns the Ash Clan's camp at 14:21, twice the same; the park runs ten days at 4x, its money each midnight $1,980 to $13,071, 1,400 guests, rating 82. Decisions: D57. `npm run test:changed`: 9a all 29 suites (23 min 17 s; its first run caught the free camera taking a long press's touch stick, fixed before the merge), 9b all 29 (25 min 40 s). The full `npm test` on `main`: at `acbd322` every suite passed (30 with the build; 24 min 25 s); at `fc9ba7f` every suite passed (30 with the build; 25 min 16 s). Left: the owner's checks on the Labs page (does RTS feel like Warcraft II and StarCraft; does SIM feel like Theme Park and RollerCoaster Tycoon). |
| M10 point-and-click | done | v0.75.0 `a73d85b` (#178); its row v0.75.1 | The click module (`engine/modules/click.js`, after the full engine only; 1,477 of its 1,500 tokens): `E.Walkbox` (walk areas with holes: the shortest way round them, A* over the corners then straight) and `E.Click` (rooms painted once with margins a bigger screen shows and a whole zoom on a tall one, depth scale, hotspots by rectangle, polygon or actor with a place to stand, a way to face and their verbs, things drawn by depth, SCUMM's nine verbs, Sierra's icons, a verb coin or two buttons, a hand cursor and a label, an inventory used on hotspots and on itself either way round, rules as data, exits with fades, a double click to run, `story`'s talk; on a phone a tap walks, a tap on a hotspot opens its verbs, a long press looks, thumb-sized buttons). Three facts put right: `story` gained `log`, `auto` and `skip` (the visual novel recipe's backlog); a room's change fades in the module (M1's transitions are between scenes); `E.Dialog` takes a tap or click on a choice (`choiceAt`), which a phone could not do. The POINT-AND-CLICK kit (`15-pointclick.js`, family ADVENTURE: The Light on Gull Rock, a dock, the Salty Gull and the lighthouse's lamp room with 8, 8 and 7 hotspots; Pip, Finn, Morwen and Bruno with close-ups; the grapple, Morwen's riddle contest, the oil, the lamp; an opening and THE END; Settings' four interfaces; a shanty and a hymn); the contract test's clicks group (paths from 30 random pairs inside and never longer than a 2-pixel grid's Dijkstra; a walk the same at 60, 90, 120 and 144 Hz; clicks, a right click, Sierra's cursor, rules, exits, saves; the story's log, auto and skip; a dialog's choice by a tap); phone case 20. Measured at v0.75.0, cl100k: RPG 239,294 (D52), shooter 222,264 (D52), metroidvania 212,431 (D52), adventure 208,425 (D52), sim 207,902 (D52), RTS 206,137 (D52), brawler 205,633 (D52), arcade 204,271 (D52), tactics 203,218 (D52), roguelike 199,382, point-and-click 197,105, platformer 196,484, kart 195,628, animation lab 193,764, stealth 193,024, fighting 192,261, puzzle 184,108, road 177,035; 3D 226,012, 220,819, 295,796; compact 618,509 (D55), reference 772,373; card 19,165 (D58), index 54,269 (D57); agent header 9,971 of 10,000; the kits 11.27 MB. Every other kit's strips beside v0.74.1's: the same pixels. Bots: the kit's bot clicks through the whole chain with the nine verbs (a riddle lost first, the lamp dry first) to THE END; its proof gives the same hash twice. Decisions: D58. `npm run test:changed`: all 29 suites passed (25 min 39 s). The full `npm test` on `main` at `a73d85b`: every suite passed (30 with the build; 25 min 36 s). Left: the owner's check on the Labs page (does POINT-AND-CLICK feel like Monkey Island and Broken Sword). |
| M11 physics toys | done (two pull requests) | 11a v0.76.0 `760eeff` (#180); 11b v0.77.0 `d1c1ee9` (#181); its row v0.77.1 | 11a: the physics module (`engine/modules/physics.js`, after either edition; 1,349 of its 2,500 tokens): `E.Physics`, every shape a core with a radius (circles, boxes, convex polygons, capsules, chains, arcs, fields), dynamic, kinematic (`moveTo`, a flipper's `turn`) and static bodies, contacts within a pixel by sequential impulses in a fixed order, bounce, friction, sensors with enter and exit, layers and masks, sleep, gravity as a vector, fast balls swept against what they would pass through (a ball at twice its top speed never tunnels), `flipper`, `bumper`, `slingshot`, `kicker`, `ray`, `query`, `hash`, `draw`; the terrain module (`engine/modules/terrain.js`, after either edition; 914 of 1,500): `E.Terrain`, a mask of material cells carved and added by circles and polygons, `ground`, `normal`, `hit`, `ray`, `walk`, `collider()`, drawn in chunks redrawn only where a change touched; the contract test's physics toys group (no tunnelling from 48 directions and 24 angles, one table the same at 60, 90, 120 and 144 Hz, the terrain's carving, walkers and a ball resting on it). 11b: the PINBALL kit (`33-pinball.js`, family ARCADE: NEBULA RUN in a view of its own, flippers, bumpers, slingshots, a ramp on its own layer, drop targets, a spinner, top lanes, a kickback, a saucer, the jackpot and STAR STORM multiball, a ball saver, nudging and TILT, a dot-matrix display drawn by code, the arcade module's table and attract mode); the ARTILLERY kit (`34-artillery.js`, family STRATEGY: BLAST ISLAND, a generated island carved by every blast, two teams of three grubs as walkers, `E.Turns` alternating the teams, a rocket the wind blows, a grenade bouncing in a physics world of its own on `land.collider()`, a cluster bomb, falls, the sea and sudden death, one player against a CPU that tries its shots in simulation, two players in turn, two CPUs, a minimap); touch zones in the core (`input.zones`: the pinball's halves); phone cases 21 and 22; the contract test's touch zones. Three facts made precise: the flipper's no-tunnel rule is held by the sweep at the bodies' poses each substep; the core had no way for a finger to hold an action where it lands (so touch zones); `E.Turns` alternates teams with the teams as its actors. Measured at v0.77.0, cl100k: RPG 240,256 (D52), shooter 223,235 (D52), metroidvania 213,393 (D52), adventure 209,387 (D52), sim 208,869 (D52), RTS 207,105 (D52), brawler 206,595 (D52), arcade 205,247 (D52), tactics 204,180 (D52), roguelike 200,349 (D52), point-and-click 198,067, artillery 197,566, platformer 197,451, kart 196,589, animation lab 194,726, stealth 193,994, fighting 193,223, pinball 190,924, puzzle 185,060, road 177,997; 3D 226,762, 221,569, 296,546; compact 659,947 (D55), reference 819,622; card 19,651 (D58), index 55,812 (D57); agent header 9,971 of 10,000; the kits 12.34 MB. Every other kit's strips beside v0.76.0's: the same pixels (36 strips). Bots: the pinball's plays a ball (8,480 points, 10 flips, 10 bumpers, twice the same); the artillery's two CPUs finish a match (29 turns, a shot each, all three weapons, the Red Grubs win, twice the same); each proof gives the same hash twice. Decisions: none new. `npm run test:changed`: 11a 7 of 29 suites (6 min 28 s), 11b all 29 (26 min 18 s). The full `npm test` on `main`: at `760eeff` every suite passed (30 with the build; 26 min 12 s); at `d1c1ee9` every suite passed (30 with the build; 26 min 21 s). Left: the owner's checks on the Labs page (does PINBALL feel like Pinball Fantasies and Space Cadet; does ARTILLERY feel like Worms and Scorched Earth). |
| M12 music and rhythm | not started | | |
| M13 3D action and horror | not started | | |
| M14 3D vehicles and flight | not started | | |
| M15 crawler and sports | optional: on the owner's word | | |
| M16 fold in | not started | | |
