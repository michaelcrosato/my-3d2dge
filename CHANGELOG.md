# Changelog

One version number covers the engine, its agent edition, the docs and the games (semantic versioning while the major number is 0: the minor number for features, the patch for fixes). Every change merged to `main` bumps it and adds its lines here (except a change confined to a prototype, a Temporary lab: `DOCTRINE.md`), sorted under the parts it touched: **Rendering**, **Animation**, **Art**, **Mocap**, **Engine** (the rest of it), **Emberdeep**, **Characters**, **Tools**, **Docs**.

- `node tools/version.mjs 0.8.0` writes a new number everywhere it lives and opens a section here; `npm test` fails while any place disagrees or this file has no section for it.
- Each deployed page carries its build, the commit it was deployed from: `My3D2dge.build` and `My3D2dge.versionLabel()` (`v0.7.0 · a1b2c3d 2026-10-07`), shown on the Emberdeep title, in its Settings (Keys & help), on the Labs page and in the Mocap Lab. Copies built from the repo say `dev-build`.

## 0.81.4 (2026-10-29)

- **Docs**: `docs/HANDOFF-GENRES.md` back for one version with its last row, M16's (v0.81.2 `5076061`, #190; its full test's audio failure fixed forward in v0.81.3 `89f25cb`, #191), how the M13 and M14 rows' full-test failures ended, M15 as not started and a closing status; v0.81.5 deletes it again (D68).

## 0.81.3 (2026-10-29)

The full test's audio failure fixed forward: the music held to the game's clock through a slip.

