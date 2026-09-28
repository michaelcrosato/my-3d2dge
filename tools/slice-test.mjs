// Builds a test page with the engine, the starter shell and ONE slice, so a slice can be worked on
// and checked on its own (other slices may be mid-edit).
// Usage: node tools/slice-test.mjs src/starter/20-platformer.js out/platformer.html
// Then:  node tools/check.mjs out/platformer.html#platformer --out out/check
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [slice, out] = process.argv.slice(2);
if (!slice || !out) { console.error('Usage: node tools/slice-test.mjs src/starter/<slice>.js <out.html>'); process.exit(2); }
const dir = join(root, 'src/starter');
const parts = readdirSync(dir).filter(f => f.endsWith('.js')).sort().filter(f => f.startsWith('00-') || f.startsWith('9') || f === basename(slice));
const esc = s => s.replaceAll('</script', '<\\/script');
let html = readFileSync(join(root, 'src/starter.template.html'), 'utf8');
html = html.replace(/<!-- @inline-raw (\S+) -->/g, (_, f) => esc(readFileSync(join(root, f), 'utf8')));
html = html.replace(/<!-- @inline-parts (\S+) -->/g, () => `<script>\n${parts.map(f => esc(readFileSync(join(dir, f), 'utf8'))).join('\n')}\n</script>`);
html = html.replace(/<!-- @inline (\S+) -->/g, (_, f) => `<script>\n${esc(readFileSync(join(root, f), 'utf8'))}\n</script>`);
mkdirSync(dirname(resolve(out)), { recursive: true });
writeFileSync(resolve(out), html);
console.log('built', out, 'with', parts.join(', '));
