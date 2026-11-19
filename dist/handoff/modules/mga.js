/*!
my-3D2dge module MGA v0.108.5: game.audio plays my-game-audio songs (orchestral, synthwave, chiptune scores as code)
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine only. Needs: no other module.

my-game-audio (https://github.com/michaelcrosato/my-game-audio, MIT) writes a game's music, sound effects and voices as
code, with no audio files: songs are text scores with cues (title, battle...), layers and stingers, rendered in workers
and looped seamlessly. This module lets game.audio play them as it plays its own chip songs. The library is the game's
to load (its dist/my-game-audio.js, one dependency-free file, gives the global MyGameAudio); this module only adapts.
- const mga = E.MGA.attach(game, MyGameAudio, opts): from then on game.audio.music(song, { cue, fade, at }) plays a
  my-game-audio song (anything with sections and form) through game.audio.bus('music'), so the player's Volume, Music
  and Sound settings, mute and the pause's ducking apply as to any song; a chip song still plays as before. opts go to
  MyGameAudio.createPlayer (workers, parallel, cache, stream).
- The music clock is game.audio's own: the song runs a silent chip song with its cue's tempo and length (four steps a
  beat), so game.audio.pos, at(step, fn), onBeat(fn) and stopMusic() work on it, headless too (where there is no
  sound, or no library: lib null). pos.step counts from the start, intro included. A cue whose tempo changes bar by
  bar (a section's bpm, tempo line or rit.) is followed: on each beat the clock is set to reach where the music is
  by the next one (holds, fermatas, are not followed).
- game.audio.layer(name, vol, fade) sets a song's layer (song.layers); game.audio.sting(name, { at }) plays one of its
  stingers; music(song, { cue }) with the song playing changes cue on the next bar.
- mga.player: the my-game-audio player (null without sound): sfx(name), say(text, character), prepare(song, cue)...;
  E.MGA.isSong(x): true for a my-game-audio song; E.MGA.clock(song, cue) -> { bpm, steps, len, intro, start,
  stepAt(t) } (the silent song's numbers; start: the bpm at its first step; stepAt: where the music is t seconds in).

```js mga
const E = My3D2dge, game = new E.Game({ headless: true }); game.start({ update() {}, draw() {} });
E.MGA.attach(game, null);   // no library here: the clock without the sound
const song = { bpm: 120, meter: [4, 4], grid: 16, sections: { A: { bars: 2, parts: {} }, B: { bars: 1, bpm: 90, parts: {} } },
  form: ['A'], loops: { calm: { body: ['A'] }, tense: { intro: ['A'], body: ['B'] } }, layers: { drums: ['kick'] } };
if (!E.MGA.isSong(song) || E.MGA.isSong({ bpm: 120, tracks: [] })) throw new Error('isSong');
let hit = -1; game.audio.music(song, { cue: 'calm' }); game.audio.at(8, () => { hit = game.audio.pos.step; });
for (let i = 0; i < 120 && hit < 0; i++) game.advance(1 / 60);
if (Math.round(hit) !== 8 || game.audio.pos.bpm !== 120) throw new Error('at(8) on its step: ' + hit);
const c = E.MGA.clock(song, 'tense'); if (c.bpm !== 90 || c.len !== 16 || c.intro !== 32 || c.start !== 120) throw new Error(JSON.stringify(c));
const slow = { bpm: 120, meter: [4, 4], sections: { A: { bars: 2, parts: {} }, B: { bars: 1, bpm: 60, parts: {} } }, form: ['A', 'B'] };
game.audio.music(slow); for (let i = 0; i < 360; i++) game.advance(1 / 60);   // 6 s: A's 32 steps in 4 s, half of B
if (Math.abs(game.audio.pos.step - 40) > 1 || game.audio.pos.bpm > 70) throw new Error('follows B at 60: ' + game.audio.pos.step);
game.audio.layer('drums', 0); game.audio.stopMusic(); if (game.audio.pos.playing) throw new Error('stopped');
```
Rules: load my-game-audio's dist file in the page before calling attach; keep music quiet by default (Settings'
Music); prepare() a level's cues while it loads, so its music starts at once.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module MGA: load engine/my-3d2dge.js (the full engine) first');

/* =============================================================================
 * MGA  my-game-audio songs on game.audio: the sound through its music bus, the clock on its own
 * ========================================================================== */
