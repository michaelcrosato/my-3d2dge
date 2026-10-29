/*!
my-3D2dge module SONGS v0.81.2: the songbook: the kits' best songs and more, and jingles, tagged by mood
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

Original chiptunes in the step sequencer's format (game.audio.music's: { bpm, steps, tracks }), each with a title and
its moods, ready to play or to copy and change.
- E.Songbook.songs: every song by id; E.Songbook.get(id) -> the song; E.Songbook.find(mood) -> the ids of the songs of
  that mood (in the order they are listed); E.Songbook.moods: every mood there is.
- Moods: title, field, town, shop, calm, dungeon, battle, boss, race, puzzle, space, horror, stealth, chase, dance,
  and the jingles (loop: false): stage clear, game over, one-up, level up, fanfare.
- A song's tracks may have a name and on: false (a layer, silent until game.audio.layer(name, 1) brings it in, on the
  full engine): 'shadows' sneaks on three tracks and brings in 'chase' and 'alarm' when the guards see you.
- A song's len (steps) can run longer than its tracks (they loop on their own lengths within it): the dance songs.

```js songs
const E = My3D2dge, battle = E.Songbook.find('battle');
if (!battle.length || !E.Songbook.get(battle[0]).tracks.length) throw new Error('a battle song');
if (E.Songbook.get('clear').loop !== false || !E.Songbook.moods.includes('stealth')) throw new Error('jingles and moods');
for (const id in E.Songbook.songs) for (const t of E.Songbook.songs[id].tracks) if (!t.notes.trim()) throw new Error(id);
```
Rules: play one with game.audio.music(E.Songbook.get(id)) (a jingle: audio.sting, over the music); copy a song into
your game to change it; a kit carries this module only when it plays its songs.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module SONGS: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * SONGS  the songbook: songs by id, each with a title and moods; find(mood), get(id)
 * ========================================================================== */
