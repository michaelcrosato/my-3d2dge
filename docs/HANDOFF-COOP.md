# Handoff: co-op (up to four players, each free to go anywhere)

> **Status: TBD, on hold (2026-10-16).** The owner is thinking it over. Nothing here is to be built until they say
> go and answer section 13.
>
> **Since it was written (2026-10-18):** v0.47.0 to v0.51.1 went to the 3D shooter kit, so each phase takes the next
> minor version when it merges, not the number it was first given; check the facts it relies on against the code of
> the day (section 17's prompt says how).

The plan for co-op multiplayer in Emberdeep: up to four players in one game, each going wherever they like, against
monsters whose life and damage grow with the players around them. It was made on 2026-10-16 against v0.46.1
(`cfa866a`). It draws on five audits of the game and the engine (quoted here by file and line) and on three
measurements (section 2.3). It is for the agent that implements it, and for the owner, who answers section 13. It is
temporary: when the work lands, move what lasts into `docs/COOP.md`, `src/emberdeep/DESIGN.md` and `docs/DECISIONS.md`,
then delete this file, as v0.38.1 and v0.43.3 did with finished plans.

**The brief (from the owner):**
- Co-op for up to four players. It should be essentially the same single-player experience.
- No extra monsters spawn. Instead, enemy life and damage rise with the number of players.
- Do whatever the server, client and host sides need so that it feels lag free.
- No anti-cheat.
- Any player can go wherever they want in the game, as long as they can get there. Nobody is tied to another player
  or has to wait for one: "a super mini-MMO".
- No voice or text communication. Emotes and emote animations, standard pings and map pings are in.

**The plan in brief:**
1. **Every place is a world of its own, shared by the players in it.** The places are each depth and the Proving
   Grounds. The players in a place all simulate it in deterministic lockstep: the same seed and the same inputs each
   tick give the same world on every screen. This is the engine's own invariant (principle 5) put to work. Every
   mechanic, monster, boss, effect and power then works in co-op as it is written, with no network version of any of
   them.
2. **Emberhold is the exception.** Each player runs their own town, and the others appear in it driven by their
   inputs (section 3.1). Nothing in town needs to be agreed, and a town may run for hours.
3. **Nobody waits for anybody outside their place.** Places run independently. A player alone in a place runs it with
   no delay at all, which is single player exactly.
4. **In a shared place, inputs take effect a few ticks late, to cover the network.** The estimates in section 7.1:
   about 17 ms on the same Wi-Fi, 33 ms across a city and 50 to 70 ms across a country or on a phone network.
   - Walking and turning show at once: the hero is drawn ahead of the world (the lead, section 7.3).
   - Skills, dodges and monsters' reactions arrive on the delay.
   - Phase 0 lets the owner feel this on their phone before anything else is built.
5. **There is no game server.** Players connect directly (WebRTC data channels), at a few kilobytes a second between
   any two of them (section 3.5).
   - A small relay introduces them and carries traffic for the few who can't connect directly. It runs no game.
   - The player who makes the party (the host) keeps the party's settings and its list of places.
6. **Scaling:** monster life rises by 100% and damage by 50% for each extra hero in the same place. Bosses rise by 100%
   and 25%. All four are knobs, calibrated with the autopilot (section 6).
7. **Rewards are personal, as in single player.** Each hero rolls their own loot, which only they see. Experience from a
   kill goes in full to every hero near it (section 8).
8. **Phases 1 and 2 pay off on their own, even if Phase 0 changes the network design.**
   - Phase 1: the world no longer depends on the screen. The doctrine already promises this, and Emberdeep doesn't keep
     it yet.
   - Phase 2: several heroes in one world. The owner can play with up to three autopilot companions before any
     networking exists.

## Read this first

- Read `CLAUDE.md`, `DOCTRINE.md`, `src/emberdeep/DESIGN.md`, then this file.
- **One phase per pull request, in order (section 15).**
  - Phase 0 is a Temporary lab and takes no version bump.
  - Every other phase takes the next minor version when it merges.
  - Section 19 logs where the work stands.
- **References and line numbers:**
  - Line numbers are as of v0.46.1. Search by name when they have moved.
  - `NN:line` is `src/emberdeep/NN-*.js`. `F:line` is `engine/my-3d2dge.js`.
- **Engine work goes into the full engine only.** The agent edition stays a strict subset (`npm run test:agent`) and
  gets no co-op until a kit needs it.
- **The co-op card.** The manual's budgets are nearly full:
  - API card: 14,649 of 15,000;
  - agent header: 9,792 of 10,000;
  - API index: 34,010 of 40,000.

  Co-op gets its own card, `docs/COOP.md`, with a budget of 3,000 that `doctrine-check` counts, as D30 did for the
  asset card. API.md gets one line pointing to it, and the index gets the public names.
- **Two deviations from the house rules (section 12):**
  - The network itself: a reversible call, made in its own commit and logged.
  - Putting the relay online: hard to undo, so it is escalated.
- **Words this plan uses:**

  | word | meaning |
  | --- | --- |
  | place | a world that runs: `depth-N`, `proving`, and the town |
  | member | a player in a place |
  | host | the player who made the party |
  | leader | the member of a place who settles who arrives and leaves |
  | tick | one world update, 1/120 s, the engine's fixed step |
  | frame | one member's input for one tick |
  | delay | how many ticks after it is sampled a frame takes effect |
  | command | a menu action carried in a frame |
  | control event | a change to a place's members, settled for a future tick |
  | log | a place's seed plus every frame and control event; replaying it rebuilds the place exactly |

## 1. What co-op means here

| The owner asked | What it means in this plan | Section |
| --- | --- | --- |
| up to four players, the same single-player experience | One game, four heroes (any characters), each player's own character and save. Alone in a place it is single player exactly, with no delay. Shared, every rule of the game holds, because every client runs the same world. | 3, 4, 5 |
| no more monsters; life and damage rise with players | The packs are unchanged. Life and damage grow with the heroes in the same place, through two choke points that already exist. | 6 |
| server, client and host side; lag free | Direct connections between players; a delay that covers the network and no more; the lead for walking; a relay only for introductions and fallback; no game server to pay for or wait on. | 3, 7, 11 |
| no anti-cheat | Every client trusts every other. A player's own tools (god mode, gear) are their own business. | 5.5, 8 |
| go anywhere, tied to no one, never waiting | Places run independently. Moving between places is each player's own exit, waystone, portal or death. Nobody waits for anyone outside their own place. Inside one, nobody waits for a slow player for more than a moment (3.8). | 3.1, 3.7, 3.8 |
| a super mini-MMO | Emberhold is the hub where everyone meets. A friend's town portal leads to their depth. The party panel shows where everyone is. | 3.1, 8, 10 |
| no voice or text | None. Names only (13.8). | 10 |
| emotes and emote animations | An emote wheel: eight emotes from the rigs' poses, plus two new procedural ones. | 9 |
| standard pings and map pings | Pings in the world (go here, enemy, danger, help) and on the map, with markers at the screen's edge. | 9 |

## 2. What the game is today

### 2.1 What co-op builds on

| What exists | Where | What co-op does with it |
| --- | --- | --- |
| An exact fixed step: 1/120 s per update at any refresh rate; slow motion makes steps shorter, never fewer | F:2524-2545, D16 | the tick |
| The engine's seeded streams and portable math, so the same inputs give the same bits in Chromium and Safari | `E.rng` F:112-113; `PORTABLE_MATH` F:8214-8403, D15 | cross-device lockstep |
| Sessions that replay exactly, a replay tool that finds the first checksum that differs, and seeded harnesses | `E.session` F:8198-8613; `tools/replay.mjs`; `tools/filmstrip.mjs --seed`; `tools/ed-balance.mjs` | the place log; desync reports and bisecting |
| The hero reads its input through a switch, and the autopilot drives it through a virtual input: a world move, an aim point, presses and holds | `const inp = h.bot ? h.bot.input : game.input` 20:193 and 20:207; `makeBotInput` 93:11-15 | a remote hero is driven the same way, by its frames |
| Area attacks and shots already hit any unit on the hero's side | `heroSide()` 10:12, `eachEnemy` 10:30, every FX verb | several heroes take hits without rewiring every attack |
| Levels are seeded, with their own streams for packs, wardens and scenes | `RNG('emberdeep:' + depth + ':' + visit)` 50:32; `+99` 50:448; `+313` 32:151; 53:165 | a place's level from the party's seed |
| Monster life is set once, at spawn, through one function; damage is multiplied at hit time where Difficulty already applies; a change rescales the living | `hpK` 30:59; `amt *= ... DIFF.foeDmg` 10:119; `setDiff` 60:550 | the scaling points |
| The portal round trip keeps a level in memory and resumes it | `ED.savedLevel` 90:376-378, resumed 90:334-340 | a suspended place |
| A save per character, about 10 to 30 KB | `SAVE_KEYS` 90:11-12; `'ed:save:' + id` 18:60 | the hero a player brings into a place |
| Headless tools, Chromium and Playwright in every session | `tools/ed-play.mjs`, `check.mjs`, `filmstrip.mjs` | `tools/world-test.mjs`, `tools/coop-test.mjs` |

### 2.2 What stands in the way

| Problem | Where | Fixed in |
| --- | --- | --- |
| One hero everywhere: 354 references to `ED.hero` on 297 lines, 195 local aliases | every file but 00, 05, 15, 18, 21, 50, 52, 53, 61, 70, 95 | Phase 2 (5) |
| **Monster targeting:** no target field, so every AI aims at `ED.hero`. Melee and contact hits strike only it. | 30:149-310; 31, 33, 35, 36 | Phase 2 (5.2) |
| **Monster schedulers:** one attack-turn budget for the whole level. | `AI.tokens` 30:146-149 | Phase 2 (5.2) |
| **Pathing:** one flow field, pointed at the hero. | 90:67; F:4806 | Phase 2 (5.2) |
| Any open panel stops the world; losing focus opens the pause panel | `updateUI` returns `UI.modal` 60:61, 90:360; 61:526-535 | Phase 3 (7.4) |
| Hit-stop and slow motion stop or slow the whole world. Slow motion runs on the wall clock. | `game.freeze` (about 60 call sites); `SLOW` 00:148-163 (`performance.now`) | Phases 1 and 3 (7.4) |
| **Randomness:** drawing draws from the gameplay random stream: 33 sites in draw code, of 968 `Math.random` sites. | e.g. 10:376, 51:542 | Phase 1 (4) |
| **Random stream:** `rnd` is seeded once per page load. | 00:118 | Phase 1 (4) |
| **Drawing writes state:** drawing writes rig state that gameplay reads. A rig's hands and tips depend on the last view drawn. | `Humanoid.draw` F:3398-3405; `_w` F:3080 | Phase 1 (4) |
| **Settings change the simulation:** the particle cap and the performance governor, damage numbers, skipping off-screen animation, the loot filter, aim assist, Difficulty and Tuning. | 10:84-101; 30:304; 40:537; 20:201 | Phase 1 (4) |
| **View-dependent AI:** the melee ring and bat roosts read the camera. | 30:192; 31:721-738 | Phase 1 (4) |
| **Seeds:** a level's seed comes from the local hero's visit count, and composed bosses are registered by depth, once per page. | 90:342; 35:174; the waystone panel calls `recipe(d, 0)` while drawing, 60:666 | Phase 1 (4) |
| World code runs on the engine's clock: about 260 reads of `game.time` and about 20 `game.after` timers | e.g. 30:149, 36:824, 41:244 | Phase 1 (4) |
| Menus change the hero directly | 42, 28, 60, 63 (5.5) | Phase 2 (5.5) |
| Emberdeep can't run in Node (it reads `location` and `document` at load) | 00:25-28 | tests run in headless Chromium |

### 2.3 What planning measured

**How fast Emberdeep simulates with nothing drawn.** Headless Chromium in this cloud session, `game.advance(5)` (600
steps), three runs each. The town and the depths are as the game builds them; "+80" and "+120" add that many monsters
spawned in a block next to the hero, all awake.

| Place | Monsters | ms a step | Times faster than real time |
| --- | --- | --- | --- |
| town | 0 | 0.33 to 0.42 | 20 to 25 |
| depth 1 | 94 | 0.68 to 0.89 | 9 to 12 |
| depth 7 | 62 | 0.52 to 0.64 | 13 to 16 |
| depth 7, +80 | 142 | 1.31 to 1.74 | 5 to 6 |
| depth 15 | 29 | 0.36 to 0.51 | 16 to 23 |
| depth 40 | 36 | 0.64 to 0.78 | 11 to 13 |
| depth 40, +120 | 156 | 1.77 to 3.05 | 3 to 5 |

- One minute of a typical place replays in 4 to 7 s on this machine. A phone is slower, by an amount to measure in
  Phase 0.
- This is what a player joining a place that has been running pays (3.6), and why the town is not a lockstep place
  (3.1).

**How much of a step posing the monsters' rigs costs.** The same runs with every monster's `rig.update` and
`blob.update` replaced by nothing:

| Place | Rigs posed (ms a step) | Rigs not posed (ms a step) |
| --- | --- | --- |
| depth 1 | 0.87 to 1.22 | 0.57 to 0.59 |
| depth 7, +80 | 1.28 to 1.77 | 0.75 to 1.06 |
| depth 40, +120 | 1.04 to 2.81 | 0.70 to 1.64 |

Posing is about a third of a step (33 to 36%, comparing medians). Once gameplay stops reading posed rigs (section 4,
item 4), off-screen monsters need no posing in play, and catching up a place needs none at all.

**A direct connection between two headless pages.** A WebRTC data channel, unordered and with no retransmits, with
the test passing the offer, the answer and the candidates. It opened in under a second, with a round trip of 0.9 ms
(median) and 1.3 ms (95th percentile). The co-op tests can therefore run real connections and add latency on purpose.

**Hero speed.** The Wanderer runs at 84 units a second (`TUNE.heroRun`; one tile is 16). Behind a 60 ms delay he
would be about 5 units, a third of a tile, from where he is drawn with the lead (7.3).

## 3. The design

### 3.1 Places

- **The places:**
  - `depth-N`, one for each depth that has a hero in it;
  - `proving`, the Proving Grounds;
  - `town`, Emberhold (below).

  The title, the character menu and the Gallery are not places: each player sees their own.
- **Seeds.** The host draws a party seed. A place's seed is `hash(party seed, place id, generation)`, and the
  generation counts how many times that place has started. Like single player's visit counter (90:342), each new
  start of `depth-7` is a fresh level.
- **Who runs a place.** Every member of a place runs it, and nobody else does. A client runs one place at a time. It
  may also hold one suspended copy, for its own town portal (3.7).
- **Lifetime.** A place lives while a member is in it, or while a member's town portal leads to it.
  - With no members but an open portal, it is suspended: its clock stops, as single player's level waits while the
    hero is in town.
  - With neither, it is gone.
- **The town is not lockstep.**
  - It is the hub, where players may idle for hours. A lockstep place that old would take minutes to join by replay
    (2.3, 3.6).
  - It has nothing that must agree: no monsters, no loot on the ground, no combat that counts.
  - So each player runs their own Emberhold. The other heroes in it are run by their owners' frames (moving, aiming,
    skills, emotes), like any remote hero.
    - Their owners also send their looks when their gear changes, and every 30th frame their true position. A copy
      that drifted past 4 units (an NPC's body pushed it on one screen and not on another) blends back.
    - Their menu actions run only on their own screens.
  - What differs from screen to screen, and doesn't matter: the NPCs' greetings and wanders, and the animals.
  - What is shared: names, emotes, pings and portals (from the party's list of places, 3.4).
  - Each player's vendors, smith, mystic, stash and waystone are their own.

### 3.2 Lockstep with a delay

- **The clock.** A place's clock is its tick count, from 0 when the place began. One tick is one engine step,
  1/120 s.
- **Frames.**
  - Each member samples its input every step into a frame for tick `now + D`. `now` is the tick its world is due at;
    D is the place's delay.
  - A member's world runs tick t once it holds every active member's frame for t, and t ≤ now.
  - Each member's world is due at its own `now`, a tick or two apart. Members stay in step by frame advantage, as GGPO
    does:
    - every packet carries the sender's newest tick;
    - a member more than a tick ahead of the others (allowing for the one-way time) skips a step now and then;
    - no wall-clock sync is needed.
- **The delay D** is the same for every member of a place.
  - The leader sets it from measured round trips: `D = ceil((the largest one-way p95 + one tick + 2 ms) / 8.33 ms)`.
  - In a shared place it is at least 2 and at most 24 (200 ms). It is measured again every few seconds and moves one
    tick at a time by a control event, so a change is never felt as a jump.
  - **Alone in a place, D is 0.** Each step runs one tick, with today's hit-stop, slow motion and menus that pause.
    That is single player exactly.
- **When a frame is missing, the world holds.**
  - The screen keeps drawing: the menus and the local hero's lead keep working.
  - After 250 ms a small "waiting for <name>" appears.
  - After 1.5 s with no word from that member, the leader rules it away. A page that hides says so at once, so it
    costs the others only a moment (3.8).
- **The log.** Every member keeps the place's log: its seed, the party's settings, each member's hero as it arrived,
  every frame and every control event. Replaying the log rebuilds the place exactly.
- **The world stays the same on every screen** because of section 4 (Phase 1). **It has several heroes** because of
  section 5 (Phase 2).

### 3.3 Why lockstep (the options compared)

| | **Lockstep per place** (chosen) | **The host runs every place** and streams its state | **A dedicated server** runs every place | **Each player runs their own hero ahead**; the world in lockstep on hero states |
| --- | --- | --- | --- | --- |
| your own walking and turning | at once (the lead) | at once (prediction) | at once (prediction) | at once |
| your own skills and dodges | after D (17 to 70 ms) | at once (prediction) for you; for others, a round trip and the host's view | at once (prediction) | at once |
| the world's answer to your hit | after D | a round trip, plus buffering | a round trip, plus buffering | after D |
| fair to every player | yes | the host plays with no lag, the others with all of it | yes, everyone with a round trip | yes |
| work in Emberdeep | Phases 1 and 2 (determinism, several heroes, commands); nothing per mechanic, monster or boss | every monster, effect, thing, mechanic and boss needs a network version and a puppet on the other screens, forever. Emberdeep's world is one global state per page (`ED`), so a host running four places runs four copies of the game. | as the host column, plus Emberdeep needs a browser (00:25-28): headless Chromium per place on the server | Phases 1 and 2, plus every call from a hero into the world (skills, powers, executions) becomes an event: about the size of Phases 1 to 4 again |
| joining a place in progress | replay its log (3.6), snapshots later | send its state | send its state | replay its log |
| what a server does | introductions; relays the few who can't connect directly | introductions | everything | introductions |
| cost to run | close to nothing | close to nothing | a server per party | close to nothing |
| main risk | desyncs: caught by hashes, reproduced exactly by replay (3.9) | a network version of every system that drifts as the game grows | cost, plus that replication | hits the two sides disagree on |

Lockstep keeps "the same single-player experience" literal: every rule runs as written on every screen, and nothing new
has to be written per system. Its cost is the delay on your own actions in a shared place. The lead hides it for walking
and turning, and Phase 0 measures how it feels for everything else.

The last column is the **escape hatch**. If Phase 0 shows that the delay is felt, that design gives your own actions no
delay. It needs Phases 1 and 2 too, so they are not wasted whatever Phase 0 finds.

### 3.4 Who does what

| Role | Who | Does |
| --- | --- | --- |
| **member** | every player in a place | runs the place, sends its frames to the place's other members, keeps the place's log |
| **leader** | the place's longest-standing member | sets the delay; settles arrivals, away and leaving as control events for future ticks; gives a joiner the log |
| **host** | the player who made the party | keeps the party's build, settings (Difficulty, Tuning, `?mechs=`) and seed; keeps the list of places (generation, members, leader, open portals) and shares every change with every member; admits players |
| **relay** | a small server (11) | introductions by party code; carries traffic only for members who can't connect directly; runs no game |

- **When a leader or the host leaves,** the next member in join order takes over. Every member knows the order, and
  holds the host's list.
- **Entering a place.** The member asks the host for the place, and the host answers with one of two:
  - "depth-8 is generation 3, seed s, leader Ana: join";
  - "nobody is there: start generation 4 with seed s′".

  The round trip happens during the 0.3 s fade, so it is never seen.

### 3.5 The frame and the wire

**A frame** is the hero's intent for one tick, in world terms, as the autopilot's virtual input already is (93:11-15):

| Field | Bytes | What |
| --- | --- | --- |
| move | 2 | the world-space direction × 127. The length is kept, so a half-tilted stick walks slower. |
| aim | 4 | the aim point in world units relative to the hero (int16 x, y). The owner's screen gives it: `game.mouseGround()` for the mouse, the stick through the owner's view. |
| aim source and view | 1 | the aim source (mouse, pad, keys or touch, bot), and the owner's view and turn. The melee ring and the bats read them (30:192, 31:721-738). |
| held | 2 | bits for the actions held: s0 to s5, dodge, labels (Z), interact |
| pressed | 2 | bits for the same actions plus potion and portal, pressed since the previous frame |
| commands | 0 to n | rare: menu actions (5.5), emotes (9), the hero's settings (5.5), a world tool (8) |
| position | 0 or 4 | in town only, on every 30th frame: the hero's true position (3.1) |

- A frame is about 11 bytes, and about 3 once each is written as its change from the one before. A run of identical
  frames is sent as a count.
- **A packet** holds:
  - a header: the place, the sender's slot, the first tick, the count;
  - every frame since the oldest one the receiver hasn't acknowledged, up to 32 ticks, so a lost packet costs nothing;
  - its acknowledgements (the newest tick received from each member);
  - the sender's newest tick, for frame advantage;
  - every 60 ticks, the sender's world hash (3.9).
- Packets go out once a drawn frame, at about 60 a second, with about 45 bytes of payload each.
  - That is about 3 KB a second of payload to each other member. On the wire it is about 7 KB a second, most of it the
    protocols' own headers (UDP, DTLS, SCTP).
  - A full party sends about 20 KB a second each way, about 150 MB an hour. A phone may send every other frame to halve
    that, at the cost of up to one frame (16.7 ms) of delay (7.2).
- **Two channels between each pair of members:**
  - *frames*: unordered, with no retransmits. Like UDP: a late frame is worse than a lost one, and redundancy covers
    loss.
  - *control*: reliable and ordered. It carries party messages, heroes as they arrive, logs for joiners, pings,
    presence, and reports.
- **Control events** are settled by the place's leader for a future tick and carried in the leader's frames. A member
  can't run a tick without the leader's frame for it, so every member has the event before it applies.

| Event | Takes effect at tick | What it does |
| --- | --- | --- |
| `arrive {slot, hero}` | a | the hero appears at the entrance or the portal, as a ghost (untargetable, as `ghost` already makes a hero, 10:107) |
| `active {slot}` | b | the hero's frames count from b; it stops being a ghost |
| `away {slot}` | c | its frames are empty from c, and it is a ghost again (3.8) |
| `leave {slot}` | l | the hero is gone (when the world itself doesn't already know, 3.7) |
| `delay {D}` | d | the new delay |
| `leader {slot}` | — | a new leader |

### 3.6 Joining a place that has been running

1. The joiner asks the host for the place (3.4) and gets its leader.
2. The leader picks the arrival tick, about 0.3 s ahead, and sends the joiner the log so far. Every member streams new
   frames to the joiner as well.
3. The joiner builds the level from the seed, then replays the log as fast as it can, under the card "Entering <the
   level's name>". It draws nothing, and once rigs are presentation (section 4, item 4) it poses nothing.
4. Its hero arrived as a ghost at the arrival tick. When the joiner's world reaches the live tick, it starts sending
   frames, and the leader rules it active.

- **The cost grows with the place's age.** By the measurements in 2.3, one minute of a typical place takes 4 to 7 s
  here, and 2.5 to 4.5 s with posing skipped. It is more on a phone.
- **Most joins are cheap.**
  - Players going down together arrive seconds apart.
  - A player coming back through their own portal fast-forwards the copy they kept, from the tick they left (3.7).
- **The expensive join** is a newcomer to a place that has run for many minutes: a friend's portal, a waystone depth,
  a retry after dying in a boss fight. Phase 3 measures it on the owner's phone.
- **Snapshots.** If a typical join takes more than 10 s there, the next step is snapshots, the doctrine's own trigger
  ("Snapshots come later, when replay is too slow"). They are Phase 8, a large job (section 15). Until then, the card
  shows the progress.

### 3.7 Moving between places

| How | In single player | In co-op |
| --- | --- | --- |
| the exit | standing on it for 0.7 s, then `descend(depth + 1)` (90:371-373) | the same, inside the world. Every member sees that hero leave at that tick; its owner's client moves on to the next place. |
| the waystone | a depth in fives, or the deepest, from the hero's own record (60:670) | the same list: the hero's own, "as long as they can get there". Picking a depth enters that place, joining it if a friend is there. |
| death | the panel; town, or a fresh level at the retry depth (60:609-612) | the same. The hero leaves the place when its owner picks; retrying joins the place if friends are still in it. |
| the town portal | the level is kept in memory and resumed (90:376-378, 90:334-340) | the same. If the hero was the place's last member, the place is suspended: its clock stops and its owner's client keeps the copy and the log. Back through the portal, the owner resumes the copy, fast-forwarding whatever others played meanwhile. |
| a friend's portal | — | Each member's open portal shows in everyone's town, from the host's list. Walking in joins that place (3.6), with the owner's client handing over the log of a suspended place. The owner can turn this off (13.6). |
| quit, or leave the party | Save and Quit (60:530) | the same save; the hero leaves its place |

### 3.8 Away, back, and someone leaving

- **A hidden page** (a phone locked, a tab switched) stops drawing and sending.
  - The client says so at once on the control channel.
  - The leader rules it away from the first tick nobody holds a frame for. Members report what they hold in their
    acknowledgements.
  - Its hero stands as a ghost and doesn't count for scaling.
  - Nobody waits more than a moment: the ruling follows the client's message, not the 1.5 s timeout.
- **Back.** The client fetches the frames it missed, catches up and is ruled active.
  - Away for more than two minutes, the hero is ruled out of the place and wakes up in town.
  - The same holds for a dropped connection that the relay or ICE restores.
- **A leader that vanishes.** The next member takes over and rules the old leader away. A host that vanishes: the next
  member becomes host.
- **A broken link between two members.** Their frames go through the relay, or through a member both can still reach.
  If neither works, the leader rules one of them away. Lockstep never diverges for want of a frame: it waits, and
  only a bug makes worlds differ (3.9).

### 3.9 Desyncs

- **Hashes.** Every 60 ticks each member puts a hash of its world in its frames (`ED.worldHash()`). It covers every
  unit's position, life and state, the things and drops, the random streams' positions, and the tick.
  - It leaves out the camera, which the session checksum includes and which differs between screens (F:8499-8505).
- **A mismatch** is treated as a bug with a repro, as D14 made of every bug seen on a device.
  - The member that differs from the leader rejoins by replay.
  - Both save a desync report to Settings > Tools: the place log, the last few seconds of per-tick hashes, the
    client's settings and its build.
- **Reproducing one.** `node tools/replay.mjs --place <report>` replays the report headless. `--bisect a.json b.json`
  finds the first tick, and the first unit and field, where two reports differ.
- **The target is zero desyncs in the soak tests (14).**

## 4. One world on every screen

**Why this is needed.** Today Emberdeep comes out the same only when everything is the same:
- the replay test replays a session with its own frame times and its drawing (D12);
- the determinism test compares two runs at 60 Hz.

Lockstep needs more: clients with different views, turns, zooms, screens, settings and refresh rates must compute the
same world. Principle 6 already promises this ("the proof: the simulation gives the same hash with no renderer at
all"), and Emberdeep doesn't keep it yet. For example, with no drawing a town portal never becomes enterable, and a
rig's hands are never placed.

This is Phase 1, and single player gains from it too: a session then replays with any view and settings.

| # | What differs between clients today | Where | The fix |
| --- | --- | --- | --- |
| 1 | **Drawing and gameplay draw random numbers from one stream.** There are 968 `Math.random` sites, and 33 are in draw code. More are indirect: emitters called from draw, glint thinning, the inventory doll. | 10:376, 438; 27:412-413, 652; 31:1031, 1086; 33:1014, 1388; 36:568; 41:119; 46:1108; 47:517; 50:510; 51:542, 631, 726, 860; 50:486; 56:663, 671; 10:69; 42:305 | **Two streams, owned by the engine: the world's and the screen's.**<ul><li>`Math.random` reads the world's inside a world tick and the screen's everywhere else: drawing, menus, DOM events.</li><li>The 968 sites need no audit. Whatever runs in a tick runs alike on every client, and whatever draws can't touch the world.</li><li>`rnd` (00:118, created once per page load) becomes the world's stream, seeded with the place's seed. Its 187 sites stay as they are.</li></ul> |
| 2 | **The particle cap decides whether gameplay draws a random number.**<ul><li>Particles draw from `Math.random` (F:1423-1439).</li><li>A full list makes `P.add` return null (F:1357).</li><li>Damage numbers branch on that, skipping a random draw or not (10:84-101).</li></ul> The cap follows `OPT.fx` (00:75) and the performance governor (95:15-23). | as listed | Particles draw from the screen's stream. A damage number becomes presentation only: nothing in the world branches on the particle list. |
| 3 | The damage-number option gates random draws | 10:84, 05:57, 46:961 | The same as 2: the numbers are presentation. |
| 4 | **Rig hands and tips depend on the last drawn view.**<ul><li>`Humanoid.draw` writes `_pitch`, `_cheat`, `_camSide` and `_lastView` (F:3398-3405), and `_w` turns by `_cheat` (F:3080).</li><li>Gameplay reads hands and tips: the hero's projectiles (25:181), monster bolts (31:225, 319), the Warden's lantern (32:112), `BOS_hand` (36:40).</li></ul> | as listed | In the engine, a hand or tip asked for by gameplay comes from the rig's own state, never from what the last draw wrote; drawing keeps its cheats. Better still, gameplay takes those points from the body (facing, size) rather than the posed joints, so rigs become presentation: off-screen monsters need no posing in play, and catch-up needs none (2.3). |
| 5 | **Skipping off-screen animation reads the camera.** | `OPT.lod` and `isVisible` 30:304, 313 | In a shared place, skip by distance to every hero, or not at all once 4 makes rigs presentation. |
| 6 | **Two AIs read the camera.**<ul><li>The melee ring stands waiters on the camera's side further back (30:192; 31:123).</li><li>Bats roost by the view (31:721-738).</li></ul> | as listed | The frame carries its owner's view and turn (3.5). The ring uses its target's owner's view, so monsters still stand where their own player can see them. Bats use the nearest hero's owner's view. |
| 7 | **The wall clock in the world.**<ul><li>Slow motion's durations (00:148-163).</li><li>The wait before the death panel (20:142, 90:328).</li><li>The governor (95:17-22).</li></ul> | as listed | Slow motion and the death wait count steps: a public step clock in the engine, which today has only the private `_wall` (F:2533). The governor stays local and, after 2, touches only presentation. |
| 8 | **The engine's clock in world code.**<ul><li>About 260 reads of `game.time`, such as the attack turns (30:149).</li><li>About 20 `game.after` timers, such as the boss chest's toss (36:824), a power's delayed nova (40:740) and Shatterglass (41:244).</li><li>About 15 reads of `game.real` outside the UI.</li></ul> | as listed | **Inside a place, the runner owns the clock.**<ul><li>Before each tick it sets `game.time` to the place's time and runs the timers due by then.</li><li>The engine's step leaves both alone while a runner owns them (a small hook in `Game._step`, F:2587-2619).</li><li>The `game.real` reads in world code move to the place's clock.</li></ul> |
| 9 | **Drawing changes gameplay.**<ul><li>The portal ages in draw (`pt.t += 1 / 60`, 90:39), and the hero may enter only past 0.6 (90:376).</li><li>The stash chest steps from draw (56:663, 671).</li></ul> | as listed | Move both into the update. |
| 10 | **Settings that are really rules.**<ul><li>Difficulty (00:67-71) and Tuning (01:121-122), with its registry overrides (62:107).</li><li>The loot filter, which gates auto-pickup (40:537, 552).</li><li>Aim assist (20:201-202).</li><li>The Tools switches (62:6-13).</li></ul> | as listed | <ul><li>Difficulty, Tuning, its overrides and `?mechs=` are the party's: the host's values, in every place, while in a party.</li><li>The loot filter and aim assist are the hero's settings, which travel with it and change by command (5.5).</li><li>The Tools switches are the hero's own (god mode, no cooldowns), or the world's (8).</li></ul> |
| 11 | **A level's seed is the local hero's visit count.** | 90:342, 50:32 | `recipe(depth, visit)` with visit = the place's generation hash (3.1). The hero's own visits still count for its records. |
| 12 | **A composed boss is registered by depth, once per page load.** Whichever call comes first decides it, and the waystone panel calls `recipe(d, 0)` while drawing. | 35:174; 60:666 | Register by seed, with an id of `'composed' + depth + ':' + seed`, and keep recipe pure: the panel registers nothing. |
| 13 | **Boss spawns roll on `rnd`, and boss scars live in memory per page.** | 50:450 → 35:14; scars 35:18-20, 64-65 | The spawn rolls are fine once 1 is done. Scars move onto the hero (8). |
| 14 | **The town's NPCs and animals draw `Math.random`, and the vendor's stock is rolled on `rnd` when its panel opens.** | NPCs 56:913, 920; animals 56:1269-1275, 1473; vendor 42:627-633 | The town is each player's own (3.1), so the NPCs, the animals and the vendor's stock need nothing. |
| 15 | **Portable math is on only in sessions.** | F:8447 | On for every client in a party: an iPhone's Safari and Chromium round sine and cosine differently in the last bit (D15). It costs up to twice those functions' time; Phase 1 measures it. |
| 16 | **Locale-dependent comparison.** | `localeCompare` (28-progression.js) | Plain comparisons in anything the world reads. |
| 17 | **Input clearing and HUD suppression depend on the local layout.**<ul><li>`input.clear()` when a panel opens (60:19-20).</li><li>HUD suppression of s0 and s1 under the pointer (60:45-52).</li></ul> | as listed | Applied before the frame is made. The frame is what counts. |
| 18 | **The camera shake moves the mouse's ground point.** | F:2623-2625, read by `mouseGround()` | Harmless in co-op: the aim is made on the owner's screen and sent. Leave it. |

**The proof** is `tools/world-test.mjs`. One autopilot run is recorded as frames (the hero's world-space intents, tick
by tick). Pages that differ in every way the table names then replay it:
- iso against top-down and brawler, turned and zoomed;
- 390×844 at 3× against 1280×720;
- particles 0 against 2, off-screen skipping on, damage numbers off, GPU light on and off;
- one page headless with no drawing;
- one drawn at 60 Hz and one at 144 Hz.

They must give the same world hash every 60 ticks for 10 minutes on depths 1, 5, 9, 15 and 40.

## 5. Several heroes in one world

### 5.1 `ED.heroes`, `ED.me` and `ED.hero`

| Name | What it is | Who reads it |
| --- | --- | --- |
| `ED.heroes` | every hero in the place, in arrival order (the same order on every screen) | world code |
| `ED.me` | the hero this client plays | the camera, the HUD, panels, saves, tips, rumble, input, sound |
| `ED.hero` | an alias of `ED.me`, so single player and UI code keep working | UI code only |

**Inside a world tick, world code never reads `ED.hero`.** In a party it differs per client, so reading it would
desync.

- World code gets its hero from what it is doing:
  - the acting hero, for skills, powers, potions and the dodge;
  - the monster's target, for AI (5.2);
  - the hit's source or target, for combat;
  - `ED.heroes`, for mechanics and the level.
- **A strict guard finds what is left:**
  - in a party, reading `ED.hero` inside a world tick logs the call's stack;
  - `world-test` and `coop-test` fail on any such read;
  - the autopilot's companion runs (Phase 2) find the rare paths.

### 5.2 Monsters choose a target

- **Each monster gets a target, `m.target`.** It is the nearest living, active hero by path distance; ties go to
  arrival order.
  - The monster looks again every 0.5 s. It switches when another hero is at least 30% nearer, or has dealt it the most
    damage in the last 3 s.
  - A boss looks again on each pattern and favours the hero who hurt it most, so its attention spreads.
  - Waking uses any hero: aggro, the pack's alarm, the Wardens' `E.sees` and `E.hears`.
- **Attack turns are per hero.** `AI.tokens`, `nextTurn` and `shotNext` (30:146-149, 249, 261) become each target
  hero's. Each hero then faces what a solo hero faces from the monsters around them, with no more attackers at once.
  This keeps fights readable, as the comment at 30:148 wants.
- **One flow field per hero, `L.flows[i]`.** A monster steers by its target's field. The engine's FlowField keeps a
  single target (F:4806), so a level holds up to four.
- **Melee and contact hits strike every hero in the arc,** as area attacks and shots already do (`heroSide()`). Today
  they strike only `ED.hero`: `A.hits([h], …)` at 30:187 and 31:118, and the pouncer at 30:228.
- **What a monster does to its target stays as it is.** Its approach, its telegraphs, its fleeing (30:284), being
  pushed out of the hero (30:293), the blob's gaze (30:310) and the 20 `dealDamage(h, …)` calls read `m.target`
  instead of `ED.hero`.

### 5.3 The conversions, by role

From the audit: what reads one hero today, and what it reads in co-op.

| Role | Where | In co-op |
| --- | --- | --- |
| monster AIs and affixes | 31:100, 199, 284, 382, 572, 735, 804, 863; 31:1129 (plagued), 31:1166 (vortex pulls `ED.hero`); 33:321, 538, 575, 808, 954, 1177 | `m.target` |
| beast and boss patterns | 33:1099-1329 (one telegraph follows `h`, 33:1254); 36:151-1132 (12 patterns open with `const h = ED.hero`); `BOS_near` 36:49; `BOS_besideHero` 36:427; the vents' `prime` 36:1257; the boss AI 35:40-55 | `m.target`; a pattern that hits an area hits every hero in it |
| the Wardens | 32:53-56 | the mind sees and hears every hero; it alarms on the first |
| powder kegs and blasts | `blast()` hurts only `ED.hero` (45:25); keg credit (45:58); `heroHitAmount` on `ED.hero`'s weapon (45:73, 47:20); `MKA_hit` with `src: ED.hero` (46:28) | every hero in the radius; credit and scaling from the hero who struck it |
| level mechanics | wards (46:295-300); wind (46:596-597); leap hints (46:486-497); nests (46:988); the time well (47:112); darkness (47:246-253, `L0.MKB_hl`); the Blood Rush (47:414-436, `L0.MKB_rush`); launch pads (47:566-590); a thrown monster's crash (47:662) | for each hero in `ED.heroes`; per-hero state on the hero, not the level |
| floor effects | `worldStep` runs them only for `ED.hero` and the foes (90:57); themes wake by distance to `ED.hero` (51:402) | for every hero; the nearest hero |
| scenes | the boss wakes by distance (90:368); the exit and the portal react to one hero, and the portal saves one `ED.savedLevel` (90:371-378); the death panel (90:363, 420); the flow field (90:67); the camera (90:69) | any hero for the boss; per hero for the exit, portal and death (3.7); `ED.me` for the panel and camera; one field per hero |
| combat's single-hero spots | near-misses and the perfect dodge (10:219, 10:343, 20:176, 20:180); damage numbers pushed off `ED.hero` (10:96-99); ember, leech and life on hit or kill only when `e.src === ED.hero` (25:51-62, 40:618-620, 28:311, 408); `DEV.god && tgt === ED.hero` (10:106) | per hero (the hit's source or target); numbers off `ED.me`; god mode is the hero's own setting |
| powers and passives | `LOT_on` ×29, `LOT_tick` ×9, `LOT_drawFx` ×6 (41:65, 97-107); `PRG_on` ×8, which fires only when `h === ED.hero` (28:235). Some `LOT_on` powers never check `e.h`, so a second hero's dodge would fire the first's Dancer (41:218, 329, 338, 340) | each hero's hooks fire for that hero's events only; the wrappers pass the hero, and the event names it (`heroLevel`, `gold` and `pickup` carry a hero from now on, 20:70, 106; 40:539) |
| combos | stored on the skill's spec, `S.combo` and `S.comboEnd` (25:103-108; 25:141; 26:617; 22:359-362), with the resume check reading `ED.hero.dodgeT` (25:105) | on the hero: `h.combo[skill]` |
| executions | one `EXE.cur` and `EXE.told` (23:17, 96-104) | per hero |
| allies | the Echo and Dan's broodlings vanish when `owner !== ED.hero` (22:296, 27:717) | vanish when their owner leaves or dies |
| hard-coded | the Dan and Codex checks (22:265, 29:655); `SKM_hit` takes its angle from `ED.hero` (26:42); `SKS_fear` runs from `ED.hero` (27:133-140) | the caster |
| one-of state | `RUN` (60:562); `BOSS_SCARS` (35:64-65); `PRG_boomT` (28:341); `TIP_hold` (94:6); `RMB_` (97:8); `MON_R` (31:26); `MON_VX` (31:981) | per hero, or per client for presentation (`RUN`, tips, rumble) |
| experience, loot and pickup | every kill's experience to `ED.hero` (30:140); loot on its magic find (40:512); only it picks up (40:520-536, 41:1022) | section 8 |
| HUD, minimap, fog, tips, rumble, sound fades | 60:163-165, 247, 490; 94:8; 97:10-11; 56:37, 36:49, 47:112 | `ED.me`. The fog is revealed by every hero, so the party's map is shared. Sounds fade with distance to `ED.me`. |

### 5.4 Every hero reads a frame

**In a party, every hero reads `heroInput(h)`, the local one included.** It returns a frame input with the autopilot's
interface: `worldMove`, `aimAt`, `aimSource`, `padAim`, `down`, `pressed`, `released`, `consume`, `repeat`, and
`buffered` with a real window counted in ticks.
- It is fed from the hero's frame for the tick.
- The local hero reads its own frames too, so its world matches everyone's, and its replay matches its play.
- Outside a party nothing changes: `h.bot ? h.bot.input : game.input`.

**The client makes its frame from `game.input`, reading it as the hero does today:**
- the move through `view.screenDirToGround` (20:194);
- the mouse through `game.mouseGround()` (20:197);
- the pad's aim through the view (20:198).

Aim assist (20:201-202) stays in the world, with the hero's own setting, reading the world as it is at that tick, the
same on every screen.

**The direct reads of `game.input` that are about the hero go through the frame:**
- interact (23:103-104, 90:248, 90:295-296);
- the portal (90:361, 364, 436);
- holding Z, which gates auto-pickup (40:552);
- clicking a loot label (41:1021-1030), which becomes a command.

**A frame's presses are those since the previous frame,** so a press made during a hit-stop still counts. Today
`pressed()` loses it (F:2589, F:2604). The change is small, deterministic, and only for the better.

### 5.5 Menus send commands

**Every menu action that changes a hero becomes a command.**
- In single player a command runs at once, exactly as today: the functions stay as they are, and only the call goes
  through `heroCmd(id, args)`.
- In a party it rides in the hero's next frame and runs at that tick on every screen, so the panel shows the result
  D ticks later.
- Items are named by their `uid`, never by object.

| Panel | Commands |
| --- | --- |
| bag (I) | equip, unequip, swap worn slots, take, drop, sell (42:117-151, 187, 212) |
| skills (K) | rank up, set rune, assign to a slot (28:841-867, 1065-1067) |
| passives (P) | buy, undo, respec (28:583-605; 42:835-841) |
| stash | to and from the stash, wear from the stash, drop from the stash (42:952-989) |
| vendor | open (rolls the hero's stock), buy, sell, buy back, gamble (42:627-640) |
| smith and mystic | reforge, temper, enchant, transmute, imprint, salvage (42:590-600, 709-724, 809-833, 887) |
| waystone | travel to a depth (60:666-668) |
| death | leave to town, or retry (60:609-612) |
| a loot label | pick up (41:1021-1030) |
| emotes | an emote (9) |
| Settings | the hero's settings: aim assist, the loot filter |
| Settings > Tools | the hero's own tools: invulnerable, unlimited resources, no cooldowns, restore life, a level, points, every skill, an item, gold. The world's tools are in section 8. |

The autopilot's `botManage` (93:71-88) goes through the same commands.

## 6. Scaling: monsters' life and damage

**n** is the number of active heroes in the place. Arriving, away and dead heroes don't count.

| Factor | n = 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| monster life × (1 + 1.0 · (n − 1)) | 1 | 2 | 3 | 4 |
| monster damage × (1 + 0.5 · (n − 1)) | 1 | 1.5 | 2 | 2.5 |
| boss life × (1 + 1.0 · (n − 1)) | 1 | 2 | 3 | 4 |
| boss damage × (1 + 0.25 · (n − 1)) | 1 | 1.25 | 1.5 | 1.75 |

- **Where it applies:**
  - Life applies at spawn, in `spawnMonster`'s `hpK` (30:59). Bosses get there through `spawnBoss` (35:14), and nests
    use the same factor (46:954). When n changes at a tick, the living are rescaled keeping their share of life, as
    `setDiff` does (60:550). Boss phases trigger on that share (35:46), so they are unaffected.
  - Damage applies at hit time, at 10:119 beside `DIFF.foeDmg`, for hits whose source is a monster or a monster's
    effect (`hit.src.team === 'foe'`). A change of n counts at once. A monster's damage over time takes its power from
    the scaled hit (10:125), so the factor reaches it once, and `dot()` (05:54) is left alone.
- **Level hazards don't scale.** That is lava, keg blasts, geysers, quakes and steam (50:308, 45:25, 36:1283, 33:1411,
  47:896). They are the level, not monsters: most take a share of the hero's life, and the rest already grow with
  depth.
- **The packs are unchanged**, as the owner asked. Attack turns are per hero (5.2).
- **Why these defaults:**
  - n heroes deal about n times the damage, so life × n keeps a fight as long as solo.
  - A pack's attention splits between the heroes, but each hero still gets the solo number of attack turns. So a hero
    facing fewer monsters must take harder hits to feel the same pressure. Hence +50% per hero.
  - A boss already strikes one hero at a time at full strength. Its slam at × 2.5 would kill outright at four, hence
    +25%.
- **Calibration.** The defaults are a starting point, set in Phase 2 by balance runs.
  - `tools/ed-balance.mjs --party 2|4` plays one hero, then two or four autopilot heroes, on the same depths.
  - The target: co-op's clear time and deaths per depth within 15% of solo.
- **Knobs** go in `01-tune.js`, in a new Tuning section, Co-op:

  | Knob | Default | What it sets |
  | --- | --- | --- |
  | `coopLife` | 1 | monster life per extra hero |
  | `coopDmg` | 0.5 | monster damage per extra hero |
  | `coopBossLife` | 1 | boss life per extra hero |
  | `coopBossDmg` | 0.25 | boss damage per extra hero |
  | `coopShare` | 30 tiles | the experience and loot radius (8) |
  | `coopCount` | 0 | who counts: 0 the place, 1 the whole party (13.2) |

  Settings > Tuning lists them, and in a party they are the host's.

## 7. Making it feel lag free

### 7.1 The budget

D is `ceil((the largest one-way p95 + one tick + 2 ms) / 8.33 ms)`. The table's round trips are typical values, not
measurements; Phase 3 measures them, and the owner's devices decide.

| Where the players are | Round trip | Delay D | Walking and turning (with the lead) | Skills, dodges and the world's answer |
| --- | --- | --- | --- | --- |
| alone in a place | none | 0 | 0 | 0, single player |
| the same Wi-Fi | about 3 ms | 2 ticks, 17 ms | 0 | 17 ms |
| the same city | 15 to 25 ms | 4 ticks, 33 ms | 0 | 33 ms |
| the same country | 50 to 70 ms | 6 to 8 ticks, 50 to 67 ms | 0 | 50 to 67 ms |
| a phone on 4G or 5G | 40 to 70 ms, jittery | 7 to 10 ticks, 58 to 83 ms | 0 | 58 to 83 ms |
| across an ocean | 120 to 180 ms | 11 to 14 ticks, about 100 ms | 0 | about 100 ms |
| through the relay | plus the detour | 1 to 4 ticks more | 0 | 10 to 35 ms more |

- **Against a server that runs the world:** the server lets your own action start at once, but the world answers your
  hit a round trip plus a buffer later, 110 to 160 ms across a country. Lockstep answers in D, 50 to 67 ms there.
- **Phase 0** finds the delay at which the owner stops calling it lag free.

### 7.2 Keeping the delay small

- **Direct connections first;** the relay only when ICE fails (11).
- **Unordered frames with no retransmits, and redundancy in every packet.** A lost packet costs nothing. A retransmit
  would cost a round trip.
- **Send as soon as the frame is made,** inside the same animation frame, not on a timer.
- **The delay follows the network.** The leader measures continuously and moves D one tick at a time. It goes down as
  readily as up.
- **No needless frames.** A client whose page can't keep up is the slow member, not a stall for everyone: its frames
  come from its input sampling, not from its world's progress, so it only falls behind on what it sees.
- **The local hero's own sampling is never delayed:** the frame is stamped `now + D` the moment the input is read.

### 7.3 The lead: walking and turning at once

- **What it does.** The local hero is drawn where it will be once its pending frames apply. It is integrated from
  those frames, with the hero's own speed and acceleration (20:274-275) and collision with the level's walls. It is
  not drawn where the world has it, D ticks behind.
  - The camera follows the drawn hero.
  - Facing turns to the aim at once.
- **What it leaves out.** Monsters pushing the hero, knockback, ice, wind and launches. The difference blends out over
  about 100 ms.
- **Actions are not drawn ahead.** A dodge or a skill starts when the world starts it, with its invulnerability, so
  what you see is what counts. When an action starts, the offset eases to zero.
- **The cost of the mismatch is small.** At 60 ms the lead is about 5 units (2.3), a third of a tile. A monster's swing
  that lands just as you walk out of it may still hit; with the telegraphs Emberdeep gives every attack, that window is
  small.
- **The lead is presentation only.** Nothing in the world reads it. Settings > Interface can turn it off.

### 7.4 Hit-stop, slow motion and menus in a shared place

**Alone in a place, all of these behave as today.** A joiner's replay reproduces them, because Phase 1 puts slow motion
on the step clock. **When a second hero arrives, at that tick:**

| Today | In a shared place |
| --- | --- |
| hit-stop freezes the world (`game.freeze`, 10:54-62; F:2604) | Only hits by or on `ED.me` hold this client's screen, up to 60 ms, and it then catches up at 1.25×. The world never stops. The engine's `P.explosion` freeze (F:1451) is called with `freeze: false`, and Emberdeep decides. |
| slow motion for a pack's last kill, an execution, a boss's fall, the hero's death (10:142, 23:80, 35:70, 36:1179, 20:148) | Presentation only, for the player whose moment it is: the flash, the push-in and the sound. Their screen may run up to 150 ms behind the world and catch up at no more than 1.3×. A boss's fall plays for everyone in the place. |
| the perfect dodge: the world slows and the dodger keeps pace ("witch time", 20:162, 209-211) | The monsters within 6 tiles of the dodger slow to 0.35 on their own clocks (`m.timeK`, as a time well does, 30:300), for the same 1.1 s. The dodger keeps the free hits; nobody else's world slows. |
| a panel stops the world (60:61, 90:360); losing focus opens the pause panel (61:526-535) | The world runs under every panel. The hero holds still while a panel is open, and the frame carries a flag that shows a small book over its head. Losing focus doesn't open the pause panel; the page going hidden makes the client away (3.8). |
| the pause menu pauses | It opens over the running world, with its usual items plus Party (the members and the code). Save and quit becomes Leave party and quit. |
| Settings > Tools: pause, step, speed, frozen AI | Only alone in a place, where they work as today. In a shared place they are greyed out. |

The tips (94) wait as now, on this client's screen.

### 7.5 Stalls

- **A stall** is a member's frame late past D. The world holds. The local hero's lead may grow to 150 ms of walking,
  then stops.
- **Stall rates.** Under the test's conditions (60 ± 20 ms with 2% loss), stalls should come less than once a minute,
  and the delay adapts until they do. A stall over 250 ms shows "waiting for <name>".
- **After a stall,** the world catches up at up to 4 ticks a step, never one big jump. Once rigs are presentation
  (section 4, item 4), they are not posed for the ticks it skips over.

## 8. The rest of single player, in co-op

| In single player | In co-op |
| --- | --- |
| every kill's experience goes to the hero (30:140) | Every living hero within `coopShare` of the kill gets it in full, with their own bonuses (`gainXp`, 20:61-75). |
| loot is rolled once, on the hero's magic and gold find (40:512-516) | It is rolled for each hero within `coopShare`, on their own find. Each drop is that hero's: only its owner sees it and picks it up (40:520-536, 41:1021-1030). Rolled in the world, the drops are the same on every screen; they are drawn only for their owner. |
| gold, potions, the boss chest, the Warden's tithe, nests, the Hoarder (36:893-900; 32:43-48; 46:972-977; 41:351-356) | The same, one for each hero, personal. |
| death: 10% of gold, back to town or the retry depth (60:609-612) | The same. The hero leaves the place (3.7). |
| boss scars, in memory (35:18-20, 64-65) | On the hero. A waking boss takes the most scars among the heroes in the place. |
| the level card, tips, the level clock and best times (`h.best`) | Each player's own, on their own screen. |
| `maxDepth`, `seenMech`, visits, the waystone's depths | The hero's own: as long as they can get there. |
| saves (90:11-12) | Each player saves their own hero, at the same moments as today, and never anyone else's. |
| Difficulty, Tuning, `?mechs=` | The host's, for the whole party. |
| Settings > Tools: spawn monsters, clear them, reveal the map | World commands from any member, in their frames. Logged, and replayed with the place. |
| the Proving Grounds | A shared place: the waves come for the party. |
| hero against hero | Heroes don't hurt each other and don't block each other: they pass through, and only the separation that keeps sprites apart remains. Kegs and blasts hurt every hero in range, as they hurt the one today. |

## 9. Emotes and pings

**Emotes are commands.** They run in the world, so everyone in the place sees the same animation at the same tick.

- **The wheel.**
  - Keyboard: hold C, then point with the mouse, or press 1 to 8.
  - Pad: every button is taken today (00:32-41), and the d-pad repeats the left stick's movement. So in a party the
    d-pad becomes co-op's: up pings, down opens the wheel (point with the right stick), and left and right are quick
    emotes (wave, cheer). A player who moves with the d-pad rebinds them in Settings > Controls.
  - Touch: a button that opens a small wheel.
- **The emotes.** Wave, cheer, point (at the aim), bow, kneel, hands on hips, a salute, and a dance. The first six come
  from the rig's poses (cheer, wave, kneel, hips, guard) and `E.MOVES`.
  - The bow and the dance are new procedural animations, in the brief's spirit: show every animation the engine can do
    and invent new ones. Both are driven by continuous values, as `DESIGN.md` requires.
  - Each character declares its emotes in its spec, falling back to the body contract's states (`docs/CHARACTERS.md`),
    so the Codex and Dan have theirs.
- **Moving, a skill, a dodge or a hit ends an emote.** They also work in town (3.1).

**Pings are presentation.** They go on the control channel to the place's members (or the town's), in world
coordinates, and are not part of the world.

- **Making one:**
  - Tap G, or click the middle mouse button: a ping at the cursor. Over a monster it is an *enemy* ping that follows
    it, by the monster's `uid`, which is the same on every screen; anywhere else it is *go here*.
  - Hold G for the wheel: go here, enemy, danger, help (on yourself).
- **Map pings.** Hold Tab and click or tap the big map, or press A on a pad at its cursor. That makes a go here at
  that point.
- **What it shows:**
  - a ring on the ground in the pinger's color;
  - a marker at the screen's edge when it is off screen (`r.marker`);
  - a blip on the minimap and the big map;
  - a short sound for each kind.
- **Limits.** A ping lasts 4 s. An enemy ping lasts until that monster dies, or 8 s. Each player may ping three times
  in 2 s.
- **Settings > Co-op** mutes other players' pings.

## 10. What the player sees

- **The title** gets a CO-OP item:
  - HOST A PARTY shows a six-character code, a link and a share button.
  - JOIN A PARTY takes a code.
  - Your name, and your character as today.

  A link with `?party=CODE` opens straight into joining. A party starts in Emberhold.
- **The HUD:**
  - The party frames, at the left: each other member's color, name, character, level and location (Depth 12,
    Emberhold, the Gallery). In the same place they also show life. Away, dead and joining each have a glyph.
  - Name tags over the other heroes, in their colors, and a faint ring under each.
  - Party members as dots on the minimap and the big map.
  - Markers at the screen's edge for members in the same place (off by default).
  - The party's feed, in the top column of the notices: reached level 12, entered The Molten Throne, fell on depth 9.
  - The delay and stalls in the frame-rate overlay.
- **Settings > Co-op:**
  - your name, name tags, the lead, other players' pings;
  - for the host: the party's options (13.6, 13.7) and the Co-op tuning knobs.

  Help lists the keys for pings and emotes.
- **The machine interface** (principle 2):
  - `window.__ed.coop`: `host()`, `join(code)`, `leave()`, `status()` (members, places, D, stalls, hashes),
    `netsim({ delay, jitter, loss })`, `log()`, `report()`, `ping(kind, x, y)`, `emote(id)`, and `companions(n)`
    (Phase 2);
  - the links `?party=`, `?name=` and `?netsim=60,20,2`.
- **The owner's first test of two devices on the same Wi-Fi needs no server: codes by hand.**
  - The host shows a code, a compressed WebRTC offer; the joiner pastes it and shows an answer, which the host pastes.
  - With more than two players in this mode, the host passes frames between the others.

## 11. The relay and the connections

- **The relay's job.**
  - Rooms by party code: up to four members, each room ending 10 minutes after its last member leaves.
  - It passes WebRTC offers, answers and candidates between a room's members.
  - It carries game traffic only between members who couldn't connect directly.
  - It holds nothing else: no game, no saves, no logs.
- **The protocol.** JSON text messages for control, binary ones for relayed traffic:
  - `hello {party, build, name}` is answered by `welcome {you, members}`;
  - then `joined` / `left`, `signal {to, data}` and `relay {to, bytes}`.
- **Limits:** 4 members a room, 64 KB a message, about 200 messages a second per member, and codes from 31
  unambiguous letters and digits (6 characters, about 887 million codes).
- **Two implementations, one room module** (`tools/coop-room.mjs`), so they can't drift apart:
  - `tools/coop-relay.mjs`, in Node, for development and the tests. It is the reference.
  - A Cloudflare Worker with one Durable Object per room, ready to deploy (section 12).
- **STUN.** Public STUN servers, configurable. **TURN** is not needed while the relay carries what direct connections
  can't; add it if the relay's detour proves too slow.
- **Builds must match.** A party is one build: the code carries the host's version and build. A joiner on another
  build is told to open the host's link, which serves the host's build.
- **Privacy:**
  - Direct connections show each player's IP address to the others in the party, as in every peer-to-peer game.
  - The relay sees addresses and passes traffic, and stores neither.
  - The alternative, everything through the relay, is question 13.5.

## 12. The doctrine: deviations and escalation

- **The network.**
  - `CLAUDE.md`'s house rule is "no network" for the engine and the games. Co-op can't keep it.
  - It is a reversible call: made in its own commit when Phase 3 lands, logged in `docs/DECISIONS.md` and flagged in
    the pull request.
  - Its bounds:
    - nothing touches the network until a player hosts or joins;
    - single player stays offline;
    - the page still loads nothing from the network: no scripts, no assets;
    - the only connections are to the party's members, STUN, and the relay.
- **Putting the relay online is hard to undo** (an account, a public service, perhaps money).
  - It is escalated (question 13.4) by D11's procedure: a 15-minute wake-up when the work reaches that point, with the
    recommendation.
  - Without an answer, everything is built and tested against the local relay and with codes by hand. Deploying waits:
    it needs the owner's account in any case.
- **Principle 5** gets stronger. Phase 1 supersedes part of D4: Emberdeep's `Math.random` is routed between the world's
  and the screen's streams. The 968 sites stay as written.
- **Principle 6.** Phase 1 makes Emberdeep's world independent of its drawing, which the principle's proof requires.
- **Principle 7.**
  - WebRTC data channels, lockstep with a delay (the pattern of RTS games, Factorio and GGPO's delay mode) and a
    WebSocket relay are standard patterns.
  - There is no dependency in the engine or the game.
  - The local relay may use `ws` (a dev dependency, logged), the common choice for a WebSocket server in Node.
- **Principles 2 and 3.**
  - Every co-op feature has a machine interface (10).
  - Every co-op feature runs headless: pages joined by real connections, with the network's conditions added on
    purpose (14). The lockstep runner is also tested in Node, with two headless engine games.
- **Budgets.** `docs/COOP.md` is a new card with a budget of 3,000 that `doctrine-check` counts. API.md gets one line,
  and the index gets the public names.

## 13. Questions for the owner

Each has a recommendation, which the work follows until the owner answers.

1. **Phase 0's verdict.** At which delay does Emberdeep stop feeling lag free, with the lead and without it?
   - Up to 60 ms with the lead feels fine: the plan stands.
   - Only up to 30 ms feels fine: lockstep is kept for players on one network or in one city, and the escape hatch
     (3.3, last column) is planned before Phase 5.
   - No delay is acceptable: the escape hatch replaces Phase 5, and Phases 1 to 4 stand.

   Phases 1 and 2 don't wait for the answer.
2. **Who counts for scaling: the heroes in the same place (recommended), or the whole party?**
   - The brief says "the number of players in the game".
   - With players spread over the depths, counting the party would give a player exploring alone monsters built for
     four, which is not the same single-player experience.
   - It is the knob `coopCount`, so either is one setting.
3. **The scaling's defaults (6):** life +100% and damage +50% per extra hero; bosses +100% and +25%. They are set by
   balance runs in Phase 2 and tuned by playing.
4. **Where the relay runs.** This is hard to undo, so it waits for an answer.
   - Recommended: a Cloudflare Worker with Durable Objects, on the owner's account. The traffic is small and it sits
     close to the players. The pricing is to check before deploying.
   - The alternatives: a small Node server running `tools/coop-relay.mjs` (Fly.io, Render, a VPS); or no relay at all,
     with codes by hand and players on one network.
5. **Direct connections (recommended), or everything through the relay?** Direct is faster but shows each player's IP
   address to the party. The relay hides it and adds its detour.
6. **May party members walk into each other's town portals?** Recommended yes: it is a way to get there, as in Diablo.
7. **Rewards: personal loot and experience shared within about a screen (`coopShare`)?** Recommended yes. The
   alternative is shared drops that anyone may pick up.
8. **Names: typed (up to 12 letters, digits and spaces), or automatic ("Wanderer", "Codex 2")?** Recommended typed and
   optional. A name isn't chat, but it is text players choose.
9. **Phase 8, snapshots: build only if a typical join takes more than 10 s on the owner's phone?** Recommended yes.

## 14. Tests and measures

| Test | What it proves | Phase |
| --- | --- | --- |
| `tools/world-test.mjs` | One run, recorded as frames, gives the same world hash every 60 ticks on pages that differ in every way section 4 names, for 10 minutes on depths 1, 5, 9, 15 and 40. | 1 |
| `determinism-test` (a new case) | Emberdeep drawn at 60 Hz and at 144 Hz gives the same world. | 1 |
| `replay-test`, `determinism-test`, the `ed-*` suites | Single player still plays and replays exactly, with filmstrips differing only where randomness changed streams (`filmstrip --compare`). | every phase |
| companions | Four autopilot heroes on depths 1 to 20 with no errors, and no strict-guard reads (5.1). | 2 |
| `tools/ed-balance.mjs --party 2,4` | Co-op's clear time and deaths per depth within 15% of solo. | 2 |
| frames in single player | A single-player run's frames, played back through frame inputs, give the run's own world hash: the frame path matches today's input (5.4). | 2 |
| contract test: lockstep in Node | Two headless starter games in lockstep over the test transport (60 ± 20 ms, 2% loss) end with the same hash, and a third that joins midway catches up. | 3 |
| `tools/coop-test.mjs` | 2 to 4 headless pages, each with the autopilot, joined by real WebRTC channels through the local relay, with delay, jitter and loss added. Its scenarios are in the list below. | 3 to 6 |
| `test:phone` | The party frames, the CO-OP menu, the emote wheel and pings on a phone layout. | 3, 6 |

`coop-test`'s scenarios:
- four members in one depth for 30 minutes;
- split between town and two depths, with moves between them;
- joining a place two minutes old;
- the portal round trip while others stay inside;
- away (a hidden page) and back;
- the leader quitting, then the host quitting;
- one member drawn at 60 Hz and another at 144 Hz, one at phone size;
- a deliberately broken client, which must be caught, reported and rejoined.

It checks the same hash in every place at every check, no errors, stalls per minute, the delay's distribution, join
time against the place's age, and bandwidth per member.

**Measures for each pull request:**
- the step cost with portable math on (Phase 1);
- the delay's median and 95th percentile, and stalls per minute, for each network condition;
- join times against a place's age, here and on the owner's phone;
- bandwidth;
- desyncs, whose target is zero.

**The owner's checks:**
- Phase 0: the feel, on the phone.
- Phase 2: companions, on the phone.
- Phase 3: two devices on the same Wi-Fi, codes by hand.
- Phase 7: over the internet, once the relay is up.
- Phase 6: emotes and pings.

`tools/test-run.mjs` runs `world-test` and `coop-test` when the engine, Emberdeep or the co-op tools change.

## 15. The phases

### Phase 0: feel the delay (a Temporary lab, no version bump)

- **The page.** `examples/coop-feel.html` (`/coop-feel`): Emberdeep with one more script, `src/coop-feel/feel.js`,
  inlined after the game.
- **What the script does** (a prototype, which may reach past the API):
  - It drives the hero through the autopilot's input with `manual: true`, as the Gallery does (93:199-200,
    92:155-203).
  - It feeds that input from `game.input`, D ticks late: the move through the view, the aim through `mouseGround()`,
    and the presses.
  - It adds jitter, and stalls when the jitter passes D, by freezing the world for the late ticks, as a real stall
    would.
  - It can draw the hero ahead: the lead, offsetting the hero and the camera around the scene's draw.
- **Its controls.** An overlay names the delay, the jitter and the lead. A key (F8) and a touch button cycle through:
  no delay, 17, 33, 58, 100 and 150 ms, then 58 ms with the lead, then 58 ms with 30 ms of jitter.
- **Its `labs.json` entry** (Temporary, dated) has links to each, and:
  - the question: "How much input delay can Emberdeep take before it stops feeling lag free, and does drawing the hero
    ahead hide it?";
  - deviates: "reaches into the game through `window.__ed` and the autopilot's input (principle 8)".
- **Done when** the owner has played it on their phone and answered question 13.1.

### Phase 1: one world on every screen (the next minor version)

- **Engine:**
  - the world's and the screen's random streams, with `Math.random` routed by phase, and particles on the screen's
    stream;
  - rig hands and tips that don't depend on drawing;
  - a public step clock;
  - the hook that lets a runner own `game.time` and the timers;
  - portable math that can be switched on outside a session.
- **Emberdeep:**
  - section 4, items 1 to 17;
  - `ED.worldHash()`;
  - `rnd` from the world's stream;
  - composed bosses by seed.
- **Tools:** `tools/world-test.mjs`, a 144 Hz case in `determinism-test`, and the test selection.
- **Docs:** a decision superseding part of D4.
- **Done when:**
  - `world-test` passes;
  - every existing suite passes;
  - single player plays as before;
  - the pull request reports the step cost with portable math on.

### Phase 2: more than one hero (the next minor version)

- **Emberdeep:**
  - `ED.heroes` and `ED.me`, and the strict guard (5.1);
  - targets, attack turns and flow fields per hero (5.2);
  - the conversions in 5.3;
  - frame inputs for every hero (5.4) and commands (5.5);
  - scaling, its knobs and its Tuning section (6);
  - experience and personal loot per hero (8).
- **Companions,** with no network: Settings > Tools adds up to three heroes to your game, any characters, each driven
  by the autopilot. The owner sees four heroes and the scaled monsters on the phone, and `__ed.coop.companions(n)`
  does the same.
- **Tools:** `ed-balance.mjs --party`, and the defaults in 6 set by it.
- **Done when:**
  - four companions play depths 1 to 20 headless with no errors;
  - the strict guard reports nothing;
  - the balance runs are within 15% of solo;
  - single player is unchanged.

### Phase 3: the network: a party, the town, the depths (the next minor version)

- **Engine:**
  - `E.net`: party codes, the relay's client, WebRTC peers with the two channels, the relay as fallback, codes by
    hand, and a test transport that adds delay, jitter and loss.
  - `E.Lockstep`: frames, the delay, stalls, control events, away, logs, hashes and catch-up by replay. It is generic:
    a game gives it `sample()`, `step(frames)`, `hash()` and its arrival hooks.
  - `docs/COOP.md`, one line in API.md, and the index.
- **Tools:**
  - `tools/coop-room.mjs` and `tools/coop-relay.mjs`;
  - the Worker, written but not deployed;
  - `tools/coop-test.mjs`;
  - the Node contract test.
- **Emberdeep:**
  - the CO-OP menu (host, join, link);
  - the town as each player's own, with the others in it (3.1);
  - depths and the Proving Grounds as places, joined by replay (3.6);
  - moving by the exit, the waystone and death (3.7);
  - the rules of a shared place (7.4);
  - scaling by the place;
  - names, colors and the party frames.
- **Docs:** the decision on the network (12).
- **Done when:**
  - `coop-test` runs 30 minutes with four members in one depth and with members split across places, with zero
    desyncs;
  - the owner has played on two devices on the same Wi-Fi;
  - join times are measured.

### Phase 4: anywhere, anytime (the next minor version)

- the town portal in co-op: suspended places, friends' portals, resuming with a fast-forward (3.7);
- away and back; leader and host taking over; reconnecting (3.8);
- desync reports and `replay.mjs --place` and `--bisect` (3.9);
- the rest of section 10: the feed, the minimap and big map, name tags, markers, Settings > Co-op, Help, `__ed.coop`
  in full.

**Done when** every `coop-test` scenario passes.

### Phase 5: lag free (the next minor version)

- the lead (7.3);
- the adaptive delay and frame advantage tuned (7.2);
- presentation hit-stop and catch-up (7.4);
- stall handling (7.5);
- the delay and stalls in the overlay;
- `?netsim=` for the owner to try conditions.

The escape hatch replaces or joins this phase if 13.1 says so.

**Done when** the measures in 14 meet 7.1's budget under the test's conditions.

Phases 5 and 6 may swap.

### Phase 6: emotes and pings (the next minor version)

- section 9: the wheel, eight emotes with the bow and the dance, pings, map pings, markers, sounds and limits;
- the characters' emote specs, with `npm run character:check` for each character.

### Phase 7: the relay online (a patch; needs the owner's answer to 13.4)

- deploy;
- set the relay's address and the STUN servers;
- the owner and a second player test across the internet, on phones.

### Phase 8: instant joins (only if 13.9's condition holds)

**Snapshots: the world serializable.** The world's state is closures in many places:
- things (`addThing` with `update`, `draw` and `onHit`);
- `FX.visual`, the hero's actions (`startAction(h, { update })`), attacks' `onActive`;
- `BUS.on(..., 'level')` listeners, world timers, monsters' `onDie`, `onBeforeHit` and minds;
- rigs and bodies.

Each becomes data plus a registered behavior, and the engine's rigs gain save and load. The test: snapshot,
restore, continue; the hash equals the run that didn't stop.

It is large, about the size of Phases 1 and 2. The plan for it gets written when the measurements ask for it.

### Phase 9: fold this plan in (a patch)

- `docs/COOP.md` gets what lasts;
- `src/emberdeep/DESIGN.md` gets a co-op section and its place in "Where everything is: the menus";
- `README.md` gets a line;
- `docs/DECISIONS.md` keeps the decisions;
- this file is deleted.

## 16. Traps, and what is out of scope

**Traps:**
- **Anything in world code that reads the screen.** That is:
  - the camera, the view, the zoom or the screen's size (`game.view`, `isVisible`, `r.visible`,
    `game.mouseGround()`);
  - `ED.me` or `ED.hero`;
  - an `OPT` setting;
  - the HUD's layout.

  Even one makes a desync: `world-test` exists to find them.
