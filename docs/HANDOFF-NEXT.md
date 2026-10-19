# Handoff: the next plan (the five themes at their threshold)

> **Status: in progress.** Written 2026-10-19 against v0.51.4. Each phase is one pull request and takes the next minor
> version when it merges (the plan itself and its folding in, a patch). The progress table is [section 9](#9-progress).

`docs/FEEDBACK-LOG.md` has five themes at their threshold, each waiting on "the next plan": this is that plan. It takes
each theme up, checks what the builders said against the code, decides, and splits the work into phases. It is for the
agent that implements it. It is temporary: when the last phase lands, what lasts moves into `API.md`, `AI_GUIDE.md`,
`docs/STANDARD-FEATURES.md` or `docs/DECISIONS.md`, each theme's row in the feedback log says **Taken up in vX.Y.Z**,
and this file is deleted, as v0.38.1 and v0.43.3 did with finished plans.

| Theme | Sources | What still lacks (section) |
| --- | --- | --- |
| GPU lighting unused | F1, F6 | its place in the manuals (1) |
| Reading the engine's source | F1-F4, F6 | the cards' part (2) |
| The look below the PS1/N64 bar | F2, F3, F4, F6 | the hero's x-ray dither (3.1); three-quarter walls stacking into flat planes, the iso void (3.2) |
| `E.Shell` unused | F2, F3, F4, F6 | the template and the stealth starter (4) |
| Climbing any wall and gliding written by the game | F3, F4, F6 | `E.Mover` (5) |

Every builder started from the same three things: `API.md` read whole, the template game (`src/handoff/game/`) and,
for the third-person briefs, the stealth starter (`src/starter/70-stealth.js`). So this plan changes those three first,
and the engine where they can't do it alone. Line numbers are v0.51.4's (`engine/my-3d2dge.js` unless named).

## 1. Lighting: from an extra to a step of the look

**Checked.**
- Canvas lighting (`game.lights`, section 7, `class Lighting`) is off by default (`enabled = false`, `ambient = .15`).
  No `E.Game` or scene option turns it on; lights are cleared every frame and added in `draw`.
- GPU lighting (`game.enableGPU`, section 22) works in ground views only (pitch over 5: `view.inv`), with 32 lights. It
  "falls back to Canvas lighting by itself" (`API.md` :196) only if the game also set `game.lights.enabled`: `_finish`
  (1966-1981) takes the GPU path when `r.gpu`, else canvas lighting when `game.lights.enabled`. The adventure starter
  sets `L.enabled = false` (10-adventure.js:253), so without WebGPU it has no lighting at all.
- `API.md` gives lighting two lines (:194, :196) in "Effects and lighting", near the end. The quick start, the Look
  target ("Every game should use all of them", nine steps) and "Before you hand the game back" never name it. The agent
  header names "lighting" once, as a full-engine extra (:7-8). The handoff README doesn't.
- Users: Emberdeep and the arena light heavily; of the starters only the adventure (GPU) and the RPG (canvas, while a
  spell dims the scene) use the engine's lights; the platformer writes its own light pass; the stealth starter is dusk
  with lit windows and `L.enabled = false` (70-stealth.js:114); the template has no lighting.
- Doc faults: `lights.add`'s comment says its options are "GPU lighting only" (1271), but canvas lighting uses `color`;
  `darkness`, `tint`, `screen` and `r.glowMask` are read but never set as fields, so `API-INDEX.md` lacks them.

**The call.** Lighting becomes a step of the look, shown working where builders copy from. The builders' reason (F1.3:
"a single Canvas view kept rendering and verification consistent") holds for GPU lighting, which headless checks don't
see; canvas lighting draws the same everywhere, so the cards lead with it and keep GPU lighting as the upgrade.
- `API.md`: a Look target step, "Light every scene" (canvas lighting: an ambient of .4-.6 and a few warm lights on the
  props that would give them; GPU lighting for ground views where WebGPU is wanted), and "lights" in the hand-back
  checklist. The two lines in "Effects and lighting" are kept, shortened where the step says it.
- `game.enableGPU()` falls back by itself: where the GPU path can't run, canvas lighting draws (a flag the game set to
  false, as the adventure's Fast setting does, still wins). Check the adventure's Auto, GPU and Fast settings and its
  phone test.
- The fields are set in the constructor (`darkness`, `tint`, `screen`) with doc comments, `r.glowMask` gets one, and
  `add`'s comment says which options are GPU only.
