// The kits suite: every kit in dist/kits/ (node tools/build.mjs writes them), as a model gets it.
//   1. its title: no errors, and its menu lists its one slice
//   2. its proof: the slice's run(600) twice gives the same hash (a 2D slice's runs through the shell's proof(): a seeded
//      Math.random, the game clock from 0, scripted keys; a 3D slice's is its own world.hash()), with no errors and no
//      call to what the kit diet left out (its stubs warn "left out of this kit")
//   3. its bot, where its slice has one (bot(): it plays to the end through the game's own rules, as a player would, from
//      a seed): the end it must reach (BOTS below: the roguelike's ten floors, the puzzle's lines), with no errors
//   4. its size in cl100k tokens, beside its budget (doctrine-check holds them: every 2D kit at most 200,000; D52 suspends
//      that until the owner's review pass, so a 2D kit over it is reported, not failed)
//   5. the reference editions' title (dist/my-3d2dge.html, and dist/my-3d2dge-3d.html served): every slice under its
//      family's heading, two columns on a wide screen, each reached by the keys and picked by a tap; on a short screen
//      one column that scrolls to the last
// The 2D kits open from their files; the 3D kits are served (they load vendor/), on WebGL 2 (kit3d-test runs WebGPU too).
//   --compare <dir>  also film each 2D kit, its title and its slice in play, beside the same kit in <dir> (the kits of
//                    another build: the ones before a change) and fail on any pixel that differs (tools/filmstrip.mjs
//                    --compare --expect-same): how the diet proves it changes nothing, and any change that must not show
// Usage: node tools/kits-test.mjs [--compare <dir>] [kit ...]   (exit code 1 on a failure; CHROMIUM_PATH picks a browser)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), K = join(root, 'dist/kits');
const args = process.argv.slice(2), opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const compare = opt('compare'), only = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1] === '--compare'));
const problems = [], t0 = Date.now();
const check = (name, ok, detail = '') => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); if (!ok) problems.push(name + (detail ? ': ' + detail : '')); };
let tok = s => Math.ceil(s.length / 3.1); try { const { encode } = await import('gpt-tokenizer/encoding/cl100k_base'); tok = s => encode(s).length; } catch (e) { /* estimated */ }

