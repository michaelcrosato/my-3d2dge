# my-3D2dge: rules for every change

my-3D2dge is a 2D game engine for AI models (`engine/my-3d2dge.js`), its agent edition (`engine/my-3d2dge-agent.js`), the starter games (`src/starter/`), the labs, and Emberdeep, the signature game (`src/emberdeep/`). Start with `README.md`; Emberdeep's contract is `src/emberdeep/DESIGN.md`.

## The doctrine

`DOCTRINE.md` says what this engine optimizes and why; these rules are how. Its last section says how each principle applies here and what was grandfathered when it was adopted.

- **Two tiers.** Prototypes are the Temporary labs (`src/labs.json`, Temporary: each with its date and the question it answers). Everything else is the engine tier: the engine, the agent edition, the starters and kits, Emberdeep, the kept labs and demos, the mocap store, the tools and the docs.
- **A prototype** carries only what makes it fast to build and easy to judge: a page that plays at a link, and its `labs.json` entry as its pitch. It may reach past the engine's API, and may deviate from any principle except binary assets (say so in one line, `deviates` in its entry). It graduates by leaving Temporary, and is then held to the engine tier.
- **Deviating in the engine tier:** escalate (which principle, your recommendation, why) and keep working on what doesn't depend on the answer. Past 15 minutes with nothing else left, make the call in its own commit and say so in the pull request. Every such call, and every exception, goes in `docs/DECISIONS.md`, which is never cleaned up.

## Sources and built files

- Edit the sources: `engine/`, `src/`, `tools/`, the docs. Never edit `examples/` or `dist/` by hand: run `node tools/build.mjs` and commit what it writes (the site serves those files as they are).
- A rebuild of an unchanged tree changes nothing: the build is byte for byte repeatable.
- No dependencies in the engine or the games, no binary files (images, sounds, models; `node tools/doctrine-check.mjs` lists the approved ones), no network. Match the code around you (dense, commented, plain JavaScript).
- Outside `engine/`, use the engine's public API, not its private members (names starting with `_`); a prototype may. Gameplay takes time only from `dt` and the game's clocks, and randomness only from `Math.random` or `E.rng`, so the test harness can replay it exactly.
- `vendor/` holds the 3D world lab's two pinned libraries (three.js r182, Rapier 0.19.3; `docs/LAB-3D.md`), loaded by that lab only. Never edit them: `node tools/vendor-3d.mjs` fetches them, `--check` verifies them.

## Versioning: every engine-tier change merged to main

A change confined to prototypes (a Temporary lab's own sources and its `labs.json` entry) skips these steps; the commit stamped on the Labs page says which build it is.

1. Bump the version: `node tools/version.mjs X.Y.Z` (minor for features, patch for fixes, while the major number is 0). It writes the number everywhere it lives and opens a section in `CHANGELOG.md`.
2. Fill in that section: one line for each change, under the parts it touched (**Rendering**, **Animation**, **Art**, **Mocap**, **Engine**, **Emberdeep**, **Characters**, **Tools**, **Docs**).
3. Rebuild (`node tools/build.mjs`). `npm test` fails while any place disagrees with `package.json` or the changelog has no section.
4. When you report work, give the version and the commit (`v0.7.0`, `a1b2c3d`). The deployed site shows its own build: `My3D2dge.versionLabel()`, the Emberdeep title, its Developer panel, the Labs page.

## Checks

- Before pushing: `npm run test:changed`. It runs the version, syntax and doctrine checks and every suite that covers a file you changed (read from git against main; a change that only bumps version numbers doesn't count), says why it chose each and how long each took. A change to the engine, the build or the dependencies runs them all. `npm run test:which` shows the choice without running it.
- Push and merge as soon as it passes (squash merge; the Vercel preview needn't finish first). Then run the full `npm test` (every suite, about 25 minutes) in the background: a failure there is fixed forward at once, or the merge reverted. In cloud sessions `CHROMIUM_PATH` is set for you.
- Fast ones while working: `node tools/ed-syntax.mjs --all`, `npm run version:check`, `npm run doctrine:check` (binaries, the manuals' token budgets, the API boundary, the decisions log), `node tools/check.mjs <page>`.
- Look at what you changed: read the screenshots, record a filmstrip for any animation (`node tools/filmstrip.mjs ... --seed 1`, `--compare <the page before>` to prove a change touches only what it should).

## Emberdeep

- New parts plug into the registries with `def(kind, id, spec)` (`DESIGN.md`); shared files stay as they are wherever a registry or a BUS event will do.
- A new playable character: `docs/CHARACTERS.md`, `npm run new:character -- <id>`, then `npm run character:check -- <id>` after every change.