/** true for a my-game-audio song: sections and a form (a chip song has tracks) */
const isSong = x => !!x && typeof x === 'object' && !!x.sections && Array.isArray(x.form) && !x.tracks;
// a cue's sections (intro and body), as my-game-audio's cuesOf says: loops[cue], or intro + loop, or the whole form
function cueOf(song, cue) {
  if (song.loops && song.loops[cue || 'main']) { const d = song.loops[cue || 'main']; return { intro: d.intro || [], body: d.body || [] }; }
  if (song.loops && !cue) { const d = song.loops[Object.keys(song.loops)[0]]; return { intro: d.intro || [], body: d.body || [] }; }
  if (song.loop) return { intro: song.intro || [], body: song.loop };
  return { intro: [], body: song.form };
}
// the bars of some sections as { steps, bpm, sec } (four steps a beat), each bar's tempo as my-game-audio's arranger
// reads it: the section's tempo line ('-' keeps the last), else its rit. [from, to], else its bpm, else the song's
function barsOf(song, names) {
  const out = [];
  for (const n of names) {
    const s = song.sections[n] || {}, bars = s.bars || 0, beats = (s.meter || song.meter || [4, 4])[0];
    const base = s.bpm || song.bpm || 120;
    const cells = s.tempo ? String(s.tempo).split('|').map(x => x.trim()).filter(Boolean) : null;
    let last = base;
    for (let b = 0; b < bars; b++) {
      let bpm = base;
      if (cells && cells[b] !== undefined) bpm = cells[b] === '-' ? last : (+cells[b] > 0 ? +cells[b] : last);
      else if (s.rit) bpm = s.rit[0] + (s.rit[1] - s.rit[0]) * b / Math.max(1, bars - 1);
      last = bpm;
      out.push({ steps: beats * 4, bpm, sec: 60 / bpm * beats });
    }
  }
  return out;
}
/** the silent chip song's numbers for a cue: { bpm (its first body section's), steps: 4 a beat, len (the body's
 *  steps), intro (the intro's steps), start (the bpm at its first step), stepAt(t) (the step the music is at t seconds
 *  in, the intro once and the body looping), bpmAt(t), varies (its tempo changes) } */
function clock(song, cue) {
  const d = cueOf(song, cue), steps = 4;
  const ib = barsOf(song, d.intro), bb = barsOf(song, d.body);
  const sum = (bars, k) => bars.reduce((a, b) => a + b[k], 0);
  const introS = sum(ib, 'steps'), introT = sum(ib, 'sec'), bodyS = sum(bb, 'steps'), bodyT = sum(bb, 'sec');
  const first = song.sections[d.body[0]] || {};
  const bpm = first.bpm || (first.tempo ? +String(first.tempo).split('|').map(x => x.trim()).filter(Boolean)[0] || song.bpm : song.bpm) || 120;
  // where the music is t seconds in: [step, bpm there]
  const where = t => {
    let bars = ib, s = 0;
    if (t >= introT && bodyT > 0) { const k = Math.floor((t - introT) / bodyT); t = t - introT - k * bodyT; s = introS + k * bodyS; bars = bb; }
    for (const b of bars) { if (t < b.sec) return [s + t / b.sec * b.steps, b.bpm]; t -= b.sec; s += b.steps; }
    const lb = bars[bars.length - 1] || { bpm, steps: 0, sec: 1 }; return [s, lb.bpm];
  };
  const all = ib.concat(bb);
  return {
    bpm, steps, len: Math.max(1, bodyS), intro: introS, start: all.length ? all[0].bpm : bpm,
    stepAt: t => where(t)[0], bpmAt: t => where(t)[1], varies: all.some(b => b.bpm !== all[0].bpm)
  };
}
// the silent song: rests the cue's length, and a silent track for each layer (so game.audio.layer finds it)
function shadow(song, cue) {
  const c = clock(song, cue), rest = Array(c.intro + c.len).fill('.').join(' ');
  const tracks = [{ wave: 'square', vol: 0, notes: rest }, ...Object.keys(song.layers || {}).map(name => ({ name, wave: 'square', vol: 0, notes: '.' }))];
  return { bpm: c.start, steps: c.steps, len: c.intro + c.len, tracks };
}

