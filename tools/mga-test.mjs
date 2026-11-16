// The MGA module end to end, in Chromium, with the real my-game-audio library (its dist/my-game-audio.js): a song
// plays through game.audio.bus('music') (an analyser on the bus hears it), the Music setting silences it, duck()
// lowers it, game.audio.at(step) fires on the music clock, a layer and a cue change go through, and a chip song still
// plays after. my-game-audio is not part of this repository: give its file with MGA_DIST (default: a my-game-audio
// checkout beside this one); without it the test says so and passes.
// Usage: MGA_DIST=../my-game-audio/dist/my-game-audio.js node tools/mga-test.mjs
import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(process.env.MGA_DIST || join(root, '../my-game-audio/dist/my-game-audio.js'));
if (!existsSync(dist)) { console.log(`skipped: no my-game-audio library at ${dist} (set MGA_DIST)`); process.exit(0); }
const page = `<!doctype html><meta charset="utf-8"><canvas id="screen"></canvas>
<script src="/engine/my-3d2dge.js"></script><script src="/engine/modules/mga.js"></script><script src="/mga.js"></script>`;
const srv = createServer((q, r) => {
  if (q.url === '/') return r.writeHead(200, { 'content-type': 'text/html' }), r.end(page);
  if (q.url === '/mga.js') return r.writeHead(200, { 'content-type': 'text/javascript' }), r.end(readFileSync(dist));
  const f = join(root, q.url.split('?')[0]);
  if (!f.startsWith(root) || !existsSync(f)) return r.writeHead(404), r.end();
  r.writeHead(200, { 'content-type': 'text/javascript' }); r.end(readFileSync(f));
}).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const tab = await browser.newPage(); const problems = [];
tab.on('pageerror', e => problems.push(e.message)); tab.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(m.text()); });
tab.on('response', q => { if (q.status() >= 400 && !/favicon/.test(q.url())) problems.push(`${q.status()} ${q.url()}`); });
await tab.goto(`http://localhost:${srv.address().port}/`);
let failed = 0; const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed++; };
const r = await tab.evaluate(async () => {
  const E = My3D2dge, game = new E.Game({ canvas: 'screen', menu: false, fullscreen: false });
  game.start({ update() {}, draw() {} });
  const mga = E.MGA.attach(game, MyGameAudio, { workers: 2 });
  const A = game.audio, bus = A.bus('music'), an = A.ctx.createAnalyser(); an.fftSize = 2048; bus.connect(an);
  const rms = () => { const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); return Math.sqrt(d.reduce((a, x) => a + x * x, 0) / d.length); };
  const wait = s => new Promise(ok => setTimeout(ok, s * 1000));
  const loud = async (s = 1) => { let m = 0; const t = performance.now(); while (performance.now() - t < s * 1000) { m = Math.max(m, rms()); await wait(.05); } return m; };
  const song = { title: 't', bpm: 120, meter: [4, 4], grid: 16, seed: 1, tail: 1,
    instruments: { lead: { type: 'chip', ch: 'pulse', duty: [2] }, bass: { type: 'chip', ch: 'tri' } },
    parts: { lead: { inst: 'lead' }, bass: { inst: 'bass' } }, layers: { low: ['bass'] },
    sections: { A: { bars: 2, parts: { lead: '| C5:4 E5:4 G5:4 E5:4 | D5:8 B4:8 |', bass: '| C3:8 G2:8 | G2:16 |' } },
      B: { bars: 2, parts: { lead: '| A4:8 C5:8 | B4:16 |', bass: '| A2:16 | G2:16 |' } } },
    form: ['A'], loops: { one: { body: ['A'] }, two: { body: ['B'] } } };
  const out = {};
  const t0 = performance.now(); A.music(song, { cue: 'one' });
  let fired = null; A.at(16, () => { fired = A.pos.step; });   // (after music(): a new song cancels the old one's)
  while (!(mga.player && mga.player.cur && mga.player.cur.t0 != null && A.ctx.currentTime >= mga.player.cur.t0) && performance.now() - t0 < 20000) await wait(.05);
  out.startMs = Math.round(performance.now() - t0);
  out.playing = await loud(1.5);
  A.musicVolume = 0; A.applyVolume(); await wait(.2); out.muted = await loud(.5);
  A.musicVolume = .5; A.applyVolume(); A.duck(true); await wait(.2); out.ducked = await loud(1);
  A.duck(false); await wait(.2); out.back = await loud(1);
  while (fired === null && performance.now() - t0 < 30000) await wait(.05);
  out.fired = fired; out.bus = mga.player && mga.player.bus('music') !== null;
  A.layer('low', 0, .1); out.layer = mga.player.layers().low;
  A.music(song, { cue: 'two' }); out.cue = mga.cue;
  await wait(2.5); out.cuePlaying = mga.player.cur && mga.player.cur.cue;
  A.music('title'); await wait(1); out.chip = !!A.song && !mga.song && await loud(1);
  return out;
});
console.log(`     ${JSON.stringify(r)}`);
check(r.startMs < 10000, `the song started ${r.startMs} ms after music()`);
check(r.playing > 0.01, `it plays through game.audio.bus('music'): level ${r.playing.toFixed(3)}`);
check(r.muted < 1e-4, `the Music volume at 0 silences it: level ${r.muted.toExponential(1)}`);
check(r.ducked < .6 * r.back && r.ducked > 0, `duck() lowers it: ${r.ducked.toFixed(3)} against ${r.back.toFixed(3)}`);
check(Math.round(r.fired) === 16, `game.audio.at(16) fires on its step: ${r.fired}`);
check(r.layer === 0, 'game.audio.layer() sets the song\'s layer');
check(r.cue === 'two' && r.cuePlaying === 'two', `a cue change goes through: ${r.cuePlaying}`);
check(r.chip > 0.01, 'a chip song plays after it, as before');
check(problems.length === 0, `no page errors${problems.length ? ': ' + problems.join(' | ') : ''}`);
await browser.close(); srv.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall MGA checks passed');
process.exit(failed ? 1 : 0);
