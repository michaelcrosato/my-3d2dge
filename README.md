# CO55 2D Engine

A tiny, dependency-free JavaScript engine for pixel-art games where every character is a procedural rig instead of a sprite sheet. The rigs are recalculated from math every step, so the motion is fluid. Because the world is 3D and the camera is a swappable projection, the same game renders in isometric, three-quarter, top-down, brawler or side view without redrawing anything.

## Try it

Open any file in `examples/` in a browser. Each one is a single standalone HTML file.

| File | What it shows |
|---|---|
| `examples/arena-iso.html` | **Emberwell**, a small action-RPG arena in isometric view (Diablo, Bastion) |
| `examples/arena-topdown.html` | The same game, starting in the three-quarter top-down view (Zelda, Stardew Valley) |
| `examples/perspective-lab.html` | One room in all five views, with lighting and skeleton toggles. Also the starter template. |
| `examples/stress-test.html` | Pushes the engine to its limits: up to 5,000 monsters, 30 shadow-casting torches, particle storms, camera pull-back and a toggle for each expensive feature. Live frame-time metrics, plus a benchmark that rates a device and produces a copyable report. |
| `examples/scarfrunner-side.html` | A standalone side-scrolling prototype that came before the engine: platforming, physics scarf, parallax |

Arena controls: **WASD** moves, the **mouse** aims, **left click** or **J** runs a three-hit combo, **right click** or **E** throws an ember, and **Space** dashes. **V** cycles cameras, **G** switches between GPU and standard lighting, **R** shows skeletons, **T** toggles slow motion. Gamepads and touch are supported. GPU lighting needs a browser with WebGPU (current Chrome, Edge, Safari, and Firefox on supported platforms).

## Views

| Preset | Camera | Genre reference |
|---|---|---|
| `iso` | yaw 45°, pitch 30°, 2:1 pixels | Diablo, Bastion |
| `threequarter` | yaw 0°, pitch 55° | Zelda, Stardew Valley, Enter the Gungeon |
| `topdown` | yaw 0°, pitch 80° | Hotline Miami, GTA 1 |
| `brawler` | yaw 0°, pitch 25° | Streets of Rage, Castle Crashers |
| `side` | yaw 0°, pitch 0° | Mega Man, platformers |

For a custom view, use `new CO55.View(id, label, yaw, pitch, scale, zBoost)`.

## What's in the engine

`engine/co55.js` (about 1,700 lines, no dependencies) provides:

- **Pixel primitives** that snap to whole pixels (lines, discs, ellipses, polygons), with world-anchored ordered dithering for fades.
- **A screen** with a low-resolution buffer, whole-number upscaling and sub-pixel camera scrolling.
- **A fixed-step loop**, plus hit-stop, screen shake, slow motion and a smooth-follow camera with bounds.
- **Input** from keyboard, mouse, gamepad and touch (virtual stick and on-screen buttons), with buffered actions.
- **A depth-sorted renderer.** Characters get outlines, rim light, hit flash, dash afterimages and x-ray silhouettes behind walls.
- **A Humanoid rig** with 3D two-bone IK legs and arms, gait driven by velocity, strafing, lean, attack arcs with sword smears, spin attacks, squash and stretch, and a verlet-cloth cape.
- **A Blob rig** for slimes, with squash and eyes that track a target.
- **A TileMap** with a procedural floor texture baked per view, extruded brick walls with face culling, automatic cutaway of walls that block the camera, and circle collision.
- **Per-pixel lighting** with dithered darkness bands; light pools stay correctly shaped in every view.
- **Optional WebGPU lighting.** Colored lights, soft shadows cast by walls and characters, light that wraps around characters, glow that spills onto nearby surfaces, pixel bloom and heat shimmer, all snapped to dithered bands so it stays pixel art. It falls back to the Canvas lighting automatically.
- **A flow field** for cheap crowd pathfinding.
- **3D particles** (dust, sparks, bouncing bits, embers, ground rings, damage numbers) and a **3×5 pixel font**.
- **Built for crowds.** Off-screen characters are skipped, a direct drawing path skips outline compositing, wall blocks and shadows are cached, per-frame timing stats are built in, and the internal resolution can change at runtime.

## Build

The source of truth is `engine/co55.js` plus the game scripts and templates in `src/`. To regenerate the standalone examples, run:

```
node tools/build.mjs
```

## Using it with AI models

Hand a model any single file from `examples/`. The engine script inside it starts with a short "read this first" block. For the full API, rules and recipes, give the model `AI_GUIDE.md` as well.

## License

MIT
