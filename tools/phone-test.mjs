// The phone test: the starter kits played on an emulated phone (touch, 390 x 844 CSS pixels at 3x, held upright and on its
// side), fast (about a minute), for what a player finds in ten minutes with a real one:
//   1. every kit: a tap on its title entry starts it (the first tap, the one that goes full screen), with no page errors
//   2. shooter: one continuous thumb drag, started anywhere (the right half too), flies the ship from one side of the
//      playfield to the other and back (no lifting the thumb to go on)
//   3. brawler: walking right, no street is ever on screen beyond where the hero can walk (the camera stops at a fight's
//      lock, so the screen's edge is the wall)
//   4. adventure: a phone gets Fast lighting (no GPU lighting, Settings: Lighting), and a frame draws within budget;
//      pacing: on a 120 Hz screen a frame that won't fit is drawn every other refresh, evenly (game.drawEvery), and a GPU
//              behind (refreshes missed) the same, then each refresh again after a hold; on a virtual clock (deterministic,
//              a minute of play in seconds): the hold's backoff, a display changing its refresh rate while paced, the
//              player's Frame rate (Auto, 60, Full)
//      session: a recorded page (?record=1) saves its session from the pause menu (its frame times: the device's refreshes)
//   5. rpg: the battle (#rpg/battle): a whole turn is played by taps, and every tap target (commands, foes) is at least
//      44 CSS pixels (a thumb)
//   7. roguelike: a tap on a floor cell it has seen walks the hero there, a cell a turn (the grid's path)
//   8. puzzle: a tap on BLOCKS starts it; a drag sideways moves the piece a cell a step of the thumb, a tap turns it
//   9. arcade: each of its three games from the cabinet to its high-score table: by taps on a phone (a cabinet, then the
//      letter wheel's arrows and OK, every target at least 44 CSS pixels), by keys (the continue too) and by a gamepad on
//      a computer; left alone, the cabinet plays a demo and comes back to its table, then its title
//  11. fighting: a tap on a portrait picks a fighter; four thumb-sized buttons; the stick walks it; a quarter circle on
//      the stick and a tap on LP throw a fireball
//  12. metroidvania: three thumb-sized buttons (JUMP, FIRE, MAP; DASH once found); the stick walks the hero and aims
//  13. kart: DRIFT and ITEM, thumb-sized; it accelerates by itself; the stick steers
//  14. road: BRAKE and GEAR, thumb-sized; it accelerates by itself; the stick steers; GEAR changes gear
//  15. rpg's journey: its windows' rows a thumb's height; a tap on New game starts it; the stick walks the party; MENU
//      opens the menu, a tap on a row opens it, BACK closes it
//  16. tactics: the command list's rows a thumb's height; a tap on a unit selects it (its card); MOVE, then a tap on a
//      blue cell walks the hero there; ATTACK, then a tap on a foe in range strikes it; TURN turns the view a quarter
//  17. army (tools/fixtures/army.html, the strategy module): 200 units under orders update and draw within the budget
//      (30 ms, the median); r.pick gives what was drawn under a point, front to back; a tap on a unit selects it, a tap
//      on open ground orders it there, a drag pans the camera, a long press and a drag draws a box that selects
//  18. rts: HALL, ARMY and IDLE and the panel's commands a thumb's size; HALL selects the hall, WORKER trains one; a tap
//      selects a worker, BARRACKS then a tap shows the plan there and PLACE sends him to build it; a tap selects a
//      footman and a tap on open ground orders him there; a drag pans the camera
//  19. sim: the tools and the time controls a thumb's size; 4X, then pause; PATH then a tap lays a tile; DRINK, a tap
//      and PLACE build a lemonade stand; a tap on the carousel shows its price, + raises it; 1X; a drag pans the camera
//  20. pointclick: a tap walks the hero; a tap on a hotspot shows its verbs (the coin), each a thumb's size; TAKE picks
//      the rope up; its inventory slot a thumb's size, a tap puts it on the cursor and a tap takes it off; a long press
//      looks (at the tavern's door); a tap on a person, TALK, and a tap on a choice picks it
//      the cannon (held up, a shot goes up); JUMP jumps; MAP opens the map and closes it
//  10. shooter's arcade frame: the vertical stage's last ship lost brings a continue a tap takes; the horizontal stage
//      (#shooter/horizontal) plays; its end brings initials by taps, the table, and a tap goes to the title
//   6. zoom: the player's own camera zoom on top of the slice's (camera: { zoom: [min, max], start, tall }): two fingers
//      pinch it (not the stick: a thumb steering beside a resting finger doesn't), kept; none where a slice has it off
//      (the shooter); a phone held upright starts at the slice's tall zoom; Settings, Camera zoom; the wheel and - = on a
//      computer
// Usage: node tools/phone-test.mjs [kit ...]   (run node tools/build.mjs first; CHROMIUM_PATH picks a browser). Exit code 1
// on failure. Each check prints what it measured, so a failure says what a player would have seen.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const want = k => !only.length || only.includes(k);
const UP = { width: 390, height: 844 }, SIDE = { width: 844, height: 390 };
const problems = [], t0 = Date.now();
const check = (name, ok, detail) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); if (!ok) problems.push(name + (detail ? ': ' + detail : '')); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
/** a kit on a phone: its page, a CDP session (raw touches) and the page's errors */
async function open(kit, vp, hash = kit, init) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(resolve(`dist/kits/my-3d2dge-${kit}.html`)).href + (hash ? '#' + hash : ''));
  await page.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName);
  return { page, ctx, errors, cdp: await ctx.newCDPSession(page) };
}
const ev = (p, fn, arg) => p.evaluate(fn, arg);
const wait = ms => new Promise(r => setTimeout(r, ms));
/** game (screen) pixels -> CSS pixels on the page */
const toCss = (p, x, y) => ev(p, ([x, y]) => { const S = window.__game.game.screen, rc = S.canvas.getBoundingClientRect(); return [rc.left + (x * S.S + S.OX) / S.dpr, rc.top + (y * S.S + S.OY) / S.dpr]; }, [x, y]);
/** one finger, pressed at the first point, moved through the rest (ms per step), lifted */
async function drag(cdp, pts, ms = 25) {
  const at = (type, q) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: q ? [{ x: q[0], y: q[1], id: 1 }] : [] });
  await at('touchStart', pts[0]); for (const q of pts.slice(1)) { await at('touchMove', q); await wait(ms); } await at('touchEnd');
}
/** fingers (one [x, y] each, ids 1, 2, ...) pressed at their first points, moved together through n steps to their last */
async function fingers(cdp, from, to, n = 12, ms = 20) {
  const at = k => from.map((p, i) => ({ x: p[0] + (to[i][0] - p[0]) * k, y: p[1] + (to[i][1] - p[1]) * k, id: i + 1 }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
  for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / n) }); await wait(ms); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);