- The template game and the stealth starter light their scenes (dusk: a lamp, the lit windows, the gem's glow), so
  `tools/check.mjs` screenshots show it. `npm run test:phone` measures what it costs on a phone.
- The agent header names `game.lights` and `enableGPU` among the full engine's extras (a few tokens).

## 2. The cards: what the runs read the source for

**Checked** (36 facts the runs went to the source for, v0.42.0 to v0.51.4; the card's content hasn't changed since
v0.42.0): 21 are on `API.md`, 3 partly, 11 only in `API-INDEX.md`, and one nowhere (posing a limb by hand; `AI_GUIDE.md`
:456-459 hints). The rig and `Dialog` were what every run looked up.
- `rig.update` reads 25 keys (3091-3187); the card names 19. It lacks `crouch` (a sneaking gait), `sprint`, `hang`,
  `hangZ`, `flip` and `land`, the keys a game writing its own climb or roll needs (F3, F4 and F6 all did).
- `Dialog`: the card has all of `say()`'s options, but not that `update` returns true while a modal box is open, that
  choices show on the last page, or the constructor's options.
- Only in the index: the third-person preset's keys and actions; what `map.bounds` returns; the scene fade
  (`game.fadeTime`, `{ fade: 0 }`); `game.hitstop`; `r.sightCone`'s options; the backdrop's `sun`; `setView` taking a
  `new E.View(...)`.
- Where to look: the card says "every public name, one line each: `API-INDEX.md`" in one clause (:95). Only the handoff
  README says grep the index and don't read the source. The agent header never names the index and shows how to grep
  the source's banners. The full engine's header cites source sections ("17b-17d", "21d", "10c"), and
  `tools/api-index.mjs:42` matches sections with `(\d+b?)`, so sections 10c, 17c, 17d, 21c, 21d, 21e and 21f never
  become index headings: a builder searching for "17c" finds nothing in the index.
- Names: the card and `AI_GUIDE.md` call the Mover `hero` (:168; guide 241-246, 420-427), while the index files it as
  `mover.` (`hero.` is the Platformer's); the card's `bg.draw` is `backdrop.draw` in the index.

**The call.** The card answers what the runs went to the source for, and says where to look first. D20 holds: the card
stays within 15,000 tokens by moving detail out, not by raising the budget.
- Add (about 260 tokens): the six traversal keys; the third-person preset's keys and actions; `bounds` returning
  `{ x0, y0, x1, y1 }`; the fade and `game.hitstop`; `Dialog`'s modality, last-page choices and constructor; a line
  before the quick start: "Look names up in `API-INDEX.md` (grep it: members are filed under instance names, `rig.`,
  `talk.`, `mover.`, `flow.`), not in the engine's source"; `mover` for the Mover in the card and the guide.
- Make room (about 300): the sessions bullet (:96) and the motion-clips bullet (:221) become one-line pointers; their
  detail is in `AI_GUIDE.md` (337-363, 469-473) and the headers.
- The agent header names `API-INDEX.md` ("if you have it: † marks the full engine's names") and `down` among the rig's
  keys.
- `tools/api-index.mjs` takes lettered sections (`(\d+[a-z]?)`), and the doc comments the index is built from gain what
  the card has and they lack: `talk.say`'s options, `rig.update`'s keys, `r.actor`'s `emissive`, and that a hood takes
  `colors.hair`.

## 3. The look

### 3.1 The x-ray

**Checked.**
- X-ray is opt-in per actor (`r.actor(..., { xray })`), on for the hero in the stealth starter (`{ actors: true }`,
  70-stealth.js:192) and the adventure (`true`, 10-adventure.js:497), with no outline.
- Once an x-ray actor is drawn, every later wall block, every `r.prop` and `r.shape` (both hide by default: 1652, 6930)
  and, with `actors`, every body that overlaps the silhouette's box goes into the mask (`_flush`, 1920-1927). No
  threshold and no height test: a blade of grass at his feet, or the top of the roof block next to the one he stands on,
  hides him.
- The hidden part is a 2x2 checker of flat `#8fe3ff` (`_checker` 1483-1485, `_flush` 1930-1938), whatever
  `E.style.trans` says. The frame's default style is `'alpha'` (351): smooth skies and glows, then a NES-era dither on
  the hero. Judges took it for a glitch (F2.2, F3.2). Emberdeep already adds an outline because "the checker alone read
  as a faint dither" (20-hero.js:375); the starters don't.
- The agent edition draws no x-ray; no test covers it.

**The call.** The x-ray shows a hidden body clearly, and only when something hides it.
- In the `'alpha'` style the hidden part is a translucent tint (about 40%) with a 1-px outline, both by default; the
  checker stays for `'dither'` (`r.xrayColor` and `xray.outline` still override).
- An occluder whose top is at or below the actor's feet doesn't hide it; a prop or a shape lower than
  `E.HEIGHTS.chest` (22: grass, flowers, bushes, crates, barrels, fences) doesn't hide by default (`hides: true` still
  makes one).
