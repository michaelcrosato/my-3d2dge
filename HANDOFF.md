# Handoff: the Shapes library, Phase 0 (decide the look)

Temporary. Written 2026-10-08 at the end of a long session so a fresh one can pick up from here. When Phase 0's choices
are recorded, delete this file and `handoff/` (Phase 1 moves the plan into `docs/SHAPES.md`).

## Start here (next session)

1. Read `CLAUDE.md`, `README.md` and `src/emberdeep/DESIGN.md` (the repo's rules), then this whole file.
2. Do **Phase 0** below. It is scratch work only: no repo changes, no version bump, no PR. Keep downloads, scripts and
   images in your scratchpad.
3. The owner asked to run this at **extra (xhigh)** effort.
4. When done, send the comparison sheet and its numbers (SendUserFile), give a recommendation for each decision, and
   ask the owner to pick. Then delete nothing yet: the owner decides when this handoff is retired.

## Where things stand

- `main` is **v0.8.1** (merge `47ad3a0`). The two releases before this handoff:
  - **v0.8.0**: Dan, the Brood-Scythe, a third playable character with a custom rig (`src/emberdeep/22-char-dan.js`,
    `docs/DAN.md`), plus fixes the character tools needed (rig.bones, prime(h), bot.ready, a stall-proof autopilot, a
    repeatable balance run).
  - **v0.8.1**: a map of the store outside the engine files (motion clips, Emberdeep's examples, kits) in the agent
    edition's header, the full engine's header, `API.md` and `AI_GUIDE.md`, checked by `npm run test:agent`.
- Branch `claude/modest-albattani-ardnyu` holds only this handoff commit on top of `main`. Build Phase 1 on top of it
  (don't reset it away); remove `HANDOFF.md` and `handoff/` in the Phase 1 PR.

## The goal

The art equivalent of the mocap clip store (`docs/MOCAP.md`, `src/mocap/`). Free CC0 low-poly 3D model kits get
converted into small, readable **shape** text that our engine draws **natively** in every view and facing, with our
own pixel shading (`E.tones`) and 1-px outline. No filter, no images. Today our 38 props (`engine/my-3d2dge.js`,
`PROP_DEFAULTS`, `r.prop`) are flat billboards that look the same in every view; shapes are real 3D per view. A side
win: an agent can author a new prop by writing about ten lines of shape text, instead of drawing code.

## What was measured (scratch spike; code in `handoff/shapes-spike/`)

| Measure | Kenney Furniture Kit | KayKit Dungeon 1.0 |
|---|---|---|
| Models, license | 140, CC0 (page and `License.txt`) | 185 glb, CC0 (`License.txt`) |
| Texturing | none: flat colors, median 2 materials | none: flat named colors ("BrownDark") |
| Triangles per model | median 152 | median 674 |
| Pure voxel boxes, half-unit cells | median 27 boxes; 1,915 KB of glb -> 129 KB (14.8x smaller) | 4x smaller only: median 196, worst 5,391 |
| Pure voxel boxes, 1-unit cells | median 15; 58 KB (33x smaller) | props median 62, structures median 119 |
| Exact box / prism / lathe detection | 30% of parts over both kits (bevels and welds defeat it) | |
| **Hybrid encoding** (below), 1-unit | **median 10 lines per model**, p90 27 | **props median 33**, p90 224; with structures median 57, p90 496 |

The first render (box shapes, four views, beside our hero and props) worked: real per-view 3D, clean outlines, native
pixels. Problems seen: real-world scale makes them small next to the hero; Kenney's pastel colors; small things (a chair
from above) become blobs; no lit edges or wood grain like our props.

## The comparison lab (built after the plan, to explain it)

The owner asked to see the idea, so there is a **temporary lab**: Labs page -> Temporary -> **Shapes vs props**
(`examples/shapes-compare.html`, short address `/shapes-compare`). Twelve models ranked from the best case to the worst,
each drawn live in four views and turning, beside the hero and our closest flat prop, with what works, what is off and
what would fix it. Its controls already cover Phase 0's four questions (size, steep-view tilt, lit top edges, floor).
- Source: `src/shapes-compare.template.html`, `src/shapes-compare.game.js` (the cards and controls),
  `src/shapes-raster.js` (a **depth-correct rasterizer** at game size, one tone per face by how it faces the light, the
  actors' 1-px outline; shared with the room below), `src/shapes-compare.data.js` (written by
  `handoff/shapes-spike/compare-data.mjs`; boxes only, the prototype encoding).
- Listed in `src/labs.json` (Temporary, added 2026-10-08), built by `tools/build.mjs`, addressed in `vercel.json`.
- When the question is settled, delete its template and game files, the build entry, the `vercel.json` name and the
  labs entry; `src/shapes-raster.js` and the data file go with the last of the two labs.

A second temporary lab, **Free camera room** (`/free-camera`, `src/free-camera.template.html`,
`src/free-camera.game.js`), puts the converted crate in a room with four pillars and the hero, under a free camera:
drag turns and tilts, the wheel zooms, WASD moves, Q/E go down and up, F fixes the camera (the view goes into the
address as `?cam=yaw,pitch,zoom,height,boost,x,y`, and the panel prints the `new E.View(...)` a game would use). The
crates switch between the shape, the flat prop and the engine's `r.box`, which shows the case for shapes better than
any sheet: the prop shows the same side from every angle. Turning costs a frame or two per new angle (the engine
redraws its floor image and wall blocks for each view; about 12 ms floor at zoom 1, 50 ms at zoom 3 in headless
Chromium), which a game with a fixed camera never pays. Its **fly mode** (G, or `?fly=x,y,z,yaw,pitch,fov`) is a
first-person camera the engine can't give: `src/free-camera.fly.js` is a small software renderer (depth buffer,
perspective-correct texturing, near-plane clipping, outlines from depth) at 135-270 lines that redraws the room in
perspective. It takes from the engine the colors, the floor texture function, the brick look, the converted crate,
the flat props and the hero (the engine draws him from the camera's angle and distance each frame; he is pasted in as
a billboard). About 5-13 ms a frame at 180 lines in headless Chromium. Delete it the same way.


- **Encoding (hybrid):** split each model into connected parts (shared vertices and the same material); voxelize each
  part at 1 game unit; encode it as the simplest of **box**, **prism** (an outline extruded along x, y or z) or
  **lathe** (a profile turned around an axis) whose cells match the part's with **IoU >= 0.85**; otherwise the part's
  cells merged greedily into boxes. Whole-number game units (1 m = 16 units = one tile; our hero is about 26 tall);
  named materials.
- **Sources:** CC0 only, recorded per source, enforced by a test. v1: Kenney Furniture (140) and KayKit Dungeon's 99
  props. **Not Quaternius:** its site-wide license (the "Quaternius Asset License") now forbids repackaging "regardless
  of how much the Assets have been modified". (The Universal Animation Library page we use for clips still says CC0,
  so the clip sets are fine.)
