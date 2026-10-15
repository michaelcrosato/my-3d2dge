# Importing ready-made assets

The asset store (`src/assets/`) holds objects, materials and sprites converted from CC0 libraries, as text a game loads
with one call: `E.addAssets(window.ASSETS['kenney-furniture'])`, then `r.shape('kenney-furniture:bed-single', x, y, 0,
{ facing })`. `docs/ASSETS.md` is the card for using and writing entries; this page is how the store is made, so a model
or a person can add a library the same way. The Asset Lab (`/asset-lab`) shows every entry.

Every entry records where it came from: its set's `sources` hold each download (url, date, sha256 or commit, license and a
hash of the license text as fetched), the entry's `src` names one of them, `orig` the file in it, and `fit` how close it
is. Binaries never enter the repository (principle 4): downloads stay in `.cache/assets/`, and only text is committed.

## The pipeline

```
asset-fetch  ->  .cache/assets/<lib>/        the downloads, and a record of each in the set's catalog ($sources)
             ->  src/assets/catalogs/<set>.tsv   the ledger: every file, its size, triangles, fit, used, flags, a note
asset-sheet --grid                            contact sheets of a set, for curating it
(curate)     ->  src/assets/catalogs/<set>.json  "id": ["tags", "what it looks like"], $skip with reasons, $mats
asset-import ->  src/assets/sets/<set>.js     the set: sources, materials, shapes, sprites, each entry with src, orig, fit
asset-set    ->  a smaller set (a game's own), with the shapes and materials its entries use (src/assets/sets/tavern.js)
asset-find   ->  search every set and the core library
```

| Tool | npm | What |
| --- | --- | --- |
| `tools/asset-fetch.mjs <lib> <name> ...` | `assets:fetch` | Downloads into `.cache/assets/<lib>/`, checks the license (its text names CC0 1.0 or the public-domain mark, and no other license, or it stops), records the download and surveys every file into the set's ledger. `--survey` rewrites the ledgers, keeping their notes (and the rows of downloads not in `.cache`). |
| `tools/asset-import.mjs <set> [--catalog] [--scale k] [--tol .9] [--only a,b] [--list]` | `assets:import` | Converts the set's downloads (below) and writes `src/assets/sets/<set>.js`; `--catalog` takes only the ids its catalog describes, with their descriptions and `$mats`; `--only` converts those ids and leaves the rest of the set and its ledger as they are; `--list` prints the ledger. |
| `tools/asset-sheet.mjs <set file> --grid` | `assets:sheet` | Contact sheets, 30 entries a page, and a page of the kit's colors with the entries using each. `tools/asset-sheet.mjs file.js#id` draws one entry in every view and lints it. |
| `tools/asset-set.mjs a.js b.js --ids x,set:y --name n --out f.js` | `assets:set` | Cuts a set by ids, with every shape they place (`use`) and every material those name, and their downloads' records. |
| `tools/asset-find.mjs "tavern table" [--kind shape] [--show set:id]` | `assets:find` | Searches ids, tags and descriptions; `--show` prints an entry to copy. |

### Models to shapes

