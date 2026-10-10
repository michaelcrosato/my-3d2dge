// Replays a recorded play session (E.session, engine section 23; docs/DECISIONS.md D12) in headless Chromium, frame by
// frame: the same seed, frame times, inputs, screen and save give the same game, so a bug seen on a phone happens again
// here, where an agent can look at it.
//   node tools/replay.mjs session.json [--page examples/emberdeep.html] [--to <frame>] [--shots f1,f2,...] [--out dir]
//                                      [--log "<js>"] [--keep-going]
//   --page   the page to replay on; by default the one the session was recorded on (the site's address, read through
//            vercel.json's rewrites, or a local file's name), with the address's ?query and #hash
//   --to     stop at this frame (default: the end); --shots saves a screenshot at each of these frames (and at the end)
//   --log    JavaScript evaluated in the page at the end, printed (e.g. "__ed.ED.hero.x")
//   --keep-going  play on after the first frame whose checksum differs (by default it stops there)
// Prints how far it played, how many checksums matched and the first frame that differed. Exit code 1 when it diverged,
// when an input's target was missing, or when the page threw. Pictures in --out (check-output/replay/ by default).
// A session recorded on another build may play differently: it says so when the version or the build differs.
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const file = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--keep-going'));
if (!file) { console.error('Usage: node tools/replay.mjs session.json [--page page.html] [--to frame] [--shots f1,f2] [--out dir] [--log "<js>"] [--keep-going]'); process.exit(2); }
const S = JSON.parse(readFileSync(file, 'utf8'));
if (S.format !== 'my3d2dge-session') { console.error(file + ' is not a my-3D2dge session (format: ' + S.format + ')'); process.exit(2); }
const root = resolve('.'), out = resolve(opt('out', 'check-output/replay')); mkdirSync(out, { recursive: true });
const engine = readFileSync(join(root, 'engine/my-3d2dge.js'), 'utf8').match(/version: '([^']+)'/)[1];

/* the page: --page, or the recorded address mapped to a file the way the site maps it */
const href = new URL(S.href, 'http://site'), tail = href.search + href.hash;
let page = opt('page', null);
if (!page) {
  const p = decodeURIComponent(href.pathname);
  if (p.endsWith('.html')) page = ['examples', 'dist', 'dist/kits'].map(d => d + '/' + basename(p)).find(f => existsSync(join(root, f)));
  else for (const r of JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')).rewrites) {
    const re = new RegExp('^' + r.source.replace(/:(\w+)\(([^)]+)\)/g, '(?<$1>$2)').replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), m = re.exec(p);
    if (m) { page = r.destination.replace(/:(\w+)/g, (_, k) => m.groups[k]).replace(/^\//, ''); break; }
  }
  if (!page) { console.error('no local page for ' + S.href + ': give one with --page'); process.exit(2); }
}
const url = pathToFileURL(resolve(page.replace(/[?#].*$/, ''))).href + (/[?#]/.test(page) ? page.slice(page.search(/[?#]/)) : tail);
console.log(`replaying ${file}: ${S.frames.length} frames (${(((S.frames.at(-1) || 0) - (S.frames[0] || 0)) / 1000).toFixed(1)} s), ${S.events.length} inputs, recorded ${S.started} on v${S.version} ${S.build}`);
console.log(`  on ${url}, ${S.env.innerWidth}x${S.env.innerHeight} at ${S.env.devicePixelRatio}x` + (S.env.media['(pointer: coarse)'] ? ', a touch screen' : ''));
if (S.version !== engine) console.log(`  note: recorded on v${S.version}, replaying on v${engine}: other code may play differently (git checkout the release it was recorded on)`);
else if (S.build !== 'dev-build') console.log(`  note: recorded on the deployed build ${S.build}; if it diverges, replay on that commit (git checkout ${S.build.split(' ')[0]}, then node tools/build.mjs)`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: S.env.innerWidth, height: S.env.innerHeight }, deviceScaleFactor: S.env.devicePixelRatio, hasTouch: !!S.env.media['(pointer: coarse)'] });
const tab = await ctx.newPage(), errors = [];
tab.on('pageerror', e => errors.push(String(e && e.stack || e)));
tab.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await tab.addInitScript(s => { window.__my3d2dgeReplay = s; }, S);
await tab.goto(url);
await tab.waitForFunction(() => window.My3D2dge && My3D2dge.session && My3D2dge.session.replaying, null, { timeout: 30000 });

const to = Math.min(+opt('to', S.frames.length), S.frames.length), shots = new Set((opt('shots', '') || '').split(',').filter(Boolean).map(Number));
let r = { frame: 0 };
while (r.frame < to) {
  const next = Math.min(to, ...[...shots].filter(f => f > r.frame)), n = Math.min(300, next - r.frame);
  r = await tab.evaluate(k => My3D2dge.session.step(k), n);
  if (r.resize) { await tab.setViewportSize({ width: r.resize[0], height: r.resize[1] }); continue; }
  if (shots.has(r.frame)) await tab.screenshot({ path: join(out, `frame-${r.frame}.png`) });
  if (r.diverged !== undefined && !args.includes('--keep-going')) break;
  if (r.done) break;
}
await tab.screenshot({ path: join(out, `frame-${r.frame}-end.png`) });
const logged = opt('log', null) ? await tab.evaluate(code => { try { return JSON.stringify((0, eval)(code)); } catch (e) { return 'threw: ' + e.message; } }, opt('log')) : null;
await browser.close();

console.log(`played ${r.frame} of ${S.frames.length} frames, ${r.events} inputs; ${r.checked} checksum(s) compared` + (r.diverged === undefined ? ', all matched' : `; it DIVERGED at frame ${r.diverged} (the first checksum that differed)`));
if (r.missing) console.log(`  ${r.missing} input(s) found no element to go to (the page's elements differ from the recording's)`);
if (logged !== null) console.log('  ' + opt('log') + ' = ' + logged);
if (errors.length) console.log('page errors:\n  ' + errors.slice(0, 5).join('\n  '));
console.log('pictures in ' + out);
process.exit(r.diverged !== undefined || r.missing || errors.length ? 1 : 0);