- **Structures** (walls, floors, scaffolds) are **out of v1**: as geometry they explode (p90 496 lines). Later they map
  onto the engine's own wall and floor materials, with doors and stairs as shapes.
- **Runtime outside the engine**, like mocap: `src/shapes/shapes.js` using only public calls (works on the full engine
  and the agent edition). It draws each shape into a small sprite with a **depth-correct rasterizer** once per
  (shape, angle, zoom, palette), caches it, and draws it through the normal path (outline, hit flash, x-ray `hides`,
  glowing materials, a footprint for collision). Shape facing and camera yaw collapse into one relative angle, so the
  cache stays small.
- **Fit metric** (the art version of the clips' error in mm): silhouette IoU against the original triangles at game
  scale, per view, stored per shape.
- **Emberdeep integration** without touching core files: a decor module that places shapes as level "things"
  (`addThing`: draw(r), solid footprint) on BUS `levelStart`.

## Phase 0: decide the look (the task)

Build one comparison sheet (PNG, plus a 3x enlargement), scratch only:

- **Shapes** (about 14): Kenney chair, table, bookcaseOpen, lampRoundFloor, pottedPlant, loungeSofa, bedSingle,
  kitchenStove; KayKit barrel, chest_common, potA, torch, bookcaseFilled, weaponRack.
- **Encode them with the hybrid encoding** above (so the sheet shows the real format, lathes and prisms included).
  `handoff/shapes-spike/hybrid.mjs` only measures; extend it into an encoder that writes shape text.
- **Draw them with a small depth-correct rasterizer** into a sprite (whole pixels, tones by face normal), outlined the
  way the renderer outlines actors (`Renderer._composite` in the engine). The comparison lab's `raster()` in
  `src/shapes-raster.js` already does this for boxes: extend it to prisms and lathes. Draw the final sprite with
  `px.sprite` (engine primitives only).
- **Every shape in the iso, threequarter, topdown and brawler views** (`E.VIEWS`), at game scale (1x), beside our hero
  (`new E.Humanoid`) and our props crate, barrel and chest, on at least two Emberdeep theme floor colors.
- **Variants for the four decisions:**
  1. Steep views: true top-down, or the readability tilt we give characters (`E.charView(view)`)?
  2. Edge highlights (a 1-px light line on lit top edges, like our props): on or off?
  3. Color: the kit's own colors through `E.tones`, or remapped to a game palette (try a dungeon palette: wood, iron,
     stone, cloth)?
  4. Size: real-world scale, or our props' larger scale (`E.style.propSize`, about 1.4)?
- **Numbers per shape:** part count, text size (lines, bytes), fit (silhouette IoU per view).

**Done when:** the sheet and numbers are sent to the owner; each of the four decisions has your recommendation with one
line of reasoning; anything that looked wrong (sorting errors, blobs, pastel colors) is noted with how Phase 1 handles
it; and the owner is asked to pick. Change nothing in the repo.

