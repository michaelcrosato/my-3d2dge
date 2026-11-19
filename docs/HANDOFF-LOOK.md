# Handoff: the look's remainder (figures that merge, empty fields)

> **Status (2026-11-19, at v0.108.5):** written by part A1 of `docs/HANDOFF-FINISH.md`, which found the feedback log's
> theme "The look's remainder" reached and not yet taken up. Nothing in it has started; it is carried out after A3 of
> that plan. It is temporary: when its last phase lands, the theme's row says **taken up** and in which version, and
> this file goes.

## Why now

`docs/FEEDBACK-LOG.md` keeps two points of the look that the plan which took up "The look below the PS1/N64 bar"
(`docs/HANDOFF-NEXT.md`, v0.51.5 to v0.59.1) left: small figures that merge when they overlap (F4.2) and empty fields
(F6.2). Their row (2026-10-21) waited for "a source after v0.59.0" that still saw them. F7 (2026-10-29, the benchmark's
five era briefs on v0.84.0) did: the kart's empty fields and the tactics map's units that overlap (F7.2), and marked
the theme reached, for the next plan to take up. None did (the genre review, the cc-matrix plan, the Mode 7 kits, the
controls standard). The log's rule: the next plan takes it up **and decides again**. This is that plan.

## What the engine and the kits do today

Checked at v0.108.5, with screenshots of the kits and of a page of small figures side by side:
- **Outlines.** Every actor (`r.actor`: a rig, or anything drawn through it) gets a 1-pixel outline (`r.outline`,
  `#140c1c`) round what it draws, so one drawn in front of another is cut from it by a dark line. A sprite
  (`r.sprite`) gets none unless asked (`outline: true`): small figures drawn as sprites merge where they overlap.
- **The kits don't show either point.** TACTICS draws its units as Humanoids through `r.actor`, each with its own
  palette: neighbours a cell apart read apart (its opening, in iso). KART dresses its open ground: striped grass, sand,
  rows of trees past the barriers, mountains and clouds over the horizon. Outlined rigs a cell apart (16 units) read
  apart in iso; half a cell apart (8) they crowd, as they would in any game.
- **What a builder had then and has now.** F7's runs (v0.84.0) had no kit to start from: the package carried none
  (F7.3). Since v0.85.0 (D73) it carries every kit, readable, so a builder starts from a dressed slice. But nothing
  tells them to keep it dressed: the card's look target asks for characters 40 to 60 px tall and 3 to 8 props a screen,
  and says nothing of units their genre keeps small (tactics, strategy, a crowd) or of open ground (a track's fields,
  an overworld). That is where F7's two points were.

## The decision

No engine change: the outline, the palettes and the dressing exist, and the kits use them. What builders lack is the
rule and the example, where they read before drawing: the API card's **Look target** (and the guide's "Visual craft",
which follows it). One phase, docs only.

## The phase

After A3 of `docs/HANDOFF-FINISH.md`, one pull request under `CLAUDE.md` (a patch: docs):
1. **The look target, two lines** (`API.md`'s Look target, and `AI_GUIDE.md`'s Visual craft):
   - small units (tactics, strategy, a crowd) stay readable where they overlap: rigs through `r.actor` (outlined),
     sprites with `{ outline: true }`, a palette for each side; the TACTICS slice is the example;
   - open ground is dressed like a room: a field's stripes or texture, rows of trees and props past its edges, a
     backdrop over its horizon; the KART slice is the example (its trees, its stripes, its sky).
2. **Check:** `npm run test:contract` and `npm run test:agent` (the card's examples and its links), and the card's size
   against its soft budget (D98: say in the pull request what the lines took past it).
3. **Close the theme:** the feedback log's row says **taken up**, in that version, with this decision; a later source on
   it counts afresh. Then this file goes, with its line in `docs/HANDOFF-FINISH.md`.

## Out of scope

- Running the benchmark again to score the change: a run costs money and waits on the owner (D19).
- An engine default that outlines every sprite: sprites are coins, bullets and icons as often as figures, and the
  outline is already one option away.
