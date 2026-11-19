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
- One part, one pull request, in the order below; A3 takes one per family of kits.
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

### A0. The baseline

The full `npm test` passes at the commit you start from. Run it first, in the background (about 40 minutes), while
you read for A1 to A3; a failure is fixed forward, in its own patch, before anything else.

### A1. The feedback log's overdue row

`docs/FEEDBACK-LOG.md`'s theme "The look's remainder" (small figures that merge when they overlap, F4.2; empty fields,
F6.2) is marked **watch**, but its "Take it up when" says "reached (F7, after v0.59.0): the next plan takes it up",
and no plan has since. Apply the log's own rule: a theme reaches its threshold at three sources, or at two from
different model families, and F7 is one source (the points before it don't count afresh, its row says). If it isn't
reached, correct the cell to say when it will be (a patch). If it is, write the plan that takes it up and carry it out
as a part of its own after A3.

### A2. The tall toasts

`docs/HANDOFF-CONTROLS.md` part 3, its second line, the one leftover of the controls standard that needs no play test:
the kits' toasts of several lines still reach past the top of the screen where no tutorial card is there to lie under
them (D117's costs). D117 says where its rules run out: 3D SHOOTER's ten buttons upright, and a phone 320 high on its
side with every piece up. Make those fit within D117's rules (nothing a finger takes moves as a toast comes and goes,
and a toast's place never sways); how is your call, logged as a decision. Prove it at the sizes D117 measured, with
screenshots before and after and `npm run test:phone`; then the line goes from part 3. Its first line (D113's rows of
three on a narrow phone) waits for the play test: Part C.

### A3. The trimming pass

D98 made every token budget soft and said "the trimming comes later". With exact counts at v0.108.3 (`npm run
doctrine:check`, its item 6), 28 of the 33 kits are past their soft budgets; only fighting, pinball, puzzle, rhythm and
sports are under. The API card is 22,379 tokens of 22,000, and the API index 65,860 of 64,000.

| Kit | Tokens | Budget | Past by |
| --- | ---: | ---: | ---: |
| blaster | 252,178 | 221,000 | 31,178 |
| sky | 243,770 | 216,000 | 27,770 |
| rpg | 284,592 | 264,000 | 20,592 |
| 3d-horror | 288,404 | 268,000 | 20,404 |
| 3d-shooter | 341,896 | 322,000 | 19,896 |
| metroidvania | 235,754 | 216,000 | 19,754 |
| sim | 248,639 | 229,000 | 19,639 |
| rts | 246,543 | 227,000 | 19,543 |
| kart | 237,291 | 218,000 | 19,291 |
| 3d-crawler | 281,200 | 262,000 | 19,200 |
| 3d-flight | 277,008 | 258,000 | 19,008 |
| 3d-racing | 275,953 | 257,000 | 18,953 |
| shooter | 260,949 | 242,000 | 18,949 |
| adventure | 246,595 | 228,000 | 18,595 |
| zero | 243,590 | 225,000 | 18,590 |
| special | 247,584 | 229,000 | 18,584 |
| road | 234,228 | 216,000 | 18,228 |
| 3d-action | 268,175 | 250,000 | 18,175 |
| brawler | 243,067 | 225,000 | 18,067 |
| 3d-platformer | 262,095 | 244,500 | 17,595 |
| platformer | 232,732 | 216,000 | 16,732 |
| stealth | 231,525 | 216,000 | 15,525 |
| tactics | 227,748 | 216,000 | 11,748 |
| arcade | 227,578 | 216,000 | 11,578 |
| animlab | 226,521 | 216,000 | 10,521 |
| pointclick | 225,521 | 216,000 | 9,521 |
| roguelike | 222,979 | 216,000 | 6,979 |
| artillery | 219,555 | 216,000 | 3,555 |

Where a kit's tokens go, the platformer's for one (234k): the engine core on its diet, 169k (148k to 169k in the four
kits measured); the slice's game, readable, 32k; the API card, 18.6k; the dualsense module, 5.9k (in 32 of the 33
kits since the controls standard, v0.107.0); the game's lines, 5.7k; its cut of the asset store, 1.4k. The genre's
other modules add 0 (the platformer) to 18k (artillery). Most kits are 16k to 20k past, so most of it is growth they
share. Find that first: build a kit at v0.104.1 (`f3c6cc8`, where D98 made the budgets soft) and compare it with
today's, part by part.

- The means, in the order the doctrine check names them: the kit diet (`DIET` in `tools/build.mjs`, and
  `tools/diet.mjs`: the core's sections a kit's game never calls), then the API card's detail moved to the index (a
  kit's card keeps its genre's playbook rows and its modules, D71). Move detail; never drop what a builder needs, and
  don't cut doc comments to fit (D82).
- What a kit does must not change: `npm run test:kits` (the slice's proof twice, the same hash; nothing the diet left
  out called), `npm run test:kits -- --compare <the build before>` (every 2D kit, the same pixels), `npm run
  test:kit3d` for the 3D kits, and `npm run test:contract` and `npm run test:agent` for the card and the index.
- No budget is raised (D98). A kit that can't get under without losing what its game needs stays past, and its pull
  request says why. Each pull request lists every kit's count before and after.
- Last, the README's sizes, measured again: the play file (13.7 MB, where it says about 12), and the counts in "Share
  it with an AI model" (measured at v0.85.0).

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
| D55 | the compact edition kept whole past 500,000 tokens (now about 694k) until your review: split it, drop it or keep it | v0.70.0 |
| D60 to D72, D67 first | the genre plan's budgets, the 3D vehicles (D62, the Vehicle Lab), the plan folded in, the music clock and its check (D67) | v0.79.0 to v0.83.0 (`docs/HANDOFF-REVIEW.md` part 6) |
| D89, D90 | the Gallery Lab's `quad` and `pick` moved into the mode7 module; a road's fork is the road module's (`split`, `branch`) | v0.95.0, v0.97.0 |
| D99 | the mga module: `game.audio` plays my-game-audio songs, from a library the game loads itself | v0.106.0 |
| D101, D103 to D106 | the Shell sized for a TV, with tabbed Settings; Create a quarter of a second late; Emberdeep's d-pad; input and a free camera on the player's own time; kits' keys moved to their genre's | v0.107.0 |
| D107 to D118 | 52in1's channel for the DualSense, Emberdeep's pages and taps on lift, crouch on C, the kits upright, the gyro's drift, the Shell above the touch buttons | v0.108.0 (`docs/HANDOFF-CONTROLS.md` part 2) |
| D119 | the engine's tap is its own finger's | v0.108.2 |

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
| A0 the baseline | not started | | |
| A1 the feedback row | not started | | |
| A2 the tall toasts | not started | | |
| A3 the trimming pass | not started | | |
| A4 the CMU picks (optional) | not started | | |
| B the owner's | waiting on the owner | | |
| C after the answers | waits on B | | |
