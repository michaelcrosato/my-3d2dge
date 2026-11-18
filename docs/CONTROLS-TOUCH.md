# Touch: what we learned

The lessons of bringing the kits and Emberdeep to the standard's touch clauses (`docs/CONTROLS.md`: touch is an add-on,
upright and on its side, swipes, multitouch, context actions, simple assists), for an agent doing the same to another
game. The process and the tools are in `docs/CONTROLS-PLAYBOOK.md`. Touch was where most defects were, nearly all of
them in how a tap is read.

## A tap

1. **Act on lift, where it pressed, never as the finger lands.** A thumb flicking across the screen lands on things.
   Before this rule a flick that began on a button saved and quit from the pause menu, descended from the waystone,
   paid for a gamble or a service, bought a passive and ranked up a skill (D110, D111). A mouse may still act as its
   button goes down; a pad and the keys are unchanged.
2. **A tap's reach is 12 CSS px.** A finger that moves farther before it lifts is a drag for good, even if it comes back,
   as on a phone (iOS allows 10 pt, Android 8 dp). Letting a finger that wandered and came back count picked the row
   above on a menu that grew meanwhile (D116).
3. **A tap is its own finger's,** followed by its pointer from press to lift. The steering thumb landing or lifting during
   another finger's tap must neither cancel it nor take it (D115).
4. **A finger down as the window loses focus lets go** of its press and its hover: no tap and no tooltip after it.
5. **A tap in a hit-stop is kept** for the first step in play, not lost to the frozen frames. The engine keeps every
   press, release and click made during a hit-stop for every game (`game.freeze`, D119), so a game needs no latch of its own.
6. **A list that scrolls under a finger:** a press moved a few px (6) scrolls and is never a tap, so one press can't both
   scroll and choose.

## The layout under a finger

7. **Nothing grows under a held press.** Switching from the keys to touch grows the rows to a thumb's; if that happens
   as the finger lands, the tap is read against rows the player never saw (kart's BACK picked VS). Hold the device the
   layout is drawn for (`input.layoutDevice`) while a press that can still be a tap is down; grow after the tap (D116).
8. **Only a press that can still be a tap holds it.** A thumb resting on the stick must not keep GAME OVER or Settings
   small; a new scene or screen is laid out for the device in use, and a box play goes on under (a radio) never freezes.

## Sizes

9. **Every target at least 44 CSS px, on every phone, held either way.** Sweep every screen at a dozen sizes (320 × 454
   to 430 × 932, both ways) and list what is smaller; 732 states were swept for Emberdeep.
10. **Pages, not shrinking.** A screen too dense for a thumb splits into pages under a row of thumb-tall tabs (the bag,
    the shops), turned by a tap, a flick, L1 R1 or Tab (D108, D109). Taller phones keep the stack.
11. **Too close to tap:** a tap near several small targets opens a list of them, a row each (the passive tree's stars);
    things drawn 9 px apart (loot labels) get another way in (walking over picks up; a context USE offers the rest).

## Where things stand

12. **Upright, the stick owns the left half.** Buttons go in two columns in the right corner, clear of it, so a left
    thumb set down steers instead of pressing LOCK or BLOCK (D113). A row of three can stay a row.
13. **Context buttons appear only where they do something** (TALK beside someone) and are relabelled rather than hidden
    when one must stay put under a thumb; the ones that come and go sit at the far end of a row, so the others never
    slide under a thumb.
14. **Notices, prompts, tips, tutorial cards and the minimap stand clear of the touch buttons and of each other.** Read
    the buttons' box rather than assume a height. Nothing a finger is reaching for may move as a notice comes and goes,
    and the tap that takes a notice away takes nothing under it (D117). (A toast over BLOCK took the tap meant for it
    in the middle of a fight.)

## Swipes and menus

15. **Swipe away** dialogs, notices and menus. A flick that begins on the stick's half is the stick's in play; on a
    result screen, where nothing steers, it backs out too (D116).
16. **Every end screen backs out** on ○, Backspace and a swipe, after a short delay (0.4 s) so a dodge mashed as the run
    ends is no answer.

## Assists

17. **Simple ones, gated on touch and a Settings toggle,** so a pad and the keys never change: the basic attack at a foe
    in reach, fire at a foe under the sights, the aim drawn onto the nearest foe, the throttle held. If it is
    complicated to automate, it shouldn't be automated (the standard's words).

## Checks

- Real touches through CDP on emulated phones held both ways: a tap, a slow tap, a flick from a button, a finger that
  strays and comes back, two fingers at once, a tap right after the keys or a pad.
- A sweep of every screen's targets at every size.
- Notices against the buttons with a toast of one line and of several.
- `tools/phone-test.mjs` and `tools/kit3d-test.mjs` do all of this for the kits; `tools/ed-controls-test.mjs` for
  Emberdeep's taps.
