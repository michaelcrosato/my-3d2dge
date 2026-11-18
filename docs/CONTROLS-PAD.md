# The pad and a DualSense: what we learned

The lessons of bringing the kits and Emberdeep to the standard's pad clauses (`docs/CONTROLS.md`: a PS5 DualSense, or
any standard-mapping pad, first; prompts in PlayStation glyphs with Xbox's in Settings; a DualSense's extras where they
mean something, each an extra, the ones that need permission only once 52in1 allows them), for an agent doing the same
to another game. The process and the tools are in `docs/CONTROLS-PLAYBOOK.md`.

## The pad

1. **The PlayStation layout:** ✕ confirms and jumps, ○ backs out (and dodges in action), □ and △ the next actions, R2 and
   L2 the analog pair (throttle and brake, fire and aim), R1 and L1 the shoulder actions and a panel's tabs, Options
   pauses. `docs/CONTROLS.md` has the table by genre.
2. **○ backs out one layer, not the whole panel;** □ is a panel's second action (drop, sell, undo), so nothing is reached
   only by a key (D104).
3. **Every screen by the pad alone:** a focus the stick and the d-pad move, visible from a sofa, on every menu, panel and
   dialog, in the order the screen reads.
4. **The d-pad is for quick actions in play** where the stick moves (a hack-and-slash: map, labels, portal, use), and
   a saved binding loses its old d-pad codes when that changes (D104).
5. **The hub's buttons are the hub's.** Inside 52in1 the PS button and Create + Options call its bar: the PS button
   never reaches a game, and Create is held back a quarter of a second so a call to the bar doesn't also open the game's
   map (D103).
6. **The player's own time:** the pad's cursor and a free camera move by the step unscaled, so they still work while the
   game's time stands still (D105).
7. **One action per button in a scene,** and a genre's player finds its usual button there (D106).

## Prompts

8. **Prompts follow the device used last,** and never name a key in their text: ask the input layer for the label
   (`input.label`). PlayStation glyphs by default, Xbox's (A B X Y) from Settings.
9. **A dialog built for one device rebuilds when the player picks up another,** so `{key:action}` in its text follows.

## A DualSense's extras

10. **Every extra adds to a control that works alone:** the gyro to the stick, the touchpad's swipe to a button, the
    adaptive triggers to a rumble. The game is whole on any controller.
11. **Permissions are found, never asked.** No device chooser and no microphone prompt from inside a game: open only what
    the player already allowed, and say where to allow the rest (D102).
12. **Inside 52in1 the hub holds the controller.** A game never opens it over WebHID there (two owners of one
    controller, and a device list naming 52in1); it uses the hub's channel, `window.AIHubSettings` and its `dualsense`
    (the light bar, the triggers, the gyro, the touchpad, the speaker, `openMicrophone()`) (D107).
    - Each extra's row unlocks only while 52in1's Settings allow it, and a change over a game reaches it at once.
    - A microphone allowed after the game was opened says "Open the game again to use it" (`micLater`), not "Allow it
      first", which the player has just done.
    - The gyro is read only while gyro aim is on, so the hub's own Motion aim keeps the stick until then.
13. **The light bar shows the game** (health, danger), and is given back to the hub's glow when the game is done.
14. **The triggers are freed under a pause.**
15. **The controller's speaker plays at the hub's Sound effects volume,** as the game's other sounds; a Permissions
    Policy feature the browser doesn't know (`speaker-selection`) must not lock the row.
16. **A recorded session keeps the controller's readings** (`E.session.stream`), so a bug report replays exactly.

## The gyro's drift

The longest part of the pass: four rounds of review and fixes before the right rule (D114, D118).

17. **Read how the hardware reports before writing a heuristic.** The DualSense's firmware already takes its gyro's bias
    out of the report (Linux's hid-playstation: "correct DualSense gyro bias handling"), so a healthy controller at rest
    reads a few tenths of a degree a second. Earlier rules learned up to 3 degrees a second of "drift" from any held
    reading, and kept taking a slow, steady aiming turn for drift: a 20 s slow track lost 400 to 1,000 px, and each
    patch to give a wrong take back opened a new case.
18. **Learn only what moves no aim, and bound it.** On each axis, a held reading inside the aim's dead zone (1.5 degrees a
    second) is followed: near the drift learned at once, further after 2.5 s, and one the aim moves for only after 15 s.
    The learned drift stays within a degree a second, so a healthy controller at rest is always inside the dead zone and
    the aim never runs on by itself. Nothing is learned that would have to be given back.
19. **Score a drift rule on scenarios before shipping it:** healthy drifts (0 to 0.5) and worn ones (1 to 2) on every
    axis, a table, a calm hand, a trembling one; slow pans, long tracks, turns that ease in, a target walked past, a
    controller set down mid-play, a reconnect; at 30, 60 and 144 frames a second. Compare each rule's error with an
    oracle that knows the true drift.
20. **What a rule can't do, say:** a worn controller's drift past a degree a second stays partly in its aim; gyro aim is
    an extra, the stick always works, and Settings turns it off.

## Checks

- A pad stand-in (`navigator.getGamepads` replaced) through every screen: focus, ○ backing out a layer, prompts in
  each glyph set.
- A stand-in for 52in1's companion (`window.AIHubSettings`): each row locked and opened by its Settings, a change over
  the game, the microphone only once allowed, never WebHID.
- The gyro through the stand-in: a slow turn moves the aim all the way, nothing creeps at rest, a worn controller laid
  down after pans creeps no further; each check failing with the gyro silent.
- `tools/ed-controls-test.mjs` does all three for Emberdeep; `tools/standard-test.mjs` the glyphs and labels.
- No stand-in replaces a real DualSense on a TV: the owner's play test (`docs/HANDOFF-CONTROLS.md`).
