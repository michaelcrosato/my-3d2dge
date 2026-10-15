# Handoff: the API index, overhaul, optimize or let be

The analysis D28 asked for, and a plan for the owner to approve. `API-INDEX.md` lists every public name in the engine, one
line each, written by `tools/api-index.mjs`. Made on 2026-10-15 against v0.42.0 (`e2a78f5`); every number was measured
on that commit. Tokens are cl100k, counted exactly with the repository's `gpt-tokenizer`, as `doctrine-check` counts
them. This file is temporary: when the work lands, its decisions live in `docs/DECISIONS.md` and the file is deleted, as
v0.38.1 did with the asset plan.

## 1. The verdict: optimize it for answers, don't overhaul it

The index is 35,669 tokens of its 40,000 and hasn't grown since v0.38.1. Nothing shows that agents read it whole:
- the handoff tells them to grep it;
- the benchmark has never recorded a read of it;
- Claude Code's Read tool pages it anyway, at 25,000 tokens a read.

What the evidence does show is lookups it can't answer. The 25 lookups of appendix A come from three places: what the
three benchmark agents read the engine's source for, the briefs, and the kits. Grep alone answers 15 of them. The other
10 fail for two reasons:
- facts the index lacks, most of which `API.md` already has;
- member lines that go by an instance's name (`slash.start`), which a grep for the class (`E.Attack`) doesn't find.

