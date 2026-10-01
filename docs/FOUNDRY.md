# Emberdeep — the Foundry extension

This extends the complete **Emberdeep** game, not a replacement game or an isolated combat slice. The original teal-tunic, red-cape Wanderer remains the default character. Character saves, progression, skills, crafting, bosses and authored depths are retained. Codex remains an optional, separately saved character.

## Play

Open `examples/emberdeep.html` in a modern browser after `npm run build`. The output is one self-contained HTML file; the game, procedural artwork, animation and audio do not download assets. Use the normal title screen to start or continue. `#town`, `#depth-16`, `#gallery` and `#proving` remain available.

WASD / arrows move, mouse aims, LMB / RMB / 1–4 use skills, Space / Shift dodge, Q drinks a potion, E interacts, T returns through a town portal. I opens inventory, K skills, P passives, Esc pause. Gamepad and touch bindings remain available through Controls.

**F8 or the Foundry button** opens the workbench. On touch devices the button joins the existing touch toolbar, rather than floating over its controls. **Vel, the Beastwright**, also opens it from Emberhold. Vel uses the existing articulated humanoid rig, an attached book, a looping gesture script and the normal NPC interaction system.

Previewing is read-only. Choose **Enter disposable sandbox** to make a temporary copy of the hero, then reopen the workbench. Spawn the displayed creature or three copies, close the dialog and fight them. **Restore normal game** discards sandbox changes and returns the original hero to town. Existing developer controls expose damage, health, movement/attack speed, density, XP, loot, invulnerability, resource/cooldown overrides, camera/lighting diagnostics and frame stepping.

## The full game underneath

The retained game provides a three-hit sword combo, dodge and perfect-dodge responses, hit-stop, knockback, juggling, 18 shared active skills with ranks/runes/mastery, a 199-node passive constellation with expanding deep rings, XP, gold, equipment affixes, legendary/unique powers, visible gear changes, stash, salvage, crafting, shops, and a town/descent/return loop. These are existing game systems, not new stubs supplied by this extension.

The authored descent remains unchanged:

| Depth | Level | Introduced mechanic |
|---|---|---|
| 1 | The Powder Vaults | Explosive powder kegs |
| 2 | The Warded Halls | Rune wards |
| 3 | The Sundered Bridges | Chasms |
| 4 | The Howling Galleries | Gale vents |
| 5 | The Molten Throne | Magma; Cinder King boss |
| 6 | The Rime Deep | Ice |
| 7 | The Brood Warrens | Brood nests |
| 8 | The Stormglass Mines | Storm pylons |
| 9 | The Stilled Clockworks | Time wells |
| 10 | The Webbed Lair | Webs; Brood Mother boss |
| 11 | The Lightless Maw | Darkness |
| 12 | The Crimson Rush | Blood rush |
| 13 | The Leaping Spires | Launch runes |
| 14 | The Drowned Aqueduct | Floods |
| 15 | The Shuddering Descent | Tremors; Deep Wyrm boss |

Mechanics are tactical opportunities, not mandatory puzzle gates. After the authored depths, the existing recipe system recombines mechanics, layouts, themes, monster pools and boss patterns. Foundry families enter these **normal gameplay pools starting at depth 16**, not merely the workbench. The first fifteen introductions are not diluted by the new families.

## A versioned creature grammar

`src/emberdeep/48-foundry-model.js` is renderer-independent and data-only. A recipe combines:

`body × compatible behavior × anatomy × attachment × palette × element + seed`

Eight body families are registered: husk, skeleton, knight, slime, wisp, crawler, burrower and eye. Compatibility is explicit. A biped can become a flanker, but a slime cannot inherit sword AI; eye tendrils cannot attach to a humanoid crown socket.

The vocabulary contains **153 valid structural combinations**, or **5,508 combinations including six palettes and six elements**. Those counts describe the finite version-1 vocabulary, not infinitely many unique body parts. Seeded encounters, level recipes, existing boss compositions and future vocabulary additions supply ongoing variety.

This is more than tint swapping:

- Humanoids have longer articulated limbs, heavy builds, hunched posture, joint-anchored crown horns or cloth mantles. Melee reach is remeasured on the resulting rig; warnings retain the native minimum wind-up.
- Slimes vary volume and crest geometry while retaining squash-and-stretch pounce behavior.
- Lanterns have faceted bodies, optional orbiting satellites and either single shots or a weaker three-shot fan with longer recovery.
- Crawlers vary leg length, abdomen volume and egg sacs, using the eight-leg IK rig. Hunters and webweavers use distinct authored behavior.
- Burrowers have ten, twelve or sixteen segments, with optional horns or fins. They retain the underground/surface attack cycle.
- Watchers vary body size and five/eight trailing tendrils, retaining tracking eyes and the native beam warning.

Palette identity and damage element are separate. Damage warnings continue to use the existing element language; they are not arbitrarily recolored to match an outfit.

## Bounded composition

Only eight permanent archetype entries are added. A 128-entry least-recently-used assembly cache reuses measured rig/attack templates; live units retain their own immutable genome. Regenerating creatures does not continually register new archetype IDs.

The data-only pack planner accepts a threat budget and unit cap, bounds its search iterations, and limits ranged bodies relative to the requested cap. Threat values are **authoring heuristics, not calibrated difficulty ratings**. It can leave budget unused; a seed with no fitting candidate can return an empty plan. It does not replace the existing pack director or claim that every native encounter obeys this planner's budget.

Workbench spawning is sandbox-only, limits each call to twelve creatures and the scene to 300 living-list entries, and checks walkable space around the collision radius before spawning. Preview generation never inserts a unit into the live scene.

## Inspection loop for agents

