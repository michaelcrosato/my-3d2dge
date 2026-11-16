# The Mode 7 family: what plays where

The owner asked for kits that do the Mode 7 era properly (2026-11-14): Pilotwings, F-Zero, Space Harrier, OutRun, Mario
Kart and the games around them, grouped by the engine feature each needs. Six kits play them: SKY, BLASTER, ROAD, ZERO,
KART and SPECIAL (`dist/kits/my-3d2dge-<kit>.html`). Every game on the list below has a stage or a mode to play, a deep
link to it, and a check that plays it (`tools/kits-test.mjs`: each kit's bot plays its stages by their autopilots;
`tools/phone-test.mjs`: the touch controls; `tools/contract-test.mjs`: the engine's parts). Where a game is played by a
mode it shares with others, the line says so, and what of the game is not there.

## Mode 7 flat-plane games (SNES, GBA)

| Game | Kit: mode | Deep link | What it needs, and where it is | Checked by |
| --- | --- | --- | --- | --- |
| Final Fantasy VI (airship), Secret of Mana (Flammie), Terranigma | SKY: VOYAGE | `#sky/voyage` | free flight, altitude and pitch, a world that curves away (`m7` `curve`, `wrap`) | kits: the airship to three beacons and home |
| Pilotwings | SKY: PLANE, DIVE, ROCKET BELT | `#sky/plane`, `#sky/dive`, `#sky/belt` | a light plane through rings, a skydive, a jet pack through low rings onto a pad on its fuel; the camera rolled and pitched (`cam.roll`, `pitch`); Pilotwings' hang glider and helicopter stage are not there | kits: ten rings and a landing; three hoops and the target; five rings and the pad; phone: the plane's controls, the dive's chute opened only in its band |
| Super Star Wars (the speeders) | BLASTER: SPEEDER | `#blaster/speeder` | a speeder turned freely, low over a Mode 7 desert: crawlers to find by a radar and bring down, skimmers that hunt you | kits: the four crawlers brought down |
| HyperZone | BLASTER: ZONE | `#blaster/zone` | a rail course ahead over a neon Mode 7 grid, pods coming at you, mines to steer round, the camera banking into the bends | kits: the course to its gate |
| Yoshi's Safari, Battle Clash | BLASTER: SAFARI | `#blaster/safari` | first person on rails, an aiming cursor (`m7.pick(sx, sy, boxes)`, replay-safe) | kits: the walker's fall; phone: a tap aims and fires, once |
| Street Racer | ZERO: VS | `#zero/vs` | four players in a split screen (`game.splitScreen(4)`); its fists are ROAD's RASH | kits: four viewports racing |
| Mario Kart: Super Circuit, F-Zero: Maximum Velocity | KART, ZERO at GBA size | `#kart/gba`, `#zero/gba` | 240 x 160 exactly, letterboxed | kits: ZERO's is 240 x 160; a route check opens both |
| Contra III (top-down stages) | SPECIAL: TURN | `#special/turn` | the floor seen from straight above, turned with the hero (`pitch: 90`) | kits: every nest; phone: the stick turns the fort |
| Super Castlevania IV (the turning room) | SPECIAL: ROOM | `#special/room` | a side-on room drawn as a Mode 7 floor under the same straight-down camera, turned a quarter at a time on its own; gravity down the screen, so a floor becomes a wall | kits: the three gems and the door |
| Super Mario Kart | KART | `#kart/race`, `#kart/vs` | Mode 7 karts, drifts, items, two players | kits: six karts, three laps, a split screen |
| F-Zero | ZERO: CITY, GRAND PRIX | `#zero/city`, `#zero/gp` | energy, barriers, a pit, dash plates, machines as models | kits: six machines finish the Grand Prix |

## Pseudo-3D road games

| Game | Kit: mode | Deep link | What it needs, and where it is | Checked by |
| --- | --- | --- | --- | --- |
| OutRun, Rad Racer | ROAD: COAST RUN (car) | `#road/car` | the road module's road, curves and hills, traffic, a clock and checkpoints, the forks | kits: the coast run to its goal |
| Pole Position | ROAD: CIRCUIT | `#road/circuit` | a qualifying lap alone against the clock that sets your grid slot, then three laps of a closed track (the road loops) against a pack of seven cars, lap times, a place | kits: the qualifying lap and its slot, three laps run, a best lap kept |
| Hang-On, Super Hang-On | ROAD: COAST RUN (bike) | `#road/bike` | a motorbike that leans into the bends | kits: the bike to its first fork |
| Top Gear, Lotus Turbo Challenge | ROAD: DUEL (and CIRCUIT alone) | `#road/duel`, `#road/circuit` | two players race the circuit's three laps against its pack, the screen split (on one keyboard: W and the up arrow each one's gas); Top Gear's fuel and pit stops are not there | kits: the duel's three laps with the pack of seven, two viewports, each half of the keyboard |
| Chase H.Q. | ROAD: CHASE | `#road/chase` | a target to catch and ram; the road forks (`split`, `branch`), the radio says which way it went, and the other road lets it pull far ahead | kits: the chase through its fork to the arrest |
| Road Rash | ROAD: RASH | `#road/rash` | riders who fight side to side | kits: the finish, riders punched down |
| Power Drift | ZERO: SKY RIBBON | `#zero/sky` | a track raised on pillars that climbs, banks and crosses itself (`E.Race({ heights })`, `m7.quad` layers); a kicker past the overpass throws a machine at speed into the air a moment (its body falls under gravity, its shadow on the track), Power Drift's jump | kits: six machines finish the ribbon, jumping off its kicker |

