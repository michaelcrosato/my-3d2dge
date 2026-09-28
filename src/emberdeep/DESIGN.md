# EMBERDEEP: design and module contract

Emberdeep is my-3D2dge's signature game: a fast hack-and-slash (Diablo IV / Path of Exile II feel) that goes down forever. It showcases the engine: procedural 2D "puppet" animation (Humanoid and Blob rigs, E.MOVES, poses, cloth capes, flowing hair), pixel-art rendering in every classic view, lighting, particles and chip sound.

**The brief (from the owner):**
- The hero is the stress test's swordsman: teal tunic, red cape, dark hair, sword. His animation is the centerpiece. Show off every animation the engine can do, and invent new ones.
- Combat is fluid and fast. There's a deep skill system (actives with ranks and runes, plus a large passive tree), XP, levels, gold and loot like PoE II / D4. Gear visibly changes the hero.
- **Every depth introduces exactly one new element (mechanic), and the level is named after it.** A player can ignore it and still get through by hack-and-slash. Speedrunners and power-levelers can exploit it hard.
- Past the planned depths everything composes: mechanics combine, themes recolor, monsters, bosses and loot are built from parts. The game never runs out.
- **Emberhold**, the town, is fleshed out, with a few core characters who are animated well. There is no story, just one depth after another.
- It's challenging. Difficulty sliders (hero damage, life, speed, and the same for monsters) live in Settings for playtesting.
- A few really high-quality monsters, abilities and elements are the showcase. The procedural, modular systems are "a language of their own".

## Files and load order

`src/emberdeep/*.js` are joined in name order into ONE script inside one IIFE (`00-core.js` opens it, `99-start.js` closes it). Every file shares one scope.

- Top-level `const` / `function` names are visible to every later file.
- They must not collide. Prefix private helpers with your module's short name (e.g. `mechGale_`), or wrap private state in a block `{ ... }` or an IIFE.
- Code that runs at load time may only use things from files that sort before yours. Code inside functions may use anything.

The **core** files, which you must NOT edit, are:

```
00-core.js          setup, input, ED state, DIFF/OPT, REG registries, def(), BUS events, RNG, helpers, SCALE curves
05-elements.js      elements (phys fire frost storm void venom), statuses, dot(), applyStatus(), statusSpeed(), statusTint()
10-combat.js        units, dealDamage(), killUnit(), knock(), GRID, eachEnemy(), hitCircle(), hitCone(), elBurst(), FX verbs
15-stats.js         STATS, statText(), statSource(), computeStats(), skillRank(), heroHit()
20-hero.js          the hero: actions, xp, dodge, potions, drawing, collideUnit(), settleCape()
25-skills-core.js   skill runtime (useSlot, skillCtx, swingAction), ICON, drawSkillIcon, Blade Dance, Ember Bolt
30-monsters-core.js monsters: spawnMonster(), AI helpers + melee/pouncer/orb AIs, affixes, packs, drawFoe(), 5 archetypes
35-bosses-core.js   bosses: spawnBoss(), the 'boss' AI, patterns slam/charge/nova/summon/cleave, composeBoss()
40-loot-core.js     items: RARITY, SLOTS, bases, affixes, makeItem(), equip(), drops, labels, drawItemIcon(), 3 powers
45-mechanics-core.js things (addThing), blast(), heroHitAmount(), the Powder Kegs mechanic (the reference)
50-levels-core.js   PLAN (the planned depths), recipe(), levelName(), the 'halls' layout, the 'crypt' theme, buildLevel()
55-town-core.js     heldItem(), NPC framework (makeNPC/updateNPC/drawNPC/say), TOWN.build hook + fallback, the Waykeeper
60-ui-core.js       UI kit (UI.def/open/close, hot(), button, slider, tipBox, panelBox, menuKeys), HUD, minimap, panels
70-audio.js         extra sfx (zap freeze portal clang thud crack bloop roar chime slash2), songs: town deep deep2 title
90-scenes.js        scenes: title, town, level, proving; worldStep/worldDraw; save/load; portals; camera keys
99-start.js         starts the game; window.__ed debug handle
```

If you need a core change, don't edit the file. Work around it through the registries, hooks and BUS events below. If you truly cannot, describe the smallest core change in your final report.

## The language (registries)

Register every part with `def(kind, id, spec)`. The kinds, with each spec documented at the top of the file that uses it:

