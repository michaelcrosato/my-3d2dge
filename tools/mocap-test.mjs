// Mocap lab check: loads examples/mocap-lab.html in a headless browser and plays every imported clip, at several
// moments, on both figures and in every view. It fails (exit code 1) on any page error or engine warning, a clip
// whose pose has a non-number in it, a retargeted hero joint that is not a number, a figure that draws nothing,
// or a mannequin whose feet end up under the floor. It also checks the stored forms: key poses stay within their
// error budget, the readable text reads back the same, mirrors back to itself, stays near the capture, rejects a
// broken edit with a clear message, and an edit applied in the panel plays.
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
  for (const [cast, n] of [['mannequin', 1], ['hero', 1], ['both', 2], ['compare', 5]]) { M.setCast(cast); await wait(); if (M.game.stats.actors !== n) out.bad.push('cast ' + cast + ' drew ' + M.game.stats.actors + ' figures, not ' + n); }
  M.setCast('both');
  // the readable format: it survives its own text, mirrors back to itself, stays close to the capture, and says
  // clearly what is wrong with a broken edit
  const R = M.RD, X = new Float32Array(M.lib.P * 3), Y = new Float32Array(M.lib.P * 3); let sum = 0, cnt = 0, worstSum = 0, worstCnt = 0;
  for (const name of M.lib.names) {
    const c = M.lib.clip(name), v = M.versions(c), o = v.read.clip, back = R.parse(R.text(o)), twice = R.mirror(R.mirror(o));
    for (let f = 0; f < c.n; f += 3) {
      const t = f / c.fps, a = R.pose(o, t, X).slice(), e1 = M.lib.error(a, R.pose(back, t, Y)), e2 = M.lib.error(a, R.pose(twice, t, Y)), cap = M.lib.sample(c, t);
      if (e1 > .5) out.bad.push(name + ': the readable text does not read back the same (' + e1.toFixed(1) + ' mm)');
      if (e2 > .5) out.bad.push(name + ': mirroring twice is not the original (' + e2.toFixed(1) + ' mm)');
      M.lib.raw.points.forEach((p, i) => { if (/^(index|pinky)/.test(p)) return; sum += Math.hypot(cap[i * 3] - a[i * 3], cap[i * 3 + 1] - a[i * 3 + 1], cap[i * 3 + 2] - a[i * 3 + 2]); cnt++; });
      worstSum += M.lib.error(cap, a); worstCnt++;
    }
    for (const k of ['k10', 'k40']) if (v[k].maxErr > ({ k10: 10, k40: 40 })[k] + .5) out.bad.push(name + ': key poses ' + k + ' stray ' + Math.round(v[k].maxErr) + ' mm');
    if (v.read.maxErr > 300) out.bad.push(name + ': the readable format strays ' + Math.round(v.read.maxErr) + ' mm from the capture');
  }
  // body points stray ~13 mm on average (under a pixel); the worst point of a frame ~57 mm (an elbow or a toe)
  out.readMean = sum / cnt; out.readWorst = worstSum / worstCnt;
  if (out.readMean > 20) out.bad.push('the readable format strays ' + out.readMean.toFixed(1) + ' mm per body point on average (more than 20)');
  if (out.readWorst > 75) out.bad.push('the readable format\'s worst point strays ' + out.readWorst.toFixed(1) + ' mm per frame on average (more than 75)');
  try { R.parse('{"keys":[{"t":0,"hips":[0,0,100]}]}'); out.bad.push('a key pose with missing fields was accepted'); } catch (e) { if (!/has no "body"/.test(e.message)) out.bad.push('unclear error for a broken edit: ' + e.message); }
  // an edit in the panel plays: raise the right arm straight up in every key pose
  M.play('Idle_Loop', true); const ed = R.parse(R.text(M.versions(M.S.clip).read.clip)); ed.keys.forEach(k => { k.armR = [0, 0, 100, 0, 0]; });
  document.getElementById('clipText').value = R.text(ed); M.apply();
  const up = R.pose(M.versions(M.S.clip).read.clip, .5), sh = M.lib.pt(up, 'shR'), fist = M.lib.pt(up, 'fistR');
  if (!(fist[2] > sh[2] + 400)) out.bad.push('an applied edit (right arm straight up) did not raise the fist above the shoulder');
  M.edits.clear();
  M.setView('threequarter'); M.play('Idle_Loop'); M.resume();
  return out;
});
await browser.close();
problems.push(...report.bad);
if (problems.length) { console.error('mocap lab: ' + problems.length + ' problem(s)\n  ' + [...new Set(problems)].slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`mocap lab: ${report.clips} clips, ${report.frames} poses checked on the mannequin and the hero; readable format ${report.readMean.toFixed(1)} mm from the capture per body point (worst point per frame ${report.readWorst.toFixed(0)} mm); no problems`);
