# Importing ready-made animation

my-3D2dge animates with code, but its rigs can also play animation made for 3D games. `tools/anim-import.mjs` converts a skeletal animation library in glTF binary form (`.glb`) into compact clip data, and `src/mocap/mocap.js` plays that data on the engine's rigs. The proof of concept is `examples/mocap-lab.html`. It runs the 45 free clips (plus the T-pose) of [Quaternius' Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) (CC0) on two figures:

- **a look-alike of the library's mannequin**, drawn from the clip as captured: an orange figure with an egg-shaped head and purple joint rings. Its proportions and limb thickness are measured from the library's own mesh.
- **the engine's hero** (the Emberdeep swordsman, an HD `Humanoid`), playing the same clip retargeted to his chibi build. His cape and hair follow, and in sword clips his blade follows his fist.

Both work in every view, at any camera turn or zoom, in slow motion and frame by frame.

## Pipeline

```
library.glb ──tools/anim-import.mjs──▶ src/mocap/ual-clips.js ──Mocap.load──▶ sample(clip, t) ──▶ Mannequin.draw / Mocap.drive(humanoid)
```

1. **Import** (Node, no dependencies): `node tools/anim-import.mjs library.glb [--out src/mocap/ual-clips.js] [--fps 30] [--clips A,B] [--name UAL] [--credit "..."]`. With `--list` it prints the clips and bones and writes nothing. For each clip it does the following:
   - samples the skeleton at a fixed rate;
   - runs forward kinematics;
   - keeps 36 body points (pelvis, spine, neck, head, face direction, collarbones, shoulders, elbows, wrists, knuckles, hips, knees, ankles, balls of the feet, toes) in the rig's local frame (f forward, r right, z up), centred on the root on the ground.

   It finds forward and right from the rest pose (heels to toes, and the `.L` to `.R` thigh), so it works whichever way the source faces. It also measures the body from the skinned mesh:
   - each segment's radius at its start, middle and end;
   - the height;
   - where the second material (the joint rings) sits along each limb.
2. **Data**: one script that sets `window.MOCAP[name]` and needs no network. Each clip is `{ n, dur, loop, move?, data }`:
   - `data` is base64 Int16, millimetres, frame by frame and point by point.
   - `move` is the root motion, present only for clips that travel.

   The 46 clips take 591 KB.
3. **Play**: `Mocap.load(raw)` decodes the clips once. `lib.sample(clip, t)` interpolates between frames: loops wrap, and one-shots hold their last frame. `lib.blend` crossfades between clips.
4. **Draw or drive**:
   - `new Mocap.Mannequin(lib, { height }).draw(g, ox, oy, view, pose, facing)` draws the look-alike. It is built from shaded capsules sorted by camera depth, the same way the engine's HD rigs are drawn.
   - `Mocap.drive(humanoid, lib)` makes a `Humanoid` take `rig.mocap = pose` after it poses itself.

## Retargeting onto a Humanoid

The hero's skeleton is 15 points with fixed bone lengths. The source's skeleton is a real adult's. `Mocap.drive` keeps the hero's build and borrows the clip's directions:

- **Hips:** height scaled by the ratio of the two hip heights. The pelvis takes the clip's left-to-right axis.
- **Spine, shoulders, head:** each takes the clip's direction at the hero's own length (`torso`, `shoulderHalf`, `neck + headR`).
- **Feet and hands:** placed in proportion to the leg and arm lengths, then solved with the engine's two-bone IK (`E.ik3`). The knee and elbow bend the way the clip's do. The sole, not the ankle, meets the floor.
- **Sword:** with `rig.mocapBlade = true`, it runs along the knuckles (pinky to index), the way a blade sits in a fist.

## Storing a clip: five ways, compared

The lab's **Compare** mode plays one clip five ways side by side. Under each figure it shows how many poses that version keeps, its size, and how far its body points stray from the capture right now. **Ghost** draws the capture in blue behind each version, so the blue shows exactly where a version strays. The **Format and costs** tab measures the whole library in the browser:

