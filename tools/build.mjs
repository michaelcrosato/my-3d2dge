// Builds the standalone pages by inlining the engine and game scripts.
// Usage: node tools/build.mjs
// Every output is a single self-contained HTML file (no network, no other files) that
// you can open, host, or hand to another AI model.
//   dist/my-3d2dge.html          readable engine + API card + every starter slice (the reference)
//   dist/my-3d2dge-compact.html  same, with the engine minified (fewer tokens)
//   dist/kits/my-3d2dge-<genre>.html  minified engine + API card + ONE slice: the smallest file to
//                                hand a model that is making a game in that genre. Its engine is on the kit diet: the
//                                core less the sections its game never calls (DIET below, tools/diet.mjs)
//   dist/my-3d2dge.js / .min.js  the engine alone, for multi-file projects: the core and every module (engine/modules/) in
//                                one file
//   dist/my-3d2dge-3d.html       the 3D starter: the engine and the 3D engine (engine/my-3d2dge-3d.js: three.js r182 and
//                                Rapier 0.19.3 from vendor/, through the page's import map: served, not double-clicked),
//                                the API card and every 3D slice (src/starter3d/)
//   dist/kits/my-3d2dge-3d-<genre>.html  the same with ONE 3D slice: a 3D genre kit
//   dist/my-3d2dge-3d.js         the 3D engine alone (an ES module), readable
//   dist/my-3d2dge-agent.js      the agent edition: the essential engine plus its manual in one readable file,
//                                for AI coding agents (source: engine/my-3d2dge-agent.js; test: node tools/agent-test.mjs)
//   API-INDEX.md                 every public name in the engine, one line each (tools/api-index.mjs)
//   dist/handoff/                the package for coding agents that need the full engine: the engines, API.md, the
//                                index, AI_GUIDE.md, the tools that check, film and replay a game, a template game
//                                with a headless test, and the 2D genre kits readable (kits/) (sources: src/handoff/).
//                                The only output of several files; text only
// MODULES (engine/modules/<name>.js, engine/modules/README.md): each loads after the core, in a <script> of its own. The
// reference editions carry every module; a kit carries the ones its slice names in its header (@modules grid gen) and
// the ones those need; the examples pages carry none.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { modules as allModules, resolve as resolveModules, sliceModules } from './engine-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'engine/my-3d2dge.js';
const STARTER = 'src/starter', STARTER3D = 'src/starter3d', ENGINE3D = 'engine/my-3d2dge-3d.js';
const SLICES = { adventure: 'ADVENTURE (a top-down action adventure: a village, ruins and a shrine, a sword, a key and a great door, talk with portraits; Zelda and Secret of Mana)', platformer: 'PLATFORMER (a side-scroller: a night approach to a castle in five zones, a sword, a dash, candles, a 2.5D view; Castlevania, Mega Man X, Klonoa)', metroidvania: 'METROIDVANIA (a world of rooms: its map, two abilities that open its gates, a save room, two bosses)', brawler: "BRAWLER (a beat-'em-up: a city block at dusk, combos, grabs and kicks, waves that lock the screen, a second player who drops in; Final Fight, Streets of Rage)", fighting: 'FIGHTING (one on one: three fighters, versus, arcade, training)', shooter: 'SHOOTER (a vertical shoot-\'em-up stage, then a horizontal one: waves, power-ups, bosses; 1943 and Raiden, then Gradius and R-Type)', arcade: 'ARCADE (a cabinet of three: maze, formation, rocks)', pinball: 'PINBALL (one table: flippers, bumpers, a ramp, drop targets, a spinner, a kickback, a mission, multiball, tilt, a dot-matrix display)', kart: 'KART (Mode 7 karts: six on a circuit, three laps, items, two players in a split screen)', road: 'ROAD (a pseudo-3D coast road against the clock: curves, hills, a tunnel, traffic, checkpoints, a radio)', puzzle: 'PUZZLE (falling blocks and falling pairs that chain, versus with a second player or the CPU; Tetris, Puyo Puyo)', rhythm: 'RHYTHM (four lanes on the music clock: two songs, notes, jumps, holds, a rapping teacher to answer, a dancer and a crowd on the beat, grades, the audio offset)', rpg: 'RPG (a JRPG\'s journey: a town, a world map, a cave and its boss, the ATB battle, menus and save slots)', roguelike: 'ROGUELIKE (a turn-based crypt of ten generated floors: fields of view and fog, turns by speed, potions and scrolls; Rogue, Mystery Dungeon)', tactics: 'TACTICS (an isometric battle on a map of heights: charge time or phases, facing, arcs, areas, a scoring AI)', rts: 'RTS (real-time strategy: workers, gold, a barracks and a stable, three kinds to fight, fog, an enemy camp that builds and attacks in waves)', sim: 'SIM (a theme park: paths, four rides and two shops, guests with needs and money, prices, a rating, day and night, time controls)', artillery: 'ARTILLERY (two teams of three on an island every blast carves: turns, aim and power, wind, a rocket, a bouncing grenade, a cluster bomb, falls and the sea, a CPU that tries its shots in simulation)', pointclick: 'POINT-AND-CLICK (an adventure of three rooms: a dock, a tavern, a lighthouse; four puzzles, the nine verbs or a verb coin, an inventory, a riddle contest)', stealth: 'STEALTH (third-person stealth and parkour: a rooftop district at dusk, guards with sight and suspicion, climbing, takedowns, an HTML HUD; Assassin\'s Creed, Metal Gear)', sports: 'SPORTS (two against two in a walled cage, up to four players: a ball that bounces and curls, passes, lobs, shots on a meter, formations, a match clock; Sensible Soccer and NBA Jam)', animlab: 'ANIMATION LAB (every move, pose, skin and view of the character rigs)' };
// THE KIT DIET (docs/KITS.md, The kit diet): a kit's engine leaves out the core's sections its game never calls. This
// table names the parts that may go (one or more of the core's sections, by number) and, where a part is reached only
// through a method or field of what stays, those (entries), or through a string or option name the kit writes (names:
// game.go's 'iris'); tools/diet.mjs works out the rest from the code: what the kit calls (its
// shell, slice, sets, modules and, in 3D, the 3D engine), and what each of the core's statements needs. A part the kit
// calls stays, and so does anything it needs; a kit that would call what went fails the build.
const EASES = ['inSine', 'outSine', 'inOutSine', 'inCubic', 'inOutCubic', 'inOutQuad', 'inBack', 'inOutBack', 'outElastic', 'inElastic', 'inOutElastic', 'outBounce', 'inBounce', 'inOutBounce'];
const DIET = [
  { part: 'blob', sections: ['12'] },                         // E.Blob
  { part: 'tilemap', sections: ['13'] },                      // E.TileMap, and what extends it (wall faces, shapes as solids)
  { part: 'flow', sections: ['14'] },                         // E.FlowField
  { part: 'tex', sections: ['15'] },                          // E.tex
  { part: 'platformmap', sections: ['16'] },                  // E.PlatformMap (side-scroller levels), E.TILES
  { part: 'platformer', sections: ['16b', '16c'] },           // E.Platformer, and its further moves and their poses
  { part: 'body', sections: ['17'] },                         // E.Body
  { part: 'shapes', sections: ['21e'], via: ['r'] },          // E.SHAPES, r.shape (on the renderer: the grid's grid.shape is not it); the core library's shapes go with it, its materials stay (a roof: 'cobble')
  { part: 'solids', sections: ['21g'], entries: ['solid', 'solids'], with: 'tilemap', proto: false },   // map.solid; its collide, groundAt and heightAt wrap the map's own
  { part: 'thirdperson', sections: ['17b', '17c', '17d'] },   // E.ACTIONS, E.Action, E.Mover, E.sees, E.hears, E.Suspicion
  { part: 'bullets', sections: ['18'] },                      // E.Bullets, E.pattern
  { part: 'hash', sections: ['19'] },                         // E.SpatialHash
  { part: 'gpu', sections: ['22'], entries: ['enableGPU'] },  // GPU lighting: only through game.enableGPU
  { part: 'easings', sections: ['1b'], entries: EASES, names: EASES },   // E.ease's names beyond the core's (read, or named in a string)
  { part: 'sprites', sections: ['2b'], names: ['rot'] },      // E.anim, E.rotSprite, E.recolor, and r.sprite's { rot }
  { part: 'tweens', sections: ['10d'] },                      // game.tween, game.script, E.until, E.all, E.any
  { part: 'paths', sections: ['10e'] },                       // E.Path
  { part: 'transitions', sections: ['10f'], names: ['wipe', 'iris', 'mosaic', 'swirl', 'dissolve'] },   // game.go's { fade: 'iris' }
  { part: 'weather', sections: ['10g'], entries: ['weather'] },   // game.weather = { ... }
  { part: 'sequences', sections: ['10h'], entries: ['history'] },   // input.sequence, input.motion, input.history
  { part: 'camera', sections: ['10i'], entries: ['window', 'snapY', 'frame'] },   // game.cam.window, cam.snapY, cam.frame
  { part: 'players', sections: ['10j'], entries: ['allowJoin', 'addPlayer', 'removePlayer', 'splitScreen', 'viewport', 'halfKeys'] },   // game.allowJoin, game.splitScreen, Input.halfKeys (game.players and game.viewports are the core's)
  { part: 'saves', sections: ['10k'], entries: ['saves'], names: ['saves'] }   // game.saves, and menu: { saves }
];
// THE 3D DIET: the 3D engine's sections a 3D kit's game never calls, left out as the kit diet leaves out the core's
// (tools/diet.mjs, reading the 3D engine as the ES module it is): what the kit calls is its shell, slice and modules
const DIET3D = [
  { part: 'vehicles', sections: ['8b'], entries: ['vehicle', 'track', 'flyer'] }   // world.vehicle, world.track, world.flyer
];
// the parts a slice's deep link can jump into (#arcade/maze): each slice's own header names them ("#arcade/maze"), for its
// kit's header, the reference editions' and the handoff package's table of kits
const partsOf = dir => Object.fromEntries(readdirSync(join(root, dir)).filter(f => /^[1-8]\d-.+\.js$/.test(f)).map(f => {
  const id = f.replace(/^\d+-|\.js$/g, ''), head = readFileSync(join(root, dir, f), 'utf8').split(/\*\/\s*$/m)[0];
  return [id, [...new Set([...head.matchAll(new RegExp('#' + id + '/([a-z0-9]+)', 'g'))].map(m => m[1]))]];
}).filter(([, p]) => p.length));
const PARTS = partsOf(STARTER), PARTS3D = partsOf(STARTER3D);
/** a long line of a page's header, wrapped at its width and continued at its indent (at: the columns its first line has used) */
const wrapHead = (text, at = 0, w = 116) => { const out = ['']; let col = at; for (const word of text.split(' ')) { if (col + word.length + 1 > w && out[out.length - 1]) { out.push(''); col = 7; } out[out.length - 1] += (out[out.length - 1] ? ' ' : '') + word; col += word.length + 1; } return out.join('\n       '); };
const links = (ids, parts, one) => wrapHead((one ? 'Deep link: add #' : 'Deep links: add #') + ids.join(', #') + ' to the address to start ' + (one ? 'the slice' : 'a slice') +
  (Object.keys(parts).some(id => ids.includes(id)) ? '; ' + ids.flatMap(id => (parts[id] || []).map(p => '#' + id + '/' + p)).join(', ') + ' jump into a part.' : '.'), 2);