1. **Read** each glTF (binary, or `.gltf` with its buffer): z up, metres to units (x16), times the kit's `scale` (in its
   source record, so a re-import keeps it), the footprint centred, the lowest point on the floor. A kit's colors come from
   its palette texture (sampled at each triangle's UVs) or from its materials' color factors. The spec makes factors linear;
   Kenney writes them as sRGB (its renders agree), so its records say `factors: 'srgb'`.
2. **Split** by color (a kit's gradient shades of one swatch count as one color) and by connectivity.
3. **Fit** each color's pieces together first, then halves of them, down to single pieces: the simplest primitive whose
   voxels (the visual hull, skin cells left out) match the part's at an IoU of `--tol` (.9) or better, cheapest in tokens
   first: box, ball, cyl, lathe or prism along any axis, wedge. A part nothing fits becomes boxes merged at a unit. A grid
   of at most about 400,000 cells per part.
4. **Fold** mirrored pairs into `['mirror', 'x' | 'y', part]`, drop parts no view shows, keep 40.
5. **Colors**: the kit's palette is built from every model in its ledger (so names never move): each color named after
   its nearest core material (`oak`, then `oak-b`), keeping the kit's own hex on that material's pattern (D31). A
   curator's `$mats` gives a color another core material's pattern (`"linen": "birch"`: this pale pink is wood), or
   `none` (flat: paint, plastic, small items).
6. **Measure** (below) and write. An entry whose mean fit is under .8, or one of its views under .6, stays out of the set,
   flagged `fit` in the ledger.

### PBR sets to materials

1. The source's id picks the pattern family: Bricks to bricks, WoodFloor and Planks to planks, PavingStones and Rock to
   stones, Tiles to tiles, MetalPlates and Metal to metal, RoofingTiles to shingles, Fabric and Leather to cloth, Grass to
   foliage, Bark to bark, Marble, Concrete, Plaster and Snow to noise, Ground and Gravel to speck.
2. The ramp: the color map's pixels in five clusters (k-means), kept as the material's own `ramp` where `E.tones` misses
   them by more than dE 8, with E.tones' lightness (our light bands) and the clusters' hue and chroma.
3. The numbers: where a line across the height map crosses a joint (the steepest few percent of its slope; of a few cuts,
   the one every line agrees on best), across and along, times the physical size (ambientCG's API gives it in cm), at twice
   life (as props are drawn). Rivets only on riveted plates, at least 6 units apart.
4. The fit: our material drawn flat at game scale against the color map shrunk the same way: the mean color's dE, and a
   structure score (how close the joints' periods and the contrast are, 0 to 1). JPEG maps are decoded by Chromium.

### Pixel packs to sprites

Each tile of the pack's commonest size becomes rows with one character per color, from one palette for the whole pack
(`.` is clear). Tiles with partial transparency are left out (flagged `translucent`). Exact: the assets suite redraws
each sprite and compares it with its source image pixel for pixel, where the download is in `.cache`.

## Adding a library, step by step

1. **Check its license** on its own page, and that it is CC0 (or the public-domain mark). Anything else waits for the
   owner (`DOCTRINE.md`: adding a license is hard to undo). Record what the page says in this file's table.
2. **Fetch**: `node tools/asset-fetch.mjs kenney pirate-kit` (or `kaykit <repo>`, or `ambientcg <ids>`). A new kind of
   source needs a branch in `asset-fetch.mjs` that records `label`, `origin`, `license`, `url`, `fetched`, `sha256` (or
   `commit`) and `licenseHash`, and a `dir`.
3. **Find the kit's scale**: its barrels, chests and tables should stand about 19, 14 and 12 units tall beside the
   26-unit hero. `node tools/asset-import.mjs <set> --scale 2 --only barrel,chest,table` and look at the sheet.
4. **Import it all**: `node tools/asset-import.mjs <set> --scale 2`, then `node tools/asset-sheet.mjs
   src/assets/sets/<set>.js --grid`.
5. **Curate from the sheets**: in `src/assets/catalogs/<set>.json`, describe every entry worth keeping (`"id": ["tags",
   "what it looks like"]`: kind and place in the tags, colors and main parts in the description), put the rest in `$skip`
   with a reason (structural pieces, which TileMap and materials do; conversions that read badly; near-duplicates; things
   under a pixel; characters), and give `$mats` for colors whose pattern is wrong. A set of a few hundred is a job for
   one subagent with the sheets; Phase 2 used one per two or three kits.
6. **Re-import from the catalog**: `node tools/asset-import.mjs <set> --catalog`. Look at the sheets again.
7. **Test**: `node tools/assets-test.mjs` (the store's section: provenance, licenses, catalogs, ledgers, fit, exact
   sprites, every set loads and draws). Rebuild (`node tools/build.mjs`): the Asset Lab inlines every set.

## The sources

Checked on 2026-10-14, each license read where the tool fetched it (its hash is in the set's `sources`).

| Set | Library | License, where stated | Entries |
| --- | --- | --- | --- |
| `kenney-*` (furniture, survival, graveyard, mini-dungeon, food, pirate, holiday, platformer, nature, fantasy-town) | Kenney's 3D kits (kenney.nl/assets) | CC0 1.0: `License.txt` in each zip, and each kit's page | shapes |
| `kenney-tiny-dungeon`, `kenney-tiny-town`, `kenney-tiny-battle` | Kenney's Tiny packs | CC0 1.0: `License.txt` in each zip | sprites |
| `kaykit-*` (dungeon-remastered, furniture-bits, restaurant-bits, halloween-bits) | KayKit by Kay Lousberg (github.com/KayKit-Game-Assets) | CC0 1.0: `LICENSE.txt` in each repository (the itch pages add a non-binding request not to resell unmodified copies) | shapes |
| `ambientcg` | ambientCG (ambientcg.com), 1K JPEG maps | CC0 1.0: ambientcg.com/license | materials |

Not taken: Quaternius' models (its site-wide license now forbids repackaging), CC BY libraries (game-icons.net, the Icosa
Gallery: credit per author, waiting on the owner), copyleft packs (LPC, OpenMoji), and Tiny Swords, Sprout Lands and
Cute Fantasy (no redistribution). The 0x72 and Ninja Adventure packs are CC0 but on itch, which the fetch can't reach.

## Fit

- **Shapes**: the silhouette IoU at game scale against the source's own triangles, drawn through the engine's rasterizer's
  projection, in 8 views (isometric, three-quarter, top-down from the characters' angle, brawler, side, and the
  isometric view turned three more ways): mean and worst; and the color dE of each triangle's own color against its part's.
  The store holds a mean of .8 or better, no view under .6.
- **Materials**: `{ dE, structure }` as above.
- **Sprites**: 0, exact.

## Costs and limits

- A shape costs 60 to 1,000 tokens (40 parts at most); the median converted one about 300, against about 120 for one
  written by hand: write by hand what a game uses often, and cut a set of what it uses (`asset-set`).
- Organic, ornate and structural models read badly or are better done otherwise: plants as generators (`tree`, `pine`,
  `bush`), walls and floors as a TileMap with materials, bodies as rigs.
- A kit color is shared by every entry that uses it: a `$mats` choice can't differ between two entries of one set.
- Glow, lights, flames, moving parts and held items are not converted: add `lights` and `flames` to an entry by hand.
- Kits embed the engine, never the store (D32): a game loads the sets it uses.

## Tests

`npm run test:assets` (`tools/assets-test.mjs`), section 7: every download CC0 or the public-domain mark with its record;
every entry's `src`, `orig` and `fit`; every entry in its set's catalog and every catalog id in its set; every download in
the ledger, every ledger row naming a download, the rows marked used as many as the set's entries; every `$skip` with a
reason; shapes at a mean IoU of .8 and no view under .6; sprites exact against their sources (where fetched); a cut set
equal to the entries it was cut from; every set loads (`E.addAssets`) and every shape in it draws.
