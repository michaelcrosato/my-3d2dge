// Mocap lab check: loads examples/mocap-lab.html in a headless browser and plays every clip of every animation set it
// carries (Quaternius, Hero, and any set added to src/mocap.template.html), at several moments, on both figures and in
// every view. It fails (exit code 1) on any page error
// or engine warning, a clip whose pose has a non-number in it, a retargeted hero joint that is not a number, a figure
// that draws nothing, or a mannequin whose feet end up under the floor. It also checks the readable format: each
// clip's text reads back the same and mirrors back to itself, a broken edit is rejected with a clear message, an edit
// applied in the panel plays and Reset restores the clip, the import kept every clip close to its capture, and a set
// picked from another (the hero's) is the same data as the clips it was picked from.
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
  const M = __mocap, R = MocapReadable, out = { sets: {}, frames: 0, bad: [] }, wait = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const views = My3D2dge.VIEW_ORDER, X = new Float32Array(R.P * 3), Y = new Float32Array(R.P * 3);
  for (const id of Object.keys(M.SETS)) {   // every set the lab carries (each set file it inlines)
    M.setSet(id); const lib = M.lib, fit = Object.values(lib.set.fit);
    out.sets[id] = { clips: lib.names.length, keys: 0, fit: fit.reduce((t, f) => t + f[0], 0) / fit.length };
    for (const name of lib.names) {
      M.play(name, true);
      const c = M.S.clip, P = lib.P; out.sets[id].keys += c.keys.length;
      for (let i = 0; i < 4; i++) {
        M.setView(views[(out.frames + i) % views.length]);
        M.seek(c.dur * i / 3); await wait(); out.frames++;
        const pose = M.S.pose;
        for (let k = 0; k < P * 3; k++) if (!Number.isFinite(pose[k])) { out.bad.push(id + ' ' + name + ': pose value ' + k + ' is not a number'); break; }
        for (const [j, v] of Object.entries(M.hero.J)) if (!v.every(Number.isFinite)) { out.bad.push(id + ' ' + name + ': hero joint ' + j + ' is not a number'); break; }
        const lift = M.groundLift(pose);
        for (const s of ['L', 'R']) { const z = Math.min(lib.pt(pose, 'toe' + s)[2], lib.pt(pose, 'ankle' + s)[2]) + lift; if (z < -1) out.bad.push(id + ' ' + name + ': mannequin ' + s + ' foot is ' + Math.round(-z) + ' mm under the floor'); }
        for (const s of ['L', 'R']) if (M.hero.J['foot' + s][2] < -.01) out.bad.push(id + ' ' + name + ': hero ' + s + ' foot is under the floor');
        if (!(M.game.stats.actors >= (M.S.cast === 'both' ? 2 : 1))) out.bad.push(id + ' ' + name + ': a figure was not drawn (actors: ' + M.game.stats.actors + ')');
      }
      // the text a model reads gives back the same motion, and mirroring twice is the original
      const back = R.parse(lib.text(c)), twice = R.mirror(R.mirror(c)), rest = lib.rest;
      for (let t = 0; t <= c.dur; t += 1 / 10) {
        const a = lib.sample(c, t, X).slice();
        const e1 = lib.error(a, lib.sample(Object.assign({}, c, back), t, Y)), e2 = lib.error(a, lib.sample(Object.assign({}, c, twice), t, Y));
        if (e1 > .5) { out.bad.push(id + ' ' + name + ': the clip text does not read back the same (' + e1.toFixed(1) + ' mm)'); break; }
        if (e2 > .5) { out.bad.push(id + ' ' + name + ': mirroring twice is not the original (' + e2.toFixed(1) + ' mm)'); break; }
      }
      // the import kept the key poses near the capture they were measured from (one pixel is ~24 mm)
      const f = lib.set.fit[name];
      if (!f) out.bad.push(id + ' ' + name + ': no fit recorded at import');
      else if (f[0] > 30 || f[1] > 300) out.bad.push(id + ' ' + name + ': strays ' + f[0] + ' mm on average, ' + f[1] + ' at worst, from its capture');
      if (!rest) out.bad.push(id + ': no rest body');
    }
    if (out.sets[id].fit > 20) out.bad.push(id + ': clips stray ' + out.sets[id].fit.toFixed(1) + ' mm from their captures on average (more than 20)');
  }
  // a set picked from another (tools/anim-set.mjs: "from") has that set's clips, key for key
  for (const [id, L] of Object.entries(M.SETS)) {
    const from = L.set.from && M.SETS[L.set.from.toLowerCase()]; if (!L.set.from) continue;
    if (!from) { out.bad.push(id + ' is picked from ' + L.set.from + ', which the lab does not carry'); continue; }
    for (const name of L.names) {
      const h = L.clip(name), q = from.clip(name);
      if (!q) { out.bad.push(id + ' clip ' + name + ' is not in ' + L.set.from); continue; }
      if (JSON.stringify(h.keys) !== JSON.stringify(q.keys)) out.bad.push(id + ' clip ' + name + ' differs from the ' + L.set.from + ' clip');
    }
  }
  M.setSet(Object.keys(M.SETS)[0]);
  for (const [cast, n] of [['mannequin', 1], ['hero', 1], ['both', 2]]) { M.setCast(cast); await wait(); if (M.game.stats.actors !== n) out.bad.push('cast ' + cast + ' drew ' + M.game.stats.actors + ' figures, not ' + n); }
  M.setCast('both');
  // a broken edit is refused with a message that says where
  try { R.parse('{"keys":[{"t":0,"hips":[0,0,100]}]}'); out.bad.push('a key pose with missing fields was accepted'); } catch (e) { if (!/has no "body"/.test(e.message)) out.bad.push('unclear error for a broken edit: ' + e.message); }
  // an edit in the panel plays: raise the right arm straight up in every key pose; Reset brings the capture back
  M.play('Idle_Loop', true); const ed = R.parse(M.lib.text(M.S.clip)); ed.keys.forEach(k => { k.armR = [0, 0, 100, 0, 0]; });
  document.getElementById('clipText').value = R.text(ed); M.apply();
  let up = M.lib.sample(M.S.clip, .5), sh = M.lib.pt(up, 'shR'), fist = M.lib.pt(up, 'fistR');
  if (!(fist[2] > sh[2] + 400)) out.bad.push('an applied edit (right arm straight up) did not raise the fist above the shoulder');
  if (!M.lib.edited('Idle_Loop')) out.bad.push('the applied edit is not marked as edited');
  document.getElementById('resetBtn').click();
  up = M.lib.sample(M.S.clip, .5); sh = M.lib.pt(up, 'shR'); fist = M.lib.pt(up, 'fistR');
  if (fist[2] > sh[2] || M.lib.edited('Idle_Loop')) out.bad.push('Reset did not restore the clip');
  M.setView('threequarter'); M.play('Idle_Loop'); M.resume();
  return out;
});
await browser.close();
problems.push(...report.bad);
if (problems.length) { console.error('mocap lab: ' + problems.length + ' problem(s)\n  ' + [...new Set(problems)].slice(0, 40).join('\n  ')); process.exit(1); }
const sets = Object.entries(report.sets).map(([id, s]) => `${id} ${s.clips} clips (${s.keys} key poses, ${s.fit.toFixed(1)} mm from the capture)`).join(', ');
console.log(`mocap lab: ${sets}; ${report.frames} poses checked on the mannequin and the hero; no problems`);