const GENRES = Object.keys(SLICES).filter(id => id !== 'animlab');
const ALL = {
  WHOLE: 'the whole engine', GAMES: GENRES.length + ' working games and an animation lab',
  ENGINE: '\n       Every module follows it, each a script marked "inlined from engine/modules/<name>.js" that starts with its manual.',
  CONTENTS: wrapHead('a title menu plus ' + GENRES.length + ' vertical slices (' + GENRES.map(id => SLICES[id].split(' (')[0]).join(', ') + ') and an ANIMATION LAB that plays every move, pose and skin in every view.', 52),
  LINKS: links(Object.keys(SLICES), PARTS)
};
// a kit's line on its modules (the scripts marked "inlined from engine/modules/...", after the engine), when it has any
const modLine = mods => mods.length ? '\n       ' + wrapHead('Its modules follow it, each a script marked "inlined from engine/modules/<name>.js" that starts with its manual: ' + resolveModules(mods, MODS).map(m => m.name).join(', ') + '.', 7) : '';
const kit = (id, mods = []) => ({
  EDITION: id + ' kit', WHOLE: 'the engine (on the kit diet: 2. says what it leaves out)', GAMES: 'one working game to copy', ENGINE: modLine(mods),
  CONTENTS: 'a title menu plus the ' + SLICES[id] + ' slice.\n       This is a genre kit: dist/my-3d2dge.html has every slice (my-3d2dge.vercel.app/dist/my-3d2dge.html), and the\n       handoff package every kit readable, with the index, the guide and the tools (my-3d2dge.vercel.app/handoff/).',
  LINKS: links([id], PARTS, true)
});
// the 3D slices: their ids and what each is (the kit's header names it)
const SLICES3D = { action: 'ACTION (a 3D arena: combos, dashes and waves, Zelda 64 and Diablo by way of the stress test)', platformer: 'PLATFORMER (a 3D course of islands, platforms and coins, Mario 64 and Spyro)', shooter: 'SHOOTER (an open world to move through and fight in, first or third person: Apex Legends without the multiplayer)', horror: 'HORROR (a mansion\'s wings by flashlight under fixed cameras: a pistol that locks on, zombies, dogs, keys, a crank, an item box and saves, a boss; Resident Evil and Alone in the Dark)', racing: 'RACING (a kart circuit in a valley: banked bends, a hill, a jump, a dirt shortcut, five drivers, items, three laps, two players in a split screen; Mario Kart 64 and Crash Team Racing)', flight: 'FLIGHT (a stage on rails over the sea to a base, then a boss in free flight: lasers, charged lock-on shots, barrel rolls, rings and a wingman on the radio; Star Fox 64 and Panzer Dragoon)', crawler: 'CRAWLER (a dungeon in first person, a cell at a time: a party of four with portraits, gates, a lever, plates, an automap, real time or turns; Eye of the Beholder, Dungeon Master and Wizardry)' };
const ALL3D = { EDITION: '3D edition', GAMES: 'the 3D starter games', ENGINE: '', CONTENTS: 'a title menu plus every 3D slice (' + Object.keys(SLICES3D).map(k => k.toUpperCase()).join(', ') + ').', LINKS: links(Object.keys(SLICES3D), PARTS3D) };
const kit3d = (id, mods = []) => ({ EDITION: '3D ' + id + ' kit', GAMES: 'one 3D game to copy', ENGINE: modLine(mods), CONTENTS: 'a title menu plus the ' + SLICES3D[id] + ' slice.\n       This is a 3D genre kit: dist/my-3d2dge-3d.html has every 3D slice and the whole of both engines\n       (my-3d2dge.vercel.app/3d).', LINKS: links([id], PARTS3D, true) });
// the modules a slice names (@modules in its header), and those of a folder of slices together
const sliceMods = file => sliceModules(readFileSync(join(root, file), 'utf8'));
const dirMods = dir => [...new Set(readdirSync(join(root, dir)).filter(f => /^[1-8]\d-.+\.js$/.test(f)).flatMap(f => sliceMods(join(dir, f))))];
const MODS = allModules();
const builds = [
  // one arena page for every view: iso by default, arena.html#threequarter (or keys 1-4, V) for the others
  { template: 'src/arena.template.html', out: 'examples/arena.html', vars: { VIEW: 'iso', TITLE: 'Emberwell · my-3D2dge' } },
  { template: 'src/lab.template.html', out: 'examples/perspective-lab.html', vars: {} },
  { template: 'src/stress.template.html', out: 'examples/stress-test.html', vars: {}, modules: ['mode7'] },
  // imported animation clips (tools/anim-import.mjs) on a look-alike mannequin and on the hero
  { template: 'src/mocap.template.html', out: 'examples/mocap-lab.html', vars: {} },
  // every entry of the asset store (src/assets/sets/, inlined) and the core library, to browse, search and copy
  { template: 'src/asset-lab.template.html', out: 'examples/asset-lab.html', vars: {} },
  // a Temporary prototype (src/labs.json): the 3D engine's vehicles two ways, side by side on one track
  { template: 'src/vehicle-lab.template.html', out: 'examples/vehicle-lab.html', vars: {} },
  // one page that links to every lab, test page and demo, from the list in src/labs.json (my-3d2dge.vercel.app/labs)
  { template: 'src/labs.template.html', out: 'examples/labs.html', vars: {} },
  // the signature game: src/emberdeep/*.js (one script, joined in name order)
  { template: 'src/emberdeep.template.html', out: 'examples/emberdeep.html', vars: {} },
  // the files to share with AI models: API card + engine + starter slices
  { template: 'src/starter.template.html', out: 'dist/my-3d2dge.html', vars: Object.assign({ EDITION: 'single-file edition' }, ALL), modules: 'all' },
  { template: 'src/starter.template.html', out: 'dist/my-3d2dge-compact.html', vars: Object.assign({ EDITION: 'compact edition (engine minified)' }, ALL), compact: true, modules: 'all' },
  // genre kits: the shell (00-shell.js, not 05-families.js: one slice needs no families), one slice and the start code
  ...readdirSync(join(root, STARTER)).filter(f => /^[1-8]\d-.+\.js$/.test(f)).map(f => {
    const id = f.replace(/^\d+-|\.js$/g, '');
    if (!SLICES[id]) throw new Error(STARTER + '/' + f + ': name the slice in SLICES (tools/build.mjs)');
    return { template: 'src/starter.template.html', out: 'dist/kits/my-3d2dge-' + id + '.html', vars: kit(id, sliceMods(join(STARTER, f))), label: SLICES[id].split(' (')[0], compact: true, kit: true, parts: p => /^(00|9)/.test(p) || p === f, modules: sliceMods(join(STARTER, f)) };
  }),
  // the 3D starter (src/starter3d/: the shell, every 3D slice, the start) and a 3D genre kit for each slice
  { template: 'src/starter3d.template.html', out: 'dist/my-3d2dge-3d.html', vars: ALL3D, compact: true, modules: dirMods(STARTER3D) },
  ...readdirSync(join(root, STARTER3D)).filter(f => /^[1-8]\d-.+\.js$/.test(f)).map(f => {
    const id = f.replace(/^\d+-|\.js$/g, '');
    if (!SLICES3D[id]) throw new Error(STARTER3D + '/' + f + ': name the slice in SLICES3D (tools/build.mjs)');
    return { template: 'src/starter3d.template.html', out: 'dist/kits/my-3d2dge-3d-' + id + '.html', vars: kit3d(id, sliceMods(join(STARTER3D, f))), label: '3D ' + SLICES3D[id].split(' (')[0], compact: true, kit: true, parts: p => /^(00|9)/.test(p) || p === f, modules: sliceMods(join(STARTER3D, f)) };
  })
];

