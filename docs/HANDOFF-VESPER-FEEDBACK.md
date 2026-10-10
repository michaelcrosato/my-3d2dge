# Handoff: one height-aware world, a third-person kit and the agent package

The plan made from the first round of feedback by a model that built a game on the engine (Vesper, 2026-10-10, against
v0.17.2 at `b7b3043`). It is for the agent that implements it. It is temporary: when the work lands, fold what lasts into
the docs and delete this file, as v0.14.1 did with finished plans. The points not acted on are in `docs/FEEDBACK-LOG.md`
(F1).

## Read this first

- Read `CLAUDE.md` (versions, changelog, rebuild, `npm run test:changed`, squash merge, then the full `npm test`) and
  `DOCTRINE.md`, then this file. You don't need the Vesper files: what matters from them is quoted here. They are
  untracked in the owner's checkout, `temp-feedback/`: the report and the game, one 555 KB HTML file.
- Run it at **xhigh** effort, one phase per pull request, in order (section 7 says why).
- Every engine change goes into both editions, `engine/my-3d2dge.js` and the curated `engine/my-3d2dge-agent.js`,
  unless a task says full engine only. `npm run test:agent` keeps the agent edition a subset.
- The manuals are nearly full: the agent edition's header is 9,071 of its 10,000 tokens, `API.md` 12,611 of 13,500. New
  detail goes into the index (Phase 2); the cards get one line per family.
- Line numbers below are as of v0.17.2.

## 1. The feedback

A GPT-6 model ("GPT-6 Astra Pro", in a ChatGPT cloud workspace with a shell) was handed the full engine as one JavaScript
file, `my-3d2dge.js` v0.17.2 (`dev-build`), and asked for an Assassin's Creed adaptation. It built **Vesper: The Ninth
Bell**: an isometric pixel city of roofs (its own view: yaw 45, pitch 35), climbing and gap jumps, guards on streets
and roofs with sight cones, smoke, a whistle, crowds and gardens to hide in, takedowns (silent, aerial, finishing a
stunned guard), a ledger to steal, checkpoints, an HTML title, HUD, pause, map and results UI, and touch controls. It
ships as one offline HTML file, with no errors and 16 simulation checks passing.

Its verdict: a useful foundation for compact isometric pixel games, whose main limitation is vertical gameplay:
"physics, sight, combat, and navigation do not share the same rules for height". Its one change: **one shared
spatial-query API that includes height.** Its other asks:
- public hooks for tile decoration and prop footprints;
- shared ledge, support-surface and roof-link queries;
- lifecycle methods to stop, dispose and advance a game in tests;
- a compact API index with units, height rules and executable examples;
- the API reference and the test driver in the same package as the engine.

It patched three engine faults: the clock, the flow-field cache and the FPS counter.

## 2. What checking it showed

**Every claim about the engine holds.** Each was reproduced against v0.17.2, most in Node with the engine loaded as it
is:

| Claim | What the code does | Where (full / agent) |
| --- | --- | --- |
| Physics changes with the refresh rate | `steps = ceil(sdt / step)`, `h = sdt / steps`: a step is 1/120 s at 60 and 120 Hz but 1/144 at 144 Hz and 1/180 at 90 Hz. The same `Body.jump(210)` peaks at 30.63 (1/120), 30.77 (1/144) and 31.06 (1/240). The engine's header says "update runs in fixed ~1/120 s substeps, so motion is identical at 60, 120 or 144 Hz": that is not true. D4 grandfathered the loop. | `:1647` / `:1174` |
| FPS never reads below 20 | the counter adds up `dt` after the 50 ms clamp | `:1646` / `:1173` |
| Flow fields go stale | `FlowField.update` returns early while the target cell is unchanged, and nothing reads `map.version`; `block()` doesn't even bump it. After `block()` on the path the distance stays 4 when it should be 6. A door opened with `map.set()`, the card's own recipe, goes stale the same way. | `:3026`, `:2752` / `:2045`, `:1875` |
| Sight, reach and navigation ignore height | `E.inArc` says a hero on a roof at z 48 can hit a guard in the street; `map.los()` treats a 12-unit planter as a wall for eyes at 17; `FlowField` walks only floor cells, so a guard on a roof can't path; `E.dist` is 3D while `E.inArc` and `E.overlap` are flat. | `:197`, `:2811`, `:3026` |
| Decorating walls needs internal code | facades are a fixed set of `face` patterns in the private `_box` and `_facePattern`; Vesper subclassed `TileMap` and overrode `_box` to paint windows, doors and arches (7.9k tokens of its output) | `:2909` |
| Large props sort wrong | `r.queue` sorts by one point, `view.order(x, y, z)`, lifted by the one cell under it; a belfry whose canopy spans cells on top of a tower needed hand-set sort points | `:1099`, `:2805` |
| No lifecycle | `start()` runs `requestAnimationFrame` forever; there is no `stop`, `dispose` or `advance`, and `_step` is private | `:1629` |
| The file lacks what it points to | the full engine's header sends readers to `API.md`, `AI_GUIDE.md` and `tools/replay.mjs`, none of which are in it. Vesper used 28 public members and options that `API.md` never mentions (`cam.snap`, `pauseOverlay`, `onError`, `game.stats`, `r.outline`, `rimAlpha`, the actor options `outlineColor` and `rimColor`, the queue option `noInfo`, `audio.volume`, `sfxVolume` and `musicVolume`, the track option `gate`, the voice options `filter` and `delay`, `E.shade`, `E.TAU`, `E.mkCanvas`, `E.V3`, `map.height()`, `cutaway`, `shimmer`, `r.bw`, ...), and wrote straight into `map.blocked` and `map.floorTags`, because a map built from `cells` has no other way. It found them by reading the 150k-token source. | |

