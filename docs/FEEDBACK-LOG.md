# Feedback log

This file keeps the points we did **not** act on from models (and people) who built games on the engine. The same point
coming back from later sources is how a pattern shows, so it can be weighed again. What we do act on goes into a plan
(`docs/HANDOFF-*.md`) and then into the changelog.

- **Sources.** Each round of feedback is a source, numbered `F1`, `F2`, ..., newest last. Each point not acted on gets one
  line (`F1.1`, ...) with a theme.
- **Status.** Each point is one of three:
  - **no**: not a problem for what the engine is for;
  - **deferred**: valid, but not now, with when to take it up;
  - **watch**: handled indirectly, or too early to tell.
- **Patterns.** The themes table counts sources. A theme reaches its threshold at three sources, or at two from different
  model families. Then the next plan takes it up and decides again.
- **Never cleaned up**, like `docs/DECISIONS.md`. A point taken up later is marked **Taken up in v0.x.y** and kept.

## Themes

| Theme | Status | Sources | Take it up when |
| --- | --- | --- | --- |
| Passages under roofs and bridges (one column per cell) | deferred | F1 | a second source asks; the stealth starter needs a bridge it can't fake |
| Side-scroller and shooter kits unused by modern third-person games | no | F1 | if third-person games keep skipping them, give their package a leaner manual |
| Melee helpers (`E.Attack`, `E.Combo`) bypassed | watch | F1 | a game built after the height-aware queries and actions still bypasses them |
| GPU lighting unused | watch | F1 | three sources: rethink its space in the manuals |
| One fixed custom view, views never switched | watch | F1 | three sources: make one view the default for third-person kits and their checks |
| Reading the engine's source (F1: its size) | **threshold** | F1, F2 | reached: two model families. The next plan takes it up: F2.1 lists what the index and cards lack |
| The look below the PS1/N64 bar | watch | F2 | the benchmark's judge scores two more games under 7 |
| `E.Shell` unused, the interface drawn on the canvas | watch | F2 | two more games skip it when their source has a modern interface |
| Not verified on physical phones or native GPUs | no | F1 | a game heads to production (principle 10) |
| Saves, checkpoints and objectives written by the game | watch | F1 | three sources write the same checkpoint or objective code |
| Music written by the game for stealth and chases | watch | F1 | two more sources: built-in `stealth` and `chase` songs |

## Sources

### F1 · 2026-10-10 · Vesper: The Ninth Bell (Assassin's Creed)

- **Builder:** GPT-6 Astra Pro (OpenAI), in a ChatGPT cloud workspace with a shell, Node 24 and headless Chromium 131;
  no web research.
- **Handed:** the full engine as one file, `my-3d2dge.js` v0.17.2 (`dev-build`), and nothing else.
- **Built:** an isometric stealth and parkour mission in one offline HTML file. That is about 50k cl100k tokens of game
  code (30% UI, 16% facades, 16% traversal, sight, guard AI and takedowns), an engine patch (`vesper-1`: the clock,
  flow-field revisions, the FPS counter) and 16 simulation checks.
- **Used:** the renderer, views, `TileMap`, `Body`, `FlowField`, `Humanoid`, input, camera, particles, audio, the font
  and storage.
- **Acted on:** the plan `docs/HANDOFF-VESPER-FEEDBACK.md` (deleted when done; `git show
  8b736f5:docs/HANDOFF-VESPER-FEEDBACK.md`), in six releases: the clock and the caches (v0.17.5, D16), one height-aware
  spatial API (v0.18.0), the handoff package with the API index and contract tests (v0.19.0, D17), a third-person kit
  (v0.20.0, D18), an HTML UI shell (v0.21.0) and the benchmark (v0.22.0, D19).
