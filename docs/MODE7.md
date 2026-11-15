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
| Pilotwings | SKY: PLANE, DIVE | `#sky/plane`, `#sky/dive` | a light plane through rings, a skydive; the camera rolled and pitched (`cam.roll`, `pitch`) | kits: ten rings and a landing; three hoops and the target; phone |
| Super Star Wars (speeders), HyperZone | BLASTER: ZONE (and HARRIER) | `#blaster/zone` | a rail course ahead over a Mode 7 floor, foes coming at you, the camera banking into the bends | kits: the course to its gate |
| Yoshi's Safari, Battle Clash | BLASTER: SAFARI | `#blaster/safari` | first person on rails, an aiming cursor (`m7.pick(sx, sy, boxes)`, replay-safe) | kits: the walker's fall; phone: a tap aims and fires |
| Street Racer | ZERO: VS | `#zero/vs` | four players in a split screen (`game.splitScreen(4)`); its fists are ROAD's RASH | kits: four viewports racing |
| Mario Kart: Super Circuit, F-Zero: Maximum Velocity | KART, ZERO at GBA size | `#kart/gba`, `#zero/gba` | 240 x 160 exactly, letterboxed | kits: ZERO's is 240 x 160; a route check opens both |
| Super Castlevania IV, Contra III (top-down stages) | SPECIAL: TURN | `#special/turn` | the floor seen from straight above, turned with the hero (`pitch: 90`); the room turns as you turn, not on its own as Castlevania IV's does | kits: every nest; phone: the stick turns the fort |
| Super Mario Kart | KART | `#kart/race`, `#kart/vs` | Mode 7 karts, drifts, items, two players | kits: six karts, three laps, a split screen |
| F-Zero | ZERO: CITY, GRAND PRIX | `#zero/city`, `#zero/gp` | energy, barriers, a pit, dash plates, machines as models | kits: six machines finish the Grand Prix |

## Pseudo-3D road games

| Game | Kit: mode | Deep link | What it needs, and where it is | Checked by |
| --- | --- | --- | --- | --- |
| OutRun, Pole Position, Rad Racer | ROAD: COAST RUN (car) | `#road/car` | the road module's road, curves and hills, traffic, a clock and checkpoints; Pole Position's lap circuit and qualifying are not there | kits: the coast run to its goal |
| Hang-On, Super Hang-On | ROAD: COAST RUN (bike) | `#road/bike` | a motorbike that leans into the bends | kits: the bike to its first fork |
| Top Gear, Lotus Turbo Challenge | ROAD: DUEL | `#road/duel` | two players on one road, the screen split | kits: a duel to its line, two viewports |
| Chase H.Q. | ROAD: CHASE, and the coast run's forks | `#road/chase` | forks (`split`, `branch`), a target to catch and ram | kits: the arrest; two forks taken |
| Road Rash | ROAD: RASH | `#road/rash` | riders who fight side to side | kits: the finish, riders punched down |
| Power Drift | ZERO: SKY RIBBON | `#zero/sky` | a track raised on pillars that climbs, banks and crosses itself (`E.Race({ heights })`, `m7.quad` layers) | kits: six machines finish the ribbon |

## Sprite-scaling shooters and flight

| Game | Kit: mode | Deep link | What it needs, and where it is | Checked by |
| --- | --- | --- | --- | --- |
| After Burner, Thunder Blade, Galaxy Force | BLASTER: BURNER | `#blaster/burner` | the horizon rolled with the craft, lock-on missiles; Thunder Blade's top-down stretches are not there | kits: the bomber's fall; phone: the stick banks the jet |
| Space Harrier, Panorama Cotton | BLASTER: HARRIER | `#blaster/harrier` | a hero anywhere on the screen, firing into it; Cotton's rolling hills are not drawn (the floor is flat) | kits: the serpent's fall |
| Night Striker | ROAD: STRIKER | `#road/striker` | a car that flies over the road, foes in the air and on it | kits: through the city, ten or more shot down |

## Bonus and special stages

| Game | Kit: mode | Deep link | What it needs, and where it is | Checked by |
| --- | --- | --- | --- | --- |
| Sonic 2's special stages | SPECIAL: TUBE | `#special/tube` | a half-pipe of `m7.quad` strips, the camera rolled with the runner | kits: all three gates |
| Sonic 3's Blue Sphere | SPECIAL: PLANET | `#special/planet` | a checkered planet curving away on every side | kits: every sphere |
| Mario Kart's battle mode | SPECIAL: ARENA | `#special/arena` | karts with balloons, bouncing shells, one to four players | kits: a battle to its end |
| F-Zero's attract mode | ZERO's title | `#zero` (left alone) | a race by itself after 25 seconds untouched, any key back | kits: the title races by itself |

## Modern games in the same style

| Game | Kit: mode | Deep link | What it needs, and where it is | Checked by |
| --- | --- | --- | --- | --- |
| Slipstream | ROAD: the rewind | `#road/car` (hold R) | time run back (`E.Rewind`) | kits: a rewind |
| Horizon Chase Turbo | ROAD at today's resolution | `#road/hd` | the coast run at 960 x 540 | a route check opens it |
| Victory Heat Rally | ROAD: the drift | `#road/car` (brake while steering hard at speed) | a drift through the bend that charges a boost | kits: a drift let go into a boost |

## The engine features the list asked for

| Feature | Where | Used by |
| --- | --- | --- |
| Camera roll, the horizon tilting | `m7.cam.roll` (the mode7 module) | BLASTER's BURNER and ZONE, SKY, SPECIAL's TUBE |
| Free altitude and pitch | `m7.cam.h`, `pitch` (up to 90) | SKY, BLASTER, SPECIAL's TURN |
| A curved horizon, a globe | `E.Mode7({ curve, wrap })` | SKY's VOYAGE, SPECIAL's PLANET |
| Branching and overlapping roads | `road.add(n, { split, branch })`; `E.Race({ heights })` with `m7.quad` layers | ROAD's forks; ZERO's SKY RIBBON |
| First-person and rail cameras | `m7.chase` with back 0, a camera along an `E.Path` | BLASTER's SAFARI and ZONE |
| Flat rotation with no perspective | `pitch: 90` | SPECIAL's TURN |
| Split screen for 2 to 4 | `game.splitScreen(n)`, `r.viewport` (Mode 7 and the road) | KART, ZERO, SPECIAL's ARENA, ROAD's DUEL |
| An aiming cursor | `m7.pick(sx, sy, boxes)` | BLASTER's SAFARI |
| Rewind | `E.Rewind` (the rewind module) | ROAD |