| kind | spec lives in | ids that are CONTRACTUAL (others are free) |
|---|---|---|
| `skills` | 25-skills-core.js | core: `blade`, `ember` |
| `archetypes` | 30-monsters-core.js | core: `husk skeleton knight slime wisp` |
| `ai` | 30-monsters-core.js | core: `melee pouncer orb boss` |
| `affixes` (elite monster affixes) | 30-monsters-core.js | core: `hasted stoneskin vampiric` |
| `bosses` | 35-bosses-core.js | `cinderking` (depth 5), `broodmother` (10), `wyrm` (15) |
| `patterns` (boss attack verbs) | 35-bosses-core.js | core: `slam charge nova summon cleave` |
| `itemBases`, `itemAffixes`, `powers`, `uniques` | 40-loot-core.js | |
| `mechanics` | 45-mechanics-core.js | see the PLAN below |
| `themes` | 50-levels-core.js | see the PLAN below |
| `layouts` | 50-levels-core.js | `halls` (core), `islands`, `arena`, `caves` |
| `npcs` | 55-town-core.js | `waykeeper` (core) |
| `songs` | 70-audio.js | core: `town deep deep2 title` |

UI panels are registered with `UI.def(id, spec)`. Contractual panel ids:

- `inventory` (I), `skills` (K), `tree` (P);
- `smith`, `vendor`, `mystic` (the services town NPCs open);
- core: `pause settings death waystone`.

### The planned descent (50-levels-core.js PLAN). Every id here must exist.

| depth | mechanic id | level name | theme id | layout | boss |
|---|---|---|---|---|---|
| 1 | `powder` (core) | The Powder Vaults | crypt (core) | halls | |
| 2 | `wards` | The Warded Halls | crypt | halls | |
| 3 | `chasm` | The Sundered Bridges | ruins | islands | |
| 4 | `gale` | The Howling Galleries | ruins | halls | |
| 5 | `magma` | (the boss names it) | forge | arena | cinderking |
| 6 | `ice` | The Rime Deep | frost | caves | |
| 7 | `brood` | The Brood Warrens | fungal | caves | |
| 8 | `pylons` | The Stormglass Mines | mine | halls | |
| 9 | `timewell` | The Stilled Clockworks | clockwork | halls | |
| 10 | `webs` | (the boss names it) | fungal | arena | broodmother |
| 11 | `dark` | The Lightless Maw | abyss | caves | |
| 12 | `bloodrush` | The Crimson Rush | ossuary | halls | |
| 13 | `launch` | The Leaping Spires | sky | islands | |
| 14 | `flood` | The Drowned Aqueduct | aqueduct | halls | |
| 15 | `quake` | (the boss names it) | cavern | arena | wyrm |

Past depth 15, `recipe()` composes each depth:
- a random theme, recolored by `L.hue`;
- a random layout;
- 2 mechanics (3 past depth 40), named `'The ' + adj + ' ' + noun`;
- a composed boss every 5th depth, built from patterns.

Mechanics, themes, archetypes, affixes, patterns and powers must therefore work in ANY combination: with each other, in any theme, at any depth and in any layout. Missing ids fall back gracefully.

