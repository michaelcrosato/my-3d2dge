# Decisions

The decisions log the doctrine asks for (`DOCTRINE.md`, "Deviations and escalation"): every deviation from a principle
in the engine tier, every call made without a human's answer, every exception granted, and what was grandfathered when
the doctrine was adopted. One entry per decision, newest last, numbered `D1`, `D2`, ...

**The log is never cleaned up.** Unlike finished plans, entries stay when they are done: an entry that no longer holds
is marked **Superseded by D<n>** and kept. `node tools/doctrine-check.mjs` fails when an entry on `main` is gone.

An entry:

```
## D<n> · YYYY-MM-DD · <the call, in a few words>
- **Principle:** which one (or "process")
- **Call:** what was decided
- **Why:** the reasoning, and what would change it
- **Answered:** yes (who asked or approved) | no: made without a response, to review
- **Landed in:** the version (v0.15.0) and, once merged, the pull request
```

## D1 · 2026-10-10 · Adopt the doctrine

- **Principle:** all
- **Call:** `DOCTRINE.md` is this repository's doctrine: the draft "Agent-First Game Engine: Doctrine" as rewritten in
  discussion with the owner. Changes from the draft: two tiers (the engine and prototypes); a ground station and a
  measured North Star; replay in place of capture and restore; prototypes may reach past the API; "the version agents
  write correctly" in place of the 12-month rule; escalation by blast radius; a token budget for the manual; a check for
  each principle. What existing code keeps as it is: D3 to D7. The checks: `tools/doctrine-check.mjs` and
  `tools/determinism-test.mjs`.
- **Why:** the owner's context: rapid prototyping, about 1 idea in 100 reaches production, and production pays for its
  own hardening. Deep in the development cycle, so existing code is grandfathered rather than rewritten; new code follows
  the doctrine.
- **Answered:** yes, the owner asked for the adoption and left the grandfathering to the agent's judgment.
- **Landed in:** v0.15.0

## D2 · 2026-10-10 · Prototypes are the Temporary labs

- **Principle:** process (the two tiers)
- **Call:** in this repository a prototype is a Temporary lab: an entry in the Temporary section of `src/labs.json`, with
  the date and the question it answers, and the sources only its page inlines. A change confined to prototypes merges
  without a version bump or a changelog line; its documentation is its `labs.json` entry and its file headers. It may
  reach past the engine's API and deviate from any principle except binary assets (4). It graduates by leaving
  Temporary, and from then on it is held to the engine tier: version, changelog, docs, and no engine-private members
  (the boundary check fails on them once the lab is no longer Temporary).
- **Why:** the Temporary section already worked this way in spirit (one-off questions, deleted once settled); this
  names it and drops the ceremony that was paid on pages that are mostly deleted.
- **Answered:** yes, part of D1.
- **Landed in:** v0.15.0

## D3 · 2026-10-10 · The engine keeps drawing with Canvas 2D (principle 6 grandfathered)

- **Principle:** 6 (WebGPU only, gameplay on the CPU)
- **Call:** the engine draws with Canvas 2D; WebGPU drives only its optional lighting, which falls back to the canvas
  path by itself. Gameplay never reads the GPU (holds). New GPU code in the engine is WebGPU, never WebGL. The two 3D
  labs, prototypes leaving for their own repository, keep three.js's WebGL 2 fallback as their cross-check.
- **Why:** Canvas 2D is how the engine keeps its promises: crisp pixel art drawn by code, one HTML file that works from a
  double-click and on every device, and a renderer that every model already knows. Moving to WebGPU would rewrite the
  renderer and every game's look for no gain in what the engine is for.
- **Answered:** yes, part of D1.
- **Landed in:** v0.15.0

## D4 · 2026-10-10 · Determinism comes from the harness (principle 5 grandfathered)

