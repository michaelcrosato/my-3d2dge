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
| Touch: a thumb's size | By touch (`layoutDevice` 'touch') E.Menu's rows, E.Dialog's choices, the click module's panel and the Shell's tabs and sliders are at least 44 CSS px; a menu stays on the screen, the rows that fit below its place shown (at least three) and the rest scrolling under a finger. `input.layoutDevice` is the device in use, held while a press that can still be a tap is down and for the step that reads its tap: nothing grows under a finger, so the first tap after the keys or a pad picks what it pressed on, and the rows grow after it (a layout of the game's own sized by the device reads it too; prompts read `lastDevice`). A finger moved past a tap's reach (12 CSS px: a thumb steering) is no tap though it comes back, as on a phone, and holds nothing; a mouse's click is lifted near where it pressed, wherever it went between, and its press holds until it lifts. A new scene or Shell screen is laid out for the device in use (a thumb resting on the stick as GAME OVER or Settings comes up); a box play goes on under (a radio) keeps clear of the touch buttons as they come back. A pad, keys and a mouse see them as before. | `Input`, `Menu`, `Dialog`, `Shell` |
| Touch: nothing over a button | While touch buttons are on the screen, the Shell's pieces at the bottom (the toast on a narrow screen, the prompt, the tip, the tutorial card, the minimap, the key strip) stand above them, all of them (in two columns, those that come and go too: nothing moves as a fight's BLOCK pops up), or beside them where a short screen on its side has no room above (the screen's and the buttons' call: no toast tips it); and above one another where they meet (the toast over the card and the minimap or beside them, the prompt over the key strip), so a finger on the card's × or the minimap takes it, not the toast. Nothing a finger takes moves as the toast and the prompt come and go: their places are kept while they're away, and a toast of more than a line stands in the way a line's would, the card, the minimap and the key strip where they were (only the prompt and the tip over it give way). The minimap is no taller than the room under the status column. Where the toast, the prompt and the tip won't fit one above another, the toast stands over the tip while it's up; where nothing else keeps the toast and the prompt on the screen (3D SHOOTER's ten buttons upright, a phone 320 high on its side with every piece up), a tutorial card lies under the others, and the tap that takes the toast away takes nothing under it. Without touch buttons each piece stands where it always did (a desk's and a TV's as before). | `Shell` |
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

Each cell is true of the kits its row names, as their own keys (`KEYS`) have them; where the kits differ, it names
the kit.

