// The players suite (engine section 10j: game.players, joining, half keyboards, pads, split screen), on its fixture
// (tools/fixtures/players.html, a hero for each player):
//   1. alone: game.players is [game.input], and nothing else changes
//   2. two on one keyboard: player 2 on the right half (the arrows, . / , and the numpad), player 1 on the left (WASD,
//      F G H): each key moves its own player's hero only; each player's prompts name its own keys (input.label)
//   3. joining: with game.allowJoin, 2 on the keyboard brings in player 2 on its right half; Start on a pad no one holds
//      brings in another on that pad, which then moves only its hero (player 1 reads no pad another holds)
//   4. a pause says who paused (P2 PAUSED), and a lost controller pauses and names its player
//   5. split screen: two viewports side by side, each its own camera on its hero (each hero in the middle of its own
//      half), and a filmstrip of them; then rows and a grid of four
// Usage: node tools/players-test.mjs   (run node tools/build.mjs first; CHROMIUM_PATH picks a browser). Exit code 1 on
// failure; pictures in check-output/players/.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const out = resolve('check-output/players'); mkdirSync(out, { recursive: true });
const problems = [], check = (name, ok, detail) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); if (!ok) problems.push(name + (detail ? ': ' + detail : '')); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const URL0 = pathToFileURL(resolve('tools/fixtures/players.html')).href;
async function open(q = '', vp = { width: 960, height: 540 }) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript(() => { window.testPads = []; Object.defineProperty(navigator, 'getGamepads', { value: () => window.testPads }); });
  const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL0 + q); await page.waitForFunction(() => window.__fx && window.__fx.game.sceneName === 'arena'); await page.waitForTimeout(300);
  return { page, ctx, errors };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const hold = async (p, code, ms = 300) => { await p.keyboard.down(code); await wait(ms); await p.keyboard.up(code); await wait(80); };
const pos = p => p.evaluate(() => window.__fx.heroes.map(h => [Math.round(h.x), Math.round(h.y), h.presses]));
// a stand-in gamepad: buttons pressed (indices) and the left stick (axes) at index i
const pad = (p, i, buttons = [], axes = [0, 0]) => p.evaluate(([i, buttons, axes]) => { const P = window.testPads; P[i] = { index: i, id: 'test pad ' + i, connected: true, mapping: 'standard', axes: axes.concat([0, 0]), buttons: Array.from({ length: 17 }, (_, k) => ({ pressed: buttons.includes(k), value: buttons.includes(k) ? 1 : 0 })), timestamp: performance.now() }; }, [i, buttons, axes]);

console.log('1. one player');
{
  const { page, ctx, errors } = await open();
  const r = await page.evaluate(() => { const g = window.__fx.game; return { n: g.players.length, same: g.players[0] === g.input, keysTo: g.input.keysTo, label: g.input.label('attack') }; });
  check('alone: game.players is [game.input], no keyboard shared, its prompts as before', r.n === 1 && r.same && !r.keysTo && r.label === 'J' && !errors.length, JSON.stringify(r));
  await ctx.close();
}

console.log('2. two on one keyboard');
{
  const { page, ctx, errors } = await open('?two=1');
  const p0 = await pos(page); await hold(page, 'KeyD'); const p1 = await pos(page); await hold(page, 'ArrowLeft'); const p2 = await pos(page);
  await page.keyboard.press('Period'); await wait(100); await page.keyboard.press('KeyF'); await wait(100); const p3 = await pos(page);
  const labels = await page.evaluate(() => window.__fx.game.players.map(I => [I.label('attack'), I.label('dash'), I.label('start'), I.name]));
  check('D moves player 1 only; the left arrow moves player 2 only', p1[0][0] > p0[0][0] + 10 && p1[1][0] === p0[1][0] && p2[1][0] < p1[1][0] - 10 && p2[0][0] === p1[0][0], JSON.stringify([p0.slice(0, 2), p1.slice(0, 2), p2.slice(0, 2)]));
  check('each player\'s buttons are its half\'s (. for player 2, F for player 1), and its prompts say so', p3[0][2] === 1 && p3[1][2] === 1 && labels[0][0] === 'F' && labels[1][0] === '.' && labels[1][2] === '2' && labels[1][3] === 'P2' && !errors.length, JSON.stringify(labels));
  await ctx.close();
}