/* 1. a tap on the title's entry starts the kit */
console.log('title: the first tap starts the game');
for (const kit of ['adventure', 'pointclick', 'platformer', 'metroidvania', 'shooter', 'arcade', 'kart', 'road', 'puzzle', 'rpg', 'roguelike', 'tactics', 'rts', 'sim', 'brawler', 'fighting', 'stealth', 'animlab']) {
  if (!want(kit)) continue;
  const { page, ctx, errors } = await open(kit, UP, '');
  await wait(400);
  const b = await ev(page, () => { const m = window.__game.titleMenu._box; return m && [m.x + m.w / 2, m.y + m.rowH / 2]; });
  if (!b) { check(`${kit}: the title menu is drawn`, false, 'no menu box'); await ctx.close(); continue; }
  const [x, y] = await toCss(page, b[0], b[1]); await page.touchscreen.tap(x, y); await wait(700);
  const scene = await ev(page, () => window.__game.game.sceneName);
  check(`${kit}: one tap on its title entry starts it`, scene === kit && !errors.length, `scene ${scene}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

/* 2. shooter: one drag crosses the playfield, from anywhere */
if (want('shooter')) {
  console.log('shooter: a thumb drag crosses the screen');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('shooter', vp);
    await wait(3600);   // past the stage card
    const st = () => ev(page, () => { const s = window.__game.game.scene.state(); return { x: s.ship.x, span: s.span }; });
    // the ship can't be shot down mid-swipe (a respawning ship doesn't steer: that would test the waves, not the thumb)
    const calm = async () => { await page.waitForFunction(() => !(window.__game.game.scene.state().ship.respawn > 0), null, { timeout: 8000 }); await ev(page, () => { window.__game.game.scene.state().ship.inv = 60; }); };
    await calm(); const s0 = await st(), w = vp.width, h = vp.height;
    // started on the right half (the stick's old dead zone), swiped over 72% of the screen to the left without lifting
    await drag(cdp, line([w * .8, h * .55], [w * .08, h * .55], 24)); const s1 = await st();
    await calm(); await drag(cdp, line([w * .25, h * .5], [w * .95, h * .5], 24)); const s2 = await st();   // (a swipe over 70% of the screen)
    const [fa, fb] = s0.span, left = s1.x - (fa + 10), right = (fb - 10) - s2.x;
    check(`shooter ${label}: one drag from the right half flies the ship to the left edge`, left < 4, `ship at ${s1.x.toFixed(0)}, the edge at ${(fa + 10).toFixed(0)}`);
    check(`shooter ${label}: one drag flies it back to the right edge`, right < 4 && !errors.length, `ship at ${s2.x.toFixed(0)}, the edge at ${(fb - 10).toFixed(0)}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 3. brawler: the walkable street ends where the screen does */
if (want('brawler')) {
  console.log('brawler: the street on screen is the street you can walk');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, errors } = await open('brawler', vp);
    await wait(800);
    const sample = () => ev(page, () => { const g = window.__game.game, s = g.scene.state(); return { right: (g.cam.x + g.W) / g.view.ax, end: s.end, x: s.hero.x }; });
    let worst = { over: -1e9 }; await page.keyboard.down('ArrowRight');
    for (let i = 0; i < 40; i++) { await wait(100); const s = await sample(), over = s.right - (s.end + 12); if (over > worst.over) worst = { over, ...s }; }
    await page.keyboard.up('ArrowRight');
    check(`brawler ${label}: no street on screen beyond the walkable end`, worst.over <= 0 && !errors.length, `screen's right edge ${worst.right.toFixed(0)}, walkable to ${worst.end.toFixed(0)}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 4. adventure: Fast lighting on a phone, and a frame in budget */
if (want('adventure')) {
  console.log('adventure: smooth on a phone');
  const { page, ctx, errors } = await open('adventure', UP);
  await page.touchscreen.tap(300, 150); await wait(800);
  const r = await ev(page, () => new Promise(res => {
    const g = window.__game.game, d = []; let n = 0;
    const tick = () => { d.push(g.stats.renderMs + g.stats.updateMs); if (++n < 90) requestAnimationFrame(tick); else res({ light: g.settings.advLight, gpu: !!(g.gpu && g.gpu.enabled), ms: d.sort((a, b) => a - b)[45] }); };
    requestAnimationFrame(tick);
  }));
  check('adventure: a phone gets Fast lighting (no GPU lighting)', r.light === 'auto' && !r.gpu, `setting ${r.light}, GPU lighting ${r.gpu ? 'on' : 'off'}`);
  check('adventure: a frame updates and draws within 30 ms (median)', r.ms < 30 && !errors.length, `${r.ms.toFixed(1)} ms${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

/* 4b. a 120 Hz phone (frames on an 8.33 ms grid, real timers; a late frame waits for the next): a frame that won't fit is
   drawn every other refresh, evenly, instead of at random. (A light frame drawn every refresh is checked on 4c's virtual
   clock: here a busy machine's late timers miss refreshes, which the engine is right to pace) */
if (want('pacing')) {
  console.log('pacing: a 120 Hz screen');
  const ctx = await browser.newContext({ viewport: UP, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const P = 1000 / 120, t0 = performance.now(), q = new Map(); let id = 0;
    const at = () => t0 + Math.ceil((performance.now() - t0 + .01) / P) * P;
    const pump = () => { const v = at() - P, run = [...q.values()]; q.clear(); for (const f of run) f(v); setTimeout(pump, Math.max(0, at() - performance.now())); };
    window.requestAnimationFrame = f => { q.set(++id, f); return id; }; window.cancelAnimationFrame = i => q.delete(i); setTimeout(pump, P);
  });
  await page.goto(pathToFileURL(resolve('dist/kits/my-3d2dge-stealth.html')).href + '#stealth');
  await page.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName === 'stealth');
  // the scene's frame made to cost ms (busy, or nothing: light), then measured over 2 s: the refresh read, every how many
  // refreshes, the gaps. Light first, as a phone's title would be: the engine reads the refresh from frames that fit one, and
  // the scene's own may not on a slow machine (8 to 16 ms on a 4-core cloud box), where busy frames from the start read
  // 60 Hz but for timers that happen to fire early (a 10 ms frame from the first refresh is checked on 4c's virtual clock)
  const run = (ms, pace) => ev(page, ([ms, pace]) => new Promise(res => {
    const g = window.__game.game, d0 = g.__d0 || (g.__d0 = g.scene.draw); g.o.pace = pace;
    g.scene.draw = ms ? r => { const t = performance.now() + ms; while (performance.now() < t); } : () => {};
    const f0 = g.__f0 || (g.__f0 = g._frame.bind(g)), gaps = []; let last = 0;
    g._frame = () => { const now = performance.now(); if (last) gaps.push(now - last); last = now; f0(); };
    setTimeout(() => { const s = gaps.slice(gaps.length >> 1), even = s.filter(x => x > 12 && x < 21).length / s.length; res({ hz: g.hz, every: g.drawEvery, even: Math.round(even * 100) }); }, 2000);
  }), [ms, pace]);
  // (light then heavy, and once more if either reading misses: on a busy machine a window of either can fall to 60 Hz
  // in the browser itself, so the refresh reads 60 or the pacer hasn't chosen yet; one that never reads it fails both)
  let heavy; for (let k = 0; k < 2; k++) { await run(0, undefined); heavy = await run(10, undefined); if (heavy.hz >= 110 && heavy.hz <= 130 && heavy.every === 2 && heavy.even >= 80) break; }
  const off = await run(10, false);
  check('pacing: the screen reads 120 Hz', heavy.hz >= 110 && heavy.hz <= 130, `${heavy.hz} Hz`);
  check('pacing: a 10 ms frame is drawn every other refresh, evenly (16.7 ms apart)', heavy.every === 2 && heavy.even >= 80, `every ${heavy.every}, ${heavy.even}% of gaps 16.7 ms`);
  check('pacing: pace: false draws every refresh', off.every === 1 && !errors.length, `every ${off.every}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

/* 4c. pacing on a virtual clock (a fresh page: no history from 4b): the test owns performance.now and the display's
   refreshes (__vt.run(ms, hz)), a frame drawn costs vt.cost ms and then its GPU vt.gpu ms (gpu - 3 and gpu + 3 by turns:
   some frames fit a refresh, some don't), a refresh comes when both are free. Deterministic, and faster than real time
   (the scene's drawing stubbed after the first check): a GPU that falls behind (no clock in the page sees it: the refreshes missed are the sign), the hold
   before each refresh is tried again and its backoff, and a display that changes its refresh rate while paced */
if (want('pacing')) {
  console.log('pacing: a virtual clock');
  const ctx = await browser.newContext({ viewport: UP, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    let T = 0, V = -10 / 3, busy = 0, id = 0, k = 0; const q = new Map();   // (the first refresh 5 ms after start(): no refresh's gap)
    performance.now = () => T;
    window.requestAnimationFrame = f => { q.set(++id, f); return id; }; window.cancelAnimationFrame = i => q.delete(i);
    const vt = window.__vt = { cost: 1, gpu: 0, draws: [],
      hook(g) { const f0 = g._frame.bind(g); g._frame = () => { vt.draws.push(T); f0(); T += vt.cost; if (vt.gpu) busy = T + vt.gpu + (k++ % 2 ? 3 : -3); }; },
      // ms of refreshes at hz (the refresh grid carries on from the last one); a refresh while the frame before it is
      // still running, or its GPU still drawing, is skipped
      run(ms, hz) { const P = 1000 / hz, end = V + ms; while (V + P <= end + 1e-6) { V += P; if (T > V || V < busy) continue; T = V; const fs = [...q.values()]; q.clear(); for (const f of fs) f(V); } },
      // the same in steps of 50 ms: [ms from now, drawEvery, hz] after each
      watch(ms, hz) { const g = window.__game.game, out = []; for (let t = 50; t <= ms; t += 50) { vt.run(50, hz); out.push([t, g.drawEvery, g.hz]); } return out; },
      // the gaps between frames drawn in the last ms
      gaps(ms) { const d = vt.draws, t0 = d[d.length - 1] - ms, out = []; for (let i = 1; i < d.length; i++) if (d[i - 1] >= t0) out.push(+(d[i] - d[i - 1]).toFixed(2)); return out; } };
  });
  await page.goto(pathToFileURL(resolve('dist/kits/my-3d2dge-stealth.html')).href + '#stealth');
  await page.waitForFunction(() => window.__vt && window.__game && window.__game.game, null, { polling: 50 });
  const vt = (fn, arg) => ev(page, fn, arg);
  // when drawEvery turned 2 in a watch's timeline (ms from its start, to 50 ms; null: never)
  const on = tl => (tl.find(e => e[1] === 2) || [null])[0];
  const even = gs => Math.round(gs.filter(x => Math.abs(x - 16.67) < .1).length / Math.max(1, gs.length) * 100);
  const state = () => vt(() => { const g = window.__game.game; return { scene: g.sceneName, every: g.drawEvery, hz: g.hz, gaps: __vt.gaps(300) }; });
  // a 10 ms frame from the first refresh (which came 5 ms after start(): read as one, 200 Hz until 90 more were)
  await vt(() => { __vt.hook(window.__game.game); __vt.cost = 10; __vt.run(1000, 120); });
  const first = await state();
  check('virtual: a 10 ms frame from the first refresh: every other refresh, the screen read 120 Hz', first.scene === 'stealth' && first.every === 2 && first.hz === 120 && even(first.gaps) === 100, `${first.scene}, every ${first.every}, ${first.hz} Hz, ${even(first.gaps)}% of gaps 16.7 ms`);
  // light frames from then on: every refresh again once the 3 s hold the first frames' missed refreshes started is over
  // (14 s: the hold back to 3 s for the next, below)
  await vt(() => { window.__game.game.scene.draw = () => {}; __vt.cost = 1; __vt.run(14000, 120); });   // (the scene's own drawing off: its cost is vt.cost)
  const start = await state();
  check('virtual: a light frame, its GPU keeping up: every refresh', start.every === 1 && start.hz === 120, `every ${start.every}, ${start.hz} Hz`);
  // a GPU behind: paced within a quarter second, frames evenly 16.7 ms apart, the refresh still read 120 Hz
  const behind = await vt(() => { __vt.gpu = 8; return { tl: __vt.watch(1000, 120), gaps: __vt.gaps(500) }; });
  const b = behind.tl[behind.tl.length - 1];
  check('virtual: a GPU behind is drawn every other refresh within 0.25 s, evenly', on(behind.tl) <= 250 && b[1] === 2 && even(behind.gaps) === 100 && b[2] === 120, `paced at ${on(behind.tl)} ms, every ${b[1]}, ${even(behind.gaps)}% of gaps 16.7 ms, ${b[2]} Hz`);
  // the GPU keeps up again: every refresh after the hold (3 s from pacing), not before
  const back1 = await vt(() => { __vt.gpu = 0; return __vt.watch(5000, 120); });
  const r1 = back1.find(e => e[1] === 1), at1 = r1 ? r1[0] + 1000 - on(behind.tl) : null;   // (the hold's first part spent in behind's watch)
  check('virtual: the GPU keeping up again, every refresh after a 3 s hold', at1 !== null && at1 >= 3000 && at1 <= 3300, `every refresh again ${at1} ms after pacing`);
  // behind again at once: the hold doubles (6 s)
  const twice = await vt(() => { __vt.gpu = 8; const a = __vt.watch(500, 120); __vt.gpu = 0; return { a, b: __vt.watch(8000, 120) }; });
  const r2 = twice.b.find(e => e[1] === 1), at2 = r2 ? r2[0] + 500 - on(twice.a) : null;
  check('virtual: behind again soon after, the hold doubles (6 s)', on(twice.a) !== null && at2 >= 6000 && at2 <= 6300, `paced at ${on(twice.a)} ms, every refresh again ${at2} ms after`);
  // 11 s drawn at each refresh, then behind: the hold is 3 s again
  const reset = await vt(() => { __vt.run(11000, 120); __vt.gpu = 8; const a = __vt.watch(500, 120); __vt.gpu = 0; return { a, b: __vt.watch(8000, 120) }; });
  const r3 = reset.b.find(e => e[1] === 1), at3 = r3 ? r3[0] + 500 - on(reset.a) : null;
  check('virtual: after 10 s at each refresh, the hold is 3 s again', on(reset.a) !== null && at3 >= 3000 && at3 <= 3300, `paced at ${on(reset.a)} ms, every refresh again ${at3} ms after`);
  // paced (a 6 s hold), the display drops to 90 Hz: its refresh is learnt again while paced
  const slower = await vt(() => { __vt.gpu = 8; __vt.watch(500, 120); __vt.gpu = 0; return __vt.watch(2000, 90); });
  const s = slower[slower.length - 1];
  check('virtual: paced, a display that drops to 90 Hz reads 90 Hz within 2 s', s[1] === 2 && s[2] === 90, `every ${s[1]}, ${s[2]} Hz`);
  // still paced, it rises to 144 Hz: read at once (a shorter gap than the refresh read), every other refresh 13.9 ms apart
  const faster = await vt(() => { const tl = __vt.watch(600, 144); return { tl, gaps: __vt.gaps(200) }; });
  const f = faster.tl[faster.tl.length - 1], f13 = faster.gaps.filter(x => Math.abs(x - 13.89) < .1).length / Math.max(1, faster.gaps.length);
  check('virtual: paced, a display that rises to 144 Hz is drawn every other refresh, 13.9 ms apart', f[1] === 2 && f[2] === 144 && f13 === 1, `every ${f[1]}, ${f[2]} Hz, gaps ${[...new Set(faster.gaps)].join(', ')} ms`);
  // the player's Frame rate (Settings, Display) on a 120 Hz screen, past any hold: 60 draws every other refresh with light
  // frames and its GPU keeping up, Full every refresh with its GPU behind, Auto back to the engine's call
  const fr = await vt(() => { const g = window.__game.game, out = {}; __vt.gpu = 0; __vt.run(5000, 120);   // (the 6 s hold from the 90 Hz check over)
    g.settings.set('frameRate', '60'); __vt.run(1000, 120); out.sixty = [g.drawEvery, __vt.gaps(300)];
    g.settings.set('frameRate', 'full'); __vt.gpu = 8; __vt.run(1000, 120); out.full = [g.drawEvery, __vt.gaps(300)];
    g.settings.set('frameRate', 'auto'); __vt.run(1000, 120); out.auto = g.drawEvery; __vt.gpu = 0; return out; });
  check('virtual: Frame rate 60 draws every other refresh of a 120 Hz screen, its frames light', fr.sixty[0] === 2 && even(fr.sixty[1]) === 100, `every ${fr.sixty[0]}, ${even(fr.sixty[1])}% of gaps 16.7 ms`);
  check('virtual: Frame rate Full draws every refresh, its GPU behind; Auto paces it again', fr.full[0] === 1 && fr.full[1].some(x => Math.abs(x - 8.33) < .1) && fr.auto === 2, `every ${fr.full[0]} (gaps ${[...new Set(fr.full[1])].join(', ')} ms), Auto: every ${fr.auto}`);
  // 60 on a screen of exactly 100 Hz: every other refresh; then, still 60, the display drops to 60 Hz: after 90 long gaps
  // in a row the refresh is read afresh (60 Hz, every refresh: not 120 HZ EVERY 2 for good)
  const drop = await vt(() => { const g = window.__game.game, out = {}; __vt.run(5000, 120); g.settings.set('frameRate', '60');
    __vt.run(2000, 100); out.hundred = [g.drawEvery, g.hz]; __vt.run(2000, 120); __vt.run(2500, 60); out.sixty = [g.drawEvery, g.hz, __vt.gaps(300)];
    g.settings.set('frameRate', 'auto'); __vt.run(2000, 120); return out; });
  check('virtual: Frame rate 60 halves a 100 Hz screen too', drop.hundred[0] === 2 && drop.hundred[1] === 100, `every ${drop.hundred[0]}, ${drop.hundred[1]} Hz`);
  check('virtual: at 60, a display that drops to 60 Hz is read afresh: every refresh, 60 Hz', drop.sixty[0] === 1 && drop.sixty[1] === 60 && drop.sixty[2].every(x => Math.abs(x - 16.67) < .1), `every ${drop.sixty[0]}, ${drop.sixty[1]} Hz, gaps ${[...new Set(drop.sixty[2])].join(', ')} ms`);
  // a game made with pace: false, its GPU behind (Auto would pace it): every refresh with Auto, every other one when the
  // player picks 60
  const nopace = await vt(() => { const g = window.__game.game, out = {}; g.o.pace = false; __vt.gpu = 8; __vt.run(1500, 120); out.auto = g.drawEvery;
    g.settings.set('frameRate', '60'); __vt.run(500, 120); out.sixty = g.drawEvery; g.settings.set('frameRate', 'auto'); g.o.pace = undefined; __vt.gpu = 0; return out; });
  check('virtual: pace: false draws every refresh, unless the player picks 60', nopace.auto === 1 && nopace.sixty === 2 && !errors.length, `Auto: every ${nopace.auto}, 60: every ${nopace.sixty}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

/* 4d. a recorded page (?record=1) saves its session from the pause menu (a phone has no console): its frame times, the
   device's own refreshes, are what a report of choppy play needs */
if (want('session')) {
  console.log('session: saved from the menu');
  const ctx = await browser.newContext({ viewport: SIDE, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { navigator.canShare = () => true; navigator.share = d => d.files[0].text().then(t => { window.__shared = { name: d.files[0].name, frames: JSON.parse(t).frames.length, text: t }; }); });
  await page.goto(pathToFileURL(resolve('dist/kits/my-3d2dge-adventure.html')).href + '?record=1#adventure');
  await page.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName === 'adventure');
  await wait(1000);
  await page.tap('#e3-corner button[aria-label=Menu]'); await wait(300);
  const btns = await ev(page, () => [...document.querySelectorAll('.esh-sh button')].map(b => b.textContent));
  const save = await page.$('.esh-sh button:has-text("Save session")'); if (save) await save.tap();
  await page.waitForFunction(() => window.__shared, null, { timeout: 3000 }).catch(() => {});
  const got = await ev(page, () => window.__shared || null);
  check('session: a recorded page\'s pause menu has Save session; it shares the session, its frame times in it', btns.includes('Save session') && got && /^session-.*\.json$/.test(got.name) && got.frames > 30 && !errors.length, `${btns.join(', ')}; shared ${got ? got.name + ' with ' + got.frames + ' frames' : 'nothing'}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
  await ctx.close();
  // the saved session replays exactly, the tap on Save session included (its replay has the button: it lands on it)
  if (got) {
    const dir = resolve('check-output/phone'), f = dir + '/session.json'; mkdirSync(dir, { recursive: true }); writeFileSync(f, got.text);
    let out = '', ok = true; try { out = execFileSync('node', ['tools/replay.mjs', f, '--out', dir + '/replay', '--log', '"screen: " + window.__game.game.shell.screen'], { encoding: 'utf8', timeout: 120000 }); } catch (e) { ok = false; out = (e.stdout || '') + (e.stderr || ''); }
    const last = out.trim().split('\n').filter(l => /match|diverg|missing|threw|played|screen:/i.test(l)).slice(-3).join(' | ');
    check('session: the saved session replays exactly, its last tap on Save session (the menu still open, not Quit\'s question)', ok && /screen: pause/.test(out), last || out.trim().split('\n').slice(-2).join(' | '));
  }
  // replay --pacing reads a session's refreshes: one made up of 3 s begun hidden (a frame a second; only its showing is
  // recorded), 2 s at 120 Hz, 2 s at 60 Hz (adaptive refresh: nothing missed), 5 s hidden, 1 s at 120 Hz and a 2.5 s
  // stall (its 299 missed refreshes over the seconds it took). The hidden time is left out
  const Fs = [0, 1000, 2000], evs = [[3, 'visibilitychange', 'document', 0]], run = (n, p) => { for (let i = 0; i < n; i++) Fs.push(Fs[Fs.length - 1] + p); };
  Fs.push(3000); run(240, 1000 / 120); run(120, 1000 / 60); evs.push([Fs.length, 'visibilitychange', 'document', 1]); Fs.push(Fs[Fs.length - 1] + 5000); evs.push([Fs.length - 1, 'visibilitychange', 'document', 0]);
  run(120, 1000 / 120); Fs.push(Fs[Fs.length - 1] + 2500); run(120, 1000 / 120);
  const sf = resolve('check-output/phone/synthetic-session.json'); mkdirSync(resolve('check-output/phone'), { recursive: true });
  writeFileSync(sf, JSON.stringify({ format: 'my3d2dge-session', v: 1, version: '0', build: 'synthetic', href: '/kits/adventure', ua: 'synthetic', frames: Fs, events: evs }));
  const rep = execFileSync('node', ['tools/replay.mjs', sf, '--pacing'], { encoding: 'utf8' }), cols = rep.split('second by second')[1].split('\n').slice(1).join(' ').trim().split(/\s+/);
  const miss = +(rep.match(/(\d+) refreshes missed/) || [])[1];
  check('session: replay --pacing reads a 60 Hz stretch as nothing missed, leaves hidden time out, spreads a stall over its seconds', miss >= 295 && miss <= 305 && /hidden for 4 gaps/.test(rep) && cols.filter(c => /\/0\/17@60$/.test(c)).length === 2 && cols.filter(c => c === '-').length >= 7 && cols.filter(c => /\/2500$/.test(c)).length === 3, `${miss} missed; ${cols.join(' ')}`);
}

/* 5. rpg: thumb-sized buttons, a turn played by taps, AUTO */
if (want('rpg')) {
  console.log('rpg: a battle played by thumb');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, errors } = await open('rpg', vp, 'rpg/battle');
    await page.touchscreen.tap(vp.width * .5, vp.height * .12);   // the device is touch now
    await page.waitForFunction(() => window.__game.game.scene.state().mode === 'command', null, { timeout: 8000 });
    const st = () => ev(page, () => window.__game.game.scene.state());
    const k = await ev(page, () => { const S = window.__game.game.screen; return S.S / S.dpr; });   // CSS pixels per screen pixel
    const tapPad = async (p) => { const [x, y] = await toCss(page, p.x + p.w / 2, p.y + p.h / 2); await page.touchscreen.tap(x, y); await wait(250); };
    const s0 = await st(), small = s0.pads.filter(p => p && (p.w * k < 44 || p.h * k < 44));
    check(`rpg ${label}: every button is thumb-sized (44 CSS px or more)`, s0.pads.filter(Boolean).length === 6 && !small.length, `${s0.pads.filter(Boolean).map(p => p.label).join(', ')}: smallest ${Math.min(...s0.pads.filter(Boolean).map(p => Math.min(p.w, p.h) * k)).toFixed(0)} CSS px`);
    await tapPad(s0.pads.find(p => p && p.label === 'Attack')); const s1 = await st();
    const foe = s1.pads.find(p => p && p.label === 'Gargoyle'), back = s1.pads.find(p => p && p.label === 'BACK');
    check(`rpg ${label}: Attack shows a button per foe and BACK`, s1.mode === 'target' && !!foe && !!back, `mode ${s1.mode}, ${s1.pads.filter(Boolean).map(p => p.label).join(', ')}`);
    if (foe) { await tapPad(foe); const s2 = await st(); check(`rpg ${label}: a foe's button sends the hero at it`, s2.mode === 'act' && s2.act === 'chop', `mode ${s2.mode}, act ${s2.act}`); }
    if (label === 'upright') {   // AUTO: the party fights on with no more taps
      await page.waitForFunction(() => window.__game.game.scene.state().mode !== 'act', null, { timeout: 8000 });
      const a = (await st()).pads.find(p => p && p.label === 'AUTO'); await tapPad(a);
      const acts = new Set(); let end = '';
      for (let i = 0; i < 120 && acts.size < 4 && !end; i++) { await wait(100); const q = await st(); if (q.act) acts.add(q.actor + ' ' + q.act); if (/win|won|lose/.test(q.mode)) end = q.mode; if (q.mode === 'command') { end = 'waiting for a tap'; break; } }
      check('rpg: AUTO fights on by itself', acts.size >= 4 || end === 'won' || end === 'win', `${[...acts].join(', ')}${end ? ' (' + end + ')' : ''}`);
    }
    check(`rpg ${label}: no page errors`, !errors.length, errors.join(' | '));
    await ctx.close();
  }
}

/* 6. zoom: the player zooms the camera, on top of the slice's own */
if (want('zoom')) {
  console.log('zoom: the player\'s camera zoom');
  const { page, ctx, cdp, errors } = await open('adventure', UP);
  await wait(800);
  const st = () => ev(page, () => { const g = window.__game.game, h = g.scene.state().hero; return { zoom: g.zoom, f: +g.settings.zoom.toFixed(3), x: h.x, y: h.y }; });
  const s0 = await st();
  // apart: while the fingers move, the world drawn is scaled (a preview: no new size baked at every step); a quarter second
  // after they lift it is drawn at the new zoom
  await fingers(cdp, [[160, 420], [230, 420]], [[70, 420], [320, 420]]); await wait(400); const s1 = await st();
  await fingers(cdp, [[60, 420], [330, 420]], [[100, 420], [290, 420]], 6); await wait(400); const s2 = await st();   // together, a little
  const walked = Math.max(Math.hypot(s1.x - s0.x, s1.y - s0.y), Math.hypot(s2.x - s1.x, s2.y - s1.y));
  check('zoom: two fingers apart zoom in, together out, the hero standing (not the stick)', s0.zoom === 1 && s1.zoom >= 1.8 && s2.zoom < s1.zoom - .3 && s2.zoom > 1 && Math.abs(s2.f - s2.zoom) < .05 && walked < 3, `${s0.zoom}x, apart ${s1.zoom}x, together ${s2.zoom}x, the hero moved ${walked.toFixed(1)}`);
  // a thumb steering (the stick, left half) while another finger rests on the glass: the hero walks, the zoom stays
  await fingers(cdp, [[100, 600], [300, 600]], [[30, 600], [300, 600]], 12, 40); await wait(400); const s3 = await st();
  check('zoom: a thumb on the stick beside a resting finger steers, and zooms nothing', s3.zoom === s2.zoom && s2.x - s3.x > 4, `${s3.zoom}x, the hero walked ${(s2.x - s3.x).toFixed(1)} left`);
  await page.reload(); await page.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName === 'adventure'); await wait(300);
  const s4 = await st();
  check('zoom: the player\'s zoom is kept (the page loaded again)', s4.zoom === s2.zoom && s4.f === s2.f && !errors.length, `${s4.zoom}x (factor ${s4.f})${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
  // Settings, Camera zoom: its slider zooms the camera under the menu
  await page.tap('#e3-corner button[aria-label=Menu]'); await wait(300);
  const sb = await page.$('.esh-sh button:has-text("Settings")'); if (sb) await sb.tap(); await wait(300);
  let row = await ev(page, () => { const r = [...document.querySelectorAll('.esh-row')].find(r => /^Camera zoom/.test(r.textContent)), i = r && r.querySelector('input[type=range]'); if (!i) return null; i.value = '1.5'; i.dispatchEvent(new Event('input')); return { out: r.querySelector('output').textContent }; });
  if (row) { await wait(400); row.zoom = await ev(page, () => window.__game.game.zoom); }
  check('zoom: Settings has Camera zoom; its slider zooms the camera', !!row && row.out === '1.5×' && row.zoom === 1.5, row ? `${row.out}: ${row.zoom}x` : 'no Camera zoom row');
  await ctx.close();
  // the shooter's playfield is the whole screen (camera: { zoom: false }): a pinch leaves it as it is
  const sh = await open('shooter', UP); await wait(600);
  await fingers(sh.cdp, [[160, 420], [230, 420]], [[70, 420], [320, 420]]); await wait(400);
  const shz = await ev(sh.page, () => window.__game.game.zoom);
  check('zoom: none where the slice has it off (the shooter)', shz === 1 && !sh.errors.length, `${shz}x${sh.errors.length ? ', errors: ' + sh.errors.join(' | ') : ''}`);
  await sh.ctx.close();
  // the brawler: a phone held upright starts at its tall 1.5x, on its side at 1x; the player's zoom multiplies either
  const br = await open('brawler', UP); await wait(600);
  const bz = () => ev(br.page, () => window.__game.game.zoom), up0 = await bz();
  await br.page.setViewportSize(SIDE); await wait(400); const side0 = await bz();
  await ev(br.page, () => window.__game.game.settings.set('zoom', .8)); await wait(400); const side1 = await bz();
  await br.page.setViewportSize(UP); await wait(400); const up1 = await bz();
  check('zoom: the brawler starts at 1.5x upright, 1x on its side; the player\'s .8 makes them 1.2x and .8x', up0 === 1.5 && side0 === 1 && side1 === .8 && up1 === 1.2 && !br.errors.length, `upright ${up0}x, on its side ${side0}x; at .8: ${side1}x, upright ${up1}x${br.errors.length ? ', errors: ' + br.errors.join(' | ') : ''}`);
  await br.ctx.close();
  // a computer: the wheel (a notch 10%), - and =, 0 resets
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }), dp = await dctx.newPage(), derr = [];
  dp.on('pageerror', e => derr.push(e.message));
  await dp.goto(pathToFileURL(resolve('dist/kits/my-3d2dge-adventure.html')).href + '#adventure');
  await dp.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName === 'adventure'); await wait(400);
  const dz = () => ev(dp, () => window.__game.game.zoom);
  await dp.mouse.move(640, 360); for (let i = 0; i < 3; i++) { await dp.mouse.wheel(0, -100); await wait(50); } await wait(400); const w3 = await dz();
  await dp.keyboard.press('Minus'); await wait(400); const m1 = await dz();
  await dp.keyboard.press('Digit0'); await wait(100); const r0 = await dz();
  check('zoom: on a computer the wheel zooms (3 notches: 1.35x), - steps out, 0 resets', w3 === 1.35 && m1 === 1.25 && r0 === 1 && !derr.length, `${w3}x, ${m1}x, ${r0}x${derr.length ? ', errors: ' + derr.join(' | ') : ''}`);
  await dctx.close();
}

/* 7. roguelike: tap to walk */
if (want('roguelike')) {
  console.log('roguelike: tap a cell to walk there');
  // (Math.random seeded: the same floor every run; a monster coming into view stops a walk, as it should)
  const { page, ctx, errors } = await open('roguelike', UP, 'roguelike', () => { let a = 20261028; Math.random = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }); await wait(900);
  // the farthest seen, walkable cell within a few steps, on screen
  const goal = await ev(page, () => { const s = window.__game.scenes.roguelike.state(), h = s.hero, g = window.__game.game, r = g.r; let best = null;
    for (const c of s.grid.reach([h.cx, h.cy], 5).cells) { if (!s.fog.visible([c[0], c[1]])) continue; const [x, y] = r.w((c[0] + .5) * 16, (c[1] + .5) * 16, 0), sx = x, sy = y; if (sx < 20 || sy < 60 || sx > g.W - 20 || sy > g.H - 120) continue; if (!best || c[2] > best.d) best = { c: [c[0], c[1]], d: c[2], sx, sy }; }
    return best && Object.assign(best, { from: [h.cx, h.cy] }); });
  if (!goal) check('roguelike: a seen cell to tap', false, 'none on screen');
  else {
    const [x, y] = await toCss(page, goal.sx, goal.sy); await page.touchscreen.tap(x, y);
    await page.waitForFunction(c => { const h = window.__game.scenes.roguelike.state().hero; return h.cx === c[0] && h.cy === c[1]; }, goal.c, { timeout: 8000 }).catch(() => {});   // (a cell a turn: on a slow machine the game's clock runs behind the page's)
    const at = await ev(page, () => { const h = window.__game.scenes.roguelike.state().hero; return [h.cx, h.cy]; });
    check(`roguelike: a tap ${goal.d} steps away walks the hero there`, at.join() === goal.c.join() && !errors.length, `from ${goal.from} to ${at}, wanted ${goal.c}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
  }
  await ctx.close();
}
/* 8. puzzle: drag and tap */
if (want('puzzle')) {
  console.log('puzzle: drag to move, tap to turn');
  const { page, ctx, cdp, errors } = await open('puzzle', UP); await wait(600);
  const entry = await ev(page, () => { const g = window.__game.game; return [g.W / 2, 92 + 6]; });   // BLOCKS, the menu's first entry
  const [ex, ey] = await toCss(page, entry[0], entry[1]); await page.touchscreen.tap(ex, ey); await wait(500);
  const s0 = await ev(page, () => { const s = window.__game.scenes.puzzle.state(); return s.cur && { mode: s.mode, x: s.cur.x, r: s.cur.r }; });
  const [cx, cy] = await toCss(page, 160, 300); await drag(cdp, line([cx, cy], [cx + 90, cy], 18), 30); await wait(300);
  const s1 = await ev(page, () => { const s = window.__game.scenes.puzzle.state(); return s.cur && { x: s.cur.x, r: s.cur.r, k: s.cur.k }; });
  await page.touchscreen.tap(cx, cy); await wait(300);
  const s2 = await ev(page, () => { const s = window.__game.scenes.puzzle.state(); return s.cur && { x: s.cur.x, r: s.cur.r }; });
  check('puzzle: a tap on BLOCKS starts it', !!s0 && s0.mode === 'blocks', JSON.stringify(s0));
  check('puzzle: a drag to the right moves the piece right, a cell a step', !!s0 && !!s1 && s1.x > s0.x, JSON.stringify([s0, s1]));
  check('puzzle: a tap turns it', !!s1 && !!s2 && (s2.r !== s1.r || s1.k === 'O') && !errors.length, JSON.stringify([s1, s2]) + (errors.length ? ' errors: ' + errors.join(' | ') : ''));
  await ctx.close();
}

/* 11. fighting: a fighter picked by a tap, the stick and four buttons, a motion on the stick */
if (want('fighting')) {
  console.log('fighting: a tap picks a fighter; the stick walks, four buttons strike, a quarter circle on the stick throws a fireball');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('fighting', vp, 'fighting/training'); await wait(700);
    const r0 = await ev(page, () => window.__game.scenes.fighting.select().rects[0]), [px0, py0] = await toCss(page, r0[0] + r0[2] / 2, r0[1] + r0[3] / 2);
    await page.touchscreen.tap(px0, py0); await wait(1600);
    const s0 = await ev(page, () => window.__game.scenes.fighting.state());
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, w: q.width, h: q.height, x: q.x + q.width / 2, y: q.y + q.height / 2 }; }));
    const acts = btns.map(b => b.act).sort().join(), small = Math.min(...btns.map(b => Math.min(b.w, b.h)));
    check(`fighting ${label}: a tap on RYO's portrait picks him; four buttons (LP HP LK HK), each a thumb's size`, s0.mode === 'fight' && s0.picks[0] === 'ryo' && acts === 'hk,hp,lk,lp' && small >= 44, `picks ${s0.picks}, buttons ${acts}, smallest ${Math.round(small)} CSS px`);
    // the stick: a thumb on the left of the screen dragged right walks RYO in
    const x0 = (await ev(page, () => window.__game.scenes.fighting.state())).x[0], sx = vp.width * .2, sy = vp.height * .78;
    await drag(cdp, line([sx, sy], [sx + 60, sy], 30), 25);
    const x1 = (await ev(page, () => window.__game.scenes.fighting.state())).x[0];
    // a quarter circle forward on the stick (down, down-forward, forward) while a second finger taps LP: the fireball
    await ev(page, () => { const m = window.__game.scenes.fighting.match(), f = m.f[0]; f.reset(f.x, 1); window.__fired = null; const tick = () => { if (f.act && !window.__fired) window.__fired = f.act.m.id; requestAnimationFrame(tick); }; tick(); });
    const R = await ev(page, () => window.__game.game.input.stickRadius || 50), lp = btns.find(b => b.act === 'lp');
    const T = (pts) => cdp.send('Input.dispatchTouchEvent', { type: pts.type, touchPoints: pts.p });
    await T({ type: 'touchStart', p: [{ x: sx, y: sy, id: 1 }] }); await wait(40);
    for (const [dx, dy] of [[0, .9], [.7, .7], [.9, 0]]) { await T({ type: 'touchMove', p: [{ x: sx + dx * R, y: sy + dy * R, id: 1 }] }); await wait(40); }
    await T({ type: 'touchStart', p: [{ x: sx + .9 * R, y: sy, id: 1 }, { x: lp.x, y: lp.y, id: 2 }] }); await wait(50);
    await T({ type: 'touchEnd', p: [{ x: sx + .9 * R, y: sy, id: 1 }] }); await wait(30); await T({ type: 'touchEnd', p: [] }); await wait(400);
    const fired = await ev(page, () => window.__fired);
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `fighting-${label.replace(/ /g, '-')}.png`) });
    check(`fighting ${label}: the stick walks RYO in; a quarter circle on it and a tap on LP throw the fireball`, x1 > x0 + 15 && /^fire/.test(fired || '') && !errors.length, `x ${Math.round(x0)} -> ${Math.round(x1)}, move ${fired}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 12. metroidvania: its buttons, the stick (walking and aiming), the map */
if (want('metroidvania')) {
  console.log('metroidvania: three thumb-sized buttons; the stick walks and aims; JUMP jumps; MAP opens and closes the map');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('metroidvania', vp); await wait(900);
    const st = () => ev(page, () => window.__game.scenes.metroidvania.state());
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, w: q.width, h: q.height, x: q.x + q.width / 2, y: q.y + q.height / 2 }; }));
    const acts = btns.map(b => b.act).sort().join(), small = Math.min(...btns.map(b => Math.min(b.w, b.h))), at = a => btns.find(b => b.act === a);
    check(`metroidvania ${label}: JUMP, FIRE and MAP (DASH not yet found), each a thumb's size`, acts === 'fire,jump,map' && small >= 44, `buttons ${acts}, smallest ${Math.round(small)} CSS px`);
    // the stick: a thumb on the left dragged right walks the hero; a tap on JUMP hops (a short press, a short jump)
    const s0 = await st(), sx = vp.width * .2, sy = vp.height * .75;
    await drag(cdp, line([sx, sy], [sx + 60, sy], 30), 25);
    const s1 = await st(); let top = s1.z;
    await page.touchscreen.tap(at('jump').x, at('jump').y); for (let i = 0; i < 6; i++) { await wait(60); top = Math.max(top, (await st()).z); }
    // held up on the stick, FIRE sends a shot upward
    const R = await ev(page, () => window.__game.game.input.stickRadius || 50), T = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p });
    await wait(500); await T('touchStart', [{ x: sx, y: sy, id: 1 }]); await wait(40); await T('touchMove', [{ x: sx, y: sy - R, id: 1 }]); await wait(120);
    const f = at('fire'); await T('touchStart', [{ x: sx, y: sy - R, id: 1 }, { x: f.x, y: f.y, id: 2 }]); await wait(60);
    const up = await ev(page, () => window.__game.scenes.metroidvania.state().shot);
    await T('touchEnd', [{ x: sx, y: sy - R, id: 1 }]); await wait(30); await T('touchEnd', []); await wait(200);
    check(`metroidvania ${label}: the stick walks the hero; JUMP jumps; held up, FIRE shoots up`, s1.x > s0.x + 15 && top > s1.z + 8 && !!up && up.vz > 200 && Math.abs(up.vx) < 40, `x ${Math.round(s0.x)} -> ${Math.round(s1.x)}, jump to ${Math.round(top - s1.z)} above, shot ${JSON.stringify(up)}`);
    // MAP opens the map; again, it closes
    await page.touchscreen.tap(at('map').x, at('map').y); await wait(250); const m1 = (await st()).mapOpen;
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `metroidvania-map-${label.replace(/ /g, '-')}.png`) });
    await page.touchscreen.tap(at('map').x, at('map').y); await wait(250); const m2 = (await st()).mapOpen;
    await page.screenshot({ path: resolve('check-output/phone', `metroidvania-${label.replace(/ /g, '-')}.png`) });
    check(`metroidvania ${label}: MAP opens the map, and closes it`, m1 === true && m2 === false && !errors.length, `open ${m1}, then ${m2}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 13. kart: its buttons, the gas by itself, the stick steering */
if (want('kart')) {
  console.log('kart: DRIFT and ITEM, thumb-sized; it accelerates by itself; the stick steers');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('kart', vp, 'kart/race'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(3600);   // (past the countdown)
    const st = () => ev(page, () => window.__game.scenes.kart.state().you);
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, w: q.width, h: q.height }; }));
    const acts = btns.map(b => b.act).sort().join(), small = Math.min(...btns.map(b => Math.min(b.w, b.h)));
    const s0 = await st(), sx = vp.width * .2, sy = vp.height * .75;
    await drag(cdp, line([sx, sy], [sx + 50, sy], 30), 30); const s1 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `kart-${label.replace(/ /g, '-')}.png`) });
    check(`kart ${label}: DRIFT and ITEM, each a thumb's size`, acts === 'drift,item' && small >= 44, `buttons ${acts}, smallest ${Math.round(small)} CSS px`);
    check(`kart ${label}: it accelerates by itself; the stick held right turns it right`, s0.auto && s0.speed > 30 && s1.angle > s0.angle + .3 && !errors.length, `speed ${Math.round(s0.speed)}, turned ${(s1.angle - s0.angle).toFixed(2)}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 14. road: its buttons, the gas by itself, the stick, the gear */
if (want('road')) {
  console.log('road: BRAKE and GEAR, thumb-sized; it accelerates by itself; the stick steers; GEAR changes gear');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('road', vp, 'road/drive'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(1500);
    const st = () => ev(page, () => window.__game.scenes.road.state());
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, w: q.width, h: q.height, x: q.x + q.width / 2, y: q.y + q.height / 2 }; }));
    const acts = btns.map(b => b.act).sort().join(), small = Math.min(...btns.map(b => Math.min(b.w, b.h)));
    const s0 = await st(), sx = vp.width * .2, sy = vp.height * .75;
    await drag(cdp, line([sx, sy], [sx + 50, sy], 20), 30); const s1 = await st();
    const g = btns.find(b => b.act === 'gear'); if (g) await page.touchscreen.tap(g.x, g.y); await wait(200); const s2 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `road-${label.replace(/ /g, '-')}.png`) });
    check(`road ${label}: BRAKE and GEAR, each a thumb's size`, acts === 'brake,gear' && small >= 44, `buttons ${acts}, smallest ${Math.round(small)} CSS px`);
    check(`road ${label}: it accelerates by itself; the stick held right moves it right; GEAR changes gear`, s0.speed > 30 && s1.x > s0.x + .2 && s2.gear !== s1.gear && !errors.length, `speed ${s0.speed}, x ${s0.x} -> ${s1.x}, gear ${s1.gear} -> ${s2.gear}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 9. arcade: the three games to their tables by touch, keys and pad; the attract mode */
if (want('arcade')) {
  console.log('arcade: each game from the cabinet to its table, by taps, keys and a pad; the attract mode');
  const GAMES = ['maze', 'formation', 'rocks'], css = async (p, n) => ev(p, n => { const S = window.__game.game.screen; return n * S.S / S.dpr; }, n);
  const tapAt = async (p, x, y) => { const [cx, cy] = await toCss(p, x, y); await p.touchscreen.tap(cx, cy); await wait(160); };
  const st = (p, id) => ev(p, id => window.__game.scenes['arcade-' + id].state(), id);
  // by taps on a phone held upright
  {
    const { page, ctx, errors } = await open('arcade', UP); await wait(700);
    for (let i = 0; i < 3; i++) {
      const id = GAMES[i], t = await ev(page, () => window.__game.scenes.arcade.state()), c = t.cabs[i];
      await tapAt(page, c[0] + c[2] / 2, c[1] + c[3] / 2); await wait(900);
      const scene = await ev(page, () => window.__game.game.sceneName);
      await ev(page, ([id, s]) => window.__game.scenes['arcade-' + id].end(s), [id, 3000 + i * 100]); await wait(300);
      const w = (await st(page, id)).wheel, small = w ? Math.min(await css(page, w.cw), await css(page, w.up[1] - w.up[0]), await css(page, w.ok[3])) : 0;
      if (w) { await tapAt(page, w.x + w.cw / 2, (w.up[0] + w.up[1]) / 2); for (let k = 0; k < 3; k++) await tapAt(page, w.ok[0] + w.ok[2] / 2, w.ok[1] + w.ok[3] / 2); }
      await wait(200); const s = await st(page, id); await wait(1100); await tapAt(page, 100, 100); await wait(900);
      const back = await ev(page, () => window.__game.game.sceneName), top = s.table[0] || {};
      check(`arcade (touch): ${id}: a tap on its cabinet plays it, the wheel's arrows and OK take initials (targets ${Math.round(small)} CSS px), the table has them, a tap goes back`,
        scene === 'arcade-' + id && small >= 44 && s.stage === 'table' && top.name === 'BAA' && top.score === 3000 + i * 100 && back === 'arcade' && !errors.length, JSON.stringify({ scene, stage: s.stage, top, back }) + (errors.length ? ' errors: ' + errors.join(' | ') : ''));
    }
    // left alone: the demo, then its table, then the title (the game's clock run on: advance)
    const a0 = await ev(page, () => { const g = window.__game.game, A = window.__game.scenes.arcade; g.advance(20.5); const demo = g.sceneName, d = g.scenes[demo] && g.scenes[demo].state && g.scenes[demo].state().demo; for (let i = 0; i < 40 && g.sceneName !== 'arcade'; i++) g.advance(1); const back = g.sceneName, phase = A.state().phase, table = A.state().table; g.advance(6.5); return { demo, d, back, phase, table, after: A.state().phase }; });
    check('arcade: left alone, the cabinet plays a demo, comes back to its table, then its title', a0.demo.startsWith('arcade-') && a0.d && a0.back === 'arcade' && a0.phase === 'scores' && !!a0.table && a0.after === 'title' && !errors.length, JSON.stringify(a0));
    await ctx.close();
  }
  // by keys and by a pad, on a computer
  {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }); await ctx.addInitScript(() => { window.testPads = []; Object.defineProperty(navigator, 'getGamepads', { value: () => window.testPads }); });
    const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(resolve('dist/kits/my-3d2dge-arcade.html')).href + '#arcade'); await page.waitForFunction(() => window.__game && window.__game.game.sceneName === 'arcade'); await wait(500);
    const key = async (code, n = 1) => { for (let k = 0; k < n; k++) { await page.keyboard.down(code); await wait(70); await page.keyboard.up(code); await wait(70); } };
    // the continue (keys): Enter continues with the lives back
    await key('ArrowRight'); await key('Enter'); await wait(900);
    await ev(page, () => window.__game.scenes['arcade-formation'].end(4200, true)); await wait(200);
    const c0 = await st(page, 'formation'); await key('Enter'); await wait(200); const c1 = await st(page, 'formation');
    check('arcade (keys): the continue counts down, Enter continues', c0.continuing && !c1.continuing && c1.stage === 'play' && !errors.length, JSON.stringify([c0.stage, c0.continuing, c1.stage, c1.continuing]));
    await ev(page, () => window.__game.scenes['arcade-formation'].end(4200)); await wait(200);
    await key('ArrowUp', 2); await key('Enter', 3); await wait(200); const k = await st(page, 'formation'); await wait(1100); await key('Enter'); await wait(900);
    const kb = await ev(page, () => window.__game.game.sceneName);
    check('arcade (keys): formation from the cabinet to its table: up turns the letter, Enter takes it', k.stage === 'table' && (k.table[0] || {}).name === 'CAA' && kb === 'arcade' && !errors.length, JSON.stringify({ stage: k.stage, top: k.table[0], back: kb }));
    // a pad: the d-pad and A (button 0)
    const pad = async (b, n = 1) => { for (let q = 0; q < n; q++) { await ev(page, b => { const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: i === b, value: i === b ? 1 : 0 })); window.testPads = [{ index: 0, id: 'test pad', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, timestamp: performance.now() }]; }, b); await wait(90); await ev(page, () => { window.testPads[0].buttons.forEach(x => { x.pressed = false; x.value = 0; }); window.testPads[0].timestamp = performance.now(); }); await wait(90); } };
    await pad(15); await wait(100); const pk = await ev(page, () => window.__game.scenes.arcade.state().pick); await pad(0); await wait(900);
    const ps = await ev(page, () => window.__game.game.sceneName);
    await ev(page, () => window.__game.scenes['arcade-rocks'].end(2600)); await wait(200);
    await pad(12, 3); await pad(0, 3); await wait(200); const pr = await st(page, 'rocks'); await wait(1100); await pad(0); await wait(900);
    const pb = await ev(page, () => window.__game.game.sceneName);
    check('arcade (pad): the d-pad picks rocks, A plays it, the d-pad and A take initials, A goes back', pk === 2 && ps === 'arcade-rocks' && pr.stage === 'table' && (pr.table[0] || {}).name === 'DAA' && pb === 'arcade' && !errors.length, JSON.stringify({ pick: pk, scene: ps, stage: pr.stage, top: pr.table[0], back: pb }) + (errors.length ? ' errors: ' + errors.join(' | ') : ''));
    await ctx.close();
  }
}