let minified = null, minified3d = null;
const dieted = new Map();
/** a kit's code, everything that may call the engine: what its template inlines for its parts (the shell, the slice, the
 *  start, its sets; in 3D the 3D engine), and its modules */
function kitCodes(b) {
  const tpl = readFileSync(join(root, b.template), 'utf8'), raw = f => readFileSync(join(root, f), 'utf8'), codes = [];
  const dirParts = dir => readdirSync(join(root, dir)).filter(f => f.endsWith('.js') && (!b.parts || b.parts(f))).sort().map(f => raw(join(dir, f))).join('\n');
  for (const m of tpl.matchAll(/<!-- @inline-with (\S+) (\S+) -->/g)) if (!b.parts || b.parts(m[1])) codes.push({ text: raw(m[2]) });
  for (const m of tpl.matchAll(/<!-- @inline-(parts|module) (\S+) -->/g)) codes.push({ text: dirParts(m[2]), module: m[1] === 'module' });
  for (const m of tpl.matchAll(/<!-- @inline-esm (\S+) -->/g)) codes.push({ text: raw(m[1]), module: true });
  for (const m of tpl.matchAll(/<!-- @inline (\S+) -->/g)) if (m[1] !== ENGINE) codes.push({ text: raw(m[1]) });
  for (const m of resolveModules(b.modules || [], MODS)) codes.push({ text: m.src });
  return codes;
}
/** what each of E's names is in the full engine (a class, a function or an object), for the stubs of what a kit leaves out */
const KINDS = (() => { const ctx = { console: { log() {}, warn() {}, error() {} } }; vm.createContext(ctx); vm.runInContext(readFileSync(join(root, ENGINE), 'utf8'), ctx); const E = ctx.My3D2dge, out = {};
  for (const k of Object.keys(E)) { const v = E[k]; out[k] = typeof v === 'function' ? (/^class\b/.test(Function.prototype.toString.call(v)) ? 'class' : 'function') : 'object'; } return out; })();