No cut, split or denser format changes one of those answers: options B, C and E all keep 15. Instead:
- adding 1,125 tokens of answers (Phase 1) makes it 24;
- saying each thing once (Phase 2) takes 1,741 tokens back;
- making the 68 names nothing outside the engine uses private (Phase 3, the owner's call) takes 1,827 more.

That ends at 33,226 tokens and 24 of 25 answers. Keep one file and the 40,000 budget. Instrument the benchmark (Phase 4)
before deciding on any split.

| Option | Tokens (today 35,669) | The 25 lookups: yes / partly / no, and the tokens they return | What must change | Effort | A revert undoes it |
| --- | --- | --- | --- | --- | --- |
| **A. Let it be** | 35,669 | 15 / 8 / 2, 7,110 | nothing | none | (nothing to undo) |
| **B. Trim**: the 68 machinery names private, each thing said once | 32,204 | 15 / 8 / 2, 6,746 | the generator; both editions (renames); a game outside the repository that reads one of the 68 | about a day | yes, in the repository |
| **C. Split by area**: a contents file and 3 files (2D core 14,605, standard features 4,210, kits 16,015); or 29, one per section | 35,888 in 4 files; 36,895 in 29 | 15 / 8 / 2, 7,337 (+3%: each hit carries its file's name); 7,539 in 29 | the generator, `doctrine-check`, `contract-test`, `build.mjs`, `test-run.mjs`, the handoff's README and page, `AI_GUIDE.md`, `API.md`, the engine's header, `README.md`, `CLAUDE.md`, `DOCTRINE.md` | about a day | yes |
| **D. Split by edition**: the handoff gets the agent edition's 677 names, the repository keeps all 917 | 26,772 in the handoff | 12 / 6 / 7, 5,911. It loses the prop names, `mover.update`, `r.sightCone`, the HUD's bars and the takedown | the generator, `build.mjs`, the handoff's README, `AI_GUIDE.md` | half a day | yes |
| **E. Denser format**: no bullets or backticks, same-saying lines merged, no repeated names | 32,678 | 15 / 8 / 2, 6,926 | the generator | a few hours | yes |
| **F. Answers first (recommended)**: Phase 1 (facts, instance names, a contents block, long lines split), then Phase 2 (said once), then optionally Phase 3 (B's 68 names) | 36,794 → 35,053 → 33,226 | 24 / 0 / 1 (that one takes a second grep), 6,290 → 6,062 | the engine's doc comments, the generator, a lookup check in `doctrine-check`; Phase 3 as in B | half a day, a few hours, a day | yes |

What would change the verdict:
- Phase 4's run shows an agent reading the index whole, or paging through it: then split it (C), each file under one
  read;
- the index passes 38,000 tokens;
- the lookup check can't keep 24 of 25.

## 2. The evidence

### 2.1 What the index holds

- **917 names, 1,047 lines, 35,669 tokens** (119,915 characters).
  - Without `gpt-tokenizer`, `doctrine-check` estimates 36,897 from the characters: that is the "over 37,000".
  - A line has a mean of 37.6 tokens and a median of 26.
- **By part of a line:**

  | Part | Tokens | Share |
  | --- | --- | --- |
  | descriptions | 24,491 | 69% |
  | signatures | 5,362 | 15% |
  | the frame (bullet, backticks, colon, newline) | 3,405 | 10% |
  | the head (title, units, examples, headings) | 1,151 | 3% |
  | field defaults | 780 | 2% |
  | the † marks | 480 | 1% |

  Without their descriptions, the 917 lines would be 9,304 tokens.
- **By section** (tokens, names):

  | Section | Tokens | Names | Section | Tokens | Names |
  | --- | --- | --- | --- | --- | --- |
  | 10 Game | 4,179 | 95 | 21b Backdrops, shapes | 1,315 | 15 |
  | 5 Input | 2,928 | 73 | 4 Screen | 897 | 28 |
  | 11 Humanoid rig | 2,501 | 72 | 3 Views | 876 | 31 |
  | 13 Tile map | 2,455 | 48 | 8 Particles | 874 | 18 |
  | 21 UI (dialog, menu, shell) | 2,327 | 71 | 13b Materials | 837 | 18 |
  | 9 Renderer | 2,299 | 45 | 20 Audio | 825 | 22 |
  | 17b Actions (mover, suspicion) | 2,143 | 72 | 10b Standard features | 823 | 19 |
  | 1 Math | 1,871 | 54 | 2 Pixel primitives | 734 | 17 |
  | 16 Platform map | 1,782 | 66 | 22 GPU lighting | 663 | 28 |
  | title, units, examples | 946 | | 14 Flow field | 648 | 15 |
  | 17 Body | 611 | 21 | 7 Lighting | 558 | 16 |
  | 18 Bullets | 545 | 18 | 6 Font | 507 | 8 |
  | 12 Blob rig | 498 | 17 | 15 Textures | 324 | 8 |
  | the engine object | 275 | 8 | 19 Spatial hash | 220 | 8 |
  | 23 Sessions | 208 | 6 | | | |

- **The 30 longest lines** hold 5,961 tokens (17%):

  | Line | Tokens | Line | Tokens | Line | Tokens |
  | --- | --- | --- | --- | --- | --- |
  | `new E.Game` | 450 | `game.audio.music` | 192 | `map.solid` | 155 |
  | `game.start` | 381 | `new E.Body` | 185 | `map.landing` | 144 |
  | `r.actor` | 332 | `new E.Platformer` | 183 | `game.cam` | 142 |
  | `new E.TileMap` | 327 | `level.move` | 173 | `E.sees` | 139 |
  | `E.MOVES` | 277 | `r.shape` | 171 | `E.shapeSprite` | 139 |
  | `shell.hud` | 258 | `rig.drawPortrait` | 163 | `flow.next` | 136 |
  | `E.shapeMesh` | 249 | `E.font` | 160 | `E.materialTile` | 134 |
  | `new E.FlowField` | 235 | `E.HEIGHTS` | 158 | `E.addAssets` | 130 |
  | `new E.Shell` | 211 | `input.touchButtons` | 155 | `map.ledge` | 128 |
  | `shell.show` | 206 | | | `E.sprite`, `E.targets` | 125, 123 |

  39 descriptions are over 100 tokens and hold 6,548 tokens between them. A grep that hits one pays for all of it: lookup
  17 returns 1,422 tokens, and 831 of them are `new E.Game` and `game.start`.
- **Duplicates.**
  - No inherited member is repeated. The one subclass, `E.Mover` (it extends `E.Body`), lists only what it adds; nothing
    on its lines says it also has `body.jump`, `push` and the body's fields.
  - 55 lines repeat a description already given in their own section, in 42 groups (`body.x`, `y`, `z`; `view.bx`,
    `by`, `bz`; `mover.run`, `sneak`, `sprintSpeed`, `walk`). Merging each group into one line saves 660 tokens.
  - 27 parent lines restate their members' own lines. Cutting the restated clauses saves 820 tokens. Examples:
    - `game.cam`: 138 tokens that its 13 member lines repeat;
    - `game.stats`: 67 tokens;
    - `new E.Body`: 176 tokens against its 16 field lines;
    - `new E.Mover` and `new E.Suspicion`: 111 tokens each.
  - `E.HEIGHTS` (142 tokens of description) restates the height rules the index's own head gives.
  - 50 descriptions begin with their name again (`view.inv`: "inv: the inverse ..."), 116 tokens. `E.ACTIONS` and
    `E.songs` list their keys twice, 26 tokens.
- **Descriptions that are wrong.**
  - `E.ease.outQuad`, `talk.modal`, `input.screen` and `settings.saved` lose their closing parenthesis: `trailing()`
    strips a final `)`.
  - `game.stats.updateMs` and `renderMs` both say "updating and drawing".
  - `E.session.frame`, `recording` and `replaying` each carry all three clauses.
  - These carry a neighbor's comment or a fragment: `r.groundPts` ("ground helpers"), `map.toCell` (the half about
    `center`), `rig.atkRel`, `rig.downW` and `new E.Screen`.

### 2.2 Who uses which names

Every name was looked for in the code outside the engine (comments stripped). The consumers: the starters and 3D
starters, the kept labs and the prototypes, Emberdeep, the mocap store, the handoff's template game, the 3D engine, the
cards' fenced code, the asset store's data, and the tools and tests.

- **805 names are named somewhere** after a dot, by any object: an upper bound.
- **550 are named through the receiver games give them** (`game.screen.S`, `r.bw`, `rig.x`): a lower bound.
- By consumer, upper and lower bound:

  | Consumer | By name | By receiver |
  | --- | --- | --- |
  | Emberdeep | 621 | 314 |
  | tests | 567 | 294 |
  | starters | 511 | 283 |
  | the prototypes | 401 | 111 |
  | the kept labs | 398 | 173 |
  | the 3D engine | 317 | 64 |
  | the 3D starters | 247 | 74 |
  | the cards' code | 222 | 138 |
  | the template game | 144 | 63 |
  | the mocap store | 84 | 17 |
  | the asset store's data (pattern names) | 12 | 11 |

- **112 names are named nowhere outside the engine.** 84 of them are public API that no game calls yet, and stay:
  setters, presets, small helpers and options a constructor takes (`game.audio.setVolume`, `level.slopeZ`, `E.toHex`,
  `mover.sneak`).
- **68 names are machinery** (appendix B), 1,850 tokens:
  - 28 are among the 112;
  - 40 are named outside the engine, but only by other objects, checked receiver by receiver (`lights.list` is always
    some other list);
  - three kinds: what the engine calls itself (`r.finish`, `game.particles.update`), constructors of objects only the
    game makes (`E.Renderer`, `E.Settings`), and inner state (`r.bb`, `input.pinching`, `rig.hairPts`).
- **What the check keeps public.** D17 made about 110 names private and had to put two back in the same pull request:
  Emberdeep reads `input.padPrev` and `input.stickId`. The receiver check keeps those and the others games read, such as
  `view.ax` to `view.inv`, `game.screen.OX`, `S` and `dpr`, `r.bw`, `r.tgt`, `flow.d`, `map.floors`, `talk.pages`,
  `menu.i`, `rig.trail` and `blob.flapP`.
- **What making a name private costs.**
  - In the repository, nothing: no game, kit, lab, test or card uses the 68. The agent edition drops the same names
    (`agent-test` keeps it a subset).
  - Outside the repository: a game built from the handoff that reads one gets `undefined` once it takes the new
    engine, with no error to point at it. The handoff is five days old and the benchmark games' code isn't kept, so how
    many such games there are can't be checked.

### 2.3 How agents read it

- **What they are told.** The handoff's README says: "Search `API-INDEX.md` ... `grep -n "ledge\|landing"
  API-INDEX.md`. Don't read it whole". The engine's header says "search it". The agent edition's header doesn't mention
  the index at all, so no option has a pointer to change there.
- **What was recorded: nothing.**
  - `tools/agent-bench.mjs` watches one file, `my-3d2dge.js`. No read of `API-INDEX.md`, `API.md` or `AI_GUIDE.md` was
    recorded.
  - The runs' streams stayed in `~/.cache/my-3d2dge-bench` on the machine that ran them.
  - The only trace is F2.1 and F4.1: the agents read the third-person kit's code "rather than their index lines". So
    whether agents grep the index has never been measured.
- **A whole read is paged.** In this session, Claude Code's Read tool was asked for the whole of
  `dist/handoff/API-INDEX.md`.
  - It returned lines 1 to 445 of 1,047, and said the file is 49,996 tokens against a cap of 25,000 a read. That count is
    its own, line numbers included, about 1.4 times the cl100k count.
  - The first page ends inside section 10, Game. The rig (11), the maps (13, 16), the third-person kit (17b) and the
    dialog (21) are on pages it doesn't show.
  - Phase 4 tests a guess: an agent that "read it whole" saw no kit.
- **The 25 lookups** (appendix A) answer 15 alone, 8 partly and 2 not at all. Together they return 76 lines and 7,110
  tokens; the median lookup returns 138. The 10 that fail, fail in two ways:
  - **the fact isn't on the line**: `rig.update`'s state keys, the prop names (`E.PROPS: 38 entries`), the hat styles,
    the backdrop's `sun`, the form of a dialog's choices, how to play a takedown (lookups 1, 2, 3, 10, 11, 16 and 21);
    - `API.md` has most of these: hats (`API.md:177`), the tile kinds (`:156`), the takedown (`:168`), choices
      (`:138`), the poses;
    - so the index, which D17 made to hold the detail, says less than the card on the same names;
  - **the members go by the instance's name**: `slash.*` for `E.Attack`, `level.kind` for `E.PlatformMap`,
    `suspicion.update` for `E.Suspicion` (lookups 7, 12 and 22).
- **A hit on a long line costs more, but still answers.** Lookups 17 and 25 return 1,422 and 1,098 tokens.
- **No trim fixes a failed lookup.** B, C and E keep the same 15. Phase 1 adds, each counted alone:
  - the facts, 253 tokens;
  - the prop names in full, 93;
  - the instance names, 69;
  - a contents block, 356;
  - the long lines split, 178.

  Together they add 1,125. With them grep answers 24 alone; the 25th (`E.Attack`) takes a second grep, for `slash\.`.
  The 25 then return 6,290 tokens.
- **Size costs an agent little; a failed lookup costs a lot.**
  - A broad grep returns 2,000 to 3,000 tokens: "jump" gives 44 lines and 3,114 tokens, "update(" 27 lines and 2,231.
  - A read of the engine's source costs up to 25,000 tokens, the Read tool's cap. The three runs read it 13, 11 and 29
    times.

### 2.4 Growth

| Version (date) | Names | Tokens | What added them |
| --- | --- | --- | --- |
| v0.19.0 (10-10) | 725 | 27,339 | the index begins (D17) |
| v0.20.0 | 807 | 30,276 | the third-person kit: +2,937 |
| v0.21.0 | 822 | 31,197 | `E.Shell`: +921 |
| v0.23.0 (10-11) | 863 | 33,261 | the standard features: +2,064 |
| v0.24.0 | 867 | 33,572 | the boot |
| v0.26.0 to v0.27.0 | 876 | 34,413 | full screen and phones |
| v0.28.0 to v0.30.1 | 879 | 34,711 | frame pacing |
| v0.32.0 to v0.32.1 (10-12) | 884 | 35,384 | the player's zoom: +673 |
| v0.34.0 | 887 | 35,697 | the 3D engine's hooks (D28's raise came after) |
| v0.35.0 (10-14) | 914 | 35,078 | shapes and materials: +27 names, yet 619 tokens fewer, because the lines that showed engine code or another name's comment were fixed |
| v0.38.1 | 917 | 35,669 | the 3D shapes |
| v0.39.0 to v0.42.0 (10-15) | 917 | 35,669 | the asset store and the kits: data, no names |

- **The rate.** From v0.19.0 to v0.42.0 the index gained 192 names and 8,330 tokens: 23 minor releases in five days.
  - That is 362 tokens a minor release on average, 127 since v0.23.0, and none since v0.38.1.
  - Two features made 60% of it: the third-person kit and the standard features.
  - The remaining 4,331 tokens last about 12 more minor releases at the first rate and about 34 at the second. Releases
    come several a day, so count in releases, not days.
- **Planned work that adds names.** No plan is open (`docs/` has no other `HANDOFF-*.md`). These would add names
  (rough sizes, at about 38 tokens a line):
  - the threshold theme "reading the engine's source" (F2.1, F3.1, F4.1): its remedy is index content, Phase 1's facts
    and more like them, about +1,000;
  - live tuning moved into the engine (principle 2's open item): +500 to +1,000;
  - free climbing and gliding (F3.4, F4.4, watched): +300 to +500;
  - saves and checkpoints (F1.8, watched): +300 to +500;
  - passages under roofs (F1.5, deferred): +50.

  Together that is +1,500 to +3,500. It fits under 40,000; under 37,000 only after Phases 2 and 3.

### 2.5 The † lines

- **What they are.** 240 lines are marked † (the 241 counted with grep includes the head's sentence about the mark).
  They hold 8,861 tokens, 25% of the index; the marks themselves 480.
  - Most are in 17b Actions (67), 5 Input (36), 22 GPU lighting (28), 7 Lighting (16), 10 Game (15), 13b Materials
    (15), 21 UI (14) and 9 Renderer (12).
- **Who they serve: everyone with the handoff.**
  - The handoff is the full engine's package. Its README's first line: "Everything a coding agent needs to build, run,
    test and check a game on the full my-3D2dge engine".
  - Its template game loads `../my-3d2dge.js` and calls `r.shape` and `map.solid`, both †.
  - The benchmark's briefs are third-person games, and what they need is †: the kit's members, `r.sightCone`, the Shell's
    HUD.
  - The agent edition's header is its own whole manual, and sends no one to the index.
- **An index of the agent edition's names alone** (option D) is 26,772 tokens and answers 12 / 6 / 7 of the 25. It
  would serve builders on the agent edition, who don't get the handoff. Keep the full index in the handoff.
- **The marks themselves** cost 527 tokens on the trimmed index. They tell a builder which names are in the essential
  engine. Keep them.

### 2.6 D28's question: 34,000, 37,000 or 40,000

| Budget | Left today (35,669) | Left after Phases 1 and 2 (35,053) | Left after Phase 3 (33,226) | A whole read in Claude Code, at the budget | To reach it |
| --- | --- | --- | --- | --- | --- |
| **40,000** | 4,331 (11%) | 4,947 (12%) | 6,774 (17%), about 180 lines | about 56,000 Claude tokens, 3 reads | nothing |
| **37,000** | 1,331 (4%) | 1,947 (5%) | 3,774 (10%), about 100 lines | about 52,000, 3 reads | Phases 2 and 3 |
| **34,000** | over by 1,669 | over by 1,053 | 774 (2%), about 20 lines | about 48,000, 2 reads | Phases 2 and 3, and then either a plain frame without bullets or backticks (31,108) or no † marks (32,699) |

- **What a budget costs an agent.** Grepping is what the manuals tell agents to do, and it costs the same at every budget:
  the hits. A whole read is the only cost a budget changes. Between 34,000 and 37,000 a whole read differs by one Read
  call and about 4,000 tokens.
- **What a budget buys.** Room to grow, and a decision each time it fills.
  - At 37,000 after the plan, the next feature the size of the standard features (+2,064) would force a raise.
  - At 34,000 the plan's answers fit only after Phases 2 and 3, with 774 tokens to spare.
- **Recommendation: keep 40,000.** Lowering it buys an agent almost nothing while agents grep. If Phase 4 shows them
  reading it whole, the answer is a split, each file under one read, not a lower number.

## 3. The work

Read `CLAUDE.md`, `DOCTRINE.md` (principle 1 and its row) and this file. One phase per pull request, in order. Phases
1, 2 and 4's tool don't wait on each other. Phase 3 waits on the owner's yes, and Phase 4's run waits on its own.
Version numbers are given as if nothing else merges in between.

### Phase 0: merging this plan (a patch, v0.42.1)

- **Files:** this plan; `CHANGELOG.md` (Docs: the plan); the version.
- **Decision:** D38 (the next free number) records the owner's answers to section 4. It answers D28's "what would
  change it", and D28 stays as it is.
- **Checks:** `npm run test:changed` (the quick checks only).
- **Undo:** a revert.

### Phase 1: the index answers (a patch, v0.42.2)

1. **The facts the lookups miss**, as doc comments in `engine/my-3d2dge.js` (comments only, no code):
   - `rig.update`'s state: also `aim`, `crouch`, `sprint`, `climb`, `hang` (`hangZ`), `flip`,
     `pose: 'cheer' | 'cast' | 'guard' | 'kneel' | 'crouch' | 'wave' | 'hips' | 'down' | 'die'`,
     `stance: 'guard' | 'ready'` and `down`;
   - the Humanoid's `hat: 'cap' | 'band' | 'crown' | 'helmet' | 'pointed'` (or `{ style, color }`) and `hood`;
   - the backdrop's `sun` and `moon`: `{ x, y (0..1 of the screen), r, color }`;
   - `talk.say`'s `choices: ['YES', 'NO']`, shown on the last page, with `onChoice(i)`;
   - on `new E.Suspicion`: "each step: `suspicion.update(dt, seen, target)`";
   - on `new E.PlatformMap`: the tile kinds;
   - on `E.ACTIONS`: playing one, `mover.play('takedown', { other })`;
   - on `new E.Mover`: that it is an `E.Body`, so it has `body.jump`, `push` and the body's fields too.

   Most of these are the card's facts, said where a grep finds them. The prop names (from the generator, below) and
   the backdrop's `sun` are in no manual yet. `API.md` and the agent header don't change.
2. **The generator** (`tools/api-index.mjs`):
   - a contents block after the examples: each section, the line it starts on, and the name each class's instance goes
     by (`E.Attack: slash`);
   - the instance name on each constructor line: `` `new E.Attack(spec = {}, over) → slash` ``;
   - a short array of strings listed in full: `E.PROPS`'s 38 names, `E.VIEW_ORDER`;
   - long lines split. A doc comment's option clauses, written one to a line as `name: what it does`, become lines of
     their own, named by their owner: `` `new E.Game({ expand })` ``. Apply this to the 10 lines over 200 tokens.
     (The counts here split the three a script could: `new E.Game`, `game.start` and `new E.TileMap`.)
3. **The lookup check.**
   - Appendix A's 25 lookups go in a file (`tools/api-index-lookups.json`): each one's grep, and the facts its hits must
     hold.
   - `api-index.mjs --check`, and so `doctrine-check`, fails when one stops answering.
   - A lookup an agent is later seen to miss is added there.
4. **`docs/FEEDBACK-LOG.md`:** the threshold theme "Reading the engine's source" gets "the index's part taken up in
   v0.42.2".

- **Result:** 36,794 tokens; 24 of the 25 answered alone, and the 25th (`E.Attack`) in two greps; the 25 return 6,290
  tokens.
- **Checks:**
  - `node tools/api-index.mjs --check`: the lookups;
  - `npm run doctrine:check`: 36,794 of 40,000;
  - `node tools/contract-test.mjs`: the index's examples still run;
  - `npm run test:changed`: an engine change runs every suite; they should pass unchanged, since only comments
    changed.
- **Decision:** D39, "the index answers its lookups" (principle 1): the contents block, the instance names, the split
  lines and the lookup check.
- **Undo:** a revert.

### Phase 2: each thing said once (a patch, v0.42.3)

All in `tools/api-index.mjs`, except where a doc comment is the cause:
- lines of one object that say the same thing become one line, `` `body.x = 0`, `body.y = 0`, `body.z = 0`: its position ``
  (−660);
- a parent's clause that a member's own line repeats goes (`game.cam`, `game.stats`, `new E.Body`, `new E.Mover`,
  `new E.Suspicion`, `E.V3`, `E.ease`, `E.tex`, `E.ui`) (−853);
- no name repeated at the start of a description, and a table's keys once (−142);
- `E.HEIGHTS` points to the head's rules instead of restating them (a doc comment);
- the wrong descriptions of section 2.1 fixed: `trailing()` keeps a final `)`, a shared clause goes only to the names it
  names, and a group's comment stays with its group (these two items: −166; the five lines that carry a neighbor's
  comment get new wording, which the count leaves out).

- **Result:** 35,053 tokens, 616 under today; the lookups unchanged (24 of 25; 6,065 tokens).
- **Checks:**
  - `node tools/api-index.mjs --check`: the lookups;
  - `npm run doctrine:check`;
  - `npm run test:changed`: the generator runs the contract suite.
- **Decision:** none; D38 covers it.
- **Undo:** a revert.

### Phase 3: the machinery private (a minor version, v0.43.0; only with the owner's yes, decision 2)

- **The 68 names of appendix B**, in `engine/my-3d2dge.js` and `engine/my-3d2dge-agent.js`, with every use inside the
  engines renamed:
  - the methods and fields take a leading `_`;
  - the seven constructors only the game makes leave `E`: `E.Screen`, `E.Renderer`, `E.Lighting`, `E.Audio`,
    `E.FullScreen`, `E.Settings` and `E.GPULighting`, with `E.GPULighting.supported`. Their instances stay public
    (`game.screen`, `r`, `game.lights`, `game.audio`, `game.fullscreen`, `game.settings`, `game.gpu`).
- **`tools/api-index.mjs`:** it finds those classes without `E` (in the source it already scans), so their members stay
  in the index and only the constructor lines go.
- **Result:** 33,226 tokens; the lookups unchanged.
- **Checks:**
  - `npm run doctrine:check`: its boundary check now fails any use of the 68 outside the engine (none today);
  - `npm run test:agent`: the agent edition is still a subset;
  - the full `npm test` (about 25 minutes) before merging, not after, since names leave the API.
- **Decision:** D40, "68 machinery names leave the API" (principle 8). It records the rule (no use outside the engine
  through its receiver; the engine calls it, or it is inner state), the list, and the cost outside the repository.
- **Undo:** a revert restores the names, and no game in the repository needs a change either way.

### Phase 4: see how agents read (a patch for the tool; the run only with the owner's yes, decision 3)

- **`tools/agent-bench.mjs`:**
  - `readStream` watches the manuals as well as the engine: `API-INDEX.md`, `API.md`, `AI_GUIDE.md`, `docs/ASSETS.md`
    and `README.md`;
  - each Read, `cat`, `sed`, `head`, `tail`, `Grep`, `grep` and `rg` of one is classed as **whole**, **range** or
    **search**;
  - each records the lines and tokens its result held (the stream's `tool_result` events), and whether the Read tool
    cut it short;
  - each engine read below the header records whether a search of the index came in the three tool calls before it: a
    lookup the index didn't answer;
  - `result.json` and the table row get the columns, and `--selftest` gets a fixture for each class.
- **`DOCTRINE.md`:** the measures table gets a column, "the index read by search / range / whole (tokens)".
- **The run** (the owner's yes): `node tools/agent-bench.mjs --brief botw-village`, after Phases 1 and 2. One run
  answers D36's question (does the asset store move the judge's score?) and this one. It costs about $13 to $15: the
  brief cost $12.75 last time, and D36 estimated $15.
- **Checks:**
  - `node tools/agent-bench.mjs --selftest`;
  - `npm run test:changed`;
  - the run's row in `DOCTRINE.md`.
- **Decision:** D41, "the benchmark records how the manuals are read" (process). The run's spending is noted with the
  owner's yes.
- **It reopens the split** (option C) if the run reads the index whole or through ranges covering most of it, or if more
  than a third of its index searches are followed by a read of the source.
- **Undo:** a revert of the tool. The run's cost is spent either way.

## 4. Decisions for the owner

Each is a yes or no; the recommended answer is in bold.

1. **Optimize, don't overhaul?** One file, and the 40,000 budget kept (not lowered to 37,000 or 34,000). Phases 1, 2 and
   4's tool go ahead. **Yes.**
2. **Phase 3: make the 68 machinery names private?** It is a minor version. Nothing in the repository breaks; a game
   built outside it that reads one of them breaks when it updates. **Yes.**
3. **Phase 4's run?** One run of the Breath of the Wild brief with the instrumented benchmark, after Phases 1 and 2,
   about $13 to $15. It also answers D36. **Yes.**
4. **The handoff keeps the full index**, with no index of the agent edition's names alone? **Yes.**

**The owner's answers, 2026-10-15:** yes to all four, so Phase 3 and Phase 4's paid run go ahead.

## Appendix A: the 25 lookups

Each lookup is `grep -n "<pattern>" API-INDEX.md`, the handoff README's own form. "Yes" means the hits hold every fact
the lookup needs, "partly" means some. Tokens are what grep returns.

| # | Source | The lookup | Pattern | Today: answer, lines, tokens | After Phase 1 | What today's hits lack |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | F2.1 | the state `rig.update` takes | `rig.update` | partly, 6, 705 | yes, 6, 805 | `crouch`, `sprint`, `climb`, `hang`, `flip`, `pose`, `stance` |
| 2 | F2.1 | the prop names for `r.prop` | `r.prop\|PROPS` | partly, 2, 160 | yes, 2, 244 | the names (`E.PROPS: 38 entries`) |
| 3 | F2.1, F3.1 | the backdrop presets, and what `sun` takes | `Backdrop` | partly, 3, 170 | yes, 4, 211 | the form of `sun` |
| 4 | F2.1 | make something glow | `emissive` | yes, 2, 138 | yes | |
| 5 | F2.1 | `px.blend`'s modes | `px.blend` | yes, 1, 62 | yes | |
| 6 | F2.1, F3.1 | the song format | `audio.music` | yes, 4, 281 | yes | |
| 7 | F2.1, F4.1 | how an `E.Attack` is driven | `E.Attack` | no, 2, 321 | in two greps: `E.Attack` names `slash`; `slash\.` gives 12 lines, 289 | its methods are `slash.*` lines |
| 8 | F2.1, F4.1 | what `game.hitFx` does | `hitFx` | yes, 1, 85 | yes | |
| 9 | F2.1, F4.1 | whether a dialog holds play | `modal` | yes, 3, 80 | yes | |
| 10 | F2.1, F4.1 | the hats and hoods a rig wears | `hood` | no, 1, 87 | yes, 1, 124 | the hat styles (the line sends you to `API.md`) |
| 11 | F3.1 | a cheer or kneel pose | `cheer\|kneel` | partly, 2, 253 | yes, 3, 453 | that `rig.update` takes `pose: 'cheer'` |
| 12 | F3.1 | the platform legend and tile kinds | `PlatformMap` | partly, 3, 129 | yes, 4, 191 | the kinds (on `level.kind`, which the pattern misses) |
| 13 | F3.1 | turn a view | `view.set` | yes, 1, 44 | yes | |
| 14 | F3.1 | how a body collides and stands | `body.update` | yes, 1, 43 | yes | |
| 15 | F3.1 | steer an `E.Mover` from code | `mover.update` | yes, 1, 77 | yes | |
| 16 | F3.1 | `say` with choices | `talk.say` | partly, 1, 85 | yes, 1, 110 | the form of a choice |
| 17 | F4.1 | a pausable scene, hit-stop, the fade | `pausable\|hitstop\|fade` | yes, 13, 1,422 | yes, 13, 779 | (831 of the tokens are two lines) |
| 18 | F4.1 | `r.sightCone`'s options | `sightCone` | yes, 1, 119 | yes | |
| 19 | the Breath of the Wild brief | climb onto a ledge | `ledge` | yes, 6, 238 | yes | |
| 20 | the Breath of the Wild brief | a stamina meter | `stamina\|meter` | yes, 3, 507 | yes, 3, 511 | (by luck: "meter" finds `E.ui`'s bar and the Shell's HUD) |
| 21 | the Arkham brief | a takedown from behind | `takedown` | partly, 4, 304 | yes, 4, 316 | how to play one |
| 22 | the Arkham brief | guards that grow suspicious | `Suspicion` | partly, 1, 123 | yes, 2, 166 | the step that feeds it what the guard sees |
| 23 | the platformer kit | the side-scroller input preset | `PLATFORMER` | yes, 4, 506 | yes, 4, 289 | |
| 24 | the adventure kit | a contact shadow | `r.shadow` | yes, 1, 73 | yes | |
| 25 | the template game | a headless test | `advance\|input.tap` | yes, 9, 1,098 | yes, 10, 461 | (`new E.Game` and `game.start` again) |
| | | **all 25** | | **15 yes, 8 partly, 2 no; 76 lines, 7,110 tokens** | **24 yes, 1 in two greps; 6,290 tokens** | |

These lookups are the ones the benchmark's agents went to the source for, so Phase 1's facts are the ones those agents
missed. Other lookups will miss other facts: the check keeps these 25 answered, and Phase 4 finds the next ones.

## Appendix B: the 68 names Phase 3 makes private

None is used outside the engine through the receiver games give it (section 2.2).

- **The engine calls them itself:** `game.screen.begin`, `present`, `fixedRes` and `options`; `r.begin`, `finish` and
  `flush`; `game.lights.clear`; `game.particles.draw` and `update`; `game.gpu.render`, `fail` and `show`.
- **Constructors only the game makes** (they leave `E`; their instances stay public): `E.Screen`, `E.Renderer`,
  `E.Lighting`, `E.Audio`, `E.FullScreen`, `E.Settings`, `E.GPULighting` and `E.GPULighting.supported`.
- **Inner state, caches and back references:**
  - the screen and renderer: `game.screen.fx`, `fy` and `o`; `r.bb`, `checker`, `ghosts` and `items`;
  - the lights and particles: `game.lights.casters`, `heats`, `list` and `game`; `game.particles.game`;
  - the GPU lighting: `game.gpu.game`, `cv`, `bh`, `bw`, `frames` and `loading`;
  - other back references: `shots.game`, `grid.map`, `game.audio.game` and `rnd`, `fullscreen.game`, `shell.els`,
    `game` and `o`, `backdrop.o`;
  - `E.faceClass`;
  - input: `input.clickAt`, `pinching` and `onBindings`;
  - the dialog: `talk.page`, `pOpts` and `pSize`;
  - the rig: `rig.atkRel`, `hairPts`, `sidePlane`, `aimA`, `mv` and `smear`;
  - the action: `action.beats`, `shadowZ`, `start`, `o`, `vx`, `vy` and `vz`.

**Kept public, because something outside the engine reads them:**
- Emberdeep's controls: `input.padPrev`, `stickId`, `stickOn` and `padAxes`;
- the stress test wraps `game.lights.render`;
- Emberdeep, the 3D engine and the tests: `game.screen.OX`, `OY`, `S`, `dpr`, `ix`, `iy`, `listeners` and `buf`;
- the kits and Emberdeep: `r.bw`, `bh`, `ix`, `iy`, `tgt`, `gpu` and `game`;
- Emberdeep, the mocap store and the kits: `view.ax` to `view.inv`;
- Emberdeep: `flow.d`, `tx` and `ty`, `map.floors`, `talk.pageLen`, `pages`, `shown` and `i`;
- the starter: `menu.i`;
- the kits, Emberdeep and the 3D engine: `rig.capeL`, `trail`, `downW`, `phase`, `poseW`, `sq` and `spin`;
- the 3D engine: `blob.flapP`;
- the tests: `input.tick` and `action.beat`;
- the stress test: `game.gpu.skipped`.

## Appendix C: how this was measured

- **Tokens:** cl100k, from `node_modules/gpt-tokenizer`, as `doctrine-check` counts them.
- **The options:** each was rendered from a copy of `tools/api-index.mjs` that gives today's `API-INDEX.md` byte for
  byte, and counted whole.
- **The uses:** every entry was looked for in each consumer's code, comments stripped:
  - by its name after a dot, through any object: an upper bound;
  - through the receiver games give it: a lower bound;
  - the machinery candidates were then checked by hand, receiver by receiver.
- **The lookups:** grep as above; their facts are in the table.
- **Growth:** every commit that changed `API-INDEX.md`, counted at that commit.
- **The scripts were throwaway** and are not committed. Phase 1 commits the lookups as a check.
