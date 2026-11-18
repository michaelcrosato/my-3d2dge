// The phone test: the starter kits played on an emulated phone (touch, 390 x 844 CSS pixels at 3x, held upright and on its
// side), fast (about a minute), for what a player finds in ten minutes with a real one:
//   1. every kit: a tap on its title entry starts it (the first tap, the one that goes full screen), with no page errors
//   2. shooter: one continuous thumb drag, started anywhere (the right half too), flies the ship from one side of the
//      playfield to the other and back (no lifting the thumb to go on), the page going full screen under the second
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
//  13. kart: DRIFT and ITEM, thumb-sized; it accelerates by itself; the stick steers; pinned against a wall by the gas, the
//      stick held down brakes and backs it off
//  13c. blaster: the jet's MISSILE and ROLL thumb-sized; the stick banks it; in the valley a tap shoots where it lands,
//      and a tap squarely on a foe as the frame drew it (across the screen from the cursor) shoots it down
//  13d. road: BRAKE and REWIND thumb-sized; it accelerates by itself; the stick steers; the striker and the cotton show FIRE alone (the witch moved by the stick)
//  13f. special: JUMP thumb-sized on the planet, a tap on it jumps; in the fort FIRE thumb-sized, the stick turns the
//      soldier (and the world under him); in the arena the kart drives by itself and the stick pulled down backs it up
//  13e. zero: BOOST thumb-sized; it accelerates by itself; the stick steers
//  13b. sky: GAS and SLOW thumb-sized in the plane (ACT only where it acts: the chute, a landing); the stick banks the
//      plane and it turns; GAS opens the throttle; the dive's ACT and SLOW (no GAS): ACT tapped above the chute's band
//      opens nothing, in it the chute; the voyage's GAS, SLOW and ACT (its landings); the hang glider's SLOW alone (its
//      air brake: held, it slows); the helicopter's GAS, SLOW and FIRE (ACT, labelled): GAS held lifts it, FIRE a missile
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
//  21. sports: PASS, SHOOT and LOB a thumb's size; the stick runs the player (with the ball at its feet); PASS passes to
//      the teammate; SHOOT held and let go shoots; a thumb resting on the stick through a goal, or another finger resting
//      on the pitch, leaves the radio clear of the buttons as they come back at the kickoff
//  21. pinball: a tap starts a game; a swipe up fires the plunger (the ball leaves the lane); a finger on the left half
//      raises the left flipper and lifting it lowers it, the right half the right, two fingers both
//  22. artillery: ONE PLAYER a thumb's height, a tap on it starts a match; on the player's turn a tap beside the grub
//      walks it there; WEAPON, named for the weapon, changes it; JUMP jumps; a drag back, let go, fires the other way
//      (the shot flies, and the turn passes to the CPU)
//  23. rhythm: STEP UP a thumb's height, a tap on it starts the song; a thumb on each of the four columns plays its lane:
//      notes touched as they meet their targets are judged (not missed), each in the lane touched; CALIBRATE: taps
//      anywhere count
//      the cannon (held up, a shot goes up); JUMP jumps; MAP opens the map and closes it
//  24. touchless (tools/fixtures/touchless.html: touch: 'never'): no touch buttons, a notice that a controller or a
//      keyboard is needed with Settings (a tap opens them), gone at a key
//  25. menus: the engine's own under a thumb, at least 44 CSS px held either way: E.Menu's rows (kart, fighting and sky's
//      modes, GAME OVER), a dialog's choices (Morwen's riddle, a tap a little low of one still answers it), the reference
//      edition's FamilyMenu, the Shell's Settings and Controls tabs and sliders; sky's menu, too long on its side, scrolls
//      under a finger to BACK, which a tap picks. After the keys (a touch laptop, a phone after a keyboard or a pad) the
//      rows are drawn small, and a finger's tap held a moment picks what it pressed on, the rows unchanged under it and a
//      thumb's after it: kart's BACK, FamilyMenu's POINT-AND-CLICK, Morwen's A WHALE; one on kart's BACK that creeps past
//      a tap's reach and back before it lifts is no tap (it picks nothing as the rows grow); a touch laptop's first touch
//      on a bottom dialog's choice answers it, the touch buttons it brings moving nothing from under it. A thumb resting on
//      the stick holds no new screen: after the keys, at rest on it in play (its press held), GAME OVER comes up a thumb's
//      size, and so do the Shell's Settings in a page of their own; on GAME OVER one that lands on the stick's half and
//      moves past a tap's reach lets the rows grow while it rests, and a slow tap there (held past a long press) still
//      picks the row it pressed on
//  26. the stick's half (stealth, roguelike, metroidvania): upright, their four or five touch buttons in two columns right
//      of the middle (those that come and go shown too), a left thumb set down at the bottom-left steers; on its side a
//      row; GAME OVER (upright and on its side) and the rts end menu go to the title on a sideways flick, not one in
//      GAME OVER's first moment (a dodge mashed as the run ends); a real finger's flick that begins on the stick's half
//      (on RETRY's row there too) backs out of GAME OVER and kart's results held either way, and in play it stays the
//      stick's (it steers, and no swipe reaches the game or a menu)
//  27. the Shell's bands (bands): in every kit with touch buttons, on four phones (320 to 430 wide) held upright and on
//      their side, every touch button shown (those that come and go too), its toast (a title and a line), prompt, tip and
//      tutorial card lie over none of them, nor the corner's, nor one another, on the screen (the tip aside on a phone 320
//      high on its side); under an objective and a status column the toast and the prompt clear them too (but 320 high);
//      stealth's map as the minimap: under the status column, beside the toast, a finger on it or on the card's × takes
//      only that; on its side 640 wide a toast taller than a line comes and goes and nothing moves (the layout, the
//      card's ×, the minimap); a toast of several lines where the card leaves it no room above (stealth upright 320x568,
//      six lines; platformer on its side 640x360 with its minimap, four): the toast and the prompt on the screen, the card
//      under the toast in its place, a finger at the ×'s place takes the toast, the next the card; with no touch buttons
//      (where the toast still lies over its top) a finger on the toast takes only the toast; all of it at once
//      (stealth's HUD, the minimap, the card, a two-line toast): the stack settles, the toast on the screen, 140 wide or
//      more, over no button; stealth's fight: the parry's toast above BLOCK and ROLL, a finger low on BLOCK presses it
//      (the toast stays), a tap on the toast takes it away; a laptop's touch screen: the prompt and the tip over the key
//      strip
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
const E_turn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));   // (the signed turn from heading a to b)
const problems = [], t0 = Date.now();
const check = (name, ok, detail) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); if (!ok) problems.push(name + (detail ? ': ' + detail : '')); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
/** a kit on a phone: its page, a CDP session (raw touches) and the page's errors */
async function open(kit, vp, hash = kit, init) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(), errors = [];
  page.on('console', m => { if (/DEBUG/.test(m.text())) console.log(m.text()); });
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(resolve(`dist/kits/my-3d2dge-${kit}.html`)).href + (hash ? '#' + hash : ''));
  await page.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName);
  return { page, ctx, errors, cdp: await ctx.newCDPSession(page) };
}
const ev = (p, fn, arg) => p.evaluate(fn, arg);
const wait = ms => new Promise(r => setTimeout(r, ms));
/** game (screen) pixels -> CSS pixels on the page */
const toCss = (p, x, y) => ev(p, ([x, y]) => { const S = window.__game.game.screen, rc = S.canvas.getBoundingClientRect(); return [rc.left + (x * S.S + S.OX) / S.dpr, rc.top + (y * S.S + S.OY) / S.dpr]; }, [x, y]);
/** one finger, pressed at the first point, moved through the rest (ms per step), lifted; mid(i) after each move */
async function drag(cdp, pts, ms = 25, mid) {
  const at = (type, q) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: q ? [{ x: q[0], y: q[1], id: 1 }] : [] });
  await at('touchStart', pts[0]); for (const [i, q] of pts.slice(1).entries()) { await at('touchMove', q); await wait(ms); if (mid) await mid(i); } await at('touchEnd');
}
// the page going full screen (or back) under a finger: a phone's first tap asks for it, and the change lands a moment
// later, often in the next drag (HANDOFF-MATRIX 9.2: it ended that drag 3 runs in 4); dispatched at once, every time
const fullscreenChange = p => ev(p, () => document.dispatchEvent(new Event('fullscreenchange')));
/** fingers (one [x, y] each, ids 1, 2, ...) pressed at their first points, moved together through n steps to their last */
async function fingers(cdp, from, to, n = 12, ms = 20) {
  const at = k => from.map((p, i) => ({ x: p[0] + (to[i][0] - p[0]) * k, y: p[1] + (to[i][1] - p[1]) * k, id: i + 1 }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
  for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / n) }); await wait(ms); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
/** one finger held still at q (CSS px) for ms, then lifted: a real tap's moment; mid() measured while it is down */
async function hold(cdp, q, ms = 120, mid) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q[0], y: q[1], id: 1 }] }); await wait(ms);
  const m = mid ? await mid() : null; await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); return m;
}
const useKeys = async p => { await p.keyboard.press('ArrowDown'); await wait(100); await p.keyboard.press('ArrowUp'); await wait(400); };   // (the keys: lastDevice keyboard)
/** the E.Menu drawn last on the page, from now on: window.__menu */
const lastMenu = p => ev(p, () => { const M = My3D2dge.Menu.prototype, d0 = M.draw; M.draw = function (r) { window.__menu = this; return d0.call(this, r); }; });

