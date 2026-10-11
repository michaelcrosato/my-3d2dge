# Changelog

One version number covers the engine, its agent edition, the docs and the games (semantic versioning while the major number is 0: the minor number for features, the patch for fixes). Every change merged to `main` bumps it and adds its lines here (except a change confined to a prototype, a Temporary lab: `DOCTRINE.md`), sorted under the parts it touched: **Rendering**, **Animation**, **Art**, **Mocap**, **Engine** (the rest of it), **Emberdeep**, **Characters**, **Tools**, **Docs**.

- `node tools/version.mjs 0.8.0` writes a new number everywhere it lives and opens a section here; `npm test` fails while any place disagrees or this file has no section for it.
- Each deployed page carries its build, the commit it was deployed from: `My3D2dge.build` and `My3D2dge.versionLabel()` (`v0.7.0 · a1b2c3d 2026-10-07`), shown on the Emberdeep title, in its Developer panel, on the Labs page and in the Mocap Lab. Copies built from the repo say `dev-build`.

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
