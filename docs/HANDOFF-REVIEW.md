# Handoff: the owner's review pass after the genre plan

> **Status (2026-10-29, at v0.84.1):** parts 2 to 5, an agent's, have landed (in the order 5, 2, 4, 3, as the owner
> said); parts 1 and 6, the owner's, are what is left.

What the genre plan (`docs/HANDOFF-GENRES.md`, folded in at v0.81.2 and, after a last version with M16's row, at
v0.81.5; its rules now in `docs/KITS.md`, its full text in `git show 24aee29:docs/HANDOFF-GENRES.md`) left for the
owner. The plan built what each milestone needed and deferred the trimming to a review after the owner had played the
kits (the owner's word, 2026-10-28). It is temporary: when a part lands, its line goes; when none is left, this file
goes.

**In short.** Only the owner can do what is left, parts 1 and 6: play the kits, and read the calls made without them.
(Part 5, a fix to `r.pick`, landed in v0.81.7; part 2, the budgets, in v0.82.0: D69 to D71; part 4, the CRAWLER and
SPORTS kits, in v0.83.0 and v0.84.0; part 3, the benchmark's era briefs, run in v0.84.1: F7 in `docs/FEEDBACK-LOG.md`.)

## 1. Play the kits (only the owner)

The Labs page's **To check** section holds 25 cards, each saying what to do and what to look for. Most want a phone or
a second player. A card goes once checked; what the owner wants changed becomes a plan or a fix.
- **2D kits:** Roguelike on your phone; Puzzle (how the blocks handle, and versus); Arcade (the three classics);
  Shooter (the horizontal stage); Brawler with a friend; Fighting (Street Fighter); Metroidvania (Super Metroid); Kart
  (Super Mario Kart); Road (OutRun); RPG (Dragon Quest, Final Fantasy); Tactics (Final Fantasy Tactics, Fire Emblem);
  RTS (Warcraft II, StarCraft); Sim (Theme Park); Point-and-click (Monkey Island); Pinball (Pinball Fantasies); Artillery
  (Worms); Rhythm (Dance Dance Revolution, PaRappa); Stealth's music (the chase's layers); Sports (Sensible Soccer, NBA
  Jam: with friends).
- **3D kits:** Horror (Resident Evil, Alone in the Dark); 3D Action's lock-on (Zelda); Racing (Mario Kart 64); Flight
  (Star Fox 64); Crawler (Eye of the Beholder, Dungeon Master: real time and turns).
- **The Vehicle Lab** (Labs, Temporary, `/vehicle-lab`): drive both karts (Tab switches) to settle D62. B is what
  `world.vehicle` does (a rolling body, arcade handling); A is Rapier's ray-cast vehicle on springs. If B, the lab goes;
  if A's weight is worth having, that becomes a plan.

## 6. Calls made without the owner, to read (each reversible: a revert undoes it)

Logged in `docs/DECISIONS.md` and flagged in their pull requests (v0.79.0 to v0.83.0):
- **D60:** the 3D engine's manual allowed 8,000 tokens (it is at 6,807). **D61:** the 3D horror kit's budget, 256,000.
- **D62:** the 3D engine's vehicles are a rolling body with arcade handling, not Rapier's ray-cast vehicle. Settle it in
  the Vehicle Lab (part 1).
- **D63, D64:** the 3D kits' budgets raised, because every 3D kit carries the whole 3D engine; D70 put the four that
  never drive or fly back under their old budgets.
- **D72 (v0.83.0):** the 3D CRAWLER kit's budget, 250,000.
- **D69 to D71 (v0.82.0, the budgets):** the 2D kits' 200,000 back, with six (RPG, SHOOTER, ADVENTURE, SIM, RTS,
  BRAWLER) keeping budgets of their own; the 3D kits' budgets back from D63 by a 3D diet; a kit's card keeping its own
  genre's playbook rows and modules.
- **D65, D68:** the genre plan folded into `docs/KITS.md` and this file, and back for one version to carry its M16 row.
- **D66:** the era briefs' runs skipped, with no answer in fifteen minutes; run after all on the owner's yes (F7,
  v0.84.1).
- **D67 (v0.81.3, #191):** the music clock now meets the sound at once when it is more than 10 ms off for two frames
  running (it smoothed anything under 100 ms, so a slip took 9 to 14 frames to meet). The audio suite's clock check now
  allows the sound past 10 ms only in stretches of at most 6 frames, in under 1% of the frames, whatever began them. It
  had excused only the frames after the sound device's slips, and failed in a slow container. This is an engine change
  and a change to what a check measures, so it is the one to read first.
