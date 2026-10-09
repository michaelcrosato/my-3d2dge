# Handoff: the 3D world becomes its own engine

The 3D world started here as two temporary labs. It is leaving to grow into a separate game engine in its own
repository, because its physics and several of its principles now differ from my-3D2dge's. This document is the
brief for that new repository: what to take from this one, what each piece depends on, which principles carry over
and which don't, how to stand it up, and how this repository removes the labs afterwards.

Written against **my-3D2dge v0.14.0, commit `e37e4ee`** (2026-10-09). Every path below is at that commit:
`https://github.com/michaelcrosato/my-3d2dge/tree/e37e4ee/<path>`. Read `docs/LAB-3D.md` there too: it records the
decisions, trade-offs and lessons behind both labs, and this document doesn't repeat them.

## The two labs

| | Stress test: 3D world | 3D world lab |
|---|---|---|
| Page | `/stress-world` (`examples/stress-world.html`) | `/lab-3d` (`examples/lab-3d.html`) |
| Sources | `src/stress-world/` (9 parts, about 2,600 lines), `src/stress-world.template.html` | `src/lab3d/` (7 parts, about 1,000 lines), `src/lab3d.template.html` |
| Test | `tools/stress-world-test.mjs` | `tools/lab3d-test.mjs` |
| Since | v0.13.0 | v0.9.0 |
| What it is | The stress test rebuilt as a 3D game: a hall written as text, galleries and stairs, Rapier bodies for every monster, a hero that walks, dashes and jumps, launches, waves, every camera, filters, a benchmark | A stone room, crates to knock about, the hero, a mocap figure and Dan; Card and Puppet side by side; the first proof that the rigs work in three.js and Rapier |

**Start the new engine from the stress-world lab.** It is the more complete game and the newer code: it has the
physics, the hall format, the cameras, the filters, the instanced puppets, the card atlas, the warm-up and the
benchmark. The 3D world lab adds three things the stress-world lab lacks, to be ported in early:

- **Mocap clips** driving a rig (`Mocap.load`, `Mocap.drive`) in both Card and Puppet looks (`src/lab3d/40-characters.js`).
- **A non-human body**: Dan, Emberdeep's custom rig, as a card and as a puppet built from parts listed as data.
- **Puppet bodies as data**: `['limb', 'hipL', 'kneeL', 1.45, 1.2, 'pants']`-style part lists, a cleaner way to add
  a body than the stress-world lab's hand-written `humanParts`.

## What carries over and what changes

Kept from my-3D2dge:

- **All art is made by code.** No image, model or sound files, and no model imports. Geometry is built in code;
  textures are generated pixel by pixel (`bake(fn, w, h)` in `src/stress-world/00-setup.js`).
- **Agents can read it.** Each part is a small file with a header in the agent edition's style. Agents never read
  the vendored libraries.
- **Gameplay never reads the renderer.** The game is stepped with the player's controls as its input. The same inputs
  give the same state and the same hash on WebGPU, on WebGL 2, and with no renderer at all. Randomness that gameplay
  reads is seeded (`SIM.rnd`).
- **Levels are ASCII text.** The colliders, floor heights, walkable grid and meshes all come from one map.
- **The engine's units, z up.** 16 units = 1 metre = one tile. Rapier runs in those units (length unit 16, gravity
  −480 along z). three.js gets metres, y up, only at the drawing's edge (`toThree`).
- **The animation system.** The rigs, `E.MOVES`, `E.Attack`, `E.Combo`, the particle emitters and the pixel font,
  used unchanged.

Where it diverges (the reasons for the split):

