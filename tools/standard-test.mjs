// The standard features every game gets (engine section 10b, and E.Shell's standard menu), on both editions. Each test
// holds one promise the cards make, so a game can rely on it without writing it:
//   settings     game.settings: defaults, checked values (a slider kept in range, a choice among its options), a game's
//                own settings, saved per game with a version and loaded back, bad saved values falling back to their
//                defaults, blocked storage (the game plays on, saved: false), shake and flashes scaled by them
//   pausing      pause(reason), resume(), pauseReason; a pausable scene pauses when the window loses focus or the page is
//                hidden (not a title; regaining focus never resumes; autoPause: false keeps it running) and when the
//                controller in use is unplugged
//   input        input.label() per device and controller family, the touch START (Act:menu) starting a title and pausing
//                a scene in play; on the full engine rebind() (a conflict or a reserved code changes nothing, the arrow
//                keys and d-pad stay on the moves, bindings survive use() and are saved), resetBindings()
//   page         the viewport (viewport-fit=cover, pinch zoom left alone) and the canvas's touch-action; a fixed
//                resolution filling a high-density screen ('auto' scale) or kept whole ('sharp')
//   corner       the menu and full-screen buttons: shown on a title and while paused, hidden in play; the menu button
//                pauses (the agent edition: and resumes); full screen from a click, and the player's choice kept (leaving
//                it means a phone's tap no longer takes it there)
//   menu (full)  Escape opens the pause screen (Resume, Settings, Controls, Full screen, Quit to title); arrows and Enter
//                move and choose; a slider turns with the arrows; the controls screen rebinds a key by pressing it, says
//                a conflict, Escape cancels; P closes the menu and resumes; Quit asks first (Keep playing has the focus);
//                the corner's menu on a title opens the settings and the title waits; a game's own E.Shell takes over
//                from the engine's; touch buttons follow the player's side, size and visibility settings
// Usage: node tools/standard-test.mjs [--node]   (exit code 1 on a failure; CHROMIUM_PATH picks a browser)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const EDITIONS = [['full', 'engine/my-3d2dge.js'], ['agent', 'engine/my-3d2dge-agent.js']];
const failures = [];
let passed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else { failures.push(name + (detail ? ': ' + detail : '')); console.log('  FAIL ' + name + (detail ? ': ' + detail : '')); } };
const load = file => { const ctx = { console: { log() {}, warn() {}, error: console.error } }; vm.createContext(ctx); vm.runInContext(readFileSync(join(root, file), 'utf8'), ctx, { filename: file }); return ctx.My3D2dge; };
const scenes = () => ({ title: { update() {}, draw() {} }, play: { pausable: true, update() {}, draw() {} } });