### Standard floor tags (50-levels-core.js)
Floor tags are shared by themes, layouts and mechanics: `pit` (void, blocked for walkers; knocked-back, airborne and flying monsters cross it), `water` (slows), `deep` (blocked), `ice` (no traction), `lava` (burns), `web` (slows; fire should clear it), `blood`, `snow`.
- **Every theme's `floor(L, x, y, tag)` must start with** `const s = standardFloor(L, x, y, tag, (a, b) => <this theme's floor at a, b with no tag>); if (s !== undefined) return s;`. The theme may then render its own tags too.
- Their effects are applied by the core for every unit (`floorEffects`), so mechanics that add ice, water, lava or webs get the behaviour for free. Add only what is special.
- To add blocked tags at runtime, also set `L.map.blocked[i] = 1`, and reset `L.map.floors = {}` to re-bake the floor.

### Skill ids (contract, so powers, passives and the skills panel can refer to them)
`blade`, `ember` (core); melee: `cleave whirlwind lunge leap uppercut kick flurry bladethrow`; spells: `frostnova chainlightning meteor voidrift bladestorm echo warcry blink`.

## Core concepts you will use

- **ED** (shared state): `ED.hero`, `ED.L` (the current level or town), `ED.foes`, `ED.allies`, `ED.corpses`, `ED.fx`, `ED.drops`, `ED.boss`, `ED.depth`, `ED.mode`.
- **A level `L`**:
  - `map` (E.TileMap), `flow` (E.FlowField), `w`, `h` (cells), `cells`, `tags`;
  - `rooms` [{x, y, w, h, cx, cy} in cells], `start` / `exit` {x, y} in world, `things`, `props`, `torches`, `runes`;
  - `mechs` [ids], `theme`, `hue`, `pal`, `depth`, `rec`, `randomFloor(R, {minStart, edge, room})`;
  - `seen` (explored mask);
  - hooks: `drawUnder(r)` and `drawOver(r)`, `sky` (colors behind the map), `ambient`.
  - One tile is 16 world units (`T16`). The floor tag at a world point is `L.map.floorAt(x, y)`.
  - To change floor tags at runtime, write `L.map.floorTags[i]` and `L.map.blocked[i]`, then set `L.map.floors = {}` so the floor re-bakes.
- **Units and hits** (10-combat.js):
  - `dealDamage(unit, hit)` with hit fields `{ src, amount, el, kb, ang, up, stun, status, statusChance, statusPower, tags, knockdown }`.
  - Enemy queries: `eachEnemy(team, x, y, r, fn)`, `nearestEnemy(team, x, y, r, skipSet)`.
  - Area hits: `hitCircle(team, x, y, r, u => hit, set)` and `hitCone(team, x, y, facing, range, half, u => hit, set)`. Both also strike the level's hittable things for team 'hero'.
  - Movement: `knock(u, ang, kb, up)` (`up` launches a unit into the air, a juggle).
- **FX verbs** (10-combat.js): `FX.bolt`, `FX.nova`, `FX.area`, `FX.telegraph`, `FX.strike`, `FX.meteor`, `FX.chain`, `FX.beam`, `FX.wave`, `FX.pull`, `FX.scorch`, and `FX.visual(dur, (r, u, f) => draw, update)`.
  - Every verb takes `team`, `src`, `el` and `hit` (a template).
  - `elBurst(x, y, z, el, n)` bursts particles in any element.
- **Hero hits**: `heroHit(h, scale, { el, tags, kb, skill, extra })` is weapon damage × scale × every increase. Mechanics can scale with `heroHitAmount(scale)`.
- **Things** (45-mechanics-core.js):
  - `addThing(L, { kind, x, y, r, solid, hittable, onHit(hit), update(dt, L), draw(r), mapColor, dead, keep })`.
  - Things with `hittable` are struck by every hero attack. `blast(x, y, r, amount, {src, el})` damages everyone.
- **Unit movement hooks** (set them every step, from your update):
  - `u.traction` (0..1, ice), `u.speedK` (a speed multiplier, mud), `u.drift = [vx, vy]` (wind, currents), `m.timeK` (a monster's clock: time wells; persistent, so reset it yourself);
  - `m.fade` (0..1, darkness);
  - Knocked-back or airborne monsters may cross pits (`kbT`, `air`, `canFly`).
- **BUS** events (`BUS.on(ev, fn, 'level')` is cleared when the level ends; `'global'` persists):
  - combat: `hit {src, tgt, hit, dmg}`, `kill {src, tgt, hit}`, `hurt {tgt, hit, dmg}`, `heroDie`;
  - hero actions: `skill {id, slot, h, ctx}`, `dodge {h}`, `perfectDodge`;
  - loot: `pickup {item}`, `gold {n}`;
  - progress: `levelStart {L}`, `levelEnd {L}`, `bossDown {m}`, `heroLevel {lvl}`, `spawn {m}`, `thingHit {thing, hit}`;
  - frame: `step {dt, L}`, `draw {r, L}`.
- **The hero's actions** (20-hero.js):
  - `startAction(h, { name, update(dt) -> keep, rig: {...}, moveK, cancel, face, z, ghost, speed, free, draw(r) })`.
  - `rig` fields go straight into `Humanoid.update`: `attack` (an E.Attack state), `pose`, `air`, `dash`, `run`, `down`, `expr`, `stance`, `point`, `aim`.
- **Stats**: `statSource((h, add) => add('incFire', 10))` adds a source. Stat keys are listed in STATS (15-stats.js). Temporary buffs go in `h.buffs.push({ id, name, color, t, stats: {...} }); computeStats(h)`.
- **UI kit**, inside an `r.overlay(g => ...)` or a panel's `draw(g, x, y, w, h)`:
  - widgets: `button(g, x, y, w, h, label, onClick, {focus, disabled, tip, color, active})`, `slider(...)`, `hot(x, y, w, h, { click, rclick, tip: lines | fn })`;
  - drawing: `tipBox(g, lines, x, y)`, `panelBox(...)`, `E.ui.box`, `E.font.text(g, s, x, y, color, { font: 'tiny', align, outline, shadow })`;
  - `UI.mouse.x / y` are in screen pixels;
  - tooltip lines are `[{ t: 'text', c: '#color', big, sep }]`;
  - text: `notify(text, color, dur)` for the feed, `showCard(title, sub, mechLike, dur)`.

## Core features added after the first build wave
- `92-gallery.js`: the Gallery scene (`#gallery`, and on the title menu).
  - SKILLS plays every `REG.skills` entry on straw training dummies (the `dummy` archetype).
  - BESTIARY plays every archetype except bossBody ones: it walks in, attacks the hero and dies.
  - POSES is the hero's pose vocabulary.
  - Your content shows up there automatically, so make it look good there too.