/* 1. a tap on the title's entry starts the kit */
console.log('title: the first tap starts the game');
for (const kit of ['adventure', 'pointclick', 'platformer', 'metroidvania', 'shooter', 'arcade', 'pinball', 'kart', 'road', 'zero', 'special', 'sky', 'blaster', 'puzzle', 'rhythm', 'rpg', 'roguelike', 'tactics', 'rts', 'artillery', 'sim', 'brawler', 'fighting', 'stealth', 'sports', 'animlab']) {
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
    await calm(); await drag(cdp, line([w * .25, h * .5], [w * .95, h * .5], 24), 25, i => i === 2 && fullscreenChange(page)); const s2 = await st();   // (a swipe over 70% of the screen, the page going full screen under it)
    const [fa, fb] = s0.span, left = s1.x - (fa + 10), right = (fb - 10) - s2.x;
    check(`shooter ${label}: one drag from the right half flies the ship to the left edge`, left < 4, `ship at ${s1.x.toFixed(0)}, the edge at ${(fa + 10).toFixed(0)}`);
    check(`shooter ${label}: one drag flies it back to the right edge, the page going full screen under the finger`, right < 4 && !errors.length, `ship at ${s2.x.toFixed(0)}, the edge at ${(fb - 10).toFixed(0)}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
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

/* 13. kart: its buttons, the gas by itself, the stick steering, and held down backing off a wall */
if (want('kart')) {
  console.log('kart: DRIFT and ITEM, thumb-sized; it accelerates by itself; the stick steers; held down, it backs off a wall');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('kart', vp, 'kart/race'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(3600);   // (past the countdown)
    const st = () => ev(page, () => window.__game.scenes.kart.state().you);
    await ev(page, () => { window.__game.scenes.kart.race().racers.find(R => R.input).item = 'hazard'; }); await wait(200);   // (an item in hand: ITEM shows, named for it; at the back of the grid no kart is close behind, so the touch assist keeps the peel)
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, text: b.textContent.trim(), w: q.width, h: q.height }; }));
    const acts = btns.map(b => b.act).sort().join(), small = Math.min(...btns.map(b => Math.min(b.w, b.h)));
    const s0 = await st(), sx = vp.width * .2, sy = vp.height * .75;
    await drag(cdp, line([sx, sy], [sx + 50, sy], 30), 30); const s1 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `kart-${label.replace(/ /g, '-')}.png`) });
    // facing the west wall beside the start straight: the gas by itself drives it in and pins it there; the stick held down
    // (a thumb's 1.5 s) brakes, and backs it off the wall as the down key does
    await ev(page, () => { const R = window.__game.scenes.kart.race().racers.find(R => R.input); Object.assign(R.car, { x: 100, y: 500, angle: Math.PI, vx: 0, vy: 0 }); }); await wait(1500); const s2 = await st();
    let s3 = null; await drag(cdp, line([sx, sy], [sx, sy + 50], 10), 30, async i => { if (i === 9) { await wait(1500); s3 = await st(); } });
    check(`kart ${label}: DRIFT and, with an item in hand, ITEM named for it (PEEL), each a thumb's size`, acts === 'drift,item' && btns.some(b => b.act === 'item' && b.text === 'PEEL') && small >= 44, `buttons ${btns.map(b => b.act + ' ' + b.text).join(', ')}, smallest ${Math.round(small)} CSS px`);
    check(`kart ${label}: it accelerates by itself; the stick held right turns it right`, s0.auto && s0.speed > 30 && s1.angle > s0.angle + .3 && !errors.length, `speed ${Math.round(s0.speed)}, turned ${(s1.angle - s0.angle).toFixed(2)}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    check(`kart ${label}: pinned against a wall by the gas by itself, the stick held down backs it off`, s2.x < 80 && Math.abs(s2.speed) < 12 && s3 && s3.speed < -30 && s3.x > s2.x + 20 && !errors.length, `pinned at x ${Math.round(s2.x)}, speed ${Math.round(s2.speed)}; stick down: speed ${s3 && Math.round(s3.speed)}, x ${s3 && Math.round(s3.x)}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 13b. sky: its buttons, the stick banking the plane, GAS; the dive's ACT, the chute; the voyage's buttons */
if (want('sky')) {
  console.log('sky: GAS and SLOW, thumb-sized; the stick banks the plane and it turns; GAS opens the throttle; the dive\'s ACT opens the chute in its band, not above it; the voyage has GAS, SLOW and ACT; the glider SLOW alone, its air brake; the helicopter GAS, SLOW and FIRE, GAS lifting it and FIRE firing');
  const shown = page => ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, text: b.textContent, w: q.width, h: q.height, x: q.x + q.width / 2, y: q.y + q.height / 2 }; }));
  const hold = async (cdp, b, ms) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] }); await wait(ms); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(100); };
  const tap = async (cdp, b) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] }); await wait(150); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(150); };
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('sky', vp, 'sky/plane'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(1200);
    const st = () => ev(page, () => window.__game.scenes.sky.state());
    const btns = await shown(page);
    const acts = btns.map(b => b.act).sort().join(), small = Math.min(...btns.map(b => Math.min(b.w, b.h)));
    const s0 = await st(), sx = vp.width * .2, sy = vp.height * .75;
    await drag(cdp, line([sx, sy], [sx + 50, sy], 30), 30); const s1 = await st();
    const gas = btns.find(b => b.act === 'gas'); if (gas) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gas.x, y: gas.y }] }); await wait(1200); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    const s2 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `sky-${label.replace(/ /g, '-')}.png`) });
    check(`sky ${label}: GAS and SLOW, each a thumb's size`, acts === 'gas,slow' && small >= 44, `buttons ${acts}, smallest ${Math.round(small)} CSS px`);
    check(`sky ${label}: the stick held right banks the plane right and turns it; GAS opens the throttle`, s1.roll > .3 && E_turn(s0.yaw, s1.yaw) > .1 && s2.thr > s1.thr + .2 && !errors.length, `roll ${s1.roll}, turned ${E_turn(s0.yaw, s1.yaw).toFixed(2)}, throttle ${s1.thr} -> ${s2.thr}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    // the dive: ACT tapped high above the band (nothing), then the fall run on at once to the band (z 1050) and ACT again
    await ev(page, () => window.__game.game.go('sky', { part: 'dive' }, { fade: 0 })); await wait(600);
    const dv = await shown(page), dacts = dv.map(b => b.act).sort().join(), dsmall = Math.min(...dv.map(b => Math.min(b.w, b.h))), act = dv.find(b => b.act === 'act');
    if (act) await tap(cdp, act); const d0 = await st();
    await ev(page, () => { const g = window.__game.game, sky = window.__game.scenes.sky; for (let i = 0; i < 400 && sky.state().z > 1050; i++) g.advance(1 / 20); });
    if (act) await tap(cdp, act); const d1 = await st();
    await page.screenshot({ path: resolve('check-output/phone', `sky-dive-${label.replace(/ /g, '-')}.png`) });
    check(`sky ${label}: the dive's ACT and SLOW (no GAS), each a thumb's size`, dacts === 'act,slow' && dsmall >= 44, `buttons ${dacts}, smallest ${Math.round(dsmall)} CSS px`);
    check(`sky ${label}: ACT tapped above the chute's band opens nothing; tapped in it, the chute`, d0.ev === 'dive' && d0.z > 1150 && d0.chute === null && d1.chute > 600 && d1.chute < 1150 && !errors.length, `at ${d0.z}: ${d0.chute === null ? 'nothing' : 'opened at ' + d0.chute}; at the band: ${d1.chute === null ? 'nothing' : 'opened at ' + d1.chute}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ev(page, () => window.__game.game.go('sky', { part: 'voyage' }, { fade: 0 })); await wait(600);
    const vy = await shown(page), vacts = vy.map(b => b.act).sort().join(), vsmall = Math.min(...vy.map(b => Math.min(b.w, b.h)));
    check(`sky ${label}: the voyage's GAS and SLOW (ACT, LAND, only by a beacon low enough), each a thumb's size`, vacts === 'gas,slow' && vsmall >= 44 && !errors.length, `buttons ${vacts}, smallest ${Math.round(vsmall)} CSS px${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    // the hang glider: SLOW alone (no engine: no GAS), held its air brake
    await ev(page, () => window.__game.game.go('sky', { part: 'glider' }, { fade: 0 })); await wait(600);
    const gl = await shown(page), gacts = gl.map(b => b.act).sort().join(), gsmall = Math.min(...gl.map(b => Math.min(b.w, b.h))), g0 = await st();
    const slow = gl.find(b => b.act === 'slow'); if (slow) await hold(cdp, slow, 1500); const g1 = await st();
    await page.screenshot({ path: resolve('check-output/phone', `sky-glider-${label.replace(/ /g, '-')}.png`) });
    check(`sky ${label}: the glider's SLOW alone, a thumb's size; held, its air brake slows it`, gacts === 'slow' && gsmall >= 44 && g0.ev === 'glider' && g1.speed < g0.speed - 5 && !errors.length, `buttons ${gacts}, smallest ${Math.round(gsmall)} CSS px; speed ${g0.speed} -> ${g1.speed}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    // the helicopter: GAS, SLOW and ACT (labelled FIRE); GAS held lifts it off the pad, FIRE tapped fires a missile
    await ev(page, () => window.__game.game.go('sky', { part: 'heli' }, { fade: 0 })); await wait(600);
    const hb = await shown(page), hacts = hb.map(b => b.act).sort().join(), hsmall = Math.min(...hb.map(b => Math.min(b.w, b.h))), fire = hb.find(b => b.act === 'act'), up = hb.find(b => b.act === 'gas');
    const h0 = await st(); if (up) await hold(cdp, up, 1200); const h1 = await st(); if (fire) await tap(cdp, fire); const h2 = await st();
    await page.screenshot({ path: resolve('check-output/phone', `sky-heli-${label.replace(/ /g, '-')}.png`) });
    check(`sky ${label}: the helicopter's GAS, SLOW and FIRE (ACT), each a thumb's size`, hacts === 'act,gas,slow' && fire && fire.text === 'FIRE' && hsmall >= 44, `buttons ${hb.map(b => b.act + ' ' + b.text).join(', ')}, smallest ${Math.round(hsmall)} CSS px`);
    check(`sky ${label}: GAS held lifts the helicopter off the pad; FIRE tapped fires a missile`, h0.ev === 'heli' && h0.z === 0 && h1.z > 30 && h2.fired === 1 && !errors.length, `height ${h0.z} -> ${h1.z}, missiles fired ${h2.fired}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 13c. blaster: the jet's buttons and the stick; a tap's shot in the valley; a tap on a foe as drawn shoots it down */
if (want('blaster')) {
  console.log('blaster: MISSILE and ROLL, thumb-sized; the stick banks the jet; a tap in the valley shoots where it lands; a tap on a foe as drawn shoots it down');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('blaster', vp, 'blaster/burner'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(2600);
    const st = () => ev(page, () => window.__game.scenes.blaster.state());
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, w: q.width, h: q.height }; }));
    const acts = btns.map(b => b.act).sort().join(), small = Math.min(...btns.map(b => Math.min(b.w, b.h)));
    const sx = vp.width * .2, sy = vp.height * .75;
    await drag(cdp, line([sx, sy], [sx + 50, sy], 30), 30); const s1 = await st();
    await ev(page, () => window.__game.game.go('blaster', { part: 'safari' }, { fade: 0 })); await wait(2600); const v0 = await st();
    await page.touchscreen.tap(vp.width * .6, vp.height * .45); await wait(400); const v1 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `blaster-${label.replace(/ /g, '-')}.png`) });
    check(`blaster ${label}: MISSILE and ROLL, each a thumb's size`, acts === 'missile,roll' && small >= 44, `buttons ${acts}, smallest ${Math.round(small)} CSS px`);
    check(`blaster ${label}: the stick held right banks the jet; a tap in the valley moves the cursor there and shoots, once`, s1.hero[3] > .3 && v1.hero[1] !== v0.hero[1] && v1.fired === v0.fired + 1 && !errors.length, `roll ${s1.hero[3]}, cursor ${v0.hero[1]} -> ${v1.hero[1]}, shots fired ${v0.fired} -> ${v1.fired}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    // a tap squarely on a foe as the frame drew it (its box's middle, sights(): of those a tap can reach, not about to
    // reach the player, the one farthest across from the cursor), the cursor first sent to the far side of the screen
    // from it by a tap there (the camera turns with the cursor: one turned to the tap before the shot is picked would
    // miss it by more than its width): it falls, the score up
    const sighted = () => ev(page, () => { const B = window.__game.scenes.blaster, c = B.state().hero[1]; return B.sights().filter(o => o.w >= 12 && o.d > 200).sort((a, b) => Math.abs(b.x - c) - Math.abs(a.x - c))[0]; });
    await page.waitForFunction(() => window.__game.scenes.blaster.sights().some(o => o.w >= 12 && o.d > 200), null, { timeout: 10000 }).catch(() => {});
    const far = await sighted(), gw = await ev(page, () => window.__game.game.W);
    if (far) { const [x, y] = await toCss(page, far.x < gw / 2 ? gw - 10 : 10, far.y); await page.touchscreen.tap(x, y); await wait(300); }
    const aim = await sighted(), v2 = await st(); if (aim) { const [x, y] = await toCss(page, aim.x, aim.y); await page.touchscreen.tap(x, y); } await wait(400); const v3 = await st();
    const fell = !!aim && !(await ev(page, i => window.__game.scenes.blaster.sights().some(o => o.i === i), aim.i)), turn = aim ? Math.abs(aim.x - v2.hero[1]) / gw * .25 : 0;   // turn: how far a camera turned to the tap would swing (radians), against 25 / d, the foe's half width: more, and a pick through it misses
    check(`blaster ${label}: a tap squarely on a foe as drawn, across the screen from the cursor, shoots it down`, fell && turn > 25 / aim.d && v3.score > v2.score && v3.fired === v2.fired + 1 && !errors.length, `${aim ? `a ${aim.kind} ${Math.round(aim.d)} away, ${Math.round(aim.w)} px wide, tapped at ${Math.round(aim.x)}, ${Math.round(aim.y)} (${Math.round(aim.x - v2.hero[1])} px across from the cursor, a turn of ${turn.toFixed(3)} rad against the ${(25 / aim.d).toFixed(3)} that would miss it): ${fell ? 'gone' : 'still there'}` : 'no foe on the screen to tap'}, score ${v2.score} -> ${v3.score}, shots fired ${v2.fired} -> ${v3.fired}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 13d. road: its buttons, the gas by itself, the stick steering */
if (want('road')) {
  console.log('road: BRAKE and REWIND, thumb-sized; it accelerates by itself; the stick steers; the striker and the cotton FIRE alone');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('road', vp, 'road/car'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(1500);
    const st = () => ev(page, () => window.__game.scenes.road.state());
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, w: q.width, h: q.height }; }));
    const acts = btns.map(b => b.act).sort().join(), small = Math.min(...btns.map(b => Math.min(b.w, b.h)));
    const s0 = await st(), sx = vp.width * .2, sy = vp.height * .75;
    await drag(cdp, line([sx, sy], [sx + 50, sy], 20), 30); const s1 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `road-${label.replace(/ /g, '-')}.png`) });
    check(`road ${label}: BRAKE and REWIND, each a thumb's size`, acts === 'brake,rewind' && small >= 44, `buttons ${acts}, smallest ${Math.round(small)} CSS px`);
    check(`road ${label}: it accelerates by itself; the stick held right moves it right`, s0.speed > 30 && s1.x > s0.x + .2 && !errors.length, `speed ${s0.speed}, x ${s0.x} -> ${s1.x}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
  {   // the striker flies at its own speed: no BRAKE beside its FIRE
    const { page, ctx, errors } = await open('road', SIDE, 'road/striker'); await page.touchscreen.tap(SIDE.width / 2, SIDE.height * .3); await wait(1500);
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => b.dataset.act + ':' + b.textContent.trim()).sort().join());
    check('road striker: FIRE alone (it flies at its own speed: no BRAKE)', btns === 'nitro:FIRE' && !errors.length, `buttons ${btns}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
  {   // the cotton: the witch flies at her own speed too, FIRE alone beside the stick; the stick held right moves her right
    const { page, ctx, cdp, errors } = await open('road', UP, 'road/cotton'); await page.touchscreen.tap(UP.width / 2, UP.height * .3); await wait(1500);
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => b.dataset.act + ':' + b.textContent.trim()).sort().join());
    const st = () => ev(page, () => window.__game.scenes.road.state()), s0 = await st(), sx = UP.width * .2, sy = UP.height * .75;
    await drag(cdp, line([sx, sy], [sx + 50, sy], 20), 30); const s1 = await st();
    await page.screenshot({ path: resolve('check-output/phone', 'road-cotton.png') });
    check('road cotton: FIRE alone; the stick held right moves the witch right', btns === 'nitro:FIRE' && !!s0.cotton && s1.x > s0.x + .2 && !errors.length, `buttons ${btns}, x ${s0.x} -> ${s1.x}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 13e. zero: its button, the gas by itself, the stick steering */
if (want('zero')) {
  console.log('zero: BOOST, thumb-sized; it accelerates by itself; the stick steers');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('zero', vp, 'zero/city'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(3600);   // (past the countdown)
    await ev(page, () => { const R = window.__game.scenes.zero.race().racers.find(R => R.input); R.lap = 1; R.energy = 90; }); await wait(200);   // (BOOST shows only where it fires: from the second lap, with the energy)
    const st = () => ev(page, () => window.__game.scenes.zero.state().you);
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, w: q.width, h: q.height }; }));
    const acts = btns.map(b => b.act).sort().join(), small = Math.min(...btns.map(b => Math.min(b.w, b.h)));
    const s0 = await st(), sx = vp.width * .2, sy = vp.height * .75;
    await drag(cdp, line([sx, sy], [sx + 50, sy], 30), 30); const s1 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `zero-${label.replace(/ /g, '-')}.png`) });
    check(`zero ${label}: BOOST, a thumb's size`, acts === 'boost' && small >= 44, `buttons ${acts}, smallest ${Math.round(small)} CSS px`);
    check(`zero ${label}: it accelerates by itself; the stick held right turns it right`, s0.auto && s0.speed > 30 && E_turn(s0.angle, s1.angle) > .3 && !errors.length, `speed ${s0.speed}, turned ${E_turn(s0.angle, s1.angle).toFixed(2)}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    // its menu left alone 26 seconds races by itself; a tap (a phone presses no key) brings the menu back (state(): null there)
    const demo = await ev(page, () => { const g = window.__game.game; g.go('zero', null, { fade: 0 }); g.advance(26); const s = window.__game.scenes.zero.state(); return s && s.mode; });
    await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(400); const back = await ev(page, () => window.__game.scenes.zero.state());
    check(`zero ${label}: left alone it races by itself, and a tap brings the menu back`, demo === 'race' && back === null && !errors.length, `before the tap ${demo}, after it ${back ? back.mode : 'the menu'}`);
    await ctx.close();
  }
}

/* 13f. special: the planet's JUMP, the fort's FIRE and its stick turning the fort, the arena's stick backing the kart up */
if (want('special')) {
  console.log('special: JUMP, thumb-sized, jumps on the planet; FIRE, thumb-sized, and the stick turns the soldier in the fort; the stick pulled down backs the kart up in the arena');
  const buttons = page => ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, w: q.width, h: q.height, x: q.x + q.width / 2, y: q.y + q.height / 2, text: b.textContent.trim() }; }));
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const shot = (page, part) => { mkdirSync(resolve('check-output/phone'), { recursive: true }); return page.screenshot({ path: resolve('check-output/phone', `special-${part}-${label.replace(/ /g, '-')}.png`) }); };
    {   // the planet: one button, JUMP (the jump action's); a tap on it lifts the runner off the globe
      const { page, ctx, errors } = await open('special', vp, 'special/planet'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(400);
      const btns = await buttons(page), b = btns.find(q => q.act === 'jump'), small = Math.min(...btns.map(q => Math.min(q.w, q.h)));
      let z = 0; if (b) { await page.touchscreen.tap(b.x, b.y); for (let k = 0; k < 8; k++) { await wait(50); z = Math.max(z, (await ev(page, () => window.__game.scenes.special.state())).z); } }
      await shot(page, 'planet');
      check(`special ${label}: on the planet JUMP, a thumb's size; a tap on it jumps`, btns.length === 1 && !!b && b.text === 'JUMP' && small >= 44 && z > 0 && !errors.length, `buttons ${btns.map(q => q.text).join()}, smallest ${Math.round(small)} CSS px, the runner up ${z}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
      await ctx.close();
    }
    {   // the fort: FIRE; the stick held right turns the soldier
      const { page, ctx, cdp, errors } = await open('special', vp, 'special/turn'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(600);
      const st = () => ev(page, () => window.__game.scenes.special.state());
      const btns = await buttons(page), small = Math.min(...btns.map(b => Math.min(b.w, b.h)));
      const s0 = await st(), sx = vp.width * .2, sy = vp.height * .75;
      await drag(cdp, line([sx, sy], [sx + 50, sy], 30), 30); const s1 = await st();
      await shot(page, 'turn');
      check(`special ${label}: in the fort FIRE, a thumb's size`, btns.length === 1 && btns[0].act === 'fire' && btns[0].text === 'FIRE' && small >= 44, `buttons ${btns.map(q => q.text).join()}, smallest ${Math.round(small)} CSS px`);
      check(`special ${label}: the stick held right turns the soldier right`, s0.part === 'turn' && E_turn(s0.a, s1.a) > .3 && !errors.length, `turned ${E_turn(s0.a, s1.a).toFixed(2)}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
      await ctx.close();
    }
    {   // the arena: the kart drives by itself; the stick pulled down (and held) brakes it and backs it up (in the open, down
      // its lane: timed so a kart that can't would not yet have reached the wall ahead, whose bounce backs a kart up too)
      const { page, ctx, cdp, errors } = await open('special', vp, 'special/arena'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(1000);
      const st = () => ev(page, () => window.__game.scenes.special.state()), s0 = await st(), sx = vp.width * .2, sy = vp.height * .75;
      const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: y === undefined ? [] : [{ x: sx, y, id: 1 }] });
      await touch('touchStart', sy); for (let k = 1; k <= 10; k++) { await touch('touchMove', sy + k * 6); await wait(20); }
      let back = 0, s1 = s0; for (let k = 0; k < 12; k++) { await wait(100); s1 = await st(); back = Math.min(back, s1.speed); }
      await shot(page, 'arena'); await touch('touchEnd');
      check(`special ${label}: in the arena the kart drives by itself; the stick pulled down backs it up`, s0.part === 'arena' && s0.speed > 30 && back < -20 && s1.you[0] < 560 && !errors.length, `speed ${s0.speed}, then ${back} with the stick down, at ${s1.you}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
      await ctx.close();
    }
  }
}

/* 21. sports: its buttons; the stick runs the player; PASS passes; SHOOT held and let go shoots */
if (want('sports')) {
  console.log('sports: PASS, SHOOT and LOB, thumb-sized; the stick runs the player; PASS passes; SHOOT held and let go shoots');
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open('sports', vp, 'sports/match'); await page.touchscreen.tap(vp.width / 2, vp.height * .3); await wait(1800);   // (past the kickoff's whistle)
    const st = () => ev(page, () => window.__game.scenes.sports.state());
    const btns = await ev(page, () => [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.style.display !== 'none' && b.dataset.act !== 'menu').map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.act, w: q.width, h: q.height, x: q.x + q.width / 2, y: q.y + q.height / 2 }; }));
    const acts = btns.map(b => b.act).sort().join(), small = Math.min(...btns.map(b => Math.min(b.w, b.h)));
    const hold = async (b, ms) => { if (!b) return; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] }); await wait(ms); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    const kickoff = async () => { await ev(page, () => window.__game.game.go('sports', { part: 'match' }, { fade: 0 })); await wait(1800); };   // (the ball at player 1's feet)
    // each from a kickoff of its own (the CPU presses once the kickoff's rule ends): a shot, a run, a pass
    const s0 = await st(); await hold(btns.find(b => b.act === 'shoot'), 500); await wait(300); const s1 = await st();
    await kickoff(); const sx = vp.width * .2, sy = vp.height * .75, s2 = await st(); await drag(cdp, line([sx, sy], [sx + 50, sy], 20), 30); const s3 = await st();
    await kickoff(); await hold(btns.find(b => b.act === 'pass'), 120); await wait(300); const s4 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `sports-${label.replace(/ /g, '-')}.png`) });
    check(`sports ${label}: PASS, SHOOT and LOB, each a thumb's size`, acts === 'lob,pass,shoot' && small >= 44, `buttons ${acts}, smallest ${Math.round(small)} CSS px`);
    check(`sports ${label}: SHOOT held and let go shoots; the stick held right runs the player right with the ball; PASS passes`, s0.mode === 'play' && s1.shots >= 1 && s3.you.x > s2.you.x + 20 && s4.passes >= 1 && !errors.length,
      `mode ${s0.mode}, shots ${s1.shots}, x ${s2.you && s2.you.x} -> ${s3.you && s3.you.x}, passes ${s4.passes}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    // the radio (a box play goes on under, at the bottom) through a goal, with a thumb resting on the stick, then with a
    // finger resting on the pitch apart from it: at the kickoff, the buttons back, it is drawn clear of them (the game's own
    // steps, each read as its frame would draw it)
    await ev(page, () => { const D = My3D2dge.Dialog.prototype, s0 = D.say; D.say = function (...a) { if (a[1] && a[1].modal === false) window.__radio = this; return s0.apply(this, a); }; });
    const toKick = () => ev(page, () => {
      const G = window.__game.game, I = G.input, st = () => window.__game.scenes.sports.state(); let goal = false, open = 0, over = 0, worst = '';
      for (let i = 0; i < 60 * 240; i++) {
        G.advance(1 / 60); const m = st().mode, D = window.__radio; if (m === 'goal') goal = true;
        if (D && D.open) { const b = D._drawn(), t = I.touchArea(); if (goal && m === 'kickoff') { open++; if (t && b.x + b.w > t.x0 && b.x < t.x1 && b.y + b.h > t.y0 && b.y < t.y1) { over++; worst = worst || `the radio ${[b.x, b.y, b.w, b.h]} over the buttons ${[t.x0, t.y0, t.x1, t.y1].map(Math.round)}`; } } }
        if (goal && m === 'play') break;
      }
      return { goal, open, over, worst };
    });
    const rest = [vp.width * .18, vp.height * .82];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rest[0], y: rest[1], id: 1 }] }); await wait(150);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rest[0] + 20, y: rest[1] - 6, id: 1 }] }); await wait(150);
    const k1 = await toKick(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(200);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: vp.width * .7, y: vp.height * .35, id: 2 }] }); await wait(150);
    const k2 = await toKick(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(200);
    check(`sports ${label}: a thumb resting on the stick through a goal, and then a finger resting on the pitch: at the kickoffs the radio is drawn clear of PASS, SHOOT and LOB`, k1.goal && k2.goal && k1.open && k2.open && !k1.over && !k2.over && !errors.length,
      `on the stick: ${k1.goal ? `${k1.over} of ${k1.open} kickoff frames under the buttons` : 'no goal'}${k1.worst ? ` (${k1.worst})` : ''}; resting apart: ${k2.goal ? `${k2.over} of ${k2.open}` : 'no goal'}${k2.worst ? ` (${k2.worst})` : ''}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
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
    const menu = await btn('party'); if (menu) { await page.touchscreen.tap(menu.x, menu.y); await wait(300); }
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
  // a tap on a blue unit selects it; a tap on open ground orders it there. A unit alone under the finger, with 2 pixels
  // to spare all round, and the battle holding still meanwhile (timeScale 0: the steps still read input), so none marches
  // under the finger while the tap travels; the open ground found once it holds still (found before, a march can cross it
  // before the tap), and every body redrawn as it now stands first (an image kept from before, mid-swing, can be wider):
  // frames drawn, not time, since a slow machine draws fewer in a while
  await ev(page, () => { window.__fx.game.timeScale = 0; window.__fx.held = window.__fx.drawn; });
  await page.waitForFunction(() => window.__fx.drawn - window.__fx.held >= 6, null, { timeout: 10000 });
  p.empty = await ev(page, () => { const { game, rts } = window.__fx, R = game.r, S = game.screen;
    for (let y = 10; y < S.H; y += 12) for (let x = 10; x < S.W; x += 12)
      if (rts.units.every(u => Math.hypot(...R.w(u.x, u.y, 0).map((v, i) => v - [x, y][i])) > 40)) return [x, y, R.pick(x, y).length];
    return null; });
  const css = (x, y) => ev(page, ([x, y]) => { const S = window.__fx.game.screen, rc = S.canvas.getBoundingClientRect(); return [rc.left + (x * S.S + S.OX) / S.dpr, rc.top + (y * S.S + S.OY) / S.dpr]; }, [x, y]);
  const one = await ev(page, () => { const { game, rts } = window.__fx, R = game.r, S = game.screen;
    const solo = (u, x, y) => [[0, 0], [-2, 0], [2, 0], [0, -2], [0, 2]].every(([dx, dy]) => { const h = R.pick(x + dx, y + dy); return h.length === 1 && h[0] === u; });
    for (const alone of [true, false]) for (const u of rts.of('blue').filter(u => !u.building)) { const [sx, sy] = R.w(u.x, u.y, 0); if (sx > 20 && sy > 30 && sx < S.W - 20 && sy < S.H - 10 && R.pick(sx, sy - 6)[0] === u && (!alone || solo(u, sx, sy - 6))) return { id: u.id, at: [sx, sy - 6] }; }
    return null; });
  let sel = null, ord = null;
  if (one) {
    const [x, y] = await css(...one.at); await page.touchscreen.tap(x, y); await wait(200);
    sel = await ev(page, () => window.__fx.rts.selected.map(u => u.id));
    const [gx, gy] = await css(p.empty[0], p.empty[1]); await page.touchscreen.tap(gx, gy); await wait(200);
    ord = await ev(page, id => { const u = window.__fx.rts.units.find(u => u.id === id); return u && u.orders[0] ? u.orders[0].kind : null; }, one.id);
  }
  await ev(page, () => { window.__fx.game.timeScale = 1; });
  check('army: a tap on a unit selects it, a tap on open ground orders it there', !!one && !!p.empty && sel.length === 1 && sel[0] === one.id && ord === 'move', one ? `selected ${JSON.stringify(sel)} (tapped ${one.id}), then its order: ${ord}` : 'no unit in front on screen');
  // a long press and a drag draws a box that selects the units inside (before any drag has moved the camera: it eases)
  const box = await ev(page, () => { const { game, rts } = window.__fx, R = game.r, S = game.screen, blue = rts.of('blue').filter(u => !u.building);   // (they hold still for it)
    for (const u of blue) { u.K = Object.assign({}, u.K, { sight: 0 }); } rts.order(blue, 'stop');
    const pts = blue.map(u => R.w(u.x, u.y, 0)).filter(q => q[0] > 12 && q[1] > 12 && q[0] < S.W - 12 && q[1] < S.H - 12);
    if (pts.length < 3) return null; const xs = pts.map(q => q[0]).sort((a, b) => a - b), ys = pts.map(q => q[1]).sort((a, b) => a - b);
    return [xs[0] - 6, ys[0] - 6, xs[xs.length - 1] + 6, ys[ys.length - 1] + 6, pts.length]; });
  let boxed = 0, inside = 0, strays = 0;
  if (box) {
    const [ax, ay] = await css(box[0], box[1]), [bx, by] = await css(box[2], box[3]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ax, y: ay }] }); await wait(600);   // a long press (.45 s), then the drag
    for (const q of line([ax, ay], [bx, by], 10)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q[0], y: q[1] }] }); await wait(25); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(250);
    // (stopped, the crowd still jostles: a unit at the box's edge may be a few pixels past it by now, so those well inside
    // must be selected and those selected near it; those inside still standing: a foe may strike one down meanwhile)
    [boxed, inside, strays] = await ev(page, b => { const { game, rts } = window.__fx, R = game.r, S = rts.selected, m = 8, at = u => R.w(u.x, u.y, 0);
      const within = (q, d) => q[0] >= b[0] - d && q[0] <= b[2] + d && q[1] >= b[1] - d && q[1] <= b[3] + d, core = rts.of('blue').filter(u => !u.building && !u.dead && within(at(u), -m));
      return [S.length, core.length, S.filter(u => !within(at(u), m)).length + core.filter(u => !S.includes(u)).length]; }, box);
  }
  check('army: a long press and a drag draws a box that selects the units inside', !!box && inside >= 3 && boxed >= inside && !strays && !errors.length, `${boxed} selected, ${inside} well inside, ${strays} selected outside or left out (${box ? box[4] : 0} at the start)${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
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
    // (upright the room is drawn at 2x and scrolls with Pip: walk toward Finn until he is on the screen)
    for (let i = 0; i < 4; i++) { const f = await spot('finn'), W = await ev(page, () => window.__game.game.W); if (f && f[0] > 8 && f[0] < W - 8) break; await tapGame(...await room(...await ev(page, () => [Math.min(window.__game.scenes.pointclick.state().pc.hero.x + 70, 215), 150]))); await idle(); }
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

/* 21. pinball: the screen's halves flip, a swipe up plunges */
if (want('pinball')) {
  console.log('pinball: flippers and the plunger by touch');
  for (const [label, vp] of [['on its side', SIDE], ['upright', UP]]) {
    const { page, ctx, cdp, errors } = await open('pinball', vp);
    await wait(500);
    const st = () => ev(page, () => { const s = window.__game.scenes.pinball.state(); return { mode: s.mode, inLane: s.st.inLane, ball: s.balls[0] && [s.balls[0].x, s.balls[0].y], L: s.F.L.angle, R: s.F.R.angle, Lup: s.F.L.up, Rup: s.F.R.up, Lrest: s.F.L.rest, Rrest: s.F.R.rest }; });
    const touches = async (pts, ms) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })) }); await wait(ms); const s = await st(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(250); return s; };
    await page.touchscreen.tap(vp.width / 2, vp.height / 2); await wait(400);
    const s0 = await st();
    await drag(cdp, line([vp.width / 2, vp.height * .7], [vp.width / 2, vp.height * .3], 10), 30); await wait(900);
    const s1 = await st();
    check(`pinball ${label}: a tap starts a game; a swipe up fires the plunger`, s0.mode === 'play' && s0.inLane && s1.ball && s1.ball[1] < 470, `mode ${s0.mode}, in the lane ${s0.inLane}; the ball at ${s1.ball && s1.ball.map(Math.round)}`);
    for (let i = 0; i < 20 && (await st()).inLane; i++) await wait(150);
    const l = await touches([[vp.width * .2, vp.height * .6]], 250), r = await touches([[vp.width * .8, vp.height * .6]], 250), both = await touches([[vp.width * .2, vp.height * .6], [vp.width * .8, vp.height * .6]], 250), after = await st();
    const near = (a, b) => Math.abs(a - b) < .05;
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `pinball-${label.replace(/ /g, '-')}.png`) });
    check(`pinball ${label}: the left half raises the left flipper, the right half the right, two fingers both; lifted, they fall`, near(l.L, l.Lup) && near(l.R, l.Rrest) && near(r.R, r.Rup) && near(r.L, r.Lrest) && near(both.L, both.Lup) && near(both.R, both.Rup) && near(after.L, after.Lrest) && near(after.R, after.Rrest) && !errors.length,
      `left ${l.L.toFixed(2)}/${l.R.toFixed(2)}, right ${r.L.toFixed(2)}/${r.R.toFixed(2)}, both ${both.L.toFixed(2)}/${both.R.toFixed(2)}, after ${after.L.toFixed(2)}/${after.R.toFixed(2)}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 22. artillery: a turn by touch */
if (want('artillery')) {
  console.log('artillery: a turn by touch');
  for (const [label, vp] of [['on its side', SIDE], ['upright', UP]]) {
    const { page, ctx, cdp, errors } = await open('artillery', vp);
    await wait(500);
    const st = () => ev(page, () => { const s = window.__game.scenes.artillery.state(), g = s.cur; return { mode: s.mode, phase: s.phase, turn: s.turnNo, human: !!g && s.teams[g.team].human, x: g && g.x, y: g && g.y, ground: g && g.ground, weapon: s.weapon, shots: s.stats ? s.stats.shots : 0, btn: s.buttons()[0], at: g && s.at(g.x, g.y) }; });
    const b = (await st()).btn, [bx, by] = await toCss(page, b.x + b.w / 2, b.y + b.h / 2), [, r0] = await toCss(page, 0, b.y), [, r1] = await toCss(page, 0, b.y + b.h);
    await page.touchscreen.tap(bx, by); await wait(1800);   // (the turn's banner)
    const s0 = await st();
    check(`artillery ${label}: ONE PLAYER is a thumb's height; a tap on it starts a match, the player's grub first`, r1 - r0 >= 44 && s0.mode === 'play' && s0.human && s0.phase === 'aim', `the button ${(r1 - r0).toFixed(0)} CSS px, mode ${s0.mode}, the player's turn ${s0.human}`);
    const side = s0.x < 400 ? 1 : -1, [tx, ty] = await toCss(page, s0.at[0] + side * 30, s0.at[1] - 4);
    await page.touchscreen.tap(tx, ty); await wait(1600);
    const s1 = await st(), wb = page.locator('[data-act="weapon"]'), w0 = await wb.textContent(); await wb.tap(); await wait(300);
    const w1 = await wb.textContent(), s2 = await st();
    check(`artillery ${label}: a tap beside the grub walks it there; WEAPON, named for the weapon, changes it`, Math.sign(s1.x - s0.x) === side && Math.abs(s1.x - s0.x) > 8 && w0 === 'ROCKET' && w1 === 'GRENADE' && s2.weapon === 'grenade', `walked ${(s1.x - s0.x).toFixed(1)} (toward ${side}); the button ${w0}, then ${w1}`);
    await page.locator('[data-act="jump"]').tap(); let up = 0; for (let i = 0; i < 6; i++) { await wait(60); const q = await st(); up = Math.max(up, q.y - s2.y); }
    await wait(1200); const s3 = await st(), [cx, cy] = [vp.width / 2, vp.height / 2];
    await drag(cdp, line([cx, cy], [cx - side * 55, cy + 55], 10), 30); await wait(300);
    const s4 = await st(); for (let i = 0; i < 60 && (await st()).turn < 2; i++) await wait(200);
    const s5 = await st();
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `artillery-${label.replace(/ /g, '-')}.png`) });
    check(`artillery ${label}: JUMP jumps; a drag back, let go, fires the other way; the turn passes to the CPU`, up > 4 && s3.ground && s4.shots === 1 && s5.turn >= 2 && !s5.human && !errors.length, `rose ${up.toFixed(1)}; shots ${s4.shots} (${s4.phase}); then turn ${s5.turn}, the CPU's ${!s5.human}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 23. rhythm: the four columns are the lanes */
if (want('rhythm')) {
  console.log('rhythm: the lanes by thumb');
  for (const [label, vp] of [['on its side', SIDE], ['upright', UP]]) {
    const { page, ctx, cdp, errors } = await open('rhythm', vp, 'rhythm', () => { window.addEventListener('load', () => {}); });
    await wait(600);
    const btn = await ev(page, () => window.__game.scenes.rhythm.state().buttons()[0]), [bx, by] = await toCss(page, btn.x + btn.w / 2, btn.y + btn.h / 2), [, r0] = await toCss(page, 0, btn.y), [, r1] = await toCss(page, 0, btn.y + btn.h);
    await page.touchscreen.tap(bx, by); await wait(400);
    const st0 = await ev(page, () => { const s = window.__game.scenes.rhythm.state(); return { mode: s.mode, song: s.song }; });
    check(`rhythm ${label}: STEP UP is a thumb's height; a tap on it starts the song`, r1 - r0 >= 44 && st0.mode === 'play' && st0.song === 'stepup', `the button ${(r1 - r0).toFixed(0)} CSS px, mode ${st0.mode}, ${st0.song}`);
    // touch each of the next notes' columns as it meets its target (the column's middle, low on the screen)
    const touched = [];
    for (const until = Date.now() + 20000; Date.now() < until && touched.length < 6;) {
      const nx = await ev(page, () => { const s = window.__game.scenes.rhythm.state(), a = s.rh.ahead().find(x => !x.note.j && !x.note.call && x.dt < .05 && x.dt > -.08); return a && { lane: a.note.lane, step: a.note.step }; });
      if (nx && !touched.some(t => t.step === nx.step && t.lane === nx.lane)) {
        const x = vp.width * (nx.lane + .5) / 4, y = vp.height * .85;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await wait(40); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        touched.push(nx);
      } else await wait(8);
    }
    await wait(300);
    const res = await ev(page, (T) => { const s = window.__game.scenes.rhythm.state(); return T.map(t => { const n = s.rh.notes.find(n => n.step === t.step && n.lane === t.lane); return n ? n.j : 'none'; }); }, touched);
    mkdirSync(resolve('check-output/phone'), { recursive: true }); await page.screenshot({ path: resolve('check-output/phone', `rhythm-${label.replace(/ /g, '-')}.png`) });
    const good = res.filter(j => j && j !== 'miss' && j !== 'none').length;
    check(`rhythm ${label}: a thumb on a lane's column as its note meets its target is judged in that lane`, touched.length >= 6 && good >= 5, `${touched.map((t, i) => 'lane ' + t.lane + ': ' + res[i]).join(', ')}`);
    // the calibration: back to the menu, CALIBRATE, taps anywhere below the top count
    await ev(page, () => window.__game.game.back()); await wait(300);
    const cb = await ev(page, () => window.__game.scenes.rhythm.state().buttons()[2]), [cx, cy] = await toCss(page, cb.x + cb.w / 2, cb.y + cb.h / 2);
    await page.touchscreen.tap(cx, cy); await wait(900);
    for (let i = 0; i < 4; i++) { await page.touchscreen.tap(vp.width / 2, vp.height * .7); await wait(600); }
    const cal = await ev(page, () => { const s = window.__game.scenes.rhythm.state(); return { mode: s.mode, taps: s.cal ? s.cal.taps : -1 }; });
    check(`rhythm ${label}: CALIBRATE, then taps anywhere count`, cal.mode === 'calibrate' && cal.taps >= 2 && !errors.length, `mode ${cal.mode}, ${cal.taps} taps counted${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 24. a touchless game (new E.Game({ touch: 'never' })): no touch buttons on a phone, a notice that says a controller or a
 * keyboard is needed with Settings, gone once a key is pressed */
if (want('touchless')) {
  console.log('touchless: a game that never shows touch controls, on a phone');
  const ctx = await browser.newContext({ viewport: UP, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(resolve('tools/fixtures/touchless.html')).href);
  await page.waitForFunction(() => window.__fx && window.__fx.game.sceneName === 'play'); await wait(400);
  const seen = await ev(page, () => { const n = document.querySelector('[data-sys=need]'), b = n && n.querySelector('button'), q = b && b.getBoundingClientRect();
    return { buttons: [...document.querySelectorAll('[data-sys=touch] button')].filter(b => b.offsetParent).length, shown: !!n && getComputedStyle(n).display !== 'none', text: n ? n.textContent : '', settings: q ? [q.width, q.height] : null }; });
  await page.screenshot({ path: resolve('check-output/phone', 'touchless.png') });
  if (seen.settings) { const b = await page.$('[data-sys=need] button'); await b.tap(); await wait(300); }
  const menu = await ev(page, () => window.__fx.game.shell && window.__fx.game.shell.screen);
  await ev(page, () => window.__fx.game.shell && window.__fx.game.shell.hide()); await page.keyboard.press('KeyX'); await wait(300);
  const gone = await ev(page, () => { const n = document.querySelector('[data-sys=need]'); return !n || getComputedStyle(n).display === 'none'; });
  check('touchless: no touch buttons; "Controller or keyboard required" with Settings (it opens them), gone at a key', !seen.buttons && seen.shown && /Controller or keyboard required/.test(seen.text) && seen.settings && seen.settings[1] >= 44 && menu === 'settings' && gone && !errors.length, JSON.stringify({ ...seen, menu, gone, errors }));
  await ctx.close();
}

/* 25. the engine's menus under a finger: every E.Menu row (a kit's modes, the shared GAME OVER), an E.Dialog's choices
 * (Morwen's riddle), the reference edition's FamilyMenu and the Shell's Settings and Controls tabs and sliders at least 44
 * CSS px, held either way; a menu too long for the screen on its side scrolls under a finger to its last row, which a tap
 * picks */
if (want('menus')) {
  console.log('menus: a thumb\'s rows in the engine\'s menus');
  const rowsOf = p => ev(p, () => { const S = window.__game.game.screen, k = S.S / S.dpr; return [...window.__menus].filter(m => m._box).map(m => ({ items: m.items.length, vis: m._box.vis, h: m._box.rowH * k, w: m._box.w * k, top: m._layout().y, bottom: m._layout().y + m._layout().h, H: window.__game.game.H })); });
  const hook = p => ev(p, () => { const M = My3D2dge.Menu.prototype, d0 = M.draw; window.__menus = new Set(); M.draw = function (r) { window.__menus.add(this); return d0.call(this, r); }; });
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    for (const kit of ['kart', 'fighting', 'sky']) {
      const { page, ctx, errors, cdp } = await open(kit, vp); await wait(500); await hook(page); await wait(300);
      const m = (await rowsOf(page))[0];
      check(`menus ${label}: ${kit}'s mode menu, every row a thumb's size, on the screen`, !!m && m.h >= 44 && m.w >= 44 && m.top >= 0 && m.bottom <= m.H && !errors.length, m ? `rows ${m.h.toFixed(1)} x ${m.w.toFixed(0)} CSS px, ${m.vis} of ${m.items} shown, the box ${m.top}..${m.bottom} of ${m.H}${errors.length ? '; errors: ' + errors.join(' | ') : ''}` : 'no menu drawn');
      if (kit === 'sky' && m && m.vis < m.items) {   // the rest by a finger: dragged up twice, then a tap on BACK (its last row) goes to the title
        for (let i = 0; i < 2; i++) { const b = await ev(page, () => [...window.__menus][0]._box), a = await toCss(page, b.x + b.w / 2, b.y + b.rowH * (b.vis - .5)), z = await toCss(page, b.x + b.w / 2, b.y + b.rowH * .3); await drag(cdp, line(a, z, 12), 30); await wait(300); }
        const last = await ev(page, () => { const m = [...window.__menus][0]; return m.rowAt(m.items.length - 1); });
        if (last) await page.touchscreen.tap(...await toCss(page, last[0] + last[2] / 2, last[1] + last[3] / 2)); await wait(700);
        const scene = await ev(page, () => window.__game.game.sceneName);
        check(`menus ${label}: sky's menu, too long for the screen, scrolls under a finger; a tap on its last row (BACK) picks it`, !!last && scene === 'title', `its last row ${last ? 'in view' : 'never in view'}; the scene ${scene}`);
      }
      await ctx.close();
    }
    { const { page, ctx, errors } = await open('platformer', vp); await wait(300); await ev(page, () => window.__game.game.go('over', { from: 'platformer' }, { fade: 0 })); await wait(600); await hook(page); await wait(300);
      const m = (await rowsOf(page))[0];
      check(`menus ${label}: GAME OVER's rows a thumb's size`, !!m && m.h >= 44 && m.w >= 44 && !errors.length, m ? `${m.h.toFixed(1)} x ${m.w.toFixed(0)} CSS px` : 'no menu drawn');
      await ctx.close(); }
    { const { page, ctx, errors } = await open('pointclick', vp); await wait(300);
      for (let i = 0; i < 20 && await ev(page, () => window.__game.scenes.pointclick.state().mode === 'open'); i++) { await page.touchscreen.tap(vp.width / 2, vp.height / 2); await wait(400); }   // (the opening card tapped away)
      await ev(page, () => window.__game.scenes.pointclick.state().story.run('riddle1'));
      for (let i = 0; i < 40; i++) { if (await ev(page, () => { const D = window.__game.scenes.pointclick.state().story.talk; if (D.open && D.typing) D.shown = D.pageLen; return D.open && D.choices && !D.typing && D.i >= D.pages.length - 1; })) break; await wait(100); }
      await wait(200); const q = await ev(page, () => { const D = window.__game.scenes.pointclick.state().story.talk, S = window.__game.game.screen, k = S.S / S.dpr, b = D._cbox(D._dims()); return { h: b.rh * k, w: b.w * k, top: b.y, at: D.choiceAt(1) }; });
      await page.touchscreen.tap(...await toCss(page, q.at[0], q.at[1] + q.h / 6)); await wait(400);   // (a thumb a little low of the middle: still that answer)
      const said = await ev(page, () => (window.__game.scenes.pointclick.state().story.log.filter(e => e.who === 'choice').slice(-1)[0] || {}).text);
      check(`menus ${label}: a dialog's choices (Morwen's riddle) a thumb's size; a tap a little low of A RIVER answers it`, q.h >= 44 && q.w >= 44 && q.top >= 0 && said === 'A RIVER' && !errors.length, `${q.h.toFixed(1)} x ${q.w.toFixed(0)} CSS px, the box's top ${q.top}; answered ${said}`);
      await ctx.close(); }
    { const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(resolve('dist/my-3d2dge.html')).href); await page.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName === 'title'); await wait(600);
      const f = await ev(page, () => { const m = window.__game.titleMenu, S = window.__game.game.screen, L = m.lay; return { h: L.rowH * S.S / S.dpr, view: L.view, rows: L.rows, bottom: m.y + L.view * L.rowH + 8, H: window.__game.game.H }; });
      check(`menus ${label}: the reference edition's title (FamilyMenu): rows a thumb's height`, f.h >= 44 && f.bottom <= f.H && !errors.length, `${f.h.toFixed(1)} CSS px, ${f.view} of ${f.rows} rows in view`);
      await ctx.close(); }
    { const { page, ctx, errors } = await open('platformer', vp); await wait(300); await ev(page, () => window.__game.game.menu()); await wait(300);
      const tapText = async t => { for (const e of await page.$$('.esh button')) if ((await e.textContent()).trim().toLowerCase() === t) { await e.tap(); await wait(300); return true; } return false; };
      const sizes = () => ev(page, () => [...document.querySelectorAll('.esh-tabs button, .esh input[type=range]')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim() || 'slider', Math.round(r.width), Math.round(r.height)]; }));
      await tapText('settings'); const s = await sizes(); await ev(page, () => window.__game.game.shell.back()); await wait(200); await tapText('controls'); const c = await sizes(); const all = s.concat(c), small = all.filter(e => e[2] < 44);
      check(`menus ${label}: the Shell's Settings and Controls tabs and sliders a thumb's height`, s.length >= 4 && c.length >= 4 && !small.length && !errors.length, small.length ? 'under 44: ' + small.map(e => e.join(' ')).join(', ') : `${all.length} measured, the lowest ${Math.min(...all.map(e => e[2]))} CSS px`);
      await ctx.close(); }
    // the keys first (a touch laptop, a phone after a keyboard or a pad): the rows drawn for them, a finger's tap held a moment
    // answers what it pressed on (the rows don't grow under it: they grow to a thumb's once its tap has been read)
    { const { page, ctx, errors, cdp } = await open('kart', vp); await wait(500); await hook(page); await wait(200); await useKeys(page);
      const r = await ev(page, () => { const m = [...window.__menus][0]; return { th: m._box.th, back: m.rowAt(2), dev: window.__game.game.input.lastDevice }; });
      const under = await hold(cdp, await toCss(page, r.back[0] + r.back[2] / 2, r.back[1] + r.back[3] / 2), 120, () => ev(page, () => [...window.__menus][0]._box.th)); await wait(600);
      const scene = await ev(page, () => window.__game.game.sceneName);
      check(`menus ${label}: after the keys, a finger's tap held on kart's BACK (its rows drawn small) picks BACK`, r.dev === 'keyboard' && r.th === 0 && under === 0 && scene === 'title' && !errors.length, `the device ${r.dev}, rows ${r.th ? 'a thumb\'s' : 'small'} before and ${under ? 'a thumb\'s' : 'small'} under the finger; the scene ${scene}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
      await ctx.close(); }
    { const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), page = await ctx.newPage(), errors = [], cdp = await ctx.newCDPSession(page); page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(resolve('dist/my-3d2dge.html')).href); await page.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName === 'title'); await wait(600); await useKeys(page);
      const f = await ev(page, () => { const m = window.__game.titleMenu, k = m.slices.findIndex(s => s.id === 'pointclick'); window.__picked = []; m.onPick = i => window.__picked.push(m.slices[i].label); return { at: m.spot(k), label: m.slices[k].label, h: m.lay.rowH }; });
      const under = await hold(cdp, await toCss(page, f.at[0], f.at[1]), 120, () => ev(page, () => window.__game.titleMenu.lay.rowH)); await wait(500);
      const g = await ev(page, () => { const S = window.__game.game.screen; return { picked: window.__picked, h: window.__game.titleMenu.lay.rowH * S.S / S.dpr }; });
      check(`menus ${label}: after the keys, a finger's tap held on the reference edition's ${f.label} (FamilyMenu, rows drawn small) picks it; its rows a thumb's after`, under === f.h && g.picked.join() === f.label && g.h >= 44 && !errors.length, `rows ${f.h} px before, ${under} under the finger, ${g.h.toFixed(1)} CSS px after; picked ${g.picked.join() || 'nothing'}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
      await ctx.close(); }
    { const { page, ctx, errors, cdp } = await open('pointclick', vp); await wait(300);
      for (let i = 0; i < 20 && await ev(page, () => window.__game.scenes.pointclick.state().mode === 'open'); i++) { await page.touchscreen.tap(vp.width / 2, vp.height / 2); await wait(400); }
      await ev(page, () => window.__game.scenes.pointclick.state().story.run('riddle1'));
      for (let i = 0; i < 40; i++) { if (await ev(page, () => { const D = window.__game.scenes.pointclick.state().story.talk; if (D.open && D.typing) D.shown = D.pageLen; return D.open && D.choices && !D.typing && D.i >= D.pages.length - 1; })) break; await wait(100); }
      await useKeys(page);
      const q = await ev(page, () => { const D = window.__game.scenes.pointclick.state().story.talk; return { at: D.choiceAt(0), rh: D._cbox(D._dims()).rh, first: D.choices[0] }; });
      const under = await hold(cdp, await toCss(page, q.at[0], q.at[1]), 120, () => ev(page, () => { const D = window.__game.scenes.pointclick.state().story.talk; return D._cbox(D._dims()).rh; })); await wait(500);
      const said = await ev(page, () => (window.__game.scenes.pointclick.state().story.log.filter(e => e.who === 'choice').slice(-1)[0] || {}).text);
      check(`menus ${label}: after the keys, a finger's tap held on Morwen's ${q.first} (the choices drawn small) answers it`, under === q.rh && said === q.first && !errors.length, `rows ${q.rh} px before, ${under} under the finger; answered ${said}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
      await ctx.close(); }
    // a finger that creeps past a tap's reach and back before it lifts is no tap (the layout let go of it as it strayed, and
    // the rows grew under it): after the keys, on kart's BACK as drawn small, it picks nothing, not the row now under it
    { const { page, ctx, errors, cdp } = await open('kart', vp); await wait(500); await hook(page); await wait(200); await useKeys(page);
      const r = await ev(page, () => { const m = [...window.__menus][0]; window.__picks = []; m.onPick = i => window.__picks.push(m.items[i]); return { th: m._box.th, back: m.rowAt(2) }; });
      const q = await toCss(page, r.back[0] + r.back[2] / 2, r.back[1] + r.back[3] / 2), at = (type, dx) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: q[0] + dx, y: q[1], id: 1 }] });
      await at('touchStart', 0); await wait(60); let grew = 0;
      for (const dx of [5, 10, 14, 9, 4]) { await at('touchMove', dx); await wait(50); if (dx === 4) grew = await ev(page, () => [...window.__menus][0]._box.th); }
      await at('touchEnd'); await wait(500);
      const g = await ev(page, () => ({ picks: window.__picks, scene: window.__game.game.sceneName }));
      check(`menus ${label}: after the keys, a finger on kart's BACK (its rows drawn small) that creeps past a tap's reach and back to 4 CSS px before it lifts is no tap: it picks nothing as the rows grow`, r.th === 0 && grew > 0 && !g.picks.length && g.scene === 'kart' && !errors.length, `rows ${r.th ? 'a thumb\'s' : 'small'} before and ${grew ? 'a thumb\'s' : 'small'} as it came back; picked ${g.picks.join() || 'nothing'}, the scene ${g.scene}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
      await ctx.close(); }
    // a thumb resting on the stick holds no layout for a new screen: after the keys, set down on it in play and resting there
    // still (its press held, as a tap's would be), GAME OVER comes up meanwhile a thumb's size (a scene entered), and in a
    // page of its own so do the Shell's Settings (a Shell screen opened): nothing on either was under it
    const still = async show => {
      const { page, ctx, errors, cdp } = await open('platformer', vp); await wait(500); await hook(page); await useKeys(page);
      const dev = await ev(page, () => window.__game.game.input.lastDevice), st = [vp.width * .15, vp.height * .75];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: st[0], y: st[1], id: 1 }] }); await wait(400);
      const s = await ev(page, () => { const I = window.__game.game.input; return { on: I.stickOn, held: !!I._press && I.lastDevice === 'touch' && I.layoutDevice === 'keyboard' }; });   // (the thumb's press holds the keys' layout until the screen is new)
      const got = await show(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(200); await ctx.close();
      return Object.assign(s, got, { dev, errors, said: `the device ${dev}, the stick ${s.on ? 'held' : 'not held'}, the keys' layout ${s.held ? 'held' : 'not held'} under it as the screen comes` + (errors.length ? '; errors: ' + errors.join(' | ') : '') });
    };
    const ov = await still(async page => { await ev(page, () => window.__game.game.go('over', { from: 'platformer' }, { fade: 0 })); await wait(600); const m = (await rowsOf(page))[0]; return { h: m ? m.h : 0 }; });
    check(`menus ${label}: after the keys, a thumb resting still on the stick in play (its press held): GAME OVER's rows come up a thumb's size`, ov.dev === 'keyboard' && ov.on && ov.held && ov.h >= 44 && !ov.errors.length, `${ov.said}; GAME OVER's rows ${ov.h.toFixed(1)} CSS px`);
    const se = await still(async page => { await ev(page, () => window.__game.game.menu('settings')); await wait(400); return { tabs: await ev(page, () => [...document.querySelectorAll('.esh-tabs button, .esh input[type=range]')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height))) }; });
    check(`menus ${label}: after the keys, a thumb resting still on the stick in play (its press held): the Shell's Settings tabs and sliders come up a thumb's size`, se.dev === 'keyboard' && se.on && se.held && se.tabs.length >= 4 && Math.min(...se.tabs) >= 44 && !se.errors.length, `${se.said}; Settings' ${se.tabs.join(' ')} CSS px`);
    // on GAME OVER, where nothing steers: after the keys a thumb that lands on the stick's half and moves past a tap's reach
    // lets the rows grow while it rests there (it picks nothing as it lifts); a slow tap there, held past a long press on
    // TITLE's row as drawn small, is a tap all the same and picks TITLE (the rows held under it)
    { const { page, ctx, errors, cdp } = await open('platformer', vp); await wait(300); await lastMenu(page);
      await ev(page, () => window.__game.game.go('over', { from: 'platformer' }, { fade: 0 })); await wait(800); await useKeys(page);
      const th0 = await ev(page, () => window.__menu._box.th), a = [vp.width * .12, vp.height * .85];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a[0], y: a[1], id: 1 }] }); await wait(100);
      for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a[0] + i * 5, y: a[1], id: 1 }] }); await wait(80); }
      await wait(300); const rest = await ev(page, () => { const S = window.__game.game.screen; return window.__menu._box.rowH * S.S / S.dpr; });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(400);
      const stay = await ev(page, () => window.__game.game.sceneName); await useKeys(page);
      const r = await ev(page, () => ({ th: window.__menu._box.th, row: window.__menu.rowAt(1) })), q = await toCss(page, r.row[0] + 4, r.row[1] + r.row[3] / 2);
      const under = await hold(cdp, q, 600, () => ev(page, () => window.__menu._box.th)); await wait(500);
      const scene = await ev(page, () => window.__game.game.sceneName);
      check(`menus ${label}: on GAME OVER after the keys, a thumb on the stick's half moved past a tap's reach lets the rows grow to a thumb's while it rests, and picks nothing`, th0 === 0 && rest >= 44 && stay === 'over' && !errors.length, `rows ${th0 ? 'a thumb\'s' : 'small'} before, ${rest.toFixed(1)} CSS px while it rests; then ${stay}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
      check(`menus ${label}: on GAME OVER after the keys, a slow tap (held .6 s) on TITLE's row on the stick's half picks TITLE, the rows unchanged under it`, r.th === 0 && under === 0 && q[0] < vp.width / 2 && scene === 'title' && !errors.length, `rows ${r.th ? 'a thumb\'s' : 'small'} before and ${under ? 'a thumb\'s' : 'small'} under the finger at ${q.map(Math.round)} CSS px; the scene ${scene}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
      await ctx.close(); }
  }
  // a touch laptop (a fine pointer first, the touch buttons only from the first touch): its first touch, held on a bottom
  // dialog's choice, answers that choice: neither the touch buttons it brings nor the thumb's rows move the box under it
  { const ctx = await browser.newContext({ viewport: { width: 1024, height: 896 }, deviceScaleFactor: 1, hasTouch: true }), errors = [];
    await ctx.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /\(pointer: coarse\)/.test(q) ? mm('(min-width: 99999px)') : /any-pointer: fine/.test(q) ? mm('(min-width: 0px)') : mm(q); });
    const dir = resolve('check-output/phone'), f = dir + '/laptop-dialog.html'; mkdirSync(dir, { recursive: true });
    writeFileSync(f, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block}</style><canvas id="screen"></canvas><script src="${pathToFileURL(resolve('dist/my-3d2dge.js')).href}"></script><script>
