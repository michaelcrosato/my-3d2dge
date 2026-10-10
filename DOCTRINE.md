# Agent-First Game Engine: Doctrine

Adopted by my-3D2dge in v0.15.0 (`docs/DECISIONS.md`, D1). The doctrine comes first; [In this repository](#in-this-repository)
says how it applies here, what was grandfathered when it was adopted, and which check holds each principle.

## How to read this

Read this as a trusted, capable manager building an engine that you and others will use. We don't spell out the obvious;
use your judgment. Every principle is a default with a reason. When the reason doesn't hold, deviate and say why (see
[Deviations and escalation](#deviations-and-escalation)). Variation is how discovery works: a deviation with a case for
it is welcome, not merely tolerated. This document changes the same way.

Two kinds of work carry different weight:

- **The engine** is built once and used by every game. It gets the care: quality internals, automated checks, versions
  and a manual.
- **Prototypes** are how we find something worth shipping. About 1 in 100 reaches production, and production pays for
  its own hardening. A prototype carries only what makes it fast to build and easy to judge. Versions, changelogs and
  docs start when it graduates.

## North Star

Build a game engine designed from the ground up for AI coding agents. Every layer is built so agents can develop, test,
inspect and debug it directly. We leave behind tooling and methods that agents can't use well.

Analogy: an autonomous fighter jet with no cockpit, flown from a ground station. Removing the pilot removes the
constraints a human imposes on the design. The ground station is how humans give direction; agents fly the plane.

**What we optimize:** good ideas found per unit of time and tokens. In a 1-in-100 funnel the bottleneck is judging
ideas, so every prototype is built to be judged fast. It is playable at a link on the reviewer's device, with a few lines
saying what the idea is and what to try.

**How we measure it:**
- the time from a brief to a playable link;
- how often a fresh agent's first build runs.

Optimize for the best expected overall output, not flawless software. Solve problems when they surface, not in
anticipation. The exception is the two invariants (principles 5 and 6): they cost little to hold from the start and a
rewrite to add later.

## Principles

1. **Agent-readable.** An agent builds a game from the manual alone, without reading the engine's source. The manual has
   a measured token budget. The engine's own code is written for the agents who build it: small files, each with a
   header saying what it holds, and names that are easy to grep.

2. **Agent-operable.** Every capability has a machine interface: a console handle, URL parameters, scripted input. A GUI
   is welcome as a view over that interface (a tuning panel over the engine's knobs), never as the only way in. The
   engine gives every game a link to any moment and live tuning of its numbers.

3. **Verifiable without a display.** Everything runs, is tested and is inspected headless.
   - Agents judge look and motion from screenshots and frame strips, compared pixel by pixel with the build before.
   - Humans judge fun from the playable link.
   - The engine ships the test harness, so every prototype has it from the first line.

4. **Agent-accessible assets.** Source assets, in order of preference:
   1. Procedural: code and data that generate the asset.
   2. Text or data an agent can meaningfully read and edit. Base64 inside a text file is still binary.
   3. Binary: only with human approval. Approved: fonts (WOFF2, TTF, OTF).

   Converting a binary source into readable data is fine: record where it came from and don't commit the binary.

   Rationale: agents work best with code and data, and are improving at that faster than legacy asset tools are
   improving for agents.

5. **Deterministic by construction** (invariant). On the development platform, the same seed and inputs give the same
   state, with any renderer or none. The engine owns three things, and games get determinism by using them:
   - the clock, an exact fixed step;
   - the gameplay random stream, kept separate from cosmetic randomness;
   - the input log.

   Any moment is reached by replaying its inputs. Snapshots come later, when replay is too slow.

   Rationale: this is what makes agents fast. A bug that reproduces gets fixed in one pass, a change can be proven to
   touch only what it should, and a bot can play a thousand runs overnight.

6. **WebGPU only, gameplay on the CPU** (invariant).
   - WebGPU is the only renderer, in a browser or through a native implementation (Dawn, wgpu).
   - Gameplay never reads anything back from the GPU. The proof: the simulation gives the same hash with no renderer
     at all.
   - Shader code lives in the engine; games describe looks through its vocabulary.
   - Game UI may be HTML/CSS, as a view of game state that never holds any.

7. **Common ground.** Everything agents touch when building games uses widely used languages, libraries, systems and
   patterns. Don't invent a house idiom where a standard one exists. Favor flexibility, ease of use and established
   approaches over cutting-edge performance and capabilities.

   Analogy: build the Sherman, not the Tiger.

   Rationale: lean into what agents already do well rather than trying to change it.

8. **Quality under the hood.** Engine internals, meaning code whose API does not appear in game code, use the
   highest-quality approach their builder can execute well, however complex. Reuse what others have built well, and
   invest heavily in what is ours. That complexity stays behind the API, and errors speak the API's language, so a
   game-building agent can fix its game without reading internals.

   A check lists everything that reaches past the API.
   - In the engine, a reach-through fails the check.
   - In a prototype, it's allowed, and the list becomes the engine's to-do list: whatever a graduating prototype needed
     moves into the engine.

   Rationale: the engine is built once and used many times, so better internals raise the quality of everything built
   on it.

9. **Pin what agents know.** Use the version agents write correctly without documentation, checked by having one write
   against it cold. Pin it exactly and vendor it. Ban the stale APIs agents reach for out of habit. Upgrade when there's
   a reason, as its own change. Engine internals may use newer versions when that raises quality and the builder can use
   them well.

   Rationale: a release's age only approximates what agents know. With three.js the risk runs the other way: agents
   confidently write the WebGL-era API.

10. **Discovery first, hardening later.** Develop and test on one platform: the one the development environment runs on.
    Keep the device the human reviews on good enough to judge the idea, nothing more. Cross-platform work and hardening
    happen when a game goes to production, which pays for them.

    Rationale: most of the work is finding something worth shipping.

## Checks

Each thing the engine promises has a check. The checks run on every engine change, chosen by what changed:
- the manual's examples run and fit its budget;
- the API boundary holds;
- no banned APIs are used;
- vendored versions and checksums match;
- the determinism hash matches, with and without a renderer;
- no binary files exist outside the approved list.

A principle without a check drifts.

## Deviations and escalation

- **In a prototype:** deviate whenever it helps the idea, and note it in one line in the prototype's pitch. No approval
  is needed, except for binary assets (principle 4).
- **In the engine, a reversible call:** anything a revert undoes (code, design, a dependency, a doc). Make it now, in
  its own commit so it can be reverted alone, flag it in the PR, and log it. A human who disagrees reverts it; nobody
  waits.
- **In the engine, a call that is hard to undo:** one that reaches outside the repository or can't be taken back with a
  revert (deleting what others rely on, publishing, spending, a license). Escalate: say which principle, what you
  recommend and why, arm a wake-up timer for 15 minutes, and keep working on whatever doesn't depend on the answer;
  with nothing left, end your turn and let the timer bring you back. If it fires with no response, make your call in
  its own commit and continue. An answer that comes first cancels the timer. For the rest of that run, or until a
  human responds, report further conflicts without stopping.
- **Record:** every call made without a response, reversible or not, goes in the decisions log (date, principle, the call, why, the commit)
  and in the PR description. The log is never cleaned up.
- **A deviation that keeps winning** is a proposal to change this document.

Rationale: progress never stalls, and the worst case is a review, a change or a rollback.

---

## In this repository

my-3D2dge was deep in its development when the doctrine was adopted (v0.15.0). New work follows the doctrine; existing
code that departs from it was **grandfathered**: it stays as it is, by a decision recorded in `docs/DECISIONS.md` that
says why and what would reopen it. Gaps that are not grandfathered are **open**: closed when they surface, as the North
Star says. The owner reviewed what was grandfathered and kept it (D10): my-3D2dge differs from the front-runners on
purpose (pixel art drawn by code in the classic views, one HTML file that works anywhere), and where a difference has a
case, it is part of what the engine is.

### The two tiers here

- **Prototypes** are the Temporary labs (`docs/DECISIONS.md`, D2): an entry in the Temporary section of `src/labs.json`,
  with the date and the question it answers, and the sources only its page inlines. A change confined to prototypes
  merges without a version bump or a changelog line. Its pitch is its `labs.json` entry (what it is, the question, the
  links to try); a deviation goes there in one line. It may reach past the engine's API. It graduates by leaving
  Temporary, and then it is held to the engine tier.
- **The engine tier** is everything else: the engine and its agent edition, the starter games and genre kits (what
  models copy), Emberdeep (the game in production), the kept labs and demos, the mocap store, the tools and the docs.
  The rules in `CLAUDE.md` (versions, changelog, rebuild, checks) apply to it.

### Each principle here

| Principle | Here | Grandfathered or open | Checked by |
|---|---|---|---|
| 1 Agent-readable | The agent edition's header is the whole manual for coding agents: a complete game and the API, under a 10,000-token budget (8,952 at adoption). The API card, embedded in every single-file edition, is under 13,500 (12,217). The agent edition's sections start with greppable `// ---- N. NAME` banners, the full engine's with `/* ====` headers. | | `doctrine-check` (budgets), `agent-test` (the header's games run on both engines) |
| 2 Agent-operable | Emberdeep: `window.__ed`, deep links (`#depth-7`, `#gallery/...`), the Developer panel over the `TUNE` knobs. Labs: `window.__sw`, `__lab3d`, `?cam=` links. `tools/ed-play.mjs` scripts input. | **Open:** the engine gives games no links to a moment or live tuning of their own; Emberdeep built both. Move them into the engine when a second game needs them. | the suites drive every page through these handles |
| 3 Headless | Every suite runs in headless Chromium. `tools/check.mjs` plays a page and notes cheap-looking frames; `tools/filmstrip.mjs` records frame strips and `--compare` marks every pixel a change touched. Humans judge on the Vercel preview of each branch. | | `npm test` |
| 4 Assets | Stricter than the doctrine: no image, sound or font files; fonts are drawn by code. Motion capture is stored as readable key poses with its provenance. | Approved (D7): the pictures our tools draw for the docs (`docs/assets/`). | `doctrine-check` (assets) |
| 5 Deterministic | Under the harness: `filmstrip --seed` gives a virtual clock, seeded randomness, no sound, controller or GPU, and the same steps then give the same pixels. The 3D world's `SIM.run` gives the same hash on WebGPU, WebGL 2 and run again. Sound draws its own random numbers (v0.16.0), so sound on, off or muted never changes a run's. | **Grandfathered (D4):** the engine's loop splits each frame into equal substeps, and Emberdeep draws from `Math.random`. New gameplay code takes time only from `dt` and the game's clocks, and randomness only from `Math.random` or `E.rng`. **Open (D12):** replaying a session recorded on a device, built when the first bug seen there won't reproduce under the harness. | `determinism-test` (the same run twice is identical, pixel for pixel), the 3D labs' proof hash |
| 6 WebGPU, CPU gameplay | Gameplay never reads the GPU: the engine's WebGPU lighting only draws, and the 3D labs ban read-backs. | **Grandfathered (D3):** the engine draws with Canvas 2D, with WebGPU only for optional lighting. The 3D labs keep three.js's WebGL 2 fallback. New GPU code is WebGPU, never WebGL. | the 3D labs' banned-API check |
| 7 Common ground | Plain JavaScript, no dependencies in the engine or the games; tools are ES modules. | **Grandfathered (D5):** sources joined in name order into one shared scope, the build's `@inline` directives, the dense style. Every page ships as one self-contained HTML file. | |
| 8 Quality under the hood | The agent edition's API is a strict subset of the full engine's, compared name by name. Errors show in an on-screen box, and warnings for common mistakes start with `my-3D2dge:`. | **Grandfathered (D6):** the engine-private members already used outside the engine, by area. `rig._w` is public now as `rig.worldOffset(p)` (v0.16.0) and the starters use it; Emberdeep and the 3D labs keep the old name. | `doctrine-check` (boundary; `--todo` lists the to-do), `agent-test` (API subset) |
| 9 Pin what agents know | The engine and games have no dependencies. The 3D labs pin three.js r182 and Rapier 0.19.3, vendored with checksums, chosen for what models know (D9). | | `vendor-3d --check`, the 3D labs' banned-API check |
| 10 Discovery first | Development and tests run in headless Chromium on Linux (cloud sessions); the owner reviews each branch's Vercel preview on a phone, and the games are kept good enough there. | | |

**The North Star's measures** (the time from a brief to a playable link, and how often a fresh agent's first build
runs) are **open**: nothing records them yet. `tools/agent-test.mjs` checks that the manual's own games run; it doesn't
yet hand a brief to a fresh agent.

### The checks here

- `node tools/doctrine-check.mjs`: assets, the manuals' budgets, the API boundary and the decisions log. Quick, no
  browser; `npm run test:changed` and `npm test` always run it, beside the version and syntax checks.
- `node tools/determinism-test.mjs`: Emberdeep and a starter game, recorded twice under the harness, must match pixel for
  pixel. It runs when the engine, Emberdeep, the starters or the harness change.
- The suites that already held a principle: `agent-test` (the manual and the API subset), `lab3d-test` and
  `stress-world-test` (banned APIs, vendored checksums, the proof hash on both backends), and the rest of `npm test`.

### Decisions and escalation here

The decisions log is `docs/DECISIONS.md`. A call made without a response is also named in the pull request's
description. A deviation in a prototype goes in one line in its `labs.json` entry instead.

Reversible calls are made at once (D13); the timer is for the rest. The 15-minute timer, in a cloud session (D11): `send_later` (the claude-code-remote tools) with `delay_minutes: 15`
delivers a message back into the same session, even after the turn has ended; if the human answers first,
`delete_trigger` cancels it. Where no such tool exists, ask, keep working, and make the call when the work reaches the
point that needs the answer.
