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

## D10 · 2026-10-10 · Local tools for live animation edits

- **Principle:** 2 (agent-operable), 3 (headless inspection), and the repository's offline pages.
- **Call:** Animation Studio is a kept tool. Its built page contains the engine, clip data, and editor. It works by
  itself. An optional Node server connects a loopback page to a watched JSON project and an MCP stdio adapter.
  Live edits use local HTTP and server-sent events. No model service, remote data request, or engine dependency is added.
- **Why:** the owner asked to see LLM animation edits while they happen. The shared readable model lets the browser,
  file tools, HTTP client, and MCP client edit the same data. Exact-time frame strips let an LLM inspect the result.
  Source files remain readable, and exported clips keep reference bodies and source details.
- **Answered:** yes, the owner asked for an animation tool with live LLM edits in this session.
- **Landed in:** v0.16.0