**Where its output went:** about 50k cl100k tokens of game code, the engine excluded:

| Part | Tokens | Share | What the engine could carry instead |
| --- | --- | --- | --- |
| UI: HTML 2.8k, CSS 7.7k, glue 1.5k, HUD and minimap 2.2k, results 1.0k | 15.2k | 30% | an HTML UI shell (Phase 4) |
| Facades and cached detail drawing | 7.9k | 16% | a decoration hook and a facade vocabulary (Phase 3) |
| Traversal 2.4k, guard AI 2.1k, takedowns 1.6k, perception and cones 1.4k, markers 0.3k | 7.8k | 16% | spatial queries, a ground controller, actions and perception (Phases 1 and 3) |
| City layout, set dressing, floor textures | 6.6k | 13% | nothing: this is the game's content |
| Simulation core: state, the step loop, interactions, civilians, objectives, hints | 4.6k | 9% | a little (`E.targets` for prompts); mostly the game's own rules |
| Setup, input map, rigs, actor drawing, draw and update | 4.1k | 8% | an input preset, a stealth starter (Phase 3) |
| Saves, checkpoints, validation | 1.9k | 4% | nothing yet (F1.8) |
| Music and sound effects | 1.8k | 4% | nothing yet (F1.9) |

A rough estimate: Phases 1 to 4 carry 20-25k of the 50k. The game's own content and rules would then take more than
half of its output, up from about 30%. Phase 5 measures it instead of guessing.

Three more things the code shows:
- It ran its own 1/60 s substeps inside the engine's update. It didn't trust the clock, and Phase 0 removes the reason.
- The motion store already has the traversal clips such a game needs: `ClimbUp_1m_RM`, Climb Wall, Ledge Hang, Pipe
  Climb, Crawl, `Walk_Stealth`, `Run_Stealth`, `Crouch_Walk`, Roll, `Dive_Roll`, `Land_Three_Point` and the NinjaJump
  pair, in the Quaternius, Mesh2Motion and CMU catalogs. Only `Land_Three_Point` is used by a game so far (Emberdeep's
  landing).
- The 2026-09-29 survey of famous animations ranked an `E.ACTIONS` library first: timed, multi-beat actions such as get
  up, ledge climb and roll. It was removed in v0.14.1 as unstarted; read it with
  `git show f990e9a^:docs/ANIMATION-RESEARCH.md`. Its section 7 has frame timings, such as Prince of Persia's 14 frames
  to hang and 17 to climb up, and the Pokémon ledge-hop height table. Vesper wrote these actions by hand.

## 3. Verdicts

