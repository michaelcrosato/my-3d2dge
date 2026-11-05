# Handoff: what the cc-matrix run's 96 builders patched, hit and asked for

> **Status (2026-11-04, at v0.86.0):** open. Written from the cc-matrix run of Nov 3 and 4 (96 builds on the handoff
> package v0.85.2). v0.86.0 landed the quick ones (below); everything else is here, in the order to take it. It is
> temporary: when an item lands, its line goes (say so in the changelog); when none is left, this file goes. What we
> decided not to do is in `docs/FEEDBACK-LOG.md` (F8).

## Where this comes from

- **The run:** `~/dev/cc-matrix/runs/<model>.build__<time>__<id>__<Game>/`, the folders from `20261103-174700` on: 24
  plans by Opus 5.5 (max), each built by Opus xhigh, Opus medium, Sonnet medium and Haiku medium. Each build's
  `work/exit-interview.json` has six `engineFeedback` answers (liked, stuck or guessed wrong, built yourself, hardest,
  what you changed, one thing to change), and `work/<Game>/` holds its copy of the engine as the builder left it.
  `~/dev/cc-matrix/audit.json` is the run's audit (ENGINE-1 to ENGINE-4, TEST-1: tagged from the answers, not
  reproduced). Weigh Opus first, then Sonnet; Haiku cut features and says so.
