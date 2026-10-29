# Engine modules

A module is one general system in a small file of its own, `engine/modules/<name>.js`, loaded after the core
(`engine/my-3d2dge.js`) and attached to `My3D2dge`. The core stays as it is; a game carries only the modules it uses.
Which system goes where, and the rules a kit and a module follow, are in `docs/KITS.md` (the genre plan's design rules,
folded in at v0.81.2).

## How one is written

~~~js
/*!
my-3D2dge module GRID v0.60.0: square and hex grids, paths, ranges, fields of view and turns
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

What it holds, its API, a complete example and its rules: this header is the module's manual.

```js grid
const E = My3D2dge, grid = new E.Grid({ w: 8, h: 6 });
if (grid.path([0, 0], [7, 5]).length !== 13) throw new Error('...');
```
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module GRID: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * GRID  square and hex grids: what it holds, in a line
 * ========================================================================== */
/** a doc comment on every public name: the API index is written from them */
class Grid { /* ... */ }
E.Grid = Grid;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
~~~

- **The header is the manual** (`/*!`, so minified copies keep it): its first line names the module and says what it
  is; the third says which editions it loads after ("the full engine only" when it uses a name the agent edition
  doesn't have) and which modules it needs ("Needs: grid, gen."). Then what it holds, its API, a complete example and
  its rules, in at most 1,500 cl100k tokens (`doctrine-check` counts it; a larger budget is a decision in
  `docs/DECISIONS.md` and a line in its table). Its fenced examples run in `contract-test` (and in `agent-test` on the
  agent edition when it loads after it).
- **The code** sits at the first column inside the wrapper, as the core's does, with a doc comment on every public name
  (`node tools/api-index.mjs --missing` lists those without). It uses only the core's public API: `doctrine-check`
  fails on a core-private name (`._x`).
- **The rules of the engine hold:** time only from `dt` and the game's clocks, randomness only from `E.rng` or
  `Math.random`, no dependencies, no binaries, no network, opt-in behavior, and the names agents already know.
- **Where it goes:** `dist/my-3d2dge.js` and the reference editions carry every module; a kit carries the modules its
  slice names in its header (`@modules grid gen`) and those they need; `dist/handoff/modules/` has each on its own.
  `tools/engine-lib.mjs` loads them for every tool.
- **Its tests:** a change to a module runs `contract`, `agent`, `modules`, `kits` and the phone test of the kits that
  carry it (`tools/test-run.mjs`). `tools/modules-test.mjs` proves the whole path with a fixture module.