- **Principle:** 5 (deterministic by construction)
- **Call:** the engine's loop keeps splitting each display frame into equal substeps (the step size follows the frame
  rate), and Emberdeep keeps drawing gameplay randomness from `Math.random` and an unseeded stream. Runs are made
  repeatable from outside instead: `tools/filmstrip.mjs --seed` installs a virtual clock (every frame exactly 1/60 s),
  a seeded `Math.random`, no sound, no controller and no GPU, and the same steps then give the same pixels.
  `tools/determinism-test.mjs` checks that this keeps holding. New code keeps it working: gameplay takes time only from
  `dt` and the game's clocks, and randomness only from `Math.random` or the engine's seeded streams (`E.rng`).
- **Why:** an exact fixed step needs render interpolation and touches every game; seeding Emberdeep means auditing
  hundreds of random draws that mix gameplay with looks. The harness already gives agents what determinism is for
  (reproducible bugs, before-and-after pictures). Revisit when a feature needs replay inside the game itself, or a bug
  will not reproduce under the harness.
- **Answered:** yes, part of D1.
- **Landed in:** v0.15.0
- **Revised by D12** (v0.16.0): the plan for replaying recorded sessions, and sound on its own random stream.

## D5 · 2026-10-10 · One-file pages and shared-scope sources stay (principle 7 grandfathered)

- **Principle:** 7 (common ground)
- **Call:** the sources joined in name order into one shared scope (`src/emberdeep/`, `src/starter/`), the build's
  `@inline` directives and the dense code style stay. Tools keep using standard ES modules.
- **Why:** every page ships as one self-contained HTML file that a model can be handed whole or a person can
  double-click; standard modules would need a server or a bundler. Emberdeep's 24,000 lines are written for this scope,
  and its contract (`src/emberdeep/DESIGN.md`) is built on it.
- **Answered:** yes, part of D1.
- **Landed in:** v0.15.0

## D6 · 2026-10-10 · Engine-private members already used outside the engine are grandfathered

- **Principle:** 8 (quality under the hood)
- **Call:** the uses outside `engine/` of engine-private members (names starting with `_`) that existed at adoption are
  listed by area in `GRANDFATHERED` in `tools/doctrine-check.mjs`; a new one in the engine tier fails the check. The
  list only shrinks. First on the engine's to-do list: `rig._w` (a joint's world offset), which the starter games use,
  so every model that copies them learns a private name; promote it to a public name the next time the engine's rig
  API changes.
- **Why:** promoting each name now is an engine change across the full engine, the agent edition and the API card, for
  code that works. The ratchet stops it growing, and the to-do list says which names are wanted.
- **Answered:** yes, part of D1.
- **Landed in:** v0.15.0
- **Progress:** v0.16.0 made `rig._w` public as `rig.worldOffset(p)` in both editions; the starters and the arena use
  it, and their entries left `GRANDFATHERED`. A new use of `_w` is told to use the public name.

## D7 · 2026-10-10 · Approved binaries and imported data

