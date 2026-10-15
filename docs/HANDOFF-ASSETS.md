# Handoff: the asset store (objects, materials and pictures agents can make and import)

The plan for a format, tools and a library that let agents add art to games as text: objects, surface materials and 2D
pictures, written by hand or translated from public libraries. Made on 2026-10-11 against v0.25.0 (`f3d9e8d`), and
updated on 2026-10-14 (v0.34.2) with the owner's answers (section 10) and Phase 3b, the 3D engine. It is for the agent
that implements it. It is temporary: when the work lands, fold what lasts into `docs/ASSETS.md` and
`docs/ASSET-IMPORT.md` and delete this file, as v0.14.1 and v0.22.0 did with finished plans.

**Verdict: go, behind a gate.** Planning included a probe (section 3.7): eight objects written as 71 to 330 characters
of data each, drawn by a small renderer in every view and facing with our own shading.
- Each object read as itself in every view.
- Five of them have a flat prop to compare against: crate, barrel, pot, rock and pine. Each looked at least as good
  as its prop, and unlike the prop it was right from every side.

Phase 0 rebuilds that probe properly and ends at a gate with kill criteria (section 7). If any of them holds, stop and
report instead of building the rest.

## Read this first

- Read `CLAUDE.md`, `DOCTRINE.md` and then this file. `docs/MOCAP.md` is the precedent: the same idea for motion,
  shipped and tested. This plan copies its conventions on purpose (one readable format, provenance, catalogs, ledgers,
  sets cut per game, a lab, tests that check the manuals' paths).
- Run it at **extra (xhigh)** effort (section 11), one phase per pull request, in order. The prompt is in section 12.
- Engine work goes into the **full engine only**. The agent edition gets stubs that warn once, as it does for props
  (A:3488-3489), plus one line in its map. `npm run test:agent` keeps it a subset.
- The manuals, counted exactly at v0.34.2 (`gpt-tokenizer`, a dev dependency since D28):
  - the agent edition's header: 9,729 of 10,000 tokens (271 left);
  - `API.md`: 14,543 of 15,000 (457 left);
  - `API-INDEX.md`: 35,697 of 40,000 (4,303 left: about 100 names at its mean of 38 tokens a line).

  Detail goes into the new `docs/ASSETS.md`, which gets its own budget, and into the index; each card gets one line.
- Line numbers are as of v0.25.0, and v0.26.x moved some engine lines, so search by name. `F:` is
  `engine/my-3d2dge.js`; `A:` is `engine/my-3d2dge-agent.js`.
- Each phase takes the next minor version when it merges (other work may merge in between). Section 14 logs where
  the work stands.

## 1. Why now

| Evidence | Where |
| --- | --- |
| **The look is the open threshold theme.** All three benchmark games scored 6/10, "short of the PS1/N64 bar". The judge named flat two-tone pines, unshaded foliage, thin shadows, three-quarter walls stacking into flat planes, and small, lightly shaded figures. | `docs/FEEDBACK-LOG.md` F2.2, F3.2, F4.2 |
| **Builders spend output tokens on art.** Vesper put 14.5k of its ~50k tokens (29%) into facades, cached detail drawing, dressing and floors (part of that is level layout). | F1 |
| **Builders read the source for asset names**: prop and backdrop presets, texture names, hats and hoods. | F2.1, F3.1 |
| **The index misleads on the same names.** Four of its lines show another name's documentation: `E.px` (:118), `new E.Lighting` (:278), `new E.Blob` (:551) and `E.tex` (:637). `E.Backdrop.presets` (:873) lists a "sunset" preset that doesn't exist (it is "dusk"). | `API-INDEX.md` |
| **Our own game shows the cost.** About a third of Emberdeep, ~7,700 of its 24,345 lines, is art code, with four flame painters, two cylinder kits and three capsule-limb painters. It adds its 9 wall faces and 8 roofs by patching two private engine methods (`_facePattern`, `_roofPattern`), both still on the grandfathered list. | `src/emberdeep/51-themes.js:349-370`; `tools/doctrine-check.mjs:80` |
| **Most art families are closed.** Games can't add their own: <ul><li>38 props, one `switch` case of dense drawing code each (F:5797-5890), 236 to 480 characters apiece</li><li>8 wall faces and 6 roofs (F:4183-4244)</li><li>13 platform tile styles (F:4626-4748)</li><li>9 backdrop layer kinds</li></ul>Only `floorTex`, `decorate(face)`, `E.sprite` rows and backdrop specs are open. Unknown face, roof and tile-style names fail silently. | engine |
| **Props are billboards.** A prop shows the same picture in every view and facing, so a crate seen from straight above still shows its front. The engine's promise is one game in every view. Emberdeep's best objects project solids per view instead (the town's stash chest, waystone and `treeThing`). That is why its stash chest looks solid while its distant pines, flat props, don't. | F:5758-5770; `src/emberdeep/56-town.js:227-249, 375-425, 1528-1548` |

## 2. What exists, and what stays

The owner's rule for this work: where a part of the framework is already established, build on it, and don't change it
for the sake of it.

| Family | Today | In this plan |
| --- | --- | --- |
| `E.tones` / `E.ramp` | five hue-shifted shades of a color (F:205-224) | **kept**: it shades every asset |
| `E.sprite` | rows of characters plus a color map (F:384-410) | **kept**: the store's 2D pictures are `E.sprite` data. Tone-indexed rows (Emberdeep's `UI_GLYPHS`, `60-ui-core.js:107-140`: digits 1-5 are the five tones of one color) let one picture recolor. |
| `floorTex` and `E.tex` | a function per floor pixel; 7 textures (F:4357-4404) | **kept**: a material gives a `floorTex` |
| Wall faces, roofs, tile styles | closed names (F:4147-4244, F:4626-4748) | **kept, every name, pixel for pixel**. They become entries of a public material registry, so games and Emberdeep add theirs in the open. |
| Facades and `decorate(face)` | wall options and a paint hook (F:3716-3759, F:4114-4130) | **kept** |
| Props, `r.prop`, `E.prop` | 38 billboards | **kept, unchanged**. Still the right tool for flames, glows and hanging things (vines, cobwebs, lanterns, windows). New shapes are for still, solid objects; the Shapes lab found a still flame "reads as a mace". |
| Backdrops | 10 presets, 9 layer kinds | **kept**. Only the index line is fixed. |
| Humanoid cosmetics | ids plus colors and numbers | **kept**; out of scope (section 9) |
| The mocap store | readable clips, catalogs, a ledger, sets, a lab | **the model** for this one |
| Temporary labs Shapes vs props and Free camera room (2026-10-08) | the question "are converted 3D models worth building?" | **answered here**. Delete both, with `src/shapes-raster.js`, when the Asset Lab lands (Phase 2). |
| Emberdeep's town solids kit and `treeThing` | per-view projected solids, written by hand | the renderer generalizes the first, and the tree generator starts from the second |
| Pull request michaelcrosato/my-3d2dge#53, the Asset Studio | the owner's open draft (2026-10-10), 15 commits behind `main`, with a live studio for human and agent editing over a local server | **not touched, not depended on**. Its parts (box, wedge, cylinder) and patterns (solid, checker, brick, planks, noise) are a subset of this format. If it is revived, it can edit store entries. |
| The dropped Shapes library plan (2026-10-08) | converted Kenney and KayKit models into box text; dropped with no reason recorded | **its measurements are kept**: Kenney furniture took a median of 10 lines per model and KayKit props 33. Its lab's verdicts are kept too. The next plan written in that session said "no model imports"; `DOCTRINE.md` principle 4, adopted two days later, allows converting ("converting a binary source into readable data is fine"). |

## 3. The format

### 3.1 Three kinds, and code where data runs out

- **Material**: a surface. It has a base color with its ramp (`E.tones` by default), a pattern with a few numbers, and
  optional overlays. One material draws on floors, wall faces, roofs, platform tiles and the faces of shapes.
- **Shape**: a still 3D object made of named parts, each a primitive with a material slot. The engine draws it from
  any view and facing.
- **Sprite**: a 2D picture as `E.sprite` data. It is exact for pixel art. Use it for icons, items, decals and tiles.
- **Code** where data runs out:
  - a shape can be `make(o)`, a function that returns parts. This is how generators work: pine, tree, bush, rock,
    crystal, fence and grass;
  - a pattern is a function in `E.PATTERNS`.

  Data names both, and games add their own.

Registries follow the house idiom, a capitalized object a game adds keys to, as with `E.ACTIONS` (F:4905) and
`E.MOVES`: `E.SHAPES.stool = {...}`, `E.MATERIALS.oak = {...}`, `E.PATTERNS.planks = q => ...`.

### 3.2 Units and conventions

- World units: 16 = 1 m = one tile. x points east, y south, z up.
- A shape's origin is the middle of its footprint on the ground. It is written with its front facing south (+y),
  toward the three-quarter camera.
- Angles written in asset data (`rot`) are in degrees.
- A facing at run time works as everywhere else in the engine. It is in radians and points where the front points, as
  a body's or rig's does: 0 is east and π/2 is south (`groundDir`, F:3760).
  - `r.shape(..., { facing })` takes the same value a rig would.
  - It defaults to π/2, so a shape drawn without a facing shows the front it was written with. The renderer turns it
    by `facing − π/2`.
- Use whole or half units wherever the eye can't tell the difference: a pixel at game scale is about 0.7 units.
- The hero stands about 26 units tall.
- Hand-written objects are drawn a little bigger than life, as props are. Phase 0 fixes the scale; for comparison,
  the probe's barrel is 19 units tall and our barrel prop is 15.

### 3.3 Shapes

Entries from the probe, with library material names in place of its inline colors:

```js
E.SHAPES.barrel = { about: 'an oak barrel with two iron hoops', tags: 'container wood tavern dungeon',
  mats: { wood: 'oak', hoop: 'iron' }, parts: [
    ['lathe', 'wood', [0, 0, 0], [[0, 0], [6.2, 0], [7.2, 4], [7.6, 9.5], [7.2, 15], [6.2, 19], [0, 19]]],
    ['lathe', 'hoop', [0, 0, 0], [[7.1, 2.2], [7.5, 4.4]]],
    ['lathe', 'hoop', [0, 0, 0], [[7.5, 14.6], [7.1, 16.8]]]] };
E.SHAPES.crate = { about: 'a wooden crate, framed and braced', tags: 'container wood', mats: { c: 'crate' },
  parts: [['box', 'c', [0, 0, 0], [15, 15, 14]]] };
E.SHAPES.table = { about: 'a plank table on four square legs', tags: 'furniture wood tavern',
  mats: { top: 'oak', leg: 'oak-dark' },
  parts: [['box', 'top', [0, 0, 10], [24, 14, 2]], ['mirror', 'xy', ['box', 'leg', [10, 5, 0], [1.8, 1.8, 10]]]] };
E.SHAPES.pine = { about: 'a pine in four tiers', tags: 'tree forest nature', mats: { bark: 'bark', leaf: 'pine-needles' },
  parts: [['cyl', 'bark', [0, 0, 0], 2.2, 12],
    ['lathe', 'leaf', [0, 0, 0], [[0, 7], [7, 7], [12, 8.5], [0, 22]]], ['lathe', 'leaf', [0, 0, 0], [[0, 13], [5.5, 13], [10, 14.5], [0, 28]]],
    ['lathe', 'leaf', [0, 0, 0], [[0, 19], [4, 19], [7.5, 20.5], [0, 34]]], ['lathe', 'leaf', [0, 0, 0], [[0, 25], [2.5, 25], [5, 26.5], [0, 41]]]] };
// The engine's pine is the same idea as a generator, for any height and tier count:
// make: ({ h = 41, tiers = 4 }) => parts. Another shape places it with ['use', 'pine', at, { h: 30 }].
```

| Part | Form | What it is |
| --- | --- | --- |
| box | `['box', mat, at, [w, d, h], { rot, bevel }]` | `at` is the bottom centre; `rot` is the yaw (or `[x, y, z]` degrees) |
| cyl | `['cyl', mat, at, r, h, { r2, seg, sq }]` | `r2` makes a cone or frustum; `sq` squashes it to an oval |
| lathe | `['lathe', mat, at, [[r, z], ...], { seg }]` | a profile turned about z, listed from bottom to top |
| ball | `['ball', mat, at, r, { sz }]` | a sphere; `sz` below 1 flattens it |
| prism | `['prism', mat, at, [[x, y], ...], h, { axis, rot }]` | an outline pushed along an axis: signs, gables, blades, planks |
| wedge | `['wedge', mat, at, [w, d, h], { rot }]` | a ramp |
| rock | `['rock', mat, at, r, { sz, seed, rough }]` | a lumpy, faceted ball |
| use | `['use', id, at, { rot, scale, mats, ...params }]` | another shape placed inside this one (a stall with crates, a pine of other proportions) |
| mirror | `['mirror', 'x' \| 'y' \| 'xy', part]` | the part and its mirror copies |
| ring, row | `['ring', n, radius, part]`, `['row', n, [dx, dy, dz], part]` | n copies around z, or n copies in a line |
| group | `['group', at, rot, [parts]]` | parts moved and turned together |

**Fields of an entry:**
- **Shape:** `about`, `tags`, `mats` (slot to material id, or an inline material string), and `parts` or `make`.
- **Optional:**
  - `scale`;
  - `foot: [x0, y0, x1, y1]`, the footprint, for sorting and collision (it defaults to the bounds);
  - `lights: [[x, y, z, color, radius]]`;
  - `flames: [[x, y, z, w, h]]`, drawn by the engine's own flame (F:5789);
  - `glow`: the slots that ignore the light;
  - `grip: [x, y, z]`, for holding it later (section 9).
- **Provenance:** `src`, `orig` and `fit` (section 5.3).

**Placing a shape:** `r.shape(id | spec, x, y, z, { facing, scale, mats: { wood: 'walnut' }, flip, bias, hides,
footprint, light })`.
- It takes `r.prop`'s placement options (`bias`, `hides`, `footprint`, `light`; F:1521-1546), plus `facing`, `scale`,
  `mats` and `flip`.
- **`flip` is a mirror of the shape in its own axes**, x to −x, applied before `facing`. It is not `r.prop`'s
  screen-space flip of the finished sprite. So drawing and collision mirror the same world-space shape, in every view.
- It has no `solid`, because `r.prop` has none to mirror.
- It moves no body.

**Collision is gameplay, so it never comes from drawing.** A game registers each solid shape before its updates.
Phase 1 builds the call against these requirements:
- **The same placement.** Collision takes the same spec and placement as `r.shape`: id or spec, position, `facing`,
  `scale`, `flip`. One placement object can feed both calls, so the collision box always matches what is drawn.
- **Height-aware.** A solid shape is a box with a bottom (its placement's `z`) and a top (`z` plus its height).
  - A body spans from its `z` (its feet) to `z + h`. A body whose span overlaps the shape's collides with it.
    - `E.Body` has no height yet (F:4848), and `E.HEIGHTS` holds only eye, chest, level and step.
    - Phase 1 adds `h` to `E.Body`, defaulting to a standing actor's height (eyes are at `E.HEIGHTS.eye`, 30). Bodies
      that aren't people set their own.
  - A body coming down onto the top lands on it, as on a wall block.
  - A body wholly below the bottom passes under it. That matters for a shape placed on a roof or a shelf.
  - `map.block` alone is not enough: a blocked cell "stops walkers, not jumpers" (`TileMap.collide`, F:3861), so a
    body three units in the air would pass through a ten-unit table.
  - Cells are also a whole tile wide, and most shapes are smaller.
- **The test.** A hero walking into a solid table, and a hero jumping at it, each stop or land.

**Sprites from shapes:** `E.shapeSprite(id, { view, facing, size, mats })` returns a sprite for inventories, HUDs and
portraits. A bag icon is the item's shape drawn at an angle.

### 3.4 Materials

```js
E.MATERIALS.oak = { color: '#8a5a36', pattern: 'planks', bw: 3 };
E.MATERIALS.crate = { color: '#9a6a3a', pattern: 'crate' };
E.MATERIALS.iron = { color: '#6a6e7a', pattern: 'metal' };
E.MATERIALS['mossy-stone'] = { color: '#7a7486', pattern: 'stones', size: 6, over: [['moss', '#5f7a3a', { up: .6 }]] };
```

- **Shorthand.** Anywhere a material id goes, a string `'color pattern key=value ...'` works, e.g.
  `'#8a5a36 planks bw=3'`.
- **How a pattern works.** It returns a tone step (−1, 0, +1 or +2) at a point on a surface. The engine adds the step
  to the band the light gives and picks that color from the material's ramp. So every pattern:
  - works on every surface and in every palette;
  - keeps the house's hue-shifted shading;
  - recolors with one hex.

  A material may give an explicit `ramp` of five colors instead of `E.tones(color)` (imported materials do, section 5).
- **Patterns in v1:** none, planks, crate, bricks, stones (Voronoi cells), tiles, speck, noise, foliage, bark, metal,
  cloth, glaze, thatch and shingles.
- **Overlays in v1:** moss (on up-facing surfaces), cracks, dirt (near the ground) and rust.
- **The built-ins become entries.** The existing faces (brick, stone, rock, plank, timber, plaster, hedge), roofs
  (speckle, plain, tiles, slab, leaves, grass), tile styles and `E.tex` textures become registry entries that keep
  their own drawing function, so nothing they draw changes. Emberdeep's 9 faces and 8 roofs register the same way, and
  its private patch goes.
- **Surfaces.** These take any material id. An unknown id warns with the list of names.
  - A wall type's `face` and `roof`, which only pick a look.
  - A TileMap's new `floorMat: id` for every floor cell, and `floorMats: { tag: id }` for tagged cells, overriding
    it. Untagged cells, and maps built in code with no floor tags, have the tag `null` (F:3786, F:3830).
  - Not `floors`: that name is already the map's cache of baked floor images (F:3796, F:4024), and Emberdeep resets
    it.
  - A platform tile type's new `mat`, beside its `style`. The style also picks the tile's geometry (spikes, ladders,
    liquid, pipes), so it stays as it is.

### 3.5 Sprites

```js
coin: { about: 'a gold coin, edge-on shine', tags: 'item pickup', rows: ['.33.', '3443', '3443', '.22.'],
  colors: { 2: 'gold:sh', 3: 'gold', 4: 'gold:hi' } }
```

`E.sprite` rows. A color is a hex, or `'material-or-color:tone'` (a tone is deep, sh, base, lt or hi), so a whole icon
recolors through one material. That is the same idea as Emberdeep's `UI_GLYPHS`, made general.

### 3.6 Where it lives

**The engine, full edition only.**
- Registries: `E.MATERIALS`, `E.PATTERNS`, `E.SHAPES`.
- Calls: `r.shape`, `E.shapeSprite`, and `E.addAssets(set)`, which registers a store set and returns its ids.
- Map options:
  - TileMap's `floorMat` and `floorMats`;
  - `face` and `roof` taking any material id;
  - a platform tile type's `mat`.
- The shape renderer (section 4) and the generators.
- A small **core library**: the shapes and materials the starters and the template game use, at most 12 KB of source.
- About 10 new public names, each with a doc comment. The index has room for about 100 (D28).

**The agent edition.** Stubs that warn once and return null, as for props.

**The store, outside the engine, like the mocap store.**
- `src/assets/sets/<name>.js`: `(window.ASSETS = window.ASSETS || {})['NAME'] = { set, format: 1, credit, sources,
  materials, shapes, sprites }`.
  - A header comment carries the credit, the counts and a pointer to `docs/ASSETS.md`.
  - Node reads the file in a `vm`, as `tools/mocap-lib.mjs` reads sets.
- **Ids never collide across sets.**
  - Inside a set, ids are local: a set's entries find its own materials and shapes first, then the core library's.
  - Registered, a set's ids are qualified by the set's name (`kenney-furniture:chair`), so loading one set never
    changes another's assets, or the core's.
  - `E.addAssets` returns the qualified names. An id that already exists warns and keeps the first.
  - The core library's ids are bare (`barrel`).
- `src/assets/catalogs/<library>.json`: hand-written `"id": ["tags", "what it looks like"]` entries, plus `$sources`,
  `$skip` (with reasons) and `$pick`.
- `src/assets/catalogs/<library>.tsv`: the ledger of everything in a big source, one row per file:
  - size, triangles and materials;
  - fit, used and flags;
  - a `note` column that a person writes and that survives re-surveys.
- `tools/asset-*.mjs` (Phase 2).
- `examples/asset-lib/`: per-library files the lab loads on demand (the `examples/cmu-lib/` pattern), when the
  libraries outgrow inlining.

### 3.7 The probe (what planning found)

A throwaway renderer of about 220 lines, run in this session's scratchpad (not committed).
- **The method.**
  - Primitives become triangles.
  - Each is rasterized at game size into a depth buffer, keeping per-pixel normals and surface coordinates.
  - Light bands pick from `E.tones`, and patterns nudge the band by a step.
  - Lit top edges and part creases are added.
  - The actors' 1-px outline goes round it.
- **The objects.** Eight, drawn in iso, three-quarter, top-down (true and tilted), brawler, and iso turned twice, each
  beside the hero and our closest prop:

  | Object | Characters of data | About this many tokens |
  | --- | --- | --- |
  | crate | 71 | 24 |
  | rock | 84 | 28 |
  | table | 151 | 50 |
  | pot | 197 | 66 |
  | chair | 246 | 82 |
  | barrel | 285 | 95 |
  | bed | 298 | 99 |
  | pine | 330 | 110 |

- **What it showed.**
  - Each object reads as itself in every view and turns with the camera.
  - The materials carry the detail that makes the house style: planks, a framed and braced crate face, iron hoops,
    foliage clumps, a glazed pot, faceted rock.
  - The 71-character crate, which leans on the shared crate pattern, beats our 270-character flat crate prop.
- **What was off.**
  - A light fixed in the world shows iso's camera the shadow side of everything. Pixel art lights from the viewer's
    upper left.
  - Seen from straight above, a pine is a green disc. With the characters' readability tilt (`E.charView`), it reads
    as a pine.
  - Turned surfaces need flat lids, not radial planks (fixed in the probe).

### 3.8 Why this format, and not meshes, voxels or SVG

Recent work on models that make 3D content agrees on what works:
- a small, documented vocabulary of parts;
- parametric generators;
- a loop that renders the result and checks it.

| Work | What it found |
| --- | --- |
| LL3M (2025) | Agents write Blender code; the code is the asset, editable and documented. |
| 3D-GPT | The model sets a procedural generator's parameters instead of writing geometry. |
| MeshLLM (ICCV 2025) | Meshes are split into primitive sub-meshes so they fit the context at all. |
| CAD-Recode (ICCV 2025) | Shapes as code let a small model beat earlier methods. |
| 3DCodeBench (2026) | Failures come mostly from API mismatches and floating parts; refining with feedback from execution fixes them. |
| SGP-Bench (ICLR 2025) | Models struggle to imagine what shape code renders, so they need to see the render. |

What follows for this format:
- **Meshes are for import only.** Even quantized OBJ (LLaMA-Mesh: at most 500 faces) is long and can't be edited
  by name.
- **Voxels are what the Shapes lab tried.** They blow up on round and ornate things: a barrel became 761 boxes.
- **SVG** is well known, but loses quality as pictures get complex. For pixel art, rows of palette indices are both
  smaller and exact.

Hence: named parts, `use` and generators for whole families, and `tools/asset-sheet.mjs` as the render-and-check step.
Pattern names and their parameters follow MaterialX's and Blender's texture nodes where the two overlap with ours:
noise, Voronoi (Worley), brick, checker, wave, gradient. Models already know those (principle 7).

## 4. How the engine draws a shape

- **Rasterized at game size into a depth buffer**, as the probe does; `src/shapes-raster.js` is the seed.
  - Each primitive becomes triangles. The segment count comes from the projected size, so small things stay crisp.
  - Each pixel keeps its depth, its normal, its surface coordinates, its material slot and its part.
- **Shading.**
  - The normal against the key light picks a band of the material's ramp (deep, sh, base, lt, hi), and the pattern
    moves it by a step or two.
  - Top edges are lit, and creases are dark where parts meet.
  - It goes through `r.actor` (F:1652-1714), so the outline, hit flash, x-ray, `hides`, afterimages and emissive
    drawing work as they do for characters.
  - **A contact shadow** under the footprint, darker where the shape meets the floor. The judge named "thin shadows"
    (F3.2).
- **Steep views** draw shapes from `E.charView`'s lower angle, as they draw characters (option `charView: false`).
- **Caching.** Each raster is cached per shape and its parameters, material set, `flip`, view, facing (in 32 steps)
  and zoom. `flip` mirrors the shape itself, so flipped and unflipped placements need rasters of their own.
  - The parameters are keyed by a hash of the resolved parts, so `['use', 'pine', at, { h: 30 }]` and the default pine
    never share pixels.
  - Rasters are built lazily and dropped least-recently used.
  - With a fixed camera, each placed shape is rasterized once.
- **Light: a Phase 0 decision.** Either fixed in the world or fixed to the view. The probe argues for the view, from
  the camera's upper left.
- **Sorting comes from the data.** The footprint comes from the bounds or `foot`. Collision uses the same box, but the
  game registers it before updates (section 3.3).
  - Sorting works as it does for props: one point plus `bias`.
  - A footprint lifts only things standing on wall blocks (`z > .5`, F:1416-1424). So a long shape on the floor (a
    bed, a table, a cart) sorts by a single point.
  - Phase 1 tests those three against a hero walking round them, and extends the footprint rule to the floor if they
    sort wrong.
- **Cosmetic only.** No gameplay reads a raster. Generators seed their noise from the entry, never from
  `Math.random`, so an entry draws the same pixels everywhere and filmstrip comparisons hold.

## 5. Translating public libraries

### 5.1 Sources

Checked on 2026-10-11, from each source's own license and download pages. Re-check every license when you fetch,
and store the URL, the label as shown, the date and a hash of the license text in the ledger: licenses change, as
Quaternius' did.

| Source | License | What, how many | Bulk download | Fit | For |
| --- | --- | --- | --- | --- | --- |
| **Kenney 3D kits** (kenney.nl) | CC0, on all 50 kit pages, with a `License.txt` in each zip | ~4,600 low-poly models (GLB, OBJ, FBX), flat colors or a tiny `colormap.png` swatch atlas; a tree is 114 faces | a direct zip URL on each kit's page | high | shapes |
| **KayKit** (Kay Lousberg) | CC0 on the itch pages (updated Sept 2026), plus a non-binding request not to resell unmodified copies | ~25 packs of 30-370 models (glTF, FBX, OBJ), one gradient atlas | itch needs a click; about 10 packs are GitHub repos (`KayKit-Game-Assets/*-1.0`) | high | shapes |
| **Kenney textures** | CC0 | 10 packs, e.g. Retro Textures Fantasy (115 PNGs) | direct zip | high | materials (as tiles), sprites |
| **Kenney 2D** | CC0 | 145 packs; the 1-Bit Pack alone has 1,078 tiles of 16 x 16 | direct zip | high | sprites |
| **0x72 DungeonTileset II, Ninja Adventure** | CC0 | 16 x 16 tiles, items, characters | an itch click; Ninja Adventure is also on GitHub | high | sprites |
| **ambientCG** | CC0 | 2,015 PBR materials (1,662 of them made procedurally, shipped as bitmaps) | keyless API (v3), direct zips | medium: fitted, not copied | materials |
| **Poly Haven textures** | CC0 | 867 PBR sets | its API, which asks for a named User-Agent; the site forbids scraping | medium | materials |
| **Lospec** | none stated (palettes are lists of colors); record the author | 4,529 palettes | keyless URLs per palette | high | ramps, game palettes |
| Poly Haven models, Smithsonian 3D, Sketchfab's CC0 | CC0 | photoreal scans of 6,500-150,000 faces | APIs (Sketchfab needs a login) | low | not in this plan |
| Quaternius | drifting: its license page is now QAL v1.0 (2026-08-28), which bans repackaging "regardless of how much the Assets have been modified", while 82 of its 83 pack pages and its FAQ still say CC0 | ~4,140 models | Google Drive and itch, by hand | **excluded** (question 1) | |
| Icosa Gallery (the Google Poly archive), game-icons.net | CC BY (about 130k of Icosa's 141k models; game-icons' 4,180 SVGs are CC BY 3.0) | the right low-poly look; game icons | keyless API; zip and GitHub | needs credit per author | question 1 |
| Tiny Swords (current version), Sprout Lands, Cute Fantasy RPG | no redistribution, "even if the files are modified" | | | **excluded** | |
| LPC, OpenMoji, parts of OpenGameArt | copyleft (CC BY-SA, GPL): the converted text would inherit it | | | **excluded** | |
| MaterialX (Apache-2.0), Material Maker (MIT), Blender's texture nodes | code and tool licenses | procedural material vocabularies | git | vocabulary only | the names and parameters of `E.PATTERNS` (section 3.8) |

### 5.2 Pipelines

| From | To | How | Kept; approximated; lost |
| --- | --- | --- | --- |
| glTF / GLB low-poly kits | shapes | See below the table. | **Kept:** silhouette, proportions, part structure, colors. **Approximated:** rounding, bevels, and detail under a pixel. **Lost:** image detail beyond the average color per part, normal maps, skins and animation. |
| PBR texture sets | materials | See below the table. | **Kept:** colors and structure at game scale. **Lost:** photographic detail, and the response to normals and roughness (our light is banded). |
| Pixel-art packs (PNG) | sprites | Each image becomes rows plus a color map with one character per color. A pack shares one palette. Names come from the file names. | **Exact.** |
| Characters and creatures; whole buildings and modular walls; organic models with many leaves | not translated | Bodies are rigs plus the mocap store. Structures are TileMap plus materials: the Shapes lab's worst case was a wall at 904 lines. Plants are generators. | |

**glTF / GLB to shapes:**
1. Read the meshes, with the deleted spike's reader (`git show fbc1c8d^:handoff/shapes-spike/glb.mjs`) or
   `tools/anim-import.mjs`'s. Turn y-up into z-up and metres into units (x16), with the front on +y.
2. Split the mesh into parts by material and connectivity.
3. Fit each part to the simplest primitive whose voxels match its own at an IoU of 0.85 or better: box, cyl or cone,
   lathe (for parts turned about an axis), prism, wedge or ball. Otherwise merge its voxels into boxes at 1 unit (the
   spike's `boxes.mjs` and `hybrid.mjs` are recoverable the same way).
4. Detect mirroring and rows to shorten the entry. Keep each shape within a budget (40 parts), using coarser cells past
   it.
5. Take each part's color from `baseColorFactor`, or from the kit's palette texture sampled at its UVs. Map it to the
   nearest library material by name and color, keeping the source color as a tint.
6. Take the name and tags from the file name, then from the catalog.
7. Measure the fit; write the set and the ledger.

**PBR textures to materials:**
1. The source's own category and tags pick the pattern family: bricks, planks, stones, tiles, metal, cloth, speck or
   noise, shingles or foliage.
2. The ramp comes from the albedo: k-means into five tones, kept as an explicit `ramp` when `E.tones(base)` misses it
   by more than ΔE 8.
3. The numbers come from the physical size and the height map's period: brick height, plank width, tile size and mortar
   width.
4. The fit compares our render with the albedo shrunk to game scale.

### 5.3 Provenance and fit

- **Each set** carries `credit` and `sources`: one record for each downloaded archive or file, keyed by a short name
  (`{ 'kenney-furniture': { label, origin, license, url, fetched, sha256, licenseHash } }`).
  - A library of many archives, such as Kenney's kits, has one record per archive.
  - A re-import checks each record's sha256 first.
- **Each entry** carries:
  - `src`: the key of its download's record in the set's `sources`. Entries name the record and never copy it;
  - `orig`: the file inside that download;
  - `fit`.

  So the bytes behind each entry, and its fit, are known even if a provider replaces a file at the same URL.
- **Fit:**
  - **Shapes:** the silhouette IoU at game scale against the source triangles drawn by the same rasterizer, as mean
    and worst over the views, plus the color ΔE.
  - **Materials:** ΔE and a structure score at game scale.
  - **Sprites:** 0, since they are exact.

  This is the art version of the clips' error in millimetres.
- **CC0 only, enforced.** The suite fails on any license outside an allowlist (CC0 1.0 and the public-domain mark).
  The mocap store has no such allowlist; this store has one from its first day.
- **Binaries are never committed.**
  - Downloads go in `.cache/assets/` (ignored) and previews in `check-output/`.
  - Base64 inside a text file is still binary (principle 4).

## 6. The plan

### Phase 0: the look gate (a Temporary lab, no version bump)

Prove the look and the format before anything goes into the engine. This is prototype tier: a Temporary lab,
`asset-probe` (`src/asset-probe.*`), whose `labs.json` entry gives the date and the question "Do short part lists with
named materials draw objects at least as well as our props, in every view?". It may reach past the API.

1. **The renderer** (section 4), starting from `src/shapes-raster.js`.
   - Every primitive and operator in section 3.3.
   - The patterns planks, crate, bricks, stones, speck, foliage, bark, metal, cloth and glaze.
   - Lit edges, creases and the outline.
2. **24 hand-written shapes**, the things games dress rooms with: barrel, crate, chest, table, chair, stool, bench,
   bed, bookcase, shelf, pot, jar, sack, cart, well, sign, fence, lamp post, anvil, pine, broadleaf tree, bush, rock
   and crystal.
3. **8 converted models and 6 fitted materials.**
   - The models come from CC0 kits; reuse the Shapes lab's picks where they fit.
   - The materials are fitted from ambientCG.
4. **A sheet for each shape:**
   - every view, and turning;
   - the hero for scale, and our closest prop;
   - two Emberdeep floors, one light and one dark;
   - the numbers: tokens, parts, raster milliseconds.
5. **The look decisions.** Each is a reversible call, made at once and listed in the pull request:
   - the light: world or view;
   - steep views: true or tilted;
   - color: the source's own, or remapped;
   - size: real, or prop scale;
   - lit edges: on or off;
   - dithering at band edges: off or on.

**Done when:** the lab plays on the preview, the pull request shows the sheets and numbers, and section 7's gate has
been checked.

### Phase 1: materials and shapes in the engine (the next minor version, full engine)

1. **The material registry**, `E.MATERIALS` and `E.PATTERNS`.
   - Register every existing face, roof, tile style and `E.tex` texture with its own function. Prove it is pixel for
     pixel with `tools/filmstrip.mjs --compare <before> --expect-same` on Emberdeep (town and two depths), the stealth
     starter and the platformer.
   - Add `floorMat` and `floorMats: { tag: id }` to TileMap, and `mat` to platform tile types.
   - Unknown face, roof and style names warn with the list of names.
2. **Emberdeep moves to the public registry.** Its 9 faces and 8 roofs register through `E.MATERIALS`. Remove
   `_facePattern` and `_roofPattern` from `GRANDFATHERED`.
3. **Shapes.**
   - `E.SHAPES`, `r.shape`, `E.shapeSprite`, `E.addAssets` (with qualified ids), and the renderer as Phase 0 decided
     it.
   - The height-aware collision call for solid shapes, built to section 3.3's requirements.
   - The generators pine, tree, bush, rock, crystal, fence and grass. Start the tree from Emberdeep's `treeThing`.
   - `r.actor`'s scratch canvas is 256 px square, with the feet at (128, 200) (`AS`, F:1346). Shapes bigger than that
     at high zoom need a path of their own.
4. **The core library**, at most 12 KB: the Phase 0 shapes that passed, plus about 30 materials (woods, stones, metals,
   cloth, foliage, ground).
5. **`docs/ASSETS.md`, the asset card**, at most 4,000 tokens: the format, the vocabulary, the material list, six
   worked entries and the make-an-asset recipe (section 8 of this plan).
   - `doctrine-check` budgets it (a D-entry).
   - Each manual's map gets one line: the agent header, the full engine header, `API.md` and `AI_GUIDE.md`.
   - `agent-test` checks the paths that line names.
6. **The index.**
   - Every new name has a doc comment.
   - If a separate fix hasn't already landed, fix the generator bug behind the four garbled lines (a name whose
     nearest comment is a `/* ====` banner takes the wrong text), and the backdrop presets line (dusk, not sunset,
     and all ten).
7. **Tests: a new suite, `assets`** (`tools/assets-test.mjs`, registered in `tools/test-run.mjs`).
   - Every core shape draws in every view and in 8 facings: not empty, inside its bounds, and no part under a pixel in
     iso or three-quarter.
   - Every material draws on every kind of surface.
   - Two runs give the same pixel hash.
   - Two uses of one generator with different parameters draw different pixels.
   - A hero can't walk through a solid table or jump into it below its top, and sorts right while walking round it.
   - The collision box matches the drawn shape under `facing`, `scale` and `flip`.
   - Loading a set never replaces a core entry or another set's.
   - Validation errors name the entry and the field.
   - Each entry stays within the token budget.
   - `contract-test` runs the new examples on both editions (stubs on the agent edition).
   - `test:determinism` and `test:replay` stay green.
8. **Version and changelog:** the next minor version, with lines under Rendering, Art, Engine, Tools and Docs.

### Phase 2: the store and its importers (the next minor version)

1. **The tools.** `npm` scripts follow the `mocap:*` pattern: `assets:fetch`, `assets:import`, `assets:set`,
   `assets:sheet`, `test:assets`.
   - **`asset-fetch.mjs`** downloads a library into `.cache/assets/<lib>/`, checks the license text, and writes the
     ledger.
   - **`asset-import.mjs`** converts:
     - GLB to shapes;
     - PBR to materials;
     - PNG packs to sprites.

     It takes `--list`, `--tol`, `--catalog`, `--credit` and `--out`.
   - **`asset-set.mjs`** cuts a set by ids. It carries the whole chain of shapes they `use`, with every material and
     source in that chain, so the cut set draws on its own.
   - **`asset-sheet.mjs`** draws sheets and lints them, like `tools/ed-sheet.mjs`.
   - **`asset-find.mjs`** searches the catalogs and prints the entries it finds.
2. **The first libraries**, from section 5.1's high-fit rows:
   - a few hundred low-poly models;
   - about 120 materials;
   - the CC0 pixel packs.
3. **Curation.**
   - Each library gets a catalog, written from its sheets. Describe what a thing looks like.
   - `$skip` records, with reasons, what doesn't survive: ornate, organic or structural models.
   - The ledger records the fit.
   - Promote an entry to the engine's core library only when it beats what is there.
4. **The Asset Lab** (`/asset-lab`, kept).
   - Browse and search every set, in every view and turning, beside the hero, on theme floors.
   - Each entry as text, with Apply and Copy for a model; the catalog with token counts.
   - Deep links (`#barrel`, `?set=`, `?view=`) and `window.__assets` for tests.
   - Register it in the Labs section of `src/labs.json` and in `tools/labs-test.mjs`'s lists.
5. **Tests: the `assets` suite grows.**
   - Provenance and the license allowlist.
   - Catalog coverage.
   - Picked sets equal their sources.
   - Every fetched library has a complete ledger.
   - Fit thresholds: shapes average 0.8 IoU, and none is under 0.6 in any view.
   - Sprites are exact.
6. **Delete** the Temporary labs Shapes vs props, Free camera room and asset probe, with `src/shapes-raster.js`.
7. **`docs/ASSET-IMPORT.md`**, like `docs/MOCAP.md`: the pipeline, adding a library step by step, the sources with
   licenses and dates, provenance, fit, costs and limits.

### Phase 3: in the games (the next minor version)

1. **Emberdeep.**
   - Themes' dressing lists can name shapes: `WLD_dress` gains a shape entry beside `WLD_pp`.
   - The town and forest themes take the tree generator in place of flat pines.
   - Town pieces the renderer now covers move to shapes. Pieces that animate stay as they are, like the stash chest's
     sprung lid.
   - The gallery gets an ASSETS reel, or a link to the lab.
   - Core files stay as they are (`DESIGN.md`): plug in through registries and the BUS.
2. **The starters and the template.** The adventure, rpg and stealth starters and the handoff template game dress
   their rooms with core shapes and one material. This is `E.Shell`'s lesson (F4.3): builders copy what the starters
   do, and skip what only the manual mentions.
3. **Performance.** A scene with 300 shapes in view: time the first frame and the steady frames, and check the cache
   size. Fix what shows.
4. **Proof.** A filmstrip with `--compare` for every scene that changed, and `tools/check.mjs` look notes before and
   after.

### Phase 3b: the same shapes in the 3D engine (the next minor version)

Added 2026-10-14, with the owner's answer (section 10): the 2D engine first, then the 3D engine (`engine/my-3d2dge-3d.js`,
`docs/ENGINE-3D.md`, D27, which came after this plan was written) draws the same store entries. Read
`docs/ENGINE-3D.md` and the 3D engine's header before starting.

1. **One format, two renderers.** A store entry draws in a 3D world unchanged, from the same resolved parts the 2D
   renderer uses (one resolver for `use`, `mirror`, `ring`, `row` and `group`, in the 2D engine, which the 3D engine sits
   on). `world.shape(id | spec, x, y, z, { facing, scale, mats, flip })` takes the 2D placement's options and units.
   - The pen (`world.pen`: instanced boxes, balls and tubes, drawn each frame) covers box, cyl and ball. Lathe, prism,
     wedge and rock need geometry of their own (`LatheGeometry`, `ExtrudeGeometry`, a seeded faceted ball).
   - Still set dressing is built once: geometry merged per material within a shape, instanced across placements, and
     every pipeline built in the warm-up frame behind the boot screen.
   - `World3D.THINGS` stays: things are animated pickups and dressing drawn by code. Shapes are still objects.
2. **Materials in 3D.** A material reads as itself in both engines: its pattern (`E.PATTERNS`, tone steps on its ramp)
   is drawn by code into a small texture per material at world scale, on a node material. Under the Comic cel and Pixel
   filters it keeps its bands.
3. **Collision in 3D.** A solid shape gets a Rapier collider from the same placement box as the 2D collision call
   (section 3.3), so a hero stops at a table and lands on it in both engines.
4. **The 3D kits use it.** The action hall and the platformer course dress their levels with core shapes where the
   current dressing is flat or drawn ad hoc.
5. **The manual.** The 3D engine's header gets the API lines (6,000 tokens; 4,597 at v0.34.2). `docs/ASSETS.md` gets one
   line pointing to it.
6. **Tests** in the 3D kits' suite (`tools/kit3d-test.mjs`), under its existing rules (node materials only, no compute,
   nothing read back, no pipeline built mid-game):
   - every core shape builds and draws on WebGPU and on WebGL 2;
   - each slice's proof hash is the same twice and on both backends, with shapes and their colliders in place;
   - a sheet of each core shape in 3D beside its 2D raster (read it: they should read as the same object).
