// The hero's captured animations in Emberdeep (src/emberdeep/96-hero-clips.js, the HERO set in src/mocap/sets/hero.js):
// each moment starts when it should and lets go when it should. In town: the stash opens his chest clip (he turns to
// the chest), the waystone his hands-on clip, a talk folds his arms; walking off takes the body back. In a level: loot
// starts the upper-body reach, a heavy blow the upper-body flinch; death plays the fall and the YOU DIED panel waits
// until he has landed; revived in town, he gets up off the ground. The gallery plays each one. Every joint stays a
// number, and no page error or engine warning may appear.
// Usage: node tools/ed-clips-test.mjs        (run node tools/build.mjs first; CHROMIUM_PATH picks a browser)
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(resolve('examples/emberdeep.html')).href;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
const problems = [], seen = [];
page.on('pageerror', e => problems.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().startsWith('my-3D2dge:'))) problems.push(m.type() + ': ' + m.text()); });
const check = (ok, what) => { if (!ok) problems.push(what); else seen.push(what); };
const wait = ms => page.waitForTimeout(ms);
const state = () => page.evaluate(() => {
  const h = __ed.ED.hero, k = h.HCL, J = h.rig.J;
  return { id: k ? k.id : null, out: k ? k.out : null, t: k ? k.t : 0, mask: k ? k.mask : null, mocap: !!h.rig.mocap, finite: Object.values(J).every(v => v.every(Number.isFinite)),
    downW: h.rig.downW || 0, headZ: J.head[2], hipZ: h.rig.o.hipZ, dead: !!h.dead, panel: __ed.UI.isOpen('death'), facing: h.facing, x: h.x, y: h.y };
});
async function open(hash) {
  await page.goto('about:blank'); await page.goto(url + '#' + hash);   // (a new hash alone would not reload the game)
  await page.waitForFunction(() => window.__ed && __ed.ED.L && __ed.ED.hero && __ed.ED.hero.rig);
  await wait(600);
}

// ---- town: the stash, the waystone, a talk ----
await open('town');
check(await page.evaluate(() => !!__ed.ED.hero.rig.HCL), 'the hero\'s rig is driven by the captured set');
await page.evaluate(() => { const h = __ed.ED.hero, c = __ed.ED.L.things.find(t => t.kind === 'stash'); h.x = c.x + 18; h.y = c.y + 6; h.facing = 0; c.use(h); });
await wait(500);
let s = await state();
check(s.id === 'chest' && s.mocap && s.finite, 'the stash opens: he plays Chest_Open (' + s.id + ')');
const toChest = await page.evaluate(() => { const h = __ed.ED.hero, c = __ed.ED.L.things.find(t => t.kind === 'stash'); return Math.abs(My3D2dge.angDiff(h.facing, Math.atan2(c.y - h.y, c.x - h.x))); });
check(toChest < .5, 'he turns to the chest (' + toChest.toFixed(2) + ' rad off)');
await page.evaluate(() => __ed.UI.closeAll());
await page.keyboard.down('KeyS'); await wait(450); await page.keyboard.up('KeyS'); await wait(300);
s = await state();
check(s.id === null || s.out, 'walking off takes the body back (' + s.id + ', out ' + s.out + ')');
await page.evaluate(() => { const h = __ed.ED.hero, w = __ed.ED.L.waystone; h.x = w.x + 16; h.y = w.y + 4; __ed.UI.open('waystone'); });
await wait(400);
s = await state();
check(s.id === 'stone' && s.finite, 'the waystone opens: he plays Interact (' + s.id + ')');
await page.evaluate(() => __ed.UI.closeAll()); await wait(2600);
s = await state();
check(s.id === null && !s.mocap, 'a one-shot ends and lets go (' + s.id + ')');
const talker = await page.evaluate(() => { const h = __ed.ED.hero, n = __ed.ED.L.npcs.find(q => !q.S.service); if (!n) return null; h.x = n.x + 12; h.y = n.y + 2; h.vx = h.vy = 0; return n.S.name; });
if (talker) {
  await wait(150); await page.keyboard.press('KeyE'); await wait(700);
  s = await state();
  check(s.id === 'wait' && s.finite, 'talking to ' + talker + ': he folds his arms (' + s.id + ')');
  for (let i = 0; i < 8 && await page.evaluate(() => { const k = __ed.ED.hero.HCL; return !!k && k.id === 'wait' && !k.out; }); i++) { await page.keyboard.press('KeyE'); await wait(250); }   // E turns the pages, then closes the talk
  await wait(500);
  s = await state();
  check(s.id === null || s.out, 'the talk ends: the arms unfold (' + s.id + ')');
} else problems.push('no townsperson without a shop to talk to');

