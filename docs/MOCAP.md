# Importing ready-made animation

my-3D2dge animates with code, but its rigs can also play animation made for 3D games. `tools/anim-import.mjs` converts a skeletal animation library in glTF binary form (`.glb`) into compact clip data, and `src/mocap/mocap.js` plays that data on the engine's rigs. The proof of concept is `examples/mocap-lab.html`. It runs the 45 free clips of [Quaternius' Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) (CC0) on two figures:

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

## What the clips assume

- **In-place jumps.** `Jump_Start` and `Jump_Loop` keep the root on the floor while the feet point down. A game supplies the vertical arc. The lab lifts the figure until its lowest point touches the floor.
- **Props.** Sitting clips expect a chair, `PickUp_Table` a table, `Driving_Loop` a seat and a wheel, and the `Pistol_*` clips a gun. The figures mime them.
- **Root motion.** `Roll_RM` and `Sword_Attack_RM` move the root. The lab moves the figures and the camera follows. The in-place versions (`Roll`, `Sword_Attack`) stay put.

## Limits of this proof of concept

- **The hero's drawing assumes an upright body facing `facing`.** A clip that twists the chest or lays the body down still reads, but his face and hair are drawn from the facing direction, not from the clip's head. The mannequin uses the clip's own face direction.
- **Fingers are not imported.** Hands are fists, which suits pixel art at this size.
- **The bone map is for Rigify `DEF-` bones** (Quaternius' libraries). Another rig (Mixamo, the Unreal mannequin, CMU BVH) needs its own `BONES` table in `tools/anim-import.mjs`, plus a BVH reader for BVH files.
- **The data is raw: every frame at 30 fps.** For shipping in games, the next step is reducing each clip to key poses with the engine's easing between them. That gives the snappier retro feel at a fraction of the size.

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
- a figure that draws nothing;
- a foot under the floor.