| Genre (kits) | Keyboard and mouse | Pad (PlayStation) | Touch assists (`input.assist`) |
|---|---|---|---|
| Hack-and-slash (Emberdeep) | WASD move, the mouse aims, left and right click and 1-4 the skills, Space dodge, Q potion, E interact, T portal, I bag, Tab map, Esc menu | left stick move, right stick aim, □ △ ○ L1 R1 R2 the skills, ✕ dodge, L2 potion, L3 interact, R3 portal, the touchpad map, Create the bag | the basic attack by itself at a foe in reach; aim onto the nearest foe |
| Action adventure (adventure, stealth) | WASD move, J or left click attack (a click strikes toward the pointer), Esc menu; adventure: E, Enter, Space or F talk, C the camera; stealth: Space jump and climb, Shift sprint, C crouch, K or right click block, Q or L roll | □ attack; adventure: R2 attack too, ✕ talk, R3 the camera; stealth: ✕ jump, ○ crouch, L1 block, R1 roll, R2 or L3 sprint | a swing at a foe in reach (stealth: a guard who is chasing), a strike turned to the nearest; stealth: the stick at its rim sprints; context buttons: TALK (adventure), TAKE DOWN, PARRY, LEAP and LET GO (stealth) |
| Platformer, metroidvania | WASD or arrows, Space jump, J, X or left click attack (metroidvania: fire; E, F or right click the lash), Shift dash; metroidvania: Q held aims in place, Tab or R map (M is the starter shell's mute) | ✕ jump, □ attack (metroidvania: fire, R2 too), R1 or ○ dash; metroidvania: △ the lash, L1 or L2 held aims in place, the touchpad or Create map | platformer: none (jumps are the game); metroidvania: FIRE beside a foe lashes it; context buttons (DASH once found) |
| Beat-'em-up, fighting, sports | WASD or arrows; brawler: J or left click attack, K or right click kick, L sweep, Space or Z jump; fighting: U I punches, J K kicks; sports: J pass, K shoot, L lob, Q switch | brawler: □ (or R2) attack, △ kick, ○ sweep, ✕ jump; fighting: □ △ punches, ✕ ○ kicks (R1 R2 the heavy ones too); sports: ✕ pass, □ shoot, ○ or △ lob, L1 switch | brawler: face the nearest foe, the punch by itself at one in reach; fighting: a motion may skip its diagonal (236 reads as 26), its window half as long again; sports: none (a pass always finds the teammate) |
| Shoot-'em-up, arcade (shooter, arcade) | arrows or WASD move, Space, Z, J or left click fire (held in the shooter and arcade's formation; its rocks a shot a press); shooter: X or K bomb; arcade: C the classic look, its rocks: X, K or Shift hyperspace, ↑ thrust | ✕ or R2 fire; shooter: ○ or L2 bomb; arcade: △ the classic look, its rocks: ○ or L2 hyperspace, □ or R1 thrust | fire by itself (shooter; arcade's formation and rocks) |
| Into-the-screen and flight (blaster, sky) | WASD or arrows fly; blaster: Space, J, Z or left click fire, K, X or right click missiles, Shift, L or C roll, the mouse moves the safari's cursor; sky: Shift, Z or J throttle, X or K slow, Space, C or left click act (the chute, a landing, the helicopter's missile) | left stick fly; blaster: ✕ or R2 fire, □ or R1 missiles, ○ or L1 roll, gyro aim on the safari's cursor; sky: R2 throttle and L2 slow (analog; ✕ and □ too), R1 or ○ act, gyro aim fine-tunes the helicopter's | blaster: fire by itself, the jet's missiles by themselves at three locked, a tap in the safari onto a sight within a fingertip; sky: the helicopter turned onto a turret it nearly faces and its missile fired by itself |
| Racing (kart, zero, road, special) | W or ↑ (or Z) accelerate, S or ↓ brake (kart, zero, road: X too), A D or ← → steer; kart: Space or Shift drift, E or J item; zero: Space or Shift boost; road: Shift nitro, R rewind, Space or J fire; special: Space, X or C jump and fire (never Ctrl: rule 1) | R2 accelerate, L2 brake (analog), ✕ accelerates too, □ brakes too (special's fires); the triggers push back; kart: R1 drift, L1 item; zero: R1 or ○ boost; road: R1 or ○ nitro, L1 rewind; special: ✕ or ○ jump, □, R1 or L1 fire | the throttle held by itself (not while the stick pulled down brakes); kart: the item used when a CPU driver would use it (a boost on a straight, a shot with a kart ahead); road: the striker fires and the rider punches by themselves; special: the arena's kart drives and fires by itself, the fort fires at what it faces |
| Puzzle, rhythm | arrows move, Z X rotate, Space drop, C hold; rhythm D F J K or the arrows | d-pad, ✕ ○ rotate, d-pad ↑ drop, △ hold; rhythm the d-pad and face buttons | puzzle: none (the game is the moves); rhythm: wider timing windows for the glass's lag (the lanes take a finger each) |
| RPG, roguelike | WASD or arrows (roguelike: the numpad's 7 9 1 3 the diagonals); rpg: Enter, Space or E confirm, Esc back, Tab or I menu; roguelike: Space, . or the numpad's 5 wait, Q potion, R scroll, G to the stairs; the mouse clicks menu entries and the ground (roguelike: a seen cell, walked to by path) | rpg: ✕ confirm, ○ back, △ menu; roguelike: ✕ wait, □ potion, △ scroll, R1 to the stairs | rpg: a tap on the ground walks there, the reach to talk wider, a command with one target takes it at once; roguelike: STAIRS walks there once they are seen (a tap on a cell walks there too); context buttons |
| Strategy and sims (tactics, rts, sim, artillery), point-and-click | the mouse first: left click select and act, right click command (rts), look (point-and-click) or back (tactics, sim); rts: a box to select, Ctrl and a number key keep a group (the page asks before it goes while a match runs), the number calls it; the wheel zooms (tactics, rts, sim; artillery: the weapon), WASD or the arrows pan (rts, sim; tactics: the cursor; artillery: walk and aim), the screen's edge pans (tactics, rts); artillery: a drag back fires, a click walks; point-and-click: a letter for each verb; hotkeys | a cursor on the left stick (artillery: it walks and aims), ✕ select (artillery: held, it charges, let go it fires), ○ back (point-and-click: drops the item), L2 R2 zoom (tactics, rts, sim), the right stick pans (rts, sim) or looks about (tactics, artillery); L1 R1: tactics turn the view, rts every one of a kind and the army, sim slower and faster, point-and-click hop from thing to thing; △: tactics the next hero, rts attack-move, sim the path tool, point-and-click every verb, artillery the weapon | tactics, rts, sim: a tap selects, a drag pans, two fingers pinch the zoom (no two-finger pan); rts: a long press and a drag a box; point-and-click: a tap walks, or opens a hotspot's verbs; artillery: a drag back aims and fires, a tap walks; assists: rts an idle worker back to the mine, sim a plan fitted and a guest picked within a fingertip, artillery a walk hops a step, point-and-click a hotspot within a thumb's width |
| 3D action, platformer, horror, crawler | WASD or arrows; action: J or left click attack, Shift or K dash, Space jump, E, L or right click the bolt (toward the pointer), Q, Tab or middle click lock on, C the camera; platformer: Space jump, Shift or K dash, C the camera; a click takes the mouse to look (platformer; action: in the chase camera and first person); horror: E, F, J or Space check (fire while aiming), right click or K aim, Shift run, Q swap, I or Tab the items; a grid crawler (Grimrock's): Q E turn, A D sidestep, J or Space act, K bolt, H heal, 1-4 each one's act, M or Tab map, the mouse clicks the view and the party | left stick move; action, platformer: the right stick turns the camera; action: ✕ jump, □ or R2 attack, ○ dash, △ or R1 the bolt, L2 (or L1) lock-on, R3 the camera; platformer: ✕ jump, R1 or ○ dash; horror: L2 (or L1) aim, R2 or ✕ fire, ✕ check, ○ run, △ swap, □ or the touchpad the items; crawler: the stick steps and turns, L1 R1 step aside, ✕ act, □ bolt, △ heal, L2 R2 two more of the party's acts, the touchpad or Create map | action: a swing at a foe in reach, the bolt aimed onto one; platformer: none (jumps are the game); horror: the stick at its rim runs, the aim's height follows the lock; crawler: in real time, the front rank strikes by itself at a foe ahead |
| 3D shooter, flight, racing | shooter: WASD, the mouse looks (a click takes it), left click or J fire, right click or K aim, R reload, Space jump, C crouch, Shift sprint, E use, G grenade, Q or the wheel swap; flight: WASD or the mouse steer (the ship heads for the pointer), J, Space or left click fire, Q E roll, Shift boost, X brake; racing: W or ↑ gas, S or ↓ brake, A D steer, Space or Shift drift, E or J item, C the camera | shooter: L2 aim, R2 fire, ✕ jump, ○ crouch, L3 sprint, □ reload, △ swap, L1 grenade, gyro aim; flight: ✕ fire, L1 R1 roll, R2 boost and L2 brake (analog), gyro aim steers; racing: R2 gas and L2 brake (analog; ✕ and □ too), R1 drift, L1 item, R3 the camera; the triggers push back | shooter: fire by itself at a foe under the sights, the aim drawn onto one, a sprint at the stick's rim; flight: fire by itself at one in its cone; racing: the throttle held by itself, the item used when a CPU driver would use it |

## Checks

- `tools/contract-test.mjs` and `tools/standard-test.mjs`: the glyphs, `label()` on each device, the Shell's tabs, hover
  and swipes, `input.swipe()`, `input.assist`, `E.assist`, a dialog swiped away, `input.layoutDevice` held under a press
  and let go by a finger's drag (no tap after it, though it comes back) or a new scene, a mouse's held until it lifts.
- `tools/phone-test.mjs`: every kit on an emulated phone, upright and on its side; the engine's menus, a dialog's
  choices and the Shell's tabs and sliders a thumb's size, and a finger's first tap after the keys picking what it
  pressed on (a slow one too), a thumb resting on the stick keeping no new scene or Shell screen small, sports' radio
  clear of its buttons; a flick on the stick's half backing out of GAME OVER and a result menu, and steering in play;
  the Shell's toast, prompt, tip and card over no touch button on four phones held either way (the 3D kits' in
  `tools/kit3d-test.mjs`).
- `tools/audio-test.mjs`: inside 52in1, the music and the effects follow its Music and Sound effects volumes.
- The dualsense module's manual example runs headless (no DualSense: every call does nothing).
