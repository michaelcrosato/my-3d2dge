// Builds standalone example pages by inlining the engine and game scripts.
// Usage: node tools/build.mjs
// Each output in examples/ is a single self-contained HTML file you can open,
// host, or hand to another AI model with no other files.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const builds = [
  { template: 'src/arena.template.html', out: 'examples/arena-iso.html', vars: { VIEW: 'iso', TITLE: 'Emberwell (isometric) · CO55 engine' } },
  { template: 'src/arena.template.html', out: 'examples/arena-topdown.html', vars: { VIEW: 'threequarter', TITLE: 'Emberwell (top-down) · CO55 engine' } },
  { template: 'src/lab.template.html', out: 'examples/perspective-lab.html', vars: {} }
];

for (const b of builds) {
  let html = readFileSync(join(root, b.template), 'utf8');
  for (const [k, v] of Object.entries(b.vars)) html = html.replaceAll(`{{${k}}}`, v);
  html = html.replace(/<!-- @inline (\S+) -->/g, (_, file) => {
    const src = readFileSync(join(root, file), 'utf8').replaceAll('</script', '<\\/script');
    return `<script>\n/* ---- inlined from ${file} ---- */\n${src}\n</script>`;
  });
  writeFileSync(join(root, b.out), html);
  console.log('built', b.out, (html.length / 1024).toFixed(1) + ' KB');
}
