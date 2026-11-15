/*!
my-3D2dge module REWIND v0.101.0: time run backwards: the game's state kept a moment at a time, walked back on request
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

Slipstream's, Forza's and Prince of Persia's rewind: a ring of snapshots of the state a game names, taken in update,
walked back while the player holds a key; play goes on from wherever they let go (a replay keeps the inputs, so it
rewinds the same way).
- const rw = new E.Rewind({ seconds: 8 (how much is kept), every: 1 / 30 (seconds of play between snapshots) }).
- Each step of play: rw.keep(dt, () => ({ ... })): a fresh copy of what rewinds (positions, speeds, the clock: plain
  data, nothing shared with the live game), taken when a snapshot is due.
- Each step of rewinding: const s = rw.back(dt, speed = 1): the snapshot that far back, to put into the game (null
  when none is kept); it stops at the oldest. rw.seconds: how much is kept now; rw.clear() forgets them (a new stage).

```js rewind
const E = My3D2dge, rw = new E.Rewind({ seconds: 2, every: .1 }); let x = 0;
for (let i = 0; i < 30; i++) { x += 1; rw.keep(.1, () => ({ x })); }
const s = rw.back(.5);
if (s.x !== 25 || Math.abs(rw.seconds - 1.5) > 1e-9) throw new Error('a rewind');
```
Rules: keep and back from update (time from dt); a snapshot is copied when taken (never the live objects); what a
rewind brings back is the game's to put back, and to limit (a meter, a count).
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module REWIND: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * REWIND  a ring of snapshots, kept in play and walked back on request
 * ========================================================================== */
class Rewind {
  /** new E.Rewind({ seconds, every }): a rewind (the manual above) */
  constructor(o = {}) {
    /** o: its options; ring: the snapshots kept, oldest first */
    this.o = Object.assign({ seconds: 8, every: 1 / 30 }, o); this.ring = []; this._due = 0; this._back = 0;
  }
  /** how many seconds of play are kept now */
  get seconds() { return this.ring.length * this.o.every; }
  /** in play: take a snapshot (fn() -> a fresh copy of the state) when one is due; returns the rewind */
  keep(dt, fn) {
    this._back = 0; this._due -= dt;
    if (this._due > 1e-9) return this;
    this._due += this.o.every; if (this._due < 0) this._due = 0;
    this.ring.push(fn()); const max = Math.max(1, Math.round(this.o.seconds / this.o.every));
    if (this.ring.length > max) this.ring.splice(0, this.ring.length - max);
    return this;
  }
  /** rewinding: step back dt * speed seconds; the snapshot to put back (null when none is kept) */
  back(dt, speed = 1) {
    if (!this.ring.length) return null;
    this._back += dt * speed;
    while (this._back >= this.o.every - 1e-9 && this.ring.length > 1) { this._back -= this.o.every; this.ring.pop(); }
    this._due = 0; return this.ring[this.ring.length - 1];
  }
  /** forget every snapshot (a new stage, a restart) */
  clear() { this.ring.length = 0; this._due = 0; this._back = 0; return this; }
}
E.Rewind = Rewind;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
