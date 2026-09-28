// Builds the standalone pages by inlining the engine and game scripts.
// Usage: node tools/build.mjs
// Every output is a single self-contained HTML file (no network, no other files) that
// you can open, host, or hand to another AI model.
//   dist/my-3d2dge.html          readable engine + API card + starter slices (the one to share)
//   dist/my-3d2dge-compact.html  same, with the engine minified (about 25% fewer tokens, for
//                                models with smaller context windows)
//   dist/my-3d2dge.js / .min.js  the engine alone, for multi-file projects
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'engine/my-3d2dge.js';
const builds = [
  { template: 'src/arena.template.html', out: 'examples/arena-iso.html', vars: { VIEW: 'iso', TITLE: 'Emberwell (isometric) · my-3D2dge' } },
  { template: 'src/arena.template.html', out: 'examples/arena-topdown.html', vars: { VIEW: 'threequarter', TITLE: 'Emberwell (top-down) · my-3D2dge' } },
  { template: 'src/lab.template.html', out: 'examples/perspective-lab.html', vars: {} },
  { template: 'src/stress.template.html', out: 'examples/stress-test.html', vars: {} },
  // the files to share with AI models: API card + engine + starter slices
  { template: 'src/starter.template.html', out: 'dist/my-3d2dge.html', vars: {} },
  { template: 'src/starter.template.html', out: 'dist/my-3d2dge-compact.html', vars: {}, compact: true }
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