console.log('3. joining');
{
  const { page, ctx, errors } = await open('?join=1');
  await page.keyboard.press('Digit2'); await wait(150);
  const j1 = await page.evaluate(() => window.__fx.game.players.map(I => [I.name, I.half || null, I.pad]));
  check('2 on the keyboard joins player 2 on the right half (player 1 on the left)', j1.length === 2 && j1[0][1] === 'left' && j1[1][1] === 'right', JSON.stringify(j1));
  await pad(page, 0); await wait(100); await pad(page, 0, [9]); await wait(120); await pad(page, 0); await wait(120);
  const j2 = await page.evaluate(() => { const g = window.__fx.game; return { players: g.players.map(I => [I.name, I.pad]), claimed: [...(g.input._claimed || [])] }; });
  const b0 = await pos(page); await pad(page, 0, [], [1, 0]); await wait(350); await pad(page, 0); await wait(80); const b1 = await pos(page);
  check('Start on a free pad joins player 3 on it; its stick moves only its hero; player 1 reads that pad no more', j2.players.length === 3 && j2.players[2][1] === 0 && j2.claimed.includes(0) && b1[2][0] > b0[2][0] + 10 && b1[0][0] === b0[0][0] && b1[1][0] === b0[1][0] && !errors.length, JSON.stringify({ j2, b0: b0.slice(0, 3), b1: b1.slice(0, 3) }));
  // 4. a pause says who paused; a lost controller names its player
  await page.keyboard.press('Backspace'); await wait(150);
  const pz = await page.evaluate(() => { const g = window.__fx.game; return { paused: g.paused, by: g.pausedBy }; });
  await page.screenshot({ path: resolve(out, 'paused-by-p2.png') });
  await page.keyboard.press('Backspace'); await wait(150);
  check('player 2 pauses (P2 PAUSED) and unpauses', pz.paused && pz.by === 2 && !(await page.evaluate(() => window.__fx.game.paused)), JSON.stringify(pz));
  await page.evaluate(() => { window.testPads.length = 0; }); await wait(200);
  const lost = await page.evaluate(() => { const g = window.__fx.game; return { paused: g.paused, reason: g.pauseReason, note: g.shownNote && g.shownNote.text }; });
  check('a lost controller pauses and names its player', lost.paused && /P3/.test(lost.note || '') && !errors.length, JSON.stringify(lost));
  await ctx.close();
}

console.log('5. split screen');
{
  const { page, ctx, errors } = await open('?two=1&split=2');
  await hold(page, 'KeyD', 500); await hold(page, 'ArrowDown', 400); await wait(400);
  const v = await page.evaluate(() => { const g = window.__fx.game, r = g.r; return g.viewports.map((v, i) => { const h = window.__fx.heroes[i], [x, y] = g.view.p(h.x, h.y, 16); return { box: [v.x, v.y, v.w, v.h], at: [Math.round(x - v.cam.x), Math.round(y - v.cam.y)] }; }); });
  await page.screenshot({ path: resolve(out, 'split-2.png') });
  const mid = q => Math.abs(q.at[0] - q.box[2] / 2) < 12 && Math.abs(q.at[1] - q.box[3] / 2) < 12;
  check('two viewports side by side, each its hero in the middle of its own half', v.length === 2 && v[0].box[0] === 0 && v[1].box[0] > v[0].box[2] && mid(v[0]) && mid(v[1]) && !errors.length, JSON.stringify(v));
  const four = await open('?two=1&split=4');
  const v4 = await four.page.evaluate(() => window.__fx.game.viewports.map(v => [v.x, v.y, v.w, v.h])); await four.page.screenshot({ path: resolve(out, 'split-4.png') });
  check('a grid of four', v4.length === 4 && v4[3][0] > 0 && v4[3][1] > 0 && !four.errors.length, JSON.stringify(v4));
  await four.ctx.close(); await ctx.close();
  // the filmstrip: the harness's virtual clock, the right half's hero walking down while the left one walks right
  const f = spawnSync(process.execPath, ['tools/filmstrip.mjs', 'tools/fixtures/players.html?two=1&split=2', '--seed', '1', '--steps', 'wait:300 | rec:8:6 | down:KeyD | down:ArrowDown | wait:900 | up:KeyD | up:ArrowDown | wait:300', '--out', resolve(out, 'split-strip.png'), '--scale', '1'], { encoding: 'utf8' });
  check('a filmstrip of the two cameras', f.status === 0, (f.stdout + f.stderr).trim().split('\n').slice(-1)[0]);
}

await browser.close();
console.log(problems.length ? `\nplayers test FAILED (${problems.length}):\n  ${problems.join('\n  ')}` : '\nplayers test passed');
process.exit(problems.length ? 1 : 0);