// ---- in Node: what needs no screen
for (const [ed, file] of EDITIONS) {
  const E = load(file);
  console.log(`\n${ed} edition (Node)`);
  const game = new E.Game({ headless: true, menu: { settings: [{ key: 'hints', label: 'Hints', value: true }, { key: 'level', options: ['Easy', 'Normal', 'Hard'], value: 'Normal' }] } }), S = game.settings;
  check(`${ed}: settings have their defaults`, S.volume === .7 && S.sound === true && S.shake === 1 && S.scale === 'auto' && S.fullscreen === null, JSON.stringify(S));
  check(`${ed}: a slider is kept in range, a bad value changes nothing`, S.set('volume', 3) === 1 && S.set('volume', 'loud') === 1 && S.set('volume', .25) === .25 && game.audio.volume === .25);
  check(`${ed}: a choice must be one of its options`, S.set('scale', 'huge') === 'auto' && S.set('scale', 'sharp') === 'sharp' && game.screen.scale === 'sharp');
  check(`${ed}: a game's own settings sit beside them (toggle and choice inferred)`, S.hints === true && S.spec('hints').type === 'toggle' && S.spec('level').type === 'select' && S.set('level', 'Hard') === 'Hard' && S.set('level', 'Insane') === 'Hard' && S.keys('Game').join() === 'hints,level');
  check(`${ed}: a setting cannot take a name the settings object uses`, S.define({ key: 'set', value: 1 }) === undefined && S.define({ key: 'saved', value: 1 }) === undefined && typeof S.set === 'function');
  check(`${ed}: JSON of game.settings is the values alone`, JSON.parse(JSON.stringify(S)).volume === .25 && !('_specs' in JSON.parse(JSON.stringify(S))));
  S.reset('Sound'); check(`${ed}: reset(group) puts a group back to its defaults`, S.volume === .7 && S.level === 'Hard');
  S.set('shake', 0); game.shake(5); check(`${ed}: settings.shake 0 means no shake`, game._shakeAmt === 0);
  S.set('flashes', .5); game.flash('#fff', .1, 1); check(`${ed}: settings.flashes dims flashes`, game._flash.k === .5);
  // pausing
  game.start({ scenes: scenes(), scene: 'play' }); game.advance(1 / 60);
  check(`${ed}: pause(reason) and resume()`, game.pause('focus') && game.paused && game.pauseReason === 'focus' && !game.pause('player') && (game.resume(), !game.paused && game.pauseReason === null));
  game.input.tap('pause'); game.advance(1 / 60); const byKey = game.paused && game.pauseReason === 'player'; game.input.tap('pause'); game.advance(1 / 60);
  check(`${ed}: the pause action sets pauseReason 'player', resuming clears it`, byKey && !game.paused && game.pauseReason === null);
  game.input.padIndex = 0; game.input.lastDevice = 'gamepad'; game.advance(1 / 120);   // (no gamepads here: the one in use is gone)
  check(`${ed}: a pausable scene pauses when the controller in use is unplugged`, game.paused && game.pauseReason === 'controller', game.pauseReason);
  game.resume(); game.go('title', null, { fade: 0 }); game.advance(1 / 60); game.input.padIndex = 0; game.input.lastDevice = 'gamepad'; game.advance(1 / 120);
  check(`${ed}: a title doesn't pause for it`, !game.paused);
  // the touch START: Start on a title, pause in play
  game.input.press('Act:menu'); game.advance(1 / 120); const started = game.input.pressed('start'); game.input.release('Act:menu');
  game.go('play', null, { fade: 0 }); game.advance(1 / 60); game.input.press('Act:menu'); game.advance(1 / 120); game.input.release('Act:menu');
  check(`${ed}: the touch START (Act:menu) starts a title and pauses a scene in play`, started && game.paused);
  const own = new E.Game({ headless: true, input: { start: ['Enter'], pause: ['Escape'], jump: ['Space'] } }).input.map;
  check(`${ed}: a game's own input layout gets the touch START too`, own.start.includes('Act:menu') && own.pause.includes('Act:menu') && !own.jump.includes('Act:menu'), JSON.stringify(own));
  // labels
  const I = game.input;
  check(`${ed}: input.label: the key, the mouse button, the gamepad button`, I.label('attack', 'keyboard') === 'J' && I.label('attack', 'mouse') === 'Left click' && I.label('attack', 'gamepad') === 'A' && I.label('up', 'keyboard') === 'W', [I.label('attack', 'keyboard'), I.label('attack', 'mouse'), I.label('attack', 'gamepad')].join());
  S.set('glyphs', 'playstation'); const ps = I.label('attack', 'gamepad'); S.set('glyphs', 'nintendo'); const nin = I.label('attack', 'gamepad'); S.set('glyphs', 'auto'); I.padId = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c)'; const auto = I.label('dash', 'gamepad'); I.padId = '';
  check(`${ed}: gamepad symbols by family (chosen, or from the controller's name)`, ps === '✕' && nin === 'B' && auto === '○', [ps, nin, auto].join());
  if (ed === 'full') {
    check(`${ed}: rebind: done, then a conflict and a reserved code change nothing`, I.rebind('attack', 'keys', 'KeyF') === null && I.map.attack.includes('KeyF') && !I.map.attack.includes('KeyJ') && I.rebind('dash', 'keys', 'KeyF') === 'attack' && I.rebind('attack', 'keys', 'Escape') === 'reserved' && I.rebind('pause', 'keys', 'KeyQ') === 'reserved', JSON.stringify(I.map.attack));
    check(`${ed}: rebinding saves in settings.bindings and survives input.use()`, S.bindings.attack.keys[0] === 'KeyF' && (I.use(I.preset), I.map.attack.includes('KeyF')));
    I.rebind('up', 'keys', 'KeyI');
    check(`${ed}: the arrow keys and d-pad stay on the moves`, I.map.up.includes('KeyI') && I.map.up.includes('ArrowUp') && I.map.up.includes('Pad12') && !I.map.up.includes('KeyW'));
    I.resetBindings(); check(`${ed}: resetBindings() puts every action back`, I.map.attack.includes('KeyJ') && I.map.up.includes('KeyW') && JSON.stringify(S.bindings) === '{}');
    const g2 = new E.Game({ headless: true, menu: { controls: { skill: false, attack: 'Sword' } } }); g2.input.names = { skill: false, attack: 'Sword' };
    check(`${ed}: menu.controls hides an action from rebinding`, !g2.input.rebindable('skill') && g2.input.rebindable('attack') && !g2.input.rebindable('confirm'));
  }
}