| Stored as | Poses (46 clips) | Size, gzipped | Worst error | A model can read it |
|---|---|---|---|---|
| Captured: every frame, 30 fps | 2,078 | 118 KB | 0 mm | no (binary) |
| 15 fps: every second frame | 1,069 | 76 KB | 360 mm | no |
| Key poses, 10 mm budget | 905 | 78 KB | 10 mm | no |
| Key poses, 40 mm budget | 515 | 51 KB | 40 mm | no |
| **Readable key poses** | **615** | **31 KB** | 214 mm (about 12 mm on average) | **yes: ~88k tokens for all, ~1,850 for a typical clip** |

One pixel is about 24 mm at the default zoom.

- **Halving the frame rate is the wrong cut.** It is no smaller than key poses at 10 mm, and it can skip a punch's moment of contact (360 mm off).
- **Key poses** keep a frame only where in-betweening would miss the capture by more than the budget (`lib.reduce(clip, tol)`). They spend frames where the motion needs them: an idle drops from 76 frames to 9, while a sword slash keeps most of its 47.
- Every size above already stores each frame as its change from the last, which compresses well and loses nothing.

## The readable format (for AI models)

A model cannot read or edit binary clip data, and the raw numbers would cost about 260k tokens. So a clip is also available as a short list of key poses in plain JSON (`Mocap.readable(lib)`: `encode`, `fit`, `text`, `parse`, `pose`, `mirror`). Each key pose names what an animator would, as three lines (torso, arms, legs) of whole numbers:

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
- **blade** (sword clips only): the direction of the blade.

The legend that explains it costs about 410 tokens and is read once.

Why it is shaped this way:

- **Limbs are directions plus a bend, not joint angles.** An arm swinging through straight down has no angle that flips, and a bend in degrees is well conditioned: storing reach as a fraction moved a nearly straight knee 56 mm per rounding step. It is also exactly what the engine's IK rigs consume.
- **It does not depend on body size,** so the same clip fits the chibi, heroic and bulky builds.
- **"out" is mirror-friendly,** so `mirror()` swaps L and R and flips the signs of turns and tilts.
- **Whole numbers are cheap.** In cl100k, `-0.35` costs several tokens and `-35` costs one or two. Named fields cost about a quarter more than bare rows, but they make edits safe ("which column was `legR`?").
- **The spine is fitted to the library.** How much of the hips-to-chest turn each spine bone takes is measured from the clips when the library loads (Quaternius: 0, 0, 0.25, 1), because a library's animators decide how the spine bends.
- **Keys are chosen by the format's own error** (`fit`), and the fitter stops adding keys where the remaining error is the format's limit, not the in-betweening.

It stays about 12 mm per body point from the capture on average. Its biggest misses are elbows and wrists when a wrist bends hard: the format treats the hand as a straight continuation of the forearm.

**The catalog.** A model picks a clip from one line per clip, never from motion data: `name | seconds | loop or once | tags | what the body does`. All 46 clips cost about 1,150 tokens (`src/mocap/ual-catalog.js`, written by hand from watching each clip). It then opens only the clips it uses.

**Editing in the lab.** The **This clip as text** tab shows the current clip in the readable format:
- **Apply** (Ctrl+Enter) plays an edit on the READABLE figure in Compare, and on both figures when the source is **Readable** (R).
- **Mirror** swaps sides.
- **Copy for a model** copies the legend with the clip.
- A broken edit is rejected with the key and the missing field named.

## Looking ahead: what to settle before this reaches the engine

These are the questions that get harder to change once games and models depend on the format:

1. **The format becomes an API.**
   - Once models write clips in it, changing a field breaks their clips. It needs a version number and a converter from day one.
   - It also needs a validator that warns, in the engine's forgiving style, about a reach past full length, a knee bending backwards, or a missing field.
2. **It is a humanoid format.**
   - Blobs, the Emberdeep crawler, serpent and watcher, Codex's folio body, and future four-legged rigs need either their own formats or a general "named chains" form.
   - Decide which before the humanoid one hardens.
3. **The renderer has to honour what the format says.** The HD `Humanoid` still draws its face, hair and torso from `facing`, so chest twist, head turn and lying poses are approximate on the hero. As more clips arrive, the draw code should read the chest and head frames the clip provides.
4. **Gameplay needs events.**
   - Motion capture has no "the punch lands now", footsteps, or "the hand reaches the lever".
   - The format should carry named events (`events: { hit: .42, step: [.1, .6] }`): authored for a few clips, detected (feet that stop moving) for the rest.
