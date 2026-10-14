// A smaller asset set from bigger ones: the entries a game adopts, with the whole chain of shapes they place (['use', id])
// and every material those use, and the records of the downloads they came from, so the cut set draws on its own. It reads
// and writes set files only (src/assets/sets/*.js); no source files are needed.
// Usage: node tools/asset-set.mjs src/assets/sets/kenney-furniture.js [more sets ...] --ids table,chair,kenney-survival:barrel
//          --name tavern --out src/assets/sets/tavern.js [--credit "..."]
// An id found in more than one set is picked as set:id. A core id (E.SHAPES, E.MATERIALS) needs no copy and stays as it is.
import { resolve } from 'node:path';
import { engine, readSet, writeSet, tok, js } from './asset-lib.mjs';

const args = process.argv.slice(2), opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const files = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
if (!files.length || !opt('ids') || !opt('name') || !opt('out')) { console.error('Usage: node tools/asset-set.mjs a.js [b.js ...] --ids a,set:b --name name --out out.js [--credit "..."]'); process.exit(2); }
const E = engine(), sets = files.map(f => readSet(resolve(f))), out = { set: opt('name'), credit: '', sources: {}, materials: {}, shapes: {}, sprites: {} }, from = new Map();
const fail = m => { console.error(m); process.exit(1); };
/** the set an id is in: set:id, or the one set that has it */
const find = (want, kind) => {
  const [sn, id] = want.includes(':') ? want.split(':') : [null, want], hits = sets.filter(S => (!sn || S.set === sn) && S[kind] && S[kind][id]);
  if (hits.length > 1) fail(id + ' is in ' + hits.map(S => S.set).join(' and ') + ': pick one as set:' + id);
  return hits[0] ? [hits[0], id] : [null, id];
};
const take = (S, kind, id) => {
  const k = kind + ':' + id; if (from.has(k)) { if (from.get(k) !== S.set) fail(id + ' comes from both ' + from.get(k) + ' and ' + S.set + ': rename one'); return false; }
  const e = S[kind][id]; from.set(k, S.set); out[kind][id] = e;
  if (e && e.src) { if (!S.sources[e.src]) fail(S.set + ' ' + id + ': its download ' + e.src + ' is not on record'); out.sources[e.src] = S.sources[e.src]; }
  return true;
};
/** a material a set entry names: the set's own (copied, with what it names), else the core's (left as it is) */
const material = (S, m) => {
  if (typeof m !== 'string' || m[0] === '#') return;
  if (S.materials && S.materials[m]) { if (take(S, 'materials', m) && typeof S.materials[m] === 'string' && S.materials[m][0] !== '#') material(S, S.materials[m]); return; }
  if (!E.MATERIALS[m]) fail(S.set + ': the material ' + m + ' is in neither the set nor the core library');
};
/** a shape and everything it places: ['use', id, at, { mats }] anywhere in its parts (mirror, ring, row and group too) */
const shape = (S, id) => {
  if (!S.shapes || !S.shapes[id]) { if (E.SHAPES[id]) return; fail(S.set + ': no shape ' + id + ' (nor in the core library)'); }
  if (!take(S, 'shapes', id)) return;
  const e = S.shapes[id]; for (const m of Object.values(e.mats || {})) material(S, m);
  const walk = p => { if (!Array.isArray(p)) return; if (p[0] === 'use') { shape(S, p[1]); for (const m of Object.values((p[3] && p[3].mats) || {})) material(S, m); return; } if (typeof p[0] === 'string' && !['mirror', 'ring', 'row', 'group'].includes(p[0])) { if (typeof p[1] === 'string' && !(e.mats || {})[p[1]]) material(S, p[1]); return; } for (const q of p) walk(q); };
  (e.parts || []).forEach(walk);
};
for (const want of opt('ids').split(',').filter(Boolean)) {
  let [S, id] = find(want, 'shapes');
  if (S) { shape(S, id); continue; }
  [S, id] = find(want, 'sprites'); if (S) { take(S, 'sprites', id); for (const c of Object.values(S.sprites[id].colors || {})) material(S, String(c).split(':')[0]); continue; }
  [S, id] = find(want, 'materials'); if (S) { material(S, id); continue; }
  fail('no entry ' + want + ' in ' + sets.map(S => S.set).join(', '));
}
const used = [...new Set([...from.values()])];
out.credit = opt('credit') || 'Cut from ' + used.join(', ') + ': ' + used.map(n => sets.find(S => S.set === n).credit).join('; ');
const text = writeSet(out, resolve(opt('out')));
console.log(`wrote ${opt('out')}: ${Object.keys(out.shapes).length} shapes, ${Object.keys(out.materials).length} materials, ${Object.keys(out.sprites).length} sprites from ${used.join(', ')}; ${tok(text)} tokens`);