// ---- in Chromium: the page, the corner, the menu, saved settings, touch
if (!process.argv.includes('--node')) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const [ed, file] of EDITIONS) {
    console.log(`\n${ed} edition (Chromium)`);
    const engine = readFileSync(join(root, file), 'utf8').replace(/<\/script/gi, '<\\/script');
    // a page on an origin of its own (localStorage works there), the engine, and a small game with a title and a pausable play scene
    const PAGE = (opts = '{}') => `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#000"><canvas id="screen" style="width:100vw;height:100vh;display:block"></canvas><script>${engine}</script><script>
      const E = My3D2dge, game = new E.Game(Object.assign({ canvas: 'screen', res: 'snes', loop: false }, ${opts}));
      window.played = 0;
      game.start({ scene: 'title', scenes: { title: { update() { if (game.input.pressed('start')) game.go('play', null, { fade: 0 }); }, draw(r) { r.sky(['#102', '#204']); } },
        play: { pausable: true, touch: ['jump', 'attack'], update() { window.played++; }, draw(r) { r.sky(['#210', '#420']); } } } });
      window.step = (n = 2) => { for (let i = 0; i < n; i++) game.advance(1 / 60, { draw: true }); };
      step(); </script></body></html>`;
    const desk = await browser.newContext();   // (one context: its storage lasts from page to page, as a browser's does)
    const open = async (opts, ctx = desk, url = 'http://standard.test/game.html') => {
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.route('http://standard.test/**', r => r.fulfill({ contentType: 'text/html', body: PAGE(opts) }));
      await page.goto(url); page.errors = errors; return page;
    };
    const ev = (page, f, a) => page.evaluate(f, a);
    let p = await open();
    // the page made for phones
    const pg = await ev(p, () => ({ vp: document.querySelector('meta[name=viewport]').content, ta: getComputedStyle(document.getElementById('screen')).touchAction }));
    check(`${ed}: the page gets a viewport reaching the safe areas (pinch zoom left alone) and no page gestures on the canvas`, /viewport-fit=cover/.test(pg.vp) && !/user-scalable/.test(pg.vp) && pg.ta === 'none', JSON.stringify(pg));
    // the corner
    const corner = () => ev(p, () => { const c = document.getElementById('e3-corner'); return c && c.style.display !== 'none' ? [...c.children].filter(b => b.style.display !== 'none').map(b => b.getAttribute('aria-label')).join() : ''; });
    const onTitle = await corner();
    await p.keyboard.press('Enter'); await ev(p, () => step(3)); const inPlay = await corner();
    check(`${ed}: the corner's buttons show on a title (the agent edition: full screen alone, its menu is a pause) and hide in play`, onTitle === (ed === 'full' ? 'Menu,Full screen' : 'Full screen') && inPlay === '', onTitle + ' | ' + inPlay);
    // pausing by itself
    await ev(p, () => { window.dispatchEvent(new Event('blur')); step(); }); const blur = await ev(p, () => [game.paused, game.pauseReason]);
    await ev(p, () => { window.dispatchEvent(new Event('focus')); step(3); }); const back = await ev(p, () => game.paused);
    check(`${ed}: a scene in play pauses when the window loses focus, and stays paused when it comes back`, blur[0] && blur[1] === 'focus' && back, JSON.stringify([blur, back]));
    const whilePaused = await corner();
    if (ed === 'agent') {
      check(`${ed}: while paused the corner shows its menu button`, /Menu/.test(whilePaused), whilePaused);
      await p.click('#e3-corner button[aria-label=Menu]'); await ev(p, () => step());
      check(`${ed}: the corner's menu button resumes (and pauses) a scene in play`, !(await ev(p, () => game.paused)));
    } else {
      const pz = await ev(p, () => [game.shell && game.shell.screen, [...document.querySelectorAll('.esh-sh button')].map(b => b.textContent).join(), document.activeElement.textContent]);
      check(`${ed}: the pause screen opens by itself (Resume, Settings, Controls, Full screen, Quit to title), Resume focused; the corner hides`, pz[0] === 'pause' && pz[1] === 'Resume,Settings,Controls,Full screen,Quit to title' && pz[2] === 'Resume' && whilePaused === '', JSON.stringify(pz) + ' corner ' + whilePaused);
      // Settings by the keyboard, a slider turned by the arrows
      await p.keyboard.press('ArrowDown'); await ev(p, () => step()); await p.keyboard.press('Enter'); await ev(p, () => step());
      const vol0 = await ev(p, () => game.settings.volume);
      await ev(p, () => { const r = [...document.querySelectorAll('.esh-row')].find(r => /^Volume/.test(r.textContent)).querySelector('input'); r.focus(); });
      await p.keyboard.press('ArrowRight'); await ev(p, () => step()); await p.keyboard.press('ArrowRight'); await ev(p, () => step());
      const st = await ev(p, () => [game.shell.screen, game.settings.volume, game.audio.volume, [...document.querySelectorAll('.esh-k.esh-sec')].map(e => e.textContent).join()]);
      check(`${ed}: Settings: Display, Sound and Comfort; the arrows turn a slider, applied at once`, st[0] === 'settings' && st[1] > vol0 && st[2] === st[1] && st[3] === 'Display,Sound,Comfort', JSON.stringify([vol0, st]));
      await p.keyboard.press('Escape'); await ev(p, () => step());
      // Controls: rebind by pressing the key; a conflict is said and changes nothing; Escape cancels
      await ev(p, () => [...document.querySelectorAll('.esh-sh button')].find(b => b.textContent === 'Controls').click()); await ev(p, () => step());
      await p.click('.esh-bind button[aria-label^="Jump, keyboard"]'); await p.keyboard.press('KeyF'); await ev(p, () => step());
      const rb = await ev(p, () => [game.input.map.jump.includes('KeyF'), document.querySelector('.esh-status').textContent, game.settings.bindings.jump && game.settings.bindings.jump.keys]);
      await p.click('.esh-bind button[aria-label^="Attack, keyboard"]'); await p.keyboard.press('KeyF'); await ev(p, () => step());
      const cf = await ev(p, () => [document.querySelector('.esh-status').textContent, game.input.map.attack.includes('KeyF')]);
      await p.keyboard.press('Escape'); await ev(p, () => step());
      const cancel = await ev(p, () => [document.querySelector('.esh-status').textContent, game.shell.screen]);
      check(`${ed}: Controls: a key is rebound by pressing it, and saved`, rb[0] && /Jump: F/.test(rb[1]) && rb[2] && rb[2][0] === 'KeyF', JSON.stringify(rb));
      check(`${ed}: Controls: a conflict is said and changes nothing; Escape cancels the binding, not the screen`, /already Jump/.test(cf[0]) && !cf[1] && /Not changed/.test(cancel[0]) && cancel[1] === 'controls', JSON.stringify([cf, cancel]));
      // P closes the whole menu and resumes; the game sees none of it
      const before = await ev(p, () => window.played);
      await p.keyboard.press('KeyP'); await ev(p, () => step(4));
      const closed = await ev(p, () => [game.shell.screen, game.paused, window.played]);
      check(`${ed}: P (or Start) closes the menu and resumes`, closed[0] === null && !closed[1] && closed[2] > before, JSON.stringify(closed));
      // Quit to title asks first, with Keep playing focused
      await p.keyboard.press('Escape'); await ev(p, () => step(2));
      await ev(p, () => [...document.querySelectorAll('.esh-sh button')].find(b => b.textContent === 'Quit to title').click()); await ev(p, () => step());
      const q = await ev(p, () => [game.shell.screen, document.activeElement.textContent]);
      await p.keyboard.press('Escape'); await ev(p, () => step());
      const q2 = await ev(p, () => game.shell.screen);
      await ev(p, () => [...document.querySelectorAll('.esh-sh button')].find(b => b.textContent === 'Quit to title').click()); await ev(p, () => step());
      await ev(p, () => [...document.querySelectorAll('.esh-sh button')].find(b => b.textContent === 'Quit').click()); await ev(p, () => step(30));
      const q3 = await ev(p, () => [game.sceneName, game.paused, game.shell.screen]);
      check(`${ed}: Quit to title asks first (Keep playing focused, Escape goes back), then goes`, q[0] === 'confirm' && q[1] === 'Keep playing' && q2 === 'pause' && q3[0] === 'title' && !q3[1] && q3[2] === null, JSON.stringify([q, q2, q3]));
      // the corner's menu on a title: the settings, the title waiting under them, then going on
      await p.click('#e3-corner button[aria-label=Menu]'); await ev(p, () => step());
      const t1 = await ev(p, () => [game.shell.screen, game.paused]); await p.keyboard.press('Escape'); await ev(p, () => step());
      const t2 = await ev(p, () => [game.shell.screen, game.paused]);
      check(`${ed}: the corner's menu on a title opens the settings; the title waits, then goes on`, t1[0] === 'settings' && t1[1] && t2[0] === null && !t2[1], JSON.stringify([t1, t2]));
    }
    // saved settings: loaded back on the next visit; bad saved values fall back to their defaults
    await ev(p, () => { game.settings.set('volume', .3); game.settings.set('scale', 'fill'); });
    await p.close(); p = await open();
    const again = await ev(p, () => [game.settings.volume, game.settings.scale, game.audio.volume, JSON.parse(localStorage.getItem('my3d2dge:settings:/game.html')).v]);
    check(`${ed}: settings are saved per game with a version and loaded back`, again[0] === .3 && again[1] === 'fill' && again[2] === .3 && again[3] === 1, JSON.stringify(again));
    await ev(p, () => localStorage.setItem('my3d2dge:settings:/game.html', JSON.stringify({ v: 1, values: { volume: 'loud', scale: 'huge', sound: 'yes', shake: 2 } })));
    await p.close(); p = await open();
    const bad = await ev(p, () => [game.settings.volume, game.settings.scale, game.settings.sound, game.settings.shake]);
    check(`${ed}: bad saved values fall back to their defaults (a slider's out-of-range value is kept in range)`, bad.join() === '0.7,auto,true,1', JSON.stringify(bad));
    await ev(p, () => localStorage.setItem('my3d2dge:settings:/game.html', '{not json'));
    await p.close(); p = await open();
    check(`${ed}: a broken save loads as the defaults`, (await ev(p, () => game.settings.volume)) === .7 && !p.errors.length, p.errors.join());
    await ev(p, () => { Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); }; game.settings.set('volume', .4); });
    const blocked = await ev(p, () => [game.settings.saved, game.settings.volume, game.audio.volume]);
    check(`${ed}: blocked storage: the change lasts for the visit, saved is false`, blocked.join() === 'false,0.4,0.4', JSON.stringify(blocked));
    await p.close();
    // autoPause: false keeps a scene running
    p = await open('{ autoPause: false }');
    await p.keyboard.press('Enter'); await ev(p, () => { step(2); window.dispatchEvent(new Event('blur')); step(); });
    check(`${ed}: autoPause: false keeps a pausable scene running when focus goes`, !(await ev(p, () => game.paused)));
    await p.close();
    // a fixed resolution on a high-density screen fills it ('auto'), or keeps whole pixels ('sharp')
    const hd = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3 });
    p = await open('{}', hd);
    const S1 = await ev(p, () => game.screen.S); await ev(p, () => game.settings.set('scale', 'sharp')); const S2 = await ev(p, () => game.screen.S);
    check(`${ed}: a fixed resolution fills a high-density screen ('auto'), whole pixels with 'sharp'`, S1 > 5.2 && S1 % 1 !== 0 && S2 === 5, S1 + ' / ' + S2);
    await hd.close();
    // full screen from the corner, the player's choice kept; a phone's first tap goes full screen unless the player left it
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    p = await open('{}', phone);
    await p.touchscreen.tap(200, 700); await p.waitForTimeout(150); await ev(p, () => step());
    const tapped = await ev(p, () => [!!document.fullscreenElement, game.settings.fullscreen]);
    await ev(p, () => document.exitFullscreen()); await p.waitForTimeout(150); await ev(p, () => step());
    const left = await ev(p, () => [!!document.fullscreenElement, game.settings.fullscreen]);
    await p.close(); p = await open('{}', phone);
    await p.touchscreen.tap(200, 700); await p.waitForTimeout(150);
    const stays = await ev(p, () => !!document.fullscreenElement);
    const fb = await p.$('#e3-corner button[aria-label="Full screen"]'), box = await fb.boundingBox();
    await p.touchscreen.tap(box.x + 20, box.y + 20); await p.waitForTimeout(150); await ev(p, () => step());
    const byButton = await ev(p, () => [!!document.fullscreenElement, game.settings.fullscreen, document.querySelector('#e3-corner button:last-child').getAttribute('aria-label')]);
    check(`${ed}: a phone's first tap goes full screen; leaving it is kept (the next visit's tap leaves the page as it is); the corner's button goes back`, tapped.join() === 'true,true' && left.join() === 'false,false' && !stays && byButton.join() === 'true,true,Leave full screen', JSON.stringify([tapped, left, stays, byButton]));
    if (ed === 'full') {
      // touch buttons: START pauses in play; the player's side, size and visibility
      await ev(p, () => document.exitFullscreen()); await p.waitForTimeout(100);
      await ev(p, () => { game.input.tap('start'); step(3); });
      const tb = await ev(p, () => [...document.querySelectorAll('[data-sys=touch] button')].map(b => b.textContent));
      const start = await p.$('[data-sys=touch] [data-act=menu]'), sb = await start.boundingBox();
      await p.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2); await ev(p, () => step(2));
      const paused = await ev(p, () => [game.paused, game.shell.screen]);
      await ev(p, () => { game.shell.hide(); game.settings.set('hand', 'left'); game.settings.set('touchSize', 80); step(); });
      const lb = await ev(p, () => { const box = document.querySelector('[data-sys=touch]').getBoundingClientRect(), b = document.querySelector('[data-sys=touch] [data-act=jump]').getBoundingClientRect(); return [Math.round(box.left), Math.round(b.width), game.input.stickSide]; });
      await ev(p, () => { game.settings.set('touch', 'off'); step(); });
      const off = await ev(p, () => [!!document.querySelector('[data-sys=touch]'), game.input.touchEnabled]);
      check(`${ed}: touch buttons, START pausing a scene in play`, tb.join() === 'JUMP,ATTACK,START' && paused[0] && paused[1] === 'pause', JSON.stringify([tb, paused]));
      check(`${ed}: touch buttons follow the player's side, size and visibility`, lb[0] < 40 && lb[1] === 80 && lb[2] === 'right' && off.join() === 'false,false', JSON.stringify([lb, off]));
      // a game's own E.Shell takes over from the engine's: one interface, the standard menu in it
      const own = await ev(p, () => { const ui = new E.Shell(game, { screens: { help: { keys: [['W', 'Up']] } } }); game.pause(); step(); return [document.querySelectorAll('.esh').length, game.shell === ui, [...document.querySelectorAll('.esh-sh button')].map(b => b.textContent).join()]; });
      check(`${ed}: a game's own E.Shell takes over from the engine's, with the standard menu`, own[0] === 1 && own[1] && /Resume,Settings,Controls/.test(own[2]) && /Help/.test(own[2]), JSON.stringify(own));
      // menu: false: the canvas pause, no screens
      await p.close(); p = await open('{ menu: false }');
      await p.keyboard.press('Enter'); await ev(p, () => step(2)); await p.keyboard.press('Escape'); await ev(p, () => step(2));
      check(`${ed}: menu: false leaves the menu out (the canvas pause instead)`, (await ev(p, () => [game.paused, game.shell, !!document.querySelector('.esh')])).join() === 'true,,false');
    }
    if (p.errors.length) check(`${ed}: no errors`, false, p.errors.join(' | '));
    await p.close(); await phone.close(); await desk.close();
  }
  await browser.close();
}
console.log(failures.length ? `\nFAILED ${failures.length} of ${passed + failures.length}:\n  ` + failures.join('\n  ') : `\nstandard features ok: ${passed} checks`);
process.exit(failures.length ? 1 : 0);
