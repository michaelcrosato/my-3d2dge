# Changelog

One version number covers the engine, its agent edition, the docs and the games (semantic versioning while the major number is 0: the minor number for features, the patch for fixes). Every change merged to `main` bumps it and adds its lines here, sorted under the parts it touched: **Rendering**, **Animation**, **Art**, **Mocap**, **Engine** (the rest of it), **Emberdeep**, **Characters**, **Tools**, **Docs**.

- `node tools/version.mjs 0.8.0` writes a new number everywhere it lives and opens a section here; `npm test` fails while any place disagrees or this file has no section for it.
- Each deployed page carries its build, the commit it was deployed from: `My3D2dge.build` and `My3D2dge.versionLabel()` (`v0.7.0 · a1b2c3d 2026-10-07`), shown on the Emberdeep title, in its Developer panel, on the Labs page and in the Mocap Lab. Copies built from the repo say `dev-build`.

## 0.8.0 (2026-10-07)

A third playable character, adapted from concept art, and what building it taught the character tools.

- **Characters**: Dan, the Brood-Scythe (`src/emberdeep/22-char-dan.js`, `?character=dan`): a stalking alien beast with two bone scythes for forearms, a horned crown, a spined back, a tail and egg sacs on its hips, about 1.25x the Wanderer. Its custom body has reverse-kneed legs with three-taloned feet, arms solved with IK, scythes that swing on springs, a swaying tail and a slump when it falls; its egg sacs swell and glow as they ripen. Six skills of its own: **Reap** (right, left, then a scissor cut), **Pounce** (a leap that lands impaling), **Harvest Whirl**, **Hatch** (ripe sacs become broodlings that hunt and bite), **Frenzy** (a roar: faster attacks, leech) and **Brood Burst** (a void blast that grows with the brood). Every kill ripens one of six sacs, shown over the skill bar. Its own save, arrival (drops, lands in a crouch, roars), title loop and menu notes. On the autopilot it clears depths 1-10 in 0.73x the Wanderer's time with no deaths.
- **Characters** (the body contract): a body may list the bones that keep their length (`rig.bones`); a character may `prime(h)` its own resource for casts outside real play (the gallery's demos, the sandbox's unlimited resources, the character test); a skill may hold the autopilot back until it is ready (`bot: { ready(h) }`).
- **Tools**: the character sheet measures a body's own bones (a Humanoid's limbs by default) instead of the Humanoid's on every body, and a pop is now a joint that jumps in one step against the steps around it, so a long blade's fast, steady sweep is not flagged. The balance run is repeatable at last (the game's clock now moves only with its steps: slow motion, the death panel and the performance governor read the real clock, so two runs of one hero drifted apart after depth 5), and its summary compares each depth once, with the time and deaths of every try.
- **Emberdeep**: the autopilot measures its progress along the way it wants to go: pressed against a solid prop, the push-out jittered it back and forth fast enough that it never counted as stuck, and a run could stall in place.
- **Docs**: `docs/DAN.md` (from the concept art to the game), and the recipe in `docs/CHARACTERS.md` with the new hooks.

## 0.7.0 (2026-10-07)

Everything merged since 0.6.0 (none of it had bumped the number), plus versioning and the tools for adding a playable character.

- **Tools** (versioning): one number everywhere (`tools/version.mjs`, checked by `npm test`), a deploy-time build stamp (`tools/stamp.mjs`, run by Vercel), shown in the game and the labs; this changelog; `CLAUDE.md` with the rules for every change.
- **Characters**: playable characters are a registry, `def('characters', id, spec)`, like monsters and skills. Every place the game treated the Wanderer and Codex differently (16 checks of Codex's name in 7 files) now asks the character's entry: its body, starting skills and gear, save slot, stats, arrival, title pose, menu preview, paper doll, captured clips and its own animation layers. A new hero is a file of its own and needs no edits to shared code. Nothing a player sees changed: the existing suites pass and before-and-after filmstrips of both heroes match pixel for pixel.
  - The body contract (what the game calls on a hero's rig) is written down in `src/emberdeep/18-characters.js` and checked: `checkRig(id)` drives a body through 14 states, two facings and every view, and names each broken part.
  - A character's `look` sets its Humanoid look under the gear; its Echo and paper doll wear it too.
  - `tools/ed-character-test.mjs`: what every hero must do (its entry and body, the menu and its own save, movement and the dodge, its starting skills, every shared skill with its body, its Echo, the paper doll, arriving in a depth, a potion, a knockdown, death and revival, every view, the title, the gallery, a phone held upright). `npm test` runs it for every registered hero.
  - `tools/ed-sheet.mjs`: the character sheet, one image of the hero in every state and view, a turnaround and game scale on every theme's floor, with numbers a model can trust more than its eye: size per view, palette depth, contrast against each floor, and motion lints (pops, feet sliding, joints under the floor, stretching bones). The same image and numbers every run.
  - `npm run character:check -- <id>`: syntax, build, the character test and the sheet, with a short summary.
  - `npm run new:character -- <id> --body humanoid|custom`: a hero that already passes every check (a dressed Humanoid, or a custom body that keeps the contract) with two skills of its own. `npm test` checks both templates.
  - `tools/ed-balance.mjs --character <id>`: the autopilot plays depths with a hero and with the Wanderer, stepped by hand and seeded (fast, and the same every run), and compares time, deaths and level. Skills say how the bot should use them (`bot: { heal: .65 }`) instead of being special-cased by name.
  - `docs/CHARACTERS.md`: the recipe, from a brief to a checked hero.
- **Emberdeep**:
  - Codex, the Unwritten: a second playable character with its own procedural rig, six signature spells and a separate save.
  - A developer sandbox and an explained tuning panel (every rule number a knob, with search, tiers and reset); customizable keyboard, mouse, gamepad and touch controls; difficulty sliders in 1% steps.
  - Fills a phone held upright, with full screen and a phone HUD.
  - The hero plays 15 captured moments (landing, three deaths, victory, level-up, listening, reaching for loot, flinching and more).
  - The death panel waits for the hero's fall to land.
- **Mocap**: ready-made animation as readable key poses an AI model can read and edit: a glTF importer, retargeting onto the Humanoid, the Mocap Lab, both Quaternius libraries (88 clips), Mesh2Motion (177 clips), 60 moments cut from the CMU motion capture database and every one of its 2,548 takes in the lab's library, with a ledger of all of them. The hero turns, tilts and rolls with a clip; the sword can be put away.
- **Engine**: the agent edition, the essential engine and its manual in one readable file for AI coding agents (`dist/my-3d2dge-agent.js`).
- **Tools**: repeatable, comparable filmstrips (`--seed`, `--compare`); gallery deep links; contact sheets for animation sets; the Labs page (every lab, test page and demo, one tap away); Claude Code cloud sessions (a SessionStart hook, `CHROMIUM_PATH`); the checker's report says which build it checked.
- **Docs**: the README's prop count (38, not 39).

## 0.6.0 (2026-09-28)

- **Art**: the PS1 / N64-era look kit: HD characters (shaded limbs, faces, outfits, hair, armor, sizes), hue-shifted shading (`E.tones`, `E.ramp`), parallax backdrops, textured tiles and wall materials, procedural props, explosions, smoke and fire, the 5x7 font and extruded titles.
- **Animation**: the move library (`E.MOVES`, `E.Combo`), poses and stances, side-view chops, weapon trails, camera zoom and turn; the animation lab kit.
- **Emberdeep**: the signature game, a hack-and-slash that goes down forever: skills and the passive tree, monsters and bosses, loot, Emberhold, one new mechanic per depth, the gallery, the autopilot.
- **Tools**: genre kits and single-file editions for AI remakes; the site on Vercel.

## 0.5.0 (2026-09-27)

- Renamed to my-3D2dge; genre kits and single-file editions for AI remakes.

## 0.4.0 (2026-09-28)

- **Tools**: the single-file AI edition, the API card, the starter game and the headless checker.

## 0.3.0 (2026-09-28)

- **Rendering**: the stress test with a benchmark; crowd optimizations (culling, direct draw, cached walls, shadows and glows, faster rig projection), runtime resolution, frame stats.

## 0.2.0 (2026-09-28)

- **Rendering**: optional WebGPU lighting (shadows, wrap light, glow, heat shimmer) with a Canvas fallback.

## 0.1.0 (2026-09-28)

- **Rendering**, **Animation**: views, rigs, the renderer, lighting and the first examples (as the CO55 2D engine).
