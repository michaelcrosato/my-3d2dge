# The genre kits (v0.85.1)

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

**3D:** the 3D engine (three.js and Rapier) and its kits, the playbook's 3D rows, are not in this package. They are on the
site (my-3d2dge.vercel.app/3d, /kits/3d-<genre>) and in the repository (github.com/michaelcrosato/my-3d2dge:
`engine/my-3d2dge-3d.js`, its header the 3D manual; `src/starter3d/`). Here, a 3D game is built on the 2D engine's views,
a world in x, y and z drawn from any angle (`API.md`, Coordinates).
