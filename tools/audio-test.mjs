// The audio suite (M12: the music clock, engine section 20), in Chromium with its sound on (no tap needed):
//   1. the sound follows the game's clock: a song plays three minutes (the songbook's 'stepup', looped), and every
//      frame what is heard (the audio's output time) is read against the game's clock (game.audio.drift; the sound's
//      notes move to meet it past 4 ms, at once past 10 two frames running), after the first second: within 10 ms but
//      for short stretches. A slip of the sound device itself (what it outputs moving against the page's clock by more
//      than 5 ms from one frame to the next, a few dozen times in three minutes in a container's virtual device), a
//      stall of the page (a frame over 50 ms, whose time past 50 ms the game's clock gives up) or the device's timestamp
//      read out of step for a frame: no engine can foresee one, so each must be met again within 5 frames of the one it
//      began on (no stretch past 10 ms longer than 6 frames), the frames past 10 ms under 1%, the slips rare (under 1%)
//   2. a synced song pauses with the game: its place holds while paused (real time passing), and goes on after
//   3. the audio offset's calibration: taps 40 ms after each click (on the game's clock) find an offset of about 40 ms
//   4. a crossfade, a stinger on the next bar and a layer brought in play without an error
//   5. an audio offset of 250 ms (a wireless headset's) still sounds the music's notes, scheduled that much earlier
//   6. a looped, panned effect sounds on until stopped (its pan set as it plays); a track plays a game's own instrument
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
  let slips = 0, most = 0, past = 0, run = 0, longest = 0, stretches = 0;   // (a stretch: frames in a row past 10 ms)
  late.forEach((f, i) => {
    const p = late[i - 1], slip = p && f[6] > 0 && p[6] > 0 && Math.abs((f[5] - p[5]) - (f[6] - p[6]) / 1000) > .005;
    if (slip) slips++;
    const d = Math.abs(f[1]) * 1000; if (d > most) most = d;
    if (d > 10) { past++; if (!run) stretches++; longest = Math.max(longest, ++run); } else run = 0;
  });
  const e = late.map(f => Math.abs(f[1]) * 1000).sort((a, b) => a - b);
  return { frames: late.length, slips, most, past, longest, stretches, p99: e[Math.floor(e.length * .99)], median: e[Math.floor(e.length / 2)], anchors: A.anchors, state: A.ctx && A.ctx.state, steps: F[F.length - 1][4] };
});
check(`the sound stays within 10 ms of the game's clock for ${secs} s, but for stretches of at most 6 frames`, r1.state === 'running' && r1.frames > secs * 30 && r1.longest <= 6 && r1.past < r1.frames / 100 && r1.slips < r1.frames / 100, `${r1.frames} frames: ${r1.past} past 10 ms in ${r1.stretches} stretches, the longest ${r1.longest} frames (the most ${r1.most.toFixed(2)} ms), ${r1.slips} slips of the sound device; 99% within ${r1.p99.toFixed(2)}, the median ${r1.median.toFixed(2)}; moved to meet it ${r1.anchors} times; ${Math.round(r1.steps)} steps played`);

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

// 5. a wireless headset's audio offset (250 ms): each note is sounded that much early, so it is scheduled that much
//    further ahead, and none falls in the past and is skipped (counted by the oscillators the notes make, offset 0 against 250)
console.log('an audio offset of 250 ms');
const r5 = await ev(async () => {
  const g = window.__fx.game, A = g.audio, w = ms => new Promise(r => setTimeout(r, ms)), S = My3D2dge.Songbook, c = A.ctx, made = { n: 0 }, osc = c.createOscillator.bind(c);
  c.createOscillator = () => { made.n++; return osc(); };
  const count = async off => { A.offset = off; A.music(null); A.music(Object.assign({}, S.get('stepup'), { loop: true })); await w(300); made.n = 0; await w(1500); return made.n; };
  const at0 = await count(0), at250 = await count(.25); A.offset = 0; A.music(null); c.createOscillator = osc;
  return { at0, at250 };
});
check('with a 250 ms audio offset the music still sounds its notes', r5.at0 > 0 && r5.at250 > r5.at0 * .7, JSON.stringify(r5));

// 6. an effect's handle: a looped one sounds on (an engine, rain) until stopped, its pan and volume set as it plays, through
//    the effects' bus; an instrument of the game's own plays a track's notes (HANDOFF-MATRIX 5.1, 5.2)
console.log('a looped, panned effect and an instrument of the game\'s own');
const r6 = await ev(async () => {
  const g = window.__fx.game, A = g.audio, w = ms => new Promise(r => setTimeout(r, ms)), c = A.ctx, out = {};
  if (typeof A.instrument !== 'function') return { missing: true };
  const an = c.createAnalyser(); an.fftSize = 2048; A.bus('master').connect(an); const buf = new Float32Array(an.fftSize), level = () => { an.getFloatTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v)); return m; };
  A.music(null); await w(400); out.quiet = level();
  const h = A.sfx({ wave: 'saw', freq: 110, dur: .2, vol: .4 }, { loop: true, pan: -.8 }); await w(900); out.looping = level(); out.pan = h.pan;
  h.set({ pan: .6, vol: .5 }); await w(100); out.pan2 = h.pan; h.stop(); await w(500); out.after = level(); out.playing = h.playing;
  let calls = 0; A.instrument('pluck', (ctx, bus, time, freq, dur, vol) => { calls++; const o = ctx.createOscillator(), gg = ctx.createGain(); o.frequency.value = freq; gg.gain.setValueAtTime(vol, time); gg.gain.exponentialRampToValueAtTime(.001, time + dur); o.connect(gg); gg.connect(bus); o.start(time); o.stop(time + dur + .05); });
  A.music({ bpm: 240, steps: 2, loop: true, tracks: [{ wave: 'pluck', notes: 'C4 E4 G4 C5' }] }); await w(1200); A.music(null); out.calls = calls;
  return out;
});
check("sfx(name, { loop, pan }): it sounds on until stop(), its pan set as it plays; a track plays an instrument of the game's own",
  !r6.missing && r6.looping > .02 && r6.looping > r6.quiet * 4 && r6.pan === -.8 && r6.pan2 === .6 && r6.after < r6.looping / 4 && r6.playing === false && r6.calls >= 3, JSON.stringify(r6));

await browser.close();
console.log(problems.length ? `\naudio test FAILED (${problems.length}):\n  ${problems.join('\n  ')}` : `\naudio test passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(problems.length ? 1 : 0);