## Sprite-scaling shooters and flight

| Game | Kit: mode | Deep link | What it needs, and where it is | Checked by |
| --- | --- | --- | --- | --- |
| After Burner, Thunder Blade, Galaxy Force | BLASTER: BURNER | `#blaster/burner` | the horizon rolled with the craft, lock-on missiles; the stage opens overhead and the camera swings down behind the jet (Thunder Blade's opening); Thunder Blade's helicopter and city streets are not there | kits: the bomber's fall; phone: the stick banks the jet |
| Space Harrier | BLASTER: HARRIER | `#blaster/harrier` | a hero anywhere on the screen (the camera follows to keep it there), firing into it | kits: the serpent's fall |
| Panorama Cotton | BLASTER: HARRIER, and ROAD: STRIKER | `#blaster/harrier`, `#road/striker` | a flyer anywhere on the screen firing into it (HARRIER, on a flat floor), and a flyer over a road that winds, rises and falls (STRIKER, on the road module's hills); the two are not one game here | kits: the serpent's fall; the striker through the city |
| Night Striker | ROAD: STRIKER | `#road/striker` | a car that flies over the road, foes in the air and on it | kits: through the city, ten or more shot down |

## Bonus and special stages

| Game | Kit: mode | Deep link | What it needs, and where it is | Checked by |
| --- | --- | --- | --- | --- |
| Sonic 2's special stages | SPECIAL: TUBE | `#special/tube` | a half-pipe of `m7.quad` strips, the camera banked with the runner up its walls, gates across it | kits: all three gates |
| Sonic 3's Blue Sphere | SPECIAL: PLANET | `#special/planet` | a checkered planet curving away on every side | kits: every sphere |
| Mario Kart's battle mode | SPECIAL: ARENA | `#special/arena` | karts with balloons, bouncing shells, one to four players | kits: a battle to its end, two players split; phone: it drives by itself, the stick pulled down backs up |
| F-Zero's attract mode | ZERO's title | `#zero` (left alone) | a race by itself after 25 seconds untouched, a key or a tap back | kits: the title races by itself and a tap ends it; phone: the same |

## Modern games in the same style

| Game | Kit: mode | Deep link | What it needs, and where it is | Checked by |
| --- | --- | --- | --- | --- |
| Slipstream | ROAD: the rewind | `#road/car` (hold R) | time run back (`E.Rewind`) | kits: a rewind |
| Horizon Chase Turbo | ROAD at today's resolution | `#road/hd` | the coast run at 960 x 540 at the least (more on a larger window: it grows with it) | a route check opens it |
| Victory Heat Rally | ROAD: the drift | `#road/car` (brake while steering hard at speed) | a drift through the bend that charges a boost | kits: a drift let go into a boost |

## The engine features the list asked for

| Feature | Where | Used by |
| --- | --- | --- |
| Camera roll, the horizon tilting | `m7.cam.roll` (the mode7 module) | BLASTER's BURNER, ZONE and SPEEDER, SKY, SPECIAL's TUBE |
| Free altitude and pitch | `m7.cam.h`, `pitch` (up to 90) | SKY, BLASTER, SPECIAL's TURN |
| A curved horizon, a globe | `E.Mode7({ curve, wrap })` | SKY's VOYAGE, SPECIAL's PLANET |
| Branching and overlapping roads | `road.add(n, { split, branch })`; `E.Race({ heights })` with `m7.quad` layers | ROAD's forks; ZERO's SKY RIBBON |
| A closed circuit, laps | the road loops at `road.length`; `E.Race` (the drive module) for Mode 7 tracks | ROAD's CIRCUIT and DUEL; KART, ZERO |
| First-person and rail cameras | a camera set each step from a point along an `E.Path` (`path.at(s)`) | BLASTER's SAFARI and ZONE |
| Flat rotation with no perspective | `pitch: 90` | SPECIAL's TURN and ROOM |
| Split screen for 2 to 4 | `game.splitScreen(n)`, `r.viewport` (Mode 7 and the road); two on one keyboard (`Input.halfKeys`) | KART, ZERO, SPECIAL's ARENA, ROAD's DUEL |
| An aiming cursor | `m7.pick(sx, sy, boxes)` | BLASTER's SAFARI |
| Rewind | `E.Rewind` (the rewind module) | ROAD |