// what each slice's bot() must reach (docs/HANDOFF-GENRES.md 3.4: a bot or a scripted route that plays to the end)
const BOTS = {
  roguelike: { say: 'plays ten floors and wins', ok: r => r.floors >= 10 && r.mode === 'won' },
  arcade: { say: 'clears a maze, two waves of moths and two of rocks; the attract mode plays a demo, shows the table and returns', ok: r => r.maze.level >= 2 && r.formation.level >= 3 && r.rocks.level >= 3 && r.attract },
  shooter: { say: 'flies the horizontal stage to its core battleship', ok: r => r.boss },
  brawler: { say: 'two heroes (player 2 on the keyboard\'s right half) clear the first wave, each landing blows', ok: r => r.players === 2 && r.heroes === 2 && r.wave >= 1 && r.hits.every(n => n > 0) },
  fighting: { say: 'two CPUs fight a match to its end, twice, the same (their randomness is their own)', ok: r => r.over && r.repeat && r.wins[r.winner] >= 2 },
  metroidvania: { say: 'takes its route through the rooms (the boots under the water, the tower, the beetle\'s dash, the laboratory) to the boss and beats it; the map fills in as rooms are seen; its save loads back', ok: r => r.won && r.path.includes('reactor') && r.seen >= 18 && r.seenAt.reactor > r.seenAt.caverns && r.saved && r.loaded.room === 'save' && r.loaded.got.includes('dash') && !r.errors },
  puzzle: { say: 'clears lines (60 pieces, at least 10 lines); two CPUs play versus to a loss, sending rows across', ok: r => r.pieces >= 60 && r.lines >= 10 && !!r.vs && r.vs.loser !== undefined && r.vs.sent.some(n => n > 0) },
  kart: { say: 'six karts race three laps, every one driven by its driver (yours too): all finish, none stuck against a wall; then two players race in a split screen', ok: r => r.finished === 6 && r.laps.every(n => n === 3) && r.stuck < 1.2 && r.split.viewports === 2 && r.split.prog.every(d => d > 300) && !r.errors },
  road: { say: 'drives the stage by the keys through its four checkpoints to the goal before the clock runs out', ok: r => r.goal && r.checkpoints === 4 && r.clock > 0 && !r.errors },
  tactics: { say: 'the heroes\' own AI takes the fort by charge time, twice, the same (the AI\'s turns repeat), then by phases', ok: r => r.won && r.repeat && r.phases.won && r.heroes >= 1 && !r.errors },
  rpg: { say: 'plays the journey by the keys: the elder\'s quest and key, the shop, a sword and a vest worn from the menu, the chest, a save at the crystal; the road north (each battle on AUTO, training to level 3), the cave, the knight\'s scene and fight, home; then loads the save: the town, the quest taken and not done, its gold and gear',
    ok: r => r.quest && r.key && r.bought && r.equipped && r.chest && r.saved && r.world && r.cave && r.boss && r.home && r.battles >= 3 && r.loaded.at === 'town' && r.loaded.quest && !r.loaded.done && r.loaded.gold === r.savedGold && r.loaded.key && r.loaded.bronze && !r.errors }
};
// the kits: my-3d2dge-<id>.html (2D) and my-3d2dge-3d-<id>.html (3D), the slice's id from the name
const kits = readdirSync(K).filter(f => /^my-3d2dge-.+\.html$/.test(f)).sort().map(f => { const is3d = f.startsWith('my-3d2dge-3d-'); return { file: f, is3d, id: f.replace(/^my-3d2dge-(3d-)?|\.html$/g, '') }; })
  .filter(k => !only.length || only.includes(k.id) || only.includes(k.file.replace(/^my-3d2dge-|\.html$/g, '')));
if (!kits.length) { console.error('no kits in dist/kits/ (run node tools/build.mjs)' + (only.length ? ' named ' + only.join(', ') : '')); process.exit(1); }

// the 3D kits are served, from the repository's root
const server = createServer((req, res) => {
  const file = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm' }[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface'] });