7. **Version and changelog:** the next minor version, with lines under Rendering, Engine, Tools and Docs.

### Phase 4: measure it

1. **Free, in the session.** Fresh subagents get only `docs/ASSETS.md`, the catalogs and the tools, and write 10
   objects from one-line briefs (an anvil, a market stall, a gravestone, ...). Other fresh subagents get only `API.md`
   and write the same 10 as canvas drawing code. Compare output tokens, whether the first try is valid, and a look
   score from the sheets.
2. **Paid: ask the owner first** (D19). Run one `agent-bench` brief again. Breath of the Wild had the flat pines.
   Compare the judge's score with 6/10, and the art share of the game's code.

## 7. Measures, and the gate

| Measure | Today | Target |
| --- | --- | --- |
| Objects a game can place without drawing code | 38 flat props | 300 or more shapes with provenance and fit; 60 or more of them curated |
| Surfaces | 7 floor textures, 8 faces, 6 roofs, 13 tile styles, all closed | 100 or more materials, in an open registry |
| 2D pictures in a library | none | 300 or more sprites |
| A hand-written object | 236-480 characters of dense drawing code per prop, one picture for every view | a median of 120 tokens or fewer, right in every view |
| An agent writes an object from a one-line brief | | 80% or more valid and drawn on the first try; 40% or more fewer output tokens than canvas code (Phase 4) |
| The look | props judged flat (F3.2) | shapes read at least as well as props (Phase 0); the benchmark judge gives 7 or more on a re-run (a stretch) |
| The manuals | | `docs/ASSETS.md` within 4,000 tokens; the agent header and `API.md` within their budgets |