- **Principle:** 4 (agent-accessible assets)
- **Call:** approved: fonts (none are used: the engine's fonts are drawn by code) and the pictures our own tools draw for
  the docs (`docs/assets/`, written by `tools/ed-codex-showcase.mjs`). The motion-capture pipeline is approved as it is:
  binary sources (FBX, GLB, ASF/AMC) are converted into readable key poses with their provenance recorded, and the
  binaries are never committed.
- **Why:** the pictures are output made from code, like `examples/`; the mocap store is text an agent reads and edits.
- **Answered:** yes, part of D1.
- **Landed in:** v0.15.0

## D8 · 2026-10-10 · The manuals' token budgets

- **Principle:** 1 (agent-readable)
- **Call:** the agent edition's header (the manual for coding agents) fits 10,000 cl100k tokens; the API card
  (`API.md`, embedded in every single-file edition) fits 13,500. Measured at adoption: 8,952 and 12,217.
- **Why:** about 10% of headroom over today. A manual that grows past its budget is cut, or the budget is raised with a
  new entry here saying why.
- **Answered:** yes, part of D1.
- **Landed in:** v0.15.0

## D9 · 2026-10-10 · The 3D labs' pinned versions meet principle 9

- **Principle:** 9 (pin what agents know)
- **Call:** three.js r182 and Rapier 0.19.3 stay pinned and vendored with checksums. They were chosen for what models
  know well (`docs/LAB-3D.md`, "Why these versions"), and the labs' tests ban the WebGL-era three.js APIs agents reach
  for. The draft's 12-month rule was not adopted; under it neither would qualify yet.
- **Why:** the choice already follows the adopted principle.
- **Answered:** yes, part of D1.
- **Landed in:** v0.15.0

## D10 · 2026-10-10 · The owner reviewed D3 to D6 and kept them

- **Principle:** process (deviations)
- **Call:** Canvas 2D (D3), determinism from the harness (D4, revised by D12), one-file pages and shared-scope sources
  (D5) and the grandfathered private-member uses (D6) stay. A deviation with a case for it is welcome: the doctrine's
  "How to read this" and `CLAUDE.md` now say so.
- **Why:** the owner's words: variation is the key to discovery, so some deviation must happen where there is a case for
  it; this engine is uniquely different from the four front-runners, and that counts for something.
- **Answered:** yes, the owner.
- **Landed in:** v0.16.0

## D11 · 2026-10-10 · The 15-minute wait is a wake-up timer

- **Principle:** process (escalation)
- **Call:** an agent that escalates arms a 15-minute wake-up and keeps working; with nothing left it ends its turn. In a
  cloud session the timer is `send_later` (claude-code-remote) with `delay_minutes: 15`, which delivers a message back
  into the same session after the turn has ended; `delete_trigger` cancels it when the answer comes first. When it fires
  with no answer, the agent makes the call in its own commit and logs it here.
- **Why:** corrects the agent's earlier claim that a cloud session can't wait 15 minutes and resume: it can, by timer.
  The owner asked.
- **Answered:** yes, the owner.
- **Landed in:** v0.16.0
- **Narrowed by D13** (v0.16.1): the timer is for calls that are hard to undo; reversible calls are made at once.

## D12 · 2026-10-10 · Replay recorded sessions, when a bug needs it; sound on its own random stream now

- **Principle:** 5 (deterministic by construction)
- **Call:** D4 argued that determinism needs an exact fixed step. Replaying a session doesn't: the engine's loop is
  already a pure function of each frame's elapsed time, so the same frame times, the same inputs at the same frames and
  the same random seed give the same game. Two parts:
  - **Now (v0.16.0):** the chip synth draws its own random numbers (`ChipAudio.rnd`) in both editions. It used to draw
    from `Math.random`: 44,100 numbers for its noise when sound first started (none where there is no Web Audio, as
    under the harness), and one per sound effect, only while sound was running, unmuted, and the same effect hadn't
    played in the last 35 ms of the audio clock. So whether sound existed, was unlocked, muted or busy shifted every
    random number the game drew after it.
  - **When it's needed:** a session recorder. Recording, installed before the game's code: a seed for `Math.random`;
    each display frame's timestamp, with `performance.now` and `Date.now` reading it during the frame (Emberdeep's slow
    motion and menus read the wall clock); every input event with the frame it arrived before (keys, pointer, wheel,
    touch, blur, focus, visibility, resize; DOM buttons by selector), and gamepad snapshots per frame; the viewport and
    pixel ratio; the save (`localStorage`) at the start; and a checksum every second (a game's own state hash when it
    gives one) so a replay can say where it diverged. Replaying: a tool opens the page in headless Chromium at the
    recorded viewport, restores the save, installs the seed and the clock, dispatches each event before its frame and
    runs every frame, drawing included (some drawing draws random numbers too); then screenshots, filmstrips or
    `__ed` queries at any frame. The owner turns recording on once (a Developer setting), plays on a phone, and on a
    bug saves the session for an agent.
- **Why:** a bug seen on a device becomes an exact, headless repro instead of a description; that's the biggest gain
  determinism can give this repository. Building the recorder waits for its trigger, as the North Star asks: the first
  bug seen on a device that the harness can't reproduce, or the owner wanting to send sessions as bug reports.
