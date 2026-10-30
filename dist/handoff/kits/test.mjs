// A headless test of the genre kits: each kit's game runs in Node with no screen (new E.Game is headless where there is no
// DOM) after the scripts its page loads before it (the engine, an asset set), starts its slice (the page's deep link,
// #<id>), plays two seconds, then runs the slice's proof twice: run(600), scripted play from a seed, gives a hash of how
// it went, the same every time. Run it: node kits/test.mjs [id ...] (every kit without one; exit code 1 on a failure).
// A game copied from a kit tests the same way: a kit's code reads three of the page's globals, given stand-ins here
// (window, addEventListener, location); drive it with game.advance and input.tap / hold, as game/test.mjs does.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';

const here = new URL('./', import.meta.url), read = f => readFileSync(new URL(f, here), 'utf8');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(here).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)).sort();
let failed = 0;
for (const id of ids) {
  const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '#' + id } };
  ctx.window = ctx; vm.createContext(ctx);
  try {
    // the page's scripts, in its order: ../my-3d2dge.js, any asset set, then the kit's game
    for (const [, src] of read(id + '.html').matchAll(/<script src="([^"]+)"><\/script>/g)) vm.runInContext(read(src), ctx, { filename: src });
    const game = ctx.My3D2dge.current, slice = ctx.__game.scenes[id];
    game.advance(2);
    const scene = game.sceneName, a = slice.run(600), b = slice.run(600), errors = game.errors.map(e => e.message), ok = a === b && !errors.length;
    console.log((ok ? 'ok   ' : 'FAIL ') + id + ': ' + scene + ' plays; its proof twice ' + (a === b ? 'the same (' + a + ')' : a + ', then ' + b) + (errors.length ? '; errors: ' + errors.join(' | ') : ''));
    if (!ok) failed++;
  } catch (e) { console.log('FAIL ' + id + ': ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join(' / ')); failed++; }
}
console.log(failed ? `${failed} of ${ids.length} kit(s) failed` : `all ${ids.length} kit(s) passed`);
process.exit(failed ? 1 : 0);