- The starters keep their options and get the new default. A filmstrip of the stealth starter and the adventure,
  `--compare` with v0.51.4's, shows the change and nothing else; a test in the contract suite pins the rules (a low
  prop doesn't hide, a wall does, the roof under the feet doesn't).

### 3.2 Walls with depth, and the iso void

**Checked.**
- The wall baker (`TileMap._box`, 4486-4534; the agent edition's at 2637-2680) draws a face only if it faces the camera
  (4491): three-quarter (yaw 0) shows south faces only, iso south and east faces. Each face is shaded against
  `map.light` = `(-.6, -.8)` (4141, 4495-4496): south gets .8 and east .6, both over .2, so **both iso faces are
  `sideLt`, with the same material band** (4500). In three-quarter every front face is `sideLt`.
- Top edges get a light line on their north and west sides only (4529-4533): none on the front edges, no line at the
  iso corner between the two faces, no outline, no cast shadow (the floor's contact shadow only, `ao`).
- In three-quarter a 40-high face is 46.5 px tall and a cell 19.7 px deep, so a pillar one cell in front of a wall
  lays its top on the wall's face, in the same colour: "walls and pillars stack into flat planes" (F4.2).
- Shapes already have what walls lack: a view-relative light (`shapeLight`, 6742-6745: in iso the top .78, the south
  face .63, the east face −.01), four bands, lit edges and a 1-px outline (6739-6829).
- The bake cache's key (4450) leaves out `map.light`.
- The iso void (F6.2): the camera is clamped to the map's bounding rectangle (`bounds` 4370-4374, `_camStep`
  2371-2377), and the floor bake leaves pixels outside the map transparent (4391). The corners show the sky, a
  `Backdrop` (side-view parallax: it drifts with `r.iy` and fills below its layers with a dark tone, 6345-6362) or the
  `bg`. The template (iso, `expand: true`, a 12x9 map, a dark `r.sky`) shows it on every screen.
- `API.md` :42 says "Backdrop behind every level"; `AI_GUIDE.md` :49 gives ground views textured floors instead.

**The call.** Walls get the shapes' light and edges, and the floor reaches the edge of the screen.
- `_box` shades faces with the shapes' view-relative light and bands (`sideLt` and `sideDk`, when a type gives them,
  stay its lit and dark colours: the brawler sets `sideLt`, 50-brawler.js:308), draws a lit line on the top's
  camera-facing edges and the iso corner, and a dark line where a face meets a lower neighbour. Both editions; the light
  joins the cache key.
