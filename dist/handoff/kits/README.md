# The genre kits (v0.91.1)

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
| ADVENTURE | [adventure.js](adventure.js), [adventure.html](adventure.html) | a top-down action adventure: a village, ruins and a shrine, a sword, a key and a great door, talk with portraits; Zelda and Secret of Mana | none | #adventure |
| POINT-AND-CLICK | [pointclick.js](pointclick.js), [pointclick.html](pointclick.html) | an adventure of three rooms: a dock, a tavern, a lighthouse; four puzzles, the nine verbs or a verb coin, an inventory, a riddle contest | click, story | #pointclick |
| PLATFORMER | [platformer.js](platformer.js), [platformer.html](platformer.html) | a side-scroller: a night approach to a castle in five zones, a sword, a dash, candles, a 2.5D view; Castlevania, Mega Man X, Klonoa | none | #platformer |
| METROIDVANIA | [metroidvania.js](metroidvania.js), [metroidvania.html](metroidvania.html) | a world of rooms: its map, two abilities that open its gates, a save room, two bosses | rooms | #metroidvania, #metroidvania/miniboss, #metroidvania/boss, #metroidvania/map |
| SHOOTER | [shooter.js](shooter.js), [shooter.html](shooter.html) | a vertical shoot-'em-up stage, then a horizontal one: waves, power-ups, bosses; 1943 and Raiden, then Gradius and R-Type | arcade | #shooter, #shooter/horizontal |
| ARCADE | [arcade.js](arcade.js), [arcade.html](arcade.html) | a cabinet of three: maze, formation, rocks | arcade, grid, gen | #arcade, #arcade/maze, #arcade/formation, #arcade/rocks |
| PINBALL | [pinball.js](pinball.js), [pinball.html](pinball.html) | one table: flippers, bumpers, a ramp, drop targets, a spinner, a kickback, a mission, multiball, tilt, a dot-matrix display | physics, arcade | #pinball |
| ARTILLERY | [artillery.js](artillery.js), [artillery.html](artillery.html) | two teams of three on an island every blast carves: turns, aim and power, wind, a rocket, a bouncing grenade, a cluster bomb, falls and the sea, a CPU that tries its shots in simulation | physics, terrain, grid | #artillery, #artillery/cpu |
| PUZZLE | [puzzle.js](puzzle.js), [puzzle.html](puzzle.html) | falling blocks and falling pairs that chain, versus with a second player or the CPU; Tetris, Puyo Puyo | grid | #puzzle |
| RHYTHM | [rhythm.js](rhythm.js), [rhythm.html](rhythm.html) | four lanes on the music clock: two songs, notes, jumps, holds, a rapping teacher to answer, a dancer and a crowd on the beat, grades, the audio offset | songs, rhythm | #rhythm, #rhythm/stepup, #rhythm/rapschool, #rhythm/calibrate |
| RPG | [rpg.js](rpg.js), [rpg.html](rpg.html) | a JRPG's journey: a town, a world map, a cave and its boss, the ATB battle, menus and save slots | story, rpg | #rpg, #rpg/battle |
| ROGUELIKE | [roguelike.js](roguelike.js), [roguelike.html](roguelike.html) | a turn-based crypt of ten generated floors: fields of view and fog, turns by speed, potions and scrolls; Rogue, Mystery Dungeon | grid, gen | #roguelike |
| TACTICS | [tactics.js](tactics.js), [tactics.html](tactics.html) | an isometric battle on a map of heights: charge time or phases, facing, arcs, areas, a scoring AI | grid, story | #tactics, #tactics/battle, #tactics/phases |
| RTS | [rts.js](rts.js), [rts.html](rts.html) | real-time strategy: workers, gold, a barracks and a stable, three kinds to fight, fog, an enemy camp that builds and attacks in waves | grid, strategy | #rts |
| SIM | [sim.js](sim.js), [sim.html](sim.html) | a theme park: paths, four rides and two shops, guests with needs and money, prices, a rating, day and night, time controls | grid, strategy | #sim |
| BRAWLER | [brawler.js](brawler.js), [brawler.html](brawler.html) | a beat-'em-up: a city block at dusk, combos, grabs and kicks, waves that lock the screen, a second player who drops in; Final Fight, Streets of Rage | none | #brawler |
| FIGHTING | [fighting.js](fighting.js), [fighting.html](fighting.html) | one on one: three fighters, versus, arcade, training | fight | #fighting, #fighting/versus, #fighting/arcade, #fighting/training |
| ANIMATION LAB | [animlab.js](animlab.js), [animlab.html](animlab.html) | every move, pose, skin and view of the character rigs | none | #animlab |
| KART | [kart.js](kart.js), [kart.html](kart.html) | Mode 7 karts: six on a circuit, three laps, items, two players in a split screen | mode7, drive | #kart, #kart/race, #kart/vs |
| ROAD | [road.js](road.js), [road.html](road.html) | a pseudo-3D coast road against the clock: curves, hills, a tunnel, traffic, checkpoints, a radio | road | #road, #road/drive |
| SPORTS | [sports.js](sports.js), [sports.html](sports.html) | two against two in a walled cage, up to four players: a ball that bounces and curls, passes, lobs, shots on a meter, formations, a match clock; Sensible Soccer and NBA Jam | none | #sports, #sports/match, #sports/vs |
| STEALTH | [stealth.js](stealth.js), [stealth.html](stealth.html) | third-person stealth and parkour: a rooftop district at dusk, guards with sight and suspicion, climbing, takedowns, an HTML HUD; Assassin's Creed, Metal Gear | none | #stealth |

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
| 3D ACTION | [3d-action.js](3d-action.js), [3d-action.html](3d-action.html) | a 3D arena: combos, dashes and waves, Zelda 64 and Diablo by way of the stress test | none | #action |
| 3D PLATFORMER | [3d-platformer.js](3d-platformer.js), [3d-platformer.html](3d-platformer.html) | a 3D course of islands, platforms and coins, Mario 64 and Spyro | none | #platformer |
| 3D SHOOTER | [3d-shooter.js](3d-shooter.js), [3d-shooter.html](3d-shooter.html) | an open world to move through and fight in, first or third person: Apex Legends without the multiplayer | none | #shooter |
| 3D HORROR | [3d-horror.js](3d-horror.js), [3d-horror.html](3d-horror.html) | a mansion's wings by flashlight under fixed cameras: a pistol that locks on, zombies, dogs, keys, a crank, an item box and saves, a boss; Resident Evil and Alone in the Dark | rpg | #horror |
| 3D RACING | [3d-racing.js](3d-racing.js), [3d-racing.html](3d-racing.html) | a kart circuit in a valley: banked bends, a hill, a jump, a dirt shortcut, five drivers, items, three laps, two players in a split screen; Mario Kart 64 and Crash Team Racing | drive | #racing, #racing/race, #racing/vs |
| 3D FLIGHT | [3d-flight.js](3d-flight.js), [3d-flight.html](3d-flight.html) | a stage on rails over the sea to a base, then a boss in free flight: lasers, charged lock-on shots, barrel rolls, rings and a wingman on the radio; Star Fox 64 and Panzer Dragoon | none | #flight |
| 3D CRAWLER | [3d-crawler.js](3d-crawler.js), [3d-crawler.html](3d-crawler.html) | a dungeon in first person, a cell at a time: a party of four with portraits, gates, a lever, plates, an automap, real time or turns; Eye of the Beholder, Dungeon Master and Wizardry | grid | #crawler, #crawler/warden |
