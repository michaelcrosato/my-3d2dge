# Bringing a game to the controls standard: the playbook

What bringing every kit and Emberdeep to `docs/CONTROLS.md` taught (v0.107.0 and v0.108.0, 2026-11-16 to 11-18), for
an agent doing the same to another game, on this engine or not. The standard itself is `docs/CONTROLS.md`; the calls
and why are D100 to D118 in `docs/DECISIONS.md`. Three companion pages hold the lessons by device:

- `docs/CONTROLS-TOUCH.md`: phones, upright and on their side. Most of the defects were here.
- `docs/CONTROLS-PAD.md`: the pad, the PlayStation layout, a DualSense's extras and their permissions, the gyro.
- `docs/CONTROLS-TV.md`: screens at ten feet, keyboard and mouse at a desk, prompts and glyphs.

## The short version

1. **Make the standard testable first.** Turn each clause into rules a check can fail (a target under 44 CSS px, a
   prompt naming a key, Ctrl beside WASD), then audit every screen against them per device (pad, keys and mouse,
   touch upright, touch on its side, TV) before changing anything.
2. **Fix it once, in the shared layer.** Most defects were one rule broken in many places (a menu that grows under a
   finger, a target that acts as a finger lands). The input layer, the menus, the dialogs and the HUD's shell carry the
   standard; the screens inherit it.
3. **Under a finger, everything acts on lift,** where it pressed. The largest class of defects: a flick that began on a
   button saved and quit, paid for a gamble, bought a passive (D110, D111).
4. **Never change the layout under a held press.** The second largest: rows that grew to a thumb's while the finger was
   down picked the row above (D116).
5. **Facts before heuristics.** Four review rounds tuned the gyro's drift learning against cases a ten-minute read
   would have ruled out: the DualSense's firmware already takes its gyro's bias out (D118).
6. **Score a heuristic on scenarios, don't review it into shape.** A headless harness of ~430 gyro scenarios settled
   in minutes what four fix-and-review rounds of hours each kept reopening.
7. **Check with real input on emulated devices,** and compare pixels against the build before to prove what did not
   change. Then ask the owner to play it on the real ones: nothing here replaces a real phone, pad and TV.

## What it cost, and how to spend less

The pass took two days of agents at the highest effort. v0.108.0 alone took a final review (29 defects) and four more
fix-and-skeptic rounds; each round of three areas cost 1.7 to 2.2 million agent tokens and about four hours. The first
rounds found real defects a player meets in a minute. Rounds 3 to 5 mostly found narrow ones: a six-line toast on a
320 px phone, a simulated hand as steady as a table.

- **A stopping rule from the start.** Fix what is high or medium and a player can meet; write the low and contrived ones
  into the decision's costs. Ask every reviewer to mark each finding `realistic` (round 5 did; it should have been
  round 1). Two rounds per area, a third only for a high.
- **One area at a time,** each with its own page's checklist: touch, then the pad, then the TV. A fix in one area that
  touches another (the layout's device is shared by touch and the keys) gets that area's checks too.
- **Cheap checks always, full suites once.** Syntax, doctrine and the area's own test while working; the full suites
  once per merge, one browser at a time on a small machine (parallel browsers fail timing asserts).
- **Long sessions:** commit as soon as a fix is proven (a container restart kills background work); clear screenshots
  and clones off the disk; merge the main branch before the final test run, not after; launch agents from the
  repository they work in (a worktree is made from the session's current one); have them write their reports to
  files, so a restart loses nothing.

## The order of work

1. **Audit:** a row per screen, a column per device; what fails and why.
2. **The input layer:** the device used last and the device the layout is drawn for (`input.lastDevice`,
   `input.layoutDevice`), labels and glyphs (`input.label`), a tap on lift, swipes (`input.swipe`), context buttons
   (`input.touchSet`), assists (`input.assist`, `E.assist`).
3. **The shared screens:** menus and dialogs sized per device (`E.Menu`, `E.Dialog`), settings and controls as tabbed
   pages at a TV's size (`E.Shell`), notices clear of the touch buttons.
4. **Each game:** the genre's keys, the pad's layout, the touch layout held both ways, its context actions, its assists.
5. **The extras last** (a DualSense's), each behind its permission.
6. **Verify:** each page's checks, the pixel comparison, then the owner's play test (`docs/HANDOFF-CONTROLS.md`).

## Tools to reuse

In this repository; each is also a pattern to copy into another game's tests.
- **The engine:** `input.lastDevice`, `input.layoutDevice`, `input.label`, `input.swipe`, `input.touchSet`,
  `input.assist`, `E.assist`, `E.Menu`, `E.Dialog`, `E.Shell`, `E.session` (record and replay, `stream` for readings
  from outside the page's events).
- **`engine/modules/dualsense.js`:** a DualSense's extras over WebHID or 52in1's channel, each behind its permission. A
  reference for a game on another engine too.
- **`tools/phone-test.mjs`:** every kit on emulated phones held both ways, with real touches; target sizes, taps after
  the keys, the stick's half, notices clear of the buttons.
- **`tools/standard-test.mjs`:** glyphs, labels, swipes, assists, the layout's device under a press, no Ctrl beside WASD.
- **`tools/ed-controls-test.mjs`:** a game's controls end to end, with a pad stand-in and a stand-in for 52in1's
  companion (`window.AIHubSettings`), the DualSense's rows and its gyro included.
- **`tools/kit3d-test.mjs`, `tools/audio-test.mjs`:** the 3D kits on phones; 52in1's volumes reaching the game.
- **`tools/replay.mjs`, `tools/filmstrip.mjs`, `tools/check.mjs`:** a recorded session played back exactly, an
  animation as frames, a page opened and looked at.

## Testing recipes (any game, Playwright)

- **Real touches,** not clicks: CDP's `Input.dispatchTouchEvent` (touchStart, touchMove, touchEnd, a point per finger).
  A click skips the pointer events a tap rule reads and can't hold two fingers. (touchEnd lists the points that end.)
- **The phones:** 320 × 568, 360 × 640, 375 × 667, 390 × 844 and 430 × 932 upright, and each on its side; `hasTouch`,
  `isMobile`, a device scale of 2 or 3.
- **A pad:** replace `navigator.getGamepads` in an init script with a standard-mapping pad the test drives, and fire
  `gamepadconnected`.
- **52in1's companion:** define `window.AIHubSettings` with the fields the game reads (52in1's catalogue page, *Settings
  and the DualSense*), changing them over the game to see it follow.
- **Every target a thumb's size:** for each clickable thing on each screen, its box in CSS px; a sweep over every
  screen at every size, listing what is under 44.
- **Nothing else moved:** screenshots of the build before and after, on a virtual clock with a seeded `Math.random`,
  compared pixel for pixel; each difference must be an intended one.
- **Heuristics:** a headless harness of scenarios (the true input, its noise, an oracle for the right answer) run at 30,
  60 and 144 frames a second with a few seeds, scored before and after.
