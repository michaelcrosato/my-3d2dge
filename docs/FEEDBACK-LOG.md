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
| The engine's file size | no | F1 | agents still read the source once the index and the handoff package exist (the benchmark measures it) |
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
- **Acted on:** `docs/HANDOFF-VESPER-FEEDBACK.md`: one height-aware spatial API, the clock and caches, a handoff package
  with an index and contract tests, a third-person kit, an HTML UI shell, and a benchmark.
- **Not acted on:**
  - **F1.1** · kits unused · "PlatformMap, Platformer, Blob, bullets, and projectile patterns: these systems did not
    fit the required movement or actors." **No:** they are for other genres.
  - **F1.2** · melee helpers bypassed · "Combat needed explicit rules for height, perception, and takedowns."
    **Watch:** the plan fixes the cause (height-aware tests, actions, perception) and leaves the helpers as they are.
  - **F1.3** · GPU lighting unused · "A single Canvas view kept rendering and verification consistent." **Watch.**
  - **F1.4** · one fixed custom view, for the same reason. It made its own view (yaw 45, pitch 35, scale 1.27) and
    never switched. **Watch.**
  - **F1.5** · passages under things · "The single-column map model also prevents walkable passages beneath roofs or
    bridges." **Deferred:** the handoff's section 6 sketches one solid span per cell.
  - **F1.6** · file size · "The large source file and references to companion tools that were not supplied increased
    inspection work." **No:** reading the source was a symptom of the missing docs and tools, which the plan
    supplies. Input tokens are cheap, and one file is how the engine ships (D5).
  - **F1.7** · device performance · "They do not establish performance on physical phones or native GPUs." **No:**
    principle 10, discovery first.
  - **F1.8** · game-side systems · it added objective and checkpoint-validation modules (1.9k tokens for saves).
    **Watch:** that is game logic until several games write the same thing.
  - **F1.9** · music · seen in its code, not said: it wrote its own quiet, pursuit and win songs (1.8k tokens with its
    sound effects). **Watch.**
