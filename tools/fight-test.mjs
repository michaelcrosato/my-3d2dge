// The fight suite (engine/modules/fight.js and the FIGHTING kit, dist/kits/my-3d2dge-fighting.html):
//   1. motions are read at the engine's 120 Hz step and mirrored by facing (headless): 236 + LP, each direction held one
//      step, throws a fireball facing right; facing left it takes 214 + LP, and 236 + LP does nothing
//   2. two players on one keyboard (player 2 joins with 2, the right half) pick fighters and fight to a KO
//   3. two players on two gamepads (scripted: player 2 joins with Start on pad 1) pick and fight to a KO
//   4. the CPU's matches repeat: the kit's bot fights the same match twice, hash for hash
//   1b. guards (headless): a mid is blocked standing or crouching, a low only crouching, an overhead only standing
//   5. training: the frame data of a jab, the dummy's modes (and a picture of the boxes)
// Usage: node tools/fight-test.mjs   (run node tools/build.mjs first; CHROMIUM_PATH picks a browser). Exit code 1 on
// failure; pictures in check-output/fight/.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { load } from './engine-lib.mjs';

const out = resolve('check-output/fight'); mkdirSync(out, { recursive: true });
const problems = [], check = (name, ok, detail) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); if (!ok) problems.push(name + (detail ? ': ' + detail : '')); };

console.log('1. motions at 120 Hz, mirrored by facing (headless)');
{
  const E = load('full'), moves = { jab: { move: 'jab', btn: 'lp' }, fire: { move: 'cast', btn: 'lp', motion: '236', shot: { speed: 150 } } };
  const tryMotion = (side, dirs) => {
    const game = new E.Game({ headless: true }), a = new E.Fighter(game, { x: side > 0 ? 100 : 300, moves }), b = new E.Fighter(game, { x: side > 0 ? 300 : 100, moves });
    const m = new E.Match(game, { fighters: [a, b], training: { dummy: 'stand' }, inputs: [game.input, null], camera: false });
    let got = null; game.start({ update: dt => { m.update(dt); if (a.act && !got) got = a.act.m.id; }, draw: () => {} }); game.input.use(E.FIGHT_KEYS);
    game.advance(.2); a.reset(side > 0 ? 100 : 300, side); b.reset(side > 0 ? 300 : 100, -side); game.advance(1 / 120);
    const I = game.input;
    for (const d of dirs) { for (const k of d.split('+')) if (k !== 'lp') I.hold(k); if (d.includes('lp')) I.tap('lp'); game.advance(1 / 120); for (const k of d.split('+')) if (k !== 'lp') I.hold(k, false); }   // each held one step
    game.advance(.05);
    return got;
  };
  const r1 = tryMotion(1, ['down', 'down+right', 'right+lp']), r2 = tryMotion(-1, ['down', 'down+left', 'left+lp']), r3 = tryMotion(-1, ['down', 'down+right', 'right+lp']);
  check('236 + LP facing right, a step each: the fireball', r1 === 'fire', String(r1));
  check('facing left, the same motion mirrored (214 on the keys): the fireball', r2 === 'fire', String(r2));
  check('facing left, 236 + LP is no fireball (a jab)', r3 !== 'fire', String(r3));
}

