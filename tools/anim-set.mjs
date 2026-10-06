// A smaller animation set from a bigger one: the clips a game adopts (for example a hero's), with the proportions of the
// libraries they came from and the mannequin's look. No source files needed: it reads and writes readable set files.
// Usage: node tools/anim-set.mjs src/mocap/sets/quaternius.js --clips Death01,Chest_Open,... --name HERO --out src/mocap/sets/hero.js [--credit "..."]
import { resolve } from 'node:path';
import { readSet, writeSet } from './mocap-lib.mjs';

const args = process.argv.slice(2), from = args.find((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
if (!from || !opt('clips') || !opt('name') || !opt('out')) { console.error('Usage: node tools/anim-set.mjs set.js --clips A,B --name NAME --out out.js [--credit "..."]'); process.exit(2); }
const src = readSet(resolve(from)), names = opt('clips').split(','), missing = names.filter(n => !src.clips[n]);
if (missing.length) { console.error('not in ' + src.set + ': ' + missing.join(', ')); process.exit(1); }
const clips = {}, fit = {}, used = new Set();
for (const n of names) { clips[n] = src.clips[n]; fit[n] = src.fit[n]; used.add(src.clips[n].src); }
// the first source stays first: every clip is rebuilt on its proportions
const sources = {}; for (const id of Object.keys(src.sources)) if (used.has(id) || id === Object.keys(src.sources)[0]) sources[id] = src.sources[id];
const out = Object.assign({ set: opt('name') }, opt('title') ? { title: opt('title') } : {}, { format: src.format, credit: opt('credit', src.credit), from: src.set, fps: src.fps, sources, body: src.body, fit, clips });
const w = writeSet(out, resolve(opt('out')));
console.log(`wrote ${opt('out')}: ${w.clips} clips from ${src.set}, ${w.keys} key poses, ${w.kb.toFixed(0)} KB`);