for (const k of kits) {
  const html = readFileSync(join(K, k.file), 'utf8'), n = tok(html), budget = k.is3d ? null : 200000;
  console.log(`\n${k.file} (${n.toLocaleString('en')} tokens${budget ? ', of ' + budget.toLocaleString('en') : ''})`);
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [], left = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); if (/left out of this kit/.test(m.text())) left.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\/favicon\.ico$/.test(r.url())) errors.push(r.status() + ' ' + r.url()); });   // (a missing file, not the browser's icon)
  await page.goto(k.is3d ? SITE + '/dist/kits/' + k.file + '?backend=webgl' : pathToFileURL(join(K, k.file)).href);
  try { await page.waitForFunction(() => window.__game && __game.game.sceneName === 'title', null, { timeout: k.is3d ? 120000 : 30000 }); }
  catch (e) { check(k.file + ': the title', false, 'it did not start: ' + errors.slice(0, 2).join(' | ')); await page.close(); continue; }
  const menu = await page.evaluate(() => __game.titleMenu && __game.titleMenu.items.map(x => typeof x === 'string' ? x : x.label));
  check(k.file + ': the title, its menu listing its one slice', !errors.length && Array.isArray(menu) && menu.length === 1, JSON.stringify(menu) + ' ' + errors.slice(0, 2).join(' | '));
  if (k.is3d) {
    await page.evaluate(id => __game.game.go(id, null, { fade: 0 }), k.id);
    await page.waitForFunction(id => __game.game.sceneName === id && __game.scenes[id].world.stats.frames > 2, k.id, { timeout: 60000 }).catch(() => {});
  }
  const proof = await page.evaluate(id => { const s = __game.scenes[id]; if (!s || typeof s.run !== 'function') return null; const g = __game.game, e0 = g.errors.length; const r = [s.run(600), s.run(600)]; return { r, errors: g.errors.slice(e0).map(e => e.where + ': ' + e.message) }; }, k.id).catch(e => ({ thrown: e.message }));
  check(`${k.file}: ${k.id}.run(600) twice, the same hash, no errors`, !!proof && !proof.thrown && proof.r[0] === proof.r[1] && proof.r[0] !== undefined && !proof.errors.length && !errors.length,
    !proof ? 'the slice has no run(n)' : proof.thrown || (proof.r.join(', then ') + (proof.errors.length ? ' ' + proof.errors.join(' | ') : '') + (errors.length ? ' ' + errors.slice(0, 2).join(' | ') : '')));
  const B = k.is3d ? null : BOTS[k.id], hasBot = await page.evaluate(id => typeof __game.scenes[id].bot === 'function', k.id);   // (BOTS: the 2D slices'; a 3D slice of the same name has its own)
  if (B || hasBot) {
    const r = await page.evaluate(id => { try { return __game.scenes[id].bot(); } catch (e) { return { thrown: e.message }; } }, k.id);
    check(`${k.file}: its bot ${B ? B.say : 'plays'}, with no errors`, !!B && !r.thrown && !r.errors && B.ok(r) && !errors.length, (B ? '' : 'no expectation in BOTS (tools/kits-test.mjs) ') + JSON.stringify(r) + ' ' + errors.slice(0, 2).join(' | '));
  }
  check(`${k.file}: nothing the kit diet left out was called`, !left.length, left.slice(0, 3).join(' | '));
  if (budget) check(`${k.file}: within its budget${n > budget ? ' (suspended: D52)' : ''}`, true, n + ' tokens' + (n > budget ? `, ${n - budget} over it` : ''));
  await page.close();
}
// the reference editions' title menu: families, keys, a tap, and scrolling on a short screen
if (!only.length) for (const [file, url] of [['dist/my-3d2dge.html', pathToFileURL(join(root, 'dist/my-3d2dge.html')).href], ['dist/my-3d2dge-3d.html', SITE + '/dist/my-3d2dge-3d.html?backend=webgl']]) {
  console.log('\n' + file + ': the title menu');
  for (const [w, h] of [[960, 540], [640, 480]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    try { await page.waitForFunction(() => window.__game && __game.game.sceneName === 'title' && __game.titleMenu, null, { timeout: 120000 }); }
    catch (e) { check(`${file} at ${w}x${h}: the title`, false, 'it did not start ' + errors.join(' | ')); await page.close(); continue; }
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => { const M = __game.titleMenu, g = __game.game, L = M.layout(g.W, g.H); return { n: M.slices.length, fams: new Set(M.slices.map(s => s.family)).size, heads: L.cols.flat().filter(e => e.head).length, cols: L.cols.length, rows: L.rows, view: L.view }; });
    check(`${file} at ${w}x${h}: ${m.n} slices under ${m.fams} family headings, in ${m.cols} column(s) (${m.view} of ${m.rows} rows in view)`, m.heads === m.fams && m.fams > 1 && (w < 700 || m.cols === 2 || m.rows <= m.view), JSON.stringify(m));
    const seen = new Set(); let top = 0;
    for (let k = 0; k < m.n; k++) { seen.add(await page.evaluate(() => __game.titleMenu.i)); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(40); top = Math.max(top, await page.evaluate(() => __game.titleMenu.top)); }
    check(`${file} at ${w}x${h}: the keys reach every slice${m.rows > m.view ? ', scrolling' : ''}`, seen.size === m.n && (m.rows <= m.view || top > 0), `${seen.size} of ${m.n}, scrolled to row ${top}`);
    // a tap on the entry under the cursor picks it (a click: the screen's game pixels to the page's)
    const at = await page.evaluate(() => { const M = __game.titleMenu, S = __game.game.screen, p = M.spot(M.i), rc = S.canvas.getBoundingClientRect(); return p && { id: M.slices[M.i].id, x: rc.left + (p[0] * S.S + S.OX) / S.dpr, y: rc.top + (p[1] * S.S + S.OY) / S.dpr }; });
    if (at) { await page.mouse.click(at.x, at.y); await page.waitForFunction(id => __game.game.sceneName === id, at.id, { timeout: 20000 }).catch(() => {}); }
    const scene = await page.evaluate(() => __game.game.sceneName);
    check(`${file} at ${w}x${h}: a click on an entry plays its slice`, !!at && scene === at.id && !errors.length, (at ? at.id : 'no entry in view') + ' -> ' + scene + ' ' + errors.slice(0, 2).join(' | '));
    await page.close();
  }
}
await browser.close(); server.close();

