# Languages: a game in the player's own language

my-3D2dge follows **AI Hub Languages v1**
(<https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/languages.md>). A game is built in one language;
a translation step adds others later, without touching its code. The engine does the work the spec gives an engine:
reading the two blocks, `E.t`, choosing the language and the Language menu, drawing what the pixel fonts lack with the
device's font, a typewriter that reveals whole letters at the original's pace, and the three test languages. This page
is how a game uses it. The engine's side is section 6b of `engine/my-3d2dge.js` (the agent edition's 6b is the same).

## In a game

1. **Words players read are lines.** Keep them in the page's `<script type="application/json" id="game-lines">` block in
   its `<head>`, each under an id (`^[a-z0-9_]+(\.[a-z0-9_]+)*$`: `menu.start`, `rpg.shop.buy`), and show them with
   `E.t('menu.start')`. The engine's own words (its menus, settings, saves, notices, key names) are lines too, under
   `engine.*` ids: `node tools/lines.mjs page.html` puts them in the page's block. A word left in the code shows in
   English in every language; `?lang=en-XA` brackets every line, so a word without brackets is one.
2. **Whole sentences with `{blanks}`**, never glued: `E.t('hud.score', { points })` for `"Score {points}"`. A number is
   formatted in the player's language (12,500 / 12.500). `{count}` picks plural forms:
   `{ "zero": "No lives left", "one": "{count} life left", "other": "{count} lives left" }`. A key or button is a
   control tag, `{key:jump}` (the key, pad symbol or touch label that does it on the device in use): never write
   "Press Z". A line that changes with the device gets one per device (`help.jump.keys`, `help.jump.touch`).
3. **Text as text.** `E.font.text`, `r.text`, `E.ui`, `E.Dialog` and `E.Shell` draw a letter their glyphs lack with the
   device's font (Chinese, Hindi, Arabic: a run at a time, so letters join). Words painted into art can't be translated:
   draw the ones players need over it.
4. **Room to grow.** A German line is a third longer, a Chinese one taller (`E.lang.big`: the device's font, lines
   taller). Lay text out with `E.font.width`, `E.font.lineHeight()` and `E.font.wrap` (or `{ wrap: w }`), never with
   counted pixels; a line with little room gets a `max` in the block (its width in letters).
5. **Capitals and order** in the player's language: `E.lang.upper(s)` (Turkish i is İ), `E.lang.compare(a, b)` to sort
   names, `E.lang.num(n)`, `E.lang.date(d)`, `E.lang.list([...])`. A line shown in capitals can be written in capitals.
6. **Names and the brief.** The block's `names` lists the proper names (Pip, Meridian); its `brief` tells the translator
   what the game is, its tone, who speaks to whom, whether the player character is a man, a woman or the player's
   choice, and the jokes explained. A line that needs its own context gets a note (`notes`).
7. **Ids and values between copies, not sentences.** Saves keep ids and numbers; multiplayer copies send ids and
   numbers, so each player sees their own language. What players type shows as typed.

A game whose play is the words (a word puzzle, a typing game) sets `"wordPlay": true`; its word lists stay out of the
lines, its menus are still lines.

## The language

`?lang=` in the address (the hub adds it), then the player's choice (the Language menu: Settings, Display, and a title
screen made with `E.Shell`, while the page has two languages or more and the address names none; a choice restarts the
page in it), then the browser's languages, then the game's own. `E.lang.code` is the one shown, `E.lang.dir` its
direction (`'rtl'` for Arabic, Urdu, Persian, Hebrew: a line with their letters is drawn whole, and in a box (`wrap`)
starts at its right edge; `E.Dialog` starts its lines at the box's right edge). A missing, empty or broken translation
shows the original line (the spec's Critical rule).

## Testing

- `?lang=en-XA`: every line accented, bracketed and longer (`[Stárt ··]`). Plain text on screen is a word not in the
  lines; a missing `]` is a box that cuts text off. `node tools/lines-scan.mjs <page> [#slice]` plays a page in it and
  lists those words.
- `?lang=zh-XC`: Chinese characters without spaces. Boxes or `?` are a font without the fallback; text running off is a
  wrap that waits for spaces; lines overlapping are pixels counted instead of `lineHeight()`.
- `?lang=ar-XB`: Arabic letters, right to left. Text or menus that don't run right to left.
- `node tools/lines.mjs page.html --check`: the blocks as the hub checks them (ids, plural forms, a translation's tags).

## In this repository

Each kit part's lines live beside it: `src/starter/<part>.lines.json` and `src/starter3d/<part>.lines.json`, as
`{ "lines", "notes", "max", "names", "brief" }`; ids are the part's own (`starter.*` for the shell, `<slice>.*` for a
slice, `action.<name>` for an action's name on the controls screen and its touch button). `tools/build.mjs` writes each
page's block from its parts' files, the engine's lines and its modules' (`engine.<module>.*`, which a module registers
with `E.lang.engine({...})`). The kits' English shows exactly as before: `node tools/kits-test.mjs --compare <before>`
proves a conversion changed no pixel.