| | my-3D2dge | The new engine |
|---|---|---|
| Dependencies | None. One file, no network. | three.js r182 and Rapier 0.19.3, vendored and pinned |
| Loading | One HTML file that works from a double-click | ES modules through an import map: served, not double-clicked |
| Physics | Its own kinematic collision (`TileMap`, `Body`, `Platformer`) and code that separates crowds | Rapier: a character controller for the hero, dynamic bodies for monsters and props; crowds resolved by the physics; knockback is momentum |
| World | Height is a property of tiles; views are fixed classic projections | Real 3D: galleries, stairs, jumping, perspective and free cameras (chase, first person, fly) |
| Drawing | Pixel-snapped canvas primitives; never anti-aliased | GPU meshes, toon node materials, outlines from inverted hulls, TSL post filters (cel, pixel, bloom, FXAA); pixel-art is an optional pass |
| Characters | Drawn by the engine | A **Card** (the engine draws the rig onto a camera-facing card) or a **Puppet** (3D parts on the rig's joints) |
| Time step | Fixed substeps of about 1/120 s | Equal steps of at most 1/60 s, then one drawing |

## What to take

### 1. The game

From `src/stress-world/` (the base), copied as they are:

| Part | What it holds |
|---|---|
| `00-setup.js` | imports, units, `toThree`, the renderer (WebGPU, or WebGL 2 with `?backend=webgl`), `bake`, toon bands, `objMat`, outline materials, `hashNumbers` |
| `10-hall.js` | `LEVEL` (64 × 44 ASCII), `floorH`, `topH`, `solidTile`, the flow field, `hallColliders`, meshes, braziers, the fixed set of lights |
| `20-sim.js` | the game on Rapier: hero, monsters, combat, waves, props, shots, particles; `SIM.step(dt, ctl)`, `SIM.run(n)`, `SIM.hash()` |
| `30-crowd.js` | `Batch` (instanced parts), Puppet parts, the Card atlas, crates and barrels, `drawCrowd` |
| `35-effects.js` | telegraphs, trails, bolts, particles, the pixel-font overlay |
| `40-cameras.js` | every camera and what the controls mean in each; `?view=`, `?cam=`, `?cam3=` links |
| `45-filters.js` | Clean, Comic cel, Pixel, Bloom, FXAA (TSL, with an MRT mask for characters versus the hall) |
| `50-frame.js` | the loop, resolution, warm-up |
| `60-panel.js` | the panel, metrics, presets, benchmark, `window.__sw` |

From `src/stress-world.template.html`: the page, its panel and the import map.

From `src/lab3d/` (to port in): `40-characters.js` (mocap figure, Dan, puppet parts as data, the blade ribbon), and
from `20-world.js` and `10-materials.js` whatever the stress-world lab doesn't already have.

### 2. The libraries

`vendor/three-0.182.0/` and `vendor/rapier3d-simd-compat-0.19.3/`: copy them, or fetch them again with
`tools/vendor-3d.mjs` (it records sha256 checksums in each `VERSION.json`; `--check` verifies them). The versions are
pinned on purpose: they are releases the models know well (`docs/LAB-3D.md`, "Why these versions"). Upgrading is a
deliberate change.

### 3. The animation system (from my-3D2dge)

Today both pages inline the whole engine (`engine/my-3d2dge.js`, 374 KB, a classic script that sets
`window.My3D2dge`). The 3D world lab also inlines the mocap player and two clip sets, plus Dan's body. Vendor these
the same way as the libraries: copied from commit `e37e4ee` into `vendor/my-3d2dge-0.14.0/`, with a `VERSION.json`
that records the source commit and checksums. Pulling a newer engine is then a deliberate change.

| File | Size | Needed for |
|---|---|---|
| `engine/my-3d2dge.js` | 374 KB | everything: rigs, moves, particles, font, textures |
| `src/mocap/readable.js`, `src/mocap/mocap.js` | 29 KB, 20 KB | playing clips on rigs (`Mocap.load`, `Mocap.drive`) |
| `src/mocap/sets/hero.js` | 75 KB | the hero's clips |
| `src/mocap/sets/cmu.js` | 722 KB | CMU clips (optional; take only the clips you need with `tools/anim-set.mjs` here) |
| `src/emberdeep/22-char-dan.js`, first section only | 23 KB | `DanRig` (the build's `@inline-head` cuts at the second `/* ====` banner) |

**The contract this depends on.** Everything below is what the two labs use from the engine. If the new engine
upgrades its copy of my-3D2dge, this list is what to check. Gather all of it behind one adapter module so an upgrade
touches one file.

- Public API: `E.Humanoid`, `E.Blob`, `E.MOVES`, `E.Attack`, `E.Combo`, `E.Particles`, `E.Input`, `E.font.text`,
  `E.tex.flagstone`, `E.View`, `E.VIEWS`, `E.style.trans`, `E.style.charPitch`, `E.px.poly`, `E.V`, `E.V3`, and the
  helpers `E.hash`, `E.noise`, `E.rng`, `E.hex`, `E.shade`, `E.tones`, `E.ease`, `E.inArc`, `E.approach`,
  `E.approachAng`, `E.angDiff`, `E.clamp`, `E.lerp`, `E.TAU`.
- Rig fields: `x`, `y`, `z`, `facing`, `update`, `draw(g, ox, oy, view)`, `attack`, `pose`, `play`, `active`, `J` (the
  joints, including `head`, `handR` and `bladeDir`), `o` (the build: `limbW`, `torsoW`, `headR`, `bladeLen`, `style`,
  `skeleton`, `cape`), `C` (the palette), `capeL`.
- **Private rig fields, the fragile part:** `rig._w` (local to world; `30-crowd.js` copies its arithmetic),
  `rig._cheat` (the 2D three-quarter cheat, zeroed while posing puppets), `rig._offsets` and `rig._lastView`. The
  puppet parts' sizes also mirror the engine's private `_drawHD`. Any change to these in my-3D2dge silently changes
  how puppets look.
- Mocap: `Mocap.load`, `Mocap.drive`, `window.MOCAP.HERO`, `window.MOCAP.CMU`. Dan: `window.DanRig`, `DanRig.COL`.

The stress-world lab doesn't import the 2D stress test's code (`src/stress.game.js`). Its AI and hall layout were
ported into `20-sim.js` and `10-hall.js`, so nothing else from `src/` is needed.

### 4. The tools

| Tool | Take |
|---|---|
| `tools/build.mjs` | Only what the two pages use: `{{KEY}}` variables, `@inline <file>` (a classic script), `@inline-module <dir>` (a folder's parts joined in name order into one `<script type="module">` with a shared scope), `@inline-head <file>`. About 30 lines; rewrite it for the new repo. |
| `tools/stress-world-test.mjs`, `tools/lab3d-test.mjs` | Both, merged into the new engine's test. They hold the hard-won parts: a local server that serves the repo as Vercel does; the **stand-in canvas context for headless WebGPU** (headless Chromium's WebGPU loses its device as soon as it shows a frame, so the test reads frames back itself); the banned-API check; the proof hash on both backends; the check that no GPU pipeline is built mid-fight. |
| `tools/vendor-3d.mjs` | As is; extend `LIBS` with the vendored my-3D2dge files. |
| `tools/check.mjs`, `tools/filmstrip.mjs` | Optional. They are written for the 2D pages, but the pattern (seeded virtual time, screenshots, frame-by-frame strips) is worth carrying. |
| `.claude/hooks/session-start.sh` | As is (npm install, `CHROMIUM_PATH` for cloud sessions). |

### 5. The knowledge

- `docs/LAB-3D.md`: the decisions (renderer, physics, pinned versions, the GPU rule, all art by code), Card versus
  Puppet, the agent-readability rules, and the three.js r182 lessons.
- The changelog entries for v0.9.0 and v0.10.0 to v0.14.0 (`CHANGELOG.md`): what was built and measured, in order.
- The lessons that cost the most, to keep in the new engine's rules:
  - **No stalls mid-fight.** A material's first draw builds its shader and pipelines (tens of milliseconds). Draw
    everything once, empty, before the fight and again after a filter change. Share one material per effect pool.
    Keep the card atlas as fixed pages that share one shader.
  - **three.js r182 instancing bug.** An `InstancedMesh` with more than 1,000 instances marked `DynamicDrawUsage`
    never uploads its changes: keep the default usage and mark the update ranges each frame. With 1,000 or fewer, the
    matrices live in a uniform buffer named after the mesh, so each such mesh made at run time compiles its own shader.
  - **Agents write old three.js.** `WebGLRenderer`, `ShaderMaterial`, `EffectComposer`, `onBeforeCompile` and the
    add-ons don't work with `WebGPURenderer`. The banned-API check fails on them; keep it.
  - **The GPU rule.** No WebGPU-only features (compute shaders, storage buffers), materials only in TSL or node
    materials, nothing read back from the GPU into gameplay.
  - **Measured cost** (headless Chromium, game step only): about 1 ms with 100 monsters, 5.6 ms with 1,000 (2.6 ms of
    it physics), 33 ms with 5,000 crowding the hero (21 ms physics).

## Standing up the new repository

1. **Seed.** Create the repo with the layout below. Copy the files listed above from commit `e37e4ee`. History doesn't
   come along; if it's wanted, `git filter-repo --path src/stress-world --path src/lab3d --path vendor ...` on a clone
   keeps the history of those paths.
2. **Build and serve.** The new `build.mjs` writes `examples/stress-world.html` (renamed to the new engine's first
   page) with paths that work at the repo's root. Check that it opens from a local server on both backends.
3. **Tests green.** Port both tests. Pass criteria: the vendored checksums match, the banned-API check passes, the
   proof hash is identical on WebGPU and WebGL 2 and when run again, no pipeline is built mid-fight, every camera and
   filter draws.
4. **Port the 3D world lab's pieces:** the mocap figure, Dan, puppet parts as data.
5. **Deploy** its own Vercel project, so that this repo's links can point there.
6. **Then become an engine.** Split the game (the hall, the waves, the panel) from what is reusable (the renderer
   setup, the Rapier world and controller, Batch, Card atlas, cameras, filters, the frame loop), the way my-3D2dge
   splits its engine from its games. That design is the new repository's to write.

A starting layout:

```
vendor/three-0.182.0/                 three.js r182 (copied, checksums)
vendor/rapier3d-simd-compat-0.19.3/   Rapier 0.19.3 (copied, checksums)
vendor/my-3d2dge-0.14.0/              the engine, the mocap player and sets, Dan's body, VERSION.json (commit e37e4ee)
src/world/                            the stress-world parts (00-setup ... 60-panel)
src/world.template.html               the page and its import map
tools/build.mjs  tools/test.mjs  tools/vendor.mjs
docs/DESIGN.md                        start from docs/LAB-3D.md
CLAUDE.md  README.md  CHANGELOG.md  package.json (devDependencies: playwright)
```

## Afterwards: removing the labs here

Once the new repository builds, passes its tests and is deployed, remove the labs from my-3D2dge in one change, the
way v0.14.0 retired the 3D-drawn stress test. It's a minor version (removing a feature).

Delete:

- `src/stress-world/`, `src/stress-world.template.html`, `src/lab3d/`, `src/lab3d.template.html`
- `tools/stress-world-test.mjs`, `tools/lab3d-test.mjs`, `tools/vendor-3d.mjs`
- `vendor/` (all of it)
- `examples/stress-world.html`, `examples/lab-3d.html` (the build stops writing them; delete the committed copies)

Edit:

- `tools/build.mjs`: the two build entries (lines 41–46), and the `@inline-module` and `@inline-head` handlers
  (only these two templates use them).
- `tools/test-run.mjs`: the `lab3d` and `stress-world` suites.
- `package.json`: the `test:lab3d`, `test:stress-world` and `vendor:3d` scripts.
- `vercel.json`: `lab-3d` and `stress-world` in the page rewrite. Point the `/stress-3d` redirect, and new ones for
  `/stress-world` and `/lab-3d`, at the new engine's site so old links keep working.
- `src/labs.json`: the two Temporary entries. Optionally add a kept link to the new engine's site.
- The 2D stress test: the note in `src/stress.template.html` (line 172) and the `toWorld` link in
  `src/stress.game.js` (line 1142) point at the new site, or go.
- `CLAUDE.md`: the `vendor/` rule.
- `docs/LAB-3D.md`: replace with a short note saying where the 3D world went and when, or delete it and say so in
  the changelog.
- `docs/HANDOFF-3D-WORLD.md` (this file): delete it, or keep it as the record of the split.

Then `node tools/version.mjs 0.X.0`, fill in the changelog (**Rendering**, **Tools**, **Docs**), `node tools/build.mjs`
and `npm test`. Check that `git grep -iE 'lab-3d|lab3d|stress-world|rapier|three\.js|vendor/'` finds only the
changelog and the redirect.

## Decisions for the owner

- **The new engine's name** and repository.
- **History:** a clean start (simplest), or `git filter-repo` to keep the labs' history.
- **The engine copy:** vendor my-3D2dge at v0.14.0 as recommended above, or extract only the animation system (the
  rigs, moves, particles and font) into a smaller module now. Vendoring is faster and safe; extracting comes later,
  when the new engine knows what it needs.
- **Mocap:** whether the CMU set (722 KB) comes along, or only the hero's clips.
- **Other labs:** the free camera room (`/free-camera`) has a fly mode on a small renderer of its own, without three.js
  or Rapier. It is not part of this split unless decided otherwise.