- **Answered:** yes, the owner left it to the agent ("fix it, or leave it and see how it goes").
- **Landed in:** v0.16.0 (the sound's stream); the recorder is open.
- **Done in D14** (v0.17.0): the recorder and the replay tool are built.

## D13 · 2026-10-10 · Reversible calls are made at once; the timer is for the hard to undo

- **Principle:** process (escalation)
- **Call:** in the engine tier, a call a revert undoes (code, design, a dependency, a doc) is made immediately, in its own
  commit, flagged in the pull request and logged here; nobody waits for it. Only a call that reaches outside the
  repository or can't be taken back with a revert (deleting what others rely on, publishing, spending, a license) is
  escalated with the 15-minute wake-up timer of D11. This entry is itself such a call: made at once, in its own commit,
  flagged in its pull request.
- **Why:** the doctrine optimizes good ideas per unit of time, and a reversible call's worst case is a revert, which costs
  less than an agent idling or a human being interrupted. The timer still protects the decisions a revert can't fix.
  The owner's goal for this round named both: reversible calls at once, and the timer.
- **Answered:** yes, the owner.
- **Landed in:** v0.16.1

## D14 · 2026-10-10 · Sessions recorded on any device replay exactly

- **Principle:** 5 (deterministic by construction), 3 (verifiable without a display)
- **Call:** build D12's recorder now instead of waiting for its trigger. The engine records (section 23, `E.session`):
  the seed, every frame's time (the clock reads it during the frame), every input from the person or the device with the
  frame it arrived before, gamepad readings, media queries, safe-area insets, the screen and the save at the start, and
  a checksum every 60 frames (`game.stateHash` adds a game's own state; Emberdeep gives its hero, level and crowd).
  `tools/replay.mjs` replays a session in headless Chromium and reports the first checksum that differs. Emberdeep's
  Developer panel (Guide) turns recording on and saves the session; on a phone, to the share sheet.
- **Why:** the owner's goal for this round named a working replay path. It is a reversible call (D13), so it was made at
  once. `tools/replay-test.mjs` proves it: sessions recorded in real time, with the browser's own uneven frame times,
  at a desk and on a phone by touch, replay to the same state to the last decimal, and a session with one key press
  taken out diverges where it should.
- **Limits:** the GPU lighting is off while recording (it starts on real time); a session is one page load; a session
  replays on the build it was recorded on (it carries its version and build); clicks on checkboxes replay through their
  change events.
- **Answered:** yes, the owner (this round's goal).
- **Landed in:** v0.17.0

## D15 · 2026-10-10 · Portable math while recording and replaying

- **Principle:** 5 (deterministic by construction)
- **Call:** while a session records or replays, `Math.sin`, `cos`, `tan`, `atan`, `atan2`, `asin`, `acos`, `exp`, `log`,
  `log2`, `log10`, `pow`, `hypot` and `cbrt` are the engine's own (`PORTABLE_MATH`, engine section 23, `E.session.math`):
  built from `+ - * /` and `sqrt` only, which every JavaScript engine computes exactly, so a session recorded in one
  browser replays in another bit for bit. `sin`, `cos`, `atan`, `atan2`, `exp` and `log` are fdlibm 5.3's algorithms,
  the ones Chromium's are derived from: on 200,000 random inputs each they give Chromium's own bits every time (angles
  past 820,000 radians go on with an exact two-part reduction, within one unit in the last place of Chromium up to
  1e12). The others are composed from those, within a few units in the last place; exact powers of 2 and 10 give exact
  logs. They cost up to about twice the native time while recording; outside a session the browser's own are used.
- **Why:** an iPhone's Safari and Chromium round these functions differently in the last bit, and a game grows that
  bit into a different fight: in the test, a session recorded with every native function one unit off diverged at its
  first checksum (frame 60) without the portable math, and replayed exactly with it. Testing on a real phone needs the
  owner's phone; this closes the known gap between Safari and Chromium in advance.
- **Verified in Safari's engine** (v0.17.2): `tools/cross-engine-math.cjs` runs the same code in V8 and in
  JavaScriptCore (through Bun 1.2.23). Native math gave different bits in the two engines (2.8 million results), and so
  did the engine's own Humanoid animated for 3,000 steps with it; the portable math and the same Humanoid with it gave
  the same bits in both.
- **Answered:** yes, the owner (this round's goal: a bug seen on a phone, replayed headless).
- **Landed in:** v0.17.1