const E = My3D2dge, game = new E.Game({ res: 'snes', menu: false, fullscreen: false }), talk = new E.Dialog(game); window.__said = [];
game.start({ update(dt) { talk.update(dt); }, draw(r) { talk.draw(r); } }); game.input.touchButtons(['jump', 'attack', 'dash']);
talk.say('Which way?', { choices: ['THE NORTH ROAD', 'THE RIVER', 'THE OLD MILL'], onChoice: (i, c) => __said.push(c) }); window.__t = { game, talk };</script>`);
    const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page); page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(f).href); await page.waitForFunction(() => window.__t && __t.talk.open); await wait(500); await ev(page, () => { __t.talk.shown = __t.talk.pageLen; }); await wait(300);
    const b = await ev(page, () => { const S = __t.game.screen, rc = S.canvas.getBoundingClientRect(), at = __t.talk.choiceAt(0); return { dev: __t.game.input.lastDevice, buttons: !!__t.game.input.touchArea(), at, css: [rc.left + (at[0] * S.S + S.OX) / S.dpr, rc.top + (at[1] * S.S + S.OY) / S.dpr] }; });
    const y = await hold(cdp, b.css, 120, () => ev(page, () => ({ buttons: !!__t.game.input.touchArea(), at: __t.talk.choiceAt(0) }))); await wait(400);
    const said = await ev(page, () => __said.join());
    check('menus: a touch laptop\'s first touch, held on a bottom dialog\'s THE NORTH ROAD, answers it (the touch buttons it brings move no choice from under it)', b.dev === 'keyboard' && !b.buttons && y.buttons && y.at[1] === b.at[1] && said === 'THE NORTH ROAD' && !errors.length, `the device ${b.dev}, touch buttons ${b.buttons} -> ${y.buttons}; the choice at y ${b.at[1]} -> ${y.at[1]} under the finger; answered ${said || 'nothing'}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close(); }
}

