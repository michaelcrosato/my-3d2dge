/*!
my-3D2dge module FIXTURE v0.81.0: proves the path every module takes (a test's own; never shipped)
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

tools/modules-test.mjs copies the repository, drops this file into the copy's engine/modules/ with a slice that names
it (tools/fixtures/starter/85-fixture.js), and checks the whole path a module takes: this manual counted against its
budget, its example run on both editions, its names in the API index, the fixture's kit carrying it and every other kit
leaving it out.

## API
- new E.Tally({ start }) → tally: a counter. tally.add(n = 1) adds and returns the total; tally.total; tally.reset().
- E.echo(x): x, unchanged.

## Example
```js tally
const E = My3D2dge, t = new E.Tally({ start: 2 });
t.add(); t.add(3);
if (t.total !== 6 || E.echo(t.reset().total) !== 2) throw new Error('a tally from 2, plus 1 and 3, is 6: ' + t.total);
```
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module FIXTURE: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * FIXTURE  a counter and an echo: the least a module holds
 * ========================================================================== */
class Tally {
  /** a counter: o.start is where it starts (0) and where reset() takes it back */
  constructor(o = {}) { this.start = o.start || 0; this.total = this.start; }   // start: where it starts; total: the count so far
  /** add n (1) to the total; returns the total */
  add(n = 1) { this.total += n; return this.total; }
  /** back to the start; returns the tally */
  reset() { this.total = this.start; return this; }
}
E.Tally = Tally;
/** x, unchanged: the least a function of a module is */
E.echo = x => x;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
