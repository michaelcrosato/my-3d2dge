# Handoff: finishing what is open

> **Status (2026-11-19, at v0.108.3, `1fd6f6b`):** written from a survey of the whole repository: the handoff plans,
> the Labs page's lists, the decisions and feedback logs, the motion-capture ledger and the doctrine check's notes.
> Nothing in it has started. It is temporary: when a part is done, its line goes and its row in [Progress](#progress)
> says where it landed; when none is left, this file goes, after `docs/HANDOFF-REVIEW.md` and
> `docs/HANDOFF-CONTROLS.md`.

**In short.** Nothing is half-done in git: at v0.108.3 there is no other branch, no stash, no open pull request or
issue, and the code holds no TODO. What is open comes in three kinds:
- **Part A, an agent's, now:** a baseline run, one feedback row to settle, one controls leftover, the trimming pass
  that D98 put off, and (optional) 30 motion-capture takes picked for import.
- **Part B, the owner's:** play on real devices, and read the calls made without them, in one list.
- **Part C, an agent's, after the owner's answers:** what each answer turns into.

The co-op plan was scrapped in v0.108.3 for another plan. That plan is the owner's to give (B3) and is not part of
this one.

## How to work

- Every part follows `CLAUDE.md`: a branch, the version (a patch for a fix or docs, a minor for a feature), its
  `CHANGELOG.md` lines, `node tools/build.mjs`, `npm run test:changed`, a pull request squash-merged as soon as it
  passes, then the full `npm test` in the background (a failure is fixed forward at once, or the merge reverted).
  Report each with its version and commit, and fill in its row in [Progress](#progress).
- One part, one pull request, in the order below.
- A reversible call is made at once, in its own commit, flagged in the pull request and logged in `docs/DECISIONS.md`
  (D120 is the last at v0.108.3). A call that is hard to undo waits, as `CLAUDE.md` says. `docs/DECISIONS.md` and
  `docs/FEEDBACK-LOG.md` are never cleaned up: add to them, never remove.
- Set up first. On the owner's machine: `npm install --no-audit --no-fund --no-package-lock`, then
  `npm install --no-save --no-audit --no-fund --no-package-lock playwright@1.63` (its browsers are Playwright 1.63's).
  A cloud session's start hook installs and sets `CHROMIUM_PATH`. Keep no `package-lock.json`: the test runner counts
  one as a change to everything. Without `acorn` and `terser` the build skips the kits, saying so only in a warning.
- On the owner's machine, one browser suite at a time (20 GB; `earlyoom` kills the biggest browser when memory runs
  out). A quick headless look at a 3D page needs `?backend=webgl`.

## Part A: an agent's, now

### A3b. The look's remainder (A1's plan)

A1 found the feedback log's row reached: `docs/HANDOFF-LOOK.md` takes it up and decided again (no engine change:
the card's look target gains two lines, for small units and for open ground, the TACTICS and KART slices their
examples). Carry out its one phase after A3, then close the theme as it says.

### A4. The 30 picked CMU takes (optional)

`src/mocap/catalogs/cmu-takes.tsv` has marked 30 takes `pick` (next to import) since 2026-10-07, and none is imported
(`node tools/cmu.mjs ledger --status pick`): everyday chores 5, sports 4, animals and characters 4, dance 3,
locomotion 3, acrobatics 2, sitting and lying 2, gesture and talk 2, and one each of idle, combat, exercise, climbing
and other. Import them as `docs/MOCAP.md` ("CMU") says: download with `node tools/cmu.mjs get <ids>` (the network:
mocap.cs.cmu.edu), choose each one's stretch from a contact sheet, name it in `"$pick"` in
`src/mocap/catalogs/cmu.json`, import with `tools/anim-import.mjs`, keep the ledger true, then `npm run test:mocap`.
Every clip records where it came from. A take that turns out wrong gets `skip: why` instead. Without the network,
leave it and say so: it blocks nothing.

## Part B: the owner's

Only the owner can do these. Tell Claude what you find (a line is enough); each answer becomes a line of Part C.

### B1. Play

- **The controls standard**, on a DualSense at a TV, at a desk with a keyboard and mouse, and on a phone held both
  ways: `docs/HANDOFF-CONTROLS.md` part 1. Gyro aim's drift first: set the controller down, pick it up, aim slowly.
  D118 rests on the firmware taking the gyro's bias out, which no real controller has confirmed. If the aim creeps,
  record a session (Settings, Tools): it replays exactly.
- **The 31 cards** in the Labs page's **To check** section (`index.html`): 29 from the genre plan
  (`docs/HANDOFF-REVIEW.md` part 1) and 2 from the controls standard.
- **The Vehicle Lab** (Temporary, 2026-10-28): drive both karts (Tab switches) and settle D62: B, the ball with arcade
  handling that `world.vehicle` is, or A, Rapier's ray-cast vehicle on springs.
- **The Track Lab** (Temporary, 2026-11-05): a track that leaves the ground (a loop, banked bends), kept as data along
  a centreline. Does it hold up, and is it the 3D engine's `world.track()` or a module of its own?

### B2. Read the calls made without you

Each is reversible: a revert undoes it. Say which to undo.

| Calls | What they decided | Landed in |
| --- | --- | --- |
| D55 | the compact edition kept whole past 500,000 tokens until your review: split it, drop it or keep it. It is now ~965k, and the complete edition ~1,162k, past a 1M context (README, v0.108.8) | v0.70.0 |
| D60 to D72, D67 first | the genre plan's budgets, the 3D vehicles (D62, the Vehicle Lab), the plan folded in, the music clock and its check (D67) | v0.79.0 to v0.83.0 (`docs/HANDOFF-REVIEW.md` part 6) |
| D89, D90 | the Gallery Lab's `quad` and `pick` moved into the mode7 module; a road's fork is the road module's (`split`, `branch`) | v0.95.0, v0.97.0 |
| D99 | the mga module: `game.audio` plays my-game-audio songs, from a library the game loads itself | v0.106.0 |
| D101, D103 to D106 | the Shell sized for a TV, with tabbed Settings; Create a quarter of a second late; Emberdeep's d-pad; input and a free camera on the player's own time; kits' keys moved to their genre's | v0.107.0 |
| D107 to D118 | 52in1's channel for the DualSense, Emberdeep's pages and taps on lift, crouch on C, the kits upright, the gyro's drift, the Shell above the touch buttons | v0.108.0 (`docs/HANDOFF-CONTROLS.md` part 2) |
| D119 | the engine's tap is its own finger's | v0.108.2 |
| D121 | a tall toast with no card to lie under: the prompt sinks under it, then the toast is set tight, then no taller than its room, its last lines faded | v0.108.7 |
| D122 | a kit's card leaves out its pieces on what its engine leaves out; the kits stay past their soft budgets, by the controls standard; every 2D kit keeps the platform map (6,900 tokens) only for its title's floor: drawing the title another way is your call | v0.108.8 |

### B3. The plan that replaces co-op

Yours to give. `docs/HANDOFF-COOP.md` was scrapped for it in v0.108.3; its text is in
`git show b2cc5a1:docs/HANDOFF-COOP.md`.

## Part C: an agent's, after the owner's answers

- **A card the owner checked:** what they want changed becomes a fix or a plan; the card leaves `src/labs.json`'s To
  check; what isn't acted on goes in `docs/FEEDBACK-LOG.md` (F9 is the last source).
- **The Vehicle Lab:** B, and the lab is deleted (a Temporary lab, D2) and D62 stands; A, and a plan for the ray-cast
  vehicle (`docs/HANDOFF-*.md`).
- **The Track Lab:** graduated as the owner says (into `world.track()`, or a module of its own, then held to the
  engine tier) or deleted.
- **The controls:** D113's rows of three, if a thumb meets the third button on a narrow phone
  (`docs/HANDOFF-CONTROLS.md` part 3); the gyro's rule, if a real controller creeps (its recorded session replayed).
- **D55:** the compact edition split, dropped or kept, as the owner says.
- **A call the owner undoes:** reverted in its own commit; its decision says so.
- **The handoffs:** a part done, its line goes. `docs/HANDOFF-REVIEW.md` and `docs/HANDOFF-CONTROLS.md` go when they
  are empty, every reference to them repointed, and this file last.

## Done means

- Part A merged, each part with its version, changelog lines and pull request; A4 too, or a line in its row saying
  why not.
- The full `npm test` passes after the last merge.
- The owner has Part B in one message: what to play, then what to read.
- [Progress](#progress) is current. Part C waits on the owner and is not part of done.

## Progress

| Part | State | Version and commit | Notes |
| --- | --- | --- | --- |
| this plan | written | v0.108.4 | from a survey at v0.108.3 |
| A0 the baseline | done | v0.108.5, `86cb008` | three failures fixed forward: the music fell silent on a device that lags (an engine bug: a Bluetooth headset's player could hear no music); kit3d's and phone-test's turns in full screen; phone-test's stick checks timed by the wall's clock |
| A1 the feedback row | done | v0.108.6, `99edafa` | reached: `docs/HANDOFF-LOOK.md` takes it up (A3b) |
| A2 the tall toasts | done | v0.108.7, `2e3e3ef` | the prompt sinks under a tall toast, then the toast is set tight, then no taller than its room (D121): 15 cases past the top or on Menu, none after |
| A3 the trimming pass | done | v0.108.8 | a kit's card leaves out its pieces on what its engine leaves out: 1,118 to 3,052 tokens a kit (D122); 28 kits stay past, by the controls standard every kit's game uses |
| A3b the look's remainder | not started | | `docs/HANDOFF-LOOK.md` |
| A4 the CMU picks (optional) | not started | | |
| B the owner's | waiting on the owner | | |
| C after the answers | waits on B | | |