// ---- a level: loot, a heavy blow, death, the get-up in town ----
await open('depth-1');
await page.evaluate(() => { const h = __ed.ED.hero; __ed.ED.foes.length = 0; h.act = null; __ed.BUS.emit('pickup', { item: __ed.makeItem({ base: 'longsword', rarity: 0, ilvl: 1, R: __ed.RNG('t') }) }); });
await wait(250);
s = await state();
check(s.id === 'pickup' && s.mask === 'upper' && s.finite, 'loot: he reaches for it with the upper body (' + s.id + ', ' + s.mask + ')');
await wait(900);
await page.evaluate(() => { const h = __ed.ED.hero; h.inv = 0; h.act = null; h.hp = h.maxHp; __ed.dealDamage(h, { amount: h.maxHp * .45, el: 'phys', kb: 0 }); });
await wait(120);
s = await state();
check((s.id === 'hitChest' || s.id === 'hitHead') && s.mask === 'upper' && s.finite, 'a heavy blow: the upper body snaps back (' + s.id + ')');
await wait(800);
await page.evaluate(() => { const h = __ed.ED.hero; h.inv = 0; h.act = null; __ed.dealDamage(h, { amount: h.maxHp * 50, el: 'phys', kb: 0 }); });
let landedOk = true, sawDeath = false, firstPanelT = null;
for (let i = 0; i < 60; i++) {
  await wait(100); s = await state();
  if (s.id === 'death') sawDeath = true;
  if (!s.finite) landedOk = false;
  if (s.panel && firstPanelT === null) firstPanelT = s.t;
  if (s.panel) break;
}
check(sawDeath, 'death: he plays Death01');
check(landedOk, 'every joint stays a number through the fall');
check(firstPanelT !== null && firstPanelT >= 1.4, 'the YOU DIED panel waits until he has landed (clip at ' + (firstPanelT === null ? 'never' : firstPanelT.toFixed(2)) + ' s)');
check(s.downW > .7 && s.headZ < s.hipZ, 'he lies on his back (down ' + s.downW.toFixed(2) + ', head ' + s.headZ.toFixed(1) + ' high)');
await page.evaluate(() => { __ed.UI.closeAll(); __ed.reviveHero(__ed.ED.hero); __ed.goTown(); });
await page.waitForFunction(() => __ed.ED.mode === 'town' && __ed.ED.L.npcs); await wait(300);
s = await state();
check(s.id === 'rise' && s.finite && !s.dead, 'revived in town: he gets up off the ground (' + s.id + ')');
await wait(2200);
s = await state();
check(s.id === null && s.downW < .1 && s.headZ > s.hipZ, 'he is up and the rig has him back (' + s.id + ', down ' + s.downW.toFixed(2) + ')');

// ---- the gallery plays each captured moment ----
const names = ['captured-death', 'captured-get-up', 'arms-folded', 'open-the-stash', 'use-the-waystone', 'pick-up', 'hit-in-the-chest', 'hit-in-the-head'];
const ids = ['death', 'rise', 'wait', 'chest', 'stone', 'pickup', 'hitChest', 'hitHead'];
await open('gallery/poses/' + names[0]);
for (let i = 0; i < names.length; i++) {
  await page.evaluate(n => { __ed.galOpen('poses', n); __ed.galReset(); }, names[i]);
  await wait(500);
  s = await state();
  check(s.id === ids[i] && s.mask === null && s.finite, 'gallery ' + names[i] + ' plays ' + ids[i] + ' (' + s.id + ')');
}
await page.evaluate(() => { __ed.galOpen('poses', 'hit-in-the-head'); __ed.galReset(); });
await wait(2400);
s = await state();
check(s.id === 'hitHead' && s.t < 1, 'a gallery take runs again after it ends (t ' + s.t.toFixed(2) + ')');
await page.evaluate(() => { __ed.galOpen('poses', 'idle'); __ed.galReset(); });
await wait(300);
s = await state();
check(s.id === null && !s.mocap, 'a procedural pose in the gallery has the rig back');

await browser.close();
if (problems.length) { console.error('hero clips: ' + problems.length + ' problem(s)\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('hero clips: ' + seen.length + ' checks passed: the stash, the waystone, a talk, loot, a heavy blow, death, the get-up and the gallery');
