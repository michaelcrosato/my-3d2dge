# The controls standard: a DualSense on a TV first

Every game on my-3D2dge (the kits, Emberdeep, a builder's game) plays to this standard. It is the owner's (2026-11-16),
quoted first; the rest of this page says how the engine meets each clause and what a game does for the rest. It is a
standard for the controls and the interface only: a game's rules, levels and scoring stay as they are.

> **10-Foot Controller-First Philosophy.** Design the game around a PS5 DualSense (or any pad the browser reports in its
> standard mapping) played on a TV at 10 feet. With keyboard and mouse, it's the same game on the same screens, not a
> separate desktop layout, but they should feel native, not like stand-ins for controller buttons. The keyboard uses the
> keys PC players expect for the genre. The mouse aims, looks, and clicks menu items and things in the world (hover moves
> the focus) wherever the genre uses it. On-screen prompts follow the input used last: PlayStation glyphs for the
> controller (with a Settings option to show Xbox glyphs, A B X Y, instead), and keys and mouse buttons for keyboard and
> mouse.
>
> PS5 DualSense enhanced features where they make sense for the game: light bar, gyro, touchpad, analog triggers,
> adaptive triggers, haptics, speaker, and mic. PS5-only features are extras. The game must be fully playable on any
> controller. Features that need permission (like the mic) can only be turned on in the game's settings if the player has
> already allowed them in their 52in1 settings.
>
> Do not use overly dense, web-style data screens.
>
> Tertiary: Touch-only devices. Design the game for touch on a phone, played in both portrait (9:16) and landscape (16:9).
> Redesign the mobile UI from the ground up if needed for the best experience. Touch is an add-on and must not influence
> the way the game is played on gamepad or mouse/keyboard.
> - Allow players to swipe away temporary dialogue, notifications, and menus.
> - Use multitouch support.
> - Use contact/context-sensitive pop-up actions where needed.
> - Use assists to make up for the limits of touch controls: automate common, low-skill actions that are simple to code.
>   For example: Hack-and-slash: auto basic attack, so the player's other hand is free for abilities, Dual-stick shooter:
>   auto-fire at nearby enemies when the aim stick isn't in use, Racing: auto acceleration and gear changes, aim assist
>   when a player is aiming as is relatively close to the intended target. If the automation is complicated to implement
>   it is probably something that shouldn't be automated.

## What the engine gives every game

| Clause | The engine | Where |
|---|---|---|
| Controller first | Actions bound to the standard mapping (`Pad0` ✕ … `Pad15`), the left stick as the d-pad in menus, every menu driven by the pad, the triggers' travel (`input.value(a)`), a rumble on any pad (`input.rumble`, and every `game.hitFx`). `Pad16` (PS) is never pressed into a game: it is the 52in1 hub's, and so is Options while Create is held. `Pad17` is the DualSense's touchpad click. | section 5 INPUT |
| Prompts follow the input used last | `input.lastDevice` and `input.label(action)` (or `{key:action}` in a line; an open E.Dialog builds its pages again for a new device, calling again a line given as a function, `() => E.t(id)`): ✕ ○ □ △ L1 R1 L2 R2 Create Options Touchpad by default; Settings, Controls, Controller, **Button symbols** shows A B X Y LB RB LT RT View Menu instead. Keys and mouse buttons for the keyboard and mouse. The pixel font draws ✕ ○ □ △ in the PlayStation buttons' colours; the Shell draws a controller's buttons as chips. | `Input`, `E.font`, `E.Shell` |
| Native keyboard and mouse | The presets' keys, the player's rebinding, the mouse over a menu entry moves the focus (`E.Menu`, `E.Dialog`'s choices, every Shell screen), a click picks it. | presets, Shell |
| 10 feet | The Shell (pause, settings, controls, the HUD pieces) grows with the window: 14 px text on a laptop, about twice that on a 1,920 px TV. Settings and Controls are short pages behind tabs (L1 R1 or Q E), the focused row's help under the list, the buttons that work the screen along the bottom. | `E.Shell` |
| DualSense extras | The `dualsense` module: light bar, player lights, adaptive triggers, gyro aim, touchpad fingers and swipes, the controller's speaker, the microphone, each a row on the Controls screen's Controller tab. | `engine/modules/dualsense.js` |
| Permissions | The game never asks. Inside 52in1 the hub holds the controller: the module drives it through 52in1's own channel (`window.AIHubSettings`: `hub.dualsense` and `hub.openMicrophone()`), each extra only while 52in1's Settings allow it, and never opens it over WebHID (D107). On a page of its own, WebHID, the controller's speaker and the microphone are found without a prompt (`navigator.hid.getDevices()`, the Permissions API, the frame's Permissions Policy): only what the player already allowed works. Until then the row is locked and says so. | `dualsense` module |
| 52in1's volumes | Inside 52in1 the game's music is also times the hub's Music volume and every other sound (effects, the voice bus) its Sound effects volume, again when they change (`window.AIHubSettings` `music`, `effects` and its `change` event); the game's own Volume, Music and Effects settings still multiply, and the hub applies its master volume itself. | `game.audio` |
| Touch: a thumb's size | By touch (`layoutDevice` 'touch') E.Menu's rows, E.Dialog's choices, the click module's panel and the Shell's tabs and sliders are at least 44 CSS px; a menu stays on the screen, the rows that fit below its place shown (at least three) and the rest scrolling under a finger. `input.layoutDevice` is the device in use, held while a press is down and for the step that reads its tap: nothing grows under a finger, so the first tap after the keys or a pad picks what it pressed on, and the rows grow after it (a layout of the game's own sized by the device reads it too; prompts read `lastDevice`). A pad, keys and a mouse see them as before. | `Input`, `Menu`, `Dialog`, `Shell` |
| Touch: swipe away | `input.swipe()` (a one-finger flick). E.Dialog skips its text and closes (a question goes to its last page), E.Menu cancels on a sideways one, `game.note` goes, the Shell's toast and tutorial card go at a swipe and its screens go back. A flick that begins on the move stick's half is the stick's, but E.Menu and a modal E.Dialog take it too where the game read no steer from the stick (`move()`, `drag()`) from a quarter of a second before it landed: a game over, a result menu. | `Input`, `Dialog`, `Menu`, `Shell` |
| Touch: multitouch | The move stick and every touch button take a finger each; `input.zones` hold an action per finger (flippers, lanes); a pinch zooms where the scene allows. | `Input` |
| Touch: context actions | `input.touchSet(action, label, show)` pops a button up only where it has something to do (TALK beside someone) and relabels it. In the row layout the others close up round a hidden button, so the buttons that come and go go first in the row (the far end from the corner) and never slide another under a thumb; one a thumb holds while another must stay put (AIM and FIRE) stays shown and is relabelled. | `Input` |
| Touch: assists | `input.assist`: true while the player plays by touch and Settings, Touch, **Touch assists** is on (the default). Every assist is gated on it, so a pad, a keyboard and a mouse play as before. `E.assist.nearest(x, y, targets, range)` and `E.assist.aim(x, y, dx, dy, targets, { cone, range })` for auto-attack and aim assist. | `Input`, `E.assist` |