- **Randomness drawn only when a local condition holds:** the particle list is full, numbers are on, the monster is on
  screen.
- **The engine's clock in world code:** `game.after`, `game.time`, `game.real`, `performance.now`.
- **A menu that changes the hero directly** instead of sending a command.
- **Drawing that changes state:** the portal's `pt.t += 1 / 60` was one.
- **Locale-dependent anything** (`localeCompare`, `toLocaleString`) in what the world reads.
- **Iterating a `Set` or `Map` built in an order that differs between clients,** such as one filled from UI events.
- **A hidden page stops drawing and sending.**
  - On iOS, Safari suspends the page and soon its connections: away handling covers it.
  - Audio must be unlocked on each device: the joiner's first tap does it.
- **A hero arriving in a place is its save** (`SAVE_KEYS`, 90:11-12) plus what crosses places in single player. Each
  level entry revives the hero (90:331-355), so that is little. Never send live objects.
- **Scene changes clear the engine's timers** (F:2566), and fades freeze the old scene (F:2593). World timers belong to
  their place.
- **A composed boss registered in a way that depends on what the page did before.**
- **Logs only grow while a place lives.** Drop the log of a place nobody holds.

**Out of scope:**
- voice and text chat;
- harm between players;
- trading items;
- more than four players;
- matchmaking with strangers;
- spectators;
- play across builds;
- anti-cheat;
- characters kept on a server (saves stay on each device);
- co-op in the kits and starters (the engine's lockstep makes it possible later);
- playing while the page is hidden.

## 17. Effort and the prompt

**Run each phase at extra (xhigh) effort.** Like the asset store's plan, this is engine and game work where a subtle
mistake (a desync, a lost determinism) costs more than the time to get it right. Phase 0 is small and can run at high.

The prompt, for each phase:

```
Read CLAUDE.md, DOCTRINE.md and src/emberdeep/DESIGN.md, then docs/HANDOFF-COOP.md. Implement Phase <N> exactly as
it says, on one branch and in one pull request, with the next minor version (Phase 0 takes none; 7 and 9 a patch).
Before writing code, check the facts it relies on against the code (line numbers are as of v0.46.1; search by name)
and fix the plan where it is wrong, in the same pull request. Keep single player exactly as it plays today: every suite passes, and filmstrips
change only where the phase says. Add the tests the phase names and make them pass. When you are done, update section
19 of the plan (what landed, the version and commit, what you measured, anything left over), and report the measures
in the pull request.
```

## 18. Done means

- Four people on four devices, each with their own character, play together over the internet.
- Each goes anywhere they can get to, and joins anyone, without waiting on anyone.
- Alone in a place it is single player exactly; in a place together it is single player with friends:
  - the monsters as many as ever, tougher by the knobs in 6;
  - personal loot;
  - emotes, pings and map pings;
  - walking that answers at once, and everything else within 7.1's budget.
- The soak tests run with zero desyncs.
- A desync, if one ever happens, comes with a report that `tools/replay.mjs` reproduces headless.
- Single player is unchanged, and its replays work with any view and settings.

## 19. Progress

| Phase | State | Version and commit | Notes |
| --- | --- | --- | --- |
| this plan | written; on hold (TBD) | v0.46.2 | the facts from five audits of v0.46.1 and three measurements (2.3) |
| 0 feel the delay | not started | | |
| 1 one world on every screen | not started | | |
| 2 more than one hero | not started | | |
| 3 the network | not started | | |
| 4 anywhere, anytime | not started | | |
| 5 lag free | not started | | |
| 6 emotes and pings | not started | | |
| 7 the relay online | waits on 13.4 | | |
| 8 instant joins | only if 13.9's condition holds | | |
| 9 fold this plan in | not started | | |
