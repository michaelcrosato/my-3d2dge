# Handoff: the owner's review pass after the genre plan

> **Status: waiting on the owner (2026-10-29).** Nothing here is to be built until the owner says which parts to take up.
> Each part is independent.

What the genre plan (`docs/HANDOFF-GENRES.md`, folded in at v0.81.2; its rules now in `docs/KITS.md`, its full text in
`git show b56505d:docs/HANDOFF-GENRES.md`) left for the owner. The plan built what each milestone needed and deferred the
trimming to a review after the owner had played the kits (the owner's word, 2026-10-28). It is temporary: when a part
lands, its line goes; when none is left, this file goes.

## 1. Play the kits (the owner's checks)

The Labs page's **To check** section holds a card for each kit and system that only a person can judge (feel, sound, a
real phone): 23 cards at v0.81.2, each saying what to do and what to look for, and the Vehicle Lab (Temporary) to settle
D62 by driving. A card goes once checked; what the owner wants changed becomes a plan or a fix.

## 2. Trim to the budgets

The budgets suspended or raised along the way, each a decision in `docs/DECISIONS.md`:

| Budget | Where it stands at v0.81.2 | Decision |
| --- | --- | --- |
| a 2D kit, 200,000 cl100k tokens | thirteen kits past it (the RPG kit the largest, about 243,000) | D52 (suspended) |
| the compact edition kept whole past 500,000 | about 681,000 | D55 |
| the API index, 60,000 | about 57,500 | D57 |
| the API card, 21,000 | about 20,500 | D59 |
| the 3D kits | 239,000 to 315,000 each | D51, D61, D63, D64 |

The ways in, cheapest first: move the API card's detail to the index; put more of the core on the kit diet (a section
of its own and a line in `DIET`); a **3D diet**, the 3D engine's section 8b (vehicles and flight) left out of the 3D kits
that never call it, about 10,000 tokens each off ACTION, PLATFORMER, SHOOTER and HORROR (D63); then the kits' own code.

## 3. The benchmark's era briefs

`tools/agent-bench/briefs/` holds five briefs for era games (v0.81.2): Pac-Man, Street Fighter II, Super Mario Kart,
Final Fantasy Tactics and Resident Evil, each an adaptation on the engine by a fresh agent with the handoff package. Their
runs spend money, so they wait on the owner: `node tools/agent-bench.mjs --brief <name>` for each, and what they find
goes into `docs/FEEDBACK-LOG.md` as a source.

## 4. Optional: a first-person dungeon and sports (the plan's M15)

On the owner's word only. Needs `E.Turns` and `E.Fog` (the grid module), two to four players (the core) and the 3D
engine's doors and levers.

- **3D CRAWLER** (Wizardry, Dungeon Master, Eye of the Beholder, King's Field): `#crawler`, in the 3D starter. A grid
  stepped in first person on the 3D level (turns of 90 degrees and steps, tweened), turns or real time (`E.Turns`), a
  party of four with portraits, an automap from `E.Fog`, doors, levers and pressure plates.
- **SPORTS** (NBA Jam, Sensible Soccer, Tecmo Bowl): `#sports`. Two against two, for up to four players: a ball as a
  `Body` with bounce and curl, passes with aim assist, shots on a meter, teammates by formation, the rules and a match
  clock, commentary on `Dialog`'s radio; a ball's arc solved in the core's math.
- **Done when:** as for any kit (`docs/KITS.md`, What every new kit has).

## 5. A small fix to the engine, proposed

A body drawn from its kept image (`r.actor(..., { every: n })`) picks 1 pixel wider on each side than on the frames it
is redrawn, so where two bodies' boxes meet, `r.pick` can answer differently from one frame to the next (the phone
test's army tap failed on it now and then until v0.79.1 made the test tap a unit with room to spare). The fix:
`_composite`'s kept-image pick box 1 pixel in on each side, matching the redrawn one.