| Feedback | Verdict | Where |
| --- | --- | --- |
| One shared spatial-query API that includes height | **Adopt**: the center of this plan | Phase 1 |
| Shared ledge, support-surface and roof-link queries | **Adopt** | Phase 1 (ledges, landings, drops, standing, navigation over heights); jump links in Phase 3 |
| Fixed-step accumulator | **Adopt**, superseding D4 | Phase 0 |
| Navigation cache checks the map's revision | **Adopt**, wider than reported (`set()` too) | Phase 0 |
| Performance counters from real time | **Adopt** | Phase 0 |
| Lifecycle: stop, dispose and advance in tests | **Adopt**, with a headless mode for Node | Phase 2 |
| A compact API index with units, height rules and executable examples | **Adopt**: a generated index that a check keeps complete | Phase 2 |
| The API reference and the test driver in the same package | **Adopt**: `dist/handoff/` | Phase 2 |
| Documented behavior needed regression tests before it could be trusted | **Adopt**: contract tests (the claim about 60, 120 and 144 Hz was false) | Phase 2 |
| Public hooks for tile decoration and prop footprints | **Adopt** | Phase 3 |
| Built-in attack and combo helpers unused (height, perception, takedowns) | **Adopt the cause**: height-aware tests, actions and perception; the helpers stay | Phases 1 and 3; F1.2 |
| Built-in menus and dialogs unused (HTML for layout, focus, readable text) | **Adopt**: an HTML UI shell, a view of game state as principle 6 allows | Phase 4 |
| No walkable passages under roofs or bridges (one column per cell) | **Defer**: section 6 sketches the likely shape | F1.5 |
| The large source file | **No change to the file**: the index and the package make reading it unnecessary | F1.6 |
| PlatformMap, Platformer, Blob, bullets and patterns unused | **No change**: other genres | F1.1 |
| WebGPU lighting and alternate views unused | **No change** | F1.3, F1.4 |
| Not verified on physical phones or native GPUs | **No change**: principle 10 | F1.7 |

## 4. The plan

Each phase is one pull request with its version bump (Phase 0 a patch, the others minor), changelog lines, rebuild and
checks. Names marked [proposal] are proposals: keep them unless a better, more common name turns up (principle 7), and say
so in the pull request.

### Phase 0: the clock and the caches (both editions)