**The gate (end of Phase 0).** Stop and report instead of building Phase 1 if any of these holds. That keeps the
owner's rule: don't push on where the goal can't be met.
- The shapes don't read at least as well as our props in iso and three-quarter.
  - You judge this from the sheets, and log the call.
  - Don't wait for the owner: they can overrule later on the preview, and a revert undoes it.
- The median hand-written shape costs more than 150 tokens.
- A typical shape (30 parts or fewer) takes more than 4 ms to rasterize at zoom 1 headless. At that rate, 100 new shapes
  would stall a first frame.
- Fewer than 6 of the 8 converted models reach an IoU of 0.7 at game scale.

## 8. The make-an-asset recipe (what `docs/ASSETS.md` teaches)

1. **Read `docs/ASSETS.md` whole.**
2. **Search:** `node tools/asset-find.mjs "tavern table"` gives ids, one-line descriptions and where each entry is.
3. **Copy** the nearest entry and change its names, parts and materials. Or write a new one from the vocabulary.
4. **Look:** `node tools/asset-sheet.mjs mine.js#stool` draws a PNG (every view, turning, beside the hero, on a light
   and a dark floor) and lints it: too small from above, a part under a pixel, a thin palette, low contrast with the
   floor, tokens. Read the PNG, fix it, repeat.