/* 10. the shooter's arcade frame */
if (want('shooter')) {
  console.log('shooter: the continue, the horizontal stage, initials by taps, the table');
  const { page, ctx, errors } = await open('shooter', UP); await wait(800);
  const tapAt = async (x, y) => { const [cx, cy] = await toCss(page, x, y); await page.touchscreen.tap(cx, cy); await wait(160); };
  await ev(page, () => window.__game.scenes.shooter.end(3000, true)); await wait(300); await tapAt(120, 200); await wait(300);
  const v = await ev(page, () => { const s = window.__game.scenes.shooter.state(); return { respawn: s.ship.respawn, scene: window.__game.game.sceneName }; });
  check('shooter (touch): the last ship lost brings a continue; a tap takes it and the ship is back', v.scene === 'shooter' && v.respawn === 0 && !errors.length, JSON.stringify(v));
  await page.goto(page.url().replace(/#.*$/, '') + '#shooter/horizontal'); await page.reload(); await page.waitForFunction(() => window.__game && window.__game.game.sceneName === 'shooter-horizontal'); await wait(1500);
  const h0 = await ev(page, () => window.__game.scenes['shooter-horizontal'].state());
  await ev(page, () => window.__game.scenes['shooter-horizontal'].end(4100)); await wait(300);
  const w = await ev(page, () => { const c = window.__game.scenes['shooter-horizontal']; return c.state().ending; });
  const wheel = await ev(page, () => window.__game.scenes['shooter-horizontal'].wheel());
  if (wheel) { await tapAt(wheel.x + wheel.cw / 2, (wheel.up[0] + wheel.up[1]) / 2); for (let k = 0; k < 3; k++) await tapAt(wheel.ok[0] + wheel.ok[2] / 2, wheel.ok[1] + wheel.ok[3] / 2); }
  await wait(200); const h1 = await ev(page, () => window.__game.scenes['shooter-horizontal'].state()); await wait(1100); await tapAt(120, 200); await wait(900);
  const back = await ev(page, () => window.__game.game.sceneName);
  check('shooter (touch): #shooter/horizontal plays; its end brings initials by taps, the table, then the title', h0.x > 0 && w === 'entry' && !!wheel && h1.ending === 'table' && (h1.table[0] || {}).name === 'BAA' && back === 'title' && !errors.length, JSON.stringify({ x: h0.x, w, top: h1.table[0], back }) + (errors.length ? ' errors: ' + errors.join(' | ') : ''));
  await ctx.close();
}

/* 15. rpg's journey: thumb-sized rows, New game by a tap, the stick, MENU, a row, BACK */
if (want('rpg')) {
  console.log("rpg: the journey by thumb");
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('rpg', vp);
    await page.touchscreen.tap(vp.width * .5, vp.height * .08); await wait(300);   // the device is touch now: the windows' rows grow
    const st = () => ev(page, () => window.__game.scenes.rpg.state()), k = await ev(page, () => { const S = window.__game.game.screen; return S.S / S.dpr; });
    const tapRow = async label => { const row = (await st()).rows.find(r => r.label === label); if (!row) return false; const [x, y] = await toCss(page, row.at[0], row.at[1]); await page.touchscreen.tap(x, y); await wait(300); return true; };
    const btn = act => ev(page, a => { const b = [...document.querySelectorAll('[data-sys=touch] button')].find(b => b.dataset.act === a && b.style.display !== 'none'); if (!b) return null; const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width, h: q.height, label: b.textContent }; }, act);
    const s0 = await st(), small = Math.min(...s0.rows.map(r => r.h * k));
    await tapRow('New game'); const s1 = await st();
    check(`rpg ${label}: the title's rows are a thumb's height; a tap on New game starts the journey`, small >= 44 && s1.mode === 'walk', `rows ${Math.round(small)} CSS px, mode ${s1.mode}`);
    const sx = vp.width * .2, sy = vp.height * .75; await drag(cdp, line([sx, sy], [sx, sy - 50], 30), 30); const s2 = await st();
    check(`rpg ${label}: the stick walks the party`, s2.y < s1.y - 8, `from ${s1.x}, ${s1.y} to ${s2.x}, ${s2.y}`);
    const menu = await btn('skill'); if (menu) { await page.touchscreen.tap(menu.x, menu.y); await wait(300); }
    const s3 = await st(); await tapRow('Status'); const s4 = await st();
    const back = await btn('cancel'); if (back) { await page.touchscreen.tap(back.x, back.y); await wait(300); } const s5 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `rpg-journey-${label.replace(/ /g, '-')}.png`) });
    check(`rpg ${label}: MENU (a thumb's size) opens the menu, a tap on Status opens it, BACK closes it`, !!menu && menu.label === 'MENU' && Math.min(menu.w, menu.h) >= 44 && s3.wins[0] === 'MENU' && s4.wins[1] === 'STATUS' && !!back && s5.wins.length === 1 && !errors.length,
      `${menu ? menu.label + ' ' + Math.round(Math.min(menu.w, menu.h)) + ' px' : 'no MENU'}; windows ${s3.wins.join('/')} → ${s4.wins.join('/')} → ${s5.wins.join('/')}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 16. tactics: thumb-sized rows; a tap selects, a tap on a blue cell moves, a tap on a foe in range strikes; TURN */
if (want('tactics')) {
  console.log('tactics: a battle by taps');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, errors } = await open('tactics', vp, 'tactics/battle');
    await page.touchscreen.tap(vp.width * .5, vp.height * .5); await wait(200);   // the device is touch now: the rows grow, TURN shows
    const st = () => ev(page, () => { const s = window.__game.scenes.tactics.state(), S = window.__game.game.screen; return { mode: s.mode, active: s.active && s.active.name, side: s.active && s.active.side, sel: s.sel && s.sel.name, cells: s.cells, rows: s.ui.rows, turn: s.ui.turn, yaw: window.__game.game.yaw || 0, W: S.W, H: S.H,
      units: s.units.map(u => { const at = s.at(u.cx, u.cy), h = s.map.pick(at[0], at[1] - 1, window.__game.game); return { name: u.name, side: u.side, cx: u.cx, cy: u.cy, hp: u.hp, dead: u.dead, at, seen: !!h && h.cx === u.cx && h.cy === u.cy }; }), labels: s.rows.map(r => r.label) }; });
    const k = await ev(page, () => { const S = window.__game.game.screen; return S.S / S.dpr; });
    const tapGame = async (x, y) => { const [cx, cy] = await toCss(page, x, y); await page.touchscreen.tap(cx, cy); await wait(250); };
    const tapCell = async (cx, cy) => { const p = await ev(page, ([x, y]) => window.__game.scenes.tactics.state().at(x, y), [cx, cy]); await tapGame(p[0], p[1] - 1); };
    const tapRow = async name => { const s = await st(), i = s.labels.indexOf(name), b = s.rows[i]; if (!b) return false; await tapGame(b.x + b.w / 2, b.y + b.h / 2); return true; };
    const ready = () => page.waitForFunction(() => { const s = window.__game.scenes.tactics.state(); return s.mode === 'command' && s.active && s.active.side === 'hero' && s.ui.rows.length; }, null, { timeout: 40000 });
    await ready(); await wait(1200); const s0 = await st(), hero = s0.units.find(u => u.name === s0.active),   // (the camera settled on the hero)
      small = Math.min(...s0.rows.map(r => r.h * k));
    // a tap on a foe on screen selects it: its card shows
    const inView = (p, s) => p[0] > s.W * .12 && p[0] < s.W * .7 && p[1] > s.H * .18 && p[1] < s.H * .72;
    const foe = s0.units.find(u => u.side === 'foe' && !u.dead && u.seen && inView(u.at, s0)) || s0.units.find(u => u.side === 'foe' && !u.dead && u.seen);   // (one whose cell's top shows: not behind the gate's posts)
    await tapCell(foe.cx, foe.cy); const s1 = await st();
    check(`tactics ${label}: the command rows are a thumb's height; a tap on a unit selects it`, small >= 44 && s1.sel === foe.name, `rows ${Math.round(small)} CSS px; tapped ${foe.name}, selected ${s1.sel}`);
    // MOVE, then a tap on a blue cell two or more steps off, on screen
    await tapRow('MOVE'); const s2 = await st();
    const spots = await ev(page, () => { const s = window.__game.scenes.tactics.state(); return (s.cells || []).map(c => ({ c, p: s.at(c[0], c[1]) })); });
    const to = spots.filter(o => Math.abs(o.c[0] - hero.cx) + Math.abs(o.c[1] - hero.cy) >= 2 && inView(o.p, s2))[0];
    if (to) await tapCell(to.c[0], to.c[1]);
    await ready(); const s3 = await st(), moved = s3.units.find(u => u.name === hero.name);
    check(`tactics ${label}: MOVE, then a tap on a blue cell walks ${hero.name} there`, s2.mode === 'move' && !!to && moved.cx === to.c[0] && moved.cy === to.c[1], `mode ${s2.mode}; to ${to && to.c}, now at ${moved.cx},${moved.cy}`);
    // a foe beside the hero (placed for the test), ATTACK, a tap on it strikes
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [moved.cx + dx, moved.cy + dy]);
    const spot = await ev(page, ([nb, name]) => { const s = window.__game.scenes.tactics.state(), h = s.units.find(u => u.name === name), f = s.units.find(u => u.side === 'foe' && !u.dead && !u.lead) || s.units.find(u => u.side === 'foe' && !u.dead);
      const c = nb.find(c => s.grid.walk(c) && !s.units.some(u => !u.dead && u.cx === c[0] && u.cy === c[1]) && Math.abs(s.map.height(c[0], c[1]) - s.map.height(h.cx, h.cy)) <= 16); if (!c) return null; s.place(f, c[0], c[1]); return { name: f.name, c, hp: f.hp }; }, [nb, hero.name]);
    await wait(200); const isBow = (await st()).labels[1] === 'ATTACK' && hero.name === 'WREN';
    let s4 = null, s5 = null;
    if (spot && !isBow) { await tapRow('ATTACK'); s4 = await st(); await tapCell(spot.c[0], spot.c[1]); await wait(1500); s5 = await st(); }
    else if (spot) {   // a bow can't strike a cell beside it: its foe goes two cells off
      await ev(page, ([name, hx, hy]) => { const s = window.__game.scenes.tactics.state(), f = s.units.find(u => u.name === name); for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 1], [1, 2]]) { const c = [hx + dx, hy + dy]; if (s.grid.walk(c) && !s.units.some(u => !u.dead && u !== f && u.cx === c[0] && u.cy === c[1])) { s.place(f, c[0], c[1]); return; } } }, [spot.name, moved.cx, moved.cy]);
      const f = (await st()).units.find(u => u.name === spot.name); spot.c = [f.cx, f.cy];
      await tapRow('ATTACK'); s4 = await st(); await tapCell(spot.c[0], spot.c[1]); await wait(2000); s5 = await st();
    }
    const after = s5 && s5.units.find(u => u.name === spot.name);
    check(`tactics ${label}: ATTACK, then a tap on a foe in range strikes it`, !!spot && s4.mode === 'target' && after.hp < spot.hp, spot ? `${hero.name} on ${spot.name}: mode ${s4 && s4.mode}, HP ${spot.hp} -> ${after && after.hp}` : 'no cell beside the hero');
    // TURN (a thumb's size) turns the view a quarter
    const s6 = await st(); if (s6.turn) await tapGame(s6.turn.x + s6.turn.w / 2, s6.turn.y + s6.turn.h / 2); await wait(300); const s7 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `tactics-${label.replace(/ /g, '-')}.png`) });
    check(`tactics ${label}: TURN turns the view a quarter`, !!s6.turn && Math.min(s6.turn.w, s6.turn.h) * k >= 44 && (s7.yaw - s6.yaw + 360) % 360 === 90 && !errors.length, `${s6.turn ? Math.round(Math.min(s6.turn.w, s6.turn.h) * k) + ' px' : 'no TURN'}; yaw ${s6.yaw} -> ${s7.yaw}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 17. army: 200 units in budget; r.pick; a tap selects and orders, a drag pans, a long press and a drag boxes */
if (want('army')) {
  console.log('army: 200 units under orders on a phone');
  const ctx = await browser.newContext({ viewport: SIDE, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(), errors = [], cdp = await ctx.newCDPSession(page);
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(pathToFileURL(resolve('tools/fixtures/army.html')).href);
  await page.waitForFunction(() => window.__fx && window.__fx.game.time > 2);
  const r = await ev(page, () => new Promise(res => {   // 180 frames as the armies march and meet
    const g = window.__fx.game, d = []; let n = 0;
    const tick = () => { d.push(g.stats.renderMs + g.stats.updateMs); if (++n < 180) requestAnimationFrame(tick); else { d.sort((a, b) => a - b); res({ med: d[90], p95: d[171], units: window.__fx.rts.units.filter(u => !u.building).length, drawn: g.stats.actors }); } };
    requestAnimationFrame(tick);
  }));
  check('army: 200 units under orders update and draw within 30 ms a frame (the median)', r.med < 30 && r.units >= 150, `${r.med.toFixed(1)} ms (95% within ${r.p95.toFixed(1)}), ${r.units} units standing, ${r.drawn} drawn`);
  // r.pick: a point on each body drawn picks it; where several overlap, the nearest comes first; open ground picks none
  const p = await ev(page, () => {
    const { game, rts } = window.__fx, R = game.r, S = game.screen, out = { tried: 0, found: 0, stacks: 0, sorted: 0, empty: null };
    for (const u of rts.units.filter(u => !u.building && rts.visible(u))) {   // (the fog hides foes out of sight: not drawn)
      const [sx, sy] = R.w(u.x, u.y, 0); if (sx < 8 || sy < 16 || sx > S.W - 8 || sy > S.H - 4) continue;
      const hit = R.pick(sx, sy - 6); out.tried++; if (hit.includes(u)) out.found++;
      if (hit.length > 1) { out.stacks++; if (hit.every((v, i) => !i || game.view.order(hit[i - 1].x, hit[i - 1].y, 0) >= game.view.order(v.x, v.y, 0))) out.sorted++; }
    }
    for (let y = 10; y < S.H && !out.empty; y += 12) for (let x = 10; x < S.W && !out.empty; x += 12)
      if (rts.units.every(u => Math.hypot(...R.w(u.x, u.y, 0).map((v, i) => v - [x, y][i])) > 40)) out.empty = [x, y, R.pick(x, y).length];
    return out;
  });
  check('army: r.pick gives what was drawn under a point, front to back', p.tried > 50 && p.found === p.tried && p.stacks > 10 && p.sorted === p.stacks && p.empty && p.empty[2] === 0, `${p.found} of ${p.tried} bodies picked; ${p.sorted} of ${p.stacks} overlaps nearest first; open ground ${p.empty ? p.empty[2] + ' picked' : 'not found'}`);
  // a tap on a blue unit selects it (the front one under the finger); a tap on open ground orders it there
  const css = (x, y) => ev(page, ([x, y]) => { const S = window.__fx.game.screen, rc = S.canvas.getBoundingClientRect(); return [rc.left + (x * S.S + S.OX) / S.dpr, rc.top + (y * S.S + S.OY) / S.dpr]; }, [x, y]);
  const one = await ev(page, () => { const { game, rts } = window.__fx, R = game.r, S = game.screen;
    for (const u of rts.of('blue').filter(u => !u.building)) { const [sx, sy] = R.w(u.x, u.y, 0); if (sx > 20 && sy > 30 && sx < S.W - 20 && sy < S.H - 10 && R.pick(sx, sy - 6)[0] === u) return { id: u.id, at: [sx, sy - 6] }; }
    return null; });
  let sel = null, ord = null;
  if (one) {
    const [x, y] = await css(...one.at); await page.touchscreen.tap(x, y); await wait(200);
    sel = await ev(page, () => window.__fx.rts.selected.map(u => u.id));
    const [gx, gy] = await css(p.empty[0], p.empty[1]); await page.touchscreen.tap(gx, gy); await wait(200);
    ord = await ev(page, id => { const u = window.__fx.rts.units.find(u => u.id === id); return u && u.orders[0] ? u.orders[0].kind : null; }, one.id);
  }
  check('army: a tap on a unit selects it, a tap on open ground orders it there', !!one && !!p.empty && sel.length === 1 && sel[0] === one.id && ord === 'move', one ? `selected ${JSON.stringify(sel)} (tapped ${one.id}), then its order: ${ord}` : 'no unit in front on screen');
  // a long press and a drag draws a box that selects the units inside (before any drag has moved the camera: it eases)
  const box = await ev(page, () => { const { game, rts } = window.__fx, R = game.r, S = game.screen, blue = rts.of('blue').filter(u => !u.building);   // (they hold still for it)
    for (const u of blue) { u.K = Object.assign({}, u.K, { sight: 0 }); } rts.order(blue, 'stop');
    const pts = blue.map(u => R.w(u.x, u.y, 0)).filter(q => q[0] > 12 && q[1] > 12 && q[0] < S.W - 12 && q[1] < S.H - 12);
    if (pts.length < 3) return null; const xs = pts.map(q => q[0]).sort((a, b) => a - b), ys = pts.map(q => q[1]).sort((a, b) => a - b);
    return [xs[0] - 6, ys[0] - 6, xs[xs.length - 1] + 6, ys[ys.length - 1] + 6, pts.length]; });
  let boxed = 0, inside = 0;
  if (box) {
    const [ax, ay] = await css(box[0], box[1]), [bx, by] = await css(box[2], box[3]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ax, y: ay }] }); await wait(600);   // a long press (.45 s), then the drag
    for (const q of line([ax, ay], [bx, by], 10)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q[0], y: q[1] }] }); await wait(25); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(250);
    [boxed, inside] = await ev(page, b => { const { game, rts } = window.__fx, R = game.r, S = rts.selected;   // (those inside still standing: a foe may strike one down meanwhile)
      const all = rts.of('blue').filter(u => !u.building && (q => q[0] >= b[0] && q[0] <= b[2] && q[1] >= b[1] && q[1] <= b[3])(R.w(u.x, u.y, 0)));
      return [S.length, S.length === all.length && all.every(u => S.includes(u)) ? all.length : -all.length]; }, box);
  }
  check('army: a long press and a drag draws a box that selects the units inside', !!box && inside >= 3 && boxed === inside && !errors.length, `${boxed} selected, ${Math.abs(inside)} standing inside (${box ? box[4] : 0} at the start)${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
  // a drag on open ground pans the camera
  const cam0 = await ev(page, () => [window.__fx.game.cam.x, window.__fx.game.cam.y]);
  await drag(cdp, line([SIDE.width * .5, SIDE.height * .8], [SIDE.width * .3, SIDE.height * .55], 12)); await wait(300);
  const cam1 = await ev(page, () => [window.__fx.game.cam.x, window.__fx.game.cam.y]);
  check('army: a drag on open ground pans the camera', Math.hypot(cam1[0] - cam0[0], cam1[1] - cam0[1]) > 20, `the camera moved ${Math.hypot(cam1[0] - cam0[0], cam1[1] - cam0[1]).toFixed(0)} px`);
  mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', 'army.png') });
  await ctx.close();
}

/* 18. rts: the HUD's buttons a thumb's size; train, build and order by taps; a drag pans */
if (want('rts')) {
  console.log('rts: a base run by taps');
  for (const [label, vp] of [['on its side', SIDE], ['upright', UP]]) {
    const { page, ctx, cdp, errors } = await open('rts', vp);
    await wait(2800);   // (past the banner)
    const st = () => ev(page, () => { const s = window.__game.scenes.rts.state(), R = s.rts; return { mode: s.mode, sel: R.selected.map(u => u.kind), gold: R.side('blue').res.gold, cmds: s.commands, boxes: s.boxes, k: window.__game.game.screen.S / window.__game.game.screen.dpr }; });
    const tapGame = async (x, y) => { const [cx, cy] = await toCss(page, x, y); await page.touchscreen.tap(cx, cy); await wait(250); };
    const tapBox = async b => { if (b) await tapGame(b.x + b.w / 2, b.y + b.h / 2); return !!b; };
    // a unit of kind on the screen, clear of the HUD: where to tap it
    const find = kind => ev(page, kind => { const s = window.__game.scenes.rts.state(), S = window.__game.game.screen, H = [...s.boxes.side, ...s.boxes.cmds];
      for (const u of s.rts.of('blue', kind)) { const [x, y] = s.at(u), p = [x, y - 8]; if (p[0] > 50 && p[1] > 30 && p[0] < S.W - 70 && p[1] < S.H - 60 && !H.some(b => p[0] >= b.x - 4 && p[0] < b.x + b.w + 4 && p[1] >= b.y - 4 && p[1] < b.y + b.h + 4) && window.__game.game.r.pick(...p)[0] === u) return { id: u.id, p }; }
      return null; }, kind);
    const open_ = () => ev(page, () => { const s = window.__game.scenes.rts.state(), R = s.rts, S = window.__game.game.screen, r = window.__game.game.r;
      for (let y = 60; y < S.H - 70; y += 10) for (let x = 60; x < S.W - 90; x += 10) if (!r.pick(x, y).length && R.units.every(u => Math.hypot(...s.at(u).map((v, i) => v - [x, y][i])) > 30)) return [x, y];
      return null; });
    const g0 = await open_(); if (g0) await tapGame(...g0);   // (a link opens it without the title's tap: the first tap says a finger plays)
    const s0 = await st(), small = Math.min(...s0.boxes.side.map(b => Math.min(b.w, b.h))) * s0.k;
    await tapBox(s0.boxes.side.find(b => b.id === 'hall')); const s1 = await st();
    const g1 = s1.gold; await tapBox(s1.boxes.cmds[0]); const s2 = await st();
    check(`rts ${label}: HALL, ARMY and IDLE are a thumb's size; HALL selects the hall, a tap on WORKER trains one`, small >= 44 && s1.sel.join() === 'hall' && s1.cmds[0] === 'WORKER' && s2.gold === g1 - 50 && Math.min(s2.boxes.cmds[0].w, s2.boxes.cmds[0].h) * s2.k >= 44, `buttons ${Math.round(small)} CSS px; selected ${s1.sel}; ${s1.cmds}; gold ${g1} -> ${s2.gold}`);
    // a worker, BARRACKS, a tap where it stands, PLACE
    const w = await find('worker'); if (w) await tapGame(...w.p); const s3 = await st();
    const spot = await ev(page, () => { const s = window.__game.scenes.rts.state(), R = s.rts, h = R.of('blue', 'hall')[0], S = window.__game.game.screen;
      for (let d = 4; d < 9; d++) for (let a = 0; a < 16; a++) { const cx = Math.round(h.cx + Math.cos(a / 8 * Math.PI) * d), cy = Math.round(h.cy + Math.sin(a / 8 * Math.PI) * d), [x, y] = s.at({ x: (cx + 1.5) * 16, y: (cy + 1.5) * 16 });
        if (R.canPlace('barracks', cx, cy) && x > 60 && y > 40 && x < S.W - 80 && y < S.H - 80) return { c: [cx, cy], p: [x, y] }; }
      return null; });
    await tapBox(s3.boxes.cmds[0]); const s4 = await st();
    if (spot) await tapGame(...spot.p); const s5 = await ev(page, () => window.__game.scenes.rts.state().placing);
    await tapBox((await st()).boxes.place.find(b => b.id === 'place'));
    const order = w && await ev(page, id => { const u = window.__game.scenes.rts.state().rts.units.find(u => u.id === id); return u && u.orders[0] && u.orders[0].kind; }, w.id);
    check(`rts ${label}: a tap selects a worker; BARRACKS, a tap where it stands and PLACE send him to build it`, !!w && s3.sel.join() === 'worker' && s3.cmds[0] === 'BARRACKS' && s4.mode === 'place' && !!spot && s5 && s5.cx === spot.c[0] && s5.cy === spot.c[1] && order === 'build', `selected ${s3.sel}; ${s3.cmds}; mode ${s4.mode}; plan at ${s5 && [s5.cx, s5.cy]} (tapped ${spot && spot.c}); the worker's order ${order}`);
    // a footman, then a tap on open ground
    const f = await find('footman'); if (f) await tapGame(...f.p); const s6 = await st();
    const ground = await open_();
    if (ground) await tapGame(...ground);
    const fo = f && await ev(page, id => { const u = window.__game.scenes.rts.state().rts.units.find(u => u.id === id); return u && u.orders[0] && u.orders[0].kind; }, f.id);
    check(`rts ${label}: a tap selects a footman, a tap on open ground sends him there`, !!f && s6.sel.join() === 'footman' && !!ground && fo === 'move', `selected ${s6.sel}; tapped ${ground}; his order ${fo}`);
    // a drag pans the camera
    const c0 = await ev(page, () => [window.__game.game.cam.x, window.__game.game.cam.y]);
    await drag(cdp, line([vp.width * .3, vp.height * .6], [vp.width * .6, vp.height * .35], 12)); await wait(400);
    const c1 = await ev(page, () => [window.__game.game.cam.x, window.__game.game.cam.y]);
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `rts-${label.replace(/ /g, '-')}.png`) });
    check(`rts ${label}: a drag pans the camera`, Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) > 20 && !errors.length, `moved ${Math.hypot(c1[0] - c0[0], c1[1] - c0[1]).toFixed(0)} px${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 19. sim: thumb-sized tools; time controls; a path, a stand and a price by taps; a drag pans */
if (want('sim')) {
  console.log('sim: a park run by taps');
  for (const [label, vp] of [['on its side', SIDE], ['upright', UP]]) {
    const { page, ctx, cdp, errors } = await open('sim', vp);
    await wait(600);
    const st = () => ev(page, () => { const s = window.__game.scenes.sim.state(), S = window.__game.game.screen; return { money: s.money, speed: s.speed, ts: window.__game.game.timeScale, tool: s.tool, placing: s.placing, picked: s.picked && (s.picked.kind || s.picked.name), price: s.picked && s.picked.price, spots: s.spots.map(o => o.kind), boxes: s.boxes, k: S.S / S.dpr }; });
    const tapGame = async (x, y) => { const [cx, cy] = await toCss(page, x, y); await page.touchscreen.tap(cx, cy); await wait(250); };
    const tapBox = async b => { if (b) await tapGame(b.x + b.w / 2, b.y + b.h / 2); return !!b; };
    const cellAt = (cx, cy) => ev(page, ([cx, cy]) => window.__game.scenes.sim.state().at((cx + .5) * 16, (cy + .5) * 16), [cx, cy]);
    // a grass tile on screen beside the path (for a path tile), and a stand's corner beside the path (for DRINK)
    const pick = () => ev(page, () => { const s = window.__game.scenes.sim.state(), S = window.__game.game.screen, ok = ([x, y]) => x > 40 && y > 50 && x < S.W - 40 && y < S.H - 110, out = {};
      for (let y = 2; y < s.map.h - 2 && !out.tile; y++) for (let x = 2; x < s.map.w - 2 && !out.tile; x++) if (!s.isPath(x, y) && s.map.walkable(x, y) && s.isPath(x, y + 1) && !s.fits('lemonade', x, y - 1) && ok(s.at((x + .5) * 16, (y + .5) * 16))) out.tile = [x, y];
      for (let y = 2; y < s.map.h - 3 && !out.stand; y++) for (let x = 2; x < s.map.w - 3 && !out.stand; x++) if (s.fits('lemonade', x, y) && ok(s.at((x + 1) * 16, (y + 1) * 16)) && !(out.tile && Math.abs(out.tile[0] - x) < 4 && Math.abs(out.tile[1] - y) < 4)) out.stand = [x, y];
      return out; });
    await ev(page, () => window.__game.game.W).then(W => tapGame(W / 2, 46));   // (the first tap says a finger plays)
    const s0 = await st(), small = Math.min(...s0.boxes.tools.map(b => b.h), ...s0.boxes.time.map(b => Math.min(b.w, b.h))) * s0.k;
    await tapBox(s0.boxes.time.find(b => b.k === 4)); const s1 = await st(); await tapBox(s1.boxes.time.find(b => b.k === 0)); const s3 = await st();   // (paused while it builds: no guest pays at the gate meanwhile)
    check(`sim ${label}: the tools and time controls are a thumb's size; 4X, then pause`, small >= 44 && s1.ts === 4 && s3.ts === 0, `buttons ${Math.round(small)} CSS px; time ${s1.ts}, then ${s3.ts}`);
    // PATH, a tap on a tile beside the path
    const where = await pick(); await tapBox(s3.boxes.tools.find(b => b.t === 'path'));
    if (where.tile) await tapGame(...await cellAt(...where.tile));
    const laid = where.tile && await ev(page, c => window.__game.scenes.sim.state().isPath(...c), where.tile), s4 = await st();
    check(`sim ${label}: PATH, then a tap lays a tile ($10)`, !!laid && s4.money === s3.money - 10, `tile ${where.tile}: ${laid ? 'path' : 'grass'}; money ${s3.money} -> ${s4.money}`);
    await tapBox(s4.boxes.tools.find(b => b.t === 'path'));   // (the tool off)
    // DRINK, a tap where the stand goes, PLACE
    const s5 = await st(); await tapBox(s5.boxes.tools.find(b => b.t === 'lemonade'));
    if (where.stand) { const [x, y] = await ev(page, c => window.__game.scenes.sim.state().at((c[0] + 1.5) * 16, (c[1] + 1.5) * 16), where.stand); await tapGame(x, y); }   // (the tile under the finger is the plan's middle)
    const s6 = await st(); await tapBox(s6.boxes.place.find(b => b.id === 'place')); const s7 = await st();
    check(`sim ${label}: DRINK, a tap and PLACE build a lemonade stand ($250)`, !!where.stand && !!s6.placing && s7.spots.filter(k => k === 'lemonade').length === 1 && s7.money === s6.money - 250, `plan ${s6.placing && [s6.placing.cx, s6.placing.cy]} (for ${where.stand}); stands ${s7.spots}; money ${s6.money} -> ${s7.money}`);
    // a tap on the carousel: its panel; + raises its price
    const car = await ev(page, () => { const s = window.__game.scenes.sim.state(), c = s.spots.find(o => o.kind === 'carousel'); return s.at(c.x, c.y); });
    await tapGame(car[0], car[1] - 10); const s8 = await st(); await tapBox(s8.boxes.panel.find(b => b.id === 'up')); const s9 = await st();
    await tapBox(s9.boxes.time.find(b => b.k === 1)); const s10 = await st();
    check(`sim ${label}: a tap on the carousel shows it; + raises its price; 1X runs again`, s8.picked === 'carousel' && s9.price === s8.price + 1 && s10.ts === 1, `picked ${s8.picked}; price ${s8.price} -> ${s9.price}; time ${s10.ts}`);
    // a drag pans the camera
    const c0 = await ev(page, () => [window.__game.game.cam.x, window.__game.game.cam.y]);
    await drag(cdp, line([vp.width * .3, vp.height * .45], [vp.width * .6, vp.height * .3], 12)); await wait(400);
    const c1 = await ev(page, () => [window.__game.game.cam.x, window.__game.game.cam.y]);
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `sim-${label.replace(/ /g, '-')}.png`) });
    check(`sim ${label}: a drag pans the camera`, Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) > 20 && !errors.length, `moved ${Math.hypot(c1[0] - c0[0], c1[1] - c0[1]).toFixed(0)} px${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 20. pointclick: walking, the verb coin, the inventory, a long press, a talk's choice, by taps */
if (want('pointclick')) {
  console.log('pointclick: an adventure played by taps');
  for (const [label, vp] of [['on its side', SIDE], ['upright', UP]]) {
    const { page, ctx, cdp, errors } = await open('pointclick', vp);
    await wait(600);
    const st = () => ev(page, () => { const s = window.__game.scenes.pointclick.state(), S = window.__game.game.screen, D = s.story.talk; return { mode: s.mode, room: s.pc.room, hero: [s.pc.hero.x, s.pc.hero.y], inv: s.inv, item: s.pc.item, line: s.pc.line && s.pc.line.lines[s.pc.line.i], talking: s.story.running, asking: !!(D.open && D.choices && !D.typing && D.i >= D.pages.length - 1), boxes: s.pc.boxes, k: S.S / S.dpr }; });
    const tapGame = async (x, y) => { const [cx, cy] = await toCss(page, x, y); await page.touchscreen.tap(cx, cy); await wait(250); };
    const tapBox = async b => { if (b) await tapGame(b.x + b.w / 2, b.y + b.h / 2); return !!b; };
    const room = (x, y) => ev(page, ([x, y]) => window.__game.scenes.pointclick.state().pc.screen(x, y), [x, y]), spot = id => ev(page, id => window.__game.scenes.pointclick.state().pc.where(id), id);
    const idle = async () => { for (let i = 0; i < 60; i++) { if (!await ev(page, () => window.__game.scenes.pointclick.state().pc.busy)) return; await wait(200); } };
    // the opening card, then Finn's talk tapped through (a tap on the box turns its page)
    await ev(page, () => window.__game.game.W).then(W => tapGame(W / 2, 40)); await wait(300);
    for (let i = 0; i < 30 && (await st()).talking; i++) await tapGame(...await ev(page, () => { const G = window.__game.game; return [G.W / 2, G.H - 24]; }));
    await idle();
    // a tap on open ground walks the hero there
    const h0 = (await st()).hero; await tapGame(...await room(150, 158)); await idle(); const h1 = (await st()).hero;
    check(`pointclick ${label}: a tap on the ground walks the hero there`, Math.hypot(h1[0] - 150, h1[1] - 158) < 3, `from ${h0.map(Math.round)} to ${h1.map(Math.round)} (asked 150,158)`);
    // a tap on the rope: its verbs, a thumb's size; TAKE
    await tapGame(...await spot('rope')); const s2 = await st(), coin = s2.boxes.filter(b => b.id.startsWith('coin:')), small = Math.min(...coin.map(b => Math.min(b.w, b.h))) * s2.k;
    await tapBox(coin.find(b => b.id === 'coin:pickup')); await idle(); for (let i = 0; i < 10 && (await st()).line; i++) await tapGame(...await room(60, 150)); const s3 = await st();
    check(`pointclick ${label}: a tap on a hotspot shows its verbs, each a thumb's size; TAKE picks it up`, coin.length >= 3 && small >= 44 && s3.inv.includes('rope'), `verbs ${coin.map(b => b.id.slice(5))}, smallest ${Math.round(small)} CSS px; inventory ${s3.inv}`);
    // the inventory: the rope's slot a thumb's size; a tap puts it on the cursor, a tap takes it off
    const slot = s3.boxes.find(b => b.id === 'item:rope'); await tapBox(slot); const s4 = await st(); await tapBox(slot); const s5 = await st();
    check(`pointclick ${label}: the inventory's slot is a thumb's size; a tap holds the item, a tap lets it go`, !!slot && Math.min(slot.w, slot.h) * s3.k >= 44 && s4.item === 'rope' && s5.item === null, `slot ${slot && Math.round(Math.min(slot.w, slot.h) * s3.k)} CSS px; held ${s4.item}, then ${s5.item}`);
    // a long press on the tavern's door looks at it
    const lh = await spot('door'), [lx, ly] = await toCss(page, lh[0], lh[1]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: lx, y: ly, id: 1 }] }); await wait(700); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    for (let i = 0; i < 40 && !(await st()).line; i++) await wait(150);   // (he walks to it, then says what he sees)
    const s6 = await st();
    check(`pointclick ${label}: a long press looks`, /Salty Gull/.test(s6.line || ''), `the line: "${s6.line}"`);
    for (let i = 0; i < 10 && (await st()).line; i++) await tapGame(...await room(60, 150));
    // a tap on Finn, TALK, his question tapped to, the last choice (goodbye) by a tap on it
    await tapGame(...await spot('finn')); const s7 = await st(); await tapBox(s7.boxes.find(b => b.id === 'coin:talk'));
    for (let i = 0; i < 40 && !(await st()).asking; i++) await wait(150);
    const asked = (await st()).asking, last = await ev(page, () => { const D = window.__game.scenes.pointclick.state().story.talk; return D.choiceAt(D.choices.length - 1); });
    if (last) await tapGame(...last); await wait(300); const said = await ev(page, () => window.__game.scenes.pointclick.state().story.log.slice(-2).map(e => e.text));
    for (let i = 0; i < 10 && (await st()).talking; i++) await tapGame(...await ev(page, () => { const G = window.__game.game; return [G.W / 2, G.H - 24]; }));
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `pointclick-${label.replace(/ /g, '-')}.png`) });
    check(`pointclick ${label}: a tap on Finn, TALK, and a tap on a choice picks it`, asked && said.includes('I\'D BETTER GO') && !errors.length, `choices shown ${asked}; said: ${said.join(' / ')}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

await browser.close();
console.log(problems.length ? `\nphone test FAILED (${problems.length}):\n  ${problems.join('\n  ')}` : `\nphone test passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(problems.length ? 1 : 0);
