# Importing ready-made animation

my-3D2dge animates with code, but its rigs can also play animation made for 3D games. Imported animation is stored in one format that both people and AI models can read and edit: **readable key poses**, plain JSON with whole numbers (below). It is organised in **sets**:

- **QUATERNIUS** (`src/mocap/sets/quaternius.js`): every free clip of [Quaternius' Universal Animation Library 1](https://quaternius.com/packs/universalanimationlibrary.html) and [Library 2](https://quaternius.com/packs/universalanimationlibrary2.html) (both CC0). 88 clips: 45 from the first library plus its T-pose, and 42 from the second. It is the library a game or a model picks from.
- **HERO** (`src/mocap/sets/hero.js`): the 8 clips Emberdeep's hero, the Wanderer, has adopted (see [The hero's clips](#the-heros-clips-in-emberdeep)). It is a subset of QUATERNIUS, picked with `tools/anim-set.mjs`, and it is the only set the game ships.

`examples/mocap-lab.html` plays either set (**G** switches) on two figures:

- **a look-alike of the libraries' mannequin**: an orange figure with an egg-shaped head and purple joint rings. Its proportions and limb thickness are measured from the first library's own mesh.
- **the engine's hero** (the Emberdeep swordsman, an HD `Humanoid`), playing the same clip retargeted to his chibi build. His cape and hair follow, and in sword clips his blade follows his fist.

Both work in every view, at any camera turn or zoom, in slow motion and frame by frame.

## Pipeline

```
libraries (.glb) ──tools/anim-import.mjs──▶ src/mocap/sets/quaternius.js ──tools/anim-set.mjs──▶ src/mocap/sets/hero.js
                                                     │                                                    │
                                                     └──────────── Mocap.load(set) ◀──────────────────────┘
                                                                        │
                                              lib.sample(clip, t) ──▶ Mannequin.draw / Mocap.drive(humanoid)
```

1. **Import** (Node, no dependencies):

   ```
   node tools/anim-import.mjs UAL1.glb UAL2.glb --sources UAL1,UAL2 --name QUATERNIUS \
     --catalog src/mocap/catalogs/quaternius.json --out src/mocap/sets/quaternius.js
   ```

   (`npm run mocap:import -- ...`; `--list` prints a file's clips and bones and writes nothing; `--clips A,B` imports only those; `--tol 30` is the key-pose budget in mm.) For each library it:
   - recognises the rig: Rigify `DEF-` bones (Library 1) or Unreal-style names (`pelvis`, `spine_01`, `upperarm_l`; Library 2);
   - measures the rest body from the T-pose, finds forward and right (heels to toes, left thigh to right), and fits how that library's animators share a turn of the hips-to-chest between the spine bones (Library 1: 0, 0, 0.25, 1; Library 2: 0, 0, 0.55, 1);
   - samples every clip at 30 fps, runs forward kinematics to 36 body points, turns each frame into a readable pose, and keeps only the key poses needed to stay within the budget (`fit`);
   - takes each clip's tags and description from the catalog, written by hand from watching each clip.

   A clip whose name is already in the set (from an earlier library) is skipped, and a clip with no catalog entry is reported.
2. **Pick a set for a game**: `node tools/anim-set.mjs src/mocap/sets/quaternius.js --clips Death01,LayToIdle --name HERO --out src/mocap/sets/hero.js --credit "..."` (`npm run mocap:set -- ...`) copies those clips, key for key, with the proportions of the libraries they came from.
3. **The set file** is one script that sets `window.MOCAP[name]` and needs no network. Its header comment carries the credit and the legend, so a model that opens the file can read it at once:

   ```
   (window.MOCAP = window.MOCAP || {})["HERO"] = {
   "set": "HERO", "format": 1, "credit": "...", "from": "QUATERNIUS", "fps": 30,
   "sources": { "UAL1": { "file": ..., "rig": "rigify", "rest": {...} }, "UAL2": {...} },   // the bodies the clips were measured on
   "body": { "height": 1829, "segs": [...], "bands": [...] },                              // the mannequin's measured mesh
   "fit": { "Death01": [10, 71], ... },                                                    // average and worst error vs the capture, mm
   "clips": { "Death01": { "clip": "Death01", "src": "UAL1", "dur": 2.4, "loop": false, "tags": ["death"],
                           "desc": "staggers and falls flat on the back", "keys": [ ...key poses... ] }, ... } };
   ```

   | Set | Clips | Key poses | Size | Gzipped | As tokens |
   |---|---|---|---|---|---|
   | QUATERNIUS | 88 | 1,345 | 391 KB | 75 KB | ~197k for all; a typical clip ~2,100 |
   | HERO | 8 | 122 | 40 KB | 9 KB | ~17k |

   For comparison, the old raw form (every frame of the first library's 46 clips as base64 Int16) was 591 KB, 232 KB gzipped, and unreadable.
4. **Play**: `const lib = Mocap.load(window.MOCAP.HERO)`. Then:
   - `lib.clip(name)` returns the clip;
   - `lib.sample(clip, t)` returns the pose at time t, in-betweening the key poses (loops wrap, one-shots hold their last pose);
   - `lib.moveAt(clip, t)` returns how far a travelling clip has carried the body;
   - `lib.blend(a, b, k)` crossfades two poses;
   - `lib.text(clip)` gives the clip as a model reads it;
   - `lib.replace(name, edited)`, `lib.restore(name)` and `lib.edited(name)` swap in an edited clip and back.

   `src/mocap/readable.js` (`MocapReadable`) holds the format itself, shared by the browser and the Node tools.
5. **Draw or drive**:
   - `new Mocap.Mannequin(lib, { height }).draw(g, ox, oy, view, pose, facing)` draws the look-alike. It is built from shaded capsules sorted by camera depth, the way the engine's HD rigs are drawn.
   - `Mocap.drive(humanoid, lib)` makes a `Humanoid` take `rig.mocap = pose` after it poses itself.

## Retargeting onto a Humanoid

The hero's skeleton is 15 points with fixed bone lengths. The source's skeleton is a real adult's. `Mocap.drive` keeps the hero's build and borrows the clip's directions:

- **Hips:** height scaled by the ratio of the two hip heights. The pelvis takes the clip's left-to-right axis.
- **Spine, shoulders, head:** each takes the clip's direction at the hero's own length (`torso`, `shoulderHalf`, `neck + headR`).
- **Feet and hands:** placed in proportion to the leg and arm lengths, then solved with the engine's two-bone IK (`E.ik3`). The knee and elbow bend the way the clip's do. The sole, not the ankle, meets the floor.
- **Sword:** with `rig.mocapBlade = true`, it runs along the knuckles (pinky to index), the way a blade sits in a fist. Otherwise it keeps the rig's own angle, and as the body goes down it drops flat on the floor beside the hand.
- **Lying down:** the rig's knocked-down measure follows the clip's torso, so the face, hair and toes the rig draws around its joints lie with the body.
- **Blending:** `rig.mocapW` (0 to 1) fades a clip in and out over the rig's own animation; `rig.mocapMask = 'upper'` plays only the chest, head and arms over the rig's own legs (reaching for loot while walking).

## The readable format (for AI models)

Each key pose names what an animator would, as three lines (torso, arms, legs) of whole numbers:

```
{"t":0.13,
   "hips":[-2,-2,90], "body":[14,-25,1], "chest":[-2,43,6], "head":[-10,11,-1],
   "shL":[16,5], "shR":[-6,-1], "armL":[60,-44,66,132,155], "armR":[84,-27,47,133,-157],
   "legL":[-35,14,-93,44,6], "legR":[-66,19,-72,28,-32], "footL":[25,11,0], "footR":[20,44,-1]}
```

- **hips:** the pelvis, in percent of standing hip height.
- **body, chest, head:** turn, lean and tilt in degrees, each relative to the part below it.
- **shL, shR:** how far each shoulder swings forward and shrugs up, in degrees.
- **arms and legs:** `[forward, out, up, bend, twist]`:
  - the first three give the direction from the shoulder to the fist (or the hip to the ankle), as percentages;
  - bend is the elbow or knee in degrees (0 = straight);
  - twist is how far the elbow or knee swings round from its natural direction.
- **feet:** `[down, out, toes]` in degrees.
- **blade** (sword clips only): the direction of the blade. **root** (clips that travel): how far the body has moved.

The legend that explains it costs about 450 tokens and is read once. It is in every set file's header and in `MocapReadable.LEGEND`.

Why it is shaped this way:

- **Limbs are directions plus a bend, not joint angles.** An arm swinging through straight down has no angle that flips, and a bend in degrees is well conditioned: storing reach as a fraction moved a nearly straight knee 56 mm per rounding step. It is also exactly what the engine's IK rigs consume.
- **It does not depend on body size,** so the same clip fits the chibi, heroic and bulky builds, and the two libraries' different skeletons.
- **"out" is mirror-friendly,** so `mirror()` swaps L and R and flips the signs of turns and tilts.
- **Whole numbers are cheap.** In cl100k, `-0.35` costs several tokens and `-35` costs one or two. Named fields cost about a quarter more than bare rows, but they make edits safe ("which column was `legR`?").
- **The spine is fitted per library.** How much of the hips-to-chest turn each spine bone takes is measured from each library's clips at import, because a library's animators decide how the spine bends. Each clip names its source (`src`), and plays back with that library's spine.
- **Keys are chosen by the format's own error** (`fit`), and the fitter stops adding keys where the remaining error is the format's limit, not the in-betweening.

The QUATERNIUS set stays 14 mm per body point from the capture on average (each clip's average and worst are in the set's `fit`). One pixel is about 24 mm at the default zoom. Its biggest misses are elbows and wrists when a wrist bends hard: the format treats the hand as a straight continuation of the forearm.

**The catalog.** A model picks a clip from one line per clip, never from motion data: `name | seconds | loop or once | tags | what the body does`. All 88 clips cost about 2,400 tokens; the lab's **Catalog** tab shows it. The words come from `src/mocap/catalogs/quaternius.json`. The model then opens only the clips it uses.

**Editing in the lab.** The **This clip as text** tab shows the current clip:
- **Apply** (Ctrl+Enter) plays an edit on both figures; **Reset** brings the imported clip back.
- **Mirror** swaps sides.
- **Copy for a model** copies the legend with the clip.
- A broken edit is rejected with the key and the missing field named.

To keep an edit, paste it into the set file: the clips there are the same text.

### How the format was chosen

Before the readable form became the committed one, the lab played one clip five ways side by side, measured over the first library's 46 clips:

| Stored as | Poses | Size, gzipped | Worst error | A model can read it |
|---|---|---|---|---|
| Captured: every frame, 30 fps | 2,078 | 118 KB | 0 mm | no (binary) |
| 15 fps: every second frame | 1,069 | 76 KB | 360 mm | no |
| Key poses, 10 mm budget | 905 | 78 KB | 10 mm | no |
| Key poses, 40 mm budget | 515 | 51 KB | 40 mm | no |
| **Readable key poses** | **615** | **31 KB** | 214 mm (about 12 mm on average) | **yes** |

Side by side in motion the readable version could not be told from the capture, so it became the only stored form. (Halving the frame rate was the wrong cut: no smaller than key poses at 10 mm, and it can skip a punch's moment of contact.)

## The hero's clips in Emberdeep

`src/emberdeep/96-hero-clips.js` plays the HERO set on the Wanderer, each clip at a moment his procedural animation had no answer for:

| Moment | Clip | When |
|---|---|---|
| death | `Death01` | he dies: a stagger back, then flat on his back. The YOU DIED panel waits until he has landed. |
| get-up | `LayToIdle` | revived (back in town, a retry, the developer's revive): he gets up off the ground. Dropped in from above, he lands on his feet instead. |
| arms folded | `Idle_FoldArms_Loop` | someone talks to him, or a shopkeeper serves him. |
| open the stash | `Chest_Open` | the stash's panel opens: he turns to the chest, bends and lifts the lid. |
| use the waystone | `Interact` | the waystone's panel opens: he turns to it and works it with his hands. |
| pick up | `PickUp_Table` | loot goes in his bag: a quick reach with the upper body, so he keeps walking. |
| heavy blow | `Hit_Chest`, `Hit_Head` | a hit for more than 12% of his life that does not knock him down: the upper body snaps back while his legs take the stagger. |

Moving, rolling, attacking or a flinch takes the body back at once: the clip fades out in a few frames. Codex has his own rig and plays none of them. The gallery's POSES reel plays each one (`#gallery/poses/captured-death`, `captured-get-up`, `arms-folded`, `open-the-stash`, `use-the-waystone`, `pick-up`, `hit-in-the-chest`, `hit-in-the-head`).

To adopt another clip: add it to the `anim-set.mjs` command above, re-run it, and give it a moment in `HCL_MOVES` and a trigger.

## Looking ahead

These are the questions that get harder to change once games and models depend on the format:

1. **The format is an API.** Sets carry `"format": 1`, so a later version can be converted. It still needs a validator that warns, in the engine's forgiving style, about a reach past full length or a knee bending backwards.
2. **It is a humanoid format.** Blobs, the Emberdeep crawler, serpent and watcher, Codex's folio body, and future four-legged rigs need either their own formats or a general "named chains" form. Decide which before the humanoid one hardens.
3. **The renderer has to honour what the format says.** The HD `Humanoid` draws its face, hair and torso from `facing` and its knocked-down measure, so chest twist and head turn are approximate on the hero. As more clips arrive, the draw code should read the chest and head frames the clip provides.
4. **Gameplay needs events.** Motion capture has no "the punch lands now", footsteps, or "the hand reaches the lever". The format should carry named events (`events: { hit: .42, step: [.1, .6] }`): authored for a few clips, detected (feet that stop moving) for the rest. Emberdeep times its moments by hand for now (the death panel waits for `Death01` to land at 1.4 s).
5. **Root motion against physics.** Clips play in place by default and expose their root path as data (`root`, `lib.moveAt`) that a game can use or ignore. Keep it that way.
6. **Layering.** Upper-body masks and fades exist (`mocapMask`, `mocapW`). Still missing: additive layers (breathing, wounded) and partial poses (only the arms) in the format itself.
7. **Style.** Motion capture is realistic; `E.MOVES` is snappy and stylized. Mixed in one game they can feel inconsistent, so imported clips will want a style pass: holds on key poses, a little exaggeration, eased in-betweens. The hero's adopted clips are the calm moments (getting up, waiting, a chest) for this reason; his combat stays procedural.
8. **The catalog's token budget.** At 88 clips the catalog is about 2,400 tokens (about 27 a clip). At 500 clips it would be about 13k, and with CMU's 2,500 about 67k. It will need tiers (a starred core set in the API card, the rest by tag) and no clip data in the agent edition: models fetch clips by name.
9. **Provenance per clip.** Each set carries its credit and each clip its source library. When a source with other terms arrives (CMU's no-resale terms), the credit should move to the source, and the importer should refuse sources that forbid redistribution.
10. **Two engine editions.** Playback is an add-on (`readable.js` and `mocap.js`) that a page loads after the engine, so the agent edition's 82k-token budget stays intact.

## What the clips assume

- **In-place jumps.** `Jump_Start`, `Jump_Loop` and the `NinjaJump_*` clips keep the root on the floor while the feet point down. A game supplies the vertical arc. The lab lifts the figure until its lowest point touches the floor.
- **Props.** Sitting clips expect a chair, `PickUp_Table` a table, `Chest_Open` a chest, `Walk_Carry_Loop` a box, `Idle_Rail_*` a railing, `Farm_*` and `TreeChopping_Loop` their tools, `Driving_Loop` a seat and a wheel, the `Pistol_*` clips a gun, and the `Shield_*` clips a shield. The figures mime them.
- **Root motion.** The `_RM` clips (and the `Sword_Regular_*` combo, `Sword_Block`) move the root. The lab moves the figures and the camera follows.
- **Combos.** `Sword_Regular_A`, `B` and `C` are one combo's strikes, each with a recovery (`_Rec`) for when the chain stops; `Sword_Regular_Combo` is the whole chain.

## Limits

- **The hero's face and hair follow `facing`,** not the clip's head (see 3 above). The mannequin uses the clip's own face direction.
- **Fingers are not imported.** Hands are fists, which suits pixel art at this size.
- **Two bone maps:** Rigify `DEF-` bones and Unreal-style names. Another rig (Mixamo's, CMU BVH) needs its own map in `tools/anim-import.mjs`, plus a BVH reader for BVH files.
- **The mannequin's body is measured from the first library's mesh.** The second library's skeleton has the same proportions, so its clips play on the same figure.

## Which libraries are safe

| Source | License | Use here |
|---|---|---|
| Quaternius Universal Animation Library 1 and 2 (Standard is free; Pro adds the rest of the 120+ and 130+ clips) | CC0 | Yes. Converted data can be committed. |
| Mesh2Motion | CC0 | Yes |
| CMU Graphics Lab Motion Capture Database | free, including in products; the data may not be resold | Yes, with a note in the output |
| Mixamo | Adobe's terms forbid redistributing the animations in an editable form | No: converted clip data in an open repository is exactly that |
| Bandai Namco Research motion dataset | CC BY-NC-ND 4.0 (no derivatives) | No: retargeting is a derivative |

## Tests

`npm run test:mocap` (part of `npm test`) runs two checks.

`tools/mocap-test.mjs` plays every clip of both sets at four moments, on both figures and across all five views. It fails on any of these:

- a page error or engine warning;
- a pose or hero joint that is not a number;
- a figure that draws nothing, or a cast that draws the wrong number of figures;
- a foot under the floor;
- clip text that does not read back the same, or that is not restored by mirroring twice;
- a clip without a recorded fit, one more than 30 mm from its capture on average (300 mm at worst), or a set more than 20 mm on average;
- a hero clip that is not key for key the Quaternius clip it was picked from;
- a broken edit accepted, or rejected without a clear message;
- an edit applied in the panel that does not play, or that Reset does not undo.

`tools/ed-clips-test.mjs` plays Emberdeep and checks each of the hero's moments: the stash (and that he turns to it), the waystone, a talk, walking off, loot, a heavy blow, death (the YOU DIED panel waits until he has landed, and he lies on his back), the get-up in town, and every gallery entry.
