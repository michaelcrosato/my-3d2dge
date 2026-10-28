/*!
my-3D2dge module RHYTHM v0.78.0: charts on a song's steps, judged on the music clock: combos, grades, holds, a highway
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine only. Needs: no other module.

PaRappa's, Beatmania's, Dance Dance Revolution's and Space Channel 5's play: notes on a song's steps, hit in time.
- const rh = new E.Rhythm(game, { song, chart, lanes: ['left', 'down', 'up', 'right'] (the actions, one a lane),
  windows: { perfect: 40, great: 80, good: 120 } (ms either side), life: .5, lead: 1.6 (seconds of notes shown
  ahead), voice: { wave: 'square', vol: .2, dur: .09 } (the call notes' sound), on: { judge(j, note), fail(rh),
  done(rh) } }).
- chart: a string a lane, a character a step of the song: 'x' a note, 'h' a held note's head and '=' while it is
  held, 'c' a call (PaRappa's teacher: it sounds and shows, the player answers after), '.' none; '|' and spaces are
  ignored. Or { parts: { A: [lanes], B: [lanes] }, order: 'A A B A' } (the parts one after another), or { track: 1,
  lanes: 4 } (that track's notes, a lane by pitch, a note held three steps or more a hold).
- rh.start() plays the song from its start, synced (it pauses with the game); rh.update() each step after the input:
  a lane's press is judged by its distance in ms from its nearest note's time on the music clock (game.audio.pos:
  game time, never the sound's own), a hold let go before its end drops, a note past the good window is missed, a
  call sounds on its step (game.audio.sfx(voice, { step })).
- rh.hit(lane), rh.release(lane): play a lane without its action (a bot, a lane of your own on a touch screen).
- State: score, combo, maxCombo, counts { perfect, great, good, miss }, life (0..1, at 0 failed), accuracy (0..1),
  grade ('S' 'A' 'B' 'C' 'D'), done, failed, last ({ j, lane, ms, t }: the last judgment, for its flash), notes
  (each { lane, step, end, call, j, ms }), total (the notes to play).
- rh.ahead() -> the notes to show: [{ note, dt (seconds to its time, < 0 past it), dtEnd }]; rh.draw(r, { x, y (the
  target line's middle), dir: 'down' | 'up' | 'left' | 'right' (the way notes travel), len: 150 (pixels for lead
  seconds), gap: 24 (between lanes), size: 8, colors, arrows: false (four lanes' notes as arrows: left, down, up,
  right), call: false (draw the call notes instead) }) draws a highway on the overlay: the lanes, their targets, notes
  and holds, each lane's flash.

```js rhythm
const E = My3D2dge, game = new E.Game({ headless: true }); game.start({ update() {}, draw() {} });
const song = { bpm: 120, steps: 4, loop: false, len: 32, tracks: [{ wave: 'drums', notes: 'k . h . s . h .' }] };
const rh = new E.Rhythm(game, { song, chart: ['x...x...', '..x.....', '......h===', '.'] });
rh.start(); const hits = [[0, 0], [2, 1], [4, 0], [6, 2]];
for (let i = 0; i < 400 && !rh.done; i++) {
  game.advance(1 / 120); const s = game.audio.pos.step;
  for (const h of hits) if (!h.done && s >= h[0]) { rh.hit(h[1]); h.done = true; }
  if (s >= 9) rh.release(2); rh.update();
}
if (rh.counts.perfect !== 4 || rh.combo !== 4 || rh.grade !== 'S') throw new Error(JSON.stringify(rh.counts));
```
Rules: judge on the music clock (rh does), never on the sound's; give the player the audio offset (Settings, Sound:
its calibration) and keep the windows generous on a phone; draw notes from rh.ahead() each frame.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module RHYTHM: load engine/my-3d2dge.js (the full engine) first');

/* =============================================================================
 * RHYTHM  charts (lane strings, parts or a track's notes), judgments in ms of the music clock, combos, life, grades,
 * holds, calls (call and response), a note highway in any direction
 * ========================================================================== */