console.log('1b. guards (headless): a mid blocked either way, a low only crouching, an overhead only standing');
{
  const E = load('full'), moves = { mid: { move: 'jab', btn: 'lp' }, low: { move: 'sweep', btn: 'lk', when: 'crouch', guard: 'low' }, over: { move: 'axekick', btn: 'hk', guard: 'overhead' } };
  const guard = (id, crouch) => {
    const game = new E.Game({ headless: true }), a = new E.Fighter(game, { moves }), b = new E.Fighter(game, { moves });
    let pressed = false, got = null;
    const A = { intent: () => { if (pressed) return {}; pressed = true; const m = moves[id]; return { press: m.btn, y: m.when === 'crouch' ? 1 : 0 }; } }, B = { intent: (f, foe) => ({ x: -Math.sign(foe.x - f.x), y: crouch ? 1 : 0 }) };
    const m = new E.Match(game, { fighters: [a, b], ai: [A, B], training: {}, camera: false });
    game.start({ update: dt => { m.update(dt); if (!got && b.kind) got = b.kind; }, draw: () => {} });
    a.reset(200, 1); b.reset(200 + a.body.w + 6, -1); game.advance(.8);
    return got;
  };
  const r = { midStanding: guard('mid', false), midCrouching: guard('mid', true), lowStanding: guard('low', false), lowCrouching: guard('low', true), overStanding: guard('over', false), overCrouching: guard('over', true) };
  check('blocks', r.midStanding === 'block' && r.midCrouching === 'block' && r.lowStanding === 'hit' && r.lowCrouching === 'block' && r.overStanding === 'block' && r.overCrouching === 'hit', JSON.stringify(r));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const KIT = pathToFileURL(resolve('dist/kits/my-3d2dge-fighting.html')).href;
async function open(hash = '', vp = { width: 960, height: 540 }) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript(() => { window.testPads = []; Object.defineProperty(navigator, 'getGamepads', { value: () => window.testPads }); });
  const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(KIT + hash); await page.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName === 'fighting'); await page.waitForTimeout(400);
  return { page, ctx, errors };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const st = p => p.evaluate(() => window.__game.scenes.fighting.state());
const pad = (p, i, buttons = [], axes = [0, 0]) => p.evaluate(([i, buttons, axes]) => { const P = window.testPads; P[i] = { index: i, id: 'test pad ' + i, connected: true, mapping: 'standard', axes: axes.concat([0, 0]), buttons: Array.from({ length: 17 }, (_, k) => ({ pressed: buttons.includes(k), value: buttons.includes(k) ? 1 : 0 })), timestamp: performance.now() }; }, [i, buttons, axes]);
// the match under way: both low on life, so a few blows end it
const lowLife = p => p.evaluate(() => { const m = window.__game.scenes.fighting.match(); for (const f of m.f) f.life = 140; });
const fightUntil = async (p, ms, act) => { const t0 = Date.now(); let s; while (Date.now() - t0 < ms) { await act(); s = await st(p); if (s.phase === 'ko' || s.phase === 'win' || s.phase === 'over') break; } return s; };

console.log('2. two players on one keyboard');
{
  const { page, ctx, errors } = await open('#fighting');
  await page.keyboard.press('Digit2'); await wait(200);   // player 2 joins: the keyboard's right half
  await page.keyboard.press('KeyF'); await wait(300);   // player 1 (left half: F confirms) picks VERSUS
  await page.screenshot({ path: resolve(out, 'select.png') });
  await page.keyboard.press('KeyD'); await wait(120); await page.keyboard.press('KeyF'); await wait(150);   // player 1: the second fighter
  await page.keyboard.press('Period'); await wait(1000);   // player 2 (right half: . is its light punch) takes its cursor's
  let s = await st(page);
  check('player 2 joins on the right half; both pick (player 1 the second fighter)', s.mode === 'fight' && s.picks && s.picks.length === 2, JSON.stringify(s));
  await page.waitForFunction(() => window.__game.scenes.fighting.state().phase === 'fight', null, { timeout: 5000 }).catch(() => {});
  await lowLife(page); await page.screenshot({ path: resolve(out, 'versus.png') });
  const before = await st(page);
  await page.keyboard.down('KeyD'); await page.keyboard.down('ArrowLeft'); await wait(1200);   // both walk in, then strike now and then, still walking in
  s = await fightUntil(page, 20000, async () => { await page.keyboard.press('KeyG'); await wait(250); await page.keyboard.press('Slash'); await wait(250); });
  await page.keyboard.up('KeyD'); await page.keyboard.up('ArrowLeft'); await page.screenshot({ path: resolve(out, 'ko-keyboard.png') });
  check('they walk in and trade blows until one is knocked out', ['ko', 'win', 'over'].includes(s.phase) && s.life.some(l => l <= 0) && s.x[0] !== before.x[0] && s.x[1] !== before.x[1] && !errors.length, JSON.stringify({ phase: s.phase, life: s.life, x: [before.x, s.x], errors }));
  await ctx.close();
}

