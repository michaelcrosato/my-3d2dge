// The pixel fonts' glyphs as rows of # and . (the engine holds each glyph as one digit a row: engine/my-3d2dge.js,
// section 6, and the agent edition's 5x7 table is the same), and a glyph's rows back to an entry of that table.
//   node tools/font.mjs Aé✕             those characters in the 5x7 font ('normal', the default)
//   node tools/font.mjs 0123 --tiny     in the 3x5 font
//   node tools/font.mjs --all [--tiny]  every glyph
//   node tools/font.mjs --encode Ж '#...#|#.#.#|.###.|..#..|.###.|#.#.#|#...#'   the entry to add for a new glyph
import { load } from './engine-lib.mjs';

const args = process.argv.slice(2), tiny = args.includes('--tiny'), rest = args.filter(a => !a.startsWith('--'));
if (args.includes('--encode')) {
  const [ch, rows] = rest, R = String(rows || '').split('|'), w = R[0] ? R[0].length : 0;
  if (!ch || !w || R.some(r => r.length !== w || /[^#.]/.test(r))) { console.error("usage: node tools/font.mjs --encode <char> '<row>|<row>|...' (rows of # and ., all as wide)"); process.exit(1); }
  if (tiny && (w !== 3 || R.length !== 5)) { console.error('a 3x5 glyph is five rows of three'); process.exit(1); }
  const digits = R.map(r => parseInt(r.replace(/#/g, '1').replace(/\./g, '0'), 2).toString(32)).join('');
  console.log(tiny ? ch + digits : ch + w + digits);
  process.exit(0);
}
const E = load('full'), f = E.font._f({ font: tiny ? 'tiny' : 'normal' }), h = tiny ? 5 : 9;
const chars = args.includes('--all') ? Object.keys(f.glyphs) : [...rest.join('')];
if (!chars.length) { console.error('usage: node tools/font.mjs <characters> [--tiny] | --all [--tiny] | --encode <char> <rows>'); process.exit(1); }
for (const ch of chars) {
  const g = f.glyphs[f.upper ? ch.toUpperCase() : ch] || f.glyphs[ch.toUpperCase()];
  if (!g) { console.log(`${ch}  (not in the ${tiny ? '3x5' : '5x7'} font: it draws as ?)\n`); continue; }
  const rows = Array.from({ length: h }, () => Array(g.w).fill('.'));
  for (const [x, y, n] of g.runs) for (let k = 0; k < n; k++) rows[y][x + k] = '#';
  const last = Math.max(tiny ? 4 : 6, ...g.runs.map(r => r[1]));   // (the 5x7's two rows under the baseline, when it has them)
  console.log(`${ch}  ${g.w} wide\n` + rows.slice(0, last + 1).map(r => '  ' + r.join('')).join('\n') + '\n');
}
