// A game's words for translation (AI Hub Languages v1, lib/hub/languages.md in the AI Hub; the engine's side: section 6b
// of engine/my-3d2dge.js). A page keeps the words players read in <script type="application/json" id="game-lines"> in its
// <head>, each under an id; a translation step adds "game-translations" after it and changes nothing else.
//   node tools/lines.mjs <page.html>            write the engine's own lines (its menus, saves, notices: engine.* ids)
//                                               into the page's game-lines block, keeping the game's own (a block is
//                                               made if it has none); --modules a,b and --3d add those parts' lines
//   node tools/lines.mjs <page.html> --check    check its blocks as the hub will: valid JSON, ids of the right shape,
//                                               lines that are text or plural forms of text, translations with the
//                                               original's ids and tags and each plural form their language needs
//   node tools/lines.mjs --engine [--3d]        print the engine's lines (JSON)
// The build (tools/build.mjs) writes each kit's block from its parts' lines files: src/starter/<part>.lines.json and
// src/starter3d/<part>.lines.json ({ lines, notes, max, names, brief }), with the engine's lines and its modules'.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { root, load } from './engine-lib.mjs';

export const ID = /^[a-z0-9_]+(\.[a-z0-9_]+)*$/;
const OK = v => (typeof v === 'string' && v !== '') || (!!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.values(v).every(s => typeof s === 'string'));
let ENGINE = null;
/** the engine's own lines (its menus, saves, notices, key names) and its modules': { id: English } */
export function engineAll() { if (!ENGINE) { const E = load('full', { console: { log() {}, warn() {}, error() {}, info() {} } }); ENGINE = E.lang.engineLines(); } return ENGINE; }
/** the 3D engine's lines (its settings), read from its source as data (it needs three.js to run) */
export function engine3dLines() {
  const src = readFileSync(join(root, 'engine/my-3d2dge-3d.js'), 'utf8'), out = {};
  const grab = (start, end) => { const i = src.indexOf(start); if (i < 0) return null; const j = src.indexOf(end, i); return vm.runInNewContext('(' + src.slice(i + start.length - 1, j + end.length - 1) + ')'); };
  const specs = [...(grab('World3D.SETTINGS = [', '\n];') || []), grab('World3D.CONTROLS = {', '};')].filter(Boolean);
  for (const sp of specs) { const id = 'engine.setting.' + sp.key; out[id] = sp.label; if (sp.help) out[id + '.help'] = sp.help; for (const o of sp.options || []) out[id + '.' + o[0]] = o[1]; }
  return out;
}
/** the engine's lines a page needs: the core's, the modules' it carries (ids engine.<module>.*), the 3D engine's on a 3D page */
export function engineLines({ modules = [], threeD = false } = {}) {
  const all = engineAll(), mods = new Set(modules === 'all' ? null : modules), named = /^engine\.([a-z0-9]+)\./, MOD = new Set(['arcade', 'click', 'drive', 'fight', 'gen', 'grid', 'mode7', 'physics', 'rhythm', 'road', 'rooms', 'rpg', 'songs', 'story', 'strategy', 'terrain']);
  const out = {};
  for (const [k, v] of Object.entries(all)) { const m = named.exec(k); if (m && MOD.has(m[1]) && modules !== 'all' && !mods.has(m[1])) continue; out[k] = v; }
  return threeD ? Object.assign(out, engine3dLines()) : out;
}
/** a part's lines file beside it (src/starter/10-adventure.js -> 10-adventure.lines.json), or null */
export function partLines(file) { const f = join(root, file.replace(/\.js$/, '.lines.json')); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; }
/** the game-lines object for a page: its parts' lines (in order) after the engine's */
export function gameLines(parts, o = {}) {
  const out = { version: 1, language: 'en', lines: {}, notes: {}, max: {}, names: [], brief: '' }, briefs = [];
  for (const p of parts) {
    const L = partLines(p); if (!L) continue;
    for (const k of ['lines', 'notes', 'max']) for (const [id, v] of Object.entries(L[k] || {})) { if (k === 'lines' && id in out.lines && JSON.stringify(out.lines[id]) !== JSON.stringify(v)) throw new Error(p + ': line ' + id + ' is another part\'s too, in other words'); out[k][id] = v; }   // (the same line in two parts, action.thrust, is one)
    for (const n of L.names || []) if (!out.names.includes(n)) out.names.push(n);
    if (L.brief) briefs.push(L.brief);
    if (L.wordPlay) out.wordPlay = true;
  }
  out.lines = Object.assign(out.lines, engineLines(o));
  out.brief = briefs.join('\n\n') + (briefs.length ? '\n\n' : '') + 'Lines with ids starting engine. are the engine\'s own words: its pause menu, settings, controls screen, save slots, notices and key names, shown on every game made with it. Keep them short: they sit on buttons and in narrow rows.';
  if (!Object.keys(out.notes).length) delete out.notes; if (!Object.keys(out.max).length) delete out.max; if (!out.names.length) delete out.names;
  return out;
}
/** the block's HTML: one line per entry (a person or a model edits it), '<' written < so a line can't end the script */
export function blockHTML(obj, id = 'game-lines') {
  const j = v => JSON.stringify(v).replace(/</g, '\\u003c'), rows = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) rows.push('  ' + j(k) + ': {\n' + Object.entries(v).map(([a, b]) => '    ' + j(a) + ': ' + j(b)).join(',\n') + '\n  }');
    else rows.push('  ' + j(k) + ': ' + j(v));
  }
  return `<script type="application/json" id="${id}">\n{\n${rows.join(',\n')}\n}\n</script>`;
}
const BLOCK = id => new RegExp(`<script type="application/json" id="${id}">[\\s\\S]*?</script>`);
/** a page's block read (null when it has none; throws on broken JSON) */
export function readBlock(html, id = 'game-lines') { const m = BLOCK(id).exec(html); if (!m) return null; return JSON.parse(m[0].replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')); }
/** a page with its game-lines block put in (in place of the old one, else at the end of its <head>) */
export function putBlock(html, obj, id = 'game-lines') {
  const b = blockHTML(obj, id);
  if (BLOCK(id).test(html)) return html.replace(BLOCK(id), () => b);
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, () => b + '\n</head>');
  throw new Error('the page has no <head> to put the ' + id + ' block in');
}
const tags = s => (String(s).match(/\{[^{}]*\}/g) || []).slice().sort();
const forms = v => typeof v === 'string' ? [v] : Object.values(v);
/** the hub's checks on a page's blocks: { errors, flags } (errors: a translation not kept; flags: worth a look) */
export function check(html) {
  const errors = [], flags = [];
  let src, tr;
  try { src = readBlock(html, 'game-lines'); } catch (e) { return { errors: ['game-lines: not valid JSON (' + e.message + ')'], flags }; }
  if (!src) return { errors: ['no game-lines block'], flags };
  if (src.version !== 1) errors.push('game-lines: version is not 1');
  if (typeof src.language !== 'string' || !src.language) errors.push('game-lines: no language');
  for (const [id, v] of Object.entries(src.lines || {})) { if (!ID.test(id)) errors.push('game-lines: id "' + id + '" is not of the form a.b_c'); if (!OK(v)) errors.push('game-lines: ' + id + ' is not text or plural forms of text'); }
  for (const id of Object.keys(src.max || {})) if (!(id in (src.lines || {}))) flags.push('game-lines: max for ' + id + ', which has no line');
  try { tr = readBlock(html, 'game-translations'); } catch (e) { errors.push('game-translations: not valid JSON (' + e.message + ')'); }
  for (const [code, entry] of Object.entries(tr || {})) {
    let pr = null; try { pr = new Intl.PluralRules(code); } catch (e) { errors.push(code + ': not a language code'); continue; }
    if (!entry || typeof entry.lines !== 'object') { errors.push(code + ': no lines'); continue; }
    if (!entry.by) flags.push(code + ': no by');
    for (const [id, v] of Object.entries(entry.lines)) {
      if (id.startsWith('dev.')) continue;
      const o = (src.lines || {})[id];
      if (o === undefined) { errors.push(code + ': ' + id + ' is not one of the original\'s ids'); continue; }
      if (!OK(v)) { errors.push(code + ': ' + id + ' is not text or plural forms of text'); continue; }
      const want = tags(forms(o).join(' ')).filter(t => t !== '{count}'), got = forms(v).map(f => tags(f).filter(t => t !== '{count}'));
      for (const g of got) if (new Set(want).size !== new Set(g).size || [...new Set(want)].some(t => !g.includes(t))) { errors.push(code + ': ' + id + ' does not have the original\'s tags ' + [...new Set(want)].join(' ')); break; }
      if (typeof o === 'object') { const need = pr.resolvedOptions().pluralCategories.filter(c => c !== 'zero' || 'zero' in o); for (const c of need) if (typeof v !== 'object' || !(c in v)) { errors.push(code + ': ' + id + ' lacks the plural form ' + c); break; } }
    }
    const missing = Object.keys(src.lines || {}).filter(id => !id.startsWith('dev.') && !(id in entry.lines));
    if (missing.length) flags.push(code + ': ' + missing.length + ' lines missing (the game shows the original for them)');
  }
  return { errors, flags };
}

// the command line
if (resolvePath(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = n => { const i = a.indexOf(n); return i < 0 ? null : a[i + 1]; }, threeD = a.includes('--3d');
  const mods = opt('--modules') ? opt('--modules').split(',') : [];
  if (a.includes('--engine')) { console.log(JSON.stringify(engineLines({ modules: mods.length ? mods : 'all', threeD }), null, 1)); process.exit(0); }
  const file = a.find(x => !x.startsWith('--') && x !== opt('--modules'));
  if (!file) { console.error('usage: node tools/lines.mjs <page.html> [--check] [--modules a,b] [--3d] | --engine [--3d]'); process.exit(2); }
  const html = readFileSync(file, 'utf8');
  if (a.includes('--check')) {
    const r = check(html);
    for (const e of r.errors) console.log('error: ' + e); for (const f of r.flags) console.log('look:  ' + f);
    console.log(r.errors.length ? `${file}: ${r.errors.length} errors` : `${file}: the blocks are good` + (r.flags.length ? ` (${r.flags.length} things to look at)` : ''));
    process.exit(r.errors.length ? 1 : 0);
  }
  let block = null; try { block = readBlock(html); } catch (e) { console.error(file + ': its game-lines block is not valid JSON: ' + e.message); process.exit(1); }
  block = block || { version: 1, language: 'en', lines: {} };
  const own = Object.fromEntries(Object.entries(block.lines || {}).filter(([k]) => !k.startsWith('engine.')));
  block.lines = Object.assign(own, engineLines({ modules: mods, threeD }));
  writeFileSync(file, putBlock(html, block));
  console.log(`${file}: ${Object.keys(own).length} lines of the game's own, ${Object.keys(block.lines).length - Object.keys(own).length} of the engine's`);
}
