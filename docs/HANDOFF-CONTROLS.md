# Handoff: the controls standard, for the owner's play test

> **Status (2026-11-18, at v0.108.0):** the controls standard (D100, `docs/CONTROLS.md`) is built into the engine,
> every kit and Emberdeep (v0.107.0), its last gaps closed and five review rounds fixed (v0.108.0). What is left is the
> owner's: play it on the real devices, and read the calls made without them. It is temporary: when a part is done,
> its line goes; when none is left, this file goes.

**In short.** Everything was checked headless, in an emulated phone and with stand-ins for a pad, a DualSense and
52in1's companion. Nothing was tried on a real DualSense, phone or TV. Those are the play test.

## 1. Play it (only the owner)

- **A DualSense on a TV at ten feet,** in 52in1 (Settings, Connect a DualSense) and on a page of its own:
  - every screen by the pad alone, prompts in PlayStation glyphs, Xbox glyphs from Settings;
  - the extras, each only once 52in1's Settings allow it: the light bar, the adaptive triggers, gyro aim (Emberdeep:
    Controls, Controller, Gyro aim), the touchpad's swipe, the controller's speaker, the microphone;
  - **gyro aim's drift:** set the controller down, pick it up, aim slowly, track slowly. The aim should never creep at
    rest and a slow turn should move it (D118). The rule rests on the firmware taking the gyro's bias out, which no
    real controller confirmed here: if yours creeps, record a session (Settings, Tools) and it replays exactly.
- **The keyboard and mouse** at a desk: the genre keys (`docs/CONTROLS.md`, the table), hover moves focus.
- **A phone held both ways:**
  - Emberdeep's pages upright (the bag, the shops, the stash) and its loot panels on their side;
  - the kits' two columns upright (D113: rows of three stay a row; their third button reaches past the middle on a
    narrow phone);
  - toasts, prompts and tutorial cards clear of the touch buttons (D117);
  - swipes away, taps that act on lift (D110, D111, D115, D116).
- **A TV:** Emberdeep's words in the normal font (D109).

What the owner wants changed becomes a plan or a fix; what they report goes in `docs/FEEDBACK-LOG.md` if it is not
acted on.

## 2. Calls made without the owner, to read (each reversible: a revert undoes it)

Logged in `docs/DECISIONS.md` and flagged in pull request #235:
- **D107:** inside 52in1 the `dualsense` module uses the hub's channel, never WebHID.
- **D108, D109:** Emberdeep splits a screen into pages rather than shrink it; on a TV a long line is worded shorter.
- **D110, D111, D115:** Emberdeep under a finger: every target acts on a tap, as the finger lifts where it pressed.
- **D112:** crouch on C alone, never Ctrl beside WASD; the RTS asks before the page goes.
- **D113:** the kits upright: rows of four or five buttons in two columns.
- **D114, D118:** the gyro's drift, learned from what moves no aim and kept within a degree a second. A worn controller
  (drift past a degree a second) keeps the rest in its aim.
- **D116:** the engine's menus wait for a tap before growing to a thumb's; a finger past 12 px is no tap.
- **D117:** the Shell's bottom pieces above the touch buttons and one another; its costs (stealth upright at 320 × 568:
  the prompt over the objective while a card is up).

## 3. Left for later (an agent's, when the owner asks)

- D113's rows of three buttons on a narrow phone, if the play test finds the third button under a thumb.
