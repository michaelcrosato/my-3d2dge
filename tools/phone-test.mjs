// The phone test: the starter kits played on an emulated phone (touch, 390 x 844 CSS pixels at 3x, held upright and on its
// side), fast (about a minute), for what a player finds in ten minutes with a real one:
//   1. every kit: a tap on its title entry starts it (the first tap, the one that goes full screen), with no page errors
//   2. shooter: one continuous thumb drag, started anywhere (the right half too), flies the ship from one side of the
//      playfield to the other and back (no lifting the thumb to go on)
//   3. brawler: walking right, no street is ever on screen beyond where the hero can walk (the camera stops at a fight's
//      lock, so the screen's edge is the wall)
//   4. adventure: a phone gets Fast lighting (no GPU lighting, Settings: Lighting), and a frame draws within budget;
//      pacing: on a 120 Hz screen a frame that won't fit is drawn every other refresh, evenly (game.drawEvery), and a GPU
//              behind (refreshes missed) the same
//   5. rpg: a whole turn is played by taps, and every tap target (commands, foes) is at least 44 CSS pixels (a thumb)
// Usage: node tools/phone-test.mjs [kit ...]   (run node tools/build.mjs first; CHROMIUM_PATH picks a browser). Exit code 1
// on failure. Each check prints what it measured, so a failure says what a player would have seen.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const want = k => !only.length || only.includes(k);
const UP = { width: 390, height: 844 }, SIDE = { width: 844, height: 390 };
const problems = [], t0 = Date.now();
const check = (name, ok, detail) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); if (!ok) problems.push(name + (detail ? ': ' + detail : '')); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
/** a kit on a phone: its page, a CDP session (raw touches) and the page's errors */
async function open(kit, vp, hash = kit) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
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
const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);

/* 1. a tap on the title's entry starts the kit */
console.log('title: the first tap starts the game');
for (const kit of ['adventure', 'platformer', 'shooter', 'rpg', 'brawler', 'stealth', 'animlab']) {
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

/* 4b. a 120 Hz phone (frames on an 8.33 ms grid; a late frame waits for the next): a frame that won't fit is drawn every
   other refresh, evenly, instead of at random; a light one every refresh. Its GPU can fall behind too (window.__busy: a
   refresh while it draws is skipped), which no clock in the page sees: the refreshes missed are the sign */
if (want('pacing')) {
  console.log('pacing: a 120 Hz screen');
  const ctx = await browser.newContext({ viewport: UP, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const P = 1000 / 120, t0 = performance.now(), q = new Map(); let id = 0;
    const at = () => t0 + Math.ceil((performance.now() - t0 + .01) / P) * P;
    const pump = () => {
      if (performance.now() >= (window.__busy || 0)) { const v = at() - P, run = [...q.values()]; q.clear(); for (const f of run) f(v); }
      setTimeout(pump, Math.max(0, at() - performance.now()));
    };
    window.requestAnimationFrame = f => { q.set(++id, f); return id; }; window.cancelAnimationFrame = i => q.delete(i); setTimeout(pump, P);
  });
  await page.goto(pathToFileURL(resolve('dist/kits/my-3d2dge-stealth.html')).href + '#stealth');
  await page.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName === 'stealth');
  // the scene's frame made to cost ms (busy) and its GPU gpu ms after it (5 and 11 by turns: some frames fit a refresh,
  // some don't), then measured over 2 s (or wait ms): the refresh read, every how many refreshes, the gaps
  const run = (ms, pace, gpu, wait = 2000) => ev(page, ([ms, pace, gpu, wait]) => new Promise(res => {
    const g = window.__game.game, d0 = g.__d0 || (g.__d0 = g.scene.draw); g.o.pace = pace;
    g.scene.draw = ms ? r => { const t = performance.now() + ms; while (performance.now() < t); } : () => {};
    const f0 = g.__f0 || (g.__f0 = g._frame.bind(g)), gaps = []; let last = 0;
    let k = 0; window.__busy = 0;
    g._frame = () => { const now = performance.now(); if (last) gaps.push(now - last); last = now; f0(); if (gpu) window.__busy = performance.now() + (k++ % 2 ? 11 : 5); };
    setTimeout(() => { const s = gaps.slice(gaps.length >> 1), even = s.filter(x => x > 12 && x < 21).length / s.length; res({ hz: g.hz, every: g.drawEvery, even: Math.round(even * 100) }); }, wait);
  }), [ms, pace, gpu, wait]);
  const heavy = await run(10, undefined), light = await run(0, undefined), off = await run(10, false), behind = await run(0, undefined, true), after = await run(0, undefined, false, 4000);
  check('pacing: the screen reads 120 Hz', heavy.hz >= 110 && heavy.hz <= 130, `${heavy.hz} Hz`);
  check('pacing: a 10 ms frame is drawn every other refresh, evenly (16.7 ms apart)', heavy.every === 2 && heavy.even >= 80, `every ${heavy.every}, ${heavy.even}% of gaps 16.7 ms`);
  check('pacing: a light frame is drawn every refresh', light.every === 1, `every ${light.every}`);
  check('pacing: pace: false draws every refresh', off.every === 1, `every ${off.every}`);
  check('pacing: a GPU behind (light frames, refreshes missed) is drawn every other refresh, evenly', behind.every === 2 && behind.even >= 80 && behind.hz >= 110, `every ${behind.every}, ${behind.even}% of gaps 16.7 ms, ${behind.hz} Hz`);
  check('pacing: once the GPU keeps up, every refresh again (after 3 s)', after.every === 1 && !errors.length, `every ${after.every}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

/* 5. rpg: thumb-sized buttons, a turn played by taps, AUTO */
if (want('rpg')) {
  console.log('rpg: a battle played by thumb');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, errors } = await open('rpg', vp);
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

await browser.close();
console.log(problems.length ? `\nphone test FAILED (${problems.length}):\n  ${problems.join('\n  ')}` : `\nphone test passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(problems.length ? 1 : 0);