const S = {
  // gathered from the kits (and the core's own, by name)
  title: { core: 'title', title: 'Title', mood: ['title'] },
  adventure: { core: 'adventure', title: 'Adventure', mood: ['field'] },
  dungeon: { core: 'dungeon', title: 'Dungeon', mood: ['dungeon'] },
  boss: { core: 'boss', title: 'Boss', mood: ['boss', 'battle'] },
  victory: { core: 'victory', title: 'Victory', mood: ['stage clear', 'fanfare'] },
  road: { title: 'The Road North', mood: ['field'], bpm: 126, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'G4 - B4 - D5 - - G5 | F#5 - D5 - E5 - D5 - | C5 - E5 - G5 - - E5 | D5 - B4 - A4 - - - | G4 - B4 - D5 - - G5 | A5 - G5 - F#5 - E5 - | D5 - C5 - B4 - A4 - | G4 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'G2 . D3 . G2 . D3 . | D2 . A2 . D2 . A2 . | C3 . G3 . C3 . G3 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | F2 . C3 . D3 . A2 . | C3 . G2 . D3 . A2 . | G2 . D3 . G2 . . .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . k k h . s . h h' }] },
  town: { title: 'Market Day', mood: ['town'], bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'F3 . C4 . A3 . C4 . | C3 . G3 . E3 . G3 . | D3 . A3 . F3 . A3 . | Bb2 . F3 . C3 . E3 .' },
    { wave: 'pulse', vol: .11, notes: 'A4 - C5 - F5 - E5 D5 | C5 - - - G4 - - - | D5 - F5 - A5 - G5 F5 | E5 - C5 - D5 - - -' },
    { wave: 'drums', vol: .06, notes: 'k . h . . . h . k . h . . . h h' }] },
  shanty: { title: 'The Salty Gull', mood: ['town'], bpm: 92, steps: 3, tracks: [
    { wave: 'square', vol: .1, notes: 'D5 - A4 | D5 E5 F5 | E5 - C5 | A4 - - | D5 - A4 | F5 E5 D5 | C5 - E5 | D5 - - | F5 - G5 | A5 - F5 | G5 F5 E5 | C5 - - | D5 - F5 | E5 C5 A4 | D5 C5 E5 | D5 - -' },
    { wave: 'triangle', vol: .28, notes: 'D3 A3 A3 | D3 A3 A3 | C3 G3 G3 | A2 E3 E3 | D3 A3 A3 | Bb2 F3 F3 | C3 G3 G3 | D3 A3 A3 | F3 C4 C4 | F3 C4 C4 | C3 G3 G3 | A2 E3 E3 | Bb2 F3 F3 | A2 E3 E3 | A2 E3 C#3 | D3 A3 D3' },
    { wave: 'drums', vol: .05, notes: 'k . h | s . h' }] },
  hymn: { title: 'The Lamp Is Lit', mood: ['calm'], bpm: 76, steps: 3, tracks: [
    { wave: 'square', vol: .1, notes: 'D5 - F#5 | A5 - - | G5 F#5 E5 | F#5 - - | D5 - E5 | F#5 - A5 | B5 A5 F#5 | A5 - - | D6 - - | . . .' },
    { wave: 'triangle', vol: .28, notes: 'D3 A3 F#3 | D3 A3 F#3 | A2 E3 C#3 | D3 A3 F#3 | G2 D3 B2 | D3 A3 F#3 | G2 D3 B2 | A2 E3 C#3 | D3 A3 D4 | . . .' }] },
  battle: { title: 'Encounter', mood: ['battle'], bpm: 152, steps: 4, tracks: [
    { wave: 'saw', vol: .07, notes: 'A4 A4 C5 A4 E5 - D5 C5 | B4 B4 D5 B4 E5 - D5 B4 | C5 C5 E5 C5 A5 - G5 E5 | F5 - E5 - D5 - B4 -' },
    { wave: 'square', vol: .07, notes: 'A3 . A3 . A3 . A3 . | G#3 . G#3 . G#3 . G#3 . | A3 . A3 . C4 . C4 . | D4 . D4 . E4 . E4 .' },
    { wave: 'triangle', vol: .3, notes: 'A2 A3 A2 A3 A2 A3 A2 A3 | E2 E3 E2 E3 E2 E3 E2 E3 | F2 F3 F2 F3 C3 C4 C3 C4 | D3 D4 D3 D4 E3 E4 E3 E4' },
    { wave: 'drums', vol: .12, notes: 'k h s h k k s h' }] },
  versus: { title: 'Round One', mood: ['battle'], bpm: 150, steps: 4, tracks: [
    { wave: 'pulse12', vol: .1, notes: 'A4 - C5 D5 E5 - D5 C5 | D5 - G4 - C5 B4 A4 G4 | F4 - A4 C5 D5 - E5 - | G5 F5 E5 D5 E5 - - -' },
    { wave: 'triangle', vol: .3, notes: 'A2 . A2 A3 A2 . A2 G2 | G2 . G2 G3 G2 . G2 E2 | F2 . F2 F3 F2 . F2 G2 | G2 . G2 B2 D3 . E3 .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h k k . h . s . h h' }] },
  kart: { title: 'Grand Prix', mood: ['race'], bpm: 148, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'C5 . E5 G5 . E5 C5 . | D5 . F5 A5 . F5 D5 . | E5 . G5 C6 . G5 E5 . | D5 . B4 G4 . A4 B4 .' },
    { wave: 'triangle', vol: .26, notes: 'C3 C3 G2 G2 C3 C3 G2 G2 | D3 D3 A2 A2 D3 D3 A2 A2 | E3 E3 B2 B2 C3 C3 G2 G2 | G2 G2 D3 D3 G2 G2 B2 B2' },
    { wave: 'drums', vol: .07, notes: 'k . h k s . h . k . h k s . h h' }] },
  breeze: { title: 'Sea Breeze', mood: ['race'], bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'E5 . G5 A5 . G5 E5 D5 | C5 . D5 E5 . . . . | E5 . G5 A5 . B5 A5 G5 | A5 . G5 E5 . . D5 .' },
    { wave: 'triangle', vol: .26, notes: 'A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . | C3 . C4 . C3 . C4 . | G2 . G3 . G2 . G3 .' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h k k . h . s . h h' }] },
  neon: { title: 'Neon Highway', mood: ['race', 'chase'], bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .05, notes: 'A4 A5 E5 A4 G5 E5 C5 G4 | F4 F5 C5 F4 E5 C5 A4 E4 | G4 G5 D5 G4 F5 D5 B4 F4 | E4 E5 B4 E4 G#5 E5 B4 G#4' },
    { wave: 'triangle', vol: .26, notes: 'A1 A2 A1 A2 A1 A2 A1 A2 | F1 F2 F1 F2 F1 F2 F1 F2 | G1 G2 G1 G2 G1 G2 G1 G2 | E1 E2 E1 E2 E1 E2 E1 E2' },
    { wave: 'drums', vol: .07, notes: 'k h s h k h s h k h s h k k s h' }] },
  stack: { title: 'Stack Attack', mood: ['puzzle'], bpm: 144, steps: 4, tracks: [
    { wave: 'square', vol: .11, notes: 'E5 . G5 . C6 - B5 . A5 . G5 . E5 - D5 . | C5 . D5 . E5 - G5 . F5 - E5 . D5 - - . | A4 . C5 . F5 - E5 . D5 . C5 . A4 - G4 . | B4 . D5 . G5 - F5 . E5 . D5 . C5 - - .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . C3 . G3 . C3 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h k s . h h' }] },
  crypt: { title: 'The Crypt', mood: ['dungeon', 'horror'], bpm: 84, steps: 4, tracks: [
    { wave: 'pulse12', vol: .12, notes: 'D5 - - - F5 - E5 - D5 - C5 - A4 - - - | Bb4 - - - A4 - G4 - A4 - - - - - . . | D5 - - - F5 - G5 - A5 - G5 - F5 - E5 - | F5 - E5 - D5 - C#5 - D5 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'D2 - . . D2 . . . A2 - . . D2 . . . | G2 - . . G2 . . . D2 - . . D2 . . . | Bb1 - . . Bb1 . . . F2 - . . F2 . . . | A1 - . . A1 . . . D2 - . . D2 . . .' },
    { wave: 'drums', vol: .08, notes: 'k . . . h . . . k . . . h . h .' }] },
  station: { title: 'Orbital Station', mood: ['space'], bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'E4 . E5 . B4 . G4 . | E4 . E5 . C5 . A4 . | D4 . D5 . A4 . F4 . | E4 . B4 . G4 . D4 .' },
    { wave: 'triangle', vol: .26, notes: 'E2 E2 . E2 E3 . E2 . | C2 C2 . C2 C3 . C2 . | D2 D2 . D2 D3 . D2 . | B1 B1 . B1 B2 . D2 .' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h . k k h . s . h h' }] },
  nebula: { title: 'Nebula Run', mood: ['space'], bpm: 138, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'E5 . G5 . B5 . E6 - D6 . B5 . G5 . A5 . | B5 - - . A5 . G5 . F#5 . D5 . E5 - - . | C5 . E5 . G5 . C6 - B5 . G5 . E5 . F#5 . | G5 . F#5 . E5 . D#5 . E5 - - - - . . .' },
    { wave: 'triangle', vol: .3, notes: 'E2 E3 E2 E3 E2 E3 E2 E3 | G2 G3 G2 G3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | B1 B2 B1 B2 E2 E3 E2 E3' },
    { wave: 'drums', vol: .11, notes: 'k . h . s . h k k . h . s . h h' }] },
  // new
  shop: { title: 'Open All Night', mood: ['shop'], bpm: 116, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'C5 . E5 . G5 . E5 . A5 - G5 . E5 . . . | D5 . F5 . A5 . F5 . G5 - - . . . . . | E5 . G5 . C6 . G5 . A5 - F5 . D5 . . . | G4 . B4 . D5 . F5 . E5 - C5 - - . . .' },
    { wave: 'triangle', vol: .28, notes: 'C3 . G2 . C3 . E3 . | F2 . C3 . F2 . A2 . | D3 . A2 . D3 . F3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . E3 . | F2 . C3 . F2 . A2 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . . .' },
    { wave: 'drums', vol: .06, notes: 'k . h h . h k . k . h h s . h .' }] },
  gloom: { title: 'Something Below', mood: ['horror'], bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'C2 - - - - - - - - - - - . . . . | C#2 - - - - - - - - - - - . . . . | C2 - - - - - - - - - - - . . . . | B1 - - - - - - - G1 - - - - - . .' },
    { wave: 'pulse12', vol: .07, notes: '. . . . G4 - F#4 - . . . . . . . . | . . . . G4 - G#4 - A4 - . . . . . . | . . . . Eb5 - D5 - . . . . . . . . | . . C5 - B4 - . . . . . . . . . .' },
    { wave: 'sine', vol: .06, notes: 'C6 . . . . . . . . . . . . . . . | . . . . . . . . . . . . F#6 . . . | . . . . . . . . . . . . . . . . | . . . . . . . . B5 . . . . . . .' },
    { wave: 'drums', vol: .07, notes: 'k . . . . . . . . . k . . . . . | k . . . . . . . . . . . t . . .' }] },
  shadows: { title: 'Shadows on the Roofs', mood: ['stealth', 'chase'], bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'A2 . . A2 . . A2 . | A2 . . A2 . C3 . . | F2 . . F2 . . F2 . | G2 . . G2 . E2 . .' },
    { name: 'tick', wave: 'drums', vol: .06, notes: 'h . . h . . h . h . . h . . h .' },
    { name: 'lead', wave: 'pulse12', vol: .07, notes: 'E5 - . . . . D5 . | C5 - . . B4 . A4 . | . . . . F5 - E5 . | D5 - . . E5 - . . | E5 - . . . . G5 . | F5 - . . E5 . D5 . | C5 - . . D5 - . . | B4 - - - . . . .' },
    { name: 'chase', wave: 'drums', vol: .13, on: false, notes: 'k . h k s . h . k k h . s . h s' },
    { name: 'alarm', wave: 'saw', vol: .06, on: false, notes: 'A3 A3 A4 A3 E4 A3 G4 A3 | A3 A3 A4 A3 C5 A3 B4 A3 | F3 F3 F4 F3 C4 F3 E4 F3 | G3 G3 G4 G3 D4 G3 B3 G3' }] },
  pursuit: { title: 'Over the Wall', mood: ['chase'], bpm: 168, steps: 4, tracks: [
    { wave: 'saw', vol: .07, notes: 'D5 D5 . D5 F5 . E5 D5 | C5 C5 . C5 E5 . D5 C5 | Bb4 Bb4 . Bb4 D5 . C5 Bb4 | A4 - C#5 - E5 - G5 -' },
    { wave: 'triangle', vol: .3, notes: 'D2 D3 D2 D3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 | A1 A2 A1 A2 A1 A2 C#2 C#3' },
    { wave: 'drums', vol: .13, notes: 'k h s h k k s h k h s h k s s s' }] },
  stepup: { title: 'Step Up', mood: ['dance'], bpm: 120, steps: 4, len: 512, tracks: [
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h k s . h h' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'E2 . E3 E2 . E2 E3 . | G2 . G3 G2 . G2 G3 . | A2 . A3 A2 . A2 A3 . | B2 . B3 B2 . A2 G2 . ' },
    { name: 'chords', wave: 'square', vol: .05, notes: '. . B4 . . . B4 . | . . D5 . . . D5 . | . . E5 . . . E5 . | . . F#5 . . . F#5 .' },
    { name: 'lead', wave: 'pulse', vol: .09, notes: '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . | E5 . G5 . A5 - G5 . E5 . D5 . E5 - - . G5 . A5 . B5 - A5 . G5 . E5 . D5 - - . | E5 . G5 . A5 - G5 . E5 . D5 . E5 - G5 . A5 - B5 . D6 - B5 . A5 - G5 . E5 - - . | B5 . . B5 . . A5 . G5 . . G5 . . E5 . D5 . . D5 . . E5 . G5 - - - . . . .' }] },
  rapschool: { title: 'Rap School', mood: ['dance'], bpm: 100, steps: 4, len: 384, tracks: [
    { name: 'drums', wave: 'drums', vol: .13, notes: 'k . . h s . . k k . h . s . h .' },
    { name: 'bass', wave: 'triangle', vol: .32, notes: 'C3 . . C3 . . Bb2 . | . . Bb2 . G2 . Bb2 . | F2 . . F2 . . G2 . | . . G2 . Bb2 . B2 .' },
    { name: 'keys', wave: 'square', vol: .05, notes: '. . E5 . . . G5 . | . . F5 . . . D5 . | . . A4 . . . C5 . | . . B4 . . . D5 .' }] },
  // jingles (once)
  clear: { title: 'Stage Clear', mood: ['stage clear'], bpm: 160, steps: 4, loop: false, tracks: [
    { wave: 'square', vol: .16, notes: 'C5 . E5 . G5 . C6 - - - A5 . B5 . C6 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . . . E3 . G3 - - - F3 . G3 . C3 - - - - - . .' },
    { wave: 'drums', vol: .12, notes: 'k . h . k . h . s . . . k . k . c . . . . . . .' }] },
  gameover: { title: 'Game Over', mood: ['game over'], bpm: 90, steps: 4, loop: false, tracks: [
    { wave: 'pulse', vol: .14, notes: 'A4 - - . G4 - - . F4 - - . E4 - - - D4 - - - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'D3 - - - - - - - Bb2 - - - - - - - A2 - - - - - - - . .' }] },
  oneup: { title: 'One Up', mood: ['one-up'], bpm: 200, steps: 4, loop: false, tracks: [
    { wave: 'square', vol: .16, notes: 'E5 G5 E6 C6 D6 G6 . .' }] },
  levelup: { title: 'Level Up', mood: ['level up'], bpm: 180, steps: 4, loop: false, tracks: [
    { wave: 'square', vol: .15, notes: 'C5 E5 G5 C6 . G5 C6 - E6 - - - . .' },
    { wave: 'triangle', vol: .28, notes: 'C3 . . . . G2 . . C3 - - - . .' }] },
  fanfare: { title: 'Royal Fanfare', mood: ['fanfare'], bpm: 132, steps: 4, loop: false, tracks: [
    { wave: 'square', vol: .15, notes: 'G4 . G4 G4 C5 - - - E5 . E5 E5 G5 - - - | C6 - - - G5 . E5 . F5 . A5 . G5 - - - | E5 . F5 . G5 . A5 . C6 - - - - - . .' },
    { wave: 'pulse', vol: .08, notes: 'E4 . E4 E4 G4 - - - C5 . C5 C5 E5 - - - | E5 - - - E5 . C5 . C5 . F5 . E5 - - - | C5 . D5 . E5 . F5 . E5 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . C3 C3 C3 - - - C3 . C3 C3 C3 - - - | A2 - - - C3 . C3 . F2 . F2 . C3 - - - | C3 . . . F2 . . . C3 - - - - - . .' },
    { wave: 'drums', vol: .12, notes: 's s s s k . . . s s s s k . . . | c . . . s . s . s . s . k . . . | s . s . s . s . c . . . . . . .' }] }
};
const MOODS = ['title', 'field', 'town', 'shop', 'calm', 'dungeon', 'battle', 'boss', 'race', 'puzzle', 'space', 'horror', 'stealth', 'chase', 'dance', 'stage clear', 'game over', 'one-up', 'level up', 'fanfare'];
/** the songbook: songs by id, their moods, get(id), find(mood) (see the manual) */
const Songbook = {
  /** every song by id ({ title, mood: [...], bpm, steps, tracks, loop }; the core's own songs are E.songs') */
  songs: {},
  /** every mood a song has, in the order of the manual */
  moods: MOODS,
  /** a song by id (playable: game.audio.music(E.Songbook.get('town'))), or undefined */
  get(id) { return this.songs[id]; },
  /** the ids of the songs of a mood, in the order listed */
  find(mood) { return Object.keys(this.songs).filter(id => this.songs[id].mood.includes(mood)); }
};
for (const id in S) { const s = S[id]; Songbook.songs[id] = s.core ? Object.assign({ title: s.title, mood: s.mood }, E.songs[s.core]) : s; }
E.Songbook = Songbook;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
