// The audio suite (M12: the music clock, engine section 20), in Chromium with its sound on (no tap needed):
//   1. the sound follows the game's clock: a song plays three minutes (the songbook's 'stepup', looped), and every
//      frame what is heard (the audio's output time) is read against the game's clock: within 10 ms the whole time,
//      after the first second (game.audio.drift; the sound's notes move to meet the clock past 4 ms, at once past 10
//      two frames running), but for the 5 frames after each slip of the sound device itself (what it outputs moving
//      against the page's clock by more than 5 ms from one frame to the next, a few times in three minutes in a
//      container's virtual device) and each stall of the page (a frame over 50 ms: the game's clock gives up the time
//      past 50 ms, and the sound, which played on in real time, is ahead of it by that much): no engine can foresee
//      either, so each must be met again within those 5 frames; and but for the device's misreads (one frame's reading
//      more than 5 ms off that the next frame contradicts, the sound not moved between: its timestamp read for a frame
//      out of step, not what is heard). Each kind must be rare (under 1% of the frames)
//   2. a synced song pauses with the game: its place holds while paused (real time passing), and goes on after
//   3. the audio offset's calibration: taps 40 ms after each click (on the game's clock) find an offset of about 40 ms
//   4. a crossfade, a stinger on the next bar and a layer brought in play without an error
// Usage: node tools/audio-test.mjs [--seconds 180]   (run node tools/build.mjs first; CHROMIUM_PATH picks a browser).
// Exit code 1 on failure.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2), secs = args.includes('--seconds') ? +args[args.indexOf('--seconds') + 1] : 180;
const problems = [], t0 = Date.now(), check = (name, ok, detail) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); if (!ok) problems.push(name + (detail ? ': ' + detail : '')); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } }), errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(resolve('tools/fixtures/audio.html')).href);
await page.waitForFunction(() => window.__fx && window.__fx.game.sceneName);
const ev = (f, a) => page.evaluate(f, a), wait = ms => new Promise(r => setTimeout(r, ms));

// 1. three minutes of music, held to the game's clock
console.log(`the sound against the game's clock, ${secs} s`);
await ev(() => { const g = window.__fx.game; g.audio.music(Object.assign({}, My3D2dge.Songbook.get('stepup'), { loop: true })); window.__fx.frames.length = 0; });
await wait(secs * 1000);
const r1 = await ev(() => {
  const F = window.__fx.frames, s0 = F[0][0], late = F.filter(f => f[0] - s0 > 1000 && f[3] === 'running'), A = window.__fx.game.audio;
  let slips = 0, stalls = 0, misreads = 0, since = 99, most = 0, held = 0;   // (since: frames since the device's last slip or the page's last stall; held: the most outside those frames and the misreads)
  late.forEach((f, i) => {
    const p = late[i - 1], q = late[i + 1], slip = p && f[6] > 0 && p[6] > 0 && Math.abs((f[5] - p[5]) - (f[6] - p[6]) / 1000) > .005, stall = p && f[0] - p[0] > 50;
    const misread = p && q && Math.abs(f[1] - p[1]) > .005 && Math.abs(q[1] - p[1]) < .002 && q[2] === p[2];
    if (slip) slips++; if (stall) stalls++; if (misread) misreads++;
    if (slip || stall) since = 0; else since++;
    const d = Math.abs(f[1]) * 1000; if (d > most) most = d; if (since > 5 && !misread && d > held) held = d;
  });
  const e = late.map(f => Math.abs(f[1]) * 1000).sort((a, b) => a - b);
  return { frames: late.length, slips, stalls, misreads, most, held, p99: e[Math.floor(e.length * .99)], median: e[Math.floor(e.length / 2)], anchors: A.anchors, state: A.ctx && A.ctx.state, steps: F[F.length - 1][4] };
});
check(`the sound stays within 10 ms of the game's clock for ${secs} s`, r1.state === 'running' && r1.frames > secs * 30 && r1.held <= 10 && Math.max(r1.slips, r1.stalls, r1.misreads) < r1.frames / 100, `${r1.frames} frames: the most ${r1.held.toFixed(2)} ms but for the 5 frames after each of the sound device's ${r1.slips} slips and the page's ${r1.stalls} stalls, and its ${r1.misreads} misreads (the most there ${r1.most.toFixed(2)}), 99% within ${r1.p99.toFixed(2)}, the median ${r1.median.toFixed(2)}; moved to meet it ${r1.anchors} times; ${Math.round(r1.steps)} steps played`);

// 2. a synced song pauses with the game
console.log('a synced song and the pause');
const r2 = await ev(async () => {
  const g = window.__fx.game, A = g.audio, w = ms => new Promise(r => setTimeout(r, ms));
  A.music(My3D2dge.Songbook.get('town'), { sync: true }); await w(800); const a = A.pos.step; g.paused = true; await w(700); const b = A.pos.step; g.paused = false; await w(700); const c = A.pos.step;
  return { a, b, c };
});
check('a synced song holds its place while the game is paused, and goes on after', r2.a > 4 && Math.abs(r2.b - r2.a) < .6 && r2.c > r2.b + 4, `step ${r2.a.toFixed(2)}, paused ${r2.b.toFixed(2)}, after ${r2.c.toFixed(2)}`);

// 3. the calibration: taps 40 ms after each click, on the game's clock
console.log('the audio offset\'s calibration');
const r3 = await ev(() => new Promise(done => {
  const fx = window.__fx, A = fx.game.audio, K = A.calibrate(); let last = 0;
  fx.update = () => {   // (in the update step: a tap on the game's clock, the first step 40 ms or more after each click)
    const t = A.pos.t, beat = Math.floor(t * 100 / 60 + 1e-9);
    if (beat > last && t - beat * .6 >= .04) { last = beat; K.tap(); }
    if (K.done && K.taps >= 10) { fx.update = null; K.stop(); done({ result: K.result, taps: K.taps, devs: K.devs.map(d => Math.round(d)) }); }
  };
}));
check('taps 40 ms after each click find an offset of 40 ms (within 9)', Math.abs(r3.result - 40) <= 9, `offset ${r3.result} ms from ${r3.taps} taps (${r3.devs.join(', ')} ms)`);

// 4. a crossfade, a stinger and a layer
console.log('a crossfade, a stinger, a layer');
const r4 = await ev(async () => {
  const g = window.__fx.game, A = g.audio, w = ms => new Promise(r => setTimeout(r, ms)), S = My3D2dge.Songbook;
  A.music(S.get('shadows')); await w(600); A.layer('chase', 1, .4); A.layer('alarm', 1, .4); await w(600); A.sting(S.get('oneup'), { at: 'bar' }); await w(900);
  A.music(S.get('pursuit'), { fade: 1 }); await w(1200); A.tempo(190); await w(500);
  return { title: A.song.src.title, bpm: A.pos.bpm, fading: A.song && A.pos.playing };
});
check('a layer, a stinger on the next bar, a crossfade and a tempo change play without an error', r4.title === 'Over the Wall' && r4.bpm === 190 && r4.fading && !errors.length, JSON.stringify(r4) + (errors.length ? '; errors: ' + errors.join(' | ') : ''));

await browser.close();
console.log(problems.length ? `\naudio test FAILED (${problems.length}):\n  ${problems.join('\n  ')}` : `\naudio test passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(problems.length ? 1 : 0);