- **Where its output went** (about 50k cl100k tokens of game code, the engine excluded; the benchmark's baseline):
  UI 15.2k, 30% (HTML 2.8k, CSS 7.7k, glue 1.5k, HUD and minimap 2.2k, results 1.0k: `E.Shell` now, which rebuilds it in
  2.1k); facades and cached detail drawing 7.9k, 16% (the decoration hook and facade options); traversal, guard AI,
  takedowns, perception and markers 7.8k, 16% (the spatial queries, `E.Mover`, `E.ACTIONS`, perception); city layout,
  dressing and floors 6.6k, 13% (the game's content); the simulation core 4.6k, 9% (the game's rules); setup, input,
  rigs and drawing 4.1k, 8% (the `THIRDPERSON` preset and the stealth starter); saves and checkpoints 1.9k, 4% (F1.8);
  music and sound 1.8k, 4% (F1.9). It also ran its own 1/60 s substeps inside the engine's update, not trusting the clock.
- **Plan items not done:**
  - The traversal clip set (Phase 3, item 2: cut from the motion store where code couldn't match a clip): not needed,
    the rig's code states met the bar on filmstrips. The store has them if a game wants captured motion: `ClimbUp_1m_RM`,
    Climb Wall, Ledge Hang, Pipe Climb, Crawl, `Walk_Stealth`, `Run_Stealth`, `Crouch_Walk`, Roll, `Dive_Roll`,
    `Land_Three_Point` and the NinjaJump pair (the Quaternius, Mesh2Motion and CMU catalogs).
  - The benchmark's runs (Phase 5): the tool is built; the runs spend money and wait on the owner (D19).
- **Not acted on:**
  - **F1.1** · kits unused · "PlatformMap, Platformer, Blob, bullets, and projectile patterns: these systems did not
    fit the required movement or actors." **No:** they are for other genres.
  - **F1.2** · melee helpers bypassed · "Combat needed explicit rules for height, perception, and takedowns."
    **Watch:** the plan fixes the cause (height-aware tests, actions, perception) and leaves the helpers as they are.
  - **F1.3** · GPU lighting unused · "A single Canvas view kept rendering and verification consistent." **Watch.**
  - **F1.4** · one fixed custom view, for the same reason. It made its own view (yaw 45, pitch 35, scale 1.27) and
    never switched. **Watch.**
  - **F1.5** · passages under things · "The single-column map model also prevents walkable passages beneath roofs or
    bridges." **Deferred.** The likely shape, when it is taken up, is one solid span per cell: a type gets `base`, so it
    is solid from `base` to `h` instead of from 0. Then collision lets a body pass under when its top is below `base`;
    `groundAt` picks the floor or the deck by the body's `z`; `ray` passes under; `FlowField` gets two nodes in such
    cells; the wall baker draws the span and its underside; and draw order uses footprints (v0.20.0). Spike it first: a
    bridge over a canal and an arch over a street, walked over, walked under and seen through.
  - **F1.6** · file size · "The large source file and references to companion tools that were not supplied increased
    inspection work." **No:** reading the source was a symptom of the missing docs and tools, which the plan
    supplies. Input tokens are cheap, and one file is how the engine ships (D5).
  - **F1.7** · device performance · "They do not establish performance on physical phones or native GPUs." **No:**
    principle 10, discovery first.
  - **F1.8** · game-side systems · it added objective and checkpoint-validation modules (1.9k tokens for saves).
    **Watch:** that is game logic until several games write the same thing.
  - **F1.9** · music · seen in its code, not said: it wrote its own quiet, pursuit and win songs (1.8k tokens with its
    sound effects). **Watch.**

### F2 · 2026-10-11 · the benchmark's Assassin's Creed run ("The Acre Memory")

- **Builder:** Claude Code (Opus 5.5) with `--safe-mode` (none of this machine's instructions or tools), run by
  `tools/agent-bench.mjs`; its brief was Vesper's (F1), minimal.
- **Handed:** the handoff package v0.22.0 (`dist/handoff/`) in an empty directory.
- **Built:** an isometric Acre of sandstone roofs: climbing, guards with sight, takedowns, portrait dialogue, a minimap,
  a title. About 27.5k tokens of game code and a 4.3k-token headless test, in 39 minutes and 185.6k output tokens
  (thinking included); its first build passes `tools/check.mjs` and its test. The subscription's usage limit cut it off in
  its last read-through. It wrote its own headless playthrough bot (a `FlowField` picking the way, input only) to test
  the whole mission. It didn't patch the engine. The judge: 6/10, "strong SNES-era work rather than PS1 polish".
- **Not acted on (yet):**
  - **F2.1** · reading the source · it read the engine below its header 18 times, for: the third-person kit's own
    sections (17b-17d) rather than their index lines; the rig's state keys (`flip`, `hang`: the index lists rig methods
    and fields, not what `rig.update` takes); the backdrop and prop preset names and the backdrop's `sun`; `emissive`;
    `px.blend`; the song format (`steps`, `bpm`); `E.Combo`, `E.Attack` and `game.hitFx`; how `Dialog` holds play;
    hats and hoods; the actor box's size. **Threshold** (with F1): the next plan takes it up, likely as index entries
    for option and state keys, preset lists and the song format.
  - **F2.2** · the look · flat lighting, unshaded foliage, and the hero drawn as cyan x-ray dither while he stands in a
    rooftop recess (the stealth starter's `xray` default). **Watch.**
  - **F2.3** · `E.Shell` unused · it drew its interface on the canvas (`Dialog` with portraits, `E.ui` boxes). The brief
    didn't ask for HTML. **Watch.**

