// ASSET PROBE: THE SHEETS AND THE NUMBERS (temporary, src/labs.json "Temporary" asset-probe; docs/HANDOFF-ASSETS.md, Phase 0).
// 1. counts each entry's tokens exactly (cl100k, gpt-tokenizer), as written: a hand-written entry's source text, a
//    converted entry's about, tags, mats and parts; writes src/asset-probe.numbers.js and rebuilds
// 2. opens the lab headless and saves each object's sheet, the room in four views and the whole page to
//    check-output/asset-probe/; prints the gate's numbers (section 7): tokens, raster time, converted fit
// Usage: node src/asset-probe.sheet.mjs [--no-shots]      (CHROMIUM_PATH picks a browser)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { encode } from 'gpt-tokenizer/encoding/cl100k_base';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), out = join(root, 'check-output/asset-probe');
const tok = s => encode(s).length, NUM = {};
// the hand-written entries: each from its `id: {` line to the next one (the shapes file lists one entry per block)
const src = readFileSync(join(root, 'src/asset-probe.shapes.js'), 'utf8'), body = src.slice(src.indexOf('Object.assign(S, {'), src.indexOf('});', src.indexOf('Object.assign(S, {')));
const starts = [...body.matchAll(/^(\w+): \{/gm)];
starts.forEach((m, i) => { const text = body.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : body.length).trim().replace(/,$/, ''); NUM[m[1]] = { tokens: tok(text), chars: text.length }; });
globalThis.window = globalThis; window.AssetProbe = {}; (0, eval)(readFileSync(join(root, 'src/asset-probe.converted.js'), 'utf8'));
for (const [id, e] of Object.entries(window.AssetProbe.CONVERTED)) { const text = id + ': ' + JSON.stringify({ about: e.about, tags: e.tags, mats: e.mats, parts: e.parts }); NUM[id] = { tokens: tok(text), chars: text.length }; }
writeFileSync(join(root, 'src/asset-probe.numbers.js'), `/* ASSET PROBE: each entry's size as written, in cl100k tokens (exact) and characters. Written by src/asset-probe.sheet.mjs. */
window.AssetProbe.NUMBERS = ${JSON.stringify(NUM).replace(/\},"/g, '},\n"')};
`);
execFileSync('node', [join(root, 'tools/build.mjs')], { stdio: 'ignore' });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } }), errors = [];
page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errors.push(m.text()); });
const url = pathToFileURL(join(root, 'examples/asset-probe.html')).href;
await page.goto(url + '?zoom=3'); await page.waitForFunction(() => window.__probe);
const res = await page.evaluate(() => {
  const P = window.__probe, out = {};
  for (const id of P.ids) out[id] = { ms: P.timing(id) };
  return { ms: out, gate: [...document.querySelectorAll('#gate div')].map(d => d.className + ': ' + d.textContent) };
});
for (const [id, v] of Object.entries(res.ms)) Object.assign(NUM[id] || (NUM[id] = {}), v);
if (!process.argv.includes('--no-shots')) {
  mkdirSync(out, { recursive: true }); await page.addStyleTag({ content: '.bar{position:static}' });
  for (const id of await page.evaluate(() => window.__probe.ids.concat(window.__probe.fitted))) await (await page.$('[id="' + id + '"]')).screenshot({ path: join(out, id + '.png') });
  await page.goto(url + '?mode=room'); await page.waitForTimeout(800);
  for (const v of ['iso', 'threequarter', 'topdown', 'brawler']) { await page.evaluate(v => document.querySelector(`#bar button[data-key="view"][data-value="${v}"]`).click(), v); await page.waitForTimeout(500); await (await page.$('#screen')).screenshot({ path: join(out, 'room-' + v + '.png') }); }
}
await browser.close();
const rows = Object.entries(NUM).map(([id, n]) => `${id.padEnd(14)} ${String(n.tokens).padStart(5)} tokens ${String(n.chars).padStart(5)} chars ${(n.ms || 0).toFixed(2).padStart(6)} ms`);
console.log(rows.join('\n')); console.log(res.gate.join('\n'));
if (errors.length) { console.log('page errors and warnings:\n' + [...new Set(errors)].join('\n')); process.exitCode = 1; }