- `93-autopilot.js`: `botOn(h)` or `__ed.bot(true)` lets an autopilot drive the hero through a virtual input (`h.bot.input`). `__ed.botRun({ to: N, speed: 3 })` plays depth after depth and logs time, level, deaths and kills in `__ed.BOT_RUN.log`. The title screen uses it as an attract-mode demo (`ED.demo`: nothing is saved).
  - The bot reads `S.kind`, `S.tags` ('aoe') and `S.range` to decide when to use a skill.
  - It spends passive points through `autoAllocatePassives(h)` when that function exists.
- `94-tips.js`: `tip(id, text, color)` shows a one-time hint per save. Tips wait for the level card to fade.
- Composed depths (after 15) each introduce a NEW combination: all pairs of mechanics in the order they were introduced, then triples (`comboFor(n)`). The level card says "NEW COMBINATION".
- Deep packs vary (`packVariant`): an element (recolor + status), a shared affix on normal monsters, and Giant and Swarming packs.
- The hero:
  - the dodge is a forward roll (`heroRoll` post-rotates the rig's joints);
  - drinking re-solves the left arm with IK;
  - a wounded hero hunches.
- Monsters knocked over a pit fall and die (credited to the hero) when no `chasm` mechanic runs the level.
- HUD:
  - a camera-projected cached automap (Tab shows the big map);
  - a level clock with best times per depth (`h.best`);
  - an edge arrow to a discovered exit;
  - '!' alerts when a pack notices the hero;
  - slow-motion finishers on the last kill of a pack.

## Quality bar (read this)

- **Look:** PS1 / N64-era 2D (Symphony of the Night, Legend of Mana), not NES.
  - Shade everything you draw with `E.tones(c)` (deep / sh / base / lt / hi), use 3-5 tones per material, and give everything outlines and depth.
  - Draw only with engine primitives: `px.*`, `r.*`, `E.ui`, `E.font`, props and sprites. Never `ctx.arc` / `fillText` / gradients on the game buffer.
  - Anything that overlaps goes through `r.queue` / `r.actor`. Glowing things use `{ emissive: true }` and `px.glow(g, 1)`.
- **Animation is the showcase:**
  - Use the rigs' full vocabulary: every `E.MOVES` move, poses (cheer cast guard kneel crouch wave hips block die down), `expr`, stances, `air`, `run`, `climb`, `hurt`, capes, hair.
  - Invent NEW procedural animation where it helps: new rigs built with `E.ik3`, `E.tones`, `px`; held items with `heldItem()`; new move specs, squash and stretch, secondary motion.
  - Everything animates from continuous values (timers, velocities, easing), never from frame lists.
  - Enemies telegraph: a visible wind-up and a red floor warning (`FX.telegraph` or the melee arc).
- **Feel:**
  - Every hit gets hit-stop (`game.freeze(.03-.06)`), `shake()`, sparks and sound. Deaths and big hits get more.
  - Fast, readable, fair.
- **Modularity:**
  - Your parts must work in any theme, at any depth (scale damage and life with the core curves: monsters via `m.dmg`, hero hits via `heroHit` / `heroHitAmount`), in any view (`V` cycles iso / three-quarter / top-down / brawler), and at any zoom.
  - They must combine with anything else.
- **Performance:** 100-200 monsters in a level; keep per-frame work small and cull off-screen drawing with `r.visible`.
- **No external files and no network.** Keep the house style: dense, commented code like the rest of the repo, no TypeScript.

## Testing (every module MUST be tested before you report done)

1. `node tools/ed-build.mjs --out <scratch>/mine.html --mine <your files, comma separated>` builds the core plus your files only. Other agents are editing their own files at the same time, so don't use `--all` until the end.
2. `node tools/ed-play.mjs <scratch>/mine.html --hash depth-N --god --out <scratch>/shots --steps "wait:3000 | eval:<js> | aimfoe | click | ... | shot:name | log:<js>"`.
   - `window.__ed` gives you ED, REG, spawnMonster, spawnPack, spawnBoss, makeItem, equip, UI, FX, dealDamage, heroHit and more.
   - Deep links: `#depth-7`, `#town`, `#proving`.
   - Steps separated by ` | ` may contain spaces.
3. Look at your screenshots (Read the PNGs) and judge them against the quality bar. Check several views (`eval:__ed.game.setView('threequarter')`).
4. `node tools/filmstrip.mjs <page>#depth-N --steps "..." --crop x,y,w,h` records animations frame by frame. Use it for every new animation.
5. It must run with zero errors in the console and in `game.errors`.