1. **An exact fixed step.** Replace the frame-sized substeps (`engine/my-3d2dge.js:1642-1653`,
   `engine/my-3d2dge-agent.js:1169-1179`) with an accumulator of real time:
   - Add each frame's real time, capped as today so a stall can't run away (today a frame adds at most 50 ms of game
     time; Vesper allowed 12 steps). While the accumulator holds a whole step, 1/120 s of real time, run
     `_step(step * timeScale)` and keep the remainder.
   - Slow motion makes each step shorter; it never skips frames. Emberdeep slows to 0.3-0.4 (`slowMo` in
     `src/emberdeep/00-core.js`: perfect dodges, finishers, deaths, a boss's fall), and its perfect dodge scales the
     hero's `dt` back up (`src/emberdeep/20-hero.js` around line 230); both must stay smooth. Accumulating game time in
     fixed game steps instead would update on only about 60% of frames at those speeds.
   - At normal speed, at 60 and 120 Hz, the game sees exactly what it sees today: two or one steps of 1/120 s per frame.
     So Emberdeep, the starters and the test baselines are unchanged outside slow motion. Other rates (90 and 144 Hz,
     dropped frames) change, and now agree with 60 Hz. In slow motion the steps get shorter rather than fewer: half speed
     at 60 Hz becomes two steps of 1/240 s where today has one of 1/120, the same at every rate.
   - Expose `game.alpha`, the fraction of a step left over (0..1), for a game that wants to interpolate. Don't
     interpolate in the engine yet: check the pacing at 90 and 144 Hz on a filmstrip and on the owner's phone
     (principle 10), and note what you see.
   - With the game paused, or at `timeScale` 0, input still ticks (Vesper's patch runs `_step(0)` for this).
   - Recorded sessions replay their frame times through the same accumulator: `npm run test:replay` and
     `test:determinism` must stay green.
   - Log **D16**, superseding D4 ("the clock is an exact fixed step"), and correct every place that describes the old
     clock: the engine's header (item 6), the agent edition's header, `API.md` rule 1, `AI_GUIDE.md` hard rule 1, its
     frame order, and its note on why recorded sessions work.
   - Check: the same inputs on virtual frames at 60, 90, 120 and 144 Hz give the same state hash after the same game
     time.
2. **Flow fields follow the map.** `block()` bumps `version` when the value changes. `FlowField` remembers the version it
   was built from and rebuilds when the target cell or the map's version changes. Check: block a cell on the path, then
   open a door with `set()`; the distances change at the next `update`.
3. **FPS from real time.** The counter adds up raw frame time, and `stats.frameMs` reports it.
4. **`audio.duck(on)`** made public. Vesper reached for `_duck` to quiet the music under its own HTML pause screen.

### Phase 1: one spatial API with height (both editions)

The rule: **collision, standing, sight, reach, navigation and drawing read heights the same way.** The rules are
written once, in the index and in one short paragraph of `API.md`:
- World units, one tile = 16, z up. A body's `z` is its feet. A cell's top is `map.height(cx, cy)` (0 is the floor;
  a wall is solid from 0 up to its `h`).
- A body stands on the highest top within `z + step` under its footprint (`step` 2, `Body.step`).
- Eyes are at `z + eye` and a target is seen at `z + chest`. Pick the defaults from a size-1.3 Humanoid; Vesper used 17
  standing, 8 crouched and 14 for the target.
- "The same level" means `|dz| <= 8` unless a call says otherwise.

On `TileMap`:
- `map.ray(from, to, { eye, target })` returns `{ clear, t, x, y, z }`. It walks the cells exactly (a DDA, not samples
  every few units) along the segment between the two heights, and stops at the first cell whose top rises above it.
  `map.sight(a, b, o)` is `ray(...).clear`. `los()` stays as it is (the ground only), and its index line points to
  `sight`.
- `map.standable(x, y, z, r)`: a body of radius `r` can stand there. The highest top under its footprint is within
  `step` of `z`, and no cell under it is blocked.
- `map.ledge(from, dir, { reach, rise, spread })` returns `{ x, y, z, rise, facing }` or null: the nearest top in that
  direction that a climber can pull up onto, with room to stand past the edge. This is Vesper's `_tryClimb`,
  generalized: it probed up to 18 units ahead, 0.28 rad to each side, for a rise of 4 to 82.
- `map.landing(from, dir, { min, max, rise, drop, apex })` returns `{ x, y, z, d }` or null: a standable spot across a
  gap that a jump arc clears. Vesper looked 35 to 83 units ahead, up to 11 up and 18 down.
- `map.drop(from, dir)` returns `{ x, y, z, fall }` or null: what lies just past an edge. Hop-downs, fall warnings and AI
  that won't walk off roofs use it.
- `map.arcClear(a, b, apex, r)`: a parabola from `a` to `b` that peaks `apex` above the higher end clears every top. Jumps,
  throws and aerial takedowns use it.
- `dir` is an angle in radians or a ground vector `[dx, dy]`, as the engine already uses both.

Helpers:
- `E.sameLevel(a, b, tol = 8)`.
- `E.inArc(a, facing, b, range, halfAngle, dz)`: the new, optional `dz` limits the height difference. Left out, the test
  stays flat as today, so Emberdeep doesn't change.
- `E.targets(from, list, { range, arc, facing, dz, sight: map, filter })` returns the eligible ones, nearest first, each as
  `{ target, d, dz, angle }`. Melee auto-aim, lock-on, takedowns and interaction prompts all use it.

Navigation:
- `new E.FlowField(map, { step, climb: 0, drop: 0 })` walks the tops that can be stood on, not only the floor.
  Neighbouring cells connect when their tops differ by at most `step`, or by up to `climb` going up and `drop` going down
  (agents that climb or hop down). With no options the paths stay as they are today, except over walls no higher than
  `step`, which bodies already walk over. A guard on a roof gets a field across the roofs; with `climb` and `drop` set it
  chases between levels.

Checks: Node tests on small maps for each query (a roof edge, a low wall, a gap, a planter you can see over, a guard
above the hero), Phase 0's refresh tests, and `npm run test:agent`.

### Phase 2: the handoff package (lifecycle, headless runs, the index, contract tests)

How to judge this phase: a coding agent given only `dist/handoff/` can build, test and check a game without reading the
engine's source below its header.

1. **Lifecycle** (both editions):
   - `game.stop()`: the loop stops, and `start()` resumes it.
   - `game.dispose()`: stops the loop, removes every listener the engine added to the window, the document and the
     canvas, closes the audio and drops the GPU lighting.
   - `game.advance(seconds, { draw })`: runs exact fixed steps without `requestAnimationFrame`, then draws one frame if
     asked.
   - `new E.Game({ loop: false })`: a game driven only by `advance`.
2. **Headless runs** (both editions). `new E.Game({ headless: true })` runs in Node with no DOM: no screen, renderer,
   audio or DOM input. Scenes update and `draw` is skipped. Input comes through the existing `input.press(code)` and
   `release(code)`, plus `input.tap(action)` and `input.hold(action, on)` [proposal]. The engine already loads in Node,
   and `TileMap`, `Body` and `FlowField` work there; it is `Game`, `Input` and `Audio` whose constructors touch the DOM.
3. **A debug handle** [proposal]: `game.debug = { snapshot(), teleport(x, y, z), ... }`. `tools/check.mjs` prints
   `snapshot()` when a game has one, and `tools/replay.mjs --log` uses it by default. Vesper wrote `window.vesper.debug`
   this way on its own.
4. **The index**: `API-INDEX.md`, written by `tools/api-index.mjs` from the engine itself. The tool loads it in Node,
   walks `E` and every class's public members, and reads the doc comment above each. The index has one line per public
   name: its signature, units and defaults, grouped by section, with the height rules and the units table at the top.
   `doctrine-check` fails when a public name has no line, so the 28 names Vesper dug out get documented or made
   private. The index gets its own token budget in a new D-entry, as D8 did for the cards; the cards stay within
   theirs and point to it. Agents search it; nobody reads it whole.
5. **Executable examples and contract tests.**
   - Every fenced example in `API.md` and the index runs in a test, as `tools/agent-test.mjs` already runs the agent
     header's games.
   - `tools/contract-test.mjs` (Node, fast) holds one test per documented behavior an agent relies on: the clock (Phase 0),
     flow-field refresh, the height rules, `Body.step` and the query examples.
   - It joins `npm run test:changed` for engine changes.
6. **`dist/handoff/`**, written by `tools/build.mjs`. It is text only, so binary files don't come up. It holds:
   - `README.md`: start here. It says what the package holds, which one page to read, and how to run and test a game.
   - The readable full engine and the agent edition.
   - `API.md`, `API-INDEX.md` and `AI_GUIDE.md`.
   - `tools/check.mjs`, `tools/filmstrip.mjs` and `tools/replay.mjs`, made to work without the repository's layout.
   - A `package.json` that pins Playwright.
   - A template game: `game/index.html`, `game/game.js`, and `game/test.mjs` with a headless simulation test.

   The site serves it at `/handoff/` (`vercel.json`), and `node tools/handoff.mjs --zip <a path outside the repo>` [proposal]
   zips it for chat uploads. The full engine's header names what is in the package instead of repository paths.
   `README.md`'s "Share it with an AI model" table names the package as the choice for coding agents that need the full
   engine. Vesper did: it used props, x-ray silhouettes and weapon trails, which the agent edition leaves out.
7. A small one: `docs/FEEDBACK-LOG.md` joins `docs/DECISIONS.md` in `doctrine-check`'s "never cleaned up" rule.

### Phase 3: a third-person kit (full engine; the agent edition only where a piece is small)

1. **`E.ACTIONS` and a player for them**: timed actions of several beats that move a body along a curve and drive the
   rig, with marked points where they can be interrupted. The first ones:
   - `climbUp`: hang, pull up, stand; played backwards to climb down.
   - `vault`: over a low wall at a run.
   - `hopDown`: a ledge hop with the shadow on the ground.
   - `roll`: a landing roll and a dodge roll. Promote Emberdeep's roll layer (`heroRoll` in `src/emberdeep/20-hero.js`)
     into the rig.
   - `getUp`.
   - `takedown`: a **paired** action that places and drives two rigs at once, the attacker and the victim.

   Seed the timings from the survey's section 7, and judge every action on filmstrips in the iso, three-quarter and
   side views.
2. **Rig states for traversal**: `hang` (gripping a ledge), climbing a wall (the ladder climb against a wall face), a
   sneaking gait (`crouch` while moving), a sprint lean and a heavy landing. Build them in code first. Where code can't
   match a clip, cut a small traversal set from the store with `tools/anim-set.mjs` (the clips listed in section 2), as
   Emberdeep did for its captured moments.
3. **A ground controller**: the ground views' answer to `Platformer` (name [proposal]: `E.Mover`).
   - Walking, running, sprinting and crouching, with acceleration.
   - A jump with coyote time and buffering.
   - Climbing and mantling onto ledges (`map.ledge` and `climbUp`), and vaulting low walls.
   - A gap-jump assist (`map.landing`) and hop-downs.
   - Fall tracking: a roll above one height, damage above another.
   - The last safe spot, and `respawn()` for water and pits.
   - Input from `game.input` or from an AI's intent object, and `rigState()` for `rig.update`.

   An input preset `'THIRDPERSON'` [proposal] comes with it: move, sprint, jump or parkour, crouch, interact, attack,
   block, dodge, use, map and pause, with touch buttons.
4. **Jump links for navigation**: a `FlowField` option `jump` (the gap a mover can clear, by `map.landing`'s rules), so
   AI with the controller's abilities chases across roofs.
5. **Perception**:
   - `E.sees(observer, target, { range, fov, map, eye })` returns `{ seen, d, angle, exposure }`. It uses height-aware
     sight; crouching and cover lower the exposure.
   - A suspicion meter helper. It rises with exposure and nearness and decays over time, has thresholds for notice,
     search and alert, and keeps the last known position.
   - `E.hears(listener, noise)` for noise events.
   - `r.sightCone(observer, { range, fov, map, color, alpha })`, clipped by `map.ray`.
6. **Building and dressing maps**:
   - Maps built in code: `new E.TileMap({ w, h, cells, floor, blocked })`, `map.fill(cx, cy, w, h, id)` and
     `map.setFloor(cx, cy, tag, block)`. Vesper wrote into `map.blocked` and `map.floorTags` because none of these
     exist.
   - A public decoration hook, `types[id].decorate(face)`, called as each wall face is baked and cached with the wall.
     It gives a painter in wall coordinates: `face.side`, `face.u0..u1` along the wall, `face.z0..z1`, `face.at(u, z)`
     for a pixel, `face.quad(...)` and `face.view`.
   - A small facade vocabulary as type options, `windows`, `door`, `shutters`, `balcony` and `arch`, covering most of
     what Vesper painted by hand.
   - Footprints for sorting: `r.queue`, `r.prop` and `r.sprite` take `footprint: [x0, y0, x1, y1]` in world units, so a
     big thing sorts by its whole base and lifts over every block under it. Rebuild Vesper's belfry first (a canopy 38
     units wide on top of a 76-unit tower).
7. **Markers**: `r.marker(x, y, z, { label, color, offscreen: 'arrow' })`, an objective marker that turns into an arrow
   at the screen's edge.
8. **A starter and a kit**: `src/starter/70-stealth.js` [proposal], which the existing glob in `tools/build.mjs` turns
   into `dist/kits/my-3d2dge-stealth.html`. Give it an entry in that file's `SLICES` table and in the starter's title
   menu (`src/starter/00-shell.js`). It is what a model adapting a modern third-person game copies, and it holds:
   - a small district of climbable buildings of several heights, with decorated facades;
   - a guard on a roof and two in the streets, with patrols, sight cones, suspicion, search, and chases across levels;
   - telegraphed attacks and a parry;
   - takedowns: silent from behind, and aerial from above;
   - hiding in tall grass, found by floor tag;
   - an objective with a marker, a checkpoint, and the input preset with touch buttons.

   The genre playbook and the agent edition's header get one line each, and `AI_GUIDE.md` gets the recipe.

### Phase 4: an HTML UI shell (full engine; its own section, inlined by the build)

`E.Shell` [proposal; the starter's `00-shell.js` is something else] builds, from data, the screens and HUD pieces a
modern adaptation now writes by hand. It is a view of game state that never holds any (principle 6). It holds:
- screens: title (name, subtitle, actions), pause (objective, resume, restart, settings), settings (toggles and sliders,
  saved with `E.store`), help, and results (title, stats, medals, actions);
- HUD pieces: toasts, a tutorial card, an interaction prompt with hold progress, an objective panel with the distance,
  bars, and a minimap and full map drawn from a `TileMap` with markers.

Keyboard, gamepad and touch all move the focus. It honors reduced motion and the safe-area insets, and CSS variables
theme it (ink, paper, accent, fonts), so a game restyles it in a few lines. It reaches the game only through
`input.bindButtons` and the callbacks the game passes in. Check: rebuild Vesper's UI on it and count the tokens; the
target is a quarter of its 15.2k.

### Phase 5: measure it (the North Star's open measures)

`tools/agent-bench.mjs` [proposal] gives a brief and `dist/handoff/` to a fresh coding agent in an empty directory. It
records:
- the output tokens and the wall time;
- whether the first build passes `tools/check.mjs`;
- whether the agent opened the engine below its header;
- a vision judge's score of the screenshots against the PS1/N64 bar.

Run it on three briefs:
- Assassin's Creed, Vesper's brief, as the baseline: about 50k output tokens, an engine patch, 28 undocumented members.
- A Breath of the Wild village with climbing and stamina.
- A Batman: Arkham predator room.

Running it spends money. Build the tool, then ask the owner before the runs: spending is one of the doctrine's
hard-to-undo calls, so arm the wake-up timer as D11 says. If it fires with no answer, the call this plan recommends is to
run nothing, and to say so in the pull request. The results go in the pull request and in `DOCTRINE.md`'s open
measures.

## 5. Traps

- **Budgets.** Each manual has under a thousand tokens of room. Move detail into the index, and raise a budget only with
  a D-entry.
- **The agent edition is a subset.** Whatever goes into it must exist in the full engine and behave the same;
  `npm run test:agent` compares them name by name.
- **Don't change Emberdeep's feel by accident.** New optional parameters default to today's behavior (`inArc` without
  `dz`, `FlowField` without `climb` or `drop`). At normal speed and 60 Hz the new clock must play exactly like the old
  one: compare a seeded filmstrip of an Emberdeep fight against the build before (`--compare`, outside slow motion).
  `npm run test:determinism` and `test:replay` must stay green (they compare a build with itself).
- **Single files stay single.** Every page ships as one HTML file with its scripts inlined (D5). `dist/handoff/` is the
  only output of several files, and it is all text.
- **The API boundary.** The new hooks exist so that games stop reaching into `_box`, `_duck` and the like.
  `node tools/doctrine-check.mjs --todo` lists what is still reached for.
- **Look at it.** Make filmstrips of every action and of the controller (`--seed 1`, and `--compare` with the build
  before). Run `tools/check.mjs` on the new kit. The owner reviews each branch's Vercel preview on a phone.

## 6. Deferred: passages under things (F1.5)

Vesper says in its code: "The source has no underpass geometry. This level uses solid column buildings." The likely shape,
when this is taken up, is one solid span per cell. A type gets `base`, so it is solid from `base` to `h` instead of from
0. Then:
- collision lets a body pass under when its top is below `base`;
- `groundAt` picks the floor or the deck by the body's `z`;
- `ray` passes under;
- `FlowField` gets two nodes in such cells;
- the wall baker draws the span and its underside;
- draw order uses Phase 3's footprints.

Spike it first: a bridge over a canal and an arch over a street, walked over, walked under and seen through. Take it up
when a second source asks for it, or when the stealth starter needs a bridge it can't fake.

## 7. Effort

**xhigh**, one phase at a time, in order.

- The design was done in writing this plan, so the work is building against concrete APIs and checks. The subtle parts
  are the clock and replay, height rules shared by collision and navigation, and depth sorting. xhigh reasons deeply
  enough for them without paying max's latency on hundreds of routine edits, builds and test runs.
- Medium or high is too light for the whole plan. The clock touches every game and the determinism and replay
  invariants, and Phase 3 is new engine machinery with a visual bar to meet; a mistake there costs more than the
  reasoning saves. High is enough for Phase 2's packaging on its own.
- Max is worth it for Phase 3's controller, actions and navigation if the phases run as separate sessions and the best
  first pass matters most there.
- Ultracode doesn't fit the building. Every phase edits the same two engine files and the shared versioned files (the
  version, `CHANGELOG.md`, `dist/`, `examples/`), and later phases build on earlier APIs. Parallel agents would mostly
  make merge conflicts and load the same context several times. Parallel agents do pay off in Phase 5, with several
  fresh-agent builds and vision judges at once, after the owner approves the spending.

## 8. Done means

- Phases 0 to 3 are merged, each with its version, changelog, a D-entry wherever it deviates, and `npm test` green after
  the merge.
- Phase 4 is merged, or logged in `docs/FEEDBACK-LOG.md` as deferred with the reason.
- Phase 5's tool is built, and its runs are approved or waiting on the owner.
- This file is deleted, with what lasts moved into the docs, and anything you decided not to do is logged in
  `docs/FEEDBACK-LOG.md`.
