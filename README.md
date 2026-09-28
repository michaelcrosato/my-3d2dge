# my-3D2dge

**My "3D" 2D Game Engine.** A general-purpose, retro-modern 2D game engine built for AI models (LLMs). Everything is drawn by code, with no image or sound files, and the whole engine fits in one self-contained HTML file you can hand to any model.

## North star

my-3D2dge exists so that any AI model, including older and smaller ones, can **port, remaster, reimagine and remix games from the 8-bit to 64-bit eras** (NES, SNES, Genesis, N64, PS1), and **build spiritual successors** that play like modern remasters. That means modernized visuals, physics and controls, plus a sandbox for mashing up mechanics across titles and genres.

To get there, the engine ships enough perspectives, genre frameworks, vertical-slice modes, features and gameplay mechanics that the quality stays **consistent**, no matter which model is driving.

## How it works

- **The world is 3D; the camera is a classic 2D view.** Game logic lives in world units (x east, y south, z up; one tile = 16). A view projects the world as isometric, three-quarter, top-down, brawler, side-on or a custom angle, and the same game runs in every one of them.
- **Characters are procedural puppets.** Humanoid and blob rigs are 3D skeletons posed by math every step (IK legs and arms, gait, jumps, attacks, capes) and drawn as crisp pixel art. Small things (coins, ships, bullets, icons) can be pixel sprites written as strings.
- **Genre kits that snap together.** Top-down levels (`TileMap` + `Body`), side-scroller levels (`PlatformMap` + `Platformer`), bullets and patterns, dialog boxes, menus, scenes, chip-tune audio, save data. Any kit works with any other, so a shooter can have RPG dialog and a platformer can have Zelda rooms.

## Share it with an AI model

| File | For | Size |
|---|---|---|
| **`dist/my-3d2dge.html`** | Models with large context windows (200k+ tokens). Readable engine. | ~104k tokens |
| **`dist/my-3d2dge-compact.html`** | Older or smaller models (128k context). Same file with the engine minified. | ~79k tokens |

Attach the file and ask for a game ("remake Mega Man 2's first stage", "a Zelda-like with three dungeons", "a spiritual successor to Gradius"). Each file contains:

1. **The API card**: a quick-start game, a table of coordinates per view, rules, common mistakes, the full API and a genre playbook.
2. **The engine** (no dependencies, no network).
3. **A starter game** with five vertical slices to copy from:
   - ADVENTURE (Zelda-style top-down)
   - PLATFORMER (Mario / Mega Man side-scroller with a 2.5D view)
   - BRAWLER (Final Fight / Streets of Rage beat-'em-up)
   - SHOOTER (1942-style vertical shmup)
   - RPG BATTLE (Dragon Quest / Final Fantasy turn-based)

The model copies the closest slice and replaces the code between `GAME START` and `GAME END`. Opened in a browser, the same file is playable. Press `?` for the API card, and add `#adventure`, `#platformer`, `#brawler`, `#shooter` or `#rpg` to the address to jump straight into a slice.

## Try it

| File | What it shows |
|---|---|
| `dist/my-3d2dge.html` | Title menu plus the five vertical slices. Arrows and Enter; `V` changes the view, `M` mutes. |
| `examples/arena-iso.html` | **Emberwell**, an action-RPG arena in isometric view (Diablo, Bastion) with WebGPU lighting |
| `examples/arena-topdown.html` | The same game in the three-quarter view (Zelda, Stardew Valley) |
| `examples/perspective-lab.html` | One room in every view, with lighting and skeleton toggles |
| `examples/stress-test.html` | Up to 5,000 monsters, 30 shadow-casting torches, particle storms, a benchmark and a copyable report |
| `examples/scarfrunner-side.html` | The standalone side-scrolling prototype that came before the engine |

## What's in the engine

`engine/my-3d2dge.js` has no dependencies.

**Views and rendering**
- Five preset views plus custom views (yaw, pitch, scale).
- Fixed console resolutions: `res: 'nes' | 'snes' | 'genesis' | 'gb' | 'gba' | 'ps1' | [w, h]`.
- Pixel-snapped primitives with world-anchored dithering.
- Depth-sorted rendering with outlines, rim light, hit flash, afterimages and x-ray silhouettes.
- Dithered skies and parallax starfields.

**Characters**
- `Humanoid`, with:
  - weapons: sword, gun, staff
  - hats: cap, pointed, helmet, band, crown
  - capes, jump pose, aiming, kicks
  - squash and stretch, and skeleton debug view
- `Blob` for slimes. Pixel sprites from strings.

**Levels and physics**
- `TileMap` for top-down, isometric and brawler levels:
  - ASCII levels with spawn tags and floor tags, extruded walls and camera cutaway
  - height-aware collision, so bodies can jump onto blocks
  - flow-field pathfinding, and procedural floor textures (stone, grass, dirt, water, planks, checker)
- `PlatformMap` for side-scrollers:
  - tile kinds: solid, one-way, ladder, hazard, background and decoration
  - tile styles: ground, brick, block, bonus, pipe, spikes, liquid
  - drawn flat in the side view and as 2.5D in tilted views
- `Platformer` controller:
  - coyote time, jump buffering and variable jump height
  - ladders, dropping through one-way platforms, riding moving platforms
  - optional double jump, wall jump and dash
- `Body` for top-down physics: friction, bounce, knockback, and jumping onto blocks.
- `Bullets` with patterns (aim, spread, ring), and a `SpatialHash` for crowds.

**Game structure**
- Scenes (title, play, game over) with per-scene view, keys and resolution.
- Pause, timers (`after`, `every`), hit-stop, screen shake and slow motion.
- A camera with bounds and room-by-room movement.
- Save data (`E.store`).

**Input**
- Keyboard, mouse, gamepad and touch (stick plus on-screen buttons).
- Presets for action, platformer and shooter games.
- `pressed`, `repeat` and buffered presses.

**Text and UI**
- A 3x5 pixel font with scale, alignment and word wrap.
- Window boxes, bars and hearts.
- Typewriter `Dialog` boxes with names and choices, and `Menu` with a cursor.

**Sound**
- A chip synthesizer with no audio files: square, pulse, triangle, saw, sine and noise.
- About 30 preset sound effects and a step sequencer.
- Five built-in original songs: title, adventure, dungeon, boss and victory.

**Lighting**
- Canvas lighting with dithered bands.
- Optional WebGPU lighting: colored lights, soft shadows, light wrap, glow, bloom and heat shimmer. It falls back to Canvas lighting automatically.

**Built for models**
- Clear errors in an on-screen box, with one-time warnings for common mistakes (unknown view, action, sound, legend character or wall type, or a bad color).
- Forgiving inputs: `'#rgb'` colors, canvas lookup by id, string presets.

## Genre coverage

| Era genre | View | Kit |
|---|---|---|
| Platformers, Metroidvanias, run-and-guns (Mario, Mega Man, Metroid, Contra) | side, or brawler for 2.5D | PlatformMap, Platformer, Bullets |
| Action adventures and action RPGs (Zelda, Secret of Mana, Diablo, Landstalker) | three-quarter, top-down, iso | TileMap, Body, Humanoid, Dialog |
| Beat-'em-ups and fighting (Final Fight, Streets of Rage, Street Fighter II) | brawler, side | Humanoid attack and kick specs, hitboxes |
| Shoot-'em-ups (1942, Xevious, Gradius) | overhead, side | sprites, Bullets, patterns, starfield |
| JRPGs (Dragon Quest, Final Fantasy, EarthBound) | three-quarter towns, brawler battles | Menu, Dialog, scenes, store |
| Puzzle and arcade (Tetris, Dr. Mario, Pac-Man) | overhead | fixed res, `input.repeat`, pixel primitives |
| 3D-era remakes (Mario 64, Ocarina, Crash) | iso, three-quarter, brawler | TileMap blocks with heights plus Body jumping (z is real height) |

## Build and check

The source of truth is `engine/my-3d2dge.js` plus the game scripts and templates in `src/`. To regenerate `examples/` and `dist/`, run:

```
npm install                  # once: Playwright (checker) and terser (compact build)
node tools/build.mjs
```

This writes the `examples/`, `dist/my-3d2dge.html`, `dist/my-3d2dge-compact.html`, and the engine alone as `dist/my-3d2dge.js` and `dist/my-3d2dge.min.js` (for multi-file projects).

To test any game file in a headless browser, run the checker:

```
npx playwright install chromium   # once
node tools/check.mjs dist/my-3d2dge.html#platformer
```

It presses start and plays the game (move, jump, attack, fire), then cycles the game's views. It reports errors, engine warnings, frame times and how much of each screenshot is filled. It fails (exit code 1) on any error, or when gameplay leaves the screen blank.

## Docs

- `API.md`: the API card, about 7,300 tokens. It is embedded in both single files.
- `AI_GUIDE.md`: the full guide for models and people. It covers frame order, every system, genre recipes, the remake workflow and a pre-handoff checklist.

## License

MIT