5. **Root motion against physics.**
   - The engine's `Body` and `Platformer` move characters; root-motion clips move them too.
   - One rule is needed: clips play in place by default and expose their root path as data the game can use or ignore.
6. **Layering and blending.**
   - Games need upper-body clips over a running lower body (attack while moving), additive layers (breathing, wounded), and short crossfades.
   - The format should allow partial poses (only the arms) and a mask when playing.
7. **Style.**
   - Motion capture is realistic; `E.MOVES` is snappy and stylized.
   - Mixed in one game they can feel inconsistent, so imported clips will want a style pass: holds on key poses, a little exaggeration, eased in-betweens.
8. **The catalog's token budget.**
   - At 46 clips the catalog is about 1k tokens. At 500 (both Quaternius libraries plus Mesh2Motion) it is about 12k, and with CMU's 2,500 about 60k.
   - It will need tiers (a starred core set in the API card, the rest by tag) and no clip data in the agent edition: models fetch clips by name.
9. **Provenance per clip.** Libraries differ (CC0, CMU's no-resale terms), so each clip should carry its source and license, and the importer should refuse sources that forbid redistribution.
10. **Two engine editions.**
    - The agent edition is a hand-ported subset.
    - Playback in the engine (`rig.update(dt, { clip })`) would have to be ported or kept as an add-on module that both editions load. An add-on keeps the agent edition's 82k-token budget intact.

## What the clips assume

- **In-place jumps.** `Jump_Start` and `Jump_Loop` keep the root on the floor while the feet point down. A game supplies the vertical arc. The lab lifts the figure until its lowest point touches the floor.
- **Props.** Sitting clips expect a chair, `PickUp_Table` a table, `Driving_Loop` a seat and a wheel, and the `Pistol_*` clips a gun. The figures mime them.
- **Root motion.** `Roll_RM` and `Sword_Attack_RM` move the root. The lab moves the figures and the camera follows. The in-place versions (`Roll`, `Sword_Attack`) stay put.

## Limits of this proof of concept

- **The hero's drawing assumes an upright body facing `facing`.** A clip that twists the chest or lays the body down still reads, but his face and hair are drawn from the facing direction, not from the clip's head. The mannequin uses the clip's own face direction.
- **Fingers are not imported.** Hands are fists, which suits pixel art at this size.
- **The bone map is for Rigify `DEF-` bones** (Quaternius' libraries). Another rig (Mixamo, the Unreal mannequin, CMU BVH) needs its own `BONES` table in `tools/anim-import.mjs`, plus a BVH reader for BVH files.
- **The committed data is still raw: every frame at 30 fps.** The key-pose and readable forms are computed in the browser when a clip is first shown. Shipping them from the importer instead is the next step.

## Which libraries are safe

| Source | License | Use here |
|---|---|---|
| Quaternius Universal Animation Library 1 and 2 (Standard is free; Pro adds the rest of the 120+ and 130+ clips) | CC0 | Yes. Converted data can be committed. |
| Mesh2Motion | CC0 | Yes |
| CMU Graphics Lab Motion Capture Database | free, including in products; the data may not be resold | Yes, with a note in the output |
| Mixamo | Adobe's terms forbid redistributing the animations in an editable form | No: converted clip data in an open repository is exactly that |
| Bandai Namco Research motion dataset | CC BY-NC-ND 4.0 (no derivatives) | No: retargeting is a derivative |

## Tests

`npm run test:mocap` (part of `npm test`) plays every clip at four moments, on both figures and across all five views. It fails on any of these:

- a page error or engine warning;
- a pose or hero joint that is not a number;
- a figure that draws nothing, or a cast that draws the wrong number of figures;
- a foot under the floor;
- a key-pose version that strays past its budget;
- readable text that does not read back the same, or that is not restored by mirroring twice;
- a readable format that strays more than 20 mm per body point on average;
- a broken edit accepted, or rejected without a clear message;
- an edit applied in the panel that does not play.