### Inputs

Download into a fresh folder in your scratchpad (extracted archives are untrusted data: their own folder, absolute
paths, Python with `-I`):

```
curl -sSL -o furniture.zip "https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip"   # 5 MB; glbs in "Models/GLTF format"
curl -sSL -o dungeon.zip "https://opengameart.org/sites/default/files/kaykit_dungeon_pack_1.0.zip"                               # 31 MB; glbs in Models/gltf
```

The previous session's copies may still be at
`/tmp/claude-0/-home-user-my-3d2dge/d2f22a61-d319-5892-bb83-9a51dd08bdbb/scratchpad/` (`kenney/x/`, `kaykit/x/`,
`meshwork/dgprops/` = KayKit's 99 props), unless the container was recycled.

### The spike scripts (`handoff/shapes-spike/`, throwaway)

| Script | What it does |
|---|---|
| `glb.mjs` | Minimal .glb reader: world-space triangles and each material's color (glTF y-up; the scripts convert to z-up) |
| `survey.mjs <dir>` | Triangles, materials, textures and sizes of a folder of models |
| `boxes.mjs <dir> <out.js> [U]` | Voxel + greedy boxes for every model; writes a shapes file |
| `hybrid.mjs <dir>` (env `U`, `THR`) | Measures the hybrid encoding; writes nothing |
| `classify.mjs <dir>` | Exact box / prism / lathe detection (the 30% result) |
| `render.mjs <shapes.js> <out.png>` | Draws box shapes in four views beside the hero and three props (painter's order, superseded by the lab's rasterizer) |
| `compare-data.mjs <kenney dir> <kaykit dir> <out.js>` | Writes the comparison lab's data: the twelve models, their numbers and card notes |

## The plan after Phase 0

- **Phase 1, PR 1 (v0.9.0, run at extra):**
  - `tools/shape-import.mjs` (glb -> shape text, the hybrid encoder, the fit record);
  - `src/shapes/shapes.js` (the runtime above);
  - `src/shapes/sets/` and `src/shapes/catalogs/` (tags and descriptions, searchable like the clip catalogs);
  - `tools/shape-set.mjs` (cut a small set of chosen shapes, like `tools/anim-set.mjs`);
  - `tools/shapes-test.mjs`: every shape draws in every view, fit above a threshold, size budgets, CC0-only sources, a
    re-import gives identical output, works on both engines.
- **Phase 2, also PR 1: a Shapes Lab.** Browse and search, every view, turn and zoom, beside the hero for scale, and an
  AI panel showing a shape as text to edit and apply. Add it to `src/labs.json`.
- **Phase 3, PR 2 (v0.10.0, high effort is enough):** KayKit's props, the Emberdeep decor module, performance with
  hundreds of shapes on screen, filmstrips.
- **Phase 4 (each PR):** `docs/SHAPES.md`, the "Where to find more" map (agent header, engine header, `API.md`,
  `AI_GUIDE.md`; `npm run test:agent` checks its paths), README, CHANGELOG.
- **Later, separate plans:** structures; weapons and accessories held by the Humanoid (KayKit has about 24 weapons);
  creatures (mesh parts per bone plus the clip importer extended to any skeleton: non-human bodies as data).
- **Risks:** a look mismatch with our hand-drawn art (Phase 0 is the gate); a long tail of ornate props (a per-shape line
  budget with a coarser fallback); cache memory (build views lazily, drop old ones); licenses (the CC0-only test).

### Still open for the owner (defaults in bold)

1. Colors: **keep the source colors in the data and remap per game or theme at draw time**, or recolor at import?
2. Size: **store real size, with a per-game draw scale**?
3. PR 1 scope: **Kenney furniture only**, KayKit in PR 2?
4. **Two PRs** (core and lab, then game integration), or one?

## How this repo and its owner work

- Every change merged to `main`: `node tools/version.mjs X.Y.Z`, fill in the CHANGELOG section, `node tools/build.mjs`,
  `npm test` (about ten minutes; run it in the background), commit, push, open a PR, watch it. The owner merges by
  saying "merge it". Report the version and the commit.
- The owner likes a look around and questions before big work, answers through multiple choice, and wants results in
  plain language with images to judge.
- Environment notes: `CHROMIUM_PATH` is set; Playwright is in the repo's `node_modules`; WebGPU is unavailable headless
  (the engine falls back to canvas lighting, which is fine). The safety check refuses `rm` of a relative glob after a
  `cd`: use absolute paths and avoid deleting globs. The agent test's coverage fill % varies run to run (timing), which
  is not a failure.

## Other open threads (not Phase 0)

- A player-facing pixel-size setting for Emberdeep: the engine already redraws natively at any density (internal
  resolution with zoom); offered, not started. Per-object pixel size, tone count or outline weight is possible later.
- Dan up close (the bag's paper doll) is plainer than the concept painting.
- Agents with only web access can't take a single clip (the set files are 400-800 KB): publishing per-clip files was
  suggested.