/* 26. the move stick's half and the end menus: upright, a kit of four or five touch buttons has them in two columns right of
 * the screen's middle (the ones that come and go shown too, as in a fight), a left thumb set down at the bottom-left steers,
 * and on its side the row is as it was; GAME OVER and the rts end menu go to the title on a sideways flick (one in their
 * first moment, a dodge mashed as the run ends, does nothing) */
if (want('stick')) {
  console.log('the stick\'s half and the end menus');
  for (const kit of ['stealth', 'roguelike', 'metroidvania']) for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, cdp, errors } = await open(kit, vp); await wait(600);
    const b = await ev(page, () => { const I = window.__game.game.input, all = () => [...document.querySelectorAll('[data-sys=touch] [data-act]')].filter(b => b.dataset.act !== 'menu');
      for (const b of all()) I.touchSet(b.dataset.act, null, true);
      return all().map(b => { const q = b.getBoundingClientRect(); return { a: b.dataset.act, x0: Math.round(q.left), x1: Math.round(q.right), y1: Math.round(q.bottom) }; }); });
    const left = b.filter(q => q.x0 < vp.width / 2), cols = new Set(b.map(q => q.x0)).size;
    check(`${kit} ${label}: its ${b.length} touch buttons right of the middle (${label === 'upright' ? 'two columns' : 'a row'})`, b.length >= 4 && !left.length && (label === 'upright' ? cols === 2 : cols === b.length) && !errors.length, b.map(q => q.a + '@' + q.x0 + '..' + q.x1).join(' ') + (errors.length ? '; errors: ' + errors.join(' | ') : ''));
    if (label === 'upright') {
      const hit = await ev(page, ([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.dataset.act || e.tagName : null; }, [60, vp.height - 44]);
      let on = false; await drag(cdp, line([60, vp.height - 44], [135, vp.height - 44], 15), 30, async i => { if (i === 13) on = await ev(page, () => window.__game.game.input.stickOn && window.__game.game.input.move()[0] > .5); });
      check(`${kit} upright: a left thumb set down at the bottom-left steers`, hit === 'CANVAS' && on, `under it: ${hit}, the stick pushed right: ${on}`);
    }
    await ctx.close();
  }
  // (the flicks fed to the input on the game's own clock, input.feed('swipe'), so a busy machine's slow fingers neither
  // land in GAME OVER's first moment nor turn a flick into a drag: the gesture itself is the standard test's)
  const swipeAt = (steps, scene) => `const g = window.__game.game, I = g.input; for (let i = 0; i < ${steps}; i++) g.advance(1 / 60); I.feed('swipe', 300, 200, { dir: 'left' }); for (let i = 0; i < 40; i++) g.advance(1 / 60); return g.sceneName`;
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, errors } = await open('platformer', vp); await wait(400);
    const early = await ev(page, js => { window.__game.game.go('over', { from: 'platformer' }, { fade: 0 }); return new Function(js)(); }, swipeAt(2));
    const late = await ev(page, js => { window.__game.game.go('over', { from: 'platformer' }, { fade: 0 }); return new Function(js)(); }, swipeAt(40));
    check(`GAME OVER ${label}: a sideways flick goes to the title (not one in its first moment)`, early === 'over' && late === 'title' && !errors.length, `at once: ${early}, after .7 s: ${late}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await open('rts', UP); await wait(400);
    const after = await ev(page, js => { const u = window.__game.scenes.rts.state().rts.units; for (let i = u.length - 1; i >= 0; i--) if (u[i].side === 'red' && u[i].building) u.splice(i, 1); return new Function(js)(); }, swipeAt(120));
    check('rts upright: its end menu goes to the title on a sideways flick', after === 'title' && !errors.length, `then ${after}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
  // a real finger's flick on the move stick's half: where nothing steers by the stick (a result menu) it backs out as one on
  // the other half does; in play it is the stick's (it steers, and no flick reaches the game's swipe() or a menu)
  const watch = p => ev(p, () => { const I = window.__game.game.input, t0 = I.tick; window.__sw = []; I.tick = function (...a) { const r = t0.apply(this, a); const s = this._swipeAt || this._stickAt; if (s) window.__sw.push((this._swipeAt ? '' : 'stick ') + s.dir); return r; }; });
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, errors, cdp } = await open('platformer', vp); await wait(400); await watch(page); await lastMenu(page);
    await ev(page, () => window.__game.game.go('over', { from: 'platformer' }, { fade: 0 })); await wait(1000);
    const row = await ev(page, () => window.__menu.rowAt(0)), a = await toCss(page, row[0] + 4, row[1] + row[3] / 2), from = [Math.max(a[0], vp.width * .15), a[1]];   // (on RETRY's row, on the stick's half)
    await drag(cdp, line(from, [from[0] + vp.width * .3, from[1]], 4), 24); await wait(600);
    const over = await ev(page, () => window.__game.game.sceneName), sw = await ev(page, () => window.__sw.splice(0));
    check(`GAME OVER ${label}: a finger's sideways flick that begins on the stick's half, on RETRY's row, goes to the title and retries nothing`, from[0] < vp.width / 2 && over === 'title' && !errors.length, `from ${from.map(Math.round)} CSS px (RETRY's row from ${Math.round(a[0])}); the scene ${over}; read ${sw.join(', ') || 'no flick'}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ev(page, () => window.__game.game.go('platformer', null, { fade: 0 })); await wait(1200); await ev(page, () => window.__sw.splice(0));
    let steer = 0; await drag(cdp, line([vp.width * .15, vp.height * .6], [vp.width * .42, vp.height * .6], 4), 24, async () => { steer = Math.max(steer, await ev(page, () => { const I = window.__game.game.input; return I.stickOn ? I.stick[0] : 0; })); }); await wait(500);
    const play = await ev(page, () => ({ scene: window.__game.game.sceneName, sw: window.__sw.splice(0) }));
    check(`platformer ${label}: in play a flick on the stick's half steers, and no flick reaches the game or a menu`, steer > .5 && play.scene === 'platformer' && !play.sw.length && !errors.length, `the stick pushed ${steer.toFixed(2)}; the scene ${play.scene}; read ${play.sw.join(', ') || 'no flick'}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
  for (const [label, vp] of [['upright', UP], ['on its side', SIDE]]) {
    const { page, ctx, errors, cdp } = await open('kart', vp); await wait(400);
    await ev(page, () => window.__game.game.input.tap('confirm')); await page.waitForFunction(() => window.__game.scenes.kart.race(), null, { timeout: 10000 });
    await ev(page, () => { for (const R of window.__game.scenes.kart.race().racers) R.finished = true; });   // (every kart over the line: its results come up)
    await page.waitForFunction(() => (window.__game.scenes.kart.state() || {}).mode === 'results', null, { timeout: 15000 }); await wait(700);
    await drag(cdp, line([vp.width * .12, vp.height * .7], [vp.width * .42, vp.height * .7], 4), 24); await wait(600);
    const mode = await ev(page, () => window.__game.scenes.kart.race() ? window.__game.scenes.kart.state().mode : 'menu');
    check(`kart ${label}: its results menu backs out to its menu on a finger's sideways flick that begins on the stick's half`, mode === 'menu' && !errors.length, `then ${mode}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

/* 27. the Shell's bands keep off the touch buttons and off one another: in every kit that has them, on four phones held
 * upright and on their side, every touch button shown (those that come and go too: a fight's BLOCK and ROLL), the
 * Shell's toast (a title and a line, as stealth's say() makes one), prompt, tip and tutorial card show and lie over none
 * of them, nor the corner's buttons, nor one another, on the screen (a tip under the toast on a screen too short for both
 * waits hidden there; over a card and the prompt on a phone 320 high on its side, it reaches past the top, as it always
 * did), the card never lying under the others (that is for buttons with no room left above them); with a top HUD (an
 * objective, a status column) the toast and the prompt clear it too, but on a phone 320 high on its side, where they
 * never had the room, or where the buttons stand over half the height. Stealth's map as the minimap: under the status column, beside
 * the toast, and a finger on it (or on the card's ×) takes it, the toast staying up; on its side 640 wide, with the
 * prompt and the card up too, a toast taller than a line (a '\n' in it, or a long line) comes and goes and nothing
 * moves: the layout (above the buttons or beside them), the card's × and the minimap stay, and a finger at the ×'s
 * place takes the card; a toast of several lines where the card leaves it no room above (stealth upright 320x568, a
 * title and six lines; platformer on its side 640x360 with its minimap and the prompt, four lines): the toast, then the
 * prompt, on the screen and off the corner's buttons, the card lying under the toast while it's up, in its place, and
 * nothing a finger takes moving; a finger at the ×'s place takes the toast alone, the next the card; with no touch
 * buttons (Touch: off,
 * each piece where it always stood) a finger on the toast where it lies over the minimap takes the toast and nothing
 * else, the next finger the minimap. All of it at once (stealth's own objective and status, the minimap, the prompt, the
 * tip, the card, a toast of two lines): the stack settles in the game's steps, the toast on the screen, 140 wide or
 * more, over no button. In stealth's fight (a guard alert
 * beside the hero) the parry's toast is above BLOCK, a finger low on BLOCK presses it and leaves the toast up, and a tap
 * on the toast takes it away. A laptop's touch screen (a fine pointer: the key strip shows with the touch buttons): the
 * prompt and the tip stand over the key strip */
if (want('bands')) {
  console.log('the Shell\'s bands clear of the touch buttons and of one another');
  const PHONES = [[320, 568], [360, 640], [390, 844], [430, 932]], still = '.esh *{transition:none!important}';   // (where the bands end, not where they slide from)
  const turn = async (page, w, h) => { await page.setViewportSize({ width: w, height: h }); await page.waitForFunction(up => window.__game.game.screen.portrait === up, h > w, { polling: 'raf', timeout: 5000 }).catch(() => {}); await wait(150); };
  // every touch button shown, the mode's pieces up, a step for the shell to see them (as the game's next one would); what
  // each lies over: the touch buttons, the corner's, another piece, the top HUD (mode 'hud'), the screen's edges
  const bands = mode => {
    const G = window.__game.game, I = G.input, sh = G.shell, R = e => { if (!e || !e.isConnected) return null; const q = e.getBoundingClientRect(), c = getComputedStyle(e); return q.width && q.height && c.display !== 'none' && c.visibility !== 'hidden' ? q : null; };
    const btns = [...document.querySelectorAll('[data-sys=touch] [data-act]')]; if (!btns.length || !sh || !sh.root) return null;
    for (const b of btns) if (b.dataset.act !== 'menu') I.touchSet(b.dataset.act, null, true);
    const E3 = sh._els, all = mode === 'all', top = mode === 'hud', over = [];
    sh.toast('Checkpoint', 'The ledger is yours', 3);
    sh.hud(Object.assign({ prompt: { key: 'E', label: 'Take the ledger' } }, all && { tip: { title: 'Hidden', text: 'Stay in the grass' } },
      top && { objective: { step: '01 / 02', title: 'Steal the ledger', text: 'On the brick roof, past the two guards' }, bars: [{ label: 'Health', value: 3, max: 5, kind: 'pips' }], counts: [['Guards down', 0]] }));
    if (all) sh.tutorial('Climb', 'Walk into a wall to climb it: Space at its face latches on, the stick climbs, Space leaps up'); else sh.tutorial(null);
    sh._step();
    const ov = (q, p) => { const x = Math.min(q.right, p.right) - Math.max(q.left, p.left), y = Math.min(q.bottom, p.bottom) - Math.max(q.top, p.top); return x > .5 && y > .5 ? Math.round(x) + ' x ' + Math.round(y) : null; };
    const at = q => `${Math.round(q.left)},${Math.round(q.top)}..${Math.round(q.right)},${Math.round(q.bottom)}`;
    const pieces = [['toast', E3.toast], ['prompt', E3.pr], ['tip', E3.tip], ['card', E3.tut], ['minimap', E3.mini], ['keys', E3.keys]].map(([k, e]) => [k, R(e)]).filter(p => p[1]);
    const sunk = E3.tip.classList.contains('esh-sunk'), tq = E3.tip.getBoundingClientRect(), toast = R(E3.toast);   // (a tip under the toast: the toast covers it)
    for (const k of ['toast', 'prompt'].concat(all ? ['tip', 'card'] : [])) if (!pieces.some(p => p[0] === k) && !(k === 'tip' && sunk)) over.push(k + ' not shown');
    if (sunk && !(toast && toast.left <= tq.left + .5 && toast.right >= tq.right - .5 && toast.top <= tq.top + .5 && toast.bottom >= tq.bottom - .5)) over.push(`the tip hidden at ${at(tq)} but not under the toast`);
    const targets = btns.concat([...document.querySelectorAll('[data-sys=corner] button')]).filter(R).map(b => [b.dataset.act || b.getAttribute('aria-label'), R(b)]);
    const box = I._touchEl && I._touchEl.getBoundingClientRect(), room = innerHeight > 320 && !(box && box.top < innerHeight / 2);   // (the top HUD cleared but on a phone 320 high, or where the buttons stand over half the height)
    const hud = top && room ? [['the objective', E3.obj], ['the status', E3.vit]].map(([k, e]) => [k, R(e)]).filter(p => p[1]) : [], under = E3.tut.classList.contains('esh-yield');
    if (under) over.push('the card lies under the others');   // (only where the buttons leave it no room: none of the 2D kits)
    pieces.forEach(([k, q], i) => {
      for (const [n, p] of targets.concat(pieces.slice(i + 1), hud)) { const o = ov(q, p); if (o) over.push(`${k} over ${n} ${o}`); }
      if ((k !== 'tip' || innerHeight > 320) && (q.left < -.5 || q.top < -.5 || q.right > innerWidth + .5 || q.bottom > innerHeight + .5)) over.push(`${k} off the screen at ${at(q)}`);   // (but the tip over a card and the prompt on a phone 320 high on its side: it reaches past the top, as it always did)
    });
    sh.tutorial(null); sh.hud({}); return { n: btns.length, over };
  };
  const seen = [];
  for (const kit of ['adventure', 'pointclick', 'platformer', 'metroidvania', 'shooter', 'arcade', 'pinball', 'kart', 'road', 'zero', 'special', 'sky', 'blaster', 'puzzle', 'rhythm', 'rpg', 'roguelike', 'tactics', 'rts', 'artillery', 'sim', 'brawler', 'fighting', 'stealth', 'sports', 'animlab']) {
    const { page, ctx, errors } = await open(kit, UP); await page.addStyleTag({ content: still }); await wait(300);
    let n = 0; const bad = [];
    for (const [w, h] of PHONES.flatMap(([w, h]) => [[w, h], [h, w]])) for (const mode of ['all', 'hud']) { await turn(page, w, h); const r = await ev(page, bands, mode); if (!r) continue; n = Math.max(n, r.n); if (r.over.length) bad.push(`${w}x${h} ${mode}: ${r.over.join(', ')}`); }
    if (n) { seen.push(kit); check(`bands ${kit}: the toast, prompt, tip and card clear of its ${n} touch buttons, the corner's and one another, and the toast and prompt of a top HUD, held either way`, !bad.length && !errors.length, bad.join('; ') + (errors.length ? ' errors: ' + errors.join(' | ') : '') || 'clear at 8 sizes'); }
    await ctx.close();
  }
  check('bands: the kits with touch buttons measured (stealth, roguelike and metroidvania among them)', seen.length >= 15 && ['stealth', 'roguelike', 'metroidvania'].every(k => seen.includes(k)), seen.join(' '));
  // stealth's map as the minimap (passed every step, as the Shell's manual has it, with an onClick), its own status column
  // and a toast: the minimap under the column, beside the toast, over no touch button; a finger on it takes it (once) and
  // leaves the toast up, and a finger on the tutorial card's × takes the card and leaves the toast up
  {
    const { page, ctx, cdp, errors } = await open('stealth', UP); await page.addStyleTag({ content: still }); await wait(500);
    const tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await wait(80); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(200); };
    await tap(30, 300);   // (a finger: the device in use is touch)
    await ev(page, () => { const sh = window.__game.game.shell, st = window.__game.scenes.stealth.state(), M = { map: st.map, at: st.hero, onClick: () => window.__mini++ }, h0 = sh.hud.bind(sh); window.__mini = 0; sh.hud = s => h0(Object.assign({}, s, { minimap: M })); });
    for (const [w, h] of PHONES.flatMap(([w, h]) => [[w, h], [h, w]])) {
      await turn(page, w, h); await wait(150);
      const q = await ev(page, () => {
        const G = window.__game.game, sh = G.shell, I = G.input, E3 = sh._els, R = e => { const q = e.getBoundingClientRect(); return q.width && q.height && !e.hidden ? [q.left, q.top, q.right, q.bottom] : null; };
        for (const b of document.querySelectorAll('[data-sys=touch] [data-act]')) if (b.dataset.act !== 'menu') I.touchSet(b.dataset.act, null, true);
        sh.toast('Checkpoint', 'The ledger is yours', 30); sh._step();
        const m = R(E3.mini), ov = (a, b) => a && b && Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > .5 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > .5;
        const btn = [...document.querySelectorAll('[data-sys=touch] [data-act], [data-sys=corner] button')].map(R).filter(Boolean);
        return { m, t: R(E3.toast), col: R(E3.vit), over: [ov(m, R(E3.toast)) && 'the toast', ov(m, R(E3.vit)) && 'the status column', btn.some(b => ov(m, b)) && 'a button', m && (m[0] < 0 || m[1] < 0 || m[2] > innerWidth || m[3] > innerHeight) && 'off the screen'].filter(Boolean) };
      });
      const r = n => n ? n.map(Math.round).join(',') : 'none';
      let line = `the minimap ${r(q.m)}, the toast ${r(q.t)}, the status ${r(q.col)}`, ok = !!q.m && !q.over.length;
      if (h > w && q.m) {   // upright: real fingers on the minimap and on the card's ×, the toast up
        const x = (q.m[0] + q.m[2]) / 2, y = q.m[1] + .7 * (q.m[3] - q.m[1]); await tap(x, y);
        const a = await ev(page, () => ({ n: window.__mini, up: document.querySelector('.esh-toast').classList.contains('on') }));
        await ev(page, () => { const sh = window.__game.game.shell; window.__mini = 0; sh.tutorial('Climb', 'Walk into a wall to climb it: Space at its face latches on, the stick climbs, Space leaps up', 30); sh._step(); });
        const xq = await ev(page, () => { const q = document.querySelector('.esh-tut .esh-x').getBoundingClientRect(); return [(q.left + q.right) / 2, (q.top + q.bottom) / 2]; }); await tap(...xq);
        const b = await ev(page, () => ({ card: !document.querySelector('.esh-tut').hidden, up: document.querySelector('.esh-toast').classList.contains('on') }));
        ok = ok && a.n === 1 && a.up && !b.card && b.up; line += `; a finger on the minimap: its onClick ${a.n}x, the toast up ${a.up}; on the card's ×: the card gone ${!b.card}, the toast up ${b.up}`;
      }
      check(`bands stealth ${w}x${h}: the minimap clear of the toast, the status column and the buttons${h > w ? ', a finger on it or on the card\'s × takes only that' : ''}`, ok && !errors.length, line + (q.over.length ? '; over ' + q.over.join(', ') : '') + (errors.length ? '; errors: ' + errors.join(' | ') : ''));
    }
    // on its side 640 wide, the minimap, the prompt and the card up: a toast taller than a line (a '\n' in it, or a line too
    // long for one) comes and goes, and nothing moves (whether the pieces stand above the buttons or beside them, --fl and
    // --fr, is the screen's: no toast tips it), so a finger on the card's × or the minimap where they stood takes them
    await turn(page, 640, 360);
    await ev(page, () => { const sh = window.__game.game.shell, h1 = window.__hud1 = sh.hud; sh.hud = s => h1(Object.assign({}, s, { prompt: { key: 'E', label: 'Take the ledger' } })); sh.tutorial('Climb', 'Walk into a wall to climb it', 60); }); await wait(250);
    for (const [k, text] of [['a \'\\n\' in it', 'Strength +1\nAgility +1'], ['a long line', 'The ledger is yours: now the east gate, past the two guards on the bridge and the dogs in the yard below']]) {
      const q = await ev(page, text => {
        const G = window.__game.game, sh = G.shell, I = G.input, E3 = sh._els, show = () => { for (const b of document.querySelectorAll('[data-sys=touch] [data-act]')) if (b.dataset.act !== 'menu') I.touchSet(b.dataset.act, null, true); };
        const R = e => { const q = e && e.getBoundingClientRect(); return q && q.width && q.height && !e.hidden ? [q.left, q.top, q.right, q.bottom].map(Math.round) : null; }, mid = q => q && [(q[0] + q[2]) / 2, (q[1] + q[3]) / 2];
        const snap = () => ({ f: [sh.root.style.getPropertyValue('--fl'), sh.root.style.getPropertyValue('--fr')].join('/'), x: R(E3.tut.querySelector('.esh-x')), m: R(E3.mini) });
        const hit = (p, sel) => { const e = p && document.elementFromPoint(...p); return !!(e && e.closest(sel)); };
        show(); E3.toast.classList.remove('on'); sh._toastEnd = 0; sh._step(); const a = snap();
        sh.toast('Checkpoint', text, 30); show(); sh._step(); const b = snap(), t = R(E3.toast), lines = t ? 1 + Math.round((t[3] - t[1] - 64) / 17) : 0;
        const onX = hit(mid(a.x), '.esh-x'), onM = hit(mid(a.m), '.esh-mini');
        E3.toast.classList.remove('on'); sh._toastEnd = 0; show(); sh._step(); const c = snap();
        sh.toast('Checkpoint', text, 30); show(); sh._step(); return { a, b, c, t, lines, onX, onM, at: mid(a.x) };
      }, text);
      let ok = !!(q.a.x && q.a.m && q.t) && q.lines >= 2 && [q.b, q.c].every(s => s.f === q.a.f && JSON.stringify([s.x, s.m]) === JSON.stringify([q.a.x, q.a.m])) && q.onX && q.onM;
      let line = `the toast ${q.t} (${q.lines} lines); --fl/--fr ${q.a.f} with it away, ${q.b.f} up, ${q.c.f} gone; the card's × ${q.a.x} -> ${q.b.x} -> ${q.c.x}; the minimap ${q.a.m} -> ${q.b.m} -> ${q.c.m}; at their places from before a finger meets the × ${q.onX}, the minimap ${q.onM}`;
      if (q.at) {   // a real finger at the ×'s place while the toast is up: the card goes, the toast stays
        await tap(...q.at); const r = await ev(page, () => ({ card: !document.querySelector('.esh-tut').hidden, up: document.querySelector('.esh-toast').classList.contains('on') }));
        ok = ok && !r.card && r.up; line += `; a finger there: the card gone ${!r.card}, the toast up ${r.up}`;
        await ev(page, () => { const sh = window.__game.game.shell; sh._els.toast.classList.remove('on'); sh._toastEnd = 0; sh.tutorial('Climb', 'Walk into a wall to climb it', 60); }); await wait(150);
      }
      check(`bands stealth 640x360: a toast taller than a line (${k}) comes and goes, and the layout, the card's × and the minimap stay where they stood`, ok && !errors.length, line + (errors.length ? '; errors: ' + errors.join(' | ') : ''));
    }
    await ev(page, () => { const sh = window.__game.game.shell; sh.hud = window.__hud1; sh.tutorial(null); }); await wait(150);
    // no touch buttons (Settings, Touch: off), on its side 640 wide: each piece where it always stood, the narrow toast
    // over the minimap's top; a finger there takes the toast and nothing else (its click doesn't fall through to the
    // minimap as the toast goes from under it), and the next finger there takes the minimap
    await turn(page, 640, 360);
    await ev(page, () => { const G = window.__game.game; G.settings.set('touch', 'off'); window.__mini = 0; G.shell.toast('Checkpoint', 'The ledger is yours', 30); }); await wait(300);
    const o = await ev(page, () => { const E3 = window.__game.game.shell._els, m = E3.mini.getBoundingClientRect(), t = E3.toast.getBoundingClientRect(), y0 = Math.max(m.top, t.top), y1 = Math.min(m.bottom, t.bottom), x0 = Math.max(m.left, t.left), x1 = Math.min(m.right, t.right);
      return { buttons: !!document.querySelector('[data-sys=touch] [data-act]'), band: E3.mini.style.getPropertyValue('--y') || E3.toast.style.getPropertyValue('--y'), at: x1 - x0 > 4 && y1 - y0 > 4 ? [(x0 + x1) / 2, (y0 + y1) / 2] : null }; });
    let eat = 'no overlap to tap';
    if (o.at) {
      await tap(...o.at); const a = await ev(page, () => ({ n: window.__mini, up: document.querySelector('.esh-toast').classList.contains('on') }));
      await tap(...o.at); const b = await ev(page, () => window.__mini);
      eat = `a finger on the toast over the minimap: the toast up ${a.up}, the minimap's onClick ${a.n}x; the next finger: ${b}x`; o.ok = !a.up && a.n === 0 && b === 1;
    }
    check('bands stealth 640x360 without touch buttons: the toast where it stood, over the minimap\'s top; a finger on it takes the toast only, the next the minimap', !o.buttons && !o.band && !!o.ok && !errors.length, eat + (o.buttons ? '; touch buttons still up' : '') + (o.band ? '; a piece still stood by the bands (--y ' + o.band + ')' : '') + (errors.length ? '; errors: ' + errors.join(' | ') : ''));
    await ctx.close();
  }
  // a toast of several lines where the card leaves it no room above: stealth upright 320x568 with the card (and the prompt,
  // with its map as the minimap or without), a title and six lines; platformer on its side 640x360 (a minimap no status
  // column narrows) with the card, the minimap and the prompt, a title and four lines. The toast, then the prompt, stay
  // on the screen and off the corner's buttons (the card lying under the toast while it's up); the layout, the card, its ×
  // and the minimap stay where they stood, and the card is on top again when the toast goes; a finger at the ×'s place
  // takes the toast alone where it lies over it, the card where it doesn't, and the next finger there the card
  for (const [kit, w, h, n, mini] of [['stealth', 320, 568, 6, false], ['stealth', 320, 568, 6, true], ['platformer', 640, 360, 4, true]]) {
    const { page, ctx, cdp, errors } = await open(kit, { width: w, height: h }); await page.addStyleTag({ content: still }); await wait(500);
    const tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await wait(80); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(200); };
    await tap(30, Math.round(h * .45));   // (a finger: the device in use is touch)
    const text = ['Strength +1', 'Agility +1', 'Stealth +1', 'Luck +1', 'Wits +1', 'Grit +1'].slice(0, n).join('\n'), card = () => window.__game.game.shell.tutorial('Climb', 'Walk into a wall to climb it: Space at its face latches on, the stick climbs, Space leaps up', 60);
    await ev(page, mini => { const sh = window.__game.game.shell, S = window.__game.scenes.stealth, st = S && S.state && S.state(), h0 = sh.hud.bind(sh), map = st ? st.map : { T: 16, w: 30, h: 20, version: 1, height: () => 0, cell: () => 0, floorAt: () => '' };
      sh.hud = s => h0(Object.assign({}, s, { prompt: { key: 'E', label: 'Take the ledger' } }, mini && { minimap: { map, at: st ? st.hero : { x: 40, y: 40 }, onClick: () => {} } })); sh.hud({}); }, mini);
    await ev(page, card); await wait(250);
    const q = await ev(page, text => {
      const G = window.__game.game, sh = G.shell, I = G.input, E3 = sh._els, show = () => { for (const b of document.querySelectorAll('[data-sys=touch] [data-act]')) if (b.dataset.act !== 'menu') I.touchSet(b.dataset.act, null, true); };
      const R = e => { const q = e && e.getBoundingClientRect(); return q && q.width && q.height && !e.hidden ? [q.left, q.top, q.right, q.bottom].map(Math.round) : null; }, ov = (a, b) => a && b && Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > .5 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > .5;
      const snap = () => ({ f: [sh.root.style.getPropertyValue('--fl'), sh.root.style.getPropertyValue('--fr')].join('/'), card: R(E3.tut), x: R(E3.tut.querySelector('.esh-x')), m: R(E3.mini), under: E3.tut.classList.contains('esh-yield') });
      const step = () => { show(); sh._step(); sh._step(); }, away = () => { E3.toast.classList.remove('on'); sh._toastEnd = 0; step(); };
      away(); const a = snap(); sh.toast('Level up', text, 30); step(); const b = snap(), t = R(E3.toast), p = R(E3.pr), lines = t ? 1 + Math.round((t[3] - t[1] - 64) / 17) : 0;
      const on = []; for (const e of document.querySelectorAll('[data-sys=corner] button, [data-sys=touch] [data-act]')) if (ov(t, R(e))) on.push(e.dataset.act || e.getAttribute('aria-label'));
      const covered = ov(t, a.x); away(); const c = snap(); sh.toast('Level up', text, 30); step();
      return { a, b, c, t, p, lines, on, covered, at: a.x && [(a.x[0] + a.x[2]) / 2, (a.x[1] + a.x[3]) / 2] };
    }, text);
    const J = JSON.stringify, same = s => s.f === q.a.f && J([s.card, s.x, s.m]) === J([q.a.card, q.a.x, q.a.m]);
    let ok = !!(q.a.x && q.t && q.p) && q.lines >= n && q.t[1] >= -.5 && q.p[1] >= -.5 && !q.on.length && same(q.b) && same(q.c) && !q.a.under && !q.c.under;
    let line = `the toast ${q.t} (${q.lines} lines)${q.on.length ? ' over ' + q.on.join(', ') : ''}, the prompt ${q.p}; the card ${q.a.card} -> ${q.b.card}${q.b.under ? ' (under the toast)' : ''} -> ${q.c.card}${q.c.under ? ' (under)' : ''}; its × ${q.a.x} -> ${q.b.x} -> ${q.c.x}; the minimap ${q.a.m} -> ${q.b.m} -> ${q.c.m}; --fl/--fr ${q.a.f}, ${q.b.f}, ${q.c.f}`;
    if (q.at) {   // real fingers at the ×'s place, the toast up
      await tap(...q.at); const r1 = await ev(page, () => ({ card: !document.querySelector('.esh-tut').hidden, up: document.querySelector('.esh-toast').classList.contains('on') }));
      await tap(...q.at); const r2 = await ev(page, () => !document.querySelector('.esh-tut').hidden);
      ok = ok && (q.covered ? !r1.up && r1.card && !r2 : r1.up && !r1.card); line += `; a finger at the ×'s place (the toast ${q.covered ? 'over it' : 'clear of it'}): the toast up ${r1.up}, the card up ${r1.card}; the next: the card up ${r2}`;
    }
    check(`bands ${kit} ${w}x${h}${mini ? ', its minimap up' : ''}: the card up and a toast of a title and ${n} lines: the toast and the prompt on the screen, off the corner's buttons; the layout, the card, its × and the minimap stay where they stood`, ok && !errors.length, line + (errors.length ? '; errors: ' + errors.join(' | ') : ''));
    await ctx.close();
  }
  // stealth with all of it at once (its own objective and status, its map as the minimap, the prompt, the tip, the card,
  // a toast of two lines, every touch button shown), in the game's own steps: the stack settles (no piece moves after
  // the first steps: the toast's lines, which change with its width, never sway where it stands), the toast at least 140
  // wide, on the screen, over no touch button nor the corner's
  {
    const { page, ctx, cdp, errors } = await open('stealth', UP); await page.addStyleTag({ content: still }); await wait(500);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 30, y: 300 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(200);
    await ev(page, () => { const G = window.__game.game, sh = G.shell, st = window.__game.scenes.stealth.state(), M = { map: st.map, at: st.hero }, h0 = sh.hud.bind(sh);
      sh.hud = s => h0(Object.assign({}, s, { minimap: M, prompt: { key: 'E', label: 'Take the ledger' }, tip: { title: 'Hidden', text: 'Stay in the grass' } })); });
    for (const [w, h] of PHONES.flatMap(([w, h]) => [[w, h], [h, w]])) {
      await turn(page, w, h);
      const r = await ev(page, async () => {
        const G = window.__game.game, sh = G.shell, I = G.input, E3 = sh._els, show = () => { for (const b of document.querySelectorAll('[data-sys=touch] [data-act]')) if (b.dataset.act !== 'menu') I.touchSet(b.dataset.act, null, true); };
        show(); sh.toast('Checkpoint', 'The ledger is yours, and the roof is quiet now', 60); sh.tutorial('Climb', 'Walk into a wall to climb it: Space at its face latches on, the stick climbs, Space leaps up', 60);
        const snap = () => [E3.toast, E3.pr, E3.tip, E3.tut, E3.mini].map(e => ['--y', '--tl', '--tr', '--mw'].map(n => e.style.getPropertyValue(n)).join('/')).join(' ') + ' ' + sh.root.style.getPropertyValue('--fl') + '/' + sh.root.style.getPropertyValue('--fr');
        const seen = []; for (let i = 0; i < 60; i++) { await new Promise(r => requestAnimationFrame(r)); show(); seen.push(snap()); }
        const q = E3.toast.getBoundingClientRect(), hit = [...document.querySelectorAll('[data-sys=touch] [data-act], [data-sys=corner] button')].filter(b => { const p = b.getBoundingClientRect(); return p.width && Math.min(q.right, p.right) - Math.max(q.left, p.left) > .5 && Math.min(q.bottom, p.bottom) - Math.max(q.top, p.top) > .5; }).map(b => b.dataset.act || b.getAttribute('aria-label'));
        return { states: new Set(seen.slice(10)).size, t: [q.left, q.top, q.right, q.bottom].map(Math.round), on: q.left >= -.5 && q.top >= -.5 && q.right <= innerWidth + .5 && q.bottom <= innerHeight + .5, hit };
      });
      check(`bands stealth ${w}x${h}, all of it at once: the stack settles, the toast on the screen, 140 wide or more, over no button`, r.states === 1 && r.on && r.t[2] - r.t[0] >= 140 && !r.hit.length && !errors.length, `${r.states} layout${r.states === 1 ? '' : 's'} after the first steps, the toast ${r.t.join(',')}${r.hit.length ? ' over ' + r.hit.join(', ') : ''}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
    }
    await ctx.close();
  }
  // stealth's fight: a guard alert beside the hero (the game's own BLOCK and ROLL up), the parry's toast as say() makes it
  const { page, ctx, cdp, errors } = await open('stealth', UP); await page.addStyleTag({ content: still }); await wait(500);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 30, y: 200 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });   // (a finger: the device in use is touch)
  await ev(page, () => { const st = window.__game.scenes.stealth.state(), { hero, guards } = st, g = guards.filter(g => !g.dead).sort((a, b) => Math.hypot(a.x - hero.x, a.y - hero.y) - Math.hypot(b.x - hero.x, b.y - hero.y))[0];
    setInterval(() => { Object.assign(g, { x: hero.x + 30, y: hero.y, z: hero.z }); g.mind.level = 2; g.mind.state = 'alert'; hero.hp = 99; }, 20); });
  for (const [w, h] of PHONES) {
    await turn(page, w, h); await wait(300);
    await ev(page, () => window.__game.game.shell.toast(My3D2dge.t('stealth.toast.parried'), '', 3)); await wait(200);
    const q = await ev(page, () => { const b = document.querySelector('[data-sys=touch] [data-act=block]').getBoundingClientRect(), t = document.querySelector('.esh-toast').getBoundingClientRect(); return { shown: !!b.width, b: [b.left, b.top, b.right, b.bottom], t: [t.left, t.top, t.right, t.bottom] }; });
    const x = (q.b[0] + q.b[2]) / 2, y = q.b[1] + .75 * (q.b[3] - q.b[1]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await wait(100);
    const held = await ev(page, () => window.__game.game.input.held.has('Act:block'));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(100);
    const up = await ev(page, () => document.querySelector('.esh-toast').classList.contains('on'));
    await page.touchscreen.tap((q.t[0] + q.t[2]) / 2, (q.t[1] + q.t[3]) / 2); await wait(150);
    const gone = await ev(page, () => !document.querySelector('.esh-toast').classList.contains('on'));
    check(`bands stealth ${w}x${h}: in a fight the parry's toast is above BLOCK, a finger low on BLOCK presses it (the toast stays), a tap on the toast takes it away`, q.shown && q.t[3] <= q.b[1] && held && up && gone && !errors.length,
      `BLOCK ${q.shown ? 'shown' : 'hidden'} at ${Math.round(q.b[1])}..${Math.round(q.b[3])}, the toast ${Math.round(q.t[1])}..${Math.round(q.t[3])}; pressed ${held}, the toast up after ${up}, gone at a tap ${gone}${errors.length ? '; errors: ' + errors.join(' | ') : ''}`);
  }
  await ctx.close();
  // a laptop's touch screen: a mouse and keys (a fine pointer, so the key strip shows), Settings, Touch: on; the keys again
  for (const vp of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }]) {
    const c = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 }), p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(pathToFileURL(resolve('dist/kits/my-3d2dge-stealth.html')).href + '#stealth'); await p.waitForFunction(() => window.__game && window.__game.game && window.__game.game.sceneName === 'stealth');
    await ev(p, () => window.__game.game.settings.set('touch', 'on')); await wait(300); await p.keyboard.down('KeyD'); await wait(150); await p.keyboard.up('KeyD'); await wait(300);
    const r = await ev(p, () => {
      const G = window.__game.game, sh = G.shell, I = G.input, E3 = sh._els, R = e => { const q = e.getBoundingClientRect(); return q.width && q.height && getComputedStyle(e).display !== 'none' ? [q.left, q.top, q.right, q.bottom] : null; };
      sh.hud({ keys: [['WASD', 'Move'], [{ act: 'attack' }, 'Attack'], [{ act: 'crouch' }, 'Crouch'], [{ act: 'interact' }, 'Interact']], prompt: { act: 'attack', label: 'Take down', hint: 'From behind' }, tip: { title: 'Hidden', text: 'Stay in the grass' } }); sh._step();
      const k = R(E3.keys), pr = R(E3.pr), tip = R(E3.tip), b = I._touchEl && R(I._touchEl), ov = (a, c) => a && c && Math.min(a[2], c[2]) - Math.max(a[0], c[0]) > .5 && Math.min(a[3], c[3]) - Math.max(a[1], c[1]) > .5;
      const out = { k, pr, tip, b, over: [ov(k, pr) && 'the prompt on the key strip', ov(tip, pr) && 'the tip on the prompt', ov(k, b) && 'the key strip on the touch buttons', ov(pr, b) && 'the prompt on the touch buttons'].filter(Boolean) }; sh.hud({}); return out;
    });
    const s = q => q ? q.map(Math.round).join(',') : 'none';
    check(`bands stealth on a laptop's touch screen ${vp.width}x${vp.height}: the prompt and the tip over the key strip, all clear of the touch buttons`, !!(r.k && r.pr && r.b) && !r.over.length && !errs.length, `touch buttons ${s(r.b)}, the key strip ${s(r.k)}, the prompt ${s(r.pr)}, the tip ${s(r.tip)}${r.over.length ? '; ' + r.over.join(', ') : ''}${errs.length ? '; errors: ' + errs.join(' | ') : ''}`);
    await c.close();
  }
}

await browser.close();
console.log(problems.length ? `\nphone test FAILED (${problems.length}):\n  ${problems.join('\n  ')}` : `\nphone test passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(problems.length ? 1 : 0);
