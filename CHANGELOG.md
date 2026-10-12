# Changelog

One version number covers the engine, its agent edition, the docs and the games (semantic versioning while the major number is 0: the minor number for features, the patch for fixes). Every change merged to `main` bumps it and adds its lines here (except a change confined to a prototype, a Temporary lab: `DOCTRINE.md`), sorted under the parts it touched: **Rendering**, **Animation**, **Art**, **Mocap**, **Engine** (the rest of it), **Emberdeep**, **Characters**, **Tools**, **Docs**.

- `node tools/version.mjs 0.8.0` writes a new number everywhere it lives and opens a section here; `npm test` fails while any place disagrees or this file has no section for it.
- Each deployed page carries its build, the commit it was deployed from: `My3D2dge.build` and `My3D2dge.versionLabel()` (`v0.7.0 · a1b2c3d 2026-10-07`), shown on the Emberdeep title, in its Developer panel, on the Labs page and in the Mocap Lab. Copies built from the repo say `dev-build`.

## 0.32.1 (2026-10-12)

Codex's review of 0.32.0, the player's zoom.

- **Engine**: the quarter second before a zoom is drawn at its new size is counted in steps unscaled by `timeScale`. In slow motion it took four times as long, and with the game stopped (`timeScale` 0) the zoom stayed a scaled preview for good.
- **Engine**: a zoom carried into a scene with less room (2x into the brawler's 1.5x) starts from that scene's end, so the first step out moves it. It took two steps before.
- **Engine**: a game's own setting called `zoom` stays its own: it shows on the settings screen and isn't read as the player's camera zoom. Only the engine's Camera zoom is left off where no scene lets the player zoom.
- **Docs**: `game.upright` reads the game's screen (`r.W` x `r.H`): a phone held upright with `expand: true`. A fixed `res` keeps its own shape on any phone, so `camera.tall` has no tall picture to fill there.
- **Tools**: `standard-test`: the zoom drawn after a quarter second at `timeScale` 0, a carried zoom moving at the first step, a game's own `zoom` setting kept, and Camera zoom left out of a game with no zoom (112 checks).

## 0.32.0 (2026-10-12)

The player's own camera zoom in every kit, on top of the zoom the designer starts each scene at.

- **Engine**: a scene's `camera: { zoom: [min, max], start, tall, wheel }` (or the game's, `new E.Game({ camera })`). Within `zoom` the player zooms the camera with the mouse wheel (a trackpad's pinch too), `-` and `=` (keys no action uses), a two-finger pinch on a phone, and Settings, Display, Camera zoom. `zoom: false` turns it off; a function of the game gives a range per screen shape.
  - The player's zoom is kept (`settings.zoom`, a factor on top of the game's: it carries across scenes and screen shapes), and `game.zoom` is the two together.
  - Each change shows `ZOOM 1.65x` (`MIN`, `MAX` at the ends): the number to give `start` when tuning by feel.
  - `start` is the zoom a scene starts at, `tall` the one on a screen held upright (`game.upright`), applied again as the phone turns. `resetCamera()` goes back to it.
  - `wheel: false` leaves the wheel to the game. `game.zoomBy(k)` zooms as the player would (a button of the game's own), `game.zoomRange()` reads the range, `input.zoom()` the zoom asked for since the last step, `input.pinching` a pinch in progress.
- **Engine**: a pinch is two fingers on the canvas moving apart or together, both of them. A thumb steering the stick beside a resting finger isn't one, and the stick and taps go on as they were. Once it is one, it takes over the stick and the tap.
- **Rendering**: while the player pinches, turns the wheel or slides the setting, the world already drawn is scaled about the camera's focus under the HUD, a preview. The new zoom is drawn a quarter second after they stop. A new size bakes the floor, walls and props again (about 0.4 s in the adventure), so it happens once, not at every step: a pinch with every step drawn hitched for up to 0.9 s in the adventure.
- **Rendering**: a `TileMap` keeps its baked wall blocks for its last four views, not one: back to a zoom or turn already seen is about 20 ms, not 120.
- **Engine** (agent edition): `game.upright`; `zoomBy` and `zoomRange` do nothing there, as `setZoom` doesn't.
- **Characters** (the starter kits, `src/starter/`): the kits declare their cameras.
  - The adventure zooms .85x to 2x on a wide screen and 1x to 2x held upright, where its forest is sized for 1x. The platformer zooms .75x to 2x and starts at 1.5x upright (`tall`), the brawler .75x to 1.5x and starts at 1.5x upright, and the RPG .75x to 2x, 1.5x upright.
  - The animation lab starts at 1.5x (`start`), the stealth kit zooms .75x to 2x, and the shooter's is off (its playfield is the screen).
  - The shell's own wheel, `-` and `=` and its upright fit (`fitZoom`) are gone: the engine does them. `0` resets the player's zoom too.
- **Tools**: `phone-test` section 6, zoom (50 checks):
  - Two fingers apart and together zoom, the hero standing; a thumb steering beside a resting finger zooms nothing; the zoom is kept across a reload.
  - Settings' slider zooms; the shooter has none.
  - The brawler starts at 1.5x upright and 1x on its side, and the player's .8 makes them 1.2x and .8x.
  - On a computer the wheel, `-` and `0` work.
- **Docs**: `API.md`, `AI_GUIDE.md` (Scenes, Camera), `README.md` and `docs/STANDARD-FEATURES.md` (touch, settings): the player's zoom and the `camera` option.

## 0.31.3 (2026-10-12)

The owner tested the adventure on the Galaxy S25: smooth with Frame rate on Auto.

- **Docs**: D25 and D26 in `docs/DECISIONS.md` confirmed by that test (the readings D26 waited for).

## 0.31.2 (2026-10-12)

Codex's review of 0.31.1.

- **Tools**: `replay.mjs --pacing`:
  - A stall that spans a change of refresh counts each second's share at that second's refresh: a 2.5 s stall from 60 Hz into 120 Hz read 299 refreshes missed, all at 120 Hz, and now reads 209.
  - A session begun hidden (a tab opened in the background: only its showing is recorded) leaves that time out too, and the hidden count is of gaps.
  - `phone-test`'s made-up session begins hidden (0.31.1: 537 refreshes missed, now 299).

## 0.31.1 (2026-10-12)

Codex's review of 0.31.0: the session a phone sends must replay, and read, true.

- **Engine**: a replay's pause menu has Save session too (doing nothing): the recorded tap on it landed on the next button, Quit to title, so a session saved from the menu replayed to Quit's question.
- **Tools**: `replay.mjs --pacing`:
  - Each second's refresh is read from that second (a phone with adaptive refresh changes it): a 60 Hz stretch after 120 Hz read as half its refreshes missed.
  - Time the page was hidden (its recorded visibility events) is left out: a locked screen read as minutes of missed refreshes.
  - A stall of seconds is spread over the seconds it took, each its own column (it filled one, and shifted the rest).
- **Tools**: `phone-test`: the session saved from the menu replays exactly and ends on the pause menu (0.31.0: on Quit's question); `--pacing` on a made-up session of 120 Hz, 60 Hz, hidden time and a stall (0.31.0: 1018 refreshes missed, now 299) (43 checks).

## 0.31.0 (2026-10-12)

A report of choppy play from a phone, with its evidence: the device's own refreshes, recorded and read in a second.

- **Engine**: a recorded page (`?record=1`, `E.session.record(true)`) has Save session in the standard pause menu: the session to the share sheet on a phone (a download elsewhere). A phone has no console to call `E.session.share()` from.
- **Tools**:
  - `replay.mjs --pacing`: no replay, the device's refreshes as the session recorded them (a frame's time is its refresh's): the refresh (the shortest gap that recurs), how many were missed and how unevenly, second by second. A 120 Hz phone dropping frames reads at a glance.
  - `phone-test`: a recorded adventure's pause menu, tapped on an emulated phone, has Save session, and it shares the session with its frame times (41 checks).
- **Docs**: `AI_GUIDE.md` (sessions), `CLAUDE.md` (bug reports).

## 0.30.1 (2026-10-12)

Codex's review of 0.30.0.

- **Engine**:
  - Frame rate 60 halves a screen of exactly 100 Hz too (a measured refresh wobbles: 95 Hz and up now).
  - Drawn every other refresh, 90 gaps of one and a half refreshes or more in a row mean the display slowed, and its refresh is read afresh (a GPU behind lets the refresh between through some of the time). Picked 60 on a 120 Hz phone that then dropped to 60 Hz, the readout said 120 HZ (EVERY 2) for good. Both editions.
  - A game made with `pace: false` draws every refresh unless the player picks Frame rate 60 (their 60 did nothing).
- **Tools**: `phone-test`: on the virtual clock, 60 on a 100 Hz screen, a display dropping to 60 Hz while at 60, and `pace: false` with the player's 60 (each fails on 0.30.0) (40 checks).
- **Docs**: the `pace` option's doc comment.

## 0.30.0 (2026-10-12)

The frame rate in the player's hands, as popular phone games put it: Settings, Display, Frame rate.

- **Engine**: Settings, Display, Frame rate (`game.settings.frameRate`): Auto (the engine's call, as before: every refresh while the game keeps up, every other one, evenly, when it can't), 60 (every other refresh on a screen of 100 Hz and up: 60 a second on a 120 Hz phone) or Full (every refresh, always). A phone whose GPU Auto misreads gets an even 60 by the player's choice, and the three side by side show on the device what the pacing does. Full edition (the agent edition has no settings screen: Auto).
- **Tools**: `phone-test`: on the virtual clock, Frame rate 60 draws every other refresh with light frames, Full every refresh with its GPU behind, and Auto paces it again (37 checks).
- **Docs**: `API.md` (the standard settings), `AI_GUIDE.md` (a phone's frame), `game.drawEvery`'s doc comment.

## 0.29.2 (2026-10-12)

Codex's review of 0.29.1, and a flaky check that turned out to be a bug: the frame pacing could lock itself up from the first frame.

- **Engine** (frame pacing, both editions):
  - The first frame's gap is no longer read as a refresh: it is timed from `start()`, not from one, and came in at 4 to 7 ms on a 120 Hz screen. Read, the refresh passed for 200 Hz, and a game whose frames turned costly within its first 90 (before others replaced it) stayed every other refresh for good, drawing each anyway, unevenly (a GPU behind: 49% of the gaps 16.7 ms). Since 0.29.0.
  - The hold after refreshes are missed goes back to 3 s once the game has drawn every refresh for 10 s (it only grew: after a few slow moments, any later one held a minute).
  - Drawn every other refresh, gaps shorter than one and a half refreshes are still read, so a display that changes its refresh rate meanwhile is followed (only the skipped refresh's double gap is left out).
- **Tools**: `phone-test`: the pacing on a virtual clock, in a page of its own (the test owns `performance.now` and the display's refreshes; deterministic, a minute of play in seconds): a costly frame from the first refresh, a GPU behind, the 3 s hold, its doubling and its reset, a display that drops to 90 Hz and rises to 144 Hz while paced (on 0.29.1, 8 of those 9 checks fail). The GPU-behind check no longer follows the costly runs on one page (their history paced it whatever the GPU did), and the light frame's check moved to the virtual clock (on a busy machine, real timers miss refreshes, which the engine is right to pace) (35 checks).
- **Docs**: D26 in `docs/DECISIONS.md` amended.

## 0.29.1 (2026-10-12)

The frame pacing of 0.29.0 only saw a frame's own cost (its JavaScript). A phone's GPU draws after it, out of the page's sight: one that falls behind at 120 Hz misses refreshes at random, which reads as choppy as before.

- **Engine**: frame pacing also counts the refreshes missed between frames drawn at each: when more than about one in five is missed (the GPU behind), it draws every other refresh, evenly, for 3 s, then tries each again (6 s the next time, 12... up to a minute). The display's refresh is measured only while each refresh is drawn (two apart, a GPU behind skips the one between and a 120 Hz screen passed for 60, turning the pacing off). Both editions (D26).
- **Tools**: `phone-test`: the 120 Hz screen's GPU falls behind (busy 5 and 11 ms by turns after each light frame, a refresh while busy skipped): drawn every other refresh, 90% of the gaps 16.7 ms (0.29.0: every refresh, 48% 16.7 ms and the rest 8.3), and every refresh again once it keeps up (30 checks).
- **Docs**: `game.drawEvery`'s doc comment and `AI_GUIDE.md` (a frame that misses the refresh, its GPU's part too), D26 in `docs/DECISIONS.md`.

## 0.29.0 (2026-10-12)

The adventure was still choppy on a Galaxy S25 (a 120 Hz screen) with its GPU lighting off: its frame didn't fit a 120 Hz refresh, so frames came 8 and 17 ms apart at random.

- **Engine**:
  - A fast screen (90 Hz and up) that a game's frames can't keep up with is drawn every other refresh, evenly, instead of at random; the updates still run at every refresh, and a game whose frame fits keeps the full refresh. `game.hz` (the display's refresh, measured) and `game.drawEvery` (1 or 2); `new E.Game({ pace: false })` draws every refresh as before. Both editions (D25, its own commit).
  - `r.actor(..., { every: 2, key })`: a background character's finished image (outline, rim light) is drawn again for a frame before it is drawn anew, at the place it stands now: townsfolk animate at half rate, as classic games' do, and a phone's frame goes to the hero and the foes. Not while it flashes, with a ghost, x-ray or GPU lighting.
  - Settings, Display, Show frame rate: at the top of the screen, frames drawn a second, the screen's refresh (and EVERY 2 when paced) and a frame's cost in ms, to read a game's speed on the device itself.
- **Characters** (the starter kits, `src/starter/`), adventure: the townsfolk and pets animate every other frame (its frame about 13 ms here before, 11 now: they were 5 of it); Lighting's Auto reads the main pointer (a phone with a stylus has a fine one too, and got GPU lighting).
- **Tools**: `phone-test`: a 120 Hz screen (frames on an 8.33 ms grid): it reads 120 Hz, a 10 ms frame is drawn every other refresh with most gaps 16.7 ms, a light one every refresh, `pace: false` every refresh (28 checks).
- **Docs**: `API.md` (`every`, `key`, the readout), `AI_GUIDE.md` (a phone's frame: 8.3 ms at 120 Hz, background characters at half rate, the readout), D25 in `docs/DECISIONS.md`.

## 0.28.0 (2026-10-12)

The first real-phone test of the kits: four things found in ten minutes, fixed, and a phone test that finds them in one.

- **Engine**: `input.steer = 'drag'`: a finger anywhere on the screen (the buttons aside) steers by `input.drag()`, with no stick drawn under it. The stick only took a finger on its own half of the screen.
- **Characters** (the starter kits, `src/starter/`):
  - Shooter: a thumb anywhere steers the ship, and the ship goes 1.5x as far as the thumb, so one swipe over two thirds of the screen crosses it. It took a thumb on the left half only, one to one: to cross the screen you lifted it and swiped again, and a touch on the right half did nothing.
  - Brawler: the street on the screen is the street you can walk. The camera stops at a fight's lock, so the screen's edge is the wall (Final Fight), and a lock never falls inside the screen (a wide one starts the fight at its edge). A wave used to stop the hero at a line in the middle of the street, with more of it in sight.
  - Adventure: Settings, Adventure, Lighting: Auto (GPU lighting on a computer, Fast on a phone), GPU or Fast. GPU lighting draws each frame twice and lights every pixel, which a phone's frame rate paid for; the floor is lit already.
  - RPG: on a touch screen the battle is played with big buttons a thumb hits (38 px tall, 44 CSS px and more on a phone), after mobile RPGs: a 3 x 2 grid of the commands and AUTO (the party fights by itself: heals the weakest, sweeps a crowd, hits the weakest foe), then a button per target with its HP, and BACK. The party's cards sit above the grid on a phone held upright, beside it on its side. A tap on a fighter still targets it; keys and a pad keep the command list.
- **Tools**:
  - `npm run test:phone` (`tools/phone-test.mjs`): the kits on an emulated phone, upright and on its side, in about a minute: the first tap on each title starts it, one swipe crosses the shooter's screen from anywhere, no brawler street in sight beyond where the hero can walk, Fast lighting and a frame in budget in the adventure, the RPG's buttons thumb-sized, a turn played by taps and AUTO fighting on (24 checks). With the fixes reverted it fails where the phone did. `test:changed` runs it for any change to the kits.
  - The shooter and the brawler have `state()` for tests, as the other kits do; `window.__game.titleMenu`.
- **Docs**: `AI_GUIDE.md` (smart phone controls: steering from anywhere, thumb-sized buttons, a camera that shows only walkable ground), `API.md` (`steer`), the README and `CLAUDE.md` (`npm run test:phone`).

## 0.27.5 (2026-10-12)

The full test after v0.27.4 failed in `stress-world` (its jump check), at random; the cause was in the check, not the game.

- **Tools**: `stress-world-test`: the jump check holds the press for 6 steps, as the game's input buffer holds one. A stray hit from the fight before it starts a hit-stop that skips steps, and swallowed a press that lasted only one (the hero "rose 0.0 units").

## 0.27.4 (2026-10-12)

From Codex's review of v0.27.2: three ways the RPG's portrait zoom fell short.

- **Characters** (the starter kits, `src/starter/`):
  - A phone held upright zooms in again for every new game. After the title or game over, the next RPG battle (or platformer or brawler level, after Retry) started at 1x: the shell still took it for the game it had already fitted.
  - RPG: the Gargoyle grows with the zoom as the other fighters do (its painted frames are cached at 1x and are now drawn at the zoom, pixels kept square). On a phone held upright it stayed small.
  - RPG: tapping a foe or ally counts anywhere on the fighter at any zoom. At 1.5x the top of the Dread Knight's helmet and the fighters' sides missed.

## 0.27.3 (2026-10-12)

A phone's first tap on a title sometimes did nothing: the kits' game entry needed a second tap about one time in five.

- **Engine**: a phone's first tap goes full screen, and the full-screen change clears the input (held keys, the stick). When it landed before the next step it wiped the tap too. A tap that has landed now still counts, and is placed on the screen when it lifts (where it touched what was drawn), not a step later after full screen has moved the canvas.
- **Tools**: `standard-test`: a tap whose full-screen change lands before the next step, with the canvas moved, still picks the entry it touched (108 checks).

## 0.27.2 (2026-10-12)

The RPG kit's two known nits on a phone: the seam where the plaza meets the painted grass, and small fighters on a phone held upright.

- **Engine**: a `TileMap` floor's contact shadow (`ao`) falls only along walls, not along the map's edge. A floor that runs on past the map (a painted ground, a backdrop) no longer meets it in a dark line. Both editions.
- **Characters** (the starter kits, `src/starter/`), RPG:
  - A phone held upright comes in to 1.5x, as the platformer and brawler do, and the two sides close up (closer together across, a little deeper in rank) so the whole fight still fits: the fighters are as big as a wide screen shows them. Turned on its side, they step back to their wide places; the player's own zoom holds until the shape changes.
  - The backdrop is painted for the zoom too, and its ground laid from the plaza's far edge on: one horizon across the screen, with no hill feet hanging below the treeline beside the plaza on a wide screen.
- **Docs**: `AI_GUIDE.md` says so.

## 0.27.1 (2026-10-12)

- **Characters** (the starter kits, `src/starter/`): the shooter's playfield is the whole screen on a wide one (a phone on its side, a desktop): the ship flies edge to edge and the waves spread to match, with no dimmed sides or gold rules. It was a 272-pixel column in the middle.
- **Docs**: `AI_GUIDE.md` says so.

## 0.27.0 (2026-10-12)

Every kit actually full screen on a phone, with a way back from every menu and controls made for thumbs.

- **Engine**:
  - On a touch screen the corner's menu button stays at the top right in play: it is the touch START (it pauses into the menu, or opens it on a title). START is no longer among the bottom touch buttons. Without the corner, a START of its own sits in the same place.
  - Every menu screen has a close button at the top right (where the menu button was), a back arrow at the top left when it is over another screen, and a sideways swipe on it goes back a screen.
  - The phone's back gesture steps back in the game before it leaves the page: an entry of the game's own in the page's history, added on a tap while there is somewhere to go back to. `game.back()` closes a menu screen, takes a scene's own `back()` (a sub-menu), or pauses play into the menu; at a title the next back leaves. `backGesture: false` leaves it out. The agent edition pauses.
  - Full screen comes back when a game starts on a phone after a gesture left it; only turning it off (the corner, the menu, `fullscreen.toggle()`) is kept. Settings version 2 forgets a version-1 `fullscreen: false` once (D24, its own commit).
  - `input.touchSet(a, label, show)`: a context button, relabelled or hidden while it has nothing to do (a hidden one lets go and leaves `touchArea()`).
  - `input.drag()`: how far the stick's finger moved this step, to steer one to one.
  - `game.cornerArea()`: where the corner's buttons cover the screen, to keep a HUD clear of them.
  - Pages get `overscroll-behavior: none`: no pull to refresh, no sideways swipe off the page.
- **Characters** (the starter kits, `src/starter/`):
  - Adventure: the rooms sit in a world that goes on past them (forest canopy above and below, the shrine's stone under the shrine), so a phone held upright is filled with world instead of a deck. A camera setting (Settings, Adventure, or C): Rooms slides screen by screen as Zelda's does, Scroll follows the hero. The HUD sits in the corners (the hero and hearts top left, gems, keys and a map of the rooms top right); the TALK button shows only beside someone and says NEXT in a dialog.
  - RPG: the HUD band on the bottom edge at every size and the battle in the space above it, a tall screen's sky darkening to the first stars. No touch buttons: tap a command, then a foe or ally; tap the commands (or back) to go back.
  - Platformer and brawler: a phone held upright zooms in to 1.5x, so the level and the street fill it; the player's own zoom holds until the shape changes. The brawler's enemy panel moves clear of the menu button.
  - Shooter: on a touch screen the ship follows the thumb one to one and fires by itself (no FIRE button); the HUD keeps clear of the menu button.
  - Stealth: ATTACK says TAKE DOWN when a takedown is in reach, BLOCK says PARRY in a guard's wind-up.
  - The game-over screen's back goes to the title. The page's "? API" button hides on a touch screen and fades after a few seconds on a desktop.
- **Docs**: the API card, `AI_GUIDE.md` (filling a screen edge to edge, smart phone controls), `docs/STANDARD-FEATURES.md`, the README; D24 in `docs/DECISIONS.md`. `examples/scarfrunner-side.html` (the prototype before the engine) fills a phone held upright and goes full screen at its first tap.
- **Tools**: `standard-test`: the corner's menu in play as the touch START, close and back buttons and a swipe on menu screens, the back gesture, `touchSet`, `drag`, full screen coming back with a new game, settings version 2 (107 checks).

## 0.26.3 (2026-10-11)

Two fixes from the review of v0.26.1's clicks and taps.

- **Engine**:
  - A click or tap counts when it lifts within a few pixels of where it landed, not when it lands. A thumb put down on a menu entry or a dialog to drag the touch stick no longer picks the entry or turns the page.
  - Any touch on the canvas makes the device touch (`input.lastDevice`), on the stick's half or not, so prompts switch to the touch buttons' names after a tap on the right half too.
- **Tools**: `standard-test`: a drag across a menu entry picks nothing, and a tap on the stick-free half makes the device touch (101 checks).

## 0.26.2 (2026-10-11)

The asset store plan, ready to run start to finish.

- **Docs**: `docs/HANDOFF-ASSETS.md`:
  - Section 12's prompt runs all five phases to completion in one go. Phase 0's gate is judged by the agent without waiting. Licenses stay CC0, and the paid benchmark waits for a yes (with no answer it is skipped). Each merged phase's Codex review is handled in a follow-up.
  - A new section 14 logs each merged phase, so a fresh session resumes where the last one stopped.
  - Phases take the next minor version instead of fixed numbers, which v0.26.0 and v0.26.1 overtook.
  - The manual budgets are re-measured at v0.26.1 (the agent header has about 97 tokens left).

## 0.26.1 (2026-10-11)

The kits' title menu could only be worked with keys or a gamepad: a click on an entry did nothing, and a phone, with no touch buttons on a title, could not get past it at all.

- **Engine**:
  - `E.Menu` answers to the pointer: a click or tap on an entry picks it, and the mouse over one moves the cursor. Every menu drawn with `menu.draw(r)` gets it: the kits' title and game over, and any game's.
  - A tap on an `E.Dialog`'s box finishes the line, then turns the page, as confirm does (a scene with no confirm button, like the brawler's boss taunt, no longer strands a phone).
  - `input.clicked()`: where a click or tap on the canvas landed, in screen pixels, for the step after it (for a HUD button of a game's own); `input.pointer()`: the mouse in screen pixels; `input.screenPoint(cx, cy)`.
  - `expand: { maxW, maxH }` never cuts the screen below `res` (a cap smaller than it is lifted to it). Both editions.
- **Characters**:
  - The kits' title says how on each device: "Tap a game to play it" on a touch screen, "Arrows + Enter or click" with keys.
  - From the review of v0.26.0: the brawler draws its foreground wall at every zoom (the camera keeps its band); the adventure's deck is measured from the hero's room in every view (isometric too); the RPG's HUD band moves right of the touch buttons when the player has put them on the left.
- **Tools**: `standard-test`: a tap and a click on a menu entry pick it, a tap beside it does not, a tap on a dialog turns the page (100 checks).
- **Docs**: `API.md`, `AI_GUIDE.md` and `docs/STANDARD-FEATURES.md` say menus and dialogs take taps and clicks.

## 0.26.0 (2026-10-11)

The starter kits are full screen at any shape (desktop, ultrawide, tablet, a phone either way up) with no black bars, and playable by touch. They were fixed 320x240 boxes (the shooter 240x320) letterboxed on every screen of another shape.

- **Engine**:
  - `expand: true` (a game's option, or a scene's): `res` becomes the least the screen shows, and the picture grows to fill the window at any shape with no bars (`r.W` x `r.H` grows; a 16:9 monitor shows about 427x240 of `'ps1'`, a phone held upright 320x690). `expand: { maxW, maxH }` caps it. Both editions.
  - The touch stick and a gamepad's left stick, pushed past halfway, press `up` / `down` / `left` / `right` as the d-pad does, so menus, dialog choices and the Platformer's ladders work with them. Before, a phone could not move a menu's cursor or climb a ladder. Both editions (the agent edition has no touch stick).
  - A bottom `E.Dialog` keeps clear of the touch buttons: beside them where it fits, else above them. `input.touchArea()` says where the buttons cover the screen, for a game's own prompts.
- **Characters** (the starter kits, `src/starter/`):
  - Every slice fills any screen with `res: 'ps1', expand: true` and a HUD anchored to the screen's edges, and makes something of the extra space:
    - Adventure: a wider screen shows the neighbouring rooms under a dim curtain. A taller one keeps the room at the top and lays the HUD out on a deck below it, with a map of the rooms; dialog opens on the deck.
    - Platformer: an upright phone lifts the level onto a band of soil, clear of the buttons, and the skies hang from the level's foot.
    - Brawler: an upright phone lifts the street onto a foreground wall, and wave spawns come from just past the screen's edge however wide it is.
    - Shooter: the playfield stays 272 wide, so the game plays the same, and is as tall as the screen. A wider screen shows the valley going on to each side, painted by the same functions, baked in strips as it scrolls in and dimmed beyond gold rules.
    - RPG: the sunset backdrop is painted at the screen's size, its ground the plaza's own grass and light. The HUD band sits on the bottom edge, or on a tall screen under the battle with a deck below; it slides clear of the touch buttons.
    - Stealth and the animation lab: their messages and timeline stay clear of the touch buttons. The lab gets touch buttons (replay, slow, hold) and its top bar drops below the corner's buttons.
  - Prompts name the player's own keys, after rebinding and on a gamepad (`prompt('attack', 'Sword')`, `input.label`), instead of hard-coded keys. That covers the HUD hints, the stage cards and the NPCs' lines. On a touch screen a hint the buttons already give is left out.
  - The title: a sixth hero in the lineup, the stealth slice's hooded assassin (one hero per genre slice). The ledge sits on the screen's bottom edge at any height, and the logo drops below the corner's buttons where it would reach them. START picks on the title and game-over menus, so a phone can start a slice. Game over is centred.
- **Tools**:
  - `tools/check.mjs --size 390x844@3` checks a game at any window size and pixel density (2 and up is a touch device). Its report says how much of the window the picture `covers` (1: no bars).
  - `standard-test`: expand at five shapes, the touch stick's directions, and a dialog clear of the touch buttons (98 checks).
  - The build's deep-link list for the full edition names `#stealth`.
- **Docs**:
  - `API.md`, `AI_GUIDE.md`, the agent edition's header and `docs/STANDARD-FEATURES.md` describe `expand`, what fills the extra space (the kits show four ways), the sticks' directions and `touchArea()`. `README.md` says the kits fill any screen.
  - The handoff package's template game fills any screen too (`expand: true`), its title and end screens centred, its prompt the player's own key.

## 0.25.5 (2026-10-11)

Two more details in the asset store plan, from a review of v0.25.4.

- **Docs**: `docs/HANDOFF-ASSETS.md`:
  - A body's span for shape collision runs from its feet to `z + h`. `E.Body` has no height today, so Phase 1 adds `h`, defaulting to a standing actor's.
  - `flip` is part of a raster's cache key, since it now mirrors the shape itself.

## 0.25.4 (2026-10-11)

A last precision pass on the asset store plan, from a review of v0.25.3.

- **Docs**: `docs/HANDOFF-ASSETS.md`:
  - A shape's `flip` mirrors the shape in its own axes before `facing`, unlike `r.prop`'s screen-space flip, so drawing and collision agree in every view.
  - A solid shape's collision box has a bottom as well as a top, so a body wholly below it passes under.
  - `sources` is keyed by download, and an entry's `src` is that key; entries never copy the record.

## 0.25.3 (2026-10-11)

More corrections to the asset store plan, from a review of v0.25.2.

- **Docs**: `docs/HANDOFF-ASSETS.md`:
  - A shape's `facing` means what a rig's does: where its front points, with 0 east. It defaults to π/2 (south), the direction shapes are written facing.
  - Collision for solid shapes is stated as requirements for Phase 1: the same placement as `r.shape`, and height-aware. `map.block` stops walkers, not jumpers, and is a whole tile wide.
  - `r.shape` has no `solid`, since `r.prop` has none to mirror.
  - TileMap gets `floorMat` for every floor cell, with `floorMats` per tag overriding it.
  - Each downloaded archive is one hashed source record that its entries name.
  - The recipe draws a set's shape by its qualified id.

## 0.25.2 (2026-10-11)

Corrections to the asset store plan, from a review of v0.25.1.

- **Docs**: `docs/HANDOFF-ASSETS.md`:
  - A facing at run time is in radians, as everywhere in the engine; only angles written in asset data are degrees.
  - A raster's cache key includes the shape's parameters, so two uses of one generator never share pixels.
  - Collision is gameplay, never drawing: a game registers a solid shape's footprint (`E.shapeFoot`) before its updates, and `r.shape`'s `solid` stays the renderer's option.
  - A set's ids are qualified by its name, so sets never overwrite each other or the core library.
  - Cutting a set carries the whole chain of shapes it `use`s.
  - The ledger keeps a hash of every downloaded file.
  - TileMap's material option is `floorMats`, since `floors` is the map's cache of baked floors.
  - A platform tile type keeps `style`, which picks its geometry, and gains `mat`.

## 0.25.1 (2026-10-11)

A plan for an asset store: objects, materials and pictures that agents write as data or translate from public libraries.

- **Docs**: `docs/HANDOFF-ASSETS.md`, the plan for the next releases. Most art families are closed today: 38 billboard props, wall faces, roofs and tile styles. Emberdeep adds its own walls by patching private engine methods, and builders read the source to find asset names.
  - Planning probed the idea. Eight objects written as 71 to 330 characters of data each (primitives with named materials) were drawn by a small depth-buffered renderer in every view and facing, with `E.tones` shading. Each read as itself in every view, and each with a matching prop looked at least as good as it.
  - The plan, in five phases:
    - a look gate with kill criteria (a Temporary lab);
    - an open material registry for floors, walls, roofs, tiles and shapes, plus `r.shape` and a core library (full engine);
    - a store of CC0 libraries converted with provenance and fit (Kenney, KayKit, ambientCG, CC0 pixel packs), with importers, sheets and an Asset Lab;
    - Emberdeep, the starters and the template game using it;
    - measuring tokens and look against canvas code and the benchmark.
  - It recommends extra (xhigh) effort and ends with the prompt that runs it.
- **Docs**: `docs/FEEDBACK-LOG.md` notes which parts of the two threshold themes (the look, reading the source) the plan takes up and which stay open.

## 0.25.0 (2026-10-11)

Emberdeep shows the engine's newer parts: perception, paired actions, the boot, rumble and the tools' handle.

- **Emberdeep**: Wardens (`32-wardens.js`). From depth 3, one to three hooded Wardens walk a beat on each level without a boss, a lantern on a staff, sweeping its light at each end. Each one's mind is an `E.Suspicion` fed by `E.sees` down its lantern cone (130 units, cut short by walls); `r.sightCone` draws exactly that cone on the floor, colored by its state: calm, notice ('?': it stops and turns), search (it walks to where it saw you and looks round), alert ('!'). Alert, it rings its bell for 1.4 s with its lantern held high (a stagger restarts it; `r.marker` points to it, on screen or at its edge), and the alarm wakes every monster that hears it (`E.hears`: 320 units, halved through a wall). A Warden that never rang leaves its tithe: gold and a magic item or better. A hit, or a noise it hears, tells it where you are.
- **Emberdeep**: executions and takedowns (`23-executions.js`), the engine's paired `E.ACTIONS.takedown` in play. A humanoid monster your hit staggers or crits at or under a quarter of its life (elites at 15%) reels for 2 s, its outline flickering, and E within 40 units executes it: the hero leaps onto it (the aerial takedown) and both bodies play one action. E within 22 units behind a Warden that hasn't raised the alarm takes it down silently (the ground takedown). Each gives back 6% of his life and a dodge charge; he can't be hurt while it plays. The target comes from `E.targets` (the nearest he can see), with a marker over its head and the prompt '[E] Execute the Skeleton'. An execution is heard 110 units away, a takedown 40: monsters that hear it wake with their packs. The autopilot executes whatever it can, so the title's demo shows them.
- **Emberdeep**: knocked flat, the hero gets up through the engine's `E.ACTIONS.getUp` (he sits up, comes to one knee and stands, untouchable until he is up; a dodge still rolls him out of it), where he popped straight back up.
- **Emberdeep**: the controller rumbles (`97-rumble.js`, the engine's `input.rumble`) with every screen shake, a blow taken (harder the more life it took), a crit (ten a second at most), a perfect dodge, an elite's or a boss's fall, a level and his death. Controls has a Vibration slider: the engine's `game.settings.rumble`, saved with the player's other choices.
- **Emberdeep**: the page's boot screen is Emberdeep's (`game.start({ boot })`): its title, an ember accent, lines of its own ("Whetting the longsword", "Filling the Wardens' lanterns") and two real steps: every monster's reach measured once (it was measured on each kind's first spawn) and the composed depths' order worked out ahead.
- **Emberdeep**: `game.debug`: `snapshot()` (mode, depth, level, mechanics, foes, the Wardens' states, the hero) is what `tools/check.mjs` prints and `tools/replay.mjs` logs; `teleport(x, y)` moves the hero.
- **Emberdeep**: the gallery's fifth reel, MOVES: the engine's actions on the hero, on a set of a stone block and a low wall (`r.box`) built to face the camera in any view: the execution and the takedown on real monsters, getting up, climbing up and down, hopping down, vaulting, a roll. `#gallery/moves/<name>` opens one.
- **Emberdeep**: Developer knobs for the new rules: execution threshold, reeling time and heal (Combat), a Warden's sight, its ring time and the alarm's reach (Monsters).
- **Docs**: `src/emberdeep/DESIGN.md`: the new parts, the BUS events `execute` and `alarm`, the `takedown` archetype flag, `m.hear` and `makeNoise`, and "What Emberdeep shows of the engine": a map from each engine part to where the game shows it, and what it leaves out on purpose. `README.md`: Wardens, executions, the MOVES reel, E and vibration in the controls.

## 0.24.0 (2026-10-11)

A boot for every game: a loading screen while there is work, and a report to screenshot when a game can't start.

- **Engine**: `game.start({ scenes, scene, boot: { title, version, steps: [[label, fn]], messages, min, checks, accent } })` runs the game's heavy setup one step a frame behind a boot screen: the system's checks (engine, browser, screen, canvas, GPU, sound, storage, input), each step with its time, a progress bar and lines of the game's own ("Counting the bells"; the engine's own when it gives none: "Reticulating splines"), then a warm-up frame drawn under it, so play starts without a hitch. A step may return a promise; headless and with `loop: false` the steps run at once (`game.booted`, `game.bootError`). The lines draw no numbers from the game's random stream.
- **Engine**: any error before play (a failing step, a script error, an error in the first update or draw) turns the screen into a report a player can screenshot: what failed, the error and where, a short code (`E3-` and six hex digits), and the system's lines, with Try again, Copy report and Continue. After play, errors keep the red box, which now ends with the report's short line. `E.diagnose()` gives the report at any time (`.text`, `.short`, and each field).
- **Engine**: `E.bootSplash(title)`: the screen's markup for the very start of a page's `<body>`. It shows from the first paint with a bar that moves while the page's scripts load (a CSS animation the browser runs on its own), and says so if the game's script never runs. The engine takes it over when it runs, and it goes once the game has drawn; `boot: false` takes it away at once. Both editions have the boot.
- **Emberdeep**: its page shows the boot screen from its first paint: on a phone-speed CPU at about 0.16 s, where it was 1.6 s of black.
- **Tools**: `tools/build.mjs` turns `<!-- @boot Title -->` into the splash (from the engine, so they never drift); the starter files, Emberdeep, Emberwell, Vesper's interface and the handoff template have it. `tools/check.mjs` and `tools/agent-test.mjs` count the failure report as the error box. `tools/standard-test.mjs`: 94 checks with the boot's.
- **Docs**: the boot in `AI_GUIDE.md` ("Standard features"), the API card, the agent edition's and the full engine's headers, `README.md` and `docs/STANDARD-FEATURES.md`. `docs/DECISIONS.md` D22 (the API index's budget rises to 37,000) and D23 (the boot, and errors before play as a report).

## 0.23.0 (2026-10-11)

Standard features in every game: what the owner's quality prompt asked of each game after it was built, now built in.

- **Engine**: every `new E.Game` has a pause menu (full engine) on its pausable scenes: Resume, the game's own items, Settings, Controls, Full screen, Help and Quit to title (it asks first, with Keep playing focused), by keys, mouse, gamepad or touch. Escape or B goes back a screen, P or Start closes the menu, and the game sees none of those presses. `menu: false` brings back the canvas PAUSED overlay.
- **Engine**: `game.settings`: the player's choices, saved per game with a version (`settings:` + the page's path, or `id`), every value checked when it loads (a bad one falls back to its default, blocked storage plays on with `saved: false`), applied at once: full screen, pixel scaling, sound, volume, music, effects, sound in the background, reduce motion, screen shake, screen flashes, the controller and touch settings, the bindings. A game adds its own with `menu: { settings: [...] }` and reads `game.settings.key`; `set`, `reset(group)`, `define`, `keys`, `spec`, `onChange`.
- **Engine**: the Controls screen and `input.rebind(action, 'keys' | 'pad', code)`: a key, mouse button or gamepad button rebound by pressing it; a conflict is said and changes nothing; Escape, Enter, the F keys, Start, the arrow keys and the d-pad stay with the menus; `unbind`, `resetBindings`; bindings survive scene changes (`input.use`) and are saved. `menu: { controls: { attack: 'Sword', debug: false } }` names actions or hides them.
- **Engine**: `game.fullscreen` (`supported`, `on`, `standalone`, `enter`, `exit`, `toggle`): the whole page; a phone's first tap goes full screen, and once the player leaves it the game never forces it back; refusals are noted; where it can't (an iPhone) the settings say to Add to Home Screen, and the page carries the home-screen app tags. `fullscreen: 'button' | false`.
- **Engine**: the corner: a menu button and a full-screen button at the top right inside the safe area, shown on titles, pauses and game overs, when the mouse nears the top, and (the menu) on a touch screen without touch buttons. `game.menu(name)` opens the menu, or the settings over a title. `corner: false`.
- **Engine**: a pausable scene pauses by itself when the page is hidden, the window loses focus or the controller in use is unplugged ("Controller disconnected"), and only the player resumes; `game.pause(reason)`, `game.resume()`, `game.pauseReason`; `autoPause: false`. A hidden page's sound sleeps unless "Sound in the background" is on.
- **Engine**: `input.label(action)`: the action's key or button on the device in use, after rebinding, for prompts ('Space', 'Left click', 'A', '✕'); `input.codeLabel(code)` (the keyboard's own letters where the browser gives its layout); `input.glyphs` and `padStyle()` (Xbox, PlayStation, Nintendo or positions, from the controller's name or the setting). `ui.hud({ prompt: { act } })` shows it.
- **Engine**: `input.rumble(strength, seconds)` and `stopRumble()` where a controller has an actuator; `game.hitFx` rumbles a gamepad (`rumble: false` skips it), scaled by the Vibration setting and stopped on pause, focus loss and unplugging. `game.shake` and `game.flash` follow the Screen shake and Screen flashes settings.
- **Engine**: touch: the START button is the menu (it starts a title and pauses a scene in play, as a gamepad's Start does: `Act:menu`); the touch buttons follow the player's settings (always, automatic or hidden; right or left side; size; opacity), sit inside the safe areas, and appear on a laptop's touch screen once it is touched; the stick has a dead zone (`stickDeadzone`, 12%) and is lifted when the screen resizes or turns.
- **Engine**: a phone's page: a viewport reaching the safe areas (pinch zoom left alone) where the page has none, and no page gestures, selection or callouts on every game's canvas. A fixed `res` fills a high-density screen (`screen.scale` 'auto', or 'sharp' and 'fill'; the Pixel scaling setting), so a phone loses no fifth of its screen to black bars.
- **Engine**: the agent edition has `game.settings`, `game.fullscreen`, the corner (its menu button pauses and resumes), the pausing and `input.label`; the menu screens are the full engine's.
- **Emberdeep**: its full screen goes through `game.fullscreen`; it keeps its own menus (`menu: false, corner: false, fullscreen: 'button'`), as do the labs with panels of their own.
- **Docs**: `docs/STANDARD-FEATURES.md`: the quality prompt's requirement matrix (what is built in, already met, the game's job or deferred), the presets' action coverage and the verification. "Standard features" in `AI_GUIDE.md`, the API card (its budget rises to 15,000: D20), the agent edition's header and the full engine's header (8a): adjust them, don't rebuild them, and what stays each game's job. `docs/DECISIONS.md` D21 (on by default), `docs/FEEDBACK-LOG.md` F5.
- **Tools**: `tools/standard-test.mjs` (`npm run test:standard`): 72 checks on both editions, in Node and in Chromium (a desk and emulated phones). The contract test's shell checks follow the new pause screen. The starter's API card button moves left of the corner.

## 0.22.4 (2026-10-11)

- **Tools**: `tools/ed-character-test.mjs` waits in game time, not on the wall clock: a second of it after a character arrives in town, 0.35 s of it while D is held, and for the game to take a tap on a skill button (up to 5 s) rather than a fixed 120 ms. On a loaded machine the browser draws fewer frames, each worth at most 50 ms of game time, so the hero was still arriving in town when the test pressed D; the check failed in the full run after v0.22.3 ("moved 0.2 units") though nothing it covers had changed.

## 0.22.3 (2026-10-11)

The Vesper round closed out.

- **Docs**: `docs/FEEDBACK-LOG.md` marks the benchmark's runs, left waiting on the owner when the plan ended, as taken up in v0.22.1 and v0.22.2.
- **Tools**: `.gitignore` keeps `temp-feedback/`, the folder where builders' feedback lands before it is read, out of the repository.

## 0.22.2 (2026-10-11)

The benchmark's other two briefs.

- **Docs**: `DOCTRINE.md`'s measures get the Breath of the Wild village and the Arkham predator room. Both first builds pass the check and their own tests, neither patched the engine, both scored 6/10; about 27.9k and 26.2k tokens of game code, 209k and 278.8k output tokens, $12.75 and $16.50. The Assassin's Creed row's count of reads below the header is corrected from 18 to 13 (the stricter count below).
- **Docs**: `docs/FEEDBACK-LOG.md` F3 (Breath of the Wild) and F4 (Arkham): the source read for the same things in all three runs (the rig's pose keys, joints and colours; how `Dialog` holds play and takes choices); the look and `E.Shell` unused now at their thresholds (three sources each); a new theme, climbing any wall and gliding written by the games (`E.Mover` climbs ledges only).
- **Tools**: `tools/agent-bench.mjs` counts a whole session: an agent woken again by its background tasks sends a result for each turn, and the Arkham row first read 3k output tokens, its last turn alone (the session's tokens now come from `modelUsage`, its subagents included). A script that only loads the engine (a heredoc, `node -e`) no longer counts as reading its source, and importing the tool for its functions no longer runs its command line.

## 0.22.1 (2026-10-11)

The benchmark's first run.

- **Docs**: `DOCTRINE.md`'s measures get their first row. The Assassin's Creed brief, given to Claude Code (Opus 5.5) with the handoff package: about 27.5k tokens of game code (Vesper wrote ~50k), a first build that passes the check and its own test, no engine patch, the engine read below its header 18 times, and 6/10 from the judge. The other two briefs didn't complete (memory pressure on the machine; not run). D19 answered.
- **Docs**: `docs/FEEDBACK-LOG.md` F2, the run's points: what it read the source for (the rig's state keys, preset lists, the song format and more), now at its threshold with F1; the look; the canvas interface instead of `E.Shell`.
- **Tools**: `tools/agent-bench.mjs` writes the agent's stream to disk as it comes (a run can be watched, and a stopped one keeps what it did), says when an API error cut a run off (a usage limit, a budget), measures the game code the agent wrote (its tests apart; output tokens include thinking, so they don't compare with code), and keeps the judge's answer when it has no score.

## 0.22.0 (2026-10-11)

The North Star's measures get a tool. Phase 5 of the Vesper plan.

- **Tools**: `tools/agent-bench.mjs` (`npm run bench`): it copies `dist/handoff/` into an empty directory outside the repository, hands a brief to a fresh coding agent there (`claude --safe-mode`: none of this machine's instructions, skills, plugins, hooks or MCP servers; or `codex exec`), and records its output tokens, cost, turns and wall time, whether its first build passes `tools/check.mjs` and its own `game/test.mjs` (the package's template game alone doesn't count), whether it read the engine below its header, searched it or patched it, and a vision judge's 1-10 score of the check's screenshots against the PS1/N64 bar. One table row per run, ready for `DOCTRINE.md`. `--dry-run` sets up and starts nothing, `--rescore` scores a finished run again, `--selftest` checks the stream reader and the scoring on fixtures.
- **Tools**: three briefs in `tools/agent-bench/briefs/`: Assassin's Creed (Vesper's, the baseline), a Breath of the Wild village with climbing and stamina, and a Batman: Arkham predator room; the judge's rubric in `tools/agent-bench/judge.md`. `npm test` runs the selftest (suite `bench`).
- **Docs**: `DOCTRINE.md` (the measures have a tool; runs wait on the owner, D19), `README.md`.

## 0.21.0 (2026-10-11)

An HTML interface for modern adaptations, built from data. Phase 4 of the Vesper plan.

- **Engine**: `E.Shell` (section 21d), an HTML interface over the game: the screens a modern adaptation writes by hand (title, pause, settings, help, results, a district map with a waypoint, or your own) from specs, and HUD pieces from each step's state (an objective with its distance and whether it is above or below, status, pips and bars, counts, a hold-to-interact prompt, a tip, the place's name, a control bar, on-screen buttons, a minimap drawn from a `TileMap` with markers), plus toasts and a tutorial card. It holds no game state: values come in every step and buttons call back (or tap an input action). With a pause spec it follows `game.paused`. The game's input moves its focus (keys, d-pad, stick; sliders turn) and is held back from the game while a screen is open; touch taps. Built-in settings (sound, volume, reduce motion) apply themselves and every setting is saved with `E.store`. It honors reduced motion and the safe-area insets, CSS variables theme it, it is headless-safe, and `game.dispose()` takes it away. `game.shell` is the one over a game.
- **Engine**: the agent edition has a stand-in `E.Shell` that does nothing (it warns once), so full-engine code runs there without its interface.
- **Tools**: a Temporary lab, "Vesper's interface on E.Shell" (`examples/vesper-ui.html`, `/vesper-ui`): Vesper's whole interface rebuilt over a small stand-in game. It comes to 2,090 cl100k tokens (`src/vesper-ui.ui.js`), against the 15.2k of HTML, CSS and glue Vesper wrote by hand: 14%, under the plan's quarter.
- **Tools**: `tools/contract-test.mjs` holds the shell to its word: the HUD shows what it is given, the pause screen follows `game.paused`, the game's input moves the focus and is held back while a screen is open, a button's act reaches the game, settings apply, toasts time out, `dispose()` takes it away, and headless it keeps its screens' names.
- **Docs**: `API.md` (one line), `AI_GUIDE.md` ("Shell"), `README.md`, the engine's header; D18 records its pull request.

## 0.20.0 (2026-10-11)

A third-person kit: a ground controller that climbs, vaults and leaps between roofs, timed actions, guards that see, hear and search, and a stealth starter. Phase 3 of the Vesper plan.

- **Engine**: `E.Mover`, the ground views' answer to `Platformer`: a `Body` that walks, runs, sprints and sneaks with acceleration, jumps with coyote time and a buffer (once a press: a press in the air during a leap no longer jumps again), and on a jump press climbs a ledge, vaults a low wall at a run, leaps a gap (aiming for the far side's landing) or hops down; it rolls out of a long fall, sets `hurt` past `hurtAt`, keeps its last safe spot for `respawn()`, and takes `game.input` or an AI's intent. `hero.rigState()` feeds the rig.
- **Animation**: `E.ACTIONS` and `E.Action`: timed actions of several beats that move a body along a curve and pose its rig: `climbUp` (backwards to climb down), `vault`, `hopDown`, `roll`, `getUp` and `takedown`, a paired action that drives two bodies at once. Beats where it can be cut short (`canCancel`), invulnerable frames, `otherState()` for the victim's rig, and your own actions in the same form. Timings seeded from the animation survey, judged on filmstrips in the iso, three-quarter and side views.
- **Animation**: the rig's traversal states: `hang` (gripping a ledge against the wall), a sneaking gait (`crouch` while moving: shorter, lower strides), a sprint lean (`sprint`), a heavy landing (`land`, or `rig.land(strength)`: the knees give and, hard enough, a hand goes to the ground) and a forward roll (`flip`, Emberdeep's dodge roll moved into the rig, lifted so the head never dips through the floor).
- **Engine**: perception through the height rules: `E.sees(observer, target, { map, range, fov })` → `{ seen, d, angle, exposure }` (three points on the target against every top; crouching and the target's own `exposure` hide it), `E.hears(listener, noise, map)` (halved through a wall), and `E.Suspicion`, a guard's mind that rises with sight and nearness, decays, and names a state (calm, notice, search, alert), with the last place it saw or heard the target; an alert guard that loses it searches a while.
- **Engine**: `FlowField` option `jump`: links roofs across a gap a jump clears (by `map.landing`'s rules). In such a field a climb costs one plus its rise in cells, so a chase leaps rather than drop to the street and climb back. `flow.next(x, y)` → `{ x, y, z, kind: 'walk' | 'climb' | 'drop' | 'jump', edge }`: where to head and when to press jump.
- **Engine**: maps built in code: `new E.TileMap({ w, h })` starts as open floor, `{ floor, blocked }` options, `map.fill(cx, cy, w, h, id)` and `map.setFloor(cx, cy, tag, block)`.
- **Engine**: `E.Input.THIRDPERSON`: move, Shift sprint, Space jump and parkour, C crouch, E interact, J attack, K block, L dodge, Q use, M map, and a pad layout.
- **Rendering**: `r.sightCone(observer, { map, range, fov, color, alpha })`, a dithered fan cut short where walls hide a body; `r.marker(x, y, z, { label, color })`, an objective marker that becomes an arrow at the screen's edge; `footprint: [x0, y0, x1, y1]` for `r.queue`, `r.prop` and `r.sprite`, so a big thing (a canopy over a tower) sorts over every block under it.
- **Art**: facades from wall-type options: `windows`, `door`, `shutters`, `balcony` and `arch`, placed by a hash of the cell so a street varies; and `types[id].decorate(face)`, a painter called as each wall face is baked (cached with the wall).
- **Engine**: the agent edition gets the small pieces: `map.fill`, `map.setFloor`, the open `{ w, h }` map, `E.sees`, `E.hears` and `r.marker`. There `r.sightCone` does nothing (it warns once), and `E.Mover`, `E.Action` and `E.Suspicion` throw an error that names the full engine.
- **Engine**: the STEALTH starter (`src/starter/70-stealth.js`, `dist/kits/my-3d2dge-stealth.html`, `/kits/stealth`): a rooftop district at dusk with facades and a belfry; three guards (one on a roof) that patrol, notice, search and chase across roofs; telegraphed swings and a parry; takedowns from behind and from above; hiding crouched in tall grass; the ledger as a checkpoint and the east gate as the exit, with markers; touch buttons.
- **Emberdeep**: the hero's dodge roll is the rig's roll now (the rig state `flip`), in play and in the character menu's preview; Emberdeep's own copy is gone. It reads the same, half a pixel higher at its lowest.
- **Tools**: `tools/contract-test.mjs` holds the kit to its word: the Mover climbs, vaults, leaps, hops down, rolls, takes fall damage, jumps once a press and respawns; actions (your own, paired, invulnerable, cancellable); perception; jump links and `next()`; maps built in code; and in Chromium, footprints, the decorate hook, the marker's edge arrow and the cut sight cone (211 checks over both editions).
- **Tools**: `tools/doctrine-check.mjs`: the API index's budget is 34,000 tokens (D18); Emberdeep no longer reaches into the rig's `_cheat`, so it is no longer grandfathered there.
- **Docs**: `API.md` (the Mover and stealth in a paragraph, a genre-playbook row), `AI_GUIDE.md` ("Mover and actions", "Perception", maps built in code, facades, footprints, jump links, a stealth recipe), the agent edition's header (its new pieces, a playbook line, the kit), `README.md` (the kit, the slice, genre coverage), the Labs page's kits.

## 0.19.0 (2026-10-11)

The handoff package: a coding agent given one folder can build, test and check a game on the full engine without reading the engine's source. Phase 2 of the Vesper plan.

- **Engine**: a game's lifecycle (both editions): `game.stop()`, `game.start()` with nothing (resumes), `game.dispose()` (stops the loop, removes every listener the engine added to the window, the document, the canvas and its buttons, closes the sound, drops the GPU lighting), and `game.advance(seconds, { draw })`, exact fixed steps at once without `requestAnimationFrame`. `new E.Game({ loop: false })` runs only by `advance`.
- **Engine**: headless games (both editions): `new E.Game({ headless: true })`, the default where there is no DOM (Node), has no screen, renderer, sound or DOM input; scenes update and `draw` is skipped. Its screen is sized as a 1280 x 720 window would size it, and canvases made while a game loads (sprites) are stand-ins whose drawing does nothing. `input.tap(action)` presses an action for one step and `input.hold(action, on)` holds it, beside `press(code)` and `release(code)`.
- **Engine**: `game.debug`, a game's own handle for tests and tools (`{ snapshot(), teleport(x, y, z) }`): `tools/check.mjs` prints `snapshot()` and `tools/replay.mjs` logs it at the end of a replay.
- **Engine**: every public name has a doc comment (723 of them), and about 110 members that were public only by name are private now (`_`): the renderer's scratch canvases, the lighting's and the GPU lighting's buffers, the input's bookkeeping, the rig's internal weights. No game or tool used them. Both editions.
- **Docs**: `API-INDEX.md`, the API index: every public name, one line each, with its signature, its default and what it does, grouped by the engine's sections, with the units and the height rules at the top and two examples. Names the agent edition lacks are marked. 27,270 tokens, under a budget of 30,000 (`docs/DECISIONS.md` D17).
- **Tools**: `tools/api-index.mjs` writes the index from the engine (`--missing` lists names without a description); `tools/build.mjs` runs it and writes `dist/handoff/`; `tools/doctrine-check.mjs` fails when the index is stale or a public name has no description, checks the index's budget, and keeps `docs/FEEDBACK-LOG.md` from losing a source or a point, as it does the decisions log.
- **Tools**: `dist/handoff/`, the handoff package (text only): the readable engine and the agent edition, `API.md`, `API-INDEX.md`, `AI_GUIDE.md`, `tools/check.mjs`, `filmstrip.mjs` and `replay.mjs` (they work outside the repository), a `package.json` pinning Playwright 1.63.0, and `game/`, a template game (a rooftop thief: climbing with `map.ledge`, a guard with `map.sight`, scenes, a HUD) with a headless test. The site serves it at `/handoff/`; `node tools/handoff.mjs --zip <file>` zips it for a chat (outside the repository).
- **Tools**: `tools/contract-test.mjs` runs every fenced example in `API.md` and `API-INDEX.md` on both editions, the lifecycle (advance, tap, hold, dispose taking its listeners away, `loop: false`), `Body.step`, and the template game's test and page. `tools/labs-test.mjs` checks the site serves `/handoff/`.
- **Docs**: the engine's header (tests, and what the handoff package holds instead of repository paths), the agent edition's header (one line on tests), `API.md`, `AI_GUIDE.md` ("Testing without a browser", "The handoff package"), `README.md` (the package in "Share it with an AI model", the index in the docs list), `DOCTRINE.md`, `CLAUDE.md`.

## 0.18.0 (2026-10-11)

One spatial API with height: collision, standing, sight, reach and navigation read heights the same way. Phase 1 of the Vesper plan.

- **Engine**: the height rules, in both editions and written once (`E.HEIGHTS`, the engine's section 1, `API.md`, `AI_GUIDE.md`): a body's `z` is its feet, a cell's top is `map.height(cx, cy)`, a body stands on the highest top within `z + 2`, eyes at `z + 30` see a target at `z + 22` (a size-1.3 Humanoid; a body's own `eye` and `chest` override them), and the same level is `|dz| <= 8`.
- **Engine**: queries on a `TileMap` (both editions). `map.ray(a, b, { eye, target })` walks every cell between two points (no gaps) and says where it stops; `map.sight(a, b)` sees over a planter lower than the eyes and down from a roof, where `los()` only looks across the ground. `map.standable(x, y, z, r)`; `map.ledge(from, dir)`, the nearest top to pull up onto and where the hands grip; `map.landing(from, dir)`, a spot across a gap that a jump arc clears; `map.drop(from, dir)`, what lies past the edge ahead; `map.arcClear(a, b, apex, r)`. A direction is an angle or a ground vector.
- **Engine**: `E.targets(from, list, { range, arc, facing, dz, sight: map, filter })` gives the eligible targets nearest first, on the same level by default (melee auto-aim, lock-on, takedowns, interaction prompts); `E.sameLevel(a, b)`; `E.inArc(a, facing, b, range, halfAngle, dz)` takes an optional height limit (left out, it stays flat, so Emberdeep plays as before).
- **Engine**: `new E.FlowField(map, { step, climb, drop })` walks the tops a body can stand on: a guard on a roof gets a field across the roofs, and with `climb` and `drop` it chases between levels. With no options paths stay on the floor as before (walls no higher than 2, which bodies already walk over, are walkable now; no game has one).
- **Tools**: `tools/contract-test.mjs` checks each query on small maps (a roof edge, a kerb, a gap with and without a pole in it, a planter, a guard above the hero), on both editions.
- **Docs**: `API.md` (a heights paragraph), `AI_GUIDE.md` ("Heights: roofs, ledges, sight and reach", with an example), the agent edition's header.

## 0.17.5 (2026-10-10)

The clock is an exact fixed step: the same inputs play the same game at 60, 90, 120 or 144 Hz. Phase 0 of the Vesper plan.

- **Engine**: the clock (both editions). Each frame's real time (at most 50 ms) fills an accumulator, and each whole 1/120 s of it runs one update of `dt = 1/120 * game.timeScale`; the rest waits for the next frame (`game.alpha`, 0..1, for a game that wants to interpolate). 60 Hz runs two steps a frame and 120 Hz one, as before; 90 and 144 Hz now run the same steps as 60 Hz instead of steps of 1/180 and 1/144 s, so a jump peaks at the same height on every screen. Slow motion makes steps shorter, never fewer (Emberdeep's perfect dodges stay smooth); above speed 1 a step is split so none is longer than 1/120 s. Paused or at `timeScale` 0, input still ticks. The engine's header promised this before and didn't keep it.
- **Engine**: flow fields follow the map (both editions). `map.block()` bumps `map.version` when a cell changes, and `FlowField.update` rebuilds when the target's cell or the map's version changes: a bridge blocked with `block()` or a door opened with `set()` reroutes at the next update, where before the field kept the old paths until the target moved to another cell.
- **Engine**: `game.fps` counts real frame time (both editions); it never read under 20 before, because it added up the 50 ms-clamped time. `game.stats.frameMs` is the real time too.
- **Engine**: `audio.duck(on)` (both editions): quieter music under a game's own pause or map screen. Vesper reached for the private `_duck`, which the engine reset every step.
- **Engine**: the first frame always updates before it draws (with `dt` 0 when its time is short of a step), as the old clock did; the Mocap Lab draws what its first update sets.
- **Engine**: a recorded session starts when the page has loaded, as its replay does (`E.session`): frames wait for it, and the person's inputs that come before it are held back. Chromium's own pointer move, as a page lays out under the cursor, reached the recording before Emberdeep listened and reached the game in the replay, so Emberdeep's sessions diverged at their first checksum wherever the page loaded slowly: `npm run test:replay` failed this way on v0.17.4 too.
- **Tools**: `tools/contract-test.mjs` (`npm run test:contract`, a suite of `npm test` and `test:changed`): one test per documented behavior an agent relies on, on both editions. Now: the same inputs at 60, 90, 120 and 144 Hz give the same state bit for bit, steps of 1/120 s, slow motion, pause and timeScale 0, the frame counter, flow fields that follow `block()` and `set()`, `audio.duck`. Run against v0.17.4 it fails 27 of its 42 checks.
- **Tools**: `tools/filmstrip.mjs --hz 144` records on a virtual display at another refresh rate.
- **Docs**: the engine's header (item 6), the agent edition's header, `API.md` (rule 1, `duck`, flow fields), `AI_GUIDE.md` (hard rule 1, the frame order, why recorded sessions replay) and `DOCTRINE.md` describe the new clock; `docs/DECISIONS.md` D16 supersedes D4's substeps.

## 0.17.4 (2026-10-10)

Corrections to the Vesper plan.

- **Docs**: `docs/HANDOFF-VESPER-FEEDBACK.md`: the fixed-step clock keeps today's runs only at normal speed. In slow motion its steps get shorter rather than fewer: Emberdeep slows to 0.3-0.4, where fixed game-time steps would update on only about 60% of frames. Old and new clocks are compared with a seeded filmstrip against the build before, since the determinism and replay tests compare a build with itself. If nobody answers about spending on the benchmark runs, the plan's call is to run nothing. `Land_Three_Point` is already Emberdeep's landing clip.

## 0.17.3 (2026-10-10)

The first feedback from a model that built a game on the engine, checked against the code, with a plan for the next steps.

- **Docs**: `docs/HANDOFF-VESPER-FEEDBACK.md` checks a GPT-6 model's Assassin's Creed adaptation, Vesper, against the code. Every claim it made about the engine holds. The step size follows the refresh rate, so physics differs at 144 Hz, though the header says it doesn't. Flow fields go stale when the map changes. Sight, reach and navigation ignore height. The engine file points to docs and tools it doesn't include, so the model read the source to find 28 undocumented members. The plan, in phases: an exact fixed-step clock and flow fields that follow the map, then one height-aware spatial API, a handoff package (lifecycle, headless runs, a checked API index, contract tests, tools and a template), a third-person kit (actions, a ground controller, navigation over heights, perception, facade hooks, footprint sorting, a stealth starter), an HTML UI shell, and a benchmark with fresh agents. It recommends xhigh effort for the work.
- **Docs**: `docs/FEEDBACK-LOG.md` keeps builders' feedback points that we did not act on, counted by theme, so a pattern shows when the same point comes back. `CLAUDE.md` says how to process feedback, and `README.md` lists the log.

## 0.17.2 (2026-10-10)

The portable math checked in Safari's own engine.

- **Tools**: `tools/cross-engine-math.cjs` (`npm run test:cross-engine`; needs Bun, `BUN=/path/to/bun`) runs the same code in V8 and in JavaScriptCore, Safari's engine. With native math the two engines gave different bits, both for 2.8 million math results and for the engine's Humanoid animated for 3,000 steps. With the portable math they gave the same bits for both, so a session recorded in Safari replays in Chromium as it played. Without Bun it says so and passes.
- **Docs**: `AI_GUIDE.md` (recorded sessions); `docs/DECISIONS.md` D15 records the result.

## 0.17.1 (2026-10-10)

A session recorded in any browser replays in Chromium bit for bit: an iPhone's Safari included.

- **Engine**: portable math while recording and replaying (`E.session.math`). `Math.sin`, `cos`, `tan`, `atan`, `atan2`, `asin`, `acos`, `exp`, `log`, `log2`, `log10`, `pow`, `hypot` and `cbrt` are built from exact operations only, so browsers that round these differently in the last bit (Safari and Chromium do) play a session the same. `sin`, `cos`, `atan`, `atan2`, `exp` and `log` follow fdlibm and give Chromium's own bits on every one of 200,000 random inputs each; large angles stay exact to about 1e12. Outside a session the browser's own are used.
- **Tools**: `tools/replay-test.mjs` records Emberdeep in a browser whose own math is one unit in the last place off everywhere and replays it in Chromium: every checksum matches (without the portable math, the same session diverges at its first checksum).
- **Docs**: `AI_GUIDE.md`, `API.md`, the engine's section 23, `DOCTRINE.md`; `docs/DECISIONS.md` D15.

## 0.17.0 (2026-10-10)

Play sessions recorded on any device replay exactly in a headless browser, so a bug seen on a phone happens again where an agent can look at it.

- **Engine**: `E.session` (section 23). `E.session.record(true)` records every later page load (`?record=1` for one): a seed for `Math.random`, every display frame's time (the clock reads it during the frame), every input from the person or the device with the frame it arrived before (keys, pointer and touch, wheel, clicks and form edits, focus, visibility, resize, full screen), gamepad readings, the media queries the game asked, the safe-area insets, the screen and the save at the start, and a checksum every 60 frames. `E.session.save()` gives the JSON, `E.session.share()` the share sheet on a phone or a download elsewhere. `game.stateHash = () => [...]` adds a game's own state to the checksum. While recording, the GPU lighting is off and update/draw timings read 0 ms.
- **Emberdeep**: Developer → Guide → Record a session: turn recording on, see how long this session has run, save it for a bug report. Its checksum includes the hero, the level and the crowd.
- **Tools**: `tools/replay.mjs` (`npm run replay -- session.json`) replays a session in headless Chromium at the recorded screen, frame by frame, with `--to`, `--shots`, `--log` and `--page`, and reports the first checksum that differs. `tools/replay-test.mjs` (`npm run test:replay`, a suite of `npm test` and `test:changed`): sessions recorded in real time at a desk and on a phone by touch in Emberdeep, and in a starter game, replay with every checksum matching and the same end state; a session with one key press taken out diverges.
- **Docs**: `API.md`, `AI_GUIDE.md` ("Recorded sessions"), `README.md`, the engine's header and `CLAUDE.md` say how to record and replay; the agent edition's header says the full engine has it. `DOCTRINE.md` marks replay done; `docs/DECISIONS.md` D14 (D12 points to it).

## 0.16.1 (2026-10-10)

Escalation by what a revert can undo.

- **Docs**: `DOCTRINE.md` and `CLAUDE.md`: in the engine tier a reversible call (anything a revert undoes) is made at once, in its own commit, flagged in the pull request and logged; only a call that reaches outside the repository or can't be reverted waits on the 15-minute wake-up timer. `docs/DECISIONS.md` D13; D11 points to it.

## 0.16.0 (2026-10-10)

The agent edition catches up with the full engine, a joint's position gets a public name, and sound stops shifting the game's random numbers.

- **Animation** (agent edition): a motion clip now turns the face, belt and toes with the body and the head, as in the full engine (`Humanoid._offsets`: a cartwheel goes upside down, the face follows the clip's head), and the cape trails behind the body's turn, not its facing alone. Both reached the full engine on 2026-10-06, after the agent edition was cut from it, and were never ported.
- **Engine**: `rig.worldOffset(p)`, in both editions: where a point in the rig's own frame (a joint in `rig.J`, or one offset from it) sits from its feet. It is what the private `rig._w` did; the starter games and the arena use the public name now, so models that copy them learn it. `API.md`, `AI_GUIDE.md` and the agent edition's header document it.
- **Engine** (agent edition): `cam.offset`, where the camera's focus sits on screen ([0, -40] keeps it above on-screen buttons), as in the full engine.
- **Engine**: the chip synth draws its own random numbers (both editions). It drew from `Math.random` only while sound existed, ran unmuted and wasn't throttled, so sound shifted every random number the game drew after it; now the same seed and inputs play the same game with sound on, off or muted.
- **Docs**: `DOCTRINE.md` and `CLAUDE.md`: an escalation arms a 15-minute wake-up timer (`send_later` in cloud sessions) and keeps working; a deviation with a case is welcome. `docs/DECISIONS.md` D10 (the owner kept D3 to D6), D11 (the timer) and D12 (replaying recorded sessions: the plan, and its trigger); D4 and D6 point to what changed.
- **Tools**: `tools/doctrine-check.mjs` no longer grandfathers `_w` in the starters and the arena, and points a new use of it at `rig.worldOffset(p)`.

## 0.15.0 (2026-10-10)

The doctrine adopted: what the engine optimizes and ten principles for an engine built for AI coding agents, with a check for each one this repository can hold, and existing code grandfathered rather than rewritten.

- **Docs**: `DOCTRINE.md`, the doctrine (agent-readable, agent-operable, verifiable without a display, assets as code and data, deterministic, the GPU rule, common ground, quality under the hood, pin what agents know, discovery first), then how each principle applies here, what was grandfathered and which check holds it. `docs/DECISIONS.md`, the decisions log, never cleaned up: the adoption and nine calls (D1 to D9), among them the engine keeping Canvas 2D, determinism coming from the test harness, one-file pages, and the token budgets for the manuals.
- **Docs**: two tiers. Prototypes are the Temporary labs: a change confined to one merges without a version bump or a changelog line, may reach past the engine's API, and notes any deviation in its `labs.json` entry (`deviates`, shown on the Labs page; the two 3D labs keep three.js's WebGL 2 fallback). Everything else is the engine tier. `CLAUDE.md` says how to deviate, escalate and record a call.
- **Tools**: `tools/doctrine-check.mjs` (`npm run doctrine:check`, run with the version and syntax checks by `npm test` and `npm run test:changed`): no binary file outside the approved list; the agent edition's header under 10,000 tokens and the API card under 13,500; no new use of the engine's private members outside `engine/` in the engine tier (today's uses are grandfathered by area, a prototype's are listed as the engine's to-do list, `--todo`; first on it, `rig._w`, which the starter games use); and no entry gone from the decisions log.
- **Tools**: `tools/determinism-test.mjs` (`npm run test:determinism`, a suite of `npm test` and `test:changed`): a fight in Emberdeep (a pack spawned on depth 3) and in the brawler starter, each played twice under the filmstrip's virtual clock and seeded randomness, must match pixel for pixel. `tools/filmstrip.mjs --expect-same` exits 1 when compared runs differ.

## 0.14.1 (2026-10-09)

Dead weight out: plans that were finished or never built, a dated audit and an unused tool. Every linked lab stays.

- **Docs**: `docs/ANIMATION-RESEARCH.md` is gone (a survey of famous animations and a build list of ones to ship ready-made, never started), and so is `docs/CONTROLS-AUDIT.md` (the 2026-09-29 controls audit, long done). `docs/LAB-3D.md` keeps the 3D labs' decisions, trade-offs, contents, build and lessons and drops the finished plan's milestones, judging criteria, fallbacks and scope. `docs/MOCAP.md` drops its "Looking ahead" list of open questions; `docs/DAN.md` drops what building Dan changed in the tools (0.8.0 below has it).
- **Tools**: `tools/slice-test.mjs` is gone: nothing used it, and the genre kits (`dist/kits/`) are already the engine, the shell and one slice.

## 0.14.0 (2026-10-09)

The 3D-drawn stress test is retired: two clear tools remain, the engine for 2D and its classic "3D" views, and the 3D world for real 3D.

- **Rendering**: `/stress-3d` (the 2D stress test's game drawn by three.js) is gone, and its links open the 3D world stress test (`/stress-world`). The engine already does the light "3D" (classic views, side scrolling with depth, WebGPU lighting, no libraries); real 3D is the 3D world, which keeps its cameras, filters, lights, cards and puppets. The 2D stress test points to the 3D world for chase, first-person and fly cameras.
- **Engine** (2D stress test, `src/stress.game.js`): the hooks the 3D page drew through are gone (`HOOKS`, the depth camera's pose, the extra `window.__game` fields); the game plays and draws as before.
- **Tools**: `tools/stress-test.mjs` (`npm run test:stress`, a suite of `npm test` and `test:changed`) checks the 2D stress test's cameras (a `?cam=` link, a fixed camera, side scrolling, side scrolling with depth), moved out of `tools/lab3d-test.mjs`, which now checks the 3D world lab only. A change to the 2D stress test no longer runs the 3D suites.
- **Docs**: `docs/LAB-3D.md` says why the 3D-drawn stress test was retired and keeps what it taught (rules that never read the drawing, no stalls mid-fight, a three.js r182 instancing bug); the Labs page drops it.

## 0.13.0 (2026-10-09)

The stress test built again from the ground up as a 3D game, with Rapier physics, sharing only the animation system.

- **Rendering**: a new temporary lab, the stress test as a 3D world (`/stress-world`, Labs → Temporary). It tries to do what the 2D stress test does (a torch-lit hall, walkers, slimes and wisps that take turns to attack, waves, a particle storm, the same panel and benchmark) the way a 3D game would, and may feel different: it isn't a head-to-head. three.js r182 on WebGPU or WebGL 2; characters as Cards (the engine draws them, from the camera's turn and tilt, at about the screen's pixel size) or Puppets; the engine's views as real 3D cameras in perspective or orthographic (O), side scrolling with depth (M), a custom turn and tilt, chase, first person, fly and fixed (F), with links; walls facing an outside camera cut low and pillars between it and the fight cut to stumps; the 3D stress test's filters (cel, pixel, bloom, FXAA); fog that starts past the hero; resolution at the engine's pixels, balanced or full.
- **Engine** (the lab's game, `src/stress-world/20-sim.js`): Rapier 0.19.3 (SIMD) in the engine's own units with z up, so rigs, moves and reaches read as in the 2D games. The hero is a character controller that walks, dashes, jumps (Space) onto low walls and galleries, climbs stairs and slopes, pushes crates and shoves monsters aside. Every monster is a rigid body: the 2D page's AI sets the velocity each wants and the physics resolves the crowd (no separation code); knockback is momentum; big hits throw bodies up and the fallen fly and slide (Launches); 0 to 300 crates and barrels; solver iterations on the panel. A flow field over the walkable grid takes the crowd up the stairs after the hero. A scripted 600-step fight hashes to the same state on WebGPU and WebGL 2.
- **Art**: the hall is ASCII text (`src/stress-world/10-hall.js`), the 2D hall's layout from the same seeds plus a raised rune dais with a sloped edge and two galleries up stairs; colliders, floor heights, the walkable grid and meshes all come from it. Every texture is drawn by code: the 2D hall's floor, brick walls and low walls, pillars with plinths and capitals, crates and barrels, braziers with flames.
- **Rendering** (3D stress test): no more hitches when a crowd first needs a new card atlas page. three.js r182 keeps the matrices of an instanced mesh with 1,000 or fewer instances in a uniform buffer named after the mesh, so every page (25 to 49 cards) compiled its own shader and GPU pipeline the first time it was used, past the two pages the warm-up made (about 50 cards on screen). Pages now have room for more than 1,000 cards and read their cells from one named attribute, so they all share one shader: from 36 to 1,200 cards on screen no pipeline is built.
- **Tools**: `tools/stress-world-test.mjs` (`npm run test:stress-world`, a suite of `npm test` and `test:changed`): the banned-API rules, both backends, the same proof hash, a fight in both looks with no GPU pipeline built mid-fight (nor when the crowd grows past the atlas pages the warm-up made), kills and launches, a jump, the stairs to a gallery with monsters following, a crate knocked about, every camera and filter, W walking away from a fixed camera, the benchmark's report. The benchmark and metrics split CPU time into physics, logic and drawing. `tools/lab3d-test.mjs` checks the 3D stress test with a 400-monster crowd of cards too.
- **Docs**: `docs/LAB-3D.md`, the stress test as a 3D world; the Labs page lists it with its question and links.

## 0.12.1 (2026-10-08)

The 2D page's side scrolling with depth stays sharp zoomed out.

- **Rendering** (2D stress test): the depth view (Mode 7) draws at the screen's own resolution, one buffer pixel per screen pixel, so its characters, drawn by the engine at the size their distance gives, are sharp near or far, zoomed in or out (at the page's own pixel size a zoomed-out hero was a few blocky pixels). Its damage numbers and notes are drawn as large as at the page's own pixel size; the engine's lighting pass and its particles are skipped under it (it draws its own). The engine's pixel size comes back with depth off.
- **Tools**: `tools/lab3d-test.mjs` checks that the depth view draws at the screen's resolution and that the pixel size returns after.
- **Tools**: faster pushes. `npm run test:changed` (`tools/test-run.mjs`) runs the version and syntax checks and only the suites that cover the changed files (read from git against main; version-number-only changes, the build's output and the changelog don't count; the engine, the build or the dependencies run everything), with why it chose each and how long each took; `npm run test:which` shows the choice. `npm test` runs every suite through the same runner, with timings. `CLAUDE.md`: push and merge once `test:changed` passes, then run the full suite in the background and fix forward or revert.

## 0.12.0 (2026-10-08)

Depth for side scrolling, the Mode 7 way on the 2D page and in real perspective on the 3D one, and sharp characters when the 3D page zooms out.

- **Rendering** (both stress tests): side scrolling with depth (M, `?view=side&depth=1`). A perspective camera on a rail follows the hero sideways and keeps him 110 to 260 units away, so he shrinks walking into the hall and grows coming back. The 2D page draws it as SNES games did, Mode 7: the floor a screen row at a time from the map's own floor texture, then walls, braziers, telegraphs, trails and every character back to front, each drawn by the engine at the size its distance gives (crisp, not a scaled sprite); torchlight as warm pools on the floor. The 3D page puts a real perspective camera at the same pose. The mouse aims at the floor through the same projection.
- **Rendering** (3D stress test): at the balanced or full resolution the engine draws each card as fine as the picture's own pixels (cells up to 256 pixels, outlines one engine pixel thick), so zoomed out the characters are sharp, not small sprites blown up; at the engine's pixels nothing changes.
- **Tools**: `tools/lab3d-test.mjs` checks the depth view on both pages (the 2D page draws the crowd, and the hero shrinks and grows with depth; the 3D page takes a perspective camera) and the cards' detail at the full resolution.
- **Docs**: `docs/LAB-3D.md`, side scrolling with depth and sharp cards; Labs links to both.

## 0.11.0 (2026-10-08)

The stress tests, head to head: the same cameras on both pages, the 3D page's own cameras and filters, and no more stalls mid-fight.

- **Rendering** (3D stress test): no stall when a fight starts. The first frame draws every batch, atlas page, trail and floor shape once, empty, so their GPU pipelines exist before they are needed (again after a filter change); each effect pool shares one material; the card atlas is fixed 512-pixel pages that are never remade, and only the pages in use upload and get outlined. A 50-monster fight in both looks builds no pipeline (the last version built four, the 1% low of 34 fps at 50 monsters); as a fight starts, the cards' worst frame drops from 72 to 29 ms and their median from 31 to 16 ms (headless WebGL 2).
- **Rendering** (3D stress test cameras, 1 to 4): chase (behind the hero, in front of walls), first person (his eyes) and fly (WASD, Q and E, Shift), mouse steering once a click captures it (Esc frees it); F fixes any of them where it is, a fixed 3D camera while you play; `?cam3=` links. The hero's controls follow the camera (W walks away from it, he aims where it looks), and cards are drawn from its turn and tilt. P now switches the resolution (X also swung the sword).
- **Rendering** (3D stress test filters, N): Clean, Comic cel (shade bands, ink strength, ink width, colour punch) or Pixel (pixel size, colours per channel, dither) on the entire scene, the characters and objects, or the environment, with bloom and FXAA: TSL in `PostProcessing`, on WebGPU and WebGL 2, with an MRT mask the character and object materials write while a filter is on. `?fx=`, `&fxto=`, `&bloom=1`, `&fxaa=1`.
- **Rendering** (3D stress test): a resolution menu (engine pixels, balanced at half the screen's, full; P cycles; `?res=`).
- **Engine** (both stress tests): full screen, and start in full screen (remembered on the device; the first click or key enters it, as browsers require); the side scrolling view, a custom view (turn, tilt, height boost, on top of zoom and turn), fix camera here (F: it stays put while the hero moves on) and Copy camera link (`?cam=`, the free camera room's format, opens the same camera on either page); the engine's own looks, dithered translucency (`E.style.trans`) and the readable characters tilt (`E.style.charPitch`).
- **Tools**: the benchmark's table and report give game logic, drawing and CPU ms for each step, and the report names the camera, the engine looks and (3D) the filter. `tools/lab3d-test.mjs` also checks the 3D stress test's cameras (W walks away from a fixed camera), its filters, that no GPU pipeline is built mid-fight, and the 2D stress test's cameras (a `?cam=` link, a fixed camera staying put, side scrolling).
- **Docs**: `docs/LAB-3D.md`, the 3D stress test's cameras, filters, engine looks and the warm-up; Labs entries with links to each camera and filter.

## 0.10.0 (2026-10-08)

The stress test drawn in real 3D by three.js, for a head-to-head with the engine's own renderer (`docs/LAB-3D.md`, *The 3D stress test*).

- **Rendering**: the 3D stress test (`/stress-3d`, Labs → Temporary → Stress test in 3D): the stress test's hall, hero, walkers, slimes, wisps and the fallen drawn by three.js r182 (WebGPU, or WebGL 2; `?backend=webgl` forces it) with the engine's own camera (view, zoom, turn, height boost, shake), so it frames and aims like the 2D page. Two looks (C switches): **Card** (the engine draws each character onto a card in the hall, from one sprite atlas) and **Puppet** (3D parts on the same joints in shared instanced batches, with outlines, torchlight and shadows). X switches between the engine's pixels and full resolution.
- **Rendering** (combat): telegraph arcs on the floor during wind-ups, blade and claw trails as ribbons, bolts with their own lights, every particle kind, damage numbers and notes in the engine's pixel font. The lights are a fixed set: up to 30 torches (the two nearest the hero cast shadows), up to four wisp and four bolt lights.
- **Engine** (stress test): the 3D page runs the 2D page's game code unchanged and replaces only the loop's drawing step, so gameplay, controls, the panel, its metrics ("Drawing (CPU)" is timed the same way) and the benchmark are the same on both. The game hands the 3D page its map, torches, shots and frame numbers, and the benchmark's report names the renderer that drew it.
- **Tools**: `tools/lab3d-test.mjs` also checks the 3D stress test on WebGL 2 and WebGPU: a fight with every monster kind in both looks, the panel's numbers, the hero under the keys, no errors; and keeps its rules (no `WebGLRenderer`, `ShaderMaterial`, compute or GPU read-backs) in `src/stress3d/`.
- **Docs**: `docs/LAB-3D.md` describes the 3D stress test, where it differs from the 2D page and why, and a three.js r182 bug to remember (an `InstancedMesh` of more than 1,000 instances with `DynamicDrawUsage` never sends its changes to the GPU).

## 0.9.0 (2026-10-08)

A temporary lab that puts our characters in a fully 3D world, to see what carries over (the plan and its trade-offs: `docs/LAB-3D.md`), and the camera labs that led to it.

- **Rendering**: the 3D world lab (`/lab-3d`, Labs → Temporary): a stone room built from a text map in real 3D with three.js r182 (`WebGPURenderer`: WebGPU, or WebGL 2 by itself; `?backend=webgl` forces it) and Rapier 0.19.3 (SIMD), every texture and shape drawn by code (the floor is the engine's own `E.tex.flagstone`). Sun shadows, flickering torches, walls cut away on the camera's side as the engine does, outlines in the engine's outline color, fog, and a pixel-art pass that draws the engine's 240 lines.
- **Rendering** (cameras): the engine's five views as orthographic cameras with its exact height boost (in the projection only), turned 45° at a time; and the cameras real 3D gives for free: a free orbit, a first-person fly camera and a third-person chase camera. Fix camera puts any of them in the address.
- **Animation**: the rigs, every move, the mocap player and Dan's body run unchanged in 3D, two ways, alone or side by side: **Card** (the engine draws the character from the camera's angle onto a card facing it: the exact look, flat, at one depth) and **Puppet** (3D parts hung on the same joints, listed as data, e.g. `['limb', 'hipL', 'kneeL', 1.45, 1.2, 'pants']`: real depth, light and shadow, any camera; the look an approximation). A mocap figure plays CMU and hero clips; Dan swings on a timetable.
- **Engine** (gameplay): the hero walks a lap or you play it (WASD, J or a click swings the engine's three-hit combo, K or Space dashes), moved by Rapier's character controller: it slides along walls, shoves crates and knocks them flying. Gameplay runs on the CPU at a fixed 60 Hz and never reads the renderer: 600 scripted steps give the same state hash on WebGPU and WebGL 2, shown on the page.
- **Rendering** (earlier labs in this release): the free camera room (`/free-camera`): any orthographic camera the engine can give (turn, tilt, zoom, move, fix) and a fly mode on a small renderer of its own, to show what the engine can't do; and the shapes comparison (`/shapes-compare`).
- **Tools**: `tools/vendor-3d.mjs` vendors the two libraries into `vendor/` at pinned versions with checksums (`--check` verifies them); `tools/lab3d-test.mjs` (in `npm test`) checks the checksums and the lab's rules (no `WebGLRenderer`, `ShaderMaterial`, `onBeforeCompile`, compute or GPU read-backs), opens the lab on WebGL 2 and WebGPU (headless, on a stand-in canvas), compares the hashes, plays it and saves a picture of every camera and look. `tools/build.mjs` can join a folder into one ES module (`@inline-module`) and take a file's first section (`@inline-head`).
- **Docs**: `docs/LAB-3D.md`, the plan: why three.js r182 and Rapier 0.19.3 (releases the models know well, not the newest), the GPU rule, Card versus Puppet, what an agent reads.

## 0.8.1 (2026-10-07)

The engine files now tell an AI agent what lies outside them, and how to take from it.

- **Docs**: a map of the store outside the engine files, where an agent reads: at the end of the agent edition's manual (about 600 tokens), in the full engine's header, in `API.md` (so in every genre kit) and in `AI_GUIDE.md` ("Where to find more"). It lists the 325 curated motion clips and 2,548 motion-capture takes, Emberdeep's worked examples (monster and boss bodies, heroes whose bodies are not people, skills) and the genre kits. Each step has its command: search the catalogs or `node tools/cmu.mjs ledger <word>`, cut the clips a game needs into a small set with `tools/anim-set.mjs`, play them on any Humanoid with `src/mocap/mocap.js`. The map also says the store's files are large: search them, never read one whole. Clips play on the agent edition too (tested); the full engine also turns the face and hair with a clip.
- **Tools**: `npm run test:agent` checks the map: every path it names in the four places exists, and its recipe works (the ledger search, the cut of a curated clip and a motion-capture take, both played on the agent edition's Humanoid). `tools/version.mjs` also writes and checks the version the README states (it said 0.7.0 through 0.8.0).

## 0.8.0 (2026-10-07)

A third playable character, adapted from concept art, and what building it taught the character tools.

- **Characters**: Dan, the Brood-Scythe (`src/emberdeep/22-char-dan.js`, `?character=dan`): a stalking alien beast with two bone scythes for forearms, a horned crown, a spined back, a tail and egg sacs on its hips, about 1.25x the Wanderer. Its custom body has reverse-kneed legs with three-taloned feet, arms solved with IK, scythes that swing on springs, a swaying tail and a slump when it falls; its egg sacs swell and glow as they ripen. Six skills of its own: **Reap** (right, left, then a scissor cut), **Pounce** (a leap that lands impaling), **Harvest Whirl**, **Hatch** (ripe sacs become broodlings that hunt and bite), **Frenzy** (a roar: faster attacks, leech) and **Brood Burst** (a void blast that grows with the brood). Every kill ripens one of six sacs, shown over the skill bar. Its own save, arrival (drops, lands in a crouch, roars), title loop and menu notes. On the autopilot it clears depths 1-10 in 0.73x the Wanderer's time with no deaths.
- **Characters** (the body contract): a body may list the bones that keep their length (`rig.bones`); a character may `prime(h)` its own resource for casts outside real play (the gallery's demos, the sandbox's unlimited resources, the character test); a skill may hold the autopilot back until it is ready (`bot: { ready(h) }`).
- **Tools**: the character sheet measures a body's own bones (a Humanoid's limbs by default) instead of the Humanoid's on every body, and a pop is now a joint that jumps in one step against the steps around it, so a long blade's fast, steady sweep is not flagged. The balance run is repeatable at last (the game's clock now moves only with its steps: slow motion, the death panel and the performance governor read the real clock, so two runs of one hero drifted apart after depth 5), and its summary compares each depth once, with the time and deaths of every try.
- **Emberdeep**: the autopilot measures its progress along the way it wants to go: pressed against a solid prop, the push-out jittered it back and forth fast enough that it never counted as stuck, and a run could stall in place.
- **Docs**: `docs/DAN.md` (from the concept art to the game), and the recipe in `docs/CHARACTERS.md` with the new hooks.

## 0.7.0 (2026-10-07)

Everything merged since 0.6.0 (none of it had bumped the number), plus versioning and the tools for adding a playable character.

- **Tools** (versioning): one number everywhere (`tools/version.mjs`, checked by `npm test`), a deploy-time build stamp (`tools/stamp.mjs`, run by Vercel), shown in the game and the labs; this changelog; `CLAUDE.md` with the rules for every change.
- **Characters**: playable characters are a registry, `def('characters', id, spec)`, like monsters and skills. Every place the game treated the Wanderer and Codex differently (16 checks of Codex's name in 7 files) now asks the character's entry: its body, starting skills and gear, save slot, stats, arrival, title pose, menu preview, paper doll, captured clips and its own animation layers. A new hero is a file of its own and needs no edits to shared code. Nothing a player sees changed: the existing suites pass and before-and-after filmstrips of both heroes match pixel for pixel.
  - The body contract (what the game calls on a hero's rig) is written down in `src/emberdeep/18-characters.js` and checked: `checkRig(id)` drives a body through 14 states, two facings and every view, and names each broken part.
  - A character's `look` sets its Humanoid look under the gear; its Echo and paper doll wear it too.
  - `tools/ed-character-test.mjs`: what every hero must do (its entry and body, the menu and its own save, movement and the dodge, its starting skills, every shared skill with its body, its Echo, the paper doll, arriving in a depth, a potion, a knockdown, death and revival, every view, the title, the gallery, a phone held upright). `npm test` runs it for every registered hero.
  - `tools/ed-sheet.mjs`: the character sheet, one image of the hero in every state and view, a turnaround and game scale on every theme's floor, with numbers a model can trust more than its eye: size per view, palette depth, contrast against each floor, and motion lints (pops, feet sliding, joints under the floor, stretching bones). The same image and numbers every run.
  - `npm run character:check -- <id>`: syntax, build, the character test and the sheet, with a short summary.
  - `npm run new:character -- <id> --body humanoid|custom`: a hero that already passes every check (a dressed Humanoid, or a custom body that keeps the contract) with two skills of its own. `npm test` checks both templates.
  - `tools/ed-balance.mjs --character <id>`: the autopilot plays depths with a hero and with the Wanderer, stepped by hand and seeded (fast, and the same every run), and compares time, deaths and level. Skills say how the bot should use them (`bot: { heal: .65 }`) instead of being special-cased by name.
  - `docs/CHARACTERS.md`: the recipe, from a brief to a checked hero.
- **Emberdeep**:
  - Codex, the Unwritten: a second playable character with its own procedural rig, six signature spells and a separate save.
  - A developer sandbox and an explained tuning panel (every rule number a knob, with search, tiers and reset); customizable keyboard, mouse, gamepad and touch controls; difficulty sliders in 1% steps.
  - Fills a phone held upright, with full screen and a phone HUD.
  - The hero plays 15 captured moments (landing, three deaths, victory, level-up, listening, reaching for loot, flinching and more).
  - The death panel waits for the hero's fall to land.
- **Mocap**: ready-made animation as readable key poses an AI model can read and edit: a glTF importer, retargeting onto the Humanoid, the Mocap Lab, both Quaternius libraries (88 clips), Mesh2Motion (177 clips), 60 moments cut from the CMU motion capture database and every one of its 2,548 takes in the lab's library, with a ledger of all of them. The hero turns, tilts and rolls with a clip; the sword can be put away.
- **Engine**: the agent edition, the essential engine and its manual in one readable file for AI coding agents (`dist/my-3d2dge-agent.js`).
- **Tools**: repeatable, comparable filmstrips (`--seed`, `--compare`); gallery deep links; contact sheets for animation sets; the Labs page (every lab, test page and demo, one tap away); Claude Code cloud sessions (a SessionStart hook, `CHROMIUM_PATH`); the checker's report says which build it checked.
- **Docs**: the README's prop count (38, not 39).

## 0.6.0 (2026-09-28)

- **Art**: the PS1 / N64-era look kit: HD characters (shaded limbs, faces, outfits, hair, armor, sizes), hue-shifted shading (`E.tones`, `E.ramp`), parallax backdrops, textured tiles and wall materials, procedural props, explosions, smoke and fire, the 5x7 font and extruded titles.
- **Animation**: the move library (`E.MOVES`, `E.Combo`), poses and stances, side-view chops, weapon trails, camera zoom and turn; the animation lab kit.
- **Emberdeep**: the signature game, a hack-and-slash that goes down forever: skills and the passive tree, monsters and bosses, loot, Emberhold, one new mechanic per depth, the gallery, the autopilot.
- **Tools**: genre kits and single-file editions for AI remakes; the site on Vercel.

## 0.5.0 (2026-09-27)

- Renamed to my-3D2dge; genre kits and single-file editions for AI remakes.

## 0.4.0 (2026-09-28)

- **Tools**: the single-file AI edition, the API card, the starter game and the headless checker.

## 0.3.0 (2026-09-28)

- **Rendering**: the stress test with a benchmark; crowd optimizations (culling, direct draw, cached walls, shadows and glows, faster rig projection), runtime resolution, frame stats.

## 0.2.0 (2026-09-28)

- **Rendering**: optional WebGPU lighting (shadows, wrap light, glow, heat shimmer) with a Canvas fallback.

## 0.1.0 (2026-09-28)

- **Rendering**, **Animation**: views, rigs, the renderer, lighting and the first examples (as the CO55 2D engine).