- **The patches, measured:** each build's `my-3d2dge.js` and `modules/*.js` diffed against v0.85.2's
  (`git show 4390a98:dist/handoff/my-3d2dge.js`), every hunk placed in its engine section. 79 of 96 builds changed the
  engine (all 48 Opus, 20 Sonnet, 11 Haiku). Builds that changed each place (engine files only; more patched it in
  their game's code):
  | What | Builds |
  |---|---|
  | the button symbols' default (`STANDARD_SETTINGS.glyphs`, `Input.glyphs`) | 53 |
  | the Humanoid (weapons 12, hats 13, outfits 6, draw hooks 7, held poses 4) | 37 |
  | an audio bus or a voice bus | 35 |
  | the font tables (✕ ○ □ △ in 29) | 32 |
  | `E.Dialog`'s voice per letter | 28 |
  | the AI Hub's Create + Options kept from the pause | 20 |
  | the players' section (glyphs for a joining player, half keyboards) | 12 |
  | E.Shell (settings rows on any screen 8, a TV size 6) | 15 |
  | `E.HOOKS` exported (a per-step hook), analog triggers | 8, 8 |
  | the floor bakes' cache size raised (6 to 10-16) | 6 |
- **Checked:** every bug below was read in the code at v0.85.2 and, where it runs headless, reproduced in Node; the
  3D ones in Chromium (WebGL 2 on SwiftShader). Each says what it is: **confirmed**, **partly**, **by design** (then the
  fix is a doc), or what the builder actually hit.

## Already done in v0.86.0 (don't redo)

The font's ✕ ○ □ △ − and marks and accents (both editions); a standard setting's default from the game
(`menu.settings: [{ key: 'glyphs', value: 'playstation' }]`) and the controller's settings on every player;
`E.Dialog`'s voice function, `say({ voice })`, `width`; `audio.bus()` and the voice bus; the rig's `NaN` from `vx`
without `vy`; the music's look-ahead with an audio offset; a script's `tap`/`hold` no device, a tap leaving a hold,
`feed('move')` a mouse move, a real mouse move setting `lastDevice`, a script's pad codes kept with no pad;
`after`/`every` `{ keep: true }`; the floor bakes' least-recently-used drop; `window.Mocap`; the card's lines and D77;
the handoff README's 3D pointer and headless pitfalls. Tests: `matrixFixes` in `tools/contract-test.mjs`, part 5 of
`tools/audio-test.mjs`.

## Rules for this plan

- **Reproduce first.** A failing check before the fix: in `tools/contract-test.mjs` (`matrixFixes`, or its Node part
  for anything headless; its browser part for drawing), `tools/kit3d-test.mjs` for the 3D engine, `tools/views-test.mjs`
  for mode7 and road. Run it against the old code once to see it fail.
- **Headless stays the browser's twin** (principle 5). Never make a headless game behave differently from a page
  (`game.go` keeps its fade; a test advances past it or sets `game.fadeTime = 0`).
- **Make room before adding.** The kits sit near their budgets (cl100k, as `doctrine-check` counts; `gpt-tokenizer`'s
  default `encode` is o200k and reads high). v0.86.1 gave each about 2,650 back (the fonts as digit rows): adventure
  207,306 of 210,000, rpg 238,221 of 241,000, brawler 203,988 of 207,000, rts 204,769 of 208,000, shooter 220,660 of
  224,000, sim 206,399 of 210,000; the API card 21,027 of 21,100; the agent header 9,974 of 10,000. The card's "Common
  mistakes" (Part 8) and any line a part adds come out of that room, not new raises.
- **Both editions:** a bug in code the agent edition has is fixed there too; an addition may stay the full engine's
  (the agent edition's API is a subset: `npm run test:agent`).
- **Process:** `CLAUDE.md`: a version per pull request, its changelog lines, `node tools/build.mjs`,
  `npm run test:changed`, squash merge, then `npm test` in the background. Each budget raise or design call in its
  own commit, with its line in `docs/DECISIONS.md`. A big design (marked **prototype**) starts as a Temporary lab
  (`src/labs.json`: its date, the question it answers) for the owner to judge, and graduates only on their word.

## Part 1: input, and the AI Hub's controller

- **1.5 Analog values:** `input.value(a)` 0 to 1 (a pad button's `value`: the triggers; a key or scripted hold 1). 8
  builds (SnipeoutHD, OutBloom, Crackmania x2).
- **1.6 More bindable codes:** the right stick as `PadRAxisUp/Down/Left/Right` (KarateChampon x2), the mouse wheel as
  `WheelUp`/`WheelDown` (TideCrisis x3, DragonQuilt), with labels and rebinding.
- **1.7 Touch off for good:** `new E.Game({ touch: 'never' })` (AheadOrAlive x2), and a standard "Controller or keyboard
  required" notice with Settings for a touch-only device (the run's brief asks for it; 5 games missed it, about 10 ran
  off a portrait screen).
- **1.8 A per-step hook:** `game.hook('step' | 'input' | 'enter', fn)` (returns its removal): `HOOKS` is private and 8
  builds exported it (an attract-mode watcher, an idle timer, a hub guard that runs while paused).
- **1.9 Move-stick inversion** (the brief asks every game for invert X and Y toggles for a known pad fault): standard
  Controller settings `invertMoveX`, `invertMoveY` (off), beside `invertY` (aim).

## Part 3: 2D rendering and cameras

- **3.1 The floor bake follows the zoom** (four Opus builders made it their one change; three more got stuck on it;
  six raised the cache). The bake's key holds `view.scale`, so a camera that zooms smoothly re-bakes the whole floor
  every frame (`TileMap._floor`). Bake per view angle at one scale and draw it scaled while the zoom moves, re-baking
  crisp once it settles (as the player's own zoom does: `_zoomApply` after .25 s), or bake at the largest scale and
  sample down. Hold the cache to a byte budget (`floorBytes()`), not a count.
- **3.2 Sprites and props scale by the zoom alone** (confirmed: `r.sprite`, `r.prop`; rigs and maps by the view's
  scale times the zoom; MashTV's pickups drew tiny at zoom .6). Expose `r.ppu` (pixels per world unit) and a sprite
  option to scale with the world, and say on the card that a sprite's pixel is a screen pixel at zoom 1.
- **3.3 The views' scales** (5 Opus builders were surprised that threequarter and side draw 1.5 pixels a unit at zoom 1:
  "zoom 1 was far too close"). The card's Coordinates table gives each view's pixels per unit.
- **3.4 A perspective camera for 2D games** (**prototype**; the most asked-for addition: 13 runs, and all four Big Buck
  Hunter and all four Time Crisis builders wrote their own renderer). First, point light-gun and first-person games at
  the 3D engine (the README does now). Then a light-gun gallery on the mode7 module as a Temporary lab: `m7.pick(x, y)`
  (the billboard or shape under the crosshair, by its drawn box), `m7.wall`/`m7.quad` (world polygons sorted with the
  billboards), shapes with their params (3.5), lights; or a perspective `E.View`. The owner picks.
- **3.7 `E.Road` scales x by W/2 and y by H/2** (confirmed: `engine/modules/road.js` 80; the up-to-across ratio is .56 at
  427x240 and 1.78 upright, so a wide screen squashes the world; OutBloom and DenshaDeHalo wrote square projections).
  One focal length, behind an option first (`square: true`), then the default with the ROAD kit retuned, filmed
  before and after (`node tools/filmstrip.mjs ... --compare`).
- **3.8 What joins the x-ray mask** (confirmed: an occluder queued without `box` counts only if a fixed 48s x 140s box
  round its anchor meets a silhouette, `engine/my-3d2dge.js` near 2171; a long wall anchored at its end was skipped;
  DragonQuilt x2). Document `r.queue`'s `box` and `top`, or keep each occluder's drawn bounds as actors' are.
- **3.9 Big geometry sorts by one point** (confirmed, inherent; Bentou, IceHoc, AheadOrAlive, Europhoria). Say so, and
  add a helper that queues a span (a long wall, a roof) a cell at a time, as the engine's own walls are.
- **3.10 FlowField and solid shapes** (partly: a field is bound to the map it was made with, by design: a new map takes
  a new field, which the card can say; but `map.solid` shapes are confirmed ignored: `FlowField._top` reads the
  cells, `blocked` and `height`, not the solids, so agents path through a crate; Bentou2). Read the solids' tops,
  bump `map.version` when one is added or moved; and fields with several targets (the nearest hero: Gauntletdown).
- **3.11 Colours other than hex draw magenta** (partly: it warns once; rgb(), hsl() and names are refused). Parse
  `rgb()`, `rgba()`, `hsl()` and the CSS names into hex where the colour helpers take a colour; let `px` take
  `E.hex`'s `[r, g, b]` too, or say on the card that it can't.

## Part 4: the Humanoid

- **4.1 Open registries** (37 builds changed the rig: weapons in 12, hats in 13). The weapon list is closed
  (`['sword', 'gun', 'staff']` in the constructor). `E.Humanoid.weapon(id, { length, rest, grip, draw })`,
  `E.Humanoid.hat(id, draw)`, a draw hook with the projected joints (`o.draw: { under, over }`) for outfits and
  accessories, named held poses as data (`E.Humanoid.pose(id, (J, w) => ...)`, blended by weight), and a whole-body
  tilt and roll for dives, falls and acrobatics (Europhoria, Olympiyikes). Every built-in weapon, hat and pose moves
  onto the same registries (the proof that they are enough).
- **4.2 `Math.random` in the rig** (confirmed: one call in the constructor, one in the blink): give each rig its own
  stream (a seed in its options, else a counter), so a headless run's rig state is the same twice. TideCrisis reseeded
  every rig's clock by hand.

## Part 5: sound

- **5.1 Effects with pan and length:** `sfx(name, { pan, loop })` returning `{ stop(), set({ pan, vol }) }`, and
  continuous loops (an engine, rain) that follow the bus.
- **5.2 Instruments of a game's own** (9 builds extended the synth): `audio.instrument(name, (ctx, bus, time, freq,
  dur, vol) => ...)`, usable as a music track's `wave`.

## Part 6: menus and the Shell for a TV

- **6.1 `E.Menu` at scale 1 with no scrolling** (TV readability came up in 36 runs; four builds wrote their own menu).
  `new E.Menu(game, items, { scale, rows })` with the list scrolling under its cursor, the mouse hovering, the rows
  from `update` (2.1).
- **6.2 The Shell's 14 px text:** a theme scale for ten feet (`new E.Shell(game, { theme: { scale } })`, or `tv: true`:
  OutBloom's `clamp(18px, 1.6vw, 30px)`); `theme.font` is a family, not a CSS shorthand (two runs' menus came out tiny):
  warn on a shorthand.
- **6.3 Settings rows on any Shell screen** (8 builds): a screen of the game's own lists setting keys as rows
  (`rows: ['glyphs', 'invertY']`), drawn and changed as the settings screen's are.
- **6.4 The font's characters on the card**, and what it does with any other (`?`), so a game knows before it prints.

## Part 7: the 3D engine

- **7.5 A racer's track** (**prototype**; 7 of 8 WipeoutHD and TrackMania builders wrote their own track physics;
  ribbon tracks, loops and branches asked 12 times). A ribbon track with loops and any banking, its own colliders, and
  queries in track space (along, across, up); and a road (`E.Road`) that branches at a junction or runs several
  tracks (OutBloom, DenshaDeHalo forked road.js for it). Each as a Temporary lab first.

## Order and size

Landed: Part 9 (the suites' own failures) in v0.85.3, Part 0 (the room) in v0.86.1, and in v0.87.0 1.1 to 1.4, 1.10,
Part 2, 3.5, 3.6, 7.1 to 7.4 and Part 8. Then 1.5 to 1.9, 3.1 to 3.3, 3.7 to 3.11, Parts 4 to 6 (medium); the prototypes
3.4 and 7.5 last, for the owner.
