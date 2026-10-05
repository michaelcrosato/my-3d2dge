// Mocap lab check: loads examples/mocap-lab.html in a headless browser and plays every imported clip, at several
// moments, on both figures and in every view. It fails (exit code 1) on any page error or engine warning, a clip
// whose pose has a non-number in it, a retargeted hero joint that is not a number, a figure that draws nothing,
// or a mannequin whose feet end up under the floor.
// Usage: node tools/mocap-test.mjs        (run node tools/build.mjs first; CHROMIUM_PATH picks a browser)
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const problems = [];
page.on('pageerror', e => problems.push('page error: ' + e));
page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().startsWith('my-3D2dge:'))) problems.push(m.type() + ': ' + m.text()); });
await page.goto(pathToFileURL(resolve('examples/mocap-lab.html')).href + '#Idle_Loop');
await page.waitForFunction(() => window.__mocap && __mocap.game.fps > 0, null, { timeout: 15000 });

const report = await page.evaluate(async () => {
  const M = __mocap, out = { clips: 0, frames: 0, bad: [] }, wait = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const views = My3D2dge.VIEW_ORDER;
  for (const name of M.lib.names) {
    M.play(name, true); out.clips++;
    const c = M.S.clip, P = M.lib.P;
    for (let i = 0; i < 4; i++) {
      M.setView(views[(out.frames + i) % views.length]);
      M.seek(c.dur * i / 3); await wait(); out.frames++;
      const pose = M.S.pose;
      for (let k = 0; k < P * 3; k++) if (!Number.isFinite(pose[k])) { out.bad.push(name + ': pose value ' + k + ' is not a number'); break; }
      for (const [j, v] of Object.entries(M.hero.J)) if (!v.every(Number.isFinite)) { out.bad.push(name + ': hero joint ' + j + ' is not a number'); break; }
      const lift = M.groundLift(pose);
      for (const s of ['L', 'R']) { const z = Math.min(M.lib.pt(pose, 'toe' + s)[2], M.lib.pt(pose, 'ankle' + s)[2]) + lift; if (z < -1) out.bad.push(name + ': mannequin ' + s + ' foot is ' + Math.round(-z) + ' mm under the floor'); }
      for (const s of ['L', 'R']) if (M.hero.J['foot' + s][2] < -.01) out.bad.push(name + ': hero ' + s + ' foot is under the floor');
      if (!(M.game.stats.actors >= (M.S.cast === 'both' ? 2 : 1))) out.bad.push(name + ': a figure was not drawn (actors: ' + M.game.stats.actors + ')');
    }
  }
  for (const [cast, n] of [['mannequin', 1], ['hero', 1], ['both', 2]]) { M.setCast(cast); await wait(); if (M.game.stats.actors !== n) out.bad.push('cast ' + cast + ' drew ' + M.game.stats.actors + ' figures, not ' + n); }
  M.setView('threequarter'); M.play('Idle_Loop'); M.resume();
  return out;
});
await browser.close();
problems.push(...report.bad);
if (problems.length) { console.error('mocap lab: ' + problems.length + ' problem(s)\n  ' + [...new Set(problems)].slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`mocap lab: ${report.clips} clips, ${report.frames} poses checked on the mannequin and the hero, no problems`);