5. **Use:**
   - From a set: `E.addAssets(window.ASSETS.MINE)` registers it under ids qualified by the set's name and returns
     them, so draw it with `r.shape('MINE:stool', x, y, 0, { facing })`.
   - Or write the entry straight into `E.SHAPES.stool` and draw `'stool'`.

## 9. Traps, and what is out of scope

**Traps:**
- **Exact shape detection failed** for 70% of the spike's parts (bevels and welds defeat it). Fit by voxel IoU instead.
- **Round things are boxes' weak spot.** A barrel became 761 boxes; one lathe is 4 lines.
- **Ornate detail becomes noise.** The mimic chest took 651 boxes. Use a part budget, coarser cells, or `$skip`.
- **Real-world scale is small beside our hero, and Kenney's colors are pastel.** Scale and remap are Phase 0
  decisions.
- **Anything that glows or moves** stays a prop or uses `flames` and `lights` anchors.
- **The doctrine check's boundary scan** reads every `.js` file under `src/`. Skip `src/assets/sets/` as it skips
  `src/mocap/sets/` (`tools/doctrine-check.mjs:101`), or data containing something like `._w` fails falsely.
- **`test-run` treats a line that changes only in x.y.z as a version bump**, so data with dotted triples can be skipped.
- **Kits must fit a 200k context.** Kits embed the full engine, so the renderer and the core library grow every kit.
  Keep both lean, measure the kits before and after (README's table), and never inline the store into a kit.
- **`fetch()` doesn't work from `file://`.** Sets are `.js` files that assign a global.
- **The agent header has 271 tokens left, the API card 457** (counted exactly). Keep each map line short.
- **Emberdeep's core files stay as they are** (`DESIGN.md`).
- **Quaternius' license drifts.** Its site-wide license (QAL v1.0, 2026-08-28) forbids repackaging "regardless of how
  much the Assets have been modified", while most of its pack pages still say CC0. So: no Quaternius models unless the
  owner says otherwise. The animation library pages the clips rely on still say CC0. Licenses change: snapshot each
  one at fetch time.

**Out of scope here; each can be its own plan:**
- Structures as geometry: TileMap and materials do walls and roofs.
- Bodies from models: rigs and the mocap store do bodies.
- Held items and weapons as shapes on a rig's hand. The format keeps `grip` for it.
- Shapes with states (lids and doors that open).
- New backdrop kinds, fonts, sound.
- CC BY libraries such as game-icons.net (section 10).
- The 3D Proof and the 3D Prototype (Temporary labs, `docs/LAB-3D.md`). The 3D engine itself is in scope from Phase 3b.

## 10. Decisions to log, and questions for the owner

**Entries for `docs/DECISIONS.md`.** Each is reversible, made at once, and flagged in its pull request:
- The asset store converts CC0 libraries with provenance and never commits binaries (principle 4, as D7 did for mocap).
- Shapes and materials are full-engine only, with stubs in the agent edition.
- `docs/ASSETS.md` has its budget.
- If the index budget would rise, split the index by area instead (D22).

**Questions.** The default is in bold. The work doesn't wait for an answer; anything marked hard to undo does
(`DOCTRINE.md`).
1. **Licenses beyond CC0?** This covers CC BY libraries, which need credit per author (game-icons.net's 4,180 icons,
   the Icosa Gallery's low-poly models), and Quaternius' packs that are still labeled CC0. **CC0 only until you say
   otherwise.** Adding a license is hard to undo.
2. Pull request michaelcrosato/my-3d2dge#53, the Asset Studio? **Leave it.** If revived, it can edit store entries.
3. The benchmark re-run in Phase 4 (about $15)? **Ask when Phase 3 lands.** Spending is hard to undo.
4. Delete the Shapes vs props and Free camera labs in Phase 2? **Yes**: their question is answered.

**The owner's answers, 2026-10-14** (v0.34.2):
- **The 3D engine:** the store is built on the 2D engine first, as planned; then Phase 3b draws the same entries in the 3D
  engine, and its kits use them.
- **The index's budget:** 40,000, counted exactly (D28). An analysis of 34,000, 37,000 and 40,000 comes after this plan.
- **The 3D labs** are now called the 3D Proof (`/lab-3d`) and the 3D Prototype (`/stress-world`); the 3D Prototype stays
  as the record of what the 3D engine was built from.

## 11. Effort: extra (xhigh), Opus 5.5

**Extra (xhigh)**, one phase per pull request, in order.

- **The design was done in planning**, and the probe settled the riskiest question, whether the look holds. What
  remains is building against a concrete format, with checks at every step:
  - a renderer whose quality is judged from pictures;
  - geometry fitting in the importer;
  - image statistics for materials;
  - a registry that must keep every existing wall pixel for pixel.

  xhigh reasons well enough about each of these without max's cost on hundreds of routine edits, builds and test runs.
- **Medium or high is too light** for Phases 0 and 1: the renderer sets the look of every future game, and the
  registry touches every map. High would do for Phase 3 on its own.
- **Max** pays off only if Phase 0's gate comes out close and a second, better attempt at the renderer is wanted.
- **Ultracode doesn't fit the building.** Phases 0, 1 and 3 edit the same engine file and the shared versioned files,
  and each builds on the one before; parallel agents would mostly make merge conflicts. Two steps are naturally
  parallel and can use subagents inside an xhigh session, without the cost of a full workflow:
  - Phase 2's curation (one subagent per library writing its catalog from sheets);
  - Phase 4's authoring test.

  Ultracode would only make sense to grow the library far past section 7's targets later. Ask the owner first.

## 12. The prompt

Run it at extra (xhigh) effort, in a fresh session:

```
Run docs/HANDOFF-ASSETS.md to completion: Phases 0, 1, 2, 3, 3b and 4 in order, each its own pull request, merged
as CLAUDE.md says (npm run test:changed green, squash merge, then the full npm test in the background, fixing
forward). Start from the latest origin/main, and read CLAUDE.md, DOCTRINE.md, docs/MOCAP.md, docs/ENGINE-3D.md and
the whole plan first. If section 14 shows phases already done, resume from the first phase not done.
- Phase 0 ends at the gate in section 7. Judge it yourself from the sheets and numbers. If any kill criterion holds,
  stop and report. Otherwise go straight on to Phase 1 without waiting for me.
- Make reversible calls at once and log them (D13).
- Licenses: CC0 only. Spending (Phase 4's benchmark re-run): ask me with the 15-minute wake-up (D11). With no answer,
  skip the paid run and finish the rest.
- Every existing prop, wall, roof, tile style and texture draws exactly as before; prove it with filmstrip --compare
  --expect-same.
- After each merge, read that pull request's Codex review and fix its real findings in a follow-up (or in the next
  phase's pull request), resolving the threads. Then add the phase's row to section 14.
- Use subagents for Phase 2's per-library curation and Phase 4's authoring test.
- When Phase 4 is done, fold what lasts into docs/ASSETS.md and docs/ASSET-IMPORT.md and delete this plan.
- Report each phase's version, commit and sheets.
```

## 13. Done means

- A game places `r.shape('barrel', x, y, 0, { facing })` and gets a barrel that is right in every view and facing,
  with no drawing code. It writes a new object as about a hundred tokens of data and checks it headless with one
  command.
- Floors, walls, roofs, platform tiles and shapes all take materials from one open registry. Emberdeep uses it with no
  private engine members.
- The store holds the section 7 targets, each entry with provenance and fit, searchable by catalog. The Asset Lab shows
  every entry.
- The starters and the template game use it. The four manuals point to it in a line each, within their budgets.
- The 3D engine draws the same entries, with the same materials and colliders, and its kits use them (Phase 3b).
- Phase 4's numbers are in `DOCTRINE.md` or the pull request, and this file is deleted.

## 14. Progress

One row per merged phase, added by whoever merges it, so a fresh session knows where to pick up.

| Phase | Version | Pull request, commit | Gate numbers and notes | Next |
| --- | --- | --- | --- | --- |
| The plan | v0.25.1 to v0.26.2 | #74 to #78, and this plan's prompt update | The probe: 8 objects at 71-330 characters, right in every view. Reviews: 20 findings, all fixed. | Phase 0 |
| The plan, updated | v0.34.2 | the pull request that adds D28 | The owner's answers (section 10): Phase 3b for the 3D engine; the index at 40,000, counted exactly. | Phase 0 |
| Phase 0: the probe | unversioned (a Temporary lab) | #106, 8f59ea1 | Gate passed: hand-written median 127 tokens (51-226); 8 of 8 Kenney conversions at IoU .87-.97 (worst view .81), 117-580 tokens; a tree 2 ms, the rest under 1 ms; reads in every view (sheets: `node src/asset-probe.sheet.mjs`). Five look calls, one commit each (light from the view's upper left, steep views from the characters' angle, kit colors kept, kits at prop scale, edges and creases on, no dithering). Fitted planks and shingles are a third off the eye's count: rechecked in Phase 2. Codex could not review (see Phase 1). | Phase 1 |
| Phase 1: materials and shapes | v0.35.0 | #107, b71dfb4 | `E.MATERIALS`/`E.PATTERNS` (15 patterns, 4 overlays) on every surface; `r.shape`, `map.solid`, `E.shapeSprite`, `E.addAssets`; 25 core shapes and 37 materials (8.6 KB, median 125 tokens); `docs/ASSETS.md` 3,366 of 4,000 tokens. Every existing look identical on 37 pages (filmstrip `--expect-same`). Kits grew about 18k tokens (D32). Codex could not review: its connector asks the account this session posts as to connect; a review subagent read the diff instead. | Phase 2 |
| Phase 2: the store | v0.36.0 | #108, d4b5699 | 18 sets from CC0 libraries (Kenney, KayKit, ambientCG), each download on record: 475 shapes of 1,830 models (silhouette IoU over 8 views: mean .90, no view under .6; median 287 tokens), 68 of 111 materials (129 in the registry with the core's), 460 sprites (exact); every entry in its catalog with what it looks like, every file in its set's ledger; `tavern`, a set cut from five. The Asset Lab (`/asset-lab`) shows every entry. D33, D34. Codex could not review; a review subagent's 12 findings on Phase 1 are fixed in Phase 3. | Phase 3 |
| Phase 3: in the games | v0.37.0 | #109, 7c841bc | Emberdeep's themes dress with shapes one for one (every level laid out as before, D35), its town's still pieces and pines are shapes, its Gallery has an OBJECTS reel; the adventure, rpg and stealth starters and the template game dress with core shapes and one material each. 300 shapes in view: about 4 ms a frame (a hundred barrels cost 57 ms before), the first frame about 0.7 ms a new picture. Every untouched page identical pixel for pixel. The reviews of Phases 1 and 2 (20 findings) fixed. Codex could not review. | Phase 3b |
