import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const [kit, hash, out, ...steps] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
p.on('pageerror', e => errs.push('ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
await p.goto(pathToFileURL(process.cwd() + '/dist/kits/my-3d2dge-' + kit + '.html').href + hash); await p.waitForFunction(() => window.__game && window.__game.game, null, { timeout: 20000 });
let i = 0;
for (const s of steps) {
  if (s.startsWith('js:')) { const r = await p.evaluate(s.slice(3)); if (r !== undefined) console.log('=>', JSON.stringify(r).slice(0, 600)); continue; }
  if (s.startsWith('adv:')) { await p.evaluate(n => window.__game.game.advance(+n), s.slice(4)); continue; }
  if (s.startsWith('shot')) { await p.waitForTimeout(50); await p.screenshot({ path: `${out}-${i++}.png` }); continue; }
  if (s.startsWith('key:')) { const [, k, ms] = s.split(':'); await p.keyboard.down(k); await p.waitForTimeout(+ms || 100); await p.keyboard.up(k); continue; }
  if (s.startsWith('wait:')) { await p.waitForTimeout(+s.slice(5)); continue; }
}
console.log(errs.slice(0, 12).join('\n') || 'no errors');
await b.close();