const SCORE = { perfect: 300, great: 200, good: 100 }, LIFE = { perfect: .03, great: .02, good: .005, miss: -.1 }, CALL = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'];
const clean = s => String(s).replace(/[|\s]/g, '');
// a part's lane strings laid at a step: notes { lane, step, end, call }
function lanesOf(lanes, at, out) {
  lanes.forEach((s, lane) => {
    const c = clean(s);
    for (let i = 0; i < c.length; i++) {
      const ch = c[i];
      if (ch === 'x' || ch === 'c') out.push({ lane, step: at + i, end: at + i, call: ch === 'c' });
      else if (ch === 'h') { let j = i; while (c[j + 1] === '=') j++; out.push({ lane, step: at + i, end: at + j, call: false }); i = j; }
    }
  });
  return out;
}
// a chart's notes: lane strings, parts in an order, or a track's notes (a lane by pitch)
function notesOf(chart, song) {
  if (Array.isArray(chart)) return lanesOf(chart, 0, []);
  if (chart && chart.parts) {
    const out = []; let at = 0;
    for (const k of String(chart.order).trim().split(/\s+/)) { const p = chart.parts[k]; if (!p) throw new Error('rhythm: the chart\'s order names a part "' + k + '" it does not have'); lanesOf(p, at, out); at += Math.max(...p.map(s => clean(s).length)); }
    return out;
  }
  if (chart && chart.track !== undefined) {
    const tr = song.tracks[chart.track], toks = String(tr.notes).replace(/\|/g, ' ').trim().split(/\s+/), n = chart.lanes || 4, out = [];
    const len = song.len || Math.max(...song.tracks.map(t => String(t.notes).replace(/\|/g, ' ').trim().split(/\s+/).length));
    const pitches = [...new Set(toks.filter(t => E.note(t) > 0))].sort((a, b) => E.note(a) - E.note(b));
    for (let base = 0; base < len; base += toks.length) toks.forEach((t, i) => {
      if (!(E.note(t) > 0) || base + i >= len) return; let j = i; while (toks[j + 1] === '-') j++;
      out.push({ lane: Math.floor(pitches.indexOf(t) * n / pitches.length), step: base + i, end: j - i >= 2 ? base + j : base + i, call: false });
    });
    return out;
  }
  throw new Error('rhythm: a chart is lane strings, { parts, order } or { track, lanes }');
}
class Rhythm {
  /** new E.Rhythm(game, { song, chart, lanes, windows, life, lead, voice, on }): see the manual */
  constructor(game, o = {}) {
    /** game: its game; song: the song charted; lanes: the actions, one a lane; windows: { perfect, great, good } in ms
     *  either side of a note; lead: seconds of notes shown ahead; voice: the calls' sound; on: { judge, fail, done } */
    this.game = game; this.song = o.song; this.lanes = o.lanes || ['left', 'down', 'up', 'right']; this.windows = Object.assign({ perfect: 40, great: 80, good: 120 }, o.windows); this.lead = o.lead || 1.6; this.voice = Object.assign({ wave: 'square', vol: .2, dur: .09 }, o.voice); this.on = o.on || {};
    this._life = o.life === undefined ? .5 : o.life;
    /** notes: every note of the chart in time order ({ lane, step, end, call, j: its judgment or null, ms }) */
    this.notes = notesOf(o.chart, this.song).sort((a, b) => a.step - b.step || a.lane - b.lane);
    this.reset();
  }
  /** back to the start: no judgments, a full combo of nothing, life as given */
  reset() {
    /** score: the points; combo: the notes hit in a row; maxCombo: the longest combo; counts: { perfect, great, good,
     *  miss }; life: the gauge 0..1; done: the song is over, or failed; failed: the life ran out; started: start() was
     *  called; last: the last judgment { j, lane, ms, t }; down: each lane held now */
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.counts = { perfect: 0, great: 0, good: 0, miss: 0 }; this.life = this._life; this.done = false; this.failed = false; this.started = false; this.last = null; this.down = this.lanes.map(() => false);
    this._flash = this.lanes.map(() => -9);
    for (const n of this.notes) { n.j = null; n.ms = 0; n.holding = false; n.played = false; }
  }
  /** the notes to play (not the calls) */
  get total() { return this.notes.filter(n => !n.call).length; }
  /** how well so far, 0..1: a perfect counts whole, a great .7, a good .4 */
  get accuracy() { const c = this.counts, n = c.perfect + c.great + c.good + c.miss; return n ? (c.perfect + c.great * .7 + c.good * .4) / n : 1; }
  /** the grade of the accuracy: 'S' (95%), 'A' (85), 'B' (70), 'C' (50), 'D' */
  get grade() { const a = this.accuracy; return a >= .95 ? 'S' : a >= .85 ? 'A' : a >= .7 ? 'B' : a >= .5 ? 'C' : 'D'; }
  /** play the song from its start (synced: it pauses with the game) and judge from here */
  start() { this.reset(); this.game.audio.music(this.song, { sync: true, restart: true, loop: false }); this.started = true; }
  // seconds a step lasts now, and the music's step now (the music clock: game time)
  _spb() { const p = this.game.audio.pos; return 60 / (p.bpm || this.song.bpm || 120) / (this.song.steps || 4); }
  /** a press in a lane: judged against the nearest note there within the good window (a hold starts held) */
  hit(lane) {
    if (!this.started || this.done) return null;
    this.down[lane] = true;
    const s = this.game.audio.pos.step, spb = this._spb(); let best = null, bd = 1e9;
    for (const n of this.notes) { if (n.lane !== lane || n.call || n.j) continue; const d = Math.abs(s - n.step) * spb * 1000; if (d <= this.windows.good && d < bd) { best = n; bd = d; } if (n.step > s + 4 * this.song.steps) break; }
    if (!best) return null;
    const ms = Math.round((s - best.step) * spb * 1000), w = this.windows, a = Math.abs(ms);
    this._judge(best, a <= w.perfect ? 'perfect' : a <= w.great ? 'great' : 'good', ms);
    if (best.end > best.step) best.holding = true;
    return best;
  }
  /** a lane let go: a hold let go before its end (less the good window) drops */
  release(lane) {
    this.down[lane] = false;
    const s = this.game.audio.pos.step, spb = this._spb();
    for (const n of this.notes) if (n.holding && n.lane === lane) {
      n.holding = false;
      if ((n.end - s) * spb * 1000 > this.windows.good) { n.dropped = true; this.combo = 0; this.counts.miss++; this._gauge(LIFE.miss / 2); this.last = { j: 'miss', lane, ms: 0, t: this.game.time }; if (this.on.judge) this.on.judge('miss', n); }
      else this.score += 100;
    }
  }
  _gauge(d) { this.life = Math.max(0, Math.min(1, this.life + d)); if (this.life <= 0 && !this.failed) { this.failed = this.done = true; if (this.on.fail) this.on.fail(this); } }
  _judge(n, j, ms) {
    n.j = j; n.ms = ms; this.counts[j]++;
    if (j === 'miss') this.combo = 0; else { this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.score += Math.round(SCORE[j] * (1 + Math.min(this.combo, 50) / 100)); }
    this.last = { j, lane: n.lane, ms, t: this.game.time }; if (j !== 'miss') this._flash[n.lane] = this.game.time;
    this._gauge(LIFE[j]);
    if (this.on.judge) this.on.judge(j, n);
  }
  /** each step, after the input: the lanes' actions pressed and let go, calls sounded, notes missed, holds kept, the end */
  update() {
    if (!this.started || this.done) return;
    const I = this.game.input, A = this.game.audio, s = A.pos.step, spb = this._spb();
    this.lanes.forEach((a, i) => { if (I.pressed(a)) this.hit(i); else if (this.down[i] && I.released(a)) this.release(i); });
    for (const n of this.notes) {
      if (n.step > s + 8 * this.song.steps) break;
      if (n.call) { if (!n.played && (n.step - s) * spb < .1) { n.played = true; A.sfx(Object.assign({ freq: CALL[n.lane % CALL.length] }, this.voice), { step: n.step }); } if (!n.j && s >= n.step) { n.j = 'call'; this._flash[n.lane] = this.game.time; } continue; }
      if (!n.j && (s - n.step) * spb * 1000 > this.windows.good) this._judge(n, 'miss', 0);
      if (n.holding && s >= n.end) { n.holding = false; this.score += 100; }
      if (this.done) return;
    }
    const p = A.pos; if (!p.playing && p.t > 0) { this.done = true; if (this.on.done) this.on.done(this); }
  }
  /** the notes to show now: [{ note, dt, dtEnd }] (seconds to the note's time and to its end; a little past the line
   *  for the missed, the held while held); call: the calls instead */
  ahead(call = false) {
    const s = this.game.audio.pos.step, spb = this._spb(), out = [];
    for (const n of this.notes) {
      if (!!n.call !== call) continue;
      const dt = (n.step - s) * spb, dtEnd = (n.end - s) * spb; if (dt > this.lead) break;
      if (dtEnd < -.3 || (n.j && n.j !== 'miss' && !n.holding && n.end === n.step && !call) || (call && dt < -.15)) continue;
      out.push({ note: n, dt, dtEnd });
    }
    return out;
  }
  /** draw the highway on the overlay (see the manual) */
  draw(r, o = {}) {
    const px = E.px, n = this.lanes.length, dir = o.dir || 'down', len = o.len || 150, gap = o.gap || 24, size = o.size || 8, call = !!o.call;
    const cols = o.colors || ['#ff5a8a', '#5ac8ff', '#7aff6a', '#ffd040', '#c08aff', '#ff9a40'];
    const D = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir] || [0, 1], P = [Math.abs(D[1]), Math.abs(D[0])];
    const x0 = o.x === undefined ? r.W / 2 : o.x, y0 = o.y === undefined ? r.H - 36 : o.y, t = this.game.time;
    const at = (lane, dt) => { const off = (lane - (n - 1) / 2) * gap, k = dt / this.lead * len; return [x0 + P[0] * off - D[0] * k, y0 + P[1] * off - D[1] * k]; };
    // a strip between two points along the highway, w across it (one fill: translucent as a whole)
    const strip = (a, b, w, c) => px.rect(g0, Math.min(a[0], b[0]) - P[0] * w / 2, Math.min(a[1], b[1]) - P[1] * w / 2, Math.abs(b[0] - a[0]) + P[0] * w, Math.abs(b[1] - a[1]) + P[1] * w, c);
    // a note: an arrow pointing its lane's way (left, down, up, right) or a disc
    const ANG = [Math.PI, Math.PI / 2, -Math.PI / 2, 0], ARROW = [[1, 0], [0, -1], [0, -.45], [-1, -.45], [-1, .45], [0, .45], [0, 1]];
    const mark = (g, lane, x, y, sz, c) => {
      if (!(o.arrows && n === 4)) { px.disc(g, x, y, sz, '#000000'); px.disc(g, x, y, sz - 1, c); px.disc(g, x - 2, y - 2, Math.max(1, sz / 3), '#ffffff'); return; }
      const a = ANG[lane], ca = Math.cos(a), sa = Math.sin(a), pts = k => ARROW.map(([u, v]) => [x + (u * ca - v * sa) * k, y + (u * sa + v * ca) * k]);
      px.poly(g, pts(sz + 1.5), '#000000'); px.poly(g, pts(sz), c); px.poly(g, pts(sz * .45), E.mix(c, '#ffffff', .55));
    };
    let g0 = null;
    r.overlay(g => {
      g0 = g;
      for (let i = 0; i < n; i++) {   // the lanes, their targets (lit a moment when hit), the press held
        px.blend(g, .25, 'normal', () => strip(at(i, -.15), at(i, this.lead), gap - 6, call ? '#8a8ab0' : cols[i % cols.length]));
        const [x, y] = at(i, 0), lit = t - this._flash[i] < .12;
        if (o.arrows && n === 4 && !call) { mark(g, i, x, y, size + 1, lit ? '#ffffff' : this.down[i] ? cols[i % cols.length] : '#3a3a5a'); px.poly(g, [[x - 1, y - 1], [x + 1, y - 1], [x + 1, y + 1], [x - 1, y + 1]], '#101020'); }
        else { px.disc(g, x, y, size + 2, '#000000'); px.disc(g, x, y, size + 1, lit ? '#ffffff' : this.down[i] && !call ? cols[i % cols.length] : '#3a3a5a'); px.disc(g, x, y, size - 2, '#101020'); }
      }
      for (const { note: m, dt, dtEnd } of this.ahead(call)) {
        const c = m.j === 'miss' || m.dropped ? '#5a5a6a' : call ? '#e0e0ff' : cols[m.lane % cols.length];
        if (m.end > m.step) strip(at(m.lane, m.holding ? 0 : Math.max(dt, 0)), at(m.lane, dtEnd), Math.max(4, size), E.mix(c, '#000000', .25));
        if (!m.holding) { const [x, y] = at(m.lane, dt); mark(g, m.lane, x, y, size, c); }
      }
    });
  }
}
E.Rhythm = Rhythm;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