- The floor bake fills what lies outside the map with ground (the edge cells' floor, darkened and fading), so no view
  shows a void; `map.outside` sets its colour, or `false` keeps today's transparent edge.
- `API.md` :42 says a Backdrop is for side views and a sky for ground views (as the guide does); the template gets a
  sky that matches its dusk.
- Three-quarter keeps yaw 0 (a turned view would change every game's coordinates and art). Logged in the feedback log
  as **watch**: if the shading and edges don't separate pillars, a small yaw is the owner's call.
- A filmstrip of every starter, `--compare` with v0.51.4's; `npm run test:phone` for the cost (the bake is cached).

## 4. `E.Shell` in the template and the stealth starter

**Checked.**
- `E.Shell` (section 21d, 7386-7857) is a whole HTML interface: screens (title, pause, settings, controls, help,
  results, map), a HUD (`objective` with the distance, `status`, `place`, `tip`, `bars` or pips, `counts`, `prompt`
  with the player's own key and a hold, `keys`, `buttons`, `minimap`), `toast` and `tutorial`. Headless it builds no DOM
  (`root` is null) and keeps its screens' names.
- Every full-engine game already shows it: the standard pause, settings and controls (D21) are `E.Shell` screens
  (`new Shell(this, { system: true })`, 2258).
- Its only use was the Vesper prototype, deleted in v0.51.4 (D44). `API.md` gives it one line (:140), the agent
  header none (the agent edition has a stand-in that warns once), `AI_GUIDE.md` one section (289-295), and the guide's
  look advice and checklist steer HUDs onto the canvas (:53 "`E.ui.box` gradient panels", :495 "the HUD uses screen
  pixels").
- It has no dialogue: every benchmark game's talking characters used `E.Dialog` on the canvas, which is right for
  portraits and the pixel look.
- The stealth starter's interface is one `r.overlay` (70-stealth.js:195-213: hearts, the ledger, HIDDEN or CROUCHED,
  a message box, MISSION COMPLETE, a line of keys) and `say()` messages; nothing tells a keyboard player when a
  takedown is possible. The template's is four lines (game.js:102-105: the objective in text and an alert bar).

**The call.** The template and the stealth starter use `E.Shell` for their HUD, so builders copy an HTML interface
and see it work; dialogue stays on the canvas.
- Stealth: `ui.hud({ objective: { title, at, from }, bars: [hearts as pips], counts: [the ledger], status, prompt:
  { act: 'attack', label: 'Take down' } when a takedown is possible, keys })`, `ui.toast` for its messages,
  `ui.show('results')` at the end. The guards' marks and suspicion stay in the world (`r.marker`).
- Template: the objective with its distance, the alert bar and the keys in `ui.hud`. Its title and end screens stay
  pixel art (the look's typography step), and its headless test presses start on the end screen, which an open `E.Shell`
  screen would hold back.
- `API.md`: the Look target's typography step, or the hand-back checklist, says a modern adaptation's HUD is
  `E.Shell`'s (about 30 tokens); `AI_GUIDE.md` :53 and :495 say when canvas and when HTML.
- Check: the template's headless test reads `game.debug.snapshot()` and still passes; `tools/standard-test.mjs`
  (a game's own Shell takes over from the system one) and `npm run test:phone` (the HUD clear of the touch buttons on
  an upright phone).
- Left for later (logged as **watch** under the theme): a dialogue piece in `E.Shell`, if a later source still draws
  its interface on the canvas.

## 5. Climbing any wall, and gliding, in `E.Mover`

**Checked.**
- `E.Mover` (5677-5806) climbs ledges up to `climbMax` (82) from the ground or coyote time, by a jump press:
  `_parkour` picks `vault`, `climbUp`, a gap leap or `hopDown` (5765). There is no mid-air grab, no climbing a face
  taller than `climbMax` (the press is a plain jump), no glide and no stamina; held jump is never read.
- `E.ACTIONS` is an open registry (`{ beats, cancel, safe, setup, at }`); `climbUp` can start part way up a wall
  (`reach`, it hangs from `max(f.z, L.z - reach)`). `Action.update` always ends with `onGround = true` (5655-5659),
  so an action that ends on a wall needs a flag.
- The rig has `climb: true` (hand over hand) and `hang` + `hangZ` (hanging from an edge); its climb cycle advances with
  `|vz|` only (3123), so climbing sideways wouldn't animate. There is no glide pose (a glider can hang high: `hang`,
  a large `hangZ`).
- `TileMap` walls are columns (0 to `h`); a face lies between a cell and a lower neighbour (the wall baker walks them,
  4489-4493). The queries `ledge`, `landing`, `drop`, `standable`, `ray` and `_walk` exist in both editions.
- The template climbs with its own code on `E.Body` and `map.ledge` (game.js:61-72, `climb: true`, `vz: 60`): the
  pattern F3 and F6 extended into their own climb-any-wall (about an eighth of F3's code). The stealth starter's hero
  and guards are Movers. The agent edition has no Mover (it throws).

**The call.** `E.Mover` climbs any wall and glides, both opt-in (the stealth guards are Movers and keep their ways),
full engine only.
- `map.wall(from, dir, { reach })`: the wall face a body touches or faces, `{ nx, ny, x, y, bottom, top }` (cells and
  `map.solid` boxes).
- Climbing (`mover.climbAny = true`): a jump press at a face taller than `climbMax`, on the ground or in the air,
  latches; the stick moves him up, down and along the face as the screen shows it (up the screen is up the wall); outer
  and inner corners turn him onto the next face; a jump press leaps up or away (a `climbJump` action that ends on the
  wall); at the top he pulls up with `climbUp`; crouch lets go. `rigState` gives `climb` facing the wall, and the rig's
  climb cycle advances with sideways speed too.
- Gliding (`mover.glide = true`): a jump press in the air, past coyote time and above `glideMin`, opens it; he sinks at
  `glideSink`, steers at `glideSpeed`, takes no fall damage, and closes on a press, on landing, or at a wall (where he
  latches if he climbs); `mover.lift` (a number or a function of where he is) raises him over updrafts. The rig hangs
  under a sail the game draws at `rig.worldOffset(rig.J.handR)` (or the engine's own, if a filmstrip shows one is needed).
- Stamina (`mover.staminaMax`, 0 = none): climbing, climb jumps, gliding and sprinting draw on it, standing refills it,
  and at 0 he lets go or closes the glide; `mover.stamina` is there for a HUD (`ui.hud({ bars })`).
- The stealth starter's hero climbs any wall (Assassin's Creed); the template moves from its own climb to a Mover that
  climbs and glides off the roof.
- Tests in `tools/contract-test.mjs`'s third-person block: latch, climb up and along, round a corner, pull up, let go,
  climb jump, open and close a glide, no fall damage gliding, stamina out. A filmstrip of each. `API.md` :168 gains a
  line for both (about 60 tokens).

## 6. Phases

| Phase | What | Mainly touches |
| --- | --- | --- |
| 0 | this plan | `docs/` |
| 1 | the cards (2) | `API.md`, `AI_GUIDE.md`, the agent header, `tools/api-index.mjs`, doc comments |
| 2 | lighting in the look (1) | `API.md`, the engine's lighting, the template, the stealth starter |
| 3 | `E.Shell` in the template and the stealth starter (4) | `src/handoff/game/`, `src/starter/70-stealth.js`, `AI_GUIDE.md` |
| 4 | the x-ray (3.1) | the renderer's `_flush` and `_composite`, `r.prop`, `r.shape` |
| 5 | walls with depth, the floor to the edge (3.2) | `TileMap._box` and `_floor`, both editions |
| 6 | climbing any wall (5) | `E.Mover`, `E.ACTIONS`, `map.wall`, the rig, the stealth starter, the template |
| 7 | gliding and stamina (5) | `E.Mover`, the rig, the template |
| 8 | fold this plan in | the docs; delete this file |

Each phase: its own pull request; `npm run test:changed` before pushing; a filmstrip `--compare` with the build before
for anything that draws; the theme's row and points in `docs/FEEDBACK-LOG.md` marked **Taken up in vX.Y.Z**; this
file's progress table updated.

## 7. Budgets

| Manual | v0.51.4 | Expected after the plan |
| --- | --- | --- |
| `API.md` (15,000) | 14,649 | about 14,950: +170 from the names promoted after D44 (`game.fail`, `r.actorNow`, ...), +260 and −300 in phase 1, then about +40 (2), +30 (3), +10 (4), +20 (5), +60 (6), +30 (7). More room if needed: the boot bullet (:114, −81) and the player's zoom (:94, −82) to pointers. |
| The agent header (10,000) | 9,792 | about 9,850 (phase 1's pointer and key, phase 2's names) |
| `API-INDEX.md` (40,000) | 34,010 | about 35,000 (the lettered sections' headings, the new names) |

`node tools/doctrine-check.mjs` checks them on every phase.

## 8. Not in this plan

- A dialogue piece in `E.Shell` (4): **watch**.
- A turned three-quarter view (3.2): **watch**, the owner's call.
- Pitched roofs for `TileMap` types: the stealth starter's belfry draws one with `r.queue`; a later source asking for
  roofs takes it up.
- GPU lighting in headless checks (WebGPU in `tools/check.mjs`'s browser): the canvas lighting the cards lead with
  shows in every check.

## 9. Progress

| Phase | State | Version and commit | Notes |
| --- | --- | --- | --- |
| 0 this plan | written | v0.51.5 | the facts checked against v0.51.4 |
| 1 the cards | done | v0.53.0 | |
| 2 lighting in the look | done | v0.54.0 | |
| 3 `E.Shell` in the template and the stealth starter | done | v0.55.0 | |
| 4 the x-ray | done | v0.56.0 | |
| 5 walls with depth, the floor to the edge | done | v0.57.0 | |
| 6 climbing any wall | done | v0.58.0 | |
| 7 gliding and stamina | not started | | |
| 8 fold this plan in | not started | | |