/** attach my-game-audio (lib: the MyGameAudio global, or null for the clock alone) to a game's audio. Returns
 *  { player, song, cue }: the my-game-audio player (made at the first song, null without sound) and what plays */
function attach(game, lib, opts = {}) {
  const A = game.audio, base = { music: A.music.bind(A), stopMusic: A.stopMusic.bind(A), layer: A.layer.bind(A), sting: A.sting.bind(A) };
  const M = { player: null, song: null, cue: null, clock: null };
  const player = () => {
    if (M.player || !lib || game.headless) return M.player;
    const music = A.bus('music'); if (!music) return null;   // no sound here (no Web Audio, or it failed)
    M.player = lib.createPlayer(Object.assign({ context: A.ctx, buses: { music, sfx: A.bus('sfx'), voice: A.bus('voice') } }, opts));
    return M.player;
  };
  A.music = (song, o = {}) => {
    if (!isSong(song)) { if (M.song) { const p = M.player; M.song = null; if (p) p.stop({ fade: o.fade || .06 }); } return base.music(song, o); }
    const cue = o.cue || (song.loops ? Object.keys(song.loops)[0] : 'main');
    if (M.song === song && M.cue === cue && !o.restart) return;
    const changing = M.song === song;
    M.song = song; M.cue = cue;
    const c = clock(song, cue); M.clock = c.varies ? c : null;
    base.music(shadow(song, cue), { fade: o.fade, sync: o.sync, restart: true });
    const p = player(); if (!p) return;
    if (changing) p.cue(cue, { at: o.at || 'bar', fade: o.fade });
    else p.music(song, { cue, fade: o.fade, at: o.at }).catch(e => console.warn('my-game-audio:', e && e.message || e));
  };
  A.stopMusic = fade => { if (M.song && M.player) M.player.stop({ fade: fade || .06 }); M.song = null; M.clock = null; return base.stopMusic(fade); };
  // a cue whose tempo changes: on each beat, a tempo that brings the clock to where the music is by the next beat
  // (so no error builds up however long it plays)
  A.onBeat(() => {
    const c = M.song && M.clock, p = A.pos; if (!c || !p.playing) return;
    const want = c.stepAt(p.t), err = Math.max(-2, Math.min(2, want - p.step));
    const b = c.bpmAt(p.t) * (1 + err / c.steps);
    if (Math.abs(b - p.bpm) > 1e-6 * b) A.tempo(b);
  });
  A.layer = (name, vol = 1, fade = .5) => { if (M.song && M.player && hasLayer(M.song, name)) M.player.layer(name, vol, fade); return base.layer(name, vol, fade); };
  A.sting = (what, o = {}) => {
    if (M.song && typeof what === 'string' && M.song.stingers && M.song.stingers[what]) { if (M.player) M.player.sting(what, o); return; }
    return base.sting(what, o);
  };
  return M;
}
const hasLayer = (song, name) => !!(song.layers && song.layers[name]);

/** E.MGA: my-game-audio songs on game.audio */
E.MGA = {
  /** attach(game, MyGameAudio, opts): game.audio plays my-game-audio songs from then on; returns { player, song, cue } */
  attach: attach,
  /** isSong(x): true for a my-game-audio song (sections and a form, no tracks) */
  isSong: isSong,
  /** clock(song, cue): the silent chip song's numbers for a cue: { bpm, steps: 4, len, intro, start, stepAt(t),
   *  bpmAt(t), varies } (steps; stepAt: where the music is t seconds in) */
  clock: clock
};
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
