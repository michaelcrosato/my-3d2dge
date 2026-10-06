# Emberdeep controls and developer tools audit

Date: 2026-09-29

Scope: shared engine input handling, Emberdeep movement/aim/combat input, canvas menus, inventory and progression navigation, touch layouts, saves, developer tools, and generated standalone pages.

## Bugs fixed

| Finding | Change |
| --- | --- |
| Gamepad polling only read browser slot 0; disconnects could leave buttons and axes active. | Detect connected controllers in any slot, keep the active controller stable, and release inputs on disconnect/replacement. |
| Small stick drift and a previously used mouse could interfere with controller aiming. | Apply a radial, rescaled deadzone and switch the aim source on controller activity. Add deadzone and inverted-aim settings. |
| Held and buffered inputs survived focus loss and some menu transitions. | Clear all input state on blur/visibility loss and modal changes. Pause Emberdeep when focus is lost. |
| Touch buttons and the movement stick lacked complete pointer-cancellation cleanup. | Track each finger independently and release on pointer cancellation or lost capture. Canvas UI taps bypass the movement stick. |
| Mobile players had no complete action/menu controls or touch navigation for the gallery. | Add six skill buttons, dodge, potion, use, inventory, map, portal, menu and gallery controls, with handedness/size/opacity settings. |
| Remapping movement could remove menu navigation; left-stick menu navigation and controller interaction were incomplete. | Separate fixed menu actions from gameplay bindings; update inventory, skills, passives, settings and gallery navigation. Add default interact/portal/inventory controller bindings. |
| Hovering a mouse over an actionable HUD widget suppressed controller attacks; suppression assumed the original mouse bindings. | Consume the actual mouse code while allowing other held devices bound to the same action. |
| Town conversations prevented the pause menu from opening. | Handle pause before conversation input and keep the conversation suspended under a modal. |
| Gallery exit could continue updating a scene after switching to the title. | Stop the old scene update after the transition. Gallery save calls also explicitly skip the display hero. |
| Camera view changes were not restored on startup. | Save the chosen view and restore it unless a URL view override is supplied. |
| A phone held upright showed the game as a 330-pixel band across the middle of the screen, with the touch buttons over the skill bar. | The view grows to fill a screen taller than wide (the engine's `portrait` sizing). The HUD is drawn inside a frame (`UI.frame`) that keeps it out of the safe areas and, upright, lifts the HUD bar over the action buttons; the minimap, boss bar, notices and the gallery's title band go under the menu buttons; the camera centres the hero between them. On a wide screen the action buttons stand above the HUD bar and shrink to fit under the minimap. The menu buttons stay on the right for either hand. |
| There was no way to go full screen on a phone. | A tap on the title menu asks for full screen on a touch screen; FULL SCREEN on the title and in the pause menu toggles it, and leaving it is remembered. The page carries the web-app tags, so an iPhone's Add to Home Screen opens it with no browser bars. |

## Added features

Controls is accessible from the title, pause menu and Settings. It supports keyboard/mouse/controller rebinding, conflict reporting, reset, saved preferences, a live controller monitor, aim assist, deadzone, inverted aim, and touch options. Native dialogs support browser focus and scrolling, with gamepad navigation as well.

Developer is available from the same menus. The sandbox clones the hero and blocks progression/difficulty saves until it is left. Tools include invulnerability, unlimited resources, cooldown removal, enemy freeze, pause and single-frame stepping, speed, full lighting, collision circles, performance stats, autopilot, depth travel, town/proving-ground travel, monster/boss spawning, enemy clearing, map reveal, item creation, skill unlocks, points and gold. Spawning is capped at 300 enemies. Leaving restores the original hero and difficulty in town, including normal town healing and potion refill.

## Verification

- `npm test`: rebuilds standalone artifacts, parses all 35 Emberdeep modules together, then runs the browser regressions in `tools/ed-controls-test.mjs`.
- The control regressions use real keyboard/mouse events, browser touch events with two simultaneous contacts, and a simulated Gamepad API controller in slot 2. They cover rebinding, conflicts, reset, persistence, movement, attack/potion input, aim/deadzone/inversion, menu interaction, disconnects, focus loss, gallery navigation, portrait/landscape layout and handedness. On a phone-sized screen (390 x 844 at 3x) they check that the picture fills the screen upright and on its side, that the HUD bar clears the action buttons and the minimap clears the menu buttons, that a title tap goes full screen and that leaving it from the pause menu is remembered.
- Developer regressions cover damage immunity, resource and cooldown restoration, frame stepping, pause, freeze/unfreeze, monster/boss spawn, loot/points/skills/gold, map reveal, clearing, lighting, speed, travel, autopilot, and normal-save/difficulty isolation with restoration.
- `node tools/ed-syntax.mjs`: parses the 22-module core build, including the new controls/developer modules.
- `node tools/ed-smoke.mjs --from 1 --to 20 --secs 2 --out check-output/final-smoke`: exercises title, town, gallery, proving grounds, and depths 1–20 with autopilot combat.
- `tools/check.mjs` exercises movement/actions and each supported view in arena, perspective lab, stress test, and all six genre kits. Browser errors, engine errors and blank gameplay are failure conditions.
- Screenshots and machine-readable control/engine reports are written under ignored `check-output/`. Desktop dialogs and phone portrait/landscape screenshots were visually inspected.

These are automated Chromium checks. Physical controllers, vendor-specific button mappings and physical iOS/Android devices were not available in this environment. The smoke runs establish startup and short gameplay coverage; they do not certify every procedural combination or long-run game balance.