The native workbench supports selection, recombination, four camera projections, idle/run/attack/hurt/death preview poses, pause/step, PNG capture, genome import/export, budgeted encounter export, detached asset inspection, live scene inspection, and dungeon-route audit reports.

**Inspect body and attack reach** reports actual local humanoid joints, measured melee reach, wind-up/recovery times, collision radius, segment/tendril counts and base stats. **Inspect live scene** reports enemies, recipes, registry counts, difficulty and resource counts, plus a bounded 256-event log.

JSON imports have a pre-parse limit of 8,192 UTF-16 code units, use `JSON.parse`, reject unknown fields, invalid values, incompatible parts and unsupported versions, and verify their recipe fingerprint. No imported script, expression, URL or plugin is executed. The 32-bit fingerprint is a reproducibility aid, **not a cryptographic signature or security identity**.

## Agent API

`window.__edFoundry` is separate from the existing `window.__ed` debug API.

```js
const F = window.__edFoundry;
const vocabulary = F.catalog();
const genome = F.compose({
  seed: 'brood-study-07', depth: 31,
  body: 'crawler', role: 'webweaver', form: 'longlimb',
  socket: 'sac', palette: 'verdigris', element: 'venom'
});
F.validate(genome);                        // { ok, errors }
F.inspectAsset(genome);                    // Detached rig/attack metrics
F.preview(genome, { view: 'iso', pose: 'attack' });
F.capture();                              // PNG data URL from preview canvas
F.planPack({ seed: 'room-07', depth: 31, budget: 8, maxUnits: 10 });
F.inspect();                              // Serializable live-scene snapshot
F.auditLevel();                           // Current dungeon only; no mutations
```

Mutating calls require the disposable sandbox:

```js
F.enableSandbox();                         // Copies current hero, returns to town
// Wait until __ed.ED.mode === 'town' and the scene transition has completed.
F.spawn(genome, { count: 3 });              // Safe positions near the hero
F.step(60);                                // Sixty native 1/60 s engine steps
F.travel(31);                              // Developer travel; depth 1–500
// Close the workbench to resume real-time combat.
F.disableSandbox();                        // Restore original hero and difficulty
```

Read operations return detached serializable data rather than mutable live-unit references. The API does not expose arbitrary code execution, filesystem access, network access, or a generic writable registry endpoint. Existing `__ed` remains a powerful developer console, not a security boundary for hostile scripts already executing on the page.

**Agent authoring cycle:** generate a recipe; validate it; inspect body/attack metrics; capture all camera views; test the creature in the sandbox with native damage and status pipelines; export the genome and scene report; add genuinely new vocabulary through reviewed source registries; rerun the tests. A pretty preview alone is not acceptance evidence for a functioning enemy.

## Source and integration

| File | Responsibility |
|---|---|
| `src/emberdeep/48-foundry-model.js` | Deterministic grammar, validation, pack plans, cardinal BFS |
| `src/emberdeep/98-foundry.js` | Runtime assembly, bounded cache, native UI, Beastwright, agent API |
| `src/emberdeep/98z-foundry-input.js` | Join the native touch toolbar without obstructing existing actions |
| `tools/ed-foundry-test.mjs` | Model properties and browser integration tests |
| `.github/workflows/showcase-check.yml` | Existing regressions, Foundry tests, downloadable build evidence |
| `docs/FOUNDRY.md` | This contract and usage guide |

No engine file, existing game core file, character implementation or save format is changed. The sorted-source build includes the Foundry modules automatically. `TOWN.build` and the touch-control synchronization function are extended through their existing interfaces; their original implementations still run.

Build and test:

```sh
npm install
npx playwright install chromium
npm run build
npm test
node tools/ed-foundry-test.mjs
# Fast, dependency-free grammar checks:
node tools/ed-foundry-test.mjs --model-only
```

Tests write evidence under `artifacts/foundry/`. CI retains the built game and source as the `emberdeep-showcase` artifact. On this feature branch only, a separate post-test job commits the rebuilt `examples/emberdeep.html`, preserving the existing prebuilt-static-site deployment contract. That job does not run on `main` or pull-request events, and never force-pushes.

## Verification and limits

The automated suite checks 10,000 deterministic genome round trips, all 153 structural assemblies, 1,000 bounded pack plans, malformed/prototype/oversized imports, connected/disconnected map fixtures, native UI, eight bodies in four camera views, live spawning and full-clock stepping, normal-save isolation, sandbox restoration, authored/procedural pool boundaries and a 390px mobile layout. Dungeon checks cover depths 1, 3, 5, 10, 15, 16, 31, 101 and 500 and write each route result explicitly. Existing regression tests additionally exercise actual touch input, gallery controls, gamepad input, character switching and legacy saves.

A route audit proves only a connected path through walkable cell centers. It does **not** prove full-body clearance, survivable hazard exposure, beatable bosses or good balance. It reports failures rather than secretly carving a passage. Preview rendering uses the real rig classes and a small offscreen adapter for segmented-serpent drawing; live encounters use the full engine renderer, dynamic lighting and occlusion.

Seeds reproduce **recipes**. Combat and incidental animation retain their original random calls; this is not deterministic replay or network rollback. Preview poses are inspection poses, not a replacement for live AI simulation. The vocabulary is finite and extensible; arbitrary limb graphs, mesh import, skinning from external files and Blender integration are not implemented.

Live workbench travel/spawn is bounded to depths 1–500, matching the developer range. Data-only genomes accept deeper safe-integer depths. The inherited exponential stat curves are not arbitrary-precision and eventually overflow; there is no claim of numerically infinite runtime scaling. Extreme depths beyond floating-point range require coordinated stats/progression rebasing, not a cosmetic cap in this tool.

This is a playable extension to the full existing game. The tests are not a claim of release-level balancing, all-device certification, or exhaustive validation of every procedural combination.