## What a game does

1. **Keys by genre.** The keys a PC player of the genre reaches for first (the table below), the old ones kept as
   alternates where they don't clash. One action per key in a scene: a key that both attacks and talks is a bug. Never
   Ctrl (or ⌘) beside WASD: the browser closes the tab on Ctrl+W before the page hears it, so crouch is C. Where Ctrl is
   the genre's own (an RTS's Ctrl and a digit for a group), leaving the page asks first while a match runs (on a page of
   its own; D112).
2. **The pad in the PlayStation layout.** ✕ confirms and jumps, ○ goes back (and dodges in action), □ and △ the next
   actions, R2 and L2 the analog pair (throttle and brake, fire and aim), R1 and L1 the shoulder actions, Options pauses,
   the touchpad click (`Pad17`) opens the map where there is one, always with another button as well.
3. **The mouse where the genre has it.** It aims (toward the pointer: `game.mouseGround()`, `input.pointer()`), it looks
   (the 3D cameras' pointer lock), it clicks menu entries and things in the world (`input.clicked()`, `r.pick`), and its
   hover moves the focus in every list the game draws itself.
4. **Prompts from `label()`.** Every key or button a player reads comes from `input.label(action)` or a `{key:action}`
   line. No `PRESS ENTER`, no `Z`, no `A BUTTON` written into a line.
5. **Readable at ten feet.** No dense, web-style screens: short lists, one thing a row, the details of the focused one
   beside or below it; big type for what matters (`E.Menu`'s `scale`, the Shell's TV size). On a TV the words a player
   reads are in the normal font: a line too long is worded shorter or loses its last hint, never shrunk to the tiny one
   (Emberdeep: `UI_tv()`, `UI_tfit`).
6. **DualSense extras where they mean something**: the light bar shows a state (health, danger, the team), the triggers
   push back on throttle, brake, bowstring or gun, gyro aim fine-tunes an aim on top of the stick, the touchpad opens the
   map. Each has another way in: the game is whole on any controller.
7. **Touch on its own terms, upright and on its side.** Every temporary box, banner and menu of the game's own swipes away
   (`input.swipe(true)`; a game over or a result menu too, its `onCancel` read once it has shown a moment, so a dodge
   mashed as the run ends is no answer: the starters' `backOut`), context buttons appear only where they act (`touchSet`),
   and the move stick's half stays the stick's in play (a menu of the engine's that nothing steers under backs out on a
   flick there too): upright, a row of four or more buttons that would reach across the middle goes in two columns in
   the corner (`layout: 'grid'`, the starters' `touchColumns`). The simple, common, low-skill
   actions run by themselves on touch (the table below), each `if (input.assist)`. Something complicated to automate is
   left to the player. Everything a thumb presses is at least 44 CSS px on every phone held either way: a screen too
   small for its layout splits into pages under thumb-tall tabs (Emberdeep's bag and shops: a row of tabs held upright, a
   rail of them down the right on its side), turned by a tap, a flick, or L1 R1, rather than shrink. A button that
   spends acts when the finger lifts, so a swipe that begins on it presses nothing.

## By genre

| Genre (kits) | Keyboard and mouse | Pad (PlayStation) | Touch assists (`input.assist`) |
|---|---|---|---|
| Hack-and-slash (Emberdeep) | WASD move, the mouse aims, left and right click and 1-4 the skills, Space dodge, Q potion, E interact, I bag, Tab map, Esc menu | left stick move, right stick aim, the face buttons and shoulders the skills, R3 portal | the basic attack by itself at a foe in reach; aim onto the nearest foe |
| Action adventure (adventure, stealth) | WASD move, J or left click attack toward the pointer, E talk and use, Space roll or jump, Shift sprint, C crouch, Esc menu | □ attack, ✕ talk / jump, ○ dodge or crouch, △ use | a swing at a foe in reach; context buttons for talk and takedowns |
| Platformer, metroidvania | WASD or arrows, Space jump, J or left click attack, Shift dash, Tab or R map (M is the starter shell's mute) | ✕ jump, □ attack, R1 dash, touchpad or Create map | none beyond context buttons (jumps are the game) |
| Beat-'em-up, fighting, sports | WASD or arrows, J K L (and U I O) attacks, Space jump; sports J pass, K shoot | □ △ ○ ✕ attacks, R1 R2 specials; sports ✕ pass, □ shoot | brawler: face the nearest foe; sports: the pass to the nearest teammate |
| Shoot-'em-up, arcade | arrows or WASD, Space or Z fire (held), X bomb; the mouse steers in a cursor shooter | ✕ or R2 fire, ○ bomb | fire by itself; aim assist where the player aims |
| Into-the-screen and flight (blaster, sky) | WASD or arrows fly, the mouse moves a cursor where there is one, Space or left click fire, Shift boost | left stick fly, R2 fire or throttle, L2 brake, gyro aim | fire by itself at what is ahead; aim assist on the cursor |
| Racing (kart, zero, road, special) | W or ↑ accelerate, S or ↓ brake, A D or ← → steer, Space or Shift drift, E item (never Ctrl: rule 1) | R2 accelerate, L2 brake (analog), ✕ also accelerates, R1 drift, L1 item; the triggers push back | the throttle held by itself, gears by themselves |
| Puzzle, rhythm | arrows move, Z X rotate, Space drop, C hold; rhythm D F J K or the arrows | d-pad, ✕ ○ rotate, △ hold; rhythm the d-pad and face buttons | puzzle: none (the game is the moves); rhythm: none (lanes take a finger each) |
| RPG, roguelike | WASD or arrows, Enter, Space or E confirm, Esc back, Tab or I menu; the mouse clicks menu entries and the ground | ✕ confirm, ○ back, △ menu | tap to walk where it means one step; context buttons |
| Strategy and sims (tactics, rts, sim, artillery), point-and-click | the mouse first: left click select and act, right click command or look, a box to select, the wheel and WASD or the edges move the camera, Ctrl and a number key keep a group (the page asks before it goes while a match runs), the number calls it, hotkeys | a cursor on the left stick, ✕ select, ○ back, L1 R1 cycle units | tap select, a drag pans, long press and drag a box, two fingers pinch the zoom (no two-finger pan); artillery: drag to aim |
| 3D action, platformer, horror, crawler | WASD, the mouse looks (pointer lock), Space jump, left click attack, E use, Tab or I inventory, Shift run; a grid crawler (Grimrock's): Q E turn, A D sidestep, J or Space act, the mouse clicks the view and the party | left stick move, right stick camera, ✕ jump, □ attack, L2 lock-on | a swing at a foe in reach; the camera follows by itself |
| 3D shooter, flight, racing | WASD, the mouse looks and aims, left click fire, right click aim, R reload, Space jump or boost | L2 aim, R2 fire, gyro aim | fire by itself at a foe under the sights; aim assist; racing: the throttle held |

## Checks

- `tools/contract-test.mjs` and `tools/standard-test.mjs`: the glyphs, `label()` on each device, the Shell's tabs, hover
  and swipes, `input.swipe()`, `input.assist`, `E.assist`, a dialog swiped away.
- `tools/phone-test.mjs`: every kit on an emulated phone, upright and on its side; the engine's menus, a dialog's
  choices and the Shell's tabs and sliders a thumb's size, and a finger's first tap after the keys picking what it
  pressed on; a flick on the stick's half backing out of GAME OVER and a result menu, and steering in play.
- `tools/audio-test.mjs`: inside 52in1, the music and the effects follow its Music and Sound effects volumes.
- The dualsense module's manual example runs headless (no DualSense: every call does nothing).