/** a kit's engine on the diet, minified (its manual kept): { diet, min }; null without acorn or terser (npm install) */
async function kitEngine(b) {
  let D; try { D = await import('./diet.mjs'); } catch (e) { console.warn('acorn is not installed (npm install); skipping the kits'); return null; }
  const d = D.diet(readFileSync(join(root, ENGINE), 'utf8'), DIET, D.uses(kitCodes(b)), KINDS, b.template === 'src/starter3d.template.html' ? { full: 'dist/my-3d2dge-3d.html, both engines whole' } : {});
  if (!dieted.has(d.src)) { let code = false; try { const { minify } = await import('terser'); code = (await minify(d.src, { compress: true, mangle: true, format: { comments: /^!/ } })).code; } catch (e) { /* no terser */ } dieted.set(d.src, code); }
  return { diet: d, min: dieted.get(d.src) };
}
const dieted3d = new Map();
/** a 3D kit's 3D engine on the 3D diet, minified as a module (its manual kept): { diet, min }; null without acorn or terser */
async function kitEngine3d(b) {
  let D; try { D = await import('./diet.mjs'); } catch (e) { return null; }
  const src = readFileSync(join(root, ENGINE3D), 'utf8'), codes = kitCodes(b).filter(c => c.text !== src);
  const d = D.diet(src, DIET3D, D.uses(codes), {}, { module: true, warn: 'E.warn', full: 'dist/my-3d2dge-3d.js; dist/my-3d2dge-3d.html for every 3D slice' });
  // a kit that leaves out the vehicles keeps one line of its manual's section on them
  const out = d.left.some(l => l.part === 'vehicles') ? d.src.replace(/^## Vehicles, tracks, flight.*\n[\s\S]*?(?=^## )/m, '## Vehicles, tracks, flight: left out of this kit (the 3D diet); dist/my-3d2dge-3d.html has them\n\n') : d.src;
  if (!dieted3d.has(out)) { let code = false; try { const { minify } = await import('terser'); code = (await minify(out, { module: true, compress: true, mangle: true, format: { comments: /^!/ } })).code; } catch (e) { /* no terser */ } dieted3d.set(out, code); }
  return { diet: d, min: dieted3d.get(out) };
}
/** a kit's API card: the whole card, but its genre playbook keeps the rows of the kit's own slice and its list of modules
 *  the kit's own (the card diet: every row and every module are in API.md, in the repo and in the reference editions); and
 *  where its quick start calls what the kit's engine leaves out (diet.gone), the quick start is the kit's own game */
const DIETLIB = await import('./diet.mjs').catch(() => null);
const cardFor = (b, card, diet) => {
  const label = b.label, mods = new Set(resolveModules(b.modules || [], MODS).map(m => m.name)), lines = card.split('\n'), out = [];
  const qs = /^## Quick start.*\n```js\n([\s\S]*?)\n```$/m.exec(card), lost = qs && diet && DIETLIB ? [...DIETLIB.uses([{ text: qs[1] }]).E].filter(n => diet.gone.includes(n)) : [];
  const mine = row => { const cols = row.split('|'), copy = (cols[cols.length - 2] || '').toUpperCase(); return new RegExp('(^|[^0-9A-Z-])' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Z-])').test(label.startsWith('3D ') ? copy : copy.replace(/3D [A-Z-]+/g, '')); };
  const row = l => /^\| /.test(l) && !/^\| Genre/.test(l), kept = (() => { let sec = ''; return lines.filter(l => { if (l.startsWith('## ')) sec = l; return sec.startsWith('## Genre playbook') && row(l) && mine(l); }).length; })();
  let sec = '', cut = 0, modsIn = 0, modsCut = 0;
  for (const l of lines) {
    if (l.startsWith('## ')) sec = l;
    // the card describes the full engine: say once that this kit's leaves sections out
    if (l.startsWith('**Looking a name up:**') && diet && diet.left.length) out.push(`**This kit's engine** leaves out the sections its game never calls (the kit diet: the file's header lists them). A name from one warns once, naming its section, and a class throws; the card describes the full engine, \`dist/my-3d2dge.html\`.`, '');
    if (sec.startsWith('## Quick start') && lost.length) { if (l === sec) out.push(l, `This kit's engine leaves out ${lost.map(n => '`E.' + n + '`').join(', ')}, which the card's quick start (a top-down walk) is built on. This kit's quick start is its own game, between \`GAME START\` and \`GAME END\`: the slice's header says what it plays and how. \`API.md\` and the reference editions have the card's.`, ''); continue; }
    if (sec.startsWith('## Genre playbook')) {
      if (!kept && /^\|/.test(l)) { if (!cut++) out.push(`(API.md, in the repo and in dist/my-3d2dge.html, has the playbook: a row for each genre, none of them this kit's.)`); continue; }   // (no table)
      if (row(l)) { if (mine(l)) out.push(l); else cut++; continue; }
      if (cut && kept && !/^\|/.test(l)) { out.push(`(This kit's ${label} rows; API.md, in the repo and in dist/my-3d2dge.html, has the playbook's every genre.)`); cut = 0; }
    }
    const m = /^  - `([a-z0-9]+)`/.exec(l);
    if (sec.startsWith('## More') && m) { modsIn++; if (mods.has(m[1])) out.push(l); else modsCut++; continue; }
    if (modsIn && modsCut) { out.push(mods.size ? `  - (the modules this kit carries; API.md lists every one)` : `  - (this kit carries no module; API.md lists every one)`); modsCut = 0; }
    out.push(l);
  }
  return out.join('\n');
};
/** a kit's header line on what its engine leaves out (a 3D kit's whole engine, with every 3D slice, is the 3D starter's) */
const dietLine = (d, is3d) => {
  if (!d.left.length) return '';
  const items = d.left.flatMap(l => l.sections.map(([id, t]) => id + ' ' + t));
  return '\n       ' + wrapHead('It leaves out what its game never calls (the kit diet): ' + items.join('; ') + '. Calling one of them warns, naming its section (a class throws). ' +
    (is3d ? 'dist/my-3d2dge-3d.html has both engines whole.' : 'A game of several genres starts from the full engine: dist/my-3d2dge.html (every slice and section, readable) or dist/my-3d2dge-compact.html.'), 7);
};
/** a 3D kit's header line on what its 3D engine leaves out (the 3D diet) */
const dietLine3d = d => {
  if (!d.left.length) return '';
  const items = d.left.flatMap(l => l.sections.map(([id, t]) => id + ' ' + t));
  return '\n       Its 3D engine leaves out what its game never calls (the 3D diet): ' + items.join(', ') + '.\n       Calling one warns, naming its section; dist/my-3d2dge-3d.html has the whole 3D engine.';
};
const minMods = new Map();
/** a module minified, its manual (the /*! header) kept; false without terser */
async function moduleMin(m) {
  if (minMods.has(m.name)) return minMods.get(m.name);
  let code = false;
  try { const { minify } = await import('terser'); code = (await minify(m.src, { compress: true, mangle: true, format: { comments: /^!/ } })).code; } catch (e) { /* no terser */ }
  minMods.set(m.name, code); return code;
}
/** the <script> of each module a build carries, after the engine's (minified in a compact build) */
async function moduleScripts(b) {
  const out = [];
  for (const m of resolveModules(b.modules || [], MODS)) {
    const min = b.compact ? await moduleMin(m) : null, src = (min || m.src).replaceAll('</script', '<\\/script');
    out.push(`<script>\n/* ---- inlined from ${m.file}${min ? ' (minified; the readable module is in the repo)' : ''} ---- */\n${src}\n</script>`);
  }
  return out.join('\n');
}
async function engineMin() {
  if (minified !== null) return minified;
  try {
    const { minify } = await import('terser');
    const res = await minify(readFileSync(join(root, ENGINE), 'utf8'), { compress: true, mangle: true, format: { comments: /^!/ } });
    minified = res.code;
  } catch (e) { console.warn('terser is not installed (npm install); skipping the compact build'); minified = false; }
  return minified;
}
/** the 3D engine minified as a module, its manual (the /*! header) kept */
async function engine3dMin() {
  if (minified3d !== null) return minified3d;
  try {
    const { minify } = await import('terser');
    minified3d = (await minify(readFileSync(join(root, ENGINE3D), 'utf8'), { module: true, compress: true, mangle: true, format: { comments: /^!/ } })).code;
  } catch (e) { minified3d = false; }
  return minified3d;
}

const read = file => readFileSync(join(root, file), 'utf8').replaceAll('</script', '<\\/script');
// every page may say which release it is: {{VERSION}} (package.json) and {{BUILD}}, a placeholder that tools/stamp.mjs
// turns into the commit when the site deploys (the repo's copies keep it, so a rebuild matches them exactly)
const GLOBAL = { VERSION: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version, BUILD: 'dev-build' };
// <!-- @boot Title --> becomes the boot screen's splash (the engine's own E.bootSplash, so the page's first paint and the
// screen the engine takes it over with never drift apart): it shows while the page's scripts load
const bootSplash = (() => { const ctx = { console }; vm.createContext(ctx); vm.runInContext(read(ENGINE), ctx); return ctx.My3D2dge.bootSplash; })();
const boot = html => html.replace(/<!-- @boot ?(.*?) -->/g, (_, t) => bootSplash(t.trim()));
for (const b of builds) {
  const ke = b.kit ? await kitEngine(b) : null, min = b.compact ? (ke ? ke.min : b.kit ? null : await engineMin()) : null;
  if (b.compact && !min) continue;
  let html = readFileSync(join(root, b.template), 'utf8');
  const ke3 = b.kit && /@inline-esm engine\/my-3d2dge-3d\.js/.test(html) ? await kitEngine3d(b) : null;
  const vars = Object.assign({}, GLOBAL, b.vars); if (ke) vars.ENGINE += dietLine(ke.diet, !!ke3 || b.template === 'src/starter3d.template.html'); if (ke3) vars.ENGINE += dietLine3d(ke3.diet);
  for (const [k, v] of Object.entries(vars)) html = html.replaceAll(`{{${k}}}`, v);
  html = boot(html);
  // a file one part needs, only where that part is (a kit of one slice leaves out the others' sets)
  html = html.replace(/<!-- @inline-with (\S+) (\S+) -->/g, (_, part, file) => !b.parts || b.parts(part) ? `<!-- @inline ${file} -->` : '');
  html = html.replace(/<!-- @inline-raw (\S+) -->/g, (_, file) => file === 'API.md' && b.kit ? cardFor(b, read(file), ke && ke.diet) : read(file));
  // a folder of script parts joined in name order into one <script> (the starter game: shell + one file per slice)
  html = html.replace(/<!-- @inline-parts (\S+) -->/g, (_, dir) => {
    const parts = readdirSync(join(root, dir)).filter(f => f.endsWith('.js') && (!b.parts || b.parts(f))).sort();
    return `<script>\n/* ---- inlined from ${dir} (${parts.join(', ')}) ---- */\n${parts.map(f => read(join(dir, f))).join('\n')}\n</script>`;
  });
  // one ES module file as a <script type="module"> (the 3D engine; minified, its manual kept, in a compact build)
  const min3d = b.compact ? (ke3 && ke3.min ? ke3.min : await engine3dMin()) : null;
  html = html.replace(/<!-- @inline-esm (\S+) -->/g, (_, file) => {
    const src = file === ENGINE3D && min3d ? min3d.replaceAll('</script', '<\\/script') : read(file);
    const how = file !== ENGINE3D || !min3d ? '' : ke3 && ke3.diet.left.length ? ' (minified, less the sections its game never calls: the header above lists them; the readable engine is in the repo)' : ' (minified; the readable engine is in the repo)';
    return `<script type="module">\n/* ---- inlined from ${file}${how} ---- */\n${src}\n</script>`;
  });
  // a folder of module parts joined in name order into one <script type="module"> (they share one scope; imports go first)
  html = html.replace(/<!-- @inline-module (\S+) -->/g, (_, dir) => {
    const parts = readdirSync(join(root, dir)).filter(f => f.endsWith('.js') && (!b.parts || b.parts(f))).sort();
    return `<script type="module">\n/* ---- inlined from ${dir} (${parts.join(', ')}) ---- */\n${parts.map(f => read(join(dir, f))).join('\n')}\n</script>`;
  });
  // a file's first section, raw: everything before its second /* ==== banner (Dan's body, without Emberdeep's skills)
  html = html.replace(/<!-- @inline-head (\S+) -->/g, (_, file) => {
    const src = read(file), at = [...src.matchAll(/^\/\* =+$/gm)].map(m => m.index);
    if (at.length < 2) throw new Error(file + ': @inline-head needs a second /* ==== section banner');
    return `/* ---- inlined from ${file} (its first section) ---- */\n` + src.slice(0, at[1]);
  });
  const mods = await moduleScripts(b);
  html = html.replace(/<!-- @inline (\S+) -->/g, (_, file) => {
    const src = file === ENGINE && min ? min.replaceAll('</script', '<\\/script') : read(file);
    const how = file !== ENGINE || !min ? '' : ke && ke.diet.left.length ? ' (minified, less the sections its game never calls: the header above lists them; the readable engine is in the repo)' : ' (minified; the readable engine is in the repo)';
    return `<script>\n/* ---- inlined from ${file}${how} ---- */\n${src}\n</script>` + (file === ENGINE && mods ? '\n' + mods : '');
  });
  mkdirSync(dirname(join(root, b.out)), { recursive: true });
  writeFileSync(join(root, b.out), html);
  console.log('built', b.out, (html.length / 1024).toFixed(1) + ' KB' + (ke && ke.diet.left.length ? ', leaving out ' + ke.diet.left.map(l => l.part).join(', ') : ''));
}
// the engine alone: the core, then every module (each starts with its manual)
const EVERY = resolveModules('all', MODS);
writeFileSync(join(root, 'dist/my-3d2dge.js'), [readFileSync(join(root, ENGINE), 'utf8'), ...EVERY.map(m => m.src)].join('\n'));
console.log('built dist/my-3d2dge.js' + (EVERY.length ? ' (the core and ' + EVERY.length + ' module' + (EVERY.length > 1 ? 's' : '') + ')' : ''));
writeFileSync(join(root, 'dist/my-3d2dge-agent.js'), readFileSync(join(root, 'engine/my-3d2dge-agent.js'), 'utf8'));
console.log('built dist/my-3d2dge-agent.js');
writeFileSync(join(root, 'dist/my-3d2dge-3d.js'), readFileSync(join(root, ENGINE3D), 'utf8'));
console.log('built dist/my-3d2dge-3d.js');
const min = await engineMin();
if (min) { const mm = []; for (const m of EVERY) mm.push(await moduleMin(m)); writeFileSync(join(root, 'dist/my-3d2dge.min.js'), [min, ...mm].join('\n')); console.log('built dist/my-3d2dge.min.js'); }

// the API index, from the engine itself
const { build: indexOf, render: renderIndex } = await import('./api-index.mjs');
writeFileSync(join(root, 'API-INDEX.md'), renderIndex(indexOf()));
console.log('built API-INDEX.md');

// the handoff package: [its path, the source] (the README, package.json and index page take {{VERSION}} and {{BUILD}})
const H = 'dist/handoff', HANDOFF = [
  ['README.md', 'src/handoff/README.md'], ['package.json', 'src/handoff/package.json'],
  ['my-3d2dge.js', 'dist/my-3d2dge.js'], ['my-3d2dge-agent.js', 'engine/my-3d2dge-agent.js'],
  // each module on its own too, to load after the agent edition (or the full engine) with a <script> of its own
  ...EVERY.map(m => ['modules/' + m.name + '.js', m.file]),
  ['API.md', 'API.md'], ['API-INDEX.md', 'API-INDEX.md'], ['AI_GUIDE.md', 'AI_GUIDE.md'],
  ['tools/check.mjs', 'tools/check.mjs'], ['tools/filmstrip.mjs', 'tools/filmstrip.mjs'], ['tools/replay.mjs', 'tools/replay.mjs'],
  // the asset card, its tools and the store, at the repository's own paths so the card's commands work as written
  ['docs/ASSETS.md', 'docs/ASSETS.md'], ...['find', 'sheet', 'set', 'lib'].map(t => ['tools/asset-' + t + '.mjs', 'tools/asset-' + t + '.mjs']),
  ...readdirSync(join(root, 'src/assets/sets')).filter(f => f.endsWith('.js')).sort().map(f => ['src/assets/sets/' + f, 'src/assets/sets/' + f]),
  ...readdirSync(join(root, 'src/assets/catalogs')).filter(f => f.endsWith('.json')).sort().map(f => ['src/assets/catalogs/' + f, 'src/assets/catalogs/' + f]),
  ...readdirSync(join(root, 'src/handoff/game')).sort().map(f => ['game/' + f, 'src/handoff/game/' + f])
];
const SAY = { 'README.md': 'start here: what the package holds, which page to read, how to run and test a game', 'package.json': 'pins Playwright for the tools',
  'my-3d2dge.js': 'the full engine, readable: the core and every module', 'my-3d2dge-agent.js': 'the agent edition: the essential engine, its header a short manual',
  'API.md': 'the API card: read it whole', 'API-INDEX.md': 'every public name, one line each: search it', 'AI_GUIDE.md': 'the guide: recipes, the look, heights, sessions',
  'tools/check.mjs': 'plays a game headless and reports errors, screenshots and its snapshot', 'tools/filmstrip.mjs': 'records frames into one picture',
  'tools/replay.mjs': 'replays a recorded play session exactly', 'game/index.html': 'the template game: play it', 'game/game.js': 'the template game: copy it',
  'game/test.mjs': 'its headless test: node game/test.mjs', 'docs/ASSETS.md': 'the asset card: objects and materials as data (r.shape), the core library, writing one',
  'tools/asset-find.mjs': 'searches the core library and the store: node tools/asset-find.mjs "tavern table"', 'tools/asset-sheet.mjs': 'draws an object in every view and says what reads badly',
  'tools/asset-set.mjs': 'cuts the few entries a game uses from the store\'s sets', 'tools/asset-lib.mjs': 'shared by the asset tools' };
for (const m of EVERY) SAY['modules/' + m.name + '.js'] = 'a module, loaded after the engine: ' + m.about;
if (existsSync(join(root, H))) rmSync(join(root, H), { recursive: true });
const fill = s => boot(s.replaceAll('{{VERSION}}', GLOBAL.VERSION).replaceAll('{{BUILD}}', GLOBAL.BUILD));
for (const [to, from] of HANDOFF) {
  mkdirSync(dirname(join(root, H, to)), { recursive: true });
  const text = readFileSync(join(root, from), 'utf8');
  writeFileSync(join(root, H, to), from.startsWith('src/handoff/') && !from.endsWith('.js') && !from.endsWith('.mjs') ? fill(text) : text);
}
// the store: a page of its own listing every set (what each holds, from its header; the folder itself has no page), and
// one line for it on the index
const sets = HANDOFF.filter(([to]) => to.startsWith('src/assets/sets/')).map(([to, from]) => { const t = readFileSync(join(root, from), 'utf8'), n = /(\d+) shapes, (\d+) materials, (\d+) sprites/.exec(t);
  return `- [${to.split('/').pop()}](sets/${to.split('/').pop()}): ${n ? n[0] : ''}${existsSync(join(root, 'src/assets/catalogs', to.split('/').pop().replace(/\.js$/, '.json'))) ? ` ([catalog](catalogs/${to.split('/').pop().replace(/\.js$/, '.json')}))` : ' (a game\'s own cut)'}`; });
writeFileSync(join(root, H, 'src/assets/README.md'), '# The asset store\n\nSets of still objects, materials and sprites converted from CC0 libraries (each entry says where it came from),\nand the hand-written catalogs that describe them. `docs/ASSETS.md` is the card;\n`node tools/asset-find.mjs \"words\"` searches them; a game loads one with its script and\n`E.addAssets(window.ASSETS[\'<set>\'])`, or cuts the few it uses with `node tools/asset-set.mjs`.\n\n' + sets.join('\n') + '\n');
// the genre kits, readable (kits/; sources src/handoff/kits/): each 2D kit's game, what the single-file kit holds between
// GAME START and GAME END (the shell, its slice, the start), a page that plays it on the package's engine with the asset
// set the starter's page gives that slice, a table of them, and their headless test
const KITSETS = Object.fromEntries([...readFileSync(join(root, 'src/starter.template.html'), 'utf8').matchAll(/<!-- @inline-with (\S+) (\S+) -->/g)].map(m => [m[1], m[2]]));
const KITS = readdirSync(join(root, STARTER)).filter(f => /^[1-8]\d-.+\.js$/.test(f)).sort().map(f => {
  const id = f.replace(/^\d+-|\.js$/g, ''), [, label, what] = /^(.+?) \((.*)\)$/.exec(SLICES[id]);
  return { id, f, label, what, set: KITSETS[f], mods: resolveModules(sliceMods(join(STARTER, f)), MODS).map(m => m.name) };
});
mkdirSync(join(root, H, 'kits'), { recursive: true });
const kitPage = readFileSync(join(root, 'src/handoff/kits/kit.html'), 'utf8');
for (const k of KITS) {
  const [shell, slice, start] = ['00-shell.js', k.f, '90-start.js'].map(p => readFileSync(join(root, STARTER, p), 'utf8')), at = 4 + shell.split('\n').length;
  writeFileSync(join(root, H, 'kits', k.id + '.js'), `// The ${k.label} kit's game (${k.what}), readable: the starter's shell (${STARTER}/00-shell.js), then\n// the slice from line ${at} (${STARTER}/${k.f}: its header says what it plays and how), then the start (90-start.js), as the\n// single-file kit holds them between GAME START and GAME END. ${k.id}.html plays it; node kits/test.mjs ${k.id} runs it headless.\n` +
    [shell, slice, start].join('\n'));
  writeFileSync(join(root, H, 'kits', k.id + '.html'), fill(kitPage.replaceAll('{{LABEL}}', k.label).replaceAll('{{ID}}', k.id).replace('{{SETS}}', k.set ? `<script src="../${k.set}"></script>\n` : '')));
}
writeFileSync(join(root, H, 'kits/README.md'), fill(readFileSync(join(root, 'src/handoff/kits/README.md'), 'utf8')).replace('{{KITS}}', KITS.map(k =>
  `| ${k.label} | [${k.id}.js](${k.id}.js), [${k.id}.html](${k.id}.html) | ${k.what} | ${k.mods.join(', ') || 'none'} | #${k.id}${(PARTS[k.id] || []).map(p => `, #${k.id}/${p}`).join('')} |`).join('\n')));
writeFileSync(join(root, H, 'kits/test.mjs'), readFileSync(join(root, 'src/handoff/kits/test.mjs'), 'utf8'));
const list = HANDOFF.filter(([to]) => !to.startsWith('src/assets/')).map(([to]) => `<li><a href="${to}">${to}</a><span>${SAY[to] || ''}</span></li>`)
  .concat(`<li><a href="kits/README.md">kits/</a><span>the ${KITS.length} genre kits, readable: each kit's game and the page that plays it (kits/arcade.html), the table of them, and their headless test (node kits/test.mjs)</span></li>`,
    `<li><a href="src/assets/README.md">src/assets/</a><span>the asset store: ${sets.length} sets of objects and materials converted from CC0 libraries, and their catalogs (docs/ASSETS.md, "Make one")</span></li>`).join('\n');
writeFileSync(join(root, H, 'index.html'), fill(readFileSync(join(root, 'src/handoff/index.html'), 'utf8')).replace('{{FILES}}', list));
console.log('built ' + H + '/ (' + (HANDOFF.length + 2 + KITS.length * 2 + 2) + ' files)');