- **Engine**: the music clock meets the sound at once when it is past 10 ms off two frames running (a slip of the sound device, a long frame whose time past 50 ms the game's clock gave up, a pause), where it smoothed anything under 100 ms: a slip of 20 ms or more took about 9 frames to meet, past the 5 the audio suite allows. One frame alone past 10 ms is held, not met: the device's timestamp can be read out of step for a frame. In five recorded runs the sound sits closer to the clock (the median about 0.1 ms, from about 1.5) and is moved half as often or less.
- **Tools**: the audio suite's clock check measures how fast the sound is met again, whatever moved it (the device's slip, a stall of the page, the device's timestamp misread): past 10 ms only in stretches of at most 6 frames, in under 1% of the frames; it skipped only the 5 frames after the device's slips, and failed in a slow container on stalls and misreads (D67).

## 0.81.2 (2026-10-29)

The genre plan folded in: its Milestone 16, the last.

- **Docs**: `docs/KITS.md` (new): how the engine grows by genre, the genre plan's design rules kept: what converts well and what is out of scope, which system goes where (the core, a module, the 3D engine), modules, the kit diet and the budgets, what every new kit has, the rules of every addition, the traps.
- **Docs**: `docs/HANDOFF-REVIEW.md` (new): what the plan left for the owner: the To check cards and the Vehicle Lab, the budgets to trim (a 3D diet among the ways), the benchmark's era briefs, the optional M15 (a first-person dungeon and sports), a proposed fix to `r.pick`.
- **Docs**: README's genre table has a kit or a recipe on every row; `AI_GUIDE.md` gains recipes for survival horror, 3D kart racing and rail shooters (the new 3D kits) and for each genre with no kit: twin-stick shooters, Bomberman, Gauntlet, Frogger, Sokoban, Sonic without the loops, the cinematic platformer, light guns, the corridor shooter on the 3D engine; the API card's playbook a row for them.
- **Docs**: `docs/HANDOFF-GENRES.md` deleted; every reference to it repointed (the tools' comments, the modules' README, the guide, the co-op plan). Decisions: D65 (the plan folded in), D66 (the era briefs' benchmark runs skipped: no answer in fifteen minutes).
- **Tools**: the benchmark's era briefs (`tools/agent-bench/briefs/`): Pac-Man, Street Fighter II, Super Mario Kart, Final Fantasy Tactics, Resident Evil; their runs wait on the owner (D66).

## 0.81.1 (2026-10-29)

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M14 row (14a `3a9527a`, #187; 14b `786f57c`, #188): what each brought, the sizes at v0.81.0, the proofs on both backends, the bots, `test:changed` and the full `npm test` on `main` after each merge, and what is left (the owner's RACING and FLIGHT checks, the Vehicle Lab, a 3D diet); the status line (M0 to M14 done, M16 next) and "Picking it up".

## 0.81.0 (2026-10-29)

3D vehicles and flight, the kits: the genre plan's Milestone 14b, 3D RACING and 3D FLIGHT.

- **Engine**: the 3D RACING kit (`#racing`, `src/starter3d/50-racing.js`, the drive module): a kart circuit in a valley (banked bends, a hill whose crest throws you, a jump over a stream, boost pads, a dirt shortcut through the infield's hairpin, the walls opened where it leaves and rejoins), rows of item boxes (a boost, a shell, a peel), you and five drivers with their rigs seated, three laps, a drift that charges a blue then an orange boost, a kart off the course set back on the road (Lakitu), the map and the race's HUD; VS: two players in a split screen (`#racing/vs`); the title races the drivers by themselves.
- **Engine**: the 3D FLIGHT kit (`#flight`, `src/starter3d/60-flight.js`): a stage on rails over the sea between rock islands to the enemy's base (fighters in waves on the rail's frame, rings that mend the shield, turrets and masts, a fighter on your wingman's tail), then a flagship in free flight in a bay (four engines, then its core); twin lasers, a charged shot that locks on, barrel rolls that turn shots aside, boost and brake on a meter, KESTREL on the radio; Invert flight in Settings; touch FIRE, ROLL, BOOST, BRAKE.
- **Engine**: the 3D starter's deep links take a part (`#racing/vs`: the slice's `enter` gets `{ part }`).
- **Tools**: `kits-test`'s 3D bots: RACING (six karts three laps, yours over the shortcut each lap; then two players split) and FLIGHT (the stage to the flagship's end). `kit3d-test` plays each new kit (a race's gas, drift and item; the ship's fire, roll and boost) on both backends and on a phone (`S.play`: where a slice with its own menu starts playing).
- **Docs**: README (six 3D slices, genre coverage: 3D kart racing in the racing row, rail shooters and flight), the API card's playbook (3D kart racing and rail shooter rows), `docs/ENGINE-3D.md` (the two kits), the Labs page (the two kits, and To check cards for them), the plan's M14 as built. Decision: D64 (the two kits' budgets).

## 0.80.0 (2026-10-29)

3D vehicles and flight, the 3D engine's half: the genre plan's Milestone 14a, vehicles, tracks, split screen and flight (its kits, 3D RACING and 3D FLIGHT, come next).

- **Engine**: `world.vehicle({ kind: 'kart' | 'car' | 'hover' })`: a ball Rapier rolls (walls, bumps, ramps, jumps, falls) steered by the drive module's arcade handling (E.Car's: speed along the heading, a slide that grip takes away, a kart's hop into a drift that charges a blue then an orange boost, a car's handbrake, a hovercraft that rides a cushion and slides); the ground's surface under it (a track's road, boost pads, the grass beside it, the level's ground) slows or boosts it; `v.boost(sec, power)`, `v.spinOut(sec)`; `speed`, `slide`, `drifting`, `charge`, `onGround`, `airT`, `bumped`; driven by an intent or an input (D62: why a rolling body, not Rapier's ray-cast vehicle).
- **Engine**: `world.track({ path, width, bank, walls, kerb, pads, gaps, off, surface })`: a road built along an `E.Path` with heights (hills, a hump to jump), banked at its bends about its low edge (the outside rises; the banking eased in and out over about 40 units either way), with striped kerbs, a dashed line and low walls whose outer face runs down to the ground, solid in Rapier (its surface a triangle mesh, its walls boxes); `gaps` open the walls where a shortcut leaves and rejoins, `surface` gives a track its own tag (a dirt shortcut's); `track.at(d)`, `track.where(x, y)` (along, across, the road's height), `track.surface(x, y)`.
- **Engine**: E.Race (the drive module) races the 3D engine's vehicles as it races E.Cars: `race.update(dt, null)`, Rapier bumping them (the module leaves them out of `E.Car.collide`).
- **Engine**: `world.flyer(o)`: arcade flight, free within bounds (it turns back at their edge, keeps above the ground) or on rails (Star Fox: the rail's point rides along a path, the ship moves about a window across it); yaw, pitch and a bank into turns, boost and brake, barrel rolls (`f.rolling`: turn shots aside with it) and loops; `f.seek(list, { cone, range })` finds what a charged shot locks on (in the cone, in range, in sight); `f.at()` where to draw it between steps.
- **Rendering**: the camera's `'behind'` mode: behind the target's heading and pitch, swinging after it (`camera.behind`: dist, height, ahead, lag, fov, the share of a flyer's roll it takes), in front of walls: a kart's camera, a ship's.
- **Rendering**: split screen in 3D: with the 2D engine's `game.splitScreen(n)`, viewport i draws through `world.cameras[i]` (`world.addCamera(o)` adds one), each in its own part of the 3D canvas; `world.project` answers in the viewport drawn last; no filter while split.
- **Rendering**: `world.pen.at(x, y, z, yaw, size, pitch, roll)` tips the pen's frame (a car on a slope, a ship in a bank); vehicles are drawn with it, by code (a kart, a car, a hovercraft; the front wheels turn with the steering; the driver seated).
- **Tools**: `tools/kit3d-test.mjs` checks vehicles, tracks, flight and split screen on a page of their own, on WebGL 2 and WebGPU (twice the same, and the same on each): top speed, a boost pad, a wall, the grass, a drift's boost, a hovercraft's cushion, a banked bend, E.Race racing two AI vehicles a lap over a hump, rails, a barrel roll, bounds, `seek`, two viewports.
- **Docs**: the 3D engine's manual gains vehicles, tracks, flight and split screen (6,807 of its 8,000 tokens, D60); `docs/ENGINE-3D.md`; the drive module's manual says how it races 3D vehicles; the plan's M14a as built. Decisions: D62 (the vehicles a rolling body, not Rapier's ray-cast vehicle), D63 (the 3D kits' budgets).
- **Tools**: the Vehicle Lab (Temporary, on the Labs page): the same track driven two ways, Rapier's ray-cast vehicle beside `world.vehicle`, to judge D62 by feel.

## 0.79.1 (2026-10-29)

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M13 row (`a4d00be`, #185): what it brought, the sizes at v0.79.0, the proofs, the camera's contracts, the horror bot, `test:changed`, the full `npm test` on `main` after the merge, and what is left (the owner's HORROR and lock-on checks on the Labs page); the status line (M0 to M13 done, M14 next) and "Picking it up".
- **Tools**: the phone test's army case waits a moment after holding the battle still before it picks the unit to tap, so every body is redrawn as it now stands (an image kept from before the freeze, mid-swing, could be wider, and failed it once more in the full `npm test` on `main`).

## 0.79.0 (2026-10-28)

3D action and survival horror: the genre plan's Milestone 13, camera zones, lock-on, tank controls, doors between rooms and a flashlight in the 3D engine, the 3D HORROR kit, and lock-on in 3D ACTION.

- **Rendering**: camera zones (the 3D engine): `camera.zones` and the `'zones'` mode give each region of a level its own camera (fixed, one that turns after the target, one that slides on a rail level with it); the cut waits until the target is `camera.margin` (8) units into the next region (hysteresis: a border never flicks back and forth); `camera.zone`, `camera.cuts`; the frames after a cut start at the new pose (no slide from the old one); a zone's camera is framed for 4:3, and a taller screen (a phone held upright) widens its lens to see as much across.
- **Rendering**: lock-on (Zelda's targeting): `camera.lock(hero, mobs | target, { range })` picks the one in sight (alive, in range, a clear line) nearest where the hero faces, `camera.cycle(mobs, dir)` the next round the hero, `camera.unlock()`; the chase and first cameras swing behind the hero to frame both, the view camera frames both, a reticle marks the target (`camera.reticle`); it lets go when the target dies, leaves the world or goes past 1.25 times the range. Whom it picks reads only the world, so a replay picks the same.
- **Rendering**: `world.flashlight(actor, { color, reach, angle, power, flicker })` (a world made with `{ spots: n }`): a spot light at the actor's hand along its facing every frame, drawn part way between steps, casting a shadow; `flicker` (0..1) a failing bulb's stutter, on `world.light` too.
- **Engine**: across a cut, `camera.ground(move)` keeps the old camera's way while the stick is held the same way (within 45 degrees), until it is let go; locked on in the chase or first camera, it strafes round the target.
- **Engine**: `camera.steer(actor, move, dt, out, { tank })`: camera-relative (`ground`), or tank controls (up walks forward along the actor's facing, down backs off at half speed, left and right turn it), by the player's setting `E.World3D.CONTROLS` (Tank controls, `game.settings.tank3d`).
- **Engine**: doors: a door thing swings on hinges (`swing: true`, one leaf or two, opening away from who passes) and takes a key (`locked: 'iron'`); `world.unlock(door, inv)` ('open', 'unlocked': the key taken from an E.RPG inventory, 'locked'); `world.reach(actor, range, kinds)`: the thing in front within reach (a door's whole width counts), what a check button acts on; `world.through(door, actor, { then })`: the door opening between rooms (Resident Evil's): the camera cuts to the door from the actor's side, it swings open as the camera goes through, the actor comes out beyond it, the door shuts and the camera cuts back, while the rest of the world holds still (`world.passing`).
- **Engine**: new things: `trunk` (an item box) and `typewriter` (a save point, with the 2D engine's `game.saves`).
- **Engine**: `E.World3D.INPUT` gains `lock` (Q, Tab, a pad's left bumper).
- **Engine**: fixed: the 3D flow field took a tile whose distance a float32 rounded down for a stale entry and never spread from it, so whole rooms behind a diagonal step read as unreachable and monsters walked straight at walls; every tile is reached now (the ACTION kit's monsters find their way round the dais better).
- **Engine**: fixed: `world.reset()` starts the camera afresh (its pose, zone, cuts, lock and a held stick), so a second run of a proof from a reset gives the same hash as the first.
- **Engine**: the 3D HORROR kit (`#horror`, `src/starter3d/40-horror.js`, family ACTION ADVENTURE, the rpg module): a mansion's two wings and seven rooms by flashlight under fixed cameras (the foyer with a typewriter and an item box, two halls, a kitchen, a dining room, a library, a gallery); a pistol held to aim (it locks on the nearest; up and down aim high, a head, and low, a dog; left and right pick another) and a knife; zombies that shamble and grab (tap to shake free), dogs drawn with the pen that run and leap, and something in the gallery that swings and charges; doors between rooms with an autosave at each, two keys for two locks, a crank for the grille over the second key, herbs that mix in a six-slot inventory, an item box, saves at the typewriter; tank or modern controls; fog; its own three songs (the halls, the foyer, the gallery's fight). `HORROR.bot()` plays it from the foyer through every room to the boss, beats it and escapes; its save made on the way loads back.
- **Engine**: 3D ACTION: lock-on (Q, LOCK on a phone): the nearest monster in sight, Q again the next, none other lets go; the hero faces and swings at the target; the knight too. The proof locks on and on to the next.
- **Tools**: `kit3d-test`: the camera's contracts on a page of their own at 60, 90, 120 and 144 Hz (lock picks the one in sight nearest the facing and never one behind a wall, cycle goes round and skips it, the chase camera frames both, a strafe is square to the line, the lock lets go of a target that dies, leaves or goes out of range; a zone's cut waits until the target is margin units in and not back on the border, the stick across a cut keeps its way until let go; tank steering; the door reached, unlocked and passed while nothing else moves); every 3D kit on the emulated phone; the horror kit's play keys. `kits-test`: 3D slices' bots (`BOTS3D`: the horror wing). The phone test's army case taps a unit alone under the finger with 2 pixels to spare, the battle holding still meanwhile (`timeScale` 0: the steps still read input): a body drawn from its kept image (`every`) picks 1 pixel wider each side than when it is redrawn, so a neighbour's edge on the tap point came and went, and failed the case now and then, on `main` too.
- **Docs**: the 3D engine's manual (camera zones, lock-on, tank steering, doors, the flashlight, the new things; 6,100 of its 8,000 tokens: D60), `docs/ENGINE-3D.md`, README (the 3D kits, genre coverage: survival horror), the API card's playbook (3D action and survival horror rows), the Labs page (the kit, and To check cards for it and for 3D ACTION's lock-on), the plan's M13 as built. Decisions: D60 (the 3D manual's budget 8,000), D61 (the horror kit's budget 256,000).

## 0.78.1 (2026-10-28)

The genre plan's Milestone 12, closed, and the plan made ready for the next session to pick up.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M12 row (`364647b`, #183): what it brought, the sizes at v0.78.0, the bots, the audio suite's three minutes, `test:changed`, the full `npm test` on `main` after the merge, and what is left (the owner's RHYTHM and STEALTH music checks on the Labs page).
- **Docs**: `docs/HANDOFF-GENRES.md`: the status line (M0 to M12 done, M13 next), and "Picking it up" after section 9's table: where the work stands, the loop every milestone has run, the budgets suspended until the owner's review (D52, D55, D57, D59), the room left, the owner's checks, the calls to escalate.

## 0.78.0 (2026-10-28)

Music and rhythm: the genre plan's Milestone 12, the music clock, the songs and rhythm modules, the RHYTHM kit and the STEALTH slice's music in layers. Every other kit plays as before (filmed beside v0.77.1: the same pixels).

- **Engine**: the music clock (the full engine's audio): a song starts at the game's time and where it is is game time, headless too (`audio.pos`: t, step, beat, bar, its loop, bpm, layers; `music(song, { sync: true })` pauses with the game, else it plays on through a pause); `audio.at(step, fn)` and `audio.onBeat(fn)` on the update step; the sound schedules its notes through an anchor from the clock and, each frame, reads what is heard against the game's clock and moves its notes to meet it past 4 ms (`audio.drift`, `audio.anchors`).
- **Engine**: dynamic music: `audio.tempo(bpm)` (hurry up), `audio.layer(track, vol, fade)` (a track's `name`; `on: false` starts one silent), a crossfade (`music(song, { fade })`), `audio.sting(song, { at: 'beat' | 'bar', duck })` over the music, `sfx(voice, { step })` on a step of the music, a song's `len` (its tracks loop within it).
- **Engine**: the audio offset: `settings.audioOffset` (Settings, Sound: -100 to 300 ms, its Calibrate screen: clicks on the beat, a Tap on each, the median kept) and `audio.calibrate()` for a game's own screen.
- **Engine**: the songs module (`engine/modules/songs.js`, after either edition): `E.Songbook`, 29 songs and jingles tagged by mood (title, field, town, shop, calm, dungeon, battle, boss, race, puzzle, space, horror, stealth, chase, dance, stage clear, game over, one-up, level up, fanfare): the kits' best gathered, and new ones (a shop, horror, the layered `shadows`, a chase, two dance songs, five jingles); `get(id)`, `find(mood)`.
- **Engine**: the rhythm module (`engine/modules/rhythm.js`, after the full engine only): `E.Rhythm`: charts of lane strings on a song's steps (parts in an order, or a track's own notes), judgments in ms of the music clock (perfect, great, good, miss), combo, score, a life gauge, grades, holds, calls (PaRappa's call and response), `ahead()` and `draw` (a highway in any direction, arrows).
- **Engine**: the RHYTHM kit (`#rhythm`, `#rhythm/stepup`, `#rhythm/rapschool`, `#rhythm/calibrate`, `src/starter/37-rhythm.js`, family MUSIC, its modules songs and rhythm): STEP UP!, two songs (STEP UP: notes, jumps and holds; RAP SCHOOL: Master Beat raps a line, you answer it), four lanes (D F J K, the arrows, a pad, a quarter of a phone's screen each), a dancer and a crowd on the beat, the score, combo, life and grade, its own calibration screen.
- **Engine**: STEALTH: its music is one song in layers: it sneaks on three tracks, and a guard's alert brings in the chase's drums and saw, faded out again after (no cut to another song).
- **Tools**: the audio suite (`tools/audio-test.mjs`, in `npm test`): three minutes of music in Chromium within 10 ms of the game's clock (but for the 5 frames after each slip of the sound device itself, each met again within them), a synced song paused with the game, the calibration finding an offset, a layer, a stinger, a crossfade and a tempo change. The contract test: the music clock's beats, an `at`, a pause, a tempo change and a layer on the same steps headless and in the browser at 60, 90, 120 and 144 Hz. `kits-test`'s rhythm bot (both songs perfect, then 70 ms late, twice the same); the phone test's case 23.
- **Docs**: the API card (the music clock, layers, stingers, the offset; the songs and rhythm modules; the playbook's rhythm row), `AI_GUIDE.md` (the music clock, dynamic music, the rhythm recipe), README (the slices, genre coverage, sizes at v0.78.0), the Labs page (the kit, and To check cards for it and for STEALTH's music), the plan's M12 as built.

## 0.77.1 (2026-10-28)

The genre plan's Milestone 11, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M11 row with its two commits (`760eeff`, #180; `d1c1ee9`, #181), what each brought, the sizes at v0.77.0, the bots, `test:changed` for both, the full `npm test` on `main` after each merge, and what is left (the owner's PINBALL and ARTILLERY checks on the Labs page).

## 0.77.0 (2026-10-28)

Physics toys, the kits: the genre plan's Milestone 11, its second half (11b): the PINBALL and ARTILLERY kits, and touch zones in the core. Every other kit plays as before (filmed beside v0.76.0: the same pixels).

- **Engine**: the PINBALL kit (`#pinball`, `src/starter/33-pinball.js`, family ARCADE, its modules physics and arcade): NEBULA RUN, one table in a steep view of its own that scrolls as the ball climbs (a phone held upright shows it whole, with a backglass and a coin door). Flippers, three bumpers, two slingshots, a ramp that rises over the table (a layer of its own), three drop targets, a spinner, three top lanes, a kickback, a saucer, a plunger lane with a one-way gate. The mission: the targets light the ramp, three ramps light the jackpot, the saucer pays it and starts STAR STORM, a three-ball multiball. A ball saver, nudging and TILT, the bonus counted at each drain (times the lanes' multiplier), a 128 x 32 dot-matrix display drawn by code, three balls, the arcade module's high scores, initials and attract mode (a demo game). Its own music.
- **Engine**: the ARTILLERY kit (`#artillery`, `#artillery/cpu`, `src/starter/34-artillery.js`, family STRATEGY, its modules physics, terrain and grid): BLAST ISLAND. Two teams of three grubs on a generated island of earth over rock, sand beaches and caves, every blast carving it (a dark back wall where a cave or a deep crater opens). Turns by `E.Turns` (the teams alternate, each sends its next grub), thirty seconds each; walk, jump, aim and power. Three weapons: a rocket the wind blows, a grenade that bounces (a physics body on `land.collider()`) and blows on its three-second fuse, a cluster bomb that bursts into five (two a team). Blasts hurt by distance and throw grubs; long falls hurt; the sea drowns; from turn 16 the sea rises. One player against the CPU, two players in turn, or two CPUs. The CPU tries every weapon at every angle and power in simulation (the same step the real shot takes, the wind and the fuse as they are), a few each step, and fires the best with a slightly unsteady hand. A minimap of the whole island (a click or a tap looks there), the camera leading along a charging aim. On a phone: a drag back and let go fires, a tap walks, JUMP and the weapon's button.
- **Engine**: touch zones: `input.zones = [{ x0, y0, x1, y1, act }]` (fractions of the canvas): a finger landing in one holds its act until it lifts (several fingers, several zones), and starts no stick (a pinball's halves, a rhythm game's lanes); `input.feed(..., { touch, id })` plays them in a test.
- **Tools**: `kits-test`'s bots: the pinball's plays a ball by the flipper keys and the plunger (it scores, flips, hits bumpers and drains, twice the same); the artillery's lets two CPUs play a match to its end (the island carved, grubs down, all three weapons, twice the same). The phone test's cases 21 (pinball: a tap starts, a swipe up plunges, each half of the screen flips its side, two fingers both) and 22 (artillery: ONE PLAYER a thumb's height; a tap walks; the weapon's button; JUMP; a drag back fires; the CPU's turn follows), both on its side and upright. The contract test's touch zones.
- **Docs**: the API card (the playbook's pinball and artillery rows, touch zones, `stickOn`), `AI_GUIDE.md` (the pinball and artillery recipes), README (the slices, genre coverage, sizes at v0.77.0), the Labs page (both kits and their To check cards), the plan's 11b as built.

## 0.76.0 (2026-10-28)

Physics toys, the modules: the genre plan's Milestone 11, its first half (11a): the physics and terrain modules. The PINBALL and ARTILLERY kits follow in 11b. Every kit plays as before (no kit carries the new modules yet).

- **Engine**: the physics module (`engine/modules/physics.js`, after either edition): `E.Physics`, 2D rigid bodies. Circles, boxes, convex polygons, static segments, chains and arcs (a segment or polygon with `r` is rounded: a capsule); dynamic, kinematic (`moveTo`: paddles and flippers that give their speed to what they hit) and static bodies; bounce, friction, damping, sensors (`on.enter`, `on.exit`), layers and masks (a ball on a ramp ignores the table's walls), sleep, gravity as a vector (a table's tilt). A fast ball (`bullet: true`) is swept each substep and never passes through a wall, a thin segment or a swinging flipper. Contacts are solved in a fixed order, so the same steps give the same world. A pinball's parts: `world.flipper`, `bumper`, `slingshot`, `kicker`. Also `ray`, `query`, `hash` and a debug `draw`.
- **Engine**: the terrain module (`engine/modules/terrain.js`, after either edition): `E.Terrain`, destructible ground in the side plane (its y is the side view's z). A mask of material cells, carved and added by circles and polygons (hard materials stay, with flying bits of what was taken); the ground below a point, its normal, a circle's hit, a ray for a shot; walkers that step up slopes, stop at walls, fall and land (their landing speed for fall damage); a collider for the physics module (grenades that bounce on the ground); drawn as decals in chunks painted again only where a change touched.
- **Tools**: the contract test's physics toys group on both editions:
  - a ball at twice its top speed (3,200 px/s) never passes through a wall, a thin segment or a swinging flipper, from 48 directions and 24 angles;
  - a table (flippers, bumpers, a kicker, three balls) gives the same world at 60, 90, 120 and 144 Hz;
  - bounces, friction, a stack that settles and sleeps upright, layers, sensors, a kicker, a bumper's kick, a kinematic paddle, `ray` and `query`;
  - the terrain's carving, adding, polygons, ground, normals, hits, rays and walkers, and a physics ball resting on it;
  - in Chromium, its chunks drawn again only where a carve touched.
- **Docs**: the API card (the physics and terrain modules' lines), `AI_GUIDE.md` (the physics toys recipes: Breakout, Asteroids with real collisions, Lemmings), the plan's 11a as built.

## 0.75.1 (2026-10-28)

The genre plan's Milestone 10, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M10 row with its commit (`a73d85b`, #178), what it brought, its sizes, the bot, the decision (D58), `test:changed`, the full `npm test` on `main` after the merge, and what is left (the owner's POINT-AND-CLICK check on the Labs page).

## 0.75.0 (2026-10-28)

Point-and-click and visual novels: the genre plan's Milestone 10, the click module and the POINT-AND-CLICK kit. Every other kit plays as before (filmed beside v0.74.1: the same pixels).

- **Engine**: the click module (`engine/modules/click.js`, after the full engine only): `E.Walkbox`, a walk area with holes (`inside`, `nearest`, `path`: the shortest way round them, A* over the corners then straight), and `E.Click`, point-and-click rooms: a picture painted once with margins a bigger screen shows (a tall screen zooms the room), depth scale, hotspots (rectangles, polygons, actors) with a place to stand, a way to face and their verbs, things drawn by depth, SCUMM's nine verbs, Sierra's icons, a verb coin or two buttons, a hand cursor and a label, an inventory (an item on a hotspot or another item, either way round; on someone, a give), rules as data, exits with fades, a double click to run, `story`'s flags and talk; on a phone a tap walks, a tap on a hotspot opens its verbs, a long press looks, thumb-sized buttons. `pc.panel = false` for a cutscene; `where`, `screen` and `boxes` for tests and bots.
- **Engine**: the POINT-AND-CLICK kit (`#pointclick`, `src/starter/15-pointclick.js`, family ADVENTURE, its modules click and story): THE LIGHT ON GULL ROCK. A harbour at dusk, the Salty Gull tavern and the lighthouse's lamp room; Pip, Finn, Morwen and Bruno; four puzzles (a rope and a hook make a grapple that fishes out the oar; Morwen's riddle contest wins the key to the rowboat's chain; a bottle at the whale-oil barrel; the oil and the matches light the lamp); an opening, the ending's beams and THE END; Settings, Point and click, Interface (nine verbs, icons, verb coin, two buttons); a shanty and a hymn of its own.
- **Engine**: the story module: `story.log` (what was said and chosen: a visual novel's backlog), `story.auto` (pages turn by themselves), `story.skip` (pages type and turn at once; choices wait).
- **Engine**: `E.Dialog`: a tap or click on a choice picks it, the mouse over one moves the cursor there (it took only the keys); `choiceAt(i)` says where choice i is.
- **Tools**: the contract test's clicks group: paths round a walk area's holes from random points, inside all the way and never longer than a fine grid's way; a walk the same at 60, 90, 120 and 144 Hz; a click walks, a click on a hotspot does its verb, a right click looks, Sierra's cursor turns; rules either way round and a give; exits; state and restore; the story's log, auto and skip; a tap on a dialog's choice. `kits-test`'s `BOTS`: the kit's bot clicks through the whole chain with the nine verbs (a riddle lost first, the lamp dry first) to THE END. The phone test's case 20 (a tap walks; a tap on a hotspot opens its verbs, a thumb's size; TAKE; the inventory by taps; a long press looks; a tap on a talk's choice), on its side and upright.
- **Tools**: the Labs page: the kit, and a card To check: does POINT-AND-CLICK feel like Monkey Island and Broken Sword?
- **Docs**: the API card (the click module's line, the playbook's point-and-click and visual novel rows, the story module's backlog, a dialog's choices by a tap), `AI_GUIDE.md` (the point-and-click and visual novel recipes), README (the slices, genre coverage, sizes at v0.75.0), the plan's M10 as built.
- **Docs**: sizes at v0.75.0, cl100k: RPG 239,294 (D52), shooter 222,264 (D52), metroidvania 212,431 (D52), adventure 208,425 (D52), sim 207,902 (D52), RTS 206,137 (D52), brawler 205,633 (D52), arcade 204,271 (D52), tactics 203,218 (D52), roguelike 199,382, point-and-click 197,105, platformer 196,484, kart 195,628, animation lab 193,764, stealth 193,024, fighting 192,261, puzzle 184,108, road 177,035; 3D 226,012, 220,819, 295,796; the compact edition 618,509 (D55), the reference 772,373; the API card 19,165 (D58), the index 54,269 (D57); the click module's manual 1,477 of 1,500; the agent edition's header 9,971 of 10,000; the kits 11.27 MB.

## 0.74.1 (2026-10-28)

The genre plan's Milestone 9, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M9 row with its two commits (`acbd322`, #175; `fc9ba7f`, #176), what each brought, its sizes, the bots, the decision (D57), `test:changed` for each, the full `npm test` on `main` after each merge, and what is left (the owner's RTS and SIM checks on the Labs page).

## 0.74.0 (2026-10-28)

Strategy and simulation, the kits: the genre plan's Milestone 9, its second half (9b): the RTS and SIM kits. Every other kit plays as before (filmed beside v0.73.0: the same pixels).

- **Engine**: the RTS kit (`#rts`, `src/starter/48-rts.js`, family STRATEGY, its modules grid and strategy): the Vale War. The Vale's hall south-west of a river, the Ash Clan's camp north-east behind its fords; workers who mine gold on their own; a barracks (footmen, archers) and a stable (knights) to build; fog, the minimap, alerts when the Vale is struck; the clan builds from its plan, keeps its army topped up and attacks in waves from about four minutes. The mouse: a click, a box, Shift, a double click, Ctrl and a digit, a right click (a building's rally point too), F to attack-move; Z X C the panel's commands, H the hall, R the army. On a phone: a tap selects or orders, a drag pans, a long press and a drag draws a box, HALL, ARMY and IDLE, BUILD then a tap and PLACE. Its buildings are `E.SHAPES` in each side's colors.
- **Engine**: the SIM kit (`#sim`, `src/starter/49-sim.js`, family SIMULATION, its modules grid and strategy): Sunny Bay Park. Lay paths (a tile, or a dragged line), build a carousel, a Ferris wheel, teacups and a swing tower (shapes that turn as they run) and burger and lemonade stands beside them; guests come through the gate from 9:00 to 21:00 with money and needs, go for what serves them best (`E.choose`), queue, ride, eat, think aloud and leave happy or not; prices against what a ride is worth to them, a rating, the gate's fee, upkeep at midnight; day and night with lights on the rides; PAUSE and 1X to 4X; a crowds overlay; tooltips; a ride's price and its knocking down, a guest's mind.
- **Rendering**: `r.shape(id, x, y, z, { pick })`: a shape can be picked (`r.pick`) like an actor or a sprite.
- **Engine**: the strategy module: a right click with a building that makes units selected sets its rally point; its AI works on the first step of its plan short of its count (what it loses it makes again), mines nearest its depot and sends its waves at the nearest foe building.
- **Tools**: `kits-test`'s `BOTS`: the RTS's bot gives the Vale an AI of its own that plays the match to its end and burns the camp, twice, the same; the SIM's lays out a park through the HUD's calls and runs ten days at 4x, its money each midnight. The phone test's cases 18 (RTS: thumb-sized buttons, train, build and order by taps, a drag) and 19 (SIM: thumb-sized tools and time, a path, a stand, a price by taps, a drag). The contract test: a rally point; an AI that makes its losses again and mines nearest home.
- **Tools**: the Labs page: the two kits, and two cards To check: does RTS feel like Warcraft II and StarCraft? Does SIM feel like Theme Park and RollerCoaster Tycoon?
- **Docs**: the API card (the playbook's RTS and SIM rows; `r.shape`'s pick), `AI_GUIDE.md` (the RTS recipe's kit, the theme park recipe), README (the slices, genre coverage, sizes at v0.74.0), the plan's 9b as built.
- **Docs**: sizes at v0.74.0, cl100k: RPG 238,449 (D52), shooter 221,587 (D52), metroidvania 211,744 (D52), adventure 207,749 (D52), sim 207,226 (D52), RTS 205,461 (D52), brawler 204,957 (D52), arcade 203,594 (D52), tactics 202,373 (D52), roguelike 198,705, platformer 195,808, kart 194,952, animation lab 193,087, stealth 192,347, fighting 191,578, puzzle 183,431, road 176,358; 3D 225,434, 220,241, 295,218; the compact edition 588,540 (D55), the reference 738,518; the API card 18,858 (D54), the index 52,857 (D57); the agent edition's header 9,971 of 10,000; the kits 10.22 MB.

## 0.73.0 (2026-10-28)

Strategy and simulation, the core: the genre plan's Milestone 9, its first half (9a): the pointer's gestures, a free camera and picking what was drawn in the core, and the strategy module. Every kit plays as before (filmed beside v0.72.1: the same pixels).

- **Engine**: the pointer's gestures, from a mouse or one finger, in screen pixels: `input.box()` (`{ x0, y0, x1, y1, from, to, done }` while a box is drawn: a mouse's left drag; on a touch screen a long press, then a drag), `longPress()` (held still .45 s), `doubleTap()` (a second tap within .35 s and 8 pixels), `pan()` (`[dx, dy]`: a finger's drag on open ground, a middle or right drag), `zoomPoint()` (where the wheel or the pinch is); `input.feed('down' | 'move' | 'up' | 'zoom', x, y, { touch, button, k })` plays a pointer in a test, headless too.
- **Engine**: a free camera, `game.cam.free = true` or `{ keys, edge: 10, drag, speed: 300, bounds: [x0, y0, x1, y1], zoomAt }`: the keys or a pad's stick pan it (a finger pans by its drag, never as the touch stick), the mouse at the screen's edge, a drag one to one; a zoom (the wheel, a pinch) goes toward the pointer or the pinch; its focus keeps to bounds; in every view and turn (strategy, sims, board games).
- **Rendering**: `r.pick(sx, sy)`: what the last frame drew under a screen point, front to back: the `pick` value given to `r.actor`, `r.sprite`, `r.prop` or `r.queue` (`{ pick: unit }`), each where its pixels went (an actor's drawn bounds, a kept image's, a sprite's).
- **Engine**: E.Shell's minimap: `minimap: { map, fog, camera: true, markers, onClick(x, y) }` draws the fog (unseen black, seen dim) and the camera's view, and a click gives `onClick` the world point.
- **Engine**: the strategy module (`engine/modules/strategy.js`, after the full engine, needs grid; its manual 1,560 of 2,500 tokens): `E.Strategy(game, { map, kinds, sides, player, fog, on })` for real-time strategy and builders. Kinds are data (units, buildings, resources); selection by a click or tap (`r.pick`), a box, Shift, a double tap for the kind on screen, control groups (Ctrl+1..9); orders move, attack, attack-move, gather, build, patrol, stop, queued with Shift, and a right click or tap that does the right one; groups move in formation on shared flow fields, kept apart; production queues and rally points; gathering trips to the nearest depot; workers lay and raise buildings (paid when ordered, refunded if the place stays blocked); placement on the map's cells with a ghost; the player's fog (walls block sight); the minimap's spec; an enemy's build order and waves as data, and a script; `rts.state()` for a proof.
- **Engine**: for simulations: `E.Clock` (days, hours, night, `label()`, `light()` by the hour), `E.needs` and `E.choose` (agents whose needs rise pick the option that best serves them for the walk and the price), `E.overlay` (a value per cell as tints), `E.tooltip`. Time controls are `game.timeScale` 0, 1, 2, 4: above 1 it already runs more fixed steps a frame, none longer.
- **Tools**: the contract test's strategy group: the gestures; the free camera's drag and zoom in four views turned three ways, its keys and bounds; selection and orders by scripted pointer input in four views turned three ways (a box, a click, a double click, a group, a right click that moves in formation and attacks); the economy (trips pay, training costs and makes, a worker builds) and an AI (its build order and a wave); fog; the clock and needs.
- **Tools**: the phone test's case 17 (`tools/fixtures/army.html`): 200 units under orders update and draw within the budget (30 ms, the median: 10 to 17 ms, each body's image kept two frames of three); `r.pick` gives what was drawn front to back; a tap selects and orders, a drag pans, a long press and a drag draws a box that selects.
- **Docs**: the API card (the gestures, `cam.free`, `r.pick`, the minimap, the strategy module's line), `AI_GUIDE.md` (the real-time strategy recipe), README (genre coverage, sizes at v0.73.0), `docs/HANDOFF-GENRES.md` (9a as built: one fact corrected, `timeScale` already steps). D57: the API index's budget is 60,000 until the owner's review pass.
- **Docs**: sizes at v0.73.0, cl100k: RPG 238,010 (D52), shooter 221,118 (D52), metroidvania 211,275 (D52), adventure 207,280 (D52), brawler 204,488 (D52), arcade 203,125 (D52), tactics 201,904 (D52), roguelike 198,236, platformer 195,339, kart 194,483, animation lab 192,618, stealth 191,878, fighting 191,109, puzzle 182,962, road 175,889; 3D 225,159, 219,966, 294,943; the compact edition 562,205 (D55), the reference 712,081; the API card 18,641 (D54), the index 52,835 (D57); the agent edition's header 9,971 of 10,000; the kits 9.19 MB.

## 0.72.1 (2026-10-28)

The genre plan's Milestone 8, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M8 row with its commit (`c30e191`, #173), what it brought, its sizes, the bot, the decision (D56), `test:changed`, the full `npm test` on `main` after the merge, and what is left (the owner's TACTICS check on the Labs page).

## 0.72.0 (2026-10-28)

Tactics: the genre plan's Milestone 8: picking under the cursor in the core, the grid module's tactics helpers, the TACTICS kit. Every other kit plays as before (filmed beside v0.71.1: the same pixels).

- **Engine**: `map.pick(sx, sy, at)` (both editions): the cell under a screen point (the HUD's pixels: `input.clicked()`, `input.pointer()`) on a TileMap of heights, in any view, turn and zoom: the first top the line of sight comes down onto, or wall face it meets, front to back (`{ cx, cy, x, y, z, face: 'top' | 'side' }`, null off the map); at: the game whose view and camera drew it, or `{ view, ix, iy }`.
- **Engine**: the grid module's tactics helpers: `reach`'s `pass` (allies crossed, not stopped on; a unit's jump is `climb` and `drop`), `grid.shape(c, kind, n, dir)` (cross, diamond, square, ring, line, cone: areas of effect), `grid.face(a, b)`, `grid.side(at, facing, from)` (front, side or back: a blow from behind), `grid.threat(units, { blocked })` (what units can strike next turn: an AI's danger, a player's warning); its manual 1,480 of 2,500 tokens.
- **Rendering**: `E.tint` over a raised top sorts with the map: over the top, under whoever stands on it, behind what is in front (it drew over everything; on the floor it is a decal as before: D56).
- **Engine**: the TACTICS kit (`#tactics`, `src/starter/47-tactics.js`, family STRATEGY, its modules grid and story): Thornwatch, a hill fort on a floating map of block heights; four heroes (ALDO the paladin, WREN the ranger, SABLE the mage, LIORA the cleric) against the Ash Legion's five (GRIMWALD the knight at the gate, an archer on the wall, a mage on the tower, a priest, a thief on the hills). The scene before the battle (E.Story) and its choice: charge time (the fastest acts first; a turn of less costs less; the order ahead on the left) or phases (every hero in the order you like, then every foe). A turn: MOVE (jump heights; the shallows cost two), ATTACK or a skill (BASH knocks a foe back, CLEAVE three cells ahead, VOLLEY a cross of arrows, FIRE a diamond friend and foe, CURE), WAIT and a way to face; x1.25 from the side, x1.5 from behind, +8% a level higher; bows arc over what stands between and reach further from up high. The Legion scores every place and blow, less the danger of the place. The cursor by keys, the mouse and taps (`map.pick`); Q and E turn the view a quarter, the wheel zooms; unit cards, a forecast while aiming; the results; its own march. On a phone: a tap selects, a tap on a blue cell moves, a tap on a foe strikes, a drag pans, TURN. Deep links `#tactics/battle`, `#tactics/phases`.
- **Tools**: the contract test's picking group (5,760 points in six views, four turns and two zooms on each edition, against a test of every cell's box; the camera's offset; off the map) and tactics group (reach over heights past allies, shapes, facing and blows from behind, threat maps). `kits-test`'s `BOTS`: the heroes' own AI takes the fort by charge time twice, the same (the AI's turns repeat), then by phases. The phone test's case 16 (thumb-sized rows; a tap selects, a tap moves, a tap strikes; TURN).
- **Tools**: the Labs page: the kit, and a card To check: does TACTICS feel like Final Fantasy Tactics and Fire Emblem?
- **Docs**: the API card (`map.pick`, the grid module's line, the playbook's tactics row), `AI_GUIDE.md` (the tactics recipe, the modules), README (the slices, genre coverage, sizes at v0.72.0), the agent edition's header (`map.pick`), `docs/HANDOFF-GENRES.md` (M8 as built). D56: `E.tint` over raised tops.
- **Docs**: sizes at v0.72.0, cl100k: RPG 235,521 (D52), shooter 218,648 (D52), metroidvania 208,801 (D52), adventure 204,794 (D52), brawler 202,007 (D52), arcade 200,769 (D52), tactics 199,432, roguelike 195,773, platformer 192,955, kart 191,969, animation lab 190,153, stealth 189,392, fighting 188,743, puzzle 180,565, road 173,506; 3D 222,778, 217,585, 292,562; the compact edition 551,474 (D55), the reference 696,131; the API card 18,267 (D54), the index 50,659; the agent edition's header 9,971 of 10,000; the kits 9.08 MB.

## 0.71.1 (2026-10-28)

The genre plan's Milestone 7, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M7 row with its two commits (`90eec25`, #170; `f8b0cf9`, #171), what each brought, its sizes, the bot, the decisions (D54, D55), `test:changed` for each, the full `npm test` on `main` after each merge, and what is left (the owner's RPG check on the Labs page).

## 0.71.0 (2026-10-28)

Stories and RPG systems: the genre plan's Milestone 7, its second half (7b): the story and rpg modules, and the RPG kit's journey round its battle. Every other kit plays as before (filmed beside v0.70.0: the same pixels), and the battle alone (`#rpg/battle`) films as the kit did.

- **Engine**: the `story` module (`engine/modules/story.js`, after either edition; its manual 1,116 of 1,500 tokens): `E.Story(game, { people, nodes, vars, on })`: people (a name, a portrait, the thing a balloon floats over), nodes of steps (a line or pages, with choices; a condition on any step or choice: a flag, `!flag`, a comparison, `quest:id`, `done:id`, a list of them, a function), `set`, `add`, `quest`, `done`, `emote`, `goto`, `end`, `wait`, and `event` (the game's `on[name]`, after the line closes; `wait: true` holds the talk until `story.resume()`: a shop, an inn, a fight); `vars` that a line's `{$name}` reads; the quest log; balloons over people (!, ?, a heart, dots, a note); `state()` and `restore()` for the save.
- **Engine**: the `rpg` module (`engine/modules/rpg.js`, after either edition; its manual 1,497 of 1,500 tokens): `E.RPG`: items (an icon drawn for each kind, or the item's own sprite), bags of slots or a grid of sizes (`add` all or nothing, `fits`, `place`, `at`), members (stats, growth per level, an experience curve, gear and `compare`, status effects that tick: poison, regen, sleep, stop, silence, haste, slow), a party (items used, an inn's rest, rewards shared by the living, drops), shops, `damage`, encounters by zone, `state()` and `restore`; windows in `E.ui`: `list` (a cursor, a title, scrolling, rows a thumb's height on a phone, `row(px, py)` for taps) and `card`.
- **Engine**: the RPG kit (`#rpg`, `src/starter/40-rpg.js`, its modules story and rpg) is a journey: a title (New game, Continue, Load, the battle alone); Brightwater (an elder with the quest and its key, an inn that autosaves, a shop, a chest, a guard who stands aside, a child and a gossip, a save crystal), lines with markup; an island of 256 x 256 cells (meadows, woods and peaks painted into its chunked floor, beaches, the road north) where fights come by zone and swirl into the battle; the cave in the peaks (a chest, a crystal that heals and saves, the Dread Knight's scene and fight); the way home and THE END. The menu: Items, Equip (each stat's + and -), Status, Quests, Save at a crystal; three save slots and the autosave. The battle is the kit's battle as it was, its own scene (`#rpg/battle`), taking the journey's troops, members and the cave as its place; Run; L turns on AUTO. On a phone the stick walks, TALK and MENU, taps in every window.
- **Engine**: a slice's `parts` names a part that is a scene of its own (`parts: { battle: 'rpg-battle' }`): `#<slice>/<part>` starts there.
- **Tools**: the contract test's stories group (lines, pages, choices and conditions, set and add, quests, events after the line, `wait` and `resume`, balloons, `state` and `restore`) and rpg group (stats, growth and the curve, gear and `compare`, status effects, bags of slots and the grid, the party's items, rest and rewards, shops, damage, encounters, `restore`, the windows' rows and taps). `kits-test`'s `BOTS`: the RPG's bot plays the journey by the keys (the quest, the key, the shop, Equip, the chest, a save, the world, the cave, the knight, home) and loads its save. The phone test's case 5 opens `#rpg/battle`; case 15: rows a thumb can hit, New game by a tap, the stick walks, MENU, Status and back.
- **Tools**: the Labs page: the RPG kit's entry, and a card To check: does the RPG feel like Dragon Quest and Final Fantasy?
- **Docs**: the API card (the modules' lines, the playbook's JRPG row), `AI_GUIDE.md` (the JRPG recipe, the modules), README (the slices, the kits, genre coverage), `docs/HANDOFF-GENRES.md` (7b as built).
- **Docs**: sizes at v0.71.0, cl100k: RPG 234,786 (D52), shooter 217,906 (D52), metroidvania 208,058 (D52), adventure 204,059 (D52), brawler 201,265 (D52), arcade 199,591, roguelike 194,094, platformer 192,714, kart 191,227, animation lab 189,411, stealth 188,650, fighting 188,502, puzzle 179,387, road 173,265; 3D 222,640, 217,447, 292,424; the compact edition 532,876 (D55), the reference 676,447; the API card 18,129 (D54), the index 50,133; the kits 8.56 MB.

## 0.70.0 (2026-10-28)

Stories and big maps, the core: the genre plan's Milestone 7, its first half (7a): floors baked in chunks for big maps, dialog markup and save slots. Every kit plays as before (filmed beside v0.69.1: the same pixels).

- **Rendering**: a `TileMap` of more than 128 x 128 cells (or `chunks: true`) bakes its floor in squares of 128 screen pixels as the camera comes to them, the colors and the GPU lighting's canvas both, one more of the ring round the screen each frame ahead of the camera, and lets the far ones go; `set`, `fill` and `setFloor` re-bake only the squares over what changed; `map.floorBytes()` says what the floors hold. Walls and the water's sparkle are queued from the cells on screen alone. On a 256 x 256 map the floor holds 2.9 MB where one bake would take 253 to 302 MB, and scrolling it takes 0.4 ms a frame on an emulated phone (median; under 6 ms at the 95th percentile). A smaller map bakes as before.
- **Engine**: dialog markup in `E.Dialog` (both editions): `{c=#ffd36a}gold{/c}` a color, `{w=.5}` a pause, `{s=12}slowly{/s}` letters a second, `{shake}..{/shake}` and `{wave}..{/wave}` letters that tremble or bob, `{$name}` a value from `say(text, { vars })` or the box's `vars`; the letters alone are wrapped and typed, and confirm finishes a page past its pauses. Text without markup types and draws as it always has.
- **Engine**: save slots, `game.saves` (section 10k, on the kit diet): three slots and an autosave, each the game's data with its place, level and time played (counted in the game's scenes, not its titles); `write` and `read`, `save`, `load`, `copy`, `erase`, `autosave`, `list`, `latest`; versioned, with `migrate` for older data; a damaged save or one from a newer version refused without an error; blocked storage keeping the saves for the visit; `menu: { saves: true }` puts Save (while `canSave`: a save point) and Load in the pause menu, and `saves.show('save' | 'load')` opens the standard screen (the slots with their place, level, time and date; save, load, copy and erase, asking before a save is lost).
- **Tools**: the views suite's big map (`tools/fixtures/bigmap.html`: 256 x 256 cells in three views, filmed twice; its floor's memory and its frames on a phone; a small map chunked and whole, the same pixels from fifteen cameras); the standard test's save slots (in Node and in a page: storage, a reload, damaged, newer and older saves, blocked storage, the pause menu's Save and Load, the save screen, Erase asking first); the contract test's dialogs group (markup, speed, pauses, values, confirm, wrapping; which maps bake in chunks); the API index reads getters added to a class (`Object.defineProperty(Game.prototype, ...)`).
- **Docs**: the API card (markup, chunked floors, save slots, the JRPG row), `AI_GUIDE.md` (markup, saves), both editions' headers, README's sizes (measured at v0.70.0), `docs/HANDOFF-GENRES.md` (7a as built). D54: the API card's budget raised to 19,000 until the owner's review pass. D55: the compact edition kept whole past 500,000 tokens until then.
- **Docs**: sizes at v0.70.0, cl100k: shooter 217,678 (D52), metroidvania 207,830 (D52), adventure 203,831 (D52), brawler 201,037 (D52), arcade 199,363, RPG 198,343, roguelike 193,866, platformer 192,486, kart 190,999, animation lab 189,183, stealth 188,422, fighting 188,274, puzzle 179,159, road 173,037; 3D 222,512, 217,319, 292,296; the compact edition 500,913 (D55), the reference 640,618; the API card 18,001 (D54), the index 48,981; the kits 8.45 MB. Each 2D kit carries the markup and the card's lines (and those with a TileMap the chunked floor); none carries the save slots yet (the RPG kit will, in 7b).

## 0.69.1 (2026-10-28)

The genre plan's Milestone 6, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M6 row with its two commits (`ec5bea4`, #167; `f2c076d`, #168), what each brought, its sizes, the bots, `test:changed` for each, the full `npm test` on `main` after each merge, and what is left (the owner's kart and road checks on the Labs page).

## 0.69.0 (2026-10-28)

Racing: the genre plan's Milestone 6, its second half (6b): the drive module, the KART and ROAD kits. Every other kit plays as before (filmed beside v0.68.0: the same pixels).

- **Engine**: the `drive` module (`engine/modules/drive.js`, after either edition; its manual 914 of 1,500 tokens): `E.Car`, an `E.Body` with a heading, its speed along it and a slide across it that grip takes away (`top`, `accel`, `brake`, `turn`, `grip`, `drift`); a kart's hop into a drift that charges a boost (blue, then orange: let go for it), a car's handbrake; the floor's tag under it slowing or boosting it (`surfaces`: grass half speed, sand, dirt, ice, boost pads; read from the TileMap's floor tags or your `ground(x, y)`); walls through the TileMap and `E.Car.collide` between cars; `boost`, `spinOut`; driven by `game.input` (steer, gas, brake, drift; `auto`: the gas by itself) or an intent. `E.Race`: a closed `E.Path` as the racing line, `grid(n)`, laps counted through checkpoints in order (a shortcut counts nothing), the wrong way, places and results; drivers that look ahead, slow for the sharpest bend ahead to the speed it allows, drift, pass, back out of a wall and rubber-band; item boxes (a boost, a shot that flies ahead, a hazard dropped behind) and `use`; `hud(r, racer)` (the place, lap, time, item, countdown, WRONG WAY, FINISH, in each viewport).
- **Engine**: the KART kit (`#kart`, `src/starter/65-kart.js`, family RACING): a circuit in a meadow, its TileMap's cells drawn by `E.Mode7` (asphalt, kerbs, grass in stripes, sand inside the tight bends, boost pads, the chequered line, a low stone wall, a wood of trees past it), six karts with HD drivers (each a rig seated in a kart of boxes drawn from whatever side the camera sees, sorted far to near), three laps, item boxes, drift sparks and boost flames, the map in the corner, the results; VS for two in a split screen (the second joins with 2 or Start on a pad); its own song; on a phone it drives itself forward, the stick steers, DRIFT and ITEM, and an upright screen draws from further back and wider; deep links `#kart/race`, `#kart/vs`.
- **Engine**: the ROAD kit (`#road`, `src/starter/66-road.js`, family RACING): a convertible drawn by code on an `E.Road` of five stretches (the beach, green hills, a tunnel through the cliffs, the desert at dusk, the city at night), each its sky and scenery (palms, trees, rocks, cactus, buildings, signs), traffic in its lanes, bends that throw you outward (the hardest faster than you can steer: slow for them), a crash that spins you back onto the road, two gears, a clock, four checkpoints that give time and the goal; a radio of three songs to pick first; on a phone it drives itself forward, the stick steers, BRAKE and GEAR; deep link `#road/drive`.
- **Engine**: `vercel.json` serves `/kits/fighting` and `/kits/metroidvania` (missed in v0.66.0 and v0.67.0), and `/kits/kart`, `/kits/road`.
- **Tools**: the contract test's drive group (top speed along the heading; grip keeping the slide small; a kart's drift sliding wide at speed and its boost; grass at half speed; a wall; two cars bumped apart; a lap through the checkpoints, a shortcut that counts nothing; the wrong way; six drivers finishing three laps round an oval, none stuck). `kits-test`'s `BOTS`: the kart's six karts finish three laps and two players race in a split screen; the road's bot reaches the goal through its four checkpoints. The phone test's cases 13 (DRIFT and ITEM; the gas by itself; the stick steers) and 14 (BRAKE and GEAR; the stick; GEAR changes gear).
- **Tools**: the Labs page: the two kits, and cards To check: does the kart feel like Super Mario Kart, does the road feel like OutRun?
- **Docs**: the API card (the playbook's kart, road and top-down racing rows, the module's line), `AI_GUIDE.md` (the kart, road and top-down racing recipes, the modules), README (the slices, the kits, genre coverage), `docs/HANDOFF-GENRES.md` (6b as built).
- **Docs**: sizes at v0.69.0, cl100k: shooter 215,247 (D52), metroidvania 205,387 (D52), adventure 201,373 (D52), brawler 198,595, arcade 198,025, RPG 195,912, roguelike 191,551, platformer 191,147, kart 188,672, fighting 186,922, animation lab 186,757, stealth 185,978, puzzle 177,824, road 171,700; 3D 221,177, 215,984, 290,961; the compact edition 496,774 (500,000 is the line M0 left for a later decision), the reference 633,476; the API card 17,659, the index 48,043; the kits 8.37 MB.

## 0.68.0 (2026-10-28)

Mode 7 and the road: the genre plan's Milestone 6, its first half (6a): the views racing games are drawn in. The stress test's depth view is drawn by the new mode7 module, pixel for pixel as before (filmed beside v0.67.1: the same pixels); every kit plays as before.

- **Rendering**: the `mode7` module (`engine/modules/mode7.js`, after either edition; its manual 975 of 1,500 tokens): `E.Mode7`, the SNES's view: a camera (`x`, `y`, `h`, `angle` as `E.angleTo` gives it, `pitch`, `fov`) over a flat floor drawn a screen row at a time (a TileMap's `floorTex`, a color function or a canvas, baked once; `outside` or `wrap` beyond it; due north each row a stretched strip of it, at any other heading each pixel sampled); a sky above the horizon (two colors, or a Backdrop turned with the heading); billboards far to near (`rig`: a Humanoid drawn by the engine at the size its distance gives, from the camera's side; `sprite`: a sprite or an `E.anim`; `shape`: one of the engine's shapes; `add`: your drawing); fog with distance; `chase(body)` for a camera behind a body; `project` and `toFloor` (HUD markers, taps); drawing into `r.viewport` in a split screen, each player's camera; `begin`, `rowDepth`, `drawFloor` and `view` for a pass of your own; at the game's own pixels, or `fullRes(game, true)` at the screen's.
- **Rendering**: the `road` module (`engine/modules/road.js`, after either edition; its manual 798 of 1,500): `E.Road`, the pseudo-3D road of OutRun, Pole Position and Road Rash: segments added with eased curves and hills, lanes, rumble strips and alternating colors per stripe, tunnels (walls, a roof, a face round the mouth), scenery placed beside it (sprites, anims or your own drawing, scaled by distance, faded by fog), cars between segments' ends, a crest hiding what lies past it (near to far it finds what shows, far to near it draws), a Backdrop's parallax as it bends (`turn`), the camera's height over the hills; `curveAt`, `yAt`, `hits` and `ahead` for the game, `project` for the HUD; drawing into `r.viewport` in a split screen.
- **Engine**: the stress test's depth view (side scrolling with depth, M) drawn by `E.Mode7`: its camera, floor rows, characters' views, aiming under the mouse and the screen's resolution are the module's; its walls, light pools and fog are its own.
- **Tools**: the `views` suite (`tools/views-test.mjs`, its fixture `tools/fixtures/views.html`: Mode 7 due north, around a track with the sky turning, two cameras in a split screen, and the road): each filmed twice from one seed, the same pixels; Mode 7's two floors (rows due north, pixels at any heading) the same floor; a split screen's two cameras in their halves; each view's frame within the phone test's budget on an emulated phone (1 to 4 ms of 30). The contract test's views group (a floor point projected and back at six headings and three pitches, the horizon, the chase camera, a rig's view from the camera's side; the road's lap, wrap, eased curves and hills, what it hits). The stress suite runs on a change to the mode7 module.
- **Docs**: the API card (the modules' lines), `AI_GUIDE.md` (the modules), README (`npm run test:views`), `docs/LAB-3D.md` (the depth view's module), `docs/HANDOFF-GENRES.md` (6a as built).
- **Docs**: sizes at v0.68.0, cl100k: shooter 214,895 (D52), metroidvania 205,035 (D52), adventure 201,021 (D52), brawler 198,243, arcade 197,673, RPG 195,560, roguelike 191,199, platformer 190,795, fighting 186,570, animation lab 186,405, stealth 185,626, puzzle 177,472; 3D 220,895, 215,702, 290,679; the compact edition 476,351, the reference 610,977 (both carry every module); the API card 17,377, the index 47,139; the kits 7.47 MB. Every kit carries the card's two new lines (161 tokens); no kit carries either module yet (the KART and ROAD kits will, in 6b).

## 0.67.1 (2026-10-28)

The genre plan's Milestone 5, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M5 row with its commit (`5aaecfa`, #165), its sizes, `test:changed`, the full `npm test` on `main` after the merge, and what is left (the owner's check on the Labs page).

## 0.67.0 (2026-10-28)

Side-view traversal and the Metroidvania: the genre plan's Milestone 5. Every existing side-view page plays as before (filmed beside v0.66.1: the same pixels).

- **Engine**: the Platformer's further moves (section 16c, on the diet with the Platformer), each on request, today's defaults unchanged: `crouch` (down: half as tall, it crawls under a one-tile gap), `ledge` (it catches a ledge falling past it; up or jump climbs on, down drops), `wallCling` (it holds a wall pressed in the air; jump leaps off it), `momentum` (slopes speed it up downhill and slow it uphill past its run speed, down rolls, a charged dash: Sonic without the loops); tile kinds `water` (it swims: less gravity, drag, a stroke on each jump, a leap out at the surface, `hero.swimming`), `rope` (up grabs it: hand over hand, jump off sideways) and `bars` (rising into them it hangs and travels under them); grip on any tile type: `friction` (ice: .15), `carry` (a conveyor), `bounce` (a spring), `crumble` with `respawn` (`level.crumble`, `level.update(dt)` each step); `hero.swingFrom(x, z)` and `hero.release()` (a pendulum from a grapple point or a whip's ring, pumped with left and right, let go with its speed); `level.drawWater(r)` draws water see-through over what swims in it.
- **Animation**: the Humanoid's poses for the new moves: crawling (prone, elbows and knees working), swimming (level in the water, arms stroking, legs fluttering), swinging (hands up on the rope or the bars, the body hanging along it), hand over hand along bars; hanging and climbing a ledge (there before) now from the Platformer's `rigState()`.
- **Engine**: the `rooms` module (`engine/modules/rooms.js`, after either edition; its manual 1,089 of 1,500 tokens): `E.World`, rooms on a grid of screens (PlatformMaps, or TileMaps with `view: 'top'`), an open edge a door to the room past it and an edge with no room past it a wall; crossing slides the last screen away or fades through black, keeps the hero's height or column and its speed, and sets the camera's bounds; `world.seen` and `world.here`, the explored map (`drawMap(g, x, y, cell)`: the cells, the rooms' walls with gaps at their doors, the save and boss rooms, the hero blinking; `shellMap()` for `E.Shell`'s minimap); gates (a tile type with `gate: 'dash'` or `'key:red'`, solid until `world.give(name)`, then open in every room); `save(hero, extra)`, `load()`, `clear()` in `E.store`.
- **Engine**: the METROIDVANIA kit (`#metroidvania`, `src/starter/25-metroidvania.js`, family PLATFORM): a station buried in a moon, twelve rooms in four areas (caverns, a flooded shaft and a shrine under the water, a tower open to the sky, a laboratory); the SPRING BOOTS (a second jump: the green hatch and the tower's climb) and the PHASE DASH (the blue hatch); an arm cannon aimed eight ways (the run-and-gun recipe: up, the diagonals, down in the air, low crouched; a held button stands still to aim) with a charged shot, and a lash (it cuts, knocks shots away and catches rings to swing from; on a touch screen FIRE lashes beside a foe); crawlers, flyers that drop from the ceiling, turrets, drones; the CARAPACE (armored in front, it charges and is dazed by the wall it hits) and the WARDEN (an eye behind plates that part, a fan of orbs, a beam along the floor once hurt), each sealing its room and framed by the camera; the map screen and a corner map; a save room and a recharge station; an item's banner; its own two songs; deep links `#metroidvania/miniboss`, `/boss` (a practice with the abilities given), `/map`; touch: the stick (it aims), JUMP, FIRE, DASH (once found) and MAP.
- **Tools**: the `traversal` suite (`tools/traversal-test.mjs`, its fixture `tools/fixtures/traversal.html`): each of the twelve moves filmed twice from one seed, the same pixels, and seen to happen; the contract test's traversal group (each move in numbers, and none without its option) and rooms group (doors sideways, down a hole and up through one, an open edge a wall, gates, the explored cells, a save that loads back). `kits-test`'s `BOTS`: the metroidvania's bot plays the route by the keys from the landing site to the WARDEN and beats it, the map filling in as it goes, and its save loads back. The phone test's case 12 (three thumb-sized buttons; the stick walks and aims; JUMP; MAP opens and closes the map).
- **Tools**: the Labs page: the metroidvania kit, and a card To check: does it feel like Super Metroid?
- **Docs**: the API card (the Platformer's further moves, the playbook's Metroidvania row, the module's line), `AI_GUIDE.md` (the further moves, the Metroidvania recipe with the eight-way aim, the modules), README (the slices, genre coverage), `docs/HANDOFF-GENRES.md` (M5 as built).
- **Docs**: sizes at v0.67.0, cl100k: shooter 214,734 (D52), metroidvania 204,874 (D52), adventure 200,860 (D52), brawler 198,082, arcade 197,512, RPG 195,399, roguelike 191,038, platformer 190,634, fighting 186,409, animation lab 186,244, stealth 185,465, puzzle 177,311; 3D 220,734, 215,541, 290,518; the compact edition 469,461, the reference 600,644; the API card 17,216, the index 45,741; the kits 7.46 MB. The kits that carry the Platformer (platformer, fighting, metroidvania) carry its further moves, about 4,500 more; every other kit about 1,040 (the card, the platform map's crumbling and water).

## 0.66.1 (2026-10-28)

The genre plan's Milestone 4, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M4 row with its two commits (4a `5aa84f1`, #162; 4b `bf263aa`, #163), its sizes, `test:changed` for each, the full `npm test` on `main` after each merge, and what is left (the owner's three checks on the Labs page).

## 0.66.0 (2026-10-28)

Fighting: the genre plan's Milestone 4, its second half (4b): the fight module and the FIGHTING kit. Every other kit plays as before.

- **Engine**: the `fight` module (`engine/modules/fight.js`, after the full engine): `E.Fighter`, a Platformer on an `E.FightStage` with a Humanoid: moves on `E.MOVES` names with frame data in frames at 60; hurt boxes from the rig's joints each step and a hit box from the striking fist or foot; hit- and block-stun; mid, low, overhead and throw guards; chip damage; throws and command grabs; cancels into specials once a move connects; juggles (three at most); knockdowns and an invulnerable rise; specials by motion (`'236'`, `'623'`, `'41236'`, `'236236'`, read at the 120 Hz step and mirrored by facing) or by charge (`'46'`, `'28'`); a super meter (a super's flash and freeze); projectiles on `E.Bullets`, one at a time, that cancel each other; teleports; the frame data of its last move (`f.last`). `E.Match`: rounds, the clock, K.O. in slow motion, time over, perfect, win poses, the HUD (life with its drain, the timer, round markers, meters, combo counts; below a phone's corner button) and training (the dummy standing, crouching, jumping or guarding; the boxes; the frame data; player 1's inputs in numpad digits). `E.FightAI({ level, seed })`: a CPU with a reaction time that guards, anti-airs, throws, confirms hits into specials and keeps its range, from its own `E.rng`. `E.FightSelect`: a character select by keys, pads or taps. `E.FIGHT_KEYS`: U, I punch, J, K kick (a pad's X, Y, A, B).
- **Engine**: the FIGHTING kit (`#fighting`, `src/starter/55-fighting.js`, family FIGHTING): RYO the all-rounder (a fireball, a rising uppercut, a spinning kick, a great fireball super), GORM the grappler (a spinning slam, a charged shoulder, a lariat, an overhead axe kick, a super slam), VEX the fast one (a teleport, a flip kick, a dashing elbow, a whirlwind super); a temple courtyard at dusk with a crowd that cheers the blows; VERSUS (a second player joins by keys or a pad; a mirror match gives player 2 the second palette), ARCADE (the other two, then a shadow, each CPU stronger), TRAINING; deep links `#fighting/versus`, `/arcade`, `/training`; touch: the stick (motions work on it) and four buttons, upright at 1.8x; its own song.
- **Tools**: the `fight` suite (`tools/fight-test.mjs`): motions at 120 Hz and mirrored by facing; mid, low and overhead guards; two players on one keyboard and on two pads fight to a KO; the CPU's matches repeat; training's frame data and dummy. The phone test's case 11 (a tap picks a fighter; four thumb-sized buttons; the stick walks; a quarter circle on it and LP throw a fireball, upright and on its side). `kits-test`'s `BOTS`: two CPUs fight a match twice, the same.
- **Tools**: the Labs page: the fighting kit, and a card To check: does it feel like Street Fighter?
- **Docs**: the API card (the playbook's fighting row, the module's line), `AI_GUIDE.md` (the fighting recipe, the modules), README (the slices, the kits, genre coverage), `docs/HANDOFF-GENRES.md` (4b as built).
- **Docs**: sizes at v0.66.0, cl100k: shooter 213,698 (D52), adventure 199,824, brawler 197,155, arcade 196,476, RPG 194,363, roguelike 190,001, animation lab 185,208, platformer 185,108, stealth 184,429, fighting 180,786, puzzle 176,275; 3D 219,746, 214,553, 289,530; the compact edition 433,958, the reference 560,137; the API card 16,879, the index 44,608, the fight manual 1,473 of 2,500; the kits 6.90 MB.

## 0.65.0 (2026-10-28)

Two to four players on one machine: the genre plan's Milestone 4, its first half (4a). A game of one plays as before (every kit filmed beside v0.64.0: the same pixels).

- **Engine**: players (section 10j, on the diet): `game.players` (`[game.input, ...]`, each an input with this API, `player`, `name`, `color` from `E.PLAYER_COLORS`, `device`); `game.allowJoin({ max, onJoin })` lets them in by Start on a gamepad no one holds or 2 on the keyboard, player 2 then taking the keyboard's right half and player 1 the left (`Input.halfKeys(preset, side)`: each half's moves and menu keys, the preset's other actions on its buttons in turn); `game.addPlayer({ pad } | { keys: 'right' })`, `game.removePlayer(p)`. Player 1 reads no pad another holds; the Start that joins is neither a pause nor the new player's first press. Per player: input history (`input.motion` and `input.sequence` read each player's own), prompts (`input.label`), the pause (P2 PAUSED, Paused by P2), a lost controller named by its player, a page each on the Controls screen; `E.Menu` and the starter's menus read every player (`input:` picks one).
- **Rendering**: split screen: `game.splitScreen(n, { layout: 'auto' | 'columns' | 'rows' | 'grid', follow })` (2 to 4) draws the scene once per viewport, clipped from the pass's start, each with its own eased camera inside the bounds (`game.viewports[i].follow(t)`, `.focus(x, y)`; `r.viewport` says which), then `scene.hud(r)`, the dividers and the frame's notes over the whole screen; GPU lighting off while split; a scene's start ends it.
- **Engine**: the BRAWLER's second player: Jack (in blue) drops in by Start on a pad or 2 on the keyboard, on one screen framed to both (`cam.frame`); foes go for the nearer hero; a second panel; the round card shows each player's keys (the preset trimmed to punch, kick, sweep and jump, so each half reads in that order); game over when both are out. Its `bot()`: both heroes clear the first wave.
- **Engine**: the PUZZLE's VERSUS (once a second player is in): two fields side by side from one seed, each played by its own player; two lines or more send rows across (2: 1, 3: 2, 4: 4), rising at the other's next piece; the first to top out loses; a rematch. The menu shows each player's keys.
- **Tools**: the `players` suite (`tools/players-test.mjs`, its fixture `tools/fixtures/players.html`): one player unchanged, two on one keyboard, joining by keys and by a pad, who paused, a lost controller, split screen in columns and a grid of four, and a filmstrip of two cameras. `replay` and `determinism` gain a two-player brawler run; `kits-test`'s `BOTS`: the brawler's two heroes clear a wave, and two CPUs play puzzle versus to a loss.
- **Tools**: the Labs page: two cards To check: the brawler with a friend, and puzzle versus.
- **Docs**: the API card (players and split screen; the playbook's beat-'em-up and puzzle rows), `AI_GUIDE.md` (Players, and the beat-'em-up and puzzle recipes), README (the slices, input), `docs/HANDOFF-GENRES.md` (4a as built), `docs/DECISIONS.md` (D53: `allowJoin` and `splitScreen` for the plan's `join` and `split`).
- **Docs**: sizes at v0.65.0, cl100k: shooter 213,525 (D52), adventure 199,651, brawler 196,982, arcade 196,303, RPG 194,190, roguelike 189,828, animation lab 185,035, platformer 184,935, stealth 184,256, puzzle 176,102; 3D 219,613, 214,420, 289,397; the compact edition 415,182, the reference 536,162; the API card 16,746, the index 42,427; the kits 6.45 MB. Each kit about 1,050 more (the core's input and renderer for players, the card); the brawler and the puzzle about 5,000 (they carry the players section).

## 0.64.1 (2026-10-28)

The genre plan's Milestone 3, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M3 row with its commit (`9841a03`, #160), its sizes, `test:changed` (the two suites fixed in #160), the full `npm test` on `main`, and what is left (nothing).

## 0.64.0 (2026-10-28)

The arcade: the genre plan's Milestone 3 (`docs/HANDOFF-GENRES.md`): the arcade module, a cabinet of three classics, and the shooter's arcade frame and horizontal stage. Every other kit, and the shooter's vertical stage, play as before (filmed beside v0.63.1: the same pixels).

- **Engine**: the `arcade` module (`engine/modules/arcade.js`, after either edition): `E.Arcade`: scores that float up where they were won, extra lives at thresholds or every so many points, two players taking turns ("PLAYER 2, READY!", each one's stage kept), credits (free play by default) and a continue countdown, high-score tables per game and mode (`E.store`, kept for the visit where storage is blocked) with initials on a letter wheel (keys, pad, or taps a thumb's size on that screen), stage cards and words, the attract mode (a demo after the idle time, the table, the title); its HUD drawn in the playfield's box.
- **Engine**: the ARCADE kit (`#arcade`, `src/starter/32-arcade.js`, family ARCADE): a cabinet title (left and right pick a game, up and down one or two players, a tap on a cabinet plays it) and three games, each its own scene, table, demo and remaster with the classic look on C (a pad's Y) and in Settings: MAZE (`#arcade/maze`: E.gen's braided maze mirrored, a GridMover with a turn asked early kept, four wisps (Blob rigs) each choosing its target its own way through scatter and chase, lantern seeds that turn them blue, the tunnel's wrap-around, a berry, an intermission script), FORMATION (`#arcade/formation`: moths flying in on Catmull paths, forming up, diving on paths of their own, turned by `rot`; a gas giant and nebulae in the remaster), ROCKS (`#arcade/rocks`: turn, thrust and drift, rocks that split, a saucer, hyperspace, glowing vector lines across the wrapping edges of the whole screen). Cabinet art on a wide screen's sides, a marquee and control panel on a tall one; an original song.
- **Engine**: the SHOOTER grows: the arcade frame (the last ship lost brings a continue; a score that makes the table brings initials, then the table) and a horizontal stage (`#shooter/horizontal`, and after the fortress): a crystal cavern with rock above and below, capsules and a power bar of six (SPEED, MISSILE, DOUBLE, LASER, OPTION, SHIELD), up to four options following the ship's past path, guns on the rock, a cruiser looping a closed path while the scroll waits, a core battleship behind three walls; its own song.
- **Engine**: deep links into a part: `#<slice>/<part>` starts the slice with `{ part }` (`#arcade/maze`, `#shooter/horizontal`); the kits' headers name them.
- **Engine**: the roguelike and the puzzle each play a song of their own (the step sequencer's format), as the plan's kits should (3.4).
- **Tools**: `kits-test`'s `BOTS`: the cabinet's bot clears a maze, two waves of moths and two of rocks, and leaves the cabinet alone to see a demo, its table and the title again; the shooter's flies the horizontal stage to its core. The phone test plays each arcade game from the cabinet to its table by taps, keys and a pad (the continue on keys), checks the attract mode, and takes the shooter through its continue and the horizontal stage's initials by taps. The contract tests hold the arcade module on both editions (extra lives, turns, the continue, initials into a table, the attract mode's phases).
- **Tools**: D52: the 2D kits' budget (200,000 tokens) suspended until the owner's review pass: `doctrine-check` and `kits-test` report a kit over it instead of failing (the shooter, 212,477).
- **Tools**: the Labs page: the arcade kit, the shooter's stage 2, and two cards To check: how the three classics feel, and the horizontal stage.
- **Docs**: the API card (the playbook's shoot-'em-up and golden-age arcade rows, the module's line), `AI_GUIDE.md` (the shoot-'em-up recipe with its horizontal stage, a golden-age arcade recipe, the module), README (the slices, the kits, genre coverage), `docs/HANDOFF-GENRES.md` (M3 as built), `docs/DECISIONS.md` (D52).
- **Docs**: sizes at v0.64.0, cl100k: shooter 212,477 (D52), adventure 198,627, arcade 195,251, RPG 193,137, brawler 192,158, roguelike 188,738, animation lab 184,009, platformer 183,881, stealth 183,192, puzzle 170,817; 3D 218,463, 213,270, 288,247; the compact edition 408,362, the reference 527,040; the API card 16,427, the index 41,766, the arcade manual 818 of 1,500; the kits 6.39 MB.

## 0.63.1 (2026-10-28)

The genre plan's Milestone 2, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M2 row with its commit (`d74f49f`, #158), its sizes, the full `npm test` on `main`, and what is left (the new kits' own songs, in M3).

## 0.63.0 (2026-10-28)

Grids, turns and generated maps: the genre plan's Milestone 2 (`docs/HANDOFF-GENRES.md`): the first modules and two kits.

- **Engine**: the `grid` module (`engine/modules/grid.js`): `E.Grid` (square, or hex with offset rows or columns; `E.Grid.from(map)`), neighbours and distances, A* paths with ties broken one way, Dijkstra's reach with climb and drop limits, lines, symmetric shadowcasting fields of view, flood fills and groups; `E.Fog` (unseen, seen, visible, drawn over the walls too) and `E.tint`; `E.GridMover` (Pac-Man's buffered turn, Sokoban's push); `E.Turns` by speed, charge time, phase or ATB. It loads after the agent edition too.
- **Engine**: the `gen` module (`engine/modules/gen.js`): rooms and corridors, BSP, caves (kept connected), mazes (backtracker, Prim, braided) and Poisson scatter, from a seed, as ASCII rows a TileMap reads; `E.gen.mark` puts spawns on the floor.
- **Engine**: the ROGUELIKE kit (`#roguelike`, `src/starter/45-roguelike.js`): ten generated floors of a torch-lit crypt to the Amulet, fields of view and fog, turns by speed (bats twice, slimes half), bump to attack, potions, scrolls of mapping and better blades, stairs through an iris, a tombstone and the results; rigs that walk each step in a tween; tap a cell to walk, the stick to step, WAIT, POTION and SCROLL.
- **Engine**: the PUZZLE kit (`#puzzle`, `src/starter/35-puzzle.js`): falling blocks by today's rules (a bag of seven, the next five, hold, a ghost, SRS kicks, lock delay with 15 resets, the guideline's speeds) and falling pairs that pop in groups of four and chain; a mascot that cheers and winces; drag, tap and flicks on a phone.
- **Tools**: `kits-test` runs each slice's `bot()` to its end (`BOTS`: the roguelike wins its ten floors, the puzzle clears lines); the phone test taps the new titles, walks the roguelike by a tap, and drags and taps the puzzle; the contract tests hold the grid's paths, reaches, fields of view (symmetric), hex, turns and movers, and `gen`'s same rows for a seed, every floor joined.
- **Tools**: the Labs page's **To check** section: what only a person can judge (feel, sound, a real phone), each card with what to do, what to look for and a button to the place (`src/labs.json` `check`: `at`, `look`); the first two are the new kits.
- **Docs**: the API card (the playbook's puzzle and roguelike rows, a line per module), `AI_GUIDE.md` (the modules, the puzzle and roguelike recipes), README (the slices, the kits, genre coverage), `docs/HANDOFF-GENRES.md` (M2 as built: `fog.draw` and `E.tint` for `r.cells`, the kits' files and families, the bots in `kits-test`).
- **Docs**: sizes at v0.63.0, cl100k: adventure 198,265, shooter 195,173, RPG 192,775, brawler 191,796, roguelike 188,087, animation lab 183,647, platformer 183,519, stealth 182,830, puzzle 170,154; 3D 218,263, 213,070, 288,047; the compact edition 368,720, the reference 485,534; the API card 16,227, the index 40,614, the grid manual 1,216 of 2,500, gen's 691 of 1,500.

## 0.62.1 (2026-10-28)

The genre plan's Milestone 1, closed: its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: section 9's M1 row with its commit (`c9de150`, #156), what `npm run test:changed` caught on the way, and the full `npm test` on `main`.

## 0.62.0 (2026-10-27)

Motion, timing and presentation in the core: the genre plan's Milestone 1 (`docs/HANDOFF-GENRES.md`). Every existing kit, Emberdeep and the reference editions play exactly as before (filmed beside v0.61.1: the same pixels).

- **Engine**: tweens (`game.tween(target, { x: 10 }, seconds, { ease, delay, repeat, yoyo, onDone, keep })`) and scripts (`game.script(function* () { yield .5; yield E.until(fn); yield tween; yield E.all([...]); })`) on game time: paused with the game, still in hit-stop, slowed by `timeScale`, ended with the scene unless kept, the same timeline at 60, 90, 120 and 144 Hz.
- **Engine**: `E.ease` has Penner's set (sine, quad, cubic, back, elastic and bounce, each in, out and inOut; `linear`).
- **Engine**: `E.Path(points, { closed, smooth: 'catmull' })`: `length`, `at(d)` (a point and its heading by distance along), `nearest(x, y)` (a racer's progress), `draw(r)`.
- **Rendering**: sprite frames (`E.anim(frames, fps, { loop, pingpong })`, or a sheet cut into frames, drawn by `r.sprite(x, y, z, anim, { t })`), turns and scale (`rot`, `steps`, `scale` on `r.sprite` and `px.sprite`: whole pixels, cached in 16 or 32 steps; `E.rotSprite`) and palette swaps (`E.recolor`).
- **Engine**: wrap-around: `E.wrap(v, lo, hi)`, `E.wrapDiff(a, b, size)`, and `wrap: [w, h]` on `r.sprite` and `r.actor`.
- **Rendering**: transitions: `game.go(name, data, { fade: 'wipe' | 'iris' | 'mosaic' | 'swirl' | 'dissolve' | 'white' | 'black', seconds, at })`; reduce motion makes each a plain fade; a number of seconds still works as before.
- **Rendering**: weather: `game.weather = { kind: 'rain' | 'snow' | 'ash' | 'leaves' | 'sand', amount, wind, lightning }` falls through the world's height in ground views and in parallax layers in side and overhead views, splashes or settles on the floor, flashes and thunders; its own seeded stream (never `Math.random`), pooled, ended with the scene. `E.WEATHER` holds the kinds.
- **Engine**: input sequences: `input.motion('236', 'attack', { facing })` in numpad notation, mirrored by facing; `input.sequence([...], { window })`; `input.history`, the last second of directions and presses.
- **Engine**: the camera: `cam.window` (a dead zone), `cam.snapY` (height followed on landing), `cam.frame(targets, { margin, zoom })` (several things kept in view, zooming out as they part).
- **Rendering**: a screen filter, a standard setting under Display: clean, scanlines or CRT, drawn as the picture reaches the canvas, never on the game's buffer, and off under a test harness.
- **Tools**: each of these is a section of the core on the kit diet (1b, 2b, 10d to 10i), reached from the core through `HOOKS` and `FADES`; `DIET`'s new `names` match the strings and option names a kit writes (`{ fade: 'iris' }`, `{ rot }`). Every kit grows by about 2,500 tokens (1,600 of engine, 1,000 of card): adventure 197,866 (2,134 left), shooter 194,774, RPG 192,376, brawler 191,397, animation lab 183,248, platformer 183,120, stealth 182,431; 3D 218,048, 212,855 and 287,832; the compact edition 341,273, the reference 453,334.
- **Tools**: `tools/motion-test.mjs` (the `motion` suite, `npm run test:motion`) films every transition beside the plain fade (and the plain fade under reduce motion), every weather twice from one seed, and the screen filter on the canvas; the contract tests hold the tweens, scripts (at four refresh rates), paths, frames, turns, swaps, wrap-around, sequences, camera and weather. `api-index` reads members put on a namespace with `Object.assign(ease, { ... })`. A card's example named `full-...` (```` ```js full-script ````) runs in `contract-test` on the full engine only.
- **Docs**: the API card (Motion and timing; 16,012 of 18,000 tokens), `AI_GUIDE.md` (motion and timing, the camera's window and framing, special moves, transitions, the screen filter), the agent edition's header (what the full engine adds), `docs/HANDOFF-GENRES.md` (M1's facts as built).

## 0.61.1 (2026-10-27)

The genre plan's Milestone 0, closed: its facts checked against the code as merged, and its progress row complete.

- **Docs**: `docs/HANDOFF-GENRES.md`: every statement of 3.2, 3.3 and M0 checked against v0.61.0, and six put right (the tools that take the engine's loader, which include `test-run` and not `kits-test`; a module's words for loading after the full engine only; the API card's one line on modules until the first module; every kit keeping the shapes and the core library; `kits-test`'s play-to-the-end check arriving with M2's first new kit; a kit's engine on the diet in the words table); section 9's M0 row with 0b's commit (`2ad644f`) and the full `npm test` on `main`.

## 0.61.0 (2026-10-27)

The kit diet: every 2D kit under 200,000 tokens, pixel for pixel as before, each slice with a proof; the starters' title menus by family. The second half of the genre plan's Milestone 0 (`docs/HANDOFF-GENRES.md`).

- **Engine**: the Platformer is a section of its own (16b, a banner in the core; nothing else moved), so the kits that never use it leave it out.
- **Tools**: the kit diet (`DIET` in `tools/build.mjs`, `tools/diet.mjs`): a genre kit's engine leaves out the core's sections its game never calls, worked out from the code (acorn reads the core's top-level statements; what the kit's shell, slice, sets, modules and, in 3D, the 3D engine call). A statement that extends a left-out class goes with it; a name kept code needs stays; what goes answers with a stub that warns once (a constructor throws) naming its section and the full engine. The kit's header lists what it left out and names the file for a game of several genres. 2D kits: adventure 195k tokens (was 203k), shooter 192k (208k), RPG 190k (205k), brawler 188k (205k), animation lab 181k (195k), platformer 180k (207k), stealth 180k (188k); 3D kits 215k, 210k and 285k (241k, 236k, 311k).
- **Tools**: `tools/kits-test.mjs` (the `kits` suite, `npm run test:kits`): every kit's title and its slice's proof run twice (the same hash, no errors, no stub called), the 3D kits served on WebGL 2, the reference editions' title menu (families, keys, a click, scrolling); `--compare <dir>` films every 2D kit's title and play beside another build's and fails on any pixel that differs. Every 2D kit, filmed beside the build without the diet: the same pixels.
- **Tools**: `doctrine-check` holds the kits' budgets (D51): every 2D kit at most 200,000 cl100k tokens, a 3D kit no larger than at v0.59.3. A change to a module runs the `kits` suite on the kits that carry it; acorn is a declared dev dependency; `npm run test:modules`.
- **Engine**: each 2D slice has a proof, `run(n)` (`__game.scenes.adventure.run(600)`): n fixed steps of scripted play (a walk with the sword out, a run through the graveyard, a bombing run, the party on AUTO, a street fight, the animation list, the rooftops) from a seed, a hash of how it went, the same every time; the shell's `proof()` enters the slice afresh on a game clock at 0 with `Math.random` seeded, and puts back what a slice keeps between visits (the platformer's rig, the animation lab's rigs and choice).
- **Engine**: the starters' title menus group the slices by family under headings (ACTION ADVENTURE, PLATFORM, FIGHTING, ARCADE, RPG, TOOLS; in 3D ACTION ADVENTURE, PLATFORM, SHOOTER): two columns on a wide screen, one column that scrolls where it won't fit (keys, the mouse, a tap; a finger drags the list), the lineup of heroes still the art. A genre kit of one slice keeps its plain menu and its title as it was.
- **Docs**: D51 (the kit diet, superseding part of D32; the kits' budgets); `AI_GUIDE.md` (Kits and the diet: which file for which game, the proofs); `README.md`'s editions table with the new sizes and the new suites; the plan's design (3.3, the diet as built; 3.5, a core addition that not every game calls gets a section of its own on the diet) and its progress.

## 0.60.0 (2026-10-27)

Engine modules: a general system in a small file of its own that loads after the core, so a game carries only the systems it uses. The first half of the genre plan's Milestone 0 (`docs/HANDOFF-GENRES.md`); no game changes.

- **Engine**: `engine/modules/<name>.js`: one general system each, loaded after the core (or the agent edition, where its manual says so) and attached to `My3D2dge`; its header is its manual, with what it holds, its API, a complete example and its rules (`engine/modules/README.md`). `dist/my-3d2dge.js` and `.min.js` are the core and every module in one file; the reference editions carry every module; a kit carries the modules its slice names in its header (`@modules grid gen`), each in a `<script>` of its own after the engine, and says so in its header; the examples pages carry none.
- **Tools**: `tools/engine-lib.mjs`: the engine as every tool loads it, the core or the agent edition and then its modules in order (the build, `contract-test`, `standard-test`, `agent-test`, `api-index`, `assets-test`, `doctrine-check`). `contract-test` runs each module's examples on the editions it loads after, `agent-test` runs them after the agent edition (`--only modules`), the API index gives each module a section after the core's, and `doctrine-check` counts each module's manual (1,500 tokens; 2,500 for the four the plan names) and holds modules to the public API.
- **Tools**: `tools/modules-test.mjs` (the `modules` suite): a fixture module and a slice that names it (`tools/fixtures/`, never shipped) go into a copy of the repository, and the repository's own tools prove the whole path there: built into its kit and left out of the others, its manual counted, its example run on both editions, its names indexed, its kit played.
- **Tools**: `npm run test:changed`: a change to a module runs `contract`, `agent`, `modules` and the phone test of the kits that carry it (`kit3d` for a 3D kit), not every suite; the engine's loader runs everything, as the engine does. `tools/version.mjs` keeps the modules' manuals in step.
- **Tools**: the handoff package's `my-3d2dge.js` is the core and every module, and `modules/` holds each on its own, to load after the agent edition.
- **Docs**: the budgets for the genre plan (D50): the API card 18,000 tokens (was 15,000), the API index 52,000 (was 40,000), a module's manual 1,500 (2,500 for `grid`, `fight`, `strategy` and `physics`); the agent edition's header stays at 10,000 and has a line on modules. The API card, `AI_GUIDE.md` (Modules), `README.md`, `CLAUDE.md`, `DOCTRINE.md` and the handoff README say how modules load and where they go.

## 0.59.4 (2026-10-27)

The plan for every genre of the era, from the early 80s to the late PS1: what the engine and its kits have, what each family of genres lacks, and the milestones that add it, each with a kit to copy.

- **Docs**: `docs/HANDOFF-GENRES.md`: a review of v0.59.3 against the era's genres (what converts well, what backs each family today, what it lacks, measured: the kits' tokens, the manuals' budgets, one player, a floor baked whole, the music on the audio clock), the design rules (general systems in small module files that only the kits using them carry; a kit diet that leaves out the core's sections a slice never calls, so every 2D kit fits 200,000 tokens), and seventeen milestones (M0 to M16) from room to grow to the 3D era, each with what it adds, when it is done, its effort level and its `/goal` line.
- **Docs**: `README.md`'s genre coverage points to the plan.

## 0.59.3 (2026-10-27)

The site costs less to keep on Vercel, and plays the same: Vercel bills every deployment it keeps by its size (about $1.24 a day by late October, nearly all of the bill past the plan), so previews are a third the size and a push that changes nothing the site serves deploys nothing.

- **Tools**: `tools/stamp.mjs` leaves the CMU library (`examples/cmu-lib`, about 68 MB of a deploy's 100, unchanged since v0.26) out of a preview (`VERCEL_ENV`, or `--preview`); `vercel.json` sends a preview's `/cmu-lib/` requests to the live site's copy, so the Mocap Lab's library plays there as before (D49).
- **Tools**: `vercel.json`'s `ignoreCommand` skips a deployment when nothing it serves changed since the branch's last one (only `src/` and `tools/`, which the deploy leaves out, other than `tools/stamp.mjs`); a branch's first deployment, or a commit it can't compare, still builds.
- **Docs**: `README.md` says what a preview leaves out and which pushes deploy nothing; `docs/DECISIONS.md` logs D49.

## 0.59.2 (2026-10-21)

The docs brought up to date with v0.59.1: the 3D labs are gone, the 3D shooter kit is listed, the sizes are measured again.

- **Docs**: `DOCTRINE.md`'s principles table no longer names the 3D labs (deleted in v0.51.4, D44) or a grandfathered `_w`: the 3D proof hash and the banned-API check are `kit3d-test`'s, and v0.52.0 emptied the private-name list; its benchmark paragraph says the next plan took its themes up and no run has measured it yet.
- **Docs**: `README.md` and `AI_GUIDE.md` list the 3D shooter kit beside action and platformer (`#shooter`); README's token counts are measured at v0.59.1 (2D kits 188k to 208k, 3D kits 236k to 311k, compact 329k, full 434k, the agent edition 105k), and it says Temporary is empty and the API card is just under its 15,000.
- **Docs**: `docs/DECISIONS.md` marks D3, D9 and D27 superseded in part by D44 (the 3D labs were deleted, not kept or moved) and finishes D6's progress (v0.52.0); `docs/FEEDBACK-LOG.md` has a watch theme for the look's remainder (F4.2's merging figures, F6.2's empty fields); `docs/ASSET-IMPORT.md` names the 3D engine where it named the deleted prototypes.
- **Docs**: `docs/HANDOFF-COOP.md`, still on hold, says what changed since it was written and gives its budgets as of v0.59.1 (the API card has 40 tokens left for co-op's one line).

## 0.59.1 (2026-10-19)

The next plan is done: folded into the docs and deleted.

- **Docs**: `docs/HANDOFF-NEXT.md` is deleted (`git show 4746448:docs/HANDOFF-NEXT.md` reads it). Its calls are D45 to D48, its user-facing parts are in `API.md` and `AI_GUIDE.md`, and what it left out is in `docs/FEEDBACK-LOG.md` as themes of their own: a dialogue piece in `E.Shell` and a turned three-quarter view as **watch**, pitched roofs for `TileMap` types and GPU lighting in headless checks as **deferred**. The five threshold themes there say **taken up**, and each point they counted says the version that took it up.

## 0.59.0 (2026-10-19)

Phase 7 of the next plan: `E.Mover` glides, and climbing, gliding and sprinting spend stamina (D48).

- **Engine**: `glide: true`: a jump press in the air, `glideMin` over the ground, opens a glide (`mover.gliding`): it sinks at `glideSink`, flies at `glideSpeed`, takes no fall damage, rises over an updraft (`lift`: a speed, or a function of the mover), and closes on a press, on landing, or at a wall (a climber takes hold). `rigState()` hangs the rig under it, hands up.
- **Engine**: `staminaMax`: climbing, climb jumps, gliding and sprinting spend `mover.stamina` (`tire`), standing refills it (`staminaRegen`); at 0 it lets go of the wall, closes the glide and can't sprint (`mover.exhausted`) until a third is back.
- **Engine**: the template game's hero glides off the roof under a sail it draws, with a stamina bar in its HUD.
- **Tools**: `tools/contract-test.mjs` checks opening a glide, its sink, an unhurt landing (where a plain fall hurts), closing it with a press, an updraft, and stamina running out on a wall and refilling.
- **Docs**: `API.md` and `AI_GUIDE.md` describe both; `API.md`'s controller diagnostics are the index's now, for room (14,960 tokens of 15,000).

## 0.58.0 (2026-10-19)

Phase 6 of the next plan: `E.Mover` climbs any wall (D48).

- **Engine**: `climbAny: true`: a jump press at a wall too tall for a ledge, on the ground or in the air, takes hold (`mover.wall`); the stick climbs it as the screen shows it (up the screen is up the wall; an AI's intent: `move: [along, -up]`), it turns outer and inner corners, a jump press leaps up (`E.ACTIONS.climbJump`, which ends on the wall: an action's `hold: true`) or, pulled away, pushes off; near the top it pulls up (`climbUp`), at the floor it stands, crouch lets go. `map.wall(from, dir)` gives the face ahead: its point, normal, top and facing.
- **Animation**: the rig's climb cycle advances with sideways speed too, so climbing along a wall animates.
- **Engine**: the STEALTH slice's hero climbs any wall (`climbMax: 30`: higher roofs are climbed, not jumped onto); the template game's hero is a Mover that climbs its roof, where it had its own pull-up on a Body (its test takes hold, climbs and pulls up).
- **Tools**: `tools/contract-test.mjs` checks taking hold (and a plain Mover jumping instead), climbing up and along, rounding a corner, the climb jump, pulling up, letting go, and `map.wall`.
- **Docs**: `API.md` and `AI_GUIDE.md` (Mover and actions) describe it.

## 0.57.0 (2026-10-19)

Phase 5 of the next plan: walls with depth, and the floor to the edge of the screen (D47).

- **Rendering**: wall faces take the shapes' view-relative light (`map.light` null, the default; a direction still works): in iso the south face is lit and the east face a shade darker, where both were the same colour, and in three-quarter the front faces sit below the bright tops. A lit edge runs where a top meets each face drawn below it, and a crease down each corner where two faces meet, so a pillar in front of a wall no longer reads as one flat plane (F4.2). Both editions.
- **Rendering**: a ground view's floor runs on past the map: the floor mirrored back over the edge, darkening over 48 units into one colour that fills the rest of the screen (`map.outside`: a colour, or `false` for the old empty edge). No ground view shows a void around the level (F6.2's black void under a clipped sky). Both editions.
- **Docs**: `API.md`'s backdrop step is for side views (a ground view's floor runs to the screen's edges) and names `outside`. The template and the STEALTH slice no longer draw a sky the floor covers.

## 0.56.0 (2026-10-19)

Phase 4 of the next plan: the x-ray shows a hidden body clearly, and only when something hides it (D46).

- **Rendering**: in the smooth style (`E.style.trans` 'alpha', the default) the hidden part is a translucent tint (45%) with a 1-px outline (`r.xrayOutline`, '#e8fdff'; `xray.outline: false` for none); the checker stays for 'dither'. An occluder rising less than `E.HEIGHTS.level` (8) above the actor's feet hides nothing (the roof it stands on, a cut-down wall), and a prop or shape lower than `E.HEIGHTS.chest` (22: grass, crates, barrels) doesn't hide by default (`hides: true` still makes one). Judges took the old cyan dither on the hero's feet for a glitch (F2.2, F3.2).
- **Tools**: `tools/contract-test.mjs` pins the rules: a tall wall or a pillar shows the hero through it, a cut-down wall or low grass doesn't, `hides: true` makes a low prop hide, the outline is on by default and `outline: false` leaves it out.

## 0.55.0 (2026-10-19)

Phase 3 of the next plan: `E.Shell` in the template and the stealth starter.

- **Engine**: the STEALTH slice's interface is `E.Shell`'s HTML: the objective with its distance (ABOVE YOU), health as pips, guards down, Hidden, Hunted or Crouched, a Take down or Parry prompt with the player's own key, the keys, toasts for its messages and a results screen at the end. The guards' marks stay in the world. The template game's HUD is `ui.hud` too (the objective with its distance, the alert bar, the keys); its title and end screens stay pixel art.
- **Rendering**: `E.Shell`'s keys row has a dark backing, so it reads over bright walls.
- **Docs**: `AI_GUIDE.md` says when a HUD is pixels and when it is `E.Shell`'s HTML (a modern adaptation), and points to the STEALTH slice; `API.md`'s hand-back checklist says the same. The plan's template line is amended: its end screen stays pixel art, which its headless test presses start on.

## 0.54.0 (2026-10-19)

Phase 2 of the next plan: lighting is a step of the look, shown working where builders copy from (D45).

- **Docs**: `API.md`'s Look target has a step 9, "Light every scene" (canvas lighting in a scene's `enter`, a few lights each draw, `game.enableGPU` for shadows in ground views), and the hand-back checklist says "lights"; the boot and the player's zoom are pointers to `AI_GUIDE.md` now, to make room. `AI_GUIDE.md`'s Lighting says why canvas lighting leads (it draws the same in every browser and check) and how to match the two ambients. The agent edition's header names `game.lights` and `game.enableGPU` among the full engine's extras.
- **Rendering**: GPU lighting falls back to canvas lighting by itself where it can't draw (no WebGPU, still loading, a side view): `game.lights.on` is true then, and `gpu.fallback = false` keeps such frames unlit. A game that only called `enableGPU` had no lighting at all without WebGPU. The fields canvas lighting reads are set and documented (`darkness`, `tint`, `screen`, `r.glowMask`), and `lights.add`'s comment says `color` works in both lightings.
- **Art**: the template game and the STEALTH slice are lit at dusk: an ambient, street lamps (`r.prop('lamp', ..., { light: true })`), the gem's and the ledger's glow, the gate. The STEALTH slice lights on a computer only: the pass costs it 4 to 6 ms a frame (measured: 7.7 ms unlit, 14 ms lit, headless), so a phone keeps its frame rate, as the ADVENTURE slice's Auto lighting does (the phone test's pacing check caught it). The ADVENTURE slice gives its canvas fallback the same mood as its GPU ambient.

## 0.53.0 (2026-10-19)

Phase 1 of the next plan (`docs/HANDOFF-NEXT.md`): the cards answer what the benchmark runs read the engine's source for.

- **Docs**: `API.md` says where to look a name up (grep `API-INDEX.md`, members under instance names, not the engine's source), and gains the facts the runs went to the source for: the rig's traversal keys (`crouch`, `sprint`, `hang` and `hangZ`, `flip`, `land`), the third-person preset's keys and actions, what `map.bounds` returns, the scene fade (`game.fadeTime`, `{ fade: 0 }`), `game.hitstop`, `Dialog`'s modality, its last-page choices and its constructor, and that a hood takes `colors.hair`. The Mover is `mover` on the card and in `AI_GUIDE.md`, as the index files it. Room came from the sessions and motion-clip bullets, now pointers to `AI_GUIDE.md` (14,843 tokens of 15,000).
- **Docs**: the agent edition's header names `API-INDEX.md` (a † marks the full engine's names) and `down` among the rig's keys.
- **Tools**: `tools/api-index.mjs` makes headings of the lettered sections (10c BOOT, 17c MOVER, 17d PERCEPTION, 21c PROPS, 21d SHELL, 21e SHAPES, 21f CORE LIBRARY), which the engine's header cites; they were filed under 10b, 17b and 21b.
- **Engine**: the doc comments the index is built from gain `talk.say`'s `auto`, `modal`, `place`, `y` and `alpha` and when `update` returns true, `rig.update`'s `vz`, `land`, `expr`, `run` and pose `'block'`, `r.actor`'s `emissive`, and the hood's colour.

## 0.52.0 (2026-10-19)

The engine's private names that the engine tier still used are public now, so nothing outside `engine/` reaches past the API: the grandfathered list is empty.

- **Engine**: `game.fail(where, err)` reports an error in game code without stopping the game (logged once, in `game.errors`, on the error panel; it was `_fail`). `game.shownNote` is the note `game.note()` shows, for a game that draws it its own way (was `_note`). `game.audio.applyVolume()` applies `musicVolume`, `sfxVolume`, `volume` and `mute` after setting them directly (was `_levels`). `game.lights.refresh()` rebuilds the darkness bands after `dark`, `levels` or `glow` change (was `_build`). `map.isFront(cx, cy, view)` says which walls cutaway lowers, and a map may replace it (was `_isFront`).
- **Rendering**: `r.actorNow(x, y, z, drawFn, o)` draws an actor at once over what is drawn so far, with `r.actor`'s options (it wrapped `_composite`).
- **Animation**: `rig.solvePose()` sets `rig.J` from the rig's state each step, and a clip player wraps it on one rig (was `_pose`); `rig.lastView` is the view the rig last drew with (was `_lastView`; Emberdeep's own rigs set it too).
- **Emberdeep**, **Mocap**, **Tools**: Emberdeep, the mocap player and the 2D stress test use the public names; `tools/doctrine-check.mjs` grandfathers nothing and points a new use of each old name at its public twin.
- **Docs**: `API.md` names the new members; the body contract (`docs/CHARACTERS.md`) says `this.lastView`.

## 0.51.5 (2026-10-19)

- **Docs**: the next plan (`docs/HANDOFF-NEXT.md`) takes up the five themes the feedback log has at their threshold: lighting's place in the manuals, the cards' part of reading the source, the look (the x-ray, three-quarter walls, the iso void), `E.Shell` in the template and the stealth starter, and climbing any wall and gliding in `E.Mover`. Each is checked against the code and split into eight phases. The feedback log's rows point to it.

## 0.51.4 (2026-10-19)

Temporary is empty: the three prototypes on the Labs page answered their questions and are deleted (D44).

- **Tools**: the 3D Proof (`/lab-3d`), the 3D Prototype (`/stress-world`) and Vesper's interface on `E.Shell` (`/vesper-ui`) are gone with their sources, their checks (`tools/lab3d-test.mjs`, `tools/stress-world-test.mjs`) and their Labs entries. Their addresses lead to the 3D starter (`/3d`) or the Labs page. The 2D stress test's link for chase, first-person and fly cameras opens the 3D starter. `tools/kit3d-test.mjs` checks the vendored libraries' checksums now (`tools/vendor-3d.mjs --check`), and runs when that tool changes.
- **Docs**: `docs/LAB-3D.md` stays as the 3D labs' record and says where their code is in git. `docs/ENGINE-3D.md`, `DOCTRINE.md`, `AI_GUIDE.md` and `CLAUDE.md` stop pointing at the deleted pages. D44 gives the call: none graduates, because each would be a second, private 3D engine held to the engine tier.

## 0.51.3 (2026-10-19)

- **Emberdeep**: the game reads where a point of a rig sits through the public `rig.worldOffset(p)`, not the engine's private `_w` (loot, monsters, bosses, the town's NPCs and held items, the inventory's paper doll); a dead workaround that set every new monster's `stunT` to 0 is gone (`spawnMonster` sets it).
- **Characters**: the body contract names `worldOffset(p)` instead of `_w(p)`: the Codex and Dan rigs, `checkRig` and the template of `npm run new:character` follow it (`docs/CHARACTERS.md`).
- **Tools**: `tools/doctrine-check.mjs` no longer grandfathers Emberdeep's `_w`.

## 0.51.2 (2026-10-18)

- **Docs**: the co-op plan (`docs/HANDOFF-COOP.md`, still on hold) gives each phase the next minor version when it merges: the numbers it first gave them (v0.47.0 to v0.52.0) went to the 3D shooter kit.
- **Tools**: a comment in `tools/build.mjs` no longer says `vendor/` goes with the 3D Proof lab (the 3D engine and its kits load it, D27).

## 0.51.1 (2026-10-17)

Drawing between steps finished, after a review of v0.51.0.

- **Rendering**: between steps the engine also interpolates moving platforms (riders slid on them), each actor's facing, the camera's roll, and orthographic cameras; a cape, hair and a blade's ribbon move with their body (they detached); time stopped (`timeScale` 0) and the frame a hit-stop starts show the last step whole (they were drawn part way, then jumped); a pose `onDraw` changes in place counts as the game's; and the actors' positions are put back even if drawing throws. The shooter shows a hit-stop's first frame whole too.
- **Tools**: `tools/phone-test.mjs` measures the whole real-clock pacing sequence (a light run, then a heavy one) once more when a reading misses: the full suite on v0.51.0 failed once with the screen read as 60 Hz (the light run that reads it fell to 60 Hz on a busy machine); v0.51.0 re-measured only the heavy run.

## 0.51.0 (2026-10-17)

The 3D engine draws every kit evenly at any refresh rate, as the shooter already did.

- **Rendering**: `world.draw` puts the actors and the camera part way between the last two steps (`game.alpha`): the steps run 120 times a second, so a 144 Hz display showed one frame in six again in every 3D kit (measured at 144 Hz, the camera's move from frame to frame varied by 45% in the platformer and the action kit, with 33 of 198 frames repeated; now 2.3% and 4.0%, none repeated). A pause or a hit-stop shows the last step as it is, an actor that jumped (a respawn) is drawn where it is, and a camera pose the game sets in `onDraw` is placed as set; actors' positions are put back exactly after the frame, so the steps never see them moved.
- **Tools**: `tools/phone-test.mjs` measures the real-clock pacing once more when the first reading misses (the full suite on v0.50.1 failed once with the browser itself at 60 Hz before the pacer had chosen, and passed when run again); a pacer that never paces still fails.
- **Docs**: the 3D engine's manual and `docs/ENGINE-3D.md` say a frame between steps is drawn part way.

## 0.50.1 (2026-10-17)

- **Tools**: `tools/ed-clips-test.mjs`'s gallery check waits, frame by frame, for each take to start (up to 3 s) before it reads the hero: it waited half a second of wall time, and the full suite on v0.50.0 failed once with the previous take still on (it passed when run again).

## 0.50.0 (2026-10-17)

The shooter measured at real speed, frame by frame at 60, 90, 144 and 240 Hz with scripted mouse and keys, instead of judged from stills: what moved unevenly or jumped in a frame is fixed.

- **Rendering**: the shooter draws the camera, the soldiers and grenades part way between the last two steps (`game.alpha`) and runs its drawing on that clock (`drawT`): the steps run 120 times a second, so a 144 Hz display showed one frame in six again and motion juddered (the camera's move from frame to frame varied by 45% at 144 Hz; now 0.2% at 90, 144 and 240 Hz, as at 60). A pause or a hit-stop shows the last step as it is.
- **Engine**: third person turns with the newest mouse moves on the frame they arrive, as first person did (it waited for the next step).
- **Engine**: the camera over the shoulder takes what a wall behind asks fast and gives it back slowly, and never goes past the wall: a stone passing behind it made it jump in half a unit for a frame.
- **Engine**: aiming down the sights slows the mouse and the stick with the zoom (it changed all at once halfway in), and the view's recovery after a burst speeds up gradually (it changed rate at a stroke 0.12 s after the last shot).
- **Engine**: the player stops against a standing soldier and steps over a fallen one (the engine's heroes pass through each other: walking on after a punch put the camera inside the target, the screen filled with its insides); a body the first-person eye is inside isn't drawn.
- **Engine**: the 3D engine's heroes no longer stop dead for a step: Rapier's character controller, pressed by a step's gravity into a floor it already touches, now and then slid nowhere, and the move is then tried again along the floor (4 steps in 3,856 on the drop point's pad, one every few seconds of walking; now none).
- **Animation**: feet and hands blend into a new job over a tenth of a second (a stride ending, a slide, a jump, a ledge caught or let go) instead of jumping there; a foot on the ground stays where it was put down while the body turns, slows or changes way over it (up to half a stride from the gait's place, which shrinks to nothing through a stop), and the swing carries it on from where it left; the hips go down to the feet on a stiff spring (they sprang up 11.6 units in a frame after a landing); in first person the hands leave the ledge as the arms come back over the top (they jumped 25 units in a frame), and the gun goes down for a climb and comes back on a spring; in third person the rifle is slung for a climb and back, eased.
- **Tools**: the shooter scene exposes `player` (the soldier's joints) and `viewModel` (the first-person gun's frame and hands) for tools that measure motion.
- **Docs**: `docs/ENGINE-3D.md` says a world draws its last step as it is, and what a game does about it.

## 0.49.1 (2026-10-17)

The shooter's motion made readable at its resolution (an independent reviewer's third and fourth passes: under two or three pixels, a motion reads as nothing), and the 3D kits' play check made steady on a slow renderer.

- **Engine**: the shot's punch is a displacement on the shot's own frame (it was a velocity, a frame late and invisible in a hit-stop): about a degree for the rifle and four for the shotgun with a jitter aside, back in four frames, over the climbing pattern; the field of view kicks a degree and a half.
- **Animation**: the first-person gun's kick is displaced on the shot (the muzzle up six degrees, back, a roll) and settles over five frames, so a burst chatters; the muzzle light shows on the shot's frame only, and the flash's lit air is smaller and on its first frame only.
- **Engine**: the punch lands as the fist arrives (0.085 s); the view's jolt (mostly roll: 2.4 degrees, and 1.3 aside) and the target's rock are displacements, so the 50 ms freeze shows them; the fist starts home as the freeze lets go; in first person the star is drawn on the overlay over the knuckles (at the contact in the world, the glove drawn over it hid its core), half again as big on its first frame and, the same shape in the hit's colour, smaller on its second, then seven chips fly off the body (they stay with the target as the fist pulls away) and arc down for six frames; first-person flashes draw over the gun and the fist (the overlay's flashes are not depth-tested); star, chips and the target's white flash (two frames) run on the clock, not the game's time.
- **Animation**: third person: the sprint's rifle at port arms rises against world up (it pointed ahead, the torso leaning into the run) at about 60 degrees, held high, so from behind its barrel and muzzle stand clear above and left of the helmet; the head drives forward and down, the elbows swing out, and the camera bobs with the footfalls; turning on the spot, the hips shift over the planted foot while the other lifts and dip only as each foot lands; a step aims past the turn, and a last step squares the hips once the body stops turning.
- **Animation**: first person: crouched, the gun comes lower and closer and cants; a slide pushes it down and out to the right, canted the way the camera rolls (7.5 degrees), with a rumble over the ground; a jump drops it on take-off and a landing dips it.
- **Tools**: `tools/kit3d-test.mjs`'s play check waits for a drawn frame at each of its 24 steps (it sampled wall-clock time, so a software WebGPU drawing slowly, or a busy machine, gave the hero too little game time to move: the full suite failed on v0.49.0 with the hero 3.5 to 12.4 units short of 20, and passed on a rerun).

## 0.49.0 (2026-10-17)

The shooter's second feel pass, after an independent frame-by-frame review: recoil you see, a punch with weight, raiders whose aim lags (moving matters), a rifle that shows in third person, and the balance measured and tuned.

- **Engine**: recoil reads: each shot punches the view about half a degree (two for the shotgun) on a stiff spring that peaks in two frames and is gone in eight, on top of the climbing pattern, with a one-degree kick of the field of view; the first-person gun kicks back about 4 cm, tips up and rolls at random, so at 13 rounds a second it chatters.
- **Engine**: the punch lands on its fastest frame (0.095 s, the fist overshooting by a tenth), freezes 50 ms, and jolts the view along the blow; the target rocks back and aside; its star sits where the fist meets the chest, half again as big on the first frame, and with the white flash runs on real time, so the hit-stop no longer stretches them to seven frames.
- **Engine**: raiders aim where the player was a fifth of a second ago: standing still is hit, moving across their sights is missed. Their hits do 10 (were 8) and their bursts come closer together. Measured, standing still in the open 25 m from an outpost: dead in 4.7 to 12.8 s (median 7.5 s, about half their shots hit); strafing: 9.9 to 16.9 s (median 14.4 s, about a fifth hit), before shooting back (the rifle kills a raider in 0.85 s).
- **Animation**: third person: at rest the rifle is held at the low ready at the right side, where the camera over the shoulder sees it (raiders hold it so until they fight); the sprint carries it at port arms across the chest with the torso leaning in; down the sights the gun sits right of the head and the camera stands a third further back. Standing, the knees are soft, not squatting; a step round on the spot lifts the foot higher and the hips dip as each foot lands.
- **Animation**: first person: crouched, the gun comes a little lower and closer; a slide cants it hard with the muzzle up; a jump drops it on take-off and a landing dips it harder; the reload turns the gun further to show the well, and the new mag seats with a jolt.
- **Art**: the muzzle light washes a third as much of the picture in first person; each shot's star is its own (its seed hashed); the brass is half the size and darker.

## 0.48.0 (2026-10-17)

The shooter's feel and animation pass, judged frame by frame: the first shot no longer blacks out the world, muzzle flashes and hits are sharp stars, hit markers say what they hit, the punch lands, sprinting shows the gun, reloads stay in view, soldiers step round as they turn.

- **Rendering**: a fix for every 3D page: three r182 uploads an instanced mesh's matrices (over 1,000 slots) in the ranges of the frame before, so a slot past the last frame's count drew what it last held for a frame: zeros (on the overlay, a screen of outline ink: the world went black on the first shot) or a part from frames ago (a ghost). The pen's batches and the card pages now upload up to the most slots ever drawn plus room, slots never drawn hold a part too far and too small to see, and parts of no width aren't drawn.
- **Art**: the shooter's muzzle flashes are stars of additive streaks facing the eye (a white-hot core, four to six spikes turned at random, a plume along the barrel, the air round them lit): one frame full, one fading, each its own shape, in the world and on the overlay; the muzzle light goes with them, gentler in third person. Hits on a shield flash a blue star (purple on a heavy), a broken shield a big one, a punch or a kick a white one held through the hit-stop.
- **Art**: brass flies out to the right and up, small and spinning, instead of back at the eye over the ammo count; the shotgun's red shell has its brass head; the tracer reads.
- **Engine**: hit markers pop and settle, outlined, coloured by what the shot did (shield blue, health white, head yellow, a broken shield purple and wide, a kill red); damage numbers stand beside the hit, not over it.
- **Engine**: the punch's lunge stops at a fist's length (it ran on through the target, so the punch never landed); the punch lands at 0.11 s (was 0.14) and is over at 0.55 s, for the player and the raiders.
- **Animation**: first person: a jab you see from the first frames (the fist cocked low left, straight to the middle, held through the hit-stop, home) with a fist that reads (knuckles, thumb, a guard on its back) and the shoulder dropped so the arm isn't a pipe; the sprint carries the gun canted across the bottom of the picture (it vanished below it); the rifle's reload turns the gun to show its well and keeps the hand in view.
- **Animation**: soldiers turning on the spot keep their feet planted while the hips turn over them, then step round one foot after the other (they slid). A hip shot in third person shoulders the gun for a moment, so the gun and its flash are seen.
- **Engine**: the third-person camera stands further right of the shoulder (more down the sights), so the middle of the picture is clear: the head no longer covers the crosshair when aiming.
- **Docs**: `docs/ENGINE-3D.md` records three r182's upload ranges and what the engine does about them, and the shooter's new parts.

## 0.47.0 (2026-10-17)

A third 3D kit, SHOOTER: Apex Legends' movement and gunplay without the multiplayer, in an open world two kilometres across, played in first or third person; and what the 3D engine needed for it: open-world terrain, rays, the overlay for a first-person view model.

- **Rendering**: `terrain: { height, color, ... }` makes an open world instead of a level: the game's height function sampled into 64 m chunks as they are first asked about; Rapier heightfields streamed near actors; a quadtree of meshes from one pool (fine near the camera, coarse to `far`, skirts on the seams), the game's colors per vertex and rock in strata where it steepens, in one material. `sky: { top, horizon, ground, sun, haze }` is a dome round the camera; the sun's shadow square moves a whole texel at a time (no crawling edges).
- **Rendering**: `overlay: { fov }` gives a world a scene drawn over it after its depth is cleared, from its own camera, lit by the world's sun and sky, with its own pen in the eye's frame (`world.overlay.pen`: x ahead, y right, z up): a first-person gun never sinks into a wall.
- **Rendering**: `onDraw(world, r)` runs a game's own 3D drawing each frame, whichever scene draws the world. `world.pen` now keeps what a game drew before `world.draw` (it was wiped by the frame itself) and `pen.slab` draws a box leaning any way.
- **Engine**: `world.ray(x, y, z, dx, dy, dz, len, { skip, level, down })` returns the first thing hit (point, normal, distance, the actor or prop, or the ground); `world.block` makes an invisible fixed box or cylinder; `actor.resize(half)` shortens a capsule (crouch, slide); the `'fixed'` camera takes a roll, `capture` keeps the mouse's moves for the game (`camera.takeMouse()`), and `near` and `far` set its planes.
- **Engine**: the 3D starter's shell leaves V, [ ], and 0 to a slice that runs its own camera.
- **Animation**: the shooter's soldiers are posed every frame on a procedural skeleton: a gait whose stance feet stay planted (on whatever a short ray finds under them) and roll heel to toe, the pelvis lowering for long strides, a spine that leans into acceleration and twists to the aim, hands on the gun by IK; a sprint with the gun low in one hand and the off arm pumping, crouch, slide, air, vault, mantle, climb, ladder, zipline, a reload with the mag in the hand, a punch, a door kick, a throw, a flinch, and a death that folds at the knees and falls back from the hips while the gun clatters down.
- **Animation**: first person draws its arms and guns in layers: the stance (hip, down the sights, a sprint's low ready, a crouch's cant, a slide's roll), sway that lags the turn, a figure-eight bob, each shot's kick, a landing's dip, reloads, swaps, punches, the leg that kicks a door in, hands that grab ledges, rungs and the cable, brass from the port.
- **Art**: the badlands: golden grass in merged tufts that sway and part round the player's feet (TSL), red mesas, dry riverbeds, roads routed round the steep ground, junipers, pines, snags and boulders streamed by chunk; outposts built from boxes and cylinders in one material whose kinds draw poured concrete, corrugated metal, container ribs, planks and sandbags; a radio mast, a water tower, tents round a fire, a warehouse; the RANGER rifle (holo sight with its dot and ring) and the BREACHER pump shotgun.
- **Engine**: the shooter's play: sprint, crouch, slide (faster downhill), jump, vault, mantle, climb, ladders, ziplines, doors (E) and kicks (V); hitscan with spread, bloom, a recoil pattern that partly recovers, tracers, holes and impacts by surface, shields before health, headshots, hit markers and damage numbers that add up; a punch with a lunge, frag grenades, supply bins and loot; raiders at five outposts that spawn as you near them, see and hear, fight in bursts, strafe and hunt; the drop point's firing range; a HUD with a compass of the outposts. `SHOOT.run(n)` is its proof.
- **Tools**: `tools/kit3d-test.mjs` plays the shooter with its own buttons; `tools/build.mjs` and `vercel.json` know the slice (`/kits/3d-shooter`).
- **Docs**: the 3D engine's manual covers open worlds, rays, blocks, resizing, the camera's capture and the overlay (5,376 of its 6,000 tokens); `docs/ENGINE-3D.md` describes the shooter and the new parts.

## 0.46.2 (2026-10-16)

The plan for co-op: up to four players in one Emberdeep, each free to go anywhere, against monsters whose life and damage grow with the players around them.

- **Docs**: `docs/HANDOFF-COOP.md`, the plan, made from five audits of v0.46.1 (the single-hero code, the hero's input, scenes and saves, time and randomness, combat and loot) and three measurements (the world simulates at 3 to 25 times real time with nothing drawn; posing rigs is a third of a step; two headless pages open a WebRTC channel with a 0.9 ms round trip).
  - Every depth and the Proving Grounds is a place that its players simulate in deterministic lockstep, with a delay that covers the network: none when alone, so single player is unchanged. Emberhold is each player's own, with the others in it.
  - Players connect directly; a relay with no game introduces them. Monster life rises 100% and damage 50% for each extra hero in the place, as knobs. Loot is personal.
  - Ten phases: a lab where the owner feels the delay on a phone first, then one world on every screen, several heroes (with autopilot companions), the network, moving anywhere, the lead that shows walking at once, emotes and pings, the relay online, snapshots if joins prove slow, and folding the plan in. It ends with nine questions for the owner.

## 0.46.1 (2026-10-16)

The last places that still named Emberdeep's Developer panel and sandbox, gone since v0.45.0, name the Settings window.

- **Emberdeep**: three notes on the Tuning pages pointed to the sandbox and the Developer panel: the Monster note now says Tools' Clear enemies & projectiles, then Spawn monsters, and the Item base note Tools' Create item in bag.
- **Emberdeep**: the code's comments say Tuning and Tools where they said the Developer panel and the sandbox.
- **Docs**: the Labs page says the game links to it from Settings (Keys & help, and Tools), and Emberdeep's entry names Tools for its test areas, not the Developer panel's sandbox.
- **Tools**: `tools/stamp.mjs` and `tools/ed-tune-test.mjs` describe the Settings window.

## 0.46.0 (2026-10-16)

The menus' audit, finished: every feature Emberdeep has is reached from a menu, and `DESIGN.md` maps where each lives.

- **Emberdeep**: Settings > Graphics > Effects gets Screen flashes, Reduce motion (the engine's own, which Emberdeep's flashes and shake already honored) and Skip off-screen animation (the option `OPT.lod` had since the first build, with no switch).
- **Emberdeep**: Settings > Sound gets Master volume and Sound in the background (the engine's).
- **Emberdeep**: Settings > Tools gets:
  - the autopilot run: depth after depth at 3×, logged per depth (`__ed.botRun`, a console call until now);
  - extra mechanics on every depth (`?mechs=`, a link until now);
  - Gain a level: exactly one, whatever the experience bonus or Difficulty;
  - the attract demo, from the title.
- **Docs**: `src/emberdeep/DESIGN.md` has a section "Where everything is: the menus": the title, play's keys, the pause menu, every Settings page, the town, the links. A new feature takes its place there and in a menu.

## 0.45.0 (2026-10-15)

Emberdeep's menus rebuilt: one Settings window for everything, every graphics option on one page, and the whole game a test bench (no sandbox).

- **Emberdeep**: Settings is one window for everything the game can change (`64-menu.js`), opened from the title or the pause menu. Its pages run down the side:
  - Game: Graphics, Sound, Interface, Controls.
  - Playtest: Difficulty and Tools.
  - Tuning: a page per section.
  - Help: every key as bound now, where to change what, the build and the labs.

  A search box finds a setting on any page, the page last open comes back, and a pad's LB and RB turn the page. It replaces the canvas Settings panel and the Controls and Developer windows: the title and the pause menu lose CONTROLS and DEVELOPER, and the pause menu gains TOOLS.
- **Emberdeep**: Graphics holds every option of the look, kept with the options, and lets the game show through while it is open:
  - the camera: the view, the zoom (the default marked), the turn, a reset, smoothing and look-ahead;
  - the picture: pixel size (new: Large, Medium, Small), frame rate, full screen;
  - light: GPU lighting, full lighting, the darkness;
  - effects: outlines, particles, screen shake and its strength, automatic quality (new: the governor can be turned off);
  - overlays: frame rate and timings, collision circles.

  The zoom's note says why a saved zoom above 1.25× looks blockier: the floor and walls are scaled, the characters redrawn. Pixel size: Medium and Small take three quarters and half of the game's own scale, never under two CSS pixels a game pixel (a phone keeps Large).
- **Emberdeep**: no developer mode. The tools act on the hero you play, and he saves as usual (the sandbox's throwaway copy is gone). The switches last until a reload, and the top of the screen names the ones in force (INVULNERABLE • 2X), under TUNED. Tools on the title travel; the ones that act on the world wait for a game.
- **Emberdeep**: 0 resets the camera to the game's own (1.25×, no turn), as Graphics' Reset the camera does; it used to keep a changed zoom.
- **Emberdeep**: a tap that opens a window no longer clicks what lies under the finger in it (on a phone, CHARACTER on the title could press PLAY AS).
- **Emberdeep**: the tuning knob Screen shake is Screen shake strength, beside Graphics' Screen shake switch.
- **Tools**: the controls, tuning, character, Codex and labs suites drive the Settings window:
  - Tools act on the real hero (the granted gold saves with him);
  - the overlays and full lighting are set in Graphics;
  - difficulty is kept as it changes;
  - the character and Codex suites keep the hero's save and put it back after their experiments.
- **Docs**: `TUNING.md` opens with the Settings window. README (the fixed keys, Settings), `DESIGN.md`, `CODEX.md`, `CHARACTERS.md`, `DOCTRINE.md`, `AI_GUIDE.md` and `CLAUDE.md` name the new places (Settings → Tools → Record a session).

## 0.44.0 (2026-10-15)

Emberdeep's view in Settings: the four views side by side, so a player sees which one the camera is in and picks any in one click.

- **Emberdeep**: Settings has a VIEW row under the options: Isometric, Three-quarter, Top-down and Brawler, the one in use lit, each with a tip on how its camera looks. A pick is saved with the options, as V's is; the keys and a pad reach the row (up and down move a row, left and right along it). On a short screen the difficulty rows close up so the row clears the footer.
- **Emberdeep**: the V key and the VIEW row share one list of views and one way to choose (`VIEW_IDS`, `chooseView` in `60-ui-core.js`); V still names the new view at the top of the screen.
- **Docs**: `src/emberdeep/DESIGN.md` names Settings' VIEW row beside V.

## 0.43.4 (2026-10-15)

The API index stays whole (the owner's answer to D42, D43): the two facts the benchmark's agent went to the source for are found in the index now, and a split reopens only when two runs in a row trip the rule.

- **Tools**: `tools/api-index.mjs` lists `px`'s members as games write them, `px.disc(g, cx, cy, r, c)`, not `E.px.disc` (the card's first line makes `px` a local; the agent searched `^- \`px\.disc` and missed).
- **Tools**: a key map among a class's statics names its own actions, from the code: `E.Input.THIRDPERSON { sprint, jump, crouch, interact, attack, block, dodge, use, map }`, and likewise `DEFAULT`, `PLATFORMER` and `SHMUP`.
- **Engine**: `input.use`'s doc comment names the four presets and the actions every one has (up, down, left, right; start, pause, confirm, cancel).
- **Tools**: lookups 27 (the pixel primitives, searched as games write them) and 28 (the third-person preset's actions) in `tools/api-index-lookups.json`: 28 of 28 answered, 27 in one search. The index is 34,010 cl100k tokens (from 33,937).
- **Tools**: `tools/agent-bench.mjs` says a run *trips* the split rule (`tripsSplit` in `result.json`, "trips the split rule" in the row); two runs in a row that trip it reopen the split (D43).
- **Docs**: D43 records the answer and the tightened rule, D42 notes it, `DOCTRINE.md`'s paragraph on the run says the index was kept whole, and `docs/FEEDBACK-LOG.md` F6.1 says what was taken up.

## 0.43.3 (2026-10-15)

The API index plan, folded into the decisions and deleted, as v0.38.1 did with the asset plan.

- **Docs**: `docs/HANDOFF-API-INDEX.md` is deleted. Its decisions are D38 to D41, and its lookups `tools/api-index-lookups.json`. D42 keeps what it measured: the six options' sizes and answers, the budget's cost to an agent, the † marks, the index's growth. D42 also records the split reopened for the owner: the first instrumented run followed 3 of its 8 searches of the index with the source (F6). `DOCTRINE.md`'s principle 1 and the feedback log point to D38 to D42.

## 0.43.2 (2026-10-15)

The Breath of the Wild brief, run again (the owner's yes, D36, D38): the instrumented benchmark's first run, and what it says.

- **Docs**: its row in `DOCTRINE.md`: about 14k tokens of game code in 13 minutes and $3.43, the first build passing, the
  source read 3 times (F3: 11), and the index searched 8 times, never read whole. The judge gave 5/10 against F3's 6/10:
  its objects were the core library's shapes (4.6% of its code draws by hand), but its fields were empty, its lighting
  flat, and its iso view had a void.
- **Docs**: `docs/FEEDBACK-LOG.md` logs it as F6. Climbing and gliding written by the game reaches its threshold (three
  games), and so does lighting unused (two model families).
- **Docs**: D36 notes that the run answers it.
- **Docs**: 3 of the run's 8 searches of the index were followed by a read of the source, which reopens the index's split
  for the owner (D38's rule). `map.bounds` now says what it returns, `{ x0, y0, x1, y1 }`, and lookup 26 keeps it
  answered.
- **Tools**: `tools/agent-bench.mjs` reads a chained Bash call (`cd W; cat API.md; wc -l ... API-INDEX.md`) one pipeline
  at a time, split outside quotes:
  - a pipeline with grep in it is a search; `sed -n`, `head` and `tail` read ranges; `cat`, `nl` and `awk` read whole;
    `wc`, `ls` and the like read nothing;
  - a read whose result is shared takes its lines and tokens from the manual itself;
  - `--rescore --no-judge` keeps the judge's earlier score.

  The run was scored again with it: the first reader had counted the `wc` as a whole read of the index.

## 0.43.1 (2026-10-15)

The benchmark records how the manuals are read (Phase 4 of `docs/HANDOFF-API-INDEX.md`), so the next run says whether agents grep the API index, page through it or read it whole.

- **Tools**: `tools/agent-bench.mjs` watches the manuals as well as the engine (`API-INDEX.md`, `API.md`, `AI_GUIDE.md`, `docs/ASSETS.md`, `README.md`):
  - each Read, `cat`, `sed`, `head`, `tail`, Grep, `grep` or `rg` of one is a whole read, a range or a search (a pipe that starts with grep is a search; a search of a folder counts for each manual its result hit);
  - each records the lines and tokens its result held, from the stream's tool results, and whether the Read tool cut it short;
  - each read of the engine below its header records whether a search of the index came in the three tool calls before it: a lookup the index didn't answer.
- **Tools**: `result.json` gets `manuals` and `index` (searches, ranges and whole reads with their tokens, how much of the index they covered, how many searches a read of the source followed), and the table row a column: "the index read by search / range / whole (tokens)", with "reopens the split" when a run reads the index whole, covers most of it in ranges, or follows more than a third of its searches with the source (D38).
- **Tools**: the agent and the judge start without the variables of a Claude Code session that runs the bench (its session id, its effort, its messaging), so a run from inside a session, a cloud one included, is a fresh session of its own; a cloud session's sign-in is kept. `--selftest` has a fixture for each class of read, the cut Read, the folder search, the lookup the index missed, and the environment.
- **Docs**: `DOCTRINE.md`'s measures table gets the column (the earlier runs: not recorded).

## 0.43.0 (2026-10-15)

Machinery names leave the API (Phase 3 of `docs/HANDOFF-API-INDEX.md`): 60 names in all. 51 members nothing outside the engine uses are private; the seven constructors only the game makes, with `E.GPULighting.supported`, leave `E`; and `E.faceClass` is the engine's own. The API index lists 857 names in 33,906 cl100k tokens.

- **Engine**: private in both editions (a leading `_`):
  - what the engine calls itself: `game.screen.begin`, `present`, `fixedRes` and `options`; `r.begin`, `finish` and `flush`; `game.lights.clear`; `game.gpu.render`, `fail` and `show`;
  - inner state, caches and back references: `game.screen.o`, `r.bb`, `checker`, `ghosts` and `items`, `game.lights.casters`, `heats` and `game`, `game.particles.game`, `game.gpu.game`, `cv`, `bh`, `bw`, `frames` and `loading`, `shots.game`, `grid.map`, `game.audio.game` and `rnd`, `fullscreen.game`, `shell.els`, `game` and `o`, `backdrop.o`, `input.clickAt`, `pinching` and `onBindings`, `talk.page`, `pOpts` and `pSize`, `rig.atkRel`, `hairPts`, `sidePlane`, `aimA`, `mv` and `smear`, `action.shadowZ`, `vx`, `vy` and `vz`.
- **Engine**: `E.Screen`, `E.Renderer`, `E.Lighting`, `E.Audio`, `E.FullScreen`, `E.Settings` and `E.GPULighting` leave `E`, and `E.faceClass` is the engine's own. Their instances (`game.screen`, `r`, `game.lights`, `game.audio`, `game.fullscreen`, `game.settings`, `game.gpu`) are as they were. A game that read one of the names above gets `undefined` now; none in the repository does.
- **Engine**: kept public, against the plan's list, because something outside the engine uses them:
  - `game.screen.fx` and `fy`: the Emberdeep suites and `tools/ed-play.mjs` turn a buffer pixel into a click with them;
  - `game.lights.list`: Emberdeep and the stress test;
  - `game.particles.draw` and `update`: the 3D engine, the stress test and the stress world wrap them;
  - `action.start`, with `action.o` and `beats`: a game's own action (`E.ACTIONS.name = { setup(A), at(A, beat, u) }`) reads its options and start and may set its beats, as the contract suite's own action does.
- **Tools**: `tools/api-index.mjs` lists the members of the classes only the game makes under their instances' names, with no constructor's line, and the contents block names those instances.
- **Docs**: `AI_GUIDE.md`'s frame order no longer names `r.begin()` and `r.finish()`. `E.ACTIONS`' line says what a game's own action gets.

## 0.42.3 (2026-10-15)

The API index says each thing once (Phase 2 of `docs/HANDOFF-API-INDEX.md`): 1,612 tokens fewer, every lookup still answered.

- **Docs**: one object's lines that say the same thing are one line (`body.x = 0`, `body.y = 0`, `body.z = 0`: its position): 40 lines in place of 92.
- **Docs**: a parent's line leaves out what its members' own lines say (`game.cam`, `game.stats`, `new E.Body`, `new E.Mover`, `new E.Suspicion`, `E.V3`, `E.ease`, `E.tex`, `E.ui`, `shell.hud`). No description starts with its own name again ("inv: the inverse ..."), and a table's keys are given once (`E.ACTIONS`, `E.songs`). `E.HEIGHTS` points to the height rules (the index's head, `API.md`) instead of restating them.
- **Docs**: the wrong descriptions are fixed. A comment's last `)` stays (`E.ease.outQuad`, `talk.modal`, `input.screen`, `settings.saved`). `E.session`'s `frame`, `recording` and `replaying` each get their own clause. `game.stats.updateMs` and `renderMs` share their line. `r.groundPts`, `map.toCell`, `rig.atkRel`, `rig.downW` and `new E.Screen` get wording of their own in place of a neighbor's comment or a fragment. `E.ui`'s line no longer names `E.ui.heartSprites`, which doesn't exist.
- **Docs**: `E.ui.bar` says it is a meter (health, magic, stamina), and lookup 20 (a stamina meter) checks it there. The index is 35,446 cl100k tokens of its 40,000.
- **Tools**: `tools/api-index.mjs` merges the same-saying lines, cuts a parent's clauses that its members' lines give, gives a namespace's members that share one comment their own clause of it, and keeps a final `)` unless the parentheses wrap the whole comment.

## 0.42.2 (2026-10-15)

The API index answers the lookups the benchmark's agents read the engine's source for (Phase 1 of `docs/HANDOFF-API-INDEX.md`): grep finds 24 of 25 of them in one search, against 15 before.

- **Docs**: the index says what it didn't: the state `rig.update` takes (`aim`, `crouch`, `sprint`, `climb`, `hang`, `flip`, `pose: 'cheer'` and the rest, `stance`, `down`), the Humanoid's hats and hood, the backdrop's `sun` and `moon`, `talk.say`'s `choices`, the step that feeds `E.Suspicion`, `E.PlatformMap`'s tile kinds, playing an action (`mover.play('takedown', { other })`), and that an `E.Mover` is an `E.Body`. They are doc comments in the engine; no code changed.
- **Docs**: a constructor's line names what its instances go by (`new E.Attack(...) → slash`: its methods are `slash.*`), and a contents block after the examples gives each section's line and its classes' instance names. `E.PROPS` and `E.VIEW_ORDER` are listed in full.
- **Docs**: the ten lines over 200 tokens split: a doc comment's options, one to a line as `- name: what it does`, become lines of their own named by their owner (`new E.Game({ expand })`, `shell.hud({ bars, counts })`, `shell.show('help')`), so a search returns the clause it hit, not the whole description. The index is 37,058 cl100k tokens of its 40,000.
- **Tools**: a lookup check: `tools/api-index-lookups.json` holds 25 lookups (the plan's appendix A), each a grep and the facts its hits must hold; `node tools/api-index.mjs --check`, and so `doctrine-check`, fails when one stops answering, and `--lookups` shows each one's hits and tokens. On v0.42.1's index it finds 15 answered.

## 0.42.1 (2026-10-15)

The plan for the API index, with the owner's answers: optimize it for answers, don't overhaul it.

- **Docs**: `docs/HANDOFF-API-INDEX.md`, the analysis D28 asked for (a budget of 34,000, 37,000 or 40,000), measured at v0.42.0: grep answers 15 of 25 real lookups, and no cut, split or denser format changes one; the plan adds the answers (Phase 1), says each thing once (Phase 2), makes 68 machinery names private (Phase 3) and has the benchmark record how the manuals are read (Phase 4). The owner said yes to all four of its decisions: one file and the 40,000 budget kept, Phase 3, Phase 4's paid run, and the full index in the handoff (D38).

## 0.42.0 (2026-10-15)

The last pages that drew a world without the asset store now take from it: the adventure, RPG and stealth kits, both 3D kits, the Mocap Lab and the two 3D prototypes. A review of what still draws by its own code.

- **Art**: each remaining kit loads a cut of the store of its own, inlined only with its slice:
  - the adventure: a stump in the village and two obelisks flanking the shrine's carpet (kenney-nature, kenney-graveyard; `adventure.js`, 907 tokens);
  - the RPG battle: a broken column on the ruined plaza (`rpg.js`, 597);
  - the stealth: stacked planks on the north street (`stealth.js`, 728);
  - the 3D action: two dungeon barrels against the hall's north wall, by a legend letter (`action3d.js`, 623);
  - the 3D platformer: a signpost at the start and beside each checkpoint flag (kenney-platformer; `platformer3d.js`, 700).

  Each kit draws a fallback, or nothing, without its set. The kits grow by 600 to 1,100 tokens.
- **Art**: the two 3D prototypes (temporary labs) put core shapes in their corners as one three.js mesh each, built from `E.shapeMesh` and coloured by material, never culled so the warm-up builds its pipeline, and solid (Rapier boxes from `E.shapeBox`). The 3D proof's run is unchanged (it keeps clear of them); the 3D prototype's proof hash changes with its new colliders, and is still the same on WebGL and WebGPU.
- **Tools**: the Mocap Lab has a Props button (O, or `?props`), off by default: a table, a stool, a crate and a barrel beside the stage, for scale and for clips that sit or lean.
- **Tools**: the assets suite's check of the games' cut sets covers every kit's set.
- **Docs**: `docs/ASSET-IMPORT.md` says who uses the store and reviews what still draws by its own code. The core library stays, being in every page at no cost. Emberdeep's moving and interactive pieces stay code, by the card's limit. Its still ones have no counterpart in the store or keep their drawn look, with the store's objects beside them.

## 0.41.0 (2026-10-15)

Every kit and lab draws from the asset store: the shooter, brawler and animation lab, Emberwell, the Perspective Lab and the stress test.

- **Art**: the shooter's fields gain hay bales (kenney-graveyard, CC0, in the page's `src/assets/sets/shooter.js`) on a seed of their own, and carts parked by the farm road (the core cart). The brawler's diner gains a patio (the core table and chairs) and a delivery crate, clear of the breakables, and cardboard boxes by the second dumpster (kenney-survival, `brawler.js`). The animation lab racks five spears against its wall (kenney-mini-dungeon, `animlab.js`), turning with the view like the rigs. Each set is inlined only with its slice (`<!-- @inline-with ... -->`) and costs its kit 600 to 900 tokens; each kit draws nothing from a missing set.
- **Art**: Emberwell heaps its stores in the corners (barrels, crates, a chest, sacks, a pot, a jar: the core library), each pushing bodies off a circle as the braziers do, and waves never spawn on them. The Perspective Lab furnishes its room (a bookcase, a table and stools, barrels, a chest), right in every one of its five views.
- **Tools**: the stress test has a Shapes slider: up to 400 of the engine's core shapes strewn through the hall, in its own views (not the depth view). It starts at 0, so a benchmark run as before measures what it did, and the report names the count when it is set. The stress suite checks that the slider at 400 adds draw items (on v0.40.0's page it fails).
- **Tools**: the assets suite checks the games' cut sets (emberdeep, platformer, shooter, brawler, animlab): every entry a game's code names is in the set its page loads, and every entry of the set is named, so a typo draws nothing silently no more and a kit carries no dead weight (a misspelt id fails it both ways).
- **Docs**: the README gives the kits' measured sizes (184k to 204k tokens; two were over 200k before this change) and names their cut sets; `docs/ASSET-IMPORT.md` lists the games' cut sets.

## 0.40.0 (2026-10-15)

More detail in Emberdeep's dungeons and town, from the asset store.

- **Emberdeep**: every dungeon room gets a scene on top of its theme's own dressing, two in a big room: a robbed tomb, a vigil at an altar, a hall looted long ago, a smith's corner, a camp the cold took, a cairn, rotwood, a dig, the miners' table, a tinker's bench, a shrine to the dark, a wake, a garden seat in the clouds, the aqueduct keepers' stores, an explorers' camp with a lit fire, and a rare hoard in any theme. One to three single objects are scattered in each room. They are drawn from the page's own cut of the store (`src/assets/sets/emberdeep.js`, 49 shapes from KayKit and Kenney, CC0), its colours toned to the game's once at load, and from Emberdeep's own camp fire, which lights the room (53-scenes.js). They are laid out when a level starts, from a random stream of their own and clear of everything the level placed (its dressing, the mechanics' things and floors), so the level stands as it would without them. Set dressing only: nothing in them is solid or hittable.
- **Emberdeep**: Emberhold gains the town's smaller stories: cabbages, onions and pumpkins in rows in the garden round the scarecrow; two headstones and a mound with flowers by the memorial stones; a chopping stump, a log and chips in the south-west corner; feed and water by the coop; a grindstone in the forge yard; Cobb's produce cart, laden, south of the plaza; a signpost on the south road; pumpkins and a cart out past the wall. They stand clear of the townsfolk's rounds (each walks as far in 40 seconds as before).
- **Emberdeep**: the themes' dressing lists weigh their items as written. `WLD_dress` picked with RNG's weighted pick, which reads `.weight`, while the lists give `w`, so every item came equally often (a ruin's pillars, weighted 3, as often as its pots, weighted 1).
- **Tools**: a suite for the set dressing, `tools/ed-scenes-test.mjs` (`ed-scenes`, run for any change to Emberdeep or its set): every planned depth lays out scenes, every shape a level places is known and no name warns, each level's own props and packs are those a fresh build of its seed makes, and the town's details stand. On v0.39.0's build it fails. The smoke test (`npm run test:smoke`) checks the same scenes and names on the depths it plays.
- **Tools**: fixes a review of v0.39.0 found. The platformer's set is inlined only into pages that carry its slice (`<!-- @inline-with 20-platformer.js ... -->` in a template): the six other 2D kits carried 3.2 KB of it for nothing. `asset-find` lists each entry once, where it came from: a game's own cut set (no catalog: tavern, emberdeep, platformer) is searched only when `--set` names it. The handoff package lists its store on a page of its own (`src/assets/README.md`: every set, what it holds, its catalog), which its index links (the folder has no page). `asset-sheet` takes the engine's path from `asset-lib`.
- **Docs**: the README tells of the town's details and the dungeons' scenes; `src/emberdeep/DESIGN.md` describes the scenes (53-scenes.js) and maps shapes and the asset store to where Emberdeep shows them; `docs/ASSETS.md` and `docs/ASSET-IMPORT.md` name the games' cut sets, and the card says how to dress a generated level with scenes.

## 0.39.0 (2026-10-15)

The asset store goes where builders work: the handoff package carries it, and a starter kit loads a cut of it.

- **Art**: the platformer's graveyard gains a stone cross, an urn and a sarcophagus from the store (kenney-graveyard, CC0), cut by `tools/asset-set.mjs` into the page's own set (`src/assets/sets/platformer.js`, 3 shapes, 1,391 tokens) and placed by letters in its back row like its props: the first kit to load a set as `docs/ASSETS.md` says a game does.
- **Tools**: the handoff package (`dist/handoff/`) carries the asset card (`docs/ASSETS.md`), `asset-find`, `asset-sheet` and `asset-set`, and the store (`src/assets/`: every set and its catalog, at the repository's own paths). Its `API.md`, `AI_GUIDE.md` and template game already pointed at the card and `asset-sheet`, which it did not hold. The asset tools find the engine in either layout. The contract suite checks that `asset-find` runs on the package alone and finds a store entry.
- **Docs**: the handoff README says where objects come from (step 5 of "Start here") and lists the card, the tools and the store.

## 0.38.2 (2026-10-15)

The fixes a review of v0.38.1 found.

- **Rendering**: a 3D shape's outline turns with the shape. It pushed along normals that three's instancing never turns, so at any facing but a quarter turn it slid off its sides, and a crate turned the other way lost it along both (the 3D platformer turns every tree, bush and rock at random). Where two faces cancel (two discs back to back: a jar's cork, a muffin's base) the outline keeps the corner's own normal, and its fan is drawn.
- **Tools**: the 3D kits' suite checks that a turned crate's and barrel's outlines reach past them on both sides, row by row; on v0.38.1's engine the crate's reach 18% of its rows against 76% now.

## 0.38.1 (2026-10-15)

The asset plan's last phase: what it measured, the fixes a review of v0.38.0 found, and the plan folded into the docs it leaves (Phase 4 of `docs/HANDOFF-ASSETS.md`, now deleted).

- **Rendering**: 3D shapes build one shader at any count: each mesh starts with 1,024 slots, which three reads from an attribute (with 16, each kind's count was a pipeline of its own, built mid-game when shapes came after the warm-up or a kind grew). Planks run up a turned face as staves; the crate's frame and bark's end rings are drawn once per face; a box's outline closes round its corners.
- **Engine**: `E.shapeMesh`'s groups say which faces are turned (`curved`) and which patterns are drawn once per face (`face`, uv across the face); `E.materialTile` takes `curved`. The 3D flow fields walk round every tile a solid legend shape's turned footprint covers.
- **Tools**: the 3D kits' suite checks that placing more shapes (past a kind's first slots, and a new kind) builds no pipeline, and that a turned bench is drawn and solid where its box is; both fail on an engine with the old slots and a flipped turn.
- **Docs**: the authoring test: fresh agents wrote ten objects from one-line briefs, as shapes from `docs/ASSETS.md` (10 of 10 valid on the first try, 2,966 tokens) and as canvas code from `API.md` (10 of 10 ran, 15,784 tokens: shapes cost 81% fewer); two blind judges scored the look 5.9 and 5.7 against canvas code's 7.4 and 6.6. The numbers are in `docs/ASSET-IMPORT.md` and `DOCTRINE.md`; the card's recipe gains what the judges saw. The paid benchmark re-run was skipped with no answer from the owner in time (D36).
- **Docs**: `docs/HANDOFF-ASSETS.md` is deleted: how the engine draws a shape, why the format is data, the traps and the measures are in `docs/ASSET-IMPORT.md`; the decisions in `docs/DECISIONS.md` (D28 to D36).

## 0.38.0 (2026-10-15)

The same shapes in 3D: the 3D engine draws the 2D engine's entries with their materials and collides with them, and its kits use them (Phase 3b of `docs/HANDOFF-ASSETS.md`).

- **Rendering**: `world.shape(id, x, y, z, { facing, scale, mats, flip, params, solid })` draws a shape (a core id, a store set's `SET:id`, or an entry) in a 3D world, and a level's legend may stand one on a tile (`{ shape: 'bench' }`). It uses the 2D placement's options and units. Each kind is one instanced mesh, with an outline. Every shape shares one toon material, whose texture is an atlas of the materials' patterns at world scale, so a new shape builds no shader; the warm-up builds it before any shape is placed. The patterns keep their bands under the Comic cel and Pixel filters.
- **Rendering**: a 2D shape's glowing material (the crystal's) glows: its pixels are drawn again after the lighting and lit in GPU lighting's pass, as the crystal props were (fixes a review of v0.37.0 found). Things on a solid shape's back half keep their own depth order.
- **Engine**: `E.shapeMesh(id, o)` gives a shape's triangles, grouped by material and by sides and lids, from the same resolved parts the 2D renderer draws. `E.materialTile(id, o)` gives a material's pattern as pixels. `E.shapeBox(id, x, y, z, o)` gives the box both engines collide with: `map.solid` uses it, and a solid 3D shape gets a fixed Rapier collider from it, so a hero stops at a crate and lands on a table in both. On the agent edition they return null.
- **Art**: the 3D action hall stands bookcases, benches, sacks and an anvil along its walls (in its level text), walked round by the flow fields. The 3D platformer's trees (the tree generator), bushes and rocks are shapes; the rocks are solid.
- **Tools**: the 3D kits' suite checks that every core shape builds and draws on WebGL 2 and WebGPU, that a hero stops at a solid crate and lands on a table, and draws a sheet of every core shape in 3D beside its 2D picture (`check-output/kit3d/shapes-<backend>.png`). The slices' proof hashes, now with shapes and their colliders, are the same twice and on both backends.
- **Emberdeep**: the town draws its pines itself, so the town builds with the core alone (`ed-build --mine 56-town.js`).
- **Tools**: `asset-fetch` refuses a license text that names any other license (MIT, GPL, Apache, royalty-free, proprietary, all rights reserved) or says "not CC0". The 3D kits' play check measures the farthest the hero got: a fall respawns him at the start, and the check failed by chance.
- **Docs**: the 3D engine's header (its manual) gains `world.shape` and the legend's `shape`. `docs/ASSETS.md` points to it in a line. `docs/ENGINE-3D.md` covers shapes, the kits' dressing and the checks.

## 0.37.0 (2026-10-15)

Shapes in the games: Emberdeep, the starters and the template game dress their scenes with objects as data, and shapes draw faster (Phase 3 of `docs/HANDOFF-ASSETS.md`, with the fixes a review of Phase 1 found).

- **Rendering**: `r.shape` draws a shape's picture with its outline baked in, queued as it is, and its shadow as a picture made once per view: 300 shapes in view cost about 4 ms a frame headless (a hundred barrels cost about 57 ms through the actor composite). A flash, an x-ray or see-through still go through `r.actor`'s composite, and the pictures are the same pixel for pixel (the Asset Lab's filmstrip is identical). GPU lighting gets the shape's own pixels in its height pass. A shape off the screen is skipped before its picture is made. The first frame makes each picture once (about 0.7 ms each: 300 different ones, about 230 ms).
- **Rendering**: what stands on a solid shape (`map.solid`: a jar on a table, a crate on a crate) sorts after it, on the shape's back half too.
- **Rendering**: a cached picture is drawn again when one of its materials is edited (`E.MATERIALS.oak.color = ...`). Parts below the floor are no longer clipped at the picture's edge. The outline takes the renderer's color (`r.outline`), and `E.shapeSprite`'s `outline` takes a color.
- **Rendering**: the crate pattern repeats past its face, on a wall face or a tile past the first.
- **Rendering**: `r.sprite` stands a shape's sprite (`E.shapeSprite`) on its own feet unless an anchor is given.
- **Art**: the starters (adventure, rpg, stealth) and the template game dress their rooms with core shapes and one material each (`ruin` walls in the adventure's ruins and the rpg's plaza, the stealth belfry in `sandstone`, the template's street floored in `cobble`, its barrels, crates and cart solid): what builders copy.
- **Engine**: a broken part (null, a mirror or ring without its part, a group without parts, a use without `at`, a box without a size, a `rot` that is not degrees) is skipped after its warning, never thrown; so are `parts: {}` and a `make` that returns nothing. A material naming itself in a set means the registry's; a loop of names ends with a warning.
- **Engine**: an entry's own `scale` applies, times the placement's (drawing, collision, lights and flames). A shape's geometry is cached on its params alone, the 64 most recent per entry.
- **Engine**: `map.heightAt` counts a raised solid (a crate on a shelf) only from what reaches it: a shot under the shelf flies on. `map.solid`'s solid also records where it was placed (`px`, `py`).
- **Engine**: on the agent edition, `E.addAssets` returns empty lists, as the card says.
- **Emberdeep**: the themes' barrels, crates, pots, rocks, crystals and the Sky's blossom trees are shapes, turned their own ways and recolored for the depth, from the same random draws: every level is laid out as before (D35). The town's barrels, crates, sacks, tables (round, with mugs), stools, benches, hay, the well and the pines beyond the wall are shapes; their collision is unchanged.
- **Emberdeep**: the Gallery has an OBJECTS reel: every core shape turning beside the hero, with what it is and where the Asset Lab is. The reels' names fit a phone held upright.
- **Tools**: `tools/asset-sheet.mjs file.js#id` draws the file's own entry where the core has one of the same id. The assets suite checks the review's edge cases and times 300 shapes in view.
- **Tools**: fixes a review of Phase 2 found. `asset-fetch`'s license check wants CC0 or the public-domain mark as a word in a page's own words, and refuses a text naming another Creative Commons license; `--survey` keeps the ledger rows of downloads not in `.cache`; API ids and download hosts are checked, links skipped. `asset-import --only` touches only the ids asked for; gravel is speck, as documented (the three gravels now fit at dE 0-2). The assets suite checks each shape's fit; the labs suite checks that `#barrel` shows the barrel.
- **Docs**: `docs/ASSETS.md`: an entry's `scale` and `foot` as they now work; the agent edition's returns. The PlatformMap's `mat` is documented for the square tiles it covers.

## 0.36.0 (2026-10-15)

The asset store: objects, materials and sprites converted from CC0 libraries, each with where it came from and how closely it fits, searchable, and the Asset Lab to browse them (Phase 2 of `docs/HANDOFF-ASSETS.md`).

- **Art**: `src/assets/sets/` holds 18 sets: 475 shapes from Kenney's ten 3D kits and four KayKit packs (of 1,830 models: the rest left out as structural, variants, reading badly or under the fit), 68 materials fitted from ambientCG's PBR sets (of 111), and 460 sprites from Kenney's Tiny Dungeon, Tiny Town and Tiny Battle packs, all CC0. Every set records each download (url, date, sha256 or commit, the license as read and its hash), every entry its download, its file and its fit (shapes at a mean silhouette IoU of .90 over 8 views, none under .6, a median of 287 tokens; sprites exact). Each kept entry is described in its set's catalog (`src/assets/catalogs/`), written from contact sheets; what was left out is in `$skip` with the reason, and every file of every source is in the set's ledger. `tavern`, cut from five of them, shows what a game carries instead of the whole store.
- **Engine**: a shape redefined under the same id draws afresh: the raster cache keys each entry object, not its id. Drawing a shape no longer leaves a `_geom` property on its entry.
- **Tools**: `tools/asset-fetch.mjs` (`npm run assets:fetch`) downloads a library into `.cache/assets/`, checks its license (CC0 1.0 or the public-domain mark, or it stops) and writes the ledger. `tools/asset-import.mjs` (`assets:import`) turns models into shapes, PBR sets into materials and pixel packs into sprites, with `--catalog`, `--scale`, `--tol`, `--only` and `--list`. `tools/asset-set.mjs` (`assets:set`) cuts a set by ids with every shape and material they use. `tools/asset-find.mjs` (`assets:find`) searches the store and the core library. `tools/asset-sheet.mjs --grid` draws contact sheets of a set and a page of its kit colors.
- **Tools**: the Asset Lab (`/asset-lab`, kept): every entry of the core library and the store, searchable, drawn beside the hero in every view and turning on a choice of floors; the entry picked drawn by the engine in a room, as text to edit and Apply or Copy, with its source and fit; deep links `#barrel`, `?set=`, `?kind=`, `?view=`.
- **Tools**: the assets suite checks the store: every download CC0 with its record, every entry's source, file and fit, catalogs and ledgers complete, the fit thresholds, sprites exact against their sources, sets cut by `asset-set` equal to their sources, every set loading and drawing. The labs suite opens the Asset Lab and fits it on a phone. `doctrine-check` skips the sets in its boundary scan.
- **Tools**: the Temporary labs Shapes vs props, Free camera room and the asset probe are deleted, with `src/shapes-raster.js`: their questions are answered (the probe's by Phases 0 and 1). Their addresses lead to the Asset Lab.
- **Docs**: `docs/ASSET-IMPORT.md`: the pipeline, adding a library step by step, the sources and their licenses, fit, costs and limits. `docs/ASSETS.md`'s recipe searches the store (`asset-find`) and cuts a game's own set (`asset-set`). D33 (the store) and D34 (the lab inlines every set; the kits never do).

## 0.35.0 (2026-10-14)

Objects and materials as data: a barrel is a few lines of named parts, drawn in every view and facing, and every surface takes a material from one open registry (Phase 1 of `docs/HANDOFF-ASSETS.md`).

- **Rendering**: `r.shape(id, x, y, z, { facing, scale, mats, flip, params })` draws a still object from its parts (box, cyl, lathe, ball, prism, wedge, rock; use, mirror, ring, row, group) in every view and facing. The house shading comes in bands with lit top edges, creases and the actors' outline. Each object casts a contact shadow and sorts like an actor. Steep views draw it from the characters' angle, the light comes from the viewer's upper left, and glow and flames come from the entry. It is cached per facing step. A shape too big for the actors' canvas takes a path of its own.
- **Rendering**: `E.MATERIALS` and `E.PATTERNS` are one open registry for every surface: wall faces (`face`), wall tops (`roof`), floors (`floorMat`, and `floorMats` by floor tag) and platform tiles (`mat`). A material is `{ color, pattern, numbers, ramp, glow }` or the shorthand `'#hex pattern k=v'`, with 15 patterns and 4 overlays (`over`: moss on what looks up, cracks, dirt near the ground, rust). Every existing face, roof, tile style and `E.tex` texture is now an entry with its own painter and draws exactly as before. Unknown names warn with the list of names.
- **Art**: the core library: 25 shapes (barrel to crystal; the generators fence, pine, tree, bush, grass, rock and crystal take params) and 37 materials (woods, stones, metals, clay, cloth, plants, ground, ice, flame; ruin and rusted wear overlays), 61 with the 24 the surfaces brought. It is 8.6 KB of source, with a median of 127 tokens an entry.
- **Engine**: `map.solid(id, x, y, z, o)` makes a shape solid with its height. A body stops at it, one coming down lands on it, and one wholly below passes under. Its box turns, scales and mirrors with the shape. `E.shapeSprite` gives a sprite for an inventory or a HUD. `E.shapeInfo` gives its pixels and bounds. `E.addAssets(set)` loads a set as `SET:id` without replacing the core's entries or another set's.
- **Engine**: on the agent edition, the registries are kept for what a game adds, and `r.shape`, `map.solid` and the rest warn once and draw nothing, as `r.prop` does (D29).
- **Emberdeep**: its 9 wall faces and 8 roofs register through `E.MATERIALS`, the public registry, in place of the engine's private `_facePattern` and `_roofPattern`. Those come off the doctrine's to-do list.
- **Tools**: a new suite, `assets` (`npm run test:assets`). It checks that every core shape draws in 5 views and 8 facings inside its bounds and that every material draws on every surface. It also checks collision and sorting round a solid table, set loading, validation messages naming the entry and the field, and the token and size budgets.
- **Tools**: `node tools/asset-sheet.mjs <id | file.js#id>` (`npm run assets:sheet`) draws an object in every view and four facings beside the hero, on a light and a dark floor. It lints what reads badly: too small from above, a part under a pixel, too few tones, low contrast, its tokens.
- **Tools**: `tools/contract-test.mjs` runs `docs/ASSETS.md`'s examples on both editions. `tools/api-index.mjs` takes a name's description only from its `/** */` comment, never from a `/* ==== */` banner (four garbled lines), and lists prototype methods. `tools/doctrine-check.mjs` budgets the asset card at 4,000 tokens (D30).
- **Docs**: `docs/ASSETS.md`, the asset card (3,300 tokens): use, the library, materials on surfaces, writing one with six worked entries, the recipe and the limits. The agent and full engine headers, `API.md` and `AI_GUIDE.md` each get one line pointing to it. The backdrop presets line names all ten, dusk among them. `E.Body`'s default height (32) is documented. D29 to D31 log the calls, the look decisions among them (D31).

## 0.34.2 (2026-10-14)

Exact token counts, room in the API index, and clearer names for the 3D labs.

- **Tools**: `tools/doctrine-check.mjs` counts the manuals' tokens exactly: `gpt-tokenizer` is a dev dependency beside Playwright and terser. Its fallback estimate errs high, and had read the API index at 36,748 and the API card at 14,998 tokens, against 35,697 and 14,543. The API index's budget rises from 37,000 to 40,000 (D28).
- **Tools**: `npm run test:changed` runs every suite when `package.json`'s dependencies change. It only watched a lockfile, which installs here never write, so adding or upgrading a dependency ran only the suites of the other files changed. A bump of the package's own version still counts as unchanged.
- **Tools**: the Labs page's 3D line has clearer names. The 3D world lab is the **3D Proof**, and Stress test: 3D world is the **3D Prototype**, the game the 3D engine was built from, kept as its record. Their URLs stay.
- **Docs**: `docs/HANDOFF-ASSETS.md` has the owner's answers and a Phase 3b: after the 2D engine, the 3D engine draws the same shapes, with their materials and colliders, and its kits use them. `docs/LAB-3D.md`, `docs/ENGINE-3D.md`, `README.md` and `DOCTRINE.md` use the new names and budget.

## 0.34.1 (2026-10-14)

The phone suite's 120 Hz check, steady on a slow machine.

- **Tools**: `tools/phone-test.mjs`'s 120 Hz screen (real timers) shows the engine light frames for 2 s before the 10 ms ones, as a phone's title would. On a 4-core cloud box the stealth scene's own frames take 8 to 16 ms, so the engine had only seen refreshes missed: it read 120 Hz just when the fake screen's timers fired early, and `npm test` failed about one run in five (60 Hz, every refresh). A 10 ms frame from the first refresh stays checked on the virtual clock.

## 0.34.0 (2026-10-12)

A 3D engine from the stress test's 3D world, and 3D starter kits on it.

- **Engine**: `engine/my-3d2dge-3d.js` (`dist/my-3d2dge-3d.js`), the 3D engine: a real 3D world under a game, on three.js r182 and Rapier 0.19.3 (vendored). `await E.World3D.init(game)`, then `new E.World3D(game, { level })`; `world.step(dt)` in update and `world.draw(r)` in draw. The 2D engine still runs the game: scenes, exact fixed steps, input, the pause menu, settings, touch buttons, the boot screen, sound, the HUD.
- **Engine**: the level is text, one character per 1-metre tile, with a legend: walls, raised floors, stairs, platforms in the air, pits, pillars, braziers and marks, and each one's look. The same text gives Rapier's colliders, the heights the game asks about (`ground`, `floorAt`, `topH`), a walkable grid with flow fields up stairs, and the meshes: the ground baked once with contact shadows, sides merged per look, walls and pillars instanced and cut away in front of the camera.
- **Engine**: heroes are walked by Rapier's character controller (stairs, slopes, curbs, jumps, moving platforms, pushing crates); mobs are physics bodies, so a crowd pushes and piles up by itself. The game sets a velocity, a jump and a rig's move each step; the world moves the body and poses the rig. Also crates, barrels, boxes, moving platforms (`world.platform`), and things drawn by code from four shapes with a pen: coins, gems, hearts, keys, stars, chests, doors, flags, springs, trees, and kinds a game adds.
- **Rendering**: characters drawn as cards (the 2D engine draws each rig from the camera's turn and tilt) or puppets (3D parts on the same joints), with outlines, capes and weapon trails; torches that light the nearest action, one casting shadows; a sun with shadows, a sky, fog; the game's particles in 3D, with damage numbers on the HUD; ground arcs (telegraphs) and glows; the filters Comic cel, Pixel, bloom and FXAA. Every shader is built in a warm-up frame behind the boot screen.
- **Engine**: the camera has the 2D views as real 3D cameras (V, `[` `]`, the wheel and a pinch work as in 2D), a chase camera that swings round behind the hero, first person, fly and fixed; in those, a click captures the mouse to turn the camera (pointer lock; Esc or a pause frees it; off while a session is recorded, whose record has no lock). `camera.ground(move)` turns the stick to the ground; `camera.aim(actor)` reads the mouse on the floor or the right stick. The camera's pose is worked out in the fixed steps, so a run replays the same.
- **Engine**: `world.hash()` after the same inputs is the same on WebGPU, WebGL 2 and run again. `E.World3D.INPUT` is a 3D action preset (Space jumps, Shift dashes, C changes the camera). `E.World3D.SETTINGS` puts Characters (cards or puppets), 3D picture, Shadows and Filter in the pause menu.
- **Engine**: `new E.Game({ bg: null })` makes the game's canvas clear: its HUD and menus draw over a picture under it. `game.shaking` reads the screen shake. `particles.ground` is asked again for each 8-unit cell in x and y, so particles land on a 3D level.
- **Engine**: `src/starter3d/`, the 3D starter (`dist/my-3d2dge-3d.html`, at /3d): a title stage in 3D and two slices. ACTION is the stress test's game as a kit: a torch-lit hall, a combo, a dash and its thrust, a jump and an ember bolt, against five waves of husks, skeletons, slimes and wisps, then a knight. PLATFORMER is a sunlit course of islands over the void: plank platforms, stone steps, a platform that rides a gap, a spring, slimes to stomp, coins, three stars and checkpoint flags. Each is a 3D kit: `dist/kits/my-3d2dge-3d-action.html` and `-platformer.html`, at /kits/3d-action and /kits/3d-platformer.
- **Tools**: `tools/kit3d-test.mjs` (`npm run test:kit3d`, in `npm test`). It checks the 3D labs' rules in the 3D sources and runs the manual's quick start. It plays every 3D page on WebGL 2 and WebGPU: the proof hash is the same twice and on both, and no GPU pipeline is built mid-game. It also checks an upright phone. `tools/build.mjs` builds the 3D starter and kits. `tools/doctrine-check.mjs` holds the 3D engine's manual (its header) to 6,000 tokens; it is about 5,000. `tools/version.mjs` versions it. `npm run test:changed` runs only the 3D kits' suite for a change to the 3D engine alone. The Labs page has the 3D kits, and the stress world leads to them.
- **Docs**: `docs/ENGINE-3D.md` (the 3D engine and kits); D27 in `docs/DECISIONS.md` (three.js and Rapier as the 3D engine's dependencies, its WebGL 2 fallback, served pages, the manual's budget); `DOCTRINE.md`, `README.md`, `AI_GUIDE.md`, `CLAUDE.md` and `docs/LAB-3D.md` say where it fits.

## 0.33.1 (2026-10-12)

The Labs page in the order things were made.

- **Tools**: the Labs page's first section is **The road to Emberdeep**. It numbers the line that grew the engine and led to the showcase game, in the order it was made, with the version each one came in: Scarfrunner (before the engine), Emberwell and the Perspective Lab (v0.1.0), the stress test (v0.3.0) and Emberdeep (v0.6.0). The Mocap Lab stays under Tools.
- **Tools**: Temporary is in the order its prototypes were made, not newest first. Each card says the page it led to: Shapes vs props, then the free camera room, the 3D world lab and the stress test as a 3D world (built after the lab, `docs/LAB-3D.md`). Vesper's interface comes last.
- **Tools**: `src/labs.json`: a section's `line` (numbered, with each page's `made`) and `short` (its name in the bar at the top); an entry's `next` (the page it led to). `labs-test` checks that each `next` is on the list and that each page of a line has its `made`.
- **Docs**: `README.md` describes the sections.

## 0.33.0 (2026-10-12)

The Labs page, restructured.

- **Tools**: the Labs page has four sections. **Play** holds Emberdeep, Emberwell and Scarfrunner. **Starter kits** has a tile for each kit, plus the all-in-one file and its compact edition. **Tools** holds the Mocap Lab, the Perspective Lab and the stress test. **Temporary** follows them.
- **Tools**: each section has a line saying what it holds. A bar at the top jumps to each section, with its count, and marks the one on screen.
- **Tools**: a card opens its page from anywhere on it. The button that repeated the title is gone (54 links, not 65), and the chips are only the other places to start. On a desktop the cards sit in columns.
- **Tools**: Temporary cards come newest first and lead with their question, with the date and how long ago it was. What each one is folds under "What it is".
- **Tools**: `src/labs.json`: a section's `about` line. An entry's `links` are only the other places to start (the title opens the page).
- **Docs**: `README.md` describes the new Labs page.

## 0.32.1 (2026-10-12)

Codex's review of 0.32.0, the player's zoom.

- **Engine**: the quarter second before a zoom is drawn at its new size is counted in steps unscaled by `timeScale`. In slow motion it took four times as long, and with the game stopped (`timeScale` 0) the zoom stayed a scaled preview for good.
- **Engine**: a zoom carried into a scene with less room (2x into the brawler's 1.5x) starts from that scene's end, so the first step out moves it. It took two steps before.
- **Engine**: a game's own setting called `zoom` stays its own: it shows on the settings screen and isn't read as the player's camera zoom. Only the engine's Camera zoom is left off where no scene lets the player zoom.
- **Docs**: `game.upright` reads the game's screen (`r.W` x `r.H`): a phone held upright with `expand: true`. A fixed `res` keeps its own shape on any phone, so `camera.tall` has no tall picture to fill there.
- **Tools**: `standard-test`: the zoom drawn after a quarter second at `timeScale` 0, a carried zoom moving at the first step, a game's own `zoom` setting kept, and Camera zoom left out of a game with no zoom (112 checks).

## 0.32.0 (2026-10-12)

The player's own camera zoom in every kit, on top of the zoom the designer starts each scene at.

- **Engine**: a scene's `camera: { zoom: [min, max], start, tall, wheel }` (or the game's, `new E.Game({ camera })`). Within `zoom` the player zooms the camera with the mouse wheel (a trackpad's pinch too), `-` and `=` (keys no action uses), a two-finger pinch on a phone, and Settings, Display, Camera zoom. `zoom: false` turns it off; a function of the game gives a range per screen shape.
  - The player's zoom is kept (`settings.zoom`, a factor on top of the game's: it carries across scenes and screen shapes), and `game.zoom` is the two together.
  - Each change shows `ZOOM 1.65x` (`MIN`, `MAX` at the ends): the number to give `start` when tuning by feel.
  - `start` is the zoom a scene starts at, `tall` the one on a screen held upright (`game.upright`), applied again as the phone turns. `resetCamera()` goes back to it.
  - `wheel: false` leaves the wheel to the game. `game.zoomBy(k)` zooms as the player would (a button of the game's own), `game.zoomRange()` reads the range, `input.zoom()` the zoom asked for since the last step, `input.pinching` a pinch in progress.
- **Engine**: a pinch is two fingers on the canvas moving apart or together, both of them. A thumb steering the stick beside a resting finger isn't one, and the stick and taps go on as they were. Once it is one, it takes over the stick and the tap.
- **Rendering**: while the player pinches, turns the wheel or slides the setting, the world already drawn is scaled about the camera's focus under the HUD, a preview. The new zoom is drawn a quarter second after they stop. A new size bakes the floor, walls and props again (about 0.4 s in the adventure), so it happens once, not at every step: a pinch with every step drawn hitched for up to 0.9 s in the adventure.
- **Rendering**: a `TileMap` keeps its baked wall blocks for its last four views, not one: back to a zoom or turn already seen is about 20 ms, not 120.
- **Engine** (agent edition): `game.upright`; `zoomBy` and `zoomRange` do nothing there, as `setZoom` doesn't.
- **Characters** (the starter kits, `src/starter/`): the kits declare their cameras.
  - The adventure zooms .85x to 2x on a wide screen and 1x to 2x held upright, where its forest is sized for 1x. The platformer zooms .75x to 2x and starts at 1.5x upright (`tall`), the brawler .75x to 1.5x and starts at 1.5x upright, and the RPG .75x to 2x, 1.5x upright.
  - The animation lab starts at 1.5x (`start`), the stealth kit zooms .75x to 2x, and the shooter's is off (its playfield is the screen).
  - The shell's own wheel, `-` and `=` and its upright fit (`fitZoom`) are gone: the engine does them. `0` resets the player's zoom too.
- **Tools**: `phone-test` section 6, zoom (50 checks):
  - Two fingers apart and together zoom, the hero standing; a thumb steering beside a resting finger zooms nothing; the zoom is kept across a reload.
  - Settings' slider zooms; the shooter has none.
  - The brawler starts at 1.5x upright and 1x on its side, and the player's .8 makes them 1.2x and .8x.
  - On a computer the wheel, `-` and `0` work.
- **Docs**: `API.md`, `AI_GUIDE.md` (Scenes, Camera), `README.md` and `docs/STANDARD-FEATURES.md` (touch, settings): the player's zoom and the `camera` option.

## 0.31.3 (2026-10-12)

The owner tested the adventure on the Galaxy S25: smooth with Frame rate on Auto.

- **Docs**: D25 and D26 in `docs/DECISIONS.md` confirmed by that test (the readings D26 waited for).

## 0.31.2 (2026-10-12)

Codex's review of 0.31.1.

- **Tools**: `replay.mjs --pacing`:
  - A stall that spans a change of refresh counts each second's share at that second's refresh: a 2.5 s stall from 60 Hz into 120 Hz read 299 refreshes missed, all at 120 Hz, and now reads 209.
  - A session begun hidden (a tab opened in the background: only its showing is recorded) leaves that time out too, and the hidden count is of gaps.
  - `phone-test`'s made-up session begins hidden (0.31.1: 537 refreshes missed, now 299).

## 0.31.1 (2026-10-12)

Codex's review of 0.31.0: the session a phone sends must replay, and read, true.

- **Engine**: a replay's pause menu has Save session too (doing nothing): the recorded tap on it landed on the next button, Quit to title, so a session saved from the menu replayed to Quit's question.
- **Tools**: `replay.mjs --pacing`:
  - Each second's refresh is read from that second (a phone with adaptive refresh changes it): a 60 Hz stretch after 120 Hz read as half its refreshes missed.
  - Time the page was hidden (its recorded visibility events) is left out: a locked screen read as minutes of missed refreshes.
  - A stall of seconds is spread over the seconds it took, each its own column (it filled one, and shifted the rest).
- **Tools**: `phone-test`: the session saved from the menu replays exactly and ends on the pause menu (0.31.0: on Quit's question); `--pacing` on a made-up session of 120 Hz, 60 Hz, hidden time and a stall (0.31.0: 1018 refreshes missed, now 299) (43 checks).

## 0.31.0 (2026-10-12)

A report of choppy play from a phone, with its evidence: the device's own refreshes, recorded and read in a second.

- **Engine**: a recorded page (`?record=1`, `E.session.record(true)`) has Save session in the standard pause menu: the session to the share sheet on a phone (a download elsewhere). A phone has no console to call `E.session.share()` from.
- **Tools**:
  - `replay.mjs --pacing`: no replay, the device's refreshes as the session recorded them (a frame's time is its refresh's): the refresh (the shortest gap that recurs), how many were missed and how unevenly, second by second. A 120 Hz phone dropping frames reads at a glance.
  - `phone-test`: a recorded adventure's pause menu, tapped on an emulated phone, has Save session, and it shares the session with its frame times (41 checks).
- **Docs**: `AI_GUIDE.md` (sessions), `CLAUDE.md` (bug reports).

## 0.30.1 (2026-10-12)

Codex's review of 0.30.0.

- **Engine**:
  - Frame rate 60 halves a screen of exactly 100 Hz too (a measured refresh wobbles: 95 Hz and up now).
  - Drawn every other refresh, 90 gaps of one and a half refreshes or more in a row mean the display slowed, and its refresh is read afresh (a GPU behind lets the refresh between through some of the time). Picked 60 on a 120 Hz phone that then dropped to 60 Hz, the readout said 120 HZ (EVERY 2) for good. Both editions.
  - A game made with `pace: false` draws every refresh unless the player picks Frame rate 60 (their 60 did nothing).
- **Tools**: `phone-test`: on the virtual clock, 60 on a 100 Hz screen, a display dropping to 60 Hz while at 60, and `pace: false` with the player's 60 (each fails on 0.30.0) (40 checks).
- **Docs**: the `pace` option's doc comment.

## 0.30.0 (2026-10-12)

The frame rate in the player's hands, as popular phone games put it: Settings, Display, Frame rate.

- **Engine**: Settings, Display, Frame rate (`game.settings.frameRate`): Auto (the engine's call, as before: every refresh while the game keeps up, every other one, evenly, when it can't), 60 (every other refresh on a screen of 100 Hz and up: 60 a second on a 120 Hz phone) or Full (every refresh, always). A phone whose GPU Auto misreads gets an even 60 by the player's choice, and the three side by side show on the device what the pacing does. Full edition (the agent edition has no settings screen: Auto).
- **Tools**: `phone-test`: on the virtual clock, Frame rate 60 draws every other refresh with light frames, Full every refresh with its GPU behind, and Auto paces it again (37 checks).
- **Docs**: `API.md` (the standard settings), `AI_GUIDE.md` (a phone's frame), `game.drawEvery`'s doc comment.

## 0.29.2 (2026-10-12)

Codex's review of 0.29.1, and a flaky check that turned out to be a bug: the frame pacing could lock itself up from the first frame.

- **Engine** (frame pacing, both editions):
  - The first frame's gap is no longer read as a refresh: it is timed from `start()`, not from one, and came in at 4 to 7 ms on a 120 Hz screen. Read, the refresh passed for 200 Hz, and a game whose frames turned costly within its first 90 (before others replaced it) stayed every other refresh for good, drawing each anyway, unevenly (a GPU behind: 49% of the gaps 16.7 ms). Since 0.29.0.
  - The hold after refreshes are missed goes back to 3 s once the game has drawn every refresh for 10 s (it only grew: after a few slow moments, any later one held a minute).
  - Drawn every other refresh, gaps shorter than one and a half refreshes are still read, so a display that changes its refresh rate meanwhile is followed (only the skipped refresh's double gap is left out).
- **Tools**: `phone-test`: the pacing on a virtual clock, in a page of its own (the test owns `performance.now` and the display's refreshes; deterministic, a minute of play in seconds): a costly frame from the first refresh, a GPU behind, the 3 s hold, its doubling and its reset, a display that drops to 90 Hz and rises to 144 Hz while paced (on 0.29.1, 8 of those 9 checks fail). The GPU-behind check no longer follows the costly runs on one page (their history paced it whatever the GPU did), and the light frame's check moved to the virtual clock (on a busy machine, real timers miss refreshes, which the engine is right to pace) (35 checks).
- **Docs**: D26 in `docs/DECISIONS.md` amended.

## 0.29.1 (2026-10-12)

The frame pacing of 0.29.0 only saw a frame's own cost (its JavaScript). A phone's GPU draws after it, out of the page's sight: one that falls behind at 120 Hz misses refreshes at random, which reads as choppy as before.

- **Engine**: frame pacing also counts the refreshes missed between frames drawn at each: when more than about one in five is missed (the GPU behind), it draws every other refresh, evenly, for 3 s, then tries each again (6 s the next time, 12... up to a minute). The display's refresh is measured only while each refresh is drawn (two apart, a GPU behind skips the one between and a 120 Hz screen passed for 60, turning the pacing off). Both editions (D26).
- **Tools**: `phone-test`: the 120 Hz screen's GPU falls behind (busy 5 and 11 ms by turns after each light frame, a refresh while busy skipped): drawn every other refresh, 90% of the gaps 16.7 ms (0.29.0: every refresh, 48% 16.7 ms and the rest 8.3), and every refresh again once it keeps up (30 checks).
- **Docs**: `game.drawEvery`'s doc comment and `AI_GUIDE.md` (a frame that misses the refresh, its GPU's part too), D26 in `docs/DECISIONS.md`.

## 0.29.0 (2026-10-12)

The adventure was still choppy on a Galaxy S25 (a 120 Hz screen) with its GPU lighting off: its frame didn't fit a 120 Hz refresh, so frames came 8 and 17 ms apart at random.

- **Engine**:
  - A fast screen (90 Hz and up) that a game's frames can't keep up with is drawn every other refresh, evenly, instead of at random; the updates still run at every refresh, and a game whose frame fits keeps the full refresh. `game.hz` (the display's refresh, measured) and `game.drawEvery` (1 or 2); `new E.Game({ pace: false })` draws every refresh as before. Both editions (D25, its own commit).
  - `r.actor(..., { every: 2, key })`: a background character's finished image (outline, rim light) is drawn again for a frame before it is drawn anew, at the place it stands now: townsfolk animate at half rate, as classic games' do, and a phone's frame goes to the hero and the foes. Not while it flashes, with a ghost, x-ray or GPU lighting.
  - Settings, Display, Show frame rate: at the top of the screen, frames drawn a second, the screen's refresh (and EVERY 2 when paced) and a frame's cost in ms, to read a game's speed on the device itself.
- **Characters** (the starter kits, `src/starter/`), adventure: the townsfolk and pets animate every other frame (its frame about 13 ms here before, 11 now: they were 5 of it); Lighting's Auto reads the main pointer (a phone with a stylus has a fine one too, and got GPU lighting).
- **Tools**: `phone-test`: a 120 Hz screen (frames on an 8.33 ms grid): it reads 120 Hz, a 10 ms frame is drawn every other refresh with most gaps 16.7 ms, a light one every refresh, `pace: false` every refresh (28 checks).
- **Docs**: `API.md` (`every`, `key`, the readout), `AI_GUIDE.md` (a phone's frame: 8.3 ms at 120 Hz, background characters at half rate, the readout), D25 in `docs/DECISIONS.md`.

## 0.28.0 (2026-10-12)

The first real-phone test of the kits: four things found in ten minutes, fixed, and a phone test that finds them in one.

- **Engine**: `input.steer = 'drag'`: a finger anywhere on the screen (the buttons aside) steers by `input.drag()`, with no stick drawn under it. The stick only took a finger on its own half of the screen.
- **Characters** (the starter kits, `src/starter/`):
  - Shooter: a thumb anywhere steers the ship, and the ship goes 1.5x as far as the thumb, so one swipe over two thirds of the screen crosses it. It took a thumb on the left half only, one to one: to cross the screen you lifted it and swiped again, and a touch on the right half did nothing.
  - Brawler: the street on the screen is the street you can walk. The camera stops at a fight's lock, so the screen's edge is the wall (Final Fight), and a lock never falls inside the screen (a wide one starts the fight at its edge). A wave used to stop the hero at a line in the middle of the street, with more of it in sight.
  - Adventure: Settings, Adventure, Lighting: Auto (GPU lighting on a computer, Fast on a phone), GPU or Fast. GPU lighting draws each frame twice and lights every pixel, which a phone's frame rate paid for; the floor is lit already.
  - RPG: on a touch screen the battle is played with big buttons a thumb hits (38 px tall, 44 CSS px and more on a phone), after mobile RPGs: a 3 x 2 grid of the commands and AUTO (the party fights by itself: heals the weakest, sweeps a crowd, hits the weakest foe), then a button per target with its HP, and BACK. The party's cards sit above the grid on a phone held upright, beside it on its side. A tap on a fighter still targets it; keys and a pad keep the command list.
- **Tools**:
  - `npm run test:phone` (`tools/phone-test.mjs`): the kits on an emulated phone, upright and on its side, in about a minute: the first tap on each title starts it, one swipe crosses the shooter's screen from anywhere, no brawler street in sight beyond where the hero can walk, Fast lighting and a frame in budget in the adventure, the RPG's buttons thumb-sized, a turn played by taps and AUTO fighting on (24 checks). With the fixes reverted it fails where the phone did. `test:changed` runs it for any change to the kits.
  - The shooter and the brawler have `state()` for tests, as the other kits do; `window.__game.titleMenu`.
- **Docs**: `AI_GUIDE.md` (smart phone controls: steering from anywhere, thumb-sized buttons, a camera that shows only walkable ground), `API.md` (`steer`), the README and `CLAUDE.md` (`npm run test:phone`).

## 0.27.5 (2026-10-12)

The full test after v0.27.4 failed in `stress-world` (its jump check), at random; the cause was in the check, not the game.

- **Tools**: `stress-world-test`: the jump check holds the press for 6 steps, as the game's input buffer holds one. A stray hit from the fight before it starts a hit-stop that skips steps, and swallowed a press that lasted only one (the hero "rose 0.0 units").

## 0.27.4 (2026-10-12)

From Codex's review of v0.27.2: three ways the RPG's portrait zoom fell short.

- **Characters** (the starter kits, `src/starter/`):
  - A phone held upright zooms in again for every new game. After the title or game over, the next RPG battle (or platformer or brawler level, after Retry) started at 1x: the shell still took it for the game it had already fitted.
  - RPG: the Gargoyle grows with the zoom as the other fighters do (its painted frames are cached at 1x and are now drawn at the zoom, pixels kept square). On a phone held upright it stayed small.
  - RPG: tapping a foe or ally counts anywhere on the fighter at any zoom. At 1.5x the top of the Dread Knight's helmet and the fighters' sides missed.

## 0.27.3 (2026-10-12)

A phone's first tap on a title sometimes did nothing: the kits' game entry needed a second tap about one time in five.

- **Engine**: a phone's first tap goes full screen, and the full-screen change clears the input (held keys, the stick). When it landed before the next step it wiped the tap too. A tap that has landed now still counts, and is placed on the screen when it lifts (where it touched what was drawn), not a step later after full screen has moved the canvas.
- **Tools**: `standard-test`: a tap whose full-screen change lands before the next step, with the canvas moved, still picks the entry it touched (108 checks).

## 0.27.2 (2026-10-12)

The RPG kit's two known nits on a phone: the seam where the plaza meets the painted grass, and small fighters on a phone held upright.

- **Engine**: a `TileMap` floor's contact shadow (`ao`) falls only along walls, not along the map's edge. A floor that runs on past the map (a painted ground, a backdrop) no longer meets it in a dark line. Both editions.
- **Characters** (the starter kits, `src/starter/`), RPG:
  - A phone held upright comes in to 1.5x, as the platformer and brawler do, and the two sides close up (closer together across, a little deeper in rank) so the whole fight still fits: the fighters are as big as a wide screen shows them. Turned on its side, they step back to their wide places; the player's own zoom holds until the shape changes.
  - The backdrop is painted for the zoom too, and its ground laid from the plaza's far edge on: one horizon across the screen, with no hill feet hanging below the treeline beside the plaza on a wide screen.
- **Docs**: `AI_GUIDE.md` says so.

## 0.27.1 (2026-10-12)

- **Characters** (the starter kits, `src/starter/`): the shooter's playfield is the whole screen on a wide one (a phone on its side, a desktop): the ship flies edge to edge and the waves spread to match, with no dimmed sides or gold rules. It was a 272-pixel column in the middle.
- **Docs**: `AI_GUIDE.md` says so.

## 0.27.0 (2026-10-12)

Every kit actually full screen on a phone, with a way back from every menu and controls made for thumbs.

- **Engine**:
  - On a touch screen the corner's menu button stays at the top right in play: it is the touch START (it pauses into the menu, or opens it on a title). START is no longer among the bottom touch buttons. Without the corner, a START of its own sits in the same place.
  - Every menu screen has a close button at the top right (where the menu button was), a back arrow at the top left when it is over another screen, and a sideways swipe on it goes back a screen.
  - The phone's back gesture steps back in the game before it leaves the page: an entry of the game's own in the page's history, added on a tap while there is somewhere to go back to. `game.back()` closes a menu screen, takes a scene's own `back()` (a sub-menu), or pauses play into the menu; at a title the next back leaves. `backGesture: false` leaves it out. The agent edition pauses.
  - Full screen comes back when a game starts on a phone after a gesture left it; only turning it off (the corner, the menu, `fullscreen.toggle()`) is kept. Settings version 2 forgets a version-1 `fullscreen: false` once (D24, its own commit).
  - `input.touchSet(a, label, show)`: a context button, relabelled or hidden while it has nothing to do (a hidden one lets go and leaves `touchArea()`).
  - `input.drag()`: how far the stick's finger moved this step, to steer one to one.
  - `game.cornerArea()`: where the corner's buttons cover the screen, to keep a HUD clear of them.
  - Pages get `overscroll-behavior: none`: no pull to refresh, no sideways swipe off the page.
- **Characters** (the starter kits, `src/starter/`):
  - Adventure: the rooms sit in a world that goes on past them (forest canopy above and below, the shrine's stone under the shrine), so a phone held upright is filled with world instead of a deck. A camera setting (Settings, Adventure, or C): Rooms slides screen by screen as Zelda's does, Scroll follows the hero. The HUD sits in the corners (the hero and hearts top left, gems, keys and a map of the rooms top right); the TALK button shows only beside someone and says NEXT in a dialog.
  - RPG: the HUD band on the bottom edge at every size and the battle in the space above it, a tall screen's sky darkening to the first stars. No touch buttons: tap a command, then a foe or ally; tap the commands (or back) to go back.
  - Platformer and brawler: a phone held upright zooms in to 1.5x, so the level and the street fill it; the player's own zoom holds until the shape changes. The brawler's enemy panel moves clear of the menu button.
  - Shooter: on a touch screen the ship follows the thumb one to one and fires by itself (no FIRE button); the HUD keeps clear of the menu button.
  - Stealth: ATTACK says TAKE DOWN when a takedown is in reach, BLOCK says PARRY in a guard's wind-up.
  - The game-over screen's back goes to the title. The page's "? API" button hides on a touch screen and fades after a few seconds on a desktop.
- **Docs**: the API card, `AI_GUIDE.md` (filling a screen edge to edge, smart phone controls), `docs/STANDARD-FEATURES.md`, the README; D24 in `docs/DECISIONS.md`. `examples/scarfrunner-side.html` (the prototype before the engine) fills a phone held upright and goes full screen at its first tap.
- **Tools**: `standard-test`: the corner's menu in play as the touch START, close and back buttons and a swipe on menu screens, the back gesture, `touchSet`, `drag`, full screen coming back with a new game, settings version 2 (107 checks).

## 0.26.3 (2026-10-11)

Two fixes from the review of v0.26.1's clicks and taps.

- **Engine**:
  - A click or tap counts when it lifts within a few pixels of where it landed, not when it lands. A thumb put down on a menu entry or a dialog to drag the touch stick no longer picks the entry or turns the page.
  - Any touch on the canvas makes the device touch (`input.lastDevice`), on the stick's half or not, so prompts switch to the touch buttons' names after a tap on the right half too.
- **Tools**: `standard-test`: a drag across a menu entry picks nothing, and a tap on the stick-free half makes the device touch (101 checks).

## 0.26.2 (2026-10-11)

The asset store plan, ready to run start to finish.

- **Docs**: `docs/HANDOFF-ASSETS.md`:
  - Section 12's prompt runs all five phases to completion in one go. Phase 0's gate is judged by the agent without waiting. Licenses stay CC0, and the paid benchmark waits for a yes (with no answer it is skipped). Each merged phase's Codex review is handled in a follow-up.
  - A new section 14 logs each merged phase, so a fresh session resumes where the last one stopped.
  - Phases take the next minor version instead of fixed numbers, which v0.26.0 and v0.26.1 overtook.
  - The manual budgets are re-measured at v0.26.1 (the agent header has about 97 tokens left).

## 0.26.1 (2026-10-11)

The kits' title menu could only be worked with keys or a gamepad: a click on an entry did nothing, and a phone, with no touch buttons on a title, could not get past it at all.

- **Engine**:
  - `E.Menu` answers to the pointer: a click or tap on an entry picks it, and the mouse over one moves the cursor. Every menu drawn with `menu.draw(r)` gets it: the kits' title and game over, and any game's.
  - A tap on an `E.Dialog`'s box finishes the line, then turns the page, as confirm does (a scene with no confirm button, like the brawler's boss taunt, no longer strands a phone).
  - `input.clicked()`: where a click or tap on the canvas landed, in screen pixels, for the step after it (for a HUD button of a game's own); `input.pointer()`: the mouse in screen pixels; `input.screenPoint(cx, cy)`.
  - `expand: { maxW, maxH }` never cuts the screen below `res` (a cap smaller than it is lifted to it). Both editions.
- **Characters**:
  - The kits' title says how on each device: "Tap a game to play it" on a touch screen, "Arrows + Enter or click" with keys.
  - From the review of v0.26.0: the brawler draws its foreground wall at every zoom (the camera keeps its band); the adventure's deck is measured from the hero's room in every view (isometric too); the RPG's HUD band moves right of the touch buttons when the player has put them on the left.
- **Tools**: `standard-test`: a tap and a click on a menu entry pick it, a tap beside it does not, a tap on a dialog turns the page (100 checks).
- **Docs**: `API.md`, `AI_GUIDE.md` and `docs/STANDARD-FEATURES.md` say menus and dialogs take taps and clicks.

## 0.26.0 (2026-10-11)

The starter kits are full screen at any shape (desktop, ultrawide, tablet, a phone either way up) with no black bars, and playable by touch. They were fixed 320x240 boxes (the shooter 240x320) letterboxed on every screen of another shape.

- **Engine**:
  - `expand: true` (a game's option, or a scene's): `res` becomes the least the screen shows, and the picture grows to fill the window at any shape with no bars (`r.W` x `r.H` grows; a 16:9 monitor shows about 427x240 of `'ps1'`, a phone held upright 320x690). `expand: { maxW, maxH }` caps it. Both editions.
  - The touch stick and a gamepad's left stick, pushed past halfway, press `up` / `down` / `left` / `right` as the d-pad does, so menus, dialog choices and the Platformer's ladders work with them. Before, a phone could not move a menu's cursor or climb a ladder. Both editions (the agent edition has no touch stick).
  - A bottom `E.Dialog` keeps clear of the touch buttons: beside them where it fits, else above them. `input.touchArea()` says where the buttons cover the screen, for a game's own prompts.
- **Characters** (the starter kits, `src/starter/`):
  - Every slice fills any screen with `res: 'ps1', expand: true` and a HUD anchored to the screen's edges, and makes something of the extra space:
    - Adventure: a wider screen shows the neighbouring rooms under a dim curtain. A taller one keeps the room at the top and lays the HUD out on a deck below it, with a map of the rooms; dialog opens on the deck.
    - Platformer: an upright phone lifts the level onto a band of soil, clear of the buttons, and the skies hang from the level's foot.
    - Brawler: an upright phone lifts the street onto a foreground wall, and wave spawns come from just past the screen's edge however wide it is.
    - Shooter: the playfield stays 272 wide, so the game plays the same, and is as tall as the screen. A wider screen shows the valley going on to each side, painted by the same functions, baked in strips as it scrolls in and dimmed beyond gold rules.
    - RPG: the sunset backdrop is painted at the screen's size, its ground the plaza's own grass and light. The HUD band sits on the bottom edge, or on a tall screen under the battle with a deck below; it slides clear of the touch buttons.
    - Stealth and the animation lab: their messages and timeline stay clear of the touch buttons. The lab gets touch buttons (replay, slow, hold) and its top bar drops below the corner's buttons.
  - Prompts name the player's own keys, after rebinding and on a gamepad (`prompt('attack', 'Sword')`, `input.label`), instead of hard-coded keys. That covers the HUD hints, the stage cards and the NPCs' lines. On a touch screen a hint the buttons already give is left out.
  - The title: a sixth hero in the lineup, the stealth slice's hooded assassin (one hero per genre slice). The ledge sits on the screen's bottom edge at any height, and the logo drops below the corner's buttons where it would reach them. START picks on the title and game-over menus, so a phone can start a slice. Game over is centred.
- **Tools**:
  - `tools/check.mjs --size 390x844@3` checks a game at any window size and pixel density (2 and up is a touch device). Its report says how much of the window the picture `covers` (1: no bars).
  - `standard-test`: expand at five shapes, the touch stick's directions, and a dialog clear of the touch buttons (98 checks).
  - The build's deep-link list for the full edition names `#stealth`.
- **Docs**:
  - `API.md`, `AI_GUIDE.md`, the agent edition's header and `docs/STANDARD-FEATURES.md` describe `expand`, what fills the extra space (the kits show four ways), the sticks' directions and `touchArea()`. `README.md` says the kits fill any screen.
  - The handoff package's template game fills any screen too (`expand: true`), its title and end screens centred, its prompt the player's own key.

## 0.25.5 (2026-10-11)

Two more details in the asset store plan, from a review of v0.25.4.

- **Docs**: `docs/HANDOFF-ASSETS.md`:
  - A body's span for shape collision runs from its feet to `z + h`. `E.Body` has no height today, so Phase 1 adds `h`, defaulting to a standing actor's.
  - `flip` is part of a raster's cache key, since it now mirrors the shape itself.

## 0.25.4 (2026-10-11)

A last precision pass on the asset store plan, from a review of v0.25.3.

- **Docs**: `docs/HANDOFF-ASSETS.md`:
  - A shape's `flip` mirrors the shape in its own axes before `facing`, unlike `r.prop`'s screen-space flip, so drawing and collision agree in every view.
  - A solid shape's collision box has a bottom as well as a top, so a body wholly below it passes under.
  - `sources` is keyed by download, and an entry's `src` is that key; entries never copy the record.

## 0.25.3 (2026-10-11)

More corrections to the asset store plan, from a review of v0.25.2.

- **Docs**: `docs/HANDOFF-ASSETS.md`:
  - A shape's `facing` means what a rig's does: where its front points, with 0 east. It defaults to π/2 (south), the direction shapes are written facing.
  - Collision for solid shapes is stated as requirements for Phase 1: the same placement as `r.shape`, and height-aware. `map.block` stops walkers, not jumpers, and is a whole tile wide.
  - `r.shape` has no `solid`, since `r.prop` has none to mirror.
  - TileMap gets `floorMat` for every floor cell, with `floorMats` per tag overriding it.
  - Each downloaded archive is one hashed source record that its entries name.
  - The recipe draws a set's shape by its qualified id.

## 0.25.2 (2026-10-11)

Corrections to the asset store plan, from a review of v0.25.1.

- **Docs**: `docs/HANDOFF-ASSETS.md`:
  - A facing at run time is in radians, as everywhere in the engine; only angles written in asset data are degrees.
  - A raster's cache key includes the shape's parameters, so two uses of one generator never share pixels.
  - Collision is gameplay, never drawing: a game registers a solid shape's footprint (`E.shapeFoot`) before its updates, and `r.shape`'s `solid` stays the renderer's option.
  - A set's ids are qualified by its name, so sets never overwrite each other or the core library.
  - Cutting a set carries the whole chain of shapes it `use`s.
  - The ledger keeps a hash of every downloaded file.
  - TileMap's material option is `floorMats`, since `floors` is the map's cache of baked floors.
  - A platform tile type keeps `style`, which picks its geometry, and gains `mat`.

## 0.25.1 (2026-10-11)

A plan for an asset store: objects, materials and pictures that agents write as data or translate from public libraries.

- **Docs**: `docs/HANDOFF-ASSETS.md`, the plan for the next releases. Most art families are closed today: 38 billboard props, wall faces, roofs and tile styles. Emberdeep adds its own walls by patching private engine methods, and builders read the source to find asset names.
  - Planning probed the idea. Eight objects written as 71 to 330 characters of data each (primitives with named materials) were drawn by a small depth-buffered renderer in every view and facing, with `E.tones` shading. Each read as itself in every view, and each with a matching prop looked at least as good as it.
  - The plan, in five phases:
    - a look gate with kill criteria (a Temporary lab);
    - an open material registry for floors, walls, roofs, tiles and shapes, plus `r.shape` and a core library (full engine);
    - a store of CC0 libraries converted with provenance and fit (Kenney, KayKit, ambientCG, CC0 pixel packs), with importers, sheets and an Asset Lab;
    - Emberdeep, the starters and the template game using it;
    - measuring tokens and look against canvas code and the benchmark.
  - It recommends extra (xhigh) effort and ends with the prompt that runs it.
- **Docs**: `docs/FEEDBACK-LOG.md` notes which parts of the two threshold themes (the look, reading the source) the plan takes up and which stay open.

## 0.25.0 (2026-10-11)

Emberdeep shows the engine's newer parts: perception, paired actions, the boot, rumble and the tools' handle.

- **Emberdeep**: Wardens (`32-wardens.js`). From depth 3, one to three hooded Wardens walk a beat on each level without a boss, a lantern on a staff, sweeping its light at each end. Each one's mind is an `E.Suspicion` fed by `E.sees` down its lantern cone (130 units, cut short by walls); `r.sightCone` draws exactly that cone on the floor, colored by its state: calm, notice ('?': it stops and turns), search (it walks to where it saw you and looks round), alert ('!'). Alert, it rings its bell for 1.4 s with its lantern held high (a stagger restarts it; `r.marker` points to it, on screen or at its edge), and the alarm wakes every monster that hears it (`E.hears`: 320 units, halved through a wall). A Warden that never rang leaves its tithe: gold and a magic item or better. A hit, or a noise it hears, tells it where you are.
- **Emberdeep**: executions and takedowns (`23-executions.js`), the engine's paired `E.ACTIONS.takedown` in play. A humanoid monster your hit staggers or crits at or under a quarter of its life (elites at 15%) reels for 2 s, its outline flickering, and E within 40 units executes it: the hero leaps onto it (the aerial takedown) and both bodies play one action. E within 22 units behind a Warden that hasn't raised the alarm takes it down silently (the ground takedown). Each gives back 6% of his life and a dodge charge; he can't be hurt while it plays. The target comes from `E.targets` (the nearest he can see), with a marker over its head and the prompt '[E] Execute the Skeleton'. An execution is heard 110 units away, a takedown 40: monsters that hear it wake with their packs. The autopilot executes whatever it can, so the title's demo shows them.
- **Emberdeep**: knocked flat, the hero gets up through the engine's `E.ACTIONS.getUp` (he sits up, comes to one knee and stands, untouchable until he is up; a dodge still rolls him out of it), where he popped straight back up.
- **Emberdeep**: the controller rumbles (`97-rumble.js`, the engine's `input.rumble`) with every screen shake, a blow taken (harder the more life it took), a crit (ten a second at most), a perfect dodge, an elite's or a boss's fall, a level and his death. Controls has a Vibration slider: the engine's `game.settings.rumble`, saved with the player's other choices.
- **Emberdeep**: the page's boot screen is Emberdeep's (`game.start({ boot })`): its title, an ember accent, lines of its own ("Whetting the longsword", "Filling the Wardens' lanterns") and two real steps: every monster's reach measured once (it was measured on each kind's first spawn) and the composed depths' order worked out ahead.
- **Emberdeep**: `game.debug`: `snapshot()` (mode, depth, level, mechanics, foes, the Wardens' states, the hero) is what `tools/check.mjs` prints and `tools/replay.mjs` logs; `teleport(x, y)` moves the hero.
- **Emberdeep**: the gallery's fifth reel, MOVES: the engine's actions on the hero, on a set of a stone block and a low wall (`r.box`) built to face the camera in any view: the execution and the takedown on real monsters, getting up, climbing up and down, hopping down, vaulting, a roll. `#gallery/moves/<name>` opens one.
- **Emberdeep**: Developer knobs for the new rules: execution threshold, reeling time and heal (Combat), a Warden's sight, its ring time and the alarm's reach (Monsters).
- **Docs**: `src/emberdeep/DESIGN.md`: the new parts, the BUS events `execute` and `alarm`, the `takedown` archetype flag, `m.hear` and `makeNoise`, and "What Emberdeep shows of the engine": a map from each engine part to where the game shows it, and what it leaves out on purpose. `README.md`: Wardens, executions, the MOVES reel, E and vibration in the controls.

## 0.24.0 (2026-10-11)

A boot for every game: a loading screen while there is work, and a report to screenshot when a game can't start.

- **Engine**: `game.start({ scenes, scene, boot: { title, version, steps: [[label, fn]], messages, min, checks, accent } })` runs the game's heavy setup one step a frame behind a boot screen: the system's checks (engine, browser, screen, canvas, GPU, sound, storage, input), each step with its time, a progress bar and lines of the game's own ("Counting the bells"; the engine's own when it gives none: "Reticulating splines"), then a warm-up frame drawn under it, so play starts without a hitch. A step may return a promise; headless and with `loop: false` the steps run at once (`game.booted`, `game.bootError`). The lines draw no numbers from the game's random stream.
- **Engine**: any error before play (a failing step, a script error, an error in the first update or draw) turns the screen into a report a player can screenshot: what failed, the error and where, a short code (`E3-` and six hex digits), and the system's lines, with Try again, Copy report and Continue. After play, errors keep the red box, which now ends with the report's short line. `E.diagnose()` gives the report at any time (`.text`, `.short`, and each field).
- **Engine**: `E.bootSplash(title)`: the screen's markup for the very start of a page's `<body>`. It shows from the first paint with a bar that moves while the page's scripts load (a CSS animation the browser runs on its own), and says so if the game's script never runs. The engine takes it over when it runs, and it goes once the game has drawn; `boot: false` takes it away at once. Both editions have the boot.
- **Emberdeep**: its page shows the boot screen from its first paint: on a phone-speed CPU at about 0.16 s, where it was 1.6 s of black.
- **Tools**: `tools/build.mjs` turns `<!-- @boot Title -->` into the splash (from the engine, so they never drift); the starter files, Emberdeep, Emberwell, Vesper's interface and the handoff template have it. `tools/check.mjs` and `tools/agent-test.mjs` count the failure report as the error box. `tools/standard-test.mjs`: 94 checks with the boot's.
- **Docs**: the boot in `AI_GUIDE.md` ("Standard features"), the API card, the agent edition's and the full engine's headers, `README.md` and `docs/STANDARD-FEATURES.md`. `docs/DECISIONS.md` D22 (the API index's budget rises to 37,000) and D23 (the boot, and errors before play as a report).

## 0.23.0 (2026-10-11)

Standard features in every game: what the owner's quality prompt asked of each game after it was built, now built in.

- **Engine**: every `new E.Game` has a pause menu (full engine) on its pausable scenes: Resume, the game's own items, Settings, Controls, Full screen, Help and Quit to title (it asks first, with Keep playing focused), by keys, mouse, gamepad or touch. Escape or B goes back a screen, P or Start closes the menu, and the game sees none of those presses. `menu: false` brings back the canvas PAUSED overlay.
- **Engine**: `game.settings`: the player's choices, saved per game with a version (`settings:` + the page's path, or `id`), every value checked when it loads (a bad one falls back to its default, blocked storage plays on with `saved: false`), applied at once: full screen, pixel scaling, sound, volume, music, effects, sound in the background, reduce motion, screen shake, screen flashes, the controller and touch settings, the bindings. A game adds its own with `menu: { settings: [...] }` and reads `game.settings.key`; `set`, `reset(group)`, `define`, `keys`, `spec`, `onChange`.
- **Engine**: the Controls screen and `input.rebind(action, 'keys' | 'pad', code)`: a key, mouse button or gamepad button rebound by pressing it; a conflict is said and changes nothing; Escape, Enter, the F keys, Start, the arrow keys and the d-pad stay with the menus; `unbind`, `resetBindings`; bindings survive scene changes (`input.use`) and are saved. `menu: { controls: { attack: 'Sword', debug: false } }` names actions or hides them.
- **Engine**: `game.fullscreen` (`supported`, `on`, `standalone`, `enter`, `exit`, `toggle`): the whole page; a phone's first tap goes full screen, and once the player leaves it the game never forces it back; refusals are noted; where it can't (an iPhone) the settings say to Add to Home Screen, and the page carries the home-screen app tags. `fullscreen: 'button' | false`.
- **Engine**: the corner: a menu button and a full-screen button at the top right inside the safe area, shown on titles, pauses and game overs, when the mouse nears the top, and (the menu) on a touch screen without touch buttons. `game.menu(name)` opens the menu, or the settings over a title. `corner: false`.
- **Engine**: a pausable scene pauses by itself when the page is hidden, the window loses focus or the controller in use is unplugged ("Controller disconnected"), and only the player resumes; `game.pause(reason)`, `game.resume()`, `game.pauseReason`; `autoPause: false`. A hidden page's sound sleeps unless "Sound in the background" is on.
- **Engine**: `input.label(action)`: the action's key or button on the device in use, after rebinding, for prompts ('Space', 'Left click', 'A', '✕'); `input.codeLabel(code)` (the keyboard's own letters where the browser gives its layout); `input.glyphs` and `padStyle()` (Xbox, PlayStation, Nintendo or positions, from the controller's name or the setting). `ui.hud({ prompt: { act } })` shows it.
- **Engine**: `input.rumble(strength, seconds)` and `stopRumble()` where a controller has an actuator; `game.hitFx` rumbles a gamepad (`rumble: false` skips it), scaled by the Vibration setting and stopped on pause, focus loss and unplugging. `game.shake` and `game.flash` follow the Screen shake and Screen flashes settings.
- **Engine**: touch: the START button is the menu (it starts a title and pauses a scene in play, as a gamepad's Start does: `Act:menu`); the touch buttons follow the player's settings (always, automatic or hidden; right or left side; size; opacity), sit inside the safe areas, and appear on a laptop's touch screen once it is touched; the stick has a dead zone (`stickDeadzone`, 12%) and is lifted when the screen resizes or turns.
- **Engine**: a phone's page: a viewport reaching the safe areas (pinch zoom left alone) where the page has none, and no page gestures, selection or callouts on every game's canvas. A fixed `res` fills a high-density screen (`screen.scale` 'auto', or 'sharp' and 'fill'; the Pixel scaling setting), so a phone loses no fifth of its screen to black bars.
- **Engine**: the agent edition has `game.settings`, `game.fullscreen`, the corner (its menu button pauses and resumes), the pausing and `input.label`; the menu screens are the full engine's.
- **Emberdeep**: its full screen goes through `game.fullscreen`; it keeps its own menus (`menu: false, corner: false, fullscreen: 'button'`), as do the labs with panels of their own.
- **Docs**: `docs/STANDARD-FEATURES.md`: the quality prompt's requirement matrix (what is built in, already met, the game's job or deferred), the presets' action coverage and the verification. "Standard features" in `AI_GUIDE.md`, the API card (its budget rises to 15,000: D20), the agent edition's header and the full engine's header (8a): adjust them, don't rebuild them, and what stays each game's job. `docs/DECISIONS.md` D21 (on by default), `docs/FEEDBACK-LOG.md` F5.
- **Tools**: `tools/standard-test.mjs` (`npm run test:standard`): 72 checks on both editions, in Node and in Chromium (a desk and emulated phones). The contract test's shell checks follow the new pause screen. The starter's API card button moves left of the corner.

## 0.22.4 (2026-10-11)

- **Tools**: `tools/ed-character-test.mjs` waits in game time, not on the wall clock: a second of it after a character arrives in town, 0.35 s of it while D is held, and for the game to take a tap on a skill button (up to 5 s) rather than a fixed 120 ms. On a loaded machine the browser draws fewer frames, each worth at most 50 ms of game time, so the hero was still arriving in town when the test pressed D; the check failed in the full run after v0.22.3 ("moved 0.2 units") though nothing it covers had changed.

## 0.22.3 (2026-10-11)

The Vesper round closed out.

- **Docs**: `docs/FEEDBACK-LOG.md` marks the benchmark's runs, left waiting on the owner when the plan ended, as taken up in v0.22.1 and v0.22.2.
- **Tools**: `.gitignore` keeps `temp-feedback/`, the folder where builders' feedback lands before it is read, out of the repository.

## 0.22.2 (2026-10-11)

The benchmark's other two briefs.

- **Docs**: `DOCTRINE.md`'s measures get the Breath of the Wild village and the Arkham predator room. Both first builds pass the check and their own tests, neither patched the engine, both scored 6/10; about 27.9k and 26.2k tokens of game code, 209k and 278.8k output tokens, $12.75 and $16.50. The Assassin's Creed row's count of reads below the header is corrected from 18 to 13 (the stricter count below).
- **Docs**: `docs/FEEDBACK-LOG.md` F3 (Breath of the Wild) and F4 (Arkham): the source read for the same things in all three runs (the rig's pose keys, joints and colours; how `Dialog` holds play and takes choices); the look and `E.Shell` unused now at their thresholds (three sources each); a new theme, climbing any wall and gliding written by the games (`E.Mover` climbs ledges only).
- **Tools**: `tools/agent-bench.mjs` counts a whole session: an agent woken again by its background tasks sends a result for each turn, and the Arkham row first read 3k output tokens, its last turn alone (the session's tokens now come from `modelUsage`, its subagents included). A script that only loads the engine (a heredoc, `node -e`) no longer counts as reading its source, and importing the tool for its functions no longer runs its command line.

## 0.22.1 (2026-10-11)

The benchmark's first run.

- **Docs**: `DOCTRINE.md`'s measures get their first row. The Assassin's Creed brief, given to Claude Code (Opus 5.5) with the handoff package: about 27.5k tokens of game code (Vesper wrote ~50k), a first build that passes the check and its own test, no engine patch, the engine read below its header 18 times, and 6/10 from the judge. The other two briefs didn't complete (memory pressure on the machine; not run). D19 answered.
- **Docs**: `docs/FEEDBACK-LOG.md` F2, the run's points: what it read the source for (the rig's state keys, preset lists, the song format and more), now at its threshold with F1; the look; the canvas interface instead of `E.Shell`.
- **Tools**: `tools/agent-bench.mjs` writes the agent's stream to disk as it comes (a run can be watched, and a stopped one keeps what it did), says when an API error cut a run off (a usage limit, a budget), measures the game code the agent wrote (its tests apart; output tokens include thinking, so they don't compare with code), and keeps the judge's answer when it has no score.

## 0.22.0 (2026-10-11)

The North Star's measures get a tool. Phase 5 of the Vesper plan.

- **Tools**: `tools/agent-bench.mjs` (`npm run bench`): it copies `dist/handoff/` into an empty directory outside the repository, hands a brief to a fresh coding agent there (`claude --safe-mode`: none of this machine's instructions, skills, plugins, hooks or MCP servers; or `codex exec`), and records its output tokens, cost, turns and wall time, whether its first build passes `tools/check.mjs` and its own `game/test.mjs` (the package's template game alone doesn't count), whether it read the engine below its header, searched it or patched it, and a vision judge's 1-10 score of the check's screenshots against the PS1/N64 bar. One table row per run, ready for `DOCTRINE.md`. `--dry-run` sets up and starts nothing, `--rescore` scores a finished run again, `--selftest` checks the stream reader and the scoring on fixtures.
- **Tools**: three briefs in `tools/agent-bench/briefs/`: Assassin's Creed (Vesper's, the baseline), a Breath of the Wild village with climbing and stamina, and a Batman: Arkham predator room; the judge's rubric in `tools/agent-bench/judge.md`. `npm test` runs the selftest (suite `bench`).
- **Docs**: `DOCTRINE.md` (the measures have a tool; runs wait on the owner, D19), `README.md`.

## 0.21.0 (2026-10-11)

An HTML interface for modern adaptations, built from data. Phase 4 of the Vesper plan.

- **Engine**: `E.Shell` (section 21d), an HTML interface over the game: the screens a modern adaptation writes by hand (title, pause, settings, help, results, a district map with a waypoint, or your own) from specs, and HUD pieces from each step's state (an objective with its distance and whether it is above or below, status, pips and bars, counts, a hold-to-interact prompt, a tip, the place's name, a control bar, on-screen buttons, a minimap drawn from a `TileMap` with markers), plus toasts and a tutorial card. It holds no game state: values come in every step and buttons call back (or tap an input action). With a pause spec it follows `game.paused`. The game's input moves its focus (keys, d-pad, stick; sliders turn) and is held back from the game while a screen is open; touch taps. Built-in settings (sound, volume, reduce motion) apply themselves and every setting is saved with `E.store`. It honors reduced motion and the safe-area insets, CSS variables theme it, it is headless-safe, and `game.dispose()` takes it away. `game.shell` is the one over a game.
- **Engine**: the agent edition has a stand-in `E.Shell` that does nothing (it warns once), so full-engine code runs there without its interface.
- **Tools**: a Temporary lab, "Vesper's interface on E.Shell" (`examples/vesper-ui.html`, `/vesper-ui`): Vesper's whole interface rebuilt over a small stand-in game. It comes to 2,090 cl100k tokens (`src/vesper-ui.ui.js`), against the 15.2k of HTML, CSS and glue Vesper wrote by hand: 14%, under the plan's quarter.
- **Tools**: `tools/contract-test.mjs` holds the shell to its word: the HUD shows what it is given, the pause screen follows `game.paused`, the game's input moves the focus and is held back while a screen is open, a button's act reaches the game, settings apply, toasts time out, `dispose()` takes it away, and headless it keeps its screens' names.
- **Docs**: `API.md` (one line), `AI_GUIDE.md` ("Shell"), `README.md`, the engine's header; D18 records its pull request.

## 0.20.0 (2026-10-11)

A third-person kit: a ground controller that climbs, vaults and leaps between roofs, timed actions, guards that see, hear and search, and a stealth starter. Phase 3 of the Vesper plan.

- **Engine**: `E.Mover`, the ground views' answer to `Platformer`: a `Body` that walks, runs, sprints and sneaks with acceleration, jumps with coyote time and a buffer (once a press: a press in the air during a leap no longer jumps again), and on a jump press climbs a ledge, vaults a low wall at a run, leaps a gap (aiming for the far side's landing) or hops down; it rolls out of a long fall, sets `hurt` past `hurtAt`, keeps its last safe spot for `respawn()`, and takes `game.input` or an AI's intent. `hero.rigState()` feeds the rig.
- **Animation**: `E.ACTIONS` and `E.Action`: timed actions of several beats that move a body along a curve and pose its rig: `climbUp` (backwards to climb down), `vault`, `hopDown`, `roll`, `getUp` and `takedown`, a paired action that drives two bodies at once. Beats where it can be cut short (`canCancel`), invulnerable frames, `otherState()` for the victim's rig, and your own actions in the same form. Timings seeded from the animation survey, judged on filmstrips in the iso, three-quarter and side views.
- **Animation**: the rig's traversal states: `hang` (gripping a ledge against the wall), a sneaking gait (`crouch` while moving: shorter, lower strides), a sprint lean (`sprint`), a heavy landing (`land`, or `rig.land(strength)`: the knees give and, hard enough, a hand goes to the ground) and a forward roll (`flip`, Emberdeep's dodge roll moved into the rig, lifted so the head never dips through the floor).
- **Engine**: perception through the height rules: `E.sees(observer, target, { map, range, fov })` → `{ seen, d, angle, exposure }` (three points on the target against every top; crouching and the target's own `exposure` hide it), `E.hears(listener, noise, map)` (halved through a wall), and `E.Suspicion`, a guard's mind that rises with sight and nearness, decays, and names a state (calm, notice, search, alert), with the last place it saw or heard the target; an alert guard that loses it searches a while.
- **Engine**: `FlowField` option `jump`: links roofs across a gap a jump clears (by `map.landing`'s rules). In such a field a climb costs one plus its rise in cells, so a chase leaps rather than drop to the street and climb back. `flow.next(x, y)` → `{ x, y, z, kind: 'walk' | 'climb' | 'drop' | 'jump', edge }`: where to head and when to press jump.
- **Engine**: maps built in code: `new E.TileMap({ w, h })` starts as open floor, `{ floor, blocked }` options, `map.fill(cx, cy, w, h, id)` and `map.setFloor(cx, cy, tag, block)`.
- **Engine**: `E.Input.THIRDPERSON`: move, Shift sprint, Space jump and parkour, C crouch, E interact, J attack, K block, L dodge, Q use, M map, and a pad layout.
- **Rendering**: `r.sightCone(observer, { map, range, fov, color, alpha })`, a dithered fan cut short where walls hide a body; `r.marker(x, y, z, { label, color })`, an objective marker that becomes an arrow at the screen's edge; `footprint: [x0, y0, x1, y1]` for `r.queue`, `r.prop` and `r.sprite`, so a big thing (a canopy over a tower) sorts over every block under it.
- **Art**: facades from wall-type options: `windows`, `door`, `shutters`, `balcony` and `arch`, placed by a hash of the cell so a street varies; and `types[id].decorate(face)`, a painter called as each wall face is baked (cached with the wall).
- **Engine**: the agent edition gets the small pieces: `map.fill`, `map.setFloor`, the open `{ w, h }` map, `E.sees`, `E.hears` and `r.marker`. There `r.sightCone` does nothing (it warns once), and `E.Mover`, `E.Action` and `E.Suspicion` throw an error that names the full engine.
- **Engine**: the STEALTH starter (`src/starter/70-stealth.js`, `dist/kits/my-3d2dge-stealth.html`, `/kits/stealth`): a rooftop district at dusk with facades and a belfry; three guards (one on a roof) that patrol, notice, search and chase across roofs; telegraphed swings and a parry; takedowns from behind and from above; hiding crouched in tall grass; the ledger as a checkpoint and the east gate as the exit, with markers; touch buttons.
- **Emberdeep**: the hero's dodge roll is the rig's roll now (the rig state `flip`), in play and in the character menu's preview; Emberdeep's own copy is gone. It reads the same, half a pixel higher at its lowest.
- **Tools**: `tools/contract-test.mjs` holds the kit to its word: the Mover climbs, vaults, leaps, hops down, rolls, takes fall damage, jumps once a press and respawns; actions (your own, paired, invulnerable, cancellable); perception; jump links and `next()`; maps built in code; and in Chromium, footprints, the decorate hook, the marker's edge arrow and the cut sight cone (211 checks over both editions).
- **Tools**: `tools/doctrine-check.mjs`: the API index's budget is 34,000 tokens (D18); Emberdeep no longer reaches into the rig's `_cheat`, so it is no longer grandfathered there.
- **Docs**: `API.md` (the Mover and stealth in a paragraph, a genre-playbook row), `AI_GUIDE.md` ("Mover and actions", "Perception", maps built in code, facades, footprints, jump links, a stealth recipe), the agent edition's header (its new pieces, a playbook line, the kit), `README.md` (the kit, the slice, genre coverage), the Labs page's kits.

## 0.19.0 (2026-10-11)

The handoff package: a coding agent given one folder can build, test and check a game on the full engine without reading the engine's source. Phase 2 of the Vesper plan.

- **Engine**: a game's lifecycle (both editions): `game.stop()`, `game.start()` with nothing (resumes), `game.dispose()` (stops the loop, removes every listener the engine added to the window, the document, the canvas and its buttons, closes the sound, drops the GPU lighting), and `game.advance(seconds, { draw })`, exact fixed steps at once without `requestAnimationFrame`. `new E.Game({ loop: false })` runs only by `advance`.
- **Engine**: headless games (both editions): `new E.Game({ headless: true })`, the default where there is no DOM (Node), has no screen, renderer, sound or DOM input; scenes update and `draw` is skipped. Its screen is sized as a 1280 x 720 window would size it, and canvases made while a game loads (sprites) are stand-ins whose drawing does nothing. `input.tap(action)` presses an action for one step and `input.hold(action, on)` holds it, beside `press(code)` and `release(code)`.
- **Engine**: `game.debug`, a game's own handle for tests and tools (`{ snapshot(), teleport(x, y, z) }`): `tools/check.mjs` prints `snapshot()` and `tools/replay.mjs` logs it at the end of a replay.
- **Engine**: every public name has a doc comment (723 of them), and about 110 members that were public only by name are private now (`_`): the renderer's scratch canvases, the lighting's and the GPU lighting's buffers, the input's bookkeeping, the rig's internal weights. No game or tool used them. Both editions.
- **Docs**: `API-INDEX.md`, the API index: every public name, one line each, with its signature, its default and what it does, grouped by the engine's sections, with the units and the height rules at the top and two examples. Names the agent edition lacks are marked. 27,270 tokens, under a budget of 30,000 (`docs/DECISIONS.md` D17).
- **Tools**: `tools/api-index.mjs` writes the index from the engine (`--missing` lists names without a description); `tools/build.mjs` runs it and writes `dist/handoff/`; `tools/doctrine-check.mjs` fails when the index is stale or a public name has no description, checks the index's budget, and keeps `docs/FEEDBACK-LOG.md` from losing a source or a point, as it does the decisions log.
- **Tools**: `dist/handoff/`, the handoff package (text only): the readable engine and the agent edition, `API.md`, `API-INDEX.md`, `AI_GUIDE.md`, `tools/check.mjs`, `filmstrip.mjs` and `replay.mjs` (they work outside the repository), a `package.json` pinning Playwright 1.63.0, and `game/`, a template game (a rooftop thief: climbing with `map.ledge`, a guard with `map.sight`, scenes, a HUD) with a headless test. The site serves it at `/handoff/`; `node tools/handoff.mjs --zip <file>` zips it for a chat (outside the repository).
- **Tools**: `tools/contract-test.mjs` runs every fenced example in `API.md` and `API-INDEX.md` on both editions, the lifecycle (advance, tap, hold, dispose taking its listeners away, `loop: false`), `Body.step`, and the template game's test and page. `tools/labs-test.mjs` checks the site serves `/handoff/`.
- **Docs**: the engine's header (tests, and what the handoff package holds instead of repository paths), the agent edition's header (one line on tests), `API.md`, `AI_GUIDE.md` ("Testing without a browser", "The handoff package"), `README.md` (the package in "Share it with an AI model", the index in the docs list), `DOCTRINE.md`, `CLAUDE.md`.

## 0.18.0 (2026-10-11)

One spatial API with height: collision, standing, sight, reach and navigation read heights the same way. Phase 1 of the Vesper plan.

- **Engine**: the height rules, in both editions and written once (`E.HEIGHTS`, the engine's section 1, `API.md`, `AI_GUIDE.md`): a body's `z` is its feet, a cell's top is `map.height(cx, cy)`, a body stands on the highest top within `z + 2`, eyes at `z + 30` see a target at `z + 22` (a size-1.3 Humanoid; a body's own `eye` and `chest` override them), and the same level is `|dz| <= 8`.
- **Engine**: queries on a `TileMap` (both editions). `map.ray(a, b, { eye, target })` walks every cell between two points (no gaps) and says where it stops; `map.sight(a, b)` sees over a planter lower than the eyes and down from a roof, where `los()` only looks across the ground. `map.standable(x, y, z, r)`; `map.ledge(from, dir)`, the nearest top to pull up onto and where the hands grip; `map.landing(from, dir)`, a spot across a gap that a jump arc clears; `map.drop(from, dir)`, what lies past the edge ahead; `map.arcClear(a, b, apex, r)`. A direction is an angle or a ground vector.
- **Engine**: `E.targets(from, list, { range, arc, facing, dz, sight: map, filter })` gives the eligible targets nearest first, on the same level by default (melee auto-aim, lock-on, takedowns, interaction prompts); `E.sameLevel(a, b)`; `E.inArc(a, facing, b, range, halfAngle, dz)` takes an optional height limit (left out, it stays flat, so Emberdeep plays as before).
- **Engine**: `new E.FlowField(map, { step, climb, drop })` walks the tops a body can stand on: a guard on a roof gets a field across the roofs, and with `climb` and `drop` it chases between levels. With no options paths stay on the floor as before (walls no higher than 2, which bodies already walk over, are walkable now; no game has one).
- **Tools**: `tools/contract-test.mjs` checks each query on small maps (a roof edge, a kerb, a gap with and without a pole in it, a planter, a guard above the hero), on both editions.
- **Docs**: `API.md` (a heights paragraph), `AI_GUIDE.md` ("Heights: roofs, ledges, sight and reach", with an example), the agent edition's header.

## 0.17.5 (2026-10-10)

The clock is an exact fixed step: the same inputs play the same game at 60, 90, 120 or 144 Hz. Phase 0 of the Vesper plan.

- **Engine**: the clock (both editions). Each frame's real time (at most 50 ms) fills an accumulator, and each whole 1/120 s of it runs one update of `dt = 1/120 * game.timeScale`; the rest waits for the next frame (`game.alpha`, 0..1, for a game that wants to interpolate). 60 Hz runs two steps a frame and 120 Hz one, as before; 90 and 144 Hz now run the same steps as 60 Hz instead of steps of 1/180 and 1/144 s, so a jump peaks at the same height on every screen. Slow motion makes steps shorter, never fewer (Emberdeep's perfect dodges stay smooth); above speed 1 a step is split so none is longer than 1/120 s. Paused or at `timeScale` 0, input still ticks. The engine's header promised this before and didn't keep it.
- **Engine**: flow fields follow the map (both editions). `map.block()` bumps `map.version` when a cell changes, and `FlowField.update` rebuilds when the target's cell or the map's version changes: a bridge blocked with `block()` or a door opened with `set()` reroutes at the next update, where before the field kept the old paths until the target moved to another cell.
- **Engine**: `game.fps` counts real frame time (both editions); it never read under 20 before, because it added up the 50 ms-clamped time. `game.stats.frameMs` is the real time too.
- **Engine**: `audio.duck(on)` (both editions): quieter music under a game's own pause or map screen. Vesper reached for the private `_duck`, which the engine reset every step.
- **Engine**: the first frame always updates before it draws (with `dt` 0 when its time is short of a step), as the old clock did; the Mocap Lab draws what its first update sets.
- **Engine**: a recorded session starts when the page has loaded, as its replay does (`E.session`): frames wait for it, and the person's inputs that come before it are held back. Chromium's own pointer move, as a page lays out under the cursor, reached the recording before Emberdeep listened and reached the game in the replay, so Emberdeep's sessions diverged at their first checksum wherever the page loaded slowly: `npm run test:replay` failed this way on v0.17.4 too.
- **Tools**: `tools/contract-test.mjs` (`npm run test:contract`, a suite of `npm test` and `test:changed`): one test per documented behavior an agent relies on, on both editions. Now: the same inputs at 60, 90, 120 and 144 Hz give the same state bit for bit, steps of 1/120 s, slow motion, pause and timeScale 0, the frame counter, flow fields that follow `block()` and `set()`, `audio.duck`. Run against v0.17.4 it fails 27 of its 42 checks.
- **Tools**: `tools/filmstrip.mjs --hz 144` records on a virtual display at another refresh rate.
- **Docs**: the engine's header (item 6), the agent edition's header, `API.md` (rule 1, `duck`, flow fields), `AI_GUIDE.md` (hard rule 1, the frame order, why recorded sessions replay) and `DOCTRINE.md` describe the new clock; `docs/DECISIONS.md` D16 supersedes D4's substeps.

## 0.17.4 (2026-10-10)

Corrections to the Vesper plan.

- **Docs**: `docs/HANDOFF-VESPER-FEEDBACK.md`: the fixed-step clock keeps today's runs only at normal speed. In slow motion its steps get shorter rather than fewer: Emberdeep slows to 0.3-0.4, where fixed game-time steps would update on only about 60% of frames. Old and new clocks are compared with a seeded filmstrip against the build before, since the determinism and replay tests compare a build with itself. If nobody answers about spending on the benchmark runs, the plan's call is to run nothing. `Land_Three_Point` is already Emberdeep's landing clip.

## 0.17.3 (2026-10-10)

The first feedback from a model that built a game on the engine, checked against the code, with a plan for the next steps.

- **Docs**: `docs/HANDOFF-VESPER-FEEDBACK.md` checks a GPT-6 model's Assassin's Creed adaptation, Vesper, against the code. Every claim it made about the engine holds. The step size follows the refresh rate, so physics differs at 144 Hz, though the header says it doesn't. Flow fields go stale when the map changes. Sight, reach and navigation ignore height. The engine file points to docs and tools it doesn't include, so the model read the source to find 28 undocumented members. The plan, in phases: an exact fixed-step clock and flow fields that follow the map, then one height-aware spatial API, a handoff package (lifecycle, headless runs, a checked API index, contract tests, tools and a template), a third-person kit (actions, a ground controller, navigation over heights, perception, facade hooks, footprint sorting, a stealth starter), an HTML UI shell, and a benchmark with fresh agents. It recommends xhigh effort for the work.
- **Docs**: `docs/FEEDBACK-LOG.md` keeps builders' feedback points that we did not act on, counted by theme, so a pattern shows when the same point comes back. `CLAUDE.md` says how to process feedback, and `README.md` lists the log.

## 0.17.2 (2026-10-10)

The portable math checked in Safari's own engine.

- **Tools**: `tools/cross-engine-math.cjs` (`npm run test:cross-engine`; needs Bun, `BUN=/path/to/bun`) runs the same code in V8 and in JavaScriptCore, Safari's engine. With native math the two engines gave different bits, both for 2.8 million math results and for the engine's Humanoid animated for 3,000 steps. With the portable math they gave the same bits for both, so a session recorded in Safari replays in Chromium as it played. Without Bun it says so and passes.
- **Docs**: `AI_GUIDE.md` (recorded sessions); `docs/DECISIONS.md` D15 records the result.

## 0.17.1 (2026-10-10)

A session recorded in any browser replays in Chromium bit for bit: an iPhone's Safari included.

- **Engine**: portable math while recording and replaying (`E.session.math`). `Math.sin`, `cos`, `tan`, `atan`, `atan2`, `asin`, `acos`, `exp`, `log`, `log2`, `log10`, `pow`, `hypot` and `cbrt` are built from exact operations only, so browsers that round these differently in the last bit (Safari and Chromium do) play a session the same. `sin`, `cos`, `atan`, `atan2`, `exp` and `log` follow fdlibm and give Chromium's own bits on every one of 200,000 random inputs each; large angles stay exact to about 1e12. Outside a session the browser's own are used.
- **Tools**: `tools/replay-test.mjs` records Emberdeep in a browser whose own math is one unit in the last place off everywhere and replays it in Chromium: every checksum matches (without the portable math, the same session diverges at its first checksum).
- **Docs**: `AI_GUIDE.md`, `API.md`, the engine's section 23, `DOCTRINE.md`; `docs/DECISIONS.md` D15.

## 0.17.0 (2026-10-10)

Play sessions recorded on any device replay exactly in a headless browser, so a bug seen on a phone happens again where an agent can look at it.

- **Engine**: `E.session` (section 23). `E.session.record(true)` records every later page load (`?record=1` for one): a seed for `Math.random`, every display frame's time (the clock reads it during the frame), every input from the person or the device with the frame it arrived before (keys, pointer and touch, wheel, clicks and form edits, focus, visibility, resize, full screen), gamepad readings, the media queries the game asked, the safe-area insets, the screen and the save at the start, and a checksum every 60 frames. `E.session.save()` gives the JSON, `E.session.share()` the share sheet on a phone or a download elsewhere. `game.stateHash = () => [...]` adds a game's own state to the checksum. While recording, the GPU lighting is off and update/draw timings read 0 ms.
- **Emberdeep**: Developer → Guide → Record a session: turn recording on, see how long this session has run, save it for a bug report. Its checksum includes the hero, the level and the crowd.
- **Tools**: `tools/replay.mjs` (`npm run replay -- session.json`) replays a session in headless Chromium at the recorded screen, frame by frame, with `--to`, `--shots`, `--log` and `--page`, and reports the first checksum that differs. `tools/replay-test.mjs` (`npm run test:replay`, a suite of `npm test` and `test:changed`): sessions recorded in real time at a desk and on a phone by touch in Emberdeep, and in a starter game, replay with every checksum matching and the same end state; a session with one key press taken out diverges.
- **Docs**: `API.md`, `AI_GUIDE.md` ("Recorded sessions"), `README.md`, the engine's header and `CLAUDE.md` say how to record and replay; the agent edition's header says the full engine has it. `DOCTRINE.md` marks replay done; `docs/DECISIONS.md` D14 (D12 points to it).

## 0.16.1 (2026-10-10)

Escalation by what a revert can undo.

- **Docs**: `DOCTRINE.md` and `CLAUDE.md`: in the engine tier a reversible call (anything a revert undoes) is made at once, in its own commit, flagged in the pull request and logged; only a call that reaches outside the repository or can't be reverted waits on the 15-minute wake-up timer. `docs/DECISIONS.md` D13; D11 points to it.

## 0.16.0 (2026-10-10)

The agent edition catches up with the full engine, a joint's position gets a public name, and sound stops shifting the game's random numbers.

- **Animation** (agent edition): a motion clip now turns the face, belt and toes with the body and the head, as in the full engine (`Humanoid._offsets`: a cartwheel goes upside down, the face follows the clip's head), and the cape trails behind the body's turn, not its facing alone. Both reached the full engine on 2026-10-06, after the agent edition was cut from it, and were never ported.
- **Engine**: `rig.worldOffset(p)`, in both editions: where a point in the rig's own frame (a joint in `rig.J`, or one offset from it) sits from its feet. It is what the private `rig._w` did; the starter games and the arena use the public name now, so models that copy them learn it. `API.md`, `AI_GUIDE.md` and the agent edition's header document it.
- **Engine** (agent edition): `cam.offset`, where the camera's focus sits on screen ([0, -40] keeps it above on-screen buttons), as in the full engine.
- **Engine**: the chip synth draws its own random numbers (both editions). It drew from `Math.random` only while sound existed, ran unmuted and wasn't throttled, so sound shifted every random number the game drew after it; now the same seed and inputs play the same game with sound on, off or muted.
- **Docs**: `DOCTRINE.md` and `CLAUDE.md`: an escalation arms a 15-minute wake-up timer (`send_later` in cloud sessions) and keeps working; a deviation with a case is welcome. `docs/DECISIONS.md` D10 (the owner kept D3 to D6), D11 (the timer) and D12 (replaying recorded sessions: the plan, and its trigger); D4 and D6 point to what changed.
- **Tools**: `tools/doctrine-check.mjs` no longer grandfathers `_w` in the starters and the arena, and points a new use of it at `rig.worldOffset(p)`.

## 0.15.0 (2026-10-10)

The doctrine adopted: what the engine optimizes and ten principles for an engine built for AI coding agents, with a check for each one this repository can hold, and existing code grandfathered rather than rewritten.

- **Docs**: `DOCTRINE.md`, the doctrine (agent-readable, agent-operable, verifiable without a display, assets as code and data, deterministic, the GPU rule, common ground, quality under the hood, pin what agents know, discovery first), then how each principle applies here, what was grandfathered and which check holds it. `docs/DECISIONS.md`, the decisions log, never cleaned up: the adoption and nine calls (D1 to D9), among them the engine keeping Canvas 2D, determinism coming from the test harness, one-file pages, and the token budgets for the manuals.
- **Docs**: two tiers. Prototypes are the Temporary labs: a change confined to one merges without a version bump or a changelog line, may reach past the engine's API, and notes any deviation in its `labs.json` entry (`deviates`, shown on the Labs page; the two 3D labs keep three.js's WebGL 2 fallback). Everything else is the engine tier. `CLAUDE.md` says how to deviate, escalate and record a call.
- **Tools**: `tools/doctrine-check.mjs` (`npm run doctrine:check`, run with the version and syntax checks by `npm test` and `npm run test:changed`): no binary file outside the approved list; the agent edition's header under 10,000 tokens and the API card under 13,500; no new use of the engine's private members outside `engine/` in the engine tier (today's uses are grandfathered by area, a prototype's are listed as the engine's to-do list, `--todo`; first on it, `rig._w`, which the starter games use); and no entry gone from the decisions log.
- **Tools**: `tools/determinism-test.mjs` (`npm run test:determinism`, a suite of `npm test` and `test:changed`): a fight in Emberdeep (a pack spawned on depth 3) and in the brawler starter, each played twice under the filmstrip's virtual clock and seeded randomness, must match pixel for pixel. `tools/filmstrip.mjs --expect-same` exits 1 when compared runs differ.

## 0.14.1 (2026-10-09)

Dead weight out: plans that were finished or never built, a dated audit and an unused tool. Every linked lab stays.

- **Docs**: `docs/ANIMATION-RESEARCH.md` is gone (a survey of famous animations and a build list of ones to ship ready-made, never started), and so is `docs/CONTROLS-AUDIT.md` (the 2026-09-29 controls audit, long done). `docs/LAB-3D.md` keeps the 3D labs' decisions, trade-offs, contents, build and lessons and drops the finished plan's milestones, judging criteria, fallbacks and scope. `docs/MOCAP.md` drops its "Looking ahead" list of open questions; `docs/DAN.md` drops what building Dan changed in the tools (0.8.0 below has it).
- **Tools**: `tools/slice-test.mjs` is gone: nothing used it, and the genre kits (`dist/kits/`) are already the engine, the shell and one slice.

## 0.14.0 (2026-10-09)

The 3D-drawn stress test is retired: two clear tools remain, the engine for 2D and its classic "3D" views, and the 3D world for real 3D.

- **Rendering**: `/stress-3d` (the 2D stress test's game drawn by three.js) is gone, and its links open the 3D world stress test (`/stress-world`). The engine already does the light "3D" (classic views, side scrolling with depth, WebGPU lighting, no libraries); real 3D is the 3D world, which keeps its cameras, filters, lights, cards and puppets. The 2D stress test points to the 3D world for chase, first-person and fly cameras.
- **Engine** (2D stress test, `src/stress.game.js`): the hooks the 3D page drew through are gone (`HOOKS`, the depth camera's pose, the extra `window.__game` fields); the game plays and draws as before.
- **Tools**: `tools/stress-test.mjs` (`npm run test:stress`, a suite of `npm test` and `test:changed`) checks the 2D stress test's cameras (a `?cam=` link, a fixed camera, side scrolling, side scrolling with depth), moved out of `tools/lab3d-test.mjs`, which now checks the 3D world lab only. A change to the 2D stress test no longer runs the 3D suites.
- **Docs**: `docs/LAB-3D.md` says why the 3D-drawn stress test was retired and keeps what it taught (rules that never read the drawing, no stalls mid-fight, a three.js r182 instancing bug); the Labs page drops it.

## 0.13.0 (2026-10-09)

The stress test built again from the ground up as a 3D game, with Rapier physics, sharing only the animation system.

- **Rendering**: a new temporary lab, the stress test as a 3D world (`/stress-world`, Labs → Temporary). It tries to do what the 2D stress test does (a torch-lit hall, walkers, slimes and wisps that take turns to attack, waves, a particle storm, the same panel and benchmark) the way a 3D game would, and may feel different: it isn't a head-to-head. three.js r182 on WebGPU or WebGL 2; characters as Cards (the engine draws them, from the camera's turn and tilt, at about the screen's pixel size) or Puppets; the engine's views as real 3D cameras in perspective or orthographic (O), side scrolling with depth (M), a custom turn and tilt, chase, first person, fly and fixed (F), with links; walls facing an outside camera cut low and pillars between it and the fight cut to stumps; the 3D stress test's filters (cel, pixel, bloom, FXAA); fog that starts past the hero; resolution at the engine's pixels, balanced or full.
- **Engine** (the lab's game, `src/stress-world/20-sim.js`): Rapier 0.19.3 (SIMD) in the engine's own units with z up, so rigs, moves and reaches read as in the 2D games. The hero is a character controller that walks, dashes, jumps (Space) onto low walls and galleries, climbs stairs and slopes, pushes crates and shoves monsters aside. Every monster is a rigid body: the 2D page's AI sets the velocity each wants and the physics resolves the crowd (no separation code); knockback is momentum; big hits throw bodies up and the fallen fly and slide (Launches); 0 to 300 crates and barrels; solver iterations on the panel. A flow field over the walkable grid takes the crowd up the stairs after the hero. A scripted 600-step fight hashes to the same state on WebGPU and WebGL 2.
- **Art**: the hall is ASCII text (`src/stress-world/10-hall.js`), the 2D hall's layout from the same seeds plus a raised rune dais with a sloped edge and two galleries up stairs; colliders, floor heights, the walkable grid and meshes all come from it. Every texture is drawn by code: the 2D hall's floor, brick walls and low walls, pillars with plinths and capitals, crates and barrels, braziers with flames.
- **Rendering** (3D stress test): no more hitches when a crowd first needs a new card atlas page. three.js r182 keeps the matrices of an instanced mesh with 1,000 or fewer instances in a uniform buffer named after the mesh, so every page (25 to 49 cards) compiled its own shader and GPU pipeline the first time it was used, past the two pages the warm-up made (about 50 cards on screen). Pages now have room for more than 1,000 cards and read their cells from one named attribute, so they all share one shader: from 36 to 1,200 cards on screen no pipeline is built.
- **Tools**: `tools/stress-world-test.mjs` (`npm run test:stress-world`, a suite of `npm test` and `test:changed`): the banned-API rules, both backends, the same proof hash, a fight in both looks with no GPU pipeline built mid-fight (nor when the crowd grows past the atlas pages the warm-up made), kills and launches, a jump, the stairs to a gallery with monsters following, a crate knocked about, every camera and filter, W walking away from a fixed camera, the benchmark's report. The benchmark and metrics split CPU time into physics, logic and drawing. `tools/lab3d-test.mjs` checks the 3D stress test with a 400-monster crowd of cards too.
- **Docs**: `docs/LAB-3D.md`, the stress test as a 3D world; the Labs page lists it with its question and links.

## 0.12.1 (2026-10-08)

The 2D page's side scrolling with depth stays sharp zoomed out.

- **Rendering** (2D stress test): the depth view (Mode 7) draws at the screen's own resolution, one buffer pixel per screen pixel, so its characters, drawn by the engine at the size their distance gives, are sharp near or far, zoomed in or out (at the page's own pixel size a zoomed-out hero was a few blocky pixels). Its damage numbers and notes are drawn as large as at the page's own pixel size; the engine's lighting pass and its particles are skipped under it (it draws its own). The engine's pixel size comes back with depth off.
- **Tools**: `tools/lab3d-test.mjs` checks that the depth view draws at the screen's resolution and that the pixel size returns after.
- **Tools**: faster pushes. `npm run test:changed` (`tools/test-run.mjs`) runs the version and syntax checks and only the suites that cover the changed files (read from git against main; version-number-only changes, the build's output and the changelog don't count; the engine, the build or the dependencies run everything), with why it chose each and how long each took; `npm run test:which` shows the choice. `npm test` runs every suite through the same runner, with timings. `CLAUDE.md`: push and merge once `test:changed` passes, then run the full suite in the background and fix forward or revert.

## 0.12.0 (2026-10-08)

Depth for side scrolling, the Mode 7 way on the 2D page and in real perspective on the 3D one, and sharp characters when the 3D page zooms out.

- **Rendering** (both stress tests): side scrolling with depth (M, `?view=side&depth=1`). A perspective camera on a rail follows the hero sideways and keeps him 110 to 260 units away, so he shrinks walking into the hall and grows coming back. The 2D page draws it as SNES games did, Mode 7: the floor a screen row at a time from the map's own floor texture, then walls, braziers, telegraphs, trails and every character back to front, each drawn by the engine at the size its distance gives (crisp, not a scaled sprite); torchlight as warm pools on the floor. The 3D page puts a real perspective camera at the same pose. The mouse aims at the floor through the same projection.
- **Rendering** (3D stress test): at the balanced or full resolution the engine draws each card as fine as the picture's own pixels (cells up to 256 pixels, outlines one engine pixel thick), so zoomed out the characters are sharp, not small sprites blown up; at the engine's pixels nothing changes.
- **Tools**: `tools/lab3d-test.mjs` checks the depth view on both pages (the 2D page draws the crowd, and the hero shrinks and grows with depth; the 3D page takes a perspective camera) and the cards' detail at the full resolution.
- **Docs**: `docs/LAB-3D.md`, side scrolling with depth and sharp cards; Labs links to both.

## 0.11.0 (2026-10-08)

The stress tests, head to head: the same cameras on both pages, the 3D page's own cameras and filters, and no more stalls mid-fight.

- **Rendering** (3D stress test): no stall when a fight starts. The first frame draws every batch, atlas page, trail and floor shape once, empty, so their GPU pipelines exist before they are needed (again after a filter change); each effect pool shares one material; the card atlas is fixed 512-pixel pages that are never remade, and only the pages in use upload and get outlined. A 50-monster fight in both looks builds no pipeline (the last version built four, the 1% low of 34 fps at 50 monsters); as a fight starts, the cards' worst frame drops from 72 to 29 ms and their median from 31 to 16 ms (headless WebGL 2).
- **Rendering** (3D stress test cameras, 1 to 4): chase (behind the hero, in front of walls), first person (his eyes) and fly (WASD, Q and E, Shift), mouse steering once a click captures it (Esc frees it); F fixes any of them where it is, a fixed 3D camera while you play; `?cam3=` links. The hero's controls follow the camera (W walks away from it, he aims where it looks), and cards are drawn from its turn and tilt. P now switches the resolution (X also swung the sword).
- **Rendering** (3D stress test filters, N): Clean, Comic cel (shade bands, ink strength, ink width, colour punch) or Pixel (pixel size, colours per channel, dither) on the entire scene, the characters and objects, or the environment, with bloom and FXAA: TSL in `PostProcessing`, on WebGPU and WebGL 2, with an MRT mask the character and object materials write while a filter is on. `?fx=`, `&fxto=`, `&bloom=1`, `&fxaa=1`.
- **Rendering** (3D stress test): a resolution menu (engine pixels, balanced at half the screen's, full; P cycles; `?res=`).
- **Engine** (both stress tests): full screen, and start in full screen (remembered on the device; the first click or key enters it, as browsers require); the side scrolling view, a custom view (turn, tilt, height boost, on top of zoom and turn), fix camera here (F: it stays put while the hero moves on) and Copy camera link (`?cam=`, the free camera room's format, opens the same camera on either page); the engine's own looks, dithered translucency (`E.style.trans`) and the readable characters tilt (`E.style.charPitch`).
- **Tools**: the benchmark's table and report give game logic, drawing and CPU ms for each step, and the report names the camera, the engine looks and (3D) the filter. `tools/lab3d-test.mjs` also checks the 3D stress test's cameras (W walks away from a fixed camera), its filters, that no GPU pipeline is built mid-fight, and the 2D stress test's cameras (a `?cam=` link, a fixed camera staying put, side scrolling).
- **Docs**: `docs/LAB-3D.md`, the 3D stress test's cameras, filters, engine looks and the warm-up; Labs entries with links to each camera and filter.

## 0.10.0 (2026-10-08)

The stress test drawn in real 3D by three.js, for a head-to-head with the engine's own renderer (`docs/LAB-3D.md`, *The 3D stress test*).

- **Rendering**: the 3D stress test (`/stress-3d`, Labs → Temporary → Stress test in 3D): the stress test's hall, hero, walkers, slimes, wisps and the fallen drawn by three.js r182 (WebGPU, or WebGL 2; `?backend=webgl` forces it) with the engine's own camera (view, zoom, turn, height boost, shake), so it frames and aims like the 2D page. Two looks (C switches): **Card** (the engine draws each character onto a card in the hall, from one sprite atlas) and **Puppet** (3D parts on the same joints in shared instanced batches, with outlines, torchlight and shadows). X switches between the engine's pixels and full resolution.
- **Rendering** (combat): telegraph arcs on the floor during wind-ups, blade and claw trails as ribbons, bolts with their own lights, every particle kind, damage numbers and notes in the engine's pixel font. The lights are a fixed set: up to 30 torches (the two nearest the hero cast shadows), up to four wisp and four bolt lights.
- **Engine** (stress test): the 3D page runs the 2D page's game code unchanged and replaces only the loop's drawing step, so gameplay, controls, the panel, its metrics ("Drawing (CPU)" is timed the same way) and the benchmark are the same on both. The game hands the 3D page its map, torches, shots and frame numbers, and the benchmark's report names the renderer that drew it.
- **Tools**: `tools/lab3d-test.mjs` also checks the 3D stress test on WebGL 2 and WebGPU: a fight with every monster kind in both looks, the panel's numbers, the hero under the keys, no errors; and keeps its rules (no `WebGLRenderer`, `ShaderMaterial`, compute or GPU read-backs) in `src/stress3d/`.
- **Docs**: `docs/LAB-3D.md` describes the 3D stress test, where it differs from the 2D page and why, and a three.js r182 bug to remember (an `InstancedMesh` of more than 1,000 instances with `DynamicDrawUsage` never sends its changes to the GPU).

## 0.9.0 (2026-10-08)

A temporary lab that puts our characters in a fully 3D world, to see what carries over (the plan and its trade-offs: `docs/LAB-3D.md`), and the camera labs that led to it.

- **Rendering**: the 3D world lab (`/lab-3d`, Labs → Temporary): a stone room built from a text map in real 3D with three.js r182 (`WebGPURenderer`: WebGPU, or WebGL 2 by itself; `?backend=webgl` forces it) and Rapier 0.19.3 (SIMD), every texture and shape drawn by code (the floor is the engine's own `E.tex.flagstone`). Sun shadows, flickering torches, walls cut away on the camera's side as the engine does, outlines in the engine's outline color, fog, and a pixel-art pass that draws the engine's 240 lines.
- **Rendering** (cameras): the engine's five views as orthographic cameras with its exact height boost (in the projection only), turned 45° at a time; and the cameras real 3D gives for free: a free orbit, a first-person fly camera and a third-person chase camera. Fix camera puts any of them in the address.
- **Animation**: the rigs, every move, the mocap player and Dan's body run unchanged in 3D, two ways, alone or side by side: **Card** (the engine draws the character from the camera's angle onto a card facing it: the exact look, flat, at one depth) and **Puppet** (3D parts hung on the same joints, listed as data, e.g. `['limb', 'hipL', 'kneeL', 1.45, 1.2, 'pants']`: real depth, light and shadow, any camera; the look an approximation). A mocap figure plays CMU and hero clips; Dan swings on a timetable.
- **Engine** (gameplay): the hero walks a lap or you play it (WASD, J or a click swings the engine's three-hit combo, K or Space dashes), moved by Rapier's character controller: it slides along walls, shoves crates and knocks them flying. Gameplay runs on the CPU at a fixed 60 Hz and never reads the renderer: 600 scripted steps give the same state hash on WebGPU and WebGL 2, shown on the page.
- **Rendering** (earlier labs in this release): the free camera room (`/free-camera`): any orthographic camera the engine can give (turn, tilt, zoom, move, fix) and a fly mode on a small renderer of its own, to show what the engine can't do; and the shapes comparison (`/shapes-compare`).
- **Tools**: `tools/vendor-3d.mjs` vendors the two libraries into `vendor/` at pinned versions with checksums (`--check` verifies them); `tools/lab3d-test.mjs` (in `npm test`) checks the checksums and the lab's rules (no `WebGLRenderer`, `ShaderMaterial`, `onBeforeCompile`, compute or GPU read-backs), opens the lab on WebGL 2 and WebGPU (headless, on a stand-in canvas), compares the hashes, plays it and saves a picture of every camera and look. `tools/build.mjs` can join a folder into one ES module (`@inline-module`) and take a file's first section (`@inline-head`).
- **Docs**: `docs/LAB-3D.md`, the plan: why three.js r182 and Rapier 0.19.3 (releases the models know well, not the newest), the GPU rule, Card versus Puppet, what an agent reads.

## 0.8.1 (2026-10-07)

The engine files now tell an AI agent what lies outside them, and how to take from it.

- **Docs**: a map of the store outside the engine files, where an agent reads: at the end of the agent edition's manual (about 600 tokens), in the full engine's header, in `API.md` (so in every genre kit) and in `AI_GUIDE.md` ("Where to find more"). It lists the 325 curated motion clips and 2,548 motion-capture takes, Emberdeep's worked examples (monster and boss bodies, heroes whose bodies are not people, skills) and the genre kits. Each step has its command: search the catalogs or `node tools/cmu.mjs ledger <word>`, cut the clips a game needs into a small set with `tools/anim-set.mjs`, play them on any Humanoid with `src/mocap/mocap.js`. The map also says the store's files are large: search them, never read one whole. Clips play on the agent edition too (tested); the full engine also turns the face and hair with a clip.
- **Tools**: `npm run test:agent` checks the map: every path it names in the four places exists, and its recipe works (the ledger search, the cut of a curated clip and a motion-capture take, both played on the agent edition's Humanoid). `tools/version.mjs` also writes and checks the version the README states (it said 0.7.0 through 0.8.0).

## 0.8.0 (2026-10-07)

A third playable character, adapted from concept art, and what building it taught the character tools.

- **Characters**: Dan, the Brood-Scythe (`src/emberdeep/22-char-dan.js`, `?character=dan`): a stalking alien beast with two bone scythes for forearms, a horned crown, a spined back, a tail and egg sacs on its hips, about 1.25x the Wanderer. Its custom body has reverse-kneed legs with three-taloned feet, arms solved with IK, scythes that swing on springs, a swaying tail and a slump when it falls; its egg sacs swell and glow as they ripen. Six skills of its own: **Reap** (right, left, then a scissor cut), **Pounce** (a leap that lands impaling), **Harvest Whirl**, **Hatch** (ripe sacs become broodlings that hunt and bite), **Frenzy** (a roar: faster attacks, leech) and **Brood Burst** (a void blast that grows with the brood). Every kill ripens one of six sacs, shown over the skill bar. Its own save, arrival (drops, lands in a crouch, roars), title loop and menu notes. On the autopilot it clears depths 1-10 in 0.73x the Wanderer's time with no deaths.
- **Characters** (the body contract): a body may list the bones that keep their length (`rig.bones`); a character may `prime(h)` its own resource for casts outside real play (the gallery's demos, the sandbox's unlimited resources, the character test); a skill may hold the autopilot back until it is ready (`bot: { ready(h) }`).
- **Tools**: the character sheet measures a body's own bones (a Humanoid's limbs by default) instead of the Humanoid's on every body, and a pop is now a joint that jumps in one step against the steps around it, so a long blade's fast, steady sweep is not flagged. The balance run is repeatable at last (the game's clock now moves only with its steps: slow motion, the death panel and the performance governor read the real clock, so two runs of one hero drifted apart after depth 5), and its summary compares each depth once, with the time and deaths of every try.
- **Emberdeep**: the autopilot measures its progress along the way it wants to go: pressed against a solid prop, the push-out jittered it back and forth fast enough that it never counted as stuck, and a run could stall in place.
- **Docs**: `docs/DAN.md` (from the concept art to the game), and the recipe in `docs/CHARACTERS.md` with the new hooks.

## 0.7.0 (2026-10-07)

Everything merged since 0.6.0 (none of it had bumped the number), plus versioning and the tools for adding a playable character.

- **Tools** (versioning): one number everywhere (`tools/version.mjs`, checked by `npm test`), a deploy-time build stamp (`tools/stamp.mjs`, run by Vercel), shown in the game and the labs; this changelog; `CLAUDE.md` with the rules for every change.
- **Characters**: playable characters are a registry, `def('characters', id, spec)`, like monsters and skills. Every place the game treated the Wanderer and Codex differently (16 checks of Codex's name in 7 files) now asks the character's entry: its body, starting skills and gear, save slot, stats, arrival, title pose, menu preview, paper doll, captured clips and its own animation layers. A new hero is a file of its own and needs no edits to shared code. Nothing a player sees changed: the existing suites pass and before-and-after filmstrips of both heroes match pixel for pixel.
  - The body contract (what the game calls on a hero's rig) is written down in `src/emberdeep/18-characters.js` and checked: `checkRig(id)` drives a body through 14 states, two facings and every view, and names each broken part.
  - A character's `look` sets its Humanoid look under the gear; its Echo and paper doll wear it too.
  - `tools/ed-character-test.mjs`: what every hero must do (its entry and body, the menu and its own save, movement and the dodge, its starting skills, every shared skill with its body, its Echo, the paper doll, arriving in a depth, a potion, a knockdown, death and revival, every view, the title, the gallery, a phone held upright). `npm test` runs it for every registered hero.
  - `tools/ed-sheet.mjs`: the character sheet, one image of the hero in every state and view, a turnaround and game scale on every theme's floor, with numbers a model can trust more than its eye: size per view, palette depth, contrast against each floor, and motion lints (pops, feet sliding, joints under the floor, stretching bones). The same image and numbers every run.
  - `npm run character:check -- <id>`: syntax, build, the character test and the sheet, with a short summary.
  - `npm run new:character -- <id> --body humanoid|custom`: a hero that already passes every check (a dressed Humanoid, or a custom body that keeps the contract) with two skills of its own. `npm test` checks both templates.
  - `tools/ed-balance.mjs --character <id>`: the autopilot plays depths with a hero and with the Wanderer, stepped by hand and seeded (fast, and the same every run), and compares time, deaths and level. Skills say how the bot should use them (`bot: { heal: .65 }`) instead of being special-cased by name.
  - `docs/CHARACTERS.md`: the recipe, from a brief to a checked hero.
- **Emberdeep**:
  - Codex, the Unwritten: a second playable character with its own procedural rig, six signature spells and a separate save.
  - A developer sandbox and an explained tuning panel (every rule number a knob, with search, tiers and reset); customizable keyboard, mouse, gamepad and touch controls; difficulty sliders in 1% steps.
  - Fills a phone held upright, with full screen and a phone HUD.
  - The hero plays 15 captured moments (landing, three deaths, victory, level-up, listening, reaching for loot, flinching and more).
  - The death panel waits for the hero's fall to land.
- **Mocap**: ready-made animation as readable key poses an AI model can read and edit: a glTF importer, retargeting onto the Humanoid, the Mocap Lab, both Quaternius libraries (88 clips), Mesh2Motion (177 clips), 60 moments cut from the CMU motion capture database and every one of its 2,548 takes in the lab's library, with a ledger of all of them. The hero turns, tilts and rolls with a clip; the sword can be put away.
- **Engine**: the agent edition, the essential engine and its manual in one readable file for AI coding agents (`dist/my-3d2dge-agent.js`).
- **Tools**: repeatable, comparable filmstrips (`--seed`, `--compare`); gallery deep links; contact sheets for animation sets; the Labs page (every lab, test page and demo, one tap away); Claude Code cloud sessions (a SessionStart hook, `CHROMIUM_PATH`); the checker's report says which build it checked.
- **Docs**: the README's prop count (38, not 39).

## 0.6.0 (2026-09-28)

- **Art**: the PS1 / N64-era look kit: HD characters (shaded limbs, faces, outfits, hair, armor, sizes), hue-shifted shading (`E.tones`, `E.ramp`), parallax backdrops, textured tiles and wall materials, procedural props, explosions, smoke and fire, the 5x7 font and extruded titles.
- **Animation**: the move library (`E.MOVES`, `E.Combo`), poses and stances, side-view chops, weapon trails, camera zoom and turn; the animation lab kit.
- **Emberdeep**: the signature game, a hack-and-slash that goes down forever: skills and the passive tree, monsters and bosses, loot, Emberhold, one new mechanic per depth, the gallery, the autopilot.
- **Tools**: genre kits and single-file editions for AI remakes; the site on Vercel.

## 0.5.0 (2026-09-27)

- Renamed to my-3D2dge; genre kits and single-file editions for AI remakes.

## 0.4.0 (2026-09-28)

- **Tools**: the single-file AI edition, the API card, the starter game and the headless checker.

## 0.3.0 (2026-09-28)

- **Rendering**: the stress test with a benchmark; crowd optimizations (culling, direct draw, cached walls, shadows and glows, faster rig projection), runtime resolution, frame stats.

## 0.2.0 (2026-09-28)

- **Rendering**: optional WebGPU lighting (shadows, wrap light, glow, heat shimmer) with a Canvas fallback.

## 0.1.0 (2026-09-28)

- **Rendering**, **Animation**: views, rigs, the renderer, lighting and the first examples (as the CO55 2D engine).