// --compare: each 2D kit filmed beside the same kit of another build, title and play, pixel for pixel
const PLAY = {   // keys that play each slice for a few seconds (the slice's own controls)
  adventure: 'wait:1500 rec:24:8 down:ArrowRight wait:700 press:KeyJ wait:400 up:ArrowRight down:ArrowDown wait:700 press:KeyJ wait:500 up:ArrowDown',
  platformer: 'wait:1500 rec:24:8 down:ArrowRight wait:800 press:Space wait:400 press:KeyX wait:900 up:ArrowRight press:KeyC wait:600',
  shooter: 'wait:1500 rec:24:8 down:Space down:ArrowLeft wait:900 up:ArrowLeft down:ArrowUp wait:900 press:KeyX wait:600 up:ArrowUp up:Space',
  rpg: 'wait:2500 rec:24:10 press:Enter wait:500 press:Enter wait:1500 press:Enter wait:500 press:Enter wait:1500',
  brawler: 'wait:1500 rec:24:8 down:ArrowRight wait:900 press:KeyJ wait:200 press:KeyJ wait:200 press:KeyK wait:600 up:ArrowRight press:KeyZ wait:600',
  animlab: 'wait:1500 rec:24:8 press:ArrowDown wait:700 press:ArrowRight wait:700 press:KeyJ wait:900 press:KeyL wait:700',
  stealth: 'wait:1500 rec:24:8 down:KeyD wait:900 press:Space wait:500 up:KeyD down:KeyS wait:600 press:KeyJ wait:500 up:KeyS press:KeyC wait:500'
};
if (compare) {
  console.log(`\nfilmed beside ${compare}`);
  const out = join(root, 'check-output/kits-test'); mkdirSync(out, { recursive: true });
  for (const k of kits.filter(k => !k.is3d)) {
    const other = resolve(compare, k.file);
    if (!existsSync(other)) { check(`${k.file}: filmed beside ${other}`, false, 'not there'); continue; }
    for (const [what, hash, steps] of [['title', '', 'wait:1200 rec:12:10 press:ArrowDown wait:600'], ['play', '#' + k.id, PLAY[k.id] || 'wait:1500 rec:24:8 down:ArrowRight wait:1500 up:ArrowRight']]) {
      const r = spawnSync(process.execPath, [join(root, 'tools/filmstrip.mjs'), join(K, k.file) + hash, '--steps', steps, '--compare', other + hash, '--expect-same', '--out', join(out, `${k.id}-${what}.png`)], { encoding: 'utf8' });
      check(`${k.file}: its ${what}, filmed, the same pixels as ${compare}`, r.status === 0, (r.stdout + r.stderr).trim().split('\n').slice(-2).join(' | '));
    }
  }
}
console.log(`\n${problems.length ? problems.length + ' FAILED' : 'all passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s (${kits.length} kits)`);
process.exit(problems.length ? 1 : 0);
