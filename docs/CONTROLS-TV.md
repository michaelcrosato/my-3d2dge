# Screens at ten feet, and the same screens at a desk: what we learned

The lessons of bringing the kits and Emberdeep to the standard's screen clauses (`docs/CONTROLS.md`: designed for a TV
at ten feet, no dense web-style data screens, keyboard and mouse native on the same screens, prompts that follow the
device), for an agent doing the same to another game. The process and the tools are in `docs/CONTROLS-PLAYBOOK.md`.

## Screens for a sofa

1. **Size for a TV by default.** The Shell grows with the window unless a game opts out: 14 px text up to 875 px wide,
   about twice that on a 1,920 px TV (D101).
2. **Settings and Controls are tabbed pages,** not one long list: a tab a group (Display, Sound, Comfort, the game's
   own), Controls a tab a device; turned by L1 R1, Q E, a click or a tap; the focused row's help once, under the list,
   not under every row (D101).
3. **No dense data screens.** Split them into pages and tabs rather than shrink them: a page per job (gear, bag,
   character), stats two to a line, a row per thing (D101; on a phone, D108).
4. **On a TV (a window 1,600 px wide or more) every word a player reads is in the normal font,** never the tiny one: the
   HUD's keys, the stats, the shops' footers, names over heads, ground labels, meters, markers.
5. **A line too long is worded shorter, never shrunk:** 8.3K for 8,348, with the whole number in the tooltip; a hint
   that doesn't fit drops from the end (D109).
6. **Off a TV, nothing changes:** prove it with a pixel comparison against the build before at the desk and phone sizes,
   so the TV work touches only the TV.
7. **The focus is visible from the sofa** on every screen, and every screen is reachable by the pad alone
   (`docs/CONTROLS-PAD.md`).

## The same screens at a desk

8. **Native, not a stand-in for the pad:** the same screens, with the keys a PC player of the genre reaches for first
   (the table in `docs/CONTROLS.md`), the old keys kept as alternates where they don't clash, one action per key in a
   scene (D106).
9. **Never Ctrl (or ⌘) beside WASD.** The browser closes the tab on Ctrl+W before the page hears it; crouch is C. Where
   Ctrl is the genre's own (an RTS's Ctrl and a digit), leaving the page asks first while a match runs (D112).
10. **The mouse aims, looks and clicks** menu items and things in the world wherever the genre uses it, and hover moves
    the focus. A mouse acts as its button goes down; a finger, as it lifts (`docs/CONTROLS-TOUCH.md`).

## Prompts and glyphs

11. **A prompt never names a key in its text.** It asks the input layer (`input.label`), so it follows the device used
    last: PlayStation glyphs by default, Xbox's from Settings, the keys and mouse buttons at a desk, a word under a
    finger.
12. **A screen built for one device rebuilds when the player picks up another** (a dialog's `{key:action}`), and a layout
    sized by the device waits for a finger's tap before it grows (D116).

## Sound

13. **Inside 52in1 the hub's Music and Sound effects volumes reach the game,** multiplying its own volumes, and follow
    their changes at once.

## Checks

- Screenshots at TV sizes (1,920 × 1,080 and larger) of every screen, read at the size a sofa sees them: no tiny text,
  no line cut or overlapping.
- A pixel comparison against the build before at desk and phone sizes: every difference intended.
- Every screen by the pad alone, by the keys alone and by the mouse alone; prompts on each device.
- `tools/standard-test.mjs`: labels and glyphs, no preset with Ctrl beside WASD, a dialog's keys following the device;
  `tools/audio-test.mjs`: 52in1's volumes.
