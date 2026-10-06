// The CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu): about 2,500 captured takes by 100+ people, from
// walks and runs to dances, sports, martial arts, acrobatics and everyday actions. "This dataset of motions is free for
// all uses" and it "may be copied, modified, or redistributed without permission" (the site's home page and FAQ).
// Each subject has a skeleton (NN.asf); each take is a motion (NN_MM.amc) at 120 frames a second (a few at 60).
//
// This tool finds takes and downloads them; tools/anim-import.mjs turns picked moments of them into an animation set
// (see "$pick" in src/mocap/catalogs/cmu.json, and docs/MOCAP.md, "Importing from CMU").
// Usage:  node tools/cmu.mjs find kick [cartwheel ...]   takes whose description has every word (index downloaded once)
//         node tools/cmu.mjs subject 13                    a subject's takes
//         node tools/cmu.mjs get 02_01 13_29 [...]         download the takes and their subjects' skeletons
//         --dir .cache/cmu                                 where they go (the default; not committed)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SITE = 'http://mocap.cs.cmu.edu';   // the site serves plain http
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const DIR = resolve(opt('dir', '.cache/cmu')), words = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
const cmd = words.shift();

async function fetchText(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ': HTTP ' + r.status); return Buffer.from(await r.arrayBuffer()).toString('latin1'); }

/** every take: { id: '02_01', subject: 2, about: the subject's line, desc, fps }, from the site's full motion list */
export async function cmuIndex(dir = DIR) {
  const file = join(dir, 'index.tsv');
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    const html = await fetchText(SITE + '/search.php?subjectnumber=%25&motion=%25'), rows = [], clean = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    let about = '';
    for (const tr of html.split(/<TR/i)) {
      const subj = /Subject #(\d+)\s*\(([^)]*)\)/i.exec(tr); if (subj) { about = clean(subj[2]); continue; }
      const amc = /\/subjects\/(\d+)\/(\d+_\d+)\.amc/i.exec(tr); if (!amc) continue;
      const cells = [...tr.matchAll(/<TD[^>]*>(.*?)<\/TD>/gis)].map(m => clean(m[1])), fps = cells.filter(c => /^\d+$/.test(c)).pop();   // the frame rate is the last number in the row (the trial's number comes first)
      rows.push([amc[2], +amc[1], about, cells[2] || '', fps || '120'].join('\t'));
    }
    writeFileSync(file, 'id\tsubject\tabout\tdesc\tfps\n' + rows.join('\n') + '\n');
    console.log('indexed ' + rows.length + ' takes into ' + file);
  }
  return readFileSync(file, 'utf8').trim().split('\n').slice(1).map(l => { const [id, subject, about, desc, fps] = l.split('\t'); return { id, subject: +subject, about, desc, fps: +fps }; });
}

/** download takes (and each subject's skeleton) into dir; returns their paths */
export async function cmuGet(ids, dir = DIR) {
  mkdirSync(dir, { recursive: true });
  const out = [];
  for (const id of ids) {
    if (!/^\d+_\d+$/.test(id)) throw new Error('a take is SUBJECT_TRIAL, like 02_01: ' + id);
    const s = id.split('_')[0], asf = join(dir, s + '.asf'), amc = join(dir, id + '.amc');
    if (!existsSync(asf)) writeFileSync(asf, await fetchText(`${SITE}/subjects/${s}/${s}.asf`));
    if (!existsSync(amc)) writeFileSync(amc, await fetchText(`${SITE}/subjects/${s}/${id}.amc`));
    out.push({ id, asf, amc });
  }
  return out;
}

if (import.meta.url === 'file://' + resolve(process.argv[1])) {
  if (cmd === 'find' || cmd === 'subject') {
    const idx = await cmuIndex(), q = words.map(w => w.toLowerCase());
    const hits = cmd === 'subject' ? idx.filter(t => t.subject === +q[0]) : idx.filter(t => q.every(w => (t.desc + ' ' + t.about).toLowerCase().includes(w)));
    for (const t of hits) console.log(`${t.id}\t${t.fps} fps\t${t.desc}\t(${t.about})`);
    console.log(hits.length + ' take(s)');
  } else if (cmd === 'get') {
    for (const f of await cmuGet(words)) console.log(f.id + ': ' + f.amc);
  } else { console.error('Usage: node tools/cmu.mjs find WORD [...] | subject N | get 02_01 [...]  [--dir .cache/cmu]'); process.exit(2); }
}
