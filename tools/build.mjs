// Builds the standalone pages by inlining the engine and game scripts.
// Usage: node tools/build.mjs
// Every output is a single self-contained HTML file (no network, no other files) that
// you can open, host, or hand to another AI model.
//   dist/my-3d2dge.html          readable engine + API card + all five starter slices (the reference)
//   dist/my-3d2dge-compact.html  same, with the engine minified (fewer tokens)
//   dist/kits/my-3d2dge-<genre>.html  minified engine + API card + ONE slice: the smallest file to
//                                hand a model that is making a game in that genre
//   dist/my-3d2dge.js / .min.js  the engine alone, for multi-file projects
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'engine/my-3d2dge.js';
const STARTER = 'src/starter';
const SLICES = { adventure: 'ADVENTURE (top-down action adventure)', platformer: 'PLATFORMER (side-scroller)', brawler: "BRAWLER (beat-'em-up)", shooter: 'SHOOTER (vertical shoot-em-up)', rpg: 'RPG BATTLE (turn-based battle)', animlab: 'ANIMATION LAB (every move, pose, skin and view of the character rigs)' };
const ALL = {
  GAMES: 'five working games and an animation lab',
  CONTENTS: "a title menu plus five vertical slices\n       (ADVENTURE top-down, PLATFORMER side-scroller, BRAWLER beat-'em-up, SHOOTER, RPG BATTLE)\n       and an ANIMATION LAB that plays every move, pose and skin in every view.",
  LINKS: 'Deep links: add #adventure, #platformer, #brawler, #shooter, #rpg or #animlab to the address to start a slice.'
};
const kit = id => ({
  EDITION: id + ' kit', GAMES: 'one working game to copy',
  CONTENTS: 'a title menu plus the ' + SLICES[id] + ' slice.\n       This is a genre kit. The complete file with all five slices is dist/my-3d2dge.html\n       at github.com/michaelcrosato/my-3d2dge.',
  LINKS: 'Deep link: add #' + id + ' to the address to start the slice.'
});
const builds = [
  // one arena page for every view: iso by default, arena.html#threequarter (or keys 1-4, V) for the others
  { template: 'src/arena.template.html', out: 'examples/arena.html', vars: { VIEW: 'iso', TITLE: 'Emberwell · my-3D2dge' } },
  { template: 'src/lab.template.html', out: 'examples/perspective-lab.html', vars: {} },
  { template: 'src/stress.template.html', out: 'examples/stress-test.html', vars: {} },
  // the files to share with AI models: API card + engine + starter slices
  { template: 'src/starter.template.html', out: 'dist/my-3d2dge.html', vars: Object.assign({ EDITION: 'single-file edition' }, ALL) },
  { template: 'src/starter.template.html', out: 'dist/my-3d2dge-compact.html', vars: Object.assign({ EDITION: 'compact edition (engine minified)' }, ALL), compact: true },
  // genre kits: the shell, one slice and the start code
  ...readdirSync(join(root, STARTER)).filter(f => /^[1-8]\d-.+\.js$/.test(f)).map(f => {
    const id = f.replace(/^\d+-|\.js$/g, '');
    return { template: 'src/starter.template.html', out: 'dist/kits/my-3d2dge-' + id + '.html', vars: kit(id), compact: true, parts: p => /^(0|9)/.test(p) || p === f };
  })
];

let minified = null;
async function engineMin() {
  if (minified !== null) return minified;
  try {
    const { minify } = await import('terser');
    const res = await minify(readFileSync(join(root, ENGINE), 'utf8'), { compress: true, mangle: true, format: { comments: /^!/ } });
    minified = res.code;
  } catch (e) { console.warn('terser is not installed (npm install); skipping the compact build'); minified = false; }
  return minified;
}

const read = file => readFileSync(join(root, file), 'utf8').replaceAll('</script', '<\\/script');
for (const b of builds) {
  const min = b.compact ? await engineMin() : null;
  if (b.compact && !min) continue;
  let html = readFileSync(join(root, b.template), 'utf8');
  for (const [k, v] of Object.entries(b.vars)) html = html.replaceAll(`{{${k}}}`, v);
  html = html.replace(/<!-- @inline-raw (\S+) -->/g, (_, file) => read(file));
  // a folder of script parts joined in name order into one <script> (the starter game: shell + one file per slice)
  html = html.replace(/<!-- @inline-parts (\S+) -->/g, (_, dir) => {
    const parts = readdirSync(join(root, dir)).filter(f => f.endsWith('.js') && (!b.parts || b.parts(f))).sort();
    return `<script>\n/* ---- inlined from ${dir} (${parts.join(', ')}) ---- */\n${parts.map(f => read(join(dir, f))).join('\n')}\n</script>`;
  });
  html = html.replace(/<!-- @inline (\S+) -->/g, (_, file) => {
    const src = file === ENGINE && min ? min.replaceAll('</script', '<\\/script') : read(file);
    return `<script>\n/* ---- inlined from ${file}${file === ENGINE && min ? ' (minified; the readable engine is in the repo)' : ''} ---- */\n${src}\n</script>`;
  });
  mkdirSync(dirname(join(root, b.out)), { recursive: true });
  writeFileSync(join(root, b.out), html);
  console.log('built', b.out, (html.length / 1024).toFixed(1) + ' KB');
}
writeFileSync(join(root, 'dist/my-3d2dge.js'), readFileSync(join(root, ENGINE), 'utf8'));
console.log('built dist/my-3d2dge.js');
const min = await engineMin();
if (min) { writeFileSync(join(root, 'dist/my-3d2dge.min.js'), min); console.log('built dist/my-3d2dge.min.js'); }