console.log('3. two players on two gamepads (scripted)');
{
  const { page, ctx, errors } = await open('#fighting');
  await pad(page, 0); await pad(page, 1); await wait(150);
  await pad(page, 0, [0]); await wait(120); await pad(page, 0); await wait(200);   // player 1's A: VERSUS
  await pad(page, 1, [9]); await wait(150); await pad(page, 1); await wait(250);   // player 2's Start joins it on pad 1
  await pad(page, 0, [2]); await wait(120); await pad(page, 0); await wait(150);   // player 1's X picks
  await pad(page, 1, [2]); await wait(120); await pad(page, 1); await wait(1000);   // player 2's X
  let s = await st(page); const players = await page.evaluate(() => window.__game.game.players.map(I => [I.name, I.pad]));
  check('player 2 joins on pad 1; both pick by pad', s.mode === 'fight' && players.length === 2 && players[1][1] === 1, JSON.stringify({ s, players }));
  await page.waitForFunction(() => window.__game.scenes.fighting.state().phase === 'fight', null, { timeout: 5000 }).catch(() => {});
  await lowLife(page);
  await pad(page, 0, [], [1, 0]); await pad(page, 1, [], [-1, 0]); await wait(1200);   // the sticks walk them in
  s = await fightUntil(page, 20000, async () => { await pad(page, 0, [3], [1, 0]); await wait(60); await pad(page, 0, [], [1, 0]); await wait(190); await pad(page, 1, [3], [-1, 0]); await wait(60); await pad(page, 1, [], [-1, 0]); await wait(190); });
  await page.screenshot({ path: resolve(out, 'ko-pads.png') });
  check('each pad moves and strikes its own fighter until a KO', ['ko', 'win', 'over'].includes(s.phase) && s.life.some(l => l <= 0) && !errors.length, JSON.stringify({ phase: s.phase, life: s.life, errors }));
  await ctx.close();
}

console.log('4. the CPU\'s matches repeat');
{
  const { page, ctx, errors } = await open('#fighting');
  const r = await page.evaluate(() => window.__game.scenes.fighting.bot(3));
  check('two CPUs fight a match to its end, twice, the same', r.over && r.repeat && r.wins[r.winner] >= 2 && !r.errors && !errors.length, JSON.stringify(r));
  await ctx.close();
}

console.log('5. training');
{
  const { page, ctx, errors } = await open('#fighting/training');
  await page.keyboard.press('KeyU'); await wait(1200);   // player 1 picks (the CPU takes the dummy)
  await page.keyboard.down('ArrowRight'); await wait(1400); await page.keyboard.up('ArrowRight');
  await page.keyboard.press('KeyU'); await wait(500);
  const last = await page.evaluate(() => window.__game.scenes.fighting.match().f[0].last);
  await page.screenshot({ path: resolve(out, 'training.png') });
  check('a jab shows its frame data (startup 3, active 3, recovery 7)', !!last && last.id === 'jab' && last.startup === 3 && last.active === 3 && last.recovery === 7, JSON.stringify(last));
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); await wait(100); }
  const s = await st(page);
  check('Tab changes the dummy (stand, crouch, jump, guard)', s.dummy === 'guard' && !errors.length, s.dummy);
  await ctx.close();
}

await browser.close();
console.log(problems.length ? `\nfight test FAILED (${problems.length}):\n  ${problems.join('\n  ')}` : '\nfight test passed');
process.exit(problems.length ? 1 : 0);
