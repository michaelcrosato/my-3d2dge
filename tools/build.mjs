// Builds standalone example pages by inlining the engine and game scripts.
// Usage: node tools/build.mjs
// Each output in examples/ is a single self-contained HTML file you can open,
// host, or hand to another AI model with no other files.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const builds = [
  { template: 'src/arena.template.html', out: 'examples/arena-iso.html', vars: { VIEW: 'iso', TITLE: 'Emberwell (isometric) · CO55 engine' } },
  { template: 'src/arena.template.html', out: 'examples/arena-topdown.html', vars: { VIEW: 'threequarter', TITLE: 'Emberwell (top-down) · CO55 engine' } },
  { template: 'src/lab.template.html', out: 'examples/perspective-lab.html', vars: {} },
  { template: 'src/stress.template.html', out: 'examples/stress-test.html', vars: {} },
  // the one file to share with AI models: API card + engine + starter game
  { template: 'src/starter.template.html', out: 'dist/co55-engine.html', vars: {} }
];

for (const b of builds) {
  let html = readFileSync(join(root, b.template), 'utf8');
  for (const [k, v] of Object.entries(b.vars)) html = html.replaceAll(`{{${k}}}`, v);
  html = html.replace(/<!-- @inline-raw (\S+) -->/g, (_, file) => readFileSync(join(root, file), 'utf8').replaceAll('</script', '<\\/script'));
  html = html.replace(/<!-- @inline (\S+) -->/g, (_, file) => {
    const src = readFileSync(join(root, file), 'utf8').replaceAll('</script', '<\\/script');
    return `<script>\n/* ---- inlined from ${file} ---- */\n${src}\n</script>`;
  });
  mkdirSync(dirname(join(root, b.out)), { recursive: true });
  writeFileSync(join(root, b.out), html);
  console.log('built', b.out, (html.length / 1024).toFixed(1) + ' KB');
}
